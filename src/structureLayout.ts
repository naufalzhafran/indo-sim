import { buildRoadNetwork, onRoadOrCity } from "./roadNetwork";
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  SphereGeometry,
  Vector2,
  Vector3,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { WorldGeometry } from "./mapGeometry";
import { GAME_REGIONS, regionForProvince } from "./engine/gameRegions";
import {
  POLICY_IDS,
  type PolicyId,
  type RegionId,
  type RegionalSpendingLevel,
} from "./engine/economy/types";

/** One funded policy in one region, as the map needs it. */
export type PolicyStructureInput = {
  policy: PolicyId;
  region: RegionId;
  level: RegionalSpendingLevel;
  /** Rollout readiness, 0 to 1; low values show as an unfinished build. */
  delivery: number;
};
export type StructureKind = PolicyId | "crane" | "ship";
export type StructureItem = {
  position: Vector3;
  rotation: number;
  scale: number;
  /** Vertical scale, which grows as the build completes. */
  height: number;
  region: RegionId;
};
export type SeaLane = {
  key: string;
  from: Vector3;
  to: Vector3;
  regions: [RegionId, RegionId];
  built: number;
};
export type StructureLayout = {
  items: Map<StructureKind, StructureItem[]>;
  lanes: SeaLane[];
  /** Ground the structures stand on, where trees and houses make room. */
  cleared: Vector3[];
};

const COASTAL: PolicyId[] = ["tol-laut", "tourism-access"];
const LEVEL_RANK = { low: 0, medium: 1, high: 2 };
const LAND_SLOTS = 16;
/** Which islands the Tol Laut ships link, as pairs of regions. */
const SEA_LINKS: [RegionId, RegionId][] = [
  ["sumatra", "java"],
  ["sumatra", "kalimantan"],
  ["java", "kalimantan"],
  ["java", "bali"],
  ["bali", "ntb"],
  ["ntb", "ntt"],
  ["ntt", "sulawesi"],
  ["ntt", "maluku"],
  ["kalimantan", "sulawesi"],
  ["sulawesi", "maluku"],
  ["maluku", "papua"],
];

// ---------------------------------------------------------------- geometry

const tint = (geometry: BufferGeometry, color: string) => {
  const base = geometry.index ? geometry.toNonIndexed() : geometry;
  const c = new Color(color),
    count = base.attributes.position.count,
    colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) colors.set([c.r, c.g, c.b], i * 3);
  base.setAttribute("color", new Float32BufferAttribute(colors, 3));
  base.deleteAttribute("uv");
  return base;
};
/** `y` is the bottom of every shape, so parts stack naturally. */
const box = (
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  color: string,
  ry = 0,
) =>
  tint(new BoxGeometry(w, h, d).rotateY(ry).translate(x, y + h / 2, z), color);
const cyl = (
  rt: number,
  rb: number,
  h: number,
  seg: number,
  x: number,
  y: number,
  z: number,
  color: string,
) =>
  tint(new CylinderGeometry(rt, rb, h, seg).translate(x, y + h / 2, z), color);
/** A square pyramid roof sized to the box beneath it. */
const roof = (
  w: number,
  d: number,
  h: number,
  x: number,
  y: number,
  z: number,
  color: string,
) =>
  tint(
    new ConeGeometry(1, h, 4)
      .rotateY(Math.PI / 4)
      .scale(w / Math.SQRT2, 1, d / Math.SQRT2)
      .translate(x, y + h / 2, z),
    color,
  );
const cone = (
  r: number,
  h: number,
  seg: number,
  x: number,
  y: number,
  z: number,
  color: string,
) => tint(new ConeGeometry(r, h, seg).translate(x, y + h / 2, z), color);
const ball = (
  r: number,
  x: number,
  y: number,
  z: number,
  color: string,
  sy = 1,
) =>
  tint(new SphereGeometry(r, 8, 5).scale(1, sy, 1).translate(x, y, z), color);
const gem = (
  r: number,
  x: number,
  y: number,
  z: number,
  color: string,
  sy = 1,
) =>
  tint(new IcosahedronGeometry(r, 0).scale(1, sy, 1).translate(x, y, z), color);
/** A cylinder lying along the x axis, such as a barrel roof. */
const barrel = (
  r: number,
  length: number,
  x: number,
  y: number,
  z: number,
  color: string,
  sy = 1,
) =>
  tint(
    new CylinderGeometry(r, r, length, 8)
      .rotateZ(Math.PI / 2)
      .scale(1, sy, 1)
      .translate(x, y, z),
    color,
  );
const tilted = (geometry: BufferGeometry, rz: number, x: number, y: number) =>
  geometry.rotateZ(rz).translate(x, y, 0);

const CREAM = "#fff5d7",
  WHITE = "#fffdf4",
  CORAL = "#e9694f",
  RED = "#d9433a",
  TEAL = "#2f8a84",
  DEEP = "#244d49",
  GREEN = "#4b9870",
  LEAF = "#438b54",
  SUN = "#f4bd4e",
  SKY = "#79c6e0",
  WOOD = "#a47c4a",
  STONE = "#b8bdaf",
  SAND = "#f0d9a0";

