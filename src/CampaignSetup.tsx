import { useEffect, useMemo, useRef, useState } from "react";
import { initialQuarter } from "./engine/economy/engine";
import { campaignGoals, goalExplanations } from "./engine/economy/goals";
import { policies as catalog, policyById } from "./engine/economy/catalog";
import type { PolicyId } from "./engine/economy/types";
import { LanguageSwitcher, useLanguage } from "./i18n";
import { Modal, money, number } from "./components";
import { StatHelp } from "./StatHelp";
import { REELECTION_APPROVAL } from "./engine/politics";
import { GoalTags } from "./policyKinds";
import { starterPolicies } from "./engine/economy/policyGoals";

export function CampaignSetup({
  canCancel,
  busy,
  error,
  onCancel,
  onImport,
  onStart,
}: {
  canCancel: boolean;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onImport: () => void;
  onStart: (seed: number, policies: PolicyId[]) => void;
}) {
  const language = useLanguage();
  const t = (en: string, id: string) => (language === "en" ? en : id);
  const [step, setStep] = useState(0);
  const [seed, setSeed] = useState("2025");
  const [policies, setPolicies] = useState<PolicyId[]>([]);
  const stage = useRef<HTMLElement>(null);
  useEffect(() => {
    stage.current?.focus({ preventScroll: true });
    stage.current?.scrollIntoView({ block: "nearest" });
  }, [step]);
  const opening = useMemo(() => initialQuarter(), []);
  const validSeed = /^\d+$/.test(seed) && Number(seed) <= 0xffffffff;
  const steps = [
    t("Your mandate", "Mandat Anda"),
    t("Opening policies", "Kebijakan awal"),
    t("Ready to begin", "Siap memulai"),
  ];
  return (
    <Modal
      title={t("Your next five years", "Lima tahun ke depan")}
      onClose={onCancel}
      dismissible={canCancel && !busy}
      className="economy-dialog campaign-dialog campaign-setup"
    >
      <div data-testid="campaign-setup">
        <div className="campaign-tools">
          <LanguageSwitcher />
          <button disabled={busy} onClick={onImport}>
            {t("Import a saved campaign", "Impor permainan tersimpan")}
          </button>
        </div>
        <nav
          className="campaign-steps"
          aria-label={t("Campaign setup", "Persiapan permainan")}
        >
          {steps.map((label, index) => (
            <button
              key={label}
              aria-current={step === index ? "step" : undefined}
              disabled={busy}
              onClick={() => setStep(index)}
            >
              <span aria-hidden="true">{index + 1}</span>
              {label}
            </button>
          ))}
        </nav>
        <section
          className="campaign-stage"
          key={step}
          aria-labelledby="campaign-stage-title"
          tabIndex={0}
          ref={stage}
        >
          {step === 0 ? (
            <>
              <p className="campaign-eyebrow">
                {t(
                  "9 regions · 20 quarters · One shared future",
                  "9 wilayah · 20 triwulan · Satu masa depan bersama",
                )}
              </p>
              <h3 id="campaign-stage-title">
                {t("Build shared prosperity.", "Bangun kesejahteraan bersama.")}
              </h3>
              <p>
                {t(
                  "Leave Indonesia more prosperous, with stronger public services and sustainable finances. Meet these six goals together at the end of year five.",
                  "Jadikan Indonesia lebih sejahtera, dengan layanan publik lebih kuat dan keuangan berkelanjutan. Capai keenam target ini bersama pada akhir tahun kelima.",
                )}
              </p>
              <ol className="campaign-mandate">
                {campaignGoals(opening).map((goal) => (
                  <li key={goal.id}>
                    <strong>
                      <StatHelp
                        label={goal.label[language]}
                        description={goalExplanations[goal.id][language]}
                      />
                    </strong>
                    <span>{goal.target[language]}</span>
                  </li>
                ))}
              </ol>
              <section
                className="campaign-brief"
                aria-labelledby="campaign-bonus-title"
              >
                <h4 id="campaign-bonus-title">
                  {t(
                    "Bonus objective: No region left behind",
                    "Target bonus: Tak ada wilayah tertinggal",
                  )}
                </h4>
                <p>
                  {t(
                    "Reach the income and poverty targets in all nine regions, not just on average. Regional budgets decide who benefits. This achievement is separate from your six-goal mandate.",
                    "Capai target pendapatan dan kemiskinan di kesembilan wilayah, bukan hanya rata-rata nasional. Anggaran wilayah menentukan siapa yang merasakan manfaatnya. Pencapaian ini terpisah dari enam target mandat Anda.",
                  )}
                </p>
              </section>
              <section
                className="campaign-brief"
                aria-labelledby="campaign-reelection-title"
              >
                <h4 id="campaign-reelection-title">
                  {t(
                    "Bonus objective: Re-election 2029",
                    "Target bonus: Terpilih kembali 2029",
                  )}
                </h4>
                <p>
                  {t(
                    `Finish with public approval of at least ${REELECTION_APPROVAL}%. Tax changes and each year's APBN need DPR votes, and approval moves how parties vote.`,
                    `Akhiri dengan kepuasan publik minimal ${REELECTION_APPROVAL}%. Perubahan pajak dan APBN tiap tahun butuh suara DPR, dan kepuasan publik memengaruhi suara partai.`,
                  )}
                </p>
              </section>
            </>
          ) : step === 1 ? (
            <>
              <p className="campaign-eyebrow">
                {t("Plan your first quarter", "Rencanakan triwulan pertama")}
              </p>
              <h3 id="campaign-stage-title">
                {t(
                  "Choose your opening policies.",
                  "Pilih kebijakan awal Anda.",
                )}
              </h3>
              <p>
                {t(
                  `Pick up to two from this shortlist, or begin without a policy. All ${catalog.length} policies, taxes and regional spending remain available in the game.`,
                  `Pilih maksimal dua dari daftar ini, atau mulai tanpa kebijakan. Semua ${catalog.length} kebijakan, pajak, dan alokasi wilayah tersedia dalam permainan.`,
                )}
              </p>
              <p role="status" className="campaign-selection">
                {t(
                  `${policies.length}/2 opening policies selected`,
                  `${policies.length}/2 kebijakan awal dipilih`,
                )}
              </p>
              <div className="campaign-policy-list">
                {starterPolicies.map((id) => {
                  const policy = policyById[id];
                  const selected = policies.includes(id);
                  return (
                    <button
                      key={id}
                      aria-pressed={selected}
                      disabled={busy || (!selected && policies.length >= 2)}
                      onClick={() =>
                        setPolicies(
                          selected
                            ? policies.filter((p) => p !== id)
                            : [...policies, id],
                        )
                      }
                    >
                      <span className="campaign-policy-heading">
                        <strong>{policy.name}</strong>
                        <span>
                          {selected
                            ? t("Selected", "Dipilih")
                            : t("Choose", "Pilih")}
                        </span>
                      </span>
                      <span>{policy.purpose[language]}</span>
                      <GoalTags id={id} />
                      <small>{policy.tradeoff[language]}</small>
                      <small>
                        {policy.build
                          ? `${t("Build cost", "Biaya bangun")}: ${money(policy.build.cost)} · ${number(Math.ceil(policy.build.months / 3), 0)} ${t("quarters", "triwulan")}${
                              policy.kind === "facility"
                                ? ` · ${t("then", "lalu")} ${money(policy.quarterlyCost)}/${t("qtr", "triwulan")}`
                                : ""
                            }`
                          : `${t("Per quarter", "Per triwulan")}: ${money(policy.quarterlyCost)} · ${t("Setup", "Persiapan")}: ${money(policy.setupCost)}`}
                      </small>
                    </button>
                  );
                })}
              </div>
              <p className="campaign-brief">
                {t(
                  "These choices become your first-quarter draft. Nothing is spent until you advance. You can change them before then.",
                  "Pilihan ini menjadi rencana triwulan pertama. Dana baru digunakan saat triwulan dilanjutkan. Anda bisa mengubahnya sebelumnya.",
                )}
              </p>
            </>
          ) : (
            <>
              <p className="campaign-eyebrow">
                {t("Before the first quarter", "Sebelum triwulan pertama")}
              </p>
              <h3 id="campaign-stage-title">
                {t("Your campaign is ready.", "Permainan Anda siap.")}
              </h3>
              <p>
                {t(
                  "Review your opening plan, then begin in Q1 2025. Your five-year results arrive after quarter 20.",
                  "Tinjau rencana awal, lalu mulai pada Q1 2025. Hasil lima tahun tersedia setelah triwulan ke-20.",
                )}
              </p>
              <div className="campaign-review">
                <section>
                  <h4>{t("Opening plan", "Rencana awal")}</h4>
                  {policies.length ? (
                    <ul>
                      {policies.map((id) => (
                        <li key={id}>{policyById[id].name}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>
                      {t(
                        "No opening policies selected. Choose them on the map when you are ready.",
                        "Belum ada kebijakan awal. Pilih di peta saat Anda siap.",
                      )}
                    </p>
                  )}
                  <p>
                    {t(
                      "Regional budgets begin with equal spending weights. Review costs and the forecast before advancing.",
                      "Anggaran wilayah dimulai dengan bobot alokasi setara. Tinjau biaya dan prakiraan sebelum melanjutkan.",
                    )}
                  </p>
                </section>
                <section>
                  <h4>{t("How to play", "Cara bermain")}</h4>
                  <p>
                    {t(
                      "Choose policies and taxes, divide regional budgets, then advance a quarter to see actual outcomes. Up to eight policies can be active, with two new launches per quarter.",
                      "Pilih kebijakan dan pajak, bagi anggaran wilayah, lalu lanjutkan triwulan untuk melihat hasil aktual. Maksimal delapan kebijakan aktif, dengan dua peluncuran baru per triwulan.",
                    )}
                  </p>
                </section>
              </div>
              <label className="economy-seed">
                <StatHelp
                  label={t("Starting world number", "Nomor dunia awal")}
                  description={t(
                    "Picks the starting world, including when disruptions strike. Keep the default, or reuse a friend's number to play the same world and compare choices. Enter a whole number from 0 to 4294967295.",
                    "Menentukan dunia awal, termasuk kapan gangguan terjadi. Biarkan angka bawaan, atau pakai nomor teman untuk memainkan dunia yang sama dan membandingkan pilihan. Masukkan bilangan bulat dari 0 hingga 4294967295.",
                  )}
                />
                <input
                  aria-label={t("Starting world number", "Nomor dunia awal")}
                  inputMode="numeric"
                  value={seed}
                  disabled={busy}
                  aria-invalid={!validSeed}
                  onChange={(e) => setSeed(e.target.value)}
                />
              </label>
              {!validSeed && (
                <p role="alert">
                  {t(
                    "Enter a whole number from 0 to 4294967295.",
                    "Masukkan bilangan bulat dari 0 hingga 4294967295.",
                  )}
                </p>
              )}
              {canCancel && (
                <p className="campaign-brief">
                  {t(
                    "Starting replaces the current autosave. Cancel to return and export it first.",
                    "Memulai akan mengganti simpanan otomatis saat ini. Batalkan untuk kembali dan mengekspornya dahulu.",
                  )}
                </p>
              )}
            </>
          )}
        </section>
        {error && (
          <p role="alert" className="campaign-error">
            {error}
          </p>
        )}
        <footer className="campaign-actions">
          {step > 0 ? (
            <button disabled={busy} onClick={() => setStep(step - 1)}>
              {t("Back", "Kembali")}
            </button>
          ) : canCancel ? (
            <button disabled={busy} onClick={onCancel}>
              {t("Return to campaign", "Kembali ke permainan")}
            </button>
          ) : (
            <span />
          )}
          {step < 2 ? (
            <button
              className="primary"
              disabled={busy}
              onClick={() => setStep(step + 1)}
            >
              {step === 0
                ? t("Choose opening policies", "Pilih kebijakan awal")
                : t("Review campaign", "Tinjau permainan")}
            </button>
          ) : (
            <button
              className="primary"
              disabled={busy || !validSeed}
              onClick={() => onStart(Number(seed), policies)}
            >
              {busy
                ? t("Starting campaign…", "Memulai permainan…")
                : t("Start campaign", "Mulai permainan")}
            </button>
          )}
        </footer>
      </div>
    </Modal>
  );
}
