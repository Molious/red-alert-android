// Small, pure decisions about speech recognition, kept apart so they can be tested without a phone.

export const MAX_LISTEN_MS = 60_000;

// Google's recognisers, most reliable first. The Google app's service handles network recognition on
// almost every Android phone; Android System Intelligence is the on-device one on Android 13+.
const PREFERRED_SERVICES = ['com.google.android.googlequicksearchbox', 'com.google.android.as'];

// Returns the service package to ask for, or undefined to let the phone use its default.
export function pickRecognitionService(available: readonly string[] | null | undefined): string | undefined {
  if (!available || !available.length) return undefined;
  return PREFERRED_SERVICES.find((p) => available.includes(p));
}

// The phone's own language as a BCP-47 tag, for the retry when en-AU is refused. Falls back to en-US.
export function pickLanguage(locale: string | null | undefined): string {
  const tag = String(locale || '').replace('_', '-');
  return /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(tag) && tag !== 'en-AU' ? tag : 'en-US';
}


// ---------- open mic (#25) ----------
const ON_DEVICE_SERVICE = 'com.google.android.as';

export type RecognitionPlan = { service: string | undefined; onDevice: boolean; lang: string };

// Prefer on-device recognition so audio isn't streamed off the phone for the whole drive: Android System
// Intelligence with an English model installed (en-AU first). Otherwise use the Google app as before.
export function planRecognition({ services, onDeviceSupported, installedLocales }: {
  services: readonly string[] | null | undefined;
  onDeviceSupported: boolean;
  installedLocales: readonly string[] | null | undefined;
}): RecognitionPlan {
  const installed = (installedLocales || []).map((l) => String(l).replace('_', '-'));
  if (onDeviceSupported && (services || []).includes(ON_DEVICE_SERVICE)) {
    const lang = ['en-AU', 'en-GB', 'en-US'].find((l) => installed.some((i) => i.toLowerCase() === l.toLowerCase()))
      || installed.find((i) => /^en-/i.test(i));
    if (lang) return { service: ON_DEVICE_SERVICE, onDevice: true, lang };
  }
  return { service: pickRecognitionService(services), onDevice: false, lang: 'en-AU' };
}

// Words the recogniser should expect (Android 13+ biasing). Short and distinctive: commands and crew answers.
export const VOICE_BIAS = [
  'accept', 'decline', 'defend', 'evade', 'scan', 'collect', 'repair', 'acknowledge', 'launch', 'repeat',
  'mute', 'unmute', 'pause story', 'resume story', 'resume navigation', 'recenter', 'cancel journey',
  'let crew handle it', 'stop listening', 'destination', 'option one', 'option two', 'option three',
];
