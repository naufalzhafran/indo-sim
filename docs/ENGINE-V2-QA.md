# Model 2 delivery checks

## Functional checks

Verified on 29 September 2026: production build passed; 33 unit tests passed; all 21 browser workflows passed (19 in the full run, followed by the two new workflows after making their English-language fixture explicit). The 240-presidency accounting/sensitivity validation passed. Final screenshots were inspected at 1280 × 720.

The final 4,800-campaign strategy benchmark passed all comparison, accounting, save-validation and performance gates. Engine-only monthly p95 was 1.80 ms; see STRATEGY-BENCHMARK.md for development and held-out results.

The existing map-table direction from DESIGN.md is retained (energy 2, rhythm 3, motion 2). New information uses the existing dossiers, ledger rows and controls. No new visual assets, navigation system or animation was introduced.

- Engine tests cover deterministic replay, separate random streams, save continuation, monthly accounting, rejected legislation, policy delivery delays and competing portfolio work, funding-constrained fuel benefits, level-based transfers, price persistence and income incidence, warning-before-impact timing, disaster preparation/repair, political exploit resistance, party delivery deadlines, normalized regional exposure, observed sector inputs and malformed/legacy saves.
- Browser tests cover a full 60-month presidency, policies, ministers, parliament, projects, campaigning, save/reload/import/export, keyboard map/dossier controls, onboarding, map/worker/storage failures and English/Indonesian presentation.
- New browser workflows import a stressed presidency; authorize relief; resolve a warning into actual damage; switch to monitoring; verify relief can be resumed; inspect delivered policies and coalition deadlines; and run axe A/AA scans at 1280 × 720.
- Preservation workflow creates a model 1 storage entry, starts and saves model 2, exports the original entry byte-equivalently at the JSON value level, reloads model 2, and rejects an old import without replacing the active game.
- Engine browser tests explicitly select English; they do not depend on or change the product's default language.

## Interface gate evidence

- Hard gate: existing keyboard navigation, visible focus, real handlers and error/empty states remain. Axe checks cover new stress views as well as the existing main views. Observed sector data and inferred trade/behavior assumptions are distinguished in the provincial evidence copy. All new metrics derive from engine state.
- Purpose: active emergency response appears before the broader pressure ledger; policy controls show approved, delivered and funded levels; campaign preference is displayed separately from satisfaction; region stress is shown alongside investment decisions.
- Liveliness: the existing atlas remains the focal point outside dossiers, with existing paper hierarchy and vermilion action accents. No unrelated decorative elements were added.
- Craftsmanship: the production build includes the offline worker, updated baseline, local fonts and map. Browser workflows check responsive desktop widths, language switching, no horizontal overflow and console errors. Screenshots `model-2-briefing.png` and `model-2-parliament.png` document the new states.

## Evidence boundaries

Gameplay rates are from `STRATEGY-BENCHMARK.md`, not player telemetry or empirical predictions. The historical check in `VALIDATION.md` remains a trend-model comparison. BPS 2024 sector shares are observed; 34-node link weights and split-Papua allocation are inferred. The IRIO transaction matrix has not been imported. Full province/country behavioral calibration, firm/bank agents and migration remain outside this release.
