import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Vector2, Vector3 } from "three";
import { buildWorldGeometry } from "./mapGeometry";
import type { MapData } from "./mapData";
import { landPlanner } from "./roadNetwork";
import { buildTransportNetwork, pointAlong } from "./transportNetwork";

const map = JSON.parse(
  readFileSync(
    new URL("../public/data/provinces.geojson", import.meta.url),
    "utf8",
  ),
) as MapData;
const world = buildWorldGeometry(map);
describe("transport network", () => {
  const started = performance.now();
  const network = buildTransportNetwork(world);
  const took = performance.now() - started;
  const plan = landPlanner(world);

  it("links the main harbours by sea and builds in reasonable time", () => {
    console.log(
      "transport ms",
      Math.round(took),
      network.sea.map((r) => `${r.id}:${r.length.toFixed(1)}`).join(" "),
      "rail",
      network.rail.length,
      "airports",
      network.airports.map((a) => a.id).join(","),
      "fishing",
      network.fishing.length,
    );
    expect(network.sea.filter((r) => r.kind === "cargo").length).toBe(13);
    expect(
      network.sea.filter((r) => r.kind === "ferry").length,
    ).toBeGreaterThanOrEqual(3);
    expect(took).toBeLessThan(4000);
  });

  it("keeps cargo ships off the islands", () => {
    for (const route of network.sea.filter((r) => r.kind === "cargo")) {
      const aground = route.points.filter((p) => plan.onLand(p.x, -p.z, 0.05));
      expect(aground.length, route.id).toBe(0);
    }
  });

  it("puts the baseline railways on Java and South Sumatra", () => {
    const baseline = network.rail.filter((line) => line.baseline);
    expect(baseline.length).toBeGreaterThanOrEqual(9);
    expect(new Set(baseline.map((line) => line.region))).toEqual(
      new Set(["java", "sumatra"]),
    );
    for (const line of baseline)
      for (const p of line.points)
        expect(
          world.surfaceHeight(new Vector2(p.x, -p.z)),
          line.id,
        ).toBeGreaterThan(-0.05);
  });

  it("finds level runways for most hubs and fishing grounds around the islands", () => {
    expect(network.airports.length).toBeGreaterThanOrEqual(12);
    expect(network.fishing.length).toBeGreaterThanOrEqual(20);
    for (const spot of network.fishing)
      expect(plan.onLand(spot.position.x, -spot.position.z)).toBe(false);
  });

  it("samples positions and headings along a path", () => {
    const route = network.sea[0];
    const out = new Vector3();
    pointAlong(route, 0, out);
    expect(out.distanceTo(route.points[0])).toBeLessThan(1e-6);
    pointAlong(route, route.length, out);
    expect(out.distanceTo(route.points[route.points.length - 1])).toBeLessThan(
      1e-6,
    );
  });
});
