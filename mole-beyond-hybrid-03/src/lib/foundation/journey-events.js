const scenes=[
 {type:'scan',at:.15,character:'SILAS',text:'Captain, a faint signal is crossing our flight path. I can run a passive scan while Wraith keeps us on course.',actions:['scan'],done:'Scan complete. The signal is an abandoned cargo beacon.'},
 {type:'salvage',at:.30,character:'MAX',text:'That beacon has salvage attached. I can bring it aboard remotely. No change to our route.',actions:['collect'],done:'Salvage secured. Ten credits in the ship account. Your route is unchanged.'},
 {type:'contact',at:.50,character:'VEX',text:'Unidentified contact behind us. I am taking the weapons station. Stay on the navigation route.',actions:['acknowledge'],done:'Contact identified as a raider. Crew defence is ready.'},
 {type:'combat',at:.60,character:'VEX',text:'The raider is closing. I can defend or use the ship cloaking array to evade. I will handle it if you are busy.',actions:['defend','evade'],done:'The contact has broken away. We took a small shield hit, but the route is clear. Ten credits awarded.'},
 {type:'repair',at:.75,character:'BASTION',text:'Engineering here. I can restore the shield array while we continue. Nothing needs your attention away from the road.',actions:['repair'],done:'Shield repairs complete. The ship is ready for the next leg.'}
];
export function nextCrewEvent(journey,{progress,nearTurn,guidanceReady,storyPaused}){
 if(!journey||journey.activeEvent||nearTurn||!guidanceReady||storyPaused||!Number.isFinite(progress))return null;
 const scene=scenes.find(s=>progress>=s.at&&!journey.completedEventIds.includes(`${journey.id}:${s.type}`));
 return scene?{...scene,id:`${journey.id}:${scene.type}`}:null;
}
export function resolveCrewEvent(event,action){
 const scene=scenes.find(s=>s.type===event?.type);if(!scene||action!=='delegate'&&!scene.actions.includes(action))throw Error('Unsupported crew action');
 const reward=['combat','salvage'].includes(scene.type)?10:0;
 return {outcome:action==='delegate'?'crew_handled':action,lines:[{id:event.id+':resolved',character:scene.character,text:scene.done,priority:'mission'}],reward,shieldDelta:scene.type==='combat'?-10:scene.type==='repair'?10:0};
}
