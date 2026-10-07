# English and Indonesian

The setup header and persistent game header expose a native Language / Bahasa select. Indonesian is the default when no valid preference is saved. An existing English or Indonesian preference is respected. The selection is saved under `indonesia-presidency-language` in localStorage, independently of the IndexedDB game save. If preference storage is blocked, the game starts in Indonesian and switching still works for the current session.

`src/i18n.tsx` owns the language subscription, document language and title, and presentation translation. App subscribes once so switching rerenders the existing component tree without remounting the game. `localize()` translates text and accessible presentation attributes on returned React elements. It preserves keys, IDs, form values, references, callbacks, and game-state props. Every screen component localizes its own output, including content produced inside mapped elements. New components should follow this convention.

`src/locales/id.ts` maps English source copy to Indonesian. Full messages take precedence over templates. Numbered placeholders support existing generated simulation messages; exact text fragments cover copy around embedded React values. Joined policy summaries translate their individual labels. Unknown messages remain readable in their original form. Add a catalog entry when changing source copy; do not translate action names, portfolio keys, province IDs, or stored simulation records. Province and minister names remain unchanged.

Numbers and dates use Intl with the current locale. English simulation event records are translated when displayed, with Indonesian decimal separators. Existing saves can therefore be viewed in either language, and changing language does not alter deterministic simulation outcomes or require save migration.

## Indonesian terminology

Indonesian copy uses familiar government terms in context: **APBN** for the national budget, **DPR** for Parliament, **PPh orang pribadi** and **PPh badan** for income taxes, **PPN (simulasi)** for the simplified consumption tax, **bansos**, and **subsidi BBM**. National output is **PDB**; provincial output is **PDRB**, with real provincial levels labeled **harga konstan 2024**. Budget screens use pendapatan negara, belanja negara, surplus/defisit, pembiayaan utang, and pembayaran pokok utang. Electoral preference is elektabilitas, separate from public approval.

These names describe the existing mechanics. APBN flows are reported monthly; regional allocations are not relabeled APBD or a specific statutory transfer scheme. Tax descriptions identify effective simulated rates rather than claiming statutory tax brackets or a complete VAT system. Generic auditing remains pengawasan rather than implying a particular institution. DPR procedures remain explicitly simplified. English copy, stored records, and simulation rules are unchanged.

