import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { initialQuarter } from "./engine/economy/engine";
import type { PolicyStructureInput } from "./structureLayout";
import type { TransportNetwork } from "./transportNetwork";
import {
  CRUISE_ALTITUDE,
  flightLeg,
  flightPath,
  flightStage,
  MAX_CARGO_SHIPS,
  MAX_PLANES,
  planFleet,
  regionGrowth,
  shuttle,
  trainHead,
  type Motion,
} from "./transportTraffic";

const line = (from: [number, number], to: [number, number]) => {
  const points = Array.from(
    { length: 11 },
    (_, i) =>
      new Vector3(
        from[0] + ((to[0] - from[0]) * i) / 10,
        0,
        from[1] + ((to[1] - from[1]) * i) / 10,
      ),
  );
  const length = points[0].distanceTo(points[10]);
  return {
    points,
    distances: points.map((_, i) => (length * i) / 10),
    length,
  };
};
const network: TransportNetwork = {
  sea: [
    {
      id: "priok-belawan",
      kind: "cargo",
      regions: ["java", "sumatra"],
      ...line([0, 0], [30, 0]),
    },
    {
      id: "perak-makassar",
      kind: "cargo",
      regions: ["java", "sulawesi"],
      ...line([0, 5], [20, 5]),
    },
    {
      id: "tol-laut:makassar-ambon",
      kind: "tol-laut",
      regions: ["sulawesi", "maluku"],
      ...line([0, 12], [25, 12]),
    },
    {
      id: "padangbai-lembar",
      kind: "ferry",
      regions: ["bali", "ntb"],
      ...line([0, 8], [1, 8]),
    },
  ],
  rail: [
    {
      id: "jakarta-bandung",
      region: "java",
      baseline: true,
      ...line([0, 0], [8, 0]),
    },
    {
      id: "makassar-kendari",
      region: "sulawesi",
      baseline: false,
      ...line([0, 0], [12, 0]),
    },
  ],
  airports: [
    {
      id: "jakarta",
      region: "java",
      position: new Vector3(0, 0, 0),
      heading: 0,
    },
    {
      id: "medan",
      region: "sumatra",
      position: new Vector3(-20, 0, -8),
      heading: 0,
    },
    {
      id: "makassar",
      region: "sulawesi",
      position: new Vector3(20, 0, 2),
      heading: 0,
    },
    {
      id: "jayapura",
      region: "papua",
      position: new Vector3(60, 0, 0),
      heading: 0,
    },
  ],
  fishing: [],
};
const provinces = initialQuarter().simulation.provinces;
const grown = provinces.map((p) => ({ ...p, gdp: p.gdp * 1.4 }));
const funded = (
  policy: PolicyStructureInput["policy"],
  region: PolicyStructureInput["region"],
): PolicyStructureInput => ({ policy, region, level: "high", delivery: 1 });

