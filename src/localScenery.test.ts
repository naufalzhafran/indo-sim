import { describe, expect, it, vi } from "vitest";
import { Box3, BufferGeometry, Vector2, Vector3 } from "three";
import type { WorldGeometry } from "./mapGeometry";
import { onRoadOrCity, seedRoadNetwork, type RoadNetwork } from "./roadNetwork";
import { seedStructureSites } from "./structureLayout";
import {
  getLocalScenery,
  MAX_LOCAL_SCENERY_ITEMS,
  MAX_LOCAL_SCENERY_ITEMS_PER_CHUNK,
  seedLocalScenery,
} from "./localScenery";

function fixture() {
  const rings = [
    [
      [0, 0],
      [20, 0],
      [20, -20],
      [0, -20],
    ],
    [
      [8, -8],
      [10, -8],
      [10, -10],
      [8, -10],
    ],
  ].map((ring) => ring.map(([x, y]) => new Vector2(x, y)));
  const bounds = new Box3(new Vector3(0, 0, 0), new Vector3(20, 1, 20));
  const item = (x: number, z: number) => ({
    province: "11",
    position: new Vector3(x, 1.005, z),
    scale: 0.3,
    rotation: 0.7,
  });
  const world = {
    provinces: [
      {
        id: "11",
        islandCount: 1,
        geometry: new BufferGeometry(),
        outline: new BufferGeometry(),
        bounds,
        rings,
        anchor: new Vector3(2, 1, 15),
        scenery: { trees: [item(3, 3), item(14, 14)], houses: [item(4, 3)] },
      },
    ],
    lake: new BufferGeometry(),
    bounds,
    coastlines: [{ shape: rings[0], holes: [rings[1]] }],
    surfaceHeight: vi.fn((point: Vector2) =>
      point.x < 0 ||
      point.x > 20 ||
      point.y > 0 ||
      point.y < -20 ||
      (point.x > 8 && point.x < 10 && point.y < -8 && point.y > -10)
        ? 0
        : 1,
    ),
    dispose: () => {},
  } as unknown as WorldGeometry;
  const points = Array.from(
    { length: 101 },
    (_, i) => new Vector3(i / 5, 1, 6),
  );
  const network: RoadNetwork = {
    roads: [
      {
        id: "road",
        points,
        distances: points.map((_, i) => i / 5),
        length: 20,
        provinces: points.map(() => "11"),
      },
    ],
    cities: [
      {
        id: "city",
        position: new Vector3(14, 1, 6),
        size: 1,
        towers: [{ x: 14, z: 7.2, w: 0.24, h: 0.7, seed: 0.5 }],
      },
    ],
  };
  seedRoadNetwork(world, network);
  const site = new Vector3(10, 1, 15);
  seedStructureSites(
    world,
    new Map([
      ["sumatra", { land: [{ position: site, rotation: 0 }], coast: [] }],
    ]),
  );
  return { world, network, site };
}

describe("local scenery worker data", () => {
  it("creates deterministic bounded detail without changing the original props", () => {
    const { world } = fixture();
    const original = structuredClone(world.provinces[0].scenery);
    const chunks = getLocalScenery(world),
      items = chunks.flatMap((c) => c.items);
    expect(chunks).toEqual(getLocalScenery(fixture().world));
    expect(structuredClone(world.provinces[0].scenery)).toEqual(original);
    expect(items.length).toBeGreaterThan(100);
    expect(items.length).toBeLessThanOrEqual(MAX_LOCAL_SCENERY_ITEMS);
    expect(new Set(items.map((item) => item.tier))).toEqual(new Set([1, 2]));
    expect(new Set(items.map((item) => item.kind))).toEqual(
      new Set(["tree", "house", "tree-detail", "house-detail"]),
    );
    for (const chunk of chunks) {
      expect(chunk.items.length).toBeLessThanOrEqual(
        MAX_LOCAL_SCENERY_ITEMS_PER_CHUNK,
      );
      for (const item of chunk.items) {
        expect(item.x).toBeGreaterThanOrEqual(chunk.minX);
        expect(item.x).toBeLessThan(chunk.maxX);
        expect(item.z).toBeGreaterThanOrEqual(chunk.minZ);
        expect(item.z).toBeLessThan(chunk.maxZ);
        expect(item.province).toBe("11");
      }
    }
    const detail = items.find((i) => i.kind === "house-detail")!;
    expect(detail).toMatchObject({
      x: 4,
      y: 1.005,
      z: 3,
      scale: 0.3,
      rotation: 0.7,
    });
  });

  it("keeps footprints on land and away from roads, cities, markers, and future buildings", () => {
    const { world, network, site } = fixture();
    const items = getLocalScenery(world)
      .flatMap((c) => c.items)
      .filter((i) => i.kind === "tree" || i.kind === "house");
    for (const item of items) {
      expect(
        onRoadOrCity(
          network,
          item.x,
          item.z,
          item.kind === "tree" ? 0.22 : 0.1 + item.scale * 0.75,
          0,
        ),
      ).toBe(false);
      for (const city of network.cities)
        for (const tower of city.towers)
          expect(
            Math.hypot(item.x - tower.x, item.z - tower.z),
          ).toBeGreaterThanOrEqual((item.scale + tower.w) * 0.75);
      expect(
        Math.hypot(item.x - site.x, item.z - site.z),
      ).toBeGreaterThanOrEqual(0.8 + item.scale * 0.75);
      expect(Math.hypot(item.x - 2, item.z - 15)).toBeGreaterThanOrEqual(0.65);
      const footprint = item.scale * (item.kind === "house" ? 0.55 : 0.13);
      for (const [dx, dz] of [
        [0, 0],
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
        [-0.7, -0.7],
        [0.7, 0.7],
      ]) {
        const height = world.surfaceHeight(
          new Vector2(item.x + dx * footprint, -item.z - dz * footprint),
        );
        expect(height).toBe(1);
        expect(item.y).toBeCloseTo(height + 0.005);
      }
    }
    for (let i = 0; i < items.length; i++)
      for (const other of items.slice(i + 1))
        expect(
          Math.hypot(items[i].x - other.x, items[i].z - other.z),
        ).toBeGreaterThanOrEqual((items[i].scale + other.scale) * 0.75 - 1e-10);
  });

  it("rejects steep house footprints instead of placing floating buildings", () => {
    const { world } = fixture();
    world.surfaceHeight = (point) => 1 + (point.x % 1) * 0.8;
    const added = getLocalScenery(world).flatMap((c) => c.items);
    expect(added.some((item) => item.kind === "house-detail")).toBe(true);
    expect(added.filter((item) => item.kind === "house")).toHaveLength(0);
  });

  it("reuses hydrated chunks without querying terrain on the main thread", () => {
    const { world } = fixture();
    const expected = structuredClone(getLocalScenery(world));
    const restored = fixture().world;
    seedLocalScenery(restored, expected);
    expect(getLocalScenery(restored)).toBe(expected);
    expect(restored.surfaceHeight).not.toHaveBeenCalled();
    expect(getLocalScenery(world)).toBe(getLocalScenery(world));
  });
});
