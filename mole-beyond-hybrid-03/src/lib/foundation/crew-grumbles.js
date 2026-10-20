// When the Captain doesn't answer, the crew make the call themselves and say so in character (#4).
// Short lines: they're spoken while driving, ahead of the outcome itself.
export const GRUMBLES={
 WRAITH:['No answer from the chair. I will take it from here.','Quiet, Captain? Then I decide.'],
 VEX:['Nobody answering? Fine. My way, then.','I asked nicely. Now I am doing it.'],
 SILAS:['No response. Proceeding on my own judgement.','I will log that the Captain was busy.'],
 BASTION:['Quiet up there, is it? Right. I will sort it.','Nobody tells me anything. Handling it.'],
 MAX:['You did not say no, Captain. I will take that as a yes.','Silence means yes where I grew up.'],
 CHET:['No reply, Captain. Acting on your behalf.','I will handle this one. Eyes on the road.'],
};
export function grumble(character,seed=0){const lines=GRUMBLES[character]||GRUMBLES.CHET;return lines[Math.abs(Math.trunc(seed))%lines.length];}
