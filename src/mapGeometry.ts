import {
  Box3,
  Color,
  BufferGeometry,
  Float32BufferAttribute,
  Path,
  Shape,
  ShapeGeometry,
  ShapeUtils,
  Vector2,
  Vector3,
} from "three";
import type { Geometry } from "geojson";
import type { MapData, RegionData } from "./mapData";
import { LAKE_TOBA, RELIEF_PEAKS, RELIEF_RANGES, SAMOSIR } from "./mapRelief";
import { triangulateTerrain } from "./terrainMesh";
import { topology } from "topojson-server";
import { feature as topologyFeature, merge } from "topojson-client";
import { presimplify, simplify } from "topojson-simplify";
import type {
  Topology,
  Objects,
  GeometryCollection,
  Polygon,
  MultiPolygon,
} from "topojson-specification";

export const SEA_LEVEL = 0;
const LAKE_HEIGHT = 0.72;
const radians = Math.PI / 180;
const mercator = (latitude: number) =>
  Math.log(Math.tan(Math.PI / 4 + (latitude * radians) / 2));
export function projectCoordinate(coordinate: number[]): Vector2 {
  return new Vector2(
    (coordinate[0] - 118.5) * 2.2,
    ((mercator(coordinate[1]) - mercator(-2.5)) / radians) * 2.2,
  );
}
export function geometryShapes(geometry: Geometry): Shape[] {
  const polygons =
    geometry.type === "Polygon"
      ? [geometry.coordinates]
      : geometry.type === "MultiPolygon"
        ? geometry.coordinates
        : [];
  return polygons.map((polygon) => {
    const rings = polygon.map((ring) => {
      const points = ring.map(projectCoordinate);
      if (points[0].equals(points[points.length - 1])) points.pop();
      return points;
    });
    if (!ShapeUtils.isClockWise(rings[0])) rings[0].reverse();
    const shape = new Shape(rings[0]);
    for (const hole of rings.slice(1)) {
      if (ShapeUtils.isClockWise(hole)) hole.reverse();
      shape.holes.push(new Path(hole));
    }
    return shape;
  });
}
const largestShape = (shapes: Shape[]) =>
  shapes.reduce((a, b) =>
    Math.abs(ShapeUtils.area(a.getPoints())) >
    Math.abs(ShapeUtils.area(b.getPoints()))
      ? a
      : b,
  );
export function interiorAnchor(shapes: Shape[]): Vector3 {
  const { shape, holes } = largestShape(shapes).extractPoints(1);
  const points = [...shape, ...holes.flat()];
  let area = -1,
    center = new Vector2();
  for (const indices of ShapeUtils.triangulateShape(shape, holes)) {
    const [a, b, c] = indices.map((index) => points[index]);
    const candidate = Math.abs(
      (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x),
    );
    if (candidate > area) {
      area = candidate;
      center = a
        .clone()
        .add(b)
        .add(c)
        .multiplyScalar(1 / 3);
    }
  }
  return new Vector3(center.x, SEA_LEVEL, -center.y);
}
// Simplify shared arcs once, retaining small islands and holes that would collapse.
export function simplifyMap(map: MapData): MapData {
  const source = topology({ provinces: map }) as Topology<Objects<{}>>;
  const result = topologyFeature(
    simplify(presimplify(source), 0.004),
    source.objects.provinces,
  ) as MapData;
  result.features.forEach((feature, i) => {
    const original = map.features[i].geometry,
      reduced = feature.geometry;
    if (reduced.type !== "Polygon" && reduced.type !== "MultiPolygon") return;
    if (original.type !== "Polygon" && original.type !== "MultiPolygon") return;
    const polygons =
      reduced.type === "Polygon" ? [reduced.coordinates] : reduced.coordinates;
    const originals =
      original.type === "Polygon"
        ? [original.coordinates]
        : original.coordinates;
    polygons.forEach((polygon, p) =>
      polygon.forEach((ring, r) => {
        if (new Set(ring.map((point) => `${point[0]},${point[1]}`)).size < 3)
          polygon[r] = originals[p][r].map((point) => [...point]);
      }),
    );
  });
  return result;
}
type Arc = number[][];
function roundArc(arc: Arc, iterations: number): Arc {
  let points = arc.map(([x, y]) => [x, y]);
  const [first, last] = [points[0], points[points.length - 1]];
  const closed = first[0] === last[0] && first[1] === last[1];
  for (let n = 0; n < iterations && points.length >= 3; n++) {
    const next: Arc = closed ? [] : [points[0]];
    for (let i = 0; i + 1 < points.length; i++) {
      const [ax, ay] = points[i],
        [bx, by] = points[i + 1];
      next.push(
        [0.75 * ax + 0.25 * bx, 0.75 * ay + 0.25 * by],
        [0.25 * ax + 0.75 * bx, 0.25 * ay + 0.75 * by],
      );
    }
    next.push(closed ? next[0] : points[points.length - 1]);
    points = next;
  }
  return points;
}
export function smoothMap(map: MapData, iterations = 3, tolerance = 0.0005) {
  const source = topology({ provinces: map }) as Topology<Objects<{}>>;
  const rounded = source.arcs.map((arc) => roundArc(arc, iterations));
  const reduced = simplify(
    presimplify({ ...source, arcs: rounded }),
    tolerance,
  );
  source.arcs = reduced.arcs.map((arc, i) => {
    const [first, last] = [arc[0], arc[arc.length - 1]];
    const ring = first[0] === last[0] && first[1] === last[1];
    return (ring && arc.length < 4 ? rounded[i] : arc).map(([x, y]) => [x, y]);
  });
  return topologyFeature(source, source.objects.provinces) as MapData;
}
function insideRing(point: Vector2, ring: Vector2[]) {
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
function segmentDistance(point: Vector2, a: Vector2, b: Vector2) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1),
    ),
  );
  return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
}
function distanceToEdge(point: Vector2, ring: Vector2[]) {
  return ring.reduce(
    (distance, a, i) =>
      Math.min(
        distance,
        segmentDistance(point, a, ring[(i + 1) % ring.length]),
      ),
    Infinity,
  );
}
type Rings = { shape: Vector2[]; holes: Vector2[][] };
const insideRings = (point: Vector2, { shape, holes }: Rings) =>
  insideRing(point, shape) && !holes.some((hole) => insideRing(point, hole));
