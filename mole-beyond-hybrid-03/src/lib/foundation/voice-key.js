// ElevenLabs key for the crew voices (#33). Entered in the Crew panel and kept on this phone only; the
// game hands it to the app so lines can be voiced. Without it, the crew use the phone's own voices.
export const VOICE_KEY='mole-beyond:elevenlabs-key';
const VALID=/^(sk_[a-f0-9]{30,80}|[a-f0-9]{32})$/i;
export function createVoiceKey({storage,native}){
 const bridge=()=>typeof native==='function'?native():native;
 const get=()=>{try{return storage?.getItem(VOICE_KEY)||'';}catch{return '';}};
 const sync=()=>{try{bridge()?.setVoiceKey?.(get());}catch{}};
 return {
  hasKey:()=>!!get(),
  set(key){const k=String(key||'').trim();if(!VALID.test(k))throw Error('That does not look like an ElevenLabs API key (it usually starts with sk_).');try{storage?.setItem(VOICE_KEY,k);}catch{throw Error('Could not save the key on this device.');}sync();},
  clear(){try{storage?.removeItem(VOICE_KEY);}catch{}sync();},
  sync,
 };
}
