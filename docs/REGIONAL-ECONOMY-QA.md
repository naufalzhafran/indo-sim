# Regional economy visual and interaction verification

Verified on 5 October 2026 for the supported desktop and laptop sizes. This document records the regional economy UI, map, and interaction checks; campaign balance and broader engine results are recorded separately below.

## Approved direction

Reference: [approved 1440px island world](screenshots/world-construction-1440.png), `src/quarter.css`, `src/world.css`, and the existing island geometry/materials.

Design read: an Indonesian development game for desktop players, retaining the cheerful island-game visual language. ENERGY 2 / RHYTHM 2 / MOTION 2, matching `DESIGN.md` and the established quarter animation. Cream reading surfaces, teal hierarchy, emerald selected controls, coral quarter advancement, and restrained butter-yellow explanations preserve the established identity. Nunito remains the heading/control font; Source Sans 3 carries dense tables and tabular numbers. Longer policy and industry workflows use the dedicated panel so the map remains visible around it. Reduced motion was enabled for the viewport captures below and remains a supported alternative.

The overhaul preserves Indonesian coastlines, mountains, trees, boats, and province-to-region selection. Neighboring-country meshes, SVG paths, labels, and the regional-context network request have been removed from both render paths.

## Viewport measurements and screenshots

Every row below completed a new campaign, opened a policy, changed Sumatra from Medium to High, viewed a region, advanced a quarter, and opened the actual quarter report. All six runs reported zero browser page errors.

| Language | Viewport | Policy client / scroll width | Region client / scroll width | Document / viewport width | Report client / scroll width | Regional radios |
|---|---:|---:|---:|---:|---:|---:|
| English | 1280 × 720 | 686 / 686 | 686 / 686 | 1280 / 1280 | 756 / 756 | 27 |
| English | 1366 × 768 | 686 / 686 | 686 / 686 | 1366 / 1366 | 756 / 756 | 27 |
| English | 1440 × 900 | 686 / 686 | 686 / 686 | 1440 / 1440 | 756 / 756 | 27 |
| Indonesian | 1280 × 720 | 686 / 686 | 686 / 686 | 1280 / 1280 | 756 / 756 | 27 |
| Indonesian | 1366 × 768 | 686 / 686 | 686 / 686 | 1366 / 1366 | 756 / 756 | 27 |
| Indonesian | 1440 × 900 | 686 / 686 | 686 / 686 | 1440 / 1440 | 756 / 756 | 27 |

The 18 primary screenshots are in [screenshots/economy-revamp](screenshots/economy-revamp), named `{policy,regions,report}-{en,id}-{1280,1366,1440}.png`. Additional 1440px catalog and industry details use `{catalog,industry}-{en,id}-1440.png`.

The final refresh also records Overview at all six language/viewport combinations, committed-quarter reports with the nominal Debt / GDP correction, two eight-policy plans at 1280px, and 1440px food-trade, fiscal-account and five-year-report views in both languages. The folder now contains 40 captures. Forecasts finished before these captures. The six final Overview/report runs again had zero browser page errors and matching document/viewport widths of 1280, 1366 and 1440px.

At 1280 × 720, both eight-policy plans measured 284px client width and 284px scroll width. All eight policy controls remain in the scrolling plan body. The fixed forecast/action footer stays inside the viewport: y=424.8–710px in English and y=405.9–710px in Indonesian, preserving the Advance control while the plan is full.

Representative captures:

- [English regional spending at 1280 × 720](screenshots/economy-revamp/policy-en-1280.png)
- [Indonesian foundations at 1366 × 768](screenshots/economy-revamp/regions-id-1366.png)
- [English quarter report at 1440 × 900](screenshots/economy-revamp/report-en-1440.png)
- [Indonesian policy catalog](screenshots/economy-revamp/catalog-id-1440.png)
- [Manufacturing detail](screenshots/economy-revamp/industry-en-1440.png)
- [Overview after four quarters, English](screenshots/economy-revamp/overview-en-1280.png) and [Indonesian](screenshots/economy-revamp/overview-id-1440.png)
- [Eight-policy plan, English](screenshots/economy-revamp/eight-policy-plan-en-1280.png) and [Indonesian](screenshots/economy-revamp/eight-policy-plan-id-1280.png)
- [Food trade with the current-routes legend, English](screenshots/economy-revamp/food-trade-en-1440.png) and [Indonesian](screenshots/economy-revamp/food-trade-id-1440.png)
- [Nominal debt ratio and fiscal accounts, English](screenshots/economy-revamp/report-fiscal-en-1440.png) and [Indonesian](screenshots/economy-revamp/report-fiscal-id-1440.png)
- [Five-year report, English](screenshots/economy-revamp/final-report-en-1440.png) and [Indonesian](screenshots/economy-revamp/final-report-id-1440.png)

