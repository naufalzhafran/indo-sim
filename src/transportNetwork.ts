import { Vector2, Vector3 } from "three";
import {
  projectCoordinate,
  SEA_LEVEL,
  type WorldGeometry,
} from "./mapGeometry";
import {
  buildRoadNetwork,
  drapeOver,
  landPlanner,
  onRoadOrCity,
  routeAwayFromRoads,
  type Road,
} from "./roadNetwork";
import { regionForProvince } from "./engine/gameRegions";
import type { RegionId } from "./engine/economy/types";

/** A route sampled about every STEP, with the distance travelled to each point. */
export type TransportPath = {
  points: Vector3[];
  distances: number[];
  length: number;
};
/** A spot on the shore for a harbour, facing its berth out at sea. */
export type Quay = { position: Vector3; rotation: number };
export type SeaRoute = TransportPath & {
  id: string;
  kind: "cargo" | "ferry" | "tol-laut";
  regions: [RegionId, RegionId];
  /** The harbours at each end, for ports and their quays. */
  quays?: [Quay, Quay];
};
export type RailLine = TransportPath & {
  id: string;
  region: RegionId;
  /** Lines Indonesia already runs; the others open with intercity rail policy. */
  baseline: boolean;
};
export type Airport = {
  id: string;
  region: RegionId;
  position: Vector3;
  heading: number;
};
export type FishingSpot = { position: Vector3; region: RegionId };
export type TransportNetwork = {
  sea: SeaRoute[];
  rail: RailLine[];
  airports: Airport[];
  fishing: FishingSpot[];
};

/** Harbours ships call at: [id, lon, lat, region]. */
const PORTS: [string, number, number, RegionId][] = [
  ["belawan", 98.69, 3.79, "sumatra"],
  ["bakauheni", 105.75, -5.87, "sumatra"],
  ["merak", 105.99, -5.93, "java"],
  ["tanjung-priok", 106.88, -6.1, "java"],
  ["tanjung-perak", 112.62, -6.88, "java"],
  ["benoa", 115.21, -8.75, "bali"],
  ["padangbai", 115.51, -8.53, "bali"],
  ["lembar", 116.07, -8.73, "ntb"],
  ["kayangan", 116.67, -8.48, "ntb"],
  ["pototano", 116.83, -8.55, "ntb"],
  ["sape", 119.02, -8.57, "ntb"],
  ["labuan-bajo", 119.87, -8.49, "ntt"],
  ["kupang", 123.57, -10.15, "ntt"],
  ["pontianak", 109.2, -0.05, "kalimantan"],
  ["banjarmasin", 114.5, -3.6, "kalimantan"],
  ["balikpapan", 116.8, -1.27, "kalimantan"],
  ["makassar", 119.4, -5.13, "sulawesi"],
  ["bitung", 125.19, 1.44, "sulawesi"],
  ["ternate", 127.38, 0.79, "maluku"],
  ["ambon", 128.17, -3.69, "maluku"],
  ["sorong", 131.25, -0.88, "papua"],
  ["jayapura", 140.71, -2.54, "papua"],
  ["merauke", 140.38, -8.49, "papua"],
];
/** Long-haul cargo and Pelni-style lines between the main harbours. */
const CARGO_LINES: [string, string][] = [
  ["tanjung-priok", "belawan"],
  ["tanjung-priok", "pontianak"],
  ["tanjung-priok", "tanjung-perak"],
  ["tanjung-perak", "banjarmasin"],
  ["tanjung-perak", "makassar"],
  ["tanjung-perak", "benoa"],
  ["makassar", "balikpapan"],
  ["makassar", "kupang"],
  ["makassar", "ambon"],
  ["bitung", "ternate"],
  ["ambon", "sorong"],
  ["sorong", "jayapura"],
  ["ambon", "merauke"],
];
/**
 * Tol Laut lines, as [region, region, port, port]. Like the real programme they
 * run from the Java and Makassar hubs out to the eastern and outer islands.
 */
