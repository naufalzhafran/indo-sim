import { useEffect, useId, useRef, useState } from "react";
import { StatHelp } from "./StatHelp";
import { RegionRelationships } from "./RegionRelationships";
import { RegionConstruction } from "./RegionConstruction";
import { money, number } from "./components";
import { useLanguage } from "./i18n";
import { regionForProvince } from "./engine/gameRegions";
import {
  foundationNames,
  industries,
  industryById,
  policies,
} from "./engine/economy/catalog";
import { summarizeEconomyRegions } from "./engine/economy/engine";
import {
  FOUNDATIONS,
  type Bilingual,
  type Foundation,
  type IndustryId,
  type PolicyId,
  type QuarterGame,
  type QuarterPlan,
  type RegionId,
} from "./engine/economy/types";

type Props = {
  game: QuarterGame;
  plan: QuarterPlan;
  selected: RegionId;
  onSelect: (id: RegionId) => void;
  list: boolean;
  onList: (list: boolean) => void;
  onPolicy: (id: PolicyId) => void;
};

const foundationHelp: Record<Foundation, Bilingual> = {
  education: {
    en: "School access, teaching quality and workforce skills. Access improves first; skilled workers and industry gains take several quarters or years.",
    id: "Akses sekolah, kualitas pengajaran, dan keterampilan tenaga kerja. Akses membaik lebih dahulu; tenaga terampil dan manfaat industri memerlukan beberapa triwulan atau tahun.",
  },
  infrastructure: {
    en: "Transport, water and digital connections. Better infrastructure helps businesses reach markets and households reach public services.",
    id: "Transportasi, air, dan koneksi digital. Infrastruktur yang lebih baik membantu usaha menjangkau pasar dan keluarga menjangkau layanan publik.",
  },
  energy: {
    en: "Usable electricity supply and reliability. Business expansion increases demand, so new capacity must keep pace.",
    id: "Pasokan listrik yang dapat digunakan dan keandalannya. Perluasan usaha menambah permintaan, sehingga kapasitas baru harus mengimbanginya.",
  },
  food: {
    en: "Food availability, affordability and nutrition. Agriculture, fishing, distribution and household income all contribute.",
    id: "Ketersediaan, keterjangkauan, dan gizi pangan. Pertanian, perikanan, distribusi, serta pendapatan keluarga ikut berperan.",
  },
  health: {
    en: "Access to healthcare and population health. Nutrition, clean water and care support a healthier workforce.",
    id: "Akses layanan kesehatan dan kesehatan penduduk. Gizi, air bersih, serta perawatan mendukung tenaga kerja yang lebih sehat.",
  },
};

function Delta({ value }: { value: number }) {
  return (
    <span
      className="eco-delta"
      data-direction={value > 0.005 ? "up" : value < -0.005 ? "down" : "flat"}
    >
      {value > 0.005 ? "+" : ""}
      {number(Math.abs(value) < 0.005 ? 0 : value, 2)}
    </span>
  );
}

