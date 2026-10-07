import { afterEach, describe, expect, it, vi } from "vitest";
import { basePlan, initialQuarter, resolveQuarter } from "./engine";
import {
  AUTOSAVE_KEY,
  DRAFT_KEY,
  clearQuarterPlan,
  loadQuarter,
  loadQuarterPlan,
  parseQuarter,
  quarterEnvelope,
  saveQuarter,
  saveQuarterPlan,
} from "./persistence";
import { POLICY_IDS, type QuarterGame, type QuarterPlan } from "./types";

const calm = { calm: true, attribution: false };
const encode = (game: QuarterGame) => JSON.stringify(quarterEnvelope(game));

function storage(initial: Record<string, unknown> = {}) {
  const values = new Map(Object.entries(structuredClone(initial)));
  const control = {
    abortNext: false,
    unavailable: false,
    writes: [] as string[][],
  };
  vi.stubGlobal("indexedDB", {
    open: () => {
      if (control.unavailable) throw new Error("Storage denied");
      const request = {} as { result: unknown; onsuccess: () => void };
      queueMicrotask(() => {
        request.result = {
          close: () => {},
          transaction: (_store: string, mode: string) => {
            const pending = new Map(values);
            const keys: string[] = [];
            let cancelled = false;
            const transaction = {
              oncomplete: () => {},
              onerror: () => {},
              onabort: () => {},
              abort: () => {
                cancelled = true;
              },
              objectStore: () => ({
                get: (key: string) => ({
                  result: structuredClone(values.get(key)),
                }),
                put: (value: unknown, key: string) => {
                  keys.push(`put:${key}`);
                  pending.set(key, structuredClone(value));
                },
                delete: (key: string) => {
                  keys.push(`delete:${key}`);
                  pending.delete(key);
                },
              }),
            };
            queueMicrotask(() => {
              if (cancelled || (mode === "readwrite" && control.abortNext)) {
                control.abortNext = false;
                transaction.onabort();
                return;
              }
              if (mode === "readwrite") {
                values.clear();
                pending.forEach((value, key) => values.set(key, value));
                control.writes.push(keys);
              }
              transaction.oncomplete();
            });
            return transaction;
          },
        };
        request.onsuccess();
      });
      return request;
    },
  });
  return { values, control };
}

afterEach(() => vi.unstubAllGlobals());

