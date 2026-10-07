/**
 * Builds src/data/network.json, the fixed 38 × 38 province link table used by food trade,
 * growth spillovers, worker flows and outbreak spread. Run with
 * `node --import tsx scripts/build-network.ts`.
 *
 * link(i, j) = lane(i, j) × exp(−distance / 2500 km), using great-circle distance between
 * province centroids from the bundled map. Lanes are gameplay assumptions: same island
 * group 1, neighbouring groups 0.6, other sea lanes 0.35. Transport condition at both ends
 * scales these links during play.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { geoArea, geoCentroid, geoDistance } from "d3-geo";
import type { Feature, FeatureCollection, Geometry, Polygon } from "geojson";
import baseline from "../src/data/baseline.json" with { type: "json" };
import { gridSystems } from "../src/engine/gridSystems";

const map = JSON.parse(
  readFileSync("public/data/provinces.geojson", "utf8"),
) as FeatureCollection<Geometry, { KODE_PROV: string; PROVINSI: string }>;
const orient = (rings: Polygon["coordinates"]) =>
  geoArea({ type: "Polygon", coordinates: rings }) > 2 * Math.PI
    ? rings.map((ring) => [...ring].reverse())
    : rings;
const centroid = (f: Feature<Geometry>) => {
  const g = f.geometry;
  const geometry =
    g.type === "Polygon"
      ? { ...g, coordinates: orient(g.coordinates) }
      : g.type === "MultiPolygon"
        ? { ...g, coordinates: g.coordinates.map(orient) }
        : g;
  return geoCentroid({ ...f, geometry });
};
const group = (id: string) =>
  id[0] === "9"
    ? "Papua"
    : ({
        "1": "Sumatra",
        "2": "Sumatra",
        "3": "Java",
        "5": "Bali-Nusa",
        "6": "Kalimantan",
        "7": "Sulawesi",
        "8": "Maluku",
      }[id[0]] ?? "Papua");
const neighbours = new Set(
  [
    ["Sumatra", "Java"],
    ["Java", "Bali-Nusa"],
    ["Java", "Kalimantan"],
    ["Sumatra", "Kalimantan"],
    ["Kalimantan", "Sulawesi"],
    ["Bali-Nusa", "Sulawesi"],
    ["Sulawesi", "Maluku"],
    ["Maluku", "Papua"],
  ].flatMap(([a, b]) => [`${a}|${b}`, `${b}|${a}`]),
);
const ids = baseline.provinces.map((p) => p.id);
const centroids = Object.fromEntries(
  ids.map((id) => {
    const feature = map.features.find((f) => f.properties.KODE_PROV === id);
    if (!feature) throw new Error(`Province ${id} is missing from the map`);
    return [id, centroid(feature)];
  }),
);
const earthKm = 6371;
const km = ids.map((a) =>
  ids.map((b) => geoDistance(centroids[a], centroids[b]) * earthKm),
);
const links = ids.map((a, i) =>
  ids.map((b, j) => {
    if (i === j) return 0;
    const lane =
      group(a) === group(b)
        ? 1
        : neighbours.has(`${group(a)}|${group(b)}`)
          ? 0.6
          : 0.35;
    return Math.round(lane * Math.exp(-km[i][j] / 2500) * 1e4) / 1e4;
  }),
);
const grid = (id: string) =>
  Object.entries(gridSystems).find(([, members]) =>
    members.includes(id),
  )?.[0] ?? "isolated";
writeFileSync(
  "src/data/network.json",
  JSON.stringify(
    {
      version: "2024.3",
      method:
        "lane × exp(−km/2500). Lanes: same island group 1, neighbouring groups 0.6, other sea lanes 0.35. Centroids from public/data/provinces.geojson. Gameplay assumptions, not observed freight flows.",
      ids,
      groups: ids.map(group),
      grids: ids.map(grid),
      centroids: ids.map((id) =>
        centroids[id].map((v) => Math.round(v * 100) / 100),
      ),
      distanceKm: km.map((row) => row.map((v) => Math.round(v))),
      links,
    },
    null,
    1,
  ) + "\n",
);
console.log(`Wrote ${ids.length} × ${ids.length} link table`);
