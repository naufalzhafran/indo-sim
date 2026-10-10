import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { industries, policies } from "../src/engine/economy/catalog";
import {
  initialQuarter,
  basePlan,
  resolveQuarter,
} from "../src/engine/economy/engine";
import { quarterEnvelope } from "../src/engine/economy/persistence";

for (const language of ["en", "id"] as const) {
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
  ]) {
    test(`national economy fits ${viewport.width}×${viewport.height} in ${language}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.addInitScript(
        (value) => localStorage.setItem("indonesia-presidency-language", value),
        language,
      );
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("/");
      await page
        .getByRole("button", {
          name:
            language === "en"
              ? "Choose opening policies"
              : "Pilih kebijakan awal",
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
      const nav = page.getByRole("navigation").getByRole("button", {
        name: language === "en" ? "Economy" : "Ekonomi",
        exact: true,
      });
      await nav.click({ timeout: 60000 });
      const panel = page.locator(".national-economy");
      await expect(panel).toBeVisible();
      const dialog = page.locator(".national-economy-dialog");
      expect(await dialog.evaluate((node) => node.matches(":modal"))).toBe(
        true,
      );
      expect(
        await dialog.evaluate((node) => {
          const rect = node.getBoundingClientRect();
          return (
            rect.width > innerWidth * 0.95 &&
            rect.height > innerHeight * 0.94 &&
            rect.left >= 0 &&
            rect.top >= 0 &&
            rect.right <= innerWidth &&
            rect.bottom <= innerHeight
          );
        }),
      ).toBe(true);
      await expect(panel.locator(".national-foundations meter")).toHaveCount(5);
      const helpButtons = panel.locator(".stat-help");
      await expect(helpButtons).toHaveCount(7);
      for (const help of await helpButtons.all()) {
        await help.focus();
        const tooltip = page.getByRole("tooltip");
        await expect(tooltip).toBeVisible();
        await tooltip.hover();
        await expect(tooltip).toBeVisible();
        expect(
          await tooltip.evaluate((node) => {
            const rect = node.getBoundingClientRect();
            return (
              rect.left >= 0 &&
              rect.top >= 0 &&
              rect.right <= innerWidth &&
              rect.bottom <= innerHeight
            );
          }),
        ).toBe(true);
        await page.keyboard.press("Escape");
        await expect(tooltip).toHaveCount(0);
        await expect(panel).toBeVisible();
      }
      await panel.locator(".national-relationship").evaluate((node) => {
        node.scrollTop = 0;
      });
      await panel.locator(".national-industry-roster").evaluate((node) => {
        node.scrollTop = 0;
      });
      expect(
        await panel.locator(".national-relationship").evaluate((node) => {
          const viewport = node.getBoundingClientRect();
          const essential = [
            ...node.querySelectorAll(
              ".national-inputs li, .national-constraint, .national-rewards > div",
            ),
          ];
          return essential.every((element) => {
            const rect = element.getBoundingClientRect();
            return rect.top >= viewport.top && rect.bottom <= viewport.bottom;
          });
        }),
      ).toBe(true);
      await panel.locator(".national-relationship").evaluate((node) => {
        node.scrollTop = node.scrollHeight;
      });
      expect(
        await panel.locator(".national-industry-links").evaluate((node) => {
          const rect = node.getBoundingClientRect();
          const viewport = node
            .closest(".national-relationship")!
            .getBoundingClientRect();
          return rect.top >= viewport.top && rect.bottom <= viewport.bottom;
        }),
      ).toBe(true);
      await panel.locator(".national-relationship").evaluate((node) => {
        node.scrollTop = 0;
      });
      await expect(
        panel.locator(".national-industry-roster button"),
      ).toHaveCount(13);
      await expect(panel.locator(".national-industry-core")).toContainText(
        language === "en" ? "Opening" : "Awal",
      );
      await page.mouse.move(0, 0);
      await page.screenshot({
        path: testInfo.outputPath(`national-${language}-${viewport.width}.png`),
      });
      for (const industry of industries) {
        const button = panel
          .locator(".national-industry-roster button")
          .filter({ hasText: industry.name[language] })
          .first();
        await button.click();
        await expect(button).toHaveAttribute("aria-pressed", "true");
        await expect(panel.locator(".national-industry-core h3")).toHaveText(
          industry.name[language],
        );
        await expect(panel.locator(".national-inputs li")).toHaveCount(5);
        expect(
          await panel.locator(".national-relationship").evaluate((node) => {
            const viewport = node.getBoundingClientRect();
            return [
              ...node.querySelectorAll(
                ".national-inputs li, .national-constraint, .national-rewards > div",
              ),
            ].every((element) => {
              const rect = element.getBoundingClientRect();
              return rect.top >= viewport.top && rect.bottom <= viewport.bottom;
            });
          }),
        ).toBe(true);
        expect(
          await panel.evaluate((node) => node.scrollWidth <= node.clientWidth),
        ).toBe(true);
        const expectedOutput = initialQuarter().simulation.provinces.reduce(
          (total, province) => total + province.industries[industry.id].output,
          0,
        );
        const formatted = new Intl.NumberFormat(
          language === "id" ? "id-ID" : "en-GB",
          {
            minimumFractionDigits: expectedOutput >= 1000 ? 0 : 1,
            maximumFractionDigits: expectedOutput >= 1000 ? 0 : 1,
          },
        ).format(expectedOutput);
        await expect(panel.locator(".national-output")).toHaveText(
          `Rp ${formatted}T`,
        );
      }
      await expect(
        panel.getByRole("button", {
          name: language === "en" ? "Choose industry" : "Pilih industri",
          exact: true,
        }),
      ).toHaveCount(0);
      await panel.locator(".national-industry-roster button").first().focus();
      await page.keyboard.press("Enter");
      await expect(panel.locator("#national-links-heading")).toBeFocused();
      const hint = panel.getByRole("button", {
        name:
          language === "en"
            ? "Foundation sensitivity ?"
            : "Kepekaan terhadap fondasi ?",
        exact: true,
      });
      await hint.focus();
      await expect(page.getByRole("tooltip")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("tooltip")).toHaveCount(0);
      await expect(panel).toBeVisible();
      await page.mouse.move(0, 0);
      await panel.locator("#national-links-heading").focus();
      await panel
        .locator("#national-links-heading")
        .evaluate((node) => node.scrollIntoView({ block: "start" }));
      await page.screenshot({
        path: testInfo.outputPath(
          `national-links-${language}-${viewport.width}.png`,
        ),
      });
      const access = await new AxeBuilder({ page })
        .include(".national-economy")
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      expect(access.violations).toEqual([]);
      await panel.locator(".national-foundation-value").first().click();
      const effects = panel.locator(".national-policy-effects");
      await expect(effects).toBeVisible();
      await expect(
        effects.locator(".national-policy-cards article"),
      ).toHaveCount(
        policies.filter((policy) =>
          policy.impacts.some((impact) => impact.target === "education"),
        ).length,
      );
      await expect(
        effects.locator('[data-policy="bos"] [data-target="education"]'),
      ).toContainText(language === "en" ? "Delayed" : "Bertahap");
      await panel
        .locator(".national-industry-roster button")
        .filter({
          hasText: industries.find((item) => item.id === "palmOil")!.name[
            language
          ],
        })
        .click();
      await expect(
        effects.locator(
          '[data-policy="palm-replanting"] [data-direction="down"]',
        ),
      ).toContainText(language === "en" ? "Initially" : "Awalnya");
      await expect(
        effects.locator(
          '[data-policy="palm-replanting"] [data-direction="up"]',
        ),
      ).toContainText(language === "en" ? "Later" : "Kemudian");
      await effects.locator(".national-policy-filters button").nth(1).click();
      await expect(effects.locator(".national-policy-note")).toContainText(
        language === "en" ? "indirectly" : "tidak langsung",
      );
      await effects.locator(".national-policy-filters button").last().click();
      await expect(effects.locator(".national-policy-empty")).toBeVisible();
      await effects.locator(".national-policy-filters button").first().click();
      await panel.locator(".national-foundation-value").first().click();
      await page.mouse.move(0, 0);
      await page.screenshot({
        path: testInfo.outputPath(
          `policy-effects-${language}-${viewport.width}.png`,
        ),
      });
      const policyAccess = await new AxeBuilder({ page })
        .include(".national-economy")
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      expect(policyAccess.violations).toEqual([]);
      await panel.locator("#national-tab-policies").focus();
      await page.keyboard.press("ArrowLeft");
      await expect(panel.locator("#national-tab-connections")).toBeFocused();
      await expect(panel.locator(".national-relationship")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.keyboard.press("Escape");
      await expect(panel).toHaveCount(0);
      await expect(nav).toBeFocused();
      await nav.click();
      await expect(
        dialog.getByRole("button", {
          name: language === "en" ? "Return to map" : "Kembali ke peta",
          exact: true,
        }),
      ).toHaveCount(0);
      await dialog.locator(".dialog-top button").click();
      await expect(panel).toHaveCount(0);
      await expect(nav).toBeFocused();
      await nav.click();
      await dialog.locator(".dialog-top button").click();
      await expect(panel).toHaveCount(0);
      await expect(nav).toBeFocused();
      await nav.click();
      await page.mouse.click(5, 5);
      await expect(panel).toHaveCount(0);
      await expect(nav).toBeFocused();
      await nav.click();
      for (const id of ["finance", "technology", "logistics"] as const) {
        await panel
          .locator(".national-industry-links button")
          .filter({
            hasText: industries.find((item) => item.id === id)!.name[language],
          })
          .click();
        await expect(panel.locator(".national-industry-core h3")).toHaveText(
          industries.find((item) => item.id === id)!.name[language],
        );
      }
      await dialog.locator(".dialog-top button").focus();
      await page.keyboard.press("Shift+Tab");
      expect(
        await page.evaluate(
          () => !!document.activeElement?.closest(".national-economy-dialog"),
        ),
      ).toBe(true);
      await page.keyboard.press("Tab");
      await expect(dialog.locator(".dialog-top button")).toBeFocused();
      await expect(
        panel.getByRole("button", {
          name: language === "en" ? "Choose policies" : "Pilih kebijakan",
          exact: true,
        }),
      ).toHaveCount(0);
      await dialog.locator(".dialog-top button").click();
      await expect(nav).toBeFocused();

      const opening = initialQuarter();
      const game = resolveQuarter(opening, basePlan(opening), {
        calm: true,
        attribution: false,
      });
      await page.locator('input[type="file"]').setInputFiles({
        name: "national-quarter.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(quarterEnvelope(game))),
      });
      await nav.click();
      await expect(panel.locator(".national-industry-core")).not.toContainText(
        language === "en" ? "Opening" : "Awal",
      );
      await page.mouse.move(0, 0);
      await page.screenshot({
        path: testInfo.outputPath(
          `national-quarter-${language}-${viewport.width}.png`,
        ),
      });
      expect(errors).toEqual([]);
    });
  }
}

for (const language of ["en", "id"] as const) {
  test(`policy effects distinguish active funding from the draft and open the matching policy in ${language}`, async ({
    page,
  }, testInfo) => {
    const t = (en: string, id: string) => (language === "en" ? en : id);
    await page.emulateMedia({ reducedMotion: "reduce" });
    page.setDefaultTimeout(60000);
    await page.addInitScript(
      (value) => localStorage.setItem("indonesia-presidency-language", value),
      language,
    );
    await page.goto("/");
    const opening = initialQuarter();
    const openingPlan = basePlan(opening);
    openingPlan.policies = ["plta"];
    const game = resolveQuarter(opening, openingPlan, {
      calm: true,
      attribution: false,
    });
    await page.locator('input[type="file"]').setInputFiles({
      name: "active-policy.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(quarterEnvelope(game))),
    });
    const nav = page
      .getByRole("navigation")
      .getByRole("button", { name: t("Economy", "Ekonomi"), exact: true });
    await nav.click({ timeout: 60000 });
    const effects = page.locator(".national-policy-effects");
    await page.locator("#national-tab-policies").click();
    const electricity = effects.locator('[data-policy="plta"]');
    await expect(
      electricity.locator(".national-policy-card-heading span"),
    ).toHaveText(t("Active", "Aktif"));
    await effects
      .getByRole("button", {
        name: t("New planned (0)", "Rencana baru (0)"),
        exact: true,
      })
      .click();
    await expect(effects.locator("article")).toHaveCount(0);
    await effects
      .getByRole("button", { name: t("Active (1)", "Aktif (1)"), exact: true })
      .click();
    await expect(effects.locator("article")).toHaveCount(1);
    await page.screenshot({
      path: testInfo.outputPath(`active-effects-${language}.png`),
    });
    await electricity
      .getByRole("button", {
        name: t("View policy", "Lihat kebijakan"),
        exact: true,
      })
      .click();
    await expect(page.locator(".national-economy-dialog")).toHaveCount(0);
    await expect(page.getByTestId("policy-start")).toHaveText(
      t("Pause next quarter", "Jeda triwulan depan"),
    );
    await page.getByTestId("policy-start").click();
    await page.locator(".policy-workspace-dialog .dialog-top button").click();
    await nav.click();
    await page.locator("#national-tab-policies").click();
    await expect(effects.locator('[data-policy="plta"]')).toContainText(
      t("Stopping next quarter", "Berhenti triwulan depan"),
    );
    await effects
      .locator('[data-policy="kur"]')
      .getByRole("button", {
        name: t("View policy", "Lihat kebijakan"),
        exact: true,
      })
      .click();
    await page.getByTestId("policy-start").click();
    await page.locator(".policy-workspace-dialog .dialog-top button").click();
    await nav.click();
    await page.locator("#national-tab-policies").click();
    await expect(effects.locator('[data-policy="kur"]')).toContainText(
      t("New planned · not active yet", "Rencana baru · belum aktif"),
    );
    await expect(effects.locator('[data-policy="plta"]')).toContainText(
      t("Stopping next quarter", "Berhenti triwulan depan"),
    );
    await effects
      .getByRole("button", {
        name: t("New planned (1)", "Rencana baru (1)"),
        exact: true,
      })
      .click();
    await expect(effects.locator("article")).toHaveCount(1);
    await expect(effects.locator('[data-policy="kur"]')).toBeVisible();
    await effects
      .getByRole("button", { name: t("Active (1)", "Aktif (1)"), exact: true })
      .click();
    await expect(effects.locator("article")).toHaveCount(1);
    await expect(electricity).toBeVisible();
  });
}
