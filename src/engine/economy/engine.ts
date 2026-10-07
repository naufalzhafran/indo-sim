import baseline from "../../data/baseline.json" with { type: "json" };
import sectorData from "../../data/sectors.json" with { type: "json" };
import pillarData from "../../data/pillars.json" with { type: "json" };
import { shipFood } from "./network";
import { grantProjectCompletionReward } from "./projectRewards";
import { GAME_REGIONS } from "../gameRegions";
import type { Project } from "../../worldTypes";
import {
  TAX_IDS,
  TAX_LEVELS,
  taxDefinitions,
  defaultTaxes,
  type TaxId,
  type TaxSettings,
} from "../taxes";
import {
  foundationNames,
  industries,
  industryById,
  policies,
  policyById,
  eligibleRegions,
} from "./catalog";
import {
  FOUNDATIONS,
  INDUSTRY_IDS,
  POLICY_IDS,
  REGION_IDS,
  SPENDING_LEVELS,
  type EconomyState,
  type Foundation,
  type FoundationScores,
  type IndustryId,
  type IndustryState,
  type BuildDisruption,
  type BuiltGainKey,
  type Ledger,
  type Metrics,
  type PolicyChannel,
  type PolicyId,
  type PolicyRuntime,
  type ProvinceEconomy,
  type QuarterGame,
  type QuarterPlan,
  type RegionEconomy,
  type RegionId,
  type RegionalSpending,
  type TaxBreakdown,
} from "./types";

const clamp = (x: number, low = 0, high = 100) =>
  Math.min(high, Math.max(low, x));
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const clone = <T>(x: T): T => structuredClone(x);
const bi = (en: string, id: string) => ({ en, id });
const zeroTaxes = (): TaxBreakdown =>
  Object.fromEntries(TAX_IDS.map((k) => [k, 0])) as TaxBreakdown;
const regionOf = (id: string): RegionId =>
  GAME_REGIONS.find((r) => r.provinceIds.includes(id))!.id as RegionId;
const pillarById = new Map(pillarData.provinces.map((p) => [p.id, p]));
const development = (p: ProvinceEconomy) =>
  clamp(
    pillarById.get(p.id)!.development +
      0.2 * (p.education - p.initialFoundations.education) +
      0.18 * (p.health - p.initialFoundations.health) +
      0.045 * (p.realIncome - 100),
  );
const openingById = new Map(baseline.provinces.map((p) => [p.id, p]));
const totalPopulation = sum(baseline.provinces.map((p) => p.population));
const totalRice = sum(pillarData.provinces.map((p) => p.rice));
const annualTrend = 1.025;
const monthlyTrend = Math.pow(annualTrend, 1 / 12);
const monthlyPopulation = Math.pow(1.009, 1 / 12);
const levelWeight = { low: 1, medium: 2, high: 3 };
const defaultLevels = (): RegionalSpending =>
  Object.fromEntries(
    REGION_IDS.map((id) => [id, "medium"]),
  ) as RegionalSpending;

const openingFoodFlows = shipFood(
  baseline.provinces.map((p) => ({
    id: p.id,
    foodNeed: ((p.population / totalPopulation) * totalRice) / 1.04,
    infrastructure: clamp(45 + p.urban * 30 - p.poverty * 0.35, 25, 85),
  })),
  new Map(pillarData.provinces.map((p) => [p.id, p.rice])),
);

export function foundations(p: ProvinceEconomy): FoundationScores {
  return {
    education: p.education,
    infrastructure: p.infrastructure,
    energy: p.energy,
    food: p.foodSecurity,
    health: p.health,
  };
}

function readiness(scores: FoundationScores, id: IndustryId) {
  const def = industryById[id];
  const weighted = sum(FOUNDATIONS.map((k) => def.weights[k] * scores[k]));
  const weakest = Math.min(...def.essential.map((k) => scores[k]));
  const value = clamp(0.7 * weighted + 0.3 * weakest, 15, 100);
  const bottleneck = [...FOUNDATIONS].sort(
    (a, b) =>
      def.weights[b] * (100 - scores[b]) - def.weights[a] * (100 - scores[a]),
  )[0];
  return { value, bottleneck };
}

/** Agriculture subdivisions are synthetic game allocations, not observed industry statistics. */
function sharesFor(id: string): Record<IndustryId, number> {
  const raw = sectorData.provinces.find((p) => p.id === id)!.industryPercent;
  const region = regionOf(id);
  const splits: Record<RegionId, [number, number]> = {
    sumatra: [0.3, 0.13],
    java: [0.015, 0.13],
    bali: [0.005, 0.19],
    kalimantan: [0.38, 0.12],
    sulawesi: [0.1, 0.25],
    ntb: [0.005, 0.25],
    ntt: [0.005, 0.23],
    maluku: [0.005, 0.48],
    papua: [0.08, 0.24],
  };
  const [palm, fish] = splits[region];
  const values: Record<IndustryId, number> = {
    agriculture: raw[0] * (1 - palm - fish),
    palmOil: raw[0] * palm,
    fishing: raw[0] * fish,
    mining: raw[1],
    manufacturing: raw[2],
    construction: raw[3] + raw[4] + raw[5],
    retail: raw[6],
    logistics: raw[7],
    tourism: raw[8],
    technology: raw[9],
    finance: raw[10],
    services: raw[11] + raw[12] + raw[16],
    publicServices: raw[13] + raw[14] + raw[15],
  };
  const total = sum(Object.values(values));
  return Object.fromEntries(
    INDUSTRY_IDS.map((k) => [k, values[k] / total]),
  ) as Record<IndustryId, number>;
}

function rates(settings: TaxSettings): TaxBreakdown {
  return Object.fromEntries(
    taxDefinitions.map((d) => [d.id, d.rates[settings[d.id]] / 100]),
  ) as TaxBreakdown;
}

/** All bases are monthly nominal money. Final consumption is counted once, never intermediate turnover. */
function rawTaxBases(p: ProvinceEconomy, priceIndex: number): TaxBreakdown {
  const wage = sum(industries.map((d) => p.industries[d.id].laborIncome));
  const profit = sum(
    industries
      .filter((d) => d.id !== "publicServices")
      .map((d) => p.industries[d.id].profits),
  );
  const importedInputs = sum(
    industries.map((d) => p.industries[d.id].output * d.importShare * 0.18),
  );
  const consumption = Math.max(0, p.consumption);
  const factor = priceIndex / 12;
  return {
    personalIncome: wage * 0.5 * factor,
    corporateIncome: profit * 0.65 * factor,
    vat: consumption * 0.65 * factor,
    importDuty: (consumption * 0.14 + importedInputs) * factor,
    excise: consumption * 0.04 * factor,
    luxury: consumption * 0.025 * factor,
  };
}

const initialRawTaxTotal = (() => {
  const r = rates(defaultTaxes());
  return sum(
    baseline.provinces.map((p) => {
      const shares = sharesFor(p.id);
      const wages = sum(
        industries.map((d) => p.gdp * shares[d.id] * d.laborShare),
      );
      const profits = sum(
        industries
          .filter((d) => d.id !== "publicServices")
          .map((d) => p.gdp * shares[d.id] * (1 - d.laborShare - 0.12)),
      );
      const consumption = p.gdp * 0.58;
      const imports = sum(
        industries.map((d) => p.gdp * shares[d.id] * d.importShare * 0.18),
      );
      return (
        (wages * 0.5 * r.personalIncome +
          profits * 0.65 * r.corporateIncome +
          consumption * 0.65 * r.vat +
          (consumption * 0.14 + imports) * r.importDuty +
          consumption * 0.04 * r.excise +
          consumption * 0.025 * r.luxury) /
        12
      );
    }),
  );
})();
// Preserve the opening fiscal scale. Effective bases and all behavioral coefficients are game assumptions.
const taxScale = (2842.5 / 12 - 24) / initialRawTaxTotal;

function emptyLedger(): Ledger {
  return {
    taxes: zeroTaxes(),
    nonTaxRevenue: 0,
    revenue: 0,
    spending: 0,
    interest: 0,
    borrowing: 0,
    repayment: 0,
    cashChange: 0,
    residual: 0,
    requested: 0,
    funding: 1,
    policySpending: {},
  };
}

function assessTaxes(
  p: ProvinceEconomy,
  settings: TaxSettings,
  priceIndex: number,
) {
  const r = rates(settings),
    bases = rawTaxBases(p, priceIndex);
  const taxes = zeroTaxes();
  for (const id of TAX_IDS)
    taxes[id] = bases[id] * taxScale * r[id] * p.collection;
  return { bases, taxes };
}

