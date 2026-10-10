import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Color,
  DoubleSide,
  DynamicDrawUsage,
  InstancedMesh,
  Object3D,
  OrthographicCamera,
  Vector3,
} from "three";
import { SEA_LEVEL, type WorldGeometry } from "./mapGeometry";
import { addRibbon, stripGeometry, type Strip } from "./RoadScene";
import { transportGeometry, type TransportModel } from "./transportModels";
import {
  buildTransportNetwork,
  pointAlong,
  type RailLine,
} from "./transportNetwork";
import {
  flightLeg,
  shuttle,
  TRAIN_CAR_SPACING,
  TRAIN_CARS,
  trainHead,
  type FleetPlan,
} from "./transportTraffic";
import { baseWorldZoom } from "./worldCameraMath";

const RAIL_LIFT = 0.036;
const CRUISE = 2.6;
const LOCOMOTIVE = new Color("#eb7057"),
  CARRIAGE = new Color("#fffaf0");

/** Steel lines on a gravel bed beside the roads. */
function Railways({ lines }: { lines: RailLine[] }) {
  const geometry = useMemo(() => {
    const bed: Strip = { positions: [] },
      steel: Strip = { positions: [] };
    for (const line of lines) {
      const last = line.points.length - 1;
      addRibbon(bed, line, 0, last, 0.034, 0, RAIL_LIFT);
      addRibbon(steel, line, 0, last, 0.0045, 0.016, RAIL_LIFT + 0.004);
      addRibbon(steel, line, 0, last, 0.0045, -0.016, RAIL_LIFT + 0.004);
    }
    return { bed: stripGeometry(bed), steel: stripGeometry(steel) };
  }, [lines]);
  useEffect(
    () => () => {
      geometry.bed?.dispose();
      geometry.steel?.dispose();
    },
    [geometry],
  );
  return (
    <>
      {geometry.bed && (
        <mesh geometry={geometry.bed} renderOrder={2}>
          <meshLambertMaterial
            color="#b4a48c"
            side={DoubleSide}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
          />
        </mesh>
      )}
      {geometry.steel && (
        <mesh geometry={geometry.steel} renderOrder={3}>
          <meshBasicMaterial
            color="#55625f"
            side={DoubleSide}
            polygonOffset
            polygonOffsetFactor={-4}
            polygonOffsetUnits={-4}
          />
        </mesh>
      )}
    </>
  );
}

function Fleet({
  model,
  capacity,
  meshRef,
  colored = false,
}: {
  model: TransportModel;
  capacity: number;
  meshRef: RefObject<InstancedMesh | null>;
  colored?: boolean;
}) {
  const geometry = useMemo(() => transportGeometry(model), [model]);
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.count = 0;
    if (colored)
      for (let i = 0; i < capacity; i++) mesh.setColorAt(i, CARRIAGE);
  }, [meshRef, capacity, colored]);
  if (!capacity) return null;
  return (
    <instancedMesh
      key={capacity}
      ref={meshRef}
      args={[geometry, undefined, capacity]}
      frustumCulled={false}
    >
      <meshLambertMaterial vertexColors flatShading />
    </instancedMesh>
  );
}

