import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { choose } from "./dropdown";
import {
  basePlan,
  initialQuarter,
  resolveQuarter,
  summarizeEconomyRegions,
} from "../src/engine/economy/engine";
import {
  AUTOSAVE_KEY,
  DRAFT_KEY,
  ECONOMY_DATABASE,
  parseQuarter,
  quarterEnvelope,
} from "../src/engine/economy/persistence";
import {
  POLICY_IDS,
  REGION_IDS,
  type PolicyId,
  type QuarterGame,
  type QuarterPlan,
} from "../src/engine/economy/types";

const calm = { calm: true, attribution: false };
type Language = "en" | "id";

test("setup preserves selections across steps and handles invalid imports without starting", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("indonesia-presidency-language", "en"),
  );
  await page.goto("/");
  const setup = page.getByTestId("campaign-setup");
  await setup
    .getByRole("button", { name: "Choose opening policies", exact: true })
    .click();
  const bos = setup.getByRole("button", {
    name: /^Bantuan Operasional Sekolah /,
  });
  await bos.click();
  await bos.click();
  await expect(bos).toHaveAttribute("aria-pressed", "false");
  await bos.click();
  await setup.getByRole("button", { name: "Back", exact: true }).click();
  await setup
    .getByRole("button", { name: "Opening policies", exact: true })
    .click();
  await expect(bos).toHaveAttribute("aria-pressed", "true");
  await setup
    .getByRole("button", { name: "Ready to begin", exact: true })
    .click();
  await expect(setup.locator(".campaign-review")).toContainText(
    "Bantuan Operasional Sekolah",
  );
  await setup
    .getByRole("button", { name: "Starting world number ?", exact: true })
    .focus();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await expect(setup).toBeVisible();
  const chooser = page.waitForEvent("filechooser");
  await setup
    .getByRole("button", { name: "Import a saved campaign", exact: true })
    .click();
  await (
    await chooser
  ).setFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from("{}"),
  });
  await expect(setup.getByRole("alert")).toContainText(
    "not a valid regional-economy save",
  );
  await expect(setup.locator(".campaign-review")).toContainText(
    "Bantuan Operasional Sekolah",
  );
  expect(await stored(page, AUTOSAVE_KEY)).toBeNull();
});

test("a failed final save remains exportable from the ending and can be retried", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (
      this: IDBDatabase,
      storeNames: string | string[],
      mode?: IDBTransactionMode,
      options?: IDBTransactionOptions,
    ) {
      if ((window as any).__failFinalSave && mode === "readwrite")
        throw new DOMException("Storage quota test", "QuotaExceededError");
      return original.call(this, storeNames, mode, options);
    } as typeof original;
  });
  await start(page);
  let game = initialQuarter(39);
  for (let q = 0; q < 19; q++)
    game = resolveQuarter(game, basePlan(game), calm);
  await importGame(page, game);
  await page.evaluate(() => {
    (window as any).__failFinalSave = true;
  });
  await page.getByTestId("advance-quarter").click();
  const ending = page.getByTestId("campaign-end");
  await expect(ending).toBeVisible();
  await expect(ending.getByRole("alert")).toContainText("Saving failed");
  expect((await stored(page, AUTOSAVE_KEY)).state.simulation.month).toBe(57);
  const event = page.waitForEvent("download");
  await ending
    .getByRole("button", { name: "Export results", exact: true })
    .click();
  const download = await event;
  expect(
    parseQuarter(await readFile((await download.path())!, "utf8")).simulation
      .month,
  ).toBe(60);
  await page.evaluate(() => {
    (window as any).__failFinalSave = false;
  });
  await ending.getByRole("button", { name: "Retry save", exact: true }).click();
  await expect
    .poll(async () => (await stored(page, AUTOSAVE_KEY)).state.simulation.month)
    .toBe(60);
  await expect(ending.getByRole("alert")).toHaveCount(0);
  await page.reload();
  await expect(ending).toBeVisible();
});

