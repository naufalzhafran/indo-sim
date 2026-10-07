# Compact policy consequences verification

Verified on 5 October 2026. Scope: the compact consequence labels in the policy catalog and detail panel, including the subsequent removal of their visible heading. Earlier startup-cost evidence remains in [POLICY-DOWNSIDES-QA.md](POLICY-DOWNSIDES-QA.md).

## Results

- **Content PASS:** all 25 cards show two named consequence/constraint items, giving 50 labels and 50 visible qualifiers in each language. Arrows have hidden visual glyphs and matching accessible “increases/decreases” or “meningkat/menurun” text.
- **Conditional meaning PASS:** MBG shows Public spending ↑ and Food ↓ with “If funding stops”; Indonesian shows Belanja negara ↑ and Pangan ↓ with “Jika dana dihentikan.” Mining output and earnings declines retain “While funded / Selama didanai.” Limits without a modeled decline use a named parameter and qualifier without an invented arrow.
- **Heading removal PASS:** “Downsides & limits” and “Konsekuensi & kendala” are absent from visible text. The list retains its accessible name. Detailed prose remains under “Consequences explained / Penjelasan konsekuensi.”
- **Interactions PASS:** search, empty results/reset, quick Add/Remove, opening details, and returning to the initiating Details button all work in the six language/viewport runs. All 27 regional radio controls remain present; no sliders, native selects or accordions were introduced.
- **Containment PASS:** zero page errors and no horizontal overflow in English and Indonesian at 1280 × 720, 1366 × 768 and 1440 × 900. Policy client and scroll widths both measure 686px in all six runs; document width equals viewport width.

## Visual delivery gate

**Approved direction PASS:** ENERGY 2 / RHYTHM 2 / MOTION 2. Compact labels reuse the existing benefit typography and spacing. The red-brown consequence color conveys a cost or constraint, while coral remains reserved for quarter advancement. Full explanations stay in the dedicated detail view. Reduced motion was enabled for captures.

**Contrast PASS:** red-brown `#9a3829` on cream `#fffaf0` is 6.79:1. Teal body text is 9.04:1 and muted qualifiers are 5.10:1. Conditions remain visible beside the parameter they qualify, including on the smallest supported laptop size.

**Purpose and craftsmanship PASS:** the labels make benefits and consequences equally scannable, with no new decorative elements. Existing search, focus restoration, controls and panel scrolling were exercised. This verification is scoped to policy content; it does not validate independent scene changes.

## Evidence

Six language/viewport records and all rendered labels are saved in [measurements.json](screenshots/policy-consequences/measurements.json). The capture folder contains 16 images.

- [Indonesian catalog, 1280 × 720](screenshots/policy-consequences/catalog-id-1280.png)
- [English catalog, 1366 × 768](screenshots/policy-consequences/catalog-en-1366.png)
- [English detail, 1440 × 900](screenshots/policy-consequences/detail-en-1440.png)
- [Indonesian detailed explanation](screenshots/policy-consequences/explanation-id-1440.png)
- [Mining consequences in English](screenshots/policy-consequences/mining-en-1440.png)

The root verification also passed two focused existing browser scenarios and the production build before the final heading-only removal.
