/**
 * Headless playtests: many five-year campaigns played by simple bots with
 * different habits (idle, beginner, random, specialist, tax-heavy, greedy).
 * Prints goal hit rates per strategy so balance problems stand out:
 * dominant picks, goals nobody reaches, and goals everybody reaches.
 *
 *   node --import tsx scripts/playtest.ts [--quick] [--json out.json] [--only id,id]
 */
import { readFileSync, writeFileSync } from "node:fs";
import {
  activeIds,
  aggregate,
  basePlan,
  initialQuarter,
  isFinished,
  launchCount,
  resolveQuarter,
} from "../src/engine/economy/engine";
import { policyById } from "../src/engine/economy/catalog";
import {
  campaignGoals,
  regionalAchievement,
} from "../src/engine/economy/goals";
import { starterPolicies } from "../src/engine/economy/policyGoals";
import {
  POLICY_IDS,
  type PolicyId,
  type QuarterGame,
  type QuarterPlan,
} from "../src/engine/economy/types";
import { REELECTION_APPROVAL } from "../src/engine/politics";
import { TAX_IDS, type TaxId, type TaxLevel } from "../src/engine/taxes";

const args = process.argv.slice(2);
const quick = args.includes("--quick");
const jsonOut = args.includes("--json")
  ? args[args.indexOf("--json") + 1]
  : null;
const only = args.includes("--only")
  ? args[args.indexOf("--only") + 1].split(",")
  : null;

