// Android events carry no request ID. Keep ownership until the native end event,
// even after its JS command callback was delivered or cancelled.
export function createRecognitionGate<T>(){
 let owner:T|null=null;const waiters=new Set<(value:boolean)=>void>();
 return {
  current:()=>owner,
  claim(value:T){if(owner!==null)return false;owner=value;return true;},
  release(){const previous=owner;owner=null;for(const done of [...waiters])done(true);return previous;},
  wait(timeout=5000):Promise<boolean>{if(owner===null)return Promise.resolve(true);return new Promise(resolve=>{const done=(value:boolean)=>{clearTimeout(timer);waiters.delete(done);resolve(value)};const timer=setTimeout(()=>done(false),timeout);waiters.add(done);});}
 };
}
