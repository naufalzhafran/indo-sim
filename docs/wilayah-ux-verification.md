# Wilayah UX verification

Implemented and checked on 29 September 2026.

The regional dossier now starts with one province, its problem, and two explained actions. Priority controls and consequences appear after the player chooses an action. Batch selection is secondary. There are no accordions in Wilayah: province statistics form a visible strip, the budget rule is an inline note, and geographic filter buttons select the province list without expanding or collapsing groups. The existing parchment-and-ink design, Indonesian and English, action queue, and save format are retained.

## Validation results

- PASS: `npm run build` completed. Vite still reports its non-blocking bundle-size warning.
- PASS: `npm test -- --reporter=dot`: 54 tests in 7 files.
- PASS: Guided regional, regional management, and regional translation browser checks: 16 tests. Run `npx playwright test tests/guided-regions.spec.ts tests/regional-management.spec.ts tests/language.spec.ts --grep 'regional|province search|new player|Indonesian project|commitment reductions|emergency and funding|paused projects|no urgent issues|Indonesian guided|agenda conflict|select a region|DPR' --reporter=line`.
- PASS: Regression assertions confirm that Wilayah contains no `details` or `summary` elements in single-province, allocation, or batch mode; cross-region selections survive filter changes and empty search results.
- PASS: Prettier checks on the new panel, guidance helpers, translations, stylesheet, and tests.
- PASS: Axe scans and horizontal overflow assertions at 1280 × 720 and 1440 × 900, with both Indonesian and English coverage across the regional suites.
- PASS: New-player flow completed with no browser page errors. Keyboard radio navigation and Escape behavior tested. Reduced-motion preference enabled for the guided tests.

An earlier broader language-suite attempt failed on the separately edited onboarding entry button. The final targeted runs above pass; this report does not claim the entire browser suite passed. A later workspace build exposed a cabinet empty-state type error. One unreachable optional name lookup was replaced by the same existing `No minister appointed` fallback, preserving runtime behavior and restoring the build.

## Visual review

All six screenshots were opened and inspected. Essential action explanations remain visible when the panel opens at the desktop baseline. Province lists and longer decision content scroll within the existing dossier; the map and command bar remain visible.

- [Initial view at 1440 × 900](screenshots/wilayah-guided-1440.png)
- [Initial view at 1280 × 720](screenshots/wilayah-guided-1280.png)
- [Priority consequences](screenshots/wilayah-guided-preview.png)
- [Project explanation](screenshots/wilayah-guided-project.png)
- [Visible province statistics](screenshots/wilayah-province-stats.png)
- [Geographic filters](screenshots/wilayah-region-filters.png)

## Interaction evidence

| Control or state | Observed result |
| --- | --- |
| Province selection | Changes the named province without queuing anything; single-province action choice resets. |
| Search | Finds Aceh; an unmatched query shows a clear empty state. |
| View all / priority list | Switches between 38 provinces and the five highest-ranked entries. |
| Budget action | Reveals named priority radios and population-weighted share comparisons. |
| Priority radios | Mouse and keyboard change the proposed weight; the initial value reflects existing queued decisions. |
| Inline budget rule | Shows population × priority and proportional sharing beside the preview, with the zero-weight case explained without a click. |
| Project action | Shows engine-derived cost, at least 18 funded months, completion benefits, and funding limits. |
| Add to agenda | Queues one decision; enacted values stay unchanged until the month resolves. |
| Update agenda | Replaces the same province's queued priority without duplicating it. |
| Agenda removal | Recomputes the effective priority and clears stale feedback. |
| Monthly resolution | Applies the priority or starts the project; selection batches reset afterward. |
| Batch mode | Geographic filter buttons replace expandable groups. Switching regions preserves selections; selecting all of Sumatra queues ten projects as one agenda group. |
| Clear selection / return to single | Clears the batch and removes bulk checkboxes from the default experience. |
| Commitment protection | Excludes harmful reductions until checked; changing the proposal resets that consent. Shows the promised minimum. |
| Queued commitment | Participates in risk checks; replacing a preceding priority cannot silently bypass its requirement. |
| Agenda conflict | Shows the existing queue error and preserves both original agenda items. |
| Emergency link | Opens Briefing with the correct province first. |
| Funding link | Opens Policies for commitments affected by national funding or infrastructure settings. |
| Province details | Population, poverty, and approval stay visible in a compact strip. An explicit button opens the full inspector for the selected province. |
| Project details | Opens the inspector's Development tab; paused projects expose the existing Resume action. |
| Existing / paused / queued projects | Separate labels; duplicate project submission disabled. Zero-allocation warning shown. |
| No urgent issues / term complete | Shows explicit explanations and prevents new decisions after month 60. |
| Language change | Regional controls, comparison values, feedback, and batch project costs translate during play. |

