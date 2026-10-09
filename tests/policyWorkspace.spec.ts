import { test, expect, type Page, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  initialQuarter,
  basePlan,
  previewQuarter,
  resolveQuarter,
} from "../src/engine/economy/engine";
import { quarterEnvelope } from "../src/engine/economy/persistence";
import { POLICY_IDS } from "../src/engine/economy/types";
import { policies } from "../src/engine/economy/catalog";
import { projectBenefits } from "../src/engine/economy/projectBenefits";

for (const language of ["en", "id"] as const) {
  test(`active policies are excluded from new planned launches in ${language}`, async ({
    page,
  }, testInfo) => {
    await start(page, language);
    let game = initialQuarter();
    for (let quarter = 0; quarter < 4; quarter++) {
      game = resolveQuarter(
        game,
        {
          ...basePlan(game),
          policies: POLICY_IDS.slice(0, Math.min(7, (quarter + 1) * 2)),
        },
        { calm: true, attribution: false },
      );
    }
    await page.locator('input[type="file"]').setInputFiles({
      name: "seven-active.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(quarterEnvelope(game))),
    });
    const nav = page.getByRole("navigation").getByRole("button", {
      name: language === "en" ? "Policies & taxes" : "Kebijakan & pajak",
      exact: true,
    });
    await nav.click();
    const panel = page.getByTestId("policy-panel");
    const active = panel.getByRole("button", {
      name: language === "en" ? /^Active/ : /^Aktif/,
    });
    const planned = panel.getByRole("button", {
      name: language === "en" ? /^New planned/ : /^Rencana baru/,
    });
    const all = panel.getByRole("button", {
      name: language === "en" ? /^All/ : /^Semua/,
    });
    const card = (id: string) =>
      panel
        .getByTestId("policy-card")
        .filter({ has: page.locator(`[data-manage-policy="${id}"]`) });
    await expect(active.locator("small")).toHaveText("7");
    await expect(planned.locator("small")).toHaveText("0");
    const changes = page.locator(".policy-plan-picks button");
    await expect(changes).toHaveCount(0);
    await expect(page.locator(".policy-plan-empty")).toContainText(
      language === "en" ? "Currently active: 7" : "Saat ini aktif: 7",
    );
    await planned.click();
    await expect(panel.getByTestId("policy-card")).toHaveCount(0);
    await expect(
      panel.getByRole("heading", {
        name:
          language === "en"
            ? "No new policies planned"
            : "Belum ada kebijakan baru direncanakan",
      }),
    ).toBeVisible();
    await active.click();
    await expect(panel.getByTestId("policy-card")).toHaveCount(7);
    await expect(panel.locator(".eco-policy-selected").first()).toHaveText(
      language === "en" ? "✓ Continuing" : "✓ Dilanjutkan",
    );
    await expect(page.locator(".policy-workspace-dialog")).not.toContainText(
      language === "en" ? "In plan" : "Dalam rencana",
    );
    await all.click();
    await card("plts").getByTestId("policy-toggle").click();
    await expect(changes).toHaveCount(1);
    await expect(changes.first()).toContainText(
      language === "en" ? "New launch" : "Peluncuran baru",
    );
    await expect(
      card("plts").locator(".eco-policy-selected"),
    ).toHaveText(language === "en" ? "✓ New planned" : "✓ Rencana baru");
    await expect(active.locator("small")).toHaveText("7");
    await expect(planned.locator("small")).toHaveText("1");
    await planned.click();
    await expect(panel.getByTestId("policy-card")).toHaveCount(1);
    await expect(card("plts")).toBeVisible();
    await active.click();
    await card("mbg").getByTestId("policy-toggle").click();
    await expect(changes).toHaveCount(2);
    await expect(changes.last()).toContainText(
      language === "en" ? "Stops next quarter" : "Dihentikan triwulan depan",
    );
    await expect(active.locator("small")).toHaveText("7");
    await expect(planned.locator("small")).toHaveText("1");
    await expect(card("mbg")).toContainText(
      language === "en" ? "Ending" : "Berakhir",
    );
    await page.locator(".policy-workspace-dialog .dialog-top button").click();
    await page.getByTestId("advance-quarter").click();
    await expect(page.getByTestId("advance-quarter")).toBeEnabled({
      timeout: 25000,
    });
    await nav.click();
    await expect(active.locator("small")).toHaveText("7");
    await expect(planned.locator("small")).toHaveText("0");
    await active.click();
    await expect(changes).toHaveCount(0);
    await expect(card("plts")).toBeVisible();
    await expect(card("mbg")).toHaveCount(0);
    await contained(page.locator(".policy-workspace-dialog"));
    await page.screenshot({
      path: testInfo.outputPath(`active-vs-planned-${language}.png`),
    });
  });
}

