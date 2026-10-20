// What happens after the recogniser hands back a phrase (#20). Every outcome gets a spoken reply,
// either the crew doing it, a short confirmation, or "Say that again, Captain", never silence.
// Kept free of the DOM so it can be tested without a phone.
import {matchVoice} from './commands.js';

const NAV_PHASES=['navigating','launching','recalculating','signal_lost'];
const ANSWERS={accept:'accept',decline:'decline',defend:'defend',evade:'evade',delegate:'let crew handle it',acknowledge:'acknowledge',scan:'scan',collect:'collect',repair:'repair',cancel:'yes',keep:'no'};

// Short confirmations for commands where the crew don't already say something.
const CONFIRM={
 launch:'Launch ready when you are parked.',recenter:'Map centred on us.',save:'Progress saved.',resume:'Resuming navigation. Waiting for a fresh GPS fix.',retry:'Recalculating the route.',
 'pause-story':'Crew story paused. Directions stay on.','resume-story':'Crew story back on.',destination:'Say destination, then the street address.',confirm:'Destination confirmed.',
 select:'Option selected. Say confirm to use it.',home:'Main menu.',
};

/** The answers the crew are waiting for right now, for matchVoice's context. */
export function expectedAnswers({journey,pendingCancel=false,asked=null}={}){
 if(pendingCancel)return ['cancel','keep'];
 if(asked?.length)return [...asked];
 const event=journey?.activeEvent;
 if(event?.actions?.length)return [...event.actions,'delegate'];
 return [];
}
/** "Say defend, evade, or let crew handle it." */
export function answerHint(expect){
 const words=[...new Set(expect.map(t=>ANSWERS[t]).filter(Boolean))];
 if(!words.length)return '';
 return 'Say '+(words.length===1?words[0]:words.slice(0,-1).join(', ')+' or '+words.at(-1))+'.';
}
export function helpLine({journey}){
 const moving=journey&&NAV_PHASES.includes(journey.phase);
 return moving?'You can say repeat, mute, unmute, pause story, recentre, or cancel journey. When the crew ask, just answer.'
  :'You can say destination and an address, option one, confirm, launch, station, or repeat.';
}

/**
 * @param {object} o
 * @param {(action:object)=>Promise<unknown>} o.command  controller.command
 * @param {()=>{status?:string}} o.snapshot              controller.snapshot
 * @param {()=>{journey?:object,muted?:boolean,results?:boolean}} o.state  what the screen shows
 * @param {(line:object)=>Promise<string>} o.say         queue a reply line (priority 'reply')
 * @param {()=>number} o.spoken                          lines queued so far (to see if the crew answered)
 * @param {()=>void} [o.chime]                           a non-speech confirmation while muted
 * @param {(action:object)=>void} [o.before]             side effects before a command (recentre map, clear GPS block, open panels)
 * @param {(text:string)=>boolean} [o.askAi]             optional AI crew for free speech; true if it took it
 */
export function createVoiceControl({command,snapshot,state,say,spoken,chime=()=>{},before=()=>{},askAi=()=>false,openPanel=()=>false,micOff=()=>{}}){
 let pendingCancel=false,asked=null,reprompts=0;
 const reply=(text,extra={})=>state().muted&&!extra.force?(chime(),Promise.resolve('chimed')):say({text,character:'CHET',priority:'reply',...extra});
 const firstSentence=text=>String(text||'').split(/(?<=[.!?])\s/)[0].slice(0,140);
 return {
  /** A crew question was asked: these are the answers it expects (null: work it out from the journey). */
  asking(expect){asked=expect&&expect.length?[...expect]:null;reprompts=0;},
  /** The answer window closed unanswered: forget the question, including a pending "cancel the journey?". */
  endQuestion(){asked=null;reprompts=0;pendingCancel=false;},
  context(){const s=state();return {expect:expectedAnswers({journey:s.journey,pendingCancel,asked}),muted:!!s.muted,results:!!s.results};},
  pendingCancel:()=>pendingCancel,
  /**
   * @returns {Promise<{action?:object, reply?:string, retry?:boolean, ask?:string[]}>}
   *   retry: listen again silently (still inside the answer window); ask: reply was a question, open the window for these answers.
   */
  async handle(text,error,{inWindow=false}={}){
   if(!text){
    // Our own cancellations and a still-closing previous session are not the driver's fault.
    if(['aborted','busy'].includes(error))return inWindow?{retry:true}:{};
    if(error==='no-speech'&&inWindow)return {retry:true};
    if(error==='no-speech'){void reply('I did not catch that, Captain. Say it again after the tone.');return {reply:'no-speech'};}
    if(error==='not-allowed'){void reply('The microphone is switched off for this app, Captain. Allow it in Android settings when we are parked.');return {reply:'not-allowed'};}
    void reply('Voice recognition is not working right now, Captain.');return {reply:'error'};
   }
   const ctx=this.context();const m=matchVoice(text,ctx);
   if(!m){
    if(!ctx.expect.length&&text.trim().split(/\s+/).length>=3&&askAi(text))return {reply:'ai'};
    const again='Say that again, Captain.'+(ctx.expect.length&&reprompts<1?' '+answerHint(ctx.expect):'');
    // Inside a question, ask once more and listen again; after that, let the crew handle it.
    if(ctx.expect.length&&reprompts<1){reprompts++;void reply(again,{ask:true,expect:ctx.expect});return {reply:'again',ask:ctx.expect};}
    void reply(again);return {reply:'again'};
   }
   const action=m.action,s=state(),journey=s.journey,moving=journey&&NAV_PHASES.includes(journey.phase);
   asked=null;reprompts=0;
   switch(action.type){
    case 'keep-journey':pendingCancel=false;void reply('Carrying on.');return {action,reply:'keep'};
    case 'confirm-cancel':pendingCancel=false;return this.run({type:'cancel'});
    case 'cancel':if(moving){pendingCancel=true;void reply('Cancel the journey, Captain? Say yes to confirm, or no to carry on.',{ask:true,expect:['cancel','keep']});return {action,reply:'confirm?',ask:['cancel','keep']};}break;
    case 'mute':{await reply('Going quiet, Captain. Say unmute to hear us again.',{force:true});await command(action);return {action,reply:'mute'};}
    case 'mic-off':micOff();void reply('Microphone off.');return {action,reply:'mic-off'};
    case 'help':void reply(helpLine(s));return {action,reply:'help'};
    case 'home':if(journey&&!['arrived','cancelled'].includes(journey.phase)){void reply('Cancel the journey before going to the main menu, Captain.');return {action,reply:'busy'};}if(!openPanel('home'))void reply(CONFIRM.home);return {action};
    case 'station':case 'crew':
     if(moving){void reply('That opens when we are parked, Captain.');return {action,reply:'parked-only'};}
     if(!openPanel(action.type))void reply('That is not available right now.');return {action};
   }
   pendingCancel=false;
   return this.run(action);
  },
  async run(action){
   before(action);
   const was=spoken(),status=snapshot()?.status;
   await command(action);
   if(spoken()!==was)return {action};               // the crew answered it themselves
   const now=snapshot()?.status;
   // A refusal or change the crew didn't voice ("Crew action deferred until navigation is clear.").
   const text=now&&now!==status?firstSentence(now):CONFIRM[action.type]||'Done, Captain.';
   void reply(text);return {action,reply:text};
  },
 };
}
