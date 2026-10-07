# Historical model-4 README (superseded by quarterly model 5)

Model 4 gives every province six connected pillars: economy, infrastructure (roads and water systems), health, education, energy and food. Health, education, stunting, rice production and electrification start from observed BPS, Kemenkes and PLN data for all 38 provinces. Provinces trade rice, share island power grids, lift each other through growth, exchange workers and remittances, and can pass on outbreaks. National inflation, a development index modeled on BPS IPM and regional inequality are built from the provinces. Three new policies (electricity, agriculture support and food reserves) and a distribution rule for each regional program (per capita, need-based or growth hubs) shape where national money lands. Model 3 added verified construction promises, rising program expansion costs, a continuous borrowing allowance, supported administration capacity, installed assets with recurring upkeep, visible party voting limits and preparation that reduces the first crisis shock. Every term now follows its own arc: shifting global conditions (commodity booms, slowdowns, capital outflows, oil shocks, El Niño, La Niña, bumper harvests), earthquakes, forest-fire haze and disease outbreaks alongside floods and harvest failures, and incidents that respond to your record (scandals, industrial investment, strikes, protests, tourism surges). Coalition partners press demands at unpredictable times and warn before leaving. Existing seeded monthly play, cabinet choices and BPS 2024 sector data remain. Campaigns last 60 months; previous saves remain available for export.

A bilingual English and Indonesian, browser-local strategy game covering a hypothetical January 2025 inauguration and 60 monthly turns. The president manages 38 provinces, eleven policy controls, six cabinet portfolios, a six-party parliament, infrastructure, crises, and a final-year campaign. A two-candidate election and legacy report end the presidency.

## Run

Requires Node 22 or later.

```sh
npm ci
npm run dev -- --port 5174
```

Open http://127.0.0.1:5174. Stage decisions, review the agenda, then advance the month. The baseline and fonts are bundled; no account, API key, language model, or live economic data is used. A static web server is required for workers and data loading; opening index.html as a file is unsupported.

First-time players see an inauguration introduction, choose six cabinet ministers, select or customize opening policies, and review the monthly budget before taking office. Setup does not advance time or spend money. The opening policy vote is resolved during inauguration; economic effects begin with the first monthly turn. The optional six-step walkthrough uses the actual map, policies, budget, parliament, turn control, and briefing. Progress is saved with the presidency; skip or restart through **How to govern**. Existing saves bypass setup. **New game → Continue to setup** opens a replacement administration, and the old save remains intact until **Take office**. Unfinished setup choices are not saved.

```sh
npm test
npx playwright install chromium
npm run test:e2e
npm run validate
npm run benchmark
npm run build
```

Deploy the contents of `dist/` to a static HTTP host. The relative Vite base supports a subdirectory. Keep data and font files with the build. No deployment has been made by this implementation.

## Desktop game interface

Play in a desktop window of at least 1280 × 720. The full-screen map table keeps national indicators and time in the top HUD. The bottom dock offers **Summary, Cabinet, Policy, DPR, and Regions (Wilayah)** alongside the agenda and **Advance month**. Policy includes both policy settings and APBN. Summary holds the monthly flow and event log; from month 48 it also offers campaign visits and platform choices, funded with separate campaign credits. Close a dossier to return to the map. Governing dossiers and province details scroll internally; the game scene stays in place. Mobile layouts are not supported.

Drag the map to pan, scroll to zoom, or use the map controls. **Find a province** searches and centers a province. Its inspector separates **Overview** from **Development**; map markers open active crises and unfinished projects. Dossiers retain the map camera and layer, and unsubmitted policy drafts survive switching commands.

Each completed month opens a report with actual changes and decision outcomes. Close it to return to the map, or open Summary to plan the next month and respond to crises. The final report leads to the election and legacy. Open the game menu through the Indonesia title at the top left for import/export, a new presidency, and help. Research references and model assumptions are documented below.

See [desktop GUI verification](docs/GUI-QA.md) for workflows, accessibility checks, and screenshots. The current production build is in `dist/`; the existing release ZIPs predate this redesign.

## Learning and monthly decisions

New campaigns offer guided play, including an optional first-month tour and a recurring **Briefing → This month** view. Use **Use inherited cabinet** during setup to start with the existing six ministers, then review any appointment. **How to govern** can enable or disable monthly guidance independently of the tour and includes a searchable English/Indonesian handbook. Skipping the tour leaves monthly guidance available; turning off guided play stops both. Older saves with an active tour retain guidance; other older saves stay in standard play.

