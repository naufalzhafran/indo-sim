# Map-table interface verification

Verified 29 September 2026 using Playwright Chromium on macOS. This is the acceptance record for the desktop GUI revamp; the older QA document describes the preceding interface.

## Results

### Indonesia detail priority follow-up

- PASS: replaced the 2,673-point playable province asset with Ardian Saputra Hasibuan's 22,137-point, 38-province source (MIT; source attributes BIG). Kepulauan Riau now includes 73 island polygons instead of 14. The importer preserves all source vertices, rounds coordinates to five decimals, and normalizes province codes by name to preserve save identifiers.
- PASS: neighboring geometry reduced from 7,333 to 2,265 points using topology-aware 3% retention. All 15 country features survive, including Singapore and Brunei. Asset sizes are 461,866 bytes for Indonesia and 39,104 bytes for context. Validated finite coordinates and closed polygon rings for both assets.
- PASS: production build and all ten map/interface workflows, including camera state, overlays, province selection, projection refresh, recovery, and all four desktop sizes. Vite still emits its non-blocking bundle-size advisory.
- Performance PASS: cached pan/zoom benchmark JavaScript CPU was 815 / 787 / 781 ms across three runs (median 787 ms versus 788 ms before adding Indonesian detail), so the workload shows no material regression.
- Visual/design PASS: inspected `map-detailed-indonesia.png` and `map-detailed-riau.png`. Detailed playable coastlines contrast with simplified neighboring silhouettes, matching the user's requested allocation of detail. In-app credits, research copy, bundled license, and THIRD-PARTY.md now identify the current source.

### Map performance and simplification follow-up

- PASS: projected country/province paths, graticules, bounds, and marker centroids are memoized by geometry and projection. Pan, wheel zoom, and hover no longer regenerate coastlines. The regional regression verifies camera movement reuses paths and framing/viewport changes refresh them.
- PASS: regional coordinates reduced from 68,066 to 7,333 (89.2% fewer); uncompressed asset reduced from 1,541,911 to 123,342 bytes (92.0% smaller). All 15 countries retain nonempty polygon geometry; rings are closed and coordinates finite. Singapore and Brunei remain. The SHA-256 of playable province data is unchanged: `389ffc7a79cad4908bd77482e9bd968bb6ec64178b59eb08bc5e28786673f523`.
- PASS: repeatable Chromium development-server workload in `scripts/benchmark-map.mjs`, 1440 × 900, 90 drag steps plus 24 wheel inputs, three runs. JavaScript CPU milliseconds before: 10,483 / 10,368 / 10,460; after caching and simplification: 802 / 788 / 784. Median reduction is 92.5%; these are workload CPU measurements, not a universal FPS guarantee.
- PASS: the ten map/interface workflows passed, including map recovery, projection invalidation, province search, camera persistence, all four desktop sizes, and turn-report interactions. The separate engine save-compatibility workflow also passed. A broader suite run exposed an unrelated outdated `.party-list` selector in the engine-v2 Parliament workflow after that interface changed; it is not evidence of a map regression.
- Visual PASS: inspected `map-simplified-region.png` and `map-simplified-riau.png` at regional and close zoom. Simplified neighboring land remains distinguishable from playable provinces and preserves Singapore's regional context. Rebuild instructions and simplification provenance are recorded in THIRD-PARTY.md.

### Regional geography follow-up

- PASS: neighboring countries now render beneath the 38 playable provinces using locally bundled, public-domain Natural Earth geometry. The default Indonesia framing includes regional context; the Map view dropdown can fit Southeast Asia.
- PASS: province search fits complete feature bounds, retaining the dispersed Kepulauan Riau islands in view. The existing 14-polygon province geometry matches the upstream source exactly; it remains simplified, and this change does not claim to improve survey accuracy or coastline detail.
- PASS: a new browser workflow verifies Malaysia/Singapore geometry, all 38 playable provinces, Riau containment at 1280 × 720, layer and framing preservation across dossiers, and independent regional-data failure/retry. All ten regional/interface workflows and the production build passed. Vite reported a non-blocking bundle-size advisory.
- Visual/design PASS: reviewed `map-neighbors.png`, `map-southeast-asia.png`, and `map-riau.png`. Neighboring land uses muted sage to distinguish it from playable provinces; labels retain screen size at higher zoom. Provenance and public-domain terms are recorded in THIRD-PARTY.md.

