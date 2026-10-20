// One real journey owns the shipping cockpit. Legacy simulation is test-only.
import {createMissionEngine} from './mission.js';
import {installCrewScreens} from './crew-screen.js';
import {installSeatedCrew} from './seated-crew.js';
import {createDialogueQueue} from './dialogue.js';
import {createRoadServices} from './road-services.js';
import {createJourneyController} from './journey-controller.js';
import {installCockpit} from './cockpit-view.js';
import {playLaunch} from './launch-scene.js';
import {createVoiceControl,answerHint,createMicGuard} from './voice-control.js';
import {contractOffer} from './contracts.js';
import {createCrewVoices} from './crew-voices.js';
import {createAiCrew} from './ai-crew.js';
export const crewVoices=createCrewVoices({storage:globalThis.localStorage});
let answerUntil=0,view,controller,aiCrew,watch=null,nativeWatch=false,watchEpoch=0,listening=null,listenEpoch=0,recognition=null,started=false,gpsBlocked=false,preparation=null,boardEpoch=0,handsFree=false,speechPlaying=0,micRetry=null,micPermitted=true,voice,lastState=null,windowChimed=false,windowLeft=0,windowTimer=null,openMic=false,micDelay=300,listenStarted=0;
// Open mic (#25): on for the whole drive without a tap; pauses while anyone speaks; strict matching outside questions.
let cinematicPlaying=false;const micGuard=createMicGuard();
// The mic indicator and status line change only when something real changes (#25 follow-up). The open mic
// restarts after every phrase; that gap is not "stopped listening", so it must not flash.
let micShown='',statusShown='';
function showMic(enabled,listening){const steady=enabled&&openMic&&!speechPlaying&&!cinematicPlaying&&!globalThis.document?.hidden;const key=enabled?(listening||steady?'listening':'on'):'off';if(key===micShown)return;micShown=key;statusShown='';view?.micState(enabled,key==='listening');}
function showStatus(text){if(text===statusShown)return;statusShown=text;view?.listening(text);}const clock=()=>globalThis.performance?.now?.()??Date.now();
const native=()=>window.RedAlertNative;
function play(item,signal){view?.caption(item);if(signal.aborted)return Promise.resolve();if(answerUntil&&!item.ask)windowLeft=Math.max(windowLeft,answerUntil-Date.now());speechPlaying++;stopMic(true);return new Promise(resolve=>{
 let timer,id,utterance,settled=false;const done=outcome=>{if(settled)return;settled=true;clearTimeout(timer);signal.removeEventListener('abort',cancel);speechPlaying=Math.max(0,speechPlaying-1);if(outcome==='failed')showStatus('Device speech unavailable. Check the installed speech service.');if(item.ask&&outcome!=='cancelled'&&micPermitted&&!signal.aborted){openMic=true;handsFree=true;answerUntil=Date.now()+12000;windowChimed=false;windowLeft=0;voice?.asking(item.expect||(lastState?.journey?.activeEvent?null:['accept','decline']));showMic(true,false);showStatus('Listening for your answer… '+answerHint(voice?.context().expect||[]));}
  // #7: a direction spoken in the middle of an answer window pauses it rather than using it up.
  else if(windowLeft>0&&answerUntil){answerUntil=Date.now()+Math.max(windowLeft,4000);windowLeft=0;}scheduleMic();resolve();};
 const cancel=()=>{if(id!==undefined)native()?.cancelSpeech?.(id);if(utterance)window.speechSynthesis?.cancel();done();};signal.addEventListener('abort',cancel,{once:true});timer=setTimeout(cancel,20000);
 if(native()?.speakRequest)id=native().speakRequest(item.text,done,{character:item.character,voice:crewVoices.voiceFor(item.character)});
 else if(window.speechSynthesis&&window.SpeechSynthesisUtterance){utterance=new SpeechSynthesisUtterance(item.text);utterance.lang='en-AU';utterance.rate=.98;utterance.pitch=item.character==='VEX'?.8:item.character==='WRAITH'?.95:1;utterance.onend=done;utterance.onerror=done;window.speechSynthesis.speak(utterance);}else done();
 });}
