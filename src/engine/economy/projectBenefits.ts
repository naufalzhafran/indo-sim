import type { Bilingual, PolicyId } from "./types";

/**
 * benefit: what the finished construction does.
 * retained: builds — what stays after completion; facilities — what happens when deactivated.
 */
type ProjectBenefit = { benefit: Bilingual; retained: Bilingual };
const bi = (en: string, id: string): Bilingual => ({ en, id });

const permanent = bi(
  "Gains are permanent. The policy ends by itself and cannot be launched again.",
  "Manfaat bersifat permanen. Kebijakan berakhir sendiri dan tidak dapat dijalankan lagi.",
);
const idle = (service: Bilingual): Bilingual =>
  bi(
    `${service.en} stops. Built facilities stay idle with a small upkeep and restart without rebuilding.`,
    `${service.id} berhenti. Fasilitas terbangun menganggur dengan biaya perawatan kecil dan bisa aktif lagi tanpa dibangun ulang.`,
  );

export const projectBenefits: Partial<Record<PolicyId, ProjectBenefit>> = {
  "jalan-desa": {
    benefit: bi(
      "Paved village roads connect farms and villages to markets.",
      "Jalan desa beraspal menghubungkan pertanian dan desa ke pasar.",
    ),
    retained: permanent,
  },
  "embung-desa": {
    benefit: bi(
      "Village reservoirs store water for households and dry-season farming.",
      "Embung desa menampung air untuk rumah tangga dan pertanian musim kemarau.",
    ),
    retained: permanent,
  },
  "pasar-desa": {
    benefit: bi(
      "Village markets give farmers and traders a place to sell.",
      "Pasar desa memberi petani dan pedagang tempat berjualan.",
    ),
    retained: permanent,
  },
  brt: {
    benefit: bi(
      "Dedicated bus lanes speed up city commutes.",
      "Jalur bus khusus mempercepat perjalanan di kota.",
    ),
    retained: permanent,
  },
  krl: {
    benefit: bi(
      "Commuter rail links suburbs with city jobs and services.",
      "Kereta komuter menghubungkan pinggiran kota dengan pekerjaan dan layanan kota.",
    ),
    retained: permanent,
  },
  "mrt-lrt": {
    benefit: bi(
      "Mass rapid transit moves large numbers of city workers and shoppers.",
      "Angkutan massal cepat mengangkut banyak pekerja dan pembeli di kota.",
    ),
    retained: permanent,
  },
  "kereta-antarkota": {
    benefit: bi(
      "Intercity rail carries passengers and freight between cities and ports.",
      "Kereta antarkota mengangkut penumpang dan barang antarkota dan pelabuhan.",
    ),
    retained: permanent,
  },
  plts: {
    benefit: bi(
      "Solar plants add usable power and connect remote villages.",
      "Pembangkit surya menambah listrik siap pakai dan menyambungkan desa terpencil.",
    ),
    retained: permanent,
  },
  plta: {
    benefit: bi(
      "Hydropower dams add a large amount of clean, usable power.",
      "Bendungan PLTA menambah banyak listrik bersih siap pakai.",
    ),
    retained: permanent,
  },
  pltp: {
    benefit: bi(
      "Geothermal plants add steady, clean power.",
      "Pembangkit panas bumi menambah listrik bersih yang stabil.",
    ),
    retained: permanent,
  },
  pltu: {
    benefit: bi(
      "Thermal plants add large, cheap capacity but pollute the air.",
      "Pembangkit termal menambah kapasitas besar dan murah, tetapi mencemari udara.",
    ),
    retained: permanent,
  },
  water: {
    benefit: bi(
      "Clean water and sanitation support health, infrastructure and schooling.",
      "Air bersih dan sanitasi mendukung kesehatan, infrastruktur, dan sekolah.",
    ),
    retained: permanent,
  },
  irrigation: {
    benefit: bi(
      "Irrigation channels raise farm capacity.",
      "Saluran irigasi meningkatkan kapasitas pertanian.",
    ),
    retained: permanent,
  },
  broadband: {
    benefit: bi(
      "Digital backbone supports technology and finance.",
      "Jaringan tulang punggung digital mendukung teknologi dan keuangan.",
    ),
    retained: permanent,
  },
  "tourism-access": {
    benefit: bi(
      "Better destination access supports tourism and infrastructure.",
      "Akses destinasi yang lebih baik mendukung pariwisata dan infrastruktur.",
    ),
    retained: permanent,
  },
  kopdes: {
    benefit: bi(
      "Village co-op buildings provide storage, distribution and credit while the policy runs.",
      "Gedung koperasi desa menyediakan gudang, distribusi, dan kredit selama kebijakan berjalan.",
    ),
    retained: idle(bi("Co-op service", "Layanan koperasi")),
  },
  klinik: {
    benefit: bi(
      "Staffed clinics improve healthcare access while the policy runs.",
      "Klinik dengan tenaga kesehatan meningkatkan akses layanan selama kebijakan berjalan.",
    ),
    retained: idle(bi("Clinic staffing", "Tenaga klinik")),
  },
  "tol-laut": {
    benefit: bi(
      "Ports host subsidised shipping routes that move goods and food between islands.",
      "Pelabuhan melayani rute kapal bersubsidi yang mengangkut barang dan pangan antarpulau.",
    ),
    retained: idle(bi("Route subsidy", "Subsidi rute")),
  },
  "cold-chain": {
    benefit: bi(
      "Cold storage keeps catches fresh while the policy runs and power is reliable.",
      "Gudang pendingin menjaga hasil tangkapan selama kebijakan berjalan dan listrik andal.",
    ),
    retained: idle(bi("Cold-storage operation", "Operasi gudang pendingin")),
  },
  "food-reserves": {
    benefit: bi(
      "Granaries hold food stocks that steady supply while the policy runs.",
      "Lumbung menyimpan cadangan pangan yang menstabilkan pasokan selama kebijakan berjalan.",
    ),
    retained: idle(bi("Stock purchasing", "Pembelian cadangan")),
  },
};
