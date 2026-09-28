import { COURT } from '../../core/constants.js';
import { getCourtIdentity } from '../../domain/players/PlayerCourtIdentity.js';
import { clamp, rand } from '../../core/math.js';
import { ShotDirection, ShotFamily, ShotIntent, RiskProfile } from './ShotTypes.js';
import { SHOT_TUNING } from './ShotTuning.js';
import { resolveShotStyle } from './ShotStyle.js';
import { rallyDepthToY } from './ShotTargeting.js';
import { buildResidualServeAdvantage, evaluateReturnChallenge } from './ServeExchangeEngine.js';

function incomingServeSpeed(context) {
  const v = context?.ballState?.vel ?? {};
  return Math.hypot(v.x ?? 0, v.y ?? 0, v.z ?? 0);
}

function returnReadiness(caps = {}, serveData = {}, gs = null) {
  const technicalBase = clamp(
    (caps.return ?? 0.6) * 0.46
    + (caps.reading ?? 0.6) * 0.27
    + (caps.wingControl ?? 0.6) * 0.17
    + (caps.explosiveness ?? 0.6) * 0.10,
    0,
    1,
  );
  const history = gs?._servePatternHistory ?? [];
  // A lista já traz o saque atual quando a devolução acontece. Repetir o
  // mesmo padrão não entrega a bola para qualquer um: só um bom leitor ganha
  // uma margem pequena para se antecipar.
  const previous = history.slice(0, -1).slice(-4);
  const currentServer = gs?.server;
  const repeats = previous.filter(item =>
    (item?.serverId == null || item.serverId === currentServer)
    && item?.family === serveData?.physType
    && item?.direction === serveData?.dir,
  ).length;
  const patternRead = repeats > 0 ? Math.min(0.055, repeats * 0.022) * Math.max(0, (caps.reading ?? 0.6) - 0.62) / 0.38 : 0;
  const secondServeRead = serveData?.isFirst === false ? Math.max(0, (caps.reading ?? 0.6) - 0.58) * 0.08 : 0;
  const kickRead = serveData?.physType === ShotFamily.SERVE_KICK ? Math.max(0, (caps.reading ?? 0.6) - 0.62) * 0.06 : 0;
  return clamp(technicalBase + patternRead + secondServeRead + kickRead, 0, 1);
}

export function normalizeReturnContact(context, quality) {
  const caps = context?.capabilities ?? {};
  const body = context?.body ?? {};
  const serveData = context?.gs?._pendingServeData ?? {};
  const arrival = body.arrivalMargin ?? 0;
  const delivery = serveData?.delivery ?? null;
  const challenge = evaluateReturnChallenge({ delivery, caps, body, ballState: context?.ballState, player: context?.player });
  const rawQuality = clamp(quality?.quality ?? 0, 0, 1);
  const contactBase = clamp(rawQuality * 0.42 + challenge.technique * 0.44 + challenge.readiness * 0.14, 0, 1);
  const resolvedQuality = clamp(Math.min(contactBase - challenge.qualityPenalty, challenge.qualityCeiling), 0.06, 0.94);
  const bodyState = challenge.realEmergency
    ? (arrival < -0.28 ? 'LATE' : 'STRETCHED')
    : challenge.jammed ? 'JAMMED'
      : challenge.compromised ? 'MOVING'
        : (quality?.bodyState === 'STRETCHED' || quality?.bodyState === 'LATE' ? 'MOVING' : quality?.bodyState ?? 'MOVING');

  return Object.freeze({
    ...quality,
    quality: resolvedQuality,
    bodyState,
    canContact: true,
    returnContact: Object.freeze({
      ...challenge,
      delivery,
      returnReadiness: challenge.anticipation,
      movementReadiness: challenge.readiness,
      arrivalMargin: +arrival.toFixed(3),
      serveThreat: delivery?.threat ?? 0,
      returnBurden: challenge.qualityPenalty,
      technicalFloor: null,
    }),
  });
}

