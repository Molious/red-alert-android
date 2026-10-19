export function validFix(p,now=Date.now()){return !!p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180&&Number.isFinite(p.ts)&&now-p.ts>=-5000&&now-p.ts<15000&&Number.isFinite(p.accuracy)&&p.accuracy>=0&&p.accuracy<=100;}
export function meters(a,b){const rad=Math.PI/180,lat=(a[0]+b[0])*rad/2;return Math.hypot((b[0]-a[0])*111195,(b[1]-a[1])*111195*Math.cos(lat));}
export function parseRoadRoute(data){
 const r=data?.routes?.[0];if(data?.code!=='Ok'||!r||r.geometry?.type!=='LineString'||!Array.isArray(r.geometry.coordinates)||r.geometry.coordinates.length<2||!Number.isFinite(r.distance)||r.distance<0||!Number.isFinite(r.duration)||r.duration<0)throw Error('No road route returned');
 const points=r.geometry.coordinates.map(c=>{if(!Array.isArray(c)||!Number.isFinite(c[0])||!Number.isFinite(c[1])||Math.abs(c[0])>180||Math.abs(c[1])>90)throw Error('Invalid route coordinates');return [c[1],c[0]];});
 const cumulativeMeters=[0];for(let i=1;i<points.length;i++)cumulativeMeters.push(cumulativeMeters[i-1]+meters(points[i-1],points[i]));
 let from=0;
 const steps=(r.legs||[]).flatMap(l=>l.steps||[]).map((s,i)=>{
  const m=s.maneuver||{},c=m.location,located=Array.isArray(c)&&Number.isFinite(c[0])&&Math.abs(c[0])<=180&&Number.isFinite(c[1])&&Math.abs(c[1])<=90;
  const location=located?[c[1],c[0]]:points[from];let pointIndex=from,best=Infinity;
  for(let j=from;j<points.length;j++){const d=meters(location,points[j]);if(d<best){best=d;pointIndex=j;}}
  if(m.type==='arrive'&&meters(location,points.at(-1))<25)pointIndex=points.length-1;
  from=pointIndex;
  return {id:String(i),text:[m.type,m.modifier,s.name].filter(Boolean).join(' · ')||'Continue along the route',type:m.type||'continue',modifier:m.modifier||'',name:typeof s.name==='string'?s.name:'',location,located,pointIndex,atMeters:cumulativeMeters[pointIndex],distance:Number.isFinite(s.distance)&&s.distance>=0?s.distance:0,exit:Number.isSafeInteger(m.exit)?m.exit:null};
 });
 return {points,cumulativeMeters,distance:r.distance,duration:r.duration,steps};
}
