import { Vector2, Vector3 } from "three";
import { projectCoordinate, type WorldGeometry } from "./mapGeometry";

/** Major cities the road network connects: [id, lon, lat, size 0.6–1]. */
const CITIES: [string, number, number, number][] = [
  ["banda-aceh", 95.32, 5.55, 0.7],
  ["medan", 98.67, 3.59, 1],
  ["pekanbaru", 101.45, 0.51, 0.75],
  ["padang", 100.35, -0.95, 0.75],
  ["jambi", 103.61, -1.61, 0.7],
  ["palembang", 104.76, -2.99, 0.9],
  ["bandar-lampung", 105.26, -5.43, 0.75],
  ["merak", 106.0, -5.93, 0.6],
  ["jakarta", 106.85, -6.2, 1],
  ["bandung", 107.61, -6.92, 0.9],
  ["cirebon", 108.55, -6.73, 0.65],
  ["semarang", 110.42, -6.97, 0.85],
  ["yogyakarta", 110.36, -7.8, 0.8],
  ["surabaya", 112.75, -7.25, 1],
  ["banyuwangi", 114.37, -8.22, 0.6],
  ["gilimanuk", 114.44, -8.17, 0.6],
  ["denpasar", 115.22, -8.65, 0.85],
  ["singaraja", 115.09, -8.11, 0.6],
  ["mataram", 116.1, -8.58, 0.7],
  ["selong", 116.53, -8.65, 0.6],
  ["sumbawa-besar", 117.42, -8.5, 0.6],
  ["bima", 118.73, -8.46, 0.6],
  ["labuan-bajo", 119.88, -8.5, 0.6],
  ["ruteng", 120.46, -8.6, 0.6],
  ["ende", 121.66, -8.84, 0.6],
  ["maumere", 122.21, -8.62, 0.6],
  ["kupang", 123.6, -10.17, 0.75],
  ["atambua", 124.9, -9.1, 0.6],
  ["pontianak", 109.33, -0.03, 0.8],
  ["palangkaraya", 113.92, -2.21, 0.65],
  ["banjarmasin", 114.59, -3.32, 0.8],
  ["balikpapan", 116.83, -1.24, 0.8],
  ["samarinda", 117.15, -0.5, 0.75],
  ["manado", 124.84, 1.49, 0.8],
  ["palu", 119.87, -0.9, 0.7],
  ["makassar", 119.43, -5.15, 1],
  ["kendari", 122.51, -3.97, 0.65],
  ["ambon", 128.18, -3.7, 0.7],
  ["ternate", 127.38, 0.79, 0.6],
  ["sorong", 131.26, -0.88, 0.7],
  ["manokwari", 134.06, -0.86, 0.65],
  ["nabire", 135.48, -3.37, 0.6],
  ["timika", 136.89, -4.55, 0.65],
  ["wamena", 138.93, -4.1, 0.6],
  ["jayapura", 140.72, -2.53, 0.75],
  ["merauke", 140.4, -8.49, 0.65],
];
/** Trunk corridors between those cities (Trans-Sumatra, Trans-Java, …). */
const CORRIDORS: [string, string][] = [
  ["banda-aceh", "medan"],
  ["medan", "pekanbaru"],
  ["pekanbaru", "padang"],
  ["pekanbaru", "jambi"],
  ["jambi", "palembang"],
  ["palembang", "bandar-lampung"],
  ["bandar-lampung", "merak"],
  ["merak", "jakarta"],
  ["jakarta", "bandung"],
  ["jakarta", "cirebon"],
  ["cirebon", "semarang"],
  ["bandung", "yogyakarta"],
  ["semarang", "yogyakarta"],
  ["semarang", "surabaya"],
  ["yogyakarta", "surabaya"],
  ["surabaya", "banyuwangi"],
  ["gilimanuk", "denpasar"],
  ["denpasar", "singaraja"],
  ["mataram", "selong"],
  ["sumbawa-besar", "bima"],
  ["labuan-bajo", "ruteng"],
  ["ruteng", "ende"],
  ["ende", "maumere"],
  ["kupang", "atambua"],
  ["pontianak", "palangkaraya"],
  ["palangkaraya", "banjarmasin"],
  ["banjarmasin", "balikpapan"],
  ["balikpapan", "samarinda"],
  ["manado", "palu"],
  ["palu", "makassar"],
  ["makassar", "kendari"],
  ["sorong", "manokwari"],
  ["manokwari", "nabire"],
  ["nabire", "timika"],
  ["timika", "wamena"],
  ["wamena", "jayapura"],
  ["timika", "merauke"],
];

