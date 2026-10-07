import { OrthographicCamera, Vector3 } from "three";
import { localDetailWeight } from "./localSceneryVisibility";

export const WORLD_SUN_POSITION: [number, number, number] = [-35, 65, 20];
export const GLOBAL_SHADOW_BOUNDS = {
  left: -65,
  right: 65,
  top: 35,
  bottom: -35,
};
export type WorldShadowBounds = typeof GLOBAL_SHADOW_BOUNDS;

export function shadowDetailActivity(
  previous: { visible: boolean; dirty: boolean },
  zoomRatio: number,
) {
  const visible = localDetailWeight(1, zoomRatio) > 0;
  return { visible, dirty: previous.dirty || previous.visible || visible };
}

const sunCamera = new OrthographicCamera(-65, 65, 35, -35, 0.5, 160);
sunCamera.position.fromArray(WORLD_SUN_POSITION);
sunCamera.lookAt(0, 0, 0);
sunCamera.updateMatrixWorld();

/** Include the sea and elevated receivers, whose footprints shift with camera tilt. */
export function visibleWorldSlab(camera: OrthographicCamera, height: number) {
  camera.updateMatrixWorld();
  const direction = camera.getWorldDirection(new Vector3());
  if (Math.abs(direction.y) < 0.1) return [];
  const corners: Vector3[] = [];
  for (const x of [-1, 1]) {
    for (const y of [-1, 1]) {
      const origin = new Vector3(x, y, -1).unproject(camera);
      for (const elevation of [0, height]) {
        corners.push(
          origin
            .clone()
            .addScaledVector(direction, (elevation - origin.y) / direction.y),
        );
      }
    }
  }
  return corners;
}

export function fitWorldShadow(
  camera: OrthographicCamera,
  height: number,
): WorldShadowBounds | null {
  const corners = visibleWorldSlab(camera, height);
  if (!corners.length) return null;
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const corner of corners) {
    corner.applyMatrix4(sunCamera.matrixWorldInverse);
    minX = Math.min(minX, corner.x);
    maxX = Math.max(maxX, corner.x);
    minY = Math.min(minY, corner.y);
    maxY = Math.max(maxY, corner.y);
  }
  // A caster and its shadow share sun-view coordinates, even when the caster
  // is outside the main view. The extra border also covers filtering and panning.
  const width = Math.ceil(maxX - minX + 8);
  const depth = Math.ceil(maxY - minY + 8);
  const snap = (center: number, span: number) =>
    Math.round(center / (span / 1024)) * (span / 1024);
  const centerX = snap((minX + maxX) / 2, width);
  const centerY = snap((minY + maxY) / 2, depth);
  return {
    left: centerX - width / 2,
    right: centerX + width / 2,
    top: centerY + depth / 2,
    bottom: centerY - depth / 2,
  };
}
