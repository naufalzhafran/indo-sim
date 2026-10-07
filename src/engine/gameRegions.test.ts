import { describe, expect, it } from "vitest";
import { initialQuarter } from "./economy/engine";
import {
  GAME_REGIONS,
  regionForProvince,
  summarizeRegions,
} from "./gameRegions";

describe("game regions", () => {
  it("covers every province exactly once in nine regions", () => {
    const ids = GAME_REGIONS.flatMap((region) => region.provinceIds);
    expect(GAME_REGIONS).toHaveLength(9);
    expect(new Set(ids).size).toBe(38);
    expect([...ids].sort()).toEqual(
      initialQuarter()
        .simulation.provinces.map((province) => province.id)
        .sort(),
    );
    expect(regionForProvince("51")?.id).toBe("bali");
    expect(regionForProvince("81")?.id).toBe("maluku");
    expect(regionForProvince("82")?.id).toBe("maluku");
  });

  it("preserves national totals and weights rates by the appropriate denominator", () => {
    const provinces = initialQuarter().simulation.provinces;
    const summaries = summarizeRegions(provinces);
    for (const key of [
      "population",
      "gdp",
      "foodProduction",
      "foodNeed",
    ] as const) {
      expect(
        summaries.reduce((sum, region) => sum + region[key], 0),
      ).toBeCloseTo(
        provinces.reduce((sum, province) => sum + province[key], 0),
        5,
      );
    }
    const a = {
      ...provinces[0],
      population: 1,
      gdp: 90,
      poverty: 40,
      growth: 2,
    };
    const b = {
      ...provinces[1],
      population: 3,
      gdp: 10,
      poverty: 20,
      growth: 10,
    };
    const region = summarizeRegions([a, b]).find(
      (item) => item.id === "sumatra",
    )!;
    expect(region.poverty).toBe(25);
    expect(region.growth).toBeCloseTo(2.8);
  });

  it("uses the new energy foundation directly and keeps food security in the map summary", () => {
    const provinces = initialQuarter().simulation.provinces.slice(0, 2);
    provinces[0].population = 1;
    provinces[1].population = 3;
    provinces[0].energy = 20;
    provinces[1].energy = 80;
    provinces[0].foodSecurity = 50;
    provinces[1].foodSecurity = 90;
    // These legacy-looking source measures must not recompute the new score.
    provinces[0].reliability = 100;
    provinces[1].reliability = 100;
    const sumatra = summarizeRegions(provinces).find(
      (region) => region.id === "sumatra",
    )!;
    expect(sumatra.energy).toBe(65);
    expect(sumatra.food).toBe(80);
  });
});
