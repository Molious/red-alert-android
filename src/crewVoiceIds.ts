// Approved crew-to-ElevenLabs voice mapping (issue #42). Voice IDs are public identifiers, not API keys.
// Legacy aliases preserve old save files and older dialogue routing during migration.
export const CREW_VOICE_IDS: Record<string, string> = {
  VEX: 'ysswSXp8U9dFpzPJqFje',
  ZYREN: 'CwhRBWXzGAHq8TQ4Fs17',
  SILA: 'hpp4J3VqNfWAUOO0d1Us',
  BASTION: 'nPczCjzI2devNBz1zQrb',
  MAX: 'QzgYVYSNBgksoEWDkpKt',
  ATLAS: 'dyLJ4nCukg4AOgAVlUR7',
};
const LEGACY_NAMES: Record<string, string> = { WRAITH: 'ZYREN', SILAS: 'SILA', CHET: 'ATLAS', MAGS: 'MAX' };
export function elevenVoiceFor(character: string | undefined): string | null {
  const raw = String(character || '').trim().toUpperCase();
  const id = CREW_VOICE_IDS[LEGACY_NAMES[raw] || raw] || '';
  return /^[A-Za-z0-9]{20}$/.test(id) ? id : null;
}
