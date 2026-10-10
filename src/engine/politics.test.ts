import { describe, expect, it } from "vitest";
import {
  aggregate,
  basePlan,
  initialQuarter,
  resolveQuarter,
} from "./economy/engine";
import { parseQuarter, quarterEnvelope } from "./economy/persistence";
import type { QuarterGame } from "./economy/types";
import {
  MAJORITY,
  TOTAL_SEATS,
  coalitionSeats,
  initialPolitics,
  parties,
  updateApproval,
  voteOnBills,
} from "./politics";
import { TAX_IDS, defaultTaxes, type TaxSettings } from "./taxes";

const calm = { calm: true, attribution: false };
const encode = (game: QuarterGame) => JSON.stringify(quarterEnvelope(game));
const vatUp = (): TaxSettings => ({ ...defaultTaxes(), vat: "increased" });
const yesParties = (approval: number, soften: "vat"[] = []) =>
  voteOnBills(defaultTaxes(), vatUp(), approval, soften)[0];

describe("DPR seats", () => {
  it("matches the 2024 result and the KIM Plus coalition", () => {
    expect(parties.reduce((sum, p) => sum + p.seats, 0)).toBe(TOTAL_SEATS);
    expect(coalitionSeats()).toBe(470);
    expect(MAJORITY).toBe(291);
  });
});

describe("tax bills", () => {
  it("passes a single PPN rise while the government is popular", () => {
    const vote = yesParties(72);
    expect(vote.yes).toBe(470);
    expect(vote.passed).toBe(true);
    const pkb = vote.parties.find((p) => p.party === "pkb")!;
    expect(pkb.total).toBe(64);
  });

  it("rejects the same bill when approval falls to 45", () => {
    const vote = yesParties(45);
    expect(vote.yes).toBe(207);
    expect(vote.passed).toBe(false);
    expect(
      vote.parties
        .filter((p) => p.softenFlips)
        .map((p) => p.party)
        .sort(),
    ).toEqual(["demokrat", "golkar", "nasdem", "pan"]);
  });

  it("passes a softened bill that would otherwise fail", () => {
    const vote = yesParties(45, ["vat"]);
    expect(vote.softened).toBe(true);
    expect(vote.yes).toBe(470);
    expect(vote.passed).toBe(true);
  });

  it("rejects raising all six taxes at once", () => {
    const all = Object.fromEntries(
      TAX_IDS.map((id) => [id, "increased"]),
    ) as TaxSettings;
    const votes = voteOnBills(defaultTaxes(), all, 72);
    expect(votes).toHaveLength(6);
    expect(votes.every((v) => !v.passed)).toBe(true);
  });

  it("treats tax cuts as popular", () => {
    const vote = voteOnBills(
      defaultTaxes(),
      { ...defaultTaxes(), vat: "relief" },
      45,
    )[0];
    expect(vote.increase).toBe(false);
    expect(vote.passed).toBe(true);
  });
});

describe("approval", () => {
  it("moves 30% of the way toward its target", () => {
    const next = updateApproval(initialPolitics(), {
      month: 3,
      incomeNow: 100,
      incomeThen: 100,
      inflation: 2.5,
      unemploymentChange: 0,
      activePolicies: [],
      funding: 1,
    });
    expect(next.target).toBe(55);
    expect(next.approval).toBeCloseTo(72 + 0.3 * (55 - 72));
  });
});

describe("DPR in the quarter", () => {
  it("keeps the current tax level when a bill fails", () => {
    const game = initialQuarter(19);
    game.politics.approval = 45;
    const plan = basePlan(game);
    plan.taxes.vat = "increased";
    const next = resolveQuarter(game, plan, calm);
    expect(next.taxes.vat).toBe("standard");
    expect(next.politics.lastVotes[0].passed).toBe(false);
    expect(next.politics.taxRises).toEqual([]);
  });

  it("applies a passed bill, and a softened one raises half as much", () => {
    const game = initialQuarter(19);
    const full = basePlan(game);
    full.taxes.vat = "increased";
    const soft = {
      ...full,
      taxes: { ...full.taxes },
      soften: ["vat" as const],
    };
    const raised = resolveQuarter(game, full, calm);
    const softened = resolveQuarter(game, soft, calm);
    const unchanged = resolveQuarter(game, basePlan(game), calm);
    expect(raised.taxes.vat).toBe("increased");
    expect(softened.politics.softened.vat).toBe("standard");
    const vat = (g: QuarterGame) => g.receipt!.ledger.taxes.vat;
    const halfway = (vat(raised) + vat(unchanged)) / 2;
    expect(vat(softened)).toBeGreaterThan(vat(unchanged));
    expect(vat(softened)).toBeLessThan(vat(raised));
    expect(Math.abs(vat(softened) - halfway) / halfway).toBeLessThan(0.01);
    expect(raised.politics.taxRises).toEqual([0]);
  });

  it("round-trips politics through saves and loads older saves", () => {
    const game = resolveQuarter(
      initialQuarter(19),
      basePlan(initialQuarter(19)),
      calm,
    );
    expect(parseQuarter(encode(game))).toEqual(game);
    const older = JSON.parse(encode(game));
    delete older.state.politics;
    const loaded = parseQuarter(JSON.stringify(older));
    expect(loaded.politics).toEqual(initialPolitics());
    expect(aggregate(loaded)).toEqual(aggregate(game));
  });
});