const clearanceIn = (point: Vector2, { shape, holes }: Rings) =>
  Math.min(
    distanceToEdge(point, shape),
    ...holes.map((hole) => distanceToEdge(point, hole)),
  );
const smoothstep = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

/** Geographic range guides produce one continuous surface, with compressed heights. */
function terrainField(islands: Shape[], lake: Vector2[], samosir: Vector2[]) {
  const coasts = islands.map((shape) => {
    const rings = shape.extractPoints(1);
    const xs = rings.shape.map((p) => p.x),
      ys = rings.shape.map((p) => p.y);
    return {
      rings,
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  });
  const ranges = RELIEF_RANGES.flatMap((range) =>
    range.paths.map((path) => ({
      points: path.map((p) => projectCoordinate([...p])),
      height: range.elevation * 0.00076,
      width: range.kind === "hill" ? 1.55 : 1.0 + range.elevation * 0.00022,
    })),
  );
  const peaks = RELIEF_PEAKS.map((peak) => ({
    point: projectCoordinate([...peak.at]),
    height: peak.elevation * 0.0008,
    width: 0.95 + peak.elevation * 0.00017,
  }));
  const heights = new Map<string, number>();
  const coastDistances = new Map<string, number>();
  // Coast segments bucketed by cell, searched outwards until no nearer cell remains.
  type Segment = { a: Vector2; b: Vector2; ring: number };
  const cell = 1,
    cellKey = (x: number, y: number) => (x + 4096) * 8192 + y + 4096,
    segments = new Map<number, Segment[]>();
  let ringCount = 0;
  const islandRings = coasts.map(({ rings }) =>
    [rings.shape, ...rings.holes].map((ring) => {
      const id = ringCount++;
      ring.forEach((a, i) => {
        const segment = { a, b: ring[(i + 1) % ring.length], ring: id };
        for (
          let x = Math.floor(Math.min(a.x, segment.b.x) / cell);
          x <= Math.floor(Math.max(a.x, segment.b.x) / cell);
          x++
        )
          for (
            let y = Math.floor(Math.min(a.y, segment.b.y) / cell);
            y <= Math.floor(Math.max(a.y, segment.b.y) / cell);
            y++
          ) {
            const key = cellKey(x, y),
              bucket = segments.get(key) ?? [];
            bucket.push(segment);
            segments.set(key, bucket);
          }
      });
      return id;
    }),
  );
  /** The same ray test as insideRing, over only the segments to the point's right. */
  const islandAt = (point: Vector2) => {
    const candidates = coasts.filter(
      ({ minX, maxX, minY, maxY }) =>
        point.x >= minX &&
        point.x <= maxX &&
        point.y >= minY &&
        point.y <= maxY,
    );
    if (!candidates.length) return undefined;
    const odd = new Set<number>(),
      seen = new Set<Segment>(),
      row = Math.floor(point.y / cell),
      end = Math.floor(Math.max(...candidates.map((c) => c.maxX)) / cell);
    for (let x = Math.floor(point.x / cell); x <= end; x++)
      for (const segment of segments.get(cellKey(x, row)) ?? []) {
        if (seen.has(segment)) continue;
        seen.add(segment);
        const { b: a, a: b } = segment;
        if (
          a.y > point.y !== b.y > point.y &&
          point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
        )
          if (!odd.delete(segment.ring)) odd.add(segment.ring);
      }
    return candidates.find((coast) => {
      const [shape, ...holes] = islandRings[coasts.indexOf(coast)];
      return odd.has(shape) && !holes.some((hole) => odd.has(hole));
    });
  };
  const coastDistance = (point: Vector2) => {
    const key = `${point.x.toFixed(7)},${point.y.toFixed(7)}`;
    const cached = coastDistances.get(key);
    if (cached !== undefined) return cached;
    let distance = 5;
    const cx = Math.floor(point.x / cell),
      cy = Math.floor(point.y / cell);
    // Cells in ring k are at least k - 1 cells away from any point in this cell.
    for (let k = 0; (k - 1) * cell < distance; k++)
      for (let x = cx - k; x <= cx + k; x++)
        for (let y = cy - k; y <= cy + k; y++) {
          if (Math.max(Math.abs(x - cx), Math.abs(y - cy)) !== k) continue;
          for (const { a, b } of segments.get(cellKey(x, y)) ?? [])
            distance = Math.min(distance, segmentDistance(point, a, b));
        }
    coastDistances.set(key, distance);
    return distance;
  };
  const heightAt = (point: Vector2) => {
    const key = `${point.x.toFixed(7)},${point.y.toFixed(7)}`;
    const cached = heights.get(key);
    if (cached !== undefined) return cached;
    const coast = coastDistance(point);
    const island = islandAt(point);
    const coastalSlope = island
      ? Math.max(
          0.18,
          Math.min(
            0.9,
            Math.min(island.maxX - island.minX, island.maxY - island.minY) *
              0.28,
          ),
        )
      : 0.9;
    let ridge = 0,
      summit = 0;
    for (const range of ranges) {
      let distance = point.distanceTo(range.points[0]);
      for (let i = 1; i < range.points.length; i++)
        distance = Math.min(
          distance,
          segmentDistance(point, range.points[i - 1], range.points[i]),
        );
      ridge = Math.max(
        ridge,
        range.height * Math.exp(-((distance / range.width) ** 2)),
      );
    }
    for (const peak of peaks)
      summit = Math.max(
        summit,
        peak.height *
          Math.exp(-((point.distanceTo(peak.point) / peak.width) ** 2)),
      );
    // Smooth broad shoulders, never independent per-triangle spikes.
    // Narrow islands such as Java get lower relief so they read as islands
    // with lowlands, not a single ridge; broad islands keep taller ranges.
    const narrow = island
      ? Math.min(
          1,
          Math.min(island.maxX - island.minX, island.maxY - island.minY) / 5,
        )
      : 1;
    const relief = (ridge ** 4 + summit ** 4) ** 0.25 * (0.2 + 0.12 * narrow);
    const rolling =
      0.92 +
      0.08 * Math.sin(point.x * 1.4 + point.y * 0.8) * Math.cos(point.y * 1.6);
    // Smooth multi-scale ridges and knolls; strongest on high ground so the
    // lowlands stay gentle and the mountains look carved, not lumpy.
    const x = point.x,
      y = point.y;
    // Soft, broad undulations: low-frequency octaves only, so slopes roll
    // smoothly instead of striping into fine ridges.
    const detail =
      0.6 *
        Math.sin(x * 2.3 + Math.sin(y * 1.7) * 1.3) *
        Math.cos(y * 2.1 - x * 0.7) +
      0.3 * Math.sin(x * 4.1 - y * 3.3 + 1.7) * Math.cos(y * 3.9 + x * 1.9) +
      0.1 * Math.sin(x * 6.7 + y * 5.3) * Math.cos(x * 5.1 - y * 6.9);
    const detailAmount = 0.03 + 0.5 * relief;
    let height =
      SEA_LEVEL +
      smoothstep(coast / coastalSlope) *
        (0.13 +
          0.14 * (1 - Math.exp(-coast * 0.6)) +
          relief * rolling +
          detailAmount * detail * smoothstep(coast / 0.6));
    // Compress steep coastal relief on narrow islands without flattening
    // the broad inland ranges. The fourth-power blend keeps the shoulder smooth.
    height /= (1 + (height / (0.18 + coast * 2.2)) ** 4) ** 0.25;
    const lakeDistance = distanceToEdge(point, lake);
    if (insideRing(point, lake)) {
      height = insideRing(point, samosir)
        ? LAKE_HEIGHT + smoothstep(distanceToEdge(point, samosir) / 0.35) * 0.24
        : LAKE_HEIGHT;
    } else if (lakeDistance < 0.7) {
      height =
        LAKE_HEIGHT + (height - LAKE_HEIGHT) * smoothstep(lakeDistance / 0.7);
    }
    heights.set(key, height);
    return height;
  };
  return { heightAt, coastDistance };
}

function landGeometry(
  mesh: ReturnType<typeof triangulateTerrain>,
  heightAt: (point: Vector2) => number,
  coastDistance: (point: Vector2) => number,
) {
  const positions: number[] = [],
    colors: number[] = [];
  const sand = new Color("#e3d496"),
    grass = new Color("#8dc859"),
    upland = new Color("#91b56a"),
    rock = new Color("#c4c5a0");
  const color = new Color();
  for (const point of mesh.points) {
    const height = heightAt(point);
    positions.push(point.x, height, -point.y);
    color
      .copy(grass)
      .lerp(upland, smoothstep((height - 0.6) / 2.5))
      .lerp(rock, smoothstep((height - 2.8) / 1.4) * 0.72)
      .lerp(sand, 1 - smoothstep(coastDistance(point) / 0.24));
    colors.push(color.r, color.g, color.b);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.setIndex(mesh.triangles.flat());
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
}
function outlines(rings: Vector2[][], heightAt: (point: Vector2) => number) {
  const positions: number[] = [];
  for (const ring of rings)
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i],
        b = ring[(i + 1) % ring.length];
      positions.push(
        a.x,
        heightAt(a) + 0.025,
        -a.y,
        b.x,
        heightAt(b) + 0.025,
        -b.y,
      );
    }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  return geometry;
}

