import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MapData } from "./mapData";
import type { WorldGeometry } from "./mapGeometry";
import { unpackWorld } from "./worldTransfer";
import { prepareWorld } from "./worldLoader";

vi.mock("./worldTransfer", () => ({ unpackWorld: vi.fn() }));

class MockWorker {
  static instances: MockWorker[] = [];
  static constructionError: Error | null = null;
  static sendError: Error | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminate = vi.fn();
  postMessage = vi.fn(() => {
    if (MockWorker.sendError) throw MockWorker.sendError;
  });

  constructor(
    public url: URL,
    public options: WorkerOptions,
  ) {
    if (MockWorker.constructionError) throw MockWorker.constructionError;
    MockWorker.instances.push(this);
  }

  message(data: unknown) {
    this.onmessage?.({ data } as MessageEvent);
  }
}

const newMap = (): MapData => ({ type: "FeatureCollection", features: [] });
const unpack = vi.mocked(unpackWorld);
const world = {} as WorldGeometry;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("Worker", MockWorker);
  MockWorker.instances = [];
  MockWorker.constructionError = null;
  MockWorker.sendError = null;
  unpack.mockReset().mockReturnValue(world);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function expectStopped(worker: MockWorker) {
  expect(worker.terminate).toHaveBeenCalledTimes(1);
  expect(worker.onmessage).toBeNull();
  expect(worker.onmessageerror).toBeNull();
  expect(worker.onerror).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
}

describe("world preparation", () => {
  it("shares pending and completed work for the same map", async () => {
    const map = newMap();
    const first = prepareWorld(map);
    expect(prepareWorld(map)).toBe(first);
    expect(MockWorker.instances).toHaveLength(1);
    const worker = MockWorker.instances[0];
    expect(worker.options).toEqual({ type: "module" });
    expect(worker.url.pathname).toMatch(/world\.worker\.ts$/);
    expect(worker.postMessage).toHaveBeenCalledExactlyOnceWith(map);
    const packed = { test: "packed world" };
    worker.message({ data: packed });
    await expect(first).resolves.toBe(world);
    expect(unpack).toHaveBeenCalledExactlyOnceWith(packed);
    expectStopped(worker);
    expect(prepareWorld(map)).toBe(first);
    expect(MockWorker.instances).toHaveLength(1);
    vi.advanceTimersByTime(120_000);
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it("keeps requests for different map objects separate", async () => {
    const first = prepareWorld(newMap());
    const second = prepareWorld(newMap());
    expect(first).not.toBe(second);
    expect(MockWorker.instances).toHaveLength(2);
    MockWorker.instances.forEach((worker) => worker.message({ data: {} }));
    await expect(Promise.all([first, second])).resolves.toEqual([world, world]);
    MockWorker.instances.forEach(expectStopped);
  });

  it.each([
    ["runtime", "Worker crashed"],
    ["message", "World data could not be received"],
    ["reported", "Unable to build coastlines"],
    ["malformed", "World generation failed"],
    ["unpack", "Invalid geometry"],
    ["send", "Unable to clone map"],
  ] as const)(
    "releases a %s failure and allows retry",
    async (failure, reason) => {
      const map = newMap();
      if (failure === "send") MockWorker.sendError = new Error(reason);
      if (failure === "unpack")
        unpack.mockImplementationOnce(() => {
          throw new Error(reason);
        });
      const request = prepareWorld(map);
      const rejected = expect(request).rejects.toThrow(reason);
      const worker = MockWorker.instances[0];
      if (failure === "runtime") {
        const preventDefault = vi.fn();
        worker.onerror?.({
          message: reason,
          preventDefault,
        } as unknown as ErrorEvent);
        expect(preventDefault).toHaveBeenCalledOnce();
      } else if (failure === "message") worker.onmessageerror?.();
      else if (failure === "reported") worker.message({ error: reason });
      else if (failure === "malformed") worker.message(null);
      else if (failure === "unpack") worker.message({ data: {} });
      await rejected;
      expectStopped(worker);

      MockWorker.sendError = null;
      const retry = prepareWorld(map);
      expect(retry).not.toBe(request);
      expect(MockWorker.instances).toHaveLength(2);
      MockWorker.instances[1].message({ data: {} });
      await expect(retry).resolves.toBe(world);
      expectStopped(MockWorker.instances[1]);
    },
  );

  it("allows retry when creating the worker throws", async () => {
    const map = newMap();
    MockWorker.constructionError = new Error("Workers unavailable");
    await expect(prepareWorld(map)).rejects.toThrow("Workers unavailable");
    expect(vi.getTimerCount()).toBe(0);
    MockWorker.constructionError = null;
    const retry = prepareWorld(map);
    expect(MockWorker.instances).toHaveLength(1);
    MockWorker.instances[0].message({ data: {} });
    await expect(retry).resolves.toBe(world);
    expectStopped(MockWorker.instances[0]);
  });

  it("terminates timed-out work, ignores late results, and allows retry", async () => {
    const map = newMap();
    const request = prepareWorld(map);
    const rejected = expect(request).rejects.toThrow(
      "World generation timed out",
    );
    const worker = MockWorker.instances[0];
    const lateMessage = worker.onmessage!;
    vi.advanceTimersByTime(119_999);
    expect(worker.terminate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    await rejected;
    expectStopped(worker);
    lateMessage({ data: { data: {} } } as MessageEvent);
    expect(unpack).not.toHaveBeenCalled();
    expect(worker.terminate).toHaveBeenCalledTimes(1);

    const retry = prepareWorld(map);
    MockWorker.instances[1].message({ data: {} });
    await expect(retry).resolves.toBe(world);
    expectStopped(MockWorker.instances[1]);
  });
});
