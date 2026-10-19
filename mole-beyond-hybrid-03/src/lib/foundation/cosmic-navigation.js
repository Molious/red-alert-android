// Presentation only: consumes the same journey snapshot as the parked Leaflet map.
// No routing, GPS subscription, guidance or voice responsibilities live here.
const empty=()=>({type:'FeatureCollection',features:[]});
const roadWidth=['interpolate',['linear'],['zoom'],10,1.2,14,3,18,12];
export function cosmicStyle(){
 return {version:8,glyphs:'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',sources:{openmaptiles:{type:'vector',url:'https://tiles.openfreemap.org/planet',attribution:'© OpenStreetMap contributors · OpenFreeMap'}},layers:[
  {id:'lane-aura',type:'line',source:'openmaptiles','source-layer':'transportation',filter:['!=',['get','class'],'rail'],paint:{'line-color':'#246fff','line-width':['interpolate',['linear'],['zoom'],10,4.2,14,10.5,18,42],'line-opacity':.28,'line-blur':5}},
  {id:'energy-lanes',type:'line',source:'openmaptiles','source-layer':'transportation',filter:['!=',['get','class'],'rail'],paint:{'line-color':'#249ee9','line-width':roadWidth,'line-opacity':.75}},
  {id:'lane-core',type:'line',source:'openmaptiles','source-layer':'transportation',filter:['in',['get','class'],['literal',['motorway','trunk','primary','secondary']]],paint:{'line-color':'#afeaff','line-width':['interpolate',['linear'],['zoom'],10,.3,14,.75,18,3],'line-opacity':.9}},
  {id:'street-names',type:'symbol',source:'openmaptiles','source-layer':'transportation_name',minzoom:12,layout:{'symbol-placement':'line','symbol-spacing':230,'text-field':['coalesce',['get','name:en'],['get','name'],''],'text-font':['Noto Sans Regular'],'text-size':15,'text-max-angle':35,'text-rotation-alignment':'viewport','text-pitch-alignment':'viewport','text-keep-upright':true,'text-padding':5},paint:{'text-color':'#f0fdff','text-halo-color':'#020b21','text-halo-width':2.2}},
  {id:'place-names',type:'symbol',source:'openmaptiles','source-layer':'place',maxzoom:15,layout:{'text-field':['coalesce',['get','name:en'],['get','name'],''],'text-font':['Noto Sans Regular'],'text-size':16,'text-rotation-alignment':'viewport','text-pitch-alignment':'viewport','text-padding':12},paint:{'text-color':'#d7f8ff','text-halo-color':'#020b21','text-halo-width':2}}
 ]};
}
function bearing(a,b){const k=Math.PI/180,y=Math.sin((b.lng-a.lng)*k)*Math.cos(b.lat*k),x=Math.cos(a.lat*k)*Math.sin(b.lat*k)-Math.sin(a.lat*k)*Math.cos(b.lat*k)*Math.cos((b.lng-a.lng)*k);return (Math.atan2(y,x)/k+360)%360;}
export function createCosmicNavigation({maplibre,container,window:w=window,onStatus=()=>{}}){
 const d=container.ownerDocument;
 const map=new maplibre.Map({container,style:cosmicStyle(),center:[153.1,-26.8],zoom:16,pitch:57,bearing:0,attributionControl:false,canvasContextAttributes:{alpha:true},maxPitch:60});
 const ship=d.createElement('div');ship.className='mole-ship';ship.setAttribute('aria-label','Your position');
 ship.innerHTML='<svg viewBox="0 0 48 56" aria-hidden="true"><path d="M18 30L24 48L30 30" fill="none" stroke="#43eaff" stroke-width="4" opacity=".7"/><path d="M24 3L40 36L24 29L8 36Z" fill="white" stroke="#bafaff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
 const marker=new maplibre.Marker({element:ship,rotationAlignment:'map',pitchAlignment:'viewport'});
 const pin=d.createElement('div');pin.className='mole-destination';pin.setAttribute('aria-label','Destination');pin.textContent='◆';
 const destination=new maplibre.Marker({element:pin});
 let tileError=false,latest,ready=false,disposed=false,following=true,lastPhase,heading=0,lastFix,hasMarker=false,hasDestination=false,lastRoute;
 const isNorth=()=>{try{return w.localStorage.getItem('mole-beyond:map-orient')==='north';}catch{return false;}};
 function camera(s){if(!s?.fix||s.planning||!following||s.guidance?.valid===false)return;map.jumpTo({center:[s.fix.lng,s.fix.lat],zoom:Math.max(16,map.getZoom()),pitch:57,bearing:isNorth()?0:heading,padding:{top:80,bottom:0,left:0,right:0}});}
 function update(s){
  latest=s;if(disposed||!ready)return;
  if(s.journey?.phase==='navigating'&&lastPhase!=='navigating')following=true;lastPhase=s.journey?.phase;
  if(s.route!==lastRoute){lastRoute=s.route;map.getSource('journey').setData(s.route?.points?.length?{type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:s.route.points.map(([lat,lng])=>[lng,lat])}}]}:empty());}
  const target=s.selected||s.journey?.destination;
  if(target){destination.setLngLat([target.lng,target.lat]);if(!hasDestination){destination.addTo(map);hasDestination=true;}}else if(hasDestination){destination.remove();hasDestination=false;}
  if(s.fix&&s.guidance?.valid!==false){
   if(s.fix.heading!=null&&Number.isFinite(s.fix.heading)&&s.fix.speed>1.2){heading=(s.fix.heading+360)%360;lastFix=s.fix;}
   else if(lastFix){const dx=(s.fix.lng-lastFix.lng)*111320*Math.cos(s.fix.lat*Math.PI/180),dy=(s.fix.lat-lastFix.lat)*111320;if(Math.hypot(dx,dy)>=6){heading=bearing(lastFix,s.fix);lastFix=s.fix;}}
   if(!lastFix)lastFix=s.fix;
   marker.setLngLat([s.fix.lng,s.fix.lat]);if(!hasMarker){marker.addTo(map);hasMarker=true;}ship.style.opacity='1';
  }else ship.style.opacity='.35';
  camera(s);marker.setRotation(heading); // Map-aligned marker subtracts the actual camera bearing itself.
 }
 function orient(){if(!ready)return;if(following)camera(latest);else map.jumpTo({bearing:isNorth()?0:heading,pitch:57});marker.setRotation(heading);}
 map.on('load',()=>{
  if(disposed)return;map.addSource('journey',{type:'geojson',data:empty()});
  for(const [id,width,blur,opacity,color] of [['route-aura',22,12,.5,'#008dff'],['route-stream',10,3,.85,'#00dfff'],['route-core',4,0,1,'#d0ffff']])map.addLayer({id,type:'line',source:'journey',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':color,'line-width':width,'line-blur':blur,'line-opacity':opacity}},'street-names');
  ready=true;container.parentElement.dataset.vectorReady='true';map.resize();if(!tileError)onStatus('Live cosmic road map');if(latest)update(latest);
 });
 map.on('error',()=>{tileError=true;onStatus('Map tiles unavailable · check internet');});
 map.on('sourcedata',e=>{if(e.sourceId==='openmaptiles'&&e.tile&&e.sourceDataType==='content'){tileError=false;if(ready)onStatus('Live cosmic road map');}});
 map.on('webglcontextlost',()=>onStatus('Map graphics interrupted · reopen navigation'));
 map.on('dragstart',()=>following=false);map.on('rotatestart',()=>following=false);
 w.addEventListener('mole-map-orientation',orient);
 return {map,update,recenter(s){following=true;if(s)latest=s;camera(latest);},resize(){map.resize();},dispose(){disposed=true;w.removeEventListener('mole-map-orientation',orient);marker.remove();destination.remove();map.remove();delete container.parentElement.dataset.vectorReady;}};
}
