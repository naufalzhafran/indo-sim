import { number } from "./components";
import { foundationNames } from "./engine/economy/catalog";
import { QUARTER_TREND_GROWTH } from "./engine/economy/engine";
import { regionForProvince } from "./engine/gameRegions";
import { FOUNDATIONS, type QuarterReceipt } from "./engine/economy/types";

export type ResultTone = "good" | "bad" | "neutral";
type Tone = ResultTone;

const signed = (v: number, digits = 2) =>
  `${v > 1e-9 ? "+" : v < -1e-9 ? "−" : ""}${number(Math.abs(v) < 1e-9 ? 0 : Math.abs(v), digits)}`;

/**
 * Plain-language results: what the quarter meant for people, without a score.
 * The quarter summary and the report share them so both say the same thing.
 */
export function quarterResults(receipt: QuarterReceipt, language: "en" | "id") {
  const t = (en: string, id: string) => (language === "id" ? id : en);
  const { before, after, ledger } = receipt;
  const crisisRegions = new Set(
    receipt.events
      .filter((e) => e.kind === "crisis" && e.province)
      .map((e) => regionForProvince(e.province!)?.id)
      .filter(Boolean),
  );
  const outputChange = before.gdp > 0 ? (after.gdp / before.gdp - 1) * 100 : 0;
  const jobsChange = after.unemployment - before.unemployment;
  const povertyChange = after.poverty - before.poverty;
  const foundationChange = FOUNDATIONS.reduce(
    (sum, f) => sum + (after[f] - before[f]),
    0,
  );
  const tone = (value: number, goodWhenUp = true, steady = 1e-6): Tone =>
    Math.abs(value) < steady
      ? "neutral"
      : value > 0 === goodWhenUp
        ? "good"
        : "bad";
  // Population and jobs are stored in millions of people.
  const people = (millions: number) => {
    const n = Math.abs(millions) * 1e6;
    const rounded =
      n >= 1e6
        ? `${number(n / 1e6, 1)} ${t("million", "juta")}`
        : number(Math.round(n / 1000) * 1000, 0);
    return rounded;
  };
  const poorChange = (povertyChange / 100) * after.population;
  const newJobs = after.jobs - before.jobs;
  const results = [
    {
      id: "output",
      kind: "manufacturing" as const,
      name: t("Economy", "Ekonomi"),
      value: `${signed(outputChange)}%`,
      tone: tone(outputChange - QUARTER_TREND_GROWTH, true, 0.05),
      text:
        outputChange > QUARTER_TREND_GROWTH + 0.05
          ? t(
              `Businesses produced more than last quarter, faster than the usual ${number(QUARTER_TREND_GROWTH, 1)}%.`,
              `Dunia usaha memproduksi lebih banyak, lebih cepat dari biasanya (${number(QUARTER_TREND_GROWTH, 1)}%).`,
            )
          : outputChange >= QUARTER_TREND_GROWTH - 0.05
            ? t(
                `Businesses grew at the usual pace of about ${number(QUARTER_TREND_GROWTH, 1)}%.`,
                `Dunia usaha tumbuh dengan laju biasa, sekitar ${number(QUARTER_TREND_GROWTH, 1)}%.`,
              )
            : t(
                `Businesses grew slower than the usual ${number(QUARTER_TREND_GROWTH, 1)}%.`,
                `Dunia usaha tumbuh lebih lambat dari biasanya (${number(QUARTER_TREND_GROWTH, 1)}%).`,
              ),
    },
    {
      id: "jobs",
      kind: "services" as const,
      name: t("Unemployment", "Pengangguran"),
      value:
        Math.abs(jobsChange) < 0.005
          ? t("No change", "Tetap")
          : `${signed(jobsChange)} ${t("points", "poin")}`,
      tone: tone(jobsChange, false, 0.005),
      text: `${
        Math.abs(newJobs) < 0.0005
          ? t("The number of jobs held steady.", "Jumlah pekerjaan tetap.")
          : newJobs > 0
            ? t(
                `${people(newJobs)} new jobs.`,
                `${people(newJobs)} pekerjaan baru.`,
              )
            : t(
                `${people(newJobs)} jobs lost.`,
                `${people(newJobs)} pekerjaan hilang.`,
              )
      } ${
        jobsChange > 0.005
          ? newJobs > 0
            ? t(
                `But more people looked for work than found it, so unemployment rose to ${number(after.unemployment, 1)}%.`,
                `Namun pencari kerja bertambah lebih cepat, jadi pengangguran naik menjadi ${number(after.unemployment, 1)}%.`,
              )
            : t(
                `Unemployment rose to ${number(after.unemployment, 1)}%.`,
                `Pengangguran naik menjadi ${number(after.unemployment, 1)}%.`,
              )
          : jobsChange < -0.005
            ? t(
                `Unemployment fell to ${number(after.unemployment, 1)}%.`,
                `Pengangguran turun menjadi ${number(after.unemployment, 1)}%.`,
              )
            : t(
                `Unemployment held at ${number(after.unemployment, 1)}%.`,
                `Pengangguran tetap ${number(after.unemployment, 1)}%.`,
              )
      }`,
    },
    {
      id: "poverty",
      kind: "income" as const,
      name: t("Poverty", "Kemiskinan"),
      value:
        Math.abs(poorChange) < 0.0005
          ? t("No change", "Tetap")
          : poorChange > 0
            ? t(
                `${people(poorChange)} more poor`,
                `+${people(poorChange)} warga miskin`,
              )
            : t(
                `${people(poorChange)} fewer poor`,
                `−${people(poorChange)} warga miskin`,
              ),
      tone: tone(povertyChange, false, 0.005),
      text:
        povertyChange < -0.005
          ? t(
              `About ${people(poorChange)} fewer people live below the poverty line (${number(after.poverty, 1)}%).`,
              `Sekitar ${people(poorChange)} orang keluar dari garis kemiskinan (${number(after.poverty, 1)}%).`,
            )
          : povertyChange > 0.005
            ? t(
                `About ${people(poorChange)} more people fell below the poverty line (${number(after.poverty, 1)}%).`,
                `Sekitar ${people(poorChange)} orang jatuh ke bawah garis kemiskinan (${number(after.poverty, 1)}%).`,
              )
            : t(
                `Poverty held at ${number(after.poverty, 1)}%.`,
                `Kemiskinan tetap ${number(after.poverty, 1)}%.`,
              ),
    },
    {
      id: "foundations",
      kind: "education" as const,
      name: t("Basic services", "Layanan dasar"),
      value:
        Math.abs(foundationChange) < 0.05
          ? t("Steady", "Stabil")
          : `${signed(foundationChange, 1)} ${t("points", "poin")}`,
      tone: tone(foundationChange, true, 0.05),
      text:
        foundationChange > 0.05
          ? t(
              "Schools, roads, power, food and clinics improved overall.",
              "Sekolah, jalan, listrik, pangan, dan klinik membaik secara keseluruhan.",
            )
          : foundationChange < -0.05
            ? t(
                "Schools, roads, power, food and clinics wore down a little. They need steady funding.",
                "Sekolah, jalan, listrik, pangan, dan klinik sedikit menurun. Layanan butuh dana rutin.",
              )
            : t(
                "Schools, roads, power, food and clinics stayed about the same.",
                "Sekolah, jalan, listrik, pangan, dan klinik relatif sama.",
              ),
    },
    ...(ledger.funding < 0.999
      ? [
          {
            id: "funding",
            kind: "investment" as const,
            name: t("Programme money", "Dana program"),
            value: `${number(ledger.funding * 100, 0)}%`,
            tone: "bad" as Tone,
            text: t(
              "Only part of the money programmes needed was paid, so they delivered less.",
              "Hanya sebagian dana yang dibutuhkan program terbayar, jadi hasilnya berkurang.",
            ),
          },
        ]
      : []),
  ];

  // Lead with the main cause of this quarter's result, not a grade, so the
  // player learns why the numbers moved.
  const weakest = FOUNDATIONS.reduce((a, b) =>
    after[b] - before[b] < after[a] - before[a] ? b : a,
  );
  const verdict =
    ledger.funding < 0.999
      ? t(
          "Some programmes ran short of money, so they delivered less than planned.",
          "Sebagian program kekurangan dana, jadi hasilnya lebih kecil dari rencana.",
        )
      : crisisRegions.size
        ? t(
            "A disruption hit the islands. Funded services help regions recover faster.",
            "Gangguan melanda kepulauan. Layanan yang didanai membantu wilayah pulih lebih cepat.",
          )
        : jobsChange > 0.05
          ? t(
              "Unemployment rose: more people joined the workforce than businesses hired.",
              "Pengangguran naik: lebih banyak orang masuk angkatan kerja daripada yang direkrut dunia usaha.",
            )
          : after[weakest] - before[weakest] < -0.1
            ? t(
                `${foundationNames[weakest].en} slipped: services wear down and need steady funding.`,
                `${foundationNames[weakest].id} menurun: layanan aus seiring waktu dan butuh dana rutin.`,
              )
            : outputChange > QUARTER_TREND_GROWTH
              ? t(
                  "The economy grew faster than usual as your policies took effect.",
                  "Ekonomi tumbuh lebih cepat dari biasanya karena kebijakan Anda mulai berdampak.",
                )
              : t(
                  "A steady quarter: the economy grew at its usual pace.",
                  "Triwulan stabil: ekonomi tumbuh dengan laju biasanya.",
                );

  return { results, verdict };
}
