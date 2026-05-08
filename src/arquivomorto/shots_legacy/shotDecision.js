// shotDecision.js — Shot System v5 | Intent-Stratified Selection
// ═══════════════════════════════════════════════════════════════════
// Ponto de entrada do sistema de decisão de golpe.
// A lógica de seleção vive em shotDecisionEngine.js e seus módulos.
//
// ARQUITETURA:
//   prepQuality + feasibility   ← contactSpace + swingPrepEngine (intocáveis)
//   resolveIntent()             ← RESET | BUILD | PRESSURE | APPROACH | FINISH
//   buildShotPool(intent)       ← SHOT_POOLS × riskProfile
//   adjustPoolBySituation()     ← deltas situacionais bounded
//   normalizeAndPick()          ← softmax com temperatura por perfil
//   execução                    ← fatorAttr × pressão → qualidade real
//
// Exporta:
//   decideShotAndBuild(player, opponent, prepQuality, opts) → { shot, aiTrace }
// ═══════════════════════════════════════════════════════════════════
import { SHOT_PHYSICS, SPIN_MAP }                     from './shotPhysics.js';
import { isShotBlueprintIsolado }                     from '../../config/SHOTS_CONFIG.js';
import { applySignaturePhysics, SIGNATURE_SHOTS }     from './SignatureShots.js';
import { clamp, rand }                                from '../../core/math.js';
import { COURT }                                      from '../../core/constants.js';
import { generatePrefs }                              from '../../domain/players/playerPrefs.js';
import { getWingPotencia, getWingControle }           from '../../domain/players/attributes.js';
import { applyExecutionStateBias }                    from '../../core/executionState.js';
import { resolvePointPatternPlan, applyPointPatternBias } from './pointPatterns.js';
import { deriveWingIdentity, applyWingIdentityBias } from './wingIdentity.js';
import { DECISAO } from '../../config/DECISAO_CONFIG.js';
import { DEGRADACAO_CONFIG } from '../../config/CONTATO_CONFIG.js';
import { runShotDecisionEngine } from './shotDecisionEngine.js';
import { buildStratifiedAiTrace } from './shotDecisionTrace.js';
import { getPlayerTraits, getTraitEffects } from '../traits/TraitSystem.js';

// ── Wing helpers locais ───────────────────────────────────────────
// isBackhand é passado via opts.isBackhand (computado em game.js a partir
// da posição relativa bola-jogador). Default false = forehand se não informado.
function wingPotencia(attrs, isBackhand) {
  return getWingPotencia(attrs, isBackhand ?? false);
}
function wingControle(attrs, isBackhand) {
  return getWingControle(attrs, isBackhand ?? false);
}

function isSignatureWingCompatible(sigWing, wing, shotType) {
  if (sigWing === 'ANY' || sigWing === wing) return true;
  if (sigWing === 'NET' && wing === 'NET') return true;
  if (sigWing === 'SERVE' && wing === 'SERVE') return true;
  if ((wing === 'FH' || wing === 'BH') && (sigWing === 'FH' || sigWing === 'BH') && ['TOPSPIN', 'ACCEL', 'SLICE', 'DROP', 'SHORT_ACCEL', 'BANANA', 'DRIVE'].includes(shotType)) return true;
  return false;
}

function resolveTraitSignature(player, shotType, wing, prepQuality, opts = {}) {
  const noop = { triggered: false };
  const traits = getPlayerTraits(player).filter((trait) => trait.family === 'SIGNATURE' && trait.shotFamily?.key);
  if (!traits.length) return noop;

  const compatibles = traits.filter((trait) => {
    const sig = trait.shotFamily;
    if (!sig) return false;
    if (sig.baseType !== shotType) return false;
    return isSignatureWingCompatible(sig.wing, wing, shotType);
  });
  if (!compatibles.length) return noop;

  const picked = compatibles[0];
  const sigKey = picked.shotFamily.key;
  const sigDef = SIGNATURE_SHOTS[sigKey];
  if (!sigDef) return noop;

  let chance = 0.22;
  chance += clamp((prepQuality - 0.45) * 0.45, 0, 0.16);
  if (opts.isBigPoint) chance += 0.08;
  if (player.ctx?.momentum > 0.65) chance += 0.05;
  if (player.ctx?.underPressure) chance -= 0.04;
  chance = clamp(chance, 0.12, 0.48);
  if (Math.random() > chance) return noop;

  return {
    triggered: true,
    signatureKey: sigKey,
    source: 'TRAIT',
    label: sigDef.label,
    emoji: sigDef.emoji,
    description: sigDef.description,
    physics: sigDef.physics,
  };
}

function buildLiveTraitEnv(player, opponent, rally, opts = {}, resolvedOpts = {}) {
  const scoreState = resolvedOpts.scoreState ?? opts.scoreState ?? {};
  const bestOf = opts.bestOf ?? player?.ctx?.bestOf ?? opponent?.ctx?.bestOf ?? (player?.ctx?.setsToWin === 3 ? 5 : 3);
  const playerGames = player?.games ?? player?.ctx?.games ?? 0;
  const oppGames = opponent?.games ?? opponent?.ctx?.games ?? 0;
  const playerSets = player?.sets ?? player?.ctx?.sets ?? 0;
  const oppSets = opponent?.sets ?? opponent?.ctx?.sets ?? 0;
  const totalSets = playerSets + oppSets;
  const stamina = player?.stamina ?? player?.ctx?.stamina ?? 1;
  const inTiebreak = !!(opts.inTiebreak || player?.ctx?.inTiebreak || player?.ctx?.tieBreakActive);
  const isServing = !!(opts.isServe || player?.ctx?.isServing);
  const isReturning = !!(opts.isReturn || (!isServing && rally === 1));
  const extraContexts = [];
  if (resolvedOpts.executionState?.state === 'PLANTED') extraContexts.push('rally');

  return {
    surface: opts.surface ?? player?.ctx?.surface ?? player?.ctx?.courtSurface ?? player?.ctx?.courtMeta?.surface ?? 'HARD',
    bestOf,
    inTiebreak,
    isServing,
    isReturning,
    isAtNet: !!(player?.atNet || player?.ctx?.courtMode === 'NET'),
    isBreakPoint: !!scoreState.isBreakPoint,
    isMatchPoint: !!scoreState.isMatchPoint,
    isSlam: !!(opts.isSlam || player?.ctx?.isSlam || player?.ctx?.tournamentLevel === 'GS'),
    roundLabel: opts.roundLabel ?? player?.ctx?.roundLabel ?? player?.ctx?.round,
    totalSets,
    playerGames,
    oppGames,
    playerSets,
    oppSets,
    rally,
    energy: stamina,
    fatigued: stamina <= 0.42 || resolvedOpts.executionState?.state === 'LATE' || resolvedOpts.executionState?.state === 'STRETCHED',
    extraContexts,
  };
}

function resolveLiveTraitRuntime(player, opponent, shotType, rally, opts = {}, resolvedOpts = {}) {
  const env = buildLiveTraitEnv(player, opponent, rally, opts, resolvedOpts);
  const effects = getTraitEffects(player, env);
  const directBias = effects.shotBias?.[shotType] ?? 0;
  const approachBias = (shotType === 'VOLLEY' || shotType === 'SMASH' || shotType === 'HALF_VOLLEY')
    ? (effects.shotBias?.APPROACH ?? 0)
    : 0;
  const returnAttackBias = env.isReturning ? (effects.shotBias?.RETURN_ATTACK ?? 0) * 0.6 : 0;
  return {
    env,
    effects,
    shotBias: directBias + approachBias + returnAttackBias,
  };
}

function normalizeShotPool(scores = {}) {
  const entries = Object.entries(scores).filter(([, value]) => Number.isFinite(value) && value > 0);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  if (total <= 0) return {};
  const normalized = {};
  for (const [shotType, value] of entries) normalized[shotType] = value / total;
  return normalized;
}

function pickShotTypeFromPool(scores = {}, fallback = 'TOPSPIN') {
  const entries = Object.entries(scores).filter(([, value]) => Number.isFinite(value) && value > 0);
  if (!entries.length) return fallback;
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  if (total <= 0) return fallback;
  let roll = Math.random() * total;
  for (const [shotType, value] of entries) {
    roll -= value;
    if (roll <= 0) return shotType;
  }
  return entries[entries.length - 1][0] ?? fallback;
}

function getTraitSelectionMultiplier(shotType, directBias, signatureMatches) {
  let multiplier = 1 + Math.max(0, directBias) * 1.2;
  if (!signatureMatches.length) return clamp(multiplier, 0.7, 4.2);

  for (const trait of signatureMatches) {
    const sig = trait?.shotFamily;
    if (!sig) continue;
    if (sig.baseType === shotType) {
      if (shotType === 'DROP') multiplier *= 2.85;
      else if (shotType === 'BANANA') multiplier *= 2.55;
      else if (shotType === 'SHORT_ACCEL') multiplier *= 2.45;
      else if (shotType === 'ACCEL') multiplier *= 2.3;
      else multiplier *= 2.0;
    }
  }

  return clamp(multiplier, 0.7, 5.4);
}

function applyTraitShotSelectionBias(pool, player, opponent, rally, opts = {}, resolvedOpts = {}) {
  const env = buildLiveTraitEnv(player, opponent, rally, opts, resolvedOpts);
  const effects = getTraitEffects(player, env);
  const currentWing = player.atNet ? 'NET'
    : (opts.isServe ? 'SERVE'
    : ((opts.isBackhand ?? false) ? 'BH' : 'FH'));
  const signatureTraits = getPlayerTraits(player).filter((trait) => trait.family === 'SIGNATURE' && trait.shotFamily?.baseType);
  const boostedPool = {};
  const selectionBias = {};

  for (const [shotType, value] of Object.entries(pool ?? {})) {
    if (!Number.isFinite(value) || value <= 0) {
      boostedPool[shotType] = value;
      continue;
    }

    const signatureMatches = signatureTraits.filter((trait) => {
      const sig = trait.shotFamily;
      return sig?.baseType === shotType && isSignatureWingCompatible(sig.wing, currentWing, shotType);
    });
    const directBias = (effects.shotBias?.[shotType] ?? 0)
      + ((shotType === 'VOLLEY' || shotType === 'SMASH' || shotType === 'HALF_VOLLEY') ? (effects.shotBias?.APPROACH ?? 0) * 0.5 : 0)
      + (env.isReturning && ['DRIVE', 'ACCEL', 'SHORT_ACCEL', 'BANANA'].includes(shotType) ? (effects.shotBias?.RETURN_ATTACK ?? 0) * 0.55 : 0);
    const multiplier = getTraitSelectionMultiplier(shotType, directBias, signatureMatches);
    boostedPool[shotType] = value * multiplier;

    if (multiplier > 1.02) {
      selectionBias[shotType] = {
        multiplier,
        directBias,
        signatures: signatureMatches.map((trait) => trait.name),
      };
    }
  }

  return {
    env,
    effects,
    boostedPool,
    normalizedPool: normalizeShotPool(boostedPool),
    probabilities: normalizeShotPool(boostedPool),
    selectionBias,
  };
}

function applyLiveTraitExecutionQuality(baseQuality, runtime) {
  const fx = runtime?.effects ?? {};
  const env = runtime?.env ?? {};
  let delta =
    (fx.precision ?? 0) * 0.016 +
    (fx.composure ?? 0) * 0.010 +
    (fx.adaptation ?? 0) * 0.006;

  if (env.isServing) delta += (fx.serveQuality ?? 0) * 0.014;
  if (env.isReturning) delta += (fx.returnQuality ?? 0) * 0.013;
  if ((env.rally ?? 0) >= 4) delta += (fx.rallyTolerance ?? 0) * 0.010;
  if (env.fatigued) delta += (fx.fatigueResistance ?? 0) * 0.014;
  if (env.isBreakPoint || env.inTiebreak || env.isMatchPoint) delta += (fx.clutch ?? 0) * 0.012;

  return clamp(baseQuality * (1 + clamp(delta, -0.12, 0.14)), 0.05, 0.985);
}

function applyLiveTraitIntensity(baseIntensity, shotType, runtime) {
  const fx = runtime?.effects ?? {};
  const env = runtime?.env ?? {};
  let delta =
    (fx.power ?? 0) * 0.018 +
    (runtime?.shotBias ?? 0) * 0.028 +
    (fx.adaptation ?? 0) * 0.004;

  if (env.isServing) delta += (fx.serveQuality ?? 0) * 0.010;
  if (env.isReturning) delta += (fx.returnQuality ?? 0) * 0.010;
  if (['TOPSPIN', 'ACCEL', 'SHORT_ACCEL', 'BANANA', 'DRIVE'].includes(shotType)) delta += (fx.topspin ?? 0) * 0.010;
  if (['SLICE', 'DROP', 'VOLLEY', 'HALF_VOLLEY'].includes(shotType)) delta += (fx.slice ?? 0) * 0.008;

  return clamp(baseIntensity + clamp(delta, -0.12, 0.16), 0.05, 0.98);
}

function applyLiveTraitFinish(shot, shotType, runtime) {
  const fx = runtime?.effects ?? {};
  const env = runtime?.env ?? {};
  const powerBoost = clamp(
    (fx.power ?? 0) * 0.012 +
    (env.isServing ? (fx.serveQuality ?? 0) * 0.014 : 0) +
    (env.isReturning ? (fx.returnQuality ?? 0) * 0.008 : 0),
    -0.05,
    0.07,
  );
  const precisionLean = clamp(
    (fx.precision ?? 0) * 0.012 +
    (fx.composure ?? 0) * 0.008 +
    ((env.isBreakPoint || env.inTiebreak || env.isMatchPoint) ? (fx.clutch ?? 0) * 0.008 : 0),
    -0.06,
    0.06,
  );
  const topspinLean = clamp((fx.topspin ?? 0) * 0.08, -0.18, 0.22);
  const sliceLean = clamp((fx.slice ?? 0) * 0.08, -0.18, 0.22);

  shot.power *= 1 + powerBoost;
  shot.netClearance = clamp(shot.netClearance * (1 - precisionLean * 0.45), 0.08, 4.0);

  if (['TOPSPIN', 'ACCEL', 'SHORT_ACCEL', 'BANANA', 'DRIVE', 'LOB'].includes(shotType)) {
    shot.spinZ *= 1 + topspinLean;
  }
  if (['SLICE', 'DROP', 'VOLLEY', 'HALF_VOLLEY'].includes(shotType)) {
    shot.spinX *= 1 + sliceLean;
  }

  shot._traitExecutionDelta = clamp(powerBoost + precisionLean, -0.12, 0.12);
  shot._traitShotBias = runtime?.shotBias ?? 0;
  shot._traitContexts = runtime?.env ? Object.keys(runtime.env).filter((key) => runtime.env[key] === true) : [];
}

