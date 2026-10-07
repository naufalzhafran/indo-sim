import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  DynamicDrawUsage,
  Frustum,
  InstancedMesh,
  Matrix4,
  MeshLambertMaterial,
  Object3D,
  OrthographicCamera,
  Plane,
  Raycaster,
  Vector2,
  Vector3,
} from "three";
import type { WorldGeometry } from "./mapGeometry";
import {
  getLocalScenery,
  type LocalSceneryItem,
  type LocalSceneryKind,
} from "./localScenery";
import { createLocalSceneryModels } from "./localSceneryModels";
import {
  LOCAL_SCENERY_CAPACITY,
  localDetailWeight,
  selectLocalScenery,
} from "./localSceneryVisibility";
import { baseWorldZoom } from "./worldCameraMath";

const KINDS = Object.keys(LOCAL_SCENERY_CAPACITY) as LocalSceneryKind[];

export default function LocalSceneryScene({
  world,
  cleared,
  onSelect,
}: {
  world: WorldGeometry;
  cleared: Vector3[];
  onSelect: (id: string) => void;
}) {
  const { camera, gl, size } = useThree();
  const chunks = useMemo(() => getLocalScenery(world), [world]);
  const models = useMemo(createLocalSceneryModels, []);
  const material = useMemo(
    () => new MeshLambertMaterial({ vertexColors: true, flatShading: true }),
    [],
  );
  const meshes = useRef(new Map<LocalSceneryKind, InstancedMesh>());
  const displayed = useRef<
    Partial<Record<LocalSceneryKind, LocalSceneryItem[]>>
  >({});
  const previous = useRef({ stamp: "", cleared });
  const meshRefs = useMemo(
    () =>
      Object.fromEntries(
        KINDS.map((kind) => [
          kind,
          (mesh: InstancedMesh | null) => {
            if (mesh) {
              mesh.count = 0;
              mesh.instanceMatrix.setUsage(DynamicDrawUsage);
              meshes.current.set(kind, mesh);
              previous.current.stamp = "";
            } else meshes.current.delete(kind);
          },
        ]),
      ) as Record<LocalSceneryKind, (mesh: InstancedMesh | null) => void>,
    [],
  );
  const updates = useRef(0);
  const scratch = useMemo(
    () => ({
      frustum: new Frustum(),
      projection: new Matrix4(),
      transform: new Object3D(),
      raycaster: new Raycaster(),
      centre: new Vector3(),
      ndc: new Vector2(),
      ground: new Plane(new Vector3(0, 1, 0), 0),
    }),
    [],
  );
  useEffect(
    () => () => {
      Object.values(models).forEach((geometry) => geometry.dispose());
      material.dispose();
      if (import.meta.env.DEV) {
        gl.domElement.dataset.detailInstances = "0";
        gl.domElement.dataset.detailChunks = "0";
      }
    },
    [models, material, gl],
  );

  useFrame(() => {
    const zoom = (camera as OrthographicCamera).zoom;
    const stamp = `${camera.position.toArray()},${camera.quaternion.toArray()},${zoom},${size.width},${size.height}`;
    if (
      previous.current.stamp === stamp &&
      previous.current.cleared === cleared
    )
      return;
    previous.current = { stamp, cleared };
    camera.updateMatrixWorld();
    scratch.projection.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    scratch.frustum.setFromProjectionMatrix(scratch.projection);
    scratch.raycaster.setFromCamera(scratch.ndc, camera);
    scratch.raycaster.ray.intersectPlane(scratch.ground, scratch.centre);
    const ratio = zoom / baseWorldZoom(world.bounds, size);
    const { items, chunkCount } = selectLocalScenery(
      chunks,
      scratch.frustum,
      scratch.centre,
      world.bounds.max.y,
      ratio,
      cleared,
    );
    displayed.current = items;
    let count = 0;
    for (const kind of KINDS) {
      const mesh = meshes.current.get(kind);
      if (!mesh) continue;
      const entries = items[kind];
      mesh.count = entries.length;
      mesh.visible = entries.length > 0;
      entries.forEach((item, index) => {
        scratch.transform.position.set(item.x, item.y, item.z);
        scratch.transform.rotation.set(0, item.rotation, 0);
        scratch.transform.scale.setScalar(
          item.scale * localDetailWeight(item.tier, ratio),
        );
        scratch.transform.updateMatrix();
        mesh.setMatrixAt(index, scratch.transform.matrix);
      });
      if (entries.length) {
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
      }
      count += entries.length;
    }
    if (import.meta.env.DEV) {
      gl.domElement.dataset.detailInstances = String(count);
      gl.domElement.dataset.detailChunks = String(chunkCount);
      gl.domElement.dataset.detailUpdates = String(++updates.current);
    }
  });

  return KINDS.map((kind) => (
    <instancedMesh
      key={kind}
      name={`local-scenery-${kind}`}
      ref={meshRefs[kind]}
      args={[models[kind], material, LOCAL_SCENERY_CAPACITY[kind]]}
      dispose={null}
      frustumCulled={false}
      castShadow
      receiveShadow
      onClick={(e) => {
        if (e.delta > 4 || e.instanceId === undefined) return;
        const item = displayed.current[kind]?.[e.instanceId];
        if (item) {
          e.stopPropagation();
          onSelect(item.province);
        }
      }}
    />
  ));
}
