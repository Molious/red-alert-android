import test from 'node:test';
import assert from 'node:assert/strict';
// Minimal DOM port tests event wiring, not browser rendering or speech output.
class Element {
 constructor(){this.children=[];this.textContent='';this.value='';this.disabled=false;this.events={};}
 append(e){this.children.push(e);} prepend(e){this.children.unshift(e);} replaceChildren(){this.children=[];}
 setAttribute(){} addEventListener(type,fn){this.events[type]=fn;}
 click(){if(!this.disabled)(this.onclick||this.events.click)?.();}
}
test('legacy simulator remains isolated and drives a saved mission from offer to payout',async()=>{
 const elements=new Map();const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
 const data=new Map();const timers=[];const step=()=>timers.forEach(fn=>fn());const events={};
 globalThis.localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 globalThis.document={hidden:false,getElementById:get,createElement:()=>new Element(),querySelectorAll:()=>[],addEventListener:(k,v)=>{(events[k]??=[]).push(v);}};
 const windowEvents={};globalThis.window={addEventListener:(k,v)=>{(windowEvents[k]??=[]).push(v);}};
 const original=globalThis.setInterval;globalThis.setInterval=fn=>{timers.push(fn);return timers.length;};
 try{
 await import('../src/lib/foundation/legacy-simulator.js');
 const click=text=>{const button=get('controls').children.find(e=>e.textContent===text);assert.ok(button,`Missing ${text}`);button.click();};
 click('Create delivery offer');click('Accept delivery');click('Simulate departure');
 assert.equal(get('status').textContent,'EN ROUTE');assert.equal(get('speed-readout').textContent,48);
 assert.equal(get('controls').children.find(e=>e.textContent==='Simulate arrival').disabled,true);
 step();assert.ok(get('route-progress').value>0);
 document.hidden=true;events.visibilitychange.forEach(fn=>fn());assert.equal(get('speed-readout').textContent,0);
 document.hidden=false;get('pause-travel').click();for(let i=0;i<25;i++)step();
 assert.equal(get('route-progress').value,100);assert.equal(get('speed-readout').textContent,0);
 click('Simulate arrival');click('Complete delivery');assert.equal(get('credits').textContent,80);
 assert.equal(get('error').textContent,'');assert.equal(JSON.parse([...data.values()][0]).credits,80);
 let heard;window.RedAlertNative={listenOnce:done=>{heard=done;return 1;},cancelListen(){},speak(){}};
 get('start-test').click();assert.match(get('test-status').textContent,/Preparing microphone/);
 step();assert.equal(get('credits').textContent,80); // never starts before microphone readiness
 windowEvents['test-mic-ready'].forEach(fn=>fn());
 step();const expectedCredits=80+JSON.parse([...data.values()][0]).mission.reward;
 for(let i=0;i<100;i++)step();
 assert.equal(get('credits').textContent,expectedCredits);
 assert.match(get('test-status').textContent,/completed/);
 get('start-test').click();windowEvents['test-mic-ready'].forEach(fn=>fn());
 heard('stop test',null);const state=get('status').textContent;step();assert.equal(get('status').textContent,state);
 assert.match(get('test-status').textContent,/voice-stop/);
 get('export-test').click();assert.match(get('test-report').textContent,/voice-stop/);
 delete window.RedAlertNative;get('start-visual-test').click();assert.match(get('test-status').textContent,/running automatically/);for(let i=0;i<100;i++)step();assert.match(get('test-status').textContent,/completed/);

 }finally{globalThis.setInterval=original;}
});

