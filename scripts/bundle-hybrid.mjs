import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(process.argv.slice(2).find(a=>!a.startsWith('--'))||'mole-beyond-hybrid-03');
const foundation=path.join(root,'src/lib/foundation');
const portraits={};
for(const id of ['mags','vex','wraith','silas','bastion'])portraits[id]='data:image/webp;base64,'+(await readFile(path.join(foundation,`red-alert/pilots/${id}-narrative.webp`))).toString('base64');
const playerPortraits={};
for(const id of ['human-female-explorer', 'human-female-military', 'human-female-support', 'human-male-explorer', 'human-male-military', 'human-male-support', 'insectoid-female-explorer', 'insectoid-female-military', 'insectoid-female-support', 'insectoid-male-explorer', 'insectoid-male-military', 'insectoid-male-support', 'light-being-female-explorer', 'light-being-female-military', 'light-being-female-support', 'light-being-male-explorer', 'light-being-male-military', 'light-being-male-support', 'reptilian-female-explorer', 'reptilian-female-military', 'reptilian-female-support', 'reptilian-male-explorer', 'reptilian-male-military', 'reptilian-male-support'])playerPortraits[id]='data:image/webp;base64,'+(await readFile(path.join(foundation,`player-portraits/${id}.webp`))).toString('base64');
const mapAssets={};
for(const id of ['spaceport','refuel','salvage'])mapAssets[id]='data:image/webp;base64,'+(await readFile(path.join(foundation,`map-assets/${id}.webp`))).toString('base64');
const salvageVideo='data:video/mp4;base64,'+(await readFile(path.join(foundation,'animatics/max-salvage.mp4'))).toString('base64');
const js=await build({tsconfigRaw:{compilerOptions:{}},entryPoints:[path.join(foundation,'simulator.js')],nodePaths:[path.resolve('node_modules')],minify:true,bundle:true,write:false,loader:{'.webp':'dataurl'},format:'iife',target:'es2020',plugins:[{name:'offline-portraits',setup(b){b.onLoad({filter:/salvage-video\.js$/},async()=>({contents:'export const SALVAGE_VIDEO='+JSON.stringify(salvageVideo)+';',loader:'js'}));b.onLoad({filter:/map-assets\.js$/},async()=>({contents:'export const MAP_ASSETS='+JSON.stringify(mapAssets)+';',loader:'js'}));b.onLoad({filter:/player-portraits\.js$/},async()=>({contents:'export const PLAYER_PORTRAITS='+JSON.stringify(playerPortraits)+';',loader:'js'}));b.onLoad({filter:/simulator\.js$/},async args=>({contents:(await readFile(args.path,'utf8')).replace('new URL(`./red-alert/pilots/${crew.id}-narrative.webp`,import.meta.url).href',`(${JSON.stringify(portraits)})[crew.id]`),loader:'js',resolveDir:path.dirname(args.path)}));}}]});
const css=await build({tsconfigRaw:{compilerOptions:{}},entryPoints:[path.join(foundation,'simulator.css')],nodePaths:[path.resolve('node_modules')],minify:true,bundle:true,write:false,loader:{'.png':'dataurl','.webp':'dataurl'}});
let html=await readFile(path.join(root,'foundation.html'),'utf8');
html=html.replace(/<link rel="stylesheet"[^>]+>/,()=>`<style>${css.outputFiles[0].text}</style>`);
html=html.replace(/<script type="module"[^>]+><\/script>/,()=>`<script>${js.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')}</script>`);
html=html.replace('</head>',"<script>(function(){var failed=false;function report(type,message){try{window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({channel:'hybrid-boot-v1',type:type,message:String(message||'').slice(0,400)}));}catch(e){}}window.addEventListener('error',function(e){failed=true;report('error',e.message||'Game startup failed');});window.addEventListener('unhandledrejection',function(e){failed=true;report('error',e.reason&&e.reason.message||e.reason||'Game startup failed');});window.addEventListener('DOMContentLoaded',function(){if(!failed)report(document.querySelector('.opening-shell')?'ready':'error',document.querySelector('.opening-shell')?'':'Opening menu did not initialize');});})();</script>"+'</head>');
console.log('Document bytes',Buffer.byteLength(html));
if(Buffer.byteLength(html)>4*1024*1024)throw new Error('Offline game exceeded 4 MiB startup budget. Optimize assets before building.');
const out='export default '+JSON.stringify(html)+';\n';
if(process.argv.includes('--check')){const current=await readFile('src/hybridHtml.ts','utf8');if(current!==out)throw new Error('src/hybridHtml.ts is out of date with mole-beyond-hybrid-03. Run: node scripts/bundle-hybrid.mjs');console.log('Bundled game matches source.');process.exit(0);}
await writeFile('src/hybridHtml.ts',out);
console.log(`Bundled offline cockpit, scripts and five portraits (${Buffer.byteLength(html)} bytes).`);

