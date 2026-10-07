import { ShapeUtils, Vector2, type Shape } from "three";

type Face = [number, number, number];
export type TerrainMesh = {
  points: Vector2[];
  triangles: Face[];
  rings: Vector2[][];
};
const cross = (a: Vector2, b: Vector2, c: Vector2) =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
// Numeric keys keep edge flips fast on dense meshes (well under 2^20 points per part).
const EDGE = 1 << 20;
const edgeKey = (a: number, b: number) => (a < b ? a * EDGE + b : b * EDGE + a);

function subdivideRing(source: Vector2[], spacing: number): Vector2[] {
  const ring = source.filter(
    (point, i) =>
      !point.equals(source[(i + source.length - 1) % source.length]),
  );
  const result: Vector2[] = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i],
      b = ring[(i + 1) % ring.length];
    const count = Math.max(1, Math.ceil(a.distanceTo(b) / spacing));
    // Evaluate in a canonical direction: a shared border gets bit-identical
    // vertices even when its two provinces traverse that border in reverse.
    const forward = a.x < b.x || (a.x === b.x && a.y < b.y);
    const from = forward ? a : b,
      to = forward ? b : a;
    for (let step = 0; step < count; step++) {
      const t = (forward ? step : count - step) / count;
      result.push(
        step === 0
          ? a.clone()
          : new Vector2(
              from.x + (to.x - from.x) * t,
              from.y + (to.y - from.y) * t,
            ),
      );
    }
  }
  return result;
}

function insideRing(point: Vector2, ring: Vector2[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i],
      b = ring[j];
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}

function nearBoundary(point: Vector2, rings: Vector2[][], distance: number) {
  const limit = distance * distance;
  return rings.some((ring) =>
    ring.some((a, i) => {
      const b = ring[(i + 1) % ring.length];
      const dx = b.x - a.x,
        dy = b.y - a.y;
      const t = Math.max(
        0,
        Math.min(
          1,
          ((point.x - a.x) * dx + (point.y - a.y) * dy) /
            (dx * dx + dy * dy || 1),
        ),
      );
      return (
        (point.x - a.x - t * dx) ** 2 + (point.y - a.y - t * dy) ** 2 < limit
      );
    }),
  );
}

