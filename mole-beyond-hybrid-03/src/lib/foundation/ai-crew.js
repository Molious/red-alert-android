// Optional AI crew: when the driver says something that is not a command, the crew answer in character
// using Claude (Anthropic API). Off until the driver pastes their own API key in the Crew panel; the key
// stays on this phone and requests go straight from the phone to Anthropic.
export const AI_KEY='mole-beyond:anthropic-key';
const CREW=`You voice the bridge crew of a small courier starship in a driving game. The player is the Captain, really driving a car on real roads; the game turns their drive into a starship journey.
Crew (use these exact names):
- WRAITH: insectoid navigator, lost his whole hive in the war; the crew is his new hive. Low, sly, loyal. Male.
- VEX: reptilian weapons officer, condemned by his people, saved by an unknown human, owes the Captain. Loud, reckless, grinning. Male.
- SILAS: a being of living light in a crystal body, scanners and targeting, keeps an archive with secrets about the ship. Cold, clipped, precise. Male.
- BASTION: human engineer, survived Earth's fall by serving the machine conquerors and carries the shame; watches the ship's AI. Gruff, calm. Male.
- MAX: stowaway turned salvage, cargo and trade expert. Wily, quick, always counting credits. Female.
- CHET: the ship's AI, rebuilt from the machines that took Earth; warm, dry humour. Female voice.
Rules: reply with 1 to 3 short spoken lines, total under 60 words, as JSON only: [{"character":"NAME","text":"..."}].
The Captain is driving: never ask them to look at the screen, touch the phone, speed or take risks; encourage calm, safe driving. Stay in the fiction; you may answer real-world questions briefly in character. No markdown, no emoji.`;

export function crewContext(state){
 const j=state.journey,c=state.contracts?.active;
 const cargo=Object.entries(state.cargo||{}).filter(([,n])=>n>0).map(([k,n])=>n+' '+k).join(', ')||'empty';
 return [`Captain: ${state.player?.name||'Captain'}.`,j?`Journey: ${j.phase.replaceAll('_',' ')} to ${j.destination?.label||'unknown'}; shields ${j.shields??100}%.`:'Parked, no journey.',
  c?`Contract in the hold: ${c.id}.`:'No contract.',`Credits: ${state.credits}. Hold: ${cargo}.`,j?.safety?`Flight safety rating: ${j.safety.score}/100.`:''].filter(Boolean).join(' ');
}

export function parseCrewReply(text){
 const valid=new Set(['WRAITH','VEX','SILAS','BASTION','MAX','CHET']);
 try{const m=/\[[\s\S]*\]/.exec(String(text));const lines=JSON.parse(m?m[0]:text);
  const out=(Array.isArray(lines)?lines:[]).filter(l=>l&&typeof l.text==='string'&&l.text.trim()).slice(0,3).map(l=>({character:valid.has(String(l.character).toUpperCase())?String(l.character).toUpperCase():'CHET',text:l.text.trim().slice(0,400)}));
  if(out.length)return out;}catch{}
 const plain=String(text||'').replace(/[\[\]{}"]/g,'').trim();return plain?[{character:'CHET',text:plain.slice(0,400)}]:[];
}

export function createAiCrew({native,engine,audio,storage}){
 const getKey=()=>{try{return storage?.getItem(AI_KEY)||'';}catch{return '';}};
 const bridge=()=>typeof native==='function'?native():native;
 let busy=false;const history=[];
 const say=(character,text,id)=>audio.enqueue({id:id||'ai:'+Date.now()+':'+Math.random().toString(36).slice(2,6),text,character,priority:'mission',expiresAt:Date.now()+90000});
 return {
  enabled:()=>/^sk-ant-[\w-]{20,}$/.test(getKey())&&!!bridge()?.askCrew,
  hasKey:()=>!!getKey(),
  setKey(key){const k=String(key||'').trim();if(!/^sk-ant-[\w-]{20,}$/.test(k))throw Error('That does not look like an Anthropic API key (it starts with sk-ant-).');try{storage?.setItem(AI_KEY,k);}catch{throw Error('Could not save the key on this device.');}},
  clearKey(){try{storage?.removeItem(AI_KEY);}catch{}},
  async ask(text){
   if(busy)return;busy=true;
   const user=`${crewContext(engine.snapshot())}\nRecent conversation: ${history.slice(-4).join(' | ')||'none'}\nThe Captain says: "${String(text).slice(0,300)}"`;
   try{
    const reply=await new Promise(resolve=>{const b=bridge();if(!b?.askCrew){resolve({error:'AI crew needs the updated app.'});return;}
     const timer=setTimeout(()=>resolve({error:'The crew took too long to answer.'}),20000);
     b.askCrew({key:getKey(),system:CREW,text:user},(answer,error)=>{clearTimeout(timer);resolve({answer,error});});});
    if(reply.error){say('CHET','Comms are fuzzy, Captain. '+reply.error);return;}
    const lines=parseCrewReply(reply.answer);history.push('Captain: '+text);for(const l of lines){say(l.character,l.text);history.push(l.character+': '+l.text);}
   }finally{busy=false;}
  }
 };
}