const RETURN_OUTCOME = Object.freeze({
  LOW_CENTER_BLOCK: 'LOW_CENTER_BLOCK',
  SOFT_WIDE_BLOCK: 'SOFT_WIDE_BLOCK',
  SHORT_SITTER: 'SHORT_SITTER',
  NEUTRAL_BLOCK: 'NEUTRAL_BLOCK',
  SKID_CHIP: 'SKID_CHIP',
  GOOD_COUNTER: 'GOOD_COUNTER',
  GOOD_ATTACK: 'GOOD_ATTACK',
  GOOD: 'GOOD',
  FLOATED_RESCUE: 'FLOATED_RESCUE',
  LOBBED_RETURN: 'LOBBED_RETURN',
  RETURN_NET: 'RETURN_NET',
  RETURN_LONG: 'RETURN_LONG',
  RETURN_WIDE: 'RETURN_WIDE',
});

function returnTarget(context, intent, direction, family, serveData, pressure, quality, outcome, returnPlanFamily) {
  const oppX = context?.opponent?.pos?.x ?? 0;
  const isWideServe = serveData?.dir === ShotDirection.WIDE || (serveData?.wideHint ?? 0) > 0.55;
  const isBodyServe = serveData?.dir === ShotDirection.BODY || (serveData?.jamHint ?? 0) > 0.55;
  const attack = returnPlanFamily === 'DRIVE_ATTACK' || returnPlanFamily === 'COUNTER_UP' || returnPlanFamily === 'COUNTER_STRETCH';
  const chipPlan = returnPlanFamily?.startsWith('CHIP') || family === ShotFamily.CHIP_RETURN;
  let depth = attack ? 'DEEP' : 'MID';
  if (outcome === RETURN_OUTCOME.SHORT_SITTER) depth = 'SHORT';
  else if (outcome === RETURN_OUTCOME.LOW_CENTER_BLOCK || outcome === RETURN_OUTCOME.SOFT_WIDE_BLOCK) depth = rand(0, 1) < 0.72 ? 'MID' : 'SHORT';
  else if (outcome === RETURN_OUTCOME.SKID_CHIP || outcome === RETURN_OUTCOME.NEUTRAL_BLOCK) depth = rand(0, 1) < 0.70 ? 'MID' : 'MID_DEEP';
  else if (outcome === RETURN_OUTCOME.FLOATED_RESCUE) depth = 'FLOAT';
  else if (outcome === RETURN_OUTCOME.LOBBED_RETURN) depth = 'LOB';
  else if (outcome === RETURN_OUTCOME.GOOD || outcome === RETURN_OUTCOME.GOOD_COUNTER || outcome === RETURN_OUTCOME.GOOD_ATTACK) depth = 'DEEP';

  let x = rand(-0.35, 0.35);
  if (outcome === RETURN_OUTCOME.LOW_CENTER_BLOCK || outcome === RETURN_OUTCOME.SHORT_SITTER) {
    x = clamp(oppX * 0.22 + rand(-0.62, 0.62), -1.20, 1.20);
  } else if (outcome === RETURN_OUTCOME.SOFT_WIDE_BLOCK) {
    const sign = -Math.sign(context?.player?.pos?.x || serveData?.targetX || rand(-1, 1) || 1);
    x = sign * rand(1.20, 2.15);
  } else if (direction === ShotDirection.CROSS) x = -Math.sign(context?.player?.pos?.x || serveData?.targetX || 1) * rand(1.10, attack ? 2.35 : 1.85);
  else if (direction === ShotDirection.DTL) x = Math.sign(context?.player?.pos?.x || serveData?.targetX || 1) * rand(0.65, attack ? 1.95 : 1.45);
  else if (direction === ShotDirection.BODY) x = clamp(oppX * 0.45 + rand(-0.40, 0.40), -1.25, 1.25);
  else if (isWideServe) x = -Math.sign(serveData?.targetX || context?.player?.pos?.x || 1) * rand(0.75, 1.85);
  else if (isBodyServe) x = clamp(oppX * 0.25 + rand(-0.50, 0.50), -0.95, 0.95);

  if (!attack && outcome !== RETURN_OUTCOME.LOW_CENTER_BLOCK) x += rand(-0.36, 0.36);
  if (chipPlan && outcome !== RETURN_OUTCOME.LOBBED_RETURN) x += rand(-0.28, 0.28);

  return Object.freeze({
    x: clamp(x, -COURT.halfW + 0.70, COURT.halfW - 0.70),
    y: rallyDepthToY(depth, context?.side ?? 1),
    depth,
    width: direction,
  });
}