async function start(page: Page, language: "en" | "id") {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(
    (value) => localStorage.setItem("indonesia-presidency-language", value),
    language,
  );
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

test("a funding shortfall stays visible beside the delivered forecast", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await start(page, "en");
  let game = initialQuarter();
  const portfolio = ["mbg", "jkn", "mrt-lrt", "klinik", "bos", "pltp"] as const;
  // Three quarters of expensive launches push borrowing past its envelope.
  for (let quarter = 0; quarter < 3; quarter++) {
    game = resolveQuarter(
      game,
      { ...basePlan(game), policies: portfolio.slice(0, (quarter + 1) * 2) },
      { calm: true, attribution: false },
    );
  }
  const forecast = previewQuarter(game, basePlan(game)).receipt!;
  expect(forecast.ledger.funding).toBeLessThan(0.99);
  await page.locator('input[type="file"]').setInputFiles({
    name: "underfunded-portfolio.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(quarterEnvelope(game))),
  });
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Policies & taxes", exact: true })
    .click();
  const dialog = page.locator(".policy-workspace-dialog");
  const warning = dialog.locator(".policy-funding-warning");
  await expect(warning).toContainText("Policies receive less and take longer.");
  await expect(warning).toBeInViewport();
  const funding = dialog
    .locator(".policy-budget dl > div")
    .filter({ has: page.getByText("Funding delivered", { exact: true }) });
  await expect(funding).toHaveAttribute("data-tone", "warn");
  await expect(funding.locator("dd")).toHaveText(
    `${Math.round(forecast.ledger.funding * 100)}%`,
  );
  const delivered = Object.values(forecast.ledger.policySpending).reduce(
    (sum, value) => sum + (value ?? 0),
    0,
  );
  const expected = `Rp ${new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(delivered)}T`;
  await expect(
    dialog
      .locator(".policy-budget dl > div")
      .filter({ has: page.getByText("For policies", { exact: true }) })
      .locator("dd"),
  ).toHaveText(expected);
  await contained(dialog);
});

test("forecast failure clears stale values and retry preserves the planned choices", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const OriginalWorker = window.Worker;
    window.Worker = class extends OriginalWorker {
      constructor(...args: ConstructorParameters<typeof Worker>) {
        if ((window as Window & { failPreview?: boolean }).failPreview)
          throw new Error("Forecast worker unavailable for recovery test");
        super(...args);
      }
    };
  });
  await start(page, "en");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Policies & taxes", exact: true })
    .click();
  const dialog = page.locator(".policy-workspace-dialog");
  const budget = dialog.locator(".policy-budget");
  await expect(budget.locator("dl")).toBeVisible();
  await page.evaluate(() => {
    (window as Window & { failPreview?: boolean }).failPreview = true;
  });
  const mbg = dialog
    .getByTestId("policy-card")
    .filter({ has: page.locator('[data-manage-policy="mbg"]') });
  await mbg.getByTestId("policy-toggle").click();
  await expect(budget.getByRole("status")).toContainText(
    "Forecast unavailable.",
  );
  await expect(budget.locator("dl")).toHaveCount(0);
  await expect(dialog.locator(".policy-plan-effects dl")).toHaveCount(0);
  await expect(dialog.locator('[data-policy-change="mbg"]')).toBeVisible();
  await page.evaluate(() => {
    (window as Window & { failPreview?: boolean }).failPreview = false;
  });
  await budget.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(budget.locator("dl")).toBeVisible({ timeout: 25000 });
  await expect(dialog.locator(".policy-plan-effects dl")).toBeVisible();
  await expect(dialog.locator('[data-policy-change="mbg"]')).toBeVisible();
  await expect(mbg.getByTestId("policy-toggle")).toContainText("Remove");
});

