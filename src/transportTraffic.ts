import baseline from "./data/baseline.json" with { type: "json" };
import { Vector3 } from "three";
import { GAME_REGIONS, regionForProvince } from "./engine/gameRegions";
import { shipFood } from "./engine/economy/network";
import type { RegionId } from "./engine/economy/types";
import type { PolicyStructureInput } from "./structureLayout";
import {
  pointAlong,
  type RailLine,
  type TransportNetwork,
  type TransportPath,
} from "./transportNetwork";
import type { Province } from "./worldTypes";

export const MAX_CARGO_SHIPS = 30;
export const MAX_FERRIES = 8;
export const MAX_TRAINS = 14;
export const MAX_PLANES = 8;
export const TRAIN_CARS = 4;
export const TRAIN_CAR_SPACING = 0.22;

const openingGdp = new Map(
  GAME_REGIONS.map((region) => [
    region.id,
    baseline.provinces
      .filter((p) => region.provinceIds.includes(p.id))
      .reduce((sum, p) => sum + p.gdp, 0),
  ]),
);

/** Each region's output against the campaign's opening year (1 = unchanged). */
export function regionGrowth(
  provinces: readonly Pick<Province, "id" | "gdp">[],
): Map<RegionId, number> {
  const totals = new Map<string, number>();
  for (const p of provinces) {
    const region = regionForProvince(p.id)?.id;
    if (region) totals.set(region, (totals.get(region) ?? 0) + p.gdp);
  }
  return new Map(
    GAME_REGIONS.map((region) => {
      const start = openingGdp.get(region.id) ?? 0;
      const now = totals.get(region.id);
      return [
        region.id as RegionId,
        start > 0 && now !== undefined ? now / start : 1,
      ];
    }),
  );
}
/** 0 at the opening economy, 1 once a region has grown by about a third. */
export const growthProgress = (ratio: number) =>
  Math.max(0, Math.min(1, (ratio - 1) / 0.35));

export type ShipPlan = { route: number; phase: number; speed: number };
export type TrainPlan = { line: number; phase: number; speed: number };
export type FlightPlan = { from: number; to: number; phase: number };
export type FleetPlan = {
  cargo: ShipPlan[];
  ferries: ShipPlan[];
  rail: RailLine[];
  trains: TrainPlan[];
  flights: FlightPlan[];
};

const unit = (a: number, b: number) =>
  Math.abs((Math.sin(a * 127.1 + b * 311.7) * 43758.5453) % 1);
