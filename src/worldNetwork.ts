import network from "./data/network.json" with { type: "json" };

const index = new Map(network.ids.map((id, i) => [id, i]));
export const gridOf = (id: string) => network.grids[index.get(id)!];
export { shipFood, type Shipment } from "./engine/economy/network";
