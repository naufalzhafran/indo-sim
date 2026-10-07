import { useLayoutEffect, useMemo, useRef } from "react";
import { InstancedMesh, Object3D } from "three";
import {
  structureGeometry,
  type SeaLane,
  type StructureItem,
  type StructureKind,
} from "./structureLayout";
import { SEA_LEVEL } from "./mapGeometry";

function KindInstances({
  kind,
  items,
  onSelect,
}: {
  kind: StructureKind;
  items: StructureItem[];
  onSelect: (region: string) => void;
}) {
  const mesh = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => structureGeometry(kind), [kind]);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const transform = new Object3D();
    items.forEach((item, index) => {
      transform.position.copy(item.position);
      transform.rotation.set(0, item.rotation, 0);
      transform.scale.set(item.scale, item.scale * item.height, item.scale);
      transform.updateMatrix();
      mesh.current!.setMatrixAt(index, transform.matrix);
    });
    mesh.current.count = items.length;
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [items]);
  return (
    <instancedMesh
      // A new instance count needs a new buffer.
      key={items.length}
      ref={mesh}
      args={[geometry, undefined, items.length]}
      castShadow
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        if (e.delta <= 4 && e.instanceId !== undefined)
          onSelect(items[e.instanceId].region);
      }}
    >
      <meshLambertMaterial vertexColors flatShading />
    </instancedMesh>
  );
}
/** Pale dashes on the water that mark each Tol Laut shipping lane. */
function LaneMarks({ lanes }: { lanes: SeaLane[] }) {
  const mesh = useRef<InstancedMesh>(null);
  const dashes = useMemo(
    () =>
      lanes.flatMap((lane) => {
        const length = lane.from.distanceTo(lane.to),
          count = Math.max(2, Math.floor(length / 1.1)),
          heading = Math.atan2(lane.to.x - lane.from.x, lane.to.z - lane.from.z);
        return Array.from({ length: count }, (_, i) => ({
          position: lane.from.clone().lerp(lane.to, (i + 0.5) / count),
          heading,
        }));
      }),
    [lanes],
  );
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const transform = new Object3D();
    dashes.forEach((dash, index) => {
      transform.position.set(
        dash.position.x,
        SEA_LEVEL + 0.03,
        dash.position.z,
      );
      transform.rotation.set(0, dash.heading, 0);
      transform.updateMatrix();
      mesh.current!.setMatrixAt(index, transform.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [dashes]);
  if (!dashes.length) return null;
  return (
    <instancedMesh
      key={dashes.length}
      ref={mesh}
      args={[undefined, undefined, dashes.length]}
      renderOrder={1}
    >
      <boxGeometry args={[0.16, 0.02, 0.5]} />
      <meshBasicMaterial color="#fffdf0" transparent opacity={0.85} />
    </instancedMesh>
  );
}
export default function PolicyStructures({
  items,
  lanes,
  onSelect,
}: {
  items: Map<StructureKind, StructureItem[]>;
  lanes: SeaLane[];
  onSelect: (region: string) => void;
}) {
  return (
    <>
      {[...items].map(([kind, list]) => (
        <KindInstances
          key={kind}
          kind={kind}
          items={list}
          onSelect={onSelect}
        />
      ))}
      <LaneMarks lanes={lanes} />
    </>
  );
}
