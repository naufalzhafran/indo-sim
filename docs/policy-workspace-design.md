# Policy workspace

## Player decision audit, 6 October 2026

Design read: a turn-planning screen for IndonesiaSim players in the approved cheerful island-game style. ENERGY 2 / RHYTHM 2 / MOTION 1. The existing cream surfaces, teal text, emerald choices, miniature resource objects, Nunito headings and tactile controls remain the design reference.

### Findings and changes

| Priority | Player problem | Implemented response |
| --- | --- | --- |
| P1 | The large policy price excludes startup, so the first quarter can cost twice the advertised amount. | Show recurring plus unpaid startup as the next-quarter cost; retain both components directly underneath. |
| P1 | Tax settings describe generic tradeoffs without showing what the selected plan changes. | Show next-quarter income, jobs and poverty differences against continuing the current choices, from the existing attributed forecast. Jobs are converted from the engine's millions to people; income is a percentage relative to the unchanged forecast; poverty uses percentage points. |
| P1 | A tax-only or allocation-only edit can leave the review saying no policy changes. | A unified plan review includes launches, stops, regional priority edits and current-to-planned tax rates. Each entry returns to its relevant controls. |
| P1 | Visible tax receipts minus policy spending do not explain the budget balance. | Show total revenue and total spending including interest, with taxes and policy spending as subordinate parts. Their difference is the displayed balance. Show both borrowing and repayment if the monthly results contain both. |
| P1 | Low/Medium/High reads like a budget increase, although the national total is fixed. | Name the control regional priority and visibly explain that raising one region's share lowers others. Label the allocation amounts as planned budgets, distinct from forecast delivery. |
| P2 | The player cannot tell whether closing commits the plan. | Keep automatic draft saving, state when changes take effect in a persistent footer, and provide a bounded Return to map action. Advancing remains on the map. |
| P2 | A generic higher-tax warning stays unchanged even when lowering the rate. | Show consequences for the chosen increase/decrease, an explicit current-to-next-quarter comparison, and Restore current rate per changed tax. |
| P2 | “Ready in” promises completion and duplicates status/effect labels compete for attention. | Use “Planned rollout”; remove redundant status badges and merge identical effects while retaining meaningful qualifiers. |
| P2 | New information can push the first choice's action below the laptop viewport. | Share the top row between mode selection and forecast comparison, combine search/category/status filters, and place draft/return actions in a full-width footer. The first policy action is checked for full containment. |
| P2 | Moving the pointer can dismiss a hint whose trigger still has keyboard focus. | Keep focused hints open until blur or Escape. Pointer-only hints retain their existing dismissal delay. |

### Intended player flow

1. Browse or search by policy name, purpose, category or effect. Compare benefits, downsides and the full next-quarter cost.
2. Add at most two new policies within eight total slots, or review a running policy. Briefing, Funding and Projects remain dedicated tabs.
3. Use regional priorities to redirect a fixed planned budget. Review requested allocations and the funding forecast separately.
4. Choose tax rates. Read the direction-specific tradeoff and compare the whole plan with keeping current choices.
5. Review all changed policies, allocations and taxes. Undo the latest edit, restore an individual tax, or reset the draft.
6. Return to the map. The draft stays saved; the player advances the quarter when ready.

### Design reasons

- The comparison strip answers whether a choice helps households and jobs without adding another permanent dashboard panel. Its baseline is visible; the separate hint explains methodology and longer-term effects.
- Total next-quarter prices make choices comparable without mental arithmetic. Source Sans 3 and tabular figures keep the breakdown readable.
- The plan roster acts as a review of the player's decisions, including changes that were previously invisible. Its independent scroll preserves access to capacity and funding.
- The footer separates reversible planning from advancing time. Emerald preserves the existing selection language; coral remains associated with advancing the quarter.
- Uniform cards support comparisons between policies or tax settings. Detail tabs retain more space for the briefing, regional controls and projects.
- No new art, theme, simulation tuning, continuous animation, native selects, accordions or generic notice banners are introduced.

### Verification for this revision

