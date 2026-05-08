import { clamp } from '../../core/math.js';
import { getWingControle, getWingPotencia } from '../../domain/players/attributes.js';

const HALF_L = 11.885;

const HEIGHT_LIFT = Object.freeze({
  DIRT: 0.18,
  ANKLE: 0.34,
  HIP: 0.62,
  SWEET: 0.88,
  SHOULDER: 0.74,
  HIGH: 0.58,
  OVERHEAD: 0.82,
});

const SWING_READY = Object.freeze({
  REFLEX: 0.30,
  BLOCKED: 0.52,
  COMPACT: 0.74,
  FULL: 0.94,
});

const SHOT_THOUGHT_PROFILES = Object.freeze({
  TOPSPIN:    { family: 'RALLY', aggression: 0.46, liftNeed: 0.34, depthNeed: 0.74, prepNeed: 0.34, controlNeed: 0.40, netNeed: 0.30, spinHelp: 0.20, difficultBias: 0.16, opportunityBias: 0.14, intentFit: { BUILD: 1.0, PRESSURE: 0.96, FINISH: 0.72, APPROACH: 0.82, RESET: 0.70 } },
  DRIVE:      { family: 'RALLY', aggression: 0.58, liftNeed: 0.38, depthNeed: 0.78, prepNeed: 0.44, controlNeed: 0.48, netNeed: 0.38, spinHelp: 0.10, difficultBias: 0.02, opportunityBias: 0.18, intentFit: { BUILD: 0.86, PRESSURE: 1.0, FINISH: 0.84, APPROACH: 0.90, RESET: 0.46 } },
  // [FIX-INTENTFIT] ACCEL: BUILD 0.52→0.68, SHORT_ACCEL: BUILD 0.42→0.62, DROP: BUILD 0.50→0.62, PRESSURE 0.68→0.78
  // Motivo: no BUILD, estes shots eram penalizados pelo thoughtLayer mesmo em situações
  // favoráveis (bola fácil, quadra aberta), resultando em multiplier baixo que esmagava
  // os pesos de pool já baixos. Com valores mais altos, a thoughtLayer deixa de ser
  // um freio indireto e passa a refletir melhor a adequação situacional real.
  ACCEL:      { family: 'ATTACK', aggression: 0.82, liftNeed: 0.48, depthNeed: 0.84, prepNeed: 0.62, controlNeed: 0.64, netNeed: 0.56, spinHelp: 0.06, difficultBias: -0.22, opportunityBias: 0.24, intentFit: { BUILD: 0.68, PRESSURE: 0.96, FINISH: 1.0, APPROACH: 0.86, RESET: 0.18 } },
  SHORT_ACCEL:{ family: 'ATTACK', aggression: 0.76, liftNeed: 0.42, depthNeed: 0.54, prepNeed: 0.58, controlNeed: 0.68, netNeed: 0.52, spinHelp: 0.08, difficultBias: -0.18, opportunityBias: 0.22, intentFit: { BUILD: 0.62, PRESSURE: 0.90, FINISH: 1.0, APPROACH: 0.70, RESET: 0.12 } },
  SLICE:      { family: 'CONTROL', aggression: 0.30, liftNeed: 0.18, depthNeed: 0.66, prepNeed: 0.24, controlNeed: 0.36, netNeed: 0.16, spinHelp: 0.14, difficultBias: 0.22, opportunityBias: -0.02, intentFit: { BUILD: 0.88, PRESSURE: 0.76, FINISH: 0.28, APPROACH: 1.0, RESET: 0.92 } },
  DROP:       { family: 'TOUCH', aggression: 0.50, liftNeed: 0.28, depthNeed: 0.20, prepNeed: 0.58, controlNeed: 0.76, netNeed: 0.34, spinHelp: 0.04, difficultBias: -0.20, opportunityBias: 0.20, intentFit: { BUILD: 0.62, PRESSURE: 0.78, FINISH: 0.80, APPROACH: 0.20, RESET: 0.10 } },
  LOB:        { family: 'DEFENSE', aggression: 0.40, liftNeed: 0.54, depthNeed: 0.76, prepNeed: 0.22, controlNeed: 0.34, netNeed: 0.18, spinHelp: 0.10, difficultBias: 0.30, opportunityBias: 0.02, intentFit: { BUILD: 0.56, PRESSURE: 0.42, FINISH: 0.12, APPROACH: 0.08, RESET: 1.0 } },
  VOLLEY:     { family: 'NET', aggression: 0.62, liftNeed: 0.18, depthNeed: 0.44, prepNeed: 0.28, controlNeed: 0.48, netNeed: 0.18, spinHelp: 0.02, difficultBias: 0.10, opportunityBias: 0.18, intentFit: { BUILD: 0.34, PRESSURE: 0.72, FINISH: 0.96, APPROACH: 0.86, RESET: 0.22 } },
  HALF_VOLLEY:{ family: 'NET', aggression: 0.24, liftNeed: 0.14, depthNeed: 0.40, prepNeed: 0.16, controlNeed: 0.44, netNeed: 0.14, spinHelp: 0.02, difficultBias: 0.28, opportunityBias: -0.10, intentFit: { BUILD: 0.44, PRESSURE: 0.34, FINISH: 0.14, APPROACH: 0.20, RESET: 0.86 } },
  SMASH:      { family: 'NET', aggression: 0.92, liftNeed: 0.08, depthNeed: 0.70, prepNeed: 0.42, controlNeed: 0.42, netNeed: 0.04, spinHelp: 0.00, difficultBias: 0.00, opportunityBias: 0.26, intentFit: { BUILD: 0.10, PRESSURE: 0.64, FINISH: 1.0, APPROACH: 0.42, RESET: 0.02 } },
  BANANA:     { family: 'ATTACK', aggression: 0.78, liftNeed: 0.40, depthNeed: 0.64, prepNeed: 0.58, controlNeed: 0.72, netNeed: 0.54, spinHelp: 0.20, difficultBias: -0.18, opportunityBias: 0.22, intentFit: { BUILD: 0.26, PRESSURE: 0.80, FINISH: 0.96, APPROACH: 0.38, RESET: 0.06 } },
});

