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

// #19 + #25: the always-on mic must not hear the cinematic's soundtrack, and must come back afterwards.
import {JSDOM,VirtualConsole} from 'jsdom';
const route={code:'Ok',routes:[{geometry:{type:'LineString',coordinates:[[0,0],[.01,0]]},distance:1100,duration:120,legs:[{steps:[{maneuver:{type:'depart',location:[0,0]},name:'A',distance:1100},{maneuver:{type:'arrive',location:[.01,0]},distance:0}]}]}]};
const wait=ms=>new Promise(r=>setTimeout(r,ms));const until=async(f,ms=4000)=>{const e=Date.now()+ms;while(Date.now()<e){if(f())return true;await wait(10);}return false;};
async function launched(){
 const html=JSON.parse(readFileSync(new URL('../src/hybridHtml.ts',import.meta.url),'utf8').replace(/^export default /,'').trim().replace(/;$/,''));
 let ts=100000,gps,playing=false,videoDone=null;const listens=[];
 const dom=new JSDOM(html,{url:'https://vox-star-command.base44.app/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:new VirtualConsole(),beforeParse(w){
  w.structuredClone=structuredClone;w.Date.now=()=>ts;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.SVGSVGElement.prototype.createSVGRect=()=>({});w.fetch=async()=>({ok:true,json:async()=>route});
  w.RedAlertNative={speakRequest(t,done){w.setTimeout(()=>done('played'),0);return 1},cancelSpeech(){},watchPosition(cb){gps=cb;return 7},clearWatch(){},searchAddress(t,cb){cb([{label:'Somewhere',lat:0,lng:.01}],null);return 8},cancelSearch(){},
   listenOnce(cb){listens.push(playing);return 100+listens.length},cancelListen(){},playCinematic(done){playing=true;videoDone=done;return 1},stopCinematic(){playing=false;videoDone=null;}};}});
 await wait(10);const d=dom.window.document;d.querySelector('#create-player').click();d.querySelector('#board-ship').click();
 const fix=(lng=0,speed=0)=>{ts+=1500;gps?.({lat:0,lng,speed,accuracy:5,heading:null,ts});};
 await until(()=>gps);for(let i=0;i<4;i++)fix();
 d.querySelector('.road-search input').value='Somewhere';d.querySelector('.road-search').dispatchEvent(new dom.window.Event('submit',{cancelable:true}));
 await until(()=>d.querySelector('.road-results button'));d.querySelector('.road-results button').click();d.querySelector('[data-action="confirm"]').click();
 await wait(300);for(let i=0;i<4;i++)fix();await wait(100);d.querySelector('[data-action="launch"]').click();
 await until(()=>playing);await wait(1000);
 return {dom,listens,fix,playing:()=>playing,finishVideo:()=>{const f=videoDone;playing=false;videoDone=null;f?.('finished');}};
}
test('the open mic pauses while the cinematic plays and comes back when it ends',async()=>{
 const x=await launched();try{
  assert.ok(x.playing(),'cinematic playing');assert.equal(x.listens.filter(Boolean).length,0,'no listening during the video');
  const k=x.listens.length;x.finishVideo();assert.ok(await until(()=>x.listens.length>k),'listening again after the video');
 }finally{x.dom.window.close();}
});
test('moving off stops the cinematic and the open mic comes back',async()=>{
 const x=await launched();try{
  const k=x.listens.length;x.fix(.0005,6);
  assert.ok(await until(()=>!x.playing()),'video stopped');assert.ok(await until(()=>x.listens.length>k),'listening again');
  assert.equal(x.listens.filter(Boolean).length,0);
 }finally{x.dom.window.close();}
});
