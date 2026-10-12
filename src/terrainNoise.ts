// Smooth, deterministic noise for illustrative terrain. It shapes ridges,
// valleys and colour patches; it is not measured elevation or land cover.

const hash = (x: number, y: number) => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const corner = (ix: number, iy: number, dx: number, dy: number) => {
  const angle = hash(ix, iy) * Math.PI * 2;
  return Math.cos(angle) * dx + Math.sin(angle) * dy;
};

/** Gradient noise in roughly [-1, 1], continuous with continuous slopes. */
export function gradientNoise(x: number, y: number) {
  const x0 = Math.floor(x),
    y0 = Math.floor(y);
  const fx = x - x0,
    fy = y - y0;
  const u = fade(fx),
    v = fade(fy);
  const bottom =
    corner(x0, y0, fx, fy) +
    (corner(x0 + 1, y0, fx - 1, fy) - corner(x0, y0, fx, fy)) * u;
  const top =
    corner(x0, y0 + 1, fx, fy - 1) +
    (corner(x0 + 1, y0 + 1, fx - 1, fy - 1) - corner(x0, y0 + 1, fx, fy - 1)) *
      u;
  return Math.max(-1, Math.min(1, (bottom + (top - bottom) * v) * 1.4));
}

/** Sharp crests and rounded hollows in [0, 1], like eroded mountain spurs. */
export function ridgedNoise(x: number, y: number) {
  return (1 - Math.abs(gradientNoise(x, y))) ** 2;
}
