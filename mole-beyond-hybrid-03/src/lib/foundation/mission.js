import {createCombat,stepCombat} from './red-alert/combat.js';
import {characterById,characterMods} from './red-alert/characters.js';
// Standalone simulator state. One snapshot contains mission, reward ledger and story.
// This is device-local persistence, not a substitute for server-side transactions.
export const SAVE_KEY = 'mole-beyond:foundation:v1';
export function validPlayer(p){return !!p && ['human','reptilian','insectoid','light-being'].includes(p.species)&&['male','female'].includes(p.gender)&&['military','support','explorer'].includes(p.occupation);}
const paths = new Set(['humanitarian', 'discreet', 'standard']);
const statuses = new Set(['offered', 'accepted', 'en_route', 'arrived', 'complete']);
const copy = value => structuredClone(value);
function validateMission(m) {
  if (!m || typeof m.id !== 'string' || !m.id.trim() || typeof m.title !== 'string' || !m.title.trim() || typeof m.destination !== 'string' || !m.destination.trim()) throw Error('Invalid mission');
  if (m.distanceKm !== undefined && (!Number.isFinite(m.distanceKm) || m.distanceKm <= 0 || m.distanceKm > 1000)) throw Error('Invalid route distance');
  if (m.travelledKm !== undefined && (!Number.isFinite(m.travelledKm) || m.travelledKm < 0 || m.travelledKm > (m.distanceKm ?? 0))) throw Error('Invalid travelled distance');
  if (!Number.isSafeInteger(m.reward) || m.reward < 0 || m.reward > 1000000) throw Error('Invalid reward');
}
function validateSave(s) {
  if (!s || s.version !== 1 || !Number.isSafeInteger(s.revision) || s.revision < 0 || !Number.isSafeInteger(s.credits) || s.credits < 0 || !Array.isArray(s.ledger) || !paths.has(s.story?.path)) throw Error('Invalid save');
  if (s.player != null && !validPlayer(s.player)) throw Error('Invalid player profile');
  if (s.mission) { validateMission(s.mission); if (!statuses.has(s.mission.status)) throw Error('Invalid save status'); }
  const seen = new Set(); let total = 0;
  for (const row of s.ledger) {
    if (typeof row.missionId !== 'string' || seen.has(row.missionId) || !Number.isSafeInteger(row.amount) || row.amount < 0) throw Error('Invalid save ledger');
    seen.add(row.missionId); total += row.amount;
  }
  if (total !== s.credits || (s.mission?.status === 'complete' && !seen.has(s.mission.id))) throw Error('Invalid save balance');
  return s;
}
export function createMissionEngine({ storage, key = SAVE_KEY } = {}) {
  if (!storage?.getItem || !storage?.setItem) throw Error('Save storage is required');
  let persisted = storage.getItem(key);
  let state;
  try { state = persisted === null ? { version: 1, revision: 0, credits: 0, mission: null, ledger: [], story: { path: 'standard' } } : validateSave(JSON.parse(persisted)); }
  catch { throw Error('Cannot load save. Existing data has been preserved.'); }
  state.crew ??= 'vex';
  state.ship ??= 'standard';
  state.combat ??= null;
  return {
    snapshot: () => copy(state),
    dispatch(command) {
      // Detect stale tabs sequentially. Concurrent multi-device saves require a server adapter.
      if (storage.getItem(key) !== persisted) throw Error('Save changed in another session. Reload before continuing.');
      const next = copy(state); const m = next.mission;
      switch (command.type) {
        case 'player':
          if(m?.status==='en_route')throw Error('Finish the current route before changing player.');
          if(!validPlayer(command.player))throw Error('Invalid player profile');
          if(command.player.name !== undefined && (typeof command.player.name !== 'string' || !command.player.name.trim() || command.player.name.trim().length>32))throw Error('Enter a character name of 1–32 characters');
          next.player={...(command.player.name !== undefined ? {name:command.player.name.trim()} : {}),species:command.player.species,gender:command.player.gender,occupation:command.player.occupation};break;
        case 'ship': {
          if(m?.status === 'en_route')throw Error('Ship selection requires a parked briefing');
          const required={standard:0,interceptor:3,sovereign:6}[command.id];
          if(required === undefined || next.ledger.length<required)throw Error('Ship locked');
          next.ship=command.id;break;
        }
        case 'crew':
          if (m?.status === 'en_route') throw Error('Crew selection requires a parked briefing');
          if (!characterById(command.id)) throw Error('Unknown crew member');
          next.crew = command.id; break;
        case 'offer':
          validateMission(command.mission);
          if (m && m.status !== 'complete') throw Error('Invalid transition: finish the current mission');
          if (next.ledger.some(row => row.missionId === command.mission.id)) throw Error('Mission already rewarded');
          next.mission = { catalogId: command.mission.catalogId ?? null, id: command.mission.id, title: command.mission.title, destination: command.mission.destination, reward: command.mission.reward, status: 'offered', ...(command.mission.distanceKm !== undefined ? {distanceKm:command.mission.distanceKm, travelledKm:0} : {}) };
          break;
        case 'choose':
          if (!m || !['offered', 'accepted'].includes(m.status)) throw Error('Invalid transition: choices require a parked briefing');
          if (!paths.has(command.choice)) throw Error('Invalid story choice');
          next.story.path = command.choice; break;
        case 'travel':
          if (m?.status !== 'en_route' || m.distanceKm === undefined) throw Error('Invalid transition: no active route');
          if (!Number.isFinite(command.distanceKm) || command.distanceKm < 0) throw Error('Invalid travel distance');
          if (command.speedKmh !== undefined) {
            if (!Number.isFinite(command.speedKmh) || command.speedKmh < 0 || command.speedKmh > 130) throw Error('Invalid simulated speed');
            const seconds = command.seconds ?? 1;
            if (!Number.isInteger(seconds) || seconds < 1 || seconds > 20) throw Error('Invalid simulation duration');
            for(let i=0;i<seconds;i++) next.combat=stepCombat(next.combat || createCombat({mods:characterMods(next.crew),maxShields:next.ship==='sovereign'?150:next.ship==='interceptor'?120:100}),{mph:command.speedKmh/1.609344,dt:1}).state;
          }
          m.travelledKm = Math.min(m.distanceKm, (m.travelledKm || 0) + command.distanceKm); break;
        case 'accept': case 'depart': case 'arrive': {
          const transitions = { accept: ['offered','accepted'], depart: ['accepted','en_route'], arrive: ['en_route','arrived'] };
          const [from,to] = transitions[command.type];
          if (command.type === 'arrive' && m?.distanceKm !== undefined && m.travelledKm < m.distanceKm) throw Error('Complete the route before arrival');
          if (m?.status !== from) throw Error('Invalid transition');
          m.status = to;
          if(command.type === 'depart') {next.combat=createCombat({mods:characterMods(next.crew),maxShields:next.ship==='sovereign'?150:next.ship==='interceptor'?120:100});next.combat.lastHarshAt=-1000000;next.combat.speedWarnAt=-1000000;}
          break;
        }
        case 'complete':
          if (m?.status === 'complete') return copy(state);
          if (m?.status !== 'arrived') throw Error('Invalid transition: arrive before completing');
          if (!next.ledger.some(row => row.missionId === m.id)) { next.ledger.push({missionId:m.id, amount:m.reward}); next.credits += m.reward; }
          m.status = 'complete'; break;
        default: throw Error('Unknown mission command');
      }
      next.revision++;
      validateSave(next);
      const encoded = JSON.stringify(next);
      storage.setItem(key, encoded); // Publish in memory only after a successful save.
      persisted = encoded; state = next;
      return copy(state);
    },
  };
}

