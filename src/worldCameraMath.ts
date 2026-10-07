import type { Box3, Vector3 } from "three";

export const DEFAULT_ZOOM_RATIO = 1.15;
export const MAX_ZOOM_RATIO = 8;

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

/** Keep the centre of the uncovered map anchored while a side panel is open. */
export function panelZoomShift(
  inset: number,
  oldZoom: number,
  newZoom: number,
) {
  return inset / (2 * oldZoom) - inset / (2 * newZoom);
}
