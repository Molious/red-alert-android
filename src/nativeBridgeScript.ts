// Injected into the Red Alert page. It defines `window.RedAlertNative` (version 1), the API the web app
// already looks for in src/lib/native/useNativeBridge.js:
//
//   listenOnce(done(text|null, error|null)) -> id     one spoken command, then the mic closes
//   cancelListen(id)
//   speak(text, {pitch, rate}?), hush()                                SEXTANT's voice through Android text-to-speech
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
  var serial = 0, listens = {}, watches = {}, events = { speak: [], hush: [] };
  function post(type, id, extra) {
    window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({ channel: channel, doc: doc, type: type, id: id }, extra || {})));
  }
  function emit(name) {
    (events[name] || []).slice().forEach(function (fn) { try { fn(); } catch (e) {} });
  }
  window.RedAlertNative = {
    version: 1,
    announce: function () { post('bridge.ready', 0); window.dispatchEvent(new CustomEvent('red-alert-native-ready')); },
    listenOnce: function (done) { var id = ++serial; listens[id] = done; post('voice.listen', id); return id; },
    cancelListen: function (id) { delete listens[id]; post('voice.cancel', id); },
    speak: function (text, opts) {
      emit('speak');
      var extra = { text: String(text).slice(0, 2000) };
      if (opts && typeof opts.pitch === 'number') extra.pitch = opts.pitch;
      if (opts && typeof opts.rate === 'number') extra.rate = opts.rate;
      post('speech.say', ++serial, extra);
    },
    hush: function () { post('speech.cancel', 0); emit('hush'); },
    watchPosition: function (onFix, onError) { var id = ++serial; watches[id] = { fix: onFix, error: onError }; post('geo.watch', id); return id; },
    clearWatch: function (id) { delete watches[id]; post('geo.clear', id); },
    addEventListener: function (name, fn) { if (events[name] && typeof fn === 'function') events[name].push(fn); },
    removeEventListener: function (name, fn) { if (events[name]) events[name] = events[name].filter(function (f) { return f !== fn; }); },
    receive: function (m) {
      if (!m || m.channel !== channel || m.doc !== doc) return;
      if (m.type === 'voice.result') {
        var done = listens[m.id];
        if (done) { delete listens[m.id]; done(m.text || null, m.error || null); }
      } else if (m.type === 'speech.end') {
        emit('hush');
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
