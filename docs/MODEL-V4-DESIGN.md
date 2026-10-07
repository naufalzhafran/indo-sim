# Model 4 design proposal: six-pillar provinces, inter-provincial network, national roll-up

Status: **implemented as model 4.0.0.** This document records the design and its decisions; the as-built equations and coefficients are in [MODEL.md](MODEL.md). Differences from the original plan are noted inline as **As built**.

---

## 1. Where model 3 stands today

| Area | Today | Gap |
|---|---|---|
| Economy | Per province: 5 sectors, GDP, growth, unemployment, poverty, 10 household cohorts | Good foundation; productivity only reacts to transport infrastructure |
| Infrastructure | Per province: installed stock + functioning condition, projects, maintenance | Only transport; no water/irrigation, no link to health or food |
| Health | Field per province, but every province starts at 65 and moves by the same national delta | Effectively national; only crises differentiate it |
| Education | Same as health (62 everywhere); `educationPipeline` accumulates but **nothing reads it** | No effect on the economy at all |
| Energy | National `energyPressure` + fuel subsidy → fuel inflation | No provincial state, no electricity, no grids |
| Food | National `foodPressure` + harvest crises → food inflation | No production, no surplus/deficit, no trade |
| Province ↔ province | `regionalExposure`: crisis/transport shocks propagate along inferred supply weights | Negative shocks only; no trade, no positive spillover, no shared grid, no migration |
| National | `aggregate()` sums GDP, population-weights the rest. Inflation is computed **nationally, then pushed down** | National numbers do not emerge from provinces for prices, food or energy |

Model 4 keeps everything that works: accounting identity, deterministic streams, the cabinet and DPR, crises, projects, and `advanceMonth` as the only entry point. It rebuilds the provincial core around six interacting pillars.

---

## 2. Design goals (game design)

1. **Every province is a small, distinct economy.** Aceh, DKI Jakarta and Papua Pegunungan should have different problems at the start and react differently to the same national policy.
2. **Pillars interact, and the player can see why.** Every change can be traced to named drivers, using the same style as the existing `changes`/`causes` attribution.
3. **Different time horizons create real choices.** Food and energy prices move in months, infrastructure in 1–2 years, health in 2–3 years and workforce skills in 5+ years. A 60-month term cannot max everything. Education is the classic long-term investment that partly pays off after the term ends.
4. **Geography matters.** Food surplus provinces feed deficit provinces, island grids share electricity and connectivity decides how well help travels. Investing in Java has spillovers; investing in Papua has larger local need but lower absorption capacity.
5. **National stats are honest roll-ups.** GDP, poverty, inflation, food self-sufficiency and the human development index are computed from provinces, never set top-down.
6. **No runaway loops.** Every positive loop has a balancing loop (diminishing returns, upkeep, capacity limits, rising demand).
7. **Stable when untouched.** With opening policies and calm conditions, every stat holds near its observed 2024 baseline. Changes come from player choices and events, not model drift.

---

## 3. Province state: six pillars

Each pillar has a **headline index (0–100)** for the map and a few **real-unit sub-stats** where they help decisions. Stocks are slow-moving variables; flows are recomputed every month.

### 3.1 Economy (existing, extended)
- Stocks: `sectorOutputs[5]`, household cohorts, `unemployment`, `poverty`.
- New: `productivity` — a derived growth contribution built from the other pillars (§4). It replaces the single `connectivity` term.
- New: local price components `foodPrice` and `energyPrice`. Local inflation becomes `core (national) + food (local) + energy (local)` (§6.2).
- Headline: an economic index from GDP per capita (relative to opening), unemployment and poverty.

### 3.2 Infrastructure (split into two stocks)
- `transport` — the existing installed stock + functioning condition, projects and maintenance, unchanged.
- `water` (**new**) — irrigation plus clean water/sanitation access. It feeds **food yields** and **health status**, and floods damage it.
- Headline = 0.6 × transport + 0.4 × water.

### 3.3 Health
- `access` — facilities and health workers. Driven by allocated health spending × absorption capacity, transport (remote access) and skills (local health workforce).
- `status` — population health (life-expectancy proxy). Driven by access, water/sanitation, food security and poverty. Haze and outbreaks reduce it.
- `stunting` (% under-5, real unit) — driven by food security, water, health access and poverty. Moves slowly; it is the bridge from food to future education.
- Headline = existing `health` field (kept for compatibility), computed from status and access.

