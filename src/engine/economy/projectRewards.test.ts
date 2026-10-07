import { describe, expect, it } from "vitest";
import type { Project } from "../../worldTypes";
import { GAME_REGIONS } from "../gameRegions";
import { aggregate, basePlan, initialQuarter, resolveQuarter } from "./engine";
import { parseQuarter, quarterEnvelope } from "./persistence";
import { policies } from "./catalog";
import {
  grantProjectCompletionReward,
  projectCompletionRewards,
} from "./projectRewards";
import type { IndustryId, PolicyId, QuarterGame } from "./types";

const java = GAME_REGIONS.find((region) => region.id === "java")!;
const calm = { calm: true, attribution: false };
const encode = (game: QuarterGame) => JSON.stringify(quarterEnvelope(game));
const completedProject = (id: PolicyId): Project => ({
  id: `${id}:java`,
  province: "31",
  name: id,
  cost: 10,
  spent: 10,
  progress: 100,
  duration: 12,
  completed: true,
  paused: false,
});

describe("project completion rewards", () => {
  it("defines a reward for every one-time build and none for programmes or facilities", () => {
    expect(Object.keys(projectCompletionRewards).sort()).toEqual(
      policies
        .filter((policy) => policy.kind === "build")
        .map((policy) => policy.id)
        .sort(),
    );
    for (const rewards of Object.values(projectCompletionRewards))
      for (const reward of rewards!) {
        // Only pollution may be a negative reward.
        if (reward.target === "healthStatus")
          expect(reward.amount).toBeLessThan(0);
        else expect(reward.amount).toBeGreaterThan(0);
        expect(reward.label.en).not.toBe("");
        expect(reward.label.id).not.toBe("");
      }
  });

  it.each([
    ["jalan-desa", 2],
    ["brt", 2],
  ] as const)(
    "grants %s infrastructure to the entire region once",
    (id, amount) => {
      const provinces = initialQuarter().simulation.provinces;
      const before = structuredClone(provinces);
      const project = completedProject(id);
      expect(grantProjectCompletionReward(project, provinces)?.region.id).toBe(
        "java",
      );
      for (const [index, province] of provinces.entries()) {
        const original = before[index];
        expect(province).toEqual(
          java.provinceIds.includes(province.id)
            ? {
                ...original,
                infrastructure: original.infrastructure + amount,
                builtGains: { infrastructure: amount },
              }
            : original,
        );
      }
      expect(project.completionRewardGranted).toBe(true);
      const granted = structuredClone(provinces);
      expect(grantProjectCompletionReward(project, provinces)).toBeUndefined();
      expect(provinces).toEqual(granted);
    },
  );

  it("caps water and infrastructure rewards at 100 without touching other regions", () => {
    const provinces = initialQuarter().simulation.provinces;
    for (const province of provinces)
      if (java.provinceIds.includes(province.id)) {
        province.water = 99;
        province.infrastructure = 99.5;
      }
    const before = structuredClone(provinces);
    grantProjectCompletionReward(completedProject("water"), provinces);
    for (const [index, province] of provinces.entries())
      expect(province).toEqual(
        java.provinceIds.includes(province.id)
          ? {
              ...before[index],
              water: 100,
              infrastructure: 100,
              builtGains: { water: 1, infrastructure: 0.5 },
            }
          : before[index],
      );
  });

  it("recomputes health from floored pollution damage and keeps it as a permanent gain", () => {
    const provinces = initialQuarter().simulation.provinces;
    const marker = provinces.find((province) => province.id === "31")!;
    marker.healthStatus = 1;
    marker.health = (marker.healthAccess + marker.healthStatus) / 2;
    const before = structuredClone(provinces);
    grantProjectCompletionReward(completedProject("pltu"), provinces);
    for (const [index, province] of provinces.entries()) {
      const original = before[index];
      const status = Math.max(0, original.healthStatus - 2);
      expect(province).toEqual(
        java.provinceIds.includes(province.id)
          ? {
              ...original,
              powerCapacity: original.powerCapacity * 1.07,
              healthStatus: status,
              health: (original.healthAccess + status) / 2,
              builtGains: { healthStatus: status - original.healthStatus },
            }
          : original,
      );
    }
  });

  it.each([
    ["plta", {}, 1.08, 0],
    ["irrigation", { agriculture: 1.05 }, 1, 0],
    ["broadband", { technology: 1.05, finance: 1.02 }, 1, 0],
    ["tourism-access", { tourism: 1.05 }, 1, 1],
  ] as [PolicyId, Partial<Record<IndustryId, number>>, number, number][])(
    "grants %s persistent capacity without inventing immediate output or jobs",
    (id, industryMultipliers, powerMultiplier, infrastructurePoints) => {
      const provinces = initialQuarter().simulation.provinces;
      const before = structuredClone(provinces);
      grantProjectCompletionReward(completedProject(id), provinces);
      for (const [index, province] of provinces.entries()) {
        const expected = structuredClone(before[index]);
        if (java.provinceIds.includes(province.id)) {
          expected.powerCapacity *= powerMultiplier;
          expected.infrastructure += infrastructurePoints;
          if (infrastructurePoints)
            expected.builtGains.infrastructure = infrastructurePoints;
          for (const [industry, multiplier] of Object.entries(
            industryMultipliers,
          )) {
            expected.industries[industry as IndustryId].capacity *= multiplier;
            expected.builtGains[`industry:${industry as IndustryId}`] =
              Math.round((multiplier - 1) * 100);
          }
        }
        expect(province).toEqual(expected);
      }
    },
  );

  it("does not reward unfinished or paused construction", () => {
    const provinces = initialQuarter().simulation.provinces;
    const before = structuredClone(provinces);
    const project = {
      ...completedProject("jalan-desa"),
      progress: 99.99,
      completed: false,
      paused: true,
      completionRewardGranted: false,
    };
    expect(grantProjectCompletionReward(project, provinces)).toBeUndefined();
    expect(project.completionRewardGranted).toBe(false);
    expect(provinces).toEqual(before);
  });

  it("grants on funded completion and never repeats when funding continues, stops or resumes", () => {
    let game = initialQuarter();
    for (let turn = 0; turn < 16; turn++) {
      const plan = basePlan(game);
      plan.policies = game.policies.some((p) => p.finished)
        ? []
        : ["jalan-desa"];
      const before = structuredClone(game);
      const original = game;
      game = resolveQuarter(game, plan, calm);
      expect(original).toEqual(before);
      for (const project of game.simulation.projects)
        expect(project.completionRewardGranted).toBe(project.completed);
      if (game.simulation.projects.every((project) => project.completed)) break;
    }
    expect(game.simulation.projects).toHaveLength(9);
    expect(
      game.simulation.projects.every(
        (project) => project.completed && project.completionRewardGranted,
      ),
    ).toBe(true);
    // Nine regional rewards plus one "build completed" notice.
    expect(
      game.simulation.events.filter((event) => event.kind === "project"),
    ).toHaveLength(10);
    expect(game.policies[0].finished).toBe(true);
    expect(game.policies[0].active).toBe(false);
    for (const region of GAME_REGIONS) {
      const event = game.simulation.events.find(
        (event) =>
          event.kind === "project" &&
          event.title.en.includes(`(${region.name})`),
      );
      expect(event?.title.id).toContain(region.nameId);
      expect(event?.detail.en).toContain("Infrastructure +2 points");
      expect(event?.detail.id).toContain("Infrastruktur +2 poin");
    }
    for (const policies of [["mbg"], [], ["mbg"]] as PolicyId[][]) {
      const loaded = parseQuarter(encode(game));
      expect(loaded).toEqual(game);
      const plan = { ...basePlan(loaded), policies };
      const result = resolveQuarter(loaded, plan, calm);
      expect(result).toEqual(resolveQuarter(game, plan, calm));
      expect(
        result.receipt!.events.filter((event) => event.kind === "project"),
      ).toEqual([]);
      expect(
        result.simulation.events.filter((event) => event.kind === "project"),
      ).toHaveLength(10);
      game = result;
    }
  });

  it("keeps legacy rewards pending on load, then updates health, development and history in the next month", () => {
    const legacy = initialQuarter();
    legacy.simulation.projects = [completedProject("pltu")];
    const loaded = parseQuarter(encode(legacy));
    expect(loaded).toEqual(legacy);
    expect(
      loaded.simulation.projects[0].completionRewardGranted,
    ).toBeUndefined();
    const alreadyGranted = structuredClone(loaded);
    alreadyGranted.simulation.projects[0].completionRewardGranted = true;
    const result = resolveQuarter(loaded, basePlan(loaded), calm);
    const reference = resolveQuarter(
      alreadyGranted,
      basePlan(alreadyGranted),
      calm,
    );
    const javaPopulation = loaded.simulation.provinces
      .filter((province) => java.provinceIds.includes(province.id))
      .reduce((total, province) => total + province.population, 0);
    const populationShare = javaPopulation / aggregate(loaded).population;
    expect(
      result.simulation.history[1].health -
        reference.simulation.history[1].health,
    ).toBeCloseTo(-1 * populationShare, 10);
    expect(
      result.simulation.history[1].development -
        reference.simulation.history[1].development,
    ).toBeCloseTo(-0.18 * populationShare, 10);
    expect(result.simulation.projects[0].completionRewardGranted).toBe(true);
    expect(result.simulation.history.at(-1)).toEqual(aggregate(result));
    expect(result.receipt!.after.health).toBe(aggregate(result).health);
    for (const province of result.simulation.provinces)
      expect(province.health).toBe(
        (province.healthAccess + province.healthStatus) / 2,
      );
    const events = result.receipt!.events.filter(
      (event) => event.kind === "project",
    );
    expect(events).toHaveLength(1);
    expect(events[0].month).toBe(loaded.simulation.month);
    expect(events[0].detail.en).toContain("every province of Java");
    expect(events[0].detail.id).toContain("setiap provinsi di Jawa");
    const reloaded = parseQuarter(encode(result));
    expect(reloaded).toEqual(result);
    const next = resolveQuarter(reloaded, basePlan(reloaded), calm);
    expect(
      next.receipt!.events.filter((event) => event.kind === "project"),
    ).toEqual([]);
    expect(next.simulation.projects[0].completionRewardGranted).toBe(true);
  });

  it("rejects malformed reward flags while retaining old unfinished saves", () => {
    const game = initialQuarter();
    game.simulation.projects = [
      {
        ...completedProject("jalan-desa"),
        completed: false,
        progress: 50,
        spent: 5,
      },
    ];
    expect(parseQuarter(encode(game))).toEqual(game);
    game.simulation.projects[0].completionRewardGranted = true;
    expect(() => parseQuarter(encode(game))).toThrow(/construction progress/);
    const invalid = JSON.parse(encode(game));
    invalid.state.simulation.projects[0].completionRewardGranted = "true";
    expect(() => parseQuarter(JSON.stringify(invalid))).toThrow();
  });
});
