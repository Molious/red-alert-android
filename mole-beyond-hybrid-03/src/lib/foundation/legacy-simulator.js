import {installOpening} from './opening-scene.js';
import {installSeatedCrew} from './seated-crew.js';
import {installRouteView} from './route-view.js';
import {installCrewScreens} from './crew-screen.js';
import {createTestSession} from './autotest.js';
import {makeOffer,storyLine} from './stories.js';
import {CHARACTERS,characterById} from './red-alert/characters.js';
import {parseCommand} from './commands.js';
import { createMissionEngine } from './mission.js';
import { createDialogueQueue } from './dialogue.js';
const el=id=>document.getElementById(id);
const portraitFor=crew=>new URL(`./red-alert/pilots/${crew.id}-narrative.webp`,import.meta.url).href;
const updateRouteView=installRouteView();
const updateSeatedCrew=installSeatedCrew();
let engine; let enabled=true; let paused=true; let speed=48;
const log=text=>{const row=document.createElement('li');row.textContent=text;el('log').prepend(row);};
// Cancellation is part of the transport contract: stop speech before queue advances.
function play(item,signal){
 el('speaker').textContent=item.character||'CHET';el('caption').textContent=item.text;
 if(!enabled)return Promise.resolve();
 if(window.RedAlertNative){return new Promise(resolve=>{const n=window.RedAlertNative;let timer;const done=()=>{clearTimeout(timer);n.removeEventListener('hush',done);signal.removeEventListener('abort',cancel);resolve();};const cancel=()=>{n.hush();done();};n.addEventListener('hush',done);signal.addEventListener('abort',cancel,{once:true});timer=setTimeout(cancel,20000);if(signal.aborted)cancel();else n.speak(item.text);});}
 if(!('speechSynthesis' in window))return Promise.resolve();
 return new Promise(resolve=>{
  const u=new SpeechSynthesisUtterance(item.text);const crew=CHARACTERS.find(c=>c.name.toUpperCase()===item.character);u.rate=crew?.voice.rate||1;u.pitch=crew?.voice.pitch||1;const voices=speechSynthesis.getVoices?.()||[];const voice=voices.find(v=>/^en-AU/i.test(v.lang))||voices.find(v=>/^en/i.test(v.lang));if(voice)u.voice=voice;
  let timer;const done=()=>{clearTimeout(timer);signal.removeEventListener('abort',cancel);resolve();};
  const cancel=()=>{speechSynthesis.cancel();done();};
  signal.addEventListener('abort',cancel,{once:true});u.onend=done;u.onerror=done;
  timer=setTimeout(cancel,20000);if(signal.aborted)cancel();else speechSynthesis.speak(u);
 });
}
const queue=createDialogueQueue({play});
window.addEventListener('crew-map-line',e=>{if(e.detail?.text)void queue.enqueue(e.detail);});
function act(command){try{
 engine.dispatch(command);if(command.type==='depart')paused=false;if(command.type==='arrive'||command.type==='complete')paused=true;
 render();const state=engine.snapshot();log(command.type==='choose'?`Approach: ${command.choice}`:`Mission: ${command.type}`);
 const text=state.mission?storyLine(state.mission,command.type,state.story.path):'';
 const character=command.type==='depart'?characterById(state.crew).name.toUpperCase():'CHET';
 if(text)void queue.enqueue({text,character});
 }catch(e){el('error').textContent=e.message;}}
