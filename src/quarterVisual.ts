import {
  FOUNDATIONS,
  type Foundation,
  type IndustryId,
  type PolicyId,
  type QuarterGame,
} from "./engine/economy/types";
import type { Crisis, Project, Province } from "./worldTypes";
import type { Overlay } from "./mapLayers";
import {
  regionById,
  regionForProvince,
  summarizeRegions,
  type RegionSummary,
} from "./engine/gameRegions";
import { industries, policyById } from "./engine/economy/catalog";

/** Each located event gets its own beat on the map. */
export const EVENT_STEP_MS = 1700;
/** A calm quarter still gets a short beat before the national results. */
export const QUIET_EVENTS_MS = 1600;
export const IMPACT_MS = 5200;
export const REGION_STEP_MS = 700;
export const REGION_HOLD_MS = 700;

export type QuarterAct = "events" | "impact" | "regions";
export const QUARTER_ACTS: readonly QuarterAct[] = [
  "events",
  "impact",
  "regions",
];

export function quarterTimeline(transition: QuarterVisualTransition) {
  const events = transition.callouts.length
    ? transition.callouts.length * EVENT_STEP_MS
    : QUIET_EVENTS_MS;
  const regions =
    transition.regions.length * REGION_STEP_MS +
    (transition.regions.length ? REGION_HOLD_MS : 0);
  const acts = {
    events: { start: 0, duration: events },
    impact: { start: events, duration: IMPACT_MS },
    regions: { start: events + IMPACT_MS, duration: regions },
  } satisfies Record<QuarterAct, { start: number; duration: number }>;
  return { acts, total: events + IMPACT_MS + regions };
}

export type PlaybackFocus = {
  province: string;
  region?: string;
  direction: "positive" | "negative" | "neutral";
  /** A number for an event, or an arrow for a regional verdict. */
  badge: string;
  wholeRegion: boolean;
  celebrate: boolean;
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));
export const smooth = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

export function getQuarterPlayback(
  elapsedMs: number,
  transition: QuarterVisualTransition,
) {
  const { acts, total } = quarterTimeline(transition);
  const elapsed = Math.max(0, Math.min(total, elapsedMs));
  const done = elapsedMs >= total;
  const act: QuarterAct =
    elapsed < acts.impact.start
      ? "events"
      : elapsed < acts.regions.start || !transition.regions.length
        ? "impact"
        : "regions";
  const local = elapsed - acts[act].start;
  const actProgress = done ? 1 : clamp(local / acts[act].duration);
  let step = -1,
    stepPhase = 0,
    focus: PlaybackFocus | null = null;
  if (act === "events" && transition.callouts.length) {
    step = Math.min(
      transition.callouts.length - 1,
      Math.floor(local / EVENT_STEP_MS),
    );
    stepPhase = clamp(local / EVENT_STEP_MS - step);
    const callout = transition.callouts[step];
    focus = {
      province: callout.province,
      region: callout.region,
      direction: callout.direction,
      badge: String(step + 1),
      wholeRegion: false,
      celebrate:
        callout.event === "project-completed" ||
        callout.event === "crisis-resolved",
    };
  } else if (act === "regions" && transition.regions.length) {
    step = Math.min(
      transition.regions.length - 1,
      Math.floor(local / REGION_STEP_MS),
    );
    const last = step === transition.regions.length - 1;
    stepPhase = clamp(
      (local - step * REGION_STEP_MS) /
        (last ? REGION_STEP_MS + REGION_HOLD_MS : REGION_STEP_MS),
    );
    const region = transition.regions[step];
    focus = {
      province: region.province,
      region: region.id,
      direction:
        region.verdict === "improving"
          ? "positive"
          : region.verdict === "slipping"
            ? "negative"
            : "neutral",
      badge:
        region.verdict === "improving"
          ? "up"
          : region.verdict === "slipping"
            ? "down"
            : "steady",
      wholeRegion: true,
      celebrate: false,
    };
  }
  return {
    elapsed,
    total,
    done,
    progress: total ? elapsed / total : 1,
    act,
    actProgress,
    step,
    stepPhase,
    focus: done ? null : focus,
    /** Map colours shift while the national results are on screen. */
    colorProgress: smooth(
      (elapsed - acts.impact.start) / (acts.impact.duration * 0.6),
    ),
  };
}

