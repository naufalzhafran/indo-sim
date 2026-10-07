# Campaign setup and ending verification

Verified 2026-10-06 against the approved cheerful island direction. ENERGY 2 / RHYTHM 2 / MOTION 2. Desktop and laptop support follows AGENTS.md; mobile work is outside this request.

## Behavior and evidence

- `npm test`: 118 tests passed, including verdict boundaries and the requirement that every region improve both income and poverty.
- `npm run build`: passed. The existing large-bundle advisory remains.
- Full browser regression: 48 tests passed. Two additional setup/import and final-save recovery tests passed separately.
- Milestone browser checks cover English and Indonesian at 1280×720, 1366×768 and 1440×900. Each setup stage and both ends of the final results are captured and checked for viewport containment and horizontal overflow. Axe reports no WCAG 2 A/AA violations in the campaign dialogs.
- Visual inspection covers mandate, selected policies, review, ending and regional achievement screenshots, compared with the established palette, typography, controls and island world.
- Opening policies persist as a first-quarter draft. Starting with seed 0 preserves that seed and month 0. Reload restores the draft. Unselected opening policies disable at the two-launch limit; selecting again removes a choice.
- Setup navigation, Back, review, seed validation, the seed hint, import errors and start were exercised. A malformed import leaves setup selections intact and creates no autosave. Escape dismisses the hint first. First-run setup remains the entry screen until starting or importing; an optional new-campaign setup cancels back to the existing game.
- Quarter 20 opens the dedicated ending. Reload and importing a completed campaign also open it. Read full report opens the existing development report. Escape dismisses that report or the ending. The map and plan buttons reopen results.
- Export results round-trips through the version-7 parser. Play a new campaign opens setup; cancel restores the ending and preserves the finished save. Final-save failure remains visible inside the ending; export works and Retry save commits month 60 without another turn.
- Existing browser regressions cover map selection, camera controls, WebGL fallback, reduced motion, policy and tax drafts, worker failure and storage recovery.

## Anti Slop delivery gate

The report covers the changed campaign flows and shared control styling. Existing art direction remains authoritative.

- R-01 PASS: existing cream, emerald and coral tokens provide surfaces, selections and primary actions; no new gradients or glows.
- R-02 PASS: new UI copy uses periods, commas and parentheses; no em dashes.
- R-03 PASS: both languages fit all three supported viewports; bounded scroll areas retain reachable controls.
- R-04 PASS: checklist checkmarks encode actual completion; no new decorative icon system.
- R-05 PASS: content follows mandate, policy choices, review and final results rather than a marketing template.
- R-06 PASS: bundled Nunito headings and Source Sans 3 body text preserve DESIGN.md.
- R-07 PASS: the existing archipelago supplies the background; no new pattern or texture.
- R-08 PASS: no decorative action arrows added.
- R-09 PASS: completion labels derive directly from goal and regional evaluation; no decorative badges.
- R-10 PASS: no glass or blur effects added.
- R-11 PASS: existing control radii and larger dialog radii preserve component hierarchy.
- R-12 PASS: short control shadows indicate pressed feedback; dialog elevation remains restrained.
- R-13 PASS: no glow added.
- R-14 PASS: parallel policy choices use matching rows for comparison; mandate, review and verdict have distinct compositions.
- R-15 PASS: actions name their result: Review campaign, Start campaign, Read full report and Export results.
- R-16 PASS: new copy explains actual game actions without marketing claims.
- R-17 PASS: targets come from campaignGoals; displayed outcomes come from aggregate and campaign snapshots.
- R-18 PASS: no testimonials or people assets added.
- R-19 PASS: no decorative animation added; existing reduced-motion behavior remains covered.
- R-20 PASS: cream surfaces, teal text and the Indonesian island world preserve the game's identity.
- R-21 PASS: the approved fixed light theme remains in place.
- R-22 PASS: no illustrations added; existing islands remain visible behind temporary workflows.
- R-23 PASS: user authorized start/end screens and the six-goal checklist; no logos or people assets created.
- R-24 PASS: setup navigation routes to implemented stages; final actions route to real reports, exports and setup.
- R-25 PASS: Axe found no contrast violations in either language at supported sizes.
- R-26 PASS: setup navigation, selection, validation, imports, export, retry and replay were exercised in browser tests.
- R-27 PASS: recovery loading, optional empty policy selection, invalid seed/import and save failure states are implemented and exercised.
- R-28 PASS: no FAQ added.
- R-29 PASS: all new surfaces and states use the established game palette.
- R-30 PASS: no external product's visual system introduced.
- R-31 PASS: DESIGN.md records the reason for layout, color, typography, spacing and control choices.
- R-32 PASS: native modal focus containment, keyboard setup navigation, seed focus and hint-first Escape behavior are exercised; optional setup and results dismiss correctly.
- R-33 PASS: UI source and styles were edited directly with apply_patch and formatted with Prettier; no source-rewriting scripts.
- R-34 PASS: no new theme toggle or alternate theme introduced.
- R-35 PASS: built, ran browser workflows, inspected screenshots and checked milestone console errors.
- R-36 PASS: no security, customer or performance claims added.
- R-37 PASS: AGENTS.md and DESIGN.md provide approved direction; the design read and dials were declared before implementation.
- R-38 PASS: policy names, purposes, costs and tradeoffs reuse the catalog; goal and regional results use actual game state.
- Liveliness PASS: the declared dials preserve the existing game; setup headings and the final verdict are focal points, coral emphasizes the next primary action, and spacing separates briefing from decisions.
- C-1 PASS: major design choices have recorded purposes in DESIGN.md.
- C-2 PASS: every new action has an exercised behavior.
- C-3 PASS: every section supports starting or evaluating the campaign.
- C-4 PASS: bilingual viewport, keyboard, malformed import and storage-failure checks passed.
- C-5 PASS: outcomes are simulation values and targets are explicitly game challenges.

## New persistent UI rule

The follow-up briefing revision removes yellow explanation containers from setup and the ending. The optional regional achievement now appears as a named bonus objective in setup; evaluation timing sits in the final verdict header. Opening-draft and autosave consequences remain plain text. AGENTS.md prohibits generic yellow explanatory banners across the game while retaining meaningful gameplay actions and accessible error messages.

AGENTS.md now prohibits link-style clickable controls. Navigation, report shortcuts and camera controls use visible button treatments. Semantic external anchors retain real URLs and use the same bounded treatment. StatHelp retains a separate circled question button and non-clickable labels.
