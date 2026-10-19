import {parseRoadRoute} from './navigation-core.js';
const coordinates=p=>p&&Number.isFinite(p.lat)&&Math.abs(p.lat)<=90&&Number.isFinite(p.lng)&&Math.abs(p.lng)<=180;
export function createRoadServices({fetch:fetcher=globalThis.fetch,native=globalThis.RedAlertNative}={}){
 const getNative=()=>typeof native==='function'?native():native||globalThis.RedAlertNative;
 return {
  search(text,signal){return new Promise((resolve,reject)=>{
   const bridge=getNative();text=String(text).trim();if(text.length<3||text.length>200){reject(Error('Enter an address of 3–200 characters'));return;}
   if(!bridge?.searchAddress){reject(Error('Address search requires the updated Android app.'));return;}
   if(signal?.aborted){reject(Error('Search cancelled'));return;}
   let settled=false,id;const finish=(err,result)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);if(err){if(id!==undefined)bridge.cancelSearch?.(id);reject(err);}else resolve(result);};const abort=()=>finish(Error('Search cancelled'));
   const timer=setTimeout(()=>finish(Error('Address lookup timed out. Try again.')),15000);signal?.addEventListener('abort',abort,{once:true});
   try{id=bridge.searchAddress(text,(results,error)=>{if(error){finish(Error(error));return;}const found=(Array.isArray(results)?results:[]).filter(coordinates).slice(0,5).map(p=>({...p,label:typeof p.label==='string'&&p.label.trim()?p.label.slice(0,200):text+' · '+p.lat.toFixed(4)+', '+p.lng.toFixed(4)}));if(!found.length)finish(Error('No address found. Include suburb and country.'));else finish(null,found);});}catch(e){finish(e);}
  });},
  async route(start,destination,signal){
   if(!coordinates(start)||!coordinates(destination))throw Error('Invalid route coordinates');
   const controller=new AbortController(),abort=()=>controller.abort();if(signal?.aborted)throw Error('Route cancelled');signal?.addEventListener('abort',abort,{once:true});const timer=setTimeout(abort,15000);
   try{const response=await fetcher(`https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true`,{signal:controller.signal});if(!response.ok)throw Error('Road route service unavailable');const r=parseRoadRoute(await response.json());if(!r.steps.length||r.steps.some(s=>!s.located))throw Error('Road route has no usable directions');return r;}
   finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  }
 };
}
