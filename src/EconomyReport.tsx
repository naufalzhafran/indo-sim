import { money, number } from "./components";
import { translate, useLanguage } from "./i18n";
import { CampaignGoals } from "./CampaignGoals";
import { PowerReport } from "./PowerReport";
import { QuarterAnalysis } from "./QuarterAnalysis";
import { recapLabels, recapConsequences } from "./QuarterRecap";
import { policyName, type QuarterVisualTransition } from "./quarterVisual";
import { foundationNames } from "./engine/economy/catalog";
import { taxDefinitions } from "./engine/taxes";
import {
  FOUNDATIONS,
  type Metrics,
  type PolicyId,
  type QuarterGame,
  type RegionId,
} from "./engine/economy/types";

const total = (values: Record<string, number | undefined>) =>
  Object.values(values).reduce<number>((sum, value) => sum + (value ?? 0), 0);
const incomeIndex = (metrics: Metrics, initial: Metrics) =>
  initial.realIncome > 0
    ? (metrics.realIncome / initial.realIncome) * 100
    : 100;

export function EconomyReport({
  game,
  recap,
  onRegion,
}: {
  game: QuarterGame;
  recap?: QuarterVisualTransition | null;
  onRegion: (id: RegionId) => void;
}) {
  const language = useLanguage();
  const t = (en: string, id: string) => (language === "id" ? id : en);
  const signedChange = (value: number) => {
    const rounded = Math.abs(value) < 1e-9 ? 0 : value;
    return `${rounded > 0 ? "+" : ""}${number(rounded, Math.abs(rounded) > 0 && Math.abs(rounded) < 0.01 ? 3 : 2)}`;
  };
  const receipt = game.receipt;
  if (!receipt)
    return (
      <div className="eco-report" data-testid="quarter-report-details">
        <h2>
          {t("Your first report is ahead", "Laporan pertama akan tersedia")}
        </h2>
        <p>
          {t(
            "Advance a quarter to see the effects of your decisions.",
            "Lanjutkan satu triwulan untuk melihat dampak keputusan Anda.",
          )}
        </p>
        <CampaignGoals game={game} />
        <PowerReport game={game} />
      </div>
    );
  const final = game.simulation.month >= 60;
  const initial = game.simulation.history[0] ?? receipt.before;
  const before = final ? initial : receipt.before;
  const after = receipt.after;
  const ledger = receipt.ledger;
  const fromLabel = final
    ? t("Start of term", "Awal masa jabatan")
    : t("Quarter opening", "Awal triwulan");
  const toLabel = final
    ? t("End of year five", "Akhir tahun kelima")
    : t("Quarter closing", "Akhir triwulan");
  const metrics: {
    key: string;
    label: string;
    before: number;
    after: number;
    format: (value: number) => string;
    lowerBetter?: boolean;
  }[] = [
    {
      key: "income",
      label: t("Real income (opening = 100)", "Pendapatan riil (awal = 100)"),
      before: incomeIndex(before, initial),
      after: incomeIndex(after, initial),
      format: (value) => number(value, 1),
    },
    {
      key: "jobs",
      label: t("Jobs (million)", "Pekerjaan (juta)"),
      before: before.jobs,
      after: after.jobs,
      format: (value) => number(value, 2),
    },
    {
      key: "poverty",
      label: t("Poverty", "Kemiskinan"),
      before: before.poverty,
      after: after.poverty,
      format: (value) => `${number(value, 2)}%`,
      lowerBetter: true,
    },
    {
      key: "unemployment",
      label: t("Unemployment", "Pengangguran"),
      before: before.unemployment,
      after: after.unemployment,
      format: (value) => `${number(value, 2)}%`,
      lowerBetter: true,
    },
    ...FOUNDATIONS.map((foundation) => ({
      key: foundation,
      label: `${foundationNames[foundation][language]} / 100`,
      before: before[foundation],
      after: after[foundation],
      format: (value: number) => number(value, 1),
    })),
    {
      key: "inequality",
      label: t("Regional disparities", "Kesenjangan wilayah"),
      before: before.inequality,
      after: after.inequality,
      format: (value) => number(value, 2),
      lowerBetter: true,
    },
    {
      key: "debt",
      label: t("Public debt", "Utang negara"),
      before: before.debt,
      after: after.debt,
      format: money,
      lowerBetter: true,
    },
    {
      key: "debtRatio",
      label: t("Debt / GDP", "Utang / PDB"),
      before:
        before.gdp > 0
          ? (before.debt / (before.gdp * before.priceIndex)) * 100
          : 0,
      after:
        after.gdp > 0 ? (after.debt / (after.gdp * after.priceIndex)) * 100 : 0,
      format: (value) => `${number(value, 2)}%`,
      lowerBetter: true,
    },
  ];
  return (
    <article className="eco-report" data-testid="quarter-report-details">
      <header>
        <p className="eco-kicker">
          {final
            ? t("Twenty quarters completed", "Dua puluh triwulan selesai")
            : `${t("Quarter", "Triwulan")} ${Math.ceil(receipt.to / 3)}`}
        </p>
        <h2>
          {final
            ? t(
                "Five-year development report",
                "Laporan pembangunan lima tahun",
              )
            : t("Your quarter in review", "Tinjauan triwulan Anda")}
        </h2>
        <p>
          {final
            ? t(
                "Compare the country you started with and the results of your term. Progress has several dimensions; there is no single combined score.",
                "Bandingkan kondisi awal negara dengan hasil masa jabatan Anda. Kemajuan memiliki beberapa dimensi; tidak ada satu skor gabungan.",
              )
            : t(
                "Actual results after three months of policy delivery, business decisions and outside events.",
                "Hasil aktual setelah tiga bulan pelaksanaan kebijakan, keputusan usaha, dan peristiwa luar.",
              )}
        </p>
      </header>
      {final && <CampaignGoals game={game} />}
      <QuarterAnalysis game={game} />
      {!!recap?.callouts.length && (
        <section>
          <h3>
            {t("What happened on the islands", "Yang terjadi di kepulauan")}
          </h3>
          <ul className="q-report-milestones eco-event-list">
            {recap.callouts.map((callout, index) => (
              <li key={`${callout.province}-${callout.event}-${index}`}>
                <strong>
                  {language === "id"
                    ? (callout.nameId ?? callout.name)
                    : callout.name}
                  :{" "}
                  {language === "id"
                    ? (recapLabels[callout.label] ?? translate(callout.label))
                    : callout.label}
                </strong>
                {callout.detail && <p>{translate(callout.detail)}</p>}
                {callout.before !== undefined &&
                  callout.after !== undefined && (
                    <p>
                      {number(callout.before, 2)}
                      {callout.unit} → {number(callout.after, 2)}
                      {callout.unit}
                    </p>
                  )}
                {callout.beforeState && callout.afterState && (
                  <p>
                    {language === "id"
                      ? (recapLabels[callout.beforeState] ??
                        translate(callout.beforeState))
                      : callout.beforeState}{" "}
                    →{" "}
                    {language === "id"
                      ? (recapLabels[callout.afterState] ??
                        translate(callout.afterState))
                      : callout.afterState}
                  </p>
                )}
                <p>
                  {recapConsequences[callout.event][language === "id" ? 1 : 0]}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {recap && !recap.partial && (
        <section className="q-report-decisions">
          <h3>{t("Decisions carried out", "Keputusan yang dijalankan")}</h3>
          <ul className="eco-event-list">
            {recap.decisions.launched.map((id) => (
              <li key={id}>
                {t("Launched", "Diluncurkan")}:{" "}
                <strong>{policyName(id)}</strong>
              </li>
            ))}
            {recap.decisions.ended.map((id) => (
              <li key={id}>
                {t("Ended", "Dihentikan")}: <strong>{policyName(id)}</strong>
              </li>
            ))}
            {recap.decisions.taxesChanged && (
              <li>{t("Tax settings changed.", "Pengaturan pajak berubah.")}</li>
            )}
            {recap.decisions.allocationChanged && (
              <li>
                {t(
                  "Programme budgets were redistributed across regions.",
                  "Anggaran program dialokasikan ulang antarwilayah.",
                )}
              </li>
            )}
            {!recap.decisions.launched.length &&
              !recap.decisions.ended.length &&
              !recap.decisions.taxesChanged &&
              !recap.decisions.allocationChanged && (
                <li>
                  {t(
                    "Kept the previous quarter’s plan. Existing programmes continued delivering their effects.",
                    "Rencana triwulan sebelumnya dipertahankan. Program berjalan terus memberi dampak.",
                  )}
                </li>
              )}
          </ul>
        </section>
      )}
      <section>
        <h3>
          {final
            ? t("Development outcomes", "Hasil pembangunan")
            : t("National outcomes", "Hasil nasional")}
        </h3>
        <table className="eco-data-table eco-outcomes-table">
          <thead>
            <tr>
              <th scope="col">{t("Measure", "Ukuran")}</th>
              <th scope="col">{fromLabel}</th>
              <th scope="col">{toLabel}</th>
              <th scope="col">{t("Direction", "Arah")}</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => {
              const difference = metric.after - metric.before;
              const direction =
                metric.format(metric.before) === metric.format(metric.after)
                  ? "flat"
                  : difference > 0
                    ? "up"
                    : "down";
              const improved =
                direction !== "flat" &&
                (metric.lowerBetter ? difference < 0 : difference > 0);
              return (
                <tr key={metric.key}>
                  <th scope="row">{metric.label}</th>
                  <td>{metric.format(metric.before)}</td>
                  <td>{metric.format(metric.after)}</td>
                  <td>
                    <span
                      className="eco-result-direction"
                      data-improved={improved}
                      data-neutral={direction === "flat"}
                    >
                      {direction === "flat"
                        ? t("Steady", "Tetap")
                        : direction === "up"
                          ? `↑ ${t("Higher", "Naik")}`
                          : `↓ ${t("Lower", "Turun")}`}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="eco-impact-note">
          {t(
            "Lower poverty, unemployment and regional disparities indicate improvement. Debt should also be assessed against GDP, investment and treasury cash.",
            "Kemiskinan, pengangguran, dan kesenjangan wilayah yang lebih rendah menunjukkan perbaikan. Utang juga perlu dinilai bersama PDB, investasi, dan kas negara.",
          )}
        </p>
        <p className="eco-impact-note">
          {t(
            "Regional disparities measure the population-weighted variation in GDP per person across the nine regions, relative to the national average. Lower means more even regional prosperity.",
            "Kesenjangan wilayah mengukur variasi PDRB per penduduk pada sembilan wilayah, dibobot jumlah penduduk dan dibandingkan rata-rata nasional. Nilai lebih rendah berarti kesejahteraan wilayah lebih merata.",
          )}
        </p>
      </section>
      <section>
        <h3>
          {t(
            "Last quarter’s fiscal accounts",
            "Realisasi fiskal triwulan terakhir",
          )}
        </h3>
        <p className="eco-impact-note">
          {t(
            "Actual flows for the last three months, not a forecast or a five-year total. Spending includes interest.",
            "Arus aktual tiga bulan terakhir, bukan proyeksi atau total lima tahun. Belanja mencakup bunga.",
          )}
        </p>
        <div className="eco-fiscal-columns">
          <table className="eco-data-table">
            <caption>{t("Revenue", "Penerimaan")}</caption>
            <tbody>
              {taxDefinitions.map((tax) => (
                <tr key={tax.id}>
                  <th scope="row">{tax.name[language]}</th>
                  <td>{money(ledger.taxes[tax.id])}</td>
                </tr>
              ))}
              <tr>
                <th scope="row">
                  {t("Non-tax revenue", "Penerimaan bukan pajak")}
                </th>
                <td>{money(ledger.nonTaxRevenue)}</td>
              </tr>
              <tr className="eco-total-row">
                <th scope="row">{t("Total revenue", "Total penerimaan")}</th>
                <td>{money(ledger.revenue)}</td>
              </tr>
            </tbody>
          </table>
          <table className="eco-data-table">
            <caption>
              {t("Spending and financing", "Belanja dan pembiayaan")}
            </caption>
            <tbody>
              <tr>
                <th scope="row">
                  {t("Core public services", "Layanan publik dasar")}
                </th>
                <td>{money(ledger.spending - total(ledger.policySpending))}</td>
              </tr>
              <tr>
                <th scope="row">
                  {t("Policy delivery", "Pelaksanaan kebijakan")}
                </th>
                <td>{money(total(ledger.policySpending))}</td>
              </tr>
              <tr>
                <th scope="row">{t("Interest", "Bunga")}</th>
                <td>{money(ledger.interest)}</td>
              </tr>
              <tr className="eco-total-row">
                <th scope="row">{t("Total spending", "Total belanja")}</th>
                <td>{money(ledger.spending + ledger.interest)}</td>
              </tr>
              <tr className="eco-total-row">
                <th scope="row">
                  {t("Quarter budget balance", "Saldo anggaran triwulan")}
                </th>
                <td>
                  {money(ledger.revenue - ledger.spending - ledger.interest)}
                </td>
              </tr>
              <tr>
                <th scope="row">{t("New borrowing", "Pinjaman baru")}</th>
                <td>{money(ledger.borrowing)}</td>
              </tr>
              <tr>
                <th scope="row">
                  {t("Debt repayment", "Pembayaran pokok utang")}
                </th>
                <td>{money(ledger.repayment)}</td>
              </tr>
              <tr>
                <th scope="row">{t("Cash change", "Perubahan kas")}</th>
                <td>
                  {ledger.cashChange > 0 ? "+" : ""}
                  {money(ledger.cashChange)}
                </td>
              </tr>
              <tr>
                <th scope="row">{t("Closing cash", "Kas akhir")}</th>
                <td>{money(after.cash)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {ledger.funding < 0.999 && (
          <p className="eco-notice">
            {t("Funding covered", "Pendanaan mencakup")}{" "}
            {number(ledger.funding * 100, 1)}%{" "}
            {t(
              "of requested delivery. Unfunded plans did not receive full benefits.",
              "dari kebutuhan pelaksanaan. Rencana yang kekurangan dana tidak mendapat manfaat penuh.",
            )}
          </p>
        )}
      </section>
      <section>
        <h3>
          {t(
            "Regional contributions last quarter",
            "Kontribusi wilayah triwulan terakhir",
          )}
        </h3>
        <table className="eco-data-table">
          <thead>
            <tr>
              <th scope="col">{t("Region", "Wilayah")}</th>
              <th scope="col">
                {t("Policy funds delivered", "Dana kebijakan tersalurkan")}
              </th>
              <th scope="col">{t("Tax receipts", "Penerimaan pajak")}</th>
              <th scope="col">{t("Output change", "Perubahan output")}</th>
              <th scope="col">{t("Poverty change", "Perubahan kemiskinan")}</th>
              <th scope="col">
                {t("Unemployment change", "Perubahan pengangguran")}
              </th>
            </tr>
          </thead>
          <tbody>
            {receipt.regionsAfter.map((region) => {
              const previous = receipt.regionsBefore.find(
                (item) => item.id === region.id,
              );
              const change =
                previous && previous.gdp > 0
                  ? (region.gdp / previous.gdp - 1) * 100
                  : 0;
              return (
                <tr key={region.id}>
                  <th scope="row">
                    <button
                      type="button"
                      className="eco-industry-button"
                      onClick={() => onRegion(region.id)}
                    >
                      {language === "id" ? region.nameId : region.name}
                    </button>
                    <p className="q-report-programmes">
                      {Object.entries(region.policySpending)
                        .filter(([, spending]) => (spending ?? 0) > 0.005)
                        .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
                        .slice(0, 2)
                        .map(([id]) => policyName(id as PolicyId))
                        .join(", ") ||
                        t("No programme spending", "Tidak ada belanja program")}
                    </p>
                  </th>
                  <td>{money(total(region.policySpending))}</td>
                  <td>{money(total(region.taxes))}</td>
                  <td>
                    {change > 0 ? "+" : ""}
                    {number(change, 2)}%
                  </td>
                  {["poverty", "unemployment"].map((key) => {
                    const field = key as "poverty" | "unemployment";
                    const delta = previous
                      ? region[field] - previous[field]
                      : null;
                    return (
                      <td key={key}>
                        {delta === null
                          ? t("Unavailable", "Tidak tersedia")
                          : `${signedChange(delta)}${t(" pp", " poin")}`}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        <h4>{t("Regional foundations", "Fondasi wilayah")}</h4>
        <table className="eco-data-table">
          <caption>
            {t(
              "Change this quarter, in score points. Select a region above for its industries and programme delivery.",
              "Perubahan triwulan ini dalam poin skor. Pilih wilayah di atas untuk melihat industri dan pelaksanaan program.",
            )}
          </caption>
          <thead>
            <tr>
              <th scope="col">{t("Region", "Wilayah")}</th>
              {FOUNDATIONS.map((f) => (
                <th scope="col" key={f}>
                  {foundationNames[f][language]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {receipt.regionsAfter.map((region) => {
              const previous = receipt.regionsBefore.find(
                (r) => r.id === region.id,
              );
              return (
                <tr key={region.id}>
                  <th scope="row">
                    {language === "id" ? region.nameId : region.name}
                  </th>
                  {FOUNDATIONS.map((f) => {
                    const delta = previous
                      ? region.foundations[f] - previous.foundations[f]
                      : null;
                    return (
                      <td key={f}>
                        {delta === null
                          ? t("Unavailable", "Tidak tersedia")
                          : signedChange(delta)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <section>
        <h3>{t("What drove the quarter", "Penggerak triwulan ini")}</h3>
        {receipt.effects && (
          <>
            <p className="eco-impact-note">
              {t(
                "The plan contribution compares your choices with continuing the previous settings under the same events. Existing policies, economic adjustment and outside events make up the remaining change.",
                "Kontribusi rencana membandingkan pilihan Anda dengan melanjutkan pengaturan sebelumnya pada peristiwa yang sama. Kebijakan berjalan, penyesuaian ekonomi, dan peristiwa luar menjelaskan perubahan lainnya.",
              )}
            </p>
            <table className="eco-data-table">
              <thead>
                <tr>
                  <th scope="col">{t("Foundation", "Fondasi")}</th>
                  <th scope="col">
                    {t("This plan’s contribution", "Kontribusi rencana ini")}
                  </th>
                  <th scope="col">
                    {t("Continuing conditions", "Kondisi berlanjut")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {FOUNDATIONS.map((foundation) => {
                  const planChange =
                    receipt.effects!.decisions[foundation] ?? 0;
                  const continuing = receipt.effects!.world[foundation] ?? 0;
                  return (
                    <tr key={foundation}>
                      <th scope="row">
                        {foundationNames[foundation][language]}
                      </th>
                      <td>
                        {planChange > 0 ? "+" : ""}
                        {number(planChange, 2)}
                      </td>
                      <td>
                        {continuing > 0 ? "+" : ""}
                        {number(continuing, 2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
        {receipt.events.length ? (
          <ul className="eco-event-list">
            {receipt.events.map((event, index) => (
              <li key={`${event.month}-${event.kind}-${index}`}>
                <strong>{event.title[language]}</strong>
                <p>{event.detail[language]}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p>
            {t(
              "No major outside events. Outcomes reflect ongoing services, the policy portfolio and business adjustment.",
              "Tidak ada peristiwa luar besar. Hasil mencerminkan layanan rutin, pilihan kebijakan, dan penyesuaian usaha.",
            )}
          </p>
        )}
      </section>
      {!final && <CampaignGoals game={game} />}
      <PowerReport game={game} />
    </article>
  );
}
