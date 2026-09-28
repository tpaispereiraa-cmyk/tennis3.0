import { COURT, PHYSICS, TIMING, THRESHOLDS, PLAYER_CFG, STAMINA, INERTIA, GameState, SCORE_LABELS } from './core/constants.js';
import { MATCH_RULES } from './core/constants.js';
import { getTraitEffects, collectTraitContexts, TRAIT_CATALOG } from './systems/traits/TraitSystem.js';
import { traceStartPoint, traceLogShot, traceLogOutcome, traceEndPoint, TRACE_ENABLED } from './core/trace.js';
import { COURTS, getCourtVisual, getCourtPhysics, getCourtStyleMods } from './domain/courts/courtConfigs.js';
import { PLAY_STYLES, STYLE_KEYS } from './domain/players/styles.js';
import { v2, v3, mag3, dist2, clamp, rand, movAvg } from './core/math.js';
import { AI } from './systems/ai/aiCoefficients.js';
import { stepPhysics, checkNetCollision, checkOutOfBounds, checkServiceBox, predictTrajectory, launchBall } from './core/physics.js';
import { createCtx, resetCtx, updateMomentum, classifyZone, updateRallyPressure, applySetAdjustment, initContextConf, updateTiebreakConf, readMatchContext, recoverMomentumBetweenSets } from './systems/ai/ai.js';
import { initMatchPlans } from './systems/match/MatchPlanSystem.js';
import { getFormModifiers } from './systems/progression/formas.jsx';
import { updatePlayerMovement, resetMovementRuntime } from './systems/movement/TennisMovement.js';
import { generatePrefs, mergeGeneratedPrefs }   from './domain/players/playerPrefs.js';
import { pushVFX, pushShotVFX } from './systems/vfx/vfx.js';
import { SHOT_ENGINE_OFFLINE, buildOfflineShotEvent } from './systems/shotlab/ShotEngineOffline.js';
import {
  buildShotContext,
  evaluateShotQuality,
  decideShot,
  decideReturnShot,
  normalizeReturnContact,
  buildShotExecution,
  applyShotExecution,
  buildShotDebugPayload,
  explainShotDecision,
  prepareServePositions,
  executeServe,
  rememberShot,
  resetShotMemory,
  buildShotEngineSnapshot,
} from './systems/shotengine/index.js';
import { playSound, announceScore } from './systems/audio/sound.js';
import { NAMED_PLAYERS, computePlayerMods, matchDayVarV3, migrateAttrsToV3, recoveryBoost } from './domain/players/players.js';
import { initEnvironment, updateEnvironment } from './systems/environment/EnvironmentSystem.js';
// MatchParticles removido — NEWME1.0 usa sistema próprio de partículas
import { initCourtMarks, addCourtMark, pruneOldMarks } from './ui/pixel/CourtRenderer.js';
import { initHeat, updateHeat } from './systems/analytics/MatchHeat.js';
import { rollInMatchInjury, decideMTOOutcome, applyInMatchPenalty, applyProgressiveDegradation, buildInMatchInjuryEvent, IN_MATCH_SEVERITY } from './systems/health/InjurySystem.js';
import { applySurfaceTalentToAttrs, derivePlayerTalentTrees } from './systems/progression/arvoredetalentos.jsx';
import { cloneTalentIdentity, getTalentRuntimeEffects, initializeTalentIdentity } from './systems/talents/TalentIdentitySystem.js';
import { ensureSurfaceProfile, getSurfaceMatchEffects, normalizeSurfaceKey } from './systems/surfaces/SurfaceIdentitySystem.js';
import { initLiveMatchAudit, auditRegisterHitGate, auditRegisterShot, auditRegisterBounce, auditRegisterPointEnd, buildLiveAuditSnapshot } from './systems/audit/liveMatchAudit.js';


function _getTiebreakTarget(gs) {
  return gs?.matchFormat === 'SUPER_TB_10' ? (gs?.superTiebreakTarget ?? 10) : MATCH_RULES.tiebreakPoints;
}

function _getTiebreakWinBy(gs) {
  return gs?.matchFormat === 'SUPER_TB_10' ? 2 : MATCH_RULES.tiebreakWinBy;
}

function _isMatchTiebreakOnly(gs) {
  return gs?.matchFormat === 'SUPER_TB_10';
}

function _canPlayerWinGameNow(gs, playerId) {
  const player = gs.players[playerId];
  const opp = gs.players[1 - playerId];
  if (gs.inTiebreak) {
    const target = _getTiebreakTarget(gs);
    return gs.tbScore[playerId] >= (target - 1) && (gs.tbScore[playerId] - gs.tbScore[1 - playerId]) >= 0;
  }
  return player.score === MATCH_RULES.pointsPerGame - 1;
}

function _canPlayerWinSetNow(gs, playerId) {
  const player = gs.players[playerId];
  const opp = gs.players[1 - playerId];
  if (!_canPlayerWinGameNow(gs, playerId)) return false;
  if (gs.inTiebreak) return true;
  const nextGames = player.games + 1;
  return nextGames >= MATCH_RULES.gamesPerSet && (nextGames - opp.games) >= 2;
}

function _canPlayerWinMatchNow(gs, playerId) {
  if (_isMatchTiebreakOnly(gs)) return _canPlayerWinGameNow(gs, playerId);
  const setsNeeded = gs.setsToWin ?? 2;
  return (gs.players[playerId].sets + (_canPlayerWinSetNow(gs, playerId) ? 1 : 0)) >= setsNeeded;
}

function _getPointPressureState(gs) {
  const states = gs.players.map((player, playerId) => {
    const oppId = 1 - playerId;
    return {
      playerId,
      isGamePoint: _canPlayerWinGameNow(gs, playerId),
      isSetPoint: _canPlayerWinSetNow(gs, playerId),
      isMatchPoint: _canPlayerWinMatchNow(gs, playerId),
      isBreakPoint: false,
      isDefendingBreakPoint: false,
      isDefendingSetPoint: false,
      isDefendingMatchPoint: false,
      oppId,
    };
  });

  if (!gs.inTiebreak) {
    states[gs.receiver].isBreakPoint = states[gs.receiver].isGamePoint;
    states[gs.server].isDefendingBreakPoint = states[gs.receiver].isBreakPoint;
  }

  for (const state of states) {
    const opp = states[state.oppId];
    state.isDefendingSetPoint = opp.isSetPoint;
    state.isDefendingMatchPoint = opp.isMatchPoint;
  }

  return states;
}

function _computeScoreImportance(player, gs) {
  const scoreState = _getPointPressureState(gs)[player.id];
  const importance = scoreState.isMatchPoint ? 2.0
                   : scoreState.isBreakPoint ? 1.6
                   : scoreState.isSetPoint ? 1.4
                   : scoreState.isGamePoint ? 1.2
                   : 1.0;
  return {
    importance,
    isGamePoint: scoreState.isGamePoint,
    isBreakPoint: scoreState.isBreakPoint,
    isMatchPoint: scoreState.isMatchPoint,
    isSetPoint: scoreState.isSetPoint,
  };
}

// ── Trait system integration helpers ──────────────────────────────────────────
function buildTraitCtx(player, gs) {
  const opp     = gs.players[1 - player.id];
  const surface = gs.courtMeta?.surface ?? 'HARD';
  const ctxs    = ['always', 'surface:' + surface];

  if (gs.bestOf === 5)  ctxs.push('bestOf5');
  if (gs.inTiebreak)    ctxs.push('tiebreak');

  const totalSets = gs.players[0].sets + gs.players[1].sets;
  if (totalSets === 4 && gs.bestOf === 5) ctxs.push('fifthSet');
  if (totalSets === 2 && gs.bestOf === 3) ctxs.push('thirdSet');
  if (totalSets === 0)                    ctxs.push('firstSet');

  if (player.sets === 0 && opp.sets === 2) ctxs.push('down2Sets');
  if (player.games - opp.games >= 3)       ctxs.push('bigLead');

  const scoreState = _getPointPressureState(gs)[player.id];

  if (scoreState.isGamePoint || scoreState.isBreakPoint || scoreState.isSetPoint || scoreState.isMatchPoint)
    ctxs.push('decisiveMoment');
  if (scoreState.isDefendingBreakPoint) ctxs.push('breakPoint');
  if (scoreState.isMatchPoint || scoreState.isDefendingMatchPoint) ctxs.push('matchPoint');

  if (gs.rally >= 8) ctxs.push('longRally');
  if (gs.rally >= 15) ctxs.push('longMatch'); // alias usado por alguns traits
  if (
    (player.ctx?.rallyPressure ?? 0) > 0.5 ||
    scoreState.isBreakPoint ||
    scoreState.isDefendingBreakPoint ||
    scoreState.isSetPoint ||
    scoreState.isMatchPoint ||
    scoreState.isDefendingMatchPoint
  ) ctxs.push('pressure');
  if (player.games === 0 && opp.games === 0) ctxs.push('firstGame');
  if (gs.isSlam) ctxs.push('grandSlam');

  // ── Contextos de idade e carreira ────────────────────────────────
  // O objeto `player` em gs já é o NAMED_PLAYERS entry completo (com .age,
  // .peakAge, .rankPosition) injetado pelo UniverseManager antes do initGameState.
  const namedRef = player.namedPlayerKey
    ? (typeof NAMED_PLAYERS !== 'undefined' ? NAMED_PLAYERS[player.namedPlayerKey] : null)
    : null;
  const pAge       = namedRef?.age ?? player._age ?? null;
  const peakAge    = namedRef?.peakAge ?? player._peakAge ?? null;
  const rankPos    = namedRef?.rankPosition ?? player._rankPosition ?? null;

  if (pAge !== null) {
    if (pAge < 21)                         ctxs.push('under21');
    if (pAge >= 21 && pAge < 27)           ctxs.push('midCareer');
    if (pAge >= 27 && pAge < 31)           ctxs.push('lateCareer');
    if (pAge >= 31)                        ctxs.push('over30');
    if (pAge >= 33)                        ctxs.push('decline');
    // earlyCareer = primeiros 3 anos como pro (proxy: sub-22)
    if (pAge < 22)                         ctxs.push('earlyCareer');
  }

  if (peakAge !== null && pAge !== null) {
    const yearsToPeak = peakAge - pAge;
    if (yearsToPeak >= 0 && yearsToPeak <= 3) ctxs.push('nearPeak');
  }

  // Contextos de ranking
  if (rankPos !== null) {
    if (rankPos >= 1  && rankPos <= 5)  ctxs.push('topSeed');
    if (rankPos >= 50)                  ctxs.push('underdog');
  }
  if (opp.namedPlayerKey) {
    const oppNamed = typeof NAMED_PLAYERS !== 'undefined' ? NAMED_PLAYERS[opp.namedPlayerKey] : null;
    const oppRank  = oppNamed?.rankPosition ?? null;
    if (oppRank !== null && rankPos !== null) {
      if (oppRank <= 5 && rankPos > 20)  ctxs.push('vsTopSeed');
      if (rankPos  <= 5 && oppRank > 20) ctxs.push('heavyFavorite');
    }
  }

  // Contextos de round do torneio
  if (gs.tournamentRound) {
    const r = gs.tournamentRound;
    if (r === 'F' || r === 'SF' || r === 'QF') ctxs.push('knockoutRound');
    if (r === 'F' || r === 'SF')                ctxs.push('quarterFinal+');
    if (r === 'F')                              ctxs.push('importantMatch');
  }

  return ctxs;
}

function getPlayerTraitFx(player, gs) {
  const neutral = { strengthBonus: 0, clutchMult: 1.0, errorMult: 1.0,
                    staminaMult: 1.0, serveMult: 1.0, opponentDebuff: 0, formFloor: null };
  if (!player?.dna?.slots?.length) return neutral;

  const ctxSet = new Set(buildTraitCtx(player, gs));
  const out    = { ...neutral };
  const lvls   = ['BOA_FORMA', 'GRANDE_FORMA', 'IMPARAVEL'];

  // Itera por slot (não por contexto) para evitar double-count
  for (const slot of player.dna.slots) {
    const traitDef = TRAIT_CATALOG[slot.traitId];
    if (!traitDef) continue;
    const tierData = traitDef.tiers?.[slot.tier];
    if (!tierData?.effects) continue;
    const fx    = tierData.effects;
    const fxCtx = fx.context ?? ['always'];
    if (fxCtx.includes('never')) continue;
    // Aplica se qualquer contexto ativo bate
    const applies = fxCtx.some(c => c === 'always' || ctxSet.has(c));
    if (!applies) continue;
    out.strengthBonus  += fx.strengthBonus  ?? 0;
    out.clutchMult     *= fx.clutchMult     ?? 1;
    out.errorMult      *= fx.errorMult      ?? 1;
    out.staminaMult    *= fx.staminaMult    ?? 1;
    out.serveMult      *= fx.serveMult      ?? 1;
    out.opponentDebuff += fx.opponentDebuff ?? 0;
    if (fx.formFloor) {
      const cur = out.formFloor ? lvls.indexOf(out.formFloor) : -1;
      if (lvls.indexOf(fx.formFloor) > cur) out.formFloor = fx.formFloor;
    }
  }
  return out;
}

function getUnifiedPlayerTraitFx(player, gs) {
  const neutral = { strengthBonus: 0, clutchMult: 1.0, errorMult: 1.0, staminaMult: 1.0, serveMult: 1.0, opponentDebuff: 0, formFloor: null };
  if (!player?.dna?.slots?.length) return neutral;
  const scoreState = _getPointPressureState(gs)[player.id];
  const opp = gs.players[1 - player.id];
  const namedRef = player.namedPlayerKey ? (NAMED_PLAYERS[player.namedPlayerKey] ?? null) : null;
  const oppNamed = opp?.namedPlayerKey ? (NAMED_PLAYERS[opp.namedPlayerKey] ?? null) : null;
  const contexts = collectTraitContexts(player, {
    surface: gs.courtMeta?.surface ?? 'HARD',
    bestOf: gs.bestOf,
    inTiebreak: gs.inTiebreak,
    totalSets: gs.players[0].sets + gs.players[1].sets,
    playerSets: player.sets,
    oppSets: opp.sets,
    playerGames: player.games,
    oppGames: opp.games,
    rally: gs.rally,
    pressure: (player.ctx?.rallyPressure ?? 0) > 0.5,
    isSlam: gs.isSlam,
    age: namedRef?.age ?? player._age ?? null,
    peakAge: namedRef?.peakAge ?? player._peakAge ?? null,
    rankPos: namedRef?.rankPosition ?? player._rankPosition ?? null,
    oppRank: oppNamed?.rankPosition ?? opp._rankPosition ?? null,
    roundLabel: gs.tournamentRound ?? null,
    isGamePoint: scoreState.isGamePoint,
    isSetPoint: scoreState.isSetPoint,
    isMatchPoint: scoreState.isMatchPoint,
    isBreakPoint: scoreState.isBreakPoint,
    isDefendingBreakPoint: scoreState.isDefendingBreakPoint,
    isDefendingMatchPoint: scoreState.isDefendingMatchPoint,
  });
  return getTraitEffects(player, { contexts });
}

// ── Factory helpers ───────────────────────────────────────────────

// FASE 3 — converte courtKey para superfície normalizada usada em recentForm/matchPlan
function _courtKeyToSurface(courtKey = '') {
  const k = courtKey.toUpperCase();
  if (k.includes('CLAY') || k.includes('ROLAND') || k.includes('MONTECARLO')) return 'clay';
  if (k.includes('GRASS') || k.includes('WIMBLEDON') || k.includes('QUEENS'))  return 'grass';
  if (k.includes('INDOOR') || k.includes('ATP_FINALS') || k.includes('PARIS')) return 'indoor';
  if (k.includes('CARPET') || k.includes('VELVET')) return 'carpet';
  if (k.includes('STREET') || k.includes('URBAN') || k.includes('ASPHALT')) return 'street';
  return 'hard';
}

function getStaminaResistanceDrainMult(player) {
  const resPct = (player?.attrs?.resistencia ?? 70) / 100;
  const treeMult = player?._surfaceTalentFx?.staminaDrainMult ?? 1;
  const identityMult = player?._surfaceIdentityFx?.staminaMult ?? 1;
  const talent = getTalentRuntimeEffects(player, { stamina: player?.stamina });
  return clamp((1.28 - resPct * 0.56) * treeMult * identityMult * talent.staminaDrainMult, 0.66, 1.18);
}

function getResistanceFatigueProtection(player) {
  const resPct = clamp((player?.attrs?.resistencia ?? 70) / 100, 0, 1);
  return clamp((resPct - 0.45) / 0.55 + getTalentRuntimeEffects(player).fatigueProtectionAdd, 0, 1);
}

function getDefenseRecoveryReachMult(player) {
  const defense = clamp((player?.attrs?.defesa ?? 60) / 100, 0, 1);
  return 1 + clamp((defense - 0.42) / 0.58, 0, 1) * 0.16 + getTalentRuntimeEffects(player).defenseReachBonus;
}

function getStaminaResistanceRecoveryMult(player) {
  const resPct = (player?.attrs?.resistencia ?? 70) / 100;
  const treeMult = player?._surfaceTalentFx?.physicalRecoveryMult ?? 1;
  return clamp((0.78 + resPct * 0.44) * treeMult * getTalentRuntimeEffects(player).staminaRecoveryMult, 0.86, 1.38);
}

function recoverPlayerStamina(player, baseAmount) {
  const current = clamp(player?.stamina ?? 1.0, 0, 1);
  const fatigueNeedMult = 0.70 + (1 - current) * 0.60;
  const recAmount = baseAmount * getStaminaResistanceRecoveryMult(player) * fatigueNeedMult;
  player.stamina = Math.min(1.0, current + recAmount);
}

function classifyShotError(gs, hitter) {
  if (!hitter || hitter._forceUE) return 'UE';
  const lastShot = gs?._lastShotEvent?.playerId === hitter.id ? gs._lastShotEvent : null;
  const pressure = Math.max(
    clamp(hitter.ctx?.rallyPressure ?? 0, 0, 1),
    clamp(lastShot?.receiverPressure ?? 0, 0, 1),
  );
  const arrival = hitter._arrivalMargin ?? 0;
  const dist = hitter._commitDistance ?? hitter._movementContactScore ?? 0;
  const bodyBad = lastShot?.bodyState === 'STRETCHED'
    || lastShot?.bodyState === 'LATE'
    || lastShot?.executionMode === 'SURVIVAL'
    || hitter._movementContactClass === 'CHASE'
    || hitter._locomotionMode === 'SPRINT';
  const cleanSelfMiss = lastShot?.forcedErrorKind
    && lastShot?.executionMode === 'FULL'
    && pressure < 0.48
    && arrival >= -0.10;
  const underRealPressure = pressure >= THRESHOLDS.forcedErrorPressure
    || arrival < -0.16
    || bodyBad
    || dist > THRESHOLDS.forcedErrorDiff;
  return underRealPressure && !cleanSelfMiss ? 'FE' : 'UE';
}