### 3.4 Education
- `access` — enrolment/school availability. Driven by spending, transport (remote schools) and poverty (child labour).
- `quality` — learning outcomes. Driven by spending × capacity, electrification (lit, connected schools) and stunting (penalty).
- `skills` (**replaces the unused `educationPipeline`**) — workforce human capital. It is fed by graduates (access × quality) at roughly 1/240 per month (≈20-year workforce turnover), so one term moves it about 20% of the way to its target. It raises manufacturing and market-services productivity and improves labour matching.
- Headline = existing `education` field, computed from access and quality. Skills is shown separately as the long-term stat.

### 3.5 Energy (new)
- `electrification` (% households, real unit) — grid extension investment, limited by transport and capacity.
- `capacity` — generation capacity. Investment builds it with a ~24-month lag.
- `demand` — grows with GDP (elasticity ~0.8) and electrification.
- `reliability` (0–100) — from the **grid-wide** supply/demand ratio (§5.2). Low reliability means outages, which hit manufacturing first.
- `energyPrice` (local index) — global energy pressure, fuel subsidy, isolation (diesel-dependent islands cost more) and reliability.
- Headline = 0.4 × electrification + 0.4 × reliability + 0.2 × affordability.

### 3.6 Food (new)
- `production` — tied to the **agriculture sector output** (not a second GDP, so nothing is double-counted) × yield. Yield depends on water/irrigation, agriculture support, energy price (fertiliser, pumps), labour health and harvest crises.
- `need` = population × per-capita requirement.
- `balance` = production − need → surplus is exported and deficit is imported (§5.1).
- `foodPrice` (local index) — national food pressure + unmet deficit + transport cost − reserve releases.
- `foodSecurity` (0–100) — availability and affordability (low-quintile income vs food price). It feeds stunting, health status, poverty and approval.
- Headline = foodSecurity, with self-sufficiency ratio shown as a sub-stat.

---

## 4. Intra-province interactions (pillar ↔ pillar)

### 4.1 One update rule for every stock

```
target_X = X₀ + Σ βₖ · (driverₖ − driverₖ,₀)            // anchored to the opening value
X' = X + κ_X · (target_X − X) · headroom(X) − shock_X
headroom = gains slow as X nears 100; losses slow as X nears 0
```

- **Anchored targets.** With every driver at its opening value, the target equals the observed baseline, so the model is stable when untouched (goal 7). This generalises the pattern already used for connectivity (`infrastructure − initialInfrastructure`).
- **κ (adjustment speed) gives each pillar its time horizon** (table 4.3).
- **Each βₖ term is recorded as a named contribution**, so the province dossier can say "Health status −0.4: food security −0.25, water −0.1, haze −0.05".
- **Double-buffered.** All cross-pillar drivers are read from **start-of-month** values. Update order then cannot change the result and there are no circular dependencies inside a tick. Loops close across months, which also gives the player time to react.

### 4.2 Link matrix (row affects column)

Strength: ● strong, ◐ medium, ○ weak. Sign shows direction.

| From ↓ / To → | Economy | Infrastructure | Health | Education | Energy | Food |
|---|---|---|---|---|---|---|
| **Economy** | — | +○ local co-funding (richer provinces maintain better) | −◐ poverty lowers status; +○ income | −◐ poverty lowers access | +● GDP raises demand (lowers reliability unless capacity follows) | −◐ low income lowers food affordability |
| **Infrastructure** | +● transport → productivity (existing); +◐ lower logistics costs | — | +◐ water → status; +◐ transport → access | +◐ transport → access in remote areas | +◐ transport enables grid extension | +● irrigation → yield; +◐ transport → trade reach, lower prices |
| **Health** | +◐ labour productivity; −◐ outbreaks cut output | — | — | +◐ low stunting → learning quality | — | +○ farm labour |
| **Education** | +● skills → manufacturing/services productivity; +◐ skills → lower unemployment | +○ better project delivery | +◐ skills → health workforce/access | — | — | +○ farm technique adoption |
| **Energy** | +● reliability → manufacturing; −◐ energy price → costs and inflation | +○ powers water pumping | +○ electrified clinics | +◐ electrification → quality | — | −◐ energy price → fertiliser/pump costs |
| **Food** | +● agriculture output; −● food price → real income, poverty, inflation | — | +● food security → status and stunting | −◐ (via stunting, lagged) | — | — |

