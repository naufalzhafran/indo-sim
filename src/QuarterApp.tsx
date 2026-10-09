import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  activeIds,
  launchCount,
  aggregate,
  basePlan,
  initialQuarter,
  validatePlan,
} from "./engine/economy/engine";
import { policyById } from "./engine/economy/catalog";
import { regionForProvince } from "./engine/gameRegions";
import {
  REGION_IDS,
  type PolicyId,
  type QuarterGame,
  type QuarterPlan,
  type RegionId,
} from "./engine/economy/types";
import {
  clearQuarterPlan,
  loadQuarter,
  loadQuarterDebrief,
  loadQuarterPlan,
  parseQuarter,
  quarterEnvelope,
  saveQuarter,
  saveQuarterDebrief,
  saveQuarterPlan,
} from "./engine/economy/persistence";
import { CampaignSetup } from "./CampaignSetup";
import { TAX_IDS } from "./engine/taxes";
import { LanguageSwitcher, translate, useLanguage } from "./i18n";
import { Icon, Modal, money, number } from "./components";
import { StatHelp } from "./StatHelp";
import WorldMap, { useReducedMotion } from "./WorldMap";
import {
  buildQuarterSummaryFromReceipt,
  buildQuarterVisualTransition,
  quarterTimeline,
  type QuarterVisualTransition,
} from "./quarterVisual";
import { type Overlay } from "./mapLayers";
import "./economy.css";
import "./economyApp.css";
import "./policyWorkspace.css";

// Panels and dialogs load on first use so the map becomes interactive sooner.
const PolicyWorkspace = lazy(() =>
  import("./PolicyWorkspace").then((m) => ({ default: m.PolicyWorkspace })),
);
const EconomyRegions = lazy(() =>
  import("./EconomyRegions").then((m) => ({ default: m.EconomyRegions })),
);
const NationalEconomy = lazy(() =>
  import("./NationalEconomy").then((m) => ({ default: m.NationalEconomy })),
);
const GameQuarterReport = lazy(() =>
  import("./GameQuarterReport").then((m) => ({ default: m.GameQuarterReport })),
);
const CampaignEnd = lazy(() =>
  import("./CampaignEnd").then((m) => ({ default: m.CampaignEnd })),
);
const QuarterRecap = lazy(() => import("./QuarterRecap"));

type View = "map" | "policies" | "regions" | "economy";
const copy = <T,>(value: T): T => structuredClone(value);
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const quarterName = (month: number) =>
  `Q${Math.floor((month % 12) / 3) + 1} ${2025 + Math.floor(month / 12)}`;
