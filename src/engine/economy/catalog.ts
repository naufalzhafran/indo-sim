import { REGION_IDS } from "./types";
import type {
  Bilingual,
  BuildDisruption,
  Foundation,
  IndustryDefinition,
  IndustryId,
  PolicyConsequence,
  PolicyDefinition,
  PolicyId,
  RegionId,
} from "./types";

const bi = (en: string, id: string): Bilingual => ({ en, id });
export const foundationNames: Record<Foundation, Bilingual> = {
  education: bi("Education", "Pendidikan"),
  infrastructure: bi("Infrastructure", "Infrastruktur"),
  energy: bi("Energy", "Energi"),
  food: bi("Food", "Pangan"),
  health: bi("Health", "Kesehatan"),
};

// Sensitivities and income shares are game assumptions. Outputs are value added, not sales.
const industry = (
  id: IndustryId,
  en: string,
  ind: string,
  weights: number[],
  essential: Foundation[],
  laborShare: number,
  importShare: number,
  exportShare: number,
): IndustryDefinition => ({
  id,
  name: bi(en, ind),
  weights: {
    education: weights[0],
    infrastructure: weights[1],
    energy: weights[2],
    food: weights[3],
    health: weights[4],
  },
  essential,
  laborShare,
  importShare,
  exportShare,
});
export const industries: IndustryDefinition[] = [
  industry(
    "agriculture",
    "Agriculture",
    "Pertanian",
    [0.1, 0.3, 0.15, 0.2, 0.25],
    ["infrastructure", "food"],
    0.62,
    0.05,
    0.12,
  ),
  industry(
    "palmOil",
    "Palm Oil",
    "Kelapa sawit",
    [0.1, 0.35, 0.25, 0.1, 0.2],
    ["infrastructure", "energy"],
    0.38,
    0.08,
    0.6,
  ),
  industry(
    "fishing",
    "Fishing",
    "Perikanan",
    [0.1, 0.3, 0.25, 0.15, 0.2],
    ["infrastructure", "energy"],
    0.58,
    0.1,
    0.3,
  ),
  industry(
    "mining",
    "Oil & Mining",
    "Migas & pertambangan",
    [0.15, 0.3, 0.35, 0.05, 0.15],
    ["infrastructure", "energy"],
    0.24,
    0.2,
    0.65,
  ),
  industry(
    "manufacturing",
    "Manufacturing",
    "Manufaktur",
    [0.25, 0.25, 0.3, 0.05, 0.15],
    ["energy", "infrastructure"],
    0.43,
    0.28,
    0.4,
  ),
  industry(
    "construction",
    "Construction & Utilities",
    "Konstruksi & utilitas",
    [0.15, 0.35, 0.2, 0.05, 0.25],
    ["infrastructure", "health"],
    0.55,
    0.16,
    0.02,
  ),
  industry(
    "logistics",
    "Logistics",
    "Logistik",
    [0.15, 0.4, 0.25, 0.05, 0.15],
    ["infrastructure", "energy"],
    0.5,
    0.2,
    0.1,
  ),
  industry(
    "retail",
    "Retail",
    "Perdagangan",
    [0.1, 0.35, 0.15, 0.2, 0.2],
    ["infrastructure", "food"],
    0.6,
    0.18,
    0.03,
  ),
  industry(
    "tourism",
    "Tourism",
    "Pariwisata",
    [0.15, 0.3, 0.15, 0.15, 0.25],
    ["health", "infrastructure"],
    0.65,
    0.1,
    0.35,
  ),
  industry(
    "finance",
    "Finance",
    "Keuangan",
    [0.4, 0.15, 0.25, 0.05, 0.15],
    ["education", "energy"],
    0.55,
    0.05,
    0.08,
  ),
  industry(
    "technology",
    "Tech & IT",
    "Teknologi & TI",
    [0.45, 0.15, 0.3, 0.025, 0.075],
    ["education", "energy"],
    0.6,
    0.25,
    0.25,
  ),
  industry(
    "services",
    "Business & Other Services",
    "Jasa usaha & lainnya",
    [0.3, 0.2, 0.15, 0.1, 0.25],
    ["education", "health"],
    0.7,
    0.08,
    0.08,
  ),
  industry(
    "publicServices",
    "Public Services",
    "Layanan publik",
    [0.25, 0.2, 0.1, 0.15, 0.3],
    ["health", "education"],
    0.85,
    0.04,
    0,
  ),
];
export const industryById = Object.fromEntries(
  industries.map((x) => [x.id, x]),
) as Record<IndustryId, IndustryDefinition>;

const consequence = (
  label: Bilingual,
  qualifier: Bilingual,
  direction: PolicyConsequence["direction"],
): PolicyConsequence => ({ label, qualifier, direction, kind: "downside" });
const limitedBenefit = (
  label: Bilingual,
  qualifier: Bilingual,
): PolicyConsequence => ({
  label,
  qualifier,
  direction: "up",
  kind: "limited-benefit",
});
const publicSpending = (
  qualifier = bi("Recurring", "Rutin"),
): PolicyConsequence =>
  consequence(bi("Public spending", "Belanja negara"), qualifier, "up");
const ifStopped = bi("If funding stops", "Jika dana dihentikan");
const buildDisruption = (label: Bilingual): PolicyConsequence =>
  consequence(label, bi("During construction", "Selama dibangun"), "down");
const endsWhenBuilt = (): PolicyConsequence =>
  consequence(
    bi("Public spending", "Belanja negara"),
    bi("Ends when built", "Berhenti setelah selesai"),
    "up",
  );
const idleUpkeep = (): PolicyConsequence =>
  consequence(
    bi("Idle upkeep", "Biaya menganggur"),
    bi("If stopped", "Jika nonaktif"),
    "up",
  );
const yearsToDevelop = bi("Years to develop", "Perlu beberapa tahun");

