# Quarterly report

The post-quarter recap retains its existing animation and reduced-motion behavior. The former Summary button now opens Report / Laporan. Closing or reopening the report, loading a save, and importing a campaign do not replay the recap.

The report shares the economy and policy modal's raised game-board frame, 16px desktop margin, resource emblems, cream inventory tiles and emerald selections. Five chapters guide reading: events, national impact, regions, treasury and full records. Previous/Next controls keep that flow available beside a fixed chapter indicator.

Graphs include five foundation comparison tracks, recorded history and contribution bars for 13 selectable measures, industry production contributions, nine selectable regional output bars, regional foundation tracks, a four-stage fiscal waterfall and a funding meter. Full records retain the complete event, fiscal and regional tables.

Attribution comes from `receipt.effects`, computed by comparing the selected plan with the previous settings. The report does not assign those combined effects to individual policies. Saves without attribution show an explicit unavailable-data explanation. Monthly history is used for stocks and scores; the fiscal balance stays in the quarterly accounts rather than mixing monthly and quarterly series.

## Design review

Reading this as a quarterly briefing for game players in the approved cheerful island-game visual language: ENERGY 2 / RHYTHM 2 / MOTION 2 for the treasury's requested money flow; MOTION 1 elsewhere. The existing recap choreography is preserved.

- Cream, teal and emerald retain the approved identity and distinguish selection and graph sources.
- Nunito headings and bounded controls retain the game character; Source Sans 3 and tabular figures support reading metrics.
- Connected resource tiles show how decisions reach households; emblems reuse the same illustrated economy objects as the other game modals.
- Chapter navigation separates the event briefing, national causes, regional comparison and treasury flow; complete tables have a dedicated records chapter.
- Fixed dialog, chapter and footer controls remain available while scrolling the current chapter.
- Raised tiles, solid connectors and short bottom shadows reuse the game's established visual language.
- The report shows final numbers immediately. Treasury alone now traces money through four fiscal entries and the closing balance in a single 4.5-second sequence, as requested. Bounded step buttons inspect each amount and running balance, with receipt-based explanations of spending, interest, debt and cash. Pause and replay control this sequence; reduced motion disables playback and retains manual inspection. Its timer is cleaned up on chapter exit. Other graphs and chapter transitions remain static.
- Graph signs, numbers and position convey direction independently of color. Small changes use additional precision instead of displaying negative zero.

## Verification evidence

- `npm test`: 118 unit tests passed.
- `npm run build`: passed. The existing large-bundle warning remains.
- Report checks cover English and Indonesian at 1280×720, 1366×768 and 1440×900.
- Every one of the 13 statistic options updates its history graph and model explanation.
- All five chapters were exercised, checked with Axe and captured at the supported sizes in both languages. Previous/Next and direct tabs navigate the same flow.
- Treasury's five amount buttons show their selected state, actual running balance and model explanation in both languages. Normal-motion checks verify the animated trace, pause, replay, automatic completion and a live switch to reduced motion. Reduced-motion checks verify no trace or autoplay. The settlement diagram uses `borrowing - repayment` for debt change and `after.cash - before.cash` for cash change, matching the engine's settlement equations.
- Report button opens the modal; report remains available after reload without a recap.
- Tooltip focus opens its explanation; Escape dismisses it before the report.
- Escape closes the report and restores focus to its opener.
- Selecting Papua opens its regional view and closes the report.
- Axe WCAG A/AA checks report no violations in the report dialog.
- Normal-motion playback completes once; Read report opens the dialog; closing returns focus to Laporan; reload and reopening show the report without playback.
- Save/import, tax draft/undo/reset, WebGL fallback with regional selection and quarter progression, and the final campaign report passed their existing browser checks.
- Top, explanatory, and regional sections were visually inspected against the established reference. Native select controls and accordions were not introduced.

Saved visual evidence: [report at 1440×900](screenshots/quarter-report-en-1440.png) and [regional comparison](screenshots/quarter-report-regions-en-1440.png).

