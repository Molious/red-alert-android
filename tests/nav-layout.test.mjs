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
  assert.ok(nav.querySelector('.mole-orient'));
  const credit=d.querySelector('.mole-map-credit');assert.match(credit.textContent,/© OpenStreetMap contributors.*OpenFreeMap/);assert.equal(credit.parentElement,nav.closest('.viewport'));
  const btn=nav.querySelector('.mole-orient');assert.equal(btn.textContent,'Heading up');
  btn.click();assert.equal(btn.textContent,'North up');assert.equal(dom.window.localStorage.getItem('mole-beyond:map-orient'),'north');
  btn.click();assert.equal(dom.window.localStorage.getItem('mole-beyond:map-orient'),'heading');
  assert.doesNotMatch(navLayoutCss,/rotateX|--map-rot|leaflet-tile-pane/);
  assert.match(navLayoutCss,/mask-image/);
 }finally{dom.window.close();}
});
test('map presentation no longer intercepts native GPS or rotates the DOM',()=>{
 assert.ok(!navLayoutScript.includes('__moleTapFix'));assert.ok(!navLayoutScript.includes('--map-rot'));
 assert.ok(navLayoutScript.includes('mole-map-orientation'));
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
test('compact tray keeps Resume story reachable and surfaces journey warnings',async()=>{
 assert.ok(!/\[data-action=resume-story\]/.test(navLayoutCss.split('\n').find(l=>l.includes('data-action=pause-story'))||''));
 const {dom,d}=await cockpit();
 try{
  const status=d.querySelector('.cockpit-dashboard .road-status');
  status.textContent='Journey paused: test';await tick();assert.ok(status.classList.contains('mole-alert'));
  status.textContent='Navigating to Ann Street';await tick();assert.ok(!status.classList.contains('mole-alert'));
 }finally{dom.window.close();}
});
test('microphone is tap-to-talk: auto hands-free is switched off and one command turns it off again',async()=>{
 const vc=new VirtualConsole();let heard=null,listens=0;
 const dom=new JSDOM(game.replace('</head>',()=>'<script>'+navLayoutScript+'</script></head>'),{url:'https://vox-star-command.base44.app/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.structuredClone=structuredClone;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.SVGSVGElement.prototype.createSVGRect=()=>({});
  w.RedAlertNative={speakRequest(t,done){setTimeout(()=>done('played'),0);return 1},cancelSpeech(){},watchPosition(){return 7},clearWatch(){},searchAddress(t,cb){cb([],null);return 8},cancelSearch(){},
   prepareSession(cb){setTimeout(()=>cb({speechReady:true,locationGranted:true,microphoneGranted:true}),0);return 3},cancelPreparation(){},
   listenOnce(cb){listens++;heard=cb;return 9},cancelListen(){heard=null}};}});
 const d=dom.window.document;
 try{
  d.querySelector('#create-player').click();d.querySelector('#board-ship').click();
  await tick(800);
  const mic=d.querySelector('.navigation-strip [data-action=voice]');
  assert.equal(mic.getAttribute('aria-pressed'),'false','hands-free auto start is switched off');
  const before=listens;mic.click();await tick(500);
  assert.equal(mic.getAttribute('aria-pressed'),'true');assert.ok(listens>before,'tap opens the mic');
  heard?.('repeat direction',null);await tick(400);
  assert.equal(mic.getAttribute('aria-pressed'),'false','mic switches off after one command');
  const after=listens;await tick(800);assert.equal(listens,after,'mic does not reopen by itself');
 }finally{dom.window.close();}
});
test('character screen offers to end a leftover route so the captain can be changed',async()=>{
 const vc=new VirtualConsole();let gps;
 const route={code:'Ok',routes:[{geometry:{type:'LineString',coordinates:[[0,0],[.001,0]]},distance:111,duration:20,legs:[{steps:[{maneuver:{type:'depart',location:[0,0]},name:'A',distance:111},{maneuver:{type:'arrive',location:[.001,0]},distance:0}]}]}]};
 const dom=new JSDOM(game.replace('</head>',()=>'<script>'+navLayoutScript+'</script></head>'),{url:'https://vox-star-command.base44.app/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.structuredClone=structuredClone;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.SVGSVGElement.prototype.createSVGRect=()=>({});w.fetch=async()=>({ok:true,json:async()=>route});
  w.RedAlertNative={speakRequest(t,done){setTimeout(()=>done('played'),0);return 1},cancelSpeech(){},watchPosition(cb){gps=cb;return 7},clearWatch(){},searchAddress(t,cb){cb([{label:'Somewhere',lat:0,lng:.001}],null);return 8},cancelSearch(){},listenOnce(){return 9},cancelListen(){}};}});
 const d=dom.window.document;
 try{
  d.querySelector('#create-player').click();d.querySelector('#player-name').value='Cory';d.querySelector('#board-ship').click();await tick(80);
  gps({lat:0,lng:0,speed:0,accuracy:5,heading:null,ts:Date.now()});
  const input=d.querySelector('.road-search input');input.value='Somewhere';d.querySelector('.road-search').dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await tick(40);
  d.querySelector('.road-results button').click();d.querySelector('[data-action="confirm"]').click();await tick(80);
  d.querySelector('.home-menu').click();await tick(20);d.querySelector('#create-player').click();await tick(40);
  assert.equal(d.getElementById('player-name').disabled,true,'route locks the character');
  const end=d.getElementById('mole-end-route');assert.ok(end&&!end.hidden);
  end.click();await tick(200);
  assert.equal(d.getElementById('player-name').disabled,false,'character can be changed after ending the route');
  assert.ok(d.getElementById('mole-end-route').hidden);
 }finally{dom.window.close();}
});
test('time parked before launch does not count: launching always opens the navigation cockpit',async()=>{
 const {dom,d}=await cockpit();
 try{
  const view=d.querySelector('.live-cockpit .viewport'),phase=d.querySelector('[data-phase]'),speed=d.querySelector('.cockpit-dashboard [data-speed]');
  speed.textContent='0';phase.textContent='route ready';
  const realNow=dom.window.Date.now;let offset=0;dom.window.Date.now=()=>realNow()+offset;
  offset=60000;await tick(1100);
  phase.textContent='launching';await tick(1100);phase.textContent='navigating';await tick(1100);
  assert.equal(view.dataset.navMode,'on','just launched: cockpit, not bridge');
  offset+=31000;await tick(1100);assert.equal(view.dataset.navMode,'off','stopped 30 s mid-journey: bridge');
  speed.textContent='20';await tick(1100);assert.equal(view.dataset.navMode,'on','moving again: cockpit');
 }finally{dom.window.close();}
});
