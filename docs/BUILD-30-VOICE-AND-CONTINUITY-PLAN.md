# Build 1.0.30 — Voice and cinematic continuity delivery plan

Base: `build/mole-beyond-1.0.30`; working branch: `chet/30-voice-integration`.

## Non-negotiable gates
- Driver safety first: no interactive prompts, lengthy speech, or visually complex panels while vehicle is moving. Navigation instructions always take priority; voice and story must be interruptible/mutable.
- Privacy: never commit ElevenLabs credentials, put them in client JS, Expo config, APK, or logs. Windows user environment variable is for local testing only. Production requires a secured backend secret and authenticated, rate-limited proxy.
- Keep existing navigation and local/device TTS operational as fallback. Avoid changing the existing v1.0.30 layout while #10/#40 changes may be in flight.
- Minimize API costs: short speech, caching by normalized text + voice + model, caps and timeouts.

## Phase 1 — ATLAS voice vertical slice (Build 30)
1. Inventory current speech, microphone, navigation audio queue, build scripts, and relevant tests.
2. Implement a server-side ElevenLabs TTS adapter (key read from server environment only) with strict text length, allowed voice IDs, authentication, quotas, timeouts and safe error responses.
3. Implement client voice provider with fallback to existing expo-speech/device TTS; prioritize navigation over story audio; never speak unsafe prompts while moving.
4. Connect ATLAS (`dyLJ4nCukg4AOgAVlUR7`) to one parked-only test line: “ATLAS online. All primary systems operational. Welcome aboard, Captain.”
5. Tests: no secret in bundle, no request if offline, auth failure fallback, mute, interruption, audio lifecycle, parked-only trigger, Android real-device playback.

## Phase 2 — Crew and microphone
- Add mappings: Vex `ysswSXp8U9dFpzPJqFje`; Zyren `CwhRBWXzGAHq8TQ4Fs17`; Sila `hpp4J3VqNfWAUOO0d1Us`; Bastion `nPczCjzI2devNBz1zQrb`; Max `QzgYVYSNBgksoEWDkpKt`.
- Route lines by speaking character; preserve pronunciation/names, fallback and voice/music volume controls.
- Diagnose Android microphone toggle failures independently; keep push-to-talk with visible permission and status, no always-on mic assumption.
- Validate parked and moving safety modes and ship AI command handling.

## Phase 3 — Cockpit visual continuity
- Audit cinematic visual language versus in-game HUD; produce a shared style spec.
- Add optional holographic information panels for nav, scanner, engineering, weapons and cargo; minimal persistent controls.
- Captain controls which panels appear; voice commands open/close/recenter. Safe, uncluttered driving mode overrides customization.

## Phase 4 — Persistent world and orientation
- Chet orientation conversation only while parked, opt-in, editable/deletable preferences, local-first storage.
- Petrol stations as fictional spaceports mapped from real places; no detours, location disclosure minimization, and no implication of actual services.
- Persist captain display preferences, crew personalities and mission continuity without saving raw private conversations by default.

## Phase 5 — Release gate
- Run automated tests, TypeScript checks, bundle checks and Android build. Verify on a real Android phone while parked.
- Keep voice work on a feature branch, review before merge, and record build/APK evidence. No claim of APK completion until built and tested.

## Immediate execution checklist
- [x] ElevenLabs voice-list API test succeeded from Windows using user-scoped key.
- [x] Voice mapping recorded in issue #42.
- [x] Isolated voice integration branch created.
- [ ] Locate active speech path and existing backend architecture.
- [ ] Implement ATLAS vertical slice.
- [ ] Run tests and phone verification.
