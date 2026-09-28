import { clamp } from '../../core/math.js';
import { ShotDirection, ShotFamily } from './ShotTypes.js';

export const SERVE_EXCHANGE_VERSION = 'serve-exchange-v2';

function normAttr(player, key, fallback = 60) {
  const value = player?.attrs?.[key];
  return clamp((Number.isFinite(value) ? value : fallback) / 100, 0, 1);
}

function patternNovelty(history = [], family, direction, serverId) {
  const previous = history.slice(-5).filter(item => item?.serverId == null || item.serverId === serverId);
  if (!previous.length) return 0.72;
  const repetitions = previous.filter(item => item?.family === family && item?.direction === direction).length;
  return clamp(0.82 - repetitions * 0.19, 0.18, 0.82);
}

function surfaceServeFactor(courtMods = {}) {
  const serveBonus = Number(courtMods?.serveBonus) || 0;
  const rallyLength = clamp(Number(courtMods?.rallyLengthMult) || 1, 0.55, 2.2);
  return clamp(0.5 + serveBonus * 1.8 + (1 - rallyLength) * 0.20, 0.28, 0.72);
}

/**
 * Fonte única da vantagem criada pelo saque. O objeto representa o que de fato
 * saiu da raquete, e não uma previsão anterior ao lançamento da bola.
 */
export function buildServeDelivery({
  server,
  caps = {},
  kmh = 0,
  isFirst = true,
  family,
  direction,
  spinX = 0,
  spinZ = 0,
  target = {},
  patternHistory = [],
  courtMods = {},
} = {}) {
  const precision = caps.servePrecision ?? normAttr(server, 'saquePrecisao', 70);
  const powerSkill = caps.servePower ?? normAttr(server, 'saqueForca', 70);
  const tactical = caps.tacticalVision ?? normAttr(server, 'visaoTatica', 65);
  const pace = clamp((kmh - (isFirst ? 132 : 112)) / (isFirst ? 78 : 72), 0, 1);
  const placementBase = direction === ShotDirection.BODY ? 0.78
    : direction === ShotDirection.WIDE ? 0.73
      : 0.62;
  const placement = clamp(placementBase * 0.72 + precision * 0.28, 0, 1);
  const rawSpin = Math.abs(spinZ) + Math.abs(spinX) * 0.25;
  const shapeBase = family === ShotFamily.SERVE_KICK ? 0.72
    : family === ShotFamily.SERVE_SLICE ? 0.68
      : 0.28;
  const shape = clamp(shapeBase * 0.72 + clamp(rawSpin / 16, 0, 1) * 0.28, 0, 1);
  const disguise = clamp(
    tactical * 0.42
      + precision * 0.24
      + patternNovelty(patternHistory, family, direction, server?.id) * 0.34,
    0,
    1,
  );
  const surface = surfaceServeFactor(courtMods);
  const surfaceIdentityServe = clamp(server?._surfaceIdentityFx?.serveQuality ?? 0, -0.08, 0.08);

  // O saque possui iniciativa estrutural. A devolução não começa de 50/50:
  // até um primeiro saque médio obriga reação antes de permitir construção.
  const structural = isFirst ? 0.25 : 0.075;
  const threat = clamp(
    structural
      + pace * (isFirst ? 0.27 : 0.17)
      + placement * (isFirst ? 0.19 : 0.15)
      + shape * (isFirst ? 0.12 : 0.20)
      + disguise * (isFirst ? 0.10 : 0.08)
      + powerSkill * (isFirst ? 0.055 : 0.025)
      + (surface - 0.5) * 0.16
      + surfaceIdentityServe,
    isFirst ? 0.34 : 0.16,
    isFirst ? 0.96 : 0.74,
  );
  const bodyPressure = clamp(
    threat * 0.52
      + (direction === ShotDirection.BODY ? placement * 0.38 : 0)
      + (direction === ShotDirection.WIDE ? placement * 0.18 : 0),
    0,
    1,
  );
  const lateralPressure = clamp(
    threat * 0.36
      + (direction === ShotDirection.WIDE ? placement * 0.48 : 0)
      + (family === ShotFamily.SERVE_SLICE ? shape * 0.16 : 0),
    0,
    1,
  );
  const verticalPressure = clamp(
    threat * 0.24 + (family === ShotFamily.SERVE_KICK ? shape * 0.58 : shape * 0.12),
    0,
    1,
  );

  return Object.freeze({
    version: SERVE_EXCHANGE_VERSION,
    isFirst,
    family,
    direction,
    kmh,
    targetX: target?.x ?? 0,
    targetY: target?.y ?? 0,
    pace: +pace.toFixed(3),
    placement: +placement.toFixed(3),
    shape: +shape.toFixed(3),
    disguise: +disguise.toFixed(3),
    surface: +surface.toFixed(3),
    structural: +structural.toFixed(3),
    threat: +threat.toFixed(3),
    bodyPressure: +bodyPressure.toFixed(3),
    lateralPressure: +lateralPressure.toFixed(3),
    verticalPressure: +verticalPressure.toFixed(3),
  });
}

