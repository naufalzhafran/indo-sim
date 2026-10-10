import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { initialQuarter } from "./engine/economy/engine";
import type { PolicyStructureInput } from "./structureLayout";
import type { TransportNetwork } from "./transportNetwork";
import {
  flightLeg,
  MAX_CARGO_SHIPS,
  MAX_PLANES,
  planFleet,
  regionGrowth,
  shuttle,
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
});