### Custom dropdown follow-up

- PASS: all eight native-select locations now use `GameSelect`, a shared parchment listbox. Source search finds no rendered native select controls. Existing option values, translation, disabled ministers, and queued decisions remain intact.
- PASS: the popup is portaled above scrolling dossiers, constrained to desktop bounds, and opens upward near the bottom edge. Long labels wrap in the popup; long lists scroll internally. Pointer hover does not force list scrolling.
- PASS: Arrow keys, Home/End, type-ahead, Enter/Space, Escape, Tab, outside click, and focus restoration are implemented. The new browser regression checks keyboard selection, disabled choices, cancellation, containment, and an open-panel WCAG A/AA scan.
- PASS: 21 existing browser workflows after migrating native-select test actions to real custom-option clicks; the additional dropdown regression passed separately. Production build passed. Visually inspected `docs/screenshots/custom-dropdown-1280.png`.
- Purpose/design PASS: the panel reuses the existing paper, ink, brass border, and vermilion selection treatment to keep choices within the map-table interface; no artwork, engine, or save-schema changes are needed.

### Spacing and overflow follow-up

- PASS: removed native range-input margins that extended sliders four pixels beyond policy columns; containment assertions now include individual policy items and HUD indicators.
- PASS: constrained HUD grid children so longer Indonesian indicator labels cannot displace neighboring values. Visually reviewed the Indonesian guided policy dossier at 1280 × 720.
- PASS: moved notifications into a dedicated shell row between the scene and command dock. A regression verifies the notification, dossier, and dock do not overlap.
- PASS: modal headers now remain outside the independently scrolling body; a regression scrolls the turn report to its end and verifies header separation and action visibility.
- PASS: setup actions flow after the form rather than covering minister selectors. Added scroll clearance for setup navigation and pinned policy summaries, stable scrollbar gutters, title clearance around the dossier close button, and spacing between policy labels and values.
- PASS: production build; all 17 existing browser workflows; then all nine interface workflows including the new overlap regression and strengthened four-size containment checks. Browser runs required `NODE_OPTIONS='--import tsx'` for the simulation JSON fixtures in this environment.
- Visual evidence: `spacing-setup-1280.png`, `spacing-policies-id-1280.png`, and `spacing-policies-scrolled-1280.png` in `docs/screenshots`, plus refreshed report and desktop dossier screenshots. Existing design direction and delivery-gate rationale below remain applicable.

- `npm run build`: PASS. TypeScript and Vite production build, including the simulation worker, bundled fonts, and geography.
- `npm test`: PASS, 22 tests across three files. Includes the existing 17 simulation/inauguration tests and five localization tests.
- `npm run test:e2e -- --workers=2`: PASS, 17 browser workflows. Four existing game workflows, two onboarding workflows, eight new interface workflows, and three localization workflows.
- Final visual corrections: PASS, the ten onboarding/interface workflows were rerun after resetting setup scroll on stage changes and separating campaign names from support meters. The production build passed again.
- Desktop containment: PASS at 1280 × 720, 1440 × 900, 1920 × 1080, and 2560 × 1080. No document overflow or horizontal dossier/inspector overflow; the turn control stays in the viewport.
- Visual review: PASS. Inspected the map, governing dossiers, setup, walkthrough, monthly report, and legacy screenshots. Scrollable papers intentionally show a portion of long content and keep navigation available.
- Accessibility: PASS for the automated WCAG A/AA scans of the primary views, setup stages, walkthrough, report, evidence, campaign, and ending. English and Indonesian workflows pass. This is not a claim of exhaustive assistive-technology certification.

## Recorded interactions

