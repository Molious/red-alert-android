export function parseCommand(text){
 const normalized=String(text).toLowerCase().replace(/[^a-z ]/g,'').trim();
 return ({'accept delivery':'accept','depart':'depart','arrive':'arrive','complete delivery':'complete','pause':'pause','resume':'resume','stop audio':'mute'})[normalized]||null;
}

// ---------------------------------------------------------------------------------------------------
// Voice commands while driving (#20). Speech recognisers hand back fillers ("uh, accept please"),
// vocatives ("Wraith, repeat that") and near-misses ("except" for accept, "the cline" for decline,
// "lunch" for launch). matchVoice() normalises all of that and, when the crew have just asked a
// question, prefers that question's answers.
//
// Rules that keep it safe:
//  - Destructive commands (cancel the journey, main menu) need their own words; they are never guessed.
//  - Near-miss and fuzzy matching only ever pick an answer the crew are currently waiting for
//    (context.expect), so a stray word can't trigger something nobody asked about.
//  - Anything uncertain returns null, and the game asks "Say that again, Captain".
// ---------------------------------------------------------------------------------------------------

const NUMBERS={one:0,first:0,'1':0,won:0,two:1,second:1,'2':1,to:1,too:1,three:2,third:2,'3':2,tree:2,four:3,fourth:3,'4':3,for:3,five:4,fifth:4,'5':4};

// Phrase → command type. Phrases are matched after normalising (lower case, no punctuation, no fillers).
const PHRASES={
 // answers
 accept:['accept','accept deal','accept that','accept it','accept the deal','accepted','accepts','yes','yeah','yep','yup','yes please','sure','do it','deal','affirmative','i accept','we accept','except','except it','except deal','except that','accept the offer','take the deal'],
 decline:['decline','decline deal','decline that','decline it','declined','declines','no','nope','nah','no thanks','no thank you','pass','negative','not now','not this one','skip it','skip','the cline','de cline','decline the deal','decline the offer','i decline','we decline','the cline it'],
 'accept-contract':['accept contract','accept the contract','accept mission','accept the mission','accept job','accept the job','take the job','take the contract','take the mission','take it on','except contract','except the contract','except the job','except mission'],
 'decline-contract':['decline contract','decline the contract','decline mission','decline the mission','decline job','decline the job','pass on the job','pass on that job','the cline contract','the cline the job','the cline mission'],
 defend:['defend','defend us','defend the ship','defence','defense','defended','shields up','fight','fight them','the fend','de fend','shoot them','engage them','weapons'],
 evade:['evade','evade them','evaded','evading','a vade','the vade','avoid','avoid them','dodge','dodge them','cloak','cloak us','run','run for it','get us out of here','invade them'],
 delegate:['let crew handle it','let the crew handle it','crew handle it','crew handles it','you handle it','handle it','your call','you decide','you choose','your choice','up to you','deal with it','you deal with it','delegate','whatever','whatever you think','you do it','let crew decide','let the crew decide'],
 acknowledge:['acknowledge','acknowledged','acknowledge contact','acknowledge that','roger','roger that','copy','copy that','understood','got it','noted','a knowledge','acknowledgement'],
 scan:['scan','scan it','scan that','run a scan','run the scan','do a scan','scanning','scanned','passive scan','run a passive scan'],
 collect:['collect','collect salvage','collect it','collect the salvage','collected','salvage','grab it','pick it up','bring it in','collect the pod','grab the pod'],
 repair:['repair','repairs','repair it','repair the shields','fix it','fix the shields','do the repairs','repaired'],
 // driving
 // Launch phrases must be the whole utterance (never picked out of a sentence: "what about lunch").
 launch:['launch','launched','launching','launch now','launch the ship','engage','take off','lift off','blast off'],
 repeat:['repeat','repeat that','repeat direction','repeat directions','repeat the direction','repeat the directions','say again','say that again','come again','what was that','pardon','sorry what','what did you say','next turn','where do i go','directions','direction','what next','repeat please','re peat','repeat instruction','repeat the instruction'],
 mute:['mute','mute audio','mute it','mute sound','pause audio','stop audio','quiet','be quiet','go quiet','silence','shut up','stop talking','shush','sound off','audio off','mute the crew','mute everything'],
 unmute:['unmute','un mute','unmute audio','sound on','audio on','resume audio','enable voice','voice on','talk to me','unmute the crew'],
 'pause-story':['pause story','pause the story','stop story','stop the story','stop chatter','no chatter','quiet crew','crew quiet','pause crew','story off'],
 'resume-story':['resume story','resume the story','continue story','continue the story','story on','chatter on','crew talk','carry on the story'],
 resume:['resume navigation','resume','resume route','resume the route','start gps','continue','carry on','keep going','restart navigation','resume nav','start navigation'],
 retry:['retry route','retry','try again','reroute','re route','recalculate','recalculate route','new route','find a new route'],
 recenter:['recenter','recentre','re center','re centre','center map','centre map','center','centre','center the map','centre the map','follow me','where am i','find me'],
 save:['save','save game','save progress','save the game'],
 cancel:['cancel journey','cancel the journey','cancel trip','cancel the trip','cancel navigation','cancel the navigation','cancel route','cancel the route','end journey','end the journey','end trip','stop navigation','abort','abort journey','abort mission','abort the journey'],
 home:['main menu','home menu'],
 destination:['destination','new destination','set destination','set a destination','change destination','set the destination'],
 confirm:['confirm','confirm destination','confirm the destination','confirmed','use that','use that one','that one','go with that','go there'],
 station:['station','open station','open the station','market','open market','open the market','trade','trading'],
 crew:['crew','open crew','crew panel','crew screen','open the crew panel'],
 'mic-off':['stop listening','mic off','microphone off','stop mic','turn off the mic','turn the mic off'],
 help:['help','what can i say','commands','what are my options','options','voice commands','list commands'],
};
const PHRASE_TYPE=new Map();for(const [type,list] of Object.entries(PHRASES))for(const p of list)PHRASE_TYPE.set(p,type);

