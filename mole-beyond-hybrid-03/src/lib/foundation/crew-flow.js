import {characterById} from './red-alert/characters.js';

// Screen navigation never replaces a saved mission or resets rewards.
export function createCrewFlow(engine){
 let screen='landing',selected=engine.snapshot().crew;
 return {
  get screen(){return screen;},get selected(){return selected;},
  home(){screen='landing';},
  choose(){selected=engine.snapshot().crew;screen='crew';},
  select(id){
   if(!characterById(id))throw Error('Unknown crew specialist');
   if(engine.snapshot().mission?.status==='en_route')throw Error('Finish the current route before changing crew.');
   selected=id;
  },
  enter(){
   if(!characterById(selected))throw Error('Choose a crew specialist.');
   if(selected!==engine.snapshot().crew)engine.dispatch({type:'crew',id:selected});
   screen='cockpit';
  },
 };
}
