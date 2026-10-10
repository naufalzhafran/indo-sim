# Gameplay balance review

## Update, 10 October 2026: beginner and education pass

These means come from `npm run balance:quarter` (seeds 19, 73 and 997, calm and with shocks) after this pass. The script now skips new launches while a rejected APBN freezes them. Before that fix it stopped with an error, because the DPR can reject the budget.

| Portfolio | Goals met | Real income | Poverty | Unemployment | Energy | Debt / GDP | Shortfall quarters |
|---|---:|---:|---:|---:|---:|---:|---:|
| baseline | 1.0/6 | 113.5 | 7.78% | 7.33% | 83.7 | 33.4% | 0.0 |
| education-four | 1.0/6 | 116.4 | 7.26% | 7.05% | 82.3 | 35.1% | 0.0 |
| health-four | 2.8/6 | 117.6 | 6.04% | 5.47% | 81.7 | 37.2% | 0.0 |
| food-four | 1.8/6 | 115.8 | 7.13% | 6.09% | 82.5 | 34.8% | 0.0 |
| industry-six | 4.0/6 | 119.8 | 6.19% | 4.58% | 82.5 | 31.6% | 0.0 |
| mixed-four | 3.2/6 | 117.6 | 6.10% | 5.66% | 84.1 | 36.9% | 0.0 |
| mixed-six | 5.0/6 | 119.0 | 5.68% | 4.86% | 83.1 | 36.4% | 0.0 |
| mixed-eight | 5.0/6 | 119.6 | 5.43% | 4.23% | 82.5 | 34.5% | 0.0 |
| skills-and-services-eight | 4.8/6 | 119.8 | 5.47% | 4.43% | 82.4 | 32.5% | 0.0 |
| lower-cost-eight | 3.8/6 | 118.4 | 6.52% | 5.38% | 80.7 | 30.9% | 0.0 |
| higher-cost-eight | 4.0/6 | 121.5 | 4.33% | 3.63% | 81.8 | 39.6% | 10.2 |
| regional-sectors-six | 3.8/6 | 118.3 | 6.51% | 5.04% | 81.1 | 34.4% | 0.0 |
| mixed-six-tax-relief | 4.0/6 | 122.0 | 5.33% | 4.66% | 82.6 | 41.1% | 19.0 |
| mixed-six-tax-increased | 5.0/6 | 119.0 | 5.68% | 4.86% | 83.1 | 36.4% | 0.0 |
| mixed-six-eastern | 5.0/6 | 119.0 | 5.65% | 4.88% | 83.2 | 36.5% | 0.0 |

What changed and why:

- **Targeted cash transfers cut poverty.** Poverty used to follow only average real income and unemployment, so PKH, the main poverty programme, barely moved it (about 0.1 points over five years on its own). Transfers now lower poverty in proportion to their size relative to household income (`TARGETED_TRANSFER_POVERTY` in `engine.ts`), because they reach the poorest households. PKH alone now cuts poverty by about 1 point more than doing nothing. Goal counts did not change, but poverty falls further in every portfolio that pays transfers.
- **Raising every tax at once is no longer a free win.** With the DPR, "mixed six, tax increased" ends exactly like "mixed six": all six bills together fail in parliament, so the rates never change. Single, softened rises can still pass when approval is high. Tax relief still passes and still causes funding shortfalls.
- **Bonus objectives were always won.** "No region left behind" now needs the national income (+18%) and poverty (−1.5 points) targets in all nine regions. "Re-election 2029" now needs 60% approval instead of 50%. In 64 beginner-style runs, doing nothing ended at 55–56% approval and good portfolios at 63–69%.
- **The setup's starter list met only about 2 goals.** It is now PLTS, Jalan Desa, CKG, BOS, PKH and KUR (`starterPolicies`), which together meet 5 of 6 goals. The one they miss is energy: a growing economy needs a second power build, which the "Energy is falling" prompt points to.

The notes below describe the 5 October review and are kept for history; their numbers are out of date.

## Review, 5 October 2026

The energy decline came from a mismatch between electricity demand and the rate of new supply. The low difficulty came from generous automatic growth, a static workforce, weak service pressure, permissive financing, brief local crises, and the absence of campaign success conditions. This update changes those mechanics and explains the resulting decisions in the existing report UI.

These are gameplay assumptions, not estimates or forecasts of Indonesia's economy. The original province geography and opening data remain intact.

## Why energy could keep falling

Energy is half household electrification and half electricity reliability. It is not a stock of fuel that the player consumes. Reliability responds to the usable supply-to-demand ratio of the connected grid, or the province's own ratio for isolated grids.

