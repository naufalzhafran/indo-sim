# Presidency model specification (ODD), version 3.0.0 (archived)

## Purpose and evidence

A fictional January 2025 presidency lasts 60 monthly turns across 38 provinces, five production sectors, 380 weighted household cohorts, six parties and six cabinet portfolios. Observed population, GDP, poverty, unemployment and sector composition are BPS 2024 data (dataset 2024.2). Urban shares, institutional stocks, political behavior, household profiles, propagation weights and response coefficients are game assumptions. This model supports strategy play; it is not an Indonesian economic or election forecast. Money is trillion IDR, GDP an annual real level at 2024 prices, population millions, other stocks indices. Earlier equations are archived in MODEL-V1.md and MODEL-V2.md.

## State, monthly actions and determinism

`advanceMonth(state, actions)` remains the sole monthly engine entry point. It clones inputs, resolves legislation/appointments/agreements/contracts/relief, evolves external pressures and warnings, finances programs, delivers policy, activates crises, constructs assets, updates production/prices/households, repairs damage, evaluates promises/trust, settles accounts and records history. Elections occur at month 60; the term ends afterward. Actions and the game interface retain their existing shapes.

Economy, weather and politics have independent serialized LCG streams: multiplier 1664525, increment 1013904223, unsigned 32-bit modulus. Economy uses six draws per month and weather four regardless of choices/event eligibility. Policies change exposure, prevention and crisis location, never future draws. Saving and restoring preserves continuation exactly. Learning and UI metadata do not change engine results.

Provincial state now includes `initialCapacity` and `installedInfrastructure`. Each agreement stores `requiredSpend` and the total provincial project expenditure at signing (`startSpent`). The historical `startInfrastructure` field is retained as metadata and does not count toward fulfillment.

## Finance and budget previews

The inherited default cabinet and policies reproduce the opening monthly ledger: revenue 2842.5/12, program spending 238.49 and interest 488.42/12. Nominal GDP equals aggregate real GDP times the price index. Revenue is:

```
(2842.5/12) × nominalGDP/openingGDP ×
(.03 + .35×personalTax/100 + .2×businessTax/100 + .3×consumptionTax/100)/.128 × collection
```

Collection compares population-weighted capacity with its provincial opening baseline, multiplied by finance expertise/value relative to the inherited Finance minister, and is bounded [0.85,1.15]. It cannot accumulate unlimited returns.

Recurring expenditure retains the linear costs: fuel .45 per point (times `1 + energyPressure×.06`), assistance .45, education .48, health .30, infrastructure .48, maintenance .14, administration .18 and auditing .12. Administration/auditing retain their opening offsets. Each non-tax program adds `.006 × max(approvedSetting−50,0)²`. The whole appropriation scales with nominal GDP. Costs are charged on approved commitments while benefits depend on delivered, funded policy. Interest uses the inherited annual debt interest rate, the monetary-rate change and a continuous risk surcharge above 45% debt/GDP.

Annual borrowing allowance starts at 2.4% of nominal GDP through 40% debt/GDP, decreases linearly to 0.2% at 65%, and stays at 0.2% thereafter. The monthly allowance is annual allowance divided by twelve. Available cash buffers shortfalls; interest has priority; remaining financing funds programs proportionally. Surpluses automatically repay debt before accumulating cash. Interest-only distress is explicit borrowing, not a sovereign-default model. Relief is part of requested program spending. Inauguration, monthly comparison tables and resolved turns use the same `budgetEstimate` / `financingEstimate` functions with their current observable inputs; future macro/weather shocks can change a resolved month.

```
revenue + borrowing − repayment − programSpending − interest − cashChange = 0
privateNetFinancialAssets = governmentDebt − treasuryCash
```

## Delivery, administration and services

Taxes take effect on the next turn. Non-tax delivery approaches its approved target by `controlMaximum / deliveryMonths × cabinetPace × funding / concurrentPortfolioReforms`, capped at the remaining gap. Program benefits use effective settings times funding times cabinet delivery value. The three cabinet working styles and six portfolios are preserved.

