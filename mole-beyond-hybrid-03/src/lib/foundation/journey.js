// Pure live journey transitions. The mission engine owns the atomic write.
import {ENCOUNTER_TYPES,encounterOutcome} from './journey-events.js';
import {addCargo,removeCargo,stationForDestination} from './economy.js';
import {deliverContract} from './contracts.js';
export const JOURNEY_PHASES=new Set(['awaiting_destination','resolving_destination','route_ready','launching','navigating','recalculating','signal_lost','arrived','cancelled']);
const types=ENCOUNTER_TYPES;
export function migrateSave(saved){if(saved.version===2)return structuredClone(saved);return {...structuredClone(saved),version:2,legacyMission:structuredClone(saved.mission),mission:null,journey:null};}
export function validateJourney(j){
 if(j===null||j===undefined)return;
 if(!j||typeof j.id!=='string'||!j.id||!JOURNEY_PHASES.has(j.phase)||!Number.isSafeInteger(j.routeRevision)||j.routeRevision<0||!Array.isArray(j.completedEventIds)||new Set(j.completedEventIds).size!==j.completedEventIds.length||j.completedEventIds.some(x=>typeof x!=='string')||!Number.isFinite(j.verifiedMeters)||j.verifiedMeters<0||!Number.isFinite(j.remainingMeters)||j.remainingMeters<0||typeof j.arrivalAwarded!=='boolean')throw Error('Invalid journey save');
 validateDestination(j.destination);
 if(j.activeEvent&&(!types.has(j.activeEvent.type)||j.activeEvent.id!==`${j.id}:${j.activeEvent.type}`))throw Error('Invalid saved event');
}
function validateDestination(d){if(!d||typeof d.label!=='string'||!d.label.trim()||d.label.length>200||!Number.isFinite(d.lat)||Math.abs(d.lat)>90||!Number.isFinite(d.lng)||Math.abs(d.lng)>180)throw Error('Invalid destination');}
function award(s,id,amount){if(s.ledger.some(x=>x.missionId===id))return;s.ledger.push({missionId:id,amount});s.credits+=amount;}
export function reduceJourney(state,c){
 const s=migrateSave(state);let j=s.journey;if(c.type==='live.save')return s;
 if(c.type==='live.destination'){
  validateDestination(c.destination);if(typeof c.id!=='string'||!c.id||c.id.length>100||s.ledger.some(x=>x.missionId===c.id))throw Error('Invalid journey ID');
  if(j&&!['arrived','cancelled'].includes(j.phase))throw Error('Cancel current journey first');
  s.journey={id:c.id,phase:'resolving_destination',destination:{...c.destination},routeRevision:0,verifiedMeters:0,remainingMeters:0,completedEventIds:[],activeEvent:null,arrivalAwarded:false,arrivalConfirmed:false,shields:100};return s;
 }
 if(!j||j.id!==c.id)throw Error('Wrong journey');
 const active=()=>{if(['arrived','cancelled'].includes(j.phase))throw Error('Journey is finished');};
 switch(c.type){
  case 'live.route':active();if(!Number.isSafeInteger(c.revision)||c.revision<=j.routeRevision||!Number.isFinite(c.distance)||c.distance<0)throw Error('Invalid route revision');j.routeRevision=c.revision;j.remainingMeters=c.distance;j.arrivalConfirmed=false;j.phase=c.resuming?'navigating':'route_ready';break;
  case 'live.save':break;
  case 'live.launch':if(j.phase!=='route_ready')throw Error('Route not ready');j.phase='launching';j.launched=true;break;
  case 'live.navigate':if(!['launching','route_ready','signal_lost'].includes(j.phase))throw Error('Cannot navigate');j.phase='navigating';break;
  case 'live.phase':active();if(!['recalculating','signal_lost','navigating'].includes(c.phase))throw Error('Invalid phase');j.phase=c.phase;j.arrivalConfirmed=false;break;
  case 'live.progress':active();if(j.phase!=='navigating'||c.revision!==j.routeRevision||!Number.isFinite(c.verifiedMeters)||c.verifiedMeters<j.verifiedMeters||!Number.isFinite(c.remainingMeters)||c.remainingMeters<0)throw Error('Invalid route progress');j.verifiedMeters=c.verifiedMeters;j.remainingMeters=c.remainingMeters;j.arrivalConfirmed=c.arrivalConfirmed===true;break;
  case 'live.event':active();if(j.phase!=='navigating'||!c.event||!types.has(c.event.type)||c.event.id!==`${j.id}:${c.event.type}`)throw Error('Invalid encounter');if(!j.completedEventIds.includes(c.event.id)&&!j.activeEvent)j.activeEvent={...c.event};break;
  case 'live.resolve':active();if(j.completedEventIds.includes(c.eventId))return s;if(!j.activeEvent||j.activeEvent.id!==c.eventId)throw Error('No matching encounter');{const event=j.activeEvent;let o;try{o=encounterOutcome(event,c.action,s);}catch{throw Error('Invalid encounter action');}
   if(o.reward>0)award(s,event.id,o.reward);else if(o.reward<0&&!s.ledger.some(x=>x.missionId===event.id)){s.ledger.push({missionId:event.id,amount:o.reward,kind:'trade'});s.credits+=o.reward;}
   for(const [id,n] of Object.entries(o.cargo))if(n>0)addCargo(s,id,n);else if(n<0)removeCargo(s,id,-n);
   j.shields=o.shields;if(event.type==='story'&&s.contracts?.active&&s.contracts.active.id===event.contractId)s.contracts.active.beats=[...s.contracts.active.beats,'mid'];
   j.completedEventIds.push(event.id);j.activeEvent=null;}break;
  case 'live.arrive':if(j.arrivalAwarded)return s;if(j.phase!=='navigating'||!j.arrivalConfirmed)throw Error('Arrival not confirmed');award(s,j.id,100);{const delivered=deliverContract(s);if(delivered)award(s,'contract:'+delivered.id,delivered.reward);j.deliveredContract=delivered?delivered.id:null;s.station=delivered?.station||stationForDestination(j.destination);}j.arrivalAwarded=true;j.activeEvent=null;j.phase='arrived';break;
  case 'live.cancel':if(j.phase==='arrived')throw Error('Journey already arrived');j.phase='cancelled';j.activeEvent=null;break;
  default:throw Error('Unknown live command');
 }
 validateJourney(j);return s;
}
