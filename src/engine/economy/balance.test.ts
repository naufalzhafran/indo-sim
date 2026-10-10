import { describe, expect, it } from "vitest";
import {
  aggregate,
  basePlan,
  COAL_RATE_PREMIUM,
  coalPremium,
  DEFICIT_LIMIT,
  deficitPremium,
  initialQuarter,
  activeIds,
  isFinished,
  resolveQuarter,
} from "./engine";
import { campaignGoals } from "./goals";
import { powerNetworks } from "./power";
import { parseQuarter, quarterEnvelope } from "./persistence";
import type { PolicyId, QuarterGame } from "./types";

function campaign(ids: PolicyId[], seed = 19, calm = true, quarters = 20) {
  let game = initialQuarter(seed);
  for (let q = 0; q < quarters; q++) {
    const plan = basePlan(game);
    // Finished one-time builds free their slot, so the next policy can start.
    const wanted = ids
      .slice(0, (q + 1) * 2)
      .filter((id) => !isFinished(game, id));
    const running = activeIds(game);
    // A rejected APBN freezes launches; running policies carry on.
    const launches = game.politics.frozenUntil > game.simulation.month ? 0 : 2;
    plan.policies = [
      ...wanted.filter((id) => running.includes(id)),
      ...wanted.filter((id) => !running.includes(id)).slice(0, launches),
    ].slice(0, 8);
    game = resolveQuarter(game, plan, { calm, attribution: false });
  }
  return game;
}

describe("campaign balance", () => {
  it("makes inactivity miss the mandate despite modest economic growth", () => {
    const initial = aggregate(initialQuarter());
    const idle = campaign([]);
    const now = aggregate(idle);
    // Idle growth is modest, not a collapse: unemployment drifts up a little.
    expect(now.realIncome).toBeLessThan(118);
    expect(now.unemployment).toBeGreaterThan(initial.unemployment + 1);
    expect(now.unemployment).toBeLessThan(initial.unemployment + 4);
    expect(now.population).toBeGreaterThan(initial.population);
    expect(now.infrastructure).toBeLessThan(initial.infrastructure - 1);
    expect(campaignGoals(idle).filter((g) => g.met).length).toBeLessThan(3);
  });

  it.each([19, 73, 997])("allows a balanced mandate under seed %s", (seed) => {
    const game = campaign(
      [
        "plts",
        "bos",
        "jkn",
        "pupuk",
        "kur",
        "water",
        "bpn",
        "pltp",
        "tol-laut",
      ],
      seed,
      false,
    );
    expect(campaignGoals(game).filter((g) => !g.met)).toEqual([]);
    expect(parseQuarter(JSON.stringify(quarterEnvelope(game)))).toEqual(game);
  });

  it("lets completed power plants reverse reliability pressure", () => {
    const idle = campaign([], 19, true, 19);
    const powered = campaign(["plta", "pltp"], 19, true, 19);
    expect(aggregate(powered).energy).toBeGreaterThan(
      aggregate(initialQuarter()).energy + 3,
    );
    expect(aggregate(powered).energy).toBeGreaterThan(
      aggregate(idle).energy + 5,
    );
    const networks = powerNetworks(powered);
    expect(
      networks.find((n) => n.id === "Jawa-Madura-Bali")?.reserve,
    ).toBeGreaterThan(
      powerNetworks(idle).find((n) => n.id === "Jawa-Madura-Bali")!.reserve,
    );
    expect(networks.reduce((sum, n) => sum + n.capacity, 0)).toBeCloseTo(
      powered.simulation.provinces.reduce((sum, p) => sum + p.powerCapacity, 0),
      8,
    );
    const saved = structuredClone(powered);
    const plan = basePlan(powered);
    plan.policies = [];
    const cancelled = resolveQuarter(powered, plan, {
      calm: true,
      attribution: false,
    });
    expect(powered).toEqual(saved);
    expect(
      cancelled.simulation.provinces.every(
        (p, i) =>
          p.powerCapacity > powered.simulation.provinces[i].powerCapacity,
      ),
    ).toBe(true);
  });

  it("pushes a rapid expensive portfolio past the deficit limit into shortfalls", () => {
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
    let worstDeficit = 0;
    for (let quarters = 1; quarters <= 8; quarters++) {
      const game = campaign(ids, 19, true, quarters);
      const ledger = game.receipt!.ledger;
      const metrics = aggregate(game);
      minimumFunding = Math.min(minimumFunding, ledger.funding);
      worstDeficit = Math.max(
        worstDeficit,
        ((ledger.spending + ledger.interest - ledger.revenue) * 4) /
          (metrics.gdp * metrics.priceIndex),
      );
    }
    expect(worstDeficit).toBeGreaterThan(DEFICIT_LIMIT);
    expect(minimumFunding).toBeLessThan(0.98);
    const final = campaign(ids);
    expect(aggregate(final).realIncome).toBeGreaterThan(115);
    expect(campaignGoals(final).filter((g) => !g.met).length).toBeGreaterThan(
      0,
    );
  });

  it("charges more interest past the deficit limit and after coal plants", () => {
    const game = initialQuarter();
    const nominal = aggregate(game).gdp;
    const ledger = { ...game.simulation.ledger };
    expect(deficitPremium(ledger, nominal)).toBe(0);
    ledger.spending += (nominal * 0.04) / 12;
    expect(deficitPremium(ledger, nominal)).toBeGreaterThan(0);
    expect(coalPremium(game)).toBe(0);
    const coal = campaign(["pltu"], 19, true, 6);
    expect(isFinished(coal, "pltu")).toBe(true);
    expect(coalPremium(coal)).toBeCloseTo(9 * COAL_RATE_PREMIUM);
  });

  it("lets clean power meet the energy goal without coal", () => {
    for (const ids of [
      ["plts", "pltp"],
      ["plta", "plts"],
    ] as PolicyId[][]) {
      const game = campaign(ids);
      expect(campaignGoals(game).find((g) => g.id === "energy")!.met).toBe(
        true,
      );
    }
  });

  it.each(["harvest", "flood", "outbreak"] as const)(
    "makes funded relevant services speed %s recovery",
    (kind) => {
      const relevant: Record<typeof kind, PolicyId[]> = {
        harvest: ["irrigation", "food-reserves"],
        flood: ["tol-laut", "water"],
        outbreak: ["ckg", "jkn"],
      };
      let supported = initialQuarter();
      for (let q = 0; q < 8; q++) {
        const plan = basePlan(supported);
        plan.policies = relevant[kind].filter(
          (id) => !isFinished(supported, id),
        );
        supported = resolveQuarter(supported, plan, {
          calm: true,
          attribution: false,
        });
      }
      const inject = (game: QuarterGame) =>
        game.simulation.crises.push({
          id: "balance-test",
          province: "32",
          title: "Disruption",
          description: "",
          months: 12,
          severity: 0.55,
          response: "relief",
          resolved: false,
          kind,
          stage: "active",
          damage: 0.55,
          initialDamage: 0.55,
          age: 0,
        });
      inject(supported);
      const inactive = structuredClone(supported);
      // Equal starting services isolate this quarter's funded emergency response.
      inactive.policies = [];
      const result = resolveQuarter(supported, basePlan(supported), {
        calm: true,
        attribution: false,
      });
      const reference = resolveQuarter(inactive, basePlan(inactive), {
        calm: true,
        attribution: false,
      });
      expect(result.simulation.crises[0].damage).toBeLessThan(
        reference.simulation.crises[0].damage,
      );
    },
  );
});
