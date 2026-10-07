import { describe, expect, it } from "vitest";
import {
  initialQuarter,
  basePlan,
  resolveQuarter,
} from "./engine/economy/engine";
import { REGION_IDS } from "./engine/economy/types";
import type { RegionId } from "./engine/economy/types";
import type { Crisis, Project } from "./worldTypes";
import { regionForProvince, summarizeRegions } from "./engine/gameRegions";
import {
  buildQuarterSummaryFromReceipt,
  buildQuarterVisualTransition,
  EVENT_STEP_MS,
  getQuarterPlayback,
  IMPACT_MS,
  QUIET_EVENTS_MS,
  quarterTimeline,
  REGION_HOLD_MS,
  REGION_STEP_MS,
} from "./quarterVisual";

const project: Project = {
  id: "work",
  province: "32",
  name: "Infrastructure",
  cost: 10,
  spent: 3,
  progress: 30,
  duration: 18,
  completed: false,
  paused: false,
};

const crisis: Crisis = {
  id: "flood",
  province: "33",
  title: "Flood",
  description: "",
  months: 1,
  severity: 1,
  response: "relief",
  resolved: false,
  kind: "flood",
  stage: "recovery",
  damage: 1,
  initialDamage: 1,
  age: 3,
};

describe("quarter presentation", () => {
  it("compares whole-quarter endpoints without changing game or save data", () => {
    const before = initialQuarter(2025),
      after = resolveQuarter(before, basePlan(before));
    const snapshot = JSON.stringify({ before, after });
    const transition = buildQuarterVisualTransition(before, after, "health");
    expect(transition.from).toBe(0);
    expect(transition.to).toBe(3);
    expect(transition.afterProvinces).toHaveLength(38);
    expect(transition.regions).toHaveLength(9);
    for (const result of transition.regions)
      expect(result.after.poverty).toBe(
        after.receipt!.regionsAfter.find((r) => r.id === result.id)!.poverty,
      );
    expect(JSON.stringify({ before, after })).toBe(snapshot);
  });
  it("prioritizes construction and resolution, retaining completed assets", () => {
    const before = initialQuarter(),
      after = structuredClone(before);
    before.simulation.projects = [project];
    after.simulation.projects = [
      { ...project, progress: 100, completed: true },
    ];
    before.simulation.crises = [crisis];
    after.simulation.crises = [{ ...crisis, resolved: true }];
    const transition = buildQuarterVisualTransition(before, after);
    expect(transition.callouts.map((c) => c.label)).toEqual([
      "Construction completed",
      "Crisis resolved",
    ]);
    expect(transition.projects[0].after.completed).toBe(true);
    expect(transition.callouts[0]).toMatchObject({
      event: "project-completed",
      direction: "positive",
      projectId: project.id,
      province: "32",
      region: "java",
      name: "Java",
      nameId: "Jawa",
      before: 30,
      after: 100,
    });
    expect(transition.callouts[1]).toMatchObject({
      event: "crisis-resolved",
      direction: "positive",
      crisisId: crisis.id,
      beforeState: "Recovery",
      afterState: "Resolved",
    });
  });
  it.each([
    {
      name: "started",
      before: null,
      after: { ...project, progress: 12 },
      direction: "positive",
      start: 0,
      end: 12,
    },
    {
      name: "advanced",
      before: project,
      after: { ...project, progress: 48 },
      direction: "positive",
      start: 30,
      end: 48,
    },
    {
      name: "paused",
      before: project,
      after: { ...project, paused: true },
      direction: "negative",
      start: 30,
      end: 30,
    },
    {
      name: "resumed",
      before: { ...project, paused: true },
      after: { ...project, progress: 42 },
      direction: "positive",
      start: 30,
      end: 42,
    },
  ])(
    "records actual construction $name",
    ({ name, before: prior, after: next, direction, start, end }) => {
      const before = initialQuarter(),
        after = structuredClone(before);
      before.simulation.projects = prior ? [prior] : [];
      after.simulation.projects = [next];
      const transition = buildQuarterVisualTransition(before, after);
      expect(transition.callouts).toHaveLength(1);
      expect(transition.callouts[0]).toMatchObject({
        kind: "project",
        event: `project-${name}`,
        direction,
        projectId: project.id,
        before: start,
        after: end,
        unit: "%",
      });
    },
  );
  it("shows a warning becoming an active crisis as a negative change", () => {
    const before = initialQuarter(),
      after = structuredClone(before);
    before.simulation.crises = [{ ...crisis, stage: "warning" }];
    after.simulation.crises = [{ ...crisis, stage: "active", damage: 4 }];
    expect(buildQuarterVisualTransition(before, after).callouts).toEqual([
      expect.objectContaining({
        event: "crisis-active",
        direction: "negative",
        beforeState: "Warning",
        afterState: "Active",
      }),
    ]);
  });
  it.each([
    { damage: 0.6, event: "crisis-improved", direction: "positive" },
    { damage: 1.4, event: "crisis-worsened", direction: "negative" },
  ])(
    "records damage changes inside a crisis stage: $event",
    ({ damage, event, direction }) => {
      const before = initialQuarter(),
        after = structuredClone(before);
      before.simulation.crises = [crisis];
      after.simulation.crises = [{ ...crisis, damage }];
      expect(
        buildQuarterVisualTransition(before, after).callouts[0],
      ).toMatchObject({
        event,
        direction,
        before: 1,
        after: damage,
      });
    },
  );
  it.each([
    { field: "poverty" as const, delta: -1, verdict: "improving" },
    { field: "poverty" as const, delta: 1, verdict: "slipping" },
    { field: "unemployment" as const, delta: -1, verdict: "improving" },
    { field: "education" as const, delta: 2, verdict: "improving" },
    { field: "health" as const, delta: -2, verdict: "slipping" },
  ])(
    "rates a region whose $field moves $delta as $verdict",
    ({ field, delta, verdict }) => {
      const before = initialQuarter(),
        after = structuredClone(before);
      const region = regionForProvince(after.simulation.provinces[0].id)!;
      after.simulation.provinces
        .filter((province) => region.provinceIds.includes(province.id))
        .forEach((province) => {
          province[field] += delta;
        });
      const results = buildQuarterVisualTransition(before, after).regions;
      const result = results.find((r) => r.id === region.id)!;
      expect(result.verdict).toBe(verdict);
      expect(
        results
          .filter((r) => r.id !== region.id)
          .every((r) => r.verdict === "mixed"),
      ).toBe(true);
      expect(result.tag).toBe(verdict === "improving" ? "best" : "attention");
      expect(results.filter((r) => r.tag)).toHaveLength(1);
    },
  );
  it("treats a clear setback alongside gains as mixed", () => {
    const before = initialQuarter(),
      after = structuredClone(before);
    const members = after.simulation.provinces.filter(
      (p) => regionForProvince(p.id)?.id === "papua",
    );
    members.forEach((province) => {
      province.poverty -= 1;
      province.unemployment += 1;
    });
    const papua = buildQuarterVisualTransition(before, after).regions.find(
      (r) => r.id === "papua",
    )!;
    expect(papua.verdict).toBe("mixed");
  });
  it("creates no effects for unchanged projects, crises, or province metrics", () => {
    const before = initialQuarter();
    before.simulation.projects = [
      project,
      { ...project, id: "finished", completed: true, progress: 100 },
    ];
    before.simulation.crises = [crisis];
    const after = structuredClone(before);
    const snapshot = JSON.stringify({ before, after });
    const transition = buildQuarterVisualTransition(before, after);
    expect(transition.callouts).toEqual([]);
    expect(JSON.stringify({ before, after })).toBe(snapshot);
  });
  it("summarizes all nine regions west to east, anchored on member provinces", () => {
    const before = initialQuarter(),
      after = structuredClone(before);
    const members = after.simulation.provinces.filter(
      (p) => regionForProvince(p.id)?.id === "java",
    );
    members.forEach((province) => {
      province.infrastructure += 2;
    });
    const regions = buildQuarterVisualTransition(before, after).regions;
    expect(regions.map((r) => r.id)).toEqual([
      "sumatra",
      "java",
      "kalimantan",
      "bali",
      "ntb",
      "ntt",
      "sulawesi",
      "maluku",
      "papua",
    ]);
    const java = regions.find((r) => r.id === "java")!;
    expect(java).toMatchObject({ name: "Java", nameId: "Jawa" });
    expect(java.foundations.infrastructure).toBeCloseTo(2, 10);
    expect(members.map((province) => province.id)).toContain(java.province);
  });
  it("does not invent buildings or events from policy delivery", () => {
    const before = initialQuarter(),
      after = structuredClone(before);
    after.policies = [
      {
        id: "mbg",
        active: true,
        started: 0,
        startupRemaining: 0,
        fundedMonths: 3,
        delivery: Object.fromEntries(REGION_IDS.map((id) => [id, 1])) as Record<
          RegionId,
          number
        >,
      },
    ];
    after.simulation.provinces.forEach((p) => (p.infrastructure += 1));
    const transition = buildQuarterVisualTransition(before, after, "grids");
    expect(transition.projects).toEqual([]);
    expect(transition.callouts).toEqual([]);
    expect(transition.decisions.launched).toEqual(["mbg"]);
  });
  it("splits a real quarter into decisions, news and regional results", () => {
    const before = initialQuarter(2025),
      plan = basePlan(before);
    plan.policies = ["bos", "plts"];
    const after = resolveQuarter(before, plan);
    const transition = buildQuarterVisualTransition(before, after);
    expect(transition.decisions).toMatchObject({
      launched: ["bos", "plts"],
      ended: [],
    });
    expect(transition.national?.effects).toBeDefined();
    expect(transition.regions.every((r) => r.spending > 0)).toBe(true);
    const best = transition.regions.filter((r) => r.tag === "best");
    expect(best.length).toBeLessThanOrEqual(1);
    expect(best.every((r) => r.verdict === "improving")).toBe(true);
    expect(transition.regions.filter((r) => r.tag === "attention")).toHaveLength(1);
    expect(transition.news.length).toBeLessThanOrEqual(3);
  });
});

