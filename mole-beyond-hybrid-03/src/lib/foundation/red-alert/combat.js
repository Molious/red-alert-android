// Real-drive combat. Pure rules: one step per second of driving in, the new
// state and whatever happened out. The hook feeds it GPS speed; the showcase and
// the tests feed it made-up seconds. Nothing here touches the screen.
//
// The rule the whole system is built on: calm driving wins fights.
//   - Steady, smooth driving charges the weapons array on the current target. At
//     100% the lock takes hold and the round fires on its own.
//   - Several enemies can be on the glass at once (up to MAX_ON_GLASS). Each one
//     is its own target with its own tier, hit points and reward, and each one
//     fires back. Their shots land on the shields; smooth driving makes them
//     miss more often, and while cloaked they cannot see you to shoot at all.
//   - Waiting at a light or in traffic pauses the fight. Stopping is never punished.
//   - Hard braking, harsh acceleration and speeding drain shields and bleed charge.
//     Run the shields flat and the whole group escapes.
//   - Speed itself never helps: there is no bonus anywhere for going faster.
//   - A sector's boss only shows up once its regular ships are gone.

import { TIERS, BOSS_NAMES, tierOf, tierInfo } from './tiers.js';
import { NEUTRAL } from './characters.js';

export const FACTIONS = [
  { name: 'Insectoid', sector: 'epsilon', threat: 1, lockSec: 45, elite: 'Hive Queen' },
  { name: 'Reptilian', sector: 'gamma', threat: 2, lockSec: 60, elite: 'Warlord Kaav' },
  { name: 'Race of Light', sector: 'theta', threat: 3, lockSec: 75, elite: 'Prism Leviathan' },
];

// The practice target when there is no sector roster to fight.
export const TRAINING_DRONE = { name: 'Training Drone', sector: 'alpha', threat: 0, lockSec: 22, elite: null };

export const CONTACT_KINDS = {
  standard: { parts: 1 },
  elite: { parts: 5 },
};

// How many enemies can share the glass.
export const MAX_ON_GLASS = 3;

export const RULES = {
  movingMph: 8 / 1.609344, // below 8 km/h the car is stopped: the fight pauses
  smoothAccel: 2.0, // mph per second; a gentler change than this is smooth driving (tightened so a roundabout shows)
  harshAccel: 5, // mph per second; ~0.22 g, a firm brake, hard launch or quick roundabout
  speedingMph: 112 / 1.609344, // over 110 km/h, the highest posted Australian limit, with a little margin
  harshShieldHit: 15,
  harshChargeLoss: 12,
  speedingShieldPerSec: 2,
  harshCooldownSec: 4, // one hard brake is one hit, not one per GPS fix
  warmupSec: 6, // GPS settles after a drive starts; no harsh calls before this
  firstContactSec: 30, // moving seconds before the first contact
  hotContactSec: 20, // in a hostile or critical sector a contact comes this often instead
  nextContactSec: [40, 80], // moving seconds between a resolution and the next contact
  lockHoldSec: 10, // seconds the lock holds before the round fires
  shieldRegenPerSec: 0.5, // between contacts, while driving smoothly
  reinforceSec: 8, // seconds between new ships joining a fight already on the glass
  enemyHitSmooth: 0.55, // chance an enemy shot lands while you are driving smoothly
  enemyHitRough: 0.85, // ... and while you are not
};

// A hit this close to finished counts as the kill, so a pilot whose damage is a little under 1 still
// takes a 1-hit-point ship down in one shot.
const FINISH_EPS = 0.2;

