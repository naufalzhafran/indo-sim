import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { DirectionalLight, Matrix4, OrthographicCamera } from "three";
import type { WorldGeometry } from "./mapGeometry";
import { baseWorldZoom } from "./worldCameraMath";
import {
  fitWorldShadow,
  GLOBAL_SHADOW_BOUNDS,
  shadowDetailActivity,
  WORLD_SUN_POSITION,
  type WorldShadowBounds,
} from "./worldShadowMath";

export default function WorldSun({ world }: { world: WorldGeometry }) {
  const { camera, gl, size, invalidate } = useThree();
  const sun = useRef<DirectionalLight>(null);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fitted = useRef(false);
  const initialized = useRef(false);
  const detail = useRef({ visible: false, dirty: false });
  const view = useRef(new Matrix4());
  const projection = useRef(new Matrix4());
  const cancelFit = () => {
    if (pending.current !== null) clearTimeout(pending.current);
    pending.current = null;
  };
  const applyBounds = (bounds: WorldShadowBounds, local: boolean) => {
    const shadow = sun.current?.shadow.camera;
    if (!shadow) return;
    Object.assign(shadow, bounds);
    shadow.updateProjectionMatrix();
    fitted.current = local;
    gl.shadowMap.needsUpdate = true;
    if (import.meta.env.DEV) {
      const dataset = gl.domElement.dataset;
      dataset.shadowMode = local ? "local" : "global";
      dataset.shadowWidth = String(bounds.right - bounds.left);
      dataset.shadowHeight = String(bounds.top - bounds.bottom);
    }
  };
  useEffect(() => {
    initialized.current = false;
    detail.current = { visible: false, dirty: false };
    cancelFit();
    applyBounds(GLOBAL_SHADOW_BOUNDS, false);
    invalidate();
    return cancelFit;
  }, [world, camera, gl, invalidate]);
  useFrame(() => {
    const cam = camera as OrthographicCamera;
    cam.updateMatrixWorld();
    if (
      initialized.current &&
      view.current.equals(cam.matrixWorld) &&
      projection.current.equals(cam.projectionMatrix)
    )
      return;
    initialized.current = true;
    view.current.copy(cam.matrixWorld);
    projection.current.copy(cam.projectionMatrix);
    cancelFit();
    const ratio = cam.zoom / baseWorldZoom(world.bounds, size);
    detail.current = shadowDetailActivity(detail.current, ratio);
    // Cover the whole world while navigating. This rebakes once when a gesture
    // starts, preventing a cached local map from leaving newly visible land bare.
    if (fitted.current) applyBounds(GLOBAL_SHADOW_BOUNDS, false);
    if (ratio <= 2.5 && !detail.current.dirty) return;
    pending.current = setTimeout(() => {
      pending.current = null;
      const bounds =
        ratio > 2.5 ? fitWorldShadow(cam, world.bounds.max.y + 4) : null;
      applyBounds(bounds ?? GLOBAL_SHADOW_BOUNDS, bounds !== null);
      // Keep this dirty across the whole gesture, including its final overview
      // frames, so vanished local casters cannot leave ghosts in the cached map.
      detail.current.dirty = false;
      invalidate();
    }, 150);
  });
  return (
    <directionalLight
      ref={sun}
      position={WORLD_SUN_POSITION}
      intensity={1.1}
      castShadow
      shadow-mapSize={[1024, 1024]}
      shadow-bias={-0.0005}
      shadow-camera-left={GLOBAL_SHADOW_BOUNDS.left}
      shadow-camera-right={GLOBAL_SHADOW_BOUNDS.right}
      shadow-camera-top={GLOBAL_SHADOW_BOUNDS.top}
      shadow-camera-bottom={GLOBAL_SHADOW_BOUNDS.bottom}
      shadow-camera-far={160}
    />
  );
}
