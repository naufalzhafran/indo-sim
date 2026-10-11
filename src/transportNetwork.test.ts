import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Vector2, Vector3 } from "three";
import { buildWorldGeometry } from "./mapGeometry";
import type { MapData } from "./mapData";
import { buildRoadNetwork, landPlanner } from "./roadNetwork";
import {
  buildTransportNetwork,
  pointAlong,
  TOL_LAUT_LINKS,
} from "./transportNetwork";

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

  it("routes every Tol Laut line by sea between harbours on its two regions", () => {
    const lines = network.sea.filter((r) => r.kind === "tol-laut");
    expect(lines.length).toBe(TOL_LAUT_LINKS.length);
    for (const route of lines) {
      expect(route.quays, route.id).toBeDefined();
      for (const quay of route.quays!) {
        // Each quay stands at the shore: open water on its seaward side.
        const ahead = new Vector2(
          quay.position.x + Math.sin(quay.rotation) * 0.3,
          -(quay.position.z + Math.cos(quay.rotation) * 0.3),
        );
        expect(plan.onLand(ahead.x, ahead.y), route.id).toBe(false);
      }
    }
  });

  it("keeps cargo and Tol Laut ships off the islands", () => {
    for (const route of network.sea.filter((r) => r.kind !== "ferry")) {
      const aground = route.points.filter((p) => plan.onLand(p.x, -p.z, 0.05));
      expect(aground.length, route.id).toBe(0);
    }
  });

  it("puts the baseline railways on Java and South Sumatra", () => {
    const baseline = network.rail.filter((line) => line.baseline);
    expect(baseline.length).toBeGreaterThanOrEqual(7);
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

  it("lays railways clear of the terrain", () => {
    for (const line of network.rail)
      for (let i = 0; i < line.points.length - 1; i++) {
        const a = line.points[i],
          b = line.points[i + 1];
        const mid = new Vector2((a.x + b.x) / 2, -(a.z + b.z) / 2);
        expect(world.surfaceHeight(mid), line.id).toBeLessThanOrEqual(
          (a.y + b.y) / 2 + 0.03,
        );
      }
  });

  it("runs Java's railways inland, clear of the roads between cities", () => {
    const roads = buildRoadNetwork(world);
    const java = network.rail.filter((line) => line.region === "java");
    expect(java.length).toBeGreaterThanOrEqual(6);
    for (const line of java)
      for (const p of line.points) {
        const nearCity = roads.cities.some(
          (c) => Math.hypot(c.position.x - p.x, c.position.z - p.z) < 0.6,
        );
        if (nearCity) continue;
        const nearRoad = roads.roads.some((road) =>
          road.points.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < 0.25),
        );
        expect(nearRoad, line.id).toBe(false);
        expect(plan.onLand(p.x, -p.z, 0.05), line.id).toBe(true);
      }
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