const cross = (x: number, y: number, z: number, color: string) => [
  box(0.34, 0.1, 0.03, x, y, z, color),
  box(0.1, 0.34, 0.03, x, y - 0.12, z, color),
];
const plam = (x: number, z: number, lean: number) => [
  tint(
    tilted(
      new CylinderGeometry(0.05, 0.08, 0.95, 5).translate(0, 0.475, 0),
      lean,
      x,
      0,
    ).translate(0, 0, z),
    WOOD,
  ),
  ...[0, 1, 2, 3, 4].map((i) =>
    tint(
      new ConeGeometry(0.1, 0.55, 3)
        .rotateZ(Math.PI / 2.4)
        .translate(0.27, 0, 0)
        .rotateY((i / 5) * Math.PI * 2)
        .translate(x - lean * 0.45, 0.98, z),
      LEAF,
    ),
  ),
];
const sapling = (x: number, z: number) => [
  cyl(0.04, 0.05, 0.3, 5, x, 0.2, z, WOOD),
  gem(0.2, x, 0.62, z, "#6bb65a", 1.2),
];

/** The small buildings, each built from flat-shaded boxes, cones and cylinders. */
const BLUEPRINTS: Record<StructureKind, () => BufferGeometry[]> = {
  mbg: () => [
    box(1.4, 0.55, 0.9, 0, 0.1, 0, CREAM),
    box(1.5, 0.1, 1.0, 0, 0.65, 0, CORAL),
    cyl(0.1, 0.12, 0.55, 6, -0.45, 0.7, -0.15, DEEP),
    box(1.0, 0.07, 0.35, 0.05, 0.42, 0.62, SUN),
    box(0.22, 0.2, 0.2, 0.7, 0.1, 0.62, GREEN),
    box(0.22, 0.14, 0.2, -0.7, 0.1, 0.62, WHITE),
    box(1.6, 0.1, 1.1, 0, 0, 0, "#cfe9c8"),
  ],
  kopdes: () => [
    box(1.7, 0.1, 1.2, 0, 0, 0, "#cfe9c8"),
    box(1.45, 0.62, 0.9, 0, 0.1, -0.05, CREAM),
    roof(1.7, 1.1, 0.5, 0, 0.72, -0.05, RED),
    box(1.45, 0.1, 0.18, 0, 0.5, 0.55, RED),
    box(0.36, 0.1, 0.18, -0.54, 0.5, 0.55, WHITE),
    box(0.36, 0.1, 0.18, 0, 0.5, 0.55, WHITE),
    box(0.36, 0.1, 0.18, 0.54, 0.5, 0.55, WHITE),
    box(0.5, 0.3, 0.05, 0, 0.18, 0.43, WOOD),
    cyl(0.025, 0.025, 1.25, 4, 0.82, 0.1, 0.5, STONE),
    box(0.34, 0.1, 0.03, 0.99, 1.25, 0.5, RED),
    box(0.34, 0.1, 0.03, 0.99, 1.15, 0.5, WHITE),
  ],
  ckg: () => [
    box(1.5, 0.1, 1.1, 0, 0, 0, "#cfe9c8"),
    box(1.2, 0.6, 0.8, 0, 0.1, 0, WHITE),
    box(1.3, 0.1, 0.9, 0, 0.7, 0, SKY),
    ...cross(0, 0.55, 0.42, RED),
    box(0.25, 0.32, 0.04, -0.4, 0.1, 0.41, TEAL),
  ],
  bpn: () => [
    box(1.3, 0.1, 1.1, 0, 0, 0, STONE),
    box(0.95, 1.0, 0.8, 0, 0.1, 0, CREAM),
    box(1.1, 0.1, 0.95, 0, 1.1, 0, TEAL),
    ...[-0.38, -0.13, 0.13, 0.38].map((x) =>
      cyl(0.04, 0.04, 0.9, 5, x, 0.1, 0.5, WHITE),
    ),
    cyl(0.02, 0.02, 0.8, 4, 0, 1.2, 0, STONE),
    box(0.4, 0.14, 0.03, 0.2, 1.8, 0, RED),
    box(0.4, 0.14, 0.03, 0.2, 1.66, 0, WHITE),
  ],
  pkh: () => [
    box(1.5, 0.08, 1.2, 0, 0, 0, "#cfe9c8"),
    box(0.55, 0.4, 0.5, -0.38, 0.08, -0.15, CREAM),
    roof(0.7, 0.65, 0.34, -0.38, 0.48, -0.15, CORAL),
    box(0.5, 0.35, 0.45, 0.4, 0.08, 0.1, "#fde3a8"),
    roof(0.65, 0.6, 0.3, 0.4, 0.43, 0.1, TEAL),
    cyl(0.2, 0.2, 0.05, 10, 0, 0.08, 0.5, SUN),
    cyl(0.2, 0.2, 0.05, 10, 0, 0.13, 0.5, "#f7d27d"),
  ],
  bos: () => [
    box(1.7, 0.1, 1.0, 0, 0, 0, "#cfe9c8"),
    box(1.5, 0.5, 0.6, 0, 0.1, -0.1, CREAM),
    roof(1.65, 0.75, 0.4, 0, 0.6, -0.1, CORAL),
    box(0.3, 0.9, 0.3, 0.5, 0.1, 0.3, WHITE),
    roof(0.4, 0.4, 0.28, 0.5, 1.0, 0.3, RED),
    box(0.2, 0.26, 0.04, -0.35, 0.1, 0.21, TEAL),
    box(0.2, 0.26, 0.04, 0, 0.1, 0.21, TEAL),
    cyl(0.025, 0.025, 1.1, 4, -0.7, 0.1, 0.4, STONE),
    box(0.3, 0.1, 0.03, -0.55, 1.1, 0.4, RED),
  ],
  kur: () => [
    box(1.3, 0.1, 1.1, 0, 0, 0, STONE),
    box(0.95, 0.6, 0.75, 0, 0.1, 0, CREAM),
    ...[-0.35, -0.12, 0.12, 0.35].map((x) =>
      cyl(0.05, 0.05, 0.55, 5, x, 0.1, 0.45, WHITE),
    ),
    box(1.1, 0.1, 0.9, 0, 0.7, 0.05, TEAL),
    ball(0.28, 0, 0.95, 0, SUN, 0.8),
    box(1.1, 0.06, 0.2, 0, 0.1, 0.6, STONE),
  ],
  jkn: () => [
    box(1.6, 0.1, 1.1, 0, 0, 0, "#cfe9c8"),
    box(1.0, 0.95, 0.8, -0.1, 0.1, 0, WHITE),
    box(0.55, 0.6, 0.7, 0.62, 0.1, 0, SKY),
    box(1.1, 0.08, 0.9, -0.1, 1.05, 0, TEAL),
    ...cross(-0.1, 0.78, 0.42, GREEN),
    box(0.2, 0.3, 0.04, 0.6, 0.1, 0.36, WHITE),
  ],
  "jalan-desa": () => [
    box(2.3, 0.06, 0.4, 0, 0, 0.8, "#cfd2c4"),
    box(1.4, 0.08, 1.0, 0, 0, -0.1, STONE),
    ...[
      [-0.55, -0.45],
      [0.55, -0.45],
      [-0.55, 0.25],
      [0.55, 0.25],
    ].map(([x, z]) => cyl(0.05, 0.05, 0.55, 5, x, 0.08, z, WOOD)),
    roof(1.65, 1.2, 0.6, 0, 0.63, -0.1, CORAL),
    box(0.4, 0.28, 0.4, 0, 0.08, -0.1, CREAM),
  ],
  prakerja: () => [
    box(1.6, 0.1, 1.1, 0, 0, 0, "#cfe9c8"),
    box(1.3, 0.5, 0.8, 0, 0.1, 0, CREAM),
    // Sawtooth workshop roof: each tooth is a leaning slab.
    ...[-0.4, 0.05, 0.5].map((x) =>
      tint(
        new BoxGeometry(0.4, 0.05, 0.85).rotateZ(0.5).translate(x, 0.72, 0),
        TEAL,
      ),
    ),
    cyl(0.22, 0.22, 0.08, 8, 0.65, 0.1, 0.55, SUN),
    cyl(0.08, 0.08, 0.1, 6, 0.65, 0.1, 0.55, DEEP),
  ],
  pupuk: () => [
    box(1.7, 0.08, 1.1, 0, 0, 0, STONE),
    box(1.4, 0.4, 0.85, 0, 0.08, 0, "#e5ddc4"),
    barrel(0.5, 1.4, 0, 0.48, 0, "#8fb996", 0.55),
    ball(0.17, 0.6, 0.2, 0.6, WHITE, 0.8),
    ball(0.17, 0.85, 0.2, 0.55, WHITE, 0.8),
    ball(0.17, 0.72, 0.4, 0.58, WHITE, 0.8),
  ],
  klinik: () => [
    box(1.3, 0.08, 1.0, 0, 0, 0, "#cfe9c8"),
    box(0.85, 0.5, 0.65, 0, 0.08, 0, WHITE),
    roof(1.0, 0.8, 0.4, 0, 0.58, 0, CORAL),
    ...cross(0, 0.5, 0.34, RED),
    box(0.2, 0.28, 0.04, 0.3, 0.08, 0.34, TEAL),
  ],
  sarjana: () => [
    box(1.9, 0.1, 1.1, 0, 0, 0, "#cfe9c8"),
    box(0.6, 0.85, 0.7, 0, 0.1, 0, CREAM),
    box(0.65, 0.5, 0.6, -0.62, 0.1, 0, WHITE),
    box(0.65, 0.5, 0.6, 0.62, 0.1, 0, WHITE),
    cone(0.42, 0.5, 8, 0, 0.95, 0, TEAL),
    box(0.7, 0.07, 0.4, -0.62, 0.6, 0, CORAL),
    box(0.7, 0.07, 0.4, 0.62, 0.6, 0, CORAL),
    box(0.22, 0.3, 0.04, 0, 0.1, 0.36, TEAL),
  ],
  pltu: () => [
    box(1.8, 0.08, 1.2, 0, 0, 0, STONE),
    box(0.9, 0.55, 0.7, -0.3, 0.08, 0.1, CREAM),
    box(0.95, 0.07, 0.75, -0.3, 0.63, 0.1, TEAL),
    cyl(0.12, 0.16, 1.05, 6, -0.6, 0.58, -0.3, RED),
    cyl(0.12, 0.15, 0.4, 6, -0.6, 1.0, -0.3, WHITE),
    cyl(0.12, 0.16, 0.85, 6, -0.25, 0.58, -0.3, WHITE),
    cone(0.32, 0.3, 6, 0.55, 0.08, 0.2, DEEP),
    box(0.4, 0.06, 0.18, 0.55, 0.3, -0.25, WOOD),
  ],
  plts: () => [
    box(1.9, 0.06, 1.3, 0, 0, 0, "#cfe9c8"),
    ...[-0.4, 0.15, 0.7].flatMap((z) =>
      [-0.5, 0.25].flatMap((x) => [
        cyl(0.025, 0.025, 0.22, 4, x, 0.06, z, STONE),
        tint(
          new BoxGeometry(0.65, 0.04, 0.38)
            .rotateX(-0.45)
            .translate(x, 0.32, z),
          "#3a73b8",
        ),
      ]),
    ),
    box(0.22, 0.32, 0.22, 0.82, 0.06, -0.45, CREAM),
  ],
  plta: () => [
    box(2.0, 0.06, 1.4, 0, 0, 0, STONE),
    box(2.0, 0.04, 0.8, 0, 0.42, -0.3, SKY),
    box(2.0, 0.55, 0.22, 0, 0.0, 0.18, "#d7dccf"),
    box(2.0, 0.06, 0.26, 0, 0.55, 0.18, DEEP),
    ...[-0.5, 0, 0.5].map((x) => box(0.14, 0.3, 0.04, x, 0.12, 0.3, SKY)),
    box(0.55, 0.32, 0.38, 0.55, 0.06, 0.55, CREAM),
    box(0.6, 0.06, 0.42, 0.55, 0.38, 0.55, CORAL),
  ],
  pltp: () => [
    box(1.8, 0.08, 1.2, 0, 0, 0, "#cfe9c8"),
    cyl(0.26, 0.38, 0.75, 9, -0.45, 0.08, -0.15, WHITE),
    cyl(0.22, 0.32, 0.6, 9, 0.2, 0.08, -0.25, WHITE),
    ball(0.22, -0.45, 1.05, -0.15, "#f4f6f1", 0.7),
    box(0.5, 0.3, 0.4, 0.55, 0.08, 0.3, CREAM),
    box(0.55, 0.06, 0.45, 0.55, 0.38, 0.3, TEAL),
    barrel(0.05, 1.1, -0.15, 0.2, 0.42, SUN),
  ],
  "embung-desa": () => [
    cyl(0.95, 1.02, 0.18, 10, 0, 0, 0, "#b9a06a"),
    cyl(0.78, 0.78, 0.05, 10, 0, 0.14, 0, SKY),
    box(0.3, 0.12, 0.5, 0.95, 0.0, 0.0, STONE),
    ...sapling(-0.85, 0.65),
    ...sapling(0.7, -0.75),
  ],
  "pasar-desa": () => [
    box(2.0, 0.06, 1.2, 0, 0, 0, SAND),
    ...[
      [-0.6, CORAL],
      [0.0, SUN],
      [0.6, TEAL],
    ].flatMap(([x, color]) => [
      box(0.5, 0.28, 0.45, x as number, 0.06, 0.05, CREAM),
      roof(0.62, 0.6, 0.28, x as number, 0.34, 0.05, color as string),
      box(0.42, 0.1, 0.12, x as number, 0.06, 0.38, WOOD),
    ]),
  ],
  brt: () => [
    box(2.4, 0.04, 0.7, 0, 0, 0.1, "#cfd2c4"),
    box(2.4, 0.02, 0.06, 0, 0.04, 0.1, SUN),
    box(1.1, 0.34, 0.36, -0.35, 0.06, 0.25, CORAL),
    box(1.0, 0.12, 0.37, -0.35, 0.22, 0.25, SKY),
    box(1.12, 0.04, 0.38, -0.35, 0.4, 0.25, WHITE),
    box(0.7, 0.05, 0.3, 0.65, 0.5, -0.35, TEAL),
    ...[0.38, 0.92].map((x) => cyl(0.03, 0.03, 0.46, 4, x, 0.04, -0.35, STONE)),
    box(0.6, 0.06, 0.28, 0.65, 0.04, -0.35, STONE),
  ],
  krl: () => [
    box(2.5, 0.05, 0.2, 0, 0.02, 0.0, DEEP),
    ...Array.from({ length: 9 }, (_, i) =>
      box(0.07, 0.03, 0.4, -1.1 + i * 0.275, 0, 0.0, WOOD),
    ),
    box(0.85, 0.32, 0.32, -0.45, 0.07, 0.0, WHITE),
    box(0.85, 0.08, 0.33, -0.45, 0.2, 0.0, RED),
    box(0.85, 0.32, 0.32, 0.47, 0.07, 0.0, WHITE),
    box(0.85, 0.08, 0.33, 0.47, 0.2, 0.0, RED),
    box(0.9, 0.06, 0.38, 0.2, 0.0, -0.55, STONE),
    box(0.9, 0.05, 0.38, 0.2, 0.5, -0.55, CORAL),
    ...[-0.15, 0.55].map((x) =>
      cyl(0.03, 0.03, 0.45, 4, x, 0.05, -0.55, STONE),
    ),
  ],
  "kereta-antarkota": () => [
    box(2.7, 0.05, 0.2, 0, 0.02, 0.0, DEEP),
    box(2.7, 0.05, 0.2, 0, 0.02, 0.32, DEEP),
    ...Array.from({ length: 10 }, (_, i) =>
      box(0.07, 0.03, 0.62, -1.2 + i * 0.265, 0, 0.16, WOOD),
    ),
    box(0.62, 0.38, 0.3, -0.9, 0.07, 0.0, TEAL),
    box(0.2, 0.12, 0.31, -1.12, 0.3, 0.0, SUN),
    ...[-0.22, 0.45, 1.1].map((x) => box(0.6, 0.32, 0.3, x, 0.07, 0.0, CREAM)),
    ...[-0.22, 0.45, 1.1].map((x) => box(0.6, 0.06, 0.31, x, 0.39, 0.0, TEAL)),
    box(0.5, 0.25, 0.28, 0.6, 0.07, 0.32, WOOD),
    box(0.5, 0.25, 0.28, 1.12, 0.07, 0.32, SUN),
  ],
  teachers: () => [
    box(1.3, 0.08, 1.0, 0, 0, 0, "#cfe9c8"),
    box(0.95, 0.45, 0.65, 0, 0.08, 0, CREAM),
    roof(1.1, 0.8, 0.36, 0, 0.53, 0, TEAL),
    box(0.45, 0.28, 0.04, -0.1, 0.18, 0.34, DEEP),
    box(0.32, 0.03, 0.04, -0.1, 0.34, 0.37, WHITE),
    cyl(0.07, 0.07, 0.7, 6, 0.5, 0.08, 0.45, SUN),
    cone(0.07, 0.2, 6, 0.5, 0.78, 0.45, CORAL),
  ],
  water: () => [
    box(1.2, 0.08, 1.0, 0, 0, 0, STONE),
    ...[
      [-0.2, -0.2],
      [0.2, -0.2],
      [-0.2, 0.2],
      [0.2, 0.2],
    ].map(([x, z]) => cyl(0.04, 0.04, 0.9, 5, x, 0.08, z, DEEP)),
    cyl(0.4, 0.4, 0.5, 10, 0, 0.98, 0, SKY),
    cone(0.46, 0.28, 10, 0, 1.48, 0, TEAL),
    box(0.6, 0.06, 0.06, 0.55, 0.12, 0.3, SKY),
    cyl(0.1, 0.1, 0.2, 6, 0.85, 0.08, 0.3, TEAL),
  ],
  irrigation: () => [
    box(1.8, 0.07, 1.3, 0, 0, 0, "#8fc66e"),
    box(1.8, 0.06, 0.28, 0, 0.06, 0, "#6cc3dd"),
    ...[-0.45, 0.45].flatMap((z) =>
      [-0.6, 0, 0.6].map((x) => box(0.5, 0.05, 0.4, x, 0.07, z, "#a8d97a")),
    ),
    box(0.1, 0.35, 0.4, 0.55, 0.06, 0, STONE),
    box(0.16, 0.06, 0.5, 0.55, 0.4, 0, WOOD),
  ],
  broadband: () => [
    box(0.9, 0.08, 0.9, 0, 0, 0, STONE),
    box(0.4, 0.28, 0.4, 0.3, 0.08, 0.1, CREAM),
    cone(0.22, 1.9, 4, 0, 0.08, 0, WHITE),
    cyl(0.16, 0.2, 0.3, 4, 0, 0.7, 0, RED),
    cyl(0.1, 0.13, 0.3, 4, 0, 1.15, 0, RED),
    ball(0.14, 0.12, 1.45, 0.08, TEAL),
    ball(0.12, -0.1, 1.1, 0.08, SUN),
    ball(0.08, 0, 2.0, 0, RED),
  ],
  "cold-chain": () => [
    box(1.7, 0.08, 1.1, 0, 0, 0, STONE),
    box(1.3, 0.62, 0.85, -0.1, 0.08, 0, "#d3eef7"),
    box(1.4, 0.1, 0.95, -0.1, 0.7, 0, SKY),
    box(0.32, 0.03, 0.04, -0.1, 0.4, 0.43, WHITE),
    box(0.04, 0.32, 0.04, -0.1, 0.25, 0.43, WHITE),
    box(0.45, 0.22, 0.28, 0.65, 0.12, 0.35, WHITE),
    box(0.2, 0.17, 0.26, 0.9, 0.12, 0.35, CORAL),
  ],
  "palm-replanting": () => [
    box(1.7, 0.06, 1.2, 0, 0, 0, "#9bcf72"),
    ...plam(-0.5, -0.2, 0.18),
    ...plam(0.1, 0.25, -0.12),
    ...plam(0.6, -0.25, 0.1),
    ...sapling(-0.1, -0.35),
    ...sapling(0.95, 0.3),
  ],
  "mining-rehabilitation": () => [
    cyl(0.85, 1.0, 0.1, 9, 0, 0, 0, "#a98a63"),
    cyl(0.62, 0.72, 0.1, 9, 0, 0.1, 0, "#c0a274"),
    cyl(0.38, 0.45, 0.1, 9, 0, 0.2, 0, "#8fb86c"),
    ...sapling(-0.1, 0.0),
    ...sapling(0.28, -0.12),
    ...sapling(-0.4, 0.4).map((g) => g.translate(0, -0.1, 0)),
  ],
  "tourism-access": () => [
    // A small beach patch with a hut and parasol; the pier reaches the water.
    box(1.0, 0.16, 0.8, 0, 0, -0.1, SAND),
    box(0.5, 0.36, 0.45, -0.22, 0.16, -0.15, "#fde3a8"),
    roof(0.62, 0.58, 0.28, -0.22, 0.52, -0.15, CORAL),
    cyl(0.025, 0.025, 0.6, 4, 0.3, 0.16, 0.05, WOOD),
    cone(0.3, 0.14, 8, 0.3, 0.7, 0.05, RED),
    box(0.3, 0.07, 1.1, 0, 0.06, 0.8, WOOD),
    ...[0.55, 1.0, 1.35].flatMap((z) => [
      cyl(0.03, 0.03, 0.2, 4, -0.1, 0, z, WOOD),
      cyl(0.03, 0.03, 0.2, 4, 0.1, 0, z, WOOD),
    ]),
  ],
  "food-reserves": () => [
    box(1.7, 0.08, 1.1, 0, 0, 0, STONE),
    cyl(0.34, 0.34, 0.9, 10, -0.4, 0.08, -0.1, CREAM),
    cone(0.4, 0.3, 10, -0.4, 0.98, -0.1, CORAL),
    cyl(0.34, 0.34, 0.7, 10, 0.25, 0.08, -0.1, WHITE),
    cone(0.4, 0.3, 10, 0.25, 0.78, -0.1, TEAL),
    box(0.45, 0.28, 0.4, 0.72, 0.08, 0.35, WOOD),
  ],
  "mrt-lrt": () => [
    box(2.5, 0.05, 0.2, 0, 0.02, 0.2, DEEP),
    box(2.5, 0.05, 0.2, 0, 0.02, 0.5, DEEP),
    ...Array.from({ length: 9 }, (_, i) =>
      box(0.07, 0.03, 0.55, -1.1 + i * 0.275, 0, 0.35, WOOD),
    ),
    box(0.7, 0.3, 0.3, -0.7, 0.07, 0.35, CORAL),
    box(0.62, 0.3, 0.3, 0, 0.07, 0.35, WHITE),
    box(0.62, 0.3, 0.3, 0.65, 0.07, 0.35, CORAL),
    box(1.0, 0.07, 0.5, 0.2, 0.55, -0.35, TEAL),
    ...[-0.2, 0.6].map((x) => cyl(0.04, 0.04, 0.5, 4, x, 0.05, -0.35, STONE)),
    box(1.2, 0.05, 0.3, 0.2, 0.05, -0.35, STONE),
  ],
  "tol-laut": () => [
    box(1.8, 0.1, 1.3, 0, 0, 0, STONE),
    box(0.5, 0.06, 1.0, 0.5, 0.06, 1.0, WOOD),
    // Gantry crane over container stacks.
    ...[-0.3, 0.3].map((x) => box(0.07, 0.9, 0.07, x, 0.1, 0.1, CORAL)),
    box(0.8, 0.07, 0.07, 0, 0.95, 0.1, CORAL),
    box(0.07, 0.07, 1.0, 0.3, 0.95, 0.55, CORAL),
    box(0.4, 0.22, 0.25, -0.55, 0.1, -0.35, TEAL),
    box(0.4, 0.22, 0.25, -0.1, 0.1, -0.35, CORAL),
    box(0.4, 0.22, 0.25, -0.3, 0.32, -0.35, SUN),
    box(0.4, 0.22, 0.25, 0.4, 0.1, -0.35, SKY),
  ],
  crane: () => [
    box(0.12, 1.5, 0.12, 0.9, 0, 0.7, SUN),
    box(1.0, 0.1, 0.1, 0.55, 1.4, 0.7, SUN),
    box(0.04, 0.4, 0.04, 0.2, 1.0, 0.7, DEEP),
    box(0.2, 0.12, 0.2, 0.2, 0.9, 0.7, CORAL),
  ],
  ship: () => [
    box(0.6, 0.2, 1.7, 0, 0, 0, DEEP),
    cone(0.3, 0.45, 4, 0, 0.05, 1.05, DEEP).rotateX(Math.PI / 2),
    box(0.6, 0.06, 1.7, 0, 0.2, 0, CORAL),
    box(0.4, 0.34, 0.4, 0, 0.26, -0.55, WHITE),
    box(0.3, 0.1, 0.3, 0, 0.6, -0.55, TEAL),
    box(0.38, 0.2, 0.3, 0, 0.26, 0.35, SKY),
    box(0.38, 0.2, 0.3, 0, 0.26, 0.0, SUN),
    box(0.38, 0.2, 0.3, 0, 0.46, 0.17, CORAL),
  ],
};
const geometryCache = new Map<StructureKind, BufferGeometry>();
/** One vertex-coloured geometry per kind, so each kind is a single draw call. */
export function structureGeometry(kind: StructureKind) {
  let geometry = geometryCache.get(kind);
  if (!geometry) {
    const parts = BLUEPRINTS[kind]();
    geometry = mergeGeometries(parts, false)!;
    parts.forEach((part) => part.dispose());
    geometryCache.set(kind, geometry);
  }
  return geometry;
}

