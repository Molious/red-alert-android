type Request={id:number;doc:string;text?:string;pitch?:number;rate?:number;character?:string;voice?:string};
type Voice={pitch?:number;rate?:number;character?:string;voice?:string};
type Callbacks={onStart:()=>void;onDone:()=>void;onStopped:()=>void;onError:()=>void};
type Timers={set:(fn:()=>void,ms:number)=>unknown;clear:(t:unknown)=>void};
const realTimers:Timers={set:(fn,ms)=>setTimeout(fn,ms),clear:t=>clearTimeout(t as ReturnType<typeof setTimeout>)};

// Speech watchdog (issue #3). After the screen goes off and on, Android can lose the app's connection to
// its speech engine; every later line then fails without any callback and directions go silent for the
// rest of the drive. So each line must start within startTimeoutMs. If it doesn't (and the engine isn't
// actually talking), the engine is rebuilt once and the line retried; a second miss reports 'failed'
// instead of hanging. A stop() that never settles cannot block the next line either.
export function createSpeechSession({speak,stop,send,recover,isSpeaking,onRecover,startTimeoutMs=6000,retryStartTimeoutMs=8000,stopTimeoutMs=1500,timers=realTimers}:{
 speak:(text:string,callbacks:Callbacks,voice:Voice)=>void;stop:()=>Promise<unknown>|unknown;send:(request:Request,outcome:string)=>void;
 recover?:()=>Promise<unknown>|unknown;isSpeaking?:()=>Promise<boolean>|boolean;onRecover?:(request:Request)=>void;
 startTimeoutMs?:number;retryStartTimeoutMs?:number;stopTimeoutMs?:number;timers?:Timers}){
 let current:Request|null=null,epoch=0,attempt=0;
 const finish=(r:Request,outcome:string)=>{if(current!==r)return;current=null;send(r,outcome);};
 const within=(work:()=>Promise<unknown>|unknown,ms:number)=>new Promise<void>(resolve=>{const t=timers.set(resolve,ms);let pending:Promise<unknown>;try{pending=Promise.resolve(work());}catch{pending=Promise.resolve();}pending.catch(()=>{}).finally(()=>{timers.clear(t);resolve();});});
 const live=(r:Request,token:number)=>token===epoch&&current===r;
 function play(r:Request,token:number,retried:boolean){
  const mine=++attempt;let started=false,timer:unknown=null;
  const ours=()=>mine===attempt&&live(r,token);
  const end=(outcome:string)=>{if(!ours())return;timers.clear(timer);finish(r,outcome);};
  speak(r.text||'',{onStart:()=>{if(!ours())return;started=true;timers.clear(timer);},onDone:()=>end('played'),onStopped:()=>end('cancelled'),onError:()=>end('failed')},{pitch:r.pitch,rate:r.rate,character:r.character,...(r.voice?{voice:r.voice}:{})});
  timer=timers.set(()=>{void(async()=>{
   if(started||!ours())return;
   // Some engines never report a start: if it is audibly talking, leave it alone.
   let talking=false;if(isSpeaking){try{talking=await isSpeaking();}catch{talking=false;}}
   if(started||!ours())return;
   if(talking){started=true;return;}
   if(retried||!recover){finish(r,'failed');return;}
   ++attempt;onRecover?.(r);await within(recover,stopTimeoutMs*2);
   if(!live(r,token))return;
   play(r,token,true);
  })();},retried?retryStartTimeoutMs:startTimeoutMs);
 }
 return {
  async say(r:Request){const token=++epoch;const previous=current;current=null;if(previous)send(previous,'cancelled');current=r;try{await within(stop,stopTimeoutMs);if(!live(r,token))return;play(r,token,false);}catch{finish(r,'failed');}},
  cancel(id=0){if(id!==0&&current?.id!==id)return;++epoch;++attempt;const previous=current;current=null;if(previous)send(previous,'cancelled');try{void Promise.resolve(stop()).catch(()=>{});}catch{}}
 };
}

// A permission/speech wait can outlive the capture it was requested for.
export async function waitForCaptureSpeech(isCurrent:()=>boolean,wait:()=>Promise<boolean>):Promise<'ready'|'busy'|'stale'>{const quiet=await wait();if(!isCurrent())return 'stale';return quiet?'ready':'busy';}

export function createAudioSwitch({stop,notify,changed}:{stop:()=>void;notify:(muted:boolean)=>void;changed:(muted:boolean)=>void}){
 let muted=false;
 function set(value:boolean,announce=false){const updated=value!==muted;muted=value;if(muted)stop();if(updated)changed(value);if(announce)notify(value);}
 return {set,toggle:()=>set(!muted,true),isMuted:()=>muted};
}
