# Mole Beyond status

Shared status for Cory, Claude and Chet. Keep it short: one line per item, details live in Issues.
Whoever finishes a task updates this file in the same PR.

## Builds
- **Current work:** 1.0.30 (versionCode 31) · branch `build/mole-beyond-1.0.30` · **all new PRs target it**. Pushes rebuild the draft release `v1.0.30`; Cory publishes.
- **Published:** v1.0.29 (versionCode 30), APK built from `19ba524`; `main` matches it. (The v1.0.29 tag points at 3b736e5, the draft's original target; the workflow now updates the target on rebuilds.)
- **1.0.30 plan:** #10 bridge keys · #40 speedo top-left · #34 captain in the nav cockpit · #15 map pin (Chet) · #11 stopped timer (Linux Claude, after #10) · #33 ElevenLabs voices + #32 AI crew by name (Chet, voice lead) · #35 mic vs voice call
- **Device under test:** Samsung S23 Ultra

## In review (for 1.0.29)
- #31 Speedo: large current speed with the limit beside it, navigation cockpit · PR #37 · Linux Claude · safety · blocker · Chet reviews layout
- #30 Launch never refused for not being parked (moving / unknown speed → guidance now; parked → animation) · PR #36 · Linux Claude · safety · blocker
- #20 Voice commands by voice only, mis-hearings, always a spoken reply (+ #7 answer-window fixes) · PR #24 · Linux Claude · safety · approved after the lunch fix
- #25 Open mic for the whole drive · PR #26 merged · follow-up: steady mic indicator, no chatter on screen · PR #27 · Linux Claude · needs review · Cory: 30-min battery drive, chatter test
- #4 Crew act anyway and grumble · PR #16 · Claudette · approved by Linux Claude (re-review)
- #6 Bridge key bar · PR #10 (draft) · Chet · landscape 7-key size fix, bundle, tests, screenshots

## Queued
- #11 Bridge stays up while creeping 2–8 km/h, plus `signal_lost` · Linux Claude · after #10
- #15 Destination pin and road end on the map before launch · Chet · after #10
- #19 Opening cinematic · Chet · must end via `finishLaunch()` so crew lines play (see #19)

## Waiting on Cory
- Try the 1.0.28 draft APK, then press **Publish release**
- Parked tests: lock the phone mid-route (#3); drive home with the house number typed (#5)
- On the next drive: #7 answer window, #8 Vex male / Chet female voices
- Decide whether `main` should catch up with the build line

## Team
- **Claudette** (Cory's phone chat): manager, merges, releases, #4/#9/#17 · **Linux Claude** (cloud dev session): #3/#5/#11 · **Chet** (ChatGPT): map, cockpit, layout, reviews
- Sign GitHub comments "— Claudette" / "— Linux Claude" / "— Chet" (we all post as Molious)

## Ownership
- **Claude (Claudette, Linux Claude):** story, crew voices, game logic, field-test triage
- **Chet:** map rendering, cockpit artwork, layout, navigation presentation
- **Shared (say so in the Issue before editing, keep changes in marked sections, other agent reviews):**
  `src/navLayoutPatch.ts`, `mole-beyond-hybrid-03/src/lib/foundation/simulator.css`

## Rules
- Work only on Issues Cory has labelled `approved`.
- Branches: `claude/<issue#>-<slug>`, `chet/<issue#>-<slug>`. Release candidates: `build/mole-beyond-1.0.N`.
- One agent bumps the version per release (named in the release Issue) so numbers never collide.
- Cory approves every merge and every APK release.
- `safety` label = touches driving, GPS, navigation, mic or driver interaction → the other agent reviews with the PR checklist, Cory gives final approval.
- No secrets in Issues, PRs or code. The AI crew API key stays on the phone.
- Never ask Cory to do anything while he's driving. Field-test notes get filed once he's parked.
- `main` always matches the latest release Cory has published (Claudette updates it after each publish). Work happens on `build/mole-beyond-1.0.N`.
- `src/hybridHtml.ts` is generated: after merging any game-source change, re-run `npm run bundle:hybrid` rather than hand-merging it.

_Updated by Claudette, 2026-10-21 (1.0.29 published, 1.0.30 opened)_
