import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const moduleUrl=new URL('../mole-beyond-hybrid-03/src/lib/foundation/cosmic-navigation.js',import.meta.url);
test('cosmic map supports north/heading orientation, route coordinates, follow, recenter and cleanup',async()=>{
 assert.ok(existsSync(moduleUrl),'navigation needs a vector renderer');
 const {createCosmicNavigation,cosmicStyle}=await import(moduleUrl);
 const dom=new JSDOM('<section><div id="map"></div></section>',{url:'https://example.test'});
 const w=dom.window,handlers={},jumps=[],markers=[];let removed=false;
 class Map {constructor(options){this.options=options;this.sources={};this.zoom=16;this.bearing=0;this.canvas=w.document.createElement('canvas');}on(n,f){handlers[n]=f;return this;}getSource(n){return this.sources[n];}addSource(n,s){this.sources[n]={...s,setData(d){this.data=d;}};}addLayer(){}jumpTo(o){jumps.push(o);this.bearing=o.bearing;return this;}getZoom(){return this.zoom;}getBearing(){return this.bearing;}resize(){}remove(){removed=true;}getCanvas(){return this.canvas;}}
 class Marker {constructor(o){this.options=o;markers.push(this);}setLngLat(p){this.position=p;return this;}setRotation(r){this.rotation=r;return this;}addTo(){return this;}remove(){this.removed=true;}}
 const container=w.document.querySelector('#map');
 const view=createCosmicNavigation({maplibre:{Map,Marker},container,window:w,onStatus(){}});
 const s={journey:{phase:'navigating',destination:{lat:-26.79,lng:153.12}},route:{points:[[-26.8,153.1],[-26.79,153.12]]},fix:{lat:-26.8,lng:153.1,heading:90,speed:12},guidance:{valid:true}};
 view.update(s);handlers.load();
 assert.equal(jumps.at(-1).bearing,90);assert.equal(jumps.at(-1).pitch,57);
 assert.deepEqual(view.map.getSource('journey').data.features[0].geometry.coordinates,[[153.1,-26.8],[153.12,-26.79]]);
 assert.deepEqual(markers[0].position,[153.1,-26.8]);
 w.localStorage.setItem('mole-beyond:map-orient','north');w.dispatchEvent(new w.Event('mole-map-orientation'));
 assert.equal(jumps.at(-1).bearing,0);assert.equal(markers[0].rotation,90);
 handlers.dragstart();w.localStorage.setItem('mole-beyond:map-orient','heading');w.dispatchEvent(new w.Event('mole-map-orientation'));assert.equal(jumps.at(-1).bearing,90);assert.equal(jumps.at(-1).center,undefined);const count=jumps.length;view.update({...s,fix:{...s.fix,lng:153.11}});assert.equal(jumps.length,count);
 view.recenter(s);assert.equal(jumps.length,count+1);
 const previous=markers[0].position;view.update({...s,guidance:{valid:false},fix:{...s.fix,lng:154}});assert.equal(markers[0].position,previous);
 view.dispose();assert.ok(removed);dom.window.close();
 const style=cosmicStyle();assert.equal(style.version,8);assert.match(style.sources.openmaptiles.url,/tiles.openfreemap.org/);
 assert.ok(style.layers.some(x=>x.id==='energy-lanes'));assert.ok(style.layers.some(x=>x.id==='street-names'&&x.layout['text-rotation-alignment']==='viewport'));
});
test('cosmic style passes the real MapLibre validator before WebView startup',async()=>{
 const {validateStyleMin}=await import('@maplibre/maplibre-gl-style-spec');
 const {cosmicStyle}=await import(moduleUrl);
 assert.deepEqual(validateStyleMin(cosmicStyle()).map(e=>e.message),[]);
});