- `npm test`: 122 tests passed across 10 files.
- Production build and formatting checks passed for all changed source and test files.
- All 19 distinct policy-workspace browser scenarios have passing coverage. The first full run passed 18/19 and exposed the focused-hint issue; after its fix, the clean final layout run passed 8/8 and the affected Indonesian 1280×720 scenario passed two additional repetitions. The separate all-25-policy and regional-budget interaction test also passed.
- Browser coverage includes policy limits and active/planned status, all 25 policy choices, independent regional budgets, draft reload, tax restoration, exact forecast attribution and money totals, unavailable-forecast retry, insufficient funding, completed/paused projects and full portfolios.
- Keyboard checks exercise tabs, Home/End, policy/detail focus, tax review navigation, individual rate restoration, modal focus return and Escape ordering. All tax choices and their hints are exercised; a focused-hint dismissal failure was fixed and the affected laptop scenario passed twice afterward.
- English and Indonesian layouts are checked at 1280×720, 1366×768 and 1440×900, including first-action visibility, custom dropdown containment, tooltip pointer access and WCAG A/AA scans. Browser tests run with reduced motion.
- Visual inspection compares the catalogue, taxes, policy briefing, regional funding and project states with the approved cream/teal visual identity. Compact laptop detail headers leave room for the actual briefing; larger desktop cards retain the established spacing.
- Final screenshots: `docs/screenshots/policy-ux-audit-id-1366.png`, `docs/screenshots/tax-ux-audit-id-1440.png`, and 42 images in `verification-results/policy-ux-verified-layout`. Final viewport runs report no page errors or WCAG A/AA violations.

### Current antislop delivery gate

- R-02 PASS: source scan found no em dash in changed modal or hint copy.
- R-03 PASS: supported laptop/desktop containment and first-action checks pass; mobile is excluded by explicit project instructions.
- R-17 PASS: prices, rates, counts and effect values come from the existing catalogue and attributed simulation forecast.
- R-18 PASS: no testimonials or fictional people were added.
- R-23 PASS: existing approved resource emblems and controls are reused; no new visual assets were invented.
- R-24 PASS: tabs, review entries and return actions target existing game views.
- R-25 PASS: browser WCAG A/AA scans report no contrast violations in the changed modal states.
- R-26 PASS: search/category/status filters change results; add/remove/stop edits the plan; detail tabs show briefing/funding/projects; radios edit allocations and taxes; restore/undo/reset update the draft; review entries focus the relevant view; return closes and restores focus; forecast Retry recovers without losing choices.
- R-27 PASS: empty results, unchanged plans, calculating/unavailable forecasts and insufficient funding have specific states; existing save failure/retry remains connected to the save handler.
- R-28 PASS: no FAQ or unrelated content was added.
- R-32 PASS: keyboard, focus containment, visible radio focus, focused-hint persistence and tooltip-before-dialog Escape checks pass.
- R-33 PASS: changes are in TSX/CSS source, applied directly without source-rewriting scripts.
- R-34 PASS: the approved light theme is preserved; no theme toggle was added.
- R-35 PASS: production build, unit tests, browser interactions, screenshot inspection and page-error checks were run.
- R-36 PASS: no security, performance or customer claims were introduced.
- R-37 PASS: the explicit project art direction and ENERGY 2 / RHYTHM 2 / MOTION 1 guide this revision.
- R-38 PASS: all player-facing information comes from existing mechanics or describes actual control behavior.
- R-01 PASS: approved cream/teal/emerald colors preserve the game's identity; no gradients or glows were added.
- R-04 PASS: existing resource emblems identify policy effects and tax bases.
- R-06 PASS: Nunito keeps the friendly game headings; Source Sans 3 supports explanatory text and tabular values.
- R-07 PASS: no decorative grid, blueprint or texture was added.
- R-08 PASS: arrows show actual effect direction or current-to-planned tax rates, not decorative navigation.
- R-09 PASS: all counts and statuses describe real draft or campaign state.
- R-10 PASS: no glass effects were added.
- R-12 PASS: existing short bottom shadows distinguish bounded, tactile controls.
- R-13 PASS: no glow was added.
- R-14 PASS: repeated card fields support comparing equivalent policy and tax choices; detail and review use distinct layouts.
- R-19 PASS: no new animation was added; reduced-motion styles remain in effect.
- R-22 PASS: existing illustrations remain connected to policy projects and island resources.
- Liveliness PASS: declared dials, choice-focused hierarchy, structural spacing, emerald selection accent and the game's established resource/typography motif are retained.
- C-1 PASS: price hierarchy, comparison strip, review roster and footer each have a player decision purpose described above.
- C-2 PASS: browser click-throughs verify the controls listed under R-26.
- C-3 PASS: each section supports choosing, understanding, reviewing or applying the next-quarter plan.
- C-4 PASS: supported viewports, both languages, keyboard flow, empty results and forecast failure/recovery were checked.
- C-5 PASS: exact forecast tests compare displayed amounts with engine results, including conversion from millions of jobs.
- R-05 PASS: the layout follows the existing game's choice-and-review flow.
- R-11 PASS: cards, dialogs and controls retain the established distinct corner sizes.
- R-15 PASS: actions identify the task: add, remove, restore current rate, undo, reset and return to map.
- R-16 PASS: no marketing copy was introduced.
- R-20 PASS: resource objects, rounded headings, cream panels and tactile controls retain IndonesiaSim's visual identity.
- R-21 PASS: no unrequested theme was introduced.
- R-29 PASS: the existing palette and consequence colors are reused.
- R-30 PASS: the reference is the game's approved UI, not an external product.
- R-31 PASS: major layout, typography, color, spacing and navigation decisions have written reasons above.

