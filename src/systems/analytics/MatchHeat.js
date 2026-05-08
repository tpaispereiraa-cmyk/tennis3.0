/**
 * MatchHeat.js
 * ─────────────────────────────────────────────────────────────────
 * Game Heat Temperature — Nota de qualidade ao vivo, 0 a 100.
 *
 * 100 é uma raridade quase intocável, mas possível.
 *
 * A nota sobe com:
 *   • Rallies longos (backbone principal)
 *   • Winners limpos e aces
 *   • Match points salvos (maior spike)
 *   • Break points salvos
 *   • Tiebreaks em andamento
 *   • Deuce / situações de pressão
 *
 * A nota cai com:
 *   • Duplas faltas
 *   • Pontos rápidos sem drama
 *   • Partida desequilibrada (bagels implícitos via decaimento)
 *
 * Arquitetura:
 *   gs.heat = { score, peak, _momentum }
 *   Chamado dentro de resolvePoint() a cada ponto.
 */

// ── Constantes ────────────────────────────────────────────────────

// Calibrados para escala completa (0–100):
//   partida chata  → MORNO  (peak ~20-30)
//   partida típica   → score ~50 (AQUECIDO), peak ~54
//   partida animada  → score ~51, peak ~63 (QUENTE)
//   partida épica    → score ~69 (QUENTE), peak ~96 (ÉPICO)
//   partida chata    → score ~18 (MORNO)
const BASELINE   = 18;    // match comum começa mais frio e precisa construir calor
const DECAY_RATE = 0.012; // esfria com mais naturalidade entre pontos pouco memoráveis
const AMPLIFIER  = 2.35;  // reduz overshoot e deixa o topo reservado para jogos especiais

// ── Cálculo de excitação do ponto ────────────────────────────────

/**
 * Calcula o "valor de excitação" de um ponto concluído.
 * Range: aproximadamente -8 a +50
 */
function calcExcitement(gs, winnerIdx, isWinner, isAce, ctx) {
  let e = 0;
  const rally = gs.rally ?? 0;

  // ── Rally length — o coração do heat ──
  // Calibrado: rallies 3-12 levemente mais impactantes para que
  // partidas típicas (6-12 shots) gerem scores AQUECIDO/QUENTE.
  if      (rally >= 30) e += 42;
  else if (rally >= 25) e += 35;
  else if (rally >= 20) e += 28;
  else if (rally >= 15) e += 22;
  else if (rally >= 12) e += 17;
  else if (rally >= 9)  e += 12;
  else if (rally >= 6)  e += 8;
  else if (rally >= 3)  e += 3;
  else                  e -= 4;

  // ── Qualidade do desfecho ──
  if (isAce)              e += 8;
  if (isWinner && !isAce) e += 7;
  if (ctx.isDoubleFault)  e -= 8;

  // ── Contexto de pressão ──
  if (ctx.wasMatchPointSaved) e += 34;
  if (ctx.wasBreakPointSaved) e += 16;
  if (ctx.wasDeuce)           e += 4;
  if (gs.inTiebreak)          e += 8;

  return Math.max(-10, Math.min(48, e));
}

// ── Multiplicador por magnitude ───────────────────────────────────

function exciteMult(e) {
  if (e >= 36) return 0.88;
  if (e >= 26) return 0.74;
  if (e >= 18) return 0.60;
  if (e >= 10) return 0.46;
  if (e >= 4)  return 0.32;
  if (e >= 0)  return 0.20;
  return 0.16;
}

// ── API pública ───────────────────────────────────────────────────

/**
 * Inicializa o estado de heat no gs.
 * Chamado dentro de initGame().
 */
export function initHeat(gs) {
  gs.heat = {
    score:      BASELINE,   // 0–100, float interno
    peak:       BASELINE,   // maior valor atingido na partida
    _momentum:  0,          // impulso acumulado (decai entre pontos)
  };
}

