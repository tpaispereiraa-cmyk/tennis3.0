import { clamp } from '../../core/math.js';
import { BodyState } from './ShotTypes.js';
import { SHOT_TUNING } from './ShotTuning.js';

function score01(value) {
  return clamp(value, 0, 1);
}

export function classifyBodyState(context) {
  const body = context?.body ?? {};
  const ball = context?.ballState ?? {};
  const reach = Math.max(body.reach ?? 0.85, 0.1);
  const baseReach = Math.max(body.baseReach ?? reach, 0.1);
  const reachRatio = (body.distanceToBall ?? 0) / reach;
  const arrivalMargin = body.arrivalMargin ?? 0;
  const z = ball.z ?? 0;
  const preferredZ = body.preferredContactZ ?? 0.9;
  const readiness = body.contactReadiness ?? 0;
  const settleTime = body.contactSettleTime ?? 0;
  const commitDistance = body.commitDistance ?? body.distanceToBall ?? 99;
  const idealContactRadius = baseReach * 0.86;
  const positionError = Number.isFinite(body.contactPositionError)
    ? body.contactPositionError
    : Math.abs(commitDistance - idealContactRadius);
  const contactClass = body.contactClass ?? null;
  const emergencyReach = body.emergencyReachActive
    || contactClass === 'EMERGENCY_REACH'
    || contactClass === 'CHASE';
  const severeReach = contactClass === 'CHASE'
    || reachRatio > 1.06
    || (body.distanceToBall ?? 0) > (body.normalContactReach ?? baseReach * 1.14) * 1.12;
  const localBounceContact = contactClass === 'LOCAL_BOUNCE_HIT';
  const positionReady = positionError <= reach * 0.46;
  const isPrepared = body.canContact
    && readiness >= 0.52
    && positionReady
    && arrivalMargin > -0.12
    && !emergencyReach;
  const isSettled = isPrepared && (settleTime >= 0.04 || readiness >= 0.72);

  if (body.contactClass === 'AERIAL_INTERCEPT' || body.contactClass === 'OVERHEAD' || body.atNet && (ball.bounceCount ?? 0) === 0) return BodyState.AERIAL;
  // LATE é atraso temporal real; STRETCHED é uso do alcance de recuperação.
  // A distância entre o centro do jogador e a bola, sozinha, não prova nenhum
  // dos dois estados: um contato normal acontece dentro do raio da raquete.
  if (arrivalMargin < -0.24 && (!body.canContact || readiness < 0.40 || emergencyReach)) return BodyState.LATE;
  if (emergencyReach && (
    severeReach
    || (readiness < 0.22 && !positionReady)
    || (arrivalMargin < -0.18 && readiness < 0.42)
  )) return BodyState.STRETCHED;
  if (!body.canContact && reachRatio > 1.08) return BodyState.STRETCHED;
  // Uma bola logo acima da fita não é necessariamente um "pick-up" de
  // sobrevivência. O limite anterior classificava contatos normais de rally
  // como baixos cedo demais e alimentava uma cadeia artificial de slices.
  if (z < Math.max(0.34, preferredZ - 0.50)) return BodyState.LOW_PICKUP;
  if (Math.abs(z - preferredZ) > 0.62 && z > preferredZ) return BodyState.FALLING_BACK;
  if (body.strokePreparation?.jammed
    || Math.abs((ball.pos?.x ?? 0) - (body.playerPos?.x ?? 0)) < 0.16 && reachRatio < 0.48) return BodyState.JAMMED;
  if (isSettled) return (ball.vz ?? 0) > 0.45 ? BodyState.ON_RISE : BodyState.PLANTED;
  if ((ball.vz ?? 0) > 0.45 && arrivalMargin > -0.10 && (positionReady || localBounceContact)) return BodyState.ON_RISE;
  if (body.canContact && readiness >= 0.42 && positionReady && arrivalMargin > -0.10) return BodyState.PLANTED;
  if (isPrepared) return BodyState.PLANTED;
  return BodyState.MOVING;
}

