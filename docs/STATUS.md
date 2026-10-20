# Mole Beyond status

Shared status for Cory, Claude and Chet. Keep it short: one line per item, details live in Issues.
Whoever finishes a task updates this file in the same PR.

## Builds
- **Current build:** 1.0.28 (versionCode 29) · branch `build/mole-beyond-1.0.28` · APK on a **draft** GitHub Release `v1.0.28`. Cory publishes it after trying it.
- **In 1.0.28:** #3 voice after screen lock (PR #12) · #5 arrival at home + re-route (PR #13) · #9 draft-release workflow (PR #14) · #17 flaky test (PR #18)
- **Previous:** 1.0.27 (versionCode 28) · branch `build/mole-beyond-1.0.27`, unchanged
- **Device under test:** Samsung S23 Ultra
- **Last field test:** 2026-10-20 on 1.0.27 · Issue #2

## In review (for 1.0.29)
- #21 Crew introduction and contract depart lines dropped at launch · PR #23 · Linux Claude · needs review
- #4 Crew act anyway and grumble · PR #16 · Claudette · changes requested (offer flag + Max's line); rebase on #21 once merged
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

_Updated by Linux Claude, 2026-10-20 (#21)_
