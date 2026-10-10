# Parliament (DPR) design

Status: phase 1 (approval, tax bills, softening, DPR tab, recap) is built. The yearly APBN vote is phase 2.

## The idea in one paragraph

The player is still the president, but taxes and the yearly budget now have to pass the DPR. Every party votes as one bloc (fraksi), and a party votes yes when its support for the bill is 50 or more. That support comes from three things players can read and change: whether the party is in the coalition, how popular the government is, and how the bill hits the voters that party depends on. Raising one tax while popular passes easily. Raising all six at once, or raising taxes after a bad year, fails. That is the lesson: in Indonesia the limit on taxes is political, not technical.

## What the player sees

1. **A new "DPR" tab** next to Economy, Policies & taxes and Regions. It shows a half-circle of 580 seat dots coloured by party, the coalition line at 291 seats (a majority), a public approval meter, and the next scheduled vote.
2. **Two new chips in the stat strip:** `Approval 72%` and `Coalition 470 / 580`.
3. **Bills in the draft.** Changing a tax level in the draft creates a bill. The draft shows a vote forecast in one row: `PPN to 14%: 338 yes of 580 · passes`, with a per-party breakdown on the DPR tab. The forecast is exact (no dice), so the player can learn why.
4. **The vote happens on Advance.** The quarter recap gets a "DPR vote" section: each fraksi's vote, the reason in one line ("PKB: hurts villages and farmers"), and what changed. A failed tax bill leaves that tax where it was.
5. **The yearly budget vote (APBN).** After Q3 each year, the DPR votes on next year's budget: the current policy portfolio and the forecast deficit. If it fails, next year runs on last year's budget: running policies continue, taxes stay, but **no new policy can launch for four quarters**.

All of this follows the project UI rules: no accordions, no yellow notice boxes, `GameSelect` for any dropdown, `StatHelp` for the short explanations, and the cheerful cream/teal/emerald/coral style. The half-circle sits in a panel, not over the islands.

## Showing who votes and why

The party–group links and each bill's impact are always visible, never hidden in a tooltip or a collapsible section.

### 1. Voter groups on the tax controls

Each tax level option in Policies & taxes shows four small group chips with the effect a change has before the player commits:

```
PPN   [ Ringan ] [ Standar ] [ Tinggi ✓ ]
      Villages −12   Urban −12   Business −5   Outer islands −8
```

Chips use an icon plus a signed number (not colour alone): green with "+" for gains, coral with "−" for losses.

### 2. DPR tab: parties and their groups

The tab has the seat half-circle at the top, then one row per party:

```
Party      Seats  Side         Groups                         Support  Vote
Gerindra    86    President    [Villages] [Urban]             77  ███▉ Yes
Golkar     102    Coalition    [Business] [Outer islands]     63  ███  Yes
PKB         68    Coalition    [Villages]                     64  ███  Yes
PDI-P      110    Outside      [Urban] [Villages]             22  █    No
...
```

- **Group filter buttons** above the table ("All", "Villages & farmers", "Urban households", "Business", "Outer islands") highlight the parties tied to that group and their seats in the half-circle. A selected filter uses the emerald selected state. This answers "who do I upset if I hurt farmers?" at a glance.
- When no bill is pending, the Support column shows each party's standing support (loyalty plus approval) and the Vote column is empty.

### 3. DPR tab: bill breakdown

When the draft has a bill, a bill selector (tabs, one per pending bill) appears above the table, and each party row shows how its support adds up, in plain numbers:

```
PPN increase · 207 yes of 580 · fails (needs 291)

Golkar   Coalition 65 · Approval −2.5 · Business −5 · Outer islands −8 = 49.5  No
PKB      Coalition 65 · Approval −2.5 · Villages −12              = 50.5  Yes
```

- The row a soften choice would flip is marked "Softening changes this vote", so the player sees what a concession buys.
- The pile-up from several tax bills appears as its own term ("Other tax rises −10").

### 4. Bill row in the draft

The tax section of the draft shows one compact row per bill: name, yes count, passes or fails, and a button that opens the DPR tab on that bill. The yes count is never the only information; the breakdown is one click away in a dedicated panel.

### 5. Quarter recap

The National impact step lists each bill's result ("DPR passed PPN (309/580)") and the approval change. The DPR tab's "Last session" view lists every party's vote with its main reason in words ("Golkar voted no: hurts business").

## Real facts it is built on

