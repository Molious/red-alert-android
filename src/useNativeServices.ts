import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Speech from 'expo-speech';
import * as Location from 'expo-location';
import {activateKeepAwakeAsync,deactivateKeepAwake} from 'expo-keep-awake';
import { ExpoSpeechRecognitionModule as Recognition, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import type WebView from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import { APP_ORIGIN, CHANNEL, parseBridgeMessage, type Message } from './bridgeProtocol';
import {createRecognitionGate} from './recognitionGate';
import {createSessionPreparation} from './sessionPreparation';
import {createSpeechSession,waitForCaptureSpeech,createAudioSwitch} from './speechSession';
import { pickLanguage, pickRecognitionService, MAX_LISTEN_MS } from './voicePolicy';
import { isApproximatePin } from './addressPolicy';
import {assignCrewVoices,crewVoiceFor,crewVoiceList,type CrewVoice,type DeviceVoice,type VoiceOption} from './crewVoices';

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
  const [audioMuted,setAudioMuted]=useState(false);
  const document = useRef<string | null>(null);
  const capture = useRef<Capture | null>(null);
  const recognitionGate=useRef(createRecognitionGate<Capture>());
  const epoch = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(true);
  const alive = useRef(true);
  const journeyActive = useRef(false);
  const setAwake=(value:boolean)=>{journeyActive.current=value;if(value)void activateKeepAwakeAsync('live-journey').then(()=>{if(!journeyActive.current)void deactivateKeepAwake('live-journey');}).catch(()=>{});else void deactivateKeepAwake('live-journey');};
  const pendingWatches = useRef(new Set<number>());
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
    if(!recognitionGate.current.claim(c))throw Error('Previous microphone session is still ending');
    const services = safe(() => Recognition.getSpeechRecognitionServices(), [] as string[]);
    try{Recognition.start({
      lang: c.lang,
      interimResults: true,
      continuous: true,
      maxAlternatives: 1,
      androidRecognitionServicePackage: pickRecognitionService(services),
      recordingOptions: { persist: false },
    });}catch(e){recognitionGate.current.release();throw e;}
    setPhase('listening');
    send(c.request, 'voice.started');
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
      const ended=await recognitionGate.current.wait();
      if(capture.current!==c||c.epoch!==epoch.current||document.current!==r.doc||!active.current)return;
      if(!ended){c.error='busy';deliver(c);capture.current=null;setPhase('off');return;}
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
      const speechReady=await waitForCaptureSpeech(()=>capture.current===c&&c.epoch===epoch.current&&document.current===r.doc&&active.current,()=>waitForSpeechToFinish(20000));
      if(speechReady==='stale')return;
      if(speechReady==='busy'){c.error='busy';deliver(c);capture.current=null;setPhase('off');return;}
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
    const c = recognitionGate.current.current();
    if (!c || c!==capture.current || c.delivered || c.epoch !== epoch.current) return;
    const transcript = e.results[0]?.transcript || '';
    if (transcript) c.text = transcript;
    // One command per request: the first finished phrase is the answer.
    if (e.isFinal && c.text.trim().length >= 2) {
      deliver(c);
      stopVoice();
    }
  });
  useSpeechRecognitionEvent('error', (e) => {
    const c = recognitionGate.current.current();
    if (!c||c!==capture.current||c.epoch!==epoch.current) return;
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
    const c = recognitionGate.current.release();
    if(!c||c!==capture.current)return;
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

  // Each crew member gets their own installed voice (see crewVoices.ts), worked out once per session.
  const crewVoices=useRef<Record<string,CrewVoice>|null>(null);const voiceOptions=useRef<VoiceOption[]>([]);
  const loadCrewVoices=async()=>{try{const v=await Speech.getAvailableVoicesAsync();crewVoices.current=assignCrewVoices(v as DeviceVoice[]);voiceOptions.current=crewVoiceList(v as DeviceVoice[]);return v;}catch{return [];}};
  // Request-correlated speech: an old Android completion cannot finish a newer line.
  const speechSession = useRef<ReturnType<typeof createSpeechSession> | null>(null);
  if(!speechSession.current)speechSession.current=createSpeechSession({
    speak:(text,callbacks,voice)=>{const cv=crewVoiceFor(crewVoices.current,voice.character,voice.voice,voiceOptions.current);const base={language:cv.language,rate:voice.rate??cv.rate,pitch:voice.pitch??cv.pitch};
      // A chosen voice can fail (e.g. not downloaded); fall back to the default voice rather than going silent.
      if(!cv.voice){Speech.speak(text,{...base,...callbacks});return;}
      Speech.speak(text,{...base,voice:cv.voice,onDone:callbacks.onDone,onStopped:callbacks.onStopped,onError:()=>Speech.speak(text,{...base,...callbacks})});},
    stop:()=>Speech.stop(),send:(r,outcome)=>send(r,'speech.end',{outcome})
  });
  const stopSpeech = (id=0) => { speechSession.current?.cancel(id); };
  const speak = (r:Message) => {cancelVoice();if(!active.current||audioSwitch.current?.isMuted()){send(r,'speech.end',{outcome:'cancelled'});return;}void speechSession.current?.say(r);};

  const audioSwitch=useRef<ReturnType<typeof createAudioSwitch>|null>(null);
  if(!audioSwitch.current)audioSwitch.current=createAudioSwitch({stop:()=>stopSpeech(),changed:setAudioMuted,notify:value=>web.current?.injectJavaScript(`window.dispatchEvent(new CustomEvent('hybrid-audio',{detail:{muted:${value}}})); true;`)});
  const setAudioPaused=(value:boolean)=>audioSwitch.current?.set(value);
  const preparation=useRef<ReturnType<typeof createSessionPreparation>|null>(null);
  if(!preparation.current)preparation.current=createSessionPreparation({permission:()=>Location.requestForegroundPermissionsAsync(),microphone:()=>Recognition.requestPermissionsAsync(),voices:()=>loadCrewVoices(),isActive:()=>active.current,isCurrent:r=>alive.current&&document.current===r.doc,send:(r,result)=>send(r,'session.ready',{...result,voices:voiceOptions.current,crew:Object.fromEntries(Object.entries(crewVoices.current||{}).map(([k,v])=>[k,v.voice||'']))})});

  // ---------- AI crew (optional, driver's own Anthropic key) ----------
  const askCrew=async(r:Message)=>{
    try{
      const res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':String(r.key),'anthropic-version':'2023-06-01'},
        body:JSON.stringify({model:'claude-haiku-5-5',max_tokens:300,system:r.system,messages:[{role:'user',content:r.text}]})});
      const data=await res.json().catch(()=>null);
      if(!res.ok){send(r,'ai.reply',{error:res.status===401?'The API key was rejected. Check it in the Crew panel.':res.status===429?'Too many requests. Give it a minute.':'AI service error '+res.status+'.'});return;}
      const answer=Array.isArray(data?.content)?data.content.filter((c:{type?:string})=>c?.type==='text').map((c:{text?:string})=>c.text||'').join('\n'):'';
      send(r,'ai.reply',answer?{answer:answer.slice(0,4000)}:{error:'No answer came back.'});
    }catch{send(r,'ai.reply',{error:'No internet connection for the AI crew.'});}
  };

  // ---------- GPS ----------
  const clearWatch = (id: number) => {
    pendingWatches.current.delete(id);
    const sub = watches.current.get(id);
    if (sub) sub.remove();
    watches.current.delete(id);
  };
  const clearAllWatches = () => {
    pendingWatches.current.clear();
    for (const sub of watches.current.values()) sub.remove();
    watches.current.clear();
  };
  const watch = async (r: Message) => {
    pendingWatches.current.add(r.id);
    try {
      const p = await Location.getForegroundPermissionsAsync();
      if (document.current !== r.doc || !active.current || !pendingWatches.current.has(r.id)) return;
      if (!p.granted) {
        send(r, 'geo.error', { error: 'Location permission denied — allow it in Android Settings › Apps › Red Alert to track your route.' });
        return;
      }
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
        (loc) => {
          if(!active.current||!watches.current.has(r.id)&&!pendingWatches.current.has(r.id))return;
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
      if (document.current !== r.doc || !active.current || !pendingWatches.current.has(r.id)) {
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
    preparation.current?.cancel();
    cancelVoice();
    stopSpeech();
    clearAllWatches();
    setAwake(false);
  };
  const onMessage = (e: WebViewMessageEvent) => {
    const m = parseBridgeMessage(e.nativeEvent.data, e.nativeEvent.url);
    console.info("BRIDGE", m?.type || "REJECTED", e.nativeEvent.url); console.info('BRIDGE', m?.type || 'REJECTED', e.nativeEvent.url); if (!m) return;
    if (m.type === 'bridge.ready') {
      if (document.current !== m.doc) {
        reset();
        document.current = m.doc;
      }
      return;
    }
    if (document.current !== m.doc) return;
    if(m.type==='session.prepare')void preparation.current?.start(m);
    if(m.type==='session.cancel')preparation.current?.cancel(m.id);
    if(m.type==='audio.state')setAudioPaused(m.muted===true);
    if(m.type==='journey.active')setAwake(m.active===true&&active.current);
    if (m.type === 'voice.listen') void listen(m);
    if (m.type === 'voice.cancel' && capture.current?.request.id === m.id) cancelVoice();
    if (m.type === 'speech.say') speak(m);
    if (m.type === 'ai.ask') void askCrew(m);
    if (m.type === 'speech.cancel') stopSpeech(m.id);
    if (m.type === 'geo.search') { void (async()=>{try {
      const permission=await Location.getForegroundPermissionsAsync();
      if(document.current!==m.doc||!active.current)return;
      if(!permission.granted)throw Error('Location permission required');
      const points=await Location.geocodeAsync(m.text!);const results=[];
      for(const p of points.slice(0,5)){
        if(document.current!==m.doc||!active.current)return;
        let label=m.text!+' · '+p.latitude.toFixed(4)+', '+p.longitude.toFixed(4),found:string|null|undefined;
        try{const [address]=await Location.reverseGeocodeAsync({latitude:p.latitude,longitude:p.longitude});
          if(address){found=address.streetNumber;label=[address.streetNumber,address.street,address.city||address.district,address.region,address.postalCode,address.country].filter(Boolean).join(' ').slice(0,200)||label;}
        }catch{}
        // Issue #5: the phone's geocoder can drop the house number and return the middle of the street.
        results.push({lat:p.latitude,lng:p.longitude,label,approximate:isApproximatePin(m.text!,found)});
      }
      send(m,'geo.results',{results});
    }catch{send(m,'geo.results',{results:[],error:'Address lookup unavailable. Try a full street address, suburb and country.'});}})();}
    if (m.type === 'geo.watch') void watch(m);
    if (m.type === 'geo.clear') clearWatch(m.id);
  };

  useEffect(() => {
    alive.current = true;
    // This prototype is foreground-only: location, microphone and speech stop together.
    // Android briefly reports the app as not active when the speech recogniser grabs the mic. Treating
    // that as "app in background" stopped GPS and navigation every time the mic opened (the map stopped
    // following and the route had to be recalculated). Now: ignore it while the mic is listening, and
    // only treat the app as backgrounded if it stays away for 2 seconds.
    let away: ReturnType<typeof setTimeout> | null = null, backgrounded = false;
    const goBackground=()=>{away=null;backgrounded=true;const preparing=preparation.current?.pending();active.current=false;
      if(!preparing)web.current?.injectJavaScript("window.dispatchEvent(new Event('hybrid-background')); true;");
      cancelVoice();stopSpeech();clearAllWatches();setAwake(false);};
    const sub = AppState.addEventListener('change', (s) => {
      console.info('APPSTATE',s);
      if (s === 'active') {
        if (away) { clearTimeout(away); away = null; }
        if (!backgrounded) return;
        backgrounded = false; active.current = true;
        const preparing=preparation.current?.pending();
        if(preparing)preparation.current?.foreground();else web.current?.injectJavaScript("window.dispatchEvent(new Event('hybrid-foreground')); true;");
        return;
      }
      if (capture.current || away || backgrounded) return;
      away = setTimeout(goBackground, 2000);
    });
    return () => {
      alive.current = false;
      reset();
      if (away) clearTimeout(away);
      sub.remove();
    };
  }, []);

  return { phase, error, audioMuted, toggleAudio:()=>audioSwitch.current?.toggle(), onMessage, reset, cancelVoice };
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
    if (!speaking) return true;
    await new Promise((r) => setTimeout(r, 150));
  }
  return false;
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

