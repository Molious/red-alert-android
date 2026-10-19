// Station panel: the contract on offer (or in the hold), the cargo hold, and the station market.
// Trading only happens while parked; the controller enforces that too.
import {STATIONS,COMMODITIES,COMMODITY_IDS,marketPrices,cargoOf,holdUsed,holdCapacity} from './economy.js';
import {contractOffer,contractById,STORY_ARC} from './contracts.js';

const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const parkedPhases=['resolving_destination','route_ready'];
export function canTrade(journey){return !journey||['arrived','cancelled'].includes(journey.phase)||parkedPhases.includes(journey.phase);}

export function installStation({engine,controller,container,now=Date.now}){
 const panel=document.createElement('section');panel.className='station-panel';panel.hidden=true;panel.setAttribute('aria-label','Station, contracts and market');
 container.append(panel);let open=false,last='';
 panel.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;
  if(b.dataset.trade){const [op,commodity]=b.dataset.trade.split(':');void controller.command({type:'trade',op,commodity,units:1});return;}
  if(b.dataset.contract==='accept'){void controller.command({type:'accept-contract'});return;}
  if(b.dataset.close!==undefined){toggle(false);}
 });
 function toggle(value=!open){open=!!value;panel.hidden=!open;last='';render();}
 function render(){
  if(!open)return;
  const s=engine.snapshot(),station=STATIONS[s.station]||STATIONS.spaceport,stationId=STATIONS[s.station]?s.station:'spaceport';
  const parked=canTrade(s.journey),prices=marketPrices(stationId,Math.floor(now()/86400000)),cargo=cargoOf(s);
  const active=s.contracts?.active?contractById(s.contracts.active.id):null,offer=contractOffer(s);
  const key=JSON.stringify([s.revision,parked,stationId]);if(key===last)return;last=key;
  const chapter=Math.min(s.contracts?.chapter||0,STORY_ARC.length);
  const contract=active?`<div class="contract-card active"><small>IN THE HOLD · ${active.id.startsWith('arc-')?'STORY '+(STORY_ARC.findIndex(c=>c.id===active.id)+1)+' OF '+STORY_ARC.length:'DISPATCH JOB'}</small><b>${esc(active.title)}</b><p>${esc(active.brief)}</p><p class="contract-terms">For ${esc(active.client)} at ${esc(STATIONS[active.station].name)} · ${active.reward} credits · delivered when you reach your destination</p></div>`
   :offer?`<div class="contract-card"><small>CONTRACT OFFER · ${offer.id.startsWith('arc-')?'STORY '+(chapter+1)+' OF '+STORY_ARC.length:'DISPATCH BOARD'}</small><b>${esc(offer.title)}</b><p>${esc(offer.brief)}</p><p class="contract-terms">For ${esc(offer.client)} at ${esc(STATIONS[offer.station].name)} · ${offer.reward} credits · ${offer.units} hold space</p><button type="button" data-contract="accept" ${parked?'':'disabled'}>Accept contract</button></div>`:'';
  const rows=COMMODITY_IDS.map(id=>`<tr><th>${esc(COMMODITIES[id].name)}</th><td>${cargo[id]||0}</td><td><button type="button" data-trade="buy:${id}" ${parked?'':'disabled'} aria-label="Buy one ${esc(COMMODITIES[id].name)} for ${prices[id].buy} credits">Buy ${prices[id].buy}</button></td><td><button type="button" data-trade="sell:${id}" ${parked&&cargo[id]>0?'':'disabled'} aria-label="Sell one ${esc(COMMODITIES[id].name)} for ${prices[id].sell} credits">Sell ${prices[id].sell}</button></td></tr>`).join('');
  panel.innerHTML=`<div class="station-head"><h2>${esc(station.name)}</h2><button type="button" data-close>Close</button></div>
   <p class="station-meta"><span>Credits <b data-station-credits>${s.credits}</b></span><span>Hold <b data-station-hold>${holdUsed(s)}/${holdCapacity(s)}</b></span>${s.journey&&Number.isFinite(s.journey.shields)?`<span>Shields <b>${s.journey.shields}%</b></span>`:''}</p>
   ${contract}
   <table class="market"><thead><tr><th>Cargo</th><th>Hold</th><th>Buy</th><th>Sell</th></tr></thead><tbody>${rows}</tbody></table>
   <p class="station-note">${parked?'Prices change daily and differ between stations. Sell cargo where it is in demand.':'The market opens when we are parked.'}</p>`;
 }
 return {toggle,render,isOpen:()=>open};
}
