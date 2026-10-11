import { useLayoutEffect, useMemo, useRef } from "react";
import { InstancedMesh, Object3D, Vector3 } from "three";
import {
  structureGeometry,
  type SeaLane,
  type StructureItem,
  type StructureKind,
} from "./structureLayout";
import { SEA_LEVEL } from "./mapGeometry";

const DASH_GAP = 1.1;

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
/** Pale dashes on the water along each Tol Laut ship route. */
function LaneMarks({ lanes }: { lanes: SeaLane[] }) {
  const mesh = useRef<InstancedMesh>(null);
  const dashes = useMemo(() => {
    const taken: Vector3[] = [];
    return lanes.flatMap((lane) => {
      const marks: { position: Vector3; heading: number }[] = [];
      const { points } = lane;
      // One dash about every DASH_GAP of sailing distance, centred on each gap.
      let next = DASH_GAP / 2;
      let travelled = 0;
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1],
          b = points[i],
          span = a.distanceTo(b);
        while (span > 0 && next <= travelled + span) {
          const position = a.clone().lerp(b, (next - travelled) / span);
          // Lines leaving the same harbour share water; mark it only once.
          if (!taken.some((p) => p.distanceToSquared(position) < 0.36)) {
            taken.push(position);
            marks.push({
              position,
              heading: Math.atan2(b.x - a.x, b.z - a.z),
            });
          }
          next += DASH_GAP;
        }
        travelled += span;
      }
      return marks;
    });
  }, [lanes]);
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
      <boxGeometry args={[0.1, 0.02, 0.38]} />
      <meshBasicMaterial color="#fffdf0" transparent opacity={0.8} />
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
