import network from "../../data/network.json" with { type: "json" };

export type FoodProvince = {
  id: string;
  foodNeed: number;
  infrastructure: number;
};
export type Shipment = { from: string; to: string; tons: number };
export type FoodFlow = { received: number; imported: number; unmet: number };

const index = new Map(network.ids.map((id, i) => [id, i]));
const clamp = (value: number, low: number, high: number) =>
  Math.max(low, Math.min(high, value));

/** One snapshot produces food deliveries and routes in annualized staple-food equivalents. */
export function shipFood(
  provinces: readonly FoodProvince[],
  production: ReadonlyMap<string, number>,
  shipments?: Shipment[],
): Map<string, FoodFlow> {
  const deficits = provinces.map((p) =>
    Math.max(0, p.foodNeed - (production.get(p.id) ?? 0)),
  );
  const received = provinces.map(() => 0);
  const routes: Shipment[] = [];
  for (const source of provinces) {
    const surplus = Math.max(
      0,
      (production.get(source.id) ?? 0) - source.foodNeed,
    );
    if (!surplus) continue;
    const weights = provinces.map(
      (p, i) =>
        deficits[i] *
        network.links[index.get(source.id)!][index.get(p.id)!] *
        clamp((source.infrastructure + p.infrastructure) / 120, 0.3, 1),
    );
    const total = weights.reduce((sum, value) => sum + value, 0);
    if (!total) continue;
    weights.forEach((weight, i) => {
      const tons = ((surplus * weight) / total) * 0.8;
      received[i] += tons;
      if (shipments && tons > 0)
        routes.push({ from: source.id, to: provinces[i].id, tons });
    });
  }
  if (shipments) {
    const targetIndex = new Map(provinces.map((p, i) => [p.id, i]));
    for (const route of routes) {
      const i = targetIndex.get(route.to)!;
      shipments.push({
        ...route,
        tons: route.tons * Math.min(1, deficits[i] / received[i]),
      });
    }
  }
  return new Map(
    provinces.map((p, i) => {
      const delivered = Math.min(deficits[i], received[i]);
      const remaining = Math.max(0, deficits[i] - delivered);
      const imported =
        remaining * clamp(0.65 + 0.003 * (p.infrastructure - 50), 0.4, 0.95);
      return [
        p.id,
        {
          received: delivered,
          imported,
          unmet: p.foodNeed > 0 ? (remaining - imported) / p.foodNeed : 0,
        },
      ];
    }),
  );
}