// Near-misses that only count when the crew are waiting for that answer (context.expect).
const IN_CONTEXT={
 accept:['okay','ok','alright','all right','go ahead','go for it','accent','except','assept','acept','axept','yes yes'],
 decline:['recline','incline','the climb','the clean','declan','the clan','no no','dont','do not'],
 defend:['depend','the friend','offend','defend it','defender'],
 evade:['invade','a bade','the bade','evade it','obeyed','a vape','evaid','avade'],
 acknowledge:['okay','ok','knowledge','i know','alright','all right','acknowledge it'],
 scan:['can','scam','skan','stan','span','scanner','okay','ok','go ahead','do it','yes'],
 collect:['correct','connect','collector','take it','okay','ok','go ahead','do it','yes','get it'],
 repair:['reaper','rapier','prepare','okay','ok','go ahead','do it','yes'],
 // Only while a launch is expected (route ready, parked): everyday words otherwise.
 launch:['lunch','lets go','let us go','punch it','lets launch','go go go'],
 cancel:['yes','yeah','yep','confirm','cancel','cancel it','do it','end it'],
 keep:['no','nope','keep going','dont','do not','never mind','nevermind','carry on','continue'],
};

const FILLER=/^(?:uh+|um+|er+m?|ah+|hmm+|oh|okay so|ok so|okay|ok|so|well|hey|right|alright then|please|captain|cap|computer|ship|chet|wraith|max|vex|silas|bastion|guys|team|crew,)\s+/;
const TRAIL=/\s+(?:please|thanks|thank you|now|captain|cap|mate|for me|then|chet|wraith|max|vex|silas|bastion)$/;

export function normalizeSpeech(text){
 let s=String(text??'').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
 for(let i=0;i<6;i++){const next=s.replace(FILLER,'').replace(TRAIL,'').trim();if(next===s)break;s=next;}
 return s;
}

