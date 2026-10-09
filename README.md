# Indonesia / Regional Economy

A bilingual, browser-local strategy game about Indonesia's development over **20 quarters**. Model 7 connects **25 national policies → five regional foundations → 12 business sectors → jobs and household income → taxes → public funding**.

The nine playable regions are Sumatra, Java, Bali, Kalimantan, Sulawesi, NTB, NTT, Maluku and Papua. All 38 provinces retain their own economy and geography. The cheerful island world remains the main view, with dedicated policy, regional and report panels.

## Run and verify

Requires Node 22 or later.

```sh
npm ci
npm run dev -- --port 5174
npm test
npx playwright install chromium
npm run test:e2e
npm run balance:quarter
npm run build
```

Open http://127.0.0.1:5174. Deploy `dist/` to a static HTTP host; workers and bundled map data require HTTP. There is no account, live economic feed, API key or telemetry.

## Playing

- New campaigns open with a three-stage setup: review the six-goal mandate, optionally choose up to two opening policies, and confirm the campaign seed. Opening policies become a recoverable first-quarter draft; starting does not spend money or advance time.
- After quarter 20, a dedicated results dialog grades the final checklist as Full mandate achieved (6), Strong progress (4–5), Mixed results (2–3), or Mandate unmet (0–1). It compares starting and final values, shows both service-protection and funding conditions, and offers the full report, export and a new campaign. Completed saves reopen this screen on reload or import.
- The separate optional “No region left behind” achievement requires rising real income and falling poverty in all nine regions. It does not change the six-goal verdict.

- Choose up to **eight active policies**, launching at most **two per quarter**. Rolling out policies count toward eight; there is no separate rollout limit. Six tax controls are separate from policy slots.
- Open **Manage policy** for costs, timing, causal pathways and regional spending. Each policy divides a fixed national budget using population × Low/Medium/High weights of 1/2/3. Raising one region's share reduces other shares. Uniform Low, Medium or High produces the same allocations and effects.
- All changes join one quarterly draft with Undo, Reset and reload recovery. Viewing an inactive policy spends nothing. Advance resolves three monthly steps, then reports actual changes.
- Strengthen Education, Infrastructure, Energy, Food and Health. Businesses respond to local bottlenecks, demand, financing and tax conditions. Public Services remain separate from the twelve business sectors for accounting.
- Education has separate school access, teaching quality and workforce skills. Access and quality improve first; retraining develops current workers; sustained schooling contributes to the workforce later in the five-year campaign.
- Stopping a policy ends future funding. Earned skills and paid assets remain; services need continued support. Restarting does not instantly restore delivery. Spending shortfalls reduce delivery and appear in forecasts and reports.
- Costs determine affordability. Four or five mixed-cost policies are the opening balancing target; viable development can support larger portfolios. Eight expensive policies create fiscal pressure.

The 10 additions use names inspired by real Indonesian programs or policy frameworks, including RUPTL PLN, PPG, PAMSIMAS & SANIMAS, P3-TGAI, Palapa Ring, SLIN, PSR, Reklamasi dan Pascatambang, Pengembangan Desa Wisata and Lumbung Pangan Masyarakat. Their simulated budgets, timings and effects are game assumptions, not claims about measured real-world outcomes. Source links appear in each detail panel.

## Persistence and verification

Only version-7 campaigns and drafts are supported. IndexedDB `indonesia-economy-v7` contains `autosave-v7` and `draft-v7`. A completed-quarter write clears its draft atomically. Draft identity includes the completed state, preventing an unrelated imported campaign from inheriting it. Exports contain completed quarters; local drafts recover pending changes. Older browser data is left untouched and is not migrated or exposed through the game.

Parties, parliament, campaigning, elections, global priority regions and global allocation strategies have been removed from the active model and interface. The old runtime, save migrations and obsolete tests have been removed.

Supported desktop/laptop sizes are 1280×720, 1366×768 and 1440×900 in English and Bahasa Indonesia. Custom dropdowns, separate help buttons, keyboard focus, reduced motion and the automatic WebGL fallback remain supported. No accordions, sliders or native select controls are used for policy management.

Current unit tests cover the economy, persistence, regional geography and map playback. `tests/economy.spec.ts` covers browser workflows. `scripts/economy-balance.ts` compares complete five-year portfolios in calm and shock scenarios and writes [the balance report](docs/economy-balance.json).

See [the current model](docs/REGIONAL-ECONOMY.md), [verification notes](docs/REGIONAL-ECONOMY-QA.md), and [design decisions](DESIGN.md). Earlier model, cabinet and party documents have been removed; they remain in git history.
