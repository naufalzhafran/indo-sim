# Presidency model specification (ODD), version 4.0.0

## Purpose and scope

A fictional January 2025 presidency lasts 60 monthly turns across 38 provinces. Model 4 gives every province six interacting pillars (economy, infrastructure, health, education, energy and food), links the provinces through trade, shared grids, growth spillovers, worker flows and outbreak spread, and builds the national statistics from the provinces. It supports strategy play; it is not an Indonesian economic, social or election forecast.

Model 4 keeps every model 3 mechanism that is not listed below: finance and budget accounting, the borrowing allowance, policy delivery and cabinet effects, administrative capacity, installed transport assets and maintenance, crises and global regimes, incidents, parties, requests, households, campaigns and the election. Those equations are archived unchanged in [MODEL-V3.md](MODEL-V3.md). Earlier generations are in MODEL-V1.md and MODEL-V2.md. The approved design and its decisions are in [MODEL-V4-DESIGN.md](MODEL-V4-DESIGN.md).

Units follow model 3: money in trillion IDR, GDP as an annual real level at 2024 prices, population in millions, other stocks as indices. Food is in tons of milled dry grain (GKG) per year.

## Data (dataset 2024.3)

`scripts/import-pillars.ts` writes `src/data/pillars.json`; `scripts/build-network.ts` writes `src/data/network.json`. Sources and transformations are in RESEARCH.md.

| Field | Status | Source |
|---|---|---|
| Life expectancy, mean and expected years of schooling, IPM | Observed, 2024 | BPS IPM 2024 (new method) |
| Stunting among children under five | Observed, 2023 | Kemenkes, Survei Kesehatan Indonesia 2023 |
| Paddy production | Observed, 2024 | BPS, Luas Panen dan Produksi Padi menurut Provinsi |
| Household electrification | Observed for 12 provinces (4 approximate), 2022; synthetic elsewhere | PLN household ratio as reported by GoodStats |
| Grid membership | Simplified | PLN interconnected systems: Sumatra, Jawa-Madura-Bali, Kalimantan, Sulawesi; others isolated |
| Water systems, health access, opening food security, grid reserve margins | Synthetic | Gameplay assumptions from urban share and poverty |
| Province links | Derived | Map centroids, island groups and distance |

Population stays at the BPS 2024 baseline for the whole term.

## Province state

Each province adds an `initial` record of its opening values and these stocks (0–100 unless stated): `water`, `healthAccess`, `healthStatus`, `stunting` (%), `educationAccess`, `educationQuality`, `skills`, `electrification` (%), `powerCapacity`, `powerPipeline`, `powerDemand`, `reliability`, `foodProduction`, `foodNeed`, `foodSecurity`, plus monthly results `foodReceived`, `foodImported`, `foodUnmet`, `foodPremium`, `energyPremium`, `migration`, `development` and named contributions `pillarChanges`. `health = (healthAccess + healthStatus) / 2` and `education = (educationAccess + educationQuality) / 2` keep their model 3 names. The unused `educationPipeline` is removed; `skills` replaces it.

Opening values:

```
healthStatus₀    = 65 + 4.5 × (lifeExpectancy − 74.15)
educationAccess₀ = 62 + 8 × (expectedSchooling − 13.21)
educationQuality₀= 62 + 4 × (meanSchooling − 8.85) + 2 × (expectedSchooling − 13.21)
skills₀          = 55 + 7 × (meanSchooling − 8.85)
foodSecurity₀    = clamp(100 − 0.9 × stunting − 0.6 × poverty, 20, 95)
reliability₀     = 50 + 150 × (reserveMargin − 1)
foodNeed         = population share × national rice production ÷ 0.97
```

National rice production therefore covers 97% of national need at opening; imports cover the rest.

## Update rule

Every pillar stock moves toward an anchored target:

```
target = opening value + Σ coefficient × (driver − driver's opening value)
next   = current + speed × (target − current)
```

With opening policies and calm conditions every driver stays at its opening value, so pillars hold near their 2024 levels. Each term is recorded under a readable name in `pillarChanges`; the remainder of the step is "Adjustment toward target". All drivers are read from start-of-month values, so the order in which provinces and pillars are processed never changes results.

## Program money and absorption

Five programs are split between provinces: infrastructure, public health, education, electricity and agriculture. Each has a distribution rule (`perCapita`, `need`, `hubs`), changed with the `distribution` action without a DPR vote.

