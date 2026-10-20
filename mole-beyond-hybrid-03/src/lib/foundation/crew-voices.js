// Which phone voice each crew member speaks with. The phone suggests one per character; the driver can
// change any of them in the crew voice check (kept on this device).
export const CREW_VOICE_KEY='mole-beyond:crew-voices';
export const CREW_ROSTER=[
 {id:'WRAITH',name:'Wraith',role:'Navigation',gender:'male',intro:'Wraith, navigation. I will get us there, Captain. Every turn, every time.'},
 {id:'VEX',name:'Vex',role:'Weapons',gender:'male',intro:'Vex, weapons. Anything follows us home, I make it regret it.'},
 {id:'SILAS',name:'Silas',role:'Scanners and targeting',gender:'male',intro:'Silas. Scanners and targeting. I see what is coming before it arrives.'},
 {id:'BASTION',name:'Bastion',role:'Shields and engineering',gender:'male',intro:'Bastion, engineering. She holds together because I tell her to.'},
 {id:'MAX',name:'Max',role:'Salvage, cargo and trade',gender:'female',intro:'Max. Salvage, cargo and contracts. Stowaway, technically. I earn my berth one pod at a time.'},
 {id:'CHET',name:'Chet',role:'Ship intelligence',gender:'female',intro:'Chet, ship intelligence. I am the ship, Captain. Welcome aboard.'},
];
export function createCrewVoices({storage}={}){
 let options=[],suggested={},chosen={};
 try{chosen=JSON.parse(storage?.getItem(CREW_VOICE_KEY)||'{}')||{};}catch{chosen={};}
 // 1.0.24: Wraith is male. Drop any earlier pick for Wraith so the new default applies.
 if(chosen.__v!==2){delete chosen.WRAITH;chosen.__v=2;try{storage?.setItem(CREW_VOICE_KEY,JSON.stringify(chosen));}catch{}}
 const save=()=>{try{storage?.setItem(CREW_VOICE_KEY,JSON.stringify(chosen));}catch{}};
 const valid=id=>options.some(o=>o.id===id);
 return {
  setOptions(list,crew){options=Array.isArray(list)?list.filter(o=>o&&typeof o.id==='string'):[];suggested=crew&&typeof crew==='object'?crew:{};},
  options:()=>options.slice(),
  // The id passed to the phone for this character (undefined = let the phone use its own pick).
  voiceFor(character){const id=chosen[character];return id&&(!options.length||valid(id))?id:undefined;},
  current(character){return this.voiceFor(character)||suggested[character]||'';},
  label(character){const o=options.find(x=>x.id===this.current(character));if(!o)return 'Phone default';return `${o.id}${o.gender?' · '+o.gender:' · gender unknown'}`;},
  // Step to the next voice, trying voices of the character's gender first.
  next(character){if(!options.length)return '';const want=CREW_ROSTER.find(c=>c.id===character)?.gender;
   const ordered=[...options.filter(o=>o.gender===want),...options.filter(o=>o.gender!==want)];
   const at=ordered.findIndex(o=>o.id===this.current(character));const pick=ordered[(at+1)%ordered.length];chosen[character]=pick.id;save();return pick.id;},
  reset(character){delete chosen[character];save();},
 };
}
