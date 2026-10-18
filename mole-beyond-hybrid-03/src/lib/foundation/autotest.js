import {makeOffer} from './stories.js';
const KEY='mole-hybrid-test-reports-v1';
// Deterministic simulator only: no sensors, real deliveries or cloud rewards.
export function createTestSession({engine,storage,now=Date.now,onChange=()=>{},onStop=()=>{}}){
 let running=false, report=null, ticks=0;
 const copy=()=>report?JSON.parse(JSON.stringify(report)):null;
 function save(){
  let history;try{history=JSON.parse(storage.getItem(KEY)||'[]');}catch{throw Error('Test history is unreadable; export or clear it before starting.');}
  if(!Array.isArray(history))throw Error('Test history is unreadable.');
  history=history.filter(r=>r.id!==report.id).slice(-9);history.push(copy());
  storage.setItem(KEY,JSON.stringify(history));
 }
 function event(type){if(report.events.length<199)report.events.push({at:now(),type});}
 function stop(reason='stopped'){
  if(!running)return;running=false;report.outcome=reason;report.endedAt=now();event(reason);
  try{save();}finally{onStop(reason);onChange(copy());}
 }
 function start(){
  if(running)return;report={id:`${now()}-${Math.random().toString(36).slice(2)}`,startedAt:now(),outcome:'running',mode:'parked-simulator',events:[]};
  event('start');save();ticks=0;running=true;onChange(copy());
 }
 function tick(){
  if(!running)return;
  try{
   if(++ticks>300){stop('timeout');return;}
   const m=engine.snapshot().mission;let action;
   if(!m||m.status==='complete')action={type:'offer',mission:makeOffer(engine.snapshot().ledger.length,`test-${report.id}`)};
   else if(m.status==='offered')action={type:'accept'};
   else if(m.status==='accepted')action={type:'depart'};
   else if(m.status==='en_route')action=m.travelledKm>=m.distanceKm?{type:'arrive'}:{type:'travel',distanceKm:48/3600*20,speedKmh:48,seconds:20};
   else if(m.status==='arrived')action={type:'complete'};
   if(!action)throw Error('Unsupported mission state');
   engine.dispatch(action);if(action.type!=='travel')event(action.type);
   save();onChange(copy());if(action.type==='complete')stop('completed');
  }catch(error){running=false;report.outcome='error';report.endedAt=now();event('error');try{save();}catch{}onStop('error');onChange(copy());}
 }
 function command(text){if(String(text).trim().toLowerCase().replace(/[.!?]+$/,'')!=='stop test')return false;stop('voice-stop');return true;}
 return {start,tick,stop,command,report:copy,get running(){return running;}};
}