// ------------------------------------------------------------------- sites

export type Site = { position: Vector3; rotation: number };
export type RegionSites = { land: Site[]; coast: Site[] };

const insideRing = (x: number, y: number, ring: Vector2[]) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i],
      b = ring[j];
    if (
      a.y > y !== b.y > y &&
      x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
};
const edgeDistance = (x: number, y: number, rings: Vector2[][]) => {
  let best = Infinity;
  for (const ring of rings)
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[j],
        b = ring[i],
        dx = b.x - a.x,
        dy = b.y - a.y,
        length = dx * dx + dy * dy;
      const t = length
        ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / length))
        : 0;
      best = Math.min(best, Math.hypot(x - a.x - t * dx, y - a.y - t * dy));
    }
  return best;
};

/** Highest and lowest ground under a structure's footprint, for seating it. */
function footprintRange(
  world: WorldGeometry,
  x: number,
  z: number,
  reach: number,
) {
  let max = -Infinity,
    min = Infinity;
  for (const r of [0, 0.5, 1])
    for (let k = 0; k < (r ? 8 : 1); k++) {
      const a = (k / 8) * Math.PI * 2;
      const h = world.surfaceHeight(
        new Vector2(
          x + Math.cos(a) * reach * r,
          -(z + Math.sin(a) * reach * r),
        ),
      );
      max = Math.max(max, h);
      min = Math.min(min, h);
    }
  return { max, min };
}

