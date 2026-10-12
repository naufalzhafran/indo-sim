import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Box3, MOUSE, OrthographicCamera, Vector2, Vector3 } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { regionForProvince } from "./engine/gameRegions";
import type { WorldGeometry } from "./mapGeometry";
import type { QuarterVisualTransition } from "./quarterVisual";
import {
  baseWorldZoom,
  BUTTON_ZOOM_FACTOR,
  cameraPanDistance,
  clampWorldZoom,
  DEFAULT_ZOOM_RATIO,
  easeZoom,
  MAX_ZOOM_RATIO,
  regionWorldZoom,
  wheelZoomFactor,
  zoomAtScreenPoint,
} from "./worldCameraMath";

export type CameraAction = {
  id: number;
  kind: "reset" | "in" | "out" | "left" | "right" | "up" | "down";
};

type CameraView = { target: Vector3; zoom: number };

export default function WorldCamera({
  world,
  action,
  selected,
  transition,
  inset: coveredWidth,
  reducedMotion,
  focus,
}: {
  focus: Vector3 | null;
  world: WorldGeometry;
  action: CameraAction;
  selected: string;
  transition: QuarterVisualTransition | null;
  inset: number;
  reducedMotion: boolean;
}) {
  const { camera, gl, size, invalidate } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  const baseZoom = useRef(1);
  const glide = useRef<{
    from: CameraView;
    to: CameraView;
    startedAt: number;
  } | null>(null);
  /** A zoom in progress, eased towards `goal` around a fixed screen point. */
  const zooming = useRef<{
    goal: number;
    anchor: Vector2;
    last: number;
  } | null>(null);
  // Too little open water beside the panel to frame a region in.
  const inset = size.width - coveredWidth >= 160 ? coveredWidth : 0;
  const lastInset = useRef(0);
  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement);
    c.enableRotate = false;
    c.enableDamping = false;
    c.screenSpacePanning = false;
    // Zoom is eased here instead, so wheel notches glide rather than jump.
    c.enableZoom = false;
    c.mouseButtons.LEFT = MOUSE.PAN;
    c.mouseButtons.RIGHT = MOUSE.PAN;
    const change = () => invalidate();
    const start = () => (glide.current = null);
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = gl.domElement.getBoundingClientRect();
      zoomTowards(
        (zooming.current?.goal ?? (camera as OrthographicCamera).zoom) *
          wheelZoomFactor(event),
        new Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          -((event.clientY - rect.top) / rect.height) * 2 + 1,
        ),
      );
    };
    c.addEventListener("change", change);
    c.addEventListener("start", start);
    gl.domElement.addEventListener("wheel", wheel, { passive: false });
    controls.current = c;
    return () => {
      gl.domElement.removeEventListener("wheel", wheel);
      c.removeEventListener("change", change);
      c.removeEventListener("start", start);
      c.dispose();
      controls.current = null;
    };
  }, [camera, gl, invalidate]);
  const motion = useRef(reducedMotion);
  motion.current = reducedMotion;
  /** Applies a zoom while the ground under `anchor` stays put on screen. */
  const applyZoom = (zoom: number, anchor: Vector2) => {
    const c = controls.current,
      cam = camera as OrthographicCamera;
    if (!c) return;
    const shift = zoomAtScreenPoint(cam, anchor, c.target.y, zoom);
    c.target.add(shift);
    camera.position.add(shift);
    c.update();
    invalidate();
  };
  const zoomTowards = (goal: number, anchor: Vector2) => {
    glide.current = null;
    const zoom = clampWorldZoom(goal, baseZoom.current);
    if (motion.current) {
      zooming.current = null;
      applyZoom(zoom, anchor);
      return;
    }
    zooming.current = { goal: zoom, anchor, last: performance.now() };
    invalidate();
  };
  const place = ({ target, zoom }: CameraView) => {
    const c = controls.current,
      cam = camera as OrthographicCamera;
    if (!c) return;
    camera.position.add(target.clone().sub(c.target));
    c.target.copy(target);
    cam.zoom = zoom;
    cam.updateProjectionMatrix();
    c.update();
    invalidate();
  };
  const moveTo = (view: CameraView) => {
    const c = controls.current;
    if (!c) return;
    zooming.current = null;
    if (reducedMotion) {
      glide.current = null;
      place(view);
      return;
    }
    glide.current = {
      from: {
        target: c.target.clone(),
        zoom: (camera as OrthographicCamera).zoom,
      },
      to: view,
      startedAt: performance.now(),
    };
    invalidate();
  };
  /** Frames the selected region in the open water to the right of any panel. */
  const regionView = (): CameraView | null => {
    const c = controls.current;
    const members = world.provinces.filter(
      (p) => regionForProvince(p.id)?.id === selected,
    );
    if (!c || !members.length) return null;
    const bounds = members.reduce((box, p) => box.union(p.bounds), new Box3());
    const extent = bounds.getSize(new Vector3());
    const zoom = regionWorldZoom(extent, size, inset, baseZoom.current);
    const target = bounds.getCenter(new Vector3());
    target.x -= inset / 2 / zoom;
    target.y = c.target.y;
    return { target, zoom };
  };
  const defaultView = (): CameraView => {
    const target = world.bounds.getCenter(new Vector3());
    // A little sea above the islands leaves space for the compact game HUD.
    target.y = 0;
    target.z -= 2.2;
    return { target, zoom: baseZoom.current * DEFAULT_ZOOM_RATIO };
  };
  const reset = () => {
    glide.current = null;
    zooming.current = null;
    const center = defaultView().target;
    camera.position.copy(center).add(new Vector3(0, 82, 60));
    controls.current?.target.copy(center);
    (camera as OrthographicCamera).zoom = baseZoom.current * DEFAULT_ZOOM_RATIO;
    camera.lookAt(center);
    camera.updateProjectionMatrix();
    controls.current?.update();
    invalidate();
  };
  useEffect(() => {
    baseZoom.current = baseWorldZoom(world.bounds, size);
    if (controls.current) {
      controls.current.minZoom = baseZoom.current;
      controls.current.maxZoom = baseZoom.current * MAX_ZOOM_RATIO;
    }
    const view = inset ? regionView() : null;
    if (view) {
      glide.current = null;
      place(view);
    } else reset();
  }, [size.width, size.height]);
  useEffect(() => {
    const previous = lastInset.current,
      c = controls.current;
    lastInset.current = inset;
    if (!c) return;
    if (inset) {
      const view = regionView();
      if (view) moveTo(view);
    } else if (previous) {
      // Return to the centred archipelago once the panel closes.
      moveTo(defaultView());
    }
  }, [selected, inset]);
  const hadFocus = useRef(false);
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    if (focus) {
      hadFocus.current = true;
      const zoom = clampWorldZoom(
        Math.max((camera as OrthographicCamera).zoom, baseZoom.current * 2.2),
        baseZoom.current,
      );
      const target = focus.clone();
      target.y = c.target.y;
      target.x -= inset / 2 / zoom;
      moveTo({ target, zoom });
    } else if (hadFocus.current) {
      hadFocus.current = false;
      moveTo((inset && regionView()) || defaultView());
    }
  }, [focus]);
  useEffect(() => {
    if (!action.id) return;
    const c = controls.current,
      cam = camera as OrthographicCamera;
    if (!c) return;
    glide.current = null;
    if (action.kind !== "in" && action.kind !== "out") zooming.current = null;
    if (action.kind === "reset") reset();
    else if (action.kind === "in" || action.kind === "out") {
      // Zoom around the middle of the open water beside any panel.
      zoomTowards(
        (zooming.current?.goal ?? cam.zoom) *
          (action.kind === "in" ? BUTTON_ZOOM_FACTOR : 1 / BUTTON_ZOOM_FACTOR),
        new Vector2(inset / size.width, 0),
      );
    } else {
      const distance = cameraPanDistance(cam.zoom, baseZoom.current);
      const shift = new Vector3(
        action.kind === "left"
          ? -distance
          : action.kind === "right"
            ? distance
            : 0,
        0,
        action.kind === "up"
          ? -distance
          : action.kind === "down"
            ? distance
            : 0,
      );
      c.target.add(shift);
      camera.position.add(shift);
      c.update();
      invalidate();
    }
  }, [action.id]);
  useEffect(() => {
    if (transition) reset();
  }, [transition]);
  const recordView = () => {
    if (!import.meta.env.DEV || !controls.current) return;
    const dataset = gl.domElement.dataset;
    dataset.zoomRatio = (
      (camera as OrthographicCamera).zoom / baseZoom.current
    ).toFixed(4);
    dataset.maxZoomRatio = String(MAX_ZOOM_RATIO);
    dataset.cameraTargetX = controls.current.target.x.toFixed(4);
    dataset.cameraTargetZ = controls.current.target.z.toFixed(4);
  };
  useFrame(() => {
    const c = controls.current;
    if (!c) return;
    const move = glide.current;
    if (move) {
      const t = Math.min(1, (performance.now() - move.startedAt) / 520),
        eased = 1 - (1 - t) ** 3;
      place({
        target: move.from.target.clone().lerp(move.to.target, eased),
        zoom: move.from.zoom + (move.to.zoom - move.from.zoom) * eased,
      });
      if (t === 1) glide.current = null;
      recordView();
      return;
    }
    const zoom = zooming.current;
    if (zoom) {
      const now = performance.now(),
        cam = camera as OrthographicCamera;
      const next = easeZoom(cam.zoom, zoom.goal, now - zoom.last);
      zoom.last = now;
      applyZoom(next, zoom.anchor);
      if (next === zoom.goal) zooming.current = null;
    }
    // Bounds apply to the middle of the open water, beside any panel.
    const shift = inset / 2 / (camera as OrthographicCamera).zoom;
    const x = Math.max(-55 - shift, Math.min(55 - shift, c.target.x)),
      z = Math.max(-28, Math.min(28, c.target.z));
    if (x !== c.target.x || z !== c.target.z) {
      camera.position.x += x - c.target.x;
      camera.position.z += z - c.target.z;
      c.target.x = x;
      c.target.z = z;
      c.update();
    }
    recordView();
  });
  return null;
}
