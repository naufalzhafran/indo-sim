import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  basePlan,
  initialQuarter,
  resolveQuarter,
} from "../src/engine/economy/engine";
import {
  AUTOSAVE_KEY,
  DRAFT_KEY,
  ECONOMY_DATABASE,
  parseQuarter,
  quarterEnvelope,
} from "../src/engine/economy/persistence";
import { GAME_REGIONS } from "../src/engine/gameRegions";
import {
  REGION_IDS,
  SPENDING_LEVELS,
  type QuarterGame,
} from "../src/engine/economy/types";
import { TAX_IDS, TAX_LEVELS } from "../src/engine/taxes";

type Language = "en" | "id";

async function stored<T>(page: Page, key: string): Promise<T | null> {
  return page.evaluate(
    ({ database, item }) =>
      new Promise<T | null>((resolve, reject) => {
        const request = indexedDB.open(database, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction("saves", "readonly");
          const read = transaction.objectStore("saves").get(item);
          read.onerror = () => reject(read.error);
          read.onsuccess = () =>
            resolve((read.result as T | undefined) ?? null);
          transaction.oncomplete = () => db.close();
        };
      }),
    { database: ECONOMY_DATABASE, item: key },
  );
}

async function savedGame(page: Page) {
  return parseQuarter(JSON.stringify(await stored(page, AUTOSAVE_KEY)));
}

async function start(page: Page, language: Language = "en") {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(
    (value) => localStorage.setItem("indonesia-presidency-language", value),
    language,
  );
  await page.goto("/");
  for (const name of language === "en"
    ? ["Choose opening policies", "Review campaign", "Start campaign"]
    : ["Pilih kebijakan awal", "Tinjau permainan", "Mulai permainan"])
    await page.getByRole("button", { name, exact: true }).click();
  await expect.poll(() => stored(page, AUTOSAVE_KEY)).not.toBeNull();
}

async function openDanaDesa(page: Page, language: Language = "en") {
  await page
    .getByRole("navigation")
    .getByRole("button", {
      name: language === "en" ? "Policies & taxes" : "Kebijakan & pajak",
      exact: true,
    })
    .click();
  const panel = page.getByTestId("policy-panel");
  await expect(panel).toBeVisible();
  if ((await panel.getAttribute("data-policy-detail")) !== "jalan-desa")
    await page.locator('[data-manage-policy="jalan-desa"]').click();
  return panel;
}

async function closeWorkspace(page: Page) {
  const dialog = page.locator(".policy-workspace-dialog");
  if (await dialog.count()) await dialog.locator(".dialog-top button").click();
}

async function importGame(page: Page, game: QuarterGame) {
  await closeWorkspace(page);
  await page.locator('input[type="file"]').setInputFiles({
    name: "dana-desa-projects.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(quarterEnvelope(game))),
  });
  await expect
    .poll(async () => (await savedGame(page)).simulation.month)
    .toBe(game.simulation.month);
}

function constructionGame(quarters: number) {
  let game = initialQuarter();
  for (let quarter = 0; quarter < quarters; quarter++)
    game = resolveQuarter(
      game,
      { ...basePlan(game), policies: ["jalan-desa"] },
      { calm: true, attribution: false },
    );
  return game;
}

async function advance(page: Page, month: number) {
  await closeWorkspace(page);
  await page.getByTestId("advance-quarter").click();
  await expect
    .poll(async () => (await savedGame(page)).simulation.month, {
      timeout: 25000,
    })
    .toBe(month + 3);
  await expect(page.getByTestId("advance-quarter")).toBeEnabled({
    timeout: 25000,
  });
  return savedGame(page);
}

async function expectReward(reward: Locator, language: Language) {
  await expect(reward).toHaveAttribute("data-policy", "jalan-desa");
  await expect(
    reward.locator('[data-reward="infrastructure"] span'),
  ).toHaveText(language === "en" ? "Infrastructure" : "Infrastruktur");
  await expect(
    reward.locator('[data-reward="infrastructure"] strong'),
  ).toHaveText(language === "en" ? "+2 points" : "+2 poin");
  await expect(reward).toContainText(language === "en" ? "once" : "sekali");
  await expect(reward).toContainText(language === "en" ? "region" : "wilayah");
  await expect(reward).toContainText("100");
}

async function contained(locator: Locator) {
  expect(
    await locator.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return (
        rect.left >= 0 &&
        rect.top >= 0 &&
        rect.right <= innerWidth &&
        rect.bottom <= innerHeight &&
        node.scrollWidth <= node.clientWidth
      );
    }),
  ).toBe(true);
}