function getOpenWindow(opponent) {
  return clamp(Math.abs(opponent?.pos?.x ?? 0) / 2.3, 0, 1);
}

function isCreativeAttackProfile(player, prefs) {
  const buildStyle = prefs?.buildStyle ?? player?.prefs?.buildStyle ?? player?.buildStyle ?? 'VARIED';
  const riskProfile = prefs?.riskProfile ?? player?.prefs?.riskProfile ?? player?.riskProfile ?? 'CALCULATED';
  const archetype = getCompetitiveArchetype(player);
  return (
    riskProfile === 'GAMBLER' ||
    riskProfile === 'ALLOUT' ||
    buildStyle === 'DROP_VARIATION' ||
    buildStyle === 'COUNTER_REDIRECT' ||
    buildStyle === 'CROSS_SHORT_ANGLE' ||
    buildStyle === 'DTL_HUNTER' ||
    archetype === 'ARTIST' ||
    archetype === 'REBEL' ||
    archetype === 'PREDATOR'
  );
}

function getPlayerStyleFit(prefs, shotType) {
  const buildStyle = prefs?.buildStyle ?? 'VARIED';
  const netGame = prefs?.netGame ?? 'RELUCTANT';
  const riskProfile = prefs?.riskProfile ?? 'CALCULATED';
  const rallyCadence = prefs?.rallyCadence ?? 'BALANCED';
  let fit = 0.58;

  switch (buildStyle) {
    case 'HEAVY_SPIN_PRESSURE':
      if (shotType === 'TOPSPIN') fit += 0.26;
      if (shotType === 'ACCEL' || shotType === 'DRIVE') fit += 0.08;
      if (shotType === 'DROP') fit -= 0.08;
      break;
    case 'SLICE_CONTROL':
      if (shotType === 'SLICE') fit += 0.28;
      if (shotType === 'DROP' || shotType === 'DRIVE') fit += 0.08;
      if (shotType === 'ACCEL') fit -= 0.06;
      break;
    case 'DROP_VARIATION':
      if (shotType === 'DROP') fit += 0.30;
      if (shotType === 'SHORT_ACCEL') fit += 0.14;
      if (shotType === 'BANANA') fit += 0.08;
      break;
    case 'COUNTER_REDIRECT':
      if (shotType === 'DRIVE' || shotType === 'ACCEL') fit += 0.16;
      if (shotType === 'SHORT_ACCEL') fit += 0.10;
      if (shotType === 'BANANA') fit += 0.08;
      if (shotType === 'TOPSPIN') fit += 0.08;
      break;
    case 'CROSS_SHORT_ANGLE':
      if (shotType === 'SHORT_ACCEL' || shotType === 'BANANA') fit += 0.24;
      if (shotType === 'ACCEL') fit += 0.08;
      break;
    case 'CENTRE_CONTROL':
      if (shotType === 'TOPSPIN' || shotType === 'DRIVE' || shotType === 'SLICE') fit += 0.12;
      if (shotType === 'BANANA' || shotType === 'DROP') fit -= 0.08;
      break;
    case 'DTL_HUNTER':
      if (shotType === 'DRIVE' || shotType === 'ACCEL') fit += 0.14;
      if (shotType === 'SHORT_ACCEL') fit += 0.08;
      break;
  }

  switch (netGame) {
    case 'HUNTER':
    case 'PROACTIVE':
      if (shotType === 'SLICE' || shotType === 'VOLLEY' || shotType === 'SMASH') fit += 0.12;
      break;
    case 'AVOIDS':
      if (shotType === 'VOLLEY' || shotType === 'SMASH') fit -= 0.14;
      break;
  }

  switch (riskProfile) {
    case 'SAFETY_FIRST':
    case 'SAFE':
      if (shotType === 'TOPSPIN' || shotType === 'SLICE' || shotType === 'LOB') fit += 0.08;
      if (shotType === 'ACCEL' || shotType === 'BANANA') fit -= 0.12;
      break;
    case 'GAMBLER':
    case 'ALLOUT':
      if (shotType === 'ACCEL' || shotType === 'SHORT_ACCEL' || shotType === 'BANANA') fit += 0.16;
      if (shotType === 'DROP') fit += 0.10;
      if (shotType === 'LOB') fit -= 0.10;
      break;
  }

  switch (rallyCadence) {
    case 'PATIENT':
    case 'MEASURED':
      if (shotType === 'TOPSPIN' || shotType === 'SLICE' || shotType === 'DRIVE') fit += 0.08;
      if (shotType === 'ACCEL') fit -= 0.06;
      break;
    case 'EARLY_ATTACK':
    case 'EXPLOSIVE':
      if (shotType === 'ACCEL' || shotType === 'DRIVE') fit += 0.10;
      if (shotType === 'SHORT_ACCEL' || shotType === 'BANANA') fit += 0.08;
      break;
  }

  return clamp(fit, 0, 1);
}