Supported administrative capacity is `clamp(initialCapacity + .35×(deliveredAdministration−openingDeliveredAdministration))`. Every month capacity closes 6% of the gap to that target. Expansion approaches a plateau; funding cuts gradually reduce capacity toward a lower supported stock. The same current stock supports collection, assistance delivery and recovery.

Health and education services still improve gradually, with education adding a long-term legacy pipeline instead of an immediate production bonus. Their approval coefficients are .16 for health and .11 for education, shared constants calibrated on development seeds. They were reduced because service accumulation overwhelmed income, funding and disaster choices. Credibility contributes `.2×(credibility−60)` to approval, with no second direct electoral preference reward.

## Installed assets, condition and upkeep

`installedInfrastructure` starts at the inherited infrastructure stock. Contract cost is `max(5, initialProvinceGDP×.012) / (procurementEfficiency×cabinetValue)` and is fixed when commissioned. Spending is limited by provincial allocation, remaining contract cost, monthly delivery and disaster disruption. Projects use the existing infrastructure envelope and need at least 18 adequately supplied months. Completion adds eight installed points (up to 100) and the same amount to functioning condition.

Required maintenance is `50×openingInfrastructureCabinetValue×installedInfrastructure/initialInfrastructure`. Coverage compares delivered maintenance with that requirement. Below full coverage condition deteriorates by `.08×(1−coverage)` per month; excess coverage restores ordinary wear by `.12×(coverage−1)`. Restoration is bounded by installed capacity minus outstanding flood damage. Maintenance cannot expand capacity, replace construction expenditure or independently erase flood damage. Newly built assets increase recurring upkeep requirements. Productivity uses functioning condition, so damaged or neglected installed assets do not grant full benefits. The shared investment productivity coefficient is .06 annual growth points per functioning point above the inherited stock, within the existing .02–.06 sensitivity range. Development calibration raised it from .04 after removing free maintenance expansion; completed construction now carries the return.

## Economy, crises and regional exposure

The retained economy has persistent external demand `.92×previous + 1.5×innovation`, food pressure `.9×previous + 1.8×innovation` and energy pressure `.94×previous + 1.7×innovation`, where innovation is two independent uniforms minus one. Component prices, sector growth, disposable income and household expectations follow the model 2 equations except for the explicitly revised stocks and crisis burden.

Weather announces one month of warning. Activation damage is severity times physical units (four for floods, two for harvest failures), mitigated by funded maintenance, functioning infrastructure and pre-authorized relief. All production, household, price and regional propagation effects now use `remainingDamage / physicalUnits`, which is severity multiplied by the remaining fraction of **unmitigated** damage. Dividing by the already mitigated initial damage previously canceled prevention on the first production shock. `initialDamage` still identifies the recovery stage, not economic severity.

Relief costs `max(.25, provincePopulation×severity×.12)` per ongoing month and protects households while recovery remains gradual. Flood repairs use funded maintenance, infrastructure allocation, relief and supported capacity, restoring condition within installed capacity. Harvest recovery uses a natural component, assistance and relief. Crises resolve only after sufficient recovery and age. Existing inferred supply exposures use BPS historical 34-province geography; they are not measured input-output transactions and do not add gross flows to GDP.

## Global conditions, hazards and incidents

A separate seeded `events` stream drives a global regime: steady conditions, commodity boom, global slowdown, capital outflows, oil price shock, El Niño drought, La Niña rains or bumper harvests. Each campaign opens with six steady months. Regimes last 4–14 months (per-regime ranges in `regimeRules`); after a shock, half of transitions return to steady and a shock never repeats immediately. Each regime adds a monthly push to the external, food and energy paths (the seeded innovations are unchanged), may add imported core inflation, and changes flood and drought likelihood. Capital outflows add a policy-rate premium amplified by debt above 40% of GDP (×(1 + 4×excess)) and by credibility below 60; slowdowns ease the rate target by 0.5. Rates adjust at 0.24 per month while a premium applies and 0.12 otherwise. Revenue scales by `1 + .012×externalDemand`, representing commodity royalties.