// Limited benefits show the expected direction with their delivery constraint.
// Conditional losses describe withdrawal of support, not harm while it is funded.
const policyConsequences: Record<PolicyId, PolicyConsequence[]> = {
  mbg: [
    publicSpending(bi("High", "Besar")),
    consequence(foundationNames.food, ifStopped, "down"),
  ],
  kopdes: [
    idleUpkeep(),
    limitedBenefit(
      bi("Industry output", "Output industri"),
      bi("Limited by demand & roads", "Dibatasi pasar & jalan"),
    ),
  ],
  ckg: [
    publicSpending(),
    consequence(foundationNames.health, ifStopped, "down"),
  ],
  bpn: [
    consequence(
      bi("After-tax income", "Pendapatan setelah pajak"),
      bi("As collection improves", "Saat pemungutan membaik"),
      "down",
    ),
    limitedBenefit(bi("Tax revenue", "Penerimaan pajak"), bi("Delayed", "Tertunda")),
  ],
  pkh: [
    publicSpending(),
    consequence(bi("Household income", "Pendapatan keluarga"), ifStopped, "down"),
  ],
  bos: [
    limitedBenefit(bi("Workforce skills", "Keterampilan pekerja"), yearsToDevelop),
    consequence(foundationNames.education, ifStopped, "down"),
  ],
  kur: [
    publicSpending(),
    limitedBenefit(
      bi("Investment", "Investasi"),
      bi("Limited by skills & energy", "Dibatasi keterampilan & energi"),
    ),
  ],
  jkn: [
    publicSpending(bi("High", "Besar")),
    consequence(foundationNames.health, ifStopped, "down"),
  ],
  "tol-laut": [
    idleUpkeep(),
    limitedBenefit(
      bi("Industry output", "Output industri"),
      bi("Long build", "Pembangunan lama"),
    ),
  ],
  prakerja: [
    limitedBenefit(
      bi("Workforce skills", "Keterampilan pekerja"),
      bi("Several-quarter delay", "Perlu beberapa triwulan"),
    ),
    publicSpending(),
  ],
  pupuk: [
    publicSpending(),
    limitedBenefit(
      bi("Agriculture output", "Output pertanian"),
      bi("Harvest shocks still apply", "Tetap rentan gangguan panen"),
    ),
  ],
  klinik: [
    publicSpending(bi("Ongoing staffing", "Tenaga layanan rutin")),
    idleUpkeep(),
  ],
  sarjana: [
    publicSpending(bi("Multi-year funding", "Pendanaan beberapa tahun")),
    limitedBenefit(bi("Workforce skills", "Keterampilan pekerja"), yearsToDevelop),
  ],
  "jalan-desa": [
    buildDisruption(industryById.logistics.name),
    endsWhenBuilt(),
  ],
  "embung-desa": [
    buildDisruption(industryById.agriculture.name),
    endsWhenBuilt(),
  ],
  "pasar-desa": [
    buildDisruption(industryById.retail.name),
    endsWhenBuilt(),
  ],
  brt: [
    buildDisruption(industryById.logistics.name),
    limitedBenefit(
      foundationNames.infrastructure,
      bi("City regions only", "Hanya wilayah berkota besar"),
    ),
  ],
  krl: [
    buildDisruption(industryById.logistics.name),
    limitedBenefit(
      foundationNames.infrastructure,
      bi("Java & Sumatra only", "Hanya Jawa & Sumatra"),
    ),
  ],
  "mrt-lrt": [
    publicSpending(bi("Very high build cost", "Biaya bangun sangat besar")),
    buildDisruption(industryById.logistics.name),
  ],
  "kereta-antarkota": [
    publicSpending(bi("High build cost", "Biaya bangun besar")),
    buildDisruption(industryById.logistics.name),
  ],
  plts: [
    limitedBenefit(
      foundationNames.energy,
      bi("Smaller capacity", "Kapasitas lebih kecil"),
    ),
    endsWhenBuilt(),
  ],
  plta: [
    buildDisruption(industryById.agriculture.name),
    limitedBenefit(foundationNames.energy, bi("Long build", "Pembangunan lama")),
  ],
  pltp: [
    publicSpending(bi("High build cost", "Biaya bangun besar")),
    limitedBenefit(foundationNames.energy, bi("Long build", "Pembangunan lama")),
  ],
  pltu: [
    consequence(
      foundationNames.health,
      bi("Permanent pollution", "Polusi permanen"),
      "down",
    ),
    buildDisruption(foundationNames.health),
    consequence(
      bi("Borrowing cost", "Biaya pinjaman"),
      bi("Climate lenders pull back", "Pemberi dana iklim menahan diri"),
      "up",
    ),
  ],
  teachers: [
    limitedBenefit(bi("Workforce skills", "Keterampilan pekerja"), yearsToDevelop),
    limitedBenefit(
      foundationNames.education,
      bi("Diminish with overlap", "Mengecil jika tumpang tindih"),
    ),
  ],
  water: [
    consequence(
      bi("Maintenance costs", "Biaya perawatan"),
      bi("As assets grow", "Seiring penambahan aset"),
      "up",
    ),
    endsWhenBuilt(),
  ],
  irrigation: [
    buildDisruption(industryById.agriculture.name),
    limitedBenefit(
      bi("Agriculture output", "Output pertanian"),
      bi("Limited by local farming", "Dibatasi pertanian setempat"),
    ),
  ],
  broadband: [
    endsWhenBuilt(),
    limitedBenefit(
      bi("Industry output", "Output industri"),
      bi("Limited by skills & power", "Dibatasi keterampilan & listrik"),
    ),
  ],
  "cold-chain": [
    idleUpkeep(),
    limitedBenefit(
      bi("Fishing output", "Output perikanan"),
      bi("Limited by catch & power", "Dibatasi hasil ikan & listrik"),
    ),
  ],
  "palm-replanting": [
    consequence(industryById.palmOil.name, bi("Initially", "Pada awalnya"), "down"),
    consequence(
      bi("Palm tax base", "Basis pajak sawit"),
      bi("Initially", "Pada awalnya"),
      "down",
    ),
  ],
  "mining-rehabilitation": [
    consequence(
      industryById.mining.name,
      bi("While funded", "Selama didanai"),
      "down",
    ),
    consequence(
      bi("Mining earnings", "Pendapatan tambang"),
      bi("While funded", "Selama didanai"),
      "down",
    ),
  ],
  "tourism-access": [
    buildDisruption(industryById.tourism.name),
    limitedBenefit(
      bi("Tourism output", "Output pariwisata"),
      bi("Limited by demand & health", "Dibatasi permintaan & kesehatan"),
    ),
  ],
  "food-reserves": [
    idleUpkeep(),
    limitedBenefit(
      foundationNames.food,
      bi("Limited by production", "Dibatasi produksi"),
    ),
  ],
};

