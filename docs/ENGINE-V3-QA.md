# Model 3 delivery checks

Verified on 30 September 2026. This report covers the model 3 engine, changed explanations and controls, save preservation, and final-year campaigning in Summary. The existing desktop map-table direction is retained: ENERGY 2 / RHYTHM 3 / MOTION 2. Antislop was applied during editing, as requested.

## Release verification

| Check | Result | Evidence |
|---|---|---|
| Unit and engine regressions | PASS: 78 tests in nine files | `npm test`; `src/engine/rebalance.test.ts` and existing engine/UI helper tests |
| Browser workflows | PASS: 67 tests | `npm run test:e2e`; Chromium, English/Indonesian, supported desktop sizes, keyboard, axe A/AA and failure recovery |
| Production build | PASS | `npm run build`; TypeScript and Vite, worker, local fonts and map included |
| Accounting and sensitivity validation | PASS: 240 presidencies / 14,400 turns | `npm run validate`; [VALIDATION.md](VALIDATION.md), residuals below 1e-7 trillion IDR |
| Development benchmark | PASS: 5,600 campaigns / 336,000 turns | `npm run benchmark -- --development`; [balance-freeze.json](balance-freeze.json) |
| Fresh-seed evaluation | PASS: 5,600 campaigns / 336,000 turns | `npm run benchmark -- --evaluate`; [STRATEGY-BENCHMARK.md](STRATEGY-BENCHMARK.md) and [strategy-benchmark.json](strategy-benchmark.json) |

The production build retains Vite's existing large-chunk advisory. Engine timing excludes browser rendering; held-out monthly p95 is 4.44 ms on this host. These measurements do not establish performance on every device.

### Balance acceptance

Four scenarios are evaluated independently: normal, commodity, food-energy and disaster. Each split includes 14 strategies and 100 seeds per scenario. Active results pool the two active strategies; the fixed comparison is the strongest of five frozen opening packages across the same scenarios and seeds.

| Split | Pooled active wins | Strongest fixed wins | Gap | Maintenance-only fulfilled promises | Agreement spam wins |
|---|---:|---:|---:|---:|---:|
| Development, seeds 0–99 | 62.125% | 28.5% | 33.625 points | 0 | 0% |
| Held out, seeds 20000–20099 | 70.5% | 34.5% | 36 points | 0 | 0% |

PASS: active wins lie within 60–75%, fixed wins within 15–35%, and active play exceeds the strongest fixed package by at least 15 points. Scenario differences remain: held-out active wins are 87% in normal, 69.5% in commodity, 44% in food-energy and 81.5% in disaster. These targets concern pooled play, not identical difficulty in every scenario.

Development calibration reduced service approval weights to health .16 and education .11 because passive service accumulation overwhelmed purchasing power and disruption. Construction productivity is .06 after removing free maintenance expansion. The final coefficient and strategy fingerprint was frozen before fresh-seed evaluation:

`e444e7dcedfcd47e74cfc82c73e24a049a194687026557fef1240268c9410bbb`

No coefficient, strategy or outcome was changed in response to held-out results. An earlier development search tested 36 opening combinations on seeds 0–4 in all four scenarios; its raw results are preserved in [balance-opening-search.json](balance-opening-search.json). That search used provisional service weights, so its win counts are not the final acceptance results. Its strongest opening package was included in the final frozen comparison. Final equations and shared coefficients are documented in [MODEL.md](MODEL.md).

### Engine regression evidence

- Maintenance and actual flood repairs improve condition but fulfill no construction promises. Old completed contract spending cannot be recycled into a new agreement.
- Required spending is frozen at signing, including an existing contract's actual cost; serialization preserves it. New funded construction earns one +0.5 credibility reward.
- Administrative expansion converges on supported capacity; subsequent spending cuts reduce it. Collection remains bounded relative to opening capacity and cabinet.
- Maintenance cannot raise installed capacity or restore above the damage-adjusted ceiling. Completed projects add eight points and create additional upkeep requirements.
- Pre-authorized preparation reduces the first production shock, household income loss and price disruption. Random streams remain independent and deterministic.
- The default cabinet reproduces the inherited opening ledger. Convex expansion costs and the continuous debt allowance agree in previews and financing calculations.
- Hard voting limits conflict where specified; the initial coalition passes inherited policies. Issued demands retain their targets until their deadlines.
- Credibility changes preference through approval, without a direct second voting reward.
- All benchmark turns check accounting, private financial assets, bounded stocks and approval contribution reconciliation. Every final save parses; matched continuation checks reproduce the remaining campaign after a save at month 30. Unit tests also cover deterministic replay and model 3 required fields.

