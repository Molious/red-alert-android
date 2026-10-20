import test from 'node:test';
import assert from 'node:assert/strict';
import {createCrewFlow} from '../src/lib/foundation/crew-flow.js';
test('selection saves the real crew before entering cockpit and preserves active missions',()=>{
 let state={crew:'vex',mission:null};const flow=createCrewFlow({snapshot:()=>state,dispatch:a=>{state={...state,crew:a.id};}});
 assert.equal(flow.screen,'landing');flow.choose();assert.equal(flow.screen,'crew');flow.select('silas');flow.enter();assert.equal(state.crew,'silas');assert.equal(flow.screen,'cockpit');
 flow.home();state={...state,mission:{status:'en_route'}};flow.choose();assert.throws(()=>flow.select('bastion'),/route/);flow.enter();assert.equal(state.crew,'silas');
});
test('unknown characters are rejected without changing the saved crew',()=>{
 const flow=createCrewFlow({snapshot:()=>({crew:'vex'}),dispatch:()=>assert.fail('must not save')});flow.choose();assert.throws(()=>flow.select('unknown'),/crew/);
});
