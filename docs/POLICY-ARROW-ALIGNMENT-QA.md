# Policy arrow and alignment follow-up

Verified on 5 October 2026 after the compact-label revision and final benefit-color adjustment. Scope: policy arrows, colors and alignment only.

- **Arrow completeness PASS:** all 25 policies render 50 consequence labels, each with an arrow, a visible qualifier and matching accessible direction text. All 20 constrained benefits explicitly indicate an increase with the constraint beside it.
- **Kopdes PASS:** Industry output ↑ / Output industri ↑ appears in catalog and details with “Limited by demand & roads / Dibatasi pasar & jalan.” Every pair sharing a line has identical measured label-top coordinates. At 1440px, the English catalog's second consequence wraps cleanly to a separate line.
- **Color PASS:** constrained-benefit labels and arrows both render green `#247c5e`; qualifiers remain muted `#5a7069`. Costs and negative effects retain red-brown. Contrast on cream is 4.90:1 for green and 5.10:1 for qualifiers.
- **Interaction and containment PASS:** search, detail opening and return focus passed in English and Indonesian at 1280 × 720, 1366 × 768 and 1440 × 900. Document width equals viewport width, policy width remains 686 / 686px, and all six runs reported zero page errors. The removed visible consequences heading remains absent.
- **Approved direction PASS:** ENERGY 2 / RHYTHM 2 / MOTION 2; reduced motion used for captures. Existing text and arrow colors communicate benefit versus cost without adding decoration or changing policy controls.

Evidence: [six measurement records](screenshots/policy-arrow-alignment/measurements.json) and 12 final captures, including [Indonesian Kopdes details at 1280px](screenshots/policy-arrow-alignment/kopdes-detail-id-1280.png) and [English catalog at 1440px](screenshots/policy-arrow-alignment/kopdes-catalog-en-1440.png).

## Latest ordering follow-up

**PASS:** all 25 catalog entries now place all green benefits, including constrained gains, before all red costs and declines. All 50 consequence records remain rendered; zero negative-direction items appear in the benefits group. English and Indonesian checks at all three supported sizes report no errors or horizontal overflow. Kopdes, BPN, PSR and mining details follow the same ordering, and PSR/mining each render their declining industry once. The removed visible headings remain absent. This replaces the previous arrangement where constrained gains shared the consequence row.

Evidence: [ordering measurements](screenshots/policy-effect-order/measurements.json), [English catalog](screenshots/policy-effect-order/kopdes-en-1280.png) and [Indonesian catalog](screenshots/policy-effect-order/kopdes-id-1280.png), both at 1280 × 720. No startup, allocation or broader control tests were repeated for this ordering change.
