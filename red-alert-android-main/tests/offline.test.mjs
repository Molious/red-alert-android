import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {APP_ORIGIN,CHANNEL} from '../src/bridgeProtocol.ts';
import {nativeBridgeScript} from '../src/nativeBridgeScript.ts';
test('packaged simulator has offline artwork, five portraits and no module fetches',()=>{
 const html=JSON.parse(readFileSync(new URL('../src/hybridHtml.ts',import.meta.url),'utf8').replace(/^export default /,'').trim().replace(/;$/,''));
 assert.match(html,/Create delivery offer/);
 assert.match(html,/data:image\/webp;base64,/);
 assert.ok((html.match(/data:image\/webp;base64,/g)||[]).length>=10);
 assert.doesNotMatch(html,/<script[^>]+src=|<link[^>]+href=|import\.meta/);
});
test('only the current native document can confirm microphone readiness',()=>{
 const messages=[],seen=[];const win={location:{origin:APP_ORIGIN},ReactNativeWebView:{postMessage:s=>messages.push(JSON.parse(s))},dispatchEvent:e=>seen.push(e.type)};
 class Event {constructor(type){this.type=type;}}
 vm.runInNewContext(nativeBridgeScript,{window:win,location:win.location,Event,CustomEvent:Event});
 const b=win.RedAlertNative,id=b.listenOnce(()=>{}),doc=messages[0].doc;
 b.receive({channel:CHANNEL,doc:'wrong',id,type:'voice.started'});assert.equal(seen.includes('test-mic-ready'),false);
 b.receive({channel:CHANNEL,doc,id,type:'voice.started'});assert.equal(seen.filter(e=>e==='test-mic-ready').length,1);
});

