// ElevenLabs crew voices (#33). Each crew member speaks with their own ElevenLabs voice (crewVoiceIds.ts),
// requested straight from the phone with the driver's own key (entered in the Crew panel, kept on this
// phone). Every line is cached on the phone, so a repeated line ("In 200 metres, turn left") is free and
// instant the next time.
//
// Safety: a line never waits long on the network. Directions and safety lines get ~1.5 s, crew lines ~4 s (always inside the 6 s speech watchdog);
// past that (or with no key, no voice, no signal, an error) the phone's own voice says it instead. A late
// download is still cached for next time but never played over the fallback.

export type Speaker = { onStart: () => void; onDone: () => void; onStopped: () => void; onError: () => void };
export type LineVoice = { character?: string; priority?: string };
export type Playback = { stop: () => void };

export type CloudVoiceDeps = {
  key: () => string;
  voiceFor: (character: string | undefined) => string | null;
  /** Fetch MP3 bytes for the line. Must honour the abort signal. */
  synth: (voiceId: string, text: string, key: string, signal: AbortSignal) => Promise<Uint8Array>;
  cache: { get: (name: string) => string | null; put: (name: string, bytes: Uint8Array) => string | null };
  /** Play a cached file; call done once when it ends, failed if it can't play. */
  play: (uri: string, events: { started: () => void; done: () => void; failed: () => void }) => Playback;
  timers?: { set: (fn: () => void, ms: number) => unknown; clear: (t: unknown) => void };
  model?: string;
  urgentMs?: number;
  crewMs?: number;
};

export const DEFAULT_MODEL = 'eleven_flash_v2_5';
const URGENT = new Set(['safety', 'navigation']);

// FNV-1a: a short stable file name for (voice, model, text).
export function cacheName(voiceId: string, model: string, text: string): string {
  let h = 0x811c9dc5;
  const s = voiceId + '|' + model + '|' + text;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return voiceId.slice(0, 8) + '-' + h.toString(16).padStart(8, '0') + '-' + s.length + '.mp3';
}

// ElevenLabs keys: "sk_" + hex (current) or 32 hex characters (older). Never logged or sent anywhere else.
export const validElevenKey = (k: unknown) => typeof k === 'string' && /^(sk_[a-f0-9]{30,80}|[a-f0-9]{32})$/i.test(k.trim());

export function createCloudVoice(d: CloudVoiceDeps) {
  const timers = d.timers || { set: (fn: () => void, ms: number) => setTimeout(fn, ms), clear: (t: unknown) => clearTimeout(t as ReturnType<typeof setTimeout>) };
  const model = d.model || DEFAULT_MODEL;
  type Line = { abort: AbortController; playback: Playback | null; timer: unknown; settled: boolean; cb: Speaker };
  let current: Line | null = null;
  let playing = false;

  function stop() {
    const c = current; current = null; playing = false;
    if (!c) return;
    timers.clear(c.timer); c.abort.abort(); c.playback?.stop();
  }

  /** Speak a line. Returns 'cloud' if ElevenLabs handles it, otherwise calls fallback() and returns 'phone'. */
  function speak(text: string, voice: LineVoice, cb: Speaker, fallback: () => void): 'cloud' | 'phone' {
    stop();
    const key = (d.key() || '').trim();
    const voiceId = d.voiceFor(voice.character);
    if (!text.trim() || !validElevenKey(key) || !voiceId) { fallback(); return 'phone'; }
    const name = cacheName(voiceId, model, text);
    const line: Line = { abort: new AbortController(), playback: null, timer: null, settled: false, cb };
    current = line;
    const mine = () => current === line;
    const finish = (fn: () => void) => { if (line.settled) return; line.settled = true; timers.clear(line.timer); if (mine()) { current = null; playing = false; } fn(); };
    const giveUp = () => finish(fallback);
    const start = (uri: string) => {
      if (!mine() || line.settled) return;
      timers.clear(line.timer);
      line.playback = d.play(uri, {
        started: () => { if (mine()) { playing = true; cb.onStart(); } },
        done: () => finish(cb.onDone),
        failed: giveUp,
      });
    };
    const cached = d.cache.get(name);
    if (cached) { start(cached); return 'cloud'; }
    line.timer = timers.set(() => { if (!line.settled && !line.playback) giveUp(); }, URGENT.has(voice.priority || '') ? (d.urgentMs ?? 1500) : (d.crewMs ?? 4000));
    // The download keeps going after a timeout (on its own controller) so the next identical line is cached.
    const download = new AbortController();
    line.abort.signal.addEventListener('abort', () => { if (!line.settled) download.abort(); });
    d.synth(voiceId, text, key, download.signal).then(bytes => {
      const uri = d.cache.put(name, bytes);
      if (uri && !line.settled) start(uri); else if (!uri && !line.settled) giveUp();
    }, () => { if (!line.settled) giveUp(); });
    return 'cloud';
  }

  return {
    speak,
    /** Stop the current cloud line; its speaker hears onStopped. True if a cloud line was stopped. */
    stop: () => { const c = current; if (!c || c.settled) { stop(); return false; } c.settled = true; stop(); c.cb.onStopped(); return true; },
    isPlaying: () => playing,
  };
}
