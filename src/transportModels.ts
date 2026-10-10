import {
  BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  IcosahedronGeometry,
  Shape,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { box, cone, cyl, tint } from "./structureLayout";

/**
 * Small vertex-coloured models for the moving fleet and for crisis scenery.
 * Each model is one merged geometry, so every kind draws as one instanced call.
 * Vehicles face +x and stand on y = 0.
 */
export type TransportModel =
  | "cargo"
  | "ferry"
  | "fishing"
  | "train"
  | "truck"
  | "plane"
  | "runway"
  | "flood"
  | "haze"
  | "crack"
  | "dry"
  | "tent"
  | "crane";

const CORAL = "#eb7057",
  CREAM = "#fffaf0",
  TEAL = "#4d9fb5",
  GREEN = "#247c5e",
  SUN = "#f2b84b",
  INK = "#3e504d",
  GREY = "#8d9b97",
  WOOD = "#c98a4b",
  GLASS = "#9fd7e0";

/** A pointed hull outline, extruded upwards from y = 0. */
function hull(length: number, width: number, depth: number, color: string) {
  const back = -length * 0.5,
    half = width * 0.5;
  const outline = new Shape()
    .moveTo(back, -half * 0.85)
    .lineTo(length * 0.15, -half)
    .quadraticCurveTo(length * 0.38, -half * 0.8, length * 0.55, 0)
    .quadraticCurveTo(length * 0.38, half * 0.8, length * 0.15, half)
    .lineTo(back, half * 0.85)
    .closePath();
  const geometry = new ExtrudeGeometry(outline, {
    depth,
    bevelEnabled: false,
    curveSegments: 3,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.deleteAttribute("uv");
  return tint(geometry, color);
}
/** A cylinder lying along the x axis. */
const lying = (
  r: number,
  length: number,
  x: number,
  y: number,
  z: number,
  color: string,
  segments = 6,
) =>
  tint(
    new CylinderGeometry(r, r, length, segments)
      .rotateZ(Math.PI / 2)
      .translate(x, y, z),
    color,
  );

const BLUEPRINTS: Record<TransportModel, () => BufferGeometry[]> = {
  cargo: () => {
    const stacks: [number, string, string | null][] = [
      [0.33, CORAL, TEAL],
      [0.18, TEAL, CREAM],
      [0.03, SUN, CORAL],
      [-0.12, GREEN, null],
    ];
    return [
      hull(1.15, 0.3, 0.12, CORAL),
      box(1.0, 0.03, 0.24, -0.06, 0.12, 0, CREAM),
      ...stacks.flatMap(([x, bottom, top]) => [
        box(0.13, 0.08, 0.21, x, 0.15, 0, bottom),
        ...(top ? [box(0.13, 0.07, 0.21, x, 0.23, 0, top)] : []),
      ]),
      box(0.16, 0.16, 0.22, -0.38, 0.15, 0, CREAM),
      box(0.18, 0.03, 0.24, -0.38, 0.31, 0, GREEN),
      cyl(0.03, 0.035, 0.1, 6, -0.45, 0.34, 0, CORAL),
    ];
  },
  ferry: () => [
    hull(0.8, 0.26, 0.1, CREAM),
    box(0.62, 0.03, 0.2, -0.04, 0.1, 0, TEAL),
    box(0.56, 0.1, 0.2, -0.06, 0.13, 0, CREAM),
    box(0.5, 0.025, 0.205, -0.06, 0.18, 0, GLASS),
    box(0.36, 0.08, 0.17, -0.1, 0.23, 0, CREAM),
    box(0.4, 0.02, 0.19, -0.1, 0.31, 0, GREEN),
    cyl(0.025, 0.03, 0.08, 6, -0.2, 0.33, 0, CORAL),
  ],
  fishing: () => [
    hull(0.32, 0.1, 0.05, WOOD),
    box(0.08, 0.05, 0.07, -0.06, 0.05, 0, CREAM),
    cyl(0.006, 0.006, 0.2, 4, 0.04, 0.05, 0, INK),
    tint(
      new CylinderGeometry(0, 0.08, 0.16, 3)
        .scale(1, 1, 0.12)
        .translate(0.07, 0.15, 0),
      CREAM,
    ),
  ],
  // Light body and dark roof; the instance colour paints the livery.
  train: () => [
    box(0.2, 0.06, 0.07, 0, 0.01, 0, CREAM),
    box(0.18, 0.012, 0.072, 0, 0.045, 0, GLASS),
    box(0.19, 0.012, 0.06, 0, 0.07, 0, GREY),
  ],
  truck: () => [
    box(0.13, 0.08, 0.075, -0.03, 0.005, 0, CREAM),
    box(0.055, 0.06, 0.07, 0.07, 0.005, 0, CREAM),
    box(0.02, 0.025, 0.072, 0.09, 0.035, 0, GLASS),
  ],
  plane: () => [
    lying(0.045, 0.62, 0, 0, 0, CREAM),
    tint(
      new CylinderGeometry(0.045, 0.012, 0.12, 6)
        .rotateZ(-Math.PI / 2)
        .translate(0.37, 0, 0),
      CREAM,
    ),
    box(0.16, 0.012, 0.72, 0.03, -0.01, 0, CREAM),
    box(0.1, 0.01, 0.26, -0.27, 0.0, 0, CREAM),
    box(0.1, 0.12, 0.012, -0.27, 0.02, 0, CORAL),
    box(0.5, 0.012, 0.092, 0, 0.0, 0, TEAL),
  ],
  runway: () => [
    box(1.0, 0.015, 0.15, 0, 0, 0, "#7d8a86"),
    ...[-0.36, -0.18, 0, 0.18, 0.36].map((x) =>
      box(0.08, 0.004, 0.015, x, 0.015, 0, CREAM),
    ),
    box(0.2, 0.08, 0.12, 0.05, 0, 0.22, CREAM),
    box(0.22, 0.02, 0.14, 0.05, 0.08, 0.22, TEAL),
    cyl(0.02, 0.025, 0.2, 5, -0.15, 0, 0.2, CREAM),
    box(0.06, 0.04, 0.06, -0.15, 0.2, 0.2, GLASS),
  ],
  // Crisis scenery, sized for a unit footprint.
  flood: () => [
    tint(
      new CylinderGeometry(0.5, 0.5, 0.02, 7).translate(0, 0.01, 0),
      "#6cc3d5",
    ),
    tint(
      new CylinderGeometry(0.3, 0.3, 0.022, 6).translate(0.12, 0.012, -0.06),
      "#8fd6e2",
    ),
  ],
  haze: () => [
    tint(new IcosahedronGeometry(0.32, 0).translate(0, 0, 0), "#d9d3c4"),
    tint(
      new IcosahedronGeometry(0.24, 0).translate(0.3, -0.05, 0.1),
      "#cbc4b3",
    ),
    tint(
      new IcosahedronGeometry(0.2, 0).translate(-0.28, -0.06, -0.08),
      "#e4dfd2",
    ),
  ],
  crack: () =>
    [
      [-0.4, -0.05, 0.6],
      [-0.12, 0.08, -0.5],
      [0.14, -0.04, 0.7],
      [0.38, 0.1, -0.4],
    ].map(([x, z, ry]) => box(0.3, 0.02, 0.05, x, 0, z, "#6e5644", ry)),
  dry: () => [
    box(0.8, 0.015, 0.55, 0, 0, 0, "#d9b46a"),
    ...[-0.18, 0, 0.18].map((z) =>
      box(0.72, 0.02, 0.05, 0, 0.005, z, "#b98e4a"),
    ),
  ],
  tent: () => [
    cone(0.22, 0.2, 4, 0, 0, 0, CREAM),
    cyl(0.008, 0.008, 0.32, 4, 0.18, 0, 0, INK),
    box(0.1, 0.06, 0.01, 0.23, 0.25, 0, CORAL),
  ],
  crane: () => [
    box(0.05, 0.6, 0.05, 0, 0, 0, SUN),
    box(0.42, 0.04, 0.04, 0.12, 0.58, 0, SUN),
    box(0.08, 0.06, 0.06, -0.1, 0.58, 0, INK),
    cyl(0.004, 0.004, 0.22, 3, 0.28, 0.36, 0, INK),
  ],
};

const cache = new Map<TransportModel, BufferGeometry>();
export function transportGeometry(model: TransportModel) {
  let geometry = cache.get(model);
  if (!geometry) {
    const parts = BLUEPRINTS[model]();
    geometry = mergeGeometries(parts, false)!;
    parts.forEach((part) => part.dispose());
    geometry.computeBoundingSphere();
    cache.set(model, geometry);
  }
  return geometry;
}
