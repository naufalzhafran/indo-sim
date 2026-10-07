import { money, number } from "./components";
import { useLanguage } from "./i18n";
import { regionForProvince } from "./engine/gameRegions";
import type { QuarterGame, RegionId } from "./engine/economy/types";

export function RegionConstruction({
  game,
  regionId,
}: {
  game: QuarterGame;
  regionId: RegionId;
}) {
  const language = useLanguage();
  const t = (en: string, id: string) => (language === "id" ? id : en);
  const projects = game.simulation.projects.filter(
    (project) => regionForProvince(project.province)?.id === regionId,
  );
  return (
    <section
      className="eco-construction"
      aria-label={t("Construction", "Pembangunan")}
    >
      <div className="eco-section-heading">
        <h3>{t("Construction", "Pembangunan")}</h3>
        <span>
          {projects.length} {t("projects", "proyek")}
        </span>
      </div>
      {projects.length ? (
        <ul className="eco-construction-list">
          {projects.map((project) => (
            <li key={project.id} data-project={project.id}>
              <div className="eco-construction-heading">
                <strong>{project.name}</strong>
                <span>
                  {project.completed
                    ? t("Completed", "Selesai")
                    : project.paused
                      ? t("Paused", "Dijeda")
                      : t("Under construction", "Dalam pembangunan")}
                </span>
              </div>
              <div className="eco-construction-progress">
                <progress
                  max={100}
                  value={project.progress}
                  aria-label={`${t("Construction progress", "Progres pembangunan")}: ${project.name}`}
                />
                <strong>
                  {number(
                    project.completed ? 100 : Math.min(99.9, project.progress),
                    1,
                  )}
                  %
                </strong>
              </div>
              <p>
                {t("Spent", "Dana tersalurkan")}: {money(project.spent)} /{" "}
                {money(project.cost)}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="eco-muted">
          {t("No construction projects yet.", "Belum ada proyek pembangunan.")}
        </p>
      )}
    </section>
  );
}