export function initialQuarter(seed = 2025): QuarterGame {
  const provinces = baseline.provinces.map((b) => {
    const d = pillarById.get(b.id)!;
    const infrastructure = clamp(45 + b.urban * 30 - b.poverty * 0.35, 25, 85);
    const schoolAccess = clamp(62 + 8 * (d.expectedSchooling - 13.21));
    const schoolQuality = clamp(
      62 + 4 * (d.meanSchooling - 8.85) + 2 * (d.expectedSchooling - 13.21),
    );
    const skills = clamp(55 + 7 * (d.meanSchooling - 8.85));
    const healthStatus = clamp(65 + 4.5 * (d.lifeExpectancy - 74.15));
    const reliability = clamp(50 + 150 * (d.reserveMargin - 1), 35, 97);
    const scores: FoundationScores = {
      education: 0.4 * schoolAccess + 0.4 * schoolQuality + 0.2 * skills,
      infrastructure,
      health: (d.healthAccess + healthStatus) / 2,
      energy: 0.5 * d.electrification + 0.5 * reliability,
      food: clamp(100 - 0.9 * d.stunting - 0.6 * b.poverty, 20, 95),
    };
    const shares = sharesFor(b.id),
      laborForce = b.population * 0.52;
    const wageTotal = sum(
      industries.map((def) => b.gdp * shares[def.id] * def.laborShare),
    );
    const states = Object.fromEntries(
      industries.map((def) => {
        const output = b.gdp * shares[def.id],
          ready = readiness(scores, def.id);
        return [
          def.id,
          {
            output,
            initialOutput: output,
            capacity: output,
            initialReadiness: ready.value,
            readiness: ready.value,
            productivity: 1,
            jobs:
              (laborForce *
                (1 - b.unemployment / 100) *
                output *
                def.laborShare) /
              wageTotal,
            laborIncome: output * def.laborShare,
            profits:
              def.id === "publicServices"
                ? 0
                : output * (1 - def.laborShare - 0.12),
            investment:
              def.id === "publicServices"
                ? 0
                : output *
                  (1 - def.laborShare - 0.12) *
                  (1 - 0.18 * 0.65 * taxScale) *
                  0.12,
            growth: 4.5,
            bottleneck: ready.bottleneck,
          } satisfies IndustryState,
        ];
      }),
    ) as Record<IndustryId, IndustryState>;
    const p: ProvinceEconomy = {
      id: b.id,
      name: b.name,
      population: b.population,
      gdp: b.gdp,
      initialGdp: b.gdp,
      growth: 4.5,
      poverty: b.poverty,
      initialPoverty: b.poverty,
      unemployment: b.unemployment,
      initialUnemployment: b.unemployment,
      urban: b.urban,
      laborForce,
      infrastructure,
      schoolAccess,
      schoolQuality,
      skills,
      initialSkills: skills,
      education: scores.education,
      water: d.water,
      healthAccess: d.healthAccess,
      healthStatus,
      health: scores.health,
      reliability,
      electrification: d.electrification,
      energy: scores.energy,
      powerCapacity: b.gdp * d.reserveMargin,
      powerDemand: b.gdp,
      powerPipeline: 0,
      foodProduction: d.rice,
      initialFoodProduction: d.rice,
      foodNeed: ((b.population / totalPopulation) * totalRice) / 1.04,
      foodReceived: 0,
      foodImported: 0,
      foodUnmet: 0,
      foodSecurity: scores.food,
      development: d.development,
      initialFoundations: scores,
      inflation: 2.5,
      realIncome: 100,
      consumption: b.gdp * 0.58,
      disposableIncome: wageTotal * 0.94,
      collection: 1,
      industries: states,
      taxBases: zeroTaxes(),
      taxes: zeroTaxes(),
      policySpending: {},
      policyAssets: {},
      builtGains: {},
      drivers: [],
    };
    const assessed = assessTaxes(p, defaultTaxes(), 1);
    p.taxBases = assessed.bases;
    p.taxes = assessed.taxes;
    const flow = openingFoodFlows.get(p.id)!;
    p.foodReceived = flow.received;
    p.foodImported = flow.imported;
    p.foodUnmet = flow.unmet;
    return p;
  });
  const simulation: EconomyState = {
    month: 0,
    seed: seed >>> 0,
    rng: seed >>> 0,
    priceIndex: 1,
    provinces,
    debt: baseline.national.debt,
    cash: 0,
    projects: [],
    crises: [],
    events: [],
    history: [],
    ledger: emptyLedger(),
  };
  const ledger = simulation.ledger;
  for (const p of provinces)
    for (const id of TAX_IDS) ledger.taxes[id] += p.taxes[id];
  ledger.nonTaxRevenue = 24;
  ledger.revenue = sum(Object.values(ledger.taxes)) + 24;
  ledger.spending = 205;
  ledger.requested = 205;
  ledger.interest = (baseline.national.debt * 0.05) / 12;
  ledger.borrowing = Math.max(
    0,
    ledger.spending + ledger.interest - ledger.revenue,
  );
  const game: QuarterGame = {
    version: 8,
    simulation,
    policies: [],
    taxes: defaultTaxes(),
    regionalSpending: Object.fromEntries(
      POLICY_IDS.map((id) => [id, defaultLevels()]),
    ) as QuarterPlan["regionalSpending"],
    receipt: null,
  };
  simulation.history = [aggregate(game)];
  return game;
}

export const activeIds = (game: QuarterGame): PolicyId[] =>
  game.policies.filter((p) => p.active).map((p) => p.id);
export const isFinished = (game: QuarterGame, id: PolicyId) =>
  Boolean(game.policies.find((p) => p.id === id)?.finished);
/** Launches restart work; reactivating built facilities does not count. */
export const launchCount = (game: QuarterGame, plan: QuarterPlan) =>
  plan.policies.filter((id) => {
    if (activeIds(game).includes(id)) return false;
    const runtime = game.policies.find((p) => p.id === id);
    return !(
      runtime &&
      policyById[id].kind === "facility" &&
      projectsOf(game, id).some((project) => project.completed)
    );
  }).length;
export const projectsOf = (game: QuarterGame, id: PolicyId): Project[] =>
  game.simulation.projects.filter(
    (project) => project.id.split(":")[0] === id,
  );
/** Monthly construction payment for one regional site, in nominal money. */
const installment = (project: Project) =>
  project.completed
    ? 0
    : Math.min(
        project.cost / project.duration,
        Math.max(0, project.cost - project.spent),
      );
const builtRegions = (game: QuarterGame, id: PolicyId) =>
  new Set(
    projectsOf(game, id)
      .filter((project) => project.completed)
      .map((project) => regionOf(project.province)),
  );
export type PolicyQuarterCost = {
  setup: number;
  service: number;
  construction: number;
  idle: number;
  total: number;
};
/** Next quarter's nominal cost of one policy under a plan. */
export function policyQuarterCost(
  game: QuarterGame,
  plan: QuarterPlan,
  id: PolicyId,
): PolicyQuarterCost {
  const def = policyById[id];
  const price = game.simulation.priceIndex;
  const runtime = game.policies.find((p) => p.id === id);
  const selected = plan.policies.includes(id);
  const cost = { setup: 0, service: 0, construction: 0, idle: 0, total: 0 };
  if (def.kind === "program") {
    if (selected) {
      cost.setup =
        (runtime ? runtime.startupRemaining : def.setupCost) * price;
      cost.service = def.quarterlyCost * price;
    }
  } else if (!runtime?.finished) {
    const projects = projectsOf(game, id);
    if (selected)
      cost.construction = projects.length
        ? sum(
            projects.map((project) =>
              Math.min(
                (3 * project.cost) / project.duration,
                Math.max(0, project.cost - project.spent),
              ),
            ),
          )
        : Math.min(1, 3 / def.build!.months) * def.build!.cost * price;
    const built = builtRegions(game, id);
    const builtShare = sum(
      regionShares(game, plan, id)
        .filter((x) => built.has(x.region))
        .map((x) => x.share),
    );
    if (def.kind === "facility") {
      if (selected) cost.service = def.quarterlyCost * price * builtShare;
      else
        cost.idle =
          (def.idleUpkeepShare ?? 0) * def.quarterlyCost * price * builtShare;
    }
  }
  cost.total = cost.setup + cost.service + cost.construction + cost.idle;
  return cost;
}
/** Population-weighted regional shares; ineligible regions get none. */
export function regionShares(
  game: QuarterGame,
  plan: QuarterPlan,
  id: PolicyId,
) {
  const allowed = eligibleRegions(id);
  const weights = GAME_REGIONS.map((region) => ({
    region: region.id as RegionId,
    weight: allowed.includes(region.id as RegionId)
      ? sum(
          game.simulation.provinces
            .filter((p) => region.provinceIds.includes(p.id))
            .map((p) => p.population),
        ) * levelWeight[plan.regionalSpending[id][region.id as RegionId]]
      : 0,
  }));
  const denominator = sum(weights.map((x) => x.weight));
  return weights.map((x) => ({
    region: x.region,
    share: x.weight / denominator,
  }));
}
export const basePlan = (game: QuarterGame): QuarterPlan => ({
  policies: activeIds(game),
  taxes: { ...game.taxes },
  regionalSpending: clone(game.regionalSpending),
});

