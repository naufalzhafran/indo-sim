import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  CanvasTexture,
  Color,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  OrthographicCamera,
  Sprite,
  SRGBColorSpace,
} from "three";
import type { WorldGeometry } from "./mapGeometry";
import {
  getQuarterPlayback,
  type PlaybackFocus,
  type QuarterVisualTransition,
} from "./quarterVisual";

const tones = {
  positive: "#247c5e",
  negative: "#d65d46",
  neutral: "#947328",
};

function badgeTexture(badge: string, direction: PlaybackFocus["direction"]) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d")!;
  context.beginPath();
  context.arc(64, 64, 55, 0, Math.PI * 2);
  context.fillStyle = "#fffaf0";
  context.fill();
  context.lineWidth = 9;
  context.strokeStyle = tones[direction];
  context.stroke();
  context.fillStyle = badge === "steady" ? tones.neutral : tones[direction];
  if (badge === "up" || badge === "down") {
    // Regional verdicts read as a simple arrow rather than a number.
    const tip = badge === "up" ? 34 : 94,
      base = badge === "up" ? 86 : 42;
    context.beginPath();
    context.moveTo(64, tip);
    context.lineTo(96, base);
    context.lineTo(32, base);
    context.closePath();
    context.fill();
  } else if (badge === "steady") {
    context.beginPath();
    context.roundRect(34, 54, 60, 20, 10);
    context.fill();
  } else {
    context.fillStyle = "#244d49";
    context.font = "900 72px Nunito, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(badge, 64, 68);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** One landmark ties the current debrief card to its place on the map. */
export function QuarterSceneEffects({
  transition,
  startedAt,
  world,
  onSelect,
}: {
  transition: QuarterVisualTransition;
  startedAt: number;
  world: WorldGeometry;
  onSelect: (province: string) => void;
}) {
  const camera = useThree((state) => state.camera) as OrthographicCamera;
  const marker = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const badge = useRef<Sprite>(null);
  const pennant = useRef<Group>(null);
  const burst = useRef<InstancedMesh>(null);
  const activeProvince = useRef<string | null>(null);
  const textures = useMemo(() => new Map<string, CanvasTexture>(), []);
  const texture = (focus: PlaybackFocus) => {
    const key = `${focus.badge}-${focus.direction}`;
    if (!textures.has(key))
      textures.set(key, badgeTexture(focus.badge, focus.direction));
    return textures.get(key)!;
  };
  const anchors = useMemo(
    () =>
      new Map(
        world.provinces.map((province) => [province.id, province.anchor]),
      ),
    [world],
  );
  const transform = useMemo(() => new Object3D(), []);
  const tone = useMemo(() => new Color(), []);
  useEffect(
    () => () => {
      textures.forEach((texture) => texture.dispose());
      textures.clear();
    },
    [textures],
  );

  useFrame(() => {
    if (
      !marker.current ||
      !ring.current ||
      !badge.current ||
      !burst.current ||
      !pennant.current
    )
      return;
    const playback = getQuarterPlayback(
      startedAt ? performance.now() - startedAt : 0,
      transition,
    );
    const focus = playback.focus;
    const anchor = focus && anchors.get(focus.province);
    marker.current.visible = !!anchor && !!startedAt;
    if (!marker.current.visible || !anchor || !focus) return;
    activeProvince.current = focus.province;
    marker.current.position.copy(anchor);

    const phase = playback.stepPhase;
    const quick = focus.wholeRegion;
    const enter = Math.min(1, phase / (quick ? 0.25 : 0.18));
    const leave = Math.min(1, (1 - phase) / (quick ? 0.2 : 0.16));
    const emphasis = Math.min(enter, leave);
    const rise = 1 - Math.pow(1 - enter, 3);
    tone.set(tones[focus.direction]);
    const material = ring.current.material as MeshBasicMaterial;
    material.color.copy(tone);
    material.opacity = emphasis * 0.85;
    ring.current.scale.setScalar((quick ? 1.15 : 0.85) + rise * 0.22);
    badge.current.position.y = 3.4 + rise * 0.65;
    const badgeSize = Math.max(3.15, 30 / camera.zoom);
    badge.current.scale.set(badgeSize, badgeSize, 1);
    badge.current.material.map = texture(focus);
    badge.current.material.opacity = emphasis;

    const celebration = Math.max(0, (phase - 0.52) / 0.42);
    pennant.current.visible = focus.celebrate && phase > 0.52;
    pennant.current.scale.y = Math.min(1, celebration * 4);
    burst.current.visible = focus.celebrate && phase > 0.52 && phase < 0.94;
    if (burst.current.visible) {
      const flight = Math.min(1, celebration);
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const radius = 0.6 + flight * 2.5;
        transform.position.set(
          Math.cos(angle) * radius,
          1.2 + Math.sin(flight * Math.PI) * 1.8,
          Math.sin(angle) * radius,
        );
        transform.rotation.set(angle + flight * 2, flight * 3, angle);
        transform.scale.setScalar(Math.max(0, 1 - flight));
        transform.updateMatrix();
        burst.current.setMatrixAt(i, transform.matrix);
      }
      burst.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group
      ref={marker}
      visible={false}
      onClick={(event) => {
        if (
          !marker.current?.visible ||
          !activeProvince.current ||
          event.delta > 4
        )
          return;
        event.stopPropagation();
        onSelect(activeProvince.current);
      }}
    >
      <mesh
        ref={ring}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.12, 0]}
        renderOrder={2}
      >
        <ringGeometry args={[1.6, 1.85, 32]} />
        <meshBasicMaterial transparent depthWrite={false} depthTest={false} />
      </mesh>
      <sprite ref={badge} scale={[3.15, 3.15, 1]} renderOrder={4}>
        <spriteMaterial
          transparent
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
      <group ref={pennant} position={[1.1, 0.2, 0]}>
        <mesh position={[0, 1.3, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 2.6, 4]} />
          <meshBasicMaterial color="#244d49" />
        </mesh>
        <mesh
          position={[0.65, 2.2, 0]}
          rotation={[0, 0, -Math.PI / 2]}
          scale={[0.75, 1.1, 0.07]}
        >
          <coneGeometry args={[0.65, 1.2, 3]} />
          <meshBasicMaterial color="#f5ca5e" />
        </mesh>
      </group>
      <instancedMesh
        ref={burst}
        args={[undefined, undefined, 6]}
        frustumCulled={false}
      >
        <boxGeometry args={[0.23, 0.13, 0.35]} />
        <meshBasicMaterial color="#f5ca5e" />
      </instancedMesh>
    </group>
  );
}
