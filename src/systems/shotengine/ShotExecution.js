import { COURT, PHYSICS } from '../../core/constants.js';
import { clamp } from '../../core/math.js';
import { ShotFamily, ShotIntent } from './ShotTypes.js';
import { getShotDefinition } from './ShotCatalog.js';
import { degradeExecution } from './ShotErrorModel.js';
import { SHOT_TUNING } from './ShotTuning.js';
import { getShotIdentity } from './ShotIdentity.js';
import { getSliceProfileTuning } from './SliceProfiles.js';
import { evaluateExecutionQuality } from './ShotExecutionQuality.js';

function spinSign(context) {
  return -Math.sign(context?.side ?? 1) || -1;
}

function familySpinType(family) {
  if (family === ShotFamily.SLICE || family === ShotFamily.CHIP_RETURN || family === ShotFamily.DROP) return -1;
  if (family === ShotFamily.FLAT_DRIVE || family === ShotFamily.SERVE_FLAT || family === ShotFamily.SMASH) return 0;
  return 1;
}

function flightProfileFor(decision) {
  const blueprintFlight = decision?.trajectoryProfile?.flightProfile ?? decision?.shotBlueprint?.trajectory?.flightProfile ?? null;
  if (blueprintFlight) return Object.freeze({ ...(getShotIdentity(decision?.family)?.flightProfile ?? {}), ...blueprintFlight });
  const returnOutcome = decision?.returnOutcome ?? null;
  if (returnOutcome === 'LOW_CENTER_BLOCK' || returnOutcome === 'NEUTRAL_BLOCK') {
    return Object.freeze({
      mode: 'return_low_block',
      vzMin: -6.6,
      vzMax: 3.75,
      maxLandingError: 3.25,
      netMinZ: COURT.netHeight + 0.015,
      solverSpinScale: 1.15,
      minTime: 0.78,
      maxTime: 1.10,
      maxApex: 2.25,
      speedScale: 0.62,
      strictArc: true,
    });
  }
  if (returnOutcome === 'SOFT_WIDE_BLOCK') {
    return Object.freeze({
      mode: 'return_soft_block',
      vzMin: -6.4,
      vzMax: 3.85,
      maxLandingError: 3.35,
      netMinZ: COURT.netHeight + 0.018,
      solverSpinScale: 1.20,
      minTime: 0.80,
      maxTime: 1.14,
      maxApex: 2.35,
      speedScale: 0.62,
      strictArc: true,
    });
  }
  if (returnOutcome === 'SKID_CHIP') {
    return Object.freeze({
      mode: 'return_skid_chip',
      vzMin: -6.9,
      vzMax: 3.10,
      maxLandingError: 3.35,
      netMinZ: COURT.netHeight + 0.01,
      solverSpinScale: 0.95,
      minTime: 0.76,
      maxTime: 1.08,
      maxApex: 2.10,
      speedScale: 0.60,
      strictArc: true,
    });
  }
  if (returnOutcome === 'SHORT_SITTER') {
    return Object.freeze({
      mode: 'return_short_sitter',
      vzMin: -6.8,
      vzMax: 4.10,
      maxLandingError: 2.70,
      netMinZ: COURT.netHeight + 0.02,
      solverSpinScale: 1.10,
      minTime: 0.74,
      maxTime: 1.02,
      maxApex: 2.20,
      speedScale: 0.58,
      strictArc: true,
    });
  }
  if (returnOutcome === 'FLOATED_RESCUE') {
    return Object.freeze({
      mode: 'return_floated_rescue',
      vzMin: 2.2,
      vzMax: 6.6,
      maxLandingError: 4.10,
      netMinZ: COURT.netHeight + 0.55,
      solverSpinScale: 1.0,
      preferHighArc: true,
      highArcFloor: 3.2,
    });
  }
  if (returnOutcome === 'LOBBED_RETURN') {
    return Object.freeze({
      mode: 'return_lobbed_rescue',
      vzMin: 4.2,
      vzMax: 9.2,
      maxLandingError: 4.80,
      netMinZ: COURT.netHeight + 1.35,
      solverSpinScale: 1.0,
      preferHighArc: true,
      highArcFloor: 5.0,
    });
  }
  return getShotIdentity(decision?.family)?.flightProfile ?? null;
}

