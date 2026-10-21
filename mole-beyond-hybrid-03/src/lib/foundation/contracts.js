// Story-driven delivery contracts. A contract rides along with a real journey: you accept it while
// parked, the crew talk it through on the way, and it is delivered when you arrive. The first five
// form a story arc ("The Kestrel"); after that the crew pick up regular jobs from the dispatch board.
import {MISSIONS} from './stories.js';
import {STATIONS,hash} from './economy.js';

// Each beat is two lines: `text` when it happens, `done` once the crew have dealt with it.
export const STORY_ARC=[
 {id:'arc-1',title:'Medical supplies',client:'Dr Ilse Varr',station:'morna',cargo:'medical',units:2,reward:120,
  brief:'Morna Station’s clinic is out of sterile packs. Dr Varr asked for us by name.',
  offer:{character:'MAX',text:'Captain, Max here. Dr Ilse Varr at Morna Station needs two crates of medical kits. One hundred and twenty credits, and she asked for us by name.'},
  depart:{character:'WRAITH',text:'Medical cargo is secure. Course plotted for Morna Station.'},
  mid:{character:'SILAS',text:'A courier beacon is repeating on an old frequency. Registry: the Kestrel. Reported lost three weeks ago.',done:'Logged. The beacon is weak, but it is real.'},
  arrive:{character:'MAX',text:'Dr Varr signed for the crates. She says the Kestrel was carrying her last shipment when it vanished. She wants to know what happened.'}},
 {id:'arc-2',title:'Sealed diplomatic pouch',client:'Envoy Teshar',station:'aurelian',cargo:null,units:1,reward:150,
  brief:'An envoy at Aurelian Relay needs a sealed pouch delivered with an unbroken chain of custody.',
  offer:{character:'MAX',text:'Envoy Teshar at Aurelian Relay wants a sealed pouch carried with a clean chain of custody. One fifty. The Relay also keeps every courier log, the Kestrel’s included.'},
  depart:{character:'WRAITH',text:'Pouch sealed and logged. Heading for Aurelian Relay.'},
  mid:{character:'VEX',text:'Someone pinged our hull with a targeting scan and ran. Amateurs. Or they wanted us to notice.',done:'Weapons stay warm. Nobody touches the envoy’s pouch.'},
  arrive:{character:'SILAS',text:'The Relay’s logs show the Kestrel’s last jump ended near the Silent Repository. Someone tried to erase that entry.'}},
 {id:'arc-3',title:'Archive fragments',client:'Archivist Oen',station:'repository',cargo:'tech',units:2,reward:170,
  brief:'The Silent Repository wants damaged record cores returned for restoration.',
  offer:{character:'MAX',text:'The Silent Repository is paying one seventy to bring two damaged record cores home. It is exactly where the Kestrel disappeared. Coincidence costs extra, Captain.'},
  depart:{character:'SILAS',text:'These cores are older than this ship. I will keep them cold and quiet.'},
  mid:{character:'SILAS',text:'One of the cores is still writing. It holds a fragment of the Kestrel’s flight recorder.',done:'Fragment copied. The Kestrel’s pilot says they were boarded, not destroyed.'},
  arrive:{character:'CHET',text:'The Archivist confirms the Kestrel was taken under tow toward Beacon Nine. The beacon there has been dark ever since.'}},
 {id:'arc-4',title:'Emergency power cells',client:'Keeper Rhun',station:'beacon',cargo:'cells',units:3,reward:200,
  brief:'Beacon Nine is running on reserves. Restore its power and its sensors come back with it.',
  offer:{character:'MAX',text:'Beacon Nine is on reserve power. Three crates of cells, two hundred credits. Light it up and its sensors will show us where the Kestrel was taken.'},
  depart:{character:'BASTION',text:'Power cells strapped down. If anyone shoots at us today, the shields are ready.'},
  mid:{character:'VEX',text:'Raider markings on the long-range scan. Same scavengers who took the Kestrel, I would bet my tail on it.',done:'They broke off. They know we are coming now.'},
  arrive:{character:'WRAITH',text:'The beacon is back online. Its last sweep tracked the Kestrel to Horizon Watch. The crew may still be alive.'}},
 {id:'arc-5',title:'Long-range sensor module',client:'Commander Saye',station:'horizon',cargo:'tech',units:2,reward:300,
  brief:'Horizon Watch needs a sensor module to find the missing Kestrel crew.',
  offer:{character:'MAX',text:'Horizon Watch needs a long-range sensor module to search for survivors. Three hundred credits. This is the one, Captain.'},
  depart:{character:'WRAITH',text:'Sensor module aboard. Plotting for Horizon Watch. Let us bring them home.'},
  mid:{character:'SILAS',text:'Faint life signs on the Kestrel’s frequency. Four of them. They are alive.',done:'Signal locked. Horizon Watch is sending a rescue shuttle on our mark.'},
  arrive:{character:'CHET',text:'The Kestrel’s crew are aboard the rescue shuttle. Dr Varr is waiting for them at Morna. Well flown, Captain. The dispatch board has new work for us.'}},
];