const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** How busy each line is, from food trade, funded policy and regional growth. */
export function planFleet(
  network: TransportNetwork,
  provinces: Province[],
  structures: PolicyStructureInput[],
): FleetPlan {
  const growth = regionGrowth(provinces);
  const funded = (policy: string, region: string, delivery = 0.5) =>
    structures.some(
      (s) =>
        s.policy === policy && s.region === region && s.delivery >= delivery,
    );
  const shipments: { from: string; to: string; tons: number }[] = [];
  shipFood(
    provinces,
    new Map(provinces.map((p) => [p.id, p.foodProduction])),
    shipments,
  );
  const tons = new Map<string, number>();
  for (const s of shipments) {
    const a = regionForProvince(s.from)?.id,
      b = regionForProvince(s.to)?.id;
    if (!a || !b) continue;
    const key = pairKey(a, b);
    tons.set(key, (tons.get(key) ?? 0) + s.tons);
  }
  const busiest = Math.max(1, ...tons.values());

  const cargo: ShipPlan[] = [],
    ferries: ShipPlan[] = [];
  network.sea.forEach((route, index) => {
    const [a, b] = route.regions;
    const lift = (growth.get(a)! + growth.get(b)!) / 2;
    let count: number;
    if (route.kind === "ferry") {
      count =
        1 + Number(funded("tourism-access", a) || funded("tourism-access", b));
    } else {
      const trade = (tons.get(pairKey(a, b)) ?? 0) / busiest;
      count =
        1 +
        Math.round(trade * 2) +
        Number(funded("tol-laut", a) || funded("tol-laut", b)) +
        Math.round(growthProgress(lift) * 2);
      // Short hops need fewer ships to look busy.
      count = Math.min(count, Math.max(1, Math.round(route.length / 6)));
    }
    for (let i = 0; i < count; i++)
      (route.kind === "ferry" ? ferries : cargo).push({
        route: index,
        phase: (i + unit(index, i) * 0.4) / count,
        // One speed per line, so its ships never catch each other up.
        speed: route.kind === "ferry" ? 0.22 : 0.42 + unit(index, 7) * 0.08,
      });
  });
  // Ordered by phase, so the cap thins every line rather than dropping whole lines.
  cargo.sort((x, y) => x.phase - y.phase);

  const rail = network.rail.filter(
    (line) => line.baseline || funded("kereta-antarkota", line.region, 0.5),
  );
  const trains: TrainPlan[] = [];
  rail.forEach((line, index) => {
    const commuter =
      funded("krl", line.region, 0.3) || funded("mrt-lrt", line.region, 0.3);
    const count = Math.min(
      2,
      1 +
        Number(commuter && line.length > 6) +
        Number(funded("kereta-antarkota", line.region, 1) && line.length > 10),
    );
    for (let i = 0; i < count; i++)
      trains.push({
        line: index,
        phase: (i + unit(index, i + 3)) / count,
        speed: 0.35 + unit(index, i + 11) * 0.1,
      });
  });

  // Planes fly the busiest pairs of hubs, more of them as the economy grows.
  const airports = network.airports;
  const pairs: { from: number; to: number; weight: number }[] = [];
  const hubWeight = (region: RegionId) =>
    (openingGdp.get(region) ?? 0) * (growth.get(region) ?? 1) +
    (funded("tourism-access", region) ? 1500 : 0);
  for (let i = 0; i < airports.length; i++)
    for (let j = i + 1; j < airports.length; j++) {
      const distance = airports[i].position.distanceTo(airports[j].position);
      if (distance < 8) continue;
      pairs.push({
        from: i,
        to: j,
        weight:
          Math.sqrt(
            hubWeight(airports[i].region) * hubWeight(airports[j].region),
          ) / Math.sqrt(distance),
      });
    }
  const national =
    GAME_REGIONS.reduce(
      (sum, r) =>
        sum + (openingGdp.get(r.id) ?? 0) * growth.get(r.id as RegionId)!,
      0,
    ) /
    Math.max(
      1,
      GAME_REGIONS.reduce((sum, r) => sum + (openingGdp.get(r.id) ?? 0), 0),
    );
  const tourism = GAME_REGIONS.filter((r) =>
    funded("tourism-access", r.id),
  ).length;
  const planes = Math.max(
    4,
    Math.min(
      MAX_PLANES,
      Math.round(5 + growthProgress(national) * 3 + tourism * 0.5),
    ),
  );
  const used = new Map<number, number>();
  const flights: FlightPlan[] = [];
  for (let n = 0; n < planes && pairs.length; n++) {
    // Each hub already served counts against it, so routes spread out.
    let best = 0,
      bestScore = -Infinity;
    pairs.forEach((pair, k) => {
      const score =
        pair.weight /
        (1 + (used.get(pair.from) ?? 0) + (used.get(pair.to) ?? 0));
      if (score > bestScore) ((bestScore = score), (best = k));
    });
    const [pair] = pairs.splice(best, 1);
    used.set(pair.from, (used.get(pair.from) ?? 0) + 1);
    used.set(pair.to, (used.get(pair.to) ?? 0) + 1);
    flights.push({ from: pair.from, to: pair.to, phase: unit(n, 5) });
  }

  return {
    cargo: cargo.slice(0, MAX_CARGO_SHIPS),
    ferries: ferries.slice(0, MAX_FERRIES),
    rail,
    trains: trains.slice(0, MAX_TRAINS),
    flights,
  };
}

/**
 * Out and back along a path with a pause at each end. Writes the position and
 * returns the heading, sampled from elapsed time so culling never restarts it.
 */
export function shuttle(
  path: TransportPath,
  speed: number,
  dwell: number,
  phase: number,
  time: number,
  out: Vector3,
  lane = 0,
) {
  const travel = path.length / speed;
  const cycle = 2 * (travel + dwell);
  const t = (((phase * cycle + time) % cycle) + cycle) % cycle;
  let distance: number,
    back = false;
  if (t < dwell) distance = 0;
  else if (t < dwell + travel) distance = (t - dwell) * speed;
  else if (t < 2 * dwell + travel) ((distance = path.length), (back = true));
  else
    ((distance = path.length - (t - 2 * dwell - travel) * speed),
      (back = true));
  const heading = pointAlong(path, distance, out) + (back ? Math.PI : 0);
  if (lane) {
    // Ships keep to their own side of the lane in each direction.
    out.x += Math.sin(heading) * lane;
    out.z += Math.cos(heading) * lane;
  }
  return heading;
}

/** Where a train's front car is, as a distance, and which way it runs. */
export function trainHead(line: RailLine, plan: TrainPlan, time: number) {
  const span = Math.max(
    0.01,
    line.length - (TRAIN_CARS - 1) * TRAIN_CAR_SPACING,
  );
  const dwell = 4;
  const travel = span / plan.speed;
  const cycle = 2 * (travel + dwell);
  const t = (((plan.phase * cycle + time) % cycle) + cycle) % cycle;
  if (t < dwell) return { rear: 0, forward: true };
  if (t < dwell + travel)
    return { rear: (t - dwell) * plan.speed, forward: true };
  if (t < 2 * dwell + travel) return { rear: span, forward: false };
  return {
    rear: span - (t - 2 * dwell - travel) * plan.speed,
    forward: false,
  };
}

/** A plane's progress: 0–1 along its leg and which way, or null while on the ground. */
export function flightLeg(distance: number, phase: number, time: number) {
  const travel = 3 + distance / 2.2,
    ground = 5;
  const cycle = 2 * (travel + ground);
  const t = (((phase * cycle + time) % cycle) + cycle) % cycle;
  if (t < travel) return { u: t / travel, outbound: true };
  if (t < travel + ground) return null;
  if (t < 2 * travel + ground)
    return { u: (t - travel - ground) / travel, outbound: false };
  return null;
}