for (const language of ["en", "id"] as const)
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
  ])
    test(`campaign milestones fit ${viewport.width}×${viewport.height} in ${language}`, async ({
      page,
    }, testInfo) => {
      const t = (en: string, id: string) => (language === "en" ? en : id);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setViewportSize(viewport);
      await page.addInitScript(
        (value) => localStorage.setItem("indonesia-presidency-language", value),
        language,
      );
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/");
      const setup = page.getByTestId("campaign-setup");
      await expect(setup).toBeVisible();
      const verify = async (name: string) => {
        const dialog = page.getByRole("dialog");
        expect(
          await dialog.evaluate((node) => {
            const box = node.getBoundingClientRect();
            return (
              box.left >= 0 &&
              box.right <= innerWidth &&
              box.top >= 0 &&
              box.bottom <= innerHeight &&
              node.scrollWidth <= node.clientWidth
            );
          }),
        ).toBe(true);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        const axe = await new AxeBuilder({ page })
          .include(".campaign-dialog")
          .withTags(["wcag2a", "wcag2aa"])
          .analyze();
        expect(axe.violations).toEqual([]);
        await page.screenshot({
          path: testInfo.outputPath(
            `${name}-${language}-${viewport.width}.png`,
          ),
        });
      };
      await verify("start-mandate");
      await page.keyboard.press("Escape");
      await expect(setup).toBeVisible();
      await page
        .getByRole("button", {
          name: t("Choose opening policies", "Pilih kebijakan awal"),
          exact: true,
        })
        .click();
      await setup
        .getByRole("button", { name: /^Bantuan Operasional Sekolah / })
        .click();
      await setup.getByRole("button", { name: /^PLTS Surya / }).click();
      await expect(
        setup.locator('.campaign-policy-list [aria-pressed="true"]'),
      ).toHaveCount(2);
      await expect(
        setup.locator(".campaign-policy-list button:disabled"),
      ).toHaveCount(4);
      await verify("start-policies");
      await page
        .getByRole("button", {
          name: t("Review campaign", "Tinjau permainan"),
          exact: true,
        })
        .click();
      const seedInput = setup.getByRole("textbox", {
        name: t("Starting world number", "Nomor dunia awal"),
        exact: true,
      });
      await seedInput.fill("invalid");
      await expect(
        setup.getByRole("button", {
          name: t("Start campaign", "Mulai permainan"),
          exact: true,
        }),
      ).toBeDisabled();
      await seedInput.fill("0");
      await seedInput.press("Tab");
      await verify("start-review");
      await page
        .getByRole("button", {
          name: t("Start campaign", "Mulai permainan"),
          exact: true,
        })
        .click();
      await expect(setup).toHaveCount(0);
      await expect
        .poll(async () => (await stored(page, DRAFT_KEY))?.plan.policies)
        .toEqual(["bos", "plts"]);
      expect((await stored(page, AUTOSAVE_KEY)).state.simulation.seed).toBe(0);
      expect((await stored(page, AUTOSAVE_KEY)).state.simulation.month).toBe(0);
      await page.reload();
      await expect
        .poll(async () => (await stored(page, DRAFT_KEY))?.plan.policies)
        .toEqual(["bos", "plts"]);
      let game = initialQuarter(19);
      const portfolio: PolicyId[] = [
        "plts",
        "bos",
        "jkn",
        "pupuk",
        "kur",
        "water",
        "bpn",
        "pltp",
        "tol-laut",
      ];
      for (let quarter = 0; quarter < 20; quarter++) {
        // Finished builds end themselves; launch at most two per quarter.
        const wanted = portfolio
          .slice(0, (quarter + 1) * 2)
          .filter((id) => !game.policies.find((p) => p.id === id)?.finished);
        const running = game.policies.filter((p) => p.active).map((p) => p.id);
        game = resolveQuarter(
          game,
          {
            ...basePlan(game),
            policies: [
              ...wanted.filter((id) => running.includes(id)),
              ...wanted.filter((id) => !running.includes(id)).slice(0, 2),
            ].slice(0, 8),
          },
          calm,
        );
      }
      await importGame(page, game);
      const ending = page.getByTestId("campaign-end");
      await expect(ending).toBeVisible();
      await expect(
        ending.getByRole("heading", {
          name: t("Full mandate achieved", "Seluruh mandat tercapai"),
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        ending.locator('.campaign-checklist tbody tr[data-met="true"]'),
      ).toHaveCount(6);
      await expect(
        page.getByTestId("regional-achievement").locator("li"),
      ).toHaveCount(9);
      await verify("end-verdict");
      await page.getByTestId("regional-achievement").scrollIntoViewIfNeeded();
      await verify("end-achievement");
      const downloadEvent = page.waitForEvent("download");
      await ending
        .getByRole("button", {
          name: t("Export results", "Ekspor hasil"),
          exact: true,
        })
        .click();
      const download = await downloadEvent;
      const filename = await download.path();
      expect(parseQuarter(await readFile(filename!, "utf8"))).toEqual(game);
      await ending
        .getByRole("button", {
          name: t("Play a new campaign", "Mainkan permainan baru"),
          exact: true,
        })
        .click();
      await expect(setup).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(ending).toBeVisible();
      await ending
        .getByRole("button", {
          name: t("Read full report", "Baca laporan lengkap"),
          exact: true,
        })
        .click();
      await expect(page.getByTestId("quarter-report")).toBeVisible();
      await page.keyboard.press("Escape");
      await page
        .getByRole("button", {
          name: t("Campaign results", "Hasil permainan"),
          exact: true,
        })
        .last()
        .click();
      await expect(ending).toBeVisible();
      await page.reload();
      await expect(ending).toBeVisible();
      expect(errors).toEqual([]);
    });

for (const language of ["en", "id"] as const)
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
  ]) {
    test(`regional construction fits ${viewport.width}×${viewport.height} in ${language}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await start(page, language);
      const openRegions = async () => {
        await page
          .getByRole("navigation")
          .getByRole("button", {
            name: language === "en" ? "Regions" : "Wilayah",
            exact: true,
          })
          .click();
      };
      await openRegions();
      await page.locator('[data-region-card="java"]').click();
      const graph = page.locator(".eco-relationships");
      await expect(graph).toBeVisible();
      await expect(graph.locator(".eco-graph-inspector")).toHaveCount(0);
      await expect(graph.locator('[data-graph-node^="policy:"]')).toHaveCount(
        0,
      );
      await expect(page.locator(".eco-region-tabs button")).toHaveCount(3);
      await expect(page.locator(".eco-construction")).toHaveCount(0);
      await expect(page.locator(".eco-region-tabs")).not.toContainText(
        language === "en"
          ? "Policies & construction"
          : "Kebijakan & pembangunan",
      );
      const graphOpening = initialQuarter();
      const graphFirst = resolveQuarter(
        graphOpening,
        { ...basePlan(graphOpening), policies: ["plts", "bpn"] },
        calm,
      );
      const graphGame = resolveQuarter(
        graphFirst,
        { ...basePlan(graphFirst), policies: ["plts", "bpn", "pkh"] },
        calm,
      );
      await importGame(page, graphGame);
      await openRegions();
      await page.locator('[data-region-card="java"]').click();
      await expect(graph.locator('[data-graph-node^="policy:"]')).toHaveCount(
        3,
      );
      await expect(
        graph.locator(
          'path[data-from="policy:plts"][data-to="energy"]:not(.eco-graph-flow)',
        ),
      ).toHaveCount(1);
      await graph.locator('[data-graph-node="energy"]').focus();
      await page.keyboard.press("Enter");
      await expect(graph.locator('[data-graph-node="energy"]')).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(
        graph.locator(
          'path[data-from="energy"][data-to="industry:technology"]:not(.eco-graph-flow)',
        ),
      ).toHaveAttribute("data-highlighted", "true");
      const graphAccess = await new AxeBuilder({ page })
        .include(".eco-relationships")
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      expect(graphAccess.violations).toEqual([]);
      expect(
        await graph.evaluate((node) => node.scrollWidth <= node.clientWidth),
      ).toBe(true);
      await graph
        .locator('[data-graph-node="policy:plts"]')
        .scrollIntoViewIfNeeded();
      await page.screenshot({
        path: testInfo.outputPath(
          `relationships-${language}-${viewport.width}.png`,
        ),
      });
      await graph.locator('[data-graph-node="importDuty"]').click();
      await expect(
        graph.locator(
          'path[data-from="imports"][data-to="importDuty"]:not(.eco-graph-flow)',
        ),
      ).toHaveAttribute("data-highlighted", "true");
      await page.screenshot({
        path: testInfo.outputPath(
          `relationships-tax-${language}-${viewport.width}.png`,
        ),
      });
      await expect(
        graph.locator(
          'path[data-from="policy:bpn"][data-to="vat"]:not(.eco-graph-flow)',
        ),
      ).toHaveCount(1);
      await expect(
        graph.locator(
          'path[data-from="policy:pkh"][data-to="consumption"]:not(.eco-graph-flow)',
        ),
      ).toHaveCount(1);
      await importGame(page, initialQuarter());
      await openRegions();
      await page.locator('[data-region-card="java"]').click();
      await expect(graph).toContainText(
        language === "en"
          ? "No policies in this region yet"
          : "Belum ada kebijakan di wilayah ini",
      );
      await expect(page.locator(".eco-regional-policy-table")).toHaveCount(0);
      const opening = initialQuarter();
      const plan = basePlan(opening);
      plan.policies = ["plts", "irrigation"];
      const game = resolveQuarter(opening, plan, calm);
      const java = game.simulation.projects.find(
        (project) => project.id === "plts:java",
      )!;
      java.progress = 99.99999999999999;
      java.spent = java.cost;
      java.completed = false;
      const paused = game.simulation.projects.find(
        (project) => project.id === "irrigation:java",
      )!;
      paused.paused = true;
      await importGame(page, game);
      java.progress = 100;
      java.completed = true;
      await openRegions();
      for (const region of REGION_IDS) {
        await expect(
          page.locator(`[data-region-card="${region}"]`),
        ).toContainText(language === "en" ? "Construction" : "Pembangunan");
        await page.locator(`[data-region-card="${region}"]`).click();
        await page
          .getByRole("button", {
            name: language === "en" ? "Industries" : "Industri",
            exact: true,
          })
          .click();
        await expect(page.locator(".eco-construction")).toHaveCount(0);
        if (region === "java") {
          const industryButton = page
            .locator(".eco-industry-table .eco-industry-button")
            .first();
          expect(
            await industryButton.evaluate(
              (node) => getComputedStyle(node).textDecorationLine,
            ),
          ).toBe("none");
          await industryButton.scrollIntoViewIfNeeded();
          await page.screenshot({
            path: testInfo.outputPath(
              `industry-buttons-${language}-${viewport.width}.png`,
            ),
          });
          await industryButton.click();
          await expect(page.locator(".eco-industry-detail")).toBeVisible();
          await expect(
            page.locator(".eco-industry-requirements li"),
          ).toHaveCount(5);
          await expect(
            page.locator(".eco-industry-requirements meter"),
          ).toHaveCount(0);
          await page.mouse.move(0, 0);
          const detailAccess = await new AxeBuilder({ page })
            .include(".eco-industry-detail")
            .withTags(["wcag2a", "wcag2aa"])
            .analyze();
          expect(detailAccess.violations).toEqual([]);
          expect(
            await page
              .locator(".eco-industry-detail")
              .evaluate((node) => node.scrollWidth <= node.clientWidth),
          ).toBe(true);
          await page.screenshot({
            path: testInfo.outputPath(
              `industry-detail-${language}-${viewport.width}.png`,
            ),
          });
          await page
            .getByRole("button", {
              name:
                language === "en"
                  ? "Back to industries"
                  : "Kembali ke industri",
              exact: true,
            })
            .click();
        }
        await page
          .getByRole("button", {
            name: language === "en" ? "Relationships" : "Hubungan",
            exact: true,
          })
          .click();
        const policyCards = page.locator(".eco-graph-policy-card");
        await expect(policyCards).toHaveCount(2);
        await expect(policyCards.locator("small")).toHaveCount(2);
        await expect(
          policyCards.locator("button, dl, [data-project]"),
        ).toHaveCount(0);
        const constructionTab = page
          .locator(".eco-region-tabs")
          .getByRole("button", {
            name: language === "en" ? "Construction" : "Pembangunan",
            exact: true,
          });
        await constructionTab.focus();
        await page.keyboard.press("Enter");
        await expect(constructionTab).toHaveAttribute("aria-pressed", "true");
        await expect(graph).toHaveCount(0);
        const construction = page.locator(".eco-construction");
        await expect(construction.locator("li")).toHaveCount(2);
        for (const project of game.simulation.projects.filter((project) =>
          project.id.endsWith(`:${region}`),
        )) {
          const row = construction.locator(`[data-project="${project.id}"]`);
          await expect(
            graph.locator(
              `[data-graph-node="policy:${project.id.split(":")[0]}"] [data-project="${project.id}"]`,
            ),
          ).toHaveCount(0);
          await expect(row.getByRole("progressbar")).toHaveAttribute(
            "value",
            String(project.progress),
          );
          await expect(row).toContainText(
            project.completed
              ? language === "en"
                ? "Completed"
                : "Selesai"
              : project.paused
                ? language === "en"
                  ? "Paused"
                  : "Dijeda"
                : language === "en"
                  ? "Under construction"
                  : "Dalam pembangunan",
          );
        }
        expect(
          await page
            .locator(".eco-regions-panel:visible")
            .evaluate((node) => node.scrollWidth <= node.clientWidth),
        ).toBe(true);
        if (region === "java") {
          await construction
            .first()
            .evaluate((node) => node.scrollIntoView({ block: "start" }));
          const accessibility = await new AxeBuilder({ page })
            .include(".eco-graph-policy-card")
            .include(".eco-construction")
            .withTags(["wcag2a", "wcag2aa"])
            .analyze();
          expect(accessibility.violations).toEqual([]);
          await page.screenshot({
            path: testInfo.outputPath(
              `construction-${language}-${viewport.width}.png`,
            ),
          });
          await page
            .locator(".eco-region-tabs")
            .getByRole("button", {
              name: language === "en" ? "Relationships" : "Hubungan",
              exact: true,
            })
            .click();
          await expect(construction).toHaveCount(0);
          const policyButton = page.locator(".eco-graph-policy-card").first();
          expect(
            await policyButton.evaluate(
              (node) => getComputedStyle(node).textDecorationLine,
            ),
          ).toBe("none");
          await policyButton.scrollIntoViewIfNeeded();
          await page.screenshot({
            path: testInfo.outputPath(
              `policy-buttons-${language}-${viewport.width}.png`,
            ),
          });
        }
        await page
          .getByRole("button", {
            name: language === "en" ? "All regions" : "Semua wilayah",
            exact: true,
          })
          .click();
      }
      await page.locator('[data-region-card="java"]').click();
      await page.mouse.move(0, 0);
      await page.locator(".economy-dossier").focus();
      await expect(page.getByRole("tooltip")).toHaveCount(0);
      await page.keyboard.press("Escape");
      await expect(page.locator(".economy-dossier")).toBeHidden();
      // Construction markers are drawn in the 3D scene, so check the map is back.
      await expect(page.locator(".q-map-brief")).toBeVisible();
      await page.screenshot({
        path: testInfo.outputPath(
          `map-construction-${language}-${viewport.width}.png`,
        ),
      });
      await openRegions();
      await page.locator('[data-region-card="java"]').click();
      await page
        .locator(".eco-region-tabs")
        .getByRole("button", {
          name: language === "en" ? "Relationships" : "Hubungan",
          exact: true,
        })
        .click();
      await page.locator(".eco-graph-policy-card").first().click();
      await expect(
        page.locator(".eco-graph-policy-card").first(),
      ).toHaveAttribute("aria-pressed", "true");
      expect(errors).toEqual([]);
    });
  }

for (const language of ["en", "id"] as const)
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
  ]) {
    test(`mandate and power report fit ${viewport.width}×${viewport.height} in ${language}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await start(page, language);
      // The energy hint lives on the Economy screen's foundation strip.
      await page
        .getByRole("navigation")
        .getByRole("button", {
          name: language === "en" ? "Economy" : "Ekonomi",
          exact: true,
        })
        .click();
      const energyHint = page.getByRole("button", {
        name: language === "en" ? "Energy ?" : "Energi ?",
        exact: true,
      });
      await energyHint.focus();
      await expect(page.getByRole("tooltip")).toContainText(
        language === "en" ? "grid reliability" : "keandalan jaringan",
      );
      await page.getByRole("tooltip").hover();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("tooltip")).toHaveCount(0);
      await page.keyboard.press("Escape");
      await page
        .getByRole("button", {
          name: language === "en" ? "Campaign goals" : "Target permainan",
          exact: true,
        })
        .click();
      const goals = page.getByTestId("campaign-goals");
      await expect(goals).toBeVisible();
      await expect(goals.locator("tbody tr")).toHaveCount(6);
      const accessibility = await new AxeBuilder({ page })
        .include('[data-testid="campaign-goals"]')
        .include('[data-testid="power-report"]')
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(accessibility.violations).toEqual([]);
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await page.screenshot({
        path: testInfo.outputPath(`mandate-${language}-${viewport.width}.png`),
      });
      const power = page.getByTestId("power-report");
      await power
        .getByRole("heading")
        .evaluate((node) => node.scrollIntoView({ block: "start" }));
      await expect(power).toBeVisible();
      await expect(power.locator("tbody")).toContainText("Jawa-Madura-Bali");
      expect(
        await dialog.evaluate((node) => {
          const bounds = node.getBoundingClientRect();
          return (
            bounds.left >= 0 &&
            bounds.right <= innerWidth &&
            bounds.top >= 0 &&
            bounds.bottom <= innerHeight &&
            node.scrollWidth <= node.clientWidth
          );
        }),
      ).toBe(true);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`power-${language}-${viewport.width}.png`),
      });
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(
        page.getByRole("button", {
          name: language === "en" ? "Campaign goals" : "Target permainan",
          exact: true,
        }),
      ).toBeFocused();
      expect(errors).toEqual([]);
    });
  }

