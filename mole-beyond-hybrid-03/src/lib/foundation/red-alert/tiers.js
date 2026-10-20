// Enemy tiers. Every enemy in a sector has one; the boss is the sector's last stand.
//   hp         - hits to destroy (missiles hit for 2)
//   reward     - achievement currency paid the moment it is destroyed
//   fireEvery  - moving seconds between its shots at you
//   damage     - shield damage when one of its shots lands
//   lockSec    - smooth-driving seconds for the array to charge a lock on it
//   scale      - size on the glass relative to a scout
export const TIERS = {
  scout: { id: 'scout', name: 'Scout', rank: 1, hp: 1, reward: 5, fireEvery: 24, damage: 4, lockSec: 60, scale: 0.85 },
  raider: { id: 'raider', name: 'Raider', rank: 2, hp: 1, reward: 10, fireEvery: 18, damage: 6, lockSec: 78, scale: 0.95 },
  warship: { id: 'warship', name: 'Warship', rank: 3, hp: 2, reward: 20, fireEvery: 15, damage: 8, lockSec: 96, scale: 1.05 },
  dreadnought: { id: 'dreadnought', name: 'Dreadnought', rank: 4, hp: 3, reward: 35, fireEvery: 12, damage: 10, lockSec: 114, scale: 1.15 },
  boss: { id: 'boss', name: 'Boss', rank: 5, hp: 5, reward: 100, fireEvery: 10, damage: 14, lockSec: 135, scale: 1.35 },
};
export const TIER_ORDER = ['scout', 'raider', 'warship', 'dreadnought', 'boss'];

// Each faction's boss has a name.
export const BOSS_NAMES = { Insectoid: 'Hive Queen', Reptilian: 'Warlord Kaav', 'Race of Light': 'Prism Leviathan' };

// Rewards that are not kills.
export const TREASURE_REWARD = 25;
export const SECTOR_CLEAR_BONUS = 50;

// How many regular enemies a sector holds, plus its boss.
export const SECTOR_ENEMIES = [5, 8];

// Weighted pick for a regular (non-boss) enemy: mostly scouts and raiders, the odd dreadnought.
export function rollTier(r = Math.random()) {
  if (r < 0.4) return 'scout';
  if (r < 0.7) return 'raider';
  if (r < 0.9) return 'warship';
  return 'dreadnought';
}

// Older saved enemies have no tier: give them a stable one from their id, so it never changes between loads.
export function tierOf(enemy) {
  if (enemy?.tier && TIERS[enemy.tier]) return enemy.tier;
  const id = String(enemy?.id || '');
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return rollTier((h % 1000) / 1000);
}

export function tierInfo(id) {
  return TIERS[id] || TIERS.scout;
}