function getCompetitiveArchetype(player) {
  return (
    player?.personality?.competitiveArchetype?.id ??
    player?.personality?.competitiveArchetype ??
    player?.competitiveArchetype ??
    null
  );
}

function getRallyMemoryScore(player, shotType, intent) {
  const ctx = player?.ctx ?? {};
  const creativeAttackProfile = isCreativeAttackProfile(player, player?.prefs ?? null);
  const recentSlice = clamp((ctx._recentSliceCount ?? 0) / 3, 0, 1);
  const recentDrop = clamp((ctx._recentDropCount ?? 0) / 2, 0, 1);
  const recentAngle = clamp((ctx._recentShortAngleCount ?? 0) / 2, 0, 1);
  const lastIntent = ctx.currentIntent ?? null;
  let score = 0.56;

  if (shotType === 'SLICE') score -= recentSlice * 0.18;
  if (shotType === 'DROP') score -= recentDrop * (creativeAttackProfile ? 0.12 : 0.24);
  if (shotType === 'SHORT_ACCEL' || shotType === 'BANANA') score -= recentAngle * (creativeAttackProfile ? 0.10 : 0.18);

  if (lastIntent === 'BUILD' && intent === 'FINISH' && (shotType === 'ACCEL' || shotType === 'SHORT_ACCEL' || shotType === 'BANANA')) {
    score += 0.12;
  }
  if (lastIntent === 'PRESSURE' && intent === 'PRESSURE' && (shotType === 'DRIVE' || shotType === 'TOPSPIN')) {
    score -= 0.06;
  }
  if (ctx._pointPatternPlan?.active && ctx._pointPatternPlan?.shotBias === shotType) {
    score += 0.14;
  }
  if (ctx._constructionPatternPlan?.active && ctx._constructionPatternPlan?.shotBias === shotType) {
    score += 0.12;
  }

  return clamp(score, 0, 1);
}