function classifyServeForReturn({ serveData, quality, pressure, context, returnRead }) {
  const q = quality?.quality ?? 0.5;
  const challenge = quality?.returnContact ?? {};
  const bodyState = quality?.bodyState ?? 'NEUTRAL';
  const kmh = serveData?.kmh ?? Math.round(incomingServeSpeed(context) * 3.6);
  const physType = serveData?.physType ?? null;
  const dir = serveData?.dir ?? null;
  const isSecond = serveData?.isFirst === false;
  const latGap = Math.abs((context?.ballState?.pos?.x ?? 0) - (context?.player?.pos?.x ?? 0));
  const high = (context?.ballState?.z ?? 0) > 1.12;
  const jammed = dir === ShotDirection.BODY || bodyState === 'JAMMED';
  const reactiveReach = quality?.returnContact?.reactiveReach ?? 1.42;
  const stretch = !jammed && (
    quality?.returnContact?.realEmergency
    || latGap > reactiveReach + 0.20
    || (dir === ShotDirection.WIDE && latGap > reactiveReach)
    || ((bodyState === 'STRETCHED' || bodyState === 'FALLING_BACK') && latGap > reactiveReach - 0.12)
  );
  const fast = kmh > (isSecond ? 158 : 164);
  const veryFast = kmh > 202;
  const slow = kmh < (isSecond ? 158 : 138);
  const readableKick = physType === ShotFamily.SERVE_KICK && high && kmh < 176 && q >= 0.50;
  const rawPrecisionPressure = clamp((serveData?.precisionPressure ?? 0) + ((serveData?.servePrecision ?? 70) - 78) / 205, 0, 0.36);
  const precisionPressure = isSecond ? rawPrecisionPressure * 0.55 : rawPrecisionPressure;
  const realJam = jammed && (!isSecond || bodyState === 'JAMMED' || q < 0.48 || (serveData?.jamHint ?? 0) > 0.78);
  const readRelief = Math.max(0, (returnRead ?? 0.6) - 0.60) * (isSecond ? 0.42 : 0.26);
  const effectivePrecisionPressure = Math.max(0, precisionPressure - readRelief);
  const technicalServe = effectivePrecisionPressure > (isSecond ? 0.24 : 0.12)
    && (!isSecond || q < 0.48 || kmh > 174)
    && (dir === ShotDirection.BODY || dir === ShotDirection.WIDE || physType === ShotFamily.SERVE_SLICE || physType === ShotFamily.SERVE_KICK);

  let kind = 'NEUTRAL';
  if (challenge.realEmergency || challenge.physicalDemand >= 0.60 || q < 0.34 || stretch || realJam) kind = 'HARD';
  else if (challenge.physicalDemand <= (isSecond ? 0.38 : 0.30) && challenge.neutralization >= 0.24 && q >= (isSecond ? 0.50 : 0.58)) kind = 'EASY';
  if (readableKick && kind === 'HARD') kind = 'NEUTRAL';

  return Object.freeze({
    kind, kmh, physType, dir, isSecond, high, stretch, jammed: realJam,
    fast, slow, readableKick, readRelief: +readRelief.toFixed(3),
    returnPosture: quality?.returnContact?.posture ?? null,
    reactiveReach: quality?.returnContact?.reactiveReach ?? null,
  });
}

