import {validFix,meters} from './navigation-core.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function parkedEvidence(fixes,now=Date.now()){
 const f=fixes.slice(-4);return f.length===4&&f[3].ts-f[0].ts>=3000&&f.every((p,i)=>validFix(p,now)&&p.accuracy<=25&&Number.isFinite(p.speed)&&p.speed>=0&&p.speed<=.5&&(i===0||p.ts>f[i-1].ts))&&meters([f[0].lat,f[0].lng],[f[3].lat,f[3].lng])<=f[0].accuracy+f[3].accuracy+8;
}
function project(p,a,b){const cos=Math.cos(p.lat*Math.PI/180),x=(p.lng-a[1])*111195*cos,y=(p.lat-a[0])*111195,bx=(b[1]-a[1])*111195*cos,by=(b[0]-a[0])*111195,len=bx*bx+by*by,t=len?clamp((x*bx+y*by)/len,0,1):0;return {t,distance:Math.hypot(x-t*bx,y-t*by),bearing:(Math.atan2(bx,by)*180/Math.PI+360)%360};}
function instruction(step){if(!step)return 'Continue along the route.';if(step.type==='arrive')return 'Your destination is ahead.';const road=step.name?' onto '+step.name:'';if(step.type==='roundabout'||step.type==='rotary')return 'At the roundabout, '+(step.exit?'take exit '+step.exit:'follow the indicated exit')+road+'.';if(step.type==='depart')return 'Head along '+(step.name||'the route')+'.';if(step.type==='merge')return 'Merge'+(step.modifier?' '+step.modifier:'')+road+'.';if(['turn','fork','end of road','on ramp','off ramp'].includes(step.type))return (step.type==='fork'?'Keep ':'Turn ')+(step.modifier||'as indicated')+road+'.';return 'Continue'+(step.modifier?' '+step.modifier:'')+road+'.';}
export function createGuidance(route,{revision=1,destination=null}={}){
 const total=route.cumulativeMeters.at(-1),pin=destination&&Number.isFinite(destination.lat)&&Number.isFinite(destination.lng)?[destination.lat,destination.lng]:null;let last=null,progress=0,segment=0,offSince=null,parkedSince=null,arrival=[],recent=[],sent=new Set(),lastCue='',state={valid:false,progressMeters:0,remainingMeters:total,nextInstruction:'Waiting for GPS',distanceToTurn:total,nearTurn:false,turnSoon:false,arrived:false,offRoute:false,parked:false,cues:[]};
 const snapshot=()=>structuredClone(state);
 function update(p,now=Date.now()){
  const invalid=()=>({...snapshot(),valid:false,parked:false,arrived:false,offRoute:false,cues:[]});
  if(!validFix(p,now)||last&&p.ts<=last.ts)return invalid();
  if(last&&meters([last.lat,last.lng],[p.lat,p.lng])>70*(p.ts-last.ts)/1000+last.accuracy+p.accuracy)return invalid();
  const elapsed=last?Math.max(0,(p.ts-last.ts)/1000):0,speed=Number.isFinite(p.speed)&&p.speed>=0?p.speed:0;
  // Search ahead by the larger of speed x time and the distance actually moved, so a GPS gap (screen off)
  // followed by a slow or parked fix can still find where the car really is (#5).
  const moved=last?meters([last.lat,last.lng],[p.lat,p.lng]):0;
  let best=null;const ahead=progress+Math.max(200,speed*elapsed*2+p.accuracy*2,moved*1.5+p.accuracy*2);
  for(let i=Math.max(0,segment-3);i<route.points.length-1;i++){
   if(route.cumulativeMeters[i]>ahead)break;
   const q=project(p,route.points[i],route.points[i+1]),at=route.cumulativeMeters[i]+q.t*(route.cumulativeMeters[i+1]-route.cumulativeMeters[i]);
   // A new route starts at its first segment. Later fixes need observed movement
   // before a distant occurrence of the same crossing can become a candidate.
   if(!last&&i!==0)continue;
   const credibleAdvance=last?Math.max(25,meters([last.lat,last.lng],[p.lat,p.lng])+last.accuracy+p.accuracy+15):Infinity;
   if(at>progress+credibleAdvance)continue;
   const angle=last&&Number.isFinite(p.heading)&&p.heading>=0&&speed>2?Math.abs(((q.bearing-p.heading+540)%360)-180):0;
   const score=q.distance+Math.abs(at-progress)*.015+(angle>100?30:0);
   if(!best||score<best.score)best={...q,at,index:i,score};
  }
  if(!best)return invalid();
  const corridor=Math.max(40,p.accuracy*2),outside=best.distance>corridor;
  // Off route = outside the corridor continuously for 2.5 s. (It used to compare only the last two fixes,
  // which at the phone's 1-second GPS rate never reached 2.5 s, so wrong turns were rarely re-routed.)
  if(outside){if(offSince===null)offSince=p.ts;}else{offSince=null;progress=Math.max(progress,best.at);segment=best.index;}
  // Within 150 m of the destination, leaving the road line is expected (driveway, car park), so it is not
  // treated as a wrong turn: re-routing there would restart guidance at the kerb. It must also be within
  // 300 m by road, so a destination just across a highway or river from the route still re-routes.
  const end=route.points.at(-1),dEnd=meters([p.lat,p.lng],end),dPin=pin?meters([p.lat,p.lng],pin):Infinity,nearEnd=Math.min(dEnd,dPin)<=150&&progress>=total*.5&&total-progress<=300;
  const offRoute=offSince!==null&&p.ts-offSince>=2500&&!nearEnd;
  last=p;recent.push(p);recent=recent.slice(-4);
  const next=route.steps.find(s=>s.type!=='depart'&&s.atMeters>=progress-15)||route.steps.at(-1);
  const distanceToTurn=Math.max(0,(next?.atMeters??total)-progress),remaining=Math.max(0,total-progress),nearTurn=distanceToTurn<=Math.max(80,speed*15),turnSoon=distanceToTurn<=Math.max(45,speed*6);
  const cues=[];const current=instruction(next);
  if(!outside&&next){const key=`${revision}:${next.id}`,near=Math.max(20,speed*3),advance=clamp(speed*15,80,500);let stage='';if(distanceToTurn<=near&&!sent.has(key+':now')){stage='now';sent.add(key+':advance');}else if(distanceToTurn<=advance&&!sent.has(key+':advance')&&!sent.has(key+':now'))stage='advance';if(stage){sent.add(key+':'+stage);const text=stage==='now'?current:`In ${Math.max(10,Math.round(distanceToTurn/10)*10)} metres, ${current.charAt(0).toLowerCase()+current.slice(1)}`;lastCue=text;cues.push({id:key+':'+stage,text,character:'WRAITH',priority:'navigation',...(stage==='now'?{urgent:true}:{})});}}
  // Arrival: stopped near the end of the route. Works off the route line too (driveways, car parks), with
  // unknown GPS speed when the position is not moving, and with modest GPS accuracy.
  // The destination pin counts as well as the road's end point (the road can stop short of a house).
  const prev=recent.at(-2);
  const still=Number.isFinite(p.speed)&&p.speed>=0?p.speed<=2.5:!!prev&&meters([prev.lat,prev.lng],[p.lat,p.lng])<=4;
  const arrivalOK=p.accuracy<=40&&still&&(Math.min(dEnd,dPin)<=40&&progress>=total*.5||!outside&&remaining<=50&&dEnd<=60);
  if(arrivalOK){arrival.push(p.ts);arrival=arrival.slice(-2);}else arrival=[];
  // Parked for 30 s close to the destination also counts (#5), but only off the road line (driveway, car
  // park) or within 60 m of the end of the route, so a red light 100 m short doesn't end the trip. Off the
  // road line only counts with a good fix (<= 20 m): poor GPS at a light can drift the position sideways.
  const parked=parkedEvidence(recent,now),parkedNear=parked&&Math.min(dEnd,dPin)<=120&&progress>=total*.5&&(outside&&p.accuracy<=20||remaining<=60);
  if(parkedNear){if(parkedSince===null)parkedSince=p.ts;}else parkedSince=null;
  const arrived=arrival.length===2&&arrival[1]-arrival[0]>=1500||parkedSince!==null&&p.ts-parkedSince>=30000;
  state={valid:!outside,progressMeters:progress,remainingMeters:remaining,nextInstruction:current,distanceToTurn,nearTurn,turnSoon,arrived,offRoute,parked,cues};return snapshot();
 }
 return {update,snapshot,repeat:()=>lastCue||state.nextInstruction};
}
