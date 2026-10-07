# Learning and decision experience

Implemented optional guided play, an actionable monthly summary, bilingual explanations and handbook topics, shared action previews, individual agenda editing, explanatory turn receipts, and local draft recovery. Existing campaigns stay in standard mode unless an active walkthrough is present. New campaigns offer guidance during setup.

The interface retains the map table, paper dossiers, olive controls, and restrained rust action accent from DESIGN.md. New information uses labeled sections, tables, and navigation rather than disclosures. Essential costs and consequences remain visible; StatHelp supplements them. No native dropdowns or accordions were added.

## Monthly summary verification (2026-09-30)

### Five-section navigation update

The main dock now contains exactly Summary, Cabinet, Policy, DPR, and Regions (Wilayah), in that order. Policy settings and APBN share one dossier with visible section buttons. Existing funding routes and the budget walkthrough open that APBN section; issue-specific policy routes still focus the relevant slider. Summary always opens the current month's flow from the dock, with events available through its separate section button. Campaign UI and its obsolete guidance have been removed; saved simulation fields and action compatibility remain intact. Closing a dossier restores focus to a live dock control. The final report and summary retain election/legacy navigation without a sixth primary command.

- Latest production build passes; all 75 model 3 unit tests pass. The previous engine-expectation failures recorded below were resolved by the concurrent engine work.
- All 66 browser scenarios pass across the main suite and reruns of corrected selectors and the documented desktop-size check. The full-presidency run, preserved model 1/2 saves, draft recovery, onboarding, cabinet appointments, emergency response, DPR ordering, and regional controls remain covered.
- Five new navigation tests cover all five destinations, Policy/APBN switching, draft retention, localization changes, keyboard entry/return focus, and returning from events to the current month's summary. English and Indonesian scans cover 1280×720 and 1440×900, with axe WCAG 2 A/AA checks on all five sections and APBN. No native dropdowns or disclosures are present.
- Screenshots for each destination and APBN are in `docs/screenshots/navigation-{en,id}-{0..4,apbn}-{1280,1440}.png`. Both language summaries, APBN, policy, cabinet, DPR, and Wilayah were visually inspected. The existing paper scroll areas contain longer content; no document-level horizontal overflow was found.
- The existing delivery gate below still applies. Navigation-specific R-02/R-03/R-27/R-32/R-35/R-38 checks pass: every dock/section button reaches its named workspace, drafts persist, opening/final states remain valid, focus returns to an existing control, validation passes, and indicators/actions use current game data. R-04/R-14/R-19/R-31/R-37 retain the established icon meanings, distinct dossier layouts, existing motion, and documented ENERGY 2 / RHYTHM 3 / MOTION 2 direction. No additional tutorial or completion requirement was introduced.

The six review tasks are replaced with three visible stages: actual changes, current attention, and next action. There are no manual completion controls. The agenda retains decisions, funding estimates, and concrete warnings. The summary removes the duplicate budget table and monthly lessons. Guidance strips are suppressed during the first-month walkthrough and while the summary itself is open.

The next-action stage also offers visible **Change policies** and **Review cabinet** shortcuts in quiet months. Players prepare changes on those existing screens, then review their queued agenda before advancing. Opening a screen does not commit a policy or appointment. The monthly tab supplies the visible title; the section heading remains accessible without consuming a repeated title row.

- Production build passes, including after the concurrent model 3 upgrade. The existing Vite bundle-size advisory remains.
- Before the concurrent engine upgrade, all 66 unit tests passed, including three campaigns matching 180 pre-refactor seeded turns and legacy learning/save compatibility. The latest model 3 run has 61 passes and five failures in existing simulation expectations: seeded fingerprints, cabinet voting influence, recommended deals, opening spending, and education's immediate output. The three new summary tests pass. This UI change does not update simulation expectations or modify the engine.
- Before the engine upgrade, all 25 affected browser scenarios passed across learning, engine-v2, and game-interface coverage. All 15 monthly-flow browser scenarios now pass against model 3, including the policy shortcut and queuing a cabinet appointment from a quiet-month summary. All five localization tests pass. Added paths cover emergency routing and response removal, budget and parliamentary destinations, province and policy commitments, household trends, draft submission, quiet months, and final-term navigation.
- English and Indonesian summaries pass axe WCAG 2 A/AA scans at 1280×720 and 1440×900, with no horizontal overflow or native disclosures/dropdowns. Opening-month and completed-month screenshots were visually inspected. The advance button remains inside the dossier viewport even with three concerns and a visible notification.
- Summary navigation does not enqueue decisions or mark risks resolved. Existing review fields remain accepted in saved games and have no UI completion role.

### UI delivery gate

Evidence applies to the monthly summary and affected agenda/report controls. Existing desktop product scope and map-table direction are retained. The current global simulation-test status is recorded above; this scoped UI review does not certify the concurrent engine upgrade.

