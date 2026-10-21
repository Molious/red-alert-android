// Local-only ElevenLabs voice proof of concept. Never expose this server to the internet.
// Run: node tools/atlas-local-voice-server.mjs
import {createServer} from 'node:http';

const HOST='127.0.0.1';
const PORT=Number(process.env.ATLAS_VOICE_PORT||8787);
const KEY=process.env.ELEVENLABS_API_KEY;
const VOICE_ID='dyLJ4nCukg4AOgAVlUR7';
const FIRST_LINE='ATLAS online. All primary systems operational. Welcome aboard, Captain.';

if(!KEY){console.error('ELEVENLABS_API_KEY is missing from this process environment.');process.exit(1);}
const server=createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'||req.url!=='/atlas-first-line'){res.writeHead(404).end('Not found');return;}
  const abort=new AbortController();
  const timeout=setTimeout(()=>abort.abort(),15000);
  try{
    const upstream=await fetch('https://api.elevenlabs.io/v1/text-to-speech/'+VOICE_ID,{
      method:'POST',
      headers:{'xi-api-key':KEY,'Content-Type':'application/json','Accept':'audio/mpeg'},
      body:JSON.stringify({text:FIRST_LINE,model_id:'eleven_multilingual_v2'}),
      signal:abort.signal
    });
    if(!upstream.ok){console.error('ElevenLabs request failed:',upstream.status);res.writeHead(502).end('Voice provider unavailable');return;}
    const audio=Buffer.from(await upstream.arrayBuffer());
    if(audio.length>2_000_000){res.writeHead(502).end('Audio too large');return;}
    res.writeHead(200,{'Content-Type':'audio/mpeg','Content-Length':audio.length});
    res.end(audio);
  }catch(e){console.error('Voice request error:',e?.name||'unknown');res.writeHead(502).end('Voice request failed');}
  finally{clearTimeout(timeout);}
});
server.listen(PORT,HOST,()=>console.log('ATLAS local voice test ready at http://'+HOST+':'+PORT+'/atlas-first-line'));