Tables scroll vertically inside their dedicated workspace. The five regional foundation scores remain together as a visible summary above the detailed industry, policy, and tax views. On 720px-height laptops the regional-spending table shows fewer rows at a time; all nine regions remain reachable by scrolling, with no horizontal overflow or accordion.

## Interaction and geographic checks

- Each spending row has three native radio inputs with a policy-and-region group name. Pointer selection of High updates the actual regional allocation; ArrowLeft selects Medium. The native input covers the full visible control so mouse and keyboard hit targets agree.
- Policy catalog search, category selection, All / Active / Planned filters, start/remove actions, and list-to-detail navigation have real state changes. Opening inactive details does not start a policy.
- Returning to the catalog restores the initiating Manage policy control and list position. Industry details focus their heading and start at their own navigation; returning restores the industry-table position.
- Dropdowns reuse `GameSelect`; foundation and allocation hints reuse `StatHelp`. No native select, accordion, details/summary, or spending slider is introduced.
- Both map presentations were exercised in English and Indonesian. Only `provinces.geojson` was requested; `region.geojson` was not requested. Fallback contained exactly 38 clickable province paths and zero neighboring-country paths or labels. Clicking a Papua province selected the Papua region.
- Map captures are [English 3D](screenshots/economy-revamp/world-en-3d-1440.png), [Indonesian 3D](screenshots/economy-revamp/world-id-3d-1440.png), [English fallback](screenshots/economy-revamp/world-en-fallback-1440.png), and [Indonesian fallback](screenshots/economy-revamp/world-id-fallback-1440.png).
- Reduced motion was enabled during the viewport runs. Quarter progression and reporting remained available in normal and fallback presentations.

## Relevant source checks

- TypeScript compilation: `npx tsc --noEmit --pretty false` passed after the new UI and geography changes.
- Geometry, terrain, quarter visual transitions, and geographic aggregation: 41 tests passed across `mapGeometry.test.ts`, `terrainMesh.test.ts`, `quarterVisual.test.ts`, and `engine/gameRegions.test.ts`.
- Quarter/geography fixtures now use the new economy state and shared world types. Tests retain unchanged-state, bounded callout, construction/crisis, regional-selection, geometry, and weighted aggregation checks. New checks cover direct use of the Energy foundation rather than recomputation from old source measures.
- A four-quarter server-rendered reporting check verified nominal Debt / GDP in both Overview and the report. With price index 1.025, the engine's nominal ratio was 37.241%, rendered as 37.2% / 37.24%; the incorrect real-GDP denominator would have shown 38.172%. Historical comparison values use their own stored price index. Neither view rendered `NaN`.
- Final fiscal captures also verify the visible core-public-services row in both languages. Core public services (inherited services and maintenance), policy delivery and interest account for total spending, with each displayed amount rounded to one decimal. TypeScript checking passed after this final reporting edit; both fiscal images were refreshed afterward.

## Visual delivery gate

