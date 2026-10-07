# Model specification (ODD), version 2.0.0

## Purpose, scale and evidence

A hypothetical January 2025 presidency lasting 60 monthly turns: 38 provinces, five production sectors, 380 weighted household cohorts, six fictional parties and six cabinet portfolios. This is a strategy simulation with research-informed mechanisms, not a calibrated forecast. Money is trillion IDR; GDP is an annual real output level at 2024 prices, converted to monthly flows by dividing by 12. Population is millions. Income and institutional stocks are model indices. The previous equations are archived in MODEL-V1.md.

Observed 2024 population, GDP, poverty, unemployment and sector composition come from BPS. Sector composition is table 89 of the April 2025 provincial GRDP publication, with raw percentages, the source PDF checksum, aggregation and rounding retained in `src/data/sectors.json`. The five groups are A; B; C; D–N plus R–U; O–Q. The service labels are broad activity groupings, not ownership classifications. All urban shares, cohort profiles, institutional behavior, initial capital/service indices and propagation weights remain explicitly inferred. Research published after the scenario start informs mechanisms rather than contemporaneous forecasts.

## State and turn order

`advanceMonth(state, actions)` clones its input and returns the next state, outcomes, accounting and report. It remains the sole monthly worker entry point. The state carries approved `policies`, `effectivePolicies`, persistent `macro` pressures, three RNG `streams`, provincial demand and supply stress, cohort market/expected income and voting preference, crisis damage/stage/age, party delivery/demands, and recorded regional commitments.

1. Validate actions, resolve parliamentary votes, appointments, allocations, contracts, deals and relief responses.
2. Evolve external demand, food and energy pressures; draw weather independently and announce eligible warnings.
3. Estimate appropriations and financing; compute funding; progress policy implementation and funded effects.
4. Activate last month's warnings, damage assets, calculate regional exposures, and fund ongoing construction.
5. Update component prices, monetary conditions, sector output, services, household purchasing power and voting preference.
6. Repair disaster damage, evaluate delivery commitments and coalition demands, and update trust.
7. Settle treasury accounts; record indicator contributions and history. At month 60, resolve the election and end the term.

External economy draws use a fixed six draws per month; weather uses four, regardless of action/event eligibility. Separate serialized LCG states use multiplier 1664525, increment 1013904223 and a 32-bit unsigned modulus. Seed salts are in simulation.ts. Policy choices can change vulnerability and event location through risk weights, but cannot reroll the underlying weather or external-demand draws. Political uncertainty has its own stream. The retained `rng` field is unused by v2 turn dynamics.

## Public finance and implementation

The original budget identity and debt-dependent financing envelope remain. Revenue uses prior nominal GDP and the newly effective tax rates. Appropriations are approved recurring commitments, including setup resources while expansion is implemented. Taxes take effect on the next resolved turn. Other policy delivery moves toward its approved target by `controlMaximum / deliveryMonths × competence/85 × funding / concurrentPortfolioReforms`, capped at the remaining gap. Funding zero stalls implementation. Cabinet portfolios and durations are in `deliveryRules`: assistance 3 months, administration/auditing/health/infrastructure 6, education 12, maintenance 3, fuel 1 at full-scale workload. A smaller adjustment can finish sooner. Tax schedules do not consume service implementation capacity.

Non-tax policy benefits use `effectivePolicy × funding` exactly once. Fuel benefits no longer use an unfunded requested setting. Fuel costs rise with the persistent energy-pressure index: `fuel × .45 × (1 + energyPressure × .06)`. Administration and auditing costs are .18 and .12 per point above the baseline, preserving initial budget spending. Collection reads accumulated administrative capacity; monthly capacity changes by `.015 × (fundedAdministration−50) + .002 × (homeAffairsCompetence−76)`.

