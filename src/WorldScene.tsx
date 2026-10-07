import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  Canvas,
  useFrame,
  useThree,
  type ThreeEvent,
} from "@react-three/fiber";
import {
  Box3,
  CanvasTexture,
  Color,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  Mesh,
  Object3D,
  SRGBColorSpace,
  Shape,
  Vector2,
  Vector3,
} from "three";
import {
  neighbourGeometry,
  SEA_LEVEL,
  type Scenery,
  type WorldGeometry,
} from "./mapGeometry";
import {
  foodRoutes,
  layerColor,
  regionLayerConfig,
  regionLayerValue,
  type Overlay,
} from "./mapLayers";
import type { RegionData } from "./mapData";
import type { Crisis, Project, Province } from "./worldTypes";
import {
  regionById,
  regionForProvince,
  summarizeRegions,
} from "./engine/gameRegions";
import {
  calloutPhase,
  getQuarterPlayback,
  type QuarterVisualTransition,
} from "./quarterVisual";
import { QuarterSceneEffects } from "./QuarterSceneEffects";
import PolicyStructures from "./PolicyStructures";
import RoadScene from "./RoadScene";
import { buildRoadNetwork, onRoadOrCity } from "./roadNetwork";
import { layoutStructures, type PolicyStructureInput } from "./structureLayout";
import { AmbientAnimationDriver } from "./ambientAnimation";
import WorldCamera, { type CameraAction } from "./WorldCamera";
import LocalSceneryScene from "./LocalSceneryScene";
import WorldSun from "./WorldSun";

export type { CameraAction } from "./WorldCamera";
export type WorldSceneProps = {
  world: WorldGeometry;
  /** Neighbouring countries, drawn as flat background land once loaded. */
  neighbours: RegionData | null;
  provinces: Province[];
  projects: Project[];
  crises: Crisis[];
  /** Funded policies, drawn as small buildings and ships on the islands. */
  structures: PolicyStructureInput[];
  selected: string;
  layer: Overlay;
  onSelect: (id: string) => void;
  /** Click on open water or empty land, not a drag. */
  onDismiss?: () => void;
  /** Click on a crisis marker; x/y are canvas pixels. */
  onMarker?: (crisisId: string, x: number, y: number) => void;
  /** Crisis whose event card follows its marker; the card element is positioned every frame. */
  card?: { id: string; el: { current: HTMLDivElement | null } };
  transition: QuarterVisualTransition | null;
  startedAt: number;
  cameraAction: CameraAction;
  /** Canvas pixels covered on the left by an open panel about the selected region. */
  inset: number;
  reducedMotion: boolean;
  onInteraction: () => void;
  onFailure: () => void;
  onReady: () => void;
};
function Construction({
  project,
  anchor,
  previous,
  startedAt,
  transition,
  onSelect,
}: {
  project: Project;
  anchor: Vector3;
  previous: Project | null;
  startedAt: number;
  transition: QuarterVisualTransition | null;
  onSelect: () => void;
}) {
  const structure = useRef<Group>(null);
  const crane = useRef<Mesh>(null);
  const colorFor = (item: Project | null) =>
    item?.completed ? "#4b9870" : item?.paused ? "#9a9579" : "#e98053";
  const colors = useMemo(
    () => ({
      before: new Color(colorFor(previous)),
      after: new Color(colorFor(project)),
      current: new Color(),
    }),
    [previous, project],
  );
  const step =
    transition?.callouts.findIndex(
      (callout) => callout.projectId === project.id,
    ) ?? -1;
  useFrame(() => {
    if (!structure.current) return;
    const t = eventProgress(transition, startedAt, step);
    const from = previous?.progress ?? 0;
    const progress = from + (project.progress - from) * t;
    structure.current.scale.y = Math.max(0.08, progress / 100);
    colors.current.copy(colors.before).lerp(colors.after, t);
    for (const child of structure.current.children) {
      if (child instanceof Mesh && "color" in child.material)
        (child.material.color as Color).copy(colors.current);
    }
    if (crane.current) crane.current.scale.y = project.completed ? 1 - t : 1;
  });
  const color = colorFor(project);
  return (
    <group
      position={anchor}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[2.7, 0.2, 1.5]} />
        <meshLambertMaterial color="#fff1c5" />
      </mesh>
      <group
        ref={structure}
        scale={[1, Math.max(0.08, project.progress / 100), 1]}
      >
        <mesh position={[-0.8, 0.8, 0]}>
          <boxGeometry args={[0.25, 1.6, 0.65]} />
          <meshLambertMaterial color={color} />
        </mesh>
        <mesh position={[0.8, 0.8, 0]}>
          <boxGeometry args={[0.25, 1.6, 0.65]} />
          <meshLambertMaterial color={color} />
        </mesh>
        <mesh position={[0, 1.65, 0]}>
          <boxGeometry args={[2.7, 0.25, 0.85]} />
          <meshLambertMaterial color={color} />
        </mesh>
      </group>
      {(!project.completed || (transition && !previous?.completed)) && (
        <mesh ref={crane} position={[1.5, 1.6, 0]}>
          <boxGeometry args={[0.12, 3, 0.12]} />
          <meshLambertMaterial color={project.paused ? "#9a9579" : "#f4bd4e"} />
        </mesh>
      )}
    </group>
  );
}

