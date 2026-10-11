import { unsharedRanges } from "./roadNetwork";

type Point = { x: number; z: number };

const segmentDistance = (p: Point, a: Point, b: Point) => {
  const dx = b.x - a.x,
    dz = b.z - a.z,
    length2 = dx * dx + dz * dz || 1;
  const t = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / length2),
  );
  return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t);
};

/**
 * Ends of the drawn pieces (after shared stretches are dropped) that neither
 * stop at a hub nor touch another drawn piece: visible gaps in the network.
 */
export function looseEnds(
  paths: readonly { id: string; points: readonly Point[] }[],
  hubs: readonly Point[],
  radius?: number,
  overlap?: number,
  tolerance = 0.035,
) {
  const pieces = unsharedRanges(paths, radius, overlap).flatMap((ranges, i) =>
    ranges.map(([a, b]) => ({
      id: paths[i].id,
      points: paths[i].points.slice(a, b + 1),
    })),
  );
  const loose: string[] = [];
  pieces.forEach((piece, k) => {
    for (const end of [piece.points[0], piece.points.at(-1)!]) {
      if (hubs.some((h) => Math.hypot(h.x - end.x, h.z - end.z) < 0.05))
        continue;
      const touches = pieces.some(
        (other, j) =>
          j !== k &&
          other.points.some(
            (q, i) =>
              i > 0 && segmentDistance(end, other.points[i - 1], q) < tolerance,
          ),
      );
      if (!touches)
        loose.push(`${piece.id} @ ${end.x.toFixed(2)},${end.z.toFixed(2)}`);
    }
  });
  return loose;
}
