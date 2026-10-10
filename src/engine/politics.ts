import type { Bilingual } from "./economy/types";
import {
  TAX_IDS,
  TAX_LEVELS,
  type TaxId,
  type TaxLevel,
  type TaxSettings,
} from "./taxes";

/** DPR seats after the 2024 election (KPU). Fixed for the 2025–2029 term. */
export const TOTAL_SEATS = 580;
export const MAJORITY = 291;
export const YES_THRESHOLD = 50;
export const OPENING_APPROVAL = 72;

export const VOTER_GROUPS = ["villages", "urban", "business", "outer"] as const;
export type VoterGroup = (typeof VOTER_GROUPS)[number];

export const PARTY_IDS = [
  "gerindra",
  "golkar",
  "nasdem",
  "pkb",
  "pks",
  "pan",
  "demokrat",
  "pdip",
] as const;
export type PartyId = (typeof PARTY_IDS)[number];
export type PartySide = "president" | "coalition" | "outside";

export type PartyDefinition = {
  id: PartyId;
  name: string;
  seats: number;
  side: PartySide;
  groups: VoterGroup[];
  color: string;
};

// Voter groups are a stylised game simplification of each party's base.
export const parties: PartyDefinition[] = [
  {
    id: "gerindra",
    name: "Gerindra",
    seats: 86,
    side: "president",
    groups: ["villages", "urban"],
    color: "#b5473a",
  },
  {
    id: "golkar",
    name: "Golkar",
    seats: 102,
    side: "coalition",
    groups: ["business", "outer"],
    color: "#e2b33c",
  },
  {
    id: "nasdem",
    name: "NasDem",
    seats: 69,
    side: "coalition",
    groups: ["business", "urban"],
    color: "#2c6e8f",
  },
  {
    id: "pkb",
    name: "PKB",
    seats: 68,
    side: "coalition",
    groups: ["villages"],
    color: "#2f8a57",
  },
  {
    id: "pks",
    name: "PKS",
    seats: 53,
    side: "coalition",
    groups: ["urban"],
    color: "#e08a3c",
  },
  {
    id: "pan",
    name: "PAN",
    seats: 48,
    side: "coalition",
    groups: ["urban", "business"],
    color: "#5b9bd5",
  },
  {
    id: "demokrat",
    name: "Demokrat",
    seats: 44,
    side: "coalition",
    groups: ["villages", "outer"],
    color: "#30508f",
  },
  {
    id: "pdip",
    name: "PDI-P",
    seats: 110,
    side: "outside",
    groups: ["urban", "villages"],
    color: "#d9534f",
  },
];
export const partyById = Object.fromEntries(
  parties.map((p) => [p.id, p]),
) as Record<PartyId, PartyDefinition>;

export const loyalty: Record<PartySide, number> = {
  president: 90,
  coalition: 65,
  outside: 35,
};

export const sideNames: Record<PartySide, Bilingual> = {
  president: { en: "President's party", id: "Partai presiden" },
  coalition: { en: "Coalition", id: "Koalisi" },
  outside: { en: "Outside coalition", id: "Di luar koalisi" },
};

export const groupNames: Record<VoterGroup, Bilingual> = {
  villages: { en: "Villages & farmers", id: "Desa & petani" },
  urban: { en: "Urban households", id: "Rumah tangga kota" },
  business: { en: "Business", id: "Dunia usaha" },
  outer: { en: "Outer islands", id: "Luar Jawa" },
};

/** Support change for each voter group from one step of tax increase. */
export const taxGroupEffects: Record<TaxId, Record<VoterGroup, number>> = {
  personalIncome: { villages: -3, urban: -15, business: -5, outer: -3 },
  vat: { villages: -12, urban: -12, business: -5, outer: -8 },
  corporateIncome: { villages: 0, urban: 0, business: -15, outer: -3 },
  importDuty: { villages: 5, urban: -5, business: -8, outer: -5 },
  excise: { villages: -8, urban: -3, business: -3, outer: 0 },
  luxury: { villages: 3, urban: 3, business: -5, outer: 3 },
};

export const softenNames: Record<TaxId, Bilingual> = {
  personalIncome: {
    en: "Raise the tax-free threshold",
    id: "Naikkan batas penghasilan tidak kena pajak",
  },
  vat: { en: "Exempt basic goods", id: "Bebaskan kebutuhan pokok" },
  corporateIncome: { en: "Exempt small firms", id: "Bebaskan usaha kecil" },
  importDuty: { en: "Exempt farm inputs", id: "Bebaskan input pertanian" },
  excise: { en: "Phase in gradually", id: "Terapkan bertahap" },
  luxury: { en: "Exempt locally made goods", id: "Bebaskan produk lokal" },
};

