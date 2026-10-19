// Trade economy: commodities, stations with their own demand, a cargo hold, and buy/sell rules.
// Pure functions over the save state so the mission engine can validate and persist every change.

export const COMMODITIES={
 scrap:{name:'Salvage scrap',base:12},
 ore:{name:'Raw ore',base:20},
 food:{name:'Provisions',base:16},
 cells:{name:'Power cells',base:34},
 medical:{name:'Medical kits',base:44},
 tech:{name:'Tech parts',base:58},
};
export const COMMODITY_IDS=Object.keys(COMMODITIES);

// Station markets. A modifier above 1 means the station pays (and charges) more for that cargo.
export const STATIONS={
 spaceport:{name:'Celestial Spaceport',mods:{}},
 morna:{name:'Morna Station',mods:{medical:1.4,food:1.15,tech:.9}},
 prism:{name:'Prism Anchorage',mods:{tech:1.35,ore:.85,cells:1.1}},
 halfway:{name:'Halfway Outpost',mods:{food:1.35,cells:1.15,scrap:.9}},
 churn:{name:'The Churn',mods:{scrap:.7,ore:.8,tech:1.25}},
 aurelian:{name:'Aurelian Relay',mods:{tech:1.2,medical:1.1,ore:.9}},
 dustfall:{name:'Dustfall Colony',mods:{food:1.3,medical:1.3,cells:.9}},
 beacon:{name:'Beacon Nine',mods:{cells:1.45,scrap:1.1}},
 repository:{name:'Silent Repository',mods:{tech:1.25,scrap:1.15,food:1.1}},
 verdant:{name:'Verdant Ring',mods:{food:.7,medical:1.15,ore:1.1}},
 forge:{name:'Forge Dock',mods:{ore:1.4,scrap:1.35,tech:.8}},
 refuge:{name:'Outer Refuge',mods:{medical:1.35,food:1.25,tech:.9}},
 horizon:{name:'Horizon Watch',mods:{tech:1.4,cells:1.2,food:1.1}},
};
export const STATION_IDS=Object.keys(STATIONS);
export const HOLD_CAPACITY={standard:12,interceptor:10,sovereign:20};

export function hash(text){let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}

// A real destination always docks at the same fictional station.
export function stationForDestination(d){
 if(!d||!Number.isFinite(d.lat)||!Number.isFinite(d.lng))return 'spaceport';
 const ports=STATION_IDS.filter(id=>id!=='spaceport');
 return ports[hash(d.lat.toFixed(3)+','+d.lng.toFixed(3))%ports.length];
}

export const dayNumber=(t=Date.now())=>Math.floor(t/86400000);

export function marketPrices(stationId,day=dayNumber()){
 const station=STATIONS[stationId]||STATIONS.spaceport,out={};
 for(const id of COMMODITY_IDS){
  const wave=Math.sin((hash(stationId+':'+id)%1000)/159+day*1.3);
  const buy=Math.max(2,Math.round(COMMODITIES[id].base*(station.mods[id]||1)*(1+.15*wave)));
  out[id]={buy,sell:Math.max(1,Math.floor(buy*.82))};
 }
 return out;
}

export function emptyCargo(){return Object.fromEntries(COMMODITY_IDS.map(id=>[id,0]));}
export function cargoOf(state){return {...emptyCargo(),...(state.cargo||{})};}
export function holdCapacity(state){return HOLD_CAPACITY[state.ship]||HOLD_CAPACITY.standard;}
export function holdUsed(state){const c=cargoOf(state);return COMMODITY_IDS.reduce((n,id)=>n+c[id],0)+(state.contracts?.active?.units||0);}
export function holdFree(state){return Math.max(0,holdCapacity(state)-holdUsed(state));}

export function validateCargo(state){
 if(state.cargo===undefined)return;
 if(!state.cargo||typeof state.cargo!=='object')throw Error('Invalid cargo');
 for(const [id,n] of Object.entries(state.cargo))if(!COMMODITIES[id]||!Number.isSafeInteger(n)||n<0)throw Error('Invalid cargo');
 if(state.station!==undefined&&!STATIONS[state.station])throw Error('Invalid station');
 if(holdUsed(state)>holdCapacity(state))throw Error('Cargo hold over capacity');
}

// Adds cargo up to free space; returns how many units actually fit.
export function addCargo(state,id,units){
 if(!COMMODITIES[id]||!Number.isSafeInteger(units)||units<=0)return 0;
 const fit=Math.min(units,holdFree(state));if(!fit)return 0;
 state.cargo={...cargoOf(state),[id]:cargoOf(state)[id]+fit};return fit;
}
export function removeCargo(state,id,units){
 const have=cargoOf(state)[id]||0,take=Math.min(have,Math.max(0,units|0));if(!take)return 0;
 state.cargo={...cargoOf(state),[id]:have-take};return take;
}

// Mutates a copy of the save. Credits move through the ledger so the balance check still holds.
export function applyTrade(state,{op,commodity,units=1,day=dayNumber()}){
 if(!['buy','sell'].includes(op))throw Error('Choose buy or sell');
 if(!COMMODITIES[commodity])throw Error('Unknown cargo');
 if(!Number.isSafeInteger(units)||units<1||units>50)throw Error('Invalid amount');
 const station=state.station||'spaceport',price=marketPrices(station,day)[commodity];
 if(op==='buy'){
  const cost=price.buy*units;if(cost>state.credits)throw Error('Not enough credits');
  if(units>holdFree(state))throw Error('Not enough room in the hold');
  addCargo(state,commodity,units);state.ledger.push({missionId:'trade:'+state.revision+':buy:'+commodity,amount:-cost,kind:'trade'});state.credits-=cost;
  return {op,commodity,units,total:cost,station};
 }
 if((cargoOf(state)[commodity]||0)<units)throw Error('Not enough cargo to sell');
 removeCargo(state,commodity,units);const income=price.sell*units;
 state.ledger.push({missionId:'trade:'+state.revision+':sell:'+commodity,amount:income,kind:'trade'});state.credits+=income;
 return {op,commodity,units,total:income,station};
}
