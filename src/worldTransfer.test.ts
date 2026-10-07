import { describe, expect, it, vi } from "vitest";
import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  Float32BufferAttribute,
  Shape,
  ShapeGeometry,
  Vector2,
  Vector3,
} from "three";
import { createSurfaceSampler, type WorldGeometry } from "./mapGeometry";
import {
  buildRoadNetwork,
  seedRoadNetwork,
  type RoadNetwork,
} from "./roadNetwork";
import {
  getStructureSites,
  seedStructureSites,
  type RegionSites,
} from "./structureLayout";
import { packWorld, unpackWorld, worldTransferables } from "./worldTransfer";
import type { RegionId } from "./engine/economy/types";
import { getLocalScenery, seedLocalScenery } from "./localScenery";

function fixture() {
  const provinces = [0, 10].map((x, i) => {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      "position",
      new Float32BufferAttribute(
        [x, 1 + i * 3, -0, x + 2, 2 + i * 3, 0, x, 3 + i * 3, 2],
        3,
      ),
    );
    geometry.setAttribute(
      "color",
      new Float32BufferAttribute(
        [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9],
        3,
        true,
      ),
    );
    geometry.setIndex(
      new BufferAttribute(
        i ? new Uint32Array([0, 1, 2]) : new Uint16Array([0, 1, 2]),
        1,
      ),
    );
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    const outline = new BufferGeometry();
    // Shared storage must appear only once in the worker transfer list.
    outline.setAttribute("position", geometry.getAttribute("position"));
    const anchor = new Vector3(x + 0.5, 1.75 + i * 3, 0.5);
    return {
      id: i ? "12" : "11",
      islandCount: 1,
      geometry,
      outline,
      bounds: geometry.boundingBox!.clone(),
      rings: [[new Vector2(x, 0), new Vector2(x + 2, 0), new Vector2(x, -2)]],
      anchor,
      scenery: {
        trees: [
          {
            province: i ? "12" : "11",
            position: anchor.clone(),
            scale: 0.3,
            rotation: 0.7,
          },
        ],
        houses: [
          {
            province: i ? "12" : "11",
            position: anchor.clone().add(new Vector3(0.1, 0, 0)),
            scale: 0.4,
            rotation: 1.2,
          },
        ],
      },
    };
  });
  const surface = createSurfaceSampler(provinces.map((p) => p.geometry));
  const world: WorldGeometry = {
    provinces,
    lake: new ShapeGeometry(
      new Shape([new Vector2(0, 0), new Vector2(1, 0), new Vector2(0, 1)]),
    ),
    bounds: provinces.reduce((bounds, p) => bounds.union(p.bounds), new Box3()),
    coastlines: [
      {
        shape: provinces[0].rings[0],
        holes: [
          [
            new Vector2(0.1, -0.1),
            new Vector2(0.2, -0.1),
            new Vector2(0.1, -0.2),
          ],
        ],
      },
    ],
    surfaceIndex: surface.index,
    surfaceHeight: surface.heightAt,
    dispose: () => {},
  };
  const network: RoadNetwork = {
    cities: [
      {
        id: "test-city",
        position: provinces[0].anchor.clone(),
        size: 0.7,
        towers: [{ x: 0.5, z: 0.5, w: 0.2, h: 0.8, seed: 0.4 }],
      },
    ],
    roads: [
      {
        id: "test-road",
        points: [new Vector3(0.2, 1.3, 0.2), new Vector3(0.5, 1.75, 0.5)],
        distances: [0, 0.6],
        length: 0.6,
        provinces: ["11", "11"],
      },
    ],
  };
  const sites = new Map<RegionId, RegionSites>([
    [
      "sumatra",
      {
        land: [{ position: new Vector3(0.4, 1.6, 0.4), rotation: 0.2 }],
        coast: [{ position: new Vector3(0.1, 1.1, 0.05), rotation: 0.9 }],
      },
    ],
  ]);
  seedRoadNetwork(world, network);
  seedStructureSites(world, sites);
  return { world, network, sites };
}

const geometries = (world: WorldGeometry) => [
  world.lake,
  ...world.provinces.flatMap((p) => [p.geometry, p.outline]),
];
const bytes = (array: ArrayBufferView) =>
  Array.from(new Uint8Array(array.buffer, array.byteOffset, array.byteLength));
const geometrySnapshot = (geometry: BufferGeometry) => ({
  attributes: Object.fromEntries(
    Object.entries(geometry.attributes).map(([name, a]) => [
      name,
      {
        bytes: bytes(a.array),
        type: a.array.constructor.name,
        itemSize: a.itemSize,
        normalized: a.normalized,
      },
    ]),
  ),
  index: geometry.index
    ? {
        bytes: bytes(geometry.index.array),
        type: geometry.index.array.constructor.name,
      }
    : null,
  bounds: geometry.boundingBox?.clone(),
  sphere: geometry.boundingSphere?.clone(),
});