test("Dana Desa completion rewards persist through save/load and are not granted twice", async ({
  page,
}, testInfo) => {
  await start(page);
  const before = constructionGame(2);
  expect(before.simulation.projects).toHaveLength(9);
  expect(
    before.simulation.projects.every((project) => !project.completed),
  ).toBe(true);
  await importGame(page, before);
  let panel = await openDanaDesa(page);
  await panel.getByRole("tab", { name: "Projects", exact: true }).click();
  const rewardFor = (id: string) =>
    page.locator(`[data-project="${id}"] .eco-project-rewards`);
  await expect(rewardFor("jalan-desa:java")).toHaveAttribute("data-granted", "false");
  await expectReward(rewardFor("jalan-desa:java"), "en");

  const expected = resolveQuarter(before, basePlan(before), {
    attribution: true,
  });
  const completed = await advance(page, before.simulation.month);
  const completedProjects = completed.simulation.projects.filter(
    (project) => project.completed,
  );
  expect(completedProjects.length).toBeGreaterThan(0);
  expect(
    completedProjects.every((project) => project.completionRewardGranted),
  ).toBe(true);
  expect(
    completed.simulation.provinces.map((province) => province.infrastructure),
  ).toEqual(
    expected.simulation.provinces.map((province) => province.infrastructure),
  );
  panel = await openDanaDesa(page);
  await panel.getByRole("tab", { name: "Projects", exact: true }).click();
  for (const project of completedProjects) {
    await expect(rewardFor(project.id)).toHaveAttribute("data-granted", "true");
    await expect(rewardFor(project.id)).toContainText(
      "Completion reward granted",
    );
    await expect(rewardFor(project.id)).toContainText("kept permanently");
  }
  await page.locator('[data-project="jalan-desa:java"]').scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath("project-reward-granted.png"),
  });

  await page.reload();
  expect((await savedGame(page)).simulation.projects).toEqual(
    completed.simulation.projects,
  );
  panel = await openDanaDesa(page);
  await panel.getByRole("tab", { name: "Projects", exact: true }).click();
  for (const project of completedProjects)
    await expect(rewardFor(project.id)).toHaveAttribute("data-granted", "true");
  const expectedNext = resolveQuarter(completed, basePlan(completed), {
    attribution: true,
  });
  const continued = await advance(page, completed.simulation.month);
  expect(
    continued.simulation.provinces.map((province) => province.infrastructure),
  ).toEqual(
    expectedNext.simulation.provinces.map(
      (province) => province.infrastructure,
    ),
  );
  for (const project of completedProjects) {
    const after = continued.simulation.projects.find(
      (item) => item.id === project.id,
    )!;
    expect(after.completed).toBe(true);
    expect(after.completionRewardGranted).toBe(true);
    expect(after.progress).toBe(100);
  }
});

test("unfinished near-complete projects show 99% until completion grants their reward", async ({
  page,
}) => {
  let game = initialQuarter(2026);
  for (let quarter = 0; quarter < 2; quarter++) {
    const plan = basePlan(game);
    plan.policies = ["water"];
    REGION_IDS.forEach((region, index) => {
      plan.regionalSpending.water[region] =
        SPENDING_LEVELS[(quarter + index + 1) % 3];
    });
    TAX_IDS.forEach((tax) => {
      plan.taxes[tax] = TAX_LEVELS[(quarter + 1) % 3];
    });
    game = resolveQuarter(game, plan, { calm: true, attribution: false });
  }
  // A paid-up site a sliver short of completion, as slow local capacity leaves it.
  const nearlyComplete = game.simulation.projects.find(
    (project) => project.id === "water:java",
  )!;
  nearlyComplete.spent = nearlyComplete.cost;
  nearlyComplete.progress = 99.95;
  expect(nearlyComplete.progress).toBeGreaterThan(99.9);
  expect(nearlyComplete.progress).toBeLessThan(100);
  expect(nearlyComplete.completed).toBe(false);
  await start(page);
  await importGame(page, game);
  const navigation = page
    .getByRole("navigation")
    .getByRole("button", { name: "Policies & taxes", exact: true });
  await navigation.click();
  await page.locator('[data-manage-policy="water"]').click();
  const panel = page.getByTestId("policy-panel");
  await panel.getByRole("tab", { name: "Projects", exact: true }).click();
  const card = page.locator('[data-project="water:java"]');
  await expect(card).toHaveAttribute("data-status", "building");
  await expect(card.locator(".eco-construction-progress strong")).toHaveText(
    "99%",
  );
  await expect(card.locator(".eco-project-rewards")).toHaveAttribute(
    "data-granted",
    "false",
  );
  await expect(card).not.toContainText("Completion reward granted");

  const completed = await advance(page, game.simulation.month);
  const project = completed.simulation.projects.find(
    (item) => item.id === "water:java",
  )!;
  expect(project.completed).toBe(true);
  expect(project.completionRewardGranted).toBe(true);
  await navigation.click();
  await panel.getByRole("tab", { name: "Projects", exact: true }).click();
  await expect(card.locator(".eco-construction-progress strong")).toHaveText(
    "100%",
  );
  await expect(card.locator(".eco-project-rewards")).toHaveAttribute(
    "data-granted",
    "true",
  );
  await expect(card).toContainText("Completion reward granted");
});

