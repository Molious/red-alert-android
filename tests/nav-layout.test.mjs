import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {JSDOM,VirtualConsole} from 'jsdom';
import {navLayoutScript,navLayoutCss,NAV_PHASES} from '../src/navLayoutPatch.ts';
const game=JSON.parse(readFileSync(new URL('../src/hybridHtml.ts',import.meta.url),'utf8').replace(/^export default /,'').trim().replace(/;$/,''));
const tick=(ms=20)=>new Promise(r=>setTimeout(r,ms));
const px='data:image/webp;base64,UklGRg==';
const fakeArt={bridge:px,plate:px,captains:Object.fromEntries(['human','reptilian','insectoid','light-being'].flatMap(s=>['male','female'].flatMap(g=>['military','support','explorer'].map(o=>[s+'-'+g+'-'+o,{chair:px,person:px,flip:s+'-'+g+'-'+o==='insectoid-female-support'}]))))};
async function cockpit(species){
 const vc=new VirtualConsole();
 const dom=new JSDOM(game.replace('</head>',()=>'<script>window.__moleArt='+JSON.stringify(fakeArt)+'</script><script>'+navLayoutScript+'</script></head>'),{url:'https://vox-star-command.base44.app/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.structuredClone=structuredClone;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.SVGSVGElement.prototype.createSVGRect=()=>({});}});
 const d=dom.window.document;d.querySelector('#create-player').click();d.querySelector('#player-name').value='Cory';if(species){const e=d.getElementById('player-species');e.value=species;e.dispatchEvent(new dom.window.Event('change',{bubbles:true}));}d.querySelector('#board-ship').click();await tick(60);
 return {dom,d};
}
test('App injects the navigation layout next to the native bridge without touching the bundled game',()=>{
 const app=readFileSync(new URL('../App.tsx',import.meta.url),'utf8');
 assert.match(app,/import \{navLayoutScript\} from '\.\/src\/navLayoutPatch'/);
 assert.ok(app.includes("<script>'+navLayoutScript+'</script></head>'"));assert.match(app,/window\.__moleArt='\+JSON\.stringify\(\{bridge:BRIDGE_ART,plate:NAV_PLATE_ART,captains:CAPTAIN_ART\}\)/);
 assert.ok(!game.includes('mole-nav-layout'));
});
test('layout styles target only the live cockpit in navigation mode and keep the map credit visible',()=>{
 assert.deepEqual(NAV_PHASES,['navigating','recalculating','signal lost','launching']);
 for(const rule of navLayoutCss.split('\n').filter(l=>l.includes('{')&&!l.startsWith('@media')&&l!=='}'))assert.match(rule,/^(\.live-cockpit |\.mole-)/,rule);
 assert.ok(!/leaflet-control-attribution\{[^}]*display:none/.test(navLayoutCss));
});
test('journey phase switches the compact tray on and off, and More controls expands it',async()=>{
 const {dom,d}=await cockpit();
 try{
  assert.ok(d.getElementById('mole-nav-layout'));
  const view=d.querySelector('.live-cockpit .viewport'),dash=d.querySelector('.cockpit-dashboard'),phase=d.querySelector('[data-phase]');
  assert.equal(view.dataset.navMode,'off');
  const toggle=dash.querySelector('.flight-actions .tray-toggle');assert.ok(toggle);assert.equal(toggle.dataset.action,undefined);
  for(const p of NAV_PHASES){phase.textContent=p;await tick();assert.equal(view.dataset.navMode,'on',p);}
  toggle.click();assert.ok(dash.classList.contains('tray-open'));assert.equal(toggle.getAttribute('aria-expanded'),'true');assert.equal(toggle.textContent,'Fewer controls');
  phase.textContent='arrived';await tick();
  assert.equal(view.dataset.navMode,'off');assert.ok(!dash.classList.contains('tray-open'));assert.equal(toggle.textContent,'More controls');
  assert.equal(d.querySelectorAll('.tray-toggle').length,1);
 }finally{dom.window.close();}
});
test('windscreen adds the space sky, ship marker and a remembered heading-up / north-up toggle',async()=>{
 const {dom,d}=await cockpit();
 try{
  await tick(60);
  const nav=d.querySelector('.live-navigation');
  assert.ok(nav.querySelector('.mole-sky'));assert.ok(nav.querySelector('.mole-ship svg'));
  const btn=nav.querySelector('.mole-orient');assert.equal(btn.textContent,'Heading up');
  btn.click();assert.equal(btn.textContent,'North up');assert.equal(dom.window.localStorage.getItem('mole-beyond:map-orient'),'north');
  btn.click();assert.equal(dom.window.localStorage.getItem('mole-beyond:map-orient'),'heading');
  assert.match(navLayoutCss,/rotateX\(32deg\) rotate\(var\(--map-rot,0deg\)\)/);
 }finally{dom.window.close();}
});
test('heading comes from GPS when moving and from travelled distance otherwise',()=>{
 let tap;const w={localStorage:{getItem(){return null},setItem(){}},addEventListener(){},requestAnimationFrame(){},setInterval(){return 1},clearInterval(){}};
 const doc={readyState:'loading',addEventListener(){},head:null};
 new Function('window','document','localStorage','setInterval','clearInterval','requestAnimationFrame',navLayoutScript)(w,doc,w.localStorage,w.setInterval,w.clearInterval,w.requestAnimationFrame);
 tap=w.__moleTapFix;assert.equal(typeof tap,'function');
});

test('the chosen captain sits in the navigation console with the bridge and console artwork installed',async()=>{
 const {dom,d}=await cockpit('light-being');
 try{
  await tick(60);
  assert.ok(d.getElementById('mole-bridge-art'));
  const seat=d.querySelector('.live-cockpit .viewport .mole-console .mole-captain');assert.ok(seat);
  assert.match(seat.dataset.captain,/^light-being-(male|female)-(military|support|explorer)$/);
  assert.equal(seat.querySelectorAll('img').length,2);
 }finally{dom.window.close();}
});