Monthly checks cover changes, emergencies and deadlines, funding, parliamentary support, the agenda, and results. Up to three priorities offer alternatives without choosing for the player. A reviewed item can still be unresolved. Lessons introduce numbers, implementation, political support, and later contextual concepts; acknowledging a lesson prevents another lesson that month. Holding current policies and advancing an empty agenda remains valid.

Action previews use the same deterministic action resolver as the simulation, in agenda order. Each preview, the queued agenda and an unsubmitted policy package also show an **estimated effect** on growth, inflation, approval, poverty, unemployment, debt, coalition seats, fiscal balance and funding coverage after one and twelve months. The estimate compares two calm projections that differ only in that decision: today's global conditions are held, no new disasters, incidents or decisions are added, and no future random draws are used. After each month, the report shows **what your decisions did**: the month is replayed from the same seed without your decisions, without each accepted decision in turn, and the differences are reported alongside the change from events, the economy and earlier policies (interactions between decisions are listed separately so the figures add up). Selecting a national indicator explains why it moved in one sentence, splits last month's change between your decisions and everything else, and groups the model drivers into policy, economy, events and party channels, each with its meaning and what you can do about it. The HUD marks each indicator's change since last month. Budget comparisons include ongoing and queued relief and distinguish enacted settings, queued actions, and unsubmitted edits. A rejected proposal shows its hypothetical requested balance separately; its rejected spending does not enter the continuing budget. Estimates hold current economic conditions fixed and never reveal future random shocks. Actual delivery still depends on funding, ministerial capacity and time. Project contracts draw from the infrastructure envelope; campaign credits are separate from the treasury.

The agenda supports editing and removing individual decisions, including batch members. Guided play reviews every turn before resolution; standard play requests review for urgent unresolved issues or unsubmitted policy edits. The monthly report records each action's result, the largest recorded indicator drivers, implementation progress and commitments. **Reopen latest report** works after reload and export/import for new reports; older saves retain their event log until the next turn. Growth contributions describe the growth rate, while inflation, approval, debt-ratio and coalition contributions describe recorded changes.

Drafts and queued actions recover locally after the draft-save status confirms completion. This recovery record is validated separately and tied to the exact resolved campaign state; it is excluded from portable exports. Successful turn saves clear it atomically. Starting a replacement presidency or importing a save also clears it; cancelling setup leaves the current workspace intact. Storage failures stay visible and unsaved work prompts before leaving the page.

## Saves

New players start in **Bahasa Indonesia**. An existing saved language preference, including English, is preserved.

Choose **English** or **Bahasa Indonesia** using the **Language / Bahasa** selector on the setup screen or game header. The choice is remembered on this device and can be changed without resetting progress, cabinet choices, policy drafts, or queued decisions. Dates, numbers, controls, help, and simulation reports follow the selected language. Saves remain compatible across both languages; the language preference is stored separately from the game.

IndexedDB holds model 4 turns under `autosave-v4`, with local decisions under `draft-session-v4`. Model 1’s `autosave`, model 2’s `autosave-v2` and model 3’s `autosave-v3` remain untouched. Export any preserved generation from setup or the game menu. Older imports explain that model 4 requires a fresh campaign; previous histories are never migrated. Export creates a portable, versioned JSON save; import checks versions, dynamic state, numeric bounds, province IDs and accounting structure. Local drafts and queued decisions are recovered from a separate validated record tied to the resolved campaign; portable exports contain completed turns only. Storage failures are visible; export remains available. No telemetry or cloud synchronization.

## Source and evidence

- `src/engine/`: pure seeded TypeScript model, worker, schemas and tests.
- `src/data/`: versioned baseline and historical evaluation series.
- `src/Atlas.tsx`: D3/SVG province map, pan/zoom, keyboard selection.
- `src/Panels.tsx`: playable governing views.
- [Research register](docs/RESEARCH.md), [ODD model specification](docs/MODEL.md), [validation report](docs/VALIDATION.md), [design and accessibility checks](docs/QA.md).
- [Third-party notices](public/THIRD-PARTY.md) and [province map license](public/data/PROVINCE-MAP-LICENSE.txt); map attribution also appears in the game.

## References and model assumptions

These notes replace the former **Bukti dan asumsi / Evidence and assumptions** panels. The game explores policy tradeoffs. Behavioral coefficients are illustrative and sensitivity-tested, not established forecasts of Indonesia's future. References inform mechanisms, not fitted national response coefficients.

