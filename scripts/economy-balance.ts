import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import {
  activeIds,
  aggregate,
  basePlan,
  isFinished,
  initialQuarter,
  resolveQuarter,
} from "../src/engine/economy/engine";
import { policies } from "../src/engine/economy/catalog";
import { campaignGoals } from "../src/engine/economy/goals";
import {
  parseQuarter,
  quarterEnvelope,
} from "../src/engine/economy/persistence";
import {
  FOUNDATIONS,
  INDUSTRY_IDS,
  POLICY_IDS,
  REGION_IDS,
  type Metrics,
  type PolicyId,
} from "../src/engine/economy/types";
import { TAX_IDS, type TaxLevel } from "../src/engine/taxes";

type Strategy = {
  id: string;
  policies: PolicyId[];
  taxes?: TaxLevel;
  eastern?: boolean;
};
const mixed: PolicyId[] = [
  "plts",
  "bos",
  "jkn",
  "pupuk",
  "kur",
  "water",
];
const strategies: Strategy[] = [
  { id: "baseline", policies: [] },
  {
    id: "education-four",
    policies: ["bos", "teachers", "prakerja", "sarjana"],
  },
  { id: "health-four", policies: ["ckg", "jkn", "klinik", "water"] },
  {
    id: "food-four",
    policies: ["pupuk", "irrigation", "cold-chain", "food-reserves"],
  },
  {
    id: "industry-six",
    policies: [
      "plts",
      "tol-laut",
      "kur",
      "broadband",
      "jalan-desa",
      "prakerja",
    ],
  },
  { id: "mixed-four", policies: mixed.slice(0, 4) },
  { id: "mixed-six", policies: mixed },
  { id: "mixed-eight", policies: [...mixed, "bpn", "tol-laut"] },
  {
    id: "skills-and-services-eight",
    policies: [
      "plts",
      "teachers",
      "jkn",
      "irrigation",
      "kur",
      "tol-laut",
      "prakerja",
      "bpn",
    ],
  },
  {
    id: "lower-cost-eight",
    policies: [
      "ckg",
      "bpn",
      "kur",
      "prakerja",
      "sarjana",
      "teachers",
      "water",
      "irrigation",
    ],
  },
  {
    id: "higher-cost-eight",
    policies: [
      "mbg",
      "jkn",
      "mrt-lrt",
      "klinik",
      "bos",
      "plts",
      "tol-laut",
      "broadband",
    ],
  },
  {
    id: "regional-sectors-six",
    policies: [
      "palm-replanting",
      "mining-rehabilitation",
      "cold-chain",
      "tourism-access",
      "jalan-desa",
      "kopdes",
    ],
  },
  { id: "mixed-six-tax-relief", policies: mixed, taxes: "relief" },
  { id: "mixed-six-tax-increased", policies: mixed, taxes: "increased" },
  { id: "mixed-six-eastern", policies: mixed, eastern: true },
];
const seeds = [19, 73, 997];
const scenarios = ["calm", "seeded-shocks"] as const;
const objectives = [
  "realIncome",
  "poverty",
  "unemployment",
  ...FOUNDATIONS,
  "debtRatio",
] as const;
const sign = (key: string) =>
  ["poverty", "unemployment", "debtRatio"].includes(key) ? -1 : 1;
const almost = (a: number, b: number) =>
  Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));

assert.equal(policies.length, POLICY_IDS.length);
assert.deepEqual(
  new Set(policies.map((policy) => policy.id)),
  new Set(POLICY_IDS),
);

