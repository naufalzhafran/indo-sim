# Presidential advisor

Open **Summary**, then **Advisor**. The advisor usually offers two alternatives with visible pros, cons and likely consequences. Review opens the existing decision-impact preview; adding a choice queues it for the next month. The agenda remains the place to edit or remove it.

Advice is generated locally from the simulation state and queued decisions, without a remote AI service. Priorities are unanswered emergencies, a requested-budget deficit, then regional infrastructure needs. Fiscal suggestions are withheld while a policy package is queued or a policy draft has unsent edits. Regional recommendations skip queued or existing projects and priorities already at their limit. A completed term or exhausted eligible actions has an explicit empty state. Recommendations explain conditional effects, Parliament's role, funding limits and construction delays rather than promising a particular outcome.

## Design read and purpose

Reading this as a presidential decision paper for desktop strategy players in the existing warm map-table visual language, ENERGY 2 / RHYTHM 3 / MOTION 2 from DESIGN.md.

- The dedicated tab preserves the compact monthly summary and its visible advance controls.
- Two parallel numbered columns make alternatives comparable without implying a required sequence.
- Existing parchment, ink and vermilion connect the advisor to the governing dossiers; the restrained red rule identifies its advice section.
- Existing serif headings and sans-serif body distinguish authority from dense decision copy.
- Spacing separates the three tradeoff categories; no ornamental cards, illustrations or new animation are added.
- Review uses the existing modal and simulated preview, including its loading and error handling. Keyboard focus returns to the advisor heading after queueing.

## Verification

- Production build passes. Vite retains its large-chunk warning.
- Full unit suite: 127 tests pass across 14 files, including five advisor tests for priorities, limits, queued decisions, draft protection, immutability, empty states and Indonesian copy.
- Advisor browser suite: six tests pass, covering both languages, both emergency choices' review paths, all fiscal and regional alternatives, cancellation, close controls, keyboard activation, focus restoration, impact previews and agenda entries.
- Existing learning browser suite: 15 tests pass, including the compact monthly summary at 1280×720 and 1440×900 in both languages.
- Accessibility checks report no advisor WCAG A/AA violations. Screenshots checked at supported desktop widths; no horizontal overflow or native disclosures/dropdowns appear.

## Antislop delivery gate

Scope: the new advisor and its integration. Desktop support starts at 1280×720 as defined in DESIGN.md; mobile is outside this game's scope.

R-01 PASS: reused paper surface; no new gradient or glow.
R-02 PASS: new advisor copy contains no em dashes.
R-03 PASS: browser overflow checks pass at supported desktop sizes; the monthly summary remains bounded.
R-04 PASS: no new decorative icons or icon libraries.
R-05 PASS: comparison layout serves two actual decisions inside the existing dossier.
R-06 PASS: existing fonts retained for the documented reading hierarchy.
R-07 PASS: no new background patterns.
R-08 PASS: no decorative arrows added to buttons.
R-09 PASS: no capsule badges added.
R-10 PASS: no glass surfaces added.
R-11 PASS: existing rectangular game controls retained.
R-12 PASS: no new component shadows.
R-13 PASS: no glow added.
R-14 PASS: parallel columns directly support comparison of alternatives.
R-15 PASS: controls name their actions: review, queue and return.
R-16 PASS: no marketing buzzwords added.
R-17 PASS: impact values come from existing simulation functions.
R-18 PASS: no testimonials added.
R-19 PASS: existing motion retained; no template animation added.
R-20 PASS: paper, game decisions and turn-time agenda retain the established presidential setting.
R-21 PASS: existing intentional map-table theme retained.
R-22 PASS: no generic illustrations added.
R-23 PASS: the requested advisor uses an existing secondary tab pattern; no visual assets added.
R-24 PASS: every new navigation button targets an implemented tab or dialog.
R-25 PASS: advisor accessibility checks pass with the existing ink-on-paper palette.
R-26 PASS: browser tests activate every new control type and queue every fiscal/regional alternative.
R-27 PASS: synchronous advice has explicit unavailable/completed states; preview reuses existing loading/error handling and queue errors remain visible.
R-28 PASS: no FAQ added.
R-29 PASS: existing palette retained.
R-30 PASS: no external product design copied.
R-31 PASS: major visual choices and their reasons are recorded above.
R-32 PASS: keyboard activation, Escape dismissal, help tooltip and post-queue focus tested.
R-33 PASS: implementation written in source files using patches.
R-34 PASS: no theme toggle introduced; existing fixed theme preserved.
R-35 PASS: production build and browser click-throughs pass.
R-36 PASS: no security, compliance or customer claims added.
R-37 PASS: direction and dials come from the project's DESIGN.md.
R-38 PASS: recommendations derive from actual game state and explain conditional simulation effects.
C-1 PASS: visual choices have documented purposes.
C-2 PASS: controls perform tested review, dismissal and queue actions.
C-3 PASS: each section presents a decision, its tradeoffs or its review.
C-4 PASS: supported desktop widths, both languages, empty states and keyboard paths verified.
C-5 PASS: outcomes use the game's existing impact analysis; no fictional factual claims added.
Liveliness PASS: existing 2/3/2 dials retained; the advice heading and numbered comparison establish hierarchy, structural spacing and the existing vermilion accent.
