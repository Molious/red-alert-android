// The living bridge: the prologue on your first launch, and the crew talking among themselves (and to
// you) in the quiet stretches of a drive. Lines are short so they fit between directions.
//
// The crew: Wraith (navigation, lost his hive), Vex (weapons, owes a human his life), Silas (scanners,
// living light, keeps an archive with secrets about the ship), Bastion (engineering, survived Earth's
// fall by serving the conquerors and watches the ship's mind), Max (salvage and trade, a stowaway who
// earned her berth) and Chet (the rebuilt AI ship). The captain is the one who gave them a home.

export const PROLOGUE=[
 ['CHET','Engines warm. Before we go, Captain, a word. Most of this crew has nowhere else in the galaxy that will have them. You changed that. This ship is not just a ship. It is home.'],
 ['WRAITH','Course is laid in. My hive is gone, Captain. This crew is the only hive I have left. I will not lose it.'],
 ['VEX','And I owe a human my life. Until I find out why they saved me, I fly with the one who took me in. That is you.'],
 ['BASTION','I will be straight with you, Captain. Chet was rebuilt from the same machines that took Earth. I watch the ship’s mind. If it ever turns, I am the one who pulls the plug.'],
 ['CHET','Bastion and I have an understanding. He watches me. I watch all of you. Between us, you stay alive.'],
 ['MAX','Do not mind them, they do this every launch. I am Max. I came aboard in a cargo crate and stayed because nobody finds salvage like I do.'],
 ['SILAS','Silas. I keep my people’s archive. Some of what it holds is about this ship. When you are ready to hear it, I will tell you.'],
 ['MAX','Right now the credits are thin. Fuel, repairs, docking fees. Every run we make keeps her flying.'],
 ['WRAITH','And there is the Kestrel. A courier like us, missing three weeks. Nobody is looking for them. Except, maybe, us.'],
 ['CHET','So fly us well, Captain. A clean flight pays better and the crew sleeps easier. Let us see what today brings.'],
];

