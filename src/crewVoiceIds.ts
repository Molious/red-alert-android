// ElevenLabs voices selected for Mole Beyond v1.0.30.
// Preserve internal IDs for compatibility with existing saves and routing.
export const CREW_VOICE_IDS: Record<string, string> = {
  WRAITH: 'CwhRBWXzGAHq8TQ4Fs17', // Zyren — insectoid navigator
  VEX: 'ysswSXp8U9dFpzPJqFje', // reptilian weapons officer
  SILAS: 'hpp4J3VqNfWAUOO0d1Us', // Sila — female Race of Light
  BASTION: 'nPczCjzI2devNBz1zQrb', // shields and engineering
  MAX: 'QzgYVYSNBgksoEWDkpKt', // salvage and trade
  CHET: 'dyLJ4nCukg4AOgAVlUR7', // ATLAS — male ship AI
};
export function elevenVoiceFor(character: string | undefined): string | null {
  const key = String(character || '').toUpperCase();
  const aliases: Record<string, string> = { MAGS: 'MAX', ZYREN: 'WRAITH', SILA: 'SILAS', ATLAS: 'CHET' };
  const id = CREW_VOICE_IDS[aliases[key] || key] || '';
  return /^[A-Za-z0-9]{20}$/.test(id) ? id : null;
}
