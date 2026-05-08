import { clamp } from '../../core/math.js';
import { getWingControle, getWingPotencia } from '../../domain/players/attributes.js';

export const MASTER_SHOT_DIALS = Object.freeze({
  TOPSPIN: Object.freeze({ volume: 0.86, floor: 0.00, ceiling: 1.30 }),
  DRIVE: Object.freeze({ volume: 1.08, floor: 0.00, ceiling: 1.55 }),
  SLICE: Object.freeze({ volume: 0.74, floor: 0.00, ceiling: 1.12 }),
  ACCEL: Object.freeze({ volume: 1.72, floor: 0.03, ceiling: 3.60 }),
  SHORT_ACCEL: Object.freeze({ volume: 1.62, floor: 0.02, ceiling: 3.35 }),
  BANANA: Object.freeze({ volume: 1.58, floor: 0.02, ceiling: 3.25 }),
  DROP: Object.freeze({ volume: 0.92, floor: 0.00, ceiling: 1.25 }),
  LOB: Object.freeze({ volume: 1.00, floor: 0.00, ceiling: 1.70 }),
  VOLLEY: Object.freeze({ volume: 1.00, floor: 0.00, ceiling: 1.80 }),
  HALF_VOLLEY: Object.freeze({ volume: 1.00, floor: 0.00, ceiling: 1.70 }),
  SMASH: Object.freeze({ volume: 1.00, floor: 0.00, ceiling: 1.90 }),
});

const MODERN_ATTACK_SHOTS = Object.freeze(['ACCEL', 'SHORT_ACCEL', 'BANANA']);
const LEGACY_RALLY_SHOTS = Object.freeze(['TOPSPIN', 'SLICE']);

function clonePool(pool) {
  return Object.fromEntries(Object.entries(pool ?? {}).map(([k, v]) => [k, v]));
}

function add(pool, shotType, delta) {
  pool[shotType] = Math.max(0, (pool[shotType] ?? 0) + delta);
}

function scale(pool, shotType, factor) {
  if (pool[shotType] == null) return;
  pool[shotType] = Math.max(0, pool[shotType] * factor);
}

function applyGlobalDials(pool) {
  for (const [shotType, dial] of Object.entries(MASTER_SHOT_DIALS)) {
    if (pool[shotType] == null) {
      if (dial.floor > 0) pool[shotType] = dial.floor;
      continue;
    }
    pool[shotType] = clamp(pool[shotType] * dial.volume, dial.floor, dial.ceiling);
  }
}

function getStyleAttackFit(player, prefs) {
  const buildStyle = prefs?.buildStyle ?? player?.prefs?.buildStyle ?? player?.buildStyle ?? 'VARIED';
  const riskProfile = prefs?.riskProfile ?? player?.prefs?.riskProfile ?? player?.riskProfile ?? 'CALCULATED';
  const cadence = prefs?.rallyCadence ?? player?.prefs?.rallyCadence ?? 'BALANCED';
  let fit = 0;

  if (riskProfile === 'ALLOUT') fit += 0.34;
  if (riskProfile === 'GAMBLER') fit += 0.24;
  if (buildStyle === 'DTL_HUNTER') fit += 0.24;
  if (buildStyle === 'COUNTER_REDIRECT') fit += 0.22;
  if (buildStyle === 'CROSS_SHORT_ANGLE') fit += 0.20;
  if (buildStyle === 'DROP_VARIATION') fit += 0.14;
  if (cadence === 'EXPLOSIVE') fit += 0.20;
  if (cadence === 'EARLY_ATTACK') fit += 0.16;
  if (buildStyle === 'HEAVY_SPIN_PRESSURE') fit += 0.08;
  if (riskProfile === 'SAFE' || riskProfile === 'SAFETY_FIRST') fit -= 0.24;

  return clamp(fit, -0.2, 0.95);
}

function getStyleDropFit(player, prefs) {
  const buildStyle = prefs?.buildStyle ?? player?.prefs?.buildStyle ?? player?.buildStyle ?? 'VARIED';
  const riskProfile = prefs?.riskProfile ?? player?.prefs?.riskProfile ?? player?.riskProfile ?? 'CALCULATED';
  const cadence = prefs?.rallyCadence ?? player?.prefs?.rallyCadence ?? 'BALANCED';
  let fit = 0;

  if (buildStyle === 'DROP_VARIATION') fit += 0.55;
  if (buildStyle === 'VARIED') fit += 0.24;
  if (buildStyle === 'CROSS_SHORT_ANGLE') fit += 0.18;
  if (riskProfile === 'GAMBLER') fit += 0.28;
  if (riskProfile === 'ALLOUT') fit += 0.10;
  if (cadence === 'EXPLOSIVE' || cadence === 'EARLY_ATTACK') fit += 0.12;
  if (riskProfile === 'SAFE' || riskProfile === 'SAFETY_FIRST') fit -= 0.20;

  return clamp(fit, -0.18, 1.05);
}

