# Model 4 delivery checks

Verified on 2 October 2026. This report covers the six-pillar provincial engine, the inter-province network, the national roll-up, the new policies and distribution rules, their interface, and save preservation. The desktop map-table direction is retained: ENERGY 2 / RHYTHM 3 / MOTION 2. The design and its decisions are in [MODEL-V4-DESIGN.md](MODEL-V4-DESIGN.md); equations are in [MODEL.md](MODEL.md).

## Release verification

| Check | Result | Evidence |
|---|---|---|
| Unit and engine regressions | PASS: 122 tests in 13 files | `npm test`; includes 15 model 4 tests in `src/engine/pillars.test.ts` |
| Browser workflows | PASS: 69 tests | `npm run test:e2e`; includes `tests/pillars.spec.ts` (pillar strip, Pillars tab with axe A/AA scan, distribution rule, network layers, national roll-up) |
| Production build | PASS | `npm run build`; Vite's existing large-chunk advisory remains |
| Accounting and sensitivity validation | PASS: 240 presidencies / 14,400 turns | `npm run validate`; [VALIDATION.md](VALIDATION.md); residuals below 1e-7 trillion IDR; engine median 2.57 ms, p95 3.08 ms |
| Development benchmark | PASS: 5,600 campaigns | `npm run benchmark -- --development`; [balance-freeze.json](balance-freeze.json) |
| Fresh-seed evaluation | PASS: 5,600 campaigns | `npm run benchmark -- --evaluate`; [STRATEGY-BENCHMARK.md](STRATEGY-BENCHMARK.md), [strategy-benchmark.json](strategy-benchmark.json) |

## Phase 1 regression

The per-province update was moved into `src/engine/province.ts` before any model 4 mechanism was added. Three full 60-month campaigns (seed 1 normal/adaptive, seed 7 disaster/investment, seed 12 food-energy/fixed-services) produced byte-identical national and provincial histories to model 3.

## Balance acceptance

| Split | Pooled active wins | Strongest fixed wins | Gap |
|---|---:|---:|---:|
| Development, seeds 0–99 | 61.75% | 21.5% (fixed-education) | 40.25 points |
| Held out, seeds 20000–20099 | 68.13% | 30.0% (fixed-education) | 38.13 points |

PASS: active wins lie within 60–75%, fixed wins within 15–35%, and the gap exceeds 15 points. Held-out active wins by scenario: normal 83%, commodity 66%, food-energy 47.5%, disaster 76%. Accepting every request without delivering breaks 4,326 held-out requests and wins 2.5% of held-out campaigns (0.25% on development seeds), below the fixed-services package, as the benchmark requires.

The first full development run failed (active 50.25%). Diagnosis on 20 seeds per model found three causes, documented in MODEL.md: capacity counted twice in program absorption, outages costing successful play about 2.9 approval points, and the loss of model 3's passive service drift. Calibration used development seeds only. The final engine and strategy fingerprint was frozen before fresh-seed evaluation and matches the source after release edits:

`dab1b6196752ed970852365bd7f25163731cab3b4907193bcc24037eee76d28f`

## Model 4 engine evidence

- Opening provinces carry observed BPS 2024 life expectancy, schooling and IPM, SKI 2023 stunting and BPS 2024 rice production; provincial rice sums to the national 53,142,726.65 tons.
- Under opening policies and calm conditions, national health, education, skills, stunting, reliability, electrification and food self-sufficiency stay within 1.5 points of opening over 60 months; provincial health access, water and food premiums stay within tight bounds.
- National health, development and GDP equal weighted provincial values; national inflation equals the population-weighted provincial price average.
- Food trade never ships more than surplus provinces hold, and no province receives more than its deficit.
- Health, electricity, agriculture, reserves and education each move their linked stats in the declared direction; cutting electricity causes outages that lower output.
- Need-based health money narrows the provincial health gap; growth-hub infrastructure and electricity widen output inequality; the national budget is unchanged by any rule.
- A Javanese harvest failure raises food prices in DKI Jakarta through trade and import reliance.
- Saves continue identically after export and import; outbreak spread uses its own stream, so earlier streams keep their draw counts.

## Interface evidence

- Province inspector: an always-visible six-pillar strip with change since January 2025 and one real-unit stat each; a Pillars tab listing last month's drivers, food flows, grid, worker movement and program shares. No accordions or disclosures; every explanation uses `StatHelp`.
- Policy: electricity, agriculture support and food reserves sliders; a `GameSelect` distribution rule beside each regional program, queued without a DPR vote.
- Map: Health, Education, Energy, Food security, Development index, Power grids (categorical with legend) and Food trade (self-sufficiency with the twelve largest routes).
- Summary event log and legacy screen: national roll-up with development index, inequality, food self-sufficiency, electrification, reliability, skills and stunting.
- Monthly summary: grid outage and local food shortage warnings route to the relevant policy.
- All new copy is translated; the localization test covers `PillarsUI.tsx`. Checked in English and Indonesian in the browser.

### Clarity update (2 October 2026)

- A national pillar bar under the HUD shows the population-weighted Economy, Infrastructure, Health, Education, Energy and Food scores and the development index, with change since January 2025, on every screen. Each pillar button switches the map to that pillar.
- Impact estimates and turn reports include the six national pillar measures, grouped under "Economy and politics" and "National pillars". Estimates add an "After 36 months" column (when the term allows) so slow investments such as electricity and education show their payoff.
- Every policy shows labels for the pillars a higher setting moves, the direction and how soon.
- Verified: 122 unit tests, 71 browser tests (two new), production build; group headings meet WCAG AA contrast. Engine coefficients and the balance freeze are unchanged.

## Saves

New campaigns use model 4.0.0, schema 4, dataset 2024.3, `autosave-v4` and `draft-session-v4`. Model 1, 2 and 3 saves are preserved and exportable from setup and the game menu; importing them explains that model 4 requires a fresh campaign.

## Known limitations

- Rice stands in for all food; highland Papua's real staples are not rice. Only changes from opening positions affect prices.
- Electrification is observed for 12 provinces; the rest, water systems, health access and grid reserve margins are synthetic.
- Food-energy remains the hardest scenario for active play (47.5% held-out).
- The React key warnings logged on the onboarding screen predate model 4.