const JOB_CHARACTERS=['MAX','WRAITH','BASTION','MAX'];
// After the arc: rolling jobs built from the dispatch board catalogue.
export function boardContract(n){
 const m=MISSIONS[n%MISSIONS.length],stationIds=Object.keys(STATIONS).filter(id=>id!=='spaceport');
 const station=stationIds.find(id=>STATIONS[id].name===m.destination)||stationIds[hash(m.destination)%stationIds.length];
 const units=1+(hash('units:'+n)%3);
 return {id:'job-'+n,title:m.title,client:'Dispatch board',station,cargo:null,units,reward:m.reward,brief:m.brief,
  offer:{character:'MAX',text:`New job on the board: ${m.title.toLowerCase()} for ${m.destination}. ${m.reward} credits.`},
  depart:{character:JOB_CHARACTERS[n%JOB_CHARACTERS.length],text:`${m.title} secured. Heading for ${m.destination}.`},
  mid:null,
  arrive:{character:'MAX',text:`${m.title} delivered to ${m.destination}. ${m.reward} credits in the account.`}};
}

export function contractState(state){return state.contracts||{chapter:0,jobs:0,completed:[],active:null};}

// Turning an offer down: a story chapter waits until next time (a dispatch job is offered instead);
// a dispatch job is replaced by the next one on the board.
export function declineContract(state,offerId){
 const offer=contractOffer(state);if(!offer)throw Error('Finish the current contract first');if(offer.id!==offerId)throw Error('That contract is no longer offered');
 const c=contractState(state);state.contracts={...c,completed:[...c.completed],skipArc:offer.id.startsWith('arc-')?true:c.skipArc===true,jobs:offer.id.startsWith('job-')?c.jobs+1:c.jobs};return offer;
}

// The contract currently offered, or null while one is active.
export function contractOffer(state){
 const c=contractState(state);if(c.active)return null;
 return c.chapter<STORY_ARC.length&&!c.skipArc?STORY_ARC[c.chapter]:boardContract(c.jobs);
}
// An offer Max took on her own because the Captain didn't answer (#4) can be handed back by voice until
// its first story beat plays. It counts as declined.
export function releaseContract(state,id){
 const c=contractState(state);if(!c.active||c.active.id!==id)throw Error('That contract is not in the hold');if(c.active.beats.length)throw Error('Too late to hand that one back, Captain');
 state.contracts={...c,completed:[...c.completed],active:null,skipArc:id.startsWith('arc-')?true:c.skipArc===true,jobs:id.startsWith('job-')?c.jobs+1:c.jobs};
}
export function contractById(id){return STORY_ARC.find(c=>c.id===id)||(/^job-\d+$/.test(id)?boardContract(Number(id.slice(4))):null);}

export function validateContracts(state){
 if(state.contracts===undefined)return;
 const c=state.contracts;
 if(!c||!Number.isSafeInteger(c.chapter)||c.chapter<0||c.chapter>STORY_ARC.length||!Number.isSafeInteger(c.jobs)||c.jobs<0||!Array.isArray(c.completed)||c.completed.some(x=>typeof x!=='string'))throw Error('Invalid contracts');
 if(c.skipArc!==undefined&&typeof c.skipArc!=='boolean')throw Error('Invalid contracts');
 if(c.active!==null){if(!c.active||!contractById(c.active.id)||!Number.isSafeInteger(c.active.units)||c.active.units<1||!Array.isArray(c.active.beats))throw Error('Invalid active contract');}
}

export function acceptContract(state,offerId,freeSpace){
 const offer=contractOffer(state);
 if(!offer)throw Error('Finish the current contract first');
 if(offer.id!==offerId)throw Error('That contract is no longer offered');
 if(offer.units>freeSpace)throw Error('Not enough room in the hold for this contract');
 const c=contractState(state);
 state.contracts={...c,completed:[...c.completed],active:{id:offer.id,units:offer.units,beats:[]}};
 return offer;
}

// Called when a real journey arrives. Returns the delivered contract (or null).
export function deliverContract(state){
 const c=contractState(state);if(!c.active)return null;
 const contract=contractById(c.active.id);
 state.contracts={skipArc:false,chapter:c.active.id.startsWith('arc-')?c.chapter+1:c.chapter,jobs:c.active.id.startsWith('job-')?c.jobs+1:c.jobs,completed:[...c.completed,c.active.id],active:null};
 return contract;
}