### 4.3 Time horizons

| Stock | κ per month | Practical effect |
|---|---|---|
| Food price, energy price, reliability | 0.3–0.5 | Visible within 1–3 months |
| Food production | Seasonal (main harvest Mar–Apr, second Aug–Sep) | Shocks and support show at the next harvest |
| Transport, water | Projects (≥18 months) + 0.08–0.12 maintenance drift | Existing behaviour |
| Generation capacity | ~1/24 | Build in year 1, benefit in years 2–3 |
| Health access/status | 0.03–0.05 | Meaningful in 1–2 years |
| Stunting | ~0.02 | Visible late in the term |
| Education access/quality | 0.03 | 1–2 years |
| Skills | ~1/240 | Mostly a legacy stat; small in-term productivity gain |

### 4.4 Designed feedback loops

| Loop | Type | Balance |
|---|---|---|
| Skills → productivity → income → lower poverty → better school access → skills | Reinforcing (slow) | Headroom + 20-year turnover |
| Poverty → food insecurity → stunting → weaker learning → lower skills → poverty | Reinforcing (**poverty trap**) | Broken by assistance, food reserves, water, health access |
| Growth → energy demand → lower reliability → manufacturing loss → slower growth | **Balancing** | The player must expand capacity alongside growth |
| Harvest failure → food price → real income → poverty → health | Shock chain | Reserves, irrigation, trade access |
| Transport → trade reach → lower food/energy prices → real income → approval | Reinforcing | Maintenance upkeep grows with installed stock (existing) |

---

## 5. Inter-province interactions (province ↔ province)

A fixed 38 × 38 **link table** is precomputed into a data file from province centroids (from the existing GeoJSON), island group, grid system and observed GDP. It replaces the 34-node historical mapping for new mechanics. The existing `exposureWeights` stays for shock propagation until it is ported.

```
access(i, j) = gravity(GDPᵢ, GDPⱼ, distance) × lane(i, j) × connectivityᵢ × connectivityⱼ
lane = same island 1.0 · neighbouring island 0.5 · inter-island sea lane 0.25 · remote 0.1
```

Transport infrastructure at **both** ends scales every link, so connectivity investment pays off nationally, not only locally.

### 5.1 Food trade
1. Each province computes `balance = production − need`.
2. Surpluses are allocated to deficits in one proportional pass, weighted by `deficit × access`. There is no iterative solver, and the cost is O(38²).
3. Any remaining deficit is met by national imports at the world price (driven by `foodPressure`), scaled by the import-openness setting (§7). Whatever is still unmet raises the local food price.
   **As built:** a rising import share also raises the local premium, because imported rice costs more. Without it, well-connected deficit provinces such as DKI Jakarta never felt a Javanese harvest failure. Import openness was not added (Q5 remains optional).
4. Conservation test: total exports = total imports + national stock change.

Result: a Javanese harvest failure raises prices in Papua and DKI Jakarta. Poor connectivity in Maluku keeps prices high even when the nation has a surplus.

### 5.2 Electricity grids
Provinces belong to grid systems (simplified): **Jawa-Madura-Bali**, **Sumatra**, **Kalimantan**, **Sulawesi**, plus isolated systems (Kepulauan Riau, Bangka Belitung, NTB, NTT, Maluku, Maluku Utara, the six Papua provinces).

- Capacity and demand are pooled within a grid, so every member shares one reliability value (adjusted by local distribution quality).
- Isolated systems depend entirely on their own capacity and pay a diesel premium in `energyPrice`.
- Optional later: **interconnection projects** (e.g. Sumatra–Java) that merge pools. This would be a national project type with high cost and high spillover.

### 5.3 Economic spillovers (positive and negative)
- A partner's growth adds demand: `spillover_i = σ · Σⱼ access(i,j) · (growthⱼ − trend)`. Growth hubs pull neighbours (Jakarta → Jawa Barat/Banten; Sulawesi Selatan → eastern Indonesia).
- The existing negative shock propagation (`regionalExposure`) keeps working and moves onto the same link table.