### Starting conditions

The [BPS Statistical Yearbook of Indonesia 2025](https://www.bps.go.id/en/publication/2025/02/28/8cfe1a589ad3693396d3db9f/statistik-indonesia-2025.html) supplies the 2024 provincial baseline. Original observations and provenance are retained in [baseline.json](src/data/baseline.json).

| Field | Source and transformation |
|---|---|
| Population | Table 3.1.1, p133: midyear projection, thousand persons divided by 1,000 to millions. |
| Provincial output | Table 15.2.1, p785: preliminary current-price billion IDR divided by 1,000 to trillions; provincial totals scaled by 1.00537902 to national GDP of Rp 22,139T. Original GRDP is preserved. |
| Poverty | Table 4.6.2, p315: September 2024 percentage. |
| Unemployment | Table 3.2.11, p160: August 2024 percentage. |
| Sector composition | [BPS provincial GRDP by industry 2020–2024](https://www.bps.go.id/id/publication/2025/04/11/95c729ee8c6fb5e2cb86b00f/gross-regional-domestic-product-of-provinces-in-indonesia-by-industry-2020-2024.html), table 89: observed 2024 industry shares, grouped into five sectors and normalized for rounding in [sectors.json](src/data/sectors.json). |
| Papua | Contemporary split-province observations are available. Historical evaluation excludes the six Papua divisions because 2020–2022 boundaries are not harmonized. |

Fiscal starting values use the Ministry of Finance's [2024 budget execution release](https://anggaran.kemenkeu.go.id/in/post/apbn-2024-mendukung-pemulihan-dan-pertumbuhan-ekonomi) and [2024 central-government financial report](https://www.djpb.kemenkeu.go.id/direktorat/apk/images/2025/07/5_LKPP_2024_Bahasa_Inggris.pdf). The opening interest rate and inflation use Bank Indonesia's [December 2024 rate decision](https://www.bi.go.id/en/publikasi/ruang-media/news-release/Pages/sp_2627524.aspx) and [2024 inflation release](https://www.bi.go.id/id/publikasi/ruang-media/news-release/Pages/sp_270125.aspx). These are mixed-vintage starting references; subsequent months follow the game rules.

Urban shares, household weights and incomes, administrative capacity, infrastructure, service indices, and political variables are synthetic gameplay assumptions. Starting debt uses an illustrative 39.8% of GDP. Regional trade links use inferred exposure weights; the [BPS IRIO 2016](https://www.bps.go.id/id/publication/2021/12/29/3ea49c0d856eceaba836792d/tabelinterregional-input-output-indonesia-tahun-2016-tahun-anggaran-2021.html) transaction matrix is not imported.

### Research register

| Reference | Use in the game and limitations |
|---|---|
| [IMF: Public investment in Indonesia (2026)](https://www.imf.org/en/publications/selected-issues-papers/issues/2026/02/04/golden-vision-2045-making-the-most-out-of-public-investment-indonesia-573702) | Efficiency and financing affect investment returns. Coefficients are illustrative, not extracted causal estimates. |
| [Gertler et al.: Road maintenance (2024)](https://www.nber.org/papers/w30454) | Road quality affects jobs, incomes, and living costs. Local elasticities are not transplanted into national coefficients. |
| [World Bank: Fuel subsidy reforms (2024)](https://documents.worldbank.org/en/publication/documents-reports/documentdetail/099748505212431959) | Fiscal savings and household effects depend on compensation and implementation. |
| [Cahyadi et al.: Conditional transfers (2020)](https://www.nber.org/papers/w24670) | Immediate support and cumulative health and education effects operate over different horizons. |
| [Duflo (2001), with Roodman reanalysis](https://arxiv.org/abs/2207.09036) | Schooling may affect later wages; magnitude is disputed. Education provides no immediate GDP bonus. |
| [Olken: Monitoring corruption (2007)](https://doi.org/10.1086/517935) | Village road audits motivate procurement leakage and auditing mechanics, not a universal national coefficient. |
| [Tax administration versus tax rates](https://www.nber.org/papers/w26150) | Collection capacity is modeled separately from effective tax rates. |
| [Bank Indonesia: Inflation literature review](https://www.bi.go.id/en/publikasi/kajian/Pages/Determinants-Of-Inflation-In-Indonesia-Dynamics-Over-A-Decade.aspx) | Food, administered prices, monetary conditions, and expectations have distinct channels. |
| [Slater: Presidential power-sharing (2018)](https://doi.org/10.1017/jea.2017.26) | Cabinet positions and coalition incentives interact. Party personalities and response weights are fictional. |
| [Grimm et al.: ODD protocol (2020)](https://www.jasss.org/23/2/7.html) | Framework for documenting model entities, scheduling, assumptions, and evaluation. |
| [Fagiolo et al.: Model validation](https://www.lem.santannapisa.it/WPLem/files/2017-23.pdf) | Historical fit, calibration, and sensitivity are distinct from code verification. |

The [detailed research register](docs/RESEARCH.md) includes additional model 2 design references, methods, and transfer limits. The scenario begins in January 2025; some references were published later.

### Behavioral parameter ranges

These are game assumptions from [engine/config.ts](src/engine/config.ts). Sensitivity runs vary each parameter through its listed range. Model 4 coefficients and timing are documented in [MODEL.md](docs/MODEL.md); model 3 equations are archived in [MODEL-V3.md](docs/MODEL-V3.md).

| Parameter | Central | Range |
|---|---:|---:|
| `trend` | 5.03 | 3–6 |
| `investmentProductivity` | 0.06 | 0.02–0.06 |
| `fiscalDemand` | 0.018 | 0.009–0.027 |
| `taxDrag` | 0.06 | 0.03–0.09 |
| `monetaryDrag` | 0.15 | 0.08–0.22 |
| `welfareEffect` | 0.0015 | 0.0008–0.0022 |
| `growthEmployment` | 0.035 | 0.02–0.05 |

### Geography and abstractions

Province geometry is adapted from [Ardian Saputra Hasibuan's GeoJSON Indonesia - 38 Provinsi](https://github.com/ardian28/GeoJson-Indonesia-38-Provinsi), under its [MIT license](https://github.com/ardian28/GeoJson-Indonesia-38-Provinsi/blob/main/LICENSE). The publisher attributes the source boundaries to Badan Informasi Geospasial. Province codes, including Papua identifiers, are normalized by name; coordinates are rounded and polygon winding is normalized for rendering. Neighboring countries use simplified [Natural Earth data](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/), which is [public domain](https://www.naturalearthdata.com/about/terms-of-use/). Boundaries are for gameplay, not surveying. See [third-party notices](public/THIRD-PARTY.md) for preparation details and bundled licenses.

The game uses six fictional parties, fictional ministers, simplified budget continuation, effective taxation, synthetic households, and a two-candidate population-weighted election. Public accounts reconcile with an aggregate private financial counterpart; individual banks and businesses are not simulated.

## Scientific and release limits

This is a **research-grounded strategy simulation**, not a predictive economic model. Population, GRDP, poverty, unemployment and initial sector composition use BPS observations. Urban shares, household profiles, initial debt ratio, trade exposure weights, political behavior and policy elasticities remain explicitly labeled assumptions. The historical evaluation tests a structural growth approximation; it does not validate the complete political-economic model. Banking remains aggregate financing and a balancing financial-asset stock.

The [strategy benchmark](docs/STRATEGY-BENCHMARK.md) compares 14 strategies across four conditions and separate development/held-out seeds. On development seeds 0–99, pooled active play wins 61.75% and the strongest frozen opening budget 21.5% (acceptance passed). On fresh seeds 20000–20099, pooled active play wins 68.13% and the strongest frozen opening budget 30%, a 38.13 percentage point gap (acceptance passed); coefficients were not retuned on held-out seeds. These are simulated gameplay results. The [model 4 delivery checks](docs/ENGINE-V4-QA.md) record release verification; [model 3 checks](docs/ENGINE-V3-QA.md) are retained. The [model specification](docs/MODEL.md) describes equations, units and timing. `npm run benchmark -- --quick` uses ten development seeds without rewriting reports. `--development` evaluates development seeds and records a passing coefficient/strategy freeze; `--evaluate` checks that freeze before evaluating fresh seeds. BPS table 89 can be re-extracted with `python3 scripts/import-sectors.py /path/to/official-publication.pdf`; statistical facts and the PDF checksum are bundled, not the full publication.

Remaining empirical limits: regional links use BPS historical node geography but do not import the IRIO transaction matrix; policy/behavior coefficients require estimation and independent evaluation. The previous Deny Herianto map's license and provenance caveat remain in [its historical notice](public/data/MAP-LICENSE.md); the current province map uses the MIT-licensed source described above.
