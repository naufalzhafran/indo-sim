import { useLanguage } from "./i18n";
import { number } from "./components";
import { powerNetworks } from "./engine/economy/power";
import type { QuarterGame } from "./engine/economy/types";

export function PowerReport({ game }: { game: QuarterGame }) {
  const language = useLanguage();
  const t = (en: string, id: string) => (language === "en" ? en : id);
  return (
    <section data-testid="power-report">
      <h3>
        {t(
          "Electricity: supply versus demand",
          "Listrik: pasokan dan kebutuhan",
        )}
      </h3>
      <p>
        {t(
          "Energy combines access and reliability. Reserve is usable supply above current demand; a shrinking reserve lowers reliability. Pending supply is funded construction, which becomes usable gradually. Values are game estimates, not measured megawatts.",
          "Energi menggabungkan akses dan keandalan. Cadangan adalah pasokan tersedia di atas kebutuhan saat ini; cadangan yang menyusut menurunkan keandalan. Pasokan tertunda adalah pembangunan yang didanai dan tersedia bertahap. Nilai merupakan perkiraan permainan, bukan megawatt terukur.",
        )}
      </p>
      <table className="eco-data-table">
        <thead>
          <tr>
            <th scope="col">
              {t(
                "Connected grid / isolated province",
                "Jaringan terhubung / provinsi terpisah",
              )}
            </th>
            <th scope="col">{t("Reserve", "Cadangan")}</th>
            <th scope="col">{t("Pending / demand", "Tertunda / kebutuhan")}</th>
          </tr>
        </thead>
        <tbody>
          {powerNetworks(game).map((network) => (
            <tr key={network.id}>
              <th scope="row">{network.name}</th>
              <td>{number(network.reserve, 1)}%</td>
              <td>{number(network.pendingPercent, 1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        {t(
          "RUPTL PLN expands generation and grid access. Review its regional allocation where reserves are low. Isolated provinces cannot draw surplus power from other grids. Completed capacity and paid construction remain after the program stops.",
          "RUPTL PLN memperluas pembangkit dan akses jaringan. Tinjau alokasi wilayahnya ketika cadangan rendah. Provinsi terpisah tidak dapat mengambil surplus jaringan lain. Kapasitas selesai dan pembangunan yang dibayar tetap ada setelah program berhenti.",
        )}
      </p>
    </section>
  );
}
