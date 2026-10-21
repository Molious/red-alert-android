// Issue #5: arrival didn't trigger at home (showed 1.2 km remaining).
import test from 'node:test';import assert from 'node:assert/strict';
import {createGuidance} from '../src/lib/foundation/route-guidance.js';
import {parseRoadRoute} from '../src/lib/foundation/navigation-core.js';
import {createJourneyController,pinWarning} from '../src/lib/foundation/journey-controller.js';
import {createMissionEngine} from '../src/lib/foundation/mission.js';
import {createRoadServices} from '../src/lib/foundation/road-services.js';

// A straight 3 km road heading east along the equator: 1 m ≈ 0.000009°.
const DEG=1/111195;
const straight=(km=3)=>{const coords=[];for(let m=0;m<=km*1000;m+=100)coords.push([m*DEG,0]);return parseRoadRoute({code:'Ok',routes:[{geometry:{type:'LineString',coordinates:coords},distance:km*1000,duration:km*100,legs:[{steps:[{maneuver:{type:'depart',location:[0,0]},name:'Long Rd',distance:km*1000},{maneuver:{type:'arrive',location:[km*1000*DEG,0]},distance:0}]}]}]});};
const at=(m,t,speed,north=0)=>({lat:north*DEG,lng:m*DEG,accuracy:6,speed,heading:90,ts:t});
function drive(g,{from=0,to,speed=15,t=100000}){for(let m=from;m<=to;m+=speed){g.update(at(m,t,speed),t);t+=1000;}return t;}

test('a wrong turn is re-routed within seconds at the phone\'s normal 1-second GPS rate',()=>{
 const g=createGuidance(straight(),{revision:1});let t=drive(g,{to:300,speed:13});
 let seconds=0,off=false;
 for(let north=13;north<=400&&!off;north+=13){t+=1000;seconds++;off=g.update(at(300,t,13,north),t).offRoute;}
 assert.ok(off,'off route is detected');
 assert.ok(seconds<=8,`re-route asked for after ${seconds}s (corridor ~40 m at 13 m/s, then 2.5 s)`);
});

test('a short wobble outside the corridor is not treated as off route',()=>{
 const g=createGuidance(straight(),{revision:1});let t=drive(g,{to:300,speed:13});
 t+=1000;assert.equal(g.update(at(313,t,13,60),t).offRoute,false);
 t+=1000;assert.equal(g.update(at(326,t,13,60),t).offRoute,false);
 t+=1000;const back=g.update(at(339,t,13,0),t);assert.equal(back.valid,true);assert.equal(back.offRoute,false);
});

test('after the screen was off, parking at home still finds the car on the route and arrives',()=>{
 const g=createGuidance(straight(),{revision:1});let t=drive(g,{to:1000});
 assert.ok(g.snapshot().remainingMeters>1900);
 // Two minutes with no GPS updates (screen off), then the car is parked 50 m short of the end.
 t+=120000;const first=g.update(at(2950,t,0),t);
 assert.equal(first.valid,true,'position matched to the route again');
 assert.ok(first.remainingMeters<=60,`remaining ${Math.round(first.remainingMeters)} m, not stuck at ~2 km`);
 let arrived=false;for(let s=1;s<=40&&!arrived;s++){t+=1000;arrived=g.update(at(2950,t,0),t).arrived;}
 assert.ok(arrived,'parked close to the end counts as arrived');
});

test('arrival counts at the destination pin when the road ends short of it',()=>{
 // Pin is 90 m past the road end (long driveway). Before: only the road end counted.
 const g=createGuidance(straight(),{revision:1,destination:{lat:60*DEG,lng:3070*DEG,label:'Home'}});let t=drive(g,{to:3000});
 let arrived=false;for(let s=0;s<3&&!arrived;s++){t+=1500;arrived=g.update(at(3065,t,0,55),t).arrived;}
 assert.ok(arrived);
});

test('stopping at lights just before the destination does not end the journey',()=>{
 const g=createGuidance(straight(),{revision:1});let t=drive(g,{to:2900});
 let arrived=false;for(let s=0;s<90;s++){t+=1000;arrived=arrived||g.update(at(2900,t,0),t).arrived;}
 assert.equal(arrived,false,'a 90 s red light 100 m short is not arrival');
});

test('parking in a car park beside the end of the route arrives and does not re-route',()=>{
 const g=createGuidance(straight(),{revision:1});let t=drive(g,{to:2900});
 let arrived=false,rerouted=false;
 for(let s=0;s<45&&!arrived;s++){t+=1000;const r=g.update(at(2930,t,0,80),t);arrived=r.arrived;rerouted=rerouted||r.offRoute;}
 assert.equal(rerouted,false,'no "off the planned route" at the destination');
 assert.ok(arrived,'parked 80 m off the road near the end counts after 30 s');
});

test('a wrong turn far from the destination still re-routes',()=>{
 const g=createGuidance(straight(),{revision:1});let t=drive(g,{to:2000,speed:13});
 let off=false;for(let north=13;north<=300&&!off;north+=13){t+=1000;off=g.update(at(2000,t,13,north),t).offRoute;}
 assert.ok(off);
});