function recordShotError(gs, hitter) {
  if (!hitter) return null;
  hitter.errorCount++;
  const tag = classifyShotError(gs, hitter);
  if (tag === 'FE') hitter.stats.forcedErrors++;
  else hitter.stats.unforcedErrors++;
  if (hitter.ctx) {
    if (tag === 'UE') {
      hitter.ctx.consecutiveUE = (hitter.ctx.consecutiveUE ?? 0) + 1;
    } else {
      hitter.ctx.consecutiveUE = 0;
      hitter.ctx.errorDirStreak = 0;
    }
  }
  hitter._forceUE = false;
  return tag;
}

function recordForcedErrorOnDefender(gs, defender) {
  if (!defender) return null;
  defender.errorCount++;
  defender.stats.forcedErrors++;
  if (defender.ctx) {
    defender.ctx.consecutiveUE = 0;
    defender.ctx.errorDirStreak = 0;
  }
  defender._forceUE = false;
  return 'FE';
}

function recordUnforcedErrorOnDefender(gs, defender) {
  if (!defender) return null;
  defender.errorCount++;
  defender.stats.unforcedErrors++;
  if (defender.ctx) {
    defender.ctx.consecutiveUE = (defender.ctx.consecutiveUE ?? 0) + 1;
  }
  defender._forceUE = false;
  return 'UE';
}

function isDecisiveWinnerShot(gs, hitter, defender, meta = {}) {
  const ball = gs?.ball;
  if (!ball || !hitter || !defender || ball.lastHitBy !== hitter.id) return false;

  const lastBounce = gs.lastBouncePos ?? null;
  const lastBounceInCourt = lastBounce
    ? Math.abs(lastBounce.y) <= COURT.halfL + 0.05
      && Math.abs(lastBounce.x) <= COURT.singlesW / 2 + 0.05
    : false;
  const bouncedOnOpponentSide = Math.sign(lastBounce?.y ?? ball.pos.y) === defender.side;
  if (!lastBounceInCourt || !bouncedOnOpponentSide) return false;

  const outsideCourt = Math.abs(ball.pos.y) > COURT.halfL + 0.05
    || Math.abs(ball.pos.x) > COURT.singlesW / 2 + 0.05;
  const beyondChase = Math.abs(ball.pos.y) > COURT.halfL + THRESHOLDS.chaseOutLimitY
    || Math.abs(ball.pos.x) > COURT.singlesW / 2 + THRESHOLDS.chaseOutLimitX;

  const dist = meta.dist ?? Math.hypot((defender.pos.x ?? 0) - (ball.pos.x ?? 0), (defender.pos.y ?? 0) - (ball.pos.y ?? 0));
  const staminaFactor = STAMINA.speedMinFactor + (defender.stamina ?? 1) * (1 - STAMINA.speedMinFactor);
  const maxDefSpd = meta.maxDefSpd ?? (defender.playerSpeed ?? PLAYER_CFG.speed) * staminaFactor;
  const defReach = (meta.defReach ?? (defender.reach ?? PLAYER_CFG.reach) + maxDefSpd * 0.24)
    * getDefenseRecoveryReachMult(defender);
  const postHitDelay = defender.ctx?._postHitPause ?? 0;
  const eta = maxDefSpd > 0 ? dist / maxDefSpd + postHitDelay : 999;
  const arrival = defender._arrivalMargin ?? 0;
  const defenderCouldStillPlay = defender._movementCanContactBall || defender._movementCanExecutePlannedShot;
  const lastShot = gs._lastShotEvent ?? {};
  const shotMeta = ball._lastShotMeta ?? {};
  const quality = clamp(lastShot.executionQuality ?? lastShot.quality ?? (1 - (shotMeta.errorRisk ?? 0.45)), 0, 1);
  const intent = lastShot.intent ?? '';
  const family = lastShot.family ?? ball.lastShotType ?? '';
  const kmh = lastShot.kmh ?? shotMeta.launchKmh ?? 0;
  const executionMode = lastShot.executionMode ?? shotMeta.executionMode ?? 'FULL';
  const cleanIntent = intent === 'FINISH' || intent === 'PASS' || intent === 'PRESSURE' || intent === 'REDIRECT';
  const finishingFamily = family === 'FLAT_DRIVE' || family === 'TOPSPIN' || family === 'SMASH' || family === 'VOLLEY';
  const decisiveQuality = quality >= 0.68
    || (quality >= 0.60 && cleanIntent && finishingFamily && kmh >= 96)
    || (family === 'DROP' && quality >= 0.72);
  const lowContextWinner = quality < 0.58 || intent === 'RESET' || intent === 'DEFEND';

  const deepCleanBounce = lastBounceInCourt
    && Math.abs(lastBounce?.y ?? 0) >= COURT.halfL - 0.55
    && Math.abs(lastBounce?.x ?? 0) <= COURT.singlesW / 2 - 0.08;
  const deepRunawayWinner = deepCleanBounce
    && outsideCourt
    && (beyondChase || eta > 0.78 || dist > defReach * 1.35)
    && !defenderCouldStillPlay;
  const unreachableGeometry = beyondChase
    || eta > 0.92
    || dist > defReach * 2.05
    || arrival < -0.28;
  const decisiveBySecondBounce = (ball.bounceCount ?? 0) >= 2
    && decisiveQuality
    && executionMode !== 'SURVIVAL'
    && !lowContextWinner
    && (unreachableGeometry || (family === 'DROP' && dist > defReach * 1.35));
  const decisiveByEscape = (beyondChase || (outsideCourt && dist > defReach * 1.78))
    && decisiveQuality
    && !lowContextWinner;
  const decisiveByPosition = (dist > defReach * 2.55 || eta > 1.08 || arrival < -0.30)
    && decisiveQuality
    && cleanIntent
    && !defenderCouldStillPlay;
  const decisive = decisiveBySecondBounce || deepRunawayWinner || decisiveByEscape || decisiveByPosition;

  if (decisive) {
    pushTech(gs,
      `[WINNER-CHECK] OK hitter:${hitter.name} def:${defender.name}` +
      ` dist:${dist.toFixed(2)} reach:${defReach.toFixed(2)} eta:${eta.toFixed(2)}` +
      ` q:${quality.toFixed(2)} intent:${intent} family:${family}` +
      ` bounce:${ball.bounceCount ?? 0} out:${outsideCourt} escape:${beyondChase} deep:${deepRunawayWinner}`
    );
  } else {
    pushTech(gs,
      `[WINNER-CHECK] NO hitter:${hitter.name} def:${defender.name}` +
      ` dist:${dist.toFixed(2)} reach:${defReach.toFixed(2)} eta:${eta.toFixed(2)}` +
      ` q:${quality.toFixed(2)} intent:${intent} family:${family}` +
      ` canPlay:${!!defenderCouldStillPlay} arr:${arrival.toFixed(2)} deep:${deepRunawayWinner}`
    );
  }
  return decisive;
}

function resolveUnreturnedBall(gs, hitter, defender, reason, meta = {}) {
  if (!hitter || !defender) return;
  // Este caminho só é chamado depois de uma bola válida no campo adversário
  // que teve segundo quique, fugiu da zona morta ou parou. Sem contato do
  // defensor, a estatística oficial é winner, independentemente de a bola
  // ter sido plana, curta, lenta ou de uma intenção não ofensiva.
  // Falhas de trajetória e bolas fora já são resolvidas antes desta função.
  // Não force outcomeType aqui: saque não devolvido ainda precisa permanecer ACE,
  // que é contabilizado separadamente de winner.
  resolvePoint(gs, hitter.id, reason.replace('[UNRETURNED]', '[WINNER]'), true);
}

export function createStats() {
  return {
    aces: 0, doubleFaults: 0,
    serve1In: 0, serve1Total: 0, serve1AvgKmh: 0,
    serve2In: 0, serve2Total: 0, serve2AvgKmh: 0,
    winners: 0, unforcedErrors: 0, forcedErrors: 0,
    pointsWonByOutcome: {}, pointsLostByOutcome: {},
    pointOutcomeCount: 0,
    netApproaches: 0, netPointsWon: 0,
    rallyLengths: [],
    byType: {}, pointWinsByType: {},
    byTypeQSum: {}, byTypeQCnt: {},
    byTypeKmhSum: {}, byTypeKmhCnt: {},
    // ── Serve / Return analytics ──────────────────────────────────────────
    // Pontos ganhos/perdidos quando este jogador está sacando ou recebendo
    pointsWonServing: 0,   pointsLostServing: 0,
    pointsWonReturning: 0, pointsLostReturning: 0,
    // Pontos por tipo de saque em jogo (1º vs 2º)
    serve1WonPoints: 0,  serve1LostPoints: 0,
    serve2WonPoints: 0,  serve2LostPoints: 0,
    // Games hold/break
    gamesServed: 0,    // total de games em que este jogador sacou
    gamesHeld: 0,      // games ganhos sacando (hold)
    gamesReturned: 0,  // total de games em que este jogador recebeu
    gamesConverted: 0, // breaks convertidos (ganhou recebendo)
    breakPointsOpportunities: 0,
    breakPointsConverted: 0,
    breakPointsFaced: 0,
    breakPointsSaved: 0,
    setPointsOpportunities: 0,
    setPointsConverted: 0,
    setPointsFaced: 0,
    setPointsSaved: 0,
    matchPointsOpportunities: 0,
    matchPointsConverted: 0,
    matchPointsFaced: 0,
    matchPointsSaved: 0,
    tiebreakPointsPlayed: 0,
    tiebreakPointsWon: 0,
    // Log por ponto para gráficos (max 300 pontos)
    serveLog: [], // { kmh, physType, dir, isFirst, won, isAce, pointNum }
    returnLog: [],
    receptionLog: [],
    contactLog: [],
    shotLog: [],
    intentLog: [],
    pointOutcomeLog: [],
    // Quality média de rally
    qualitySum: 0, qualityCount: 0,
    // ── Individual Rating (TDI-inspired) ─────────────────────────────────────
    // In Attack: golpes batidos em fase ofensiva (ATTACK)
    attackShots: 0,
    // Defense / Steal: golpes batidos em fase defensiva (DEFEND)
    defenseShots: 0,
    // Conversion: pontos jogados/ganhos quando em fase de ataque no último golpe
    attackPointsPlayed: 0, attackPointsWon: 0,
    // Steal: pontos jogados/ganhos quando em fase defensiva no último golpe
    defensePointsPlayed: 0, defensePointsWon: 0,
  };
}

function pushLimited(list, entry, max = 180) {
  if (!Array.isArray(list)) return;
  list.push(entry);
  if (list.length > max) list.splice(0, list.length - max);
}

function classifyModernShotType(decision, execution) {
  const family = decision?.family ?? 'UNKNOWN';
  if (decision?.blueprintId === 'BANANA_CURVE') return 'BANANA';
  if (decision?.blueprintId === 'VOLLEY_DROP') return 'DROP_VOLLEY';
  if (decision?.blueprintId === 'LOB_TOPSPIN_PASS') return 'TOPSPIN_LOB';
  if (family === 'DROP') return 'DROP';
  if (family === 'SLICE' && (decision?.sliceProfile === 'SHORT_VARIATION' || execution?.sliceProfile === 'SHORT_VARIATION')) {
    return 'SLICE_SHORT';
  }
  const shortAngle = execution?.landingEnvelope?.shortAngleGeometry
    || ((family === 'TOPSPIN' || family === 'FLAT_DRIVE')
      && Math.abs(execution?.targetY ?? 99) < 5.85
      && Math.abs(execution?.targetX ?? 0) > 1.90);
  if (shortAngle) return 'SHORT_ANGLE';
  return family;
}

function recordModernShotTelemetry(gs, player, context, quality, decision, execution, shotEngineSnapshot, isReturnContact) {
  const stats = player?.stats;
  if (!stats) return;
  stats.byType ??= {};
  stats.byTypeQSum ??= {};
  stats.byTypeQCnt ??= {};
  stats.byTypeKmhSum ??= {};
  stats.byTypeKmhCnt ??= {};
  stats.returnLog ??= [];
  stats.receptionLog ??= [];
  stats.contactLog ??= [];
  stats.shotLog ??= [];
  stats.intentLog ??= [];

  const physicalFamily = decision?.family ?? 'UNKNOWN';
  const shotType = classifyModernShotType(decision, execution);
  const q = clamp(quality?.quality ?? 0, 0, 1);
  const kmh = Number.isFinite(execution?.speedKmh)
    ? execution.speedKmh
    : Number.isFinite(execution?.exitKmh)
      ? execution.exitKmh
      : Number.isFinite(gs?.ball?.vel?.x)
        ? Math.hypot(gs.ball.vel.x ?? 0, gs.ball.vel.y ?? 0, gs.ball.vel.z ?? 0) * 3.6
        : null;

  stats.byType[shotType] = (stats.byType[shotType] ?? 0) + 1;
  stats.byTypeQSum[shotType] = (stats.byTypeQSum[shotType] ?? 0) + q;
  stats.byTypeQCnt[shotType] = (stats.byTypeQCnt[shotType] ?? 0) + 1;
  if (Number.isFinite(kmh)) {
    stats.byTypeKmhSum[shotType] = (stats.byTypeKmhSum[shotType] ?? 0) + kmh;
    stats.byTypeKmhCnt[shotType] = (stats.byTypeKmhCnt[shotType] ?? 0) + 1;
  }
  stats.qualitySum = (stats.qualitySum ?? 0) + q;
  stats.qualityCount = (stats.qualityCount ?? 0) + 1;

  const base = {
    pointNum: gs?._currentPointId ?? gs?.pointNumber ?? gs?.pointsPlayed ?? null,
    rally: gs?.rally ?? 0,
    isReturnContact: !!isReturnContact,
    family: physicalFamily,
    shotType,
    intent: decision?.intent ?? null,
    direction: decision?.direction ?? null,
    wing: context?.wing ?? null,
    quality: q,
    bodyState: quality?.bodyState ?? null,
    pressure: context?.rallyPressure ?? player?.ctx?.rallyPressure ?? null,
    momentum: player?.ctx?.momentum ?? null,
    stamina: player?.stamina ?? null,
    targetX: execution?.targetX ?? null,
    targetY: execution?.targetY ?? null,
    power: execution?.power ?? null,
    spinType: execution?.spinType ?? null,
    kmh: Number.isFinite(kmh) ? +kmh.toFixed(1) : null,
    errorRisk: execution?.errorRisk ?? null,
    missChance: execution?.missChance ?? null,
    executionQuality: execution?.executionProfile?.executionQuality ?? null,
    technique: execution?.executionProfile?.technique ?? null,
    preparation: execution?.executionProfile?.preparation ?? null,
    decisionQuality: execution?.executionProfile?.decisionQuality ?? null,
    intentDemand: execution?.executionProfile?.intentDemand ?? null,
    intentFit: execution?.executionProfile?.intentFit ?? null,
    ambitionGap: execution?.executionProfile?.ambitionGap ?? null,
    executionMode: execution?.executionMode ?? execution?.executionProfile?.executionMode ?? null,
    intendedWing: context?.body?.intendedWing ?? null,
    naturalWing: context?.body?.naturalWing ?? null,
    strokePreparationMode: context?.body?.strokePreparation?.mode ?? null,
    mechanicalIntegrity: context?.body?.mechanicalIntegrity ?? null,
    wingSwitchSeverity: context?.body?.wingSwitchSeverity ?? null,
    weightTransfer: context?.body?.weightTransfer ?? null,
    rotationReadiness: context?.body?.rotationReadiness ?? null,
    directionFreedom: context?.body?.directionFreedom ?? null,
    powerTransfer: context?.body?.powerTransfer ?? null,
    shotEngine: shotEngineSnapshot ?? null,
  };

  pushLimited(stats.contactLog, {
    ...base,
    isReturnContact: !!isReturnContact,
    distanceToBall: context?.body?.distanceToBall ?? null,
    baseReach: context?.body?.baseReach ?? null,
    normalContactReach: context?.body?.normalContactReach ?? null,
    contactReach: context?.body?.reach ?? null,
    contactClass: context?.body?.contactClass ?? null,
    arrivalMargin: context?.body?.arrivalMargin ?? null,
    contactReadiness: context?.body?.contactReadiness ?? null,
    contactSettleTime: context?.body?.contactSettleTime ?? null,
    commitDistance: context?.body?.commitDistance ?? null,
    commitDistanceRaw: context?.body?.commitDistanceRaw ?? null,
    contactPositionError: context?.body?.contactPositionError ?? null,
    emergencyReachActive: context?.body?.emergencyReachActive ?? false,
    locomotionMode: context?.body?.locomotionMode ?? null,
    movementPhase: context?.body?.movementPhase ?? null,
    movementState: context?.body?.movementState ?? null,
    movementPlanVersion: context?.body?.movementPlanVersion ?? null,
    planRevisions: context?.body?.planRevisions ?? 0,
    planCorrectionCost: context?.body?.planCorrectionCost ?? 0,
    interceptionKind: context?.body?.interceptionKind ?? null,
    interceptionUncertainty: context?.body?.interceptionUncertainty ?? null,
    beliefVersion: context?.body?.beliefVersion ?? null,
    beliefPositionError: context?.body?.beliefPositionError ?? null,
    inferredShape: context?.body?.inferredShape ?? null,
    footworkStance: context?.body?.footworkStance ?? null,
    footworkWing: context?.body?.footworkWing ?? null,
    footworkPreparation: context?.body?.footworkPreparation ?? null,
    footworkSpacingQuality: context?.body?.footworkSpacingQuality ?? null,
    runAroundForehand: context?.body?.runAroundForehand ?? false,
    strokePreparation: context?.body?.strokePreparation ?? null,
    appliedContactWait: context?.body?.appliedContactWait ?? false,
    footingSurface: context?.body?.footingSurface ?? null,
    footingStability: context?.body?.footingStability ?? null,
    surfaceSlide: context?.body?.surfaceSlide ?? false,
    surfaceSlideControl: context?.body?.surfaceSlideControl ?? 0,
    surfaceSlipRisk: context?.body?.surfaceSlipRisk ?? 0,
    movementEngineVersion: context?.body?.movementEngineVersion ?? null,
    movementCoherence: context?.body?.movementCoherence ?? null,
    movementCoherenceSeverity: context?.body?.movementCoherenceSeverity ?? null,
    movementCoherenceFlags: context?.body?.movementCoherenceFlags ?? [],
    bodyCommitment: context?.body?.bodyCommitment ?? null,
    splitStep: context?.body?.splitStep ?? null,
    ballSpeed: context?.ballState?.speed ?? null,
    ballHeight: context?.ballState?.z ?? context?.ballState?.pos?.z ?? null,
  });
  pushLimited(stats.shotLog, base);
  pushLimited(stats.intentLog, {
    pointNum: base.pointNum,
    rally: base.rally,
    family: physicalFamily,
    shotType,
    intent: base.intent,
    direction: base.direction,
    quality: q,
    approachFit: decision?.approachFit ?? decision?._approachFit ?? null,
    approachIntent: decision?.approachIntent ?? decision?._approachIntent ?? null,
    buildMode: shotEngineSnapshot?.buildMode ?? null,
    finishMode: shotEngineSnapshot?.finishMode ?? null,
  });

  if (isReturnContact) {
    pushLimited(stats.returnLog, {
      ...base,
      serve: gs?._pendingServeData ? {
        isFirst: gs._pendingServeData.isFirst,
        kmh: gs._pendingServeData.kmh,
        physType: gs._pendingServeData.physType,
        dir: gs._pendingServeData.dir,
        delivery: gs._pendingServeData.delivery ?? null,
      } : null,
      returnOutcome: shotEngineSnapshot?.returnOutcome ?? null,
      returnPlanFamily: shotEngineSnapshot?.returnPlanFamily ?? null,
      serveReturnKind: shotEngineSnapshot?.serveReturnKind ?? null,
      returnPosture: shotEngineSnapshot?.returnPosture ?? null,
      returnRealEmergency: shotEngineSnapshot?.returnRealEmergency ?? false,
      returnReactiveReach: shotEngineSnapshot?.returnReactiveReach ?? null,
      returnChallenge: quality?.returnContact ?? null,
      serveAdvantage: gs?._serveAdvantageContext ?? null,
    });
  } else {
    pushLimited(stats.receptionLog, {
      ...base,
      incomingFamily: gs?._lastShotEvent?.family ?? null,
      incomingIntent: gs?._lastShotEvent?.intent ?? null,
      incomingQuality: gs?._lastShotEvent?.quality ?? null,
    });
  }

  gs._lastShotEvent = {
    playerId: player.id,
    family: physicalFamily,
    type: shotType,
    intent: decision?.intent ?? null,
    direction: decision?.direction ?? null,
    wing: context?.wing ?? null,
    quality: q,
    executionQuality: execution?.executionProfile?.executionQuality ?? q,
    executionMode: execution?.executionMode ?? execution?.executionProfile?.executionMode ?? null,
    errorRisk: execution?.errorRisk ?? null,
    missChance: execution?.missChance ?? null,
    forcedErrorKind: execution?.forcedErrorKind ?? null,
    bodyState: quality?.bodyState ?? null,
    atNet: !!player.atNet,
    receiverPressure: context?.player?.ctx?.rallyPressure ?? 0,
    kmh: Number.isFinite(kmh) ? +kmh.toFixed(1) : null,
  };
}