### 5.4 Labour migration and remittances
- Migration pressure from i → j = (wage gap + unemployment gap) × access.
- Effects: origin unemployment ↓ and remittance income for low quintiles ↑; destination unemployment slightly ↑ with urban strain. Skilled migration moves part of the skills stock, so a **brain drain** towards Java hubs is possible.
- **Population stays fixed** (decision Q1). Migration is modelled as worker flows and remittances, not residence changes.

### 5.5 Contagion
Outbreaks can seed in linked provinces. The probability is scaled by access and reduced by the destination's health access. Draws use a **new dedicated stream** with a fixed number of draws per province per month, so existing economy, weather, politics and events sequences are unchanged.

---

## 6. National roll-up

### 6.1 Aggregation table

| National stat | Computation |
|---|---|
| GDP, revenue base | Sum of provinces |
| Growth | GDP-weighted (existing) |
| Poverty, unemployment, approval | Population-weighted (existing) |
| Health, education, skills, stunting | Population-weighted (now genuinely differ by province) |
| Food self-sufficiency | Σ production / Σ need |
| Electrification | Household-weighted |
| Energy reliability | Demand-weighted |
| **Inflation** | Weighted average of provincial CPI (§6.2) — **now bottom-up** |
| **Human Development Index (IPM-style)** (new headline) | Geometric mean of health status, education (access + quality) and real consumption per capita — mirrors BPS IPM |
| **Regional inequality** (new) | Williamson index of GDP per capita across provinces |

### 6.2 National ↔ provincial split of responsibilities
- **Top-down (stays national):** tax rates, policy settings and their funding, BI rate, debt, credibility, global regime, `externalDemand`/`foodPressure`/`energyPressure`, core inflation.
- **Bottom-up (emerges from provinces):** food and energy price components, output, employment, services, development and inequality.
- Provincial CPI = core (national) + food (local, after trade) + energy (local, grid/isolation). National CPI = consumption-weighted average. The rate rule still reacts to national core inflation, so monetary behaviour is preserved.

### 6.3 National feedbacks into provinces
- Revenue grows with the national GDP sum; collection still depends on provincial capacity.
- Inequality becomes a political input: the Regional party responds to outer-island gaps, and protest probability rises with inequality.
- National food stocks (reserve policy) are released to the highest-price provinces first.

---

## 7. How policy reaches the pillars

### 7.1 Policy → pillar map (existing policies)

| Policy | Primary pillar effect | Secondary |
|---|---|---|
| Personal / business / consumption tax | Economy (existing) | Consumption tax raises the food price burden on low quintiles |
| Tax administration | Capacity (existing) | Absorption of all programs |
| Fuel subsidies | Energy price (now local, larger on isolated grids) | Budget |
| Targeted assistance | Household income (existing) | Food security (affordability), school access |
| Education | Education access/quality | Skills (long) |
| Health | Health access | Status and stunting |
| Infrastructure | Transport projects (existing) **+ water systems** | Food yield, health, trade access |
| Maintenance | Transport + water condition | — |
| Auditing | Leakage (existing) | Program efficiency in every pillar |

### 7.2 New policies (proposed: three)

| Policy | Pillar | Default and portfolio |
|---|---|---|
| **Electricity & grid investment** | Energy capacity + electrification | 50; Infrastructure ministry (see Q4) |
| **Agriculture support** (irrigation, inputs, extension) | Food yield; water | 50; Economy ministry (see Q4) |
| **Food reserves** (Bulog-style stockholding) | Smooths food price spikes; costs money while stocks are held | 50; Economy ministry |
| *Optional:* Food import openness | Cheaper food vs farm incomes in surplus provinces | Discuss in Q5 |

**Budget neutrality at opening:** the opening defaults of the new lines are carved out of existing spending, so the opening ledger (program spending 238.49/month) is still reproduced exactly.

### 7.3 Spatial distribution: national money, provincial effect
Today, only infrastructure has a per-province allocation weight. In model 4, every **spatial program** (infrastructure, health, education, electricity, agriculture) is distributed by:

