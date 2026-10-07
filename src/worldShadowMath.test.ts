import { describe, expect, it } from "vitest";
import { OrthographicCamera, Vector3 } from "three";
import {
  fitWorldShadow,
  GLOBAL_SHADOW_BOUNDS,
  shadowDetailActivity,
  visibleWorldSlab,
  WORLD_SUN_POSITION,
} from "./worldShadowMath";

function sceneCamera(target: Vector3, zoom: number) {
  const camera = new OrthographicCamera(-720, 720, 450, -450, 0.1, 500);
  camera.position.copy(target).add(new Vector3(0, 82, 60));
  camera.lookAt(target);
  camera.zoom = zoom;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  return camera;
}

describe("cached close-view sun shadows", () => {
  it("keeps disappearing local casters dirty until the final overview bake", () => {
    let activity = { visible: false, dirty: false };
    activity = shadowDetailActivity(activity, 8);
    activity.dirty = false;
    activity = shadowDetailActivity(activity, 2.3);
    activity = shadowDetailActivity(activity, 1);
    expect(activity).toEqual({ visible: false, dirty: true });
    activity = shadowDetailActivity(activity, 1.15);
    expect(activity.dirty).toBe(true);
    activity.dirty = false;
    expect(shadowDetailActivity(activity, 1.15)).toEqual({
      visible: false,
      dirty: false,
    });
  });

  it("refreshes regional detail shadows below the local-fit threshold", () => {
    const activity = shadowDetailActivity(
      { visible: false, dirty: false },
      2.3,
    );
    expect(activity).toEqual({ visible: true, dirty: true });
    expect(shadowDetailActivity({ visible: false, dirty: false }, 2.1)).toEqual(
      {
        visible: false,
        dirty: false,
      },
    );
  });

  it("includes both sea-level and elevated screen-edge receivers", () => {
    const camera = sceneCamera(new Vector3(25, 0, -10), 90);
    const points = visibleWorldSlab(camera, 8);
    expect(points).toHaveLength(8);
    for (const point of points) {
      expect(Math.min(Math.abs(point.y), Math.abs(point.y - 8))).toBeLessThan(
        1e-8,
      );
      const screen = point.clone().project(camera);
      expect(Math.abs(screen.x)).toBeCloseTo(1);
      expect(Math.abs(screen.y)).toBeCloseTo(1);
    }
  });

  it.each([
    new Vector3(-40, 0, -10),
    new Vector3(0, 0, 0),
    new Vector3(45, 0, 12),
  ])(
    "fits receivers and offscreen casters without changing sunlight",
    (target) => {
      const camera = sceneCamera(target, 90);
      const bounds = fitWorldShadow(camera, 8)!;
      const shadow = new OrthographicCamera(
        bounds.left,
        bounds.right,
        bounds.top,
        bounds.bottom,
        0.5,
        160,
      );
      shadow.position.fromArray(WORLD_SUN_POSITION);
      shadow.lookAt(0, 0, 0);
      shadow.updateMatrixWorld();
      const towardSun = new Vector3(...WORLD_SUN_POSITION).normalize();
      for (const receiver of visibleWorldSlab(camera, 8)) {
        // A nearby offscreen tree can still cast onto a visible receiver.
        const caster = receiver.clone().addScaledVector(towardSun, 6);
        for (const point of [receiver, caster]) {
          const projected = point.clone().project(shadow);
          expect(Math.abs(projected.x)).toBeLessThan(1);
          expect(Math.abs(projected.y)).toBeLessThan(1);
          expect(Math.abs(projected.z)).toBeLessThan(1);
        }
      }
      expect(bounds.right - bounds.left).toBeLessThan(
        GLOBAL_SHADOW_BOUNDS.right - GLOBAL_SHADOW_BOUNDS.left,
      );
      expect(bounds.top - bounds.bottom).toBeLessThan(
        GLOBAL_SHADOW_BOUNDS.top - GLOBAL_SHADOW_BOUNDS.bottom,
      );
    },
  );

  it("declines fitting when the view cannot intersect a horizontal ground plane", () => {
    const camera = sceneCamera(new Vector3(), 90);
    camera.position.set(0, 0, 100);
    camera.lookAt(0, 0, 0);
    expect(fitWorldShadow(camera, 8)).toBeNull();
  });
});