describe("world worker transfer", () => {
  it("transfers exact geometry bytes and bounds, with shared buffers listed once", () => {
    const { world } = fixture();
    const data = packWorld(world);
    const expected = geometries(world).map(geometrySnapshot);
    const buffers = worldTransferables(data);
    expect(new Set(buffers).size).toBe(buffers.length);
    const transferred = structuredClone(data, { transfer: buffers });
    expect(buffers.every((buffer) => buffer.byteLength === 0)).toBe(true);
    const restored = unpackWorld(transferred);
    expect(geometries(restored).map(geometrySnapshot)).toEqual(expected);
    expect(
      restored.provinces[0].outline.getAttribute("position").array.buffer,
    ).toBe(
      restored.provinces[0].geometry.getAttribute("position").array.buffer,
    );
    expect(restored.bounds).toEqual(world.bounds);
    expect(
      restored.provinces[0].rings[0][1].distanceTo(new Vector2(2, 0)),
    ).toBe(0);
    expect(
      restored.provinces[0].anchor.clone().equals(world.provinces[0].anchor),
    ).toBe(true);
    expect(
      restored.provinces[0].scenery.trees[0].position.distanceTo(
        world.provinces[0].scenery.trees[0].position,
      ),
    ).toBe(0);
    expect(
      restored.provinces[1].scenery.houses[0].position
        .clone()
        .equals(world.provinces[1].scenery.houses[0].position),
    ).toBe(true);
    expect(
      restored.coastlines[0].holes[0][0]
        .clone()
        .equals(world.coastlines[0].holes[0][0]),
    ).toBe(true);
  });

  it("restores the surface sampler after its geometry and lookup buffers leave the worker", () => {
    const { world } = fixture();
    const points = [
      new Vector2(0.5, -0.5),
      new Vector2(10.5, -0.5),
      new Vector2(40, 40),
    ];
    const expected = points.map(world.surfaceHeight);
    expect(expected).toEqual([1.75, 4.75, 0]);
    const data = packWorld(world);
    const indexBytes = Object.fromEntries(
      Object.entries(data.surfaceIndex)
        .filter(([, value]) => ArrayBuffer.isView(value))
        .map(([key, value]) => [key, bytes(value as ArrayBufferView)]),
    );
    const restored = unpackWorld(
      structuredClone(data, { transfer: worldTransferables(data) }),
    );
    expect(points.map(restored.surfaceHeight)).toEqual(expected);
    expect(restored.surfaceIndex.cells).toBeInstanceOf(Map);
    for (const [key, expectedBytes] of Object.entries(indexBytes))
      expect(
        bytes(
          restored.surfaceIndex[
            key as keyof typeof restored.surfaceIndex
          ] as ArrayBufferView,
        ),
      ).toEqual(expectedBytes);
  });

  it("seeds the real road and structure caches with restored vector methods", () => {
    const { world, network, sites } = fixture();
    const data = packWorld(world);
    const restored = unpackWorld(
      structuredClone(data, { transfer: worldTransferables(data) }),
    );
    const roads = buildRoadNetwork(restored);
    const restoredSites = getStructureSites(restored);
    expect(roads).toEqual(network);
    expect(restoredSites).toEqual(sites);
    expect(buildRoadNetwork(restored)).toBe(roads);
    expect(getStructureSites(restored)).toBe(restoredSites);
    expect(
      roads.cities[0].position.clone().equals(network.cities[0].position),
    ).toBe(true);
    expect(
      roads.roads[0].points[1].distanceTo(network.roads[0].points[1]),
    ).toBe(0);
    expect(
      restoredSites
        .get("sumatra")!
        .land[0].position.clone()
        .equals(sites.get("sumatra")!.land[0].position),
    ).toBe(true);
    expect(
      restoredSites
        .get("sumatra")!
        .coast[0].position.distanceTo(sites.get("sumatra")!.coast[0].position),
    ).toBe(0);
  });

  it("disposes each restored GPU geometry without disposing the source objects", () => {
    const { world } = fixture();
    const data = packWorld(world);
    const sourceDisposed = vi.fn();
    geometries(world).forEach((geometry) =>
      geometry.addEventListener("dispose", sourceDisposed),
    );
    const restored = unpackWorld(
      structuredClone(data, { transfer: worldTransferables(data) }),
    );
    const disposed = geometries(restored).map((geometry) => {
      const listener = vi.fn();
      geometry.addEventListener("dispose", listener);
      return listener;
    });
    restored.dispose();
    for (const listener of disposed) expect(listener).toHaveBeenCalledTimes(1);
    expect(sourceDisposed).not.toHaveBeenCalled();
  });

  it("hydrates local scenery chunks without regenerating or resampling them", () => {
    const { world } = fixture();
    const localScenery = [
      {
        id: "0,0",
        minX: 0,
        maxX: 4,
        minZ: 0,
        maxZ: 4,
        items: [
          {
            province: "11",
            kind: "house" as const,
            tier: 2 as const,
            x: 0.25,
            y: 1.005,
            z: 0.25,
            scale: 0.33,
            rotation: 1.2,
          },
        ],
      },
    ];
    seedLocalScenery(world, localScenery);
    const data = packWorld(world);
    expect(data.localScenery).toBe(localScenery);
    const restored = unpackWorld(
      structuredClone(data, { transfer: worldTransferables(data) }),
    );
    restored.surfaceHeight = vi.fn(() => {
      throw new Error("Unexpected main-thread resampling");
    });
    expect(getLocalScenery(restored)).toEqual(localScenery);
    expect(restored.surfaceHeight).not.toHaveBeenCalled();
  });
});