```
weight  = 1 (per capita)
        | clamp((100 − stat) ÷ (100 − national mean), 0.25, 3)   (need)
        | clamp(√(GDP per person ÷ national) × transport ÷ 55, 0.25, 3)  (hubs)
share   = weight × priority, normalized so the national per-person average is 1
delivery = funded policy ÷ (opening setting × opening minister value) × expertise ÷ opening expertise
intensity = 1 + (delivery × share − 1) × clamp(capacity ÷ 70, 0.4, 1.2)
headroom = clamp((100 − opening value) ÷ 35, 0.5, 2)
```

The need stat is the transport index for infrastructure, the health and education indices for those programs, the mean of electrification and reliability for electricity, and food security for agriculture. Intensity is 1 under the opening budget. Low-capacity provinces convert less of any increase; provinces that start low have more room to improve. The Wilayah priority level multiplies every program's share and also sets the infrastructure envelope split used by projects.

## Pillar equations

Speeds are per month. Coefficients are in `pillarRules` in config.ts.

| Stock | Speed | Target terms (change from opening) |
|---|---|---|
| Water | 0.03 | +12 × (infrastructure intensity − 1) × headroom; +8 × (agriculture intensity − 1) × headroom. Maintenance below requirement wears 0.05 × shortfall per month; floods remove 0.5 × damage |
| Health access | 0.04 | +30 × (health intensity − 1) × headroom; +0.12 × transport; +0.08 × skills |
| Health status | 0.025 | +0.4 × access; +0.12 × water; +0.2 × food security; −0.25 × poverty; −0.08 × stunting. Haze and outbreaks subtract 0.4 × burden per month |
| Stunting | 0.015 | −0.12 × food security; −0.06 × water; −0.06 × access; +0.25 × poverty. Bounded 1–70 |
| Education access | 0.03 | +21 × (education intensity − 1) × headroom; +0.1 × transport; −0.3 × poverty; +0.04 × electrification |
| Education quality | 0.025 | +16 × (education intensity − 1) × headroom; +0.08 × electrification; −0.25 × stunting; +0.06 × reliability; +0.05 × health status. Haze and outbreaks subtract 0.15 × burden |
| Skills | 1/240 | +0.7 × education; +0.1 × health status; workers leaving subtract 0.01 × outflow |
| Electrification | gap × 0.001 × electricity intensity × transport reach | — |
| Food security | 0.3 | −1.2 × local food premium; +0.25 × (low-income income index − 100); +0.1 × water |

Energy. Demand is `opening demand × (GDP ratio)^0.8 × (1 + 0.3 × electrification change ÷ 100)`. New construction each month is `(1 + 24g) × g × capacity × electricity intensity`, where g is normal monthly demand growth at trend; it enters a pipeline that matures over 24 months, so opening funding keeps capacity growing with demand. Each grid pools capacity and demand; isolated provinces stand alone. El Niño removes 3% of hydro capacity. Reliability moves halfway each month toward `50 + 150 × (capacity ÷ demand − 1)`.

Food. Production is `opening production × agriculture output ÷ its trend path × (1 − 0.15 × harvest burden)`. Surplus provinces offer their surplus to deficit provinces in proportion to deficit × link; the part that arrives is `link × transport factor at both ends × 1.1` (capped at 1). Imports then cover `clamp(0.35 + 0.5 × transport factor) × (1 − 0.06 × max(0, world food pressure))` of what remains. The transport factor is `clamp(transport ÷ 55, 0.4, 1.3)`.

Local premiums, from start-of-month conditions:

```
food premium   = clamp((10 × (unmet − opening unmet) + 4 × (import share − opening import share)) × reserve factor, −3, 15)
energy premium = isolated ? 0.35 × max(0, energy pressure) : 0  + 0.06 × max(0, opening reliability − reliability)
reserve factor = clamp(1 + 0.5 × (1 − funded reserves ÷ opening reserves), 0.5, 1.5)
```

## Inter-province links

`links(i, j) = lane × exp(−km ÷ 2500)`, with lane 1 inside an island group, 0.6 for neighbouring groups and 0.35 otherwise.

- **Growth spillover:** `0.12 × Σ links × partner GDP × (partner growth − trend) ÷ Σ links × partner GDP`, added to every sector.
- **Worker flows:** pressure `0.35 × weighted gap in (unemployment change − 0.15 × (growth − trend))`, bounded ±2; positive means workers leave. Leaving lowers unemployment by 0.04 × pressure per month and adds 0.6 × pressure percent to the incomes of the two lowest quintiles. Population never changes.
- **Outbreak spread:** one draw per province per month from a dedicated `regions` stream. Chance `min(0.06, 0.012 × Σ links × outbreak burden × clamp(1 − (health access − 40) ÷ 120, 0.2, 1.2))`. The four model 3 streams keep their draw counts.
- **Disruption propagation:** the model 3 supply exposure is unchanged.