| Game rule | Indonesia |
|---|---|
| 580 seats; PDI-P 110, Golkar 102, Gerindra 86, NasDem 69, PKB 68, PKS 53, PAN 48, Demokrat 44 | 2024 election result (KPU), eight parties above the 4% threshold |
| Coalition of seven parties (470 seats) around the president's party; PDI-P outside | KIM Plus coalition, October 2024 |
| Taxes change by law, voted by the DPR | Tax rates are set in UU (UU HPP 2021, UU PPh); the DPR passes them with the government |
| Parties vote as blocs | Decisions are taken per fraksi |
| APBN voted in Q3 for the next year | RAPBN submitted in August, approved around September–October |
| A failed APBN means last year's budget repeats | UUD 1945 Pasal 23 ayat (3) |
| A big coalition still balks at unpopular taxes | The 12% PPN rise in January 2025 was limited to luxury goods after public pushback |
| The game opens with the 2025 budget already approved | APBN 2025 was passed by the previous DPR in 2024 |

Numbers are simplified (a fixed seat count for the whole term, round support scores), but the cause and effect follows the table above. Each fact appears as a short "In reality" line on the DPR tab, with a button-styled source link.

## The rules

### Public approval (0–100)

Starts at **72** (a new government's honeymoon). Each quarter it moves 30% of the way toward a target:

```
target = 55
       + 2.0 × real income growth over the last 4 quarters (%)
       − 3.0 × inflation above 3%
       − 2.0 × unemployment change since the opening (points)
       − 4.0 × each tax increase passed in the last 4 quarters
       + 2.0 × each tax cut passed in the last 4 quarters
       + 1.5 × visible household programmes running (MBG, PKH, JKN, CKG; max 4)
       − 5.0 × each quarter of funding shortfall in the last 4 quarters
```

Every term is something the game already computes. The recap shows the two biggest reasons approval moved ("Approval −4: PPN increase, rising unemployment").

### Party support for a bill

```
support = loyalty + 0.5 × (approval − 50) + base effects + concession
```

- **Loyalty:** 90 for the president's party (Gerindra), 65 for other coalition parties, 35 for parties outside.
- **Base effects:** each party leans on one or two voter groups. Each bill has an effect on each group (table below). A party takes the sum for its groups.
- **Pile-up:** each other tax increase in the same session adds −5 for every party on every tax bill. This is what stops "raise everything".
- A party votes yes at support ≥ 50. The bill passes at 291 yes votes.

**Voter groups** (stylised, a game simplification): villages & farmers, urban households, business, outer islands.

| Party | Seats | Groups |
|---|---:|---|
| PDI-P | 110 | urban households, villages & farmers |
| Golkar | 102 | business, outer islands |
| Gerindra | 86 | villages & farmers, urban households |
| NasDem | 69 | business, urban households |
| PKB | 68 | villages & farmers |
| PKS | 53 | urban households |
| PAN | 48 | urban households, business |
| Demokrat | 44 | villages & farmers, outer islands |

**Tax bill effects** (a cut has the opposite sign at half size):

| Increase | Villages | Urban | Business | Outer islands |
|---|---:|---:|---:|---:|
| PPh orang pribadi | −3 | −15 | −5 | −3 |
| PPN | −12 | −12 | −5 | −8 |
| PPh badan | 0 | 0 | −15 | −3 |
| Bea masuk | +5 | −5 | −8 | −5 |
| Cukai | −8 | −3 | −3 | 0 |
| PPnBM | +3 | +3 | −5 | +3 |

Bea masuk helps farmers (protection from imports) and PPnBM is popular because the rich pay it. Those two signs teach something real.

**Worked examples** (each tax change is its own bill; opening approval 72 gives +11):

- *PPN increase alone:* PKB 65+11−12 = 64, yes. Every coalition party votes yes; PDI-P 35+11−24 = 22, no. 470 yes. **Passes.**
- *Same bill after approval falls to 45 (−2.5):* Gerindra 63.5, PKB 50.5 and PKS 50.5 vote yes; Golkar 49.5, NasDem 45.5, PAN 45.5 and Demokrat 42.5 vote no. 207 yes. **Fails.**
- *Same bill at approval 45, softened (staples exempt):* every coalition party rises above 50. 470 yes. **Passes**, with half the extra revenue.
- *All six taxes up in one session:* every bill gets −25 from the pile-up. On the PPN bill only Gerindra (52) votes yes, 86 seats. **All six fail.** Raising them one at a time over the term, while approval holds, can work.

### Concession: soften a tax bill

Each tax-increase bill has one optional "Soften" choice, shown as a selectable card in the bill row (not a toggle that hides content):

Softening always works the same way, so it stays easy to read: the rate rises only half as much (half the extra revenue) and every negative group effect is halved. Each tax names its softening in real terms:

- **PPN:** exempt basic goods.
- **PPh orang pribadi:** raise the tax-free threshold.
- **PPh badan:** exempt small firms.
- **Bea masuk:** exempt farm inputs.
- **Cukai:** phase in gradually.
- **PPnBM:** exempt locally made goods.

This is the Indonesian pattern (fuel price rise plus BLT BBM in 2022; the 2025 PPN limited to luxury goods) and teaches that policy design is how governments get unpopular things passed.

### The yearly APBN vote (after Q3 2025, 2026, 2027, 2028)

Support for the budget uses the same formula with these base effects:

- **+5** to a group for each running policy it favours (villages: pupuk, irrigation, Kopdes, jalan desa, embung; urban: KRL, MRT/LRT, BRT, Prakerja; business: KUR, broadband, cold chain; outer islands: Tol Laut, PLTS, tourism access). Capped at +15 per group.
- **−10** to a group for each programme it favours that was stopped this year.
- **−20 to every party** if the forecast deficit is above 3% of GDP (the legal limit; this links to the 3% line planned in fix 2).

If the APBN fails, the following four quarters are "last year's budget": the draft disables launches with a plain explanation beside the Launch button, and the DPR tab shows when the freeze ends.

## Balance targets

To check with `npm run balance:quarter` once built, on seeds 19, 73 and 997:

| Strategy | Expected |
|---|---|
| Raise all six taxes in Q1 | Fails. Raising them one or two a year passes only while approval stays above ~55 |
| "All taxes increased" as a whole campaign | At most three of the six increases pass; debt advantage over the baseline halves |
| No policies, standard taxes | Approval drifts to ~50; every APBN passes |
| Good mixed portfolio | Approval 55–65 at Q20; every APBN passes |
| High-deficit portfolio (above 3%) | At least one APBN fails |

The DPR should never block a player who leaves taxes alone and keeps the deficit under 3%. It exists to make tax rises a real decision, not to make the game harder overall.

## How it fits the code

- **New module** `src/engine/politics.ts`: party table, approval update, `billSupport()`, `voteForecast()`, `resolveVotes()`. Pure functions, unit-tested like `taxes.ts`.
- **State:** `QuarterGame` gains `politics` (approval, softened taxes, recent tax changes and shortfalls, approval terms, last votes). It is optional in the save schema, and older saves load with the opening politics state.
- **Engine hooks:** `validatePlan` blocks launches during a freeze; `resolveQuarter` resolves bills before applying taxes (a failed bill keeps the old level) and runs the APBN vote at the end of Q3; `previewQuarter` returns the forecast so the draft can show it.
- **UI:** a `ParliamentPanel` in the existing panel system (party table, group filters, bill tabs and breakdown), two stat chips, group impact chips and a bill row in `TaxPolicies.tsx`, and a vote section in `QuarterRecap.tsx`. English and Indonesian strings through the existing `t()` pattern.
- **Mandate:** the six goals stay as they are. Approval adds one optional named objective, "Re-election 2029: approval at least 50% at the end", next to "No region left behind".

### Coordination with the open rebalance PR

PR #2 (fixes 1–4) changes `engine.ts`, `catalog.ts`, `goals.ts` and the balance numbers. This work should start from main **after PR #2 merges**, since approval reads income, unemployment and the 3% deficit line from that PR. Until then it can be built in its own files with tests, and hooked in afterwards.

## Phases

1. **Phase 1 (core):** approval, DPR tab, tax bills with forecast, recap, softening, tests. Saves keep version 8 with an optional `politics` field, so older campaigns still load.
2. **Phase 2:** the yearly APBN vote and the launch freeze; the re-election objective.
3. **Later, if wanted:** Perppu during a crisis (pass a tax or deficit change immediately, the DPR confirms it next quarter, as in Perppu 1/2020), protests when approval drops below 30, and coalition deals that buy a party's vote with regional projects.

## Decisions I made (say if you want different)

1. **Real party names and 2024 seats.** It is more educational. The voter-group links are simplified and labelled as a game assumption. The alternative is fictional parties with the same mechanics.
2. **Exact vote forecasts, no randomness.** Easier to learn cause and effect; tension comes from approval moving.
3. **Only taxes and the yearly budget go to a vote.** Launching a policy inside the approved budget needs no vote, which keeps the quarter loop fast.
4. **Fixed seats for the whole term.** The game covers 2025–2029, one DPR term, so there is no mid-game election.
