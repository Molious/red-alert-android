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
  for (const fn of ['listenOnce', 'cancelListen', 'speak', 'hush', 'watchPosition', 'clearWatch', 'addEventListener', 'removeEventListener', 'receive']) {
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
  b.speak('Contact on the glass.');
  b.receive({ channel: CHANNEL, doc, id: 99, type: 'speech.end' });
  assert.deepEqual(seen, ['speak', 'hush']);

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