const audio=createDialogueQueue({play});
function scheduleMic(){clearTimeout(micRetry);if(!globalThis.document)return;if(handsFree&&answerUntil&&Date.now()>answerUntil){closeWindow();return;}if(!started||!handsFree||!micPermitted||speechPlaying||cinematicPlaying||preparation!==null||!controller?.snapshot().active||document.hidden)return;micRetry=setTimeout(()=>{if(!globalThis.document)return;if(started&&handsFree&&!speechPlaying&&!cinematicPlaying&&controller.snapshot().active&&!document.hidden)listen();},micDelay);micDelay=300;}
function closeWindow(){answerUntil=0;handsFree=openMic;windowLeft=0;clearTimeout(windowTimer);voice?.endQuestion();showMic(handsFree,false);showStatus(openMic?'Listening for commands':'Microphone off');if(openMic)scheduleMic();}
function stopMic(preserve=false){if(!preserve)handsFree=false;clearTimeout(micRetry);listenEpoch++;if(listening!==null){native()?.cancelListen?.(listening);listening=null;}recognition?.abort();recognition=null;showMic(handsFree,false);}
function stopGPS(){watchEpoch++;if(watch!==null){if(nativeWatch)native()?.clearWatch(watch);else navigator.geolocation?.clearWatch(watch);watch=null;}}
function syncNative(s){
 native()?.setAudioMuted?.(s.muted);
 native()?.setJourneyActive?.(!!(s.active&&s.journey&&!['arrived','cancelled'].includes(s.journey.phase)));
 if(!s.active){stopGPS();stopMic(true);return;}scheduleMic();if(watch!==null||gpsBlocked)return;
 const epoch=++watchEpoch;watch=-1;nativeWatch=!!native()?.watchPosition;
 const receive=p=>{if(epoch===watchEpoch&&watch!==null)controller.fix(p);};
 const error=text=>{if(epoch!==watchEpoch)return;gpsBlocked=true;stopGPS();controller.locationError(typeof text==='string'?text:'GPS unavailable. Check Location permission and resume navigation.');};
 if(nativeWatch){const id=native().watchPosition(receive,error);if(epoch===watchEpoch)watch=id;else native().clearWatch(id);}
 else if(navigator.geolocation){const id=navigator.geolocation.watchPosition(p=>receive({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy,speed:p.coords.speed,heading:p.coords.heading,ts:p.timestamp}),e=>error(e.message),{enableHighAccuracy:true,maximumAge:0,timeout:15000});if(epoch===watchEpoch)watch=id;else navigator.geolocation.clearWatch(id);}
 else{watch=null;gpsBlocked=true;showStatus('GPS requires the Android app or browser location permission.');}
}
// Every phrase gets a spoken reply (#20); see voice-control.js. Inside an answer window, silence or our own
// cancellations just listen again (#7).
async function handleVoice(text,error){listening=null;recognition=null;const inWindow=!!answerUntil&&Date.now()<answerUntil,expired=!!answerUntil&&!inWindow,open=openMic&&!inWindow;
 const guard=micGuard.ended({text,error,ms:clock()-listenStarted});
 if(!text&&inWindow&&['no-speech','aborted','busy'].includes(error)){showMic(true,false);scheduleMic();return;}
 if(expired&&!text){closeWindow();return;} // the window ran out unanswered: the crew deal with it (#4); the open mic carries on
 // Open mic: quiet stretches are normal; errors back off and, if they keep coming, the mic turns itself off (#25).
 if(open&&!text&&error!=='not-allowed'){
  if(guard.giveUp){openMic=false;handsFree=false;showMic(false,false);showStatus('Microphone off: '+error+'.');void audio.enqueue({id:'mic-failed:'+Date.now(),text:'Voice recognition keeps failing, Captain, so I have switched the microphone off. Tap Mic when we are parked to try again.',character:'CHET',priority:'reply',expiresAt:Date.now()+20000});return;}
  micDelay=guard.delay;showMic(true,false);if(error&&error!=='no-speech'&&guard.delay>=2000)showStatus('Microphone: '+error+'. Trying again.');scheduleMic();return;}
 answerUntil=0;clearTimeout(windowTimer);if(error==='not-allowed')openMic=false;handsFree=openMic;showMic(handsFree,false);
 // Open mic: passengers and the radio reach the recogniser too, so only show what was heard if it was a command.
 if(!(open&&text))showStatus(error?(error==='no-speech'?'Did not hear anything. Speak after the tone.':'Microphone: '+error+'.'):text?'Heard: “'+text+'”':openMic?'Listening for commands':'Microphone off');
 try{const r=await voice?.handle(text,error,{inWindow,open});if(open&&text&&r&&!r.ignored)showStatus('Heard: “'+text+'”');}catch(e){showStatus('Voice command failed: '+e.message);}
 micDelay=Math.max(micDelay,guard.delay);if(openMic)scheduleMic();
}
function chime(){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const a=new C(),o=a.createOscillator(),g=a.createGain();o.frequency.value=880;g.gain.setValueAtTime(.08,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.18);o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+.2);setTimeout(()=>a.close().catch(()=>{}),400);}catch{}}
function listen(){if(listening!==null||recognition||!handsFree||speechPlaying)return;const epoch=++listenEpoch;if(answerUntil&&!windowChimed){windowChimed=true;chime();}
 // #7: the phone's recogniser can keep listening for up to 60 s; the answer window is 12 s (+4 s grace).
 if(answerUntil){clearTimeout(windowTimer);windowTimer=setTimeout(()=>{if(answerUntil&&Date.now()>=answerUntil&&!speechPlaying){stopMic();closeWindow();}},Math.max(0,answerUntil-Date.now())+4000);}showMic(handsFree,true);showStatus(answerUntil||!openMic?'Preparing microphone…':'Listening for commands');listenStarted=clock();if(native()?.listenOnce){listening=-1;const id=native().listenOnce((text,error)=>{if(epoch===listenEpoch)handleVoice(text,error);},{open:openMic&&!answerUntil});if(epoch===listenEpoch&&listening!==null)listening=id;return;}
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Recognition){showStatus('Voice recognition unavailable. Use dashboard controls.');return;}recognition=new Recognition();recognition.lang='en-AU';recognition.continuous=false;recognition.interimResults=false;recognition.onresult=e=>{if(epoch===listenEpoch)handleVoice(e.results[0][0].transcript,null);};recognition.onerror=e=>{if(epoch===listenEpoch)handleVoice(null,e.error);};recognition.onend=()=>{recognition=null;showMic(handsFree,false);scheduleMic();};try{recognition.start();showStatus('Listening for a command…');}catch(e){handleVoice(null,e.message);}}
try{
 const engine=createMissionEngine({storage:localStorage,live:true});
 controller=createJourneyController({engine,services:createRoadServices({native}),audio,onChange:s=>{lastState=s;view?.render(s);syncNative(s);},onLaunch:done=>{
  // #19/#25: the open mic would hear the cinematic's soundtrack; pause it until the video ends or is stopped.
  cinematicPlaying=true;stopMic(true);const resume=()=>{cinematicPlaying=false;scheduleMic();};
  return playLaunch({container:document.querySelector('.viewport'),onFinish:()=>{resume();done();},onCancel:resume});}});
 aiCrew=createAiCrew({native,engine,audio,storage:globalThis.localStorage});
 voice=createVoiceControl({command:a=>controller.command(a),snapshot:()=>controller.snapshot(),
  state:()=>{const snap=engine.snapshot();return {journey:lastState?.journey??snap.journey,muted:!!lastState?.muted,results:!!lastState?.results?.length,offer:!snap.contracts?.active&&!!contractOffer(snap)};},
  say:line=>audio.enqueue({id:'reply:'+Date.now()+':'+Math.random().toString(36).slice(2,6),expiresAt:Date.now()+15000,...line}),spoken:()=>audio.spoken(),chime,
  before:a=>{if(a.type==='recenter')view?.recenter();if(a.type==='resume'||a.type==='retry')gpsBlocked=false;},
  askAi:t=>{if(!aiCrew.enabled())return false;void aiCrew.ask(t);return true;},
  openPanel:t=>{const b=t==='home'?document.querySelector('.home-menu'):document.querySelector(`.cockpit-dashboard [data-action="${t}"]`);if(!b||b.hidden||b.disabled)return false;b.click();return true;},
  micOff:()=>{openMic=false;stopMic();}});
 view=installCockpit({engine,controller,audio,crewVoices,aiCrew});installSeatedCrew();
 installCrewScreens({engine,onEnter:()=>{started=true;const epoch=++boardEpoch;preparation=-1;showStatus('Preparing GPS, microphone and speech…');const ready=result=>{if(epoch!==boardEpoch||!started)return;preparation=null;gpsBlocked=result.locationGranted===false;micPermitted=result.microphoneGranted!==false;openMic=micPermitted;handsFree=openMic;micGuard.reset();crewVoices.setOptions(result.voices,result.crew);controller.enter();showMic(handsFree,false);if(openMic)scheduleMic();if(!result.speechReady)showStatus('Speech service did not report a ready voice. Check device speech settings if silent.');view.ready.then(()=>window.dispatchEvent(new Event('resize')));};if(native()?.prepareSession){const request=native().prepareSession(ready);if(preparation!==null)preparation=request;}else{window.speechSynthesis?.getVoices();window.speechSynthesis?.resume();ready({speechReady:true,locationGranted:true,microphoneGranted:true});}},onLeave:()=>{const j=engine.snapshot().journey;if(j&&!['arrived','cancelled'].includes(j.phase)){void controller.command({type:'home'});return false;}started=false;boardEpoch++;if(preparation!==null)native()?.cancelPreparation?.(preparation);preparation=null;stopMic();controller.background();return true;},onDemo:()=>{}});
 const profile=document.querySelector('.captain-profile');profile.append(document.querySelector('.player-identity'),document.querySelector('.home-menu'));document.querySelector('.home-menu').hidden=true;
 window.addEventListener('cockpit-listen',()=>{openMic=!openMic;handsFree=openMic;answerUntil=0;micPermitted=true;micGuard.reset();showMic(handsFree,false);showStatus(openMic?'Listening for commands':'Microphone off');if(handsFree)scheduleMic();else stopMic();});window.addEventListener('cockpit-gps-retry',()=>{gpsBlocked=false;});
 window.addEventListener('test-mic-ready',()=>showStatus('Listening… say destination, launch, repeat direction, scan, defend, repair or cancel journey.'));
 function background(){if(started)controller.background();stopGPS();stopMic(true);audio.clear();}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)background();else if(started&&preparation===null){gpsBlocked=false;controller.resume();if(openMic){handsFree=true;micGuard.reset();scheduleMic();}}});window.addEventListener('hybrid-background',background);
 window.addEventListener('hybrid-audio',e=>{void controller.command({type:e.detail?.muted?'mute':'unmute'});});
 window.addEventListener('hybrid-stop',()=>{void controller.command({type:'mute'});});
 window.addEventListener('hybrid-voice',e=>{if(e.detail?.state==='restarted')showStatus('Voice engine restarted. Directions will keep speaking.');});
 window.addEventListener('hybrid-foreground',()=>{if(started&&preparation===null){gpsBlocked=false;controller.resume();if(openMic){handsFree=true;micGuard.reset();scheduleMic();}showStatus('App resumed. Tap Resume navigation for a fresh GPS fix.');}});
 window.addEventListener('pagehide',()=>{background();controller.dispose();view.dispose();});setInterval(()=>controller.tick(),1000);
}catch(e){document.querySelector('#error').textContent=e.message;throw e;}
