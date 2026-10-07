import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  BufferGeometry,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  Float32BufferAttribute,
  Frustum,
  InstancedMesh,
  Matrix4,
  Object3D,
  OrthographicCamera,
  Vector2,
  Vector3,
} from "three";
import type { WorldGeometry } from "./mapGeometry";
import {
  buildRoadNetwork,
  roadClassKey,
  roadRuns,
  type Road,
  type RoadClass,
} from "./roadNetwork";
import {
  buildTrafficPlan,
  MAX_VEHICLES,
  ROAD_HALF_WIDTH as HALF_WIDTH,
  sampleTrafficVehicle,
} from "./roadTraffic";
import { baseWorldZoom } from "./worldCameraMath";
import type { Province } from "./worldTypes";

const ROAD_LIFT = 0.03;
const LINE_LIFT = 0.04;
const ROAD_COLOR: Record<RoadClass, string> = {
  track: "#d9c08a",
  national: "#8d9b97",
  toll: "#62736f",
};
const VEHICLE_COLORS = ["#eb7057", "#fffaf0", "#247c5e", "#f2b84b", "#4d9fb5"];

type Strip = { positions: number[] };
/** A flat ribbon draped over the road's ground points. */
function addRibbon(
  strip: Strip,
  road: Road,
  from: number,
  to: number,
  half: number,
  lateral: number,
  lift: number,
) {
  const sides: number[][] = [];
  for (let i = from; i <= to; i++) {
    const a = road.points[Math.max(0, i - 1)],
      b = road.points[Math.min(road.points.length - 1, i + 1)];
    const dx = b.x - a.x,
      dz = b.z - a.z,
      length = Math.hypot(dx, dz) || 1;
    const nx = -dz / length,
      nz = dx / length,
      p = road.points[i];
    sides.push([
      p.x + nx * (lateral + half),
      p.y + lift,
      p.z + nz * (lateral + half),
      p.x + nx * (lateral - half),
      p.y + lift,
      p.z + nz * (lateral - half),
    ]);
  }
  for (let i = 0; i < sides.length - 1; i++) {
    const [lx0, ly0, lz0, rx0, ry0, rz0] = sides[i],
      [lx1, ly1, lz1, rx1, ry1, rz1] = sides[i + 1];
    strip.positions.push(
      lx0,
      ly0,
      lz0,
      rx0,
      ry0,
      rz0,
      lx1,
      ly1,
      lz1,
      rx0,
      ry0,
      rz0,
      rx1,
      ry1,
      rz1,
      lx1,
      ly1,
      lz1,
    );
  }
}
function stripGeometry(strip: Strip) {
  if (!strip.positions.length) return null;
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(strip.positions, 3),
  );
  // Ribbons are wound either way round; face every triangle upwards.
  const normals = new Float32Array(strip.positions.length);
  for (let i = 1; i < normals.length; i += 3) normals[i] = 1;
  geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  return geometry;
}

const hash = (a: number, b: number) =>
  (Math.sin(a * 127.1 + b * 311.7) * 43758.5453) % 1;
const unit = (a: number, b: number) => Math.abs(hash(a, b));

