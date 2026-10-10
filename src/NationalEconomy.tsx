import { useRef, useState } from "react";
import { money, number } from "./components";
import { StatHelp } from "./StatHelp";
import { EconomyEmblem } from "./EconomyEmblem";
import { useLanguage } from "./i18n";
import { activeIds, aggregate } from "./engine/economy/engine";
import {
  foundationNames,
  industries,
  industryById,
  policies,
} from "./engine/economy/catalog";
import { starterPolicies } from "./engine/economy/policyGoals";
import {
  FOUNDATIONS,
  type Foundation,
  type IndustryId,
  type PolicyId,
  type QuarterGame,
  type QuarterPlan,
} from "./engine/economy/types";

export function NationalEconomy({
  game,
  onPolicies,
  plan,
}: {
  game: QuarterGame;
  onPolicies: (id?: PolicyId) => void;
  plan: QuarterPlan;
}) {
  const language = useLanguage();
  const t = (en: string, id: string) => (language === "id" ? id : en);
  const [selected, setSelected] = useState<IndustryId>("manufacturing");
  const relationshipHeading = useRef<HTMLHeadingElement>(null);
  const [tab, setTab] = useState<"connections" | "policies">("connections");
  const [policyTarget, setPolicyTarget] = useState<Foundation | IndustryId>(
    "manufacturing",
  );
  const [policyFilter, setPolicyFilter] = useState<
    "direct" | "constraint" | "active" | "plan"
  >("direct");
  const policyHeading = useRef<HTMLHeadingElement>(null);
  const isFoundation = FOUNDATIONS.includes(policyTarget as Foundation);
  const targetName = isFoundation
    ? foundationNames[policyTarget as Foundation][language]
    : industryById[policyTarget as IndustryId].name[language];
  const active = activeIds(game);
  const directPolicies = policies.filter((policy) =>
    policy.impacts.some((impact) => impact.target === policyTarget),
  );
  const chooseIndustry = (id: IndustryId) => {
    setSelected(id);
    setPolicyTarget(id);
    if (tab === "policies")
      policyHeading.current?.focus({ preventScroll: true });
    else focusRelationship();
  };
  const focusRelationship = () =>
    relationshipHeading.current?.focus({ preventScroll: true });
  const national = aggregate(game);
  const totals = industries.map((definition) => {
    const states = game.simulation.provinces.map(
      (p) => p.industries[definition.id],
    );
    const sum = (
      key: "output" | "jobs" | "laborIncome" | "profits" | "investment",
    ) => states.reduce((total, state) => total + state[key], 0);
    const output = sum("output");
    const constraints = FOUNDATIONS.map((key) => ({
      key,
      output: states.reduce(
        (total, state) => total + (state.bottleneck === key ? state.output : 0),
        0,
      ),
    })).sort((a, b) => b.output - a.output);
    const previous = game.receipt?.regionsBefore.reduce(
      (total, region) => total + region.industries[definition.id].output,
      0,
    );
    return {
      id: definition.id,
      output,
      jobs: sum("jobs"),
      income: sum("laborIncome"),
      profits: sum("profits"),
      investment: sum("investment"),
      readiness:
        states.reduce(
          (total, state) => total + state.readiness * state.output,
          0,
        ) / Math.max(output, 0.000001),
      constraint: constraints[0].key,
      change: previous ? (output / previous - 1) * 100 : null,
    };
  });
  const state = totals.find((item) => item.id === selected)!;
  const definition = industryById[selected];
  const constraintPolicies = isFoundation
    ? []
    : policies.filter((policy) =>
        policy.impacts.some((impact) => impact.target === state.constraint),
      );
  const relatedPolicies = policies.filter(
    (policy) =>
      directPolicies.includes(policy) ||
      (!isFoundation &&
        policy.impacts.some((impact) => impact.target === state.constraint)),
  );
  const activePolicies = relatedPolicies.filter((policy) =>
    active.includes(policy.id),
  );
  const plannedPolicies = relatedPolicies.filter(
    (policy) =>
      plan.policies.includes(policy.id) && !active.includes(policy.id),
  );
  const visiblePolicies =
    policyFilter === "plan"
      ? plannedPolicies
      : policyFilter === "active"
        ? activePolicies
        : policyFilter === "constraint" && !isFoundation
          ? constraintPolicies
          : directPolicies;
  // One clear starting point: the weakest national foundation and the
  // largest industries it currently holds back.
  const weakest = [...FOUNDATIONS].sort((a, b) => national[a] - national[b])[0];
  const constrained = totals
    .filter((item) => item.constraint === weakest)
    .sort((a, b) => b.output - a.output);
  const heldBack = (
    constrained.length
      ? constrained
      : [...totals].sort(
          (a, b) =>
            industryById[b.id].weights[weakest] -
            industryById[a.id].weights[weakest],
        )
  )
    .slice(0, 2)
    .map((item) => industryById[item.id].name[language]);
  const foundationHelp = {
    education: t(
      "School access and teaching quality improve before workforce skills reach businesses. Industry uses skills accumulated over time.",
      "Akses sekolah dan kualitas pengajaran membaik sebelum keterampilan pekerja menjangkau usaha. Industri menggunakan keterampilan yang terkumpul seiring waktu.",
    ),
    infrastructure: t(
      "Transport, water and digital connections help businesses reach markets and households reach services.",
      "Transportasi, air, dan koneksi digital membantu usaha menjangkau pasar dan keluarga menjangkau layanan.",
    ),
    energy: t(
      "Electricity access and grid reliability. Industry expansion increases demand, so power supply must keep pace.",
      "Akses listrik dan keandalan jaringan. Perluasan industri menambah permintaan, sehingga pasokan harus mengimbanginya.",
    ),
    food: t(
      "Food availability, affordability and nutrition depend on production, distribution and household income.",
      "Ketersediaan, keterjangkauan, dan gizi pangan bergantung pada produksi, distribusi, dan pendapatan keluarga.",
    ),
    health: t(
      "Healthcare access and population health. Nutrition, clean water and care support a healthier workforce.",
      "Akses layanan kesehatan dan kesehatan penduduk. Gizi, air bersih, dan perawatan mendukung tenaga kerja yang lebih sehat.",
    ),
  };

  // A beginner-friendly next step: a policy that raises the weakest foundation.
  const remedy =
    policies.find(
      (p) => p.category === weakest && starterPolicies.includes(p.id),
    ) ?? policies.find((p) => p.category === weakest);
  return (
    <div className="national-economy">
      <section aria-labelledby="national-foundations-heading">
        <div className="national-section-heading">
          <h2 id="national-foundations-heading">
            <span className="national-step" aria-hidden="true">
              1
            </span>
            {t("National foundations", "Fondasi nasional")}
          </h2>
          <p className="national-start">
            <strong>{t("Start here:", "Mulai dari sini:")}</strong>{" "}
            {t(
              `${foundationNames[weakest].en} ${number(national[weakest])} is your weakest foundation. It holds back ${heldBack.join(" and ")}.`,
              `${foundationNames[weakest].id} ${number(national[weakest])} adalah fondasi terlemah. Ini menghambat ${heldBack.join(" dan ")}.`,
            )}
            {remedy &&
              t(
                ` ${remedy.name} is one policy that raises it.`,
                ` ${remedy.name} adalah salah satu kebijakan yang menaikkannya.`,
              )}
          </p>
          <span>
            {t("Population-weighted · /100", "Berbobot penduduk · /100")}
          </span>
        </div>
        <div className="national-foundations">
          {FOUNDATIONS.map((key) => {
            const change = game.receipt
              ? national[key] - game.receipt.before[key]
              : null;
            return (
              <div key={key}>
                <div className="national-foundation-stat">
                  <StatHelp
                    label={foundationNames[key][language]}
                    description={foundationHelp[key]}
                  />
                  <button
                    className="national-foundation-value"
                    type="button"
                    aria-pressed={tab === "policies" && policyTarget === key}
                    aria-controls="national-policy-effects"
                    aria-label={`${foundationNames[key][language]}: ${number(national[key])}. ${t("Show policy effects", "Lihat dampak kebijakan")}`}
                    onClick={() => {
                      setPolicyTarget(key);
                      setPolicyFilter("direct");
                      setTab("policies");
                    }}
                  >
                    <EconomyEmblem kind={key} />
                    <strong>{number(national[key])}</strong>
                    <small>
                      {change === null
                        ? t("Opening", "Awal")
                        : `${change >= 0 ? "+" : ""}${number(change)}`}
                    </small>
                  </button>
                  <meter
                    min={0}
                    max={100}
                    value={national[key]}
                    aria-label={foundationNames[key][language]}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="national-board">
        <section
          className="national-industry-library"
          aria-labelledby="national-industries-heading"
        >
          <div className="national-section-heading">
            <h2 id="national-industries-heading" tabIndex={-1}>
              <span className="national-step" aria-hidden="true">
                2
              </span>
              {t("Industries", "Industri")}
            </h2>
            <span>
              {industries.length} {t("industries", "industri")}
            </span>
          </div>
          <p className="national-roster-hint">
            {t(
              "Select an industry to trace its connections.",
              "Pilih industri untuk melihat hubungannya.",
            )}
          </p>
          <div className="national-industry-roster">
            {totals.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={selected === item.id}
                aria-controls="national-relationship"
                onClick={() => {
                  chooseIndustry(item.id);
                }}
              >
                <span className="national-roster-title">
                  <EconomyEmblem kind={item.id} />
                  <span>{industryById[item.id].name[language]}</span>
                </span>
                <strong>{money(item.output)}</strong>
                <small>
                  {number(item.jobs, 1)} {t("million jobs", "juta pekerjaan")}
                </small>
                {selected === item.id && (
                  <span className="national-selected-mark" aria-hidden="true">
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>
        <div className="national-detail-workspace">
          <div
            className="national-view-tabs"
            role="tablist"
            aria-label={t("Economy details", "Rincian ekonomi")}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight")
                return;
              event.preventDefault();
              const next = tab === "connections" ? "policies" : "connections";
              setTab(next);
              event.currentTarget
                .querySelector<HTMLButtonElement>(`[data-view="${next}"]`)
                ?.focus();
            }}
          >
            <button
              type="button"
              role="tab"
              id="national-tab-connections"
              data-view="connections"
              aria-controls="national-relationship"
              aria-selected={tab === "connections"}
              tabIndex={tab === "connections" ? 0 : -1}
              onClick={() => setTab("connections")}
            >
              {t("Connections", "Hubungan")}
            </button>
            <button
              type="button"
              role="tab"
              id="national-tab-policies"
              data-view="policies"
              aria-controls="national-policy-effects"
              aria-selected={tab === "policies"}
              tabIndex={tab === "policies" ? 0 : -1}
              onClick={() => setTab("policies")}
            >
              {t("Policy effects", "Dampak kebijakan")}{" "}
              <span>{directPolicies.length}</span>
            </button>
          </div>
          <section
            id="national-relationship"
            className="national-relationship"
            role="tabpanel"
            aria-labelledby="national-tab-connections"
            hidden={tab !== "connections"}
          >
            <div className="national-section-heading">
              <h2
                id="national-links-heading"
                ref={relationshipHeading}
                tabIndex={-1}
              >
                <span className="national-step" aria-hidden="true">
                  3
                </span>
                {t("How your economy connects", "Hubungan dalam ekonomi Anda")}
              </h2>
            </div>
            <p className="national-intro">
              {t(
                "Foundations support production. Production creates income and investment.",
                "Fondasi mendukung produksi. Produksi menghasilkan pendapatan dan investasi.",
              )}
            </p>
            <div className="national-production-chain">
              <div className="national-inputs">
                <StatHelp
                  label={t(
                    "Foundation sensitivity",
                    "Kepekaan terhadap fondasi",
                  )}
                  description={t(
                    "Simulation weights show how strongly each foundation affects this industry’s potential. Essential foundations also apply a weakest-link limit. These are game assumptions, not measured estimates.",
                    "Bobot simulasi menunjukkan pengaruh setiap fondasi pada potensi industri ini. Fondasi utama juga membatasi melalui nilai terlemahnya. Ini asumsi permainan, bukan estimasi hasil pengukuran.",
                  )}
                />
                <ul>
                  {FOUNDATIONS.map((key) => (
                    <li key={key} data-constraint={key === state.constraint}>
                      <div className="national-input-heading">
                        <EconomyEmblem kind={key} />
                        <span>{foundationNames[key][language]}</span>
                        <strong>
                          {number(definition.weights[key] * 100, 1)}%
                        </strong>
                      </div>
                      <div className="national-weight-track" aria-hidden="true">
                        <span
                          style={{ width: `${definition.weights[key] * 100}%` }}
                        />
                      </div>
                      <small>
                        {definition.essential.includes(key)
                          ? t("Essential", "Utama")
                          : t("Supporting", "Pendukung")}
                        {key === state.constraint
                          ? ` · ${t("Main constraint", "Kendala utama")}`
                          : ""}
                      </small>
                    </li>
                  ))}
                </ul>
              </div>
              <svg
                className="national-chain-lines"
                viewBox="0 0 36 310"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path d="M0 31H14V155H30M0 93H14M0 155H30M0 217H14V155M0 279H14V155" />
                <path d="m27 149 6 6-6 6" />
              </svg>
              <div className="national-industry-core">
                <div className="national-core-emblem">
                  <EconomyEmblem kind={selected} />
                </div>
                <span className="national-core-caption">
                  {t(
                    "Industry potential → production",
                    "Potensi industri → produksi",
                  )}
                </span>
                <h3 aria-live="polite">{definition.name[language]}</h3>
                <strong className="national-output">
                  {money(state.output)}
                </strong>
                <span>
                  {t("Annual output", "Output tahunan")} ·{" "}
                  {number((state.output / national.gdp) * 100)}%{" "}
                  {t("of economy", "dari ekonomi")}
                </span>
                <dl>
                  <div>
                    <dt>{t("Jobs", "Pekerjaan")}</dt>
                    <dd>
                      {number(state.jobs, 2)} {t("million", "juta")}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("Quarter change", "Perubahan triwulan")}</dt>
                    <dd>
                      {state.change === null
                        ? t("Opening", "Awal")
                        : `${state.change >= 0 ? "+" : ""}${number(state.change)}%`}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <StatHelp
                        label={t("Readiness", "Kesiapan")}
                        description={t(
                          "Output-weighted average of local industry readiness. The simulation combines weighted foundations with the weakest essential foundation; workforce skills enter with a delay.",
                          "Rata-rata kesiapan industri lokal berbobot output. Simulasi menggabungkan bobot fondasi dengan fondasi utama terlemah; keterampilan pekerja berpengaruh secara bertahap.",
                        )}
                      />
                    </dt>
                    <dd>{number(state.readiness)} / 100</dd>
                  </div>
                </dl>
                <p className="national-constraint">
                  {t("Main regional constraint", "Kendala utama di wilayah")}:{" "}
                  <strong>{foundationNames[state.constraint][language]}</strong>
                </p>
              </div>
              <svg
                className="national-chain-lines national-chain-out"
                viewBox="0 0 36 310"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path d="M0 155H14V50H30M14 155H30M14 155V260H30" />
                <path d="m27 44 6 6-6 6m0 99 6 6-6 6m0 99 6 6-6 6" />
              </svg>
              <div className="national-rewards">
                <div>
                  <EconomyEmblem kind="income" />
                  <span>
                    {t("Worker income / year", "Pendapatan pekerja / tahun")}
                  </span>
                  <strong>{money(state.income)}</strong>
                  <small>
                    {t(
                      "Supports consumption & income tax",
                      "Mendukung konsumsi & pajak penghasilan",
                    )}
                  </small>
                </div>
                <div>
                  <EconomyEmblem kind="profits" />
                  <span>
                    {t("Business profits / year", "Laba usaha / tahun")}
                  </span>
                  <strong>{money(state.profits)}</strong>
                  <small>
                    {t(
                      "Positive profits form the corporate tax base",
                      "Laba positif menjadi dasar pajak badan",
                    )}
                  </small>
                </div>
                <div>
                  <EconomyEmblem kind="investment" />
                  <span>
                    {t("Private investment / year", "Investasi swasta / tahun")}
                  </span>
                  <strong>{money(state.investment)}</strong>
                  <small>
                    {t(
                      "Finances future industry capacity",
                      "Mendanai kapasitas industri mendatang",
                    )}
                  </small>
                </div>
              </div>
            </div>
            <p className="national-spillovers">
              {t(
                "Weights are game assumptions; the weakest essential foundation limits potential. Constraints reflect local output shares, not national scores.",
                "Bobot adalah asumsi permainan; fondasi utama terlemah membatasi potensi. Kendala mengikuti pangsa output lokal, bukan skor nasional.",
              )}{" "}
            </p>
            <div className="national-industry-links">
              <strong>{t("Industry support", "Dukungan antarindustri")}</strong>
              <div>
                {(
                  [
                    "finance",
                    "technology",
                    "logistics",
                    ...(selected === "manufacturing" ? ["agriculture"] : []),
                  ] as IndustryId[]
                ).map((id) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={id === selected}
                    onClick={() => {
                      chooseIndustry(id);
                    }}
                  >
                    <EconomyEmblem kind={id} />
                    {industryById[id].name[language]}
                  </button>
                ))}
              </div>
              <small>
                {t(
                  "These industries influence production in each region.",
                  "Industri ini memengaruhi produksi di setiap wilayah.",
                )}
              </small>
            </div>
          </section>
          <section
            className="national-policy-effects"
            id="national-policy-effects"
            role="tabpanel"
            aria-labelledby="national-tab-policies"
            hidden={tab !== "policies"}
          >
            <div className="national-policy-target">
              <EconomyEmblem kind={policyTarget} />
              <div>
                <h2 ref={policyHeading} tabIndex={-1}>
                  {targetName}
                </h2>
                <p>
                  {t(
                    "Policies that can affect this stat",
                    "Kebijakan yang dapat memengaruhi statistik ini",
                  )}
                </p>
              </div>
            </div>
            <div
              className="national-policy-filters"
              aria-label={t("Policy effect filter", "Filter dampak kebijakan")}
            >
              <button
                type="button"
                aria-pressed={policyFilter === "direct"}
                onClick={() => setPolicyFilter("direct")}
              >
                {t("Direct effects", "Dampak langsung")} (
                {directPolicies.length})
              </button>
              {!isFoundation && (
                <button
                  type="button"
                  aria-pressed={policyFilter === "constraint"}
                  onClick={() => setPolicyFilter("constraint")}
                >
                  {t("Via", "Melalui")}{" "}
                  {foundationNames[state.constraint][language]} (
                  {constraintPolicies.length})
                </button>
              )}
              <button
                type="button"
                aria-pressed={policyFilter === "active"}
                onClick={() => setPolicyFilter("active")}
              >
                {t("Active", "Aktif")} ({activePolicies.length})
              </button>
              <button
                type="button"
                aria-pressed={policyFilter === "plan"}
                onClick={() => setPolicyFilter("plan")}
              >
                {t("New planned", "Rencana baru")} ({plannedPolicies.length})
              </button>
            </div>
            <p className="national-policy-note">
              {policyFilter === "constraint" && !isFoundation
                ? t(
                    "These policies affect the current bottleneck foundation, which supports this industry indirectly.",
                    "Kebijakan ini memengaruhi fondasi yang menjadi kendala saat ini dan mendukung industri secara tidak langsung.",
                  )
                : t(
                    "Effects describe policy mechanisms, not a measured share of this quarter’s change. Funding and local conditions still matter.",
                    "Dampak menunjukkan mekanisme kebijakan, bukan bagian terukur dari perubahan triwulan ini. Pendanaan dan kondisi lokal tetap berperan.",
                  )}
            </p>
            <div className="national-policy-cards">
              {visiblePolicies.map((policy) => {
                const running = active.includes(policy.id),
                  planned = plan.policies.includes(policy.id);
                const status = running
                  ? planned
                    ? t("Active", "Aktif")
                    : t("Stopping next quarter", "Berhenti triwulan depan")
                  : planned
                    ? t(
                        "New planned · not active yet",
                        "Rencana baru · belum aktif",
                      )
                    : game.simulation.provinces.some(
                          (province) =>
                            (province.policyAssets[policy.id] ?? 0) > 0,
                        )
                      ? t("Previously funded", "Pernah didanai")
                      : t("Available", "Tersedia");
                return (
                  <article key={policy.id} data-policy={policy.id}>
                    <div className="national-policy-card-heading">
                      <h3>{policy.name}</h3>
                      <span data-running={running || planned}>{status}</span>
                    </div>
                    <div className="national-policy-stat-links">
                      {policy.impacts.map((impact, index) => (
                        <span
                          key={`${impact.target}-${index}`}
                          data-direction={impact.direction}
                          data-target={impact.target}
                        >
                          <EconomyEmblem kind={impact.target} />
                          <span>
                            {impact.direction === "up" ? "↑" : "↓"}{" "}
                            {FOUNDATIONS.includes(impact.target as Foundation)
                              ? foundationNames[impact.target as Foundation][
                                  language
                                ]
                              : industryById[impact.target as IndustryId].name[
                                  language
                                ]}
                            {impact.timing && (
                              <small>
                                {impact.timing === "delayed"
                                  ? t("Delayed", "Bertahap")
                                  : impact.timing === "initially"
                                    ? t("Initially", "Awalnya")
                                    : t("Later", "Kemudian")}
                              </small>
                            )}
                          </span>
                        </span>
                      ))}
                    </div>
                    <p>{policy.mechanism[language]}</p>
                    <button type="button" onClick={() => onPolicies(policy.id)}>
                      {t("View policy", "Lihat kebijakan")}
                    </button>
                  </article>
                );
              })}
              {!visiblePolicies.length && (
                <p className="national-policy-empty">
                  {policyFilter === "plan"
                    ? t(
                        "No new related policies are planned. Direct effects shows the available choices.",
                        "Belum ada rencana kebijakan baru terkait. Dampak langsung menampilkan pilihan yang tersedia.",
                      )
                    : policyFilter === "active"
                      ? t(
                          "No related policies are active.",
                          "Belum ada kebijakan terkait yang aktif.",
                        )
                      : t(
                          "No cataloged direct policy effect for this industry. Use the bottleneck filter to find policies that support its foundations.",
                          "Belum ada dampak kebijakan langsung dalam katalog untuk industri ini. Gunakan filter kendala untuk mencari kebijakan pendukung fondasinya.",
                        )}
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