Terminology references: [Kementerian Keuangan’s APBN presentation](https://www.kemenkeu.go.id/apbn2018), [BPS provincial PDRB publication](https://www.bps.go.id/id/publication/2024/04/04/8692a86c992de40e9d6b363b/produk-domestik-regional-bruto-provinsi-provinsi-di-indonesia-menurut-lapangan-usaha-2019-2023.html), and [DJP’s PPh terminology](https://www.pajak.go.id/id/objek-pph).

## Verification

Follow-up coverage includes dynamic regional and DPR messages: vote estimates, agreement reviews, queuing confirmations, conflict warnings, and accessible province selectors. The source-copy check now also examines sentence literals and generated templates inside expressions. Verified with 39 unit tests, five localization browser tests, and the production build.

The terminology revision passes the production build, all 33 unit tests, and all four localization browser tests. APBN and policy screens were visually inspected; the seven Indonesian main views pass accessibility and overflow checks at the tested desktop widths.

- Unit coverage checks static UI copy and accessible labels, policies, sectors, portfolios, programs, parties, research, and walkthrough instructions.
- A 60-month simulation comparison verifies identical state and outcomes in both languages and translated generated briefings.
- Browser coverage checks setup selections, live switching, draft and queued-decision preservation, translated turn reports, reload persistence, existing saves, end-of-term results, keyboard map controls, and unavailable preference storage.
- Indonesian main screens are checked at 1280 and 1440 pixels, with WCAG A/AA checks at 1280. The current design explicitly supports desktop windows from 1280 × 720; this work retains that scope.

## Design checks for this change

The final map-table direction in DESIGN.md uses Energy 2 / Rhythm 3 / Motion 2. Localization retains that direction. The compact native selector uses existing typography and colors, keeps the atlas as the focal point, and requires no new animation, icon, artwork, or navigation section.

- Functional completeness PASS: both language options work in setup and play; selection persists when storage is available and remains usable when storage is blocked.
- State preservation PASS: browser tests retain cabinet choices, draft values, and queued decisions across switches; unit tests compare identical simulation states over 60 turns.
- Readability and accessibility PASS: Indonesian main screens pass automated WCAG A/AA checks, keyboard selection works, and the document language updates.
- Desktop layout PASS: no horizontal document overflow at the supported tested widths; the rendered Indonesian map was visually inspected.
- Content and identity PASS: existing scenario, evidence caveats, fictional-character labels, typography, map, and controls are retained; translations add no claims or invented game data.

### Delivery gate: localization scope

- R-02 PASS: the Indonesian catalog contains no em dashes.
- R-03 PASS: Indonesian screens have no document overflow at 1280 and 1440 pixels; desktop scope is explicit in DESIGN.md.
- R-17 PASS: indicator values still come from the same simulation state and observed baseline.
- R-18 PASS: no testimonials or people assets were added.
- R-23 PASS: the only new UI control is the requested language selector; no artwork, seal, or navigation structure was added.
- R-24 PASS: existing navigation identifiers and destinations are preserved.
- R-25 PASS: automated WCAG A/AA checks pass on all seven Indonesian main views.
- R-26 PASS: both language options were exercised in setup and gameplay.
- R-27 PASS: existing loading, empty, and error states are translated; blocked preference storage is tested.
- R-28 PASS: no FAQ was added.
- R-32 PASS: native select semantics and visible focus styles remain; browser tests exercise keyboard province selection and Escape.
- R-33 PASS: implementation is source code, with no runtime source or CSS injection.
- R-34 PASS: the existing fixed map-table theme is retained; there is no theme toggle.
- R-35 PASS: production build, 22 unit tests, and 17 browser tests pass, including the existing full-presidency flow.
- R-36 PASS: translations preserve research limitations and add no performance, security, or compliance claims.
- R-37 PASS: the existing DESIGN.md supplies the final visual direction and dials.
- R-38 PASS: fictional ministers, parties, and election outcomes retain their explicit fictional labels.
- R-01 PASS: no new gradients or glows; existing map-table surfaces retain their documented purpose.
- R-04 PASS: no new icons; the language control uses words in each language.
- R-06 PASS: the selector uses existing Source Sans 3 for readable operational controls.
- R-07 PASS: no new backgrounds or patterns; the atlas retains its cartographic setting.
- R-08 PASS: no decorative arrows added to the selector.
- R-09 PASS: no badges added.
- R-10 PASS: no glassmorphism added.
- R-12 PASS: no new shadows or elevation layers added.
- R-13 PASS: no glow added.
- R-14 PASS: no cards or repeated layout sections added.
- R-19 PASS: switching language needs no new animation; reduced-motion behavior is preserved.
- R-22 PASS: no illustrations added.
- Dials PASS: Energy 2 / Rhythm 3 / Motion 2 follow the final map-table design without adding motion for localization.
- Focal point PASS: the atlas remains dominant in the inspected Indonesian screenshot.
- Whitespace PASS: the compact selector fits within existing headers without adding a new section.
- Accent PASS: the existing vermilion turn action remains the primary accent.
- Identity PASS: geographic labels, paper dossiers, and institutional typography retain the game's identity.
- Design read PASS: localization follows the existing design, including its concurrent desktop map-table revision.
- C-1 PASS: native language selection supports legibility, keyboard operation, and device persistence.
- C-2 PASS: both options have tested behavior and preserve active game choices.
- C-3 PASS: no additional content sections were introduced.
- C-4 PASS: tested desktop widths, keyboard interaction, reload, and blocked preference storage work.
- C-5 PASS: game and research data remain unchanged.
- R-05 PASS: localization retains the game's existing map, dossiers, and command dock.
- R-11 PASS: the selector uses the existing input border-radius rules.
- R-15 PASS: Indonesian actions name the actual governing action, such as Ajukan paket kebijakan and Lanjutkan bulan.
- R-16 PASS: no marketing copy or buzzwords were introduced.
- R-20 PASS: the Indonesia map and province-specific game structure are preserved.
- R-21 PASS: the fixed map-table palette follows the explicit DESIGN.md direction.
- R-29 PASS: no palette colors were added by localization.
- R-30 PASS: no product reference or cloned layout was introduced.
- R-31 PASS: placement keeps language available during setup and play; native form semantics aid accessibility; inherited typography and spacing preserve the game identity.