export function createBall() {
  return { pos: v3(0,0,0.5), vel: v3(0,0,0), spin: v3(0,0,0),
           inFlight: false, bounceCount: 0, lastHitBy: -1, lastBounceSide: 0, outGraceTimer: 0 };
}

function inferRuntimeSignature(player = {}) {
  const attrs = player.attrs ?? {};
  const prefs = player.prefs ?? {};
  const options = [
    ['FH_TOPSPIN_CROSS', (attrs.topspin ?? 50) * .38 + (attrs.fhControle ?? 50) * .16],
    ['FH_FLAT_BOMB', (attrs.fhPotencia ?? 50) * .42 + (attrs.explosividade ?? 50) * .12],
    ['BH_TOPSPIN_CROSS', (attrs.bhPotencia ?? 50) * .24 + (attrs.bhControle ?? 50) * .28],
    ['BH_SLICE_DEEP', (attrs.slice ?? 50) * .38 + (attrs.leitura ?? 50) * .12],
    ['DROP_HIDDEN', (attrs.slice ?? 50) * .20 + (attrs.visaoTatica ?? 50) * .18 + (prefs.buildStyle === 'DROP_VARIATION' ? 18 : 0)],
    ['SERVE_FLAT_BOMB', (attrs.saqueForca ?? 50) * .38 + (attrs.saquePrecisao ?? 50) * .14],
    ['VOLLEY_PUNCH', (attrs.volley ?? 50) * .34 + (attrs.smash ?? 50) * .16 + (['HUNTER','PROACTIVE'].includes(prefs.netGame) ? 14 : 0)],
  ];
  return options.sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'FH_TOPSPIN_CROSS';
}

function inferRuntimePattern(player = {}) {
  const prefs = player.prefs ?? {};
  if (['HUNTER','PROACTIVE'].includes(prefs.netGame)) return 'NET_CLOSER';
  if (prefs.buildStyle === 'SLICE_CONTROL') return 'SLICE_DISRUPTOR';
  if (prefs.buildStyle === 'CROSS_SHORT_ANGLE' || prefs.buildStyle === 'DROP_VARIATION') return 'SHORT_ANGLE_ASSASSIN';
  if (['PATIENT','MEASURED'].includes(prefs.rallyCadence)) return 'DEEP_COURT_GRINDER';
  if (['EXPLOSIVE','EARLY_ATTACK'].includes(prefs.rallyCadence)) return 'SERVE_FH_KILL';
  return 'BH_WALL';
}

function signatureDisplayId(naturalSignature) {
  return ({
    FH_TOPSPIN_CROSS:'TOPSPIN_CROSS', FH_FLAT_BOMB:'FLAT_WINNER', BH_TOPSPIN_CROSS:'DTL_BH',
    BH_SLICE_DEEP:'SLICE_BH', DROP_HIDDEN:'DROP_SHOT', SERVE_FLAT_BOMB:'BIG_SERVE',
    VOLLEY_PUNCH:'VOLLEY_FINISH',
  })[naturalSignature] ?? null;
}

export function createPlayer(id, side, name, color, styleId, namedPlayerKey) {
  const named = namedPlayerKey ? NAMED_PLAYERS[namedPlayerKey] : null;
  const surfaceOwner = named ? ensureSurfaceProfile(named, { source: 'MATCH_RUNTIME' }) : null;
  const rawAttrs = named ? named.attrs : null;
  // FIX: migra jogadores com schema antigo (28 attrs) para v3 (14 attrs) antes de computar mods.
  // Sem isso, attrs como controle, potencia, agressividade ficam undefined → fallback 50 → todos
  // os jogadores legados ficam iguais (nenhuma fraqueza, nenhuma força real).
  const migratedAttrs = rawAttrs ? migrateAttrsToV3(rawAttrs) : null;
  const attrs  = migratedAttrs ? { ...migratedAttrs } : null;
  const mods   = attrs  ? computePlayerMods(attrs) : null;
  // Phase 1: styleData is now cosmetic only — engine reads attrs+prefs (Phase 3)
  const styleData = PLAY_STYLES[styleId] ?? PLAY_STYLES['ALL_COURT'];
  // baselineOffset derived from attrs: aggressive (high agg) stays further forward
  const _aggr = attrs?.visaoTatica ?? attrs?.agressividade ?? 60;
  const _net  = ((attrs?.volley ?? attrs?.jogoDeRede ?? 60) + (attrs?.smash ?? attrs?.jogoDeRede ?? 60)) / 2;
  const baselineOffset = 0.20 + (_aggr / 100) * 0.50 + (_net / 100) * 0.20;
  const baseY  = side * (COURT.halfL - baselineOffset);

  // Per-player physics (scaled by attributes when available)
  const playerSpeed = PLAYER_CFG.speed  * (mods ? mods.speedMult  : 1.0);
  const playerAccel = PLAYER_CFG.maxAccel * (mods ? mods.accelMult : 1.0);
  const playerDecel = PLAYER_CFG.maxDecel * (mods ? mods.decelMult : 1.0);
  const playerReach = PLAYER_CFG.reach   + (mods ? mods.reachBonus : 0);
  const talentIdentity = named ? cloneTalentIdentity(initializeTalentIdentity(named, { source: 'MATCH' })) : null;
  const runtimeNaturalSignature = named?.naturalSignature ?? (named ? inferRuntimeSignature(named) : null);
  const runtimeSignaturePattern = named?.signaturePattern ?? (named ? inferRuntimePattern(named) : null);
  const runtimeSignatureShot = named?.signatureShot ?? signatureDisplayId(runtimeNaturalSignature);

  return {
    id, side, name, color, styleId, styleData,
    namedPlayerKey, attrs, mods, talentIdentity,
    // Identidade competitiva precisa viajar junto da ficha para a partida.
    // O Shot Engine, MatchPlan e TraitSystem usam estes campos para transformar
    // a identidade escrita do atleta em decisões de quadra. Antes eles eram
    // zerados aqui, então assinaturas e padrões só sobreviviam na interface.
    naturalSignature: runtimeNaturalSignature,
    signatureShot: runtimeSignatureShot,
    signatureShots: Array.isArray(named?.signatureShots)
      ? [...named.signatureShots]
      : (runtimeSignatureShot ? [runtimeSignatureShot] : []),
    rallyPattern: named?.rallyPattern ?? null,
    signaturePattern: runtimeSignaturePattern,
    courtIdentity: named?.courtIdentity ?? null,
    courtIdentitySeed: named?.courtIdentitySeed ?? null,
    handedness: named?.handedness ?? named?.plays ?? 'RIGHT',
    coaching: named?.coaching ? { ...named.coaching } : null,
    playerSpeed, playerAccel, playerDecel,
    pos: v2(0, baseY), basePos: v2(0, baseY), vel: v2(0, 0),
    atNet: false, reach: playerReach, stamina: 1.0,
    hitCooldown: 0, swinging: false, swingTimer: 0,
    score: 0, games: 0, sets: 0, faults: 0,
    setsHistory: [],  // [games_won_set1, games_won_set2, ...] para o scoreboard
    shotCount: 0, errorCount: 0, winnerCount: 0,
    _arrivalMargin: 0.5,  // initialise as "plenty of time"
    _predCrossX: 0,
    _nearMissTimer: 0,    // near-miss hysteresis countdown (seconds)
    // ── Position heatmap: 12 cols × 16 rows, player's half-court ────────────
    // X: –singlesW/2 → +singlesW/2 (8.23 m total)
    // Y (depth): 0 (net) → halfL (11.885 m, baseline). Stored as absolute |Y|.
    _heatGrid: new Uint16Array(12 * 16),
    _heatTick: 0,
    ctx: createCtx(), stats: createStats(),
    // ── Player prefs — prefs do jogador (Fase 2/3) ────────────────
    // prefs baked na ficha têm prioridade; fallback gera dos attrs.
    prefs: named?.prefs ?? (attrs ? generatePrefs(attrs) : null),
    surfaceStats: surfaceOwner?.surfaceStats ?? named?.surfaceStats ?? null,
    surfaceIdentity: surfaceOwner?.surfaceIdentity ?? named?.surfaceIdentity ?? null,
    surfaceProfile: surfaceOwner?.surfaceProfile ?? null,
    recentForm: named?.recentForm ?? null,
    _talentTrees: derivePlayerTalentTrees(named ?? { attrs: migratedAttrs ?? rawAttrs ?? {}, prefs: named?.prefs ?? null, surfaceStats: named?.surfaceStats ?? null, surfaceIdentity: named?.surfaceIdentity ?? null, recentForm: named?.recentForm ?? null }),
    // Shot engine offline: sem formaDoDia ou decisao antiga de golpes
    _formaDoDia: undefined,
    // Visual DNA: injury e traits para diferenciação visual no canvas
    injury: named?.injury ?? null,
    dna:    named?.dna    ?? null,
    _matchPlan: null,
  };
}

// ── Tech Log helpers ───────────────────────────────────────────────
const _f2  = n => (typeof n === 'number' ? (n >= 0 ? ' ' : '') + n.toFixed(2) : '   ???');
const _f1  = n => (typeof n === 'number' ? (n >= 0 ? ' ' : '') + n.toFixed(1) : '  ???');
const _fi  = n => String(Math.round(n ?? 0)).padStart(4);
const _pct = n => String(Math.round((n ?? 0) * 100)).padStart(3) + '%';
const _pad = (s, w) => String(s).padStart(w);

function techPt(gs) {
  // flush current point buffer into techLog
  const p0 = gs.players[0], p1 = gs.players[1];
  gs._techPtNum = (gs._techPtNum || 0) + 1;
  const bar = '═'.repeat(62);
  const hdr = [
    bar,
    `PONTO #${_pad(gs._techPtNum, 3)} │ Set ${p0.sets}-${p1.sets} │ Game ${_pad(p0.games,2)}-${_pad(p1.games,2)} │ Score ${SCORE_LABELS[p0.score]}-${SCORE_LABELS[p1.score]}`,
    `Servidor: ${gs.players[gs.server].name} │ Rally máx até aqui: ${gs.maxRally}`,
    bar,
  ].join('\n');
  gs.techLog.push(hdr);
  for (const line of gs._ptBuf) gs.techLog.push(line);
  if (gs.techLog.length > 900) gs.techLog.splice(0, gs.techLog.length - 900);
}

function techEnd(gs, winnerIdx, reason) {
  const w = gs.players[winnerIdx];
  gs.techLog.push(`[FIM] ▶ ${w.name} vence | ${reason} | rally=${gs.rally}`);
  gs.techLog.push('');
  if (gs.techLog.length > 900) gs.techLog.splice(0, gs.techLog.length - 900);
  gs._ptBuf = [];
}

function pushTech(gs, line) {
  if (!gs._ptBuf) gs._ptBuf = [];
  gs._ptBuf.push(line);
  if (gs._ptBuf.length > 90) gs._ptBuf.splice(0, gs._ptBuf.length - 90);
}

function debugHitGate(gs, player, reason, extra = null) {
  if (gs && player) auditRegisterHitGate(gs, player, reason, extra);
  if (typeof window === 'undefined' || !window.HIT_DEBUG) return;
  const now = performance?.now?.() ?? Date.now();
  const lastAt = player?._hitDebugLastAt ?? 0;
  const lastReason = player?._hitDebugLastReason ?? '';
  if (reason === lastReason && now - lastAt < 120) return;
  player._hitDebugLastAt = now;
  player._hitDebugLastReason = reason;
  const b = gs?.ball;
  console.log('[HIT-GATE]', {
    player: player?.name,
    reason,
    rally: gs?.rally ?? 0,
    isFirstBounce: gs?.isFirstBounce ?? false,
    serveBounced: gs?.serveBounced ?? false,
    bounceCount: b?.bounceCount ?? 0,
    ballPos: b ? { x: +b.pos.x.toFixed(2), y: +b.pos.y.toFixed(2), z: +b.pos.z.toFixed(2) } : null,
    ballVel: b ? { x: +b.vel.x.toFixed(2), y: +b.vel.y.toFixed(2), z: +b.vel.z.toFixed(2) } : null,
    extra,
  });
}

function markShotEngineOffline(gs, context = {}) {
  const event = buildOfflineShotEvent(context);
  gs.shotEngineOffline = event;
  gs.lastPointReason = SHOT_ENGINE_OFFLINE;
  if (!gs._shotEngineOfflineLogged) {
    gs._shotEngineOfflineLogged = true;
    gs.log?.push?.('SHOT_ENGINE_OFFLINE: sistema antigo de shots arquivado; novo motor ainda nao existe.');
    gs.techLog?.push?.('[SHOT_ENGINE_OFFLINE] Sistema antigo de shots arquivado. Partida bloqueada ate o novo motor existir.');
  }
  return event;
}

export function initGameState(styleA, styleB, namedKeyA, namedKeyB, courtKey = 'US_OPEN', bestOf = 3, rivalSystem = null, matchMeta = null) {
  const npA = namedKeyA ? NAMED_PLAYERS[namedKeyA] : null;
  const npB = namedKeyB ? NAMED_PLAYERS[namedKeyB] : null;
  const sA = npA ? npA.styleId : (styleA || STYLE_KEYS[Math.floor(Math.random() * STYLE_KEYS.length)]);
  const sB = npB ? npB.styleId : (styleB || STYLE_KEYS[Math.floor(Math.random() * STYLE_KEYS.length)]);
  const nameA = npA ? npA.name : 'Agente A';
  const nameB = npB ? npB.name : 'Agente B';
  const colorA = npA ? npA.color : '#FF6B35';
  const colorB = npB ? npB.color : '#00D4FF';

  const court       = COURTS[courtKey] ?? COURTS.US_OPEN;
  const courtVisual = getCourtVisual(courtKey);
  const courtPhysics = getCourtPhysics(courtKey);
  const courtMods   = getCourtStyleMods(courtKey);
  const matchFormat = matchMeta?.format ?? null;
  const isSuperTiebreakOnly = matchFormat === 'SUPER_TB_10';

  const gs = {
    gameState: GameState.PRE_SERVE, ball: createBall(),
    players: [
      createPlayer(0,  1, nameA, colorA, sA, namedKeyA || null),
      createPlayer(1, -1, nameB, colorB, sB, namedKeyB || null),
    ],
    server: 0, receiver: 1,
    rally: 0, maxRally: 0, totalPoints: 0, totalBounces: 0,
    _currentPointId: 1, _matchPointCounter: 1,
    bounceLog: [],  // {x, y, type:'rally'|'winner'|'out', player:0|1, eventType}
    pointHistory: [], // [{winner:0|1, reason, rally}] — últimos 20 pontos para RunStrip
    stateTimer: 0, isFirstBounce: true, serveBounced: false,
    serveLeft: true, lastPointReason: null,
    receiverTouched: false, lastServeFirst: true,
    vfxQueue: [], pendingFlash: null, pendingScreenFx: null, lastBouncePos: null,
    // ── Court data ──────────────────────────────────────────────────
    courtKey,
    courtMeta:    court.meta,
    courtVisual,
    courtPhysics,
    courtMods,    // winnerMod, ueRiskMod, rallyLengthMult, serveBonus, staminaDecayMult, etc.
    isSlam:       false, // injetado por UniverseManager/Headless quando é Grand Slam
    // ── Crowd Pressure — energia da arena ──────────────────────────
    // Calculado após isSlam + rivalryData serem injetados externamente.
    // Inicializado aqui como 0; Headless/UniverseManager atualiza antes do primeiro ponto.
    // Escala 0.0–1.0: 0 = ATP 250 R1, 1.0 = GS Final entre rivais históricos.
    crowdPressure: 0,
    // ───────────────────────────────────────────────────────────────
    log: [
      '⚡ Motor v7 · Stats + VFX + Sound',
      `🅰 ${nameA}`,
      `🅱 ${nameB}`,
      `🎾 ${court.meta.icon} ${court.meta.name} — ${court.meta.label}`,
    ],
    techLog: [
      `TENNIX · LOG TÉCNICO`,
      `${nameA} vs ${nameB}`,
      `Quadra: ${court.meta.name} (${court.meta.label})`,
      '',
    ],
    _ptBuf: [], _techPtNum: 0,
    bestOf,                              // 3 ou 5
    matchFormat,
    isSlamClash: !!matchMeta?.isSlamClash,
    superTiebreakTarget: 10,
    setsToWin: isSuperTiebreakOnly ? 1 : Math.ceil(bestOf / 2),    // 2 para BO3, 3 para BO5
    inTiebreak: isSuperTiebreakOnly,                   // true quando o game atual é um tiebreak
    tbScore: [0, 0],                     // pontuação do tiebreak [p0, p1]
    tbServer: 0,                         // quem serve no tiebreak
    tbPointsPlayed: 0,                   // total de pontos jogados no TB (para troca de saque)
  };
  gs._bounce = onBounce;
  initEnvironment(gs);
  initLiveMatchAudit(gs);
  gs.liveAuditSnap = buildLiveAuditSnapshot(gs);
  initCourtMarks(gs);
  // ── Match Heat Temperature ──
  initHeat(gs);
  // FASE 3 — Gerar match plans pré-partida para ambos os jogadores.
  // rivalSystem é opcional: pode ser passado diretamente por TournamentSystem/Headless.
  // surface derivada de courtKey: 'clay' para clay, 'grass' para grass, 'indoor' para indoor, 'hard' para resto.
  const _surface3 = normalizeSurfaceKey(court.meta?.surface ?? _courtKeyToSurface(courtKey)).toLowerCase();
  initMatchPlans(gs.players[0], gs.players[1], _surface3, rivalSystem);

  // FASE 2 — Inicializar confiança contextual e pre-calcular formModifiers para cada jogador.
  // surface uppercase para compatibilidade com CALENDAR (ex: 'CLAY', 'HARD').
  const _surfaceUpper = _surface3.toUpperCase();
  for (let i = 0; i < 2; i++) {
    const p   = gs.players[i];
    const opp = gs.players[1 - i];
    const talentApplied = applySurfaceTalentToAttrs(p.attrs ?? {}, p, _surfaceUpper);
    const surfaceIdentityFx = getSurfaceMatchEffects(p, _surfaceUpper);
    p.attrs = talentApplied.attrs;
    p.mods = computePlayerMods(p.attrs);
    p._surfaceTalentFx = talentApplied.effects;
    p._surfaceIdentityFx = surfaceIdentityFx;
    initContextConf(p, opp, _surfaceUpper, rivalSystem);
    // Cache dos modificadores de forma para uso em tryHit e serving
    p._formMods = getFormModifiers(p, _surfaceUpper);
    p._formMods = {
      ...(p._formMods ?? {}),
      qualityMod: (p._formMods?.qualityMod ?? 1.0) * (talentApplied.effects?.qualityMult ?? 1) * (talentApplied.effects?.buildPressureMult ?? 1) * surfaceIdentityFx.qualityMult,
      qualityFlat: (p._formMods?.qualityFlat ?? 0) + (talentApplied.effects?.qualityFlat ?? 0) + (talentApplied.effects?.buildPressureFlat ?? 0),
      errorMod: (p._formMods?.errorMod ?? 1.0) * surfaceIdentityFx.errorMult,
      serveMod: (p._formMods?.serveMod ?? 1.0) * (1 + surfaceIdentityFx.serveQuality),
    };

    // ATRIBUTO regularidade → matchDayVar
    // regularidade baixa = alta chance de dia ruim (-3% a -12%) ou dia incrível (+1% a +8%)
    // regularidade alta = variação mínima (máquina — sempre entrega o esperado)
    if (p.attrs?.regularidade !== undefined) {
      const dayAdj = matchDayVarV3(p.attrs.regularidade);
      if (dayAdj !== 0) {
        const curQm = p._formMods?.qualityMod ?? 1.0;
        const dampedDayAdj = dayAdj * 0.62;
        p._formMods = { ...(p._formMods ?? {}), qualityMod: curQm * (1 + dampedDayAdj) };
        p._matchDayAdj = dampedDayAdj; // guardado para debug/trace
      }
    }
  }
  // ── Trace: inicializar e começar primeiro ponto ──
  traceStartPoint(gs);
  return gs;
}