---

## Earlier workspace design and verification

Design read: a quarterly planning board for players of IndonesiaSim, using the approved cheerful island-game language. ENERGY 2 / RHYTHM 2 / MOTION 1.

- Frame: share Ekonomi's large native dialog, cream surface, teal type and short raised edges so both national planning screens belong to the same game.
- Layout: a three-column policy catalogue supports comparison; the narrower plan board keeps slot limits, policy changes and funding visible during selection. Its roster lists only new launches and scheduled stops, while unchanged active policies remain in the catalogue.
- Cards: use the same fields and order for comparable policy costs and effects, while keeping regional allocations in the dedicated detail view.
- Typography: bundled Nunito carries game headings and controls; Source Sans 3 keeps effects and money easy to scan.
- Emblems: reuse the miniature resource and industry objects from Ekonomi. Cargo, excise products and a car identify import duty, excise and luxury purchases respectively.
- Selection: emerald controls, a visible check and text distinguish planned policies. New, continuing and ending statuses retain their actual simulation meaning.
- Spacing: wider gaps separate catalogue, plan and budget; compact spacing groups each policy's consequences with its costs and actions.
- Alignment: plan buttons use a fixed 32px icon column and a flexible left-aligned text column, including names that wrap. Only the roster scrolls; capacity, budget and draft actions stay in their own rows.
- Motion: retain pressed and hover feedback. Reduced motion disables transitions; the change adds no continuously animated scenery.
- Rules: counts expose the eight-policy and two-launch limits; the brief states when changes take effect. Decision-critical costs and consequences remain visible on cards.
- Status filters: Active counts policies running in the completed game state; New planned / Rencana baru counts only draft policies that are not active yet. Continuing policies remain in next quarter's funding plan without being counted as new launches. Stopping a policy changes the draft immediately and its active status only when the quarter advances.
- Status wording: active selected cards say Continuing / Dilanjutkan; new selected cards say New planned / Rencana baru. The tab reports slots used / slot terpakai. Policy changes / Perubahan kebijakan shows an empty state and the active count when there are no launches or stops.
- National economy: policy effects use separate Active / Aktif and New planned / Rencana baru filters. Active cards show one active status; only inactive draft additions appear in the new filter. Scheduled stops remain active until quarter progression and show their upcoming stop explicitly.
- Scope: laptop and desktop sizes only, as required by AGENTS.md. The map, simulation, tax tuning and persistence format are preserved.

## Verification

