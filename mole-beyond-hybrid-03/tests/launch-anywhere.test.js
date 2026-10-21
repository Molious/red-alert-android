// Issue #30 (Cory, 2026-10-21): launch is never refused for not being parked. Moving, or GPS that can't confirm
// parked (unknown speed, poor accuracy): guidance starts straight away with no animation. Parked: the short
// launch animation plays as before. No position yet: "Waiting for GPS" and launch on the first good fix.
// Real dialogue queue, so dropped lines would show.
import test from 'node:test';import assert from 'node:assert/strict';
import {createJourneyController} from '../src/lib/foundation/journey-controller.js';
import {createMissionEngine} from '../src/lib/foundation/mission.js';
import {createDialogueQueue} from '../src/lib/foundation/dialogue.js';
import {parseRoadRoute} from '../src/lib/foundation/navigation-core.js';
import {PROLOGUE} from '../src/lib/foundation/bridge-chatter.js';
import {matchStrict} from '../src/lib/foundation/commands.js';
import {expectedAnswers} from '../src/lib/foundation/voice-control.js';

const wait=ms=>new Promise(r=>setTimeout(r,ms));
function setup(){
 const N=40,pts=[];for(let i=0;i<=N;i++)pts.push([0,i*.002]);
 const route=parseRoadRoute({code:'Ok',routes:[{geometry:{type:'LineString',coordinates:pts},distance:8900,duration:900,legs:[{steps:[{maneuver:{type:'depart',location:pts[0]},distance:8900},{maneuver:{type:'arrive',location:pts[N]},distance:0}]}]}]});
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},engine=createMissionEngine({storage,live:true});
 engine.dispatch({type:'player',player:{name:'Cory',gender:'male',species:'human',occupation:'explorer'}});
 let time=100000,covers=0;const spoken=[];
 const audio=createDialogueQueue({now:()=>time,play:(item,signal)=>new Promise(resolve=>{const t=setTimeout(()=>{spoken.push(item);resolve();},2);signal.addEventListener('abort',()=>{clearTimeout(t);resolve();},{once:true});})});
 let endCover=null;
 const c=createJourneyController({engine,now:()=>time,services:{search:async()=>[{label:'Far',lat:.08,lng:0}],route:async()=>route},audio,onLaunch:done=>{covers++;endCover=done;return {cancel(){endCover=null;}}},id:()=>'trip-30'});
 const fix=(lat=0,speed=0,{accuracy=5,dt=1000}={})=>{time+=dt;c.fix({lat,lng:0,accuracy,speed,heading:0,ts:time});};
 // Plan a route while parked, then put the car in the state under test before saying "launch".
 const plan=async()=>{c.enter();for(let i=0;i<4;i++)fix(0);await wait(150);await c.command({type:'search',text:'Far'});await c.command({type:'select',index:0});await c.command({type:'confirm'});await wait(30);};
 let lat=0;const drive=async(s,speed=10)=>{for(let i=0;i<s;i++){fix(lat+=.00009,speed);await wait(6);}};
 const phase=()=>engine.snapshot().journey?.phase;
 return {c,engine,spoken,fix,plan,drive,phase,covers:()=>covers,endCover:()=>endCover?.(),setTime:t=>{time=t;},time:()=>time,
  said:re=>spoken.some(l=>re.test(l.text)),status:()=>c.snapshot().status};
}

test('launch while moving: guidance starts straight away, no animation',async()=>{
 const x=setup();await x.plan();x.fix(.00009,12);x.fix(.00018,12);
 await x.c.command({type:'launch'});
 assert.equal(x.covers(),0,'no launch animation while moving');assert.equal(x.phase(),'navigating');
 await x.drive(3);assert.ok(x.said(/^Launch complete/),'"Launch complete" and the first direction are spoken');
 assert.doesNotMatch(x.status(),/cinematic|requires/i,'no confusing refusal');
});

test('launch with unknown speed or poor accuracy (parked can\'t be confirmed): starts straight away',async()=>{
 const a=setup();await a.plan();a.fix(0,null);a.fix(0,null);await a.c.command({type:'launch'});
 assert.equal(a.covers(),0);assert.equal(a.phase(),'navigating','unknown speed');
 const b=setup();await b.plan();for(let i=0;i<4;i++)b.fix(0,0,{accuracy:40});await b.c.command({type:'launch'});
 assert.equal(b.covers(),0);assert.equal(b.phase(),'navigating','poor accuracy');
});

test('launch while parked: the animation plays as before, then guidance',async()=>{
 const x=setup();await x.plan();for(let i=0;i<4;i++)x.fix(0,0);
 await x.c.command({type:'launch'});
 assert.equal(x.covers(),1,'animation');assert.equal(x.phase(),'launching');
 x.endCover();await wait(20);assert.equal(x.phase(),'navigating');
});

test('launch before any position: "Waiting for GPS", then it launches on the first good fix',async()=>{
 const x=setup();await x.plan();x.setTime(x.time()+60000); // the last fix is now stale
 await x.c.command({type:'launch'});
 assert.equal(x.phase(),'route_ready');assert.match(x.status(),/^Waiting for GPS, Captain/);await wait(20);assert.ok(x.said(/^Waiting for GPS, Captain/),'said out loud');
 x.fix(0,9);await wait(20);
 assert.equal(x.phase(),'navigating','launched on the first good fix, no second "launch" needed');assert.equal(x.covers(),0);
});

test('a pending "launch" is forgotten if the journey is cancelled first',async()=>{
 const x=setup();await x.plan();x.setTime(x.time()+60000);await x.c.command({type:'launch'});await x.c.command({type:'cancel'});
 x.fix(0,9);await wait(20);assert.equal(x.phase(),'cancelled');
});

test('launching on the move still plays the crew introduction and the depart line',async()=>{
 const x=setup();await x.plan();await x.c.command({type:'accept'});x.fix(.00009,12);
 await x.c.command({type:'launch'});await x.drive(25);
 assert.deepEqual(x.spoken.filter(l=>l.id.startsWith('prologue:')).map(l=>l.text),PROLOGUE.map(([,t])=>t),'prologue in full');
 assert.ok(x.spoken.some(l=>l.id.endsWith(':depart')),'depart line');
});

test('an unanswered offer is still taken at launch on the move, and Max says so (#4)',async()=>{
 const x=setup();await x.plan();await wait(50);
 assert.ok(x.spoken.some(l=>l.id.includes(':offer')),'offer heard');
 x.fix(.00009,12);await x.c.command({type:'launch'});await x.drive(25);
 const id=x.engine.snapshot().contracts?.active?.id;assert.ok(id,'Max took the job');
 const line=x.spoken.find(l=>l.id===`contract:${id}:accepted`);assert.ok(line,'her line played');assert.equal(line.ask,true);
});

test('voice: "launch" works at route ready on the always-on mic, parked or not',()=>{
 const expect=expectedAnswers({journey:{phase:'route_ready'}});
 assert.deepEqual(matchStrict('launch',{expect})?.action,{type:'launch'});
 assert.deepEqual(matchStrict('Okay, launch',{expect})?.action,{type:'launch'});
});
