/**
 * Builds src/data/pillars.json: observed 2023–2024 provincial indicators for the six
 * pillars, plus clearly labeled synthetic fields. Run with `node --import tsx scripts/import-pillars.ts`.
 *
 * Observed tables were transcribed from the sources in `provenance` on 1 October 2026.
 * BPS statistics tables are rendered client-side, so values were read from the rendered
 * tables and recorded here rather than downloaded by this script.
 */
import { writeFileSync } from "node:fs";
import baseline from "../src/data/baseline.json" with { type: "json" };
import { gridSystems } from "../src/engine/gridSystems";

// BPS IPM components, 2024 release (new method, Long Form SP2020 life expectancy).
// [life expectancy (years), mean years of schooling, expected years of schooling, IPM 2024]
const ipm: Record<string, [number, number, number, number]> = {
  "11": [73.2, 9.64, 14.39, 75.36],
  "12": [74.08, 9.84, 12.97, 75.76],
  "13": [74.37, 9.44, 14.3, 76.43],
  "14": [74.41, 9.43, 13.42, 75.67],
  "15": [74.06, 8.9, 13.14, 74.36],
  "16": [74.26, 8.57, 12.64, 73.84],
  "17": [73.31, 9.04, 13.75, 74.91],
  "18": [74.39, 8.36, 12.78, 73.13],
  "19": [74.12, 8.33, 12.49, 74.55],
  "21": [75.12, 10.5, 13.27, 79.89],
  "31": [75.99, 11.49, 13.51, 84.15],
  "32": [75.16, 8.87, 12.8, 74.92],
  "33": [74.91, 8.02, 12.86, 73.87],
  "34": [75.36, 9.92, 15.7, 81.62],
  "35": [75.07, 8.28, 13.43, 75.35],
  "36": [74.97, 9.23, 13.1, 76.35],
  "51": [75.1, 9.54, 13.62, 78.63],
  "52": [72.25, 7.87, 13.98, 73.1],
  "53": [71.83, 8.02, 13.23, 69.14],
  "61": [73.94, 7.78, 12.68, 71.19],
  "62": [73.73, 8.81, 12.77, 74.28],
  "63": [74.18, 8.62, 12.87, 75.19],
  "64": [74.94, 10.02, 14.03, 78.79],
  "65": [73.57, 9.35, 13.21, 73.41],
  "71": [73.85, 9.6, 12.78, 75.68],
  "72": [70.84, 9.04, 13.34, 72.24],
  "73": [73.83, 8.86, 13.55, 75.18],
  "74": [71.88, 9.42, 13.71, 73.62],
  "75": [70.73, 8.29, 13.17, 72.01],
  "76": [71.03, 8.15, 12.89, 70.46],
  "81": [70.68, 10.26, 14.09, 73.4],
  "82": [71.05, 9.37, 13.75, 71.84],
  "91": [70.47, 9.82, 13.72, 73.83],
  "92": [68.47, 7.86, 13.17, 67.69],
  "93": [68.46, 8.38, 12.67, 68.86],
  "94": [68.18, 6.12, 9.63, 60.25],
  "95": [67.39, 4.21, 9.97, 54.43],
  "96": [70.02, 8.39, 13.88, 69.65],
};

// Survei Kesehatan Indonesia 2023, stunting prevalence among children under five (%).
const stunting: Record<string, number> = {
  "94": 39.4,
  "53": 37.9,
  "95": 37.3,
  "96": 31.0,
  "76": 30.3,
  "74": 30.0,
  "11": 29.4,
  "91": 28.6,
  "81": 28.4,
  "73": 27.4,
  "72": 27.2,
  "75": 26.9,
  "93": 25.0,
  "92": 24.8,
  "63": 24.7,
  "52": 24.6,
  "61": 24.5,
  "36": 24.0,
  "82": 23.7,
  "13": 23.6,
  "62": 23.5,
  "64": 22.9,
  "32": 21.7,
  "71": 21.3,
  "33": 20.7,
  "19": 20.6,
  "16": 20.3,
  "17": 20.2,
  "12": 18.9,
  "34": 18.0,
  "35": 17.7,
  "31": 17.6,
  "65": 17.4,
  "21": 16.8,
  "18": 14.9,
  "14": 13.6,
  "15": 13.5,
  "51": 7.2,
};

// BPS paddy production by province, 2024 (tons of milled dry grain, GKG).
const rice: Record<string, number> = {
  "11": 1659966.28,
  "12": 2204875.51,
  "13": 1356467.93,
  "14": 222055.71,
  "15": 281022.05,
  "16": 2909411.67,
  "17": 272848.55,
  "18": 2791347.53,
  "19": 77489.79,
  "21": 305.09,
  "31": 2306.54,
  "32": 8626879.91,
  "33": 8891297.05,
  "34": 452831.77,
  "35": 9270435.29,
  "36": 1550623.46,
  "51": 635473.35,
  "52": 1453408.37,
  "53": 707792.54,
  "61": 764784.15,
  "62": 366146.82,
  "63": 1029567.93,
  "64": 249642.9,
  "65": 30079.77,
  "71": 273134.94,
  "72": 761936.39,
  "73": 4818429.39,
  "74": 555836.08,
  "75": 234862.88,
  "76": 318876.59,
  "81": 91125.35,
  "82": 31232.95,
  "92": 20729.15,
  "96": 988.64,
  "91": 4609.95,
  "93": 217789.62,
  "94": 6072.38,
  "95": 42.38,
};

