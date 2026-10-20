// One speech owner.
// - Urgent lines (safety, "turn now") interrupt whatever is playing.
// - Ordinary directions jump the queue and replace older directions, but let a crew line finish.
// - Crew/story lines wait behind directions, are held (not dropped) while a turn is imminent,
//   and are only dropped when the story is paused by the driver or they have expired.
export function createDialogueQueue({play,now=Date.now}){
 let pending=[],active=null,draining=false,storyPaused=false,held=false,queued=0;
 // 'reply' (#20): a spoken answer to a voice command. Plays right after directions, is never held or
 // dropped as story, and never replaces a waiting turn instruction.
 const level=i=>i.priority==='safety'||i.urgent?0:i.priority==='navigation'?1:i.priority==='reply'?1.5:i.priority==='mission'?2:3;
 const isStory=i=>level(i)>=2;
 const expired=i=>i.expiresAt!==undefined&&i.expiresAt<=now();
 function discard(filter=()=>true){const keep=[];for(const e of pending){if(filter(e.item))e.resolve('cancelled');else keep.push(e);}pending=keep;}
 function takeNext(){
  for(let n=0;n<pending.length;n++){
   const e=pending[n];
   if(expired(e.item)||storyPaused&&isStory(e.item)){pending.splice(n,1);n--;e.resolve('skipped');continue;}
   if(held&&isStory(e.item))continue;
   pending.splice(n,1);return e;
  }
  return null;
 }
 async function drain(){if(draining)return;draining=true;try{let e;while((e=takeNext())){const controller=new AbortController();active={controller,item:e.item};let remove;const cancelled=new Promise(r=>{const cb=()=>r('cancelled');controller.signal.addEventListener('abort',cb,{once:true});remove=()=>controller.signal.removeEventListener('abort',cb);});const playback=Promise.resolve().then(()=>controller.signal.aborted?'cancelled':play(e.item,controller.signal)).then(()=>controller.signal.aborted?'cancelled':'played',()=> 'failed');const result=await Promise.race([cancelled,playback]);remove();active=null;e.resolve(result);}}finally{draining=false;}}
 return {
  enqueue(item){
   if(!item||typeof item.text!=='string'||!item.text.trim()||expired(item)||storyPaused&&isStory(item))return Promise.resolve('skipped');
   const l=level(item);
   if(l===0){discard(i=>level(i)<=1);if(active&&level(active.item)!==0)active.controller.abort();}
   else if(l===1)discard(i=>level(i)===1);
   else if(pending.filter(e=>isStory(e.item)).length>=4)return Promise.resolve('skipped');
   queued++;const result=new Promise(resolve=>{pending.push({item:{...item},resolve});pending.sort((a,b)=>level(a.item)-level(b.item));});void drain();return result;
  },
  // Driver's "pause story": drop crew lines now and refuse new ones.
  setStoryPaused(value){storyPaused=!!value;if(storyPaused){discard(isStory);if(active&&isStory(active.item))active.controller.abort();}else void drain();},
  // Turn imminent: keep crew lines queued without starting new ones; a line already playing finishes.
  holdStory(value){held=!!value;if(!held)void drain();},
  clear(){discard();active?.controller.abort();},
  // Lines accepted so far: lets voice control tell whether the crew already answered a command (#20).
  spoken(){return queued;}
 };
}
