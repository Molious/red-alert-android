# Last Mile Legends: Red Alert — finished cockpit artwork

The set includes all 24 selectable captains: human, reptilian, insectoid and light-being; male and female; military, support and explorer.

Each captain has two aligned transparent layers (figure and chair), matched to the existing character portrait. Keeping the layers separate preserves the complete seated character and lets the game move the chair as one group. All figures face toward the right from the left-hand navigation position. The insectoid female support pair is mirrored by the game to match this orientation.

The clean parked bridge has all five permanent crew at their stations and an open centre rail. The amber navigation plate has blank screens and windscreen so live navigation and telemetry remain real interface elements. The existing five crew portraits remain the comms portraits.

Contents:
- `captain-artwork-overview.jpg`: contact sheet showing all 24 compositions.
- `artwork-masters/`: full-resolution transparent PNG figure/chair layers and clean background plates.
- `mole-beyond-hybrid-03/`: optimized WebP artwork and the source changes that connect every choice to its correct seated artwork.
- `artwork-provenance.json`: Runway generation/extraction task references and prompts.

Source installation: merge the included `mole-beyond-hybrid-03` folder into `C:\mb14\mole-beyond-hybrid-03`. This is an overlay, not a complete replacement project.

Validation:
- All 24 options load both image layers in a headless Chromium character-selection check, with no page errors.
- All 48 optimized image layers have real alpha transparency, nonempty foregrounds and matching dimensions within each pair.
- All assets are connected to the existing species/gender/occupation keys; no portrait fallback is used for the seated captain.
- Temporary web preview document is 3,692,263 bytes, below the existing 4 MiB budget.
- Existing launch animation uses the selected two-layer chair group. No separate Runway movie is included.
- No APK has been built or published for this artwork set. The Android bundle can be regenerated when the build stage begins.

Build stage command (after installing source):
    cd /d C:\mb14\red-alert-android-main
    node scripts/bundle-hybrid.mjs

Microphone and journey eligibility changes are outside this artwork pass.