const download = (game: QuarterGame) => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(quarterEnvelope(game))], {
      type: "application/json",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `indonesia-economy-quarter-${game.simulation.month / 3}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export default function QuarterApp() {
  const language = useLanguage();
  const t = (en: string, id: string) => (language === "id" ? id : en);
  const [game, setGame] = useState<QuarterGame>(() => initialQuarter());
  const [plan, setPlan] = useState<QuarterPlan>(() => basePlan(game));
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [setup, setSetup] = useState(false);
  const [hasCampaign, setHasCampaign] = useState(false);
  const [endgame, setEndgame] = useState(false);
  const [view, setView] = useState<View>("map");
  const [policyTab, setPolicyTab] = useState<"policies" | "taxes">("policies");
  const [detail, setDetail] = useState<PolicyId | null>(null);
  const [selected, setSelected] = useState<RegionId>("java");
  const [regionList, setRegionList] = useState(true);
  const [layer, setLayer] = useState<Overlay>("landscape");
  const [mode, setMode] = useState<"3d" | "2d">("3d");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saving" | "saved" | "failed">(
    "saved",
  );
  const [preview, setPreview] = useState<QuarterGame | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [previewRetry, setPreviewRetry] = useState(0);
  const [undo, setUndo] = useState<QuarterPlan[]>([]);
  const [report, setReport] = useState(false);
  const [transition, setTransition] = useState<QuarterVisualTransition | null>(
    null,
  );
  const [lastRecap, setLastRecap] = useState<QuarterVisualTransition | null>(
    null,
  );
  const [startedAt, setStartedAt] = useState(0);
  const reducedMotion = useReducedMotion();
  const busyRef = useRef(false);
  const operation = useRef(0);
  const advanceWorker = useRef<Worker | null>(null);
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve());
  const saveRevision = useRef(0);
  const needsGameSave = useRef(true);
  const file = useRef<HTMLInputElement>(null);
  const reportButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const alert = useRef<HTMLParagraphElement>(null);
  const navOpener = useRef<HTMLElement | null>(null);
  const ended = game.simulation.month >= 60;
  const locked = busy || ended || loadFailed;
  const n = aggregate(game);
  const structures = useMemo(
    () =>
      game.policies.flatMap((runtime) => {
        // Builds and facilities follow their sites, so finished works stay on the map.
        if (policyById[runtime.id].kind !== "program")
          return game.simulation.projects
            .filter((project) => project.id.split(":")[0] === runtime.id)
            .map((project) => {
              const region = regionForProvince(project.province)!
                .id as RegionId;
              return {
                policy: runtime.id,
                region,
                level: game.regionalSpending[runtime.id][region],
                delivery: project.completed ? 1 : project.progress / 100,
              };
            });
        if (!runtime.active) return [];
        return REGION_IDS.map((region) => ({
          policy: runtime.id,
          region,
          level: game.regionalSpending[runtime.id][region],
          // Programs need no construction, so they never show a crane.
          delivery: 1,
        }));
      }),
    [game.policies, game.regionalSpending, game.simulation.projects],
  );
  const errors = validatePlan(game, plan);
  const launches = launchCount(game, plan);
  const dirty = !same(plan, basePlan(game));
  const taxChanges = TAX_IDS.filter(
    (id) => plan.taxes[id] !== game.taxes[id],
  ).length;
  const forecastLedger = preview?.receipt?.ledger;
  const forecastTaxes = forecastLedger
    ? Object.values(forecastLedger.taxes).reduce((a, b) => a + b, 0)
    : 0;
  const forecastPolicySpending = forecastLedger
    ? Object.values(forecastLedger.policySpending).reduce(
        (a, b) => a + (b ?? 0),
        0,
      )
    : 0;
  const forecastBalance = forecastLedger
    ? forecastLedger.revenue - forecastLedger.spending - forecastLedger.interest
    : 0;
  const finishRecap = useCallback(() => setTransition(null), []);
  const rendererReady = useCallback(
    () => setStartedAt((value) => value || performance.now()),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stored = await loadQuarter();
        if (cancelled) return;
        if (stored) {
          setHasCampaign(true);
          setEndgame(stored.simulation.month >= 60);
          needsGameSave.current = false;
          setGame(stored);
          setPlan(basePlan(stored));
          try {
            const draft = await loadQuarterPlan(stored);
            if (!cancelled && draft) setPlan(draft);
          } catch {
            if (!cancelled)
              setError(
                t(
                  "The saved draft could not be recovered. Your completed quarter is safe.",
                  "Rencana tersimpan tidak dapat dipulihkan. Triwulan yang selesai tetap aman.",
                ),
              );
          }
        } else setSetup(true);
      } catch {
        if (!cancelled) {
          setLoadFailed(true);
          setError(
            t(
              "The saved game could not be read. Import a new-model save or start a campaign.",
              "Simpanan tidak dapat dibaca. Impor simpanan model baru atau mulai permainan.",
            ),
          );
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
      advanceWorker.current?.terminate();
    };
  }, []);

  useEffect(() => {
    if (!ready || setup || busy || ended || loadFailed) return;
    const revision = ++saveRevision.current;
    setSaveStatus("saving");
    // Serialize captured drafts so an older write cannot overtake a newer one.
    const write = saveQueue.current
      .catch(() => {})
      .then(async () => {
        if (needsGameSave.current) {
          await saveQuarter(game);
          needsGameSave.current = false;
        }
        if (same(plan, basePlan(game))) await clearQuarterPlan();
        else await saveQuarterPlan(game, plan);
      });
    saveQueue.current = write;
    void write.then(
      () => {
        if (revision === saveRevision.current) setSaveStatus("saved");
      },
      () => {
        if (revision === saveRevision.current) setSaveStatus("failed");
      },
    );
  }, [game, plan, ready, setup, busy, ended, loadFailed]);

  useEffect(() => {
    setPreview(null);
    setPreviewError(false);
    if (!ready || setup || busy || ended || loadFailed || errors.length) return;
    let worker: Worker | undefined;
    let live = true;
    let timeout: ReturnType<typeof setTimeout>;
    const delay = setTimeout(() => {
      try {
        worker = new Worker(
          new URL("./engine/economy/worker.ts", import.meta.url),
          { type: "module" },
        );
        timeout = setTimeout(() => {
          worker?.terminate();
          if (live) setPreviewError(true);
        }, 20000);
        worker.onmessage = (e) => {
          clearTimeout(timeout);
          if (!live) return;
          if (e.data.error) setPreviewError(true);
          else setPreview(e.data.result);
          worker?.terminate();
        };
        worker.onerror = () => {
          clearTimeout(timeout);
          if (live) setPreviewError(true);
          worker?.terminate();
        };
        worker.postMessage({ game, plan, preview: true });
      } catch {
        setPreviewError(true);
      }
    }, 140);
    return () => {
      live = false;
      clearTimeout(delay);
      clearTimeout(timeout);
      worker?.terminate();
    };
  }, [game, plan, ready, setup, busy, ended, loadFailed, previewRetry]);

  useEffect(() => {
    if (view === "regions") panel.current?.focus({ preventScroll: true });
  }, [view]);
  useEffect(() => {
    if (error) alert.current?.scrollIntoView({ block: "nearest" });
  }, [error]);
  // Restore the saved opening for the report's decisions and island events.
  useEffect(() => {
    if (!ready) return;
    const receipt = game.receipt;
    if (!receipt) {
      setLastRecap(null);
      return;
    }
    if (lastRecap?.national === receipt) return;
    let cancelled = false;
    void loadQuarterDebrief(game)
      .catch(() => null)
      .then((before) => {
        if (cancelled) return;
        let recap: QuarterVisualTransition | null = null;
        try {
          if (before) recap = buildQuarterVisualTransition(before, game, layer);
        } catch {
          recap = null;
        }
        setLastRecap(recap ?? buildQuarterSummaryFromReceipt(game, layer));
      });
    return () => {
      cancelled = true;
    };
  }, [game, ready, lastRecap, layer]);
  const openRecap = (recap: QuarterVisualTransition) => {
    // Playback only starts after advancing; reduced motion shows final values.
    setStartedAt(
      performance.now() - (reducedMotion ? quarterTimeline(recap).total : 0),
    );
    setTransition(recap);
  };

  const openView = (next: View) => {
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    navOpener.current = opener?.closest(
      ".national-economy-dialog, .policy-workspace-dialog, .economy-dossier",
    )
      ? document.querySelector<HTMLElement>(
          '.q-nav button[aria-current="page"]',
        )
      : opener;
    finishRecap();
    if (next === "regions") setRegionList(true);
    setView(next);
  };
  const openRegion = (id: RegionId) => {
    setSelected(id);
    openView("regions");
    setRegionList(false);
  };
  const closePanel = () => {
    setView("map");
    requestAnimationFrame(
      () => navOpener.current?.isConnected && navOpener.current.focus(),
    );
  };
  const openPolicy = (id: PolicyId | null = null) => {
    setDetail(id);
    setPolicyTab("policies");
    openView("policies");
  };
  const changePlan = (next: QuarterPlan) => {
    if (locked) return;
    const issues = validatePlan(game, next);
    if (issues.length) {
      setError(issues.map((issue) => translate(issue)).join(" "));
      return;
    }
    if (same(plan, next)) return;
    setUndo((history) => [...history.slice(-49), copy(plan)]);
    setPlan(copy(next));
    setError("");
  };
  const persistGame = async (next: QuarterGame) => {
    ++saveRevision.current;
    needsGameSave.current = true;
    setSaveStatus("saving");
    const write = saveQueue.current
      .catch(() => {})
      .then(() => saveQuarter(next));
    saveQueue.current = write;
    try {
      await write;
      needsGameSave.current = false;
      setSaveStatus("saved");
      setError("");
    } catch {
      setSaveStatus("failed");
      setError(
        t(
          "Saving failed. Export this game before leaving, or retry saving.",
          "Penyimpanan gagal. Ekspor permainan sebelum keluar, atau coba simpan lagi.",
        ),
      );
    }
  };
  const retrySave = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await persistGame(game);
      if (!needsGameSave.current) {
        const write = saveQueue.current
          .catch(() => {})
          .then(() =>
            same(plan, basePlan(game))
              ? clearQuarterPlan()
              : saveQuarterPlan(game, plan),
          );
        saveQueue.current = write;
        await write;
        setSaveStatus("saved");
      }
    } catch {
      setSaveStatus("failed");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const replaceGame = async (
    next: QuarterGame,
    openingPolicies: PolicyId[] = [],
  ) => {
    operation.current++;
    advanceWorker.current?.terminate();
    advanceWorker.current = null;
    busyRef.current = true;
    setBusy(true);
    setLoadFailed(false);
    finishRecap();
    setLastRecap(null);
    setGame(next);
    const openingPlan = {
      ...basePlan(next),
      policies: openingPolicies.length
        ? openingPolicies
        : basePlan(next).policies,
    };
    setPlan(openingPlan);
    setHasCampaign(true);
    setEndgame(next.simulation.month >= 60);
    setUndo([]);
    setError("");
    setView("map");
    setDetail(null);
    setSetup(false);
    setReport(false);
    await persistGame(next);
    if (openingPolicies.length && !needsGameSave.current) {
      try {
        const write = saveQueue.current
          .catch(() => {})
          .then(() => saveQuarterPlan(next, openingPlan));
        saveQueue.current = write;
        await write;
      } catch {
        setSaveStatus("failed");
        setError(
          t(
            "Your campaign started, but the opening draft could not be saved. Retry saving before leaving.",
            "Permainan dimulai, tetapi rencana awal gagal disimpan. Coba simpan sebelum keluar.",
          ),
        );
      }
    }
    busyRef.current = false;
    setBusy(false);
  };
  const advance = () => {
    if (busyRef.current || ended || loadFailed || !ready || errors.length)
      return;
    const generation = ++operation.current;
    busyRef.current = true;
    setBusy(true);
    setError("");
    finishRecap();
    const fail = () => {
      if (generation !== operation.current) return;
      advanceWorker.current?.terminate();
      advanceWorker.current = null;
      busyRef.current = false;
      setBusy(false);
      setError(
        t(
          "The quarter could not be calculated. Your game and draft are unchanged. Please try again.",
          "Triwulan gagal dihitung. Permainan dan rencana Anda tetap tersimpan. Silakan coba lagi.",
        ),
      );
    };
    try {
      const worker = new Worker(
        new URL("./engine/economy/worker.ts", import.meta.url),
        { type: "module" },
      );
      advanceWorker.current = worker;
      const timeout = setTimeout(fail, 30000);
      worker.onerror = () => {
        clearTimeout(timeout);
        fail();
      };
      worker.onmessage = async (e) => {
        clearTimeout(timeout);
        if (
          generation !== operation.current ||
          advanceWorker.current !== worker
        )
          return;
        if (e.data.error) {
          fail();
          return;
        }
        const next: QuarterGame = e.data.result;
        worker.terminate();
        advanceWorker.current = null;
        const recap = buildQuarterVisualTransition(game, next, layer);
        setGame(next);
        setPlan(basePlan(next));
        setUndo([]);
        setLastRecap(recap);
        void saveQuarterDebrief(game, next).catch(() => undefined);
        setView("map");
        if (!reducedMotion && next.simulation.month < 60) openRecap(recap);
        if (next.simulation.month >= 60) setEndgame(true);
        await persistGame(next);
        busyRef.current = false;
        setBusy(false);
      };
      worker.postMessage({ game, plan });
    } catch {
      fail();
    }
  };

  return (
    <div className="quarter-app economy-app">
      <header className="q-header">
        <div className="q-brand">
          <span className="flag" aria-hidden="true" />
          <div>
            <strong>Indonesia</strong>
            <span>
              {t("Build shared prosperity", "Bangun kesejahteraan bersama")}
            </span>
          </div>
        </div>
        <div className="q-header-center">
          {ended
            ? t("Five years complete", "Lima tahun selesai")
            : `${quarterName(game.simulation.month)} · ${t("Turn", "Giliran")} ${game.simulation.month / 3 + 1}/20`}
        </div>
        <LanguageSwitcher />
        <button disabled={busy || !ready} onClick={() => setSetup(true)}>
          {t("New campaign", "Permainan baru")}
        </button>
      </header>
      <nav
        className="q-nav"
        aria-label={t("Game navigation", "Navigasi permainan")}
      >
        {(
          [
            ["economy", "Economy", "Ekonomi"],
            ["policies", "Policies & taxes", "Kebijakan & pajak"],
            ["regions", "Regions", "Wilayah"],
          ] as const
        ).map(([id, en, ind]) => (
          <button
            key={id}
            aria-current={view === id ? "page" : undefined}
            onClick={() => {
              if (id === "regions" && view === "regions") closePanel();
              else openView(id);
            }}
          >
            {t(en, ind)}
          </button>
        ))}
      </nav>
      <input
        ref={file}
        hidden
        type="file"
        accept=".json,application/json"
        aria-label={t("Import economy save", "Impor simpanan ekonomi")}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f || busyRef.current) return;
          busyRef.current = true;
          setBusy(true);
          try {
            const imported = parseQuarter(await f.text());
            await replaceGame(imported);
          } catch {
            setError(
              t(
                "This file is not a valid regional-economy save (version 7).",
                "Berkas ini bukan simpanan ekonomi wilayah yang valid (versi 7).",
              ),
            );
          } finally {
            busyRef.current = false;
            setBusy(false);
          }
        }}
      />
      <div className="q-layout q-world-layout">
        <section
          className="q-workspace"
          aria-label={t("Indonesia island world", "Dunia kepulauan Indonesia")}
        >
          <WorldMap
            provinces={game.simulation.provinces}
            projects={game.simulation.projects}
            crises={game.simulation.crises}
            structures={structures}
            selected={selected}
            onSelect={(id) => openRegion(id as RegionId)}
            onDismiss={() => view === "regions" && closePanel()}
            layer={layer}
            onLayer={setLayer}
            mode={mode}
            onMode={setMode}
            transition={transition}
            startedAt={startedAt}
            onFinish={finishRecap}
            onReady={rendererReady}
            inset={view === "regions" ? 710 : 0}
          />
          {view === "map" && !transition && (
            <section
              className="q-map-brief"
              aria-label={t("Quarter brief", "Catatan triwulan")}
            >
              {!plan.policies.length && (
                <button className="q-brief-issue" onClick={() => openPolicy()}>
                  {game.policies.length
                    ? t(
                        "No policies running: choose some",
                        "Belum ada kebijakan berjalan: pilih kebijakan",
                      )
                    : t(
                        "Choose your first policies",
                        "Pilih kebijakan pertama Anda",
                      )}
                </button>
              )}
              {forecastLedger && forecastLedger.funding < 0.99 && (
                <button
                  className="q-brief-issue"
                  onClick={() => openView("policies")}
                >
                  {t(
                    "Your plan has a funding shortfall",
                    "Rencana Anda kekurangan pendanaan",
                  )}
                </button>
              )}
              {!game.receipt && (
                <button
                  className="q-brief-report"
                  onClick={() => setReport(true)}
                >
                  {t("Campaign goals", "Target permainan")}
                </button>
              )}
              {game.receipt && n.energy < game.receipt.before.energy - 0.1 && (
                <button
                  className="q-brief-issue"
                  onClick={() => openPolicy("plts")}
                >
                  {t(
                    "Energy is falling: review power investment",
                    "Energi menurun: tinjau investasi listrik",
                  )}
                </button>
              )}
            </section>
          )}
          {transition && (
            <Suspense fallback={null}>
              <QuarterRecap
                transition={transition}
                startedAt={startedAt}
                quarter={quarterName(transition.from)}
                onFinish={finishRecap}
                onReport={() => {
                  reportButton.current?.focus({ preventScroll: true });
                  finishRecap();
                  setReport(true);
                }}
                onSeek={(elapsed) => setStartedAt(performance.now() - elapsed)}
                onRegion={(id) => openRegion(id as RegionId)}
              />
            </Suspense>
          )}
          <main
            ref={panel}
            tabIndex={-1}
            className="q-dossier economy-dossier"
            hidden={view !== "regions"}
            onKeyDown={(e) => {
              if (e.key === "Escape" && !e.defaultPrevented) {
                e.preventDefault();
                closePanel();
              }
            }}
          >
            <div className="q-dossier-top">
              <h1>
                {view === "policies"
                  ? t("Policies & taxes", "Kebijakan & pajak")
                  : view === "regions"
                    ? t("Regions", "Wilayah")
                    : t("Your economy", "Ekonomi Anda")}
              </h1>
              <div className="q-dossier-actions">
                {view === "regions" && !regionList && (
                  <button onClick={() => setRegionList(true)}>
                    {t("All regions", "Semua wilayah")}
                  </button>
                )}
                <button
                  type="button"
                  className="icon-button"
                  aria-label={t("Close regions", "Tutup wilayah")}
                  onClick={closePanel}
                >
                  <Icon name="close" />
                </button>
              </div>
            </div>
            <div className="economy-panel-fill" hidden={view !== "regions"}>
              <Suspense fallback={null}>
                <EconomyRegions
                  game={game}
                  plan={plan}
                  selected={selected}
                  onSelect={setSelected}
                  list={regionList}
                  onList={setRegionList}
                  onPolicy={openPolicy}
                />
              </Suspense>
            </div>
          </main>
        </section>
        <aside
          className="q-plan"
          aria-hidden={
            view === "policies" || view === "economy" ? true : undefined
          }
          aria-label={t("State finances", "Keuangan negara")}
        >
          <div className="q-plan-body">
            <h2>
              {ended
                ? t("Campaign complete", "Permainan selesai")
                : t("State finances", "Keuangan negara")}
            </h2>
            <dl className="q-stat-grid">
              <div>
                <dt>{t("Government debt", "Utang pemerintah")}</dt>
                <dd>{money(n.debt)}</dd>
                <small>
                  {number((n.debt / (n.gdp * n.priceIndex)) * 100, 1)}%{" "}
                  {t("of GDP", "dari PDB")}
                </small>
              </div>
              <div>
                <dt>{t("Treasury cash", "Kas negara")}</dt>
                <dd>{money(n.cash)}</dd>
              </div>
              <div>
                <dt>{t("Annual output", "Output tahunan")}</dt>
                <dd>{money(n.gdp * n.priceIndex)}</dd>
              </div>
              <div>
                <dt>{t("Last quarter balance", "Saldo triwulan lalu")}</dt>
                <dd data-tone={n.balance < 0 ? "warn" : "pass"}>
                  {n.balance < 0 ? "−" : "+"}
                  {money(Math.abs(n.balance))}
                </dd>
              </div>
              <div>
                <dt>{t("Unemployment", "Pengangguran")}</dt>
                <dd>{number(n.unemployment, 1)}%</dd>
              </div>
              <div>
                <dt>{t("Poverty", "Kemiskinan")}</dt>
                <dd>{number(n.poverty, 1)}%</dd>
              </div>
            </dl>
            {error && (
              <p ref={alert} className="q-warning" role="alert">
                {error}
              </p>
            )}
            {errors.length > 0 && !ended && (
              <p className="q-warning" role="alert">
                {errors.map((issue) => translate(issue)).join(" ")}
              </p>
            )}
          </div>
          <div className="q-plan-footer">
            {!ended && !loadFailed && (
              <div className="q-forecast" aria-live="polite">
                <h3>
                  <StatHelp
                    label={t(
                      "Next-quarter forecast",
                      "Prakiraan triwulan depan",
                    )}
                    description={t(
                      "Your combined policy and tax plan, before unexpected shocks. A negative balance is covered by treasury cash first, then new borrowing.",
                      "Gabungan rencana kebijakan dan pajak Anda, sebelum guncangan tak terduga. Saldo negatif ditutup dengan kas negara terlebih dahulu, lalu pinjaman baru.",
                    )}
                  />
                </h3>
                {forecastLedger ? (
                  <>
                    <table className="q-ledger">
                      <tbody>
                        <tr>
                          <th scope="row">
                            {t("Tax revenue", "Penerimaan pajak")}
                          </th>
                          <td>{money(forecastTaxes)}</td>
                        </tr>
                        <tr>
                          <th scope="row">
                            {t("Other revenue", "Penerimaan lain")}
                          </th>
                          <td>{money(forecastLedger.nonTaxRevenue)}</td>
                        </tr>
                        <tr>
                          <th scope="row">
                            {t("Policy spending", "Belanja kebijakan")}
                          </th>
                          <td>−{money(forecastPolicySpending)}</td>
                        </tr>
                        <tr>
                          <th scope="row">
                            {t("Other spending", "Belanja lainnya")}
                          </th>
                          <td>
                            −
                            {money(
                              Math.max(
                                0,
                                forecastLedger.spending -
                                  forecastPolicySpending,
                              ),
                            )}
                          </td>
                        </tr>
                        <tr>
                          <th scope="row">
                            {t("Debt interest", "Bunga utang")}
                          </th>
                          <td>−{money(forecastLedger.interest)}</td>
                        </tr>
                        <tr
                          className="q-ledger-total"
                          data-tone={forecastBalance < 0 ? "warn" : "pass"}
                        >
                          <th scope="row">{t("Balance", "Saldo")}</th>
                          <td>
                            {forecastBalance < 0 ? "−" : "+"}
                            {money(Math.abs(forecastBalance))}
                          </td>
                        </tr>
                        <tr>
                          <th scope="row">
                            {forecastLedger.repayment > 0
                              ? t("Debt repaid", "Pelunasan utang")
                              : t("New borrowing", "Pinjaman baru")}
                          </th>
                          <td>
                            {money(
                              forecastLedger.repayment > 0
                                ? forecastLedger.repayment
                                : forecastLedger.borrowing,
                            )}
                          </td>
                        </tr>
                        <tr
                          data-tone={
                            forecastLedger.funding < 0.99 ? "warn" : "pass"
                          }
                        >
                          <th scope="row">
                            {t("Funding delivered", "Pendanaan tersalur")}
                          </th>
                          <td>{number(forecastLedger.funding * 100, 0)}%</td>
                        </tr>
                      </tbody>
                    </table>
                  </>
                ) : (
                  <p className="q-note">
                    {previewError
                      ? t("Forecast unavailable.", "Prakiraan tidak tersedia.")
                      : t("Calculating your plan…", "Menghitung rencana…")}
                    {previewError && (
                      <button onClick={() => setPreviewRetry((v) => v + 1)}>
                        {t("Retry", "Coba lagi")}
                      </button>
                    )}
                  </p>
                )}
              </div>
            )}
            <div className="button-row">
              <button
                disabled={locked || !undo.length}
                onClick={() => {
                  setPlan(undo[undo.length - 1]);
                  setUndo(undo.slice(0, -1));
                }}
              >
                {t("Undo", "Urungkan")}
              </button>
              <button
                disabled={locked || !dirty}
                onClick={() => changePlan(basePlan(game))}
              >
                {t("Reset", "Atur ulang")}
              </button>
            </div>
            <div className="q-quarter-actions">
              <button
                ref={reportButton}
                data-testid="quarter-summary"
                aria-haspopup="dialog"
                disabled={!game.receipt || busy}
                onClick={() => {
                  finishRecap();
                  setReport(true);
                }}
              >
                {t("Report", "Laporan")}
              </button>
              {ended ? (
                <button
                  className="primary economy-advance"
                  onClick={() => setEndgame(true)}
                >
                  {t("Campaign results", "Hasil permainan")}
                </button>
              ) : (
                <button
                  data-testid="advance-quarter"
                  className="primary economy-advance"
                  disabled={
                    busy || !ready || setup || loadFailed || !!errors.length
                  }
                  onClick={advance}
                >
                  {busy
                    ? t("Resolving quarter…", "Memproses triwulan…")
                    : t("Advance quarter", "Lanjut triwulan")}
                </button>
              )}
            </div>
            <p className="q-save" data-testid="plan-save-status" role="status">
              {loadFailed
                ? t("Saved game needs recovery", "Simpanan perlu dipulihkan")
                : saveStatus === "saving"
                  ? t("Saving draft…", "Menyimpan rencana…")
                  : saveStatus === "failed"
                    ? t("Save failed", "Gagal menyimpan")
                    : dirty
                      ? t("Draft saved", "Rencana tersimpan")
                      : t("Game saved", "Permainan tersimpan")}
              {saveStatus === "failed" && (
                <button disabled={busy} onClick={() => void retrySave()}>
                  {t("Retry save", "Coba simpan")}
                </button>
              )}
            </p>
          </div>
        </aside>
      </div>
      {!ready && (
        <Modal
          title={t("Loading your economy…", "Memuat ekonomi Anda…")}
          onClose={() => {}}
          dismissible={false}
          className="economy-dialog"
        >
          <p role="status">
            {t(
              "Recovering your campaign and saved draft…",
              "Memulihkan permainan dan rencana tersimpan…",
            )}
          </p>
        </Modal>
      )}
      {ready && view === "economy" && !setup && (
        <Modal
          title={t("National economy", "Ekonomi nasional")}
          onClose={closePanel}
          className="economy-dialog national-economy-dialog"
          trapFocus
        >
          {loadFailed ? (
            <p role="status">
              {t(
                "National statistics could not be loaded. Import a valid save or start a new campaign.",
                "Statistik nasional tidak dapat dimuat. Impor simpanan yang valid atau mulai permainan baru.",
              )}
            </p>
          ) : (
            <Suspense fallback={null}>
              <NationalEconomy
                game={game}
                plan={plan}
                onPolicies={(id) => openPolicy(id ?? null)}
              />
            </Suspense>
          )}
        </Modal>
      )}
      {ready && view === "policies" && !setup && (
        <Modal
          title={t("Policies & taxes", "Kebijakan & pajak")}
          onClose={closePanel}
          className="economy-dialog policy-workspace-dialog"
          trapFocus
        >
          {loadFailed ? (
            <p role="alert">
              {t(
                "Your campaign could not be loaded. Import a valid save or start a new campaign.",
                "Permainan tidak dapat dimuat. Impor simpanan yang valid atau mulai permainan baru.",
              )}
            </p>
          ) : (
            <Suspense fallback={null}>
              <PolicyWorkspace
                game={game}
                plan={plan}
                onChange={changePlan}
                disabled={locked}
                detail={detail}
                onDetail={setDetail}
                tab={policyTab}
                onTab={setPolicyTab}
                preview={preview}
                previewError={previewError}
                onRetry={() => setPreviewRetry((value) => value + 1)}
                onUndo={() => {
                  setPlan(undo[undo.length - 1]);
                  setUndo(undo.slice(0, -1));
                }}
                onReset={() => changePlan(basePlan(game))}
                canUndo={!!undo.length}
                dirty={dirty}
                saveStatus={saveStatus}
                onRetrySave={() => void retrySave()}
                onClose={closePanel}
              />
            </Suspense>
          )}
        </Modal>
      )}
      {ready && setup && (
        <CampaignSetup
          canCancel={hasCampaign || loadFailed}
          busy={busy}
          error={error}
          onCancel={() => setSetup(false)}
          onImport={() => file.current?.click()}
          onStart={(campaignSeed, policies) =>
            void replaceGame(initialQuarter(campaignSeed), policies)
          }
        />
      )}
      {ready && ended && endgame && !setup && (
        <Suspense fallback={null}>
          <CampaignEnd
            game={game}
            busy={busy}
            error={saveStatus === "failed" ? error : ""}
            onClose={() => setEndgame(false)}
            onReport={() => {
              setEndgame(false);
              setReport(true);
            }}
            onExport={() => download(game)}
            onNew={() => {
              setReport(false);
              setSetup(true);
            }}
            onRetrySave={() => void retrySave()}
          />
        </Suspense>
      )}
      {report && (
        <Modal
          title={
            ended
              ? t(
                  "Five-year development report",
                  "Laporan pembangunan lima tahun",
                )
              : t("Quarter report", "Laporan triwulan")
          }
          onClose={() => setReport(false)}
          className="economy-dialog economy-report national-economy-dialog"
          trapFocus
        >
          <Suspense fallback={null}>
            <GameQuarterReport
              game={game}
              recap={lastRecap}
              onClose={() => setReport(false)}
              onRegion={(id) => {
                setReport(false);
                openRegion(id);
                navOpener.current = reportButton.current;
              }}
            />
          </Suspense>
        </Modal>
      )}
    </div>
  );
}