async function stored(page: Page, key: string) {
  return page.evaluate(
    ({ databaseName, key }) =>
      new Promise<any>((resolve, reject) => {
        const request = indexedDB.open(databaseName, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains("saves")) {
            db.close();
            resolve(null);
            return;
          }
          const transaction = db.transaction("saves", "readonly");
          const read = transaction.objectStore("saves").get(key);
          transaction.oncomplete = () => {
            db.close();
            resolve(read.result ?? null);
          };
          transaction.onerror = () => {
            db.close();
            reject(transaction.error);
          };
        };
      }),
    { databaseName: ECONOMY_DATABASE, key },
  );
}

async function start(page: Page, language: Language = "en") {
  await page.addInitScript(
    (value) => localStorage.setItem("indonesia-presidency-language", value),
    language,
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page
    .getByRole("button", {
      name:
        language === "en" ? "Choose opening policies" : "Pilih kebijakan awal",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: language === "en" ? "Review campaign" : "Tinjau permainan",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: language === "en" ? "Start campaign" : "Mulai permainan",
      exact: true,
    })
    .click();
  await expect
    .poll(
      async () => (await stored(page, AUTOSAVE_KEY))?.state.simulation.month,
    )
    .toBe(0);
}

async function goPolicies(page: Page, language: Language = "en") {
  if (!(await page.locator(".policy-workspace-dialog").count()))
    await page
      .getByRole("navigation")
      .getByRole("button", {
        name: language === "en" ? "Policies & taxes" : "Kebijakan & pajak",
        exact: true,
      })
      .click();
  const tab = page.getByRole("tab", {
    name: language === "en" ? /^Policies\b/ : /^Kebijakan\b/,
  });
  if (await tab.count()) await tab.click();
}

async function openPolicy(page: Page, id: PolicyId) {
  await page.locator(`[data-manage-policy="${id}"]`).click();
  await page.getByRole("tab", { name: /^(Funding|Pendanaan)$/ }).click();
  await expect(page.getByTestId("regional-spending")).toBeVisible();
}

async function back(page: Page, language: Language = "en") {
  await page
    .getByRole("button", {
      name: language === "en" ? "Back to policies" : "Kembali ke kebijakan",
      exact: true,
    })
    .click();
}

async function addPolicy(page: Page, id: PolicyId) {
  await openPolicy(page, id);
  await page.getByTestId("policy-start").click();
  await back(page);
}

async function savedGame(page: Page): Promise<QuarterGame> {
  return parseQuarter(JSON.stringify(await stored(page, AUTOSAVE_KEY)));
}

async function importGame(page: Page, game: QuarterGame) {
  if (await page.locator(".policy-workspace-dialog").count())
    await page.locator(".policy-workspace-dialog .dialog-top button").click();
  await page.locator("input[type=file]").setInputFiles({
    name: "economy-campaign.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(quarterEnvelope(game))),
  });
  await expect
    .poll(
      async () => (await stored(page, AUTOSAVE_KEY))?.state.simulation.month,
    )
    .toBe(game.simulation.month);
}

async function advance(page: Page, fromMonth: number) {
  if (await page.locator(".policy-workspace-dialog").count())
    await page.locator(".policy-workspace-dialog .dialog-top button").click();
  await page.getByTestId("advance-quarter").click();
  await expect
    .poll(
      async () => (await stored(page, AUTOSAVE_KEY))?.state.simulation.month,
      { timeout: 25000 },
    )
    .toBe(fromMonth + 3);
}

test("33 policies show foundation or industry effects and regional edits preserve each budget", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await start(page);
  await goPolicies(page);
  await expect(page.getByTestId("policy-card")).toHaveCount(33);
  await expect(
    page.locator("select, details, summary, input[type=range]"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /prioritize|priority region/i }),
  ).toHaveCount(0);
  const bpn = page
    .getByTestId("policy-card")
    .filter({ has: page.locator('[data-manage-policy="bpn"]') });
  await expect(bpn).toContainText("No direct foundation or industry effect");
  const replant = page
    .getByTestId("policy-card")
    .filter({ has: page.locator('[data-manage-policy="palm-replanting"]') });
  await expect(replant).toContainText("Initially");
  await expect(replant).toContainText("Later");
  await page
    .getByLabel("Search policies", { exact: true })
    .fill("no-such-policy");
  await expect(
    page.getByRole("heading", { name: "No matching policies" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Reset filters", exact: true })
    .click();
  await openPolicy(page, "plts");
  await expect(page.getByRole("radio")).toHaveCount(27);
  await expect(page.getByRole("radio").first()).toBeDisabled();
  expect(
    (await savedGame(page)).policies.filter((policy) => policy.active),
  ).toHaveLength(0);
  await page.getByTestId("policy-start").click();
  const budget = page.locator(".eco-spending-section .eco-spend-total strong");
  const beforeBudget = await budget.innerText();
  const rows = page.locator(".eco-spending-table tbody tr");
  await expect(rows).toHaveCount(9);
  const beforeJava = await rows.nth(1).locator("td").nth(1).innerText();
  for (let index = 0; index < 9; index++) {
    const level = index < 3 ? "High" : index < 5 ? "Medium" : "Low";
    await rows
      .nth(index)
      .getByRole("radio", { name: level, exact: true })
      .check();
  }
  await expect(budget).toHaveText(beforeBudget);
  expect(await rows.nth(1).locator("td").nth(1).innerText()).not.toBe(
    beforeJava,
  );
  await expect
    .poll(
      async () =>
        (await stored(page, DRAFT_KEY))?.plan.regionalSpending.plts.papua,
    )
    .toBe("low");
  const draft = (await stored(page, DRAFT_KEY)).plan as QuarterPlan;
  expect(Object.keys(draft.regionalSpending)).toHaveLength(33);
  expect(REGION_IDS.map((id) => draft.regionalSpending.plts[id])).toEqual([
    "high",
    "high",
    "high",
    "medium",
    "medium",
    "low",
    "low",
    "low",
    "low",
  ]);
  await page.reload();
  await goPolicies(page);
  await openPolicy(page, "plts");
  await expect(
    page
      .locator(".eco-spending-table tbody tr")
      .nth(8)
      .getByRole("radio", { name: "Low", exact: true }),
  ).toBeChecked();
  await advance(page, 0);
  const completed = await savedGame(page);
  expect(completed.regionalSpending.plts).toEqual(draft.regionalSpending.plts);
  expect(
    completed.policies.find((policy) => policy.id === "plts")?.active,
  ).toBe(true);
  expect(completed.simulation.provinces).toHaveLength(38);
  await expect
    .poll(async () => (await stored(page, DRAFT_KEY)) === null)
    .toBe(true);
  // The 3D map draws ASEAN neighbours as flat grey background land.
  expect(requests.some((url) => url.includes("/data/region.geojson"))).toBe(
    true,
  );
});

test("two launch slots and eight active slots remain separate limits", async ({
  page,
}) => {
  await start(page);
  await goPolicies(page);
  await addPolicy(page, "bos");
  await addPolicy(page, "plts");
  await openPolicy(page, "jkn");
  await expect(page.getByTestId("policy-start")).toBeDisabled();
  await expect(page.locator(".eco-policy-action")).toContainText(
    "Two new policies are already planned",
  );
  let game = initialQuarter(61);
  const portfolio = POLICY_IDS.slice(0, 8);
  for (let quarter = 0; quarter < 4; quarter++)
    game = resolveQuarter(
      game,
      { ...basePlan(game), policies: portfolio.slice(0, (quarter + 1) * 2) },
      calm,
    );
  await importGame(page, game);
  await goPolicies(page);
  const backButton = page.getByRole("button", {
    name: "Back to policies",
    exact: true,
  });
  if (await backButton.isVisible()) await backButton.click();
  await openPolicy(page, "plts");
  await expect(page.getByTestId("policy-start")).toBeDisabled();
  await expect(page.locator(".eco-policy-action")).toContainText(
    "All eight policy slots are in use",
  );
  await back(page);
  await openPolicy(page, "mbg");
  await page.getByTestId("policy-start").click();
  await back(page);
  await openPolicy(page, "plts");
  await expect(page.getByTestId("policy-start")).toBeEnabled();
  await page.getByTestId("policy-start").click();
  await expect
    .poll(async () =>
      (await stored(page, DRAFT_KEY))?.plan.policies.includes("plts"),
    )
    .toBe(true);
  expect((await stored(page, DRAFT_KEY)).plan.policies).toHaveLength(8);
});

test("saves and imports the new model while rejecting malformed and old saves", async ({
  page,
}) => {
  await start(page);
  await advance(page, 0);
  const completed = await savedGame(page);
  expect(completed.version).toBe(8);
  for (const raw of [
    { schemaVersion: 6, state: completed },
    {
      ...quarterEnvelope(completed),
      state: { ...completed, regionalSpending: {} },
    },
  ]) {
    await page.locator("input[type=file]").setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(raw)),
    });
    await expect(page.getByRole("alert")).toContainText(
      /valid|version|supported|save/i,
    );
    expect((await savedGame(page)).simulation.month).toBe(3);
  }
  await importGame(page, completed);
  expect(await savedGame(page)).toEqual(completed);
});