function button(text,type){const b=document.createElement('button');b.className='primary';b.textContent=text;b.addEventListener('click',()=>act({type}));return b;}
function render(){
 const s=engine.snapshot(),m=s.mission;el('error').textContent='';el('credits').textContent=s.credits;el('status').textContent=(m?.status||'idle').replaceAll('_',' ').toUpperCase();el('mission-title').textContent=m?.title||'Awaiting dispatch';el('mission-detail').textContent=m?`${m.destination} · ${m.reward} credits · ${s.story.path} approach`:'Begin a simulated medical supply delivery.';el('save-status').textContent=s.revision?`Saved locally · revision ${s.revision}`:'Ready to save locally';
 const controls=el('controls');controls.replaceChildren();
 if(!m||m.status==='complete'){const b=document.createElement('button');b.className='primary';b.textContent=m?'Create next delivery':'Create delivery offer';b.onclick=()=>act({type:'offer',mission:makeOffer(s.ledger.length,crypto.randomUUID())});controls.append(b);}
 if(m&&['offered','accepted'].includes(m.status)){const select=document.createElement('select');select.setAttribute('aria-label','Story approach');for(const path of ['standard','humanitarian','discreet']){const opt=document.createElement('option');opt.value=path;opt.textContent=path;select.append(opt);}select.value=s.story.path;select.onchange=()=>act({type:'choose',choice:select.value});controls.append(select);}
 const next={offered:['Accept delivery','accept'],accepted:['Simulate departure','depart'],en_route:['Simulate arrival','arrive'],arrived:['Complete delivery','complete']}[m?.status];if(next){const b=button(...next);if(next[1]==='arrive'&&m.distanceKm!==undefined)b.disabled=m.travelledKm<m.distanceKm;controls.append(b);}
 updateInstruments();updateCrewAndHangar();
}
el('voice').checked=true;
el('voice').onchange=e=>{enabled=e.target.checked;if(!enabled)queue.clear();};el('mute').onclick=()=>{queue.clear();el('caption').textContent='Audio stopped.';};
el('hazard').onclick=()=>{log('Simulated safety interruption');void queue.enqueue({text:'Safety test. Story dialogue paused. Keep your attention on the road.',priority:'safety',character:'CHET'});};
el('reload').onclick=()=>{queue.clear();load();};
function load(){paused=true;try{engine=createMissionEngine({storage:localStorage});render();log('Saved mission loaded.');}catch(e){el('error').textContent=e.message;el('controls').replaceChildren();}}
window.addEventListener('pagehide',()=>queue.clear());load();

function updateInstruments(){
 if(!engine)return;const m=engine.snapshot().mission;const travelling=m?.status==='en_route';
 el('speed-readout').textContent=travelling&&!paused?speed:0;
 el('pause-travel').disabled=!travelling;el('pause-travel').textContent=paused?'Resume simulation':'Pause simulation';
 el('throttle').disabled=!travelling;
 const progress=m?.distanceKm?Math.min(100,100*(m.travelledKm||0)/m.distanceKm):0;
 el('route-progress').value=progress;updateRouteView(progress/100);
 el('route-remaining').textContent=m?.distanceKm?`${Math.max(0,m.distanceKm-(m.travelledKm||0)).toFixed(2)} km remaining · ${Math.round(progress)}%`:'No route active';
 el('destination-marker').textContent=m?`${m.destination.toUpperCase()} · ${Math.round(progress)}%`:'MORNA STATION · STANDING BY';
}
el('pause-travel').onclick=()=>{paused=!paused;updateInstruments();};
el('throttle').oninput=e=>{speed=Number(e.target.value);updateInstruments();};
document.addEventListener('visibilitychange',()=>{if(document.hidden){paused=true;queue.clear();updateInstruments();}});
setInterval(()=>{
 if(!engine||paused||document.hidden)return;
 const m=engine.snapshot().mission;if(m?.status!=='en_route'||!m.distanceKm)return;
 try{engine.dispatch({type:'travel',distanceKm:speed/3600*20,speedKmh:speed,seconds:20});render();
 if(engine.snapshot().mission.travelledKm>=m.distanceKm){paused=true;updateInstruments();void queue.enqueue({text:`${m.destination} is in range. Simulation paused. Confirm arrival when ready.`,character:'CHET'});log('Route complete. Awaiting arrival confirmation.');}}
 catch(e){paused=true;el('error').textContent=e.message;updateInstruments();}
},1000);

