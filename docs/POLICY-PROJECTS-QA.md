# Policy project briefing

The policy detail view uses Briefing, Funding, and Projects tabs. Gains and risks
sit side by side; two short construction tiles explain gradual benefits and
completion. A cancellation summary explains what stays. Nine regional progress
cards use saved simulation progress and spending. Project eligibility shares
the same policy metadata as the briefing; the ten eligible policies are unchanged.

## Design decisions

Reading this as a game briefing for desktop players in the approved cheerful
island style: ENERGY 2 / RHYTHM 2 / MOTION 1.

- Cream panels and teal text preserve the established policy workspace palette.
- Nunito headings preserve its friendly hierarchy; Source Sans 3 keeps dense text readable.
- Briefing separates gains and risks, with larger effect labels and no repeated benefit labels.
- Bounded tabs keep funding controls and construction status in dedicated views.
- Sticky detail tabs remain reachable while scrolling.
- Two lifecycle tiles explain construction and completion; cancellation stays visible below.
- A compact 3×3 regional grid compares actual progress and spending.
- Benefit emblems picture the affected stats; miniature island sites picture construction and completion.
- Island artwork extends the established vector objects and scenery, without raster assets or continuous rendering.
- Existing green progress bars communicate funded construction; no motion was added.
- The existing scroll area accommodates longer Indonesian copy at laptop sizes.

## Verification

- Production build passed.
- Engine and persistence suites: 57 tests passed.
- Browser coverage: English and Indonesian at 1280×720, 1366×768, and 1440×900;
  policy selection, spending controls, keyboard focus, custom dropdown containment,
  tooltip Escape dismissal, modal dismissal, and accessibility scans.
- Completed-project fixtures use actual quarter resolution and save import,
  including cancellation and nine retained regional projects.
- Paused-project fixtures verify nine unfinished projects at approximately 40%, plus accessibility scans.
- Illustrated briefing checks cover both languages at all three supported sizes,
  text/illustration separation, readable cancellation copy, and tooltip-first Escape dismissal.
- Scroll offsets follow the measured height of pinned detail tabs.
  Regression checks place lifecycle text and cancellation copy between both bars,
  and verify that switching tabs opens the selected view at its content start.
- The policy action area is a separate flex footer outside the scroll panel,
  with an inset cream surface and aligned text/button. Regression checks verify
  that the last funding control remains above it at all supported sizes.
- Selected detail tabs retain an emerald background on hover; accessibility
  scans cover the hovered selection after tab switching.
- Stat emblems align with their labels; forecast rows reserve a separate numeric
  column so longer labels cannot overlap values or hide the balance sign.
- Visual comparison uses `docs/screenshots/world-construction-1440.png` and
  browser screenshots of the new briefing and completed-project grid.
- Direct simulation check: electricity projects pause at approximately 40%
  after one funded quarter followed by one cancelled quarter.

## Antislop delivery gate (scope: this change)

- R-02 PASS: new copy contains no em dashes.
- R-03 PASS: desktop containment is checked in both languages; mobile is excluded by AGENTS.md.
- R-17 PASS: progress and spending come from simulation state.
- R-18 PASS: no testimonials.
- R-23 PASS: requested revamp adds named tabs; user requested more imagery before island illustrations were added.
- R-24 PASS: no new links.
- R-25 PASS: accessibility scans include the new section and existing workspace.
- R-26 PASS: detail tabs switch named panels; existing policy and funding controls retain their handlers.
- R-27 PASS: unlaunched and non-construction policies have explicit states; data is synchronous.
- R-28 PASS: no FAQ.
- R-32 PASS: browser checks cover focus, keyboard actions, and Escape dismissal.
- R-33 PASS: source and styles edited through patches, not rewriting scripts.
- R-34 PASS: no theme toggle introduced; approved fixed light theme preserved.
- R-35 PASS: production build and browser interaction checks run.
- R-36 PASS: no security, compliance, or customer claims.
- R-37 PASS: approved direction and design dials recorded above.
- R-38 PASS: benefits describe existing engine channels, assets, and capacity.
- R-01 PASS: no gradients or glow introduced.
- R-04 PASS: existing emblems illustrate each affected stat and the policy's primary benefit.
- R-06 PASS: existing fonts preserved for hierarchy and dense information.
- R-07 PASS: no background patterns introduced.
- R-08 PASS: no decorative arrows introduced.
- R-09 PASS: project eligibility is a plain functional label, without a decorative badge.
- R-10 PASS: no blur introduced.
- R-12 PASS: selected detail tabs reuse short pressed shadows to communicate state.
- R-13 PASS: no glow introduced.
- R-14 PASS: lifecycle tiles and nine regional progress cards follow actual game states.
- R-19 PASS: no animations introduced; reduced-motion browser checks used.
- R-22 PASS: island illustrations show a crane during construction and a finished site afterward.
- Dials PASS: ENERGY 2 / RHYTHM 2 / MOTION 1 preserve the workspace identity.
- Hierarchy PASS: policy heading remains the focal point; section labels distinguish decision topics.
- Spacing PASS: row borders and spacing separate benefits, completion, and cancellation.
- Accent PASS: green identifies project eligibility and progress.
- Identity PASS: existing rounded cream panels, teal type, and regional terminology preserved.
- Design read PASS: recorded above and declared before implementation.
- C-1 PASS: color, typography, layout, and spacing reasons recorded above.
- C-2 PASS: detail tabs and existing controls exercised in browser checks.
- C-3 PASS: each added section answers the requested project lifecycle questions.
- C-4 PASS: localized states and desktop sizes covered, including saved completed projects.
- C-5 PASS: no invented numeric bonuses; completion explicitly awards no separate bonus.
- R-05 PASS: content-specific briefing, funding view, and regional progress grid.
- R-11 PASS: 10px lifecycle tiles and 12px regional cards use established rounded styling.
- R-15 PASS: existing specific policy actions preserved.
- R-16 PASS: new copy describes concrete construction and funding behavior.
- R-20 PASS: approved game palette and typography preserved.
- R-21 PASS: fixed cheerful light theme required by project direction preserved.
- R-29 PASS: shared cream, teal, and green palette reused.
- R-30 PASS: existing game design extended without importing another product's design.
- R-31 PASS: major decision reasons recorded above.