- **Containment PASS:** the six language/viewport measurements above show matching client and scroll widths for both workspaces, the document, and the report dialog. Dense workflows use vertical scrolling, not clipped controls.
- **Contrast PASS:** WCAG relative-luminance calculations for the actual CSS colors give 9.04:1 for teal ink on cream, 5.10:1 for muted text on cream, 5.01:1 for light text on emerald, 4.90:1 for emerald impact text on cream, 6.79:1 for declining impact text, 4.70:1 for dark text on coral, and 6.82:1 for the yellow explanation strip. All exceed 4.5:1 for normal text.
- **Control behavior PASS:** pointer High selection and ArrowLeft to Medium changed the same native radio group. The industry detail heading and Back control are visible after opening in both languages; returning restores focus to Manufacturing. The browser suite exercises policy search/filter/detail, spending, dropdown containment, tooltip dismissal, and limits.
- **Approved identity PASS:** screenshots retain the cream/teal/emerald/coral system, Nunito controls, Source Sans 3 tables, restrained rounded corners, and map-focused composition. The fallback now uses the same turquoise ocean and typography. No neighboring-country scenery remains.
- **Purpose and liveliness PASS:** hierarchy centers the current region or policy; emerald communicates selection and coral identifies quarter advancement. Variable spacing separates summaries, controls, and ledgers. Arrows express model effects, not decorative navigation. Motion is restrained and the reduced-motion path remains usable.
- **Content and evidence PASS:** policy effect labels come from engine definitions, displayed values come from the current model or actual quarter receipt, and policy details label simulation assumptions and link to the program reference. No invented testimonials, unrelated decorative imagery, accordions, or native dropdowns are added.

## Campaign verification

- **Build PASS:** `npm run build` completed TypeScript checking and Vite production output. The existing lazy-loaded Three.js scene retains Vite's large-chunk advisory; it is not a compilation failure.
- **Unit tests PASS:** `npm test` passed **97 tests across 7 files**. Coverage includes causal economy behavior, fixed appropriations, uniform allocation equivalence, 8/2 limits, staged education, retained assets/skills, reactivation, investment financing, accounting, price-index history, deterministic shocks, shared food flows, save validation, geometry and playback.
- **Browser tests PASS:** `tests/economy.spec.ts` passed **18/18 tests in 1.2 minutes**, without failures or retries. Tests cover all six language/viewport combinations, 25 selectable policies, allocation controls, Undo/Reset/reload recovery, eight-policy containment, six taxes, map layers/camera/fallback, tooltip dismissal, and the exact twentieth-quarter ending.
- **Recovery PASS:** injected worker and storage failures preserve the completed state and recoverable result. A corrupt draft preserves the last completed quarter. An unreadable completed save remains unchanged across reloads until an explicit new campaign or import. A delayed file read locks quarter advancement until import completes, preventing stale results from overwriting it.
- **Balance PASS:** `npm run balance:quarter` completed **84 campaigns** across **14 portfolios**, three seeds and calm/shock variants. All campaigns reconcile financial flows, provincial/regional accounting, bounded employment and final save round trips. No tested portfolio dominates every measured outcome. The full results are in [economy-balance.json](economy-balance.json).

The higher-cost eight-policy portfolio delivered a mean minimum of **89.45% funding**, with **9.0 shortfall quarters** and ending nominal debt/GDP **33.55%**. A six-policy portfolio with tax relief also encountered shortfalls, showing that affordability depends on costs and revenue rather than policy count alone.

For the education portfolio in calm seed 19, differences from continuing the baseline were:

| Quarter | Education score | Workforce skills | Tech & IT output |
|---|---:|---:|---:|
| 1 | +0.31 | +0.00 | +0.00% |
| 4 | +2.64 | +0.43 | +0.10% |
| 8 | +5.62 | +1.39 | +0.88% |
| 12 | +7.75 | +3.26 | +2.42% |
| 20 | +10.59 | +8.47 | +8.86% |

These are game-model results from a representative finite strategy matrix, not an economic forecast or proof of balance for every possible portfolio.

## Regional connector update · 6 October 2026

- Removed every arrowhead from the regional relationship diagram as requested. The existing connections and node highlighting retain their model relationships and approved game styling.
- English and Indonesian connection help now describes reading from top to bottom without referring to arrows.
- Removed the unused SVG marker definition and its generated identifier. No layout, simulation, geography, save or quarter progression changes were required.
- Purpose and identity: plain connectors communicate relationships with less visual emphasis; existing cream surfaces, emerald selections and miniature world emblems are preserved.
- Verification PASS: production build and all six regional browser checks passed in English/Indonesian at 1280×720, 1366×768 and 1440×900, including node highlighting, custom dropdowns, WCAG A/AA scans and viewport containment. English and Indonesian rendered screenshots were inspected; the updated Indonesian tax view is `docs/screenshots/relationships-no-arrows-id-1280.png`.