const SURFACE_CELL = 0.7;
const surfaceCellKey = (x: number, y: number) => (x + 4096) * 8192 + y + 4096;
export type SurfaceIndex = {
  faceParts: Uint32Array;
  bounds: Float64Array;
  cells: Map<number, number>;
  offsets: Uint32Array;
  faces: Uint32Array;
  firstFaces: Uint32Array;
};

/** The index owns triangle IDs; positions remain in the rendered geometry buffers. */
function buildSurfaceIndex(geometries: BufferGeometry[]): SurfaceIndex {
  let faceCount = 0;
  const parts = geometries.map((geometry) => {
    const index = geometry.getIndex();
    if (!index) throw new Error("Surface sampling requires indexed geometry");
    const firstFace = faceCount;
    faceCount += index.count / 3;
    return { positions: geometry.getAttribute("position"), index, firstFace };
  });
  const faceParts = new Uint32Array(faceCount);
  const bounds = new Float64Array(faceCount * 4);
  const counts = new Map<number, number>();
  for (let part = 0; part < parts.length; part++) {
    const { positions, index, firstFace } = parts[part];
    for (let i = 0; i < index.count; i += 3) {
      const face = firstFace + i / 3;
      const a = index.getX(i),
        b = index.getX(i + 1),
        c = index.getX(i + 2);
      const left = Math.min(
        positions.getX(a),
        positions.getX(b),
        positions.getX(c),
      );
      const right = Math.max(
        positions.getX(a),
        positions.getX(b),
        positions.getX(c),
      );
      const near = Math.min(
        positions.getZ(a),
        positions.getZ(b),
        positions.getZ(c),
      );
      const far = Math.max(
        positions.getZ(a),
        positions.getZ(b),
        positions.getZ(c),
      );
      faceParts[face] = part;
      bounds.set([left, right, near, far], face * 4);
      for (
        let x = Math.floor(left / SURFACE_CELL);
        x <= Math.floor(right / SURFACE_CELL);
        x++
      )
        for (
          let y = Math.floor(-far / SURFACE_CELL);
          y <= Math.floor(-near / SURFACE_CELL);
          y++
        ) {
          const key = surfaceCellKey(x, y);
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
    }
  }
  const cells = new Map<number, number>();
  const offsets = new Uint32Array(counts.size + 1);
  let cell = 0;
  for (const [key, count] of counts) {
    cells.set(key, cell);
    offsets[cell + 1] = offsets[cell] + count;
    cell++;
  }
  const faces = new Uint32Array(offsets[cell]);
  const cursors = offsets.slice(0, -1);
  for (let face = 0; face < faceCount; face++) {
    const offset = face * 4;
    for (
      let x = Math.floor(bounds[offset] / SURFACE_CELL);
      x <= Math.floor(bounds[offset + 1] / SURFACE_CELL);
      x++
    )
      for (
        let y = Math.floor(-bounds[offset + 3] / SURFACE_CELL);
        y <= Math.floor(-bounds[offset + 2] / SURFACE_CELL);
        y++
      ) {
        const bucket = cells.get(surfaceCellKey(x, y))!;
        faces[cursors[bucket]++] = face;
      }
  }
  return {
    faceParts,
    bounds,
    cells,
    offsets,
    faces,
    firstFaces: Uint32Array.from(parts, (part) => part.firstFace),
  };
}

/** Sample the drawn triangles, including worlds restored from worker buffers. */
export function createSurfaceSampler(
  geometries: BufferGeometry[],
  surfaceIndex = buildSurfaceIndex(geometries),
) {
  const { faceParts, bounds, cells, offsets, faces, firstFaces } = surfaceIndex;
  const parts = geometries.map((geometry, i) => ({
    positions: geometry.getAttribute("position"),
    index: geometry.getIndex()!,
    firstFace: firstFaces[i],
  }));
  let visits: Uint32Array | undefined;
  let visit = 0;
  const heightAt = (point: Vector2) => {
    const cell = cells.get(
      surfaceCellKey(
        Math.floor(point.x / SURFACE_CELL),
        Math.floor(point.y / SURFACE_CELL),
      ),
    );
    if (cell === undefined) return SEA_LEVEL;
    for (let i = offsets[cell]; i < offsets[cell + 1]; i++) {
      const face = faces[i];
      const { positions, index, firstFace } = parts[faceParts[face]];
      const offset = (face - firstFace) * 3;
      const a = index.getX(offset),
        b = index.getX(offset + 1),
        c = index.getX(offset + 2);
      const ax = positions.getX(a),
        az = positions.getZ(a);
      const bx = positions.getX(b),
        bz = positions.getZ(b);
      const cx = positions.getX(c),
        cz = positions.getZ(c);
      const denominator = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(denominator) < 1e-12) continue;
      const u =
        ((bz - cz) * (point.x - cx) + (cx - bx) * (-point.y - cz)) /
        denominator;
      const v =
        ((cz - az) * (point.x - cx) + (ax - cx) * (-point.y - cz)) /
        denominator;
      if (u >= -1e-6 && v >= -1e-6 && u + v <= 1 + 1e-6)
        return (
          u * positions.getY(a) +
          v * positions.getY(b) +
          (1 - u - v) * positions.getY(c)
        );
    }
    return SEA_LEVEL;
  };
  const footprintRange = (point: Vector2, halfX = 1.35, halfY = 0.75) => {
    const minX = point.x - halfX,
      maxX = point.x + halfX;
    const minZ = -point.y - halfY,
      maxZ = -point.y + halfY;
    const candidates: number[] = [];
    visits ??= new Uint32Array(faceParts.length);
    visit = (visit + 1) >>> 0;
    if (!visit) {
      visits.fill(0);
      visit = 1;
    }
    for (
      let x = Math.floor(minX / SURFACE_CELL);
      x <= Math.floor(maxX / SURFACE_CELL);
      x++
    )
      for (
        let y = Math.floor(-maxZ / SURFACE_CELL);
        y <= Math.floor(-minZ / SURFACE_CELL);
        y++
      ) {
        const cell = cells.get(surfaceCellKey(x, y));
        if (cell === undefined) continue;
        for (let i = offsets[cell]; i < offsets[cell + 1]; i++) {
          const face = faces[i];
          if (visits[face] !== visit) {
            visits[face] = visit;
            candidates.push(face);
          }
        }
      }
    let min = Infinity,
      max = SEA_LEVEL;
    // A linear triangle reaches its extrema at a clipped polygon vertex.
    for (const face of candidates) {
      const bound = face * 4;
      const left = bounds[bound],
        right = bounds[bound + 1];
      const near = bounds[bound + 2],
        far = bounds[bound + 3];
      // Faces wholly outside add nothing; faces wholly inside need no clipping.
      if (right < minX || left > maxX || far < minZ || near > maxZ) continue;
      const { positions, index, firstFace } = parts[faceParts[face]];
      const offset = (face - firstFace) * 3;
      if (left >= minX && right <= maxX && near >= minZ && far <= maxZ) {
        for (let i = 0; i < 3; i++) {
          const height = positions.getY(index.getX(offset + i));
          min = Math.min(min, height);
          max = Math.max(max, height);
        }
        continue;
      }
      let polygon = [0, 1, 2].map((i) =>
        new Vector3().fromBufferAttribute(positions, index.getX(offset + i)),
      );
      for (const [axis, boundary, direction] of [
        ["x", minX, 1],
        ["x", maxX, -1],
        ["z", minZ, 1],
        ["z", maxZ, -1],
      ] as const) {
        const clipped: Vector3[] = [];
        for (let i = 0; i < polygon.length; i++) {
          const a = polygon[i],
            b = polygon[(i + 1) % polygon.length];
          const aInside = (a[axis] - boundary) * direction >= 0;
          const bInside = (b[axis] - boundary) * direction >= 0;
          if (aInside) clipped.push(a);
          if (aInside !== bInside)
            clipped.push(
              a.clone().lerp(b, (boundary - a[axis]) / (b[axis] - a[axis])),
            );
        }
        polygon = clipped;
      }
      for (const p of polygon) {
        min = Math.min(min, p.y);
        max = Math.max(max, p.y);
      }
    }
    return { min: Number.isFinite(min) ? min : SEA_LEVEL, max };
  };
  return { index: surfaceIndex, heightAt, footprintRange };
}

