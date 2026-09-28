import { clamp, rand } from '../../core/math.js';
import { ShotDirection, ShotFamily, ShotIntent } from './ShotTypes.js';
import { SHOT_TUNING } from './ShotTuning.js';
import { SliceProfile } from './SliceProfiles.js';

function directionRisk(direction) {
  if (direction === ShotDirection.DTL) return 0.18;
  if (direction === ShotDirection.WIDE || direction === ShotDirection.INSIDE_IN) return 0.14;
  if (direction === ShotDirection.CROSS) return -0.05;
  if (direction === ShotDirection.CENTER || direction === ShotDirection.BODY) return -0.10;
  return 0;
}

function bodyExecutionStress(bodyState, context) {
  const ready = clamp(context?.body?.contactReadiness ?? 0, 0, 1);
  const arrival = context?.body?.arrivalMargin ?? 0;
  const positionError = Math.max(0, context?.body?.contactPositionError ?? 0);
  const reach = Math.max(0.1, context?.body?.reach ?? 0.9);
  const state = {
    PLANTED: 0,
    ON_RISE: 0.012,
    MOVING: 0.025,
    AERIAL: 0.045,
    JAMMED: 0.075,
    LOW_PICKUP: 0.085,
    FALLING_BACK: 0.105,
    STRETCHED: 0.13,
    LATE: 0.15,
  }[bodyState] ?? 0.04;
  const readinessStress = Math.max(0, 0.48 - ready) * 0.16;
  const timingStress = Math.max(0, -arrival - 0.04) * 0.30;
  const reachStress = Math.max(0, positionError / reach - 0.34) * 0.10;
  const mechanics = context?.body?.strokePreparation ?? null;
  // Integridade baixa entra uma vez como instabilidade mecânica. O contato e a
  // execução já cobram timing/alcance, então esta parcela é pequena e focada
  // na troca tardia de ala e na perda real de liberdade direcional.
  const mechanicalStress = mechanics?.active
    ? Math.max(0, 0.60 - (mechanics.mechanicalIntegrity ?? 0.60)) * 0.11
      + (mechanics.switchSeverity ?? 0) * 0.055
      + Math.max(0, 0.45 - (mechanics.directionFreedom ?? 0.45)) * 0.07
    : 0;
  return clamp(state + readinessStress + timingStress + reachStress + mechanicalStress, 0, 0.30);
}

