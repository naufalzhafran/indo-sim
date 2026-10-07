import { useId } from "react";
import { money, number } from "./components";
import { useLanguage } from "./i18n";
import { GAME_REGIONS } from "./engine/gameRegions";
import { projectBenefits } from "./engine/economy/projectBenefits";
import { projectCompletionRewards } from "./engine/economy/projectRewards";
import { PolicyIllustration } from "./PolicyIllustration";
import { eligibleRegions, industryById } from "./engine/economy/catalog";
import type {
  PolicyDefinition,
  PolicyId,
  QuarterGame,
} from "./engine/economy/types";

function ProjectRewards({
  policyId,
  granted = false,
  pending = false,
  campaignEnded = false,
  title = true,
}: {
  policyId: PolicyId;
  granted?: boolean;
  pending?: boolean;
  campaignEnded?: boolean;
  title?: boolean;
}) {
  const language = useLanguage();
  const t = (en: string, id: string) => (language === "id" ? id : en);
  const rewards = projectCompletionRewards[policyId];
  if (!rewards?.length) return null;
  return (
    <div
      className="eco-project-rewards"
      data-policy={policyId}
      data-granted={granted}
      data-pending={pending}
    >
      {title && (
        <strong className="eco-project-rewards-title">
          {granted
            ? t("Completion reward granted", "Bonus selesai diterapkan")
            : pending
              ? campaignEnded
                ? t("Reward not granted", "Bonus belum diterapkan")
                : t("Reward next quarter", "Bonus triwulan depan")
              : t("Permanent at 100% completion", "Permanen saat selesai 100%")}
        </strong>
      )}
      <ul>
        {rewards.map((reward) => (
          <li
            key={
              reward.target === "industryCapacity"
                ? reward.industry
                : reward.target
            }
            data-reward={
              reward.target === "industryCapacity"
                ? reward.industry
                : reward.target
            }
          >
            <span>{reward.label[language]}</span>
            <strong>
              +{number(reward.amount, 0)}
              {reward.unit === "percent" ? "%" : ` ${t("points", "poin")}`}
            </strong>
          </li>
        ))}
      </ul>
      <p className="eco-project-reward-scope">
        {pending && campaignEnded
          ? t(
              "The campaign has ended; this reward was not granted.",
              "Permainan sudah berakhir; bonus ini belum diterapkan.",
            )
          : granted
            ? t(
                "Granted once in this region and kept permanently.",
                "Diterapkan sekali di wilayah ini dan bertahan permanen.",
              )
            : t(
                "Granted once in the project's region and kept permanently.",
                "Diberikan sekali di wilayah proyek dan bertahan permanen.",
              )}
        {rewards.some((reward) => reward.unit === "points") &&
          t(" Scores cap at 100.", " Skor maksimal 100.")}
      </p>
    </div>
  );
}

