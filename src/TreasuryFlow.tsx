import { useEffect, useState } from "react";
import { money, number } from "./components";
import { useLanguage } from "./i18n";

export function TreasuryFlow({
  entries,
  balance,
  borrowing,
  repayment,
  cashBefore,
  cashAfter,
}: {
  entries: { label: string; short: string; value: number }[];
  balance: number;
  borrowing: number;
  repayment: number;
  cashBefore: number;
  cashAfter: number;
}) {
  const language = useLanguage();
  const t = (en: string, id: string) => (language === "id" ? id : en);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReduced(media.matches);
      setPlaying(!media.matches);
      setStep(media.matches ? 4 : 0);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      if (step === 4) setPlaying(false);
      else setStep(step + 1);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [playing, step]);
  let running = 0;
  const rows = entries.map((entry) => {
    const start = running;
    running += entry.value;
    return { ...entry, start, end: running };
  });
  const low = Math.min(0, ...rows.flatMap((row) => [row.start, row.end]));
  const high = Math.max(1, ...rows.flatMap((row) => [row.start, row.end]));
  const y = (value: number) => 180 - ((value - low) / (high - low)) * 140;
  const explanations = [
    t(
      "Tax receipts add to the money available for this quarter’s spending.",
      "Penerimaan pajak menambah dana yang tersedia untuk belanja triwulan ini.",
    ),
    t(
      "Other income, such as natural resource fees and profits from state companies. It is not borrowed money.",
      "Penerimaan lain, seperti royalti sumber daya alam dan laba BUMN. Ini bukan uang pinjaman.",
    ),
    t(
      "Schools, clinics, salaries and your programmes are paid from this money.",
      "Sekolah, klinik, gaji pegawai, dan program Anda dibayar dari uang ini.",
    ),
    t(
      "Interest is the cost of past borrowing. Paying it does not make the debt itself smaller.",
      "Bunga adalah biaya dari pinjaman lama. Membayarnya tidak mengurangi jumlah utang.",
    ),
    balance >= 0
      ? t(
          `The surplus repays ${money(repayment)} of debt. Cash changes from ${money(cashBefore)} to ${money(cashAfter)} after the remaining surplus.`,
          `Surplus melunasi utang sebesar ${money(repayment)}. Kas berubah dari ${money(cashBefore)} menjadi ${money(cashAfter)} setelah sisa surplus.`,
        )
      : t(
          `The deficit uses ${money(Math.max(0, cashBefore - cashAfter))} of cash, then adds ${money(borrowing)} of new debt.`,
          `Defisit menggunakan kas sebesar ${money(Math.max(0, cashBefore - cashAfter))}, lalu menambah utang baru sebesar ${money(borrowing)}.`,
        ),
  ];
  return (
    <div
      className="report-treasury-flow"
      data-playing={playing}
      data-step={step}
      data-testid="treasury-flow"
    >
      <svg
        className="report-waterfall"
        viewBox="0 0 600 245"
        role="img"
        aria-label={
          entries.map((row) => `${row.label} ${money(row.value)}`).join(", ") +
          `, ${t("Balance", "Saldo")} ${money(balance)}`
        }
      >
        <path d={`M15 ${y(0)}H590`} className="report-waterfall-zero" />
        {rows.map((row, i) => (
          <g key={row.label} data-active={step === i || undefined}>
            <rect
              x={25 + i * 140}
              y={Math.min(y(row.start), y(row.end))}
              width="110"
              height={Math.max(2, Math.abs(y(row.start) - y(row.end)))}
              data-negative={row.value < 0 || undefined}
            />
            {step === i && (
              <rect
                className="report-flow-outline"
                x={21 + i * 140}
                y={Math.min(y(row.start), y(row.end)) - 4}
                width="118"
                height={Math.max(2, Math.abs(y(row.start) - y(row.end))) + 8}
                rx="4"
              />
            )}
            <text
              x={80 + i * 140}
              y={Math.min(y(row.start), y(row.end)) - 12}
              textAnchor="middle"
            >
              {row.value > 0 ? "+" : ""}
              {number(row.value, Math.abs(row.value) >= 1000 ? 0 : 1)}T
            </text>
            <text x={80 + i * 140} y="214" textAnchor="middle">
              {i + 1}. {row.short}
            </text>
            {i < 3 && <path d={`M${135 + i * 140} ${y(row.end)}h30`} />}
            {playing && step === i && (
              <path
                className="report-flow-trace"
                d={`M${25 + i * 140} ${y(row.start)}H${80 + i * 140}V${y(row.end)}H${Math.min(590, 165 + i * 140)}`}
              />
            )}
          </g>
        ))}
      </svg>
      <div
        className="report-fiscal-steps"
        aria-label={t("Inspect money flow", "Tinjau arus dana")}
      >
        {[...entries, { label: t("Balance", "Saldo"), value: balance }].map(
          (row, i) => (
            <button
              key={row.label}
              aria-pressed={step === i}
              onClick={() => {
                setPlaying(false);
                setStep(i);
              }}
            >
              <span>
                {i + 1}. {row.label}
              </span>
              <b>{money(row.value)}</b>
            </button>
          ),
        )}
      </div>
      <div className="report-flow-reading">
        <strong>
          {step + 1}.{" "}
          {step < 4
            ? entries[step].label
            : t("Where the balance goes", "Ke mana saldo mengalir")}
        </strong>
        <p>{explanations[step]}</p>
        <span>
          {t("Balance after this step", "Saldo setelah tahap ini")}:{" "}
          <b>{money(step < 4 ? rows[step].end : balance)}</b>
        </span>
      </div>
      <div className="report-flow-controls">
        {!reduced && (
          <button
            onClick={() => {
              if (playing) setPlaying(false);
              else {
                setStep(0);
                setPlaying(true);
              }
            }}
          >
            {playing
              ? t("Pause flow", "Jeda alur")
              : t("Replay flow", "Putar ulang alur")}
          </button>
        )}
      </div>
    </div>
  );
}
