# Red Alert — Android

The Android app for **Last Mile Legends — Red Alert**. It's an Expo (React Native) shell that loads the live game at https://vox-star-command.base44.app in a trusted web view and gives it native powers through `window.RedAlertNative`:

| Game feature | What the shell provides |
|---|---|
| Voice commands ("weapons", "lock on", "fire", combat yes/no) | Android speech recognition (`expo-speech-recognition`) |
| SEXTANT's voice | Android text-to-speech (`expo-speech`) |
| Live drive tracking | Native GPS (`expo-location`, best-for-navigation, 1 s updates) |
| Cockpit tilt | Gyroscope/orientation events reach the web page directly; Android needs no permission for them |
| Driving display | The screen stays on while the app is open (`expo-keep-awake`) |

App id: `com.molious.redalert`. Expo owner: `molious`.

## The microphone fix, built in

The Laura's Linguistics APK had a mic that switched on and then straight off. This shell avoids that from the start:

- **Google's speech service is used when the phone has it** (`com.google.android.googlequicksearchbox`, then `com.google.android.as`), instead of the phone's default, which on Samsungs is often Samsung's/Bixby's recogniser that ends the session immediately.
- **If en-AU is refused**, it retries once in the phone's own language.
- **Continuous listening** through short pauses, handing back the first finished phrase, capped at 60 seconds.
- **No speech service at all** gives a clear message telling you to enable the Google app.
- The mic waits for SEXTANT to finish speaking (for example "Lock on?") before it opens, so the question isn't heard as the answer.

## Permissions

Asked for at the moment they're needed: **microphone** (first voice command) and **location while the app is open** (first drive). Background location, storage and overlay permissions are blocked.

## Build

On Windows: follow `START-HERE.txt` and run `BUILD-ANDROID.cmd`.

Manual:

1. `npm install`
2. `npm run typecheck && npm test`
3. `npx eas-cli@24.12.1 login --device` (molious account)
4. `npx eas-cli@24.12.1 init` — first time only, links/creates the Expo project
5. `npx eas-cli@24.12.1 build --platform android --profile preview` — produces an installable APK

`production` builds an Android App Bundle for the Play Store.

## Security

The web view only exposes the native bridge to the main frame of `https://vox-star-command.base44.app` (patched in `plugins/withTrustedWebView.cjs` against the pinned `react-native-webview` 13.16.1). Messages are checked by origin, channel, page document and type (`src/bridgeProtocol.ts`).

## Known limits

- GPS runs while the app is open (screen on). Switching to another app, such as a delivery app, pauses tracking.
- Google sign-in can't run inside a web view (Google blocks it). The game runs as a guest pilot without signing in; email sign-in works.
- The Red Alert web app already contains the matching client code (`src/lib/native/useNativeBridge.js` and the hooks that use it), so nothing on the Base44 side needs changing.
