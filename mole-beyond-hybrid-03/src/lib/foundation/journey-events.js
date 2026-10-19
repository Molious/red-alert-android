// Crew encounters along a real journey. Each journey deals its own deck (seeded by the journey id):
// a scan, salvage collection, a contract story beat, a combat or trader encounter, and repairs.
// Every outcome is deterministic for its event, so the save reducer and the voice lines always agree.
import {hash,cargoOf,holdFree,COMMODITIES,marketPrices,dayNumber} from './economy.js';
import {contractById,contractState} from './contracts.js';

export const ENCOUNTER_TYPES=new Set(['scan','salvage','contact','combat','repair','trader','story']);
export const ENEMY_TIERS={
 scout:{name:'scout',damage:8,bounty:12},
 raider:{name:'raider',damage:14,bounty:22},
 warship:{name:'warship',damage:24,bounty:40},
};
const ACTIONS={scan:['scan'],salvage:['collect'],contact:['acknowledge'],combat:['defend','evade'],repair:['repair'],trader:['accept','decline'],story:['acknowledge']};
export const encounterActions=type=>ACTIONS[type]||[];

function tierFor(seed){const n=seed%10;return n<5?'scout':n<9?'raider':'warship';}
const SALVAGE_KINDS=['scrap','scrap','ore','tech','cells'];

// The scenes dealt for one journey, in order of route progress.
export function encounterDeck(journey,state={}){
 const seed=hash(journey.id),deck=[];
 deck.push({type:'scan',at:.12,character:'SILAS',text:'Captain, a faint signal is crossing our flight path. I can run a passive scan while Wraith keeps us on course.'});
 const kind=SALVAGE_KINDS[seed%SALVAGE_KINDS.length],units=1+(seed>>>3)%3;
 deck.push({type:'salvage',at:.28,character:'MAX',salvage:{kind,units,credits:5+(seed>>>5)%11},text:`Max here. That pod is carrying ${units} unit${units>1?'s':''} of ${COMMODITIES[kind].name.toLowerCase()}. I can bring it in with the shuttle. No change to our route.`});
 const active=contractState(state).active,contract=active&&contractById(active.id);
 if(contract?.mid)deck.push({type:'story',at:.42,character:contract.mid.character,contractId:contract.id,text:contract.mid.text,done:contract.mid.done});
 if((seed>>>7)%3===2){
  deck.push({type:'trader',at:.56,character:'MAX',...traderOffer(journey,state,seed)});
 }else{
  const tier=tierFor(seed>>>9);
  deck.push({type:'contact',at:.52,character:'VEX',tier,text:`Unidentified contact behind us. Looks like a ${tier}. I am taking the weapons station. Stay on the navigation route.`});
  deck.push({type:'combat',at:.62,character:'VEX',tier,text:`The ${tier} is closing. I can defend, or Wraith can cloak us and evade. I will handle it if you are busy.`});
 }
 deck.push({type:'repair',at:.78,character:'BASTION',text:'Engineering here. I can restore the shield array while we continue. Nothing needs your attention away from the road.'});
 return deck.map(s=>({...s,actions:ACTIONS[s.type],id:`${journey.id}:${s.type}`}));
}

// A trader offer: buy some of our cargo above market, or sell us cargo below it.
function traderOffer(journey,state,seed){
 const cargo=cargoOf(state),prices=marketPrices('spaceport',dayNumber());
 const owned=Object.keys(cargo).filter(id=>cargo[id]>0);
 if(owned.length){const id=owned[seed%owned.length],units=Math.min(cargo[id],1+(seed>>>4)%3),price=Math.round(prices[id].buy*1.2);
  return {trade:{op:'sell',commodity:id,units,price},text:`A freighter is hailing us. They will pay ${price*units} credits for ${units} ${COMMODITIES[id].name.toLowerCase()}. That is above market. Say accept or decline.`};}
 const id=['cells','food','ore'][seed%3],units=1+(seed>>>4)%2,price=Math.max(1,Math.round(prices[id].buy*.75));
 return {trade:{op:'buy',commodity:id,units,price},text:`A freighter is offloading ${units} ${COMMODITIES[id].name.toLowerCase()} for ${price*units} credits, well under market. Say accept or decline.`};
}