/**
 * Resolve a colisão entre a entrega do saque e a capacidade real do recebedor.
 * Leitura melhora antecipação, mas não apaga pace/shape/colocação.
 */
export function evaluateReturnChallenge({ delivery, caps = {}, body = {}, ballState = {}, player = {} } = {}) {
  const d = delivery ?? {};
  const returnSkill = caps.return ?? normAttr(player, 'devolucao', 60);
  const reading = caps.reading ?? normAttr(player, 'leitura', 60);
  const control = caps.wingControl ?? 0.60;
  const explosiveness = caps.explosiveness ?? normAttr(player, 'explosividade', 60);
  const consistency = caps.consistency ?? normAttr(player, 'regularidade', 65);
  const surfaceIdentityReturn = clamp(player?._surfaceIdentityFx?.returnQuality ?? 0, -0.07, 0.07);
  const technique = clamp(
    returnSkill * 0.38 + reading * 0.24 + control * 0.18 + explosiveness * 0.11 + consistency * 0.09,
    0, 1,
  );
  const surfaceTechnique = clamp(technique + surfaceIdentityReturn, 0, 1);
  const latGap = Math.abs((ballState?.pos?.x ?? 0) - (player?.pos?.x ?? 0));
  const reach = Math.max(body?.reach ?? player?.reach ?? 1.0, 0.35);
  const readiness = clamp(body?.contactReadiness ?? 0, 0, 1);
  const arrival = Number(body?.arrivalMargin) || 0;
  const positionError = Math.max(0, Number(body?.contactPositionError) || 0);
  const anticipation = clamp(reading * 0.54 + explosiveness * 0.24 + returnSkill * 0.22, 0, 1);
  const reachStress = clamp((latGap - reach * 0.64) / Math.max(0.45, reach * 0.72), 0, 1);
  const reactiveReach = reach * (0.92 + anticipation * 0.26 + (d.isFirst === false ? 0.08 : 0));
  const timingStress = clamp((-arrival - 0.02) / 0.34, 0, 1);
  const baseStress = clamp((0.34 - readiness) / 0.34, 0, 1);
  const spacingStress = clamp(positionError / Math.max(0.45, reach), 0, 1);
  const physicalDemand = clamp(
    (d.threat ?? 0.45) * 0.46
      + (d.bodyPressure ?? 0) * 0.16
      + (d.lateralPressure ?? 0) * 0.16
      + (d.verticalPressure ?? 0) * 0.08
      + reachStress * 0.22
      + timingStress * 0.15
      + baseStress * 0.10
      + spacingStress * 0.08
      - anticipation * 0.16,
    0,
    1,
  );
  const responseMargin = clamp(surfaceTechnique - physicalDemand, -1, 1);
  const realEmergency = physicalDemand >= 0.72
    || reachStress >= 0.86
    || (timingStress >= 0.82 && readiness < 0.15);
  const compromised = !realEmergency && (physicalDemand >= 0.52 || reachStress >= 0.58 || timingStress >= 0.58);
  const jammed = d.direction === ShotDirection.BODY && (d.bodyPressure ?? 0) >= 0.52;
  const posture = realEmergency ? 'EMERGENCY_REACH'
    : jammed ? 'BODY_BLOCK'
      : compromised ? 'REACTIVE_BLOCK'
        : 'BALANCED_RETURN';
  const qualityPenalty = clamp(
    physicalDemand * (d.isFirst === false ? 0.12 : 0.24)
      + (realEmergency ? 0.16 : compromised ? 0.07 : 0),
    0,
    0.52,
  );
  const qualityCeiling = clamp(
    0.94 - (d.threat ?? 0.45) * (d.isFirst === false ? 0.20 : 0.37) + Math.max(0, responseMargin) * 0.18,
    d.isFirst === false ? 0.50 : 0.34,
    0.94,
  );
  const neutralization = clamp(
    surfaceTechnique * 0.48 + readiness * 0.16 + Math.max(0, arrival + 0.10) * 0.26
      - (d.threat ?? 0.45) * 0.42 - (compromised ? 0.08 : 0) - (realEmergency ? 0.18 : 0),
    0,
    1,
  );

  return Object.freeze({
    version: SERVE_EXCHANGE_VERSION,
    technique: +surfaceTechnique.toFixed(3),
    anticipation: +anticipation.toFixed(3),
    physicalDemand: +physicalDemand.toFixed(3),
    responseMargin: +responseMargin.toFixed(3),
    reachStress: +reachStress.toFixed(3),
    reactiveReach: +reactiveReach.toFixed(3),
    timingStress: +timingStress.toFixed(3),
    readiness: +readiness.toFixed(3),
    realEmergency,
    compromised,
    jammed,
    posture,
    qualityPenalty: +qualityPenalty.toFixed(3),
    qualityCeiling: +qualityCeiling.toFixed(3),
    neutralization: +neutralization.toFixed(3),
  });
}