function chooseReturnPlan({ serveInfo, quality, caps, style, returnSkill, returnRead, pressure, tune, identity }) {
  const q = quality?.quality ?? 0.5;
  const control = clamp((caps.wingControl ?? 0.6) * 0.35 + returnSkill * 0.65, 0, 1);
  const canChip = (caps.slice ?? 0.55) > 0.58 || control > 0.68;
  const canDrive = returnSkill > 0.64 && control > 0.62 && returnRead > 0.62;
  const canAggressiveDrive = canDrive && (caps.wingPower ?? 0.6) > 0.66 && (caps.riskTolerance ?? 0.55) > 0.56;
  const firstServeAttack = !serveInfo.isSecond
    && canDrive
    && q >= tune.attackFirstServeQuality
    && pressure <= tune.attackFirstServeMaxPressure
    && serveInfo.kmh <= tune.attackFirstServeMaxKmh
    && serveInfo.kind !== 'HARD'
    && !serveInfo.stretch;
  const secondServeAttack = serveInfo.isSecond
    && canDrive
    && q >= 0.52
    && pressure <= 0.76
    && serveInfo.kmh <= tune.attackSecondServeMaxKmh + 6
    && !serveInfo.stretch
    && !(serveInfo.jammed && pressure > 0.62);
  const secondServeNeutralDrive = serveInfo.isSecond
    && canDrive
    && q >= 0.48
    && pressure <= 0.82
    && serveInfo.kmh <= tune.attackSecondServeMaxKmh + 10
    && !serveInfo.stretch;

  const roll = clamp(rand(0, 1) - (identity?.attackSecondServeBias ?? 0) * (serveInfo.isSecond ? 0.55 : 0) + (identity?.chipBias ?? 0) * 0.18, 0, 1);
  let plan = 'BLOCK_RESET';
  if (secondServeAttack) {
    if (q >= 0.63 && pressure < 0.58 && roll < clamp(0.48 + (identity?.attackSecondServeBias ?? 0), 0.36, 0.62)) plan = 'DRIVE_ATTACK';
    else if (roll < 0.78) plan = 'DRIVE_NEUTRAL';
    else if (roll < 0.90) plan = 'COUNTER_UP';
    else plan = 'BLOCK_RESET';
  } else if (secondServeNeutralDrive) {
    plan = roll < 0.62 ? 'DRIVE_NEUTRAL' : roll < 0.84 ? 'COUNTER_UP' : 'BLOCK_RESET';
  } else if (serveInfo.jammed) {
    if (canChip && roll < 0.20) plan = 'CHIP_BODY';
    else if (control > 0.62) plan = roll < 0.64 ? 'BLOCK_BODY' : 'BLOCK_RESET';
    else plan = roll < 0.58 ? 'RESET_BODY' : 'BLOCK_BODY';
  } else if (serveInfo.stretch) {
    if (canChip && roll < (serveInfo.kind === 'HARD' ? 0.56 : 0.34)) plan = 'CHIP_STRETCH';
    else if (returnRead > 0.82 && q > 0.50 && pressure < 0.86 && roll > 0.84) plan = 'COUNTER_STRETCH';
    else plan = 'BLOCK_STRETCH';
  } else if (serveInfo.kind === 'HARD') {
    const chipBias = serveInfo.physType === ShotFamily.SERVE_SLICE || serveInfo.high ? 0.50 : 0.26;
    if (canChip && roll < chipBias) plan = 'CHIP_RESET';
    else if (returnRead > 0.84 && q > 0.53 && pressure < 0.78 && roll > 0.84) plan = 'COUNTER_UP';
    else plan = roll < 0.74 ? 'BLOCK_RESET' : 'BLOCK_BODY';
  }
  else if (serveInfo.kind === 'EASY' && (secondServeAttack || firstServeAttack)) plan = 'DRIVE_ATTACK';
  else if (firstServeAttack && (style?.returnAttackBias ?? 0) >= 0) plan = 'DRIVE_NEUTRAL';
  else if (serveInfo.readableKick && canDrive && q >= 0.58) plan = 'COUNTER_UP';
  else if (serveInfo.kind === 'NEUTRAL' && secondServeAttack && (style?.returnAttackBias ?? 0) >= 0) plan = 'DRIVE_NEUTRAL';
  else if (serveInfo.kind === 'NEUTRAL' && serveInfo.dir === ShotDirection.BODY) {
    if (serveInfo.isSecond && canDrive && q >= 0.52) plan = roll < 0.56 ? 'DRIVE_NEUTRAL' : 'COUNTER_UP';
    else plan = rand(0, 1) < (serveInfo.isSecond ? 0.30 : 0.58) ? 'BLOCK_BODY' : 'BLOCK_RESET';
  }

  const attacking = plan === 'DRIVE_ATTACK' || plan === 'DRIVE_NEUTRAL' || plan === 'COUNTER_UP' || plan === 'COUNTER_STRETCH';
  const family = plan.startsWith('CHIP') ? ShotFamily.CHIP_RETURN
    : attacking && canAggressiveDrive && (plan === 'DRIVE_ATTACK' || style?.flatBias > style?.topspinBias) ? ShotFamily.FLAT_DRIVE
      : attacking ? ShotFamily.TOPSPIN
      : ShotFamily.BLOCK_RETURN;
  const intent = plan === 'DRIVE_ATTACK' ? ShotIntent.PRESSURE
    : plan === 'DRIVE_NEUTRAL' || plan === 'COUNTER_UP' || plan === 'COUNTER_STRETCH' ? ShotIntent.BUILD
      : plan.startsWith('CHIP') || plan.includes('RESET') || plan.includes('STRETCH') ? ShotIntent.RESET
        : ShotIntent.CONTROL;
  const risk = plan === 'DRIVE_ATTACK' ? RiskProfile.NORMAL : RiskProfile.SAFE;
  const pill = plan.includes('STRETCH') ? 'STRETCH_RETURN'
    : plan.startsWith('CHIP') ? 'CHIP_RETURN'
      : plan === 'DRIVE_ATTACK' ? 'STEP_IN_RETURN'
        : plan === 'DRIVE_NEUTRAL' ? 'DRIVE_RETURN'
          : plan === 'COUNTER_UP' || plan === 'COUNTER_STRETCH' ? 'COUNTER_RETURN'
            : plan.includes('BODY') ? 'BODY_BLOCK_RETURN'
              : 'BLOCK_RETURN';

  return Object.freeze({ plan, family, intent, risk, pill, attacking });
}

