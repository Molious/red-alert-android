import test from 'node:test';import assert from 'node:assert/strict';
import {scanSalvage,recoverSalvage} from '../src/lib/foundation/space-map.js';
test('scans reveal at most two nearby uncollected signals and recovery is idempotent',()=>{
 const signals=scanSalvage({x:220,y:180},[]);assert.ok(signals.length>0&&signals.length<=2);const target=signals[0];const collected=recoverSalvage(target.id,[],{x:220,y:180});assert.deepEqual(recoverSalvage(target.id,collected,{x:220,y:180}),collected);assert.ok(!scanSalvage({x:220,y:180},collected).some(s=>s.id===target.id));
 assert.throws(()=>recoverSalvage('unknown',[],{x:0,y:0}),/signal/);assert.throws(()=>recoverSalvage(target.id,[],{x:-999,y:-999}),/range/);
});
