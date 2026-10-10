import { useLanguage } from "./i18n";
import { StatHelp } from "./StatHelp";
import { EconomyEmblem } from "./EconomyEmblem";
import {
  TAX_LEVELS,
  taxDefinitions,
  taxLevelNames,
  type TaxId,
  type TaxSettings,
} from "./engine/taxes";
import type { Bilingual } from "./engine/economy/types";
import {
  MAJORITY,
  TOTAL_SEATS,
  VOTER_GROUPS,
  billGroupEffects,
  effectiveRate,
  resultGroupEffects,
  softenNames,
  type BillResult,
  type PoliticsState,
} from "./engine/politics";
import { GroupChip } from "./ParliamentPanel";

const taxChangeEffects: Record<
  TaxId,
  { raised: Bilingual; lowered: Bilingual }
> = {
  personalIncome: {
    raised: {
      en: "Collect more from earnings; households keep less of their pay.",
      id: "Pajak penghasilan bertambah; pendapatan bersih rumah tangga berkurang.",
    },
    lowered: {
      en: "Collect less from earnings; households keep more of their pay.",
      id: "Pajak penghasilan berkurang; pendapatan bersih rumah tangga bertambah.",
    },
  },
  vat: {
    raised: {
      en: "Collect more per purchase; household purchasing power and consumption fall.",
      id: "Pajak per pembelian bertambah; daya beli dan konsumsi rumah tangga turun.",
    },
    lowered: {
      en: "Collect less per purchase; household purchasing power and consumption improve.",
      id: "Pajak per pembelian berkurang; daya beli dan konsumsi rumah tangga meningkat.",
    },
  },
  corporateIncome: {
    raised: {
      en: "Collect more from profits; businesses have less to invest in growth and jobs.",
      id: "Pajak atas laba bertambah; dana usaha untuk pertumbuhan dan pekerjaan berkurang.",
    },
    lowered: {
      en: "Collect less from profits; businesses have more to invest in growth and jobs.",
      id: "Pajak atas laba berkurang; dana usaha untuk pertumbuhan dan pekerjaan bertambah.",
    },
  },
  importDuty: {
    raised: {
      en: "Collect more per import; imported inputs and household purchases cost more.",
      id: "Pajak per impor bertambah; bahan baku impor dan belanja rumah tangga lebih mahal.",
    },
    lowered: {
      en: "Collect less per import; imported inputs and household purchases cost less.",
      id: "Pajak per impor berkurang; bahan baku impor dan belanja rumah tangga lebih murah.",
    },
  },
  excise: {
    raised: {
      en: "Collect more from taxed products; higher household costs reduce purchasing power.",
      id: "Penerimaan cukai bertambah; biaya rumah tangga naik dan daya beli turun.",
    },
    lowered: {
      en: "Collect less from taxed products; lower household costs improve purchasing power.",
      id: "Penerimaan cukai berkurang; biaya rumah tangga turun dan daya beli meningkat.",
    },
  },
  luxury: {
    raised: {
      en: "Collect more per luxury purchase; household purchasing power and sales fall.",
      id: "Pajak per pembelian barang mewah bertambah; daya beli dan penjualan turun.",
    },
    lowered: {
      en: "Collect less per luxury purchase; household purchasing power and sales improve.",
      id: "Pajak per pembelian barang mewah berkurang; daya beli dan penjualan meningkat.",
    },
  },
};

