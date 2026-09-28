// Pure math utilities — no game state imports

export const v3 = (x, y, z = 0) => ({ x, y, z });
export const v2 = (x, y)         => ({ x, y });

export const scale3 = (v, s) => ({ x: v.x * s, y: v.y * s, z: v.z * s });
export const mag3   = v => Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2);
export const norm3  = v => { const m = mag3(v) || 1e-9; return scale3(v, 1 / m); };
export const dist2  = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
export const clamp  = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const movAvg = (cur, n, val) => cur + (val - cur) / (n + 1);

export const cross3 = (a, b) => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

// ---------------------------------------------------------------------------
// PRNG — Mulberry32 (seedable, period ~2^32, uniform, zero deps)
// ---------------------------------------------------------------------------
// Toda aleatoriedade do jogo passa por aqui. Setar o seed antes de um ponto
// garante reprodutibilidade: mesmo jogadores, mesmo seed → mesma partida.
//
// API pública:
//   seedRand(n)   — define o seed (aceita qualquer inteiro; default = Date.now())
//   getRandSeed() — retorna o seed atual (útil para gravar replay)
//   rand(a, b)    — float uniforme em [a, b)

let _seed = Date.now() >>> 0;

function mulberry32() {
  let t = (_seed += 0x6D2B79F5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function seedRand(seed) {
  _seed = (seed >>> 0) || (Date.now() >>> 0);
}

export function getRandSeed() {
  return _seed;
}

export const rand = (a, b) => a + mulberry32() * (b - a);

// ---------------------------------------------------------------------------
// Weighted pick helpers
// ---------------------------------------------------------------------------

/** Pick from a weight map { TYPE: number } — usado em sistemas legados */
export function pickWeightedShot(weights) {
  const entries = Object.entries(weights);
  const total   = entries.reduce((s, [, v]) => s + v, 0);
  let r = mulberry32() * total;
  for (const [type, w] of entries) { r -= w; if (r <= 0) return type; }
  return entries[0][0];
}

/**
 * Pick from a candidates array: [{ value, weight }, ...]
 * Substitui o `weightedPick` local que vivia no ServeEngine.
 * Peso mínimo garantido de 0.01 para evitar candidatos com peso zero travarem.
 */
export function weightedPickArr(candidates) {
  const total = candidates.reduce((sum, c) => sum + Math.max(0.01, c.weight), 0);
  let r = mulberry32() * total;
  for (const c of candidates) {
    r -= Math.max(0.01, c.weight);
    if (r <= 0) return c.value;
  }
  return candidates[candidates.length - 1]?.value;
}

