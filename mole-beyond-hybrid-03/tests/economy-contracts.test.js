import test from 'node:test';import assert from 'node:assert/strict';
import {createMissionEngine} from '../src/lib/foundation/mission.js';
import {marketPrices,stationForDestination,STATIONS,holdUsed,applyTrade} from '../src/lib/foundation/economy.js';
import {STORY_ARC,contractOffer,boardContract} from '../src/lib/foundation/contracts.js';
import {parseJourneyCommand} from '../src/lib/foundation/commands.js';
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
const seeded=(credits)=>{const s=storage();s.setItem('mole-beyond:foundation:v1',JSON.stringify({version:2,revision:1,credits,mission:null,ledger:credits?[{missionId:'seed',amount:credits}]:[],story:{path:'standard'},journey:null}));return createMissionEngine({storage:s,live:true});};
test('stations have stable, differing prices and every real destination docks somewhere',()=>{
 const a=marketPrices('forge',100),b=marketPrices('forge',100),c=marketPrices('morna',100);assert.deepEqual(a,b);assert.notDeepEqual(a,c);
 for(const p of Object.values(a)){assert.ok(p.sell<p.buy);assert.ok(p.sell>0);}
 assert.ok(c.medical.buy>a.medical.buy,'Morna pays more for medical kits');
 const d={lat:-27.47,lng:153.02};assert.equal(stationForDestination(d),stationForDestination({...d}));assert.ok(STATIONS[stationForDestination(d)]);
});
test('buying spends credits, fills the hold and keeps the save balance valid; selling pays',()=>{
 const e=seeded(200);let s=e.dispatch({type:'trade',op:'buy',commodity:'ore',units:3});
 assert.equal(s.cargo.ore,3);assert.ok(s.credits<200);const spent=200-s.credits;
 s=e.dispatch({type:'trade',op:'sell',commodity:'ore',units:3});assert.equal(s.cargo.ore,0);assert.ok(s.credits<200&&s.credits>200-spent,'selling recovers most of the cost');
 assert.throws(()=>e.dispatch({type:'trade',op:'sell',commodity:'tech',units:1}),/Not enough cargo/);
 assert.throws(()=>e.dispatch({type:'trade',op:'buy',commodity:'tech',units:50}),/credits|room/);
 const broke=seeded(0);assert.throws(()=>broke.dispatch({type:'trade',op:'buy',commodity:'ore',units:1}),/Not enough credits/);
});
test('hold capacity is enforced and contracts take hold space',()=>{
 const e=seeded(5000);e.dispatch({type:'contract.accept',id:'arc-1'});let s=e.snapshot();assert.equal(holdUsed(s),2);
 assert.throws(()=>e.dispatch({type:'trade',op:'buy',commodity:'food',units:11}),/room/);
 e.dispatch({type:'trade',op:'buy',commodity:'food',units:10});assert.equal(holdUsed(e.snapshot()),12);
 assert.throws(()=>e.dispatch({type:'contract.accept',id:'arc-2'}),/current contract|no longer offered/);
});
test('the story arc runs in order, then the dispatch board takes over',()=>{
 const st={contracts:{chapter:0,jobs:0,completed:[],active:null}};assert.equal(contractOffer(st).id,'arc-1');
 assert.equal(contractOffer({contracts:{...st.contracts,chapter:STORY_ARC.length}}).id,'job-0');
 assert.equal(contractOffer({contracts:{...st.contracts,active:{id:'arc-1',units:2,beats:[]}}}),null);
 for(const c of STORY_ARC){assert.ok(c.offer.text&&c.depart.text&&c.mid.text&&c.mid.done&&c.arrive.text,c.id);assert.ok(STATIONS[c.station],c.id);}
 assert.ok(STATIONS[boardContract(7).station]);
});
test('trades are refused during a live journey but allowed while parked with a route ready',()=>{
 const e=seeded(100);e.dispatch({type:'live.destination',id:'t1',destination:{label:'X',lat:0,lng:0}});
 e.dispatch({type:'live.route',id:'t1',revision:1,distance:100});assert.equal(e.snapshot().journey.phase,'route_ready');
 e.dispatch({type:'trade',op:'buy',commodity:'food',units:1});
 e.dispatch({type:'live.launch',id:'t1'});e.dispatch({type:'live.navigate',id:'t1'});
 assert.throws(()=>e.dispatch({type:'trade',op:'buy',commodity:'food',units:1}),/Live journey active/);
});
test('voice commands for deals and contracts',()=>{
 assert.deepEqual(parseJourneyCommand('accept contract'),{type:'accept-contract'});
 assert.deepEqual(parseJourneyCommand('Accept.'),{type:'accept'});assert.deepEqual(parseJourneyCommand('decline deal'),{type:'decline'});
});
test('a forged negative ledger row is rejected unless it is a trade',()=>{
 const s=storage();s.setItem('mole-beyond:foundation:v1',JSON.stringify({version:2,revision:1,credits:0,mission:null,ledger:[{missionId:'a',amount:10},{missionId:'b',amount:-10}],story:{path:'standard'},journey:null}));
 assert.throws(()=>createMissionEngine({storage:s,live:true}),/Cannot load save/);
});
