// A local animated-art launch. Guidance never depends on media playback finishing.
// The opening cinematic (#19) is a native video the app plays over the page. onFinish runs exactly once, when it
// ends by itself; cancel() (the car moved, GPS went bad) stops it and onFinish is not called: the journey
// controller finishes the launch itself. A backstop timer ends it if the app never reports back.
export const NATIVE_CINEMATIC_MAX_MS=45000;
function playNativeLaunch({native,onFinish,onCancel,schedule,cancelTimer}){
 let ended=false,id=null;const end=complete=>{if(ended)return;ended=true;cancelTimer(timer);if(!complete&&id!==null){try{native.stopCinematic(id);}catch{}}if(complete)onFinish();else onCancel();};
 const timer=schedule(()=>{if(id!==null){try{native.stopCinematic(id);}catch{}}end(true);},NATIVE_CINEMATIC_MAX_MS);
 try{id=native.playCinematic(()=>end(true));}catch{end(true);}
 return {cancel:()=>end(false)};
}
export function playLaunch({container,onFinish,onCancel=()=>{},schedule=setTimeout,cancelTimer=clearTimeout,native=container?.ownerDocument?.defaultView?.RedAlertNative}){
 if(native&&typeof native.playCinematic==='function'&&typeof native.stopCinematic==='function')return playNativeLaunch({native,onFinish,onCancel,schedule,cancelTimer});
 const doc=container.ownerDocument,scene=doc.createElement('section');scene.className='launch-scene';scene.setAttribute('aria-label','Launch cinematic');scene.innerHTML='<div class="launch-art"></div><div class="launch-streaks"></div><div class="launch-copy"><small>CELESTIAL HYBRID · RED ALERT</small><h2>Launch sequence</h2><p>Wraith has the road route. Returning to cockpit…</p><button type="button">Skip to cockpit</button></div>';container.append(scene);
 let ended=false,context;const end=complete=>{if(ended)return;ended=true;cancelTimer(timer);scene.remove();if(context)void context.close().catch(()=>{});if(complete)onFinish();else onCancel();};
 const timer=schedule(()=>end(true),doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches?500:5000);scene.querySelector('button').onclick=()=>end(true);
 try{const Audio=doc.defaultView?.AudioContext||doc.defaultView?.webkitAudioContext;if(Audio){context=new Audio();const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type='sine';oscillator.frequency.setValueAtTime(80,context.currentTime);oscillator.frequency.exponentialRampToValueAtTime(240,context.currentTime+1);gain.gain.setValueAtTime(.025,context.currentTime);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+1);oscillator.connect(gain);gain.connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+1);}}catch{}
 return {cancel:()=>end(false)};
}