function triangulatePart(rings: Vector2[][], spacing: number) {
  const points = rings.flat();
  const triangles: Face[] = [];
  const edges = new Map<number, Set<number>>();
  const constrained = new Set<number>();
  let offset = 0;
  for (const ring of rings) {
    ring.forEach((_, i) =>
      constrained.add(edgeKey(offset + i, offset + ((i + 1) % ring.length))),
    );
    offset += ring.length;
  }
  const faceEdges = ([a, b, c]: Face) => [
    [a, b],
    [b, c],
    [c, a],
  ];
  const removeFace = (index: number) => {
    for (const [a, b] of faceEdges(triangles[index])) {
      const key = edgeKey(a, b),
        adjacent = edges.get(key)!;
      adjacent.delete(index);
      if (!adjacent.size) edges.delete(key);
    }
  };
  const setFace = (index: number, a: number, b: number, c: number) => {
    const face: Face =
      cross(points[a], points[b], points[c]) > 0 ? [a, b, c] : [a, c, b];
    triangles[index] = face;
    for (const [u, v] of faceEdges(face)) {
      const key = edgeKey(u, v);
      if (!edges.has(key)) edges.set(key, new Set());
      edges.get(key)!.add(index);
    }
  };
  for (const [a, b, c] of ShapeUtils.triangulateShape(
    rings[0].slice(),
    rings.slice(1).map((ring) => ring.slice()),
  )) {
    if (Math.abs(cross(points[a], points[b], points[c])) > 1e-12)
      setFace(triangles.length, a, b, c);
  }
  const legalize = (pending: number[]) => {
    while (pending.length) {
      const key = pending.pop()!;
      if (constrained.has(key)) continue;
      const adjacent = edges.get(key);
      if (adjacent?.size !== 2) continue;
      const [first, second] = [...adjacent];
      const a = Math.floor(key / EDGE),
        b = key % EDGE;
      const c = triangles[first].find((p) => p !== a && p !== b)!;
      const d = triangles[second].find((p) => p !== a && p !== b)!;
      const pa = points[a],
        pb = points[b],
        pc = points[c],
        pd = points[d];
      if (cross(pc, pd, pa) * cross(pc, pd, pb) >= -1e-14) continue;
      const ax = pa.x - pd.x,
        ay = pa.y - pd.y;
      const bx = pb.x - pd.x,
        by = pb.y - pd.y;
      const cx = pc.x - pd.x,
        cy = pc.y - pd.y;
      const determinant =
        (ax * ax + ay * ay) * (bx * cy - by * cx) -
        (bx * bx + by * by) * (ax * cy - ay * cx) +
        (cx * cx + cy * cy) * (ax * by - ay * bx);
      if (determinant * Math.sign(cross(pa, pb, pc)) <= 1e-10) continue;
      removeFace(first);
      removeFace(second);
      setFace(first, c, d, a);
      setFace(second, d, c, b);
      pending.push(edgeKey(c, a), edgeKey(a, d), edgeKey(d, b), edgeKey(b, c));
    }
  };
  const sidesOf = ([a, b, c]: Face, p: Vector2) => [
    cross(points[a], points[b], p),
    cross(points[b], points[c], p),
    cross(points[c], points[a], p),
  ];
  // Walk across neighbouring faces from the newest one; scan only when the
  // walk stops at the constrained edge of a concave coastline.
  const locate = (p: Vector2) => {
    let current = triangles.length - 1;
    for (let step = 0; current >= 0 && step < triangles.length; step++) {
      const outside = sidesOf(triangles[current], p).findIndex(
        (side) => side < -1e-10,
      );
      if (outside < 0) return current;
      const [u, v] = faceEdges(triangles[current])[outside];
      let next = -1;
      for (const face of edges.get(edgeKey(u, v)) ?? [])
        if (face !== current) next = face;
      if (next < 0) break;
      current = next;
    }
    return triangles.findIndex((face) =>
      sidesOf(face, p).every((side) => side >= -1e-10),
    );
  };
  const insert = (index: number, flip: boolean) => {
    const p = points[index];
    const i = locate(p);
    if (i >= 0) {
      const [a, b, c] = triangles[i];
      const sides = sidesOf(triangles[i], p);
      if (
        [a, b, c].some((vertex) => points[vertex].distanceToSquared(p) < 1e-18)
      )
        return false;
      const onEdge = sides.findIndex((side) => Math.abs(side) < 1e-10);
      const pending: number[] = [];
      if (onEdge >= 0) {
        const [u, v] = faceEdges(triangles[i])[onEdge];
        const neighbours = [...edges.get(edgeKey(u, v))!];
        for (const face of neighbours) {
          const opposite = triangles[face].find(
            (vertex) => vertex !== u && vertex !== v,
          )!;
          removeFace(face);
          setFace(face, u, index, opposite);
          setFace(triangles.length, index, v, opposite);
          pending.push(edgeKey(u, opposite), edgeKey(v, opposite));
        }
      } else {
        removeFace(i);
        setFace(i, a, b, index);
        setFace(triangles.length, b, c, index);
        setFace(triangles.length, c, a, index);
        pending.push(edgeKey(a, b), edgeKey(b, c), edgeKey(c, a));
      }
      if (flip) legalize(pending);
      return true;
    }
    return false;
  };
  // Earcut can omit collinear boundary vertices. Restore them before flipping
  // edges, so the constrained ring and the rendered surface use the same mesh.
  const used = new Set(triangles.flat());
  for (let i = 0; i < points.length; i++) if (!used.has(i)) insert(i, false);
  legalize([...edges.keys()]);
  const xs = rings[0].map((p) => p.x),
    ys = rings[0].map((p) => p.y);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs);
  const minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const rowHeight = (spacing * Math.sqrt(3)) / 2;
  for (let row = Math.floor(minY / rowHeight); row * rowHeight <= maxY; row++) {
    const shift = ((((row % 2) + 2) % 2) * spacing) / 2;
    for (
      let column = Math.floor((minX - shift) / spacing);
      column * spacing + shift <= maxX;
      column++
    ) {
      const point = new Vector2(column * spacing + shift, row * rowHeight);
      if (
        !insideRing(point, rings[0]) ||
        rings.slice(1).some((ring) => insideRing(point, ring)) ||
        nearBoundary(point, rings, spacing * 0.24)
      )
        continue;
      points.push(point);
      if (!insert(points.length - 1, true)) points.pop();
    }
  }
  // A narrow islet can fall entirely between grid rows. Give it one interior
  // sample so its whole surface does not collapse to sea-level boundary points.
  if (points.length === offset && triangles.length) {
    const largest = triangles.reduce((best, face) => {
      const area = ([a, b, c]: Face) =>
        Math.abs(cross(points[a], points[b], points[c]));
      return area(face) > area(best) ? face : best;
    });
    const center = largest
      .reduce((sum, vertex) => sum.add(points[vertex]), new Vector2())
      .multiplyScalar(1 / 3);
    points.push(center);
    if (!insert(points.length - 1, true)) points.pop();
  }
  return { points, triangles };
}

/** A constrained, evenly sampled surface with matching shared province edges. */
export function triangulateTerrain(
  shapes: Shape[],
  spacing = 0.075,
): TerrainMesh {
  if (!Number.isFinite(spacing) || spacing <= 0)
    throw new Error("Terrain spacing must be positive");
  const mesh: TerrainMesh = { points: [], triangles: [], rings: [] };
  for (const shape of shapes) {
    const extracted = shape.extractPoints(1);
    const xs = extracted.shape.map((p) => p.x),
      ys = extracted.shape.map((p) => p.y);
    // A small island still needs several samples across its slopes, rather
    // than a single vertex making its entire interior into a pointed cone.
    const localSpacing = Math.min(
      spacing,
      Math.max(
        0.18,
        Math.min(
          Math.max(...xs) - Math.min(...xs),
          Math.max(...ys) - Math.min(...ys),
        ) / 5,
      ),
    );
    const rings = [extracted.shape, ...extracted.holes].map((ring) =>
      subdivideRing(ring, spacing),
    );
    if (rings[0].length < 3) continue;
    const part = triangulatePart(rings, localSpacing),
      offset = mesh.points.length;
    mesh.points.push(...part.points);
    mesh.triangles.push(
      ...part.triangles.map(([a, b, c]): Face => [
        a + offset,
        b + offset,
        c + offset,
      ]),
    );
    mesh.rings.push(...rings);
  }
  return mesh;
}
