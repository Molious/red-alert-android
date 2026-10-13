import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useKeepAwake } from 'expo-keep-awake';
import { WebView } from 'react-native-webview';
import { useNativeServices } from './src/useNativeServices';
import { nativeBridgeScript } from './src/nativeBridgeScript';
import { APP_ORIGIN, shouldResetForNavigation } from './src/bridgeProtocol';

// Red Alert's Android shell: the live game at vox-star-command.base44.app in a trusted web view, with
// native voice commands, SEXTANT's voice and GPS provided through window.RedAlertNative. The screen stays
// on while the app is open, because it is a driving game.
export default function App() {
  useKeepAwake();
  const web = useRef<WebView | null>(null);
  const native = useNativeServices(web);
  const [loadError, setLoadError] = useState('');
  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.page} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        {!!loadError && (
          <View style={s.bar}>
            <Text style={s.error}>{loadError}</Text>
            <Pressable onPress={() => { setLoadError(''); web.current?.reload(); }} hitSlop={12}>
              <Text style={s.label}>RETRY</Text>
            </Pressable>
          </View>
        )}
        {!!native.error && <Text style={s.error}>{native.error}</Text>}
        <WebView
          ref={web}
          source={{ uri: APP_ORIGIN }}
          style={s.web}
          javaScriptEnabled
          domStorageEnabled
          geolocationEnabled
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          mixedContentMode="never"
          setSupportMultipleWindows={false}
          overScrollMode="never"
          injectedJavaScriptBeforeContentLoaded={nativeBridgeScript}
          injectedJavaScript={nativeBridgeScript}
          onMessage={native.onMessage}
          onLoadStart={() => setLoadError('')}
          onNavigationStateChange={(nav) => { if (shouldResetForNavigation(nav.url)) native.reset(); }}
          onError={(e) => setLoadError(e.nativeEvent.description || 'Could not reach Red Alert. Check your connection.')}
          onHttpError={(e) => { if (e.nativeEvent.url?.startsWith(APP_ORIGIN)) setLoadError(`Connection returned ${e.nativeEvent.statusCode}.`); }}
          onRenderProcessGone={() => { native.reset(); setLoadError('The game view stopped. Tap Retry to reopen it.'); }}
          onShouldStartLoadWithRequest={(r) => r.url.startsWith('https://') || r.url === 'about:blank'}
        />
        {native.phase === 'listening' && (
          <Pressable style={s.listening} onPress={() => native.cancelVoice()}>
            <Text style={s.label}>LISTENING · TAP TO CANCEL</Text>
          </Pressable>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#05070b' },
  web: { flex: 1, backgroundColor: '#05070b' },
  bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 8, gap: 12 },
  label: { color: '#7ee8f6', fontSize: 12, letterSpacing: 2 },
  error: { color: '#ffb4bc', padding: 8, flexShrink: 1 },
  listening: { minHeight: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a0508' },
});
