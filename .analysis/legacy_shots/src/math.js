// Pure math utilities — no game state imports

export const v3 = (x, y, z = 0) => ({ x, y, z });
export const v2 = (x, y)         => ({ x, y });

export const scale3 = (v, s) => ({ x: v.x * s, y: v.y * s, z: v.z * s });
export const mag3   = v => Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2);
export const norm3  = v => { const m = mag3(v) || 1e-9; return scale3(v, 1 / m); };
export const dist2  = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
export const clamp  = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const rand   = (a, b) => a + Math.random() * (b - a);
export const movAvg = (cur, n, val) => cur + (val - cur) / (n + 1);

export const cross3 = (a, b) => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

/** Pick a shot type from a weight map {TYPE: number} */
export function pickWeightedShot(weights) {
  const entries = Object.entries(weights);
  const total   = entries.reduce((s, [, v]) => s + v, 0);
  let r = Math.random() * total;
  for (const [type, w] of entries) { r -= w; if (r <= 0) return type; }
  return entries[0][0];
}
