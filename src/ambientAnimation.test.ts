import { afterEach, describe, expect, it, vi } from "vitest";
import { startAmbientAnimation } from "./ambientAnimation";

class Visibility extends EventTarget {
  hidden = false;

  setHidden(hidden: boolean) {
    this.hidden = hidden;
    this.dispatchEvent(new Event("visibilitychange"));
  }
}

afterEach(() => vi.useRealTimers());

describe("ambient animation scheduling", () => {
  it("requests one shared 30fps cadence and releases it on cleanup", () => {
    vi.useFakeTimers();
    const invalidate = vi.fn();
    const visibility = new Visibility();
    const stop = startAmbientAnimation(invalidate, visibility);
    expect(vi.getTimerCount()).toBe(1);
    expect(invalidate).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    expect(invalidate).toHaveBeenCalledTimes(4);
    stop();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(invalidate).toHaveBeenCalledTimes(4);
    visibility.setHidden(false);
    expect(vi.getTimerCount()).toBe(0);
    expect(invalidate).toHaveBeenCalledTimes(4);
  });

  it("suspends hidden tabs and resumes without accumulating timers", () => {
    vi.useFakeTimers();
    const visibility = new Visibility();
    visibility.hidden = true;
    const invalidate = vi.fn();
    const stop = startAmbientAnimation(invalidate, visibility);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(invalidate).not.toHaveBeenCalled();

    visibility.setHidden(false);
    expect(vi.getTimerCount()).toBe(1);
    expect(invalidate).toHaveBeenCalledTimes(1);
    visibility.setHidden(false);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(100);
    expect(invalidate).toHaveBeenCalledTimes(5);

    visibility.setHidden(true);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(invalidate).toHaveBeenCalledTimes(5);
    stop();
  });
});
