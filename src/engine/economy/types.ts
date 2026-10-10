import type { Province, Project, Crisis } from "../../worldTypes";
import type { TaxSettings, TaxId } from "../taxes";
import type { PoliticsState } from "../politics";

export const FOUNDATIONS = [
  "education",
  "infrastructure",
  "energy",
  "food",
  "health",
] as const;
export type Foundation = (typeof FOUNDATIONS)[number];
export type FoundationScores = Record<Foundation, number>;
export const INDUSTRY_IDS = [
  "agriculture",
  "palmOil",
  "fishing",
  "mining",
  "manufacturing",
  "construction",
  "logistics",
  "retail",
  "tourism",
  "finance",
  "technology",
  "services",
  "publicServices",
] as const;
export type IndustryId = (typeof INDUSTRY_IDS)[number];
export const POLICY_IDS = [
  "mbg",
  "kopdes",
  "ckg",
  "bpn",
  "pkh",
  "bos",
  "kur",
  "jkn",
  "jalan-desa",
  "embung-desa",
  "pasar-desa",
  "tol-laut",
  "prakerja",
  "brt",
  "krl",
  "mrt-lrt",
  "kereta-antarkota",
  "pupuk",
  "klinik",
  "sarjana",
  "plts",
  "plta",
  "pltp",
  "pltu",
  "teachers",
  "water",
  "irrigation",
  "broadband",
  "cold-chain",
  "palm-replanting",
  "mining-rehabilitation",
  "tourism-access",
  "food-reserves",
] as const;
export type PolicyId = (typeof POLICY_IDS)[number];
export const REGION_IDS = [
  "sumatra",
  "java",
  "bali",
  "kalimantan",
  "sulawesi",
  "ntb",
  "ntt",
  "maluku",
  "papua",
] as const;
export type RegionId = (typeof REGION_IDS)[number];
export const SPENDING_LEVELS = ["low", "medium", "high"] as const;
export type RegionalSpendingLevel = (typeof SPENDING_LEVELS)[number];
export type RegionalSpending = Record<RegionId, RegionalSpendingLevel>;
export type Bilingual = { en: string; id: string };
export type PolicyChannel =
  | "schoolAccess"
  | "schoolQuality"
  | "training"
  | "university"
  | "transport"
  | "water"
  | "electricity"
  | "healthAccess"
  | "nutrition"
  | "farmInputs"
  | "irrigation"
  | "foodStorage"
  | "credit"
  | "collection"
  | "transfers"
  | "digital"
  | "coldChain"
  | "palmReplanting"
  | "miningCleanup"
  | "tourismAccess"
  | "constructionWork";
export type PolicyImpact = {
  target: Foundation | IndustryId;
  direction: "up" | "down";
  timing?: "delayed" | "initially" | "later";
};
export type PolicyConsequence = {
  label: Bilingual;
  direction: "up" | "down";
  kind: "downside" | "limited-benefit";
  qualifier: Bilingual;
};
/**
 * program: recurring spending whose effect stops when it stops.
 * build: one-time construction with a permanent completion reward; ends itself.
 * facility: builds facilities, then provides service only while active.
 */
