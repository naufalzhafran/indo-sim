import { useRef, useState, type KeyboardEvent } from "react";
import { money, number } from "./components";
import { useLanguage } from "./i18n";
import { EconomyEmblem } from "./EconomyEmblem";
import { EconomyReport } from "./EconomyReport";
import { QuarterAnalysis } from "./QuarterAnalysis";
import { TreasuryFlow } from "./TreasuryFlow";
import { QuarterDebrief } from "./QuarterDebrief";
import { PolicySpending, RevenueBreakdown } from "./BudgetBreakdown";
import { StatHelp } from "./StatHelp";
import { foundationNames, industries } from "./engine/economy/catalog";
import {
  FOUNDATIONS,
  type QuarterGame,
  type RegionId,
} from "./engine/economy/types";
import type { QuarterVisualTransition } from "./quarterVisual";

const chapters = [
  "events",
  "impact",
  "regions",
  "treasury",
  "records",
] as const;
type Chapter = (typeof chapters)[number];
const signed = (v: number) =>
  `${v > 0 ? "+" : ""}${number(Math.abs(v) < 1e-9 ? 0 : v, Math.abs(v) > 1e-9 && Math.abs(v) < 0.01 ? 3 : 2)}`;

export function GameQuarterReport({
  game,
  recap,
  onRegion,
  onClose,
}: {
  game: QuarterGame;
  recap: QuarterVisualTransition | null;
  onRegion: (id: RegionId) => void;
  onClose: () => void;
}) {
  const language = useLanguage();
  const t = (en: string, id: string) => (language === "id" ? id : en);
  const [chapter, setChapter] = useState<Chapter>(
    game.simulation.month >= 60 ? "records" : "events",
  );
  const [selected, setSelected] = useState<RegionId>("java");
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const stage = useRef<HTMLDivElement>(null);
  const receipt = game.receipt;
  if (!receipt)
    return (
      <div className="game-quarter-report" data-testid="quarter-report">
        <div
          className="report-stage"
          style={{ gridRow: "1 / -1" }}
          tabIndex={0}
          role="region"
          aria-label={t("Economy report", "Laporan ekonomi")}
        >
          <EconomyReport game={game} onRegion={onRegion} />
        </div>
      </div>
    );
  const names: Record<Chapter, string> = {
    events: t("Summary", "Ringkasan"),
    impact: t("Why it changed", "Mengapa berubah"),
    regions: t("Regions", "Wilayah"),
    treasury: t("Budget", "Anggaran"),
    records: t("All numbers", "Semua angka"),
  };
  const index = chapters.indexOf(chapter);
  const selectChapter = (next: Chapter) => {
    setChapter(next);
    stage.current?.scrollTo({ top: 0 });
  };
  const keys = (event: KeyboardEvent, i: number) => {
    const next =
      event.key === "ArrowRight"
        ? (i + 1) % chapters.length
        : event.key === "ArrowLeft"
          ? (i + chapters.length - 1) % chapters.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? chapters.length - 1
              : -1;
    if (next < 0) return;
    event.preventDefault();
    selectChapter(chapters[next]);
    tabs.current[next]?.focus();
  };
  const { before, after, ledger } = receipt;
  const outputChange = before.gdp > 0 ? (after.gdp / before.gdp - 1) * 100 : 0;
  const currentRegion =
    receipt.regionsAfter.find((r) => r.id === selected) ??
    receipt.regionsAfter[0];
  const previousRegion = receipt.regionsBefore.find(
    (r) => r.id === currentRegion.id,
  );
  const changes = receipt.regionsAfter.map((r) => {
    const previous = receipt.regionsBefore.find((p) => p.id === r.id);
    return {
      region: r,
      change:
        previous && previous.gdp > 0 ? (r.gdp / previous.gdp - 1) * 100 : 0,
    };
  });
  const regionScale = Math.max(0.01, ...changes.map((r) => Math.abs(r.change)));
  const industryChanges = industries.map((industry) => {
    const start = receipt.regionsBefore.reduce(
      (sum, r) => sum + r.industries[industry.id].output,
      0,
    );
    const end = receipt.regionsAfter.reduce(
      (sum, r) => sum + r.industries[industry.id].output,
      0,
    );
    return { industry, change: end - start };
  });
  const topIndustries = [...industryChanges]
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, 6);
  const industryScale = Math.max(
    0.01,
    ...industryChanges.map((r) => Math.abs(r.change)),
  );
  const taxRevenue = Object.values(ledger.taxes).reduce((sum, v) => sum + v, 0);
  const balance = ledger.revenue - ledger.spending - ledger.interest;
  const fiscal = [
    {
      label: t("Taxes", "Pajak"),
      short: t("Taxes", "Pajak"),
      value: taxRevenue,
    },
    {
      label: t("Other revenue", "Penerimaan lain"),
      short: t("Other", "Lainnya"),
      value: ledger.nonTaxRevenue,
    },
    {
      label: t("Services & programmes", "Layanan & program"),
      short: t("Spending", "Belanja"),
      value: -ledger.spending,
    },
    {
      label: t("Debt interest", "Bunga utang"),
      short: t("Interest", "Bunga"),
      value: -ledger.interest,
    },
  ];
  return (
    <article className="game-quarter-report" data-testid="quarter-report">
      <div className="report-score-strip">
        <div className="report-period">
          <span>{`Q${Math.floor((receipt.from % 12) / 3) + 1} ${2025 + Math.floor(receipt.from / 12)}`}</span>
          <strong>{t("Quarter completed", "Triwulan selesai")}</strong>
        </div>
        {[
          {
            kind: "manufacturing" as const,
            label: t("Economy (GDP)", "Ekonomi (PDB)"),
            help: t(
              "GDP is the value of everything the country produced. This shows how much it grew in the quarter.",
              "PDB adalah nilai semua barang dan jasa yang diproduksi negara. Angka ini menunjukkan pertumbuhannya dalam triwulan ini.",
            ),
            value: `${signed(outputChange)}%`,
            tone: outputChange > 0 ? "good" : outputChange < 0 ? "bad" : null,
          },
          {
            kind: "income" as const,
            label: t("Poverty rate", "Tingkat kemiskinan"),
            help: t(
              `The share of people below the poverty line went from ${number(before.poverty, 2)}% to ${number(after.poverty, 2)}%. The change is shown in points: 0.1 points is about ${number(Math.round(after.population * 10) * 100, 0)} people.`,
              `Porsi penduduk di bawah garis kemiskinan berubah dari ${number(before.poverty, 2)}% menjadi ${number(after.poverty, 2)}%. Perubahan ditulis dalam poin: 0,1 poin sekitar ${number(Math.round(after.population * 10) * 100, 0)} orang.`,
            ),
            value: `${signed(after.poverty - before.poverty)} ${t("points", "poin")}`,
            tone:
              after.poverty < before.poverty
                ? "good"
                : after.poverty > before.poverty
                  ? "bad"
                  : null,
          },
          {
            kind: "investment" as const,
            label:
              balance < 0
                ? t("Budget deficit", "Defisit anggaran")
                : t("Budget surplus", "Surplus anggaran"),
            help: t(
              "Money the government collected minus what it spent this quarter. A deficit is covered by cash or new borrowing. T means trillion rupiah.",
              "Uang yang diterima pemerintah dikurangi yang dibelanjakan triwulan ini. Defisit ditutup dengan kas atau pinjaman baru. T berarti triliun rupiah.",
            ),
            value: money(balance),
            tone: null,
          },
        ].map((stat) => (
          <div
            className="report-score"
            key={stat.label}
            data-tone={stat.tone ?? undefined}
          >
            <EconomyEmblem kind={stat.kind} />
            <div>
              <span>
                <StatHelp label={stat.label} description={stat.help} />
              </span>
              <strong>
                {stat.value}
                {stat.tone && (
                  <small className="report-score-verdict">
                    {stat.tone === "good"
                      ? t("✓ better", "✓ membaik")
                      : t("✕ worse", "✕ memburuk")}
                  </small>
                )}
              </strong>
            </div>
          </div>
        ))}
      </div>
      <nav
        className="report-chapters"
        role="tablist"
        aria-label={t("Report chapters", "Bagian laporan")}
      >
        {chapters.map((item, i) => (
          <button
            key={item}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            role="tab"
            id={`report-tab-${item}`}
            aria-controls="report-stage"
            aria-selected={chapter === item}
            tabIndex={chapter === item ? 0 : -1}
            onKeyDown={(event) => keys(event, i)}
            onClick={() => selectChapter(item)}
          >
            <span>{i + 1}</span>
            {names[item]}
          </button>
        ))}
      </nav>
      <div
        ref={stage}
        className="report-stage"
        id="report-stage"
        role="tabpanel"
        aria-labelledby={`report-tab-${chapter}`}
        tabIndex={0}
      >
        <div className="report-chapter-content" key={chapter}>
          {chapter === "events" && <QuarterDebrief game={game} recap={recap} />}
          {chapter === "impact" && (
            <>
              <QuarterAnalysis game={game} />
              <section className="report-board report-foundation-board">
                <h3>
                  {t(
                    "Basic services this quarter",
                    "Layanan dasar triwulan ini",
                  )}
                </h3>
                <p>
                  {t(
                    "Scores from 0 to 100. Higher means better schools, roads, power, food and clinics. They wear down unless they are funded.",
                    "Skor 0 sampai 100. Makin tinggi, makin baik sekolah, jalan, listrik, pangan, dan klinik. Skor turun perlahan jika tidak didanai.",
                  )}
                </p>
                <div className="report-legend">
                  <span>{t("Start of quarter", "Awal triwulan")}</span>
                  <span>{t("End of quarter", "Akhir triwulan")}</span>
                </div>
                <div className="report-foundation-tiles">
                  {FOUNDATIONS.map((f) => (
                    <div key={f}>
                      <EconomyEmblem kind={f} />
                      <strong>{foundationNames[f][language]}</strong>
                      <b>
                        {number(after[f], 1)}
                        <small> / 100</small>
                      </b>
                      <div className="report-score-track" aria-hidden="true">
                        <span style={{ width: `${before[f]}%` }} />
                        <span style={{ width: `${after[f]}%` }} />
                      </div>
                      <span>
                        {Math.abs(after[f] - before[f]) < 0.05
                          ? t("Steady", "Stabil")
                          : `${after[f] > before[f] ? "+" : "−"}${number(Math.abs(after[f] - before[f]), 1)} ${t("points", "poin")}`}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
              <section className="report-board">
                <h3>
                  {t(
                    "Which industries grew or shrank most?",
                    "Industri mana yang paling tumbuh atau menyusut?",
                  )}
                </h3>
                <p>
                  {t(
                    "Change in each industry's yearly production, in trillion rupiah (T). Together they make up the economy's growth.",
                    "Perubahan produksi tahunan tiap industri, dalam triliun rupiah (T). Bersama-sama membentuk pertumbuhan ekonomi.",
                  )}
                </p>
                <div className="report-industry-bars">
                  {topIndustries.map((row) => (
                    <div key={row.industry.id}>
                      <EconomyEmblem kind={row.industry.id} />
                      <span>{row.industry.name[language]}</span>
                      <div className="report-signed-track" aria-hidden="true">
                        <span
                          data-negative={row.change < 0 || undefined}
                          style={{
                            left:
                              row.change < 0
                                ? `${50 - (Math.abs(row.change) / industryScale) * 48}%`
                                : "50%",
                            width: `${(Math.abs(row.change) / industryScale) * 48}%`,
                          }}
                        />
                      </div>
                      <b>{signed(row.change)}T</b>
                    </div>
                  ))}
                </div>
                {industryChanges.length > topIndustries.length && (
                  <p>
                    {t(
                      `The other ${industryChanges.length - topIndustries.length} industries changed less.`,
                      `${industryChanges.length - topIndustries.length} industri lainnya berubah lebih kecil.`,
                    )}
                  </p>
                )}
              </section>
            </>
          )}
          {chapter === "regions" && (
            <div className="report-region-layout">
              <section className="report-board">
                <h3>
                  {t(
                    "Growth across the islands",
                    "Pertumbuhan di seluruh kepulauan",
                  )}
                </h3>
                <p>
                  {t(
                    "How much each island's economy grew. Select an island to see how its families and services did.",
                    "Seberapa besar ekonomi tiap pulau tumbuh. Pilih pulau untuk melihat kondisi warga dan layanannya.",
                  )}
                </p>
                <div className="report-region-chart">
                  {changes.map((row) => (
                    <button
                      key={row.region.id}
                      aria-pressed={selected === row.region.id}
                      onClick={() => setSelected(row.region.id)}
                    >
                      <span>
                        {language === "id"
                          ? row.region.nameId
                          : row.region.name}
                      </span>
                      <span className="report-signed-track" aria-hidden="true">
                        <span
                          data-negative={row.change < 0 || undefined}
                          style={{
                            left:
                              row.change < 0
                                ? `${50 - (Math.abs(row.change) / regionScale) * 48}%`
                                : "50%",
                            width: `${(Math.abs(row.change) / regionScale) * 48}%`,
                          }}
                        />
                      </span>
                      <b>{signed(row.change)}%</b>
                    </button>
                  ))}
                </div>
              </section>
              <section
                className="report-board report-region-dossier"
                key={selected}
              >
                <h3>
                  {language === "id"
                    ? currentRegion.nameId
                    : currentRegion.name}
                </h3>
                <dl className="report-region-stats">
                  {[
                    {
                      label: t("Poverty", "Kemiskinan"),
                      value: `${number(currentRegion.poverty, 2)}%`,
                      delta: previousRegion
                        ? signed(currentRegion.poverty - previousRegion.poverty)
                        : null,
                    },
                    {
                      label: t("Unemployment", "Pengangguran"),
                      value: `${number(currentRegion.unemployment, 2)}%`,
                      delta: previousRegion
                        ? signed(
                            currentRegion.unemployment -
                              previousRegion.unemployment,
                          )
                        : null,
                    },
                    {
                      label: t("Programme spending", "Belanja program"),
                      value: money(
                        Object.values(currentRegion.policySpending).reduce(
                          (sum, v) => sum + (v ?? 0),
                          0,
                        ),
                      ),
                      delta: null,
                    },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <dt>{stat.label}</dt>
                      <dd>{stat.value}</dd>
                      {stat.delta && (
                        <dd className="report-region-delta">
                          <small>
                            {stat.delta}{" "}
                            {t("points this quarter", "poin triwulan ini")}
                          </small>
                        </dd>
                      )}
                    </div>
                  ))}
                </dl>
                <h4>
                  {t(
                    "Basic services in this region",
                    "Layanan dasar di wilayah ini",
                  )}
                </h4>
                <div className="report-region-foundations">
                  {FOUNDATIONS.map((f) => (
                    <div key={f}>
                      <EconomyEmblem kind={f} />
                      <span>{foundationNames[f][language]}</span>
                      <span className="report-score-track" aria-hidden="true">
                        <span
                          style={{
                            width: `${previousRegion?.foundations[f] ?? currentRegion.foundations[f]}%`,
                          }}
                        />
                        <span
                          style={{ width: `${currentRegion.foundations[f]}%` }}
                        />
                      </span>
                      <b>{number(currentRegion.foundations[f], 1)}</b>
                    </div>
                  ))}
                </div>
                <button
                  className="report-region-open"
                  onClick={() => onRegion(currentRegion.id)}
                >
                  {t("Open region", "Buka wilayah")}
                </button>
              </section>
            </div>
          )}
          {chapter === "treasury" && (
            <div className="report-treasury-layout">
              <section className="report-board">
                <h3>{t("Money in, money out", "Uang masuk, uang keluar")}</h3>
                <p className="report-budget-lead">
                  {balance < 0
                    ? t(
                        `The government collected ${money(ledger.revenue)} and spent ${money(ledger.spending + ledger.interest)}. It was ${money(-balance)} short, so it ${ledger.borrowing > 0.05 ? `borrowed ${money(ledger.borrowing)}` : "used its cash"} to cover the gap.`,
                        `Pemerintah menerima ${money(ledger.revenue)} dan membelanjakan ${money(ledger.spending + ledger.interest)}. Kurang ${money(-balance)}, jadi pemerintah ${ledger.borrowing > 0.05 ? `meminjam ${money(ledger.borrowing)}` : "memakai kas"} untuk menutupnya.`,
                      )
                    : t(
                        `The government collected ${money(ledger.revenue)} and spent ${money(ledger.spending + ledger.interest)}. The ${money(balance)} left over repaid debt or went into cash.`,
                        `Pemerintah menerima ${money(ledger.revenue)} dan membelanjakan ${money(ledger.spending + ledger.interest)}. Sisa ${money(balance)} dipakai melunasi utang atau masuk kas.`,
                      )}
                </p>
                <TreasuryFlow
                  entries={fiscal}
                  balance={balance}
                  borrowing={ledger.borrowing}
                  repayment={ledger.repayment}
                  cashBefore={before.cash}
                  cashAfter={after.cash}
                />
              </section>
              <div className="debrief-column">
                <RevenueBreakdown game={game} />
                <PolicySpending game={game} />
                <section className="report-board">
                  <h3>
                    <StatHelp
                      label={t(
                        "Programmes fully paid",
                        "Program terbayar penuh",
                      )}
                      description={t(
                        "The share of the money your programmes needed that the budget actually paid. Below 100%, programmes deliver less.",
                        "Porsi dana yang dibutuhkan program dan benar-benar dibayar anggaran. Di bawah 100%, hasil program berkurang.",
                      )}
                    />
                  </h3>
                  <div
                    className="report-funding-meter"
                    role="meter"
                    aria-label={t(
                      "Programmes fully paid",
                      "Program terbayar penuh",
                    )}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={ledger.funding * 100}
                  >
                    <span style={{ width: `${ledger.funding * 100}%` }} />
                  </div>
                  <strong>{number(ledger.funding * 100, 0)}%</strong>
                  {ledger.funding < 0.999 && (
                    <p role="status">
                      {t(
                        "Some programmes did not get all their money, so they helped less than planned.",
                        "Sebagian program tidak mendapat dana penuh, jadi manfaatnya lebih kecil dari rencana.",
                      )}
                    </p>
                  )}
                </section>
              </div>
            </div>
          )}
          {chapter === "records" && (
            <EconomyReport game={game} onRegion={onRegion} />
          )}
        </div>
      </div>
      <footer className="report-chapter-footer">
        <span>
          {index + 1} / {chapters.length} · {names[chapter]}
        </span>
        <div>
          <button
            disabled={index === 0}
            onClick={() => {
              selectChapter(chapters[index - 1]);
              tabs.current[index - 1]?.focus();
            }}
          >
            {t("Previous", "Sebelumnya")}
          </button>
          {index < chapters.length - 1 ? (
            <button
              className="report-next"
              onClick={() => {
                selectChapter(chapters[index + 1]);
                tabs.current[index + 1]?.focus();
              }}
            >
              {t("Next", "Berikutnya")}: {names[chapters[index + 1]]}
            </button>
          ) : (
            <button className="report-next" onClick={onClose}>
              {t("Back to islands", "Kembali ke kepulauan")}
            </button>
          )}
        </div>
      </footer>
    </article>
  );
}
