import { z } from "zod";
import baseline from "../../data/baseline.json" with { type: "json" };
import { TAX_IDS, TAX_LEVELS } from "../taxes";
import { aggregate, summarizeEconomyRegions } from "./engine";
import { policyById } from "./catalog";
import {
  FOUNDATIONS,
  INDUSTRY_IDS,
  POLICY_IDS,
  REGION_IDS,
  SPENDING_LEVELS,
  type Ledger,
  type Metrics,
  type QuarterGame,
  type QuarterPlan,
} from "./types";

export const ECONOMY_DATABASE = "indonesia-economy-v8";
export const AUTOSAVE_KEY = "autosave-v8";
export const DRAFT_KEY = "draft-v8";
const MAX_SAVE_BYTES = 8_000_000;
const finite = z.number().finite();
const positive = finite.positive();
const nonnegative = finite.nonnegative();
const score = finite.min(0).max(100);
const ratio = finite.min(0).max(1);
const month = finite.int().min(0).max(60);
const quarterMonth = month.refine((value) => value % 3 === 0);
const policyId = z.enum(POLICY_IDS);
const regionId = z.enum(REGION_IDS);
const provinceIds = baseline.provinces.map((province) => province.id);
const provinceId = z.string().refine((value) => provinceIds.includes(value));
const text = z.string().max(5000);
const bilingual = z.object({ en: text, id: text }).strict();

function exactRecord<K extends string, T extends z.ZodTypeAny>(
  keys: readonly K[],
  value: T,
) {
  return z
    .object(
      Object.fromEntries(keys.map((key) => [key, value])) as { [P in K]: T },
    )
    .strict();
}

const foundations = exactRecord(FOUNDATIONS, score);
const taxes = exactRecord(TAX_IDS, z.enum(TAX_LEVELS));
const taxAmounts = exactRecord(TAX_IDS, nonnegative);
const regionalSpending = exactRecord(
  POLICY_IDS,
  exactRecord(REGION_IDS, z.enum(SPENDING_LEVELS)),
);
const policySpending = exactRecord(POLICY_IDS, nonnegative).partial();
export const planSchema = z
  .object({
    policies: z
      .array(policyId)
      .max(8)
      .refine((ids) => new Set(ids).size === ids.length),
    taxes,
    regionalSpending,
  })
  .strict();

const industry = z
  .object({
    output: nonnegative,
    initialOutput: nonnegative,
    capacity: nonnegative,
    initialReadiness: nonnegative,
    readiness: nonnegative,
    productivity: positive,
    jobs: nonnegative,
    laborIncome: nonnegative,
    profits: nonnegative,
    investment: nonnegative,
    growth: finite,
    bottleneck: z.enum(FOUNDATIONS),
  })
  .strict();
const industries = exactRecord(INDUSTRY_IDS, industry);
const province = z
  .object({
    id: provinceId,
    name: z.string().min(1).max(100),
    population: positive,
    gdp: nonnegative,
    growth: finite,
    poverty: score,
    unemployment: score,
    infrastructure: score,
    health: score,
    education: score,
    energy: score,
    foodSecurity: score,
    development: score,
    foodProduction: nonnegative,
    foodNeed: nonnegative,
    reliability: score,
    electrification: score,
    initialGdp: positive,
    initialPoverty: score,
    initialUnemployment: score,
    initialFoundations: foundations,
    initialFoodProduction: nonnegative,
    laborForce: nonnegative,
    urban: ratio,
    schoolAccess: score,
    schoolQuality: score,
    skills: score,
    initialSkills: score,
    water: score,
    healthAccess: score,
    healthStatus: score,
    powerCapacity: nonnegative,
    powerDemand: nonnegative,
    powerPipeline: nonnegative,
    foodReceived: nonnegative,
    foodImported: nonnegative,
    foodUnmet: nonnegative,
    inflation: finite,
    realIncome: nonnegative,
    consumption: nonnegative,
    disposableIncome: nonnegative,
    collection: finite.min(0).max(1.18),
    industries,
    taxBases: taxAmounts,
    taxes: taxAmounts,
    policySpending,
    policyAssets: policySpending,
    builtGains: z
      .record(
        z.union([
          z.enum([
            "infrastructure",
            "water",
            "healthAccess",
            "healthStatus",
            "electrification",
          ]),
          z.enum(INDUSTRY_IDS.map((id) => `industry:${id}`) as [
            `industry:${(typeof INDUSTRY_IDS)[number]}`,
            ...`industry:${(typeof INDUSTRY_IDS)[number]}`[],
          ]),
        ]),
        finite.min(-100).max(100),
      ),
    drivers: z.array(z.string().max(500)).max(100),
  })
  .strict();
