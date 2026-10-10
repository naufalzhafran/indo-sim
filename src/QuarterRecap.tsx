import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { money, number } from "./components";
import { translate, useLanguage } from "./i18n";
import { StatHelp } from "./StatHelp";
import { useReducedMotion } from "./WorldMap";
import { foundationNames } from "./engine/economy/catalog";
import { taxDefinitions } from "./engine/taxes";
import { FOUNDATIONS, type Foundation } from "./engine/economy/types";
import {
  getQuarterPlayback,
  policyName,
  quarterTimeline,
  QUARTER_ACTS,
  smooth,
  type QuarterAct,
  type QuarterVisualTransition,
  type RegionResult,
  type VisualCallout,
} from "./quarterVisual";

export const recapLabels: Record<string, string> = {
  "Construction completed": "Pembangunan selesai",
  "Construction started": "Pembangunan dimulai",
  "Construction advanced": "Pembangunan bertambah",
  "Construction paused": "Pembangunan dijeda",
  "Construction resumed": "Pembangunan dilanjutkan",
  "Crisis resolved": "Krisis teratasi",
  "Crisis recovery": "Pemulihan krisis",
  "Crisis warning": "Peringatan krisis",
  "Active crisis": "Krisis aktif",
  "Crisis damage reduced": "Dampak krisis berkurang",
  "Crisis damage increased": "Dampak krisis bertambah",
  Warning: "Peringatan",
  Active: "Aktif",
  Recovery: "Pemulihan",
  Resolved: "Teratasi",
};

/** What each kind of event means for the player, in one short line. */
export const recapConsequences: Record<
  VisualCallout["event"],
  [string, string]
> = {
  "project-completed": [
    "New capacity now serves the region",
    "Kapasitas baru kini melayani wilayah",
  ],
  "project-started": [
    "Benefits arrive when construction finishes",
    "Manfaat datang setelah pembangunan selesai",
  ],
  "project-advanced": [
    "Benefits arrive when construction finishes",
    "Manfaat datang setelah pembangunan selesai",
  ],
  "project-paused": [
    "Restore funding to resume work",
    "Pulihkan pendanaan untuk melanjutkan",
  ],
  "project-resumed": ["Work is moving again", "Pekerjaan kembali berjalan"],
  "crisis-resolved": [
    "Local services are back to normal",
    "Layanan daerah kembali normal",
  ],
  "crisis-recovery": [
    "Damage is easing; recovery continues",
    "Kerusakan mereda; pemulihan berlanjut",
  ],
  "crisis-warning": [
    "Risk is building in this region",
    "Risiko meningkat di wilayah ini",
  ],
  "crisis-active": [
    "Slows local services and output",
    "Memperlambat layanan dan hasil daerah",
  ],
  "crisis-improved": [
    "Damage is easing; recovery continues",
    "Kerusakan mereda; pemulihan berlanjut",
  ],
  "crisis-worsened": [
    "Slows local services and output",
    "Memperlambat layanan dan hasil daerah",
  ],
  "province-changed": ["", ""],
};

const actNames: Record<QuarterAct, [string, string]> = {
  events: ["What happened", "Yang terjadi"],
  impact: ["National impact", "Dampak nasional"],
  regions: ["Regions", "Wilayah"],
};

const verdictNames = {
  improving: ["Improving", "Membaik"],
  mixed: ["Mixed", "Campuran"],
  slipping: ["Slipping", "Menurun"],
} as const;

const tone = (value: number, threshold = 0.005, lowerIsBetter = false) =>
  Math.abs(value) < threshold
    ? "neutral"
    : value > 0 !== lowerIsBetter
      ? "positive"
      : "negative";

