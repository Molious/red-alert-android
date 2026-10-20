// Issue #3: directions voice stopped after the screen went off and on.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createSpeechSession} from '../src/speechSession.ts';

const require = createRequire(import.meta.url);
const flush = () => new Promise(r => setImmediate(r));

// Manual timers so tests decide when "6 seconds" have passed.
function fakeTimers() {
  const pending = [];
  return {
    pending,
    set: (fn, ms) => { const t = {fn, ms, done: false}; pending.push(t); return t; },
    clear: t => { if (t) t.done = true; },
    async fire(ms) { for (const t of pending.filter(t => !t.done && (ms === undefined || t.ms === ms))) { t.done = true; t.fn(); } await flush(); await flush(); },
  };
}

function rig({isSpeaking = () => false, recover} = {}) {
  const timers = fakeTimers(), spoken = [], ends = [], recovered = [];
  let resets = 0;
  const session = createSpeechSession({
    speak: (text, callbacks) => spoken.push({text, callbacks}),
    stop: async () => {},
    send: (r, outcome) => ends.push([r.id, outcome]),
    isSpeaking,
    recover: recover ?? (async () => { resets++; }),
    onRecover: r => recovered.push(r.id),
    startTimeoutMs: 6000, retryStartTimeoutMs: 8000, stopTimeoutMs: 1500, timers,
  });
  return {session, timers, spoken, ends, recovered, resets: () => resets};
}
const line = (id, text = 'Turn left onto Gympie Road') => ({id, doc: 'd', text});

test('a line that never starts rebuilds the speech engine once and is spoken again', async () => {
  const t = rig();
  await t.session.say(line(1));
  assert.equal(t.spoken.length, 1);
  await t.timers.fire(6000);
  assert.equal(t.resets(), 1);
  assert.deepEqual(t.recovered, [1]);
  assert.equal(t.spoken.length, 2, 'retried after the engine restart');
  assert.equal(t.spoken[1].text, 'Turn left onto Gympie Road');
  t.spoken[1].callbacks.onStart();
  t.spoken[1].callbacks.onDone();
  assert.deepEqual(t.ends, [[1, 'played']]);
});

test('a second miss reports failed instead of hanging, and only rebuilds once', async () => {
  const t = rig();
  await t.session.say(line(1));
  await t.timers.fire(6000);
  await t.timers.fire(8000);
  assert.equal(t.resets(), 1);
  assert.deepEqual(t.ends, [[1, 'failed']]);
});

test('a line that starts normally is never interrupted by the watchdog', async () => {
  const t = rig();
  await t.session.say(line(1));
  t.spoken[0].callbacks.onStart();
  await t.timers.fire();
  assert.equal(t.resets(), 0);
  assert.equal(t.spoken.length, 1);
  t.spoken[0].callbacks.onDone();
  assert.deepEqual(t.ends, [[1, 'played']]);
});

test('an engine that talks without reporting a start is left alone', async () => {
  const t = rig({isSpeaking: async () => true});
  await t.session.say(line(1));
  await t.timers.fire(6000);
  assert.equal(t.resets(), 0);
  assert.equal(t.spoken.length, 1);
  t.spoken[0].callbacks.onDone();
  assert.deepEqual(t.ends, [[1, 'played']]);
});

test('late callbacks from the dead attempt cannot end the retried line', async () => {
  const t = rig();
  await t.session.say(line(1));
  await t.timers.fire(6000);
  t.spoken[0].callbacks.onError();
  t.spoken[0].callbacks.onDone();
  assert.deepEqual(t.ends, []);
  t.spoken[1].callbacks.onStart();
  t.spoken[1].callbacks.onDone();
  assert.deepEqual(t.ends, [[1, 'played']]);
});

test('cancelling while the engine restarts does not bring the old line back', async () => {
  let release;
  const t = rig({recover: () => new Promise(r => { release = r; })});
  await t.session.say(line(1));
  await t.timers.fire(6000);
  t.session.cancel(1);
  release();
  await flush(); await flush();
  assert.equal(t.spoken.length, 1);
  assert.deepEqual(t.ends, [[1, 'cancelled']]);
});

test('a newer direction replaces a line stuck waiting for the engine', async () => {
  const t = rig();
  await t.session.say(line(1, 'old'));
  await t.session.say(line(2, 'Turn right now'));
  await t.timers.fire(6000);
  assert.deepEqual(t.ends[0], [1, 'cancelled']);
  assert.equal(t.resets(), 1, 'only the current line triggers a rebuild');
  assert.equal(t.spoken.at(-1).text, 'Turn right now');
});

test('a stop() that never settles cannot block the next line', async () => {
  const timers = fakeTimers(), spoken = [];
  const session = createSpeechSession({speak: t => spoken.push(t), stop: () => new Promise(() => {}), send() {}, timers, stopTimeoutMs: 1500});
  const task = session.say(line(1, 'Continue straight'));
  await flush();
  assert.deepEqual(spoken, []);
  await timers.fire(1500);
  await task;
  assert.deepEqual(spoken, ['Continue straight']);
});

// ---------- native patch ----------
const SOURCE = 'node_modules/expo-speech/android/src/main/java/expo/modules/speech/SpeechModule.kt';
const {recoverSpeechSource} = require('../plugins/withSpeechRecovery.cjs');

test('expo-speech patch checks speak() and can rebuild the engine', () => {
  const original = readFileSync(SOURCE, 'utf8');
  const patched = recoverSpeechSource(original);
  assert.match(patched, /RED_ALERT_SPEECH_RECOVERY_V1/);
  assert.match(patched, /val result = textToSpeech\.speak\(/);
  assert.match(patched, /if \(result != TextToSpeech\.SUCCESS\)/);
  assert.match(patched, /AsyncFunction<Unit>\("resetEngine"\)/);
  assert.match(patched, /delayedUtterances\.clear\(\)/, 'a rebuilt engine never replays old lines');
  assert.doesNotMatch(patched, /by lazy/);
  assert.doesNotMatch(patched, /_textToSpeech!!/);
  assert.equal(recoverSpeechSource(patched), patched, 'safe to apply twice');
});

test('expo-speech patch stops the build if the library changed', () => {
  const original = readFileSync(SOURCE, 'utf8');
  assert.throws(() => recoverSpeechSource(original.replace('TextToSpeech.QUEUE_ADD', 'TextToSpeech.QUEUE_FLUSH')), /no longer matches pinned expo-speech 57\.0\.3/);
});

test('the app registers the speech recovery plugin and pins expo-speech', () => {
  const app = JSON.parse(readFileSync('app.json', 'utf8'));
  assert.ok(app.expo.plugins.includes('./plugins/withSpeechRecovery.cjs'));
  assert.equal(JSON.parse(readFileSync('node_modules/expo-speech/package.json', 'utf8')).version, '57.0.3');
});
