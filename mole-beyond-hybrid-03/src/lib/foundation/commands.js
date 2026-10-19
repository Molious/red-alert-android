export function parseCommand(text){
 const normalized=String(text).toLowerCase().replace(/[^a-z ]/g,'').trim();
 return ({'accept delivery':'accept','depart':'depart','arrive':'arrive','complete delivery':'complete','pause':'pause','resume':'resume','stop audio':'mute'})[normalized]||null;
}

export function parseJourneyCommand(text){
 const raw=String(text).trim();const destination=raw.match(/^destination\s+(.+)$/i);if(destination&&!/^(one|two|three|four|five|[1-5])$/i.test(destination[1]))return {type:'search',text:destination[1].trim()};
 const match=raw.toLowerCase().replace(/[.!?]+$/,'').replace(/\s+/g,' ');
 const type={'destination':'destination','acknowledge contact':'acknowledge','let crew handle it':'delegate','confirm destination':'confirm','launch':'launch','repeat direction':'repeat','recenter':'recenter','scan':'scan','collect salvage':'collect','defend':'defend','evade':'evade','repair':'repair','pause story':'pause-story','resume story':'resume-story','save':'save','cancel journey':'cancel','main menu':'home','resume navigation':'resume','retry route':'retry','mute':'mute','unmute':'unmute','accept':'accept','accept deal':'accept','decline':'decline','decline deal':'decline','accept contract':'accept-contract','pause audio':'mute','resume audio':'unmute','enable voice':'unmute'}[match];
 const choice=match.match(/^(?:option|destination) (one|two|three|four|five|[1-5])$/);if(choice)return {type:'select',index:({'one':0,'two':1,'three':2,'four':3,'five':4}[choice[1]]??Number(choice[1])-1)};
 return type?{type}:null;
}
