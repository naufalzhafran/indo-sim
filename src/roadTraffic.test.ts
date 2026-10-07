import { describe, expect, it } from "vitest";
import { Frustum, Matrix4, OrthographicCamera, Vector3 } from "three";
import type { Road, RoadClass } from "./roadNetwork";
import {
  buildTrafficPlan,
  MAX_VEHICLES,
  sampleTrafficVehicle,
} from "./roadTraffic";

function corridor(
  id: string,
  length: number,
  x = 0,
  roadClass: RoadClass = "national",
) {
  const road: Road = {
    id,
    points: [new Vector3(x, 1, 0), new Vector3(x + length, 1, 0)],
    distances: [0, length],
    length,
    provinces: [id, id],
  };
  return { road, runs: [{ roadClass, province: id, from: 0, to: 1 }] };
}

describe("visible road traffic", () => {
  it("keeps the national road density and adds no more than twice that density at close zoom", () => {
    for (const [roadClass, spacing] of [
      ["track", 7],
      ["national", 2.4],
      ["toll", 1.1],
    ] as const) {
      const plan = buildTrafficPlan([corridor("road", 29, 0, roadClass)]);
      expect(plan.vehicles.filter((vehicle) => !vehicle.local)).toHaveLength(
        Math.floor(29 / spacing),
      );
      expect(plan.vehicles).toHaveLength(Math.floor(58 / spacing));
      const firstLocal = plan.vehicles.findIndex((vehicle) => vehicle.local);
      expect(
        plan.vehicles.slice(firstLocal).every((vehicle) => vehicle.local),
      ).toBe(true);
    }
  });

  it("gives eastern corridors a share before the national 160-vehicle budget fills", () => {
    const plan = buildTrafficPlan(
      Array.from({ length: 37 }, (_, i) => corridor(`road-${i}`, 24, i * 30)),
    );
    const national = plan.vehicles
      .filter((vehicle) => !vehicle.local)
      .slice(0, MAX_VEHICLES);
    expect(national).toHaveLength(MAX_VEHICLES);
    expect(new Set(national.map((vehicle) => vehicle.group)).size).toBe(37);
    expect(
      national.filter((vehicle) => vehicle.group === 36).length,
    ).toBeGreaterThanOrEqual(4);
  });

  it("culls western runs without losing the eastern vehicles' elapsed-time position", () => {
    const plan = buildTrafficPlan([
      corridor("west", 24),
      corridor("east", 24, 100),
    ]);
    const camera = new OrthographicCamera(-15, 15, 15, -15, 0.1, 100);
    camera.position.set(112, 1, 20);
    camera.lookAt(112, 1, 0);
    camera.updateMatrixWorld();
    const frustum = new Frustum().setFromProjectionMatrix(
      new Matrix4().multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse,
      ),
    );
    expect(frustum.intersectsBox(plan.groups[0].bounds)).toBe(false);
    expect(frustum.intersectsBox(plan.groups[1].bounds)).toBe(true);
    const vehicle = plan.vehicles.find((candidate) => candidate.group === 1)!;
    const position = new Vector3(),
      resumed = new Vector3();
    sampleTrafficVehicle(vehicle, plan.groups[1], 0, position);
    const initial = position.clone();
    sampleTrafficVehicle(vehicle, plan.groups[1], 40, position);
    // Sampling after any number of offscreen frames produces the same trajectory.
    sampleTrafficVehicle(vehicle, plan.groups[1], 40, resumed);
    expect(position.equals(initial)).toBe(false);
    expect(resumed.equals(position)).toBe(true);
    expect(plan.groups[1].bounds.containsPoint(position)).toBe(true);
  });

  it("follows sampled road distances and remains in its province run", () => {
    const source = corridor("road", 12);
    source.road.points = [
      new Vector3(0, 1, 0),
      new Vector3(1, 2, 0),
      new Vector3(4, 5, 0),
      new Vector3(12, 5, 0),
    ];
    source.road.distances = [0, 1, 4, 12];
    source.runs[0].from = 1;
    source.runs[0].to = 2;
    const plan = buildTrafficPlan([source]);
    const position = new Vector3();
    const vehicle = { ...plan.vehicles[0], phase: 0.5, forward: true };
    sampleTrafficVehicle(vehicle, plan.groups[0], 0, position);
    expect(position.x).toBeCloseTo(2.5);
    expect(position.y).toBeCloseTo(3.565);
    for (let time = 0; time < 100; time++) {
      sampleTrafficVehicle(vehicle, plan.groups[0], time, position);
      expect(position.x).toBeGreaterThanOrEqual(1);
      expect(position.x).toBeLessThanOrEqual(4);
    }
  });
});