- R-02 PASS: new UI copy contains no em dashes.
- R-03 PASS (desktop scope): measured action containment and no overflow at both supported test sizes; short-window spacing keeps all three stages visible. The full game remains a desktop product.
- R-17 PASS: both change highlights derive from the engine's before/after values.
- R-18 PASS: no testimonials added.
- R-23 PASS: user-approved three-stage structure; no new image, logo, avatar, or fictional statistic.
- R-24 PASS: actions use existing Budget, Parliament, Policies, Regions, Briefing, report, and Legacy destinations.
- R-25 PASS: axe WCAG A/AA scans pass in both languages and desktop sizes.
- R-26 PASS: browser checks exercise report, emergency response, funding, parliamentary support, regional/policy commitment, regional needs, policy and cabinet shortcuts, agenda review, policy-draft review, advance, and election/legacy actions.
- R-27 PASS: opening/quiet/final states are visible; existing loading/turn-resolution handling remains; worker failure preserves the agenda and committed month.
- R-28 PASS: no FAQ introduced.
- R-32 PASS: keyboard emergency navigation reaches the focused crisis, policy navigation focuses its range control, and Escape closes agenda/report dialogs.
- R-33 PASS: UI changes were made directly in source with patches; no rewrite script used.
- R-34 PASS: existing fixed map-table theme retained; no second theme introduced.
- R-35 PASS (UI scope): build and all 15 monthly-flow browser scenarios pass on model 3; new summary unit cases and all five localization cases pass. Screenshots inspected after correcting short-window layout; both preparation buttons and advance remain inside the short-window dossier. Global engine expectations require separate resolution as recorded above.
- R-36 PASS: no security, compliance, or performance claims added.
- R-37 PASS: DESIGN.md read and updated; ENERGY 2 / RHYTHM 3 / MOTION 2 retained.
- R-38 PASS: issue summaries and counts derive from current state and queued actions.
- R-01 PASS: existing parchment, olive, brass, and vermilion palette retained; no new gradient or glow.
- R-04 PASS: no new icons.
- R-06 PASS: existing Source Serif titles and Source Sans controls retained for institutional character and legibility.
- R-07 PASS: map-table background retained; no new decorative pattern.
- R-08 PASS: no button arrows added; numerical arrows communicate actual before/after changes.
- R-09 PASS: no decorative badges added.
- R-10 PASS: no glassmorphism added.
- R-12 PASS: existing dossier elevation retained; summary rows have no shadows.
- R-13 PASS: no glows added.
- R-14 PASS: numbered ledger rows replace repeated task cards; stat facts, concerns, and next actions have distinct content structures.
- R-19 PASS: existing dossier motion and reduced-motion behavior retained; no new animation.
- R-22 PASS: no illustrations added.
- Liveliness PASS: the vermilion advance action is the focal point; rules and spacing establish reading order; parchment dossiers and existing typography preserve the game's identity and declared dials.
- C-1 PASS: DESIGN.md records why rows, bounded summaries, and context-specific destinations are used.
- C-2 PASS: all new visible actions have tested destinations or turn/agenda behavior.
- C-3 PASS: each stage answers a monthly governing question; duplicate review controls, budget content, and lessons are removed.
- C-4 PASS: opening, quiet, crowded, queued, draft, rejected-package, and final states are covered; keyboard and both localized layouts are checked.
- C-5 PASS: summary facts use existing simulation data rather than fabricated evidence.
- R-05 PASS: this is a governing summary within an existing dossier, with three user-requested stages rather than a landing-page template.
- R-11 PASS: existing rectangular game buttons retained; no pill system introduced.
- R-15 PASS: action labels name their destinations and behavior.
- R-16 PASS: no marketing buzzwords added.
- R-20 PASS: map-table dossiers, measured indicator changes, and governing decisions retain the product's identity.
- R-21 PASS: fixed theme follows explicit existing game direction.
- R-29 PASS: existing palette retained; vermilion marks advancement and warnings.
- R-30 PASS: no external-product design copied.
- R-31 PASS: DESIGN.md records layout, palette, typography, hierarchy, and motion purposes.

## Original learning rollout evidence

- Production build succeeds. Vite reports a non-blocking bundle-size warning.
- 63 unit tests pass, including bilingual teaching coverage, all action families, ordered votes, recurring relief, funding constraints, draft validation, and save compatibility.
- Three 60-month seeded campaigns match their pre-refactor serialized economic and political states exactly (180 turns).
- All 47 browser tests pass, including a full presidency, three guided monthly cycles, agenda edits and removal, English/Indonesian flows, keyboard tooltips, replacement cancellation, imports, storage errors, and worker failure recovery after reload.
- Accessibility scans and desktop containment checks cover 1280×720 and 1440×900, with existing broader desktop checks retained. Selected handbook contrast and tooltip containment were corrected during testing.
- Save fingerprints use sorted object fields so schema validation cannot invalidate an otherwise identical campaign. Draft writes require a matching successfully saved turn; a failed turn save cannot erase the prior turn’s recovery record.

## Human novice playtest still required

The automated three-month walkthrough verifies interaction and persistence, not comprehension. Recruit players without macroeconomics or political-simulation experience and ask them to complete three months without coaching. Then ask them to explain one policy tradeoff, distinguish coalition seats from proposal votes, explain delayed benefits, and identify next month’s priority. Record wrong interpretations, missed controls, and moments requiring help before deciding whether the learning experience meets the usability target.