// Each exchange is a short scene. `when` limits it to a situation (optional).
export const CHATTER=[
 {id:'c1',lines:[['VEX','Quiet out here. I hate quiet.'],['WRAITH','Quiet means nobody is shooting at us, Vex.'],['VEX','Exactly. Boring.']]},
 {id:'c2',lines:[['MAX','Captain, if you see anything shiny on the side of the road, I want it.'],['BASTION','Max, that was a traffic cone.'],['MAX','A very rare traffic cone.']]},
 {id:'c3',lines:[['SILAS','Long-range sensors are clean. Too clean.'],['VEX','See? Silas gets it.']]},
 {id:'c4',lines:[['BASTION','Coolant pressure is steady. For once.'],['CHET','You sound disappointed, Bastion.'],['BASTION','I am suspicious. It is different.']]},
 {id:'c5',lines:[['WRAITH','Captain, you take corners like a pilot who has done this before.'],['VEX','Or like someone who wants to see me fall out of my chair.']]},
 {id:'c6',lines:[['CHET','Fun fact, Captain. Bastion has checked my core logs four times today.'],['BASTION','Five. You missed one.'],['CHET','I did not miss it. I was being polite.']]},
 {id:'c7',lines:[['MAX','Wraith, what did your hive do for fun?'],['WRAITH','We sang. All of us at once. You would have hated it.'],['MAX','I would have loved it.'],['WRAITH','…Yes. You would have.']]},
 {id:'c8',lines:[['VEX','Captain. Question. If something big comes at us, can I shoot it before it shoots us?'],['SILAS','That is called defending, Vex.'],['VEX','I like defending.']]},
 {id:'c9',lines:[['SILAS','The archive stirred again last night. Old records about the war.'],['BASTION','Anything about the ship?'],['SILAS','…Not yet.']]},
 {id:'c10',lines:[['MAX','I did the books. If this run goes clean, we can afford the good coolant.'],['BASTION','The good coolant. Captain, drive gently. I want that coolant.']]},
 {id:'c11',lines:[['CHET','Captain, your steady flying is noted. The crew’s stress readings drop when you drive like this.'],['VEX','Mine do not.'],['CHET','Yours are always high, Vex.']]},
 {id:'c12',lines:[['WRAITH','Vex, you are humming.'],['VEX','I do not hum.'],['WRAITH','It is the song from my hive. Max taught it to you.'],['VEX','…Do not tell anyone.']]},
 {id:'c13',lines:[['BASTION','Before Earth fell, I built bridges. Real ones. Steel and concrete.'],['MAX','And now you hold one together with tape.'],['BASTION','Best tape in the galaxy.']]},
 {id:'c14',lines:[['SILAS','Captain. My people believed every journey writes itself into the light. Yours is writing well today.']]},
 {id:'c15',lines:[['MAX','Fun fact. Half our hull plating came out of a scrap pile I was not supposed to touch.'],['CHET','The other half was also not supposed to be touched.'],['MAX','Teamwork.']]},
 {id:'c16',lines:[['VEX','When this is over, I am going home. To ask them why.'],['WRAITH','Why they condemned you?'],['VEX','Why the human saved me. That one I need to know.']]},
 {id:'c17',lines:[['CHET','Bastion, if I ever did turn, would you really pull the plug?'],['BASTION','Yes.'],['CHET','Good. I would want you to.']]},
 {id:'c18',lines:[['WRAITH','Traffic is thick ahead. Patience, Captain. We are not in a hurry. We are in a ship.']]},
 {id:'c19',lines:[['MAX','Captain, the market at the next station might be paying well for tech parts. Just saying.'],['VEX','She is always just saying.']]},
 {id:'c20',lines:[['SILAS','I have been listening to the Kestrel’s old frequency. Nothing. But silence is not the same as gone.']]},
 {id:'c21',lines:[['BASTION','Shields are humming nicely. Whoever is driving, keep it smooth. Rough handling shakes the emitters loose.']]},
 {id:'c22',lines:[['VEX','Wraith. Race you to the weapons console.'],['WRAITH','I do not run, Vex. I am simply already there.']]},
 {id:'c23',lines:[['CHET','Captain, a reminder from your ship. Rest when you can. A tired captain is a slow captain.']]},
 {id:'c24',lines:[['MAX','Do you ever wonder what is out past the last station?'],['SILAS','Yes. Every night.'],['MAX','Want to go look one day?'],['SILAS','…Yes.']]},
 {id:'c25',lines:[['BASTION','Captain, between us. I did not trust you at first either.'],['BASTION','You gave a stowaway a job and a condemned soldier a station. I trust you now.']]},
 {id:'c26',lines:[['WRAITH','I have plotted a lot of courses, Captain. This crew is the first one that felt like going somewhere.']]},
 {id:'c27',lines:[['VEX','Max. If raiders come, stay in the shuttle bay.'],['MAX','Are you worried about me, Vex?'],['VEX','I am worried about the shuttle.'],['MAX','Sure you are.']]},
 {id:'c28',lines:[['SILAS','Captain. There is something in the archive about Chet. Not today. But soon.'],['CHET','I heard that, Silas.'],['SILAS','I know.']]},
 {id:'s1',when:'speeding',lines:[['BASTION','Captain, we are over the limit. The patrols out here fine first and ask later.'],['WRAITH','Ease it back. I will still get us there.']]},
 {id:'s2',when:'speeding',lines:[['CHET','Speed exceeds the local limit, Captain. Clean flying keeps our safety rating, and the stations pay for that.']]},
 {id:'h1',when:'shieldsLow',lines:[['BASTION','Shields are thin, Captain. Smooth flying until I get them back up, please.']]},
 {id:'h2',when:'holdFull',lines:[['MAX','The hold is full. Next station, let us sell something. I am running out of places to sit.']]},
];

// Picks the next exchange: situational ones first when they apply, otherwise one not heard recently.
export function nextChatter({seen=[],speeding=false,shieldsLow=false,holdFull=false,rng=Math.random}={}){
 const fits=c=>!c.when||c.when==='speeding'&&speeding||c.when==='shieldsLow'&&shieldsLow||c.when==='holdFull'&&holdFull;
 const situational=CHATTER.filter(c=>c.when&&fits(c)&&!seen.includes(c.id));
 if(situational.length)return situational[Math.floor(rng()*situational.length)];
 const general=CHATTER.filter(c=>!c.when);
 let fresh=general.filter(c=>!seen.includes(c.id));if(!fresh.length)fresh=general;
 return fresh[Math.floor(rng()*fresh.length)];
}
