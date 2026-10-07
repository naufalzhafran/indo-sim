# Cabinet gameplay

Each fictional minister has competence, integrity, a specialty, a working style and party affiliation. These are game-balance assumptions, not empirical estimates or claims about real politicians.

## Selection trade-offs

Each portfolio has two specialists. Neither dominates the other across implementation pace, service value and political influence.

| Style | Advantage | Cost |
| --- | --- | --- |
| Accelerator | 25% faster reform implementation | 10% less service value |
| Steward | 8% more service value | 20% slower implementation |
| Coalition builder | Double cabinet-seat voting influence and monthly party trust | 12% slower implementation |

Specialists receive +10 competence in their own portfolio; other placements receive −6. Effective expertise is bounded to 0–100. The implementation multiplier is expertise / 85 × style pace. Funding and concurrent reforms still constrain actual delivery. Tax rates take effect next turn, without a ministerial pace delay.

Integrity losses equal (100 − integrity) × 0.004 × (1 − funded auditing × 0.006). Funded auditing is bounded to 0–100 for this calculation. Service value is (1 − losses) × the style's value multiplier. Value above 100% represents an efficiency gain, not additional spending. Appropriations and cash accounting do not change when delivery efficiency changes.

Non-tax policy effects use funded appropriations × service value of the responsible ministry. Finance additionally affects tax collection; Economy affects output delivery; Health and Education use expertise in service outcomes; Home Affairs uses expertise in provincial capacity. Infrastructure affects project costs and construction pace. New procurement prices also retain the existing integrity/auditing calculation; already commissioned project costs are fixed.

The auditing input to cabinet effects is the funded, implemented auditing level, before applying Home Affairs service value, preventing recursive efficiency calculations. A Finance estimate uses the last recorded funding level; the live delivery calculation uses this month's funding.

Every cabinet seat contributes 2 points to its party's voting score and 0.1 monthly trust; coalition builders contribute 4 and 0.2. During-term cross-party appointments still remove 8 trust from the outgoing party and add 5 to the incoming party. Existing inauguration trust rules are preserved. A cabinet seat does not automatically enroll a party in the coalition.

## Saves and verification

Minister IDs and the save schema remain unchanged. Existing model-2 saves load with the new roster effects from their next turn; past snapshots are preserved. This is a gameplay rebalance, so future trajectories differ from the previous rules. Historic strategy benchmark results predate this rebalance.

Cabinet tests cover non-dominated specialist choices, specialty and auditing effects, health pace/value trade-offs, construction and procurement, parliamentary vote thresholds, accounting and full-term save continuation.

## Cabinet interface

Opening setup and the cabinet dossier share portrait cards with base competence/integrity, specialty fit, calculated pace/value/influence and working-style strengths/costs. Compare candidates opens a side-by-side preview with numerical differences and party consequences. In-game appointments require the explicit Queue appointment action; selected cards then show Queued and the incumbent they replace. Cancel appointment removes the decision before resolution. Current officeholders remain reserved until a month resolves, preventing cancellation of one queued appointment from creating duplicate assignments elsewhere.

The policy panel's funded-effect numbers include cabinet service value. Cabinet voting estimates include queued policy values and political decisions. The header reports estimated policy support, not coalition membership. English and Indonesian use the same formulas and portrait atlas.

Cabinet appointments are queued before an existing policy vote so their parliamentary effects apply to that vote. Replacing a queued appointment preserves this ordering.

## Verification — 29 September 2026

- Production build and 45 unit tests passed.
- 16 targeted browser workflows passed across cabinet, game, onboarding, dropdown and language suites. These include a 60-month presidency, save/reload, side-by-side selection, queue/cancel, duplicate prevention, appointment-before-vote ordering, English/Indonesian, keyboard dismissal and WCAG A/AA checks.
- Screenshots of opening cards, comparisons, queued appointments and the 1280 × 720 comparison were visually inspected. Their paths begin `docs/screenshots/cabinet-cards-`.
- The quick strategy benchmark completed 240 presidencies (10 seeds × 4 scenarios × 6 strategies), checking accounting and save validation; engine monthly p95 was 2.38 ms on this host. This development sample is not a repeat of the old held-out balance gates or an empirical validation.
- The existing production bundle-size advisory remains. Portraits are a separate 2.3 MB local atlas and are available offline with the game assets.

Portrait generation provenance and the full prompt are in [CABINET-ART.md](CABINET-ART.md).