const siteCache = new WeakMap<WorldGeometry, Map<RegionId, RegionSites>>();
export function seedStructureSites(
  world: WorldGeometry,
  sites: Map<RegionId, RegionSites>,
) {
  siteCache.set(world, sites);
}
/** Flat, inland ground spread across a region, centre first, then outwards. */
function landSites(world: WorldGeometry, region: RegionId): Site[] {
  const network = buildRoadNetwork(world);
  const provinces = world.provinces.filter(
    (p) => regionForProvince(p.id)?.id === region,
  );
  const candidates: { x: number; z: number; h: number; score: number }[] = [];
  for (const p of provinces) {
    const outer = p.rings[0];
    if (!outer) continue;
    for (let x = p.bounds.min.x; x < p.bounds.max.x; x += 0.5)
      for (let z = p.bounds.min.z; z < p.bounds.max.z; z += 0.5) {
        if (!insideRing(x, -z, outer)) continue;
        if (edgeDistance(x, -z, p.rings) < 0.4) continue;
        if (onRoadOrCity(network, x, z, 0.6, 1.5)) continue;
        const h = world.surfaceHeight(new Vector2(x, -z));
        if (h > 2.3) continue;
        const slope =
          Math.abs(world.surfaceHeight(new Vector2(x + 0.35, -z)) - h) +
          Math.abs(world.surfaceHeight(new Vector2(x, -z + 0.35)) - h);
        if (slope > 0.3) continue;
        const foot = footprintRange(world, x, z, 0.4);
        if (foot.max - foot.min > 0.3) continue;
        candidates.push({
          x,
          z,
          h: foot.max,
          score: slope + (foot.max - foot.min) + h * 0.08,
        });
      }
  }
  if (!candidates.length) return [];
  const centre = provinces
    .reduce((sum, p) => sum.add(p.anchor), new Vector3())
    .divideScalar(provinces.length);
  const chosen: typeof candidates = [];
  const gap = candidates.map(() => Infinity);
  let next = candidates.reduce(
    (best, c, i) =>
      Math.hypot(c.x - centre.x, c.z - centre.z) + c.score * 3 <
      Math.hypot(candidates[best].x - centre.x, candidates[best].z - centre.z) +
        candidates[best].score * 3
        ? i
        : best,
    0,
  );
  while (chosen.length < LAND_SLOTS) {
    const pick = candidates[next];
    chosen.push(pick);
    let far = -1,
      farGap = 1.0;
    candidates.forEach((c, i) => {
      gap[i] = Math.min(gap[i], Math.hypot(c.x - pick.x, c.z - pick.z));
      if (
        gap[i] > farGap ||
        (gap[i] === farGap && far >= 0 && c.score < candidates[far].score)
      ) {
        farGap = gap[i];
        far = i;
      }
    });
    if (far < 0) break;
    next = far;
  }
  return chosen.map((c, i) => ({
    position: new Vector3(c.x, c.h, c.z),
    // A stable turn per site keeps neighbours from lining up like a grid.
    rotation: ((Math.sin(c.x * 12.9 + c.z * 78.2 + i) + 1) / 2) * Math.PI * 2,
  }));
}
/** Shoreline ground, turned so the front of a structure faces open water. */
function coastSites(world: WorldGeometry): Map<RegionId, Site[]> {
  const network = buildRoadNetwork(world);
  const result = new Map<RegionId, Site[]>();
  for (const ring of world.coastlines.map((c) => c.shape)) {
    const n = ring.length;
    for (let i = 0; i < n; i += 2) {
      const v = ring[i],
        a = ring[(i + n - 1) % n],
        b = ring[(i + 1) % n];
      const tx = b.x - a.x,
        ty = b.y - a.y,
        length = Math.hypot(tx, ty) || 1;
      const nx = -ty / length,
        ny = tx / length;
      for (const side of [1, -1]) {
        const px = v.x + nx * 0.15 * side,
          py = v.y + ny * 0.15 * side;
        const owner = world.provinces.find(
          (p) =>
            px >= p.bounds.min.x &&
            px <= p.bounds.max.x &&
            -py >= p.bounds.min.z &&
            -py <= p.bounds.max.z &&
            insideRing(px, py, p.rings[0] ?? []),
        );
        if (!owner) continue;
        const region = regionForProvince(owner.id)?.id as RegionId | undefined;
        if (!region) break;
        // The inland side holds the structure; the other side is the sea.
        const inland = new Vector2(
          v.x + nx * 0.3 * side,
          v.y + ny * 0.3 * side,
        );
        const h = Math.max(
          0.04,
          footprintRange(world, inland.x, -inland.y, 0.25).max,
        );
        if (h > 1) break;
        if (onRoadOrCity(network, inland.x, -inland.y, 0.4, 1.0)) break;
        const list = result.get(region) ?? [];
        list.push({
          position: new Vector3(inland.x, h, -inland.y),
          rotation: Math.atan2(-nx * side, ny * side),
        });
        result.set(region, list);
        break;
      }
    }
  }
  return result;
}
export function getStructureSites(
  world: WorldGeometry,
): Map<RegionId, RegionSites> {
  let sites = siteCache.get(world);
  if (!sites) {
    const coast = coastSites(world);
    sites = new Map(
      GAME_REGIONS.map((r) => [
        r.id as RegionId,
        {
          land: landSites(world, r.id as RegionId),
          coast: coast.get(r.id as RegionId) ?? [],
        },
      ]),
    );
    siteCache.set(world, sites);
  }
  return sites;
}

