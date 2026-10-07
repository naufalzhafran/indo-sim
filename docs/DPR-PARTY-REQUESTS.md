# DPR redesign: party acceptance and party requests

Status: **approved design** (decisions recorded in §9).

## 1. Why change it

Today the president goes to the parties. The DPR desk asks the player to
inspect six party cards, pick "regional development packages", run
"Suggest party packages", and keep track of three-month promises (priority
level, infrastructure ≥ 50, funding ≥ 80%, 10% of a project contract in new
construction). At the same time several hidden systems move party trust:

| System today | Where | What the player sees |
| --- | --- | --- |
| Monthly trust drift (policy distance, cabinet, constituent approval, delivery, limit) | `simulation.ts` ~L1068 | Only the final trust number |
| Weighted policy distance over 3 interests per party | `partyRules.ts` `policyDistance` | Nothing; one "national preference" line |
| Vote score `trust + delivery + offices + approval − distance×65`, threshold 30/35 | `decisions.ts` `partySupports` | "Likely to support/oppose" |
| Regional promises (`negotiate`) | `simulation.ts` ~L407, ~L1040 | Long paragraph of terms |
| Deadline demands (`party.demand`) | `simulation.ts` ~L1084 | One log line and a small note |
| Release partner (`leave`) | `simulation.ts` ~L443 | Button with no clear payoff |

Problems for players:

1. **The causal chain is invisible.** A party drops from "support" to
   "oppose" because a number deep in a formula crossed 30. Players can't tell
   which policy to move.
2. **The player does all the work.** Deals are a puzzle the player has to
   start, and the best move ("Suggest party packages") is a button that solves
   it for them.
3. **Overlapping commitments.** A regional promise and a deadline demand are
   two different contracts with different rules and different rewards.

## 2. Design goals

- **Parties act, the president reacts.** The DPR comes to the player through
  requests. The player decides how to respond. The player never has to look
  for a deal.
- **One number per party: Acceptance (0–100).** Everything in politics
  either moves acceptance or reads it.
- **Every change has a reason you can read.** Each party lists 2 stances and
  1 red line. Each is shown as met or not met, and the next-month trend is
  shown.
- **Requests are memorable choices with real trade-offs,** not chores. They
  should often conflict with another party's stance, the budget, or
  integrity.
- **Deterministic and seeded.** Keep the existing `politics` RNG stream with
  a fixed draw count per month, so projections, attribution, and the strategy
  benchmark still work.

## 3. Pillar A: Acceptance (the slow, policy-driven layer)

### 3.1 Party stances

Each party has a **primary stance**, a **secondary stance**, and a **red
line**. They come from the current `partyInterests`, `limits`, and the
context rules in `partyRequirements`, so the parties keep their character.

| Party (seats) | Primary stance | Secondary stance | Red line (always votes NO if crossed) |
| --- | --- | --- | --- |
| Civic Union (150) | Education ≥ 65 (+2 each year, max 75) | Auditing ≥ 50 | Personal tax ≤ 18 |
| People's Labor (115) | Assistance ≥ 70 (85 while food inflation > 4%) | Health ≥ 60 | Consumption tax ≤ 12 |
| Regional Alliance (90) | Infrastructure ≥ 70 (during a widespread disaster this becomes Maintenance ≥ 75) | Maintenance ≥ 55 | Infrastructure ≥ 45 |
| Enterprise (90) | Business tax ≤ 10 | Infrastructure ≥ 60 | Business tax ≤ 12 |
| Green Archipelago (70) | Health ≥ 75 (85 during an outbreak or haze) | Auditing ≥ 55 | Fuel subsidy ≤ 55 |
| National Forum (65) | Fuel subsidy ≥ 75 under energy pressure, otherwise ≥ 65 | Maintenance ≥ 55 | Fuel subsidy ≥ 65 |

When a context rule changes a stance, for example when Labor's target rises
because of food inflation, the change is logged as **"Labor raises its
assistance stance to 85"**. The player is never surprised by it.

Stances are judged on **delivered** policy (`fundedPolicies`, as today), so
underfunding and weak ministers matter. The card also shows the **enacted**
value so the player can see "enacted 70, delivered 62 because funding is
low".

### 3.2 Monthly acceptance movement

Acceptance moves part of the way toward a visible **target** each month,
instead of adding many small terms with no limit:

