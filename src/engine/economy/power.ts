import pillars from "../../data/pillars.json";
import type { QuarterGame } from "./types";

const grids = new Map(
  pillars.provinces.map((province) => [province.id, province.grid]),
);

export function powerNetworks(game: QuarterGame) {
  const networks = new Map<
    string,
    { name: string; capacity: number; demand: number; pending: number }
  >();
  for (const province of game.simulation.provinces) {
    const grid = grids.get(province.id)!;
    const key = grid === "isolated" ? province.id : grid;
    const network = networks.get(key) ?? {
      name: grid === "isolated" ? province.name : grid,
      capacity: 0,
      demand: 0,
      pending: 0,
    };
    network.capacity += province.powerCapacity;
    network.demand += province.powerDemand;
    network.pending += province.powerPipeline;
    networks.set(key, network);
  }
  return [...networks.entries()]
    .map(([id, network]) => ({
      id,
      ...network,
      reserve: 100 * (network.capacity / network.demand - 1),
      pendingPercent: (100 * network.pending) / network.demand,
    }))
    .sort((a, b) => a.reserve - b.reserve || a.id.localeCompare(b.id));
}
