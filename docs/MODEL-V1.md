# Model specification (ODD), version 1
## 1. Purpose and patterns
A 60-month presidency strategy simulation initialized with 2024 observations. This is a hypothetical January 2025 inauguration, not a recreation of the actual administration. Economic mechanisms are research-informed; behavioral coefficients are game assumptions, not econometrically identified estimates. Match accounting identities and sensible directional responses before making predictive claims.
## 2. Entities, state variables and scales
38 provinces, five sectors (agriculture, extractives, manufacturing, market services, public services), ten weighted household groups per province (five income quintiles crossed with urban/rural), six fictional parties, six portfolios. Money in trillion IDR; province GDP is an annual real output level in 2024 prices, monthly production is one twelfth. Population in millions, rates in percent. Infrastructure, health, education, capacity and trust are bounded 0-100 model indices.
## 3. Process and scheduling
Validate actions and majority votes; apply policies and shocks; fund projects and services; update provincial output and households using previous-period inputs; settle taxes, interest and debt; update political support; record changes and save. Lagged states break circular dependencies. A project changes infrastructure on completion; that stock affects productivity only on later turns. Education accumulates a cohort pipeline and creates no immediate productivity bonus.
## 4. Design concepts
Feedback: taxes affect disposable income and private investment; infrastructure and maintenance affect capacity; subsidies affect prices and finance; household outcomes affect support. Heterogeneity: province sector exposures, income, urbanity, implementation capacity. Randomness: seeded external shocks, delivery disruption, polling and election uncertainty. Replay includes RNG state. Politics is fictional, synthetic, and not a forecast.
## 5. Initialization
See bundled baseline.json and RESEARCH.md. Observed and inferred fields are labeled separately. Normalize raw boundary codes by province name, including six contemporary Papua provinces. Annual flows are converted to monthly flows. National output uses the sum of provincial GRDP, with a scale reconciliation to national GDP, documented in baseline provenance.

The inauguration interface can set an alternative opening cabinet and policy vector. `preparePresidency` validates six unique appointments and bounded policies, applies the existing appointment trust adjustments, and requires the existing parliamentary voting rule to pass the opening package. This is a labeled pre-turn setup convention. It leaves month, household outcomes, output, debt and cash unchanged; appropriations affect the first resolved turn. Presets are convenience choices, not empirically estimated policy packages. The historical initial ledger remains the 2024 reference; the next-month estimate reflects the chosen policies. Optional walkthrough metadata is saved independently of economic effects; old saves without it remain compatible.
## 6. Input data
Bundled scenario only, no runtime APIs. Research parameters have central and low/high values. Empirical baseline fields are not behavioral coefficients. No full copyrighted publications are redistributed.
## 7. Submodels
Growth = structural trend + external sector exposure + infrastructure relative to baseline + fiscal demand deviation - tax drag - monetary drag, with bounded annualized rates. Monthly compounding is (1+g/100)^(1/12). GDP-weighted sector aggregation. Inflation converges with persistence toward an inflation target plus food, fuel and demand shocks; monetary rate reacts with a lag. Effective revenue = tax-base components + non-tax revenues, multiplied by administration efficiency. Actual spending is bounded by revenue and a debt-dependent borrowing envelope. Interest is paid before discretionary spending. Debt change = spending + interest - revenue, with surpluses repaying debt then accumulating cash. The balance sheet has matching private net financial assets, not a claim of a complete banking microsimulation.
Household real disposable income includes modeled wage distribution, employment, progressive tax exposure, welfare targeting and consumption-tax/fuel incidence. Poverty responds gradually to real income changes, with separately recorded contributions. Weighted group satisfaction informs provincial approval. Households and urban weights are synthetic.
Cabinet affects implementation and partner relationships. Legislation requires >50% of 580 synthetic seats. Rejected budgets continue existing appropriations. Coalition promises require 3 months of funded regional allocation; broken promises hurt trust. Campaign funds are separately tracked. Final two-candidate vote is population-weighted provincial support plus bounded seeded uncertainty, a simplified electoral rule. The game ends after 60 turns regardless of result.

