// contactSpace.js — Camada 0 do ATP Shot Engine
// ═══════════════════════════════════════════════════════════════════════
// Calcula o envelope de contato tridimensional (altura × offset × prep window)
// no momento exato do golpe.
//
// RESPONSABILIDADE ÚNICA: descrever a GEOMETRIA do contato.
//   Não decide qual golpe. Não calcula qualidade final.
//   Apenas responde: "como está a bola em relação ao meu corpo agora?"
//
// Output canônico: ContactSpace object
// Consumido por:
//   swingPrepEngine.js → determina swing disponível + prepQuality
//   feasibilityMatrix.js → filtra shots viáveis
//   shotDecision.js (Phase 3) → substitui classifyContactZone() legado
//   game.js (tryHit) → armazenado em player._contactSpace
// ═══════════════════════════════════════════════════════════════════════

import { clamp } from './math.js';

// ── Zonas de Altura (calibradas em dados biomecânicos ATP) ─────────────────────
// Para cada zona: threshold inferior, nome, e teto máximo de qualidade.
// O teto é absoluto — nenhum atributo o supera.
export const HEIGHT_ZONES = [
  { name: 'OVERHEAD', minZ: 2.20, qCeiling: 1.00 }, // smash territory — qualidade depende do jogador
  { name: 'HIGH',     minZ: 1.70, qCeiling: 0.72 }, // cabeça — só flat/topspin de emergência
  { name: 'SHOULDER', minZ: 1.35, qCeiling: 0.88 }, // ombro — topspin pesado ou flat agressivo
  { name: 'SWEET',    minZ: 0.85, qCeiling: 1.00 }, // zona ideal ATP — todos os golpes
  { name: 'HIP',      minZ: 0.55, qCeiling: 0.80 }, // quadril — transição, sem flat agressivo
  { name: 'ANKLE',    minZ: 0.25, qCeiling: 0.62 }, // tornozelo/joelho — slice + topspin defensivo
  { name: 'DIRT',     minZ: 0.00, qCeiling: 0.45 }, // chão — meia-volley forçada
];

// Teto de qualidade por altura — acesso rápido por nome
export const HEIGHT_Q_CEILING = Object.fromEntries(
  HEIGHT_ZONES.map(z => [z.name, z.qCeiling])
);

// ── Zonas de Offset Lateral ────────────────────────────────────────────────────
// Distância entre onde a bola está e o ponto ideal de impacto do jogador.
// Quanto mais longe, menos controle, menos qualidade.
export const OFFSET_ZONES = [
  { name: 'IDEAL',     maxM: 0.30, qMult: 1.00 }, // ponto perfeito — sem penalidade
  { name: 'REACHABLE', maxM: 0.60, qMult: 0.88 }, // alcançável — leve perda de controle
  { name: 'STRETCH',   maxM: 1.00, qMult: 0.70 }, // braço esticado — perda real
  { name: 'EXTREME',   maxM: 1.40, qMult: 0.50 }, // limite do corpo — apenas emergência
  // > 1.40m = MISS — tratado em tryHit via effectiveReach (não chega aqui)
];

export const OFFSET_Q_MULT = Object.fromEntries(
  OFFSET_ZONES.map(z => [z.name, z.qMult])
);

// ── Classes de Prep Window ─────────────────────────────────────────────────────
// Tempo disponível para preparar o swing antes do contato.
// _arrivalMargin (segundos) → classe + multiplicador de swing
export const PREP_WINDOW_CLASSES = [
  { name: 'AMPLE',       minMs:  900, swingMult: 1.00 }, // tempo de sobra — full swing
  { name: 'COMFORTABLE', minMs:  600, swingMult: 1.00 }, // timing ideal ATP — full swing
  { name: 'TIGHT',       minMs:  400, swingMult: 0.82 }, // pressionado — compact swing
  { name: 'RUSH',        minMs:  200, swingMult: 0.64 }, // correndo — blocked swing
  { name: 'EMERGENCY',   minMs: -999, swingMult: 0.45 }, // reação pura — reflex block
];

