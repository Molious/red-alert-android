import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMissionEngine} from '../src/lib/foundation/mission.js';
import {createTestSession} from '../src/lib/foundation/autotest.js';
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};};
test('one start completes a mission and records a bounded local report',()=>{
 const s=storage(), engine=createMissionEngine({storage:s});
 const run=createTestSession({engine,storage:s,now:()=>123});
 run.start(); for(let i=0;i<500&&run.running;i++)run.tick();
 assert.equal(run.running,false);assert.equal(engine.snapshot().ledger.length,1);
 assert.equal(run.report().outcome,'completed');assert.ok(run.report().events.length<200);
 assert.equal(JSON.parse(s.getItem('mole-hybrid-test-reports-v1')).length,1);
});
test('spoken stop prevents further mission progress',()=>{
 const s=storage(),engine=createMissionEngine({storage:s}),run=createTestSession({engine,storage:s});
 run.start();run.tick();assert.equal(run.command('please stop test'),false);
 assert.equal(run.command('stop test'),true);const revision=engine.snapshot().revision;
 run.tick();assert.equal(engine.snapshot().revision,revision);assert.equal(run.report().outcome,'voice-stop');
});
test('lost microphone, hidden app and save failures stop the test',()=>{
 for(const reason of ['microphone-error','app-background']){
  const s=storage(),engine=createMissionEngine({storage:s}),run=createTestSession({engine,storage:s});
  run.start();run.stop(reason);run.tick();assert.equal(engine.snapshot().mission,null);
 }
 const engine=createMissionEngine({storage:storage()});
 const bad={getItem:()=>null,setItem:()=>{throw Error('Disk full');}};
 const run=createTestSession({engine,storage:bad});assert.throws(()=>run.start(),/Disk full/);assert.equal(run.running,false);
});