// ── Modo de isolamento de shots ───────────────────────────────────
// 0 = jogo normal
// 1 = só entram no pool os golpes marcados com `isolar: true` no SHOTS_CONFIG
export const MODO_ISOLAMENTO_SHOT = 0;

function aplicarIsolamentoDeShots(scores) {
  if (MODO_ISOLAMENTO_SHOT !== 1) return scores;

  const tiposIsolados = Object.keys(scores).filter(tipo => scores[tipo] > 0 && isShotBlueprintIsolado(tipo));
  if (tiposIsolados.length === 0) return scores;

  const filtrado = {};
  for (const [tipo, valor] of Object.entries(scores)) {
    filtrado[tipo] = tiposIsolados.includes(tipo) ? valor : 0;
  }
  return filtrado;
}

const HALF_L = 11.885;
const HALF_S = 4.115;

function clampUnit(v) {
  return clamp(v, 0, 1);
}

function getControlCraftProfile(player) {
  const attrs = player?.attrs ?? {};
  const isBackhand = player?._isBackhand ?? false;
  const controle = wingControle(attrs, isBackhand) / 100;
  const potencia = wingPotencia(attrs, isBackhand) / 100;
  const leitura = (attrs.leitura ?? 60) / 100;
  const edge = clamp(controle - potencia, -0.45, 0.45);
  const angleCraft = clamp(
    (controle - 0.55) * 0.26 + Math.max(0, edge) * 0.34 + (leitura - 0.55) * 0.14,
    0,
    0.22,
  );
  const placementSpread = clamp(
    (controle - 0.56) * 0.60 + Math.max(0, edge) * 0.88 + (leitura - 0.55) * 0.20,
    0,
    0.34,
  );
  const antiCompression = clamp((controle - 0.60) * 0.55 + Math.max(0, edge) * 0.80, 0, 0.18);
  return { controle, potencia, leitura, edge, angleCraft, placementSpread, antiCompression };
}

function applyNetPhaseBias(scores, netPhase = 'BASE') {
  if (!scores || netPhase === 'BASE') return scores;
  const s = { ...scores };

  switch (netPhase) {
    case 'APPROACH':
      if ((s.SLICE ?? 0) > 0) s.SLICE = Math.min(s.SLICE + DECISAO.net_approach_slice_bonus, 1.0);
      if ((s.DRIVE ?? 0) > 0) s.DRIVE = Math.min(s.DRIVE + DECISAO.net_approach_drive_bonus, 1.0);
      if ((s.ACCEL ?? 0) > 0) s.ACCEL = Math.min(s.ACCEL + DECISAO.net_approach_accel_bonus, 1.0);
      if ((s.TOPSPIN ?? 0) > 0) s.TOPSPIN = Math.min(s.TOPSPIN + DECISAO.net_approach_topspin_bonus, 1.0);
      if ((s.DROP ?? 0) > 0) s.DROP = Math.max(0, s.DROP - DECISAO.net_approach_drop_penalidade);
      break;
    case 'FIRST_VOLLEY':
      if ((s.VOLLEY ?? 0) > 0) s.VOLLEY = Math.min(s.VOLLEY + DECISAO.net_firstvolley_volley_bonus, 1.0);
      if ((s.HALF_VOLLEY ?? 0) > 0) s.HALF_VOLLEY = Math.min(s.HALF_VOLLEY + DECISAO.net_firstvolley_halfvolley_bonus, 1.0);
      if ((s.SMASH ?? 0) > 0) s.SMASH = Math.min(s.SMASH + DECISAO.net_firstvolley_smash_bonus, 1.0);
      if ((s.BANANA ?? 0) > 0) s.BANANA = Math.max(0, s.BANANA - DECISAO.net_firstvolley_banana_penalidade);
      if ((s.DROP ?? 0) > 0) s.DROP = Math.max(0, s.DROP - DECISAO.net_firstvolley_drop_penalidade);
      break;
    case 'CLOSE_FINISH':
      if ((s.VOLLEY ?? 0) > 0) s.VOLLEY = Math.min(s.VOLLEY + DECISAO.net_closefinish_volley_bonus, 1.0);
      if ((s.SMASH ?? 0) > 0) s.SMASH = Math.min(s.SMASH + DECISAO.net_closefinish_smash_bonus, 1.0);
      if ((s.ACCEL ?? 0) > 0) s.ACCEL = Math.min(s.ACCEL + DECISAO.net_closefinish_accel_bonus, 1.0);
      if ((s.HALF_VOLLEY ?? 0) > 0) s.HALF_VOLLEY = Math.max(0, s.HALF_VOLLEY - DECISAO.net_closefinish_halfvolley_penalidade);
      break;
  }

  return s;
}

function computeSpatialContext(player, opponent) {
  const side = player.side ?? 1;
  const playerX = player.pos?.x ?? 0;
  const playerY = player.pos?.y ?? (side * HALF_L);
  const oppX = opponent?.pos?.x ?? 0;
  const oppY = opponent?.pos?.y ?? (-side * HALF_L);
  const oppAtNet = opponent?.atNet ?? (Math.abs(oppY) < HALF_L * 0.35);
  const oppDepth = clampUnit(Math.abs(oppY) / HALF_L);
  const lateralOpenDir = Math.abs(oppX) > 0.30 ? -Math.sign(oppX) : (playerX <= 0 ? 1 : -1);
  const jamDir = Math.abs(oppX) > 0.25 ? Math.sign(oppX) : -lateralOpenDir;
  const oppMovingX = opponent?.vel?.x ?? 0;
  const oppRecovering = Math.abs(oppMovingX) > 0.45;
  const bodyX = clamp(oppX * 0.82, -HALF_S + 0.4, HALF_S - 0.4);
  const centreBias = clamp(-playerX * 0.18, -0.8, 0.8);
  const crossDir = lateralOpenDir;
  const dtlDir = -crossDir;
  return {
    side,
    playerX,
    playerY,
    oppX,
    oppY,
    oppAtNet,
    oppDepth,
    lateralOpenDir,
    jamDir,
    oppRecovering,
    bodyX,
    centreBias,
    crossDir,
    dtlDir,
  };
}

function isOverheadOpportunity(player, opponent, opts = {}) {
  const ballZ = opts.ballZ ?? 0;
  const ballVZ = opts.ballVZ ?? 0;
  const spatial = computeSpatialContext(player, opponent);
  const descendingOrFlat = ballVZ <= 0.75;
  const overheadHeight = ballZ >= 2.00;
  const heightZone = opts.contactSpace?.heightZone ?? 'HIP';
  const overheadWindow = heightZone === 'OVERHEAD' ? HALF_L * 0.95 : HALF_L * 0.72;
  const reachableWindow = Math.abs(spatial.playerY) < overheadWindow;
  // Na rede: condições normais
  if (player?.atNet) return overheadHeight && descendingOrFlat && reachableWindow;
  // Fora da rede: só quando a bola vem muito alta (quase lob) e é alcançável
  // heightZone OVERHEAD ou HIGH com bola descendo — presente do adversário
  const isVeryHighBall = overheadHeight || heightZone === 'OVERHEAD' || (heightZone === 'HIGH' && ballZ >= 1.85);
  const diff = opts.contactSpace?.diff ?? 0.4;
  const reachable = heightZone === 'OVERHEAD' ? reachableWindow : (diff < 0.55 && reachableWindow);
  return isVeryHighBall && descendingOrFlat && reachable;
}

function isVolleyOpportunityFromBaseline(player, opponent, opts = {}) {
  // Jogador fora da rede mas bola vem alta e alcançável no ar — volley de interceptação
  if (player?.atNet) return false; // atNet já tem lógica própria
  if (opts?.ballHasBounced || (opts?.ballBounceCount ?? 0) > 0) return false;
  const ballVZ = opts.ballVZ ?? 0;
  const heightZone = opts.contactSpace?.heightZone ?? 'HIP';
  const diff = opts.contactSpace?.diff ?? 0.4;
  const spatial = computeSpatialContext(player, opponent);
  const descendingOrFlat = ballVZ <= 0.55;
  const highEnough = heightZone === 'HIGH' || heightZone === 'SHOULDER' || heightZone === 'OVERHEAD';
  const reachable = diff < 0.50 && Math.abs(spatial.playerY) < HALF_L * 0.80;
  return highEnough && descendingOrFlat && reachable;
}

function promoteNetOpportunityShot(decision, player, opponent, opts = {}) {
  const pool = { ...(decision?.normalizedPool ?? {}) };
  const currentShot = decision?.shotType ?? 'TOPSPIN';
  const overheadOpportunity = isOverheadOpportunity(player, opponent, opts);
  const baselineVolleyOpportunity = isVolleyOpportunityFromBaseline(player, opponent, opts);
  const atNet = !!player?.atNet || player?.ctx?.courtMode === 'NET';
  const netPhase = player?.ctx?.netPhase ?? 'BASE';
  const ballHasBounced = !!opts?.ballHasBounced || (opts?.ballBounceCount ?? 0) > 0;
  const liveNetBall = atNet || netPhase === 'FIRST_VOLLEY' || netPhase === 'CLOSE_FINISH';
  const volleyScore = pool.VOLLEY ?? 0;
  const smashScore = pool.SMASH ?? 0;
  const halfVolleyScore = pool.HALF_VOLLEY ?? 0;
  const currentScore = pool[currentShot] ?? 0;
  const smashAttr = (player?.attrs?.smash ?? 60) / 100;
  const volleyAttr = (player?.attrs?.volley ?? 60) / 100;
  const overheadBias = clamp((smashAttr - volleyAttr) * 0.18 + Math.max(0, smashAttr - 0.68) * 0.10, -0.04, 0.12);

  if (overheadOpportunity && smashScore > 0) {
    return smashScore + 0.15 + overheadBias >= currentScore ? 'SMASH' : currentShot;
  }

  if (liveNetBall && !ballHasBounced) {
    if (['HIGH', 'OVERHEAD'].includes(opts.contactSpace?.heightZone ?? 'HIP')) {
      return smashScore + overheadBias > Math.max(volleyScore + 0.02, currentScore - 0.02) ? 'SMASH' : (volleyScore > 0 ? 'VOLLEY' : currentShot);
    }
    return volleyScore > 0 ? 'VOLLEY' : currentShot;
  }

  if (liveNetBall && ballHasBounced && halfVolleyScore > 0) {
    return halfVolleyScore + 0.04 >= currentScore ? 'HALF_VOLLEY' : currentShot;
  }

  if ((atNet || baselineVolleyOpportunity || netPhase === 'FIRST_VOLLEY' || netPhase === 'CLOSE_FINISH') && volleyScore > 0) {
    const goodVolleyWindow = ['ANKLE', 'HIP', 'SWEET', 'SHOULDER', 'HIGH'].includes(opts.contactSpace?.heightZone ?? 'HIP');
    if (goodVolleyWindow && volleyScore + 0.06 >= currentScore) {
      return 'VOLLEY';
    }
  }

  return currentShot;
}

function getShotSpinAttrMultiplier(shotType, attrs = {}) {
  if (shotType === 'TOPSPIN' || shotType === 'DRIVE' || shotType === 'BANANA') {
    const topspinAttr = attrs?.topspin ?? 50;
    return 0.72 + (topspinAttr / 100) * 0.77;
  }
  if (shotType === 'SLICE' || shotType === 'SLICE_SHORT' || shotType === 'HALF_VOLLEY') {
    const sliceAttr = attrs?.slice ?? 50;
    return 0.72 + (sliceAttr / 100) * 0.77;
  }
  return 1.0;
}

