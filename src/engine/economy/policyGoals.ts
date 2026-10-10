import type { Bilingual, PolicyId } from "./types";

export type GoalId =
  "income" | "poverty" | "jobs" | "services" | "energy" | "budget";

/** Short goal names for policy tags; the full names live in goals.ts. */
export const goalShortNames: Record<GoalId, Bilingual> = {
  income: { en: "Income", id: "Pendapatan" },
  poverty: { en: "Poverty", id: "Kemiskinan" },
  jobs: { en: "Jobs", id: "Lapangan kerja" },
  services: { en: "Foundations", id: "Fondasi" },
  energy: { en: "Power", id: "Listrik" },
  budget: { en: "Budget", id: "Anggaran" },
};

/**
 * The mandate goals each policy helps most within five years. Measured by
 * running each policy alone for 20 calm quarters and comparing the goal
 * values with doing nothing, scaled by each goal's target. Skills and some
 * village builds pay off slowly, so their single tag is their best effect.
 */
export const policyGoals: Record<PolicyId, GoalId[]> = {
  mbg: ["services", "poverty"],
  kopdes: ["jobs", "services"],
  ckg: ["services", "jobs"],
  bpn: ["budget"],
  pkh: ["poverty", "services"],
  bos: ["services"],
  kur: ["jobs"],
  jkn: ["services", "jobs"],
  "tol-laut": ["jobs", "services"],
  prakerja: ["jobs"],
  "jalan-desa": ["jobs", "services"],
  "embung-desa": ["jobs"],
  "pasar-desa": ["jobs"],
  brt: ["jobs", "services"],
  krl: ["jobs", "services"],
  "mrt-lrt": ["jobs", "services"],
  "kereta-antarkota": ["jobs", "poverty"],
  pupuk: ["jobs"],
  klinik: ["services", "jobs"],
  sarjana: ["services"],
  plts: ["energy", "services"],
  plta: ["energy", "services"],
  pltp: ["energy", "services"],
  pltu: ["energy", "services"],
  teachers: ["services"],
  water: ["jobs"],
  irrigation: ["jobs"],
  broadband: ["jobs"],
  "cold-chain": ["jobs"],
  "palm-replanting": ["jobs"],
  "mining-rehabilitation": ["services"],
  "tourism-access": ["jobs"],
  "food-reserves": ["services", "jobs"],
};

/**
 * Good first picks for a new player: together they cover every goal except
 * a second power build, which the energy prompt teaches later.
 */
export const starterPolicies: PolicyId[] = [
  "plts",
  "jalan-desa",
  "ckg",
  "bos",
  "pkh",
  "kur",
];
