import { money, number } from "./components";
import { useLanguage } from "./i18n";
import { EconomyEmblem } from "./EconomyEmblem";
import { PolicyKindBadge } from "./policyKinds";
import { policyById } from "./engine/economy/catalog";
import { QUARTER_TREND_GROWTH } from "./engine/economy/engine";
import { projectCompletionRewards } from "./engine/economy/projectRewards";
import { GAME_REGIONS, regionForProvince } from "./engine/gameRegions";
import {
  FOUNDATIONS,
  type PolicyId,
  type PolicyKind,
  type QuarterGame,
  type RegionId,
} from "./engine/economy/types";
import type { QuarterVisualTransition } from "./quarterVisual";
import { DEBRIEF_ISLANDS, DEBRIEF_MAP_SIZE } from "./debriefMap";

type Tone = "good" | "bad" | "neutral";
type SiteState = "started" | "building" | "paused" | "completed" | "done";
type Site = {
  region: RegionId;
  before: number | null;
  after: number;
  state: SiteState;
};
type Works = {
  id: PolicyId;
  kind: PolicyKind;
  sites: Site[];
  progressBefore: number | null;
  progress: number;
  /** completed: finished this quarter; opened: facility finished this quarter. */
  status:
    | "started"
    | "building"
    | "paused"
    | "completed"
    | "opened"
    | "serving"
    | "idle"
    | "legacy";
  spending: number;
};

const signed = (v: number, digits = 2) =>
  `${v > 1e-9 ? "+" : v < -1e-9 ? "−" : ""}${number(Math.abs(v) < 1e-9 ? 0 : Math.abs(v), digits)}`;

/** Small islands sit close together, so some pins hang below their island. */
const PIN_BELOW = new Set<RegionId>(["bali"]);

function DebriefIcon({
  kind,
  x,
  y,
  size,
}: {
  kind: "crane" | "star" | "storm" | "chart" | "coin" | "pause" | "plug";
  /** Position and size when nested inside another SVG. */
  x?: number;
  y?: number;
  size?: number;
}) {
  return (
    <svg
      className="debrief-icon"
      data-icon={kind}
      viewBox="0 0 32 32"
      x={x}
      y={y}
      width={size}
      height={size}
      aria-hidden="true"
    >
      {kind === "crane" && (
        <g stroke="#244d49" strokeWidth="2" strokeLinejoin="round" fill="none">
          <path d="M10 28V6l16 4H10" fill="#f6d77e" />
          <path d="M10 10l6 4m-6 2 6 4m-6 2 6 4" />
          <path d="M23 10v8" />
          <path d="m19 18 4 3 4-3v4l-4 3-4-3Z" fill="#eb7057" />
        </g>
      )}
      {kind === "star" && (
        <path
          d="m16 3 3.8 8 8.7 1-6.4 6 1.7 8.7L16 22.4 8.2 26.7 9.9 18l-6.4-6 8.7-1Z"
          fill="#f6c84c"
          stroke="#244d49"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      )}
      {kind === "storm" && (
        <g stroke="#244d49" strokeWidth="2" strokeLinejoin="round">
          <path
            d="M8 18h17a5 5 0 0 0-2-9.6A7 7 0 0 0 9.4 10 4 4 0 0 0 8 18Z"
            fill="#c9d6dd"
          />
          <path d="m15 19-3 6h4l-2 5 6-8h-4l2-3Z" fill="#f6c84c" />
        </g>
      )}
      {kind === "chart" && (
        <g stroke="#244d49" strokeWidth="2" strokeLinejoin="round">
          <path d="M5 27h22" fill="none" />
          <path d="M7 20h5v7H7Z" fill="#9ed3b7" />
          <path d="M14 14h5v13h-5Z" fill="#5fb38a" />
          <path d="M21 8h5v19h-5Z" fill="#247c5e" />
        </g>
      )}
      {kind === "coin" && (
        <g stroke="#244d49" strokeWidth="2">
          <ellipse cx="16" cy="20" rx="10" ry="5" fill="#d9a23a" />
          <path d="M6 15v5m20-5v5" />
          <ellipse cx="16" cy="15" rx="10" ry="5" fill="#f6d77e" />
        </g>
      )}
      {kind === "pause" && (
        <g stroke="#244d49" strokeWidth="2">
          <circle cx="16" cy="16" r="12" fill="#f1e2c2" />
          <path d="M13 11v10m6-10v10" strokeLinecap="round" />
        </g>
      )}
      {kind === "plug" && (
        <g stroke="#244d49" strokeWidth="2" strokeLinejoin="round">
          <circle cx="16" cy="16" r="12" fill="#bfe6dc" />
          <path d="m17 7-6 10h5l-1 8 6-10h-5Z" fill="#f6c84c" />
        </g>
      )}
    </svg>
  );
}

