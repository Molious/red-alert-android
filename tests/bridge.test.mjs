import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { APP_ORIGIN, CHANNEL, parseBridgeMessage, shouldResetForNavigation } from '../src/bridgeProtocol.ts';
import { nativeBridgeScript } from '../src/nativeBridgeScript.ts';
import { pickLanguage, pickRecognitionService } from '../src/voicePolicy.ts';

const require = createRequire(import.meta.url);
const packet = (type, extra = {}) => ({ channel: CHANNEL, doc: 'document1', id: 1, type, ...extra });

test('bridge accepts only valid messages from the game origin', () => {
  for (const type of ['voice.listen', 'voice.cancel', 'speech.say', 'speech.cancel', 'geo.watch', 'geo.clear']) {
    const p = type === 'speech.say' ? packet(type, { text: 'hi' }) : packet(type);
    assert.ok(parseBridgeMessage(JSON.stringify(p), APP_ORIGIN), type);
  }
  for (const url of ['https://example.org', APP_ORIGIN + '.evil.org', 'http://vox-star-command.base44.app']) {
    assert.equal(parseBridgeMessage(JSON.stringify(packet('voice.listen')), url), null, url);
  }
  assert.ok(parseBridgeMessage(JSON.stringify(packet('speech.say', { text: 'hi', pitch: 0.7, rate: 1.08 })), APP_ORIGIN));
  assert.equal(parseBridgeMessage(JSON.stringify(packet('speech.say', { text: 'hi', pitch: 9 })), APP_ORIGIN), null);
  for (const p of [packet('file.read'), packet('voice.listen', { id: -1 }), packet('speech.say', { text: 'a'.repeat(2001) }), packet('voice.listen', { channel: 'laura-native-v1' })]) {
    assert.equal(parseBridgeMessage(JSON.stringify(p), APP_ORIGIN), null);
  }
});

test('leaving the game origin resets native sessions; in-app navigation does not', () => {
  assert.equal(shouldResetForNavigation(APP_ORIGIN + '/map'), false);
  assert.equal(shouldResetForNavigation('https://app.base44.com/login'), true);
});

test('injected bridge matches the API the Red Alert web app calls', () => {
  const messages = [];
  const listeners = {};
  const win = {
    location: { origin: APP_ORIGIN },
    ReactNativeWebView: { postMessage: (s) => messages.push(JSON.parse(s)) },
    dispatchEvent: (e) => (listeners.ready = (listeners.ready || 0) + 1),
  };
  vm.runInNewContext(nativeBridgeScript, { window: win, location: win.location, CustomEvent: class { constructor(n) { this.type = n; } } });
  const b = win.RedAlertNative;
  assert.equal(b.version, 1);
  for (const fn of ['listenOnce', 'cancelListen', 'speak', 'speakRequest', 'cancelSpeech', 'hush', 'prepareSession', 'cancelPreparation', 'setAudioMuted', 'setJourneyActive', 'searchAddress', 'cancelSearch', 'watchPosition', 'clearWatch', 'addEventListener', 'removeEventListener', 'receive']) {
    assert.equal(typeof b[fn], 'function', fn);
  }
  const doc = messages[0].doc;
  assert.equal(messages[0].type, 'bridge.ready');

  // one spoken command, delivered once, foreign documents ignored
  const answers = [];
  const id = b.listenOnce((text, err) => answers.push([text, err]));
  b.receive({ channel: CHANNEL, doc: 'other', id, type: 'voice.result', text: 'bad' });
  b.receive({ channel: CHANNEL, doc, id, type: 'voice.result', text: 'lock on' });
  b.receive({ channel: CHANNEL, doc, id, type: 'voice.result', text: 'again' });
  assert.deepEqual(answers, [['lock on', null]]);

  // speak / hush events for the music ducking
  const seen = [];
  b.addEventListener('speak', () => seen.push('speak'));
  b.addEventListener('hush', () => seen.push('hush'));
  b.speak('Contact on the glass.', { pitch: 1.25, rate: 1.1 });
  const said = messages[messages.length - 1];
  assert.equal(said.type, 'speech.say');
  assert.equal(said.pitch, 1.25);
  assert.equal(said.rate, 1.1);
  b.receive({ channel: CHANNEL, doc, id: 99, type: 'speech.end' });
  assert.deepEqual(seen, ['speak'], 'a stale speech.end does not end the current line');
  b.receive({ channel: CHANNEL, doc, id: said.id, type: 'speech.end' });
  assert.deepEqual(seen, ['speak', 'hush']);

  // tracked speech carries the pilot's voice and reports its outcome
  const outcomes = [];
  const sid = b.speakRequest('Lock on?', (o) => outcomes.push(o), { pitch: 0.8, rate: 0.95 });
  const asked = messages[messages.length - 1];
  assert.deepEqual([asked.id, asked.pitch, asked.rate], [sid, 0.8, 0.95]);
  b.speakRequest('No voice options.', () => {});
  assert.equal('pitch' in messages[messages.length - 1], false);
  b.receive({ channel: CHANNEL, doc, id: sid, type: 'speech.end', outcome: 'played' });
  assert.deepEqual(outcomes, ['played']);

  // session preparation, search, audio and journey state
  const ready = [];
  const pid = b.prepareSession((r) => ready.push(r));
  b.receive({ channel: CHANNEL, doc, id: pid, type: 'session.ready', speechReady: true, locationGranted: true, microphoneGranted: false });
  assert.deepEqual(JSON.parse(JSON.stringify(ready)), [{ speechReady: true, locationGranted: true, microphoneGranted: false }]);
  const found = [];
  const qid = b.searchAddress('12 Queen St', (r, e) => found.push([r, e]));
  b.receive({ channel: CHANNEL, doc, id: qid, type: 'geo.results', results: [{ label: 'x' }] });
  assert.deepEqual(JSON.parse(JSON.stringify(found)), [[[{ label: 'x' }], null]]);
  b.setAudioMuted(true); b.setAudioMuted(true);
  b.setJourneyActive(true);
  const tail = messages.slice(-2).map((m) => [m.type, m.muted ?? m.active]);
  assert.deepEqual(tail, [['audio.state', true], ['journey.active', true]]);

  // GPS fixes stream until cleared
  const fixes = [];
  const w = b.watchPosition((f) => fixes.push(f), () => {});
  b.receive({ channel: CHANNEL, doc, id: w, type: 'geo.fix', fix: { lat: -26.7, lng: 153.1 } });
  b.clearWatch(w);
  b.receive({ channel: CHANNEL, doc, id: w, type: 'geo.fix', fix: { lat: 0, lng: 0 } });
  assert.equal(fixes.length, 1);
});