```
target = 50
       + stanceScore(primary,   weight 18)
       + stanceScore(secondary, weight 10)
       − 15 if red line crossed
       + 3 × cabinet influence        (capped at +9; broker ministers count double, as today)
       + (constituent approval − 50) × 0.3   (clamped ±8)
       + goodwill                      (from requests, see §4)

stanceScore(s, w) = w × clamp(1 − gap/10, −1, 1)
    gap = 0 if the stance is met, otherwise points short of the target
    → met = +w, 10 pts short = 0, 20+ pts short = −w

acceptance += (target − acceptance) × 0.20      // about 3 months to cover half the gap
goodwill   *= 0.92                              // half-life about 8 months
```

Why "move toward a target":
- The UI can show **"Heading to 71 ▲"** next to the current value. That is
  the most useful thing to tell a player.
- It can't run away. With the current additive drift, a party that is a
  little unhappy keeps sinking for as long as the gap exists.
- Tuning is easy because each term's size is the weight shown above.

### 3.3 Acceptance bands and voting

Votes become a short rule list the player can read:

| Band | Acceptance | Vote on a policy package |
| --- | --- | --- |
| **Loyal** | ≥ 65 | YES, unless the package crosses its red line |
| **Cooperative** | 45–64 | YES, unless the package crosses its red line or **worsens** one of its stances |
| **Wary** | 25–44 | YES only if the package **improves** one of its stances and worsens none |
| **Hostile** | < 25 | NO |

"Improves" and "worsens" compare the proposed value with the current enacted
value for that stance's policy. This keeps the **horse-trading** gameplay:
to win over a Wary party, put its stance in your package.

Majority is still **291 of 580**.

**Coalition is derived:** a party is in the coalition when it is Loyal or
Cooperative. Hysteresis stops it from flickering: it joins at ≥ 45 and leaves
when it falls below 40. The `coalition` field stays (democracy rule, history,
saves), but the engine sets it, not the player. The **Release partner** action
is removed. Coalition join and leave events are still logged.

## 4. Pillar B: Party requests (the fast, event-like layer)

### 4.1 Lifecycle

```
           ┌─ Accept ─► ACTIVE ─┬─ condition met by deadline ─► FULFILLED (big reward)
ISSUED ────┤                    └─ deadline passes          ─► BROKEN    (big penalty)
(2-month   ├─ Decline ─► DECLINED (small penalty)
 answer    └─ no answer in 2 months ─► IGNORED (declined penalty + 2)
 window)
```

Some requests are **instant**: the cost is paid when you accept, so they
resolve as FULFILLED right away. Examples are a one-off budget transfer or a
cabinet swap.

### 4.2 Frequency and fairness

- No requests before month 4. A request whose deadline would fall after
  month 60 is not issued.
- At most **1 open request per party** and **2 open requests in total**.
- After a request from a party resolves, that party waits 6 months before its
  next one.
- Each month, each eligible party has a chance to issue a request:
  `base 8% × mood`, where mood = 1.4 if Wary or Hostile (they push), 1.0 if
  Cooperative, and 0.7 if Loyal.
- Context triggers raise the weight of matching templates. For example, a
  flood makes Regional's relief request 3× more likely, and food inflation
  above 4% does the same for Labor's food-price request.
- Target pace: about **15–22 requests per 5-year term**, so roughly one
  decision every 3 months. Tune this with the strategy benchmark.
- RNG: one fixed `politics` draw for the roll and one for the template, for
  each party every month, whether or not they are used. This keeps the stream
  aligned, as the existing code does.

### 4.3 Request templates

Each party has 3–4 templates. Each template is one of six **mechanic
types**, so the engine stays small:

| Mechanic type | Condition checked | Example |
| --- | --- | --- |
| **Policy pledge** | Delivered policy X ≥/≤ target by the deadline (4–7 months) | Labor: "Raise social assistance to 80 before Lebaran." |
| **Hold the line** | Policy X does not go above/below a value for N months | National: "No fuel-subsidy cut for 6 months." |
| **Regional project** | Start or fund a project in province P, with new construction worth Rp X T, by the deadline | Regional: "Build a road and port package in South Sulawesi." Replaces today's regional promise. |
| **Crisis relief** | Respond to crisis C with relief this month or next | Regional or Green: "Send relief to the flood in Central Java." |
| **Budget transfer (instant)** | Pay Rp X T now from cash or new debt | Enterprise: "Fund the SME export credit line (Rp 6 T)." |
| **Cabinet seat (instant)** | Appoint a minister from the party to portfolio X | Civic: "Give us the Education portfolio." |