const project = z
  .object({
    id: z.string().min(1).max(160),
    province: provinceId,
    name: z.string().min(1).max(200),
    cost: nonnegative,
    spent: nonnegative,
    progress: finite.min(0).max(100 + 1e-6),
    duration: finite.int().positive().max(120),
    completed: z.boolean(),
    paused: z.boolean(),
    completionRewardGranted: z.boolean().optional(),
  })
  .strict();
const crisis = z
  .object({
    id: z.string().min(1).max(160),
    title: text,
    description: text,
    province: provinceId,
    months: finite.int().min(0).max(120),
    severity: score,
    response: z.literal("relief"),
    resolved: z.boolean(),
    kind: z.enum(["flood", "harvest", "earthquake", "haze", "outbreak"]),
    stage: z.enum(["warning", "active", "recovery"]),
    damage: nonnegative,
    initialDamage: nonnegative,
    age: month,
  })
  .strict();
const event = z
  .object({
    month,
    kind: z.enum(["policy", "economy", "crisis", "project"]),
    title: bilingual,
    detail: bilingual,
    province: provinceId.optional(),
  })
  .strict();
const ledger = z
  .object({
    taxes: taxAmounts,
    nonTaxRevenue: nonnegative,
    revenue: nonnegative,
    spending: nonnegative,
    interest: nonnegative,
    borrowing: nonnegative,
    repayment: nonnegative,
    cashChange: finite,
    residual: finite,
    requested: nonnegative,
    funding: ratio,
    policySpending,
  })
  .strict();
const metric = z
  .object({
    month,
    priceIndex: positive,
    population: positive,
    gdp: nonnegative,
    growth: finite,
    poverty: score,
    unemployment: score,
    inflation: finite,
    education: score,
    infrastructure: score,
    energy: score,
    food: score,
    health: score,
    development: score,
    inequality: nonnegative,
    realIncome: nonnegative,
    jobs: nonnegative,
    debt: nonnegative,
    cash: nonnegative,
    taxRevenue: nonnegative,
    revenue: nonnegative,
    spending: nonnegative,
    interest: nonnegative,
    balance: finite,
  })
  .strict();
const metricDeltas = exactRecord(
  Object.keys(metric.shape) as (keyof Metrics)[],
  finite,
).partial();
const region = z
  .object({
    id: regionId,
    name: z.string().min(1).max(100),
    nameId: z.string().min(1).max(100),
    population: positive,
    gdp: nonnegative,
    growth: finite,
    poverty: score,
    unemployment: score,
    realIncome: nonnegative,
    jobs: nonnegative,
    foundations,
    industries,
    taxes: taxAmounts,
    policySpending,
  })
  .strict();
const regions = z
  .array(region)
  .length(REGION_IDS.length)
  .refine(
    (entries) =>
      new Set(entries.map((entry) => entry.id)).size === REGION_IDS.length,
  );
const receipt = z
  .object({
    from: quarterMonth,
    to: quarterMonth,
    before: metric,
    after: metric,
    ledger,
    regionsBefore: regions,
    regionsAfter: regions,
    events: z.array(event).max(1000),
    effects: z
      .object({ decisions: metricDeltas, world: metricDeltas })
      .strict()
      .optional(),
  })
  .strict();