export function nextCrewEvent(journey,{progress,nearTurn,guidanceReady,storyPaused,state}={}){
 if(!journey||journey.activeEvent||nearTurn||!guidanceReady||storyPaused||!Number.isFinite(progress))return null;
 return encounterDeck(journey,state).find(s=>progress>=s.at&&!journey.completedEventIds.includes(s.id))||null;
}

// What resolving an encounter does to the save. `state` is the save before the change.
export function encounterOutcome(event,action,state={}){
 if(!event||!ENCOUNTER_TYPES.has(event.type))throw Error('Unsupported crew action');
 const allowed=[...(ACTIONS[event.type]||[]),'delegate'];if(!allowed.includes(action))throw Error('Unsupported crew action');
 const shields=Number.isFinite(state.journey?.shields)?state.journey.shields:100,out={action,reward:0,shields,cargo:{},lines:[]};
 const say=(character,text)=>out.lines.push({id:event.id+':resolved',character,text,priority:'mission'});
 switch(event.type){
  case 'scan':say('SILAS','Scan complete. The signal is a drifting cargo pod.');break;
  case 'salvage':{const s=event.salvage||{kind:'scrap',units:1,credits:10},fit=Math.min(s.units,holdFree(state));out.reward=s.credits;if(fit)out.cargo[s.kind]=fit;
   say('MAX',fit?`Salvage secured. ${fit} ${COMMODITIES[s.kind].name.toLowerCase()} in the hold and ${s.credits} credits for the pod. Your route is unchanged.`:`Our hold is full, so I stripped the pod for parts. ${s.credits} credits. Your route is unchanged.`);break;}
  case 'contact':say('VEX',`Contact confirmed as a ${event.tier||'raider'}. Crew defence is ready.`);break;
  case 'combat':{const t=ENEMY_TIERS[event.tier]||ENEMY_TIERS.raider;const choice=action==='delegate'?(shields>50?'defend':'evade'):action;
   const hit=choice==='defend'?t.damage:Math.round(t.damage/2.5);out.shields=Math.max(0,shields-hit);
   if(out.shields===0){const c=cargoOf(state);for(const id of ['ore','scrap','tech'])if(c[id]>0)out.cargo[id]=-Math.ceil(c[id]/2);
    say('BASTION','Shields are down. They grabbed part of our cargo before they broke off. Get us to the next stop and I will patch us up.');break;}
   if(choice==='defend'){out.reward=t.bounty;say('VEX',`The ${t.name} is breaking apart. We took a hit, shields at ${out.shields} percent. ${t.bounty} credit bounty claimed.`);}
   else say('WRAITH',`Cloaked and clear. The ${t.name} lost us. Shields at ${out.shields} percent. No bounty, but no real damage.`);
   out.choice=choice;break;}
  case 'repair':out.shields=100;say('BASTION','Shield repairs complete. The ship is ready for the next leg.');break;
  case 'trader':{const t=event.trade;const take=action==='accept'||action==='delegate'&&t?.op==='sell'; // the crew never spend credits unasked
   if(take&&t){const have=cargoOf(state)[t.commodity]||0,total=t.price*t.units;
    if(t.op==='sell'&&have>=t.units){out.reward=total;out.cargo[t.commodity]=-t.units;say('MAX',`Deal done. ${total} credits for ${t.units} ${COMMODITIES[t.commodity].name.toLowerCase()}.`);break;}
    if(t.op==='buy'&&(state.credits||0)>=total&&holdFree(state)>=t.units){out.reward=-total;out.cargo[t.commodity]=t.units;say('MAX',`Deal done. ${t.units} ${COMMODITIES[t.commodity].name.toLowerCase()} in the hold for ${total} credits. We will sell them at the next station.`);break;}
    if(action==='accept'){say('MAX','We cannot cover that deal right now. I have told them no.');break;}}
   say('MAX','I passed on the deal. The freighter is moving on.');break;}
  case 'story':say(event.character||'SILAS',event.done||'Understood.');break;
 }
 return out;
}

// Kept for callers that only need the spoken lines.
export function resolveCrewEvent(event,action,state={}){
 const o=encounterOutcome(event,action,state);
 return {outcome:action==='delegate'?'crew_handled':action,lines:o.lines,reward:o.reward,shieldDelta:o.shields-(state.journey?.shields??100)};
}
