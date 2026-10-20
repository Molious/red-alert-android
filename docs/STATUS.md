# Mole Beyond status

Shared status for Cory, Claude and Chet. Keep it short: one line per item, details live in Issues.
Whoever finishes a task updates this file in the same PR.

## Builds
- **Current build:** 1.0.27 (versionCode 28) · branch `build/mole-beyond-1.0.27` · APK `artifacts/` on that branch
- **Next version:** 1.0.28 · fixes in review (#3, #5, #6) · version bump not started
- **Device under test:** Samsung S23 Ultra
- **Last field test:** 2026-10-20 on 1.0.27 · Issue #2

## In review
- #3 Directions voice survives screen off/on · PR #12 · Claude · safety · needs Chet's review + an APK build to compile the native patch
- #5 Arrival at home; re-route at 1-second GPS; approximate-pin warning · PR #13 · Claude · safety · needs Chet's review
- #6 Bridge key bar · PR #10 (draft) · Chet · shared-file · Claude to review

## Waiting on Cory
- Approve Issues #4, #7, #8, #9, #11
- Field test #3 and #5 once a 1.0.28 test APK exists (lock the phone mid-route; drive home with a typed house number)
- Decide whether `main` should catch up with the 1.0.27 build line (it's 53 commits behind; STATUS.md now lives on both)

## Open from the field (1.0.27 drive, 2026-10-20)
- #4 Crew should act anyway and grumble in character when the driver doesn't answer · owner:claude
- #7 Confirm the hands-free answer window (chime + 12 s) works on the phone · owner:claude · safety
- #8 Confirm Vex (male) and Chet the ship (female) voices on the phone · owner:claude
- #11 Parked bridge stays up while creeping at 2–8 km/h (from the #10 review) · owner:claude · safety · shared-file
- #9 Build workflow: trigger on `build/**`, publish APKs as Releases · area:build · needs approval

## Ownership
- **Claude:** story, crew voices, game logic, field-test triage
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
- `src/hybridHtml.ts` is generated: after merging any game-source change, re-run `npm run bundle:hybrid` rather than hand-merging it.

_Updated by Claude, 2026-10-20_
