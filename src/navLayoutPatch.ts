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

export const NAV_LAYOUT_VERSION = 1;

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
.live-cockpit .viewport[data-nav-mode=on] .road-map .leaflet-control-attribution{font-size:9px;opacity:.85}
`;

export const navLayoutScript = `(function(){
 if(window.__moleNavLayout)return;window.__moleNavLayout=1;
 var PHASES=${JSON.stringify(NAV_PHASES)};
 function install(){
  if(!document.head||document.getElementById('mole-nav-layout'))return;
  var st=document.createElement('style');st.id='mole-nav-layout';st.textContent=${JSON.stringify(navLayoutCss)};document.head.appendChild(st);
 }
 function resize(){try{window.dispatchEvent(new Event('resize'));}catch(e){}}
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
 function start(){install();wire();new MutationObserver(function(){if(!document.getElementById('mole-nav-layout'))install();wire();}).observe(document.documentElement,{childList:true,subtree:true});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();`;