function updateCrewAndHangar(){
 const s=engine.snapshot(),crew=characterById(s.crew)||CHARACTERS[0];updateSeatedCrew(crew);
 const select=el('crew-select');select.replaceChildren();for(const c of CHARACTERS){const opt=document.createElement('option');opt.value=c.id;opt.textContent=c.name;select.append(opt);}select.value=crew.id;select.disabled=s.mission?.status==='en_route';
 el('crew-portrait').src=portraitFor(crew);el('crew-portrait').alt=crew.name;
 el('crew-perk').textContent=`${crew.station} · ${crew.perk}. ${crew.tradeoff}.`;
 const hangar=el('ship-select');hangar.replaceChildren();for(const [id,name,need] of [['standard','Standard Courier',0],['interceptor','Interceptor',3],['sovereign','Sovereign',6]]){const opt=document.createElement('option');opt.value=id;opt.textContent=`${name}${s.ledger.length<need?` · locked until ${need} deliveries`:''}`;opt.disabled=s.ledger.length<need;hangar.append(opt);}hangar.value=s.ship;hangar.disabled=s.mission?.status==='en_route';
 el('rank').textContent=`${s.ledger.length} deliveries completed · ${s.ledger.length>=6?'Veteran':s.ledger.length>=3?'Pathfinder':'Cadet'}`;
 const b=s.combat;const shields=b?Math.round(100*b.shields/b.maxShields):100;el('shields').value=shields;el('shield-label').textContent=`${shields}%`;
 el('combat-status').textContent=b?`${b.phase.toUpperCase()} · Charge ${Math.round(b.charge)} · ${b.splashes.length} targets resolved`:'Patrol standing by';
 const contact=el('combat-contact');contact.hidden=!b?.contact||s.mission?.status!=='en_route';contact.textContent=b?.contact?`◇ ${b.contact.faction||'Contact'} · ${Math.round(b.charge)}% lock`:'';
}
el('crew-select').onchange=e=>act({type:'crew',id:e.target.value});el('ship-select').onchange=e=>act({type:'ship',id:e.target.value});
const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
let recognition=null;
el('listen').disabled=!Recognition;
el('recognition-status').textContent=Recognition?'Tap to speak a command.':'Voice recognition unavailable in this browser. Buttons remain available.';
el('listen').onclick=()=>{
 if(recognition){recognition.abort();return;}queue.clear();const r=new Recognition();recognition=r;r.lang='en-AU';r.continuous=false;r.interimResults=false;
 el('recognition-status').textContent='Listening…';
 r.onresult=e=>{const text=e.results[0][0].transcript;const command=parseCommand(text);el('recognition-status').textContent=command?`Heard: ${text}`:`Unrecognised command: ${text}`;
 if(command==='pause'){paused=true;updateInstruments();}else if(command==='resume'){if(engine.snapshot().mission?.status==='en_route')paused=false;updateInstruments();}else if(command==='mute'){queue.clear();}else if(command)act({type:command});};
 r.onerror=e=>{el('recognition-status').textContent=`Microphone: ${e.error}. Use the buttons to continue.`;};r.onend=()=>{recognition=null;};try{r.start();}catch(e){recognition=null;el('recognition-status').textContent=e.message;}
};
window.addEventListener('pagehide',()=>recognition?.abort());

document.addEventListener('visibilitychange',()=>{if(document.hidden)recognition?.abort();});

// Android launcher harness. No microphone recordings or transcripts are retained.
if(el('start-test')){
 let pending=false, listenId=null, retry=null;
 const native=()=>window.RedAlertNative;
 function closeMic(){clearTimeout(retry);retry=null;if(listenId!==null){const id=listenId;listenId=null;native()?.cancelListen(id);}}
 function controls(disabled){if(!disabled)return;document.querySelectorAll('.console button,.console select,.console input').forEach(n=>n.disabled=disabled);}
 const run=createTestSession({engine:{dispatch:action=>engine.dispatch(action),snapshot:()=>engine.snapshot()},storage:localStorage,onChange:report=>{
  paused=true;render();controls(run.running);el('start-test').disabled=run.running||pending;
  el('test-status').textContent=run.running?'Test running automatically. Say “stop test”.':`Test stopped: ${report.outcome}. Review the report while parked.`;
 },onStop:reason=>{pending=false;closeMic();queue.clear();native()?.speak(`Simulator test stopped. ${reason==='completed'?'Mission completed.':'Review the report when parked.'}`);}});
 function listen(){
  if(!pending&&!run.running)return;
  listenId=native().listenOnce((text,error)=>{
   listenId=null;
   if(!pending&&!run.running)return;
   if(error&&!['aborted','no-speech'].includes(error)){pending=false;run.stop('microphone-error');el('test-status').textContent='Microphone unavailable. Test stopped. Check permissions while parked.';el('start-test').disabled=false;closeMic();return;}
   if(text&&run.command(text))return;
   retry=setTimeout(listen,400);
  });
 }
 window.addEventListener('test-mic-ready',()=>{
  if(!pending)return;pending=false;
  try{run.start();}catch(e){closeMic();el('test-status').textContent=`Cannot start: ${e.message}`;el('start-test').disabled=false;}
 });
 if(el('start-visual-test'))el('start-visual-test').onclick=()=>{
  if(pending||run.running)return;paused=true;queue.clear();
  try{run.start();}catch(e){el('test-status').textContent=`Cannot start: ${e.message}`;}
 };
 el('start-test').onclick=()=>{
  if(pending||run.running)return;
  if(!native()){el('test-status').textContent='Open the Android launcher to test native voice stop. Manual simulator controls remain available.';return;}
  paused=true;queue.clear();pending=true;el('start-test').disabled=true;el('test-status').textContent='Preparing microphone. Accept any Android permission request while parked.';listen();
 };
 function stop(reason){pending=false;closeMic();run.stop(reason);el('start-test').disabled=false;}
 el('stop-test').onclick=()=>stop('manual-stop');
 function background(){stop('app-background');}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)background();});
 window.addEventListener('pagehide',background);window.addEventListener('hybrid-background',background);
 el('export-test').onclick=()=>{if(run.running||pending)return;el('test-report').hidden=false;el('test-report').textContent=JSON.stringify(run.report()||JSON.parse(localStorage.getItem('mole-hybrid-test-reports-v1')||'[]'),null,2);};
 setInterval(()=>run.tick(),1000);
}


