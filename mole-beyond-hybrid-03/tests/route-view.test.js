import test from 'node:test';
import assert from 'node:assert/strict';
import {routePoint} from '../src/lib/foundation/route-view.js';
test('map marker reaches both ends and remains bounded for invalid progress',()=>{
 assert.deepEqual(routePoint(0),{x:90,y:260,angle:0});
 assert.equal(routePoint(1).x,600);assert.ok(Math.abs(routePoint(1).y-65)<1e-8);
 assert.deepEqual(routePoint(-1),routePoint(0));assert.deepEqual(routePoint(Infinity),routePoint(0));
 assert.ok(routePoint(.5).x>90);assert.ok(routePoint(.5).x<600);
});