export type Scenery = {
  province: string;
  position: Vector3;
  scale: number;
  rotation: number;
};
function siteAnchor(
  shapes: Shape[],
  surface: ReturnType<typeof createSurfaceSampler>,
) {
  const fallback = interiorAnchor(shapes),
    rings = largestShape(shapes).extractPoints(1);
  const xs = rings.shape.map((p) => p.x),
    ys = rings.shape.map((p) => p.y);
  let best = fallback,
    bestScore = Infinity;
  const consider = (point: Vector2) => {
    // Clearance can lower a score by at most 2.1 and the footprint never lowers
    // it, so cheaper terms rule out most sites before the coastline checks.
    const nearby =
      surface.heightAt(point) * 0.8 +
      Math.hypot(point.x - fallback.x, point.y + fallback.z) * 0.09;
    if (nearby - 2.1 >= bestScore || !insideRings(point, rings)) return;
    const base = nearby - Math.min(clearanceIn(point, rings), 1.4) * 1.5;
    if (base >= bestScore) return;
    const footprint = surface.footprintRange(point);
    const score = (footprint.max - footprint.min) * 6 + base;
    if (score < bestScore) {
      bestScore = score;
      best = new Vector3(point.x, footprint.max + 0.035, -point.y);
    }
  };
  consider(new Vector2(fallback.x, -fallback.z));
  for (let x = Math.min(...xs); x < Math.max(...xs); x += 0.5)
    for (let y = Math.min(...ys); y < Math.max(...ys); y += 0.5)
      consider(new Vector2(x, y));
  return best;
}
function scenery(
  shapes: Shape[],
  province: string,
  anchor: Vector3,
  surfaceHeight: (point: Vector2) => number,
) {
  const trees: Scenery[] = [],
    houses: Scenery[] = [];
  for (const shape of shapes) {
    const rings = shape.extractPoints(1),
      xs = rings.shape.map((p) => p.x),
      ys = rings.shape.map((p) => p.y);
    const step = 1.2;
    for (
      let x = Math.ceil(Math.min(...xs) / step) * step;
      x < Math.max(...xs);
      x += step
    )
      for (
        let y = Math.ceil(Math.min(...ys) / step) * step;
        y < Math.max(...ys);
        y += step
      ) {
        const point = new Vector2(
          x + Math.sin(x * 17 + y * 7) * 0.4,
          y + Math.cos(x * 11 - y * 19) * 0.4,
        );
        if (
          !insideRings(point, rings) ||
          clearanceIn(point, rings) < 0.3 ||
          (Math.abs(point.x - anchor.x) < 1.8 &&
            Math.abs(point.y + anchor.z) < 1.1)
        )
          continue;
        const random = (Math.sin(point.x * 39.17 + point.y * 93.71) + 1) / 2;
        const height = surfaceHeight(point);
        if (random < 0.45 || height > 2.7) continue;
        const slope =
          Math.abs(
            surfaceHeight(point.clone().add(new Vector2(0.2, 0))) - height,
          ) +
          Math.abs(
            surfaceHeight(point.clone().add(new Vector2(0, 0.2))) - height,
          );
        if (slope > 0.35) continue;
        // Faceted terrain can rise above the centre sample, so seat each prop
        // on the highest ground under its footprint rather than sinking it.
        const seat = (radius: number) => {
          let top = height;
          for (const [dx, dy] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
            [0.7, 0.7],
            [-0.7, -0.7],
            [0.7, -0.7],
            [-0.7, 0.7],
          ])
            top = Math.max(
              top,
              surfaceHeight(
                point.clone().add(new Vector2(dx * radius, dy * radius)),
              ),
            );
          return top;
        };
        const item = {
          province,
          position: new Vector3(point.x, seat(0.04) + 0.005, -point.y),
          scale: 0.225 + random * 0.11,
          rotation: random * Math.PI,
        };
        if (random > 0.94 && houses.length < 3 && slope < 0.1)
          houses.push({
            ...item,
            position: new Vector3(point.x, seat(0.15) + 0.005, -point.y),
            scale: 0.3,
          });
        else trees.push(item);
      }
  }
  return { trees, houses };
}