/** A sunny island vignette whose props follow what happened this quarter. */
function DebriefScene({
  building,
  completed,
  crisis,
  grade,
}: {
  building: boolean;
  completed: boolean;
  crisis: boolean;
  grade: number;
}) {
  return (
    <svg className="debrief-scene" viewBox="0 0 260 150" aria-hidden="true">
      <rect width="260" height="150" rx="16" fill="#8fdcd6" />
      <path d="M0 96h260v54H0Z" fill="#6fcfc9" />
      <path
        d="M20 112h28m140 10h34M92 132h22"
        stroke="#d8f5f1"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {crisis ? (
        <g>
          <path
            d="M176 44h52a12 12 0 0 0-4-23 17 17 0 0 0-32 3 10 10 0 0 0-16 20Z"
            fill="#c9d6dd"
            stroke="#244d49"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M188 52l-4 9m14-9-4 9m14-9-4 9"
            stroke="#5aa4c4"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      ) : (
        <g>
          <circle cx="212" cy="34" r="17" fill="#ffd866" />
          <path
            d="M212 8v6m0 40v6m26-26h-6m-40 0h-6m44-18-4 4m-28 28-4 4m36 0-4-4m-28-28-4-4"
            stroke="#ffd866"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      )}
      <path d="m26 104 70-34 112 26-28 32-74 10-80-22Z" fill="#eacb88" />
      <path d="m34 98 64-32 104 28-26 28-68 9-74-21Z" fill="#579668" />
      <path d="m34 98 64-32 104 28-78 24Z" fill="#7cae69" />
      <path
        d="m98 66 22-24 20 30Z"
        fill="#9cc47c"
        stroke="#244d49"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="m120 42 20 30-14 4Z" fill="#6f9f5f" />
      {[
        [52, 94],
        [70, 86],
        [166, 98],
      ].map(([x, y]) => (
        <path
          key={x}
          d={`M${x} ${y + 10}v-10m-8 0 8-18 9 18Z`}
          fill="#247c5e"
          stroke="#244d49"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      ))}
      <g>
        <path
          d="M84 90h16v12H84Z"
          fill="#fffaf0"
          stroke="#244d49"
          strokeWidth="2"
        />
        <path
          d="m81 91 11-9 11 9Z"
          fill="#eb7057"
          stroke="#244d49"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </g>
      {building && (
        <g stroke="#244d49" strokeWidth="2" strokeLinejoin="round">
          <path d="M140 98V52m-16 4h52l-36-10Z" fill="#f6d77e" />
          <path d="m136 98 4-40m-4 8 4 10m-4 8 4 10" fill="none" />
          <path d="M170 56v14" fill="none" />
          <path d="m164 70 6-4 6 4v8l-6 4-6-4Z" fill="#eb7057" />
        </g>
      )}
      {completed && (
        <g>
          <path d="M120 96V62" stroke="#244d49" strokeWidth="2" />
          <path
            d="M120 62h22l-6 7 6 7h-22Z"
            fill="#eb7057"
            stroke="#244d49"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M108 34l3 6 6 1-5 4 1 6-5-3-5 3 1-6-5-4 6-1Z"
            fill="#ffd866"
          />
          <path
            d="M150 22l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1Z"
            fill="#ffd866"
          />
        </g>
      )}
      <g transform="translate(196 118)">
        <path
          d="M0 0h26l-5 7H5Z"
          fill="#fffaf0"
          stroke="#244d49"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M13 0v-16l9 13Z"
          fill="#fffaf0"
          stroke="#244d49"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </g>
      <g transform="translate(14 14)">
        {[0, 1, 2, 3, 4].map((i) => (
          <path
            key={i}
            transform={`translate(${i * 22} 0)`}
            d="m9 0 2.6 5.4 5.9.8-4.3 4.1 1 5.9L9 13.4 3.8 16.2l1-5.9L.5 6.2l5.9-.8Z"
            fill={i < grade ? "#ffd866" : "#e9f2ec"}
            stroke="#244d49"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        ))}
      </g>
    </svg>
  );
}

