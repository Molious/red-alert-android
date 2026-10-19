// One real journey owns the shipping cockpit. Legacy simulation is test-only.
import {createMissionEngine} from './mission.js';
import {installCrewScreens} from './crew-screen.js';
import {installSeatedCrew} from './seated-crew.js';
import {createDialogueQueue} from './dialogue.js';
import {createRoadServices} from './road-services.js';
import {createJourneyController} from './journey-controller.js';
import {installCockpit} from './cockpit-view.js';
import {playLaunch} from './launch-scene.js';
import {parseJourneyCommand} from './commands.js';
import {createCrewVoices} from './crew-voices.js';
import {createAiCrew} from './ai-crew.js';
export const crewVoices=createCrewVoices({storage:globalThis.localStorage});
let answerUntil=0,view,controller,aiCrew,watch=null,nativeWatch=false,watchEpoch=0,listening=null,listenEpoch=0,recognition=null,started=false,gpsBlocked=false,preparation=null,boardEpoch=0,handsFree=false,speechPlaying=0,micRetry=null,micPermitted=true;
const native=()=>window.RedAlertNative;
function play(item,signal){view?.caption(item);if(signal.aborted)return Promise.resolve();stopMic(true);speechPlaying++;return new Promise(resolve=>{
 let timer,id,utterance,settled=false;const done=outcome=>{if(settled)return;settled=true;clearTimeout(timer);signal.removeEventListener('abort',cancel);speechPlaying=Math.max(0,speechPlaying-1);if(outcome==='failed')view?.listening('Device speech unavailable. Check the installed speech service.');if(item.ask&&outcome!=='cancelled'&&micPermitted&&!signal.aborted){handsFree=true;answerUntil=Date.now()+12000;view?.micState(true,false);view?.listening('Listening for your answer… say defend, evade, accept or decline.');}scheduleMic();resolve();};
 const cancel=()=>{if(id!==undefined)native()?.cancelSpeech?.(id);if(utterance)window.speechSynthesis?.cancel();done();};signal.addEventListener('abort',cancel,{once:true});timer=setTimeout(cancel,20000);
 if(native()?.speakRequest)id=native().speakRequest(item.text,done,{character:item.character,voice:crewVoices.voiceFor(item.character)});
 else if(window.speechSynthesis&&window.SpeechSynthesisUtterance){utterance=new SpeechSynthesisUtterance(item.text);utterance.lang='en-AU';utterance.rate=.98;utterance.pitch=item.character==='VEX'?.8:item.character==='WRAITH'?.95:1;utterance.onend=done;utterance.onerror=done;window.speechSynthesis.speak(utterance);}else done();
 });}
