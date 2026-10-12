import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  DoubleSide,
  DynamicDrawUsage,
  InstancedMesh,
  Object3D,
  OrthographicCamera,
  Vector3,
} from "three";
import { SEA_LEVEL, type WorldGeometry } from "./mapGeometry";
import { unsharedRanges } from "./roadNetwork";
import { addRibbon, stripGeometry, type Strip } from "./RoadScene";
import { transportGeometry, type TransportModel } from "./transportModels";
import {
  buildTransportNetwork,
  pointAlong,
  type RailLine,
} from "./transportNetwork";
import {
  flightPath,
  flightStage,
  headingAlong,
  shuttle,
  TRAIN_CAR_SPACING,
  TRAIN_CARS,
  trainHead,
  type FleetPlan,
  type Motion,
} from "./transportTraffic";
import { baseWorldZoom } from "./worldCameraMath";

const RAIL_LIFT = 0.036;
/** Planes sharing an airport park at different spots along its runway. */
const APRON = [0, 0.26, -0.26];
const smooth = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};

/** A slim ballast bed with two fine rails, laid apart from the roads. */
function Railways({ lines }: { lines: RailLine[] }) {
  const geometry = useMemo(() => {
    const bed: Strip = { positions: [] },
      steel: Strip = { positions: [] };
    // Where lines meet they share track; lay it once.
    const ranges = unsharedRanges(lines, 0.1, 3);
    lines.forEach((line, index) => {
      for (const [from, to] of ranges[index]) {
        addRibbon(bed, line, from, to, 0.026, 0, RAIL_LIFT);
        addRibbon(steel, line, from, to, 0.003, 0.0105, RAIL_LIFT + 0.004);
        addRibbon(steel, line, from, to, 0.003, -0.0105, RAIL_LIFT + 0.004);
      }
    });
    return {
      bed: stripGeometry(bed),
      steel: stripGeometry(steel),
    };
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
            color="#c4b8a0"
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
}: {
  model: TransportModel;
  capacity: number;
  meshRef: RefObject<InstancedMesh | null>;
}) {
  const geometry = useMemo(() => transportGeometry(model), [model]);
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.count = 0;
  }, [meshRef, capacity]);
  if (!capacity) return null;
  return (
    <instancedMesh
      key={capacity}
      name={model}
      ref={meshRef}
      args={[geometry, undefined, capacity]}
      frustumCulled={false}
    >
      {model === "wake" ? (
        <meshBasicMaterial
          vertexColors
          transparent
          depthWrite={false}
          side={DoubleSide}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      ) : (
        <meshLambertMaterial vertexColors flatShading />
      )}
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
    tolLaut = useRef<InstancedMesh>(null),
    ferries = useRef<InstancedMesh>(null),
    fishing = useRef<InstancedMesh>(null),
    trains = useRef<InstancedMesh>(null),
    engines = useRef<InstancedMesh>(null),
    wakes = useRef<InstancedMesh>(null),
    planes = useRef<InstancedMesh>(null),
    runways = useRef<InstancedMesh>(null);
  const scratch = useMemo(
    () => ({
      transform: new Object3D(),
      position: new Vector3(),
      from: new Vector3(),
      to: new Vector3(),
      motion: { heading: 0, pace: 0 } as Motion,
      wakes: 0,
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

    const wakeMesh = wakes.current;
    scratch.wakes = 0;
    /** Foam behind a moving hull, longer the faster it goes. */
    const wake = (
      heading: number,
      pace: number,
      length: number,
      width: number,
    ) => {
      if (!wakeMesh || pace < 0.05) return;
      transform.position.set(position.x, SEA_LEVEL + 0.004, position.z);
      transform.rotation.set(0, heading, 0);
      transform.scale.set(length * (0.35 + pace * 0.65), 1, width);
      write(wakeMesh, scratch.wakes++);
    };

    const ships = (
      mesh: InstancedMesh | null,
      plans: FleetPlan["cargo"],
      dwell: number,
      lane: number,
      scale: number,
    ) => {
      if (!mesh) return;
      const { motion } = scratch;
      plans.forEach((plan, i) => {
        const route = network.sea[plan.route];
        // Lines sharing a harbour wait at different berths.
        const berth = lane * (1 + (plan.route % 3) * 0.35);
        shuttle(
          route,
          plan.speed,
          dwell,
          plan.phase,
          time,
          position,
          berth,
          // Ease out of and into port over about two hull lengths.
          scale * 1.6,
          motion,
        );
        const { heading, pace } = motion;
        wake(heading, pace, scale, scale);
        // A gentle swell: rolling side to side and pitching bow to stern,
        // calmer while berthed.
        const sway = time * 1.6 + plan.phase * 9;
        const swell = 0.5 + pace * 0.5;
        transform.position.set(
          position.x,
          SEA_LEVEL + 0.01 + Math.sin(sway) * 0.008,
          position.z,
        );
        transform.rotation.set(
          Math.sin(sway * 0.8) * 0.04 * swell,
          heading,
          Math.sin(sway * 1.3 + 1) * 0.015 * swell,
          "YXZ",
        );
        transform.scale.setScalar(scale);
        write(mesh, i);
      });
      mesh.count = plans.length;
      mesh.instanceMatrix.needsUpdate = true;
    };
    ships(cargo.current, fleet.cargo, 3, 0.16, 1);
    ships(tolLaut.current, fleet.tolLaut, 4, 0.12, 0.9);
    ships(ferries.current, fleet.ferries, 3, 0.05, 0.7);

    // Fishing boats potter about near the coast, pausing now and then to fish,
    // and only show up close.
    const near = Math.min(1, Math.max(0, (zoom - 2.5) / 1.5));
    if (fishing.current) {
      const mesh = fishing.current;
      let count = 0;
      if (near > 0)
        network.fishing.forEach((spot, i) => {
          // Time that slows to a stop once in a while: the boat drifts while fishing.
          const w = 0.22,
            k = i * 1.7;
          const local = time - Math.sin(time * w + k) / w;
          const pace = 1 - Math.cos(time * w + k);
          const a = local * 0.07 + k,
            b = local * 0.16 + i * 2.9;
          position.set(
            spot.position.x + Math.cos(a) * 0.18 + Math.cos(b) * 0.07,
            0,
            spot.position.z + Math.sin(a) * 0.18 + Math.sin(b * 1.3) * 0.07,
          );
          // Head along the direction of travel.
          const vx = -Math.sin(a) * 0.18 * 0.07 - Math.sin(b) * 0.07 * 0.16,
            vz =
              Math.cos(a) * 0.18 * 0.07 + Math.cos(b * 1.3) * 0.07 * 0.16 * 1.3;
          const heading = -Math.atan2(vz, vx);
          wake(heading, pace * 0.5, 0.3 * near, 0.3 * near);
          transform.position.set(
            position.x,
            SEA_LEVEL + 0.01 + Math.sin(time * 2 + i) * 0.006,
            position.z,
          );
          transform.rotation.set(
            Math.sin(time * 1.4 + i) * 0.06,
            heading,
            Math.sin(time * 1.9 + i) * 0.03,
            "YXZ",
          );
          transform.scale.setScalar(near);
          write(mesh, count++);
        });
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
    }
    if (wakeMesh) {
      wakeMesh.count = scratch.wakes;
      wakeMesh.instanceMatrix.needsUpdate = true;
    }

    if (trains.current && engines.current) {
      const cars = trains.current,
        heads = engines.current;
      let count = 0,
        engineCount = 0;
      for (const plan of fleet.trains) {
        const line = fleet.rail[plan.line];
        const { rear, forward } = trainHead(line, plan, time);
        for (let car = 0; car < TRAIN_CARS; car++) {
          const distance = rear + car * TRAIN_CAR_SPACING;
          pointAlong(line, distance, position);
          // Each car lines up between its own bogies, so the train bends round curves.
          const heading = headingAlong(line, distance, 0.08);
          transform.position.set(
            position.x,
            position.y + RAIL_LIFT,
            position.z,
          );
          const engine = car === (forward ? TRAIN_CARS - 1 : 0);
          // The engine always leads, nose first.
          transform.rotation.set(
            0,
            heading + (engine && !forward ? Math.PI : 0),
            0,
          );
          transform.scale.setScalar(1);
          if (engine) write(heads, engineCount++);
          else write(cars, count++);
        }
      }
      cars.count = count;
      cars.instanceMatrix.needsUpdate = true;
      heads.count = engineCount;
      heads.instanceMatrix.needsUpdate = true;
    }

    if (planes.current) {
      const mesh = planes.current;
      let count = 0;
      fleet.flights.forEach((flight, n) => {
        const a = network.airports[flight.from],
          b = network.airports[flight.to];
        const stage = flightStage(
          a.position.distanceTo(b.position),
          flight.phase,
          time,
        );
        // Each flight parks at its own spot on the runway at either end.
        const apron = APRON[n % APRON.length];
        const [start, end] = stage.outbound ? [a, b] : [b, a];
        scratch.from
          .copy(start.position)
          .add(
            position.set(
              Math.cos(start.heading) * apron,
              0,
              Math.sin(start.heading) * apron,
            ),
          );
        scratch.to
          .copy(end.position)
          .add(
            position.set(
              Math.cos(end.heading) * apron,
              0,
              Math.sin(end.heading) * apron,
            ),
          );
        let heading: number,
          pitch = 0,
          bank = 0;
        if (stage.flying) {
          ({ heading, pitch, bank } = flightPath(
            scratch.from,
            start.heading,
            scratch.to,
            end.heading,
            stage.u,
            position,
          ));
        } else {
          // On the ground: taxi round to face back the way it came.
          const landed = flightPath(
            scratch.from,
            start.heading,
            scratch.to,
            end.heading,
            1,
            position,
          );
          heading = landed.heading + Math.PI * smooth((stage.u - 0.2) / 0.6);
        }
        transform.position.copy(position);
        transform.rotation.set(bank, heading, pitch, "YXZ");
        transform.scale.setScalar(1);
        write(mesh, count++);
      });
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
    }
  };

  useLayoutEffect(() => {
    scratch.time = Number.NaN;
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
      <Fleet
        model="tol-laut"
        capacity={fleet.tolLaut.length}
        meshRef={tolLaut}
      />
      <Fleet model="ferry" capacity={fleet.ferries.length} meshRef={ferries} />
      <Fleet
        model="fishing"
        capacity={network.fishing.length}
        meshRef={fishing}
      />
      <Fleet
        model="wake"
        capacity={
          fleet.cargo.length +
          fleet.tolLaut.length +
          fleet.ferries.length +
          network.fishing.length
        }
        meshRef={wakes}
      />
      <Fleet
        model="train"
        capacity={fleet.trains.length * (TRAIN_CARS - 1)}
        meshRef={trains}
      />
      <Fleet
        model="locomotive"
        capacity={fleet.trains.length}
        meshRef={engines}
      />
      <Fleet model="plane" capacity={fleet.flights.length} meshRef={planes} />
    </group>
  );
}
