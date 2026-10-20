// Issues #7 and #20 in the real bundled game: the hands-free answer window after a crew question,
// one chime per window, a spoken reply to everything, and silence when the window simply runs out.
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {JSDOM,VirtualConsole} from 'jsdom';
const html=()=>JSON.parse(readFileSync(new URL('../src/hybridHtml.ts',import.meta.url),'utf8').replace(/^export default /,'').trim().replace(/;$/,''));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(check,ms=4000){const end=Date.now()+ms;while(Date.now()<end){if(check())return true;await wait(15);}return false;}

async function fixture(){
 const errors=[],lines=[],listens=[],modes=[];let chimes=0,ts=100000;
 const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/scroll|HTMLMediaElement/.test(e.message))errors.push(e.message)});
 const dom=new JSDOM(html(),{url:'https://vox-star-command.base44.app/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.structuredClone=structuredClone;w.Date.now=()=>ts;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.SVGSVGElement.prototype.createSVGRect=()=>({});
  w.fetch=async()=>({ok:false,json:async()=>({})});
  // The chime is a short Web Audio tone: count them.
  w.AudioContext=class{constructor(){chimes++;this.currentTime=0;this.destination={};}createOscillator(){return {frequency:{},connect(){},start(){},stop(){}};}createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}close(){return Promise.resolve();}};
  w.RedAlertNative={speakRequest(text,done,opts){lines.push({text,character:opts?.character});w.setTimeout(()=>done('played'),0);return lines.length},cancelSpeech(){},
   watchPosition(){return 7},clearWatch(){},searchAddress(){return 8},cancelSearch(){},
   listenOnce(cb,opts){listens.push(cb);modes.push(!!opts?.open);return 100+listens.length},cancelListen(){}};
 }});
 await wait(10);
 const d=dom.window.document;
 d.querySelector('#create-player').click();d.querySelector('#player-name').value='Cory';d.querySelector('#board-ship').click();
 return {dom,d,errors,lines,listens,modes,chimes:()=>chimes,advance(ms){ts+=ms;},
  answer(text,error=null){const cb=listens.at(-1);cb(text,error);},
  said:re=>lines.some(l=>re.test(l.text)),
  saved:()=>JSON.parse(dom.window.localStorage.getItem('mole-beyond:foundation:v1')||'{}')};
}

test('after a crew question the mic opens hands-free with one chime; a mis-heard answer is asked again, then understood',async()=>{
 const x=await fixture();try{
  assert.ok(await until(()=>x.said(/Accept or decline/)),'Max offers a contract');
  assert.ok(await until(()=>x.listens.length===1),'the mic opened on its own after the question');
  assert.equal(x.chimes(),1,'one chime');
  x.answer(null,'no-speech');                               // driver hadn't spoken yet: keep listening, quietly
  assert.ok(await until(()=>x.listens.length===2));assert.equal(x.chimes(),1,'no second chime in the same window');
  assert.ok(!x.said(/did not catch/),'nothing said while still waiting for an answer');
  x.answer('banana');                                       // mis-heard: asked again, and the window reopens
  assert.ok(await until(()=>x.said(/^Say that again, Captain\. Say accept or decline\./)));
  assert.ok(await until(()=>x.listens.length===3),'listening again after "Say that again"');
  x.answer('except');                                       // the recogniser's version of "accept"
  assert.ok(await until(()=>x.said(/Contract accepted/)),'understood as accept');
  assert.ok(x.saved().contracts?.active,'the contract is in the hold');
  assert.deepEqual(x.errors,[]);
 }finally{x.dom.window.close();}
});

test('when the answer window runs out unanswered, nothing is said and the open mic carries on (#25)',async()=>{
 const x=await fixture();try{
  assert.ok(await until(()=>x.listens.length===1));
  const spoken=x.lines.length;x.advance(20000);x.answer(null,'no-speech');
  await wait(400);
  assert.equal(x.lines.length,spoken,'no "did not catch that"');
  assert.ok(await until(()=>x.listens.length===2),'the open mic listens again');assert.deepEqual(x.modes,[false,true],'answer window first, then strict open-mic listening');
  assert.deepEqual(x.errors,[]);
 }finally{x.dom.window.close();}
});

test('open mic outside a question: commands are answered out loud; chatter is ignored without a word',async()=>{
 const x=await fixture();try{
  assert.ok(await until(()=>x.listens.length===1));
  x.answer('what can I say');
  assert.ok(await until(()=>x.said(/You can say destination/)),'help is spoken');
  assert.ok(await until(()=>x.listens.length>=2),'still listening after the reply');
  const spoken=x.lines.length,n=x.listens.length;x.advance(20000); // the offer's answer window is long over
  x.answer('so what about lunch then');                                  // passenger chat
  assert.ok(await until(()=>x.listens.length>n),'carries on listening');assert.equal(x.lines.length,spoken,'chatter gets no reply');
  assert.deepEqual(x.errors,[]);
 }finally{x.dom.window.close();}
});