- `npm run validate`: 118 unit tests passed and the production build passed. The final production build and Prettier check also passed after the alignment changes.
- 24 relevant browser scenarios passed across the initial run and corrected reruns: policy limits, catalogue editing, spending allocations, draft persistence, tax undo/reset, national-economy navigation and both languages at 1280×720, 1366×768 and 1440×900.
- Final targeted run: 9/9 passed. Final alignment run after the last layout changes: 3/3 passed, including the eight-policy portfolio and both languages at 1280×720.
- Status-filter follow-up: 4/4 browser tests and the production build passed. English/Indonesian regressions verify seven active policies yield zero new planned launches, adding a policy increments only the new-launch count, scheduled stops remain active until quarter progression, and progression clears the pending launch count. Laptop layout and accessibility checks also passed with the new labels. Screenshots are in `verification-results/policy-status-filters`. Delivery gate remains PASS.
- Sidebar and card-label follow-up: 8/8 browser tests passed against the production build, which also passed. Both languages verify seven unchanged active policies produce an empty change roster, continuing labels, seven occupied slots and zero new launches. Adding and stopping policies produces only those changes in the roster; advancing clears it. The 1280×720 checks cover policy/tax layouts, accessibility and an eight-change roster with aligned icons and contained funding controls. Current screenshots are in `verification-results/policy-changes-production`. Delivery gate remains PASS.
- National economy wording follow-up: production build, formatting and 8/8 browser tests passed. Both languages verify separate active/new counts, scheduled stops, new launches and navigation to the matching policy. All three supported viewports passed layout, keyboard and accessibility checks. Rendered Indonesian and English effects states were inspected; screenshots are in `verification-results/national-policy-status`. Delivery gate remains PASS.
- The full-portfolio check asserts identical icon and text left edges for every plan card, a fully visible first card, and capacity/budget/action containment. A separate seven-policy rendered check measured identical icon positions (1159px) and text positions (1199px) at 1440px.
- Browser accessibility checks found no WCAG A/AA violations in the policy and tax workspace at every supported size and language. Keyboard tests cover tabs, native modal containment, detail/back navigation, custom dropdowns and hint dismissal before dialog dismissal.
- Manual recovery check: forced forecast-worker failure, restored Worker, clicked Retry, and verified the forecast recovered. Budget and effect hints remain readable under pointer hover; Escape dismisses them while preserving the modal.
- Rendered screenshots are in `verification-results/policy-workspace-final`, `verification-results/policy-workspace-alignment`, and `docs/screenshots`. Inspected catalogue, selected policies, tax cards, regional spending and full-portfolio states against Ekonomi and the approved cream/teal island UI.

## Antislop delivery gate

The gate applies to this requested workspace change. Explicit project instructions restrict device support to laptops and desktops and preserve the established light game theme.

### Hard gate

- R-02 PASS: no em dash was introduced in workspace copy.
- R-03 PASS: browser containment checks passed in English and Indonesian at all three supported desktop/laptop sizes; project instructions exclude mobile layouts.
- R-17 PASS: costs, tax rates, counts and forecasts come from the existing catalogue and game state.
- R-18 PASS: no testimonials or invented people were introduced.
- R-23 PASS: the user requested a larger modal, icons and cards; emblems extend the approved resource-object system.
- R-24 PASS: tabs, plan cards and return controls all lead to existing views.
- R-25 PASS: automated contrast checks passed after correcting muted save text and selected filter-count backgrounds.
- R-26 PASS: add/remove edits the draft; details and plan cards open allocations; regional radios edit shares; tax radios update rates; filters/search change results; reset-filters restores the catalogue; undo/reset restore draft history; return/close/backdrop/Escape dismiss appropriately; retry recovers forecasting. Save retry uses the existing save handler.
- R-27 PASS: empty catalogue and plan, calculating forecast, unavailable forecast, save failure and campaign recovery states are handled.
- R-28 PASS: no FAQ was introduced.
- R-32 PASS: keyboard tests passed for tabs, dropdowns, policy actions, spending controls, focus return, modal containment and Escape ordering.
- R-33 PASS: implementation is in TSX/CSS source; no rewriting scripts were introduced.
- R-34 PASS: the approved light theme is preserved; no new theme toggle was introduced.
- R-35 PASS: production build, browser click-throughs, page-error checks, accessibility scans and rendered screenshot inspection completed.
- R-36 PASS: no security, customer or performance claims were introduced.
- R-37 PASS: direction follows AGENTS.md, Ekonomi and the approved island screenshot; dials are declared above.
- R-38 PASS: policy purposes, consequences and metrics use existing game content.