export function PolicyProjects({
  policy,
  game,
  view,
}: {
  policy: PolicyDefinition;
  game: QuarterGame;
  view: "briefing" | "projects";
}) {
  const language = useLanguage();
  const t = (en: string, id: string) => (language === "id" ? id : en);
  const headingId = useId();
  const benefits = projectBenefits[policy.id];
  const regionCount = eligibleRegions(policy.id).length;
  const disruption = (policy.build?.disruption ?? []).map((item) =>
    item.target === "healthStatus"
      ? { en: "health", id: "kesehatan" }
      : {
          en: industryById[item.target].name.en.toLowerCase(),
          id: industryById[item.target].name.id.toLowerCase(),
        },
  );
  const running = Boolean(
    game.policies.find((item) => item.id === policy.id)?.active,
  );
  const projects = game.simulation.projects.filter(
    (project) => project.id.split(":")[0] === policy.id,
  );
  const completed = projects.filter((project) => project.completed).length;
  const paused = projects.filter(
    (project) => !project.completed && project.paused,
  ).length;
  const doneLabel =
    policy.kind === "facility"
      ? running
        ? t("in service", "beroperasi")
        : t("idle", "menganggur")
      : t("completed", "selesai");
  return (
    <section
      className="eco-policy-projects"
      aria-labelledby={headingId}
      data-testid={`policy-${view}`}
    >
      {view === "briefing" ? (
        <>
          <div className="eco-project-reward-visual">
            <PolicyIllustration kind={policy.impacts[0]?.target ?? "finance"} />
            <div>
              <h3 id={headingId}>
                {policy.kind === "build"
                  ? t(
                      `Builds in ${regionCount} regions`,
                      `Membangun di ${regionCount} wilayah`,
                    )
                  : policy.kind === "facility"
                    ? t(
                        `Builds facilities in ${regionCount} regions`,
                        `Membangun fasilitas di ${regionCount} wilayah`,
                      )
                    : t("Funds a programme", "Mendanai program")}
              </h3>
              <p className="eco-project-reward">
                {benefits
                  ? benefits.benefit[language]
                  : policy.mechanism[language]}
              </p>
            </div>
          </div>
          {policy.kind === "program" ? (
            <dl className="eco-project-briefing" data-stages="2">
              <div>
                <dt>{t("While running", "Selama berjalan")}</dt>
                <dd>
                  {t(
                    "Effects grow as funding is delivered. No construction is needed.",
                    "Dampak tumbuh seiring dana tersalur. Tidak perlu pembangunan.",
                  )}
                </dd>
              </div>
              <div className="eco-project-retained">
                <dt>{t("If stopped", "Jika dihentikan")}</dt>
                <dd>
                  {t(
                    "Spending ends and its effects fade over the following months.",
                    "Belanja berhenti dan dampaknya memudar dalam beberapa bulan berikutnya.",
                  )}
                </dd>
              </div>
            </dl>
          ) : (
            <dl className="eco-project-briefing" data-stages="3">
              <div>
                <dt>{t("During construction", "Saat dibangun")}</dt>
                <dd>
                  <span className="eco-stage-meter" aria-hidden="true">
                    <i />
                  </span>
                  {t(
                    "Construction jobs rise in each building region.",
                    "Lapangan kerja konstruksi naik di tiap wilayah pembangunan.",
                  )}
                  {disruption.length > 0 &&
                    t(
                      ` Temporary slowdown: ${disruption.map((item) => item.en).join(", ")}.`,
                      ` Gangguan sementara: ${disruption.map((item) => item.id).join(", ")}.`,
                    )}
                  {policy.kind === "build" &&
                    t(
                      " No benefit until a region's site is finished.",
                      " Belum ada manfaat sampai lokasi wilayah selesai.",
                    )}
                </dd>
              </div>
              {policy.kind === "build" ? (
                <div>
                  <dt>{t("At completion (100%)", "Saat selesai (100%)")}</dt>
                  <dd>
                    <ProjectRewards policyId={policy.id} title={false} />
                  </dd>
                </div>
              ) : (
                <div>
                  <dt>{t("When built & active", "Setelah jadi & aktif")}</dt>
                  <dd>
                    {t(
                      "Each finished region starts the service and its running cost.",
                      "Setiap wilayah yang selesai mulai menjalankan layanan dan biaya operasinya.",
                    )}
                  </dd>
                </div>
              )}
              <div className="eco-project-retained">
                <dt>
                  {policy.kind === "build"
                    ? t("Then", "Setelah itu")
                    : t("If deactivated", "Jika dinonaktifkan")}
                </dt>
                <dd>
                  <p>{benefits?.retained[language]}</p>
                  <p>
                    {t(
                      "Stopping before completion pauses unfinished sites; adding the policy again resumes them. No refund.",
                      "Menghentikan sebelum selesai menjeda lokasi yang belum jadi; menambahkan kebijakan lagi melanjutkannya. Tanpa pengembalian dana.",
                    )}
                  </p>
                </dd>
              </div>
            </dl>
          )}
        </>
      ) : (
        <>
          <div className="eco-section-heading">
            <h3 id={headingId}>
              {t("Regional construction", "Pembangunan wilayah")}
            </h3>
            <strong>
              {projects.length
                ? `${completed}/${projects.length} ${t("completed", "selesai")}`
                : t("Not started", "Belum dimulai")}
            </strong>
          </div>
          {projects.length ? (
            <>
              <div className="eco-project-counts">
                <span>
                  {projects.length - completed - paused}{" "}
                  {t("building", "dibangun")}
                </span>
                <span>
                  {paused} {t("paused", "dijeda")}
                </span>
                <span>
                  {completed} {doneLabel}
                </span>
              </div>
              <ul className="eco-project-grid">
                {projects.map((project) => {
                  const region = GAME_REGIONS.find((region) =>
                    region.provinceIds.includes(project.province),
                  );
                  const name = region
                    ? language === "id"
                      ? region.nameId
                      : region.name
                    : project.province;
                  const status = project.completed
                    ? policy.kind === "facility"
                      ? running
                        ? "service"
                        : "idle"
                      : "completed"
                    : project.paused
                      ? "paused"
                      : "building";
                  return (
                    <li
                      key={project.id}
                      data-project={project.id}
                      data-status={status}
                    >
                      <div className="eco-project-card-heading">
                        <strong>{name}</strong>
                        <span>
                          {status === "completed"
                            ? t("Completed", "Selesai")
                            : status === "service"
                              ? t("In service", "Beroperasi")
                              : status === "idle"
                                ? t("Idle", "Menganggur")
                                : status === "paused"
                              ? t("Paused", "Dijeda")
                              : t("Building", "Dibangun")}
                        </span>
                      </div>
                      <div className="eco-construction-progress">
                        <progress
                          max={100}
                          value={project.progress}
                          aria-label={`${name}: ${t("Construction progress", "Progres pembangunan")}`}
                        />
                        <strong>
                          {number(
                            project.completed
                              ? 100
                              : Math.min(99, project.progress),
                            0,
                          )}
                          %
                        </strong>
                      </div>
                      <p>
                        {t("Spent", "Tersalurkan")}{" "}
                        <b>{money(project.spent)}</b>
                        <span> / {money(project.cost)}</span>
                      </p>
                      {policy.kind === "build" && (
                        <ProjectRewards
                          policyId={policy.id}
                          granted={Boolean(project.completionRewardGranted)}
                          pending={
                            project.completed &&
                            !project.completionRewardGranted
                          }
                          campaignEnded={game.simulation.month >= 60}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="eco-impact-note">
                {policy.kind === "build"
                  ? t(
                      "Funding and local capacity determine progress. When every region is finished, the policy ends and its gains stay.",
                      "Pendanaan dan kapasitas setempat menentukan progres. Saat semua wilayah selesai, kebijakan berakhir dan manfaatnya tetap.",
                    )
                  : t(
                      "Funding and local capacity determine progress. Finished facilities serve only while the policy is active.",
                      "Pendanaan dan kapasitas setempat menentukan progres. Fasilitas yang selesai hanya melayani selama kebijakan aktif.",
                    )}
              </p>
            </>
          ) : (
            <div className="eco-project-empty">
              <strong>{t("Ready to build", "Siap dibangun")}</strong>
              <p>
                {t(
                  `Add this policy, then advance the quarter to start ${regionCount} regional sites. Set each region's share in Funding.`,
                  `Tambahkan kebijakan ini, lalu lanjutkan triwulan untuk memulai ${regionCount} lokasi wilayah. Atur bagian tiap wilayah di Pendanaan.`,
                )}
              </p>
              {policy.kind === "build" && (
                <ProjectRewards policyId={policy.id} />
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
