// Import Ardian Saputra Hasibuan's 38-province GeoJSON (MIT).
// Usage: node scripts/import-province-map.mjs /path/to/38-provinces.json
import { readFileSync, writeFileSync } from "node:fs";

const source = JSON.parse(readFileSync(process.argv[2], "utf8"));
const baseline = JSON.parse(
  readFileSync(new URL("../src/data/baseline.json", import.meta.url), "utf8"),
);
const ids = new Map(baseline.provinces.map((p) => [p.name, p.id]));
ids.set("Daerah Istimewa Yogyakarta", "34");
const round = (coordinates) =>
  typeof coordinates[0] === "number"
    ? coordinates.map((n) => Math.round(n * 100000) / 100000)
    : coordinates.map(round);
const features = source.features.map((feature) => {
  const name = feature.properties.PROVINSI;
  const id = ids.get(name);
  if (!id) throw new Error(`Unknown province: ${name}`);
  if (!["Polygon", "MultiPolygon"].includes(feature.geometry.type))
    throw new Error(`Invalid geometry: ${name}`);
  return {
    type: "Feature",
    id,
    properties: { id, KODE_PROV: id, PROVINSI: name },
    geometry: {
      ...feature.geometry,
      coordinates: round(feature.geometry.coordinates),
    },
  };
});
// Upstream Papua codes repeat; names map to the game's stable 38 identifiers.
if (features.length !== 38 || new Set(features.map((f) => f.id)).size !== 38)
  throw new Error("Expected 38 unique provinces");
writeFileSync(
  new URL("../public/data/provinces.geojson", import.meta.url),
  JSON.stringify({ type: "FeatureCollection", features }),
);
console.log("Imported 38 detailed provinces with stable game identifiers");
