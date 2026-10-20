import test from 'node:test';import assert from 'node:assert/strict';import {playLaunch} from '../src/lib/foundation/launch-scene.js';
function fixture(){const button={},scene={className:'',innerHTML:'',setAttribute(){},querySelector:()=>button,remove(){this.removed=true}},container={ownerDocument:{createElement:()=>scene,defaultView:{matchMedia:()=>({matches:false})}},append(n){this.child=n}};return {button,scene,container};}
test('launch skips and times out once; cancellation never completes a journey',()=>{const f=fixture();let timer,finished=0,cancelled=0;const run=playLaunch({container:f.container,onFinish:()=>finished++,onCancel:()=>cancelled++,schedule:cb=>{timer=cb;return 1},cancelTimer(){}});f.button.onclick();timer();assert.equal(finished,1);assert.equal(f.scene.removed,true);const g=fixture();const second=playLaunch({container:g.container,onFinish:()=>finished++,onCancel:()=>cancelled++,schedule:()=>1,cancelTimer(){}});second.cancel();second.cancel();assert.equal(cancelled,1);assert.equal(finished,1);});

// #19: the native opening cinematic.
function nativeFake(){const calls=[];let done=null,next=0;return {calls,end:o=>done&&done(o),native:{playCinematic(cb){done=cb;calls.push('play');return ++next;},stopCinematic(id){calls.push('stop:'+id);done=null;}}};}
test('native cinematic: finishing calls onFinish exactly once',()=>{
 const f=fixture(),n=nativeFake();let finished=0,cancelled=0,timer;
 playLaunch({container:f.container,native:n.native,onFinish:()=>finished++,onCancel:()=>cancelled++,schedule:cb=>{timer=cb;return 1},cancelTimer(){}});
 assert.deepEqual(n.calls,['play']);assert.equal(f.container.child,undefined,'no HTML scene over the native video');
 n.end('finished');n.end('finished');timer();
 assert.equal(finished,1);assert.equal(cancelled,0);
});
test('native cinematic: moving off stops the video and never calls onFinish',()=>{
 const f=fixture(),n=nativeFake();let finished=0,cancelled=0;
 const run=playLaunch({container:f.container,native:n.native,onFinish:()=>finished++,onCancel:()=>cancelled++,schedule:()=>1,cancelTimer(){}});
 run.cancel();run.cancel();n.end('finished');
 assert.deepEqual(n.calls,['play','stop:1']);assert.equal(finished,0);assert.equal(cancelled,1);
});
test('native cinematic: a video that errors or never reports back still finishes the launch',()=>{
 const f=fixture(),n=nativeFake();let finished=0,timer;
 playLaunch({container:f.container,native:n.native,onFinish:()=>finished++,schedule:cb=>{timer=cb;return 1},cancelTimer(){}});
 n.end('error');assert.equal(finished,1,'error ends it');
 const g=fixture(),m=nativeFake();let done2=0,t2;
 playLaunch({container:g.container,native:m.native,onFinish:()=>done2++,schedule:cb=>{t2=cb;return 1},cancelTimer(){}});
 t2();assert.equal(done2,1,'backstop timer ends it');assert.deepEqual(m.calls,['play','stop:1']);
 const h=fixture();let done3=0;playLaunch({container:h.container,native:{playCinematic(){throw Error('no player')},stopCinematic(){}},onFinish:()=>done3++,schedule:()=>1,cancelTimer(){}});
 assert.equal(done3,1,'a broken bridge never blocks the launch');
});
