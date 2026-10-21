// Issue #20: every driving action by voice, real recogniser mis-hearings, and a spoken reply every time.
// The mis-hearings below are the kinds Android's recognisers (Google, Samsung) commonly return for short
// commands: homophones, split words, a leading article, plural/past forms, fillers and names said first.
import test from 'node:test';import assert from 'node:assert/strict';
import {matchVoice,parseJourneyCommand,normalizeSpeech} from '../src/lib/foundation/commands.js';
import {createVoiceControl,expectedAnswers,answerHint} from '../src/lib/foundation/voice-control.js';

const OFFER={expect:['accept','decline']};
const COMBAT={expect:['defend','evade','delegate']};
const type=(text,ctx={})=>matchVoice(text,ctx)?.action?.type??null;

// Every action on the dashboard, plus the crew answers, with what a driver actually says.
const TABLE=[
 // answers to the crew
 ['accept',OFFER,['accept','Accept.','accept that','yes','yeah','yes please','sure','do it','except','Except.','uh, accept please','Max, accept','okay','go ahead','accepted','yeah let\'s accept that one']],
 ['decline',OFFER,['decline','no','nope','no thanks','pass','the cline','The Cline.','de cline','declined','recline','not this one','don\'t accept it','decline please, Max']],
 ['accept-contract',{},['accept contract','take the job','except the contract','accept the mission']],
 ['decline-contract',{},['decline contract','decline the job','the cline contract']],
 ['defend',COMBAT,['defend','Defend!','the fend','defence','shields up','fight them','Vex, defend','depend']],
 ['evade',COMBAT,['evade','invade','a vade','evaded','dodge','cloak us','avoid them','evaid']],
 ['delegate',COMBAT,['let crew handle it','you handle it','handle it','your call','you decide','up to you','deal with it','let the crew decide']],
 ['acknowledge',{expect:['acknowledge','delegate']},['acknowledge','acknowledged','roger','copy that','understood','a knowledge','okay']],
 ['scan',{expect:['scan','delegate']},['scan','run a scan','scan it','scam','okay','yes']],
 ['collect',{expect:['collect','delegate']},['collect','collect salvage','grab it','salvage','correct','yes']],
 ['repair',{expect:['repair','delegate']},['repair','fix it','repairs','reaper','yes']],
 // driving
 ['repeat',{},['repeat','repeat direction','repeat that','say again','say that again','what was that','come again','pardon','where do I go','next turn','Wraith, repeat that please','um repeat']],
 ['mute',{},['mute','pause audio','stop audio','quiet','be quiet','silence','shut up','stop talking','sound off']],
 ['unmute',{muted:true},['unmute','un mute','on mute','sound on','resume audio','talk to me']],
 ['pause-story',{},['pause story','stop the story','no chatter','quiet crew']],
 ['resume-story',{},['resume story','story on','continue the story']],
 ['resume',{},['resume navigation','resume','start GPS','continue','keep going']],
 ['retry',{},['retry route','try again','reroute','recalculate']],
 ['recenter',{},['recenter','recentre','centre the map','where am I']],
 ['launch',{},['launch','launched','engage','take off','okay, launch','launch the ship please']],
 ['launch',{expect:['launch']},['launch','lunch','let\'s go','let us go','punch it','okay lets go']],
 ['cancel',{},['cancel journey','cancel the journey','end trip','abort','stop navigation']],
 ['save',{},['save','save game']],
 ['home',{},['main menu']],
 ['destination',{},['destination','new destination','set destination']],
 ['confirm',{},['confirm','confirm destination','that one']],
 ['station',{},['station','open the station','market']],
 ['crew',{},['crew','crew panel']],
 ['mic-off',{},['stop listening','mic off']],
 ['help',{},['help','what can I say']],
];

test('command table: every action, with what drivers actually say and common mis-hearings',()=>{
 const misses=[];
 for(const [want,ctx,phrases] of TABLE)for(const p of phrases){const got=type(p,ctx);if(got!==want)misses.push(`${JSON.stringify(p)} ${JSON.stringify(ctx)} → ${got} (want ${want})`);}
 assert.deepEqual(misses,[]);
});

test('destination and option choices by voice',()=>{
 assert.deepEqual(parseJourneyCommand('destination 12 Smith St, Chermside'),{type:'search',text:'12 Smith St, Chermside'});
 assert.deepEqual(parseJourneyCommand('navigate to 34 Queen Street Brisbane'),{type:'search',text:'34 queen street brisbane'});
 assert.deepEqual(parseJourneyCommand('take me to Westfield Chermside'),{type:'search',text:'westfield chermside'});
 for(const [p,i] of [['option two',1],['option 3',2],['the second one',1],['number one',0],['first one',0]])assert.deepEqual(parseJourneyCommand(p),{type:'select',index:i},p);
 assert.deepEqual(parseJourneyCommand('two',{results:true}),{type:'select',index:1},'a bare number while options are on screen');
 assert.equal(parseJourneyCommand('two'),null,'a bare number means nothing without options');
 assert.equal(parseJourneyCommand('destination two')?.type,'select');
});

