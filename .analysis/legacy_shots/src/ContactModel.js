// ContactModel.js — Qualidade de contato física
// Fonte primária de finalQuality. Todos os fatores físicos do momento
// do golpe são calculados aqui de forma multiplicativa.
//
// Fatores (do maior para o menor impacto típico):
//   1. timingFactor      — chegou cedo? janela de golpe aberta?
//   2. prepFactor        — teve tempo de preparar o swing?
//   3. balanceFactor     — estava equilibrado/parado ao bater?
//   4. fatigueFactor     — stamina restante
//   5. pressureFactor    — estado tático de pressão
//   6. spinControlFactor — spin da bola recebida dificulta o controle
//   7. volleyFactor      — penalidade por tipo de voleio

import { clamp } from './math.js';
import { CONTACT } from './contactCoefficients.js';

/**
 * Calcula a qualidade de contato do golpe.
 *
 * @param {Object} ctx              - contexto do jogador (underPressure, etc.)
 * @param {Object} player           - jogador (stamina, _volleyType, attrs, etc.)
 * @param {Object} ball             - bola no momento do impacto (spin x/y/z)
 * @param {number} arrivalMargin    - segundos de antecedência (player._arrivalMargin)
 * @param {number} lateralVelocity  - velocidade lateral absoluta no momento do golpe
 * @param {number} distFromOptimal  - distância da posição ideal de impacto (metros)
 * @param {number} prepScore        - nível de preparação do swing (0..1, default 0)
 * @returns {{ quality, timingFactor, prepFactor, balanceFactor, fatigueFactor,
 *             pressureFactor, spinControlFactor, volleyFactor }}
 */
export function evaluateContact(ctx, player, ball, arrivalMargin, lateralVelocity, distFromOptimal, prepScore = 0, prepQualityCeiling = 1.0) {

  // 1. TIMING: quão cedo o jogador chegou à bola
  //    >= TIMING_EARLY → timing perfeito (1.0)
  //    <= TIMING_LATE  → timing no piso (TIMING_FLOOR)
  //    TIMING_FLOOR evita que o modelo multiplicativo colapse para zero:
  //    um jogador atrasado bate com qualidade reduzida, mas não zero.
  const timingRaw = clamp(
    (arrivalMargin - CONTACT.TIMING_LATE) /
    (CONTACT.TIMING_EARLY - CONTACT.TIMING_LATE),
    0, 1
  );
  const timingFactor = CONTACT.TIMING_FLOOR + timingRaw * (1 - CONTACT.TIMING_FLOOR);

  // 2. PREP: preparação do swing antes do contato
  //    prepScore=0 → PREP_BASE (mínimo — jogador ainda bate, mas sem preparação)
  //    prepScore=1 → PREP_BASE + PREP_WEIGHT = 1.00 (swing totalmente preparado)
  const prepFactor = clamp(CONTACT.PREP_BASE + prepScore * CONTACT.PREP_WEIGHT, 0, 1);

  // 3. BALANCE: penalidade por movimento lateral + distância da posição ideal
  const balancePenalty =
    lateralVelocity * CONTACT.BALANCE_VEL_SCALE +
    distFromOptimal * CONTACT.BALANCE_DIST_SCALE;
  const balanceFactor = clamp(1 - balancePenalty, 0, 1);

  // 4. FATIGUE: stamina já está em 0–1 no game.js
  // O cansaço afeta a técnica de forma MUITO suave — o jogador ainda sabe bater.
  // O que a stamina baixa realmente faz é chegar mais tarde (timingFactor) e
  // se mover mais devagar (STAMINA.speedMinFactor, reachMinFactor, staminaAccelMin).
  // FATIGUE_FLOOR garante que mesmo sem energia, a qualidade de contato ≥ 70%.
  const staminaFrac   = clamp(player.stamina ?? 1.0, 0, 1);
  const rawFatigue    = Math.pow(staminaFrac, CONTACT.FATIGUE_EXPONENT);
  const fatigueFactor = clamp(rawFatigue, CONTACT.FATIGUE_FLOOR ?? 0.70, 1.0);

  // 5. PRESSURE: penalidade quando ctx.underPressure (estado tático)
  const pressurePenalty = ctx?.underPressure ? CONTACT.PRESSURE_PENALTY : 0;
  const pressureFactor  = clamp(1 - pressurePenalty, 0, 1);

  // 6. SPIN CONTROL: spin alto da bola recebida = mais difícil de controlar
  const spinMag = Math.sqrt(
    (ball.spin?.x ?? 0) ** 2 +
    (ball.spin?.y ?? 0) ** 2 +
    (ball.spin?.z ?? 0) ** 2
  );
  const spinControlFactor = clamp(1 - spinMag * CONTACT.SPIN_SCALE, 0, 1);

  // 7. VOLLEY TYPE: penalidade por situação de voleio
  const vt = player._volleyType;
  const volleyPenalty = vt === 'emergency' ? CONTACT.VOLLEY_EMERGENCY_PENALTY
                      : vt === 'position'  ? CONTACT.VOLLEY_POSITION_PENALTY
                      : 0;
  const volleyFactor = 1 - volleyPenalty;

  // 8. HALF VOLLEY: golpe imediatamente após o quique — bola ainda em altura de tornozelo.
  // Contato muito baixo torna o clearance de rede difícil e exige timing preciso.
  const halfVolleyFactor = player._halfVolleyContext ? (1 - CONTACT.HALF_VOLLEY_PENALTY) : 1;

  // MULTIPLICATIVO: um fator ruim arrasta os demais
  const rawQuality = clamp(
    timingFactor    *
    prepFactor      *
    balanceFactor   *
    fatigueFactor   *
    pressureFactor  *
    spinControlFactor *
    volleyFactor    *
    halfVolleyFactor,
    0.02, 1.0
  );

  // Teto biomecânico: prepQuality do swingPrepEngine é o teto absoluto.
  // Um REFLEX em offset EXTREME nunca produz qualidade de um FULL swing ideal.
  // Sem este clamp, o modelo multiplicativo podia produzir Q=0.85 mesmo com
  // prepQuality=0.45 (swing reflex) — fisicamente impossível.
  const quality = clamp(rawQuality, 0.02, prepQualityCeiling);

  return {
    quality,
    timingFactor,
    prepFactor,
    balanceFactor,
    fatigueFactor,
    pressureFactor,
    spinControlFactor,
    volleyFactor,
    halfVolleyFactor,
  };
}