/**
 * Atualiza o heat após cada ponto.
 * Chamado no final de resolvePoint(), antes de scheduleNextPoint.
 *
 * @param {object} gs         — game state
 * @param {number} winnerIdx  — 0 ou 1
 * @param {boolean} isWinner  — foi winner limpo?
 * @param {boolean} isAce     — foi ace?
 * @param {object}  ctx       — { isDoubleFault, wasBreakPointSaved, wasMatchPointSaved, wasDeuce }
 */
export function updateHeat(gs, winnerIdx, isWinner, isAce, ctx) {
  if (!gs.heat) initHeat(gs);

  const h = gs.heat;
  const e = calcExcitement(gs, winnerIdx, isWinner, isAce, ctx);
  const mult = exciteMult(e);

  // Momento: integra a excitação com algum suavizamento
  // (para que um único ponto não faça saltos absurdos)
  // Momentum: 0.78 (era 0.6) → heat acumula ao longo de uma sequência emocionante
  // em vez de resetar quase completamente a cada ponto neutro.
  h._momentum = h._momentum * 0.68 + e * 0.32;

  // Score: move em direção ao target amplificado
  // AMPLIFIER permite que o score alcance valores altos (antes: target = BASELINE+momentum ≤ 70)
  const target = Math.min(100, BASELINE + h._momentum * AMPLIFIER);
  const delta  = (target - h.score) * mult;
  h.score     += delta;

  // Decaimento natural rumo ao BASELINE (tennnis monótono esfria rápido)
  h.score += (BASELINE - h.score) * DECAY_RATE;

  // Clamp
  h.score  = Math.max(0, Math.min(100, h.score));
  h.peak   = Math.max(h.peak, h.score);
}

// ── Leitura do snapshot (para o UI) ──────────────────────────────

/**
 * Retorna um objeto com tudo que o HUD precisa.
 * Não modifica o gs.
 */
export function readHeat(gs) {
  const score = gs?.heat?.score ?? BASELINE;
  const peak  = gs?.heat?.peak  ?? BASELINE;
  const n     = Math.round(score);

  // Tier de temperatura
  let tier;
  // Tiers ajustados: BASELINE=20, partida típica (30-50) fica NEUTRO/AQUECIDO
  if      (n >= 92) tier = { label: 'ÉPICO',       color: '#FFD700', glow: '#FFD70088', pulse: true  };
  else if (n >= 82) tier = { label: 'CLÁSSICO',    color: '#FF8C00', glow: '#FF8C0055', pulse: true  };
  else if (n >= 72) tier = { label: 'EM CHAMAS',   color: '#FF5533', glow: '#FF553333', pulse: false };
  else if (n >= 58) tier = { label: 'QUENTE',      color: '#FF9944', glow: null,        pulse: false };
  else if (n >= 40) tier = { label: 'AQUECIDO',    color: '#FFD700', glow: null,        pulse: false };
  else if (n >= 24) tier = { label: 'NEUTRO',      color: '#7ab4ff', glow: null,        pulse: false };
  else              tier = { label: 'MORNO',        color: '#4A7A9B', glow: null,        pulse: false };

  return { score: n, peak: Math.round(peak), tier };
}

/**
 * Converte um score numérico (0-100) diretamente no objeto de tier.
 * Útil para FastSimulation e outros contextos sem gs.
 */
export function heatScoreToTier(n) {
  n = Math.round(n);
  if      (n >= 92) return { label: 'ÉPICO',       color: '#FFD700', glow: '#FFD70088', pulse: true  };
  else if (n >= 82) return { label: 'CLÁSSICO',    color: '#FF8C00', glow: '#FF8C0055', pulse: true  };
  else if (n >= 72) return { label: 'EM CHAMAS',   color: '#FF5533', glow: '#FF553333', pulse: false };
  else if (n >= 58) return { label: 'QUENTE',      color: '#FF9944', glow: null,        pulse: false };
  else if (n >= 40) return { label: 'AQUECIDO',    color: '#FFD700', glow: null,        pulse: false };
  else if (n >= 24) return { label: 'NEUTRO',      color: '#7ab4ff', glow: null,        pulse: false };
  else              return { label: 'MORNO',        color: '#4A7A9B', glow: null,        pulse: false };
}