Treasury flow evidence: [settlement and explanation at 1280×720](screenshots/quarter-report-treasury-flow-en-1280.png). The treasury flow's amounts come from the quarter receipt, not estimated per-policy attribution. Build, six localized report checks and the normal-motion playback check passed; the final settlement diagram was also rechecked at the smaller English sizes.

## Antislop gate, scoped to this change

- R-01 PASS: graph colors reuse the game palette; no new gradients.
- R-02 PASS: new player-facing copy contains no em dashes.
- R-03 PASS: all three owner-supported desktop sizes fit; mobile is excluded by AGENTS.md.
- R-04 PASS: existing EconomyEmblem resource objects identify foundations, industries and financing; the existing close icon retains its purpose.
- R-05 PASS: sections follow recorded outcomes, causes, events, accounts and regional comparisons.
- R-06 PASS: bundled Nunito and Source Sans 3 retain their specified roles.
- R-07 PASS: graph shading marks the reviewed quarter, with a visible explanation.
- R-08 PASS: arrows in milestone comparisons indicate actual before/after transitions.
- R-09 PASS: no decorative badges added.
- R-10 PASS: no glassmorphism added.
- R-11 PASS: panel, dialog and button radii follow existing controls.
- R-12 PASS: bounded controls retain short shadows; the report has restrained elevation.
- R-13 PASS: no new glow treatments.
- R-14 PASS: tables and a focused analysis serve different comparison needs.
- R-15 PASS: Report, Read report and named region buttons have explicit destinations.
- R-16 PASS: copy describes the simulation rather than marketing it.
- R-17 PASS: numbers come from receipts, ledgers and saved simulation history.
- R-18 PASS: no testimonials introduced.
- R-19 PASS: treasury motion explains the selected fiscal path, finishes after 4.5 seconds and has pause/replay controls. Reduced motion retains static charts and step selection. Other report graphs are static; the recap still plays once.
- R-20 PASS: the approved cream/teal game identity is preserved.
- R-21 PASS: the established light theme is preserved as required by AGENTS.md.
- R-22 PASS: no new illustrations or scenery added.
- R-23 PASS: report structure and charts implement the user's requested detailed modal.
- R-24 PASS: every new option updates a real statistic view.
- R-25 PASS: report Axe WCAG A/AA checks pass at the supported sizes in both languages.
- R-26 PASS: report, all statistic options, hint dismissal and regional navigation were exercised.
- R-27 PASS: first-quarter empty state remains; recovered saves lacking effects have an explicit limitation; loading/error handling remains in the campaign recovery flow.
- R-28 PASS: no FAQ introduced.
- R-29 PASS: new styling uses the approved game palette and neutral graph fills.
- R-30 PASS: existing game components and tokens define the design.
- R-31 PASS: layout, colors, typography, spacing, grouping and graphs have reasons recorded above.
- R-32 PASS: keyboard selection, visible focus, tooltip Escape, dialog Escape and focus return were verified.
- R-33 PASS: source changes were made directly with patches, without rewrite scripts.
- R-34 PASS: no additional theme introduced.
- R-35 PASS: build, browser click-through, screenshots and console checks verify the changed flow.
- R-36 PASS: no performance, security or compliance claims introduced.
- R-37 PASS: the user's approved visual direction governs the implementation.
- R-38 PASS: model explanations are grounded in `engine/economy/engine.ts`; unavailable attribution is explicitly identified.

Liveliness PASS: each chapter has a focused graph or briefing; spacing separates its evidence; emerald highlights selected chapters and results; miniature resource objects, solid connectors and raised game controls repeat the established identity.

Craftsmanship C-1 through C-5 PASS: the reasons are documented, interactions work, sections use actual game data, desktop/localized/keyboard states were checked, and the report separates recorded contributions from general model mechanisms.

Selected regional charts use dark teal tracks with cream positive bars, coral negative bars and a cream zero line, keeping the chart visible against emerald selection. Build and all six report browser checks passed in English and Indonesian at 1280×720, 1366×768 and 1440×900; selected states were inspected in the rendered screenshots.
