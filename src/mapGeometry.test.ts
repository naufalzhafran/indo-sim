import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ShapeUtils, Vector2, Vector3, type BufferGeometry } from "three";
import {
  buildWorldGeometry,
  geometryShapes,
  interiorAnchor,
  projectCoordinate,
  SEA_LEVEL,
  simplifyMap,
  smoothMap,
} from "./mapGeometry";
import { topology } from "topojson-server";
import { validateGeography, type MapData } from "./mapData";
import { LAKE_TOBA, SAMOSIR } from "./mapRelief";

const map = JSON.parse(
  readFileSync(
    new URL("../public/data/provinces.geojson", import.meta.url),
    "utf8",
  ),
) as MapData;
function inside(point: Vector2, polygon: Vector2[]) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      result = !result;
  }
  return result;
}

function* triangles(geometry: BufferGeometry) {
  const positions = geometry.getAttribute("position"),
    index = geometry.getIndex()!;
  for (let i = 0; i < index.count; i += 3)
    yield [0, 1, 2].map((j) =>
      new Vector3().fromBufferAttribute(positions, index.getX(i + j)),
    );
}
const pointKey = (point: Vector3) => `${point.x},${point.z}`;
const edgeKey = (a: Vector3, b: Vector3) =>
  [pointKey(a), pointKey(b)].sort().join("|");
function boundaryEdges(geometry: BufferGeometry) {
  const edges = new Map<string, { count: number; a: Vector3; b: Vector3 }>();
  for (const vertices of triangles(geometry))
    for (let i = 0; i < 3; i++) {
      const a = vertices[i],
        b = vertices[(i + 1) % 3],
        key = edgeKey(a, b);
      const previous = edges.get(key);
      edges.set(key, { count: (previous?.count ?? 0) + 1, a, b });
    }
  return [...edges.values()].filter((edge) => edge.count === 1);
}
function edgeDistance(point: Vector2, ring: Vector2[]) {
  return Math.min(
    ...ring.map((a, i) => {
      const b = ring[(i + 1) % ring.length],
        edge = b.clone().sub(a);
      const t = Math.max(
        0,
        Math.min(1, point.clone().sub(a).dot(edge) / edge.lengthSq()),
      );
      return point.distanceTo(a.clone().addScaledVector(edge, t));
    }),
  );
}
const lake = LAKE_TOBA.map((p) => projectCoordinate([...p]));
const samosir = SAMOSIR.map((p) => projectCoordinate([...p]));
const inLakeWater = (point: Vector2) =>
  inside(point, lake) && !inside(point, samosir);
let world: ReturnType<typeof buildWorldGeometry>;
let boundaries: Map<string, { province: string; a: Vector3; b: Vector3 }[]>;
beforeAll(() => {
  world = buildWorldGeometry(map);
  boundaries = new Map();
  for (const province of world.provinces)
    for (const edge of boundaryEdges(province.geometry)) {
      const key = edgeKey(edge.a, edge.b),
        entries = boundaries.get(key) ?? [];
      entries.push({ province: province.id, ...edge });
      boundaries.set(key, entries);
    }
}, 20000);
afterAll(() => world.dispose());