/** Real-world context beside the simplified game numbers. */
const realities: Record<PolicyId, Bilingual> = {
  mbg: bi(
    "MBG started in January 2025 with a 2025 budget of about Rp 71T.",
    "MBG dimulai Januari 2025 dengan anggaran 2025 sekitar Rp 71T.",
  ),
  kopdes: bi(
    "About 80,000 village cooperatives were launched in July 2025.",
    "Sekitar 80.000 koperasi desa diluncurkan pada Juli 2025.",
  ),
  ckg: bi(
    "Free health checks began in February 2025, offered around each person's birthday.",
    "Cek kesehatan gratis dimulai Februari 2025, ditawarkan sekitar hari ulang tahun warga.",
  ),
  bpn: bi(
    "A separate state revenue agency was a 2024 Prabowo–Gibran campaign pledge.",
    "Badan penerimaan negara terpisah adalah janji kampanye Prabowo–Gibran pada 2024.",
  ),
  pkh: bi(
    "PKH has paid conditional cash to poor families since 2007, roughly Rp 28T a year recently.",
    "PKH menyalurkan bantuan bersyarat bagi keluarga miskin sejak 2007, sekitar Rp 28T per tahun belakangan ini.",
  ),
  bos: bi(
    "BOS has funded school operations since 2005, at more than Rp 50T a year.",
    "BOS mendanai operasional sekolah sejak 2005, lebih dari Rp 50T per tahun.",
  ),
  kur: bi(
    "KUR has offered subsidised small-business loans since 2007; the 2024 lending target was about Rp 300T.",
    "KUR memberi kredit usaha bersubsidi sejak 2007; target penyaluran 2024 sekitar Rp 300T.",
  ),
  jkn: bi(
    "JKN has run since 2014; the government pays premiums for about 96 million low-income members.",
    "JKN berjalan sejak 2014; pemerintah membayar iuran sekitar 96 juta peserta berpenghasilan rendah.",
  ),
  "tol-laut": bi(
    "Tol Laut has subsidised cargo ships to eastern Indonesia since 2015; the 2024 subsidy was about Rp 0.2T.",
    "Tol Laut menyubsidi kapal barang ke Indonesia timur sejak 2015; subsidi 2024 sekitar Rp 0,2T.",
  ),
  prakerja: bi(
    "Kartu Prakerja began in 2020; its 2024 budget was about Rp 4.8T.",
    "Kartu Prakerja dimulai 2020; anggaran 2024 sekitar Rp 4,8T.",
  ),
  "jalan-desa": bi(
    "Villages build roads with Dana Desa, about Rp 71T in 2024. Build time is shortened for a five-year game.",
    "Desa membangun jalan dengan Dana Desa, sekitar Rp 71T pada 2024. Waktu bangun dipersingkat untuk permainan lima tahun.",
  ),
  "embung-desa": bi(
    "Villages build reservoirs with Dana Desa, about Rp 71T in 2024. Build time is shortened for a five-year game.",
    "Desa membangun embung dengan Dana Desa, sekitar Rp 71T pada 2024. Waktu bangun dipersingkat untuk permainan lima tahun.",
  ),
  "pasar-desa": bi(
    "Villages build markets with Dana Desa, about Rp 71T in 2024. Build time is shortened for a five-year game.",
    "Desa membangun pasar dengan Dana Desa, sekitar Rp 71T pada 2024. Waktu bangun dipersingkat untuk permainan lima tahun.",
  ),
  brt: bi(
    "TransJakarta has run bus rapid transit since 2004. Build time is shortened for a five-year game.",
    "TransJakarta menjalankan bus rapid transit sejak 2004. Waktu bangun dipersingkat untuk permainan lima tahun.",
  ),
  krl: bi(
    "KRL Commuter Line carries about one million passengers a day around Jakarta. Build time is shortened for a five-year game.",
    "KRL Commuter Line mengangkut sekitar satu juta penumpang per hari di sekitar Jakarta. Waktu bangun dipersingkat untuk permainan lima tahun.",
  ),
  "mrt-lrt": bi(
    "Jakarta MRT's first 16 km took about six years to build, opening in 2019. Build time is shortened for a five-year game.",
    "16 km pertama MRT Jakarta dibangun sekitar enam tahun dan dibuka 2019. Waktu bangun dipersingkat untuk permainan lima tahun.",
  ),
  "kereta-antarkota": bi(
    "The Jakarta–Bandung high-speed line took about seven years, opening in 2023. Build time is shortened for a five-year game.",
    "Kereta cepat Jakarta–Bandung dibangun sekitar tujuh tahun dan dibuka 2023. Waktu bangun dipersingkat untuk permainan lima tahun.",
  ),
  pupuk: bi(
    "Cheap fertiliser and seed was a 2024 Anies–Muhaimin campaign pledge.",
    "Pupuk dan benih murah adalah janji kampanye Anies–Muhaimin pada 2024.",
  ),
  klinik: bi(
    "One clinic and health worker per village was a 2024 Ganjar–Mahfud campaign pledge.",
    "Satu puskesmas dan tenaga kesehatan per desa adalah janji kampanye Ganjar–Mahfud pada 2024.",
  ),
  sarjana: bi(
    "One graduate per poor family was a 2024 Ganjar–Mahfud campaign pledge.",
    "Satu sarjana per keluarga miskin adalah janji kampanye Ganjar–Mahfud pada 2024.",
  ),
  plts: bi(
    "Solar is the largest new source in PLN's 2025–2034 electricity plan (RUPTL).",
    "Surya adalah sumber baru terbesar dalam rencana listrik PLN 2025–2034 (RUPTL).",
  ),
  plta: bi(
    "Large hydro dams usually take five to eight years. Build time is shortened for a five-year game.",
    "Bendungan PLTA besar biasanya dibangun lima sampai delapan tahun. Waktu bangun dipersingkat untuk permainan lima tahun.",
  ),
  pltp: bi(
    "Indonesia has the world's second-largest geothermal capacity; projects usually take five to seven years. Build time is shortened for a five-year game.",
    "Kapasitas panas bumi Indonesia terbesar kedua di dunia; proyeknya biasanya lima sampai tujuh tahun. Waktu bangun dipersingkat untuk permainan lima tahun.",
  ),
  pltu: bi(
    "Coal supplies most of Indonesia's power, but Perpres 112/2022 bars new coal plants outside existing plans. Build time is shortened for a five-year game.",
    "Batu bara memasok sebagian besar listrik Indonesia, tetapi Perpres 112/2022 melarang PLTU baru di luar rencana yang ada. Waktu bangun dipersingkat untuk permainan lima tahun.",
  ),
  teachers: bi(
    "PPG certifies teachers, who then receive a professional allowance.",
    "PPG menyertifikasi guru, yang kemudian menerima tunjangan profesi.",
  ),
  water: bi(
    "PAMSIMAS has built village water systems since 2008. Build time is shortened for a five-year game.",
    "PAMSIMAS membangun sarana air desa sejak 2008. Waktu bangun dipersingkat untuk permainan lima tahun.",
  ),
  irrigation: bi(
    "P3-TGAI pays farmer groups to repair small irrigation channels. Build time is shortened for a five-year game.",
    "P3-TGAI membiayai kelompok tani untuk memperbaiki saluran irigasi kecil. Waktu bangun dipersingkat untuk permainan lima tahun.",
  ),
  broadband: bi(
    "The Palapa Ring fibre backbone reached every regency and city in 2019. Build time is shortened for a five-year game.",
    "Jaringan serat Palapa Ring menjangkau seluruh kabupaten dan kota pada 2019. Waktu bangun dipersingkat untuk permainan lima tahun.",
  ),
  "cold-chain": bi(
    "SLIN links fishing ports with cold storage to cut losses between catch and market.",
    "SLIN menghubungkan pelabuhan perikanan dengan gudang beku untuk mengurangi kehilangan hasil tangkapan.",
  ),
  "palm-replanting": bi(
    "PSR grants smallholders about Rp 60 million per hectare, funded by palm oil export levies.",
    "PSR memberi pekebun sekitar Rp 60 juta per hektare dari pungutan ekspor sawit.",
  ),
  "mining-rehabilitation": bi(
    "Mining companies reclaimed about 7,900 hectares in 2023, according to ESDM. Build time is shortened for a five-year game.",
    "Perusahaan tambang mereklamasi sekitar 7.900 hektare pada 2023 menurut ESDM. Waktu bangun dipersingkat untuk permainan lima tahun.",
  ),
  "tourism-access": bi(
    "Thousands of tourism villages are listed on the Jadesta platform. Build time is shortened for a five-year game.",
    "Ribuan desa wisata terdaftar di platform Jadesta. Waktu bangun dipersingkat untuk permainan lima tahun.",
  ),
  "food-reserves": bi(
    "The National Food Agency supports community food barns that store grain for lean seasons.",
    "Badan Pangan Nasional mendukung lumbung pangan masyarakat untuk menyimpan gabah saat paceklik.",
  ),
};
const existingProgrammes = new Set<PolicyId>(["bos", "jkn", "pkh", "kur", "prakerja"]);
const p = (
  id: PolicyId,
  name: string,
  category: PolicyDefinition["category"],
  quarterlyCost: number,
  rolloutMonths: number,
  effects: PolicyDefinition["effects"],
  impacts: PolicyDefinition["impacts"],
  purpose: Bilingual,
  mechanism: Bilingual,
  tradeoff: Bilingual,
  source: string,
  adapted = false,
): PolicyDefinition => ({
  id,
  kind: "program",
  name,
  category,
  quarterlyCost,
  setupCost: quarterlyCost,
  rolloutMonths,
  effects,
  impacts,
  purpose,
  mechanism,
  tradeoff,
  consequences: policyConsequences[id],
  source,
  adapted,
  reality: realities[id],
});
const up = (
  target: PolicyDefinition["impacts"][number]["target"],
  timing?: "delayed" | "later",
): PolicyDefinition["impacts"][number] => ({
  target,
  direction: "up",
  ...((timing ?? (target === "education" ? "delayed" : undefined))
    ? { timing: timing ?? "delayed" }
    : {}),
});
export const policies: PolicyDefinition[] = [
  p(
    "mbg",
    "Makan Bergizi Gratis",
    "food",
    36,
    6,
    { nutrition: 1, transfers: 0.2 },
    [up("food"), up("health")],
    bi(
      "Improve nutrition and household food security.",
      "Memperbaiki gizi dan ketahanan pangan keluarga.",
    ),
    bi(
      "Meals improve nutrition first; health and school outcomes follow gradually.",
      "Makanan meningkatkan gizi lebih dahulu; kesehatan dan hasil belajar menyusul bertahap.",
    ),
    bi(
      "A large recurring bill; nutrition support fades after funding stops.",
      "Biaya rutin besar; dukungan gizi berkurang setelah pendanaan dihentikan.",
    ),
    "https://www.bgn.go.id/",
  ),
  p(
    "kopdes",
    "Kopdes Merah Putih",
    "economy",
    18,
    9,
    { transport: 0.35, credit: 0.45, foodStorage: 0.25 },
    [up("infrastructure"), up("agriculture"), up("retail")],
    bi(
      "Connect village producers with nearby markets.",
      "Menghubungkan produsen desa dengan pasar sekitar.",
    ),
    bi(
      "Local distribution and affordable credit help rural firms use existing capacity.",
      "Distribusi lokal dan kredit terjangkau membantu usaha desa memanfaatkan kapasitas.",
    ),
    bi(
      "Credit and distribution support still face local demand and infrastructure constraints.",
      "Dukungan kredit dan distribusi tetap dibatasi permintaan dan infrastruktur lokal.",
    ),
    "https://kop.go.id/",
  ),
  p(
    "ckg",
    "Cek Kesehatan Gratis",
    "health",
    9,
    3,
    { healthAccess: 0.45 },
    [up("health")],
    bi("Extend preventive screening.", "Memperluas pemeriksaan pencegahan."),
    bi(
      "Earlier care improves health gradually using existing providers.",
      "Penanganan awal memperbaiki kesehatan bertahap melalui layanan yang tersedia.",
    ),
    bi(
      "Health benefits arrive gradually and need continuing service funding.",
      "Manfaat kesehatan muncul bertahap dan memerlukan pendanaan layanan berkelanjutan.",
    ),
    "https://www.kemkes.go.id/",
  ),
  p(
    "bpn",
    "Badan Penerimaan Negara",
    "economy",
    9,
    12,
    { collection: 1 },
    [],
    bi(
      "Improve collection of existing taxes.",
      "Memperbaiki pemungutan pajak yang sudah berlaku.",
    ),
    bi(
      "Regional collection efficiency rises gradually. This has no direct foundation or industry effect.",
      "Efisiensi pemungutan daerah naik bertahap. Tidak ada dampak langsung pada fondasi atau industri.",
    ),
    bi(
      "Costs arrive before extra receipts; higher collections leave households and firms less after-tax income.",
      "Biaya muncul sebelum tambahan penerimaan; pemungutan yang lebih tinggi mengurangi pendapatan bersih keluarga dan usaha.",
    ),
    "https://www.kpu.go.id/",
    true,
  ),
  p(
    "pkh",
    "Program Keluarga Harapan",
    "economy",
    9,
    3,
    { transfers: 1 },
    [up("food"), up("retail")],
    bi(
      "Support lower-income household purchasing power.",
      "Mendukung daya beli keluarga berpenghasilan rendah.",
    ),
    bi(
      "Transfers improve food affordability and retail demand; transfers are not taxable wages.",
      "Bantuan memperbaiki keterjangkauan pangan dan permintaan perdagangan; bantuan bukan upah kena pajak.",
    ),
    bi(
      "Transfers stop when funding stops and do not directly build workforce skills.",
      "Bantuan berhenti saat pendanaan dihentikan dan tidak langsung membentuk keterampilan tenaga kerja.",
    ),
    "https://kemensos.go.id/",
  ),
  p(
    "bos",
    "Bantuan Operasional Sekolah",
    "education",
    18,
    6,
    { schoolAccess: 1, schoolQuality: 0.25 },
    [up("education"), up("technology", "delayed")],
    bi(
      "Keep schools accessible and operating.",
      "Menjaga akses dan operasional sekolah.",
    ),
    bi(
      "School access improves within a year; workforce benefits take several years.",
      "Akses sekolah membaik dalam setahun; manfaat bagi tenaga kerja memerlukan beberapa tahun.",
    ),
    bi(
      "Workforce benefits take years; school access can slip when operating support ends.",
      "Manfaat tenaga kerja memerlukan beberapa tahun; akses sekolah dapat menurun saat dukungan operasional berakhir.",
    ),
    "https://jendela.kemendikdasmen.go.id/",
  ),
  p(
    "kur",
    "Kredit Usaha Rakyat",
    "economy",
    9,
    6,
    { credit: 1 },
    [up("agriculture"), up("manufacturing"), up("retail")],
    bi(
      "Help smaller businesses finance productive investment.",
      "Membantu usaha kecil membiayai investasi produktif.",
    ),
    bi(
      "Public credit support improves investment, subject to demand, skills and energy bottlenecks.",
      "Dukungan kredit publik meningkatkan investasi sesuai permintaan, keterampilan, dan pasokan energi.",
    ),
    bi(
      "Credit cannot remove skill, energy or market constraints, so investment gains can remain small.",
      "Kredit tidak mengatasi keterbatasan keterampilan, energi, atau pasar, sehingga manfaat investasi bisa tetap kecil.",
    ),
    "https://setkab.go.id/",
  ),
  p(
    "jkn",
    "Jaminan Kesehatan Nasional",
    "health",
    36,
    6,
    { healthAccess: 1, transfers: 0.2 },
    [up("health")],
    bi(
      "Improve access to affordable treatment.",
      "Memperbaiki akses pengobatan terjangkau.",
    ),
    bi(
      "Care access and household financial protection improve; health follows with a delay.",
      "Akses perawatan dan perlindungan keuangan keluarga membaik; kesehatan menyusul bertahap.",
    ),
    bi(
      "High recurring costs; treatment support weakens when funding stops.",
      "Biaya rutin tinggi; dukungan pengobatan melemah saat pendanaan dihentikan.",
    ),
    "https://www.kemkes.go.id/",
  ),
  p(
    "tol-laut",
    "Tol Laut",
    "infrastructure",
    4.5,
    12,
    { transport: 1, foodStorage: 0.2 },
    [up("infrastructure"), up("logistics"), up("food")],
    bi("Connect inter-island markets.", "Menghubungkan pasar antarpulau."),
    bi(
      "Ports and supported routes reduce distribution constraints and food losses.",
      "Pelabuhan dan dukungan rute mengurangi hambatan distribusi dan kehilangan pangan.",
    ),
    bi(
      "A long rollout delays returns; new infrastructure raises public maintenance costs.",
      "Pelaksanaan yang panjang menunda manfaat; infrastruktur baru menambah biaya pemeliharaan pemerintah.",
    ),
    "https://dephub.go.id/",
  ),
  p(
    "prakerja",
    "Kartu Prakerja",
    "education",
    4.5,
    9,
    { training: 1 },
    [
      up("education"),
      up("manufacturing", "delayed"),
      up("technology", "delayed"),
    ],
    bi(
      "Train people already entering or working in the labor market.",
      "Melatih orang yang memasuki atau sudah berada di pasar kerja.",
    ),
    bi(
      "Skills improve after several quarters; jobs depend on demand and industry capacity.",
      "Keterampilan membaik setelah beberapa triwulan; pekerjaan bergantung pada permintaan dan kapasitas industri.",
    ),
    bi(
      "Retraining takes several quarters; stronger skills do not guarantee new jobs.",
      "Pelatihan memerlukan beberapa triwulan; keterampilan yang lebih baik tidak menjamin pekerjaan baru.",
    ),
    "https://ekon.go.id/",
  ),
  p(
    "jalan-desa",
    "Jalan Desa",
    "infrastructure",
    12,
    9,
    {},
    [up("infrastructure"), up("agriculture"), up("retail")],
    bi("Pave and connect village roads.", "Mengaspal dan menghubungkan jalan desa."),
    bi(
      "Village crews build roads region by region. Completed roads permanently raise infrastructure.",
      "Pekerja desa membangun jalan di tiap wilayah. Jalan yang selesai menaikkan infrastruktur secara permanen.",
    ),
    bi(
      "Roadworks slow local logistics until finished, and new roads raise maintenance costs.",
      "Pekerjaan jalan memperlambat logistik setempat sampai selesai, dan jalan baru menambah biaya pemeliharaan.",
    ),
    "https://djpb.kemenkeu.go.id/",
    true,
  ),
  p(
    "embung-desa",
    "Embung Desa",
    "food",
    9,
    9,
    {},
    [up("food"), up("agriculture")],
    bi(
      "Build village reservoirs for dry-season water.",
      "Membangun embung desa untuk air musim kemarau.",
    ),
    bi(
      "Completed reservoirs permanently improve water access and farm capacity.",
      "Embung yang selesai meningkatkan akses air dan kapasitas pertanian secara permanen.",
    ),
    bi(
      "Digging disturbs nearby fields until the reservoirs are finished.",
      "Penggalian mengganggu lahan sekitar sampai embung selesai.",
    ),
    "https://djpb.kemenkeu.go.id/",
    true,
  ),
  p(
    "pasar-desa",
    "Pasar Desa",
    "economy",
    9,
    6,
    {},
    [up("retail"), up("agriculture")],
    bi(
      "Build village markets for farmers and traders.",
      "Membangun pasar desa bagi petani dan pedagang.",
    ),
    bi(
      "Completed markets permanently raise retail and farm capacity.",
      "Pasar yang selesai menaikkan kapasitas perdagangan dan pertanian secara permanen.",
    ),
    bi(
      "Traders relocate during construction, so local retail dips briefly.",
      "Pedagang dipindahkan selama pembangunan, sehingga perdagangan setempat sempat turun.",
    ),
    "https://djpb.kemenkeu.go.id/",
    true,
  ),
  p(
    "brt",
    "Bus Rapid Transit (BRT)",
    "infrastructure",
    9,
    6,
    {},
    [up("infrastructure"), up("retail")],
    bi(
      "Run dedicated bus lanes in regional cities.",
      "Menjalankan jalur bus khusus di kota-kota daerah.",
    ),
    bi(
      "Quick, low-cost lanes and stations permanently add urban infrastructure.",
      "Jalur dan halte yang cepat dan murah menambah infrastruktur kota secara permanen.",
    ),
    bi(
      "Smaller gains than rail; lane works slow traffic while being built.",
      "Manfaat lebih kecil dari kereta; pekerjaan jalur memperlambat lalu lintas selama dibangun.",
    ),
    "https://dephub.go.id/",
    true,
  ),
  p(
    "krl",
    "KRL Commuter Line",
    "infrastructure",
    18,
    12,
    {},
    [up("infrastructure"), up("services")],
    bi(
      "Extend electric commuter rail around large cities.",
      "Memperluas kereta komuter listrik di sekitar kota besar.",
    ),
    bi(
      "New lines permanently improve commuting and service-sector capacity.",
      "Jalur baru meningkatkan perjalanan komuter dan kapasitas jasa secara permanen.",
    ),
    bi(
      "Only Java and Sumatra have suitable rail corridors.",
      "Hanya Jawa dan Sumatra yang memiliki koridor rel yang sesuai.",
    ),
    "https://dephub.go.id/",
    true,
  ),
  p(
    "mrt-lrt",
    "MRT / LRT",
    "infrastructure",
    36,
    18,
    {},
    [up("infrastructure"), up("services"), up("retail")],
    bi(
      "Build mass rapid transit in the largest metropolitan areas.",
      "Membangun angkutan massal cepat di kawasan metropolitan terbesar.",
    ),
    bi(
      "The largest permanent transport gain, after a long and costly build.",
      "Manfaat transportasi permanen terbesar, setelah pembangunan yang lama dan mahal.",
    ),
    bi(
      "Very high cost; only Java, Sumatra and Sulawesi have large enough cities.",
      "Biaya sangat besar; hanya Jawa, Sumatra, dan Sulawesi yang memiliki kota cukup besar.",
    ),
    "https://dephub.go.id/",
    true,
  ),
  p(
    "kereta-antarkota",
    "Kereta Antarkota",
    "infrastructure",
    27,
    18,
    {},
    [up("infrastructure"), up("logistics")],
    bi(
      "Link cities and ports with intercity rail.",
      "Menghubungkan kota dan pelabuhan dengan kereta antarkota.",
    ),
    bi(
      "Completed lines permanently lift infrastructure and freight capacity.",
      "Jalur yang selesai menaikkan infrastruktur dan kapasitas angkutan barang secara permanen.",
    ),
    bi(
      "A long build; only the four large islands can host mainline rail.",
      "Pembangunan lama; hanya empat pulau besar yang dapat menampung jalur utama.",
    ),
    "https://dephub.go.id/",
    true,
  ),
  p(
    "pupuk",
    "Pupuk dan Benih Murah",
    "food",
    18,
    6,
    { farmInputs: 1 },
    [up("agriculture"), up("food")],
    bi(
      "Improve access to productive farm inputs.",
      "Memperbaiki akses sarana produksi pertanian.",
    ),
    bi(
      "Crop productivity responds before wider food affordability improves.",
      "Produktivitas tanaman meningkat sebelum keterjangkauan pangan yang lebih luas membaik.",
    ),
    bi(
      "Input support needs recurring funds, and harvest shocks can still reduce output.",
      "Dukungan sarana produksi memerlukan dana rutin, dan gangguan panen tetap dapat mengurangi hasil.",
    ),
    "https://www.kpu.go.id/",
    true,
  ),
  p(
    "klinik",
    "1 Desa, 1 Puskesmas/Pustu, 1 Dokter/Nakes",
    "health",
    36,
    15,
    { healthAccess: 1.2, water: 0.2 },
    [up("health", "delayed"), up("infrastructure", "delayed")],
    bi(
      "Expand local facilities and clinical staffing.",
      "Memperluas fasilitas dan tenaga kesehatan setempat.",
    ),
    bi(
      "Care capacity and clean water improve with construction and recruitment.",
      "Kapasitas perawatan dan air bersih meningkat melalui pembangunan dan perekrutan.",
    ),
    bi(
      "Facilities persist, but service staffing needs recurring funds and rollout is slow.",
      "Fasilitas bertahan, tetapi tenaga layanan memerlukan dana rutin dan pelaksanaan berjalan lambat.",
    ),
    "https://www.kpu.go.id/",
    true,
  ),
  p(
    "sarjana",
    "1 Keluarga Miskin, 1 Sarjana",
    "education",
    9,
    12,
    { university: 1, schoolAccess: 0.3, transfers: 0.1 },
    [up("education"), up("technology", "delayed"), up("finance", "delayed")],
    bi(
      "Support tertiary study for lower-income households.",
      "Mendukung kuliah bagi keluarga berpenghasilan rendah.",
    ),
    bi(
      "Access comes first; gradual completion contributes skills during the later years of the term.",
      "Akses meningkat lebih dahulu; kelulusan bertahap menambah keterampilan pada tahun-tahun akhir masa jabatan.",
    ),
    bi(
      "Funding is needed for several years before graduates add meaningful workforce skills.",
      "Pendanaan diperlukan selama beberapa tahun sebelum lulusan menambah keterampilan tenaga kerja secara berarti.",
    ),
    "https://www.kpu.go.id/",
    true,
  ),
  p(
    "plts",
    "PLTS Surya",
    "energy",
    9,
    6,
    {},
    [up("energy"), up("technology")],
    bi(
      "Install solar plants and village solar grids.",
      "Memasang pembangkit surya dan jaringan surya desa.",
    ),
    bi(
      "Quick to build. Adds a little usable capacity and connects remote villages.",
      "Cepat dibangun. Menambah sedikit kapasitas siap pakai dan menyambungkan desa terpencil.",
    ),
    bi(
      "Smaller capacity per rupiah than large plants.",
      "Kapasitas per rupiah lebih kecil dibanding pembangkit besar.",
    ),
    "https://web.pln.co.id/",
    true,
  ),
  p(
    "plta",
    "PLTA Air",
    "energy",
    21,
    18,
    {},
    [up("energy"), up("manufacturing")],
    bi(
      "Dam rivers for large, clean hydropower.",
      "Membendung sungai untuk listrik tenaga air yang besar dan bersih.",
    ),
    bi(
      "A long build that adds the most usable power capacity.",
      "Pembangunan lama yang menambah kapasitas listrik siap pakai terbesar.",
    ),
    bi(
      "Reservoir works disrupt nearby farming until completed.",
      "Pembangunan bendungan mengganggu pertanian sekitar sampai selesai.",
    ),
    "https://web.pln.co.id/",
    true,
  ),
  p(
    "pltp",
    "PLTP Panas Bumi",
    "energy",
    18,
    15,
    {},
    [up("energy"), up("manufacturing")],
    bi(
      "Tap volcanic heat for steady geothermal power.",
      "Memanfaatkan panas vulkanik untuk listrik panas bumi yang stabil.",
    ),
    bi(
      "Drilling is costly, but completed plants add clean, steady capacity.",
      "Pengeboran mahal, tetapi pembangkit yang selesai menambah kapasitas bersih dan stabil.",
    ),
    bi(
      "High build cost and a long exploration period.",
      "Biaya bangun tinggi dan masa eksplorasi panjang.",
    ),
    "https://www.esdm.go.id/",
    true,
  ),
  p(
    "pltu",
    "PLTU / PLTG Termal",
    "energy",
    12,
    9,
    {},
    [up("energy"), up("manufacturing"), { target: "health", direction: "down", timing: "later" }],
    bi(
      "Build coal and gas plants for fast, cheap capacity.",
      "Membangun pembangkit batu bara dan gas untuk kapasitas cepat dan murah.",
    ),
    bi(
      "Large, cheap capacity that is finished quickly.",
      "Kapasitas besar dan murah yang cepat selesai.",
    ),
    bi(
      "Air pollution permanently lowers health in the host regions.",
      "Polusi udara menurunkan kesehatan wilayah tuan rumah secara permanen.",
    ),
    "https://web.pln.co.id/",
    true,
  ),
  p(
    "teachers",
    "Pendidikan Profesi Guru (PPG)",
    "education",
    9,
    9,
    { schoolQuality: 1 },
    [up("education"), up("technology", "delayed")],
    bi("Improve teaching quality.", "Memperbaiki kualitas pengajaran."),
    bi(
      "Better teaching improves education before new skilled workers enter industry.",
      "Pengajaran yang lebih baik meningkatkan pendidikan sebelum tenaga terampil baru memasuki industri.",
    ),
    bi(
      "Better teaching takes years to reach the workforce; overlapping education spending has diminishing returns.",
      "Pengajaran yang lebih baik memerlukan waktu bertahun-tahun untuk berdampak pada tenaga kerja; tambahan belanja pendidikan sejenis memberi manfaat yang makin kecil.",
    ),
    "https://ppg.kemendikdasmen.go.id/",
    true,
  ),
  p(
    "water",
    "PAMSIMAS & SANIMAS",
    "infrastructure",
    9,
    9,
    { water: 1 },
    [up("infrastructure"), up("health")],
    bi(
      "Improve clean water and sanitation.",
      "Memperbaiki air bersih dan sanitasi.",
    ),
    bi(
      "Water infrastructure supports health, food preparation and schooling.",
      "Infrastruktur air mendukung kesehatan, penyiapan pangan, dan sekolah.",
    ),
    bi(
      "New infrastructure adds maintenance costs, and health gains arrive gradually.",
      "Infrastruktur baru menambah biaya pemeliharaan, dan manfaat kesehatan muncul bertahap.",
    ),
    "https://pu.go.id/",
    true,
  ),
  p(
    "irrigation",
    "P3-TGAI",
    "food",
    9,
    9,
    { irrigation: 1, water: 0.25 },
    [up("agriculture"), up("food"), up("infrastructure")],
    bi(
      "Repair irrigation serving agricultural land.",
      "Memperbaiki irigasi lahan pertanian.",
    ),
    bi(
      "Irrigation improves farm productivity and water access as funded works accumulate.",
      "Irigasi meningkatkan produktivitas pertanian dan akses air seiring bertambahnya hasil pembangunan yang didanai.",
    ),
    bi(
      "Regions with little agriculture gain less; irrigation cannot prevent harvest shocks.",
      "Daerah dengan sedikit pertanian memperoleh manfaat lebih kecil; irigasi tidak mencegah gangguan panen.",
    ),
    "https://sda.pu.go.id/",
    true,
  ),
  p(
    "broadband",
    "Palapa Ring",
    "infrastructure",
    18,
    12,
    { digital: 1 },
    [
      up("infrastructure"),
      up("technology", "delayed"),
      up("finance", "delayed"),
    ],
    bi(
      "Expand reliable digital connections.",
      "Memperluas koneksi digital yang andal.",
    ),
    bi(
      "Digital infrastructure supports connected businesses, subject to skills and power.",
      "Infrastruktur digital mendukung usaha terhubung sesuai keterampilan dan pasokan listrik.",
    ),
    bi(
      "Skills and electricity can still limit industry gains, even after connections improve.",
      "Keterampilan dan listrik tetap dapat membatasi manfaat industri meski koneksi membaik.",
    ),
    "https://www.baktikomdigi.id/",
    true,
  ),
  p(
    "cold-chain",
    "Sistem Logistik Ikan Nasional (SLIN)",
    "food",
    9,
    9,
    { coldChain: 1, foodStorage: 0.25 },
    [up("fishing"), up("food")],
    bi(
      "Reduce losses between fishers and buyers.",
      "Mengurangi kehilangan hasil antara nelayan dan pembeli.",
    ),
    bi(
      "Cold storage improves usable fishing output and food supply.",
      "Penyimpanan dingin meningkatkan hasil perikanan yang dapat digunakan dan pasokan pangan.",
    ),
    bi(
      "Benefits are smaller where fishing output or electricity reliability is low.",
      "Manfaat lebih kecil di daerah dengan hasil perikanan atau keandalan listrik yang rendah.",
    ),
    "https://kkp.go.id/",
    true,
  ),
  p(
    "palm-replanting",
    "Peremajaan Sawit Rakyat (PSR)",
    "economy",
    9,
    18,
    { palmReplanting: 1 },
    [
      { target: "palmOil", direction: "down", timing: "initially" },
      up("palmOil", "later"),
    ],
    bi(
      "Replace aging smallholder palms.",
      "Mengganti tanaman sawit rakyat yang menua.",
    ),
    bi(
      "Replanting temporarily removes output before more productive plantings mature.",
      "Peremajaan mengurangi hasil sementara sebelum tanaman yang lebih produktif matang.",
    ),
    bi(
      "Replanting lowers palm output and its tax base initially; productive gains arrive later.",
      "Peremajaan menurunkan hasil sawit dan basis pajaknya pada awalnya; manfaat produktivitas muncul kemudian.",
    ),
    "https://www.bpdp.or.id/",
    true,
  ),
  p(
    "mining-rehabilitation",
    "Reklamasi dan Pascatambang",
    "health",
    9,
    9,
    { miningCleanup: 1 },
    [up("health"), { target: "mining", direction: "down", timing: "delayed" }],
    bi(
      "Reduce health damage around resource extraction.",
      "Mengurangi dampak kesehatan di sekitar pertambangan.",
    ),
    bi(
      "Rehabilitation limits mining-related health pressure and adds operating compliance costs.",
      "Rehabilitasi membatasi tekanan kesehatan pertambangan dan menambah biaya kepatuhan operasi.",
    ),
    bi(
      "Compliance constrains mining output while the policy is funded, reducing mining earnings and its tax base.",
      "Kepatuhan membatasi hasil pertambangan selama kebijakan didanai, sehingga mengurangi pendapatan tambang dan basis pajaknya.",
    ),
    "https://www.esdm.go.id/",
    true,
  ),
  p(
    "tourism-access",
    "Pengembangan Desa Wisata",
    "economy",
    9,
    9,
    { tourismAccess: 1, transport: 0.15 },
    [up("tourism"), up("infrastructure")],
    bi(
      "Improve access to local visitor destinations.",
      "Memperbaiki akses tujuan wisata lokal.",
    ),
    bi(
      "Small access works support existing tourism capacity and local services.",
      "Pekerjaan akses kecil mendukung kapasitas pariwisata dan layanan lokal.",
    ),
    bi(
      "Better access cannot guarantee visitors; weak demand and health still limit tourism output.",
      "Akses yang lebih baik tidak menjamin kunjungan; permintaan dan kesehatan yang lemah tetap membatasi hasil pariwisata.",
    ),
    "https://jadesta.kemenparekraf.go.id/",
    true,
  ),
  p(
    "food-reserves",
    "Lumbung Pangan Masyarakat",
    "food",
    9,
    6,
    { foodStorage: 1 },
    [up("food"), up("agriculture")],
    bi(
      "Buffer local food shortages and reduce storage losses.",
      "Meredam kekurangan pangan lokal dan mengurangi kehilangan saat penyimpanan.",
    ),
    bi(
      "Storage retains more usable crop output and softens shortage pressure.",
      "Penyimpanan mempertahankan lebih banyak hasil tanaman dan meredam tekanan kekurangan.",
    ),
    bi(
      "Storage support needs recurring funds and cannot fully offset a severe production shortage.",
      "Dukungan penyimpanan memerlukan dana rutin dan tidak dapat sepenuhnya menutup kekurangan produksi yang parah.",
    ),
    "https://badanpangan.go.id/",
    true,
  ),
];
const verifiedSources: Partial<Record<PolicyId, string>> = {
  mbg: "https://www.bgn.go.id/news/artikel/bgn-akan-memulai-program-mbg-secara-bertahap",
  kopdes:
    "https://kop.go.id/read/presiden-prabowo-resmikan-kopdes-kel-merah-putih-momentum-kembalikan-sistem-ekonomi-ke-pasal-33-uud-45",
  ckg: "https://www.kemkes.go.id/cek-kesehatan-gratis-kado-ulang-tahun-dimulai-10-februari-2025",
  bpn: "https://www.kpu.go.id/dmdocument/1704254649Lampiran_Tim_Kampanye_Paslon_2_01-12-2023T22.02.39.pdf",
  pkh: "https://kemensos.go.id/index.php/en/download/book/pedoman-pelaksanaan-program-keluarga-harapan-tahun-2021",
  bos: "https://jendela.kemendikdasmen.go.id/v2/berita/detail/sejarah-dan-peran-bos-bagi-pendidikan-indonesia",
  kur: "https://setkab.go.id/en/kur-meningkatan-pendapatan-umkm-di-boyolali-2/",
  jkn: "https://www.kemkes.go.id/eng/presiden-luncurkan-bpjs-dan-jkn",
  "jalan-desa":
    "https://djpb.kemenkeu.go.id/kppn/balikpapan/id/data-publikasi/artikel/3055-10-tahun-dana-desa.html",
  "embung-desa":
    "https://djpb.kemenkeu.go.id/kppn/balikpapan/id/data-publikasi/artikel/3055-10-tahun-dana-desa.html",
  "pasar-desa":
    "https://djpb.kemenkeu.go.id/kppn/balikpapan/id/data-publikasi/artikel/3055-10-tahun-dana-desa.html",
  plts: "https://www.pln.co.id/hubungan-investor-id/informasi-perusahaan-id/ruptl-id-1",
  plta: "https://www.pln.co.id/hubungan-investor-id/informasi-perusahaan-id/ruptl-id-1",
  pltp: "https://www.pln.co.id/hubungan-investor-id/informasi-perusahaan-id/ruptl-id-1",
  pltu: "https://www.pln.co.id/hubungan-investor-id/informasi-perusahaan-id/ruptl-id-1",
  "tol-laut":
    "https://dephub.go.id/post/read/program-tol-laut-resmi-diluncurkan",
  prakerja:
    "https://ekon.go.id/publikasi/detail/226/pemerintah-resmi-buka-pendaftaran-kartu-prakerja-tahap-pertama",
  pupuk:
    "https://www.kpu.go.id/dmdocument/1704254632Lampiran_Tim_Kampanye_Paslon_1_01-12-2023T22.02.35.pdf",
  klinik:
    "https://www.kpu.go.id/dmdocument/1704254668Lampiran_Tim_Kampanye_Paslon_3_01-12-2023T22.02.40.pdf",
  sarjana:
    "https://www.kpu.go.id/dmdocument/1704254668Lampiran_Tim_Kampanye_Paslon_3_01-12-2023T22.02.40.pdf",
  teachers:
    "https://ppg.kemendikdasmen.go.id/news/kemendikdasmen-buka-program-ppg-bagi-guru-tertentu-tahun-2025-dorong-sertifikasi-profesi-bagi-guru-y",
  water:
    "https://sahabat.pu.go.id/eppid/berita/detail/agar-dirasakan-manfaat-oleh-masyarakat-kementerian-pu-perkuat-program-pamsimas-dan-sanimas-di-ntt",
  irrigation:
    "https://sahabat.pu.go.id/eppid/berita/detail/menteri-pu-tinjau-irigasi-di-karanganyar-program-p3tgai-akan-terus-diperluas",
  broadband:
    "https://baktikominfo.id/index.php/id/detail-berita/produk-dan-layanan-palapa-ring-bakti-kominfo",
  "cold-chain":
    "https://www.kkp.go.id/djpdskp/resmikan-cold-storage-300-ton-menteri-trenggono-targetkan-indramayu-jadi-sentra-perikanan65c3027543a10/detail.html",
  "palm-replanting": "https://www.bpdp.or.id/program-peremejaan-sawit-rakyat",
  "mining-rehabilitation":
    "https://www.esdm.go.id/id/media-center/arsip-berita/lebihi-target-reklamasi-pascatambang-garap-792077-hektar-di-2023",
  "tourism-access":
    "https://bob.kemenpar.go.id/371941-5-program-kementerian-pariwisata/",
  "food-reserves":
    "https://badanpangan.go.id/blog/post/pengembangan-lumbung-pangan-masyarakat",
};
const approvedMainImpacts: Partial<
  Record<PolicyId, PolicyDefinition["impacts"]>
