import { chromium } from "@playwright/test";

// Repeatable browser workload; reports CPU time, not a universal FPS promise.
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "reduce",
});
await page.addInitScript(() =>
  localStorage.setItem("indonesia-presidency-language", "en"),
);
await page.goto(process.env.MAP_BENCH_URL ?? "http://127.0.0.1:5174");
await page.getByRole("button", { name: "Form my administration" }).click();
await page.getByRole("button", { name: "Set opening priorities" }).click();
await page.getByRole("button", { name: "Review administration" }).click();
await page.getByRole("checkbox", { name: /Guide me through/ }).uncheck();
await page.getByRole("button", { name: "Take office", exact: true }).click();
await page.locator(".neighbor-shape").first().waitFor();
await page.getByRole("button", { name: "Dismiss notification" }).click();
await page.getByRole("button", { name: "Close province inspector" }).click();
const client = await page.context().newCDPSession(page);
await client.send("Performance.enable");
const metrics = async () =>
  Object.fromEntries(
    (await client.send("Performance.getMetrics")).metrics.map((m) => [
      m.name,
      m.value,
    ]),
  );
const results = [];
for (let run = 0; run < 3; run++) {
  await page.getByRole("button", { name: "Reset map", exact: true }).click();
  await page.mouse.move(500, 350);
  const before = await metrics();
  await page.mouse.down();
  await page.mouse.move(780, 460, { steps: 90 });
  await page.mouse.up();
  for (let i = 0; i < 24; i++) await page.mouse.wheel(0, -24);
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  const after = await metrics();
  results.push(
    Object.fromEntries(
      [
        "ScriptDuration",
        "TaskDuration",
        "LayoutDuration",
        "RecalcStyleDuration",
      ].map((key) => [
        key + "Ms",
        Math.round((after[key] - before[key]) * 1000),
      ]),
    ),
  );
}
console.log(JSON.stringify(results, null, 2));
await browser.close();