for (const language of ["en", "id"] as const) {
  test(`allocation-only changes remain reviewable and saved on return to the map in ${language}`, async ({
    page,
  }) => {
    await start(page, language);
    const opening = initialQuarter();
    const game = resolveQuarter(
      opening,
      { ...basePlan(opening), policies: ["pupuk"] },
      { calm: true, attribution: false },
    );
    await page.locator('input[type="file"]').setInputFiles({
      name: "running-pupuk.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(quarterEnvelope(game))),
    });
    const nav = page.getByRole("navigation").getByRole("button", {
      name: language === "en" ? "Policies & taxes" : "Kebijakan & pajak",
      exact: true,
    });
    await nav.click();
    const dialog = page.locator(".policy-workspace-dialog");
    const panel = page.getByTestId("policy-panel");
    await expect(
      dialog.getByRole("heading", {
        name: language === "en" ? /^Plan changes\b/ : /^Perubahan rencana\b/,
      }),
    ).toBeVisible();
    await expect(dialog.locator(".policy-plan-empty")).toContainText(
      language === "en"
        ? "No changes planned."
        : "Belum ada perubahan rencana.",
    );
    await panel.locator('[data-manage-policy="pupuk"]').click();
    const funding = panel.getByRole("tab", {
      name: language === "en" ? "Funding" : "Pendanaan",
      exact: true,
    });
    await funding.click();
    const java = page.getByTestId("regional-spending").getByRole("row", {
      name: language === "en" ? /^Java / : /^Jawa /,
    });
    await java.locator('input[value="high"]').check();
    const change = dialog.locator('[data-policy-change="pupuk"]');
    await expect(dialog.locator(".policy-plan-picks button")).toHaveCount(1);
    await expect(change).toBeVisible();
    await expect(dialog.locator(".policy-plan-empty")).toHaveCount(0);
    await expect(dialog.locator(".policy-plan-actions")).toContainText(
      language === "en" ? "Draft saved" : "Rencana tersimpan",
    );
    await dialog
      .getByRole("button", {
        name: language === "en" ? "Return to map" : "Kembali ke peta",
        exact: true,
      })
      .click();
    await expect(dialog).toHaveCount(0);
    await expect(nav).toBeFocused();
    await page.reload();
    await nav.click();
    await expect(dialog.locator(".policy-plan-picks button")).toHaveCount(1);
    await change.click();
    await expect(panel.locator(".eco-detail-header h2")).toBeFocused();
    await funding.click();
    await expect(java.locator('input[value="high"]')).toBeChecked();
    await expect(page.getByTestId("policy-start")).toHaveText(
      language === "en" ? "Stop next quarter" : "Hentikan triwulan depan",
    );
    await java.locator('input[value="medium"]').check();
    await expect(dialog.locator(".policy-plan-picks button")).toHaveCount(0);
    await expect(dialog.locator(".policy-plan-empty")).toContainText(
      language === "en"
        ? "No changes planned."
        : "Belum ada perubahan rencana.",
    );
  });

  test(`tax choices expose their forecast and can be restored with the keyboard in ${language}`, async ({
    page,
  }) => {
    await start(page, language);
    const game = initialQuarter();
    await page.locator('input[type="file"]').setInputFiles({
      name: "tax-forecast-opening.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(quarterEnvelope(game))),
    });
    await page
      .getByRole("navigation")
      .getByRole("button", {
        name: language === "en" ? "Policies & taxes" : "Kebijakan & pajak",
        exact: true,
      })
      .click();
    const dialog = page.locator(".policy-workspace-dialog");
    const taxTab = dialog.locator('[data-tab="taxes"]');
    await dialog.locator('[data-tab="policies"]').focus();
    await page.keyboard.press("ArrowRight");
    await expect(taxTab).toBeFocused();
    const vat = dialog.locator('[data-tax="vat"]');
    await expect(vat.locator(".q-tax-restore")).toHaveCount(0);
    await vat.locator('input[value="standard"]').focus();
    await page.keyboard.press("ArrowRight");
    await expect(vat.locator('input[value="increased"]')).toBeChecked();
    const taxChange = dialog.locator('[data-tax-change="vat"]');
    await expect(taxChange).toBeVisible();
    await expect(taxChange).toContainText("12%");
    await expect(taxChange).toContainText("14%");
    await expect(vat.locator(".q-tax-current")).toContainText("12%");
    await expect(vat.locator(".q-tax-current")).toContainText("14%");

    const plan = basePlan(game);
    plan.taxes.vat = "increased";
    const forecast = previewQuarter(game, plan).receipt!;
    const formatMoney = (value: number) =>
      `Rp ${new Intl.NumberFormat(language === "en" ? "en-GB" : "id-ID", {
        maximumFractionDigits: 1,
        minimumFractionDigits: 1,
      }).format(value)}T`;
    const budget = dialog.locator(".policy-budget");
    const valueFor = (en: string, id: string) =>
      budget
        .locator("dl > div")
        .filter({
          has: page.getByText(language === "en" ? en : id, { exact: true }),
        })
        .locator("dd");
    await expect(valueFor("Total revenue", "Total penerimaan")).toHaveText(
      formatMoney(forecast.ledger.revenue),
      { timeout: 25000 },
    );
    await expect(valueFor("Spending + interest", "Belanja + bunga")).toHaveText(
      formatMoney(forecast.ledger.spending + forecast.ledger.interest),
    );
    await expect(valueFor("From taxes", "Dari pajak")).toHaveText(
      formatMoney(
        Object.values(forecast.ledger.taxes).reduce(
          (sum, value) => sum + value,
          0,
        ),
      ),
    );
    await expect(valueFor("For policies", "Untuk kebijakan")).toHaveText(
      formatMoney(0),
    );
    const balance =
      forecast.ledger.revenue -
      forecast.ledger.spending -
      forecast.ledger.interest;
    await expect(budget.locator(".policy-budget-balance dd")).toHaveText(
      `${balance < 0 ? "−" : "+"}${formatMoney(Math.abs(balance))}`,
    );
    await expect(dialog.locator(".policy-plan-effects")).toBeVisible();
    await expect(
      dialog.locator('.policy-plan-effects [data-metric="realIncome"]'),
    ).toBeVisible();
    await expect(
      dialog.locator('.policy-plan-effects [data-metric="jobs"]'),
    ).toBeVisible();
    await expect(
      dialog.locator('.policy-plan-effects [data-metric="poverty"]'),
    ).toBeVisible();
    const decisions = forecast.effects!.decisions;
    const signed = (value: number, decimals: number) =>
      `${value < 0 ? "−" : "+"}${new Intl.NumberFormat(
        language === "en" ? "en-GB" : "id-ID",
        { maximumFractionDigits: decimals, minimumFractionDigits: decimals },
      ).format(Math.abs(value))}`;
    const unchangedIncome = forecast.after.realIncome - decisions.realIncome!;
    await expect(
      dialog.locator('.policy-plan-effects [data-metric="realIncome"] dd'),
    ).toHaveText(
      `${signed((decisions.realIncome! / unchangedIncome) * 100, 2)}%`,
    );
    await expect(
      dialog.locator('.policy-plan-effects [data-metric="jobs"] dd'),
    ).toHaveText(signed(decisions.jobs! * 1_000_000, 0));
    await expect(
      dialog.locator('.policy-plan-effects [data-metric="poverty"] dd'),
    ).toHaveText(
      `${signed(decisions.poverty!, 2)} ${language === "en" ? "pp" : "poin"}`,
    );

    await dialog.locator('[data-tab="policies"]').click();
    await taxChange.click();
    await expect(taxTab).toHaveAttribute("aria-selected", "true");
    await expect(vat).toBeInViewport();
    await vat.locator(".q-tax-restore").focus();
    await page.keyboard.press("Enter");
    await expect(vat.locator('input[value="standard"]')).toBeChecked();
    await expect(vat.locator(".q-tax-restore")).toHaveCount(0);
    await expect(dialog.locator(".policy-plan-picks button")).toHaveCount(0);
    await expect(dialog.locator(".policy-plan-empty")).toContainText(
      language === "en"
        ? "No changes planned."
        : "Belum ada perubahan rencana.",
    );
    await expect(
      dialog.locator('.policy-plan-effects [data-metric="realIncome"] dd'),
    ).toHaveText(language === "en" ? "0.00%" : "0,00%", { timeout: 25000 });
    await expect(
      dialog.locator('.policy-plan-effects [data-metric="jobs"] dd'),
    ).toHaveText("0");
    await expect(
      dialog.locator('.policy-plan-effects [data-metric="poverty"] dd'),
    ).toHaveText(language === "en" ? "0.00 pp" : "0,00 poin");
  });
}