export function createCombat({ maxShields = 100, chargeRate = 1, seed = 1, shieldCharges = 0, mods = NEUTRAL } = {}) {
  const m = { ...NEUTRAL, ...(mods || {}) };
  const shieldsMax = Math.round(maxShields * m.maxShields);
  return {
    mods: m,
    maxShields: shieldsMax,
    chargeRate: chargeRate / (m.lock || 1),
    shields: shieldsMax,
    cracks: 0, // windscreen cracks from enemy hits; repaired when the shields are back to full
    shieldCharges, // banked shield cells from pickups, auto-deployed on shield failure
    phase: 'patrol', // patrol | contact | locked
    contact: null,
    charge: 0,
    lockedFor: 0,
    nextContactAt: RULES.firstContactSec,
    lastResolveAt: 0,
    lastReinforceAt: 0,
    lastMph: null,
    recentMph: [],
    lastHarshAt: -Infinity,
    speedWarnAt: -Infinity,
    movingSec: 0,
    calmSec: 0,
    harshEvents: 0,
    speedingSec: 0,
    hitsTaken: 0,
    splashes: [],
    escapes: [],
    cleared: [],
    waveIndex: 0,
    seed,
  };
}

// ---- the group on the glass ------------------------------------------------

function member(s, enemy, slot) {
  const tier = enemy.tier && TIERS[enemy.tier] ? enemy.tier : tierOf(enemy);
  const t = tierInfo(tier);
  const faction = enemy.faction || TRAINING_DRONE.name;
  const label = tier === 'boss' ? (BOSS_NAMES[faction] || `${faction} Boss`) : `${faction} ${t.name}`;
  return {
    id: enemy.id || `m-${s.waveIndex}-${slot}-${s.movingSec}`,
    enemy: enemy.id ? enemy : null,
    faction,
    tier,
    tierName: t.name,
    label,
    hp: t.hp,
    maxHp: t.hp,
    reward: t.reward,
    fireEvery: t.fireEvery,
    damage: t.damage,
    lockSec: t.lockSec,
    scale: t.scale,
    kind: tier === 'boss' ? 'elite' : 'standard',
    // First shot comes a little after arrival, staggered so they don't all fire together.
    nextFireAt: s.movingSec + 5 + slot * 2 + t.fireEvery * 0.4,
    firedSeq: 0,
    hitSeq: 0,
    slot,
  };
}

// The contact's top-level fields mirror the current target, so everything that reads
// contact.label / name / kind / partsLeft keeps working with a group on the glass.
function refresh(contact) {
  const target = contact.group.find((m) => m.id === contact.targetId) || contact.group[0];
  contact.targetId = target?.id || null;
  if (!target) return contact;
  contact.name = target.faction;
  contact.label = target.label;
  contact.tier = target.tier;
  contact.kind = target.kind;
  contact.parts = target.maxHp;
  contact.partsLeft = target.hp;
  contact.lockSec = target.lockSec;
  contact.reward = target.reward;
  contact.enemies = target.enemy ? [target.enemy] : [];
  return contact;
}

const freeSlot = (group) => [0, 1, 2].find((n) => !group.some((m) => m.slot === n)) ?? group.length;

// The next enemy from the sector roster to join: regular ships first, the boss only
// once no regular ship is left.
function nextFromPool(pool, group) {
  if (!pool) return null;
  const inGroup = new Set(group.map((m) => m.id));
  const live = pool.filter((e) => !e.defeated && !inGroup.has(e.id));
  const regular = live.find((e) => tierOf(e) !== 'boss');
  if (regular) return regular;
  // The boss waits until every regular ship is down, including the ones still on the glass.
  if (group.some((m) => m.tier !== 'boss')) return null;
  return live.find((e) => tierOf(e) === 'boss') || null;
}

function newContact(s, enemyPool) {
  const group = [];
  if (enemyPool) {
    // Open with up to two ships; more join while the fight is on.
    for (let i = 0; i < 2; i += 1) {
      const e = nextFromPool(enemyPool, group);
      if (!e) break;
      group.push(member(s, e, freeSlot(group)));
      if (tierOf(e) === 'boss') break;
    }
  } else {
    group.push(member(s, { faction: TRAINING_DRONE.name, tier: 'scout' }, 0));
  }
  if (!group.length) return null;
  return refresh({ group, targetId: group[0].id, startedAt: s.movingSec, called50: false });
}

