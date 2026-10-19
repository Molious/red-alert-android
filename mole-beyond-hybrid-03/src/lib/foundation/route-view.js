import {SALVAGE_VIDEO} from './salvage-video.js';
import {scanSalvage,recoverSalvage} from './space-map.js';
import {MAP_ASSETS} from './map-assets.js';
// Fictional chart coordinates only. This is never a road-navigation source.
const POINTS=[[90,260],[220,260],[220,180],[390,180],[390,100],[540,100],[600,65]];
export function routePoint(progress){
 const p=Number.isFinite(progress)?Math.max(0,Math.min(1,progress)):0;
 const lengths=POINTS.slice(1).map((v,i)=>Math.hypot(v[0]-POINTS[i][0],v[1]-POINTS[i][1]));
 let distance=p*lengths.reduce((a,b)=>a+b,0);
 for(let i=0;i<lengths.length;i++){
  if(distance<=lengths[i]||i===lengths.length-1){const a=POINTS[i],b=POINTS[i+1],f=distance/lengths[i];return {x:a[0]+(b[0]-a[0])*f,y:a[1]+(b[1]-a[1])*f,angle:Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI};}
  distance-=lengths[i];
 }
}
export function installRouteView(){
 if(!document.querySelector)return ()=>{};
 const viewport=document.querySelector('.viewport'),chart=document.createElement('div');chart.className='windscreen-map space-chart';
 const stars=Array.from({length:110},(_,i)=>`<circle cx="${(i*173+29)%700}" cy="${(i*97+13)%320}" r="${i%9===0?1.1:.5}" fill="${i%3?'#a2b8d0':'#fff'}" opacity="${.25+(i%5)*.13}"/>`).join('');
 chart.innerHTML=`<span class="map-label">DEMO SECTOR · FICTIONAL ROADS & LOCATIONS</span><svg viewBox="0 0 700 320" role="img" aria-label="Space map with fictional star lanes, spaceports, refuelling stations and scanned salvage"><defs><radialGradient id="deep-space"><stop stop-color="#241546" stop-opacity=".6"/><stop offset="1" stop-color="#020308"/></radialGradient><radialGradient id="hole-halo"><stop stop-color="#000" offset=".4"/><stop stop-color="#b9804a" offset=".56"/><stop stop-color="#674a83" stop-opacity=".25" offset=".7"/><stop stop-color="#000" stop-opacity="0" offset="1"/></radialGradient><linearGradient id="comet"><stop stop-color="#9adaff" stop-opacity="0"/><stop offset="1" stop-color="#bff6ff"/></linearGradient></defs><rect width="700" height="320" fill="#020409"/><path d="M610 0H700V320H565Q625 230 570 170Q630 80 610 0Z" fill="url(#deep-space)"/>${stars}<g opacity=".65"><ellipse cx="650" cy="205" rx="42" ry="23" fill="url(#hole-halo)" transform="rotate(-20 650 205)"/><ellipse cx="650" cy="205" rx="13" ry="9" fill="#000"/><path d="M585 28L645 48" stroke="url(#comet)" stroke-width="2"/><circle cx="645" cy="48" r="1.5" fill="#cffaff"/></g><g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M20 260H565M90 40V300M220 85V300M60 180H540M390 30V270M280 100H600M540 45V290M220 260L305 300M390 180L460 235H540" stroke="#1f344b" stroke-width="5"/><polyline points="90,260 220,260 220,180 390,180 390,100 540,100 600,65" stroke="#4e3684" stroke-opacity=".5" stroke-width="12"/><polyline points="90,260 220,260 220,180 390,180 390,100 540,100 600,65" stroke="#99f4ff" stroke-width="3"/></g><g data-map-pois></g><g data-scan-wave></g><g data-salvage-signals></g><g data-route-ship><circle r="13" fill="#0c192f" stroke="#bafaff" stroke-width="1.5"/><path d="M11 0L-8 -6L-4 0L-8 6Z" fill="#efffff"/></g><text x="615" y="280" fill="#6c6092" font-size="9" text-anchor="middle" letter-spacing="2">DEEP SPACE</text></svg>`;
 viewport.append(chart);
 const toolbar=document.createElement('section');toolbar.className='space-map-tools';toolbar.setAttribute('aria-label','Space map simulator controls');toolbar.innerHTML='<div><button id="map-expand">Expand map</button><button id="map-scan">Request scan</button><button id="map-decline" hidden>Decline scan</button><button id="map-retrieve" disabled>Send Max</button></div><p id="map-scan-status" role="status">Demo map · scan for nearby salvage. No real businesses or GPS connected.</p>';viewport.after(toolbar);
 const cinema=document.createElement('div');cinema.className='salvage-cinema';cinema.hidden=true;cinema.setAttribute('role','dialog');cinema.setAttribute('aria-label','Max salvage timing animatic');cinema.innerHTML='<div><video muted playsinline preload="metadata" aria-label="Max launches, captures salvage and returns"></video><button type="button">Close preview</button><p>Placeholder animatic · simulator only</p></div>';document.body.append(cinema);const video=cinema.querySelector('video');video.src=SALVAGE_VIDEO;
 const closeCinema=()=>{video.pause();cinema.hidden=true;};cinema.querySelector('button').onclick=closeCinema;document.getElementById('stop-test')?.addEventListener('click',closeCinema);document.addEventListener('visibilitychange',()=>{if(document.hidden)closeCinema();});window.addEventListener('pagehide',closeCinema);

 const marker=chart.querySelector('[data-route-ship]'),signals=chart.querySelector('[data-salvage-signals]');let position=routePoint(0),found=[],collected=[],busy=false,scanning=false,scanToken=0,scanPending=false,lastPromptProgress=-1;
 const status=toolbar.querySelector('#map-scan-status'),retrieve=toolbar.querySelector('#map-retrieve');
 const say=(character,text)=>window.dispatchEvent(new CustomEvent('crew-map-line',{detail:{character,text}}));
 const pois=[{kind:'spaceport',x:90,y:260,name:'MCDONALD’S · DEMO'},{kind:'spaceport',x:390,y:180,name:'KFC · DEMO'},{kind:'spaceport',x:540,y:100,name:'HUNGRY JACK’S · DEMO'},{kind:'spaceport',x:600,y:65,name:'GYG · DEMO'},{kind:'refuel',x:220,y:180,name:'REFUEL · DEMO'}];
 chart.querySelector('[data-map-pois]').innerHTML=pois.map(p=>`<g><image href="${MAP_ASSETS[p.kind]}" x="${p.x-18}" y="${p.y-32}" width="36" height="36"/><text x="${p.x}" y="${p.y+15}" text-anchor="middle" fill="${p.kind==='refuel'?'#99e9f0':'#e7c790'}" font-size="7" paint-order="stroke" stroke="#020409" stroke-width="3">${p.name}</text></g>`).join('');
 function draw(){signals.innerHTML=found.map(s=>`<g><circle cx="${s.x}" cy="${s.y}" r="18" fill="none" stroke="#d2aa61" stroke-dasharray="3 4"/><image href="${MAP_ASSETS.salvage}" x="${s.x-14}" y="${s.y-14}" width="28" height="28"/></g>`).join('');retrieve.disabled=busy||scanning||!found.length;retrieve.textContent=found.length?'Send Max · '+found[0].label:'Send Max';}
 toolbar.querySelector('#map-expand').onclick=e=>{const expanded=viewport.classList.toggle('map-expanded');e.target.textContent=expanded?'Cockpit view':'Expand map';};
 const scanButton=toolbar.querySelector('#map-scan'),wave=chart.querySelector('[data-scan-wave]');
 function cancelScan(){scanToken++;scanning=false;scanButton.disabled=false;wave.replaceChildren();draw();}
 const decline=toolbar.querySelector('#map-decline');
 function requestScan(){if(busy||scanning||scanPending)return;scanPending=true;scanButton.textContent='Authorize scan';decline.hidden=false;status.textContent='Silas: Possible salvage nearby, Captain. Permission to scan?';say('SILAS','Possible salvage nearby, Captain. Permission to scan?');}
 decline.onclick=()=>{scanPending=false;decline.hidden=true;scanButton.textContent='Request scan';status.textContent='Silas: Understood, Captain. Scan deferred.';};
 function beginScan(){
  if(busy||scanning||!scanPending)return;scanPending=false;decline.hidden=true;scanButton.textContent='Scanning…';
  const token=++scanToken,origin={...position},targets=scanSalvage(origin,collected);scanning=true;scanButton.disabled=true;found=[];draw();
  status.textContent='Silas: Scanning sector…';
  wave.innerHTML=`<circle cx="${origin.x}" cy="${origin.y}" r="150" class="sensor-wave" fill="#86efff" fill-opacity=".04" stroke="#a6f4ff" stroke-width="1.5"/><circle cx="${origin.x}" cy="${origin.y}" r="5" fill="#bdf9ff"/>`;
  for(const target of targets)setTimeout(()=>{if(token!==scanToken)return;found.push(target);draw();},2000*Math.hypot(target.x-origin.x,target.y-origin.y)/150);
  setTimeout(()=>{if(token!==scanToken)return;scanning=false;scanButton.disabled=false;scanButton.textContent='Request scan';wave.replaceChildren();draw();const text=found.length?`${found.length} salvage signal${found.length===1?'':'s'} in range. ${found[0].label} marked for Max.`:'No new salvage in range. Continue the simulated route and scan again.';status.textContent='Silas: '+text;say('SILAS',text);},2000);
 };
 scanButton.onclick=()=>scanPending?beginScan():requestScan();
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelScan();});window.addEventListener('pagehide',cancelScan);

 retrieve.onclick=()=>{if(busy||scanning||!found.length)return;const target=found[0];busy=true;draw();cinema.hidden=false;video.currentTime=0;video.play().catch(()=>{status.textContent='Max: Shuttle deployed. Video playback unavailable; retrieval continues.';});status.textContent='Max: Shuttle away. Retrieving '+target.label+'.';say('MAX','Shuttle away, Captain. I’ll bring it home.');setTimeout(()=>{try{collected=recoverSalvage(target.id,collected,position);found=scanSalvage(position,collected);status.textContent=`Max: ${target.label} recovered · ${target.units} demo salvage units. Shuttle returned.`;say('MAX',`${target.label} recovered, Captain. Shuttle back aboard.`);}catch(e){status.textContent='Max: Recovery cancelled. Target moved out of range.';}finally{busy=false;closeCinema();draw();}},5000);};
 return progress=>{position=routePoint(progress);if(progress>0&&progress-lastPromptProgress>=.15&&!viewport.closest('main').hidden&&!busy&&!scanning&&!scanPending&&!found.length&&scanSalvage(position,collected).length){lastPromptProgress=progress;requestScan();}marker.setAttribute('transform',`translate(${position.x} ${position.y}) rotate(${position.angle})`);if(!busy&&!scanning){found=found.filter(s=>scanSalvage(position,collected).some(t=>t.id===s.id));draw();}};
}
