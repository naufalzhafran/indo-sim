import type { Color } from "three";

/** Stable pseudo-random value in [0, 1) for a 2D position. */
export function hash2(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

const fade = (t: number) => t * t * (3 - 2 * t);
function valueNoise(x: number, y: number) {
  const ix = Math.floor(x),
    iy = Math.floor(y);
  const fx = fade(x - ix),
    fy = fade(y - iy);
  const a = hash2(ix, iy),
    b = hash2(ix + 1, iy),
    c = hash2(ix, iy + 1),
    d = hash2(ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/**
 * Smooth 0–1 field that groups trees into woods and leaves open farmland
 * between them. Illustrative only, not measured forest cover.
 */
export function forestDensity(x: number, y: number) {
  return (
    valueNoise(x * 0.3, y * 0.3) * 0.68 +
    valueNoise(x * 0.85 + 17.3, y * 0.85 - 9.1) * 0.32
  );
}

/**
 * Multiplies a foliage colour so each wood has its own shade and neighbouring
 * trees differ slightly. Takes world x/z so the same tree matches at every zoom.
 */
export function shadeFoliage(x: number, z: number, target: Color) {
  const wood = valueNoise(x * 0.22 + 41.7, z * 0.22 - 13.9) - 0.5;
  const tree = hash2(x * 3.7, z * 5.3) - 0.5;
  const light = 1.12 + tree * 0.24;
  // Woods drift between a sunny yellow-green and a cooler deep green.
  return target.setRGB(
    target.r * light * (1 + wood * 0.36),
    target.g * light * (1 + wood * 0.06),
    target.b * light * (1 - wood * 0.4),
  );
}
