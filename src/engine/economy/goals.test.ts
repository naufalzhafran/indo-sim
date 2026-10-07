import { describe, expect, it } from "vitest";
import { initialQuarter } from "./engine";
import { GAME_REGIONS } from "../gameRegions";
import { campaignVerdict, regionalAchievement } from "./goals";

describe("campaign ending", () => {
  it.each([
    [0, "Mandate unmet"],
    [1, "Mandate unmet"],
    [2, "Mixed results"],
    [3, "Mixed results"],
    [4, "Strong progress"],
    [5, "Strong progress"],
    [6, "Full mandate achieved"],
  ])("grades %s completed goals", (count, label) => {
    expect(campaignVerdict(count as number).en).toBe(label);
    expect(campaignVerdict(count as number).id).toBeTruthy();
  });
  it("requires both income growth and poverty reduction in every region", () => {
    const game = initialQuarter(73);
    expect(regionalAchievement(game).count).toBe(0);
    for (const province of game.simulation.provinces) {
      province.realIncome *= 1.1;
      province.poverty -= 1;
    }
    expect(regionalAchievement(game).met).toBe(true);
    const papua = GAME_REGIONS.find((region) => region.id === "papua")!;
    for (const province of game.simulation.provinces.filter((p) =>
      papua.provinceIds.includes(p.id),
    )) {
      province.poverty = province.initialPoverty;
    }
    expect(regionalAchievement(game).met).toBe(false);
    expect(regionalAchievement(game).count).toBe(8);
  });
});
