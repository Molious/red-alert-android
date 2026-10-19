import test from 'node:test';import assert from 'node:assert/strict';
import {assignCrewVoices,crewVoiceFor,voiceGender,CREW_PROFILES} from '../src/crewVoices.ts';
import {parseBridgeMessage,APP_ORIGIN,CHANNEL} from '../src/bridgeProtocol.ts';
const google=['en-au-x-aua-local','en-au-x-aub-local','en-au-x-auc-local','en-au-x-aud-local','en-gb-x-gba-local','en-gb-x-gbb-local','en-gb-x-gbd-local','en-gb-x-rjs-local','en-us-x-iol-local','en-us-x-iom-local','en-us-x-tpf-local','en-us-x-sfg-network','en-in-x-end-local','de-de-x-deb-local']
 .map(id=>({identifier:id,language:id.slice(0,5).replace(/-(..)$/,(m,c)=>'-'+c.toUpperCase()),quality:'Default'}));
test('each crew member gets a distinct English voice of the right gender when the phone has enough',()=>{
 const m=assignCrewVoices(google);const ids=Object.values(m).map(v=>v.voice);
 assert.equal(new Set(ids).size,Object.keys(CREW_PROFILES).length,'all distinct');
 for(const [who,p] of Object.entries(CREW_PROFILES)){const v=google.find(g=>g.identifier===m[who].voice);assert.ok(v,who);assert.equal(voiceGender(v),p.gender,who+' '+v.identifier);assert.equal(m[who].pitch,p.pitch,who);assert.match(v.language,/^en/);}
 assert.equal(m.WRAITH.voice.slice(0,5),'en-au','navigator keeps an Australian voice');
 assert.ok(!Object.values(m).some(v=>/network/.test(v.voice)),'prefers offline voices');
});
test('few voices: reuse voices but keep per-character pitch and speed; no voices still speaks',()=>{
 const m=assignCrewVoices([{identifier:'en-us-x-iol-local',language:'en-US'}]);
 assert.equal(m.VEX.voice,'en-us-x-iol-local');assert.notEqual(m.VEX.pitch,m.MAX.pitch);assert.equal(crewVoiceFor(m,'MAGS').pitch,m.MAX.pitch);
 const none=crewVoiceFor(assignCrewVoices([]),'VEX');assert.equal(none.voice,undefined);assert.ok(none.pitch>0);
 assert.equal(crewVoiceFor(m,'UNKNOWN').voice,m.WRAITH.voice);
});
test('bridge accepts a speaker name and rejects anything else',()=>{
 const msg=x=>JSON.stringify({channel:CHANNEL,doc:'doc-1234',id:1,type:'speech.say',text:'Hello',...x});
 assert.equal(parseBridgeMessage(msg({character:'VEX'}),APP_ORIGIN+'/').character,'VEX');
 assert.equal(parseBridgeMessage(msg({character:'<script>'}),APP_ORIGIN+'/'),null);
});
test('when the phone cannot say a voice is male or female, pitch carries the character',()=>{
 const m=assignCrewVoices([{identifier:'en-us-voice-a',language:'en-US'},{identifier:'en-us-voice-b',language:'en-US'}]);
 assert.ok(m.VEX.pitch<=0.72,'male characters pitched down');assert.ok(m.CHET.pitch>=1.2,'female characters pitched up');
});