function chooseShotMotive(player, opponent, shotType, prefs, prepQuality, shotIntensity, executionQuality, finalScores, opts = {}) {
  const spatial = computeSpatialContext(player, opponent);
  const ballTier = player?.ctx?._lastBallTier ?? 'NEUTRAL';
  const contactDiff = opts.contactSpace?.diff ?? 0.5;
  const rally = opts.gsRally ?? 0;
  const netPhase = player?.ctx?.netPhase ?? 'BASE';
  const wingIdentity = opts.wingIdentity ?? player?._wingIdentity ?? deriveWingIdentity(player);
  const isBackhand = opts.isBackhand ?? false;
  const currentIntent = player?.ctx?.currentIntent ?? 'BUILD';
  const weakReturnBoost = clamp(player?.ctx?._weakReturnBoost ?? 0, 0, 1);
  const netIntent = clamp(player?.ctx?.netIntent ?? 0, 0, 1);
  const openWindow = clampUnit(Math.abs(spatial.oppX) / 2.3);
  const courtOpen = Math.abs(spatial.oppX) > 1.5 || Math.abs(spatial.playerX) / HALF_S < 0.3;
  const pressureWindow = currentIntent === 'FINISH' || currentIntent === 'PRESSURE';
  const sequencePlan =
    (player?.ctx?._servePatternPlan?.active && rally <= (player.ctx._servePatternPlan.expiresRally ?? 1))
      ? player.ctx._servePatternPlan
      : (player?.ctx?._returnRecoveryPlan?.active && rally <= (player.ctx._returnRecoveryPlan.expiresRally ?? 2))
        ? player.ctx._returnRecoveryPlan
        : null;
  const constructionPlan =
    (player?.ctx?._constructionPatternPlan?.active && rally <= (player.ctx._constructionPatternPlan.expiresRally ?? 2))
      ? player.ctx._constructionPatternPlan
      : null;

  let motive = 'NEUTRALIZE';

  if (spatial.oppAtNet) {
    const passingLaneOpen = openWindow > 0.22 || spatial.oppRecovering;
    const hardContact = contactDiff > 0.68 || ballTier === 'DIFFICULT';

    if (shotType === 'LOB') {
      motive = hardContact || executionQuality < 0.52 ? 'LOB_ESCAPE' : 'LOB_PRESSURE';
    } else if (shotType === 'SHORT_ACCEL' || shotType === 'BANANA') {
      motive = passingLaneOpen ? (openWindow > 0.28 ? 'PASS_CC' : 'PASS_DTL') : 'JAM_BODY';
    } else if (shotType === 'ACCEL' || shotType === 'DRIVE') {
      motive = passingLaneOpen ? 'PASS_DTL' : (hardContact ? 'NEUTRALIZE' : 'JAM_BODY');
    } else if (shotType === 'TOPSPIN') {
      motive = hardContact ? 'NEUTRALIZE' : (passingLaneOpen ? (openWindow > 0.30 ? 'PASS_CC' : 'PASS_DTL') : 'PASS_DTL');
    } else if (shotType === 'SLICE') {
      motive = hardContact ? 'NEUTRALIZE' : (passingLaneOpen ? 'PASS_DTL' : 'PASS_CC');
    } else if (shotType === 'HALF_VOLLEY') {
      motive = hardContact ? 'NEUTRALIZE' : (passingLaneOpen ? 'PASS_DTL' : 'NEUTRALIZE');
    } else {
      motive = executionQuality < 0.48 ? 'NEUTRALIZE' : 'JAM_BODY';
    }
    return { motive, spatial };
  }

  if (netPhase === 'FIRST_VOLLEY') {
    if (shotType === 'VOLLEY') {
      motive = executionQuality >= 0.72 && openWindow > 0.26 ? 'PRESS_OPEN' : 'JAM_BODY';
      return { motive, spatial };
    }
    if (shotType === 'HALF_VOLLEY') {
      // Helper: half-volley não precisa ser quase sempre "no corpo". Quando a
      // quadra abre ou o rival está recuperando, ele pode bloquear DTL/WIDE.
      motive = openWindow > 0.18 || spatial.oppRecovering ? 'BUILD_SPACE' : 'NEUTRALIZE';
      return { motive, spatial };
    }
  }

  if (netPhase === 'CLOSE_FINISH') {
    if (
      shotType === 'VOLLEY' ||
      shotType === 'SMASH' ||
      shotType === 'ACCEL' ||
      shotType === 'SHORT_ACCEL' ||
      shotType === 'BANANA' ||
      (shotType === 'DROP' && prefs?.riskProfile === 'GAMBLER')
    ) {
      motive = openWindow > 0.22 ? 'FINISH_OPEN' : 'JAM_BODY';
      return { motive, spatial };
    }
  }

  switch (shotType) {
    case 'SMASH':
      // Smash precisa variar direção como no tênis real:
      // aberto (WIDE/CC) quando há janela, ou DTL quando o rival recupera lateralmente.
      if (openWindow > 0.26) motive = 'FINISH_OPEN';
      else if (spatial.oppRecovering) motive = 'PASS_DTL';
      else motive = 'PRESS_OPEN';
      break;
    case 'DROP':
      if (prefs?.riskProfile === 'GAMBLER' && (ballTier === 'OPPORTUNITY' || pressureWindow || openWindow > 0.20)) {
        motive = 'FINISH_OPEN';
      } else {
        motive = prefs?.buildStyle === 'DROP_VARIATION' ? 'SHORT_DRAG' : 'DRAG_FORWARD';
      }
      break;
    case 'DRIVE':
      // Drive flat: motive depende do contexto — construção, pressão ou contra
      if (prefs?.buildStyle === 'COUNTER_REDIRECT' && (spatial.oppRecovering || openWindow > 0.18)) motive = 'COUNTER_REDIRECT';
      else if (netIntent > 0.30) motive = openWindow > 0.22 ? 'APPROACH_DTL' : 'APPROACH_CC';
      else if (ballTier === 'OPPORTUNITY' || pressureWindow) motive = openWindow > 0.28 ? 'PRESS_OPEN' : 'BUILD_SPACE';
      else if (rally === 0) motive = 'BUILD_SPACE';
      else motive = rally >= 3 ? 'PRESS_OPEN' : 'BUILD_SPACE';
      break;
    case 'HALF_VOLLEY':
      // Helper: manter half-volley como bloqueio, mas não mais preso ao centro.
      // Se houver janela lateral ou rival desbalanceado, ele pode sair DTL/WIDE.
      if (openWindow > 0.24) motive = 'BUILD_SPACE';
      else if (spatial.oppRecovering) motive = 'PRESS_OPEN';
      else motive = 'NEUTRALIZE';
      break;
    case 'LOB':
      motive = executionQuality < 0.55 ? 'LOB_ESCAPE' : 'LOB_PRESSURE';
      break;
    case 'SLICE':
      if (prefs?.buildStyle === 'SLICE_CONTROL') {
        motive = rally >= 4 ? 'RHYTHM_BREAK' : (openWindow > 0.16 ? 'BUILD_SPACE' : 'NEUTRALIZE');
      } else if (netIntent > 0.35 || prefs?.netGame === 'HUNTER' || prefs?.netGame === 'PROACTIVE') {
        // Slice de aproximacao classico (Sampras/Edberg): DTL por padrao.
        // Slice CC descobre o court — preferir DTL para forcar adversario a levantar
        // um slice baixo e cobrir o angulo de passante pelo lado abordado.
        // So usa CC se abertura muito clara E nao for cacador de rede.
        const isNetHunter = prefs?.netGame === 'HUNTER' || prefs?.netGame === 'PROACTIVE';
        motive = (!isNetHunter && openWindow > 0.38) ? 'APPROACH_CC' : 'APPROACH_DTL';
      } else if (ballTier === 'DIFFICULT') {
        motive = openWindow > 0.20 ? 'BUILD_SPACE' : 'NEUTRALIZE';
      } else if (rally >= 4 && spatial.oppDepth > 0.76) {
        motive = 'DRAG_FORWARD';
      } else if (courtOpen || spatial.oppRecovering) {
        motive = 'PRESS_OPEN';
      } else {
        motive = 'BUILD_SPACE';
      }
      break;
    case 'TOPSPIN':
      if (ballTier === 'DIFFICULT') motive = 'NEUTRALIZE';
      else if (prefs?.buildStyle === 'HEAVY_SPIN_PRESSURE') motive = rally >= 3 ? 'HEAVY_PUSHBACK' : 'BUILD_SPACE';
      else if (prefs?.buildStyle === 'COUNTER_REDIRECT' && (spatial.oppRecovering || openWindow > 0.22)) motive = 'COUNTER_REDIRECT';
      else if (pressureWindow && openWindow > 0.28) motive = 'PRESS_OPEN';
      else if (weakReturnBoost > 0.20) motive = 'PRESS_OPEN';
      else motive = (rally >= 3 || spatial.oppRecovering) ? 'BUILD_SPACE' : 'BUILD_HEAVY';
      break;
    case 'ACCEL':
      if (prefs?.buildStyle === 'COUNTER_REDIRECT' && (spatial.oppRecovering || openWindow > 0.18)) motive = 'COUNTER_REDIRECT';
      else if (netIntent > 0.34) motive = openWindow > 0.25 ? 'APPROACH_DTL' : 'APPROACH_CC';
      else if (ballTier === 'OPPORTUNITY' || pressureWindow || weakReturnBoost > 0.18) motive = 'FINISH_OPEN';
      else if (openWindow > 0.22) motive = 'PRESS_OPEN';
      else motive = prefs?.buildStyle === 'COUNTER_REDIRECT' ? 'BODY_LOCK' : 'JAM_BODY';
      break;
    case 'SHORT_ACCEL':
      if (prefs?.buildStyle === 'CROSS_SHORT_ANGLE') motive = 'OPEN_COURT_SMALL';
      else if (netIntent > 0.30) motive = 'APPROACH_CC';
      else if (ballTier === 'OPPORTUNITY' || openWindow > 0.22) motive = 'PRESS_OPEN';
      else motive = 'DRAG_FORWARD';
      break;
    case 'BANANA':
      motive = ballTier === 'OPPORTUNITY' || pressureWindow ? 'FINISH_OPEN' : 'PRESS_OPEN';
      break;
    default:
      motive = 'NEUTRALIZE';
      break;
  }

  if (!isBackhand && wingIdentity.dominantWing === 'FH') {
    if (shotType === 'ACCEL' || shotType === 'DRIVE') {
      motive = openWindow > 0.20 ? 'PRESS_OPEN' : 'BUILD_SPACE';
    } else if (shotType === 'SHORT_ACCEL' || shotType === 'BANANA') {
      motive = openWindow > 0.18 ? 'FINISH_OPEN' : 'PRESS_OPEN';
    }
  }

  if (isBackhand && wingIdentity.dominantWing === 'BH') {
    if (shotType === 'TOPSPIN' || shotType === 'DRIVE') {
      motive = rally >= 3 && openWindow > 0.18 ? 'PRESS_OPEN' : 'BUILD_SPACE';
    } else if (shotType === 'ACCEL') {
      motive = openWindow > 0.16 ? 'PRESS_OPEN' : 'JAM_BODY';
    }
  }

  if (isBackhand && wingIdentity.vulnerableWing === 'BH') {
    if (shotType === 'SLICE') {
      motive = netIntent > 0.28 ? 'APPROACH_DTL' : 'NEUTRALIZE';
    } else if (shotType === 'TOPSPIN') {
      motive = rally >= 3 ? 'BUILD_HEAVY' : 'NEUTRALIZE';
    }
  }

  const tacticalPlan = opts.pointPatternPlan ?? sequencePlan ?? constructionPlan;
  if (tacticalPlan) {
    const forceShot = tacticalPlan.shotBias === shotType;
    const strongPlan = (tacticalPlan.planStrength ?? 0) >= 0.60;
    if (forceShot || strongPlan || ballTier !== 'DIFFICULT') {
      motive = tacticalPlan.motive ?? motive;
    }
  }

  return { motive, spatial, sequencePlan: tacticalPlan };
}

// ─────────────────────────────────────────────────────────────────
// Forma do dia consolidada em _formMods.qualityMod (game.js init).
// initFormaDoDia mantido como stub vazio para compatibilidade com imports legados.
export function initFormaDoDia() {}

// ─────────────────────────────────────────────────────────────────
// LAYER 3: Scores situacionais
// ─────────────────────────────────────────────────────────────────
// BALL TIER — classificação baseada exclusivamente na física
// ─────────────────────────────────────────────────────────────────
//
// OPPORTUNITY  — bola fácil, posição boa: hora de atacar
// NEUTRAL      — situação normal de rally: topspin é o golpe âncora
// DIFFICULT    — bola difícil, pressionado: sobreviver com qualidade
//
// Substitui underPressure como driver do pool de golpes.
// rallyPressure (stress acumulado) vai apenas para a temperatura do softmax.

function computeBallTier(prepQuality, heightZone, diff) {
  // ANKLE com qualidade excepcional (>= 0.78) também é OPPORTUNITY — ATP moderno ataca de bolas baixas
  const opportunityZones = prepQuality >= 0.78
    ? ['ANKLE', 'HIP', 'SWEET', 'SHOULDER', 'HIGH', 'OVERHEAD']
    : ['HIP', 'SWEET', 'SHOULDER', 'HIGH', 'OVERHEAD'];
  // HIGH e OVERHEAD com prep razoável = presente do adversário → sempre OPPORTUNITY
  // (bola alta mal-batida que deveria ser smashada, não esperada no chão)
  if ((heightZone === 'HIGH' || heightZone === 'OVERHEAD') && prepQuality >= 0.40 && diff < 0.55)
    return 'OPPORTUNITY';
  if (prepQuality >= 0.62 && opportunityZones.includes(heightZone) && diff < 0.50)
    return 'OPPORTUNITY';
  if (prepQuality < 0.28 || diff > 0.72 || heightZone === 'DIRT')
    return 'DIFFICULT';
  return 'NEUTRAL';
}