export default function QuarterRecap({
  transition,
  startedAt,
  quarter,
  onFinish,
  onReport,
  onSeek,
  onRegion,
}: {
  transition: QuarterVisualTransition;
  startedAt: number;
  quarter: string;
  onFinish: () => void;
  onReport: () => void;
  /** Restart playback from this point on the timeline. */
  onSeek: (elapsedMs: number) => void;
  onRegion: (region: string) => void;
}) {
  const language = useLanguage();
  const t = (en: string, id: string) => (language === "id" ? id : en);
  const pick = (pair: readonly [string, string]) =>
    pair[language === "id" ? 1 : 0];
  const text = (value: string) =>
    language === "id" ? (recapLabels[value] ?? translate(value)) : value;
  const reducedMotion = useReducedMotion();
  const id = useId();
  const [elapsed, setElapsed] = useState(0);
  const [pinnedAct, setPinnedAct] = useState<QuarterAct | null>(null);
  const [spot, setSpot] = useState<string | null>(null);
  const recap = useRef<HTMLElement>(null);
  const skip = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const { acts, total } = quarterTimeline(transition);

  useEffect(() => {
    recap.current?.scrollIntoView({
      block: "end",
      inline: "nearest",
      behavior: "instant",
    });
    (skip.current ?? close.current)?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    setPinnedAct(null);
    setSpot(null);
  }, [transition]);
  useEffect(() => {
    if (!startedAt) {
      setElapsed(0);
      return;
    }
    if (reducedMotion) {
      setElapsed(total);
      return;
    }
    let frame = 0;
    const tick = () => {
      const now = Math.max(0, performance.now() - startedAt);
      setElapsed(now);
      if (now < total) frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [startedAt, transition, total, reducedMotion]);

  const playback = getQuarterPlayback(
    startedAt ? (reducedMotion ? total : elapsed) : 0,
    transition,
  );
  const done = playback.done;
  const shown: QuarterAct = done ? (pinnedAct ?? "regions") : playback.act;
  const order = QUARTER_ACTS.indexOf(playback.act);
  const actFill = (act: QuarterAct) =>
    done || QUARTER_ACTS.indexOf(act) < order
      ? 1
      : act === playback.act
        ? playback.actProgress
        : 0;
  /** Numbers count up during the first part of their act. */
  const reveal = (act: QuarterAct) =>
    done || QUARTER_ACTS.indexOf(act) < order
      ? 1
      : act === playback.act
        ? smooth(playback.actProgress / 0.55)
        : 0;

  const choose = (act: QuarterAct) => {
    if (done) setPinnedAct(act);
    else onSeek(acts[act].start);
  };
  const finishPlayback = (act: QuarterAct) => {
    setPinnedAct(act);
    onSeek(total);
    requestAnimationFrame(() => close.current?.focus({ preventScroll: true }));
  };
  const tabKeys = (event: KeyboardEvent, index: number) => {
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % QUARTER_ACTS.length
        : event.key === "ArrowLeft"
          ? (index + QUARTER_ACTS.length - 1) % QUARTER_ACTS.length
          : -1;
    if (next < 0) return;
    event.preventDefault();
    choose(QUARTER_ACTS[next]);
    tabs.current[next]?.focus();
  };

  const signed = (value: number, digits = 1) =>
    `${value > 0 ? "+" : ""}${number(value, digits)}`;
  const place = (region: { name: string; nameId?: string }) =>
    language === "id" ? (region.nameId ?? region.name) : region.name;

  const receipt = transition.national;
  const receiptEvents = (receipt?.events ?? [])
    .filter((event) => event.kind === "crisis" || event.kind === "project")
    .slice(0, 2);
  const tourStep = playback.act === "regions" && !done ? playback.step : -1;
  const attention = transition.regions.find((r) => r.tag === "attention");
  const spotlight: RegionResult | undefined =
    tourStep >= 0
      ? transition.regions[tourStep]
      : (transition.regions.find((r) => r.id === spot) ??
        attention ??
        transition.regions.find((r) => r.tag === "best") ??
        transition.regions[0]);

  const status = !startedAt
    ? t("Preparing the quarter summary…", "Menyiapkan ringkasan triwulan…")
    : done
      ? t(
          "Summary complete. Choose a tab to review.",
          "Ringkasan selesai. Pilih tab untuk meninjau.",
        )
      : playback.act === "events" && playback.step >= 0
        ? `${pick(actNames.events)} ${playback.step + 1}/${transition.callouts.length}`
        : playback.act === "regions" && spotlight
          ? `${pick(actNames.regions)} · ${place(spotlight)}`
          : pick(actNames[playback.act]);

  return (
    <section
      ref={recap}
      className="q-recap"
      aria-label={t("Quarter summary", "Ringkasan triwulan")}
      data-act={shown}
      data-done={done || undefined}
      data-partial={transition.partial || undefined}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.defaultPrevented) {
          event.preventDefault();
          onFinish();
        }
      }}
    >
      <div className="q-recap-heading">
        <div className="q-recap-title">
          <span className="q-kicker">{quarter}</span>
          <h2>{t("Quarter summary", "Ringkasan triwulan")}</h2>
        </div>
        <div
          className="q-recap-tabs"
          role="tablist"
          aria-label={t("Summary sections", "Bagian ringkasan")}
        >
          {QUARTER_ACTS.map((act, index) => (
            <button
              key={act}
              ref={(node) => {
                tabs.current[index] = node;
              }}
              role="tab"
              id={`${id}-${act}-tab`}
              aria-controls={`${id}-panel`}
              aria-selected={shown === act}
              tabIndex={shown === act ? 0 : -1}
              onClick={() => choose(act)}
              onKeyDown={(event) => tabKeys(event, index)}
            >
              <span className="q-recap-tab-number" aria-hidden="true">
                {index + 1}
              </span>
              {pick(actNames[act])}
              <span className="q-recap-tab-fill" aria-hidden="true">
                <span style={{ transform: `scaleX(${actFill(act)})` }} />
              </span>
            </button>
          ))}
        </div>
        <div className="q-recap-actions">
          {receipt && (
            <button onClick={onReport}>
              {t("Read report", "Baca laporan")}
            </button>
          )}
          {!done && (
            <button ref={skip} onClick={() => finishPlayback("impact")}>
              {t("Skip animation", "Lewati animasi")}
            </button>
          )}
          <button ref={close} className="q-recap-continue" onClick={onFinish}>
            {t("Continue", "Lanjutkan")}
          </button>
        </div>
      </div>
      <span
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {status}
      </span>
      <div
        className="sr-only"
        role="progressbar"
        aria-label={t("Summary progress", "Progres ringkasan")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(playback.progress * 100)}
      />
      <div
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-${shown}-tab`}
        className="q-recap-stage"
      >
        {shown === "events" && (
          <div className="q-debrief-events">
            {transition.callouts.length ? (
              <ol
                className="q-recap-callouts"
                style={{
                  gridTemplateColumns: `repeat(${transition.callouts.length}, minmax(0, 340px))`,
                }}
              >
                {transition.callouts.map((callout, index) => (
                  <li
                    key={callout.province}
                    className="q-recap-step"
                    aria-current={
                      !done &&
                      playback.act === "events" &&
                      playback.step === index
                        ? "step"
                        : undefined
                    }
                    data-direction={callout.direction}
                  >
                    <span className="q-recap-number" aria-hidden="true">
                      {index + 1}
                    </span>
                    <div>
                      <strong>{place(callout)}</strong>
                      <span className="q-recap-event-label">
                        {text(callout.label)}
                        {callout.detail && (
                          <span className="q-recap-detail">
                            {" · "}
                            {translate(callout.detail)}
                          </span>
                        )}
                      </span>
                      {callout.before !== undefined &&
                      callout.after !== undefined ? (
                        <span className="q-recap-values">
                          {number(callout.before, callout.unit === "%" ? 0 : 2)}
                          {callout.unit}
                          <span aria-hidden="true"> → </span>
                          <span className="sr-only">
                            {t(" to ", " menjadi ")}
                          </span>
                          <b>
                            {number(
                              callout.after,
                              callout.unit === "%" ? 0 : 2,
                            )}
                            {callout.unit}
                          </b>
                        </span>
                      ) : callout.beforeState && callout.afterState ? (
                        <span className="q-recap-values">
                          {text(callout.beforeState)}
                          <span aria-hidden="true"> → </span>
                          <span className="sr-only">
                            {t(" to ", " menjadi ")}
                          </span>
                          <b>{text(callout.afterState)}</b>
                        </span>
                      ) : callout.kind === "crisis" ? (
                        <span className="q-recap-values">
                          <b>{t("New this quarter", "Baru triwulan ini")}</b>
                        </span>
                      ) : null}
                      <span className="q-recap-meaning">
                        {pick(recapConsequences[callout.event])}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="q-recap-quiet">
                {transition.partial ? (
                  <>
                    <strong>{t("Quarter events", "Peristiwa triwulan")}</strong>
                    {receiptEvents.length ? (
                      receiptEvents.map((event, index) => (
                        <span key={index}>{event.detail[language]}</span>
                      ))
                    ) : (
                      <span>
                        {t(
                          "No disruptions were recorded this quarter.",
                          "Tidak ada gangguan yang tercatat triwulan ini.",
                        )}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <strong>
                      {t("A calm quarter", "Triwulan yang tenang")}
                    </strong>
                    <span>
                      {t(
                        "No disruptions or construction milestones on the islands.",
                        "Tidak ada gangguan atau tonggak pembangunan di kepulauan.",
                      )}
                    </span>
                  </>
                )}
              </div>
            )}
            <aside className="q-debrief-news">
              <h3>{t("Across the nation", "Di seluruh negeri")}</h3>
              {transition.news.length ? (
                <ul>
                  {transition.news.map((item) => (
                    <li key={item.id} data-direction={item.direction}>
                      {item.title[language]}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>
                  {t(
                    "Programmes were fully funded and industries held steady.",
                    "Program didanai penuh dan industri tetap stabil.",
                  )}
                </p>
              )}
            </aside>
          </div>
        )}
        {shown === "impact" &&
          (receipt ? (
            <ImpactAct
              transition={transition}
              reveal={reveal("impact")}
              t={t}
              signed={signed}
            />
          ) : (
            <p className="q-note">
              {t(
                "Services continued. Full results are in your report.",
                "Layanan berlanjut. Hasil lengkap tersedia dalam laporan.",
              )}
            </p>
          ))}
        {shown === "regions" && spotlight && (
          <div className="q-debrief-regions">
            <article
              className="q-region-spot"
              data-verdict={spotlight.verdict}
              aria-live={tourStep >= 0 ? "off" : "polite"}
            >
              <div className="q-region-spot-head">
                <h3>{place(spotlight)}</h3>
                <span className="q-verdict" data-verdict={spotlight.verdict}>
                  <Verdict verdict={spotlight.verdict} />
                  {pick(verdictNames[spotlight.verdict])}
                </span>
                {spotlight.tag && (
                  <span className="q-region-tag" data-tag={spotlight.tag}>
                    {spotlight.tag === "best"
                      ? t("Strongest quarter", "Triwulan terkuat")
                      : t("Needs attention", "Perlu perhatian")}
                  </span>
                )}
                <button
                  className="q-region-open"
                  onClick={() => onRegion(spotlight.id)}
                >
                  {t("Open region", "Buka wilayah")}
                </button>
              </div>
              <dl className="q-region-stats">
                <div>
                  <dt>{t("Output", "Output")}</dt>
                  <dd data-tone={tone(spotlight.gdpChange, 0.01)}>
                    {signed(spotlight.gdpChange, 2)}%
                  </dd>
                </div>
                <div>
                  <dt>{t("Poverty", "Kemiskinan")}</dt>
                  <dd data-tone={tone(spotlight.poverty, 0.005, true)}>
                    {number(spotlight.after.poverty, 1)}%{" "}
                    <small>({signed(spotlight.poverty, 2)})</small>
                  </dd>
                </div>
                <div>
                  <dt>{t("Unemployment", "Pengangguran")}</dt>
                  <dd data-tone={tone(spotlight.unemployment, 0.005, true)}>
                    {number(spotlight.after.unemployment, 1)}%{" "}
                    <small>({signed(spotlight.unemployment, 2)})</small>
                  </dd>
                </div>
                <div>
                  <dt>{t("Programme spending", "Belanja program")}</dt>
                  <dd>{money(spotlight.spending)}</dd>
                </div>
              </dl>
              <ul
                className="q-region-foundations"
                aria-label={t("Foundation changes", "Perubahan fondasi")}
              >
                {FOUNDATIONS.map((f) => (
                  <li key={f} data-tone={tone(spotlight.foundations[f], 0.01)}>
                    {foundationNames[f][language]}{" "}
                    <b>{signed(spotlight.foundations[f], 2)}</b>
                  </li>
                ))}
              </ul>
              <p className="q-region-programmes">
                {spotlight.programmes.length
                  ? `${t("Main programmes", "Program utama")}: ${spotlight.programmes.map(policyName).join(", ")}`
                  : t(
                      "No programme spending reached this region.",
                      "Tidak ada belanja program yang mencapai wilayah ini.",
                    )}
              </p>
            </article>
            <ul
              className="q-region-chips"
              aria-label={t("All regions", "Semua wilayah")}
            >
              {transition.regions.map((region, index) => (
                <li key={region.id}>
                  <button
                    aria-pressed={spotlight.id === region.id}
                    data-pending={
                      tourStep >= 0 && index > tourStep ? true : undefined
                    }
                    data-verdict={region.verdict}
                    onClick={() => {
                      setSpot(region.id);
                      if (!done) finishPlayback("regions");
                    }}
                  >
                    <Verdict verdict={region.verdict} />
                    <span className="q-region-chip-name">{place(region)}</span>
                    <span
                      className="q-region-chip-value"
                      data-tone={tone(region.gdpChange, 0.01)}
                    >
                      {signed(region.gdpChange, 1)}%
                    </span>
                    {region.tag && (
                      <span className="sr-only">
                        {region.tag === "best"
                          ? t(", strongest quarter", ", triwulan terkuat")
                          : t(", needs attention", ", perlu perhatian")}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function Verdict({ verdict }: { verdict: RegionResult["verdict"] }) {
  return (
    <svg
      className="q-verdict-icon"
      data-verdict={verdict}
      viewBox="0 0 12 12"
      aria-hidden="true"
    >
      {verdict === "improving" ? (
        <path d="M6 2 11 10H1Z" />
      ) : verdict === "slipping" ? (
        <path d="M6 10 1 2h10Z" />
      ) : (
        <rect x="1.5" y="4.5" width="9" height="3" rx="1.5" />
      )}
    </svg>
  );
}

function ImpactAct({
  transition,
  reveal,
  t,
  signed,
}: {
  transition: QuarterVisualTransition;
  reveal: number;
  t: (en: string, id: string) => string;
  signed: (value: number, digits?: number) => string;
}) {
  const language = useLanguage();
  const receipt = transition.national!;
  const { before, after } = receipt;
  const plan = receipt.effects?.decisions,
    ongoing = receipt.effects?.world;
  const counted = (from: number, to: number) => from + (to - from) * reveal;
  const decisions = transition.decisions;
  const foundationName = (f: Foundation) => foundationNames[f][language];

  const best = plan
    ? [...FOUNDATIONS].sort((a, b) => (plan[b] ?? 0) - (plan[a] ?? 0))[0]
    : undefined;
  const bestValue = best && plan ? (plan[best] ?? 0) : 0;
  const votes = transition.politics?.votes ?? [];
  const changed =
    votes.length +
      decisions.launched.length +
      decisions.ended.length +
      Number(decisions.taxesChanged) +
      Number(decisions.allocationChanged) >
    0;
  const headline =
    best && bestValue >= 0.02
      ? t(
          `Your decisions lifted ${foundationName(best)} the most (${signed(bestValue, 2)}).`,
          `Keputusan Anda paling banyak menaikkan ${foundationName(best).toLowerCase()} (${signed(bestValue, 2)}).`,
        )
      : changed
        ? t(
            "Your changes are still rolling out. Most of their effect arrives in later quarters.",
            "Perubahan Anda masih berjalan. Sebagian besar dampaknya tiba pada triwulan berikutnya.",
          )
        : transition.partial
          ? t(
              "Most change came from ongoing programmes and conditions.",
              "Sebagian besar perubahan berasal dari program berjalan dan kondisi.",
            )
          : t(
              "No new decisions this quarter. Change came from ongoing programmes and conditions.",
              "Tidak ada keputusan baru triwulan ini. Perubahan berasal dari program berjalan dan kondisi.",
            );
  const slipping = [...FOUNDATIONS]
    .map((f) => ({ f, change: after[f] - before[f] }))
    .sort((a, b) => a.change - b.change)[0];
  const watch =
    after.poverty - before.poverty >= 0.05
      ? t(
          `Watch poverty: ${signed(after.poverty - before.poverty, 2)} pp.`,
          `Perhatikan kemiskinan: ${signed(after.poverty - before.poverty, 2)} poin.`,
        )
      : after.unemployment - before.unemployment >= 0.05
        ? t(
            `Watch unemployment: ${signed(after.unemployment - before.unemployment, 2)} pp.`,
            `Perhatikan pengangguran: ${signed(after.unemployment - before.unemployment, 2)} poin.`,
          )
        : slipping.change < -0.02
          ? t(
              `Watch ${foundationName(slipping.f).toLowerCase()}: ${signed(slipping.change, 2)}.`,
              `Perhatikan ${foundationName(slipping.f).toLowerCase()}: ${signed(slipping.change, 2)}.`,
            )
          : "";

  const outcomes = [
    {
      key: "gdp",
      label: t("Output (GDP)", "Output (PDB)"),
      value: `Rp ${number(counted(before.gdp, after.gdp), 0)}T`,
      change: (after.gdp / before.gdp - 1) * 100,
      planChange: plan ? ((plan.gdp ?? 0) / before.gdp) * 100 : undefined,
      unit: "%",
      digits: 2,
      threshold: 0.01,
      lowerIsBetter: false,
    },
    {
      key: "poverty",
      label: t("Poverty", "Kemiskinan"),
      value: `${number(counted(before.poverty, after.poverty), 2)}%`,
      change: after.poverty - before.poverty,
      planChange: plan?.poverty,
      unit: t(" pp", " poin"),
      digits: 2,
      threshold: 0.005,
      lowerIsBetter: true,
    },
    {
      key: "unemployment",
      label: t("Unemployment", "Pengangguran"),
      value: `${number(counted(before.unemployment, after.unemployment), 2)}%`,
      change: after.unemployment - before.unemployment,
      planChange: plan?.unemployment,
      unit: t(" pp", " poin"),
      digits: 2,
      threshold: 0.005,
      lowerIsBetter: true,
    },
    {
      key: "balance",
      label: t("Quarter budget balance", "Saldo anggaran triwulan"),
      value: money(counted(before.balance, after.balance)),
      change: after.balance - before.balance,
      planChange: plan?.balance,
      unit: "T",
      digits: 1,
      threshold: 0.05,
      lowerIsBetter: false,
    },
  ];
  const scale = Math.max(
    0.25,
    ...FOUNDATIONS.map(
      (f) => Math.abs(plan?.[f] ?? 0) + Math.abs(ongoing?.[f] ?? 0),
    ),
  );
  /** Two stacked segments that grow out from the centre line. */
  const segments = (planValue: number, ongoingValue: number) => {
    const width = (value: number) => (Math.abs(value) / scale) * 50 * reveal;
    let right = 50,
      left = 50;
    return [
      { kind: "plan", value: planValue },
      { kind: "ongoing", value: ongoingValue },
    ].map(({ kind, value }) => {
      const size = width(value);
      const start = value >= 0 ? right : left - size;
      if (value >= 0) right += size;
      else left -= size;
      return { kind, start, size, negative: value < 0 };
    });
  };

  return (
    <div className="q-debrief-impact">
      <div className="q-impact-summary">
        <p className="q-impact-headline">
          {headline}
          {watch && <span> {watch}</span>}
        </p>
        <p className="q-impact-decisions">
          <span>{t("Your decisions", "Keputusan Anda")}:</span>{" "}
          {changed ? (
            <>
              {decisions.launched.map((id) => (
                <span key={id} className="q-decision-chip" data-kind="launch">
                  {t("Launched", "Diluncurkan")} {policyName(id)}
                </span>
              ))}
              {decisions.ended.map((id) => (
                <span key={id} className="q-decision-chip" data-kind="end">
                  {t("Ended", "Dihentikan")} {policyName(id)}
                </span>
              ))}
              {decisions.taxesChanged && (
                <span className="q-decision-chip">
                  {t("Taxes adjusted", "Pajak disesuaikan")}
                </span>
              )}
              {decisions.allocationChanged && (
                <span className="q-decision-chip">
                  {t("Regional budgets shifted", "Anggaran wilayah digeser")}
                </span>
              )}
              {votes.map((vote) => (
                <span
                  key={vote.tax}
                  className="q-decision-chip"
                  data-kind={vote.passed ? "launch" : "end"}
                >
                  {vote.passed
                    ? t("DPR passed", "DPR menyetujui")
                    : t("DPR rejected", "DPR menolak")}{" "}
                  {
                    taxDefinitions.find((d) => d.id === vote.tax)!.name[
                      language
                    ]
                  }{" "}
                  ({vote.yes}/580)
                </span>
              ))}
            </>
          ) : (
            <span className="q-decision-chip" data-kind="none">
              {transition.partial
                ? t("No new launches", "Tidak ada peluncuran baru")
                : t(
                    "Kept last quarter's plan",
                    "Melanjutkan rencana sebelumnya",
                  )}
            </span>
          )}
          {transition.politics && (
            <span
              className="q-decision-chip"
              data-kind={
                transition.politics.approval <
                transition.politics.approvalBefore - 0.5
                  ? "end"
                  : "none"
              }
            >
              {t("Public approval", "Kepuasan publik")}{" "}
              {number(transition.politics.approvalBefore, 0)}% →{" "}
              {number(transition.politics.approval, 0)}%
            </span>
          )}
        </p>
        <dl className="q-impact-outcomes">
          {outcomes.map((outcome) => {
            const direction = tone(
              outcome.change,
              outcome.threshold,
              outcome.lowerIsBetter,
            );
            return (
              <div key={outcome.key}>
                <dt>{outcome.label}</dt>
                <dd>
                  <strong>{outcome.value}</strong>{" "}
                  <span className="q-impact-change" data-tone={direction}>
                    {signed(outcome.change * reveal, outcome.digits)}
                    {outcome.unit}
                  </span>
                </dd>
                {outcome.planChange !== undefined &&
                  Math.abs(outcome.planChange) >= outcome.threshold && (
                    <dd className="q-impact-plan">
                      {t("Your decisions", "Keputusan Anda")}{" "}
                      {signed(outcome.planChange, outcome.digits)}
                      {outcome.unit}
                    </dd>
                  )}
              </div>
            );
          })}
        </dl>
      </div>
      <div className="q-impact-foundations">
        <div className="q-impact-legend">
          <h3>
            <StatHelp
              label={t("Foundations", "Fondasi")}
              description={t(
                "Each change is split in two. Your decisions compares this quarter's plan with keeping last quarter's settings under the same events. Ongoing covers programmes already running, economic adjustment and outside events.",
                "Setiap perubahan dibagi dua. Keputusan Anda membandingkan rencana triwulan ini dengan mempertahankan pengaturan sebelumnya pada peristiwa yang sama. Berjalan mencakup program yang sudah berjalan, penyesuaian ekonomi, dan peristiwa luar.",
              )}
            />
          </h3>
          <span data-kind="plan">{t("Your decisions", "Keputusan Anda")}</span>
          <span data-kind="ongoing">
            {t("Ongoing & conditions", "Berjalan & kondisi")}
          </span>
        </div>
        <ul>
          {FOUNDATIONS.map((f) => {
            const total = after[f] - before[f];
            return (
              <li key={f}>
                <span className="q-impact-name">{foundationName(f)}</span>
                <b className="q-impact-value">
                  {number(counted(before[f], after[f]), 1)}
                </b>
                <span className="q-impact-change" data-tone={tone(total, 0.01)}>
                  {signed(total * reveal, 2)}
                </span>
                <span className="q-impact-bar" aria-hidden="true">
                  {segments(plan?.[f] ?? 0, ongoing?.[f] ?? total).map(
                    (segment) => (
                      <span
                        key={segment.kind}
                        data-kind={segment.kind}
                        data-negative={segment.negative || undefined}
                        style={{
                          left: `${segment.start}%`,
                          width: `${segment.size}%`,
                        }}
                      />
                    ),
                  )}
                </span>
                {plan && (
                  <span className="sr-only">
                    {t("Your decisions", "Keputusan Anda")}{" "}
                    {signed(plan[f] ?? 0, 2)},{" "}
                    {t("ongoing and conditions", "berjalan dan kondisi")}{" "}
                    {signed(ongoing?.[f] ?? 0, 2)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
