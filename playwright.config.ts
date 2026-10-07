import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: [
    "economy.spec.ts",
    "nationalEconomy.spec.ts",
    "policyWorkspace.spec.ts",
    "projectRewards.spec.ts",
    "jobsIncome.spec.ts",
    "worldRendering.spec.ts",
  ],
  timeout: 90000,
  use: {
    baseURL: "http://127.0.0.1:5174",
    headless: true,
    viewport: { width: 1440, height: 900 },
    actionTimeout: 10000,
  },
  webServer: {
    command: "npm run dev -- --port 5174",
    url: "http://127.0.0.1:5174",
    reuseExistingServer: true,
  },
});