function getPointMomentScore(scoreState, player, shotType, profile) {
  const importance = clamp(scoreState?.importance ?? 1, 1, 2);
  const isBreakPoint = !!scoreState?.isBreakPoint;
  const isMatchPoint = !!scoreState?.isMatchPoint;
  const creativeAttackProfile = isCreativeAttackProfile(player, player?.prefs ?? null);
  const mentalidade = clamp((player?.attrs?.mentalidade ?? 60) / 100, 0.2, 1);
  const clutch = clamp(player?.mods?.clutchFactor ?? mentalidade, 0.2, 1.1);
  const pressureTolerance = clamp(mentalidade * 0.55 + clutch * 0.45, 0.2, 1);
  const aggression = profile.aggression ?? 0.5;
  let score = 0.58 + (pressureTolerance - 0.5) * 0.18;

  if (importance > 1.2) {
    score -= Math.max(0, aggression - pressureTolerance) * 0.22 * (importance - 1);
    score += Math.max(0, pressureTolerance - aggression) * 0.10 * (importance - 1);
  }
  if (isBreakPoint && (shotType === 'TOPSPIN' || shotType === 'SLICE' || shotType === 'DRIVE')) score += 0.06;
  if (isBreakPoint && (shotType === 'DROP' || shotType === 'BANANA')) score -= creativeAttackProfile ? 0.02 : 0.06;
  if (isMatchPoint && aggression > 0.72) score -= Math.max(0, 0.76 - pressureTolerance) * 0.20;
  if (isMatchPoint && creativeAttackProfile && (shotType === 'ACCEL' || shotType === 'SHORT_ACCEL' || shotType === 'BANANA')) {
    score += 0.03;
  }
  if (isMatchPoint && (shotType === 'LOB' || shotType === 'HALF_VOLLEY')) score += 0.04;

  return clamp(score, 0, 1);
}

function getPersonalityFit(player, shotType, intent, profile) {
  const archetype = getCompetitiveArchetype(player);
  let fit = 0.56;

  switch (archetype) {
    case 'TACTICIAN':
      if (shotType === 'DRIVE' || shotType === 'SLICE' || shotType === 'TOPSPIN') fit += 0.16;
      if (intent === 'BUILD' || intent === 'PRESSURE') fit += 0.06;
      break;
    case 'WARRIOR':
      if (shotType === 'TOPSPIN' || shotType === 'LOB' || shotType === 'ACCEL') fit += 0.12;
      if (intent === 'RESET' || intent === 'PRESSURE') fit += 0.08;
      break;
    case 'ARTIST':
      if (shotType === 'DROP' || shotType === 'BANANA' || shotType === 'SHORT_ACCEL') fit += 0.22;
      if (shotType === 'ACCEL') fit += 0.08;
      if (shotType === 'LOB') fit += 0.08;
      break;
    case 'PREDATOR':
      if (shotType === 'ACCEL' || shotType === 'SMASH' || shotType === 'DRIVE') fit += 0.18;
      if (shotType === 'SHORT_ACCEL' || shotType === 'BANANA') fit += 0.12;
      if (intent === 'FINISH') fit += 0.08;
      break;
    case 'PERFECTIONIST':
      if (shotType === 'TOPSPIN' || shotType === 'DRIVE' || shotType === 'SLICE') fit += 0.12;
      if (shotType === 'DROP' || shotType === 'BANANA') fit -= 0.08;
      break;
    case 'REBEL':
      if (shotType === 'BANANA' || shotType === 'DROP' || shotType === 'ACCEL') fit += 0.16;
      if (shotType === 'SHORT_ACCEL') fit += 0.10;
      break;
    case 'DREAMER':
      if (shotType === 'TOPSPIN' || shotType === 'LOB' || shotType === 'DROP') fit += 0.10;
      break;
  }

  return clamp(fit, 0, 1);
}

