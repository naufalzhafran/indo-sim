import type { Project } from "../../worldTypes";
import { regionForProvince } from "../gameRegions";
import { industryById } from "./catalog";
import type {
  Bilingual,
  BuiltGainKey,
  IndustryId,
  PolicyId,
  ProvinceEconomy,
} from "./types";

export type ProjectCompletionReward =
  | {
      target:
        | "infrastructure"
        | "water"
        | "healthAccess"
        | "healthStatus"
        | "electrification";
      amount: number;
      unit: "points";
      label: Bilingual;
    }
  | {
      target: "powerCapacity";
      amount: number;
      unit: "percent";
      label: Bilingual;
    }
  | {
      target: "industryCapacity";
      industry: IndustryId;
      amount: number;
      unit: "percent";
      label: Bilingual;
    };

const infrastructure = (amount: number): ProjectCompletionReward => ({
  target: "infrastructure",
  amount,
  unit: "points",
  label: { en: "Infrastructure", id: "Infrastruktur" },
});
const water = (amount: number): ProjectCompletionReward => ({
  target: "water",
  amount,
  unit: "points",
  label: { en: "Water access", id: "Akses air" },
});
const power = (amount: number): ProjectCompletionReward => ({
  target: "powerCapacity",
  amount,
  unit: "percent",
  label: { en: "Usable power capacity", id: "Kapasitas listrik siap pakai" },
});
const capacity = (
  industry: IndustryId,
  amount: number,
): ProjectCompletionReward => ({
  target: "industryCapacity",
  industry,
  amount,
  unit: "percent",
  label: {
    en: `${industryById[industry].name.en} capacity`,
    id: `Kapasitas ${industryById[industry].name.id.toLowerCase()}`,
  },
});

/** Permanent rewards of one-time builds, granted once per completed region. */
export const projectCompletionRewards: Partial<
  Record<PolicyId, readonly ProjectCompletionReward[]>
> = {
  "jalan-desa": [infrastructure(2)],
  "embung-desa": [water(2), capacity("agriculture", 3)],
  "pasar-desa": [capacity("retail", 4), capacity("agriculture", 2)],
  brt: [infrastructure(2)],
  krl: [infrastructure(3), capacity("services", 2)],
  "mrt-lrt": [infrastructure(5), capacity("services", 3), capacity("retail", 2)],
  "kereta-antarkota": [infrastructure(3), capacity("logistics", 5)],
  plts: [
    power(3),
    {
      target: "electrification",
      amount: 2,
      unit: "points",
      label: { en: "Electrification", id: "Elektrifikasi" },
    },
  ],
  plta: [power(8)],
  pltp: [power(6)],
  pltu: [
    power(7),
    {
      target: "healthStatus",
      amount: -2,
      unit: "points",
      label: { en: "Health from air quality", id: "Kesehatan dari kualitas udara" },
    },
  ],
  water: [water(3), infrastructure(1)],
  irrigation: [capacity("agriculture", 5)],
  broadband: [capacity("technology", 5), capacity("finance", 2)],
  "tourism-access": [capacity("tourism", 5), infrastructure(1)],
};

const addGain = (
  province: ProvinceEconomy,
  key: BuiltGainKey,
  amount: number,
) => {
  province.builtGains[key] = (province.builtGains[key] ?? 0) + amount;
};

/** Grant after monthly construction updates, including pending rewards in old saves. */
export function grantProjectCompletionReward(
  project: Project,
  provinces: ProvinceEconomy[],
) {
  if (!project.completed || project.completionRewardGranted) return;
  const rewards =
    projectCompletionRewards[project.id.split(":")[0] as PolicyId];
  const region = regionForProvince(project.province);
  if (!rewards || !region) return;
  const members = provinces.filter((p) => region.provinceIds.includes(p.id));
  if (!members.length) return;
  for (const province of members) {
    for (const reward of rewards) {
      if (reward.target === "industryCapacity") {
        province.industries[reward.industry].capacity *=
          1 + reward.amount / 100;
        addGain(province, `industry:${reward.industry}`, reward.amount);
      } else if (reward.target === "powerCapacity") {
        // Capacity grows proportionally each month, so the gain persists.
        province.powerCapacity *= 1 + reward.amount / 100;
      } else {
        const before = province[reward.target];
        const raw = before + reward.amount;
        province[reward.target] = Math.min(100, Math.max(0, raw));
        // Record the exact amount unless the score hit its 0–100 bound.
        addGain(
          province,
          reward.target,
          province[reward.target] === raw
            ? reward.amount
            : province[reward.target] - before,
        );
        if (reward.target === "healthAccess" || reward.target === "healthStatus")
          province.health = (province.healthAccess + province.healthStatus) / 2;
      }
    }
  }
  project.completionRewardGranted = true;
  project.paused = false;
  return { region, rewards };
}