export function validatePlan(game: QuarterGame, plan: QuarterPlan): string[] {
  const errors: string[] = [];
  if (game.simulation.month >= 60)
    errors.push("The five-year development term has ended.");
  if (
    !Array.isArray(plan.policies) ||
    plan.policies.length > 8 ||
    new Set(plan.policies).size !== plan.policies.length ||
    plan.policies.some((id) => !POLICY_IDS.includes(id))
  )
    errors.push("Choose up to eight different policies.");
  if (Array.isArray(plan.policies) && launchCount(game, plan) > 2)
    errors.push("At most two policies can launch per quarter.");
  if (
    Array.isArray(plan.policies) &&
    plan.policies.some((id) => isFinished(game, id))
  )
    errors.push(
      "A completed one-time build cannot be launched again.",
    );
  if (
    !plan.taxes ||
    Object.keys(plan.taxes).length !== TAX_IDS.length ||
    TAX_IDS.some((id) => !TAX_LEVELS.includes(plan.taxes[id]))
  )
    errors.push("Choose a valid level for all six taxes.");
  if (
    !plan.regionalSpending ||
    Object.keys(plan.regionalSpending).length !== POLICY_IDS.length ||
    POLICY_IDS.some(
      (id) =>
        !plan.regionalSpending[id] ||
        Object.keys(plan.regionalSpending[id]).length !== REGION_IDS.length ||
        REGION_IDS.some(
          (region) =>
            !SPENDING_LEVELS.includes(plan.regionalSpending[id][region]),
        ),
    )
  )
    errors.push("Choose Low, Medium or High for every policy and region.");
  return errors;
}

export function policyAllocations(
  game: QuarterGame,
  plan: QuarterPlan,
  id: PolicyId,
) {
  const budget = policyQuarterCost(game, plan, id).total;
  return regionShares(game, plan, id).map((x) => ({
    ...x,
    amount: budget * x.share,
  }));
}

export function aggregate(input: QuarterGame | EconomyState): Metrics {
  const s = "simulation" in input ? input.simulation : input;
  const population = sum(s.provinces.map((p) => p.population));
  const gdp = sum(s.provinces.map((p) => p.gdp));
  const mean = (value: (p: ProvinceEconomy) => number) =>
    sum(s.provinces.map((p) => value(p) * p.population)) / population;
  const perPerson = gdp / population;
  const disparity =
    sum(
      GAME_REGIONS.map((region) => {
        const members = s.provinces.filter((p) =>
          region.provinceIds.includes(p.id),
        );
        const people = sum(members.map((p) => p.population)),
          output = sum(members.map((p) => p.gdp));
        return people * (output / people - perPerson) ** 2;
      }),
    ) / population;
  return {
    month: s.month,
    priceIndex: s.priceIndex,
    population,
    gdp,
    growth: sum(s.provinces.map((p) => p.gdp * p.growth)) / gdp,
    poverty: mean((p) => p.poverty),
    unemployment: mean((p) => p.unemployment),
    inflation: mean((p) => p.inflation),
    education: mean((p) => p.education),
    infrastructure: mean((p) => p.infrastructure),
    energy: mean((p) => p.energy),
    food: mean((p) => p.foodSecurity),
    health: mean((p) => p.health),
    development: mean((p) => p.development),
    inequality: Math.sqrt(disparity) / perPerson,
    realIncome: mean((p) => p.realIncome),
    jobs: sum(
      s.provinces.flatMap((p) =>
        industries.map((d) => p.industries[d.id].jobs),
      ),
    ),
    debt: s.debt,
    cash: s.cash,
    taxRevenue: sum(Object.values(s.ledger.taxes)),
    revenue: s.ledger.revenue,
    spending: s.ledger.spending,
    interest: s.ledger.interest,
    balance: s.ledger.revenue - s.ledger.spending - s.ledger.interest,
  };
}

export function summarizeEconomyRegions(game: QuarterGame): RegionEconomy[] {
  return GAME_REGIONS.map((region) => {
    const members = game.simulation.provinces.filter((p) =>
      region.provinceIds.includes(p.id),
    );
    const population = sum(members.map((p) => p.population)),
      gdp = sum(members.map((p) => p.gdp));
    const mean = (fn: (p: ProvinceEconomy) => number) =>
      sum(members.map((p) => fn(p) * p.population)) / population;
    const taxes = zeroTaxes();
    for (const p of members) for (const id of TAX_IDS) taxes[id] += p.taxes[id];
    const policySpending: RegionEconomy["policySpending"] = {};
    for (const id of POLICY_IDS) {
      const amount = sum(members.map((p) => p.policySpending[id] ?? 0));
      if (amount) policySpending[id] = amount;
    }
    const industryStates = Object.fromEntries(
      industries.map((d) => {
        const totals = { ...members[0].industries[d.id] };
        for (const key of [
          "output",
          "initialOutput",
          "capacity",
          "jobs",
          "laborIncome",
          "profits",
          "investment",
        ] as const)
          totals[key] = sum(members.map((p) => p.industries[d.id][key]));
        for (const key of [
          "readiness",
          "initialReadiness",
          "productivity",
          "growth",
        ] as const)
          totals[key] =
            sum(
              members.map(
                (p) => p.industries[d.id][key] * p.industries[d.id].output,
              ),
            ) / Math.max(0.00001, totals.output);
        totals.bottleneck = [...FOUNDATIONS].sort(
          (a, b) =>
            sum(
              members.map((p) =>
                p.industries[d.id].bottleneck === b
                  ? p.industries[d.id].output
                  : 0,
              ),
            ) -
            sum(
              members.map((p) =>
                p.industries[d.id].bottleneck === a
                  ? p.industries[d.id].output
                  : 0,
              ),
            ),
        )[0];
        return [d.id, totals];
      }),
    ) as Record<IndustryId, IndustryState>;
    return {
      id: region.id as RegionId,
      name: region.name,
      nameId: region.nameId,
      population,
      gdp,
      growth: sum(members.map((p) => p.growth * p.gdp)) / gdp,
      poverty: mean((p) => p.poverty),
      unemployment: mean((p) => p.unemployment),
      realIncome: mean((p) => p.realIncome),
      jobs: sum(industries.map((d) => industryStates[d.id].jobs)),
      foundations: Object.fromEntries(
        FOUNDATIONS.map((k) => [k, mean((p) => foundations(p)[k])]),
      ) as FoundationScores,
      industries: industryStates,
      taxes,
      policySpending,
    };
  });
}

type Channels = Partial<Record<PolicyChannel, number>>;
const channel = (x: Channels, k: PolicyChannel) => x[k] ?? 0;
const approach = (current: number, target: number, speed: number) =>
  clamp(current + (target - current) * speed);
function random(s: EconomyState) {
  s.rng = (Math.imul(1664525, s.rng) + 1013904223) >>> 0;
  return s.rng / 4294967296;
}