function getFatigueBehaviorFit(player, prefs, shotType, intent, profile) {
  const stamina = clamp(player?.stamina ?? 1, 0, 1);
  const fatigue = 1 - stamina;
  if (fatigue < 0.18) return 0.56;

  const riskProfile = prefs?.riskProfile ?? 'CALCULATED';
  const rallyCadence = prefs?.rallyCadence ?? 'BALANCED';
  const buildStyle = prefs?.buildStyle ?? 'VARIED';
  let fit = 0.56;

  // Base: golpes neutros deixam de ser automaticamente "seguros" quando o corpo pesa.
  // O sistema deve empurrar alguns perfis para encurtar, outros para respirar com margem.
  if (fatigue > 0.34 && (shotType === 'TOPSPIN' || shotType === 'DRIVE')) fit -= 0.05 * fatigue;

  switch (riskProfile) {
    case 'GAMBLER':
    case 'ALLOUT':
      if (fatigue > 0.28 && (shotType === 'ACCEL' || shotType === 'SHORT_ACCEL' || shotType === 'BANANA')) fit += 0.12 * fatigue;
      if (fatigue > 0.24 && shotType === 'DROP') fit += 0.08 * fatigue;
      if (shotType === 'LOB' || shotType === 'HALF_VOLLEY') fit -= 0.05 * fatigue;
      break;
    case 'SAFE':
    case 'SAFETY_FIRST':
      if ((shotType === 'TOPSPIN' || shotType === 'SLICE' || shotType === 'LOB') && fatigue > 0.24) fit += 0.10 * fatigue;
      if (shotType === 'ACCEL' || shotType === 'BANANA') fit -= 0.08 * fatigue;
      break;
    default:
      if (fatigue > 0.30 && shotType === 'DRIVE') fit += 0.05 * fatigue;
      break;
  }

  switch (rallyCadence) {
    case 'EXPLOSIVE':
    case 'EARLY_ATTACK':
      if (fatigue > 0.26 && (shotType === 'ACCEL' || shotType === 'DRIVE')) fit += 0.08 * fatigue;
      break;
    case 'PATIENT':
    case 'MEASURED':
      if (fatigue > 0.26 && (shotType === 'TOPSPIN' || shotType === 'SLICE')) fit += 0.07 * fatigue;
      break;
  }

  if (buildStyle === 'HEAVY_SPIN_PRESSURE' && fatigue > 0.38) {
    if (shotType === 'TOPSPIN') fit -= 0.04 * fatigue;
    if (shotType === 'DRIVE') fit += 0.05 * fatigue;
  }

  return clamp(fit, 0, 1);
}

function getExecutionIntentBoost(resolvedOpts, shotType, intent) {
  const executionState = resolvedOpts?.executionState?.state ?? 'NEUTRAL';
  let boost = 0;

  if (executionState === 'PLANTED') {
    if (shotType === 'ACCEL') boost += 0.24;
    if (shotType === 'SHORT_ACCEL') boost += 0.22;
    if (shotType === 'BANANA') boost += 0.20;
  }

  if (intent === 'FINISH') {
    if (shotType === 'ACCEL') boost += 0.16;
    if (shotType === 'SHORT_ACCEL') boost += 0.14;
    if (shotType === 'BANANA') boost += 0.16;
  }

  return clamp(0.56 + boost, 0, 1);
}

function getControl(player, isBackhand) {
  const attrs = player?.attrs ?? {};
  return clamp(getWingControle(attrs, isBackhand ?? false) / 100, 0.25, 1);
}

function getPower(player, isBackhand) {
  const attrs = player?.attrs ?? {};
  return clamp(getWingPotencia(attrs, isBackhand ?? false) / 100, 0.25, 1);
}

function getSpinSkill(player, shotType) {
  const attrs = player?.attrs ?? {};
  if (shotType === 'SLICE' || shotType === 'DROP' || shotType === 'HALF_VOLLEY') {
    return clamp((attrs.slice ?? 60) / 100, 0.2, 1);
  }
  return clamp((attrs.topspin ?? 60) / 100, 0.2, 1);
}

function estimateNetMargin(contactSpace, shotType, player, opponent, profile) {
  const heightLift = HEIGHT_LIFT[contactSpace?.heightZone ?? 'HIP'] ?? 0.5;
  const diff = clamp(contactSpace?.diff ?? 0.5, 0, 1);
  const distanceToNet = Math.max(0.8, Math.abs(player?.pos?.y ?? HALF_L));
  const openWindow = getOpenWindow(opponent);
  const contactBonus = (1 - diff) * 0.26;
  const spinBonus = getSpinSkill(player, shotType) * profile.spinHelp;
  const geometryPenalty = clamp((distanceToNet - 7.2) / 6.5, 0, 0.18);
  const anglePenalty = openWindow * profile.netNeed * 0.16;
  return clamp(heightLift + contactBonus + spinBonus - geometryPenalty - anglePenalty, 0, 1);
}