export function buildShotExecution(context, quality, decision) {
  const def = getShotDefinition(decision?.family);
  const caps = context?.capabilities ?? {};
  const executionProfile = evaluateExecutionQuality(context, quality, decision);
  const q = executionProfile.executionQuality;
  const target = decision?.target ?? { x: 0, y: -(context?.side ?? 1) * 8.0 };
  const family = decision?.family ?? ShotFamily.TOPSPIN;
  const intent = decision?.intent ?? ShotIntent.BUILD;
  const tune = SHOT_TUNING.execution;
  const identity = getShotIdentity(family);
  const trajectory = decision?.trajectoryProfile ?? decision?.shotBlueprint?.trajectory ?? {};
  const sliceProfile = family === ShotFamily.SLICE ? decision?.sliceProfile ?? null : null;
  const sliceTuning = sliceProfile ? getSliceProfileTuning(sliceProfile) : null;
  const ready = context?.body?.contactReadiness ?? 0;
  const arrivalMargin = context?.body?.arrivalMargin ?? 0;
  const bodyState = quality?.bodyState ?? '';
  const proContact = q >= 0.54 && ready >= 0.28 && arrivalMargin >= -0.09 && bodyState !== 'STRETCHED' && bodyState !== 'LATE';
  const desperateContact = bodyState === 'STRETCHED' || bodyState === 'LATE' || arrivalMargin < -0.13 || q < 0.42;
  const prepared = ready >= 0.62 || quality?.bodyState === 'PLANTED' || quality?.bodyState === 'ON_RISE';
  const buildAttack = decision?.buildMode === 'attack';
  const finishMode = decision?.finishMode ?? null;
  const finishMargin = intent === ShotIntent.FINISH && finishMode === 'margin';
  const finishMarginLowQ = finishMargin && q < 0.44;
  const finishMarginMidQ = finishMargin && q >= 0.44 && q < 0.54;
  const touchRescue = !!decision?.touchRescue;
  const stylePaceAdd = decision?.finishProfile?.paceAdd ?? 0;
  const returnOutcome = decision?.returnOutcome ?? null;
  const returnPlanFamily = decision?.returnPlanFamily ?? null;
  const isReturnPlan = !!returnPlanFamily;
  const liveServeDelivery = isReturnPlan ? context?.gs?._pendingServeData?.delivery ?? null : null;
  const incomingSpeed = context?.ballState?.speed ?? 0;
  const incomingServeCarry = isReturnPlan
    ? clamp((incomingSpeed - 30) * 0.20, 0, returnPlanFamily?.startsWith('CHIP') ? 2.2 : 3.4)
    : 0;
  const firstServeBurden = isReturnPlan && liveServeDelivery?.isFirst
    ? clamp(((liveServeDelivery?.threat ?? 0.55) - 0.52) * 5.0, 0, 1.9)
    : 0;
  const plusOneInitiativePace = !isReturnPlan
    && (context?.score?.rally ?? 0) <= 1
    && context?.serveAdvantage?.beneficiaryId === context?.player?.id
    ? clamp((context.serveAdvantage?.score ?? 0) * 2.0 + (context.serveAdvantage?.attackableReturn ? 0.65 : 0), 0, 2.4)
    : 0;
  const goodReturn = returnOutcome === 'GOOD' || returnOutcome === 'GOOD_ATTACK' || returnOutcome === 'GOOD_COUNTER';
  const neutralOrGoodReturn = goodReturn || returnOutcome === 'NEUTRAL_BLOCK' || returnPlanFamily === 'DRIVE_NEUTRAL' || returnPlanFamily === 'COUNTER_UP';
  const topspinAttack = family === ShotFamily.TOPSPIN && (intent === ShotIntent.PRESSURE || intent === ShotIntent.REDIRECT || intent === ShotIntent.FINISH || intent === ShotIntent.PASS);
  const topspinDefend = family === ShotFamily.TOPSPIN && (intent === ShotIntent.DEFEND || intent === ShotIntent.RESET);
  const topspinBuild = family === ShotFamily.TOPSPIN && intent === ShotIntent.BUILD && prepared && buildAttack;
  const flatBuild = family === ShotFamily.FLAT_DRIVE && intent === ShotIntent.BUILD && prepared && buildAttack;
  const lobPass = family === ShotFamily.LOB && intent === ShotIntent.PASS;
  const competitivePaceAdd = topspinBuild ? 2.0 + ready * 1.6 : flatBuild ? 2.4 + ready * 1.8 : 0;
  const rallyTempoBoost = proContact && !isReturnPlan && !touchRescue && family !== ShotFamily.DROP && family !== ShotFamily.LOB
    ? intent === ShotIntent.PRESSURE ? 1.35
      : intent === ShotIntent.REDIRECT ? 1.18
      : intent === ShotIntent.BUILD ? 1.15
        : intent === ShotIntent.CONTROL ? 0.95
          : intent === ShotIntent.RESET ? 1.20
            : intent === ShotIntent.PASS ? 1.05
              : 0
    : 0;
  const sliceTempoBoost = family === ShotFamily.SLICE && proContact && !isReturnPlan && !touchRescue && intent !== ShotIntent.DEFEND ? 1.15 : 0;
  const finishStylePace = prepared && (intent === ShotIntent.FINISH || intent === ShotIntent.PRESSURE || intent === ShotIntent.REDIRECT)
    ? stylePaceAdd * (intent === ShotIntent.FINISH ? (finishMargin ? 0.36 : 1.0) : intent === ShotIntent.REDIRECT ? 0.52 : 0.62)
    : 0;
  const strokeMechanics = context?.body?.strokePreparation ?? null;
  const mechanicalPowerAdjust = strokeMechanics?.active
    ? ((strokeMechanics.powerTransfer ?? 0.90) - 0.90) * 4.2
      + (strokeMechanics.mode === 'SURVIVAL' ? -3.4
        : strokeMechanics.mode === 'JAMMED' ? -2.0
          : strokeMechanics.mode === 'ADAPTED' ? -1.0
            : 0)
    : 0;

  const powerBase = tune.powerBase
    + (def?.paceBias ?? 0.65) * tune.paceBiasPower
    + (caps.wingPower ?? 0.6) * tune.wingPower
    + q * tune.qualityPower;
  const intentPower = intent === ShotIntent.FINISH
    ? (finishMargin ? tune.pressurePowerBonus + (finishMarginLowQ ? tune.finishMarginPowerPenaltyLowQ : finishMarginMidQ ? tune.finishMarginPowerPenaltyMidQ : 0) : tune.finishPowerBonus)
    : intent === ShotIntent.PRESSURE || intent === ShotIntent.REDIRECT ? tune.pressurePowerBonus
      : intent === ShotIntent.DEFEND ? (desperateContact ? tune.defendPowerPenalty : -0.7)
        : intent === ShotIntent.RESET && proContact ? 0.6
        : 0;
  const finishModePower = finishMode === 'power_putaway' ? 1.35
    : finishMode === 'power_body' ? 0.95
    : finishMode === 'through_line' ? 0.65
      : finishMode === 'behind_runner' ? 0.38
        : finishMode === 'angle_putaway' ? -0.32
          : 0;
  const topspinIntentPower = topspinAttack ? (intent === ShotIntent.FINISH ? (finishMargin ? (finishMarginLowQ ? 0.2 : 0.9) : 3.6) : intent === ShotIntent.REDIRECT ? 1.75 : 2.1) : topspinDefend ? (proContact ? 0.45 : -2.2) : 0;
  const returnPowerAdjust = returnOutcome === 'LOW_CENTER_BLOCK' ? -1.3
    : returnOutcome === 'SOFT_WIDE_BLOCK' ? -1.1
      : returnOutcome === 'SHORT_SITTER' ? -3.4
        : returnOutcome === 'NEUTRAL_BLOCK' ? 0.5
          : returnOutcome === 'SKID_CHIP' ? -0.2
            : returnOutcome === 'FLOATED_RESCUE' ? -5.6
              : returnOutcome === 'LOBBED_RETURN' ? -7.4
                : goodReturn ? 0.4
                  : 0;
  const rawPowerUncapped = (powerBase + intentPower + identity.powerAdd + (sliceTuning?.powerAdd ?? 0) + topspinIntentPower + competitivePaceAdd + rallyTempoBoost + sliceTempoBoost + finishStylePace + finishModePower + returnPowerAdjust + incomingServeCarry - firstServeBurden + plusOneInitiativePace + mechanicalPowerAdjust + (trajectory.powerAdd ?? 0)) * identity.powerMult * (trajectory.powerMult ?? 1);
  const finishMarginCap = finishMarginLowQ ? tune.finishMarginPowerCapLowQ : finishMarginMidQ ? tune.finishMarginPowerCapMidQ : tune.finishMarginPowerCapHighQ;
  const rawPower = clamp(rawPowerUncapped, tune.minPower, finishMargin ? finishMarginCap : tune.maxPower);
  const returnPowerCap = returnPlanFamily === 'DRIVE_ATTACK' ? SHOT_TUNING.return.returnDrivePowerCap + 1.6
    : returnPlanFamily === 'COUNTER_UP' || returnPlanFamily === 'COUNTER_STRETCH' || returnPlanFamily === 'DRIVE_NEUTRAL' ? SHOT_TUNING.return.returnCounterPowerCap + 1.8
      : returnPlanFamily?.startsWith('CHIP') ? SHOT_TUNING.return.returnChipPowerCap + (neutralOrGoodReturn ? 6.0 : 4.2)
        : returnPlanFamily ? SHOT_TUNING.return.returnBlockPowerCap + (neutralOrGoodReturn ? 7.0 : 5.2)
          : tune.maxPower;
  const touchRescuePowerCap = family === ShotFamily.LOB ? (lobPass ? 29.0 : 24.5)
    : family === ShotFamily.DROP ? 15.8
      : family === ShotFamily.SLICE ? 19.5
      : 23.0;
  const returnPowerFloor = returnOutcome === 'FLOATED_RESCUE' || returnOutcome === 'LOBBED_RETURN'
    ? tune.minPower
    : returnOutcome === 'SHORT_SITTER'
      ? Math.max(tune.minPower, 15.8)
      : returnOutcome === 'SKID_CHIP'
        ? Math.max(tune.minPower, 19.0)
        : returnOutcome === 'LOW_CENTER_BLOCK' || returnOutcome === 'SOFT_WIDE_BLOCK'
          ? Math.max(tune.minPower, 17.8)
          : returnOutcome === 'NEUTRAL_BLOCK'
            ? Math.max(tune.minPower, 21.2)
      : returnPlanFamily?.startsWith('CHIP')
        ? Math.max(tune.minPower, 18.6)
        : returnPlanFamily
          ? Math.max(tune.minPower, neutralOrGoodReturn ? 21.2 : 19.4)
          : tune.minPower;
  const power = isReturnPlan
    ? clamp(rawPower, returnPowerFloor, returnPowerCap)
    : touchRescue
      ? clamp(rawPower, tune.minPower, touchRescuePowerCap)
      : rawPower;
  const top = (def?.topspinBias ?? 0) * (tune.topspinBase + (caps.topspin ?? 0.6) * tune.topspinAttr);
  const back = (def?.backspinBias ?? 0) * (tune.backspinBase + (caps.slice ?? 0.55) * tune.backspinAttr);
  const side = (def?.sidespinBias ?? 0) * (tune.sidespinBase + Math.max(caps.slice ?? 0.55, caps.topspin ?? 0.6) * tune.sidespinAttr);
  const sign = spinSign(context);
  const marginTopspin = finishMargin && family === ShotFamily.TOPSPIN ? (finishMarginLowQ ? 1.42 : 1.30) : 1;
  const actualSpinX = familySpinType(family) === -1
    ? Math.max(tune.minBackspinX, back * power * tune.backspinToSpinX * identity.backspinMult * (sliceTuning?.backspinMult ?? 1) * (trajectory.backspinMult ?? 1)) * sign
    : -Math.max(tune.minTopspinX, top * power * tune.topspinToSpinX * identity.topspinMult * (topspinAttack ? 1.14 : topspinDefend ? 1.24 : 1) * marginTopspin * (trajectory.topspinMult ?? 1)) * sign;
  // Curva de blueprint não depende do sidespinBias da família. Assim a
  // banana continua sendo TOPSPIN, mas desenha uma trajetória lateral real.
  const blueprintCurve = (trajectory.curveSpin ?? 0) * power * tune.sidespinToSpinZ;
  const actualSpinZ = (side * power * tune.sidespinToSpinZ * identity.sidespinMult + blueprintCurve)
    * Math.sign(target.x || 1);
  const hitHeight = clamp(
    context?.ballState?.z ?? context?.body?.preferredContactZ ?? 0.9,
    identity.hitHeightMin ?? tune.minHitHeight,
    identity.hitHeightMax ?? tune.maxHitHeight,
  );
  const returnNetAdjust = returnOutcome === 'FLOATED_RESCUE' ? 0.72
    : returnOutcome === 'LOBBED_RETURN' ? 1.65
      : returnOutcome === 'SHORT_SITTER' ? 0.08
        : returnOutcome === 'LOW_CENTER_BLOCK' ? -0.10
          : returnOutcome === 'SOFT_WIDE_BLOCK' ? -0.06
            : returnOutcome === 'SKID_CHIP' ? -0.12
              : returnOutcome === 'NEUTRAL_BLOCK' ? -0.04
                : returnOutcome === 'GOOD_ATTACK' ? -0.02
                  : 0;
  const touchRescueNetLift = touchRescue
    ? family === ShotFamily.LOB ? 0.80
      : family === ShotFamily.DROP ? 0.22
        : 0.46
    : 0;
  const lobPassNetLift = lobPass ? 0.55 : 0;
  const dropFromBadZone = family === ShotFamily.DROP && (
    Math.abs(context?.player?.pos?.y ?? 0) > COURT.halfL - 0.35
    || Math.abs(context?.ballState?.pos?.y ?? 0) > 9.15
    || (context?.body?.contactReadiness ?? 0) < 0.62
    || (context?.body?.arrivalMargin ?? 0) < 0
    || quality?.bodyState === 'LOW_PICKUP'
  );
  const finishModeNetAdjust = finishMode === 'angle_putaway' ? 0.16
    : finishMode === 'through_line' ? -0.08
    : finishMode === 'power_putaway' ? -0.05
      : finishMode === 'power_body' ? -0.02
        : 0;
  const netClearanceBase = (def?.netClearance ?? 0.7) + identity.netClearanceAdd + returnNetAdjust + touchRescueNetLift + lobPassNetLift + finishModeNetAdjust + (trajectory.netClearanceAdd ?? 0) + (topspinAttack ? (finishMargin ? (finishMarginLowQ ? 0.16 : 0.08) : -0.22) : topspinDefend ? 0.26 : 0);
  const returnLowProfile = ['LOW_CENTER_BLOCK', 'SOFT_WIDE_BLOCK', 'NEUTRAL_BLOCK', 'SKID_CHIP'].includes(returnOutcome);
  const returnLobProfile = returnOutcome === 'FLOATED_RESCUE' || returnOutcome === 'LOBBED_RETURN';
  const netClearance = clamp(
    netClearanceBase + (1 - q) * tune.qualityNetSafety + (caps.topspin ?? 0.6) * tune.topspinNetSafety + (finishMargin ? 0.18 : 0) - (dropFromBadZone ? 0.10 : 0),
    returnLowProfile
      ? 0.26
      : returnLobProfile
        ? (returnOutcome === 'LOBBED_RETURN' ? 1.75 : 0.96)
      : touchRescue
      ? Math.max(identity.netClearanceMin ?? tune.minNetClearance, family === ShotFamily.LOB ? 1.65 : 0.82)
      : lobPass ? Math.max(identity.netClearanceMin ?? tune.minNetClearance, 3.05)
      : family === ShotFamily.DROP ? Math.max(identity.netClearanceMin ?? tune.minNetClearance, 1.24)
      : finishMargin ? Math.max(identity.netClearanceMin ?? tune.minNetClearance, 0.56) : (identity.netClearanceMin ?? tune.minNetClearance),
    returnLowProfile
      ? Math.min(identity.netClearanceMax ?? 0.70, 0.70)
      : returnLobProfile
        ? (returnOutcome === 'LOBBED_RETURN' ? 3.10 : 1.55)
        : identity.netClearanceMax ?? tune.maxNetClearance,
  );

  const returnTargetXCap = returnPlanFamily === 'DRIVE_ATTACK' ? 2.45
    : returnPlanFamily === 'DRIVE_NEUTRAL' || returnPlanFamily === 'COUNTER_UP' ? 2.05
      : returnPlanFamily?.includes('BODY') ? 0.80
        : returnPlanFamily ? 1.65
          : null;
  const returnTargetYAbsMax = returnOutcome === 'LOBBED_RETURN' ? COURT.halfL - 0.70
    : returnOutcome === 'FLOATED_RESCUE' ? COURT.halfL - 1.85
    : returnOutcome === 'SHORT_SITTER' ? COURT.serviceLineY + 1.35
    : returnPlanFamily === 'DRIVE_ATTACK' ? COURT.halfL - 1.05
    : returnPlanFamily === 'DRIVE_NEUTRAL' || returnPlanFamily === 'COUNTER_UP' ? COURT.halfL - 1.35
    : returnPlanFamily ? COURT.halfL - 2.75
        : null;
  // Ao perder a ala tarde, o jogador ainda pode salvar o contato, mas já não
  // possui a mesma liberdade para abrir ângulo ou trocar paralela. A adaptação
  // aproxima o alvo do centro em vez de fabricar um erro obrigatório.
  const directionFreedom = strokeMechanics?.directionFreedom ?? 1;
  const targetFreedomScale = strokeMechanics?.active && directionFreedom < 0.48
    ? clamp(0.58 + directionFreedom * 0.72, 0.58, 0.93)
    : 1;
  const mechanicallyReachableTargetX = target.x * targetFreedomScale;
  const finalTargetX = returnTargetXCap != null
    ? clamp(mechanicallyReachableTargetX, -returnTargetXCap, returnTargetXCap)
    : mechanicallyReachableTargetX;
  const finalTargetY = returnTargetYAbsMax != null ? Math.sign(target.y || 1) * Math.min(Math.abs(target.y), returnTargetYAbsMax) : target.y;

  const ideal = Object.freeze({
    family,
    targetX: finalTargetX,
    targetY: finalTargetY,
    power,
    spinType: familySpinType(family),
    actualSpinX,
    actualSpinZ,
    hitHeight,
    netClearance,
    flightProfile: flightProfileFor(decision),
    sliceProfile,
    sliceCarryMult: sliceTuning?.carryMult ?? 1,
    identityTags: [...(identity.tags ?? []), ...(decision?.shotBlueprint?.tags ?? []), ...(touchRescue ? ['touch_rescue'] : [])],
    blueprintId: decision?.blueprintId ?? null,
    blueprintLabel: decision?.blueprintLabel ?? null,
    courtIdentity: decision?.courtIdentity ?? null,
    coaching: decision?.coaching ?? null,
    signatureMove: decision?.signatureMove ?? null,
    debugFlags: [],
    target: Object.freeze({ ...target, x: finalTargetX, y: finalTargetY }),
    landingEnvelope: target?.landingEnvelope ?? null,
    wrongFoot: decision?.wrongFoot ?? target?.wrongFoot ?? target?.landingEnvelope?.wrongFoot ?? null,
    executionProfile,
    executionMode: executionProfile.executionMode,
    strokePreparation: strokeMechanics,
    mechanicalPowerAdjust,
    targetFreedomScale,
  });

  return degradeExecution({ execution: ideal, context, quality, decision, shotDef: def });
}

