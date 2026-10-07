import type { MapData } from "./mapData";
import type { WorldGeometry } from "./mapGeometry";
import { unpackWorld, type PackedWorld } from "./worldTransfer";

const worlds = new WeakMap<MapData, Promise<WorldGeometry>>();

/** A shared request survives StrictMode remounts; failed requests can be retried. */
export function prepareWorld(map: MapData): Promise<WorldGeometry> {
  const cached = worlds.get(map);
  if (cached) return cached;
  const request = new Promise<WorldGeometry>((resolve, reject) => {
    const worker = new Worker(new URL("./world.worker.ts", import.meta.url), {
      type: "module",
    });
    const timer = setTimeout(
      () => fail(new Error("World generation timed out")),
      120_000,
    );
    let settled = false;
    const stop = () => {
      settled = true;
      clearTimeout(timer);
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.onmessage = null;
      worker.terminate();
    };
    const fail = (error: unknown) => {
      if (settled) return;
      stop();
      reject(error);
    };
    worker.onerror = (event) => {
      event.preventDefault();
      fail(new Error(event.message || "World worker failed"));
    };
    worker.onmessageerror = () =>
      fail(new Error("World data could not be received"));
    worker.onmessage = (
      event: MessageEvent<{ data?: PackedWorld; error?: string }>,
    ) => {
      if (settled) return;
      stop();
      try {
        if (!event.data?.data)
          throw new Error(event.data?.error || "World generation failed");
        resolve(unpackWorld(event.data.data));
      } catch (error) {
        reject(error);
      }
    };
    try {
      worker.postMessage(map);
    } catch (error) {
      fail(error);
    }
  }).catch((error) => {
    worlds.delete(map);
    throw error;
  });
  worlds.set(map, request);
  return request;
}
