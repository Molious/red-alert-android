TEST 14 / Android 1.0.12 (versionCode 13)
See ../START-HERE-TEST-14.txt for build steps, controls and limitations.

# Mole Beyond — Live Cockpit Test 13

Version 1.0.11 / Android versionCode 12. The cockpit is the main screen after character selection. Its windscreen contains real road tiles and a GPS route. Destination confirmation, launch, directions, crew events and saves share one live journey controller. The old simulator remains isolated in legacy tests and is absent from normal play.

Read ../START-HERE-TEST-13.txt. Keep this folder beside mole-beyond-hybrid-03, then run BUILD-ANDROID.cmd on Windows. It installs native/dev dependencies, rebuilds the offline game document, runs checks and submits an Expo preview APK after your login. The source ZIP is not an APK; no compiled/signed APK or phone test was produced in this workspace.

Voice output is enabled by default. The navigator prompts for a real destination. Confirm a resolved address and map marker, then launch while parked. Launch requires three fresh, accurate fixes with a known low GPS speed. If speed is unavailable, launch remains disabled; there is no simulated-location fallback. The short animated-art launch returns to the cockpit automatically and closes if motion begins.

Spoken directions, route recalculation and arrival run from foreground GPS fixes. Directions interrupt crew dialogue. Scanning, salvage, contact, combat and repair scenes use validated route progress, with saved unique outcomes. Crew handles moving encounters; no real detour or penalty for ignoring a game prompt. The fictional ship's damage is unrelated to the real vehicle.

Voice input is one command per visible listening request. Supported phrases include destination [address], option one, confirm destination, launch, repeat direction, recenter, scan, collect salvage, acknowledge contact, defend, evade, repair, let crew handle it, pause story, resume story, save, cancel journey, resume navigation, retry route, mute and unmute. Destination selection can also use the dashboard. Android recognition may use its installed online speech service; recordings are not saved by this app.

This prototype is foreground-only. Leaving the app stops location, microphone and speech; return and tap Resume navigation to reacquire GPS and route. Screen-off/background directions, traffic, hazards, speed limits, offline road tiles and generated custom AI voices are not implemented. Current prototype services are OpenStreetMap tiles, public OSRM routing and device geocoding; availability and actual maneuvers still require phone/provider testing. Navigation speech is device text-to-speech.

Character, credit ledger, journey destination and event outcomes save locally. Existing saves migrate without inventing current GPS position. Route geometry is reacquired after reopening. Uninstalling or clearing app data may delete progress; update with the same package and signing key.

Validation: 72 web tests, 18 native/packaged tests, TypeScript and embedded-document budget checks. Chromium layout checks at 412x800 and 915x412 use synthetic tiles and GPS. They are not evidence of real-device road guidance quality.
