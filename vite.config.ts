import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    // The lazy 3D chunk (three.js) is inherently large and off the first-load path.
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Stable vendor chunks cache across releases; three.js stays out of
        // the first-load path because only the lazy 3D scene imports it.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (
            /node_modules\/(three|@react-three|its-fine|zustand|react-use-measure)\//.test(
              id,
            )
          )
            return "three";
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id))
            return "react";
          return undefined;
        },
      },
    },
  },
  test: { include: ["src/**/*.test.ts"] },
});