### Browser click-through evidence

- Setup and game menu → export original model 1 and model 2 records. The workflow compares exported JSON values with originals, reloads model 3, and verifies previous autosave/draft entries remain untouched.
- Old import → visible compatibility explanation; the current model 3 presidency is retained. Model 3 export/import/reload → continuation is available.
- DPR → actual policy vote estimate, party voting limits and new construction expenditure shown. Change language → equivalent Indonesian limits and costs.
- Policy/APBN → continuous borrowing explanation and visible financing rows. Raise health to 100 → displayed funding matches the shared engine estimate.
- Final-year Summary → choose destination with GameSelect, enter seven credits, choose health platform, queue visit/platform → two agenda entries. Advance month → recorded visit and separate campaign wallet reduced from 80 to 73. Switch language → Indonesian campaign controls remain usable.
- Existing full-presidency workflow → appointments, approved/rejected policies, projects, relief, 60 resolved months, election, legacy and portable save recovery.
- Existing interface workflows → five navigation sections, agenda edit/remove, geographic filters, keyboard province selection, dropdown navigation, tooltip/modal Escape, setup/replacement cancellation, worker/storage/map failures and reduced motion.

Screenshots were inspected at 1280 × 720: [DPR overview](screenshots/model-3-parliament-desktop.png), [party costs and voting limits](screenshots/model-3-party-requirements.png), [final-year Summary](screenshots/model-3-final-year-summary.png). Dossiers scroll internally while the HUD and command dock remain visible. Desktop coverage also includes 1440 × 900. Mobile is explicitly outside the project's supported interface scope in DESIGN.md.

## Antislop delivery gate

### Hard gate

- R-02 PASS: source scan finds no em dash in TypeScript UI copy; the cabinet translation key matches its revised English text.
- R-03 PASS for the agreed desktop scope: browser width checks and inspected screenshots show no horizontal overflow at 1280 × 720; larger desktop workflows pass. Mobile is excluded by the explicit project direction, not claimed as tested.
- R-17 PASS: displayed costs, votes, stocks and campaign credits derive from engine state; benchmark rates come from the linked machine-readable results.
- R-18 PASS: no testimonials or customer social proof were added.
- R-23 PASS: no new visual assets or navigation destinations were invented. The user explicitly selected final-year campaign actions in Summary.
- R-24 PASS: Summary, Cabinet, Policy/APBN, DPR and Regions open their implemented dossiers; browser navigation workflows cover each destination.
- R-25 PASS: axe A/AA scans cover the changed final-year Summary and existing primary dossiers, alongside inspected desktop text.
- R-26 PASS: export buttons create actual files, sliders change previews, dropdowns select options, campaign buttons queue actions and advancement resolves them; click-through evidence is listed above.
- R-27 PASS: empty agenda/project states, disabled campaign spending, old-import rejection, storage/worker/map failure and recovery remain available and tested.
- R-28 PASS: no FAQ or unrelated marketing sections were added.
- R-32 PASS: GameSelect keyboard support, visible focus, province keyboard selection and tooltip/modal Escape workflows pass. New labels are accessible and use existing control patterns.
- R-33 PASS: interface changes are authored directly in source; Prettier only formats source. No runtime source/CSS patching feature was introduced.
- R-34 PASS: the existing single map-table theme remains; no theme toggle is claimed.
- R-35 PASS: production build and all 67 browser workflows pass; changed controls have recorded actions and outcomes above.
- R-36 PASS: gameplay and engine timing claims are backed by recorded runs; no security, compliance or forecast certification is claimed.
- R-37 PASS: DESIGN.md supplies the map-table identity and explicit 2/3/2 dials, retained during editing.
- R-38 PASS: fictional parties/ministers remain identified as fictional; model assumptions and observed BPS inputs are distinguished in MODEL.md and README.