for (const language of ["id", "en"] as const) {
  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
  ]) {
    test(`project completion rewards fit ${viewport.width}×${viewport.height} in ${language}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await start(page, language);
      const before = await savedGame(page);
      const initialDraft = await stored(page, DRAFT_KEY);
      let panel = await openDanaDesa(page, language);
      const briefing = panel.getByTestId("policy-briefing");
      const reward = briefing.locator(".eco-project-rewards");
      await expectReward(reward, language);
      await expect(reward).toHaveAttribute("data-granted", "false");
      await expect(briefing).toContainText(
        language === "en" ? "At completion (100%)" : "Saat selesai (100%)",
      );
      await expect(briefing).not.toContainText(
        language === "en" ? "No extra bonus" : "Tanpa bonus tambahan",
      );
      await expect(page.locator(".policy-stat-preview")).toHaveCount(0);
      await reward.scrollIntoViewIfNeeded();
      await contained(reward);
      await contained(page.getByTestId("policy-start"));
      await page.screenshot({
        path: testInfo.outputPath(
          `project-reward-briefing-${language}-${viewport.width}.png`,
        ),
      });
      await reward.screenshot({
        path: testInfo.outputPath(
          `project-reward-detail-${language}-${viewport.width}.png`,
        ),
      });
      await briefing.locator(".eco-project-briefing").screenshot({
        path: testInfo.outputPath(
          `project-reward-lifecycle-${language}-${viewport.width}.png`,
        ),
      });

      const hint = panel.locator(".eco-briefing-effects .stat-help").first();
      await hint.focus();
      const tooltip = page.getByRole("tooltip");
      await expect(tooltip).toBeVisible();
      await contained(tooltip);
      await tooltip.hover();
      await page.keyboard.press("Escape");
      await expect(tooltip).toHaveCount(0);
      await expect(page.locator(".policy-workspace-dialog")).toBeVisible();
      const briefingTab = panel.getByRole("tab", {
        name: language === "en" ? "Briefing" : "Ringkasan",
        exact: true,
      });
      await briefingTab.focus();
      await page.keyboard.press("End");
      const projectsTab = panel.getByRole("tab", {
        name: language === "en" ? "Projects" : "Proyek",
        exact: true,
      });
      await expect(projectsTab).toBeFocused();
      const empty = panel.getByTestId("policy-projects");
      await expectReward(empty.locator(".eco-project-rewards"), language);
      await expect(empty.locator(".eco-project-grid > li")).toHaveCount(0);
      expect(await savedGame(page)).toEqual(before);
      expect(await stored(page, DRAFT_KEY)).toEqual(initialDraft);

      await importGame(page, constructionGame(1));
      panel = await openDanaDesa(page, language);
      await panel
        .getByRole("tab", {
          name: language === "en" ? "Projects" : "Proyek",
          exact: true,
        })
        .click();
      const projects = panel.getByTestId("policy-projects");
      const cards = projects.locator(".eco-project-grid > li");
      await expect(cards).toHaveCount(9);
      for (const region of GAME_REGIONS) {
        const card = projects.locator(`[data-project="jalan-desa:${region.id}"]`);
        await expect(
          card.locator(".eco-project-card-heading > strong"),
        ).toHaveText(language === "en" ? region.name : region.nameId);
        await expectReward(card.locator(".eco-project-rewards"), language);
        await expect(card.locator(".eco-project-rewards")).toHaveAttribute(
          "data-granted",
          "false",
        );
        await card.scrollIntoViewIfNeeded();
        await contained(card);
      }
      await projects
        .locator(".eco-section-heading")
        .evaluate((node) => node.scrollIntoView({ block: "start" }));
      await page.mouse.move(0, 0);
      await page.screenshot({
        path: testInfo.outputPath(
          `project-reward-cards-${language}-${viewport.width}.png`,
        ),
      });
      await cards.first().screenshot({
        path: testInfo.outputPath(
          `project-reward-card-${language}-${viewport.width}.png`,
        ),
      });
      await expect(projects.locator("details, summary, select")).toHaveCount(0);
    });
  }
}
