import type { Province } from "./worldTypes";
import { gridOf, shipFood, type Shipment } from "./worldNetwork";
import { summarizeRegions, type RegionSummary } from "./engine/gameRegions";

export type Overlay =
  | "landscape"
  | "grids"
  | "foodTrade"
  | "infrastructure"
  | "health"
  | "education"
  | "energy"
  | "food"
  | "development"
  | "growth"
  | "poverty"
  | "unemployment"
  | "population";
export type LayerConfig = {
  name: string;
  min: number;
  max: number;
  unit: string;
  value?: (p: Province) => number;
  fill?: (p: Province) => string;
  label?: (p: Province) => string;
};
export const gridColors: Record<string, string> = {
  Sumatra: "#7f9fa3",
  "Jawa-Madura-Bali": "#c9a866",
  Kalimantan: "#93a77c",
  Sulawesi: "#a597b8",
  isolated: "#efe4c9",
};
export const overlays: Record<Overlay, LayerConfig> = {
  landscape: {
    name: "Landscape",
    min: 0,
    max: 100,
    unit: "",
    value: (p) => p.infrastructure,
    fill: () => "#7f9e56",
    label: () => "Illustrative terrain",
  },
  grids: {
    name: "Power grids",
    min: 0,
    max: 100,
    unit: "",
    value: (p) => p.reliability,
    fill: (p) => gridColors[gridOf(p.id)],
    label: (p) =>
      gridOf(p.id) === "isolated" ? "Isolated island system" : gridOf(p.id),
  },
  foodTrade: {
    name: "Food trade",
    min: 0,
    max: 200,
    unit: "% self-sufficient",
    value: (p) => (p.foodProduction / p.foodNeed) * 100,
  },
  infrastructure: { name: "Infrastructure", min: 25, max: 85, unit: " / 100" },
  health: { name: "Health", min: 30, max: 85, unit: " / 100" },
  education: { name: "Education", min: 25, max: 85, unit: " / 100" },
  energy: {
    name: "Energy",
    min: 30,
    max: 100,
    unit: " / 100",
    value: (p) => p.energy,
  },
  food: {
    name: "Food",
    min: 40,
    max: 95,
    unit: " / 100",
    value: (p) => p.foodSecurity,
  },
  development: { name: "Development index", min: 54, max: 85, unit: "" },
  growth: { name: "Economic growth", min: 0, max: 8, unit: "%" },
  poverty: { name: "Poverty", min: 0, max: 30, unit: "%" },
  unemployment: { name: "Unemployment", min: 0, max: 10, unit: "%" },
  population: {
    name: "Population count",
    min: 0,
    max: 60,
    unit: " million people",
  },
};
export function layerConfig(
  layer: Overlay,
  provinces: Province[],
  previous: Province[] = [],
): LayerConfig {
  return layer === "population"
    ? {
        ...overlays.population,
        max: Math.max(
          10,
          Math.ceil(
            Math.max(...[...provinces, ...previous].map((p) => p.population)) /
              10,
          ) * 10,
        ),
      }
    : overlays[layer];
}
export function layerValue(p: Province, layer: Overlay): number {
  return overlays[layer].value?.(p) ?? (p[layer as keyof Province] as number);
}
export function regionLayerValue(
  region: RegionSummary,
  layer: Overlay,
): number {
  if (layer === "landscape" || layer === "grids") return region.infrastructure;
  if (layer === "foodTrade")
    return region.foodNeed > 0
      ? (region.foodProduction / region.foodNeed) * 100
      : 0;
  return region[layer];
}
export function regionLayerConfig(
  layer: Overlay,
  provinces: Province[],
  previous: Province[] = [],
): LayerConfig {
  if (layer !== "population") return overlays[layer];
  return {
    ...overlays.population,
    max: Math.max(
      10,
      Math.ceil(
        Math.max(
          ...summarizeRegions(provinces).map((r) => r.population),
          ...summarizeRegions(previous).map((r) => r.population),
        ) / 10,
      ) * 10,
    ),
  };
}
export function regionGridLabel(region: {
  provinceIds: readonly string[];
}): string {
  return [...new Set(region.provinceIds.map(gridOf))]
    .map((grid) => (grid === "isolated" ? "Isolated island system" : grid))
    .join(" · ");
}
export function layerColor(value: number, config: LayerConfig): string {
  const t = Math.max(
    0,
    Math.min(1, (value - config.min) / (config.max - config.min)),
  );
  return `hsl(${43 - t * 12}, ${38 - t * 8}%, ${87 - t * 40}%)`;
}
export function foodRoutes(provinces: Province[]): Shipment[] {
  const routes: Shipment[] = [];
  shipFood(
    provinces,
    new Map(provinces.map((p) => [p.id, p.foodProduction])),
    routes,
  );
  return routes
    .sort(
      (a, b) =>
        b.tons - a.tons ||
        a.from.localeCompare(b.from) ||
        a.to.localeCompare(b.to),
    )
    .slice(0, 12);
}
