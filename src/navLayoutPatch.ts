// Navigation layout (1.0.14). Injected next to the native bridge so the bundled game in
// src/hybridHtml.ts stays byte-for-byte unchanged and survives a future re-bundle.
//
// While a journey is under way (navigating / recalculating / signal lost / launching):
//  - the road map fills most of the screen; the dashboard collapses to a short tray
//  - the tray keeps crew comms plus Repeat direction, Recenter, Cancel journey and a
//    "More controls" toggle that expands the full dashboard
//  - the seated crew sit in their own strip between the map and the tray, so they no
//    longer cover the bottom of the map or the OpenStreetMap credit
//  - map tiles get more contrast and the decorative planet/nebula are toned down so
//    street names are readable
//  - duplicate readouts are hidden in the tray (direction repeated in the status line,
//    second Mic button, mic status line, disabled Launch/Character buttons)
// Parked mode (full bridge view) is unchanged.

export const NAV_LAYOUT_VERSION = 2;

export const NAV_PHASES = ['navigating', 'recalculating', 'signal lost', 'launching'];

export const navLayoutCss = `
@media (orientation:portrait){
.live-cockpit .viewport[data-nav-mode=on]{--tray-h:128px;--crew-h:70px}
.live-cockpit .viewport[data-nav-mode=on] .live-navigation{inset:82px 2% calc(var(--tray-h) + var(--crew-h)) 2%;border-radius:18px 18px 8px 8px}
.live-cockpit .viewport[data-nav-mode=on] .full-crew{bottom:var(--tray-h);height:var(--crew-h);z-index:5;background:linear-gradient(#05070b00,#05070be6 55%)}
.live-cockpit .viewport[data-nav-mode=on] .crew-station span{display:none}
.live-cockpit .viewport[data-nav-mode=on] .full-crew .seated-crew{bottom:0;height:100%}
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard{inset:auto 2% 4px;max-height:calc(var(--tray-h) - 6px);overflow:hidden;padding:6px 8px}
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard.tray-open{max-height:62%;overflow:auto;z-index:20}
}
@media (orientation:landscape){
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard.tray-open{z-index:20}
}
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard:not(.tray-open) .dash-heading,
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard:not(.tray-open) .dash-readouts,
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard:not(.tray-open) .road-status,
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard:not(.tray-open) .voice-status,
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard:not(.tray-open) .navigation-planner,
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard:not(.tray-open) .flight-actions button:is([data-action=destination],[data-action=launch],[data-action=mute],[data-action=unmute],[data-action=pause-story],[data-action=resume-story],[data-action=save],[data-action=home]){display:none}
.live-cockpit .viewport[data-nav-mode=on] .flight-actions button[data-action=voice]{display:none}
.live-cockpit .viewport[data-nav-mode=on] .flight-actions button:is([data-action=launch],[data-action=home]):disabled{display:none}
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard:not(.tray-open) .flight-actions{flex-wrap:nowrap}
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard:not(.tray-open) .flight-actions button{flex:1 1 0;min-width:0;padding:6px 4px;font-size:11px;line-height:1.2}
.live-cockpit .viewport[data-nav-mode=on] .crew-comms{margin:0 0 6px;padding:4px 6px}
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard:not(.tray-open) .crew-comms span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.live-cockpit .cockpit-dashboard .tray-toggle{display:none}
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard .tray-toggle{display:block;background:#123a46;border-color:#77e3de}
.live-cockpit .viewport[data-nav-mode=on] .road-map .leaflet-tile-pane{opacity:1;filter:invert(1) hue-rotate(185deg) saturate(.55) contrast(1.4) brightness(1.08)}
.live-cockpit .viewport[data-nav-mode=on] .space-nebula{opacity:.3}
.live-cockpit .viewport[data-nav-mode=on] .space-stars{opacity:.35}
.live-cockpit .viewport[data-nav-mode=on] :is(.space-planet,.space-moon){display:none}
.live-cockpit .road-map path[fill="#23cfee"]{opacity:0}
.live-cockpit .road-map path[stroke="#4ee4ff"]{filter:drop-shadow(0 0 3px #b48cff) drop-shadow(0 0 9px #5a3fb0)}
.live-cockpit .live-navigation>.leaflet-control-container{position:absolute;inset:0;z-index:460;pointer-events:none}
.live-cockpit .live-navigation .leaflet-control-attribution{font-size:9px;background:#e3f1f4d9;color:#162632}
.mole-ship{position:absolute;left:0;top:0;width:48px;height:48px;margin:-24px 0 0 -24px;z-index:450;pointer-events:none;display:none;filter:drop-shadow(0 0 6px #7fe9ff) drop-shadow(0 2px 4px #000c)}
.mole-ship svg{width:100%;height:100%;display:block}
.mole-sky,.mole-orient{display:none}
.live-cockpit .viewport[data-nav-mode=on] .road-map{inset:-60% -65% -96% -65%;transform:perspective(800px) rotateX(32deg) rotate(var(--map-rot,0deg));transform-origin:50% 50%;transition:transform .8s linear}
.live-cockpit .viewport[data-nav-mode=on] .mole-sky{display:block;position:absolute;inset:0 0 auto;height:26%;z-index:440;pointer-events:none;background:radial-gradient(ellipse at 18% 30%,#7754c766,transparent 55%),radial-gradient(ellipse at 80% 10%,#2a6fb055,transparent 50%),linear-gradient(#02030f 0%,#030514f0 45%,#03051400 100%)}
.live-cockpit .viewport[data-nav-mode=on] .mole-sky:before{content:"";position:absolute;inset:0;background-image:radial-gradient(circle,#fff 0 1px,transparent 1.5px),radial-gradient(circle,#9fdcff 0 1px,transparent 1.5px);background-size:97px 61px,151px 83px;background-position:13px 9px,61px 37px;opacity:.75}
.live-cockpit .viewport[data-nav-mode=on] .mole-sky:after{content:"";position:absolute;right:9%;top:16%;width:34px;height:34px;border-radius:50%;background:radial-gradient(circle at 30% 28%,#a6cfeb,#5766b3 40%,#302c67 70%,#080c21);box-shadow:-3px -2px 12px #7c9ce866;opacity:.85}
.live-cockpit .viewport[data-nav-mode=on] .mole-orient{display:block;position:absolute;left:8px;top:8px;z-index:470;margin:0;min-height:44px;padding:6px 10px;font-size:11px;background:#07121ee6;border:1px solid #77e3de;border-radius:8px;color:#d9fbff}
`;

