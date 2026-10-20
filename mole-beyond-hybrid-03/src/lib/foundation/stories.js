// New prototype mission content. Not an import of the website's earlier story simulator.
export const MISSIONS=[
 ['Medical supplies','Morna Station',80,5,'A clinic is running low on sterile packs.'],
 ['Fragile crystal cores','Prism Anchorage',110,6,'A research array needs intact replacement cores.'],
 ['Fresh provisions','Halfway Outpost',70,4,'The outpost kitchens are waiting for their next supply crate.'],
 ['Salvage components','The Churn',95,5,'A mechanic has reserved a pallet of reclaimed parts.'],
 ['Sealed diplomatic pouch','Aurelian Relay',130,7,'An envoy requests a documented chain of custody.'],
 ['Water purification filters','Dustfall Colony',105,6,'A settlement needs new filtration cartridges.'],
 ['Emergency power cells','Beacon Nine',120,6,'A navigation beacon is operating on reserves.'],
 ['Archive fragments','Silent Repository',125,7,'An archivist wants a damaged record recovered.'],
 ['Agricultural seedlings','Verdant Ring',90,5,'A greenhouse team is ready to receive living cargo.'],
 ['Precision tools','Forge Dock',100,6,'An engineer needs calibrated tools for a repair.'],
 ['Relief blankets','Outer Refuge',85,4,'A relief coordinator has requested warm bedding.'],
 ['Long-range sensor module','Horizon Watch',140,8,'A remote watch station needs its scanners restored.'],
].map(([title,destination,reward,distanceKm,brief],i)=>({catalogId:i,title,destination,reward,distanceKm,brief}));
export function makeOffer(index,id){const m=MISSIONS[((index%MISSIONS.length)+MISSIONS.length)%MISSIONS.length];return {...m,id};}
export function storyLine(m,phase,path='standard'){
 const detail=MISSIONS[m?.catalogId]?.brief||'A delivery is ready for dispatch.';
 if(phase==='offer')return `${detail} Destination: ${m.destination}. Choose your approach before departure.`;
 if(phase==='choose')return {humanitarian:'We will prioritise the people receiving this cargo.',discreet:'We will respect the recipient’s privacy and keep the manifest sealed.',standard:'Standard manifest and delivery procedure confirmed.'}[path];
 if(phase==='accept')return `Cargo accepted: ${m.title}. Course prepared for ${m.destination}.`;
 if(phase==='depart')return {humanitarian:`The recipients are counting on us. ${m.destination} is our next stop.`,discreet:`Manifest secured. Keeping this delivery private until ${m.destination}.`,standard:`Cargo secured. Holding course for ${m.destination}.`}[path];
 if(phase==='arrive')return `Docking confirmed at ${m.destination}. Ready to transfer ${m.title.toLowerCase()}.`;
 if(phase==='complete')return `${m.title} delivered. ${m.reward} credits recorded. ${path==='humanitarian'?'The local coordinator sends their thanks.':path==='discreet'?'The recipient confirms the seal was intact.':'The manifest is signed and filed.'}`;
 return '';
}

