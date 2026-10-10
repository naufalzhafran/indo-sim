import { describe, expect, it } from "vitest";
import {
  aggregate,
  basePlan,
  foundations,
  initialQuarter,
  activeIds,
  isFinished,
  launchCount,
  policyAllocations,
  previewQuarter,
  resolveQuarter,
  summarizeEconomyRegions,
  validatePlan,
} from "./engine";
import { industries, policies, policyById } from "./catalog";
import {
  FOUNDATIONS,
  INDUSTRY_IDS,
  POLICY_IDS,
  REGION_IDS,
  type IndustryId,
  type PolicyId,
  type QuarterGame,
} from "./types";
import { TAX_IDS } from "../taxes";
import { shipFood, type Shipment } from "./network";
import { shipFood as mapFoodFlows } from "../../worldNetwork";
import { foodRoutes } from "../../mapLayers";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const output = (game: QuarterGame, id: IndustryId) =>
  sum(game.simulation.provinces.map((p) => p.industries[id].output));
function advance(game: QuarterGame, ids: PolicyId[], quarters: number) {
  for (let i = 0; i < quarters; i++) {
    const plan = basePlan(game);
    // Finished one-time builds end themselves and cannot be relaunched.
    plan.policies = ids.filter((id) => !isFinished(game, id));
    game = resolveQuarter(game, plan, { calm: true, attribution: false });
  }
  return game;
}

