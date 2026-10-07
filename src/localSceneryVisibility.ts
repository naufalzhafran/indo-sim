import { Box3, type Frustum, type Vector3 } from "three";
import type {
  LocalSceneryChunk,
  LocalSceneryItem,
  LocalSceneryKind,
} from "./localScenery";

export const LOCAL_SCENERY_CAPACITY: Record<LocalSceneryKind, number> = {
  tree: 420,
  house: 160,
  "tree-detail": 250,
  "house-detail": 160,
};

export function localDetailWeight(tier: 1 | 2, zoomRatio: number) {
  const start = tier === 1 ? 2.1 : 4.1;
  const end = tier === 1 ? 3.25 : 5.5;
  const t = Math.max(0, Math.min(1, (zoomRatio - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

export function selectLocalScenery(
  chunks: LocalSceneryChunk[],
  frustum: Frustum,
  centre: Pick<Vector3, "x" | "z">,
  maxHeight: number,
  zoomRatio: number,
  cleared: Vector3[],
) {
  const items: Record<LocalSceneryKind, LocalSceneryItem[]> = {
    tree: [],
    house: [],
    "tree-detail": [],
    "house-detail": [],
  };
  if (!localDetailWeight(1, zoomRatio)) return { items, chunkCount: 0 };
  const box = new Box3();
  const visible = chunks.filter((chunk) => {
    // Margin keeps canopies and sloped-view silhouettes through the screen edge.
    box.min.set(chunk.minX - 0.7, -0.1, chunk.minZ - 0.7);
    box.max.set(chunk.maxX + 0.7, maxHeight + 1, chunk.maxZ + 0.7);
    return frustum.intersectsBox(box);
  });
  const distance = (chunk: LocalSceneryChunk) =>
    ((chunk.minX + chunk.maxX) / 2 - centre.x) ** 2 +
    ((chunk.minZ + chunk.maxZ) / 2 - centre.z) ** 2;
  visible.sort((a, b) => distance(a) - distance(b));
  for (const chunk of visible)
    for (const item of chunk.items) {
      if (
        !localDetailWeight(item.tier, zoomRatio) ||
        items[item.kind].length >= LOCAL_SCENERY_CAPACITY[item.kind] ||
        cleared.some(
          (site) =>
            Math.abs(site.x - item.x) < 0.8 && Math.abs(site.z - item.z) < 0.8,
        )
      )
        continue;
      items[item.kind].push(item);
    }
  return { items, chunkCount: visible.length };
}
