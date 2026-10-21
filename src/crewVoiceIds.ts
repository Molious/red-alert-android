// ElevenLabs voice for each crew member (#33), chosen by Cory from the ElevenLabs Voice Library.
// Voice IDs are not secret. An empty entry means that character keeps the phone's own voice.
export const CREW_VOICE_IDS: Record<string, string> = {
  WRAITH: '', // navigator, male: low, sly, loyal; speaks every direction
  VEX: '', // weapons, male: loud, reckless, grinning
  SILAS: '', // scanners, male: cold, clipped, precise
  BASTION: '', // engineer, male: gruff, calm, weary
  MAX: '', // salvage and trade, female: wily, quick, cheeky
  CHET: '', // the ship's AI, female: warm, dry humour
};
export function elevenVoiceFor(character: string | undefined): string | null {
  const key = String(character || '').toUpperCase();
  const id = CREW_VOICE_IDS[key === 'MAGS' ? 'MAX' : key] || '';
  return /^[A-Za-z0-9]{20}$/.test(id) ? id : null;
}
