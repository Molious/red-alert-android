import test from 'node:test';import assert from 'node:assert/strict';
import {createSafetyMeter,parseMaxspeed,safetyBonus} from '../src/lib/foundation/safe-driving.js';
import {CHATTER,PROLOGUE,nextChatter} from '../src/lib/foundation/bridge-chatter.js';
import {parseCrewReply,crewContext} from '../src/lib/foundation/ai-crew.js';
import {createCrewVoices,CREW_ROSTER} from '../src/lib/foundation/crew-voices.js';
import {createJourneyController} from '../src/lib/foundation/journey-controller.js';
import {createMissionEngine} from '../src/lib/foundation/mission.js';
import {parseRoadRoute} from '../src/lib/foundation/navigation-core.js';
test('speeding and harsh driving cost points; clean kilometres earn them back',()=>{
 const m=createSafetyMeter();let t=0;const at=(lat,kmh)=>({lat,lng:0,speed:kmh/3.6,accuracy:5,ts:(t+=1000)});
 let lat=0;for(let i=0;i<60;i++)m.update(at(lat+=.0002,75),60);
 assert.ok(m.snapshot().score<=95,'a minute well over the limit costs points');assert.ok(m.snapshot().overspeedSeconds>=55);
 const before=m.snapshot().score;m.update(at(lat+=.0001,10),60);assert.ok(m.snapshot().harsh>=1,'hard braking noticed');assert.ok(m.snapshot().score<before);
 const low=m.snapshot().score;for(let i=0;i<300;i++)m.update(at(lat+=.0003,55),60);assert.ok(m.snapshot().score>low,'clean driving recovers');
 assert.equal(createSafetyMeter().update(at(0,200),null).speeding,false,'unknown limit never counts as speeding');
 assert.equal(parseMaxspeed('60'),60);assert.equal(parseMaxspeed('40 mph'),64);assert.equal(parseMaxspeed('AU:urban'),50);assert.equal(parseMaxspeed('none'),null);assert.equal(safetyBonus(100),20);
});
test('the prologue introduces every crew member, and chatter never repeats until it runs out',()=>{
 const speakers=new Set(PROLOGUE.map(([c])=>c));for(const c of ['CHET','WRAITH','VEX','BASTION','MAX','SILAS'])assert.ok(speakers.has(c),c);
 assert.ok(CHATTER.filter(c=>!c.when).length>=25);const seen=[];for(let i=0;i<20;i++){const c=nextChatter({seen,rng:()=>.5});assert.ok(!seen.includes(c.id));seen.push(c.id);}
 assert.equal(nextChatter({speeding:true,rng:()=>0}).when,'speeding');
 for(const c of CHATTER)for(const [who,text] of c.lines){assert.ok(['CHET','WRAITH','VEX','BASTION','MAX','SILAS'].includes(who),c.id);assert.ok(text.length<220,c.id);}
});
test('AI crew replies are parsed into crew lines and context is short',()=>{
 assert.deepEqual(parseCrewReply('[{"character":"vex","text":"Ha!"},{"character":"NOBODY","text":"Hi"}]'),[{character:'VEX',text:'Ha!'},{character:'CHET',text:'Hi'}]);
 assert.deepEqual(parseCrewReply('Just text'),[{character:'CHET',text:'Just text'}]);
 assert.ok(crewContext({credits:5,player:{name:'Cory'},journey:null}).length<300);
});
test('crew voice check cycles voices, gender first, and remembers the choice',()=>{
 const m=new Map(),storage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};
 const v=createCrewVoices({storage});v.setOptions([{id:'f1',lang:'en-AU',gender:'female'},{id:'m1',lang:'en-GB',gender:'male'},{id:'m2',lang:'en-US',gender:'male'}],{VEX:'f1'});
 assert.equal(v.current('VEX'),'f1');assert.equal(v.next('VEX'),'m1');assert.equal(v.next('VEX'),'m2');assert.equal(createCrewVoices({storage}).voiceFor('VEX'),'m2');
 assert.ok(CREW_ROSTER.every(c=>c.intro.includes(c.name)));
});
test('a first launch plays the prologue, crew chatter fills quiet stretches, and offers can be declined or accepted',async()=>{
 const N=40,pts=[];for(let i=0;i<=N;i++)pts.push([0,i*.002]);
 const route=parseRoadRoute({code:'Ok',routes:[{geometry:{type:'LineString',coordinates:pts},distance:8900,duration:900,legs:[{steps:[{maneuver:{type:'depart',location:pts[0]},distance:8900},{maneuver:{type:'arrive',location:pts[N]},distance:0}]}]}]});
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},engine=createMissionEngine({storage,live:true});
 engine.dispatch({type:'player',player:{name:'Cory',gender:'male',species:'human',occupation:'explorer'}});
 let time=100000;const lines=[];const c=createJourneyController({engine,now:()=>time,services:{search:async()=>[{label:'Far',lat:.08,lng:0}],route:async()=>route,speedLimit:async()=>60},audio:{enqueue:i=>{lines.push(i);return Promise.resolve('played')},clear(){},setStoryPaused(){},holdStory(){}},onLaunch:cb=>{cb();return {cancel(){}}},id:()=>'trip-9'});
 const fix=(lat,speed=0,dt=1500)=>{time+=dt;c.fix({lat,lng:0,accuracy:5,speed,heading:0,ts:time});};
 c.enter();for(let i=0;i<4;i++)fix(0);await c.command({type:'search',text:'Far'});await c.command({type:'select',index:0});await c.command({type:'confirm'});await new Promise(r=>setTimeout(r,0));
 assert.ok(lines.some(l=>l.ask&&l.id.includes(':offer')),'a contract is offered by voice');assert.ok(!engine.snapshot().contracts?.active,'nothing is accepted without the captain');
 await c.command({type:'decline'});assert.ok(lines.some(l=>/Another job came in/.test(l.text)),'declining brings another option');await c.command({type:'accept'});assert.ok(engine.snapshot().contracts.active.id.startsWith('job-'),'accepted the dispatch job');
 for(let i=0;i<4;i++)fix(0);await c.command({type:'launch'});await new Promise(r=>setTimeout(r,0)); // the prologue is marked heard once its lines have played (#21)
 assert.ok(lines.some(l=>l.id.startsWith('prologue:')),'prologue on first launch');assert.equal(engine.snapshot().story.prologue,true);
 let lng=0;for(let i=0;i<400;i++){fix(lng+=.0002,15,3000);}
assert.ok(lines.some(l=>l.id.startsWith('chat:')),'crew chatter between encounters');
 assert.ok(engine.snapshot().journey.safety,'safety rating saved');
});

test('starting a new character replays the crew prologue',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},engine=createMissionEngine({storage,live:true});
 engine.dispatch({type:'live.story',prologue:true});assert.equal(engine.snapshot().story.prologueV,2);
 engine.dispatch({type:'player',player:{name:'New',gender:'female',species:'reptilian',occupation:'support'}});assert.notEqual(engine.snapshot().story.prologueV,2);
});
