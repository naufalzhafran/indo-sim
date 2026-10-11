import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildWorldGeometry } from "./mapGeometry";
import type { MapData } from "./mapData";
import {
  buildRoadNetwork,
  roadClassFor,
  roadClassKey,
  roadRuns,
  unsharedRanges,
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
  it("drapes each road deck above the terrain across its full width", () => {
    const half = 0.105;
    let worst = 0;
    for (const road of network.roads)
      for (let i = 0; i < road.points.length - 1; i++) {
        const a = road.points[i],
          b = road.points[i + 1];
        const dx = b.x - a.x,
          dz = b.z - a.z,
          length = Math.hypot(dx, dz) || 1;
        for (const f of [0, 0.5])
          for (const side of [-1, 0, 1]) {
            const x = a.x + dx * f - (dz / length) * half * side,
              z = a.z + dz * f + (dx / length) * half * side;
            const deck = a.y + (b.y - a.y) * f;
            worst = Math.max(
              worst,
              world.surfaceHeight({ x, y: -z } as never) - deck,
            );
          }
      }
    // Ribbons sit ROAD_LIFT (0.03) above the deck, so terrain never shows through.
    expect(worst).toBeLessThan(0.03);
  });
  it("draws a trunk several roads share only once", () => {
    const drawn = unsharedRanges(network.roads);
    const index = network.roads.findIndex(
      (r) => r.id === "yogyakarta-surabaya",
    );
    const covered = drawn[index].reduce((sum, [a, b]) => sum + b - a, 0);
    expect(covered).toBeLessThan(network.roads[index].points.length / 2);
    expect(drawn[0]).toEqual([[0, network.roads[0].points.length - 1]]);
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