test('safety: destructive commands are never guessed, and answers only count for the question asked',()=>{
 for(const p of ['cancel','go','menu','end','stop','what','banana','the','',null])assert.equal(type(p),null,String(p));
 assert.equal(type('cancel',OFFER),null,'"cancel" is not "decline the offer" either');
 assert.equal(type('yes',COMBAT),null,'"yes" to "defend or evade?" is not an answer');
 assert.equal(type('accept',COMBAT),null,'accept is not an answer to combat');
 assert.equal(type('okay'),null,'okay alone means nothing without a question');
 assert.equal(type('invade'),null,'near-misses only count when that answer is expected');
 assert.equal(type('recline'),null);
 assert.equal(type('on mute'),null,'"on mute" only means unmute while muted');
 assert.equal(type('don\'t cancel the journey'),null,'negation is never acted on');
 assert.equal(type('accept and decline',OFFER),null,'two answers at once: ask again');
 assert.equal(type('destination'),'destination');
});

test('lunch is not a launch: slang counts only when a launch is expected, and never inside a sentence',()=>{
 for(const ctx of [{},{expect:['launch']},{expect:['accept','decline']}])
  for(const p of ['what about lunch','let\'s go get lunch','go get some lunch','I had lunch with mum','lunch was good','let\'s go home','punch it in the face','we should launch the dinghy later'])
   assert.equal(type(p,ctx),null,`${JSON.stringify(p)} ${JSON.stringify(ctx)}`);
 for(const p of ['lunch','let\'s go','let us go','punch it'])assert.equal(type(p),null,`${p} with no launch expected`);
 assert.deepEqual(expectedAnswers({journey:{phase:'route_ready'}}),['launch'],'route ready: launch is the expected answer');
});

test('while confirming a cancel, only yes/no style answers count',()=>{
 const c={expect:['cancel','keep']};
 for(const p of ['yes','yeah','confirm','cancel it','cancel journey'])assert.equal(type(p,c),'confirm-cancel',p);
 for(const p of ['no','keep going','carry on','never mind'])assert.equal(type(p,c),'keep-journey',p);
 assert.equal(type('repeat',c),null);assert.equal(type('banana',c),null);
});

test('normalising strips fillers, names and politeness, not meaning',()=>{
 assert.equal(normalizeSpeech('Uh, Wraith, repeat that please.'),'repeat that');
 assert.equal(normalizeSpeech("Okay so, let's go"),'lets go');
 assert.equal(normalizeSpeech('Captain? DEFEND!'),'defend');
});

test('the answers the crew are waiting for come from the question, or the open encounter',()=>{
 assert.deepEqual(expectedAnswers({journey:{activeEvent:{actions:['defend','evade']}}}),['defend','evade','delegate']);
 assert.deepEqual(expectedAnswers({asked:['accept','decline']}),['accept','decline']);
 assert.deepEqual(expectedAnswers({pendingCancel:true,journey:{activeEvent:{actions:['scan']}}}),['cancel','keep']);
 assert.equal(answerHint(['defend','evade','delegate']),'Say defend, evade or let crew handle it.');
});

// ---------- spoken replies ----------
function rig({phase='navigating',muted=false,crewSpeaks=[],status=()=>'',event=null}={}){
 const said=[],commands=[],opened=[];let count=0,chimes=0,mic=true,st='Navigating';
 const vc=createVoiceControl({
  command:async a=>{commands.push(a.type);if(crewSpeaks.includes(a.type))count++;st=status(a)||st;},
  snapshot:()=>({status:st}),state:()=>({journey:phase?{phase,activeEvent:event}:null,muted}),
  say:line=>{said.push(line);count++;return Promise.resolve('played');},spoken:()=>count,chime:()=>chimes++,
  openPanel:t=>{opened.push(t);return true;},micOff:()=>{mic=false;}});
 return {vc,said,commands,opened,chimes:()=>chimes,mic:()=>mic,texts:()=>said.map(l=>l.text)};
}

