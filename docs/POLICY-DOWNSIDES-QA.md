# Policy downsides and cost clarity verification

Verified on 5 October 2026 against the running game at port 5174. This check covers the policy catalog and detail changes, with no changes to simulation behavior.

## Design and scope

The approved cheerful Indonesian island game remains the reference: cream panels, teal text, emerald choices, coral quarter action, Nunito headings and Source Sans 3 body text. ENERGY 2 / RHYTHM 2 / MOTION 2. Reduced motion was enabled for browser captures. The red-brown label uses the existing declining-effect color to identify consequences and costs while leaving coral reserved for Advance quarter. Downside explanations remain visible content instead of tooltips or accordions.

## Viewport and interaction results

All six runs passed. Each run found exactly 25 policy cards, 25 non-empty downside explanations and 25 startup-cost labels. Every detail retained 27 radios across nine regions. No page errors occurred.

| Language | Viewport | Document width | Policy client / scroll width | Result |
|---|---:|---:|---:|---|
| English | 1280 × 720 | 1280 | 686 / 686 | PASS |
| English | 1366 × 768 | 1366 | 686 / 686 | PASS |
| English | 1440 × 900 | 1440 | 686 / 686 | PASS |
| Indonesian | 1280 × 720 | 1280 | 686 / 686 | PASS |
| Indonesian | 1366 × 768 | 1366 | 686 / 686 | PASS |
| Indonesian | 1440 × 900 | 1440 | 686 / 686 | PASS |

The browser checks exercised catalog search, empty results and reset, quick Add/Remove, inactive detail viewing, starting a policy, regional spending selection, and detail-to-catalog focus restoration. Selecting High changed the regional amount while preserving the national total; ArrowLeft returned the same radio group to Medium. Category dropdowns stayed within the viewport and dismissed with Escape. No native selects, sliders, accordions, `details`, or `summary` elements were present.

Panels scroll vertically at laptop heights. The downside label and explanation remain together; the policy action footer stays reachable. The final 1280px and 1366px screenshots show contained sidebar finances with no overlapping amounts.

## Startup-cost proof

The MBG detail was checked in both languages before launch and after importing an engine-resolved quarter with its startup balance fully paid:

| State | Recurring cost | Remaining startup | Next-quarter total |
|---|---:|---:|---:|
| New policy in plan | Rp 36.0T | Rp 36.0T | Rp 72.0T |
| Continuing after payment | Rp 36.2T | Rp 0.0T | Rp 36.2T |

The small recurring-cost increase in the continuing fixture comes from the model's price index. Its runtime `startupRemaining` is zero. The catalog says **Startup paid / Biaya awal lunas** and the detail total equals recurring cost, verifying that the initial payment is not shown as another recurring bill.

Mining rehabilitation shows Health ↑ and Oil & Mining ↓ with delayed timing and its funded compliance tradeoff. Palm replanting shows Palm Oil ↓ initially and ↑ later, with the initial output/tax-base cost explained. Both were inspected in English and Indonesian.

## Screenshots and evidence

The [policy-downsides capture folder](screenshots/policy-downsides) contains 28 screenshots plus [viewport measurements](screenshots/policy-downsides/measurements.json) and [startup measurements](screenshots/policy-downsides/startup-measurements.json).

- [English downside list, 1280 × 720](screenshots/policy-downsides/downsides-en-1280.png)
- [Indonesian policy detail, 1366 × 768](screenshots/policy-downsides/detail-id-1366.png)
- [Indonesian catalog, 1440 × 900](screenshots/policy-downsides/catalog-id-1440.png)
- [MBG startup and recurring breakdown](screenshots/policy-downsides/mbg-budget-en-1440.png)
- [MBG continuing after startup payment](screenshots/policy-downsides/mbg-paid-budget-id-1440.png)
- [Mining rehabilitation downside](screenshots/policy-downsides/mining-rehabilitation-en-1440.png)
- [Palm replanting initial loss and later benefit](screenshots/policy-downsides/palm-replanting-id-1440.png)

## Delivery gate

- **Containment PASS:** all six document and panel measurements match their available widths; visual inspection shows contained text and controls at supported desktop and laptop sizes.
- **Contrast PASS:** rendered teal body text `#244d49` on cream `#fffaf0` measures 9.04:1; downside labels and startup costs `#9a3829` measure 6.79:1. Both exceed 4.5:1.
- **Functional controls PASS:** quick actions, search/reset, detail/back focus, native radio keyboard behavior, category dropdown containment and Escape were exercised in all six runs, without page errors.
- **Content and evidence PASS:** each policy uses its catalog tradeoff; declining arrows identify modeled negative effects. MBG cost labels reconcile to the actual startup balance and planned total in both languages.
- **Purpose and identity PASS:** the extra row helps players weigh a policy before adding it. Existing typography, panel hierarchy, rounded controls, map composition and colors remain intact. No unrelated imagery, unsupported numerical claims, decorative badges or fabricated testimonials were introduced.
- **Build and regression PASS:** the root verification completed the production build and nine focused existing browser scenarios, including the unchanged-budget allocation scenario after the cost-heading update.