const opening=engine?installOpening({engine,speak:line=>void queue.enqueue(line),stop:()=>queue.clear(),onOffer:()=>act({type:'offer',mission:makeOffer(0,crypto.randomUUID())})}):null;
if(engine)installCrewScreens({engine:{snapshot:()=>engine.snapshot(),dispatch:action=>engine.dispatch(action)},portraitFor,onEnter:options=>{render();void queue.enqueue({character:'CHET',text:'Welcome aboard, '+(engine.snapshot().player?.name||'Captain')+'. Your cockpit is ready. Progress saves automatically on this device.'});},onLeave:()=>{paused=true;queue.clear();recognition?.abort();el('stop-test').click();updateInstruments();},onDemo:()=>el('start-visual-test')?.click()});

if(document.querySelector){
const dash=document.createElement('section');dash.className='cockpit-dashboard';dash.setAttribute('aria-label','Cockpit dashboard');dash.innerHTML='<div class="dash-heading">FLIGHT DECK <span>LOCAL AUTOSAVE</span></div><div class="dash-readouts"></div><div class="dash-actions"></div>';

dash.querySelector('.dash-actions').append(el('controls'));
for(const id of ['speed-readout','status','credits','shield-label','save-status']){const cell=document.createElement('div');const label=document.createElement('small');label.textContent={"speed-readout":"SIM KM/H",status:"MISSION",credits:"CREDITS","shield-label":"SHIELDS","save-status":"SAVE"}[id];cell.append(label,el(id));dash.querySelector('.dash-readouts').append(cell);}
const save=document.createElement('button');save.textContent='Save progress';save.onclick=()=>{try{localStorage.setItem('mole-beyond:foundation:v1',JSON.stringify(engine.snapshot()));el('save-status').textContent='Saved on this device';}catch(e){el('error').textContent='Unable to save: '+e.message;}};dash.querySelector('.dash-actions').append(save);document.querySelector('.viewport').append(dash);

}

if(document.querySelector){
 const viewport=document.querySelector('.viewport');
 const nav=document.createElement('section');nav.className='navigation-strip';nav.setAttribute('aria-label','Navigation summary');nav.innerHTML='<div><small>SIMULATED ROUTE · NO GPS</small><strong data-nav-destination>Awaiting dispatch</strong><span data-nav-remaining>No route active</span></div><button type="button" data-details aria-expanded="false">Menu</button>';
 viewport.prepend(nav);
 const detail=document.createElement('div');detail.className='cockpit-details';detail.hidden=true;detail.setAttribute('aria-label','Cockpit menu');
 const close=document.createElement('button');close.textContent='Back to navigation';close.onclick=()=>toggle(false);detail.append(close);
 for(const selector of ['.player-identity','.home-menu','.opening-story','.console','.test-panel','.journal']){const node=document.querySelector(selector);if(node)detail.append(node);}
 const replay=[...document.querySelectorAll('main>button')].find(b=>b.textContent==='Play opening story');if(replay)detail.append(replay);
 document.querySelector('main').append(detail);
 function toggle(open){detail.hidden=!open;nav.querySelector('[data-details]').setAttribute('aria-expanded',String(open));}
 nav.querySelector('[data-details]').onclick=()=>toggle(detail.hidden);
 const tools=document.querySelector('.space-map-tools');tools.classList.add('cockpit-map-tools');viewport.append(tools);
 const quick=document.createElement('div');quick.className='cockpit-quick-actions';
 for(const [label,id] of [['Voice command','listen'],['Stop audio','mute'],['Pause / resume','pause-travel']]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>el(id).click();quick.append(b);}document.querySelector('.dash-actions').append(quick);
 function refreshNav(){nav.querySelector('[data-nav-destination]').textContent=el('mission-title').textContent;nav.querySelector('[data-nav-remaining]').textContent=el('route-remaining').textContent;}
 new MutationObserver(refreshNav).observe(el('mission-title'),{childList:true,subtree:true,characterData:true});new MutationObserver(refreshNav).observe(el('route-remaining'),{childList:true,subtree:true,characterData:true});refreshNav();
}

