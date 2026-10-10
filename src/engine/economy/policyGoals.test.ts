import { describe, expect, it } from "vitest";
import {
  activeIds,
  aggregate,
  basePlan,
  initialQuarter,
  isFinished,
  resolveQuarter,
} from "./engine";
import { FOUNDATIONS, POLICY_IDS, type PolicyId } from "./types";
import { policyGoals, starterPolicies, type GoalId } from "./policyGoals";

/** Goal values after five calm years with only these policies. */
function campaign(ids: PolicyId[]) {
  let game = initialQuarter(19);
  for (let quarter = 0; quarter < 20; quarter++) {
    const plan = basePlan(game);
    const running = activeIds(game);
    const wanted = ids.filter((id) => !isFinished(game, id));
    plan.policies = [
      ...wanted.filter((id) => running.includes(id)),
      ...wanted.filter((id) => !running.includes(id)).slice(0, 2),
    ];
    game = resolveQuarter(game, plan, { calm: true, attribution: false });
  }
  const opening = game.simulation.history[0];
  const now = aggregate(game);
  return {
    income: now.realIncome / opening.realIncome,
    poverty: opening.poverty - now.poverty,
    jobs: opening.unemployment - now.unemployment,
    services: FOUNDATIONS.reduce(
      (sum, key) => sum + now[key] - opening[key],
      0,
    ),
    energy: now.energy - opening.energy,
    budget: -now.debt / (now.gdp * now.priceIndex),
  } satisfies Record<GoalId, number>;
}

describe("policy goal tags", () => {
  it("tag every policy with at least one goal", () => {
    for (const id of POLICY_IDS)
      expect(policyGoals[id].length).toBeGreaterThan(0);
  });

  const baseline = campaign([]);
  it.each(starterPolicies)("%s improves the goals it is tagged with", (id) => {
    const result = campaign([id]);
    for (const goal of policyGoals[id])
      expect(result[goal]).toBeGreaterThan(baseline[goal]);
  });

  it("cuts poverty with targeted cash transfers", () => {
    expect(campaign(["pkh"]).poverty - baseline.poverty).toBeGreaterThan(0.5);
  });
});
