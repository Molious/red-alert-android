// The five pilots. A pilot is chosen at New Game (or once, for an older save that never had one) and
// is bound to that save slot. Each one has its own voice and a real play-style difference:
//
//   damage        multiplies every hit you land
//   shieldTaken   multiplies every hit you take (enemy fire, harsh driving)
//   maxShields    multiplies the hull's shield capacity
//   lock          multiplies how long a lock-on takes (less than 1 is faster)
//   firstHit      a fresh, undamaged target takes this multiple on the first hit
//   enemyHit      multiplies the chance an enemy shot lands
//   cloakTime     multiplies how long one cloak charge lasts
//   cloakCap      extra cloak charges you can bank
//   bounty        multiplies the Bounty paid for a kill
//   loot          multiplies the Bounty from treasure and minor drops
//
// `portrait` is an image URL once real art exists; until then CharacterPortrait draws each pilot.
export const NEUTRAL = {
  damage: 1, shieldTaken: 1, maxShields: 1, lock: 1, firstHit: 1, enemyHit: 1, cloakTime: 1, cloakCap: 0, bounty: 1, loot: 1,
};

export const CHARACTERS = [
  {
    id: 'vex', name: 'Vex', archetype: 'Berserker', color: '#ff2a3a',
    portrait: '/images/pilots/vex-narrative.webp',
    race: "Reptilian", station: "Weapons",
    backstory: "Condemned to death by his honour-bound people after a dishonourable discharge, Vex escaped because a human in power took pity on him. He found his way to Earth and joined the Commander to repay that debt. Loud, reckless and grinning, he carries unanswered questions about his crime and the person who saved him.",
    blurb: 'Loud, reckless and grinning. Hits first, asks never.',
    perk: '+40% weapon damage', tradeoff: 'Shields take 25% more damage',
    mods: { damage: 1.4, shieldTaken: 1.25 },
    voice: { pitch: 0.7, rate: 1.08, prefer: 'male' },
    lines: { pick: "Vex. Point me at something and get out of the way.", lock: 'Got you. Hold still.', kill: 'Ha! Next!' },
  },
  {
    id: 'silas', name: 'Silas', archetype: 'Assassin', color: '#38e6ff',
    portrait: '/images/pilots/silas-narrative.webp',
    race: "Race of Light", station: "Scanners & Targeting",
    backstory: "Silas is living light; the crystalline body is its container. Their people kept the galaxy's knowledge and were hunted by the AI. Cold, clipped and precise, Silas carries an archive of the war, including truths that could challenge everything the ship believes about its human companion.",
    blurb: 'Cold, clipped and precise. One clean shot.',
    perk: 'Locks on 35% faster · first hit on a fresh target does double', tradeoff: '25% less max shields',
    mods: { lock: 0.65, firstHit: 2, maxShields: 0.75 },
    voice: { pitch: 0.82, rate: 0.9, prefer: 'male' },
    lines: { pick: 'Silas. Quietly, Commander.', lock: 'Target marked.', kill: 'Clean.' },
  },
  {
    id: 'wraith', name: 'Wraith', archetype: 'Ghost', color: '#a974ff',
    portrait: '/images/pilots/wraith-narrative.webp',
    race: "Insectoid", station: "Navigation",
    backstory: "Wraith lost his entire hive in the war. Quiet, sly and difficult to pin down, he found a new hive among the Commander's outcasts. The crew is now his family, and he would die to protect it.",
    blurb: 'Low, sly and never where you think.',
    perk: 'Longer cloak · +2 cloak charges · enemies hit 30% less often', tradeoff: 'Lowest weapon damage',
    mods: { cloakTime: 1.5, cloakCap: 2, enemyHit: 0.7, damage: 0.8 },
    voice: { pitch: 0.9, rate: 0.84, prefer: 'male' },
    lines: { pick: "Wraith. They won't see us coming.", lock: 'There you are.', kill: 'Gone, like it never was.' },
  },
  {
    id: 'bastion', name: 'Bastion', archetype: 'Juggernaut', color: '#ffb02e',
    portrait: '/images/pilots/bastion-narrative.webp',
    race: "Human", station: "Shields & Engineering",
    backstory: "An engineer before Earth's fall, Bastion survived by being useful to the conquerors and still carries that shame. He stayed beside the Commander at first to watch the rebuilt AI ship, ready to destroy it if it turned. Slowly, suspicion became trust. Gruff, calm and immovable, he keeps the crew's home alive.",
    blurb: 'Gruff, calm, immovable. Outlasts everything.',
    perk: '+50% max shields', tradeoff: 'Lock-on takes 25% longer',
    mods: { maxShields: 1.5, lock: 1.25 },
    voice: { pitch: 0.6, rate: 0.86, prefer: 'male' },
    lines: { pick: 'Bastion. Let them shoot. We hold.', lock: 'Locked. Steady now.', kill: 'Down it goes.' },
  },
  {
    id: 'mags', name: 'Max', archetype: 'Scavenger', color: '#3dea7a',
    portrait: '/images/pilots/mags-narrative.webp',
    race: "Human", station: "Cargo, Salvage & Trade",
    backstory: "Max stowed away on the ship's maiden voyage. When she was discovered, her extraordinary talent for salvage earned her a place aboard. Wily, quick and always counting the take, she ventures out in the salvage vessel to bring discarded treasures home. Exactly how she was discovered remains a story waiting to unfold.",
    blurb: 'Wily, quick and always counting the take.',
    perk: '+50% Bounty per kill · double from treasure and drops', tradeoff: '15% less damage and 15% less shields',
    mods: { bounty: 1.5, loot: 2, damage: 0.85, maxShields: 0.85 },
    voice: { pitch: 1.25, rate: 1.12, prefer: 'female' },
    lines: { pick: "Max here. Let's get paid.", lock: 'Ooh, that one looks valuable.', kill: 'Ka-ching!' },
  },
];

export const characterById = (id) => CHARACTERS.find((c) => c.id === id) || null;

// A pilot's modifiers, with every field filled in (no character = neutral).
export function characterMods(id) {
  const c = characterById(id);
  return { ...NEUTRAL, ...(c?.mods || {}) };
}

