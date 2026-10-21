// Issue #21: the crew introduction and contract depart lines were silently dropped at launch.
// These tests use the REAL dialogue queue (story pause, hold, 4-line cap), not a stub that always says 'played'.
import test from 'node:test';import assert from 'node:assert/strict';
import {createJourneyController} from '../src/lib/foundation/journey-controller.js';
import {createMissionEngine} from '../src/lib/foundation/mission.js';
import {createDialogueQueue} from '../src/lib/foundation/dialogue.js';
import {parseRoadRoute} from '../src/lib/foundation/navigation-core.js';
import {PROLOGUE} from '../src/lib/foundation/bridge-chatter.js';

const wait=ms=>new Promise(r=>setTimeout(r,ms));
function setup({playMs=2}={}){
 const N=40,pts=[];for(let i=0;i<=N;i++)pts.push([0,i*.002]);
 const route=parseRoadRoute({code:'Ok',routes:[{geometry:{type:'LineString',coordinates:pts},distance:8900,duration:900,legs:[{steps:[{maneuver:{type:'depart',location:pts[0]},distance:8900},{maneuver:{type:'arrive',location:pts[N]},distance:0}]}]}]});
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},engine=createMissionEngine({storage,live:true});
 engine.dispatch({type:'player',player:{name:'Cory',gender:'male',species:'human',occupation:'explorer'}});
 let time=100000;const spoken=[];
 // A line "plays" for playMs, unless it is cut off.
 const audio=createDialogueQueue({now:()=>time,play:(item,signal)=>new Promise(resolve=>{const t=setTimeout(()=>{spoken.push(item);resolve();},playMs);signal.addEventListener('abort',()=>{clearTimeout(t);resolve();},{once:true});})});
 let endCinematic;
 const c=createJourneyController({engine,now:()=>time,services:{search:async()=>[{label:'Far',lat:.08,lng:0}],route:async()=>route},audio,onLaunch:done=>{endCinematic=done;return {cancel(){}}},id:()=>'trip-21'});
 const fix=(lat,speed=0,dt=1500)=>{time+=dt;c.fix({lat,lng:0,accuracy:5,speed,heading:0,ts:time});};
 const board=async({accept=false}={})=>{c.enter();for(let i=0;i<4;i++)fix(0);await wait(150);await c.command({type:'search',text:'Far'});await c.command({type:'select',index:0});await c.command({type:'confirm'});await wait(20);if(accept)await c.command({type:'accept'});for(let i=0;i<4;i++)fix(0);await wait(20);};
 const launch=async()=>{await c.command({type:'launch'});await wait(20);endCinematic();};
 let lat=0;const drive=async(seconds)=>{for(let s=0;s<seconds;s++){fix(lat+=.00005,8,1000);await wait(8);}};
 const prologue=()=>spoken.filter(l=>l.id.startsWith('prologue:')).map(l=>l.text);
 return {c,engine,spoken,fix,board,launch,drive,prologue};
}
const ALL=PROLOGUE.map(([,text])=>text);

test('a first launch speaks the whole crew introduction, in order, once',async()=>{
 const x=setup();await x.board();await x.launch();await x.drive(15);
 assert.deepEqual(x.prologue(),ALL,'all 10 lines, in order (was: every line refused at launch)');
 assert.equal(x.engine.snapshot().story.prologueV,2,'marked heard only after it played');
 const done=x.spoken.findIndex(l=>/^Launch complete/.test(l.text)),first=x.spoken.findIndex(l=>l.id.startsWith('prologue:'));
 assert.ok(done>=0&&first>done,'the crew start talking after "Launch complete"');
 await x.drive(20);assert.equal(x.prologue().length,ALL.length,'never repeated on the same drive');
});

test('the contract depart line is heard at launch',async()=>{
 const x=setup();await x.board({accept:true});
 assert.ok(x.engine.snapshot().contracts?.active,'a contract is in the hold');
 await x.launch();await x.drive(15);
 assert.ok(x.spoken.some(l=>l.id.endsWith(':depart')),'depart line spoken (was: refused at launch)');
});

test('if the driver paused the story, the introduction waits and is not marked heard',async()=>{
 const x=setup();await x.board();await x.c.command({type:'pause-story'});await x.launch();await x.drive(10);
 assert.deepEqual(x.prologue(),[],'story paused: no crew introduction');
 assert.notEqual(x.engine.snapshot().story?.prologueV,2,'not marked heard');
 await x.c.command({type:'resume-story'});await x.drive(20);
 assert.deepEqual(x.prologue(),ALL,'plays in full once the story is resumed');
 assert.equal(x.engine.snapshot().story.prologueV,2);
});

test('an interrupted introduction carries on from the next unheard line',async()=>{
 const x=setup({playMs:6});await x.board();await x.launch();
 for(let s=0;s<60&&x.prologue().length<3;s++)await x.drive(1);
 await x.c.command({type:'mute'});const heardBefore=x.prologue().length;assert.ok(heardBefore>=3&&heardBefore<ALL.length);
 await x.drive(5);assert.notEqual(x.engine.snapshot().story?.prologueV,2,'muted part-way: not marked heard');
 await x.c.command({type:'unmute'});await x.drive(30);
 assert.deepEqual(x.prologue(),ALL,'each line heard exactly once, no restart from the top');
 assert.equal(x.engine.snapshot().story.prologueV,2);
});

test('the introduction does not play again on the next launch',async()=>{
 const x=setup();await x.board();await x.launch();await x.drive(15);assert.equal(x.prologue().length,ALL.length);
 await x.c.command({type:'cancel'});await wait(10);
 await x.board();await x.launch();await x.drive(15);
 assert.equal(x.prologue().length,ALL.length,'second launch: no repeat');
});

// #4 with the real queue: board → hear the offer → confirm → launch without answering.
test('with the real queue, an unanswered offer is taken at launch and Max is actually heard saying so',async()=>{
 const x=setup();await x.board();
 assert.ok(x.spoken.some(l=>l.id.includes(':offer')),'the offer itself was heard');
 assert.ok(!x.engine.snapshot().contracts?.active,'nothing loaded before launch');
 await x.launch();await x.drive(25);
 const id=x.engine.snapshot().contracts?.active?.id;assert.ok(id,'Max took the job');
 const line=x.spoken.find(l=>l.id===`contract:${id}:accepted`);
 assert.ok(line,'Max\'s line actually played');assert.equal(line.character,'MAX');assert.equal(line.ask,true,'opens the hands-free answer window');
 await x.c.command({type:'decline'});await wait(30);
 assert.equal(x.engine.snapshot().contracts.active,null,'saying decline hands it back');
});