function getMaxQuality(feasibility, shotType, fallback) {
  return feasibility?.getMaxQuality?.(shotType) ?? fallback;
}

function applyModernAttackWindow(pool, context) {
  const { player, opponent, prefs, rally, ballTier, intent, resolvedOpts, isBackhand } = context;
  const attrs = player?.attrs ?? {};
  const contact = resolvedOpts?.contactSpace ?? {};
  const executionState = resolvedOpts?.executionState?.state ?? 'NEUTRAL';
  const diff = clamp(contact?.diff ?? 0.55, 0, 1);
  const feasibility = resolvedOpts?.feasibility ?? null;
  const maxAccelQ = getMaxQuality(feasibility, 'ACCEL', 0.65);
  const maxShortQ = getMaxQuality(feasibility, 'SHORT_ACCEL', maxAccelQ);
  const maxBananaQ = getMaxQuality(feasibility, 'BANANA', maxAccelQ);
  const maxDropQ = getMaxQuality(feasibility, 'DROP', 0.55);
  const wingPower = clamp(getWingPotencia(attrs, isBackhand) / 100, 0, 1);
  const wingControl = clamp(getWingControle(attrs, isBackhand) / 100, 0, 1);
  const topspin = clamp((attrs.topspin ?? 60) / 100, 0, 1);
  const slice = clamp((attrs.slice ?? 60) / 100, 0, 1);
  const vision = clamp((attrs.visaoTatica ?? 60) / 100, 0, 1);
  const explosiveness = clamp((attrs.explosividade ?? 60) / 100, 0, 1);
  const attackFit = getStyleAttackFit(player, prefs);
  const dropFit = getStyleDropFit(player, prefs);
  const openWindow = clamp(Math.abs(opponent?.pos?.x ?? 0) / 2.15, 0, 1);
  const oppDepth = clamp(Math.abs(opponent?.pos?.y ?? 11.885) / 11.885, 0, 1);
  const planted = executionState === 'PLANTED';
  const onRise = executionState === 'ON_RISE';
  const neutral = executionState === 'NEUTRAL';
  const finish = intent === 'FINISH';
  const pressure = intent === 'PRESSURE';
  const build = intent === 'BUILD';
  const opportunity = ballTier === 'OPPORTUNITY';
  const neutralChance = ballTier === 'NEUTRAL' && (neutral || onRise) && diff < 0.70;
  const attackWindow = planted || onRise || opportunity || finish || pressure || neutralChance;

  if (!attackWindow || rally <= 0 || intent === 'RESET' || intent === 'APPROACH') {
    return {
      executionState,
      attackFit,
      physicalGate: 0,
      surge: 0,
      added: {},
    };
  }

  const physicalGate = clamp(
    (1 - diff) * 0.25 +
    maxAccelQ * 0.25 +
    wingPower * 0.21 +
    wingControl * 0.11 +
    explosiveness * 0.10 +
    vision * 0.08,
    0,
    1,
  );
  const intentMult = finish ? 2.25 : pressure ? 1.72 : opportunity ? 1.62 : build ? 1.18 : 1.0;
  const stateMult = planted ? 2.65 : onRise ? 1.75 : neutral ? 1.38 : 1.0;
  const profileMult = clamp(0.70 + attackFit + (wingPower - 0.62) * 1.10 + (explosiveness - 0.62) * 0.72, 0.45, 2.45);
  const openMult = 1 + openWindow * 0.34;
  const surge = intentMult * stateMult * profileMult * openMult;
  const enoughForAccel = physicalGate > 0.50 && maxAccelQ > 0.24 && wingPower > 0.58 && wingControl > 0.46;
  const enoughForShort = physicalGate > 0.47 && maxShortQ > 0.22 && wingPower > 0.54 && vision > 0.48;
  const enoughForBanana = physicalGate > 0.46 && maxBananaQ > 0.20 && topspin > 0.55 && wingPower > 0.50;
  const dropWindow = (
    oppDepth > 0.50 &&
    diff < 0.70 &&
    maxDropQ > 0.22 &&
    !finish &&
    (planted || opportunity || neutralChance || pressure || build)
  );
  const dropSkillGate = clamp(
    vision * 0.42 +
    slice * 0.28 +
    wingControl * 0.16 +
    dropFit * 0.18 +
    (oppDepth - 0.50) * 0.24 -
    diff * 0.10,
    0,
    1,
  );
  const enoughForDrop = dropWindow && dropSkillGate > 0.54;

  if (enoughForAccel) {
    const profile = clamp((wingPower - 0.52) * 1.65 + (wingControl - 0.48) * 0.62 + attackFit * 0.48, 0.18, 1.25);
    add(pool, 'ACCEL', 0.16 * profile * surge);
    scale(pool, 'ACCEL', 1 + 0.82 * profile * surge);
    add(pool, 'DRIVE', 0.06 * profile * Math.min(surge, 2.6));
  }
  if (enoughForShort) {
    const profile = clamp((vision - 0.48) * 1.10 + (wingPower - 0.50) * 1.05 + openWindow * 0.48 + attackFit * 0.36, 0.12, 1.15);
    add(pool, 'SHORT_ACCEL', 0.12 * profile * surge);
    scale(pool, 'SHORT_ACCEL', 1 + 0.72 * profile * surge);
  }
  if (enoughForBanana) {
    const profile = clamp((topspin - 0.52) * 1.42 + (wingPower - 0.50) * 0.82 + openWindow * 0.54 + attackFit * 0.30, 0.12, 1.18);
    add(pool, 'BANANA', 0.12 * profile * surge);
    scale(pool, 'BANANA', 1 + 0.78 * profile * surge);
  }
  if (enoughForDrop) {
    const profile = clamp(
      (vision - 0.46) * 1.32 +
      (slice - 0.42) * 0.92 +
      (wingControl - 0.48) * 0.58 +
      (oppDepth - 0.50) * 1.02 +
      dropFit * 0.48,
      0.16,
      1.05,
    );
    const dropSurge = Math.min(surge, 2.05) * (1 + Math.max(0, oppDepth - 0.62) * 0.42 + Math.max(0, dropFit) * 0.26);
    add(pool, 'DROP', 0.055 * profile * dropSurge);
    scale(pool, 'DROP', 1 + 0.32 * profile * Math.min(dropSurge, 2.2));
    if (planted || neutralChance || opportunity) {
      scale(pool, 'TOPSPIN', 0.90);
      scale(pool, 'DRIVE', 0.94);
    }
  }

  const legacySuppression = planted || finish || pressure || (neutralChance && attackFit > 0.18);
  if (legacySuppression) {
    const cut = clamp(0.72 - attackFit * 0.18 - (planted ? 0.16 : 0) - (finish ? 0.12 : 0), 0.32, 0.78);
    for (const shotType of LEGACY_RALLY_SHOTS) scale(pool, shotType, shotType === 'SLICE' ? clamp(cut - 0.10, 0.24, 0.70) : cut);
    if (finish || planted) scale(pool, 'LOB', 0.72);
  }

  return {
    executionState,
    attackFit,
      physicalGate,
      dropSkillGate,
      dropFit,
      surge,
    added: {
      ACCEL: enoughForAccel,
      SHORT_ACCEL: enoughForShort,
      BANANA: enoughForBanana,
        DROP: enoughForDrop,
    },
  };
}

export function applyMasterShotDecisionPolicy(poolIn, context = {}) {
  const pool = clonePool(poolIn);
  applyGlobalDials(pool);
  const attackTrace = applyModernAttackWindow(pool, context);
  applyGlobalDials(pool);

  return {
    pool,
    trace: {
      layer: 'MASTER_SHOT_DECISION_POLICY',
      dials: MASTER_SHOT_DIALS,
      intent: context.intent,
      ballTier: context.ballTier,
      rally: context.rally,
      attack: {
        ...attackTrace,
        attackFit: +(attackTrace.attackFit ?? 0).toFixed(3),
        physicalGate: +(attackTrace.physicalGate ?? 0).toFixed(3),
        surge: +(attackTrace.surge ?? 0).toFixed(3),
      },
      finalWeights: Object.fromEntries(
        [...MODERN_ATTACK_SHOTS, 'DROP', 'DRIVE', ...LEGACY_RALLY_SHOTS]
          .map(shotType => [shotType, +(pool[shotType] ?? 0).toFixed(4)]),
      ),
    },
  };
}
