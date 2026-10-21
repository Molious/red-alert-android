// Opening cinematic (#19): Chet's video plays once when the app opens, before the title and character select.
// The app plays it natively over the page (RedAlertNative.playCinematic) and reports back when it ends by
// itself, is tapped to skip, or fails. It never plays when a drive is being resumed, so reopening the app
// mid-journey never covers the map. A backstop timer releases the opening if the app never reports back.
export const OPENING_MAX_MS=45000;
export function playOpening({native,journeyActive=()=>false,schedule=setTimeout,cancelTimer=clearTimeout,onDone=()=>{}}={}){
 if(!native||typeof native.playCinematic!=='function'||journeyActive()){onDone('skipped');return {stop(){}};}
 let ended=false,id=null;const end=outcome=>{if(ended)return;ended=true;cancelTimer(timer);onDone(outcome);};
 const timer=schedule(()=>{if(ended)return;if(id!==null){try{native.stopCinematic?.(id);}catch{}}end('timeout');},OPENING_MAX_MS);
 try{id=native.playCinematic(outcome=>end(outcome||'finished'));}catch{end('error');}
 return {stop(){if(ended)return;if(id!==null){try{native.stopCinematic?.(id);}catch{}}end('stopped');}};
}
