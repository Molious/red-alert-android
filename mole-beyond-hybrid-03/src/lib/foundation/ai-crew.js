// Optional AI crew: when the driver says something that is not a command, the crew answer in character
// using Claude (Anthropic API). Off until the driver pastes their own API key in the Crew panel; the key
// stays on this phone and requests go straight from the phone to Anthropic.
export const AI_KEY='mole-beyond:anthropic-key';
const CREW=`You voice the bridge crew of a small courier starship in a driving game. The player is the Captain, really driving a car on real roads; the game turns their drive into a starship journey.
Crew (use these exact names):
- ZYREN: insectoid navigator, lost his whole hive in the war; the crew is his new hive. Low, sly, loyal. Male.
- VEX: reptilian weapons officer, condemned by his people, saved by an unknown human, owes the Captain. Loud, reckless, grinning. Male.
- SILA: a being of living light in a crystal body, scanners and targeting, keeps an archive with secrets about the ship. Cold, clipped, precise. Female.
- BASTION: human engineer, survived Earth's fall by serving the machine conquerors and carries the shame; watches the ship's AI. Gruff, calm. Male.
- MAX: stowaway turned salvage, cargo and trade expert. Wily, quick, always counting credits. Female.
- ATLAS: the ship's AI, rebuilt from the machines that took Earth; warm, dry humour. Male voice.
Rules: reply with one short spoken line, total under 60 words, as JSON only: [{"character":"NAME","text":"..."}].
The Captain is driving: never ask them to look at the screen, touch the phone, speed or take risks; encourage calm, safe driving. Stay in the fiction; you may answer real-world questions briefly in character. No markdown, no emoji.`;

export function crewContext(state){
 const j=state.journey,c=state.contracts?.active;
 const cargo=Object.entries(state.cargo||{}).filter(([,n])=>n>0).map(([k,n])=>n+' '+k).join(', ')||'empty';
 return [`Captain: ${state.player?.name||'Captain'}.`,j?`Journey: ${j.phase.replaceAll('_',' ')} to ${j.destination?.label||'unknown'}; shields ${j.shields??100}%.`:'Parked, no journey.',
  c?`Contract in the hold: ${c.id}.`:'No contract.',`Credits: ${state.credits}. Hold: ${cargo}.`,j?.safety?`Flight safety rating: ${j.safety.score}/100.`:''].filter(Boolean).join(' ');
}

// Public names match native crewVoiceIds.ts; aliases preserve older callers and saves.
const CREW_NAMES=new Set(['ZYREN','VEX','SILA','BASTION','MAX','ATLAS']);
const ALIASES={WRAITH:'ZYREN',SILAS:'SILA',CHET:'ATLAS',MAGS:'MAX'};
const canonical=name=>{const raw=String(name||'').trim().toUpperCase();return ALIASES[raw]||(CREW_NAMES.has(raw)?raw:null);};

// A name must lead the utterance. Mentions in passenger chatter are not wake words.
export function addressedCrew(text){
 const match=/^(?:hey[ ,]+)?([a-z]+)(?:[ ,:!?.]+|$)(.*)$/i.exec(String(text||'').trim());
 const character=canonical(match?.[1]);
 if(!character)return null;
 const rest=match[2].trim();
 const next=/^(?:(?:and|or)[ ,]+)?([a-z]+)(?:[ ,:!?.]+|$)/i.exec(rest);
 if(canonical(next?.[1]))return null; // two leading addressees: do not guess
 return {character,text:rest};
}

export function parseCrewReply(text,addressed){
 const target=canonical(addressed);
 try{const m=/\[[\s\S]*\]/.exec(String(text));const lines=JSON.parse(m?m[0]:text);
  if(!Array.isArray(lines))return [];
  return lines.filter(l=>l&&canonical(l.character)&&(!target||canonical(l.character)===target)&&typeof l.text==='string'&&l.text.trim())
   .slice(0,1).map(l=>({character:canonical(l.character),text:l.text.trim().slice(0,400)}));
 }catch{return [];}
}

export function createAiCrew({native,engine,audio,storage}){
 const getKey=()=>{try{return storage?.getItem(AI_KEY)||'';}catch{return '';}};
 const bridge=()=>typeof native==='function'?native():native;
 let busy=false;const history=[];
 const say=(character,text,id)=>audio.enqueue({id:id||'ai:'+Date.now()+':'+Math.random().toString(36).slice(2,6),text,character,priority:'mission',expiresAt:Date.now()+90000});
 return {
  accepts:text=>!!addressedCrew(text),
  enabled:()=>/^sk-ant-[\w-]{20,}$/.test(getKey())&&!!bridge()?.askCrew,
  hasKey:()=>!!getKey(),
  setKey(key){const k=String(key||'').trim();if(!/^sk-ant-[\w-]{20,}$/.test(k))throw Error('That does not look like an Anthropic API key (it starts with sk-ant-).');try{storage?.setItem(AI_KEY,k);}catch{throw Error('Could not save the key on this device.');}},
  clearKey(){try{storage?.removeItem(AI_KEY);}catch{}},
  async ask(text){
   const addressed=addressedCrew(text);if(!addressed||busy)return;
   const {character}=addressed;
   if(!addressed.text){say(character,'Yes, Captain.');return;}
   if(!/^sk-ant-[\w-]{20,}$/.test(getKey())||!bridge()?.askCrew){say(character,'Comms are offline, Captain. Use the standard voice commands.');return;}
   busy=true;
   const user=`${crewContext(engine.snapshot())}\nRecent conversation: ${history.slice(-4).join(' | ')||'none'}\nThe Captain says: "${String(text).slice(0,300)}"`;
   try{
    const reply=await new Promise(resolve=>{const b=bridge();if(!b?.askCrew){resolve({error:'AI crew needs the updated app.'});return;}
     const timer=setTimeout(()=>resolve({error:'The crew took too long to answer.'}),20000);
     b.askCrew({key:getKey(),system:CREW+`\nOnly ${character} may respond. Return exactly one JSON line with character "${character}".`,text:user},(answer,error)=>{clearTimeout(timer);resolve({answer,error});});});
    if(reply.error){say(character,'Comms are fuzzy, Captain. Please try again when navigation is clear.');return;}
    const lines=parseCrewReply(reply.answer,character);if(!lines.length){say(character,'I could not confirm that reply, Captain. Please try again.');return;}history.push('Captain: '+text);for(const l of lines){say(l.character,l.text);history.push(l.character+': '+l.text);}
   }catch{say(character,'Comms are fuzzy, Captain. Please try again when navigation is clear.');}finally{busy=false;}
  }
 };
}
