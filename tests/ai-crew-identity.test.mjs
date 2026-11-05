import test from 'node:test';
import assert from 'node:assert/strict';
import {CREW_VOICE_IDS} from '../src/crewVoiceIds.ts';
import {CREW_PROFILES} from '../src/crewVoices.ts';
import {addressedCrew,createAiCrew} from '../mole-beyond-hybrid-03/src/lib/foundation/ai-crew.js';

test('every approved native crew voice is addressable with matching prompt identity',async()=>{
 const requests=[];
 const ai=createAiCrew({native:{askCrew:(r,done)=>{requests.push(r);done('[]');}},engine:{snapshot:()=>({credits:0})},audio:{enqueue:()=>{}},storage:{getItem:()=> 'sk-ant-'+'x'.repeat(24)}});
 for(const name of Object.keys(CREW_VOICE_IDS)){
  assert.equal(addressedCrew(name+', report status').character,name);
  await ai.ask(name+', report status');
  const prompt=requests.at(-1).system;
  assert.deepEqual([...prompt.matchAll(/^- ([A-Z]+):/gm)].map(m=>m[1]).sort(),Object.keys(CREW_VOICE_IDS).sort());
  assert.match(prompt,new RegExp('- '+name+':[^\\n]*'+(CREW_PROFILES[name].gender==='male'?'Male':'Female')));
 }
});
