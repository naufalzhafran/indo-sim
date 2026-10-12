import { describe, expect, it } from "vitest";
import { Box3, OrthographicCamera, Vector2, Vector3 } from "three";
import {
  baseWorldZoom,
  cameraPanDistance,
  clampWorldZoom,
  DEFAULT_ZOOM_RATIO,
  easeZoom,
  MAX_ZOOM_RATIO,
  regionWorldZoom,
  wheelZoomFactor,
  zoomAtScreenPoint,
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
    expect(clampWorldZoom(Infinity, zoom)).toBe(zoom * MAX_ZOOM_RATIO);
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
    "keeps the ground under the cursor or panel centre fixed while zooming at $width×$height",
    (size) => {
      const base = baseWorldZoom(bounds, size);
      for (const anchor of [
        new Vector2(0, 0),
        new Vector2(710 / size.width, 0),
        new Vector2(-0.7, 0.55),
      ]) {
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
        // The ground point under the anchor, found along the view ray.
        const direction = camera.getWorldDirection(new Vector3());
        const origin = new Vector3(anchor.x, anchor.y, -1).unproject(camera);
        const point = origin.addScaledVector(
          direction,
          -origin.y / direction.y,
        );
        for (const ratio of [4, MAX_ZOOM_RATIO, 2, 1]) {
          const shift = zoomAtScreenPoint(camera, anchor, 0, base * ratio);
          expect(shift.y).toBe(0);
          camera.position.add(shift);
          camera.updateMatrixWorld();
          const projected = point.clone().project(camera);
          expect(projected.x).toBeCloseTo(anchor.x, 6);
          expect(projected.y).toBeCloseTo(anchor.y, 6);
          expect(camera.position.y).toBe(82);
        }
      }
    },
  );

  it("eases zoom smoothly and evenly towards its goal", () => {
    expect(
      wheelZoomFactor({ deltaY: -100, deltaMode: 0, ctrlKey: false }),
    ).toBeGreaterThan(1.2);
    expect(
      wheelZoomFactor({ deltaY: 100, deltaMode: 0, ctrlKey: false }) *
        wheelZoomFactor({ deltaY: -100, deltaMode: 0, ctrlKey: false }),
    ).toBeCloseTo(1);
    // Line-based wheels and pinch gestures move about as far per gesture.
    expect(
      wheelZoomFactor({ deltaY: -3, deltaMode: 1, ctrlKey: false }),
    ).toBeGreaterThan(1.05);
    expect(
      wheelZoomFactor({ deltaY: -10, deltaMode: 0, ctrlKey: true }),
    ).toBeGreaterThan(1.05);
    let zoom = 10;
    const steps: number[] = [];
    for (let frame = 0; frame < 60 && zoom !== 40; frame++) {
      const next = easeZoom(zoom, 40, 16);
      steps.push(next / zoom);
      zoom = next;
    }
    expect(zoom).toBe(40);
    expect(steps.length).toBeGreaterThan(8);
    expect(steps.every((step) => step >= 1)).toBe(true);
    // Each frame covers a steady share of what remains: no sudden jump.
    expect(Math.max(...steps)).toBeLessThan(1.3);
  });

  it.each(desktopSizes)(
    "preserves arrow-button screen travel from default to full zoom at $width×$height",
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