export type Tower = {
  x: number;
  z: number;
  w: number;
  h: number;
  seed: number;
};
export type City = {
  id: string;
  position: Vector3;
  size: number;
  towers: Tower[];
};
export type RoadClass = "track" | "national" | "toll";
export type RoadRun = {
  roadClass: RoadClass;
  province: string;
  from: number;
  to: number;
};
export type Road = {
  id: string;
  /** Ground points along the road, about a step apart, on the terrain. */
  points: Vector3[];
  /** Distance travelled to reach each point. */
  distances: number[];
  length: number;
  /** Province under each point, so each stretch follows its own region's stats. */
  provinces: string[];
};
export type RoadNetwork = { cities: City[]; roads: Road[] };

const GRID = 0.3;
const MARGIN = 0.14;
const SAMPLE = 0.14;
const CITY_MARGIN = 0.55;
const TOLL_AT = 66,
  NATIONAL_AT = 46;

/** Infrastructure score (0–100) → what kind of road the region has built. */
export function roadClassFor(infrastructure: number): RoadClass {
  return infrastructure >= TOLL_AT
    ? "toll"
    : infrastructure >= NATIONAL_AT
      ? "national"
      : "track";
}

/** Geometry and traffic change only when a province crosses a road-class threshold. */
export function roadClassKey(
  provinces: readonly { id: string; infrastructure: number }[],
) {
  return provinces
    .map((p) => `${p.id}:${roadClassFor(p.infrastructure)}`)
    .join("|");
}

function inside(x: number, y: number, ring: Vector2[]) {
  let result = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i],
      b = ring[j];
    if (
      a.y > y !== b.y > y &&
      x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
    )
      result = !result;
  }
  return result;
}
function edgeDistance(x: number, y: number, ring: Vector2[]) {
  let best = Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[j],
      b = ring[i],
      dx = b.x - a.x,
      dy = b.y - a.y,
      length = dx * dx + dy * dy;
    const t = length
      ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / length))
      : 0;
    best = Math.min(best, Math.hypot(x - a.x - t * dx, y - a.y - t * dy));
  }
  return best;
}