function estimateDepthWindow(contactSpace, swingPrep, player, shotType, profile) {
  const qCeiling = clamp(contactSpace?.qCeiling ?? 0.72, 0.1, 1);
  const ready = SWING_READY[swingPrep?.swingType ?? 'BLOCKED'] ?? 0.52;
  const power = getPower(player, player?._isBackhand ?? false);
  const base = qCeiling * 0.48 + ready * 0.22 + power * 0.20 + (1 - profile.aggression) * 0.10;
  return clamp(base, 0, 1);
}

function estimatePrepTimeWindow(contactSpace, swingPrep, player, profile) {
  const arrival = clamp((contactSpace?.arrivalMarginS ?? 0.25 + 0.20) / 0.95, 0, 1);
  const prepTime = clamp(swingPrep?.prepTimeFactor ?? 0.52, 0, 1);
  const swingReady = SWING_READY[swingPrep?.swingType ?? 'BLOCKED'] ?? 0.52;
  const leitura = clamp((player?.attrs?.leitura ?? 60) / 100, 0.2, 1);
  const raw = arrival * 0.34 + prepTime * 0.38 + swingReady * 0.18 + leitura * 0.10;
  return clamp(raw, 0, 1);
}

function estimateMovementWindow(contactSpace, swingPrep, player, profile) {
  const lateralVel = Math.abs(player?.vel?.x ?? 0);
  const forwardVel = Math.abs(player?.vel?.y ?? 0);
  const speedPressure = clamp(lateralVel / 5.8, 0, 1) * 0.72 + clamp(forwardVel / 6.4, 0, 1) * 0.28;
  const balance = clamp(swingPrep?.balanceFactor ?? 0.8, 0, 1);
  const footwork = clamp(swingPrep?.footworkFactor ?? 0.8, 0, 1);
  const explosiveness = clamp((player?.attrs?.explosividade ?? 60) / 100, 0.2, 1);
  const offsetStress = clamp((contactSpace?.lateralOffset ?? 0) / 1.2, 0, 1);
  return clamp(balance * 0.38 + footwork * 0.30 + explosiveness * 0.12 + (1 - speedPressure) * 0.12 + (1 - offsetStress) * 0.08, 0, 1);
}

function estimateOpponentPressure(opponent, player, ballTier, profile) {
  const oppAtNet = !!opponent?.atNet || Math.abs(opponent?.pos?.y ?? HALF_L) < HALF_L * 0.35;
  const oppRecovering = Math.abs(opponent?.vel?.x ?? 0) > 0.45;
  const oppDepth = clamp(Math.abs(opponent?.pos?.y ?? HALF_L) / HALF_L, 0, 1);
  const playerWide = clamp(Math.abs(player?.pos?.x ?? 0) / 4.115, 0, 1);
  let pressure = 0.18 + playerWide * 0.22;
  if (oppAtNet) pressure += 0.24;
  if (!oppRecovering) pressure += 0.08;
  pressure += (1 - oppDepth) * 0.10;
  if (ballTier === 'DIFFICULT') pressure += 0.10;
  return clamp(pressure, 0, 1);
}

function estimateControlWindow(contactSpace, swingPrep, player, shotType, profile, feasibilityMaxQuality) {
  const qCeiling = clamp(contactSpace?.qCeiling ?? 0.72, 0.1, 1);
  const control = getControl(player, player?._isBackhand ?? false);
  const ready = SWING_READY[swingPrep?.swingType ?? 'BLOCKED'] ?? 0.52;
  const maxQ = clamp(feasibilityMaxQuality ?? 1, 0, 1);
  const touchBonus = (shotType === 'DROP' ? control * 0.12 : 0) + (shotType === 'SLICE' ? getSpinSkill(player, shotType) * 0.06 : 0);
  return clamp(maxQ * 0.46 + qCeiling * 0.24 + control * 0.22 + ready * 0.08 + touchBonus, 0, 1);
}

