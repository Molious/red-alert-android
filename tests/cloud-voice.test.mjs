// #33: ElevenLabs crew voices with a cache and a fast fallback to the phone's voice.
import test from 'node:test';import assert from 'node:assert/strict';
import {createCloudVoice,cacheName,validElevenKey} from '../src/cloudVoice.ts';
import {elevenVoiceFor,CREW_VOICE_IDS} from '../src/crewVoiceIds.ts';
const KEY='sk_'+'a'.repeat(48),VOICE='21m00Tcm4TlvDq8ikWAM';
function rig({key=KEY,voice=VOICE,cached=null,synth}={}){
 const log=[],files=new Map(cached?[[cached,'file://'+cached]]:[]);let t=0;const pending=[];
 const timers={set:(fn,ms)=>{const h={fn,at:t+ms};pending.push(h);return h;},clear:h=>{const i=pending.indexOf(h);if(i>=0)pending.splice(i,1);}};
 const advance=ms=>{t+=ms;for(const h of pending.filter(h=>h.at<=t)){timers.clear(h);h.fn();}};
 let playEvents=null;
 const cv=createCloudVoice({key:()=>key,voiceFor:()=>voice,timers,
  synth:synth||(async()=>new Uint8Array([1,2,3])),
  cache:{get:n=>files.get(n)||null,put:(n,b)=>{files.set(n,'file://'+n);log.push('cached');return 'file://'+n;}},
  play:(uri,ev)=>{log.push('play '+uri.slice(0,12));playEvents=ev;ev.started();return {stop:()=>log.push('stopped')};}});
 const cb={onStart:()=>log.push('start'),onDone:()=>log.push('done'),onStopped:()=>log.push('onStopped'),onError:()=>log.push('error')};
 return {cv,log,cb,advance,files,end:()=>playEvents.done(),fail:()=>playEvents.failed()};
}
const tick=()=>new Promise(r=>setTimeout(r,0));
test('a line is synthesised, cached, played and reported done',async()=>{
 const x=rig();assert.equal(x.cv.speak('Turn left',{character:'WRAITH',priority:'navigation'},x.cb,()=>x.log.push('PHONE')),'cloud');
 await tick();assert.deepEqual(x.log.slice(0,3),['cached','play file://21m00','start']);assert.ok(x.cv.isPlaying());
 x.end();assert.equal(x.log.at(-1),'done');assert.ok(!x.cv.isPlaying());
});
test('a cached line plays straight away with no network call',()=>{
 const name=cacheName(VOICE,'eleven_flash_v2_5','Turn left');let called=0;
 const x=rig({cached:name,synth:async()=>{called++;return new Uint8Array()}});
 x.cv.speak('Turn left',{character:'WRAITH',priority:'navigation'},x.cb,()=>x.log.push('PHONE'));
 assert.equal(called,0);assert.equal(x.log[1],'start');
});
test('directions never wait: after 1.5 s the phone voice says it, and the late download is only cached',async()=>{
 let resolve;const x=rig({synth:()=>new Promise(r=>{resolve=r;})});
 x.cv.speak('Turn right',{character:'WRAITH',priority:'navigation'},x.cb,()=>x.log.push('PHONE'));
 x.advance(1499);assert.ok(!x.log.includes('PHONE'));x.advance(1);assert.deepEqual(x.log,['PHONE']);
 resolve(new Uint8Array([9]));await tick();assert.deepEqual(x.log,['PHONE','cached'],'cached for next time, never played over the phone voice');
});
test('crew lines get longer (4 s) before falling back',async()=>{
 const x=rig({synth:()=>new Promise(()=>{})});
 x.cv.speak('Salvage ahead, Captain',{character:'MAX',priority:'mission'},x.cb,()=>x.log.push('PHONE'));
 x.advance(3999);assert.equal(x.log.length,0);x.advance(1);assert.deepEqual(x.log,['PHONE']);
});
test('no key, a bad key, no voice for the character, or a network error → phone voice',async()=>{
 for(const opts of [{key:''},{key:'not-a-key'},{voice:null}]){const x=rig(opts);assert.equal(x.cv.speak('Hi',{character:'VEX'},x.cb,()=>x.log.push('PHONE')),'phone');assert.deepEqual(x.log,['PHONE']);}
 const e=rig({synth:async()=>{throw Error('offline')}});e.cv.speak('Hi',{character:'VEX'},e.cb,()=>e.log.push('PHONE'));await tick();assert.deepEqual(e.log,['PHONE']);
 const f=rig();f.cv.speak('Hi',{character:'VEX'},f.cb,()=>f.log.push('PHONE'));await tick();f.fail();assert.equal(f.log.at(-1),'PHONE','a file that will not play falls back too');
});
test('stopping a line stops playback and reports onStopped once; a stopped line never falls back later',async()=>{
 const x=rig();x.cv.speak('Long story',{character:'SILAS'},x.cb,()=>x.log.push('PHONE'));await tick();
 assert.equal(x.cv.stop(),true);assert.deepEqual(x.log.slice(-2),['stopped','onStopped']);assert.equal(x.cv.stop(),false);x.advance(10000);assert.ok(!x.log.includes('PHONE'));
 let resolve;const y=rig({synth:()=>new Promise(r=>{resolve=r;})});y.cv.speak('Wait',{character:'MAX'},y.cb,()=>y.log.push('PHONE'));
 y.cv.stop();resolve(new Uint8Array([1]));await tick();y.advance(10000);assert.ok(!y.log.includes('PHONE')&&!y.log.some(l=>l.startsWith('play')));
});
test('keys and voice IDs are validated; cache names are stable and distinct',()=>{
 assert.ok(validElevenKey(KEY));assert.ok(validElevenKey('0123456789abcdef0123456789abcdef'));assert.ok(!validElevenKey('sk-ant-123'));assert.ok(!validElevenKey(''));
 assert.equal(cacheName(VOICE,'m','a'),cacheName(VOICE,'m','a'));assert.notEqual(cacheName(VOICE,'m','a'),cacheName(VOICE,'m','b'));
 assert.equal(elevenVoiceFor('NOBODY'),null);assert.deepEqual(Object.keys(CREW_VOICE_IDS).sort(),['ATLAS','BASTION','MAX','SILA','VEX','ZYREN']);
});
import {parseBridgeMessage,APP_ORIGIN,CHANNEL} from '../src/bridgeProtocol.ts';
import {createVoiceKey,VOICE_KEY} from '../mole-beyond-hybrid-03/src/lib/foundation/voice-key.js';
test('the bridge accepts an ElevenLabs key or a clear, and only valid line priorities',()=>{
 const m=o=>parseBridgeMessage(JSON.stringify({channel:CHANNEL,doc:'doc-1234',id:0,...o}),APP_ORIGIN+'/');
 assert.equal(m({type:'voice.config',key:KEY})?.key,KEY);assert.equal(m({type:'voice.config',key:''})?.key,'');
 assert.equal(m({type:'voice.config',key:'sk-ant-nope'}),null);assert.equal(m({type:'voice.config'}),null);
 assert.equal(m({type:'speech.say',id:2,text:'Hi',priority:'navigation'})?.priority,'navigation');assert.equal(m({type:'speech.say',id:2,text:'Hi',priority:'loud'}),null);
});
test('the game keeps the voice key on this phone and hands it to the app',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},sent=[];
 const vk=createVoiceKey({storage,native:{setVoiceKey:k=>sent.push(k)}});
 assert.throws(()=>vk.set('sk-ant-123'),/ElevenLabs/);vk.set(' '+KEY+' ');assert.equal(data.get(VOICE_KEY),KEY);assert.deepEqual(sent,[KEY]);
 vk.clear();assert.ok(!vk.hasKey());assert.deepEqual(sent,[KEY,'']);
});