// ------------------------------------------------------------------ layout

const policyOrder = new Map(POLICY_IDS.map((id, i) => [id, i]));
const regionCentre = (world: WorldGeometry, region: RegionId) => {
  const members = world.provinces.filter(
    (p) => regionForProvince(p.id)?.id === region,
  );
  return members
    .reduce((sum, p) => sum.add(p.anchor), new Vector3())
    .divideScalar(Math.max(1, members.length));
};
const nearest = (sites: Site[], target: Vector3) =>
  sites.reduce<Site | null>(
    (best, s) =>
      !best || s.position.distanceTo(target) < best.position.distanceTo(target)
        ? s
        : best,
    null,
  );

export function layoutStructures(
  world: WorldGeometry,
  inputs: PolicyStructureInput[],
): StructureLayout {
  const sites = getStructureSites(world);
  const items = new Map<StructureKind, StructureItem[]>();
  const cleared: Vector3[] = [];
  const lanes: SeaLane[] = [];
  const add = (
    kind: StructureKind,
    site: Site,
    region: RegionId,
    build: number,
    scale = 0.35,
  ) => {
    // The shore pier must sit at the water, not on the hill behind the beach.
    if (kind === "tourism-access") {
      site = { ...site, position: site.position.clone().setY(0.02) };
      scale = 0.28;
    }
    const height = 0.4 + 0.6 * Math.min(1, build);
    const list = items.get(kind) ?? [];
    list.push({
      position: site.position,
      rotation: site.rotation,
      scale,
      height: kind === "crane" || kind === "ship" ? 1 : height,
      region,
    });
    items.set(kind, list);
    if (kind !== "ship") cleared.push(site.position);
    if (build < 0.9 && kind !== "crane" && kind !== "ship")
      add("crane", site, region, 1, scale);
  };
  for (const region of GAME_REGIONS.map((r) => r.id as RegionId)) {
    const here = inputs
      .filter((i) => i.region === region)
      .sort(
        (a, b) =>
          LEVEL_RANK[b.level] - LEVEL_RANK[a.level] ||
          b.delivery - a.delivery ||
          policyOrder.get(a.policy)! - policyOrder.get(b.policy)!,
      );
    const regional = sites.get(region)!;
    let slot = 0;
    for (const input of here) {
      if (COASTAL.includes(input.policy)) continue;
      const site = regional.land[slot];
      if (!site) break;
      slot++;
      add(input.policy, site, region, input.delivery);
    }
    // Tourism access: a pier and beach hut on shore far from the main ports.
    const tourism = here.find((i) => i.policy === "tourism-access");
    if (tourism && regional.coast.length) {
      const centre = regionCentre(world, region);
      const far = regional.coast.reduce((best, s) =>
        s.position.distanceTo(centre) > best.position.distanceTo(centre)
          ? s
          : best,
      );
      add("tourism-access", far, region, tourism.delivery);
    }
  }
  // Tol Laut: a port at each end of every sea link, with ships between them.
  const sea = new Map(
    inputs.filter((i) => i.policy === "tol-laut").map((i) => [i.region, i]),
  );
  const ports: Site[] = [];
  const portFor = (region: RegionId, toward: RegionId, build: number) => {
    const own = sites.get(region)!.coast;
    const site = nearest(own, regionCentre(world, toward));
    if (!site) return null;
    if (!ports.some((p) => p.position.distanceTo(site.position) < 0.8)) {
      ports.push(site);
      add("tol-laut", site, region, build, 0.2);
    }
    return site;
  };
  for (const [a, b] of SEA_LINKS) {
    const from = sea.get(a),
      to = sea.get(b);
    if (!from || !to) continue;
    const start = portFor(a, b, from.delivery),
      end = portFor(b, a, to.delivery);
    if (!start || !end) continue;
    // Berths lie off the quay, in open water in front of each port.
    const berth = (s: Site) =>
      new Vector3(
        s.position.x + Math.sin(s.rotation) * 0.9,
        0.05,
        s.position.z + Math.cos(s.rotation) * 0.9,
      );
    lanes.push({
      key: `${a}-${b}`,
      from: berth(start),
      to: berth(end),
      regions: [a, b],
      built: Math.min(from.delivery, to.delivery),
    });
  }
  for (const lane of lanes) {
    const heading = Math.atan2(
      lane.to.x - lane.from.x,
      lane.to.z - lane.from.z,
    );
    // A single ship per link, with a second once the route is mostly built.
    [0.5, 0.25].slice(0, lane.built > 0.5 ? 2 : 1).forEach((t, i) => {
      add(
        "ship",
        {
          position: lane.from.clone().lerp(lane.to, t),
          rotation: i ? heading + Math.PI : heading,
        },
        lane.regions[0],
        1,
        0.5,
      );
    });
  }
  return { items, lanes, cleared };
}