export const TOL_LAUT_LINKS: [RegionId, RegionId, string, string][] = [
  ["java", "sumatra", "tanjung-priok", "belawan"],
  ["java", "kalimantan", "tanjung-perak", "banjarmasin"],
  ["java", "bali", "tanjung-perak", "benoa"],
  ["java", "ntb", "tanjung-perak", "lembar"],
  ["java", "sulawesi", "tanjung-perak", "makassar"],
  ["sulawesi", "ntt", "makassar", "kupang"],
  ["sulawesi", "maluku", "makassar", "ambon"],
  ["ntt", "maluku", "kupang", "ambon"],
  ["maluku", "papua", "ambon", "merauke"],
  ["sulawesi", "papua", "bitung", "jayapura"],
];
/** Short ferry crossings across the straits. */
const FERRY_LINES: [string, string][] = [
  ["merak", "bakauheni"],
  ["padangbai", "lembar"],
  ["kayangan", "pototano"],
  ["sape", "labuan-bajo"],
];
/** Trunk corridors that already carry trains: Java's lines and South Sumatra. */
export const BASELINE_RAIL = new Set([
  "merak-jakarta",
  "jakarta-bandung",
  "bandung-yogyakarta",
  "yogyakarta-surabaya",
  "surabaya-banyuwangi",
  "palembang-bandar-lampung",
]);
/** Roads that branch off an island's main road get no railway, so each island has one long line. */
const NO_RAIL = new Set(["pekanbaru-padang", "timika-merauke"]);
/**
 * Java's railways form one long line, end to end from Merak to Banyuwangi,
 * with no branches. They run inland along the island's southern half, through the
 * towns the real lines serve, so they keep clear of the north-coast road:
 * [id, from city, [lon, lat] stops along the way, to city].
 */
const JAVA_RAIL: [string, string, [number, number][], string][] = [
  [
    "merak-jakarta",
    "merak",
    [
      [106.25, -6.36],
      [106.55, -6.33],
    ],
    "jakarta",
  ],
  [
    "jakarta-bandung",
    "jakarta",
    [
      [106.8, -6.6],
      [106.93, -6.92],
      [107.3, -6.95],
    ],
    "bandung",
  ],
  [
    "bandung-yogyakarta",
    "bandung",
    [
      [107.9, -7.2],
      [108.22, -7.33],
      [108.54, -7.37],
      [109.0, -7.55],
      [109.65, -7.65],
    ],
    "yogyakarta",
  ],
  [
    "yogyakarta-surabaya",
    "yogyakarta",
    [
      [110.82, -7.57],
      [111.52, -7.63],
      [112.1, -7.6],
      [112.5, -7.45],
    ],
    "surabaya",
  ],
  [
    "surabaya-banyuwangi",
    "surabaya",
    [
      [112.6, -7.62],
      [112.63, -7.98],
      [113.0, -8.18],
      [113.7, -8.2],
      [114.0, -8.32],
    ],
    "banyuwangi",
  ],
];
/** Airport hubs, by road-network city id. */
const AIRPORT_CITIES = [
  "medan",
  "padang",
  "palembang",
  "jakarta",
  "surabaya",
  "denpasar",
  "mataram",
  "kupang",
  "pontianak",
  "balikpapan",
  "makassar",
  "manado",
  "ambon",
  "sorong",
  "jayapura",
];

const STEP = 0.3;
/** Railways are sampled finely enough to follow the hills between points. */
const RAIL_STEP = 0.14;
const CELL = 0.25;
/** Stations and track keep at least this far from a road's centre line. */
const RAIL_ROAD_CLEARANCE = 0.26;
/** Half the gravel bed's width, which the track must clear. */
const RAIL_HALF_WIDTH = 0.04;

function samplePath(
  path: Vector2[],
  height: (p: Vector2) => number,
  step = STEP,
) {
  const points: Vector3[] = [],
    distances: number[] = [];
  let travelled = 0;
  const push = (p: Vector2) => {
    points.push(new Vector3(p.x, height(p), -p.y));
    distances.push(travelled);
  };
  push(path[0]);
  let carry = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1],
      b = path[i],
      segment = a.distanceTo(b);
    let along = step - carry;
    while (along <= segment) {
      travelled += step;
      push(a.clone().lerp(b, along / segment));
      along += step;
    }
    carry = (carry + segment) % step;
  }
  const end = path[path.length - 1],
    tail = points[points.length - 1];
  const rest = Math.hypot(tail.x - end.x, tail.z + end.y);
  if (rest > 0.005) {
    travelled += rest;
    push(end);
  }
  return { points, distances, length: travelled };
}

