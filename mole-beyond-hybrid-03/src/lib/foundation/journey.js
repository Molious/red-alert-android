// Pure live journey transitions. The mission engine owns the atomic write.
export const JOURNEY_PHASES=new Set(['awaiting_destination','resolving_destination','route_ready','launching','navigating','recalculating','signal_lost','arrived','cancelled']);
const types=new Set(['scan','salvage','contact','combat','repair']);
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
  case 'live.resolve':active();if(j.completedEventIds.includes(c.eventId))return s;if(!j.activeEvent||j.activeEvent.id!==c.eventId)throw Error('No matching encounter');{const event=j.activeEvent;const actions={scan:['scan','delegate'],salvage:['collect','delegate'],contact:['acknowledge','delegate'],combat:['defend','evade','delegate'],repair:['repair','delegate']}[event.type];if(!actions.includes(c.action))throw Error('Invalid encounter action');const reward=['salvage','combat'].includes(event.type)?10:0;if(reward)award(s,event.id,reward);j.shields=event.type==='combat'?Math.max(0,j.shields-10):event.type==='repair'?100:j.shields;j.completedEventIds.push(event.id);j.activeEvent=null;}break;
  case 'live.arrive':if(j.arrivalAwarded)return s;if(j.phase!=='navigating'||!j.arrivalConfirmed)throw Error('Arrival not confirmed');award(s,j.id,100);j.arrivalAwarded=true;j.activeEvent=null;j.phase='arrived';break;
  case 'live.cancel':if(j.phase==='arrived')throw Error('Journey already arrived');j.phase='cancelled';j.activeEvent=null;break;
  default:throw Error('Unknown live command');
 }
 validateJourney(j);return s;
}