describe("fleet planning", () => {
  it("starts every region at its opening output", () => {
    for (const ratio of regionGrowth(provinces).values())
      expect(ratio).toBeCloseTo(1, 5);
    for (const ratio of regionGrowth(grown).values())
      expect(ratio).toBeCloseTo(1.4, 5);
  });

  it("runs only today's railways until intercity rail is funded", () => {
    expect(planFleet(network, provinces, []).rail.map((l) => l.id)).toEqual([
      "jakarta-bandung",
    ]);
    const plan = planFleet(network, provinces, [
      funded("kereta-antarkota", "sulawesi"),
    ]);
    expect(plan.rail.map((l) => l.id)).toEqual([
      "jakarta-bandung",
      "makassar-kendari",
    ]);
    expect(
      plan.trains.some((t) => plan.rail[t.line].region === "sulawesi"),
    ).toBe(true);
  });

  it("adds ships, ferries and flights as the economy grows and policies land", () => {
    const opening = planFleet(network, provinces, []);
    const busy = planFleet(network, grown, [
      funded("tol-laut", "java"),
      funded("tourism-access", "bali"),
    ]);
    expect(busy.cargo.length).toBeGreaterThan(opening.cargo.length);
    expect(busy.ferries.length).toBeGreaterThan(opening.ferries.length);
    expect(busy.flights.length).toBeGreaterThanOrEqual(opening.flights.length);
    expect(busy.cargo.length).toBeLessThanOrEqual(MAX_CARGO_SHIPS);
    expect(busy.flights.length).toBeLessThanOrEqual(MAX_PLANES);
    // A flight never links an airport to itself.
    for (const f of busy.flights) expect(f.from).not.toBe(f.to);
  });

  it("sails Tol Laut ships only on lines both regions fund", () => {
    expect(planFleet(network, provinces, []).tolLaut).toEqual([]);
    expect(
      planFleet(network, provinces, [funded("tol-laut", "sulawesi")]).tolLaut,
    ).toEqual([]);
    const building = planFleet(network, provinces, [
      funded("tol-laut", "sulawesi"),
      { ...funded("tol-laut", "maluku"), delivery: 0.3 },
    ]);
    expect(building.tolLaut).toHaveLength(1);
    expect(network.sea[building.tolLaut[0].route].kind).toBe("tol-laut");
    const built = planFleet(network, provinces, [
      funded("tol-laut", "sulawesi"),
      funded("tol-laut", "maluku"),
    ]);
    expect(built.tolLaut).toHaveLength(2);
    // Tol Laut lines never add to the general cargo fleet's routes.
    for (const ship of built.cargo)
      expect(network.sea[ship.route].kind).toBe("cargo");
  });

  it("shuttles out and back with a pause at each end", () => {
    const route = network.sea[0];
    const out = new Vector3();
    shuttle(route, 1, 2, 0, 1, out);
    expect(out.x).toBeCloseTo(0);
    shuttle(route, 1, 2, 0, 12, out);
    expect(out.x).toBeCloseTo(10);
    shuttle(route, 1, 2, 0, 33, out);
    expect(out.x).toBeCloseTo(30);
    shuttle(route, 1, 2, 0, 44, out);
    expect(out.x).toBeCloseTo(20);
  });

  it("keeps planes on the ground between legs", () => {
    expect(flightLeg(22, 0, 0)).toEqual({ u: 0, outbound: true });
    expect(flightLeg(22, 0, 14)).toBeNull();
    expect(flightLeg(22, 0, 20)?.outbound).toBe(false);
  });

  it("eases ships out of and into port and turns them round while berthed", () => {
    const route = network.sea[0];
    const out = new Vector3();
    const motion: Motion = { heading: 0, pace: 0 };
    // Leaving port: slower than cruising speed at first.
    shuttle(route, 1, 2, 0, 2.5, out, 0, 2, motion);
    expect(out.x).toBeGreaterThan(0);
    expect(out.x).toBeLessThan(0.5);
    expect(motion.pace).toBeCloseTo(0.125);
    // Mid-crossing at full speed.
    shuttle(route, 1, 2, 0, 18, out, 0, 2, motion);
    expect(motion.pace).toBe(1);
    // Easing adds time but the ship still arrives and berths.
    shuttle(route, 1, 2, 0, 2 + 34 + 1, out, 0, 2, motion);
    expect(out.x).toBeCloseTo(30);
    expect(motion.pace).toBe(0);
    // Halfway through the stop it has swung a quarter turn from its arrival heading.
    expect(Math.abs(motion.heading)).toBeCloseTo(Math.PI / 2);
    // Sailing home it faces back the way it came.
    shuttle(route, 1, 2, 0, 2 + 34 + 2 + 17, out, 0, 2, motion);
    expect(Math.cos(motion.heading)).toBeCloseTo(-1);
  });

  it("pulls trains away slowly and runs them at full speed between stations", () => {
    const rail = {
      ...line([0, 0], [10, 0]),
      id: "r",
      region: "java" as const,
      baseline: true,
    };
    const plan = { line: 0, phase: 0, speed: 0.4 };
    expect(trainHead(rail, plan, 1).pace).toBe(0);
    const starting = trainHead(rail, plan, 4.5);
    expect(starting.pace).toBeGreaterThan(0);
    expect(starting.pace).toBeLessThan(1);
    expect(trainHead(rail, plan, 14).pace).toBe(1);
  });

  it("flies from runway to runway: rolling, climbing, cruising and landing", () => {
    const from = new Vector3(0, 0.2, 0),
      to = new Vector3(20, 0.3, 0);
    const out = new Vector3();
    flightPath(from, Math.PI / 2, to, 0, 0, out);
    expect(out.distanceTo(new Vector3(0, 0.26, 0))).toBeLessThan(1e-6);
    // Early on it is still rolling along the first runway (along z here).
    flightPath(from, Math.PI / 2, to, 0, 0.03, out);
    expect(out.y).toBeCloseTo(0.26, 1);
    expect(Math.abs(out.z)).toBeGreaterThan(Math.abs(out.x));
    const cruise = flightPath(from, Math.PI / 2, to, 0, 0.5, out);
    expect(out.y).toBeGreaterThan(CRUISE_ALTITUDE);
    expect(Math.abs(cruise.pitch)).toBeLessThan(0.05);
    flightPath(from, Math.PI / 2, to, 0, 1, out);
    expect(out.distanceTo(new Vector3(20, 0.36, 0))).toBeLessThan(1e-6);
  });

  it("turns planes round on the ground between legs", () => {
    const stage = flightStage(22, 0, 14);
    expect(stage.flying).toBe(false);
    expect(stage.outbound).toBe(true);
    expect(stage.u).toBeGreaterThan(0);
    expect(stage.u).toBeLessThan(1);
  });
});