/** Ships, ferries, fishing boats, trains and planes moving between the islands. */
export default function TransportScene({
  world,
  fleet,
  reducedMotion,
}: {
  world: WorldGeometry;
  fleet: FleetPlan;
  reducedMotion: boolean;
}) {
  const { camera, size, invalidate } = useThree();
  const network = useMemo(() => buildTransportNetwork(world), [world]);
  const cargo = useRef<InstancedMesh>(null),
    ferries = useRef<InstancedMesh>(null),
    fishing = useRef<InstancedMesh>(null),
    trains = useRef<InstancedMesh>(null),
    planes = useRef<InstancedMesh>(null),
    runways = useRef<InstancedMesh>(null);
  const scratch = useMemo(
    () => ({
      transform: new Object3D(),
      position: new Vector3(),
      from: new Vector3(),
      to: new Vector3(),
      locomotive: new Int8Array(TRAIN_CARS * 64).fill(-1),
      time: Number.NaN,
      zoom: Number.NaN,
    }),
    [],
  );
  const animationTime = useRef(0);

  useLayoutEffect(() => {
    const mesh = runways.current;
    if (!mesh) return;
    const { transform } = scratch;
    network.airports.forEach((airport, i) => {
      transform.position.copy(airport.position);
      transform.position.y += 0.004;
      transform.rotation.set(0, -airport.heading, 0);
      transform.scale.setScalar(1);
      transform.updateMatrix();
      mesh.setMatrixAt(i, transform.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    invalidate();
  }, [network, scratch, invalidate]);

  const place = (time: number) => {
    const zoom =
      (camera as OrthographicCamera).zoom / baseWorldZoom(world.bounds, size);
    if (time === scratch.time && zoom === scratch.zoom) return;
    scratch.time = time;
    scratch.zoom = zoom;
    const { transform, position } = scratch;
    const write = (mesh: InstancedMesh, index: number) => {
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
    };

    const ships = (
      mesh: InstancedMesh | null,
      plans: FleetPlan["cargo"],
      dwell: number,
      lane: number,
      scale: number,
    ) => {
      if (!mesh) return;
      plans.forEach((plan, i) => {
        const route = network.sea[plan.route];
        // Lines sharing a harbour wait at different berths.
        const berth = lane * (1 + (plan.route % 3) * 0.35);
        const heading = shuttle(
          route,
          plan.speed,
          dwell,
          plan.phase,
          time,
          position,
          berth,
        );
        const sway = time * 1.6 + plan.phase * 9;
        transform.position.set(
          position.x,
          SEA_LEVEL + 0.01 + Math.sin(sway) * 0.008,
          position.z,
        );
        transform.rotation.set(Math.sin(sway * 0.8) * 0.04, heading, 0, "YXZ");
        transform.scale.setScalar(scale);
        write(mesh, i);
      });
      mesh.count = plans.length;
      mesh.instanceMatrix.needsUpdate = true;
    };
    ships(cargo.current, fleet.cargo, 3, 0.24, 1);
    ships(ferries.current, fleet.ferries, 3, 0.05, 0.7);

    // Fishing boats bob near the coast and only show up close.
    const near = Math.min(1, Math.max(0, (zoom - 2.5) / 1.5));
    if (fishing.current) {
      const mesh = fishing.current;
      let count = 0;
      if (near > 0)
        network.fishing.forEach((spot, i) => {
          const drift = time * 0.08 + i * 1.7;
          transform.position.set(
            spot.position.x + Math.cos(drift) * 0.25,
            SEA_LEVEL + 0.01 + Math.sin(time * 2 + i) * 0.006,
            spot.position.z + Math.sin(drift) * 0.25,
          );
          transform.rotation.set(
            Math.sin(time * 1.4 + i) * 0.06,
            -drift - Math.PI / 2,
            0,
            "YXZ",
          );
          transform.scale.setScalar(near);
          write(mesh, count++);
        });
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
    }

    if (trains.current) {
      const mesh = trains.current;
      let count = 0,
        recolored = false;
      for (const plan of fleet.trains) {
        const line = fleet.rail[plan.line];
        const { rear, forward } = trainHead(line, plan, time);
        for (let car = 0; car < TRAIN_CARS; car++) {
          const heading = pointAlong(
            line,
            rear + car * TRAIN_CAR_SPACING,
            position,
          );
          transform.position.set(
            position.x,
            position.y + RAIL_LIFT,
            position.z,
          );
          transform.rotation.set(0, heading, 0);
          transform.scale.setScalar(1);
          write(mesh, count);
          const engine = Number(car === (forward ? TRAIN_CARS - 1 : 0));
          if (scratch.locomotive[count] !== engine) {
            mesh.setColorAt(count, engine ? LOCOMOTIVE : CARRIAGE);
            scratch.locomotive[count] = engine;
            recolored = true;
          }
          count++;
        }
      }
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
      if (recolored && mesh.instanceColor)
        mesh.instanceColor.needsUpdate = true;
    }

    if (planes.current) {
      const mesh = planes.current;
      let count = 0;
      for (const flight of fleet.flights) {
        const a = network.airports[flight.from],
          b = network.airports[flight.to];
        const distance = a.position.distanceTo(b.position);
        const leg = flightLeg(distance, flight.phase, time);
        if (!leg) continue;
        const [start, end] = leg.outbound
          ? [a.position, b.position]
          : [b.position, a.position];
        const u = leg.u;
        const climb = Math.min(1, u / 0.16, (1 - u) / 0.16);
        const lift = climb * climb * (3 - 2 * climb);
        transform.position.set(
          start.x + (end.x - start.x) * u,
          start.y + (end.y - start.y) * u + 0.05 + lift * CRUISE,
          start.z + (end.z - start.z) * u,
        );
        const pitch = u < 0.16 ? 0.22 : u > 0.84 ? -0.18 : 0;
        transform.rotation.set(
          0,
          -Math.atan2(end.z - start.z, end.x - start.x),
          pitch,
          "YXZ",
        );
        transform.scale.setScalar(1);
        write(mesh, count++);
      }
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
    }
  };

  useLayoutEffect(() => {
    scratch.time = Number.NaN;
    scratch.locomotive.fill(-1);
    place(animationTime.current);
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fleet, network, invalidate]);
  useFrame(({ clock }) => {
    if (!reducedMotion) animationTime.current = clock.elapsedTime;
    place(animationTime.current);
  });

  return (
    <group>
      <Railways lines={fleet.rail} />
      <instancedMesh
        ref={runways}
        args={[transportGeometry("runway"), undefined, network.airports.length]}
        castShadow
        receiveShadow
      >
        <meshLambertMaterial vertexColors flatShading />
      </instancedMesh>
      <Fleet model="cargo" capacity={fleet.cargo.length} meshRef={cargo} />
      <Fleet model="ferry" capacity={fleet.ferries.length} meshRef={ferries} />
      <Fleet
        model="fishing"
        capacity={network.fishing.length}
        meshRef={fishing}
      />
      <Fleet
        model="train"
        capacity={fleet.trains.length * TRAIN_CARS}
        meshRef={trains}
        colored
      />
      <Fleet model="plane" capacity={fleet.flights.length} meshRef={planes} />
    </group>
  );
}