Weather draws 13 values every month. Floods and harvest failures keep their seasonal probabilities in steady conditions; La Niña and El Niño reweight them. Earthquakes (2.2% monthly, weighted toward seismic provinces) strike without warning, damage infrastructure at once (5 units × severity, mitigated up to 50% by funded maintenance and administrative capacity) and are rebuilt from the following month at 75% of the flood repair rate. Forest-fire haze (dry season, fire-prone Sumatra and Kalimantan provinces, doubled under El Niño) is prevented by auditing and capacity, and largely ends when the wet season returns. Outbreaks (1.8% monthly, more likely when national health is below 65) are prevented and contained by health policy and the provincial health index. Haze and outbreaks form a health channel: they lower the health index by 0.4 × burden per month and reduce sector output, with no supply-link spillover.

The events stream also draws three values for each of five incidents every month, so incident eligibility never shifts the global path. Probabilities respond to the record: procurement scandals rise with weak delivered auditing and low cabinet integrity (with delivered auditing ≥60, fraud is caught early and credibility rises by 1); industrial investment rises with low business tax, credibility, connectivity and commodity booms; strikes rise with inflation above 3.5%, unemployment above 5.5% and fall with assistance; protests rise with approval below 50, fuel support below 45, consumption tax above 12 and funding shortfalls; tourism surges favor connected destination provinces. Incidents create temporary conditions that add growth points and approval-target points to a province (or nationwide) for 2–12 months, recorded as "Local developments" and "News and local events". Credibility lost in earlier months recovers by 2% of the gap to 60 each month.

Monthly reports lead with the most notable movement in growth, inflation or approval.

## Politics: party acceptance and requests

Each party has one **acceptance** score (0–100). It closes 20% of the gap to a visible target each month. The target is `50 + base attitude + primary stance + secondary stance − red line + cabinet + voters + goodwill`:

- Stances are judged on delivered policy (funding and cabinet quality included). A stance scores its full weight when met, falls to zero at 10 points short and reaches −weight at 20 points short. Weights are 18 (primary) and 10 (secondary).
- A crossed red line (judged on enacted law) costs 15.
- Cabinet influence adds 3 points per seat of influence, capped at 9. Coalition builders count twice.
- Constituent approval adds `(approval − 50) × 0.3`, clamped to ±8.
- Goodwill comes from answered requests and appointments (+5 to the incoming party, −8 to the departing one) and decays by 8% a month.
- Base attitudes are fictional calibration constants: Civic +2, Labor +15, Regional +9, Enterprise −4, Green +3, National +15.

| Party | Primary stance | Secondary stance | Red line |
|---|---|---|---|
| Civic | Education ≥ 65, +2 each year up to 75 | Auditing ≥ 50 | Personal tax ≤ 18 |
| Labor | Assistance ≥ 70 (85 when food inflation > 4%) | Health ≥ 60 | Consumption tax ≤ 12 |
| Regional | Infrastructure ≥ 70 (Maintenance ≥ 75 when floods or earthquakes affect ≥ 5% of the population) | Maintenance ≥ 55 (Infrastructure ≥ 60 during such a disaster) | Infrastructure ≥ 45 |
| Enterprise | Business tax ≤ 10 | Infrastructure ≥ 60 | Business tax ≤ 12 |
| Green | Health ≥ 75 (85 during an active outbreak or haze) | Auditing ≥ 55 | Fuel support ≤ 55 |
| National | Fuel support ≥ 65 (75 under energy pressure above 1) | Maintenance ≥ 55 | Fuel support ≥ 65 |

Green and National hold incompatible fuel red lines.

**Votes** compare the proposed law with current law:

- Every party votes no if a package crosses its red line.
- Loyal parties (≥ 65) otherwise vote yes.
- Cooperative parties (45–64) vote no if the package widens the shortfall on either stance.
- Wary parties (25–44) vote yes only if the package narrows a shortfall and widens none.
- Hostile parties (< 25) vote no.

A package needs 291 of 580 seats. Coalition membership is derived: a party joins at acceptance 45 and leaves below 40. The opening coalition is Civic, Labor and Regional (355 seats). Starting acceptance is 72 / 65 / 60 / 42 / 44 / 38.

**Requests.** From month 4, each party draws twice from the politics stream every month, whether or not a request is issued, so the stream stays aligned. A party issues a request with probability `0.10 × mood`. Mood is 0.7 when Loyal, 1.0 when Cooperative and 1.4 when Wary or Hostile.

Issuing limits:

