import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Path, Shape, ShapeUtils, Vector2 } from "three";
import type { MapData } from "./mapData";
import { geometryShapes, simplifyMap, smoothMap } from "./mapGeometry";
import { triangulateTerrain } from "./terrainMesh";

const ring = (coordinates: number[][]) =>
  coordinates.map(([x, y]) => new Vector2(x, y));
const shape = (coordinates: number[][]) => new Shape(ring(coordinates));
const triangleArea = (a: Vector2, b: Vector2, c: Vector2) =>
  Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) / 2;
const areaOf = (mesh: ReturnType<typeof triangulateTerrain>) =>
  mesh.triangles.reduce(
    (sum, [a, b, c]) =>
      sum + triangleArea(mesh.points[a], mesh.points[b], mesh.points[c]),
    0,
  );

describe("terrain surface triangulation", () => {
  it("preserves holes, separate islands, and the supplied source geometry", () => {
    const island = shape([
      [0, 0],
      [8, 0],
      [8, 7],
      [0, 7],
    ]);
    island.holes.push(
      new Path(
        ring([
          [2, 2],
          [2, 5],
          [6, 5],
          [6, 2],
        ]),
      ),
    );
    const offshore = shape([
      [10, 0],
      [12, 0],
      [12, 2],
      [10, 2],
    ]);
    const before = JSON.stringify([island.toJSON(), offshore.toJSON()]);
    const mesh = triangulateTerrain([island, offshore]);
    expect(areaOf(mesh)).toBeCloseTo(48, 8);
    expect(mesh.rings).toHaveLength(3);
    expect(JSON.stringify([island.toJSON(), offshore.toJSON()])).toBe(before);
    for (const [a, b, c] of mesh.triangles) {
      const center = mesh.points[a]
        .clone()
        .add(mesh.points[b])
        .add(mesh.points[c])
        .multiplyScalar(1 / 3);
      expect(center.x > 2 && center.x < 6 && center.y > 2 && center.y < 5).toBe(
        false,
      );
      expect(center.x > 8 && center.x < 10).toBe(false);
    }
  });

  it("uses identical vertices on reversed province borders, including collinear subdivisions", () => {
    const sharedA = [0.213, 0.341],
      sharedB = [5.873, 4.192];
    const left = triangulateTerrain([shape([sharedA, sharedB, [-4, 5]])]);
    const right = triangulateTerrain([shape([sharedB, sharedA, [8, -3]])]);
    const onShared = (p: Vector2) =>
      Math.abs(
        (sharedB[0] - sharedA[0]) * (p.y - sharedA[1]) -
          (sharedB[1] - sharedA[1]) * (p.x - sharedA[0]),
      ) < 1e-10;
    const border = (mesh: typeof left) =>
      mesh.rings
        .flat()
        .filter(onShared)
        .map((p) => [p.x, p.y])
        .sort(([x1], [x2]) => x1 - x2);
    expect(border(left)).toEqual(border(right));
    expect(border(left).length).toBeGreaterThan(9);
    for (const mesh of [left, right]) {
      const used = new Set(mesh.triangles.flat());
      for (const p of mesh.rings.flat())
        expect(used.has(mesh.points.indexOf(p))).toBe(true);
    }
  });

  it("fills broad interiors with local facets instead of long boundary-to-boundary fans", () => {
    const mesh = triangulateTerrain([
      shape([
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ]),
    ]);
    expect(areaOf(mesh)).toBeCloseTo(100, 8);
    expect(mesh.points.length).toBeGreaterThan(200);
    const longest = mesh.triangles.reduce(
      (max, [a, b, c]) =>
        Math.max(
          max,
          mesh.points[a].distanceTo(mesh.points[b]),
          mesh.points[b].distanceTo(mesh.points[c]),
          mesh.points[c].distanceTo(mesh.points[a]),
        ),
      0,
    );
    expect(longest).toBeLessThan(1.1);
  });

  it("samples the interior of a thin islet that has no grid points", () => {
    const mesh = triangulateTerrain(
      [
        shape([
          [0, 0],
          [2, 0],
          [2, 0.12],
          [0, 0.12],
        ]),
      ],
      0.3,
    );
    const boundary = mesh.rings.flat();
    expect(areaOf(mesh)).toBeCloseTo(0.24, 10);
    expect(mesh.points.length).toBe(boundary.length + 1);
    const interior = mesh.points.find((point) => !boundary.includes(point))!;
    expect(interior.x).toBeGreaterThan(0);
    expect(interior.x).toBeLessThan(2);
    expect(interior.y).toBeGreaterThan(0);
    expect(interior.y).toBeLessThan(0.12);
    expect(
      boundary.every(
        (point) =>
          point.x === 0 || point.x === 2 || point.y === 0 || point.y === 0.12,
      ),
    ).toBe(true);
    expect(new Set(mesh.triangles.flat()).size).toBe(mesh.points.length);
  });

  it("keeps every real province finite and preserves its area", () => {
    const data = JSON.parse(
      readFileSync(
        new URL("../public/data/provinces.geojson", import.meta.url),
        "utf8",
      ),
    ) as MapData;
    const map = smoothMap(simplifyMap(data));
    let triangles = 0;
    for (const province of map.features) {
      const shapes = geometryShapes(province.geometry).filter(
        (s) => Math.abs(ShapeUtils.area(s.getPoints())) >= 0.2,
      );
      const mesh = triangulateTerrain(shapes);
      const expected = shapes.reduce((sum, s) => {
        const extracted = s.extractPoints(1);
        return (
          sum +
          Math.abs(ShapeUtils.area(extracted.shape)) -
          extracted.holes.reduce(
            (total, h) => total + Math.abs(ShapeUtils.area(h)),
            0,
          )
        );
      }, 0);
      expect(areaOf(mesh), province.properties.PROVINSI).toBeCloseTo(
        expected,
        6,
      );
      expect(
        mesh.points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
      ).toBe(true);
      expect(
        mesh.triangles.every(
          ([a, b, c]) =>
            triangleArea(mesh.points[a], mesh.points[b], mesh.points[c]) >
            1e-12,
        ),
      ).toBe(true);
      const used = new Set(mesh.triangles.flat());
      expect(
        mesh.rings
          .flat()
          .every((point) => used.has(mesh.points.indexOf(point))),
        `${province.properties.PROVINSI} boundary vertices`,
      ).toBe(true);
      triangles += mesh.triangles.length;
    }
    expect(triangles).toBeGreaterThan(3000);
    expect(triangles).toBeLessThan(400000);
  }, 15000);
});
