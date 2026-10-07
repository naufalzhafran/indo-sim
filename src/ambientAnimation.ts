import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

type VisibilitySource = {
  readonly hidden: boolean;
  addEventListener(type: "visibilitychange", listener: () => void): void;
  removeEventListener(type: "visibilitychange", listener: () => void): void;
};

/** Boats and traffic share one cadence; camera and quarter animation can request faster frames. */
export function startAmbientAnimation(
  invalidate: () => void,
  visibility: VisibilitySource = document,
) {
  let timer: ReturnType<typeof setInterval> | undefined;
  const stop = () => {
    if (timer !== undefined) clearInterval(timer);
    timer = undefined;
  };
  const syncVisibility = () => {
    stop();
    if (visibility.hidden) return;
    invalidate();
    timer = setInterval(() => {
      if (!visibility.hidden) invalidate();
    }, 1000 / 30);
  };
  visibility.addEventListener("visibilitychange", syncVisibility);
  syncVisibility();
  return () => {
    stop();
    visibility.removeEventListener("visibilitychange", syncVisibility);
  };
}

export function AmbientAnimationDriver({ enabled }: { enabled: boolean }) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    if (enabled) return startAmbientAnimation(invalidate);
  }, [enabled, invalidate]);
  return null;
}
