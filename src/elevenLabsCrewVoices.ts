// ElevenLabs IDs are public voice identifiers, never API credentials.
// Server-side TTS is required; do not call ElevenLabs directly from the APK.
export const ELEVENLABS_CREW_VOICES = Object.freeze({
  atlas: 'dyLJ4nCukg4AOgAVlUR7',
  vex: 'ysswSXp8U9dFpzPJqFje',
  zyren: 'CwhRBWXzGAHq8TQ4Fs17',
  sila: 'hpp4J3VqNfWAUOO0d1Us',
  bastion: 'nPczCjzI2devNBz1zQrb',
  max: 'QzgYVYSNBgksoEWDkpKt',
} as const);

export type ElevenLabsCrewMember = keyof typeof ELEVENLABS_CREW_VOICES;
export const ATLAS_FIRST_LINE =
  'ATLAS online. All primary systems operational. Welcome aboard, Captain.';

// Previous internal character keys may appear in older saves and event scripts.
const LEGACY_CREW_NAMES: Record<string, ElevenLabsCrewMember> = {
  sextant: 'atlas',
  chet: 'atlas',
  wraith: 'zyren',
  silas: 'sila',
  mags: 'max',
};
export function resolveElevenLabsVoice(character: string): string | undefined {
  const normalized = character.trim().toLowerCase();
  const key = (LEGACY_CREW_NAMES[normalized] ?? normalized) as ElevenLabsCrewMember;
  return Object.prototype.hasOwnProperty.call(ELEVENLABS_CREW_VOICES, key)
    ? ELEVENLABS_CREW_VOICES[key]
    : undefined;
}
