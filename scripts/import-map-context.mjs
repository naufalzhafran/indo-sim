// Extract regional context from Natural Earth's public-domain 10m countries.
// Usage: node scripts/import-map-context.mjs /path/to/ne_10m_admin_0_countries.geojson
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const names = [
  "Malaysia",
  "Singapore",
  "Brunei",
  "Thailand",
  "Vietnam",
  "Cambodia",
  "Laos",
  "Myanmar",
  "Philippines",
  "East Timor",
  "Papua New Guinea",
  "Australia",
  "China",
  "India",
  "Bangladesh",
];
const source = JSON.parse(readFileSync(process.argv[2], "utf8"));
const features = source.features
  .filter((f) => names.includes(f.properties.ADMIN))
  .map((f) => ({
    type: "Feature",
    properties: {
      name:
        f.properties.ADMIN === "East Timor"
          ? "Timor-Leste"
          : f.properties.ADMIN,
    },
    geometry: f.geometry,
  }));
if (features.length !== names.length)
  throw new Error("Missing context countries");
const directory = mkdtempSync(join(tmpdir(), "indonesia-map-"));
try {
  const input = join(directory, "region.geojson");
  writeFileSync(input, JSON.stringify({ type: "FeatureCollection", features }));
  // Build-time only: shared topology is simplified together, and tiny country
  // features (notably Singapore) must survive the reduction.
  execFileSync(
    "npx",
    [
      "--yes",
      "mapshaper@0.7.70",
      "-i",
      input,
      "-simplify",
      "3%",
      "keep-shapes",
      "-o",
      fileURLToPath(new URL("../public/data/region.geojson", import.meta.url)),
      "format=geojson",
      "precision=0.001",
      "force",
    ],
    { stdio: "inherit" },
  );
  console.log(`Imported ${features.length} simplified context countries`);
} finally {
  rmSync(directory, { recursive: true, force: true });
}
