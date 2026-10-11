import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { money, number } from "./components";
import { translate, useLanguage } from "./i18n";
import { StatHelp } from "./StatHelp";
import { useReducedMotion } from "./WorldMap";
import { foundationNames } from "./engine/economy/catalog";
import { taxDefinitions } from "./engine/taxes";
import { partyById } from "./engine/politics";
import { FOUNDATIONS, type Foundation } from "./engine/economy/types";
import { EconomyEmblem } from "./EconomyEmblem";
import { quarterResults } from "./quarterResults";
import {
  getQuarterPlayback,
  policyName,
  quarterTimeline,
  QUARTER_ACTS,
  regionTour,
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
    "Slows local services and the local economy",
    "Memperlambat layanan dan ekonomi daerah",
  ],
  "crisis-improved": [
    "Damage is easing; recovery continues",
    "Kerusakan mereda; pemulihan berlanjut",
  ],
  "crisis-worsened": [
    "Slows local services and the local economy",
    "Memperlambat layanan dan ekonomi daerah",
  ],
  "province-changed": ["", ""],
};

/**
 * What speeds recovery from a disruption, following the engine: harvest
 * shocks respond to irrigation and food storage, floods to transport and
 * water, and other disruptions to health and nutrition. Recovery also slows
 * when programmes are not fully paid.
 */
const crisisHelp = (kind: VisualCallout["crisisKind"]): [string, string] =>
  kind === "harvest"
    ? [
        "Irrigation and food storage programmes here speed recovery.",
        "Program irigasi dan cadangan pangan di sini mempercepat pemulihan.",
      ]
    : kind === "flood"
      ? [
          "Road and clean water programmes here speed recovery.",
          "Program jalan dan air bersih di sini mempercepat pemulihan.",
        ]
      : [
          "Health and nutrition programmes here speed recovery.",
          "Program kesehatan dan gizi di sini mempercepat pemulihan.",
        ];
const needsHelp = new Set<VisualCallout["event"]>([
  "crisis-warning",
  "crisis-active",
  "crisis-worsened",
]);

const actNames: Record<QuarterAct, [string, string]> = {
  events: ["What happened", "Yang terjadi"],
  regions: ["Regions", "Wilayah"],
  impact: ["Whole country", "Seluruh negeri"],
};

const verdictNames = {
  improving: ["Improving", "Membaik"],
  mixed: ["Mixed", "Campuran"],
  steady: ["Steady", "Stabil"],
  slipping: ["Slipping", "Menurun"],
} as const;
/** A region where nothing clearly moved reads as steady, not mixed. */
const verdictKey = (region: RegionResult) =>
  region.verdict === "mixed" && !region.gains && !region.setbacks
    ? "steady"
    : region.verdict;

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
  const tour = regionTour(transition);

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
  // The playback ends on the whole-country result, and it stays there.
  const shown: QuarterAct = done ? (pinnedAct ?? "impact") : playback.act;
  const order = QUARTER_ACTS.indexOf(playback.act);
  const actFill = (act: QuarterAct) =>
    done || QUARTER_ACTS.indexOf(act) < order
      ? 1
      : act === playback.act
        ? playback.actProgress
        : 0;
  /** Results appear during the first part of their act. */
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

  // Round before choosing the sign so tiny changes read "0.00", not "-0.00".
  const signed = (value: number, digits = 1) => {
    const rounded = Math.round(value * 10 ** digits) / 10 ** digits;
    return `${rounded > 0 ? "+" : rounded < 0 ? "−" : ""}${number(Math.abs(rounded), digits)}`;
  };
  const place = (region: { name: string; nameId?: string }) =>
    language === "id" ? (region.nameId ?? region.name) : region.name;

  const receipt = transition.national;
  const receiptEvents = (receipt?.events ?? [])
    .filter((event) => event.kind === "crisis" || event.kind === "project")
    .slice(0, 2);
  const tourStep = playback.act === "regions" && !done ? playback.step : -1;
  const spotlight: RegionResult | undefined =
    tourStep >= 0
      ? tour[tourStep]
      : (transition.regions.find((r) => r.id === spot) ??
        transition.regions.find((r) => r.tag === "attention") ??
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
          {/* While it plays, skipping is the only side step offered. */}
          {receipt && done && (
            <button onClick={onReport}>
              {t("Read report", "Baca laporan")}
            </button>
          )}
          {!done && (
            <button ref={skip} onClick={() => finishPlayback("impact")}>
              {t("Skip to results", "Langsung ke hasil")}
            </button>
          )}
          <button ref={close} className="q-recap-continue" onClick={onFinish}>
            {t("Plan next quarter", "Rencana berikutnya")}
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
                        {callout.kind === "crisis" &&
                          needsHelp.has(callout.event) &&
                          `. ${pick(crisisHelp(callout.crisisKind))}`}
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
            <section className="q-debrief-news">
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
            </section>
          </div>
        )}
        {shown === "regions" && spotlight && (
          <RegionsAct
            transition={transition}
            spotlight={spotlight}
            touring={tourStep >= 0}
            t={t}
            signed={signed}
            onRegion={onRegion}
            onPick={(region) => {
              setSpot(region);
              if (!done) finishPlayback("regions");
            }}
          />
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
      </div>
    </section>
  );
}

