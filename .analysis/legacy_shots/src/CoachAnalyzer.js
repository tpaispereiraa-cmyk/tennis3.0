/**
 * CoachAnalyzer.js
 * ─────────────────────────────────────────────────────────────────
 * FASE 5 · Inteligência em Partida — Análise
 *
 * Lê o estado atual da partida e produz um snapshot de análise tática.
 * Chamado a cada changeover (game change) e entre sets.
 *
 * Não altera nenhum cálculo de jogo — apenas lê e analisa.
 *
 * Entradas:
 *   playerCtx  — ctx completo do jogador (de ai.js)
 *   oppCtx     — ctx completo do oponente
 *   matchLog   — array de pontos: [{ won, rallyLen, oppNet, matchShotType }]
 *   setHistory — array de scores de sets: [{ p0, p1 }]
 *
 * Saída: objeto `analysis` usado pelo CoachAdvisor.js
 */

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

function avg(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Detecta o lado mais fraco do oponente com base em matchCtx.
 * oppBhHits / oppFhHits: vezes que o oponente mirou no nosso BH/FH.
 * Aqui usamos o inverso: em que lado o oponente PERDE mais pontos.
 *
 * Nota: como matchCtx conta hits CONTRA o jogador, avaliamos
 * qual lado do adversário foi explorado com mais sucesso.
 *
 * @param {object} playerMatchCtx — playerCtx.matchCtx
 * @returns {'BH'|'FH'|null}
 */
function detectWeakerSide(playerMatchCtx) {
  const mc = playerMatchCtx ?? {};
  const bh = mc.oppBhHits ?? 0;
  const fh = mc.oppFhHits ?? 0;
  const total = bh + fh;
  if (total < 3) return null; // amostra insuficiente (era 4)
  // O lado que o oponente mais mirou no NOSSO jogo sugere que ele teme o nosso lado oposto
  // Mas aqui "oppBhHits" = vezes que o oponente atacou nosso BH.
  // Para detectar o LADO FRACO DO OPP, usamos o padrão de direção do rally:
  // Se o oponente atacou muito o nosso BH e perdemos menos nesse rally,
  // significa que nosso FH é a arma. O lado fraco do oponente está exposto quando atacamos o CRUZADO.
  // Simplificado: lado mais atacado pelo oponente = seu lado mais confortável → o outro é fraco.
  if (bh > fh * 1.4) return 'FH'; // opp mira BH → nosso FH é arma → lado fraco do opp é FH dele
  if (fh > bh * 1.4) return 'BH';
  return null;
}

/**
 * Taxa de acerto ao explorar o lado detectado como fraco.
 * Baseada em patternHistory do jogador (últimas 6 tacadas).
 *
 * @param {object} playerMatchCtx
 * @returns {number} 0-1
 */
function calcSideExploitRate(playerMatchCtx) {
  const mc = playerMatchCtx ?? {};
  const bh = mc.oppBhHits ?? 0;
  const fh = mc.oppFhHits ?? 0;
  const total = bh + fh;
  if (total === 0) return 0.5;
  const dominant = Math.max(bh, fh);
  return clamp(dominant / total, 0, 1);
}

/**
 * Taxa de vitória quando o oponente sobe à rede.
 * @param {Array} matchLog
 * @returns {number} 0-1
 */
function calcNetWinRate(matchLog) {
  if (!matchLog || matchLog.length === 0) return 0;
  const netPoints = matchLog.filter(m => m.oppNet);
  if (netPoints.length === 0) return 0;
  const wins = netPoints.filter(m => !m.won); // oponente foi à rede e PERDEU o ponto
  return clamp(wins.length / netPoints.length, 0, 1);
}

/**
 * Estima a stamina atual do oponente (0-1).
 * Usa _realStamina se injetado (headless), senão usa proxy de momentum.
 *
 * @param {object} oppCtx
 * @returns {number} 0-1
 */
function estimateOppStamina(oppCtx) {
  if (!oppCtx) return 1.0;
  // headless injeta stamina real em oppCtx._realStamina antes de chamar analyzeMatch
  if (typeof oppCtx._realStamina === 'number') return oppCtx._realStamina;
  // fallback: momentum + rallyPressure como proxy
  const momentum = oppCtx.momentum ?? 0.5;
  const rallyPressure = oppCtx.rallyPressure ?? 0;
  return clamp(momentum * 0.6 + (1 - rallyPressure) * 0.4, 0, 1);
}

/**
 * Analisa comportamento do oponente em break points.
 * @param {Array} matchLog
 * @returns {'aggresses'|'retreats'|null}
 */
function analyzeBreakPtBehavior(matchLog) {
  if (!matchLog || matchLog.length < 4) return null;
  const bpPoints = matchLog.filter(m => m.isBreakPoint);
  if (bpPoints.length < 2) return null;
  const aggress = bpPoints.filter(m => m.shotType === 'FLAT' || m.shotType === 'SHORT_ANGLE' || m.intent === 'FINISH');
  const ratio = aggress.length / bpPoints.length;
  if (ratio > 0.6) return 'aggresses';
  if (ratio < 0.35) return 'retreats';
  return null;
}

/**
 * Taxa de erro por tipo de shot do oponente.
 * @param {Array} matchLog
 * @returns {object} { [shotType]: errorRate }
 */
function calcErrorRateByType(matchLog) {
  if (!matchLog || matchLog.length === 0) return {};
  const byType = {};
  for (const m of matchLog) {
    if (!m.oppShotType) continue;
    if (!byType[m.oppShotType]) byType[m.oppShotType] = { total: 0, errors: 0 };
    byType[m.oppShotType].total++;
    if (m.oppError) byType[m.oppShotType].errors++;
  }
  const result = {};
  for (const [type, stats] of Object.entries(byType)) {
    if (stats.total >= 3) result[type] = clamp(stats.errors / stats.total, 0, 1);
  }
  return result;
}

/**
 * Detecta padrão de direção do oponente via patternHistory.
 * @param {Array} patternHistory — array de { targetX, shotType, ... }
 * @returns {'crosscourt'|'dtl'|'mixed'}
 */
function detectDirPattern(patternHistory) {
  if (!patternHistory || patternHistory.length < 3) return 'mixed';
  const cc  = patternHistory.filter(p => (p.targetX ?? 0) * (p._side ?? 1) < -0.5).length;
  const dtl = patternHistory.filter(p => (p.targetX ?? 0) * (p._side ?? 1) > 0.5).length;
  const total = patternHistory.length;
  if (cc / total > 0.65) return 'crosscourt';
  if (dtl / total > 0.65) return 'dtl';
  return 'mixed';
}

// ─────────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL
// ─────────────────────────────────────────────────────────────────

/**
 * Produz snapshot de análise tática para o CoachAdvisor.
 *
 * @param {object} playerCtx    — ctx completo do jogador (ai.js)
 * @param {object} oppCtx       — ctx completo do oponente (ai.js)
 * @param {Array}  matchLog     — histórico de pontos do jogo
 * @param {Array}  setHistory   — histórico de sets [{ p0, p1 }]
 * @returns {object} analysis
 */
export function analyzeMatch(playerCtx, oppCtx, matchLog, setHistory) {
  const log = matchLog ?? [];
  const mc  = playerCtx?.matchCtx ?? {};

  // ── Lado mais fraco do oponente ──────────────────────────────
  const oppWeakerSide   = detectWeakerSide(mc);
  const sideExploitRate = calcSideExploitRate(mc);

  // ── Comprimento de rally ──────────────────────────────────────
  const wonPoints  = log.filter(m => m.won);
  const lostPoints = log.filter(m => !m.won);
  const avgRallyWon  = avg(wonPoints.map(m => m.rallyLen ?? 0));
  const avgRallyLost = avg(lostPoints.map(m => m.rallyLen ?? 0));
  const preferLongRally = avgRallyWon > avgRallyLost + 3;

  // ── Rede do oponente ─────────────────────────────────────────
  const oppNetApproaches = log.filter(m => m.oppNet).length;
  const oppNetWinRate    = calcNetWinRate(log);

  // ── Stamina do oponente (estimada) ───────────────────────────
  const oppStaminaEst = estimateOppStamina(oppCtx);

  // ── Break points ─────────────────────────────────────────────
  const breakPtBehavior = analyzeBreakPtBehavior(log);

  // ── Taxa de erro por shot type ────────────────────────────────
  const oppErrorsByType = calcErrorRateByType(log);

  // ── Padrão de direção do oponente ────────────────────────────
  const oppDirPattern = detectDirPattern(oppCtx?.patternHistory ?? []);

  // ── Totais do jogo ────────────────────────────────────────────
  const totalPointsPlayed = log.length;
  const pointsWon  = wonPoints.length;
  const pointsLost = lostPoints.length;

  return {
    // Lado
    oppWeakerSide,
    sideExploitRate,

    // Rally
    avgRallyWon,
    avgRallyLost,
    preferLongRally,

    // Rede
    oppNetApproaches,
    oppNetWinRate,

    // Stamina
    oppStaminaEst,

    // Pressão
    breakPtBehavior,

    // Erros
    oppErrorsByType,

    // Padrão
    oppDirPattern,

    // Totais
    totalPointsPlayed,
    pointsWon,
    pointsLost,
  };
}
