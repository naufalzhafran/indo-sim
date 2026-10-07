import {
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { LocalSceneryKind } from "./localScenery";

function tint(geometry: BufferGeometry, color: string) {
  const base = geometry.index ? geometry.toNonIndexed() : geometry;
  if (base !== geometry) geometry.dispose();
  const c = new Color(color);
  const colors = new Float32Array(base.attributes.position.count * 3);
  for (let i = 0; i < colors.length; i += 3) {
    colors[i] = c.r;
    colors[i + 1] = c.g;
    colors[i + 2] = c.b;
  }
  base.setAttribute("color", new Float32BufferAttribute(colors, 3));
  base.deleteAttribute("uv");
  return base;
}

const box = (
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  color: string,
) => tint(new BoxGeometry(w, h, d).translate(x, y, z), color);

function houseDetails() {
  return [
    // Cream lintels and teal shutters keep the small homes legible up close.
    box(0.19, 0.21, 0.025, -0.235, 0.37, 0.336, "#e7d8ad"),
    box(0.13, 0.14, 0.03, -0.235, 0.37, 0.35, "#477c70"),
    box(0.19, 0.21, 0.025, 0.235, 0.37, 0.336, "#e7d8ad"),
    box(0.13, 0.14, 0.03, 0.235, 0.37, 0.35, "#477c70"),
    box(0.025, 0.21, 0.19, 0.368, 0.37, 0, "#e7d8ad"),
    box(0.03, 0.14, 0.13, 0.382, 0.37, 0, "#477c70"),
    box(0.29, 0.06, 0.14, 0, 0.025, 0.39, "#cf9569"),
    box(0.015, 0.025, 0.016, 0.065, 0.23, 0.35, "#f4cb76"),
  ];
}

function treeDetails() {
  return [
    tint(
      new IcosahedronGeometry(0.31, 0)
        .scale(1, 0.85, 0.9)
        .translate(-0.27, 1.26, 0.16),
      "#82bd62",
    ),
    tint(
      new IcosahedronGeometry(0.24, 0)
        .scale(0.8, 1, 0.8)
        .translate(0.27, 1.57, -0.06),
      "#77b660",
    ),
  ];
}

/** Each kind is a single coloured mesh, so detail costs at most four draw calls. */
export function createLocalSceneryModels(): Record<
  LocalSceneryKind,
  BufferGeometry
> {
  const parts: Record<LocalSceneryKind, BufferGeometry[]> = {
    tree: [
      tint(
        new CylinderGeometry(0.09, 0.13, 0.85, 5).translate(0, 0.42, 0),
        "#986d3b",
      ),
      tint(
        new IcosahedronGeometry(0.7, 0)
          .scale(0.72, 1, 0.72)
          .translate(0, 1.02, 0),
        "#438b54",
      ),
      tint(
        new IcosahedronGeometry(0.62, 0)
          .scale(0.65, 0.85, 0.65)
          .translate(0.11, 1.33, 0.04),
        "#6bb65a",
      ),
    ],
    house: [
      box(0.72, 0.65, 0.65, 0, 0.32, 0, "#fff5d7"),
      tint(
        new ConeGeometry(0.68, 0.5, 4)
          .rotateY(Math.PI / 4)
          .translate(0, 0.78, 0),
        "#e17c51",
      ),
      box(0.2, 0.43, 0.018, 0, 0.23, 0.334, "#677a61"),
      ...houseDetails(),
    ],
    "tree-detail": treeDetails(),
    "house-detail": houseDetails(),
  };
  return Object.fromEntries(
    Object.entries(parts).map(([kind, geometries]) => {
      const merged = mergeGeometries(geometries)!;
      geometries.forEach((geometry) => geometry.dispose());
      merged.computeBoundingSphere();
      return [kind, merged];
    }),
  ) as Record<LocalSceneryKind, BufferGeometry>;
}