const stateSchema = z
  .object({
    version: z.literal(8),
    simulation: z
      .object({
        month: quarterMonth,
        seed: finite.int().min(0).max(0xffffffff),
        rng: finite.int().min(0).max(0xffffffff),
        priceIndex: positive,
        provinces: z.array(province).length(provinceIds.length),
        debt: nonnegative,
        cash: nonnegative,
        projects: z.array(project).max(2000),
        crises: z.array(crisis).max(1000),
        events: z.array(event).max(10000),
        history: z.array(metric).min(1).max(61),
        ledger,
      })
      .strict(),
    policies: z
      .array(
        z
          .object({
            id: policyId,
            active: z.boolean(),
            started: quarterMonth,
            fundedMonths: nonnegative.max(60),
            delivery: exactRecord(REGION_IDS, finite.min(0).max(3)),
            startupRemaining: nonnegative,
            finished: z.boolean().optional(),
          })
          .strict(),
      )
      .max(POLICY_IDS.length),
    taxes,
    regionalSpending,
    receipt: receipt.nullable(),
  })
  .strict();
const envelopeSchema = z
  .object({
    schemaVersion: z.literal(8),
    modelVersion: z.literal("8.0.0"),
    datasetVersion: z.literal("2024.3"),
    state: stateSchema,
  })
  .strict();

export function quarterEnvelope(state: QuarterGame) {
  return {
    schemaVersion: 8 as const,
    modelVersion: "8.0.0" as const,
    datasetVersion: "2024.3" as const,
    state,
  };
}

const close = (a: number, b: number) =>
  Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
const sum = (values: number[]) =>
  values.reduce((total, value) => total + value, 0);
