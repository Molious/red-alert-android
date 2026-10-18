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