/** Chaikin corner cutting, keeping both ends where they are. */
function chaikin(path: Vector2[], rounds: number) {
  let points = path;
  for (let r = 0; r < rounds; r++) {
    if (points.length < 3) return points;
    const next = [points[0]];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i],
        b = points[i + 1];
      next.push(a.clone().lerp(b, 0.25), a.clone().lerp(b, 0.75));
    }
    next.push(points[points.length - 1]);
    points = next;
  }
  return points;
}

/** Open water on a coarse grid, with a margin so ships keep off the beaches. */
function waterGrid(
  world: WorldGeometry,
  onLand: (x: number, y: number) => boolean,
) {
  const minX = world.bounds.min.x - 4,
    maxX = world.bounds.max.x + 4,
    minY = -world.bounds.max.z - 4,
    maxY = -world.bounds.min.z + 4;
  const width = Math.ceil((maxX - minX) / CELL) + 1,
    height = Math.ceil((maxY - minY) / CELL) + 1;
  const land = new Uint8Array(width * height);
  for (let j = 0; j < height; j++)
    for (let i = 0; i < width; i++)
      land[j * width + i] = Number(onLand(minX + i * CELL, minY + j * CELL));
  /** Cells within `reach` cells of land, plus islets smaller than a cell. */
  const dilate = (reach: number) => {
    const blocked = new Uint8Array(width * height);
    for (let j = 0; j < height; j++)
      for (let i = 0; i < width; i++) {
        let near = 0;
        for (let dj = -reach; dj <= reach && !near; dj++)
          for (let di = -reach; di <= reach && !near; di++) {
            const x = i + di,
              y = j + dj;
            if (x >= 0 && y >= 0 && x < width && y < height)
              near = land[y * width + x];
          }
        blocked[j * width + i] = near;
      }
    for (const coast of world.coastlines)
      for (const p of coast.shape) {
        const i = Math.round((p.x - minX) / CELL),
          j = Math.round((p.y - minY) / CELL);
        if (i >= 0 && j >= 0 && i < width && j < height)
          blocked[j * width + i] = 1;
      }
    return blocked;
  };
  // Ships prefer a wide berth from the coast and squeeze closer only in narrow straits.
  const margins = [dilate(2), dilate(1)];
  let blocked = margins[0];
  const cellOf = (p: Vector2) => [
    Math.round((p.x - minX) / CELL),
    Math.round((p.y - minY) / CELL),
  ];
  const at = (i: number, j: number) =>
    new Vector2(minX + i * CELL, minY + j * CELL);
  const free = (i: number, j: number) =>
    i >= 0 && j >= 0 && i < width && j < height && !blocked[j * width + i];
  /** The free cell nearest to a point, searching outwards. */
  const nearestFree = (p: Vector2) => {
    const [ci, cj] = cellOf(p);
    for (let r = 0; r < 24; r++)
      for (let dj = -r; dj <= r; dj++)
        for (let di = -r; di <= r; di++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
          if (free(ci + di, cj + dj)) return [ci + di, cj + dj];
        }
    return null;
  };
  const sight = (a: Vector2, b: Vector2) => {
    const steps = Math.ceil(a.distanceTo(b) / 0.05);
    for (let s = 1; s < steps; s++) {
      const p = a.clone().lerp(b, s / steps);
      const [i, j] = cellOf(p);
      if (!free(i, j) || onLand(p.x, p.y)) return false;
    }
    return true;
  };
  const length = (path: Vector2[]) =>
    path.reduce((sum, p, i) => (i ? sum + p.distanceTo(path[i - 1]) : 0), 0);
  const route = (from: Vector2, to: Vector2) => {
    blocked = margins[0];
    const wide = routeOver(from, to);
    // A fairly direct wide route needs no second look.
    if (wide && length(wide) < from.distanceTo(to) * 1.3) return wide;
    blocked = margins[1];
    const close = routeOver(from, to);
    // Keep the wide berth unless it means sailing far around an island.
    if (wide && (!close || length(wide) < length(close) * 1.25)) return wide;
    return close;
  };
  /** A* over the free cells, then pulled taut along lines of sight. */
  const routeOver = (from: Vector2, to: Vector2): Vector2[] | null => {
    const start = nearestFree(from),
      goal = nearestFree(to);
    if (!start || !goal) return null;
    const size = width * height;
    const cost = new Float32Array(size).fill(Infinity);
    const parent = new Int32Array(size).fill(-1);
    const closed = new Uint8Array(size);
    const heap: { k: number; f: number }[] = [];
    const push = (k: number, f: number) => {
      heap.push({ k, f });
      let i = heap.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heap[p].f <= heap[i].f) break;
        [heap[p], heap[i]] = [heap[i], heap[p]];
        i = p;
      }
    };
    const pop = () => {
      const top = heap[0],
        last = heap.pop()!;
      if (heap.length) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const l = i * 2 + 1,
            r = l + 1;
          let m = i;
          if (l < heap.length && heap[l].f < heap[m].f) m = l;
          if (r < heap.length && heap[r].f < heap[m].f) m = r;
          if (m === i) break;
          [heap[m], heap[i]] = [heap[i], heap[m]];
          i = m;
        }
      }
      return top;
    };
    const startK = start[1] * width + start[0],
      goalK = goal[1] * width + goal[0];
    const h = (k: number) =>
      Math.hypot((k % width) - goal[0], Math.floor(k / width) - goal[1]);
    cost[startK] = 0;
    push(startK, h(startK));
    while (heap.length) {
      const { k } = pop();
      if (closed[k]) continue;
      closed[k] = 1;
      if (k === goalK) break;
      const i = k % width,
        j = Math.floor(k / width);
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          if (!free(i + di, j + dj)) continue;
          const n = (j + dj) * width + i + di;
          const next = cost[k] + Math.hypot(di, dj);
          if (next < cost[n]) {
            cost[n] = next;
            parent[n] = k;
            push(n, next + h(n));
          }
        }
    }
    if (parent[goalK] < 0 && goalK !== startK) return null;
    const cells: Vector2[] = [];
    for (let k = goalK; k >= 0; k = parent[k])
      cells.push(at(k % width, Math.floor(k / width)));
    cells.reverse();
    const taut = [cells[0]];
    let anchor = 0;
    for (let i = 2; i < cells.length; i++)
      if (!sight(cells[anchor], cells[i])) {
        anchor = i - 1;
        taut.push(cells[anchor]);
      }
    taut.push(cells[cells.length - 1]);
    return [from, ...taut, to];
  };
  return { route };
}