Built-in conflicts make requests into decisions rather than free points:

- Enterprise's business-tax cut pledge costs revenue, and Labor dislikes the
  austerity that follows.
- National's "hold the fuel subsidy" works against Green's red line.
- Budget transfers raise the debt ratio.

### 4.4 Rewards and penalties

Each template is **Minor** or **Major**. Major templates are harder or more
costly and pay more.

| Outcome | Minor | Major | Side effects |
| --- | --- | --- | --- |
| Accept (on acceptance) | +3 acceptance now | +5 acceptance now | n/a |
| **Fulfilled** | +8 acceptance now, +10 goodwill | +12 now, +18 goodwill | Credibility +0.5 |
| Declined | −3 now, −4 goodwill | −5 now, −6 goodwill | n/a |
| Ignored | Declined −2 | Declined −2 | n/a |
| **Broken** | −12 now, −15 goodwill | −18 now, −25 goodwill | Credibility −4. **Every other party −3 goodwill** ("the president doesn't keep promises") |

The design intent: **declining honestly is always better than accepting and
breaking the promise.** Fulfilling a Major request is worth about 2–3 months
of fully met stances and can move a Wary party to Cooperative. Breaking one can
drop a Cooperative party to Wary at once.

## 5. What gets removed or simplified

| Removed | Replaced by |
| --- | --- |
| `negotiate` action, `Promise[]`, `partyDealOffer`, `recommendDeals`, `dealEligibility`, `promiseSpend`, "Suggest party packages" | **Regional project** request template |
| `party.demand` deadline demands | **Policy pledge** request template |
| `leave` action, Release partner | Coalition derived from acceptance |
| `partySupports` score formula and `policyDistance` | Band and stance vote rules (§3.3) |
| `party.delivery` | Folded into goodwill (fulfilled and broken requests) |
| Trust changes from appointments (−8 / +5) | Kept: they apply as goodwill (−8 / +5) and the cabinet term in the target |

## 6. UI: DPR desk layout (no accordions)

```
┌ Parliament / DPR ───────────────────────────────────────────────┐
│ Vote estimate for your draft:  318 / 580  ███████████▌|░░░░  ✓   │
│ Coalition: CU · PL · RA (355 seats)                               │
├ Requests (2) ────────────────────────────────────────────────────┤
│ [PL] Raise social assistance to 80 by Mar 2027   MAJOR            │
│      If fulfilled: +12 now, +18 goodwill · If broken: −18, cred −4 │
│      Conflicts: Fiscal cost ≈ Rp 9 T/mo                            │
│      Answer by Dec 2026         [Accept]  [Decline]                │
│ [RA] Active · South Sulawesi roads · 2 of 4 months · Rp 3.1/5.0 T │
├ Parties ─────────────────────────────────────────────────────────┤
│ [CU] Civic Union · 150 · Loyal   Acceptance 72 → 75 ▲   Votes YES  │
│   ✓ Education ≥ 65 (delivered 67)                                  │
│   ✗ Auditing ≥ 50 (delivered 44)                                   │
│   ⛔ Red line: Personal tax ≤ 18 (draft 16 ✓)                      │
│ … six compact cards in a grid, all information visible …          │
└──────────────────────────────────────────────────────────────────┘
```

- The **Requests** section is the hero. A new request also shows as a
  badge on the DPR tab and as an item in the turn report and Agenda review,
  in the same way as crises.
- Accept or Decline queues a `{ type: "request", id, response }` action in
  this month's agenda, using the same pattern as `respond` for crises, so
  the action can be previewed and undone before the month advances.
- Party cards show every stance as ✓/✗ with the delivered value, the band, the
  target arrow, and the predicted vote on the current draft with its reason
  ("NO: crosses red line").
- "Acceptance", the band names, and "Goodwill" each get a `StatHelp` `?`
  explanation in EN and ID. Native `<select>` controls and disclosures are not
  used.
- Policies page: show a compact vote chip strip (CU ✓ PL ✓ RA ✗ …) so the
  player sees the DPR reaction while dragging sliders.

## 7. Engine and data changes (implementation outline)

