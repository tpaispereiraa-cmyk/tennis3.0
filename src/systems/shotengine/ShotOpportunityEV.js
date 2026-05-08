import { clamp } from '../../core/math.js';
import { ShotIntent } from './ShotTypes.js';
import { SHOT_TUNING } from './ShotTuning.js';
import { resolveShotStyle } from './ShotStyle.js';

function rounded(value) {
  return +clamp(value, 0, 1).toFixed(3);
}

function pushReason(reasons, key, value, gate = 0.01) {
  if (Math.abs(value) >= gate) reasons.push(key);
}

export function evaluateShotOpportunityEV(context, quality) {
  const tune = SHOT_TUNING.rallyEV;
  const q = quality?.quality ?? 0.5;
  const bodyState = quality?.bodyState ?? '';
  const style = resolveShotStyle(context);
  const ready = context?.body?.contactReadiness ?? 0;
  const settle = context?.body?.contactSettleTime ?? 0;
  const arrivalMargin = context?.body?.arrivalMargin ?? 0;
  const pressure = context?.player?.ctx?.rallyPressure ?? 0;
  const rally = context?.score?.rally ?? 0;
  const memory = context?.memory ?? {};
  const oppX = Math.abs(context?.opponent?.pos?.x ?? 0);
  const oppY = Math.abs(context?.opponent?.pos?.y ?? 0);
  const playerX = Math.abs(context?.player?.pos?.x ?? 0);
  const ballY = Math.abs(context?.ballState?.pos?.y ?? 0);
  const ballZ = context?.ballState?.z ?? 0.9;

  const lowPickup = bodyState === 'LOW_PICKUP' || ballZ < tune.lowBallZ;
  const late = bodyState === 'LATE' || bodyState === 'STRETCHED' || arrivalMargin < tune.lateArrivalMargin;
  const planted = bodyState === 'PLANTED' || bodyState === 'ON_RISE';
  const prepared = planted || ready >= tune.preparedReadiness || settle >= tune.preparedSettle;
  const cleanContact = prepared && q >= tune.cleanQuality && arrivalMargin >= tune.cleanArrivalMargin && !lowPickup && !late;
  const ballShort = ballY < tune.shortBallY;
  const playerWide = playerX > tune.playerWideX;
  const rivalWide = oppX > tune.rivalWideX;
  const rivalVeryWide = oppX > tune.rivalVeryWideX;
  const rivalDeep = oppY > tune.rivalDeepY;
  const rivalVeryDeep = oppY > tune.rivalVeryDeepY;
  const rivalExposed = rivalWide || rivalDeep;
  const reasons = [];

  const contactEV = clamp(
    q * tune.qualityWeight +
    ready * tune.readinessWeight +
    clamp((arrivalMargin + 0.12) / 0.24, 0, 1) * tune.arrivalWeight +
    (prepared ? tune.preparedBonus : 0) +
    (late ? -tune.latePenalty : 0) +
    (lowPickup ? -tune.lowPickupPenalty : 0),
    0,
    1,
  );

  const exposureEV = clamp(
    (rivalWide ? tune.rivalWideBonus : 0) +
    (rivalVeryWide ? tune.rivalVeryWideBonus : 0) +
    (rivalDeep ? tune.rivalDeepBonus : 0) +
    (rivalVeryDeep ? tune.rivalVeryDeepBonus : 0) +
    (ballShort ? tune.shortBallBonus : 0),
    0,
    1,
  );

  const rallyEV = clamp(rally / tune.longRallyAt, 0, 1);
  const antiLoopEV = clamp(
    (memory?.sliceLoop ?? 0) * tune.sliceLoopPressure +
    (memory?.softLoop ?? 0) * tune.softLoopPressure +
    ((memory?.rallyPlan === 'CHANGE_PATTERN' || memory?.rallyPlan === 'CASH_IN') ? tune.memoryPlanBonus : 0),
    0,
    1,
  );

  const styleEV = clamp(
    (style.earlyStrike ? tune.earlyStyleBonus : 0) +
    (style.needsAdvantage ? -tune.grinderStylePenalty : 0) +
    style.flatBias * tune.styleBiasWeight +
    style.topspinBias * tune.styleBiasWeight +
    style.dropBias * tune.styleBiasWeight,
    0,
    1,
  );

  const safetyEV = clamp(
    contactEV -
    pressure * tune.pressureSafetyPenalty -
    (playerWide ? tune.playerWideSafetyPenalty : 0) +
    style.safetyBias,
    0,
    1,
  );
  const pressureEV = clamp(
    safetyEV * tune.safetyToPressure +
    exposureEV * tune.exposureToPressure +
    rallyEV * tune.rallyPressureBonus +
    antiLoopEV * tune.variationPressureBonus +
    styleEV * tune.stylePressureBonus -
    pressure * tune.pressureAttackPenalty,
    0,
    1,
  );
  const finishEV = clamp(
    safetyEV * tune.safetyToFinish +
    exposureEV * tune.exposureToFinish +
    (ballShort ? tune.shortToFinish : 0) +
    (style.earlyStrike ? tune.earlyFinishBonus : 0) +
    rallyEV * tune.rallyFinishBonus -
    pressure * tune.pressureFinishPenalty -
    (style.needsAdvantage && !rivalExposed && !ballShort ? tune.grinderFinishPenalty : 0),
    0,
    1,
  );
  const defenseEV = clamp(
    (1 - safetyEV) * tune.unsafeToDefense +
    pressure * tune.pressureToDefense +
    (late ? tune.lateDefenseBonus : 0) +
    (lowPickup ? tune.lowDefenseBonus : 0) +
    (playerWide ? tune.wideDefenseBonus : 0),
    0,
    1,
  );
  const variationEV = clamp(antiLoopEV + rallyEV * tune.longRallyVariation + (memory?.directionStreak?.count ?? 0) * tune.directionLoopPressure, 0, 1);

  let recommendedIntent = ShotIntent.BUILD;
  if (defenseEV >= tune.defendThreshold || q < tune.desperateQuality || pressure > tune.desperatePressure) recommendedIntent = ShotIntent.DEFEND;
  else if (safetyEV < tune.resetSafetyThreshold) recommendedIntent = ShotIntent.RESET;
  else if (finishEV >= tune.finishThreshold && safetyEV >= tune.attackSafetyThreshold) recommendedIntent = ShotIntent.FINISH;
  else if (pressureEV >= tune.pressureThreshold && safetyEV >= tune.attackSafetyThreshold) recommendedIntent = ShotIntent.PRESSURE;
  else if (variationEV >= tune.controlVariationThreshold && safetyEV >= tune.controlSafetyThreshold) recommendedIntent = ShotIntent.BUILD;
  else recommendedIntent = ShotIntent.BUILD;

  pushReason(reasons, 'prepared', prepared ? 1 : 0);
  pushReason(reasons, 'cleanContact', cleanContact ? 1 : 0);
  pushReason(reasons, 'lowBall', lowPickup ? 1 : 0);
  pushReason(reasons, 'late', late ? 1 : 0);
  pushReason(reasons, 'rivalWide', rivalWide ? 1 : 0);
  pushReason(reasons, 'rivalDeep', rivalDeep ? 1 : 0);
  pushReason(reasons, 'shortBall', ballShort ? 1 : 0);
  pushReason(reasons, 'antiLoop', antiLoopEV);
  pushReason(reasons, `style:${style.archetype}`, styleEV);

  const confidence = clamp(
    Math.max(safetyEV, pressureEV, finishEV, defenseEV) * 0.72 +
    Math.abs(finishEV - pressureEV) * 0.14 +
    Math.abs(safetyEV - defenseEV) * 0.14,
    0,
    1,
  );

  return Object.freeze({
    safetyEV: rounded(safetyEV),
    pressureEV: rounded(pressureEV),
    finishEV: rounded(finishEV),
    defenseEV: rounded(defenseEV),
    variationEV: rounded(variationEV),
    styleEV: rounded(styleEV),
    contactEV: rounded(contactEV),
    exposureEV: rounded(exposureEV),
    recommendedIntent,
    confidence: rounded(confidence),
    reasons: Object.freeze(reasons),
    styleSubType: style.archetype,
    style,
    flags: Object.freeze({
      prepared,
      cleanContact,
      lowPickup,
      late,
      ballShort,
      playerWide,
      rivalWide,
      rivalDeep,
      rivalExposed,
    }),
  });
}