function requireValid(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function validateLedger(value: Ledger) {
  requireValid(
    close(
      value.revenue,
      sum(Object.values(value.taxes)) + value.nonTaxRevenue,
    ) &&
      close(
        value.revenue +
          value.borrowing -
          value.spending -
          value.interest -
          value.repayment,
        value.cashChange,
      ) &&
      Math.abs(value.residual) <= 1e-6 &&
      sum(Object.values(value.policySpending)) <= value.spending + 1e-6 &&
      value.spending <= value.requested + 1e-6 &&
      close(value.spending, value.requested * value.funding),
    "The save's fiscal ledger does not reconcile.",
  );
}

function validateGame(game: QuarterGame) {
  const state = game.simulation;
  requireValid(
    new Set(state.provinces.map((value) => value.id)).size ===
      provinceIds.length,
    "The save must contain all 38 provinces exactly once.",
  );
  requireValid(
    new Set(game.policies.map((value) => value.id)).size ===
      game.policies.length &&
      game.policies.filter((value) => value.active).length <= 8,
    "The save has an invalid policy portfolio.",
  );
  requireValid(
    game.policies.every(
      (value) =>
        value.started <= state.month &&
        value.fundedMonths <= state.month - value.started + 1e-6 &&
        value.startupRemaining <= policyById[value.id].setupCost + 1e-6,
    ),
    "Policy progress exceeds the campaign date or startup budget.",
  );
  requireValid(
    state.events.every((value) => value.month <= state.month),
    "The save contains events from a future month.",
  );
  requireValid(
    new Set(state.projects.map((value) => value.id)).size ===
      state.projects.length &&
      state.projects.every(
        (value) =>
          value.spent <= value.cost + 1e-6 &&
          (!value.completed || close(value.progress, 100)) &&
          (!value.completionRewardGranted || value.completed),
      ),
    "The save has invalid construction progress.",
  );
  requireValid(
    new Set(state.crises.map((value) => value.id)).size === state.crises.length,
    "The save contains duplicate crises.",
  );
  for (const value of state.provinces) {
    requireValid(
      close(
        value.gdp,
        sum(Object.values(value.industries).map((sector) => sector.output)),
      ),
      "Provincial output does not reconcile with industries.",
    );
    requireValid(
      sum(Object.values(value.industries).map((sector) => sector.jobs)) <=
        value.laborForce + 1e-6 && value.laborForce <= value.population + 1e-6,
      "Provincial employment exceeds the available workforce.",
    );
    requireValid(
      value.industries.publicServices.profits === 0,
      "Public services cannot earn taxable corporate profits.",
    );
  }
  validateLedger(state.ledger);
  for (const id of TAX_IDS)
    requireValid(
      close(
        state.ledger.taxes[id],
        sum(state.provinces.map((value) => value.taxes[id])),
      ),
      "Provincial taxes do not reconcile with the fiscal ledger.",
    );
  for (const id of POLICY_IDS)
    requireValid(
      close(
        state.ledger.policySpending[id] ?? 0,
        sum(state.provinces.map((value) => value.policySpending[id] ?? 0)),
      ),
      "Provincial policy spending does not reconcile with the fiscal ledger.",
    );
  requireValid(
    state.history.length === state.month + 1 &&
      state.history.every((value, index) => value.month === index),
    "The save's history does not match the campaign date.",
  );
  const latest = state.history.at(-1)!;
  const current = aggregate(game);
  requireValid(
    (Object.keys(current) as (keyof Metrics)[]).every((key) =>
      close(latest[key], current[key]),
    ),
    "The latest history does not match the saved economy.",
  );
  const report = game.receipt;
  requireValid(
    state.month === 0
      ? report === null
      : report !== null &&
          report.to === state.month &&
          report.from === state.month - 3,
    "The quarter report does not match the campaign date.",
  );
  if (report) {
    validateLedger(report.ledger);
    requireValid(
      report.before.month === report.from &&
        report.after.month === report.to &&
        report.events.every(
          (value) => value.month >= report.from && value.month <= report.to,
        ),
      "The quarter report contains invalid dates.",
    );
    requireValid(
      close(report.before.cash + report.ledger.cashChange, report.after.cash) &&
        close(
          report.before.debt +
            report.ledger.borrowing -
            report.ledger.repayment,
          report.after.debt,
        ),
      "The quarter report's cash and debt do not reconcile.",
    );
    requireValid(
      close(report.after.gdp, latest.gdp) &&
        close(report.after.cash, state.cash) &&
        close(report.after.debt, state.debt),
      "The quarter report does not match the saved economy.",
    );
    const previous = { ...state.history[report.from] };
    for (const key of [
      "taxRevenue",
      "revenue",
      "spending",
      "interest",
      "balance",
    ] as const)
      previous[key] =
        report.from === 0
          ? previous[key] * 3
          : sum(
              state.history
                .slice(report.from - 2, report.from + 1)
                .map((value) => value[key]),
            );
    requireValid(
      (Object.keys(previous) as (keyof Metrics)[]).every((key) =>
        close(previous[key], report.before[key]),
      ),
      "The quarter report's opening snapshot does not match history.",
    );
    for (const key of ["revenue", "spending", "interest"] as const)
      requireValid(
        close(
          report.ledger[key],
          sum(state.history.slice(-3).map((value) => value[key])),
        ) && close(report.after[key], report.ledger[key]),
        "The quarter report does not sum its three monthly ledgers.",
      );
    requireValid(
      close(report.after.taxRevenue, sum(Object.values(report.ledger.taxes))) &&
        close(
          report.after.balance,
          report.ledger.revenue -
            report.ledger.spending -
            report.ledger.interest,
        ),
      "The quarter report's fiscal metrics do not reconcile.",
    );
    for (const [entries, metrics] of [
      [report.regionsBefore, report.before],
      [report.regionsAfter, report.after],
    ] as const) {
      requireValid(
        close(sum(entries.map((value) => value.gdp)), metrics.gdp) &&
          close(
            sum(entries.map((value) => value.population)),
            metrics.population,
          ),
        "Regional report totals do not reconcile.",
      );
      for (const entry of entries)
        requireValid(
          close(
            entry.gdp,
            sum(Object.values(entry.industries).map((value) => value.output)),
          ),
          "Regional industry totals do not reconcile.",
        );
    }
    const currentRegions = summarizeEconomyRegions(game);
    for (const entry of report.regionsAfter) {
      const expected = currentRegions.find((value) => value.id === entry.id)!;
      for (const key of [
        "population",
        "gdp",
        "growth",
        "poverty",
        "unemployment",
        "realIncome",
        "jobs",
      ] as const)
        requireValid(
          close(entry[key], expected[key]),
          "Regional report does not match the saved provinces.",
        );
      for (const key of FOUNDATIONS)
        requireValid(
          close(entry.foundations[key], expected.foundations[key]),
          "Regional foundations do not match the saved provinces.",
        );
    }
    for (const key of TAX_IDS)
      requireValid(
        close(
          sum(report.regionsAfter.map((value) => value.taxes[key])),
          report.ledger.taxes[key],
        ),
        "Regional taxes do not reconcile with the quarter ledger.",
      );
    for (const key of POLICY_IDS)
      requireValid(
        close(
          sum(
            report.regionsAfter.map((value) => value.policySpending[key] ?? 0),
          ),
          report.ledger.policySpending[key] ?? 0,
        ),
        "Regional spending does not reconcile with the quarter ledger.",
      );
  }
}

export function parseQuarter(raw: string): QuarterGame {
  if (raw.length > MAX_SAVE_BYTES)
    throw new Error("Save exceeds the 8 MB limit.");
  let incoming: unknown;
  try {
    incoming = JSON.parse(raw);
  } catch {
    throw new Error("This file is not valid JSON.");
  }
  const parsed = envelopeSchema.safeParse(incoming);
  if (!parsed.success)
    throw new Error(
      "This is not a valid version-8 economy save. Older campaigns are not supported.",
      { cause: parsed.error.issues },
    );
  const game = parsed.data.state as QuarterGame;
  validateGame(game);
  for (const project of game.simulation.projects) {
    if (Math.abs(project.progress - 100) <= 1e-10) {
      project.progress = 100;
      project.completed = true;
      project.paused = false;
    }
  }
  return game;
}

const stableIdentity = (game: QuarterGame) =>
  JSON.stringify(quarterEnvelope(game), (_key, value) =>
    value && typeof value === "object" && !Array.isArray(value)
      ? Object.fromEntries(
          Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
        )
      : value,
  );

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(ECONOMY_DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("saves");
    request.onsuccess = () => resolve(request.result);
    request.onerror = request.onblocked = () =>
      reject(
        new Error(
          "Browser storage is unavailable. Export your game to keep a copy.",
        ),
      );
  });
}