function RegionsAct({
  transition,
  spotlight,
  touring,
  t,
  signed,
  onRegion,
  onPick,
}: {
  transition: QuarterVisualTransition;
  spotlight: RegionResult;
  touring: boolean;
  t: (en: string, id: string) => string;
  signed: (value: number, digits?: number) => string;
  onRegion: (region: string) => void;
  onPick: (region: string) => void;
}) {
  const language = useLanguage();
  const pick = (pair: readonly [string, string]) =>
    pair[language === "id" ? 1 : 0];
  const place = (region: { name: string; nameId?: string }) =>
    language === "id" ? (region.nameId ?? region.name) : region.name;
  const key = verdictKey(spotlight);
  const points = t("points", "poin");

  // The same thresholds the verdict uses, said in words.
  const foundationMean =
    FOUNDATIONS.reduce((sum, f) => sum + spotlight.foundations[f], 0) /
    FOUNDATIONS.length;
  const better: string[] = [],
    worse: string[] = [];
  if (spotlight.gdpChange >= 0.1)
    better.push(t("the economy grew", "ekonomi tumbuh"));
  else if (spotlight.gdpChange <= -0.1)
    worse.push(t("the economy shrank", "ekonomi menyusut"));
  if (spotlight.poverty <= -0.05)
    better.push(t("poverty fell", "kemiskinan turun"));
  else if (spotlight.poverty >= 0.05)
    worse.push(t("poverty rose", "kemiskinan naik"));
  if (spotlight.unemployment <= -0.05)
    better.push(t("unemployment fell", "pengangguran turun"));
  else if (spotlight.unemployment >= 0.05)
    worse.push(t("unemployment rose", "pengangguran naik"));
  if (foundationMean >= 0.05)
    better.push(t("basic services improved", "layanan dasar membaik"));
  else if (foundationMean <= -0.05)
    worse.push(t("basic services wore down", "layanan dasar menurun"));
  const list = (items: string[]) =>
    items.length < 2
      ? (items[0] ?? "")
      : `${items.slice(0, -1).join(", ")}${t(" and ", ", dan ")}${items.at(-1)}`;
  const capital = (value: string) =>
    value.charAt(0).toUpperCase() + value.slice(1);
  const reason =
    better.length && worse.length
      ? `${capital(list(better))}${t(", but ", ", tetapi ")}${list(worse)}.`
      : better.length
        ? `${capital(list(better))}.`
        : worse.length
          ? `${capital(list(worse))}.`
          : t(
              "Little changed here this quarter.",
              "Hanya sedikit perubahan di sini triwulan ini.",
            );
  const services = FOUNDATIONS.filter(
    (f) => Math.abs(spotlight.foundations[f]) >= 0.05,
  );

  return (
    <div className="q-debrief-regions">
      <article
        className="q-region-spot"
        data-verdict={spotlight.verdict}
        aria-live={touring ? "off" : "polite"}
      >
        <div className="q-region-spot-head">
          <h3>{place(spotlight)}</h3>
          <span className="q-verdict" data-verdict={spotlight.verdict}>
            <Verdict verdict={spotlight.verdict} />
            {pick(verdictNames[key])}
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
        <p className="q-region-reason">{reason}</p>
        <dl className="q-region-stats">
          <div>
            <dt>{t("Economy", "Ekonomi")}</dt>
            <dd data-tone={tone(spotlight.gdpChange, 0.1)}>
              {signed(spotlight.gdpChange, 1)}%
            </dd>
          </div>
          <div>
            <dt>{t("Poverty", "Kemiskinan")}</dt>
            <dd data-tone={tone(spotlight.poverty, 0.05, true)}>
              {number(spotlight.after.poverty, 1)}%{" "}
              <small>
                {Math.abs(spotlight.poverty) < 0.05
                  ? t("steady", "tetap")
                  : `${signed(spotlight.poverty, 1)} ${points}`}
              </small>
            </dd>
          </div>
          <div>
            <dt>{t("Unemployment", "Pengangguran")}</dt>
            <dd data-tone={tone(spotlight.unemployment, 0.05, true)}>
              {number(spotlight.after.unemployment, 1)}%{" "}
              <small>
                {Math.abs(spotlight.unemployment) < 0.05
                  ? t("steady", "tetap")
                  : `${signed(spotlight.unemployment, 1)} ${points}`}
              </small>
            </dd>
          </div>
        </dl>
        <p className="q-region-programmes">
          {services.length ? (
            <>
              {t("Basic services", "Layanan dasar")}:{" "}
              {services.map((f, index) => (
                <span key={f} data-tone={tone(spotlight.foundations[f], 0.05)}>
                  {index > 0 && ", "}
                  {foundationNames[f][language]}{" "}
                  {signed(spotlight.foundations[f], 1)}
                </span>
              ))}
              {". "}
            </>
          ) : (
            t("Basic services held steady. ", "Layanan dasar stabil. ")
          )}
          {spotlight.programmes.length
            ? `${t("Programmes here", "Program di sini")}: ${spotlight.programmes.map(policyName).join(", ")} (${money(spotlight.spending)}).`
            : t(
                "No programme money reached this region yet.",
                "Belum ada dana program yang sampai ke wilayah ini.",
              )}
        </p>
      </article>
      <div className="q-region-list">
        <div className="q-region-legend">
          <StatHelp
            label={t("All regions", "Semua wilayah")}
            description={t(
              "Each region is judged on four things: the economy, poverty, unemployment and basic services. Improving: something got clearly better and nothing got clearly worse. Mixed: some better, some worse. Slipping: more got worse than better. Steady: nothing moved much. Very small changes count as steady.",
              "Setiap wilayah dinilai dari empat hal: ekonomi, kemiskinan, pengangguran, dan layanan dasar. Membaik: ada yang jelas membaik dan tidak ada yang jelas memburuk. Campuran: sebagian membaik, sebagian memburuk. Menurun: lebih banyak yang memburuk. Stabil: tidak banyak bergerak. Perubahan sangat kecil dihitung stabil.",
            )}
          />
          {(["improving", "mixed", "slipping"] as const).map((verdict) => (
            <span key={verdict}>
              <Verdict verdict={verdict} />
              {pick(verdictNames[verdict])}
            </span>
          ))}
        </div>
        <ul
          className="q-region-chips"
          aria-label={t("All regions", "Semua wilayah")}
        >
          {transition.regions.map((region) => (
            <li key={region.id}>
              <button
                aria-pressed={spotlight.id === region.id}
                data-verdict={region.verdict}
                onClick={() => onPick(region.id)}
              >
                <Verdict verdict={region.verdict} />
                <span className="q-region-chip-name">{place(region)}</span>
                <span className="sr-only">
                  {", "}
                  {pick(verdictNames[verdictKey(region)])}
                  {region.tag === "best"
                    ? t(", strongest quarter", ", triwulan terkuat")
                    : region.tag === "attention"
                      ? t(", needs attention", ", perlu perhatian")
                      : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
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
  const plan = receipt.effects?.decisions;
  const decisions = transition.decisions;
  const foundationName = (f: Foundation) => foundationNames[f][language];
  // The same plain results the report opens with, so both say the same thing.
  const { results, verdict } = quarterResults(receipt, language);

  const best = plan
    ? [...FOUNDATIONS].sort((a, b) => (plan[b] ?? 0) - (plan[a] ?? 0))[0]
    : undefined;
  const bestValue = best && plan ? (plan[best] ?? 0) : 0;
  const votes = transition.politics?.votes ?? [];
  const changed =
    votes.length +
      Number(!!transition.politics?.deal) +
      Number(!!transition.politics?.budget) +
      decisions.launched.length +
      decisions.ended.length +
      Number(decisions.taxesChanged) +
      Number(decisions.allocationChanged) >
    0;
  const programmeMoney = Object.values(receipt.ledger.policySpending).reduce(
    (sum, value) => sum + (value ?? 0),
    0,
  );
  // Tie the result to the player's own choices, the step a beginner needs most.
  const yourPart =
    best && bestValue >= 0.02
      ? t(
          `Your decisions helped ${foundationName(best).toLowerCase()} the most (${signed(bestValue, 2)} points).`,
          `Keputusan Anda paling membantu ${foundationName(best).toLowerCase()} (${signed(bestValue, 2)} poin).`,
        )
      : changed
        ? t(
            "Your changes take time. Most of their effect arrives in later quarters.",
            "Perubahan Anda butuh waktu. Sebagian besar dampaknya tiba pada triwulan berikutnya.",
          )
        : programmeMoney < 0.05
          ? t(
              "No programmes are running yet. Choose some in Policies & taxes to start changing these numbers.",
              "Belum ada program yang berjalan. Pilih program di Kebijakan & pajak untuk mulai mengubah angka ini.",
            )
          : t(
              "You kept the same plan, so the change came from programmes already running and outside events.",
              "Anda mempertahankan rencana yang sama, jadi perubahan datang dari program berjalan dan peristiwa luar.",
            );

  // Approval starts high after the election and drifts down in the first year.
  const honeymoon =
    !!transition.politics &&
    transition.from < 12 &&
    transition.politics.approval < transition.politics.approvalBefore - 0.5;
  return (
    <div className="q-debrief-impact">
      <div className="q-impact-summary">
        <p className="q-impact-headline">{verdict}</p>
        <p className="q-impact-yours">{yourPart}</p>
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
                  key={`${vote.tax}-${vote.confirmation ? "c" : "b"}`}
                  className="q-decision-chip"
                  data-kind={vote.passed || vote.perppu ? "launch" : "end"}
                >
                  {vote.perppu
                    ? t("Perppu enacted", "Perppu diterbitkan")
                    : vote.confirmation
                      ? vote.passed
                        ? t("DPR confirmed Perppu", "DPR mengesahkan Perppu")
                        : t("DPR revoked Perppu", "DPR mencabut Perppu")
                      : vote.passed
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
              {t("No changes", "Tidak ada perubahan")}
            </span>
          )}
          {transition.politics?.deal && (
            <span className="q-decision-chip">
              {t("Coalition deal", "Kesepakatan koalisi")}{" "}
              {partyById[transition.politics.deal.party].name} · Rp{" "}
              {number(transition.politics.deal.cost, 1)}T
            </span>
          )}
          {transition.politics?.budget && (
            <span
              className="q-decision-chip"
              data-kind={transition.politics.budget.passed ? "launch" : "end"}
            >
              {transition.politics.budget.passed
                ? t(
                    `DPR passed the ${transition.politics.budget.year} APBN`,
                    `DPR mengesahkan APBN ${transition.politics.budget.year}`,
                  )
                : t(
                    `DPR rejected the ${transition.politics.budget.year} APBN: no launches for a year`,
                    `DPR menolak APBN ${transition.politics.budget.year}: tanpa peluncuran setahun`,
                  )}{" "}
              ({transition.politics.budget.yes}/580)
            </span>
          )}
        </p>
        {transition.politics && (
          <p className="q-impact-decisions">
            {/* Approval is the public's reaction, not one of the player's decisions. */}
            <StatHelp
              label={t("Public approval", "Kepuasan publik")}
              description={t(
                "The share of people happy with the government. It reacts to incomes, prices, jobs, taxes, visible programmes and unpaid bills. It starts high after an election and drifts toward a normal level in the first year. Very low approval makes DPR votes harder to win.",
                "Persentase warga yang puas dengan pemerintah. Angka ini bereaksi pada pendapatan, harga, pekerjaan, pajak, program yang terlihat, dan tagihan yang tidak terbayar. Angkanya tinggi setelah pemilu lalu bergerak ke tingkat biasa pada tahun pertama. Kepuasan yang sangat rendah membuat suara DPR lebih sulit didapat.",
              )}
            />
            <span
              className="q-decision-chip"
              data-kind={
                transition.politics.approval <
                  transition.politics.approvalBefore - 0.5 && !honeymoon
                  ? "end"
                  : "none"
              }
            >
              {number(transition.politics.approvalBefore, 0)}% →{" "}
              {number(transition.politics.approval, 0)}%
              {honeymoon &&
                t(" · normal after an election", " · wajar setelah pemilu")}
            </span>
          </p>
        )}
      </div>
      <ul
        className="q-impact-results"
        aria-label={t("What it meant for people", "Artinya bagi warga")}
      >
        {results.slice(0, 4).map((result, index) => (
          <li
            key={result.id}
            data-tone={result.tone}
            style={{
              opacity: Math.max(0, Math.min(1, reveal * 4 - index)),
            }}
          >
            <EconomyEmblem kind={result.kind} />
            <span>
              <strong>{result.name}</strong>
              <b>
                {result.value}
                <span className="sr-only">
                  {result.tone === "good"
                    ? t(" (better)", " (membaik)")
                    : result.tone === "bad"
                      ? t(" (worse)", " (memburuk)")
                      : ""}
                </span>
              </b>
              <small>{result.text}</small>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
