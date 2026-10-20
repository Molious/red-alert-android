// Issue #25 (native side and the bundled game): on-device recognition, the open-mic flag on the bridge,
// and a failing recogniser backing off instead of spinning.
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {JSDOM,VirtualConsole} from 'jsdom';
import {planRecognition,VOICE_BIAS} from '../src/voicePolicy.ts';
import {APP_ORIGIN,CHANNEL,parseBridgeMessage} from '../src/bridgeProtocol.ts';
import {nativeBridgeScript} from '../src/nativeBridgeScript.ts';

test('on-device recognition when the phone has an English model; otherwise the Google app as before',()=>{
 const services=['com.google.android.googlequicksearchbox','com.google.android.as'];
 assert.deepEqual(planRecognition({services,onDeviceSupported:true,installedLocales:['en-US','en-AU']}),{service:'com.google.android.as',onDevice:true,lang:'en-AU'});
 assert.deepEqual(planRecognition({services,onDeviceSupported:true,installedLocales:['en_GB']}),{service:'com.google.android.as',onDevice:true,lang:'en-GB'});
 assert.deepEqual(planRecognition({services,onDeviceSupported:true,installedLocales:['en-IN']}),{service:'com.google.android.as',onDevice:true,lang:'en-IN'});
 assert.deepEqual(planRecognition({services,onDeviceSupported:true,installedLocales:[]}),{service:'com.google.android.googlequicksearchbox',onDevice:false,lang:'en-AU'},'no model installed');
 assert.deepEqual(planRecognition({services,onDeviceSupported:false,installedLocales:['en-AU']}),{service:'com.google.android.googlequicksearchbox',onDevice:false,lang:'en-AU'},'not supported');
 assert.equal(planRecognition({services:['com.samsung.android.bixby.agent'],onDeviceSupported:true,installedLocales:['en-AU']}).onDevice,false,'no Android System Intelligence');
 assert.ok(VOICE_BIAS.includes('accept')&&VOICE_BIAS.includes('decline')&&VOICE_BIAS.length<40);
});

test('the bridge carries the open-mic flag as a plain yes/no only',()=>{
 const m={channel:CHANNEL,doc:'test-doc',id:3,type:'voice.listen'};
 assert.ok(parseBridgeMessage(JSON.stringify(m),APP_ORIGIN+'/'));
 assert.equal(parseBridgeMessage(JSON.stringify({...m,open:true}),APP_ORIGIN+'/')?.open,true);
 assert.equal(parseBridgeMessage(JSON.stringify({...m,open:'yes'}),APP_ORIGIN+'/'),null);
 assert.match(nativeBridgeScript,/listenOnce: function \(done, opts\)/);
 assert.match(nativeBridgeScript,/opts\.open === true \? \{ open: true \} : \{\}/);
});

test('the native side keeps real backgrounding detectable while the mic is always capturing',()=>{
 const src=readFileSync(new URL('../src/useNativeServices.ts',import.meta.url),'utf8');
 assert.match(src,/away = setTimeout\(goBackground, capture\.current \? 20000 : 2000\)/,'20 s cap instead of ignoring it while capturing');
 assert.match(src,/requiresOnDeviceRecognition: c\.onDevice/);assert.match(src,/contextualStrings: VOICE_BIAS/);
});

// ---------- in the bundled game ----------
const html=()=>JSON.parse(readFileSync(new URL('../src/hybridHtml.ts',import.meta.url),'utf8').replace(/^export default /,'').trim().replace(/;$/,''));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function game({onListen}){
 const lines=[],listens=[];let ts=100000;const vc=new VirtualConsole();
 const dom=new JSDOM(html(),{url:'https://vox-star-command.base44.app/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.structuredClone=structuredClone;w.Date.now=()=>ts;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.SVGSVGElement.prototype.createSVGRect=()=>({});w.fetch=async()=>({ok:false,json:async()=>({})});
  w.RedAlertNative={speakRequest(text,done){lines.push(text);w.setTimeout(()=>done('played'),0);return lines.length},cancelSpeech(){},watchPosition(){return 7},clearWatch(){},searchAddress(){return 8},cancelSearch(){},
   listenOnce(cb,opts){listens.push({at:performance.now(),open:!!opts?.open});w.setTimeout(()=>onListen(cb,listens.length),0);return 100+listens.length},cancelListen(){}};
 }});
 await wait(10);const d=dom.window.document;d.querySelector('#create-player').click();d.querySelector('#player-name').value='Cory';d.querySelector('#board-ship').click();
 return {dom,lines,listens,advance(ms){ts+=ms;}};
}