test("six taxes share the quarterly draft, undo and reset without using policy slots", async ({
  page,
}) => {
  await start(page);
  await goPolicies(page);
  await page.getByRole("tab", { name: /^Taxes\b/ }).click();
  const cards = page.locator(".q-tax-card");
  await expect(cards).toHaveCount(6);
  for (const card of await cards.all())
    await card.locator('input[value="increased"]').check();
  await expect
    .poll(
      async () =>
        Object.values((await stored(page, DRAFT_KEY))?.plan.taxes ?? {}).filter(
          (level) => level === "increased",
        ).length,
    )
    .toBe(6);
  expect((await stored(page, DRAFT_KEY)).plan.policies).toHaveLength(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(cards.last().locator('input[value="standard"]')).toBeChecked();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  for (const card of await cards.all())
    await expect(card.locator('input[value="standard"]')).toBeChecked();
  await expect
    .poll(async () => (await stored(page, DRAFT_KEY)) === null)
    .toBe(true);
  const corporate = page.locator('[data-tax="corporateIncome"]');
  const hint = corporate.getByRole("button", {
    name: "Corporate income tax (PPh badan) ?",
    exact: true,
  });
  await hint.focus();
  await expect(page.getByRole("tooltip")).toContainText("company profits");
  await page.getByRole("tooltip").hover();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await expect(corporate).toBeVisible();
  await corporate.locator('input[value="relief"]').check();
  await advance(page, 0);
  const saved = await savedGame(page);
  expect(saved.taxes.corporateIncome).toBe("relief");
  expect(saved.policies).toHaveLength(0);
  await page.getByRole("button", { name: "Report", exact: true }).click();
  await expect(page.getByTestId("quarter-report")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("the DPR votes on tax bills, and softening can turn a vote", async ({
  page,
}) => {
  await start(page);
  await goPolicies(page);
  await page.getByRole("tab", { name: /^Taxes\b/ }).click();
  for (const card of await page.locator(".q-tax-card").all())
    await card.locator('input[value="increased"]').check();
  await expect(page.getByTestId("tax-dpr-vat")).toContainText("DPR: fails");
  await page
    .getByTestId("tax-dpr-vat")
    .getByRole("button", { name: "See DPR vote", exact: true })
    .click();
  const dpr = page.locator(".dpr-dialog");
  await expect(
    dpr.locator('.dpr-tabs button[aria-pressed="true"]'),
  ).toContainText("Value-added tax");
  await expect(dpr.locator(".dpr-table tbody tr")).toHaveCount(8);
  await dpr.getByRole("button", { name: /^Villages & farmers/ }).click();
  await expect(dpr.locator('.dpr-table tr[data-dim="true"]')).toHaveCount(4);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", {
      name: "A tax bill will fail in the DPR",
      exact: true,
    }),
  ).toBeVisible();
  await goPolicies(page);
  await page.getByRole("tab", { name: /^Taxes\b/ }).click();
  for (const card of await page.locator(".q-tax-card").all())
    await card.locator('input[value="standard"]').check();
  await page.locator('#tax-card-vat input[value="increased"]').check();
  await page
    .getByTestId("tax-dpr-vat")
    .getByRole("button", { name: /^Soften:/ })
    .click();
  await expect(page.getByTestId("tax-dpr-vat")).toContainText("DPR: passes");
  await expect
    .poll(async () => (await stored(page, DRAFT_KEY))?.plan.soften)
    .toEqual(["vat"]);
  await advance(page, 0);
  const saved = await savedGame(page);
  expect(saved.taxes.vat).toBe("increased");
  expect(saved.politics.softened.vat).toBe("standard");
  expect(saved.politics.lastVotes[0].passed).toBe(true);
});

test("a rejected APBN freezes launches and protests show on the map", async ({
  page,
}) => {
  await start(page);
  let game = initialQuarter(19);
  for (let q = 0; q < 2; q++) game = resolveQuarter(game, basePlan(game), calm);
  game.politics.approval = 10;
  game = resolveQuarter(game, basePlan(game), calm);
  expect(game.politics.frozenUntil).toBe(21);
  expect(game.politics.approval).toBeLessThan(30);
  await importGame(page, game);
  await expect(
    page.getByRole("button", {
      name: "Street protests: coalition support is slipping",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /^APBN rejected: no launches until/ })
    .click();
  const dpr = page.locator(".dpr-dialog");
  await expect(
    dpr.locator('.dpr-tabs button[aria-pressed="true"]'),
  ).toContainText("APBN");
  await expect(dpr).toContainText("rejected");
  expect(
    (await new AxeBuilder({ page }).include(".dpr-dialog").analyze())
      .violations,
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await goPolicies(page);
  await expect(page.locator(".eco-limit-banner")).toContainText(
    "Budget frozen",
  );
});

test("falling energy opens the electricity policy from the map", async ({
  page,
}) => {
  await start(page);
  let game = initialQuarter(19);
  const portfolio: PolicyId[] = ["jkn", "ckg", "klinik", "water"];
  for (let q = 0; q < 12; q++) {
    const plan = basePlan(game);
    plan.policies = portfolio
      .slice(0, (q + 1) * 2)
      .filter((id) => !game.policies.find((p) => p.id === id)?.finished);
    game = resolveQuarter(game, plan, calm);
    if (game.receipt!.after.energy < game.receipt!.before.energy - 0.1) break;
  }
  await importGame(page, game);
  await page
    .getByRole("button", {
      name: "Energy is falling: review power investment",
      exact: true,
    })
    .click();
  await expect(page.getByTestId("policy-briefing")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "PLTS Surya", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("policy-start")).toBeEnabled();
});

test("the twentieth quarter finishes with campaign results and a development report", async ({
  page,
}) => {
  await start(page);
  let game = initialQuarter(39);
  for (let quarter = 0; quarter < 19; quarter++)
    game = resolveQuarter(game, basePlan(game), calm);
  await importGame(page, game);
  await advance(page, 57);
  await expect(page.getByTestId("campaign-end")).toBeVisible();
  await expect(page.locator(".campaign-checklist tbody tr")).toHaveCount(6);
  await page
    .getByRole("button", { name: "Read full report", exact: true })
    .click();
  await expect(
    page.getByTestId("quarter-report").getByRole("heading", {
      name: "Five-year development report",
      exact: true,
    }),
  ).toBeVisible();
  expect((await stored(page, AUTOSAVE_KEY)).state.simulation.month).toBe(60);
  await expect(page.getByTestId("advance-quarter")).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("campaign-end")).toBeVisible();
  await page.keyboard.press("Escape");
  expect((await savedGame(page)).simulation.month).toBe(60);
});

for (const language of ["en", "id"] as const)
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
  ]) {
    test(`policy details and region foundations fit ${viewport.width}×${viewport.height} in ${language}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await start(page, language);
      await goPolicies(page, language);
      await openPolicy(page, "plts");
      await page.getByTestId("policy-start").click();
      const last = page
        .locator(".eco-spending-table tbody tr")
        .last()
        .getByRole("radio", {
          name: language === "en" ? "High" : "Tinggi",
          exact: true,
        });
      await last.check();
      await expect(last).toBeFocused();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(
          `policy-panel-${language}-${viewport.width}.png`,
        ),
      });
      await back(page, language);
      const manage = page.locator('[data-manage-policy="plts"]');
      await expect(manage).toBeFocused();
      await page
        .getByRole("combobox", {
          name: language === "en" ? "Policy category" : "Kategori kebijakan",
          exact: true,
        })
        .click();
      const list = page.getByRole("listbox");
      await expect(list).toBeVisible();
      const rect = await list.boundingBox();
      expect(rect).toBeTruthy();
      expect(rect!.x).toBeGreaterThanOrEqual(0);
      expect(rect!.y).toBeGreaterThanOrEqual(0);
      expect(rect!.x + rect!.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(rect!.y + rect!.height).toBeLessThanOrEqual(viewport.height + 1);
      await page.keyboard.press("Escape");
      await expect(list).toHaveCount(0);
      await page.locator(".policy-workspace-dialog .dialog-top button").click();
      await page
        .getByRole("navigation")
        .getByRole("button", {
          name: language === "en" ? "Regions" : "Wilayah",
          exact: true,
        })
        .click();
      await expect(page.locator("[data-region-card]")).toHaveCount(9);
      await page.locator('[data-region-card="java"]').click();
      for (const label of language === "en"
        ? ["Education", "Infrastructure", "Energy", "Food", "Health"]
        : ["Pendidikan", "Infrastruktur", "Energi", "Pangan", "Kesehatan"])
        await expect(
          page.getByRole("meter", { name: label, exact: true }),
        ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(page.locator("select, details, summary")).toHaveCount(0);
      await page.screenshot({
        path: testInfo.outputPath(`regions-${language}-${viewport.width}.png`),
      });
    });
  }

test("a WebGL failure keeps regional selection and quarter progression available", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      kind: string,
      ...args: any[]
    ) {
      if (["webgl", "webgl2", "experimental-webgl"].includes(kind)) return null;
      return original.apply(this, [kind, ...args] as any);
    } as typeof original;
  });
  await start(page);
  await expect(
    page.getByRole("button", { name: /retry.*3d|try.*3d|retry/i }).first(),
  ).toBeVisible();
  await expect(page.locator("[data-province-id]")).toHaveCount(38);
  await expect(page.locator(".neighbor-shape, .neighbor-label")).toHaveCount(0);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Regions", exact: true })
    .click();
  await page.locator('[data-region-card="papua"]').click();
  await expect(page.locator(".eco-region-heading h2")).toHaveText("Papua");
  await page.getByRole("button", { name: "All regions", exact: true }).click();
  await expect(page.locator('[data-region-card="papua"]')).toBeFocused();
  await advance(page, 0);
  expect((await savedGame(page)).simulation.month).toBe(3);
});

test("the map has no layer picker and camera controls change the view", async ({
  page,
}) => {
  await start(page);
  const canvas = page.locator(".world-canvas canvas");
  await expect(canvas).toBeVisible({ timeout: 30000 });
  await expect(
    page.getByRole("combobox", { name: "Map layer", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  const original = await canvas.screenshot();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect
    .poll(async () => Buffer.compare(await canvas.screenshot(), original) !== 0)
    .toBe(true);
  const zoomed = await canvas.screenshot();
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await expect
    .poll(async () => Buffer.compare(await canvas.screenshot(), zoomed) !== 0)
    .toBe(true);
  const centered = await canvas.screenshot();
  await page.getByRole("button", { name: "Pan right", exact: true }).click();
  await expect
    .poll(async () => Buffer.compare(await canvas.screenshot(), centered) !== 0)
    .toBe(true);
  const panned = await canvas.screenshot();
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await expect
    .poll(async () => Buffer.compare(await canvas.screenshot(), panned) !== 0)
    .toBe(true);
});

test("worker startup failure preserves the completed campaign", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.addInitScript(() => {
    window.Worker = class {
      constructor() {
        throw new Error("Worker unavailable for recovery test");
      }
    } as unknown as typeof Worker;
  });
  await start(page);
  await page.getByTestId("advance-quarter").click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("alert")).toBeInViewport();
  await expect(page.getByTestId("advance-quarter")).toBeEnabled();
  expect((await savedGame(page)).simulation.month).toBe(0);
  expect((await stored(page, AUTOSAVE_KEY)).state.simulation.month).toBe(0);
});

test("a corrupt draft preserves the last completed quarter", async ({
  page,
}) => {
  await start(page);
  await advance(page, 0);
  const completed = await savedGame(page);
  await goPolicies(page);
  await addPolicy(page, "bos");
  await expect
    .poll(async () =>
      (await stored(page, DRAFT_KEY))?.plan.policies.includes("bos"),
    )
    .toBe(true);
  await page.evaluate(
    ({ databaseName, draftKey }) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(databaseName, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction("saves", "readwrite");
          const store = transaction.objectStore("saves");
          const read = store.get(draftKey);
          read.onsuccess = () =>
            store.put(
              {
                ...read.result,
                plan: { ...read.result.plan, regionalSpending: {} },
              },
              draftKey,
            );
          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          transaction.onerror = () => {
            db.close();
            reject(transaction.error);
          };
        };
      }),
    { databaseName: ECONOMY_DATABASE, draftKey: DRAFT_KEY },
  );
  await page.reload();
  await expect(page.getByRole("alert")).toContainText(
    "Your completed quarter is safe",
  );
  expect(await savedGame(page)).toEqual(completed);
  await expect(page.getByTestId("advance-quarter")).toBeEnabled();
});

test("a failed save retries the new result without advancing again", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.addInitScript(() => {
    const original = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (
      this: IDBDatabase,
      storeNames: string | string[],
      mode?: IDBTransactionMode,
      options?: IDBTransactionOptions,
    ) {
      if ((window as any).__economyFailStorage && mode === "readwrite")
        throw new DOMException("Storage quota test", "QuotaExceededError");
      return original.call(this, storeNames, mode, options);
    } as typeof original;
  });
  await start(page);
  await page.evaluate(() => {
    (window as any).__economyFailStorage = true;
  });
  await page.getByTestId("advance-quarter").click();
  await expect(page.getByRole("alert")).toContainText("Saving failed");
  await expect(page.getByRole("alert")).toBeInViewport();
  await expect(page.getByTestId("advance-quarter")).toBeEnabled();
  expect((await stored(page, AUTOSAVE_KEY)).state.simulation.month).toBe(0);
  await expect(page.locator(".q-header-center")).toContainText("Q2 2025");
  await page.evaluate(() => {
    (window as any).__economyFailStorage = false;
  });
  await page.getByRole("button", { name: "Retry save", exact: true }).click();
  await expect
    .poll(
      async () => (await stored(page, AUTOSAVE_KEY))?.state.simulation.month,
    )
    .toBe(3);
  const saved = await savedGame(page);
  expect(saved.simulation.month).toBe(3);
  await page.reload();
  expect(await savedGame(page)).toEqual(saved);
});

test("an unreadable completed save stays untouched until an explicit new campaign", async ({
  page,
}) => {
  await start(page);
  await advance(page, 0);
  const corrupt = await stored(page, AUTOSAVE_KEY);
  corrupt.state.regionalSpending = {};
  await page.evaluate(
    ({ databaseName, key, value }) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(databaseName, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction("saves", "readwrite");
          transaction.objectStore("saves").put(value, key);
          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          transaction.onerror = () => {
            db.close();
            reject(transaction.error);
          };
        };
      }),
    { databaseName: ECONOMY_DATABASE, key: AUTOSAVE_KEY, value: corrupt },
  );
  await page.reload();
  await expect(page.getByRole("alert")).toContainText(
    "The saved game could not be read",
  );
  await expect(page.getByTestId("plan-save-status")).toContainText(
    "Saved game needs recovery",
  );
  await expect(page.getByTestId("advance-quarter")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Export", exact: true }),
  ).toHaveCount(0);
  await goPolicies(page);
  expect(
    JSON.stringify(await stored(page, AUTOSAVE_KEY)) ===
      JSON.stringify(corrupt),
  ).toBe(true);
  await page.reload();
  await expect(page.getByTestId("plan-save-status")).toContainText(
    "Saved game needs recovery",
  );
  expect(
    JSON.stringify(await stored(page, AUTOSAVE_KEY)) ===
      JSON.stringify(corrupt),
  ).toBe(true);
  await page.getByRole("button", { name: "New campaign", exact: true }).click();
  await page
    .getByRole("button", { name: "Choose opening policies", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Review campaign", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start campaign", exact: true })
    .click();
  await expect
    .poll(
      async () => (await stored(page, AUTOSAVE_KEY))?.state.simulation.month,
    )
    .toBe(0);
  await expect(page.getByTestId("advance-quarter")).toBeEnabled();
  expect((await savedGame(page)).simulation.month).toBe(0);
});

test("reading an import locks advancement until the imported campaign is ready", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = File.prototype.text;
    File.prototype.text = function (this: File) {
      if (!(window as any).__delayEconomyImport) return original.call(this);
      return new Promise<string>((resolve, reject) => {
        (window as any).__releaseEconomyImport = () =>
          original.call(this).then(resolve, reject);
      });
    };
  });
  await start(page);
  let imported = initialQuarter(997);
  for (let quarter = 0; quarter < 2; quarter++)
    imported = resolveQuarter(imported, basePlan(imported), calm);
  await page.evaluate(() => {
    (window as any).__delayEconomyImport = true;
  });
  await page.locator("input[type=file]").setInputFiles({
    name: "delayed-economy-campaign.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(quarterEnvelope(imported))),
  });
  await expect
    .poll(() =>
      page.evaluate(() => typeof (window as any).__releaseEconomyImport),
    )
    .toBe("function");
  await expect(page.getByTestId("advance-quarter")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Export", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "New campaign", exact: true }),
  ).toBeDisabled();
  expect((await stored(page, AUTOSAVE_KEY)).state.simulation.month).toBe(0);
  await page.evaluate(() => (window as any).__releaseEconomyImport());
  await expect
    .poll(
      async () => (await stored(page, AUTOSAVE_KEY))?.state.simulation.month,
    )
    .toBe(6);
  await expect(page.getByTestId("advance-quarter")).toBeEnabled();
  expect(await savedGame(page)).toEqual(imported);
});

for (const language of ["en", "id"] as const)
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
  ])
    test(`the quarter report explains changes at ${viewport.width}×${viewport.height} in ${language}`, async ({
      page,
    }, testInfo) => {
      const t = (en: string, id: string) => (language === "en" ? en : id);
      await page.setViewportSize(viewport);
      await start(page, language);
      await expect(page.getByTestId("quarter-summary")).toBeDisabled();
      await advance(page, 0);
      // Reduced motion never opens the summary by itself.
      await expect(page.locator(".q-recap")).toHaveCount(0);
      const summary = page.getByTestId("quarter-summary");
      await expect(summary).toHaveText(t("Report", "Laporan"));
      // The report survives reloads without replaying the summary.
      await page.reload();
      await summary.click();
      const debrief = page.getByTestId("quarter-report");
      await expect(debrief).toBeVisible();
      await expect(page.locator(".q-recap")).toHaveCount(0);
      await expect(debrief.locator(".report-delivery-flow > div")).toHaveCount(
        4,
      );
      await debrief
        .getByRole("button", {
          name: t("Next: National impact", "Berikutnya: Dampak nasional"),
          exact: true,
        })
        .click();
      await debrief
        .getByRole("tab", {
          name: t("2 National impact", "2 Dampak nasional"),
          exact: true,
        })
        .click();
      const analysis = page.getByTestId("quarter-analysis");
      const selector = t("Report statistic", "Statistik laporan");
      for (const key of [
        "gdp",
        "poverty",
        "unemployment",
        "jobs",
        "realIncome",
        "inflation",
        "debt",
        "cash",
        "education",
        "infrastructure",
        "energy",
        "food",
        "health",
      ]) {
        await choose(page, selector, key);
        await expect(analysis.locator(".q-report-mechanism p")).not.toBeEmpty();
      }
      await choose(page, selector, "poverty");
      await expect(analysis.locator("svg")).toHaveAttribute(
        "aria-label",
        /^Poverty:|^Kemiskinan:/,
      );
      await choose(page, selector, "education");
      await expect(analysis.locator("svg")).toHaveAttribute(
        "aria-label",
        /^Education:|^Pendidikan:/,
      );
      await analysis
        .getByRole("button", {
          name: t("Sources of change ?", "Sumber perubahan ?"),
        })
        .focus();
      await expect(page.getByRole("tooltip")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("tooltip")).toHaveCount(0);
      await expect(debrief).toBeVisible();
      expect(
        await page.locator(".economy-report").evaluate((node) => {
          const box = node.getBoundingClientRect();
          const content = node.querySelector(".dialog-content")!;
          return (
            box.width > innerWidth * 0.9 &&
            box.height > innerHeight * 0.9 &&
            box.bottom <= innerHeight &&
            content.scrollWidth <= content.clientWidth
          );
        }),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`report-${language}-${viewport.width}.png`),
      });
      await analysis.locator(".q-report-mechanism").scrollIntoViewIfNeeded();
      await page.screenshot({
        path: testInfo.outputPath(
          `report-detail-${language}-${viewport.width}.png`,
        ),
      });
      await debrief
        .getByRole("tab", { name: t("3 Regions", "3 Wilayah"), exact: true })
        .click();
      await debrief
        .getByRole("heading", {
          name: t("Regional foundations", "Fondasi wilayah"),
          exact: true,
        })
        .scrollIntoViewIfNeeded();
      await page.screenshot({
        path: testInfo.outputPath(
          `report-regions-${language}-${viewport.width}.png`,
        ),
      });
      const access = await new AxeBuilder({ page })
        .include(".economy-report")
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      expect(access.violations).toEqual([]);
      for (const [en, id] of [
        ["1 What happened", "1 Yang terjadi"],
        ["2 National impact", "2 Dampak nasional"],
        ["4 Treasury", "4 Kas negara"],
        ["5 Full records", "5 Rincian lengkap"],
      ]) {
        await debrief
          .getByRole("tab", { name: t(en, id), exact: true })
          .click();
        if (en === "4 Treasury") {
          const flow = page.getByTestId("treasury-flow");
          await expect(flow).toHaveAttribute("data-playing", "false");
          await expect(flow).toHaveAttribute("data-step", "4");
          await expect(flow.locator(".report-flow-trace")).toHaveCount(0);
          for (let i = 0; i < 5; i++) {
            await flow.locator(".report-fiscal-steps button").nth(i).click();
            await expect(flow).toHaveAttribute("data-step", String(i));
            await expect(
              flow.locator(".report-flow-reading p"),
            ).not.toBeEmpty();
            await expect(
              flow.locator(".report-fiscal-steps button").nth(i),
            ).toHaveAttribute("aria-pressed", "true");
          }
        }
        const chapterAccess = await new AxeBuilder({ page })
          .include(".economy-report")
          .withTags(["wcag2a", "wcag2aa"])
          .analyze();
        expect(chapterAccess.violations).toEqual([]);
        expect(
          await debrief
            .locator(".report-stage")
            .evaluate((node) => node.scrollWidth <= node.clientWidth),
        ).toBe(true);
        await page.screenshot({
          path: testInfo.outputPath(
            `report-chapter-${en[0]}-${language}-${viewport.width}.png`,
          ),
        });
        if (en === "4 Treasury") {
          await page
            .locator(".report-settlement-flow")
            .scrollIntoViewIfNeeded();
          await page.screenshot({
            path: testInfo.outputPath(
              `report-treasury-flow-${language}-${viewport.width}.png`,
            ),
          });
        }
      }
      await page.keyboard.press("Escape");
      await expect(debrief).toHaveCount(0);
      await expect(summary).toBeFocused();
      await summary.click();
      await debrief
        .getByRole("tab", { name: t("3 Regions", "3 Wilayah"), exact: true })
        .click();
      await debrief.getByRole("button", { name: /^Papua / }).click();
      await debrief
        .getByRole("button", {
          name: t("Open region", "Buka wilayah"),
          exact: true,
        })
        .click();
      await expect(page.locator(".q-recap")).toHaveCount(0);
      await expect(
        page.getByRole("heading", { name: "Papua", exact: true }),
      ).toBeVisible();
    });

test("quarter playback runs once and subsequent reviews open the report", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await start(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await advance(page, 0);
  const recap = page.locator(".q-recap");
  await expect(recap).toBeVisible();
  await expect(recap).toHaveAttribute("data-done", "true", { timeout: 25000 });
  await recap.getByRole("button", { name: "Read report", exact: true }).click();
  await expect(page.getByTestId("quarter-report")).toBeVisible();
  await expect(recap).toHaveCount(0);
  await page
    .getByRole("tab", { name: "2 National impact", exact: true })
    .click();
  await expect(page.locator(".q-report-trend polyline")).toHaveCSS(
    "animation-name",
    "none",
  );
  expect(
    await page
      .getByTestId("quarter-report")
      .evaluate((node) =>
        [...node.querySelectorAll("*")].every(
          (el) => getComputedStyle(el).animationName === "none",
        ),
      ),
  ).toBe(true);
  await page.getByRole("tab", { name: "4 Treasury", exact: true }).click();
  const flow = page.getByTestId("treasury-flow");
  await expect(flow).toHaveAttribute("data-playing", "true");
  await expect(flow.locator(".report-flow-trace")).toHaveCSS(
    "animation-name",
    "treasury-money-flow",
  );
  await flow.getByRole("button", { name: "Pause flow", exact: true }).click();
  await expect(flow).toHaveAttribute("data-playing", "false");
  await flow.getByRole("button", { name: "Replay flow", exact: true }).click();
  await expect(flow).toHaveAttribute("data-step", "4", { timeout: 7000 });
  await expect(flow).toHaveAttribute("data-playing", "false");
  await flow.locator(".report-fiscal-steps button").nth(2).click();
  await expect(flow).toHaveAttribute("data-step", "2");
  await flow.getByRole("button", { name: "Replay flow", exact: true }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(flow).toHaveAttribute("data-playing", "false");
  await expect(flow.locator(".report-flow-trace")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("quarter-summary")).toBeFocused();
  await page.reload();
  await expect(page.getByTestId("quarter-summary")).toBeEnabled();
  await expect(recap).toHaveCount(0);
  await page.getByTestId("quarter-summary").click();
  await expect(page.getByTestId("quarter-report")).toBeVisible();
  await expect(recap).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("policies can be added and removed from the catalog without opening details", async ({
  page,
}) => {
  await start(page);
  await goPolicies(page);
  const card = (id: PolicyId) =>
    page
      .getByTestId("policy-card")
      .filter({ has: page.locator(`[data-manage-policy="${id}"]`) });
  const toggle = (id: PolicyId) => card(id).getByTestId("policy-toggle");
  await toggle("plts").click();
  await toggle("bpn").click();
  await expect(card("plts")).toHaveAttribute("data-planned", "true");
  await expect
    .poll(async () => (await stored(page, DRAFT_KEY))?.plan.policies)
    .toEqual(["plts", "bpn"]);
  await expect(toggle("palm-replanting")).toBeDisabled();
  await expect(page.getByRole("tab", { name: /^Policies\b/ })).toContainText(
    "2/8 slots used · 2/2 new",
  );
  await toggle("bpn").click();
  await expect(toggle("palm-replanting")).toBeEnabled();
  await expect
    .poll(async () => (await stored(page, DRAFT_KEY))?.plan.policies)
    .toEqual(["plts"]);
  await expect(page.getByTestId("regional-spending")).toHaveCount(0);
});
