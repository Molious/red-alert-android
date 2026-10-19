// Safe-driving rating for a journey: starts at 100, drops for sustained speeding and harsh braking or
// acceleration, and slowly recovers over clean kilometres. It pays a clean-flight bonus on arrival.
export function createSafetyMeter({score=100}={}){
 let last=null,overSeconds=0,overCharged=0,harsh=0,lastHarshAt=-Infinity,cleanMeters=0,overStreak=0;
 const clamp=n=>Math.max(0,Math.min(100,Math.round(n)));
 const metres=(a,b)=>{const k=Math.PI/180,x=(b.lng-a.lng)*k*Math.cos((a.lat+b.lat)*k/2),y=(b.lat-a.lat)*k;return Math.hypot(x,y)*6371000;};
 return {
  update(fix,limitKmh){
   const out={score:clamp(score),speeding:false,harsh:false,overStreak:0};
   if(!fix||!Number.isFinite(fix.ts))return out;
   const kmh=Number.isFinite(fix.speed)&&fix.speed>=0?fix.speed*3.6:null;
   if(last){
    const dt=Math.min(10,Math.max(0,(fix.ts-last.ts)/1000));
    if(dt>0){
     let penalised=false;
     if(kmh!==null&&Number.isFinite(limitKmh)&&limitKmh>0&&kmh>limitKmh+4){
      out.speeding=true;overSeconds+=dt;overStreak+=dt;
      const per=kmh>limitKmh+15?4:10;const due=Math.floor(overSeconds/per)-overCharged;if(due>0){score-=due;overCharged+=due;}penalised=true;
     }else overStreak=0;
     if(kmh!==null&&Number.isFinite(last.speed)&&last.speed>=0&&dt>=.5){
      const accel=(fix.speed-last.speed)/dt;
      if((accel<-4||accel>3.5)&&fix.ts-lastHarshAt>10000){harsh++;score-=2;lastHarshAt=fix.ts;out.harsh=true;penalised=true;}
     }
     if(!penalised){cleanMeters+=metres(last,fix);while(cleanMeters>=2000){cleanMeters-=2000;score=Math.min(100,score+1);}}else cleanMeters=0;
    }
   }
   last=fix;out.score=clamp(score);out.overStreak=overStreak;return out;
  },
  snapshot(){return {score:clamp(score),overspeedSeconds:Math.round(overSeconds),harsh};},
 };
}
export function safetyBonus(score){return Math.round(Math.max(0,Math.min(100,score))/5);}
export function parseMaxspeed(value){
 if(typeof value!=='string')return null;const v=value.trim().toLowerCase();
 const zone={'au:urban':50,'au:rural':100,'au:motorway':110,'nz:urban':50,'nz:rural':100,'gb:nsl_single':96,'gb:nsl_dual':112,'gb:motorway':112,'walk':10,'living_street':10};if(zone[v])return zone[v];
 const m=/^(\d{1,3})(\s*mph)?/.exec(v);if(!m)return null;const n=Number(m[1]);if(!n||n>150)return null;return m[2]?Math.round(n*1.609):n;
}
