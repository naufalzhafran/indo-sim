// Approximate positions of Indonesia's best-known mountains and ranges.
// They shape continuous low-poly terrain; heights and slopes are compressed for the tabletop.
export type ReliefKind = "volcano" | "peak" | "snow" | "hill";
type LonLat = readonly [number, number];
export type ReliefPeak = {
  name: string;
  at: LonLat;
  elevation: number;
  kind: Exclude<ReliefKind, "hill">;
};
export type ReliefRange = {
  name: string;
  paths: readonly (readonly LonLat[])[];
  elevation: number;
  kind: "peak" | "hill";
};

export const RELIEF_PEAKS: readonly ReliefPeak[] = [
  // Sumatra: volcanoes on the Bukit Barisan spine.
  {
    name: "Seulawah Agam",
    at: [95.66, 5.45],
    elevation: 1810,
    kind: "volcano",
  },
  { name: "Leuser", at: [97.18, 3.75], elevation: 3404, kind: "peak" },
  { name: "Sinabung", at: [98.39, 3.17], elevation: 2460, kind: "volcano" },
  { name: "Sorik Marapi", at: [99.54, 0.69], elevation: 2145, kind: "volcano" },
  { name: "Talamau", at: [99.98, 0.08], elevation: 2919, kind: "volcano" },
  { name: "Marapi", at: [100.47, -0.38], elevation: 2891, kind: "volcano" },
  { name: "Kerinci", at: [101.26, -1.7], elevation: 3805, kind: "volcano" },
  { name: "Kaba", at: [102.62, -3.52], elevation: 1940, kind: "volcano" },
  { name: "Dempo", at: [103.13, -4.03], elevation: 3173, kind: "volcano" },
  { name: "Tanggamus", at: [104.7, -5.43], elevation: 2102, kind: "volcano" },
  // Java: a chain of separate volcanoes.
  { name: "Gede", at: [107.0, -6.79], elevation: 2958, kind: "volcano" },
  {
    name: "Tangkuban Perahu",
    at: [107.6, -6.77],
    elevation: 2084,
    kind: "volcano",
  },
  { name: "Ciremai", at: [108.4, -6.89], elevation: 3078, kind: "volcano" },
  { name: "Slamet", at: [109.21, -7.24], elevation: 3428, kind: "volcano" },
  { name: "Sumbing", at: [110.07, -7.38], elevation: 3371, kind: "volcano" },
  {
    // The twin Merapi–Merbabu massif, centred between both summits.
    name: "Merapi–Merbabu",
    at: [110.44, -7.48],
    elevation: 3000,
    kind: "volcano",
  },
  { name: "Wilis", at: [111.76, -7.81], elevation: 2563, kind: "volcano" },
  { name: "Arjuno", at: [112.59, -7.76], elevation: 3339, kind: "volcano" },
  {
    // The Bromo–Tengger–Semeru massif, centred inland of Semeru's summit.
    name: "Semeru",
    at: [112.94, -8.02],
    elevation: 3676,
    kind: "volcano",
  },
  { name: "Argopuro", at: [113.57, -7.97], elevation: 3088, kind: "volcano" },
  { name: "Raung", at: [114.04, -8.13], elevation: 3332, kind: "volcano" },
  // Lesser Sunda Islands.
  // Smithsonian Global Volcanism Program: volcano.si.edu/volcano.cfm?vn=264010 (Batur), vn=264020 (Agung).
  { name: "Batur", at: [115.3775, -8.2403], elevation: 1711, kind: "volcano" },
  { name: "Agung", at: [115.508, -8.343], elevation: 2997, kind: "volcano" },
  { name: "Rinjani", at: [116.46, -8.41], elevation: 3726, kind: "volcano" },
  { name: "Tambora", at: [118.0, -8.25], elevation: 2850, kind: "volcano" },
  { name: "Ranaka", at: [120.52, -8.62], elevation: 2400, kind: "volcano" },
  { name: "Mutis", at: [124.23, -9.57], elevation: 2427, kind: "peak" },
  // Kalimantan: old, low interior mountains.
  { name: "Bukit Raya", at: [112.68, -0.68], elevation: 2278, kind: "peak" },
  // Sulawesi: high central mountains and northern volcanoes.
  { name: "Rantemario", at: [120.02, -3.38], elevation: 3478, kind: "peak" },
  { name: "Gandang Dewata", at: [119.4, -2.85], elevation: 3037, kind: "peak" },
  { name: "Bawakaraeng", at: [119.92, -5.3], elevation: 2874, kind: "volcano" },
  { name: "Mekongga", at: [121.25, -3.65], elevation: 2620, kind: "peak" },
  { name: "Rorekatimbu", at: [120.2, -1.35], elevation: 2610, kind: "peak" },
  { name: "Klabat", at: [125.03, 1.47], elevation: 1995, kind: "volcano" },
  { name: "Soputan", at: [124.73, 1.11], elevation: 1784, kind: "volcano" },
  // Maluku.
  { name: "Binaiya", at: [129.45, -3.17], elevation: 3027, kind: "peak" },
  { name: "Kapalatmada", at: [126.15, -3.27], elevation: 2700, kind: "peak" },
  { name: "Dukono", at: [127.89, 1.69], elevation: 1229, kind: "volcano" },
  // Papua: the snow-capped central cordillera.
  { name: "Puncak Jaya", at: [137.16, -4.08], elevation: 4884, kind: "snow" },
  {
    name: "Puncak Trikora",
    at: [138.68, -4.26],
    elevation: 4750,
    kind: "snow",
  },
  {
    name: "Puncak Mandala",
    at: [140.28, -4.72],
    elevation: 4760,
    kind: "snow",
  },
  { name: "Arfak", at: [133.9, -1.12], elevation: 2940, kind: "peak" },
];