/** How far a featured event (or, at step -1, any other change) has played. */
export function calloutPhase(
  elapsedMs: number,
  transition: QuarterVisualTransition,
  step: number,
) {
  const { acts } = quarterTimeline(transition);
  return step < 0
    ? smooth(elapsedMs / acts.events.duration)
    : smooth((elapsedMs - step * EVENT_STEP_MS) / (EVENT_STEP_MS * 0.52));
}

export type RegionMeasures = {
  id: string;
  name: string;
  nameId: string;
  provinceIds: readonly string[];
  population: number;
  gdp: number;
  poverty: number;
  unemployment: number;
  foundations: Record<Foundation, number>;
};

const fromSummary = (region: RegionSummary): RegionMeasures => ({
  ...region,
  foundations: Object.fromEntries(
    FOUNDATIONS.map((f) => [f, region[f]]),
  ) as Record<Foundation, number>,
});

/**
 * The quarter receipt holds the engine's own regional results; without one
 * (a hand-built quarter) the map's province values are summarized instead.
 */
function regionMeasures(game: QuarterGame, when: "before" | "after") {
  const receipt = game.receipt;
  if (!receipt) return null;
  return (when === "before" ? receipt.regionsBefore : receipt.regionsAfter)
    .map((region): RegionMeasures | null => {
      const meta = regionById(region.id);
      return meta
        ? {
            id: region.id,
            name: region.name,
            nameId: region.nameId,
            provinceIds: meta.provinceIds,
            population: region.population,
            gdp: region.gdp,
            poverty: region.poverty,
            unemployment: region.unemployment,
            foundations: region.foundations,
          }
        : null;
    })
    .filter((region): region is RegionMeasures => !!region);
}

export type RegionVerdict = "improving" | "mixed" | "slipping";
export type RegionResult = {
  id: string;
  name: string;
  nameId: string;
  /** The most populous member province anchors the map marker. */
  province: string;
  before: RegionMeasures;
  after: RegionMeasures;
  gdpChange: number;
  poverty: number;
  unemployment: number;
  foundations: Record<Foundation, number>;
  spending: number;
  programmes: PolicyId[];
  verdict: RegionVerdict;
  score: number;
  /** Headline measures that clearly worsened. */
  setbacks: number;
  tag?: "best" | "attention";
};

export type NationalNews = {
  id: string;
  direction: "positive" | "negative" | "neutral";
  title: { en: string; id: string };
};

export type QuarterDecisions = {
  launched: PolicyId[];
  ended: PolicyId[];
  taxesChanged: boolean;
  allocationChanged: boolean;
};

export type VisualCallout = {
  province: string;
  region?: string;
  name: string;
  nameId?: string;
  kind: "project" | "crisis" | "province";
  direction: "positive" | "negative" | "neutral";
  event:
    | "project-completed"
    | "project-started"
    | "project-advanced"
    | "project-paused"
    | "project-resumed"
    | "crisis-resolved"
    | "crisis-recovery"
    | "crisis-warning"
    | "crisis-active"
    | "crisis-improved"
    | "crisis-worsened"
    | "province-changed";
  label: string;
  /** The project or crisis name shown under the event. */
  detail?: string;
  before?: number;
  after?: number;
  unit?: string;
  layer?: Overlay;
  projectId?: string;
  crisisId?: string;
  beforeState?: string;
  afterState?: string;
};
export type QuarterVisualTransition = {
  /** Rebuilt from the saved report alone, without the quarter's opening. */
  partial?: boolean;
  regions: RegionResult[];
  news: NationalNews[];
  decisions: QuarterDecisions;
  from: number;
  to: number;
  layer: Overlay;
  beforeProvinces: Province[];
  afterProvinces: Province[];
  projects: { before: Project | null; after: Project }[];
  crises: { before: Crisis | null; after: Crisis }[];
  national: QuarterGame["receipt"];
  callouts: VisualCallout[];
};

