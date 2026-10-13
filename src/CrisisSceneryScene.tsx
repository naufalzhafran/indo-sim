import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { InstancedMesh, Object3D } from "three";
import type { WorldGeometry } from "./mapGeometry";
import { layoutCrisisScenery, type CrisisPiece } from "./crisisScenery";
import { transportGeometry, type TransportModel } from "./transportModels";
import type { Crisis } from "./worldTypes";

function Pieces({
  model,
  pieces,
  reducedMotion,
}: {
  model: TransportModel;
  pieces: CrisisPiece[];
  reducedMotion: boolean;
}) {
  const mesh = useRef<InstancedMesh>(null);
  const transform = useMemo(() => new Object3D(), []);
  const drifting = model === "haze";
  const place = (time: number) => {
    if (!mesh.current) return;
    pieces.forEach((piece, i) => {
      transform.position.copy(piece.position);
      if (drifting) {
        transform.position.x += Math.sin(time * 0.25 + piece.seed) * 0.25;
        transform.position.y += Math.sin(time * 0.4 + piece.seed * 2) * 0.06;
      }
      transform.rotation.set(
        0,
        piece.rotation + (drifting ? time * 0.05 : 0),
        0,
      );
      transform.scale.setScalar(piece.scale);
      transform.updateMatrix();
      mesh.current!.setMatrixAt(i, transform.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => {
    place(0);
    mesh.current?.computeBoundingSphere();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pieces]);
  useFrame(({ clock }) => {
    if (drifting && !reducedMotion) place(clock.elapsedTime);
  });
  return (
    <instancedMesh
      key={pieces.length}
      ref={mesh}
      args={[transportGeometry(model), undefined, pieces.length]}
      frustumCulled={!drifting}
      receiveShadow={model !== "haze"}
    >
      {model === "haze" ? (
        <meshLambertMaterial
          vertexColors
          flatShading
          transparent
          opacity={0.82}
          depthWrite={false}
        />
      ) : (
        <meshLambertMaterial vertexColors flatShading />
      )}
    </instancedMesh>
  );
}

/** Floodwater, dry fields, field clinics, cracked ground or haze where a crisis strikes. */
export default function CrisisScenery({
  world,
  crises,
  reducedMotion,
}: {
  world: WorldGeometry;
  crises: Crisis[];
  reducedMotion: boolean;
}) {
  const invalidate = useThree((state) => state.invalidate);
  const layout = useMemo(
    () => layoutCrisisScenery(world, crises),
    [world, crises],
  );
  useLayoutEffect(() => invalidate(), [layout, invalidate]);
  return (
    <group>
      {[...layout].map(([model, pieces]) => (
        <Pieces
          key={model}
          model={model}
          pieces={pieces}
          reducedMotion={reducedMotion}
        />
      ))}
    </group>
  );
}