> = {
  kopdes: [up("agriculture"), up("retail")],
  "jalan-desa": [up("infrastructure")],
  bos: [up("education")],
  teachers: [up("education")],
  klinik: [up("health", "delayed")],
  "food-reserves": [up("food")],
};
type Construction = {
  kind: "build" | "facility";
  disruption?: BuildDisruption[];
  eligibleRegions?: RegionId[];
};
// Construction costs are game assumptions derived from each catalog budget.
const construction: Partial<Record<PolicyId, Construction>> = {
  "jalan-desa": {
    kind: "build",
    disruption: [{ target: "logistics", amount: 0.012 }],
  },
  "embung-desa": {
    kind: "build",
    disruption: [{ target: "agriculture", amount: 0.01 }],
  },
  "pasar-desa": {
    kind: "build",
    disruption: [{ target: "retail", amount: 0.012 }],
  },
  brt: {
    kind: "build",
    disruption: [{ target: "logistics", amount: 0.012 }],
    eligibleRegions: ["sumatra", "java", "bali", "kalimantan", "sulawesi", "ntb"],
  },
  krl: {
    kind: "build",
    disruption: [{ target: "logistics", amount: 0.015 }],
    eligibleRegions: ["java", "sumatra"],
  },
  "mrt-lrt": {
    kind: "build",
    disruption: [
      { target: "logistics", amount: 0.02 },
      { target: "retail", amount: 0.01 },
    ],
    eligibleRegions: ["java", "sumatra", "sulawesi"],
  },
  "kereta-antarkota": {
    kind: "build",
    disruption: [{ target: "logistics", amount: 0.015 }],
    eligibleRegions: ["java", "sumatra", "kalimantan", "sulawesi"],
  },
  plts: { kind: "build" },
  plta: {
    kind: "build",
    disruption: [{ target: "agriculture", amount: 0.015 }],
  },
  pltp: { kind: "build" },
  pltu: {
    kind: "build",
    disruption: [{ target: "healthStatus", amount: 1 }],
  },
  water: { kind: "build" },
  irrigation: {
    kind: "build",
    disruption: [{ target: "agriculture", amount: 0.01 }],
  },
  broadband: { kind: "build" },
  "tourism-access": {
    kind: "build",
    disruption: [{ target: "tourism", amount: 0.012 }],
  },
  kopdes: { kind: "facility" },
  klinik: { kind: "facility" },
  "tol-laut": {
    kind: "facility",
    disruption: [{ target: "logistics", amount: 0.008 }],
  },
  "cold-chain": { kind: "facility" },
  "food-reserves": { kind: "facility" },
};
for (const policy of policies) {
  const plan = construction[policy.id];
  if (plan) {
    policy.kind = plan.kind;
    policy.eligibleRegions = plan.eligibleRegions;
    // Builds pay only for construction. Facilities pay construction, then running costs.
    policy.build = {
      cost:
        policy.setupCost +
        (policy.quarterlyCost * policy.rolloutMonths * (plan.kind === "build" ? 1 : 0.6)) /
          3,
      months: policy.rolloutMonths,
      disruption: plan.disruption ?? [],
    };
    policy.setupCost = 0;
    if (plan.kind === "build") {
      policy.quarterlyCost = 0;
      policy.effects = {};
    } else policy.idleUpkeepShare = 0.15;
  }
  policy.source = verifiedSources[policy.id] ?? policy.source;
  if (existingProgrammes.has(policy.id)) policy.existing = true;
  policy.impacts = approvedMainImpacts[policy.id] ?? policy.impacts;
  if (policy.rolloutMonths > 3)
    policy.impacts = policy.impacts.map((impact) =>
      impact.timing ? impact : { ...impact, timing: "delayed" },
    );
}
export const policyById = Object.fromEntries(
  policies.map((x) => [x.id, x]),
) as Record<PolicyId, PolicyDefinition>;

export const policyKind = (id: PolicyId) => policyById[id].kind;
export const eligibleRegions = (id: PolicyId): readonly RegionId[] =>
  policyById[id].eligibleRegions ?? REGION_IDS;