describe("version-8 economy saves", () => {
  it("round trips a fresh game and a full campaign without changing the next deterministic turn", () => {
    let game = initialQuarter(73);
    expect(parseQuarter(encode(game))).toEqual(game);
    for (let turn = 0; turn < 20; turn++) {
      const plan = basePlan(game);
      if (turn === 0) plan.policies = ["bos", "plts"];
      if (turn === 1) plan.policies.push("jkn", "kur");
      if (turn === 2) plan.policies.push("water", "bpn");
      if (turn === 3) plan.policies.push("food-reserves", "teachers");
      const loaded = parseQuarter(encode(game));
      const next = resolveQuarter(game, plan, calm);
      expect(resolveQuarter(loaded, plan, calm)).toEqual(next);
      game = next;
      expect(parseQuarter(encode(game))).toEqual(game);
    }
    expect(game.simulation.month).toBe(60);
  });

  it.each([4, 5, 6, 7, 9])(
    "rejects version %i without migrating it",
    (version) => {
      const raw = quarterEnvelope(initialQuarter());
      expect(() =>
        parseQuarter(JSON.stringify({ ...raw, schemaVersion: version })),
      ).toThrow(/version-8/);
      expect(() =>
        parseQuarter(
          JSON.stringify({ ...raw, state: { ...raw.state, version } }),
        ),
      ).toThrow(/version-8/);
    },
  );

  it.each([
    [
      "missing province",
      (game: QuarterGame) => {
        game.simulation.provinces.pop();
      },
    ],
    [
      "duplicate province",
      (game: QuarterGame) => {
        game.simulation.provinces[1] = structuredClone(
          game.simulation.provinces[0],
        );
      },
    ],
    [
      "unknown province",
      (game: QuarterGame) => {
        game.simulation.provinces[0].id = "99";
      },
    ],
    [
      "missing industry",
      (game: QuarterGame) => {
        delete (game.simulation.provinces[0].industries as any).fishing;
      },
    ],
    [
      "unmodeled industry",
      (game: QuarterGame) => {
        (game.simulation.provinces[0].industries as any).fiction =
          game.simulation.provinces[0].industries.fishing;
      },
    ],
    [
      "missing policy allocation",
      (game: QuarterGame) => {
        delete (game.regionalSpending as any).bos;
      },
    ],
    [
      "missing region allocation",
      (game: QuarterGame) => {
        delete (game.regionalSpending.bos as any).papua;
      },
    ],
    [
      "unknown allocation",
      (game: QuarterGame) => {
        (game.regionalSpending.bos as any).papua = "maximum";
      },
    ],
    [
      "non-finite amount",
      (game: QuarterGame) => {
        game.simulation.cash = NaN;
      },
    ],
    [
      "infinite stock",
      (game: QuarterGame) => {
        game.simulation.provinces[0].powerCapacity = Infinity;
      },
    ],
    [
      "negative balance",
      (game: QuarterGame) => {
        game.simulation.cash = -1;
      },
    ],
    [
      "out-of-range foundation",
      (game: QuarterGame) => {
        game.simulation.provinces[0].education = 101;
      },
    ],
    [
      "non-quarter date",
      (game: QuarterGame) => {
        game.simulation.month = 1;
      },
    ],
    [
      "past end of campaign",
      (game: QuarterGame) => {
        game.simulation.month = 63;
      },
    ],
    [
      "legacy allocation",
      (game: QuarterGame) => {
        (game as any).focusRegions = ["java"];
      },
    ],
    [
      "unreconciled GDP",
      (game: QuarterGame) => {
        game.simulation.provinces[0].gdp += 10;
      },
    ],
    [
      "too many workers",
      (game: QuarterGame) => {
        game.simulation.provinces[0].industries.fishing.jobs = 1e9;
      },
    ],
    [
      "missing history",
      (game: QuarterGame) => {
        game.simulation.history = [];
      },
    ],
    [
      "stale history",
      (game: QuarterGame) => {
        game.simulation.history[0].gdp += 10;
      },
    ],
    [
      "non-positive historical price index",
      (game: QuarterGame) => {
        game.simulation.history[0].priceIndex = 0;
      },
    ],
    [
      "historical price index inconsistent with current state",
      (game: QuarterGame) => {
        game.simulation.history[0].priceIndex += 0.1;
      },
    ],
    [
      "unreconciled ledger",
      (game: QuarterGame) => {
        game.simulation.ledger.revenue += 10;
      },
    ],
  ] as const)("rejects %s", (_name, mutate) => {
    const game = initialQuarter();
    mutate(game);
    expect(() => parseQuarter(encode(game))).toThrow();
  });

  it("rejects duplicate or oversized active portfolios and invalid runtime progress", () => {
    let game = initialQuarter(2);
    game = resolveQuarter(
      game,
      { ...basePlan(game), policies: ["bos", "jkn"] },
      calm,
    );
    const duplicate = structuredClone(game);
    duplicate.policies.push(structuredClone(duplicate.policies[0]));
    expect(() => parseQuarter(encode(duplicate))).toThrow(/portfolio/);
    const oversized = structuredClone(game);
    oversized.policies = POLICY_IDS.slice(0, 9).map((id) => ({
      ...structuredClone(game.policies[0]),
      id,
      active: true,
    }));
    expect(() => parseQuarter(encode(oversized))).toThrow(/portfolio/);
    const future = structuredClone(game);
    future.policies[0].fundedMonths = 4;
    expect(() => parseQuarter(encode(future))).toThrow(/progress/);
  });

  it("validates quarter reports, regional identities and fiscal reconciliation", () => {
    const initial = initialQuarter(7);
    const game = resolveQuarter(
      initial,
      { ...basePlan(initial), policies: ["bos", "plts"] },
      calm,
    );
    const missingReport = structuredClone(game);
    missingReport.receipt = null;
    expect(() => parseQuarter(encode(missingReport))).toThrow(/report/);
    const cash = structuredClone(game);
    cash.receipt!.ledger.cashChange += 10;
    expect(() => parseQuarter(encode(cash))).toThrow(/ledger/);
    const duplicate = structuredClone(game);
    duplicate.receipt!.regionsAfter[1].id =
      duplicate.receipt!.regionsAfter[0].id;
    expect(() => parseQuarter(encode(duplicate))).toThrow();
    const date = structuredClone(game);
    date.receipt!.after.month = 0;
    expect(() => parseQuarter(encode(date))).toThrow(/dates/);
  });

  it("rejects invalid JSON and oversized imports", () => {
    expect(() => parseQuarter("not json")).toThrow(/JSON/);
    expect(() => parseQuarter(" ".repeat(8_000_001))).toThrow(/8 MB/);
  });
});