export function buildResidualServeAdvantage({ delivery, challenge, returnOutcome, returnPlanFamily, returnQuality = 0.5 } = {}) {
  const weakOutcomes = ['LOW_CENTER_BLOCK', 'SOFT_WIDE_BLOCK', 'SHORT_SITTER', 'FLOATED_RESCUE', 'LOBBED_RETURN'];
  const neutralOutcomes = ['NEUTRAL_BLOCK', 'SKID_CHIP', 'NEUTRAL'];
  const attacking = ['DRIVE_ATTACK', 'DRIVE_NEUTRAL', 'COUNTER_UP', 'COUNTER_STRETCH'].includes(returnPlanFamily);
  const weak = weakOutcomes.includes(returnOutcome);
  const neutral = neutralOutcomes.includes(returnOutcome);
  const score = clamp(
    (delivery?.threat ?? 0.4) * 0.54
      + (challenge?.physicalDemand ?? 0.4) * 0.30
      + (weak ? 0.27 : neutral ? 0.10 : 0)
      + (challenge?.realEmergency ? 0.15 : challenge?.compromised ? 0.08 : 0)
      - (challenge?.neutralization ?? 0) * 0.34
      - returnQuality * 0.13
      - (attacking ? 0.22 : 0),
    0,
    1,
  );
  const physicallyAttackable = weak
    || (!!challenge?.compromised && returnQuality < 0.57)
    || ((challenge?.physicalDemand ?? 0) >= 0.56 && returnQuality < 0.50);
  const level = score >= 0.78 ? 'DOMINANT' : score >= 0.55 ? 'STRONG' : score >= 0.32 ? 'MILD' : 'NEUTRALIZED';
  return Object.freeze({
    version: SERVE_EXCHANGE_VERSION,
    level,
    score: +score.toFixed(3),
    attackableReturn: physicallyAttackable,
    softNeutralReturn: neutral,
    delivery,
    challenge,
    returnOutcome,
    returnPlanFamily,
    returnQuality: +returnQuality.toFixed(3),
  });
}

export function serveFaultChance({ precision = 0.7, power = 0.7, isFirst = true, family, direction, stamina = 1 } = {}) {
  const flatRisk = family === ShotFamily.SERVE_FLAT ? (isFirst ? 0.075 : 0.012) : 0;
  const wideRisk = direction === ShotDirection.WIDE ? (isFirst ? 0.026 : 0.007) : 0;
  const fatigue = Math.max(0, 0.78 - stamina) * (isFirst ? 0.11 : 0.045);
  const chance = isFirst
    ? 0.205 + (1 - precision) * 0.15 + power * 0.035 + flatRisk + wideRisk + fatigue
    : 0.020 + (1 - precision) * 0.065 + power * 0.008 + flatRisk + wideRisk + fatigue;
  return clamp(chance, isFirst ? 0.20 : 0.015, isFirst ? 0.43 : 0.095);
}

/** Versão agregada do mesmo princípio para partidas que não simulam trajetória. */
export function estimateServePointWinProbability({ serve = 0.6, secondServe = 0.6, returnSkill = 0.6, isFirst = true, surfaceServe = 1 } = {}) {
  const surfaceEdge = clamp(surfaceServe - 1, -0.22, 0.25) * (isFirst ? 0.13 : 0.08);
  const probability = isFirst
    ? 0.675 + (serve - 0.60) * 0.25 - (returnSkill - 0.60) * 0.14 + surfaceEdge
    : 0.540 + (secondServe - 0.60) * 0.18 - (returnSkill - 0.60) * 0.105 + surfaceEdge;
  return clamp(probability, isFirst ? 0.48 : 0.38, isFirst ? 0.84 : 0.69);
}

export function estimateFirstServeInProbability({ precision = 0.7, power = 0.7, consistency = 0.7 } = {}) {
  return clamp(0.535 + precision * 0.15 + consistency * 0.055 - power * 0.035, 0.54, 0.72);
}
