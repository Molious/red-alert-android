type Request={id:number;doc:string;text?:string;pitch?:number;rate?:number};
type Voice={pitch?:number;rate?:number};
type Callbacks={onDone:()=>void;onStopped:()=>void;onError:()=>void};
export function createSpeechSession({speak,stop,send}:{speak:(text:string,callbacks:Callbacks,voice:Voice)=>void;stop:()=>Promise<unknown>|unknown;send:(request:Request,outcome:string)=>void}){
 let current:Request|null=null,epoch=0;
 const finish=(r:Request,outcome:string)=>{if(current!==r)return;current=null;send(r,outcome);};
 return {
  async say(r:Request){const token=++epoch;const previous=current;current=null;if(previous)send(previous,'cancelled');current=r;try{await stop();if(token!==epoch||current!==r)return;speak(r.text||'',{onDone:()=>finish(r,'played'),onStopped:()=>finish(r,'cancelled'),onError:()=>finish(r,'failed')},{pitch:r.pitch,rate:r.rate});}catch{finish(r,'failed');}},
  cancel(id=0){if(id!==0&&current?.id!==id)return;++epoch;const previous=current;current=null;if(previous)send(previous,'cancelled');void Promise.resolve(stop()).catch(()=>{});}
 };
}

// A permission/speech wait can outlive the capture it was requested for.
export async function waitForCaptureSpeech(isCurrent:()=>boolean,wait:()=>Promise<boolean>):Promise<'ready'|'busy'|'stale'>{const quiet=await wait();if(!isCurrent())return 'stale';return quiet?'ready':'busy';}

export function createAudioSwitch({stop,notify,changed}:{stop:()=>void;notify:(muted:boolean)=>void;changed:(muted:boolean)=>void}){
 let muted=false;
 function set(value:boolean,announce=false){const updated=value!==muted;muted=value;if(muted)stop();if(updated)changed(value);if(announce)notify(value);}
 return {set,toggle:()=>set(!muted,true),isMuted:()=>muted};
}