function pickReturnOutcome({ pressure, quality, returnSkill, returnRead, family, intent, serveData, tune, returnPlanFamily }) {
  const q = quality?.quality ?? 0.5;
  const challenge = quality?.returnContact ?? {};
  const bodyState = quality?.bodyState ?? 'NEUTRAL';
  const bodyBad = bodyState === 'STRETCHED' || bodyState === 'LATE' || bodyState === 'FALLING_BACK' || bodyState === 'LOW_PICKUP';
  const blocky = family === ShotFamily.BLOCK_RETURN || family === ShotFamily.CHIP_RETURN;
  const attacking = returnPlanFamily === 'DRIVE_ATTACK' || returnPlanFamily === 'DRIVE_NEUTRAL' || returnPlanFamily === 'COUNTER_UP' || returnPlanFamily === 'COUNTER_STRETCH';
  const isSecond = serveData?.isFirst === false;
  const hardServe = !isSecond && (serveData?.delivery?.threat ?? pressure) >= 0.62;
  const technique = challenge.technique ?? returnSkill;
  const neutralization = challenge.neutralization ?? 0;
  const missChance = clamp(
    0.018
      + pressure * 0.25
      + (challenge.realEmergency ? 0.12 : challenge.compromised ? 0.05 : 0)
      + (bodyBad ? 0.04 : 0)
      + (!isSecond ? 0.025 : -0.025)
      + (attacking ? 0.045 : blocky ? -0.012 : 0)
      - technique * 0.10
      - q * 0.12,
    isSecond ? 0.010 : 0.018,
    isSecond ? 0.18 : 0.36,
  );
  const weakScore = clamp(
    pressure * 0.64
      + (1 - q) * 0.38
      + (challenge.realEmergency ? 0.20 : challenge.compromised ? 0.11 : 0)
      + (hardServe ? 0.08 : 0)
      - technique * 0.17
      - neutralization * 0.15
      - (isSecond ? 0.08 : 0),
    0,
    1,
  );
  const panicScore = clamp(pressure * 0.58 + (challenge.realEmergency ? 0.28 : 0) + (1 - q) * 0.22 - technique * 0.16, 0, 1);
  const lowSkill = returnSkill < 0.58 || q < 0.48;
  const emergencyBody = bodyState === 'FALLING_BACK' || bodyState === 'STRETCHED';
  const rescueChance = blocky && hardServe && panicScore > 0.74
    ? clamp((panicScore - 0.74) * 0.18 + (emergencyBody ? 0.025 : 0), 0, isSecond ? 0.010 : 0.060)
    : 0;

  const missRoll = rand(0, 1);
  if (missRoll < missChance) {
    const kind = rand(0, 1);
    if (kind < 0.42 || bodyState === 'LOW_PICKUP') return { kind: RETURN_OUTCOME.RETURN_NET, weakScore, missChance };
    if (kind < 0.72 || lowSkill) return { kind: RETURN_OUTCOME.RETURN_LONG, weakScore, missChance };
    return { kind: RETURN_OUTCOME.RETURN_WIDE, weakScore, missChance };
  }

  if (rand(0, 1) < rescueChance) {
    return { kind: rand(0, 1) < 0.92 ? RETURN_OUTCOME.FLOATED_RESCUE : RETURN_OUTCOME.LOBBED_RETURN, weakScore, missChance };
  }
  // Qualidade de contato baixa não pode virar um "neutral block" profundo e
  // angulado só porque o recebedor tem boa reputação técnica. Contra uma
  // entrega pesada, ele colocou a raquete na bola, mas ainda cedeu o +1.
  const physicallySoftContact = blocky && (
    q < (isSecond ? 0.40 : 0.49)
    || (challenge.compromised && q < (isSecond ? 0.47 : 0.57))
  );
  if (physicallySoftContact) {
    const roll = rand(0, 1);
    const kind = roll < 0.54 ? RETURN_OUTCOME.LOW_CENTER_BLOCK
      : roll < 0.79 ? RETURN_OUTCOME.SOFT_WIDE_BLOCK
        : roll < 0.94 ? RETURN_OUTCOME.SHORT_SITTER
          : RETURN_OUTCOME.SKID_CHIP;
    return { kind, weakScore: Math.max(weakScore, 0.62), missChance };
  }
  if (blocky && weakScore >= 0.78) {
    const roll = rand(0, 1);
    const kind = roll < 0.46 ? RETURN_OUTCOME.LOW_CENTER_BLOCK
      : roll < 0.74 ? RETURN_OUTCOME.SHORT_SITTER
        : roll < 0.92 ? RETURN_OUTCOME.SOFT_WIDE_BLOCK
          : RETURN_OUTCOME.SKID_CHIP;
    return { kind, weakScore, missChance };
  }
  if (blocky && weakScore >= tune.weakReturnScore) {
    const roll = rand(0, 1);
    const kind = family === ShotFamily.CHIP_RETURN && roll < 0.42 ? RETURN_OUTCOME.SKID_CHIP
      : roll < 0.50 ? RETURN_OUTCOME.LOW_CENTER_BLOCK
        : roll < 0.78 ? RETURN_OUTCOME.SOFT_WIDE_BLOCK
          : RETURN_OUTCOME.NEUTRAL_BLOCK;
    return { kind, weakScore, missChance };
  }
  if (attacking && q >= tune.easyReturnQuality && pressure < 0.58) {
    return { kind: returnPlanFamily === 'DRIVE_ATTACK' ? RETURN_OUTCOME.GOOD_ATTACK : RETURN_OUTCOME.GOOD_COUNTER, weakScore, missChance };
  }
  if (family === ShotFamily.CHIP_RETURN && q >= 0.56 && pressure < 0.70) return { kind: RETURN_OUTCOME.SKID_CHIP, weakScore, missChance };
  if (q >= 0.64 && pressure < 0.58) return { kind: RETURN_OUTCOME.GOOD, weakScore, missChance };
  if (blocky) return { kind: RETURN_OUTCOME.NEUTRAL_BLOCK, weakScore, missChance };
  return { kind: 'NEUTRAL', weakScore, missChance };
}