export default function RoadNetwork({
  world,
  provinces,
  reducedMotion,
}: {
  world: WorldGeometry;
  provinces: Province[];
  reducedMotion: boolean;
}) {
  const { camera, invalidate, size } = useThree();
  const network = useMemo(() => buildRoadNetwork(world), [world]);
  // Rebuild only when a province changes road class, not on every stat tick.
  const infraKey = roadClassKey(provinces);
  const infraOf = useMemo(() => {
    const byId = new Map(provinces.map((p) => [p.id, p.infrastructure]));
    return (id: string) => byId.get(id) ?? 40;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [infraKey]);
  const runs = useMemo(
    () =>
      network.roads.map((road) => ({ road, runs: roadRuns(road, infraOf) })),
    [network, infraOf],
  );
  const geometry = useMemo(() => {
    const body: Record<RoadClass, Strip> = {
      track: { positions: [] },
      national: { positions: [] },
      toll: { positions: [] },
    };
    const lines: Strip = { positions: [] };
    const median: Strip = { positions: [] };
    for (const { road, runs: list } of runs)
      for (const run of list) {
        const half = HALF_WIDTH[run.roadClass];
        addRibbon(
          body[run.roadClass],
          road,
          run.from,
          run.to,
          half,
          0,
          ROAD_LIFT,
        );
        if (run.roadClass === "national")
          addRibbon(lines, road, run.from, run.to, 0.008, 0, LINE_LIFT);
        if (run.roadClass === "toll") {
          addRibbon(
            lines,
            road,
            run.from,
            run.to,
            0.009,
            half - 0.015,
            LINE_LIFT,
          );
          addRibbon(
            lines,
            road,
            run.from,
            run.to,
            0.009,
            -half + 0.015,
            LINE_LIFT,
          );
          addRibbon(median, road, run.from, run.to, 0.015, 0, LINE_LIFT);
        }
      }
    return {
      track: stripGeometry(body.track),
      national: stripGeometry(body.national),
      toll: stripGeometry(body.toll),
      lines: stripGeometry(lines),
      median: stripGeometry(median),
    };
  }, [runs]);
  useEffect(
    () => () => {
      for (const g of Object.values(geometry)) g?.dispose();
    },
    [geometry],
  );
  useEffect(() => invalidate(), [geometry, invalidate]);

  // Cities: little clusters of towers, bigger for the larger cities.
  const cityMesh = useRef<InstancedMesh>(null);
  const buildings = useMemo(() => {
    const palette = ["#fffaf0", "#cfe9e0", "#f5c9a8", "#9fcfc4", "#ffe2a3"];
    return network.cities.flatMap((city) =>
      city.towers.map((tower) => {
        let ground = -Infinity;
        for (const [dx, dz] of [
          [0, 0],
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ])
          ground = Math.max(
            ground,
            world.surfaceHeight(
              new Vector2(
                tower.x + dx * tower.w * 0.5,
                -(tower.z + dz * tower.w * 0.5),
              ),
            ),
          );
        return {
          x: tower.x,
          z: tower.z,
          y: Math.max(0.03, ground) + 0.004,
          w: tower.w,
          h: tower.h,
          color: palette[Math.floor(tower.seed * palette.length)],
        };
      }),
    );
  }, [network, world]);
  useLayoutEffect(() => {
    const mesh = cityMesh.current;
    if (!mesh) return;
    const transform = new Object3D(),
      color = new Color();
    buildings.forEach((b, i) => {
      transform.position.set(b.x, b.y + b.h / 2, b.z);
      transform.rotation.set(0, unit(i, 2) * Math.PI, 0);
      transform.scale.set(b.w, b.h, b.w);
      transform.updateMatrix();
      mesh.setMatrixAt(i, transform.matrix);
      mesh.setColorAt(i, color.set(b.color));
    });
    mesh.count = buildings.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    invalidate();
  }, [buildings, invalidate]);

  // Vehicles: busier, faster traffic on better roads.
  const carMesh = useRef<InstancedMesh>(null);
  const carTransform = useMemo(() => new Object3D(), []);
  const traffic = useMemo(() => buildTrafficPlan(runs), [runs]);
  const animationTime = useRef(0);
  const trafficFrame = useMemo(
    () => ({
      frustum: new Frustum(),
      viewProjection: new Matrix4(),
      previousView: new Matrix4(),
      position: new Vector3(),
      color: new Color(),
      visible: new Uint8Array(traffic.groups.length),
      slots: new Int32Array(MAX_VEHICLES).fill(-1),
      time: Number.NaN,
    }),
    [traffic],
  );
  const place = (time: number) => {
    const mesh = carMesh.current;
    if (!mesh) return;
    const frame = trafficFrame;
    camera.updateMatrixWorld();
    frame.viewProjection.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    const viewChanged =
      Number.isNaN(frame.time) ||
      !frame.viewProjection.equals(frame.previousView);
    if (!viewChanged && frame.time === time) return;
    if (viewChanged) {
      frame.previousView.copy(frame.viewProjection);
      frame.frustum.setFromProjectionMatrix(frame.viewProjection);
      for (const plane of frame.frustum.planes) plane.constant += 0.2;
      traffic.groups.forEach((group, i) => {
        frame.visible[i] = Number(frame.frustum.intersectsBox(group.bounds));
      });
    }
    frame.time = time;
    const zoomRatio =
      (camera as OrthographicCamera).zoom / baseWorldZoom(world.bounds, size);
    const localScale = Math.min(1, Math.max(0, (zoomRatio - 4) / 2));
    const transform = carTransform;
    let count = 0,
      colorsChanged = false;
    for (let i = 0; i < traffic.vehicles.length && count < MAX_VEHICLES; i++) {
      const vehicle = traffic.vehicles[i];
      if (vehicle.local && localScale === 0) break;
      if (!frame.visible[vehicle.group]) continue;
      const group = traffic.groups[vehicle.group];
      const heading = sampleTrafficVehicle(
        vehicle,
        group,
        time,
        frame.position,
      );
      if (!frame.frustum.containsPoint(frame.position)) continue;
      transform.position.copy(frame.position);
      transform.rotation.set(0, heading, 0);
      const roadClass = group.run.roadClass;
      const vehicleSize =
        (roadClass === "toll" ? 1.15 : roadClass === "track" ? 0.8 : 1) *
        (vehicle.local ? localScale : 1);
      transform.scale.setScalar(vehicleSize);
      transform.updateMatrix();
      mesh.setMatrixAt(count, transform.matrix);
      if (frame.slots[count] !== i) {
        mesh.setColorAt(count, frame.color.set(VEHICLE_COLORS[vehicle.color]));
        frame.slots[count] = i;
        colorsChanged = true;
      }
      count++;
    }
    mesh.count = count;
    if (count) mesh.instanceMatrix.needsUpdate = true;
    if (colorsChanged && mesh.instanceColor)
      mesh.instanceColor.needsUpdate = true;
  };
  useLayoutEffect(() => {
    const mesh = carMesh.current;
    if (!mesh) return;
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    place(animationTime.current);
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traffic, invalidate]);
  useFrame(({ clock }) => {
    if (!reducedMotion) animationTime.current = clock.elapsedTime;
    place(animationTime.current);
  });

  return (
    <group>
      {(["track", "national", "toll"] as const).map(
        (kind) =>
          geometry[kind] && (
            <mesh key={kind} geometry={geometry[kind]!} renderOrder={2}>
              <meshLambertMaterial
                color={ROAD_COLOR[kind]}
                side={DoubleSide}
                polygonOffset
                polygonOffsetFactor={-2}
                polygonOffsetUnits={-2}
              />
            </mesh>
          ),
      )}
      {geometry.lines && (
        <mesh geometry={geometry.lines} renderOrder={3}>
          <meshBasicMaterial
            color="#fff3d0"
            side={DoubleSide}
            polygonOffset
            polygonOffsetFactor={-4}
            polygonOffsetUnits={-4}
          />
        </mesh>
      )}
      {geometry.median && (
        <mesh geometry={geometry.median} renderOrder={3}>
          <meshBasicMaterial
            color="#3e504d"
            side={DoubleSide}
            polygonOffset
            polygonOffsetFactor={-4}
            polygonOffsetUnits={-4}
          />
        </mesh>
      )}
      <instancedMesh
        key={`city-${buildings.length}`}
        ref={cityMesh}
        args={[undefined, undefined, buildings.length]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshLambertMaterial flatShading />
      </instancedMesh>
      <instancedMesh
        key={`cars-${traffic.vehicles.length}`}
        ref={carMesh}
        args={[undefined, undefined, MAX_VEHICLES]}
        frustumCulled={false}
      >
        <boxGeometry args={[0.16, 0.06, 0.08]} />
        <meshLambertMaterial flatShading />
      </instancedMesh>
    </group>
  );
}