function gaussian() {
  const u1 = Math.max(1e-9, rand(0, 1));
  const u2 = Math.max(1e-9, rand(0, 1));
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function directionalErrorBias({ execution, decision, pressure, q }) {
  const r = SHOT_TUNING.realism.error;
  const family = decision?.family ?? null;
  const intent = decision?.intent ?? null;
  const direction = decision?.direction ?? null;
  const xSign = Math.sign(execution.targetX || rand(-1, 1) || 1);
  const ySign = Math.sign(execution.targetY || 1);
  let lateral = 0;
  let depth = 0;
  let net = 0;

  if (direction === ShotDirection.DTL) lateral += xSign * pressure * r.dtlWideBias;
  if (direction === ShotDirection.WIDE || Math.abs(execution.targetX ?? 0) > 2.85) lateral += xSign * pressure * r.wideTargetWideBias;
  if (family === ShotFamily.FLAT_DRIVE) {
    depth += ySign * pressure * r.flatLongBias;
    net -= Math.max(0, pressure - 0.36) * 0.16;
  }
  if (family === ShotFamily.TOPSPIN) depth -= ySign * Math.max(0, 0.66 - q) * r.topspinShortBias;
  if (family === ShotFamily.SLICE || family === ShotFamily.CHIP_RETURN) {
    const profileVariance = decision?.sliceProfile === SliceProfile.DEEP_DRIVE ? 0.46
      : decision?.sliceProfile === SliceProfile.SKIDDING_RESET ? 0.64
        : decision?.sliceProfile === SliceProfile.CHIP_APPROACH ? 0.55
          : 1;
    depth += ySign * gaussian() * pressure * r.sliceDepthChaos * profileVariance;
  }
  if (family === ShotFamily.DROP) depth += ySign * gaussian() * pressure * r.dropDepthChaos;
  if (intent === ShotIntent.DEFEND || intent === ShotIntent.RESET) depth -= ySign * pressure * r.defendShortBias;

  return { lateral, depth, net };
}

export function estimateErrorPressure({ context, quality, decision, shotDef }) {
  const caps = context?.capabilities ?? {};
  const q = quality?.quality ?? 0.5;
  const executionProfile = quality?.executionProfile ?? null;
  const executionQuality = executionProfile?.executionQuality ?? q;
  const intentFit = executionProfile?.intentFit ?? 0.5;
  const intentDemand = executionProfile?.intentDemand ?? 0.52;
  const tune = SHOT_TUNING.errors;
  const family = decision?.family ?? null;
  const ballY = Math.abs(context?.ballState?.pos?.y ?? 0);
  const playerY = Math.abs(context?.player?.pos?.y ?? 0);
  const oppY = Math.abs(context?.opponent?.pos?.y ?? 0);
  const ready = context?.body?.contactReadiness ?? 0;
  const arrival = context?.body?.arrivalMargin ?? 0;
  const bodyState = quality?.bodyState ?? '';
  const courtMods = context?.gs?.courtMods ?? {};
  const courtWinnerMod = clamp(courtMods?.winnerMod ?? 1, 0.55, 1.40);
  const courtUERiskMod = clamp(courtMods?.ueRiskMod ?? 1, 0.75, 1.30);
  const base = shotDef?.baseRisk ?? 0.4;
  const defensiveSituation = ['LOW_PICKUP', 'FALLING_BACK', 'LATE', 'STRETCHED'].includes(bodyState)
    || (context?.body?.arrivalMargin ?? 0) < -0.07
    || !!context?.body?.defensiveContact?.active;
  const defenseRelief = defensiveSituation
    ? (caps.defense ?? 0.6) * (bodyState === 'LATE' || bodyState === 'STRETCHED' ? 0.16 : 0.10)
    : 0;
  const attrRelief = (caps.errorResistance ?? 0.6) * (tune.attrErrorRelief * 0.72) + (caps.spinSecurity ?? 0.55) * (tune.spinSecurityRelief * 0.68) + (caps.talent?.errorRelief ?? 0);
  const technicalControl = clamp(
    (caps.wingControl ?? 0.6) * 0.52
    + (caps.reading ?? 0.6) * 0.25
    + (caps.tacticalVision ?? 0.6) * 0.13
    + (caps.consistency ?? 0.65) * 0.10,
    0,
    1,
  );
  // Contact quality and execution quality are different signals. Contact says
  // whether the athlete reached the ball; execution says whether his technique
  // can deliver the selected intention. Each enters once, avoiding the old
  // quality -> pressure -> miss double punishment.
  const contactPenalty = (1 - q) * 0.22;
  const executionPenalty = (1 - executionQuality) * 0.25;
  const bodyPenalty = bodyExecutionStress(bodyState, context);
  const finishMargin = decision?.intent === ShotIntent.FINISH && decision?.finishMode === 'margin';
  const attackingIntent = decision?.intent === ShotIntent.FINISH || decision?.intent === ShotIntent.PRESSURE || decision?.intent === ShotIntent.REDIRECT;
  // Pancada continua sendo arma, mas tentar acelerar sem o mesmo nível de
  // controle cobra uma margem pequena. O jogador completo ganha segurança
  // para acelerar limpo, em vez de receber potência extra artificial.
  const powerControlGap = Math.max(0, (caps.wingPower ?? 0.6) - (caps.wingControl ?? 0.6));
  const attackTechniqueRelief = attackingIntent ? Math.max(0, technicalControl - 0.60) * 0.075 : 0;
  const overhitPenalty = attackingIntent ? powerControlGap * 0.085 : 0;
  const hiddenDropSpecialist = context?.player?.naturalSignature === 'DROP_HIDDEN'
    || context?.player?.signatureShot === 'DROP_HIDDEN';
  const opponentDeepForDrop = decision?.opportunityEV?.flags?.rivalDeep || oppY > 8.80;
  const standardLowPickup = bodyState === 'LOW_PICKUP'
    && q >= 0.65
    && arrival >= -0.04;
  const standardDropWindow = family === ShotFamily.DROP
    && opponentDeepForDrop
    && ((q >= 0.64 && arrival >= -0.06
      && !['LOW_PICKUP', 'STRETCHED', 'LATE', 'FALLING_BACK'].includes(bodyState))
      || standardLowPickup);
  const signatureDropWindow = family === ShotFamily.DROP
    && hiddenDropSpecialist
    && q >= 0.70
    && !['STRETCHED', 'LATE', 'FALLING_BACK'].includes(bodyState);
  const dropWindow = standardDropWindow || signatureDropWindow;
  const badDropPenalty = family === ShotFamily.DROP
    ? (dropWindow ? 0.08 : 0.30)
      + (playerY > 11.45 ? 0.18 : 0)
      + (ready < 0.44 ? 0.14 : 0)
      + (arrival < -0.055 ? 0.12 : 0)
      + (bodyState === 'LOW_PICKUP' || bodyState === 'STRETCHED' || bodyState === 'LATE' ? 0.18 : 0)
    : 0;
  const surfaceAdaptationRelief = (caps.courtAdaptability ?? 0) * 0.055;
  // winnerMod não injeta potência artificial: altera a largura da janela de
  // execução ofensiva. ueRiskMod vale para todo golpe, mas pesa mais quando
  // o atleta escolhe forçar a bola.
  const surfaceRisk = (courtUERiskMod - 1) * (attackingIntent ? 0.13 : 0.055)
    - (courtWinnerMod - 1) * (attackingIntent ? 0.12 : 0.02);
  const servePlusOneRelief = (context?.score?.rally ?? 0) <= 1
    && context?.serveAdvantage?.beneficiaryId === context?.player?.id
    ? clamp((context.serveAdvantage?.score ?? 0) * 0.075 + (context.serveAdvantage?.attackableReturn ? 0.045 : 0), 0, 0.11)
    : 0;
  const intentExposure = intentDemand * (0.055 + (1 - intentFit) * 0.13);
  const risk = base * 0.22
    + contactPenalty
    + executionPenalty
    + bodyPenalty
    + directionRisk(decision?.direction) * 0.42
    + (finishMargin ? intentExposure * 0.82 : intentExposure)
    + badDropPenalty
    + surfaceRisk
    + overhitPenalty
    - attrRelief * 0.62
    - attackTechniqueRelief
    - defenseRelief
    - surfaceAdaptationRelief
    - servePlusOneRelief;
  const resolvedRisk = clamp(finishMargin ? risk - 0.035 : risk, tune.minRisk, tune.maxRisk);
  const protectedPlusOne = (context?.score?.rally ?? 0) <= 1
    && context?.serveAdvantage?.beneficiaryId === context?.player?.id
    && context?.serveAdvantage?.attackableReturn;
  // O +1 ainda pode errar, sobretudo com técnica frágil, mas uma devolução
  // curta e sem peso não pode carregar o mesmo caos de uma bola neutra de rally.
  const stabilizedSecondServeReturn = !!decision?.returnPlanFamily
    && context?.gs?._pendingServeData?.isFirst === false
    && q >= 0.40
    && bodyState !== 'STRETCHED'
    && bodyState !== 'LATE';
  if (protectedPlusOne) return Math.min(resolvedRisk, 0.12);
  if (stabilizedSecondServeReturn) return Math.min(resolvedRisk, 0.27);
  return resolvedRisk;
}

export function degradeExecution({ execution, context, quality, decision, shotDef }) {
  const executionProfile = execution?.executionProfile ?? quality?.executionProfile ?? null;
  const qualityWithExecution = executionProfile ? { ...quality, executionProfile } : quality;
  const pressure = estimateErrorPressure({ context, quality: qualityWithExecution, decision, shotDef });
  const caps = context?.capabilities ?? {};
  const tune = SHOT_TUNING.errors;
  const realism = SHOT_TUNING.realism.error;
  const control = caps?.errorResistance ?? 0.6;
  const technicalControl = clamp(
    (caps.wingControl ?? 0.6) * 0.60
    + (caps.reading ?? 0.6) * 0.25
    + (caps.tacticalVision ?? 0.6) * 0.15,
    0,
    1,
  );
  const technicalDispersionRelief = Math.max(0, technicalControl - 0.55) * 0.18;
  const dispersion = clamp(
    pressure * (tune.dispersionBase - control * tune.dispersionControlRelief) * (1 - technicalDispersionRelief),
    tune.minDispersion,
    tune.maxDispersion,
  );
  const lateralNoise = gaussian() * dispersion * tune.lateralNoise * realism.normalNoiseMult;
  const depthNoise = gaussian() * dispersion * tune.depthNoise * realism.normalNoiseMult;
  const netNoise = gaussian() * dispersion * tune.netNoise * realism.normalNoiseMult;
  const paceNoise = gaussian() * dispersion * tune.paceNoise * 0.58;
  const q = quality?.quality ?? 0.5;
  const executionQuality = executionProfile?.executionQuality ?? q;
  const executionMode = execution?.executionMode ?? executionProfile?.executionMode ?? 'FULL';
  const highIntent = decision?.intent === ShotIntent.FINISH || decision?.intent === ShotIntent.PRESSURE || decision?.intent === ShotIntent.REDIRECT;
  const finishMargin = decision?.intent === ShotIntent.FINISH && decision?.finishMode === 'margin';
  const isDrop = decision?.family === ShotFamily.DROP;
  const defensiveIntent = decision?.intent === ShotIntent.DEFEND || decision?.intent === ShotIntent.RESET || decision?.intent === ShotIntent.CONTROL;
  const survivalContact = executionMode === 'SURVIVAL';
  const missChance = clamp(
    (pressure - (defensiveIntent ? 0.31 : 0.27)) * (defensiveIntent ? 0.46 : finishMargin ? 0.58 : 0.72)
      + (highIntent ? (finishMargin ? 0.025 : 0.055) : 0)
      + (executionQuality < 0.50 ? (defensiveIntent ? 0.015 : 0.045) : 0)
      + (survivalContact && highIntent ? 0.045 : 0)
      + (isDrop ? 0.045 + Math.max(0, pressure - 0.36) * 0.18 : 0),
    isDrop ? 0.045 : 0.008,
    isDrop ? 0.48 : defensiveIntent ? 0.25 : finishMargin ? 0.24 : 0.40,
  );
  const returnOutcome = decision?.returnOutcome ?? null;
  const isReturn = !!decision?.returnPlanFamily;
  const poorReturnOutcome = ['LOW_CENTER_BLOCK', 'SOFT_WIDE_BLOCK', 'SHORT_SITTER', 'FLOATED_RESCUE', 'LOBBED_RETURN'].includes(returnOutcome);
  const forcedReturnMiss = returnOutcome === 'RETURN_NET' || returnOutcome === 'RETURN_LONG' || returnOutcome === 'RETURN_WIDE';
  const lowReturnPowerFloor = returnOutcome === 'FLOATED_RESCUE' || returnOutcome === 'LOBBED_RETURN'
    ? tune.degradedMinPower
    : returnOutcome === 'SHORT_SITTER'
      ? Math.max(tune.degradedMinPower, 15.2)
      : returnOutcome === 'LOW_CENTER_BLOCK' || returnOutcome === 'SOFT_WIDE_BLOCK'
        ? Math.max(tune.degradedMinPower, 17.2)
      : isReturn
        ? Math.max(tune.degradedMinPower, decision?.returnPlanFamily?.startsWith('CHIP') ? 18.2 : 19.2)
        : tune.degradedMinPower;
  const missRoll = rand(0, 1);
  let forcedLateral = 0;
  let forcedDepth = 0;
  let forcedNet = 0;
  let forcedErrorKind = null;
  if (forcedReturnMiss || missRoll < missChance) {
    const missKind = forcedReturnMiss
      ? (returnOutcome === 'RETURN_NET' ? 0.10 : returnOutcome === 'RETURN_LONG' ? 0.58 : 0.90)
      : rand(0, 1);
    const netCut = isDrop ? 0.52 : 0.34;
    const longCut = isDrop ? 0.80 : 0.72;
    if (missKind < netCut) {
      forcedNet = forcedReturnMiss ? -1.05 - pressure * 0.42 : finishMargin ? -0.42 - pressure * 0.35 : -0.95 - pressure * 0.82;
      forcedErrorKind = 'NET';
    } else if (missKind < longCut) {
      forcedDepth = (forcedReturnMiss ? 2.80 + pressure * 2.20 : isDrop ? 1.10 + pressure * 2.10 : finishMargin ? 0.95 + pressure * 1.60 : 2.10 + pressure * 3.60) * Math.sign(execution.targetY || 1);
      forcedErrorKind = 'LONG';
    } else {
      forcedLateral = (forcedReturnMiss ? 2.15 + pressure * 2.00 : finishMargin ? 0.75 + pressure * 1.35 : 1.55 + pressure * 2.60) * Math.sign(execution.targetX || rand(-1, 1) || 1);
      forcedErrorKind = 'WIDE';
    }
  }
  const directional = directionalErrorBias({ execution, decision, pressure, q });
  const survivalDepthLoss = survivalContact && defensiveIntent
    ? -Math.sign(execution.targetY || 1) * (0.38 + pressure * 0.62)
    : 0;
  const shapedAttackDepth = executionMode === 'SHAPED' && highIntent
    ? -Math.sign(execution.targetY || 1) * 0.12
    : 0;
  const organicLateral = lateralNoise + directional.lateral * realism.lateralIntentWeight;
  const organicDepth = depthNoise * Math.sign(execution.targetY || 1)
    + directional.depth * realism.depthIntentWeight
    + survivalDepthLoss
    + shapedAttackDepth;
  const managedNetLift = survivalContact && defensiveIntent ? 0.12 : executionMode === 'SHAPED' ? 0.035 : 0;
  const modePacePenalty = survivalContact
    ? (defensiveIntent ? 2.4 : 1.3)
    : executionMode === 'SHAPED'
      ? 0.45
      : 0;

  return Object.freeze({
    ...execution,
    targetX: execution.targetX + organicLateral + forcedLateral,
    targetY: execution.targetY + organicDepth + forcedDepth,
    netClearance: clamp(
      execution.netClearance + managedNetLift + netNoise + directional.net + forcedNet - Math.max(0, pressure - tune.highRiskNetPenaltyStart) * (finishMargin ? tune.highRiskNetPenalty * 0.35 : tune.highRiskNetPenalty),
      isReturn && !['FLOATED_RESCUE', 'LOBBED_RETURN'].includes(returnOutcome) ? 0.18 : finishMargin ? Math.max(tune.degradedMinNetClearance, 0.36) : tune.degradedMinNetClearance,
      isReturn && !['FLOATED_RESCUE', 'LOBBED_RETURN'].includes(returnOutcome) ? 0.92 : tune.degradedMaxNetClearance,
    ),
    power: clamp(execution.power - modePacePenalty + paceNoise + (poorReturnOutcome ? rand(-0.7, 1.1) : 0), lowReturnPowerFloor, tune.degradedMaxPower),
    errorRisk: pressure,
    executionProfile,
    executionMode,
    dispersion,
    landingError: Object.freeze({
      lateral: +(organicLateral + forcedLateral).toFixed(3),
      depth: +(organicDepth + forcedDepth).toFixed(3),
      net: +(netNoise + directional.net + forcedNet).toFixed(3),
    }),
    missChance: forcedReturnMiss ? 1 : missChance,
    forcedErrorKind,
  });
}
