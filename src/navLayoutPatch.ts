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

export const NAV_LAYOUT_VERSION = 3;

// Source of the turn classifier used inside the page (kept as a string: release builds run on
// Hermes, which does not keep function source text).
export const classifyTurnSource = "function classifyTurn(t){t=String(t||'').toLowerCase();if(/u-?turn/.test(t))return 'uturn';if(/arriv|destination|you have reached/.test(t))return 'arrive';if(/roundabout|rotary/.test(t))return 'roundabout';if(/(slight|keep|bear) left/.test(t))return 'slight-left';if(/(slight|keep|bear) right/.test(t))return 'slight-right';if(/\\bleft\\b/.test(t))return 'left';if(/\\bright\\b/.test(t))return 'right';return 'straight';}";

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
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard:not(.tray-open) .road-status:not(.mole-alert),
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard:not(.tray-open) .voice-status,
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard:not(.tray-open) .navigation-planner,
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard:not(.tray-open) .flight-actions button:is([data-action=destination],[data-action=launch],[data-action=home]){display:none}
.live-cockpit .viewport[data-nav-mode=on] .flight-actions button:is([data-action=launch],[data-action=home]):disabled{display:none}
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard:not(.tray-open) .flight-actions{flex-wrap:nowrap}
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard:not(.tray-open) .flight-actions button{flex:1 1 0;min-width:0;padding:6px 4px;font-size:11px;line-height:1.2}
.live-cockpit .viewport[data-nav-mode=on] .crew-comms{margin:0 0 6px;padding:4px 6px}
.live-cockpit .viewport[data-nav-mode=on] .road-status.mole-alert{color:#ffd0a8;border-left:2px solid #ff9a3c;padding:3px 6px;margin:0 0 5px;font-size:11px}
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard:not(.tray-open):has(.mole-alert) .crew-comms{display:none}
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
.live-cockpit .viewport[data-nav-mode=on] .live-navigation{border-color:#ffb35c;box-shadow:0 0 0 5px #120c08e6,0 0 0 6px #ff9a3c77,0 0 24px #ff8a2a40;background:radial-gradient(ellipse at 20% 30%,#5b3fa866,transparent 55%),radial-gradient(ellipse at 85% 70%,#0c6fa055,transparent 60%),#02030b}
.live-cockpit .viewport[data-nav-mode=on] .road-map{background:transparent!important}
.live-cockpit .viewport[data-nav-mode=on] .road-map .leaflet-tile-pane{opacity:1;mix-blend-mode:screen;filter:grayscale(1) invert(1) brightness(1.15) contrast(1.9) sepia(1) hue-rotate(165deg) saturate(4.5) brightness(1.25)}
.live-cockpit .viewport[data-nav-mode=on] .space-nebula{opacity:.75}
.live-cockpit .viewport[data-nav-mode=on] .space-stars{opacity:.9}
.live-cockpit .road-map path[stroke="#4ee4ff"]{stroke:#5ff0ff;stroke-width:9px;filter:drop-shadow(0 0 4px #4ee4ff) drop-shadow(0 0 12px #2a8cff)}
.live-cockpit .viewport[data-nav-mode=on] .navigation-strip{background:linear-gradient(90deg,#06121fef,#0a1c2ee6);border-bottom:1px solid #4ee4ff66;justify-content:flex-start}
.live-cockpit .viewport[data-nav-mode=on] .navigation-strip>div:first-of-type{flex:1}
.live-cockpit .viewport[data-nav-mode=on] .navigation-strip small,.live-cockpit .viewport[data-nav-mode=on] .navigation-strip [data-turn-distance]{display:none}
.mole-turn,.mole-turn-dist,.mole-hud{display:none}
.live-cockpit .viewport[data-nav-mode=on] .mole-turn{display:block;flex:0 0 54px;width:54px;height:54px;color:#5ff0ff;filter:drop-shadow(0 0 6px #4ee4ff)}
.live-cockpit .viewport[data-nav-mode=on] .mole-turn svg{width:100%;height:100%}
.live-cockpit .viewport[data-nav-mode=on] .mole-turn-dist{display:block;font:700 22px/1.05 system-ui,sans-serif;color:#fff;letter-spacing:.01em}
.live-cockpit .viewport[data-nav-mode=on] .navigation-strip strong{color:#7ff3ff;font-size:clamp(14px,3.8vw,18px);margin:2px 0 0}
.live-cockpit .viewport[data-nav-mode=on] .mole-hud{display:flex;position:absolute;left:8px;bottom:34px;z-index:455;gap:0;pointer-events:none;background:#04101ce6;border:1px solid #4ee4ff88;border-radius:8px;box-shadow:0 0 12px #4ee4ff33;font:12px system-ui,sans-serif;color:#9fdfe8}
.mole-hud>div{padding:5px 10px;text-align:center}
.mole-hud>div+div{border-left:1px solid #4ee4ff55}
.mole-hud b{display:block;font-size:20px;line-height:1.1;color:#fff}
.mole-ship{position:absolute;left:0;top:0;width:48px;height:48px;margin:-24px 0 0 -24px;z-index:450;pointer-events:none;display:none;filter:drop-shadow(0 0 6px #7fe9ff) drop-shadow(0 2px 4px #000c)}
.mole-ship svg{width:100%;height:100%;display:block}
.mole-sky,.mole-orient{display:none}
.live-cockpit .viewport[data-nav-mode=on] .road-map{inset:-90% -110% -120% -110%;transform:perspective(650px) rotateX(52deg) rotate(var(--map-rot,0deg));transform-origin:50% 50%;transition:transform .8s linear}
.live-cockpit .viewport[data-nav-mode=on] .mole-sky{display:block;position:absolute;inset:0 0 auto;height:30%;z-index:440;pointer-events:none;background:radial-gradient(ellipse at 18% 30%,#7754c766,transparent 55%),radial-gradient(ellipse at 80% 10%,#2a6fb055,transparent 50%),linear-gradient(#02030f 0%,#030514f0 45%,#03051400 100%)}
.live-cockpit .viewport[data-nav-mode=on] .mole-sky:before{content:"";position:absolute;inset:0;background-image:radial-gradient(circle,#fff 0 1px,transparent 1.5px),radial-gradient(circle,#9fdcff 0 1px,transparent 1.5px);background-size:97px 61px,151px 83px;background-position:13px 9px,61px 37px;opacity:.75}
.live-cockpit .viewport[data-nav-mode=on] .mole-sky:after{content:"";position:absolute;right:9%;top:16%;width:34px;height:34px;border-radius:50%;background:radial-gradient(circle at 30% 28%,#a6cfeb,#5766b3 40%,#302c67 70%,#080c21);box-shadow:-3px -2px 12px #7c9ce866;opacity:.85}
.live-cockpit .viewport[data-nav-mode=on] .mole-orient{display:block;position:absolute;left:8px;top:8px;z-index:470;margin:0;min-height:44px;padding:6px 10px;font-size:11px;background:#07121ee6;border:1px solid #77e3de;border-radius:8px;color:#d9fbff}
.mole-dash2 .mole-bar{display:block;width:70%;height:4px;margin:3px auto 0;background:#0b1f2c;border-radius:2px;overflow:hidden}
.mole-dash2 .mole-bar s{display:block;height:100%;width:100%;background:#5ff0ff;box-shadow:0 0 6px currentColor}
.mole-dash2{background:#030a12b8;border-radius:6px}
/* 1.0.20: controls built into the console - no boxed panel in navigation mode */
@media (orientation:portrait){
.live-cockpit .viewport[data-nav-mode=on]{--tray-h:150px}
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard:not(.tray-open){background:none;border:0;box-shadow:none;border-radius:0;inset:auto 0 0;padding:0 10px 8px;max-height:none;overflow:visible}
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard:not(.tray-open) .crew-comms{background:linear-gradient(90deg,#04101ce0,#04101c80 70%,#04101c00);border-left:2px solid #c4a3ec;border-radius:0 6px 6px 0;margin:0 0 6px;text-shadow:0 0 6px #4ee4ff66}
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard:not(.tray-open) .road-status.mole-alert{background:#1a0e04d9;border-radius:0 6px 6px 0}
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard:not(.tray-open) .flight-actions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard:not(.tray-open) .flight-actions button{font-size:0;min-height:44px;padding:0 2px;margin:0;border-radius:7px;color:#bff6ff;background:linear-gradient(#122231f5,#070d16f5);border:1px solid #2e4b5c;box-shadow:inset 0 1px 0 #ffffff1a,inset 0 -3px 0 #ff9a3c40,0 3px 8px #000b;position:relative;display:flex;align-items:center;justify-content:center;gap:5px}
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard:not(.tray-open) .flight-actions button[hidden]{display:none}
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard:not(.tray-open) .flight-actions button::after{content:attr(data-key);font:600 10px/1.15 ui-monospace,Menlo,monospace;letter-spacing:.1em;text-align:center;text-shadow:0 0 6px #4ee4ff99;white-space:pre-line}
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard:not(.tray-open) .flight-actions button::before{content:"";width:6px;height:6px;border-radius:50%;background:#24404d;box-shadow:inset 0 0 2px #000;flex:0 0 6px}
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard:not(.tray-open) .flight-actions button:is([data-action=unmute],[data-action=resume-story])::before{background:#ffb35c;box-shadow:0 0 6px #ff9a3c}
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard:not(.tray-open) .flight-actions button[data-action=cancel]{color:#ffc9c9;border-color:#6a3440}
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard:not(.tray-open) .flight-actions button.tray-toggle{border-color:#4ee4ff88;color:#dffbff}
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard:not(.tray-open) .flight-actions button:active{transform:translateY(1px);box-shadow:inset 0 1px 0 #ffffff10,inset 0 -1px 0 #ff9a3c80,0 1px 3px #000b}
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard:not(.tray-open) .flight-actions button:disabled{opacity:.45}
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard.tray-open{inset:auto 2% 4px}
.live-cockpit .viewport[data-nav-mode=on] .navigation-strip .nav-voice button{display:none}
}
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
 var SHIP='<svg viewBox="-24 -24 48 48" aria-hidden="true"><defs><linearGradient id="mole-trail" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5ff0ff" stop-opacity=".9"/><stop offset="1" stop-color="#5ff0ff" stop-opacity="0"/></linearGradient></defs><path d="M-7 6L0 3L7 6L5 24L-5 24Z" fill="url(#mole-trail)"/><path d="M0 -18L13 10L0 4L-13 10Z" fill="#ffffff" stroke="#bafaff" stroke-width="1.2" stroke-linejoin="round"/></svg>';
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
   placeDash();requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
 }

 var classifyTurn=(0,eval)('('+${JSON.stringify(classifyTurnSource)}+')');
 var ICONS={
  left:'<path d="M40 52V30a8 8 0 0 0-8-8H14" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/><path d="M22 12L10 22L22 32" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>',
  right:'<path d="M16 52V30a8 8 0 0 1 8-8h18" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/><path d="M34 12L46 22L34 32" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>',
  'slight-left':'<path d="M36 52V34L20 16" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/><path d="M14 26V10H30" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>',
  'slight-right':'<path d="M20 52V34L36 16" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/><path d="M42 26V10H26" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>',
  uturn:'<path d="M38 52V22a10 10 0 0 0-20 0v14" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/><path d="M8 28L18 40L28 28" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>',
  roundabout:'<circle cx="28" cy="24" r="10" fill="none" stroke="currentColor" stroke-width="6"/><path d="M28 52V34" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/><path d="M36 10L42 16L36 22" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>',
  arrive:'<path d="M28 52C28 52 12 34 12 23a16 16 0 0 1 32 0C44 34 28 52 28 52Z" fill="none" stroke="currentColor" stroke-width="6"/><circle cx="28" cy="23" r="6" fill="currentColor"/>',
  straight:'<path d="M28 52V12" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/><path d="M16 24L28 10L40 24" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>'};
 window.__moleClassifyTurn=classifyTurn;
 function hud(){
  var strip=document.querySelector('.live-cockpit .navigation-strip');var nav=document.querySelector('.live-cockpit .live-navigation');
  if(!strip||!nav||strip.__moleHud)return;strip.__moleHud=1;
  var next=strip.querySelector('[data-next-turn]'),dist=strip.querySelector('[data-turn-distance]');
  var icon=document.createElement('div');icon.className='mole-turn';icon.setAttribute('aria-hidden','true');strip.insertBefore(icon,strip.firstChild);
  var big=document.createElement('span');big.className='mole-turn-dist';if(next)next.parentNode.insertBefore(big,next);
  var box=document.createElement('div');box.className='mole-hud';box.innerHTML='<div><b data-mole-speed>0</b>km/h</div><div><b data-mole-left>—</b>km left</div>';nav.appendChild(box);
  var kind='';
  function upd(){
   var k=classifyTurn(next&&next.textContent);if(k!==kind){kind=k;icon.innerHTML='<svg viewBox="0 0 56 56">'+ICONS[k]+'</svg>';}
   var t=dist&&dist.textContent||'',m=/(\\d+) m to next/.exec(t),r=/([\\d.]+) km remaining/.exec(t);
   big.textContent=m?(+m[1]>=1000?(m[1]/1000).toFixed(1)+' km':m[1]+' m'):'';
   document.querySelectorAll('[data-mole-left]').forEach(function(e){e.textContent=r?r[1]:'—';});
   var sp=document.querySelector('.cockpit-dashboard [data-speed]'),sv=sp&&/^\\d+$/.test(sp.textContent.trim())?sp.textContent.trim():'0';document.querySelectorAll('[data-mole-speed]').forEach(function(e){e.textContent=sv;});var sh=document.querySelector('.cockpit-dashboard [data-shields]'),cr=document.querySelector('.cockpit-dashboard [data-credits]'),shv=sh?sh.textContent.trim():'100%';document.querySelectorAll('[data-mole-shields]').forEach(function(e){e.textContent=shv;});document.querySelectorAll('[data-mole-shield-bar]').forEach(function(e){var n=parseInt(shv,10);e.style.width=(isFinite(n)?Math.max(0,Math.min(100,n)):100)+'%';e.style.background=n<35?'#ff6a5c':n<70?'#ffb35c':'#5ff0ff';});document.querySelectorAll('[data-mole-credits]').forEach(function(e){e.textContent=cr?cr.textContent.trim():'0';});
  }
  var mo=new MutationObserver(upd);[next,dist,document.querySelector('.cockpit-dashboard [data-speed]'),document.querySelector('.cockpit-dashboard [data-shields]'),document.querySelector('.cockpit-dashboard [data-credits]')].forEach(function(e){if(e)mo.observe(e,{childList:true,characterData:true,subtree:true});});
  upd();
 }


 // --- cockpit artwork: parked bridge, navigation console plate, seated captain, launch chair slide (1.0.16) ---
 function artPack(){return window.__moleArt||null;}
 var ckVal=null,ckAt=0;
 function captainKey(){
  var now=Date.now();if(ckVal&&now-ckAt<2000)return ckVal;ckAt=now;ckVal=readCaptainKey();return ckVal;
 }
 function readCaptainKey(){
  try{var p=JSON.parse(localStorage.getItem('mole-beyond:foundation:v1')||'{}').player||{};if(p.species&&p.gender&&p.occupation)return p.species+'-'+p.gender+'-'+p.occupation;}catch(e){}
  return 'human-male-explorer';
 }
 function captainEl(cls){
  var A=artPack();if(!A||!A.captains)return null;var c=A.captains[captainKey()]||A.captains['human-male-explorer'];if(!c)return null;
  var g=document.createElement('div');g.className='mole-captain '+cls;g.dataset.captain=captainKey();if(c.flip)g.classList.add('flip');
  g.innerHTML='<img alt="" src="'+c.chair+'"><img alt="Your captain" src="'+c.person+'">';return g;
 }
 function bridgeArt(){
  var A=artPack();if(!A||!document.head||document.getElementById('mole-bridge-art'))return;
  var b='url("'+A.bridge+'")',pl='url("'+A.plate+'")',st=document.createElement('style');st.id='mole-bridge-art';
  st.textContent='.live-cockpit .viewport:not([data-nav-mode=on]) .cockpit-art{background:linear-gradient(#02070e00 50%,#02070ee0),'+b+' 50% 42%/cover no-repeat}'+
   '.live-cockpit .viewport:not([data-nav-mode=on]) .full-crew{display:none}'+
   '.live-cockpit .viewport[data-nav-mode=on] .cockpit-art{background:#05070b}'+
   '.live-cockpit .viewport[data-nav-mode=on] .full-crew{display:none}'+
   '.mole-console{display:none}'+
   '@media (orientation:portrait){.live-cockpit .viewport[data-nav-mode=on]{--crew-h:118px}'+
   '.live-cockpit .viewport[data-nav-mode=on] .mole-console{display:block;position:absolute;left:0;right:0;bottom:0;height:calc(var(--tray-h) + var(--crew-h) + 12px);z-index:4;background:'+pl+' 50% 92%/auto 150% no-repeat;pointer-events:none}}'+
   '.mole-dash{display:none}'+
   '@media (orientation:portrait){.live-cockpit .viewport[data-nav-mode=on] .mole-dash{display:flex;position:absolute;align-items:center;justify-content:space-around;color:#fff;font:600 10px system-ui,sans-serif;text-align:center;text-shadow:0 0 6px #4ee4ff}'+
   '.live-cockpit .viewport[data-nav-mode=on] .mole-dash b{display:block;font-size:17px;line-height:1}.live-cockpit .viewport[data-nav-mode=on] .mole-dash small{color:#9fdfe8;font-size:9px}'+
   '.live-cockpit .viewport[data-nav-mode=on] .mole-hud{display:none}}'+
   '.mole-captain{position:absolute;pointer-events:none;aspect-ratio:382/512}'+
   '.mole-captain img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}'+
   '.mole-captain.flip img{transform:scaleX(-1)}'+
   '.mole-console .mole-captain{left:0;bottom:calc(var(--tray-h) - 6px);height:150px;filter:drop-shadow(0 0 10px #000c)}'+
   '.live-cockpit .viewport[data-nav-mode=on] .mole-hud{left:auto;right:8px;top:8px;bottom:auto}'+
   '.launch-scene .launch-art{background:linear-gradient(#03101c22,#02070e55),'+b+' 50% 40%/cover no-repeat;transform-origin:50% 36%;animation:mole-launch 5s cubic-bezier(.45,0,.75,1) forwards}'+
   '.launch-scene .launch-streaks{animation:mole-streaks 5s ease-in forwards}'+
   '.launch-scene .mole-captain{left:50%;bottom:4%;height:44%;transform:translateX(-50%);animation:mole-chair 5s cubic-bezier(.5,0,.6,1) forwards;z-index:0;filter:drop-shadow(0 6px 16px #000d)}'+
   '.launch-scene{place-items:start center}.launch-scene .launch-copy{z-index:1;margin-top:14px;padding:10px 16px;background:#061422b3}.launch-scene .launch-copy h2{font-size:20px;margin:4px 0}.launch-scene .launch-copy p{margin:4px 0}'+
   '@keyframes mole-chair{0%{transform:translateX(-50%) translateY(0) scale(1)}12%{transform:translateX(-50%) translateY(0) scale(1)}55%{transform:translateX(-50%) translateY(-28vh) scale(.45);opacity:1}72%{transform:translateX(-50%) translateY(-32vh) scale(.36);opacity:0}to{transform:translateX(-50%) translateY(-32vh) scale(.36);opacity:0}}'+
   '@keyframes mole-launch{0%,12%{transform:scale(1)}45%{transform:scale(1.6)}75%{transform:scale(2.5);filter:brightness(1.3)}to{transform:scale(3.8);filter:brightness(3) blur(2px);opacity:.25}}'+
   '@keyframes mole-streaks{0%,45%{transform:scale(.2);opacity:0}to{transform:scale(2.4);opacity:.9}}'+
   '@media(prefers-reduced-motion:reduce){.launch-scene .launch-art,.launch-scene .launch-streaks,.launch-scene .mole-captain{animation:none}}';
  document.head.appendChild(st);
 }

 // Live readouts sit on the console screen that the artwork leaves blank (image px 982-1198 x 528-610 of 1672x941).
 var dashSize='';
 function placeDash(){
  var con=document.querySelector('.live-cockpit .mole-console'),dash=con&&con.querySelector('.mole-dash:not(.mole-dash2)');if(!dash)return;
  var H=con.offsetHeight,vw=con.offsetWidth,key=H+'x'+vw;if(!H||key===dashSize)return;dashSize=key;
  var k=1.5*H/941,x0=(vw-1672*k)*0.5,y0=(H-1.5*H)*0.92;
  dash.style.left=(x0+986*k).toFixed(1)+'px';dash.style.top=(y0+530*k).toFixed(1)+'px';dash.style.width=(208*k).toFixed(1)+'px';dash.style.height=(78*k).toFixed(1)+'px';
  var d2=con.querySelector('.mole-dash2');if(d2){d2.style.left=(x0+618*k).toFixed(1)+'px';d2.style.top=(y0+496*k).toFixed(1)+'px';d2.style.width=(350*k).toFixed(1)+'px';d2.style.height=(98*k).toFixed(1)+'px';}
 }
 window.addEventListener('resize',function(){dashSize='';setTimeout(placeDash,60);});
 function seats(){
  var view=document.querySelector('.live-cockpit .viewport');
  if(view&&!view.querySelector('.mole-console')){var con=document.createElement('div');con.className='mole-console';var dash=document.createElement('div');dash.className='mole-dash';dash.innerHTML='<div><b data-mole-speed>0</b><small>km/h</small></div><div><b data-mole-left>—</b><small>km left</small></div>';con.appendChild(dash);var dash2=document.createElement('div');dash2.className='mole-dash mole-dash2';dash2.innerHTML='<div><b data-mole-shields>100%</b><small>shields</small><i class="mole-bar"><s data-mole-shield-bar></s></i></div><div><b data-mole-credits>0</b><small>credits</small></div>';con.appendChild(dash2);var g=captainEl('seat');if(g)con.appendChild(g);view.appendChild(con);}
  placeDash();
  var con2=view&&view.querySelector('.mole-console'),cur=con2&&con2.querySelector('.mole-captain');
  if(con2&&cur&&cur.dataset.captain!==captainKey()){var ng=captainEl('seat');if(ng)con2.replaceChild(ng,cur);}
  var ls=document.querySelector('.launch-scene');if(ls&&!ls.querySelector('.mole-captain')){var lg=captainEl('launch');if(lg)ls.insertBefore(lg,ls.querySelector('.launch-copy'));}
 }

 // --- tap-to-talk microphone (1.0.19) ---
 // The game switches hands-free listening on at launch and reopens the mic after every phrase, so
 // Android's mic keeps clicking on and off. Here the mic stays off until the driver taps Mic, takes
 // one command, then switches off again.
 var micTapAt=0,micOffTimer=null;
 function micBtn(){return document.querySelector('.navigation-strip [data-action=voice]');}
 function micIsOn(){var b=micBtn();return !!b&&b.getAttribute('aria-pressed')==='true';}
 function micOff(){if(micIsOn()){try{window.dispatchEvent(new CustomEvent('cockpit-listen'));}catch(e){}}}
 document.addEventListener('click',function(e){var t=e.target&&e.target.closest&&e.target.closest('button[data-action=voice]');if(t)micTapAt=Date.now();},true);
 function hookMic(){
  var R=window.RedAlertNative;if(!R||R.__moleMic||typeof R.listenOnce!=='function')return;
  var o=R.listenOnce;R.listenOnce=function(done){return o.call(R,function(){var r=done.apply(this,arguments);clearTimeout(micOffTimer);micOffTimer=setTimeout(micOff,150);return r;});};R.__moleMic=1;
 }
 hookMic();var micTries=0,micTimer=setInterval(function(){hookMic();if(++micTries>40)clearInterval(micTimer);},250);
 function micWatch(){
  var b=micBtn();if(!b||b.__moleMicWatch)return;b.__moleMicWatch=1;
  function check(){if(b.getAttribute('aria-pressed')==='true'&&Date.now()-micTapAt>1500){clearTimeout(micOffTimer);micOffTimer=setTimeout(micOff,50);}}
  new MutationObserver(check).observe(b,{attributes:true,attributeFilter:['aria-pressed']});check();
 }

 // --- character screen: let the driver end a leftover route to change character (1.0.19) ---
 function charUnlock(){
  var lock=document.getElementById('player-lock');if(!lock)return;
  var btn=document.getElementById('mole-end-route');
  var locked=/route active/i.test(lock.textContent||'');
  if(!locked){if(btn)btn.hidden=true;return;}
  if(!btn){btn=document.createElement('button');btn.type='button';btn.id='mole-end-route';btn.textContent='End current route and change character';
   btn.onclick=function(){var c=document.querySelector('.cockpit-dashboard [data-action=cancel]');if(c&&!c.disabled)c.click();setTimeout(function(){var cp=document.getElementById('create-player');if(cp)cp.click();},60);};
   lock.parentNode.insertBefore(btn,lock.nextSibling);}
  btn.hidden=false;
 }
 function wire(){
  var dash=document.querySelector('.cockpit-dashboard');if(!dash||dash.__moleNav)return;dash.__moleNav=1;
  var view=dash.closest('.viewport');var phase=dash.querySelector('[data-phase]');var actions=dash.querySelector('.flight-actions');
  var KEYS={repeat:'REPEAT',recenter:'RECENTRE',mute:'MUTE',unmute:'SOUND\\nOFF',"pause-story":'STORY',"resume-story":'STORY\\nPAUSED',save:'SAVE',cancel:'ABORT',resume:'RESUME',retry:'RETRY\\nROUTE',destination:'DEST',launch:'LAUNCH',home:'CREW',voice:'MIC',delegate:'CREW\\nHANDLE'};
  function keyLabels(){if(!actions)return;actions.querySelectorAll('button').forEach(function(b){var k=b.classList.contains('tray-toggle')?(dash.classList.contains('tray-open')?'CLOSE':'MENU'):(b.dataset.action==='resume'&&/start gps/i.test(b.textContent||'')?'START\\nGPS':KEYS[b.dataset.action]);if(k&&b.getAttribute('data-key')!==k)b.setAttribute('data-key',k);});}
  if(actions)new MutationObserver(keyLabels).observe(actions,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['data-action']});
  if(actions&&!actions.querySelector('.tray-toggle')){
   var t=document.createElement('button');t.type='button';t.className='tray-toggle';t.textContent='More controls';t.setAttribute('aria-expanded','false');
   t.onclick=function(){var open=!dash.classList.contains('tray-open');dash.classList.toggle('tray-open',open);t.textContent=open?'Fewer controls':'More controls';t.setAttribute('aria-expanded',String(open));keyLabels();};
   actions.appendChild(t);
  }
  keyLabels();
  function sync(){
   var p=(phase&&phase.textContent||'').trim().toLowerCase();var on=PHASES.indexOf(p)>=0;
   var want=on?'on':'off';if(view&&view.dataset.navMode!==want){var was=view.dataset.navMode;view.dataset.navMode=want;if(!was&&!on)return;if(!on){dash.classList.remove('tray-open');var b=dash.querySelector('.tray-toggle');if(b){b.textContent='More controls';b.setAttribute('aria-expanded','false');}}setTimeout(resize,50);}
  }
  if(phase)new MutationObserver(sync).observe(phase,{childList:true,characterData:true,subtree:true});
  var status=dash.querySelector('.road-status');
  function alertSync(){if(!status)return;status.classList.toggle('mole-alert',/paused|error|failed|lost|unavailable|denied|could not/i.test(status.textContent||''));}
  if(status){new MutationObserver(alertSync).observe(status,{childList:true,characterData:true,subtree:true});alertSync();}
  sync();
 }
 function start(){install();bridgeArt();wire();windscreen();hud();seats();micWatch();charUnlock();new MutationObserver(function(){if(!document.getElementById('mole-nav-layout'))install();bridgeArt();wire();windscreen();hud();seats();micWatch();charUnlock();}).observe(document.documentElement,{childList:true,subtree:true});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();`;