/** Small deterministic PRNG so every run is reproducible. */
const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const shuffle = <T>(xs: T[], r: () => number) => {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

type Strategy = {
  id: string;
  group: string;
  /** Policies in launch order; finished builds free their slot for the next. */
  queue: PolicyId[];
  taxes?: Partial<Record<TaxId, TaxLevel>>;
  /** Quarter (0-based) in which tax changes are sent to the DPR. */
  taxQuarter?: number;
  soften?: boolean;
  /** Stop launching after this many quarters (a beginner who stops early). */
  stopAfter?: number;
  /** Keep at most this many programmes running at once. */
  cap?: number;
  /** Offer a coalition deal to Golkar whenever one is possible. */
  deals?: boolean;
};

function plan(game: QuarterGame, s: Strategy, quarter: number): QuarterPlan {
  const p = basePlan(game);
  const running = activeIds(game);
  const frozen = game.politics.frozenUntil > game.simulation.month;
  const cap = s.cap ?? 8;
  const keep = running.filter(
    (id) => s.queue.includes(id) && !isFinished(game, id),
  );
  const room =
    s.stopAfter !== undefined && quarter >= s.stopAfter ? 0 : frozen ? 0 : 2;
  const next = s.queue.filter(
    (id) => !running.includes(id) && !isFinished(game, id),
  );
  p.policies = [...keep];
  for (const id of next) {
    if (p.policies.length >= cap) break;
    const trial = { ...p, policies: [...p.policies, id] };
    if (launchCount(game, trial) > room) continue;
    p.policies = trial.policies;
  }
  if (s.taxes && quarter >= (s.taxQuarter ?? 0)) {
    for (const id of TAX_IDS) if (s.taxes[id]) p.taxes[id] = s.taxes[id]!;
    if (s.soften)
      p.soften = TAX_IDS.filter((id) => s.taxes![id] === "increased");
  }
  if (
    s.deals &&
    !game.politics.deals.some((d) => d.until > game.simulation.month)
  )
    p.deal = "golkar";
  return p;
}

type Row = {
  strategy: string;
  group: string;
  seed: number;
  calm: boolean;
  goals: Record<string, boolean>;
  values: Record<string, number>;
  met: number;
  approval: number;
  reelected: boolean;
  regional: boolean;
  regionsMet: number;
  failedBudgets: number;
  failedBills: number;
  passedBills: number;
  shortfalls: number;
  minFunding: number;
  maxDeficit: number;
  unemployment: number;
  energyDelta: number;
  debt: number;
  income: number;
  povertyDelta: number;
  launched: number;
};

function play(s: Strategy, seed: number, calm: boolean): Row {
  let game = initialQuarter(seed);
  const opening = aggregate(game);
  let shortfalls = 0;
  let minFunding = 1;
  let maxDeficit = 0;
  let failedBills = 0;
  let passedBills = 0;
  const launched = new Set<PolicyId>();
  for (let q = 0; q < 20; q++) {
    const p = plan(game, s, q);
    for (const id of p.policies) launched.add(id);
    game = resolveQuarter(game, p, { calm, attribution: false });
    const ledger = game.receipt!.ledger;
    if (ledger.funding < 0.98) shortfalls++;
    minFunding = Math.min(minFunding, ledger.funding);
    const m = aggregate(game);
    const deficit =
      ((ledger.spending + ledger.interest - ledger.revenue) * 4) /
      (m.gdp * m.priceIndex);
    maxDeficit = Math.max(maxDeficit, deficit);
    for (const v of game.politics.lastVotes) {
      if (v.passed) passedBills++;
      else failedBills++;
    }
  }
  const goals = campaignGoals(game);
  const now = aggregate(game);
  const regional = regionalAchievement(game);
  return {
    strategy: s.id,
    group: s.group,
    seed,
    calm,
    goals: Object.fromEntries(goals.map((g) => [g.id, g.met])),
    values: Object.fromEntries(goals.map((g) => [g.id, g.value])),
    met: goals.filter((g) => g.met).length,
    approval: game.politics.approval,
    reelected: game.politics.approval >= REELECTION_APPROVAL,
    regional: regional.met,
    regionsMet: regional.count,
    failedBudgets: game.politics.budgets.filter((b) => !b.passed).length,
    failedBills,
    passedBills,
    shortfalls,
    minFunding,
    maxDeficit,
    unemployment: now.unemployment,
    energyDelta: now.energy - opening.energy,
    debt: (100 * now.debt) / (now.gdp * now.priceIndex),
    income: (now.realIncome / opening.realIncome - 1) * 100,
    povertyDelta: opening.poverty - now.poverty,
    launched: launched.size,
  };
}

// ---------- strategies ----------
const strategies: Strategy[] = [];
const add = (s: Omit<Strategy, "group">, group: string) =>
  strategies.push({ ...s, group });

add({ id: "idle", queue: [] }, "reference");
add({ id: "starter-six", queue: [...starterPolicies] }, "beginner");
add(
  {
    id: "starter-two-then-stop",
    queue: starterPolicies.slice(0, 2),
    stopAfter: 1,
  },
  "beginner",
);
add({ id: "starter-four", queue: starterPolicies.slice(0, 4) }, "beginner");
add(
  { id: "first-eight-in-list", queue: POLICY_IDS.slice(0, 8) as PolicyId[] },
  "beginner",
);
add(
  {
    id: "all-programmes-no-builds",
    queue: POLICY_IDS.filter((id) => policyById[id].kind === "program").slice(
      0,
      8,
    ) as PolicyId[],
  },
  "specialist",
);
add(
  {
    id: "builds-only-rolling",
    queue: POLICY_IDS.filter(
      (id) => policyById[id].kind === "build",
    ) as PolicyId[],
  },
  "specialist",
);
add({ id: "all-power", queue: ["pltu", "plts", "pltp", "plta"] }, "specialist");
add({ id: "clean-power", queue: ["plts", "pltp", "plta"] }, "specialist");
add(
  { id: "transfers-only", queue: ["pkh", "mbg", "jkn", "bos"] },
  "specialist",
);
add(
  { id: "education-four", queue: ["bos", "teachers", "prakerja", "sarjana"] },
  "specialist",
);
add(
  { id: "health-four", queue: ["ckg", "jkn", "klinik", "water"] },
  "specialist",
);
add(
  {
    id: "food-four",
    queue: ["pupuk", "irrigation", "cold-chain", "food-reserves"],
  },
  "specialist",
);
add(
  { id: "transit-four", queue: ["krl", "mrt-lrt", "brt", "kereta-antarkota"] },
  "specialist",
);
add(
  {
    id: "village-four",
    queue: ["jalan-desa", "embung-desa", "pasar-desa", "kopdes"],
  },
  "specialist",
);
add(
  {
    id: "mixed-eight",
    queue: ["plts", "bos", "jkn", "pupuk", "kur", "water", "bpn", "tol-laut"],
  },
  "sensible",
);
add(
  {
    id: "starter-plus-rolling",
    queue: [
      ...starterPolicies,
      "prakerja",
      "irrigation",
      "pltp",
      "water",
      "broadband",
      "teachers",
    ],
  },
  "sensible",
);
add(
  {
    id: "expensive-eight",
    queue: [
      "mbg",
      "jkn",
      "mrt-lrt",
      "klinik",
      "bos",
      "pltp",
      "tol-laut",
      "kopdes",
    ],
  },
  "extreme",
);
add(
  { id: "everything-rolling", queue: [...POLICY_IDS] as PolicyId[] },
  "extreme",
);
const allUp = Object.fromEntries(
  TAX_IDS.map((id) => [id, "increased"]),
) as Record<TaxId, TaxLevel>;
const allDown = Object.fromEntries(
  TAX_IDS.map((id) => [id, "relief"]),
) as Record<TaxId, TaxLevel>;
add(
  { id: "starter-all-taxes-up", queue: [...starterPolicies], taxes: allUp },
  "tax",
);
add(
  {
    id: "starter-all-taxes-up-soft",
    queue: [...starterPolicies],
    taxes: allUp,
    soften: true,
  },
  "tax",
);
add(
  {
    id: "starter-luxury-corp-up",
    queue: [...starterPolicies],
    taxes: { luxury: "increased", corporateIncome: "increased" },
  },
  "tax",
);
add(
  {
    id: "starter-vat-up",
    queue: [...starterPolicies],
    taxes: { vat: "increased" },
  },
  "tax",
);
add(
  { id: "starter-all-relief", queue: [...starterPolicies], taxes: allDown },
  "tax",
);
add({ id: "idle-all-relief", queue: [], taxes: allDown }, "tax");
add(
  {
    id: "expensive-eight-taxes-up-deals",
    queue: [
      "mbg",
      "jkn",
      "mrt-lrt",
      "klinik",
      "bos",
      "pltp",
      "tol-laut",
      "kopdes",
    ],
    taxes: allUp,
    soften: true,
    deals: true,
  },
  "extreme",
);
add(
  {
    id: "expensive-eight-all-relief",
    queue: [
      "mbg",
      "jkn",
      "mrt-lrt",
      "klinik",
      "bos",
      "pltp",
      "tol-laut",
      "kopdes",
    ],
    taxes: allDown,
  },
  "extreme",
);
add(
  {
    id: "mixed-eight-deals",
    queue: ["plts", "bos", "jkn", "pupuk", "kur", "water", "bpn", "tol-laut"],
    deals: true,
  },
  "sensible",
);
// Each policy alone, to compare value for money.
for (const id of POLICY_IDS) add({ id: `solo:${id}`, queue: [id] }, "solo");
// Random beginners: N random cards, launched two a quarter.
const randomCount = quick ? 8 : 40;
for (const n of [3, 5, 8])
  for (let i = 0; i < randomCount; i++)
    add(
      {
        id: `random${n}#${i}`,
        queue: shuffle([...POLICY_IDS], rng(1000 * n + i)).slice(
          0,
          n,
        ) as PolicyId[],
      },
      `random-${n}`,
    );
// Random rolling: random order through the whole list, always refilling slots.
for (let i = 0; i < randomCount; i++)
  add(
    {
      id: `random-rolling#${i}`,
      queue: shuffle([...POLICY_IDS], rng(77 + i)) as PolicyId[],
    },
    "random-rolling",
  );

const seeds = quick ? [19, 997] : [19, 73, 997, 2025];
const runs: { s: Strategy; seed: number; calm: boolean }[] = [];
for (const s of strategies) {
  if (only && !only.some((o) => s.id.startsWith(o) || s.group === o)) continue;
  // Random portfolios already vary; one seed pair per draw keeps the run short.
  const own = s.group.startsWith("random")
    ? [seeds[strategies.indexOf(s) % seeds.length]]
    : seeds;
  for (const seed of own)
    for (const calm of [true, false]) runs.push({ s, seed, calm });
}

const reportFile = args.includes("--report")
  ? args[args.indexOf("--report") + 1]
  : null;
if (reportFile) {
  report(JSON.parse(readFileSync(reportFile, "utf8")));
  process.exit(0);
}
const shard = Number(process.env.SHARD ?? 0);
const shards = Number(process.env.SHARDS ?? 1);
const rows: Row[] = [];
runs.forEach((run, i) => {
  if (i % shards === shard) rows.push(play(run.s, run.seed, run.calm));
});
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(rows));
if (shards > 1) process.exit(0);
report(rows);