function variedDirection(serveData, canAttack, plan = '') {
  const wide = serveData?.dir === ShotDirection.WIDE || (serveData?.wideHint ?? 0) > 0.55;
  const body = serveData?.dir === ShotDirection.BODY || (serveData?.jamHint ?? 0) > 0.55;
  const isSecond = serveData?.isFirst === false;
  const roll = rand(0, 1);
  if (plan.includes('STRETCH')) return roll < 0.48 ? ShotDirection.CROSS : roll < 0.72 ? ShotDirection.CENTER : roll < 0.93 ? ShotDirection.DTL : ShotDirection.BODY;
  if (plan.startsWith('CHIP')) return roll < 0.38 ? ShotDirection.CENTER : roll < 0.68 ? ShotDirection.CROSS : roll < 0.88 ? ShotDirection.DTL : ShotDirection.BODY;
  if (plan.includes('BODY')) return roll < (isSecond ? 0.18 : 0.32) ? ShotDirection.BODY : roll < 0.62 ? ShotDirection.CENTER : roll < 0.88 ? ShotDirection.CROSS : ShotDirection.DTL;
  if (wide) return roll < 0.50 ? ShotDirection.CROSS : roll < 0.76 ? ShotDirection.CENTER : roll < 0.95 ? ShotDirection.DTL : ShotDirection.BODY;
  if (body) return roll < (isSecond ? 0.18 : 0.32) ? ShotDirection.BODY : roll < 0.62 ? ShotDirection.CENTER : roll < 0.90 ? ShotDirection.CROSS : ShotDirection.DTL;
  if (canAttack) return roll < 0.46 ? ShotDirection.CROSS : roll < 0.76 ? ShotDirection.DTL : roll < 0.92 ? ShotDirection.CENTER : ShotDirection.BODY;
  return roll < 0.42 ? ShotDirection.CENTER : roll < 0.72 ? ShotDirection.CROSS : roll < 0.92 ? ShotDirection.DTL : ShotDirection.BODY;
}

