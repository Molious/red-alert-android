// The message protocol between the Red Alert web app and this native shell.
//
// The web app (https://vox-star-command.base44.app) talks to `window.RedAlertNative`, which the shell
// injects. Every request travels as a JSON message on one channel, stamped with the page document's id,
// so a message from a stale page or another origin is ignored.

export const APP_ORIGIN = 'https://vox-star-command.base44.app';
export const CHANNEL = 'red-alert-native-v1';

export type Message = {
  channel: string;
  doc: string;
  id: number;
  type: string;
  text?: string;
  active?: boolean;
  muted?: boolean;
  pitch?: number;
  rate?: number;
};

const TYPES = new Set([
  'bridge.ready',
  'voice.listen',
  'voice.cancel',
  'speech.say',
  'speech.cancel',
  'geo.watch',
  'geo.clear',
  'geo.search',
  'journey.active',
  'session.prepare',
  'session.cancel',
  'audio.state',
]);

export function parseBridgeMessage(raw: string, url: string): Message | null {
  try {
    if (typeof raw !== 'string' || raw.length > 10000 || new URL(url).origin !== APP_ORIGIN) return null;
    const m = JSON.parse(raw);
    if (
      m.channel !== CHANNEL ||
      typeof m.doc !== 'string' ||
      m.doc.length < 4 ||
      m.doc.length > 100 ||
      !Number.isSafeInteger(m.id) ||
      m.id < 0 ||
      !TYPES.has(m.type)
    ) {
      return null;
    }
    if (m.type === 'speech.say' && (typeof m.text !== 'string' || m.text.length > 2000)) return null;
    // Each pilot speaks with their own pitch and rate; keep both in a sane range.
    if (m.type === 'speech.say' && m.pitch !== undefined && !(typeof m.pitch === 'number' && m.pitch >= 0.5 && m.pitch <= 2)) return null;
    if (m.type === 'speech.say' && m.rate !== undefined && !(typeof m.rate === 'number' && m.rate >= 0.5 && m.rate <= 2)) return null;
    if(m.type === 'geo.search' && (typeof m.text !== 'string' || m.text.trim().length < 3 || m.text.length > 200))return null;
    if(m.type==='journey.active'&&typeof m.active!=='boolean')return null;
    if(m.type==='audio.state'&&typeof m.muted!=='boolean')return null;
    return m as Message;
  } catch {
    return null;
  }
}

// Leaving the game's own origin (a sign-in page, say) drops every native session.
export function shouldResetForNavigation(url: string): boolean {
  try {
    return new URL(url).origin !== APP_ORIGIN;
  } catch {
    return true;
  }
}

