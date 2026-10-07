import { describe, expect, it } from "vitest";
import { POLICY_IDS } from "./engine/economy/types";
import { structureGeometry, type StructureKind } from "./structureLayout";

const kinds: StructureKind[] = [...POLICY_IDS, "crane", "ship"];

describe("policy structure models", () => {
  it.each(kinds)("builds a complete, renderable %s model", (kind) => {
    const geometry = structureGeometry(kind);
    expect(geometry).toBeTruthy();
    const position = geometry.getAttribute("position");
    expect(position.count).toBeGreaterThan(0);
    expect(position.count % 3).toBe(0);
    for (const name of ["position", "normal", "color"]) {
      const attribute = geometry.getAttribute(name);
      expect(attribute.itemSize).toBe(3);
      expect(attribute.count).toBe(position.count);
      expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
    }
    geometry.computeBoundingSphere();
    expect(geometry.boundingSphere!.radius).toBeGreaterThan(0);
    expect(Number.isFinite(geometry.boundingSphere!.radius)).toBe(true);
  });
});