export const navLayoutScript = `(function(){
 if(window.__moleNavLayout)return;window.__moleNavLayout=1;
 var PHASES=${JSON.stringify(NAV_PHASES)};
 function install(){
  if(!document.head||document.getElementById('mole-nav-layout'))return;
  var st=document.createElement('style');st.id='mole-nav-layout';st.textContent=${JSON.stringify(navLayoutCss)};document.head.appendChild(st);
 }
 function resize(){try{window.dispatchEvent(new Event('resize'));}catch(e){}}

 // --- windscreen: tilted map, heading-up / north-up, ship marker (1.0.15) ---
 var SHIP='<svg viewBox="-24 -24 48 48" aria-hidden="true"><circle r="17" fill="#0c192fcc" stroke="#bafaff" stroke-width="1.5"/><path d="M0 -15L9 9L0 4L-9 9Z" fill="#efffff" stroke="#4ee4ff" stroke-width="1"/><path d="M-4 9L0 16L4 9Z" fill="#ffb35c"/></svg>';
 var heading=null,last=null,rot=0,northUp=false;
 try{northUp=localStorage.getItem('mole-beyond:map-orient')==='north';}catch(e){}
 function metres(a,b){var k=Math.PI/180,x=(b.lng-a.lng)*k*Math.cos((a.lat+b.lat)*k/2),y=(b.lat-a.lat)*k;return Math.sqrt(x*x+y*y)*6371000;}
 function bearing(a,b){var k=Math.PI/180,y=Math.sin((b.lng-a.lng)*k)*Math.cos(b.lat*k),x=Math.cos(a.lat*k)*Math.sin(b.lat*k)-Math.sin(a.lat*k)*Math.cos(b.lat*k)*Math.cos((b.lng-a.lng)*k);return (Math.atan2(y,x)/k+360)%360;}
 function tap(f){
  if(!f||!isFinite(f.lat)||!isFinite(f.lng))return;
  if(f.heading!=null&&isFinite(f.heading)&&f.speed>1.2){heading=f.heading;last=f;return;}
  if(!last){last=f;return;}
  if(metres(last,f)>=6){heading=bearing(last,f);last=f;}
 }
 window.__moleTapFix=tap;
 function hookGps(){var R=window.RedAlertNative;if(!R||R.__moleTap||typeof R.watchPosition!=='function')return;var o=R.watchPosition;R.watchPosition=function(onFix,onErr){return o.call(R,function(f){try{tap(f);}catch(e){}return onFix.apply(this,arguments);},onErr);};R.__moleTap=1;}
 hookGps();var hookTries=0,hookTimer=setInterval(function(){hookGps();if(++hookTries>40)clearInterval(hookTimer);},250);
 function windscreen(){
  var nav=document.querySelector('.live-cockpit .live-navigation');if(!nav||nav.__moleWs)return;
  var map=nav.querySelector('.road-map');if(!map)return;nav.__moleWs=1;
  var view=nav.closest('.viewport');
  var sky=document.createElement('div');sky.className='mole-sky';nav.appendChild(sky);
  var ship=document.createElement('div');ship.className='mole-ship';ship.innerHTML=SHIP;nav.appendChild(ship);
  var btn=document.createElement('button');btn.type='button';btn.className='mole-orient';
  function label(){btn.textContent=northUp?'North up':'Heading up';btn.setAttribute('aria-label',northUp?'Map is north up. Switch to heading up':'Map turns with heading. Switch to north up');}
  label();btn.onclick=function(){northUp=!northUp;try{localStorage.setItem('mole-beyond:map-orient',northUp?'north':'heading');}catch(e){}label();};
  nav.appendChild(btn);
  var moved=false;
  function frame(){
   if(!nav.isConnected)return;
   if(!moved){var cc=map.querySelector('.leaflet-control-container');if(cc){nav.appendChild(cc);moved=true;}}
   var on=view&&view.dataset.navMode==='on';
   var target=on&&!northUp&&heading!=null?-heading:0;
   var d=((target-rot)%360+540)%360-180;if(Math.abs(d)>0.5){rot+=d;map.style.setProperty('--map-rot',rot.toFixed(1)+'deg');}
   var dot=map.querySelector('path[fill="#23cfee"]');
   if(dot){var r=dot.getBoundingClientRect(),n=nav.getBoundingClientRect();
    if(r.width>0){var x=r.left+r.width/2-n.left,y=r.top+r.height/2-n.top;
     var a=heading==null?0:(on&&!northUp?0:heading);
     ship.style.display='block';ship.style.transform='translate('+x.toFixed(1)+'px,'+y.toFixed(1)+'px) rotate('+a.toFixed(1)+'deg)';
     ship.style.opacity=dot.getAttribute('fill-opacity')==='1'?'1':'.5';}
    else ship.style.display='none';}
   else ship.style.display='none';
   requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
 }
 function wire(){
  var dash=document.querySelector('.cockpit-dashboard');if(!dash||dash.__moleNav)return;dash.__moleNav=1;
  var view=dash.closest('.viewport');var phase=dash.querySelector('[data-phase]');var actions=dash.querySelector('.flight-actions');
  if(actions&&!actions.querySelector('.tray-toggle')){
   var t=document.createElement('button');t.type='button';t.className='tray-toggle';t.textContent='More controls';t.setAttribute('aria-expanded','false');
   t.onclick=function(){var open=!dash.classList.contains('tray-open');dash.classList.toggle('tray-open',open);t.textContent=open?'Fewer controls':'More controls';t.setAttribute('aria-expanded',String(open));};
   actions.appendChild(t);
  }
  function sync(){
   var p=(phase&&phase.textContent||'').trim().toLowerCase();var on=PHASES.indexOf(p)>=0;
   var want=on?'on':'off';if(view&&view.dataset.navMode!==want){var was=view.dataset.navMode;view.dataset.navMode=want;if(!was&&!on)return;if(!on){dash.classList.remove('tray-open');var b=dash.querySelector('.tray-toggle');if(b){b.textContent='More controls';b.setAttribute('aria-expanded','false');}}setTimeout(resize,50);}
  }
  if(phase)new MutationObserver(sync).observe(phase,{childList:true,characterData:true,subtree:true});
  sync();
 }
 function start(){install();wire();windscreen();new MutationObserver(function(){if(!document.getElementById('mole-nav-layout'))install();wire();windscreen();}).observe(document.documentElement,{childList:true,subtree:true});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();`;
