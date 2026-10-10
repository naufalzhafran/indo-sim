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

/** Thresholds shared by the goal checks and the screens that explain them. */
export const GOAL_TARGETS = {
  income: 18,
  poverty: 1.5,
  unemployment: 5.5,
  foundationGain: 2,
  foundationCount: 3,
  foundationLoss: 3,
  energyLoss: 1,
  debt: 40,
  funding: 0.98,
} as const;

/**
 * What each goal teaches, shown when the term ends. Each line explains the
 * cause in plain words and stays true to both the model and Indonesia.
 */
export const goalLessons: Record<
  string,
  { met: Bilingual; missed: Bilingual }
> = {
  income: {
    met: {
      en: "Families can buy more than in 2025. Lasting income gains come from more productive work, supported by skills, power, roads and credit.",
      id: "Keluarga bisa membeli lebih banyak daripada tahun 2025. Kenaikan pendapatan yang bertahan berasal dari pekerjaan yang lebih produktif, didukung keterampilan, listrik, jalan, dan kredit.",
    },
    missed: {
      en: "Families can buy only a little more than in 2025. Transfers help for a while, but lasting income gains need more productive work: skills, power, roads and credit.",
      id: "Keluarga hanya bisa membeli sedikit lebih banyak daripada tahun 2025. Bantuan menolong sementara, tetapi kenaikan pendapatan yang bertahan butuh pekerjaan yang lebih produktif: keterampilan, listrik, jalan, dan kredit.",
    },
  },
  poverty: {
    met: {
      en: "Fewer people live below the poverty line. Poverty falls when real incomes rise and fewer people are out of work.",
      id: "Lebih sedikit orang hidup di bawah garis kemiskinan. Kemiskinan turun ketika pendapatan riil naik dan pengangguran berkurang.",
    },
    missed: {
      en: "Poverty fell too slowly. It falls when real incomes rise and unemployment stays low, so jobs matter as much as transfers.",
      id: "Kemiskinan turun terlalu lambat. Kemiskinan turun ketika pendapatan riil naik dan pengangguran tetap rendah, jadi lapangan kerja sama pentingnya dengan bantuan.",
    },
  },
  jobs: {
    met: {
      en: "Businesses grew fast enough to hire the new workers who join the labour force every year.",
      id: "Dunia usaha tumbuh cukup cepat untuk menyerap pekerja baru yang masuk angkatan kerja setiap tahun.",
    },
    missed: {
      en: "The labour force grew faster than jobs. Firms hire when they can expand, which needs skilled workers, reliable power, roads and credit.",
      id: "Angkatan kerja tumbuh lebih cepat daripada lapangan kerja. Perusahaan merekrut saat bisa berkembang, dan itu butuh pekerja terampil, listrik andal, jalan, dan kredit.",
    },
  },
  services: {
    met: {
      en: "Schools, clinics, roads, power and food supply improved. These foundations make every industry more productive.",
      id: "Sekolah, layanan kesehatan, jalan, listrik, dan pasokan pangan membaik. Fondasi ini membuat setiap industri lebih produktif.",
    },
    missed: {
      en: "Public foundations barely improved. Services wear down and the population grows, so they need steady funding just to keep up.",
      id: "Fondasi publik hampir tidak membaik. Layanan menurun seiring waktu dan penduduk bertambah, jadi perlu dana rutin agar tidak tertinggal.",
    },
  },
  energy: {
    met: {
      en: "Electricity kept up with demand. A growing economy uses more power, so new plants have to be built ahead of need.",
      id: "Listrik mampu mengimbangi kebutuhan. Ekonomi yang tumbuh memakai lebih banyak listrik, jadi pembangkit baru harus dibangun sebelum dibutuhkan.",
    },
    missed: {
      en: "Power demand outgrew supply. Plants take quarters to build, and isolated islands cannot draw power from other grids.",
      id: "Kebutuhan listrik melampaui pasokan. Pembangkit butuh beberapa triwulan untuk dibangun, dan pulau terpisah tidak bisa mengambil listrik dari jaringan lain.",
    },
  },
  budget: {
    met: {
      en: "Debt stayed manageable and programmes were paid in full. Indonesian law limits the deficit to 3% of GDP and debt to 60%.",
      id: "Utang tetap terkendali dan program didanai penuh. Undang-undang membatasi defisit 3% PDB dan utang 60% PDB.",
    },
    missed: {
      en: "Debt rose too high or programmes ran short of money. Spending is paid by taxes or borrowing, and interest on debt crowds out other spending.",
      id: "Utang terlalu tinggi atau program kekurangan dana. Belanja dibayar dengan pajak atau pinjaman, dan bunga utang menggerus belanja lain.",
    },
  },
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
    (key) => now[key] - opening[key] >= GOAL_TARGETS.foundationGain,
  ).length;
  const protectedServices = FOUNDATIONS.every(
    (key) => now[key] >= opening[key] - GOAL_TARGETS.foundationLoss,
  );
  const energy = now.energy - opening.energy;
  const debt = (100 * now.debt) / (now.gdp * now.priceIndex);
  const funded =
    (game.receipt?.ledger.funding ?? game.simulation.ledger.funding) >=
    GOAL_TARGETS.funding;
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
      met: income >= GOAL_TARGETS.income,
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
      met: poverty >= GOAL_TARGETS.poverty,
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
      met: now.unemployment <= GOAL_TARGETS.unemployment,
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
      met: improved >= GOAL_TARGETS.foundationCount && protectedServices,
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
      met: energy >= -GOAL_TARGETS.energyLoss,
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
      met: debt <= GOAL_TARGETS.debt && funded,
    },
  ];
}