// PLN household electrification ratio, 2022, where a provincial figure was published.
// Papua, Papua Barat, Papua Barat Daya and Sulawesi Barat were reported only as "about
// 87–89%"; the midpoint is used. Other provinces use the synthetic estimate below.
const electrificationObserved: Record<string, number> = {
  "95": 12.09,
  "94": 47.36,
  "93": 73.54,
  "82": 87.42,
  "81": 91.33,
  "33": 99.99,
  "51": 100,
  "31": 100,
  "91": 88,
  "92": 88,
  "96": 88,
  "76": 88,
};

// Synthetic opening reserve margins (capacity ÷ demand) by system.
const reserveMargin: Record<string, number> = {
  Sumatra: 1.14,
  "Jawa-Madura-Bali": 1.18,
  Kalimantan: 1.12,
  Sulawesi: 1.14,
  isolated: 1.08,
};

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const gridOf = (id: string) =>
  Object.entries(gridSystems).find(([, ids]) => ids.includes(id))?.[0] ??
  "isolated";

const provinces = baseline.provinces.map((p) => {
  const [lifeExpectancy, meanSchooling, expectedSchooling, development] =
    ipm[p.id];
  const grid = gridOf(p.id);
  return {
    id: p.id,
    lifeExpectancy,
    meanSchooling,
    expectedSchooling,
    development,
    stunting: stunting[p.id],
    rice: rice[p.id],
    electrification:
      electrificationObserved[p.id] ??
      round(clamp(99.6 - 0.12 * p.poverty - 2.5 * (1 - p.urban), 90, 100), 1),
    electrificationObserved: p.id in electrificationObserved,
    grid,
    reserveMargin: reserveMargin[grid],
    // Synthetic: piped/improved water and irrigation reach, from urban share and poverty.
    water: round(clamp(38 + 40 * p.urban - 0.6 * p.poverty, 15, 90), 1),
    // Synthetic: facility and staff access, from urban share and poverty.
    healthAccess: round(
      clamp(65 + 14 * (p.urban - 0.55) - 0.55 * (p.poverty - 9), 25, 92),
      1,
    ),
  };
});
for (const p of provinces)
  if (
    [p.lifeExpectancy, p.meanSchooling, p.expectedSchooling, p.development]
      .concat([p.stunting, p.rice])
      .some((v) => !Number.isFinite(v))
  )
    throw new Error(`Missing observation for province ${p.id}`);
if (provinces.length !== 38) throw new Error("Expected 38 provinces");
const totalRice = provinces.reduce((n, p) => n + p.rice, 0);
if (Math.abs(totalRice - 53142726.65) > 1)
  throw new Error(`Rice total ${totalRice} does not match BPS national total`);

writeFileSync(
  "src/data/pillars.json",
  JSON.stringify(
    {
      version: "2024.3",
      provenance: {
        ipm: "BPS Indeks Pembangunan Manusia 2024 (new method): life expectancy at birth from Long Form SP2020, mean and expected years of schooling, and IPM. Component values as republished from BPS tables in Wikipedia's 'List of Indonesian provinces by Human Development Index' (accessed 1 October 2026) and cross-checked against BPS 2024 headline figures (national UHH 74.15, RLS 8.85, HLS 13.21; HLS DIY 15.70, Papua Tengah 9.63). IPM 2024 per province from BPS via Katadata Databoks. Papua Pegunungan life expectancy uses 67.39 as reported for 2024 by Katadata from BPS; Wikipedia lists 67.69.",
        stunting:
          "Kementerian Kesehatan, Survei Kesehatan Indonesia (SKI) 2023 nutrition factsheet, figure 3: stunting prevalence among children aged 0–59 months, 38 provinces (national 21.5%). https://repository.badankebijakan.kemkes.go.id/5535/",
        rice: "BPS, Luas Panen, Produktivitas, dan Produksi Padi Menurut Provinsi, 2024 (tons GKG; national 53,142,726.65). https://www.bps.go.id/en/statistics-table/3/WmpaNk1YbGFjR0pOUjBKYWFIQlBSU3MwVHpOVWR6MDkjMw==/",
        electrification:
          "PLN household electrification ratio 2022 where a provincial value was published (as reported by GoodStats). Other provinces are synthetic estimates from poverty and urban share, bounded 90–100%. The PLN ratio counts grid connections and is lower than the ESDM ratio, which includes non-PLN sources.",
        grid: "Grid systems simplified from PLN's interconnected systems: Sumatra, Jawa-Madura-Bali, Kalimantan, Sulawesi; other provinces are treated as isolated. Reserve margins are synthetic gameplay assumptions.",
        synthetic:
          "Water systems, health access, opening food security and grid reserve margins are synthetic gameplay assumptions, not observations.",
        limitations:
          "Rice is the food proxy. Provinces with other staples (for example sweet potato and sago in the Papua highlands) show larger rice deficits than their real food deficits; the model uses changes from the opening position, so these levels do not create opening price differences.",
      },
      provinces,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Wrote ${provinces.length} provinces; rice total ${totalRice.toFixed(2)} t`,
);
