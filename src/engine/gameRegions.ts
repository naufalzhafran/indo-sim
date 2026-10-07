import type { Province } from "../worldTypes";

export type GameRegion = {
  id: string;
  name: string;
  nameId: string;
  provinceIds: readonly string[];
};

export const GAME_REGIONS: readonly GameRegion[] = [
  {
    id: "sumatra",
    name: "Sumatra",
    nameId: "Sumatra",
    provinceIds: ["11", "12", "13", "14", "15", "16", "17", "18", "19", "21"],
  },
  {
    id: "java",
    name: "Java",
    nameId: "Jawa",
    provinceIds: ["31", "32", "33", "34", "35", "36"],
  },
  { id: "bali", name: "Bali", nameId: "Bali", provinceIds: ["51"] },
  {
    id: "kalimantan",
    name: "Kalimantan",
    nameId: "Kalimantan",
    provinceIds: ["61", "62", "63", "64", "65"],
  },
  {
    id: "sulawesi",
    name: "Sulawesi",
    nameId: "Sulawesi",
    provinceIds: ["71", "72", "73", "74", "75", "76"],
  },
  { id: "ntb", name: "NTB", nameId: "NTB", provinceIds: ["52"] },
  { id: "ntt", name: "NTT", nameId: "NTT", provinceIds: ["53"] },
  { id: "maluku", name: "Maluku", nameId: "Maluku", provinceIds: ["81", "82"] },
  {
    id: "papua",
    name: "Papua",
    nameId: "Papua",
    provinceIds: ["91", "92", "93", "94", "95", "96"],
  },
];

export const regionById = (id: string) =>
  GAME_REGIONS.find((region) => region.id === id);
export const regionForProvince = (id: string) =>
  GAME_REGIONS.find((region) => region.provinceIds.includes(id));

export type RegionSummary = GameRegion & {
  population: number;
  gdp: number;
  growth: number;
  poverty: number;
  unemployment: number;
  infrastructure: number;
  health: number;
  education: number;
  energy: number;
  food: number;
  development: number;
  foodProduction: number;
  foodNeed: number;
};

export function summarizeRegions(
  provinces: readonly Province[],
): RegionSummary[] {
  return GAME_REGIONS.map((region) => {
    const members = provinces.filter((province) =>
      region.provinceIds.includes(province.id),
    );
    const total = (value: (province: Province) => number) =>
      members.reduce((sum, province) => sum + value(province), 0);
    const population = total((province) => province.population);
    const gdp = total((province) => province.gdp);
    const mean = (value: (province: Province) => number) =>
      population
        ? total((province) => value(province) * province.population) /
          population
        : 0;
    return {
      ...region,
      population,
      gdp,
      growth: gdp
        ? total((province) => province.growth * province.gdp) / gdp
        : 0,
      poverty: mean((province) => province.poverty),
      unemployment: mean((province) => province.unemployment),
      infrastructure: mean((province) => province.infrastructure),
      health: mean((province) => province.health),
      education: mean((province) => province.education),
      energy: mean((province) => province.energy),
      food: mean((province) => province.foodSecurity),
      development: mean((province) => province.development),
      foodProduction: total((province) => province.foodProduction),
      foodNeed: total((province) => province.foodNeed),
    };
  });
}
