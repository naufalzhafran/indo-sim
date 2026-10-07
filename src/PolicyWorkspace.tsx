import { useLayoutEffect, useRef, useState } from "react";
import { EconomyPolicies } from "./EconomyPolicies";
import { EconomyEmblem } from "./EconomyEmblem";
import { TaxPolicies } from "./TaxPolicies";
import { StatHelp } from "./StatHelp";
import { money, number } from "./components";
import { useLanguage } from "./i18n";
import {
  activeIds,
  launchCount,
  projectsOf,
} from "./engine/economy/engine";
import { policyById } from "./engine/economy/catalog";
import { taxDefinitions, type TaxId } from "./engine/taxes";
import { POLICY_IDS, REGION_IDS } from "./engine/economy/types";
import type {
  PolicyId,
  QuarterGame,
  QuarterPlan,
} from "./engine/economy/types";

export function PolicyWorkspace({
  game,
  plan,
  onChange,
  disabled,
  detail,
  onDetail,
  tab,
  onTab,
  preview,
  previewError,
  onRetry,
  onUndo,
  onReset,
  canUndo,
  dirty,
  saveStatus,
  onRetrySave,
  onClose,
}: {
  game: QuarterGame;
  plan: QuarterPlan;
  onChange: (plan: QuarterPlan) => void;
  disabled: boolean;
  detail: PolicyId | null;
  onDetail: (id: PolicyId | null) => void;
  tab: "policies" | "taxes";
  onTab: (tab: "policies" | "taxes") => void;
  preview: QuarterGame | null;
  previewError: boolean;
  onRetry: () => void;
  onUndo: () => void;
  onReset: () => void;
  canUndo: boolean;
  dirty: boolean;
  saveStatus: "saving" | "saved" | "failed";
  onRetrySave: () => void;
  onClose: () => void;
}) {
  const language = useLanguage();
  const t = (en: string, id: string) => (language === "id" ? id : en);
  const workspace = useRef<HTMLDivElement>(null);
  const [taxTarget, setTaxTarget] = useState<TaxId | null>(null);
  const [policyTarget, setPolicyTarget] = useState<PolicyId | null>(null);
  useLayoutEffect(() => {
    if (tab !== "policies" || detail !== policyTarget || !policyTarget) return;
    const panel = workspace.current?.querySelector<HTMLElement>(
      "[data-policy-detail]",
    );
    if (panel) panel.scrollTop = 0;
    workspace.current
      ?.querySelector<HTMLElement>(".eco-detail-header h2")
      ?.focus({ preventScroll: true });
    setPolicyTarget(null);
  }, [tab, detail, policyTarget]);
  useLayoutEffect(() => {
    if (tab !== "taxes" || !taxTarget) return;
    const card = workspace.current?.querySelector<HTMLElement>(
      `[data-tax="${taxTarget}"]`,
    );
    card?.scrollIntoView({ block: "nearest" });
    card
      ?.querySelector<HTMLInputElement>("input:checked")
      ?.focus({ preventScroll: true });
    setTaxTarget(null);
  }, [tab, taxTarget]);
  const active = activeIds(game);
  const allocationChanges = POLICY_IDS.filter((id) =>
    REGION_IDS.some(
      (region) =>
        plan.regionalSpending[id][region] !== game.regionalSpending[id][region],
    ),
  );
  const changes = [
    ...new Set([
      ...plan.policies.filter((id) => !active.includes(id)),
      ...active.filter((id) => !plan.policies.includes(id)),
      ...allocationChanges,
    ]),
  ];
  const launches = launchCount(game, plan);
  const taxChanges = taxDefinitions.filter(
    ({ id }) => plan.taxes[id] !== game.taxes[id],
  );
  const ledger = preview?.receipt?.ledger;
  const spending = ledger
    ? Object.values(ledger.policySpending).reduce(
        (sum, cost) => sum + (cost ?? 0),
        0,
      )
    : 0;
  const balance = ledger
    ? ledger.revenue - ledger.spending - ledger.interest
    : 0;
  const effects = preview?.receipt?.effects?.decisions;
  const incomeReference =
    preview && effects
      ? preview.receipt!.after.realIncome - (effects.realIncome ?? 0)
      : 0;
  const incomeEffect =
    incomeReference > 0
      ? ((effects?.realIncome ?? 0) / incomeReference) * 100
      : 0;
  const jobsEffect = (effects?.jobs ?? 0) * 1_000_000;
  const signed = (value: number, decimals: number) =>
    `${Math.abs(value) < 0.5 * 10 ** -decimals ? "" : value < 0 ? "−" : "+"}${number(Math.abs(value), decimals)}`;

  return (
    <div className="policy-workspace" ref={workspace}>
      <div className="policy-workspace-board">
        <div className="economy-panel-body">
          <div className="policy-workspace-tools">
            <div
              className="q-policy-tabs"
              role="tablist"
              aria-label={t("Policy workspace", "Ruang kebijakan")}
              onKeyDown={(event) => {
                if (
                  !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                    event.key,
                  )
                )
                  return;
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? "policies"
                    : event.key === "End"
                      ? "taxes"
                      : tab === "policies"
                        ? "taxes"
                        : "policies";
                onTab(next);
                event.currentTarget
                  .querySelector<HTMLButtonElement>(`[data-tab="${next}"]`)
                  ?.focus();
              }}
            >
              <button
                type="button"
                role="tab"
                data-tab="policies"
                id="policy-tab-policies"
                aria-controls="policy-tabpanel-policies"
                aria-selected={tab === "policies"}
                tabIndex={tab === "policies" ? 0 : -1}
                onClick={() => onTab("policies")}
              >
                <EconomyEmblem kind="investment" />
                <span>
                  {t("Policies", "Kebijakan")}
                  <small>
                    {plan.policies.length}/8 {t("slots used", "slot terpakai")}{" "}
                    · {launches}/2 {t("new", "baru")}
                  </small>
                </span>
              </button>
              <button
                type="button"
                role="tab"
                data-tab="taxes"
                id="policy-tab-taxes"
                aria-controls="policy-tabpanel-taxes"
                aria-selected={tab === "taxes"}
                tabIndex={tab === "taxes" ? 0 : -1}
                onClick={() => onTab("taxes")}
              >
                <EconomyEmblem kind="finance" />
                <span>
                  {t("Taxes", "Pajak")}
                  <small>
                    {taxChanges.length
                      ? `${taxChanges.length} ${t("changed", "diubah")}`
                      : t("No changes", "Tanpa perubahan")}
                  </small>
                </span>
              </button>
            </div>
            {tab === "policies" && detail && (
              <button
                type="button"
                className="policy-back"
                onClick={() => onDetail(null)}
              >
                <span aria-hidden="true">←</span>
                {t("Back to policies", "Kembali ke kebijakan")}
              </button>
            )}
            <section
              className="policy-plan-effects"
              hidden={tab === "policies" && Boolean(detail)}
              aria-label={t("Your plan’s effect", "Dampak rencana Anda")}
              aria-busy={!effects && !previewError && !disabled}
            >
              <div className="policy-effects-heading">
                <strong>
                  {t("Next quarter’s impact", "Dampak triwulan depan")}
                </strong>
                <StatHelp
                  label={t(
                    "vs. keeping current choices",
                    "dibanding tanpa perubahan",
                  )}
                  description={t(
                    "Forecast of your combined policy, tax and regional choices compared with continuing the current plan. Excludes unexpected shocks. Income is a percentage change in real household income per person; poverty is a change in percentage points. Long-term policy benefits can take several quarters.",
                    "Prakiraan gabungan pilihan kebijakan, pajak, dan wilayah dibanding melanjutkan rencana saat ini, tanpa guncangan tak terduga. Pendapatan adalah perubahan persen pendapatan riil per orang; kemiskinan adalah perubahan poin persentase. Manfaat jangka panjang kebijakan dapat memerlukan beberapa triwulan.",
                  )}
                />
              </div>
              {effects ? (
                <dl>
                  <div
                    data-metric="realIncome"
                    data-tone={incomeEffect < -0.005 ? "warn" : "neutral"}
                  >
                    <dt>
                      {t("Real income / person", "Pendapatan riil / orang")}
                    </dt>
                    <dd>{signed(incomeEffect, 2)}%</dd>
                  </div>
                  <div
                    data-metric="jobs"
                    data-tone={jobsEffect < -0.5 ? "warn" : "neutral"}
                  >
                    <dt>{t("Jobs", "Pekerjaan")}</dt>
                    <dd>{signed(jobsEffect, 0)}</dd>
                  </div>
                  <div
                    data-metric="poverty"
                    data-tone={
                      (effects.poverty ?? 0) > 0.005 ? "warn" : "neutral"
                    }
                  >
                    <dt>{t("Poverty", "Kemiskinan")}</dt>
                    <dd>
                      {signed(effects.poverty ?? 0, 2)} {t("pp", "poin")}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p role="status">
                  {disabled
                    ? t(
                        "Forecast unavailable for this campaign.",
                        "Prakiraan tidak tersedia untuk permainan ini.",
                      )
                    : previewError
                      ? t(
                          "Forecast unavailable. Retry in the plan panel.",
                          "Prakiraan tidak tersedia. Coba lagi di panel rencana.",
                        )
                      : t(
                          "Calculating the effects of your choices…",
                          "Menghitung dampak pilihan Anda…",
                        )}
                </p>
              )}
            </section>
          </div>
          <div
            className="economy-panel-fill"
            role="tabpanel"
            id="policy-tabpanel-policies"
            aria-labelledby="policy-tab-policies"
            hidden={tab !== "policies"}
          >
            <EconomyPolicies
              game={game}
              plan={plan}
              onChange={onChange}
              disabled={disabled}
              detail={detail}
              onDetail={onDetail}
            />
          </div>
          <div
            className="economy-scroll"
            role="tabpanel"
            id="policy-tabpanel-taxes"
            aria-labelledby="policy-tab-taxes"
            hidden={tab !== "taxes"}
          >
            <TaxPolicies
              taxes={plan.taxes}
              enacted={game.taxes}
              disabled={disabled}
              onChange={(taxes) => onChange({ ...plan, taxes })}
            />
          </div>
        </div>
        <aside
          className="policy-plan-board"
          aria-label={t("Next quarter’s plan", "Rencana triwulan depan")}
        >
          <section className="policy-plan-capacity">
            <h2>{t("Your next quarter", "Triwulan berikutnya")}</h2>
            <div className="policy-capacity-grid">
              <SlotGauge
                used={plan.policies.length}
                fresh={launches}
                max={8}
                label={t("Policy slots", "Slot kebijakan")}
                meterLabel={t("Policy slots used", "Slot kebijakan terpakai")}
              />
              <SlotGauge
                used={launches}
                fresh={launches}
                max={2}
                label={t("New launches", "Peluncuran baru")}
                meterLabel={t(
                  "New launches planned",
                  "Peluncuran baru direncanakan",
                )}
              />
            </div>
          </section>
          <section
            className="policy-plan-roster"
            aria-labelledby="policy-plan-heading"
          >
            <h3 id="policy-plan-heading">
              {t("Plan changes", "Perubahan rencana")}
              <small>{changes.length + taxChanges.length}</small>
            </h3>
            {changes.length || taxChanges.length ? (
              <div className="policy-plan-picks">
                {changes.map((id) => {
                  const policy = policyById[id];
                  return (
                    <button
                      key={id}
                      data-policy-change={id}
                      type="button"
                      aria-pressed={tab === "policies" && detail === id}
                      onClick={() => {
                        onTab("policies");
                        onDetail(id);
                        setPolicyTarget(id);
                      }}
                    >
                      <EconomyEmblem
                        kind={policy.impacts[0]?.target ?? "finance"}
                      />
                      <span>
                        {policy.name}
                        <small>
                          {active.includes(id) && !plan.policies.includes(id)
                            ? policy.kind === "facility" &&
                              projectsOf(game, id).some((p) => p.completed)
                              ? t(
                                  "Goes idle next quarter",
                                  "Menganggur triwulan depan",
                                )
                              : t(
                                  "Stops next quarter",
                                  "Dihentikan triwulan depan",
                                )
                            : !active.includes(id) && plan.policies.includes(id)
                              ? policy.kind === "facility" &&
                                projectsOf(game, id).some((p) => p.completed)
                                ? t("Reactivated", "Diaktifkan lagi")
                                : t("New launch", "Peluncuran baru")
                              : plan.policies.includes(id)
                                ? t(
                                    "Regional priorities changed",
                                    "Prioritas wilayah diubah",
                                  )
                                : t(
                                    "Priorities changed · Not funded",
                                    "Prioritas diubah · Tidak didanai",
                                  )}
                          {allocationChanges.includes(id) &&
                          !active.includes(id) &&
                          plan.policies.includes(id)
                            ? t(" · Regions adjusted", " · Wilayah diatur")
                            : ""}
                        </small>
                      </span>
                    </button>
                  );
                })}
                {taxChanges.map((tax) => (
                  <button
                    key={tax.id}
                    type="button"
                    data-tax-change={tax.id}
                    onClick={() => {
                      onTab("taxes");
                      setTaxTarget(tax.id);
                    }}
                  >
                    <EconomyEmblem kind="finance" />
                    <span>
                      {tax.name[language]}
                      <small>
                        {tax.rates[game.taxes[tax.id]]}% →{" "}
                        {tax.rates[plan.taxes[tax.id]]}%{" · "}
                        {t("Next quarter", "Triwulan depan")}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="policy-plan-empty">
                <strong>
                  {t("No changes planned.", "Belum ada perubahan rencana.")}
                </strong>
                <span>
                  {t("Currently active", "Saat ini aktif")}: {active.length}
                </span>
              </p>
            )}
          </section>
          <section
            className="policy-budget"
            aria-labelledby="policy-budget-heading"
            aria-live="polite"
            aria-busy={!ledger && !previewError && !disabled}
          >
            <h3 id="policy-budget-heading">
              <EconomyEmblem kind="finance" />
              <StatHelp
                label={t("Cash forecast", "Prakiraan kas")}
                description={t(
                  "Your combined policy and tax plan, before unexpected shocks. A negative balance uses treasury cash first, then borrowing. This forecast includes startup, recurring costs and interest.",
                  "Gabungan rencana kebijakan dan pajak sebelum guncangan tak terduga. Saldo negatif menggunakan kas negara terlebih dahulu, lalu pinjaman. Prakiraan mencakup biaya awal, biaya rutin, dan bunga.",
                )}
              />
            </h3>
            {ledger ? (
              <dl>
                <div
                  className="policy-budget-balance"
                  data-tone={balance < 0 ? "warn" : "pass"}
                >
                  <dt>{t("Balance", "Saldo")}</dt>
                  <dd>
                    {balance < 0 ? "−" : "+"}
                    {money(Math.abs(balance))}
                  </dd>
                </div>
                <div>
                  <dt>{t("Total revenue", "Total penerimaan")}</dt>
                  <dd>{money(ledger.revenue)}</dd>
                </div>
                <div className="policy-budget-part">
                  <dt>{t("From taxes", "Dari pajak")}</dt>
                  <dd>
                    {money(
                      Object.values(ledger.taxes).reduce(
                        (sum, value) => sum + value,
                        0,
                      ),
                    )}
                  </dd>
                </div>
                <div>
                  <dt>{t("Spending + interest", "Belanja + bunga")}</dt>
                  <dd>{money(ledger.spending + ledger.interest)}</dd>
                </div>
                <div className="policy-budget-part">
                  <dt>{t("For policies", "Untuk kebijakan")}</dt>
                  <dd>{money(spending)}</dd>
                </div>
                <div>
                  <dt>
                    {ledger.repayment > 0
                      ? t("Debt repaid", "Pelunasan utang")
                      : t("New borrowing", "Pinjaman baru")}
                  </dt>
                  <dd>
                    {money(
                      ledger.repayment > 0
                        ? ledger.repayment
                        : ledger.borrowing,
                    )}
                  </dd>
                </div>
                <div data-tone={ledger.funding < 0.99 ? "warn" : "pass"}>
                  <dt>{t("Funding delivered", "Pendanaan tersalur")}</dt>
                  <dd>{number(ledger.funding * 100, 0)}%</dd>
                </div>
                {ledger.repayment > 0 && ledger.borrowing > 0 && (
                  <div>
                    <dt>{t("New borrowing", "Pinjaman baru")}</dt>
                    <dd>{money(ledger.borrowing)}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p role="status">
                {disabled
                  ? t(
                      "Forecast unavailable for this campaign.",
                      "Prakiraan tidak tersedia untuk permainan ini.",
                    )
                  : previewError
                    ? t("Forecast unavailable.", "Prakiraan tidak tersedia.")
                    : t("Calculating your plan…", "Menghitung rencana…")}
                {previewError && !disabled && (
                  <button type="button" onClick={onRetry}>
                    {t("Retry", "Coba lagi")}
                  </button>
                )}
              </p>
            )}
            {ledger && ledger.funding < 0.99 && (
              <p className="policy-funding-warning" role="status">
                {t(
                  "Funding is short. Policies receive less and take longer.",
                  "Dana kurang. Kebijakan menerima lebih sedikit dan berjalan lebih lambat.",
                )}
              </p>
            )}
          </section>
        </aside>
      </div>
      <footer className="policy-plan-actions">
        <div className="button-row">
          <button
            type="button"
            disabled={disabled || !canUndo}
            onClick={onUndo}
          >
            <svg
              className="policy-tool-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M9 14 4 9l5-5" />
              <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
            </svg>
            {t("Undo", "Urungkan")}
          </button>
          <button type="button" disabled={disabled || !dirty} onClick={onReset}>
            <svg
              className="policy-tool-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M4 12a8 8 0 1 0 2.5-5.8" />
              <path d="M4 3v5h5" />
            </svg>
            {t("Reset", "Atur ulang")}
          </button>
        </div>
        <div className="policy-plan-save">
          <p className="policy-commit-rule">
            {t(
              "Changes apply when you advance the quarter from the map.",
              "Perubahan berlaku saat Anda lanjut triwulan dari peta.",
            )}
          </p>
          <p
            role="status"
            className="policy-save-pill"
            data-status={saveStatus}
          >
            <span aria-hidden="true">
              {saveStatus === "failed"
                ? "!"
                : saveStatus === "saving"
                  ? "…"
                  : "✓"}
            </span>
            {saveStatus === "saving"
              ? t("Saving draft…", "Menyimpan rencana…")
              : saveStatus === "failed"
                ? t("Save failed", "Gagal menyimpan")
                : dirty
                  ? t("Draft saved", "Rencana tersimpan")
                  : t("Game saved", "Permainan tersimpan")}
            {saveStatus === "failed" && (
              <button type="button" disabled={disabled} onClick={onRetrySave}>
                {t("Retry save", "Coba simpan")}
              </button>
            )}
          </p>
        </div>
        <button type="button" className="policy-return-map" onClick={onClose}>
          {t("Return to map", "Kembali ke peta")}
          <span aria-hidden="true">→</span>
        </button>
      </footer>
    </div>
  );
}

function SlotGauge({
  used,
  fresh,
  max,
  label,
  meterLabel,
}: {
  used: number;
  fresh: number;
  max: number;
  label: string;
  meterLabel: string;
}) {
  return (
    <div className="policy-slot-gauge">
      <strong>
        {used}
        <small>/{max}</small>
      </strong>
      <span>{label}</span>
      <div
        className="policy-slot-pips"
        role="meter"
        aria-label={meterLabel}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={used}
        data-full={used >= max}
      >
        {Array.from({ length: max }, (_, index) => (
          <i
            key={index}
            data-filled={index < used}
            data-fresh={index < used && index >= used - fresh}
          />
        ))}
      </div>
    </div>
  );
}
