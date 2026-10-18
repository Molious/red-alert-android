// New opening draft, grounded in the existing crew backstories.
export const OPENING=[
 {character:'CHET',text:'Five outcasts. One ship. You gave them somewhere to belong. Now the bridge is waiting for its captain.'},
 {character:'WRAITH',text:'Course board is ready, Captain. Wherever we go today… we go together.'},
 {character:'BASTION',text:'Shields are holding. Still watching that clever ship of yours. But I’m here, aren’t I?'},
 {character:'MAX',text:'And the shuttle’s ready. You let a stowaway stay aboard. Let me keep earning the berth.'},
 {character:'SILAS',text:'Incoming transmission. Morna Station. Their clinic is running low on sterile medical packs.'},
 {character:'VEX',text:'Then we carry the supplies. You know what another chance is worth, Captain.'},
 {character:'CHET',text:'A small cargo. People waiting at the other end. Shall we take the job, Captain?'}
];
export function installOpening({engine,speak,stop,onOffer}){
 if(!document.querySelector)return {show:()=>{}};
 const panel=document.createElement('section');panel.className='opening-story';panel.hidden=true;panel.innerHTML='<p class="eyebrow">PROLOGUE · A PLACE TO BELONG</p><h2 data-speaker></h2><p data-line aria-live="polite"></p><button data-next>Continue scene</button><button data-close>Return to cockpit</button><p class="muted">Opening draft · device voice when enabled · no custom AI voices yet</p>';document.querySelector('.viewport').before(panel);
 let index=0;
 function draw(){const line=OPENING[index];panel.querySelector('[data-speaker]').textContent=line.character;panel.querySelector('[data-line]').textContent=line.text;panel.querySelector('[data-next]').textContent=index===OPENING.length-1?'Take the medical cargo job':'Continue scene';stop();speak(line);}
 function show(){index=0;panel.hidden=false;draw();panel.scrollIntoView?.({block:'start',behavior:'smooth'});}
 panel.querySelector('[data-close]').onclick=()=>{stop();panel.hidden=true;};
 panel.querySelector('[data-next]').onclick=()=>{if(index<OPENING.length-1){index++;draw();}else{stop();panel.hidden=true;if(!engine.snapshot().mission||engine.snapshot().mission.status==='complete')onOffer();}};
 const replay=document.createElement('button');replay.textContent='Play opening story';replay.onclick=show;document.querySelector('.viewport').after(replay);return {show};
}
