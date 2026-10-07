import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildWorldGeometry } from "./mapGeometry";
import type { MapData } from "./mapData";
import {
  buildRoadNetwork,
  roadClassFor,
  roadClassKey,
  roadRuns,
} from "./roadNetwork";

const map = JSON.parse(
  readFileSync(
    new URL("../public/data/provinces.geojson", import.meta.url),
    "utf8",
  ),
) as MapData;
const world = buildWorldGeometry(map);
describe("road network", () => {
  const started = performance.now();
  const network = buildRoadNetwork(world);
  const took = performance.now() - started;
  it("connects the major cities on every main island", () => {
    console.log(
      "roads",
      network.roads.length,
      "cities",
      network.cities.length,
      "ms",
      Math.round(took),
      network.roads.map((r) => `${r.id}:${r.length.toFixed(1)}`).join(" "),
    );
    expect(network.roads.length).toBeGreaterThan(25);
    expect(network.cities.length).toBeGreaterThan(35);
  });
  it("keeps every road point on land", () => {
    for (const road of network.roads)
      for (const p of road.points)
        expect(
          world.surfaceHeight({ x: p.x, y: -p.z } as never),
        ).toBeGreaterThanOrEqual(0);
  });
  it("classifies roads by infrastructure", () => {
    expect(roadClassFor(80)).toBe("toll");
    expect(roadClassFor(55)).toBe("national");
    expect(roadClassFor(30)).toBe("track");
    const road = network.roads[0];
    expect(roadRuns(road, () => 80)).toHaveLength(1);
  });
  it("changes the render key at the exact road thresholds, including changes within one rounded score", () => {
    const key = (infrastructure: number) =>
      roadClassKey([{ id: "11", infrastructure }]);
    for (const threshold of [46, 66]) {
      expect(Math.round(threshold - 0.4)).toBe(Math.round(threshold + 0.1));
      expect(key(threshold - 0.4)).not.toBe(key(threshold + 0.1));
      expect(key(threshold - 0.001)).not.toBe(key(threshold));
    }
  });
  it("keeps the render key stable when infrastructure changes within a road class", () => {
    const before = [
      { id: "11", infrastructure: 20 },
      { id: "12", infrastructure: 46 },
      { id: "13", infrastructure: 66 },
    ];
    const after = [
      { id: "11", infrastructure: 45.99 },
      { id: "12", infrastructure: 65.99 },
      { id: "13", infrastructure: 100 },
    ];
    expect(roadClassKey(after)).toBe(roadClassKey(before));
    expect(
      roadClassKey([{ ...after[0], id: "14" }, ...after.slice(1)]),
    ).not.toBe(roadClassKey(before));
  });
});
