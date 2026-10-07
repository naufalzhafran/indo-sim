import { describe, expect, it } from "vitest";
import { Box3, OrthographicCamera, Vector3 } from "three";
import {
  baseWorldZoom,
  cameraPanDistance,
  clampWorldZoom,
  DEFAULT_ZOOM_RATIO,
  MAX_ZOOM_RATIO,
  panelZoomShift,
  regionWorldZoom,
} from "./worldCameraMath";

const bounds = new Box3(new Vector3(-49, 0, -15), new Vector3(49, 8, 28));
const desktopSizes = [
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
];

describe("orthographic world navigation", () => {
  it.each(desktopSizes)("fits the archipelago at $width×$height", (size) => {
    const zoom = baseWorldZoom(bounds, size);
    expect((98 + 11) * zoom).toBeLessThanOrEqual(size.width);
    expect(51 * zoom).toBeLessThanOrEqual(size.height);
    expect(clampWorldZoom(0, zoom)).toBe(zoom);
    expect(clampWorldZoom(Infinity, zoom)).toBe(zoom * 8);
    expect(clampWorldZoom(zoom * DEFAULT_ZOOM_RATIO, zoom)).toBe(
      zoom * DEFAULT_ZOOM_RATIO,
    );
  });

  it("frames a region inside the space remaining beside its panel", () => {
    const size = desktopSizes[0];
    const extent = { x: 20, z: 8 };
    const inset = 600;
    const base = baseWorldZoom(bounds, size);
    const zoom = regionWorldZoom(extent, size, inset, base);
    expect((extent.x + 12) * zoom).toBeLessThanOrEqual(size.width - inset);
    expect((extent.z * 0.81 + 22) * zoom).toBeLessThanOrEqual(size.height);
    expect(zoom).toBeLessThan(regionWorldZoom(extent, size, 0, base));
    expect(zoom).toBeGreaterThanOrEqual(base);
    expect(zoom).toBeLessThanOrEqual(base * MAX_ZOOM_RATIO);
  });

  it.each(desktopSizes)(
    "keeps the uncovered map centre fixed through button zoom at $width×$height",
    (size) => {
      const base = baseWorldZoom(bounds, size);
      for (const inset of [0, 710]) {
        const camera = new OrthographicCamera(
          -size.width / 2,
          size.width / 2,
          size.height / 2,
          -size.height / 2,
          0.1,
          500,
        );
        camera.position.set(0, 82, 60);
        camera.lookAt(0, 0, 0);
        camera.zoom = base * 2;
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();
        const focus = new Vector3(inset / (2 * camera.zoom), 0, 0);
        for (const ratio of [4, 8, 2, 1]) {
          const nextZoom = base * ratio;
          camera.position.x += panelZoomShift(inset, camera.zoom, nextZoom);
          camera.zoom = nextZoom;
          camera.updateProjectionMatrix();
          camera.updateMatrixWorld();
          const projected = focus.clone().project(camera);
          expect(projected.x).toBeCloseTo(inset / size.width);
          expect(projected.y).toBeCloseTo(0);
          expect(camera.position.y).toBe(82);
          expect(camera.position.z).toBe(60);
        }
      }
    },
  );

  it.each(desktopSizes)(
    "preserves arrow-button screen travel from default to 8× at $width×$height",
    (size) => {
      const base = baseWorldZoom(bounds, size);
      const camera = new OrthographicCamera(
        -size.width / 2,
        size.width / 2,
        size.height / 2,
        -size.height / 2,
        0.1,
        500,
      );
      camera.position.set(0, 82, 60);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
      const screenTravel = (ratio: number, direction: Vector3) => {
        camera.zoom = base * ratio;
        camera.updateProjectionMatrix();
        const from = new Vector3().project(camera);
        const to = direction
          .clone()
          .multiplyScalar(cameraPanDistance(camera.zoom, base))
          .project(camera);
        return Math.hypot(
          ((to.x - from.x) * size.width) / 2,
          ((to.y - from.y) * size.height) / 2,
        );
      };
      for (const direction of [new Vector3(1, 0, 0), new Vector3(0, 0, 1)]) {
        const defaultTravel = screenTravel(DEFAULT_ZOOM_RATIO, direction);
        expect(defaultTravel).toBeGreaterThan(0);
        expect(screenTravel(MAX_ZOOM_RATIO, direction)).toBeCloseTo(
          defaultTravel,
        );
      }
      expect(cameraPanDistance(base * DEFAULT_ZOOM_RATIO, base)).toBeCloseTo(5);
      expect(cameraPanDistance(base * MAX_ZOOM_RATIO, base)).toBeLessThan(1);
    },
  );
});