function deriveConstructionPatternPlan(player, opponent, prefs, rally, prepQuality, scores) {
  const buildStyle = prefs?.buildStyle ?? 'CROSS_BUILDER';
  const spatial = computeSpatialContext(player, opponent);
  const openWindow = clampUnit(Math.abs(spatial.oppX) / 2.3);
  const underPressure = (player?.ctx?.underPressure ?? false) || (player?.ctx?.rallyPressure ?? 0) > 0.58;
  if (underPressure) return null;

  switch (buildStyle) {
    case 'CROSS_SHORT_ANGLE':
      if (rally >= 2 && prepQuality >= 0.50 && ((scores.SHORT_ACCEL ?? 0) > 0.22 || openWindow > 0.18)) {
        return {
          active: true,
          tag: 'OPEN_THEN_FINISH',
          expiresRally: rally + 2,
          shotBias: openWindow > 0.24 ? 'ACCEL' : 'SHORT_ACCEL',
          motive: openWindow > 0.24 ? 'FINISH_OPEN' : 'OPEN_COURT_SMALL',
          preferredDir: 'OPEN',
          depthBias: openWindow > 0.24 ? 0.76 : 0.58,
          planStrength: 0.58,
          intensityBonus: 0.04,
        };
      }
      break;
    case 'SLICE_CONTROL':
      if (rally >= 2 && prepQuality >= 0.38 && (scores.SLICE ?? 0) > 0.18) {
        return {
          active: true,
          tag: 'SLICE_LOCK_THEN_ACCEL',
          expiresRally: rally + 3,
          shotBias: rally >= 4 ? 'ACCEL' : 'SLICE',
          motive: rally >= 4 ? 'PRESS_OPEN' : 'RHYTHM_BREAK',
          preferredDir: rally >= 4 ? 'OPEN' : 'BODY',
          depthBias: rally >= 4 ? 0.74 : 0.66,
          planStrength: 0.54,
          intensityBonus: rally >= 4 ? 0.03 : -0.02,
        };
      }
      break;
    case 'DROP_VARIATION':
      if (prepQuality >= 0.52 && spatial.oppDepth > 0.72 && (scores.DROP ?? 0) > 0.16) {
        return {
          active: true,
          tag: 'DRAG_FORWARD_THEN_PASS',
          expiresRally: rally + 2,
          shotBias: 'DROP',
          motive: 'SHORT_DRAG',
          preferredDir: 'OPEN',
          depthBias: 0.20,
          planStrength: 0.62,
          intensityBonus: -0.03,
        };
      }
      break;
    case 'HEAVY_SPIN_PRESSURE':
      if (prepQuality >= 0.44 && (scores.TOPSPIN ?? 0) > 0.22) {
        return {
          active: true,
          tag: 'HEAVY_CROSS_THEN_DTL',
          expiresRally: rally + 3,
          shotBias: 'TOPSPIN',
          motive: rally >= 3 ? 'HEAVY_PUSHBACK' : 'BUILD_HEAVY',
          preferredDir: rally >= 3 ? 'SAME' : 'OPEN',
          depthBias: 0.82,
          planStrength: 0.56,
          intensityBonus: 0.02,
        };
      }
      break;
    case 'COUNTER_REDIRECT':
      if (prepQuality >= 0.46 && (spatial.oppRecovering || openWindow > 0.20)) {
        return {
          active: true,
          tag: 'COUNTER_REDIRECT',
          expiresRally: rally + 2,
          shotBias: (scores.ACCEL ?? 0) >= (scores.TOPSPIN ?? 0) ? 'ACCEL' : 'TOPSPIN',
          motive: 'COUNTER_REDIRECT',
          preferredDir: 'SAME',
          depthBias: 0.76,
          planStrength: 0.60,
          intensityBonus: 0.05,
        };
      }
      break;
  }

  return null;
}


// ─────────────────────────────────────────────────────────────────
// LAYER 6: Qualidade de execução
// ─────────────────────────────────────────────────────────────────

/**
 * Calcula o fatorAttr específico por tipo de golpe.
 * Do doc (Parte 4, Camada 6):
 *   ACCEL:       (potencia/100)^0.5 × (controle/100)^0.3
 *   TOPSPIN:     (topspin/100)^0.5  × (controle/100)^0.3
 *   ...
 */
function computeFatorAttr(shotType, attrs, isBackhand) {
  // Wing-aware: FH e BH têm potência/controle distintos
  const po = wingPotencia(attrs, isBackhand ?? false) / 100;
  const ct = wingControle(attrs, isBackhand ?? false) / 100;
  const ts = (attrs.topspin     ?? 60) / 100;
  const sl = (attrs.slice       ?? 60) / 100;
  const lr = (attrs.leitura     ?? 60) / 100;
  const vl = (attrs.velocidade  ?? 60) / 100;
  const mn = (attrs.mentalidade ?? 60) / 100;
  const vt = (attrs.visaoTatica ?? 60) / 100;
  // defesa: relevante para lob defensivo e recuperação
  const df = (attrs.defesa      ?? 60) / 100;
  const rc = (attrs.recuperacao ?? 60) / 100;
  const ad = (attrs.adaptacao   ?? 60) / 100;

  switch (shotType) {
    case 'ACCEL':       return Math.pow(po, 0.46) * Math.pow(ct, 0.25) * Math.pow(vt, 0.10) * Math.pow(ad, 0.10);
    case 'DRIVE':       return Math.pow(po, 0.40) * Math.pow(ct, 0.28) * Math.pow(vt, 0.08) * Math.pow(lr, 0.06) * Math.pow(ad, 0.10);
    case 'HALF_VOLLEY': return Math.pow(df, 0.32) * Math.pow(ct, 0.24) * Math.pow(sl, 0.14) * Math.pow(lr, 0.10) * Math.pow(rc, 0.20);
    case 'TOPSPIN': {
      // Para grinders (defesa > 0.90): defesa substitui parte do peso de visaoTatica
      // na qualidade de execução — a consistência defensiva se traduz em topspin confiável.
      const grindWeight = clamp((df - 0.90) / 0.10, 0, 1);
      const tsVt  = vt  * (1 - grindWeight * 0.40);   // visaoTatica perde até 40% do peso
      const tsDef = df  * (grindWeight * 0.40);        // defesa compensa proporcionalmente
      return Math.pow(ts, 0.42) * Math.pow(ct, 0.24) * Math.pow(tsDef + (df * (1 - grindWeight * 0.40)), 0.06) * Math.pow(tsVt + 0.001, 0.06) * Math.pow(lr, 0.05) * Math.pow(ad, 0.10) * Math.pow(rc, 0.07);
    }
    case 'SLICE':       return Math.pow(sl, 0.42) * Math.pow(ct, 0.26) * Math.pow(df, 0.14) * Math.pow(lr, 0.08) * Math.pow(ad, 0.10);
    case 'DROP':        return Math.pow(ct, 0.30) * Math.pow(sl, 0.22) * Math.pow(lr, 0.18) * Math.pow(vt, 0.10) * Math.pow(ad, 0.12) * Math.pow(mn, 0.04);
    case 'SHORT_ACCEL': return Math.pow(ct, 0.28) * Math.pow(lr, 0.22) * Math.pow(po, 0.20) * Math.pow(vt, 0.10) * Math.pow(ad, 0.20);
    case 'LOB':         return Math.pow(df, 0.30) * Math.pow(vl, 0.14) * Math.pow(mn, 0.08) * Math.pow(lr, 0.10) * Math.pow(ct, 0.12) * Math.pow(rc, 0.16) * Math.pow(ad, 0.10);
    case 'VOLLEY': {
      const vo = (attrs.volley ?? 60) / 100;
      return Math.pow(vo, 0.48) * Math.pow(ct, 0.22) * Math.pow(lr, 0.10) * Math.pow(ad, 0.08) * Math.pow(rc, 0.08);
    }
    case 'SMASH': {
      const sm = (attrs.smash ?? 60) / 100;
      return Math.pow(sm, 0.62) * Math.pow(ct, 0.12) * Math.pow(lr, 0.08) * Math.pow(ad, 0.08) * Math.pow(rc, 0.10);
    }
    case 'BANANA':      return Math.pow(ts, 0.48) * Math.pow(po, 0.32) * Math.pow(ct, 0.12) * Math.pow(ad, 0.16);
    default:            return Math.pow(ct, 0.4);
  }
}

/**
 * Calcula a penalidade de pressão do placar.
 * Momentos decisivos penalizam jogadores com mentalidade baixa.
 */
function computePressaoFactor(attrs, scoreState, player) {
  const mn = attrs.mentalidade ?? 60;
  const rc = attrs.recuperacao ?? 60;
  const reg = attrs.regularidade ?? 60;
  const imp = scoreState?.importance ?? 1.0;
  const clutchFactor = player?.mods?.clutchFactor ?? (mn / 100);
  const resilience = player?.mods?.recupFactor ?? (rc / 100);
  const stability = player?.mods?.varFactor ?? (reg / 100);
  const clutchStability = clamp(0.90 + clutchFactor * 0.12 + resilience * 0.08 + stability * 0.04, 0.84, 1.08);

  // Do doc:
  //   penalidade = (1 - mentalidade/100) × (importância - 1.0) × 0.20
  //   pressão = max(0.75, 1.0 - penalidade)
  const pressureBase = 1 - (mn * 0.58 + rc * 0.27 + reg * 0.15) / 100;
  const penalidade = pressureBase * (imp - 1.0) * 0.18 / clutchStability;
  return Math.max(0.75, 1.0 - penalidade);
}

/**
 * Qualidade real de execução do golpe escolhido.
 * qualidadeReal = prepQuality × fatorAttr × pressão  (forma do dia em prepQuality via _formMods.qualityMod)
 */
function computeExecutionQuality(
  shotType,
  attrs,
  prepQuality,
  scoreState,
  isBackhand,
  player,
  executionState = null,
  feasibilityMaxQuality = 1,
  contactCeiling = 1,
) {
  const fatorAttr = computeFatorAttr(shotType, attrs, isBackhand);
  const pressao   = computePressaoFactor(attrs, scoreState, player);
  const readQ     = (attrs.leitura ?? 60) / 100;
  const po        = wingPotencia(attrs, isBackhand) / 100;
  const ct        = wingControle(attrs, isBackhand) / 100;
  const recoverQ  = (attrs.recuperacao ?? 60) / 100;
  const adaptQ    = (attrs.adaptacao ?? 60) / 100;
  // defesa agora age no ContactModel — balancePenalty atenuado em contexto defensivo
  const raw = prepQuality * fatorAttr * pressao;
  let shaped = raw;

  // Q ruim precisa ficar visivelmente ruim em quadra:
  // abaixo da faixa "jogável" degradamos de forma não linear para que
  // contatos pobres gerem bolas fracas, curtas e sem autoridade.
  if (raw < 0.52) {
    const lowBand = clamp(raw / 0.52, 0, 1);
    const crush = 0.58 + lowBand * 0.42;
    shaped *= crush;
  }

  // Golpes naturalmente agressivos exigem ainda mais execução limpa.
  if ((shotType === 'ACCEL' || shotType === 'SHORT_ACCEL' || shotType === 'BANANA') && shaped < 0.62) {
    const attackBand = clamp(shaped / 0.62, 0, 1);
    shaped *= 0.72 + attackBand * 0.28;
  }
  // Potência muito acima do controle custa estabilidade em golpes agressivos.
  // Isso reduz domínio de "força bruta" e devolve espaço para perfis construtores.
  if (shotType === 'ACCEL' || shotType === 'TOPSPIN' || shotType === 'SHORT_ACCEL' || shotType === 'DRIVE') {
    const controlShield = clamp(Math.max(0, ct - 0.72) * 0.70, 0, 0.12);
    const forceGap = clamp(po - ct - 0.16 - controlShield, 0, 0.28);
    if (forceGap > 0) {
      shaped *= 1 - forceGap * 0.16;
    }
  }
  if (shotType === 'TOPSPIN' && shaped < 0.60) {
    const topspinBand = clamp(shaped / 0.60, 0, 1);
    shaped *= 0.80 + topspinBand * 0.20;
  }
  if (prepQuality < 0.58) {
    const lowPrepBand = clamp((0.58 - prepQuality) / 0.22, 0, 1);
    const readStability = clamp(0.88 + (readQ - 0.50) * 0.24 + (adaptQ - 0.50) * 0.18 + (recoverQ - 0.50) * 0.12, 0.76, 1.08);
    shaped *= 1 - lowPrepBand + lowPrepBand * readStability;
  }
  // NOTA: defenseLift (janela 0.36-0.54, só TOPSPIN/SLICE/LOB) foi removido.
  // Defesa agora age no ContactModel via atenuação do balancePenalty em contexto
  // defensivo — mais cedo no pipeline, mais shots cobertos, range muito maior.
  if (executionState?.modifiers?.executionQualityMult) {
    shaped *= executionState.modifiers.executionQualityMult;
  }
  const hardPhysicsCap = clamp(
    Math.min(
      0.97,
      Math.max(0.08, feasibilityMaxQuality ?? 1),
      Math.max(0.08, contactCeiling ?? 1),
    ),
    0.08,
    0.97,
  );
  // Clampa entre 0.05 e cap físico real — nunca perfeito, nunca zero.
  return clamp(shaped, 0.05, hardPhysicsCap);
}

// ─────────────────────────────────────────────────────────────────
// INTENSIDADE DO GOLPE — "a barrinha invisível"
// ─────────────────────────────────────────────────────────────────
//
// shotIntensity ∈ [0..1]
//   0 = controle puro  → usa o piso de pow, arco mais alto, mais spin
//   1 = full power     → usa o teto de pow, mais rasante, menos spin
//
// Influencia diretamente: power, netClearance, spinMag
//
// Sobe com: prepQuality alta, quadra aberta, adversário fundo,
//           momentum positivo, agressividade, riskProfile agressivo
// Cai com:  pressão, rally muito curto, perfil PATIENT, bola difícil

