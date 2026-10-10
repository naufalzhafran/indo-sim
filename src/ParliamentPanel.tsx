import { useState } from "react";
import { number } from "./components";
import { StatHelp } from "./StatHelp";
import { useLanguage } from "./i18n";
import {
  APPROVAL_BASE,
  MAJORITY,
  TOTAL_SEATS,
  VOTER_GROUPS,
  approvalTermNames,
  coalitionSeats,
  groupNames,
  partyById,
  parties,
  resultGroupEffects,
  sideNames,
  softenNames,
  standingSupport,
  voteOnBills,
  type BillResult,
  type PartyId,
  type SupportBreakdown,
  type VoterGroup,
} from "./engine/politics";
import { taxDefinitions, type TaxId } from "./engine/taxes";
import type { QuarterGame, QuarterPlan } from "./engine/economy/types";

export type ParliamentTab = "parties" | "last" | TaxId;

const SEAT_ORDER: PartyId[] = [
  "pdip",
  "pkb",
  "pks",
  "pan",
  "nasdem",
  "demokrat",
  "golkar",
  "gerindra",
];

/** Seat positions for a half-circle chart, ordered left to right. */
const seatPositions = (() => {
  const rows = 12,
    inner = 46,
    outer = 100;
  const radii = Array.from(
    { length: rows },
    (_, i) => inner + ((outer - inner) * i) / (rows - 1),
  );
  const total = radii.reduce((a, b) => a + b, 0);
  const counts = radii.map((r) => Math.round((TOTAL_SEATS * r) / total));
  counts[rows - 1] += TOTAL_SEATS - counts.reduce((a, b) => a + b, 0);
  const seats: { x: number; y: number; angle: number }[] = [];
  radii.forEach((r, row) => {
    for (let i = 0; i < counts[row]; i++) {
      const angle = Math.PI - (Math.PI * (i + 0.5)) / counts[row];
      seats.push({
        x: 104 + r * Math.cos(angle),
        y: 104 - r * Math.sin(angle),
        angle,
      });
    }
  });
  return seats.sort((a, b) => b.angle - a.angle);
})();

const seatParty: PartyId[] = SEAT_ORDER.flatMap((id) =>
  Array<PartyId>(partyById[id].seats).fill(id),
);

const signed = (value: number) =>
  `${value > 0 ? "+" : value < 0 ? "−" : "±"}${number(Math.abs(value), Number.isInteger(value) ? 0 : 1)}`;

export function GroupChip({
  group,
  value,
}: {
  group: VoterGroup;
  value?: number;
}) {
  const language = useLanguage();
  const tone =
    value === undefined || Math.abs(value) < 0.05
      ? "neutral"
      : value > 0
        ? "up"
        : "down";
  return (
    <span className="dpr-group" data-tone={tone} data-group={group}>
      {groupNames[group][language]}
      {value !== undefined && <strong>{signed(value)}</strong>}
    </span>
  );
}

function Hemicycle({
  highlight,
  votes,
}: {
  highlight: (party: PartyId) => boolean;
  votes: SupportBreakdown[] | null;
}) {
  const language = useLanguage();
  const yes = (party: PartyId) =>
    votes ? votes.find((v) => v.party === party)!.yes : true;
  return (
    <svg
      className="dpr-hemicycle"
      viewBox="0 0 208 112"
      role="img"
      aria-label={
        language === "id"
          ? `Kursi DPR: ${TOTAL_SEATS} kursi, mayoritas ${MAJORITY}`
          : `DPR seats: ${TOTAL_SEATS} seats, majority ${MAJORITY}`
      }
    >
      {seatPositions.map((seat, i) => {
        const party = seatParty[i];
        const on = highlight(party);
        const filled = yes(party);
        return (
          <circle
            key={i}
            cx={seat.x}
            cy={seat.y}
            r={2.15}
            fill={filled ? partyById[party].color : "#fffaf0"}
            stroke={partyById[party].color}
            strokeWidth={filled ? 0 : 0.9}
            opacity={on ? 1 : 0.2}
          />
        );
      })}
      <line
        x1={104}
        y1={4}
        x2={104}
        y2={106}
        stroke="#244d49"
        strokeDasharray="2 2"
        strokeWidth={0.8}
      />
    </svg>
  );
}

