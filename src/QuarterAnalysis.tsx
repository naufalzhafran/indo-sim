import { useState } from "react";
import { GameSelect } from "./GameSelect";
import { StatHelp } from "./StatHelp";
import { money, number } from "./components";
import { useLanguage } from "./i18n";
import { foundationNames } from "./engine/economy/catalog";
import {
  FOUNDATIONS,
  type Metrics,
  type QuarterGame,
} from "./engine/economy/types";

const date = (month: number) =>
  `Q${Math.floor((month % 12) / 3) + 1} ${2025 + Math.floor(month / 12)}`;

export function QuarterAnalysis({ game }: { game: QuarterGame }) {
  const language = useLanguage();
  const t = (en: string, id: string) => (language === "id" ? id : en);
  const [key, setKey] = useState<keyof Metrics>("gdp");
  const receipt = game.receipt!;
  const measures: {
    key: keyof Metrics;
    label: string;
    unit: string;
    lower?: boolean;
  }[] = [
    { key: "gdp", label: t("Output (GDP)", "Output (PDB)"), unit: "T" },
    {
      key: "poverty",
      label: t("Poverty", "Kemiskinan"),
      unit: t(" pp", " poin"),
      lower: true,
    },
    {
      key: "unemployment",
      label: t("Unemployment", "Pengangguran"),
      unit: t(" pp", " poin"),
      lower: true,
    },
    {
      key: "jobs",
      label: t("Jobs", "Pekerjaan"),
      unit: t(" million", " juta"),
    },
    { key: "realIncome", label: t("Real income", "Pendapatan riil"), unit: "" },
    {
      key: "inflation",
      label: t("Inflation", "Inflasi"),
      unit: t(" pp", " poin"),
    },
    {
      key: "debt",
      label: t("Public debt", "Utang negara"),
      unit: "T",
      lower: true,
    },
    { key: "cash", label: t("Treasury cash", "Kas negara"), unit: "T" },
    ...FOUNDATIONS.map((f) => ({
      key: f,
      label: foundationNames[f][language],
      unit: t(" points", " poin"),
    })),
  ];
  const metric = measures.find((m) => m.key === key)!;
  const mechanisms: Partial<Record<keyof Metrics, [string, string]>> = {
    gdp: [
      "Output is the sum of industry production. Usable services, investment, demand and local disruptions affect how quickly industries expand.",
      "Output adalah jumlah produksi industri. Layanan yang dapat digunakan, investasi, permintaan, dan gangguan daerah memengaruhi kecepatan perkembangan industri.",
    ],
    poverty: [
      "Higher real income lowers poverty in the model; higher unemployment raises it. Transfers and taxes affect income, while industry hiring affects unemployment.",
      "Pendapatan riil yang lebih tinggi menurunkan kemiskinan dalam model; pengangguran yang lebih tinggi menaikkannya. Bantuan dan pajak memengaruhi pendapatan, sedangkan perekrutan industri memengaruhi pengangguran.",
    ],
    unemployment: [
      "Unemployment depends on jobs relative to the labour force. The labour force grows with population; hiring adjusts gradually to industry output and skills.",
      "Pengangguran bergantung pada jumlah pekerjaan dibanding angkatan kerja. Angkatan kerja tumbuh bersama penduduk; perekrutan menyesuaikan secara bertahap terhadap output industri dan keterampilan.",
    ],
    jobs: [
      "Industry hiring follows production and workforce skills gradually. More output does not immediately create the same percentage increase in jobs.",
      "Perekrutan industri mengikuti produksi dan keterampilan tenaga kerja secara bertahap. Kenaikan output tidak langsung menciptakan kenaikan pekerjaan dengan persentase yang sama.",
    ],
    realIncome: [
      "Real income combines wages, distributed profits, income tax and transfers, adjusted for consumption taxes, food costs and population. The opening income index is 100.",
      "Pendapatan riil menggabungkan upah, laba yang dibagikan, pajak penghasilan, dan bantuan, disesuaikan dengan pajak konsumsi, biaya pangan, dan jumlah penduduk. Indeks pendapatan awal adalah 100.",
    ],
    inflation: [
      "Inflation rises when food security or energy falls below its opening level. Improvements reduce these shortage pressures.",
      "Inflasi naik ketika ketahanan pangan atau energi turun di bawah tingkat awal permainan. Perbaikan mengurangi tekanan kelangkaan ini.",
    ],
    balance: [
      "The quarter’s balance is revenue minus programme spending, basic services and debt interest. Borrowing finances a deficit but is not revenue.",
      "Saldo triwulan adalah penerimaan dikurangi belanja program, layanan dasar, dan bunga utang. Pinjaman membiayai defisit tetapi bukan penerimaan.",
    ],
    debt: [
      "A deficit uses treasury cash first, then new borrowing. A surplus repays debt before adding to treasury cash.",
      "Defisit menggunakan kas negara terlebih dahulu, lalu pinjaman baru. Surplus melunasi utang sebelum menambah kas negara.",
    ],
    cash: [
      "Treasury cash covers deficits before borrowing. Surpluses increase cash only after debt repayment.",
      "Kas negara menutup defisit sebelum pinjaman. Surplus menambah kas setelah pembayaran pokok utang.",
    ],
    education: [
      "Education combines school access, school quality and workforce skills. Population growth strains services; school and university programmes take time to improve skills.",
      "Pendidikan menggabungkan akses sekolah, kualitas sekolah, dan keterampilan tenaga kerja. Pertumbuhan penduduk menekan layanan; program sekolah dan universitas memerlukan waktu untuk meningkatkan keterampilan.",
    ],
    infrastructure: [
      "Transport, water, digital and tourism access programmes raise infrastructure. Wear, funding shortfalls and flood damage reduce it.",
      "Program transportasi, air, digital, dan akses pariwisata meningkatkan infrastruktur. Penyusutan, kekurangan pendanaan, dan kerusakan banjir menurunkannya.",
    ],
    energy: [
      "Energy combines electrification and grid reliability. New capacity takes time to become usable; growing demand can outpace supply even while construction advances.",
      "Energi menggabungkan elektrifikasi dan keandalan jaringan. Kapasitas baru memerlukan waktu untuk digunakan; permintaan yang tumbuh dapat melampaui pasokan meski pembangunan bertambah.",
    ],
    food: [
      "Food security follows production, distribution, storage, nutrition and affordability. Harvest damage and funding shortfalls can offset programme benefits.",
      "Ketahanan pangan mengikuti produksi, distribusi, penyimpanan, gizi, dan keterjangkauan. Kerusakan panen dan kekurangan pendanaan dapat mengimbangi manfaat program.",
    ],
    health: [
      "Health combines access to care and health outcomes. Clinics, water and nutrition help; population pressure, funding shortfalls and outbreaks can slow progress.",
      "Kesehatan menggabungkan akses layanan dan kondisi kesehatan. Klinik, air, dan gizi membantu; tekanan penduduk, kekurangan pendanaan, dan wabah dapat memperlambat kemajuan.",
    ],
  };
  const percentage = ["poverty", "unemployment", "inflation"].includes(key);
  const value = (v: number) =>
    metric.unit === "T"
      ? money(v)
      : `${number(v, 2)}${percentage ? "%" : key === "jobs" ? metric.unit : ""}`;
  const signed = (v: number) =>
    `${v > 0 ? "+" : ""}${number(Math.abs(v) < 1e-9 ? 0 : v, Math.abs(v) > 1e-9 && Math.abs(v) < 0.01 ? 3 : 2)}${metric.unit}`;
  const change = receipt.after[key] - receipt.before[key];
  const effects = receipt.effects;
  const contributions = effects
    ? [
        {
          label: t("Your new decisions", "Keputusan baru Anda"),
          value: effects.decisions[key] ?? 0,
          kind: "plan",
        },
        {
          label: t(
            "Ongoing programmes & conditions",
            "Program berjalan & kondisi",
          ),
          value: effects.world[key] ?? 0,
          kind: "ongoing",
        },
      ]
    : [];
  const dominant = [...contributions].sort(
    (a, b) => Math.abs(b.value) - Math.abs(a.value),
  )[0];
  const scale = Math.max(0.001, ...contributions.map((c) => Math.abs(c.value)));
  const history = game.simulation.history.filter((m) => m.month <= receipt.to);
  const points = [
    ...new Map(
      [...history, receipt.before, receipt.after].map((m) => [m.month, m]),
    ).values(),
  ].sort((a, b) => a.month - b.month);
  const low = Math.min(...points.map((p) => p[key]));
  const high = Math.max(...points.map((p) => p[key]));
  const range = high - low || Math.max(1, Math.abs(high) * 0.01);
  const x = (month: number) =>
    20 +
    ((month - points[0].month) / Math.max(1, receipt.to - points[0].month)) *
      660;
  const y = (v: number) => 160 - ((v - low) / range) * 130;
  return (
    <section className="q-report-analysis" data-testid="quarter-analysis">
      <div className="q-report-analysis-head">
        <h3>{t("Why did this stat change?", "Mengapa angka ini berubah?")}</h3>
        <GameSelect
          value={key}
          onChange={(e) => setKey(e.target.value as keyof Metrics)}
          aria-label={t("Report statistic", "Statistik laporan")}
        >
          {measures.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </GameSelect>
      </div>
      <div className="q-report-analysis-grid">
        <div>
          <dl className="q-report-comparison">
            <div>
              <dt>{t("Quarter opening", "Awal triwulan")}</dt>
              <dd>{value(receipt.before[key])}</dd>
            </div>
            <div>
              <dt>{t("Quarter closing", "Akhir triwulan")}</dt>
              <dd>{value(receipt.after[key])}</dd>
            </div>
            <div>
              <dt>{t("Change", "Perubahan")}</dt>
              <dd
                data-tone={
                  Math.abs(change) < 0.005
                    ? "neutral"
                    : (metric.lower ? change < 0 : change > 0)
                      ? "positive"
                      : "negative"
                }
              >
                {signed(change)}
              </dd>
            </div>
          </dl>
          <figure className="q-report-trend">
            <figcaption>
              {metric.label} · {t("Recorded history", "Riwayat tercatat")}
            </figcaption>
            <div className="q-report-chart-scale">
              <span>
                {t("Recorded range", "Rentang tercatat")}: {value(low)}{" "}
                {t("to", "hingga")} {value(high)}
              </span>
            </div>
            <svg
              key={key}
              viewBox="0 0 700 185"
              role="img"
              aria-label={`${metric.label}: ${points.map((p) => `${date(p.month)} ${value(p[key])}`).join(", ")}`}
            >
              <rect
                x={x(receipt.from)}
                y="15"
                width={x(receipt.to) - x(receipt.from)}
                height="155"
                className="q-report-quarter-range"
              />
              <path d="M20 170H680" className="q-report-axis" />
              <polyline
                points={points
                  .map((p) => `${x(p.month)},${y(p[key])}`)
                  .join(" ")}
              />
              {points.map((p) => (
                <circle
                  key={p.month}
                  cx={x(p.month)}
                  cy={y(p[key])}
                  r={p.month === receipt.to ? 5 : 2.5}
                />
              ))}
            </svg>
            <div className="q-report-chart-dates">
              <span>{date(points[0].month)}</span>
              <span>{date(receipt.to)}</span>
            </div>
            <p>
              {t(
                "Shaded area: the quarter reviewed. Each point is a saved simulation result.",
                "Area berwarna: triwulan yang ditinjau. Setiap titik adalah hasil simulasi tersimpan.",
              )}
            </p>
          </figure>
        </div>
        <div className="q-report-causes">
          <h4>
            <StatHelp
              label={t("Sources of change", "Sumber perubahan")}
              description={t(
                "New decisions compare your plan with keeping the previous settings under the same events. Continuing conditions include existing programmes, economic adjustment and outside events. These are combined contributions, not estimates for each individual policy.",
                "Keputusan baru membandingkan rencana Anda dengan pengaturan sebelumnya pada peristiwa yang sama. Kondisi berlanjut mencakup program berjalan, penyesuaian ekonomi, dan peristiwa luar. Ini kontribusi gabungan, bukan perkiraan setiap kebijakan.",
              )}
            />
          </h4>
          {effects ? (
            <>
              <p>
                {Math.abs(change) < 0.005
                  ? t(
                      "The total was nearly unchanged. Contributions can offset each other.",
                      "Total hampir tetap. Kontribusi dapat saling menyeimbangkan.",
                    )
                  : dominant && Math.abs(dominant.value) >= 0.005
                    ? t(
                        `${dominant.label} made the largest contribution, ${signed(dominant.value)}.`,
                        `${dominant.label} memberi kontribusi terbesar, ${signed(dominant.value)}.`,
                      )
                    : t(
                        "Only a small change was recorded.",
                        "Hanya perubahan kecil yang tercatat.",
                      )}
              </p>
              <ul>
                {contributions.map((c) => (
                  <li key={c.kind}>
                    <div>
                      <span>{c.label}</span>
                      <b>{signed(c.value)}</b>
                    </div>
                    <div className="q-report-driver-bar" aria-hidden="true">
                      <span
                        key={`${key}-${c.kind}`}
                        data-negative={c.value < 0 || undefined}
                        data-kind={c.kind}
                        style={{
                          left:
                            c.value < 0
                              ? `${50 - (Math.abs(c.value) / scale) * 48}%`
                              : "50%",
                          width: `${(Math.abs(c.value) / scale) * 48}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <div className="q-report-chart-dates">
                <span>{t("Decrease", "Turun")}</span>
                <span>{t("Increase", "Naik")}</span>
              </div>
              <p>
                {t(
                  "Both contributions add up to the quarter’s total change before rounding. Continuing programmes can still improve results even when you make no new decisions.",
                  "Kedua kontribusi membentuk perubahan total triwulan sebelum pembulatan. Program berjalan tetap dapat memperbaiki hasil meski tidak ada keputusan baru.",
                )}
              </p>
            </>
          ) : (
            <p>
              {t(
                "This save has no decision breakdown. The opening, closing and history values remain available; individual causes cannot be quantified.",
                "Simpanan ini tidak memiliki rincian kontribusi keputusan. Nilai awal, akhir, dan riwayat tetap tersedia; penyebab individual tidak dapat dihitung.",
              )}
            </p>
          )}
        </div>
      </div>
      <div className="q-report-mechanism">
        <h4>{t("How this stat works", "Cara angka ini dihitung")}</h4>
        <p>{mechanisms[key]?.[language === "id" ? 1 : 0]}</p>
      </div>
    </section>
  );
}