// ── Crowd Pressure ──────────────────────────────────────────────────
/**
 * Calcula o fator de pressão da arena para uma partida.
 * Deve ser chamado pelo Headless/UniverseManager após definir gs.isSlam
 * e antes do primeiro gameTick.
 *
 * @param {object} gs           — game state (com isSlam já definido)
 * @param {string} category     — 'GRAND_SLAM' | 'MASTERS_1000' | 'ATP_500' | 'ATP_250' | ...
 * @param {string} round        — 'F' | 'SF' | 'QF' | 'R16' | ...
 * @param {object|null} rivalry — rivalidade entre os dois jogadores (do RivalrySystem)
 * @returns {number} crowdPressure 0.0–1.0
 */
export function computeCrowdPressure(gs, category = 'ATP_250', round = 'R32', rivalry = null) {
  let pressure = 0;

  // Base por categoria do torneio
  const categoryBase = {
    GRAND_SLAM:   0.40,
    SLAM_CLASH:   0.32,
    FINALS:       0.35,
    MASTERS_1000: 0.25,
    ATP_500:      0.12,
    ATP_250:      0.05,
    ATP_100:      0.02,
  }[category] ?? 0.05;
  pressure += categoryBase;

  // Bônus por rodada
  const roundBonus = {
    F:   0.30,
    SF:  0.18,
    QF:  0.10,
    R16: 0.04,
    R32: 0.01,
  }[round] ?? 0;
  pressure += roundBonus;

  // Rivalidade
  if (rivalry) {
    const rScore = Math.min((rivalry.totalPrestige ?? 0) / 40, 0.20);
    pressure += rScore;
    // Tipo de rivalidade amplifica ainda mais
    if (rivalry.type === 'GRUDGE' || rivalry.type === 'FINALS_CURSE') pressure += 0.05;
    if (rivalry.type === 'THRONE_RIVALS') pressure += 0.04;
  }

  return Math.min(1.0, pressure);
}

// ── Scoring ────────────────────────────────────────────────────────
function assignPoint(gs, winnerIdx, reason) {
  const w = gs.players[winnerIdx], l = gs.players[1 - winnerIdx];
  gs.totalPoints++;
  gs.log.push(`◉ ${reason}`);

  // ── TIEBREAK MODE ──────────────────────────────────────────────────────────
  if (gs.inTiebreak) {
    gs.tbScore[winnerIdx]++;
    gs.tbPointsPlayed++;
    const tbW = gs.tbScore[winnerIdx];
    const tbL = gs.tbScore[1 - winnerIdx];
    const tbTarget = _getTiebreakTarget(gs);

    gs.log.push(`🔢 TB ${gs.tbScore[0]}–${gs.tbScore[1]}`);

    // Troca de saque: após 1º ponto, depois a cada 2 pontos
    if (gs.tbPointsPlayed === 1 || (gs.tbPointsPlayed > 1 && (gs.tbPointsPlayed - 1) % 2 === 0)) {
      gs.server   = 1 - gs.server;
      gs.receiver = 1 - gs.server;
      gs.players[gs.server].faults = 0;
    }

    // ── Changeover no tiebreak: a cada 6 pontos jogados (regra ATP) ──────────
    // Recuperação menor que um game normal — pausa é apenas para trocar de lado.
    if (gs.tbPointsPlayed % 6 === 0) {
      for (const p of gs.players)
        recoverPlayerStamina(p, (STAMINA.recoveryPerGame ?? 0.08) * 0.5);
    }

    // Vence o TB: ≥7 pontos com diferença ≥2
    if (tbW >= tbTarget && tbW - tbL >= _getTiebreakWinBy(gs)) {
      if (_isMatchTiebreakOnly(gs)) {
        w.setsHistory = [...(w.setsHistory || []), tbW];
        l.setsHistory = [...(l.setsHistory || []), tbL];
        w.sets = 1;
        l.sets = 0;
        w.stats.tiebreaksWon = (w.stats.tiebreaksWon ?? 0) + 1;
        updateTiebreakConf(w, true);
        updateTiebreakConf(l, false);
        gs.matchTiebreakScore = [...gs.tbScore];
        gs.inTiebreak = false; gs.tbScore = [0, 0]; gs.tbPointsPlayed = 0;
        gs.gameState = GameState.GAME_OVER;
        gs.log.push(`SLAM CLASH -> ${w.name} venceu ${tbW}-${tbL}`);
        gs.log.push(`PARTIDA: ${w.name} VENCEU!`);
        return;
      }
      // Set curto decidido no tiebreak em 4-4: 5-4 no histórico.
      w.setsHistory = [...(w.setsHistory || []), MATCH_RULES.tiebreakSetWinnerGames];
      l.setsHistory = [...(l.setsHistory || []), MATCH_RULES.tiebreakAt];
      w.sets++; w.games = 0; l.games = 0;
      // ── Contabiliza tiebreak ganho para sombra de trait ──────────────────
      w.stats.tiebreaksWon = (w.stats.tiebreaksWon ?? 0) + 1;
      // FASE 3: atualiza confiança contextual de tiebreak intra-partida
      updateTiebreakConf(w, true);
      updateTiebreakConf(l, false);
      gs.inTiebreak = false; gs.tbScore = [0, 0]; gs.tbPointsPlayed = 0;
      gs.log.push(`🏆 TIEBREAK → ${w.name} venceu o set (${gs.players[0].sets}–${gs.players[1].sets})`);

      // ── Recuperação de set após tiebreak ─────────────────────────────────
      for (const p of gs.players)
        recoverPlayerStamina(p, STAMINA.recoveryPerSet);

      if (w.sets >= gs.setsToWin) {
        gs.gameState = GameState.GAME_OVER;
        gs.log.push(`🎾 PARTIDA: ${w.name} VENCEU!`);
        return;
      }
      // Regra ITF: quem recebeu o 1º ponto do TB serve no próximo set
      gs.server   = 1 - gs.tbServer;
      gs.receiver = gs.tbServer;
      gs.players[gs.server].faults = 0;
    }
    return;
  }

  // ── PONTUAÇÃO NORMAL ───────────────────────────────────────────────────────
  if (w.score >= MATCH_RULES.pointsPerGame - 1) {
    // No-ad: em 40-40, o próximo ponto fecha o game.
    _gameWon(gs, winnerIdx);
  } else {
    w.score++;
  }
}

// ── Game ganho ────────────────────────────────────────────────────────────────
function _gameWon(gs, winnerIdx) {
  const w = gs.players[winnerIdx], l = gs.players[1 - winnerIdx];
  w.games++; w.score = 0; l.score = 0;
  gs.log.push(`🎮 Game → ${w.name} (${gs.players[0].games}–${gs.players[1].games})`);

  // ── Reset signature cooldown — máx 1 por GAME, não por partida inteira ──
  for (const p of gs.players) {
    if (p?.ctx) p.ctx._signatureMoveGameKey = null;
  }

  // ── Recuperação de stamina no game change (changeover ~90s) ──────────────
  // RECUPERACAO_FISICA (betweenSets) multiplica a recuperação individual.
  for (const p of gs.players) {
    const rFx = getUnifiedPlayerTraitFx(p, gs);
    // staminaMult de contexto 'betweenSets' — aplicado apenas se trait tem esse contexto
    // Aqui aplicamos diretamente via getTraitEffects com contexto betweenSets
    const betweenFx = getTraitEffects(p, { type: 'betweenSets' });
    const recMult = betweenFx.staminaMult > 0 ? betweenFx.staminaMult : 1.0;
    const recAmt = (STAMINA.recoveryPerGame ?? 0.08) * recMult;
    recoverPlayerStamina(p, recAmt);

    const mental = (p.attrs?.mentalidade ?? 70) / 100;
    const recup = (p.attrs?.recuperacao ?? 70) / 100;
    const adapt = (p.attrs?.adaptacao ?? 70) / 100;
    const pull = clamp(0.08 + recup * 0.10 + adapt * 0.06, 0.10, 0.28);
    const lift = Math.max(0, mental - 0.72) * 0.035;
    const current = clamp(p.ctx?.momentum ?? 0.5, 0, 1);
    const ewma = clamp(p.ctx?._momentumEWMA ?? current, 0, 1);
    p.ctx.momentum = clamp(current + (0.5 - current) * pull + lift, 0.12, 0.90);
    p.ctx._momentumEWMA = clamp(ewma + (p.ctx.momentum - ewma) * 0.20, 0.12, 0.90);
    p.ctx._moodFactor = clamp((p.ctx._moodFactor ?? 0.5) + (0.5 - (p.ctx._moodFactor ?? 0.5)) * pull, 0.12, 0.90);
  }

  // ── Degradação progressiva de lesão em campo ────────────────────────────
  for (const p of gs.players) {
    if (p._inMatchInjury) applyProgressiveDegradation(p);
  }

  // ── Hold / Break tracking ─────────────────────────────────────────────────
  const currentServer = gs.server;
  gs.players[currentServer].stats.gamesServed++;
  gs.players[1 - currentServer].stats.gamesReturned++;
  if (winnerIdx === currentServer) {
    gs.players[currentServer].stats.gamesHeld++;       // hold confirmado
  } else {
    gs.players[1 - currentServer].stats.gamesConverted++;  // break convertido
    const broken = gs.players[currentServer];
    const recup = broken?.attrs?.recuperacao ?? broken?.attrs?.mentalidade ?? 70;
    const recupPct = recup / 100;
    const breakSpiral = (1 - recupPct) * 0.18;
    const breakRebound = Math.max(0, recupPct - 0.50) * 0.22;
    const breakDelta = breakRebound - breakSpiral;
    if (breakDelta !== 0) {
      broken._formMods = broken._formMods ?? {};
      broken._formMods.qualityMod = clamp((broken._formMods.qualityMod ?? 1.0) + breakDelta, 0.70, 1.35);
    }
  }

  for (const p of gs.players) {
    if (p._adaptacaoBoost != null) {
      const adaptacaoFactor = p.mods?.adaptacaoFactor ?? ((p.attrs?.adaptacao ?? 60) / 100);
      p._adaptacaoBoost *= (0.85 + adaptacaoFactor * 0.12);
      if (Math.abs(p._adaptacaoBoost) < 0.005) p._adaptacaoBoost = 0;
    }
  }

  const wG = w.games, lG = l.games;

  // Set curto: 4 games com diferença de 2.
  if (wG >= MATCH_RULES.gamesPerSet && wG - lG >= 2) {
    _setWon(gs, winnerIdx);
    return;
  }

  // Em 3-3 ainda há dois games. Só 4-4 leva ao tiebreak curto.
  if (wG === MATCH_RULES.tiebreakAt && lG === MATCH_RULES.tiebreakAt) {
    gs.inTiebreak = true;
    gs.tbScore = [0, 0];
    gs.tbPointsPlayed = 0;
    gs.tbServer = gs.server; // registra quem serve o 1º ponto do TB
    gs.log.push(`⚡ TIEBREAK CURTO! | Games ${MATCH_RULES.tiebreakAt}–${MATCH_RULES.tiebreakAt}`);
    gs.players[gs.server].faults = 0;
    return;
  }

  // Set ainda em curso — troca saque
  gs.server   = 1 - gs.server;
  gs.receiver = 1 - gs.server;
  gs.players[gs.server].faults = 0;
}

// ── Set ganho ─────────────────────────────────────────────────────────────────
function _setWon(gs, winnerIdx) {
  const w = gs.players[winnerIdx], l = gs.players[1 - winnerIdx];
  w.setsHistory = [...(w.setsHistory || []), w.games];
  l.setsHistory = [...(l.setsHistory || []), l.games];
  w.sets++; w.games = 0; l.games = 0;
  gs.log.push(`🏆 SET → ${w.name} (${gs.players[0].sets}–${gs.players[1].sets})`);

  // ── FASE 1.2 — Ajuste tático entre sets ──────────────────────────────────
  // Cada jogador analisa o que funcionou/não funcionou e prepara um plano de curto prazo.
  // Executado antes da recuperação de stamina para ter _matchRead ainda fresco.
  for (let i = 0; i < gs.players.length; i++) {
    readMatchContext(gs.players[i], gs.players[1 - i]);
    applySetAdjustment(gs.players[i], gs.players[1 - i]);
  }

  // ── v4: recoveryBoost — o set perdedor tenta se recuperar ────────────────
  // recuperacao alta = mais chance de ressurgir (Djokovic do 0-2)
  // recuperacao baixa = tende a espiral mental
  const loserIdx = 1 - winnerIdx;
  const lostPlayer = gs.players[loserIdx];
  if (lostPlayer.attrs) {
    const recup = lostPlayer.attrs.recuperacao ?? lostPlayer.attrs.mentalidade ?? 70;
    const boost = recoveryBoost(recup);
    if (boost !== 0) {
      // Aplica o delta de recuperação como modificador temporário de _formMods
      lostPlayer._formMods = lostPlayer._formMods ?? {};
      lostPlayer._formMods.qualityMod = ((lostPlayer._formMods.qualityMod ?? 1.0) + boost);
      if (boost > 0) {
        gs.log.push(`💪 ${lostPlayer.name} se recobrou (recuperação ${recup})`);
      }
    }
  }

  // ── v4: adaptacao — o set perdedor pode mudar o game plan ────────────────
  // adaptacao alta = a instrução do técnico no changeover tem mais peso
  // (o próprio applySetAdjustment já usa _matchRead; aqui só sinalizamos)
  if (lostPlayer.attrs) {
    const adaptacao = lostPlayer.attrs.adaptacao ?? 65;
    const rawBoost = (adaptacao - 50) / 100 * 0.55;
    lostPlayer._adaptacaoBoost = adaptacao >= 50 ? rawBoost : rawBoost * 0.40;
  }

  recoverMomentumBetweenSets(gs, winnerIdx);

  // ── Recuperação adicional entre sets (~2 min) ─────────────────────────────
  // RECUPERACAO_FISICA (betweenSets) aplicado também aqui.
  for (const p of gs.players) {
    const betweenFx = getTraitEffects(p, { type: 'betweenSets' });
    const recMult = betweenFx.staminaMult > 0 ? betweenFx.staminaMult : 1.0;
    const recAmt = (STAMINA.recoveryPerSet ?? 0.20) * recMult;
    recoverPlayerStamina(p, recAmt);
  }

  if (w.sets >= (gs.setsToWin ?? 2)) {
    gs.gameState = GameState.GAME_OVER;
    gs.log.push(`🎾 PARTIDA: ${w.name} VENCEU!`);
    return;
  }
  gs.server   = 1 - gs.server;
  gs.receiver = 1 - gs.server;
  gs.players[gs.server].faults = 0;
}

