# TEST 01C — controlled crew identity and routing trial

Base: `103f430c6b0ae286248c7cfa70b7aa26a6e1e7e5` (1.0.31 RC).
Branch: `chet/test01c-crew-routing`.
Status: proposed code, draft review only; no merge, APK build, deployment or release.

## Root cause and scope

The AI prompt/parser retained WRAITH/SILAS/CHET and allowed up to three speakers. The open-mic handler discarded unmatched speech before the AI callback. Native voice IDs already use ZYREN/SILA/ATLAS.

The AI boundary now accepts a single leading crew address (optionally `hey`), canonicalizes Wraith→Zyren, Silas→Sila, Chet→Atlas and Mags→Max, and ignores unaddressed or ambiguous leading names. The prompt uses all six approved identities and current genders. Runtime validation accepts only the first nonempty line from the addressed character; wrong, unknown and malformed replies never get reassigned to another speaker.

Saved phone voice choices under legacy IDs remain available to canonical AI speakers. No key, missing native bridge, API errors, timeout or invalid replies produce a brief deterministic fallback from the addressed character. A name-only call is acknowledged locally. No actual credentials or live model/TTS APIs are used in testing.

Existing commands take precedence, active answer/cancel windows cannot be hijacked by AI, and muted free speech does not initiate AI requests. Existing controller-generated command replies, scripted dialogue and legacy save IDs are intentionally retained. This trial changes AI conversation routing, not all scripted game dialogue. Mission queue priority/expiry, navigation scheduling, mic lifecycle, cancellation confirmation, GPS and native voice settings remain unchanged.

## Verification

- Baseline game suite: 148 passed, 0 failed.
- Five new routing regression tests: 0 passed / 5 failed against original source; all five passed after implementation.
- Expanded routing suite: 10 passed, covering aliases, ambiguous/unaddressed speech, wrong speakers, offline/API/malformed fallback, local acknowledgement, busy/timeout/late replies, answer windows (including empty expectations), commands, mute and saved legacy phone voice choices.
- Native identity cross-check: approved voice IDs and native gender profiles match the generated AI prompt.
- Typecheck: passed.
- Full final `npm test`: 92 app tests + 158 game tests passed; 0 failed, 0 skipped; command exit 0.
- Independent source review: legacy voice-selection and empty-answer-window findings fixed with regressions; reviewer rechecked with no remaining blocking findings.
- Generated bundle: 3,160,367 bytes, under 4 MiB; source consistency check passed.
- git diff --check: passed.

## Remaining risks / acceptance gates

No Android APK compilation, installation, microphone capture, live Haiku/ElevenLabs call or physical-device navigation/audio-priority test was performed. Unit/integration tests cannot establish speaker output or road safety. Leading-name gating is lexical, not speaker authentication: passenger/radio audio containing the exact address can still match. Legacy UI/scripted names remain outside this bounded AI fix. Existing client-held API-key design and 90-second queued AI expiry remain unchanged and require separate safety/security review. Unknown/incorrect model replies intentionally fall back rather than being spoken as another crew member.

Independent technical/safety review and Captain approval are required before merge or release. This branch must not be used as evidence that the earlier phone audio problem is resolved.