const crisisState = (crisis: Crisis) =>
  crisis.resolved
    ? "Resolved"
    : crisis.stage === "warning"
      ? "Warning"
      : crisis.stage === "recovery"
        ? "Recovery"
        : "Active";

export function buildQuarterVisualTransition(
  before: QuarterGame,
  after: QuarterGame,
  layer: Overlay = "infrastructure",
): QuarterVisualTransition {
  const previousProjects = new Map(
    before.simulation.projects.map((p) => [p.id, p]),
  );
  const previousCrises = new Map(
    before.simulation.crises.map((c) => [c.id, c]),
  );
  const projects = after.simulation.projects.map((after) => ({
    before: previousProjects.get(after.id) ?? null,
    after,
  }));
  const crises = after.simulation.crises.map((after) => ({
    before: previousCrises.get(after.id) ?? null,
    after,
  }));
  const location = (province: string) => {
    const region = regionForProvince(province);
    return {
      region: region?.id,
      name: region?.name ?? province,
      nameId: region?.nameId,
    };
  };
  const candidates: VisualCallout[] = [];
  const projectCallouts: VisualCallout[] = [];
  [...projects]
    .sort(
      (a, b) =>
        a.after.province.localeCompare(b.after.province) ||
        a.after.id.localeCompare(b.after.id),
    )
    .forEach((p) => {
      let event: VisualCallout["event"];
      let label: string;
      if (p.after.completed && !p.before?.completed) {
        event = "project-completed";
        label = "Construction completed";
      } else if (p.after.completed) {
        return;
      } else if (p.after.paused && !p.before?.paused) {
        event = "project-paused";
        label = "Construction paused";
      } else if (!p.before) {
        event = "project-started";
        label = "Construction started";
      } else if (p.before.paused && !p.after.paused) {
        event = "project-resumed";
        label = "Construction resumed";
      } else if (p.after.progress > p.before.progress) {
        event = "project-advanced";
        label = "Construction advanced";
      } else {
        return;
      }
      projectCallouts.push({
        kind: "project",
        event,
        projectId: p.after.id,
        direction: event === "project-paused" ? "negative" : "positive",
        province: p.after.province,
        ...location(p.after.province),
        label,
        detail: p.after.name,
        before: p.before?.progress ?? 0,
        after: p.after.progress,
        unit: "%",
      });
    });
  candidates.push(
    ...projectCallouts.filter((c) => c.event === "project-completed"),
  );
  [...crises]
    .sort(
      (a, b) =>
        a.after.province.localeCompare(b.after.province) ||
        a.after.id.localeCompare(b.after.id),
    )
    .forEach((c) => {
      const beforeState = c.before ? crisisState(c.before) : undefined;
      const afterState = crisisState(c.after);
      const stateChanged = beforeState !== afterState;
      const damageChange = c.after.damage - (c.before?.damage ?? 0);
      if (!stateChanged && (c.after.resolved || Math.abs(damageChange) < 0.05))
        return;
      const event: VisualCallout["event"] = !stateChanged
        ? damageChange < 0
          ? "crisis-improved"
          : "crisis-worsened"
        : c.after.resolved
          ? "crisis-resolved"
          : c.after.stage === "recovery"
            ? "crisis-recovery"
            : c.after.stage === "warning"
              ? "crisis-warning"
              : "crisis-active";
      candidates.push({
        kind: "crisis",
        event,
        crisisId: c.after.id,
        direction:
          event === "crisis-resolved" ||
          event === "crisis-recovery" ||
          event === "crisis-improved"
            ? "positive"
            : "negative",
        province: c.after.province,
        ...location(c.after.province),
        detail: c.after.title,
        label: !stateChanged
          ? damageChange < 0
            ? "Crisis damage reduced"
            : "Crisis damage increased"
          : c.after.resolved
            ? "Crisis resolved"
            : c.after.stage === "recovery"
              ? "Crisis recovery"
              : c.after.stage === "warning"
                ? "Crisis warning"
                : "Active crisis",
        ...(stateChanged
          ? { beforeState, afterState }
          : { before: c.before!.damage, after: c.after.damage }),
      });
    });
  candidates.push(
    ...projectCallouts.filter((c) => c.event !== "project-completed"),
  );
  const seen = new Set<string>();
  const callouts = candidates
    .filter((c) => {
      if (seen.has(c.province)) return false;
      seen.add(c.province);
      return true;
    })
    .slice(0, 3);
  return {
    from: before.simulation.month,
    to: after.simulation.month,
    layer,
    beforeProvinces: before.simulation.provinces,
    afterProvinces: after.simulation.provinces,
    projects,
    crises,
    national: after.receipt,
    callouts,
    regions: buildRegionResults(before, after),
    news: buildNationalNews(after),
    decisions: buildDecisions(before, after),
  };
}