export const PILE_UP = 5;
const VISIBLE_PROGRAMMES = ["mbg", "pkh", "jkn", "ckg"] as const;

export type ApprovalTermId =
  | "income"
  | "inflation"
  | "unemployment"
  | "taxRises"
  | "taxCuts"
  | "programmes"
  | "shortfalls";
export type ApprovalTerm = { id: ApprovalTermId; value: number };

export type SupportBreakdown = {
  party: PartyId;
  loyalty: number;
  approval: number;
  groups: { group: VoterGroup; value: number }[];
  pileUp: number;
  total: number;
  yes: boolean;
  /** Vote flips to yes if this bill is softened. */
  softenFlips: boolean;
};

export type BillResult = {
  tax: TaxId;
  from: TaxLevel;
  to: TaxLevel;
  increase: boolean;
  softened: boolean;
  yes: number;
  passed: boolean;
  parties: SupportBreakdown[];
};

export type PoliticsState = {
  approval: number;
  /** A softened increase keeps the previous level's rate halfway. */
  softened: Partial<Record<TaxId, TaxLevel>>;
  taxRises: number[];
  taxCuts: number[];
  shortfalls: number[];
  terms: ApprovalTerm[];
  target: number;
  previousApproval: number;
  lastVotes: BillResult[];
};

export const initialPolitics = (): PoliticsState => ({
  approval: OPENING_APPROVAL,
  softened: {},
  taxRises: [],
  taxCuts: [],
  shortfalls: [],
  terms: [],
  target: OPENING_APPROVAL,
  previousApproval: OPENING_APPROVAL,
  lastVotes: [],
});

const levelIndex = (level: TaxLevel) => TAX_LEVELS.indexOf(level);

export type TaxBill = {
  tax: TaxId;
  from: TaxLevel;
  to: TaxLevel;
  steps: number;
};

export function pendingBills(
  current: TaxSettings,
  planned: TaxSettings,
): TaxBill[] {
  return TAX_IDS.filter((id) => current[id] !== planned[id]).map((tax) => ({
    tax,
    from: current[tax],
    to: planned[tax],
    steps: levelIndex(planned[tax]) - levelIndex(current[tax]),
  }));
}

/** Group effects of one bill; softening halves the harm of an increase. */
export function billGroupEffects(bill: TaxBill, softened = false) {
  const base = taxGroupEffects[bill.tax];
  return Object.fromEntries(
    VOTER_GROUPS.map((group) => {
      let value =
        bill.steps > 0
          ? base[group] * bill.steps
          : -base[group] * Math.abs(bill.steps) * 0.5;
      if (softened && bill.steps > 0 && value < 0) value *= 0.5;
      return [group, value + 0];
    }),
  ) as Record<VoterGroup, number>;
}

function partySupport(
  party: PartyDefinition,
  effects: Record<VoterGroup, number>,
  approval: number,
  pileUp: number,
) {
  const groups = party.groups.map((group) => ({
    group,
    value: effects[group],
  }));
  const approvalTerm = 0.5 * (approval - 50);
  const total =
    loyalty[party.side] +
    approvalTerm +
    groups.reduce((sum, g) => sum + g.value, 0) +
    pileUp;
  return {
    loyalty: loyalty[party.side],
    approval: approvalTerm,
    groups,
    total,
  };
}

/** Each tax change is its own bill. Parties vote as blocs (fraksi). */
export function voteOnBills(
  current: TaxSettings,
  planned: TaxSettings,
  approval: number,
  soften: readonly TaxId[] = [],
): BillResult[] {
  const bills = pendingBills(current, planned);
  const increases = bills.filter((b) => b.steps > 0).length;
  return bills.map((bill) => {
    const increase = bill.steps > 0;
    const softened = increase && soften.includes(bill.tax);
    const pileUp = -PILE_UP * (increases - (increase ? 1 : 0));
    const effects = billGroupEffects(bill, softened);
    const softEffects = billGroupEffects(bill, true);
    const breakdown = parties.map((party): SupportBreakdown => {
      const s = partySupport(party, effects, approval, pileUp);
      const yes = s.total >= YES_THRESHOLD;
      const soft = partySupport(party, softEffects, approval, pileUp);
      return {
        party: party.id,
        ...s,
        pileUp,
        yes,
        softenFlips:
          increase && !softened && !yes && soft.total >= YES_THRESHOLD,
      };
    });
    const yes = breakdown
      .filter((b) => b.yes)
      .reduce((sum, b) => sum + partyById[b.party].seats, 0);
    return {
      tax: bill.tax,
      from: bill.from,
      to: bill.to,
      increase,
      softened,
      yes,
      passed: yes >= MAJORITY,
      parties: breakdown,
    };
  });
}