describe("transactional economy autosaves and drafts", () => {
  it("repairs completion residue in old saves and preserves their draft", async () => {
    const opening = initialQuarter();
    const game = resolveQuarter(
      opening,
      {
        ...basePlan(opening),
        policies: ["broadband"],
      },
      calm,
    );
    const project = game.simulation.projects[0];
    project.progress = 99.99999999999999;
    project.spent = project.cost;
    project.completed = false;
    project.paused = true;
    game.simulation.projects[1].progress = 99.99;
    const plan = basePlan(game);
    storage({
      [AUTOSAVE_KEY]: quarterEnvelope(game),
      [DRAFT_KEY]: { identity: encode(game), plan },
    });
    const loaded = (await loadQuarter())!;
    expect(loaded.simulation.projects[0]).toMatchObject({
      progress: 100,
      completed: true,
      paused: false,
    });
    expect(loaded.simulation.projects[1]).toMatchObject({
      progress: 99.99,
      completed: false,
    });
    expect(await loadQuarterPlan(loaded)).toEqual(plan);
  });

  it("reads an empty new database without attempting to migrate old slots", async () => {
    storage({ "autosave-v6": { schemaVersion: 6 } });
    expect(await loadQuarter()).toBeNull();
    expect(await loadQuarterPlan(initialQuarter())).toBeNull();
  });

  it("saves the completed quarter and clears its draft in the same transaction", async () => {
    const { values, control } = storage();
    const game = initialQuarter(31);
    const plan = {
      ...basePlan(game),
      policies: ["bos", "plts"],
    } satisfies QuarterPlan;
    await saveQuarter(game);
    await saveQuarterPlan(game, plan);
    expect(await loadQuarterPlan(game)).toEqual(plan);
    const next = resolveQuarter(game, plan, calm);
    await saveQuarter(next);
    expect(await loadQuarter()).toEqual(next);
    expect(values.has(DRAFT_KEY)).toBe(false);
    expect(control.writes.at(-1)).toEqual([
      `put:${AUTOSAVE_KEY}`,
      `delete:${DRAFT_KEY}`,
    ]);
  });

  it("keeps the last completed save and recoverable draft when a commit aborts", async () => {
    const { values, control } = storage();
    const game = initialQuarter(31);
    const plan = { ...basePlan(game), policies: ["bos"] } satisfies QuarterPlan;
    await saveQuarter(game);
    await saveQuarterPlan(game, plan);
    const snapshot = structuredClone(values);
    control.abortNext = true;
    await expect(saveQuarter(resolveQuarter(game, plan, calm))).rejects.toThrow(
      /not saved/,
    );
    expect(values).toEqual(snapshot);
    expect(await loadQuarter()).toEqual(game);
    expect(await loadQuarterPlan(game)).toEqual(plan);
  });

  it("binds a draft to all completed campaign state, not just seed and turn", async () => {
    storage();
    const game = initialQuarter(31);
    const plan = basePlan(game);
    plan.policies = ["bos"];
    plan.regionalSpending.bos.java = "high";
    plan.regionalSpending.bos.papua = "low";
    await saveQuarterPlan(game, plan);
    expect(await loadQuarterPlan(structuredClone(game))).toEqual(plan);
    expect(await loadQuarterPlan(initialQuarter(32))).toBeNull();
    const otherCampaign = structuredClone(game);
    otherCampaign.taxes.vat = "relief";
    expect(await loadQuarterPlan(otherCampaign)).toBeNull();
    expect(await loadQuarterPlan(resolveQuarter(game, plan, calm))).toBeNull();
  });

  it("rejects invalid drafts before writing and rejects corrupt stored drafts", async () => {
    const { values } = storage();
    const game = initialQuarter(31);
    const plan = basePlan(game);
    plan.policies = ["bos", "jkn", "kur"];
    await expect(saveQuarterPlan(game, plan)).rejects.toThrow(/two policies/);
    expect(values.has(DRAFT_KEY)).toBe(false);
    plan.policies = ["bos"];
    await saveQuarterPlan(game, plan);
    const raw = values.get(DRAFT_KEY) as { plan: QuarterPlan };
    delete (raw.plan.regionalSpending.bos as any).java;
    await expect(loadQuarterPlan(game)).rejects.toThrow(/invalid/);
  });

  it("clears a reset draft without deleting the completed game", async () => {
    storage();
    const game = initialQuarter(31);
    await saveQuarter(game);
    await saveQuarterPlan(game, { ...basePlan(game), policies: ["bos"] });
    await clearQuarterPlan();
    expect(await loadQuarterPlan(game)).toBeNull();
    expect(await loadQuarter()).toEqual(game);
  });

  it("surfaces unavailable browser storage", async () => {
    const { control } = storage();
    control.unavailable = true;
    await expect(loadQuarter()).rejects.toThrow();
    await expect(saveQuarter(initialQuarter())).rejects.toThrow();
  });
});