async function read(key: string): Promise<unknown> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("saves", "readonly");
    const request = transaction.objectStore("saves").get(key);
    transaction.oncomplete = () => {
      db.close();
      resolve(request.result);
    };
    transaction.onerror = transaction.onabort = () => {
      db.close();
      reject(new Error("Could not read browser storage."));
    };
  });
}

async function write(
  operation: (store: IDBObjectStore) => void,
  message: string,
): Promise<void> {
  const db = await database();
  return new Promise((resolve, reject) => {
    let transaction: IDBTransaction;
    try {
      transaction = db.transaction("saves", "readwrite");
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = transaction.onabort = () => {
        db.close();
        reject(new Error(message));
      };
      operation(transaction.objectStore("saves"));
    } catch {
      if (transaction!) transaction.abort();
      db.close();
      reject(new Error(message));
    }
  });
}

export async function loadQuarter(): Promise<QuarterGame | null> {
  const raw = await read(AUTOSAVE_KEY);
  return raw === undefined ? null : parseQuarter(JSON.stringify(raw));
}

export async function saveQuarter(game: QuarterGame): Promise<void> {
  const validated = parseQuarter(JSON.stringify(quarterEnvelope(game)));
  await write((store) => {
    store.put(quarterEnvelope(validated), AUTOSAVE_KEY);
    store.delete(DRAFT_KEY);
  }, "Game not saved. Export your game to keep a copy.");
}

function parsePlan(game: QuarterGame, input: unknown): QuarterPlan {
  const parsed = planSchema.safeParse(input);
  if (!parsed.success)
    throw new Error(
      "The saved plan is invalid; the completed quarter is safe.",
    );
  const active = new Set(
    game.policies.filter((value) => value.active).map((value) => value.id),
  );
  if (parsed.data.policies.filter((id) => !active.has(id)).length > 2)
    throw new Error("The saved plan launches more than two policies.");
  return parsed.data;
}

