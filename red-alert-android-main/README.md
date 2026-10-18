# Mole Beyond — Android test launcher 04

Forked from the supplied Red Alert Android shell, with the Hybrid 03 simulator bundled directly into the app. The original live-site launcher is retained as App.live-red-alert.tsx for reference, but is not the app entry point.

See START-HERE.txt. Run BUILD-ANDROID.cmd on Windows to authenticate with Expo and submit an APK build. No Expo session was available in the creation environment; a cloud build request stopped at the account requirement. No APK has been compiled, signed or phone-tested yet.

## Implemented
- Local cockpit artwork, five portraits, mission logic and manual simulator.
- One-button automatic simulator: microphone readiness gates starting; one mission progresses automatically.
- Exact spoken stop test command through the existing native speech bridge, local bounded reports, stop on background or microphone failure, and manual stop fallback.
- Separate Android package com.molious.molebeyondtest; no automatic boot startup.
- 24 simulator tests and 8 launcher/bridge/asset checks pass; TypeScript passes and Expo Android prebuild succeeds.

## Limits
This is a parked simulator, not a real-driving test mode; there is no motion-based parked enforcement. Continuous stop recognition must be validated on the actual phone and is not a guaranteed emergency control. Speech services can require networking. App restart preserves mission progress and reports but never automatically resumes a test. Reports contain event types and timestamps, not transcripts or GPS. Uninstalling/clearing app data removes local state. The legacy manual browser speech controls may not work inside Android WebView; the new test harness uses native recognition. Native story/character voice queue integration, real GPS, road tests, cloud saves and generated AI voices remain outside this build.

## Rebuild
Keep the two folders beside one another. In this folder: npm install; npm run bundle:hybrid; npm run typecheck; npm test. In ../mole-beyond-hybrid-03: npm test. Then use EAS preview profile after login/init. SDK dependencies are pinned in package-lock.json. The CLI regenerates Android using the checked configuration on clean cloud builds.