export const RELIEF_RANGES: readonly ReliefRange[] = [
  {
    name: "Bukit Barisan",
    kind: "peak",
    elevation: 1900,
    paths: [
      [
        [95.5, 5.25],
        [96.3, 4.6],
        [97.0, 4.0],
        [97.75, 3.4],
        [98.25, 2.85],
        [98.6, 2.05],
        [99.2, 1.4],
        [99.75, 0.55],
        [100.25, -0.15],
        [100.75, -0.85],
        [101.3, -1.55],
        [101.85, -2.4],
        [102.45, -3.15],
        [103.0, -3.8],
        [103.65, -4.4],
        [104.25, -4.95],
        [104.75, -5.4],
      ],
    ],
  },
  {
    name: "Sumatra foothills",
    kind: "hill",
    elevation: 600,
    paths: [
      [
        [97.75, 4.35],
        [98.75, 3.35],
        [99.65, 1.85],
        [100.35, 0.75],
        [101.0, -0.25],
        [101.75, -1.2],
        [102.6, -2.3],
        [103.5, -3.4],
      ],
    ],
  },
  {
    name: "Java hills",
    kind: "hill",
    elevation: 800,
    paths: [
      [
        [106.45, -7.0],
        [107.05, -7.15],
        [108.0, -7.35],
        [108.7, -7.3],
      ],
      [
        [109.6, -7.55],
        [110.6, -7.98],
        [111.3, -8.1],
        [112.3, -8.25],
      ],
    ],
  },
  {
    name: "Kalimantan ranges",
    kind: "peak",
    elevation: 1500,
    paths: [
      // Schwaner, Müller, Iran and Meratus mountains.
      [
        [110.9, -0.35],
        [111.6, -0.5],
        [112.2, -0.62],
        [113.25, -0.7],
        [113.9, -0.5],
      ],
      [
        [112.4, 0.95],
        [113.3, 0.55],
        [114.0, 0.75],
        [114.6, 1.05],
        [115.0, 1.6],
      ],
      [
        [115.2, 2.25],
        [115.45, 2.9],
        [115.65, 3.55],
      ],
      [
        [115.0, -3.6],
        [115.35, -3.05],
        [115.6, -2.55],
        [115.85, -2.05],
        [116.05, -1.65],
      ],
    ],
  },
  {
    name: "Kalimantan uplands",
    kind: "hill",
    elevation: 600,
    paths: [
      [
        [110.6, 0.6],
        [111.6, 0.65],
        [112.9, -0.05],
        [114.3, 0.0],
        [115.6, 0.6],
        [116.4, 1.4],
      ],
      [
        [116.3, 2.6],
        [116.6, 1.9],
      ],
    ],
  },
  {
    name: "Central Sulawesi highlands",
    kind: "peak",
    elevation: 2100,
    paths: [
      [
        [120.0, -0.95],
        [120.15, -1.75],
        [119.85, -2.3],
        [119.55, -2.6],
        [119.7, -3.1],
      ],
      [
        [120.35, -2.55],
        [120.9, -1.95],
        [121.4, -2.2],
        [121.2, -3.0],
      ],
    ],
  },
  {
    name: "Sulawesi arms",
    kind: "hill",
    elevation: 900,
    paths: [
      [
        [119.85, -4.0],
        [119.9, -4.65],
      ],
      [
        [122.3, -0.88],
        [122.85, -0.85],
      ],
      [
        [121.9, 0.75],
        [122.6, 0.75],
        [123.3, 0.75],
        [124.05, 0.75],
      ],
      [
        [121.95, -3.85],
        [122.45, -4.2],
      ],
    ],
  },
  {
    name: "Seram range",
    kind: "peak",
    elevation: 1700,
    paths: [
      [
        [128.55, -3.1],
        [129.0, -3.15],
        [129.9, -3.2],
        [130.35, -3.4],
      ],
    ],
  },
  {
    name: "Maluku hills",
    kind: "hill",
    elevation: 800,
    paths: [
      [
        [126.45, -3.4],
        [126.85, -3.35],
      ],
      [
        [127.9, 1.05],
        [127.95, 0.55],
      ],
      [
        [128.3, 0.45],
        [127.8, 0.0],
      ],
    ],
  },
  {
    name: "Central Cordillera",
    kind: "peak",
    elevation: 3300,
    paths: [
      [
        [135.0, -3.35],
        [135.7, -3.55],
        [136.4, -3.8],
        [137.8, -4.05],
        [138.2, -4.1],
        [139.3, -4.4],
        [139.8, -4.55],
        [140.85, -4.85],
      ],
    ],
  },
  {
    name: "Papua hills",
    kind: "hill",
    elevation: 900,
    paths: [
      // Tamrau, Arfak, Foja and Cyclops ranges plus the Fakfak hills.
      [
        [132.2, -0.75],
        [132.8, -0.6],
        [133.3, -0.75],
      ],
      [
        [134.0, -1.55],
        [133.85, -0.85],
      ],
      [
        [137.7, -2.6],
        [138.3, -2.45],
        [138.9, -2.45],
      ],
      [[140.45, -2.55]],
      [[132.4, -3.05]],
    ],
  },
  {
    name: "Nusa Tenggara hills",
    kind: "hill",
    elevation: 700,
    paths: [
      [
        [117.15, -8.65],
        [117.6, -8.7],
      ],
      [
        [118.45, -8.6],
        [118.85, -8.62],
      ],
      [
        [119.6, -9.65],
        [120.2, -9.85],
        [120.55, -10.05],
      ],
      [
        [121.35, -8.72],
        [122.3, -8.62],
      ],
      [
        [123.85, -10.0],
        [124.6, -9.35],
        [124.95, -9.2],
      ],
    ],
  },
];

// Lake Toba and Samosir, the most recognizable inland water at this scale.
export const LAKE_TOBA: readonly LonLat[] = [
  [98.52, 2.72],
  [98.6, 2.84],
  [98.72, 2.93],
  [98.86, 2.85],
  [98.98, 2.7],
  [99.08, 2.52],
  [99.12, 2.38],
  [99.04, 2.3],
  [98.9, 2.34],
  [98.78, 2.44],
  [98.64, 2.52],
  [98.54, 2.6],
];
export const SAMOSIR: readonly LonLat[] = [
  [98.64, 2.7],
  [98.76, 2.77],
  [98.88, 2.66],
  [98.92, 2.52],
  [98.84, 2.46],
  [98.72, 2.54],
];