/**
 * An imported game keeps its quarter report but not the quarter's opening,
 * so construction and crisis changes cannot be replayed on the map.
 */
export function buildQuarterSummaryFromReceipt(
  after: QuarterGame,
  layer: Overlay = "infrastructure",
): QuarterVisualTransition | null {
  const receipt = after.receipt;
  if (!receipt) return null;
  const launched = (id: PolicyId) =>
    after.policies.some(
      (p) => p.id === id && p.active && p.started === receipt.from,
    );
  const before: QuarterGame = {
    ...after,
    receipt: null,
    policies: after.policies.filter((p) => !launched(p.id)),
    simulation: { ...after.simulation, month: receipt.from },
  };
  return {
    ...buildQuarterVisualTransition(before, after, layer),
    partial: true,
  };
}

/** West-to-east, so the map tour sweeps across the archipelago. */
const TOUR = [
  "sumatra",
  "java",
  "kalimantan",
  "bali",
  "ntb",
  "ntt",
  "sulawesi",
  "maluku",
  "papua",
];

export function buildRegionResults(
  before: QuarterGame,
  after: QuarterGame,
): RegionResult[] {
  const prior = new Map(
    (
      regionMeasures(after, "before") ??
      summarizeRegions(before.simulation.provinces).map(fromSummary)
    ).map((r) => [r.id, r]),
  );
  const flows = new Map(
    (after.receipt?.regionsAfter ?? []).map(
      (r) => [r.id as string, r.policySpending] as const,
    ),
  );
  const results = (
    regionMeasures(after, "after") ??
    summarizeRegions(after.simulation.provinces).map(fromSummary)
  )
    .filter((r) => prior.has(r.id) && r.population > 0)
    .map((now): RegionResult => {
      const was = prior.get(now.id)!;
      const foundations = Object.fromEntries(
        FOUNDATIONS.map((f) => [f, now.foundations[f] - was.foundations[f]]),
      ) as Record<Foundation, number>;
      const gdpChange = was.gdp ? (now.gdp / was.gdp - 1) * 100 : 0;
      const poverty = now.poverty - was.poverty;
      const unemployment = now.unemployment - was.unemployment;
      const foundationMean =
        FOUNDATIONS.reduce((sum, f) => sum + foundations[f], 0) /
        FOUNDATIONS.length;
      // Small movements count as steady rather than as wins or losses.
      const signals = [
        gdpChange / 0.1,
        -poverty / 0.05,
        -unemployment / 0.05,
        foundationMean / 0.05,
      ].map((v) => (v >= 1 ? 1 : v <= -1 ? -1 : 0));
      const good = signals.filter((v) => v > 0).length,
        bad = signals.filter((v) => v < 0).length;
      const spending = Object.entries(flows.get(now.id) ?? {}) as [
        PolicyId,
        number,
      ][];
      const province = after.simulation.provinces
        .filter((p) => now.provinceIds.includes(p.id))
        .sort(
          (a, b) => b.population - a.population || a.id.localeCompare(b.id),
        )[0].id;
      return {
        id: now.id,
        name: now.name,
        nameId: now.nameId,
        province,
        before: was,
        after: now,
        gdpChange,
        poverty,
        unemployment,
        foundations,
        spending: spending.reduce((sum, [, value]) => sum + value, 0),
        programmes: spending
          .filter(([, value]) => value > 0.005)
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .slice(0, 2)
          .map(([id]) => id),
        // Any clear setback makes a region mixed, however good the rest.
        verdict:
          bad === 0 && good > 0
            ? "improving"
            : bad > good
              ? "slipping"
              : "mixed",
        score:
          gdpChange * 0.5 - poverty * 4 - unemployment * 4 + foundationMean,
        setbacks: bad,
      };
    });
  if (results.length > 1) {
    const ranked = [...results].sort(
      (a, b) => b.score - a.score || a.id.localeCompare(b.id),
    );
    if (ranked[0].verdict === "improving") ranked[0].tag = "best";
    // Only a region with a real setback is flagged for attention.
    const weakest = ranked.reverse().find((r) => r.setbacks > 0);
    if (weakest && !weakest.tag) weakest.tag = "attention";
  }
  return results.sort((a, b) => TOUR.indexOf(a.id) - TOUR.indexOf(b.id));
}