Previously, ordinary capacity grew at a fixed 4.5% annual trend. Demand tracked actual GDP. Policies that successfully raised output could therefore increase demand faster than ordinary supply. The electricity policy added only 0.25% of opening GDP-equivalent capacity to the construction pipeline per month at full delivery. That pipeline released one twelfth of its remaining balance per month, on top of a separate rollout delay. A growth-heavy portfolio could keep eroding its reserve while its power program was ramping up.

Electrification is already near its ceiling in many provinces, so a small access gain could not compensate for falling reliability. National averaging also concealed which grids were losing headroom. The energy tooltip previously gave no specific explanation, and the game did not expose usable reserves or pending capacity.

The revised policy adds 0.75% of opening output-equivalent capacity per fully delivered month, retaining the gradual pipeline and rollout. Ordinary capacity follows the revised 2.5% economic trend, with monthly wear of 0.07%. Demand includes household growth as well as output and access expansion. Sustained funded investment now catches up; it still takes several quarters, and isolated grids still require local investment. Paid construction continues maturing after cancellation, and completed supply persists.

The report now shows reserve and pending supply for each actual connected grid and isolated province, ordered by reserve. These are normalized game estimates, not megawatts. The map offers a direct electricity-policy shortcut when energy falls by more than 0.1 points in a quarter. English and Indonesian energy hints explain the mechanism.

## Why the old campaign felt easy

| Issue | Previous behavior | Revised behavior and decision |
| --- | --- | --- |
| Passive economic growth | 4.5% annual underlying trend; idle income rose about 25% over the term | 2.5% underlying trend; investment and foundations must deliver the additional gains |
| Workforce and household demand | Fixed population and workforce throughout five years | Population, workforce and food need grow 0.9% annually; businesses must create jobs for incoming workers |
| Living standards | Income did not account for additional people | Real income measures purchasing power per person, including consumer taxes and food affordability |
| Service capacity | Infrastructure and water did not wear down under full funding | Modest monthly wear and population pressure on school and health access make maintenance and service policies useful |
| Inherited spending | Real inherited costs grew 1.2% annually | 3.5% annual real inherited-cost growth makes fiscal room harder to create |
| Borrowing | Standard annualized borrowing allowance about 2.8% of nominal GDP | About 2.2% at a 40% debt ratio, tightening with debt; cash and actual revenue still count |
| Debt costs | Risk premium started above 50% debt/GDP | Premium starts above 40%, making unsustainable debt more costly |
| Disruptions | 7.5% monthly occurrence probability, 0.35 damage, fast generic recovery | 13% probability, 0.55 starting damage, slower recovery that relevant funded services can accelerate |
| Success | Reaching quarter 20 produced a report without a mandate | Six explicit simultaneous goals distinguish a completed mandate from unfinished work |

All 25 existing policies remain available. There are still eight active slots and two launches per quarter. Rather than adding overlapping policies, the changes give the current options more consequential interactions:

- Irrigation and food storage accelerate harvest recovery.
- Transport and water accelerate flood recovery.
- Health access and nutrition accelerate outbreak recovery.
- Skills and credit support investment and hiring; their costs compete with service delivery.
- Raising taxes improves financing while reducing household purchasing power or private investment through the existing tax channels.
- Regional Low / Medium / High choices still redistribute a fixed national budget. They do not create free money or allow power transfers between isolated grids.

Random draws remain seeded and independent of policy choices and province processing order. Calm previews suppress new random shocks while continuing to account for existing crises, population pressure, funding constraints, and delivery delays. Choices do not reroll the world.

## Five-year mandate

The campaign succeeds when all six conditions hold at month 60:

1. Real income per person rises at least 18% from the campaign opening.
2. Poverty falls at least 1.5 percentage points.
3. Unemployment is at most 5.5%.
4. At least three national foundations gain 2 points, and no foundation loses more than 3.
5. Energy stays within 1 point of the opening level.
6. Debt is at most 40% of nominal GDP and at least 98% of the final quarter's requested spending is funded.

These are game challenges, explicitly identified as such in the report. They are visible before the first turn, then in subsequent reports. Ordinary reports keep actual quarter outcomes first, with mandate and grid details below. The final report leads with the mandate. Meeting a goal early does not lock it in: progress can reverse. The final report labels missed goals and an unfinished mandate; it does not discard the campaign or its results.

