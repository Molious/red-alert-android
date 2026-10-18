type Request={id:number;doc:string};
type Result={locationGranted:boolean;microphoneGranted:boolean;speechReady:boolean};
type Dependencies={permission:()=>Promise<{granted:boolean}>;microphone:()=>Promise<{granted:boolean}>;voices:()=>Promise<unknown[]>;isActive:()=>boolean;isCurrent:(r:Request)=>boolean;send:(r:Request,result:Result)=>void};
// Permission dialogs may briefly change AppState. Do not start speech or GPS until
// both dialogs and Android's lazy TTS initialization have finished.
export function createSessionPreparation(d:Dependencies){
 let current:{request:Request;result:Result|null}|null=null;
 function deliver(){const c=current;if(!c||!c.result||!d.isActive()||!d.isCurrent(c.request))return;current=null;d.send(c.request,c.result);}
 return {
  async start(request:Request){const c={request,result:null as Result|null};current=c;let locationGranted=false,microphoneGranted=false,speechReady=false;
   try{locationGranted=(await d.permission()).granted;}catch{}
   if(current!==c||!d.isCurrent(request))return;
   try{microphoneGranted=(await d.microphone()).granted;}catch{}
   if(current!==c||!d.isCurrent(request))return;
   let timer:ReturnType<typeof setTimeout>|undefined;
   try{const voices=await Promise.race([d.voices(),new Promise<unknown[]>(r=>{timer=setTimeout(()=>r([]),10000)})]);speechReady=voices.length>0;}catch{}finally{clearTimeout(timer);}
   if(current!==c||!d.isCurrent(request))return;c.result={locationGranted,microphoneGranted,speechReady};deliver();
  },
  foreground:deliver,pending:()=>current!==null,
  cancel(id=0){if(id===0||current?.request.id===id)current=null;}
 };
}
