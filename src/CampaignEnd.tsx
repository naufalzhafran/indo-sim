import { useMemo } from "react";
import { aggregate } from "./engine/economy/engine";
import {
  campaignGoals,
  campaignVerdict,
  regionalAchievement,
} from "./engine/economy/goals";
import { FOUNDATIONS, type QuarterGame } from "./engine/economy/types";
import { foundationNames } from "./engine/economy/catalog";
import { useLanguage } from "./i18n";
import { Modal, number } from "./components";
import { REELECTION_APPROVAL } from "./engine/politics";

export function CampaignEnd({
  game,
  busy,
  error,
  onClose,
  onReport,
  onExport,
  onNew,
  onRetrySave,
}: {
  game: QuarterGame;
  busy: boolean;
  error: string;
  onClose: () => void;
  onReport: () => void;
  onExport: () => void;
  onNew: () => void;
  onRetrySave: () => void;
}) {
  const language = useLanguage();
  const t = (en: string, id: string) => (language === "en" ? en : id);
  const goals = campaignGoals(game);
  const achieved = goals.filter((goal) => goal.met).length;
  const now = aggregate(game);
  const opening = game.simulation.history[0];
  const regional = useMemo(() => regionalAchievement(game), [game]);
  const pct = (value: number) => `${number(value, 2)}%`;
  const points = (value: number) => `${number(value, 2)} / 100`;
  const funding =
    (game.receipt?.ledger.funding ?? game.simulation.ledger.funding) * 100;
  const improved = FOUNDATIONS.filter((key) => now[key] - opening[key] >= 3);
  const harmed = FOUNDATIONS.filter((key) => now[key] < opening[key] - 3);
  const evidence: Record<
    string,
    { start: string; end: string; detail: string }
  > = {
    income: {
      start: "100",
      end: number((now.realIncome / opening.realIncome) * 100, 2),
      detail: t(
        "Purchasing power index; target 115 or higher",
        "Indeks daya beli; target minimal 115",
      ),
    },
    poverty: {
      start: pct(opening.poverty),
      end: pct(now.poverty),
      detail: t(
        `${number(opening.poverty - now.poverty)} percentage points reduced`,
        `Turun ${number(opening.poverty - now.poverty)} poin persentase`,
      ),
    },
    jobs: {
      start: pct(opening.unemployment),
      end: pct(now.unemployment),
      detail: t(
        "Share of workers without a job",
        "Persentase angkatan kerja tanpa pekerjaan",
      ),
    },
    services: {
      start: "0 / 5",
      end: `${improved.length} / 5`,
      detail: harmed.length
        ? t(
            `Lost over 3 points: ${harmed.map((key) => foundationNames[key].en).join(", ")}`,
            `Turun lebih dari 3 poin: ${harmed.map((key) => foundationNames[key].id).join(", ")}`,
          )
        : t(
            "No foundation lost more than 3 points",
            "Tidak ada fondasi turun lebih dari 3 poin",
          ),
    },
    energy: {
      start: points(opening.energy),
      end: points(now.energy),
      detail: t(
        "Electricity access and reliability",
        "Akses dan keandalan listrik",
      ),
    },
    budget: {
      start: pct((100 * opening.debt) / (opening.gdp * opening.priceIndex)),
      end: pct((100 * now.debt) / (now.gdp * now.priceIndex)),
      detail: t(
        `Final-quarter funding: ${pct(funding)} / 98% required`,
        `Pendanaan triwulan terakhir: ${pct(funding)} / minimal 98%`,
      ),
    },
  };
  return (
    <Modal
      title={t("Your five-year results", "Hasil lima tahun Anda")}
      onClose={onClose}
      className="economy-dialog campaign-dialog campaign-end"
    >
      <article data-testid="campaign-end">
        <header className="campaign-verdict">
          <div>
            <p className="campaign-eyebrow">
              {t(
                "2025–2029 · Twenty quarters completed",
                "2025–2029 · Dua puluh triwulan selesai",
              )}
            </p>
            <h3>{campaignVerdict(achieved)[language]}</h3>
            <p>
              {t(
                "Your final results, evaluated together at the end of quarter 20.",
                "Hasil akhir Anda, dinilai bersama pada akhir triwulan ke-20.",
              )}
            </p>
          </div>
          <div className="campaign-score">
            <strong>
              {achieved}
              <span>/6</span>
            </strong>
            <span>{t("goals met", "target tercapai")}</span>
          </div>
        </header>
        <table className="campaign-checklist">
          <caption>
            {t("Your final mandate checklist", "Daftar hasil mandat Anda")}
          </caption>
          <thead>
            <tr>
              <th scope="col">{t("Goal & target", "Target & syarat")}</th>
              <th scope="col">{t("Start", "Awal")}</th>
              <th scope="col">{t("Final", "Akhir")}</th>
              <th scope="col">{t("Result", "Hasil")}</th>
            </tr>
          </thead>
          <tbody>
            {goals.map((goal) => (
              <tr key={goal.id} data-met={goal.met}>
                <th scope="row">
                  <strong>{goal.label[language]}</strong>
                  <small>{goal.target[language]}</small>
                  <small className="campaign-evidence">
                    {evidence[goal.id].detail}
                  </small>
                </th>
                <td>{evidence[goal.id].start}</td>
                <td>{evidence[goal.id].end}</td>
                <td>
                  <span className="campaign-goal-status">
                    <span aria-hidden="true">{goal.met ? "✓" : "○"}</span>
                    {goal.met
                      ? t("Met", "Tercapai")
                      : t("Missed", "Belum tercapai")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <section className="campaign-bonus" data-testid="regional-achievement">
          <div>
            <p className="campaign-eyebrow">
              {t("Optional achievement", "Pencapaian opsional")}
            </p>
            <h4>{t("No region left behind", "Tak ada wilayah tertinggal")}</h4>
            <p>
              {t(
                "Real income rises and poverty falls in every region. This does not change your six-goal verdict.",
                "Pendapatan riil naik dan kemiskinan turun di setiap wilayah. Ini tidak mengubah penilaian enam target utama.",
              )}
            </p>
          </div>
          <strong>
            {regional.count}/9 ·{" "}
            {regional.met
              ? t("Achieved", "Tercapai")
              : t("Unfinished", "Belum tuntas")}
          </strong>
          <ul>
            {regional.regions.map((region) => (
              <li key={region.id} data-met={region.met}>
                <span aria-hidden="true">{region.met ? "✓" : "○"}</span>
                {language === "en" ? region.name : region.nameId}
              </li>
            ))}
          </ul>
        </section>
        <section className="campaign-bonus" data-testid="reelection">
          <div>
            <p className="campaign-eyebrow">
              {t("Optional achievement", "Pencapaian opsional")}
            </p>
            <h4>{t("Re-election 2029", "Terpilih kembali 2029")}</h4>
            <p>
              {t(
                `Finish the term with public approval of at least ${REELECTION_APPROVAL}%. This does not change your six-goal verdict.`,
                `Akhiri masa jabatan dengan kepuasan publik minimal ${REELECTION_APPROVAL}%. Ini tidak mengubah penilaian enam target utama.`,
              )}
            </p>
          </div>
          <strong>
            {number(game.politics.approval, 0)}% ·{" "}
            {game.politics.approval >= REELECTION_APPROVAL
              ? t("Re-elected", "Terpilih kembali")
              : t("Not re-elected", "Tidak terpilih kembali")}
          </strong>
        </section>
        {error && (
          <p role="alert" className="campaign-error">
            {error}
            <button disabled={busy} onClick={onRetrySave}>
              {t("Retry save", "Coba simpan")}
            </button>
          </p>
        )}
        <footer className="campaign-actions">
          <div className="button-row">
            <button disabled={busy} onClick={onReport}>
              {t("Read full report", "Baca laporan lengkap")}
            </button>
            <button disabled={busy} onClick={onExport}>
              {t("Export results", "Ekspor hasil")}
            </button>
          </div>
          <button className="primary" disabled={busy} onClick={onNew}>
            {t("Play a new campaign", "Mainkan permainan baru")}
          </button>
        </footer>
      </article>
    </Modal>
  );
}
