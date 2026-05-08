import { applyExecutionStateBias } from '../../core/executionState.js';
import { resolvePointPatternPlan, applyPointPatternBias } from './pointPatterns.js';
import { applyWingIdentityBias } from './wingIdentity.js';
import { SHOT_POOLS } from './shotPoolsConfig.js';
import { resolveShotIntent } from './shotIntentSystem.js';
import {
  applyBuildStyleToPool,
  applyFeasibilityFilter,
  applyMatchReadToPool,
  applyNetGameToApproachPool,
  applyRiskProfileToPool,
  adjustPoolBySituation,
} from './shotPoolAdjusters.js';
import { computeProfileTemperature, normalizeAndPick } from './shotTemperatureModel.js';
import { evaluateShotThoughtLayer } from './shotThoughtLayer.js';
import { applyMasterShotDecisionPolicy } from './masterShotDecisionPolicy.js';

function clonePool(pool) {
  return Object.fromEntries(Object.entries(pool ?? {}).map(([k, v]) => [k, v]));
}

function getBasePool(intent, prefs, rally, ctx) {
  if (intent === 'APPROACH') {
    return applyNetGameToApproachPool(prefs?.netGame, rally, ctx);
  }
  return clonePool(SHOT_POOLS[intent]?.[prefs?.riskProfile] ?? SHOT_POOLS.BUILD.CALCULATED);
}

export function runShotDecisionEngine({
  player,
  opponent,
  attrs,
  prefs,
  rally,
  ballTier,
  resolvedOpts,
  wingIdentity,
  isBackhand,
  applyNetPhaseBias,
}) {
  const ctx = player?.ctx ?? {};
  const intentPack = resolveShotIntent(player, opponent, ballTier, rally, prefs, ctx);
  ctx.currentIntent = intentPack.intent;
  ctx._lastIntentDiagnostics = intentPack.diagnostics ?? null;

  let pool = getBasePool(intentPack.intent, prefs, rally, ctx);
  pool = applyBuildStyleToPool(pool, prefs?.buildStyle, intentPack.intent, { ballTier, rally, ctx });
  pool = applyRiskProfileToPool(pool, prefs?.riskProfile, intentPack.intent);
  // Snapshot tirado APÓS buildStyle + riskProfile — representa o "perfil base" do jogador,
  // antes dos ajustes situacionais que variam a cada shot.
  const poolBeforeAdjustments = clonePool(pool);

  pool = adjustPoolBySituation(pool, player, opponent, ballTier, { ...(resolvedOpts ?? {}), gsRally: rally }, intentPack.intent);
  pool = applyMatchReadToPool(pool, player);
  pool = applyFeasibilityFilter(pool, resolvedOpts?.feasibility);
  const thoughtLayer = evaluateShotThoughtLayer({
    player,
    opponent,
    ballTier,
    resolvedOpts,
    pool,
    intent: intentPack.intent,
    isBackhand,
    prefs,
  });
  pool = thoughtLayer.adjustedPool;

  const pointPatternPlan = resolvePointPatternPlan(player, opponent, rally);
  if (ctx) ctx._pointPatternPlan = pointPatternPlan;
  pool = applyExecutionStateBias(pool, resolvedOpts?.executionState ?? null);
  pool = applyPointPatternBias(pool, pointPatternPlan);

  const netPhase = player?.ctx?.netPhase ?? 'BASE';
  pool = applyNetPhaseBias(pool, netPhase);
  pool = applyWingIdentityBias(pool, wingIdentity, isBackhand, rally);
  const masterShotPolicy = applyMasterShotDecisionPolicy(pool, {
    player,
    opponent,
    prefs,
    rally,
    ballTier,
    intent: intentPack.intent,
    resolvedOpts,
    isBackhand,
  });
  pool = masterShotPolicy.pool;
  if (ctx) {
    ctx._masterShotDecisionPolicyTrace = masterShotPolicy.trace;
    ctx._modernAttackShotPolicyTrace = masterShotPolicy.trace?.attack ?? null;
  }

  const temperature = computeProfileTemperature(prefs, attrs, ctx, intentPack.intent);
  const pick = normalizeAndPick(pool, temperature);

  return {
    intentPack,
    pointPatternPlan,
    netPhase,
    poolBeforeAdjustments,
    poolAfterAdjustments: pool,
    thoughtLayer,
    situationTrace: ctx._lastShotSituationTrace ?? null,
    normalizedPool: pick.normalizedPool,
    probabilities: pick.probabilities,
    temperature,
    shotType: pick.shotType,
  };
}

