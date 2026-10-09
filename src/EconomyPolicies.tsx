import { useId, useLayoutEffect, useRef, useState } from "react";
import { GameSelect } from "./GameSelect";
import { StatHelp } from "./StatHelp";
import { PolicyProjects } from "./PolicyProjects";
import { PolicyKindBadge, policyKindNames } from "./policyKinds";
import { EconomyEmblem } from "./EconomyEmblem";
import { money, number } from "./components";
import { useLanguage } from "./i18n";
import {
  policies,
  policyById,
  industryById,
  foundationNames,
} from "./engine/economy/catalog";
import {
  isFinished,
  launchCount,
  policyAllocations,
  policyQuarterCost,
  projectsOf,
  summarizeEconomyRegions,
} from "./engine/economy/engine";
import {
  FOUNDATIONS,
  POLICY_KINDS,
  SPENDING_LEVELS,
  type Bilingual,
  type PolicyConsequence,
  type PolicyDefinition,
  type PolicyId,
  type Foundation,
  type IndustryId,
  type QuarterGame,
  type QuarterPlan,
  type RegionalSpendingLevel,
  type RegionId,
} from "./engine/economy/types";

type Props = {
  game: QuarterGame;
  plan: QuarterPlan;
  onChange: (plan: QuarterPlan) => void;
  disabled: boolean;
  detail: PolicyId | null;
  onDetail: (id: PolicyId | null) => void;
};

type PolicyEffectItem = Pick<PolicyConsequence, "label" | "direction"> & {
  emblem?: Foundation | IndustryId;
  qualifier?: Bilingual;
  kind: "benefit" | PolicyConsequence["kind"];
};

function mergePolicyEffects(effects: PolicyEffectItem[]) {
  return effects.reduce<PolicyEffectItem[]>((items, effect) => {
    const existing = items.find(
      (item) =>
        item.label.en === effect.label.en &&
        item.label.id === effect.label.id &&
        item.direction === effect.direction,
    );
    if (!existing) {
      items.push({ ...effect });
      return items;
    }
    if (effect.qualifier) {
      existing.qualifier =
        existing.qualifier && existing.qualifier.en !== effect.qualifier.en
          ? {
              en: `${existing.qualifier.en} · ${effect.qualifier.en}`,
              id: `${existing.qualifier.id} · ${effect.qualifier.id}`,
            }
          : effect.qualifier;
    }
    existing.emblem ??= effect.emblem;
    if (effect.kind === "limited-benefit") existing.kind = effect.kind;
    return items;
  }, []);
}

function FactIcon({
  kind,
}: {
  kind: "rollout" | "recurring" | "startup" | "funded";
}) {
  return (
    <svg
      className="eco-fact-icon"
      data-icon={kind}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {kind === "rollout" ? (
        <>
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l3 2M9 3h6" />
        </>
      ) : kind === "recurring" ? (
        <>
          <path d="M19 8a8 8 0 0 0-14 1M5 16a8 8 0 0 0 14-1" />
          <path d="M19 3v5h-5M5 21v-5h5" />
        </>
      ) : kind === "startup" ? (
        <>
          <ellipse cx="12" cy="7" rx="7" ry="3" />
          <path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
        </>
      ) : (
        <>
          <rect x="4" y="5" width="16" height="15" rx="3" />
          <path d="M4 10h16M9 3v4M15 3v4M9 15l2 2 4-4" />
        </>
      )}
    </svg>
  );
}

function PolicyEffectList({
  effects,
  group,
  illustrated = false,
}: {
  effects: PolicyEffectItem[];
  group: "benefits" | "downsides";
  illustrated?: boolean;
}) {
  const language = useLanguage();
  if (!effects.length) return null;
  return (
    <ul
      className={`eco-impacts${group === "downsides" ? " eco-consequences" : ""}`}
      data-effect-group={group}
      aria-label={
        group === "benefits"
          ? language === "id"
            ? "Manfaat"
            : "Benefits"
          : language === "id"
            ? "Biaya dan dampak negatif"
            : "Costs and negative effects"
      }
    >
      {effects.map((effect, index) => (
        <li
          key={index}
          data-kind={effect.kind}
          data-direction={effect.direction}
        >
          {illustrated && effect.emblem && (
            <EconomyEmblem kind={effect.emblem} />
          )}
          <span>
            {effect.label[language]}{" "}
            <b aria-hidden="true">{effect.direction === "up" ? "↑" : "↓"}</b>
            <span className="eco-sr-only">
              {effect.direction === "up"
                ? language === "id"
                  ? " meningkat"
                  : " increases"
                : language === "id"
                  ? " menurun"
                  : " decreases"}
            </span>
          </span>
          {effect.qualifier && <small>{effect.qualifier[language]}</small>}
        </li>
      ))}
    </ul>
  );
}