export async function saveQuarterPlan(
  game: QuarterGame,
  plan: QuarterPlan,
): Promise<void> {
  const validated = parsePlan(game, plan);
  await write((store) => {
    store.put({ identity: stableIdentity(game), plan: validated }, DRAFT_KEY);
  }, "Your plan has not been saved.");
}

export async function loadQuarterPlan(
  game: QuarterGame,
): Promise<QuarterPlan | null> {
  const raw = await read(DRAFT_KEY);
  if (raw === undefined) return null;
  const parsed = z
    .object({ identity: z.string().max(MAX_SAVE_BYTES), plan: z.unknown() })
    .strict()
    .safeParse(raw);
  if (!parsed.success)
    throw new Error(
      "The saved plan is invalid; the completed quarter is safe.",
    );
  if (parsed.data.identity !== stableIdentity(game)) {
    try {
      if (
        stableIdentity(parseQuarter(parsed.data.identity)) !==
        stableIdentity(game)
      )
        return null;
    } catch {
      return null;
    }
  }
  return parsePlan(game, parsed.data.plan);
}

export async function clearQuarterPlan(): Promise<void> {
  await write((store) => {
    store.delete(DRAFT_KEY);
  }, "Your plan could not be reset in browser storage.");
}

export const DEBRIEF_KEY = "debrief-v8";
/** Ties a stored quarter opening to the completed quarter it led to. */
const debriefIdentity = (game: QuarterGame) =>
  game.receipt
    ? [
        game.simulation.seed,
        game.simulation.month,
        game.receipt.after.gdp,
        game.receipt.after.debt,
      ].join("|")
    : "";

/** Keeps the quarter opening so the summary can replay after a reload. */
export async function saveQuarterDebrief(
  before: QuarterGame,
  after: QuarterGame,
): Promise<void> {
  await write((store) => {
    store.put(
      {
        identity: debriefIdentity(after),
        month: before.simulation.month,
        provinces: before.simulation.provinces,
        projects: before.simulation.projects,
        crises: before.simulation.crises,
        policies: before.policies,
        taxes: before.taxes,
        regionalSpending: before.regionalSpending,
      },
      DEBRIEF_KEY,
    );
  }, "The quarter summary was not saved.");
}

/** Rebuilds the quarter opening, or null when none matches this game. */
export async function loadQuarterDebrief(
  game: QuarterGame,
): Promise<QuarterGame | null> {
  if (!game.receipt) return null;
  const parsed = z
    .object({
      identity: z.string(),
      month: quarterMonth,
      provinces: z.array(z.object({ id: provinceId }).passthrough()),
      projects: z.array(z.object({ id: z.string() }).passthrough()),
      crises: z.array(z.object({ id: z.string() }).passthrough()),
      policies: z.array(z.object({ id: policyId }).passthrough()),
      taxes,
      regionalSpending,
    })
    .safeParse(await read(DEBRIEF_KEY));
  if (
    !parsed.success ||
    parsed.data.identity !== debriefIdentity(game) ||
    parsed.data.month !== game.receipt.from ||
    parsed.data.provinces.length !== game.simulation.provinces.length
  )
    return null;
  const saved = parsed.data as unknown as {
    month: number;
    provinces: QuarterGame["simulation"]["provinces"];
    projects: QuarterGame["simulation"]["projects"];
    crises: QuarterGame["simulation"]["crises"];
    policies: QuarterGame["policies"];
    taxes: QuarterGame["taxes"];
    regionalSpending: QuarterGame["regionalSpending"];
  };
  return {
    ...game,
    policies: saved.policies,
    taxes: saved.taxes,
    regionalSpending: saved.regionalSpending,
    receipt: null,
    simulation: {
      ...game.simulation,
      month: saved.month,
      provinces: saved.provinces,
      projects: saved.projects,
      crises: saved.crises,
    },
  };
}