function eventProgress(
  transition: QuarterVisualTransition | null,
  startedAt: number,
  step: number,
) {
  if (!transition) return 1;
  return calloutPhase(
    startedAt ? performance.now() - startedAt : 0,
    transition,
    step,
  );
}

function CrisisMarker({
  crisis,
  previous,
  anchor,
  index,
  transition,
  startedAt,
  onSelect,
}: {
  crisis: Crisis;
  previous: Crisis | null;
  anchor: Vector3;
  index: number;
  transition: QuarterVisualTransition | null;
  startedAt: number;
  onSelect: (event: ThreeEvent<MouseEvent>) => void;
}) {
  const pin = useRef<Group>(null);
  const marker = useRef<Mesh>(null);
  const stem = useRef<Mesh>(null);
  const colorFor = (item: Crisis) =>
    item.resolved || item.stage === "recovery"
      ? "#3c946a"
      : item.stage === "warning"
        ? "#eeae37"
        : "#e46847";
  const colors = useMemo(
    () => ({
      before: new Color(colorFor(previous ?? crisis)),
      after: new Color(colorFor(crisis)),
    }),
    [previous, crisis],
  );
  const step =
    transition?.callouts.findIndex(
      (callout) => callout.crisisId === crisis.id,
    ) ?? -1;
  useFrame(() => {
    if (!pin.current || !marker.current || !stem.current) return;
    const t = eventProgress(transition, startedAt, step);
    const appearance = crisis.resolved
      ? 1 - t
      : previous || !transition
        ? 1
        : t;
    const severityBefore = previous?.severity ?? crisis.severity;
    const severity = severityBefore + (crisis.severity - severityBefore) * t;
    const scale =
      appearance * (0.75 + Math.min(10, Math.max(0, severity)) * 0.05);
    pin.current.visible = scale > 0.01;
    pin.current.scale.setScalar(scale);
    for (const mesh of [marker.current, stem.current])
      if ("color" in mesh.material)
        (mesh.material.color as Color)
          .copy(colors.before)
          .lerp(colors.after, t);
  });
  return (
    <group
      ref={pin}
      position={[anchor.x, anchor.y, anchor.z]}
      onClick={onSelect}
    >
      <mesh ref={stem} position={[0, 1.2 + (index % 3) * 0.4, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 2.4 + (index % 3) * 0.8, 6]} />
        <meshLambertMaterial color={colorFor(crisis)} />
      </mesh>
      <mesh ref={marker} position={[0, 2.8 + (index % 3) * 0.8, 0]}>
        <octahedronGeometry args={[0.65]} />
        <meshLambertMaterial color={colorFor(crisis)} />
      </mesh>
    </group>
  );
}
function SceneryInstances({
  items,
  offset = [0, 0, 0],
  scale = [1, 1, 1],
  rotation = 0,
  color,
  onSelect,
  children,
}: {
  items: Scenery[];
  offset?: [number, number, number];
  scale?: [number, number, number];
  rotation?: number;
  color: string;
  onSelect: (id: string) => void;
  children: ReactNode;
}) {
  const mesh = useRef<InstancedMesh>(null);
  const offsetKey = offset.join(","),
    scaleKey = scale.join(",");
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const transform = new Object3D();
    items.forEach((item, index) => {
      const [x, y, z] = offset;
      const cos = Math.cos(item.rotation),
        sin = Math.sin(item.rotation);
      transform.position.set(
        item.position.x + (x * cos + z * sin) * item.scale,
        item.position.y + y * item.scale,
        item.position.z + (z * cos - x * sin) * item.scale,
      );
      transform.rotation.set(0, item.rotation + rotation, 0);
      transform.scale.set(
        ...(scale.map((value) => value * item.scale) as [
          number,
          number,
          number,
        ]),
      );
      transform.updateMatrix();
      mesh.current!.setMatrixAt(index, transform.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [items, offsetKey, scaleKey, rotation]);
  if (!items.length) return null;
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, items.length]}
      castShadow
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        if (e.delta <= 4 && e.instanceId !== undefined)
          onSelect(items[e.instanceId].province);
      }}
    >
      {children}
      <meshLambertMaterial color={color} flatShading />
    </instancedMesh>
  );
}
function IslandScenery({
  world,
  cleared,
  onSelect,
}: {
  world: WorldGeometry;
  /** Building sites, where trees and houses make room. */
  cleared: Vector3[];
  onSelect: (id: string) => void;
}) {
  const { trees, houses } = useMemo(() => {
    const network = buildRoadNetwork(world);
    const free = (item: Scenery) =>
      !onRoadOrCity(network, item.position.x, item.position.z, 0.22, 1.1) &&
      !cleared.some(
        (site) =>
          Math.abs(site.x - item.position.x) < 0.8 &&
          Math.abs(site.z - item.position.z) < 0.8,
      );
    return {
      trees: world.provinces.flatMap((p) => p.scenery.trees).filter(free),
      houses: world.provinces.flatMap((p) => p.scenery.houses).filter(free),
    };
  }, [world, cleared]);
  return (
    <>
      <SceneryInstances
        items={trees}
        offset={[0, 0.42, 0]}
        color="#986d3b"
        onSelect={onSelect}
      >
        <cylinderGeometry args={[0.09, 0.13, 0.85, 5]} />
      </SceneryInstances>
      <SceneryInstances
        items={trees}
        offset={[0, 1.02, 0]}
        scale={[0.72, 1, 0.72]}
        color="#438b54"
        onSelect={onSelect}
      >
        <icosahedronGeometry args={[0.7, 0]} />
      </SceneryInstances>
      <SceneryInstances
        items={trees}
        offset={[0.11, 1.33, 0.04]}
        scale={[0.65, 0.85, 0.65]}
        color="#6bb65a"
        onSelect={onSelect}
      >
        <icosahedronGeometry args={[0.62, 0]} />
      </SceneryInstances>
      <SceneryInstances
        items={houses}
        offset={[0, 0.32, 0]}
        color="#fff5d7"
        onSelect={onSelect}
      >
        <boxGeometry args={[0.72, 0.65, 0.65]} />
      </SceneryInstances>
      <SceneryInstances
        items={houses}
        offset={[0, 0.78, 0]}
        rotation={Math.PI / 4}
        color="#e17c51"
        onSelect={onSelect}
      >
        <coneGeometry args={[0.68, 0.5, 4]} />
      </SceneryInstances>
      <SceneryInstances
        items={houses}
        offset={[0, 0.23, 0.332]}
        color="#677a61"
        onSelect={onSelect}
      >
        <planeGeometry args={[0.2, 0.43]} />
      </SceneryInstances>
    </>
  );
}
/** A soft sunlit band in the shallow water around each island of the selected region. */
function ShorelineGlow({
  provinces,
}: {
  provinces: WorldGeometry["provinces"];
}) {
  const glow = useMemo(() => {
    if (!provinces.length) return null;
    const band = 0.26,
      blur = 0.5,
      margin = band + blur * 2;
    const bounds = provinces.reduce(
      (box, p) => box.union(p.bounds),
      new Box3(),
    );
    const minX = bounds.min.x - margin,
      minZ = bounds.min.z - margin,
      width = bounds.max.x + margin - minX,
      depth = bounds.max.z + margin - minZ,
      scale = Math.min(64, 1024 / Math.max(width, depth));
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(depth * scale);
    const context = canvas.getContext("2d");
    if (!context) return null;
    const path = new Path2D();
    for (const ring of provinces.flatMap((p) => p.rings)) {
      ring.forEach((point, i) =>
        path[i ? "lineTo" : "moveTo"](
          (point.x - minX) * scale,
          (-point.y - minZ) * scale,
        ),
      );
      path.closePath();
    }
    // The land covers the filled interior, leaving only the shoreline glow.
    context.lineJoin = "round";
    context.fillStyle = context.strokeStyle = context.shadowColor = "#fff4c4";
    context.lineWidth = band * 2 * scale;
    context.shadowBlur = blur * scale;
    context.stroke(path);
    context.fill(path);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return {
      texture,
      width,
      depth,
      x: minX + width / 2,
      z: minZ + depth / 2,
    };
  }, [provinces]);
  useEffect(() => () => glow?.texture.dispose(), [glow]);
  if (!glow) return null;
  return (
    <mesh
      position={[glow.x, SEA_LEVEL - 0.02, glow.z]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[glow.width, glow.depth]} />
      <meshBasicMaterial
        map={glow.texture}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
function boatHull(length: number, width: number, depth: number) {
  const back = -length * 0.5,
    half = width * 0.5;
  const outline = new Shape()
    .moveTo(back, -half * 0.85)
    .lineTo(length * 0.15, -half)
    .quadraticCurveTo(length * 0.38, -half * 0.8, length * 0.55, 0)
    .quadraticCurveTo(length * 0.38, half * 0.8, length * 0.15, half)
    .lineTo(back, half * 0.85)
    .closePath();
  const geometry = new ExtrudeGeometry(outline, {
    depth,
    bevelEnabled: false,
    curveSegments: 3,
  });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}
const SHIP_HULL = boatHull(2.4, 0.8, 0.22);
const SHIP_DECK = boatHull(2.3, 0.7, 0.2);
/** A decorative ship that cruises a slow circle in open water. */
function Ship({
  center,
  radius,
  speed,
  phase,
  reducedMotion,
}: {
  center: [number, number, number];
  radius: number;
  speed: number;
  phase: number;
  reducedMotion: boolean;
}) {
  const ship = useRef<Group>(null);
  useFrame(({ clock }) => {
    const group = ship.current;
    if (!group) return;
    const t = reducedMotion ? 0 : clock.elapsedTime;
    const angle = phase + t * speed;
    group.rotation.order = "YXZ";
    group.position.set(
      center[0] + Math.cos(angle) * radius,
      center[1] + Math.sin(t * 1.7 + phase) * 0.04,
      center[2] + Math.sin(angle) * radius,
    );
    group.rotation.set(
      Math.sin(t * 1.3 + phase) * 0.03,
      -angle - Math.PI / 2,
      Math.sin(t * 1.7 + phase) * 0.025,
    );
  });
  return (
    <group ref={ship} scale={0.36}>
      <mesh geometry={SHIP_HULL} position={[0, -0.06, 0]}>
        <meshLambertMaterial color="#eb7057" flatShading />
      </mesh>
      <mesh geometry={SHIP_DECK} position={[0, 0.16, 0]}>
        <meshLambertMaterial color="#fffaf0" flatShading />
      </mesh>
      <mesh position={[-0.5, 0.52, 0]}>
        <boxGeometry args={[0.8, 0.5, 0.52]} />
        <meshLambertMaterial color="#fffaf0" flatShading />
      </mesh>
      <mesh position={[-0.5, 0.8, 0]}>
        <boxGeometry args={[0.9, 0.08, 0.6]} />
        <meshLambertMaterial color="#247c5e" flatShading />
      </mesh>
      <mesh position={[-0.4, 0.58, 0]}>
        <boxGeometry args={[0.3, 0.14, 0.56]} />
        <meshLambertMaterial color="#5a7069" flatShading />
      </mesh>
      <mesh position={[-0.7, 1.0, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.34, 6]} />
        <meshLambertMaterial color="#eb7057" flatShading />
      </mesh>
      <mesh position={[0.45, 0.3, 0]}>
        <boxGeometry args={[0.5, 0.2, 0.4]} />
        <meshLambertMaterial color="#247c5e" flatShading />
      </mesh>
    </group>
  );
}
/** Plain, flat land for the neighbouring countries, beneath the playable islands. */
function NeighbourLand({
  region,
  world,
}: {
  region: RegionData;
  world: WorldGeometry;
}) {
  const geometry = useMemo(
    () => neighbourGeometry(region, world.coastlines),
    [region, world],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position={[0, SEA_LEVEL - 0.01, 0]}>
      <meshBasicMaterial color="#d3d6cc" toneMapped={false} />
    </mesh>
  );
}

function Contents(props: WorldSceneProps) {
  const {
    world,
    provinces,
    selected,
    layer,
    transition,
    startedAt,
    onSelect: selectRegion,
    onFailure,
  } = props;
  const { camera: sceneCamera, size: viewSize } = useThree();
  const cardCrisis = props.card
    ? props.crises.find((c) => c.id === props.card!.id)
    : undefined;
  const cardAnchor = cardCrisis
    ? world.provinces.find((p) => p.id === cardCrisis.province)?.anchor
    : undefined;
  const cardPoint = useMemo(() => new Vector3(), []);
  useFrame(() => {
    const el = props.card?.el.current;
    if (!el) return;
    if (!cardAnchor) {
      el.style.visibility = "hidden";
      return;
    }
    cardPoint.set(cardAnchor.x, cardAnchor.y + 4.6, cardAnchor.z);
    cardPoint.project(sceneCamera);
    const x = ((cardPoint.x + 1) / 2) * viewSize.width;
    const y = ((1 - cardPoint.y) / 2) * viewSize.height;
    const w = el.offsetWidth;
    const left = Math.max(12, Math.min(viewSize.width - w - 12, x - w / 2));
    el.style.visibility = "visible";
    el.style.transform = `translate(${left}px, ${y - 14}px) translateY(-100%)`;
    el.style.setProperty("--tail", `${x - left}px`);
  });
  const onSelect = (province: string) => {
    const region = regionForProvince(province) ?? regionById(province);
    if (region) selectRegion(region.id);
  };
  const selectedMembers = useMemo(
    () => new Set(regionById(selected)?.provinceIds ?? []),
    [selected],
  );
  const selectedProvinces = useMemo(
    () => world.provinces.filter((p) => selectedMembers.has(p.id)),
    [world, selectedMembers],
  );
  const layout = useMemo(
    () => layoutStructures(world, props.structures),
    [world, props.structures],
  );
  const { gl, invalidate, camera, size } = useThree();
  const provinceMeshes = useRef(new Map<string, Mesh>());
  const colorsDirty = useRef(true);
  const paletteUpdates = useRef(0);
  const renderedFrames = useRef(0);
  const highlightColors = useMemo(
    () => ({
      positive: new Color("#f1ffb8"),
      negative: new Color("#ffc9ac"),
      neutral: new Color("#fff0b5"),
      // The selected region sits in a little extra sunshine.
      selected: new Color().setRGB(1.1, 1.09, 1),
    }),
    [],
  );
  const colors = useMemo(() => {
    const config = regionLayerConfig(
      layer,
      provinces,
      transition?.beforeProvinces,
    );
    const previous = new Map(transition?.beforeProvinces.map((p) => [p.id, p]));
    const regions = new Map(summarizeRegions(provinces).map((r) => [r.id, r]));
    const previousRegions = new Map(
      summarizeRegions(transition?.beforeProvinces ?? provinces).map((r) => [
        r.id,
        r,
      ]),
    );
    return new Map(
      provinces.map((p) => {
        const prior = previous.get(p.id) ?? p;
        const regionId = regionForProvince(p.id)!.id;
        return [
          p.id,
          {
            before: new Color(
              layer === "landscape"
                ? "#ffffff"
                : layer === "grids"
                  ? config.fill!(prior)
                  : layerColor(
                      regionLayerValue(previousRegions.get(regionId)!, layer),
                      config,
                    ),
            ),
            after: new Color(
              layer === "landscape"
                ? "#ffffff"
                : layer === "grids"
                  ? config.fill!(p)
                  : layerColor(
                      regionLayerValue(regions.get(regionId)!, layer),
                      config,
                    ),
            ),
          },
        ];
      }),
    );
  }, [provinces, layer, transition]);
  useEffect(() => {
    // Scenery is still during quarter playback; its sun shadows only need baking once.
    gl.shadowMap.needsUpdate = true;
    invalidate();
  }, [gl, world, layer, layout, invalidate]);
  useEffect(() => {
    const lost = (e: Event) => {
      e.preventDefault();
      onFailure();
    };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl, onFailure]);
  useLayoutEffect(() => {
    colorsDirty.current = true;
    invalidate();
  }, [world, transition, startedAt, colors, selected, invalidate]);
  useFrame(() => {
    const playback = transition
      ? getQuarterPlayback(
          startedAt ? performance.now() - startedAt : 0,
          transition,
        )
      : null;
    const active = startedAt ? playback?.focus : undefined;
    if (import.meta.env.DEV) {
      gl.domElement.dataset.renderedFrames = String(++renderedFrames.current);
      gl.domElement.dataset.drawCalls = String(gl.info.render.calls);
      gl.domElement.dataset.triangles = String(gl.info.render.triangles);
      gl.domElement.dataset.activeCallout =
        active && playback ? `${playback.act}-${playback.step + 1}` : "";
      gl.domElement.dataset.activeProvince = active?.province ?? "";
      gl.domElement.dataset.selectedRegion = selected;
      gl.domElement.dataset.selectedProvinceCount = String(
        selectedMembers.size,
      );
      if (selectedProvinces.length) {
        const middle = selectedProvinces
          .reduce((box, p) => box.union(p.bounds), new Box3())
          .getCenter(new Vector3())
          .project(camera);
        gl.domElement.dataset.selectedScreenX = String(
          Math.round(((middle.x + 1) / 2) * size.width),
        );
      }
    }
    const animating = !!playback && !!startedAt && !playback.done;
    if (animating) invalidate();
    if (!colorsDirty.current && !animating) return;
    // Apply the final palette once, then leave it untouched during ambient motion.
    colorsDirty.current = animating;
    if (import.meta.env.DEV)
      gl.domElement.dataset.paletteUpdates = String(++paletteUpdates.current);
    const eased = playback ? playback.colorProgress : 1;
    for (const [id, mesh] of provinceMeshes.current) {
      const pair = colors.get(id);
      if (pair && "color" in mesh.material) {
        const color = mesh.material.color as Color;
        color.copy(pair.before).lerp(pair.after, eased);
        if (layer === "landscape" && selectedMembers.has(id))
          color.multiply(highlightColors.selected);
        if (
          layer === "landscape" &&
          active &&
          (active.wholeRegion
            ? regionForProvince(id)?.id === active.region
            : active.province === id)
        ) {
          const phase = playback!.stepPhase;
          const emphasis = Math.min(1, phase / 0.18, (1 - phase) / 0.16);
          color.lerp(highlightColors[active.direction], emphasis * 0.4);
        }
      }
    }
  });
  const routes = useMemo(
    () => (layer === "foodTrade" ? foodRoutes(provinces) : []),
    [layer, provinces],
  );
  const routeGeometry = useMemo(
    () =>
      routes
        .map((route) => {
          const from = world.provinces.find((p) => p.id === route.from)?.anchor,
            to = world.provinces.find((p) => p.id === route.to)?.anchor;
          if (!from || !to) return null;
          const positions: number[] = [];
          const steps = Math.max(24, Math.ceil(from.distanceTo(to) / 0.5));
          for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const p = from.clone().lerp(to, t);
            p.y = Math.max(
              p.y + 0.18 + Math.sin(t * Math.PI) * 3,
              world.surfaceHeight(new Vector2(p.x, -p.z)) + 0.18,
            );
            positions.push(p.x, p.y, p.z);
          }
          return {
            key: `${route.from}-${route.to}`,
            positions: new Float32Array(positions),
          };
        })
        .filter((x) => x !== null),
    [routes, world],
  );
  const click = (id: string, e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta <= 4) onSelect(id);
  };
  return (
    <>
      <AmbientAnimationDriver enabled={!props.reducedMotion} />
      <WorldCamera
        world={world}
        action={props.cameraAction}
        selected={selected}
        transition={transition}
        inset={props.inset}
        reducedMotion={props.reducedMotion}
        focus={cardAnchor ?? null}
      />
      <ambientLight intensity={0.65} />
      <hemisphereLight args={["#fff7df", "#659579", 0.6]} />
      <WorldSun world={world} />
      {/* Just below the coast, so narrow sea-level strips never lose to the water. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, SEA_LEVEL - 0.04, 0]}
        receiveShadow
      >
        <planeGeometry args={[600, 600]} />
        <meshBasicMaterial color="#79d0d8" toneMapped={false} />
      </mesh>
      {props.neighbours && (
        <NeighbourLand region={props.neighbours} world={world} />
      )}
      {world.provinces.map((p) => (
        <group key={p.id}>
          <mesh
            geometry={p.geometry}
            dispose={null}
            receiveShadow
            ref={(mesh) => {
              if (mesh) provinceMeshes.current.set(p.id, mesh);
              else provinceMeshes.current.delete(p.id);
            }}
            onClick={(e) => click(p.id, e)}
          >
            <meshLambertMaterial
              color={colors.get(p.id)?.after}
              vertexColors={layer === "landscape"}
              flatShading
              polygonOffset
              polygonOffsetFactor={0}
              polygonOffsetUnits={-1}
            />
          </mesh>
          <lineSegments geometry={p.outline} dispose={null}>
            <lineBasicMaterial
              color={selectedMembers.has(p.id) ? "#fff9d7" : "#61994e"}
              transparent
              opacity={selectedMembers.has(p.id) ? 1 : 0.32}
              linewidth={1}
            />
          </lineSegments>
        </group>
      ))}
      <ShorelineGlow provinces={selectedProvinces} />
      <mesh geometry={world.lake} dispose={null} receiveShadow>
        <meshLambertMaterial color="#86d6dc" />
      </mesh>
      {layer === "landscape" && (
        <IslandScenery
          world={world}
          cleared={layout.cleared}
          onSelect={onSelect}
        />
      )}
      {layer === "landscape" && (
        <LocalSceneryScene
          world={world}
          cleared={layout.cleared}
          onSelect={onSelect}
        />
      )}
      {layer === "landscape" && (
        <PolicyStructures
          items={layout.items}
          lanes={layout.lanes}
          onSelect={onSelect}
        />
      )}
      <RoadScene
        world={world}
        provinces={provinces}
        reducedMotion={props.reducedMotion}
      />
      <Ship
        center={[-20, SEA_LEVEL + 0.2, -23]}
        radius={3}
        speed={0.12}
        phase={0}
        reducedMotion={props.reducedMotion}
      />
      <Ship
        center={[20, SEA_LEVEL + 0.2, 20]}
        radius={3}
        speed={0.1}
        phase={2.1}
        reducedMotion={props.reducedMotion}
      />
      <Ship
        center={[35, SEA_LEVEL + 0.2, -13]}
        radius={3}
        speed={0.14}
        phase={4.2}
        reducedMotion={props.reducedMotion}
      />
      {transition && (
        <QuarterSceneEffects
          transition={transition}
          startedAt={startedAt}
          world={world}
          onSelect={onSelect}
        />
      )}
      {routeGeometry.map((route) => (
        <line key={route.key}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[route.positions, 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#327b80" />
        </line>
      ))}
      {props.crises
        .filter(
          (c) =>
            !c.resolved ||
            transition?.crises.some(
              (change) =>
                change.after.id === c.id &&
                change.before &&
                !change.before.resolved,
            ),
        )
        .map((crisis, index) => {
          const anchor = world.provinces.find(
            (p) => p.id === crisis.province,
          )?.anchor;
          if (!anchor) return null;
          return (
            <CrisisMarker
              key={crisis.id}
              crisis={crisis}
              previous={
                transition?.crises.find(
                  (change) => change.after.id === crisis.id,
                )?.before ?? null
              }
              anchor={anchor}
              index={index}
              transition={transition}
              startedAt={startedAt}
              onSelect={(e) => {
                e.stopPropagation();
                if (e.delta > 4) return;
                const rect = (
                  e.nativeEvent.target as HTMLElement
                ).getBoundingClientRect();
                props.onMarker?.(
                  crisis.id,
                  e.nativeEvent.clientX - rect.left,
                  e.nativeEvent.clientY - rect.top,
                );
              }}
            />
          );
        })}
    </>
  );
}
export default function WorldScene(props: WorldSceneProps) {
  return (
    <Canvas
      orthographic
      flat
      shadows
      camera={{ position: [0, 82, 60], near: 0.1, far: 500 }}
      dpr={[1, 1.5]}
      frameloop="demand"
      gl={{ antialias: true, powerPreference: "low-power" }}
      onPointerDown={props.onInteraction}
      onPointerMissed={() => props.onDismiss?.()}
      onWheel={props.onInteraction}
      onCreated={({ gl }) => {
        gl.domElement.setAttribute("aria-hidden", "true");
        gl.domElement.setAttribute("data-world-ready", "true");
        gl.setClearColor("#79d0d8");
        gl.shadowMap.autoUpdate = false;
        gl.shadowMap.needsUpdate = true;
        props.onReady();
      }}
    >
      <Contents {...props} />
    </Canvas>
  );
}