function report(rows: Row[]) {
  const ids = ["income", "poverty", "jobs", "services", "energy", "budget"];
  const pct = (xs: boolean[]) =>
    Math.round((100 * xs.filter(Boolean).length) / Math.max(1, xs.length));
  const avg = (xs: number[]) =>
    xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  const by = new Map<string, Row[]>();
  for (const r of rows) {
    const key = r.group.startsWith("random") ? r.group : r.strategy;
    by.set(key, [...(by.get(key) ?? []), r]);
  }
  const table = [...by.entries()].map(([key, rs]) => ({
    strategy: key,
    n: rs.length,
    goals: avg(rs.map((r) => r.met)).toFixed(1),
    ...Object.fromEntries(
      ids.map((id) => [id, pct(rs.map((r) => r.goals[id]))]),
    ),
    inc: avg(rs.map((r) => r.income)).toFixed(1),
    pov: avg(rs.map((r) => r.povertyDelta)).toFixed(2),
    unemp: avg(rs.map((r) => r.unemployment)).toFixed(1),
    nrg: avg(rs.map((r) => r.energyDelta)).toFixed(1),
    debt: avg(rs.map((r) => r.debt)).toFixed(1),
    def: (100 * avg(rs.map((r) => r.maxDeficit))).toFixed(1),
    appr: avg(rs.map((r) => r.approval)).toFixed(0),
    reel: pct(rs.map((r) => r.reelected)),
    reg: pct(rs.map((r) => r.regional)),
    apbnX: avg(rs.map((r) => r.failedBudgets)).toFixed(1),
    billX: avg(rs.map((r) => r.failedBills)).toFixed(1),
    short: avg(rs.map((r) => r.shortfalls)).toFixed(1),
  }));
  console.table(table);
}
