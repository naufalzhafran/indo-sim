import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  Sphere,
  Vector2,
  Vector3,
} from "three";
import {
  createSurfaceSampler,
  type Scenery,
  type WorldGeometry,
} from "./mapGeometry";
import {
  buildRoadNetwork,
  seedRoadNetwork,
  type RoadNetwork,
} from "./roadNetwork";
import {
  getStructureSites,
  seedStructureSites,
  type Site,
} from "./structureLayout";
import type { RegionId } from "./engine/economy/types";
import { getLocalScenery, seedLocalScenery } from "./localScenery";
import {
  buildTransportNetwork,
  seedTransportNetwork,
  type TransportNetwork,
} from "./transportNetwork";

type Point2 = [number, number];
type Point3 = [number, number, number];
type Bounds = [Point3, Point3];
type GeometryData = {
  attributes: Record<
    string,
    { array: Float32Array; itemSize: number; normalized: boolean }
  >;
  index: Uint16Array | Uint32Array | null;
  bounds: Bounds;
  sphere: { center: Point3; radius: number };
};
const point2 = (p: Vector2): Point2 => [p.x, p.y];
const point3 = (p: Vector3): Point3 => [p.x, p.y, p.z];
const boundsData = (b: Box3): Bounds => [point3(b.min), point3(b.max)];
const readBounds = ([min, max]: Bounds) =>
  new Box3(new Vector3(...min), new Vector3(...max));

function geometryData(geometry: BufferGeometry): GeometryData {
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  if (!geometry.boundingSphere) geometry.computeBoundingSphere();
  return {
    attributes: Object.fromEntries(
      Object.entries(geometry.attributes).map(([key, a]) => [
        key,
        {
          array: a.array as Float32Array,
          itemSize: a.itemSize,
          normalized: a.normalized,
        },
      ]),
    ),
    index: (geometry.index?.array as GeometryData["index"]) ?? null,
    bounds: boundsData(geometry.boundingBox!),
    sphere: {
      center: point3(geometry.boundingSphere!.center),
      radius: geometry.boundingSphere!.radius,
    },
  };
}
function readGeometry(data: GeometryData) {
  const geometry = new BufferGeometry();
  for (const [key, a] of Object.entries(data.attributes))
    geometry.setAttribute(
      key,
      new BufferAttribute(a.array, a.itemSize, a.normalized),
    );
  if (data.index) geometry.setIndex(new BufferAttribute(data.index, 1));
  geometry.boundingBox = readBounds(data.bounds);
  geometry.boundingSphere = new Sphere(
    new Vector3(...data.sphere.center),
    data.sphere.radius,
  );
  return geometry;
}
const sceneryData = (s: Scenery) => ({ ...s, position: point3(s.position) });
const readScenery = (s: ReturnType<typeof sceneryData>): Scenery => ({
  ...s,
  position: new Vector3(...s.position),
});
const siteData = (s: Site) => ({
  rotation: s.rotation,
  position: point3(s.position),
});
const readSite = (s: ReturnType<typeof siteData>): Site => ({
  ...s,
  position: new Vector3(...s.position),
});

/** Only immutable scene data crosses the worker boundary; GPU resources stay on the main thread. */
export function packWorld(world: WorldGeometry) {
  const network = buildRoadNetwork(world);
  const transport = buildTransportNetwork(world);
  return {
    provinces: world.provinces.map((p) => ({
      id: p.id,
      islandCount: p.islandCount,
      geometry: geometryData(p.geometry),
      outline: geometryData(p.outline),
      rings: p.rings.map((r) => r.map(point2)),
      bounds: boundsData(p.bounds),
      anchor: point3(p.anchor),
      scenery: {
        trees: p.scenery.trees.map(sceneryData),
        houses: p.scenery.houses.map(sceneryData),
      },
    })),
    lake: geometryData(world.lake),
    bounds: boundsData(world.bounds),
    coastlines: world.coastlines.map((c) => ({
      shape: c.shape.map(point2),
      holes: c.holes.map((r) => r.map(point2)),
    })),
    surfaceIndex: world.surfaceIndex,
    network: {
      cities: network.cities.map((c) => ({
        ...c,
        position: point3(c.position),
      })),
      roads: network.roads.map((r) => ({ ...r, points: r.points.map(point3) })),
    },
    sites: [...getStructureSites(world)].map(
      ([id, sites]) =>
        [
          id,
          {
            land: sites.land.map(siteData),
            coast: sites.coast.map(siteData),
          },
        ] as const,
    ),
    localScenery: getLocalScenery(world),
    transport: {
      sea: transport.sea.map((r) => ({ ...r, points: r.points.map(point3) })),
      rail: transport.rail.map((r) => ({ ...r, points: r.points.map(point3) })),
      airports: transport.airports.map((a) => ({
        ...a,
        position: point3(a.position),
      })),
      fishing: transport.fishing.map((f) => ({
        ...f,
        position: point3(f.position),
      })),
    },
  };
}
export type PackedWorld = ReturnType<typeof packWorld>;