export function resolvePoint(gs, winnerIdx, reason, isWinner = false, outcomeType = null) {
  if (gs.gameState === GameState.POINT_END || gs.gameState === GameState.GAME_OVER) return;
  const w = gs.players[winnerIdx], l = gs.players[1 - winnerIdx];
  const pointState = _getPointPressureState(gs);
  const wasDeuce = !gs.inTiebreak &&
    ((gs.players[0].pointsName === '40' && gs.players[1].pointsName === '40') ||
     gs.players[0].pointsName === 'Ad' || gs.players[1].pointsName === 'Ad');
  var isAce = isWinner && winnerIdx === gs.server
           && !gs.receiverTouched && gs.serveBounced && gs.rally <= 1;
  var displayReason = isAce ? `ACE ${w.name}` : reason;
  const resolvedOutcome = outcomeType
    ?? (isAce ? 'ACE'
      : isWinner ? 'WINNER'
        : displayReason?.includes('DUPLA FALTA') ? 'DOUBLE_FAULT'
          : displayReason?.includes('ERRO FORÇADO') ? 'FORCED_ERROR'
            : displayReason?.includes('ERRO NÃO FORÇADO') ? 'UNFORCED_ERROR'
              : 'OTHER');
  // Tag the most recent bounce(s) with outcome type for the bounce map
  if (gs.bounceLog && gs.bounceLog.length > 0) {
    const last = gs.bounceLog[gs.bounceLog.length - 1];
    if (isWinner) {
      last.type = 'winner';
    } else if (displayReason && (displayReason.includes('FORA') || displayReason.includes('fuga') || displayReason.includes('DUPLA'))) {
      last.type = 'out';
    }
  }
  const prevGames = w.games, prevSets = w.sets;

  gs.gameState = GameState.POINT_END;
  gs.pointWinnerIdx = winnerIdx;
  gs.ball.inFlight = false;
  gs.lastPointReason = displayReason;

  // ── Point history: últimos 20 pontos para RunStrip no HUD ────────────────
  if (!gs.pointHistory) gs.pointHistory = [];
  gs.pointHistory.push({ winner: winnerIdx, reason: displayReason, rally: gs.rally ?? 0, outcomeType: resolvedOutcome, eventType: 'POINT_END' });
  if (gs.pointHistory.length > 20) gs.pointHistory.shift();
  gs.pointOutcomeLog ??= [];
  gs.pointOutcomeCount = (gs.pointOutcomeCount ?? 0) + 1;
  const pointOutcomeEntry = {
    pointNum: gs?._currentPointId ?? null,
    winner: winnerIdx,
    loser: 1 - winnerIdx,
    server: gs.server,
    receiver: gs.receiver,
    outcomeType: resolvedOutcome,
    reason: displayReason,
    rally: gs.rally ?? 0,
    lastShot: gs._lastShotEvent ? { ...gs._lastShotEvent } : null,
  };
  gs.pointOutcomeLog.push(pointOutcomeEntry);
  if (gs.pointOutcomeLog.length > 240) gs.pointOutcomeLog.splice(0, gs.pointOutcomeLog.length - 240);
  for (const player of gs.players) {
    player.stats.pointOutcomeLog ??= [];
    player.stats.pointOutcomeCount = (player.stats.pointOutcomeCount ?? 0) + 1;
    player.stats.pointOutcomeLog.push({
      ...pointOutcomeEntry,
      perspective: player.id === winnerIdx ? 'WON' : 'LOST',
    });
    if (player.stats.pointOutcomeLog.length > 240) {
      player.stats.pointOutcomeLog.splice(0, player.stats.pointOutcomeLog.length - 240);
    }
  }
  w.stats.pointsWonByOutcome ??= {};
  l.stats.pointsLostByOutcome ??= {};
  w.stats.pointsWonByOutcome[resolvedOutcome] = (w.stats.pointsWonByOutcome[resolvedOutcome] ?? 0) + 1;
  l.stats.pointsLostByOutcome[resolvedOutcome] = (l.stats.pointsLostByOutcome[resolvedOutcome] ?? 0) + 1;
  if (w.ctx) {
    w.ctx.consecutiveUE = 0;
    w.ctx.errorDirStreak = 0;
    w.ctx.lastErrorDir = 0;
  }

  // Rally length stat
  if (gs.rally > 0) {
    w.stats.rallyLengths.push(gs.rally);
    l.stats.rallyLengths.push(gs.rally);
  }

  // ── Pressão registrada no ponto real, antes de o placar mudar ───────────
  // A nota individual usa estes eventos; não deduzimos "clutch" de um placar
  // final depois que a informação já se perdeu.
  for (let pi = 0; pi < 2; pi++) {
    const contender = gs.players[pi];
    const state = pointState[pi];
    if (state?.isSetPoint) {
      contender.stats.setPointsOpportunities = (contender.stats.setPointsOpportunities ?? 0) + 1;
      if (winnerIdx === pi) contender.stats.setPointsConverted = (contender.stats.setPointsConverted ?? 0) + 1;
      else {
        contender.stats.setPointsFaced = (contender.stats.setPointsFaced ?? 0) + 1;
        w.stats.setPointsSaved = (w.stats.setPointsSaved ?? 0) + 1;
      }
    }
    if (state?.isMatchPoint) {
      contender.stats.matchPointsOpportunities = (contender.stats.matchPointsOpportunities ?? 0) + 1;
      if (winnerIdx === pi) contender.stats.matchPointsConverted = (contender.stats.matchPointsConverted ?? 0) + 1;
      else {
        contender.stats.matchPointsFaced = (contender.stats.matchPointsFaced ?? 0) + 1;
        w.stats.matchPointsSaved = (w.stats.matchPointsSaved ?? 0) + 1;
      }
    }
  }
  if (gs.inTiebreak) {
    w.stats.tiebreakPointsPlayed = (w.stats.tiebreakPointsPlayed ?? 0) + 1;
    l.stats.tiebreakPointsPlayed = (l.stats.tiebreakPointsPlayed ?? 0) + 1;
    w.stats.tiebreakPointsWon = (w.stats.tiebreakPointsWon ?? 0) + 1;
  }

  // Detect ACE
  if (isAce) { w.stats.aces++; gs.log.push(`⚡ ACE! ${w.name}`); }
  displayReason = isAce ? `ACE ${w.name}` : reason;
  if (!isAce && isWinner) w.stats.winners++;
  if (displayReason.includes('DUPLA FALTA')) l.stats.doubleFaults++;
  if (w.atNet) w.stats.netPointsWon++;
  if (gs._lastShotEvent?.playerId === winnerIdx && gs._lastShotEvent?.family) {
    w.stats.pointWinsByType ??= {};
    const shotType = gs._lastShotEvent.type ?? gs._lastShotEvent.family;
    w.stats.pointWinsByType[shotType] = (w.stats.pointWinsByType[shotType] ?? 0) + 1;
  }

  // ── Individual Rating: Conversion & Steal tracking ───────────────────────
  // Baseado no último estado tático de cada jogador no ponto
  const wState = w._tacticalState ?? 'NEUTRAL';
  const lState = l._tacticalState ?? 'NEUTRAL';
  if (wState === 'ATTACK') { w.stats.attackPointsPlayed++; w.stats.attackPointsWon++; }
  if (lState === 'ATTACK') { l.stats.attackPointsPlayed++; } // estava atacando mas perdeu
  if (wState === 'DEFEND') { w.stats.defensePointsPlayed++; w.stats.defensePointsWon++; } // steal!
  if (lState === 'DEFEND') { l.stats.defensePointsPlayed++; }

  // ── Match Heat Temperature — contexto pre-resolução ──────────────────────
  {
    const loserHadMP2 = pointState[1 - winnerIdx].isMatchPoint;
    const receiverHadBP = pointState[gs.receiver].isBreakPoint;
    const wasDeuce = !gs.inTiebreak &&
      gs.players[0].score >= 3 && gs.players[1].score >= 3 &&
      gs.players[0].score === gs.players[1].score;
    updateHeat(gs, winnerIdx, isWinner, isAce, {
      isDoubleFault:      displayReason.includes('DUPLA FALTA'),
      isForcedError:      displayReason.includes('[FORÇADO]'),
      isBreakPoint:       receiverHadBP,
      isSetPoint:         pointState[0].isSetPoint || pointState[1].isSetPoint,
      isMatchPoint:       pointState[0].isMatchPoint || pointState[1].isMatchPoint,
      wasMatchPointSaved: loserHadMP2,
      wasSetPointSaved:   pointState[1 - winnerIdx].isSetPoint,
      wasBreakPointSaved: receiverHadBP && winnerIdx === gs.server,
      wasDeuce:           wasDeuce,
      isLateSet:          Math.max(gs.players[0].games, gs.players[1].games) >= 4,
    });
  }

  // ── Serve / Return point tracking ─────────────────────────────────────────
  const srvP = gs.players[gs.server];
  const rcvP = gs.players[gs.receiver];
  const serverWon = winnerIdx === gs.server;
  if (serverWon) {
    srvP.stats.pointsWonServing++;
    rcvP.stats.pointsLostReturning++;
  } else {
    srvP.stats.pointsLostServing++;
    rcvP.stats.pointsWonReturning++;
  }
  // Por tipo de saque (1º ou 2º estava em jogo)
  const pd = gs._pendingServeData;
  if (pd && gs.serveBounced) {  // saque entrou — contar por tipo
    if (pd.isFirst) {
      if (serverWon) srvP.stats.serve1WonPoints++; else srvP.stats.serve1LostPoints++;
    } else {
      if (serverWon) srvP.stats.serve2WonPoints++; else srvP.stats.serve2LostPoints++;
    }
    // Log para gráficos (limitar a 300 pontos)
    if (srvP.stats.serveLog.length < 300) {
      srvP.stats.serveLog.push({
        kmh:      pd.kmh,
        physType: pd.physType,
        dir:      pd.dir,
        isFirst:  pd.isFirst,
        won:      serverWon,
        isAce,
        pointNum: pd.pointNum,
        pressureHint: pd.pressureHint ?? null,
        paceThreat: pd.paceThreat ?? null,
        spinThreat: pd.spinThreat ?? null,
        placementThreat: pd.placementThreat ?? null,
        delivery: pd.delivery ?? null,
        exchangeVersion: pd.exchangeVersion ?? null,
      });
    }
    // NOTA: NÃO zerar aqui — traceEndPoint (chamado abaixo) ainda precisa de _pendingServeData
    // para registrar kmh/physType/dir no trace do ponto. Será zerado após o trace.
  }

  // VFX + sound
  if      (isAce)                          { pushVFX(gs, 'ACE', 'ACE!');           playSound('ACE'); announceScore(gs, winnerIdx, 'ACE');
    gs.pendingScreenFx = { color:'rgba(255,215,0,0.22)', glow:'#FFD700', shake:true, dur:700 }; }
  else if (isWinner)                       { pushVFX(gs, 'WINNER', 'WINNER!');      playSound('WINNER');
    gs.pendingScreenFx = { color:'rgba(0,255,136,0.16)', glow:'#00FF88', shake:false, dur:500 }; }
  else if (displayReason.includes('[REDE]'))      { pushVFX(gs, 'NET', 'NET');             playSound('NET'); }
  else if (displayReason.includes('[FORA]'))      { pushVFX(gs, 'OUT', 'OUT');             playSound('OUT'); }
  else if (displayReason.includes('DUPLA FALTA')){ pushVFX(gs, 'DOUBLE_FAULT', 'DOUBLE FAULT'); playSound('DOUBLE_FAULT'); announceScore(gs, winnerIdx, 'DOUBLE_FAULT');
    gs.pendingScreenFx = { color:'rgba(255,68,68,0.18)', glow:'#FF4444', shake:true, dur:500 }; }

  if (isWinner) w.winnerCount++;
  // Importância do ponto para cada jogador ANTES de assignPoint (placar ainda atual).
  const _wScoreCtx = _computeScoreImportance(w, gs);
  const _lScoreCtx = _computeScoreImportance(l, gs);
  const _receiverHadBP = pointState[gs.receiver].isBreakPoint;
  if (_receiverHadBP) {
    const receiverStats = gs.players[gs.receiver].stats;
    const serverStats = gs.players[gs.server].stats;
    receiverStats.breakPointsOpportunities = (receiverStats.breakPointsOpportunities ?? 0) + 1;
    serverStats.breakPointsFaced = (serverStats.breakPointsFaced ?? 0) + 1;
    if (winnerIdx === gs.receiver) {
      receiverStats.breakPointsConverted = (receiverStats.breakPointsConverted ?? 0) + 1;
    } else {
      serverStats.breakPointsSaved = (serverStats.breakPointsSaved ?? 0) + 1;
    }
  }
  const _winnerState = pointState[winnerIdx];
  const _loserState = pointState[1 - winnerIdx];
  updateMomentum(gs, winnerIdx, {
    wImportance: _wScoreCtx.importance,
    lImportance: _lScoreCtx.importance,
    breakConverted: _receiverHadBP && winnerIdx === gs.receiver,
    breakSaved: _receiverHadBP && winnerIdx === gs.server,
    setPointConverted: !!_winnerState?.isSetPoint,
    setPointSaved: !!_loserState?.isSetPoint,
    matchPointConverted: !!_winnerState?.isMatchPoint,
    matchPointSaved: !!_loserState?.isMatchPoint,
    wasDeuce,
    rally: gs.rally ?? 0,
  });

  // ── Trace: encerrar ponto ──
  traceEndPoint(gs, winnerIdx, displayReason, isWinner);
  gs._pendingServeData = null; // limpar APÓS o trace ter lido os dados do saque
  // ── Flush tech log for this point ──
  techPt(gs);
  techEnd(gs, winnerIdx, displayReason);
  auditRegisterPointEnd(gs, winnerIdx, displayReason, isWinner);
  gs.liveAuditSnap = buildLiveAuditSnapshot(gs);

  assignPoint(gs, winnerIdx, displayReason);

  if (w.games > prevGames) {
    pushVFX(gs, 'GAME', 'GAME!'); playSound('GAME');
    gs.pendingScreenFx = { color:'rgba(0,212,255,0.20)', glow:'#00D4FF', shake:false, dur:800 };
    gs.pendingFlash = { playerIdx: winnerIdx, type: 'GAME' };
    if (gs.gameState !== GameState.GAME_OVER) {
      setTimeout(() => announceScore(gs, winnerIdx, 'GAME'), 900);
    }
  }
  if (w.sets > prevSets) {
    pushVFX(gs, 'SET', `SET ${w.sets}!`); playSound('SET');
    gs.pendingScreenFx = { color:'rgba(255,215,0,0.30)', glow:'#FFD700', shake:true, dur:1200 };
    gs.pendingFlash = { playerIdx: winnerIdx, type: 'SET' };
    if (gs.gameState === GameState.GAME_OVER) {
      setTimeout(() => announceScore(gs, winnerIdx, 'MATCH'), 1200);
    } else {
      setTimeout(() => announceScore(gs, winnerIdx, 'SET'), 1000);
    }
  }
  // Announce score after point (delay allows game/set fanfare to finish first)
  if (w.games === prevGames && w.sets === prevSets && gs.gameState !== GameState.GAME_OVER) {
    setTimeout(() => announceScore(gs, winnerIdx, 'POINT'), 600);
  }

  // ── Verificar lesão em campo (apenas se a partida não acabou) ─────────────
  if (gs.gameState !== GameState.GAME_OVER) {
    checkInMatchInjury(gs);
  }

  scheduleNextPoint(gs);
}

// ── Verifica lesão em campo após o ponto ─────────────────────────────────────
function checkInMatchInjury(gs) {
  if (gs.gameState === GameState.GAME_OVER) return;
  if (gs._pendingMTO) return; // já tem MTO pendente

  for (let pi = 0; pi < 2; pi++) {
    const p = gs.players[pi];
    const result = rollInMatchInjury(p, gs);
    if (!result) continue;

    gs._pendingMTO = {
      playerIdx: pi,
      type: result.type,
      severity: result.severity,
      isTemporary: result.isTemporary ?? false,
    };

    // Sinaliza para que o narrateMatch saiba que houve MTO
    if (!gs.inMatchInjuryEvents) gs.inMatchInjuryEvents = [];
    gs.inMatchInjuryEvents.push(
      buildInMatchInjuryEvent(p, gs._pendingMTO, gs, 'mto')
    );

    gs.log.push(`🚑 [MTO] ${p.name} — ${result.type} (${result.severity})`);
    break; // só um MTO por ponto
  }
}

function scheduleNextPoint(gs) {
  setTimeout(() => {
    if (gs.gameState === GameState.GAME_OVER) return;

    // ── MTO pendente: vai para MEDICAL_TIMEOUT em vez de PRE_SERVE ──────────
    if (gs._pendingMTO) {
      const mtoData = gs._pendingMTO;
      gs._pendingMTO = null;
      const sevDef = IN_MATCH_SEVERITY[mtoData.severity] ?? IN_MATCH_SEVERITY.MINOR;
      gs.mto = {
        playerIdx:   mtoData.playerIdx,
        injuryType:  mtoData.type,
        severity:    mtoData.severity,
        isTemporary: mtoData.isTemporary ?? false,
        durationSecs: sevDef.durationSecs,
        decided:     false,
        canContinue: null,
      };
      gs.gameState  = GameState.MEDICAL_TIMEOUT;
      gs.stateTimer = 0;
      return;
    }

    gs.rally = 0; gs.serveLeft = !gs.serveLeft;
    gs._matchPointCounter = (gs._matchPointCounter ?? gs.totalPoints ?? 0) + 1;
    gs._currentPointId = gs._matchPointCounter;
    gs._lastShotEvent = null;
    gs.players[gs.server].faults = 0;
    gs.ball = createBall();
    gs.lastBouncePos = null;  // reset para não contaminar o próximo ponto
    gs.gameState = GameState.PRE_SERVE; gs.stateTimer = 0;
    gs.isFirstBounce = true; gs.receiverTouched = false;
    for (const p of gs.players) {
      p.atNet = false;
      // Resetar basePos para a baseline correta antes de posicionar
      // Evita que jogadores que estavam na rede reapareçam no meio da quadra
      const _bAggr = p.attrs?.visaoTatica ?? p.attrs?.agressividade ?? 60;
      const _bNet  = ((p.attrs?.volley ?? p.attrs?.jogoDeRede ?? 60) +
                      (p.attrs?.smash  ?? p.attrs?.jogoDeRede ?? 60)) / 2;
      const _bOff  = 0.20 + (_bAggr / 100) * 0.50 + (_bNet / 100) * 0.20;
      p.basePos.y = p.side * (COURT.halfL - _bOff);
      p.pos = { ...p.basePos }; p.vel = v2(0, 0);
      recoverPlayerStamina(p, STAMINA.recoveryPerPoint);
      p._nearMissTimer = 0;  // reset near-miss window between points
      if (p.ctx) p.ctx._sigUsedThisPoint = false;
      resetMovementRuntime(p);
      resetCtx(p);
      resetShotMemory(p);
    }
    // Marca qual jogador é o sacador neste ponto — usado para distinguir isReturn do sacador
    gs.players[gs.server].ctx._isServer = true;
    gs.players[gs.receiver].ctx._isServer = false;
    // ── Trace: iniciar novo ponto ──
    traceStartPoint(gs);
  }, TIMING.pointPauseMs);
}