1. **Types** (`types.ts`): `Party` drops `delivery`, `lastDealMonth`, and
   `demand`, and adds `goodwill` and `lastRequestMonth`. Keep the field name
   `trust` and show it as "Acceptance", or rename it with a migration (see
   question 1). Add `GameState.requests: PartyRequest[]`. Replace the
   `negotiate` and `leave` actions with `request`.
2. **New `engine/partyRequests.ts`**: template table, eligibility, issuing
   (seeded), condition checks, and resolution. It is data-driven so a new
   template is one entry.
3. **Rewrite `partyRules.ts`**: `partyStances(s, party)` returns the 3
   stances with their context targets, `acceptanceTarget()`, and
   `partyVote(s, party, proposed)`, which returns `{ yes, reason }`.
4. **`simulation.ts`**: replace the trust-drift, demand, and promise blocks
   with stance target → move toward it → requests tick → derived coalition.
   `voteSeats` uses `partyVote`.
5. **`persistence.ts` `upgradeState`**: map `trust` to acceptance, convert an
   open `demand` to an active policy-pledge request, convert open `promises`
   to active regional-project requests, and drop `delivery`.
6. **`strategies.ts` / benchmark**: update the bot strategies to answer
   requests (always accept, always decline, and accept only if feasible)
   and re-run the balance freeze.
7. **Localization**: all template titles and text in `locales/id.ts` and
   `engine-id.ts`.
8. **Tests**: unit tests for each band rule, each template's condition,
   determinism (the same seed gives the same requests whatever the player
   chooses), and migration. Update the Playwright DPR specs.

## 8. Balance targets (to check with the strategy benchmark)

- Opening coalition stays CU + PL + RA = **355 seats**, so the opening policy
  still passes. Starting acceptance stays 72 / 65 / 60 / 45 / 50 / 42.
- **A passive player** (never changes policy, declines every request) slides
  to roughly 270–300 votes by year 2. Governing becomes harder but
  recoverable.
- **An engaged player** who fulfils about 60% of requests and meets the main
  stances holds **350–420**.
- **A player who accepts everything** should break at least 2–3 requests
  because of conflicts. They should end up worse off than a selective player.
- A broken Major request must never cost more than about 90 seats on its own
  (no single-click collapse of the coalition).

## 9. Decisions

1. **Naming:** the internal `trust` field is renamed to `acceptance` (save migration in `upgradeState`). UI label: Acceptance / Penerimaan.
2. **Coalition:** fully derived from acceptance. No manual invite or release.
3. **Regional deals:** removed as a player action; they exist only as Regional-project requests.
4. **Integrity asks:** not included. Requests stay clean.
5. **Hak angket escalation:** not included.
6. **Answer window:** 2 months.

## 10. As implemented

The implementation follows this design. A few numbers changed during calibration:

- **Starting acceptance** for the opposition is Enterprise 42, Green 44 and National 38. With the coalition derived at 45, the draft values (45 / 50 / 42) would have put Enterprise and Green in the opening coalition. The coalition parties keep 72 / 65 / 60.
- **Base attitude** per party (Civic +2, Labor +15, Regional +9, Enterprise −4, Green +3, National +15) is added to the target. Without it, Labor and Regional dropped to about 40 within a year under the opening policy, and a passive player lost the majority in the first months. Now a passive player slides to about 265 seats by year 1–2, just under the 291 majority and recoverable.
- **Request chance** is 10% per eligible party per month (the draft said 8%). That gives about 16–20 requests per term.
- **Project requests** ask for 8% (minor) or 12% (major) of the provincial contract in new construction within 6 months.
- The **integrity ask** and **hak angket** were dropped (decisions 4 and 5).

Benchmark (100 development seeds × 4 scenarios, `npm run benchmark -- --development`):

- The active strategies, which accept what they can deliver, win 69.5%. The balance target is 60–75%.
- The strongest fixed package (fixed-education) wins 29%. The target is 15–35%.
- `accept-all` breaks about 70% of its requests and wins 2.25%. The same policy package with no requests (fixed-services) wins 17.75%.

The held-out evaluation and the frozen benchmark files (`docs/strategy-benchmark.json`, `docs/STRATEGY-BENCHMARK.md`) have not been regenerated.

Code: `src/engine/partyRules.ts` (stances, target, bands, votes), `src/engine/partyRequests.ts` (templates, issuing, answering, resolution), `src/ParliamentDesk.tsx` (UI) and `src/locales/parliament-id.ts` (Indonesian copy). Saves migrate through `migrateLegacyPolitics` in `src/engine/persistence.ts`.
