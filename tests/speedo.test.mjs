// #31: current speed large and readable at a glance in the navigation cockpit, with the speed limit beside it.
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {JSDOM,VirtualConsole} from 'jsdom';
import {navLayoutScript,navLayoutCss} from '../src/navLayoutPatch.ts';
const game=JSON.parse(readFileSync(new URL('../src/hybridHtml.ts',import.meta.url),'utf8').replace(/^export default /,'').trim().replace(/;$/,''));
const tick=(ms=30)=>new Promise(r=>setTimeout(r,ms));

async function cockpit(){
 const dom=new JSDOM(game.replace('</head>',()=>'<script>'+navLayoutScript+'</script></head>'),{url:'https://vox-star-command.base44.app/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:new VirtualConsole(),beforeParse(w){w.structuredClone=structuredClone;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.SVGSVGElement.prototype.createSVGRect=()=>({});w.requestAnimationFrame=cb=>setTimeout(cb,0);}});
 const d=dom.window.document;d.querySelector('#create-player').click();d.querySelector('#board-ship').click();await tick(200);
 const dash=d.querySelector('.cockpit-dashboard'),box=()=>d.querySelector('.viewport>.mole-speedo');
 const set=(sel,v)=>{dash.querySelector(sel).textContent=v;};
 return {dom,d,box,set,num:()=>box().querySelector('[data-speedo-speed]').textContent,limit:()=>box().querySelector('[data-speedo-limit]').textContent};
}

test('the speedo mirrors current speed and the limit, and goes red when over',async()=>{
 const x=await cockpit();try{
  assert.ok(x.box(),'a speedo panel on the cockpit');
  assert.equal(x.box().parentElement,x.d.querySelector('.live-cockpit .viewport'),'on the viewport, above the windscreen frame art');
  x.set('[data-speed]','54');x.set('[data-limit]','60');await tick();
  assert.equal(x.num(),'54');assert.equal(x.limit(),'60');assert.equal(x.box().classList.contains('over'),false);
  assert.equal(x.box().getAttribute('aria-label'),'54 kilometres per hour, limit 60');
  x.set('[data-speed]','64');await tick();assert.equal(x.box().classList.contains('over'),false,'within 4 km/h: not flagged');
  x.set('[data-speed]','66');await tick();assert.equal(x.box().classList.contains('over'),true,'over by more than 4 km/h');
  x.set('[data-speed]','—');x.set('[data-limit]','—');await tick();
  assert.equal(x.num(),'—','unknown speed shows a dash, never a stale number');
  assert.ok(x.box().querySelector('.mole-speedo-limit').classList.contains('unknown'),'unknown limit is dimmed');
  assert.equal(x.box().classList.contains('over'),false);
 }finally{x.dom.window.close();}
});

test('only one speedo, however often the layout script re-runs',async()=>{
 const x=await cockpit();try{
  for(let i=0;i<5;i++){x.d.body.appendChild(x.d.createElement('div'));await tick(10);}
  assert.equal(x.d.querySelectorAll('.mole-speedo').length,1);
 }finally{x.dom.window.close();}
});

test('speedo styles: navigation mode only, large type, kept in its marked section',()=>{
 const start=navLayoutCss.indexOf('/* ---- #31 speedo'),end=navLayoutCss.indexOf('/* ---- end #31 speedo ---- */');
 assert.ok(start>=0&&end>start,'marked section for Chet');
 const css=navLayoutCss.slice(start,end);
 assert.match(css,/\.mole-speedo\{display:none\}/,'hidden outside navigation');
 assert.match(css,/viewport\[data-nav-mode=on\] \.mole-speedo\{display:flex/,'shown in navigation mode');
 const portrait=+/\[data-speedo-speed\]\{font:700 (\d+)px/.exec(css)[1],landscape=+/\[data-speedo-speed\]\{font-size:(\d+)px/.exec(css)[1];
 assert.ok(portrait>=48&&landscape>=44,`big numbers (portrait ${portrait}px, landscape ${landscape}px; was 17px)`);
 assert.match(css,/z-index:9/,'above the frame art (.mole-console is 4)');
 assert.match(css,/pointer-events:none/,'never blocks a tap');
});