function PolicyEffects({
  policy,
  briefing = false,
}: {
  policy: PolicyDefinition;
  briefing?: boolean;
}) {
  const language = useLanguage();
  const timing = {
    delayed: { en: "Delayed", id: "Bertahap" },
    initially: { en: "Initially", id: "Awalnya" },
    later: { en: "Later", id: "Kemudian" },
  };
  const main: PolicyEffectItem[] = policy.impacts.map((impact) => ({
    emblem: impact.target,
    label: FOUNDATIONS.includes(impact.target as Foundation)
      ? foundationNames[impact.target as Foundation]
      : industryById[impact.target as IndustryId].name,
    direction: impact.direction,
    qualifier: impact.timing ? timing[impact.timing] : undefined,
    kind: impact.direction === "up" ? "benefit" : "downside",
  }));
  const benefits = mergePolicyEffects([
    ...main.filter((effect) => effect.kind === "benefit"),
    ...policy.consequences.filter(
      (effect) => effect.kind === "limited-benefit",
    ),
  ]);
  const downsides = mergePolicyEffects([
    ...main.filter((effect) => effect.kind === "downside"),
    ...policy.consequences.filter((effect) => effect.kind === "downside"),
  ]);
  return (
    <>
      {!policy.impacts.length && (
        <p className="eco-no-impact">
          {language === "id"
            ? "Tidak berdampak langsung pada fondasi atau industri"
            : "No direct foundation or industry effect"}
        </p>
      )}
      {briefing ? (
        <div className="eco-briefing-effects">
          <section data-tone="benefit">
            <h3>
              <span className="eco-effects-glyph" aria-hidden="true">
                ↑
              </span>
              <StatHelp
                label={language === "id" ? "Yang meningkat" : "What improves"}
                description={
                  language === "id"
                    ? "Panah menunjukkan arah dampak kebijakan. Hasil akhir bergantung pada pendanaan, kondisi wilayah, peristiwa, dan kebijakan lain."
                    : "Arrows show the direction of the policy's effects. Actual results depend on funding, regional conditions, events and other policies."
                }
              />
            </h3>
            <PolicyEffectList effects={benefits} group="benefits" illustrated />
          </section>
          <section data-tone="risk">
            <h3>
              <span className="eco-effects-glyph" aria-hidden="true">
                !
              </span>
              {language === "id" ? "Yang perlu diperhatikan" : "Watch out for"}
            </h3>
            <PolicyEffectList effects={downsides} group="downsides" />
            <p className="eco-tradeoff">{policy.tradeoff[language]}</p>
          </section>
        </div>
      ) : (
        <>
          <PolicyEffectList effects={benefits} group="benefits" />
          <PolicyEffectList effects={downsides} group="downsides" />
        </>
      )}
    </>
  );
}

