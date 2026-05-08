import { clamp, rand } from '../../core/math.js';
import { ShotDirection, ShotIntent } from './ShotTypes.js';
import { SHOT_TUNING } from './ShotTuning.js';

function directionRisk(direction) {
  if (direction === ShotDirection.DTL) return 0.18;
  if (direction === ShotDirection.WIDE || direction === ShotDirection.INSIDE_IN) return 0.14;
  if (direction === ShotDirection.CROSS) return -0.05;
  if (direction === ShotDirection.CENTER || direction === ShotDirection.BODY) return -0.10;
  return 0;
}

function intentRisk(intent) {
  if (intent === ShotIntent.FINISH) return 0.34;
  if (intent === ShotIntent.PRESSURE) return 0.18;
  if (intent === ShotIntent.APPROACH || intent === ShotIntent.PASS) return 0.08;
  if (intent === ShotIntent.RESET || intent === ShotIntent.DEFEND) return -0.10;
  return 0;
}

export function estimateErrorPressure({ context, quality, decision, shotDef }) {
  const caps = context?.capabilities ?? {};
  const q = quality?.quality ?? 0.5;
  const tune = SHOT_TUNING.errors;
  const base = shotDef?.baseRisk ?? 0.4;
  const attrRelief = (caps.errorResistance ?? 0.6) * (tune.attrErrorRelief * 0.72) + (caps.spinSecurity ?? 0.55) * (tune.spinSecurityRelief * 0.68);
  const bodyPenalty = (1 - q) * (tune.bodyPenalty * 1.16);
  const risk = base * (tune.baseRiskWeight * 1.18)
    + bodyPenalty
    + directionRisk(decision?.direction)
    + intentRisk(decision?.intent)
    - attrRelief;
  return clamp(risk, tune.minRisk, tune.maxRisk);
}

export function degradeExecution({ execution, context, quality, decision, shotDef }) {
  const pressure = estimateErrorPressure({ context, quality, decision, shotDef });
  const caps = context?.capabilities ?? {};
  const tune = SHOT_TUNING.errors;
  const control = caps?.errorResistance ?? 0.6;
  const dispersion = clamp(pressure * (tune.dispersionBase - control * tune.dispersionControlRelief), tune.minDispersion, tune.maxDispersion);
  const lateralNoise = rand(-1, 1) * dispersion * tune.lateralNoise;
  const depthNoise = rand(-1, 1) * dispersion * tune.depthNoise;
  const netNoise = rand(-1, 1) * dispersion * tune.netNoise;
  const paceNoise = rand(-1, 1) * dispersion * tune.paceNoise;
  const q = quality?.quality ?? 0.5;
  const highIntent = decision?.intent === ShotIntent.FINISH || decision?.intent === ShotIntent.PRESSURE;
  const missChance = clamp((pressure - 0.24) * 0.88 + (highIntent ? 0.12 : 0) + (q < 0.56 ? 0.09 : 0), 0.015, 0.48);
  const missRoll = rand(0, 1);
  let forcedLateral = 0;
  let forcedDepth = 0;
  let forcedNet = 0;
  let forcedErrorKind = null;
  if (missRoll < missChance) {
    const missKind = rand(0, 1);
    if (missKind < 0.34) {
      forcedNet = -0.95 - pressure * 0.82;
      forcedErrorKind = 'NET';
    } else if (missKind < 0.72) {
      forcedDepth = (2.10 + pressure * 3.60) * Math.sign(execution.targetY || 1);
      forcedErrorKind = 'LONG';
    } else {
      forcedLateral = (1.55 + pressure * 2.60) * Math.sign(execution.targetX || rand(-1, 1) || 1);
      forcedErrorKind = 'WIDE';
    }
  }

  return Object.freeze({
    ...execution,
    targetX: execution.targetX + lateralNoise + forcedLateral,
    targetY: execution.targetY + depthNoise * Math.sign(execution.targetY || 1) + forcedDepth,
    netClearance: clamp(execution.netClearance + netNoise + forcedNet - Math.max(0, pressure - tune.highRiskNetPenaltyStart) * tune.highRiskNetPenalty, tune.degradedMinNetClearance, tune.degradedMaxNetClearance),
    power: clamp(execution.power + paceNoise, tune.degradedMinPower, tune.degradedMaxPower),
    errorRisk: pressure,
    dispersion,
    missChance,
    forcedErrorKind,
  });
}