Difficulty note (2026-10-06): the original thresholds (+15% income, 2-point poverty cut, unemployment at most 4%, +3 foundation points, energy at least at opening) were relaxed after repeated headless playthroughs. Random 4-policy portfolios met only 1 of 6 goals and random 6-policy portfolios met 1 as the typical result. After the change, random 4-6 policy portfolios typically meet 2-4 goals, random 8-policy portfolios meet 4 or more in about 60% of runs, and doing nothing still fails (1/6). Financing rules are unchanged.

## Campaign comparisons

`npm run balance:quarter` runs 15 portfolios with seeds 19, 73 and 997, both calm and with seeded disruptions: 90 complete five-year campaigns. Every portfolio respects the two-launch limit and eight-policy cap. It verifies bounded foundations, accounting identities, industry and job totals, and final save round trips. The detailed output is in `docs/economy-balance.json`.

The table gives means across the six runs of each strategy. Previous values come from the pre-update benchmark. Income was indexed to 100 at opening in both versions, but the revised value also accounts for population growth.

| Portfolio | Previous final income | Revised final income | Revised unemployment | Revised energy | Minimum funding | Goals met |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| No policies | 124.90 | 105.43 | 11.17% | 83.64 | 100.0% | 1/6 |
| Mixed eight | 135.74 | 115.70 | 3.55% | 92.25 | 92.5% | 6/6 |
| Skills and services eight | Not previously sampled | 116.76 | 3.05% | 91.82 | 95.8% | 6/6 |
| Expensive eight | 140.32 | 118.29 | 2.56% | 88.32 | 82.5% | 5/6 |

Mixed eight uses electricity, BOS, JKN, fertilizer, KUR, water, BPN and sea transport. Skills and services uses electricity, teachers, JKN, irrigation, KUR, sea transport, Prakerja and BPN. Both meet the mandate under all sampled seeds and scenarios, giving at least two viable routes. The expensive portfolio uses MBG, JKN, transit, clinics, BOS, electricity, sea transport and broadband. It produces stronger income and health results but still funds only about 91.7% of its final calm quarter, missing sustainable delivery.

There is no universally best portfolio across the sampled income, poverty, unemployment, foundation and debt objectives. That is finite comparative evidence, not a proof of balance across every allocation or every possible strategy. Difficulty now has an attainable mandate and real tradeoffs; whether the pacing is enjoyable needs player feedback.

## Compatibility and verification

The version-7 save schema remains unchanged. Goals and grid diagnostics are derived from existing state. Valid version-7 games still import; the revised mechanics apply to future quarters without rewriting completed history. A fresh campaign is the appropriate way to experience the complete revised curve.

- Unit validation: 108 tests passed, including idle-campaign failure, three seeded successful mandates, delayed power recovery, paid-capacity persistence, fiscal shortfalls, and policy-specific disaster recovery.
- Production TypeScript/Vite build passed. Vite retains its existing large-chunk warning for the 3D scene.
- Full browser suite: 29 tests passed; the added energy-warning shortcut was separately exercised successfully.
- New report and energy-hint checks passed in English and Indonesian at 1280×720, 1366×768 and 1440×900, including viewport containment, accessible tables, Axe WCAG A/AA checks, hoverable hints, Escape dismissal, restored focus, and no page exceptions.
- Existing browser checks cover import/export, autosave failure and retry, worker failure, quarter progression, final reports, reduced motion, camera controls, regional selection, custom dropdowns, and WebGL fallback.
- A recap assertion was corrected to allow no “best” region when every region has a genuine setback. It still checks that any “best” region is improving and that the real-quarter scenario has an attention marker.

## Design and antislop delivery gate

The design read is the established cheerful desktop island strategy game, ENERGY 2 / RHYTHM 2 / MOTION 2. No scene or world geometry changed. New report tables reuse cream surfaces, teal text, Nunito headings, Source Sans 3 numerals, existing spacing and modal scrolling. The map shortcut reuses the small butter-yellow issue control. Coral remains reserved for the existing advance action. No new imagery, animation, palette, navigation system, native select, or disclosure was added.