## 8. Operational equations and effect ownership

All rates below are percent, not fractions, unless explicitly divided by 100. These constants are game assumptions. Source of truth is `src/engine/simulation.ts`; parameter ranges are in config.ts. The model is a hybrid stock/flow strategy model with weighted agents, not a microsimulation of individual Indonesians.

For province p and sector k, annualized growth is clamped to [-15,15]:

```
g_pk = trend + (infrastructure_previous - infrastructure_initial) × investmentProductivity
       + (assistance - 50) × fiscalDemand × funding
       - (businessTax - 15) × taxDrag - (personalTax - 10) × .025
       - (interestRate_previous - 6) × monetaryDrag
       + (economyMinisterCompetence - 90) × .008
       + externalShock × sectorExposure_k - crisis - 3 × (1-funding)
Y_pk_next = Y_pk_previous × (1 + g_pk/100)^(1/12)
Y_p_next = sum_k Y_pk_next
g_p = 100 × ((Y_p_next / Y_p_previous)^12 - 1)
```

Sector exposures are [.6,3.5,1.5,.5,.1]. A uniform monthly external shock in [-.3,.3] is shared nationally. The small sector aggregation/bounds residual is recorded explicitly. National growth is current-output-weighted province growth, an annualized display measure rather than a national year-over-year observation. No extra GDP bonus is applied when a project completes: completion modifies infrastructure; only the lagged stock enters the next production update. Education changes services and a legacy pipeline; it never independently boosts output during this term.

Tax revenue uses the lagged real-output level and price index, then the newly enacted tax rates:

```
R = nominalGDP_previous / 12 × (.03 + .35 × personalTax/100
    + .20 × businessTax/100 + .30 × consumptionTax/100) × collection
collection = clamp(1 + populationWeightedCapacityChange × .015
                   + (financeCompetence-85) × .001, .7, 1.3)
programRequest = nominalGDP_previous / 22139 × (119 + .45 × fuel
    + .45 × assistance + .48 × education + .30 × health
    + .48 × infrastructure + .14 × maintenance
    + .03 × administration + .04 × auditing) + emergencyRelief
interest = debt × (.045 + rate/100 × .15 + max(0, debt/nominalGDP-.45) × .12) / 12
```

The borrowing envelope is nominalGDP/12 × .035; it falls to .01 above debt/GDP .50 and .002 above .65. Funding is clamp((revenue+envelope+cash-interest)/request,0,1). All programs receive this funding fraction; interest has priority. If interest alone exceeds resources, borrowing still settles interest and a zero-program-funding warning is shown. There is no sovereign-default submodel. Surpluses repay debt before accumulating cash. Accounting tolerance is 1e-7 trillion IDR:

```
revenue + borrowing - repayments - programSpending - interest - cashChange = 0
privateNetFinancialAssets = governmentDebt - treasuryCash
```

The balancing asset stock is not a complete commercial-banking balance sheet. Tax bases are calibrated fractions, not a labor/business income reconciliation. Household income indices and consumption-price incidence influence well-being; they are not a complete closed input-output or national-income accounting system.

Infrastructure allocation is the funded national envelope × province population × chosen weight / sum(population × weight). A connectivity contract costs max(5, initialGDP × .012) divided by procurement efficiency clamp(.45 + integrity × .003 + auditing × .002,.4,1). Monthly project spending is the minimum of provincial allocation, unspent contract cost, and cost/18 × delivery efficiency, halved during regional disruption. The remaining infrastructure appropriation represents routine untracked capital works, with no extra productivity benefit. Spending remains in the envelope even with no named projects. Named projects complete after actual funded expenditures reach their contract cost, add eight infrastructure points, and cannot be duplicated while active. Maintenance changes the infrastructure stock by .008 × (funded maintenance - 50) each month.

Health and education indices update gradually using funded spending and the respective minister's competence. The education pipeline adds max(0, fundedEducation-40)/1200 each month; it is an index of modeled future potential, not a wage estimate or forecast. Administrative capacity changes by .004 × (fundedAdministration-50) + .002 × (homeAffairsCompetence-76). No immediate second tax-administration revenue bonus exists; collection reads the accumulated capacity stock.