// GPS drift at a red light (Chet's case): the position wanders 50 m sideways off the road line.
const drift=(m,t,acc)=>({lat:50*DEG,lng:m*DEG,accuracy:acc,speed:0,heading:null,ts:t});
for(const acc of [35,22])test(`a red light 100 m short with GPS drifting 50 m sideways at ${acc} m accuracy does not arrive`,()=>{
 const g=createGuidance(straight(),{revision:1});let t=drive(g,{to:2900});
 let arrived=false;for(let s=0;s<90;s++){t+=1000;arrived=arrived||g.update(drift(2900,t,acc),t).arrived;}
 assert.equal(arrived,false);
});

test('a destination across a highway from the route still re-routes a wrong turn',()=>{
 // Route: east 2 km, north 120 m, west to x=0, north 300 m, east 200 m, south 300 m to (200,120): the end sits
 // right beside the westbound leg, but about 1 km away by road from x=300 on that leg.
 const c=[],pt=(x,y)=>c.push([x*DEG,y*DEG]);for(let x=0;x<=2000;x+=100)pt(x,0);for(let y=40;y<=120;y+=40)pt(2000,y);for(let x=1900;x>=0;x-=100)pt(x,120);for(let y=220;y<=420;y+=100)pt(0,y);for(let x=100;x<=200;x+=100)pt(x,420);for(let y=320;y>=120;y-=100)pt(200,y);
 const total=2000+120+2000+300+200+300,end=[200*DEG,120*DEG];
 const r=parseRoadRoute({code:'Ok',routes:[{geometry:{type:'LineString',coordinates:c},distance:total,duration:total/10,legs:[{steps:[{maneuver:{type:'depart',location:[0,0]},name:'A',distance:total},{maneuver:{type:'arrive',location:end},distance:0}]}]}]});
 const g=createGuidance(r,{revision:1});let t=100000;const go=(x,y,heading)=>{t+=1000;return g.update({lat:y*DEG,lng:x*DEG,accuracy:6,speed:13,heading,ts:t},t);};
 for(let x=0;x<=2000;x+=13)go(x,0,90);for(let y=13;y<=120;y+=13)go(2000,y,0);for(let x=1990;x>=300;x-=13)go(x,120,270);
 assert.ok(g.snapshot().remainingMeters>800,'far from the end by road');
 // Wrong turn south at x=300, which is only ~100 m from the end in a straight line.
 let seconds=0,off=false;for(let y=107;y>=-200&&!off;y-=13){seconds++;off=go(300,y,180).offRoute;}
 assert.ok(off&&seconds<=7,`re-routed after ${seconds}s, while still within ~150 m of the end`);
});

test('a pin far from where the road ends is called out before setting off',()=>{
 const road=straight();
 assert.equal(pinWarning({lat:0,lng:3000*DEG,label:'Home'},road),'');
 assert.match(pinWarning({lat:0,lng:4200*DEG,label:'Home'},road),/road ends 1200 metres from your pin/);
 assert.match(pinWarning({lat:0,lng:3000*DEG,label:'Home',approximate:true},road),/approximate/);
});

function setup(results){
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},engine=createMissionEngine({storage,live:true});
 engine.dispatch({type:'player',player:{name:'Cory',gender:'male',species:'human',occupation:'explorer'}});
 let time=100000;const lines=[];
 const c=createJourneyController({engine,now:()=>time,services:{search:async()=>results,route:async()=>straight()},audio:{enqueue:i=>{lines.push(i);return Promise.resolve('played');},clear(){},setStoryPaused(){}},id:()=>'trip-1'});
 const fix=()=>{time+=1500;c.fix({lat:0,lng:0,accuracy:5,speed:0,heading:null,ts:time});};
 return {c,lines,fix,engine};
}

test('the crew warns about an approximate pin when it is chosen and when the route is ready',async()=>{
 const x=setup([{label:'Smith St Chermside QLD 4032 Australia',lat:0,lng:3000*DEG,approximate:true}]);
 x.c.enter();x.fix();await x.c.command({type:'search',text:'34 Smith St Chermside'});
 await x.c.command({type:'select',index:0});
 assert.match(x.lines.at(-1).text,/approximate, not the exact house number/);
 assert.match(x.c.snapshot().status,/approximate pin/);
 await x.c.command({type:'confirm'});
 assert.match(x.lines.at(-1).text,/Route ready.*approximate.*Say launch/);
});

test('an exact pin gets no warning',async()=>{
 const x=setup([{label:'34 Smith St Chermside',lat:0,lng:3000*DEG}]);
 x.c.enter();x.fix();await x.c.command({type:'search',text:'34 Smith St Chermside'});
 await x.c.command({type:'select',index:0});await x.c.command({type:'confirm'});
 assert.ok(x.lines.every(l=>!/approximate|from your pin/.test(l.text)));
});

test('address search passes the approximate flag through as a plain yes/no',async()=>{
 const native={searchAddress:(text,done)=>{done([{lat:1,lng:2,label:'A',approximate:true},{lat:1,lng:2,label:'B',approximate:'yes'},{lat:1,lng:2,label:'C'}],null);return 1;}};
 const found=await createRoadServices({native}).search('34 Smith St');
 assert.deepEqual(found.map(f=>f.approximate),[true,false,false]);
});