// ── Bounce callback (assigned to gs._bounce) ─────────────────────
export function onBounce(gs) {
  const ball = gs.ball;
  gs.totalBounces = (gs.totalBounces || 0) + 1;
  const bounceClass = 'BALL_BOUNCE';
  if (ball.bounceCount === 1 && ball._lastShotMeta?.sliceProfile) {
    const hSpdAfterBounce = Math.hypot(ball.vel.x ?? 0, ball.vel.y ?? 0);
    ball._lastShotMeta.sliceBounce = {
      profile: ball._lastShotMeta.sliceProfile,
      landingDepthFromBaseline: +(COURT.halfL - Math.abs(ball.pos.y)).toFixed(2),
      bounceHeightVelocity: +(ball.vel.z ?? 0).toFixed(2),
      carrySpeedAfterBounce: +hSpdAfterBounce.toFixed(2),
      deadBall: !!ball._deadBall,
    };
  }
  const shotMetaForBounce = ball._lastShotMeta ? { ...ball._lastShotMeta } : null;

  // Track which side of the court the ball bounced on
  ball.lastBounceSide = Math.sign(ball.pos.y);
  // Salva posição exata do quique para resolveOutOfBounds poder verificar se foi dentro
  gs.lastBouncePos = { x: ball.pos.x, y: ball.pos.y };

  // ── Particles & court marks ─────────────────────────────────
  addCourtMark(gs, ball, bounceClass);

  playSound('BOUNCE');

  // ── BounceLog: acumula todos os quiques para mapa pós-partida ──────────────
  if (!gs.bounceLog) gs.bounceLog = [];
  gs.bounceLog.push({
    x: ball.pos.x,
    y: ball.pos.y,
    type: 'rally',   // será atualizado para 'winner' ou 'out' em resolvePoint/resolveOutOfBounds
    player: ball.lastHitBy ?? -1,
    eventType: null,
    rally: gs.rally,
    idx: gs.bounceLog.length,
    z: ball.pos.z ?? null,
    targetX: ball._lastTargetX ?? null,
    targetY: ball._lastTargetY ?? null,
    contactX: ball._lastContactX ?? null,
    contactY: ball._lastContactY ?? null,
    launchMeta: shotMetaForBounce,
  });
  auditRegisterBounce(gs, ball, gs.bounceLog[gs.bounceLog.length - 1]);
  gs.liveAuditSnap = buildLiveAuditSnapshot(gs);
  // ── Trace: registrar quique real ──
  traceLogOutcome(gs, ball.pos.x, ball.pos.y, null);

  // ── Tech log: quique ──
  // Log delta do saque no 1º quique para validação do solver
  if (gs.isFirstBounce && ball.lastHitBy === gs.server && ball._serveTargetY !== undefined) {
    const deltaY = (ball.pos.y - ball._serveTargetY).toFixed(2);
    pushTech(gs,
      `[QB${_pad(ball.bounceCount,2)}] QUIQUE │ pos(x=${_f2(ball.pos.x)}, y=${_f2(ball.pos.y)}) │ vel_saída(x=${_f2(ball.vel.x)}, y=${_f2(ball.vel.y)}, z=${_f2(ball.vel.z)}) │ ΔY=${deltaY}m`
    );
  } else {
    const _solverTag = (ball._solverErr ?? 0) > 2.0 ? ` ⚠SOLVER_ERR:${ball._solverErr?.toFixed(2)}m` : '';
    pushTech(gs,
      `[QB${_pad(ball.bounceCount,2)}] QUIQUE │ pos(x=${_f2(ball.pos.x)}, y=${_f2(ball.pos.y)}) │ vel_saída(x=${_f2(ball.vel.x)}, y=${_f2(ball.vel.y)}, z=${_f2(ball.vel.z)})${_solverTag}`
    );
  }

  if (gs.isFirstBounce && ball.lastHitBy === gs.server) {
    gs.isFirstBounce = false;
    const server = gs.players[gs.server];
    if (ball._serveNetTouched && checkServiceBox(ball, server.side, gs.serveLeft)) {
      gs.log.push(`🔁 LET ${server.name} — saque repetido`);
      gs.gameState = GameState.PRE_SERVE;
      gs.stateTimer = 0;
      gs.ball = createBall();
      gs.lastBouncePos = null;
      gs.isFirstBounce = true;
      gs.serveBounced = false;
      gs.receiverTouched = false;
      for (const p of gs.players) {
        p.vel = v2(0, 0);
        resetMovementRuntime(p);
      }
      return;
    }
    if (!checkServiceBox(ball, server.side, gs.serveLeft)) {
      server.faults++;
      if (server.faults >= 2) {
        resolvePoint(gs, gs.receiver, `DUPLA FALTA ${server.name}`);
        server.errorCount++;
      } else {
        gs.log.push(`⚠ FALTA 1 ${server.name}`);
        gs.gameState = GameState.PRE_SERVE; gs.stateTimer = 0; ball.inFlight = false;
        for (const p of gs.players) {
          p.vel = v2(0, 0);
          resetMovementRuntime(p);
        }
      }
      return;
    }
    // Serve landed in box — record stats
    gs.serveBounced = true;
    // Usa velocidade de saída da raquete gravada em serving (_serveExitKmh)
    // Medição equivalente ao radar ATP (saída do contato, não pós-bounce)
    const kmh = ball._serveExitKmh ?? Math.round(mag3(ball.vel) * 3.6);
    const st  = server.stats;
    if (gs.lastServeFirst) { st.serve1In++; st.serve1AvgKmh = movAvg(st.serve1AvgKmh, st.serve1In - 1, kmh); }
    else                   { st.serve2In++; st.serve2AvgKmh = movAvg(st.serve2AvgKmh, st.serve2In - 1, kmh); }
    return;
  }

  // ── Bug fix: bola quicando no campo do próprio batedor → ponto adversário ──
  // Ex: batedor é player.side = +1 (metade positiva), bola quicou em y > 0 = próprio campo → erro
  if (!gs.isFirstBounce && ball.lastHitBy >= 0) {
    const h = ball.lastHitBy;
    const hitterSide = gs.players[h].side; // +1 ou -1
    if (ball.lastBounceSide === hitterSide) {
      // Quicou no próprio campo do batedor → ponto para o adversário
      const hitter = gs.players[h];
      const tag = recordShotError(gs, hitter);
      resolvePoint(gs, 1 - h, `[CAMPO PRÓPRIO] ${gs.players[h].name}`, false, tag === 'FE' ? 'FORCED_ERROR' : 'UNFORCED_ERROR');
      return;
    }
  }

  if (!gs.isFirstBounce && ball.bounceCount >= 2 && ball.lastHitBy >= 0) {
    const h = ball.lastHitBy;
    if (Math.sign(ball.pos.y) !== Math.sign(gs.players[h].pos.y)) {
      const defender   = gs.players[1 - h];
      const dist       = Math.sqrt((defender.pos.x - ball.pos.x)**2 + (defender.pos.y - ball.pos.y)**2);
      const staminaFactor = STAMINA.speedMinFactor + (defender.stamina ?? 1) * (1 - STAMINA.speedMinFactor);
      const maxDefSpd  = defender.playerSpeed * staminaFactor;
      const postHitDelay = defender.ctx?._postHitPause ?? 0;  // recovery window from PATCH v1
      const ballSpd    = Math.sqrt(ball.vel.x**2 + ball.vel.y**2 + ball.vel.z**2);
      const timeToStop = ballSpd > 0.3 ? 0.25 : 0;
      const defReach   = (defender.reach + (maxDefSpd * timeToStop)) * getDefenseRecoveryReachMult(defender);
      const trulyUnreachable = dist > defReach * 3.8;

      // ── 2º quique fora da quadra = winner GARANTIDO ──────────────────────
      // Se o 2º quique aconteceu além da baseline ou da lateral do defensor,
      // a bola quicou 2x: uma dentro (QB1) e uma fora (QB2). Isso é winner
      // independente de onde o defensor está — ele não pode mais alcançar.
      const bounceOutsideCourt = Math.abs(ball.pos.y) > COURT.halfL + 0.05
                               || Math.abs(ball.pos.x) > COURT.singlesW / 2 + 0.05;

      // ETA real: inclui atraso de postHitPause (jogador ainda em recovery)
      const defETA = maxDefSpd > 0 ? (dist / maxDefSpd) + postHitDelay : 999;

      pushTech(gs,
        `[DBG-QB2] def:${defender.name} dist:${dist.toFixed(2)}m ETA:${defETA.toFixed(2)}s` +
        ` (postHitDelay:${postHitDelay.toFixed(3)}s stam:${staminaFactor.toFixed(2)})` +
        ` margin:${(defender._arrivalMargin ?? 0).toFixed(2)}s` +
        ` unreachable:${trulyUnreachable} bounceOut:${bounceOutsideCourt}` +
        ((ball._solverErr ?? 0) > 2.0 ? ` ⚠SOLVER_ERR:${ball._solverErr?.toFixed(2)}m` : '')
      );
      // ── Solver failure guard: trajetória fisicamente inválida não conta como winner ─
      // Se o launchBall solver falhou (bestErr > 2m), a bola tomou um caminho bogus
      // (Magnus não-monotónico). O 2º quique pode ter acontecido por acidente —
      // o ponto deve ser erro do batedor, não winner.
      if ((ball._solverErr ?? 0) > 2.0) {
        const tag = recordShotError(gs, gs.players[h]);
        resolvePoint(gs, 1 - h, `[ERRO_TRAJ] ${gs.players[h].name}`, false, tag === 'FE' ? 'FORCED_ERROR' : 'UNFORCED_ERROR');
        return;
      }
      resolveUnreturnedBall(gs, gs.players[h], defender, `[UNRETURNED] 2 QUIQUES ${defender.name}`, {
        dist,
        maxDefSpd,
        defReach,
      });
    }
  }
}

// ── Collision resolvers ───────────────────────────────────────────
function resolveNet(gs) {
  const ball = gs.ball;
  if (gs.isFirstBounce) {
    const server = gs.players[gs.server]; server.faults++;
    if (server.faults >= 2) { resolvePoint(gs, gs.receiver, `DUPLA FALTA (rede) ${server.name}`); server.errorCount++; }
    else { gs.log.push(`🔵 FALTA 1 (rede) ${server.name}`); gs.gameState = GameState.PRE_SERVE; gs.stateTimer = 0; ball.inFlight = false; }
  } else {
    const h = ball.lastHitBy;
    if (h >= 0) {
      const hitter = gs.players[h];
      const tag = recordShotError(gs, hitter);
      resolvePoint(gs, 1 - h, `[REDE] ${gs.players[h].name}`, false, tag === 'FE' ? 'FORCED_ERROR' : 'UNFORCED_ERROR');
    }
  }
}

function resolveOutOfBounds(gs) {
  const ball = gs.ball, h = ball.lastHitBy;
  // Tag last bounce as 'out' if ball goes out without bouncing in
  if (gs.bounceLog && gs.bounceLog.length > 0 && ball.bounceCount === 0) {
    gs.bounceLog[gs.bounceLog.length - 1].type = 'out';
  }
  if (gs.isFirstBounce && h === gs.server) {
    const server = gs.players[gs.server]; server.faults++;
    if (server.faults >= 2) { resolvePoint(gs, gs.receiver, `DUPLA FALTA (fora) ${server.name}`); server.errorCount++; }
    else { gs.log.push(`📍 FALTA 1 (fora) ${server.name}`); gs.gameState = GameState.PRE_SERVE; gs.stateTimer = 0; ball.inFlight = false; }
    return;
  }
  if (h < 0) return;

  // ── Verifica se o ÚLTIMO QUIQUE foi dentro das linhas ────────────────────
  const lastBounceInCourt = gs.lastBouncePos
    ? Math.abs(gs.lastBouncePos.y) <= COURT.halfL + 0.02
      && Math.abs(gs.lastBouncePos.x) <= COURT.singlesW / 2 + 0.02
    : false;

  if (ball.bounceCount >= 1 && lastBounceInCourt) {
    // ── REGRA REAL: quicou dentro → bola ainda está em jogo ─────────────────
    // O oponente PODE rebater de fora da quadra. NÃO encerrar ponto aqui.
    // Winner virá via 2º quique em onBounce() se o oponente não devolver.
    //
    // Exceção "dead zone": bola foi longe demais para ser realística alcançar.
    // Previne bola fugindo ao infinito sem resolução.
    const beyondY = Math.abs(ball.pos.y) > COURT.halfL + THRESHOLDS.chaseOutLimitY;
    const beyondX = Math.abs(ball.pos.x) > COURT.singlesW / 2 + THRESHOLDS.chaseOutLimitX;
    if (beyondY || beyondX) {
      // ── Diagnóstico: logar posição do defensor quando fuga é declarada ──
      const defender = gs.players[1 - h];
      const distDef = Math.sqrt((defender.pos.x - ball.pos.x)**2 + (defender.pos.y - ball.pos.y)**2);
      pushTech(gs,
        `[DBG-FUGA] ball(y=${ball.pos.y.toFixed(2)}) def:${defender.name}` +
        ` pos(y=${defender.pos.y.toFixed(2)}) dist:${distDef.toFixed(2)}m` +
        ` margin:${(defender._arrivalMargin ?? 0).toFixed(2)}s`
      );
      const defReach = (defender.reach + (defender.playerSpeed * (0.18 + (defender.stamina ?? 1) * 0.12))) * getDefenseRecoveryReachMult(defender);
      resolveUnreturnedBall(gs, gs.players[h], defender, `[UNRETURNED] fuga ${defender.name}`, { dist: distDef, defReach });
    }
    // Dentro da dead zone → rally continua, oponente pode rebater de fora
    return;
  }

  // Quique fora das linhas (ou sem quique) → erro do batedor
  const hitterOut = gs.players[h];
  const tag = recordShotError(gs, hitterOut);
  resolvePoint(gs, 1 - h, `[FORA] ${gs.players[h].name}`, false, tag === 'FE' ? 'FORCED_ERROR' : 'UNFORCED_ERROR');
}

function resolveBallStopped(gs) {
  const ball = gs.ball, h = ball.lastHitBy;
  if (h < 0) return;
  // Ball stopped after bouncing in court — hitter wins (opponent couldn't reach)
  if (ball.bounceCount >= 1) {
    const defender = gs.players[1 - h];
    const distDef = Math.sqrt((defender.pos.x - ball.pos.x)**2 + (defender.pos.y - ball.pos.y)**2);
    const staminaFactor = STAMINA.speedMinFactor + (defender.stamina ?? 1) * (1 - STAMINA.speedMinFactor);
    const maxDefSpd = defender.playerSpeed * staminaFactor;
    const defReach = (defender.reach + (maxDefSpd * 0.24)) * getDefenseRecoveryReachMult(defender);
    resolveUnreturnedBall(gs, gs.players[h], defender, `[UNRETURNED] bola parou ${defender.name}`, { dist: distDef, maxDefSpd, defReach });
  } else {
    const tag = recordShotError(gs, gs.players[h]);
    resolvePoint(gs, 1 - h, `[BOLA PAROU] ${gs.players[h].name}`, false, tag === 'FE' ? 'FORCED_ERROR' : 'UNFORCED_ERROR');
  }
}

// ── tryHit ────────────────────────────────────────────────────────
export function tryHit(player, gs) {
  const ball = gs?.ball ?? null;
  if (!player || !ball || gs?.gameState !== GameState.RALLY) return;
  if (player.hitCooldown > 0 || player.swinging) return;
  if (ball.lastHitBy === player.id) return;

  const ballOnMySide = Math.sign(ball.pos.y) === player.side || Math.abs(ball.pos.y) < 0.65;
  const ballComing = player.side > 0 ? ball.vel.y > 0.02 : ball.vel.y < -0.02;
  if (!ballOnMySide && !ballComing) {
    debugHitGate(gs, player, 'shotengine:not_my_ball');
    return;
  }

  const distance = Math.hypot((player.pos.x ?? 0) - (ball.pos.x ?? 0), (player.pos.y ?? 0) - (ball.pos.y ?? 0));
  const isReturnContact = player.id === gs.receiver && (gs.rally ?? 0) === 0 && gs.serveBounced;
  const returnSkill = clamp((player.attrs?.devolucao ?? player.attrs?.retorno ?? 60) / 100, 0, 1);
  const returnReading = clamp((player.attrs?.leitura ?? 60) / 100, 0, 1);
  // O alcance de devolução inclui a extensão do split-step. Devolução e
  // leitura ajudam a colocar a raquete na bola; a qualidade desse contato ainda
  // é resolvida separadamente pelo ServeExchangeEngine.
  const returnReachMult = isReturnContact ? 1.27 + returnSkill * 0.15 + returnReading * 0.04 : 1.14;
  const baseReachGate = Math.max((player.reach ?? PLAYER_CFG.reach) * returnReachMult, isReturnContact ? 1.02 : 0.92);
  const defensiveReachGate = distance > (player.reach ?? PLAYER_CFG.reach) * 0.86
    ? baseReachGate * getDefenseRecoveryReachMult(player)
    : baseReachGate;
  const reachGate = defensiveReachGate;
  const movementCanContact = player._movementCanContactBall || player._movementCanExecutePlannedShot;
  const localBounceWindow = (ball.bounceCount ?? 0) >= 1
    && ball.lastBounceSide === player.side
    && (ball._timeSinceBounce ?? 999) <= (isReturnContact ? 0.70 : 0.74)
    && distance <= reachGate * (isReturnContact ? 1.08 : 1.04);
  if (!movementCanContact && !localBounceWindow && distance > reachGate) {
    debugHitGate(gs, player, 'shotengine:outside_contact', { distance: +distance.toFixed(2), reachGate: +reachGate.toFixed(2) });
    return;
  }
  if ((ball.pos.z ?? 0) > THRESHOLDS.ballHitMaxZ + 0.85) {
    debugHitGate(gs, player, 'shotengine:ball_too_high', { z: +(ball.pos.z ?? 0).toFixed(2) });
    return;
  }

  const opponent = gs.players[1 - player.id];
  let context = buildShotContext({ gs, player, opponent });
  // O gate de física pode autorizar um contato local após o quique mesmo
  // quando o snapshot de movimento ainda não atualizou canContact. Sem esta
  // reconciliação o jogador bate a bola, mas o ShotQuality o avalia como
  // quase incapaz de alcançá-la: quality muito baixa -> RESET -> slice em
  // cascata. O contato só é promovido quando a própria janela física já o
  // validou; não é um buff de alcance.
  if (!isReturnContact && !context.body.canContact && localBounceWindow) {
    context = Object.freeze({
      ...context,
      body: Object.freeze({ ...context.body, canContact: true }),
    });
  }
  let quality = evaluateShotQuality(context);
  if (isReturnContact && (quality.canContact || distance <= reachGate * 1.12 || localBounceWindow)) {
    quality = normalizeReturnContact(context, quality);
  }
  if (!quality.canContact && distance > reachGate * 1.05) {
    debugHitGate(gs, player, 'shotengine:no_contact_quality', { distance: +distance.toFixed(2), q: +quality.quality.toFixed(2) });
    return;
  }

  const decision = isReturnContact ? decideReturnShot(context, quality) : decideShot(context, quality);
  const execution = buildShotExecution(context, quality, decision);
  const modernShotType = classifyModernShotType(decision, execution);
  const incomingSlowBall = (context?.ballState?.speed ?? 0) < 18;
  applyShotExecution({ ball, player, execution, launchBall });
  const shotEngineSnapshot = buildShotEngineSnapshot({ context, quality, decision, execution });
  recordModernShotTelemetry(gs, player, context, quality, decision, execution, shotEngineSnapshot, isReturnContact);

  player.hitCooldown = TIMING.hitCooldown;
  player.swinging = true;
  player.swingTimer = 0;
  player.shotCount++;
  const courtDrain = gs?.courtMods?.staminaDecayMult ?? 1;
  const strokeMechanics = context?.body?.strokePreparation ?? null;
  const mechanicalDrain = 1
    + (strokeMechanics?.recoveryExposure ?? 0) * 0.20
    + (strokeMechanics?.switchSeverity ?? 0) * 0.10
    + (strokeMechanics?.runAround ? 0.07 : 0);
  const shotDrain = STAMINA.decayPerShot * 0.46
    * (1 + Math.min(1.4, distance / Math.max(reachGate, 0.1)) * 0.34)
    * (decision.intent === 'FINISH' ? 1.28 : decision.intent === 'PRESSURE' || decision.intent === 'REDIRECT' ? 1.16 : decision.intent === 'DEFEND' ? 1.10 : 1)
    * (quality.quality < 0.45 ? 1.22 : 1)
    * mechanicalDrain
    * courtDrain
    * (1 + (decision.signatureMove?.staminaCost ?? 0))
    * getStaminaResistanceDrainMult(player);
  player.stamina = clamp((player.stamina ?? 1) - shotDrain, 0, 1);
  player._lastShotEngine = buildShotDebugPayload({ context, quality, decision, notes: [explainShotDecision(decision, context, quality)] });
  player._lastShotEngineSnapshot = shotEngineSnapshot;
  player._isBackhand = context.wing === 'BACKHAND';
  player.ctx.currentIntent = decision.intent;
  player.ctx.lastShotX = execution.targetX;
  player.ctx._lastShotX = execution.targetX;
  rememberShot({ player, opponent, decision, execution, quality, context });

  ball.inFlight = true;
  ball.bounceCount = 0;
  ball.lastBounceSide = 0;
  ball.outGraceTimer = 0.08;
  gs.isFirstBounce = false;
  gs.receiverTouched = gs.receiverTouched || player.id === gs.receiver;
  gs.rally = (gs.rally ?? 0) + 1;
  gs.maxRally = Math.max(gs.maxRally ?? 0, gs.rally);
  gs.shotEngineOffline = null;

  const shotForLegacyTelemetry = {
    type: modernShotType,
    physicalFamily: decision.family,
    targetX: execution.targetX,
    targetY: execution.targetY,
    power: execution.power,
    spinType: execution.spinType,
    actualSpinX: execution.actualSpinX,
    actualSpinZ: execution.actualSpinZ,
    intent: decision.intent,
    direction: decision.direction,
    wrongFoot: decision.wrongFoot ?? execution.wrongFoot ?? null,
    _approachFit: decision.approachFit ?? decision._approachFit ?? 0,
    _approachIntent: decision.approachIntent ?? decision._approachIntent ?? 0,
    _netPhase: player?.ctx?.netPhase ?? 'BASE',
    signatureMove: decision.signatureMove ?? null,
    shotEngine: shotEngineSnapshot,
  };
  const pressureZone = classifyZone(execution.targetX, execution.targetY, opponent?.pos);
  updateRallyPressure(gs, opponent.id, pressureZone, execution.targetX, shotForLegacyTelemetry);
  shotForLegacyTelemetry.pressureZone = pressureZone;
  shotForLegacyTelemetry.receiverPressure = opponent?.ctx?.rallyPressure ?? 0;
  auditRegisterShot(gs, player, shotForLegacyTelemetry, quality.quality);
  traceLogShot(gs, player, shotForLegacyTelemetry, quality.quality);
  updateNetApproachIntent(gs, player, opponent, shotForLegacyTelemetry, quality.quality, incomingSlowBall);
  const isFrameShot = quality.quality < 0.20 || (quality.quality < 0.30 && !quality.canContact);
  pushShotVFX(gs, player, modernShotType, quality.quality, isFrameShot, !!decision.signatureMove, decision.signatureMove?.label ?? null, decision.signatureMove?.emoji ?? null, {
    labelOverride: decision.signatureMove?.label ?? modernShotType,
    executionState: quality.bodyState,
    executionLabel: quality.bodyState,
    feelTags: [decision.intent, decision.direction, ...(decision.signatureMove ? ['signature'] : [])],
    shotEngine: shotEngineSnapshot,
  });
  pushTech(gs, `[SHOT_ENGINE] ${player.name} ${modernShotType}${modernShotType !== decision.family ? `(${decision.family})` : ''} ${decision.direction} ${decision.intent} Q=${quality.quality.toFixed(2)} risk=${execution.errorRisk.toFixed(2)}${decision.wrongFoot?.active ? ` wrongFoot=${decision.wrongFoot.strength}` : ''}`);
  debugHitGate(gs, player, 'shotengine:hit', { family: decision.family, q: +quality.quality.toFixed(2), targetX: +execution.targetX.toFixed(2), targetY: +execution.targetY.toFixed(2), wrongFoot: decision.wrongFoot ?? null });
}

