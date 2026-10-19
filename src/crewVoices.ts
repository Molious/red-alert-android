// Gives every crew member their own Android text-to-speech voice.
//
// The game tells us who is speaking (WRAITH, VEX, ...). We pick a distinct installed English voice for
// each character, preferring their gender and accent, preferring voices that work offline, then shape
// each one with its own pitch and speed (from the crew sheet in red-alert/characters.js). If the phone
// has fewer voices than characters, voices are reused and only pitch/speed tell them apart.

export type DeviceVoice = {identifier: string; name?: string; language?: string; quality?: string};
export type CrewVoice = {voice?: string; language: string; pitch: number; rate: number};
type Gender = 'male' | 'female';
type Profile = {gender: Gender; accents: string[]; pitch: number; rate: number};

// Order matters: earlier characters get first pick of the best voices.
export const CREW_PROFILES: Record<string, Profile> = {
  WRAITH: {gender: 'female', accents: ['en-au', 'en-gb', 'en-us'], pitch: 1.0, rate: 0.95}, // navigator: clear, unhurried
  VEX: {gender: 'male', accents: ['en-us', 'en-au', 'en-gb'], pitch: 0.75, rate: 1.06},
  SILAS: {gender: 'male', accents: ['en-gb', 'en-in', 'en-us'], pitch: 0.85, rate: 0.92},
  MAGS: {gender: 'female', accents: ['en-gb', 'en-us', 'en-au'], pitch: 1.2, rate: 1.08},
  BASTION: {gender: 'male', accents: ['en-au', 'en-gb', 'en-us'], pitch: 0.65, rate: 0.88},
  MAX: {gender: 'male', accents: ['en-in', 'en-us', 'en-au'], pitch: 1.05, rate: 1.04},
  CHET: {gender: 'female', accents: ['en-us', 'en-in', 'en-gb'], pitch: 1.1, rate: 1.0}, // ship AI
};
const DEFAULT: Profile = {gender: 'female', accents: ['en-au'], pitch: 0.9, rate: 0.98};

// Google speech services voice codes (the "x-xxx" part of the identifier) with known genders.
const GOOGLE_GENDER: Record<string, Gender> = {
  iob: 'female', iog: 'female', iol: 'male', iom: 'male', sfg: 'female', tpc: 'female', tpd: 'male', tpf: 'female',
  gba: 'female', gbb: 'male', gbc: 'female', gbd: 'male', gbg: 'female', rjs: 'male',
  aua: 'female', aub: 'male', auc: 'female', aud: 'male',
  ena: 'female', enc: 'female', end: 'male', ene: 'male',
};

const lang = (v: DeviceVoice) => String(v.language || v.identifier || '').toLowerCase().replace('_', '-');
const accentOf = (v: DeviceVoice) => lang(v).slice(0, 5);
export function voiceGender(v: DeviceVoice): Gender | null {
  const id = String(v.identifier || '').toLowerCase();
  const code = /-x-([a-z]{3})(?:-|$)/.exec(id)?.[1];
  if (code && GOOGLE_GENDER[code]) return GOOGLE_GENDER[code];
  const name = String(v.name || '').toLowerCase();
  if (/\bfemale\b|#female/.test(id + ' ' + name)) return 'female';
  if (/\bmale\b|#male/.test(id + ' ' + name)) return 'male';
  return null;
}
const offline = (v: DeviceVoice) => !/network/i.test(v.identifier || '');
const enhanced = (v: DeviceVoice) => /enhanced/i.test(v.quality || '');

export function assignCrewVoices(voices: readonly DeviceVoice[] | null | undefined): Record<string, CrewVoice> {
  const english = (voices || []).filter(v => v && v.identifier && /^en(-|$)/.test(lang(v)));
  const used = new Set<string>();
  const out: Record<string, CrewVoice> = {};
  for (const [character, p] of Object.entries(CREW_PROFILES)) {
    const score = (v: DeviceVoice) => {
      const a = p.accents.indexOf(accentOf(v));
      const g = voiceGender(v);
      return (g === p.gender ? 40 : g === null ? 15 : 0) + (a >= 0 ? 20 - a * 5 : 0) + (offline(v) ? 10 : 0) + (enhanced(v) ? 3 : 0);
    };
    const pick = (pool: DeviceVoice[]) => pool.slice().sort((x, y) => score(y) - score(x) || x.identifier.localeCompare(y.identifier))[0];
    const fresh = english.filter(v => !used.has(v.identifier));
    const chosen = pick(fresh.length ? fresh : english);
    if (chosen) used.add(chosen.identifier);
    out[character] = {voice: chosen?.identifier, language: chosen ? (chosen.language || 'en-AU') : 'en-AU', pitch: p.pitch, rate: p.rate};
  }
  return out;
}

export function crewVoiceFor(map: Record<string, CrewVoice> | null, character: unknown): CrewVoice {
  const key = typeof character === 'string' ? character.toUpperCase() : '';
  return (map && map[key]) || (map && map.WRAITH) || {language: 'en-AU', pitch: DEFAULT.pitch, rate: DEFAULT.rate};
}