function calcServeAdvantageContext({ serveData, quality, decision }) {
  const residual = buildResidualServeAdvantage({
    delivery: serveData?.delivery,
    challenge: quality?.returnContact,
    returnOutcome: decision?.returnOutcome ?? 'NEUTRAL',
    returnPlanFamily: decision?.returnPlanFamily ?? null,
    returnQuality: quality?.quality ?? 0.5,
  });
  return Object.freeze({
    ...residual,
    reason: `delivery:${serveData?.delivery?.threat ?? 0}+return:${decision?.returnOutcome ?? 'NEUTRAL'}`,
    serveKmh: serveData?.kmh ?? 0,
    returnBodyState: quality?.bodyState ?? 'NEUTRAL',
    weakReturnScore: +(decision?.weakReturnScore ?? 0).toFixed(3),
    beneficiaryId: serveData?.serverId ?? null,
  });
}

export function decideReturnShot(context, quality) {
  const caps = context?.capabilities ?? {};
  const q = quality?.quality ?? 0.5;
  const serveData = context?.gs?._pendingServeData ?? {};
  const isSecondServe = serveData?.isFirst === false;
  const serveType = serveData?.physType ?? null;
  const tune = SHOT_TUNING.return;
  const style = resolveShotStyle(context);
  const returnSkill = caps.return ?? 0.6;
  const returnRead = returnReadiness(caps, serveData, context?.gs);
  // Leitura não faz um saque potente desaparecer. Ela reduz a parcela de
  // surpresa/forma, permitindo que um grande devolvedor reaja melhor a padrões
  // e a segundos saques sem neutralizar um primeiro saque realmente violento.
  const pressure = clamp(quality?.returnContact?.physicalDemand ?? serveData?.delivery?.threat ?? 0.45, 0, 1);
  const serveInfo = classifyServeForReturn({ serveData, quality, pressure, context, returnRead });
  const returnPlan = chooseReturnPlan({ serveInfo, quality, caps, style, returnSkill, returnRead, pressure, tune, identity: getCourtIdentity(context?.player).returnIdentity });
  const family = returnPlan.family;
  const intent = returnPlan.intent;
  const risk = returnPlan.risk;
  const buildMode = returnPlan.plan === 'DRIVE_NEUTRAL' || returnPlan.plan === 'COUNTER_UP' || returnPlan.plan === 'COUNTER_STRETCH' ? 'safe' : null;
  const direction = variedDirection(serveData, returnPlan.attacking, returnPlan.plan);

  const outcome = pickReturnOutcome({ pressure, quality, returnSkill, returnRead, family, intent, serveData, tune, returnPlanFamily: returnPlan.plan });
  const target = returnTarget(context, intent, direction, family, serveData, pressure, quality, outcome.kind, returnPlan.plan);
  const decision = Object.freeze({
    family,
    type: family,
    intent,
    direction,
    target,
    buildMode,
    styleSubType: style.archetype,
    finishProfile: style,
    risk,
    returnPlanFamily: returnPlan.plan,
    returnPill: returnPlan.pill,
    serveReturnKind: serveInfo.kind,
    serveReturnKmh: serveInfo.kmh,
    returnOutcome: outcome.kind,
    returnMissChance: +outcome.missChance.toFixed(3),
    weakReturnScore: +outcome.weakScore.toFixed(3),
    returnReadiness: +returnRead.toFixed(3),
    returnPosture: quality?.returnContact?.posture ?? null,
    returnRealEmergency: !!quality?.returnContact?.realEmergency,
    returnReactiveReach: quality?.returnContact?.reactiveReach ?? null,
    returnContact: quality?.returnContact ?? null,
    score: q * tune.scoreQualityWeight + returnSkill * tune.scoreSkillWeight - pressure * tune.pressureScorePenalty,
    reason: `return plan=${returnPlan.plan}; serveKind=${serveInfo.kind}; pressure=${pressure.toFixed(2)}; read=${returnRead.toFixed(2)}; outcome=${outcome.kind}; serve=${serveType ?? 'UNK'}:${serveData?.dir ?? 'UNK'}; secondServe=${isSecondServe}; style=${style.archetype}; q=${q.toFixed(2)}`,
  });
  if (context?.gs) {
    context.gs._serveAdvantageContext = calcServeAdvantageContext({ serveData, quality, decision });
    const residual = context.gs._serveAdvantageContext;
    if (context?.player?.ctx) {
      context.player.ctx.rallyPressure = Math.max(
        context.player.ctx.rallyPressure ?? 0,
        clamp((residual?.score ?? 0) * 0.72 + (residual?.attackableReturn ? 0.10 : 0), 0, 0.88),
      );
    }
    if (context?.opponent?.ctx) {
      context.opponent.ctx.rallyPressure = Math.min(
        context.opponent.ctx.rallyPressure ?? 0.5,
        clamp(0.42 - (residual?.score ?? 0) * 0.30, 0.06, 0.42),
      );
    }
  }
  if (context?.player?.ctx?.matchCtx) {
    context.player.ctx.matchCtx.returnHistory = [
      ...(context.player.ctx.matchCtx.returnHistory ?? []).slice(-5),
      {
        type: returnPlan.plan,
        outcome: outcome.kind,
        pressure: +pressure.toFixed(3),
        direction,
      },
    ];
    context.player.ctx.matchCtx.returnAggroMode = clamp(
      (context.player.ctx.matchCtx.returnAggroMode ?? 0) * 0.72 + (returnPlan.attacking ? 0.28 : 0.05),
      0,
      1,
    );
    context.player.ctx.matchCtx.returnPosXBias = clamp(
      (context.player.ctx.matchCtx.returnPosXBias ?? 0) * 0.70 + Math.sign(context?.ballState?.pos?.x ?? 0) * pressure * 0.12,
      -1,
      1,
    );
    context.player.ctx.matchCtx.returnDepthBias = clamp(
      (context.player.ctx.matchCtx.returnDepthBias ?? 0) * 0.70 + (serveData?.isFirst === false ? -0.10 : pressure * 0.10),
      -1,
      1,
    );
  }
  return decision;
}
