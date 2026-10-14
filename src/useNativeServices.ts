import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Speech from 'expo-speech';
import * as Location from 'expo-location';
import { ExpoSpeechRecognitionModule as Recognition, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import type WebView from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import { APP_ORIGIN, CHANNEL, parseBridgeMessage, type Message } from './bridgeProtocol';
import { pickLanguage, pickRecognitionService, MAX_LISTEN_MS } from './voicePolicy';

// The native side of window.RedAlertNative: voice commands, SEXTANT's voice and GPS.
//
// Voice is one spoken command per request (the game opens the mic for a command, or for a yes/no to a
// combat prompt). The fixes for "mic switches on, then straight off" are built in:
//   - Google's speech service is used when the phone has it, rather than whatever the phone defaults to
//     (Samsung's recogniser often refuses other apps and ends the session immediately).
//   - If en-AU is refused, it retries once in the phone's own language.
//   - It keeps listening through short pauses (continuous mode) and hands back the first finished
//     phrase, with a 60 second cap.
//   - If the phone has no speech service at all, it says so plainly.

export type Phase = 'off' | 'permission' | 'listening' | 'stopping';

type Capture = {
  request: Message;
  epoch: number;
  text: string;
  error: string | null;
  lang: string;
  retried: boolean;
  retrying: boolean;
  delivered: boolean;
};

const NO_SERVICE =
  "This phone has no speech recognition service. Install or enable the Google app (Google speech services), then tap the mic again.";

export function useNativeServices(web: React.RefObject<WebView | null>) {
  const [phase, setPhase] = useState<Phase>('off');
  const [error, setError] = useState('');
  const document = useRef<string | null>(null);
  const capture = useRef<Capture | null>(null);
  const epoch = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(true);
  const alive = useRef(true);
  const watches = useRef(new Map<number, { remove: () => void }>());

  const send = (r: Pick<Message, 'doc' | 'id'>, type: string, extra: object = {}) => {
    if (!alive.current || document.current !== r.doc) return;
    const payload = JSON.stringify({ channel: CHANNEL, doc: r.doc, id: r.id, type, ...extra });
    web.current?.injectJavaScript(
      `location.origin === ${JSON.stringify(APP_ORIGIN)} && window.RedAlertNative && window.RedAlertNative.receive(${payload}); true;`
    );
  };

  // ---------- voice ----------
  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const deliver = (c: Capture) => {
    if (c.delivered) return;
    c.delivered = true;
    const text = c.text.trim();
    send(c.request, 'voice.result', { text: text.length >= 2 ? text : '', error: text.length >= 2 ? null : c.error });
  };
  const startRecognition = (c: Capture) => {
    const services = safe(() => Recognition.getSpeechRecognitionServices(), [] as string[]);
    Recognition.start({
      lang: c.lang,
      interimResults: true,
      continuous: true,
      maxAlternatives: 1,
      androidRecognitionServicePackage: pickRecognitionService(services),
      recordingOptions: { persist: false },
    });
    setPhase('listening');
    clearTimer();
    timer.current = setTimeout(() => stopVoice(), MAX_LISTEN_MS);
  };
  const cancelVoice = () => {
    const c = capture.current;
    ++epoch.current;
    clearTimer();
    if (!c) return;
    c.error = c.error || 'aborted';
    deliver(c);
    capture.current = null;
    setPhase('off');
    safe(() => Recognition.abort(), undefined);
  };
  const stopVoice = () => {
    if (!capture.current) return;
    clearTimer();
    setPhase('stopping');
    safe(() => Recognition.stop(), undefined);
  };
  const listen = async (r: Message) => {
    if (capture.current) cancelVoice();
    if (!active.current) {
      send(r, 'voice.result', { text: '', error: 'busy' });
      return;
    }
    setError('');
    setPhase('permission');
    const c: Capture = {
      request: r, epoch: ++epoch.current, text: '', error: null,
      lang: 'en-AU', retried: false, retrying: false, delivered: false,
    };
    capture.current = c;
    try {
      const p = await Recognition.requestPermissionsAsync();
      if (capture.current !== c || c.epoch !== epoch.current || document.current !== r.doc || !active.current) return;
      if (!p.granted) {
        c.error = 'not-allowed';
        setError('Microphone access is off. Allow it in Android Settings › Apps › Red Alert › Permissions.');
        deliver(c);
        capture.current = null;
        setPhase('off');
        return;
      }
      // Let SEXTANT finish the question ("Lock on?") before the mic opens, so the prompt is heard and
      // not transcribed back as the answer.
      await waitForSpeechToFinish();
      if (capture.current !== c || c.epoch !== epoch.current || document.current !== r.doc || !active.current) return;
      if (!safe(() => Recognition.isRecognitionAvailable(), true)) {
        c.error = 'service-not-allowed';
        setError(NO_SERVICE);
        deliver(c);
        capture.current = null;
        setPhase('off');
        return;
      }
      startRecognition(c);
    } catch {
      if (capture.current !== c) return;
      c.error = 'audio-capture';
      deliver(c);
      capture.current = null;
      clearTimer();
      setPhase('off');
    }
  };

  useSpeechRecognitionEvent('result', (e) => {
    const c = capture.current;
    if (!c || c.delivered || c.epoch !== epoch.current) return;
    const transcript = e.results[0]?.transcript || '';
    if (transcript) c.text = transcript;
    // One command per request: the first finished phrase is the answer.
    if (e.isFinal && c.text.trim().length >= 2) {
      deliver(c);
      stopVoice();
    }
  });
  useSpeechRecognitionEvent('error', (e) => {
    const c = capture.current;
    if (!c) return;
    // en-AU refused by this phone's recogniser: try again once in the phone's own language.
    if ((e.error === 'language-not-supported' || e.error === 'bad-grammar') && !c.retried && !c.text) {
      c.retried = true;
      c.retrying = true;
      c.lang = pickLanguage(Intl.DateTimeFormat().resolvedOptions().locale);
      return;
    }
    c.error = e.error;
    if (e.error === 'service-not-allowed' || e.error === 'client') setError(NO_SERVICE);
    else if (e.error !== 'aborted' && e.error !== 'no-speech') setError(e.message || e.error);
    deliver(c);
  });
  useSpeechRecognitionEvent('end', () => {
    const c = capture.current;
    if (c && c.retrying && !c.delivered && c.epoch === epoch.current && active.current) {
      c.retrying = false;
      try {
        startRecognition(c);
        return;
      } catch {
        c.error = 'language-not-supported';
      }
    }
    if (c) deliver(c);
    capture.current = null;
    clearTimer();
    if (alive.current) setPhase('off');
  });

  // ---------- SEXTANT's voice ----------
  const stopSpeech = () => {
    void Speech.stop();
  };
  const speak = (r: Message) => {
    cancelVoice();
    stopSpeech();
    if (!active.current) return;
    Speech.speak(r.text!, {
      language: 'en-AU',
      rate: r.rate ?? 0.98,
      pitch: r.pitch ?? 0.85,
      onDone: () => send(r, 'speech.end'),
      onStopped: () => send(r, 'speech.end'),
      onError: () => send(r, 'speech.end'),
    });
  };

  // ---------- GPS ----------
  const clearWatch = (id: number) => {
    const sub = watches.current.get(id);
    if (sub) sub.remove();
    watches.current.delete(id);
  };
  const clearAllWatches = () => {
    for (const sub of watches.current.values()) sub.remove();
    watches.current.clear();
  };
  const watch = async (r: Message) => {
    try {
      const p = await Location.requestForegroundPermissionsAsync();
      if (document.current !== r.doc) return;
      if (!p.granted) {
        send(r, 'geo.error', { error: 'Location permission denied — allow it in Android Settings › Apps › Red Alert to track your route.' });
        return;
      }
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
        (loc) => {
          const { latitude, longitude, accuracy, speed, heading } = loc.coords;
          send(r, 'geo.fix', {
            fix: {
              lat: latitude,
              lng: longitude,
              accuracy: accuracy ?? null,
              speed: speed != null && speed >= 0 ? speed : null,
              heading: heading != null && heading >= 0 ? heading : null,
              ts: loc.timestamp,
            },
          });
        }
      );
      if (document.current !== r.doc) {
        sub.remove();
        return;
      }
      clearWatch(r.id);
      watches.current.set(r.id, sub);
    } catch (e) {
      send(r, 'geo.error', { error: 'GPS is unavailable. Check Location is on, then start the drive again.' });
    }
  };

  // ---------- plumbing ----------
  const reset = () => {
    document.current = null;
    cancelVoice();
    stopSpeech();
    clearAllWatches();
  };
  const onMessage = (e: WebViewMessageEvent) => {
    const m = parseBridgeMessage(e.nativeEvent.data, e.nativeEvent.url);
    if (!m) return;
    if (m.type === 'bridge.ready') {
      if (document.current !== m.doc) {
        reset();
        document.current = m.doc;
      }
      return;
    }
    if (document.current !== m.doc) return;
    if (m.type === 'voice.listen') void listen(m);
    if (m.type === 'voice.cancel' && capture.current?.request.id === m.id) cancelVoice();
    if (m.type === 'speech.say') speak(m);
    if (m.type === 'speech.cancel') stopSpeech();
    if (m.type === 'geo.watch') void watch(m);
    if (m.type === 'geo.clear') clearWatch(m.id);
  };

  useEffect(() => {
    alive.current = true;
    // Leaving the app stops the mic and the voice; the GPS watch keeps running while the app is open.
    const sub = AppState.addEventListener('change', (s) => {
      active.current = s === 'active';
      if (!active.current) {
        cancelVoice();
        stopSpeech();
      }
    });
    return () => {
      alive.current = false;
      reset();
      sub.remove();
    };
  }, []);

  return { phase, error, onMessage, reset, cancelVoice };
}

async function waitForSpeechToFinish(maxMs = 8000) {
  const until = Date.now() + maxMs;
  while (Date.now() < until) {
    let speaking = false;
    try {
      speaking = await Speech.isSpeakingAsync();
    } catch {
      speaking = false;
    }
    if (!speaking) return;
    await new Promise((r) => setTimeout(r, 150));
  }
  void Speech.stop();
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}