const cache = new WeakMap<WorldGeometry, TransportNetwork>();
export function seedTransportNetwork(
  world: WorldGeometry,
  network: TransportNetwork,
) {
  cache.set(world, network);
}

/** Sea lanes, rail lines, airports and fishing grounds; built once per world. */
export function buildTransportNetwork(world: WorldGeometry): TransportNetwork {
  let network = cache.get(world);
  if (network) return network;
  const plan = landPlanner(world);
  const roads = buildRoadNetwork(world);
  const regionNear = (x: number, z: number) => {
    let best = "",
      near = Infinity;
    for (const p of world.provinces) {
      const d = Math.hypot(p.anchor.x - x, p.anchor.z - z);
      if (d < near) ((near = d), (best = p.id));
    }
    return (regionForProvince(best)?.id ?? "java") as RegionId;
  };
  /** Water at least `margin` from any coast, checked around a ring. */
  const water = (x: number, y: number, margin: number) => {
    if (plan.onLand(x, y)) return false;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      if (plan.onLand(x + Math.cos(a) * margin, y + Math.sin(a) * margin))
        return false;
    }
    return true;
  };
  const offshore = (target: Vector2, margin: number) => {
    for (let r = 0; r <= 3; r += 0.08)
      for (let k = 0; k < (r ? 24 : 1); k++) {
        const a = (k / 24) * Math.PI * 2;
        const x = target.x + Math.cos(a) * r,
          y = target.y + Math.sin(a) * r;
        if (water(x, y, margin)) return new Vector2(x, y);
      }
    return null;
  };
  const sea = () => SEA_LEVEL;
  /**
   * A quay platform standing in the shallows where the line from a berth to its
   * harbour meets the shore, clear of the coast road. The search fans out a
   * little when the first landfall is on a road.
   */
  const quayFor = (berth: Vector2, harbour: Vector2): Quay | null => {
    const toward = Math.atan2(harbour.y - berth.y, harbour.x - berth.x);
    const reach = berth.distanceTo(harbour) + 1;
    let fallback: Quay | null = null;
    for (const turn of [0, 0.2, -0.2, 0.4, -0.4, 0.6, -0.6, 0.8, -0.8]) {
      const direction = new Vector2(
        Math.cos(toward + turn),
        Math.sin(toward + turn),
      );
      for (let d = 0.02; d <= reach; d += 0.02) {
        const p = berth.clone().addScaledVector(direction, d);
        if (!plan.onLand(p.x, p.y)) continue;
        p.addScaledVector(direction, -0.08);
        const quay = {
          position: new Vector3(
            p.x,
            Math.max(0.03, world.surfaceHeight(p)),
            -p.y,
          ),
          // Structures face +z, so this turns the pier back towards the berth.
          rotation: Math.atan2(-direction.x, direction.y),
        };
        if (!onRoadOrCity(roads, p.x, -p.y, 0.26, 0)) return quay;
        fallback ??= quay;
        break;
      }
    }
    return fallback;
  };
  const ports = new Map<
    string,
    { at: Vector2; region: RegionId; quay: Quay | null }
  >();
  // Berths sit far enough out that a docked ship clears the beach.
  for (const [id, lon, lat, region] of PORTS) {
    const harbour = projectCoordinate([lon, lat]);
    const at = offshore(harbour, 0.75);
    if (at) ports.set(id, { at, region, quay: quayFor(at, harbour) });
  }
  const grid = waterGrid(world, (x, y) => plan.onLand(x, y));
  const sail = (from: Vector2, to: Vector2) => {
    const path = grid.route(from, to);
    if (!path) return null;
    // Round the corners only as far as the sampled route keeps off the coast.
    for (let rounds = 3; rounds > 0; rounds--) {
      const candidate = samplePath(chaikin(path, rounds), sea);
      if (candidate.points.every((p) => water(p.x, -p.z, 0.2)))
        return candidate;
    }
    return samplePath(path, sea);
  };
  const routes: SeaRoute[] = [];
  // Tol Laut shares harbour pairs with the cargo lines; route each pair once.
  const sailed = new Map<string, TransportPath | null>();
  const addSeaRoute = (
    a: string,
    b: string,
    kind: SeaRoute["kind"],
    regions?: [RegionId, RegionId],
  ) => {
    const from = ports.get(a),
      to = ports.get(b);
    if (!from || !to) return;
    const key = `${a}|${b}`;
    if (!sailed.has(key)) sailed.set(key, sail(from.at, to.at));
    const sampled = sailed.get(key);
    if (!sampled) return;
    routes.push({
      id: kind === "tol-laut" ? `tol-laut:${a}-${b}` : `${a}-${b}`,
      kind,
      regions: regions ?? [from.region, to.region],
      ...(from.quay && to.quay ? { quays: [from.quay, to.quay] } : {}),
      ...sampled,
    });
  };
  for (const [a, b] of CARGO_LINES) addSeaRoute(a, b, "cargo");
  for (const [ra, rb, a, b] of TOL_LAUT_LINKS)
    addSeaRoute(a, b, "tol-laut", [ra, rb]);
  // Ferries cross narrow straits: each end is the first water off its own shore.
  const landing = (from: Vector2, to: Vector2) => {
    const steps = Math.ceil(from.distanceTo(to) / 0.02);
    for (let s = 0; s <= steps; s++) {
      const p = from.clone().lerp(to, s / steps);
      if (water(p.x, p.y, 0.09)) return p;
    }
    return null;
  };
  for (const [a, b] of FERRY_LINES) {
    const from = PORTS.find((p) => p[0] === a),
      to = PORTS.find((p) => p[0] === b);
    if (!from || !to) continue;
    const pa = projectCoordinate([from[1], from[2]]),
      pb = projectCoordinate([to[1], to[2]]);
    const start = landing(pa, pb),
      end = landing(pb, pa);
    // A crossing shorter than a ferry would only show it parked across the strait.
    if (!start || !end || start.distanceTo(end) < 0.4) continue;
    routes.push({
      id: `${a}-${b}`,
      kind: "ferry",
      regions: [from[3], to[3]],
      ...samplePath([start, end], sea),
    });
  }

  // Rail runs beside each road corridor, on the side with more room.
  const rail: RailLine[] = [];
  const railCells = new Set<string>();
  // Each city's railway station stands apart from its road junction, so trains
  // and cars never share the same spot. Every line calling there uses it.
  const stations = new Map<string, Vector2>();
  const stationAt = (id: string) => {
    if (stations.has(id)) return stations.get(id)!;
    const city = roads.cities.find((c) => c.id === id);
    if (!city) return undefined;
    const centre = new Vector2(city.position.x, -city.position.z);
    let found = centre;
    search: for (let r = 0.3; r <= 0.9; r += 0.05)
      for (let k = 0; k < 24; k++) {
        // Start the sweep inland of south, where the railways run.
        const a =
          -Math.PI / 2 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 12);
        const x = centre.x + Math.cos(a) * r,
          y = centre.y + Math.sin(a) * r;
        if (!plan.onLand(x, y, 0.1)) continue;
        if (onRoadOrCity(roads, x, -y, RAIL_ROAD_CLEARANCE, 0)) continue;
        found = new Vector2(x, y);
        break search;
      }
    stations.set(id, found);
    return found;
  };
  const cityOf = (p: Vector3) =>
    roads.cities.reduce((best, c) =>
      c.position.distanceTo(p) < best.position.distanceTo(p) ? c : best,
    ).id;
  for (const [id, from, stops, to] of JAVA_RAIL) {
    const start = stationAt(from),
      end = stationAt(to);
    if (!start || !end) continue;
    // Each leg between stops is routed overland, steering round the roads.
    // A stop that would send the line back on itself is skipped, so lines
    // don't fold into hairpins on their way through.
    const waypoints = [start];
    const calls = [...stops.map(projectCoordinate), end];
    calls.forEach((stop, i) => {
      const next = calls[i + 1];
      const prev = waypoints[waypoints.length - 1];
      if (next) {
        const ax = stop.x - prev.x,
          ay = stop.y - prev.y,
          bx = next.x - stop.x,
          by = next.y - stop.y;
        const turn =
          (ax * bx + ay * by) / (Math.hypot(ax, ay) * Math.hypot(bx, by) || 1);
        if (turn < -0.3) return;
      }
      waypoints.push(stop);
    });
    const path: Vector2[] = [];
    for (let i = 1; i < waypoints.length; i++) {
      const leg = routeAwayFromRoads(
        world,
        plan,
        roads,
        waypoints[i - 1],
        waypoints[i],
        RAIL_ROAD_CLEARANCE,
        railCells,
      ) ?? [waypoints[i - 1], waypoints[i]];
      path.push(...(i > 1 ? leg.slice(1) : leg));
    }
    const line = samplePath(
      path,
      (p) => Math.max(0.03, world.surfaceHeight(p)),
      RAIL_STEP,
    );
    drapeOver(world, line.points, RAIL_HALF_WIDTH);
    rail.push({ id, region: "java", baseline: BASELINE_RAIL.has(id), ...line });
  }
  for (const road of roads.roads) {
    // Java has its own inland railways, laid above.
    if (road.provinces.every((p) => regionForProvince(p)?.id === "java"))
      continue;
    if (NO_RAIL.has(road.id)) continue;
    const first = stationAt(cityOf(road.points[0])),
      last = stationAt(cityOf(road.points[road.points.length - 1]));
    if (!first || !last) continue;
    const path = routeAwayFromRoads(
      world,
      plan,
      roads,
      first,
      last,
      RAIL_ROAD_CLEARANCE,
      railCells,
    );
    if (!path) continue;
    const line = samplePath(
      path,
      (p) => Math.max(0.03, world.surfaceHeight(p)),
      RAIL_STEP,
    );
    // Cities whose stations coincide need no line of their own.
    if (line.length < 1) continue;
    drapeOver(world, line.points, RAIL_HALF_WIDTH);
    const counts = new Map<string, number>();
    for (const id of road.provinces) {
      const region = regionForProvince(id)?.id;
      if (region) counts.set(region, (counts.get(region) ?? 0) + 1);
    }
    const region = [...counts].sort((x, y) => y[1] - x[1])[0]?.[0];
    if (!region) continue;
    rail.push({
      id: road.id,
      region: region as RegionId,
      baseline: BASELINE_RAIL.has(road.id),
      ...line,
    });
  }

  // A runway on open, level ground just outside each hub city.
  const airports: Airport[] = [];
  for (const id of AIRPORT_CITIES) {
    const city = roads.cities.find((c) => c.id === id);
    if (!city) continue;
    let found: Airport | null = null;
    // Small islands get a shorter search ring and less clearance from the coast.
    for (const [margin, clearance, road, slope] of [
      [0.18, 0.75, 0.22, 0.12],
      [0.08, 0.55, 0.18, 0.16],
      [0.03, 0.4, 0.14, 0.24],
    ])
      for (let r = 0.6; r <= 2.4 && !found; r += 0.15)
        for (let k = 0; k < 16 && !found; k++) {
          const a = (k / 16) * Math.PI * 2 + r;
          const x = city.position.x + Math.cos(a) * r,
            z = city.position.z + Math.sin(a) * r;
          const heading = a + Math.PI / 2;
          const ends = [-0.45, 0, 0.45].map(
            (s) =>
              new Vector2(
                x + Math.cos(heading) * s,
                -(z + Math.sin(heading) * s),
              ),
          );
          if (!ends.every((p) => plan.onLand(p.x, p.y, margin))) continue;
          if (ends.some((p) => onRoadOrCity(roads, p.x, -p.y, road, clearance)))
            continue;
          // Nor across a railway.
          if (
            ends.some((p) =>
              rail.some((line) =>
                line.points.some(
                  (q) => Math.hypot(q.x - p.x, q.z + p.y) < 0.25,
                ),
              ),
            )
          )
            continue;
          const heights = ends.map((p) => world.surfaceHeight(p));
          if (Math.max(...heights) - Math.min(...heights) > slope) continue;
          found = {
            id,
            region: (regionForProvince(city.province)?.id ??
              regionNear(x, z)) as RegionId,
            position: new Vector3(x, Math.max(...heights), z),
            heading,
          };
        }
    if (found) airports.push(found);
  }

  // Fishing grounds just off the coasts, spread along each island.
  const fishing: FishingSpot[] = [];
  for (const coast of world.coastlines) {
    const ring = coast.shape;
    let perimeter = 0;
    for (let i = 1; i < ring.length; i++)
      perimeter += ring[i].distanceTo(ring[i - 1]);
    const count = Math.min(6, Math.floor(perimeter / 9));
    for (let n = 0; n < count; n++) {
      const p = ring[Math.floor(((n + 0.5) / count) * ring.length)];
      const spot = offshore(p, 0.3);
      if (!spot || spot.distanceTo(p) > 1.2) continue;
      fishing.push({
        position: new Vector3(spot.x, SEA_LEVEL, -spot.y),
        region: regionNear(spot.x, -spot.y),
      });
    }
  }

  network = { sea: routes, rail, airports, fishing };
  cache.set(world, network);
  return network;
}

/** Position and heading at a distance along a path. */
export function pointAlong(
  path: TransportPath,
  distance: number,
  out: Vector3,
) {
  const d = Math.max(0, Math.min(path.length, distance));
  let low = 0,
    high = path.points.length - 1;
  while (low + 1 < high) {
    const middle = (low + high) >> 1;
    if (path.distances[middle] <= d) low = middle;
    else high = middle;
  }
  const a = path.points[low],
    b = path.points[high];
  const span = path.distances[high] - path.distances[low];
  const f = span > 0 ? (d - path.distances[low]) / span : 0;
  out.set(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, a.z + (b.z - a.z) * f);
  return -Math.atan2(b.z - a.z, b.x - a.x);
}
