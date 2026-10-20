// Red Alert-style combat in the windscreen sky: the enemy ship appears, the targeting reticle hunts it
// and locks on, then Vex fires (beams + explosion) or Wraith cloaks us away. Display only; it reads the
// journey snapshot and never touches the save. Kept in the upper part of the windscreen so the road
// and the route stay clear.
const SHIPS={
 scout:'<svg viewBox="-30 -20 60 40"><path d="M0-14L22 6L8 4L0 14L-8 4L-22 6Z" fill="#2a0d12" stroke="#ff5a5a" stroke-width="2"/><circle r="3" fill="#ff8a6a"/></svg>',
 raider:'<svg viewBox="-40 -26 80 52"><path d="M0-20L14-6L36 0L14 8L6 22L0 12L-6 22L-14 8L-36 0L-14-6Z" fill="#2a0d12" stroke="#ff4040" stroke-width="2.2"/><path d="M-30 0H-44M30 0H44" stroke="#ff9a3c" stroke-width="3"/><circle r="4" fill="#ffb35c"/></svg>',
 warship:'<svg viewBox="-56 -34 112 68"><path d="M0-28L18-14L52-8L40 6L18 10L10 30L0 20L-10 30L-18 10L-40 6L-52-8L-18-14Z" fill="#240a10" stroke="#ff3030" stroke-width="2.6"/><path d="M-22-4H22M-12 6H12" stroke="#ff6a5c" stroke-width="2"/><circle cy="-6" r="5" fill="#ffd27a"/></svg>',
};
const RETICLE='<svg viewBox="-50 -50 100 100"><circle r="34" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="10 7"/><circle r="22" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".7"/><path d="M0-46V-28M0 28V46M-46 0H-28M28 0H46" stroke="currentColor" stroke-width="3"/><circle r="2.5" fill="currentColor"/></svg>';

export function installCombatView({container}){
 const el=container.ownerDocument.createElement('div');el.className='combat-hud';el.hidden=true;el.setAttribute('aria-hidden','true');
 el.innerHTML=`<div class="combat-enemy"></div><div class="combat-reticle">${RETICLE}</div><svg class="combat-beams" viewBox="0 0 100 100" preserveAspectRatio="none"><line class="beam l" x1="12" y1="100" x2="50" y2="40"/><line class="beam r" x1="88" y1="100" x2="50" y2="40"/></svg><div class="combat-boom"></div><b class="combat-label"></b>`;
 container.append(el);
 const enemy=el.querySelector('.combat-enemy'),reticle=el.querySelector('.combat-reticle'),label=el.querySelector('.combat-label'),beams=el.querySelector('.combat-beams'),boom=el.querySelector('.combat-boom');
 let mode='idle',tier='raider',t0=0,raf=0,ex=50,ey=40,rx=30,ry=55,startCredits=0,finishAt=0,lastKey='';
 const W=container.ownerDocument.defaultView;
 function place(){
  const t=(Date.now()-t0)/1000,far=mode==='contact';
  // the enemy weaves across the sky; closer (bigger, lower) once it attacks
  ex=50+Math.sin(t*.7)*(far?18:28)+Math.sin(t*1.9)*6;ey=(far?24:34)+Math.sin(t*1.3)*(far?5:9);
  enemy.style.left=ex+'%';enemy.style.top=ey+'%';
  const lockT=mode==='combat'?Math.min(1,t/3.2):0,follow=mode==='fire'||mode==='locked'?1:.06+lockT*.25;
  rx+=(ex-rx)*follow;ry+=(ey-ry)*follow;reticle.style.left=rx+'%';reticle.style.top=ry+'%';
  const locked=mode==='combat'&&lockT>=1||mode==='locked'||mode==='fire';
  reticle.classList.toggle('locked',locked);reticle.style.setProperty('--size',(locked?.9:1.35-lockT*.4).toFixed(2));
  if(mode==='contact')label.textContent='CONTACT · '+tier.toUpperCase();
  else if(mode==='combat')label.textContent=locked?'LOCKED · '+tier.toUpperCase():'TARGETING…';
  beams.querySelectorAll('line').forEach(l=>{l.setAttribute('x2',ex);l.setAttribute('y2',ey);});
  boom.style.left=ex+'%';boom.style.top=ey+'%';
  if(finishAt&&Date.now()>finishAt)hide();else raf=W.requestAnimationFrame(place);
 }
 function show(m){if(el.hidden){el.hidden=false;rx=ex-25;ry=ey+30;}if(mode!==m)t0=Date.now();mode=m;el.dataset.mode=m;enemy.innerHTML=SHIPS[tier]||SHIPS.raider;enemy.dataset.tier=tier;W.cancelAnimationFrame(raf);finishAt=0;raf=W.requestAnimationFrame(place);}
 function hide(){W.cancelAnimationFrame(raf);el.hidden=true;mode='idle';el.dataset.mode='idle';finishAt=0;}
 function resolve(defended){
  if(defended){mode='fire';el.dataset.mode='fire';label.textContent='FIRING';setTimeout(()=>{if(mode==='fire'){mode='locked';el.dataset.mode='destroyed';label.textContent=tier.toUpperCase()+' DESTROYED';}},900);}
  else{mode='locked';el.dataset.mode='evaded';label.textContent='CLOAKED · CONTACT LOST';}
  finishAt=Date.now()+4200;if(el.hidden){el.hidden=false;t0=Date.now();}W.cancelAnimationFrame(raf);raf=W.requestAnimationFrame(place);
 }
 return {
  update(s){
   const j=s.journey,e=j?.activeEvent,driving=j&&['navigating','recalculating'].includes(j.phase);
   if(!driving){if(!el.hidden&&!finishAt)hide();return;}
   if(e&&(e.type==='contact'||e.type==='combat')){tier=e.tier||'raider';const key=e.id;if(key!==lastKey){lastKey=key;if(e.type==='combat')startCredits=s.credits;}if(mode!==e.type)show(e.type);return;}
   const combat=(j.completedEventIds||[]).find(id=>id.endsWith(':combat'));
   if(combat&&lastKey===combat&&(mode==='combat'||mode==='contact')){resolve(s.credits>startCredits);return;}
   if(!el.hidden&&!finishAt&&mode!=='idle'&&!(e&&['contact','combat'].includes(e.type)))hide();
  },
  dispose(){hide();el.remove();}
 };
}
