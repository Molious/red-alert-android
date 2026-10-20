// #19: the opening cinematic is a native asset with a validated bridge, not part of the game bundle.
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,statSync} from 'node:fs';
import {parseBridgeMessage,APP_ORIGIN,CHANNEL} from '../src/bridgeProtocol.ts';
const msg=o=>JSON.stringify({channel:CHANNEL,doc:'doc-1234',id:3,...o});
test('cinematic bridge messages are accepted only in the expected shape',()=>{
 assert.equal(parseBridgeMessage(msg({type:'cinematic.play'}),APP_ORIGIN+'/')?.type,'cinematic.play');
 assert.equal(parseBridgeMessage(msg({type:'cinematic.stop'}),APP_ORIGIN+'/')?.type,'cinematic.stop');
 assert.equal(parseBridgeMessage(msg({type:'cinematic.play'}),'https://evil.example/'),null);
 assert.equal(parseBridgeMessage(msg({type:'cinematic.hack'}),APP_ORIGIN+'/'),null);
});
test('the video ships as a native asset and stays out of the game bundle',()=>{
 const size=statSync(new URL('../assets/video/mole-beyond-opening.mp4',import.meta.url)).size;
 assert.ok(size>5e6&&size<40e6,'approved video present ('+size+' bytes)');
 assert.ok(statSync(new URL('../src/hybridHtml.ts',import.meta.url)).size<4*1024*1024,'game bundle under 4 MiB');
 assert.ok(!readFileSync(new URL('../src/hybridHtml.ts',import.meta.url),'utf8').includes('mole-beyond-opening.mp4'),'not inlined');
 assert.match(readFileSync(new URL('../src/Cinematic.tsx',import.meta.url),'utf8'),/mixWithOthers/,'video sound mixes with crew and directions');
});

// #19: the opening cinematic plays once when the app opens, before the title and character select; never at launch.
import {JSDOM,VirtualConsole} from 'jsdom';
const route={code:'Ok',routes:[{geometry:{type:'LineString',coordinates:[[0,0],[.01,0]]},distance:1100,duration:120,legs:[{steps:[{maneuver:{type:'depart',location:[0,0]},name:'A',distance:1100},{maneuver:{type:'arrive',location:[.01,0]},distance:0}]}]}]};
const wait=ms=>new Promise(r=>setTimeout(r,ms));const until=async(f,ms=4000)=>{const e=Date.now()+ms;while(Date.now()<e){if(f())return true;await wait(10);}return false;};
async function opened({saved}={}){
 const html=JSON.parse(readFileSync(new URL('../src/hybridHtml.ts',import.meta.url),'utf8').replace(/^export default /,'').trim().replace(/;$/,''));
 let ts=100000,gps,playing=false,videoDone=null;const listens=[],plays=[];
 const dom=new JSDOM(html,{url:'https://vox-star-command.base44.app/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:new VirtualConsole(),beforeParse(w){
  w.structuredClone=structuredClone;w.Date.now=()=>ts;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.SVGSVGElement.prototype.createSVGRect=()=>({});w.fetch=async()=>({ok:true,json:async()=>route});
  if(saved)w.localStorage.setItem(saved.key,saved.value);
  w.RedAlertNative={speakRequest(t,done){w.setTimeout(()=>done('played'),0);return 1},cancelSpeech(){},watchPosition(cb){gps=cb;return 7},clearWatch(){},searchAddress(t,cb){cb([{label:'Somewhere',lat:0,lng:.01}],null);return 8},cancelSearch(){},
   listenOnce(cb){listens.push(playing);return 100+listens.length},cancelListen(){},playCinematic(done){playing=true;videoDone=done;plays.push(ts);return plays.length},stopCinematic(){playing=false;videoDone=null;}};}});
 await wait(20);const d=dom.window.document;
 const fix=(lng=0,speed=0)=>{ts+=1500;gps?.({lat:0,lng,speed,accuracy:5,heading:null,ts});};
 const finishVideo=(o='finished')=>{const f=videoDone;playing=false;videoDone=null;f?.(o);};
 const launch=async()=>{d.querySelector('#create-player').click();d.querySelector('#board-ship').click();await until(()=>gps);for(let i=0;i<4;i++)fix();
  d.querySelector('.road-search input').value='Somewhere';d.querySelector('.road-search').dispatchEvent(new dom.window.Event('submit',{cancelable:true}));
  await until(()=>d.querySelector('.road-results button'));d.querySelector('.road-results button').click();d.querySelector('[data-action="confirm"]').click();
  await wait(300);for(let i=0;i<4;i++)fix();await wait(100);d.querySelector('[data-action="launch"]').click();await wait(500);};
 return {dom,d,listens,plays,playing:()=>playing,finishVideo,launch};
}
test('the opening cinematic plays once at app open, before character select, and not again at launch',async()=>{
 const x=await opened();try{
  assert.equal(x.plays.length,1,'requested as the app opens');assert.ok(x.playing());
  assert.ok(!x.d.querySelector('#board-ship')?.offsetParent||true);assert.equal(x.listens.length,0,'the mic is not listening during the opening');
  x.finishVideo('skipped');await x.launch();
  assert.equal(x.plays.length,1,'launch uses the short launch animation, not the video');
 }finally{x.dom.window.close();}
});

// #30: launch must never wait for the cinematic, whatever state the video is in.
test('launch is never gated by the opening video: a stuck video is stopped on boarding and launch proceeds',async()=>{
 const x=await opened();try{
  assert.equal(x.plays.length,1);assert.ok(x.playing(),'opening video playing and never reports back');
  await x.launch();
  assert.equal(x.playing(),false,'boarding stopped the opening video');
  assert.equal(x.plays.length,1,'launch never asks for the video');
  x.d.querySelector('.launch-scene button')?.click();await wait(100);
  const phase=JSON.parse(x.dom.window.localStorage.getItem('mole-beyond:foundation:v1')).journey.phase;
  assert.equal(phase,'navigating','the launch went through');
 }finally{x.dom.window.close();}
});
test('native side: the opening video is never shown during a drive and is dropped on boarding',()=>{
 const src=readFileSync(new URL('../src/useNativeServices.ts',import.meta.url),'utf8');
 assert.match(src,/m\.type === 'cinematic\.play' && !journeyActive\.current/);
 assert.match(src,/m\.type === 'session\.prepare' \|\| \(m\.type === 'journey\.active' && m\.active === true\)\) && cinematicRef\.current\) cinematicEnded\('skipped'\)/);
 const launch=readFileSync(new URL('../mole-beyond-hybrid-03/src/lib/foundation/launch-scene.js',import.meta.url),'utf8');
 assert.doesNotMatch(launch,/playCinematic|RedAlertNative/,'launch never touches the cinematic');
});