test('no match: "Say that again, Captain", never silence; inside a question it asks once more and listens',async()=>{
 const a=rig({phase:null});await a.vc.handle('banana split',null);
 assert.deepEqual(a.texts(),['Say that again, Captain.']);assert.deepEqual(a.commands,[]);
 const b=rig({event:{actions:['defend','evade']}});
 const r=await b.vc.handle('mumble',null,{inWindow:true});
 assert.equal(b.said[0].text,'Say that again, Captain. Say defend, evade or let crew handle it.');
 assert.equal(b.said[0].ask,true,'reopens the answer window');assert.deepEqual(r.ask,['defend','evade','delegate']);
 await b.vc.handle('mumble again',null,{inWindow:true});
 assert.equal(b.said[1].text,'Say that again, Captain.');assert.ok(!b.said[1].ask,'only one extra try; then the crew handle it');
});

test('a recognised command is always confirmed: by the crew, or by the ship if the crew said nothing',async()=>{
 const crew=rig({crewSpeaks:['repeat']});await crew.vc.handle('repeat that',null);
 assert.deepEqual(crew.commands,['repeat']);assert.deepEqual(crew.texts(),[],'the crew spoke the direction; no extra reply');
 const quiet=rig();await quiet.vc.handle('save',null);
 assert.deepEqual(quiet.texts(),['Progress saved.']);
 const refused=rig({status:a=>a.type==='defend'?'Crew action deferred until navigation is clear.':''});await refused.vc.handle('defend',null);
 assert.deepEqual(refused.texts(),['Crew action deferred until navigation is clear.'],'a refusal is said out loud');
});

test('mic errors are spoken; silence inside an answer window just listens again',async()=>{
 const r=rig();
 assert.deepEqual(await r.vc.handle(null,'no-speech',{inWindow:true}),{retry:true});
 assert.deepEqual(await r.vc.handle(null,'aborted',{inWindow:true}),{retry:true});
 assert.deepEqual(r.texts(),[],'nothing said while still waiting for an answer');
 await r.vc.handle(null,'no-speech');assert.match(r.texts()[0],/did not catch that/);
 await r.vc.handle(null,'not-allowed');assert.match(r.texts()[1],/microphone is switched off/);
 await r.vc.handle(null,'network');assert.match(r.texts()[2],/not working right now/);
 await r.vc.handle(null,'aborted');assert.equal(r.texts().length,3,'our own cancellation is not announced');
});

test('cancelling the journey while driving asks first; no, silence or a later yes never cancels',async()=>{
 const r=rig();
 await r.vc.handle('cancel journey',null);
 assert.deepEqual(r.commands,[]);assert.match(r.said[0].text,/Cancel the journey, Captain\? Say yes/);assert.equal(r.said[0].ask,true);
 await r.vc.handle('no',null,{inWindow:true});assert.deepEqual(r.commands,[]);assert.equal(r.texts()[1],'Carrying on.');
 await r.vc.handle('cancel journey',null);r.vc.endQuestion(); // the confirm window ran out
 await r.vc.handle('yes',null);assert.deepEqual(r.commands,['accept'],'a later "yes" is just an answer, not a cancel');
 await r.vc.handle('abort',null);await r.vc.handle('yeah',null,{inWindow:true});
 assert.deepEqual(r.commands,['accept','cancel'],'cancel only after an explicit yes');
 const parked=rig({phase:'route_ready'});await parked.vc.handle('cancel journey',null);assert.deepEqual(parked.commands,['cancel'],'parked: no confirmation needed');
});

test('mute is said before going quiet; while muted, confirmations are a chime',async()=>{
 const r=rig();await r.vc.handle('be quiet',null);
 assert.deepEqual(r.commands,['mute']);assert.match(r.texts()[0],/Going quiet, Captain\. Say unmute/);
 const m=rig({muted:true});await m.vc.handle('save',null);assert.deepEqual(m.texts(),[]);assert.equal(m.chimes(),1);
 await m.vc.handle('banana',null);assert.equal(m.chimes(),2,'even "say that again" is a chime while muted');
});

test('panels open only while parked; mic off and help by voice',async()=>{
 const drive=rig();await drive.vc.handle('open the station',null);assert.deepEqual(drive.opened,[]);assert.match(drive.texts()[0],/opens when we are parked/);
 const parked=rig({phase:'arrived'});await parked.vc.handle('market',null);await parked.vc.handle('crew',null);assert.deepEqual(parked.opened,['station','crew']);
 await parked.vc.handle('main menu',null);assert.deepEqual(parked.opened,['station','crew','home']);
 const busy=rig();await busy.vc.handle('main menu',null);assert.match(busy.texts()[0],/Cancel the journey before/);
 const off=rig();await off.vc.handle('stop listening',null);assert.equal(off.mic(),false);assert.match(off.texts()[0],/^Microphone off\. I will listen again when the crew ask you something, or tap Mic\.$/);
 const help=rig();await help.vc.handle('what can I say',null);assert.match(help.texts()[0],/repeat, mute/);
});
