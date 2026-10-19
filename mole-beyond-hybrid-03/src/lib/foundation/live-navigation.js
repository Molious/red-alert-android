import {createCosmicNavigation} from './cosmic-navigation.js';
// The real road layer only. There is no fictional map or mode switch in normal play.
export async function installLiveNavigation({viewport=document.querySelector('.viewport'),onStatus=()=>{}}={}){
 if(!document.querySelector)return;
 const {default:L}=await import('leaflet');
 const panel=document.createElement('section');panel.className='live-navigation';panel.setAttribute('aria-label','Road navigation windscreen');panel.innerHTML='<div class="road-map" aria-label="Real road map"></div><p class="map-status" role="status">Waiting for GPS · road tiles require internet</p>';viewport.append(panel);
 const notice=panel.querySelector('.map-status'),map=L.map(panel.querySelector('.road-map'),{zoomControl:false}).setView([-26.8,153.1],12);
 L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map).on('tileerror',()=>{notice.textContent='Road tiles unavailable · check internet';onStatus('Road tiles unavailable');}).on('tileload',()=>{notice.textContent='Live road map';});
 // Space scenery sits above road tiles (200) and below route/position geometry (400+).
 const atmosphere=map.createPane('spaceAtmosphere');atmosphere.style.zIndex='300';atmosphere.style.pointerEvents='none';
 atmosphere.innerHTML='<div class="space-nebula"></div><div class="space-stars"></div><div class="space-planet"><span></span></div><div class="space-moon"></div>';
 let seed=5821;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 const stars=atmosphere.querySelector('.space-stars');for(let i=0;i<90;i++){const star=document.createElement('i');star.className='space-star';star.style.left=(random()*100)+'%';star.style.top=(random()*100)+'%';star.style.setProperty('--star-size',(i%9===0?3:i%3===0?2:1)+'px');star.style.opacity=String(.45+(i%6)*.1);stars.append(star);}
 function positionAtmosphere(){const size=map.getSize();atmosphere.style.width=size.x+'px';atmosphere.style.height=size.y+'px';L.DomUtil.setPosition(atmosphere,map.containerPointToLayerPoint([0,0]));}
 map.on('move resize zoomend',positionAtmosphere);positionAtmosphere();
 L.control.zoom({position:'bottomright'}).addTo(map);
 // Use the vector cockpit only during a live journey. Parked planning keeps Leaflet.
 let cosmic,cosmicPending=false,disposed=false,latest;
 const vector=document.createElement('div');vector.className='mole-vector-map';panel.append(vector);
 const credit=document.createElement('div');credit.className='mole-map-credit';credit.innerHTML='<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a> · <a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a>';panel.append(credit);
 const zoom=document.createElement('div');zoom.className='mole-map-zoom';
 for(const [label,delta] of [['Zoom in',1],['Zoom out',-1]]){const b=document.createElement('button');b.type='button';b.textContent=delta>0?'+':'−';b.setAttribute('aria-label',label);b.onclick=()=>{if(cosmic)cosmic.map.zoomTo(cosmic.map.getZoom()+delta);else map.setZoom(map.getZoom()+delta);};zoom.append(b);}panel.append(zoom);
 async function ensureCosmic(){
  if(cosmic||cosmicPending||disposed)return;
  // Headless DOMs and older WebViews can retain the working flat road map.
  if(!window.WebGLRenderingContext){panel.dataset.vectorUnavailable='true';notice.textContent='3D map unavailable · showing flat road map';return;}
  cosmicPending=true;
  try{const {default:maplibre}=await import('maplibre-gl');if(disposed)return;
   cosmic=createCosmicNavigation({maplibre,container:vector,onStatus:text=>{notice.textContent=text;panel.dataset.vectorError=String(/unavailable|interrupted/.test(text));}});if(latest)cosmic.update(latest);
  }catch(e){panel.dataset.vectorUnavailable='true';notice.textContent='3D map unavailable · showing flat road map';onStatus('3D map unavailable');}
 }
 let marker,circle,destination,routeLayer,lastRoute,lastDest,lastPhase=null,following=true;
 map.on('dragstart',()=>following=false);
 return {
  update(s){
   latest=s;const active=['navigating','recalculating','signal lost','launching'].includes(s.journey?.phase);panel.dataset.cosmicActive=String(active);
   if(active)ensureCosmic();cosmic?.update(s);
   const phase=s.journey?.phase;if(phase==='navigating'&&lastPhase!=='navigating')following=true;lastPhase=phase;
   if(s.route!==lastRoute){lastRoute=s.route;routeLayer?.remove();routeLayer=null;if(s.route)routeLayer=L.polyline(s.route.points,{color:'#4ee4ff',weight:6,opacity:1}).addTo(map);if(s.route&&s.journey?.phase==='route_ready')map.fitBounds(routeLayer.getBounds(),{padding:[20,20],animate:false});}
   const target=s.selected||s.journey?.destination;
   const destKey=target?target.lat+','+target.lng:null;if(destKey!==lastDest){lastDest=destKey;destination?.remove();destination=null;if(target){destination=L.circleMarker([target.lat,target.lng],{radius:9,color:'#ffd67b',fillOpacity:.8}).addTo(map);if(s.planning){following=false;map.setView([target.lat,target.lng],16);}}}
   if(s.fix&&(!s.guidance||s.guidance.valid)){
    const ll=[s.fix.lat,s.fix.lng];if(!marker){marker=L.circleMarker(ll,{radius:8,color:'#fff',weight:3,fillColor:'#23cfee',fillOpacity:1}).addTo(map);circle=L.circle(ll,{radius:s.fix.accuracy,color:'#7be7f4',weight:1,fillOpacity:.08}).addTo(map);}else{marker.setLatLng(ll);circle.setLatLng(ll).setRadius(s.fix.accuracy);}
    marker.setStyle({opacity:1,fillOpacity:1});if(!s.planning&&following)map.setView(ll,Math.max(16,map.getZoom()),{animate:false});
   }else marker?.setStyle({opacity:.4,fillOpacity:.2});
   if(s.journey?.phase==='navigating'&&s.route!==undefined&&!s.planning&&s.guidance?.valid&&following)map.invalidateSize();
  },
  recenter(s){cosmic?.recenter(s);following=true;if(s.fix)map.setView([s.fix.lat,s.fix.lng],16);map.invalidateSize();},
  resize(){map.invalidateSize();cosmic?.resize();},dispose(){disposed=true;cosmic?.dispose();credit.remove();map.remove();panel.remove();}
 };
}