test('a recogniser that errors immediately is retried with growing gaps, never in a tight loop',async()=>{
 const x=await game({onListen:(cb,n)=>{x.advance(20000);cb(null,'network');}}); // every session fails at once; jump past any answer window
 try{
  await wait(2500);
  assert.ok(x.listens.length>=2&&x.listens.length<=4,`${x.listens.length} attempts in 2.5 s (a loop would be dozens)`);
  const gaps=x.listens.slice(1).map((l,i)=>l.at-x.listens[i].at);
  assert.ok(gaps.slice(1).every(g=>g>=900),`gaps ${gaps.map(Math.round)} ms`);
 }finally{x.dom.window.close();}
});

test('a session that keeps ending instantly with nothing heard backs off too',async()=>{
 const x=await game({onListen:(cb)=>{x.advance(20000);cb(null,null);}});
 try{
  await wait(2500);
  assert.ok(x.listens.length<=8,`${x.listens.length} attempts in 2.5 s`);
  assert.ok(x.listens.slice(1).some(l=>l.open),'listening in open-mic mode between questions');
 }finally{x.dom.window.close();}
});

// #25 follow-up: the open mic restarts after every phrase; the indicator must not flash, and passengers'
// words must not appear on screen.
test('the mic indicator stays steady across restarts, and chatter never appears on screen',async()=>{
 let next=null;const x=await game({onListen:(cb)=>{next=cb;}});
 const until=async(f,ms=4000)=>{const e=Date.now()+ms;while(Date.now()<e){if(f())return true;await wait(10);}return false;};
 // Answer the current listen session (a crew line can cancel one mid-test; its callback is then stale).
 const say=async(text,done)=>{for(let i=0;i<8;i++){const k=x.listens.length;await until(()=>next);next(text,null);if(await until(()=>done(k),600))return true;}return false;};
 try{
  await until(()=>next);x.advance(20000);next(null,'no-speech');await until(()=>x.listens.length>=2); // offer window over
  const d=x.dom.window.document,btn=d.querySelector('.navigation-strip [data-action=voice]'),status=d.querySelector('.voice-status');
  const seen={btn:[btn.textContent],status:[status.textContent]};
  new x.dom.window.MutationObserver(()=>{if(seen.btn.at(-1)!==btn.textContent)seen.btn.push(btn.textContent);if(seen.status.at(-1)!==status.textContent)seen.status.push(status.textContent);}).observe(d.body,{subtree:true,childList:true,characterData:true});
  const spokeBefore=x.lines.length;
  for(const c of ['so anyway','what about lunch','turn the radio up','okay','did you see that'])await say(c,k=>x.listens.length>k);
  const crewLines=x.lines.length-spokeBefore;
  assert.ok(seen.btn.length-1<=2*crewLines,`button changed ${seen.btn.length-1}× over 5 restarts (only pausing for ${crewLines} crew line(s) may change it)`);
  assert.ok(seen.status.every(t=>!/lunch|radio|anyway|did you see/.test(t)),'passengers\' words never shown');
  assert.ok(await say('repeat',()=>seen.status.includes('Heard: “repeat”')),'a real command is shown');
  assert.ok(await until(()=>seen.btn.includes('Mic on')),'paused while the reply is spoken');
  assert.ok(await until(()=>btn.textContent==='Mic listening'),'listening again afterwards');
  btn.click();assert.ok(await until(()=>btn.textContent==='Mic off'),'switching it off shows');
 }finally{x.dom.window.close();}
});