function computeShotIntensity(shotType, player, opponent, prepQuality, prefs, ctx) {
  const attrs      = player.attrs ?? {};
  const isBackhand = player._isBackhand ?? false;
  // visaoTatica: decisão tática de quando/quanto atacar (substituiu agressividade)
  const vtBase     = player?.mods?.visaoFactor ?? ((attrs.visaoTatica ?? 60) / 100);
  const vt         = clamp(vtBase + (player?._adaptacaoBoost ?? 0) * 0.70, 0.20, 1.18);
  const po         = wingPotencia(attrs, isBackhand) / 100;
  const mn         = (attrs.mentalidade ?? 60) / 100;
  const rc         = (attrs.recuperacao ?? 60) / 100;
  const ad         = (attrs.adaptacao ?? 60) / 100;

  const oppDepth   = Math.abs(opponent?.pos?.y ?? 8) / HALF_L;
  const playerLat  = Math.abs(player.pos?.x    ?? 0) / HALF_S;
  const oppAtNet   = opponent?.atNet ?? (oppDepth < 0.35);
  const courtOpen  = Math.abs(opponent?.pos?.x ?? 0) > 1.5 || playerLat < 0.3;
  const ewma       = ctx?._momentumEWMA ?? 0.5;
  const mood       = ctx?._moodFactor   ?? ewma;
  const rally      = ctx?.gsRally ?? 0;
  const psychoState = clamp(ewma * 0.58 + mood * 0.42, 0, 1);

  // ── Base: quanto o jogador "quer" bater forte por natureza ────────
  // visaoTatica e potência (wing-aware) puxam para cima; mentalidade estabiliza
  let intensity = 0.35 + vt * 0.24 + po * 0.20 + ad * 0.10 + mn * 0.03;

  // ── Situação: janela de ataque aberta ────────────────────────────
  if (courtOpen)           intensity += 0.09 + (vt - 0.50) * 0.06 + Math.max(0, ad - 0.55) * 0.05;
  if (oppDepth > 0.70)     intensity += 0.08;  // adversário muito fundo = atacar
  if (prepQuality > 0.75)  intensity += 0.10 + (vt - 0.50) * 0.10 + Math.max(0, ad - 0.55) * 0.06;  // bola fácil: visão amplia o gatilho
  else if (prepQuality < 0.45) intensity -= 0.24; // bola difícil = bem mais controle

  // ── Momentum ─────────────────────────────────────────────────────
  // Embalado → mais agressivo; colapsando → mais cauteloso
  const highMomentum = Math.max(0, psychoState - 0.5);
  const lowMomentum = Math.max(0, 0.5 - psychoState);
  const reg01 = (attrs.regularidade ?? 60) / 100;
  const panicForce = lowMomentum * (((1 - reg01) * 0.08) + ((1 - mn) * 0.04) + ((1 - rc) * 0.10));
  intensity += highMomentum * 0.34;
  intensity += panicForce;
  intensity -= lowMomentum * 0.03;

  // ── Perfil de cadência ───────────────────────────────────────────
  switch (prefs?.rallyCadence) {
    case 'PATIENT':    intensity -= 0.12; break;
    case 'MEASURED':   intensity -= 0.06; break;
    case 'EARLY_ATTACK': intensity += 0.06; break;
    case 'EXPLOSIVE':  intensity += 0.12; break;
  }

  // ── riskProfile ──────────────────────────────────────────────────
  switch (prefs?.riskProfile) {
    case 'SAFETY_FIRST': intensity -= 0.15; break;
    case 'SAFE':         intensity -= 0.08; break;
    case 'GAMBLER':      intensity += 0.08; break;
    case 'ALLOUT':       intensity += 0.15; break;
  }

  // ── Shot-specific adjustments ────────────────────────────────────
  // Golpes de controle por natureza nunca chegam ao teto de intensidade
  // Golpes de ataque partem de uma base mais alta
  switch (shotType) {
    case 'SLICE':       intensity -= 0.20; break;
    case 'DRIVE':
      // Drive moderado — mais agressivo que topspin, menos que ACCEL
      intensity += 0.06;
      if (rally === 0) intensity += 0.04;  // retorno de saque com drive é naturalmente mais firme
      break;
    case 'HALF_VOLLEY': {
      // Bloqueio puro — intensidade quase fixa, muito baixa
      const _defQ = (attrs.defesa ?? 60) / 100;
      intensity = 0.10 + _defQ * 0.04 + rc * 0.06 + Math.max(0, prepQuality - 0.35) * 0.08;
      break;
    }
    case 'VOLLEY':
      intensity = 0.42 + vt * 0.08 + po * 0.08 + ad * 0.04 + Math.max(0, prepQuality - 0.45) * 0.10;
      if (courtOpen) intensity += 0.06;
      break;
    case 'SMASH':
      intensity = 0.72 + vt * 0.06 + po * 0.10 + ((attrs.smash ?? 60) / 100) * 0.10 + ad * 0.04 + Math.max(0, prepQuality - 0.40) * 0.08;
      if (courtOpen) intensity += 0.04;
      break;
    case 'DROP': {
      const sl = (attrs.slice ?? 60) / 100;
      const ct = wingControle(attrs, isBackhand) / 100;
      const lr = (attrs.leitura ?? 60) / 100;
      const touch = clamp((sl * 0.34) + (ct * 0.34) + (lr * 0.18) + (ad * 0.14), 0, 1);
      intensity = 0.12 + touch * 0.06 + Math.max(0, prepQuality - 0.55) * 0.10;
      if (oppDepth > 0.78) intensity += 0.03;
      if (courtOpen) intensity += 0.02;
      break;
    }
    case 'LOB':
      // LOB defensivo (DIFFICULT) → intensidade baixa → arco alto (clearance usa ph.clr[1])
      // LOB agressivo (OPPORTUNITY) → intensidade maior → arco menor, mais pace
      // Sem esse split, todos os lobs tinham o mesmo arco, tornando os dois tipos indistinguíveis.
      if (player?.ctx?._lastBallTier === 'DIFFICULT') {
        intensity -= 0.28;  // defensivo: muito abaixo do neutro → arco máximo (5.5m)
      } else {
        intensity -= 0.10;  // agressivo: levemente abaixo → arco moderado (~3-4m)
      }
      break;
    case 'ACCEL':       intensity += 0.15; break; // accel parte mais alto
    case 'BANANA':      intensity += 0.08; break;
  }

  // ── Penalidade de rally muito curto (devolução) ───────────────────
  if (rally === 0) intensity -= 0.08;

  // ── Teto por ballTier — sobrevivência não é estilo, é física ────────
  // DIFFICULT: jogador não pode "escolher" atacar a 95% — o corpo não permite.
  // O estilo pode ser ALLOUT mas se a bola é DIRT/prepQ<0.28, o máximo é 0.58.
  const ballTierLocal = player?.ctx?._lastBallTier ?? 'NEUTRAL';
  const intensityCap  = ballTierLocal === 'DIFFICULT'  ? 0.42
                      : ballTierLocal === 'OPPORTUNITY' ? 0.82  // cap reduzido — variedade real
                      : 0.90;

  if (shotType === 'DROP') {
    return clamp(intensity, 0.12, Math.min(intensityCap, 0.28));
  }

  const stateDelta = ctx?.executionState?.modifiers?.intensityDelta ?? 0;
  return clamp(intensity + stateDelta, 0.05, intensityCap);
}

// ─────────────────────────────────────────────────────────────────
// TARGET BUILDING (buildStyle → direção)
// ─────────────────────────────────────────────────────────────────

/**
 * Decide as probabilidades de direção (cruzado, paralelo, centro)
 * com base no buildStyle do jogador.
 *
 * Retorna { pCross, pDtl, pCentre } — somam 1.0.
 */
function dirProbsFromBuildStyle(buildStyle, shotType) {
  // Defaults neutros
  let pCross = 0.55, pDtl = 0.30, pCentre = 0.15;

  switch (buildStyle) {
    case 'CROSS_DOMINANT':
      // Quase sempre cruzado — topspin e normal cruzado dominam
      pCross  = 0.78; pDtl = 0.14; pCentre = 0.08;
      break;
    case 'CROSS_BUILDER':
      pCross  = 0.65; pDtl = 0.24; pCentre = 0.11;
      break;
    case 'VARIED':
      pCross  = 0.45; pDtl = 0.35; pCentre = 0.20;
      break;
    case 'DTL_HUNTER':
      // Vai ao paralelo cedo sempre que pode
      if (shotType === 'ACCEL' || shotType === 'TOPSPIN') {
        pCross = 0.32; pDtl = 0.52; pCentre = 0.16;
      } else {
        pCross = 0.48; pDtl = 0.38; pCentre = 0.14;
      }
      break;
    case 'CENTRE_CONTROL':
      if (shotType === 'SLICE') {
        pCross = 0.30; pDtl = 0.25; pCentre = 0.45;
      } else {
        pCross = 0.42; pDtl = 0.28; pCentre = 0.30;
      }
      break;
    case 'CROSS_SHORT_ANGLE':
      if (shotType === 'SHORT_ACCEL' || shotType === 'DROP') {
        pCross = 0.78; pDtl = 0.14; pCentre = 0.08;
      } else {
        pCross = 0.68; pDtl = 0.22; pCentre = 0.10;
      }
      break;
    case 'SLICE_CONTROL':
      if (shotType === 'SLICE') {
        pCross = 0.56; pDtl = 0.16; pCentre = 0.28;
      } else {
        pCross = 0.52; pDtl = 0.24; pCentre = 0.24;
      }
      break;
    case 'DROP_VARIATION':
      if (shotType === 'DROP') {
        pCross = 0.58; pDtl = 0.20; pCentre = 0.22;
      } else {
        pCross = 0.58; pDtl = 0.24; pCentre = 0.18;
      }
      break;
    case 'HEAVY_SPIN_PRESSURE':
      pCross = 0.70; pDtl = 0.18; pCentre = 0.12;
      break;
    case 'COUNTER_REDIRECT':
      if (shotType === 'ACCEL' || shotType === 'BANANA') {
        pCross = 0.34; pDtl = 0.48; pCentre = 0.18;
      } else {
        pCross = 0.48; pDtl = 0.34; pCentre = 0.18;
      }
      break;
  }

  return { pCross, pDtl, pCentre };
}

function resolveTargetFromMotive(shotType, player, opponent, effectiveIntensity, executionQuality, motivePack) {
  const spatial = motivePack?.spatial ?? computeSpatialContext(player, opponent);
  const motive = motivePack?.motive ?? 'NEUTRALIZE';
  const sequencePlan = motivePack?.sequencePlan ?? null;
  const craft = getControlCraftProfile(player);
  const centreX = clamp(spatial.centreBias + rand(-0.22, 0.22), -0.8, 0.8);
  const wideScale = HALF_S - 0.15;
  const intensityT = clampUnit(effectiveIntensity);

  let dir = spatial.crossDir;
  let lateralFrac = 0.40;
  let depthBias = 0.68;

  switch (motive) {
    case 'NEUTRALIZE':
      dir = spatial.jamDir;
      lateralFrac = 0.08 + intensityT * 0.10;
      depthBias = 0.78;
      break;
    case 'BUILD_HEAVY':
      dir = spatial.crossDir;
      lateralFrac = 0.26 + intensityT * 0.14;
      depthBias = 0.74;
      break;
    case 'BUILD_SPACE':
      dir = spatial.crossDir;
      lateralFrac = 0.44 + intensityT * 0.20;
      depthBias = 0.76;
      break;
    case 'OPEN_COURT_SMALL':
      dir = spatial.crossDir;
      lateralFrac = 0.52 + intensityT * 0.10;
      depthBias = 0.60;
      break;
    case 'PRESS_OPEN':
      dir = spatial.lateralOpenDir;
      lateralFrac = 0.60 + intensityT * 0.16;
      depthBias = 0.79;
      break;
    case 'COUNTER_REDIRECT':
      dir = spatial.dtlDir;
      lateralFrac = 0.56 + intensityT * 0.14;
      depthBias = 0.80;
      break;
    case 'FINISH_OPEN':
      dir = spatial.lateralOpenDir;
      lateralFrac = 0.68 + intensityT * 0.18;
      depthBias = shotType === 'SHORT_ACCEL' ? 0.58 : 0.84;
      break;
    case 'JAM_BODY':
      dir = spatial.jamDir;
      lateralFrac = 0.10 + intensityT * 0.08;
      depthBias = 0.70;
      break;
    case 'BODY_LOCK':
      dir = spatial.jamDir;
      lateralFrac = 0.06 + intensityT * 0.06;
      depthBias = 0.74;
      break;
    case 'PASS_CC':
      dir = spatial.crossDir;
      lateralFrac = 0.66 + intensityT * 0.16;
      depthBias = shotType === 'SHORT_ACCEL' ? 0.54 : 0.78;
      break;
    case 'PASS_DTL':
      dir = spatial.dtlDir;
      lateralFrac = 0.62 + intensityT * 0.16;
      depthBias = 0.80;
      break;
    case 'APPROACH_DTL':
      dir = spatial.dtlDir;
      lateralFrac = 0.40 + intensityT * 0.12;
      depthBias = 0.82;
      break;
    case 'APPROACH_CC':
      dir = spatial.crossDir;
      lateralFrac = 0.44 + intensityT * 0.12;
      depthBias = 0.74;
      break;
    case 'DRAG_FORWARD':
      dir = spatial.lateralOpenDir;
      lateralFrac = shotType === 'DROP' ? 0.18 + intensityT * 0.16 : 0.30 + intensityT * 0.15;
      depthBias = shotType === 'DROP' ? 0.18 : 0.42;
      break;
    case 'SHORT_DRAG':
      dir = spatial.lateralOpenDir;
      lateralFrac = 0.12 + intensityT * 0.10;
      depthBias = 0.16;
      break;
    case 'RHYTHM_BREAK':
      dir = spatial.crossDir;
      lateralFrac = 0.24 + intensityT * 0.10;
      depthBias = 0.64;
      break;
    case 'HEAVY_PUSHBACK':
      dir = spatial.crossDir;
      lateralFrac = 0.38 + intensityT * 0.12;
      depthBias = 0.88;
      break;
    case 'APPROACH_LOCK':
      dir = spatial.jamDir;
      lateralFrac = 0.18 + intensityT * 0.08;
      depthBias = 0.80;
      break;
    case 'LOB_ESCAPE':
      dir = spatial.lateralOpenDir;
      lateralFrac = 0.18 + intensityT * 0.14;
      depthBias = 0.90;
      break;
    case 'LOB_PRESSURE':
      dir = spatial.lateralOpenDir;
      lateralFrac = 0.34 + intensityT * 0.16;
      depthBias = 0.88;
      break;
  }

  if (shotType === 'SLICE') {
    // Helper: slice aceita mais desenho lateral sem virar winner gratuito.
    // Subir estes pisos faz o golpe abrir mais em DTL/WIDE; baixar recentraliza.
    if (motive === 'NEUTRALIZE') lateralFrac = Math.max(lateralFrac, 0.22 + intensityT * 0.10);
    if (motive === 'BUILD_SPACE' || motive === 'RHYTHM_BREAK') lateralFrac = Math.max(lateralFrac, 0.40 + intensityT * 0.14);
    if (motive === 'PRESS_OPEN' || motive === 'APPROACH_DTL' || motive === 'APPROACH_CC') lateralFrac = Math.max(lateralFrac, 0.52 + intensityT * 0.14);
  }

  if (shotType === 'HALF_VOLLEY') {
    // Helper: half-volley pode bloquear para fora do corpo quando a leitura
    // permite. Estes pisos evitam que a resolução final comprima tudo no centro.
    if (motive === 'NEUTRALIZE') lateralFrac = Math.max(lateralFrac, 0.18 + intensityT * 0.08);
    if (motive === 'BUILD_SPACE') lateralFrac = Math.max(lateralFrac, 0.34 + intensityT * 0.12);
    if (motive === 'PRESS_OPEN') lateralFrac = Math.max(lateralFrac, 0.42 + intensityT * 0.12);
  }

  // Controle/leitura altos destravam construção por ângulo.
  if (motive === 'BUILD_SPACE' || motive === 'RHYTHM_BREAK' || motive === 'PRESS_OPEN' || motive === 'HEAVY_PUSHBACK' || motive === 'APPROACH_CC') {
    const shotMult = shotType === 'DRIVE' || shotType === 'SHORT_ACCEL' || shotType === 'TOPSPIN' ? 1.12 : 0.92;
    lateralFrac += craft.angleCraft * shotMult;
  } else if (motive === 'NEUTRALIZE' && (shotType === 'TOPSPIN' || shotType === 'SLICE' || shotType === 'DRIVE')) {
    lateralFrac += craft.angleCraft * 0.55;
  }
  lateralFrac = clamp(lateralFrac, 0.05, 0.86);

  if (shotType === 'SMASH') {
    // Evita viés excessivo para BODY no overhead:
    // mantém smash mais aberto por padrão, com espaço para WIDE.
    lateralFrac = clamp(Math.max(lateralFrac, 0.54 + intensityT * 0.16), 0.40, 0.92);
    depthBias = clamp(Math.max(depthBias, 0.78), 0.70, 0.94);
  }

  if (sequencePlan) {
    if (sequencePlan.preferredDir === 'BODY') dir = spatial.jamDir;
    else if (sequencePlan.preferredDir === 'OPEN') dir = spatial.lateralOpenDir;
    else if (sequencePlan.preferredDir === 'SAME') dir = spatial.dtlDir;
    else if (sequencePlan.preferredDir === 'CENTRE') dir = spatial.jamDir;

    depthBias = clamp(
      depthBias * (1 - (sequencePlan.planStrength ?? 0) * 0.35) + (sequencePlan.depthBias ?? depthBias) * ((sequencePlan.planStrength ?? 0) * 0.35),
      0.12,
      0.94
    );

    if (sequencePlan.preferredDir === 'CENTRE') {
      lateralFrac = Math.min(lateralFrac, 0.16 + intensityT * 0.08);
    }
  }

  let targetX = centreX;
  let dirChoice = 'BODY';

  if (motive === 'JAM_BODY') {
    targetX = clamp(spatial.bodyX + rand(-0.18, 0.18), -HALF_S + 0.25, HALF_S - 0.25);
  } else if (shotType === 'LOB') {
    const lobDir = motive === 'LOB_ESCAPE' ? spatial.lateralOpenDir : dir;
    targetX = clamp(lobDir * wideScale * lateralFrac * 0.72 + rand(-0.24, 0.24), -HALF_S + 0.2, HALF_S - 0.2);
    dirChoice = motive === 'LOB_ESCAPE' ? 'CC' : (lobDir === spatial.dtlDir ? 'DTL' : 'CC');
  } else if (shotType === 'DROP') {
    targetX = clamp(dir * wideScale * lateralFrac * 0.75 + rand(-0.12, 0.12), -HALF_S + 0.2, HALF_S - 0.2);
    dirChoice = Math.abs(targetX) < 0.8 ? 'BODY' : (dir === spatial.dtlDir ? 'DTL' : 'CC');
  } else {
    targetX = clamp(dir * wideScale * lateralFrac + rand(-0.08, 0.08), -HALF_S + 0.15, HALF_S - 0.15);
    dirChoice = Math.abs(targetX) < 0.9 ? 'BODY' : (dir === spatial.dtlDir ? 'DTL' : 'CC');
  }

  const qualityCompression = executionQuality < 0.58
    ? clamp((0.58 - executionQuality) / 0.58, 0, 1) * 0.18
    : 0;
  if (qualityCompression > 0 && shotType !== 'DROP' && shotType !== 'LOB') {
    const tunedCompression = qualityCompression * (1 - craft.antiCompression);
    targetX *= 1 - tunedCompression;
  }

  if (shotType === 'SLICE' || shotType === 'HALF_VOLLEY') {
    const absX = Math.abs(targetX);
    if (absX < 0.65) dirChoice = 'BODY';
    else if (dir === spatial.dtlDir) dirChoice = 'DTL';
    else if (absX > HALF_S * 0.62) dirChoice = 'WIDE';
    else dirChoice = 'CC';
  } else if (dirChoice === 'CC' && Math.abs(targetX) > HALF_S * 0.62) {
    dirChoice = 'WIDE';
  }

  return {
    targetX,
    depthBias: clamp(depthBias, 0.12, 0.94),
    dirChoice,
  };
}