- A party can have only one request.
- At most two requests can be awaiting an answer.
- A party waits six months after its last request resolves.
- Requests that could not finish by month 60 are not issued.

A request is one of six mechanics:

- **Policy pledge:** the policy in force reaches a target within 4–6 months.
- **Hold the line:** the enacted value stays on one side of today's level for 6 months.
- **Regional project:** 8% or 12% of a provincial contract in new construction after acceptance, within 6 months. Maintenance, repairs and earlier spending do not count.
- **Crisis relief:** relief is authorized within 2 months.
- **Budget transfer:** Rp 4T or Rp 8T paid from next month's budget.
- **Cabinet seat:** a named minister is appointed within 2 months.

Relief requests are three times as likely while a matching crisis is unanswered.

Requests are answered on the month they appear or the next one. No answer counts as a refusal plus 2. Rewards by tier (minor / major):

| Outcome | Acceptance now | Goodwill | Other |
|---|---|---|---|
| Accept | +3 / +5 | | |
| Fulfilled | +8 / +12 | +10 / +18 | Credibility +0.5 |
| Declined | −3 / −5 | −4 / −6 | |
| Broken | −12 / −18 | −15 / −25 | Credibility −4; every other party −3 goodwill |

A hold breaks as soon as the line is crossed. Requests whose subject disappears (a crisis that ends untreated, a seat filled anyway) are withdrawn without penalty.

Older saves migrate on load:

- Trust becomes acceptance.
- An open deadline demand becomes an active policy pledge.
- A regional promise becomes an active project request, with its required spend and start spending kept.

## Households and elections

Market income changes with wages, employment and local inflation; disposable income adds current transfers and subtracts taxes/living costs, without compounding transfers into wages. Expected income grows with normal potential wage growth and adapts 2.5% toward prior observed income. Approval closes 15% of the gap to its target. Contributions include purchasing power, services, credibility, employment, disruption, funding, platform and campaigns, with a bounds term reconciling the realized change.

Voting preference closes 12% toward `49 + .8×(approval−50) + .12×(democracy−70) + .25×campaignExposure`. At month 60, population/cohort preference plus bounded provincial political uncertainty determines the two-candidate vote. Strictly more than 50% wins. From month 48, Summary offers one monthly provincial visit and a platform choice. Campaign credits remain separate from treasury funds. No outcome override, forced defeat or adaptive difficulty exists.

## Compatibility and verification

New saves use model/schema 3 and dataset 2024.2. `autosave-v3` and `draft-session-v3` are separate from both previous save generations. Original `autosave` (model 1), `autosave-v2` and previous draft records are preserved without migration. Exports for both generations are available before taking office and in the game menu; importing either explains that model 3 requires a fresh campaign. Model 3 imports validate identities, bounds, references, required promise costs, asset ceilings, sector balances and accounting.

`npm test` covers engine regressions, accounting, contribution reconciliation, determinism, bounds and continuation. Playwright checks changed previews, both old exports, rejection without active-save replacement, English/Indonesian requirements, accessibility and layout. UI follows GameSelect/StatHelp and prohibits accordions. `npm run build` produces the application. `npm run benchmark` uses 0–99 development seeds, freezes coefficients and strategy source fingerprints, then evaluates 20000–20099 across normal, commodity, food-energy and disaster conditions. `--development` calibrates without touching held-out seeds; `--evaluate` requires a matching successful freeze. Acceptance and full results are in STRATEGY-BENCHMARK.md and strategy-benchmark.json. These gameplay checks are separate from limited empirical trend validation.

The final evaluation includes 14 strategies, 100 seeds per scenario and four scenarios in each split: 11,200 complete campaigns and 672,000 monthly turns. Development pooled active wins are 62.125%, versus 28.5% for the strongest fixed package. Fresh seeds 20000–20099 yield 70.5% pooled active wins, versus 34.5% for the strongest fixed package, exceeding it by 36 percentage points. Maintenance-only agreements fulfill zero promises; blanket agreement spam wins zero campaigns. Coefficients and strategy sources were frozen before fresh-seed evaluation and were not retuned afterward. Detailed release evidence is in [ENGINE-V3-QA.md](ENGINE-V3-QA.md).