- Hard Gate PASS: new text is sourced from actual simulation rules and explicitly labeled game challenges; no fabricated external statistics, testimonials, assets, marketing claims or dead controls. Build, browser execution, desktop containment, contrast checks and focus dismissal are verified. Phone support is outside the user's explicit scope.
- Purpose Gate PASS: tables compare measured game outcomes and grid ratios; existing modal elevation identifies a dedicated report. Existing typefaces, colors and controls preserve the approved identity. No new decorative gradients, icons, glows or ornamental panels.
- Liveliness PASS: the archipelago remains the map focal point, the advance button retains the consequential accent, and existing section spacing and restrained motion remain unchanged. The approved dials and design reasons are stated above.
- Craftsmanship and Quality Locks PASS: additions serve specific gameplay questions, match established components and localization, and retain the existing loading/error/retry paths. No placeholders presented as facts, template sections, competing themes, generic CTAs, or empty interactions.
- Changed-control click-through PASS: Campaign goals opens the report; Escape closes it and returns focus. The Energy question-mark hint opens on focus and remains readable on hover; Escape dismisses it. The falling-energy prompt opens RUPTL PLN with its allocation controls and enabled launch action. Existing advance, report, policy, tax, regional, save and camera controls were exercised by the full browser suite.

## Realistic direction, arcade numbers (9 October 2026)

An audit found that the game taught some false lessons: with no policies, unemployment doubled to 11%, coal was the cheapest and fastest power with almost no downside, and some programmes cost far more than their real budgets. The rule for this revision is that numbers can stay arcade (round costs, short build times, a winnable five years), but cause and effect must point the same way as in Indonesia.

| Change | Before | After |
| --- | --- | --- |
| Background growth | 2.5% output trend; output per worker grew at the same rate, so trend growth created no jobs | 4% output trend; output per worker grows 3.3%, and output above trend hires with elasticity 0.5 |
| Inherited spending | Grew 3.5% a year in real terms | Grows 6% a year (wages, regional transfers, subsidies) |
| Deficit rule | Borrowing envelope about 2.2% of GDP, no legal limit shown | Envelope about 3.2% of GDP at 40% debt; the deficit above the legal 3% adds its excess to the borrowing rate on the whole debt; forecast shows "Deficit / legal limit" |
| Coal (PLTU) | Cheapest capacity, only a local health cost | Each region with a completed plant adds 0.03 points to the borrowing rate (climate lenders) |
| Clean power | PLTS 3%, PLTP 6%, PLTA 8% capacity | PLTS cheaper (Rp 27T build), PLTP 8%, PLTA 10% |
| Programme costs | PKH 18, Prakerja 9, Tol Laut 18 per quarter | PKH 9, Prakerja 4.5, Tol Laut 4.5 (build about Rp 15T), matching their real relative size |
| Mandate | +10% income, −1 poverty point, unemployment ≤ 6% | +18% income, −1.5 poverty points, unemployment ≤ 5.5% |

Build policies were already one-time, so coal can only be built once per campaign; no extra limit was needed.

Means across seeds 19, 73 and 997, calm and shocks (`npm run balance:quarter`):

| Portfolio | Real GDP growth / yr | Unemployment | Energy change | Goals met |
| --- | ---: | ---: | ---: | ---: |
| No policies | 3.5% | 7.3% | −1.6 | 1.0 / 6 |
| Education four | 4.1% | 7.0% | −3.0 | 1.0 / 6 |
| Mixed six | 4.6% | 4.9% | −2.1 | 5.0 / 6 |
| Mixed eight | 5.0% | 4.2% | −2.8 | 5.0 / 6 |
| Higher-cost eight | 5.5% | 3.1% | −4.1 | 4.0 / 6 |
| Mixed eight with geothermal (test portfolio) | 5.2% | 3.8% | +1.0 | 6.0 / 6 |
| Coal + solar, Geothermal + solar, Hydro + solar (four policies) | 4.1–4.2% | 6.0–6.3% | +3.3 to +4.6 | 2.8–3.0 / 6 |

Energy is still the goal that separates a full mandate from strong progress, but it can now be met without coal, and clean routes score slightly better than the coal route. Fiscal pressure is lighter than before for most portfolios; the expensive portfolio still crosses the 3% line and runs funding shortfalls while it builds. Whether this pacing feels right needs player feedback.

## Quarter medals (2026-10-10)

The quarter report awards five medals: beat trend growth (about 1% a quarter, the 4% background trend), hold jobs (unemployment does not rise), cut poverty, strengthen foundations (net gain) and fully fund delivery. 0–1 medals is a tough quarter, 2–3 mixed, 4 good and 5 outstanding. The old four medals counted any growth above 0%, so a quarter with no policies was called "A good quarter".

Average medals per quarter, seeds 19, 73 and 997 over 20 quarters:

| Portfolio | Calm | Shocks |
| --- | ---: | ---: |
| No policies | 2.0 (mixed) | 2.2 |
| Education four | 3.3 | 3.3 |
| Mixed eight | 4.7 (good to outstanding) | 4.7 |