function resolvePoorExecutionProfile(shotType, executionQuality, poorExec, effectiveIntensity) {
  const qualityMiss = clamp((0.42 - executionQuality) / 0.42, 0, 1);
  const intensityT = clampUnit(effectiveIntensity);

  const profile = {
    depthPull: 0.10 + poorExec * 0.08,
    forwardMiss: 0.10 + poorExec * 0.08,
    lateralSpray: 0.18 + poorExec * 0.16,
    powerScale: 0.84 - poorExec * 0.20,
    clearanceBias: 0.06 + poorExec * 0.05,
    extraLongBias: 0,
    longMissChance: 0.06 + qualityMiss * 0.08,
    wideMissChance: 0.10 + qualityMiss * 0.10,
    shortDeadChance: 0.24 + poorExec * 0.14,
    netMissChance: 0.14 + qualityMiss * 0.10,
  };

  switch (shotType) {
    case 'TOPSPIN':
      profile.depthPull = 0.06 + poorExec * 0.06;
      profile.forwardMiss = 0.24 + poorExec * 0.22 + intensityT * 0.18;
      profile.lateralSpray = 0.40 + poorExec * 0.28 + intensityT * 0.12;
      profile.powerScale = 0.92 - poorExec * 0.12;
      profile.clearanceBias = 0.08 + poorExec * 0.06;
      profile.extraLongBias = 0.12 + qualityMiss * 0.10 + intensityT * 0.06;
      profile.longMissChance = 0.32 + qualityMiss * 0.24 + intensityT * 0.14;
      profile.wideMissChance = 0.28 + qualityMiss * 0.22 + intensityT * 0.06;
      profile.shortDeadChance = 0.08 + poorExec * 0.08;
      profile.netMissChance = 0.09 + qualityMiss * 0.08 + poorExec * 0.05;
      break;
    case 'ACCEL':
      profile.depthPull = 0.01 + poorExec * 0.02;
      profile.forwardMiss = 0.24 + poorExec * 0.22 + intensityT * 0.14;
      profile.lateralSpray = 0.42 + poorExec * 0.28 + intensityT * 0.14;
      profile.powerScale = 1.00 - poorExec * 0.04;
      profile.clearanceBias = 0.03 + poorExec * 0.03;
      profile.extraLongBias = 0.14 + qualityMiss * 0.12;
      profile.longMissChance = 0.24 + qualityMiss * 0.16 + intensityT * 0.10;
      profile.wideMissChance = 0.30 + qualityMiss * 0.22;
      profile.shortDeadChance = 0.02 + poorExec * 0.03;
      profile.netMissChance = 0.22 + qualityMiss * 0.18;
      break;
    case 'DRIVE':
      // Entre TOPSPIN e ACCEL — mais long miss que topspin, menos que accel
      profile.depthPull = 0.04 + poorExec * 0.04;
      profile.forwardMiss = 0.20 + poorExec * 0.18 + intensityT * 0.12;
      profile.lateralSpray = 0.34 + poorExec * 0.22 + intensityT * 0.10;
      profile.powerScale = 0.96 - poorExec * 0.08;
      profile.clearanceBias = 0.04 + poorExec * 0.04;
      profile.extraLongBias = 0.12 + qualityMiss * 0.10;
      profile.longMissChance = 0.22 + qualityMiss * 0.16 + intensityT * 0.08;
      profile.wideMissChance = 0.26 + qualityMiss * 0.18;
      profile.shortDeadChance = 0.06 + poorExec * 0.05;
      profile.netMissChance = 0.18 + qualityMiss * 0.14;
      break;
    case 'HALF_VOLLEY':
      // Bloqueio — miss principal é rede (bola baixa) e spray lateral
      // Helper: teste forense agressivo. Este bloco foi puxado bem acima do
      // normal para reduzir loft artificial. Se o half-volley/slice parar de
      // subir tanto, a causa raiz era mesmo "pouco pace + muita folga".
      profile.depthPull = 0.18 + poorExec * 0.12;
      profile.forwardMiss = 0.04 + poorExec * 0.04;
      profile.lateralSpray = 0.28 + poorExec * 0.20;
      profile.powerScale = 0.92 - poorExec * 0.06;
      profile.clearanceBias = 0.04 + poorExec * 0.03;
      profile.longMissChance = 0.04 + qualityMiss * 0.04;
      profile.wideMissChance = 0.22 + qualityMiss * 0.16;
      profile.shortDeadChance = 0.28 + poorExec * 0.18;
      profile.netMissChance = 0.30 + qualityMiss * 0.20;
      break;
    case 'SHORT_ACCEL':
      profile.depthPull = 0.03 + poorExec * 0.04;
      profile.forwardMiss = 0.18 + poorExec * 0.15 + intensityT * 0.10;
      profile.lateralSpray = 0.36 + poorExec * 0.24 + intensityT * 0.10;
      profile.powerScale = 0.95 - poorExec * 0.08;
      profile.clearanceBias = 0.05 + poorExec * 0.04;
      profile.extraLongBias = 0.06 + qualityMiss * 0.06;
      profile.longMissChance = 0.16 + qualityMiss * 0.12;
      profile.wideMissChance = 0.26 + qualityMiss * 0.20;
      profile.shortDeadChance = 0.08 + poorExec * 0.06;
      profile.netMissChance = 0.20 + qualityMiss * 0.14;
      break;
    case 'SLICE':
      profile.depthPull = 0.12 + poorExec * 0.08;
      profile.forwardMiss = 0.06 + poorExec * 0.05;
      profile.lateralSpray = 0.12 + poorExec * 0.08;
      profile.powerScale = 0.96 - poorExec * 0.05;
      profile.clearanceBias = 0.02 + poorExec * 0.02;
      profile.extraLongBias = 0.02 + qualityMiss * 0.03;
      profile.longMissChance = 0.08 + qualityMiss * 0.05;
      profile.wideMissChance = 0.08 + qualityMiss * 0.05;
      profile.shortDeadChance = 0.34 + poorExec * 0.18;
      profile.netMissChance = 0.10 + qualityMiss * 0.07;
      break;
    case 'DROP':
      profile.depthPull = 0.04 + poorExec * 0.03;
      profile.forwardMiss = 0.06 + poorExec * 0.05;
      profile.lateralSpray = 0.12 + poorExec * 0.08;
      profile.powerScale = 0.84 - poorExec * 0.10;
      profile.clearanceBias = 0.08 + poorExec * 0.05;
      profile.longMissChance = 0.10 + qualityMiss * 0.08;
      profile.wideMissChance = 0.07 + qualityMiss * 0.04;
      profile.shortDeadChance = 0.12 + poorExec * 0.08;
      profile.netMissChance = 0.14 + qualityMiss * 0.10;
      break;
    case 'LOB':
      profile.depthPull = 0.015 + poorExec * 0.02;
      profile.forwardMiss = 0.14 + poorExec * 0.12;
      profile.lateralSpray = 0.11 + poorExec * 0.09;
      profile.powerScale = 0.90 - poorExec * 0.08;
      profile.clearanceBias = 0.12 + poorExec * 0.08;
      profile.extraLongBias = 0.06 + qualityMiss * 0.07;
      profile.longMissChance = 0.12 + qualityMiss * 0.10;
      profile.wideMissChance = 0.07 + qualityMiss * 0.05;
      profile.shortDeadChance = 0.14 + poorExec * 0.08;
      profile.netMissChance = 0.03 + qualityMiss * 0.03;
      break;
  }

  return profile;
}

/**
 * Constrói o objeto de shot completo.
 * Substitui o buildShot antigo, incorporando buildStyle nas probabilidades de direção.
 */
