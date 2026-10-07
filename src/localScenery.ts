import { Vector2 } from "three";
import type { Scenery, WorldGeometry } from "./mapGeometry";
import { buildRoadNetwork, onRoadOrCity } from "./roadNetwork";
import { getStructureSites } from "./structureLayout";
import { regionForProvince } from "./engine/gameRegions";

export type LocalSceneryKind =
  "tree" | "house" | "tree-detail" | "house-detail";
/** Tier 1 appears at regional zoom; tier 2 supplies the close view. */
export type LocalSceneryItem = {
  province: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
  scale: number;
  kind: LocalSceneryKind;
  tier: 1 | 2;
};
export type LocalSceneryChunk = {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  items: LocalSceneryItem[];
};

export const LOCAL_SCENERY_CHUNK_SIZE = 4;
export const MAX_LOCAL_SCENERY_ITEMS = 6000;
export const MAX_LOCAL_SCENERY_ITEMS_PER_CHUNK = 96;
const cache = new WeakMap<WorldGeometry, LocalSceneryChunk[]>();
const random = (seed: number) => {
  const n = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return n - Math.floor(n);
};

function insideRing(x: number, z: number, ring: Vector2[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i],
      b = ring[j];
    if (
      a.y > -z !== b.y > -z &&
      x < ((b.x - a.x) * (-z - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}
function onProvince(
  x: number,
  z: number,
  p: WorldGeometry["provinces"][number],
) {
  if (
    x < p.bounds.min.x ||
    x > p.bounds.max.x ||
    z < p.bounds.min.z ||
    z > p.bounds.max.z
  )
    return false;
  // Rings include disconnected islands and their holes; parity handles both.
  return p.rings.reduce(
    (inside, ring) => inside !== insideRing(x, z, ring),
    false,
  );
}

type Occupant = { x: number; z: number; radius: number };
function occupancy() {
  const grid = new Map<string, Occupant[]>();
  const cellSize = 1.5;
  return {
    add(item: Occupant) {
      const key = `${Math.floor(item.x / cellSize)},${Math.floor(item.z / cellSize)}`;
      const items = grid.get(key) ?? [];
      items.push(item);
      grid.set(key, items);
    },
    near(x: number, z: number, radius: number) {
      const cx = Math.floor(x / cellSize),
        cz = Math.floor(z / cellSize);
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++)
          if (
            grid
              .get(`${cx + dx},${cz + dz}`)
              ?.some(
                (item) =>
                  Math.hypot(item.x - x, item.z - z) < radius + item.radius,
              )
          )
            return true;
      return false;
    },
  };
}

export function seedLocalScenery(
  world: WorldGeometry,
  chunks: LocalSceneryChunk[],
) {
  cache.set(world, chunks);
}

/** Called while packing the worker result; hydration seeds this cache on the main thread. */
export function getLocalScenery(world: WorldGeometry): LocalSceneryChunk[] {
  const cached = cache.get(world);
  if (cached) return cached;
  const network = buildRoadNetwork(world);
  const occupied = occupancy(),
    reserved = occupancy();
  const centres = new Map<string, { x: number; z: number; count: number }>();
  for (const p of world.provinces) {
    const region = regionForProvince(p.id)?.id;
    if (!region) continue;
    const centre = centres.get(region) ?? { x: 0, z: 0, count: 0 };
    centre.x += p.anchor.x;
    centre.z += p.anchor.z;
    centre.count++;
    centres.set(region, centre);
  }
  for (const centre of centres.values()) {
    centre.x /= centre.count;
    centre.z /= centre.count;
  }
  for (const [region, sites] of getStructureSites(world)) {
    const coast = new Set<(typeof sites.coast)[number]>();
    // Ports use the coast nearest a partner region; tourism uses the farthest
    // coast from its own centre. The other shoreline candidates stay available.
    for (const [targetRegion, centre] of centres) {
      let chosen: (typeof sites.coast)[number] | undefined;
      let best = targetRegion === region ? -Infinity : Infinity;
      for (const site of sites.coast) {
        const distance = Math.hypot(
          site.position.x - centre.x,
          site.position.z - centre.z,
        );
        if (targetRegion === region ? distance > best : distance < best) {
          best = distance;
          chosen = site;
        }
      }
      if (chosen) coast.add(chosen);
    }
    for (const site of [...sites.land, ...coast])
      reserved.add({ x: site.position.x, z: site.position.z, radius: 0.8 });
  }
  for (const province of world.provinces)
    for (const item of [...province.scenery.trees, ...province.scenery.houses])
      occupied.add({
        x: item.position.x,
        z: item.position.z,
        radius: item.scale * 0.7,
      });
  for (const city of network.cities)
    for (const tower of city.towers)
      occupied.add({ x: tower.x, z: tower.z, radius: tower.w * 0.75 });

  const chunks = new Map<string, LocalSceneryChunk>();
  let count = 0;
  const add = (item: LocalSceneryItem) => {
    if (count >= MAX_LOCAL_SCENERY_ITEMS) return false;
    const cx = Math.floor(item.x / LOCAL_SCENERY_CHUNK_SIZE);
    const cz = Math.floor(item.z / LOCAL_SCENERY_CHUNK_SIZE);
    const id = `${cx},${cz}`;
    let chunk = chunks.get(id);
    if (chunk && chunk.items.length >= MAX_LOCAL_SCENERY_ITEMS_PER_CHUNK)
      return false;
    if (!chunk) {
      chunk = {
        id,
        minX: cx * LOCAL_SCENERY_CHUNK_SIZE,
        maxX: (cx + 1) * LOCAL_SCENERY_CHUNK_SIZE,
        minZ: cz * LOCAL_SCENERY_CHUNK_SIZE,
        maxZ: (cz + 1) * LOCAL_SCENERY_CHUNK_SIZE,
        items: [],
      };
      chunks.set(id, chunk);
    }
    chunk.items.push(item);
    count++;
    return true;
  };
  const markerFree = (
    x: number,
    z: number,
    p: WorldGeometry["provinces"][number],
  ) => Math.hypot(x - p.anchor.x, z - p.anchor.z) >= 0.65;
  const detail = (
    item: Scenery,
    kind: "tree-detail" | "house-detail",
    p: WorldGeometry["provinces"][number],
  ) => {
    const { x, y, z } = item.position;
    if (
      onRoadOrCity(network, x, z, 0.22, 1.1) ||
      reserved.near(x, z, 0) ||
      !markerFree(x, z, p)
    )
      return;
    add({
      province: item.province,
      x,
      y,
      z,
      scale: item.scale,
      rotation: item.rotation,
      kind,
      tier: 2,
    });
  };
  const probe = new Vector2();
  const place = (
    p: WorldGeometry["provinces"][number],
    x: number,
    z: number,
    seed: number,
    kind: "tree" | "house",
    tier: 1 | 2,
  ) => {
    const scale =
      kind === "house"
        ? 0.32 + random(seed + 9) * 0.1
        : 0.27 + random(seed + 9) * 0.09;
    const radius = scale * 0.75;
    if (
      !markerFree(x, z, p) ||
      occupied.near(x, z, radius) ||
      reserved.near(x, z, radius) ||
      onRoadOrCity(network, x, z, kind === "tree" ? 0.22 : 0.1 + radius, 0) ||
      !onProvince(x, z, p)
    )
      return;
    let low = Infinity,
      high = -Infinity;
    // Houses test the whole footprint, trees only their trunk; foliage may overhang a slope.
    const footprint = kind === "house" ? scale * 0.55 : scale * 0.13;
    for (const [dx, dz] of [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [0.7, 0.7],
      [0.7, -0.7],
      [-0.7, 0.7],
      [-0.7, -0.7],
    ]) {
      const px = x + dx * footprint,
        pz = z + dz * footprint;
      if (!onProvince(px, pz, p)) return;
      const y = world.surfaceHeight(probe.set(px, -pz));
      if (y <= 0.05 || y > 2.65) return;
      low = Math.min(low, y);
      high = Math.max(high, y);
    }
    if (high - low > (kind === "house" ? 0.1 : 0.055)) return;
    if (
      add({
        province: p.id,
        x,
        y: high + 0.005,
        z,
        scale,
        rotation: random(seed + 17) * Math.PI * 2,
        kind,
        tier,
      })
    )
      occupied.add({ x, z, radius });
  };

  for (const p of world.provinces) {
    p.scenery.houses.forEach((item) => detail(item, "house-detail", p));
    p.scenery.trees.forEach((item) => detail(item, "tree-detail", p));
    // Grow existing groves rather than covering mountains with uniform decoration.
    p.scenery.trees.forEach((item, index) => {
      for (let i = 0; i < 3; i++) {
        const seed = Number(p.id) * 1500 + index * 7 + i;
        const angle = random(seed) * Math.PI * 2;
        const reach = 0.5 + random(seed + 1) * 0.43;
        place(
          p,
          item.position.x + Math.cos(angle) * reach,
          item.position.z + Math.sin(angle) * reach,
          seed,
          "tree",
          i === 0 ? 1 : 2,
        );
      }
    });
    p.scenery.houses.forEach((item, index) => {
      for (let i = 0; i < 10; i++) {
        const seed = Number(p.id) * 1900 + index * 19 + i;
        const angle = random(seed) * Math.PI * 2;
        const reach = 0.5 + random(seed + 1) * 1.25;
        place(
          p,
          item.position.x + Math.cos(angle) * reach,
          item.position.z + Math.sin(angle) * reach,
          seed,
          "house",
          i % 3 === 0 ? 1 : 2,
        );
      }
    });
    const width = p.bounds.max.x - p.bounds.min.x;
    const depth = p.bounds.max.z - p.bounds.min.z;
    const attempts = Math.min(
      1000,
      Math.max(300, Math.ceil(width * depth * 4)),
    );
    for (let i = 0; i < attempts; i++) {
      const seed = Number(p.id) * 2700 + i;
      const x = p.bounds.min.x + random(seed) * width;
      const z = p.bounds.min.z + random(seed + 1) * depth;
      // Broad gaps between groves keep valleys and the faceted terrain readable.
      if (random(Math.floor(x / 2) * 37 + Math.floor(z / 2) * 101) < 0.42)
        continue;
      place(p, x, z, seed, "tree", i % 3 === 0 ? 1 : 2);
    }
  }
  for (const road of network.roads)
    for (let i = 5; i < road.points.length - 1; i += 11) {
      const a = road.points[i - 1],
        b = road.points[i + 1],
        point = road.points[i];
      const dx = b.x - a.x,
        dz = b.z - a.z;
      const length = Math.hypot(dx, dz);
      if (!length) continue;
      const seed = i * 59 + point.x * 13 + point.z * 23;
      const side = random(seed) > 0.5 ? 1 : -1;
      const setback = 0.6 + random(seed + 1) * 0.5;
      const x = point.x - (dz / length) * setback * side;
      const z = point.z + (dx / length) * setback * side;
      const p = world.provinces.find((candidate) =>
        onProvince(x, z, candidate),
      );
      if (p) place(p, x, z, seed, "house", i % 3 === 0 ? 1 : 2);
    }
  // Small neighbourhoods surround the existing city cores, leaving the towers and roads clear.
  network.cities.forEach((city, cityIndex) => {
    for (let i = 0; i < 48; i++) {
      const seed = cityIndex * 47 + i + 59001;
      const angle = random(seed) * Math.PI * 2;
      const reach = 0.4 + random(seed + 1) * 1.6;
      const x = city.position.x + Math.cos(angle) * reach,
        z = city.position.z + Math.sin(angle) * reach;
      const p = world.provinces.find((candidate) =>
        onProvince(x, z, candidate),
      );
      if (p)
        place(
          p,
          x,
          z,
          seed,
          i % 4 === 0 ? "tree" : "house",
          i % 3 === 0 ? 1 : 2,
        );
    }
  });
  const result = [...chunks.values()];
  cache.set(world, result);
  return result;
}