function advanceMonth(
  game: QuarterGame,
  calm: boolean,
  appropriationPrice: number,
) {
  const s = game.simulation,
    before = clone(s),
    nominal = sum(before.provinces.map((p) => p.gdp)) * before.priceIndex;
  const beforeMap = new Map(before.provinces.map((p) => [p.id, p]));
  const ledger = emptyLedger();
  for (const p of s.provinces) {
    const assessed = assessTaxes(
      beforeMap.get(p.id)!,
      game.taxes,
      before.priceIndex,
    );
    p.taxBases = assessed.bases;
    p.taxes = assessed.taxes;
    for (const id of TAX_IDS) ledger.taxes[id] += p.taxes[id];
  }
  ledger.nonTaxRevenue = 24 * (nominal / baseline.national.gdp);
  ledger.revenue = sum(Object.values(ledger.taxes)) + ledger.nonTaxRevenue;
  const debtRatio = before.debt / nominal;
  ledger.interest =
    (before.debt * (0.05 + Math.max(0, debtRatio - 0.4) * 0.18)) / 12;
  const programs = game.policies.filter(
    (p) => p.active && policyById[p.id].kind === "program",
  );
  const upkeep = programs.reduce(
    (n, r) => n + policyById[r.id].quarterlyCost / 3,
    0,
  );
  const setup = programs.reduce(
    (n, r) => n + Math.min(r.startupRemaining, policyById[r.id].setupCost / 3),
    0,
  );
  const plan = basePlan(game);
  // Construction is billed per site at launch prices; facility service and idle upkeep at today's.
  const facilityCosts = new Map<
    PolicyId,
    { region: RegionId; share: number; amount: number }[]
  >();
  let construction = 0;
  for (const runtime of game.policies) {
    const def = policyById[runtime.id];
    if (def.kind === "program") continue;
    if (runtime.active)
      construction += sum(projectsOf(game, def.id).map(installment));
    if (def.kind !== "facility") continue;
    const built = builtRegions(game, def.id);
    const rate = runtime.active ? 1 : (def.idleUpkeepShare ?? 0);
    facilityCosts.set(
      def.id,
      regionShares(game, plan, def.id)
        .filter((x) => built.has(x.region))
        .map((x) => ({
          ...x,
          amount: ((rate * def.quarterlyCost) / 3) * x.share * appropriationPrice,
        })),
    );
  }
  const facilityTotal = sum(
    [...facilityCosts.values()].flatMap((list) => list.map((x) => x.amount)),
  );
  const inherited =
    205 * before.priceIndex * Math.pow(1.035, before.month / 12);
  const maintenance =
    sum(
      before.provinces.map(
        (p) =>
          Math.max(0, p.infrastructure - p.initialFoundations.infrastructure) *
          p.population,
      ),
    ) *
    0.004 *
    before.priceIndex;
  ledger.requested =
    inherited +
    maintenance +
    (upkeep + setup) * appropriationPrice +
    construction +
    facilityTotal;
  const borrowingLimit =
    (nominal / 12) * clamp(0.022 - (debtRatio - 0.4) * 0.075, 0.002, 0.035);
  ledger.funding = clamp(
    (ledger.revenue + borrowingLimit + before.cash - ledger.interest) /
      ledger.requested,
    0,
    1,
  );
  ledger.spending = ledger.requested * ledger.funding;
  const inputs = new Map<string, Channels>(),
    cashTransfers = new Map<string, number>(),
    constructionMoney = new Map<string, number>(),
    disruptions = new Map<string, BuildDisruption[]>();
  for (const p of s.provinces) {
    inputs.set(p.id, {});
    p.policySpending = {};
    p.drivers = [];
  }
  const deliver = (
    runtime: PolicyRuntime,
    regions: { region: RegionId; share: number }[],
    monthlyService: number,
    ramp: number,
  ) => {
    const def = policyById[runtime.id];
    for (const allocation of regions) {
      const members = s.provinces.filter(
        (p) => regionOf(p.id) === allocation.region,
      );
      const regionPopulation = sum(members.map((p) => p.population));
      // Rollout readiness persists, but this month's service follows this month's money.
      runtime.delivery[allocation.region] +=
        (ramp - runtime.delivery[allocation.region]) * 0.3 * ledger.funding;
      for (const p of members) {
        const localShare = p.population / regionPopulation;
        p.policySpending[def.id] =
          (p.policySpending[def.id] ?? 0) +
          monthlyService * allocation.share * localShare;
        const x = inputs.get(p.id)!;
        const old = beforeMap.get(p.id)!;
        const absorption = clamp(
          0.45 + old.skills / 150 + old.infrastructure / 300,
          0.6,
          1.15,
        );
        const operatingMoney =
          (def.quarterlyCost / 3) *
          ledger.funding *
          appropriationPrice *
          allocation.share *
          localShare;
        const openingMoney =
          (def.quarterlyCost / 3) *
          before.priceIndex *
          (p.population / totalPopulation);
        const delivery =
          (operatingMoney / openingMoney) *
          runtime.delivery[allocation.region] *
          absorption;
        for (const [key, value] of Object.entries(def.effects))
          x[key as PolicyChannel] =
            (x[key as PolicyChannel] ?? 0) + value * delivery;
        p.policyAssets[def.id] = (p.policyAssets[def.id] ?? 0) + delivery / 12;
        const transfer =
          (operatingMoney / before.priceIndex) *
          12 *
          Math.min(1, def.effects.transfers ?? 0) *
          Math.min(1, runtime.delivery[allocation.region]);
        cashTransfers.set(p.id, (cashTransfers.get(p.id) ?? 0) + transfer);
      }
    }
  };
  const record = (id: PolicyId, region: RegionId, amount: number) => {
    const members = s.provinces.filter((p) => regionOf(p.id) === region);
    const regionPopulation = sum(members.map((p) => p.population));
    for (const p of members)
      p.policySpending[id] =
        (p.policySpending[id] ?? 0) +
        (amount * p.population) / regionPopulation;
    ledger.policySpending[id] = (ledger.policySpending[id] ?? 0) + amount;
    return members;
  };
  for (const runtime of game.policies) {
    const def = policyById[runtime.id];
    if (def.kind === "program") {
      if (!runtime.active) {
        for (const region of REGION_IDS) runtime.delivery[region] *= 0.75;
        continue;
      }
      const setupPaid =
        Math.min(runtime.startupRemaining, def.setupCost / 3) * ledger.funding;
      runtime.startupRemaining = Math.max(
        0,
        runtime.startupRemaining - setupPaid,
      );
      runtime.fundedMonths += ledger.funding;
      const monthlyCost =
        ((def.quarterlyCost / 3) * ledger.funding + setupPaid) *
        appropriationPrice;
      ledger.policySpending[def.id] = monthlyCost;
      deliver(
        runtime,
        policyAllocations(game, plan, def.id),
        monthlyCost,
        Math.min(1, runtime.fundedMonths / def.rolloutMonths),
      );
      continue;
    }
    if (runtime.active)
      for (const project of projectsOf(game, def.id)) {
        const paid = installment(project) * ledger.funding;
        if (paid <= 0) continue;
        // Snap the final installment so rounding never leaves a sliver unpaid.
        project.spent =
          project.cost - project.spent - paid <= project.cost * 1e-9
            ? project.cost
            : project.spent + paid;
        const members = record(def.id, regionOf(project.province), paid);
        const regionPopulation = sum(members.map((p) => p.population));
        for (const p of members) {
          const local = (paid * p.population) / regionPopulation;
          constructionMoney.set(
            p.id,
            (constructionMoney.get(p.id) ?? 0) + local,
          );
          disruptions.set(p.id, [
            ...(disruptions.get(p.id) ?? []),
            ...def.build!.disruption.map((d) => ({
              ...d,
              amount: d.amount * ledger.funding,
            })),
          ]);
        }
      }
    if (def.kind !== "facility") continue;
    const sites = facilityCosts.get(def.id) ?? [];
    if (!runtime.active) {
      // Idle facilities keep their buildings but provide no service.
      for (const region of REGION_IDS) runtime.delivery[region] *= 0.75;
      for (const site of sites)
        record(def.id, site.region, site.amount * ledger.funding);
      continue;
    }
    runtime.fundedMonths += ledger.funding;
    ledger.policySpending[def.id] =
      (ledger.policySpending[def.id] ?? 0) +
      sum(sites.map((site) => site.amount * ledger.funding));
    // Service starts where a facility stands, and ramps quickly when reopened.
    deliver(
      runtime,
      sites,
      sum(sites.map((site) => site.amount * ledger.funding)) /
        Math.max(1e-9, sum(sites.map((site) => site.share))),
      1,
    );
  }
  // Random draws have a fixed schedule, independent of policy selections.
  const shockDraw = random(s),
    provinceDraw = random(s),
    kindDraw = random(s),
    demandDraw = random(s);
  const worldDemand = calm ? 0 : (demandDraw - 0.5) * 0.08;
  if (!calm && shockDraw < 0.13) {
    const ordered = [...s.provinces].sort((a, b) => a.id.localeCompare(b.id));
    const target =
      ordered[
        Math.min(ordered.length - 1, Math.floor(provinceDraw * ordered.length))
      ];
    const kind = (
      kindDraw < 0.4 ? "harvest" : kindDraw < 0.7 ? "flood" : "outbreak"
    ) as "harvest" | "flood" | "outbreak";
    s.crises.push({
      id: `crisis-${s.month}-${target.id}`,
      province: target.id,
      title:
        kind === "harvest"
          ? "Harvest shortfall"
          : kind === "flood"
            ? "Flood damage"
            : "Local outbreak",
      description:
        "Public services and economic activity need time to recover.",
      months: 12,
      severity: 0.55,
      response: "relief",
      resolved: false,
      kind,
      stage: "active",
      damage: 0.55,
      initialDamage: 0.55,
      age: 0,
    });
    s.events.push({
      month: s.month,
      kind: "crisis",
      title: bi("Regional disruption", "Gangguan daerah"),
      detail: bi(
        `${target.name} faces ${kind === "harvest" ? "a harvest shortfall" : kind === "flood" ? "flood damage" : "a local outbreak"}.`,
        `${target.name} menghadapi ${kind === "harvest" ? "kekurangan panen" : kind === "flood" ? "kerusakan banjir" : "wabah lokal"}.`,
      ),
      province: target.id,
    });
  }
  const damage = (id: string, kind?: string) =>
    sum(
      s.crises
        .filter(
          (c) => c.province === id && !c.resolved && (!kind || c.kind === kind),
        )
        .map((c) => c.damage),
    );
  const production = new Map(
    before.provinces.map((p) => {
      const cropRatio =
        p.industries.agriculture.output /
        Math.max(
          0.001,
          p.industries.agriculture.initialOutput *
            Math.pow(annualTrend, before.month / 12),
        );
      const fishRatio =
        p.industries.fishing.output /
        Math.max(
          0.001,
          p.industries.fishing.initialOutput *
            Math.pow(annualTrend, before.month / 12),
        );
      return [
        p.id,
        p.initialFoodProduction *
          Math.max(0.15, 0.92 * cropRatio + 0.08 * fishRatio) *
          (1 - 0.35 * damage(p.id, "harvest")),
      ];
    }),
  );
  const foodFlows = shipFood(before.provinces, production);
  const pools = new Map<string, { capacity: number; demand: number }>();
  for (const p of before.provinces) {
    const d = pillarById.get(p.id)!;
    const key = d.grid === "isolated" ? p.id : d.grid;
    const pool = pools.get(key) ?? { capacity: 0, demand: 0 };
    pool.capacity += p.powerCapacity;
    pool.demand += p.powerDemand;
    pools.set(key, pool);
  }
  const standard = rates(defaultTaxes()),
    current = rates(game.taxes);
  for (const p of s.provinces) {
    const b = beforeMap.get(p.id)!,
      d = pillarById.get(p.id)!,
      open = openingById.get(p.id)!,
      x = inputs.get(p.id)!,
      f = foundations(b);
    const delivered = (key: PolicyChannel) =>
      Math.sqrt(Math.max(0, channel(x, key)));
    const shortage = 1 - ledger.funding;
    const rural = 1 - open.urban * 0.35;
    p.population = b.population * monthlyPopulation;
    p.laborForce = b.laborForce * monthlyPopulation;
    p.foodNeed = b.foodNeed * monthlyPopulation;
    const servicePressure = p.population / open.population - 1;
    // Completed builds are permanent: baseline decay applies only to the rest.
    const built = (key: BuiltGainKey) => b.builtGains[key] ?? 0;
    const siteDrag = (target: BuildDisruption["target"]) =>
      sum(
        (disruptions.get(p.id) ?? [])
          .filter((d) => d.target === target)
          .map((d) => d.amount),
      );
    p.water = clamp(
      built("water") +
        clamp(
          b.water -
            built("water") +
            0.11 * delivered("water") +
            0.04 * delivered("irrigation") -
            0.025 -
            0.045 * shortage,
        ),
    );
    const infrastructureGain =
      0.09 * delivered("transport") +
      0.035 * delivered("water") +
      0.06 * delivered("digital") +
      0.025 * delivered("tourismAccess");
    p.infrastructure = clamp(
      built("infrastructure") +
        clamp(
          b.infrastructure -
            built("infrastructure") +
            (infrastructureGain * (100 - b.infrastructure)) / 45 -
            0.035 -
            0.065 * shortage -
            0.015 * damage(p.id, "flood"),
        ),
    );
    p.schoolAccess = approach(
      b.schoolAccess,
      clamp(
        62 +
          8 * (d.expectedSchooling - 13.21) +
          9 * delivered("schoolAccess") +
          3 * delivered("university") +
          0.15 * (b.infrastructure - b.initialFoundations.infrastructure) -
          35 * servicePressure -
          4 * shortage,
      ),
      0.045,
    );
    p.schoolQuality = approach(
      b.schoolQuality,
      clamp(
        62 +
          4 * (d.meanSchooling - 8.85) +
          2 * (d.expectedSchooling - 13.21) +
          10 * delivered("schoolQuality") +
          0.1 * (b.energy - b.initialFoundations.energy) +
          0.06 * (b.health - b.initialFoundations.health) -
          25 * servicePressure -
          5 * shortage,
      ),
      0.035,
    );
    const university = game.policies.find((r) => r.id === "sarjana");
    const universityMaturity = university
      ? clamp((s.month - university.started - 18) / 24, 0, 1)
      : 0;
    const learning = Math.max(
      0,
      (b.schoolAccess + b.schoolQuality) / 2 -
        (b.initialFoundations.education - 0.2 * b.initialSkills) / 0.8,
    );
    const schoolMaturity = Math.max(
      0,
      ...game.policies
        .filter((r) => r.id === "bos" || r.id === "teachers")
        .map((r) => clamp((s.month - r.started - 18) / 18, 0, 1)),
    );
    const skillsTarget =
      b.initialSkills +
      0.7 * learning * schoolMaturity +
      5 * delivered("training") +
      6 * delivered("university") * universityMaturity;
    // Acquired skills persist; a lack of current funding cannot unteach the workforce.
    p.skills = clamp(
      Math.max(b.skills, b.skills + (skillsTarget - b.skills) * 0.018),
    );
    p.education = 0.4 * p.schoolAccess + 0.4 * p.schoolQuality + 0.2 * p.skills;
    const matured = b.powerPipeline / 12;
    p.powerPipeline =
      b.powerPipeline + open.gdp * 0.0075 * delivered("electricity") - matured;
    p.powerCapacity = b.powerCapacity * (monthlyTrend - 0.0007) + matured;
    p.powerDemand =
      b.gdp *
      (1 + 0.001 * (b.electrification - d.electrification)) *
      (1 + 0.35 * servicePressure);
    const pool = pools.get(d.grid === "isolated" ? p.id : d.grid)!;
    const initialPool = before.provinces.filter(
      (v) =>
        (pillarById.get(v.id)!.grid === "isolated"
          ? v.id
          : pillarById.get(v.id)!.grid) ===
        (d.grid === "isolated" ? p.id : d.grid),
    );
    const initialReserve =
      sum(
        initialPool.map(
          (v) => v.initialGdp * pillarById.get(v.id)!.reserveMargin,
        ),
      ) / sum(initialPool.map((v) => v.initialGdp));
    const openingReliability = clamp(50 + 150 * (d.reserveMargin - 1), 35, 97);
    p.reliability = approach(
      b.reliability,
      openingReliability +
        100 * (pool.capacity / pool.demand - initialReserve) +
        1.5 * delivered("electricity") -
        8 * shortage,
      0.2,
    );
    if (p.reliability < b.reliability - 0.05)
      p.drivers.push("Power demand outpaces usable supply");
    p.electrification = clamp(
      b.electrification +
        (100 - b.electrification) * 0.0015 * delivered("electricity"),
    );
    p.energy = 0.5 * p.electrification + 0.5 * p.reliability;
    p.foodProduction = production.get(p.id)!;
    const foodFlow = foodFlows.get(p.id)!;
    p.foodReceived = foodFlow.received;
    p.foodImported = foodFlow.imported;
    p.foodUnmet = foodFlow.unmet;
    const affordability =
      (b.realIncome - 100) * 0.08 + delivered("transfers") * 1.7;
    const cropImprovement =
      (p.foodProduction / Math.max(1, p.initialFoodProduction) - 1) * 9;
    const storage = delivered("foodStorage") * 2.2;
    const marketSupply =
      -18 * (p.foodUnmet - openingFoodFlows.get(p.id)!.unmet);
    p.foodSecurity = approach(
      b.foodSecurity,
      b.initialFoundations.food +
        3 * delivered("nutrition") +
        affordability +
        cropImprovement +
        storage +
        marketSupply -
        10 * damage(p.id, "harvest") -
        3 * shortage,
      0.1,
    );
    p.healthAccess = approach(
      b.healthAccess,
      d.healthAccess +
        12 * delivered("healthAccess") +
        built("healthAccess") +
        0.2 * (b.infrastructure - b.initialFoundations.infrastructure) -
        35 * servicePressure -
        6 * shortage,
      0.055,
    );
    const miningWeight = b.industries.mining.initialOutput / b.initialGdp;
    const healthyTarget =
      65 +
      4.5 * (d.lifeExpectancy - 74.15) +
      0.55 * (b.healthAccess - d.healthAccess) +
      0.2 * (b.water - d.water) +
      0.25 * (b.foodSecurity - b.initialFoundations.food) +
      4 * delivered("miningCleanup") * Math.sqrt(miningWeight) +
      built("healthStatus") -
      siteDrag("healthStatus") -
      8 * damage(p.id, "outbreak");
    p.healthStatus = approach(b.healthStatus, healthyTarget, 0.04);
    p.health = (p.healthAccess + p.healthStatus) / 2;
    p.collection = clamp(
      b.collection + (1 + 0.1 * delivered("collection") - b.collection) * 0.04,
      0.85,
      1.18,
    );
    const openingWages = sum(
      industries.map(
        (def) => b.industries[def.id].initialOutput * def.laborShare,
      ),
    );
    const baseConsumption = annualTrend ** (before.month / 12);
    const consumptionRatio = clamp(
      b.consumption / (b.initialGdp * 0.58 * baseConsumption),
      0.7,
      1.3,
    );
    const regionFinance = clamp(
      b.industries.finance.output /
        (b.industries.finance.initialOutput * baseConsumption) -
        1,
      -0.2,
      0.3,
    );
    const regionTechnology = clamp(
      b.industries.technology.output /
        (b.industries.technology.initialOutput * baseConsumption) -
        1,
      -0.2,
      0.3,
    );
    const regionLogistics = clamp(
      b.industries.logistics.output /
        (b.industries.logistics.initialOutput * baseConsumption) -
        1,
      -0.2,
      0.3,
    );
    for (const def of industries) {
      const industrialFoundations = {
        ...f,
        education: clamp(
          b.initialFoundations.education + 1.5 * (b.skills - b.initialSkills),
        ),
      };
      const old = b.industries[def.id],
        next = p.industries[def.id],
        ready = readiness(industrialFoundations, def.id);
      const palm = game.policies.find(
        (r) => r.id === "palm-replanting" && r.active,
      );
      const palmAge = palm ? s.month - palm.started : 0;
      const palmPaid = p.policyAssets["palm-replanting"] ?? 0;
      const palmMature = clamp((palmAge - 15) / 18, 0, 1);
      let productivity = 1 - siteDrag(def.id);
      if (def.id === "construction")
        // Construction sites hire locally while they are being paid.
        productivity += clamp(
          (0.5 * 12 * (constructionMoney.get(p.id) ?? 0)) /
            before.priceIndex /
            Math.max(0.000001, old.output),
          0,
          0.3,
        );
      if (def.id === "agriculture")
        productivity +=
          0.09 * delivered("farmInputs") * rural +
          0.025 * delivered("foodStorage");
      if (def.id === "fishing")
        productivity +=
          0.09 * delivered("coldChain") * clamp(f.energy / 75, 0.5, 1.2);
      if (def.id === "palmOil")
        productivity +=
          0.11 * Math.min(2, palmPaid) * palmMature -
          0.055 * delivered("palmReplanting") * (1 - palmMature);
      if (def.id === "technology" || def.id === "finance")
        productivity += 0.015 * delivered("digital");
      if (def.id === "tourism")
        productivity += 0.025 * delivered("tourismAccess");
      if (def.id === "mining")
        productivity -= 0.02 * delivered("miningCleanup");
      const tariffCost =
        1 - (current.importDuty - standard.importDuty) * def.importShare * 1.2;
      const servicesDemand = ["retail", "tourism", "services"].includes(def.id)
        ? Math.pow(consumptionRatio, 0.45)
        : 1;
      const upstream =
        def.id === "manufacturing"
          ? 0.025 *
            (b.industries.agriculture.output /
              (b.industries.agriculture.initialOutput * baseConsumption) -
              1)
          : 0;
      const spillover = clamp(
        0.03 * regionFinance +
          0.025 * regionTechnology +
          0.04 * regionLogistics +
          upstream,
        -0.035,
        0.035,
      );
      next.productivity =
        old.productivity + (productivity - old.productivity) * 0.12;
      const target =
        old.initialOutput *
        (1 + built(`industry:${def.id}`) / 100) *
        monthlyTrend ** (s.month + 1) *
        (ready.value / old.initialReadiness) *
        next.productivity *
        (1 + spillover) *
        tariffCost;
      const referenceInvestment =
        old.initialOutput *
        (1 - def.laborShare - 0.12) *
        (1 - standard.corporateIncome * 0.65 * taxScale) *
        0.12 *
        monthlyTrend ** s.month;
      const investmentCoverage =
        def.id === "publicServices"
          ? ledger.funding
          : clamp(
              old.investment / Math.max(0.000001, referenceInvestment),
              0,
              1.8,
            );
      const readinessGap = target - old.capacity * monthlyTrend;
      const financedExpansion =
        old.capacity * (monthlyTrend - 1) * investmentCoverage +
        Math.max(0, readinessGap) * 0.12 * Math.min(1.5, investmentCoverage);
      const retirement = Math.min(0, readinessGap) * 0.12;
      next.capacity = Math.max(
        0.001,
        old.capacity + financedExpansion + retirement,
      );
      const disruption =
        damage(p.id) * 0.04 +
        (def.id === "agriculture" ? damage(p.id, "harvest") * 0.13 : 0);
      const demand = (1 + worldDemand * def.exportShare) * servicesDemand;
      const desired = next.capacity * demand * (1 - disruption);
      next.output = Math.max(
        0.000001,
        old.output * monthlyTrend +
          (desired - old.output * monthlyTrend) * 0.28,
      );
      next.growth =
        (Math.pow(next.output / Math.max(0.000001, old.output), 12) - 1) * 100;
      next.readiness = ready.value;
      next.bottleneck = ready.bottleneck;
      const initialJobs =
        (open.population *
          0.52 *
          (1 - b.initialUnemployment / 100) *
          old.initialOutput *
          def.laborShare) /
        openingWages;
      const laborDemand =
        (initialJobs * (next.output / Math.max(0.000001, old.initialOutput))) /
        monthlyTrend ** (s.month + 1) /
        (1 + 0.0015 * (b.skills - b.initialSkills));
      next.jobs = Math.max(0, old.jobs + (laborDemand - old.jobs) * 0.16);
    }
    const jobs = sum(industries.map((def) => p.industries[def.id].jobs));
    const jobCap = p.laborForce * 0.995;
    if (jobs > jobCap)
      for (const def of industries) p.industries[def.id].jobs *= jobCap / jobs;
    const annualWage =
      (openingWages /
        (open.population * 0.52 * (1 - b.initialUnemployment / 100))) *
      monthlyTrend ** (s.month + 1) *
      Math.max(0.1, 1 + 0.0015 * (b.skills - b.initialSkills));
    for (const def of industries) {
      const next = p.industries[def.id];
      const creditEligible = [
        "agriculture",
        "manufacturing",
        "retail",
        "fishing",
        "services",
      ].includes(def.id);
      const credit = creditEligible ? 0.065 * delivered("credit") : 0;
      // Filled jobs earn wages; the industry's labor share caps its wage budget.
      // Apply the labor-force cap first so unfilled jobs never earn taxable income.
      next.laborIncome = Math.min(
        next.output * def.laborShare,
        next.jobs * annualWage,
      );
      next.profits =
        def.id === "publicServices"
          ? 0
          : Math.max(
              0,
              next.output * (1 - 0.12) -
                next.laborIncome -
                (current.importDuty - standard.importDuty) *
                  next.output *
                  def.importShare *
                  0.18,
            );
      next.investment =
        def.id === "publicServices"
          ? 0
          : next.profits *
            (1 - current.corporateIncome * 0.65 * taxScale * b.collection) *
            (0.12 + credit);
    }
    p.gdp = sum(industries.map((def) => p.industries[def.id].output));
    p.growth = (Math.pow(p.gdp / b.gdp, 12) - 1) * 100;
    p.unemployment = clamp(
      100 * (1 - Math.min(jobs, jobCap) / p.laborForce),
      0.5,
      45,
    );
    const wages = sum(
      industries.map((def) => p.industries[def.id].laborIncome),
    );
    const distributedProfits =
      Math.max(
        0,
        sum(industries.map((def) => p.industries[def.id].profits)) -
          (p.taxes.corporateIncome * 12) / before.priceIndex,
      ) * 0.3;
    const incomeTax = (p.taxes.personalIncome * 12) / before.priceIndex;
    const transfers = cashTransfers.get(p.id) ?? 0;
    p.disposableIncome = Math.max(
      0,
      wages + distributedProfits - incomeTax + transfers,
    );
    const initialProfits =
      sum(
        industries
          .filter((def) => def.id !== "publicServices")
          .map(
            (def) =>
              b.industries[def.id].initialOutput * (1 - def.laborShare - 0.12),
          ),
      ) *
      (1 - standard.corporateIncome * 0.65 * taxScale) *
      0.3;
    const initialIncomeTax =
      openingWages * 0.5 * standard.personalIncome * taxScale;
    const initialDisposable = openingWages + initialProfits - initialIncomeTax;
    const consumptionPrice =
      (1 +
        current.vat * 0.65 +
        current.excise * 0.04 +
        current.luxury * 0.025 +
        current.importDuty * 0.14) /
      (1 +
        standard.vat * 0.65 +
        standard.excise * 0.04 +
        standard.luxury * 0.025 +
        standard.importDuty * 0.14);
    const foodCost =
      1 + Math.max(0, b.initialFoundations.food - p.foodSecurity) * 0.003;
    p.realIncome = clamp(
      (p.disposableIncome /
        initialDisposable /
        consumptionPrice /
        foodCost /
        (p.population / open.population)) *
        100,
      25,
      300,
    );
    const consumptionTarget = (b.initialGdp * 0.58 * p.realIncome) / 100;
    p.consumption = b.consumption + (consumptionTarget - b.consumption) * 0.35;
    p.poverty = clamp(
      b.initialPoverty -
        (p.realIncome - 100) * 0.12 +
        (p.unemployment - b.initialUnemployment) * 0.3,
      0.3,
      65,
    );
    p.inflation = clamp(
      2.5 +
        Math.max(0, b.initialFoundations.food - p.foodSecurity) * 0.12 +
        Math.max(0, b.initialFoundations.energy - p.energy) * 0.08,
      -2,
      18,
    );
    p.development = development(p);
    const gaps = FOUNDATIONS.map((k) => ({
      key: k,
      value: p.initialFoundations[k] - foundations(p)[k],
    })).sort((a, b) => b.value - a.value);
    if (gaps[0].value > 0.5) p.drivers.push(`${gaps[0].key} pressure`);
    const strongest = Object.entries(x).sort((a, b) => b[1] - a[1])[0];
    if (strongest && strongest[1] > 0.1)
      p.drivers.push(`${strongest[0]} delivery`);
    if (shortage > 0.01) p.drivers.push("Funding shortfall");
  }
  for (const project of s.projects) {
    const id = project.id.split(":")[0] as PolicyId;
    const runtime = game.policies.find((p) => p.id === id);
    if (project.completed) continue;
    const region = regionOf(project.province);
    const members = s.provinces.filter((p) => regionOf(p.id) === region);
    const fundedProgress =
      project.spent >= project.cost
        ? 100
        : (project.spent / project.cost) * 100;
    const absorption =
      sum(
        members.map(
          (p) =>
            clamp(0.45 + p.skills / 150 + p.infrastructure / 300, 0.6, 1.15) *
            p.population,
        ),
      ) / sum(members.map((p) => p.population));
    project.progress = Math.min(
      fundedProgress,
      project.progress + (100 * absorption) / project.duration,
    );
    project.completed = project.progress >= 100;
    project.paused =
      !project.completed &&
      !runtime?.active &&
      project.progress >= fundedProgress - 0.001;
  }
  for (const project of s.projects) {
    const granted = grantProjectCompletionReward(project, s.provinces);
    if (!granted) continue;
    const { region, rewards } = granted;
    if (
      rewards.some(
        (reward) =>
          reward.target === "healthAccess" || reward.target === "healthStatus",
      )
    )
      for (const province of s.provinces)
        if (region.provinceIds.includes(province.id))
          province.development = development(province);
    const rewardText = (language: "en" | "id") =>
      rewards
        .map((reward) =>
          reward.unit === "percent"
            ? `${reward.label[language]} ${reward.amount < 0 ? "−" : "+"}${Math.abs(reward.amount)}%`
            : `${reward.label[language]} ${reward.amount < 0 ? "−" : "+"}${Math.abs(reward.amount)} ${language === "en" ? "points (maximum 100)" : "poin (maksimum 100)"}`,
        )
        .join(", ");
    s.events.push({
      month: s.month,
      kind: "project",
      province: project.province,
      title: bi(
        `${project.name}: completion reward (${region.name})`,
        `${project.name}: bonus selesai (${region.nameId})`,
      ),
      detail: bi(
        `Applied once in every province of ${region.name}: ${rewardText("en")}.`,
        `Diberikan sekali di setiap provinsi di ${region.nameId}: ${rewardText("id")}.`,
      ),
    });
  }
  for (const runtime of game.policies) {
    const def = policyById[runtime.id];
    const projects = projectsOf(game, def.id);
    if (
      def.kind !== "build" ||
      runtime.finished ||
      !projects.length ||
      projects.some((project) => !project.completed)
    )
      continue;
    // A finished build stops billing and frees its policy slot for good.
    runtime.active = false;
    runtime.finished = true;
    s.events.push({
      month: s.month,
      kind: "project",
      title: bi(
        `${def.name} completed`,
        `${def.name} selesai`,
      ),
      detail: bi(
        "All regional construction is finished. Its gains are permanent and the policy has ended.",
        "Seluruh pembangunan wilayah selesai. Manfaatnya permanen dan kebijakan telah berakhir.",
      ),
    });
  }
  for (const crisis of s.crises) {
    if (crisis.resolved) continue;
    crisis.age++;
    const p = s.provinces.find((p) => p.id === crisis.province)!;
    const response = inputs.get(p.id)!;
    // Completed builds keep helping: their permanent gains add standing resilience.
    const built = (key: BuiltGainKey) => 0.1 * Math.max(0, p.builtGains[key] ?? 0);
    const resilience =
      crisis.kind === "harvest"
        ? channel(response, "irrigation") +
          channel(response, "foodStorage") +
          built("water") +
          built("industry:agriculture")
        : crisis.kind === "flood"
          ? channel(response, "transport") +
            channel(response, "water") +
            built("infrastructure") +
            built("water")
          : channel(response, "healthAccess") +
            channel(response, "nutrition") +
            built("healthAccess");
    const recovery =
      (0.022 + 0.0001 * p.health + 0.018 * Math.sqrt(Math.max(0, resilience))) *
      ledger.funding;
    crisis.damage = Math.max(0, crisis.damage - recovery);
    crisis.months = Math.max(
      0,
      Math.ceil(crisis.damage / Math.max(0.001, recovery)),
    );
    crisis.stage =
      crisis.damage < crisis.initialDamage * 0.6 ? "recovery" : "active";
    crisis.resolved = crisis.damage <= 0.001;
  }
  const deficit = ledger.spending + ledger.interest - ledger.revenue;
  const cashUsed = Math.min(before.cash, Math.max(0, deficit));
  ledger.borrowing = Math.max(0, deficit - cashUsed);
  ledger.repayment = Math.min(before.debt, Math.max(0, -deficit));
  s.cash = before.cash - cashUsed + Math.max(0, -deficit - ledger.repayment);
  s.debt = before.debt + ledger.borrowing - ledger.repayment;
  ledger.cashChange = s.cash - before.cash;
  ledger.residual =
    ledger.revenue +
    ledger.borrowing -
    ledger.repayment -
    ledger.spending -
    ledger.interest -
    ledger.cashChange;
  s.ledger = ledger;
  s.month++;
  s.priceIndex *= Math.pow(1 + aggregate(s).inflation / 100, 1 / 12);
  s.history.push(aggregate(s));
}