describe("regional economic kernel", () => {
  it("makes fewer filled jobs reduce earnings and subsequent income tax", () => {
    const full = initialQuarter();
    const fewer = structuredClone(full);
    for (const p of fewer.simulation.provinces)
      for (const id of INDUSTRY_IDS) p.industries[id].jobs *= 0.5;
    const run = (game: QuarterGame) =>
      resolveQuarter(game, basePlan(game), { calm: true, attribution: false });
    const reference = run(full);
    const reduced = run(fewer);
    const wages = (game: QuarterGame) =>
      sum(
        game.simulation.provinces.flatMap((p) =>
          INDUSTRY_IDS.map((id) => p.industries[id].laborIncome),
        ),
      );
    expect(aggregate(reduced).jobs).toBeLessThan(aggregate(reference).jobs);
    expect(wages(reduced)).toBeLessThan(wages(reference) * 0.85);
    expect(reduced.receipt!.ledger.taxes.personalIncome).toBeLessThan(
      reference.receipt!.ledger.taxes.personalIncome,
    );
    expect(aggregate(reduced).realIncome).toBeLessThan(
      aggregate(reference).realIncome,
    );
    for (const p of reduced.simulation.provinces)
      for (const def of industries) {
        const state = p.industries[def.id];
        expect(state.laborIncome).toBeGreaterThanOrEqual(0);
        expect(state.laborIncome).toBeLessThanOrEqual(
          state.output * def.laborShare,
        );
      }
  });

  it("finishes fully funded construction without floating-point residue", () => {
    const game = advance(initialQuarter(), ["broadband"], 16);
    expect(game.simulation.projects).toHaveLength(9);
    for (const project of game.simulation.projects) {
      expect(project.spent).toBe(project.cost);
      expect(project.progress).toBe(100);
      expect(project.completed).toBe(true);
    }
  });

  it("shares food deliveries and estimated map routes for the same snapshot", () => {
    const game = initialQuarter();
    const provinces = game.simulation.provinces;
    const production = new Map(provinces.map((p) => [p.id, p.foodProduction]));
    const routes: Shipment[] = [];
    const flows = shipFood(provinces, production, routes);
    expect(mapFoodFlows(provinces, production)).toEqual(flows);
    for (const p of provinces) {
      const flow = flows.get(p.id)!;
      expect(flow.received).toBeCloseTo(p.foodReceived, 8);
      expect(flow.imported).toBeCloseTo(p.foodImported, 8);
      expect(flow.unmet).toBeCloseTo(p.foodUnmet, 10);
      expect(
        sum(routes.filter((r) => r.to === p.id).map((r) => r.tons)),
      ).toBeCloseTo(flow.received, 8);
      const exports = sum(
        routes.filter((r) => r.from === p.id).map((r) => r.tons),
      );
      expect(exports).toBeLessThanOrEqual(
        Math.max(0, p.foodProduction - p.foodNeed) * 0.8 + 1e-8,
      );
    }
    const expectedRoutes = [...routes]
      .sort(
        (a, b) =>
          b.tons - a.tons ||
          a.from.localeCompare(b.from) ||
          a.to.localeCompare(b.to),
      )
      .slice(0, 12);
    expect(foodRoutes(provinces)).toEqual(expectedRoutes);
  });

  it("preserves observed opening output across thirteen non-overlapping industries", () => {
    const game = initialQuarter();
    expect(game.simulation.provinces).toHaveLength(38);
    expect(policies).toHaveLength(33);
    expect(industries).toHaveLength(13);
    expect(aggregate(game).gdp).toBeCloseTo(22139, 6);
    for (const p of game.simulation.provinces) {
      expect(
        sum(INDUSTRY_IDS.map((id) => p.industries[id].output)),
      ).toBeCloseTo(p.gdp, 9);
      expect(sum(INDUSTRY_IDS.map((id) => p.industries[id].jobs))).toBeCloseTo(
        p.laborForce * (1 - p.unemployment / 100),
        9,
      );
      expect(p.industries.publicServices.profits).toBe(0);
      expect(
        FOUNDATIONS.every(
          (k) => foundations(p)[k] >= 0 && foundations(p)[k] <= 100,
        ),
      ).toBe(true);
    }
    expect(summarizeEconomyRegions(game)).toHaveLength(9);
  });

  it("redistributes a fixed national budget and treats equal tiers identically", () => {
    const game = initialQuarter(),
      medium = basePlan(game);
    medium.policies = ["mbg"];
    const low = structuredClone(medium),
      high = structuredClone(medium),
      mixed = structuredClone(medium);
    for (const region of REGION_IDS) {
      low.regionalSpending.mbg[region] = "low";
      high.regionalSpending.mbg[region] = "high";
    }
    mixed.regionalSpending.mbg.papua = "high";
    mixed.regionalSpending.mbg.java = "low";
    const standard = policyAllocations(game, medium, "mbg");
    for (const plan of [low, high, mixed])
      expect(
        sum(policyAllocations(game, plan, "mbg").map((a) => a.amount)),
      ).toBeCloseTo(sum(standard.map((a) => a.amount)), 10);
    expect(policyAllocations(game, low, "mbg")).toEqual(standard);
    for (let i = 0; i < 9; i++)
      expect(policyAllocations(game, high, "mbg")[i].share).toBeCloseTo(
        standard[i].share,
        12,
      );
    expect(
      policyAllocations(game, mixed, "mbg").find(
        (a) => a.region === "papua",
      )!.share,
    ).toBeGreaterThan(standard.find((a) => a.region === "papua")!.share);
  });

  it("enforces eight active policies and two launches", () => {
    const game = initialQuarter(),
      plan = basePlan(game);
    plan.policies = POLICY_IDS.slice(0, 3);
    expect(validatePlan(game, plan).join(" ")).toContain("two policies");
    plan.policies = POLICY_IDS.slice(0, 9);
    expect(validatePlan(game, plan).join(" ")).toContain("eight");
    let progressed = game;
    for (let q = 0; q < 4; q++) {
      const p = basePlan(progressed);
      p.policies = POLICY_IDS.slice(0, (q + 1) * 2);
      expect(validatePlan(progressed, p)).toEqual([]);
      progressed = resolveQuarter(progressed, p, {
        calm: true,
        attribution: false,
      });
    }
    expect(progressed.policies.filter((p) => p.active)).toHaveLength(8);
  });

  it("has deterministic pure previews and matched three-month accounting", () => {
    const game = initialQuarter(97),
      frozen = structuredClone(game),
      plan = basePlan(game);
    plan.policies = ["bos", "plts"];
    const result = previewQuarter(game, plan);
    expect(game).toEqual(frozen);
    expect(result).toEqual(previewQuarter(game, plan));
    expect(result.simulation.month).toBe(3);
    expect(result.simulation.history).toHaveLength(4);
    const l = result.receipt!.ledger;
    expect(
      l.revenue +
        l.borrowing -
        l.repayment -
        l.spending -
        l.interest -
        l.cashChange,
    ).toBeCloseTo(0, 9);
    expect(result.simulation.debt - game.simulation.debt).toBeCloseTo(
      l.borrowing - l.repayment,
      8,
    );
    for (const id of TAX_IDS)
      expect(
        sum(result.receipt!.regionsAfter.map((r) => r.taxes[id])),
      ).toBeCloseTo(l.taxes[id], 9);
    for (const id of plan.policies)
      expect(
        sum(result.receipt!.regionsAfter.map((r) => r.policySpending[id] ?? 0)),
      ).toBeCloseTo(l.policySpending[id]!, 9);
    expect(result.receipt!.after.revenue).toBeCloseTo(l.revenue, 9);
  });

  it("preserves the price level in current and historical fiscal snapshots", () => {
    const game = advance(initialQuarter(), [], 4);
    expect(aggregate(game).priceIndex).toBe(game.simulation.priceIndex);
    expect(game.receipt!.before.priceIndex).toBe(
      game.simulation.history[9].priceIndex,
    );
    expect(game.receipt!.after.priceIndex).toBe(
      game.simulation.history[12].priceIndex,
    );
    for (const snapshot of game.simulation.history) {
      expect(snapshot.priceIndex).toBeGreaterThanOrEqual(1);
      const nominalRatio = snapshot.debt / (snapshot.gdp * snapshot.priceIndex);
      expect(nominalRatio).toBeLessThanOrEqual(snapshot.debt / snapshot.gdp);
    }
  });

  it("does not depend on province processing order", () => {
    const game = initialQuarter(),
      reversed = structuredClone(game);
    reversed.simulation.provinces.reverse();
    const plan = basePlan(game);
    plan.policies = ["water", "pupuk"];
    const a = resolveQuarter(game, plan, { calm: true, attribution: false }),
      b = resolveQuarter(reversed, plan, { calm: true, attribution: false });
    for (const p of a.simulation.provinces) {
      const q = b.simulation.provinces.find((q) => q.id === p.id)!;
      expect(p.gdp).toBeCloseTo(q.gdp, 8);
      expect(p.foodSecurity).toBeCloseTo(q.foodSecurity, 9);
    }
  });

  it("keeps seeded shocks identical when province order changes", () => {
    let a = initialQuarter(19),
      b = structuredClone(a);
    b.simulation.provinces.reverse();
    for (let q = 0; q < 10; q++) {
      a = resolveQuarter(a, basePlan(a), { attribution: false });
      b = resolveQuarter(b, basePlan(b), { attribution: false });
    }
    expect(a.simulation.crises.length).toBeGreaterThan(0);
    expect(a.simulation.crises).toEqual(b.simulation.crises);
    expect(aggregate(a).gdp).toBeCloseTo(aggregate(b).gdp, 7);
  });

  it("uses retained investment to finance industry capacity", () => {
    const initial = initialQuarter(),
      constrained = structuredClone(initial);
    for (const p of constrained.simulation.provinces)
      p.industries.manufacturing.investment = 0;
    const limited = advance(constrained, [], 1),
      normal = advance(initial, [], 1);
    expect(output(limited, "manufacturing")).toBeLessThan(
      output(normal, "manufacturing"),
    );
    const supported = advance(initial, ["kur"], 6),
      reference = advance(initial, [], 6);
    expect(output(supported, "manufacturing")).toBeGreaterThan(
      output(reference, "manufacturing"),
    );
    expect(
      sum(
        supported.simulation.provinces.map(
          (p) => p.industries.manufacturing.investment,
        ),
      ),
    ).toBeGreaterThan(
      sum(
        reference.simulation.provinces.map(
          (p) => p.industries.manufacturing.investment,
        ),
      ),
    );
  });

  it("locks nominal appropriations for a quarter and applies reallocations without restarting", () => {
    const initial = initialQuarter(),
      plan = basePlan(initial);
    plan.policies = ["bpn"];
    const predicted = sum(
      policyAllocations(initial, plan, "bpn").map((a) => a.amount),
    );
    const started = resolveQuarter(initial, plan, {
      calm: true,
      attribution: false,
    });
    expect(started.receipt!.ledger.policySpending.bpn).toBeCloseTo(
      predicted,
      10,
    );
    const mature = advance(started, ["bpn"], 3),
      high = basePlan(mature),
      low = basePlan(mature);
    high.regionalSpending.bpn.java = "high";
    low.regionalSpending.bpn.java = "low";
    const higher = resolveQuarter(mature, high, {
        calm: true,
        attribution: false,
      }),
      lower = resolveQuarter(mature, low, { calm: true, attribution: false });
    const h = higher.simulation.provinces.find((p) => p.id === "32")!,
      l = lower.simulation.provinces.find((p) => p.id === "32")!;
    expect(h.collection).toBeGreaterThan(l.collection);
    expect(higher.policies[0].fundedMonths).toBe(
      lower.policies[0].fundedMonths,
    );
    expect(higher.policies[0].started).toBe(mature.policies[0].started);
    expect(higher.receipt!.ledger.policySpending.bpn).toBeCloseTo(
      lower.receipt!.ledger.policySpending.bpn!,
      10,
    );
  });

  it("improves school outcomes before workforce and industry returns", () => {
    const initial = initialQuarter(),
      baseline = advance(initial, [], 4),
      schools = advance(initial, ["bos", "teachers"], 4);
    expect(
      aggregate(schools).education - aggregate(baseline).education,
    ).toBeGreaterThan(1);
    expect(output(schools, "technology")).toBeCloseTo(
      output(baseline, "technology"),
      8,
    );
    const mature = advance(schools, ["bos", "teachers"], 16),
      reference = advance(baseline, [], 16);
    expect(
      aggregate(mature).education - aggregate(reference).education,
    ).toBeGreaterThan(5);
    expect(output(mature, "technology")).toBeGreaterThan(
      output(reference, "technology") * 1.01,
    );
    const training = advance(initial, ["prakerja"], 6),
      trainingReference = advance(initial, [], 6);
    expect(output(training, "manufacturing")).toBeGreaterThan(
      output(trainingReference, "manufacturing"),
    );
  });

  it("makes completed power plants raise supply permanently", () => {
    const initial = initialQuarter(),
      grid = advance(initial, ["pltu"], 6),
      reference = advance(initial, [], 6);
    expect(isFinished(grid, "pltu")).toBe(true);
    expect(aggregate(grid).energy).toBeGreaterThan(
      aggregate(reference).energy + 1,
    );
    expect(output(grid, "manufacturing")).toBeGreaterThan(
      output(reference, "manufacturing"),
    );
    // Thermal plants pollute: the health penalty is permanent.
    const later = advance(grid, [], 4),
      laterReference = advance(reference, [], 4);
    expect(aggregate(later).health).toBeLessThan(
      aggregate(laterReference).health,
    );
    expect(
      later.simulation.provinces.every(
        (p, i) =>
          p.powerCapacity >
          laterReference.simulation.provinces[i].powerCapacity,
      ),
    ).toBe(true);
    expect(later.receipt!.ledger.policySpending.pltu ?? 0).toBe(0);
  });

  it("keeps completed build rewards and acquired skills after programmes stop", () => {
    const initial = initialQuarter(),
      built = advance(initial, ["broadband", "irrigation"], 8),
      stopped = advance(built, [], 4);
    expect(isFinished(built, "broadband")).toBe(true);
    expect(isFinished(built, "irrigation")).toBe(true);
    for (const p of stopped.simulation.provinces) {
      expect(p.builtGains["industry:technology"]).toBe(5);
      expect(p.builtGains["industry:agriculture"]).toBe(5);
      expect(p.policySpending).toEqual({});
    }
    const trained = advance(initial, ["prakerja"], 8),
      cancelled = advance(trained, [], 4);
    for (const p of cancelled.simulation.provinces)
      expect(p.skills).toBeGreaterThanOrEqual(
        trained.simulation.provinces.find((b) => b.id === p.id)!.skills,
      );
  });

  it("ties construction scope and progress to actual regional appropriations", () => {
    const initial = initialQuarter(),
      plan = basePlan(initial);
    plan.policies = ["plts"];
    plan.regionalSpending.plts.papua = "high";
    plan.regionalSpending.plts.java = "low";
    const game = resolveQuarter(initial, plan, {
      calm: true,
      attribution: false,
    });
    for (const region of game.receipt!.regionsAfter) {
      const project = game.simulation.projects.find(
        (p) => p.id === `plts:${region.id}`,
      )!;
      const allocation = policyAllocations(initial, plan, "plts").find(
        (a) => a.region === region.id,
      )!;
      expect(project.cost).toBeCloseTo(
        policyById.plts.build!.cost * allocation.share,
        10,
      );
      expect(project.spent).toBeCloseTo(region.policySpending.plts!, 10);
      expect(project.progress).toBeLessThanOrEqual(
        (100 * project.spent) / project.cost + 1e-9,
      );
    }
  });

  it("makes palm replanting lose output early and gain later without counting palm as food", () => {
    const initial = initialQuarter(),
      early = advance(initial, ["palm-replanting"], 4),
      reference = advance(initial, [], 4);
    expect(output(early, "palmOil")).toBeLessThan(output(reference, "palmOil"));
    const mature = advance(early, ["palm-replanting"], 16),
      lateReference = advance(reference, [], 16);
    expect(output(mature, "palmOil")).toBeGreaterThan(
      output(lateReference, "palmOil") * 1.05,
    );
    // Palm output is not included in the production calculation; changing it alone cannot feed people.
    const inflated = structuredClone(initial);
    for (const p of inflated.simulation.provinces)
      p.industries.palmOil.output *= 5;
    const changed = resolveQuarter(inflated, basePlan(inflated), {
      calm: true,
      attribution: false,
    });
    const unchanged = resolveQuarter(initial, basePlan(initial), {
      calm: true,
      attribution: false,
    });
    expect(
      sum(changed.simulation.provinces.map((p) => p.foodProduction)),
    ).toBeCloseTo(
      sum(unchanged.simulation.provinces.map((p) => p.foodProduction)),
      5,
    );
  });

  it("collects less immediately after tax relief and keeps collection separate from foundations", () => {
    const initial = initialQuarter(),
      lower = basePlan(initial);
    for (const id of TAX_IDS) lower.taxes[id] = "relief";
    const relieved = resolveQuarter(initial, lower, {
        calm: true,
        attribution: false,
      }),
      standard = resolveQuarter(initial, basePlan(initial), {
        calm: true,
        attribution: false,
      });
    expect(relieved.receipt!.ledger.revenue).toBeLessThan(
      standard.receipt!.ledger.revenue,
    );
    const collection = advance(initial, ["bpn"], 8),
      reference = advance(initial, [], 8);
    expect(aggregate(collection).taxRevenue).toBeGreaterThan(
      aggregate(reference).taxRevenue,
    );
    expect(policyById.bpn.effects).toEqual({ collection: 1 });
    expect(policyById.bpn.impacts).toEqual([]);
    expect(
      Math.abs(
        aggregate(collection).education - aggregate(reference).education,
      ),
    ).toBeLessThan(0.02);
    expect(
      Math.abs(aggregate(collection).gdp / aggregate(reference).gdp - 1),
    ).toBeLessThan(0.01);
  });

  it("puts fiscal pressure on a rapidly expanded expensive portfolio", () => {
    let game = initialQuarter();
    const ids: PolicyId[] = [
      "mbg",
      "jkn",
      "mrt-lrt",
      "klinik",
      "bos",
      "pltp",
      "tol-laut",
      "broadband",
    ];
    let minimumFunding = 1;
    for (let q = 0; q < 8; q++) {
      const plan = basePlan(game);
      // A rejected APBN freezes launches; running policies carry on.
      const frozen = game.politics.frozenUntil > game.simulation.month;
      const running = activeIds(game);
      plan.policies = ids
        .slice(0, (q + 1) * 2)
        .filter((id) => !isFinished(game, id))
        .filter((id) => !frozen || running.includes(id));
      game = resolveQuarter(game, plan, { calm: true, attribution: false });
      minimumFunding = Math.min(minimumFunding, game.receipt!.ledger.funding);
    }
    expect(minimumFunding).toBeLessThan(0.97);
    expect(game.simulation.debt).toBeGreaterThan(
      initialQuarter().simulation.debt,
    );
    expect(
      game.simulation.provinces.every(
        (p) => Number.isFinite(p.gdp) && p.gdp > 0,
      ),
    ).toBe(true);
  });
});