function tickPreServe(gs) {
  prepareServePositions(gs);
  gs.shotEngineOffline = null;
  if (gs.stateTimer < TIMING.preServeDelay) return;
  gs.gameState = GameState.SERVING;
  gs.stateTimer = 0;
}

function tickServing(gs) {
  if (gs.stateTimer < TIMING.serveWindup) return;
  gs.ball = createBall();
  gs.lastBouncePos = null;
  const plan = executeServe({ gs, launchBall });
  if (!plan) {
    markShotEngineOffline(gs, { phase: 'serving', reason: 'serve_plan_failed' });
    return;
  }
  const server = gs.players[gs.server];
  auditRegisterShot(gs, server, {
    type: plan.family,
    targetX: plan.target.x,
    targetY: plan.target.y,
    power: plan.power,
    spinType: plan.spinType,
    actualSpinX: plan.actualSpinX,
    actualSpinZ: plan.actualSpinZ,
    intent: plan.intent,
    direction: plan.direction,
    signatureMove: plan.signatureMove ?? null,
    shotEngine: server._lastShotEngineSnapshot ?? null,
  }, plan.quality);
  traceLogShot(gs, server, {
    type: plan.family,
    targetX: plan.target.x,
    targetY: plan.target.y,
    power: plan.power,
    spinType: plan.spinType,
    actualSpinX: plan.actualSpinX,
    actualSpinZ: plan.actualSpinZ,
    intent: plan.intent,
    direction: plan.direction,
    signatureMove: plan.signatureMove ?? null,
    shotEngine: server._lastShotEngineSnapshot ?? null,
  }, plan.quality);
  const serveSnapshot = server._lastShotEngineSnapshot ?? null;
  pushShotVFX(gs, server, plan.family, plan.quality, false, !!plan.signatureMove, plan.signatureMove?.label ?? null, plan.signatureMove?.emoji ?? null, {
    labelOverride: plan.signatureMove?.label ?? plan.family,
    executionState: plan.isFirst ? 'FIRST_SERVE' : 'SECOND_SERVE',
    executionLabel: plan.isFirst ? 'FIRST_SERVE' : 'SECOND_SERVE',
    feelTags: [plan.intent, plan.direction, ...(plan.signatureMove ? ['signature'] : [])],
    shotEngine: serveSnapshot,
  });
  const netGame = server.prefs?.netGame ?? 'RELUCTANT';
  const serveVolleyChance = netGame === 'HUNTER'
    ? (plan.isFirst ? 0.88 : 0.58)
    : netGame === 'PROACTIVE'
      ? (plan.isFirst ? 0.44 : 0.20)
      : 0;
  if (!gs._pendingServeData?.forcedFaultKind
      && serveVolleyChance > 0
      && Math.random() < serveVolleyChance) {
    triggerNetTransition(gs, server, {
      targetX: plan.target.x,
      targetY: plan.target.y,
    }, plan.quality, netGame === 'HUNTER' ? 'serve-volley plano A' : 'serve-volley');
  }
  pushTech(gs, `[SHOT_ENGINE_SERVE] ${server.name} ${plan.isFirst ? '1st' : '2nd'} ${plan.family} ${plan.direction} ${gs._pendingServeData?.kmh ?? 0}km/h Q=${plan.quality.toFixed(2)}${plan.signatureMove ? ` signature=${plan.signatureMove.id}` : ''}`);
  gs.gameState = GameState.RALLY;
  gs.stateTimer = 0;
  gs.shotEngineOffline = null;
}
// ── Tick functions ─────────────────────────────────────────────────
export function gameTick(gs, dt) {
  if (gs.gameState === GameState.GAME_OVER || gs.gameState === GameState.POINT_END) return;
  gs.stateTimer += dt;
  updateEnvironment(gs, dt);
  if (gs.stateTimer % 3 < dt) pruneOldMarks(gs);  // prune marks every ~3s
  switch (gs.gameState) {
    case GameState.PRE_SERVE:        tickPreServe(gs);     break;
    case GameState.SERVING:          tickServing(gs);      break;
    case GameState.RALLY:            tickRally(gs, dt);     break;
    case GameState.MEDICAL_TIMEOUT:  tickMTO(gs, dt);       break;
  }
}

// ── Medical Time Out ────────────────────────────────────────────────────────
function tickMTO(gs, dt) {
  const mto = gs.mto;
  if (!mto) {
    // Estado inválido — limpa e avança
    _startNextPointFromMTO(gs);
    return;
  }

  // Aguarda duração do MTO
  if (gs.stateTimer < mto.durationSecs) return;

  // ── MTO encerrou — decide se o jogador continua ──────────────────────────
  if (!mto.decided) {
    mto.decided = true;
    const injured = gs.players[mto.playerIdx];
    const { canContinue } = decideMTOOutcome(injured, mto.severity, gs);
    mto.canContinue = canContinue;

    if (!canContinue) {
      // ── ABANDONO ──────────────────────────────────────────────────────────
      const winnerIdx = 1 - mto.playerIdx;
      const loser = injured;

      // Registra o set em andamento antes de forçar o resultado.
      // Sem isso setsHistory fica incompleto e o overlay mostra placar errado.
      const p0 = gs.players[0], p1 = gs.players[1];
      if (p0.games > 0 || p1.games > 0) {
        p0.setsHistory = [...(p0.setsHistory || []), p0.games];
        p1.setsHistory = [...(p1.setsHistory || []), p1.games];
      }

      // Força vitória do adversário — sets mínimos para passar setsToWin
      gs.players[winnerIdx].sets = gs.setsToWin ?? 2;

      // Registra abandono no gs para exposição no resultado
      gs.matchRetirement = {
        playerIdx:   mto.playerIdx,
        playerName:  loser.name,
        playerId:    loser.id,
        injuryType:  mto.injuryType,
        severity:    mto.severity,
        isTemporary: mto.isTemporary ?? false,
        atSet:  gs.players[0].sets + gs.players[1].sets,
        atGame: gs.players[0].games + gs.players[1].games,
        score:  `${gs.players[0].sets}-${gs.players[1].sets}`,
      };

      // Evento narrativo
      if (!gs.inMatchInjuryEvents) gs.inMatchInjuryEvents = [];
      gs.inMatchInjuryEvents.push(
        buildInMatchInjuryEvent(loser, mto, gs, 'retirement')
      );

      gs.log.push(`🚫 [ABANDONO] ${loser.name} não retorna — lesão ${mto.severity}`);
      gs.gameState = GameState.GAME_OVER;
      gs.mto = null;
      return;
    }

    // ── RETORNO — aplica penalidades e marca lesão ativa ────────────────────
    applyInMatchPenalty(injured, mto.injuryType, mto.severity);
    injured._inMatchInjury = {
      injuryType:      mto.injuryType,
      severity:        mto.severity,
      isTemporary:     mto.isTemporary ?? false,
      gamesAfterInjury: 0,
    };
    injured._hadInMatchMTO = true;

    // Garante que a flag visual de lesão piscante fique ativa
    if (!injured.injury) {
      injured.injury = {
        type:            mto.injuryType,
        grade:           mto.severity === 'SEVERE' ? 2 : 1,
        slotsRemaining:  0,
        isPlayingThrough: true,
        inMatchActive:   true,
      };
    } else {
      injured.injury.inMatchActive = true;
    }

    gs.log.push(`↩ [RETORNO] ${injured.name} volta à quadra (${mto.injuryType}/${mto.severity})`);
  }

  // ── Inicia o próximo ponto ────────────────────────────────────────────────
  _startNextPointFromMTO(gs);
}

/** Reseta o estado para o próximo ponto após o MTO (equivale ao corpo do scheduleNextPoint) */
function _startNextPointFromMTO(gs) {
  gs.mto = null;
  gs.rally = 0; gs.serveLeft = !gs.serveLeft;
  gs._matchPointCounter = (gs._matchPointCounter ?? gs.totalPoints ?? 0) + 1;
  gs._currentPointId = gs._matchPointCounter;
  gs._lastShotEvent = null;
  gs.players[gs.server].faults = 0;
  gs.ball = createBall();
  gs.lastBouncePos = null;
  gs.gameState  = GameState.PRE_SERVE;
  gs.stateTimer = 0;
  gs.isFirstBounce   = true;
  gs.receiverTouched = false;
  for (const p of gs.players) {
    p.atNet = false;
    { const _pAggr = p.attrs?.visaoTatica ?? p.attrs?.agressividade ?? 60;
      const _pNetAvg = ((p.attrs?.volley ?? p.attrs?.jogoDeRede ?? 60) + (p.attrs?.smash ?? p.attrs?.jogoDeRede ?? 60)) / 2;
      const _pOff = 0.20 + (_pAggr/100)*0.50 + (_pNetAvg/100)*0.20; p.basePos.y = p.side * (COURT.halfL - _pOff); }
    p.pos = { ...p.basePos }; p.vel = v2(0, 0);
    recoverPlayerStamina(p, STAMINA.recoveryPerPoint);
    p._nearMissTimer = 0;
    resetMovementRuntime(p);
    resetCtx(p);
  }
  gs.players[gs.server].ctx._isServer   = true;
  gs.players[gs.receiver].ctx._isServer = false;
  traceStartPoint(gs);
}

// ═══════════════════════════════════════════════════════════════════
function tickRally(gs, dt) {
  // ── Injetar humidityFriction do ambiente no courtPhysics ──────────────────
  // Isso permite que handleGroundBounce use fricção dinâmica de humidade
  // sem acoplar EnvironmentSystem diretamente no physics.js.
  if (gs.courtPhysics && gs.environment) {
    gs.courtPhysics.humidityFriction = gs.environment.humidityFrictionAdd ?? 0;
  }
  stepPhysics(gs, dt);
  if (gs.gameState !== GameState.RALLY) return;

  // ── Players update + tryHit BEFORE resolve checks ─────────────────────────
  // Crítico: jogadores devem ter prioridade para tentar rebater a bola antes
  // de qualquer resolução de ponto. Sem isso, a bola pode ser declarada winner
  // logo após o 1º quique sem dar chance ao defensor de reagir.
  for (const p of gs.players) {
    if (p.hitCooldown > 0) p.hitCooldown -= dt;
    if (p._nearMissTimer > 0) p._nearMissTimer -= dt;  // decrement near-miss hysteresis window
    if (p.swinging) { p.swingTimer += dt; if (p.swingTimer >= TIMING.swingDuration) { p.swinging = false; p.swingTimer = 0; } }
    updatePlayerMovement(p, gs, dt);

    // ── Heatmap accumulation (every 8 ticks ≈ 8 frames @60fps) ──────────────
    p._heatTick = (p._heatTick + 1) & 7;
    if (p._heatTick === 0) {
      const COLS = 12, ROWS = 16;
      const col = Math.floor((p.pos.x + 4.115) / (8.23 / COLS));
      const row = Math.floor(Math.abs(p.pos.y) / (11.885 / ROWS));
      const ci = Math.max(0, Math.min(COLS - 1, col));
      const ri = Math.max(0, Math.min(ROWS - 1, row));
      if (p._heatGrid[ri * COLS + ci] < 65535) p._heatGrid[ri * COLS + ci]++;
    }

    // ── PrepTime accumulation: "barra de preparação" ──────────────────────────
    const ball = gs.ball;
    const ballOnMySide = Math.sign(ball.pos.y) === p.side || Math.abs(ball.pos.y) < 0.5;
    const ballBounced  = ball.bounceCount >= 1;
    const dToBall      = Math.sqrt((p.pos.x - ball.pos.x)**2 + (p.pos.y - ball.pos.y)**2);
    const prepReach    = 10.0;
    const spd          = Math.sqrt(p.vel.x**2 + p.vel.y**2);
    const maxSpd       = p.playerSpeed ?? PLAYER_CFG.speed;

    // ── 4 zonas de movimento ──────────────────────────────────────────────────
    // Parado    : < 8% maxSpd  (~0.43 m/s) → acumula rápido se em cima da bola
    // Andando   : 8–45% maxSpd (~2.4 m/s)  → acumula devagar
    // Trotando  : 45–72% maxSpd (~3.9 m/s) → acumula muito pouco
    // Correndo  : > 72% maxSpd             → NÃO acumula, decai
    const isStopped  = spd < maxSpd * 0.08;
    const isWalking  = spd < maxSpd * 0.45;
    const isJogging  = spd < maxSpd * 0.72;
    // isRunning = tudo acima

    const inPrepZone = ballOnMySide && ballBounced && dToBall < prepReach
                    && ball.lastHitBy !== p.id;

    if (inPrepZone) {
      // ── Marca primeira entrada na prepZone ───────────────────────────────────
      // prep signal é acumulado aqui e passado para o offline contact sensor no momento do hit.
      if (!p._approachInitialized) {
        p._approachInitialized = true;
      }
      // distFactor com curva acentuada: só perto da bola realmente conta
      const distFactor = Math.pow(1 - Math.min(1, dToBall / prepReach), 1.8);

      let rate;
      if (isStopped) {
        // Parado em cima da bola: sobe rápido — mas não recompensa tanto quanto antes.
        // Reduzido de 0.45+2.60 para evitar que o AI "plante" passivamente à espera.
        rate = 0.40 + distFactor * 2.00;
      } else if (isWalking) {
        // Andando/ajustando: bom — footwork real acontece em movimento
        rate = 0.10 + distFactor * 0.90;
      } else if (isJogging) {
        // Trote: viável — open-stance em trote é golpe legítimo no ATP
        rate = 0.04 + distFactor * 0.40;
      } else {
        // Correndo: pequeno acúmulo — tenistas de elite carregam o swing em movimento.
        // Antes: 0 (forçava parar para qualquer prep). Agora: corre e ainda carrega um pouco.
        rate = distFactor * 0.12;
      }

      // ── Penalidade de velocidade da bola ──────────────────────────────────
      // Bola rápida = menos tempo de reação = barra enche mais devagar
      // 12 m/s (43 km/h): sem penalidade | 42 m/s (151 km/h): só 25% da taxa
      const ballSpd2D     = Math.sqrt(ball.vel.x**2 + ball.vel.y**2);
      const ballSpdFactor = clamp(1 - (ballSpd2D - 12) / 30, 0.25, 1.0);

      p._prepTime = (p._prepTime ?? 0) + dt * rate * ballSpdFactor;

    } else if (!ballOnMySide || ball.lastHitBy === p.id) {
      p._prepTime            = 0;
      p._approachInitialized = false;
    } else {
      // Correndo longe da bola (ou fora da zona): decai
      p._prepTime = Math.max(0, (p._prepTime ?? 0) - dt * 1.5);
    }
    // Expose fractions for renderer (two rings)
    // ── Volley prep boost: reflexo + instintoRede reduzem o tempo necessário ──
    // Para groundstrokes: PREP1=0.55s, PREP2=0.90s — carregamento de swing (~0.5s), não pausa estática
    // Para voleio: reflexo acelera o ring 1 (reação imediata) e
    //              instintoRede acelera o ring 2 (posicionamento de rede).
    // Ambos no máximo (100) reduzem PREP1 em até 70% e PREP2 em até 65%.
    // Isso significa que um SRV_VOL com reflexo 90 + instinto 90 chega num
    // voleio correndo e ainda tem qualidade decente — é para o que foi treinado.
    const _isVolleyShot = !p.atNet
      ? (p._volleyType === 'position' || p._volleyType === 'emergency')
      : true;  // atNet = sempre conta como voleio

    let PREP1, PREP2;
    if ((_isVolleyShot || p._volleyType === 'smash') && p.mods) {
      const reflexoFactor  = clamp((p.mods.reflexoQualBonus ?? 0) / 0.18, 0, 1);  // normaliza 0→1 para o novo range do volley
      const instintoFactor = ((p.attrs?.jogoDeRede ?? p.attrs?.instintoRede ?? 50) - 50) / 50;  // -1→1, 0 em 50
      const instintoNorm   = Math.max(0, instintoFactor);  // só bônus, nunca penaliza

      // Ring 1: reflexo reduz até 70% do tempo exigido
      // Ring 2: instintoRede reduz até 65% do tempo exigido
      const prep1Reduction = clamp(reflexoFactor * 0.70, 0, 0.70);
      const prep2Reduction = clamp(instintoNorm   * 0.65, 0, 0.65);

      PREP1 = 0.55 * (1 - prep1Reduction);  // range: 0.165s (reflexo 100) → 0.55s (reflexo 0)
      PREP2 = 0.90 * (1 - prep2Reduction);  // range: 0.315s (instinto 100) → 0.90s (instinto 0)
    } else {
      // Reduzido de 0.85/1.30 para 0.55/0.90 — o prep completo é carregamento de swing
      // (~0.5s de rotação de quadril), não 2s de pausa estática como antes.
      PREP1 = 0.55;
      PREP2 = 0.90;
    }

    p._prepFrac1 = Math.min(1, (p._prepTime ?? 0) / PREP1);
    p._prepFrac2 = Math.min(1, Math.max(0, ((p._prepTime ?? 0) - PREP1) / PREP2));

    // FIX 13 — Stamina → timing window: cansaço alarga a janela exigida.
    // Jogador com stamina=0 precisa de 30% mais tempo parado para mesma qualidade.
    // Efeito: começa a "falhar o timing" antes de perder velocidade visivelmente,
    // replicando o colapso físico real em sets longos.
    const lowStaminaPenaltyMult = p._surfaceTalentFx?.lowStaminaPenaltyMult ?? 1;
    const lowStaminaRelief = clamp((p._surfaceTalentFx?.lowStaminaPenaltyReliefFlat ?? 0) / 100, 0, 0.2);
    const enduranceProtection = getResistanceFatigueProtection(p) * 0.46;
    const staminaTimingPenalty = clamp(1 + (1 - (p.stamina ?? 1.0)) * 0.30 * lowStaminaPenaltyMult * (1 - lowStaminaRelief) * (1 - enduranceProtection), 1.0, 1.30);
    p._prepFrac1 = Math.min(1, (p._prepTime ?? 0) / (PREP1 * staminaTimingPenalty));
    p._prepFrac2 = Math.min(1, Math.max(0, ((p._prepTime ?? 0) - PREP1) / (PREP2 * staminaTimingPenalty)));
  }
  for (const p of gs.players) { tryHit(p, gs); if (gs.gameState !== GameState.RALLY) return; }

  // ── Resolve checks (rede, fora, bola parada) ──────────────────────────────
  if (gs.isFirstBounce && gs.ball.lastHitBy === gs.server && gs.ball._lipNet) {
    gs.ball._serveNetTouched = true;
    gs.ball._lipNet = false;
  }
  if (checkNetCollision(gs.ball))                          { resolveNet(gs);          return; }
  if (gs.gameState !== GameState.RALLY)                    return;
  if (checkOutOfBounds(gs.ball) && gs.ball.pos.z < 0.5)   { resolveOutOfBounds(gs);  return; }
  if (gs.gameState !== GameState.RALLY)                    return;
  if (!gs.ball.inFlight && mag3(gs.ball.vel) < THRESHOLDS.ballStopSpeed) { resolveBallStopped(gs); return; }
}

