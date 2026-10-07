import { useEffect, useState } from "react";
import { money, number } from "./components";
import { useLanguage } from "./i18n";
import { EconomyEmblem } from "./EconomyEmblem";

export function TreasuryFlow({
  entries,
  balance,
  borrowing,
  repayment,
  cashBefore,
  cashAfter,
}: {
  entries: { label: string; value: number }[];
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
      "Non-tax receipts join taxes to form total revenue. They do not add government debt.",
      "Penerimaan selain pajak digabung dengan pajak menjadi total penerimaan. Penerimaan ini tidak menambah utang pemerintah.",
    ),
    t(
      "Services and programme delivery use revenue. This is actual spending; programme funding determines how much requested delivery was funded.",
      "Layanan dan pelaksanaan program menggunakan penerimaan. Ini belanja aktual; pendanaan program menentukan porsi pelaksanaan yang didanai.",
    ),
    t(
      "Interest uses the remaining revenue to service debt. It does not repay the debt principal.",
      "Bunga menggunakan sisa penerimaan untuk membayar biaya utang. Pembayaran ini tidak melunasi pokok utang.",
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
              {number(row.value, 2)}T
            </text>
            <text x={80 + i * 140} y="214" textAnchor="middle">
              {i + 1}
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
      <svg
        className="report-settlement-flow"
        viewBox="0 0 600 110"
        role="img"
        aria-label={`${t("Budget balance", "Saldo anggaran")} ${money(balance)}, ${t("Debt change", "Perubahan utang")} ${money(borrowing - repayment)}, ${t("Cash change", "Perubahan kas")} ${money(cashAfter - cashBefore)}`}
      >
        <path d="M180 55H240V26H300 M240 55V84H300" />
        {playing && step === 4 && (
          <path
            className="report-settlement-trace"
            d="M180 55H240V26H300 M240 55V84H300"
          />
        )}
        <rect x="2" y="30" width="178" height="50" rx="8" />
        <rect x="300" y="2" width="298" height="48" rx="8" />
        <rect x="300" y="60" width="298" height="48" rx="8" />
        <text x="16" y="50">
          {t("Budget balance", "Saldo anggaran")}
        </text>
        <text x="16" y="69">
          {money(balance)}
        </text>
        <text x="314" y="22">
          {t("Debt change", "Perubahan utang")}
        </text>
        <text x="314" y="41">
          {money(borrowing - repayment)}
        </text>
        <text x="314" y="80">
          {t("Cash change", "Perubahan kas")}
        </text>
        <text x="314" y="99">
          {money(cashAfter - cashBefore)}
        </text>
      </svg>
      <div className="report-flow-controls">
        <span>
          {t(
            "Revenue → services → interest → debt / cash",
            "Penerimaan → layanan → bunga → utang / kas",
          )}
        </span>
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
      <div
        className="report-balance-result"
        data-active={step === 4 || undefined}
      >
        <EconomyEmblem kind="investment" />
        <span>{t("Quarter budget balance", "Saldo anggaran triwulan")}</span>
        <strong>{money(balance)}</strong>
      </div>
    </div>
  );
}
