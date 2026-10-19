// Injected into the Red Alert page. It defines `window.RedAlertNative` (version 1), the API the web app
// already looks for in src/lib/native/useNativeBridge.js:
//
//   listenOnce(done(text|null, error|null)) -> id     one spoken command, then the mic closes
//   cancelListen(id)
//   speak(text, {pitch, rate}?), hush()                SEXTANT's voice through Android text-to-speech
//   speakRequest(text, done(outcome), {pitch, rate}?) -> id, cancelSpeech(id)
//   prepareSession(done), cancelPreparation(id), setAudioMuted(bool), setJourneyActive(bool)
//   searchAddress(text, done(results, error)) -> id, cancelSearch(id)
//   watchPosition(onFix(fix), onError(message)) -> id  native GPS: { lat, lng, accuracy, speed, heading, ts }
//   clearWatch(id)
//   addEventListener('speak' | 'hush', fn), removeEventListener(...)
//
// It only exists on the trusted origin, inside this app's own web view.
export const nativeBridgeScript = `
(function () {
  if (location.origin !== 'https://vox-star-command.base44.app' || !window.ReactNativeWebView || typeof window.ReactNativeWebView.postMessage !== 'function') return;
  if (window.RedAlertNative) { window.RedAlertNative.announce(); return; }
  var channel = 'red-alert-native-v1';
  var doc = String(Date.now()) + '-' + Math.random().toString(36).slice(2);
  var serial = 0, listens = {}, searches = {}, speeches = {}, currentSpeech = 0, journeyActive = false, audioMuted = false, preparations = {}, watches = {}, events = { speak: [], hush: [] };
  function post(type, id, extra) {
    window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({ channel: channel, doc: doc, type: type, id: id }, extra || {})));
  }
  // Per-pilot voice: only finite numbers are forwarded; the shell checks the 0.5-2 range.
  function voice(text, opts) {
    var extra = { text: String(text).slice(0, 2000) };
    if (opts && typeof opts.pitch === 'number') extra.pitch = opts.pitch;
    if (opts && typeof opts.rate === 'number') extra.rate = opts.rate;
    if (opts && typeof opts.character === 'string' && /^[A-Z]{2,12}$/.test(opts.character)) extra.character = opts.character;
    return extra;
  }
  function emit(name) {
    (events[name] || []).slice().forEach(function (fn) { try { fn(); } catch (e) {} });
  }
  window.RedAlertNative = {
    version: 1,
    prepareSession: function(done){var id=++serial;preparations[id]=done;post('session.prepare',id);return id;},
    cancelPreparation: function(id){delete preparations[id];post('session.cancel',id);},
    setAudioMuted: function(value){value=!!value;if(audioMuted===value)return;audioMuted=value;post('audio.state',0,{muted:value});},
    announce: function () { post('bridge.ready', 0); window.dispatchEvent(new CustomEvent('red-alert-native-ready')); },
    listenOnce: function (done) { var id = ++serial; listens[id] = done; post('voice.listen', id); return id; },
    cancelListen: function (id) { delete listens[id]; post('voice.cancel', id); },
    speak: function (text, opts) { emit('speak'); currentSpeech = ++serial; post('speech.say', currentSpeech, voice(text, opts)); },
    speakRequest: function (text, done, opts) { var id=++serial; speeches[id]=done; currentSpeech=id; emit('speak'); post('speech.say',id,voice(text,opts)); return id; },
    cancelSpeech: function (id) { var done=speeches[id]; delete speeches[id]; post('speech.cancel',id); if(currentSpeech===id){currentSpeech=0;emit('hush');} if(done)done('cancelled'); },
    hush: function () { post('speech.cancel', 0); emit('hush'); },
    searchAddress: function (text, done) { var id = ++serial; searches[id] = done; post('geo.search', id, {text: String(text).slice(0,200)}); return id; },
    cancelSearch: function (id) {delete searches[id];},
    setJourneyActive: function (value) {value=!!value;if(journeyActive===value)return;journeyActive=value;post('journey.active',0,{active:value});},
    watchPosition: function (onFix, onError) { var id = ++serial; watches[id] = { fix: onFix, error: onError }; post('geo.watch', id); return id; },
    clearWatch: function (id) { delete watches[id]; post('geo.clear', id); },
    addEventListener: function (name, fn) { if (events[name] && typeof fn === 'function') events[name].push(fn); },
    removeEventListener: function (name, fn) { if (events[name]) events[name] = events[name].filter(function (f) { return f !== fn; }); },
    receive: function (m) {
      if (!m || m.channel !== channel || m.doc !== doc) return;
      if(m.type==='session.ready'){var ready=preparations[m.id];delete preparations[m.id];if(ready)ready({speechReady:!!m.speechReady,locationGranted:!!m.locationGranted,microphoneGranted:!!m.microphoneGranted});}
      else if (m.type === 'geo.results') { var search = searches[m.id]; if(search) {delete searches[m.id];search(m.results || [],m.error || null);} } else if (m.type === 'voice.started') {
        window.dispatchEvent(new Event('test-mic-ready'));
      } else if (m.type === 'voice.result') {
        var done = listens[m.id];
        if (done) { delete listens[m.id]; done(m.text || null, m.error || null); }
      } else if (m.type === 'speech.end') {
        var spoken=speeches[m.id];delete speeches[m.id];if(spoken)spoken(m.outcome || 'played');
        if(currentSpeech===m.id){currentSpeech=0;emit('hush');}
      } else if (m.type === 'geo.fix') {
        var w = watches[m.id];
        if (w && m.fix) w.fix(m.fix);
      } else if (m.type === 'geo.error') {
        var we = watches[m.id];
        if (we) { delete watches[m.id]; if (we.error) we.error(m.error || 'Location unavailable.'); }
      }
    }
  };
  window.RedAlertNative.announce();
})(); true;
`;