export function TaxPolicies({
  taxes,
  enacted,
  softened,
  bills,
  soften,
  perppu,
  emergency,
  pending,
  disabled,
  onChange,
  onSoften,
  onPerppu,
  onBill,
}: {
  taxes: TaxSettings;
  enacted: TaxSettings;
  softened: PoliticsState["softened"];
  bills: BillResult[];
  soften: TaxId[];
  perppu: TaxId[];
  /** An active crisis allows a Perppu. */
  emergency: boolean;
  /** Taxes whose Perppu awaits DPR confirmation. */
  pending: TaxId[];
  disabled: boolean;
  onChange: (taxes: TaxSettings) => void;
  onSoften: (soften: TaxId[]) => void;
  onPerppu: (perppu: TaxId[]) => void;
  onBill: (tax: TaxId) => void;
}) {
  const language = useLanguage();
  const t = (en: string, id: string) => (language === "id" ? id : en);
  return (
    <>
      <div className="q-tax-grid">
        {taxDefinitions.map((tax) => {
          const changed = taxes[tax.id] !== enacted[tax.id];
          const currentRate = effectiveRate(
            tax.rates,
            enacted[tax.id],
            softened[tax.id],
          );
          const bill = bills.find((b) => b.tax === tax.id);
          const probe = TAX_LEVELS.indexOf(enacted[tax.id]) < 2 ? 1 : -1;
          const probeEffects = billGroupEffects({
            tax: tax.id,
            from: enacted[tax.id],
            to: TAX_LEVELS[TAX_LEVELS.indexOf(enacted[tax.id]) + probe],
            steps: probe,
          });
          const plannedRate = changed
            ? bill?.softened
              ? effectiveRate(tax.rates, taxes[tax.id], enacted[tax.id])
              : tax.rates[taxes[tax.id]]
            : currentRate;
          const effect = changed
            ? taxChangeEffects[tax.id][
                plannedRate > currentRate ? "raised" : "lowered"
              ][language]
            : tax.tradeoff[language];
          return (
            <article
              className="q-tax-card"
              key={tax.id}
              id={`tax-card-${tax.id}`}
              tabIndex={-1}
              aria-labelledby={`tax-heading-${tax.id}`}
              data-tax={tax.id}
              data-changed={changed}
            >
              <div className="q-tax-card-heading">
                <EconomyEmblem
                  kind={
                    tax.id === "personalIncome"
                      ? "income"
                      : tax.id === "vat"
                        ? "retail"
                        : tax.id === "corporateIncome"
                          ? "profits"
                          : tax.id === "importDuty"
                            ? "trade"
                            : tax.id === "excise"
                              ? "excise"
                              : "luxury"
                  }
                />
                <h2 id={`tax-heading-${tax.id}`}>
                  <StatHelp
                    label={tax.name[language]}
                    description={tax.description[language]}
                  />
                </h2>
              </div>
              <p className="q-tax-tradeoff" id={`tax-tradeoff-${tax.id}`}>
                {effect}
              </p>
              <fieldset
                disabled={disabled || pending.includes(tax.id)}
                aria-describedby={`tax-tradeoff-${tax.id} tax-rate-${tax.id}`}
              >
                <legend className="sr-only">{tax.name[language]}</legend>
                <div className="q-tax-levels">
                  {TAX_LEVELS.map((level) => (
                    <label key={level}>
                      <input
                        type="radio"
                        name={`tax-${tax.id}`}
                        value={level}
                        checked={taxes[tax.id] === level}
                        onChange={() => onChange({ ...taxes, [tax.id]: level })}
                      />
                      <span className="q-tax-choice">
                        <span>{taxLevelNames[level][language]}</span>
                        <strong>{tax.rates[level]}%</strong>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="q-tax-plan">
                <p
                  className={`q-tax-current${changed ? " q-tax-changed" : ""}`}
                  id={`tax-rate-${tax.id}`}
                  role="status"
                >
                  {t("Current rate: ", "Tarif saat ini: ")}
                  <strong>{currentRate}%</strong>
                  {changed ? (
                    <>
                      <span aria-hidden="true"> → </span>
                      {t("Next quarter: ", "Triwulan depan: ")}
                      <strong>{plannedRate}%</strong>
                    </>
                  ) : (
                    t(" · Unchanged", " · Tetap")
                  )}
                </p>
                {changed && (
                  <button
                    type="button"
                    className="q-tax-restore"
                    disabled={disabled}
                    aria-label={t(
                      `Restore current rate for ${tax.name.en}`,
                      `Kembalikan tarif saat ini untuk ${tax.name.id}`,
                    )}
                    onClick={(event) => {
                      event.currentTarget
                        .closest("article")
                        ?.querySelector<HTMLInputElement>(
                          `input[value="${enacted[tax.id]}"]`,
                        )
                        ?.focus();
                      onChange({ ...taxes, [tax.id]: enacted[tax.id] });
                    }}
                  >
                    {t("Restore current rate", "Kembalikan tarif saat ini")}
                  </button>
                )}
              </div>
              <div className="q-tax-dpr" data-testid={`tax-dpr-${tax.id}`}>
                {pending.includes(tax.id) ? (
                  <p className="q-tax-dpr-forecast" role="status">
                    <span className="dpr-vote" data-yes="true">
                      Perppu
                    </span>{" "}
                    {t(
                      "In force by emergency regulation. The DPR votes to confirm or revoke it when you advance; the rate is locked until then.",
                      "Berlaku lewat peraturan darurat. DPR memutuskan mengesahkan atau mencabutnya saat Anda melanjutkan; tarif dikunci sampai saat itu.",
                    )}
                  </p>
                ) : bill ? (
                  <>
                    <p className="q-tax-dpr-forecast" role="status">
                      <span
                        className="dpr-vote"
                        data-yes={bill.passed || !!bill.perppu}
                      >
                        {bill.perppu
                          ? t("Perppu: applies now", "Perppu: berlaku sekarang")
                          : bill.passed
                            ? t("DPR: passes", "DPR: lolos")
                            : t("DPR: fails", "DPR: gagal")}
                      </span>{" "}
                      {bill.perppu
                        ? t(
                            `Confirmation vote next quarter; today ${bill.yes} of ${TOTAL_SEATS} would vote yes`,
                            `Pengesahan triwulan depan; hari ini ${bill.yes} dari ${TOTAL_SEATS} akan setuju`,
                          )
                        : t(
                            `${bill.yes} yes of ${TOTAL_SEATS}, needs ${MAJORITY}`,
                            `${bill.yes} setuju dari ${TOTAL_SEATS}, butuh ${MAJORITY}`,
                          )}
                    </p>
                    <span className="dpr-terms">
                      {VOTER_GROUPS.map((g) => (
                        <GroupChip
                          key={g}
                          group={g}
                          value={resultGroupEffects(bill)[g]}
                        />
                      ))}
                    </span>
                    <div className="q-tax-dpr-actions">
                      {emergency && (
                        <button
                          type="button"
                          className="dpr-soften"
                          aria-pressed={!!bill.perppu}
                          disabled={disabled}
                          onClick={() =>
                            onPerppu(
                              perppu.includes(tax.id)
                                ? perppu.filter((id) => id !== tax.id)
                                : [...perppu, tax.id],
                            )
                          }
                        >
                          <strong>
                            {t("Issue as Perppu", "Terbitkan sebagai Perppu")}
                          </strong>
                          <span>
                            {t(
                              "Crisis: applies now, DPR votes next quarter",
                              "Krisis: berlaku sekarang, DPR memutuskan triwulan depan",
                            )}
                          </span>
                        </button>
                      )}
                      {bill.increase && (
                        <button
                          type="button"
                          className="dpr-soften"
                          aria-pressed={bill.softened}
                          disabled={disabled}
                          onClick={() =>
                            onSoften(
                              soften.includes(tax.id)
                                ? soften.filter((id) => id !== tax.id)
                                : [...soften, tax.id],
                            )
                          }
                        >
                          <strong>
                            {t("Soften: ", "Lunakkan: ")}
                            {softenNames[tax.id][language]}
                          </strong>
                          <span>
                            {t(
                              "Half the rise, half the harm",
                              "Kenaikan separuh, kerugian separuh",
                            )}
                          </span>
                        </button>
                      )}
                      <button type="button" onClick={() => onBill(tax.id)}>
                        {t("See DPR vote", "Lihat suara DPR")}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="q-tax-dpr-hint">
                      {probe > 0
                        ? t(
                            "Raising it needs the DPR. Voter groups would react:",
                            "Menaikkannya butuh DPR. Reaksi kelompok pemilih:",
                          )
                        : t(
                            "Lowering it needs the DPR. Voter groups would react:",
                            "Menurunkannya butuh DPR. Reaksi kelompok pemilih:",
                          )}
                    </p>
                    <span className="dpr-terms">
                      {VOTER_GROUPS.map((g) => (
                        <GroupChip key={g} group={g} value={probeEffects[g]} />
                      ))}
                    </span>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
