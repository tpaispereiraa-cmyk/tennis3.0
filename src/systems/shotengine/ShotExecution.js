import { COURT, PHYSICS } from '../../core/constants.js';
import { clamp } from '../../core/math.js';
import { ShotFamily, ShotIntent } from './ShotTypes.js';
import { getShotDefinition } from './ShotCatalog.js';
import { degradeExecution } from './ShotErrorModel.js';
import { SHOT_TUNING } from './ShotTuning.js';
import { getShotIdentity } from './ShotIdentity.js';

function spinSign(context) {
  return -Math.sign(context?.side ?? 1) || -1;
}

function familySpinType(family) {
  if (family === ShotFamily.SLICE || family === ShotFamily.CHIP_RETURN || family === ShotFamily.DROP) return -1;
  if (family === ShotFamily.FLAT_DRIVE || family === ShotFamily.SERVE_FLAT || family === ShotFamily.SMASH) return 0;
  return 1;
}

function flightProfileFor(decision) {
  return getShotIdentity(decision?.family)?.flightProfile ?? null;
}

export function buildShotExecution(context, quality, decision) {
  const def = getShotDefinition(decision?.family);
  const caps = context?.capabilities ?? {};
  const q = quality?.quality ?? 0.5;
  const target = decision?.target ?? { x: 0, y: -(context?.side ?? 1) * 8.0 };
  const family = decision?.family ?? ShotFamily.TOPSPIN;
  const intent = decision?.intent ?? ShotIntent.BUILD;
  const tune = SHOT_TUNING.execution;
  const identity = getShotIdentity(family);
  const ready = context?.body?.contactReadiness ?? 0;
  const prepared = ready >= 0.62 || quality?.bodyState === 'PLANTED' || quality?.bodyState === 'ON_RISE';
  const buildAttack = decision?.buildMode === 'attack';
  const stylePaceAdd = decision?.finishProfile?.paceAdd ?? 0;
  const topspinAttack = family === ShotFamily.TOPSPIN && (intent === ShotIntent.PRESSURE || intent === ShotIntent.FINISH || intent === ShotIntent.PASS);
  const topspinDefend = family === ShotFamily.TOPSPIN && (intent === ShotIntent.DEFEND || intent === ShotIntent.RESET);
  const topspinBuild = family === ShotFamily.TOPSPIN && intent === ShotIntent.BUILD && prepared && buildAttack;
  const flatBuild = family === ShotFamily.FLAT_DRIVE && intent === ShotIntent.BUILD && prepared && buildAttack;
  const competitivePaceAdd = topspinBuild ? 2.0 + ready * 1.6 : flatBuild ? 2.4 + ready * 1.8 : 0;
  const finishStylePace = prepared && (intent === ShotIntent.FINISH || intent === ShotIntent.PRESSURE)
    ? stylePaceAdd * (intent === ShotIntent.FINISH ? 1.0 : 0.62)
    : 0;

  const powerBase = tune.powerBase
    + (def?.paceBias ?? 0.65) * tune.paceBiasPower
    + (caps.wingPower ?? 0.6) * tune.wingPower
    + q * tune.qualityPower;
  const intentPower = intent === ShotIntent.FINISH ? tune.finishPowerBonus : intent === ShotIntent.PRESSURE ? tune.pressurePowerBonus : intent === ShotIntent.DEFEND ? tune.defendPowerPenalty : 0;
  const topspinIntentPower = topspinAttack ? (intent === ShotIntent.FINISH ? 5.4 : 3.3) : topspinDefend ? -2.2 : 0;
  const power = clamp((powerBase + intentPower + identity.powerAdd + topspinIntentPower + competitivePaceAdd + finishStylePace) * identity.powerMult, tune.minPower, tune.maxPower);
  const top = (def?.topspinBias ?? 0) * (tune.topspinBase + (caps.topspin ?? 0.6) * tune.topspinAttr);
  const back = (def?.backspinBias ?? 0) * (tune.backspinBase + (caps.slice ?? 0.55) * tune.backspinAttr);
  const side = (def?.sidespinBias ?? 0) * (tune.sidespinBase + Math.max(caps.slice ?? 0.55, caps.topspin ?? 0.6) * tune.sidespinAttr);
  const sign = spinSign(context);
  const actualSpinX = familySpinType(family) === -1
    ? Math.max(tune.minBackspinX, back * power * tune.backspinToSpinX * identity.backspinMult) * sign
    : -Math.max(tune.minTopspinX, top * power * tune.topspinToSpinX * identity.topspinMult * (topspinAttack ? 1.14 : topspinDefend ? 1.24 : 1)) * sign;
  const actualSpinZ = side * power * tune.sidespinToSpinZ * identity.sidespinMult * Math.sign(target.x || 1);
  const hitHeight = clamp(
    context?.ballState?.z ?? context?.body?.preferredContactZ ?? 0.9,
    identity.hitHeightMin ?? tune.minHitHeight,
    identity.hitHeightMax ?? tune.maxHitHeight,
  );
  const netClearanceBase = (def?.netClearance ?? 0.7) + identity.netClearanceAdd + (topspinAttack ? -0.22 : topspinDefend ? 0.26 : 0);
  const netClearance = clamp(
    netClearanceBase + (1 - q) * tune.qualityNetSafety + (caps.topspin ?? 0.6) * tune.topspinNetSafety,
    identity.netClearanceMin ?? tune.minNetClearance,
    identity.netClearanceMax ?? tune.maxNetClearance,
  );

  const ideal = Object.freeze({
    family,
    targetX: target.x,
    targetY: target.y,
    power,
    spinType: familySpinType(family),
    actualSpinX,
    actualSpinZ,
    hitHeight,
    netClearance,
    flightProfile: flightProfileFor(decision),
    identityTags: identity.tags,
    target,
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
    dispersion: execution.dispersion,
    missChance: execution.missChance,
    forcedErrorKind: execution.forcedErrorKind,
    identityTags: execution.identityTags ?? [],
  };
  ball._isDropShot = execution.family === ShotFamily.DROP;
}
