import { Vector2 } from "three";
import type { WorldGeometry } from "./mapGeometry";

/** Ground within this distance of a road's centre is levelled to the road. */
const LEVEL = 0.17;
/** Beyond LEVEL the ground eases back to its own height by this distance. */
const BLEND = 0.42;
const CELL = 0.5;

type Path = { points: { x: number; y: number; z: number }[] };
type Segment = {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  ha: number;
  hb: number;
};

const smoothstep = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};

/** A gentle height profile along a path, so a road climbs hills as a smooth grade. */
function profile(path: Path) {
  let heights = path.points.map((p) => p.y);
  for (let round = 0; round < 6; round++)
    heights = heights.map((h, i) =>
      i === 0 || i === heights.length - 1
        ? h
        : (heights[i - 1] + 2 * h + heights[i + 1]) / 4,
    );
  return heights;
}

/**
 * Cuts and fills the terrain along the roads, like a road bed: a level strip
 * under each road that blends back into the hills on either side. Terrain is
 * illustrative, so this favours roads that sit cleanly on the ground over
 * exact relief. Coastline vertices stay at sea level.
 *
 * Mutates the province meshes, their border outlines and nearby scenery in
 * place; the surface sampler reads the same position buffers, so it follows.
 */
export function gradeTerrain(world: WorldGeometry, paths: Path[]) {
  const grid = new Map<string, Segment[]>();
  const key = (i: number, j: number) => `${i},${j}`;
  for (const path of paths) {
    const heights = profile(path);
    for (let i = 0; i < path.points.length - 1; i++) {
      const a = path.points[i],
        b = path.points[i + 1];
      const segment = {
        ax: a.x,
        az: a.z,
        bx: b.x,
        bz: b.z,
        ha: heights[i],
        hb: heights[i + 1],
      };
      const minI = Math.floor((Math.min(a.x, b.x) - BLEND) / CELL),
        maxI = Math.floor((Math.max(a.x, b.x) + BLEND) / CELL),
        minJ = Math.floor((Math.min(a.z, b.z) - BLEND) / CELL),
        maxJ = Math.floor((Math.max(a.z, b.z) + BLEND) / CELL);
      for (let ci = minI; ci <= maxI; ci++)
        for (let cj = minJ; cj <= maxJ; cj++) {
          const list = grid.get(key(ci, cj));
          if (list) list.push(segment);
          else grid.set(key(ci, cj), [segment]);
        }
    }
  }
  /** The road grade nearest to (x, z) and its distance, or null when out of reach. */
  const nearest = (x: number, z: number) => {
    const list = grid.get(key(Math.floor(x / CELL), Math.floor(z / CELL)));
    if (!list) return null;
    let best = BLEND,
      height = 0;
    for (const s of list) {
      const dx = s.bx - s.ax,
        dz = s.bz - s.az,
        length2 = dx * dx + dz * dz || 1;
      const t = Math.max(
        0,
        Math.min(1, ((x - s.ax) * dx + (z - s.az) * dz) / length2),
      );
      const d = Math.hypot(x - s.ax - dx * t, z - s.az - dz * t);
      if (d < best) {
        best = d;
        height = s.ha + (s.hb - s.ha) * t;
      }
    }
    return best < BLEND ? { distance: best, height } : null;
  };
  /** How far the ground at (x, z) moves towards the road grade: 1 on the bed, 0 outside. */
  const graded = (x: number, z: number, y: number) => {
    const near = nearest(x, z);
    if (!near) return y;
    const weight = smoothstep((BLEND - near.distance) / (BLEND - LEVEL));
    return y + (Math.max(0.03, near.height) - y) * weight;
  };

  const probe = new Vector2();
  // Scenery keeps its footing: remember the ground under it before grading.
  const footing = world.provinces.map((p) =>
    [...p.scenery.trees, ...p.scenery.houses, ...p.scenery.palms].map(
      (item) => ({
        item,
        before: world.surfaceHeight(
          probe.set(item.position.x, -item.position.z),
        ),
      }),
    ),
  );
  for (const province of world.provinces) {
    const positions = province.geometry.getAttribute("position");
    let changed = false;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      // Coastline vertices sit at sea level; leave the beaches alone.
      if (y <= 0.02) continue;
      const next = graded(positions.getX(i), positions.getZ(i), y);
      if (next !== y) {
        positions.setY(i, next);
        changed = true;
      }
    }
    if (!changed) continue;
    positions.needsUpdate = true;
    province.geometry.computeVertexNormals();
    province.geometry.computeBoundingBox();
    province.geometry.computeBoundingSphere();
    province.bounds.copy(province.geometry.boundingBox!);
  }
  for (const province of world.provinces) {
    const outline = province.outline.getAttribute("position");
    for (let i = 0; i < outline.count; i++) {
      const x = outline.getX(i),
        z = outline.getZ(i);
      if (!nearest(x, z)) continue;
      outline.setY(i, world.surfaceHeight(probe.set(x, -z)) + 0.025);
    }
    outline.needsUpdate = true;
  }
  for (const list of footing)
    for (const { item, before } of list) {
      const after = world.surfaceHeight(
        probe.set(item.position.x, -item.position.z),
      );
      item.position.y += after - before;
    }
}
