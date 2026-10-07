import { test, expect, type Page } from "@playwright/test";

async function start(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem("indonesia-presidency-language", "en"),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Choose opening policies", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Review campaign", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start campaign", exact: true })
    .click();
}

// Read the live Three camera and geometry without moving them; all navigation
// below goes through the player's wheel and map buttons.
async function viewSnapshot(
  page: Page,
  point?: { x: number; y: number; z: number },
) {
  return page.evaluate(async (worldPoint) => {
    const canvas = document.querySelector<HTMLCanvasElement>(
      "canvas[data-world-ready]",
    )!;
    const moduleUrl = performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .find((url) => url.includes("/@react-three_fiber.js"));
    if (!moduleUrl) throw new Error("Expected loaded R3F module");
    const { _roots } = await import(moduleUrl);
    const { camera, scene } = _roots.get(canvas).store.getState();
    const rect = canvas.getBoundingClientRect();
    const project = (position: any) => {
      const ndc = position.clone().project(camera);
      return {
        x: rect.left + ((ndc.x + 1) / 2) * rect.width,
        y: rect.top + ((1 - ndc.y) / 2) * rect.height,
      };
    };
    let anchor = worldPoint;
    let traffic: { count: number; matrices: number[] } | null = null;
    let nearest = Infinity;
    scene.traverse((object: any) => {
      if (!object.isInstancedMesh) return;
      if (
        object.geometry.type === "BoxGeometry" &&
        object.geometry.parameters.width === 0.16
      ) {
        traffic = {
          count: object.count,
          matrices: Array.from(object.instanceMatrix.array).slice(
            0,
            object.count * 16,
          ) as number[],
        };
      }
      if (
        worldPoint ||
        object.geometry.type !== "CylinderGeometry" ||
        object.geometry.parameters.radiusTop !== 0.09
      )
        return;
      for (let i = 0; i < object.count; i++) {
        const matrix = object.matrix.clone();
        object.getMatrixAt(i, matrix);
        const position = camera.position.clone().setFromMatrixPosition(matrix);
        object.localToWorld(position);
        const screen = project(position);
        const distance =
          (screen.x - rect.left - rect.width / 2) ** 2 +
          (screen.y - rect.top - rect.height / 2) ** 2;
        if (distance < nearest) {
          nearest = distance;
          anchor = { x: position.x, y: position.y, z: position.z };
        }
      }
    });
    if (!anchor) throw new Error("Expected an existing island grove");
    return {
      anchor,
      screen: project(
        camera.position.clone().set(anchor.x, anchor.y, anchor.z),
      ),
      cameraZoom: camera.zoom as number,
      cameraWidth: (camera.right - camera.left) as number,
      ratio: Number(canvas.dataset.zoomRatio),
      updates: canvas.dataset.detailUpdates,
      frames: canvas.dataset.renderedFrames,
      traffic,
    };
  }, point);
}

test("a failed world worker can retry, animate, and settle with reduced motion", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    let failed = false;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        if (String(url).includes("world.worker") && !failed) {
          failed = true;
          throw new Error("Test world worker failure");
        }
        super(url, options);
      }
    };
  });
  await start(page);
  const retry = page.getByRole("button", { name: "Retry 3D", exact: true });
  await expect(retry).toBeVisible();
  await expect(page.locator("[data-province-id]")).toHaveCount(38);
  await retry.click();
  const canvas = page.locator("canvas[data-world-ready]");
  await expect(canvas).toBeVisible({ timeout: 30000 });
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-draw-calls")))
    .toBeGreaterThan(0);
  // The ambient loop advances without rewriting the stationary province palette.
  await page.waitForTimeout(600);
  const before = await canvas.evaluate((el) => ({
    frames: Number(el.dataset.renderedFrames),
    palette: el.dataset.paletteUpdates,
  }));
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-rendered-frames")))
    .toBeGreaterThan(before.frames + 2);
  expect(await canvas.getAttribute("data-palette-updates")).toBe(
    before.palette,
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(600);
  const settled = await canvas.getAttribute("data-rendered-frames");
  await page.waitForTimeout(500);
  expect(await canvas.getAttribute("data-rendered-frames")).toBe(settled);
});

test("context loss restores cached islands and preserves selection and the saved quarter", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await start(page);
  const canvas = page.locator("canvas[data-world-ready]");
  await expect(canvas).toBeVisible({ timeout: 30000 });
  await canvas.evaluate((el: HTMLCanvasElement) => {
    const gl = el.getContext("webgl2");
    if (!gl) throw new Error("Expected WebGL scene");
    const extension = gl.getExtension("WEBGL_lose_context");
    if (!extension) throw new Error("Expected context-loss extension");
    extension.loseContext();
  });
  await page.getByRole("button", { name: "Retry 3D", exact: true }).click();
  await expect(canvas).toBeVisible({ timeout: 30000 });
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Regions", exact: true })
    .click();
  await page.locator('[data-region-card="papua"]').click();
  await expect(canvas).toHaveAttribute("data-selected-region", "papua");
  await page
    .getByRole("button", { name: "Close regions", exact: true })
    .click();
  await page.getByTestId("advance-quarter").click();
  await expect(page.locator(".q-header-center")).toContainText("Q2", {
    timeout: 30000,
  });
  await expect(page.getByTestId("plan-save-status")).toContainText(
    "Game saved",
  );
  await page.reload();
  await expect(page.locator(".q-header-center")).toContainText("Q2", {
    timeout: 30000,
  });
});