function reason(row: SupportBreakdown, language: "en" | "id") {
  const worst = [...row.groups].sort((a, b) => a.value - b.value)[0];
  const best = [...row.groups].sort((a, b) => b.value - a.value)[0];
  const id = language === "id";
  if (!row.yes) {
    if (row.pileUp <= -10 && (!worst || worst.value > row.pileUp))
      return id
        ? "terlalu banyak kenaikan pajak"
        : "too many tax rises at once";
    if (worst && worst.value < 0)
      return id
        ? `merugikan ${groupNames[worst.group].id.toLowerCase()}`
        : `hurts ${groupNames[worst.group].en.toLowerCase()}`;
    return id ? "di luar koalisi" : "outside the coalition";
  }
  if (best && best.value > 0)
    return id
      ? `menguntungkan ${groupNames[best.group].id.toLowerCase()}`
      : `helps ${groupNames[best.group].en.toLowerCase()}`;
  if (row.approval > 0)
    return id ? "pemerintah masih populer" : "the government is still popular";
  return id ? "setia pada koalisi" : "loyal to the coalition";
}

function BillTable({
  bill,
  filter,
}: {
  bill: BillResult;
  filter: VoterGroup | null;
}) {
  const language = useLanguage();
  const t = (en: string, id: string) => (language === "id" ? id : en);
  return (
    <table className="dpr-table">
      <thead>
        <tr>
          <th scope="col">{t("Party", "Partai")}</th>
          <th scope="col">{t("Seats", "Kursi")}</th>
          <th scope="col">{t("How support adds up", "Rincian dukungan")}</th>
          <th scope="col">{t("Support", "Dukungan")}</th>
          <th scope="col">{t("Vote", "Suara")}</th>
        </tr>
      </thead>
      <tbody>
        {bill.parties.map((row) => {
          const party = partyById[row.party];
          return (
            <tr
              key={row.party}
              data-dim={
                filter && !party.groups.includes(filter) ? "true" : undefined
              }
            >
              <th scope="row">
                <span
                  className="dpr-swatch"
                  style={{ background: party.color }}
                  aria-hidden="true"
                />
                {party.name}
              </th>
              <td className="dpr-num">{party.seats}</td>
              <td>
                <span className="dpr-terms">
                  <span>
                    {sideNames[party.side][language]} {row.loyalty}
                  </span>
                  <span>
                    {t("Approval", "Kepuasan")} {signed(row.approval)}
                  </span>
                  {row.groups.map((g) => (
                    <GroupChip key={g.group} group={g.group} value={g.value} />
                  ))}
                  {row.pileUp !== 0 && (
                    <span>
                      {t("Other tax rises", "Kenaikan pajak lain")}{" "}
                      {signed(row.pileUp)}
                    </span>
                  )}
                </span>
                <small>
                  {reason(row, language)}
                  {row.softenFlips &&
                    t(
                      " · Softening changes this vote",
                      " · Pelunakan mengubah suara ini",
                    )}
                </small>
              </td>
              <td className="dpr-num">
                <strong>
                  {number(row.total, Number.isInteger(row.total) ? 0 : 1)}
                </strong>
              </td>
              <td>
                <span className="dpr-vote" data-yes={row.yes}>
                  {row.yes ? t("Yes", "Setuju") : t("No", "Tolak")}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function ParliamentPanel({
  game,
  plan,
  onChange,
  disabled,
  tab,
  onTab,
}: {
  game: QuarterGame;
  plan: QuarterPlan;
  onChange: (plan: QuarterPlan) => void;
  disabled: boolean;
  tab: ParliamentTab;
  onTab: (tab: ParliamentTab) => void;
}) {
  const language = useLanguage();
  const t = (en: string, id: string) => (language === "id" ? id : en);
  const [filter, setFilter] = useState<VoterGroup | null>(null);
  const politics = game.politics;
  const bills = voteOnBills(
    game.taxes,
    plan.taxes,
    politics.approval,
    plan.soften ?? [],
  );
  const last = politics.lastVotes;
  const current: ParliamentTab =
    tab === "last"
      ? last.length
        ? "last"
        : "parties"
      : tab === "parties" || bills.some((b) => b.tax === tab)
        ? tab
        : "parties";
  const bill =
    current === "parties" || current === "last"
      ? null
      : bills.find((b) => b.tax === current)!;
  const standing = standingSupport(politics.approval);
  const taxName = (id: TaxId) =>
    taxDefinitions.find((d) => d.id === id)!.name[language];
  const rate = (id: TaxId, level: BillResult["to"]) =>
    taxDefinitions.find((d) => d.id === id)!.rates[level];
  const billLabel = (b: BillResult) =>
    `${taxName(b.tax)} ${rate(b.tax, b.from)}% → ${rate(b.tax, b.to)}%`;
  const change = politics.approval - politics.previousApproval;
  const toggleSoften = (id: TaxId) => {
    const soften = plan.soften ?? [];
    onChange({
      ...plan,
      soften: soften.includes(id)
        ? soften.filter((x) => x !== id)
        : [...soften, id],
    });
  };

  return (
    <div className="dpr-panel">
      <section className="dpr-overview" aria-labelledby="dpr-overview-heading">
        <h3 id="dpr-overview-heading" className="dpr-section-title">
          {t("Parliament overview", "Ringkasan parlemen")}
        </h3>
        <Hemicycle
          highlight={(party) =>
            !filter || partyById[party].groups.includes(filter)
          }
          votes={bill?.parties ?? null}
        />
        <dl className="dpr-stats">
          <div>
            <dt>
              <StatHelp
                label={t("Public approval", "Kepuasan publik")}
                description={t(
                  "How satisfied voters are with the government. Higher approval makes every party more willing to vote yes.",
                  "Seberapa puas pemilih terhadap pemerintah. Kepuasan tinggi membuat setiap partai lebih mau menyetujui.",
                )}
              />
            </dt>
            <dd>{number(politics.approval, 0)}%</dd>
            <dd className="dpr-stat-note">
              {Math.abs(change) < 0.5
                ? t("Steady", "Stabil")
                : `${signed(Math.round(change))} ${t("last quarter", "triwulan lalu")}`}
            </dd>
          </div>
          <div>
            <dt>{t("Coalition", "Koalisi")}</dt>
            <dd>
              {coalitionSeats()} / {TOTAL_SEATS}
            </dd>
            <dd className="dpr-stat-note">
              {t(`Majority needs ${MAJORITY}`, `Mayoritas butuh ${MAJORITY}`)}
            </dd>
          </div>
        </dl>
        <div className="dpr-approval">
          <h4>
            {t("Where approval is heading", "Arah kepuasan publik")}{" "}
            <strong>{number(politics.target, 0)}%</strong>
          </h4>
          <p>
            {t(
              "Approval moves 30% of the way toward this target each quarter.",
              "Kepuasan bergerak 30% menuju target ini setiap triwulan.",
            )}
          </p>
          <ul>
            <li>
              <span>{t("Starting point", "Titik awal")}</span>
              <strong>{APPROVAL_BASE}</strong>
            </li>
            {politics.terms.map((term) => (
              <li
                key={term.id}
                data-tone={
                  term.value < -0.05
                    ? "down"
                    : term.value > 0.05
                      ? "up"
                      : "neutral"
                }
              >
                <span>{approvalTermNames[term.id][language]}</span>
                <strong>{signed(Math.round(term.value * 10) / 10)}</strong>
              </li>
            ))}
            {!politics.terms.length && (
              <li>
                <span>
                  {t(
                    "Honeymoon: the first quarter sets the trend",
                    "Masa bulan madu: triwulan pertama menentukan arah",
                  )}
                </span>
              </li>
            )}
          </ul>
        </div>
        <div className="dpr-reality">
          <h4>{t("In reality", "Faktanya")}</h4>
          <p>
            {t(
              "Seats follow the 2024 election. Parties vote as blocs (fraksi), and tax rates are set by law, so every rate change needs the DPR.",
              "Kursi mengikuti Pemilu 2024. Partai memberi suara per fraksi, dan tarif pajak diatur undang-undang, sehingga setiap perubahan tarif butuh DPR.",
            )}
          </p>
          <p>
            {t(
              "In January 2025 the PPN rise to 12% was limited to luxury goods after public pushback, even with a large coalition.",
              "Pada Januari 2025 kenaikan PPN menjadi 12% dibatasi pada barang mewah setelah penolakan publik, meski koalisi besar.",
            )}
          </p>
          <p>
            {t(
              "Voter groups are a game simplification of each party's base.",
              "Kelompok pemilih adalah penyederhanaan basis tiap partai untuk permainan.",
            )}
          </p>
          <a
            className="dpr-source"
            href="https://www.kpu.go.id/"
            target="_blank"
            rel="noreferrer"
          >
            {t("Source: KPU", "Sumber: KPU")}
          </a>
        </div>
      </section>
      <section className="dpr-main" aria-labelledby="dpr-main-heading">
        <h3 id="dpr-main-heading" className="dpr-section-title">
          {t("Parties and bills", "Partai dan RUU")}
        </h3>
        <div
          className="eco-filter-row dpr-tabs"
          role="group"
          aria-label={t("Parliament view", "Tampilan parlemen")}
        >
          <button
            type="button"
            aria-pressed={current === "parties"}
            onClick={() => onTab("parties")}
          >
            {t("Parties", "Partai")}
          </button>
          {bills.map((b) => (
            <button
              type="button"
              key={b.tax}
              aria-pressed={current === b.tax}
              onClick={() => onTab(b.tax)}
            >
              {t("Bill: ", "RUU: ")}
              {taxName(b.tax)}
              <small data-pass={b.passed}>
                {b.passed ? t("passes", "lolos") : t("fails", "gagal")}
              </small>
            </button>
          ))}
          {last.length > 0 && (
            <button
              type="button"
              aria-pressed={current === "last"}
              onClick={() => onTab("last")}
            >
              {t("Last session", "Sidang lalu")}
            </button>
          )}
        </div>
        <div className="eco-filter-row dpr-filters">
          <span className="dpr-filter-label">
            {t(
              "Show parties that depend on",
              "Tampilkan partai yang bergantung pada",
            )}
          </span>
          <button
            type="button"
            aria-pressed={filter === null}
            onClick={() => setFilter(null)}
          >
            {t("All groups", "Semua kelompok")}
          </button>
          {VOTER_GROUPS.map((group) => (
            <button
              type="button"
              key={group}
              aria-pressed={filter === group}
              onClick={() => setFilter(group)}
            >
              {groupNames[group][language]}
              <small>
                {parties
                  .filter((p) => p.groups.includes(group))
                  .reduce((sum, p) => sum + p.seats, 0)}
              </small>
            </button>
          ))}
        </div>

        {current === "parties" && (
          <>
            {!bills.length && (
              <p className="dpr-lead">
                {t(
                  "No bill is pending. Changing a tax in Policies & taxes sends a bill here, and the DPR votes when you advance the quarter.",
                  "Belum ada RUU. Mengubah pajak di Kebijakan & pajak mengirim RUU ke sini, dan DPR memberi suara saat Anda melanjutkan triwulan.",
                )}
              </p>
            )}
            <table className="dpr-table">
              <thead>
                <tr>
                  <th scope="col">{t("Party", "Partai")}</th>
                  <th scope="col">{t("Seats", "Kursi")}</th>
                  <th scope="col">{t("Side", "Posisi")}</th>
                  <th scope="col">{t("Voter groups", "Kelompok pemilih")}</th>
                  <th scope="col">
                    <StatHelp
                      label={t("Support", "Dukungan")}
                      description={t(
                        "Coalition loyalty plus half of approval above 50. A party votes yes on a bill when its support, after the bill's effects on its voter groups, is 50 or more.",
                        "Loyalitas koalisi ditambah separuh kepuasan di atas 50. Partai menyetujui RUU jika dukungannya, setelah dampak RUU pada kelompok pemilihnya, minimal 50.",
                      )}
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {parties.map((party) => (
                  <tr
                    key={party.id}
                    data-dim={
                      filter && !party.groups.includes(filter)
                        ? "true"
                        : undefined
                    }
                  >
                    <th scope="row">
                      <span
                        className="dpr-swatch"
                        style={{ background: party.color }}
                        aria-hidden="true"
                      />
                      {party.name}
                    </th>
                    <td className="dpr-num">{party.seats}</td>
                    <td>{sideNames[party.side][language]}</td>
                    <td>
                      <span className="dpr-terms">
                        {party.groups.map((g) => (
                          <GroupChip key={g} group={g} />
                        ))}
                      </span>
                    </td>
                    <td className="dpr-num">
                      <strong>
                        {number(
                          standing.find((s) => s.party === party.id)!.total,
                          0,
                        )}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {bill && (
          <>
            <div className="dpr-bill-head">
              <div>
                <h4>{billLabel(bill)}</h4>
                <p role="status">
                  <strong>
                    {t(
                      `${bill.yes} yes of ${TOTAL_SEATS}`,
                      `${bill.yes} setuju dari ${TOTAL_SEATS}`,
                    )}
                  </strong>
                  {" · "}
                  {bill.passed
                    ? t("passes", "lolos")
                    : t(
                        `fails (needs ${MAJORITY})`,
                        `gagal (butuh ${MAJORITY})`,
                      )}
                </p>
                <p className="dpr-bill-groups">
                  {VOTER_GROUPS.map((g) => (
                    <GroupChip
                      key={g}
                      group={g}
                      value={resultGroupEffects(bill)[g]}
                    />
                  ))}
                </p>
              </div>
              {bill.increase && (
                <button
                  type="button"
                  className="dpr-soften"
                  aria-pressed={bill.softened}
                  disabled={disabled}
                  onClick={() => toggleSoften(bill.tax)}
                >
                  <strong>
                    {t("Soften: ", "Lunakkan: ")}
                    {softenNames[bill.tax][language]}
                  </strong>
                  <span>
                    {t(
                      "The rate rises half as much and harm to every voter group is halved.",
                      "Tarif naik separuhnya dan kerugian bagi setiap kelompok pemilih berkurang separuh.",
                    )}
                  </span>
                </button>
              )}
            </div>
            <BillTable bill={bill} filter={filter} />
          </>
        )}

        {current === "last" && (
          <>
            <p className="dpr-lead">
              {t(
                "Votes from the last quarter. A rejected bill kept the tax at its previous rate.",
                "Hasil suara triwulan lalu. RUU yang ditolak membuat pajak tetap pada tarif sebelumnya.",
              )}
            </p>
            {last.map((b) => (
              <div key={b.tax} className="dpr-last">
                <h4>
                  {billLabel(b)}
                  {b.softened && ` · ${t("softened", "dilunakkan")}`}
                </h4>
                <p>
                  <span className="dpr-vote" data-yes={b.passed}>
                    {b.passed
                      ? t("Passed", "Disetujui")
                      : t("Rejected", "Ditolak")}
                  </span>{" "}
                  {t(
                    `${b.yes} of ${TOTAL_SEATS} voted yes`,
                    `${b.yes} dari ${TOTAL_SEATS} setuju`,
                  )}
                </p>
                <ul>
                  {b.parties.map((row) => (
                    <li key={row.party}>
                      <span
                        className="dpr-swatch"
                        style={{ background: partyById[row.party].color }}
                        aria-hidden="true"
                      />
                      <strong>{partyById[row.party].name}</strong>{" "}
                      {row.yes
                        ? t("voted yes", "setuju")
                        : t("voted no", "menolak")}
                      : {reason(row, language)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </>
        )}
      </section>
    </div>
  );
}