export function applyShotExecution({ ball, player, execution, launchBall }) {
  const fromPos = { x: player.pos.x, y: player.pos.y };
  ball.pos.x = fromPos.x;
  ball.pos.y = fromPos.y;
  launchBall(
    ball,
    fromPos,
    execution.targetX,
    execution.targetY,
    execution.spinType,
    execution.power,
    execution.netClearance,
    execution.hitHeight,
    execution.actualSpinX,
    execution.actualSpinZ,
    { flightProfile: execution.flightProfile },
  );

  if (execution.forcedErrorKind === 'NET') {
    const tToNet = Math.abs(ball.vel.y) > 0.01 ? Math.abs(fromPos.y / ball.vel.y) : 0;
    if (tToNet > 0.05) {
      const desiredNetZ = COURT.netHeight * 0.55;
      ball.vel.z = (desiredNetZ - execution.hitHeight - 0.5 * PHYSICS.gravity * tToNet * tToNet) / tToNet;
    } else {
      ball.vel.z = Math.min(ball.vel.z, -0.8);
    }
    ball._forcedErrorKind = 'NET';
  } else if (execution.forcedErrorKind) {
    ball._forcedErrorKind = execution.forcedErrorKind;
  }

  ball.lastHitBy = player.id;
  ball._lastTargetX = execution.targetX;
  ball._lastTargetY = execution.targetY;
  ball._lastContactX = player.pos.x;
  ball._lastContactY = player.pos.y;
  ball._lastShotType = execution.family;
  ball.lastShotType = execution.family;
  ball._lastShotMeta = {
    netClearance: execution.netClearance,
    power: execution.power,
    launchKmh: Math.round(Math.hypot(ball.vel.x ?? 0, ball.vel.y ?? 0, ball.vel.z ?? 0) * 3.6),
    launchVel: {
      x: +(ball.vel.x ?? 0).toFixed(2),
      y: +(ball.vel.y ?? 0).toFixed(2),
      z: +(ball.vel.z ?? 0).toFixed(2),
    },
    startZ: execution.hitHeight,
    maxZ: Math.max(execution.hitHeight ?? 0, ball.pos.z ?? 0),
    spinX: execution.actualSpinX,
    spinZ: execution.actualSpinZ,
    errorRisk: execution.errorRisk,
    executionMode: execution.executionMode ?? execution.executionProfile?.executionMode ?? null,
    executionQuality: execution.executionProfile?.executionQuality ?? null,
    intendedWing: execution.strokePreparation?.intendedWing ?? null,
    naturalWing: execution.strokePreparation?.naturalWing ?? null,
    actualWing: execution.strokePreparation?.actualWing ?? null,
    strokePreparationMode: execution.strokePreparation?.mode ?? null,
    mechanicalIntegrity: execution.strokePreparation?.mechanicalIntegrity ?? null,
    wingSwitchSeverity: execution.strokePreparation?.switchSeverity ?? null,
    recoveryExposure: execution.strokePreparation?.recoveryExposure ?? 0,
    runAroundForehand: execution.strokePreparation?.runAround ?? false,
    dispersion: execution.dispersion,
    landingEnvelope: execution.landingEnvelope ?? null,
    wrongFoot: execution.wrongFoot ?? null,
    landingError: execution.landingError ?? null,
    missChance: execution.missChance,
    forcedErrorKind: execution.forcedErrorKind,
    identityTags: execution.identityTags ?? [],
    courtIdentity: execution.courtIdentity ?? null,
    coaching: execution.coaching ?? null,
    flightProfileMode: execution.flightProfile?.mode ?? null,
    sliceProfile: execution.sliceProfile ?? null,
    returnArcProfile: execution.flightProfile?.mode?.startsWith('return_') ? execution.flightProfile.mode : null,
    debugFlags: execution.debugFlags ?? [],
  };
  ball._wrongFoot = execution.wrongFoot?.active
    ? {
        ...execution.wrongFoot,
        targetX: execution.targetX,
        hitterId: player.id,
      }
    : null;
  ball._isDropShot = execution.family === ShotFamily.DROP;
  ball._sliceProfile = execution.sliceProfile ?? null;
  ball._sliceCarryMult = execution.sliceCarryMult ?? 1;
}