function getNetProfile(player) {
  const declaredKey = player?.prefs?.netGame ?? 'RELUCTANT';
  const netSkill = ((player?.attrs?.volley ?? 50) + (player?.attrs?.smash ?? 50)) / 2;
  const allCourtCloser = player?.styleId === 'ALL_COURT'
    && netSkill >= 78
    && (player?.attrs?.visaoTatica ?? 50) >= 78
    && (player?.attrs?.leitura ?? 50) >= 78;
  // Um all-court de mão e leitura de elite não pode virar um baseliner que
  // ignora a rede por uma preferência antiga. A troca é só para OPORTUNIST:
  // ele continua seletivo e precisa construir uma janela legítima.
  const key = declaredKey === 'RELUCTANT' && allCourtCloser ? 'OPPORTUNIST' : declaredKey;
  let profile;
  switch (key) {
    case 'HUNTER':
      // Sampras: a rede é o plano A, não a recompensa.
      // base alto → acumula netIntent em todo rally
      // carry alto → não decai entre golpes
      // threshold baixo → decide subir cedo
      // minQ baixo → não espera bola perfeita para aproximar
      // fitFloor baixo → qualquer golpe razoável serve de aproximação
      profile = { base: 0.16, carry: 0.72, weakReturn: 0.34, shortBall: 0.42, slowBall: 0.18,
                  pressure: 0.16, neutral: 0.08, threshold: 0.52, minQ: 0.46, maxBehind: 1.05,
                  oppDepth: 0.54, cooldown: 2, fitFloor: 0.36 };
      break;
    case 'PROACTIVE':
      profile = { base: 0.08, carry: 0.62, weakReturn: 0.24, shortBall: 0.32, slowBall: 0.12,
                  pressure: 0.09, neutral: 0.04, threshold: 0.64, minQ: 0.54, maxBehind: 0.82,
                  oppDepth: 0.60, cooldown: 3, fitFloor: 0.46 };
      break;
    case 'OPPORTUNIST':
      // Sobe somente quando a bola convida — threshold moderado, exigência real de fit
      profile = { base: 0.00, carry: 0.44, weakReturn: 0.08, shortBall: 0.16, slowBall: 0.06,
                  pressure: 0.015, neutral: 0.00, threshold: 0.80, minQ: 0.66, maxBehind: 0.55,
                  oppDepth: 0.68, cooldown: 5, fitFloor: 0.58 };
      break;
    case 'RELUCTANT':
      // Só vai se a bola for muito curta e a qualidade for alta — raramente sobe
      profile = { base: 0.00, carry: 0.38, weakReturn: 0.02, shortBall: 0.10, slowBall: 0.04,
                  pressure: 0.00, neutral: 0.00, threshold: 0.82, minQ: 0.64, maxBehind: 0.4,
                  oppDepth: 0.72, cooldown: 4, fitFloor: 0.50 };
      break;
    default: // AVOIDS — a rede é território inimigo
      profile = { base: 0.00, carry: 0.22, weakReturn: 0.00, shortBall: 0.02, slowBall: 0.01,
                  pressure: 0.00, neutral: 0.00, threshold: 0.98, minQ: 0.80, maxBehind: 0.1,
                  oppDepth: 0.88, cooldown: 6, fitFloor: 0.60 };
  }

  const netTransitionMult = clamp(player?.mods?.netApproachMult ?? 1.2, 0.80, 1.70);
  const carryShift = (netTransitionMult - 1.20) * 0.10;
  const thresholdShift = (1.20 - netTransitionMult) * 0.16;
  const minQShift = (1.18 - netTransitionMult) * 0.07;
  const fitShift = (1.16 - netTransitionMult) * 0.10;
  return {
    ...profile,
    declaredKey,
    effectiveKey: key,
    allCourtCloser,
    carry: clamp(profile.carry + carryShift, 0.24, key === 'HUNTER' ? 0.84 : 0.72),
    threshold: clamp(profile.threshold + thresholdShift, key === 'HUNTER' ? 0.44 : 0.58, 0.99),
    minQ: clamp(profile.minQ + minQShift, key === 'HUNTER' ? 0.42 : 0.54, 0.84),
    fitFloor: clamp(profile.fitFloor + fitShift, key === 'HUNTER' ? 0.30 : 0.42, 0.72),
  };
}

function triggerNetTransition(gs, player, shot, quality, reason = 'pressao construida') {
  const ctx = player?.ctx;
  if (!ctx || player.atNet || ctx.courtMode === 'TRANSITION' || ctx.courtMode === 'NET') return false;
  const profile = getNetProfile(player);
  ctx._netApproachedThisPoint = true;
  ctx.courtMode = 'TRANSITION';
  ctx.netPhase = 'APPROACH';
  ctx.transitionCooldown = profile.cooldown;
  ctx.netIntent = Math.max(0.50, (ctx.netIntent ?? 0) * 0.82);
  ctx.netIntentSource = reason;
  ctx._approachLandX = shot?.targetX ?? 0;
  ctx._approachQuality = clamp(quality ?? 0.65, 0.50, 1);
  player.stats.netApproaches++;
  gs.log.push(`📡 [${player.styleData?.abbr ?? 'NET'}] ${player.name} sobe à rede (${reason})`);
  return true;
}

function syncNetPhaseState(player) {
  const ctx = player?.ctx;
  if (!ctx) return;

  if (player.atNet) {
    ctx.courtMode = 'NET';
    if (!['APPROACH', 'FIRST_VOLLEY', 'CLOSE_FINISH'].includes(ctx.netPhase)) {
      ctx.netPhase = 'FIRST_VOLLEY';
    }
    return;
  }

  if (ctx.courtMode === 'TRANSITION') {
    if (ctx.netPhase === 'BASE') ctx.netPhase = 'APPROACH';
    return;
  }

  ctx.netPhase = 'BASE';
}

function advanceNetPhaseAfterShot() {
  return;
}

function buildShotFeelTags(shot, player) {
  const tags = [];
  const executionState = shot?._executionState ?? player?._executionState?.state ?? 'NEUTRAL';
  const pointPattern = shot?._pointPattern ?? player?.ctx?._pointPatternPlan?.name ?? null;
  const netPhase = shot?._netPhase ?? player?.ctx?.netPhase ?? 'BASE';
  const wingIdentity = shot?._wingIdentity ?? player?._wingIdentity?.dominantWing ?? 'BALANCED';

  const execTag = {
    PLANTED: 'plantado',
    ON_RISE: 'subida',
    STRETCHED: 'esticado',
    LATE: 'atrasado',
    ON_THE_RUN: 'correndo',
    FALLING_BACK: 'recuando',
    JAMMED: 'espremido',
    NEUTRAL: 'neutro',
  }[executionState];
  if (execTag) tags.push(execTag);

  const netTag = {
    APPROACH: 'approach',
    FIRST_VOLLEY: '1a volley',
    CLOSE_FINISH: 'fechando',
  }[netPhase];
  if (netTag) tags.push(netTag);

  const patternTag = {
    SERVE_PLUS_ONE_OPEN: '+1 aberto',
    BODY_PRESSURE: 'corpo',
    ABSORB_REDIRECT: 'absorve',
    OPEN_COURT_FINISH: 'quadra aberta',
    BACKHAND_LOCK_THEN_DTL: 'bh->dtl',
    DROP_THEN_LOB: 'drop->lob',
    HEAVY_TO_BACKHAND: 'peso no bh',
  }[pointPattern];
  if (patternTag) tags.push(patternTag);

  const wingTag = wingIdentity === 'FH' ? 'fh arma' : wingIdentity === 'BH' ? 'bh arma' : null;
  if (wingTag) tags.push(wingTag);

  return tags.slice(0, 4);
}

function updateNetApproachIntent(gs, player, opp, shot, effectiveQuality, isSlowBall) {
  const ctx = player?.ctx;
  if (!ctx || !shot) return;

  const profile = getNetProfile(player);
  if ((ctx.transitionCooldown ?? 0) > 0) ctx.transitionCooldown--;

  if (player.atNet || ctx.courtMode === 'TRANSITION' || ctx.courtMode === 'NET') {
    ctx.netIntent = 0;
    ctx.netIntentSource = null;
    return;
  }

  const netInclined = profile.effectiveKey === 'HUNTER' || profile.effectiveKey === 'PROACTIVE';
  const lobSuppressThreshold = netInclined ? 4 : 3;
  const netSuppressed = (ctx.lobsReceived ?? 0) >= lobSuppressThreshold;
  if (netSuppressed) {
    ctx.netIntent = clamp((ctx.netIntent ?? 0) * 0.25, 0, 1);
    ctx.netIntentSource = 'suppressed';
    return;
  }

  const oppDepth = Math.abs(opp?.pos?.y ?? 0) / COURT.halfL;
  const playerBehindBaseline = Math.max(0, Math.abs(player.pos.y) - COURT.halfL);
  const playerInside = Math.abs(player.pos.y) <= COURT.halfL + profile.maxBehind;
  const playerDefending = effectiveQuality < 0.34
    || (ctx.rallyPressure ?? 0) > 0.78
    || playerBehindBaseline > profile.maxBehind + 0.35;
  const weakReturnBoost = clamp(ctx._weakReturnBoost ?? 0, 0, 1);
  const currentIntent = ctx.currentIntent ?? 'BUILD';
  const shotFit = clamp(shot._approachFit ?? shot._approachIntent ?? 0, 0, 1);
  const approachIntent = currentIntent === 'APPROACH';
  const attacking = currentIntent === 'FINISH' || currentIntent === 'PRESSURE' || currentIntent === 'REDIRECT' || approachIntent;
  const surfaceKey = _courtKeyToSurface(gs?.courtId ?? gs?.courtMeta?.surface ?? gs?.surface ?? gs?.courtMods?.surface ?? '');
  const isClay = surfaceKey === 'clay';
  const netSkill = ((player.attrs?.volley ?? player.attrs?.jogoDeRede ?? 50) + (player.attrs?.smash ?? player.attrs?.jogoDeRede ?? 50)) / 2;
  const targetDepth = Math.abs(shot.targetY ?? COURT.halfL);
  const oppPlayedShort = targetDepth <= COURT.serviceLineY + 1.25;
  const isHunter = profile.effectiveKey === 'HUNTER';
  const isProactive = profile.effectiveKey === 'PROACTIVE';
  // A decisão tática já permite uma aproximação excepcional para OPPORTUNIST.
  // A trava física antiga (72 para todo mundo) anulava 100% dessas decisões em
  // all-courters medianos. Mantemos a exigência alta para PROACTIVE e liberamos
  // o oportunista apenas com competência mínima; os demais gates de janela,
  // qualidade, fit e netIntent continuam bem restritivos.
  const minNetSkill = isHunter ? 58 : isProactive ? 68 : profile.effectiveKey === 'OPPORTUNIST' ? 60 : 72;
  const netSkillGate = netSkill >= minNetSkill;

  let gain = profile.base;
  let source = 'neutral';

  if (weakReturnBoost > 0.12) {
    gain += profile.weakReturn * (0.55 + weakReturnBoost);
    source = 'weak_return';
  }
  if (oppPlayedShort) {
    gain += profile.shortBall;
    source = 'short_ball';
  }
  if (isSlowBall) {
    gain += profile.slowBall;
    if (source === 'neutral') source = 'slow_ball';
  }
  if (attacking) {
    gain += profile.pressure;
    if (source === 'neutral') source = 'pressure';
  }
  if (shotFit > 0.35 && effectiveQuality > 0.58) {
    gain += shotFit * (approachIntent ? 0.15 : 0.07);
  }
  if (isHunter && shotFit > 0.30 && effectiveQuality > 0.46) {
    gain += 0.12 + shotFit * 0.16;
    source = approachIntent ? 'approach_plan' : source;
  } else if (isProactive && shotFit > 0.42 && effectiveQuality > 0.52) {
    gain += 0.06 + shotFit * 0.10;
  }
  if (!oppPlayedShort && !isSlowBall && attacking && effectiveQuality > 0.60) {
    gain += profile.neutral;
  }
  if (playerDefending) {
    gain *= 0.15;
  }
  if (isClay) {
    gain *= netSkill >= 82 ? 0.90 : 0.68;
  }

  ctx.netIntent = clamp((ctx.netIntent ?? 0) * profile.carry + gain, 0, 1);
  ctx.netIntentSource = source;

  const clearWindow = oppPlayedShort
    || isSlowBall
    || weakReturnBoost > 0.16
    || oppDepth > profile.oppDepth
    || (approachIntent && shotFit >= profile.fitFloor)
    || (isHunter && (approachIntent || shotFit >= 0.42 || attacking))
    || (isProactive && approachIntent && shotFit >= 0.52);
  const readyToTransition = playerInside
    && !playerDefending
    && netSkillGate
    && effectiveQuality >= profile.minQ
    && shotFit >= profile.fitFloor
    && clearWindow
    && (!isClay || oppPlayedShort || weakReturnBoost > 0.18 || (isSlowBall && effectiveQuality > 0.66) || (attacking && shotFit > 0.62 && effectiveQuality > 0.66));
  // O cérebro v2 já testou habilidade de rede, posição, qualidade e bola
  // curta antes de escolher um blueprint de aproximação. Não deixe um
  // segundo perfil dinâmico contradizer a ação depois de registrá-la.
  const committedBlueprintApproach = approachIntent
    && shot?.shotEngine?.blueprintId === 'SLICE_CHIP_APPROACH'
    && playerInside
    && !playerDefending
    && effectiveQuality >= 0.56
    && shotFit >= 0.72
    && (oppPlayedShort || isSlowBall || weakReturnBoost > 0.12 || oppDepth > 0.58);
  const chaosNetWindow = netSkill >= 78
    && playerInside
    && !playerDefending
    && (ctx.transitionCooldown ?? 0) <= 0
    && effectiveQuality >= 0.66
    && (oppPlayedShort || isSlowBall || weakReturnBoost > 0.12 || oppDepth > 0.58)
    && Math.random() < (player.prefs?.netGame === 'PROACTIVE' ? 0.18 : player.prefs?.netGame === 'HUNTER' ? 0.32 : 0.06);

  const hunterCommitWindow = isHunter
    && playerInside
    && !playerDefending
    && netSkillGate
    && (ctx.transitionCooldown ?? 0) <= 0
    && effectiveQuality >= 0.48
    && shotFit >= 0.34
    && (approachIntent || attacking || clearWindow);

  if (committedBlueprintApproach) {
    triggerNetTransition(gs, player, shot, clamp(shotFit * 0.45 + effectiveQuality * 0.55, 0.50, 1), 'plano concreto de rede');
    return;
  }

  if (!player.atNet
      && ctx.courtMode === 'BASE'
      && (ctx.transitionCooldown ?? 0) <= 0
      && (readyToTransition || committedBlueprintApproach || chaosNetWindow || hunterCommitWindow)
      && ((ctx.netIntent ?? 0) >= profile.threshold || (approachIntent && (readyToTransition || committedBlueprintApproach)) || chaosNetWindow || hunterCommitWindow)) {
    const reason =
      source === 'weak_return' ? ' (saque + resposta fraca)' :
      source === 'short_ball'  ? ' (bola curta)' :
      source === 'slow_ball'   ? ' (bola lenta)' :
      source === 'approach_plan' ? ' (plano de rede)' :
      source === 'pressure'    ? ' (pressão construída)' :
      '';
    triggerNetTransition(gs, player, shot, clamp((Math.max(shotFit, chaosNetWindow ? 0.68 : 0) * 0.45) + (effectiveQuality * 0.55), 0.50, 1), reason.replace(/[()]/g, '').trim() || 'pressao construida');
  }
}
