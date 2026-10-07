# Research register, dataset 2024.3 / model 4

Reviewed for this implementation on 29 September 2026. Papers inform mechanisms; none of the game's response coefficients is presented as a directly estimated causal effect. The scenario starts in January 2025, but the research register may include later publications. This is not a contemporaneously available forecasting exercise.

## Observed baseline and transformations

The [BPS Statistical Yearbook of Indonesia 2025](https://www.bps.go.id/en/publication/2025/02/28/8cfe1a589ad3693396d3db9f/statistik-indonesia-2025.html) supplies all 38 contemporary provincial observations. The downloaded official PDF was extracted with Poppler. Original observations and conversions are preserved in baseline.json and scripts/import-baseline.py. Printed page numbers below differ from PDF indices by 44.

| Field | Reference period / table | Units and transformation | Limitations |
|---|---|---|---|
| Population | 2024, 3.1.1, p133 | Thousand persons / 1,000 = millions | Midyear projection, held fixed during play |
| Observed GRDP | 2024, 15.2.1, p785 | Billion IDR / 1,000 = trillion | Preliminary current-price estimates |
| Model initial GDP | Same | Observed GRDP × 1.0053790207; sums to Rp 22,139T | Reconciliation to national GDP; original observedGrdp retained |
| Poverty | September 2024, 4.6.2, p315 | Percent, unchanged | Survey point estimate, not a monthly series |
| Unemployment | August 2024, 3.2.11, p160 | Percent, unchanged | Labor-force unemployment, not population share |
| Historical real GRDP | 2020–2024, 15.2.2, p786 | Billion constant-2010 IDR | 32 stable provinces; all Papua regions excluded |

National growth starts at 5.03%, shared across provinces only as an initialization assumption. The model treats current-price 2024 output as its base-year real level; subsequent nominal values multiply it by the modeled price index. It does not combine the historical 2010-price series with live 2024-price levels.

National fiscal reference: revenue Rp 2,842.5T and spending Rp 3,350.3T, from the Ministry of Finance's [2024 budget execution release](https://anggaran.kemenkeu.go.id/in/post/apbn-2024-mendukung-pemulihan-dan-pertumbuhan-ekonomi). Interest Rp 488.42T is inferred from audited deficit minus primary deficit in the [2024 central-government financial report](https://www.djpb.kemenkeu.go.id/direktorat/apk/images/2025/07/5_LKPP_2024_Bahasa_Inggris.pdf). These preliminary totals and audited interest are a mixed-vintage reference, not a reproduced audited statement. Annual flows divide by 12. Subsequent receipts and appropriations follow the game equations.

Initial BI rate 6%: [December 2024 decision](https://www.bi.go.id/en/publikasi/ruang-media/news-release/Pages/sp_2627524.aspx). Initial inflation 1.57%: [2024 inflation release](https://www.bi.go.id/id/publikasi/ruang-media/news-release/Pages/sp_270125.aspx). Starting debt is GDP × an illustrative 39.8% ratio, not an independently extracted debt observation.

## Inferred fields

Urban/rural proportions, income-group weights, income indices, infrastructure, health, education, administrative capacity, all political attributes and approval are synthetic. There are ten weighted groups per province, each quintile carrying 20% weight; urban/rural weights use the assumed urban share. These model assumptions are documented in [README.md](../README.md#references-and-model-assumptions).

## Model 4 provincial pillars (dataset 2024.3)

Collected 1 October 2026. BPS statistics tables render in the browser, so observed values were read from the rendered tables and recorded with their sources in `scripts/import-pillars.ts`, which writes `src/data/pillars.json`.

| Field | Reference period / source | Transformation | Limitations |
|---|---|---|---|
| Life expectancy, mean and expected years of schooling | 2024, BPS IPM (new method; life expectancy from Long Form SP2020) | Opening health status and education indices (MODEL.md) | Component values as republished from BPS tables in Wikipedia's provincial HDI list, cross-checked with BPS 2024 headline figures. Papua Pegunungan life expectancy uses 67.39 (Katadata from BPS 2024); Wikipedia lists 67.69 |
| IPM | 2024, BPS via Katadata Databoks | Anchors the development index | Index, not a welfare measure |
| Stunting | 2023, [SKI 2023 nutrition factsheet](https://repository.badankebijakan.kemkes.go.id/5535/), figure 3 | Opening stunting and food security | Survey estimate; one year earlier than other fields |
| Paddy production | 2024, [BPS table](https://www.bps.go.id/en/statistics-table/3/WmpaNk1YbGFjR0pOUjBKYWFIQlBSU3MwVHpOVWR6MDkjMw==/) | Tons GKG; provinces sum to 53,142,726.65 | Rice proxies all food; highland Papua staples are not rice, so its rice deficit overstates the real food deficit. Only changes from the opening position affect prices |
| Electrification | 2022 PLN household ratio for 12 provinces, as reported by [GoodStats](https://goodstats.id/article/meski-tren-nasional-naik-tetapi-masih-ada-provinsi-dengan-cakupan-listrik-yang-sangat-rendah-dbzNo) | Papua, Papua Barat, Papua Barat Daya and Sulawesi Barat reported as about 87–89%; 88 used | 26 provinces are synthetic estimates from poverty and urban share (90–100%). The PLN ratio is lower than the ESDM ratio, which includes non-PLN supply |
| Grid systems | PLN interconnected systems, simplified | Four pooled grids; other provinces isolated | Reserve margins are synthetic |
| Province links | `scripts/build-network.ts` | Great-circle distance between map centroids; lane weights by island group | Gameplay exposure weights, not freight data |

Water systems, health access, opening food security and grid reserve margins are synthetic. Response coefficients for every pillar are game assumptions, documented in MODEL.md and `pillarRules` in config.ts.

## Observed sector update and regional exposure

[BPS provincial GRDP by industry 2020–2024](https://www.bps.go.id/id/publication/2025/04/11/95c729ee8c6fb5e2cb86b00f/gross-regional-domestic-product-of-provinces-in-indonesia-by-industry-2020-2024.html), released April 11, 2025, table 89 (printed pages 113–114, PDF pages 137–138), supplies 2024 current-price industry shares for all 38 provinces. The official PDF was downloaded from BPS and checked visually. `scripts/import-sectors.py` extracts positioned table words, checks all row sums and retains raw percentages and the PDF SHA-256 in `src/data/sectors.json`. Percentages are normalized for published rounding. Grouping: A agriculture, B extractives, C manufacturing, D–N plus R–U market/other production, O–Q administration/education/health. Broad service labels do not distinguish provider ownership. April sector shares and February yearbook GDP totals are explicitly mixed vintages.

[BPS IRIO 2016](https://www.bps.go.id/id/publication/2021/12/29/3ea49c0d856eceaba836792d/tabelinterregional-input-output-indonesia-tahun-2016-tahun-anggaran-2021.html) documents 34 historical province nodes. Model 2 uses that geography: 91/93/94/95 map to historical Papua, 92/96 to historical Papua Barat. **Its numerical transaction matrix has not been imported.** Link weights are inferred from observed sector output and island-access assumptions (same node 6, same island 2, other island .35), normalized by sector. They are exposure weights, not observations, shipments or full input-output accounting. Shock propagation never adds gross transactions to GDP.

## Model 2 mechanism references

| Primary source | Applied mechanism | Transfer limit |
|---|---|---|
| [Democracy 4 policies](https://www.positech.co.uk/democracy4/mod_policies.html), [situations](https://www.positech.co.uk/democracy4/mod_situations.html) | Separate approval from delivery; persistent crisis states and recovery | Proprietary design reference, not empirical evidence; durations independently chosen |
| [Freeciv diplomatic AI](https://github.com/freeciv/freeciv/blob/main/ai/default/daidiplomacy.c) | Weighted agreements, relationships and actor interests | GPL source studied as a design reference; no source code copied |
| [OpenTTD industry logic](https://github.com/OpenTTD/OpenTTD/blob/master/src/industry_cmd.cpp) | Transport service affects productive activity | GPL source studied as a design reference; no code/probabilities copied |
| [BI inflation guidance](https://www.bi.go.id/en/fungsi-utama/moneter/inflasi/default.aspx) | Core, volatile-food and administered-price channels | Weights, persistence and policy responses are unestimated game assumptions |
| [World Bank Indonesia Economic Prospects, June 2024](https://documents1.worldbank.org/curated/en/099062124085019387/pdf/P1795561b546840d6197b5181ca07a690ed.pdf) | Harvest, food-input and transport disruptions affect purchasing power | No monthly causal coefficients transplanted |

Expectation adaptation, electoral preference, party affinities, demand deadlines and crisis hazards are fictional strategy behavior. They are not fitted political estimates. Numerical assumptions are documented in MODEL.md and implemented in simulation.ts, dynamics.ts, regions.ts and config.ts. Benchmarks evaluate challenge separately from empirical adequacy.

## Mechanism register

| Source | Method / population / horizon considered | Use and transfer limits |
|---|---|---|
| [IMF public investment, 2026](https://www.imf.org/en/publications/selected-issues-papers/issues/2026/02/04/golden-vision-2045-making-the-most-out-of-public-investment-indonesia-573702) | Indonesia macroeconomic policy modeling; medium/long term | Financing and efficiency constrain returns. No numerical multiplier transplanted. |
| [Gertler et al., roads](https://www.nber.org/papers/w30454) | Empirical road-quality and local economic outcomes in Indonesia; multi-year effects | Completed infrastructure affects productivity; maintenance preserves stock. Local estimates are not national elasticities. |
| [World Bank fuel reform](https://documents.worldbank.org/en/publication/documents-reports/documentdetail/099748505212431959) | Indonesia household/fiscal distribution analysis | Fuel support affects prices and budget; incidence differs by household. No fitted national coefficient. |
| [Cahyadi et al., transfers](https://www.nber.org/papers/w24670) | Randomized Indonesian conditional-cash-transfer rollout; six-year follow-up | Separate immediate purchasing power and delayed services. Game assistance is broader than the evaluated program. |
| [Roodman schooling reanalysis](https://arxiv.org/abs/2207.09036) | Reanalysis of school-construction identification and later labor outcomes | Education has delayed potential, no immediate GDP boost. Conflicting estimates motivate uncertainty rather than a selected wage elasticity. |
| [Olken 2007](https://doi.org/10.1086/517935) | Randomized monitoring in Indonesian village road projects | Procurement leakage and audit resources; national extrapolation and response magnitude are assumptions. |
| [Tax administration versus rates](https://www.nber.org/papers/w26150) | Administrative firm-tax evidence from Indonesia | Collection capacity and effective rates are distinct; compliance response is illustrative. |
| [BI inflation review](https://www.bi.go.id/en/publikasi/kajian/Pages/Determinants-Of-Inflation-In-Indonesia-Dynamics-Over-A-Decade.aspx) | Literature review across inflation drivers and horizons | Separate administered fuel prices, disruption, demand and delayed monetary response. Not an estimated Phillips curve. |
| [Slater 2018](https://doi.org/10.1017/jea.2017.26) | Comparative political/historical analysis of Indonesian coalitions | Office-seeking, party trust and policy distance. Fictional seats, response weights and election behavior are unvalidated. |
| [ODD protocol](https://www.jasss.org/23/2/7.html) | Model description and reproducibility protocol | Entities, schedules, inputs and submodels documented in MODEL.md. |
| [Fagiolo et al. validation](https://www.lem.santannapisa.it/WPLem/files/2017-23.pdf) | Economic agent-model calibration/validation review | Verification, held-out comparisons and sensitivity reported separately. Research standards are a target, not proof this model satisfies all of them. |

The seven original parameter ranges remain in engine/config.ts and [README.md](../README.md#behavioral-parameter-ranges). Additional v2 coefficients are documented in MODEL.md and the engine modules. Their classification is **game assumption**, not empirical or transferred estimate. Baseline quantities are observations except where labeled. No estimated causal response sizes are claimed.

## Geography and redistribution

[Ardian Saputra Hasibuan's 38-province map](https://github.com/ardian28/GeoJson-Indonesia-38-Provinsi) supplies the current bundled GeoJSON under its MIT license. Attribution, references, and preparation details are in [README.md](../README.md#geography-and-abstractions) and [third-party notices](../public/THIRD-PARTY.md). Province codes are normalized by name, including 91 Papua, 92 Papua Barat, 93 Papua Selatan, 94 Papua Tengah, 95 Papua Pegunungan, 96 Papua Barat Daya; polygon orientation is adapted at rendering time for D3. No alternate historical borders are fabricated.

Verification covers 38 unique identifiers, a complete baseline join, finite geometry and visual island placement. It is not a legal/administrative boundary survey. The previous Deny Herianto dataset's CC BY 4.0 license and unresolved upstream SOURCE.md caveat remain in [the historical license notice](../public/data/MAP-LICENSE.md); that dataset has been replaced.