export function QuarterDebrief({
  game,
  recap,
}: {
  game: QuarterGame;
  recap: QuarterVisualTransition | null;
}) {
  const language = useLanguage();
  const t = (en: string, id: string) => (language === "id" ? id : en);
  const receipt = game.receipt!;
  const { before, after, ledger } = receipt;
  const replay = recap && recap.to === receipt.to ? recap : null;
  const decisions = replay?.partial ? null : replay?.decisions;
  const regionLabel = (id: string) => {
    const region = GAME_REGIONS.find((r) => r.id === id);
    return region ? (language === "id" ? region.nameId : region.name) : id;
  };

  // Quarter results the player can read at a glance: each one is a medal.
  // Output must beat background trend growth, so standing still earns nothing.
  const outputChange = before.gdp > 0 ? (after.gdp / before.gdp - 1) * 100 : 0;
  const jobsChange = after.unemployment - before.unemployment;
  const povertyChange = after.poverty - before.poverty;
  const foundationChange = FOUNDATIONS.reduce(
    (sum, f) => sum + (after[f] - before[f]),
    0,
  );
  const objectives = [
    {
      id: "output",
      met: outputChange > QUARTER_TREND_GROWTH,
      name: t("Beat trend growth", "Lampaui tren"),
      value: `${signed(outputChange)}% · ${t("trend", "tren")} ${number(QUARTER_TREND_GROWTH, 1)}%`,
    },
    {
      id: "jobs",
      met: jobsChange <= 0,
      name: t("Hold jobs", "Jaga lapangan kerja"),
      value: `${t("Jobless", "Pengangguran")} ${signed(jobsChange)} ${t("pp", "poin")}`,
    },
    {
      id: "poverty",
      met: povertyChange < 0,
      name: t("Cut poverty", "Kemiskinan turun"),
      value: `${signed(povertyChange)} ${t("pp", "poin")}`,
    },
    {
      id: "foundations",
      met: foundationChange > 0,
      name: t("Strengthen foundations", "Fondasi menguat"),
      value: `${signed(foundationChange, 1)} ${t("pts", "poin")}`,
    },
    {
      id: "funding",
      met: ledger.funding >= 0.999,
      name: t("Fully fund delivery", "Didanai penuh"),
      value: `${number(ledger.funding * 100, 0)}%`,
    },
  ];
  const grade = objectives.filter((o) => o.met).length;
  const verdict = [
    t("A tough quarter", "Triwulan berat"),
    t("A tough quarter", "Triwulan berat"),
    t("A mixed quarter", "Triwulan campuran"),
    t("A mixed quarter", "Triwulan campuran"),
    t("A good quarter", "Triwulan yang baik"),
    t("An outstanding quarter", "Triwulan gemilang"),
  ][grade];

  // Group construction sites by policy so builds and facilities read as one card each.
  const priorProjects = new Map(
    (replay && !replay.partial ? replay.projects : []).map((p) => [
      p.after.id,
      p.before,
    ]),
  );
  const rewardEvent = (policy: PolicyId, region: RegionId) => {
    const name = policyById[policy].name;
    const meta = GAME_REGIONS.find((r) => r.id === region);
    return receipt.events.some(
      (e) =>
        e.kind === "project" &&
        e.title.en === `${name}: completion reward (${meta?.name})`,
    );
  };
  const worksById = new Map<PolicyId, Works>();
  for (const project of game.simulation.projects) {
    const [policy, region] = project.id.split(":") as [PolicyId, RegionId];
    const def = policyById[policy];
    if (!def || def.kind === "program") continue;
    const prior = priorProjects.get(project.id);
    const known = replay && !replay.partial;
    const beforeProgress = known ? (prior?.progress ?? 0) : null;
    const completedNow = project.completed
      ? known
        ? !prior?.completed
        : rewardEvent(policy, region)
      : false;
    const launched =
      decisions?.launched.includes(policy) ?? (known ? !prior : false);
    const state: SiteState = project.completed
      ? completedNow
        ? "completed"
        : "done"
      : project.paused
        ? "paused"
        : launched
          ? "started"
          : "building";
    let works = worksById.get(policy);
    if (!works) {
      works = {
        id: policy,
        kind: def.kind,
        sites: [],
        progressBefore: null,
        progress: 0,
        status: "building",
        spending: ledger.policySpending[policy] ?? 0,
      };
      worksById.set(policy, works);
    }
    works.sites.push({
      region,
      before: beforeProgress,
      after: project.progress,
      state,
    });
  }
  const works = [...worksById.values()].map((w) => {
    const avg = (values: number[]) =>
      values.reduce((s, v) => s + v, 0) / Math.max(1, values.length);
    w.progress = avg(w.sites.map((s) => s.after));
    w.progressBefore = w.sites.every((s) => s.before !== null)
      ? avg(w.sites.map((s) => s.before!))
      : null;
    const runtime = game.policies.find((p) => p.id === w.id);
    const all = (state: SiteState[]) =>
      w.sites.every((s) => state.includes(s.state));
    const some = (state: SiteState) => w.sites.some((s) => s.state === state);
    w.status = all(["done", "completed"])
      ? some("completed")
        ? w.kind === "facility"
          ? "opened"
          : "completed"
        : w.kind === "facility"
          ? runtime?.active
            ? "serving"
            : "idle"
          : "legacy"
      : some("paused")
        ? "paused"
        : all(["started"])
          ? "started"
          : "building";
    return w;
  });
  const order: Works["status"][] = [
    "completed",
    "opened",
    "started",
    "building",
    "paused",
    "serving",
    "idle",
  ];
  const yard = works
    .filter((w) => w.status !== "legacy")
    .sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  const legacy = works.filter((w) => w.status === "legacy");
  const programs = game.policies
    .filter((p) => p.active && policyById[p.id]?.kind === "program")
    .map((p) => ({ id: p.id, spending: ledger.policySpending[p.id] ?? 0 }))
    .sort((a, b) => b.spending - a.spending);

  const kindSpending = { program: 0, build: 0, facility: 0 } as Record<
    PolicyKind,
    number
  >;
  for (const [id, value] of Object.entries(ledger.policySpending)) {
    const def = policyById[id as PolicyId];
    if (def && value) kindSpending[def.kind] += value;
  }
  const policyTotal =
    kindSpending.program + kindSpending.build + kindSpending.facility;

  const statusText: Record<Works["status"], string> = {
    started: t("Ground broken", "Mulai dibangun"),
    building: t("Under construction", "Sedang dibangun"),
    paused: t("Construction paused", "Pembangunan tertunda"),
    completed: t("Completed!", "Selesai!"),
    opened: t("Open for service!", "Mulai melayani!"),
    serving: t("Serving", "Melayani"),
    idle: t("Idle, upkeep only", "Menganggur, biaya rawat saja"),
    legacy: t("Built", "Terbangun"),
  };
  const statusIcon = (status: Works["status"]) =>
    status === "completed" || status === "opened"
      ? "star"
      : status === "paused" || status === "idle"
        ? "pause"
        : status === "serving"
          ? "plug"
          : "crane";

  // The event feed keeps what the policy board cannot show: shocks and the economy's response.
  const feed = receipt.events.filter(
    (e) => e.kind === "crisis" || e.kind === "economy",
  );
  const crisisRegions = new Map<string, number>();
  feed.forEach((e, i) => {
    if (e.kind !== "crisis" || !e.province) return;
    const region = regionForProvince(e.province);
    if (region && !crisisRegions.has(region.id))
      crisisRegions.set(region.id, i + 1);
  });
  const ongoing = new Set(
    game.simulation.crises
      .filter((c) => !c.resolved)
      .map((c) => regionForProvince(c.province)?.id)
      .filter((id): id is string => !!id),
  );
  const mapMarks = new Map<string, ("crane" | "star" | "storm")[]>();
  const mark = (region: string, kind: "crane" | "star" | "storm") => {
    const list = mapMarks.get(region) ?? [];
    if (!list.includes(kind)) list.push(kind);
    mapMarks.set(region, list);
  };
  for (const w of works)
    for (const site of w.sites)
      if (site.state === "completed") mark(site.region, "star");
      else if (site.state !== "done") mark(site.region, "crane");
  for (const region of [...ongoing, ...crisisRegions.keys()])
    mark(region, "storm");

  const decisionCount = decisions
    ? decisions.launched.length +
      decisions.ended.length +
      Number(decisions.taxesChanged) +
      Number(decisions.allocationChanged)
    : null;
  const unemploymentChange = after.unemployment - before.unemployment;
  const tone = (value: number, goodWhenUp = true): Tone =>
    Math.abs(value) < 1e-6
      ? "neutral"
      : value > 0 === goodWhenUp
        ? "good"
        : "bad";
  const flow = [
    {
      kind: "investment" as const,
      name: t("Decisions", "Keputusan"),
      value:
        decisionCount === null
          ? "—"
          : decisionCount
            ? t(
                `${decisionCount} ${decisionCount === 1 ? "change" : "changes"}`,
                `${decisionCount} perubahan`,
              )
            : t("Plan kept", "Rencana tetap"),
      detail: t("Policies, taxes, allocation", "Kebijakan, pajak, alokasi"),
      tone: "neutral" as Tone,
    },
    {
      kind: "infrastructure" as const,
      name: t("Delivery", "Pelaksanaan"),
      value: money(policyTotal),
      detail: `${number(ledger.funding * 100, 0)}% ${t("funded", "didanai")}`,
      tone: (ledger.funding >= 0.999 ? "good" : "bad") as Tone,
    },
    {
      kind: "manufacturing" as const,
      name: t("Industries", "Industri"),
      value: `${signed(outputChange)}%`,
      detail: t("National output", "Output nasional"),
      tone: tone(outputChange),
    },
    {
      kind: "income" as const,
      name: t("Households", "Rumah tangga"),
      value: `${signed(povertyChange)} ${t("pp", "poin")}`,
      detail: `${t("Poverty", "Kemiskinan")} · ${t("jobless", "pengangguran")} ${signed(unemploymentChange)}`,
      tone: tone(povertyChange, false),
    },
  ];

  const headline = [
    yard.some((w) => w.status === "completed" || w.status === "opened")
      ? t(
          `${yard.filter((w) => w.status === "completed" || w.status === "opened").length} project finished`,
          `${yard.filter((w) => w.status === "completed" || w.status === "opened").length} proyek rampung`,
        )
      : null,
    yard.some((w) => ["started", "building", "paused"].includes(w.status))
      ? t(
          `${yard.filter((w) => ["started", "building", "paused"].includes(w.status)).length} under construction`,
          `${yard.filter((w) => ["started", "building", "paused"].includes(w.status)).length} sedang dibangun`,
        )
      : null,
    programs.length
      ? t(
          `${programs.length} ${programs.length === 1 ? "programme" : "programmes"} running`,
          `${programs.length} program berjalan`,
        )
      : null,
    crisisRegions.size
      ? t(
          `${crisisRegions.size} new ${crisisRegions.size === 1 ? "disruption" : "disruptions"}`,
          `${crisisRegions.size} gangguan baru`,
        )
      : null,
  ].filter(Boolean);

  const finished = (site: Site) =>
    site.state === "completed" || site.state === "done";
  const rewardChips = (id: PolicyId) =>
    (projectCompletionRewards[id] ?? []).map((reward) => ({
      label: reward.label[language],
      value: `${reward.amount < 0 ? "−" : "+"}${Math.abs(reward.amount)}${reward.unit === "percent" ? "%" : ` ${t("pts", "poin")}`}`,
      negative: reward.amount < 0,
    }));

  return (
    <div className="debrief">
      <section
        className="debrief-hero report-board"
        aria-labelledby="debrief-verdict"
      >
        <DebriefScene
          building={yard.some((w) =>
            ["started", "building"].includes(w.status),
          )}
          completed={yard.some(
            (w) => w.status === "completed" || w.status === "opened",
          )}
          crisis={crisisRegions.size > 0}
          grade={grade}
        />
        <div className="debrief-verdict">
          <span className="debrief-kicker">
            {t("Quarter results", "Hasil triwulan")} · {grade}/
            {objectives.length} {t("medals", "medali")}
          </span>
          <h3 id="debrief-verdict">{verdict}</h3>
          <p>{headline.join(" · ")}</p>
          <ul className="debrief-medals">
            {objectives.map((o) => (
              <li key={o.id} data-met={o.met}>
                <span className="debrief-medal" aria-hidden="true">
                  {o.met ? "✓" : "✕"}
                </span>
                <span>
                  <strong>{o.name}</strong>
                  <small>
                    <span className="debrief-sr">
                      {o.met
                        ? t("Met: ", "Tercapai: ")
                        : t("Missed: ", "Belum: ")}
                    </span>
                    {o.value}
                  </small>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="report-story-layout">
        <div className="debrief-column">
          <section className="report-board">
            <h3>
              {t(
                "Your decisions reached the islands",
                "Keputusan Anda sampai ke kepulauan",
              )}
            </h3>
            <div
              className="report-delivery-flow"
              aria-label={t(
                "How decisions reach outcomes",
                "Alur keputusan menuju hasil",
              )}
            >
              {flow.map((node, i) => (
                <div
                  key={node.name}
                  data-tone={node.tone}
                  style={{ animationDelay: `${i * 90}ms` }}
                >
                  <EconomyEmblem kind={node.kind} />
                  <strong>{node.name}</strong>
                  <b>{node.value}</b>
                  <small>{node.detail}</small>
                </div>
              ))}
            </div>
            <ul className="debrief-decisions">
              {decisions?.launched.map((id) => (
                <li key={`l-${id}`} data-tone="launch">
                  <b>{t("Launched", "Diluncurkan")}</b>
                  {policyById[id]?.name ?? id}
                </li>
              ))}
              {decisions?.ended.map((id) => (
                <li key={`e-${id}`} data-tone="end">
                  <b>{t("Ended", "Dihentikan")}</b>
                  {policyById[id]?.name ?? id}
                </li>
              ))}
              {decisions?.taxesChanged && (
                <li>
                  <b>{t("Taxes", "Pajak")}</b>
                  {t("adjusted", "disesuaikan")}
                </li>
              )}
              {decisions?.allocationChanged && (
                <li>
                  <b>{t("Budgets", "Anggaran")}</b>
                  {t("shifted between regions", "digeser antarwilayah")}
                </li>
              )}
              {decisionCount === 0 && (
                <li>
                  {t(
                    "Kept the previous plan. Existing policies kept delivering.",
                    "Rencana sebelumnya dipertahankan. Kebijakan berjalan terus memberi dampak.",
                  )}
                </li>
              )}
              {decisionCount === null && (
                <li>
                  {t(
                    "Decision history is unavailable in this save.",
                    "Riwayat keputusan tidak tersedia dalam simpanan ini.",
                  )}
                </li>
              )}
            </ul>
          </section>

          <section className="report-board">
            <h3>{t("Construction yard", "Lokasi pembangunan")}</h3>
            {yard.length ? (
              <ul className="debrief-yard">
                {yard.map((w) => {
                  const def = policyById[w.id];
                  const celebrate =
                    w.status === "completed" || w.status === "opened";
                  return (
                    <li key={w.id} data-status={w.status}>
                      <div className="debrief-works-art">
                        <EconomyEmblem
                          kind={
                            def.category === "economy"
                              ? "investment"
                              : def.category
                          }
                        />
                        <DebriefIcon kind={statusIcon(w.status)} />
                      </div>
                      <div className="debrief-works-body">
                        <div className="debrief-works-head">
                          <strong>{def.name}</strong>
                          <PolicyKindBadge kind={w.kind} />
                          <span className="debrief-status">
                            {statusText[w.status]}
                          </span>
                        </div>
                        <div
                          className="debrief-progress"
                          role="meter"
                          aria-label={`${def.name}: ${t("construction progress", "progres pembangunan")}`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round(w.progress)}
                        >
                          {w.progressBefore !== null && (
                            <span style={{ width: `${w.progressBefore}%` }} />
                          )}
                          <span style={{ width: `${w.progress}%` }} />
                        </div>
                        <div className="debrief-works-meta">
                          <span>
                            {w.progressBefore !== null &&
                            w.progress - w.progressBefore > 0.05
                              ? `${number(w.progressBefore, 0)}% → ${number(w.progress, 0)}%`
                              : `${number(w.progress, 0)}%`}
                          </span>
                          {w.spending > 0 && (
                            <span>
                              {money(w.spending)}{" "}
                              {t("this quarter", "triwulan ini")}
                            </span>
                          )}
                        </div>
                        {w.sites.every(
                          (site) =>
                            finished(site) === finished(w.sites[0]) &&
                            (finished(site) ||
                              site.state === w.sites[0].state) &&
                            Math.abs(site.after - w.sites[0].after) < 15,
                        ) ? (
                          <p className="debrief-sites-line">
                            <b>
                              {t(
                                `${w.sites.length} ${w.sites.length === 1 ? "region" : "regions"}`,
                                `${w.sites.length} wilayah`,
                              )}
                            </b>{" "}
                            {w.sites
                              .map((site) => regionLabel(site.region))
                              .join(", ")}
                          </p>
                        ) : (
                          <ul
                            className="debrief-sites"
                            aria-label={t("Regional sites", "Lokasi wilayah")}
                          >
                            {w.sites.map((site) => (
                              <li key={site.region} data-state={site.state}>
                                <span
                                  className="debrief-site-pip"
                                  aria-hidden="true"
                                  style={{
                                    background: `conic-gradient(var(--site-fill) ${site.after}%, #dce6d5 0)`,
                                  }}
                                />
                                {regionLabel(site.region)}
                              </li>
                            ))}
                          </ul>
                        )}
                        {w.kind === "facility" &&
                          ["started", "building", "paused"].includes(
                            w.status,
                          ) && (
                            <p className="debrief-sites-line">
                              {t(
                                "Service starts in each region once its facility is built.",
                                "Layanan dimulai di tiap wilayah setelah fasilitasnya selesai.",
                              )}
                            </p>
                          )}
                        {(celebrate ||
                          w.status === "building" ||
                          w.status === "started") &&
                          rewardChips(w.id).length > 0 && (
                            <div className="debrief-rewards">
                              <span>
                                {celebrate
                                  ? t(
                                      "Permanent reward per region",
                                      "Bonus permanen per wilayah",
                                    )
                                  : t(
                                      "Reward on completion",
                                      "Bonus saat selesai",
                                    )}
                              </span>
                              {rewardChips(w.id).map((chip) => (
                                <b
                                  key={chip.label}
                                  data-negative={chip.negative || undefined}
                                >
                                  {chip.label} {chip.value}
                                </b>
                              ))}
                            </div>
                          )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p>
                {t(
                  "Nothing is being built. Launch a one-time build or facility programme to break ground.",
                  "Belum ada pembangunan. Jalankan kebijakan bangun sekali atau program fasilitas untuk mulai membangun.",
                )}
              </p>
            )}
            {legacy.length > 0 && (
              <div className="debrief-legacy">
                <span>{t("Already built", "Sudah terbangun")}</span>
                {legacy.map((w) => (
                  <b key={w.id}>
                    <DebriefIcon kind="star" />
                    {policyById[w.id].name}
                  </b>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="debrief-column">
          <section className="report-board debrief-map-board">
            <h3>{t("Across the archipelago", "Di seluruh kepulauan")}</h3>
            <svg
              className="debrief-map"
              viewBox={`0 0 ${DEBRIEF_MAP_SIZE[0]} ${DEBRIEF_MAP_SIZE[1]}`}
              role="img"
              aria-label={t(
                "Map of construction sites and disruptions this quarter",
                "Peta lokasi pembangunan dan gangguan triwulan ini",
              )}
            >
              <rect
                width={DEBRIEF_MAP_SIZE[0]}
                height={DEBRIEF_MAP_SIZE[1]}
                rx="14"
                fill="#8fdcd6"
              />
              <g strokeLinejoin="round">
                {(Object.keys(DEBRIEF_ISLANDS) as RegionId[]).map((id) => (
                  <path
                    key={`shelf-${id}`}
                    d={DEBRIEF_ISLANDS[id].d}
                    fill="#b5ebe3"
                    stroke="#b5ebe3"
                    strokeWidth="7"
                  />
                ))}
                {(Object.keys(DEBRIEF_ISLANDS) as RegionId[]).map((id) => (
                  <path
                    key={`sand-${id}`}
                    d={DEBRIEF_ISLANDS[id].d}
                    fill="#eacb88"
                    stroke="#eacb88"
                    strokeWidth="2.5"
                  />
                ))}
                {(Object.keys(DEBRIEF_ISLANDS) as RegionId[]).map((id) => (
                  <path
                    key={id}
                    d={DEBRIEF_ISLANDS[id].d}
                    fill={mapMarks.has(id) ? "#4f9a62" : "#86b878"}
                    stroke={mapMarks.has(id) ? "#2f6b45" : "#6f9f63"}
                    strokeWidth="0.8"
                  />
                ))}
              </g>
              {[...mapMarks.entries()].map(([id, marks]) => {
                const island = DEBRIEF_ISLANDS[id as RegionId];
                if (!island) return null;
                const [x, y] = island.anchor;
                const below = PIN_BELOW.has(id as RegionId);
                return (
                  <g
                    key={id}
                    transform={`translate(${x - (marks.length * 21) / 2} ${below ? y + 6 : y - 26})`}
                  >
                    <path
                      d={`M${(marks.length * 21) / 2 - 4} ${below ? 1 : 21}l4 ${below ? -6 : 6} 4 ${below ? 6 : -6}Z`}
                      fill="#244d49"
                    />
                    {marks.map((kind, i) => (
                      <g
                        key={kind}
                        transform={`translate(${i * 21} 0)`}
                        className="debrief-map-pin"
                      >
                        <circle
                          cx="10.5"
                          cy="11"
                          r="10.5"
                          fill="#fffaf0"
                          stroke="#244d49"
                          strokeWidth="1.8"
                        />
                        <DebriefIcon kind={kind} x={2.5} y={3} size={16} />
                        {kind === "storm" && crisisRegions.has(id) && (
                          <g>
                            <circle
                              cx="19"
                              cy="2"
                              r="6.5"
                              fill="#eb7057"
                              stroke="#244d49"
                              strokeWidth="1.5"
                            />
                            <text
                              x="19"
                              y="5"
                              textAnchor="middle"
                              className="debrief-map-number"
                            >
                              {crisisRegions.get(id)}
                            </text>
                          </g>
                        )}
                      </g>
                    ))}
                  </g>
                );
              })}
            </svg>
            <ul className="debrief-map-legend">
              <li>
                <DebriefIcon kind="crane" />
                {t("Building", "Dibangun")}
              </li>
              <li>
                <DebriefIcon kind="star" />
                {t("Completed", "Selesai")}
              </li>
              <li>
                <DebriefIcon kind="storm" />
                {t("Disruption", "Gangguan")}
              </li>
            </ul>
          </section>

          <section className="report-board report-event-board">
            <h3>{t("The quarter’s events", "Peristiwa triwulan ini")}</h3>
            {feed.length ? (
              <ol className="debrief-events">
                {feed.map((event, i) => {
                  const region = event.province
                    ? regionForProvince(event.province)
                    : undefined;
                  const funding = event.title.en.startsWith("Funding");
                  return (
                    <li
                      key={`${event.month}-${i}`}
                      data-kind={funding ? "funding" : event.kind}
                    >
                      <span className="report-event-number">{i + 1}</span>
                      <DebriefIcon
                        kind={
                          event.kind === "crisis"
                            ? "storm"
                            : funding
                              ? "coin"
                              : "chart"
                        }
                      />
                      <div>
                        <strong>{event.title[language]}</strong>
                        {region && (
                          <span className="debrief-event-place">
                            {language === "id" ? region.nameId : region.name}
                          </span>
                        )}
                        <p>{event.detail[language]}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p>
                {t(
                  "A calm quarter. No shocks hit the islands.",
                  "Triwulan tenang. Tidak ada guncangan di kepulauan.",
                )}
              </p>
            )}
          </section>
          <section className="report-board">
            <h3>{t("Policy spending", "Belanja kebijakan")}</h3>
            <div
              className="debrief-spend-bar"
              role="img"
              aria-label={t(
                `Policy spending this quarter: programmes ${money(kindSpending.program)}, one-time builds ${money(kindSpending.build)}, facility programmes ${money(kindSpending.facility)}`,
                `Belanja kebijakan triwulan ini: program ${money(kindSpending.program)}, bangun sekali ${money(kindSpending.build)}, program fasilitas ${money(kindSpending.facility)}`,
              )}
            >
              {(["program", "build", "facility"] as const).map((kind) =>
                kindSpending[kind] > 0 ? (
                  <span
                    key={kind}
                    data-kind={kind}
                    style={{ flexGrow: kindSpending[kind] }}
                  />
                ) : null,
              )}
            </div>
            <ul className="debrief-spend-legend">
              {(["program", "build", "facility"] as const).map((kind) => (
                <li key={kind} data-kind={kind}>
                  <span aria-hidden="true" />
                  {kind === "program"
                    ? t("Programmes", "Program")
                    : kind === "build"
                      ? t("One-time builds", "Bangun sekali")
                      : t("Facilities", "Fasilitas")}
                  <b>{money(kindSpending[kind])}</b>
                </li>
              ))}
            </ul>
            {programs.length ? (
              <ul className="debrief-programs">
                {programs.map((p) => {
                  const def = policyById[p.id];
                  return (
                    <li key={p.id}>
                      <EconomyEmblem
                        kind={
                          def.category === "economy"
                            ? "investment"
                            : def.category
                        }
                      />
                      <span>{def.name}</span>
                      <b>{money(p.spending)}</b>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p>
                {t(
                  "No recurring programmes are running.",
                  "Tidak ada program rutin yang berjalan.",
                )}
              </p>
            )}
          </section>
        </div>
      </div>
      <p className="report-next-cue">
        {t(
          "Next: see which foundations and industries moved, and why.",
          "Berikutnya: lihat fondasi dan industri yang berubah, serta penyebabnya.",
        )}
      </p>
    </div>
  );
}