describe("policy kinds", () => {
  const run = (game: QuarterGame, ids: PolicyId[]) => {
    const plan = basePlan(game);
    plan.policies = ids;
    return resolveQuarter(game, plan, { calm: true, attribution: false });
  };

  it("classifies every policy and gives builds no running cost", () => {
    for (const policy of policies) {
      if (policy.kind === "program") expect(policy.build).toBeUndefined();
      else expect(policy.build!.cost).toBeGreaterThan(0);
      if (policy.kind === "build") {
        expect(policy.quarterlyCost).toBe(0);
        expect(policy.effects).toEqual({});
      }
    }
    expect(policyById.kopdes.kind).toBe("facility");
    expect(policyById.mbg.kind).toBe("program");
    expect(policyById.plta.kind).toBe("build");
  });

  it("stops a programme's effect when it stops and builds nothing", () => {
    const running = advance(initialQuarter(), ["ckg"], 4);
    expect(running.simulation.projects).toHaveLength(0);
    const stopped = advance(running, [], 4);
    const runtime = stopped.policies.find((p) => p.id === "ckg")!;
    for (const region of REGION_IDS)
      expect(runtime.delivery[region]).toBeLessThan(0.05);
    expect(stopped.receipt!.ledger.policySpending.ckg ?? 0).toBe(0);
  });

  it("adds construction jobs and disruption, then a permanent reward and an automatic end", () => {
    const initial = initialQuarter(),
      building = advance(initial, ["jalan-desa"], 2),
      reference = advance(initial, [], 2);
    expect(output(building, "construction")).toBeGreaterThan(
      output(reference, "construction"),
    );
    expect(
      sum(
        building.simulation.provinces.map(
          (p) => p.industries.logistics.productivity,
        ),
      ),
    ).toBeLessThan(
      sum(
        reference.simulation.provinces.map(
          (p) => p.industries.logistics.productivity,
        ),
      ),
    );
    // No benefit before a site is finished.
    expect(aggregate(building).infrastructure).toBeCloseTo(
      aggregate(reference).infrastructure,
      6,
    );
    const done = advance(building, ["jalan-desa"], 6);
    expect(isFinished(done, "jalan-desa")).toBe(true);
    expect(done.policies.find((p) => p.id === "jalan-desa")!.active).toBe(
      false,
    );
    const plan = basePlan(done);
    plan.policies = ["jalan-desa"];
    expect(validatePlan(done, plan).join(" ")).toContain("cannot be launched");
    const later = advance(done, [], 4),
      laterReference = advance(initial, [], 12);
    expect(
      aggregate(later).infrastructure - aggregate(laterReference).infrastructure,
    ).toBeGreaterThan(1.8);
  });

  it("runs facility service only in built regions while active, with idle upkeep when stopped", () => {
    const initial = initialQuarter(),
      started = run(initial, ["kopdes"]);
    const runtime = started.policies.find((p) => p.id === "kopdes")!;
    for (const region of REGION_IDS) expect(runtime.delivery[region]).toBe(0);
    expect(started.simulation.projects).toHaveLength(9);
    const built = advance(started, ["kopdes"], 5);
    expect(
      built.simulation.projects.every((project) => project.completed),
    ).toBe(true);
    const serving = built.policies.find((p) => p.id === "kopdes")!;
    expect(serving.delivery.java).toBeGreaterThan(0.3);
    const idle = run(built, []);
    const upkeep = idle.receipt!.ledger.policySpending.kopdes!;
    expect(upkeep).toBeCloseTo(
      0.15 * policyById.kopdes.quarterlyCost * built.simulation.priceIndex,
      0,
    );
    expect(idle.policies.find((p) => p.id === "kopdes")!.delivery.java).toBeLessThan(
      serving.delivery.java,
    );
    // Reactivation reuses the buildings and is not a new launch.
    const reopenPlan = basePlan(idle);
    reopenPlan.policies = ["kopdes", "mbg", "pkh"];
    expect(launchCount(idle, reopenPlan)).toBe(2);
    expect(validatePlan(idle, reopenPlan)).toEqual([]);
    const reopened = run(idle, ["kopdes"]);
    expect(reopened.simulation.projects).toHaveLength(9);
    expect(
      reopened.policies.find((p) => p.id === "kopdes")!.delivery.java,
    ).toBeGreaterThan(idle.policies.find((p) => p.id === "kopdes")!.delivery.java);
  });

  it("builds only in eligible regions", () => {
    const game = run(initialQuarter(), ["krl"]);
    expect(game.simulation.projects.map((p) => p.id).sort()).toEqual([
      "krl:java",
      "krl:sumatra",
    ]);
    for (const region of game.receipt!.regionsAfter)
      if (!["java", "sumatra"].includes(region.id))
        expect(region.policySpending.krl ?? 0).toBe(0);
    expect(
      policyAllocations(game, basePlan(game), "krl").find(
        (a) => a.region === "papua",
      )!.share,
    ).toBe(0);
  });
});

describe("construction payments", () => {
  it("completes and rewards every fully funded site on schedule without a rounding month", () => {
    let game = initialQuarter();
    for (let q = 0; q < 3; q++) {
      const plan = basePlan(game);
      plan.policies = isFinished(game, "jalan-desa") ? [] : ["jalan-desa"];
      game = resolveQuarter(game, plan, { calm: true, attribution: false });
    }
    for (const project of game.simulation.projects) {
      expect(project.spent).toBe(project.cost);
      expect(project.completed).toBe(project.progress === 100);
      expect(project.completionRewardGranted).toBe(project.completed);
    }
  });
});
