import { CatmullRomCurve3, Vector2, Vector3 } from "three";
import { projectCoordinate, type WorldGeometry } from "./mapGeometry";
import { gradeTerrain } from "./terrainGrading";

/** Major cities the road network connects: [id, lon, lat, size 0.6–1]. */
const CITIES: [string, number, number, number][] = [
  ["banda-aceh", 95.32, 5.55, 0.7],
  ["medan", 98.67, 3.59, 1],
  ["pekanbaru", 101.45, 0.51, 0.75],
  ["padang", 100.35, -0.95, 0.75],
  ["jambi", 103.61, -1.61, 0.7],
  ["palembang", 104.76, -2.99, 0.9],
  ["bandar-lampung", 105.26, -5.43, 0.75],
  ["jakarta", 106.85, -6.2, 1],
  ["yogyakarta", 110.36, -7.8, 0.8],
  ["surabaya", 112.75, -7.25, 1],
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
/**
 * Trunk roads between those cities, drawn by hand rather than searched for:
 * [from, to, [lon, lat] waypoints in between]. Each road is a smooth curve
 * through its waypoints, so editing a route is just moving a point. Waypoints
 * keep well inland; the shape is illustrative, not the real alignment.
 */
const ROUTES: [string, string, [number, number][]][] = [
  [
    "banda-aceh",
    "medan",
    [
      [95.61, 5.27],
      [96.26, 5.02],
      [96.7, 4.98],
      [97.32, 4.84],
      [97.86, 4.22],
      [97.96, 3.99],
      [98.25, 3.75],
    ],
  ],
  [
    "medan",
    "pekanbaru",
    [
      [98.9, 3.34],
      [99.26, 2.89],
      [99.91, 2.5],
      [100.37, 1.97],
      [100.6, 1.52],
      [101.1, 1.04],
    ],
  ],
  [
    "pekanbaru",
    "padang",
    [
      [101.28, 0.1],
      [100.79, -0.48],
    ],
  ],
  [
    "pekanbaru",
    "jambi",
    [
      [101.85, 0.2],
      [102.33, -0.39],
      [102.81, -0.7],
      [103.28, -1.3],
    ],
  ],
  [
    "jambi",
    "palembang",
    [
      [103.96, -2.06],
      [104.33, -2.41],
      [104.52, -2.81],
    ],
  ],
  [
    "palembang",
    "bandar-lampung",
    [
      [104.78, -3.37],
      [105.02, -3.81],
      [105.11, -4.44],
      [105.36, -4.88],
    ],
  ],
  [
    "jakarta",
    "yogyakarta",
    [
      [107.13, -6.52],
      [107.75, -6.65],
      [108.53, -7.06],
      [109.79, -7.3],
      [110.05, -7.66],
    ],
  ],
  [
    "yogyakarta",
    "surabaya",
    [
      [110.83, -7.66],
      [111.4, -7.66],
      [112.06, -7.42],
    ],
  ],
  ["gilimanuk", "denpasar", [[115.24, -8.35]]],
  [
    "denpasar",
    "singaraja",
    [
      [115.18, -8.37],
      [115.12, -8.32],
    ],
  ],
  ["mataram", "selong", []],
  [
    "sumbawa-besar",
    "bima",
    [
      [117.71, -8.76],
      [118.09, -8.75],
    ],
  ],
  ["labuan-bajo", "ruteng", []],
  [
    "ruteng",
    "ende",
    [
      [120.94, -8.6],
      [121.42, -8.73],
    ],
  ],
  ["ende", "maumere", []],
  [
    "kupang",
    "atambua",
    [
      [124.24, -9.82],
      [124.42, -9.76],
    ],
  ],
  [
    "pontianak",
    "palangkaraya",
    [
      [109.88, -0.18],
      [110.38, -0.57],
      [110.98, -0.77],
      [111.49, -1.16],
      [112.09, -1.36],
      [112.59, -1.75],
      [113.19, -1.95],
      [113.63, -2.2],
    ],
  ],
  [
    "palangkaraya",
    "banjarmasin",
    [
      [114.12, -2.54],
      [114.45, -2.92],
    ],
  ],
  [
    "banjarmasin",
    "balikpapan",
    [
      [114.42, -2.87],
      [114.59, -2.56],
      [115.05, -2.13],
      [115.42, -1.46],
      [115.62, -1.31],
      [116.04, -1.17],
      [116.43, -0.96],
    ],
  ],
  ["balikpapan", "samarinda", []],
  [
    "manado",
    "palu",
    [
      [124.5, 1.06],
      [124.19, 0.85],
      [124.01, 0.79],
      [123.69, 0.76],
      [123.33, 0.65],
      [122.25, 0.65],
      [121.64, 0.8],
      [120.57, 0.62],
      [120.39, 0.56],
      [120.19, 0.41],
      [120.08, 0.19],
      [119.76, -0.91],
    ],
  ],
  [
    "palu",
    "makassar",
    [
      [119.65, -1.53],
      [119.61, -1.79],
      [119.7, -2.42],
      [119.64, -2.98],
      [119.8, -3.6],
      [119.74, -4.16],
      [119.86, -4.72],
      [119.83, -4.97],
    ],
  ],
  [
    "makassar",
    "kendari",
    [
      [119.81, -5.0],
      [119.86, -4.75],
      [119.75, -4.12],
      [119.78, -3.88],
      [119.7, -3.56],
      [119.74, -3.29],
      [119.65, -3.0],
      [119.64, -2.82],
      [119.88, -2.67],
      [120.82, -2.54],
      [121.07, -2.59],
      [121.31, -2.78],
      [121.85, -3.41],
      [121.96, -3.77],
      [122.19, -3.99],
    ],
  ],
  [
    "sorong",
    "manokwari",
    [
      [131.8, -1.06],
      [132.3, -1.14],
      [132.92, -1.0],
      [133.42, -1.07],
    ],
  ],
  [
    "manokwari",
    "nabire",
    [
      [133.77, -1.7],
      [134.01, -2.13],
      [134.07, -2.76],
      [134.32, -2.95],
      [134.61, -3.29],
      [134.83, -3.42],
      [135.32, -3.53],
    ],
  ],
  [
    "nabire",
    "timika",
    [
      [135.95, -3.75],
      [136.25, -4.16],
      [136.77, -4.52],
    ],
  ],
  [
    "timika",
    "wamena",
    [
      [137.31, -4.4],
      [137.88, -4.4],
      [138.53, -4.15],
    ],
  ],
  [
    "wamena",
    "jayapura",
    [
      [139.2, -3.83],
      [139.64, -3.58],
      [140.12, -2.99],
    ],
  ],
  [
    "timika",
    "merauke",
    [
      [137.19, -4.43],
      [137.38, -4.4],
      [137.82, -4.41],
      [137.98, -4.54],
      [138.13, -4.74],
      [138.3, -5.22],
      [138.75, -5.75],
      [138.92, -6.23],
      [139.37, -6.76],
      [139.57, -7.29],
      [140.02, -7.82],
    ],
  ],
];

export type Tower = {
  x: number;
  z: number;
  w: number;
  h: number;
  seed: number;
  /** Economic growth (0–1 of the full expansion) at which this tower appears; 0 for the opening skyline. */
  grow: number;
};
export type City = {
  id: string;
  province: string;
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
  /**
   * Where the road carries on through a city into another road, that road's
   * next point past the city, so the two ribbons meet edge to edge.
   */
  before?: { x: number; y: number; z: number };
  after?: { x: number; y: number; z: number };
};
export type RoadNetwork = { cities: City[]; roads: Road[] };

/**
 * Lifts a path's ground points so a flat ribbon `half` wide on each side clears
 * the faceted terrain: across its width and halfway to each neighbouring point.
 * A light smoothing pass then softens steps without dipping back under a ridge.
 */
export function drapeOver(
  world: Pick<WorldGeometry, "surfaceHeight">,
  points: Vector3[],
  half: number,
) {
  const probe = new Vector2();
  const ground = (x: number, z: number) =>
    world.surfaceHeight(probe.set(x, -z));
  const floor = points.map((p, i) => {
    const a = points[Math.max(0, i - 1)],
      b = points[Math.min(points.length - 1, i + 1)];
    const dx = b.x - a.x,
      dz = b.z - a.z,
      length = Math.hypot(dx, dz) || 1;
    const nx = -dz / length,
      nz = dx / length;
    let top = p.y;
    for (const t of [-0.5, -0.25, 0, 0.25, 0.5]) {
      const neighbour = t < 0 ? a : b,
        f = Math.abs(t);
      const cx = p.x + (neighbour.x - p.x) * f,
        cz = p.z + (neighbour.z - p.z) * f;
      for (const side of [-1, -0.5, 0, 0.5, 1])
        top = Math.max(
          top,
          ground(cx + nx * half * side, cz + nz * half * side),
        );
    }
    return top;
  });
  for (let i = 0; i < points.length; i++) {
    const before = floor[Math.max(0, i - 1)],
      after = floor[Math.min(points.length - 1, i + 1)];
    points[i].y = Math.max(floor[i], (before + 2 * floor[i] + after) / 4);
  }
}

const SAMPLE = 0.14;
const CITY_MARGIN = 0.55;
/** Two towns on one island keep at least this far apart. */
const CITY_GAP = 0.75;
/** Half the widest road plus a little verge, which the deck must clear. */
const DECK_HALF_WIDTH = 0.12;
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

export function landPlanner(world: WorldGeometry) {
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

/**
 * Lets a new path settle onto the paths laid before it. Routes follow an
 * earlier trunk only to within a grid cell, which would leave two lines a
 * hair's breadth apart; this draws points near a trunk fully onto it and
 * eases the ones further out, so branches leave a trunk cleanly.
 */
export function trunkSnapper(inner = 0.1, outer = 0.2) {
  const cell = 0.5;
  const grid = new Map<string, number[][]>();
  const cellKey = (i: number, j: number) => `${i},${j}`;
  return {
    add(points: readonly { x: number; z: number }[]) {
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1],
          b = points[i];
        const seg = [a.x, a.z, b.x, b.z];
        const minI = Math.floor((Math.min(a.x, b.x) - outer) / cell),
          maxI = Math.floor((Math.max(a.x, b.x) + outer) / cell),
          minJ = Math.floor((Math.min(a.z, b.z) - outer) / cell),
          maxJ = Math.floor((Math.max(a.z, b.z) + outer) / cell);
        for (let ci = minI; ci <= maxI; ci++)
          for (let cj = minJ; cj <= maxJ; cj++) {
            const k = cellKey(ci, cj);
            const list = grid.get(k);
            if (list) list.push(seg);
            else grid.set(k, [seg]);
          }
      }
    },
    /** The point `(x, z)` moved toward the nearest earlier path. */
    snap(x: number, z: number): [number, number] {
      let best = Infinity,
        bx = x,
        bz = z;
      for (const [ax, az, cx, cz] of grid.get(
        cellKey(Math.floor(x / cell), Math.floor(z / cell)),
      ) ?? []) {
        const dx = cx - ax,
          dz = cz - az,
          length2 = dx * dx + dz * dz || 1;
        const t = Math.max(
          0,
          Math.min(1, ((x - ax) * dx + (z - az) * dz) / length2),
        );
        const px = ax + dx * t,
          pz = az + dz * t,
          d = Math.hypot(x - px, z - pz);
        if (d < best) ((best = d), (bx = px), (bz = pz));
      }
      if (best >= outer) return [x, z];
      const w = best <= inner ? 1 : (outer - best) / (outer - inner);
      return [x + (bx - x) * w, z + (bz - z) * w];
    },
  };
}