type BalanceRow = Metrics & {
  strategy: string;
  scenario: string;
  seed: number;
  portfolio: PolicyId[];
  taxLevel: TaxLevel;
  regionalSpending: string;
  debtRatio: number;
  nominalGdp: number;
  cumulativeSpending: number;
  cumulativeInterest: number;
  cumulativePolicySpending: number;
  cumulativeTaxes: number;
  minimumFunding: number;
  shortfallQuarters: number;
  realIncomeChange: number;
  goalsMet: number;
  milestones: {
    quarter: number;
    metrics: Metrics;
    meanSkills: number;
    technologyOutput: number;
    funding: number;
  }[];
};
const rows: BalanceRow[] = [];
for (const scenario of scenarios)
  for (const seed of seeds)
    for (const strategy of strategies) {
      let game = initialQuarter(seed);
      const opening = aggregate(game);
      const milestones: {
        quarter: number;
        metrics: Metrics;
        meanSkills: number;
        technologyOutput: number;
        funding: number;
      }[] = [];
      let spending = 0;
      let interest = 0;
      let policySpending = 0;
      let taxRevenue = 0;
      let shortfallQuarters = 0;
      let minimumFunding = 1;
      for (let quarter = 0; quarter < 20; quarter++) {
        const plan = basePlan(game);
        // Finished one-time builds free their slot; launch at most two per quarter.
        const wanted = strategy.policies
          .slice(0, Math.min(strategy.policies.length, (quarter + 1) * 2))
          .filter((id) => !isFinished(game, id));
        const running = activeIds(game);
        plan.policies = [
          ...wanted.filter((id) => running.includes(id)),
          ...wanted.filter((id) => !running.includes(id)).slice(0, 2),
        ].slice(0, 8);
        if (strategy.taxes)
          for (const id of TAX_IDS) plan.taxes[id] = strategy.taxes;
        if (strategy.eastern)
          for (const id of plan.policies)
            for (const region of REGION_IDS) {
              plan.regionalSpending[id][region] = [
                "papua",
                "maluku",
                "ntt",
              ].includes(region)
                ? "high"
                : ["sulawesi", "ntb"].includes(region)
                  ? "medium"
                  : "low";
            }
        game = resolveQuarter(game, plan, {
          calm: scenario === "calm",
          attribution: false,
        });
        const state = game.simulation;
        const metrics = aggregate(game);
        const ledger = game.receipt!.ledger;
        assert.equal(state.month, (quarter + 1) * 3);
        assert(
          Object.values(metrics).every(Number.isFinite),
          `${strategy.id}: nonfinite metrics`,
        );
        assert(
          almost(
            ledger.revenue +
              ledger.borrowing -
              ledger.spending -
              ledger.interest -
              ledger.repayment,
            ledger.cashChange,
          ),
          `${strategy.id}: accounting residual`,
        );
        for (const province of state.provinces) {
          assert(
            almost(
              province.gdp,
              INDUSTRY_IDS.reduce(
                (sum, id) => sum + province.industries[id].output,
                0,
              ),
            ),
            `${strategy.id}: provincial output mismatch`,
          );
          assert(
            INDUSTRY_IDS.reduce(
              (sum, id) => sum + province.industries[id].jobs,
              0,
            ) <=
              province.laborForce + 1e-6,
            `${strategy.id}: workforce mismatch`,
          );
        }
        for (const key of FOUNDATIONS)
          assert(
            metrics[key] >= 0 && metrics[key] <= 100,
            `${strategy.id}: foundation outside range`,
          );
        spending += ledger.spending;
        interest += ledger.interest;
        taxRevenue += Object.values(ledger.taxes).reduce(
          (sum, value) => sum + value,
          0,
        );
        policySpending += Object.values(ledger.policySpending).reduce(
          (sum, value) => sum + value,
          0,
        );
        if (ledger.funding < 0.999999) shortfallQuarters++;
        minimumFunding = Math.min(minimumFunding, ledger.funding);
        if ([1, 4, 8, 12, 20].includes(quarter + 1))
          milestones.push({
            quarter: quarter + 1,
            metrics,
            meanSkills:
              state.provinces.reduce(
                (sum, province) => sum + province.skills * province.population,
                0,
              ) / metrics.population,
            technologyOutput: state.provinces.reduce(
              (sum, province) => sum + province.industries.technology.output,
              0,
            ),
            funding: ledger.funding,
          });
      }
      assert.deepEqual(
        parseQuarter(JSON.stringify(quarterEnvelope(game))),
        game,
        `${strategy.id}: final save round trip`,
      );
      const metrics = aggregate(game);
      rows.push({
        strategy: strategy.id,
        scenario,
        seed,
        portfolio: strategy.policies,
        taxLevel: strategy.taxes ?? "standard",
        regionalSpending: strategy.eastern
          ? "three-high-two-medium-four-low"
          : "uniform-medium",
        ...metrics,
        debtRatio:
          (metrics.debt / (metrics.gdp * game.simulation.priceIndex)) * 100,
        nominalGdp: metrics.gdp * game.simulation.priceIndex,
        cumulativeSpending: spending,
        cumulativeInterest: interest,
        cumulativePolicySpending: policySpending,
        cumulativeTaxes: taxRevenue,
        minimumFunding,
        shortfallQuarters,
        realIncomeChange: metrics.realIncome / opening.realIncome - 1,
        goalsMet: campaignGoals(game).filter((goal) => goal.met).length,
        milestones,
      });
    }

