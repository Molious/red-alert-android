# Mole Beyond Android 1.0.13

This build uses the latest `Molious/red-alert-android` main commit available during preparation: `d923304436126536b551dfb25460a01d15d7200b`.

App identity: `com.molious.molebeyondtest`; version `1.0.13`; Android versionCode `14`.

The packaged game `src/hybridHtml.ts` is preserved byte-for-byte from that commit. It contains the completed live cockpit, all five seated crew layers, all 24 selectable captain portraits, destination lookup, foreground GPS/navigation, audio and microphone integration. No older simulator bundle or source ZIP was substituted.

The latest main branch only contains a placeholder file named `mole-beyond-hybrid-03`, rather than the editable web source. Its `bundle:hybrid` script expects a sibling source directory that is not present in this checkout. **Do not run that script against an older branch to prepare this release:** doing so would replace the latest game and its functionality. The existing bundled document is the input to the APK build.

Release changes are limited to the version metadata and native version labels. The packaged game is unchanged. One existing cockpit test fixture was updated from three to four stationary GPS fixes to match the current app's launch gate, with an assertion that three fixes still leave launch disabled. New asset checks exercise all 24 captain selections, require distinct embedded WebP images, verify all five seated crew layers and pin the bundled game checksum.

## Checks

Run from the repository root with Node.js 24:

```sh
npm ci
npm run typecheck
npm test
CI=1 EXPO_NO_TELEMETRY=1 npx --no-install expo prebuild --platform android --no-install
```

30 tests and TypeScript passed during release preparation. Native compilation/signature/artifact results are recorded in the accompanying APK verification report when the APK is available. Automated cockpit-flow checks use synthetic GPS/routes and do not establish physical-device speech, navigation or layout quality.

## Native build

Validated toolchain preparation: JDK 21 for Gradle plus JDK 17 for the React Native plugin toolchain, Android platform 36, Build Tools 36.0.0, NDK 27.1.12297006, CMake 3.22.1 and the project's Gradle 9.3.1 wrapper.

```sh
cd android
./gradlew assembleRelease --no-daemon --max-workers=2 -PreactNativeArchitectures=arm64-v8a
```

If Java 17 is installed in a custom location, add `org.gradle.java.installations.paths=/path/to/jdk17` to your Gradle user-home `gradle.properties`; keep `JAVA_HOME` pointing at JDK 21 for the build launcher.

On Windows use `gradlew.bat`. Set `ANDROID_HOME` to the installed SDK directory and use the project's pinned JDK-compatible Gradle wrapper. The existing Expo-generated release configuration signs with its local debug/test keystore. This is an installable ARM64 test release, not a production-signed Play Store release.

The APK output is `android/app/build/outputs/apk/release/app-release.apk`.

## Installation and existing data

Install the downloaded APK from Android's file manager, or with Android platform-tools:

```sh
adb install -r MoleBeyond-1.0.13-arm64.apk
adb shell dumpsys package com.molious.molebeyondtest
```

Confirm `versionName=1.0.13` and `versionCode=14`, and the native top-bar label. A matching signing key is required to update an existing installation in place. An existing EAS/Expo-signed app may use a different key. If Android reports a signing mismatch, retain the original app/data and rebuild with the original signing credentials; do not uninstall or clear data automatically. This APK targets ARM64 Android devices, not x86 emulators or 32-bit-only phones.

Physical-device acceptance remains required: check all captain choices and crew artwork, saved-character recovery, foreground GPS/address lookup, launch gating, audible speech, microphone input, audio pause/resume, background/foreground recovery and the intended Bluetooth/output route. Test while parked. No physical phone test was performed by the cloud build.

## Current cloud-build blocker

Local `assembleRelease` reached native dependency resolution but failed because the environment proxy denies CONNECT to `repo.reactnative.dev` (HTTP 403). Maven Central redirects `com.facebook.react:react-android:0.86.3` release AAR downloads there. A permission retry produced the same denial. The specific domain addition has been saved in the environment configuration draft; it must be applied before the download can succeed. No APK, signing verification or APK download link has been produced yet.

To resume in the current prepared machine after network settings are applied, run `/workspace/setup-tools/build-mole-1.0.13.sh`. Its build log is `/workspace/setup-logs/1.0.13-gradle.log`. No application behavior changes are required to resolve this network blocker.