## Economy, households and politics

New growth contributions (annualized points): workforce skills `(skills − opening) × [0.015, 0.025, 0.05, 0.05, 0.03]` by sector; population health `0.03 × (health status − opening)`; power supply `(reliability − opening) × [0.01, 0.02, 0.05, 0.03, 0.01]`, halved above opening; farm conditions for agriculture `0.04 × water − 0.12 × energy premium + 1.5 × (agriculture intensity − 1)`; neighbouring provinces as above.

Households pay local food and energy premiums as living costs, receive remittances, and rural households gain 0.03% income per point of new electrification. Service approval now compares health and education with each province's own opening values (model 3 compared with 65 and 62 everywhere, which were also the opening values). Outages below opening reliability lower the approval target by 0.15 per point and are recorded as "Power outages".

Labor's secondary stance becomes food reserves ≥ 60 when the population-weighted food premium exceeds 1. Regional's secondary stance becomes electricity ≥ 60 when reliability has fallen five points on average. Protest chance rises by 0.3 × the increase in regional inequality. Outbreak risk compares national health with its opening level instead of a fixed 65.

## Calibration

Coefficients were tuned on development seeds 0–99 only, then frozen before fresh-seed evaluation. Three changes came from diagnosis rather than search:

- **Absorption counted once.** Program intensity first multiplied delivery by capacity relative to opening and then applied absorption again. The double count made tax administration a multiplier on every program and favoured fixed packages with high administration.
- **Outages softened.** Successful play grows faster than trend, so demand outran capacity and outages cost adaptive play about 2.9 approval points over a term. The reliability slope fell from 250 to 150 per unit of capacity ratio and the approval penalty from 0.25 to 0.15 per point; the balancing loop remains.
- **Electoral baseline 49.6** (model 3: 49). Model 3's health and education rose by about 5 and 2.5 points even at opening funding, lifting every strategy's approval. Anchored pillars remove that drift, so the strategy-neutral voting baseline was raised to keep a comparable level of difficulty.

Program strengths were raised to 30 (health access), 21 (education access) and 16 (education quality) so funded services still earn approval after the end of unbounded accumulation. The benchmark strategies raise electricity when population-weighted reliability falls 1.5 points and agriculture when the average food premium exceeds 0.5.

## New policies and budget

Electricity & grid investment (Infrastructure ministry, 6 months), agriculture support (Economy, 6 months) and food reserves (Economy, 3 months) default to 50 and cost 0.2, 0.2 and 0.1 trillion per point per month. Their opening cost was removed from the fixed appropriation constant, so the opening ledger (program spending 238.49 per month) is reproduced exactly. They share each ministry's concurrent-reform pace.

## National roll-up

GDP and food are sums; health, education, development, skills, stunting, electrification and reliability are population-weighted means; growth remains GDP-weighted. Inflation is the population-weighted average of provincial prices:

```
national inflation = 0.6 × core + 0.25 × (food + mean food premium) + 0.15 × (fuel + mean energy premium)
provincial inflation = 0.6 × core + 0.25 × (food + food premium) + 0.15 × (fuel + energy premium) + 0.4 × local stress
```

Harvest losses reach national food inflation through production, trade and premiums instead of the model 3 shortage term. Funded reserves damp the world food pressure term. Two inflation causes are added: "Local food shortages after trade" and "Isolated grids and power outages".

The development index follows BPS IPM: `100 × ∛(health index × education index × consumption index)` with health from life expectancy implied by health status, education from expected and mean schooling implied by education access and skills, and consumption from GDP and household income changes, anchored to each province's observed 2024 IPM. Regional inequality is the population-weighted Williamson index of GDP per person. Snapshots record development, inequality, food self-sufficiency, electrification, reliability, skills and stunting; the legacy screen reports their change over the term.

## Saves and verification

New saves use model 4.0.0, schema 4, dataset 2024.3, `autosave-v4` and `draft-session-v4`. Model 1, 2 and 3 saves are preserved and exportable; importing them explains that model 4 requires a fresh campaign.

Phase 1 moved the province update into `province.ts` and was verified byte-identical to model 3 over three full campaigns before any model 4 mechanism was added. `src/engine/pillars.test.ts` checks the observed baselines, the link table, calm stability, roll-up consistency, trade bounds, the direction of each policy link, reserve damping, distribution rules, cross-province food prices and save continuation. Release evidence is in [ENGINE-V4-QA.md](ENGINE-V4-QA.md) and the [strategy benchmark](STRATEGY-BENCHMARK.md).