const audio=createDialogueQueue({play});
function scheduleMic(){clearTimeout(micRetry);if(!globalThis.document)return;if(handsFree&&answerUntil&&Date.now()>answerUntil){answerUntil=0;handsFree=false;view?.micState(false,false);view?.listening('Microphone off');return;}if(!started||!handsFree||!micPermitted||speechPlaying||preparation!==null||!controller?.snapshot().active||document.hidden)return;micRetry=setTimeout(()=>{if(!globalThis.document)return;if(started&&handsFree&&!speechPlaying&&controller.snapshot().active&&!document.hidden)listen();},300);}
function stopMic(preserve=false){if(!preserve)handsFree=false;clearTimeout(micRetry);listenEpoch++;if(listening!==null){native()?.cancelListen?.(listening);listening=null;}recognition?.abort();recognition=null;view?.micState(handsFree,false);}
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
 else{watch=null;gpsBlocked=true;view?.listening('GPS requires the Android app or browser location permission.');}
}
function handleVoice(text,error){listening=null;recognition=null;if(answerUntil&&!text&&['no-speech','aborted','busy'].includes(error)&&Date.now()<answerUntil){view?.micState(true,false);scheduleMic();return;}answerUntil=0;handsFree=false;view?.micState(false,false);view?.listening(error?(error==='no-speech'?'Did not hear anything. Tap Mic and speak after the tone.':'Microphone: '+error+'. Tap Mic to try again.'):text?'Heard: “'+text+'”':'Microphone off');if(!text)return;const action=parseJourneyCommand(text);if(!action){if(aiCrew.enabled())void aiCrew.ask(text);else audio.enqueue({id:'unheard:'+Date.now(),text:'I heard '+text+', Captain, but that is not a command I know. Try repeat direction, scan, defend, evade, accept, or decline.',character:'WRAITH',priority:'mission'});return;}if(action.type==='home'){document.querySelector('.home-menu')?.click();return;}if(action.type==='recenter')view?.recenter();if(action.type==='resume'||action.type==='retry')gpsBlocked=false;void controller.command(action);}
function chime(){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const a=new C(),o=a.createOscillator(),g=a.createGain();o.frequency.value=880;g.gain.setValueAtTime(.08,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.18);o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+.2);setTimeout(()=>a.close().catch(()=>{}),400);}catch{}}
function listen(){if(listening!==null||recognition||!handsFree||speechPlaying)return;const epoch=++listenEpoch;if(answerUntil)chime();view?.micState(handsFree,true);view?.listening('Preparing microphone…');if(native()?.listenOnce){listening=-1;const id=native().listenOnce((text,error)=>{if(epoch===listenEpoch)handleVoice(text,error);});if(epoch===listenEpoch&&listening!==null)listening=id;return;}
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Recognition){view?.listening('Voice recognition unavailable. Use dashboard controls.');return;}recognition=new Recognition();recognition.lang='en-AU';recognition.continuous=false;recognition.interimResults=false;recognition.onresult=e=>{if(epoch===listenEpoch)handleVoice(e.results[0][0].transcript,null);};recognition.onerror=e=>{if(epoch===listenEpoch)handleVoice(null,e.error);};recognition.onend=()=>{recognition=null;view?.micState(handsFree,false);scheduleMic();};try{recognition.start();view?.listening('Listening for a command…');}catch(e){handleVoice(null,e.message);}}
try{
 const engine=createMissionEngine({storage:localStorage,live:true});
 controller=createJourneyController({engine,services:createRoadServices({native}),audio,onChange:s=>{view?.render(s);syncNative(s);},onLaunch:done=>playLaunch({container:document.querySelector('.viewport'),onFinish:done})});
 aiCrew=createAiCrew({native,engine,audio,storage:globalThis.localStorage});
 view=installCockpit({engine,controller,audio,crewVoices,aiCrew});installSeatedCrew();
 installCrewScreens({engine,onEnter:()=>{started=true;const epoch=++boardEpoch;preparation=-1;view.listening('Preparing GPS, microphone and speech…');const ready=result=>{if(epoch!==boardEpoch||!started)return;preparation=null;gpsBlocked=result.locationGranted===false;micPermitted=result.microphoneGranted!==false;handsFree=false;crewVoices.setOptions(result.voices,result.crew);controller.enter();view.micState(handsFree,false);if(!result.speechReady)view.listening('Speech service did not report a ready voice. Check device speech settings if silent.');view.ready.then(()=>window.dispatchEvent(new Event('resize')));};if(native()?.prepareSession){const request=native().prepareSession(ready);if(preparation!==null)preparation=request;}else{window.speechSynthesis?.getVoices();window.speechSynthesis?.resume();ready({speechReady:true,locationGranted:true,microphoneGranted:true});}},onLeave:()=>{const j=engine.snapshot().journey;if(j&&!['arrived','cancelled'].includes(j.phase)){void controller.command({type:'home'});return false;}started=false;boardEpoch++;if(preparation!==null)native()?.cancelPreparation?.(preparation);preparation=null;stopMic();controller.background();return true;},onDemo:()=>{}});
 const profile=document.querySelector('.captain-profile');profile.append(document.querySelector('.player-identity'),document.querySelector('.home-menu'));document.querySelector('.home-menu').hidden=true;
 window.addEventListener('cockpit-listen',()=>{handsFree=!handsFree;answerUntil=0;micPermitted=true;view.micState(handsFree,false);if(handsFree)scheduleMic();else stopMic();});window.addEventListener('cockpit-gps-retry',()=>{gpsBlocked=false;});
 window.addEventListener('test-mic-ready',()=>view?.listening('Listening… say destination, launch, repeat direction, scan, defend, repair or cancel journey.'));
 function background(){if(started)controller.background();stopGPS();stopMic(true);audio.clear();}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)background();else if(started&&preparation===null){gpsBlocked=false;controller.resume();}});window.addEventListener('hybrid-background',background);
 window.addEventListener('hybrid-audio',e=>{void controller.command({type:e.detail?.muted?'mute':'unmute'});});
 window.addEventListener('hybrid-stop',()=>{void controller.command({type:'mute'});});
 window.addEventListener('hybrid-foreground',()=>{if(started&&preparation===null){gpsBlocked=false;controller.resume();view?.listening('App resumed. Tap Resume navigation for a fresh GPS fix.');}});
 window.addEventListener('pagehide',()=>{background();controller.dispose();view.dispose();});setInterval(()=>controller.tick(),1000);
}catch(e){document.querySelector('#error').textContent=e.message;throw e;}