1. **A distribution rule per program** (one in-game dropdown each, via `GameSelect`):
   - *Per capita* — equal per person (default; reproduces the opening).
   - *Need-based* — weighted towards low pillar scores (equity, but meets lower absorption).
   - *Growth hubs* — weighted towards high productivity and access (efficiency and spillovers, but inequality rises).
2. **The existing province priority level** (Wilayah) multiplies the share for all programs. This is the same control players already know, not 38 × 5 sliders.
3. **Absorption:** delivered effect = allocated money × provincial `capacity` × minister value × (1 − leakage). Papua can receive the most money and still convert less of it. This is the core equity-versus-efficiency trade-off.

---

## 8. Events and politics hooks

| Existing event | New pillar effects |
|---|---|
| Flood | Transport + water damage; local food production; outbreak risk |
| Harvest failure | Food production → trade network → prices elsewhere |
| Earthquake | Transport, health access |
| Haze | Health status, education (school closures) |
| Outbreak | Health status, labour productivity; can spread (§5.5) |
| El Niño | Food yields **and** hydro capacity (energy) |
| Energy shock regime | Energy price, strongest on isolated grids |

Approval gains named pillar contributions: food price (strong, fast), outages (strong, fast), health access (medium) and education (weak, slow). Party preferences extend naturally: Labor → food prices, Regional → outer-island inequality and electrification, Green → haze and health, National → energy self-sufficiency.

---

## 9. Engine architecture

**As built** (single modules rather than folders; coefficients live in `pillarRules` in config.ts):

```
src/engine/
  province.ts   // per-province monthly update: economy, transport, households (phase 1 extraction)
  pillars.ts    // opening baselines, program intensity, water/energy/food/health/education/skills, development index
  network.ts    // food trade, grid pooling, spillovers, worker flows, outbreak spread, program shares
src/data/
  pillars.json  // observed and synthetic baselines (scripts/import-pillars.ts)
  network.json  // 38×38 links, island groups, grids, distances (scripts/build-network.ts)
```

Monthly order inside `advanceMonth` (existing steps unchanged except where noted):

1. Resolve actions, regime, pressures, hazards and incidents *(existing)*.
2. Financing estimate, policy delivery, funded policies *(existing)*.
3. **Distribute program envelopes to provinces** (§7.3).
4. **Network pass on start-of-month state:** food trade, grid pooling, spillovers, migration.
5. **Pillar pass per province** (double-buffered): infrastructure → energy → food → health → education → economy (GDP, households, approval). Order is fixed but irrelevant to results because inputs are start-of-month values.
6. Crisis recovery, politics, parties *(existing)*.
7. **Aggregate** to national stats; ledger and accounting invariant *(existing)*.

Constraints carried over:
- **Determinism:** no extra draws on the four existing streams; a new `regions` stream has fixed draw counts.
- **Performance:** benchmark runs 672,000 monthly turns, and attribution re-runs months counterfactually. The network pass is O(38²) and pillar passes are O(38 × links). **As built:** about 4.3 ms per bare month versus 3.0 ms for model 3 on the development machine (1.4×), and the same cost as model 3 for strategy turns after speeding up action change detection.
- **Attribution:** every pillar delta is a sum of named contributions plus a "Bounds" remainder, like `p.changes` today.
- **Saves:** model/schema 4, `autosave-v4`; older saves are kept and exportable but not migrated (same policy as v2 → v3).

---

## 10. UI plan (follows AGENTS.md)

- **Map overlays** (existing `GameSelect` dropdown): add Health, Education, Energy, Food, Development (IPM) and Inequality contribution.
- **Province dossier:** an always-visible **six-pillar stat strip** (index + trend arrow + one real-unit sub-stat). A **"Drivers" tab** shows each pillar's top three contributions this month. **As built:** the tab is named "Pillars" and also lists food flows, grid, worker movement and program shares. Tabs only, no accordions; `StatHelp` `?` buttons explain each pillar in EN/ID.
- **Network view:** a map mode drawing the month's largest food flows and grid systems (lines on the existing atlas). **As built:** "Power grids" and "Food trade" map layers; the food layer shades self-sufficiency and draws the twelve largest routes.
- **Policy paper:** new sliders under labelled Energy and Food sections, plus a distribution-rule dropdown beside each spatial program, with the existing budget preview.
- **Summary / HUD:** keep the five HUD indicators. Add a national pillar panel to Summary with IPM, food self-sufficiency, electrification, reliability and inequality. **As built:** in Summary's event log and on the legacy screen, so the three-stage monthly summary keeps its fixed structure.
- **Monthly briefing:** pillar events can surface among the existing three issues ("Outages in the Sulawesi grid", "Food deficit in Maluku").
- **Localization:** all new labels, links and help text in `locales/*-id.ts`.

