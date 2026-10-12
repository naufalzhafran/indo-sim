import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  LatheGeometry,
  Shape,
  Vector2,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { box, cone, cyl, tint } from "./structureLayout";

/**
 * Small vertex-coloured models for the moving fleet and for crisis scenery.
 * Each model is one merged geometry, so every kind draws as one instanced call.
 * Vehicles face +x and stand on y = 0.
 */
export type TransportModel =
  | "car"
  | "cargo"
  | "tol-laut"
  | "ferry"
  | "fishing"
  | "train"
  | "locomotive"
  | "truck"
  | "plane"
  | "runway"
  | "wake"
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
  GLASS = "#9fd7e0",
  /** Paintable parts: the instance colour shows through unchanged. */
  PAINT = "#ffffff",
  /** Tinted windows and tyres stay dark under any instance colour. */
  WINDOW = "#4f6b70",
  TYRE = "#33403e",
  WATERLINE = "#b4493a";

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

/** A flat outline in the x–y plane, given `depth` across z and centred on it. */
function profile(points: [number, number][], depth: number, color: string) {
  const geometry = new ExtrudeGeometry(
    new Shape(points.map(([x, y]) => new Vector2(x, y))),
    { depth, bevelEnabled: false },
  ).translate(0, 0, -depth / 2);
  geometry.deleteAttribute("uv");
  return tint(geometry, color);
}
/** A flat outline in the x–z plane (y up), `thickness` tall from `y`. */
function plate(
  points: [number, number][],
  thickness: number,
  y: number,
  color: string,
) {
  return profile(points, thickness, color)
    .rotateX(Math.PI / 2)
    .translate(0, y + thickness / 2, 0);
}
/** A box tilted about z, for raked windscreens. */
const raked = (
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  angle: number,
  color: string,
) => tint(new BoxGeometry(w, h, d).rotateZ(angle).translate(x, y, 0), color);
/** Matching axle pair: one dark block reads as two wheels from any side. */
const axle = (x: number, width: number, r: number) =>
  box(r * 2, r * 2, width, x, 0, 0, TYRE);
/** A low cargo-ship or ferry hull with a dark band at the waterline. */
const bandedHull = (
  length: number,
  width: number,
  depth: number,
  color: string,
  band = WATERLINE,
) => [
  hull(length, width, 0.035, band),
  hull(length * 0.99, width * 0.99, depth - 0.035, color).translate(
    0,
    0.035,
    0,
  ),
];

/**
 * Foam behind a moving hull: two bow waves fanning out and a stern trail,
 * fading to clear. Sized for a hull about one unit long; scaled by speed.
 * Its colour attribute carries alpha, so draw it with a transparent material.
 */
function wake() {
  const positions: number[] = [],
    colors: number[] = [];
  const quad = (
    a: [number, number, number],
    b: [number, number, number],
    c: [number, number, number],
    d: [number, number, number],
  ) => {
    // [x, z, opacity] corners; the wake material is double-sided.
    for (const [x, z, alpha] of [a, b, c, a, c, d]) {
      positions.push(x, 0, z);
      colors.push(1, 1, 1, alpha);
    }
  };
  for (const side of [1, -1]) {
    // Bow wave: a thin arm from the bow back and outwards.
    quad(
      [0.5, side * 0.1, 0.45],
      [0.46, side * 0.15, 0.45],
      [-0.95, side * 0.4, 0],
      [-0.9, side * 0.32, 0],
    );
    // Stern trail: churned water narrowing to a point.
    quad(
      [-0.45, side * 0.11, 0.6],
      [-0.45, 0, 0.6],
      [-1.25, 0, 0],
      [-1.0, side * 0.04, 0],
    );
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 4));
  return [geometry];
}

/** A passenger jet's round body: blunt nose, tapering tail cone. */
function fuselage() {
  const outline: [number, number][] = [
    [0, 0.34],
    [0.018, 0.325],
    [0.036, 0.29],
    [0.045, 0.24],
    [0.045, -0.12],
    [0.036, -0.24],
    [0.016, -0.32],
    [0, -0.33],
  ];
  const geometry = new LatheGeometry(
    outline.map(([r, y]) => new Vector2(r, y)),
    8,
  ).rotateZ(-Math.PI / 2);
  geometry.deleteAttribute("uv");
  return tint(geometry, CREAM);
}