The program financing envelope is monthly nominal GDP × .035, falling to .01 above debt/GDP .50 and .002 above .65. Cash buffers are available; interest has priority. Programs share the remaining funding fraction. Interest-only distress remains explicit borrowing rather than a sovereign-default model. Surpluses repay debt before accumulating treasury cash.

```
revenue + borrowing − repayment − programSpending − interest − cashChange = 0
privateNetFinancialAssets = governmentDebt − treasuryCash
```

Contracts cost `max(5, initialProvinceGDP × .012) / procurementEfficiency`. Efficiency reads minister integrity and previously delivered, funded auditing; announcing an audit increase does not immediately lower a contract's price. Projects share the provincial infrastructure envelope; construction is capped by monthly contract delivery, with disruption reducing progress. Completion adds eight infrastructure points; productivity and connected-route resilience use the stock subsequently. Unallocated infrastructure spending represents routine public capital works and implementation costs, without an extra GDP bonus. Education continues to create services and a long-horizon legacy pipeline, not an immediate productivity gain.

## Persistent economy and prices

For each pressure, `innovation = U1 + U2 − 1`. Monthly external demand follows `.92 × previous + 1.5 × innovation`, bounded [-5,5]; food pressure follows `.9 × previous + 1.8 × innovation`, bounded [-3,6]; energy pressure follows `.94 × previous + 1.7 × innovation`, bounded [-4,7]. These persistence and shock sizes are game assumptions.

Core inflation retains .88 of its previous value and moves toward 2.5 plus excess demand and lagged food-price persistence. Food inflation retains .65 and responds to food pressure and regional shortages. Fuel inflation retains .55 and responds to energy pressure and funded subsidy coverage. National inflation weights these components .60/.25/.15; weights are assumptions, not extracted CPI weights. The price index compounds the annualized national rate monthly. The autonomous policy rate moves 12% toward `6 + 1.5 × max(0, previousCoreInflation−2.5)`; temporary food shortages do not mechanically trigger the same response as persistent core inflation.

Potential growth retains the structural trend. Realized sector growth adds lagged productive infrastructure, temporary demand adjustment, tax and monetary effects, delivery competence and sector-specific external demand; it subtracts funding shortfalls, local disruption and upstream exposure. Annualized sector growth is bounded [-15,15], compounded monthly. Sector outputs sum to province GDP. No network transfer or intermediate purchase is separately added to GDP.

Assistance changes a demand **level**: target `(fundedAssistance−50) × fiscalDemand`; 25% of the gap closes monthly. The growth contribution is four times the change in this level, so unchanged funded assistance does not permanently add growth. Food pressure reduces agricultural supply most strongly; energy pressure harms manufacturing and transport while benefiting extractives. A funding shortfall costs six growth points at zero funding. Policy response coefficients remain unestimated assumptions.

## Regional exposure and disaster recovery

The exposure network has 34 historical BPS nodes. Present-day provinces 91/93/94/95 map to historical Papua; 92/96 map to historical Papua Barat. Current province outcomes remain separate. All allocations involving split provinces are inferred.

For each of five sectors, source weights use observed baseline sector output multiplied by assumed accessibility (same node 6, same island group 2, other groups .35), then normalize to one. These are an inferred exposure network, **not measured IRIO flows**. BPS IRIO supplies the historical geography reference only. Links transmit a fraction of food/transport disruption; local disruption is charged separately. Better infrastructure at the source and destination reduces transmission. GDP is never multiplied by a Leontief inverse or augmented by gross transactions.

Weather opportunities have seasonal probabilities (.20 in November–March, .12 otherwise); the flood mix is .70/.25 respectively. Conditional location weights reflect infrastructure vulnerability for floods and agricultural exposure for harvest failures. There is at most one unresolved emergency per province. No mandatory crisis dates exist.

A new crisis starts with one month of warning. On the following turn, damage depends on severity, maintenance, existing infrastructure and pre-authorized funded relief. Floods subtract actual infrastructure stock; harvest failures mainly reduce agricultural supply. The active burden scales with remaining/initial damage. Relief mitigates household disruption by up to 65% at full funding, while repairs still take time.

