import { useRef, useState, type KeyboardEvent } from "react";
import { money, number } from "./components";
import { useLanguage } from "./i18n";
import { EconomyEmblem } from "./EconomyEmblem";
import { EconomyReport } from "./EconomyReport";
import { QuarterAnalysis } from "./QuarterAnalysis";
import { TreasuryFlow } from "./TreasuryFlow";
import { QuarterDebrief } from "./QuarterDebrief";
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
    events: t("What happened", "Yang terjadi"),
    impact: t("National impact", "Dampak nasional"),
    regions: t("Regions", "Wilayah"),
    treasury: t("Treasury", "Kas negara"),
    records: t("Full records", "Rincian lengkap"),
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
            label: t("Output", "Output"),
            value: `${signed(outputChange)}%`,
            tone: outputChange > 0 ? "good" : outputChange < 0 ? "bad" : null,
          },
          {
            kind: "income" as const,
            label: t("Poverty change", "Perubahan kemiskinan"),
            value: `${signed(after.poverty - before.poverty)} ${t("pp", "poin")}`,
            tone:
              after.poverty < before.poverty
                ? "good"
                : after.poverty > before.poverty
                  ? "bad"
                  : null,
          },
          {
            kind: "investment" as const,
            label: t("Budget balance", "Saldo anggaran"),
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
              <span>{stat.label}</span>
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
              <section className="report-board report-foundation-board">
                <h3>{t("Foundation progress", "Perkembangan fondasi")}</h3>
                <div className="report-legend">
                  <span>{t("Opening", "Awal")}</span>
                  <span>{t("Closing", "Akhir")}</span>
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
                        {number(before[f], 1)} → {number(after[f], 1)} (
                        {signed(after[f] - before[f])})
                      </span>
                    </div>
                  ))}
                </div>
              </section>
              <QuarterAnalysis game={game} />
              <section className="report-board">
                <h3>
                  {t(
                    "Which industries moved output?",
                    "Industri mana yang mengubah output?",
                  )}
                </h3>
                <p>
                  {t(
                    "Actual change in annualised production, Rp trillion. These contributions add up to the national output change.",
                    "Perubahan aktual produksi tahunan, triliun rupiah. Kontribusi ini membentuk perubahan output nasional.",
                  )}
                </p>
                <div className="report-industry-bars">
                  {industryChanges.map((row) => (
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
              </section>
            </>
          )}
          {chapter === "regions" && (
            <div className="report-region-layout">
              <section className="report-board">
                <h3>
                  {t(
                    "Output across the archipelago",
                    "Output di seluruh kepulauan",
                  )}
                </h3>
                <p>
                  {t(
                    "Select an island to inspect its quarter.",
                    "Pilih pulau untuk meninjau triwulannya.",
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
                            {t("pp this quarter", "poin triwulan ini")}
                          </small>
                        </dd>
                      )}
                    </div>
                  ))}
                </dl>
                <h4>{t("Regional foundations", "Fondasi wilayah")}</h4>
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
                <h3>
                  {t(
                    "From revenue to the quarter’s balance",
                    "Dari penerimaan ke saldo triwulan",
                  )}
                </h3>
                <p>
                  {t(
                    "Each step adds revenue or subtracts spending. All amounts are actual quarter flows in Rp trillion.",
                    "Setiap tahap menambah penerimaan atau mengurangi belanja. Semua angka adalah arus aktual triwulan dalam triliun rupiah.",
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
              <section className="report-board">
                <h3>
                  {t(
                    "How the balance was financed",
                    "Bagaimana saldo dibiayai",
                  )}
                </h3>
                <div className="report-finance-flow">
                  <div>
                    <EconomyEmblem kind="investment" />
                    <span>{t("New borrowing", "Pinjaman baru")}</span>
                    <b>{money(ledger.borrowing)}</b>
                  </div>
                  <div>
                    <EconomyEmblem kind="profits" />
                    <span>{t("Debt repaid", "Utang dilunasi")}</span>
                    <b>{money(ledger.repayment)}</b>
                  </div>
                  <div>
                    <EconomyEmblem kind="income" />
                    <span>{t("Closing cash", "Kas akhir")}</span>
                    <b>{money(after.cash)}</b>
                  </div>
                </div>
                <p>
                  {t(
                    "Deficits use cash before borrowing. Surpluses repay debt before adding to cash.",
                    "Defisit menggunakan kas sebelum pinjaman. Surplus melunasi utang sebelum menambah kas.",
                  )}
                </p>
                <h4>{t("Programme funding", "Pendanaan program")}</h4>
                <div
                  className="report-funding-meter"
                  role="meter"
                  aria-label={t("Programme funding", "Pendanaan program")}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={ledger.funding * 100}
                >
                  <span style={{ width: `${ledger.funding * 100}%` }} />
                </div>
                <strong>{number(ledger.funding * 100, 1)}%</strong>
                {ledger.funding < 0.999 && (
                  <p role="status">
                    {t(
                      "Some requested delivery was unfunded, reducing programme benefits.",
                      "Sebagian kebutuhan pelaksanaan tidak didanai, sehingga manfaat program berkurang.",
                    )}
                  </p>
                )}
              </section>
            </div>
          )}
          {chapter === "records" && (
            <EconomyReport game={game} recap={recap} onRegion={onRegion} />
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