function editDistance(a,b){const d=Array.from({length:a.length+1},(_,i)=>[i]);for(let j=1;j<=b.length;j++)d[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[a.length][b.length];}
// A rough sound-alike key: drops vowels after the first letter and merges letters that sound alike.
function soundKey(w){return w.replace(/ph/g,'f').replace(/c(?=[eiy])/g,'s').replace(/ck|c|q/g,'k').replace(/x/g,'ks').replace(/z/g,'s').replace(/(.)\1+/g,'$1').replace(/(?!^)[aeiouyhw]/g,'');}

// Destination by voice: "destination 12 Smith St", "navigate to …", "take me to …", "go to …".
const DEST=/^(?:(?:set|new|change)(?: the| a)? )?(?:destination(?: to)?|navigate to|navigation to|take me(?: to)?|go to|drive to|head to|directions to) (.+)$/;

/**
 * @param {string} text   what the recogniser heard
 * @param {{expect?:string[], results?:boolean}} context
 *   expect: answers the crew are waiting for right now (e.g. ['accept','decline'] or ['defend','evade','delegate'],
 *           or ['cancel','keep'] while confirming a cancel); results: destination options are on screen.
 * @returns {{action:object, via:string}|null}
 */
export function matchVoice(text,context={}){
 const expect=context.expect||[];const raw=String(text??'').trim();
 if(!raw)return null;
 const s=normalizeSpeech(raw);if(!s)return null;
 const words=s.split(' ');
 const asked=t=>expect.includes(t);
 // While confirming a cancel, only yes/no style answers count.
 if(asked('cancel')&&asked('keep')){
  for(const t of ['cancel','keep'])if(IN_CONTEXT[t].includes(s))return {action:{type:t==='cancel'?'confirm-cancel':'keep-journey'},via:'context'};
  if(PHRASE_TYPE.get(s)==='cancel')return {action:{type:'confirm-cancel'},via:'context'};
  if(['accept','decline'].includes(PHRASE_TYPE.get(s)))return {action:{type:PHRASE_TYPE.get(s)==='accept'?'confirm-cancel':'keep-journey'},via:'context'};
  return null;
 }
 // Numbered destination options ("option two", "the second one", or just "two" while options are shown).
 const opt=s.match(/^(?:the )?(?:option|number|destination|result|choice)? ?(one|two|three|four|five|first|second|third|fourth|fifth|[1-5]|won|to|too|tree|for)(?: one| option)?$/);
 if(opt&&(context.results||/option|number|destination|result|choice|first|second|third|fourth|fifth/.test(s))&&!(['to','too','for','won','tree'].includes(opt[1])&&!context.results))
  return {action:{type:'select',index:NUMBERS[opt[1]]},via:'option'};
 // Destination search.
 // Keeps the driver's own wording (house numbers, capitals) when they said "destination …".
 const typed=raw.match(/^\s*destination\s+(.+)$/i),spoken=s.match(DEST);
 const where=(typed?typed[1]:spoken?.[1]||'').trim();
 if(where.length>=2&&!/^(the )?(option|number|result|choice)\b/i.test(where)&&!/^(one|two|three|four|five|[1-5])$/i.test(where)&&!PHRASE_TYPE.has(normalizeSpeech(where)))return {action:{type:'search',text:where},via:'destination'};
 // Whole phrase.
 let type=PHRASE_TYPE.get(s);
 if(type){
  // Accept/decline when the crew asked something else: "yes" to a single-action question means do it;
  // "yes" to "defend or evade?" isn't an answer, so ask again.
  if(['accept','decline'].includes(type)&&expect.length&&!asked('accept')&&!asked('decline')){
   const only=expect.filter(t=>t!=='delegate');
   if(type==='accept'&&only.length===1&&IN_CONTEXT[only[0]]?.includes('yes'))return {action:{type:only[0]},via:'context'};
   return null;
  }
  return {action:{type},via:'phrase'};
 }
 // "on mute" is how recognisers often hear "unmute" — only while muted.
 if(s==='on mute'||s==='and mute')return context.muted?{action:{type:'unmute'},via:'context'}:null;
 // Near-misses for the answer being waited for.
 for(const t of expect){if(IN_CONTEXT[t]?.includes(s))return {action:{type:t},via:'context'};}
 // Negation: "don't accept", "do not take it" → decline (only as an answer to an offer).
 if(/\b(dont|do not|not)\b/.test(s)&&/\b(accept|except|take)\b/.test(s)&&asked('decline'))return {action:{type:'decline'},via:'context'};
 // A command phrase inside a longer sentence: "yeah lets accept that one", "can you repeat the direction".
 // Only one kind of command may appear, and never the destructive ones.
 if(words.length<=8&&!/\b(dont|do not|not|never)\b/.test(s)){
  const found=new Set();
  for(const [phrase,t] of PHRASE_TYPE){if(phrase.length<4||['cancel','home','destination','confirm','yes','no','launch'].includes(t))continue;if((' '+s+' ').includes(' '+phrase+' '))found.add(t);}
  if(found.size===2&&found.has('accept')&&found.has('accept-contract'))found.delete('accept');
  if(found.size===2&&found.has('decline')&&found.has('decline-contract'))found.delete('decline');
  const ANSWERS=['accept','decline','defend','evade','delegate','acknowledge','scan','collect','repair'];
  // In a question, an answer word only counts if it answers that question.
  if(found.size===1){const [t]=found;if(!expect.length||asked(t)||!ANSWERS.includes(t))return {action:{type:t},via:'keyword'};}
 }
 // Sound-alike guess, only among the answers being waited for, only for short replies.
 if(expect.length&&words.length<=3){
  const candidates=[];
  for(const t of expect){const key=['delegate','launch','cancel','keep'].includes(t)?null:t;if(!key)continue; // launch has its own explicit near-misses
   for(const w of words){if(w.length<3)continue;const d=editDistance(w,key),k=editDistance(soundKey(w),soundKey(key));if(d<=2&&w.length>=4||k===0&&w.length>=4)candidates.push({t,score:d+k});}}
  candidates.sort((a,b)=>a.score-b.score);
  if(candidates.length&&(candidates.length===1||candidates[0].t===candidates[1].t||candidates[0].score<candidates[1].score))return {action:{type:candidates[0].t},via:'fuzzy'};
 }
 return null;
}

// Backwards-compatible: just the action, or null.
export function parseJourneyCommand(text,context={}){return matchVoice(text,context)?.action||null;}
