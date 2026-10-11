import { money, number } from "./components";
import { useLanguage } from "./i18n";
import { EconomyEmblem } from "./EconomyEmblem";
import { PolicyKindBadge } from "./policyKinds";
import { StatHelp } from "./StatHelp";
import { policyById } from "./engine/economy/catalog";
import { taxDefinitions, taxLevelNames, type TaxId } from "./engine/taxes";
import type { PolicyId, QuarterGame } from "./engine/economy/types";

type Emblem = Parameters<typeof EconomyEmblem>[0]["kind"];

const taxEmblem: Record<TaxId, Emblem> = {
  personalIncome: "income",
  vat: "retail",
  corporateIncome: "profits",
  importDuty: "trade",
  excise: "excise",
  luxury: "luxury",
};

function ShareBar({ share }: { share: number }) {
  return (
    <span className="budget-share-track" aria-hidden="true">
      <span style={{ width: `${Math.max(0, Math.min(100, share))}%` }} />
    </span>
  );
}

/** Where the quarter's revenue came from, one row per tax plus other income. */
export function RevenueBreakdown({ game }: { game: QuarterGame }) {
  const language = useLanguage();
  const t = (en: string, id: string) => (language === "id" ? id : en);
  const ledger = game.receipt!.ledger;
  const rows = [
    ...taxDefinitions.map((tax) => ({
      id: tax.id as string,
      emblem: taxEmblem[tax.id],
      name: tax.name[language],
      help: tax.description[language],
      detail: t(
        `${taxLevelNames[game.taxes[tax.id]].en} rate, ${tax.rates[game.taxes[tax.id]]}%`,
        `Tarif ${taxLevelNames[game.taxes[tax.id]].id.toLowerCase()}, ${tax.rates[game.taxes[tax.id]]}%`,
      ),
      value: ledger.taxes[tax.id] ?? 0,
    })),
    {
      id: "nonTax",
      emblem: "mining" as Emblem,
      name: t("Other income (PNBP)", "Penerimaan bukan pajak (PNBP)"),
      help: t(
        "Natural resource fees, profits from state companies and service fees. It is not borrowed money.",
        "Royalti sumber daya alam, laba BUMN, dan biaya layanan. Ini bukan uang pinjaman.",
      ),
      detail: t("Not a tax", "Bukan pajak"),
      value: ledger.nonTaxRevenue,
    },
  ].sort((a, b) => b.value - a.value);
  const total = rows.reduce((sum, r) => sum + r.value, 0);
  return (
    <section
      className="report-board budget-breakdown"
      data-testid="revenue-breakdown"
    >
      <h3>{t("Where the money came from", "Dari mana uang berasal")}</h3>
      <p>
        {t(
          `Total income this quarter: ${money(total)}. Change tax rates in Policies & taxes.`,
          `Total penerimaan triwulan ini: ${money(total)}. Ubah tarif pajak di Kebijakan & pajak.`,
        )}
      </p>
      <ul className="budget-rows">
        {rows.map((row) => {
          const share = total > 0 ? (row.value / total) * 100 : 0;
          return (
            <li key={row.id}>
              <EconomyEmblem kind={row.emblem} />
              <span className="budget-row-name">
                <StatHelp label={row.name} description={row.help} />
                <small>{row.detail}</small>
              </span>
              <ShareBar share={share} />
              <span className="budget-row-value">
                <b>{money(row.value)}</b>
                <small>{number(share, 0)}%</small>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** What every policy cost this quarter, next to everyday government services. */
export function PolicySpending({ game }: { game: QuarterGame }) {
  const language = useLanguage();
  const t = (en: string, id: string) => (language === "id" ? id : en);
  const ledger = game.receipt!.ledger;
  const rows = Object.entries(ledger.policySpending)
    .map(([id, value]) => ({ id: id as PolicyId, value: value ?? 0 }))
    .filter((row) => policyById[row.id] && row.value > 0.005)
    .sort((a, b) => b.value - a.value);
  const policyTotal = rows.reduce((sum, r) => sum + r.value, 0);
  const everyday = ledger.spending - policyTotal;
  return (
    <section
      className="report-board budget-breakdown"
      data-testid="policy-spending"
    >
      <h3>{t("Where the money went", "Ke mana uang dibelanjakan")}</h3>
      <p>
        {t(
          `Everyday services such as schools, clinics and salaries cost ${money(everyday)}, and debt interest ${money(ledger.interest)}. Your policies cost ${money(policyTotal)}:`,
          `Layanan rutin seperti sekolah, klinik, dan gaji pegawai menghabiskan ${money(everyday)}, dan bunga utang ${money(ledger.interest)}. Kebijakan Anda menghabiskan ${money(policyTotal)}:`,
        )}
      </p>
      {rows.length ? (
        <ul className="budget-rows">
          {rows.map((row) => {
            const def = policyById[row.id];
            const share = policyTotal > 0 ? (row.value / policyTotal) * 100 : 0;
            return (
              <li key={row.id}>
                <EconomyEmblem
                  kind={
                    def.category === "economy" ? "investment" : def.category
                  }
                />
                <span className="budget-row-name">
                  <strong>{def.name}</strong>
                  <PolicyKindBadge kind={def.kind} />
                </span>
                <ShareBar share={share} />
                <span className="budget-row-value">
                  <b>{money(row.value)}</b>
                  <small>{number(share, 0)}%</small>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p>
          {t(
            "No money went to programmes or builds this quarter. Choose them in Policies & taxes.",
            "Tidak ada dana untuk program atau pembangunan triwulan ini. Pilih di Kebijakan & pajak.",
          )}
        </p>
      )}
    </section>
  );
}