export function EconomyRegions({
  game,
  plan,
  selected,
  onSelect,
  list,
  onList,
  onPolicy,
}: Props) {
  const language = useLanguage();
  const t = (en: string, id: string) => (language === "id" ? id : en);
  const regions = summarizeEconomyRegions(game);
  const region = regions.find((item) => item.id === selected) ?? regions[0];
  const previous = game.receipt?.regionsBefore.find(
    (item) => item.id === region.id,
  );
  const [view, setView] = useState<
    "relationships" | "industries" | "construction"
  >("relationships");
  const [industry, setIndustry] = useState<IndustryId | null>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const industryTrigger = useRef<IndustryId | null>(null);
  const industryListPosition = useRef(0);
  const instanceId = useId();
  useEffect(() => {
    industryTrigger.current = null;
    if (panel.current) panel.current.scrollTop = 0;
    setIndustry(null);
  }, [selected]);
  useEffect(() => {
    if (industry) {
      detailHeading.current
        ?.closest("section")
        ?.scrollIntoView({ block: "start" });
      detailHeading.current?.focus({ preventScroll: true });
    } else if (industryTrigger.current) {
      if (panel.current) panel.current.scrollTop = industryListPosition.current;
      panel.current
        ?.querySelector<HTMLButtonElement>(
          `[data-industry="${industryTrigger.current}"]`,
        )
        ?.focus({ preventScroll: true });
    }
  }, [industry]);
  const regionHeading = useRef<HTMLHeadingElement>(null);
  const previousList = useRef(list);
  useEffect(() => {
    if (list === previousList.current) return;
    previousList.current = list;
    if (panel.current) panel.current.scrollTop = 0;
    if (list)
      panel.current
        ?.querySelector<HTMLButtonElement>(`[data-region-card="${selected}"]`)
        ?.focus({ preventScroll: true });
    else regionHeading.current?.focus({ preventScroll: true });
  }, [list, selected]);
  const openIndustry = (id: IndustryId) => {
    industryListPosition.current = panel.current?.scrollTop ?? 0;
    industryTrigger.current = id;
    setIndustry(id);
  };
  const definition = industry ? industryById[industry] : null;
  const state = industry ? region.industries[industry] : null;
  const beforeIndustry = industry ? previous?.industries[industry] : undefined;
  const impactedPolicies = industry
    ? policies.filter(
        (policy) =>
          plan.policies.includes(policy.id) &&
          policy.impacts.some(
            (impact) =>
              impact.target === industry ||
              (FOUNDATIONS.includes(impact.target as Foundation) &&
                definition!.essential.includes(impact.target as Foundation)),
          ),
      )
    : [];
  const strongest = definition
    ? [...FOUNDATIONS].sort(
        (a, b) => definition.weights[b] - definition.weights[a],
      )
    : [];

  if (list)
    return (
      <div className="eco-regions-panel eco-scroll-panel" ref={panel}>
        <header className="eco-region-list-heading">
          <h2>{t("Nine regions", "Sembilan wilayah")}</h2>
          <p>
            {t(
              "Choose a region to see construction progress, foundations, industries and funded policies.",
              "Pilih wilayah untuk melihat progres pembangunan, fondasi, industri, dan kebijakan yang didanai.",
            )}
          </p>
        </header>
        <ul className="eco-region-cards">
          {regions.map((item) => {
            const weakest = [...FOUNDATIONS].sort(
              (a, b) => item.foundations[a] - item.foundations[b],
            )[0];
            const name = language === "id" ? item.nameId : item.name;
            const localProjects = game.simulation.projects.filter(
              (project) => regionForProvince(project.province)?.id === item.id,
            );
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className="eco-region-card"
                  data-region-card={item.id}
                  data-selected={item.id === selected}
                  onClick={() => {
                    onSelect(item.id);
                    onList(false);
                  }}
                >
                  <strong className="eco-region-card-name">{name}</strong>
                  <span className="eco-region-card-output">
                    {money(item.gdp)}
                    <small>{t(" per year", " per tahun")}</small>
                  </span>
                  <span className="eco-region-card-stats">
                    <span>
                      {number(item.population, 1)} {t("m people", "jt jiwa")}
                    </span>
                    <span>
                      {t("Jobless", "Pengangguran")}{" "}
                      {number(item.unemployment, 1)}%
                    </span>
                    <span>
                      {t("Poverty", "Kemiskinan")} {number(item.poverty, 1)}%
                    </span>
                  </span>
                  <span className="eco-region-card-construction">
                    {t("Construction", "Pembangunan")}:{" "}
                    {
                      localProjects.filter((project) => !project.completed)
                        .length
                    }{" "}
                    {t("unfinished", "belum selesai")} ·{" "}
                    {
                      localProjects.filter((project) => project.completed)
                        .length
                    }{" "}
                    {t("completed", "selesai")}
                  </span>
                  <span className="eco-region-card-weak">
                    {t("Weakest: ", "Terlemah: ")}
                    {foundationNames[weakest][language]}{" "}
                    {number(item.foundations[weakest], 1)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );

  return (
    <div className="eco-regions-panel eco-scroll-panel" ref={panel}>
      <header className="eco-region-heading">
        <div>
          <p className="eco-kicker">
            {t("Regional economy", "Ekonomi wilayah")}
          </p>
          <h2 tabIndex={-1} ref={regionHeading}>
            {language === "id" ? region.nameId : region.name}
          </h2>
        </div>
      </header>
      <dl className="eco-region-metrics">
        <div>
          <dt>{t("Population", "Penduduk")}</dt>
          <dd>
            {number(region.population, 2)} {t("million", "juta")}
          </dd>
        </div>
        <div>
          <dt>
            <StatHelp
              label={t("Annual output", "Output tahunan")}
              description={t(
                "Industry value added sums to regional GDP. Intermediate inputs are not counted twice.",
                "Nilai tambah industri dijumlahkan menjadi PDRB wilayah. Bahan antara tidak dihitung dua kali.",
              )}
            />
          </dt>
          <dd>{money(region.gdp)}</dd>
        </div>
        <div>
          <dt>{t("Unemployment", "Pengangguran")}</dt>
          <dd>{number(region.unemployment, 1)}%</dd>
        </div>
        <div>
          <dt>{t("Poverty", "Kemiskinan")}</dt>
          <dd>{number(region.poverty, 1)}%</dd>
        </div>
      </dl>
      <section
        className="eco-foundations"
        aria-labelledby={`${instanceId}-foundations`}
      >
        <div className="eco-section-heading">
          <h3 id={`${instanceId}-foundations`}>
            {t("Regional foundations", "Fondasi wilayah")}
          </h3>
          <span>
            {previous
              ? t(
                  "Score / 100 · change this quarter",
                  "Skor / 100 · perubahan triwulan ini",
                )
              : t("Opening scores / 100", "Skor awal / 100")}
          </span>
        </div>
        <div className="eco-foundation-strip">
          {FOUNDATIONS.map((foundation) => (
            <div className="eco-foundation" key={foundation}>
              <StatHelp
                label={foundationNames[foundation][language]}
                description={foundationHelp[foundation][language]}
              />
              <div className="eco-foundation-value">
                <strong>{number(region.foundations[foundation], 1)}</strong>
                {previous && (
                  <Delta
                    value={
                      region.foundations[foundation] -
                      previous.foundations[foundation]
                    }
                  />
                )}
              </div>
              <meter
                min={0}
                max={100}
                value={region.foundations[foundation]}
                aria-label={foundationNames[foundation][language]}
              />
            </div>
          ))}
        </div>
      </section>
      <div
        className="eco-filter-row eco-region-tabs"
        aria-label={t("Regional information", "Informasi wilayah")}
      >
        {(["relationships", "industries", "construction"] as const).map(
          (tab) => (
            <button
              type="button"
              key={tab}
              aria-pressed={view === tab}
              onClick={() => {
                setView(tab);
                setIndustry(null);
              }}
            >
              {tab === "relationships"
                ? t("Relationships", "Hubungan")
                : tab === "industries"
                  ? t("Industries", "Industri")
                  : t("Construction", "Pembangunan")}
            </button>
          ),
        )}
      </div>
      {view === "relationships" && (
        <RegionRelationships
          key={region.id}
          game={game}
          plan={plan}
          regionId={region.id}
          onPolicy={onPolicy}
        />
      )}
      {view === "industries" &&
        (definition && state && industry ? (
          <section className="eco-industry-detail">
            <button
              type="button"
              className="eco-back"
              onClick={() => setIndustry(null)}
            >
              {t("Back to industries", "Kembali ke industri")}
            </button>
            <h3 tabIndex={-1} ref={detailHeading}>
              {definition.name[language]}
            </h3>
            <dl className="eco-region-metrics">
              <div>
                <dt>{t("Annual value added", "Nilai tambah tahunan")}</dt>
                <dd>{money(state.output)}</dd>
              </div>
              <div>
                <dt>{t("Jobs", "Pekerjaan")}</dt>
                <dd>
                  {number(state.jobs, 2)} {t("million", "juta")}
                </dd>
              </div>
              <div>
                <dt>{t("Change this quarter", "Perubahan triwulan ini")}</dt>
                <dd>
                  {beforeIndustry && beforeIndustry.output > 0 ? (
                    <>
                      <Delta
                        value={(state.output / beforeIndustry.output - 1) * 100}
                      />
                      %
                    </>
                  ) : (
                    t("Opening", "Awal")
                  )}
                </dd>
              </div>
              <div data-constraint>
                <dt>{t("Main constraint", "Kendala utama")}</dt>
                <dd>{foundationNames[state.bottleneck][language]}</dd>
              </div>
            </dl>
            <p className="eco-industry-tip">
              {t(
                "Output responds to foundations, demand, investment and available workers. A stronger foundation raises potential; it does not guarantee immediate growth.",
                "Output merespons fondasi, permintaan, investasi, dan ketersediaan pekerja. Fondasi yang lebih kuat meningkatkan potensi; pertumbuhan tidak langsung terjamin.",
              )}
            </p>
            <h3>
              {t("Foundation dependencies", "Ketergantungan pada fondasi")}
            </h3>
            <ul className="eco-industry-requirements">
              {strongest.map((foundation) => (
                <li
                  key={foundation}
                  data-essential={definition.essential.includes(foundation)}
                >
                  <div className="eco-requirement-heading">
                    <StatHelp
                      label={foundationNames[foundation][language]}
                      description={foundationHelp[foundation][language]}
                    />
                    <span className="eco-requirement-role">
                      {definition.essential.includes(foundation)
                        ? t("Key requirement", "Kebutuhan utama")
                        : t("Supporting", "Pendukung")}
                    </span>
                    <span className="eco-requirement-weight">
                      {t("Sensitivity", "Kepekaan")}:{" "}
                      {number(definition.weights[foundation] * 100, 1)}%
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="eco-impact-note">
              {t(
                "Sensitivities are simulation weights, not measured real-world estimates.",
                "Kepekaan adalah bobot simulasi, bukan estimasi hasil pengukuran dunia nyata.",
              )}
            </p>
            <h3>
              {t(
                "Income, investment and tax links",
                "Pendapatan, investasi, dan pajak",
              )}
            </h3>
            <dl className="eco-industry-accounts">
              <div>
                <dt>
                  {t("Annual labor income", "Pendapatan pekerja tahunan")}
                </dt>
                <dd>{money(state.laborIncome)}</dd>
              </div>
              <div>
                <dt>{t("Annual business profits", "Laba usaha tahunan")}</dt>
                <dd>{money(state.profits)}</dd>
              </div>
              <div>
                <dt>{t("Private investment", "Investasi swasta")}</dt>
                <dd>{money(state.investment)}</dd>
              </div>
              <div>
                <dt>{t("Import exposure", "Ketergantungan impor")}</dt>
                <dd>{number(definition.importShare * 100, 0)}%</dd>
              </div>
              <div>
                <dt>{t("Export exposure", "Ketergantungan ekspor")}</dt>
                <dd>{number(definition.exportShare * 100, 0)}%</dd>
              </div>
            </dl>
            <p>
              {t(
                "Worker earnings contribute to income tax. Positive business profits contribute to corporate tax; consumption contributes to VAT. Taxes affect take-home income, investment and purchasing power in the next economic cycle.",
                "Pendapatan pekerja menjadi dasar pajak penghasilan. Laba usaha positif menjadi dasar pajak badan; konsumsi menjadi dasar PPN. Pajak memengaruhi pendapatan bersih, investasi, dan daya beli pada siklus ekonomi berikutnya.",
              )}
            </p>
            <h3>
              {t(
                "Related policies in your plan",
                "Kebijakan terkait dalam rencana",
              )}
            </h3>
            {impactedPolicies.length ? (
              <ul className="eco-policy-links">
                {impactedPolicies.map((policy) => (
                  <li key={policy.id}>
                    <button type="button" onClick={() => onPolicy(policy.id)}>
                      {policy.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="eco-muted">
                {t(
                  "No related policy is currently in your plan. Browse Policies to address this industry’s constraints.",
                  "Belum ada kebijakan terkait dalam rencana. Telusuri Kebijakan untuk menangani kendala industri ini.",
                )}
              </p>
            )}
          </section>
        ) : (
          <section>
            <div className="eco-section-heading">
              <h3>{t("Business industries", "Industri usaha")}</h3>
              <span>
                {t(
                  "Select an industry to inspect its drivers",
                  "Pilih industri untuk melihat faktor penggeraknya",
                )}
              </span>
            </div>
            <table className="eco-data-table eco-industry-table">
              <thead>
                <tr>
                  <th scope="col">{t("Industry", "Industri")}</th>
                  <th scope="col">{t("Annual output", "Output tahunan")}</th>
                  <th scope="col">{t("Jobs (m)", "Pekerjaan (jt)")}</th>
                  <th scope="col">
                    {t("Quarter change", "Perubahan triwulan")}
                  </th>
                  <th scope="col">{t("Constraint", "Kendala")}</th>
                </tr>
              </thead>
              <tbody>
                {industries
                  .filter((item) => item.id !== "publicServices")
                  .map((item) => {
                    const value = region.industries[item.id];
                    const before = previous?.industries[item.id];
                    return (
                      <tr key={item.id}>
                        <th scope="row">
                          <button
                            type="button"
                            className="eco-industry-button"
                            data-industry={item.id}
                            onClick={() => openIndustry(item.id)}
                          >
                            {item.name[language]}
                          </button>
                        </th>
                        <td>{money(value.output)}</td>
                        <td>{number(value.jobs, 2)}</td>
                        <td>
                          {before && before.output > 0 ? (
                            <>
                              <Delta
                                value={(value.output / before.output - 1) * 100}
                              />
                              %
                            </>
                          ) : (
                            t("Opening", "Awal")
                          )}
                        </td>
                        <td>{foundationNames[value.bottleneck][language]}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            <div className="eco-public-services">
              <div>
                <h3>{industryById.publicServices.name[language]}</h3>
                <p>
                  {t(
                    "Included separately in regional GDP and jobs. Public services do not create corporate profits.",
                    "Dihitung terpisah dalam PDRB dan pekerjaan wilayah. Layanan publik tidak menghasilkan laba usaha.",
                  )}
                </p>
              </div>
              <strong>
                {money(region.industries.publicServices.output)}
                <small>
                  {number(region.industries.publicServices.jobs, 2)}{" "}
                  {t("million jobs", "juta pekerjaan")}
                </small>
              </strong>
            </div>
          </section>
        ))}
      {view === "construction" && (
        <RegionConstruction game={game} regionId={region.id} />
      )}
    </div>
  );
}