for (const language of ["en", "id"] as const) {
  test(`illustrated policy briefing stays readable in ${language}`, async ({
    page,
  }, testInfo) => {
    await start(page, language);
    await page
      .getByRole("navigation")
      .getByRole("button", {
        name: language === "en" ? "Policies & taxes" : "Kebijakan & pajak",
        exact: true,
      })
      .click();
    const panel = page.getByTestId("policy-panel");
    await panel.locator('[data-manage-policy="jalan-desa"]').click();
    await expect(panel.locator(".eco-policy-picture")).toHaveCount(1);
    await expect(
      panel.locator(".eco-briefing-effects .economy-emblem"),
    ).toHaveCount(1);
    const lifecycle = panel.locator(".eco-project-briefing");
    await expect(lifecycle.locator(":scope > div")).toHaveCount(3);
    await expect(lifecycle.locator("dt")).toHaveText(
      language === "en"
        ? ["During construction", "At completion (100%)", "Then"]
        : ["Saat dibangun", "Saat selesai (100%)", "Setelah itu"],
    );
    await expect(lifecycle.locator(".eco-policy-picture")).toHaveCount(0);
    await expect(lifecycle.locator("dd").nth(0)).toContainText(
      language === "en"
        ? "No benefit until a region's site is finished."
        : "Belum ada manfaat sampai lokasi wilayah selesai.",
    );
    await expect(lifecycle.locator("dd").nth(1)).toContainText(
      language === "en" ? "Infrastructure" : "Infrastruktur",
    );
    const retained = lifecycle.locator(":scope > div").nth(2);
    await expect(retained).toHaveClass(/eco-project-retained/);
    await expect(retained.locator("dd")).toContainText(
      projectBenefits["jalan-desa"]!.retained[language],
    );
    await expect(retained.locator("dd")).toContainText(
      language === "en"
        ? "Stopping before completion pauses unfinished sites"
        : "Menghentikan sebelum selesai menjeda lokasi yang belum jadi",
    );
    for (const viewport of [
      { width: 1280, height: 720 },
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await panel.evaluate((node) => (node.scrollTop = 0));
      await contained(panel);
      await page.screenshot({
        path: testInfo.outputPath(
          `dana-desa-briefing-${language}-${viewport.width}.png`,
        ),
      });
      await lifecycle.scrollIntoViewIfNeeded();
      const tabsBox = await panel.locator(".eco-detail-tabs").boundingBox();
      const actionsBox = await page.locator(".eco-policy-action").boundingBox();
      for (const tile of await lifecycle.locator(":scope > div").all()) {
        expect(
          await tile.evaluate((node) =>
            [node, ...node.querySelectorAll("dt, dd, dd p")].every(
              (part) =>
                part.scrollWidth <= part.clientWidth &&
                part.scrollHeight <= part.clientHeight,
            ),
          ),
        ).toBe(true);
        const tileBox = await tile.boundingBox();
        for (const copy of await tile.locator("dt, dd").all()) {
          await expect(copy).toBeVisible();
          const textBox = await copy.boundingBox();
          expect(textBox!.x).toBeGreaterThanOrEqual(tileBox!.x);
          expect(textBox!.x + textBox!.width).toBeLessThanOrEqual(
            tileBox!.x + tileBox!.width,
          );
          expect(textBox!.y).toBeGreaterThanOrEqual(
            tabsBox!.y + tabsBox!.height,
          );
          expect(textBox!.y + textBox!.height).toBeLessThanOrEqual(
            actionsBox!.y,
          );
        }
      }
      await page.screenshot({
        path: testInfo.outputPath(
          `dana-desa-lifecycle-${language}-${viewport.width}.png`,
        ),
      });
      await panel.getByTestId("policy-briefing").screenshot({
        path: testInfo.outputPath(
          `dana-desa-project-section-${language}-${viewport.width}.png`,
        ),
      });
      await expect(retained).toBeInViewport();
      const retainedBox = await retained.boundingBox();
      const pinnedTabs = await panel.locator(".eco-detail-tabs").boundingBox();
      const pinnedActions = await page
        .locator(".eco-policy-action")
        .boundingBox();
      expect(retainedBox!.y).toBeGreaterThanOrEqual(
        pinnedTabs!.y + pinnedTabs!.height,
      );
      expect(retainedBox!.y + retainedBox!.height).toBeLessThanOrEqual(
        pinnedActions!.y,
      );
      await panel
        .getByRole("tab", {
          name: language === "en" ? "Projects" : "Proyek",
          exact: true,
        })
        .click();
      const emptyBox = await panel.locator(".eco-project-empty").boundingBox();
      const projectTabs = await panel.locator(".eco-detail-tabs").boundingBox();
      expect(emptyBox!.y).toBeGreaterThanOrEqual(
        projectTabs!.y + projectTabs!.height,
      );
      await panel
        .getByRole("tab", {
          name: language === "en" ? "Briefing" : "Ringkasan",
          exact: true,
        })
        .click();
      const effectsBox = await panel
        .locator(".eco-briefing-effects")
        .boundingBox();
      const briefingTabs = await panel
        .locator(".eco-detail-tabs")
        .boundingBox();
      expect(effectsBox!.y).toBeGreaterThanOrEqual(
        briefingTabs!.y + briefingTabs!.height,
      );
      await expect(
        panel.locator(".eco-briefing-effects h3").first(),
      ).toBeInViewport();
      await expect(page.locator(".policy-budget dl")).toBeVisible();
      expect(
        await page.locator(".policy-budget dl > div").evaluateAll((rows) =>
          rows.every((row) => {
            const label = row.querySelector("dt")!.getBoundingClientRect();
            const value = row.querySelector("dd")!.getBoundingClientRect();
            return (
              label.right <= value.left &&
              value.right <= row.getBoundingClientRect().right + 1
            );
          }),
        ),
      ).toBe(true);
      await panel
        .getByRole("tab", {
          name: language === "en" ? "Funding" : "Pendanaan",
          exact: true,
        })
        .click();
      const startButton = page.getByTestId("policy-start");
      if (
        (await startButton.textContent()) ===
        (language === "en" ? "Add to plan" : "Tambah ke rencana")
      )
        await startButton.click();
      const lastFunding = panel
        .getByRole("radio", {
          name: language === "en" ? "High" : "Tinggi",
          exact: true,
        })
        .last();
      await lastFunding.check();
      await lastFunding.focus();
      const footer = page.locator(".eco-policy-layout > .eco-policy-action");
      await contained(footer);
      const scrollBox = await panel.boundingBox();
      const footerBox = await footer.boundingBox();
      expect(scrollBox!.y + scrollBox!.height).toBeLessThanOrEqual(
        footerBox!.y,
      );
      await expect(panel.locator(".eco-policy-action")).toHaveCount(0);
      const fundingBox = await lastFunding.locator("..").boundingBox();
      expect(fundingBox!.y + fundingBox!.height).toBeLessThanOrEqual(
        footerBox!.y,
      );
      expect(
        await footer.evaluate((node) => {
          const text = node.querySelector("div")!.getBoundingClientRect();
          const button = node.querySelector("button")!.getBoundingClientRect();
          return (
            text.right <= button.left && node.scrollWidth <= node.clientWidth
          );
        }),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`footer-${language}-${viewport.width}.png`),
      });
      await panel
        .getByRole("tab", {
          name: language === "en" ? "Briefing" : "Ringkasan",
          exact: true,
        })
        .click();
    }
    const access = await new AxeBuilder({ page })
      .include(".policy-workspace-dialog")
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(access.violations).toEqual([]);
    const hint = panel.locator(".eco-briefing-effects h3 .stat-help");
    await hint.focus();
    await expect(page.getByRole("tooltip")).toBeVisible();
    await contained(page.getByRole("tooltip"));
    await page.keyboard.press("Escape");
    await expect(page.getByRole("tooltip")).toHaveCount(0);
    await expect(page.locator(".policy-workspace-dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".policy-workspace-dialog")).toHaveCount(0);
  });
}

for (const language of ["en", "id"] as const) {
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
  ]) {
    test(`policy workspace fits ${viewport.width}×${viewport.height} in ${language}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await start(page, language);
      const nav = page.getByRole("navigation").getByRole("button", {
        name: language === "en" ? "Policies & taxes" : "Kebijakan & pajak",
        exact: true,
      });
      await nav.click();
      const dialog = page.locator(".policy-workspace-dialog");
      const panel = page.getByTestId("policy-panel");
      await expect(dialog).toBeVisible();
      expect(await dialog.evaluate((node) => node.matches(":modal"))).toBe(
        true,
      );
      expect(
        await dialog.evaluate(
          (node) => node.getBoundingClientRect().width > innerWidth * 0.95,
        ),
      ).toBe(true);
      await contained(dialog);
      await expect(panel.getByTestId("policy-card")).toHaveCount(33);
      await expect(
        panel.locator(".eco-policy-identity .economy-emblem"),
      ).toHaveCount(33);
      await expect(dialog.locator("select, details, summary")).toHaveCount(0);
      expect(
        await panel
          .locator(".eco-policy-list")
          .evaluate(
            (node) =>
              getComputedStyle(node).gridTemplateColumns.split(" ").length,
          ),
      ).toBe(3);
      await expect(dialog.locator(".policy-budget dl")).toBeVisible({
        timeout: 25000,
      });
      const firstAction = panel.getByTestId("policy-toggle").first();
      expect(
        await firstAction.evaluate((button) => {
          const rect = button.getBoundingClientRect();
          const viewport = button
            .closest('[data-testid="policy-panel"]')!
            .getBoundingClientRect();
          return (
            rect.top >= viewport.top &&
            rect.bottom <= viewport.bottom &&
            rect.left >= viewport.left &&
            rect.right <= viewport.right
          );
        }),
      ).toBe(true);
      await page.mouse.move(0, 0);
      await page.screenshot({
        path: testInfo.outputPath(`policies-${language}-${viewport.width}.png`),
      });
      const toggle = (id: string) =>
        panel
          .getByTestId("policy-card")
          .filter({ has: page.locator(`[data-manage-policy="${id}"]`) })
          .getByTestId("policy-toggle");
      await toggle("plts").focus();
      await page.keyboard.press("Enter");
      await toggle("bpn").click();
      await expect(dialog.locator(".policy-plan-picks button")).toHaveCount(2);
      await expect(toggle("jkn")).toBeDisabled();
      await expect(panel.locator(".eco-limit-banner")).toContainText("2/2");
      await dialog
        .getByRole("button", {
          name: language === "en" ? "Undo" : "Urungkan",
          exact: true,
        })
        .click();
      await expect(toggle("jkn")).toBeEnabled();
      await expect(dialog.locator(".policy-plan-picks button")).toHaveCount(1);
      await dialog.locator(".policy-plan-picks button").first().click();
      await expect(panel.locator(".eco-detail-header h2")).toBeFocused();
      const projects = panel.getByTestId("policy-briefing");
      await expect(projects).toContainText(
        language === "en"
          ? "Builds in 9 regions"
          : "Membangun di 9 wilayah",
      );
      await expect(projects).toContainText(
        language === "en"
          ? "No benefit until a region's site is finished"
          : "Belum ada manfaat sampai lokasi wilayah selesai",
      );
      await projects.scrollIntoViewIfNeeded();
      await contained(panel);
      expect(
        await projects.evaluate((node) => node.scrollWidth <= node.clientWidth),
      ).toBe(true);
      for (const row of await projects
        .locator(".eco-project-briefing > div")
        .all()) {
        await row.scrollIntoViewIfNeeded();
        await expect(row).toBeInViewport();
      }
      await projects.locator("h3").scrollIntoViewIfNeeded();
      await page.screenshot({
        path: testInfo.outputPath(`projects-${language}-${viewport.width}.png`),
      });
      const projectAccess = await new AxeBuilder({ page })
        .include(".eco-policy-projects")
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      expect(projectAccess.violations).toEqual([]);
      await panel
        .getByRole("tab", {
          name: language === "en" ? "Briefing" : "Ringkasan",
          exact: true,
        })
        .focus();
      await page.keyboard.press("End");
      await expect(
        panel.getByRole("tab", {
          name: language === "en" ? "Projects" : "Proyek",
          exact: true,
        }),
      ).toBeFocused();
      await expect(panel.getByTestId("policy-projects")).toContainText(
        language === "en" ? "Ready to build" : "Siap dibangun",
      );
      await page.keyboard.press("ArrowLeft");
      await expect(
        panel.getByRole("tab", {
          name: language === "en" ? "Funding" : "Pendanaan",
          exact: true,
        }),
      ).toBeFocused();
      await expect(page.getByTestId("regional-spending")).toBeVisible();
      await page
        .getByTestId("regional-spending")
        .getByRole("radio", {
          name: language === "en" ? "High" : "Tinggi",
          exact: true,
        })
        .last()
        .check();
      await contained(dialog);
      await page.screenshot({
        path: testInfo.outputPath(`detail-${language}-${viewport.width}.png`),
      });
      await dialog
        .getByRole("button", {
          name: language === "en" ? "Back to policies" : "Kembali ke kebijakan",
          exact: true,
        })
        .click();
      const combo = panel.getByRole("combobox", {
        name: language === "en" ? "Policy category" : "Kategori kebijakan",
      });
      await combo.click();
      await contained(page.getByRole("listbox"));
      await page.keyboard.press("End");
      await page.keyboard.press("Enter");
      await expect(panel.getByTestId("policy-card")).toHaveCount(
        policies.filter((policy) => policy.category === "economy").length,
      );
      await combo.click();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("listbox")).toHaveCount(0);
      await expect(dialog).toBeVisible();
      const search = panel.getByRole("searchbox");
      await search.fill("no-matching-policy");
      await expect(panel.locator(".eco-empty")).toBeVisible();
      await panel
        .getByRole("button", {
          name: language === "en" ? "Reset filters" : "Atur ulang filter",
          exact: true,
        })
        .click();
      await panel
        .getByRole("button", {
          name: language === "en" ? /^New planned/ : /^Rencana baru/,
        })
        .click();
      await expect(panel.getByTestId("policy-card")).toHaveCount(1);
      await panel
        .getByRole("button", { name: language === "en" ? /^Active/ : /^Aktif/ })
        .click();
      await expect(panel.locator(".eco-empty")).toBeVisible();
      await panel
        .getByRole("button", { name: language === "en" ? /^All/ : /^Semua/ })
        .click();
      const tabs = dialog.getByRole("tab");
      await tabs.first().focus();
      await page.keyboard.press("ArrowRight");
      await expect(tabs.last()).toBeFocused();
      const taxCards = dialog.locator(".q-tax-card");
      await expect(taxCards).toHaveCount(6);
      await expect(taxCards.locator(".economy-emblem")).toHaveCount(6);
      for (const card of await taxCards.all()) {
        for (const level of ["relief", "increased", "standard"])
          await card.locator(`input[value="${level}"]`).check();
        await test.step(`Read ${await card.getAttribute("data-tax")} tax hint`, async () => {
          const help = card.locator(".stat-help");
          await help.focus();
          const tooltip = page.getByRole("tooltip");
          await expect(help).toBeFocused();
          await expect(tooltip).toBeVisible();
          await contained(tooltip);
          await tooltip.hover();
          await page.keyboard.press("Escape");
          await expect(tooltip).toHaveCount(0);
          await expect(dialog).toBeVisible();
        });
      }
      await taxCards.first().locator('input[value="increased"]').check();
      await expect(taxCards.first()).toHaveAttribute("data-changed", "true");
      await contained(dialog);
      await dialog
        .locator(".economy-scroll")
        .evaluate((node) => (node.scrollTop = 0));
      await page.mouse.move(0, 0);
      await page.screenshot({
        path: testInfo.outputPath(`taxes-${language}-${viewport.width}.png`),
      });
      const taxAccess = await new AxeBuilder({ page })
        .include(".policy-workspace-dialog")
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      expect(taxAccess.violations).toEqual([]);
      await dialog
        .getByRole("button", {
          name: language === "en" ? "Reset" : "Atur ulang",
          exact: true,
        })
        .click();
      await expect(dialog.locator(".policy-plan-picks button")).toHaveCount(0);
      await tabs.last().focus();
      await page.keyboard.press("ArrowLeft");
      await expect(tabs.first()).toBeFocused();
      await expect(panel).toBeVisible();
      const access = await new AxeBuilder({ page })
        .include(".policy-workspace-dialog")
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      expect(access.violations).toEqual([]);
      const close = dialog.locator(".dialog-top button");
      await close.focus();
      await page.keyboard.press("Shift+Tab");
      expect(
        await page.evaluate(
          () => !!document.activeElement?.closest(".policy-workspace-dialog"),
        ),
      ).toBe(true);
      await page.keyboard.press("Tab");
      await expect(close).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(nav).toBeFocused();
      await nav.click();
      await dialog.locator(".dialog-top button").click();
      await expect(nav).toBeFocused();
      await nav.click();
      await dialog
        .getByRole("button", {
          name: language === "en" ? "Return to map" : "Kembali ke peta",
          exact: true,
        })
        .click();
      await expect(dialog).toHaveCount(0);
      await expect(nav).toBeFocused();
      await nav.click();
      await page.mouse.click(5, 5);
      await expect(dialog).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  }
}

for (const language of ["en", "id"] as const) {
  test(`policy projects retain completed work after cancellation in ${language}`, async ({
    page,
  }, testInfo) => {
    await start(page, language);
    let game = initialQuarter();
    for (let quarter = 0; quarter < 12; quarter++)
      game = resolveQuarter(
        game,
        {
          ...basePlan(game),
          policies: (["plts", "irrigation"] as const).filter(
            (id) => !game.policies.find((p) => p.id === id)?.finished,
          ),
        },
        { calm: true, attribution: false },
      );
    expect(game.simulation.projects.every((project) => project.completed)).toBe(
      true,
    );
    game = resolveQuarter(
      game,
      { ...basePlan(game), policies: [] },
      { calm: true, attribution: false },
    );
    await page.locator('input[type="file"]').setInputFiles({
      name: "completed-projects.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(quarterEnvelope(game))),
    });
    await page
      .getByRole("navigation")
      .getByRole("button", {
        name: language === "en" ? "Policies & taxes" : "Kebijakan & pajak",
        exact: true,
      })
      .click();
    const panel = page.getByTestId("policy-panel");
    await panel.locator('[data-manage-policy="plts"]').click();
    await expect(panel.getByTestId("policy-briefing")).toContainText(
      language === "en"
        ? "Gains are permanent"
        : "Manfaat bersifat permanen",
    );
    await panel
      .getByRole("tab", {
        name: language === "en" ? "Projects" : "Proyek",
        exact: true,
      })
      .click();
    const projects = panel.getByTestId("policy-projects");
    await expect(projects.locator(".eco-project-grid > li")).toHaveCount(9);
    await expect(projects.locator("progress")).toHaveCount(9);
    for (const progress of await projects.locator("progress").all())
      await expect(progress).toHaveAttribute("value", "100");
    for (const viewport of [
      { width: 1280, height: 720 },
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await projects
        .locator(".eco-project-grid > li")
        .last()
        .scrollIntoViewIfNeeded();
      await contained(panel);
      await expect(
        projects.locator(".eco-project-grid > li").last(),
      ).toBeInViewport();
    }
    await projects.scrollIntoViewIfNeeded();
    await contained(panel);
    await page.screenshot({
      path: testInfo.outputPath(`completed-projects-${language}.png`),
    });
    await page
      .getByRole("button", {
        name: language === "en" ? "Back to policies" : "Kembali ke kebijakan",
        exact: true,
      })
      .click();
    await panel.locator('[data-manage-policy="mbg"]').click();
    await expect(panel.getByTestId("policy-briefing")).toContainText(
      language === "en" ? "Funds a programme" : "Mendanai program",
    );
    await expect(
      panel.getByRole("tab", {
        name: language === "en" ? "Projects" : "Proyek",
        exact: true,
      }),
    ).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(page.locator(".policy-workspace-dialog")).toHaveCount(0);
    let unfinished = initialQuarter();
    unfinished = resolveQuarter(
      unfinished,
      { ...basePlan(unfinished), policies: ["plts"] },
      { calm: true, attribution: false },
    );
    unfinished = resolveQuarter(
      unfinished,
      { ...basePlan(unfinished), policies: [] },
      { calm: true, attribution: false },
    );
    await page.locator('input[type="file"]').setInputFiles({
      name: "paused-projects.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(quarterEnvelope(unfinished))),
    });
    await page
      .getByRole("navigation")
      .getByRole("button", {
        name: language === "en" ? "Policies & taxes" : "Kebijakan & pajak",
        exact: true,
      })
      .click();
    await panel.locator('[data-manage-policy="plts"]').click();
    await panel
      .getByRole("tab", {
        name: language === "en" ? "Projects" : "Proyek",
        exact: true,
      })
      .click();
    await expect(projects.locator('[data-status="paused"]')).toHaveCount(9);
    await projects.scrollIntoViewIfNeeded();
    await contained(panel);
    await page.screenshot({
      path: testInfo.outputPath(`paused-projects-${language}.png`),
    });
    const access = await new AxeBuilder({ page })
      .include(".policy-workspace-dialog")
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(access.violations).toEqual([]);
  });
}

test("a full policy portfolio keeps all eight plan cards and funding controls accessible", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await start(page, "en");
  let game = initialQuarter();
  for (let quarter = 0; quarter < 4; quarter++)
    game = resolveQuarter(
      game,
      { ...basePlan(game), policies: POLICY_IDS.slice(0, (quarter + 1) * 2) },
      { calm: true, attribution: false },
    );
  await page.locator('input[type="file"]').setInputFiles({
    name: "full-portfolio.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(quarterEnvelope(game))),
  });
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Policies & taxes", exact: true })
    .click();
  const dialog = page.locator(".policy-workspace-dialog");
  await expect(dialog.locator(".policy-plan-picks button")).toHaveCount(0);
  await expect(dialog.locator(".policy-plan-empty")).toContainText(
    "Currently active: 8",
  );
  for (const id of POLICY_IDS.slice(0, 8)) {
    await dialog.locator(`[data-manage-policy="${id}"]`).click();
    // Facilities go idle instead of stopping outright.
    await expect(page.getByTestId("policy-start")).toHaveText(
      id === "kopdes" ? "Deactivate next quarter" : "Stop next quarter",
    );
    await dialog
      .getByRole("button", { name: "Back to policies", exact: true })
      .click();
  }
  await expect(
    dialog.getByRole("button", { name: "Reset", exact: true }),
  ).toBeDisabled();
  for (const id of POLICY_IDS.slice(0, 6)) {
    await dialog
      .getByTestId("policy-card")
      .filter({ has: page.locator(`[data-manage-policy="${id}"]`) })
      .getByTestId("policy-toggle")
      .click();
  }
  for (const id of ["plts", "irrigation"]) {
    await dialog
      .getByTestId("policy-card")
      .filter({ has: page.locator(`[data-manage-policy="${id}"]`) })
      .getByTestId("policy-toggle")
      .click();
  }
  await expect(dialog.locator(".policy-plan-picks button")).toHaveCount(8);
  await page.screenshot({
    path: testInfo.outputPath("full-portfolio-en-1280.png"),
  });
  const aligned = await dialog
    .locator(".policy-plan-picks")
    .evaluate((node) => {
      const buttons = [...node.querySelectorAll("button")];
      const icons = buttons.map(
        (button) => button.querySelector("svg")!.getBoundingClientRect().left,
      );
      const labels = buttons.map(
        (button) => button.querySelector("span")!.getBoundingClientRect().left,
      );
      return (
        Math.max(...icons) - Math.min(...icons) < 1 &&
        Math.max(...labels) - Math.min(...labels) < 1
      );
    });
  expect(aligned).toBe(true);
  const board = dialog.locator(".policy-plan-board");
  const firstPick = dialog.locator(".policy-plan-picks button").first();
  expect(
    await firstPick.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const viewport = node
        .closest(".policy-plan-picks")!
        .getBoundingClientRect();
      return rect.top >= viewport.top && rect.bottom <= viewport.bottom;
    }),
  ).toBe(true);
  expect(
    await board.evaluate((node) => {
      const box = node.getBoundingClientRect();
      return [
        ...node.querySelectorAll(
          ".policy-plan-capacity, .policy-budget, .policy-plan-actions",
        ),
      ].every((element) => {
        const rect = element.getBoundingClientRect();
        return rect.top >= box.top && rect.bottom <= box.bottom;
      });
    }),
  ).toBe(true);
  for (const pick of await dialog.locator(".policy-plan-picks button").all()) {
    await pick.click();
    await expect(page.getByTestId("policy-start")).toHaveText(
      /Keep running|Add to plan|Remove from plan/,
    );
  }
  await expect(
    dialog.getByRole("button", { name: "Reset", exact: true }),
  ).toBeEnabled();
  await dialog
    .getByRole("button", { name: "Back to policies", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(dialog.locator(".policy-plan-picks button")).toHaveCount(0);
  await expect(
    page.getByTestId("policy-panel").locator(".eco-limit-banner"),
  ).toContainText("8/8");
  await contained(dialog);
});
