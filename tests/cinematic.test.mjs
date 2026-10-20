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
