export function parseCommand(text){
 const normalized=String(text).toLowerCase().replace(/[^a-z ]/g,'').trim();
 return ({'accept delivery':'accept','depart':'depart','arrive':'arrive','complete delivery':'complete','pause':'pause','resume':'resume','stop audio':'mute'})[normalized]||null;
}

