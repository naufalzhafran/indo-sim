# Policy and tax update

The Policy & tax panel contains Programs and Taxes tabs. Each of six taxes has Relief, Standard, and Increased choices (Ringan, Standar, Tinggi in Indonesian): personal PPh, PPN, corporate PPh, import duty, excise, and PPnBM. Rates are simplified game assumptions, not statutory rates.

Tax changes and program changes form one quarterly package requiring 291 votes. A failed vote retains both the current programs and current taxes. Tax choices do not consume program slots or launch capacity. Undo, reset, draft recovery, forecasts, completed-quarter exports, and reports use the same tax settings.

## Simulation

The first three taxes feed the existing effective income, business, and consumption rates. Import duty, excise, and luxury tax adjust revenue relative to the Standard baseline, preserving the opening calibration. Import duties support manufacturing while burdening trade and households; excise gradually improves modeled health while reducing disposable income and sales; luxury taxes concentrate household costs in the upper income groups and reduce manufacturing and service demand. Each party has tax-specific preferences.

Version 5 and version 6 saves without individual taxes inherit the equivalent former funding preset. Explicit tax settings must contain all six valid choices. Migrated drafts retain their intended taxes and clear stale funding flags so restoring current tax levels cannot trigger a hidden preset. The existing save version remains compatible.

## Design decisions

This is a compact decision panel for desktop island-game players in the approved cheerful style: Energy 2, Rhythm 1, Motion 1 for this feature.

- Cream surfaces, deep teal text, emerald selections, and the existing coral Advance action preserve the approved visual identity.
- Nunito headings and controls match the game; Source Sans 3 keeps rates and consequences legible.
- Two columns group six comparable decisions without expanding the existing dossier or covering additional map space.
- Three visible radio choices expose every level without dropdown navigation. Keyboard arrows change the level; selected controls retain a distinct emerald state and focus outline.
- Short visible tradeoffs explain consequences before selection. Separate StatHelp buttons explain the tax type.
- The shared forecast sits above the detailed program cost ledger so tax revenue is easy to review. No new animation or scene asset was added.

## Verification

Automated tax coverage is in `src/engine/taxes.test.ts`, `src/engine/taxPersistence.test.ts`, and `tests/taxes.spec.ts`. Browser regressions also cover the existing quarterly and world journeys. Screenshots use `docs/screenshots/taxes-{en,id}-{1280,1366,1440}.png`.

The six full-term tax scenarios reviewed (three levels, each with and without a four-program package) remain finite through twenty quarters, round-trip each completed save, and reconcile fiscal ledgers within 2.84e-13. These are gameplay checks, not economic forecasts or an exhaustive balance study.

Final checks on 2026-10-05:

- `npm run build`: passed TypeScript and production bundling. The existing large-chunk advisory remains.
- `npm test`: 236 tests passed across 22 files.
- Desktop Playwright coverage: 45 passing cases across the quarterly (26), tax (9), and world (10) suites, run with `NODE_OPTIONS='--import tsx'`. Existing mobile cases were excluded per project scope. One construction FPS attempt failed under concurrent load; its isolated rerun passed without changes.
- Six language/viewport combinations passed accessibility checks, containment checks, and visual inspection against the approved island-game reference. The first tax controls are fully visible at 1280×720.

Click-through evidence: Policy & tax opens the shared panel; Programs and Taxes switch with click and keyboard arrows; tax radios change only their own level; program choices and tax choices share undo/reset; the forecast updates after edits; saved drafts recover after reload; approved taxes appear in completed saves and receipts; rejected packages retain current taxes; export/import preserves independent levels. Focus and hover open StatHelp, the pointer can reach its content, and Escape dismisses the hint before the containing panel. Existing custom dropdowns, report dialogs, quarter progression, reduced motion, replay, and WebGL fallback pass their browser regressions.

## Delivery gate

- **Hard gate PASS:** browser tests find no native select, disclosure, or horizontal overflow; Axe checks report no violations in the tested layouts. Tax rates are explicitly identified as game assumptions. All new controls have verified behavior.
- **Purpose gate PASS:** the palette, fonts, two-column tax grouping, visible choices, and restrained shadows reuse the approved system for the reasons recorded above; no decorative assets or additional map rendering were introduced.
- **Liveliness PASS:** Energy 2 / Rhythm 1 / Motion 1 retain the cheerful game character, comparable decision rows, emerald selection, and coral quarter action; the existing island world remains visible around the panel.
- **Craftsmanship PASS:** all six desktop/language screenshots were inspected; keyboard focus, hints, draft changes, current settings, preview loading/error handling, saved-state migration, rejection, undo/reset, and progression are covered by the tests cited above.