- All 38 province shapes: focus and Enter select the province. All five layers change the map data. Zoom, pan in each direction, reset, and cursor-centered wheel zoom work.
- Province finder: search narrows results, an unmatched query displays an empty state, selection opens and centers the province and focuses its heading.
- Province inspector: Overview disclosures show contributions/households. Development queues allocation and connectivity projects; pause/resume resolves correctly. Close and reopen work.
- Map markers: an unfinished project opens Development; a crisis opens Briefing with the selected province's emergencies first. Monitoring queues a real response.
- Command dock: all seven commands open the intended view. The original map DOM, camera transform, layer, and selection survive dossier switching. Inactive map shapes cannot receive focus. Escape closes a dossier and restores focus to its command.
- Policies: sliders update estimates; reset restores enacted values; an unsubmitted draft survives switching to Budget and back; submission queues a package. The full presidency exercises approved and rejected legislation.
- Cabinet and Parliament: appointments, coalition departures, and regional agreements queue and resolve through the existing simulation.
- Agenda: shows four distinct staged decisions in the workflow, supports removal, and resolves a turn. Cleared agendas show an empty state.
- Turn report: exact indicator deltas match the deterministic simulation result. It shows the resolved month and actual outcomes. Open briefing navigates to Briefing; Return to map resumes play. Two synchronous advance clicks commit only one turn. Reload does not replay a report.
- Campaign and ending: destination, spending, and platform changes resolve; the complete 60-month workflow reaches the election/legacy; further advancement is disabled.
- Game menu and dialogs: help, evidence, new presidency, and export remain accessible. Native dialogs close with Escape or their close control. Indicator explanations and policy evidence open correctly.
- Saves: export/download, reload, compatible import, corrupt import, and blocked storage are exercised. A replacement setup can be canceled without replacing the saved administration.
- Onboarding and walkthrough: all four stages, cabinet validation, policy presets/customization, review/edit, tutorial opt-out, persistence, skip/restart, and first-turn report-to-briefing progression pass.
- Recovery: failed map loading retries successfully. An injected worker failure preserves the queued agenda and original month. Storage errors remain visible while play continues.
- Reduced motion: desktop composition tests use the reduced-motion preference; transitions are disabled while controls and layouts remain functional.

## Antislop delivery gate

### Hard gates

- R-02 PASS: source scan contains no em dash in UI copy.
- R-03 PASS within the user's explicit desktop-only scope: containment tests cover all four supported desktop sizes. Mobile support was explicitly excluded.
- R-17 PASS: indicators, map colors, markers, and reports derive from existing game state and simulation results.
- R-18 PASS: no testimonials or fabricated social proof were added.
- R-23 PASS: the user approved the map-first structure, warm map-table style, and monthly reports. Existing geography and minister monograms are reused; no official seal or portrait was invented.
- R-24 PASS: all dock commands map to implemented governing views; source review finds no placeholder navigation.
- R-25 PASS: automated contrast scans pass after correcting muted labels and active-command hover styling. Paper entry motion no longer reduces text opacity.
- R-26 PASS: actual control behavior is recorded above; no decorative control is presented as functional.
- R-27 PASS: map/loading errors, save failures, worker recovery, empty search, empty agenda, initial history, and absent projects have visible states.
- R-28 PASS: no FAQ or unrelated filler sections were introduced.
- R-32 PASS: province keyboard selection, modal dismissal, focus restoration, inert background content, and keyboard-focusable dossier scrolling are verified.
- R-33 PASS: changes were authored directly in source. Prettier was used only for formatting.
- R-34 PASS: one approved map-table theme is implemented; no theme toggle advertises an unsupported mode.
- R-35 PASS: the app ran in Chromium, production build completed, browser workflows exercised the controls listed above, and screenshots were reviewed.
- R-36 PASS: no performance, security, or compliance claim was added to the game.
- R-37 PASS: DESIGN.md records the approved direction and Energy 2 / Rhythm 3 / Motion 2.
- R-38 PASS: the existing fictional game setting and model assumptions remain disclosed; no fabricated real-world claims were added.

### Purpose gates

