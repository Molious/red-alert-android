import test from 'node:test';
import assert from 'node:assert/strict';
import {createMissionEngine} from '../src/lib/foundation/mission.js';
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
test('all 24 player combinations persist independently of the permanent crew and mission',()=>{
 const s=storage(),e=createMissionEngine({storage:s});
 for(const species of ['human','reptilian','insectoid','light-being'])for(const gender of ['male','female'])for(const occupation of ['military','support','explorer']){
 const player={species,gender,occupation}; e.dispatch({type:'player',player});assert.deepEqual(createMissionEngine({storage:s}).snapshot().player,player);assert.equal(e.snapshot().crew,'vex');
 }
});
test('invalid player choices and changes during a route leave the save untouched',()=>{
 const e=createMissionEngine({storage:storage()});const before=e.snapshot();assert.throws(()=>e.dispatch({type:'player',player:{species:'unknown',gender:'male',occupation:'military'}}),/player/i);assert.deepEqual(e.snapshot(),before);
 e.dispatch({type:'offer',mission:{id:'test',title:'Test',destination:'Station',reward:2}});e.dispatch({type:'accept'});e.dispatch({type:'depart'});assert.throws(()=>e.dispatch({type:'player',player:{species:'human',gender:'female',occupation:'support'}}),/route/i);
});

test('named player and mission survive reopening and reject blank names',()=>{const s=storage(),e=createMissionEngine({storage:s});e.dispatch({type:'player',player:{name:'  Cory  ',species:'human',gender:'male',occupation:'explorer'}});e.dispatch({type:'offer',mission:{id:'named',title:'Medical cargo',destination:'Morna',reward:20}});e.dispatch({type:'accept'});const loaded=createMissionEngine({storage:s}).snapshot();assert.equal(loaded.player.name,'Cory');assert.equal(loaded.mission.status,'accepted');assert.throws(()=>e.dispatch({type:'player',player:{name:'  ',species:'human',gender:'male',occupation:'explorer'}}),/name/);assert.equal(e.snapshot().player.name,'Cory');});