/**
 * Stretches each path shares with an earlier path, as [from, to] point ranges
 * to draw. Roads merge into trunks, so this keeps a shared trunk to one ribbon;
 * each kept range reaches `overlap` points into the trunk so the ribbons meet.
 */
export function unsharedRanges(
  paths: readonly { points: readonly { x: number; z: number }[] }[],
  radius = 0.12,
  overlap = 2,
): [number, number][][] {
  const grid: PointGrid = new Map();
  return paths.map((path) => {
    const shared = path.points.map((p) => nearPoint(grid, p.x, p.z, radius));
    // Points that sit right on an earlier path: a drawn piece runs back to one
    // so it meets the trunk instead of stopping just short of it.
    const joined = path.points.map((p) =>
      nearPoint(grid, p.x, p.z, JOIN_RADIUS),
    );
    for (const p of path.points) {
      const key = `${Math.floor(p.x / CELL)},${Math.floor(p.z / CELL)}`;
      const cell = grid.get(key);
      if (cell) cell.push([p.x, p.z]);
      else grid.set(key, [[p.x, p.z]]);
    }
    const ranges: [number, number][] = [];
    const last = path.points.length - 1;
    for (let i = 0; i <= last; i++) {
      if (shared[i]) continue;
      let j = i;
      while (j < last && !shared[j + 1]) j++;
      let from = Math.max(0, i - overlap),
        to = Math.min(last, j + overlap);
      while (from > 0 && !joined[from] && i - from < MAX_JOIN) from--;
      while (to < last && !joined[to] && to - j < MAX_JOIN) to++;
      if (to > from) ranges.push([from, to]);
      i = j;
    }
    return ranges;
  });
}

