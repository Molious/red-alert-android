// Issue #4: when the Captain doesn't answer, the crew act anyway and grumble in character.
import test from 'node:test';import assert from 'node:assert/strict';
import {GRUMBLES,grumble} from '../src/lib/foundation/crew-grumbles.js';
import {CREW_ROSTER} from '../src/lib/foundation/crew-voices.js';
import {createJourneyController} from '../src/lib/foundation/journey-controller.js';
import {createMissionEngine} from '../src/lib/foundation/mission.js';
import {parseRoadRoute} from '../src/lib/foundation/navigation-core.js';

function setup(){
 const N=40,pts=[];for(let i=0;i<=N;i++)pts.push([0,i*.002]);
 const route=parseRoadRoute({code:'Ok',routes:[{geometry:{type:'LineString',coordinates:pts},distance:8900,duration:900,legs:[{steps:[{maneuver:{type:'depart',location:pts[0]},distance:8900},{maneuver:{type:'arrive',location:pts[N]},distance:0}]}]}]});
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},engine=createMissionEngine({storage,live:true});
 engine.dispatch({type:'player',player:{name:'Cory',gender:'male',species:'human',occupation:'explorer'}});
 engine.dispatch({type:'live.story',prologue:true}); // skip the prologue so encounters come sooner
 let time=100000;const lines=[];
 const c=createJourneyController({engine,now:()=>time,services:{search:async()=>[{label:'Far',lat:.08,lng:0}],route:async()=>route,speedLimit:async()=>60},audio:{enqueue:i=>{lines.push(i);return Promise.resolve('played')},clear(){},setStoryPaused(){},holdStory(){}},onLaunch:cb=>{cb();return {cancel(){}}},id:()=>'trip-4'});
 const fix=(lat,speed=0,dt=1500)=>{time+=dt;c.fix({lat,lng:0,accuracy:5,speed,heading:0,ts:time});};
 const plan=async()=>{c.enter();for(let i=0;i<4;i++)fix(0);await c.command({type:'search',text:'Far'});await c.command({type:'select',index:0});await c.command({type:'confirm'});await new Promise(r=>setTimeout(r,0));for(let i=0;i<4;i++)fix(0);};
 return {c,engine,lines,fix,plan};
}
const isGrumble=text=>Object.values(GRUMBLES).flat().some(g=>text.includes(g));

test('every crew member has their own grumbles, and they rotate',()=>{
 for(const {id} of CREW_ROSTER){assert.ok(GRUMBLES[id]?.length>=2,id);assert.notEqual(grumble(id,0),grumble(id,1));}
 assert.equal(grumble('NOBODY',0),GRUMBLES.CHET[0]);
});

test('launching without answering a contract offer: Max takes the job and grumbles',async()=>{
 const x=setup();await x.plan();
 assert.ok(x.lines.some(l=>l.ask&&l.id.includes(':offer')));assert.ok(!x.engine.snapshot().contracts?.active);
 await x.c.command({type:'launch'});
 assert.ok(x.engine.snapshot().contracts?.active,'the offered job is in the hold');
 const took=x.lines.find(l=>/Contract accepted/.test(l.text));
 assert.equal(took.character,'MAX');assert.ok(isGrumble(took.text),'Max says she took it because nobody answered');
});

test('a declined offer stays declined at launch, and an accepted one gets no grumble',async()=>{
 const a=setup();await a.plan();await a.c.command({type:'decline'});await a.c.command({type:'decline'});
 await a.c.command({type:'launch'});assert.ok(!a.engine.snapshot().contracts?.active,'two declines: nothing loaded at launch');
 const b=setup();await b.plan();await b.c.command({type:'accept'});await b.c.command({type:'launch'});
 assert.ok(b.engine.snapshot().contracts?.active);assert.ok(b.lines.every(l=>!isGrumble(l.text)),'no grumble when the Captain answered');
});

test('an unanswered encounter: the crew member grumbles, then handles it',async()=>{
 const x=setup();await x.plan();await x.c.command({type:'decline'});await x.c.command({type:'decline'});await x.c.command({type:'launch'});
 let lat=0;for(let i=0;i<600&&!x.lines.some(l=>l.id.endsWith(':grumble'));i++)x.fix(lat+=.0002,15,3000);
 const g=x.lines.findIndex(l=>l.id.endsWith(':grumble'));assert.ok(g>=0,'an encounter went unanswered and was handled');
 const line=x.lines[g],eventId=line.id.slice(0,-':grumble'.length);
 assert.ok(isGrumble(line.text));
 const resolved=x.lines.findIndex(l=>l.id===eventId+':resolved');assert.ok(resolved>g,'the grumble comes before the outcome');
 assert.equal(line.character,x.lines.find(l=>l.id===eventId).character,'grumbled by the crew member who asked');
});