const worldCache = new WeakMap<MapData, WorldGeometry>();
function disposeGeometries(geometries: BufferGeometry[]) {
  return () => {
    for (const geometry of geometries) geometry.dispose();
  };
}
/** Builds once per map object, so StrictMode and remounts reuse the result. */
export function cachedWorldGeometry(map: MapData): WorldGeometry {
  let world = worldCache.get(map);
  if (!world) worldCache.set(map, (world = buildWorldGeometry(map)));
  return world;
}
export function buildWorldGeometry(map: MapData) {
  const simplified = smoothMap(simplifyMap(map));
  const candidates = simplified.features.map((feature) => ({
    id: feature.properties.KODE_PROV,
    shapes: geometryShapes(feature.geometry),
  }));
  const edgeKey = (a: Vector2, b: Vector2) => {
    const from = `${a.x.toFixed(7)},${a.y.toFixed(7)}`,
      to = `${b.x.toFixed(7)},${b.y.toFixed(7)}`;
    return from < to ? `${from}|${to}` : `${to}|${from}`;
  };
  const edges = new Map<string, number>();
  const shapeEdges = (shape: Shape) => {
    const rings = shape.extractPoints(1);
    return [rings.shape, ...rings.holes].flatMap((ring) =>
      ring.map((p, i) => edgeKey(p, ring[(i + 1) % ring.length])),
    );
  };
  for (const { shapes } of candidates)
    for (const shape of shapes)
      for (const edge of shapeEdges(shape))
        edges.set(edge, (edges.get(edge) ?? 0) + 1);
  const parts = candidates.map(({ id, shapes: allShapes }) => {
    const largest = largestShape(allShapes);
    return {
      id,
      shapes: allShapes.filter(
        (shape) =>
          shape === largest ||
          Math.abs(ShapeUtils.area(shape.getPoints())) >= 1.2 ||
          shapeEdges(shape).some((edge) => edges.get(edge)! > 1),
      ),
    };
  });
  const source = topology({ provinces: simplified });
  const islands = geometryShapes(
    merge(
      source,
      (source.objects.provinces as GeometryCollection).geometries as (
        Polygon | MultiPolygon
      )[],
    ),
  );
  const lake = LAKE_TOBA.map((p) => projectCoordinate([...p]));
  const samosir = SAMOSIR.map((p) => projectCoordinate([...p]));
  // The lake is a real opening in the terrain; its island remains selectable land.
  const northSumatra = parts.find((p) => p.id === "12");
  const lakeOwner = northSumatra?.shapes.find((shape) =>
    insideRings(lake[0], shape.extractPoints(1)),
  );
  if (lakeOwner && northSumatra) {
    lakeOwner.holes.push(new Path(lake));
    northSumatra.shapes.push(new Shape(samosir));
  }
  const { heightAt, coastDistance } = terrainField(islands, lake, samosir);
  const surfaces = parts.map(({ id, shapes }) => {
    const mesh = triangulateTerrain(shapes);
    const geometry = landGeometry(mesh, heightAt, coastDistance);
    return {
      id,
      shapes,
      islandCount: shapes.length,
      geometry,
      outline: outlines(mesh.rings, heightAt),
      rings: mesh.rings,
      bounds: geometry.boundingBox?.clone() ?? new Box3(),
    };
  });
  const surface = createSurfaceSampler(surfaces.map((p) => p.geometry));
  const surfaceHeight = surface.heightAt;
  const provinces = surfaces.map(({ shapes, ...province }) => {
    const anchor = siteAnchor(shapes, surface);
    return {
      ...province,
      anchor,
      scenery: scenery(shapes, province.id, anchor, surfaceHeight),
    };
  });
  const lakeShape = new Shape(lake);
  lakeShape.holes.push(new Path(samosir));
  const lakeSurface: BufferGeometry = new ShapeGeometry(lakeShape);
  lakeSurface.rotateX(-Math.PI / 2);
  lakeSurface.translate(0, LAKE_HEIGHT, 0);
  const bounds = provinces.reduce((box, p) => box.union(p.bounds), new Box3());
  return {
    provinces,
    lake: lakeSurface,
    bounds,
    /** Merged island coastlines, without internal province borders. */
    coastlines: islands.map((shape) => shape.extractPoints(1)),
    surfaceHeight,
    surfaceIndex: surface.index,
    dispose: disposeGeometries([
      ...provinces.flatMap((p) => [p.geometry, p.outline]),
      lakeSurface,
    ]),
  };
}
export type WorldGeometry = ReturnType<typeof buildWorldGeometry>;