type PointGrid = Map<string, [number, number][]>;
const JOIN_RADIUS = 0.03;
const MAX_JOIN = 10;
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
  const plan = landPlanner(world);
  // Cities sit on the nearest inland ground of their own island, and no two
  // towns on one island share a spot.
  const cities = new Map<string, { city: City; map: Vector2 }>();
  const placed: { island: number; at: Vector2 }[] = [];
  for (const [id, lon, lat, size] of CITIES) {
    const target = projectCoordinate([lon, lat]);
    // The island the town belongs to: the one with land nearest its coordinates.
    let home = -1;
    for (let radius = 0; radius <= 2.2 && home < 0; radius += 0.1)
      for (let k = 0; k < (radius ? 16 : 1) && home < 0; k++) {
        const a = (k / 16) * Math.PI * 2;
        const x = target.x + Math.cos(a) * radius,
          y = target.y + Math.sin(a) * radius;
        if (plan.onLand(x, y, 0)) home = plan.island(x, y);
      }
    if (home < 0) continue;
    let found: Vector2 | null = null;
    // Prefer well inland ground; narrow islands settle for a closer coast.
    for (const [margin, gap] of [
      [CITY_MARGIN, CITY_GAP],
      [0.3, CITY_GAP],
      [0.14, CITY_GAP * 0.6],
    ])
      for (let radius = 0; radius <= 2.2 && !found; radius += 0.1)
        for (let k = 0; k < (radius ? 16 : 1) && !found; k++) {
          const a = (k / 16) * Math.PI * 2;
          const x = target.x + Math.cos(a) * radius,
            y = target.y + Math.sin(a) * radius;
          if (
            plan.onLand(x, y, margin) &&
            plan.island(x, y) === home &&
            !placed.some(
              (other) =>
                other.island === home &&
                Math.hypot(other.at.x - x, other.at.y - y) < gap,
            )
          )
            found = new Vector2(x, y);
        }
    if (!found) continue;
    placed.push({ island: home, at: found });
    const height = Math.max(0.03, world.surfaceHeight(found));
    cities.set(id, {
      city: {
        id,
        province: "",
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
  for (const { city, map } of cities.values())
    city.province = owner(map.x, map.y);
  const roads: Road[] = [];
  const roadOf = new Map<number, Road>();
  const trunks = trunkSnapper();
  // Each route's control points, from its city through its waypoints to the next.
  const controls = ROUTES.map(([a, b, waypoints]) => {
    const from = cities.get(a),
      to = cities.get(b);
    return from && to
      ? [from.map, ...waypoints.map(projectCoordinate), to.map]
      : null;
  });
  // Roads that pass through a city carry on through it: at every city, the
  // two road ends that line up best are paired, as A → B → C. Each curve then
  // takes its neighbour's next point as a guide, so both leave the city in
  // one direction and the road flows on instead of stopping at a corner.
  const beyond = new Map<string, Vector2>(); // `${route}:${end}` → guide point
  const joins: [string, string][] = [];
  for (const [id] of cities) {
    const ends: { key: string; out: Vector2; next: Vector2 }[] = [];
    ROUTES.forEach(([a, b], r) => {
      const c = controls[r];
      if (!c) return;
      if (a === id) ends.push({ key: `${r}:0`, out: c[1], next: c[1] });
      if (b === id)
        ends.push({
          key: `${r}:1`,
          out: c[c.length - 2],
          next: c[c.length - 2],
        });
    });
    const centre = cities.get(id)!.map;
    const pairs: { i: number; j: number; straight: number }[] = [];
    for (let i = 0; i < ends.length; i++)
      for (let j = i + 1; j < ends.length; j++) {
        const u = ends[i].out.clone().sub(centre).normalize(),
          v = ends[j].out.clone().sub(centre).normalize();
        // -1 is dead straight through; roads that double back don't join up.
        const straight = u.dot(v);
        if (straight < 0.3) pairs.push({ i, j, straight });
      }
    pairs.sort((p, q) => p.straight - q.straight);
    const taken = new Set<number>();
    for (const { i, j } of pairs) {
      if (taken.has(i) || taken.has(j)) continue;
      taken.add(i).add(j);
      beyond.set(ends[i].key, ends[j].next);
      beyond.set(ends[j].key, ends[i].next);
      joins.push([ends[i].key, ends[j].key]);
    }
  }
  for (const [r, [a, b]] of ROUTES.entries()) {
    const from = cities.get(a),
      to = cities.get(b),
      control = controls[r];
    if (!from || !to || !control) continue;
    // A centripetal curve through the waypoints: smooth, without overshoot.
    // Guide points past either city shape the ends but aren't drawn.
    const before = beyond.get(`${r}:0`),
      after = beyond.get(`${r}:1`);
    const list = [
      ...(before ? [before] : []),
      ...control,
      ...(after ? [after] : []),
    ];
    const curve = new CatmullRomCurve3(
      list.map((p) => new Vector3(p.x, p.y, 0)),
      false,
      "centripetal",
    );
    const first = before ? 1 : 0,
      lastIndex = list.length - 1 - (after ? 1 : 0),
      segments = list.length - 1;
    const steps = Math.max(8, Math.ceil(curve.getLength() / 0.05));
    const path = Array.from({ length: steps + 1 }, (_, k) => {
      const t = (first + ((lastIndex - first) * k) / steps) / segments;
      const p = curve.getPoint(t);
      return new Vector2(p.x, p.y);
    });
    path[0] = from.map.clone();
    path[path.length - 1] = to.map.clone();
    const points: Vector3[] = [],
      distances: number[] = [],
      provinces: string[] = [];
    let travelled = 0,
      carry = 0,
      last = path[0];
    const push = (p: Vector2, pinned = false) => {
      // Settle onto a trunk laid earlier, except in and next to the cities,
      // where a road carrying on through town must keep its own line.
      const nearCity =
        p.distanceTo(from.map) < 0.3 || p.distanceTo(to.map) < 0.3;
      const [sx, sz] =
        pinned || nearCity ? [p.x, -p.y] : trunks.snap(p.x, -p.y);
      points.push(new Vector3(sx, Math.max(0.03, world.surfaceHeight(p)), sz));
      distances.push(travelled);
      provinces.push(owner(p.x, p.y));
    };
    push(path[0], true);
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
      push(end, true);
    }
    // Stretches outside every province outline take the nearest province's value.
    for (let i = 0; i < provinces.length; i++)
      if (!provinces[i])
        provinces[i] =
          provinces.slice(i).find(Boolean) ??
          provinces.slice(0, i).reverse().find(Boolean) ??
          "";
    trunks.add(points);
    roads.push({
      id: `${a}-${b}`,
      points,
      distances,
      length: travelled,
      provinces,
    });
    roadOf.set(r, roads[roads.length - 1]);
  }
  // Level a road bed into the hills, then lay each road on its graded ground.
  gradeTerrain(world, roads);
  const probe = new Vector2();
  for (const road of roads) {
    for (const p of road.points)
      p.y = Math.max(0.03, world.surfaceHeight(probe.set(p.x, -p.z)));
    drapeOver(world, road.points, DECK_HALF_WIDTH);
  }
  // Roads that carry on through a city share its point and see past it into
  // each other, so their ribbons join without a seam.
  for (const [p, q] of joins) {
    const end = (key: string) => {
      const [r, side] = key.split(":").map(Number);
      const road = roadOf.get(r);
      if (!road) return null;
      const last = road.points.length - 1;
      return { road, side, at: side ? last : 0, next: side ? last - 1 : 1 };
    };
    const a = end(p),
      b = end(q);
    if (!a || !b) continue;
    const y = Math.max(a.road.points[a.at].y, b.road.points[b.at].y);
    a.road.points[a.at].y = b.road.points[b.at].y = y;
    const link = (from: typeof a, to: typeof a) => {
      const n = to.road.points[to.next];
      from.road[from.side ? "after" : "before"] = { x: n.x, y: n.y, z: n.z };
    };
    link(a, b);
    link(b, a);
  }
  for (const { city, map } of cities.values())
    city.position.y = Math.max(0.03, world.surfaceHeight(map));
  network = {
    cities: [...cities.values()].map((c) => c.city),
    roads,
  };
  // Towns grow along the trunk roads that serve them: buildings line both
  // sides of each road leaving the centre, tallest in the middle, so the road
  // runs straight through town rather than past scattered blocks.
  const roadPoints = roadGrid(roads.flatMap((r) => r.points));
  network.cities.forEach((city, c) => {
    const hashed = (i: number, a: number) =>
      Math.abs(Math.sin(c * 12.9898 + i * 78.233 + a * 37.719) * 43758.5453) %
      1;
    const reach = 0.4 + city.size * 0.5;
    // Each frontage: points along a road from the centre outwards.
    const frontages: { x: number; z: number }[][] = [];
    for (const road of roads)
      for (const fromStart of [true, false]) {
        const end = fromStart ? road.points[0] : road.points.at(-1)!;
        if (Math.hypot(end.x - city.position.x, end.z - city.position.z) > 0.05)
          continue;
        const ordered = fromStart ? road.points : [...road.points].reverse();
        frontages.push(
          ordered.filter(
            (p) =>
              Math.hypot(p.x - city.position.x, p.z - city.position.z) <= reach,
          ),
        );
      }
    // A town without a road still gets a short main street's worth of houses.
    if (!frontages.length) {
      const heading = hashed(0, 1) * Math.PI;
      for (const dir of [1, -1])
        frontages.push(
          Array.from({ length: Math.round(reach / 0.14) + 1 }, (_, i) => ({
            x: city.position.x + Math.cos(heading) * dir * i * 0.14,
            z: city.position.z + Math.sin(heading) * dir * i * 0.14,
          })),
        );
    }
    const candidates: Tower[] = [];
    frontages.forEach((line, f) => {
      for (let i = 1; i < line.length; i++) {
        const a = line[i - 1],
          b = line[i];
        const length = Math.hypot(b.x - a.x, b.z - a.z) || 1;
        const nx = -(b.z - a.z) / length,
          nz = (b.x - a.x) / length;
        // Rows behind the street front stand clear of a railway that may run
        // beside the road; bigger towns have more of them, more densely.
        const rows = city.size >= 0.85 ? 3 : 2;
        for (let row = 0; row < rows; row++)
          for (const side of [-1, 1]) {
            const k = f * 400 + i * 6 + row * 2 + (side > 0 ? 1 : 0);
            if (hashed(k, 4) < (row ? 0.95 - city.size * 0.6 : 0.1)) continue;
            const w = 0.07 + hashed(k, 3) * 0.05;
            const offset = (row ? 0.22 + row * 0.17 : 0.15) + w * 0.5;
            const x = (a.x + b.x) / 2 + nx * side * offset,
              z = (a.z + b.z) / 2 + nz * side * offset;
            if (
              !plan.onLand(x, -z, 0.1) ||
              nearPoint(roadPoints, x, z, 0.13 + w * 0.5)
            )
              continue;
            const distance = Math.hypot(
              x - city.position.x,
              z - city.position.z,
            );
            const core = Math.max(0.2, 1 - distance / reach);
            candidates.push({
              x,
              z,
              w,
              h:
                (0.12 + hashed(k, 5) * 0.16) * (0.55 + city.size * core * 1.25),
              seed: hashed(k, 6),
              grow: 0,
            });
          }
      }
    });
    // Nearest the centre first, so growth adds suburbs rather than downtown.
    candidates.sort(
      (p, q) =>
        Math.hypot(p.x - city.position.x, p.z - city.position.z) -
        Math.hypot(q.x - city.position.x, q.z - city.position.z),
    );
    const kept: Tower[] = [];
    for (const tower of candidates)
      if (
        !kept.some(
          (other) =>
            Math.hypot(other.x - tower.x, other.z - tower.z) <
            (other.w + tower.w) * 0.62,
        )
      )
        kept.push(tower);
    const opening = Math.ceil(kept.length * 0.7);
    kept.forEach((tower, i) => {
      tower.grow =
        i < opening ? 0 : (i - opening + 0.5) / (kept.length - opening);
    });
    city.towers = kept;
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