test('bridge is not defined off the game origin', () => {
  const win = { location: { origin: 'https://example.org' }, ReactNativeWebView: { postMessage() {} }, dispatchEvent() {} };
  vm.runInNewContext(nativeBridgeScript, { window: win, location: win.location, CustomEvent: class {} });
  assert.equal(win.RedAlertNative, undefined);
});

test('voice policy prefers Google speech and falls back sensibly', () => {
  assert.equal(pickRecognitionService(['com.samsung.android.bixby.agent', 'com.google.android.googlequicksearchbox']), 'com.google.android.googlequicksearchbox');
  assert.equal(pickRecognitionService(['com.google.android.as']), 'com.google.android.as');
  assert.equal(pickRecognitionService(['com.samsung.android.bixby.agent']), undefined);
  assert.equal(pickRecognitionService([]), undefined);
  assert.equal(pickLanguage('en-GB'), 'en-GB');
  assert.equal(pickLanguage('en_NZ'), 'en-NZ');
  assert.equal(pickLanguage('en-AU'), 'en-US');
  assert.equal(pickLanguage(''), 'en-US');
});

test('trusted web view patch locks messaging to the game origin', () => {
  const { secureWebViewSource } = require('../plugins/withTrustedWebView.cjs');
  const source = `        } else {
          if (fallbackBridge == null) {
            fallbackBridge = new RNCWebViewBridge(webView);
            addJavascriptInterface(fallbackBridge, JAVASCRIPT_INTERFACE);
          }
        }
                RNCWebView.this.onMessage(message.getData(), sourceOrigin.toString());
        Set.of("*")`;
  const out = secureWebViewSource(source);
  assert.ok(out.includes('Set.of("https://vox-star-command.base44.app")'));
  assert.ok(out.includes('if (!isMainFrame) return;'));
  assert.ok(out.includes('messagingEnabled = false;'));
  assert.equal(secureWebViewSource(out), out);
});

test('newer session, journey, audio and search messages are accepted alongside pilot voices', async () => {
  for (const p of [packet('session.prepare'), packet('session.cancel'), packet('geo.search', { text: '12 Queen St' }), packet('journey.active', { active: true }), packet('audio.state', { muted: false })]) {
    assert.ok(parseBridgeMessage(JSON.stringify(p), APP_ORIGIN), p.type);
  }
  for (const p of [packet('geo.search', { text: 'ab' }), packet('journey.active', { active: 'yes' }), packet('audio.state'), packet('speech.say', { text: 'hi', rate: 0.1 })]) {
    assert.equal(parseBridgeMessage(JSON.stringify(p), APP_ORIGIN), null, p.type);
  }
  const { createSpeechSession } = await import('../src/speechSession.ts');
  let voice;
  const session = createSpeechSession({ speak: (_t, _c, v) => { voice = v; }, stop: () => {}, send: () => {} });
  await session.say({ id: 1, doc: 'document1', text: 'Lock on?', pitch: 1.3, rate: 0.9 });
  assert.deepEqual(voice, { pitch: 1.3, rate: 0.9, character: undefined });
  await session.say({ id: 2, doc: 'document1', text: 'Weapons hot', character: 'VEX' });
  assert.equal(voice.character, 'VEX');
});