test("deep zoom keeps cursor focus, reveals scenery, and settles with reduced motion", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await start(page);
  const canvas = page.locator("canvas[data-world-ready]");
  await expect(canvas).toBeVisible({ timeout: 30000 });
  await expect(canvas).toHaveAttribute("data-zoom-ratio", "1.1500");
  await expect(canvas).toHaveAttribute("data-detail-instances", "0");
  const initial = await viewSnapshot(page);
  const baseZoom = initial.cameraZoom / initial.ratio;

  await page.mouse.move(initial.screen.x, initial.screen.y);
  await page.mouse.wheel(0, -1800);
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-zoom-ratio")))
    .toBeGreaterThan(2);
  const focused = await viewSnapshot(page, initial.anchor);
  expect(Math.abs(focused.screen.x - initial.screen.x)).toBeLessThan(2);
  expect(Math.abs(focused.screen.y - initial.screen.y)).toBeLessThan(2);

  const zoomIn = page.getByRole("button", { name: "Zoom in", exact: true });
  for (let i = 0; i < 8; i++) await zoomIn.click();
  await expect(canvas).toHaveAttribute("data-zoom-ratio", "8.0000");
  expect(
    (await viewSnapshot(page, initial.anchor)).cameraZoom / baseZoom,
  ).toBeCloseTo(8, 6);
  await expect
    .poll(async () =>
      Number(await canvas.getAttribute("data-detail-instances")),
    )
    .toBeGreaterThan(0);
  await expect(canvas).toHaveAttribute("data-shadow-mode", "local");
  expect(Number(await canvas.getAttribute("data-shadow-width"))).toBeLessThan(
    130,
  );

  // Ambient traffic can animate while static detail instances stay untouched.
  const animated = await viewSnapshot(page, initial.anchor);
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-rendered-frames")))
    .toBeGreaterThan(Number(animated.frames) + 2);
  expect(await canvas.getAttribute("data-detail-updates")).toBe(
    animated.updates,
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(600);
  const settled = await viewSnapshot(page, initial.anchor);
  await page.waitForTimeout(400);
  const still = await viewSnapshot(page, initial.anchor);
  expect(still.frames).toBe(settled.frames);
  expect(still.updates).toBe(settled.updates);
  expect(still.traffic).toEqual(settled.traffic);

  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-zoom-ratio", "1.1500");
  await expect(canvas).toHaveAttribute("data-detail-instances", "0");
  await expect(canvas).toHaveAttribute("data-shadow-mode", "global");
  await expect(canvas).toHaveAttribute("data-shadow-width", "130");
  const zoomOut = page.getByRole("button", { name: "Zoom out", exact: true });
  for (let i = 0; i < 3; i++) await zoomOut.click();
  await expect(canvas).toHaveAttribute("data-zoom-ratio", "1.0000");
  expect(
    (await viewSnapshot(page, initial.anchor)).cameraZoom / baseZoom,
  ).toBeCloseTo(1, 6);
  expect(errors).toEqual([]);
});

test("region-panel camera controls stay reachable and preserve the uncovered map focus", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await start(page);
  const canvas = page.locator("canvas[data-world-ready]");
  await expect(canvas).toBeVisible({ timeout: 30000 });
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Regions", exact: true })
    .click();
  await page.locator('[data-region-card="java"]').click();
  for (const language of ["en", "id"]) {
    if (language === "id") {
      await page.getByRole("combobox", { name: "Language / Bahasa" }).click();
      await page
        .getByRole("option", { name: "Bahasa Indonesia", exact: true })
        .click();
    }
    for (const viewport of [
      { width: 1280, height: 720 },
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await expect
        .poll(async () => {
          const snapshot = await viewSnapshot(page);
          const bounds = await page.locator(".world-canvas").boundingBox();
          return Math.abs(snapshot.cameraWidth - bounds!.width);
        })
        .toBeLessThan(1);
      const zoomIn = page.getByRole("button", {
        name: language === "en" ? "Zoom in" : "Perbesar",
        exact: true,
      });
      await expect(zoomIn).toBeVisible();
      const controls = await page.locator(".world-camera").boundingBox();
      const panel = await page.locator(".q-dossier").boundingBox();
      expect(controls!.x).toBeGreaterThanOrEqual(panel!.x + panel!.width);
      expect(controls!.x + controls!.width).toBeLessThanOrEqual(viewport.width);
      expect(controls!.y + controls!.height).toBeLessThanOrEqual(
        viewport.height,
      );
      const before = await viewSnapshot(page);
      const focus = {
        x:
          Number(await canvas.getAttribute("data-camera-target-x")) +
          710 / (2 * before.cameraZoom),
        y: 0,
        z: Number(await canvas.getAttribute("data-camera-target-z")),
      };
      const focused = await viewSnapshot(page, focus);
      for (let i = 0; i < 8; i++) await zoomIn.click();
      await expect(canvas).toHaveAttribute("data-zoom-ratio", "8.0000");
      const after = await viewSnapshot(page, focus);
      expect(Math.abs(after.screen.x - focused.screen.x)).toBeLessThan(2);
      expect(Math.abs(after.screen.y - focused.screen.y)).toBeLessThan(2);
      const bounds = await page
        .locator(".world-camera button")
        .evaluateAll((buttons) =>
          buttons.map((button) => ({
            client: button.clientWidth,
            scroll: button.scrollWidth,
          })),
        );
      expect(bounds.every((button) => button.scroll <= button.client)).toBe(
        true,
      );
    }
  }
});
