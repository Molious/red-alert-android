import {CHARACTERS} from './red-alert/characters.js';
export function installSeatedCrew(){
 if(!document.querySelector)return ()=>{};
 const roster=document.createElement('div');roster.className='full-crew';roster.setAttribute('aria-label','All five permanent crew at their stations');
 for(const crew of CHARACTERS){const seat=document.createElement('div');seat.className='crew-station';seat.dataset.crew=crew.id;const art=document.createElement('div');art.className='seated-crew';art.setAttribute('data-seat-crew',crew.id);art.setAttribute('role','img');art.setAttribute('aria-label',`${crew.name} at ${crew.station}`);const name=document.createElement('span');name.textContent=crew.name+' · '+crew.station;seat.append(art,name);roster.append(seat);}
 document.querySelector('.viewport').append(roster);
 return crew=>{for(const station of roster.children)station.classList.toggle('station-focused',station.dataset.crew===crew.id);};
}
