# Model 5 verification

## Implemented behavior

Twenty quarterly turns each run three seeded monthly steps atomically, with one election at month 60. Fifteen initiatives share four slots and a two-launch quarterly limit. Start/End, cabinet appointments, regional priorities, request answers and campaign choices belong to one autosaved plan with undo/reset. Ordinary advancement needs no report dialog.

Flagship upkeep and setup are charged once, separately from inherited spending; restarting incurs setup again. The old policy fields are benefit proxies, not a second spending instruction. Automatic construction draws only from inherited funded infrastructure appropriations. Overlap saturates with stable ordering, while costs remain additive. Cabinet competence, funding and shared ministry workload govern rollout. Stopping funding fades operating benefits while provincial assets and skills remain.

One tax stance replaces individual tax sliders. Portfolio/funding changes are voted on together at 291 seats; rejection preserves the existing portfolio. Quarterly political requests have complete-quarter windows and cannot outlast the term. Accepting a request inserts its required action into the plan. Final-year campaigning splits twenty credits over three monthly visits, totaling eighty credits.

Per the user's follow-up, the fictional game omits source links, the source filter and historical research sections. Details show purpose, tradeoff, cost, delivery window and an alternative-plan forecast using the same resolver. Internal provenance metadata has no gameplay effect.

## Automated evidence

- `npm test`: 145 tests including 18 quarterly tests and the retained engine suite. Coverage includes slot/launch caps, cancellation/restart, rejected votes, overlap, underfunding, relief, bounded projects, request windows, attribution, deterministic save continuation, corrupt saves, accounting and campaign installments.
- `npm run test:e2e`: fourteen quarterly browser tests covering catalog/filter/edit/reload, a complete twenty-turn presidency, keyboard dropdowns, import/export, storage failure, worker failure/retry, regional priorities, cabinet choices, request acceptance and reports.
- Accessibility checks cover four destinations in both languages at 1280×720, 1366×768 and 1440×900, plus detail/report dialogs. Read-only report scrolling was made keyboard-focusable after a test exposed the issue.
- `npm run balance:quarter`: all **1,941** zero-to-four portfolios checked for finite outcomes, stable ordering, continuation without setup costs and spending conservation. Pairwise service/cost-vector comparisons found no structural dominance.
- **960 full presidencies**: twenty selections (empty, fifteen singletons, four mixed), three tax stances, four scenarios, four seeds. Development: 2025/7919. Holdout: 104729/130363. Coefficients were frozen before holdout. All fifteen initiatives improve at least one matched holdout metric; no representative portfolio wins every objective. See `quarter-balance.json` and `quarter-balance-summary.json`.
- `npm run build`: TypeScript and production Vite build. A non-blocking bundle-size advisory remains because the provincial kernel supports both UI projections and the worker.

The structural check compares service vectors and costs. The full-term sample is finite, not proof of equilibrium. Commodity/food-price scenarios impose recurring macro regimes; disaster stress adds a fixed warning-stage flood every four quarters alongside seeded events. No arbitrary single utility score declares an overall winner.

## Save behavior

Outer schema/model version 5 wraps the retained provincial kernel. IndexedDB stores completed quarters atomically and clears their old draft. A separate canonical-state-bound record restores the unfinished local plan. Portable exports contain completed quarters. Versions 1–4 remain untouched and exportable, without migration. Import validates complete-quarter boundaries, identities and receipt accounting. Reload after the election cannot trigger another election.

## Design delivery gate

- **Hard gate PASS:** no native selects/disclosures in `src`; browser checks exercise navigation, keyboard controls, laptop bounds, errors and WCAG A/AA. No promotional statistics or fabricated testimonials were added.
- **Purpose gate PASS:** colors, typography, layout, spacing, detail navigation and the fixed Advance footer have written reasons in `DESIGN.md`; no decorative asset system was added.
- **Liveliness PASS:** retained 2/3/2 dials use olive presidential framing, parchment reading surfaces and one vermilion quarterly action. Screenshots are under `docs/screenshots/quarter-*`.
- **Craftsmanship PASS:** build, engine checks, seeded portfolio evaluation and bilingual browser flows exercise the implemented controls and recovery paths. Game copy follows the user's source-free direction.

Historical monthly browser journeys remain as reference; Playwright explicitly selects the replacement quarterly suite. They are not reported as passing against the new interface.