### Purpose gate

- R-01 PASS: established cream/emerald/teal surfaces are preserved; no gradients or glows were introduced.
- R-04 PASS: resource/industry objects identify policy effects; cargo, excise products and a car correspond to the relevant tax bases.
- R-06 PASS: Nunito preserves the friendly game voice; Source Sans 3 supports dense economic information.
- R-07 PASS: no decorative background grid or pattern was introduced.
- R-08 PASS: effect arrows communicate direction; no decorative CTA arrows were introduced.
- R-09 PASS: labels reflect actual new, running, ending and planned statuses.
- R-10 PASS: no glassmorphism was introduced.
- R-12 PASS: short bottom shadows distinguish the dialog frame, inventory cards and tactile controls, matching Ekonomi.
- R-13 PASS: no glow was introduced.
- R-14 PASS: uniform comparison fields support equivalent policy decisions; allocation detail and the funding board have distinct layouts.
- R-19 PASS: only interaction feedback is used; reduced motion disables transitions.
- R-22 PASS: miniature emblems connect the controls to resources and objects in the island game.

### Liveliness

- Dials PASS: ENERGY 2 / RHYTHM 2 / MOTION 1 reflects the approved cheerful game language.
- Consistency PASS: rounded inventory tiles, compact information and restrained pressed feedback follow those dials.
- Focus PASS: the policy/tax catalogue is the largest area; the funding board supports the current choice.
- Whitespace PASS: distinct gaps separate catalogue, roster and budget; tighter spacing groups costs with actions.
- Accent PASS: emerald identifies selected/planned choices; coral remains reserved for quarter commitment outside this modal.
- Identity PASS: miniature resource objects, cream surfaces, rounded Nunito headings and short shadows repeat the approved motif.
- Design read PASS: the planning-board interpretation and explicit dials are recorded above.

### Craftsmanship and quality locks

- C-1 PASS: frame, layout, cards, type, emblems, selection and motion each have a stated purpose above.
- C-2 PASS: interactive controls use real handlers and the browser checks verify their effects.
- C-3 PASS: sections serve policy comparison, allocation, tax choice, plan capacity or funding review.
- C-4 PASS: supported viewports, both languages, keyboard flow, empty results, full portfolios and forecast recovery were verified.
- C-5 PASS: all numbers and policy content are sourced from the existing simulation.
- R-05 PASS: the requested planning catalogue and budget board follow game decisions rather than a landing-page template.
- R-11 PASS: dialog, cards, controls and emblems retain distinct established corner radii.
- R-15 PASS: actions name concrete tasks: add/remove, detail, undo/reset and return to map.
- R-16 PASS: no marketing buzzwords were introduced.
- R-20 PASS: the modal shares IndonesiaSim's established tabletop visual identity.
- R-21 PASS: the user-approved light theme is preserved.
- R-29 PASS: the existing palette and game status colors are reused.
- R-30 PASS: the visual reference is this game's Ekonomi modal.
- R-31 PASS: major design decisions and their reasons are recorded above.

## Project briefing layout follow-up

The Dana Desa lifecycle section spread a short explanation across a tall heading, three repeated illustrations, two wide cards and a detached stopping explanation. The revised section uses one compact illustration beside the project heading and benefit. Construction, completion and stopping consequences share three aligned columns, so the player can compare the full lifecycle in one place. Existing mechanics, copy and action behavior are preserved.