function resolve(s) {
  s.phase = 'patrol';
  s.contact = null;
  s.charge = 0;
  s.lastResolveAt = s.movingSec;
  s.nextContactAt = s.movingSec + nextGap(s);
}

// A small deterministic random, so a replayed drive replays the same fight.
function rand(state) {
  const x = Math.sin(state.seed++) * 10000;
  return x - Math.floor(x);
}

// Damage the current target. Returns 'part' | 'splash' | 'none'.
function damageTarget(s, events, amount = 1) {
  const c = s.contact;
  if (!c) return 'none';
  const group = c.group.map((m) => ({ ...m }));
  const target = group.find((m) => m.id === c.targetId);
  if (!target) return 'none';
  const m = s.mods || NEUTRAL;
  let dmg = Math.max(0.1, amount) * (m.damage || 1);
  if (target.hp >= target.maxHp && m.firstHit > 1) dmg *= m.firstHit;
  target.hp = Math.max(0, Math.round((target.hp - dmg) * 100) / 100);
  if (target.hp <= FINISH_EPS) target.hp = 0;
  target.hitSeq += 1;
  if (target.hp > 0) {
    s.contact = refresh({ ...c, group, called50: false });
    s.phase = 'contact';
    s.charge = 0;
    events.push({ type: 'partDown', contact: s.contact, member: target });
    return 'part';
  }
  const remaining = group.filter((m) => m.id !== target.id);
  const splash = { faction: target.faction, kind: target.kind, tier: target.tier, threat: target.reward, reward: target.reward, label: target.label, at: s.movingSec };
  s.splashes = [...s.splashes, splash];
  const asContact = { ...c, name: target.faction, label: target.label, kind: target.kind, tier: target.tier, enemies: target.enemy ? [target.enemy] : [], reward: target.reward };
  events.push({ type: 'splash', contact: asContact, member: target, reward: target.reward, tier: target.tier, count: s.splashes.length });
  if (!remaining.length) {
    resolve(s);
    return 'splash';
  }
  // Next target: the most dangerous ship left.
  const next = [...remaining].sort((a, b) => b.damage / b.fireEvery - a.damage / a.fireEvery)[0];
  s.contact = refresh({ ...c, group: remaining, targetId: next.id, called50: false });
  s.phase = 'contact';
  s.charge = 0;
  events.push({ type: 'retarget', contact: s.contact });
  return 'splash';
}

export function threatTier(state) {
  if (state.shields / state.maxShields < 0.3) return 'critical';
  if (state.phase === 'locked') return 'hostile';
  if (state.phase === 'contact') {
    if (state.contact?.kind === 'elite' || (state.contact?.group?.length || 0) > 1) return 'hostile';
    return state.charge >= 60 ? 'hostile' : 'alert';
  }
  return 'calm';
}

/**
 * One second of driving. `mph` is the GPS speed, `dt` the seconds since the last
 * step (clamped), `cloaked` hides the ship from enemy fire. Returns
 * { state, events } where events are plain objects the UI and SEXTANT react to:
 * contact, reinforce, charge50, harsh, speeding, shieldsLow, enemyFire, locked,
 * partDown, splash, retarget, escaped, shieldRestore.
 */