const means = strategies.map((strategy) => {
  const sample = rows.filter((row) => row.strategy === strategy.id);
  return {
    strategy: strategy.id,
    meanGoalsMet:
      sample.reduce((sum, row) => sum + row.goalsMet, 0) / sample.length,
    ...Object.fromEntries(
      objectives.map((key) => [
        key,
        sample.reduce((sum, row) => sum + row[key], 0) / sample.length,
      ]),
    ),
    meanMinimumFunding:
      sample.reduce((sum, row) => sum + row.minimumFunding, 0) / sample.length,
    meanShortfallQuarters:
      sample.reduce((sum, row) => sum + row.shortfallQuarters, 0) /
      sample.length,
  };
});
const universallyBest = means
  .filter((candidate) =>
    means.every(
      (other) =>
        candidate === other ||
        objectives.every(
          (key) =>
            sign(key) *
              (Number(candidate[key as keyof typeof candidate]) -
                Number(other[key as keyof typeof other])) >=
            -1e-8,
        ),
    ),
  )
  .map((row) => row.strategy);
const report = {
  modelVersion: "7.1.0",
  policyCount: policies.length,
  playableRegions: REGION_IDS.length,
  provinceCount: 38,
  campaignQuarters: 20,
  runCount: rows.length,
  seeds,
  scenarios,
  policies: policies.map(
    ({
      id,
      name,
      quarterlyCost,
      setupCost,
      rolloutMonths,
      source,
      adapted,
    }) => ({
      id,
      name,
      quarterlyCost,
      setupCost,
      rolloutMonths,
      source,
      adapted,
    }),
  ),
  diagnostics: { universallyBest },
  means,
  rows,
  limitations:
    "Finite seeded strategy comparisons, not an economic forecast or proof that every possible portfolio is balanced. Policy costs, delivery times, industry sensitivities and regional allocations are gameplay assumptions. Every portfolio adds at most two policies per quarter and respects the eight-policy cap.",
};
writeFileSync(
  "docs/economy-balance.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  `Checked ${rows.length} five-year economy campaigns across ${strategies.length} strategies; wrote docs/economy-balance.json.`,
);
console.table(
  means.map((row) => ({
    strategy: row.strategy,
    income: Number(row["realIncome" as keyof typeof row]).toFixed(2),
    education: Number(row["education" as keyof typeof row]).toFixed(2),
    debt: Number(row["debtRatio" as keyof typeof row]).toFixed(2),
    funding: row.meanMinimumFunding.toFixed(3),
    shortfalls: row.meanShortfallQuarters.toFixed(1),
    goals: row.meanGoalsMet.toFixed(1),
  })),
);
if (universallyBest.length)
  console.warn(
    `Balance review needed: universal representative winner(s): ${universallyBest.join(", ")}`,
  );