function planner(world: WorldGeometry) {
  const islands = world.coastlines.map((c) => {
    const xs = c.shape.map((p) => p.x),
      ys = c.shape.map((p) => p.y);
    return {
      ring: c.shape,
      holes: c.holes,
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  });
  /** Land at least `margin` from the coast; (x, y) is map space, z = -y. */
  const onLand = (x: number, y: number, margin = 0) => {
    for (const i of islands) {
      if (x < i.minX || x > i.maxX || y < i.minY || y > i.maxY) continue;
      if (!inside(x, y, i.ring) || i.holes.some((h) => inside(x, y, h)))
        continue;
      return margin <= 0 || edgeDistance(x, y, i.ring) >= margin;
    }
    return false;
  };
  const island = (x: number, y: number) =>
    islands.findIndex(
      (i) =>
        x >= i.minX &&
        x <= i.maxX &&
        y >= i.minY &&
        y <= i.maxY &&
        inside(x, y, i.ring),
    );
  return { onLand, island };
}

type Planner = ReturnType<typeof planner>;

/** Cheapest land route between two points: favours lowlands and avoids the coast. */
function route(
  world: WorldGeometry,
  plan: Planner,
  from: Vector2,
  to: Vector2,
  margin: number,
  used: Set<string>,
): Vector2[] | null {
  const key = (ix: number, iy: number) => `${ix},${iy}`;
  // A grid shared by every road, so later roads can join earlier ones exactly.
  const at = (ix: number, iy: number) => new Vector2(ix * GRID, iy * GRID);
  const start = [Math.round(from.x / GRID), Math.round(from.y / GRID)];
  const goal = [Math.round(to.x / GRID), Math.round(to.y / GRID)];
  const cost = new Map<string, number>([[key(start[0], start[1]), 0]]);
  const parent = new Map<string, string>();
  const open: { ix: number; iy: number; f: number }[] = [
    { ix: start[0], iy: start[1], f: 0 },
  ];
  const h = (ix: number, iy: number) =>
    Math.hypot(ix - goal[0], iy - goal[1]) * GRID * 0.4;
  const valid = new Map<string, boolean>();
  const ok = (ix: number, iy: number) => {
    const k = key(ix, iy);
    let v = valid.get(k);
    if (v === undefined) {
      const p = at(ix, iy);
      v = plan.onLand(p.x, p.y, margin);
      valid.set(k, v);
    }
    return v;
  };
  valid.set(key(start[0], start[1]), true);
  valid.set(key(goal[0], goal[1]), true);
  let guard = 0;
  while (open.length && guard++ < 120000) {
    let best = 0;
    for (let i = 1; i < open.length; i++)
      if (open[i].f < open[best].f) best = i;
    const cur = open.splice(best, 1)[0];
    const ck = key(cur.ix, cur.iy);
    if (cur.ix === goal[0] && cur.iy === goal[1]) {
      const path: Vector2[] = [];
      let k: string | undefined = ck;
      while (k) {
        const [ix, iy] = k.split(",").map(Number);
        path.push(at(ix, iy));
        used.add(k);
        k = parent.get(k);
      }
      return path.reverse();
    }
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) {
        if (!dx && !dy) continue;
        const nx = cur.ix + dx,
          ny = cur.iy + dy;
        if (!ok(nx, ny)) continue;
        const p = at(nx, ny);
        const height = Math.max(0, world.surfaceHeight(new Vector2(p.x, p.y)));
        // Roads already built are cheap to follow, so routes merge into trunks.
        const step =
          Math.hypot(dx, dy) *
          GRID *
          (1 + height * 1.6) *
          (used.has(key(nx, ny)) ? 0.15 : 1);
        const next = (cost.get(ck) ?? 0) + step;
        const nk = key(nx, ny);
        if (next < (cost.get(nk) ?? Infinity)) {
          cost.set(nk, next);
          parent.set(nk, ck);
          open.push({ ix: nx, iy: ny, f: next + h(nx, ny) });
        }
      }
  }
  return null;
}

/** Rounds the grid path's corners without leaving the land. */
function smooth(path: Vector2[], plan: Planner) {
  let points = path;
  for (let round = 0; round < 4; round++) {
    const next: Vector2[] = [points[0]];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i],
        b = points[i + 1];
      const q = a.clone().lerp(b, 0.25),
        r = a.clone().lerp(b, 0.75);
      if (i === 0 || plan.onLand(q.x, q.y, 0.06)) next.push(q);
      if (i === points.length - 2 || plan.onLand(r.x, r.y, 0.06)) next.push(r);
    }
    // Rounding the corners must not pull the ends away from their cities.
    next.push(points[points.length - 1]);
    points = next;
  }
  return points;
}