export function stepCombat(prev, { mph = 0, dt = 1, hot = false, enemyPool, cloaked = false } = {}) {
  const s = { ...prev, splashes: prev.splashes, escapes: prev.escapes };
  const events = [];
  const step = Math.max(0.2, Math.min(dt, 3));

  // A median of the last three readings removes a lone GPS spike but keeps a real brake.
  s.recentMph = [...prev.recentMph, mph].slice(-3);
  mph = median(s.recentMph);
  const accel = s.lastMph == null ? 0 : (mph - s.lastMph) / step;
  s.lastMph = mph;

  const moving = mph >= RULES.movingMph;
  const speeding = mph > RULES.speedingMph;
  const harsh =
    Math.abs(accel) >= RULES.harshAccel &&
    s.movingSec >= RULES.warmupSec &&
    s.movingSec - s.lastHarshAt >= RULES.harshCooldownSec;
  const smooth = moving && !speeding && Math.abs(accel) < RULES.smoothAccel;

  if (moving) s.movingSec += step;
  if (smooth) s.calmSec += step;

  if (harsh) {
    s.lastHarshAt = s.movingSec;
    s.harshEvents += 1;
    const kind = s.phase !== 'patrol' ? s.contact?.kind : null;
    const hit = (kind === 'elite' ? RULES.harshShieldHit * 2 : RULES.harshShieldHit) * ((s.mods || NEUTRAL).shieldTaken || 1);
    s.shields = Math.max(0, s.shields - hit);
    s.charge = Math.max(0, s.charge - RULES.harshChargeLoss);
    events.push({ type: 'harsh', braking: accel < 0, kind });
  }
  if (speeding) {
    s.speedingSec += step;
    s.shields = Math.max(0, s.shields - RULES.speedingShieldPerSec * step);
    if (s.movingSec - s.speedWarnAt >= 20) {
      s.speedWarnAt = s.movingSec;
      events.push({ type: 'speeding' });
    }
  }

  if (s.phase === 'patrol') {
    if (smooth) s.shields = Math.min(s.maxShields, s.shields + RULES.shieldRegenPerSec * step);
    // Back to full shields: the windscreen is repaired.
    if (s.cracks && s.shields >= s.maxShields) { s.cracks = 0; events.push({ type: 'repaired' }); }
    const due = s.movingSec >= s.nextContactAt || (hot && s.movingSec >= s.lastResolveAt + RULES.hotContactSec);
    if (due && (enemyPool === undefined || enemyPool.some((e) => !e.defeated))) {
      const c = newContact(s, enemyPool);
      if (c) {
        s.contact = c;
        s.waveIndex += 1;
        s.phase = 'contact';
        s.charge = 0;
        s.lastReinforceAt = s.movingSec;
        events.push({ type: 'contact', contact: s.contact });
      }
    }
  } else if (s.contact) {
    // More ships join a fight already under way, up to the glass limit.
    if (enemyPool && s.contact.group.length < MAX_ON_GLASS && s.movingSec - s.lastReinforceAt >= RULES.reinforceSec) {
      const e = nextFromPool(enemyPool, s.contact.group);
      if (e) {
        const m = member(s, e, freeSlot(s.contact.group));
        s.contact = refresh({ ...s.contact, group: [...s.contact.group, m] });
        s.lastReinforceAt = s.movingSec;
        events.push({ type: 'reinforce', contact: s.contact, member: m });
      }
    }

    // They shoot back. Only while you're moving (a stop pauses the fight), never while cloaked.
    if (moving) {
      let group = s.contact.group;
      let changed = false;
      for (let i = 0; i < group.length; i += 1) {
        const m = group[i];
        if (s.movingSec < m.nextFireAt) continue;
        const nextFireAt = s.movingSec + m.fireEvery * (0.85 + 0.3 * rand(s));
        if (cloaked) {
          group = group.map((x, j) => (j === i ? { ...x, nextFireAt } : x));
          changed = true;
          continue;
        }
        const mm = s.mods || NEUTRAL;
        const landed = rand(s) < (smooth ? RULES.enemyHitSmooth : RULES.enemyHitRough) * (mm.enemyHit || 1);
        group = group.map((x, j) => (j === i ? { ...x, nextFireAt, firedSeq: x.firedSeq + 1 } : x));
        changed = true;
        if (landed) {
          const before = s.shields;
          const taken = Math.round(m.damage * (mm.shieldTaken || 1) * 10) / 10;
          s.shields = Math.max(0, s.shields - taken);
          s.hitsTaken += 1;
          s.cracks = Math.min(12, (s.cracks || 0) + 1);
          events.push({ type: 'enemyFire', hit: true, damage: taken, member: m });
          if (s.shields / s.maxShields < 0.3 && before / s.maxShields >= 0.3) events.push({ type: 'shieldsLow' });
        } else {
          events.push({ type: 'enemyFire', hit: false, damage: 0, member: m });
        }
      }
      if (changed) s.contact = refresh({ ...s.contact, group });
    }
    if ((harsh || speeding) && s.shields / s.maxShields < 0.3 && prev.shields / prev.maxShields >= 0.3) {
      events.push({ type: 'shieldsLow' });
    }

    if (s.shields <= 0) {
      if (s.shieldCharges > 0) {
        s.shieldCharges -= 1;
        s.shields = s.maxShields;
        s.cracks = 0;
        events.push({ type: 'shieldRestore', contact: s.contact });
      } else {
        s.escapes = [...s.escapes, { faction: s.contact.name, kind: s.contact.kind, count: s.contact.group.length, at: s.movingSec }];
        events.push({ type: 'escaped', contact: s.contact });
        resolve(s);
        s.shields = Math.round(s.maxShields * 0.5);
      }
    } else if (s.phase === 'contact') {
      if (smooth) {
        const before = s.charge;
        s.charge = Math.min(100, s.charge + (100 / (s.contact.lockSec || 30)) * s.chargeRate * step);
        if (before < 50 && s.charge >= 50 && !s.contact.called50) {
          s.contact = { ...s.contact, called50: true };
          events.push({ type: 'charge50', contact: s.contact });
        }
      }
      if (s.charge >= 100) {
        s.phase = 'locked';
        s.lockedFor = 0;
        events.push({ type: 'locked', contact: s.contact });
      }
    } else if (s.phase === 'locked') {
      s.lockedFor += step;
      if (s.lockedFor >= RULES.lockHoldSec) damageTarget(s, events, 1);
    }
  }

  return { state: s, events };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function nextGap(s) {
  const [lo, hi] = RULES.nextContactSec;
  return Math.round(lo + (hi - lo) * rand(s));
}

// The drive's combat record, as it is stored and rewarded.
export function combatSummary(s) {
  return {
    splashes: s.splashes.length,
    escapes: s.escapes.length,
    elites: s.splashes.filter((x) => x.kind === 'elite').length,
    bosses: s.splashes.filter((x) => x.tier === 'boss').length,
    squadrons: 0,
    minefields: s.cleared.length,
    splash_factions: s.splashes.map((x) => x.faction),
    splash_threat: s.splashes.reduce((n, x) => n + (x.threat || 0), 0),
    bounty: s.splashes.reduce((n, x) => n + (x.reward || 0), 0),
    hits_taken: s.hitsTaken || 0,
    harsh_events: s.harshEvents,
    speeding_sec: Math.round(s.speedingSec),
    calm_pct: s.movingSec > 0 ? Math.round((s.calmSec / s.movingSec) * 100) : 0,
  };
}

/**
 * The pilot's own shot at the current target. `damage` comes from the weapon
 * (missiles hit harder). Returns { state, events, hit: 'none' | 'part' | 'splash' }.
 */
export function paintHit(prev, damage = 1) {
  const s = { ...prev, splashes: prev.splashes, escapes: prev.escapes };
  const events = [];
  if (!prev.contact || (prev.phase !== 'contact' && prev.phase !== 'locked')) return { state: s, events, hit: 'none' };
  const hit = damageTarget(s, events, damage);
  return { state: s, events, hit };
}

/** Point the array at a particular ship on the glass. */
export function selectTarget(prev, id) {
  const c = prev.contact;
  if (!c || !c.group.some((m) => m.id === id) || c.targetId === id) return prev;
  return { ...prev, contact: refresh({ ...c, targetId: id, called50: false }), phase: 'contact', charge: 0, lockedFor: 0 };
}

/** Step the target to the next ship on the glass. */
export function cycleTarget(prev) {
  const c = prev.contact;
  if (!c || c.group.length < 2) return prev;
  const i = c.group.findIndex((m) => m.id === c.targetId);
  return selectTarget(prev, c.group[(i + 1) % c.group.length].id);
}