function addLedgers(target: Ledger, source: Ledger) {
  for (const k of [
    "nonTaxRevenue",
    "revenue",
    "spending",
    "interest",
    "borrowing",
    "repayment",
    "cashChange",
    "residual",
    "requested",
  ] as const)
    target[k] += source[k];
  for (const id of TAX_IDS) target.taxes[id] += source.taxes[id];
  for (const id of POLICY_IDS)
    if (source.policySpending[id])
      target.policySpending[id] =
        (target.policySpending[id] ?? 0) + source.policySpending[id]!;
  target.funding = target.requested ? target.spending / target.requested : 1;
}

function executeQuarter(
  original: QuarterGame,
  plan: QuarterPlan,
  calm: boolean,
): QuarterGame {
  const errors = validatePlan(original, plan);
  if (errors.length) throw new Error(errors.join(" "));
  const game = clone(original),
    s = game.simulation,
    before = original.receipt ? clone(original.receipt.after) : aggregate(game),
    regionsBefore = original.receipt
      ? clone(original.receipt.regionsAfter)
      : summarizeEconomyRegions(game),
    eventStart = s.events.length;
  if (!original.receipt) {
    for (const key of [
      "taxRevenue",
      "revenue",
      "spending",
      "interest",
      "balance",
    ] as const)
      before[key] *= 3;
    for (const region of regionsBefore)
      for (const id of TAX_IDS) region.taxes[id] *= 3;
  }
  game.taxes = { ...plan.taxes };
  game.regionalSpending = clone(plan.regionalSpending);
  for (const runtime of game.policies)
    runtime.active = plan.policies.includes(runtime.id);
  for (const id of plan.policies) {
    let runtime = game.policies.find((p) => p.id === id);
    if (!runtime) {
      runtime = {
        id,
        active: true,
        started: s.month,
        fundedMonths: 0,
        delivery: Object.fromEntries(REGION_IDS.map((r) => [r, 0])) as Record<
          RegionId,
          number
        >,
        startupRemaining: policyById[id].setupCost,
      };
      game.policies.push(runtime);
      s.events.push({
        month: s.month,
        kind: "policy",
        title: bi(
          `${policyById[id].name} launched`,
          `${policyById[id].name} dimulai`,
        ),
        detail: bi(
          "The fixed national budget follows this policy's regional allocation.",
          "Anggaran nasional tetap mengikuti alokasi daerah kebijakan ini.",
        ),
      });
      const def = policyById[id];
      if (def.kind !== "program")
        for (const allocation of regionShares(game, plan, id)) {
          if (allocation.share <= 0) continue;
          const r = GAME_REGIONS.find((r) => r.id === allocation.region)!;
          const members = s.provinces
            .filter((p) => r.provinceIds.includes(p.id))
            .sort((a, b) => b.population - a.population);
          s.projects.push({
            id: `${id}:${r.id}`,
            province: members[0].id,
            name: def.name,
            cost: def.build!.cost * allocation.share * s.priceIndex,
            spent: 0,
            progress: 0,
            duration: def.build!.months,
            completed: false,
            paused: false,
            completionRewardGranted: false,
          });
        }
    }
    runtime.active = true;
  }
  const ledger = emptyLedger(),
    appropriationPrice = s.priceIndex;
  const regionalFlows = new Map(
    REGION_IDS.map((id) => [
      id,
      { taxes: zeroTaxes(), spending: {} as Partial<Record<PolicyId, number>> },
    ]),
  );
  for (let i = 0; i < 3; i++) {
    advanceMonth(game, calm, appropriationPrice);
    addLedgers(ledger, s.ledger);
    for (const region of summarizeEconomyRegions(game)) {
      const flow = regionalFlows.get(region.id)!;
      for (const id of TAX_IDS) flow.taxes[id] += region.taxes[id];
      for (const id of POLICY_IDS)
        if (region.policySpending[id])
          flow.spending[id] =
            (flow.spending[id] ?? 0) + region.policySpending[id]!;
    }
  }
  const after = aggregate(game);
  // Report the actual quarter totals while history and simulation retain monthly ledgers.
  after.taxRevenue = sum(Object.values(ledger.taxes));
  after.revenue = ledger.revenue;
  after.spending = ledger.spending;
  after.interest = ledger.interest;
  after.balance = ledger.revenue - ledger.spending - ledger.interest;
  const regionsAfter = summarizeEconomyRegions(game);
  for (const region of regionsAfter) {
    const flow = regionalFlows.get(region.id)!;
    region.taxes = flow.taxes;
    region.policySpending = flow.spending;
  }
  if (ledger.funding < 0.999)
    s.events.push({
      month: s.month,
      kind: "economy",
      title: bi(
        "Funding constrained delivery",
        "Pendanaan membatasi pelaksanaan",
      ),
      detail: bi(
        `${(ledger.funding * 100).toFixed(0)}% of this quarter's requested spending was funded. Service delivery and construction slowed.`,
        `${(ledger.funding * 100).toFixed(0)}% belanja yang diminta triwulan ini didanai. Pelaksanaan layanan dan pembangunan melambat.`,
      ),
    });
  const foundationGains = FOUNDATIONS.map((key) => ({
    key,
    change: after[key] - before[key],
  })).sort((a, b) => b.change - a.change);
  if (foundationGains[0].change > 0.2) {
    const gain = foundationGains[0],
      name = foundationNames[gain.key];
    s.events.push({
      month: s.month,
      kind: "economy",
      title: bi(`${name.en} improves`, `${name.id} membaik`),
      detail: bi(
        `${name.en} rose ${gain.change.toFixed(1)} points this quarter. ${gain.key === "education" ? "School access and quality improve before new workforce skills reach industry." : "Industry responds gradually as usable services improve."}`,
        `${name.id} naik ${gain.change.toFixed(1).replace(".", ",")} poin triwulan ini. ${gain.key === "education" ? "Akses dan kualitas sekolah membaik sebelum keterampilan tenaga kerja baru mencapai industri." : "Industri merespons bertahap saat layanan yang dapat digunakan membaik."}`,
      ),
    });
  }
  const movements = industries
    .filter((d) => d.id !== "publicServices")
    .map((def) => ({
      def,
      change:
        sum(regionsAfter.map((r) => r.industries[def.id].output)) /
          sum(regionsBefore.map((r) => r.industries[def.id].output)) -
        1,
    }))
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  if (Math.abs(movements[0].change) > 0.005) {
    const { def, change } = movements[0],
      main = [...regionsAfter].sort(
        (a, b) => b.industries[def.id].output - a.industries[def.id].output,
      )[0],
      constraint = foundationNames[main.industries[def.id].bottleneck];
    s.events.push({
      month: s.month,
      kind: "economy",
      title: bi(
        `${def.name.en} ${change >= 0 ? "expands" : "contracts"}`,
        `${def.name.id} ${change >= 0 ? "berkembang" : "menyusut"}`,
      ),
      detail: bi(
        `Output changed ${(change * 100).toFixed(1)}% this quarter. In ${main.name}, ${constraint.en.toLowerCase()} remains this industry's main foundation constraint.`,
        `Hasil berubah ${(change * 100).toFixed(1).replace(".", ",")}% triwulan ini. Di ${main.nameId}, ${constraint.id.toLowerCase()} tetap menjadi kendala fondasi utama industri ini.`,
      ),
    });
  }
  if (s.events.length === eventStart)
    s.events.push({
      month: s.month,
      kind: "economy",
      title: bi("Quarterly finances settled", "Keuangan triwulan diselesaikan"),
      detail: bi(
        `Revenue was Rp ${ledger.revenue.toFixed(1)}T, with Rp ${(ledger.spending + ledger.interest).toFixed(1)}T in spending and interest.`,
        `Penerimaan Rp ${ledger.revenue.toFixed(1).replace(".", ",")}T, dengan belanja dan bunga Rp ${(ledger.spending + ledger.interest).toFixed(1).replace(".", ",")}T.`,
      ),
    });
  game.receipt = {
    from: original.simulation.month,
    to: s.month,
    before,
    after,
    ledger,
    regionsBefore,
    regionsAfter,
    events: s.events.slice(eventStart),
  };
  return game;
}

export function resolveQuarter(
  game: QuarterGame,
  plan: QuarterPlan,
  options: { calm?: boolean; attribution?: boolean } = {},
): QuarterGame {
  const result = executeQuarter(game, plan, options.calm ?? false);
  if (options.attribution !== false) {
    const unchanged = executeQuarter(
      game,
      basePlan(game),
      options.calm ?? false,
    );
    const selected = result.receipt!.after,
      reference = unchanged.receipt!.after,
      prior = result.receipt!.before;
    const decisions: Partial<Metrics> = {},
      world: Partial<Metrics> = {};
    for (const key of Object.keys(selected) as (keyof Metrics)[]) {
      decisions[key] = selected[key] - reference[key];
      world[key] = reference[key] - prior[key];
    }
    result.receipt!.effects = { decisions, world };
  }
  return result;
}

export const previewQuarter = (game: QuarterGame, plan: QuarterPlan) =>
  resolveQuarter(game, plan, { calm: true, attribution: true });
