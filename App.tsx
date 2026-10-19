import {useEffect,useRef,useState} from 'react';
import {Pressable,Text,View,StyleSheet} from 'react-native';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import {StatusBar} from 'expo-status-bar';
import {WebView} from 'react-native-webview';
import {useNativeServices} from './src/useNativeServices';
import {nativeBridgeScript} from './src/nativeBridgeScript';
import {navLayoutScript} from './src/navLayoutPatch';
import {BRIDGE_ART,NAV_PLATE_ART,CAPTAIN_ART} from './src/navArt';
import {APP_ORIGIN} from './src/bridgeProtocol';
import offlineHtml from './src/hybridHtml';
// Everything the simulator needs is bundled; the origin is a storage/bridge identity.
const html=offlineHtml.replace('</head>',()=>'<script>'+nativeBridgeScript+'</script><script>window.__moleArt='+JSON.stringify({bridge:BRIDGE_ART,plate:NAV_PLATE_ART,captains:CAPTAIN_ART})+'</script><script>'+navLayoutScript+'</script></head>');
export default function App(){
 const web=useRef<WebView|null>(null);const native=useNativeServices(web);const [error,setError]=useState('');const [boot,setBoot]=useState('Loading game…');const [reloadKey,setReloadKey]=useState(0);const bootTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const clearBootTimer=()=>{if(bootTimer.current)clearTimeout(bootTimer.current);};
 useEffect(()=>{setBoot('Loading game…');bootTimer.current=setTimeout(()=>{setError('Game startup timed out. Tap Retry game. Build 1.0.19 / Live Cockpit Test 20.');setBoot('');},20000);return clearBootTimer;},[reloadKey]);
 const onGameMessage=(event:Parameters<typeof native.onMessage>[0])=>{try{const msg=JSON.parse(event.nativeEvent.data);if(msg.channel==='hybrid-boot-v1'){clearBootTimer();setBoot('');if(msg.type==='error')setError('Game error: '+msg.message);return;}}catch{}native.onMessage(event);};
 return <SafeAreaProvider><SafeAreaView style={s.page} edges={['top','bottom']}><StatusBar style="light"/>
 <View style={s.bar}><Text style={s.text}>MOLE BEYOND · LIVE COCKPIT · 1.0.19</Text><Pressable accessibilityRole="button" accessibilityLabel={native.audioMuted?"Resume audio":"Pause audio"} onPress={native.toggleAudio}><Text style={s.stop}>{native.audioMuted?'RESUME AUDIO':'PAUSE AUDIO'}</Text></Pressable></View>
 {!!boot&&<Text style={s.text}>{boot}</Text>}{!!error&&<View><Text style={s.stop}>{error}</Text><Pressable accessibilityRole="button" onPress={()=>{native.reset();setError('');setReloadKey(k=>k+1);}}><Text style={s.stop}>Retry game</Text></Pressable></View>}{!!native.error&&<Text style={s.stop}>{native.error}</Text>}
 <WebView applicationNameForUserAgent="MoleBeyond/1.0.19 (+https://github.com/Molious/red-alert-android)" key={reloadKey} ref={web} source={{html,baseUrl:APP_ORIGIN+'/'}} originWhitelist={[APP_ORIGIN]} style={s.page} javaScriptEnabled domStorageEnabled geolocationEnabled={false} mixedContentMode="never" setSupportMultipleWindows={false} onMessage={onGameMessage} injectedJavaScriptBeforeContentLoaded={nativeBridgeScript} injectedJavaScript={nativeBridgeScript} onShouldStartLoadWithRequest={r=>r.url===APP_ORIGIN+'/'||r.url==='about:blank'} onError={e=>{clearBootTimer();setBoot('');setError(e.nativeEvent.description);}} onRenderProcessGone={()=>{native.reset();setError('The test view stopped. Close and reopen the app while parked.');}}/>
 </SafeAreaView></SafeAreaProvider>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#05070b'},bar:{padding:12,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},text:{color:'#8ddde2',fontSize:11},stop:{color:'#ffb4bc',padding:8}});

