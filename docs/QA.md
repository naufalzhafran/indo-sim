# Interface delivery checks

This is the historical record for the previous interface. Current model 3 release checks are recorded in [ENGINE-V3-QA.md](ENGINE-V3-QA.md); desktop map-table checks are recorded in [GUI-QA.md](GUI-QA.md).

Test environment: Apple M1 Max, macOS ARM64, Node 24.14.1, Playwright Chromium. Desktop screenshots at 1512 × 1100; interaction tests also use 1280 × 720. Mobile checks at 390 × 844 and 360 × 800. This is tested browser coverage, not a claim about every device or assistive technology.

## Functional evidence

`npm test`: 17 engine tests. `npm run test:e2e`: six browser workflows, including a complete 60-turn presidency. Tests select all 38 provinces by keyboard, exercise all five overlays, map zoom/pan/reset and failed-map retry, search, allocation, commissioning/pause/resume, a cabinet appointment, approved and rejected legislation, coalition changes, relief, campaign funding/platform, election, save/reload/export/import, corrupt import and unavailable storage. Additional checks exercise policy sliders, evidence dialogs, draft reset, agenda removal, new game, indicator explanations, Escape dismissal, reduced motion, campaign and ending layouts.

Inauguration coverage: all four setup screens, a replacement minister, prevention of duplicate appointments, both alternative policy presets, custom policy controls, review/edit/back, tutorial opt-out, saved tutorial progress, real first-turn completion, skip/restart, safe replacement cancellation, existing-save imports, desktop and mobile layouts. Axe A/AA scans cover each setup stage and the walkthrough. New engine tests verify that setup changes no financial stocks or economic time, selected policies incur actual first-turn costs, and optional guide metadata preserves old-save compatibility. Screenshots: inauguration.png, cabinet-setup.png, cabinet-setup-mobile.png, walkthrough.png. These changes retain the existing antislop design gate and 2/2/1 direction.

No page exceptions in the full presidency workflow. The production build includes its worker, GeoJSON and local fonts. `npm audit` reports zero vulnerabilities at delivery. This is a dependency check, not a security certification.

## Antislop core delivery gate

- R-02 PASS: source scan finds no em dash in UI copy.
- R-03 PASS: document width stays within viewport in all seven primary views at 390px, plus campaign and ending at 360px; screenshots inspected.
- R-17/R-18 PASS: no customer statistics, social proof or testimonials. Game measurements are visibly simulated; observed starting data and synthetic fields are distinguished.
- R-23 PASS: real geography and fictional politicians are explicitly requested; monograms represent those fictional ministers. No invented official seal or endorsement.
- R-24 PASS: every navigation item selects an implemented governing view; Legacy appears after completion.
- R-25 PASS: axe WCAG A/AA contrast checks return no violations across primary views, research dialog, mobile campaign and ending. Low-contrast labels found during testing were darkened.
- R-26 PASS: every rendered control has a handler, link or native disclosure behavior. Turn-ending controls are disabled after the presidency. Functional coverage is listed above.
- R-27 PASS: loading desk/map, empty project/trend/agenda states, worker failure, storage failure, malformed import, map retry, and rejected-decision feedback exist. Browser tests cover recovery and corruption.
- R-28 PASS: no generic FAQ or filler marketing sections.
- R-32 PASS: province paths accept Enter/Space; searchable list provides an alternative; visible focus, labeled controls and native modal focus containment/Escape dismissal are implemented and tested.
- R-33 PASS: UI changes were authored in source through patches; Prettier formats code without implementing features.
- R-34 PASS: one intentional paper theme; no nonfunctional theme toggle.
- R-35 PASS: app run, production build completed, browser controls exercised through recorded Playwright workflows and visual screenshots.
- R-36/R-38 PASS: performance claims come from the recorded benchmark; no accuracy, compliance or security certification claims. Fictional game content is labeled.
- R-37 PASS: DESIGN.md records the agreed presidential-desk direction, Source typography and ENERGY 2 / RHYTHM 2 / MOTION 1.

## Purpose and composition

- R-01/R-07/R-09/R-10/R-12/R-13/R-19/R-22 PASS: no ornamental glows, background grids, capsule marketing badges, glass layers, floating card effects or stock illustrations. Motion is limited to control feedback and respects reduced motion.
- R-04 PASS: small line icons correspond to concrete map, ledger, cabinet, parliament and document actions; none claims an invented product feature.
- R-06 PASS: serif editorial titles express the presidential-desk direction; sans-serif controls support dense data. Small uppercase section labels establish document hierarchy.
- R-08 PASS: arrows mark navigation or monthly progression; plain policy/action controls carry meaningful verbs.
- R-14 PASS: repeated policy/minister rows make comparable attributes readable; the atlas, ledger, parliament and briefing use different content-driven compositions.
- Liveliness PASS: atlas focal point, restrained red turn action, paper/ink motif, sectional whitespace and varied density match declared 2/2/1 dials. See desktop.png and mobile.png.
- C-1/C-3/R-05/R-20/R-30/R-31 PASS: the geography, province inspector, party seat diagram, accounting ledger and monthly agenda determine layout. This is a governing workspace, not a landing-page template.
- C-2/C-4 PASS: tests cover actionable views, keyboard interaction, shorter desktop sidebar scrolling, small-screen stacking and failures. No claim of exhaustive assistive-technology certification.
- C-5 PASS: sources and modeled assumptions are inspectable in the game and research register.
- R-11/R-15/R-16 PASS: restrained rectangular controls, specific action labels, no AI marketing copy.
- R-21/R-29 PASS: agreed light-paper/navy direction; restrained red accent; additional labeled map/party colors encode data categories.

## Remaining research release gates

UI acceptance does not close scientific or geographic provenance gates. Assumed sector/urban shares, illustrative coefficients, limited historical evaluation, and the map publisher's missing upstream source file are documented in README.md and RESEARCH.md. The game is locally playable; it is not represented as an empirically validated forecast or cleared commercial map product.