### Purpose gate

- R-01 PASS: no new gradient or glow; olive and vermilion retain their existing hierarchy roles.
- R-04 PASS: no new icon library or decorative icon was introduced; existing dock symbols identify governing destinations.
- R-06 PASS: Source Serif titles keep the institutional paper identity; Source Sans controls support dense comparisons, as documented in DESIGN.md.
- R-07 PASS: existing geographic graticules belong to the atlas; no background grid was added to new controls.
- R-08 PASS: new campaign buttons use specific action text; existing arrows indicate actual navigation or turn progression.
- R-09 PASS: no marketing capsules; queued/selected states communicate actual decisions.
- R-10 PASS: new sections use existing opaque paper surfaces, without glass layers.
- R-12 PASS: existing dossier elevation indicates an active workspace above the map; no per-row floating shadows were added.
- R-13 PASS: no glow styling was added.
- R-14 PASS: party rows repeat comparable requirements; budgets remain ledgers, construction progress remains regional data, and campaign controls form a compact decision section.
- R-19 PASS: no new animation; existing control/dossier transitions and reduced-motion behavior remain.
- R-22 PASS: no stock illustration or generated visual was added.

### Liveliness

- Dials PASS: ENERGY 2 / RHYTHM 3 / MOTION 2 are explicit in DESIGN.md and this report.
- Consistency PASS: atlas, budget ledger, party packages and compact Summary actions retain different content-driven compositions; new controls introduce no extra motion.
- Focal point PASS: the atlas anchors the game; governing papers lead with the selected task, while the persistent turn action stays visible.
- Whitespace PASS: ledger rows, party requirement sections and campaign controls use existing spacing to separate decisions and consequences.
- Accent PASS: vermilion identifies advancement and attention; neutral campaign controls preserve that hierarchy.
- Identity PASS: local Source typography, parchment papers, inked geography and olive rails retain the agreed map-table motif.
- Design read PASS: the existing direction was retained before editing, with antislop applied during editing as requested.

### Craftsmanship and quality locks

- C-1 PASS: new information explains construction obligations, financing, supported stocks, voting restrictions or campaign costs; each has a decision purpose.
- C-2 PASS: changed controls perform recorded actions; final-year eligibility and insufficient credits disable unavailable actions.
- C-3 PASS: sections correspond to budget, coalition, regional and election decisions; no template filler was added.
- C-4 PASS for supported desktop states: browser workflows cover short/larger desktops, language changes, keyboard, empty/error/recovery states and the single theme.
- C-5 PASS: displayed facts use state or named source data; simulated outcomes and behavioral assumptions are labeled.
- R-05 PASS: the existing atlas/dossier composition follows gameplay rather than a landing-page template.
- R-11 PASS: existing rectangular buttons, inputs and papers remain; no universal pill styling was introduced.
- R-15 PASS: controls say “Add visit to agenda,” “Add platform to agenda,” or the existing specific export/review action.
- R-16 PASS: new copy describes actual game rules without marketing superlatives.
- R-20 PASS: Indonesian geography, province contracts, coalition seats and APBN ledgers retain a specific governing identity.
- R-21 PASS: the warm map-table theme follows the explicit project direction; no requested theme switch was deferred.
- R-29 PASS: existing paper/olive/brass palette and vermilion accent remain; additional party/map colors encode labeled categories.
- R-30 PASS: no product clone or unrelated visual system was introduced.
- R-31 PASS: visible requirements aid voting decisions; budget rows explain funding; stock labels separate installed assets from condition; Summary campaigning makes authorized final-year actions reachable.

## Evidence boundaries

Benchmark strategies are scripted competent play, not human player telemetry. Their results establish comparative balance on the evaluated seeds and scenarios, not a universal win probability. The historical trend comparison in VALIDATION.md does not validate political outcomes or the entire behavioral model. Prior model 1 and 2 saves are preserved for export, but model 3 campaigns start fresh. No deployment was made.
