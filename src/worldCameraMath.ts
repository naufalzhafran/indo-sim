import {
  Plane,
  Raycaster,
  Vector3,
  type Box3,
  type Vector2,
  type OrthographicCamera,
} from "three";

export const DEFAULT_ZOOM_RATIO = 1.15;
export const MAX_ZOOM_RATIO = 14;
/** One mouse-wheel notch (100 px) zooms by about a quarter. */
export const WHEEL_ZOOM_STEP = 0.0022;
/** Map zoom buttons change zoom by this factor per press. */
export const BUTTON_ZOOM_FACTOR = 1.5;

export function baseWorldZoom(
  bounds: Box3,
  size: { width: number; height: number },
) {
  return Math.min(
    size.width / (bounds.max.x - bounds.min.x + 11),
    size.height / 51,
  );
}

export function clampWorldZoom(zoom: number, baseZoom: number) {
  return Math.max(baseZoom, Math.min(baseZoom * MAX_ZOOM_RATIO, zoom));
}

export function regionWorldZoom(
  extent: Pick<Vector3, "x" | "z">,
  size: { width: number; height: number },
  inset: number,
  baseZoom: number,
) {
  return clampWorldZoom(
    Math.min(
      (size.width - inset) / (extent.x + 12),
      size.height / (extent.z * 0.81 + 22),
    ),
    baseZoom,
  );
}

/** Keep each arrow press's screen travel the same as in the default view. */
export function cameraPanDistance(zoom: number, baseZoom: number) {
  return (5 * baseZoom * DEFAULT_ZOOM_RATIO) / zoom;
}

/** Normalises wheel deltas from mice, trackpads and pinch gestures to a zoom factor. */
export function wheelZoomFactor(event: {
  deltaY: number;
  deltaMode: number;
  ctrlKey: boolean;
}) {
  const pixels =
    event.deltaY *
    (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1);
  // Pinch gestures arrive as small ctrl-wheel deltas; give them the same feel.
  const step = event.ctrlKey ? WHEEL_ZOOM_STEP * 4 : WHEEL_ZOOM_STEP;
  return Math.exp(-Math.max(-600, Math.min(600, pixels)) * step);
}

/** Eases zoom towards its goal in log space, so every step feels equally fast. */
export function easeZoom(zoom: number, goal: number, elapsedMs: number) {
  const t = 1 - Math.exp(-Math.max(0, elapsedMs) / 85);
  const next = zoom * (goal / zoom) ** t;
  return Math.abs(Math.log(goal / next)) < 0.002 ? goal : next;
}

const ray = new Raycaster(),
  ground = new Plane(new Vector3(0, 1, 0)),
  before = new Vector3(),
  after = new Vector3();
/**
 * Sets the camera zoom and returns the ground-plane shift that keeps the point
 * under `ndc` (normalised screen position) where it is on screen.
 */
export function zoomAtScreenPoint(
  camera: OrthographicCamera,
  ndc: Vector2,
  groundY: number,
  zoom: number,
) {
  ground.constant = -groundY;
  camera.updateMatrixWorld();
  ray.setFromCamera(ndc, camera);
  const from = ray.ray.intersectPlane(ground, before);
  camera.zoom = zoom;
  camera.updateProjectionMatrix();
  ray.setFromCamera(ndc, camera);
  const to = ray.ray.intersectPlane(ground, after);
  return from && to
    ? new Vector3(from.x - to.x, 0, from.z - to.z)
    : new Vector3();
}