function buildShotWithPrefs(shotType, player, opponent, executionQuality, prefs, shotIntensity = 0.5, motivePack = null, executionState = null) {
  const phRaw = SHOT_PHYSICS[shotType] ?? SHOT_PHYSICS.TOPSPIN;

  // ── CAMADA 2: Colapso Físico (Q < 0.20) ─────────────────────────────
  // Abaixo de Q=0.20, o envelope físico (pace, margem, profundidade) lerpa
  // em direção ao FISICA_COLAPSO. O golpe perde autoridade — um ACCEL com
  // Q=0.05 não tem mais pace nem margem rente à rede.
  // Spin, altura de contato e identidade do golpe permanecem intactos.
  //
  // Defesa atenua o colapso em shots defensivos (LOB, SAFE, SLICE, HALF_VOLLEY):
  // um retriever com defesa=90 num LOB desesperado ainda manda a bola alta e funda.
  let ph = phRaw;
  const camada2Thresh = DEGRADACAO_CONFIG.CAMADA2_THRESHOLD;
  if (executionQuality < camada2Thresh) {
    const t2Raw = clamp((camada2Thresh - executionQuality) / camada2Thresh, 0, 1);
    const fc    = DEGRADACAO_CONFIG.FISICA_COLAPSO;
    const isDefensivo = DEGRADACAO_CONFIG.SHOTS_DEFENSIVOS.has(shotType);
    let t2 = t2Raw;
    if (isDefensivo) {
      const defesa = player?.attrs?.defesa ?? 50;
      // defesa=99 → t2 × 0.42 — física não colapsa totalmente em shots defensivos
      t2 = t2Raw * (1 - (defesa / 100) * DEGRADACAO_CONFIG.DEFESA_COLAPSO_ATENUACAO);
    }
    // Lerp das ranges físicas — spin_x, spin_z, hitH intactos
    const lerp = (a, b, tt) => a + (b - a) * tt;
    ph = {
      ...phRaw,
      pow:   [lerp(phRaw.pow[0],   fc.velocidade[0],    t2), lerp(phRaw.pow[1],   fc.velocidade[1],    t2)],
      clr:   [lerp(phRaw.clr[0],   fc.margem_rede[0],   t2), lerp(phRaw.clr[1],   fc.margem_rede[1],   t2)],
      depth: [lerp(phRaw.depth[0], fc.profundidade[0],  t2), lerp(phRaw.depth[1], fc.profundidade[1],  t2)],
    };
  }
  // ────────────────────────────────────────────────────────────────────
  const side = player.side ?? 1;
  const attrs = player.attrs ?? {};
  const motive = motivePack?.motive ?? 'NEUTRALIZE';
  const spatial = motivePack?.spatial ?? computeSpatialContext(player, opponent);
  const stateMods = executionState?.modifiers ?? null;
  const executionStateName = executionState?.state ?? 'NEUTRAL';
  const styleIntensityBias = (() => {
    let bias = 0;
    switch (prefs?.riskProfile) {
      case 'SAFETY_FIRST': bias -= 0.18; break;
      case 'SAFE':         bias -= 0.10; break;
      case 'GAMBLER':      bias += 0.08; break;
      case 'ALLOUT':       bias += 0.16; break;
    }
    switch (prefs?.buildStyle) {
      case 'CROSS_DOMINANT': bias += 0.06; break;
      case 'DTL_HUNTER':     bias += 0.08; break;
      case 'CENTRE_CONTROL': bias -= 0.08; break;
      case 'CROSS_SHORT_ANGLE': bias += 0.03; break;
      case 'SLICE_CONTROL':     bias -= 0.04; break;
      case 'DROP_VARIATION':    bias -= 0.01; break;
      case 'HEAVY_SPIN_PRESSURE': bias += 0.02; break;
      case 'COUNTER_REDIRECT':  bias += 0.04; break;
    }
    return bias;
  })();
  const effectiveIntensity = clamp(shotIntensity + styleIntensityBias, 0.05, 0.98);
  const depthNoise  = (Math.random() - 0.5) * 0.34;
  let depthFrac     = clamp(
    ph.depth[0] + effectiveIntensity * (ph.depth[1] - ph.depth[0]) + depthNoise,
    ph.depth[0], ph.depth[1]
  );
  const poorExec = clamp((0.58 - executionQuality) / 0.58, 0, 1);
  const poorExecProfile = resolvePoorExecutionProfile(
    shotType,
    executionQuality,
    poorExec,
    effectiveIntensity
  );
  if (poorExec > 0) {
    const safeDepth = shotType === 'DROP' ? 0.26 : shotType === 'LOB' ? 0.78 : 0.48;
    depthFrac = clamp(
      depthFrac * (1 - poorExec * poorExecProfile.depthPull) + safeDepth * (poorExec * poorExecProfile.depthPull),
      ph.depth[0],
      ph.depth[1]
    );
  }
  {
    const estPower    = (ph.pow[0] + effectiveIntensity * (ph.pow[1] - ph.pow[0])) * 0.94;
    const hitHest     = (ph.hitH[0] + ph.hitH[1]) / 2;
    const flyTime     = Math.sqrt(2 * hitHest / 9.81) + hitHest / 9.81;
    const hDistMax    = estPower * flyTime * 1.10;
    const hitterDist  = Math.abs(player.pos?.y ?? HALF_L);
    const depthRemaining = hDistMax - hitterDist;
    if (depthRemaining <= 0) {
      depthFrac = ph.depth[0];
    } else {
      const depthCapFrac = clamp(depthRemaining / HALF_L, ph.depth[0], ph.depth[1]);
      if (depthFrac > depthCapFrac) depthFrac = depthCapFrac;
    }
  }
  const targetPlan = resolveTargetFromMotive(
    shotType,
    player,
    opponent,
    effectiveIntensity,
    executionQuality,
    motivePack ?? { motive, spatial }
  );
  const depthBlend = shotType === 'LOB' ? 0.85 : shotType === 'DROP' ? 0.78 : 0.64;
  depthFrac = clamp(
    depthFrac * (1 - depthBlend) + targetPlan.depthBias * depthBlend + rand(-0.05, 0.05),
    ph.depth[0],
    ph.depth[1]
  );
  if (poorExec > 0) {
    const missRoll = Math.random();
    if (missRoll < poorExecProfile.longMissChance) {
      depthFrac = clamp(
        depthFrac + poorExec * (poorExecProfile.forwardMiss + poorExecProfile.extraLongBias),
        ph.depth[0],
        ph.depth[1]
      );
    } else if (missRoll < poorExecProfile.longMissChance + poorExecProfile.wideMissChance) {
      depthFrac = clamp(
        depthFrac + rand(-0.03, 0.04),
        ph.depth[0],
        ph.depth[1]
      );
    } else if (missRoll < poorExecProfile.longMissChance + poorExecProfile.wideMissChance + poorExecProfile.netMissChance) {
      depthFrac = clamp(
        depthFrac - poorExec * (poorExecProfile.depthPull * 0.65),
        ph.depth[0],
        ph.depth[1]
      );
    } else {
      depthFrac = clamp(
        depthFrac - poorExec * (poorExecProfile.depthPull + poorExecProfile.shortDeadChance * 0.08),
        ph.depth[0],
        ph.depth[1]
      );
    }
  }
  let targetX = clamp(targetPlan.targetX, -HALF_S + 0.15, HALF_S - 0.15);
  let targetY = -side * depthFrac * HALF_L;
  if (poorExec > 0) {
    const lateralMiss = poorExec * poorExecProfile.lateralSpray * HALF_S;
    targetX = clamp(targetX + rand(-lateralMiss, lateralMiss), -HALF_S * 1.28, HALF_S * 1.28);
    targetY += -side * poorExec * poorExecProfile.forwardMiss * HALF_L * rand(-0.85, 1.15);
  }
  if (stateMods) {
    targetX = clamp(targetX * (stateMods.targetLateralMult ?? 1.0), -HALF_S * 1.30, HALF_S * 1.30);
    targetY += -side * (stateMods.targetDepthDelta ?? 0) * HALF_L;
  }
  // Dispersão de pouso "boa": controle alto gera variação tática do alvo final
  // (menos previsível), sem transformar isso em erro bruto.
  const craft = getControlCraftProfile(player);
  const canCraftSpread = shotType !== 'DROP' && shotType !== 'LOB' && shotType !== 'SMASH';
  if (canCraftSpread && craft.placementSpread > 0) {
    const spreadScale = (1 - poorExec * 0.55) * clamp(executionQuality * 1.10, 0.45, 1.0);
    const spreadX = craft.placementSpread * HALF_S * 0.44 * spreadScale;
    const spreadY = craft.placementSpread * HALF_L * 0.10 * spreadScale;
    const planDir = Math.sign(targetPlan.targetX || targetX || spatial.lateralOpenDir || 1) || 1;
    targetX = clamp(
      targetX + planDir * rand(0, spreadX * 0.70) + rand(-spreadX * 0.28, spreadX * 0.28),
      -HALF_S * 1.28,
      HALF_S * 1.28,
    );
    targetY += -side * rand(-spreadY, spreadY);
  }
  if (shotType === 'TOPSPIN' || shotType === 'DRIVE') {
    targetY = -side * clamp(Math.abs(targetY), HALF_L * 0.60, HALF_L * 0.92);
  } else if (shotType === 'ACCEL') {
    targetY = -side * clamp(Math.abs(targetY), HALF_L * 0.66, HALF_L * 0.94);
  } else if (shotType === 'SHORT_ACCEL') {
    targetY = -side * clamp(Math.abs(targetY), HALF_L * 0.34, HALF_L * 0.68);
  } else if (shotType === 'BANANA') {
    targetY = -side * clamp(Math.abs(targetY), HALF_L * 0.56, HALF_L * 0.84);
  } else if (shotType === 'SLICE') {
    targetY = -side * clamp(Math.abs(targetY), HALF_L * 0.52, HALF_L * 0.88);
  } else if (shotType === 'DROP') {
    targetY = -side * clamp(Math.abs(targetY), HALF_L * 0.24, HALF_L * 0.48);
  } else if (shotType === 'LOB') {
    targetY = -side * clamp(Math.abs(targetY), HALF_L * 0.86, HALF_L * 0.992);
  }
  const powRange  = ph.pow[1] - ph.pow[0];
  const qualityPowerScale = executionQuality < 0.55
    ? (0.64 + executionQuality * 0.30)
    : (0.76 + executionQuality * 0.18);
  let power       = (ph.pow[0] + effectiveIntensity * powRange) * qualityPowerScale * poorExecProfile.powerScale;
  if (shotType === 'LOB') {
    // Lob precisa carregar até o fundo depois do pico do arco; sem esse empurrão
    // ele sobe bonito mas morre cedo perto da zona de smash.
    power *= 1.18;
  } else if (shotType === 'ACCEL') {
    power *= 1.24;
  } else if (shotType === 'SHORT_ACCEL') {
    power *= 1.17;
  } else if (shotType === 'BANANA') {
    power *= 1.18;
  }
  if (poorExec > 0 && (shotType === 'ACCEL' || shotType === 'SHORT_ACCEL' || shotType === 'BANANA' || shotType === 'TOPSPIN')) {
    const aggressionFloor = shotType === 'ACCEL' ? 0.88 : shotType === 'BANANA' ? 0.84 : shotType === 'SHORT_ACCEL' ? 0.82 : 0.68;
    const basePower = ph.pow[0] + effectiveIntensity * powRange;
    power = Math.max(power, basePower * aggressionFloor);
  }
  if (shotType === 'SMASH') {
    const smashAttr = attrs.smash ?? attrs.jogoDeRede ?? 60;
    const smashPowerMult = 0.88 + (smashAttr / 100) * 0.28;
    power *= smashPowerMult;
  }
  if (stateMods?.powerMult) power *= stateMods.powerMult;
  const clrRange  = ph.clr[1] - ph.clr[0];
  const poorExecClearance = poorExec > 0 ? poorExecProfile.clearanceBias + poorExec * 0.06 : 0;
  let netClear  = ph.clr[1] - effectiveIntensity * clrRange * 0.75 + poorExecClearance + (stateMods?.clearanceDelta ?? 0);

  // Frameshot: golpe ruim deve sobreviver feio na maioria das vezes.
  // 70% vira bola fofa/central; 30% vira colapso real (rede/longa/spray).
  const lobProtectedBodyState = shotType === 'LOB'
    && (executionStateName === 'NEUTRAL' || executionStateName === 'PLANTED');
  const frameShotSeverity = lobProtectedBodyState
    ? 0
    : shotType === 'LOB'
      ? clamp((0.15 - executionQuality) / 0.15, 0, 1)
      : clamp((0.20 - executionQuality) / 0.20, 0, 1);
  let survivalFrame = false;
  if (frameShotSeverity > 0) {
    const chaos = frameShotSeverity;
    const chaosRoll = Math.random();
    const errorChance = 0.20 + chaos * 0.10;
    const isSurvivalFrame = shotType !== 'LOB' && chaosRoll >= errorChance;

    if (isSurvivalFrame) {
      // Bola fofa central: limpa a rede, cai no meio/fundo-médio e dá iniciativa ao rival.
      survivalFrame = true;
      targetX = clamp(targetX * (0.18 + (1 - chaos) * 0.12) + rand(-0.18, 0.18), -0.55, 0.55);
      targetY = -side * clamp(HALF_L * (0.68 + rand(-0.05, 0.10)), HALF_L * 0.56, HALF_L * 0.82);
      netClear = Math.max(netClear + 0.32 + chaos * 0.34, 0.42 + chaos * 0.20);
      power *= 0.82 + (1 - chaos) * 0.12;
      power = Math.max(power, (ph.pow[0] + effectiveIntensity * powRange) * 0.72);
    } else {
      // Erro real: só aqui o frame shot vira rede, longa ou spray aberto.
      targetX = clamp(
        targetX + rand(-HALF_S * (0.12 + chaos * 0.42), HALF_S * (0.12 + chaos * 0.42)),
        -HALF_S * (1.05 + chaos * 0.65),
        HALF_S * (1.05 + chaos * 0.65),
      );
      targetY += -side * HALF_L * rand(-0.08 - chaos * 0.16, 0.10 + chaos * 0.20);

      const errorRoll = Math.random();
      if (errorRoll < 0.40) {
      if (shotType === 'LOB') {
        // LOB mishit: bola curta e fraca que sobe mas cai fácil — fácil de smash.
        // LOB NUNCA bate na rede (arco alto por definição); mishit = popup curto.
        power *= 0.48 + (1 - chaos) * 0.28;
        // Encurta o lob: cai na zona de smash do adversário (30-55% da quadra)
        targetY = -side * clamp(Math.abs(targetY) * (0.34 + (1 - chaos) * 0.28), HALF_L * 0.22, HALF_L * 0.56);
      } else {
        // Rede: baixa clearance e perde peso na batida
        netClear -= 0.04 + chaos * 0.16;
        power *= 0.82 + (1 - chaos) * 0.10;
      }
      } else if (errorRoll < 0.78) {
      // Balão sem controle: cada família degrada diferente.
      // Slice/topspin ruim ainda precisa parecer o mesmo golpe ruim, não um lob.
      const isSliceFamily = shotType === 'SLICE' || shotType === 'SLICE_SHORT' || shotType === 'HALF_VOLLEY';
      const isTopFamily = shotType === 'TOPSPIN' || shotType === 'DRIVE' || shotType === 'ACCEL' || shotType === 'SHORT_ACCEL' || shotType === 'BANANA';
      if (isSliceFamily) {
        netClear += 0.04 + chaos * 0.10;
        targetY += -side * HALF_L * (0.005 + chaos * 0.035);
      } else if (isTopFamily) {
        netClear += 0.08 + chaos * 0.16;
        targetY += -side * HALF_L * (0.015 + chaos * 0.055);
      } else if (shotType === 'LOB') {
        // LOB balão: vai fundo demais (fácil de ver vir e posicionar)
        netClear += 0.40 + chaos * 0.80;
        targetY += -side * HALF_L * (0.04 + chaos * 0.12);
        power *= 0.75 + (1 - chaos) * 0.15;
      } else {
        netClear += 0.24 + chaos * 0.55;
        targetY += -side * HALF_L * (0.06 + chaos * 0.18);
      }
      power *= 0.80 + (1 - chaos) * 0.12;
    } else {
      // Bola "rasgada": potência instável e muito risco lateral
      power *= 0.85 + rand(-0.22 * chaos, 0.20 * chaos);
      }
    }
  }
  const spinAttrMult = getShotSpinAttrMultiplier(shotType, attrs);
  const spinMag   = 1.5
                  * (1.0 - effectiveIntensity * 0.35)
                  * (0.88 + executionQuality * 0.16)
                  * spinAttrMult
                  * (stateMods?.spinMult ?? 1.0);
  const hitHeight = rand(ph.hitH[0], ph.hitH[1]);
  const spinX     = ph.spinFn ? ph.spinFn(spinMag, targetY) : 0;
  const spinZ     = ph.spinZ  ? ph.spinZ(spinMag)           : 0;
  const spinType  = SPIN_MAP[shotType] === 1 ? 'TOP'
                  : SPIN_MAP[shotType] === -1 ? 'SLICE'
                  : 'FLAT';
  const combinedSpinMag = Math.abs(spinX) + Math.abs(spinZ);
  const flightProfile =
    shotType === 'DROP'
      ? {
          mode: 'drop_rewrite',
          netMinZ: COURT.netHeight + 0.10,
          minTime: 0.72,
          maxTime: 1.22,
          minSpeed: 10.8,
          maxSpeed: 16.8,
          strictArc: true,
          solverSpinScale: 1.35,
        }
      : shotType === 'SLICE'
        ? {
            vzMin: -0.20,
            vzMax: 4.80,
            maxLandingError: 1.25,
            netMinZ: COURT.netHeight + 0.08,
            strictArc: false,
            solverSpinScale: 1.45,
          }
          : shotType === 'TOPSPIN'
            ? {
                vzMin: -2.40,
                vzMax: 5.90,
                maxLandingError: 0.76,
                netMinZ: COURT.netHeight + 0.46,
                solverSpinScale: combinedSpinMag > 1.0 ? 2.55 : 2.15,
              }
          : shotType === 'BANANA'
            ? {
                vzMin: -3.80,
                vzMax: 2.35,
                maxLandingError: 0.70,
                netMinZ: COURT.netHeight + 0.10,
                solverSpinScale: 0.75,
                strictArc: true,
              }
            : shotType === 'ACCEL' || shotType === 'DRIVE' || shotType === 'SHORT_ACCEL'
              ? {
                  vzMin: shotType === 'ACCEL' ? -4.40 : shotType === 'SHORT_ACCEL' ? -3.70 : -2.80,
                  vzMax: shotType === 'ACCEL' ? 2.65 : shotType === 'SHORT_ACCEL' ? 3.10 : 4.45,
                  maxLandingError: shotType === 'SHORT_ACCEL' ? 0.62 : shotType === 'ACCEL' ? 0.70 : 0.74,
                  netMinZ: COURT.netHeight + 0.02,
                  solverSpinScale: shotType === 'ACCEL' ? 0.45 : shotType === 'SHORT_ACCEL' ? 0.70 : 1.35,
                  strictArc: shotType === 'ACCEL' || shotType === 'SHORT_ACCEL',
                }
              : null;
  return {
    type: shotType,
    targetX,
    targetY,
    power,
    hitHeight,
    netClearance: netClear,
    spinType,
    spinX,
    spinZ,
    flightProfile,
    zone: 'NEUTRAL',
    _sigQualityBonus: 0,
    _executionQuality: executionQuality,
    _survivalFrame: survivalFrame,
    _shotIntensity: effectiveIntensity,
    _dirChoice: targetPlan.dirChoice,
    _motive: motive,
    _executionState: executionState?.state ?? 'NEUTRAL',
    _executionLabel: executionState?.label ?? 'Neutral',
  };
}