function estimateTacticalFit(intent, ballTier, opponent, player, profile) {
  const openWindow = getOpenWindow(opponent);
  const oppAtNet = !!opponent?.atNet || Math.abs(opponent?.pos?.y ?? HALF_L) < HALF_L * 0.35;
  const oppRecovering = Math.abs(opponent?.vel?.x ?? 0) > 0.45;
  const oppDepth = clamp(Math.abs(opponent?.pos?.y ?? HALF_L) / HALF_L, 0, 1);
  const baseIntent = profile.intentFit?.[intent] ?? 0.6;
  let score = baseIntent;
  if (ballTier === 'DIFFICULT') score += profile.difficultBias ?? 0;
  if (ballTier === 'OPPORTUNITY') score += profile.opportunityBias ?? 0;
  if (oppAtNet && (profile.family === 'ATTACK' || shotTypeIsPassingLike(profile))) score += 0.08;
  if (oppAtNet && profile.family === 'DEFENSE') score += 0.10;
  score += openWindow * (profile.family === 'ATTACK' ? 0.12 : profile.family === 'RALLY' ? 0.06 : 0.02);
  if (!oppAtNet && profile.family === 'ATTACK' && (openWindow > 0.24 || oppRecovering)) score += 0.08;
  if (!oppAtNet && profile.family === 'TOUCH' && oppDepth > 0.72 && openWindow < 0.30) score += 0.12;
  if (!oppAtNet && profile.family === 'TOUCH' && oppRecovering) score += 0.06;
  if ((player?.ctx?.netPhase ?? 'BASE') !== 'BASE' && profile.family === 'NET') score += 0.14;
  return clamp(score, 0, 1);
}

function shotTypeIsPassingLike(profile) {
  return profile.family === 'ATTACK';
}

function computeRiskPenalty({
  ballTier,
  contactSpace,
  swingPrep,
  profile,
  intent,
  controlScore,
  netScore,
  depthScore,
  prepTimeScore,
  movementScore,
  opponentPressure,
}) {
  const diff = clamp(contactSpace?.diff ?? 0.5, 0, 1);
  const ready = SWING_READY[swingPrep?.swingType ?? 'BLOCKED'] ?? 0.52;
  let penalty = 0;
  penalty += profile.aggression * 0.24 * diff;
  penalty += profile.prepNeed > ready ? (profile.prepNeed - ready) * 0.26 : 0;
  penalty += profile.prepNeed > prepTimeScore ? (profile.prepNeed - prepTimeScore) * 0.24 : 0;
  penalty += profile.controlNeed > controlScore ? (profile.controlNeed - controlScore) * 0.22 : 0;
  penalty += profile.liftNeed > netScore ? (profile.liftNeed - netScore) * 0.32 : 0;
  penalty += profile.depthNeed > depthScore ? (profile.depthNeed - depthScore) * 0.20 : 0;
  penalty += opponentPressure * profile.aggression * 0.20;
  penalty += (1 - movementScore) * profile.aggression * 0.16;
  if (ballTier === 'DIFFICULT') penalty += profile.aggression * 0.14;
  if (intent === 'RESET' && profile.aggression > 0.6) penalty += 0.16;
  return clamp(penalty, 0, 0.92);
}

