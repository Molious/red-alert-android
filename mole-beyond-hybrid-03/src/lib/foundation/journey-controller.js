import {validFix} from './navigation-core.js';
import {createGuidance,parkedEvidence} from './route-guidance.js';
import {nextCrewEvent,resolveCrewEvent} from './journey-events.js';
import {contractOffer,contractById} from './contracts.js';
import {STATIONS,COMMODITIES,holdFree} from './economy.js';
import {PROLOGUE,nextChatter} from './bridge-chatter.js';
import {createSafetyMeter,safetyBonus} from './safe-driving.js';
const finished=j=>!j||['arrived','cancelled'].includes(j.phase);
export function createJourneyController({engine,services,audio,now=Date.now,onChange=()=>{},onLaunch=done=>{done();return {cancel(){}}},id=()=>crypto.randomUUID()}){
 let active=false,disposed=false,fix=null,recent=[],route=null,guide=null,results=[],selected=null,status='Awaiting destination',generation=0,request=null,busy=false,cover=null,storyPaused=false,resumeNeeded=false,resumeRequested=false,lastRecalc=-Infinity,routeBase=0,lastRoadProgress=0,viewGuidance=null,signalAnnounced=false,muted=false,planning=false,lastCue='',lastSpokeAt=0,chatterGap=45000,eventAt=0,safety=null,limit=null,limitAt=-Infinity,limitPos=null,limitBusy=false,lastSafetySave=0,speedingNotedAt=-Infinity;
 const state=()=>engine.snapshot();const journey=()=>state().journey;
 const emit=()=>{if(!disposed)onChange({active,journey:journey(),player:state().player,credits:state().credits,fix:validFix(fix,now())?{...fix}:null,parked:parkedEvidence(recent,now()),route,results:[...results],selected,status,busy,storyPaused,resumeNeeded,planning,guidance:viewGuidance,muted,saveRevision:state().revision,speedLimit:limit,safety:safety?safety.snapshot().score:(journey()?.safety?.score??null),cargo:state().cargo||null,contract:state().contracts?.active?.id||null});};
 function say(text,character='WRAITH',priority='navigation',key,extra={}){lastCue=priority==='navigation'?text:lastCue;lastSpokeAt=now();if(!muted)void audio.enqueue({id:key||'line:'+now()+':'+Math.random().toString(36).slice(2,6),text,character,priority,...extra,...(priority==='navigation'?{}:{expiresAt:now()+90000})});}
 function storyFlag(extra){try{dispatch('live.story',extra);}catch{}}
 function speakScene(lines,prefix){lines.forEach(([character,text],i)=>say(text,character,'mission',prefix+':'+i));}
 function dispatch(type,extra={}){return engine.dispatch({type,id:journey()?.id,...extra});}
 function cancelRequest(){generation++;request?.abort();request=null;busy=false;}
 function cancelCover(){cover?.cancel();cover=null;}
 function lost(message='GPS signal lost. Guidance and story are paused until an accurate position returns.'){
  fix=null;recent=[];viewGuidance=null;cancelCover();audio.setStoryPaused(true);
  const j=journey();if(!finished(j)&&!j.launched)resumeNeeded=true;if(!finished(j)&&j.phase!=='signal_lost')dispatch('live.phase',{phase:'signal_lost'});
  status=message;if(!signalAnnounced){signalAnnounced=true;say(message);}emit();
 }
 async function loadRoute(resuming=false){
  const j=journey();if(!j||finished(j))return;if(!validFix(fix,now())){status='Waiting for a current GPS fix before calculating the route.';emit();return;}
  const start={...fix};cancelRequest();const token=generation,controller=new AbortController();request=controller;busy=true;status=resuming?'Recalculating road route…':'Calculating road route…';audio.setStoryPaused(true);if(resuming)dispatch('live.phase',{phase:'recalculating'});emit();
  try{const r=await services.route(start,j.destination,controller.signal);if(disposed||!active||token!==generation)return;
   const revision=journey().routeRevision+1;route=r;routeBase=journey().verifiedMeters;lastRoadProgress=0;guide=createGuidance(r,{revision});guide.update(start,start.ts);viewGuidance=fix.ts>start.ts?guide.update(fix,now()):guide.snapshot();
   dispatch('live.route',{revision,distance:r.cumulativeMeters.at(-1),resuming});resumeNeeded=false;resumeRequested=false;signalAnnounced=false;status=`${(r.distance/1000).toFixed(1)} km · about ${Math.ceil(r.duration/60)} minutes · ${resuming?'guidance resumed':'ready to launch when parked'}`;
   say(resuming?'Road route updated. '+guide.repeat():`Route ready to ${j.destination.label}. ${(r.distance/1000).toFixed(1)} kilometres. Say launch when parked.`);
  }catch(e){if(token!==generation||disposed)return;route=null;guide=null;viewGuidance=null;status='Guidance unavailable. '+(e?.message||'Check internet and retry route.');if(!finished(journey()))dispatch('live.phase',{phase:'signal_lost'});resumeNeeded=resuming;say(status);}
  finally{if(token===generation){busy=false;request=null;emit();}}
 }
 function finishLaunch(){if(journey()?.phase!=='launching')return;cancelCover();if(!validFix(fix,now())){lost();return;}dispatch('live.navigate');status='Navigating to '+journey().destination.label;say('Launch complete. '+(guide?.repeat()||'Follow the road route.'));safety=createSafetyMeter();lastSafetySave=now();lastSpokeAt=now();chatterGap=40000;if(!state().story?.prologue){speakScene(PROLOGUE,'prologue');storyFlag({prologue:true});chatterGap=150000;}const c=activeContract();if(c?.depart)say(c.depart.text,c.depart.character,'mission','contract:'+c.id+':depart');emit();}
 function refreshLimit(p){if(!services.speedLimit||limitBusy)return;const moved=limitPos?Math.hypot((p.lat-limitPos.lat)*111195,(p.lng-limitPos.lng)*111195*Math.cos(p.lat*Math.PI/180)):Infinity;if(now()-limitAt<20000&&moved<250)return;limitBusy=true;limitAt=now();limitPos={lat:p.lat,lng:p.lng};Promise.resolve(services.speedLimit(p)).then(v=>{if(Number.isFinite(v))limit=v;else if(moved>600)limit=null;}).catch(()=>{}).finally(()=>{limitBusy=false;});}
 function activeContract(){const a=state().contracts?.active;return a?contractById(a.id):null;}
 function offerContract(){const o=contractOffer(state());if(o&&o.offer)say(o.offer.text+' Say accept contract, or open the Station panel.',o.offer.character,'mission','contract:'+o.id+':offer');}
 function acceptContract(){const o=contractOffer(state());if(!o){status='A contract is already in the hold. Deliver it first.';return;}try{engine.dispatch({type:'contract.accept',id:o.id});status='Contract accepted: '+o.title+' for '+STATIONS[o.station].name+'.';say('Contract accepted. '+o.title+' is in the hold, bound for '+STATIONS[o.station].name+'. It is delivered when we reach your destination.','MAX','mission','contract:'+o.id+':accepted');}catch(e){status=e.message;say(e.message,'MAX','mission');}}
 function resolveEvent(action){if(storyPaused||viewGuidance?.turnSoon||!validFix(fix,now())||journey()?.phase!=='navigating'){status='Crew action deferred until navigation is clear.';return;}const j=journey(),event=j?.activeEvent;if(!event){status='No crew action is waiting.';return;}const outcome=resolveCrewEvent(event,action,state());dispatch('live.resolve',{eventId:event.id,action});for(const line of outcome.lines)if(!muted)void audio.enqueue({...line,expiresAt:now()+60000});status=outcome.lines[0].text;}
 const api={
  enter(){if(disposed)return;active=true;planning=true;fix=null;recent=[];audio.setStoryPaused(false);audio.holdStory?.(false);const j=journey();if(!finished(j)){resumeNeeded=true;dispatch('live.phase',{phase:'signal_lost'});status='Saved destination loaded. Resume navigation to acquire a fresh route.';say('Welcome back, Captain '+(state().player?.name||'Captain')+'. Your destination is saved. Say resume navigation when ready.');}else{resumeNeeded=false;status='Where are we heading? Enter or speak a destination.';say('Welcome aboard, Captain '+(state().player?.name||'Captain')+'. Where are we heading?');offerContract();}emit();},
  async command(action){if(disposed)return;try{
   switch(action.type){
    case 'destination':planning=true;status='Enter a street address, suburb and country, or say destination followed by the address.';break;
    case 'close-planner':planning=false;break;
    case 'search':{
     if(!active)break;cancelRequest();const token=generation;request=new AbortController();busy=true;results=[];selected=null;planning=true;status='Looking up destination…';emit();
     try{const found=await services.search(action.text,request.signal);if(token!==generation||!active||disposed)return;results=found;status='Choose an address result, then confirm the destination.';say(found.length+' destination '+(found.length===1?'match':'matches')+'. Choose an option and confirm the destination.');}
     catch(e){if(token===generation){status=e?.message||'Address lookup failed.';say(status);}}finally{if(token===generation){busy=false;request=null;emit();}}return;
    }
    case 'select':if(!Number.isSafeInteger(action.index)||!results[action.index]){status='Choose an address result first.';break;}selected=results[action.index];status='Confirm '+selected.label;say('Destination option '+(action.index+1)+': '+selected.label+'. Confirm destination to use this address.');break;
    case 'confirm':if(!selected){status='Choose an address result first.';break;}if(!finished(journey())){status='Cancel the current journey before changing destination.';break;}dispatch('live.destination',{id:id(),destination:selected});planning=false;results=[];if(!state().contracts?.active){const o=contractOffer(state());if(o&&o.units<=holdFree(state()))acceptContract();}await loadRoute(false);return;
    case 'retry':if(!finished(journey())){resumeRequested=true;await loadRoute(journey().launched===true);}else status='Choose a destination first.';return;
    case 'launch':if(journey()?.phase!=='route_ready'||!route){status='Confirm a destination and calculate a route first.';break;}if(!parkedEvidence(recent,now())){status='Launch cinematic requires three accurate, low-speed GPS fixes while parked. Unknown speed does not count as parked.';break;}dispatch('live.launch');audio.setStoryPaused(true);say('Launching. Wraith has the road route.');cover=onLaunch(finishLaunch);emit();return;
    case 'repeat':say(guide?.repeat()||lastCue||'Enter a destination to begin.');break;
    case 'recenter':status=validFix(fix,now())?'Map following your current position.':'Waiting for an accurate GPS position.';break;
    case 'pause-story':storyPaused=true;audio.setStoryPaused(true);status='Crew story paused. Directions remain on.';break;
    case 'resume-story':storyPaused=false;audio.setStoryPaused(false);audio.holdStory?.(!!viewGuidance?.turnSoon);status='Crew story resumed when navigation is clear.';break;
    case 'mute':muted=true;audio.clear();status='Audio muted. Unmute is on the dashboard.';break;
    case 'unmute':muted=false;status='Audio enabled.';say(guide?.repeat()||'Audio enabled.');break;
    case 'scan':case 'collect':case 'acknowledge':case 'defend':case 'evade':case 'repair':case 'delegate':resolveEvent(action.type);break;
    case 'accept':if(journey()?.phase==='navigating'&&journey()?.activeEvent?.type==='trader')resolveEvent('accept');else acceptContract();break;
    case 'decline':if(journey()?.activeEvent?.type==='trader')resolveEvent('decline');else status='Nothing to decline.';break;
    case 'accept-contract':acceptContract();break;
    case 'trade':{if(!finished(journey())&&!['resolving_destination','route_ready'].includes(journey().phase)){status='The market opens when we are parked.';break;}try{const next=engine.dispatch({type:'trade',op:action.op,commodity:action.commodity,units:action.units||1});const t=next.lastTrade;status=(t.op==='buy'?'Bought ':'Sold ')+t.units+' '+COMMODITIES[t.commodity].name.toLowerCase()+' for '+t.total+' credits.';}catch(e){status=e.message;}break;}
    case 'refresh':break;
    case 'save':dispatch('live.save');status='Progress saved on this device.';break;
    case 'cancel':cancelRequest();cancelCover();audio.clear();audio.holdStory?.(false);route=null;guide=null;recent=[];viewGuidance=null;if(!finished(journey()))dispatch('live.cancel');resumeNeeded=false;planning=true;status='Journey cancelled. Choose your next destination.';break;
    case 'home':if(!finished(journey())){status='Cancel the current journey before changing character.';break;}api.background();return;
    case 'resume':api.resume();return;
    default:status='Command not recognised. Use the dashboard or say repeat direction.';
   }
  }catch(e){status='Could not complete action: '+e.message;}emit();},
  fix(p){if(disposed||!active)return;try{
   if(!validFix(p,now())){lost();return;}if(fix&&p.ts<=fix.ts)return;
   fix={...p};recent.push({...p});recent=recent.slice(-4);signalAnnounced=false;
   let j=journey();if(cover&&(!Number.isFinite(p.speed)||p.speed>.5||p.accuracy>25))finishLaunch();
   if(resumeNeeded){if(resumeRequested&&!busy)void loadRoute(j?.launched===true);emit();return;}
   if(j&&!finished(j)&&j.routeRevision===0&&!busy&&!route){void loadRoute(false);emit();return;}
   if(!guide||!j||finished(j)||j.phase==='route_ready'||j.phase==='launching'){emit();return;}
   if(j.phase==='signal_lost'&&!busy)dispatch('live.phase',{phase:'navigating'});
   const g=guide.update(p,now());viewGuidance=g;
   if(!g.valid){audio.holdStory?.(true);if(g.offRoute&&!busy&&now()-lastRecalc>=8000){lastRecalc=now();say('You are off the planned route. Recalculating.');void loadRoute(true);}else{status='Position does not match the route. Waiting for a reliable fix.';}emit();return;}
   if(busy){emit();return;}
   if(journey().phase!=='navigating'){emit();return;}
   const verified=routeBase+g.progressMeters;
   if(g.progressMeters>lastRoadProgress+.5||g.arrived){dispatch('live.progress',{revision:journey().routeRevision,verifiedMeters:Math.max(journey().verifiedMeters,verified),remainingMeters:g.remainingMeters,arrivalConfirmed:g.arrived});lastRoadProgress=g.progressMeters;}
   audio.setStoryPaused(storyPaused);audio.holdStory?.(!!g.turnSoon);for(const cue of g.cues)if(!muted){lastSpokeAt=now();void audio.enqueue(cue);}
   const rating=safety?safety.update(p,limit):null;refreshLimit(p);if(safety&&now()-lastSafetySave>=30000){lastSafetySave=now();try{dispatch('live.safety',safety.snapshot());}catch{}}
   status=g.nextInstruction+' · '+Math.round(g.distanceToTurn)+' m';
   if(g.arrived){const carried=activeContract();if(safety){try{dispatch('live.safety',safety.snapshot());}catch{}}dispatch('live.arrive');cancelCover();audio.setStoryPaused(false);audio.holdStory?.(false);const done=journey().deliveredContract&&contractById(journey().deliveredContract),station=STATIONS[state().station]||STATIONS.spaceport;say('You have arrived at '+journey().destination.label+'. One hundred credits saved.');if(done&&done.arrive)say(done.arrive.text,done.arrive.character,'mission','contract:'+done.id+':arrive');else if(carried&&!done)say('The contract is still in the hold.','MAX','mission');const sf=journey().safety;if(sf)say('Flight rating '+sf.score+' out of 100. '+(sf.score>=90?'Clean flying, Captain. ':sf.score>=70?'Not bad. ':'Rough ride, Captain. ')+safetyBonus(sf.score)+' credit clean-flight bonus.','CHET','mission','safety:'+journey().id);safety=null;
    say('Docked at '+station.name+'. The market is open while we are parked. Where are we heading next?','MAX','mission','dock:'+journey().id);status='Arrived · docked at '+station.name+' · market open · choose the next destination.';planning=true;offerContract();emit();return;}
   const context={progress:journey().verifiedMeters/Math.max(1,journey().verifiedMeters+g.remainingMeters),nearTurn:g.turnSoon,guidanceReady:true,state:state(),storyPaused,moving:Number.isFinite(p.speed)&&p.speed>.5};
   const outstanding=journey().activeEvent;if(outstanding&&!eventAt)eventAt=now();
   if(outstanding&&context.moving&&!g.turnSoon&&!storyPaused&&now()-eventAt>=25000)resolveEvent('delegate');
   else if(!outstanding){const event=nextCrewEvent(journey(),context);if(event){dispatch('live.event',{event});eventAt=now();const choice=['combat','trader'].includes(event.type);say(event.text+(choice?'':' '),event.character,'mission',event.id,choice?{ask:true}:{});}
    else if(!g.turnSoon&&!storyPaused&&now()-lastSpokeAt>=chatterGap){const st=state(),c=nextChatter({seen:st.story?.chatter||[],speeding:!!rating&&rating.overStreak>=20&&now()-speedingNotedAt>180000,shieldsLow:(journey().shields??100)<40,holdFull:holdFree(st)===0});if(c){if(c.when==='speeding')speedingNotedAt=now();speakScene(c.lines,'chat:'+c.id+':'+now());storyFlag({chatter:c.id});chatterGap=50000+Math.round(Math.random()*50000);}}}
   emit();
  }catch(e){status='Journey paused: '+e.message;audio.setStoryPaused(true);emit();}},
  locationError(message){cancelRequest();lost(message);},
  tick(){if(disposed||!active)return;if(fix&&!validFix(fix,now()))lost();},
  background(){if(disposed)return;cancelRequest();cancelCover();active=false;fix=null;recent=[];guide=null;route=null;viewGuidance=null;audio.clear();audio.setStoryPaused(true);if(!finished(journey())){dispatch('live.phase',{phase:'signal_lost'});resumeNeeded=true;}status='Navigation paused while app is inactive. Resume with a fresh GPS fix.';emit();},
  resume(){if(disposed)return;active=true;fix=null;recent=[];resumeRequested=true;resumeNeeded=!finished(journey());planning=finished(journey());status='Waiting for fresh GPS. Navigation will resume after the route is checked.';emit();},
  snapshot(){return {active,journey:journey(),status,parked:parkedEvidence(recent,now()),route,fix,results,selected,planning,guidance:viewGuidance,resumeNeeded};},
  dispose(){if(disposed)return;api.background();disposed=true;}
 };
 return api;
}