// ─────────────────────────────────────────────────────────────────
// ENTRADA PRINCIPAL
// ─────────────────────────────────────────────────────────────────

/**
 * Decide e constrói o shot completo usando as 6 camadas.
 *
 * @param {object} player      — jogador que vai bater
 * @param {object} opponent    — adversário
 * @param {number} prepQuality — qualidade de prep das camadas 0-1
 * @param {object} opts        — { gsRally, isSlowBall, scoreState, contactSpace, swingPrep, feasibility }
 *
 * scoreState: { importance: 1.0|1.4|1.6|2.0, isBreakPoint, isMatchPoint }
 *
 * @returns {{ shot, aiTrace, executionQuality }}
 */
export function decideShotAndBuild(player, opponent, prepQuality, opts = {}) {
  const attrs = player.attrs ?? {};

  // ── Prefs: campo baked no player runtime, ou gera on-the-fly ─────
  const prefs = player.prefs ?? generatePrefs(attrs);

  const rally = opts.gsRally ?? 0;
  const isBackhand = opts.isBackhand ?? false;
  const wingIdentity = opts.wingIdentity ?? player._wingIdentity ?? deriveWingIdentity(player);
  const pipeline = opts.pipeline ?? player._coreShotPipeline ?? null;
  const resolvedOpts = {
    ...opts,
    contactSpace: opts.contactSpace ?? pipeline?.contactSpace ?? player._contactSpace,
    swingPrep: opts.swingPrep ?? pipeline?.swingPrep ?? player._swingPrep,
    feasibility: opts.feasibility ?? pipeline?.feasibility ?? player._feasibility,
    executionState: opts.executionState ?? pipeline?.executionState ?? player._executionState ?? null,
  };

  // ── Camada 3: Scores situacionais ────────────────────────────────
  const heightZone = resolvedOpts.contactSpace?.heightZone ?? 'HIP';

  // ── Camada 3b: Adaptação mid-match (_matchRead + _setAdjust) ─────
  const diff = resolvedOpts.contactSpace?.diff ?? 0.4;
  const ballTier = computeBallTier(prepQuality, heightZone, diff);
  if (player?.ctx) player.ctx._lastBallTier = ballTier;

  // ── Camada 4: Modificadores de perfil ────────────────────────────
  const engineDecision = runShotDecisionEngine({
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
  });
  const {
    intentPack,
    pointPatternPlan,
    netPhase,
    poolBeforeAdjustments,
    poolAfterAdjustments,
    thoughtLayer,
    normalizedPool: engineNormalizedPool,
    temperature,
    shotType: engineShotType,
  } = engineDecision;
  const traitSelection = applyTraitShotSelectionBias(
    engineNormalizedPool,
    player,
    opponent,
    rally,
    opts,
    resolvedOpts,
  );
  const traitPickedShotType = pickShotTypeFromPool(traitSelection.boostedPool, engineShotType);
  const traitBiasedDecision = {
    ...engineDecision,
    shotType: traitPickedShotType,
    normalizedPool: traitSelection.normalizedPool,
    probabilities: traitSelection.probabilities,
  };
  const normalizedPool = traitSelection.normalizedPool;
  const probabilities = traitSelection.probabilities;
  const shotType = promoteNetOpportunityShot(traitBiasedDecision, player, opponent, resolvedOpts);
  const traitRuntime = resolveLiveTraitRuntime(player, opponent, shotType, rally, opts, resolvedOpts);
  const feasibilityMaxQuality = resolvedOpts?.feasibility?.getMaxQuality?.(shotType) ?? 1;
  const contactCeiling = resolvedOpts?.contactSpace?.qCeiling ?? 1;
  const constructionPatternPlan = deriveConstructionPatternPlan(
    player,
    opponent,
    prefs,
    rally,
    prepQuality,
    normalizedPool
  );
  if (player?.ctx) player.ctx._constructionPatternPlan = constructionPatternPlan;

  player._isBackhand = isBackhand; // usado por computeShotIntensity
  const baseExecutionQuality = computeExecutionQuality(
    shotType,
    attrs,
    prepQuality,
    resolvedOpts.scoreState,
    isBackhand,
    player,
    resolvedOpts.executionState ?? null,
    feasibilityMaxQuality,
    contactCeiling,
  );
  const executionQuality = applyLiveTraitExecutionQuality(baseExecutionQuality, traitRuntime);

  // ── Intensidade do golpe — a "barrinha" ───────────────────────────
  const baseShotIntensity = computeShotIntensity(
    shotType, player, opponent, prepQuality, prefs, {
      ...player.ctx,
      gsRally: rally,
      executionState: resolvedOpts.executionState ?? null,
    }
  );
  const sequencePlanIntensity =
    (player?.ctx?._servePatternPlan?.active && rally <= (player.ctx._servePatternPlan.expiresRally ?? 1))
      ? (player.ctx._servePatternPlan.intensityBonus ?? 0)
      : (player?.ctx?._returnRecoveryPlan?.active && rally <= (player.ctx._returnRecoveryPlan.expiresRally ?? 2))
        ? (player.ctx._returnRecoveryPlan.intensityBonus ?? 0)
        : 0;
  const constructionIntensity =
    (player?.ctx?._constructionPatternPlan?.active && rally <= (player.ctx._constructionPatternPlan.expiresRally ?? 2))
      ? (player.ctx._constructionPatternPlan.intensityBonus ?? 0)
      : 0;
  const shotIntensity = applyLiveTraitIntensity(
    clamp(baseShotIntensity + sequencePlanIntensity + constructionIntensity, 0.05, 0.98),
    shotType,
    traitRuntime,
  );
  const motivePack = chooseShotMotive(
    player,
    opponent,
    shotType,
    prefs,
    prepQuality,
    shotIntensity,
    executionQuality,
    normalizedPool,
    { ...resolvedOpts, pointPatternPlan, wingIdentity }
  );
  // ?????? Construir o shot com prefs de dire????o ???????????????????????????????????????????????????????????????????????????
  const shot = buildShotWithPrefs(
    shotType,
    player,
    opponent,
    executionQuality,
    prefs,
    shotIntensity,
    motivePack,
    resolvedOpts.executionState ?? null
  );
  applyLiveTraitFinish(shot, shotType, traitRuntime);
  if (pointPatternPlan) {
    shot._pointPattern = pointPatternPlan.name;
    shot._pointPatternSource = pointPatternPlan.source;
    shot.targetX *= pointPatternPlan.targetLateralMult ?? 1.0;
    shot.targetY += -(player.side ?? 1) * (pointPatternPlan.targetDepthDelta ?? 0) * HALF_L;
  }
  shot._netPhase = netPhase;
  shot._wingIdentity = wingIdentity.dominantWing;
  if (player?.ctx) {
    player.ctx._recentSliceCount = shotType === 'SLICE' ? (player.ctx._recentSliceCount ?? 0) + 1 : 0;
    player.ctx._recentDropCount = shotType === 'DROP' ? (player.ctx._recentDropCount ?? 0) + 1 : 0;
    player.ctx._recentShortAngleCount = shotType === 'SHORT_ACCEL' ? (player.ctx._recentShortAngleCount ?? 0) + 1 : 0;
  }
  {
    const netIntent = clamp(player?.ctx?.netIntent ?? 0, 0, 1);
    const currentIntent = player?.ctx?.currentIntent ?? 'BUILD';
    const typeFit =
      shotType === 'ACCEL'       ? 1.00 :
      shotType === 'SHORT_ACCEL' ? 0.86 :
      shotType === 'DRIVE'       ? 0.65 :
      shotType === 'SLICE'       ? 0.74 :
      shotType === 'TOPSPIN'     ? 0.40 :
      shotType === 'BANANA'      ? 0.18 :
      shotType === 'DROP'        ? 0.10 :
      shotType === 'HALF_VOLLEY' ? 0.05 :
      0.0;
    const intentBonus = currentIntent === 'FINISH'   ? 0.14
                      : currentIntent === 'PRESSURE' ? 0.08
                      : 0.0;
    shot._approachIntent = clamp(typeFit * 0.70 + netIntent * 0.45 + intentBonus, 0, 1);
    shot._approachFit = typeFit;
  }

  // ── FASE 7: Signature Shots ────────────────────────────────────────
  // Wing é determinado pelo player._isBackhand calculado em game.js
  const _sigWing = player.atNet ? 'NET'
    : (opts.isServe ? 'SERVE'
    : (isBackhand ? 'BH' : 'FH'));
  const isBigPoint = !!(opts?.isBigPoint || opts?.scoreState?.isBreakPoint || opts?.scoreState?.isMatchPoint);
  const sigResult = resolveTraitSignature(player, shotType, _sigWing, prepQuality, { isBigPoint });
  if (sigResult.triggered) {
    applySignaturePhysics(shot, sigResult.physics, shotType, player);
    shot._sigQualityBonus = 0.12;
    shot._signatureTraitKey = sigResult.signatureKey;
    shot._signatureTraitSource = sigResult.source;
  }
  // ── fim Fase 7 ──────────────────────────────────────────────────────

  shot._executionState = resolvedOpts.executionState?.state ?? 'NEUTRAL';

  const aiTrace = buildStratifiedAiTrace({
    poolBefore: poolBeforeAdjustments,
    poolAfter: aplicarIsolamentoDeShots(poolAfterAdjustments),
    normalizedPool,
    probabilities,
    shotType,
    shot,
    sigResult,
    prefs,
    intentPack,
    temperature,
    ballTier,
    netPhase,
    wingIdentity,
    pointPatternPlan,
    thoughtLayer,
    situationTrace: engineDecision.situationTrace,
  });
  aiTrace.thoughtLayer = thoughtLayer;
  aiTrace.traitRuntime = {
    shotBias: traitRuntime.shotBias,
    selectionBias: traitSelection.selectionBias,
    preTraitShotType: engineShotType,
    traitPickedShotType,
    contexts: shot._traitContexts ?? [],
    executionDelta: shot._traitExecutionDelta ?? 0,
  };

  return { shot, aiTrace, executionQuality };
}