export function evaluateShotQuality(context) {
  const caps = context?.capabilities ?? {};
  const body = context?.body ?? {};
  const ball = context?.ballState ?? {};
  const reach = Math.max(body.reach ?? 0.85, 0.1);
  const baseReach = Math.max(body.baseReach ?? reach, 0.1);
  const distance = body.distanceToBall ?? 0;
  const idealContactRadius = baseReach * 0.86;
  const positionError = Number.isFinite(body.contactPositionError)
    ? body.contactPositionError
    : Math.abs((body.commitDistance ?? distance) - idealContactRadius);
  const arrivalMargin = body.arrivalMargin ?? 0;
  const preferredZ = body.preferredContactZ ?? 0.9;
  const z = ball.z ?? preferredZ;
  const heightScore = score01(1 - Math.abs(z - preferredZ) / 1.05);
  const reachScore = score01(1 - positionError / Math.max(reach * 0.92, 0.1));
  const readiness = score01(body.contactReadiness ?? 0);
  const settleScore = score01((body.contactSettleTime ?? 0) / 0.16);
  const frameTimingScore = score01(0.72 + arrivalMargin * 1.35);
  const timingScore = score01(frameTimingScore * (1 - readiness * 0.42) + readiness * 0.42 + settleScore * 0.08);
  const staminaScore = score01(body.stamina ?? 1);
  const matchConfidence = score01(caps.matchConfidence ?? 0.5);
  const rallyPressure = score01(context?.player?.ctx?.rallyPressure ?? 0);
  // Confiança só tem efeito material quando a bola cobra execução. Em bola
  // limpa a diferença é quase invisível; sob pressão ela separa quem sustenta
  // a mecânica de quem encurta o braço.
  const confidenceExecution = (matchConfidence - 0.5) * (0.045 + rallyPressure * 0.045);
  const movementSupport = score01((caps.movement ?? 0.6) * 0.55 + (caps.explosiveness ?? 0.6) * 0.25 + staminaScore * 0.20);
  // Controle de ala, leitura e visão não devem ser só um número bonito na
  // ficha: eles sustentam o ponto de contato e a escolha da bola quando a
  // troca aperta. O efeito em bola fácil é discreto; em pressão, decisivo.
  const technicalExecution = score01(
    (caps.wingControl ?? 0.6) * 0.46
    + (caps.reading ?? 0.6) * 0.24
    + (caps.tacticalVision ?? 0.6) * 0.18
    + (caps.consistency ?? 0.65) * 0.12,
  );
  const technicalPressureLift = (technicalExecution - 0.55) * (0.025 + rallyPressure * 0.075);
  const canContactPenalty = body.canContact ? 0 : 0.24;
  const bodyState = classifyBodyState(context);
  const defensiveContact = body.defensiveContact ?? {};
  const defensiveSituation = defensiveContact.active
    || ['LOW_PICKUP', 'FALLING_BACK', 'LATE', 'STRETCHED'].includes(bodyState)
    || arrivalMargin < -0.07;
  // Defesa só salva qualidade em contatos de recuperação. Ela não infla uma
  // bola limpa, mas faz um defensor de elite devolver uma bola difícil com forma.
  const defenseRescue = defensiveSituation
    ? score01(caps.defense ?? defensiveContact.defense ?? 0.6)
      * (bodyState === BodyState.STRETCHED || bodyState === BodyState.LATE ? 0.14 : 0.09)
    : 0;
  const strokeMechanics = body.strokePreparation ?? null;
  // Esta parcela faz a escolha tática enxergar o corpo antes de pedir uma
  // aceleração. É deliberadamente menor que o efeito na execução: qualidade
  // de contato e mecânica não são a mesma coisa.
  const mechanicalDecisionPenalty = strokeMechanics?.active
    ? Math.max(0, 0.58 - (strokeMechanics.mechanicalIntegrity ?? 0.58)) * 0.16
      + (strokeMechanics.switchSeverity ?? 0) * 0.07
    : 0;

  const statePenalty = {
    [BodyState.PLANTED]: 0,
    [BodyState.MOVING]: 0.03,
    [BodyState.ON_RISE]: 0.02,
    [BodyState.AERIAL]: 0.05,
    [BodyState.LOW_PICKUP]: 0.08,
    [BodyState.JAMMED]: 0.10,
    [BodyState.FALLING_BACK]: 0.12,
    [BodyState.LATE]: 0.15,
    [BodyState.STRETCHED]: 0.18,
  }[bodyState] ?? 0.10;

  const raw = reachScore * 0.23
    + timingScore * 0.23
    + heightScore * 0.19
    + movementSupport * 0.14
    + (caps.errorResistance ?? 0.6) * 0.08
    + technicalExecution * 0.08
    + (body.canContact ? 0.15 : 0)
    + readiness * 0.06
    + confidenceExecution
    + technicalPressureLift
    + defenseRescue
    + (caps.talent?.difficultContactBonus ?? 0)
    - statePenalty
    - canContactPenalty
    - mechanicalDecisionPenalty;

  const contactFloor = body.canContact
    ? bodyState === BodyState.STRETCHED || bodyState === BodyState.LATE
      ? 0.36 + technicalExecution * 0.06
      : readiness >= 0.72 && bodyState !== BodyState.LOW_PICKUP
        ? 0.47 + technicalExecution * 0.14
        : 0.44 + technicalExecution * 0.12
    : 0;
  const baseQuality = Math.max(raw, contactFloor);
  const quality = score01(baseQuality * (SHOT_TUNING.quality?.globalMultiplier ?? 1));
  const pressureTolerance = score01((caps.mentality ?? 0.6) * 0.45 + (caps.consistency ?? 0.7) * 0.30 + (caps.reading ?? 0.6) * 0.25);

  return Object.freeze({
    quality,
    bodyState,
    canContact: !!body.canContact,
    scores: Object.freeze({
      reach: reachScore,
      timing: timingScore,
      frameTiming: frameTimingScore,
      readiness,
      settle: settleScore,
      height: heightScore,
      movement: movementSupport,
      stamina: staminaScore,
      matchConfidence,
      confidenceExecution,
      pressureTolerance,
      defenseRescue,
      technicalExecution,
      technicalPressureLift,
      baseQuality,
    }),
    penalties: Object.freeze({
      state: statePenalty,
      canContact: canContactPenalty,
    }),
  });
}

export function qualityBand(quality) {
  if (quality >= 0.82) return 'ELITE';
  if (quality >= 0.68) return 'GOOD';
  if (quality >= 0.52) return 'PLAYABLE';
  if (quality >= 0.36) return 'POOR';
  return 'DESPERATE';
}
