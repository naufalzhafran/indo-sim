# Regional economy model 7

## Scope and units

The campaign lasts 60 internal months, resolved in 20 quarterly turns. Nine player regions group 38 provinces. Population and jobs are measured in millions, money in trillion rupiah, and annual industry value added in constant opening-price trillion rupiah. Foundation scores run from 0 to 100. Household real income is an index with opening value 100.

The starting GDP distribution is calibrated to the bundled provincial baseline and 17-category industry data. Agriculture's split into staple agriculture, palm oil and fishing is a documented simulation assumption. The twelve private sectors plus Public Services sum to provincial GDP. Public procurement is a fiscal expense, not an additional GDP term; transfers are not taxable labor earnings.

## One economic loop

Each monthly step snapshots the prior economy, collects six taxes against its earnings, profits, final consumption, import, excise and luxury bases, adds separately identified non-tax receipts, and finances commitments. Interest, available cash and a bounded borrowing envelope determine actual delivery. The engine then allocates policy funds, updates foundations and assets, adjusts business capacity/output/employment, and derives the household outcomes and tax bases for the next month. A later economic gain never pays for its own same-month appropriation.

Industry readiness combines weighted foundation requirements and essential bottlenecks, calibrated to preserve opening output. Skill-intensive sectors respond more to acquired workforce skills. Production is value added rather than gross sales. Food production uses agriculture and fishing; palm oil is excluded from staple supply. Provincial food deficits trade through the bundled inter-island network, with imports and infrastructure limiting residual shortages. Growing industry increases electricity demand against existing and maturing supply.

Employment adjusts gradually to industry labor demand and is capped by the available provincial labor force. Annual worker earnings are `min(filled jobs × annual wage, output × labor share)`. The wage is calibrated to opening earnings per employed worker, follows the baseline growth trend, and increases with workforce skills. Labor share is the industry's wage-budget ceiling. Earnings are calculated after the labor-force cap; fewer filled jobs can therefore reduce worker income and the next month's personal income tax. Private profits use the remaining output after actual wages, other costs and tariff costs; public services still earn no profits. Transfers remain outside taxable wages. Existing saves retain their historical earnings and use this calculation from the next simulated month.

## Policy portfolio and allocation

The catalog in `src/engine/economy/catalog.ts` defines names, sources, recurring costs, setup charges, rollout periods, engine channels and visible impact labels. The engine, list and detail views consume these definitions. Main impacts name only foundations or business sectors; BPN has no direct arrow and improves collection through its supporting channel.

At most eight policies can be active, including rollout. A plan may launch or reactivate at most two. There is no aggregate rollout throttle. Tax changes do not consume policy slots.

Every policy defaults to Medium in all nine regions. Its appropriation is divided as:

`regional amount = national policy budget × (regional population × weight) / sum(regional population × weight)`

Weights are Low=1, Medium=2 and High=3. Any number of regions may be High. There is no regional Off. Uniform levels are equivalent, and increasing one share decreases the others. These are the only player allocation controls. Effects follow delivered spending per beneficiary, rollout readiness, local absorption and diminishing returns; a selected level carries no extra bonus.

Setup charges and recurring costs are shown separately. Stopping ends new appropriations without refunding past costs. Regional preferences persist between turns and do not restart rollout. Reopening delivery requires ramp-up; paid local work and acquired skills persist. Automatic construction is tied to the funding policy and original location.

Regional projects also grant a fixed reward once they reach 100% construction. `src/engine/economy/projectRewards.ts` defines both the displayed reward and its simulation effect. Rewards apply to every province in the project's region, rather than only its map-marker province. Dana Desa grants two infrastructure points; all point rewards respect the 100-point cap. Percentage rewards raise usable electricity or industry capacity; output and employment still respond through the normal economic loop. Rewards are applied after construction updates, so one reward cannot accelerate another project's construction in the same month.

`completionRewardGranted` records the award in each project and survives save/load, stopping and restarting funding. Existing version-7 saves without the flag remain valid; any completed project with an ungranted reward receives it when the next quarter is simulated. The project card identifies this pending reward. Ongoing policy costs and gradual benefits continue independently of the one-time completion reward.

## Education and durable progress

The displayed Education foundation combines school access, teaching quality and current workforce skills. BOS primarily improves access, PPG teaching quality, Prakerja current-worker skills, and university support later graduates. School-to-workforce progression has an explicit delay and maturation period. Industry gains use acquired skills, preventing better school access from immediately becoming a new qualified workforce.

Paid infrastructure and electricity pipelines persist, as do earned skills and productive assets. Service provision depends on continuing funding. Overlapping channels have diminishing returns, and improvements near a relieved bottleneck yield smaller benefits.

## Resolution, reports and saves

Forecasts use the same quarterly kernel without new random shocks. Actual resolution uses a deterministic random stream and records before/after outcomes, three-month fiscal totals, regional tax/spending totals, events and decision attribution. Attribution compares the chosen plan against continuing the prior settings under the same event sequence. Historical metrics retain their price index; debt/GDP compares nominal debt with GDP at the corresponding current prices. The regional disparity measure is the population-weighted coefficient of variation of GDP per person across the nine regions.

The food-trade layer and simulation share one distribution function. Map arrows show the twelve largest estimated routes under current conditions; the completed-month delivery fields retain the flows calculated from that month's prior snapshot.

The twentieth quarter ends the campaign. The development report compares opening and ending income, employment, poverty, foundations, disparities and debt. Reports label actual changes separately from policy contribution arrows.

Version-7 schemas reject old formats, unknown fields, invalid policy portfolios, missing regions/sectors/provinces and inconsistent financial totals. Completed saves and draft removal use one transaction; a recovered draft must match the completed game identity. There are no migrations or legacy export interfaces.

## Calibration limits

The balance script compares 4-, 6- and 8-policy portfolios, complementary/overlapping programs, multiple tax levels and regional weights across seeded calm and shock campaigns. Opening affordability of 4–5 mixed-cost policies and later expansion toward 6–8 are tuning targets, not unlock rules. The test matrix provides representative evidence, not proof that every possible strategy is equally strong. This is a strategy game, not an empirical policy forecast.
