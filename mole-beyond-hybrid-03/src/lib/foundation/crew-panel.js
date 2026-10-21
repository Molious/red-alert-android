// Crew panel: the crew voice check (hear each crew member and change their voice) and the optional AI
// crew key. Parked use only - it is hidden while navigating.
import {CREW_ROSTER} from './crew-voices.js';
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);

export function installCrewPanel({container,audio,crewVoices,aiCrew,voiceKey}){
 const panel=document.createElement('section');panel.className='crew-panel';panel.hidden=true;panel.setAttribute('aria-label','Crew voices and AI crew');
 container.append(panel);let open=false,message='';
 const line=(c,text)=>audio.enqueue({id:'check:'+c.id+':'+Date.now(),text,character:c.id,priority:'mission',expiresAt:Date.now()+60000});
 panel.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const who=CREW_ROSTER.find(c=>c.id===b.dataset.crew);
  if(b.dataset.do==='play'&&who)line(who,who.intro);
  if(b.dataset.do==='next'&&who){crewVoices.next(who.id);line(who,who.intro);render();}
  if(b.dataset.do==='reset'&&who){crewVoices.reset(who.id);render();}
  if(b.dataset.do==='all')for(const c of CREW_ROSTER)line(c,c.intro);
  if(b.dataset.do==='save-key'){try{aiCrew?.setKey(panel.querySelector('#ai-key').value);message='Key saved. Tap Mic and talk to your crew.';}catch(err){message=err.message;}render();}
  if(b.dataset.do==='clear-key'){aiCrew?.clearKey();message='Key removed from this phone.';render();}
  if(b.dataset.do==='save-voice-key'){try{voiceKey?.set(panel.querySelector('#voice-key').value);message='Voice key saved. The crew now speak with their ElevenLabs voices.';}catch(err){message=err.message;}render();}
  if(b.dataset.do==='clear-voice-key'){voiceKey?.clear();message='Voice key removed. The crew use the phone voices.';render();}
  if(b.dataset.close!==undefined)toggle(false);
 });
 function toggle(value=!open){open=!!value;panel.hidden=!open;message='';render();}
 function render(){
  if(!open)return;
  const have=crewVoices.options().length;
  panel.innerHTML=`<div class="station-head"><h2>Crew</h2><button type="button" data-close>Close</button></div>
  <p class="crew-note">Crew voice check: each crew member introduces themselves. If a voice sounds wrong, tap Next voice until it fits${have?'':' (voices appear once the phone’s speech service is ready)'}.</p>
  <button type="button" data-do="all" class="crew-all">Play whole crew</button>
  <ul class="crew-voices">${CREW_ROSTER.map(c=>`<li><div><b>${esc(c.name)}</b><small>${esc(c.role)} · ${esc(crewVoices.label(c.id))}</small></div><button type="button" data-do="play" data-crew="${c.id}" aria-label="Hear ${esc(c.name)}">Play</button><button type="button" data-do="next" data-crew="${c.id}" ${have?'':'disabled'}>Next voice</button></li>`).join('')}</ul>
  ${voiceKey?`<div class="ai-key"><h3>Crew voices (ElevenLabs)</h3>
  <p class="crew-note">${voiceKey.hasKey()?'An ElevenLabs key is saved. The crew speak with their own voices; lines are saved on the phone, and directions fall back to the phone voice if the signal is slow.':'Paste your ElevenLabs API key (elevenlabs.io, profile, API Keys) to give every crew member their own voice. It stays on this phone.'}</p>
  <input id="voice-key" type="password" autocomplete="off" placeholder="sk_…" aria-label="ElevenLabs API key">
  <div class="planner-actions"><button type="button" data-do="save-voice-key">Save voice key</button>${voiceKey.hasKey()?'<button type="button" data-do="clear-voice-key">Remove voice key</button>':''}</div></div>`:''}
  <div class="ai-key"><h3>AI crew (optional)</h3>
  <p class="crew-note">${aiCrew?.hasKey()?'An API key is saved. When you say something that is not a command, the crew answer in character.':'Paste an Anthropic API key to let the crew answer anything you say. Get one at console.anthropic.com under API keys. It stays on this phone; each answer costs a fraction of a cent.'}</p>
  <input id="ai-key" type="password" autocomplete="off" placeholder="sk-ant-…" aria-label="Anthropic API key">
  <div class="planner-actions"><button type="button" data-do="save-key">Save key</button>${aiCrew?.hasKey()?'<button type="button" data-do="clear-key">Remove key</button>':''}</div>
  ${message?`<p class="crew-note" role="status">${esc(message)}</p>`:''}</div>`;
 }
 return {toggle,render,isOpen:()=>open};
}
