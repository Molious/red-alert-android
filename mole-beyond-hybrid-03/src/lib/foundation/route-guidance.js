import {validFix,meters} from './navigation-core.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function parkedEvidence(fixes,now=Date.now()){
 const f=fixes.slice(-4);return f.length===4&&f[3].ts-f[0].ts>=3000&&f.every((p,i)=>validFix(p,now)&&p.accuracy<=25&&Number.isFinite(p.speed)&&p.speed>=0&&p.speed<=.5&&(i===0||p.ts>f[i-1].ts))&&meters([f[0].lat,f[0].lng],[f[3].lat,f[3].lng])<=f[0].accuracy+f[3].accuracy+8;
}
function project(p,a,b){const cos=Math.cos(p.lat*Math.PI/180),x=(p.lng-a[1])*111195*cos,y=(p.lat-a[0])*111195,bx=(b[1]-a[1])*111195*cos,by=(b[0]-a[0])*111195,len=bx*bx+by*by,t=len?clamp((x*bx+y*by)/len,0,1):0;return {t,distance:Math.hypot(x-t*bx,y-t*by),bearing:(Math.atan2(bx,by)*180/Math.PI+360)%360};}
function instruction(step){if(!step)return 'Continue along the route.';if(step.type==='arrive')return 'Your destination is ahead.';const road=step.name?' onto '+step.name:'';if(step.type==='roundabout'||step.type==='rotary')return 'At the roundabout, '+(step.exit?'take exit '+step.exit:'follow the indicated exit')+road+'.';if(step.type==='depart')return 'Head along '+(step.name||'the route')+'.';if(step.type==='merge')return 'Merge'+(step.modifier?' '+step.modifier:'')+road+'.';if(['turn','fork','end of road','on ramp','off ramp'].includes(step.type))return (step.type==='fork'?'Keep ':'Turn ')+(step.modifier||'as indicated')+road+'.';return 'Continue'+(step.modifier?' '+step.modifier:'')+road+'.';}
export function createGuidance(route,{revision=1}={}){
 const total=route.cumulativeMeters.at(-1);let last=null,progress=0,segment=0,off=[],arrival=[],recent=[],sent=new Set(),lastCue='',state={valid:false,progressMeters:0,remainingMeters:total,nextInstruction:'Waiting for GPS',distanceToTurn:total,nearTurn:false,turnSoon:false,arrived:false,offRoute:false,parked:false,cues:[]};
 const snapshot=()=>structuredClone(state);
 function update(p,now=Date.now()){
  const invalid=()=>({...snapshot(),valid:false,parked:false,arrived:false,offRoute:false,cues:[]});
  if(!validFix(p,now)||last&&p.ts<=last.ts)return invalid();
  if(last&&meters([last.lat,last.lng],[p.lat,p.lng])>70*(p.ts-last.ts)/1000+last.accuracy+p.accuracy)return invalid();
  const elapsed=last?Math.max(0,(p.ts-last.ts)/1000):0,speed=Number.isFinite(p.speed)&&p.speed>=0?p.speed:0;
  let best=null;const ahead=progress+Math.max(200,speed*elapsed*2+p.accuracy*2);
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
  if(outside){off.push(p.ts);off=off.slice(-3);}else{off=[];progress=Math.max(progress,best.at);segment=best.index;}
  const offRoute=off.length===3&&off[2]-off[0]>=5000;
  last=p;recent.push(p);recent=recent.slice(-4);
  const next=route.steps.find(s=>s.type!=='depart'&&s.atMeters>=progress-15)||route.steps.at(-1);
  const distanceToTurn=Math.max(0,(next?.atMeters??total)-progress),remaining=Math.max(0,total-progress),nearTurn=distanceToTurn<=Math.max(80,speed*15),turnSoon=distanceToTurn<=Math.max(45,speed*6);
  const cues=[];const current=instruction(next);
  if(!outside&&next){const key=`${revision}:${next.id}`,near=Math.max(20,speed*3),advance=clamp(speed*15,80,500);let stage='';if(distanceToTurn<=near&&!sent.has(key+':now')){stage='now';sent.add(key+':advance');}else if(distanceToTurn<=advance&&!sent.has(key+':advance')&&!sent.has(key+':now'))stage='advance';if(stage){sent.add(key+':'+stage);const text=stage==='now'?current:`In ${Math.max(10,Math.round(distanceToTurn/10)*10)} metres, ${current.charAt(0).toLowerCase()+current.slice(1)}`;lastCue=text;cues.push({id:key+':'+stage,text,character:'WRAITH',priority:'navigation',...(stage==='now'?{urgent:true}:{})});}}
  const end=route.points.at(-1),arrivalOK=!outside&&p.accuracy<=25&&Number.isFinite(p.speed)&&p.speed>=0&&p.speed<=2&&remaining<=50&&meters([p.lat,p.lng],end)<=35;
  if(arrivalOK){arrival.push(p.ts);arrival=arrival.slice(-3);}else arrival=[];
  const arrived=arrival.length===3&&arrival[2]-arrival[0]>=3000;
  state={valid:!outside,progressMeters:progress,remainingMeters:remaining,nextInstruction:current,distanceToTurn,nearTurn,turnSoon,arrived,offRoute,parked:parkedEvidence(recent,now),cues};return snapshot();
 }
 return {update,snapshot,repeat:()=>lastCue||state.nextInstruction};
}