Inflation = .85 × previous inflation + .15 × [2.5 + .018 × (50-fuel) + .15 × max(0,previousGrowth-5) + externalShock], bounded [-1,20]. Provincial crisis adds .6 × disruption to local cost inflation. BI-like autonomous rate adjusts 12% of the gap to [4.5 + 1.5 × max(0,previousInflation-2.5)] each month, bounded [2,18]. Production uses the previous monetary rate. This is a reduced-form autonomous rule, not an estimated Indonesian monetary reaction function.

Unemployment changes by -(growth-trend) × growthEmployment + .03 × crisis, bounded [.5,35]. Real household income grows with .35 × growth/12, employment change, capacity-adjusted quintile-targeted assistance, progressive personal-tax exposure, consumption-tax incidence, and local living costs. Urban/rural incidence differs. Income is a bounded [20,500] index starting at 100. Poverty changes by -.12 × the change in the bottom two quintiles' weighted income index, bounded [.2,65]. These are stylized distribution dynamics, not measured poverty elasticities.

Approval adjusts 15% toward a bounded target: 55 + .8 × (income-100) + .15 × (health-65) + .1 × (education-62) + .2 × (credibility-60) - 2 × crisis + campaignExposure + platformAlignment. Campaign exposure decays 6% monthly; one visit costs 1–20 credits from an initial 80, and adds 1.5 × sqrt(spend). Credits have no treasury conversion. Individual group contributions are aggregated with population weights and stored in `state.causes`. Inflation, debt-ratio and coalition changes also store reconciling contributions for the indicator dialogs.

## 9. Political rules and observation

Parties vote on their priority's normalized distance from the proposal. Coalition votes require trust - 25 × distance ≥30. Opposition votes require distance <.12 and trust ≥45. Appointments remove five trust from the departing minister's party and add eight to the appointee's party. Each month trust changes by .22 - .7 × distance + .07 per held portfolio. Coalition trust below 25 causes withdrawal.

Regional deals add 15 trust and coalition membership, raise the province's allocation to at least two, and create three-month commitments. Each month requires allocation ≥2, infrastructure policy ≥50, and funding ≥80%. All three funded months add eight trust and two credibility; otherwise subtract 30 trust and six credibility. These commitments reserve a share of an existing envelope rather than create unfunded money. Democracy changes with auditing and an assumed penalty for coalitions above 500 seats; it is an unvalidated game index.

Deterministic crisis opportunities occur during turns 6,20,36,50, plus a 4% monthly chance otherwise. A seeded province suffers three turns of disruption with severity 1.2–2.2. Relief costs Rp 2T per active month and attenuates severity by 65% × actual funding. Unanswered and monitoring responses retain the disruption. Crises resolve rather than remove the president.

At turn 60 the vote is population-weighted provincial approval plus independent province uncertainty in [-3,3] points. A strict majority wins; an exact tie is treated as loss. No runoff, turnout, electoral commission, constitutional eligibility or regional threshold is modeled. Low support never triggers automatic removal. The ending reports realized output, poverty, services, debt and democratic health, with education potential explicitly separate.

## 10. Reproducibility and evaluation

Seed and current 32-bit LCG state are serialized. Every update clones its input. The worker uses exactly the exported advanceMonth implementation used by batch experiments. Save schema/model/dataset versions and referential checks reject incompatible states. History contains initial observation plus one snapshot per completed turn. No outcome is driven by an LLM.

See VALIDATION.md for the limited held-out growth comparison, repeated seeds, parameter endpoints, accounting checks and host benchmark. Engine tests additionally verify delays, rejected legislation, distribution weights, seeded continuation, financing adjustments and corrupted saves. These checks establish implementation behavior; they do not certify predictive accuracy. Population migration, endogenous demographics, detailed bank lending, cross-province supply chains and estimated behavioral heterogeneity remain outside this implementation.
