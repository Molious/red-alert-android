import test from 'node:test';import assert from 'node:assert/strict';import {playLaunch} from '../src/lib/foundation/launch-scene.js';
function fixture(){const button={},scene={className:'',innerHTML:'',setAttribute(){},querySelector:()=>button,remove(){this.removed=true}},container={ownerDocument:{createElement:()=>scene,defaultView:{matchMedia:()=>({matches:false})}},append(n){this.child=n}};return {button,scene,container};}
test('launch skips and times out once; cancellation never completes a journey',()=>{const f=fixture();let timer,finished=0,cancelled=0;const run=playLaunch({container:f.container,onFinish:()=>finished++,onCancel:()=>cancelled++,schedule:cb=>{timer=cb;return 1},cancelTimer(){}});f.button.onclick();timer();assert.equal(finished,1);assert.equal(f.scene.removed,true);const g=fixture();const second=playLaunch({container:g.container,onFinish:()=>finished++,onCancel:()=>cancelled++,schedule:()=>1,cancelTimer(){}});second.cancel();second.cancel();assert.equal(cancelled,1);assert.equal(finished,1);});

// #19: the opening cinematic plays once at app open, before the title and character select.
import {playOpening} from '../src/lib/foundation/opening-cinematic.js';
function nativeFake(){const calls=[];let done=null,next=0;return {calls,end:o=>done&&done(o),native:{playCinematic(cb){done=cb;calls.push('play');return ++next;},stopCinematic(id){calls.push('stop:'+id);done=null;}}};}
test('opening cinematic: plays at app open and reports once (finished or tapped to skip)',()=>{
 for(const outcome of ['finished','skipped']){const n=nativeFake(),seen=[];let timer;
  playOpening({native:n.native,onDone:o=>seen.push(o),schedule:cb=>{timer=cb;return 1},cancelTimer(){}});
  n.end(outcome);n.end(outcome);timer();assert.deepEqual(n.calls,['play']);assert.deepEqual(seen,[outcome]);}
});
test('opening cinematic: never plays when a drive is being resumed, or without the native player',()=>{
 const n=nativeFake(),seen=[];playOpening({native:n.native,journeyActive:()=>true,onDone:o=>seen.push(o)});
 assert.deepEqual(n.calls,[],'no video over the map mid-journey');assert.deepEqual(seen,['skipped']);
 const s2=[];playOpening({native:undefined,onDone:o=>s2.push(o)});assert.deepEqual(s2,['skipped']);
});
test('opening cinematic: a stuck or broken player never blocks the app',()=>{
 const n=nativeFake(),seen=[];let timer;playOpening({native:n.native,onDone:o=>seen.push(o),schedule:cb=>{timer=cb;return 1},cancelTimer(){}});
 timer();assert.deepEqual(seen,['timeout']);assert.deepEqual(n.calls,['play','stop:1']);
 const s2=[];playOpening({native:{playCinematic(){throw Error('no player')}},onDone:o=>s2.push(o),schedule:()=>1,cancelTimer(){}});assert.deepEqual(s2,['error']);
});
