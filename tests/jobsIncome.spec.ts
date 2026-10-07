import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
for (const language of ["en", "id"]) {
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
  ]) {
    test(`jobs connect to income ${language} ${viewport.width}`, async ({
      page,
    }, info) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.addInitScript(
        (lang) => localStorage.setItem("indonesia-presidency-language", lang),
        language,
      );
      await page.goto("/");
      const t = (en: string, id: string) => (language === "en" ? en : id);
      for (const name of [
        t("Choose opening policies", "Pilih kebijakan awal"),
        t("Review campaign", "Tinjau permainan"),
        t("Start campaign", "Mulai permainan"),
      ])
        await page.getByRole("button", { name, exact: true }).click();
      await page
        .getByRole("navigation")
        .getByRole("button", { name: t("Regions", "Wilayah"), exact: true })
        .click();
      await page.locator('[data-region-card="java"]').click();
      const graph = page.locator(".eco-relationships");
      await expect(graph).toBeVisible();
      const jobs = graph.locator('[data-graph-node="jobs"]');
      await jobs.focus();
      await page.keyboard.press("Enter");
      await expect(jobs).toHaveAttribute("aria-pressed", "true");
      await expect(graph.locator('[data-graph-node="income"]')).toHaveAttribute(
        "data-connected",
        "true",
      );
      await expect(
        graph.locator(
          'path[data-from="jobs"][data-to="income"]:not(.eco-graph-flow)',
        ),
      ).toHaveAttribute("data-highlighted", "true");
      expect(
        await graph.evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({ path: info.outputPath("jobs-income.png") });
      const access = await new AxeBuilder({ page })
        .include(".eco-relationships")
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      expect(access.violations).toEqual([]);
      await jobs.click();
      await expect(jobs).toHaveAttribute("aria-pressed", "false");
      const output = graph.locator('[data-graph-node="output"]');
      await output.focus();
      await page.keyboard.press("Enter");
      for (const target of ["income", "profits"]) {
        await expect(
          graph.locator(`[data-graph-node="${target}"]`),
        ).toHaveAttribute("data-connected", "true");
        await expect(
          graph.locator(
            `path[data-from="output"][data-to="${target}"]:not(.eco-graph-flow)`,
          ),
        ).toHaveAttribute("data-highlighted", "true");
      }
      await page.screenshot({ path: info.outputPath("value-added.png") });
      for (const [source, tax] of [
        ["income", "personalIncome"],
        ["profits", "corporateIncome"],
      ]) {
        await graph.locator(`[data-graph-node="${source}"]`).click();
        await expect(
          graph.locator(
            `path[data-from="${source}"][data-to="${tax}"]:not(.eco-graph-flow)`,
          ),
        ).toHaveAttribute("data-highlighted", "true");
      }
    });
  }
}
