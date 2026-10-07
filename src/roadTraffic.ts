import { Box3, Vector3 } from "three";
import type { Road, RoadClass, RoadRun } from "./roadNetwork";

export const MAX_VEHICLES = 160;
export const ROAD_HALF_WIDTH: Record<RoadClass, number> = {
  track: 0.04,
  national: 0.07,
  toll: 0.105,
};
const SPACING: Record<RoadClass, number> = {
  track: 7,
  national: 2.4,
  toll: 1.1,
};
const SPEED: Record<RoadClass, number> = {
  track: 0.14,
  national: 0.3,
  toll: 0.55,
};

export type TrafficRun = {
  road: Road;
  run: RoadRun;
  start: number;
  length: number;
  bounds: Box3;
};
export type TrafficVehicle = {
  group: number;
  phase: number;
  forward: boolean;
  color: number;
  local: boolean;
};
export type TrafficPlan = {
  groups: TrafficRun[];
  vehicles: TrafficVehicle[];
};

const unit = (a: number, b: number) =>
  Math.abs((Math.sin(a * 127.1 + b * 311.7) * 43758.5453) % 1);

/** Visit the middle, quarters, then smaller gaps so a capped road stays populated along its length. */
function spreadOrder(count: number) {
  const result: number[] = [];
  const intervals = [[0, count]];
  for (let i = 0; i < intervals.length; i++) {
    const [from, to] = intervals[i];
    if (from >= to) continue;
    const middle = Math.floor((from + to) / 2);
    result.push(middle);
    intervals.push([from, middle], [middle + 1, to]);
  }
  return result;
}

function interleave(groups: TrafficVehicle[][]) {
  const result: TrafficVehicle[] = [];
  const longest = Math.max(0, ...groups.map((group) => group.length));
  for (let i = 0; i < longest; i++)
    for (const group of groups) if (group[i]) result.push(group[i]);
  return result;
}

export function buildTrafficPlan(
  roads: readonly { road: Road; runs: readonly RoadRun[] }[],
): TrafficPlan {
  const groups: TrafficRun[] = [];
  const overview: TrafficVehicle[][] = [],
    local: TrafficVehicle[][] = [];
  for (let roadIndex = 0; roadIndex < roads.length; roadIndex++) {
    const { road, runs } = roads[roadIndex];
    for (const run of runs) {
      const start = road.distances[run.from];
      const length = road.distances[run.to] - start;
      if (length <= 0) continue;
      const bounds = new Box3();
      for (let point = run.from; point <= run.to; point++)
        bounds.expandByPoint(road.points[point]);
      // Include lane offsets, the vehicle body, and its height above the ribbon.
      bounds.expandByScalar(0.2);
      const group = groups.length;
      groups.push({ road, run, start, length, bounds });
      const count = Math.floor(length / SPACING[run.roadClass]);
      const extra = Math.floor((length * 2) / SPACING[run.roadClass]) - count;
      const seed = roadIndex * 997 + run.from;
      const vehicles = (size: number, isLocal: boolean) =>
        spreadOrder(size).map((index) => ({
          group,
          phase:
            ((index + unit(seed, index + 4) + (isLocal ? 0.5 : 0)) /
              Math.max(1, size)) %
            1,
          forward: index % 2 === 0,
          color: (seed + index) % 5,
          local: isLocal,
        }));
      overview.push(vehicles(count, false));
      local.push(vehicles(extra, true));
    }
  }
  // The old western-first cap could leave eastern islands without any traffic.
  // Each visible run now gets a turn before another vehicle is taken from it.
  return { groups, vehicles: [...interleave(overview), ...interleave(local)] };
}

/** Sample from elapsed time, so culling never pauses or restarts a vehicle. Returns its heading. */
export function sampleTrafficVehicle(
  vehicle: TrafficVehicle,
  group: TrafficRun,
  time: number,
  position: Vector3,
) {
  const { road, run, start, length } = group;
  let t =
    (vehicle.phase + (time * SPEED[run.roadClass]) / Math.max(0.5, length)) % 1;
  if (!vehicle.forward) t = 1 - t;
  const distance = start + t * length;
  let low = run.from,
    high = run.to;
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (road.distances[middle] <= distance) low = middle;
    else high = middle;
  }
  const a = road.points[low],
    b = road.points[high];
  const f = Math.min(
    1,
    Math.max(
      0,
      (distance - road.distances[low]) /
        Math.max(0.00001, road.distances[high] - road.distances[low]),
    ),
  );
  const dx = b.x - a.x,
    dz = b.z - a.z,
    norm = Math.hypot(dx, dz) || 1;
  const lane =
    ROAD_HALF_WIDTH[run.roadClass] * 0.45 * (vehicle.forward ? 1 : -1);
  position.set(
    a.x + dx * f - (dz / norm) * lane,
    a.y + (b.y - a.y) * f + 0.065,
    a.z + dz * f + (dx / norm) * lane,
  );
  return -Math.atan2(dz, dx) + (vehicle.forward ? 0 : Math.PI);
}