- R-01 PASS: subtle surface gradients distinguish the raised command rails and paper surfaces; rationale is in DESIGN.md.
- R-04 PASS: map, ledger, cabinet, parliament, and briefing icons identify their actual commands; triangle and tool markers identify crises and projects.
- R-06 PASS: bundled serif headings establish the institutional dossier character; sans-serif controls support dense reading.
- R-07 PASS: geographic graticules belong to the atlas, and fine paper texture supports the map-table setting.
- R-08 PASS: arrows indicate month progression or existing evidence/navigation actions, not every button.
- R-09 PASS: numeric badges show actual unresolved crises and queued decisions.
- R-10 PASS: no backdrop blur or glass panels are used.
- R-12 PASS: shadows distinguish raised controls, paper layers, and land relief from the map surface.
- R-13 PASS: no decorative glows are used; visible focus outlines retain their accessibility purpose.
- R-14 PASS: the atlas, ledger, policy comparisons, minister dossiers, parliament, dispatches, and legacy use content-specific structures.
- R-19 PASS: short paper-entry movement and button feedback support interaction, with reduced-motion overrides.
- R-22 PASS: real bundled geography supplies the visual centerpiece; no stock illustration or generated portrait is used.

### Liveliness and craftsmanship

- Liveliness PASS: declared 2/3/2 dials, map focal point, persistent command rails, distinct dossier compositions, and a restrained vermilion turn action are visible in the screenshots.
- C-1/C-3/R-05/R-20/R-30/R-31 PASS: DESIGN.md explains the layout, color, typography, spacing, iconography, and physical-paper treatment. The composition is specific to Indonesia's governing simulation.
- C-2/C-4 PASS: working control flows, errors, keyboard interactions, and desktop containment are covered above.
- C-5 PASS: turn changes are checked against the engine result rather than fabricated for presentation.
- R-11 PASS: controls use small consistent corner radii; paper panels are rectangular.
- R-15/R-16 PASS: actions use concrete labels such as Find a province, Review decisions, and Advance month; no generic marketing copy was added.
- R-21/R-29 PASS: the user-selected fixed warm theme uses paper neutrals, muted sea/olive, restrained brass, and vermilion; labeled categorical data colors retain their existing meaning.

## Evidence files

Screenshots under `docs/screenshots/`:

- `game-map-1280.png`, `game-map-1440.png`, `game-map-1920.png`, `game-map-2560.png`
- `game-inauguration.png`, `game-setup-cabinet.png`, `game-setup-policies.png`, `game-setup-review.png`, `game-walkthrough.png`
- `game-policies-1440.png`, `game-cabinet-1440.png`, `game-parliament-1440.png`, `game-campaign-1440.png`
- `game-turn-report.png`, `game-legacy.png`

The simulation and save format were not changed by this revamp. Research validity and map provenance limits remain as documented in README.md and RESEARCH.md. Release ZIP files predate this revamp; the current production artifact is `dist/`.

### Second-stage opening briefing

- Hard gate PASS: production build and both onboarding Playwright workflows pass, including axe checks and cabinet selection. Six party rows, starting growth, coalition seats and majority threshold are asserted. Indicators derive from initialState and aggregate, before draft choices.
- Purpose gate PASS: the economic ledger and party table provide context for appointments. Existing paper dividers, serif headings and small party color marks retain the map-table identity without new artwork or controls.
- Liveliness PASS: existing Energy 2 / Rhythm 3 / Motion 2 direction retained. Economic figures and parliamentary totals establish hierarchy; the roster follows below.
- Craftsmanship PASS: inspected Indonesian screenshot at 1280 × 720, with no horizontal overflow; setup scroll remains internal. English onboarding at 1440 × 900 passes accessibility and functional checks. New copy is localized, and simulation/save schemas are unchanged.

### Empty opening cabinet and candidate browser

- Hard gate PASS: build succeeds; onboarding checks require six appointments before continuing and verify duplicate assignment is disabled. Cabinet checks cover clearing, replacement, Escape and focus restoration. All candidate information comes from the existing minister configuration.
- Purpose gate PASS: six vacant office slots make player choice explicit. Opening an office displays all 12 existing candidate dossiers, specialists first, instead of hiding candidates in a dropdown. The scrollable dialog uses the existing portraits and paper styling.
- Liveliness PASS: Energy 2 / Rhythm 3 / Motion 2 retained; vacant slots and full candidate dossiers have distinct roles, with vermilion reserved for appointment actions.
- Craftsmanship PASS: Indonesian candidate browser visually inspected at 1280 × 720, dialog scrollWidth equals clientWidth (1214px). Cabinet axe checks pass, language switching preserves choices, and a complete 60-month presidency passes with manual opening appointments. Simulation and save schemas remain unchanged.