The production build and formatting checks passed. Both illustrated briefing browser tests passed, covering Indonesian and English at 1280×720, 1366×768 and 1440×900. Checks include the three stages, retained-benefit and refund wording, viewport containment, funding/project navigation, the action footer, tooltip dismissal and accessibility. Rendered screenshots were inspected; the compact section is recorded in `docs/screenshots/policy-briefing-dana-desa-section-id-1366.png`, with the full modal in `docs/screenshots/policy-briefing-dana-desa-id-1366.png`. Antislop delivery gate remains PASS for this scoped layout change.

### Effect hint correction

The layout review missed the standalone “Expected gains / Perkiraan manfaat” help label below the lifecycle. It appeared to introduce missing estimates, although its tooltip only explained the effect arrows. Removed that row and attached the explanation to the existing “What improves / Yang meningkat” heading, beside the arrows it describes. The separate circled help button and approved typography remain unchanged.

Correction verification PASS: production build and Prettier passed; both existing briefing browser tests passed in English and Indonesian across all three supported sizes. Funding and project tabs, action controls, keyboard help focus, tooltip containment and Escape ordering passed; axe reported no violations. English heading and Indonesian lifecycle screenshots were inspected. Evidence: `docs/screenshots/policy-effect-hint-id-1366.png` and the updated full-modal briefing screenshot. No new controls, data claims, palette, animation or simulation changes were introduced. The scoped delivery gate passes with the established design dials.

## Project completion rewards

The player requested project impact, so the selected-policy numerical comparison and its worker mode were removed. The player explicitly chose a fixed stat reward on completion, authorizing a gameplay change: each regional construction project grants its configured reward once at 100% progress.

Rewards are defined in `src/engine/economy/projectRewards.ts`, shared by the engine and UI. Dana Desa adds two infrastructure points to every province in its project's region, capped at 100. Other projects improve the relevant regional infrastructure, water access, healthcare access, usable power capacity or industry capacity. Capacity bonuses increase capacity, not immediate output or jobs; subsequent output still follows the existing simulation.

The completion stage and every regional project card show the actual reward, its unit and its regional scope. Completed rewards show that they have been granted. A persisted completion flag prevents further awards from continued funding, stopping/restarting, replaying the report or saving/loading. Completed projects in older saves receive their previously ungranted reward when the next quarter runs; their cards state that it is pending.

The three-stage construction layout, approved palette and existing illustration remain. The reward belongs in the completion stage, without a separate national forecast panel. Design dials remain ENERGY 2 / RHYTHM 2 / MOTION 1.

### Verification and scoped delivery gate

- Build/format PASS: final production build, TypeScript and Prettier passed.
- R-17/R-38/C-5 PASS: all 137 unit tests passed, including 15 reward tests covering the shared catalogue, regional application, point caps, persistent capacity, healthcare/development, completion timing, save/load, legacy saves and repeat prevention. Reward amounts are explicit game rules approved as a gameplay change.
- R-26/R-27/C-2 PASS: project completion grants the displayed stat reward, marks it granted, persists it across save/load and does not grant it again on following quarters. Paused and completed project states retain their existing behavior. Ended campaigns do not promise an unavailable next-quarter award.
- R-03/R-25/R-32/C-4 PASS: all 12 targeted browser scenarios passed: eight new project-reward cases plus four affected briefing and completed-project regressions. English and Indonesian layouts passed at 1280×720, 1366×768 and 1440×900, including accessibility, containment, navigation and existing hint dismissal. A real clinic project at 99.94984% remains labelled 99% until actual completion, then shows 100% and the granted reward; the regional construction display also reserves 100% for completed work.
- R-35/C-1/C-3 PASS: rendered lifecycle and regional project cards were inspected. The fixed reward, region scope and cap are visible beside construction progress and in the completion stage. The rejected policy comparison is absent. Screenshots are `docs/screenshots/project-reward-briefing-id-1366.png`, `docs/screenshots/project-reward-cards-id-1366.png` and `docs/screenshots/project-completion-reward-id.png`.
- Purpose/liveliness/quality locks PASS: reward rows extend the existing construction cards with shared cream/teal/emerald styling and rounded typography. No unrelated dashboard, added illustration, animation, accordion or unsupported device layout was introduced.
