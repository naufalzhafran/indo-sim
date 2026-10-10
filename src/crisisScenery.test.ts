import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildWorldGeometry } from "./mapGeometry";
import type { MapData } from "./mapData";
import { crisisIntensity, layoutCrisisScenery } from "./crisisScenery";
import type { Crisis } from "./worldTypes";

const map = JSON.parse(
  readFileSync(
    new URL("../public/data/provinces.geojson", import.meta.url),
    "utf8",
  ),
) as MapData;
const world = buildWorldGeometry(map);
const crisis = (overrides: Partial<Crisis>): Crisis => ({
  id: "crisis-3-33",
  title: "Flood damage",
  description: "",
  province: "33",
  months: 12,
  severity: 0.55,
  response: "relief",
  resolved: false,
  kind: "flood",
  stage: "active",
  damage: 0.55,
  initialDamage: 0.55,
  age: 1,
  ...overrides,
});

describe("crisis scenery", () => {
  it("shows each kind of crisis with its own scenery", () => {
    const layout = layoutCrisisScenery(world, [
      crisis({ id: "a", kind: "flood", province: "33" }),
      crisis({ id: "b", kind: "harvest", province: "35" }),
      crisis({ id: "c", kind: "outbreak", province: "73" }),
      crisis({ id: "d", kind: "haze", province: "64" }),
      crisis({ id: "e", kind: "earthquake", province: "32" }),
    ]);
    for (const model of ["flood", "dry", "tent", "haze", "crack"] as const)
      expect(layout.get(model)?.length, model).toBeGreaterThan(1);
    expect(layout.has("crane")).toBe(false);
  });

  it("adds cranes in recovery and clears the scenery once resolved", () => {
    const recovering = layoutCrisisScenery(world, [
      crisis({ stage: "recovery", damage: 0.2 }),
    ]);
    expect(recovering.get("crane")?.length).toBeGreaterThan(0);
    expect(
      crisisIntensity(crisis({ stage: "recovery", damage: 0.2 })),
    ).toBeLessThan(crisisIntensity(crisis({})));
    expect(layoutCrisisScenery(world, [crisis({ resolved: true })]).size).toBe(
      0,
    );
  });

  it("keeps the pieces on land inside the province's area", () => {
    const province = world.provinces.find((p) => p.id === "33")!;
    for (const piece of layoutCrisisScenery(world, [crisis({})]).get(
      "flood",
    )!) {
      expect(piece.position.y).toBeGreaterThan(0.05);
      expect(
        province.bounds.containsPoint(
          piece.position.clone().setY(province.bounds.min.y),
        ),
      ).toBe(true);
    }
  });
});