type PointGrid = Map<string, [number, number][]>;
const CELL = 0.5;
function roadGrid(points: { x: number; z: number }[]): PointGrid {
  const grid: PointGrid = new Map();
  for (const p of points) {
    const key = `${Math.floor(p.x / CELL)},${Math.floor(p.z / CELL)}`;
    const cell = grid.get(key);
    if (cell) cell.push([p.x, p.z]);
    else grid.set(key, [[p.x, p.z]]);
  }
  return grid;
}
function nearPoint(grid: PointGrid, x: number, z: number, radius: number) {
  const reach = Math.ceil(radius / CELL);
  const cx = Math.floor(x / CELL),
    cz = Math.floor(z / CELL);
  for (let i = -reach; i <= reach; i++)
    for (let j = -reach; j <= reach; j++)
      for (const [px, pz] of grid.get(`${cx + i},${cz + j}`) ?? [])
        if (Math.hypot(px - x, pz - z) < radius) return true;
  return false;
}
const gridCache = new WeakMap<RoadNetwork, PointGrid>();
/** True near a road or inside a city, where props and buildings should make room. */
export function onRoadOrCity(
  network: RoadNetwork,
  x: number,
  z: number,
  roadRadius: number,
  cityRadius: number,
) {
  let grid = gridCache.get(network);
  if (!grid)
    gridCache.set(
      network,
      (grid = roadGrid(network.roads.flatMap((r) => r.points))),
    );
  return (
    nearPoint(grid, x, z, roadRadius) ||
    network.cities.some(
      (c) =>
        Math.hypot(c.position.x - x, c.position.z - z) <
        cityRadius * (0.5 + c.size * 0.5),
    )
  );
}

