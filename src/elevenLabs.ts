// The real pieces behind cloudVoice.ts (#33): ElevenLabs text-to-speech over HTTPS from the phone, a cache
// folder on the phone, and an expo-audio player. Kept separate so cloudVoice.ts stays testable.
import { createAudioPlayer } from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';
import { DEFAULT_MODEL, type Playback } from './cloudVoice';

const ENDPOINT = 'https://api.elevenlabs.io/v1/text-to-speech/';

export async function elevenSynth(voiceId: string, text: string, key: string, signal: AbortSignal): Promise<Uint8Array> {
  const res = await fetch(ENDPOINT + encodeURIComponent(voiceId) + '?output_format=mp3_44100_64', {
    method: 'POST',
    headers: { 'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: DEFAULT_MODEL }),
    signal,
  });
  if (!res.ok) throw Error('ElevenLabs ' + res.status);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.length < 100) throw Error('ElevenLabs returned no audio');
  return bytes;
}

// Cached lines live in the app's cache folder: Android may clear it when space runs low, and that's fine.
const folder = () => new Directory(Paths.cache, 'crew-voice');
export const voiceCache = {
  get(name: string): string | null {
    try { const f = new File(folder(), name); return f.exists && (f.size ?? 0) > 100 ? f.uri : null; } catch { return null; }
  },
  put(name: string, bytes: Uint8Array): string | null {
    try { const d = folder(); if (!d.exists) d.create({ intermediates: true, idempotent: true }); const f = new File(d, name); f.write(bytes); return f.uri; } catch { return null; }
  },
};

// One line at a time. If it hasn't started within 1.5 s, it's treated as failed (the phone voice takes over).
export function playFile(uri: string, ev: { started: () => void; done: () => void; failed: () => void }): Playback {
  let started = false, over = false;
  const player = createAudioPlayer({ uri });
  const finish = (fn: () => void) => { if (over) return; over = true; clearTimeout(timer); try { sub.remove(); } catch {} try { player.remove(); } catch {} fn(); };
  const sub = player.addListener('playbackStatusUpdate', s => {
    if (!started && s.playing) { started = true; clearTimeout(timer); ev.started(); }
    if (s.didJustFinish) finish(ev.done);
  });
  const timer = setTimeout(() => { if (!started) finish(ev.failed); }, 1500);
  try { player.play(); } catch { finish(ev.failed); }
  return { stop: () => { if (over) return; try { player.pause(); } catch {} finish(() => {}); } };
}