export const POLICY_KINDS = ["program", "build", "facility"] as const;
export type PolicyKind = (typeof POLICY_KINDS)[number];
/** Temporary drag while a region's site is under construction. */
export type BuildDisruption = {
  target: IndustryId | "healthStatus";
  amount: number;
};
export type PolicyBuild = {
  /** Total construction cost at opening prices, split across eligible regions. */
  cost: number;
  months: number;
  disruption: BuildDisruption[];
};
export type PolicyDefinition = {
  id: PolicyId;
  kind: PolicyKind;
  build?: PolicyBuild;
  /** Share of the running cost charged while a facility sits idle. */
  idleUpkeepShare?: number;
  /** Regions that can host this build; all regions when omitted. */
  eligibleRegions?: RegionId[];
  name: string;
  category: Foundation | "economy";
  purpose: Bilingual;
  mechanism: Bilingual;
  tradeoff: Bilingual;
  consequences: PolicyConsequence[];
  quarterlyCost: number;
  setupCost: number;
  rolloutMonths: number;
  effects: Partial<Record<PolicyChannel, number>>;
  impacts: PolicyImpact[];
  source: string;
  adapted: boolean;
  /** Already funded inside inherited spending; choosing it expands the programme. */
  existing?: boolean;
  /** One short real-world fact shown beside the simplified game numbers. */
  reality: Bilingual;
};
export type IndustryDefinition = {
  id: IndustryId;
  name: Bilingual;
  weights: FoundationScores;
  essential: Foundation[];
  laborShare: number;
  importShare: number;
  exportShare: number;
};
export type IndustryState = {
  output: number;
  initialOutput: number;
  capacity: number;
  initialReadiness: number;
  readiness: number;
  productivity: number;
  jobs: number;
  laborIncome: number;
  profits: number;
  investment: number;
  growth: number;
  bottleneck: Foundation;
};
export type TaxBreakdown = Record<TaxId, number>;
export type ProvinceEconomy = Province & {
  initialGdp: number;
  initialPoverty: number;
  initialUnemployment: number;
  initialFoundations: FoundationScores;
  initialFoodProduction: number;
  laborForce: number;
  urban: number;
  schoolAccess: number;
  schoolQuality: number;
  skills: number;
  initialSkills: number;
  water: number;
  healthAccess: number;
  healthStatus: number;
  powerCapacity: number;
  powerDemand: number;
  powerPipeline: number;
  foodReceived: number;
  foodImported: number;
  foodUnmet: number;
  inflation: number;
  realIncome: number;
  consumption: number;
  disposableIncome: number;
  collection: number;
  industries: Record<IndustryId, IndustryState>;
  taxBases: TaxBreakdown;
  taxes: TaxBreakdown;
  policySpending: Partial<Record<PolicyId, number>>;
  policyAssets: Partial<Record<PolicyId, number>>;
  /** Permanent gains from completed builds, protected from baseline decay. */
  builtGains: Partial<Record<BuiltGainKey, number>>;
  drivers: string[];
};
export type BuiltGainKey =
  | "infrastructure"
  | "water"
  | "healthAccess"
  | "healthStatus"
  | "electrification"
  | `industry:${IndustryId}`;
export type PolicyRuntime = {
  id: PolicyId;
  active: boolean;
  started: number;
  fundedMonths: number;
  delivery: Record<RegionId, number>;
  startupRemaining: number;
  /** A one-time build whose construction has finished; it cannot relaunch. */
  finished?: boolean;
};
export type Ledger = {
  taxes: TaxBreakdown;
  nonTaxRevenue: number;
  revenue: number;
  spending: number;
  interest: number;
  borrowing: number;
  repayment: number;
  cashChange: number;
  residual: number;
  requested: number;
  funding: number;
  policySpending: Partial<Record<PolicyId, number>>;
};
export type Metrics = {
  month: number;
  priceIndex: number;
  population: number;
  gdp: number;
  growth: number;
  poverty: number;
  unemployment: number;
  inflation: number;
  education: number;
  infrastructure: number;
  energy: number;
  food: number;
  health: number;
  development: number;
  inequality: number;
  realIncome: number;
  jobs: number;
  debt: number;
  cash: number;
  taxRevenue: number;
  revenue: number;
  spending: number;
  interest: number;
  balance: number;
};
export type EconomyEvent = {
  month: number;
  kind: "policy" | "economy" | "crisis" | "project";
  title: Bilingual;
  detail: Bilingual;
  province?: string;
};
export type EconomyState = {
  month: number;
  seed: number;
  rng: number;
  priceIndex: number;
  provinces: ProvinceEconomy[];
  debt: number;
  cash: number;
  projects: Project[];
  crises: Crisis[];
  events: EconomyEvent[];
  history: Metrics[];
  ledger: Ledger;
};
export type RegionEconomy = {
  id: RegionId;
  name: string;
  nameId: string;
  population: number;
  gdp: number;
  growth: number;
  poverty: number;
  unemployment: number;
  realIncome: number;
  jobs: number;
  foundations: FoundationScores;
  industries: Record<IndustryId, IndustryState>;
  taxes: TaxBreakdown;
  policySpending: Partial<Record<PolicyId, number>>;
};
export type QuarterPlan = {
  policies: PolicyId[];
  taxes: TaxSettings;
  regionalSpending: Record<PolicyId, RegionalSpending>;
  /** Tax increases sent to the DPR in softened form. */
  soften?: TaxId[];
};
export type QuarterReceipt = {
  from: number;
  to: number;
  before: Metrics;
  after: Metrics;
  ledger: Ledger;
  regionsBefore: RegionEconomy[];
  regionsAfter: RegionEconomy[];
  events: EconomyEvent[];
  effects?: { decisions: Partial<Metrics>; world: Partial<Metrics> };
};
export type QuarterGame = {
  version: 8;
  simulation: EconomyState;
  policies: PolicyRuntime[];
  taxes: TaxSettings;
  regionalSpending: Record<PolicyId, RegionalSpending>;
  politics: PoliticsState;
  receipt: QuarterReceipt | null;
};