export function evaluateShotThoughtLayer({
  player,
  opponent,
  ballTier,
  resolvedOpts,
  pool,
  intent,
  isBackhand,
  prefs,
}) {
  const thoughtScores = {};
  const contactSpace = resolvedOpts?.contactSpace ?? null;
  const swingPrep = resolvedOpts?.swingPrep ?? null;
  const feasibility = resolvedOpts?.feasibility ?? null;
  const scoreState = resolvedOpts?.scoreState ?? null;
  const topReasons = [];

  for (const [shotType, baseValue] of Object.entries(pool ?? {})) {
    if (!(baseValue > 0)) continue;
    const profile = SHOT_THOUGHT_PROFILES[shotType];
    if (!profile) {
      thoughtScores[shotType] = { score: 0.56, multiplier: 1.0 };
      continue;
    }
    const feasibilityMaxQuality = feasibility?.getMaxQuality?.(shotType) ?? 0;
    if (feasibilityMaxQuality <= 0) {
      thoughtScores[shotType] = { score: 0, multiplier: 0 };
      continue;
    }
    player._isBackhand = isBackhand ?? false;
    const netScore = estimateNetMargin(contactSpace, shotType, player, opponent, profile);
    const depthScore = estimateDepthWindow(contactSpace, swingPrep, player, shotType, profile);
    const controlScore = estimateControlWindow(contactSpace, swingPrep, player, shotType, profile, feasibilityMaxQuality);
    const tacticalScore = estimateTacticalFit(intent, ballTier, opponent, player, profile);
    const prepTimeScore = estimatePrepTimeWindow(contactSpace, swingPrep, player, profile);
    const movementScore = estimateMovementWindow(contactSpace, swingPrep, player, profile);
    const styleFitScore = getPlayerStyleFit(prefs, shotType);
    const opponentPressure = estimateOpponentPressure(opponent, player, ballTier, profile);
    const rallyMemoryScore = getRallyMemoryScore(player, shotType, intent);
    const pointMomentScore = getPointMomentScore(scoreState, player, shotType, profile);
    const personalityFitScore = getPersonalityFit(player, shotType, intent, profile);
    const fatigueBehaviorFit = getFatigueBehaviorFit(player, prefs, shotType, intent, profile);
    const executionIntentBoost = getExecutionIntentBoost(resolvedOpts, shotType, intent);
    const prepReadiness = clamp(
      (SWING_READY[swingPrep?.swingType ?? 'BLOCKED'] ?? 0.52) * 0.35 +
      prepTimeScore * 0.40 +
      movementScore * 0.25,
      0,
      1,
    );
    const riskPenalty = computeRiskPenalty({
      ballTier,
      contactSpace,
      swingPrep,
      profile,
      intent,
      controlScore,
      netScore,
      depthScore,
      prepTimeScore,
      movementScore,
      opponentPressure,
    });
    const score = clamp(
      netScore * 0.30 +
      depthScore * 0.16 +
      controlScore * 0.14 +
      prepReadiness * 0.12 +
      prepTimeScore * 0.08 +
      movementScore * 0.08 +
      styleFitScore * 0.06 +
      rallyMemoryScore * 0.06 +
      pointMomentScore * 0.06 +
      personalityFitScore * 0.06 +
      fatigueBehaviorFit * 0.08 +
      executionIntentBoost * 0.14 +
      tacticalScore * 0.12 -
      opponentPressure * 0.10 -
      riskPenalty,
      0,
      1,
    );
    const multiplier = clamp(0.24 + score * 1.28, 0, 1.42);
    thoughtScores[shotType] = {
      score,
      multiplier,
      netScore,
      depthScore,
      controlScore,
      prepReadiness,
      prepTimeScore,
      movementScore,
      styleFitScore,
      rallyMemoryScore,
      pointMomentScore,
      personalityFitScore,
      fatigueBehaviorFit,
      executionIntentBoost,
      tacticalScore,
      opponentPressure,
      riskPenalty,
      feasibilityMaxQuality,
    };
  }

  const adjustedPool = {};
  for (const [shotType, baseValue] of Object.entries(pool ?? {})) {
    const thought = thoughtScores[shotType];
    adjustedPool[shotType] = thought ? baseValue * thought.multiplier : baseValue;
  }

  const ranked = Object.entries(thoughtScores)
    .sort((a, b) => (b[1]?.score ?? 0) - (a[1]?.score ?? 0))
    .slice(0, 3);

  for (const [shotType, thought] of ranked) {
    if (!thought) continue;
    const weakLink =
      thought.opponentPressure > 0.66 ? 'pressure'
      : thought.fatigueBehaviorFit < 0.42 ? 'fatiguePlan'
      : thought.pointMomentScore < 0.42 ? 'bigPoint'
      : thought.rallyMemoryScore < 0.44 ? 'memory'
      : thought.personalityFitScore < 0.42 ? 'personality'
      : thought.prepTimeScore < 0.48 ? 'prep'
      : thought.movementScore < 0.48 ? 'movement'
      : thought.netScore < thought.depthScore && thought.netScore < thought.controlScore ? 'net'
      : thought.depthScore < thought.controlScore ? 'depth'
      : 'control';
    topReasons.push({
      shotType,
      score: thought.score,
      weakLink,
      summary:
        weakLink === 'pressure' ? 'opponent pressure is shrinking the attack window'
        : weakLink === 'fatiguePlan' ? 'fatigue is pushing toward a different tempo or shot family'
        : weakLink === 'bigPoint' ? 'the point moment is asking for a safer or more natural choice'
        : weakLink === 'memory' ? 'rally memory suggests it is time to vary the pattern'
        : weakLink === 'personality' ? 'this shot clashes with the player competitive personality'
        : weakLink === 'prep' ? 'did not have enough prep time for a clean version of this shot'
        : weakLink === 'movement' ? 'body is too stretched or unstable for this shot quality'
        : weakLink === 'net' ? 'needs more arc to clear the net safely'
        : weakLink === 'depth' ? 'may not carry deep enough with this contact'
        : 'needs cleaner control to avoid spray',
    });
  }

  return {
    adjustedPool,
    thoughtScores,
    topReasons,
  };
}
