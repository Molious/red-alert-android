// Issue #25: the mic is on for the whole drive. Outside a crew question only whole command phrases count,
// so passengers, the radio and the driver's own chat can't trigger anything; the mic can never spin.
import test from 'node:test';import assert from 'node:assert/strict';
import {matchStrict} from '../src/lib/foundation/commands.js';
import {createVoiceControl,createMicGuard} from '../src/lib/foundation/voice-control.js';

const type=(text,ctx={})=>matchStrict(text,ctx)?.action?.type??null;

test('open mic: whole command phrases still work, with fillers and names',()=>{
 for(const [p,t,ctx] of [
  ['repeat','repeat'],['Wraith, repeat that please','repeat'],['say that again','repeat'],['mute','mute'],['unmute','unmute',{muted:true}],
  ['pause story','pause-story'],['resume story','resume-story'],['resume navigation','resume'],['recentre','recenter'],['reroute','retry'],
  ['cancel journey','cancel'],['main menu','home'],['stop listening','mic-off'],['what can I say','help'],['okay, launch','launch'],
  ['open the station','station'],['crew panel','crew'],['save game','save'],['accept contract','accept-contract'],['decline the job','decline-contract'],
  ['option two','select',{results:true}],
  ['accept','accept',{expect:['accept','decline']}],['the cline','decline',{expect:['accept','decline']}],['except','accept',{expect:['accept','decline']}],
  ['defend','defend',{expect:['defend','evade','delegate']}],['evade','evade',{expect:['defend','evade','delegate']}],['let crew handle it','delegate',{expect:['defend','evade','delegate']}],
  ['scan','scan',{expect:['scan','delegate']}],['collect salvage','collect',{expect:['collect','delegate']}],['roger','acknowledge',{expect:['acknowledge','delegate']}],
  ['yes','confirm-cancel',{expect:['cancel','keep']}],['no','keep-journey',{expect:['cancel','keep']}],
 ])assert.equal(type(p,ctx),t,p);
 assert.deepEqual(matchStrict('destination 12 Smith St, Chermside')?.action,{type:'search',text:'12 Smith St, Chermside'});
});

// Things said in a car that must never do anything while the mic is just listening.
const CHATTER=[
 'what about lunch','lets go get lunch','yeah','yes','no','okay','sure','alright','go ahead','do it','continue','keep going','carry on',
 'be quiet','shut up','silence','quiet','stop talking','save','station','market','trade','crew','center','where am i','follow me',
 'two','option','that one','confirm','destination','take me to the shops','go to the shops','navigate','pass','skip','run','fight','dodge',
 'help','what','pardon','come again','what was that','directions','next turn','cancel','abort the mission said the movie','stop',
 'did you collect the kids','repair the fence on the weekend','scan the receipt','you handle it mate','except on sundays','i decline to comment',
 'defend the title','lets go','punch it','engage','take off','okay launch the boat later','the station was busy','crew change at six',
];
test('open mic: car chatter, the radio and half-heard sentences never trigger anything',()=>{
 const asked=[{},{expect:['launch']},{muted:true},{results:true}];
 const fired=[];for(const p of CHATTER)for(const ctx of asked){const t=type(p,ctx);if(t)fired.push(`${p} ${JSON.stringify(ctx)} → ${t}`);}
 assert.deepEqual(fired,[]);
});

test('open mic: crew answers only count while that question is open, and only as the answer word',()=>{
 for(const p of ['accept','decline','defend','evade','scan','collect','repair','acknowledge','let crew handle it'])assert.equal(type(p),null,`${p} with no question`);
 assert.equal(type('accept',{expect:['defend','evade','delegate']}),null,'not an answer to this question');
 for(const p of ['yes','yeah','okay','sure','go ahead','invade','depend','scam'])assert.equal(type(p,{expect:['defend','evade','scan','delegate']}),null,`${p}: near-misses are for the answer window only`);
});

test('open mic: unmatched speech is ignored without a word; inside a crew question the answer window still asks again',async()=>{
 const said=[];const vc=createVoiceControl({command:async()=>{},snapshot:()=>({}),state:()=>({journey:{phase:'navigating',activeEvent:{actions:['defend','evade']}}}),say:l=>{said.push(l.text);return Promise.resolve('played');},spoken:()=>said.length});
 assert.deepEqual(await vc.handle('so anyway I told him',null,{open:true}),{ignored:true});assert.deepEqual(said,[]);
 assert.deepEqual(await vc.handle(null,null,{open:true}),{retry:true},'an empty session just listens again');
 assert.deepEqual(await vc.handle(null,'no-speech',{open:true}),{retry:true});assert.deepEqual(said,[]);
 await vc.handle('mumble',null,{open:true,inWindow:true});assert.match(said[0],/^Say that again, Captain\. Say defend, evade/,'answer window: lenient and spoken');
 const r=await vc.handle('invade',null,{open:true,inWindow:true});assert.equal(r.action?.type,'evade','near-miss understood inside the window');assert.doesNotMatch(said[1],/Say that again/);
});

test('loop guard: quick empty sessions and errors back off; repeated failures switch the mic off',()=>{
 const g=createMicGuard();
 assert.deepEqual(g.ended({text:'repeat'}),{delay:300,giveUp:false});
 assert.equal(g.ended({ms:30000}).delay,300,'a long quiet session restarts promptly');
 const quick=[1,2,3,4,5,6].map(()=>g.ended({ms:200}).delay);
 assert.deepEqual(quick,[300,300,1000,2000,4000,8000],'sessions ending instantly back off');
 assert.equal(g.ended({text:'mute'}).delay,300,'hearing something resets it');
 const errs=[1,2,3,4,5].map(()=>g.ended({error:'network'}));
 assert.deepEqual(errs.map(e=>e.delay),[1000,2000,4000,8000,16000]);assert.deepEqual(errs.map(e=>e.giveUp),[false,false,false,false,true]);
 assert.equal(createMicGuard().ended({error:'not-allowed'}).giveUp,true,'permission off: stop at once');
 const h=createMicGuard();for(let i=0;i<40;i++)h.ended({ms:10});assert.equal(h.ended({ms:10}).delay,30000,'capped at 30 s');
});
