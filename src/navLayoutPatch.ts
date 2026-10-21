// Navigation presentation only. The map camera supplies pitch/bearing; artwork masks frame its glass.
// Parked mode, guidance, microphone policy and dialogue behavior are preserved.

export const NAV_LAYOUT_VERSION = 4;

// Source of the turn classifier used inside the page (kept as a string: release builds run on
// Hermes, which does not keep function source text).
export const classifyTurnSource = "function classifyTurn(t){t=String(t||'').toLowerCase();if(/u-?turn/.test(t))return 'uturn';if(/arriv|destination|you have reached/.test(t))return 'arrive';if(/roundabout|rotary/.test(t))return 'roundabout';if(/(slight|keep|bear) left/.test(t))return 'slight-left';if(/(slight|keep|bear) right/.test(t))return 'slight-right';if(/\\bleft\\b/.test(t))return 'left';if(/\\bright\\b/.test(t))return 'right';return 'straight';}";

export const NAV_PHASES = ['navigating', 'recalculating', 'signal lost', 'launching'];

export const navFrameMask = 'url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%201280%20720%22%20preserveAspectRatio%3D%22none%22%3E%3Cdefs%3E%3Cmask%20id%3D%22glass%22%3E%3Crect%20width%3D%221280%22%20height%3D%22720%22%20fill%3D%22white%22%2F%3E%3Cpath%20fill%3D%22black%22%20d%3D%22M0%2069%20L122%2055%20L264%20340%20L232%20346%20L0%20167Z%20M174%2050%20Q740%2066%201198%207%20L1271%20197%20L1280%20251%20L1196%20348%20L301%20350Z%22%2F%3E%3Cpath%20fill%3D%22black%22%20d%3D%22M0%20150%20Q50%20125%20106%20136%20Q206%20130%20231%20242%20L245%20311%20Q329%20345%20351%20419%20L363%20498%20Q427%20546%20449%20585%20L449%20720%20L0%20720Z%22%2F%3E%3C%2Fmask%3E%3C%2Fdefs%3E%3Crect%20width%3D%221280%22%20height%3D%22720%22%20fill%3D%22white%22%20mask%3D%22url%28%23glass%29%22%2F%3E%3C%2Fsvg%3E")';

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
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard:not(.tray-open) .flight-actions button:is([data-action=destination],[data-action=launch],[data-action=home],[data-action=station],[data-action=crew]){display:none}
.live-cockpit .viewport[data-nav-mode=on] .flight-actions button:is([data-action=launch],[data-action=home]):disabled{display:none}
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard:not(.tray-open) .flight-actions{flex-wrap:nowrap}
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard:not(.tray-open) .flight-actions button{flex:1 1 0;min-width:0;padding:6px 4px;font-size:11px;line-height:1.2}
.live-cockpit .viewport[data-nav-mode=on] .crew-comms{margin:0 0 6px;padding:4px 6px}
.live-cockpit .viewport[data-nav-mode=on] .road-status.mole-alert{color:#ffd0a8;border-left:2px solid #ff9a3c;padding:3px 6px;margin:0 0 5px;font-size:11px}
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard:not(.tray-open):has(.mole-alert) .crew-comms{display:none}
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard:not(.tray-open) .crew-comms span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.live-cockpit .cockpit-dashboard .tray-toggle{display:none}
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard .tray-toggle{display:block;background:#123a46;border-color:#77e3de}
.live-cockpit .viewport[data-nav-mode=on] .space-nebula{opacity:.3}
.live-cockpit .viewport[data-nav-mode=on] .space-stars{opacity:.35}
.live-cockpit .viewport[data-nav-mode=on] :is(.space-planet,.space-moon){display:none}
.live-cockpit .live-navigation>.leaflet-control-container{position:absolute;inset:0;z-index:460;pointer-events:none}
.live-cockpit .live-navigation .leaflet-control-attribution{font-size:9px;background:#e3f1f4d9;color:#162632}
.live-cockpit .viewport[data-nav-mode=on] .live-navigation{border-color:#ffb35c;box-shadow:0 0 0 5px #120c08e6,0 0 0 6px #ff9a3c77,0 0 24px #ff8a2a40;background:radial-gradient(ellipse at 20% 30%,#5b3fa866,transparent 55%),radial-gradient(ellipse at 85% 70%,#0c6fa055,transparent 60%),#02030b}
.live-cockpit .viewport[data-nav-mode=on] .road-map{background:transparent!important}
.live-cockpit .viewport[data-nav-mode=on] .space-nebula{opacity:.75}
.live-cockpit .viewport[data-nav-mode=on] .space-stars{opacity:.9}
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
.live-cockpit .viewport[data-nav-mode=on] .mole-orient{display:block;position:absolute;left:8px;top:8px;z-index:470;margin:0;min-height:44px;padding:6px 10px;font-size:11px;background:#07121ee6;border:1px solid #77e3de;border-radius:8px;color:#d9fbff}

.live-cockpit .viewport[data-nav-mode=on]>.mole-map-credit{display:block;position:absolute;right:34%;bottom:25%;z-index:7;background:#030c1fe8;color:#def;font:10px system-ui;padding:2px 4px}
/* One shared art coordinate system: the map is behind the glass, frame and console. */
@media (orientation:portrait){
.live-cockpit .viewport[data-nav-mode=on]{--tray-h:132px;--crew-h:0px}
.live-cockpit .viewport[data-nav-mode=on] .live-navigation{inset:82px 0 calc(var(--tray-h) + 155px);border:0;border-radius:0;box-shadow:none;overflow:hidden;background:#020713}
.live-cockpit .viewport[data-nav-mode=on] .mole-console{display:block;position:absolute;inset:82px 0 var(--tray-h);height:auto;z-index:4;background:none!important;pointer-events:none}
.live-cockpit .viewport[data-nav-mode=on] .mole-console:before{content:"";position:absolute;inset:0 0 148px;background-image:var(--mole-frame-art);background-size:100% 200%;background-position:top;mask-image:${navFrameMask};mask-size:100% 200%;mask-repeat:no-repeat;mask-position:top;-webkit-mask-image:${navFrameMask};-webkit-mask-size:100% 200%;-webkit-mask-position:top}
.live-cockpit .viewport[data-nav-mode=on] .mole-console:after{content:"";position:absolute;inset:auto 0 0;height:148px;background-image:var(--mole-frame-art);background-size:100% 200%;background-position:bottom;mask-image:${navFrameMask};mask-size:100% 200%;mask-position:bottom;mask-repeat:no-repeat}
.live-cockpit .viewport[data-nav-mode=on] .mole-console .mole-captain{left:-4%;bottom:0;height:47%;max-width:49%;z-index:1}
.live-cockpit .viewport[data-nav-mode=on] .mole-dash{z-index:2;background:#020c18d9;border:1px solid #6dbfe966;border-radius:3px;min-height:35px}
.live-cockpit .viewport[data-nav-mode=on] .mole-dash b{font-size:18px}
.live-cockpit .viewport[data-nav-mode=on] .mole-dash small{font-size:10px}
.live-cockpit .viewport[data-nav-mode=on] .cockpit-dashboard{z-index:8;inset:auto 2% 4px;max-height:128px}
.live-cockpit .viewport[data-nav-mode=on] .mole-orient{left:24%;top:80px;z-index:6}
.live-cockpit .viewport[data-nav-mode=on] .mole-map-zoom{top:78px;right:12px}
.live-cockpit .viewport[data-nav-mode=on] .mole-map-credit{display:block;position:absolute;z-index:7;left:auto;right:3px;bottom:var(--tray-h);background:#030c1fe8;padding:2px 4px;color:#def;text-align:right;font-size:10px}
.live-cockpit .viewport[data-nav-mode=on] .map-status{bottom:6px;font-size:10px;pointer-events:none}
}
.live-cockpit .viewport[data-nav-mode=on] .road-map{inset:0;transform:none}
.live-cockpit .viewport[data-nav-mode=on] .live-navigation:before{display:none}
.live-cockpit .viewport[data-nav-mode=on] .mole-orient{display:block;position:absolute;min-height:44px;margin:0;padding:6px 10px;background:#07121ee6;border:1px solid #77e3de;border-radius:6px;color:#eff;font-size:12px}
.mole-dash2 .mole-bar{display:block;width:70%;height:4px;margin:3px auto 0;background:#0b1f2c;border-radius:2px;overflow:hidden}
.mole-dash2 .mole-bar s{display:block;height:100%;width:100%;background:#5ff0ff;box-shadow:0 0 6px currentColor}
.mole-dash2{background:#030a12b8;border-radius:6px}
.live-cockpit .viewport[data-nav-mode=on] .mole-dash2 b{font-size:13px}
.live-cockpit .viewport[data-nav-mode=on] .mole-dash2 small{font-size:8px}
.live-cockpit .viewport[data-nav-mode=on] .mole-dash .mole-limit{width:30px;height:30px;flex-basis:30px;border-width:3px}
.mole-limit{display:flex;align-items:center;justify-content:center;width:34px;height:34px;flex:0 0 34px;border-radius:50%;background:#fff;border:4px solid #d22;box-sizing:border-box}
.mole-limit b{color:#111!important;font-size:14px!important;text-shadow:none!important}
.mole-limit.unknown{opacity:.35}
.mole-speed b.over{color:#ff6a5c!important;text-shadow:0 0 8px #ff3b30!important}
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
/* 1.0.27: bridge view - small side map screen, slim key bar, captain's chair visible */
.mole-bridge-captain{display:none}
.live-cockpit .viewport[data-bridge=compact] .live-navigation{inset:88px 3% auto 50%;height:26%;border-radius:10px;border:1px solid #5d9ba9;box-shadow:0 0 0 4px #08121dcc,0 0 18px #63dcff44}
.live-cockpit .viewport[data-bridge=compact] .mole-orient,.live-cockpit .viewport[data-bridge=compact] .mole-map-zoom,.live-cockpit .viewport[data-bridge=compact] .map-status,.live-cockpit .viewport[data-bridge=compact] .leaflet-control-zoom{display:none!important}
.live-cockpit .viewport[data-bridge=compact] .mole-bridge-captain{display:block;position:absolute;z-index:4;left:50%;bottom:170px;height:30%;max-height:260px;transform:translateX(-50%);pointer-events:none;filter:drop-shadow(0 6px 14px #000d)}
.live-cockpit .viewport[data-bridge=compact] .cockpit-dashboard{background:linear-gradient(#05070b00,#05070bdd 30%);border:0;box-shadow:none;border-radius:0;inset:auto 0 0;padding:0 10px 8px;max-height:none;overflow:visible}
.live-cockpit .viewport[data-bridge=compact] .cockpit-dashboard>:not(.crew-comms):not(.road-status):not(.flight-actions):not(.crew-event){display:none}
.live-cockpit .viewport[data-bridge=compact] .road-status:not(.mole-alert){display:none}
.live-cockpit .viewport[data-bridge=compact] .crew-comms{background:linear-gradient(90deg,#04101ce0,#04101c80 70%,#04101c00);border-left:2px solid #c4a3ec;border-radius:0 6px 6px 0;margin:0 0 6px}
.live-cockpit .viewport[data-bridge=compact] .crew-comms span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
/* Issue #6: compact keys stay one row in portrait; landscape uses two rows to preserve >=44px targets. */
.live-cockpit .viewport[data-bridge=compact] .flight-actions{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);grid-template-columns:none;gap:4px}
.live-cockpit .viewport[data-bridge=compact] .flight-actions button{display:none}
.live-cockpit .viewport[data-bridge=compact] .flight-actions button:is([data-action=destination],[data-action=station],[data-action=crew],.tray-toggle),
.live-cockpit .viewport[data-bridge=compact] .flight-actions button:is([data-action=launch],[data-action=cancel],[data-action=repeat]):not(:disabled),
.live-cockpit .viewport[data-bridge=compact] .flight-actions button[data-action=resume]:not([hidden]){display:flex;font-size:0;min-height:44px;padding:0 2px;margin:0;border-radius:7px;color:#bff6ff;background:linear-gradient(#122231f5,#070d16f5);border:1px solid #2e4b5c;box-shadow:inset 0 1px 0 #ffffff1a,inset 0 -3px 0 #ff9a3c40,0 3px 8px #000b;align-items:center;justify-content:center}
.live-cockpit .viewport[data-bridge=compact] .flight-actions button::after{content:attr(data-key);font:600 10px/1.15 ui-monospace,Menlo,monospace;letter-spacing:.1em;text-align:center;text-shadow:0 0 6px #4ee4ff99;white-space:pre-line}
.live-cockpit .viewport[data-bridge=compact] .flight-actions button[data-action=launch]{border-color:#77e3de;background:linear-gradient(#155563,#0a2a33)}
.live-cockpit .viewport[data-bridge=compact] .flight-actions button[data-action=cancel]{color:#ffc9c9;border-color:#6a3440}
.live-cockpit .viewport[data-bridge=compact] .tray-toggle{border-color:#4ee4ff88!important}
/* Issue #6 landscape worst case: seven keys at 30px is unsafe; use four columns, two rows. */
@media (orientation: landscape) and (max-height: 600px){
.live-cockpit .viewport[data-bridge=compact] .flight-actions{grid-auto-flow:row;grid-auto-columns:auto;grid-template-columns:repeat(4,minmax(44px,1fr));gap:4px}
.live-cockpit .viewport[data-bridge=compact] .flight-actions button{min-height:44px;min-width:44px}
.live-cockpit .viewport[data-bridge=compact] .flight-actions button::after{letter-spacing:0;font-size:9px;overflow-wrap:anywhere}
}
/* Issue #6 portrait, narrow phones: seven keys at ~49px; tighter labels so STATION fits its key. */
@media (orientation: portrait) and (max-width: 400px){.live-cockpit .viewport[data-bridge=compact] .flight-actions button::after{letter-spacing:.02em}}
.live-cockpit .viewport[data-bridge=compact] .combat-hud,.live-cockpit .viewport[data-bridge=compact] .salvage-feed{display:none}
/* ---- #31 speedo · owner Linux Claude (Chet reviews; please don't edit this section) ----
   Current speed large enough to read at a glance, the posted limit beside it as a road sign. Navigation mode
   only. Sits on the viewport above the windscreen frame art, on the left of the map just under "Heading up":
   clear of the turn card, the route line and ship, the zoom keys and the captain. Placed by speedo() in JS. */
.mole-speedo{display:none}
.live-cockpit .viewport[data-nav-mode=on] .mole-speedo{display:flex;position:absolute;z-index:9;left:10px;top:150px;align-items:center;gap:8px;padding:5px 8px 5px 10px;background:#030a14eb;border:2px solid #5ff0ff77;border-radius:14px;pointer-events:none;box-shadow:0 2px 14px #000c}
.mole-speedo .mole-speedo-now{display:flex;flex-direction:column;align-items:center}
.mole-speedo [data-speedo-speed]{font:700 54px/0.95 system-ui,-apple-system,Roboto,'Segoe UI',sans-serif;color:#fff;font-variant-numeric:tabular-nums;min-width:2.1ch;text-align:center;text-shadow:0 0 8px #000}
.mole-speedo small{font:700 12px/1 system-ui,-apple-system,Roboto,sans-serif;color:#bfefff;letter-spacing:.1em;margin-top:3px}
.mole-speedo.over{border-color:#ff3b30;box-shadow:0 0 0 2px #ff3b3066,0 2px 14px #000c}
.mole-speedo.over [data-speedo-speed]{color:#ff5a4f}
.mole-speedo-limit{display:flex;align-items:center;justify-content:center;width:54px;height:54px;border-radius:50%;background:#fff;border:6px solid #d81e1e;box-sizing:border-box}
.mole-speedo-limit b{font:800 23px/1 system-ui,-apple-system,Roboto,sans-serif;color:#111;font-variant-numeric:tabular-nums}
.mole-speedo-limit.unknown{background:#ffffff33;border-color:#d81e1e88}.mole-speedo-limit.unknown b{color:#ffffffaa}
/* Narrow map: limit sign under the number so the panel stays left of the route line. */
.live-cockpit .viewport[data-nav-mode=on] .mole-speedo.stack{flex-direction:column;gap:6px;padding:6px 8px}
@media(orientation:landscape){.mole-speedo [data-speedo-speed]{font-size:48px}.mole-speedo-limit{width:48px;height:48px;border-width:6px}.mole-speedo-limit b{font-size:21px}}
/* ---- end #31 speedo ---- */
`;

export const navLayoutScript = `(function(){
 if(window.__moleNavLayout)return;window.__moleNavLayout=1;
 var PHASES=${JSON.stringify(NAV_PHASES)};
 function install(){
  if(!document.head||document.getElementById('mole-nav-layout'))return;
  var st=document.createElement('style');st.id='mole-nav-layout';st.textContent=${JSON.stringify(navLayoutCss)};document.head.appendChild(st);
 }
 function resize(){try{window.dispatchEvent(new Event('resize'));}catch(e){}}

 // Orientation belongs to the map camera, not a transformed DOM surface.
 function windscreen(){
  var nav=document.querySelector('.live-cockpit .live-navigation');if(!nav||nav.__moleWs)return;nav.__moleWs=1;
  var northUp=false;try{northUp=localStorage.getItem('mole-beyond:map-orient')==='north';}catch(e){}
  var btn=document.createElement('button');btn.type='button';btn.className='mole-orient';
  function label(){btn.textContent=northUp?'North up':'Heading up';btn.setAttribute('aria-label',northUp?'Map is north up. Switch to heading up':'Map turns with heading. Switch to north up');}
  label();btn.onclick=function(){northUp=!northUp;try{localStorage.setItem('mole-beyond:map-orient',northUp?'north':'heading');}catch(e){}label();window.dispatchEvent(new Event('mole-map-orientation'));};nav.appendChild(btn);
  var view=nav.closest('.viewport'),credit=nav.querySelector('.mole-map-credit');if(view&&credit)view.appendChild(credit);
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
   var sp=document.querySelector('.cockpit-dashboard [data-speed]'),sv=sp&&/^\\d+$/.test(sp.textContent.trim())?sp.textContent.trim():'0';document.querySelectorAll('[data-mole-speed]').forEach(function(e){e.textContent=sv;});var lim=document.querySelector('.cockpit-dashboard [data-limit]'),lv=lim?lim.textContent.trim():'—',saf=document.querySelector('.cockpit-dashboard [data-safety]'),over=/^\\d+$/.test(lv)&&+sv>+lv+4;document.querySelectorAll('[data-mole-limit]').forEach(function(e){e.textContent=lv;});document.querySelectorAll('[data-mole-limit-box]').forEach(function(e){e.classList.toggle('unknown',!/^\\d+$/.test(lv));});document.querySelectorAll('[data-mole-speed]').forEach(function(e){e.classList.toggle('over',over);});document.querySelectorAll('[data-mole-safety]').forEach(function(e){e.textContent=saf?saf.textContent.trim():'—';});var sh=document.querySelector('.cockpit-dashboard [data-shields]'),cr=document.querySelector('.cockpit-dashboard [data-credits]'),shv=sh?sh.textContent.trim():'100%';document.querySelectorAll('[data-mole-shields]').forEach(function(e){e.textContent=shv;});document.querySelectorAll('[data-mole-shield-bar]').forEach(function(e){var n=parseInt(shv,10);e.style.width=(isFinite(n)?Math.max(0,Math.min(100,n)):100)+'%';e.style.background=n<35?'#ff6a5c':n<70?'#ffb35c':'#5ff0ff';});document.querySelectorAll('[data-mole-credits]').forEach(function(e){e.textContent=cr?cr.textContent.trim():'0';});
  }
  var mo=new MutationObserver(upd);[next,dist,document.querySelector('.cockpit-dashboard [data-speed]'),document.querySelector('.cockpit-dashboard [data-shields]'),document.querySelector('.cockpit-dashboard [data-credits]'),document.querySelector('.cockpit-dashboard [data-limit]'),document.querySelector('.cockpit-dashboard [data-safety]')].forEach(function(e){if(e)mo.observe(e,{childList:true,characterData:true,subtree:true});});
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
  document.documentElement.style.setProperty('--mole-frame-art',pl);
 }

 // Live readout uses the blank console screen in the 1280 x 720 navigation art.
 var dashSize='';
 function placeDash(){
  var con=document.querySelector('.live-cockpit .mole-console'),dash=con&&con.querySelector('.mole-dash:not(.mole-dash2)');if(!dash)return;
  var H=con.offsetHeight,W=con.offsetWidth,key=H+'x'+W;if(!H||key===dashSize)return;dashSize=key;
  dash.style.left=(W*0.565).toFixed(1)+'px';dash.style.top=(H-148+(0.57-0.5)*296).toFixed(1)+'px';dash.style.width=(W*0.32).toFixed(1)+'px';dash.style.height='38px';
  var d2=con.querySelector('.mole-dash2');if(d2){d2.style.left=(W*0.3).toFixed(1)+'px';d2.style.top=dash.style.top;d2.style.width=(W*0.255).toFixed(1)+'px';d2.style.height='38px';}
 }
 window.addEventListener('resize',function(){dashSize='';setTimeout(placeDash,60);});
 function seats(){
  var view=document.querySelector('.live-cockpit .viewport');
  if(view&&!view.querySelector('.mole-console')){var con=document.createElement('div');con.className='mole-console';var dash=document.createElement('div');dash.className='mole-dash';dash.innerHTML='<div class="mole-speed"><b data-mole-speed>0</b><small>km/h</small></div><div class="mole-limit" data-mole-limit-box><b data-mole-limit>—</b></div><div><b data-mole-left>—</b><small>km left</small></div>';con.appendChild(dash);var dash2=document.createElement('div');dash2.className='mole-dash mole-dash2';dash2.innerHTML='<div><b data-mole-safety>—</b><small>safety</small></div><div><b data-mole-shields>100%</b><small>shields</small><i class="mole-bar"><s data-mole-shield-bar></s></i></div><div><b data-mole-credits>0</b><small>credits</small></div>';con.appendChild(dash2);var g=captainEl('seat');if(g)con.appendChild(g);view.appendChild(con);}
  placeDash();
  var con2=view&&view.querySelector('.mole-console'),cur=con2&&con2.querySelector('.mole-captain');
  if(con2&&cur&&cur.dataset.captain!==captainKey()){var ng=captainEl('seat');if(ng)con2.replaceChild(ng,cur);}
  if(view){var bc=view.querySelector('.mole-bridge-captain');if(!bc||bc.dataset.captain!==captainKey()){var nb=captainEl('mole-bridge-captain');if(nb){if(bc)bc.replaceWith(nb);else view.appendChild(nb);}}}
  var ls=document.querySelector('.launch-scene');if(ls&&!ls.querySelector('.mole-captain')){var lg=captainEl('launch');if(lg)ls.insertBefore(lg,ls.querySelector('.launch-copy'));}
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
  var KEYS={repeat:'REPEAT',recenter:'RECENTRE',mute:'MUTE',unmute:'SOUND\\nOFF',"pause-story":'STORY',"resume-story":'STORY\\nPAUSED',save:'SAVE',cancel:'ABORT',resume:'RESUME',retry:'RETRY\\nROUTE',destination:'DEST',station:'STATION',crew:'CREW',launch:'LAUNCH',home:'CREW',voice:'MIC',delegate:'CREW\\nHANDLE'};
  function keyLabels(){if(!actions)return;actions.querySelectorAll('button').forEach(function(b){var k=b.classList.contains('tray-toggle')?(dash.classList.contains('tray-open')?'CLOSE':'MENU'):(b.dataset.action==='resume'&&/start gps/i.test(b.textContent||'')?'START\\nGPS':KEYS[b.dataset.action]);if(k&&b.getAttribute('data-key')!==k)b.setAttribute('data-key',k);});}
  if(actions)new MutationObserver(keyLabels).observe(actions,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['data-action']});
  if(actions&&!actions.querySelector('.tray-toggle')){
   var t=document.createElement('button');t.type='button';t.className='tray-toggle';t.textContent='More controls';t.setAttribute('aria-expanded','false');
   t.onclick=function(){var open=!dash.classList.contains('tray-open');dash.classList.toggle('tray-open',open);t.textContent=open?'Fewer controls':'More controls';t.setAttribute('aria-expanded',String(open));keyLabels();bridgeSync();};
   actions.appendChild(t);
  }
  keyLabels();
  // Stopped for 30 s mid-journey: show the bridge. Moving again (8 km/h+): back to the cockpit.
  var speedEl=dash.querySelector('[data-speed]'),stoppedSince=0,movingSince=0,parkedView=false;
  function moving(){var v=parseInt(speedEl&&speedEl.textContent,10);return isFinite(v)?v:null;}
  // Only time spent stopped DURING a journey counts; the clock restarts at every launch.
  var lastPhase='';
  setInterval(function(){var v=moving(),was=parkedView,p=(phase&&phase.textContent||'').trim().toLowerCase(),inJourney=PHASES.indexOf(p)>=0&&p!=='launching';if(p!==lastPhase&&(p==='launching'||PHASES.indexOf(lastPhase)<0)){stoppedSince=0;parkedView=false;}lastPhase=p;/* #11: creeping off at 4+ km/h for ~2 s also leaves the parked bridge (8+ km/h at once); 3 km/h is the dead band against standstill GPS jitter. */if(!inJourney){stoppedSince=0;movingSince=0;parkedView=false;}else if(v!==null&&v>=8){stoppedSince=0;movingSince=0;parkedView=false;}else if(v!==null&&v>=4){stoppedSince=0;if(!movingSince)movingSince=Date.now();if(Date.now()-movingSince>=2000)parkedView=false;}else if(v===null||v<=2){movingSince=0;if(!stoppedSince)stoppedSince=Date.now();if(Date.now()-stoppedSince>=30000)parkedView=true;}else{stoppedSince=0;movingSince=0;}if(was!==parkedView)sync();},1000);
  // Bridge view is compact (side map, slim keys) unless planning a destination, a panel is open, or Menu is open.
  function bridgeSync(){if(!view)return;var off=view.dataset.navMode!=='on',panel=dash.querySelector('.station-panel:not([hidden]),.crew-panel:not([hidden])');var want=off&&!view.classList.contains('planning-destination')&&!panel&&!dash.classList.contains('tray-open')?'compact':'full';if(view.dataset.bridge!==want){view.dataset.bridge=want;setTimeout(resize,60);}}
  new MutationObserver(bridgeSync).observe(dash,{subtree:true,attributes:true,attributeFilter:['hidden','class']});
  if(view)new MutationObserver(bridgeSync).observe(view,{attributes:true,attributeFilter:['class','data-nav-mode']});
  function sync(){
   var p=(phase&&phase.textContent||'').trim().toLowerCase();var on=PHASES.indexOf(p)>=0&&!(parkedView&&p!=='launching');if(view)view.dataset.stopped=parkedView&&PHASES.indexOf(p)>=0?'true':'false';
   var want=on?'on':'off';if(view&&view.dataset.navMode!==want){var was=view.dataset.navMode;view.dataset.navMode=want;/* #31 speedo: re-place when the cockpit layout changes without a resize */if(typeof placeSpeedo==='function')requestAnimationFrame(placeSpeedo);if(!was&&!on)return;if(on){/* Issue #6 safety: close parked-only panels before driving navigation resumes. */
    ['.crew-panel','.station-panel'].forEach(function(sel){var panel=dash.querySelector(sel);if(panel&&!panel.hidden){var close=panel.querySelector('[data-close]');if(close)close.click();else panel.hidden=true;}});
   }if(!on){dash.classList.remove('tray-open');var b=dash.querySelector('.tray-toggle');if(b){b.textContent='More controls';b.setAttribute('aria-expanded','false');}}setTimeout(resize,50);}
  }
  if(phase)new MutationObserver(sync).observe(phase,{childList:true,characterData:true,subtree:true});
  var status=dash.querySelector('.road-status');
  function alertSync(){if(!status)return;status.classList.toggle('mole-alert',/paused|error|failed|lost|unavailable|denied|could not/i.test(status.textContent||''));}
  if(status){new MutationObserver(alertSync).observe(status,{childList:true,characterData:true,subtree:true});alertSync();}
  sync();bridgeSync();
 }
 // ---- #31 speedo · owner Linux Claude (Chet reviews) ----
 // Mirrors the dashboard's speed and limit into a large panel on the windscreen, under "Heading up".
 var speedoPlace=0;
 function placeSpeedo(){speedoPlace=0;var view=document.querySelector('.live-cockpit .viewport'),box=view&&view.querySelector(':scope>.mole-speedo'),nav=view&&view.querySelector('.live-navigation');
  if(!box||!nav||view.dataset.navMode!=='on')return;var v=view.getBoundingClientRect(),n=nav.getBoundingClientRect();if(!n.height)return;
  var o=nav.querySelector('.mole-orient'),r=o&&o.getBoundingClientRect(),top=r&&r.height?r.bottom+10:n.top+10,left=r&&r.width?r.left:n.left+10;
  // Never over the route line: the ship and the road ahead run up the middle of the map.
  var mid=n.left+n.width/2;left=Math.min(left,n.left+8);box.classList.remove('stack');
  box.style.top=Math.round(top-v.top)+'px';box.style.left=Math.round(Math.max(n.left+6,left)-v.left)+'px';
  if(box.getBoundingClientRect().right>mid-16)box.classList.add('stack');}
 function speedo(){
  var view=document.querySelector('.live-cockpit .viewport'),dash=document.querySelector('.cockpit-dashboard');if(!view||!dash)return;
  var box=view.querySelector(':scope>.mole-speedo');
  if(!box){box=document.createElement('div');box.className='mole-speedo';box.setAttribute('role','img');
   box.innerHTML='<div class="mole-speedo-now"><b data-speedo-speed>—</b><small>KM/H</small></div><div class="mole-speedo-limit unknown"><b data-speedo-limit>—</b></div>';
   view.appendChild(box);
   var sp=dash.querySelector('[data-speed]'),lim=dash.querySelector('[data-limit]'),num=box.querySelector('[data-speedo-speed]'),sign=box.querySelector('.mole-speedo-limit'),lv=box.querySelector('[data-speedo-limit]');
   var upd=function(){var s=sp?sp.textContent.trim():'',l=lim?lim.textContent.trim():'',hasS=/^\\d+$/.test(s),hasL=/^\\d+$/.test(l);
    num.textContent=hasS?s:'—';lv.textContent=hasL?l:'—';sign.classList.toggle('unknown',!hasL);box.classList.toggle('over',hasS&&hasL&&+s>+l+4);
    box.setAttribute('aria-label',(hasS?s+' kilometres per hour':'Speed unknown')+(hasL?', limit '+l:''));};
   var mo=new MutationObserver(upd);[sp,lim].forEach(function(e){if(e)mo.observe(e,{childList:true,characterData:true,subtree:true});});upd();
   window.addEventListener('resize',function(){setTimeout(placeSpeedo,80);});
  }
  if(!speedoPlace)speedoPlace=requestAnimationFrame(placeSpeedo);
 }
 // ---- end #31 speedo ----
 function start(){install();bridgeArt();wire();windscreen();hud();seats();charUnlock();speedo();new MutationObserver(function(){if(!document.getElementById('mole-nav-layout'))install();bridgeArt();wire();windscreen();hud();seats();charUnlock();speedo();}).observe(document.documentElement,{childList:true,subtree:true});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();`;