export function worldTransferables(data: PackedWorld): ArrayBuffer[] {
  const buffers = new Set<ArrayBuffer>();
  const add = (a: ArrayBufferView) => buffers.add(a.buffer as ArrayBuffer);
  for (const g of [
    data.lake,
    ...data.provinces.flatMap((p) => [p.geometry, p.outline]),
  ]) {
    for (const a of Object.values(g.attributes)) add(a.array);
    if (g.index) add(g.index);
  }
  for (const value of Object.values(data.surfaceIndex))
    if (ArrayBuffer.isView(value)) add(value);
  return [...buffers];
}

function disposeWorld(
  provinces: { geometry: BufferGeometry; outline: BufferGeometry }[],
  lake: BufferGeometry,
) {
  return () => {
    for (const p of provinces) {
      p.geometry.dispose();
      p.outline.dispose();
    }
    lake.dispose();
  };
}

export function unpackWorld(data: PackedWorld): WorldGeometry {
  const provinces = data.provinces.map((p) => ({
    ...p,
    geometry: readGeometry(p.geometry),
    outline: readGeometry(p.outline),
    rings: p.rings.map((r) => r.map((v) => new Vector2(...v))),
    bounds: readBounds(p.bounds),
    anchor: new Vector3(...p.anchor),
    scenery: {
      trees: p.scenery.trees.map(readScenery),
      houses: p.scenery.houses.map(readScenery),
    },
  }));
  const lake = readGeometry(data.lake);
  const world: WorldGeometry = {
    provinces,
    lake,
    bounds: readBounds(data.bounds),
    coastlines: data.coastlines.map((c) => ({
      shape: c.shape.map((v) => new Vector2(...v)),
      holes: c.holes.map((r) => r.map((v) => new Vector2(...v))),
    })),
    surfaceIndex: data.surfaceIndex,
    surfaceHeight: createSurfaceSampler(
      provinces.map((p) => p.geometry),
      data.surfaceIndex,
    ).heightAt,
    dispose: disposeWorld(provinces, lake),
  };
  const network: RoadNetwork = {
    cities: data.network.cities.map((c) => ({
      ...c,
      position: new Vector3(...c.position),
    })),
    roads: data.network.roads.map((r) => ({
      ...r,
      points: r.points.map((v) => new Vector3(...v)),
    })),
  };
  seedRoadNetwork(world, network);
  seedStructureSites(
    world,
    new Map(
      data.sites.map(([id, s]) => [
        id as RegionId,
        {
          land: s.land.map(readSite),
          coast: s.coast.map(readSite),
        },
      ]),
    ),
  );
  seedLocalScenery(world, data.localScenery);
  const transport: TransportNetwork = {
    sea: data.transport.sea.map((r) => ({
      ...r,
      points: r.points.map((v) => new Vector3(...v)),
    })),
    rail: data.transport.rail.map((r) => ({
      ...r,
      points: r.points.map((v) => new Vector3(...v)),
    })),
    airports: data.transport.airports.map((a) => ({
      ...a,
      position: new Vector3(...a.position),
    })),
    fishing: data.transport.fishing.map((f) => ({
      ...f,
      position: new Vector3(...f.position),
    })),
  };
  seedTransportNetwork(world, transport);
  return world;
}