/** ASEAN members, plus Papua New Guinea so New Guinea is not cut in half. */
export const NEIGHBOURING_COUNTRIES = [
  "Brunei",
  "Cambodia",
  "Laos",
  "Malaysia",
  "Myanmar",
  "Papua New Guinea",
  "Philippines",
  "Singapore",
  "Thailand",
  "Timor-Leste",
  "Vietnam",
] as const;

/**
 * Flat, non-playable land for the neighbouring countries: one merged, unlit sheet.
 * The coarser neighbour outlines stop short of the detailed provinces on shared
 * islands, so a narrow seam runs outward from each land border to close the gap.
 */
export function neighbourGeometry(region: RegionData, coastlines: Rings[]) {
  const positions: number[] = [];
  const triangle = (a: Vector2, b: Vector2, c: Vector2) => {
    // Counter-clockwise on the map faces up, like the terrain.
    for (const p of ShapeUtils.area([a, b, c]) > 0 ? [a, b, c] : [a, c, b])
      positions.push(p.x, 0, -p.y);
  };
  const countries: Rings[] = [];
  for (const feature of region.features) {
    if (
      !(NEIGHBOURING_COUNTRIES as readonly string[]).includes(
        feature.properties.name,
      )
    )
      continue;
    for (const shape of geometryShapes(feature.geometry)) {
      const rings = shape.extractPoints(1),
        points = [...rings.shape, ...rings.holes.flat()];
      countries.push(rings);
      for (const [a, b, c] of ShapeUtils.triangulateShape(
        rings.shape,
        rings.holes,
      ))
        triangle(points[a], points[b], points[c]);
    }
  }
  const seam = 0.38;
  const onNeighbour = (point: Vector2) =>
    countries.some((rings) => insideRings(point, rings));
  for (const island of coastlines)
    for (const ring of [island.shape, ...island.holes]) {
      // Outward offsets of each land-border segment, or null along the sea.
      const offsets = ring.map((a, i) => {
        const b = ring[(i + 1) % ring.length],
          middle = a.clone().add(b).multiplyScalar(0.5);
        const normal = new Vector2(a.y - b.y, b.x - a.x).normalize();
        if (insideRings(middle.clone().addScaledVector(normal, 0.02), island))
          normal.negate();
        return onNeighbour(middle.clone().addScaledVector(normal, seam - 0.05))
          ? normal.multiplyScalar(seam)
          : null;
      });
      ring.forEach((a, i) => {
        const b = ring[(i + 1) % ring.length],
          offset = offsets[i],
          previous = offsets[(i + ring.length - 1) % ring.length];
        if (offset) {
          triangle(a, b, b.clone().add(offset));
          triangle(a, b.clone().add(offset), a.clone().add(offset));
        }
        // Fill the wedge between neighbouring seam segments at each corner.
        if (offset && previous)
          triangle(a, a.clone().add(previous), a.clone().add(offset));
      });
    }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  return geometry;
}
