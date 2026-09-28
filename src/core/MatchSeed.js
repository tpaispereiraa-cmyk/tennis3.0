/**
 * MatchSeed — gerenciamento de seed por partida
 *
 * O seed é definido UMA VEZ no início de cada ponto (não da partida inteira),
 * de forma que pontos individuais são reproduzíveis sem precisar regravar
 * toda a partida desde o começo.
 *
 * Fluxo normal:
 *   1. beginPoint(matchId, pointIndex) → deriva seed deterministicamente
 *   2. Toda a resolução do ponto usa rand() com esse seed
 *   3. getPointSeed() → guarda no histórico para replay
 *
 * Fluxo replay:
 *   1. replayPoint(seed) → restaura exatamente o mesmo seed
 *   2. Roda a mesma lógica → resultado idêntico
 */

import { seedRand, getRandSeed } from './math.js';

// Seed base da partida corrente (derivado de matchId + timestamp)
let _matchBaseSeed = 0;
let _currentPointSeed = 0;

/**
 * Inicia uma nova partida. O seed base é público e deve ser gravado
 * junto com o log da partida para permitir replay completo.
 *
 * @param {string|number} matchId — identificador único da partida
 * @param {number}        [forceSeed] — seed fixo (testes / replay)
 */
export function beginMatch(matchId, forceSeed) {
  if (forceSeed !== undefined) {
    _matchBaseSeed = forceSeed >>> 0;
  } else {
    // Hash rápido de matchId + timestamp para evitar colisões
    const ts = Date.now() >>> 0;
    const id = typeof matchId === 'number' ? matchId : hashStr(String(matchId));
    _matchBaseSeed = (id ^ ts ^ 0xDEADBEEF) >>> 0;
  }
  _currentPointSeed = _matchBaseSeed;
  seedRand(_currentPointSeed);
  return _matchBaseSeed;
}

/**
 * Deriva e aplica o seed para o ponto N.
 * Garante que o ponto 7 sempre começa do mesmo estado, independente
 * de quantos pontos foram jogados antes (sem acumulação de estado).
 *
 * @param {number} pointIndex — índice do ponto (0-based)
 */
export function beginPoint(pointIndex) {
  // Deriva seed do ponto via mixagem simples com Knuth multiplicative hash
  _currentPointSeed = ((_matchBaseSeed ^ (pointIndex * 0x9E3779B9)) >>> 0);
  seedRand(_currentPointSeed);
  return _currentPointSeed;
}

/**
 * Restaura o seed exato de um ponto gravado (modo replay).
 * @param {number} pointSeed — valor retornado por beginPoint() na partida original
 */
export function replayPoint(pointSeed) {
  _currentPointSeed = pointSeed >>> 0;
  seedRand(_currentPointSeed);
}

/** Retorna o seed do ponto atual — grave isso no log de cada ponto. */
export function getPointSeed() {
  return _currentPointSeed;
}

/** Retorna o seed base da partida corrente. */
export function getMatchSeed() {
  return _matchBaseSeed;
}

// ---------------------------------------------------------------------------
// helpers internos
// ---------------------------------------------------------------------------

function hashStr(s) {
  let h = 0x811C9DC5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (Math.imul(h, 0x01000193)) >>> 0;
  }
  return h;
}
