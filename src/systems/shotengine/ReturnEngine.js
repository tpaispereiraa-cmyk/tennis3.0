import { COURT } from '../../core/constants.js';
import { clamp, rand } from '../../core/math.js';
import { ShotDirection, ShotFamily, ShotIntent, RiskProfile } from './ShotTypes.js';
import { SHOT_TUNING } from './ShotTuning.js';
import { resolveShotStyle } from './ShotStyle.js';

function incomingServeSpeed(context) {
  const v = context?.ballState?.vel ?? {};
  return Math.hypot(v.x ?? 0, v.y ?? 0, v.z ?? 0);
}

function targetY(context, depth) {
  const side = -(context?.side ?? 1);
  const absY = depth === 'SHORT'
    ? COURT.serviceLineY + rand(-0.35, 0.75)
    : depth === 'MID'
      ? 7.4 + rand(-0.35, 0.65)
      : COURT.halfL - rand(1.10, 2.05);
  return side * absY;
}

function returnTarget(context, intent, direction, family, serveData, pressure) {
  const oppX = context?.opponent?.pos?.x ?? 0;
  const isWideServe = serveData?.dir === ShotDirection.WIDE || (serveData?.wideHint ?? 0) > 0.55;
  const isBodyServe = serveData?.dir === ShotDirection.BODY || (serveData?.jamHint ?? 0) > 0.55;
  const attack = intent === ShotIntent.PRESSURE || intent === ShotIntent.BUILD;
  const chip = family === ShotFamily.CHIP_RETURN || family === ShotFamily.SLICE;
  const block = family === ShotFamily.BLOCK_RETURN;

  let depth = attack ? 'DEEP' : pressure > 0.86 ? 'MID' : 'DEEP';
  if (chip && pressure > 0.78) depth = rand(0, 1) < 0.42 ? 'SHORT' : 'MID';
  if (block && isBodyServe) depth = rand(0, 1) < 0.52 ? 'MID' : 'DEEP';

  let x = rand(-0.35, 0.35);
  if (direction === ShotDirection.CROSS) x = -Math.sign(context?.player?.pos?.x || serveData?.targetX || 1) * rand(1.35, attack ? 2.75 : 2.20);
  else if (direction === ShotDirection.DTL) x = Math.sign(context?.player?.pos?.x || serveData?.targetX || 1) * rand(0.75, attack ? 2.25 : 1.65);
  else if (direction === ShotDirection.BODY) x = clamp(oppX * 0.45 + rand(-0.40, 0.40), -1.25, 1.25);
  else if (isWideServe) x = -Math.sign(serveData?.targetX || context?.player?.pos?.x || 1) * rand(0.75, 1.85);
  else if (isBodyServe) x = clamp(oppX * 0.25 + rand(-0.50, 0.50), -0.95, 0.95);

  return Object.freeze({
    x: clamp(x, -COURT.halfW + 0.70, COURT.halfW - 0.70),
    y: targetY(context, depth),
    depth,
    width: direction,
  });
}

function variedDirection(serveData, canAttack) {
  const wide = serveData?.dir === ShotDirection.WIDE || (serveData?.wideHint ?? 0) > 0.55;
  const body = serveData?.dir === ShotDirection.BODY || (serveData?.jamHint ?? 0) > 0.55;
  const roll = rand(0, 1);
  if (wide) return roll < 0.58 ? ShotDirection.CROSS : roll < 0.82 ? ShotDirection.CENTER : ShotDirection.DTL;
  if (body) return roll < 0.52 ? ShotDirection.BODY : roll < 0.80 ? ShotDirection.CENTER : ShotDirection.CROSS;
  if (canAttack) return roll < 0.46 ? ShotDirection.CROSS : roll < 0.72 ? ShotDirection.DTL : ShotDirection.BODY;
  return roll < 0.42 ? ShotDirection.CENTER : roll < 0.74 ? ShotDirection.BODY : ShotDirection.CROSS;
}

export function decideReturnShot(context, quality) {
  const caps = context?.capabilities ?? {};
  const q = quality?.quality ?? 0.5;
  const speed = incomingServeSpeed(context);
  const serveData = context?.gs?._pendingServeData ?? {};
  const isSecondServe = serveData?.isFirst === false;
  const serveType = serveData?.physType ?? null;
  const isKickServe = serveType === ShotFamily.SERVE_KICK;
  const isSliceServe = serveType === ShotFamily.SERVE_SLICE;
  const tune = SHOT_TUNING.return;
  const style = resolveShotStyle(context);
  const serveShapePressure = (serveData?.wideHint ?? 0) * 0.10 + (serveData?.jamHint ?? 0) * 0.08 + Math.abs(serveData?.spinZ ?? 0) * 0.010;
  const pressure = clamp(speed / tune.pressureSpeedDivisor + serveShapePressure, 0, 1);
  const returnSkill = caps.return ?? 0.6;
  const readableKick = isKickServe && q > 0.50 && pressure < 0.90;
  const attackQ = clamp(tune.attackSecondServeQuality - style.returnAttackBias - (isSecondServe ? 0.06 : 0), 0.48, 0.66);
  const canAttack = (isSecondServe || readableKick || pressure < 0.72) && q > attackQ && returnSkill > tune.attackReturnSkill - 0.04;
  const mustBlock = (pressure > tune.blockPressure + 0.08 && !readableKick && !isSecondServe) || q < tune.poorQualityBlock;

  let family = ShotFamily.BLOCK_RETURN;
  let intent = ShotIntent.RESET;
  let direction = variedDirection(serveData, canAttack);
  let risk = RiskProfile.SAFE;
  let buildMode = null;

  if (mustBlock) {
    family = (returnSkill > 0.62 && caps.slice > 0.56 && (isSliceServe || rand(0, 1) < 0.34)) ? ShotFamily.CHIP_RETURN : ShotFamily.BLOCK_RETURN;
    intent = ShotIntent.RESET;
    risk = RiskProfile.SAFE;
  } else if (canAttack) {
    family = caps.wingPower + style.flatBias > caps.topspin - 0.08 && q > 0.60 ? ShotFamily.FLAT_DRIVE : ShotFamily.TOPSPIN;
    intent = q > tune.aggressiveQuality || isSecondServe ? ShotIntent.PRESSURE : ShotIntent.BUILD;
    buildMode = intent === ShotIntent.BUILD ? 'attack' : null;
    risk = q > tune.aggressiveQuality ? RiskProfile.AGGRESSIVE : RiskProfile.NORMAL;
  } else {
    const chipLikely = caps.slice > caps.topspin + 0.08 || isSliceServe || pressure > 0.78;
    family = chipLikely && rand(0, 1) < 0.46 ? ShotFamily.CHIP_RETURN : ShotFamily.BLOCK_RETURN;
    intent = ShotIntent.CONTROL;
    risk = RiskProfile.SAFE;
  }

  const target = returnTarget(context, intent, direction, family, serveData, pressure);
  return Object.freeze({
    family,
    type: family,
    intent,
    direction,
    target,
    buildMode,
    styleSubType: style.archetype,
    finishProfile: style,
    risk,
    score: q * tune.scoreQualityWeight + returnSkill * tune.scoreSkillWeight - pressure * tune.pressureScorePenalty,
    reason: `return pressure=${pressure.toFixed(2)}; serve=${serveType ?? 'UNK'}:${serveData?.dir ?? 'UNK'}; secondServe=${isSecondServe}; style=${style.archetype}; q=${q.toFixed(2)}`,
  });
}
