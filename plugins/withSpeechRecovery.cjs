// Issue #3: directions voice stopped after the screen went off and on again.
//
// expo-speech 57.0.3 creates Android's TextToSpeech engine once and keeps it until the app is destroyed.
// If the phone drops the connection to its speech engine while the screen is off (Samsung does this to
// background services), every later speak() call returns ERROR. expo-speech ignores that return value, so
// no start, done or error callback ever arrives and the app goes silent for the rest of the drive.
//
// This patch makes expo-speech:
//   - check the result of speak(); on failure, rebuild the engine once and replay that line,
//   - expose resetEngine() so the app's watchdog (src/speechSession.ts) can rebuild a stuck engine,
//   - clear its startup queue after replaying it, so a rebuilt engine never repeats old lines.
//
// Pinned to expo-speech 57.0.3 (see package.json). If the library changes, the build stops with a clear
// message instead of silently shipping without recovery.
const fs = require('node:fs');
const path = require('node:path');
const { withDangerousMod } = require('expo/config-plugins');

const MARK = 'RED_ALERT_SPEECH_RECOVERY_V1';

const PATCHES = [
  // Shutting down must not build a fresh engine just to close it.
  [
    `    OnActivityDestroys {
      textToSpeech.shutdown()
    }`,
    `    OnActivityDestroys {
      resetTextToSpeech()
    }`,
  ],
  // resetEngine(): rebuild a stuck engine on request from JS.
  [
    `    AsyncFunction<Unit>("stop") {
      textToSpeech.stop()
    }`,
    `    AsyncFunction<Unit>("stop") {
      textToSpeech.stop()
    }

    // ${MARK}: rebuild the engine when the app's watchdog sees a line that never starts.
    AsyncFunction<Unit>("resetEngine") {
      resetTextToSpeech()
      textToSpeech
    }`,
  ],
  // speakOut(): remember whether this line has already been retried.
  [
    `  private fun speakOut(id: String, text: String, options: SpeechOptions) {`,
    `  private fun speakOut(id: String, text: String, options: SpeechOptions, retried: Boolean = false) {`,
  ],
  // speakOut(): check the result instead of ignoring it.
  [
    `    textToSpeech.speak(
      text,
      TextToSpeech.QUEUE_ADD,
      params,
      id
    )
  }`,
    `    val result = textToSpeech.speak(
      text,
      TextToSpeech.QUEUE_ADD,
      params,
      id
    )
    // ${MARK}: ERROR here means the engine connection is gone. Rebuild once and replay the line.
    if (result != TextToSpeech.SUCCESS) {
      if (retried) {
        sendEvent(speakingErrorEvent, idToMap(id))
      } else {
        synchronized(this@SpeechModule) {
          resetTextToSpeech()
          delayedUtterances.add(Utterance(id, text, options, true))
        }
        textToSpeech
      }
    }
  }`,
  ],
  // The engine becomes a rebuildable property instead of a one-time lazy value.
  [
    `  private val textToSpeech: TextToSpeech by lazy {
    val newTtsInstance = TextToSpeech(appContext.reactContext) { status: Int ->
      if (status == TextToSpeech.SUCCESS) {`,
    `  // ${MARK}: rebuildable engine. A late init callback from a replaced engine is ignored.
  private var ttsGeneration = 0

  private val textToSpeech: TextToSpeech
    get() = synchronized(this@SpeechModule) { _textToSpeech ?: createTextToSpeech() }

  private fun resetTextToSpeech() {
    synchronized(this@SpeechModule) {
      val old = _textToSpeech
      _textToSpeech = null
      ttsGeneration++
      ttsState = TtsState.PENDING
      try {
        old?.shutdown()
      } catch (_: Exception) {
      }
    }
  }

  private fun createTextToSpeech(): TextToSpeech {
    val generation = ++ttsGeneration
    ttsState = TtsState.PENDING
    val newTtsInstance = TextToSpeech(appContext.reactContext) { status: Int ->
      if (generation != ttsGeneration) return@TextToSpeech
      if (status == TextToSpeech.SUCCESS) {`,
  ],
  // Replay the startup queue once, then clear it.
  [
    `          for ((id, text, options) in delayedUtterances) {
            speakOut(id, text, options)
          }
          for (promise in delayedGetVoices) {
            promise.resolve(getVoices())
          }`,
    `          val queued = delayedUtterances.toList()
          delayedUtterances.clear()
          for (u in queued) {
            speakOut(u.id, u.text, u.options, u.retried)
          }
          val voicePromises = delayedGetVoices.toList()
          delayedGetVoices.clear()
          for (promise in voicePromises) {
            promise.resolve(getVoices())
          }`,
  ],
  [
    `          delayedGetVoices.forEach { it.resolve(emptyList<VoiceRecord>()) }
          delayedUtterances.forEach { sendEvent(speakingErrorEvent, idToMap(it.id)) }`,
    `          delayedGetVoices.forEach { it.resolve(emptyList<VoiceRecord>()) }
          delayedUtterances.forEach { sendEvent(speakingErrorEvent, idToMap(it.id)) }
          delayedGetVoices.clear()
          delayedUtterances.clear()`,
  ],
  [
    `    _textToSpeech = newTtsInstance
    newTtsInstance
  }`,
    `    _textToSpeech = newTtsInstance
    return newTtsInstance
  }`,
  ],
  // The init callback may run before _textToSpeech is assigned; never crash on that.
  [
    `          ttsState = TtsState.READY
          _textToSpeech!!.setOnUtteranceProgressListener(`,
    `          val engine = _textToSpeech ?: return@synchronized
          ttsState = TtsState.READY
          engine.setOnUtteranceProgressListener(`,
  ],
  [
    `  private data class Utterance(
    val id: String,
    val text: String,
    val options: SpeechOptions
  )`,
    `  private data class Utterance(
    val id: String,
    val text: String,
    val options: SpeechOptions,
    val retried: Boolean = false
  )`,
  ],
];

function recoverSpeechSource(source) {
  if (source.includes(MARK)) return source;
  let out = source;
  for (const [from, to] of PATCHES) {
    if (out.split(from).length !== 2) {
      throw new Error('Speech recovery patch no longer matches pinned expo-speech 57.0.3. Review plugins/withSpeechRecovery.cjs before building.');
    }
    out = out.replace(from, () => to);
  }
  return out;
}

module.exports = (config) =>
  withDangerousMod(config, [
    'android',
    async (config) => {
      const file = path.join(
        config.modRequest.projectRoot,
        'node_modules/expo-speech/android/src/main/java/expo/modules/speech/SpeechModule.kt'
      );
      fs.writeFileSync(file, recoverSpeechSource(fs.readFileSync(file, 'utf8')));
      return config;
    },
  ]);
module.exports.recoverSpeechSource = recoverSpeechSource;