const BLUEPRINTS: Record<TransportModel, () => BufferGeometry[]> = {
  // A small hatchback; the instance colour paints the body.
  car: () => [
    axle(0.048, 0.082, 0.016),
    axle(-0.05, 0.082, 0.016),
    box(0.165, 0.03, 0.076, 0, 0.012, 0, PAINT),
    box(0.09, 0.03, 0.07, -0.014, 0.042, 0, PAINT),
    box(0.092, 0.016, 0.072, -0.014, 0.048, 0, WINDOW),
    raked(0.004, 0.022, 0.064, 0.03, 0.055, -0.6, WINDOW),
  ],
  cargo: () => {
    const stacks: [number, string, string | null][] = [
      [0.33, CORAL, TEAL],
      [0.18, TEAL, CREAM],
      [0.03, SUN, CORAL],
      [-0.12, GREEN, null],
    ];
    return [
      ...bandedHull(1.15, 0.3, 0.12, CORAL),
      box(1.0, 0.03, 0.24, -0.06, 0.12, 0, CREAM),
      // Raised bow (forecastle) ahead of the container bays.
      box(0.1, 0.04, 0.2, 0.45, 0.12, 0, CORAL),
      ...stacks.flatMap(([x, bottom, top]) => [
        box(0.13, 0.08, 0.21, x, 0.15, 0, bottom),
        ...(top ? [box(0.13, 0.07, 0.21, x, 0.23, 0, top)] : []),
      ]),
      box(0.16, 0.16, 0.22, -0.38, 0.15, 0, CREAM),
      box(0.165, 0.025, 0.225, -0.38, 0.255, 0, WINDOW),
      box(0.12, 0.012, 0.3, -0.36, 0.272, 0, CREAM),
      box(0.18, 0.03, 0.24, -0.38, 0.31, 0, GREEN),
      cyl(0.03, 0.035, 0.1, 6, -0.45, 0.34, 0, CORAL),
      cyl(0.006, 0.006, 0.12, 4, 0.45, 0.16, 0, INK),
    ];
  },
  // Tol Laut: a white-hulled government freighter with a coral band and a
  // short row of containers, so it reads apart from the coral cargo lines.
  "tol-laut": () => [
    hull(1.0, 0.28, 0.035, WATERLINE),
    hull(0.99, 0.278, 0.03, CORAL).translate(0, 0.035, 0),
    hull(0.96, 0.27, 0.07, CREAM).translate(0, 0.06, 0),
    box(0.86, 0.025, 0.22, -0.05, 0.13, 0, TEAL),
    box(0.12, 0.08, 0.19, 0.24, 0.155, 0, SUN),
    box(0.12, 0.08, 0.19, 0.1, 0.155, 0, TEAL),
    box(0.12, 0.08, 0.19, -0.04, 0.155, 0, CORAL),
    box(0.2, 0.17, 0.21, -0.3, 0.155, 0, CREAM),
    box(0.205, 0.022, 0.215, -0.3, 0.24, 0, WINDOW),
    box(0.17, 0.02, 0.2, -0.3, 0.27, 0, GLASS),
    box(0.22, 0.03, 0.23, -0.3, 0.325, 0, GREEN),
    cyl(0.028, 0.032, 0.09, 6, -0.38, 0.35, 0, CORAL),
  ],
  // A roll-on/roll-off ferry: white decks, window rows, lifeboats, twin funnels.
  ferry: () => [
    ...bandedHull(0.8, 0.26, 0.1, CREAM, "#2f6f73"),
    box(0.62, 0.03, 0.2, -0.04, 0.1, 0, TEAL),
    box(0.56, 0.1, 0.2, -0.06, 0.13, 0, CREAM),
    box(0.54, 0.022, 0.205, -0.06, 0.17, 0, WINDOW),
    box(0.36, 0.08, 0.17, -0.1, 0.23, 0, CREAM),
    box(0.06, 0.02, 0.175, 0.05, 0.27, 0, WINDOW),
    box(0.26, 0.016, 0.175, -0.14, 0.255, 0, GLASS),
    box(0.4, 0.02, 0.19, -0.1, 0.31, 0, GREEN),
    ...[-0.04, -0.17].flatMap((x) =>
      [-1, 1].map((side) => box(0.08, 0.03, 0.03, x, 0.23, side * 0.093, SUN)),
    ),
    // Stern ramp, raised for the crossing.
    box(0.025, 0.08, 0.16, -0.4, 0.1, 0, TEAL),
    cyl(0.022, 0.028, 0.08, 6, -0.2, 0.33, 0.045, CORAL),
    cyl(0.022, 0.028, 0.08, 6, -0.2, 0.33, -0.045, CORAL),
  ],
  // A jukung: slim outrigger canoe with bamboo floats and a bright sail.
  fishing: () => [
    hull(0.34, 0.07, 0.035, CREAM),
    hull(0.335, 0.072, 0.012, TEAL).translate(0, 0.03, 0),
    box(0.06, 0.04, 0.05, -0.08, 0.035, 0, WOOD),
    ...[-1, 1].map((side) =>
      lying(0.008, 0.28, 0, 0.006, side * 0.12, WOOD, 5),
    ),
    ...[0.07, -0.07].map((x) => box(0.012, 0.008, 0.25, x, 0.036, 0, WOOD)),
    cyl(0.004, 0.005, 0.22, 4, 0.03, 0.04, 0, INK),
    profile(
      [
        [0.035, 0.06],
        [0.17, 0.07],
        [0.04, 0.25],
      ],
      0.006,
      CORAL,
    ),
  ],
  // Light body with a window band and dark bogies; carriages and engine match.
  train: () => [
    box(0.05, 0.016, 0.05, 0.06, 0, 0, TYRE),
    box(0.05, 0.016, 0.05, -0.06, 0, 0, TYRE),
    box(0.19, 0.052, 0.07, 0, 0.014, 0, CREAM),
    box(0.17, 0.016, 0.072, 0, 0.04, 0, WINDOW),
    box(0.18, 0.012, 0.06, 0, 0.066, 0, GREY),
  ],
  // The engine has a raked nose and windscreen at +x, in coral livery.
  locomotive: () => [
    box(0.05, 0.016, 0.05, 0.06, 0, 0, TYRE),
    box(0.05, 0.016, 0.05, -0.06, 0, 0, TYRE),
    profile(
      [
        [-0.095, 0.014],
        [0.1, 0.014],
        [0.1, 0.034],
        [0.062, 0.066],
        [-0.095, 0.066],
      ],
      0.07,
      CORAL,
    ),
    raked(0.004, 0.03, 0.06, 0.083, 0.05, 0.7, WINDOW),
    box(0.13, 0.014, 0.072, -0.03, 0.042, 0, WINDOW),
    box(0.15, 0.012, 0.06, -0.02, 0.066, 0, GREY),
    box(0.006, 0.008, 0.05, 0.1, 0.02, 0, SUN),
  ],
  // A box truck: painted cab, pale cargo box, three dark axles.
  truck: () => [
    axle(0.068, 0.084, 0.017),
    axle(-0.035, 0.084, 0.017),
    axle(-0.075, 0.084, 0.017),
    box(0.2, 0.014, 0.068, -0.002, 0.016, 0, TYRE),
    box(0.056, 0.058, 0.074, 0.07, 0.026, 0, PAINT),
    raked(0.004, 0.024, 0.066, 0.098, 0.064, -0.35, WINDOW),
    box(0.044, 0.018, 0.076, 0.068, 0.058, 0, WINDOW),
    box(0.136, 0.078, 0.078, -0.034, 0.03, 0, "#f1ebdd"),
  ],
  // A twin-engine airliner: swept wings, tailplane and a coral fin.
  plane: () => [
    fuselage(),
    box(0.44, 0.012, 0.091, -0.02, 0.008, 0, TEAL),
    raked(0.004, 0.016, 0.05, 0.3, 0.02, -0.9, WINDOW),
    plate(
      [
        [0.09, 0],
        [-0.04, 0.37],
        [-0.1, 0.37],
        [-0.07, 0],
        [-0.1, -0.37],
        [-0.04, -0.37],
      ],
      0.012,
      -0.026,
      CREAM,
    ),
    plate(
      [
        [-0.2, 0],
        [-0.28, 0.14],
        [-0.32, 0.14],
        [-0.3, 0],
        [-0.32, -0.14],
        [-0.28, -0.14],
      ],
      0.008,
      0.005,
      CREAM,
    ),
    profile(
      [
        [-0.2, 0.03],
        [-0.3, 0.16],
        [-0.34, 0.16],
        [-0.32, 0.03],
      ],
      0.01,
      CORAL,
    ),
    lying(0.02, 0.08, 0.03, -0.042, 0.13, GREY, 7),
    lying(0.02, 0.08, 0.03, -0.042, -0.13, GREY, 7),
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
  wake,
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