/** The voter-group effects recorded with a bill result. */
export const resultGroupEffects = (bill: BillResult) =>
  billGroupEffects(
    {
      tax: bill.tax,
      from: bill.from,
      to: bill.to,
      steps: levelIndex(bill.to) - levelIndex(bill.from),
    },
    bill.softened,
  );

/** Effective rate in percent, including a softened increase. */
export const effectiveRate = (
  rates: Record<TaxLevel, number>,
  level: TaxLevel,
  softenedFrom?: TaxLevel,
) => (softenedFrom ? (rates[level] + rates[softenedFrom]) / 2 : rates[level]);

/** Standing support with no bill on the table. */
export function standingSupport(approval: number) {
  return parties.map((party) => ({
    party: party.id,
    total: loyalty[party.side] + 0.5 * (approval - 50),
  }));
}

export const coalitionSeats = () =>
  parties
    .filter((p) => p.side !== "outside")
    .reduce((sum, p) => sum + p.seats, 0);

export type ApprovalInputs = {
  month: number;
  /** Real income now and at the start of the trailing year. */
  incomeNow: number;
  incomeThen: number;
  inflation: number;
  unemploymentChange: number;
  activePolicies: readonly string[];
  funding: number;
};

export const APPROVAL_BASE = 55;
export const APPROVAL_SPEED = 0.3;

const recent = (months: number[], now: number) =>
  months.filter((m) => m > now - 12 && m <= now).length;

/** Approval moves 30% of the way toward a target each quarter. */
export function updateApproval(
  state: PoliticsState,
  input: ApprovalInputs,
): PoliticsState {
  const shortfalls =
    input.funding < 0.98
      ? [...state.shortfalls, input.month]
      : state.shortfalls;
  // Change over the trailing year (shorter at the start), not annualised,
  // so a single quarter cannot swing approval.
  const growth = (input.incomeNow / input.incomeThen - 1) * 100;
  const programmes = Math.min(
    4,
    VISIBLE_PROGRAMMES.filter((id) => input.activePolicies.includes(id)).length,
  );
  const terms: ApprovalTerm[] = [
    { id: "income", value: 2 * Math.max(-10, Math.min(10, growth)) },
    { id: "inflation", value: -3 * Math.max(0, input.inflation - 3) },
    { id: "unemployment", value: -2 * input.unemploymentChange },
    { id: "taxRises", value: -4 * recent(state.taxRises, input.month) },
    { id: "taxCuts", value: 2 * recent(state.taxCuts, input.month) },
    { id: "programmes", value: 1.5 * programmes },
    { id: "shortfalls", value: -5 * recent(shortfalls, input.month) },
  ];
  for (const term of terms) term.value += 0; // avoid -0 in saves
  const target = Math.max(
    5,
    Math.min(95, APPROVAL_BASE + terms.reduce((sum, t) => sum + t.value, 0)),
  );
  const approval = state.approval + APPROVAL_SPEED * (target - state.approval);
  return {
    ...state,
    shortfalls,
    terms,
    target,
    previousApproval: state.approval,
    approval: Math.max(0, Math.min(100, approval)),
  };
}

export const approvalTermNames: Record<ApprovalTermId, Bilingual> = {
  income: { en: "Real income growth", id: "Pertumbuhan pendapatan riil" },
  inflation: { en: "Inflation above 3%", id: "Inflasi di atas 3%" },
  unemployment: { en: "Unemployment change", id: "Perubahan pengangguran" },
  taxRises: {
    en: "Tax rises this year",
    id: "Kenaikan pajak setahun terakhir",
  },
  taxCuts: { en: "Tax cuts this year", id: "Penurunan pajak setahun terakhir" },
  programmes: {
    en: "Visible household programmes",
    id: "Program rumah tangga yang terasa",
  },
  shortfalls: {
    en: "Funding shortfalls this year",
    id: "Kekurangan dana setahun terakhir",
  },
};