export function EconomyPolicies({
  game,
  plan,
  onChange,
  disabled,
  detail,
  onDetail,
}: Props) {
  const language = useLanguage();
  const t = (en: string, id: string) => (language === "id" ? id : en);
  const [query, setQuery] = useState("");
  const [detailView, setDetailView] = useState<
    "briefing" | "funding" | "projects"
  >("briefing");
  const [category, setCategory] = useState("all");
  const [kind, setKind] = useState("all");
  const [filter, setFilter] = useState<"all" | "active" | "planned">("all");
  const scroller = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const listPosition = useRef(0);
  const previousDetail = useRef<PolicyId | null>(detail);
  const listTrigger = useRef<PolicyId | null>(null);
  const instanceId = useId();
  const active = game.policies
    .filter((policy) => policy.active)
    .map((policy) => policy.id);
  const launches = plan.policies.filter((id) => !active.includes(id));
  const withPolicy = (id: PolicyId): QuarterPlan =>
    plan.policies.includes(id)
      ? plan
      : { ...plan, policies: [...plan.policies, id] };
  // Adding is a "launch" unless it reopens built facilities.
  const isLaunch = (id: PolicyId) =>
    !active.includes(id) &&
    launchCount(game, withPolicy(id)) > launchCount(game, {
      ...plan,
      policies: plan.policies.filter((item) => item !== id),
    });
  const finished = (id: PolicyId) => isFinished(game, id);
  const idle = (id: PolicyId) =>
    policyById[id].kind === "facility" &&
    !active.includes(id) &&
    projectsOf(game, id).some((project) => project.completed);
  const regions = summarizeEconomyRegions(game);
  const current = detail ? policyById[detail] : null;
  const selected = detail ? plan.policies.includes(detail) : false;
  const running = detail ? active.includes(detail) : false;
  const runtime = detail
    ? game.policies.find((policy) => policy.id === detail)
    : undefined;
  const slotsFull = plan.policies.length >= 8;
  const launchesFull = launchCount(game, plan) >= 2;
  const blockedFor = (id: PolicyId) =>
    plan.policies.includes(id)
      ? ""
      : finished(id)
        ? t(
            "Construction is complete. Its gains are permanent, and a one-time build cannot be launched again.",
            "Pembangunan sudah selesai. Manfaatnya permanen, dan proyek sekali bangun tidak dapat dijalankan lagi.",
          )
        : slotsFull
        ? t(
            "All eight policy slots are in use. Remove a policy from this plan to make room.",
            "Delapan slot kebijakan sudah terisi. Hapus satu kebijakan dari rencana untuk menyediakan tempat.",
          )
        : isLaunch(id) && launchesFull
          ? t(
              "Two new policies are already planned this quarter. Remove a new launch or wait until next quarter.",
              "Dua kebijakan baru sudah direncanakan triwulan ini. Hapus satu peluncuran baru atau tunggu triwulan berikutnya.",
            )
          : "";
  const blocked = detail ? blockedFor(detail) : "";
  useLayoutEffect(() => {
    if (detail !== previousDetail.current) {
      setDetailView("briefing");
      if (detail) {
        listTrigger.current = detail;
        if (scroller.current) scroller.current.scrollTop = 0;
        heading.current?.focus({ preventScroll: true });
      } else {
        if (scroller.current) scroller.current.scrollTop = listPosition.current;
        if (listTrigger.current) {
          scroller.current
            ?.querySelector<HTMLButtonElement>(
              `[data-manage-policy="${listTrigger.current}"]`,
            )
            ?.focus({ preventScroll: true });
        }
      }
    }
    previousDetail.current = detail;
  }, [detail]);

  useLayoutEffect(() => {
    const panel = scroller.current;
    if (!detail || !panel) return;
    const tabs = panel.querySelector<HTMLElement>(".eco-detail-tabs");
    if (!tabs) return;
    const measure = () => {
      panel.style.setProperty(
        "--eco-detail-scroll-top",
        `${tabs.getBoundingClientRect().height + 8}px`,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(tabs);
    return () => observer.disconnect();
  }, [detail]);

  useLayoutEffect(() => {
    scroller.current
      ?.querySelector<HTMLElement>('[role="tabpanel"]:not([hidden])')
      ?.scrollIntoView({ block: "start" });
  }, [detailView]);

  const openDetail = (id: PolicyId) => {
    listPosition.current = scroller.current?.scrollTop ?? 0;
    listTrigger.current = id;
    onDetail(id);
  };
  const changeLevel = (region: RegionId, level: RegionalSpendingLevel) => {
    if (!detail || disabled || !selected) return;
    onChange({
      ...plan,
      regionalSpending: {
        ...plan.regionalSpending,
        [detail]: { ...plan.regionalSpending[detail], [region]: level },
      },
    });
  };
  const toggle = (id: PolicyId) => {
    if (disabled || blockedFor(id)) return;
    onChange({
      ...plan,
      policies: plan.policies.includes(id)
        ? plan.policies.filter((item) => item !== id)
        : [...plan.policies, id],
    });
  };
  const togglePolicy = () => {
    if (detail) toggle(detail);
  };
  const quickLabel = (id: PolicyId) =>
    finished(id)
      ? t("Completed", "Selesai")
      : plan.policies.includes(id)
        ? active.includes(id)
          ? policyById[id].kind === "facility"
            ? t("Deactivate", "Nonaktifkan")
            : t("Stop", "Hentikan")
          : t("Remove", "Hapus")
        : active.includes(id)
          ? t("Keep running", "Lanjutkan")
          : idle(id)
            ? t("Reactivate", "Aktifkan lagi")
            : t("Add to plan", "Tambah");
  const filterCount = {
    all: policies.length,
    active: active.length,
    planned: launches.length,
  };
  const listNotice = slotsFull
    ? {
        count: "8/8",
        title: t("Policy slots full", "Slot kebijakan penuh"),
        hint: t("Remove one to add another", "Hapus satu untuk menambah"),
      }
    : launchesFull
      ? {
          count: "2/2",
          title: t("New launches full", "Peluncuran baru penuh"),
          hint: t(
            "Running policies can still continue",
            "Kebijakan berjalan tetap bisa dilanjutkan",
          ),
        }
      : null;
  const matches = policies.filter((policy) => {
    const categoryName =
      policy.category === "economy"
        ? t("Economy", "Ekonomi")
        : foundationNames[policy.category][language];
    const effectNames = policy.impacts.map((impact) =>
      FOUNDATIONS.includes(impact.target as Foundation)
        ? foundationNames[impact.target as Foundation][language]
        : industryById[impact.target as IndustryId].name[language],
    );
    const matchQuery = [
      policy.name,
      policy.purpose[language],
      categoryName,
      ...effectNames,
      ...policy.consequences.map((effect) => effect.label[language]),
    ]
      .join(" ")
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase());
    return (
      matchQuery &&
      (category === "all" || policy.category === category) &&
      (kind === "all" || policy.kind === kind) &&
      (filter === "all" ||
        (filter === "active"
          ? active.includes(policy.id)
          : launches.includes(policy.id)))
    );
  });
  const status = (id: PolicyId) =>
    finished(id)
      ? t("Completed", "Selesai")
      : plan.policies.includes(id)
        ? active.includes(id)
          ? t("Continuing", "Dilanjutkan")
          : t("New planned", "Rencana baru")
        : active.includes(id)
          ? policyById[id].kind === "facility" &&
            projectsOf(game, id).some((project) => project.completed)
            ? t("Idle next quarter", "Menganggur triwulan depan")
            : t("Ending next quarter", "Berakhir triwulan depan")
          : idle(id)
            ? t("Idle facility", "Fasilitas menganggur")
            : t("Not active", "Belum aktif");
  const allocations = current ? policyAllocations(game, plan, current.id) : [];
  const plannedTotal = allocations.reduce((sum, item) => sum + item.amount, 0);
  // Costs if this policy runs next quarter; finished builds cost nothing.
  const costFor = (policy: PolicyDefinition) =>
    policyQuarterCost(game, withPolicy(policy.id), policy.id);
  const recurringFor = (policy: PolicyDefinition) =>
    policy.kind === "program"
      ? costFor(policy).service
      : policy.quarterlyCost * game.simulation.priceIndex;
  const startupFor = (policy: PolicyDefinition) => costFor(policy).setup;
  const constructionFor = (policy: PolicyDefinition) =>
    costFor(policy).construction;
  const constructionLeft = (policy: PolicyDefinition) => {
    if (!policy.build || finished(policy.id)) return 0;
    const projects = projectsOf(game, policy.id);
    return projects.length
      ? projects.reduce(
          (total, project) =>
            total + Math.max(0, project.cost - project.spent),
          0,
        )
      : policy.build.cost * game.simulation.priceIndex;
  };
  const idleUpkeepFor = (policy: PolicyDefinition) =>
    (policy.idleUpkeepShare ?? 0) *
    policy.quarterlyCost *
    game.simulation.priceIndex;
  const requestedFor = (policy: PolicyDefinition) => costFor(policy).total;
  const sitesDone = (policy: PolicyDefinition) => {
    const projects = projectsOf(game, policy.id);
    return {
      done: projects.filter((project) => project.completed).length,
      total: projects.length,
    };
  };
  const unfiltered = !query.trim() && category === "all" && kind === "all";

  return (
    <div className="eco-policy-layout">
      <div
        className="eco-policy-panel eco-scroll-panel"
        ref={scroller}
        data-testid="policy-panel"
        data-policy-detail={detail ?? undefined}
      >
        {current ? (
          <>
            <header
              className="eco-detail-header"
              data-status={
                selected
                  ? running
                    ? "continuing"
                    : "new"
                  : running
                    ? "ending"
                    : "idle"
              }
            >
              <EconomyEmblem kind={current.impacts[0]?.target ?? "finance"} />
              <div>
                <p className="eco-kicker">
                  <PolicyKindBadge kind={current.kind} existing={current.existing} />
                  {status(current.id)}
                </p>
                <h2 tabIndex={-1} ref={heading}>
                  {current.name}
                </h2>
                <p>{current.purpose[language]}</p>
              </div>
              <div className="eco-policy-cost">
                {(() => {
                  // A built facility left out of the plan only pays idle upkeep.
                  const idleCost = policyQuarterCost(game, plan, current.id).idle;
                  return !selected && idleCost > 0 ? (
                    <>
                      <span>{t("Idle upkeep next quarter", "Biaya menganggur triwulan depan")}</span>
                      <strong>{money(idleCost)}</strong>
                    </>
                  ) : (
                    <>
                      <span>{t("Next-quarter cost", "Biaya triwulan depan")}</span>
                      <strong>{money(requestedFor(current))}</strong>
                    </>
                  );
                })()}
              </div>
              <div className="eco-policy-facts" data-kind={current.kind}>
                <div>
                  <FactIcon kind="rollout" />
                  <span>
                    {current.kind === "program" ? (
                      <StatHelp
                        label={t("Planned rollout", "Rencana pelaksanaan")}
                        description={t(
                          "Planned rollout. Funding and local capacity can delay delivery; this is not a guaranteed completion date.",
                          "Rencana pelaksanaan. Pendanaan dan kapasitas setempat dapat memperlambat hasil; ini bukan tanggal selesai yang pasti.",
                        )}
                      />
                    ) : (
                      <StatHelp
                        label={t("Construction time", "Lama pembangunan")}
                        description={t(
                          "Planned construction time when fully funded. Funding shortfalls and local capacity can slow each region's site.",
                          "Rencana lama pembangunan jika didanai penuh. Kekurangan dana dan kapasitas setempat dapat memperlambat pembangunan di tiap wilayah.",
                        )}
                      />
                    )}
                  </span>
                  <strong>
                    {number(Math.ceil(current.rolloutMonths / 3), 0)}{" "}
                    {t("quarters", "triwulan")}
                  </strong>
                </div>
                {current.kind !== "build" && (
                  <div>
                    <FactIcon kind="recurring" />
                    <span>
                      {current.kind === "facility"
                        ? t("Running cost when built", "Biaya operasi setelah jadi")
                        : t("Recurring each quarter", "Rutin tiap triwulan")}
                    </span>
                    <strong>{money(recurringFor(current))}</strong>
                  </div>
                )}
                {current.kind === "program" ? (
                  <div>
                    <FactIcon kind="startup" />
                    <span>
                      {runtime
                        ? t("Remaining startup cost", "Sisa biaya awal")
                        : t("One-time startup cost", "Biaya awal (sekali)")}
                    </span>
                    <strong>{money(startupFor(current))}</strong>
                  </div>
                ) : (
                  <div>
                    <FactIcon kind="startup" />
                    <span>
                      {runtime
                        ? t("Construction cost left", "Sisa biaya pembangunan")
                        : t("Construction cost", "Biaya pembangunan")}
                    </span>
                    <strong>{money(constructionLeft(current))}</strong>
                  </div>
                )}
                {current.kind === "facility" && (
                  <div>
                    <FactIcon kind="recurring" />
                    <span>{t("Idle upkeep", "Biaya menganggur")}</span>
                    <strong>{money(idleUpkeepFor(current))}</strong>
                  </div>
                )}
                {runtime && current.kind === "program" && (
                  <div>
                    <FactIcon kind="funded" />
                    <span>
                      {t("Funded implementation", "Pelaksanaan didanai")}
                    </span>
                    <strong>
                      {number(runtime.fundedMonths, 0)} {t("months", "bulan")}
                    </strong>
                  </div>
                )}
                {runtime && current.kind !== "program" && (
                  <div>
                    <FactIcon kind="funded" />
                    <span>{t("Regions built", "Wilayah selesai")}</span>
                    <strong>
                      {sitesDone(current).done}/{sitesDone(current).total}
                    </strong>
                  </div>
                )}
              </div>
            </header>
            <div
              className="eco-detail-tabs"
              role="tablist"
              aria-label={t("Policy details", "Detail kebijakan")}
            >
              {(
                [
                  "briefing",
                  "funding",
                  ...(current.kind !== "program" ? ["projects" as const] : []),
                ] as const
              ).map((view, index, views) => (
                <button
                  type="button"
                  role="tab"
                  key={view}
                  id={`${instanceId}-${view}-tab`}
                  aria-controls={`${instanceId}-${view}-panel`}
                  aria-selected={detailView === view}
                  tabIndex={detailView === view ? 0 : -1}
                  onClick={() => setDetailView(view)}
                  onKeyDown={(event) => {
                    let next = index;
                    if (event.key === "ArrowRight")
                      next = (index + 1) % views.length;
                    else if (event.key === "ArrowLeft")
                      next = (index + views.length - 1) % views.length;
                    else if (event.key === "Home") next = 0;
                    else if (event.key === "End") next = views.length - 1;
                    else return;
                    event.preventDefault();
                    setDetailView(views[next]);
                    event.currentTarget.parentElement
                      ?.querySelectorAll<HTMLButtonElement>("button")
                      [next]?.focus();
                  }}
                >
                  {view === "briefing"
                    ? t("Briefing", "Ringkasan")
                    : view === "funding"
                      ? t("Funding", "Pendanaan")
                      : t("Projects", "Proyek")}
                </button>
              ))}
            </div>
            <div
              role="tabpanel"
              id={`${instanceId}-briefing-panel`}
              aria-labelledby={`${instanceId}-briefing-tab`}
              hidden={detailView !== "briefing"}
            >
              <PolicyEffects policy={current} briefing />
              <section className="eco-reality">
                <h3>{t("In reality", "Kenyataannya")}</h3>
                <p>
                  {current.existing &&
                    t(
                      "Already running and paid for in Other spending; choosing it here expands it. ",
                      "Sudah berjalan dan dibiayai dalam Belanja lainnya; memilihnya di sini berarti memperluasnya. ",
                    )}
                  {current.reality[language]}{" "}
                  {t(
                    "Game costs and effects are simplified.",
                    "Biaya dan dampak dalam permainan disederhanakan.",
                  )}
                </p>
                <a
                  className="eco-source-link"
                  href={current.source}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("Source", "Sumber")}
                  <span className="sr-only">
                    {t(" (opens in a new tab)", " (membuka tab baru)")}
                  </span>
                </a>
              </section>
              <PolicyProjects policy={current} game={game} view="briefing" />
            </div>
            {current.kind !== "program" && (
              <div
                role="tabpanel"
                id={`${instanceId}-projects-panel`}
                aria-labelledby={`${instanceId}-projects-tab`}
                hidden={detailView !== "projects"}
              >
                <PolicyProjects policy={current} game={game} view="projects" />
              </div>
            )}
            <section
              role="tabpanel"
              id={`${instanceId}-funding-panel`}
              aria-labelledby={`${instanceId}-funding-tab`}
              hidden={detailView !== "funding"}
              className="eco-spending-section"
            >
              <div className="eco-section-heading">
                <h3 id={`${instanceId}-spending`}>
                  <StatHelp
                    label={t("Regional priorities", "Prioritas wilayah")}
                    description={t(
                      "Low, Medium and High use population-adjusted weights of 1, 2 and 3. Startup is charged only until paid; recurring costs continue each quarter. Effects depend on money delivered, not on the priority label.",
                      "Rendah, Sedang, dan Tinggi memakai bobot 1, 2, dan 3 yang disesuaikan jumlah penduduk. Biaya awal ditagih sampai lunas; biaya rutin berlanjut tiap triwulan. Dampak bergantung pada dana tersalur, bukan label prioritas.",
                    )}
                  />
                </h3>
                {selected && (
                  <span className="eco-spend-total">
                    <strong>{money(plannedTotal)}</strong>
                    <small>{t("planned budget", "anggaran rencana")}</small>
                  </span>
                )}
              </div>
              <p className="eco-regional-rule">
                {current.kind === "program"
                  ? t(
                      "The national total stays fixed. Giving one region a higher priority increases its share and reduces the shares of other regions.",
                      "Total nasional tetap. Menaikkan prioritas satu wilayah memperbesar bagiannya dan mengurangi bagian wilayah lain.",
                    )
                  : runtime
                    ? current.kind === "facility"
                      ? t(
                          "Construction shares were fixed at launch. Priorities now set how running funds are shared among built regions.",
                          "Bagian pembangunan ditetapkan saat peluncuran. Prioritas kini mengatur pembagian dana operasi di wilayah yang sudah jadi.",
                        )
                      : t(
                          "Construction shares were fixed at launch. Each region's site keeps its budget until finished.",
                          "Bagian pembangunan ditetapkan saat peluncuran. Lokasi tiap wilayah memakai anggarannya sampai selesai.",
                        )
                    : t(
                        "Priorities set each region's share of the construction budget when the build launches. Regions marked Not eligible get no site.",
                        "Prioritas menentukan bagian anggaran pembangunan tiap wilayah saat peluncuran. Wilayah yang Tidak memenuhi syarat tidak mendapat lokasi.",
                      )}
              </p>
              {selected ? (
                current.kind === "program" ? (
                  <div className="eco-spend-chips">
                    <span className="eco-chip">
                      {t("Recurring", "Rutin")}{" "}
                      <b>{money(recurringFor(current))}</b>
                    </span>
                    <span>+</span>
                    <span
                      className="eco-chip"
                      data-tone={startupFor(current) > 0 ? "cost" : "done"}
                    >
                      {t("Startup", "Awal")} <b>{money(startupFor(current))}</b>
                    </span>
                  </div>
                ) : (
                  <div className="eco-spend-chips">
                    <span
                      className="eco-chip"
                      data-tone={constructionFor(current) > 0 ? "cost" : "done"}
                    >
                      {t("Construction", "Pembangunan")}{" "}
                      <b>{money(constructionFor(current))}</b>
                    </span>
                    {current.kind === "facility" && (
                      <>
                        <span>+</span>
                        <span className="eco-chip">
                          {t("Running built sites", "Operasi lokasi jadi")}{" "}
                          <b>{money(costFor(current).service)}</b>
                        </span>
                      </>
                    )}
                  </div>
                )
              ) : (
                <div className="eco-funding-empty">
                  <strong aria-hidden="true">+</strong>
                  <span>
                    <b>{t("Not in your plan", "Belum masuk rencana")}</b>
                    {t(
                      "Add it to set priorities for each region.",
                      "Tambahkan untuk mengatur prioritas tiap wilayah.",
                    )}
                  </span>
                  <button
                    type="button"
                    disabled={disabled || Boolean(blocked)}
                    onClick={togglePolicy}
                  >
                    {running
                      ? t("Keep running", "Tetap jalankan")
                      : t("Add to plan", "Tambah ke rencana")}
                  </button>
                </div>
              )}
              <table
                className="eco-spending-table"
                data-testid="regional-spending"
              >
                <caption className="eco-sr-only">
                  {t(
                    "Policy spending across nine regions",
                    "Belanja kebijakan di sembilan wilayah",
                  )}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">{t("Region", "Wilayah")}</th>
                    <th scope="col">{t("Priority", "Prioritas")}</th>
                    <th scope="col">
                      {t("Planned budget", "Anggaran rencana")}
                    </th>
                    <th scope="col">{t("Share", "Bagian")}</th>
                  </tr>
                </thead>
                <tbody>
                  {regions.map((region) => {
                    const allocation = allocations.find(
                      (item) => item.region === region.id,
                    );
                    const name =
                      language === "id" ? region.nameId : region.name;
                    return (
                      <tr key={region.id}>
                        <th scope="row">{name}</th>
                        <td>
                          {current.eligibleRegions &&
                          !current.eligibleRegions.includes(region.id) ? (
                            <span className="eco-ineligible">
                              {t("Not eligible", "Tidak memenuhi syarat")}
                            </span>
                          ) : (
                          <fieldset
                            className="eco-spending-options"
                            disabled={disabled || !selected}
                          >
                            <legend className="eco-sr-only">{`${current.name}: ${name}`}</legend>
                            {SPENDING_LEVELS.map((level) => (
                              <label key={level}>
                                <input
                                  type="radio"
                                  name={`${instanceId}-${current.id}-${region.id}`}
                                  value={level}
                                  checked={
                                    (plan.regionalSpending[current.id]?.[
                                      region.id
                                    ] ?? "medium") === level
                                  }
                                  onChange={() => changeLevel(region.id, level)}
                                />
                                <span>
                                  {level === "low"
                                    ? t("Low", "Rendah")
                                    : level === "medium"
                                      ? t("Medium", "Sedang")
                                      : t("High", "Tinggi")}
                                </span>
                              </label>
                            ))}
                          </fieldset>
                          )}
                        </td>
                        <td>
                          {selected && allocation && allocation.share > 0
                            ? money(allocation.amount)
                            : t("Not funded", "Belum didanai")}
                        </td>
                        <td>
                          {allocation
                            ? `${number(allocation.share * 100, 1)}%`
                            : "0%"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          </>
        ) : (
          <>
            <div className="eco-catalog-toolbar">
              <div className="eco-catalog-controls">
                <label className="eco-search">
                  <span className="eco-sr-only">
                    {t("Search policies", "Cari kebijakan")}
                  </span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t(
                      "Search policies",
                      "Cari kebijakan",
                    )}
                    type="search"
                  />
                </label>
                <label className="eco-category">
                  <GameSelect
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    aria-label={t("Policy category", "Kategori kebijakan")}
                  >
                    <option value="all">
                      {t("All categories", "Semua kategori")}
                    </option>
                    {FOUNDATIONS.map((foundation) => (
                      <option key={foundation} value={foundation}>
                        {foundationNames[foundation][language]}
                      </option>
                    ))}
                    <option value="economy">{t("Economy", "Ekonomi")}</option>
                  </GameSelect>
                </label>
                <label className="eco-category">
                  <GameSelect
                    value={kind}
                    onChange={(event) => setKind(event.target.value)}
                    aria-label={t("Policy type", "Jenis kebijakan")}
                  >
                    <option value="all">{t("All types", "Semua jenis")}</option>
                    {POLICY_KINDS.map((value) => (
                      <option key={value} value={value}>
                        {policyKindNames[value][language]}
                      </option>
                    ))}
                  </GameSelect>
                </label>
              </div>
              <div
                className="eco-filter-row"
                aria-label={t("Filter policies", "Saring kebijakan")}
              >
                {(["all", "active", "planned"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={filter === value}
                    onClick={() => setFilter(value)}
                  >
                    {value === "all"
                      ? t("All", "Semua")
                      : value === "active"
                        ? t("Active", "Aktif")
                        : t("New planned", "Rencana baru")}
                    <small>{filterCount[value]}</small>
                  </button>
                ))}
                <span role="status" className="eco-sr-only">
                  {number(matches.length, 0)} {t("shown", "ditampilkan")}
                </span>
                <span className="eco-legend">
                  <span data-direction="up" aria-hidden="true">
                    ↑
                  </span>
                  <span data-direction="down" aria-hidden="true">
                    ↓
                  </span>
                  <StatHelp
                    label={t("Effects", "Efek")}
                    description={t(
                      "Green arrows are expected gains; red arrows are costs or risks. Funding, local conditions, shocks and other policies change the final result, and delayed effects take time. Every policy is paid from revenue; a shortfall means more borrowing or less delivered funding.",
                      "Panah hijau adalah manfaat yang diharapkan; panah merah adalah biaya atau risiko. Pendanaan, kondisi setempat, guncangan, dan kebijakan lain mengubah hasil akhir, dan dampak bertahap butuh waktu. Semua kebijakan dibayar dari penerimaan; jika kurang, pinjaman bertambah atau dana tersalur berkurang.",
                    )}
                  />
                </span>
              </div>
            </div>
            {listNotice && (
              <div className="eco-limit-banner" role="status">
                <strong>{listNotice.count}</strong>
                <span>
                  <b>{listNotice.title}</b>
                  {listNotice.hint}
                </span>
              </div>
            )}
            {!matches.length ? (
              <div className="eco-empty">
                <h3>
                  {filter === "planned" && unfiltered
                    ? t(
                        "No new policies planned",
                        "Belum ada kebijakan baru direncanakan",
                      )
                    : filter === "active" && unfiltered
                      ? t(
                          "No policies running yet",
                          "Belum ada kebijakan berjalan",
                        )
                      : t(
                          "No matching policies",
                          "Tidak ada kebijakan yang sesuai",
                        )}
                </h3>
                <p>
                  {filter === "planned" && unfiltered
                    ? t(
                        "This filter shows new launches. Existing policies appear under Active.",
                        "Filter ini menampilkan peluncuran baru. Kebijakan yang sudah berjalan ada di Aktif.",
                      )
                    : filter === "active" && unfiltered
                      ? t(
                          "Choose a policy for your plan. It starts when you advance the quarter.",
                          "Pilih kebijakan untuk rencana Anda. Kebijakan mulai berjalan saat triwulan dilanjutkan.",
                        )
                      : t(
                          "Try a name, goal or effect, or change the filters.",
                          "Coba nama, tujuan, atau dampak lain, atau ubah filter.",
                        )}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setCategory("all");
                    setKind("all");
                    setFilter("all");
                  }}
                >
                  {unfiltered && filter !== "all"
                    ? t("Browse policies", "Lihat kebijakan")
                    : t("Reset filters", "Atur ulang filter")}
                </button>
              </div>
            ) : (
              <div className="eco-policy-list">
                {matches.map((policy) => (
                  <article
                    key={policy.id}
                    className="eco-policy-row"
                    data-testid="policy-card"
                    data-planned={plan.policies.includes(policy.id)}
                  >
                    <div className="eco-policy-summary">
                      <div className="eco-policy-identity">
                        <EconomyEmblem
                          kind={policy.impacts[0]?.target ?? "finance"}
                        />
                        <span className="eco-policy-tags">
                          <span>
                            {policy.category === "economy"
                              ? t("Economy", "Ekonomi")
                              : foundationNames[policy.category][language]}
                          </span>
                          <PolicyKindBadge kind={policy.kind} existing={policy.existing} />
                        </span>
                        {plan.policies.includes(policy.id) && (
                          <span
                            className="eco-policy-selected"
                            aria-label={
                              active.includes(policy.id)
                                ? t(
                                    "Continues next quarter",
                                    "Dilanjutkan triwulan depan",
                                  )
                                : t("New planned", "Rencana baru")
                            }
                          >
                            <span aria-hidden="true">✓</span>{" "}
                            {active.includes(policy.id)
                              ? t("Continuing", "Dilanjutkan")
                              : t("New planned", "Rencana baru")}
                          </span>
                        )}
                      </div>
                      <div className="eco-policy-title">
                        <h3>{policy.name}</h3>
                        {active.includes(policy.id) &&
                          !plan.policies.includes(policy.id) && (
                            <span className="eco-status" data-tone="ending">
                              {policy.kind === "facility"
                                ? t("Idle next quarter", "Menganggur triwulan depan")
                                : t(
                                    "Ending next quarter",
                                    "Berakhir triwulan depan",
                                  )}
                            </span>
                          )}
                        {finished(policy.id) && (
                          <span className="eco-status" data-tone="done">
                            {t("Completed", "Selesai")}
                          </span>
                        )}
                        {idle(policy.id) &&
                          !plan.policies.includes(policy.id) && (
                            <span className="eco-status" data-tone="idle">
                              {t("Idle", "Menganggur")}
                            </span>
                          )}
                      </div>
                      <p>{policy.purpose[language]}</p>
                      <PolicyEffects policy={policy} />
                    </div>
                    <div className="eco-policy-meta">
                      <strong className="eco-price">
                        {money(
                          idle(policy.id) && !plan.policies.includes(policy.id)
                            ? policyQuarterCost(game, plan, policy.id).idle
                            : requestedFor(policy),
                        )}
                        <small>
                          {finished(policy.id)
                            ? t("no further cost", "tanpa biaya lagi")
                            : idle(policy.id) &&
                                !plan.policies.includes(policy.id)
                              ? t("idle upkeep", "biaya menganggur")
                              : t("next-quarter cost", "biaya triwulan depan")}
                        </small>
                      </strong>
                      <span className="eco-cost-breakdown">
                        {policy.kind === "program" ? (
                          <>
                            <span>
                              {t("Recurring", "Rutin")}{" "}
                              {money(recurringFor(policy))}
                            </span>
                            <span>
                              {startupFor(policy) > 0
                                ? `+ ${t("Startup", "Awal")} ${money(startupFor(policy))}`
                                : t("Startup paid", "Awal lunas")}
                            </span>
                          </>
                        ) : (
                          <>
                            <span>
                              {projectsOf(game, policy.id).length
                                ? constructionLeft(policy) > 0
                                  ? `${t("Build left", "Sisa bangun")} ${money(constructionLeft(policy))}`
                                  : t("Fully built", "Sudah dibangun")
                                : `${t("Build total", "Total bangun")} ${money(constructionLeft(policy))}`}
                            </span>
                            <span>
                              {policy.kind === "facility"
                                ? `${t("Then", "Lalu")} ${money(recurringFor(policy))}/${t("qtr", "triwulan")}`
                                : t("Ends when built", "Berhenti setelah selesai")}
                            </span>
                          </>
                        )}
                      </span>
                      <span className="eco-policy-rollout">
                        {policy.kind === "program"
                          ? t("Planned rollout", "Rencana pelaksanaan")
                          : t("Build time", "Lama bangun")}{" "}
                        {number(Math.ceil(policy.rolloutMonths / 3), 0)}{" "}
                        {t("qtr", "triwulan")}
                      </span>
                      <div className="eco-row-actions">
                        <button
                          type="button"
                          data-testid="policy-toggle"
                          data-planned={plan.policies.includes(policy.id)}
                          disabled={disabled || Boolean(blockedFor(policy.id))}
                          onClick={() => toggle(policy.id)}
                          aria-label={`${quickLabel(policy.id)}: ${policy.name}`}
                        >
                          {finished(policy.id)
                            ? "✓"
                            : plan.policies.includes(policy.id)
                              ? "−"
                              : "+"}{" "}
                          {quickLabel(policy.id)}
                        </button>
                        <button
                          type="button"
                          data-manage-policy={policy.id}
                          onClick={() => openDetail(policy.id)}
                          aria-label={`${t("Details and regions", "Detail dan wilayah")}: ${policy.name}`}
                        >
                          {t("Details", "Detail")}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {current && (
        <footer
          className="eco-policy-action"
          data-state={
            selected
              ? running
                ? "continuing"
                : "new"
              : running
                ? "ending"
                : "idle"
          }
        >
          <span className="eco-action-badge" aria-hidden="true">
            {finished(current.id) ? "✓" : selected ? "✓" : running ? "■" : "+"}
          </span>
          <div>
            <strong>
              {finished(current.id)
                ? t("Construction complete", "Pembangunan selesai")
                : selected
                  ? running
                    ? t("Continues next quarter", "Dilanjutkan triwulan depan")
                    : idle(current.id)
                      ? t("Reopens next quarter", "Aktif lagi triwulan depan")
                      : t(
                          "New launch next quarter",
                          "Peluncuran baru triwulan depan",
                        )
                  : running
                    ? current.kind === "facility"
                      ? t("Goes idle next quarter", "Menganggur triwulan depan")
                      : current.kind === "build"
                        ? t("Construction pauses next quarter", "Pembangunan dijeda triwulan depan")
                        : t("Stops next quarter", "Dihentikan triwulan depan")
                    : idle(current.id)
                      ? t("Facilities idle", "Fasilitas menganggur")
                      : t("Not scheduled", "Belum dijadwalkan")}
            </strong>
            <p
              id={`${instanceId}-action-status`}
              role={blocked ? "status" : undefined}
            >
              {blocked ||
                (selected
                  ? running
                    ? t(
                        "Stopping it frees 1 policy slot.",
                        "Menghentikannya mengosongkan 1 slot kebijakan.",
                      )
                    : idle(current.id)
                      ? t(
                          "Removing it keeps the facilities idle and frees 1 policy slot.",
                          "Menghapusnya membiarkan fasilitas menganggur dan mengosongkan 1 slot kebijakan.",
                        )
                      : t(
                          "Removing it frees 1 slot and 1 new launch.",
                          "Menghapusnya mengosongkan 1 slot dan 1 peluncuran baru.",
                        )
                  : running
                    ? t(
                        "Keeping it uses 1 policy slot.",
                        "Melanjutkannya memakai 1 slot kebijakan.",
                      )
                    : idle(current.id)
                      ? t(
                          "Reactivating restarts service without rebuilding and uses 1 policy slot.",
                          "Mengaktifkan lagi memulai layanan tanpa membangun ulang dan memakai 1 slot kebijakan.",
                        )
                      : t(
                          "Uses 1 policy slot and 1 new launch.",
                          "Memakai 1 slot kebijakan dan 1 peluncuran baru.",
                        ))}
            </p>
          </div>
          <button
            type="button"
            data-testid="policy-start"
            data-intent={selected ? "remove" : "add"}
            disabled={disabled || Boolean(blocked)}
            aria-describedby={`${instanceId}-action-status`}
            onClick={togglePolicy}
          >
            {finished(current.id)
              ? t("Completed", "Selesai")
              : selected
                ? running
                  ? current.kind === "facility"
                    ? t("Deactivate next quarter", "Nonaktifkan triwulan depan")
                    : current.kind === "build"
                      ? t("Pause next quarter", "Jeda triwulan depan")
                      : t("Stop next quarter", "Hentikan triwulan depan")
                  : t("Remove from plan", "Hapus dari rencana")
                : running
                  ? t("Keep running", "Tetap jalankan")
                  : idle(current.id)
                    ? t("Reactivate", "Aktifkan lagi")
                    : t("Add to plan", "Tambah ke rencana")}
          </button>
        </footer>
      )}
    </div>
  );
}