Relief costs `max(.25, provincePopulation × severity × .12)` per active month, including preparation. Flood recovery depends on funded maintenance, regional infrastructure allocation, relief and local capacity. Harvest recovery has a natural component plus funded assistance and relief. Below 55% remaining damage, the stage changes to recovery; below .05 and after at least three months of age it resolves. The displayed remaining months are an estimate at current delivery, not an expiry date. Responses can be changed later. Repaired flood damage restores the corresponding asset stock; relief cannot instantly erase it.

## Households, expectations and elections

Cohort `marketIncome` grows with wages, employment changes and unexpected local inflation. Disposable income is recomputed each turn from that market-income **level**, effective transfer coverage, tax incidence and living costs. Transfers are not repeatedly compounded into wages. Lower-income groups have greater food and assistance exposure; urban/rural incidence differs. Both income indices are bounded [20,500].

Expected income grows with normal potential wage growth and adapts 2.5% toward the prior observed income each month. Approval adjusts 15% toward a target combining purchasing power relative to expectations, health/education services, credibility, employment, crisis losses, unfunded services and campaign/platform effects. Each contribution reconciles to the actual approval change, including bounds.

Voting preference is separate: it adjusts 12% toward a target anchored at 49 plus .8 × (approval−50), credibility, democratic health and campaign exposure. This is a fictional competitive-election assumption, not estimated Indonesian incumbent advantage. At month 60, population/cohort-weighted preference plus bounded provincial political uncertainty determines the two-candidate vote. Strictly more than 50% wins. There is no forced outcome, adaptive difficulty or early termination. Campaign funds remain separate from treasury accounts.

## Parties and commitments

Parties have weighted policy interests, cohort affinities, delivery memory, cabinet influence and trust. Voting scores combine these factors; coalition support needs score ≥30, opposition needs distance <.16 and score ≥35. Passing legislation still requires more than 290 of 580 seats. Constituency outcomes affect monthly trust. At most one demand per party requests a delivered policy target with a visible six-month response window; fulfillment adds trust/delivery, missing it subtracts them. Trust below 25 removes coalition support. Departing partners can be negotiated with later.

A portfolio can change once per turn; reappointing its current minister does nothing. Same-party replacements do not manufacture trust. Cross-party reshuffles remove eight trust from the departing party and add five to the incoming one.

Deals reserve an additional regional allocation step and require an uncommitted province, three adequately funded months, and additional construction expenditure or infrastructure improvement. Initial trust is not awarded simply for signing. A party has a twelve-month deal cooldown; simultaneous promises cannot reuse the same province. Fulfilled delivery adds trust/credibility; broken commitments reduce both. Measurable start-of-deal stocks are serialized to prevent recycled claims.

## Reproducibility, compatibility and evaluation

Model/schema version 2 and dataset 2024.2 are checked on import. New state fields, identities, bounds, accounting, references, demands, crisis damage and sector balances are validated. Inauguration changes targets and cabinet without advancing time; implementation begins on the first monthly turn. Old model 1 saves are never migrated: the IndexedDB `autosave` key remains intact and exportable; model 2 uses `autosave-v2`. Imports of model 1 explain the incompatibility and leave the active game unchanged.

`npm test` verifies mechanism directions, accounting, replay, persistence, delays, funded benefits and exploit resistance. `npm run benchmark` compares six observable-state strategies across four starting conditions, using seeds 0–99 for development and 1000–1099 held out. It reports wins, output, debt, household losses, funding minima, growth variation and regional divergence. `npm run validate` retains the limited held-out GDP trend comparison and policy-active parameter sensitivity. Gameplay evaluation and empirical validation are explicitly separate. Full input-output accounting, calibrated political behavior, firm/bank agents and migration remain outside this model.