describe("province geometry", () => {
  it("simplifies shared coastlines while retaining province IDs, separate islands and holes", () => {
    const simplified = simplifyMap(map);
    expect(simplified.features.map((f) => f.properties.KODE_PROV)).toEqual(
      map.features.map((f) => f.properties.KODE_PROV),
    );
    let originalPoints = 0,
      simplifiedPoints = 0;
    map.features.forEach((feature, i) => {
      const original = geometryShapes(feature.geometry),
        reduced = geometryShapes(simplified.features[i].geometry);
      expect(reduced).toHaveLength(original.length);
      original.forEach((shape, j) => {
        expect(reduced[j].holes).toHaveLength(shape.holes.length);
        originalPoints += shape.getPoints().length;
        simplifiedPoints += reduced[j].getPoints().length;
        expect(reduced[j].getPoints().length).toBeGreaterThanOrEqual(3);
      });
    });
    expect(simplifiedPoints).toBeLessThan(originalPoints / 3);
  });
  it("rounds coastlines without splitting shared province borders", () => {
    const simplified = simplifyMap(map),
      smoothed = smoothMap(simplified);
    let simplifiedPoints = 0,
      smoothedPoints = 0;
    simplified.features.forEach((feature, i) => {
      expect(smoothed.features[i].properties.KODE_PROV).toBe(
        feature.properties.KODE_PROV,
      );
      const before = geometryShapes(feature.geometry),
        after = geometryShapes(smoothed.features[i].geometry);
      expect(after).toHaveLength(before.length);
      before.forEach((shape, j) => {
        expect(after[j].holes).toHaveLength(shape.holes.length);
        simplifiedPoints += shape.getPoints().length;
        smoothedPoints += after[j].getPoints().length;
      });
    });
    expect(smoothedPoints).toBeGreaterThan(simplifiedPoints * 1.5);
    // Misaligned neighbours would no longer share arcs.
    expect(topology({ provinces: smoothed }).arcs.length).toBe(
      topology({ provinces: simplified }).arcs.length,
    );
  });
  it("covers all 38 IDs, omits offshore specks and combines visible islands into one province mesh", () => {
    validateGeography(
      map,
      map.features.map((f) => f.properties.KODE_PROV),
    );
    expect(new Set(world.provinces.map((p) => p.id)).size).toBe(38);
    expect(world.provinces.map((p) => p.id)).toEqual(
      map.features.map((f) => f.properties.KODE_PROV),
    );
    expect(world.provinces.every((p) => p.islandCount >= 1)).toBe(true);
    expect(world.provinces.reduce((n, p) => n + p.islandCount, 0)).toBeLessThan(
      100,
    );
    expect(
      world.provinces.every(
        (p) => p.geometry.groups.length === 0 && !p.bounds.isEmpty(),
      ),
    ).toBe(true);
    expect(
      geometryShapes(
        map.features.find((f) => f.properties.KODE_PROV === "21")!.geometry,
      ).length,
    ).toBeGreaterThan(1);
  });
  it("samples the rendered facets rather than the unsampled elevation field", () => {
    for (const province of world.provinces)
      for (const [a, b, c] of triangles(province.geometry)) {
        const center = new Vector2(
          (a.x + b.x + c.x) / 3,
          -(a.z + b.z + c.z) / 3,
        );
        expect(
          world.surfaceHeight(center),
          `surface sample in province ${province.id}`,
        ).toBeCloseTo((a.y + b.y + c.y) / 3, 5);
      }
  });
  it("grounds trees and houses on the drawn facets inside their provinces", () => {
    const simplified = smoothMap(simplifyMap(map));
    const objects = world.provinces.flatMap((province) => [
      ...province.scenery.trees,
      ...province.scenery.houses,
    ]);
    expect(objects.length).toBeGreaterThan(50);
    for (const object of objects) {
      const shapes = geometryShapes(
        simplified.features.find(
          (feature) => feature.properties.KODE_PROV === object.province,
        )!.geometry,
      );
      const point = new Vector2(object.position.x, -object.position.z);
      expect(
        shapes.some(
          (shape) =>
            inside(point, shape.getPoints()) &&
            shape.holes.every((hole) => !inside(point, hole.getPoints())),
        ),
        `scenery in province ${object.province}`,
      ).toBe(true);
      expect(
        inLakeWater(point),
        `scenery in Lake Toba: ${object.province}`,
      ).toBe(false);
      // Seated on the highest ground under the footprint: never buried, never floating.
      expect(object.position.y).toBeGreaterThanOrEqual(
        world.surfaceHeight(point),
      );
      expect(object.position.y - world.surfaceHeight(point)).toBeLessThan(0.12);
    }
  });
  it("joins province boundaries with identical terrain heights and edge subdivisions", () => {
    const shared = [...boundaries.values()].filter(
      (entries) => entries.length > 1,
    );
    expect(shared.length).toBeGreaterThan(100);
    for (const entries of shared) {
      expect(entries).toHaveLength(2);
      const [first, second] = entries;
      expect(first.province).not.toBe(second.province);
      for (const point of [first.a, first.b]) {
        const other = [second.a, second.b].find(
          (p) => pointKey(p) === pointKey(point),
        );
        expect(other?.y).toBe(point.y);
      }
    }
  });
  it("meets sea level at the coast without vertical skirts or underwater terrain", () => {
    let coastalVertices = 0;
    for (const entries of boundaries.values()) {
      if (entries.length !== 1) continue;
      for (const vertex of [entries[0].a, entries[0].b]) {
        const point = new Vector2(vertex.x, -vertex.z);
        if (
          Math.min(edgeDistance(point, lake), edgeDistance(point, samosir)) <
          1e-5
        )
          continue;
        expect(
          vertex.y,
          `coast in province ${entries[0].province} at ${pointKey(vertex)}`,
        ).toBeCloseTo(SEA_LEVEL, 5);
        coastalVertices++;
      }
    }
    expect(coastalVertices).toBeGreaterThan(100);
    for (const province of world.provinces) {
      const positions = province.geometry.getAttribute("position");
      expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);
      expect(province.bounds.min.y).toBeGreaterThanOrEqual(SEA_LEVEL);
      expect(province.bounds.max.y).toBeLessThan(6);
      for (const [a, b, c] of triangles(province.geometry)) {
        const upwardArea =
          (b.z - a.z) * (c.x - a.x) - (b.x - a.x) * (c.z - a.z);
        expect(
          upwardArea,
          `vertical or inverted triangle in province ${province.id}`,
        ).toBeGreaterThan(0);
      }
    }
  });
  it("raises geographic ranges above the eastern Sumatra and southern Papua lowlands", () => {
    const height = (lon: number, lat: number) =>
      world.surfaceHeight(projectCoordinate([lon, lat]));
    const papuaRidge = height(138.68, -4.26),
      papuaLowland = height(139, -7.2);
    const sumatraRidge = height(101.26, -1.7),
      sumatraLowland = height(103, -1);
    expect(papuaLowland).toBeGreaterThan(SEA_LEVEL);
    expect(sumatraLowland).toBeGreaterThan(SEA_LEVEL);
    expect(papuaRidge - papuaLowland).toBeGreaterThan(0.8);
    expect(sumatraRidge - sumatraLowland).toBeGreaterThan(0.5);
    expect(papuaRidge).toBeGreaterThan(sumatraRidge);
  });
  it("keeps construction footprints above terrain and their anchors outside Lake Toba", () => {
    const simplified = smoothMap(simplifyMap(map));
    for (const province of world.provinces) {
      const shapes = geometryShapes(
        simplified.features.find(
          (feature) => feature.properties.KODE_PROV === province.id,
        )!.geometry,
      );
      const site = new Vector2(province.anchor.x, -province.anchor.z);
      expect(
        shapes.some(
          (shape) =>
            inside(site, shape.getPoints()) &&
            shape.holes.every((hole) => !inside(site, hole.getPoints())),
        ),
        `site in province ${province.id}`,
      ).toBe(true);
      expect(
        inLakeWater(site),
        `construction in Lake Toba: ${province.id}`,
      ).toBe(false);
      let highest = SEA_LEVEL;
      for (let x = -1.35; x <= 1.35 + 1e-6; x += 0.15)
        for (let z = -0.75; z <= 0.75 + 1e-6; z += 0.15)
          highest = Math.max(
            highest,
            world.surfaceHeight(new Vector2(site.x + x, site.y - z)),
          );
      for (const land of world.provinces) {
        const positions = land.geometry.getAttribute("position");
        for (let i = 0; i < positions.count; i++)
          if (
            Math.abs(positions.getX(i) - province.anchor.x) <= 1.35 &&
            Math.abs(positions.getZ(i) - province.anchor.z) <= 0.75
          )
            highest = Math.max(highest, positions.getY(i));
      }
      expect(
        province.anchor.y,
        `terrain intersects construction in province ${province.id}`,
      ).toBeGreaterThanOrEqual(highest);
    }
  });
  it("cuts Lake Toba out of the terrain and preserves Samosir as selectable land", () => {
    const province = world.provinces.find((p) => p.id === "12")!;
    let samosirTriangles = 0;
    for (const [a, b, c] of triangles(province.geometry)) {
      const center = new Vector2((a.x + b.x + c.x) / 3, -(a.z + b.z + c.z) / 3);
      expect(inLakeWater(center), "land triangle covers Lake Toba").toBe(false);
      if (inside(center, samosir)) samosirTriangles++;
    }
    expect(samosirTriangles).toBeGreaterThan(0);
    expect(world.surfaceHeight(projectCoordinate([98.62, 2.73]))).toBe(
      SEA_LEVEL,
    );
    expect(
      world.surfaceHeight(projectCoordinate([98.82, 2.6])),
    ).toBeGreaterThan(0.7);
    expect(world.lake.getAttribute("position").count).toBeGreaterThan(0);
    for (const [a, b, c] of triangles(world.lake)) {
      const center = new Vector2((a.x + b.x + c.x) / 3, -(a.z + b.z + c.z) / 3);
      expect(inside(center, samosir), "lake triangle covers Samosir").toBe(
        false,
      );
      expect(a.y).toBeCloseTo(b.y, 6);
      expect(a.y).toBeCloseTo(c.y, 6);
    }
  });
  it("puts each symbolic construction site inside its province and outside holes", () => {
    for (const feature of map.features) {
      const shapes = geometryShapes(feature.geometry),
        anchor = interiorAnchor(shapes),
        point = new Vector2(anchor.x, -anchor.z);
      const largest = [...shapes].sort(
        (a, b) =>
          Math.abs(ShapeUtils.area(b.getPoints())) -
          Math.abs(ShapeUtils.area(a.getPoints())),
      )[0];
      expect(
        inside(point, largest.getPoints()),
        feature.properties.PROVINSI,
      ).toBe(true);
      expect(
        largest.holes.every((hole) => !inside(point, hole.getPoints())),
      ).toBe(true);
    }
  });
  it("preserves polygon holes and does not mutate source winding", () => {
    const source = {
      type: "Polygon" as const,
      coordinates: [
        [
          [100, 0],
          [104, 0],
          [104, 4],
          [100, 4],
          [100, 0],
        ],
        [
          [101, 1],
          [103, 1],
          [103, 3],
          [101, 3],
          [101, 1],
        ],
      ],
    };
    const before = JSON.stringify(source),
      shape = geometryShapes(source)[0];
    expect(shape.holes).toHaveLength(1);
    const anchor = interiorAnchor([shape]);
    expect(
      inside(
        new Vector2(anchor.x, -anchor.z),
        source.coordinates[1].map(projectCoordinate),
      ),
    ).toBe(false);
    expect(JSON.stringify(source)).toBe(before);
  });
});