---

## 11. Data and calibration

### 11.1 Baseline data to import per province (dataset 2024.3)
| Pillar | Candidate source | Fallback |
|---|---|---|
| Health status | BPS IPM components: life expectancy (Umur Harapan Hidup) | Synthetic from poverty/urban |
| Stunting | Survei Kesehatan Indonesia 2023 provincial prevalence | Synthetic |
| Education access/quality | BPS IPM: expected and mean years of schooling | Synthetic |
| Electrification | Ministry of Energy (ESDM) provincial electrification ratio | Synthetic from urban share |
| Food production | BPS rice production by province (Luas Panen dan Produksi Padi) | Agriculture sector share |
| Grid membership | PLN system map (qualitative grouping) | Island group |
| Distances | Existing GeoJSON centroids | — |

Each import gets a script in `scripts/`, provenance in `baseline.json` and an entry in RESEARCH.md, as done for sectors. Anything not imported is labelled **synthetic**.

### 11.2 Acceptance tests
1. **Steady state:** opening policies, `calm` mode, 60 months → every pillar within ±1 point of its baseline, growth 5.03 ± 0.1, inflation 1.57 ± 0.2.
2. **Link signs:** for every row in `links.ts`, raising the driver moves the target in the declared direction (generated tests, one per link).
3. **Conservation:** food exports = imports + stock change; grid supply is shared and not created; national values equal weighted provincial sums.
4. **Opening ledger:** reproduced exactly, and the accounting invariant holds.
5. **Determinism and continuation:** existing tests extended to the new stream.
6. **Benchmark (re-frozen):** no fixed package dominates. Single-pillar strategies (e.g. "only infrastructure") lose to balanced strategies. Each pillar has at least one scenario where neglecting it costs the election. A need-based strategy reduces inequality while a growth-hub strategy raises GDP, so both remain viable.
7. **Performance:** benchmark wall time no more than 1.5× model 3.

---

## 12. Delivery phases

| Phase | Scope | Output that can be reviewed |
|---|---|---|
| 0 | Data import scripts + 38 × 38 link table + steady-state test harness | Baseline data with provenance |
| 1 | Refactor existing province update into the pillar framework with **identical results** (regression snapshot) | Same game, new structure |
| 2 | Provincial health and education (real baselines, access/quality/skills; skills replaces the dead pipeline) | Provinces diverge in services |
| 3 | Energy and food pillars + three new policies + budget carve-out | New sliders, overlays |
| 4 | Network: food trade, grids, spillovers, migration, contagion | Flows map view |
| 5 | National roll-up changes: bottom-up inflation, IPM, inequality; politics hooks | Summary panel |
| 6 | Distribution rules, dossier strip and Drivers tab, briefing items, localization | Full UI |
| 7 | Calibration, benchmark re-freeze, MODEL.md v4, QA docs | Release evidence |

Each phase ends with passing `npm test`, `npm run build` and a playable build. Phase 1 is the safety net: if it reproduces model 3 exactly, every later change can be measured against it.

---

## 13. Decisions (confirmed 2026-10-01)

| # | Question | Decision |
|---|---|---|
| Q1 | Should migration change province population? | **No.** Population stays at the BPS baseline; migration moves workers, skills and remittances only |
| Q2 | Per-province policy control | **Distribution rule per program + existing province priority level** (no per-province sliders) |
| Q3 | Real units next to 0–100 indices | One real-unit sub-stat per pillar |
| Q4 | Ministries for energy and food | **Existing ministries:** Electricity → Infrastructure; Agriculture support and Food reserves → Economy |
| Q5 | Food import openness policy | Phase 3b, optional |
| Q6 | Long-term stats in the legacy score | **Yes.** Skills, stunting and IPM count towards the end-of-term legacy |
| Q7 | Grid interconnection projects | Later phase |