export const PREP_SWING_MULT = Object.fromEntries(
  PREP_WINDOW_CLASSES.map(p => [p.name, p.swingMult])
);

// ── Funções de classificação ────────────────────────────────────────────────────

/**
 * Classifica a zona de altura dado z em metros.
 * Substitui classifyContactZone() legado com granularidade maior.
 * @param {number} z — altura da bola em metros no momento do hit
 * @returns {string} nome da zona ('SWEET', 'ANKLE', 'OVERHEAD', etc.)
 */
export function computeHeightZone(z) {
  for (const zone of HEIGHT_ZONES) {
    if (z >= zone.minZ) return zone.name;
  }
  return 'DIRT';
}

/**
 * Classifica a zona de offset lateral.
 * @param {number} offsetM — distância do ponto ideal de impacto (metros)
 * @returns {string} nome da zona ('IDEAL', 'REACHABLE', 'STRETCH', 'EXTREME')
 */
export function computeOffsetZone(offsetM) {
  for (const zone of OFFSET_ZONES) {
    if (offsetM <= zone.maxM) return zone.name;
  }
  return 'EXTREME';
}

/**
 * Classifica a prep window dado o arrivalMargin em segundos.
 * @param {number} arrivalMarginS — segundos de antecedência (negativo = atrasado)
 * @returns {string} nome da classe ('AMPLE', 'COMFORTABLE', 'TIGHT', 'RUSH', 'EMERGENCY')
 */
export function computePrepWindowClass(arrivalMarginS) {
  const ms = arrivalMarginS * 1000;
  for (const cls of PREP_WINDOW_CLASSES) {
    if (ms >= cls.minMs) return cls.name;
  }
  return 'EMERGENCY';
}

/**
 * Computa o Contact Space completo — envelope 3D do momento de impacto.
 *
 * Chamado em tryHit() imediatamente antes de evaluateContact().
 * Resultado armazenado em player._contactSpace para uso no shotDecision.js (Phase 3).
 *
 * @param {Object} ball   — bola no momento do hit ({ pos: {x,y,z}, vel, spin })
 * @param {Object} player — jogador ({ pos, side, reach, _arrivalMargin, vel, attrs })
 * @returns {ContactSpace}
 */
export function computeContactSpace(ball, player) {
  const bz = ball.pos?.z ?? 0.914;

  // ── Altura ─────────────────────────────────────────────────────────────────
  const heightZone     = computeHeightZone(bz);
  const heightQCeiling = HEIGHT_Q_CEILING[heightZone] ?? 1.0;

  // ── Offset lateral: distância entre a bola e o centro do jogador ───────────
  // O ponto de impacto ideal é aproximadamente o centro do corpo do jogador (pos.x).
  // A distância lateral real é |ball.x - player.x|.
  // Nota: _predCrossX é a posição X prevista da bola — mais preciso quando disponível.
  const idealX        = player._predCrossX ?? player.pos?.x ?? 0;
  const lateralOffset = Math.abs((ball.pos?.x ?? 0) - idealX);
  const offsetZone    = computeOffsetZone(lateralOffset);
  const offsetQMult   = OFFSET_Q_MULT[offsetZone] ?? 0.50;

  // ── Prep window: _arrivalMargin em segundos → classe → multiplicador ────────
  const arrivalMarginS  = player._arrivalMargin ?? 0.5;
  const prepWindowClass = computePrepWindowClass(arrivalMarginS);
  const prepSwingMult   = PREP_SWING_MULT[prepWindowClass] ?? 0.45;

  // ── Q ceiling combinado: mínimo entre altura e offset ─────────────────────
  // Um contato perfeito em zona baixa ainda tem teto baixo (física do corpo).
  // Um contato em posição ideal mas bola lateral também tem teto reduzido.
  const qCeiling = Math.min(heightQCeiling, offsetQMult);

  return {
    // Altura
    heightZ:         bz,
    heightZone,
    heightQCeiling,

    // Offset lateral
    lateralOffset,
    offsetZone,
    offsetQMult,

    // Prep window
    arrivalMarginS,
    prepWindowClass,
    prepSwingMult,

    // Teto combinado
    qCeiling,
  };
}
