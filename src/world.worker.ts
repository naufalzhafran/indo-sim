import { buildWorldGeometry } from "./mapGeometry";
import type { MapData } from "./mapData";
import { packWorld, worldTransferables } from "./worldTransfer";

self.onmessage = (event: MessageEvent<MapData>) => {
  try {
    const data = packWorld(buildWorldGeometry(event.data));
    self.postMessage({ data }, { transfer: worldTransferables(data) });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "World generation failed",
    });
  }
};
