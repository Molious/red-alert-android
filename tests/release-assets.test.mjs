import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {JSDOM,VirtualConsole} from 'jsdom';
const source=readFileSync(new URL('../src/hybridHtml.ts',import.meta.url),'utf8');
const html=JSON.parse(source.replace(/^export default /,'').trim().replace(/;$/,''));
test('bundled game is exactly what the in-repo game source builds',()=>{
 const r=spawnSync(process.execPath,['scripts/bundle-hybrid.mjs','--check'],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
 assert.equal(r.status,0,r.stderr||r.stdout);assert.match(r.stdout,/matches source/);
});
test('all 24 captain variants select distinct embedded WebP portraits',()=>{
 const dom=new JSDOM(html,{url:'https://vox-star-command.base44.app/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:new VirtualConsole(),beforeParse(w){w.structuredClone=structuredClone;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.SVGSVGElement.prototype.createSVGRect=()=>({});}});
 try{
  const d=dom.window.document;d.querySelector('#create-player').click();const portraits=new Set();
  for(const species of ['human','reptilian','insectoid','light-being'])for(const gender of ['male','female'])for(const role of ['military','support','explorer']){
   for(const [id,value] of [['player-species',species],['player-gender',gender],['player-occupation',role]]){const e=d.getElementById(id);e.value=value;e.dispatchEvent(new dom.window.Event('change',{bubbles:true}));}
   const src=d.getElementById('player-portrait').src;assert.match(src,/^data:image\/webp;base64,/);
   const bytes=Buffer.from(src.split(',')[1],'base64');assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');portraits.add(src);
  }
  assert.equal(portraits.size,24);
  for(const crew of ['mags','vex','wraith','silas','bastion']){
   assert.ok(d.querySelector(`[data-seat-crew="${crew}"]`),crew);
   assert.match(html,new RegExp('\\.seated-crew\\[data-seat-crew='+crew+'\\]\\{background-image:url\\(data:image/webp;base64,'));
  }
 }finally{dom.window.close();}
});
test('release metadata and visible native version consistently identify 1.0.28',()=>{
 const read=name=>JSON.parse(readFileSync(new URL('../'+name,import.meta.url),'utf8'));
 const app=read('app.json').expo,packageJson=read('package.json'),lock=read('package-lock.json');
 assert.equal(app.version,'1.0.28');assert.equal(app.android.versionCode,29);assert.equal(app.android.package,'com.molious.molebeyondtest');
 assert.equal(packageJson.version,app.version);assert.equal(lock.version,app.version);assert.equal(lock.packages[''].version,app.version);
 assert.match(readFileSync(new URL('../App.tsx',import.meta.url),'utf8'),/LIVE COCKPIT · 1\.0\.28/);
});
