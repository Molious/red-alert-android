import test from 'node:test';
import assert from 'node:assert/strict';
import {createAiCrew,parseCrewReply} from '../src/lib/foundation/ai-crew.js';
import {createVoiceControl} from '../src/lib/foundation/voice-control.js';

function rig({answer='[{"character":"MAX","text":"Ready, Captain."}]',error=null,key=true,bridge=true}={}){
 const lines=[],requests=[];
 const native={askCrew:(request,done)=>{requests.push(request);done(answer,error);}};
 const ai=createAiCrew({native:bridge?native:null,engine:{snapshot:()=>({credits:0})},audio:{enqueue:line=>{lines.push(line);return Promise.resolve('played');}},storage:{getItem:()=>key?'sk-ant-'+'x'.repeat(24):''}});
 return {ai,lines,requests};
}

test('canonical and legacy addresses select only the addressed native voice',async()=>{
 for(const [name,canonical,replyName] of [['Max','MAX','MAX'],['Zyren','ZYREN','WRAITH'],['Wraith','ZYREN','ZYREN'],['Sila','SILA','SILAS'],['Silas','SILA','SILA'],['Atlas','ATLAS','CHET'],['Chet','ATLAS','ATLAS'],['Mags','MAX','MAX'],['Vex','VEX','VEX'],['Bastion','BASTION','BASTION']]){
  const r=rig({answer:JSON.stringify([{character:'NOBODY',text:'Wrong'},{character:replyName,text:'Correct'},{character:canonical,text:'Second'},{character:'VEX',text:'Intruder'}])});
  await r.ai.ask(name+', what is ahead?');
  assert.deepEqual(r.lines.map(l=>[l.character,l.text]),[[canonical,'Correct']],name);
  assert.match(r.requests[0].system,new RegExp('Only '+canonical+' may respond'));
  assert.ok(r.lines.every(l=>l.priority==='mission'),'navigation priority preserved');
 }
});

test('unaddressed and ambiguous speech does not call AI or speak',async()=>{
 for(const phrase of ['what is ahead','I told Max about lunch','Max and Vex, what is ahead?','Max, Vex, what is ahead?','maximum speed']){
  const r=rig();await r.ai.ask(phrase);assert.equal(r.requests.length,0,phrase);assert.equal(r.lines.length,0,phrase);
 }
});

test('API, offline, missing bridge and malformed replies fall back to the addressed character',async()=>{
 for(const options of [{error:'network'}, {key:false}, {bridge:false}, {answer:'not JSON'}, {answer:'[]'}, {answer:'[{"character":"VEX","text":"Wrong speaker"}]'}, {answer:'[{"character":"NOBODY","text":"Wrong"}]'}]){
  const r=rig(options);await r.ai.ask('Sila, what is ahead?');
  assert.equal(r.lines.length,1);assert.equal(r.lines[0].character,'SILA');assert.match(r.lines[0].text,/Captain/);
  if(options.key===false||options.bridge===false)assert.equal(r.requests.length,0);
 }
});

test('parser normalizes native names and refuses untrusted or misaddressed text',()=>{
 assert.deepEqual(parseCrewReply('[{"character":"wraith","text":"Ahead."}]','ZYREN'),[{character:'ZYREN',text:'Ahead.'}]);
 assert.deepEqual(parseCrewReply('Plain text','MAX'),[]);
 assert.deepEqual(parseCrewReply('[{"character":"VEX","text":"No"}]','MAX'),[]);
});

test('open mic routes named free speech but ignores chatter and preserves commands and answer windows',async()=>{
 const ai=rig(),commands=[],said=[];
 let expect=[];
 const vc=createVoiceControl({command:async a=>commands.push(a),snapshot:()=>({}),state:()=>({journey:null}),say:l=>{said.push(l);return Promise.resolve('played');},spoken:()=>0,askAi:t=>{if(!ai.ai.accepts(t))return false;void ai.ai.ask(t);return true;}});
 assert.equal((await vc.handle('Max, what is ahead?',null,{open:true})).reply,'ai');
 await Promise.resolve();assert.equal(ai.requests.length,1);assert.equal(ai.lines[0].character,'MAX');
 assert.deepEqual(await vc.handle('what about lunch',null,{open:true}),{ignored:true});
 await vc.handle('mute',null,{open:true});assert.equal(commands[0].type,'mute');
 vc.asking(['defend','evade']);
 await vc.handle('Max, what is ahead?',null,{open:true,inWindow:true});assert.equal(ai.requests.length,1,'active question is not hijacked');
});

test('name-only acknowledgement is local and uses the addressed voice',async()=>{
 const r=rig({key:false});await r.ai.ask('Atlas');
 assert.equal(r.requests.length,0);assert.equal(r.lines[0].character,'ATLAS');assert.equal(r.lines[0].text,'Yes, Captain.');
});

test('busy guard and timeout never let a late or competing speaker respond',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const lines=[],callbacks=[];
 const ai=createAiCrew({native:{askCrew:(_,done)=>callbacks.push(done)},engine:{snapshot:()=>({credits:0})},audio:{enqueue:l=>lines.push(l)},storage:{getItem:()=> 'sk-ant-'+'x'.repeat(24)}});
 const pending=ai.ask('Max, what is ahead?');
 await ai.ask('Vex, what is ahead?');assert.equal(callbacks.length,1);
 t.mock.timers.tick(20000);await pending;
 assert.equal(lines.length,1);assert.equal(lines[0].character,'MAX');
 callbacks[0]('[{"character":"VEX","text":"Late"}]');await Promise.resolve();assert.equal(lines.length,1);
 const next=ai.ask('Sila, what is ahead?');callbacks[1]('[{"character":"SILA","text":"Clear."}]');await next;
 assert.equal(lines.at(-1).character,'SILA');
});

test('canonical named commands preserve cancellation confirmation and mute suppression',async()=>{
 const requests=[],commands=[],said=[];let muted=false;
 const vc=createVoiceControl({command:async a=>commands.push(a),snapshot:()=>({}),state:()=>({journey:{phase:'navigating'},muted}),say:l=>{said.push(l);return Promise.resolve('played');},spoken:()=>0,askAi:t=>{requests.push(t);return true;}});
 await vc.handle('Zyren, cancel journey',null,{open:true});
 assert.equal(commands.length,0);assert.equal(vc.pendingCancel(),true);assert.equal(requests.length,0);
 await vc.handle('no',null,{open:true,inWindow:true});
 muted=true;await vc.handle('Max, what is ahead?',null,{open:true});assert.equal(requests.length,0);
});

test('canonical AI speakers retain saved legacy phone voice choices',async()=>{
 const {createCrewVoices,CREW_VOICE_KEY}=await import('../src/lib/foundation/crew-voices.js');
 const saved={__v:2,WRAITH:'nav-custom',SILAS:'scan-custom',CHET:'ship-custom'};
 const voices=createCrewVoices({storage:{getItem:k=>k===CREW_VOICE_KEY?JSON.stringify(saved):null}});
 for(const [canonical,legacy] of [['ZYREN','WRAITH'],['SILA','SILAS'],['ATLAS','CHET']])assert.equal(voices.voiceFor(canonical),voices.voiceFor(legacy));
});

test('an active answer window with no expected words still excludes AI',async()=>{
 const requests=[];
 const vc=createVoiceControl({command:async()=>{},snapshot:()=>({}),state:()=>({journey:null}),say:()=>Promise.resolve('played'),spoken:()=>0,askAi:t=>{requests.push(t);return true;}});
 await vc.handle('Max, what is ahead?',null,{open:true,inWindow:true});
 assert.equal(requests.length,0);
});
