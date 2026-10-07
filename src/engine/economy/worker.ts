import { previewQuarter, resolveQuarter } from "./engine";
import type { QuarterGame, QuarterPlan } from "./types";
self.onmessage = (
  event: MessageEvent<{
    game: QuarterGame;
    plan: QuarterPlan;
    preview?: boolean;
  }>,
) => {
  try {
    const { game, plan, preview } = event.data;
    self.postMessage({
      result: preview
        ? previewQuarter(game, plan)
        : resolveQuarter(game, plan, { attribution: true }),
    });
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error ? error.message : "Quarter calculation failed.",
    });
  }
};