describe("summary from a saved report", () => {
  it("matches the full summary's results without the quarter opening", () => {
    const before = initialQuarter(2025),
      plan = basePlan(before);
    plan.policies = ["bos", "plts"];
    const after = resolveQuarter(before, plan);
    const full = buildQuarterVisualTransition(before, after);
    const partial = buildQuarterSummaryFromReceipt(after)!;
    expect(partial.partial).toBe(true);
    expect(partial.regions).toEqual(full.regions);
    expect(partial.decisions.launched).toEqual(full.decisions.launched);
    expect(partial.from).toBe(0);
    expect(buildQuarterSummaryFromReceipt(initialQuarter())).toBeNull();
  });
});

describe("quarter playback", () => {
  const quarter = () => {
    const before = initialQuarter(),
      after = structuredClone(before);
    before.simulation.projects = [project];
    after.simulation.projects = [{ ...project, progress: 60 }];
    before.simulation.crises = [crisis];
    after.simulation.crises = [{ ...crisis, resolved: true }];
    return buildQuarterVisualTransition(before, after);
  };
  it("plays events, then national impact, then a tour of every region", () => {
    const transition = quarter();
    const { acts, total } = quarterTimeline(transition);
    expect(acts.events.duration).toBe(2 * EVENT_STEP_MS);
    expect(acts.impact.start).toBe(acts.events.duration);
    expect(total).toBe(
      2 * EVENT_STEP_MS + IMPACT_MS + 9 * REGION_STEP_MS + REGION_HOLD_MS,
    );
    expect(getQuarterPlayback(0, transition)).toMatchObject({
      act: "events",
      step: 0,
      focus: { badge: "1", wholeRegion: false, celebrate: true },
    });
    expect(getQuarterPlayback(EVENT_STEP_MS, transition)).toMatchObject({
      act: "events",
      step: 1,
      focus: { badge: "2", celebrate: false },
    });
    const impact = getQuarterPlayback(acts.impact.start + 10, transition);
    expect(impact).toMatchObject({ act: "impact", step: -1, focus: null });
    const tour = getQuarterPlayback(
      acts.regions.start + 2 * REGION_STEP_MS,
      transition,
    );
    expect(tour).toMatchObject({
      act: "regions",
      step: 2,
      focus: { region: "kalimantan", wholeRegion: true },
    });
  });
  it("shifts map colours during the impact act and clamps the endpoints", () => {
    const transition = quarter();
    const { acts, total } = quarterTimeline(transition);
    expect(getQuarterPlayback(-20, transition)).toMatchObject({
      progress: 0,
      colorProgress: 0,
    });
    expect(
      getQuarterPlayback(acts.impact.start + IMPACT_MS * 0.3, transition)
        .colorProgress,
    ).toBeGreaterThan(0);
    expect(getQuarterPlayback(total + 100, transition)).toMatchObject({
      done: true,
      progress: 1,
      colorProgress: 1,
      focus: null,
    });
  });
  it("gives a calm quarter a short opening beat", () => {
    const before = initialQuarter();
    const transition = buildQuarterVisualTransition(
      before,
      structuredClone(before),
    );
    expect(quarterTimeline(transition).acts.events.duration).toBe(
      QUIET_EVENTS_MS,
    );
    expect(getQuarterPlayback(100, transition)).toMatchObject({
      act: "events",
      focus: null,
    });
  });
});
