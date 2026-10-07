import { describe, expect, it } from "vitest";
import { Frustum, Matrix4, OrthographicCamera, Vector3 } from "three";
import type {
  LocalSceneryChunk,
  LocalSceneryItem,
  LocalSceneryKind,
} from "./localScenery";
import { createLocalSceneryModels } from "./localSceneryModels";
import {
  LOCAL_SCENERY_CAPACITY,
  localDetailWeight,
  selectLocalScenery,
} from "./localSceneryVisibility";

const kinds = Object.keys(LOCAL_SCENERY_CAPACITY) as LocalSceneryKind[];
const centre = new Vector3();
const item = (
  kind: LocalSceneryKind,
  tier: 1 | 2,
  x = 0,
  z = 0,
): LocalSceneryItem => ({
  province: "11",
  x,
  y: 1,
  z,
  scale: 0.35,
  rotation: 0,
  kind,
  tier,
});
const chunk = (
  id: string,
  minX: number,
  items: LocalSceneryItem[],
): LocalSceneryChunk => ({
  id,
  minX,
  maxX: minX + 1,
  minZ: 0,
  maxZ: 1,
  items,
});

function view() {
  const camera = new OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
  camera.position.set(0, 0, 20);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  return new Frustum().setFromProjectionMatrix(
    new Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    ),
  );
}

describe("local scenery visibility", () => {
  it("leaves the national view unchanged and reveals regional scenery before close details", () => {
    const chunks = [
      chunk("centre", 0, [
        item("tree", 1),
        item("tree", 2),
        item("house", 1),
        item("house-detail", 2),
      ]),
    ];
    const national = selectLocalScenery(chunks, view(), centre, 4, 1.15, []);
    expect(national.chunkCount).toBe(0);
    expect(Object.values(national.items).flat()).toHaveLength(0);
    const regional = selectLocalScenery(chunks, view(), centre, 4, 3.5, []);
    expect(Object.values(regional.items).flat()).toHaveLength(2);
    expect(
      Object.values(regional.items)
        .flat()
        .every((entry) => entry.tier === 1),
    ).toBe(true);
    const close = selectLocalScenery(chunks, view(), centre, 4, 8, []);
    expect(Object.values(close.items).flat()).toHaveLength(4);
  });

  it("changes detail continuously and monotonically through the supported zoom range", () => {
    for (const tier of [1, 2] as const) {
      let previous = 0;
      for (let zoom = 1; zoom <= 8; zoom += 0.01) {
        const weight = localDetailWeight(tier, zoom);
        expect(weight).toBeGreaterThanOrEqual(previous);
        expect(weight).toBeLessThanOrEqual(1);
        expect(weight - previous).toBeLessThan(0.02);
        previous = weight;
      }
      expect(previous).toBe(1);
    }
  });

  it("rejects offscreen chunks but retains canopies crossing the viewport edge", () => {
    const chunks = [
      chunk("visible", 0, [item("house", 1)]),
      chunk("canopy-at-edge", 5.5, [item("tree", 1, 5.5)]),
      chunk("offscreen", 7, [item("tree", 1, 7)]),
    ];
    const selected = selectLocalScenery(chunks, view(), centre, 4, 8, []);
    expect(selected.chunkCount).toBe(2);
    expect(selected.items.house).toHaveLength(1);
    expect(selected.items.tree.map((entry) => entry.x)).toEqual([5.5]);
  });

  it("caps each instanced mesh and spends the budget on the nearest visible chunks", () => {
    const makeItems = (x: number) =>
      kinds.flatMap((kind) =>
        Array.from({ length: LOCAL_SCENERY_CAPACITY[kind] + 10 }, () =>
          item(kind, 2, x),
        ),
      );
    const far = chunk("far", 3, makeItems(3));
    const near = chunk("near", 0, makeItems(0));
    const chunks = [far, near];
    const selected = selectLocalScenery(chunks, view(), centre, 4, 8, []);
    for (const kind of kinds) {
      expect(selected.items[kind]).toHaveLength(LOCAL_SCENERY_CAPACITY[kind]);
      expect(selected.items[kind].every((entry) => entry.x === 0)).toBe(true);
    }
    expect(chunks[0]).toBe(far);
  });

  it("clears new scenery and existing-model overlays around active construction sites", () => {
    const blocked = kinds.map((kind) => item(kind, 2, 0.79, -0.79));
    const safe = [item("tree", 2, 0.81, 0), item("house", 2, 0, -0.81)];
    const chunks = [chunk("site", 0, [...blocked, ...safe])];
    const selected = selectLocalScenery(chunks, view(), centre, 4, 8, [
      new Vector3(),
    ]);
    expect(Object.values(selected.items).flat()).toEqual(safe);
  });
});

describe("local scenery models", () => {
  it("merges every coloured primitive into a finite, bounded mesh with matching attributes", () => {
    const models = createLocalSceneryModels();
    try {
      expect(Object.keys(models).sort()).toEqual([...kinds].sort());
      for (const geometry of Object.values(models)) {
        const positions = geometry.getAttribute("position");
        expect(positions.count).toBeGreaterThan(0);
        expect(positions.count % 3).toBe(0);
        expect(geometry.getAttribute("normal").count).toBe(positions.count);
        expect(geometry.getAttribute("color").count).toBe(positions.count);
        expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);
        expect(geometry.boundingSphere?.radius).toBeGreaterThan(0);
        expect(geometry.boundingSphere?.radius).toBeLessThan(2);
        geometry.computeBoundingBox();
        expect(geometry.boundingBox!.min.y).toBeGreaterThan(-0.006);
        expect(geometry.boundingBox!.max.y).toBeLessThan(2);
      }
    } finally {
      Object.values(models).forEach((geometry) => geometry.dispose());
    }
  });
});
