// swingPrepEngine.js — Camada 1 do ATP Shot Engine
// ═══════════════════════════════════════════════════════════════════════
// Dado o Contact Space + estado físico do jogador, determina:
//   1. swingType  — qual swing está biomechanicamente disponível
//   2. prepQuality — teto de qualidade de preparação (0.0–1.0)
//
// PRINCIPIO: prepQuality é o teto máximo para Strike Quality.
//   Nenhum atributo supera a prepQuality — atributos apenas otimizam
//   dentro do possível dado o prep disponível.
//
// Atributos que influenciam:
//   leitura       → amplia prepTimeFactor (lê a bola mais cedo = mais prep percebido)
//   explosividade → melhora footworkFactor (chega mais equilibrado)
//   velocidade    → reduz penalidade de balance quando correndo
//
// Consumido por:
//   feasibilityMatrix.js → swingType define shots disponíveis
//   ContactModel.js      → prepQuality como ceiling adicional
//   game.js (tryHit)     → armazenado em player._swingPrep
// ═══════════════════════════════════════════════════════════════════════

import { clamp } from './math.js';
import { PREP_SWING_MULT } from './contactSpace.js';

// ── Tipos de Swing ─────────────────────────────────────────────────────────────
// completionFactor: o quanto do swing potential é aproveitado
export const SWING_TYPES = {
  FULL:    { id: 'FULL',    completionFactor: 1.00 }, // backswing completo, transferência de peso
  COMPACT: { id: 'COMPACT', completionFactor: 0.82 }, // backswing reduzido, mais pulso
  BLOCKED: { id: 'BLOCKED', completionFactor: 0.64 }, // sem backswing — redirecionamento puro
  REFLEX:  { id: 'REFLEX',  completionFactor: 0.45 }, // reação instintiva pura
};

// Swing gerado pela prep window class (antes de considerar offset)
const PREP_WINDOW_TO_SWING = {
  AMPLE:       'FULL',
  COMFORTABLE: 'FULL',
  TIGHT:       'COMPACT',
  RUSH:        'BLOCKED',
  EMERGENCY:   'REFLEX',
};

// Downgrade de swing por offset zone (bola muito lateral = menos swing disponível)
const OFFSET_SWING_DOWNGRADE = {
  IDEAL:     0, // sem downgrade
  REACHABLE: 0, // sem downgrade
  STRETCH:   1, // 1 nível abaixo: FULL→COMPACT, COMPACT→BLOCKED, BLOCKED→REFLEX
  EXTREME:   2, // 2 níveis abaixo: FULL→BLOCKED, COMPACT→REFLEX, BLOCKED→REFLEX
};

const SWING_ORDER = ['REFLEX', 'BLOCKED', 'COMPACT', 'FULL'];

function downgradeSwing(swingType, levels) {
  const idx = Math.max(0, SWING_ORDER.indexOf(swingType) - levels);
  return SWING_ORDER[Math.max(0, idx)];
}

/**
 * Computa o tipo de swing e a Prep Quality.
 *
 * @param {Object} contactSpace — resultado de computeContactSpace()
 * @param {Object} player       — jogador ({ attrs, stamina, vel, _halfVolleyContext, atNet })
 * @param {Object} ball         — bola ({ spin }) — para spinControlFactor
 * @returns {{
 *   swingType:             string,  // 'FULL' | 'COMPACT' | 'BLOCKED' | 'REFLEX'
 *   prepQuality:           number,  // 0.20–1.00 — teto para Strike Quality
 *   prepTimeFactor:        number,  // sub-fator: prep window × leitura
 *   swingCompletionFactor: number,  // sub-fator: do swing type
 *   balanceFactor:         number,  // sub-fator: movimento lateral
 *   footworkFactor:        number,  // sub-fator: posição de impacto
 *   fatigueMod:            number,  // sub-fator: stamina
 * }}
 */
