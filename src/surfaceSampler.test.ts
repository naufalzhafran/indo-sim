import { describe, expect, it } from "vitest";
import { BufferGeometry, Float32BufferAttribute, Vector2 } from "three";
import { createSurfaceSampler, SEA_LEVEL } from "./mapGeometry";

function slope(offsetX = 0, elevation = 10) {
  const geometry = new BufferGeometry();
  const corners = [
    [-2, -2],
    [2, -2],
    [2, 2],
    [-2, 2],
  ];
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(
      corners.flatMap(([x, z]) => [x + offsetX, elevation + x + 2 * z, z]),
      3,
    ),
  );
  geometry.setIndex([0, 2, 1, 0, 3, 2]);
  return geometry;
}

describe("terrain surface sampling", () => {
  it("interpolates the actual indexed faces across cells, edges, and separate geometries", () => {
    const geometries = [slope(), slope(20, 30)];
    const sample = createSurfaceSampler(geometries);
    for (const x of [-2, -1.4, -0.7, 0, 0.7, 1.4, 2])
      for (const z of [-2, -0.71, 0, 0.71, 2]) {
        expect(sample.heightAt(new Vector2(x, -z))).toBeCloseTo(
          10 + x + 2 * z,
          12,
        );
        expect(sample.heightAt(new Vector2(x + 20, -z))).toBeCloseTo(
          30 + x + 2 * z,
          12,
        );
      }
    expect(sample.heightAt(new Vector2(10, 0))).toBe(SEA_LEVEL);
    expect(sample.heightAt(new Vector2(2.01, 0))).toBe(SEA_LEVEL);
    geometries.forEach((geometry) => geometry.dispose());
  });

  it("clips sloping faces to each footprint and resets visitation between queries", () => {
    const geometry = slope();
    const sample = createSurfaceSampler([geometry]);
    for (let i = 0; i < 3; i++) {
      const interior = sample.footprintRange(new Vector2(0.3, 0.2), 0.5, 0.4);
      expect(interior.min).toBeCloseTo(8.6, 12);
      expect(interior.max).toBeCloseTo(11.2, 12);
      const coast = sample.footprintRange(new Vector2(1.8, -1.8), 0.5, 0.5);
      expect(coast.min).toBeCloseTo(13.9, 12);
      expect(coast.max).toBe(16);
      expect(sample.footprintRange(new Vector2(0, 0), 3, 3)).toEqual({
        min: 4,
        max: 16,
      });
      expect(sample.footprintRange(new Vector2(10, 0))).toEqual({
        min: SEA_LEVEL,
        max: SEA_LEVEL,
      });
    }
    geometry.dispose();
  });

  it("reuses a structured-cloned index with restored geometry buffers", () => {
    const geometries = [slope(), slope(20, 30)];
    const original = createSurfaceSampler(geometries);
    const restoredGeometries = geometries.map((geometry) => geometry.clone());
    const restored = createSurfaceSampler(
      restoredGeometries,
      structuredClone(original.index),
    );
    for (const point of [
      new Vector2(-1.4, 0.7),
      new Vector2(0.3, 0.2),
      new Vector2(20.2, -1),
      new Vector2(10, 0),
    ]) {
      expect(restored.heightAt(point)).toBe(original.heightAt(point));
      expect(restored.footprintRange(point)).toEqual(
        original.footprintRange(point),
      );
    }
    [...geometries, ...restoredGeometries].forEach((geometry) =>
      geometry.dispose(),
    );
  });

  it("skips degenerate triangles without changing the first valid surface at an overlap", () => {
    const degenerate = new BufferGeometry();
    degenerate.setAttribute(
      "position",
      new Float32BufferAttribute([0, 100, 0, 1, 100, 1, 2, 100, 2], 3),
    );
    degenerate.setIndex([0, 1, 2]);
    const geometries = [degenerate, slope(), slope(0, 30)];
    const sample = createSurfaceSampler(geometries);
    expect(sample.heightAt(new Vector2(0.3, -0.3))).toBeCloseTo(10.9, 12);
    geometries.forEach((geometry) => geometry.dispose());
  });
});
