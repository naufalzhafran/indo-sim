import { Vector2, Vector3 } from "three";
import type { WorldGeometry } from "./mapGeometry";
import { buildRoadNetwork, onRoadOrCity } from "./roadNetwork";
import type { TransportModel } from "./transportModels";
import type { Crisis } from "./worldTypes";

export type CrisisPiece = {
  position: Vector3;
  rotation: number;
  scale: number;
  /** Seed for gentle motion, such as drifting haze. */
  seed: number;
};
export type CrisisSceneryLayout = Map<TransportModel, CrisisPiece[]>;

const unit = (a: number, b: number) =>
  Math.abs((Math.sin(a * 127.1 + b * 311.7) * 43758.5453) % 1);
const textSeed = (text: string) =>
  [...text].reduce((sum, c, i) => sum + c.charCodeAt(0) * (i + 1), 0) % 997;

const MODEL: Record<Crisis["kind"], TransportModel> = {
  flood: "flood",
  harvest: "dry",
  outbreak: "tent",
  earthquake: "crack",
  haze: "haze",
};

/** How strongly a crisis still shows: full while active, fading through recovery. */
export function crisisIntensity(crisis: Crisis) {
  if (crisis.resolved) return 0;
  if (crisis.stage === "warning") return 0.5;
  const left =
    crisis.initialDamage > 0 ? crisis.damage / crisis.initialDamage : 1;
  return Math.max(0.2, Math.min(1, left));
}

/**
 * Ground-level scenery for each unresolved crisis around its province's anchor:
 * floodwater on low ground, parched fields, field clinics, cracked earth or
 * haze. Recovery adds cranes. Pieces scale down as the damage is repaired.
 */
export function layoutCrisisScenery(
  world: WorldGeometry,
  crises: readonly Crisis[],
): CrisisSceneryLayout {
  const layout: CrisisSceneryLayout = new Map();
  const roads = buildRoadNetwork(world);
  const add = (model: TransportModel, piece: CrisisPiece) => {
    let list = layout.get(model);
    if (!list) layout.set(model, (list = []));
    list.push(piece);
  };
  for (const crisis of crises) {
    const intensity = crisisIntensity(crisis);
    if (!intensity) continue;
    const province = world.provinces.find((p) => p.id === crisis.province);
    if (!province) continue;
    const seed = textSeed(crisis.id);
    const anchor = province.anchor;
    const model = MODEL[crisis.kind];
    const near = model === "tent";
    const candidates: { x: number; z: number; h: number; slope: number }[] = [];
    for (let k = 0; k < 96; k++) {
      const angle = unit(seed, k) * Math.PI * 2;
      const reach = near
        ? 0.35 + unit(seed, k + 50) * 0.8
        : 0.6 + unit(seed, k + 50) * 1.9;
      const x = anchor.x + Math.cos(angle) * reach,
        z = anchor.z + Math.sin(angle) * reach;
      if (
        x < province.bounds.min.x ||
        x > province.bounds.max.x ||
        z < province.bounds.min.z ||
        z > province.bounds.max.z
      )
        continue;
      const h = world.surfaceHeight(new Vector2(x, -z));
      if (h < 0.05) continue;
      // Keep roads and towns readable, and prefer level ground for flat pieces.
      let slope = 0;
      if (model !== "haze") {
        if (onRoadOrCity(roads, x, z, 0.25, 0.7)) continue;
        for (const [dx, dz] of [
          [0.35, 0],
          [-0.35, 0],
          [0, 0.35],
          [0, -0.35],
        ])
          slope = Math.max(
            slope,
            Math.abs(world.surfaceHeight(new Vector2(x + dx, -(z + dz))) - h),
          );
        if (slope > 0.3) continue;
      }
      // Spread the pieces out instead of stacking them.
      if (candidates.some((c) => Math.hypot(c.x - x, c.z - z) < 0.55)) continue;
      candidates.push({ x, z, h, slope });
    }
    // Floodwater settles on the lowest ground; other scenery on the flattest.
    candidates.sort((a, b) =>
      model === "flood" ? a.h + a.slope - b.h - b.slope : a.slope - b.slope,
    );
    const count = Math.round(
      (model === "tent" ? 2 : 3) + intensity * (model === "haze" ? 5 : 4),
    );
    candidates.slice(0, count).forEach((c, i) => {
      const scale =
        (model === "haze"
          ? 1.1 + unit(seed, i + 90) * 0.6
          : 0.7 + unit(seed, i + 90) * 0.4) *
        (model === "tent" ? 1 : 0.6 + intensity * 0.4);
      add(model, {
        position: new Vector3(
          c.x,
          c.h + (model === "haze" ? 0.9 + unit(seed, i + 70) * 0.6 : 0.005),
          c.z,
        ),
        rotation: unit(seed, i + 30) * Math.PI * 2,
        scale,
        seed: seed + i,
      });
    });
    if (crisis.stage === "recovery")
      candidates.slice(count, count + 2).forEach((c, i) =>
        add("crane", {
          position: new Vector3(c.x, c.h, c.z),
          rotation: unit(seed, i + 110) * Math.PI * 2,
          scale: 1,
          seed: seed + i,
        }),
      );
  }
  return layout;
}