function buildNationalNews(after: QuarterGame): NationalNews[] {
  const receipt = after.receipt;
  if (!receipt) return [];
  const news: NationalNews[] = [];
  const funding = receipt.ledger.funding;
  if (funding < 0.999)
    news.push({
      id: "funding",
      direction: "negative",
      title: {
        en: `Only ${Math.round(funding * 100)}% of planned spending was funded, so delivery slowed`,
        id: `Hanya ${Math.round(funding * 100)}% belanja rencana yang didanai, sehingga pelaksanaan melambat`,
      },
    });
  const output = (regions: typeof receipt.regionsAfter, id: IndustryId) =>
    regions.reduce((sum, r) => sum + r.industries[id].output, 0);
  const movement = industries
    .filter((d) => d.id !== "publicServices")
    .map((d) => {
      const was = output(receipt.regionsBefore, d.id);
      return {
        d,
        change: was ? (output(receipt.regionsAfter, d.id) / was - 1) * 100 : 0,
      };
    })
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0];
  if (movement && Math.abs(movement.change) >= 0.5) {
    const sign = movement.change > 0 ? "+" : "−";
    const value = Math.abs(movement.change).toFixed(1);
    news.push({
      id: `industry-${movement.d.id}`,
      direction: movement.change > 0 ? "positive" : "negative",
      title: {
        en: `${movement.d.name.en} output ${sign}${value}%, the biggest industry swing`,
        id: `Hasil ${movement.d.name.id.toLowerCase()} ${sign}${value.replace(".", ",")}%, perubahan industri terbesar`,
      },
    });
  }
  const ongoing = after.simulation.crises.filter((c) => !c.resolved).length;
  if (ongoing)
    news.push({
      id: "crises",
      direction: "negative",
      title: {
        en: `${ongoing} ${ongoing === 1 ? "disruption is" : "disruptions are"} still affecting local services`,
        id: `${ongoing} gangguan masih memengaruhi layanan daerah`,
      },
    });
  return news.slice(0, 3);
}

function buildDecisions(
  before: QuarterGame,
  after: QuarterGame,
): QuarterDecisions {
  const wasActive = new Set(
    before.policies.filter((p) => p.active).map((p) => p.id),
  );
  const nowActive = new Set(
    after.policies.filter((p) => p.active).map((p) => p.id),
  );
  return {
    launched: [...nowActive].filter((id) => !wasActive.has(id)),
    // A one-time build that finished ended by itself, not by decision.
    ended: [...wasActive].filter(
      (id) =>
        !nowActive.has(id) &&
        !after.policies.find((p) => p.id === id)?.finished,
    ),
    taxesChanged: JSON.stringify(before.taxes) !== JSON.stringify(after.taxes),
    allocationChanged:
      JSON.stringify(before.regionalSpending) !==
      JSON.stringify(after.regionalSpending),
  };
}

export const policyName = (id: PolicyId) => policyById[id]?.name ?? id;
export const regionName = (id: string, language: "en" | "id") => {
  const region = regionById(id);
  return region ? (language === "id" ? region.nameId : region.name) : id;
};
