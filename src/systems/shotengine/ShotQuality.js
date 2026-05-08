import { clamp } from '../../core/math.js';
import { BodyState } from './ShotTypes.js';

function score01(value) {
  return clamp(value, 0, 1);
}

export function classifyBodyState(context) {
  const body = context?.body ?? {};
  const ball = context?.ballState ?? {};
  const reach = Math.max(body.reach ?? 0.85, 0.1);
  const reachRatio = (body.distanceToBall ?? 0) / reach;
  const arrivalMargin = body.arrivalMargin ?? 0;
  const z = ball.z ?? 0;
  const preferredZ = body.preferredContactZ ?? 0.9;
  const readiness = body.contactReadiness ?? 0;
  const settleTime = body.contactSettleTime ?? 0;
  const commitDistance = body.commitDistance ?? body.distanceToBall ?? 99;
  const commitRatio = commitDistance / reach;
  const isPrepared = body.canContact
    && readiness >= 0.68
    && commitRatio <= 0.92
    && arrivalMargin > -0.10;
  const isSettled = isPrepared && (settleTime >= 0.045 || readiness >= 0.78);
  const realChase = readiness < 0.48 && commitRatio > 1.05;

  if (body.contactClass === 'AERIAL_INTERCEPT' || body.atNet && (ball.bounceCount ?? 0) === 0) return BodyState.AERIAL;
  if (!isPrepared && arrivalMargin < -0.24 && (reachRatio > 1.15 || commitRatio > 1.05)) return BodyState.LATE;
  if (!isPrepared && (reachRatio > 1.58 || commitRatio > 1.34)) return BodyState.STRETCHED;
  if (z < Math.max(0.38, preferredZ - 0.42)) return BodyState.LOW_PICKUP;
  if (Math.abs(z - preferredZ) > 0.62 && z > preferredZ) return BodyState.FALLING_BACK;
  if (Math.abs((ball.pos?.x ?? 0) - (body.playerPos?.x ?? 0)) < 0.16 && reachRatio < 0.48) return BodyState.JAMMED;
  if (isSettled) return (ball.vz ?? 0) > 0.45 ? BodyState.ON_RISE : BodyState.PLANTED;
  if ((ball.vz ?? 0) > 0.45 && arrivalMargin > -0.08) return BodyState.ON_RISE;
  if ((reachRatio < 0.96 || commitRatio < 0.92) && arrivalMargin > -0.06) return BodyState.PLANTED;
  if (isPrepared && !realChase) return BodyState.PLANTED;
  return BodyState.MOVING;
}

export function evaluateShotQuality(context) {
  const caps = context?.capabilities ?? {};
  const body = context?.body ?? {};
  const ball = context?.ballState ?? {};
  const reach = Math.max(body.reach ?? 0.85, 0.1);
  const distance = body.distanceToBall ?? 0;
  const reachRatio = distance / reach;
  const arrivalMargin = body.arrivalMargin ?? 0;
  const preferredZ = body.preferredContactZ ?? 0.9;
  const z = ball.z ?? preferredZ;
  const heightScore = score01(1 - Math.abs(z - preferredZ) / 1.05);
  const reachScore = score01(1 - Math.max(0, reachRatio - 0.66) / 1.48);
  const readiness = score01(body.contactReadiness ?? 0);
  const settleScore = score01((body.contactSettleTime ?? 0) / 0.16);
  const frameTimingScore = score01(0.72 + arrivalMargin * 1.35);
  const timingScore = score01(frameTimingScore * (1 - readiness * 0.42) + readiness * 0.42 + settleScore * 0.08);
  const staminaScore = score01(body.stamina ?? 1);
  const movementSupport = score01((caps.movement ?? 0.6) * 0.55 + (caps.explosiveness ?? 0.6) * 0.25 + staminaScore * 0.20);
  const canContactPenalty = body.canContact ? 0 : 0.24;
  const bodyState = classifyBodyState(context);

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
    + (caps.errorResistance ?? 0.6) * 0.12
    + (body.canContact ? 0.15 : 0)
    + readiness * 0.06
    - statePenalty
    - canContactPenalty;

  const contactFloor = body.canContact
    ? bodyState === BodyState.STRETCHED || bodyState === BodyState.LATE
      ? 0.40
      : readiness >= 0.72 && bodyState !== BodyState.LOW_PICKUP
        ? 0.60
        : 0.56
    : 0;
  const quality = score01(Math.max(raw, contactFloor));
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
      pressureTolerance,
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
