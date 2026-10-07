import { campaignGoals, campaignVerdict } from "./engine/economy/goals";
import type { QuarterGame } from "./engine/economy/types";
import { number } from "./components";
import { useLanguage } from "./i18n";

export function CampaignGoals({ game }: { game: QuarterGame }) {
  const language = useLanguage();
  const goals = campaignGoals(game);
  const achieved = goals.filter((goal) => goal.met).length;
  const final = game.simulation.month >= 60;
  return (
    <section data-testid="campaign-goals">
      <h3>
        {language === "en"
          ? "Your five-year mandate"
          : "Mandat lima tahun Anda"}
      </h3>
      <p>
        {language === "en"
          ? `${achieved} of ${goals.length} goals met. ${
              final
                ? `${campaignVerdict(achieved).en}.`
                : "Meet all six together by the end of year five. Progress can reverse."
            }`
          : `${achieved} dari ${goals.length} target tercapai. ${
              final
                ? `${campaignVerdict(achieved).id}.`
                : "Capai keenamnya bersama pada akhir tahun kelima. Kemajuan bisa berbalik."
            }`}
      </p>
      <table className="eco-data-table">
        <thead>
          <tr>
            <th scope="col">{language === "en" ? "Goal" : "Target"}</th>
            <th scope="col">{language === "en" ? "Current" : "Saat ini"}</th>
            <th scope="col">{language === "en" ? "Status" : "Status"}</th>
          </tr>
        </thead>
        <tbody>
          {goals.map((goal) => (
            <tr key={goal.id}>
              <th scope="row">
                {goal.label[language]}
                <small className="eco-goal-target">
                  {goal.target[language]}
                </small>
              </th>
              <td>
                {number(goal.value, goal.unit === "count" ? 0 : 1)}
                {goal.unit === "percent"
                  ? "%"
                  : goal.unit === "points"
                    ? language === "en"
                      ? " pts"
                      : " poin"
                    : "/5"}
              </td>
              <td>
                {goal.met
                  ? language === "en"
                    ? "Met"
                    : "Tercapai"
                  : language === "en"
                    ? final
                      ? "Missed"
                      : "In progress"
                    : "Belum tercapai"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        {language === "en"
          ? "Targets are game challenges. Growing population adds workers and service demand; income measures purchasing power per person."
          : "Target merupakan tantangan permainan. Pertumbuhan penduduk menambah pekerja dan kebutuhan layanan; pendapatan mengukur daya beli per orang."}
      </p>
    </section>
  );
}