## Antislop delivery gate

Scope: the authorized desktop Wilayah revamp. Mobile app redesign is outside the agreed scope. The inherited ENERGY 2 / RHYTHM 3 / MOTION 2 direction is retained, with no additional animation.

| Check | Result and evidence |
| --- | --- |
| R-01 gradients/glows | PASS: no new gradients or glows; the existing dossier surface is retained. |
| R-02 copy punctuation | PASS: no em dashes in the panel, helpers, stylesheet, or regional translations. |
| R-03 layout | PASS within agreed desktop scope: overflow assertions and inspected screenshots at both supported sizes; 44px controls. |
| R-04 icons | PASS: no new icons or decorative glyphs. |
| R-05 composition | PASS: a compact province browser and contextual decision workspace, not a repeated marketing layout. |
| R-06 typography | PASS: existing serif province title and sans-serif explanations preserve the institutional map-table design. |
| R-07 backgrounds | PASS: no new background patterns; existing cartographic setting retained. |
| R-08 arrows | PASS: arrows appear only in before/after budget comparisons. |
| R-09 badges | PASS: project status is text; no decorative badges. |
| R-10 glass | PASS: no new glass or blur effects. |
| R-11 shape consistency | PASS: square paper sections and existing small-radius controls; no pill styling. |
| R-12 shadows | PASS: no new section shadows; inherited control and dossier elevation only. |
| R-13 glow | PASS: no glow effects. |
| R-14 repeated cards | PASS: the two equal action choices support a direct comparison; other information uses plain rows, a statistical strip, and a concise inline rule. |
| R-15 action copy | PASS: controls name their actual actions, including Add to agenda, View all provinces, and Open project details. |
| R-16 buzzwords | PASS: copy explains gameplay without promotional claims. |
| R-17 numbers | PASS: values come from GameState, existing cost calculations, population-weighted allocation, and simulation project rules. |
| R-18 testimonials | PASS: no testimonials or invented people. |
| R-19 motion | PASS: no new animations; existing reduced-motion support exercised. |
| R-20 identity | PASS: province names, parliament commitments, shared infrastructure allocation, and map-table styling are specific to this game. |
| R-21 theme | PASS: retains the authorized fixed parchment theme. |
| R-22 illustrations | PASS: no new illustrations. |
| R-23 authorization | PASS: layout and navigation changes implement the approved guided-page plan; no new brand assets. |
| R-24 navigation | PASS: Agenda, Briefing, Policies, and inspector links have working destinations. |
| R-25 contrast | PASS: Axe reports no contrast violations in the checked regional views. |
| R-26 functional controls | PASS: interaction evidence above covers the panel's buttons, radios, search, checkboxes, and region filters. |
| R-27 states | PASS: search/selection/issue empty states, queue errors, term completion, and existing turn-busy behavior are handled; panel data is synchronous, so no artificial loading indicator. |
| R-28 FAQ | PASS: no generic FAQ; a relevant allocation rule stays visible beside the preview. |
| R-29 palette | PASS: existing olive, parchment, brass rules, and restrained vermilion for action/warning feedback. |
| R-30 originality | PASS: retains the project's cartographic identity rather than introducing a dashboard template. |
| R-31 purpose | PASS: olive identifies selection; borders separate problem/action/consequence; the province title anchors the view; the statistical strip and inline rule remove extra reveal interactions. |
| R-32 keyboard | PASS: native controls, visible inherited focus outlines, radio arrow-key test, and Escape test. |
| R-33 source edits | PASS: implementation lives in normal TSX/TS/CSS source; no source-rewriting scripts. |
| R-34 themes | PASS: no theme toggle introduced; existing fixed theme checked. |
| R-35 runtime verification | PASS: build, actual browser interactions, page-error check, screenshots, and accessibility scans completed. |
| R-36 claims | PASS: no security/compliance/performance claims added. |
| R-37 direction | PASS: DESIGN.md guided the work and now records the final regional layout. |
| R-38 authentic content | PASS: all gameplay values and explanations are backed by the simulation; no fabricated statistics. |
| Liveliness | PASS: selected province is the focal point, the list and decision area use distinct density, and the shared paper/ink motif retains the game's visual identity. |
| C-1 intentionality | PASS: layout reduces initial choices and explains their costs before queuing. |
| C-2 completeness | PASS: all controls have tested behaviors; no placeholders or dead destinations. |
| C-3 content | PASS: only province issues, decisions, consequences, and related details are shown. |
| C-4 resilience | PASS: supported desktop sizes, long province names, language switching, empty lists, queued state, conflicts, and term completion tested. |
| C-5 evidence | PASS: mathematical previews checked against merged agenda execution; screenshots and browser tests verify presentation. |