const cache = new WeakMap<WorldGeometry, RoadNetwork>();
export function seedRoadNetwork(world: WorldGeometry, network: RoadNetwork) {
  cache.set(world, network);
}
export function buildRoadNetwork(world: WorldGeometry): RoadNetwork {
  let network = cache.get(world);
  if (network) return network;
  const plan = planner(world);
  // Cities sit on the nearest inland ground, so each one stands on its island.
  const cities = new Map<string, { city: City; map: Vector2 }>();
  for (const [id, lon, lat, size] of CITIES) {
    const target = projectCoordinate([lon, lat]);
    let found: Vector2 | null = null;
    // Prefer well inland ground; narrow islands settle for a closer coast.
    for (const margin of [CITY_MARGIN, 0.3, 0.14])
      for (let radius = 0; radius <= 2.2 && !found; radius += 0.1)
        for (let k = 0; k < (radius ? 16 : 1) && !found; k++) {
          const a = (k / 16) * Math.PI * 2;
          const x = target.x + Math.cos(a) * radius,
            y = target.y + Math.sin(a) * radius;
          if (plan.onLand(x, y, margin)) found = new Vector2(x, y);
        }
    if (!found) continue;
    const height = Math.max(0.03, world.surfaceHeight(found));
    cities.set(id, {
      city: {
        id,
        size,
        position: new Vector3(found.x, height, -found.y),
        towers: [],
      },
      map: found,
    });
  }
  const owner = (x: number, y: number) => {
    const inside_ = world.provinces.find(
      (p) =>
        x >= p.bounds.min.x &&
        x <= p.bounds.max.x &&
        -y >= p.bounds.min.z &&
        -y <= p.bounds.max.z &&
        inside(x, y, p.rings[0] ?? []),
    );
    if (inside_) return inside_.id;
    // Simplified outlines leave slivers; fall back to the nearest province.
    let best = "",
      near = Infinity;
    for (const p of world.provinces) {
      const d = Math.hypot(p.anchor.x - x, p.anchor.z + y);
      if (d < near) ((near = d), (best = p.id));
    }
    return best;
  };
  const roads: Road[] = [];
  const used = new Set<string>();
  for (const [a, b] of CORRIDORS) {
    const from = cities.get(a),
      to = cities.get(b);
    if (!from || !to) continue;
    if (plan.island(from.map.x, from.map.y) !== plan.island(to.map.x, to.map.y))
      continue;
    // Narrow necks of land can't keep the usual clearance from the coast.
    const grid =
      route(world, plan, from.map, to.map, MARGIN, used) ??
      route(world, plan, from.map, to.map, 0.04, used) ??
      route(world, plan, from.map, to.map, 0, used);
    if (!grid) continue;
    // The grid snaps the far end; pin both ends to their cities.
    grid[0] = from.map.clone();
    grid[grid.length - 1] = to.map.clone();
    const path = smooth(grid, plan);
    const points: Vector3[] = [],
      distances: number[] = [],
      provinces: string[] = [];
    let travelled = 0,
      carry = 0,
      last = path[0];
    const push = (p: Vector2) => {
      points.push(
        new Vector3(p.x, Math.max(0.03, world.surfaceHeight(p)), -p.y),
      );
      distances.push(travelled);
      provinces.push(owner(p.x, p.y));
    };
    push(path[0]);
    for (let i = 1; i < path.length; i++) {
      const segment = last.distanceTo(path[i]);
      let along = SAMPLE - carry;
      while (along <= segment) {
        const p = last.clone().lerp(path[i], along / segment);
        travelled += SAMPLE;
        push(p);
        along += SAMPLE;
      }
      carry = (carry + segment) % SAMPLE;
      last = path[i];
    }
    // Sampling every SAMPLE leaves the last bit short of the city; close it.
    const end = path[path.length - 1];
    const tail = points[points.length - 1];
    const rest = Math.hypot(tail.x - end.x, tail.z + end.y);
    if (rest > 0.005) {
      travelled += rest;
      push(end);
    }
    // Stretches outside every province outline take the nearest province's value.
    for (let i = 0; i < provinces.length; i++)
      if (!provinces[i])
        provinces[i] =
          provinces.slice(i).find(Boolean) ??
          provinces.slice(0, i).reverse().find(Boolean) ??
          "";
    roads.push({
      id: `${a}-${b}`,
      points,
      distances,
      length: travelled,
      provinces,
    });
  }
  network = {
    cities: [...cities.values()].map((c) => c.city),
    roads,
  };
  // Towers fill in around each centre, on land and clear of the roads.
  const roadPoints = roadGrid(roads.flatMap((r) => r.points));
  network.cities.forEach((city, c) => {
    const count = Math.round(6 + city.size * 10);
    for (let i = 0; i < count; i++) {
      const hashed = (a: number) =>
        Math.abs(Math.sin(c * 12.9898 + i * 78.233 + a) * 43758.5453) % 1;
      const angle = hashed(1) * Math.PI * 2,
        reach = 0.12 + Math.sqrt(hashed(2)) * (0.3 + city.size * 0.55);
      const x = city.position.x + Math.cos(angle) * reach,
        z = city.position.z + Math.sin(angle) * reach;
      const w = 0.13 + hashed(3) * 0.1;
      if (
        !plan.onLand(x, -z, 0.15) ||
        nearPoint(roadPoints, x, z, 0.1 + w * 0.6)
      )
        continue;
      // Towers rise toward the middle, so each city reads as a downtown.
      const core = Math.max(0.25, 1 - reach / (0.5 + city.size * 0.55));
      city.towers.push({
        x,
        z,
        w,
        h: (0.22 + hashed(4) * 0.3) * (0.5 + city.size * core * 1.3),
        seed: hashed(5),
      });
    }
  });
  cache.set(world, network);
  return network;
}

/** Splits a road into stretches, each following the infrastructure of its province. */
export function roadRuns(
  road: Road,
  infrastructure: (province: string) => number,
): RoadRun[] {
  const runs: RoadRun[] = [];
  road.points.forEach((_, i) => {
    const province = road.provinces[i];
    const roadClass = roadClassFor(infrastructure(province));
    const run = runs[runs.length - 1];
    if (run && run.roadClass === roadClass) run.to = i;
    else runs.push({ roadClass, province, from: Math.max(0, i - 1), to: i });
  });
  return runs.filter((r) => r.to > r.from);
}
