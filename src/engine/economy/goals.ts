import { aggregate, initialQuarter, summarizeEconomyRegions } from "./engine";
import { FOUNDATIONS, type Bilingual, type QuarterGame } from "./types";

export type CampaignGoal = {
  id: string;
  label: Bilingual;
  target: Bilingual;
  value: number;
  unit: "percent" | "points" | "count";
  met: boolean;
};

export function campaignVerdict(achieved: number): Bilingual {
  if (achieved >= 6)
    return { en: "Full mandate achieved", id: "Seluruh mandat tercapai" };
  if (achieved >= 4) return { en: "Strong progress", id: "Kemajuan besar" };
  if (achieved >= 2) return { en: "Mixed results", id: "Hasil beragam" };
  return { en: "Mandate unmet", id: "Mandat belum tercapai" };
}

export function regionalAchievement(game: QuarterGame) {
  const opening = summarizeEconomyRegions(initialQuarter(game.simulation.seed));
  const current = summarizeEconomyRegions(game);
  const regions = current.map((region) => {
    const before = opening.find((item) => item.id === region.id)!;
    return {
      id: region.id,
      name: region.name,
      nameId: region.nameId,
      income: (region.realIncome / before.realIncome - 1) * 100,
      poverty: before.poverty - region.poverty,
      met:
        region.realIncome > before.realIncome &&
        region.poverty < before.poverty,
    };
  });
  return {
    regions,
    met: regions.every((region) => region.met),
    count: regions.filter((region) => region.met).length,
  };
}

/** Gameplay targets, evaluated against the campaign's own opening snapshot. */
export function campaignGoals(game: QuarterGame): CampaignGoal[] {
  const now = aggregate(game);
  const opening = game.simulation.history[0] ?? now;
  const income = (now.realIncome / opening.realIncome - 1) * 100;
  const poverty = opening.poverty - now.poverty;
  const improved = FOUNDATIONS.filter(
    (key) => now[key] - opening[key] >= 2,
  ).length;
  const protectedServices = FOUNDATIONS.every(
    (key) => now[key] >= opening[key] - 3,
  );
  const energy = now.energy - opening.energy;
  const debt = (100 * now.debt) / (now.gdp * now.priceIndex);
  const funded =
    (game.receipt?.ledger.funding ?? game.simulation.ledger.funding) >= 0.98;
  return [
    {
      id: "income",
      label: { en: "Household prosperity", id: "Kesejahteraan keluarga" },
      target: {
        en: "Raise real income per person by 18%",
        id: "Naikkan pendapatan riil per orang 18%",
      },
      value: income,
      unit: "percent",
      met: income >= 18,
    },
    {
      id: "poverty",
      label: { en: "Reduce poverty", id: "Kurangi kemiskinan" },
      target: {
        en: "Cut poverty by 1.5 percentage points",
        id: "Turunkan kemiskinan 1,5 poin persentase",
      },
      value: poverty,
      unit: "points",
      met: poverty >= 1.5,
    },
    {
      id: "jobs",
      label: { en: "Jobs for new workers", id: "Pekerjaan bagi pekerja baru" },
      target: {
        en: "Unemployment at or below 5.5%",
        id: "Pengangguran maksimal 5,5%",
      },
      value: now.unemployment,
      unit: "percent",
      met: now.unemployment <= 5.5,
    },
    {
      id: "services",
      label: { en: "Stronger foundations", id: "Fondasi lebih kuat" },
      target: {
        en: "Gain 2 points in 3 foundations; none loses over 3",
        id: "Naik 2 poin pada 3 fondasi; tak ada yang turun lebih dari 3",
      },
      value: improved,
      unit: "count",
      met: improved >= 3 && protectedServices,
    },
    {
      id: "energy",
      label: { en: "Keep the lights on", id: "Jaga pasokan listrik" },
      target: {
        en: "Energy stays within 1 point of the opening level",
        id: "Energi tidak turun lebih dari 1 poin dari kondisi awal",
      },
      value: energy,
      unit: "points",
      met: energy >= -1,
    },
    {
      id: "budget",
      label: { en: "Sustainable delivery", id: "Pelaksanaan berkelanjutan" },
      target: {
        en: "Debt at most 40% of GDP (legal limit 60%); fund at least 98% of the final quarter",
        id: "Utang maksimal 40% PDB (batas hukum 60%); danai minimal 98% triwulan terakhir",
      },
      value: debt,
      unit: "percent",
      met: debt <= 40 && funded,
    },
  ];
}