export function computeSwingPrep(contactSpace, player, ball) {
  const attrs   = player.attrs   ?? {};
  const stamina = player.stamina ?? 1.0;

  // ── 1. Swing Type: prep window → downgrade por offset ─────────────────────
  const baseSwing    = PREP_WINDOW_TO_SWING[contactSpace.prepWindowClass] ?? 'BLOCKED';
  const offsetLevels = OFFSET_SWING_DOWNGRADE[contactSpace.offsetZone] ?? 0;

  // Half volley forçado = REFLEX sempre (sem opção de backswing com bola no chão)
  // Volley de emergência também forçado
  const halfVolley       = player._halfVolleyContext ?? false;
  const emergencyVolley  = player._volleyType === 'emergency';
  const swingType = (halfVolley || emergencyVolley)
    ? 'REFLEX'
    : downgradeSwing(baseSwing, offsetLevels);

  // ── 2. prepTimeFactor: prep window base + bônus de leitura ────────────────
  // Atributo leitura amplia percepção temporal:
  //   leitura 50 (base) → sem bônus
  //   leitura 90  → +8% no prepSwingMult (lê cedo, tem mais tempo subjetivo)
  //   leitura 20  → -8%  (não antecipa, sente menos tempo)
  const leituraAttr    = attrs.leitura ?? 50;
  const prepTimeBase   = contactSpace.prepSwingMult; // 0.45–1.00 da prep window class
  const leituraBonus   = (leituraAttr - 50) / 100 * 0.16; // ±0.08
  const prepTimeFactor = clamp(prepTimeBase + leituraBonus, 0.35, 1.00);

  // ── 3. swingCompletionFactor: completeness do swing disponível ────────────
  const swingCompletionFactor = SWING_TYPES[swingType]?.completionFactor ?? 0.45;

  // ── 4. balanceFactor: estabilidade no momento do golpe ───────────────────
  // Movimento lateral alto = menos equilíbrio = menos controle de balanço.
  // Atributo velocidade reduz a penalidade (jogador mais rápido se estabiliza melhor,
  // planta o pé com mais eficiência).
  const lateralVel    = Math.abs(player.vel?.x ?? 0);
  const velAttr       = attrs.velocidade ?? 50;
  // velBonusMod: velocidade 50 → ×0.92 | velocidade 90 → ×0.98 | velocidade 20 → ×0.86
  const velBonusMod   = 0.85 + (velAttr / 100) * 0.13;
  // penalidade: 0 em parado, até 0.30 em velocidade lateral máxima (~6 m/s)
  const balancePenalty= clamp(lateralVel * 0.050 * velBonusMod, 0, 0.30);
  const balanceFactor = clamp(1.0 - balancePenalty, 0.70, 1.00);

  // ── 5. footworkFactor: qualidade do posicionamento de impacto ────────────
  // Usa o offset zone como proxy: quanto mais longe do ponto ideal, pior o footwork.
  // Atributo explosividade melhora footwork (chega mais equilibrado à bola).
  const explosAttr = attrs.explosividade ?? 50;
  const footworkBase = {
    IDEAL:     1.00,
    REACHABLE: 0.93,
    STRETCH:   0.78,
    EXTREME:   0.62,
  }[contactSpace.offsetZone] ?? 0.62;
  const explosBonus  = (explosAttr - 50) / 100 * 0.10; // ±0.05
  const footworkFactor = clamp(footworkBase + explosBonus, 0.55, 1.00);

  // ── 6. fatigueMod: efeito da fadiga na preparação ────────────────────────
  // Fadiga afeta principalmente o footwork e balance (chegada, não técnica pura).
  // Expoente suave: stamina=1.0→1.00 | stamina=0.5→0.92 | stamina=0.0→0.85
  const fatigueMod = 0.85 + Math.pow(stamina, 0.6) * 0.15;

  // ── 7. Prep Quality: produto multiplicativo de todos os fatores ───────────
  // Piso 0.20: mesmo em situação caótica, o jogador ainda faz algum contato útil.
  const prepQuality = clamp(
    prepTimeFactor       *
    swingCompletionFactor *
    balanceFactor        *
    footworkFactor       *
    fatigueMod,
    0.20,
    1.00
  );

  return {
    swingType,
    prepQuality,
    // sub-fatores (para debug/trace)
    prepTimeFactor,
    swingCompletionFactor,
    balanceFactor,
    footworkFactor,
    fatigueMod,
  };
}
