import { COURT, PHYSICS, TIMING, THRESHOLDS, PLAYER_CFG, STAMINA, INERTIA, GameState, SCORE_LABELS } from './core/constants.js';
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
import { getEffectiveAttrs } from './systems/coaches/CoachArchetypes.js';
import { initEnvironment, updateEnvironment } from './systems/environment/EnvironmentSystem.js';
// MatchParticles removido â€” NEWME1.0 usa sistema prÃ³prio de partÃ­culas
import { initCourtMarks, addCourtMark, pruneOldMarks } from './ui/pixel/CourtRenderer.js';
import { initHeat, updateHeat } from './systems/analytics/MatchHeat.js';
import { rollInMatchInjury, decideMTOOutcome, applyInMatchPenalty, applyProgressiveDegradation, buildInMatchInjuryEvent, IN_MATCH_SEVERITY } from './systems/health/InjurySystem.js';
import { applySurfaceTalentToAttrs, derivePlayerTalentTrees } from './systems/progression/arvoredetalentos.jsx';
import { initLiveMatchAudit, auditRegisterHitGate, auditRegisterShot, auditRegisterBounce, auditRegisterPointEnd, buildLiveAuditSnapshot } from './systems/audit/liveMatchAudit.js';


function _getTiebreakTarget(gs) {
  return gs?.matchFormat === 'SUPER_TB_10' ? (gs?.superTiebreakTarget ?? 10) : 7;
}

function _isMatchTiebreakOnly(gs) {
  return gs?.matchFormat === 'SUPER_TB_10';
}

function _canPlayerWinGameNow(gs, playerId) {
  const player = gs.players[playerId];
  const opp = gs.players[1 - playerId];
  if (gs.inTiebreak) {
    const target = _getTiebreakTarget(gs);
    return gs.tbScore[playerId] >= (target - 1) && (gs.tbScore[playerId] - gs.tbScore[1 - playerId]) >= 1;
  }
  if (player.score === 4) return true; // vantagem
  return player.score === 3 && opp.score <= 2; // 40-0/15/30
}

function _canPlayerWinSetNow(gs, playerId) {
  const player = gs.players[playerId];
  const opp = gs.players[1 - playerId];
  if (!_canPlayerWinGameNow(gs, playerId)) return false;
  if (gs.inTiebreak) return true;
  const nextGames = player.games + 1;
  return nextGames >= 6 && (nextGames - opp.games) >= 2;
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

// â”€â”€ Trait system integration helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Contextos de idade e carreira â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // O objeto `player` em gs jÃ¡ Ã© o NAMED_PLAYERS entry completo (com .age,
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

  // Itera por slot (nÃ£o por contexto) para evitar double-count
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

// â”€â”€ Factory helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// FASE 3 â€” converte courtKey para superfÃ­cie normalizada usada em recentForm/matchPlan
function _courtKeyToSurface(courtKey = '') {
  const k = courtKey.toUpperCase();
  if (k.includes('CLAY') || k.includes('ROLAND') || k.includes('MONTECARLO')) return 'clay';
  if (k.includes('GRASS') || k.includes('WIMBLEDON') || k.includes('QUEENS'))  return 'grass';
  if (k.includes('INDOOR') || k.includes('ATP_FINALS') || k.includes('PARIS')) return 'indoor';
  return 'hard';
}

function getStaminaResistanceDrainMult(player) {
  const resPct = (player?.attrs?.resistencia ?? 70) / 100;
  const treeMult = player?._surfaceTalentFx?.staminaDrainMult ?? 1;
  return clamp((1.22 - resPct * 0.44) * treeMult, 0.68, 1.10);
}

function getStaminaResistanceRecoveryMult(player) {
  const resPct = (player?.attrs?.resistencia ?? 70) / 100;
  const treeMult = player?._surfaceTalentFx?.physicalRecoveryMult ?? 1;
  return clamp((0.78 + resPct * 0.44) * treeMult, 0.86, 1.32);
}

function recoverPlayerStamina(player, baseAmount) {
  const current = clamp(player?.stamina ?? 1.0, 0, 1);
  const fatigueNeedMult = 0.70 + (1 - current) * 0.60;
  const recAmount = baseAmount * getStaminaResistanceRecoveryMult(player) * fatigueNeedMult;
  player.stamina = Math.min(1.0, current + recAmount);
}

function classifyShotError(gs, hitter) {
  if (!hitter || hitter._forceUE) return 'UE';
  return 'UE';
}

function recordShotError(gs, hitter) {
  if (!hitter) return;
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
}

function isDecisiveWinnerShot(gs, hitter, defender, meta = {}) {
  return false;
}

export function createStats() {
  return {
    aces: 0, doubleFaults: 0,
    serve1In: 0, serve1Total: 0, serve1AvgKmh: 0,
    serve2In: 0, serve2Total: 0, serve2AvgKmh: 0,
    winners: 0, unforcedErrors: 0, forcedErrors: 0,
    netApproaches: 0, netPointsWon: 0,
    rallyLengths: [],
    byType: {}, pointWinsByType: {},
    byTypeQSum: {}, byTypeQCnt: {},
    byTypeKmhSum: {}, byTypeKmhCnt: {},
    // â”€â”€ Serve / Return analytics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Pontos ganhos/perdidos quando este jogador estÃ¡ sacando ou recebendo
    pointsWonServing: 0,   pointsLostServing: 0,
    pointsWonReturning: 0, pointsLostReturning: 0,
    // Pontos por tipo de saque em jogo (1Âº vs 2Âº)
    serve1WonPoints: 0,  serve1LostPoints: 0,
    serve2WonPoints: 0,  serve2LostPoints: 0,
    // Games hold/break
    gamesServed: 0,    // total de games em que este jogador sacou
    gamesHeld: 0,      // games ganhos sacando (hold)
    gamesReturned: 0,  // total de games em que este jogador recebeu
    gamesConverted: 0, // breaks convertidos (ganhou recebendo)
    // Log por ponto para grÃ¡ficos (max 300 pontos)
    serveLog: [], // { kmh, physType, dir, isFirst, won, isAce, pointNum }
    // Quality mÃ©dia de rally
    qualitySum: 0, qualityCount: 0,
    // â”€â”€ Individual Rating (TDI-inspired) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // In Attack: golpes batidos em fase ofensiva (ATTACK)
    attackShots: 0,
    // Defense / Steal: golpes batidos em fase defensiva (DEFEND)
    defenseShots: 0,
    // Conversion: pontos jogados/ganhos quando em fase de ataque no Ãºltimo golpe
    attackPointsPlayed: 0, attackPointsWon: 0,
    // Steal: pontos jogados/ganhos quando em fase defensiva no Ãºltimo golpe
    defensePointsPlayed: 0, defensePointsWon: 0,
  };
}

export function createBall() {
  return { pos: v3(0,0,0.5), vel: v3(0,0,0), spin: v3(0,0,0),
           inFlight: false, bounceCount: 0, lastHitBy: -1, lastBounceSide: 0, outGraceTimer: 0 };
}

export function createPlayer(id, side, name, color, styleId, namedPlayerKey) {
  const named = namedPlayerKey ? NAMED_PLAYERS[namedPlayerKey] : null;
  const rawAttrs = named ? named.attrs : null;
  // FIX: migra jogadores com schema antigo (28 attrs) para v3 (14 attrs) antes de computar mods.
  // Sem isso, attrs como controle, potencia, agressividade ficam undefined â†’ fallback 50 â†’ todos
  // os jogadores legados ficam iguais (nenhuma fraqueza, nenhuma forÃ§a real).
  const migratedAttrs = rawAttrs ? migrateAttrsToV3(rawAttrs) : null;
  // Aplica bÃ´nus ativo do arquÃ©tipo do tÃ©cnico (some se o tÃ©cnico sair)
  const attrs  = migratedAttrs ? getEffectiveAttrs(migratedAttrs, named?.coach ?? null) : null;
  const mods   = attrs  ? computePlayerMods(attrs) : null;
  // Phase 1: styleData is now cosmetic only â€” engine reads attrs+prefs (Phase 3)
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

  return {
    id, side, name, color, styleId, styleData,
    namedPlayerKey, attrs, mods,
    // Signature: golpe assinatura permanente do jogador
    naturalSignature: null,
    rallyPattern: null,
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
    // â”€â”€ Position heatmap: 12 cols Ã— 16 rows, player's half-court â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // X: â€“singlesW/2 â†’ +singlesW/2 (8.23 m total)
    // Y (depth): 0 (net) â†’ halfL (11.885 m, baseline). Stored as absolute |Y|.
    _heatGrid: new Uint16Array(12 * 16),
    _heatTick: 0,
    ctx: createCtx(), stats: createStats(),
    // Coach: propaga dados do jogador do universo para o motor de jogo.
    // coach contÃ©m { coachId, philosophy, ... } â€” lido pelo sistema de changeover em headless.
    // _coachInstructions comeÃ§a vazio e Ã© populado no primeiro changeover.
    coach: named?.coach ?? null,
    _coachInstructions: named?._coachInstructions ?? [],
    // â”€â”€ Player prefs â€” prefs do jogador (Fase 2/3) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // prefs baked na ficha tÃªm prioridade; fallback gera dos attrs.
    prefs: named?.prefs ?? (attrs ? generatePrefs(attrs) : null),
    surfaceStats: named?.surfaceStats ?? null,
    surfaceIdentity: named?.surfaceIdentity ?? null,
    recentForm: named?.recentForm ?? null,
    _talentTrees: derivePlayerTalentTrees(named ?? { attrs: migratedAttrs ?? rawAttrs ?? {}, prefs: named?.prefs ?? null, surfaceStats: named?.surfaceStats ?? null, surfaceIdentity: named?.surfaceIdentity ?? null, recentForm: named?.recentForm ?? null }),
    // Shot engine offline: sem formaDoDia ou decisao antiga de golpes
    _formaDoDia: undefined,
    // Visual DNA: injury e traits para diferenciaÃ§Ã£o visual no canvas
    injury: named?.injury ?? null,
    dna:    named?.dna    ?? null,
    // FASE 3 â€” Match Plan: gerado em initGameState apÃ³s criar ambos os jogadores.
    // ContÃ©m { directives, confidence, notes, _scout } â€” lido por CoachInfluencer.
    _matchPlan: null,
  };
}

// â”€â”€ Tech Log helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const _f2  = n => (typeof n === 'number' ? (n >= 0 ? ' ' : '') + n.toFixed(2) : '   ???');
const _f1  = n => (typeof n === 'number' ? (n >= 0 ? ' ' : '') + n.toFixed(1) : '  ???');
const _fi  = n => String(Math.round(n ?? 0)).padStart(4);
const _pct = n => String(Math.round((n ?? 0) * 100)).padStart(3) + '%';
const _pad = (s, w) => String(s).padStart(w);

function techPt(gs) {
  // flush current point buffer into techLog
  const p0 = gs.players[0], p1 = gs.players[1];
  gs._techPtNum = (gs._techPtNum || 0) + 1;
  const bar = 'â•'.repeat(62);
  const hdr = [
    bar,
    `PONTO #${_pad(gs._techPtNum, 3)} â”‚ Set ${p0.sets}-${p1.sets} â”‚ Game ${_pad(p0.games,2)}-${_pad(p1.games,2)} â”‚ Score ${SCORE_LABELS[p0.score]}-${SCORE_LABELS[p1.score]}`,
    `Servidor: ${gs.players[gs.server].name} â”‚ Rally mÃ¡x atÃ© aqui: ${gs.maxRally}`,
    bar,
  ].join('\n');
  gs.techLog.push(hdr);
  for (const line of gs._ptBuf) gs.techLog.push(line);
}

function techEnd(gs, winnerIdx, reason) {
  const w = gs.players[winnerIdx];
  gs.techLog.push(`[FIM] â–¶ ${w.name} vence | ${reason} | rally=${gs.rally}`);
  gs.techLog.push('');
  gs._ptBuf = [];
}

function pushTech(gs, line) {
  if (!gs._ptBuf) gs._ptBuf = [];
  gs._ptBuf.push(line);
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
    bounceLog: [],  // {x, y, type:'rally'|'winner'|'out', player:0|1, eventType}
    pointHistory: [], // [{winner:0|1, reason, rally}] â€” Ãºltimos 20 pontos para RunStrip
    stateTimer: 0, isFirstBounce: true, serveBounced: false,
    serveLeft: true, lastPointReason: null,
    receiverTouched: false, lastServeFirst: true,
    vfxQueue: [], pendingFlash: null, pendingScreenFx: null, lastBouncePos: null,
    // â”€â”€ Court data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    courtKey,
    courtMeta:    court.meta,
    courtVisual,
    courtPhysics,
    courtMods,    // winnerMod, ueRiskMod, rallyLengthMult, serveBonus, staminaDecayMult, etc.
    isSlam:       false, // injetado por UniverseManager/Headless quando Ã© Grand Slam
    // â”€â”€ Crowd Pressure â€” energia da arena â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Calculado apÃ³s isSlam + rivalryData serem injetados externamente.
    // Inicializado aqui como 0; Headless/UniverseManager atualiza antes do primeiro ponto.
    // Escala 0.0â€“1.0: 0 = ATP 250 R1, 1.0 = GS Final entre rivais histÃ³ricos.
    crowdPressure: 0,
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    log: [
      'âš¡ Motor v7 Â· Stats + VFX + Sound',
      `ðŸ…° ${nameA}`,
      `ðŸ…± ${nameB}`,
      `ðŸŽ¾ ${court.meta.icon} ${court.meta.name} â€” ${court.meta.label}`,
    ],
    techLog: [
      `TENNIX Â· LOG TÃ‰CNICO`,
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
    inTiebreak: isSuperTiebreakOnly,                   // true quando o game atual Ã© um tiebreak
    tbScore: [0, 0],                     // pontuaÃ§Ã£o do tiebreak [p0, p1]
    tbServer: 0,                         // quem serve no tiebreak
    tbPointsPlayed: 0,                   // total de pontos jogados no TB (para troca de saque)
  };
  gs._bounce = onBounce;
  initEnvironment(gs);
  initLiveMatchAudit(gs);
  gs.liveAuditSnap = buildLiveAuditSnapshot(gs);
  initCourtMarks(gs);
  // â”€â”€ Match Heat Temperature â”€â”€
  initHeat(gs);
  // FASE 3 â€” Gerar match plans prÃ©-partida para ambos os jogadores.
  // rivalSystem Ã© opcional: pode ser passado diretamente por TournamentSystem/Headless.
  // surface derivada de courtKey: 'clay' para clay, 'grass' para grass, 'indoor' para indoor, 'hard' para resto.
  const _surface3 = _courtKeyToSurface(courtKey);
  initMatchPlans(gs.players[0], gs.players[1], _surface3, rivalSystem);

  // FASE 2 â€” Inicializar confianÃ§a contextual e pre-calcular formModifiers para cada jogador.
  // surface uppercase para compatibilidade com CALENDAR (ex: 'CLAY', 'HARD').
  const _surfaceUpper = _surface3.toUpperCase();
  for (let i = 0; i < 2; i++) {
    const p   = gs.players[i];
    const opp = gs.players[1 - i];
    const talentApplied = applySurfaceTalentToAttrs(p.attrs ?? {}, p, _surfaceUpper);
    p.attrs = talentApplied.attrs;
    p.mods = computePlayerMods(p.attrs);
    p._surfaceTalentFx = talentApplied.effects;
    initContextConf(p, opp, _surfaceUpper, rivalSystem);
    // Cache dos modificadores de forma para uso em tryHit e serving
    p._formMods = getFormModifiers(p, _surfaceUpper);
    p._formMods = {
      ...(p._formMods ?? {}),
      qualityMod: (p._formMods?.qualityMod ?? 1.0) * (talentApplied.effects?.qualityMult ?? 1) * (talentApplied.effects?.buildPressureMult ?? 1),
      qualityFlat: (p._formMods?.qualityFlat ?? 0) + (talentApplied.effects?.qualityFlat ?? 0) + (talentApplied.effects?.buildPressureFlat ?? 0),
    };

    // ATRIBUTO regularidade â†’ matchDayVar
    // regularidade baixa = alta chance de dia ruim (-3% a -12%) ou dia incrÃ­vel (+1% a +8%)
    // regularidade alta = variaÃ§Ã£o mÃ­nima (mÃ¡quina â€” sempre entrega o esperado)
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
  // â”€â”€ Trace: inicializar e comeÃ§ar primeiro ponto â”€â”€
  traceStartPoint(gs);
  return gs;
}

// â”€â”€ Crowd Pressure â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/**
 * Calcula o fator de pressÃ£o da arena para uma partida.
 * Deve ser chamado pelo Headless/UniverseManager apÃ³s definir gs.isSlam
 * e antes do primeiro gameTick.
 *
 * @param {object} gs           â€” game state (com isSlam jÃ¡ definido)
 * @param {string} category     â€” 'GRAND_SLAM' | 'MASTERS_1000' | 'ATP_500' | 'ATP_250' | ...
 * @param {string} round        â€” 'F' | 'SF' | 'QF' | 'R16' | ...
 * @param {object|null} rivalry â€” rivalidade entre os dois jogadores (do RivalrySystem)
 * @returns {number} crowdPressure 0.0â€“1.0
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

  // BÃ´nus por rodada
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

// â”€â”€ Scoring â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function assignPoint(gs, winnerIdx, reason) {
  const w = gs.players[winnerIdx], l = gs.players[1 - winnerIdx];
  gs.totalPoints++;
  gs.log.push(`â—‰ ${reason}`);

  // â”€â”€ TIEBREAK MODE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (gs.inTiebreak) {
    gs.tbScore[winnerIdx]++;
    gs.tbPointsPlayed++;
    const tbW = gs.tbScore[winnerIdx];
    const tbL = gs.tbScore[1 - winnerIdx];
    const tbTarget = _getTiebreakTarget(gs);

    gs.log.push(`ðŸ”¢ TB ${gs.tbScore[0]}â€“${gs.tbScore[1]}`);

    // Troca de saque: apÃ³s 1Âº ponto, depois a cada 2 pontos
    if (gs.tbPointsPlayed === 1 || (gs.tbPointsPlayed > 1 && (gs.tbPointsPlayed - 1) % 2 === 0)) {
      gs.server   = 1 - gs.server;
      gs.receiver = 1 - gs.server;
      gs.players[gs.server].faults = 0;
    }

    // â”€â”€ Changeover no tiebreak: a cada 6 pontos jogados (regra ATP) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // RecuperaÃ§Ã£o menor que um game normal â€” pausa Ã© apenas para trocar de lado.
    if (gs.tbPointsPlayed % 6 === 0) {
      for (const p of gs.players)
        recoverPlayerStamina(p, (STAMINA.recoveryPerGame ?? 0.08) * 0.5);
    }

    // Vence o TB: â‰¥7 pontos com diferenÃ§a â‰¥2
    if (tbW >= tbTarget && tbW - tbL >= 2) {
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
      // TB conta como 7-6 no histÃ³rico
      w.setsHistory = [...(w.setsHistory || []), 7];
      l.setsHistory = [...(l.setsHistory || []), 6];
      w.sets++; w.games = 0; l.games = 0;
      // â”€â”€ Contabiliza tiebreak ganho para sombra de trait â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      w.stats.tiebreaksWon = (w.stats.tiebreaksWon ?? 0) + 1;
      // FASE 3: atualiza confianÃ§a contextual de tiebreak intra-partida
      updateTiebreakConf(w, true);
      updateTiebreakConf(l, false);
      gs.inTiebreak = false; gs.tbScore = [0, 0]; gs.tbPointsPlayed = 0;
      gs.log.push(`ðŸ† TIEBREAK â†’ ${w.name} venceu o set (${gs.players[0].sets}â€“${gs.players[1].sets})`);

      // â”€â”€ RecuperaÃ§Ã£o de set apÃ³s tiebreak â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      for (const p of gs.players)
        recoverPlayerStamina(p, STAMINA.recoveryPerSet);

      if (w.sets >= gs.setsToWin) {
        gs.gameState = GameState.GAME_OVER;
        gs.log.push(`ðŸŽ¾ PARTIDA: ${w.name} VENCEU!`);
        return;
      }
      // Regra ITF: quem recebeu o 1Âº ponto do TB serve no prÃ³ximo set
      gs.server   = 1 - gs.tbServer;
      gs.receiver = gs.tbServer;
      gs.players[gs.server].faults = 0;
    }
    return;
  }

  // â”€â”€ PONTUAÃ‡ÃƒO NORMAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const ws = w.score, ls = l.score;

  if (ws === 3 && ls === 3) {
    // Deuce â†’ Advantage
    w.score = 4;
  } else if (ws === 4) {
    // Advantage â†’ Game
    _gameWon(gs, winnerIdx);
  } else if (ls === 4) {
    // Oponente tinha Advantage â†’ volta ao Deuce
    w.score = 3; l.score = 3;
  } else if (ws === 3 && ls < 3) {
    // 40-X: game direto
    _gameWon(gs, winnerIdx);
  } else {
    w.score++;
  }
}

// â”€â”€ Game ganho â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function _gameWon(gs, winnerIdx) {
  const w = gs.players[winnerIdx], l = gs.players[1 - winnerIdx];
  w.games++; w.score = 0; l.score = 0;
  gs.log.push(`ðŸŽ® Game â†’ ${w.name} (${gs.players[0].games}â€“${gs.players[1].games})`);

  // â”€â”€ Reset signature cooldown â€” mÃ¡x 1 por GAME, nÃ£o por partida inteira â”€â”€
  for (const p of gs.players) {
  }

  // â”€â”€ RecuperaÃ§Ã£o de stamina no game change (changeover ~90s) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // RECUPERACAO_FISICA (betweenSets) multiplica a recuperaÃ§Ã£o individual.
  for (const p of gs.players) {
    const rFx = getUnifiedPlayerTraitFx(p, gs);
    // staminaMult de contexto 'betweenSets' â€” aplicado apenas se trait tem esse contexto
    // Aqui aplicamos diretamente via getTraitEffects com contexto betweenSets
    const betweenFx = getTraitEffects(p, { type: 'betweenSets' });
    const recMult = betweenFx.staminaMult > 0 ? betweenFx.staminaMult : 1.0;
    const recAmt = (STAMINA.recoveryPerGame ?? 0.08) * recMult;
    recoverPlayerStamina(p, recAmt);
  }

  // â”€â”€ DegradaÃ§Ã£o progressiva de lesÃ£o em campo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  for (const p of gs.players) {
    if (p._inMatchInjury) applyProgressiveDegradation(p);
  }

  // â”€â”€ Hold / Break tracking â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ FASE 5: Decrementar duraÃ§Ã£o das instruÃ§Ãµes do tÃ©cnico â”€â”€â”€â”€â”€
  // _coachInstructions diminui durationGames a cada game; expiraÃ§Ãµes sÃ£o removidas.
  for (const p of gs.players) {
    if (p._coachInstructions && p._coachInstructions.length > 0) {
      p._coachInstructions = p._coachInstructions
        .map(inst => ({ ...inst, durationGames: (inst.durationGames ?? 1) - 1 }))
        .filter(inst => inst.durationGames > 0);
    }
    if (p._adaptacaoBoost != null) {
      const adaptacaoFactor = p.mods?.adaptacaoFactor ?? ((p.attrs?.adaptacao ?? 60) / 100);
      p._adaptacaoBoost *= (0.85 + adaptacaoFactor * 0.12);
      if (Math.abs(p._adaptacaoBoost) < 0.005) p._adaptacaoBoost = 0;
    }
  }

  // â”€â”€ FASE 5: Sinalizar changeover para o componente de partida â”€
  // gs._pendingCoachChangeover = true indica que o componente deve
  // chamar runChangeover() neste changeover (a cada 2 games ou fim de set).
  const totalGames = w.games + l.games; // apÃ³s incremento w.games
  if (totalGames % 2 === 0 || (w.games === 0 && l.games === 0)) {
    gs._pendingCoachChangeover = true;
  }

  const wG = w.games, lG = l.games;

  // Set normal: â‰¥6 games com diferenÃ§a â‰¥2
  if (wG >= 6 && wG - lG >= 2) {
    _setWon(gs, winnerIdx);
    return;
  }

  // Tiebreak: 6-6
  if (wG === 6 && lG === 6) {
    gs.inTiebreak = true;
    gs.tbScore = [0, 0];
    gs.tbPointsPlayed = 0;
    gs.tbServer = gs.server; // registra quem serve o 1Âº ponto do TB
    gs.log.push(`âš¡ TIEBREAK! | Games 6â€“6`);
    gs.players[gs.server].faults = 0;
    return;
  }

  // Set ainda em curso â€” troca saque
  gs.server   = 1 - gs.server;
  gs.receiver = 1 - gs.server;
  gs.players[gs.server].faults = 0;
}

// â”€â”€ Set ganho â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function _setWon(gs, winnerIdx) {
  const w = gs.players[winnerIdx], l = gs.players[1 - winnerIdx];
  w.setsHistory = [...(w.setsHistory || []), w.games];
  l.setsHistory = [...(l.setsHistory || []), l.games];
  w.sets++; w.games = 0; l.games = 0;
  gs.log.push(`ðŸ† SET â†’ ${w.name} (${gs.players[0].sets}â€“${gs.players[1].sets})`);

  // â”€â”€ FASE 1.2 â€” Ajuste tÃ¡tico entre sets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Cada jogador analisa o que funcionou/nÃ£o funcionou e prepara um plano de curto prazo.
  // Executado antes da recuperaÃ§Ã£o de stamina para ter _matchRead ainda fresco.
  for (let i = 0; i < gs.players.length; i++) {
    applySetAdjustment(gs.players[i], gs.players[1 - i]);
  }

  // â”€â”€ v4: recoveryBoost â€” o set perdedor tenta se recuperar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // recuperacao alta = mais chance de ressurgir (Djokovic do 0-2)
  // recuperacao baixa = tende a espiral mental
  const loserIdx = 1 - winnerIdx;
  const lostPlayer = gs.players[loserIdx];
  if (lostPlayer.attrs) {
    const recup = lostPlayer.attrs.recuperacao ?? lostPlayer.attrs.mentalidade ?? 70;
    const boost = recoveryBoost(recup);
    if (boost !== 0) {
      // Aplica o delta de recuperaÃ§Ã£o como modificador temporÃ¡rio de _formMods
      lostPlayer._formMods = lostPlayer._formMods ?? {};
      lostPlayer._formMods.qualityMod = ((lostPlayer._formMods.qualityMod ?? 1.0) + boost);
      if (boost > 0) {
        gs.log.push(`ðŸ’ª ${lostPlayer.name} se recobrou (recuperaÃ§Ã£o ${recup})`);
      }
    }
  }

  // â”€â”€ v4: adaptacao â€” o set perdedor pode mudar o game plan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // adaptacao alta = a instruÃ§Ã£o do tÃ©cnico no changeover tem mais peso
  // (o prÃ³prio applySetAdjustment jÃ¡ usa _matchRead; aqui sÃ³ sinalizamos)
  if (lostPlayer.attrs) {
    const adaptacao = lostPlayer.attrs.adaptacao ?? 65;
    const rawBoost = (adaptacao - 50) / 100 * 0.55;
    lostPlayer._adaptacaoBoost = adaptacao >= 50 ? rawBoost : rawBoost * 0.40;
  }

  recoverMomentumBetweenSets(gs, winnerIdx);

  // â”€â”€ RecuperaÃ§Ã£o adicional entre sets (~2 min) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // RECUPERACAO_FISICA (betweenSets) aplicado tambÃ©m aqui.
  for (const p of gs.players) {
    const betweenFx = getTraitEffects(p, { type: 'betweenSets' });
    const recMult = betweenFx.staminaMult > 0 ? betweenFx.staminaMult : 1.0;
    const recAmt = (STAMINA.recoveryPerSet ?? 0.20) * recMult;
    recoverPlayerStamina(p, recAmt);
  }

  if (w.sets >= (gs.setsToWin ?? 2)) {
    gs.gameState = GameState.GAME_OVER;
    gs.log.push(`ðŸŽ¾ PARTIDA: ${w.name} VENCEU!`);
    return;
  }
  gs.server   = 1 - gs.server;
  gs.receiver = 1 - gs.server;
  gs.players[gs.server].faults = 0;
}

export function resolvePoint(gs, winnerIdx, reason, isWinner = false) {
  if (gs.gameState === GameState.POINT_END || gs.gameState === GameState.GAME_OVER) return;
  const w = gs.players[winnerIdx], l = gs.players[1 - winnerIdx];
  const pointState = _getPointPressureState(gs);
  const wasDeuce = !gs.inTiebreak &&
    ((gs.players[0].pointsName === '40' && gs.players[1].pointsName === '40') ||
     gs.players[0].pointsName === 'Ad' || gs.players[1].pointsName === 'Ad');
  var isAce = isWinner && winnerIdx === gs.server
           && !gs.receiverTouched && gs.serveBounced && gs.rally <= 1;
  var displayReason = isAce ? `ACE ${w.name}` : reason;
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

  // â”€â”€ Point history: Ãºltimos 20 pontos para RunStrip no HUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!gs.pointHistory) gs.pointHistory = [];
  gs.pointHistory.push({ winner: winnerIdx, reason: displayReason, rally: gs.rally ?? 0, eventType: 'POINT_END' });
  if (gs.pointHistory.length > 20) gs.pointHistory.shift();
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

  // â”€â”€ Match Point Saved stat (para sombra de trait) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // "Salvar" = adversÃ¡rio tinha match point, mas o ponto foi ganho por gs.players[winnerIdx]
  {
    if (pointState[1 - winnerIdx].isMatchPoint) {
      w.stats.matchPointsSaved = (w.stats.matchPointsSaved ?? 0) + 1;
    }
  }

  // Detect ACE
  if (isAce) { w.stats.aces++; gs.log.push(`âš¡ ACE! ${w.name}`); }
  displayReason = isAce ? `ACE ${w.name}` : reason;
  if (!isAce && isWinner) w.stats.winners++;
  if (displayReason.includes('DUPLA FALTA')) l.stats.doubleFaults++;
  if (w.atNet) w.stats.netPointsWon++;

  // â”€â”€ Individual Rating: Conversion & Steal tracking â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Baseado no Ãºltimo estado tÃ¡tico de cada jogador no ponto
  const wState = w._tacticalState ?? 'NEUTRAL';
  const lState = l._tacticalState ?? 'NEUTRAL';
  if (wState === 'ATTACK') { w.stats.attackPointsPlayed++; w.stats.attackPointsWon++; }
  if (lState === 'ATTACK') { l.stats.attackPointsPlayed++; } // estava atacando mas perdeu
  if (wState === 'DEFEND') { w.stats.defensePointsPlayed++; w.stats.defensePointsWon++; } // steal!
  if (lState === 'DEFEND') { l.stats.defensePointsPlayed++; }

  // â”€â”€ Match Heat Temperature â€” contexto pre-resoluÃ§Ã£o â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    const loserHadMP2 = pointState[1 - winnerIdx].isMatchPoint;
    const receiverHadBP = pointState[gs.receiver].isBreakPoint;
    const wasDeuce = !gs.inTiebreak &&
      gs.players[0].score >= 3 && gs.players[1].score >= 3 &&
      gs.players[0].score === gs.players[1].score;
    updateHeat(gs, winnerIdx, isWinner, isAce, {
      isDoubleFault:      displayReason.includes('DUPLA FALTA'),
      wasMatchPointSaved: loserHadMP2,
      wasBreakPointSaved: receiverHadBP && winnerIdx === gs.server,
      wasDeuce:           wasDeuce,
    });
  }

  // â”€â”€ Serve / Return point tracking â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  // Por tipo de saque (1Âº ou 2Âº estava em jogo)
  const pd = gs._pendingServeData;
  if (pd && gs.serveBounced) {  // saque entrou â€” contar por tipo
    if (pd.isFirst) {
      if (serverWon) srvP.stats.serve1WonPoints++; else srvP.stats.serve1LostPoints++;
    } else {
      if (serverWon) srvP.stats.serve2WonPoints++; else srvP.stats.serve2LostPoints++;
    }
    // Log para grÃ¡ficos (limitar a 300 pontos)
    if (srvP.stats.serveLog.length < 300) {
      srvP.stats.serveLog.push({
        kmh:      pd.kmh,
        physType: pd.physType,
        dir:      pd.dir,
        isFirst:  pd.isFirst,
        won:      serverWon,
        isAce,
        pointNum: pd.pointNum,
      });
    }
    // NOTA: NÃƒO zerar aqui â€” traceEndPoint (chamado abaixo) ainda precisa de _pendingServeData
    // para registrar kmh/physType/dir no trace do ponto. SerÃ¡ zerado apÃ³s o trace.
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
  // ImportÃ¢ncia do ponto para cada jogador ANTES de assignPoint (placar ainda atual).
  const _wScoreCtx = _computeScoreImportance(w, gs);
  const _lScoreCtx = _computeScoreImportance(l, gs);
  const _receiverHadBP = pointState[gs.receiver].isBreakPoint;
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

  // â”€â”€ Trace: encerrar ponto â”€â”€
  traceEndPoint(gs, winnerIdx, displayReason, isWinner);
  gs._pendingServeData = null; // limpar APÃ“S o trace ter lido os dados do saque
  // â”€â”€ Flush tech log for this point â”€â”€
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

  // â”€â”€ Verificar lesÃ£o em campo (apenas se a partida nÃ£o acabou) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (gs.gameState !== GameState.GAME_OVER) {
    checkInMatchInjury(gs);
  }

  scheduleNextPoint(gs);
}

// â”€â”€ Verifica lesÃ£o em campo apÃ³s o ponto â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function checkInMatchInjury(gs) {
  if (gs.gameState === GameState.GAME_OVER) return;
  if (gs._pendingMTO) return; // jÃ¡ tem MTO pendente

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

    gs.log.push(`ðŸš‘ [MTO] ${p.name} â€” ${result.type} (${result.severity})`);
    break; // sÃ³ um MTO por ponto
  }
}

function scheduleNextPoint(gs) {
  setTimeout(() => {
    if (gs.gameState === GameState.GAME_OVER) return;

    // â”€â”€ MTO pendente: vai para MEDICAL_TIMEOUT em vez de PRE_SERVE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    gs.players[gs.server].faults = 0;
    gs.ball = createBall();
    gs.lastBouncePos = null;  // reset para nÃ£o contaminar o prÃ³ximo ponto
    gs.gameState = GameState.PRE_SERVE; gs.stateTimer = 0;
    gs.isFirstBounce = true; gs.receiverTouched = false;
    for (const p of gs.players) {
      p.atNet = false;
      // Resetar basePos para a baseline correta antes de posicionar
      // Evita que jogadores que estavam na rede reapareÃ§am no meio da quadra
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
    // Marca qual jogador Ã© o sacador neste ponto â€” usado para distinguir isReturn do sacador
    gs.players[gs.server].ctx._isServer = true;
    gs.players[gs.receiver].ctx._isServer = false;
    // â”€â”€ Trace: iniciar novo ponto â”€â”€
    traceStartPoint(gs);
  }, TIMING.pointPauseMs);
}

// â”€â”€ Bounce callback (assigned to gs._bounce) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function onBounce(gs) {
  const ball = gs.ball;
  gs.totalBounces = (gs.totalBounces || 0) + 1;
  const bounceClass = 'BALL_BOUNCE';
  const shotMetaForBounce = ball._lastShotMeta ? { ...ball._lastShotMeta } : null;

  // Track which side of the court the ball bounced on
  ball.lastBounceSide = Math.sign(ball.pos.y);
  // Salva posiÃ§Ã£o exata do quique para resolveOutOfBounds poder verificar se foi dentro
  gs.lastBouncePos = { x: ball.pos.x, y: ball.pos.y };

  // â”€â”€ Particles & court marks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  addCourtMark(gs, ball, bounceClass);

  playSound('BOUNCE');

  // â”€â”€ BounceLog: acumula todos os quiques para mapa pÃ³s-partida â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!gs.bounceLog) gs.bounceLog = [];
  gs.bounceLog.push({
    x: ball.pos.x,
    y: ball.pos.y,
    type: 'rally',   // serÃ¡ atualizado para 'winner' ou 'out' em resolvePoint/resolveOutOfBounds
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
  // â”€â”€ Trace: registrar quique real â”€â”€
  traceLogOutcome(gs, ball.pos.x, ball.pos.y, null);

  // â”€â”€ Tech log: quique â”€â”€
  // Log delta do saque no 1Âº quique para validaÃ§Ã£o do solver
  if (gs.isFirstBounce && ball.lastHitBy === gs.server && ball._serveTargetY !== undefined) {
    const deltaY = (ball.pos.y - ball._serveTargetY).toFixed(2);
    pushTech(gs,
      `[QB${_pad(ball.bounceCount,2)}] QUIQUE â”‚ pos(x=${_f2(ball.pos.x)}, y=${_f2(ball.pos.y)}) â”‚ vel_saÃ­da(x=${_f2(ball.vel.x)}, y=${_f2(ball.vel.y)}, z=${_f2(ball.vel.z)}) â”‚ Î”Y=${deltaY}m`
    );
  } else {
    const _solverTag = (ball._solverErr ?? 0) > 2.0 ? ` âš SOLVER_ERR:${ball._solverErr?.toFixed(2)}m` : '';
    pushTech(gs,
      `[QB${_pad(ball.bounceCount,2)}] QUIQUE â”‚ pos(x=${_f2(ball.pos.x)}, y=${_f2(ball.pos.y)}) â”‚ vel_saÃ­da(x=${_f2(ball.vel.x)}, y=${_f2(ball.vel.y)}, z=${_f2(ball.vel.z)})${_solverTag}`
    );
  }

  if (gs.isFirstBounce && ball.lastHitBy === gs.server) {
    gs.isFirstBounce = false;
    const server = gs.players[gs.server];
    if (ball._serveNetTouched && checkServiceBox(ball, server.side, gs.serveLeft)) {
      gs.log.push(`ðŸ” LET ${server.name} â€” saque repetido`);
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
        gs.log.push(`âš  FALTA 1 ${server.name}`);
        gs.gameState = GameState.PRE_SERVE; gs.stateTimer = 0; ball.inFlight = false;
        for (const p of gs.players) {
          p.vel = v2(0, 0);
          resetMovementRuntime(p);
        }
      }
      return;
    }
    // Serve landed in box â€” record stats
    gs.serveBounced = true;
    // Usa velocidade de saÃ­da da raquete gravada em serving (_serveExitKmh)
    // MediÃ§Ã£o equivalente ao radar ATP (saÃ­da do contato, nÃ£o pÃ³s-bounce)
    const kmh = ball._serveExitKmh ?? Math.round(mag3(ball.vel) * 3.6);
    const st  = server.stats;
    if (gs.lastServeFirst) { st.serve1In++; st.serve1AvgKmh = movAvg(st.serve1AvgKmh, st.serve1In - 1, kmh); }
    else                   { st.serve2In++; st.serve2AvgKmh = movAvg(st.serve2AvgKmh, st.serve2In - 1, kmh); }
    return;
  }

  // â”€â”€ Bug fix: bola quicando no campo do prÃ³prio batedor â†’ ponto adversÃ¡rio â”€â”€
  // Ex: batedor Ã© player.side = +1 (metade positiva), bola quicou em y > 0 = prÃ³prio campo â†’ erro
  if (!gs.isFirstBounce && ball.lastHitBy >= 0) {
    const h = ball.lastHitBy;
    const hitterSide = gs.players[h].side; // +1 ou -1
    if (ball.lastBounceSide === hitterSide) {
      // Quicou no prÃ³prio campo do batedor â†’ ponto para o adversÃ¡rio
      resolvePoint(gs, 1 - h, `[CAMPO PRÃ“PRIO] ${gs.players[h].name}`);
      const hitter = gs.players[h];
      recordShotError(gs, hitter);
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
      const defReach   = defender.reach + (maxDefSpd * timeToStop);
      const trulyUnreachable = dist > defReach * 3.8;

      // â”€â”€ 2Âº quique fora da quadra = winner GARANTIDO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      // Se o 2Âº quique aconteceu alÃ©m da baseline ou da lateral do defensor,
      // a bola quicou 2x: uma dentro (QB1) e uma fora (QB2). Isso Ã© winner
      // independente de onde o defensor estÃ¡ â€” ele nÃ£o pode mais alcanÃ§ar.
      const bounceOutsideCourt = Math.abs(ball.pos.y) > COURT.halfL + 0.05
                               || Math.abs(ball.pos.x) > COURT.singlesW / 2 + 0.05;

      // ETA real: inclui atraso de postHitPause (jogador ainda em recovery)
      const defETA = maxDefSpd > 0 ? (dist / maxDefSpd) + postHitDelay : 999;

      pushTech(gs,
        `[DBG-QB2] def:${defender.name} dist:${dist.toFixed(2)}m ETA:${defETA.toFixed(2)}s` +
        ` (postHitDelay:${postHitDelay.toFixed(3)}s stam:${staminaFactor.toFixed(2)})` +
        ` margin:${(defender._arrivalMargin ?? 0).toFixed(2)}s` +
        ` unreachable:${trulyUnreachable} bounceOut:${bounceOutsideCourt}` +
        ((ball._solverErr ?? 0) > 2.0 ? ` âš SOLVER_ERR:${ball._solverErr?.toFixed(2)}m` : '')
      );
      // â”€â”€ Solver failure guard: trajetÃ³ria fisicamente invÃ¡lida nÃ£o conta como winner â”€
      // Se o launchBall solver falhou (bestErr > 2m), a bola tomou um caminho bogus
      // (Magnus nÃ£o-monotÃ³nico). O 2Âº quique pode ter acontecido por acidente â€”
      // o ponto deve ser erro do batedor, nÃ£o winner.
      if ((ball._solverErr ?? 0) > 2.0) {
        resolvePoint(gs, 1 - h, `[ERRO_TRAJ] ${gs.players[h].name}`);
        recordShotError(gs, gs.players[h]);
        return;
      }
      // No tÃªnis real, 2 quiques no campo adversÃ¡rio = ponto garantido, sem exceÃ§Ã£o.
      resolvePoint(gs, h, `[2 QUIQUES] ${gs.players[1 - h].name}`, true);
    }
  }
}

// â”€â”€ Collision resolvers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function resolveNet(gs) {
  const ball = gs.ball;
  if (gs.isFirstBounce) {
    const server = gs.players[gs.server]; server.faults++;
    if (server.faults >= 2) { resolvePoint(gs, gs.receiver, `DUPLA FALTA (rede) ${server.name}`); server.errorCount++; }
    else { gs.log.push(`ðŸ”µ FALTA 1 (rede) ${server.name}`); gs.gameState = GameState.PRE_SERVE; gs.stateTimer = 0; ball.inFlight = false; }
  } else {
    const h = ball.lastHitBy;
    if (h >= 0) {
      resolvePoint(gs, 1 - h, `[REDE] ${gs.players[h].name}`);
      const hitter = gs.players[h];
      recordShotError(gs, hitter);
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
    else { gs.log.push(`ðŸ“ FALTA 1 (fora) ${server.name}`); gs.gameState = GameState.PRE_SERVE; gs.stateTimer = 0; ball.inFlight = false; }
    return;
  }
  if (h < 0) return;

  // â”€â”€ Verifica se o ÃšLTIMO QUIQUE foi dentro das linhas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const lastBounceInCourt = gs.lastBouncePos
    ? Math.abs(gs.lastBouncePos.y) <= COURT.halfL + 0.02
      && Math.abs(gs.lastBouncePos.x) <= COURT.singlesW / 2 + 0.02
    : false;

  if (ball.bounceCount >= 1 && lastBounceInCourt) {
    // â”€â”€ REGRA REAL: quicou dentro â†’ bola ainda estÃ¡ em jogo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // O oponente PODE rebater de fora da quadra. NÃƒO encerrar ponto aqui.
    // Winner virÃ¡ via 2Âº quique em onBounce() se o oponente nÃ£o devolver.
    //
    // ExceÃ§Ã£o "dead zone": bola foi longe demais para ser realÃ­stica alcanÃ§ar.
    // Previne bola fugindo ao infinito sem resoluÃ§Ã£o.
    const beyondY = Math.abs(ball.pos.y) > COURT.halfL + THRESHOLDS.chaseOutLimitY;
    const beyondX = Math.abs(ball.pos.x) > COURT.singlesW / 2 + THRESHOLDS.chaseOutLimitX;
    if (beyondY || beyondX) {
      // â”€â”€ DiagnÃ³stico: logar posiÃ§Ã£o do defensor quando fuga Ã© declarada â”€â”€
      const defender = gs.players[1 - h];
      const distDef = Math.sqrt((defender.pos.x - ball.pos.x)**2 + (defender.pos.y - ball.pos.y)**2);
      pushTech(gs,
        `[DBG-FUGA] ball(y=${ball.pos.y.toFixed(2)}) def:${defender.name}` +
        ` pos(y=${defender.pos.y.toFixed(2)}) dist:${distDef.toFixed(2)}m` +
        ` margin:${(defender._arrivalMargin ?? 0).toFixed(2)}s`
      );
      const defReach = defender.reach + (defender.playerSpeed * (0.18 + (defender.stamina ?? 1) * 0.12));
      if (isDecisiveWinnerShot(gs, gs.players[h], defender, { dist: distDef, defReach })) {
        resolvePoint(gs, h, `[WINNER Â· fuga] ${gs.players[h].name}`, true);
      } else {
        resolvePoint(gs, 1 - h, `[FORA] ${gs.players[h].name}`);
        recordShotError(gs, gs.players[h]);
      }
    }
    // Dentro da dead zone â†’ rally continua, oponente pode rebater de fora
    return;
  }

  // Quique fora das linhas (ou sem quique) â†’ erro do batedor
  resolvePoint(gs, 1 - h, `[FORA] ${gs.players[h].name}`);
  const hitterOut = gs.players[h];
  recordShotError(gs, hitterOut);
}

function resolveBallStopped(gs) {
  const ball = gs.ball, h = ball.lastHitBy;
  if (h < 0) return;
  // Ball stopped after bouncing in court â€” hitter wins (opponent couldn't reach)
  if (ball.bounceCount >= 1) {
    const defender = gs.players[1 - h];
    const distDef = Math.sqrt((defender.pos.x - ball.pos.x)**2 + (defender.pos.y - ball.pos.y)**2);
    const staminaFactor = STAMINA.speedMinFactor + (defender.stamina ?? 1) * (1 - STAMINA.speedMinFactor);
    const maxDefSpd = defender.playerSpeed * staminaFactor;
    const defReach = defender.reach + (maxDefSpd * 0.24);
    if (isDecisiveWinnerShot(gs, gs.players[h], defender, { dist: distDef, maxDefSpd, defReach })) {
      resolvePoint(gs, h, `[WINNER Â· bola parou] ${gs.players[h].name}`, true);
    } else {
      resolvePoint(gs, 1 - h, `[FORA] ${gs.players[h].name}`);
      recordShotError(gs, gs.players[h]);
    }
  } else {
    resolvePoint(gs, 1 - h, `[BOLA PAROU] ${gs.players[h].name}`);
    recordShotError(gs, gs.players[h]);
  }
}

// â”€â”€ tryHit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  const reachGate = Math.max((player.reach ?? PLAYER_CFG.reach) * 1.22, 0.92);
  const movementCanContact = player._movementCanContactBall || player._movementCanExecutePlannedShot;
  const localBounceWindow = (ball.bounceCount ?? 0) >= 1
    && ball.lastBounceSide === player.side
    && (ball._timeSinceBounce ?? 999) <= 0.74
    && distance <= reachGate * 1.28;
  if (!movementCanContact && !localBounceWindow && distance > reachGate) {
    debugHitGate(gs, player, 'shotengine:outside_contact', { distance: +distance.toFixed(2), reachGate: +reachGate.toFixed(2) });
    return;
  }
  if ((ball.pos.z ?? 0) > THRESHOLDS.ballHitMaxZ + 0.85) {
    debugHitGate(gs, player, 'shotengine:ball_too_high', { z: +(ball.pos.z ?? 0).toFixed(2) });
    return;
  }

  const opponent = gs.players[1 - player.id];
  const context = buildShotContext({ gs, player, opponent });
  const isReturnContact = player.id === gs.receiver && (gs.rally ?? 0) === 0 && gs.serveBounced;
  let quality = evaluateShotQuality(context);
  if (isReturnContact && (quality.canContact || distance <= reachGate * 1.18)) {
    quality = Object.freeze({
      ...quality,
      quality: Math.max(quality.quality, context?.gs?._pendingServeData?.isFirst === false ? 0.58 : 0.50),
      canContact: true,
    });
  }
  if (!quality.canContact && distance > reachGate * 1.05) {
    debugHitGate(gs, player, 'shotengine:no_contact_quality', { distance: +distance.toFixed(2), q: +quality.quality.toFixed(2) });
    return;
  }

  const decision = isReturnContact ? decideReturnShot(context, quality) : decideShot(context, quality);
  const execution = buildShotExecution(context, quality, decision);
  applyShotExecution({ ball, player, execution, launchBall });
  const shotEngineSnapshot = buildShotEngineSnapshot({ context, quality, decision, execution });

  player.hitCooldown = TIMING.hitCooldown;
  player.swinging = true;
  player.swingTimer = 0;
  player.shotCount++;
  const shotDrain = STAMINA.decayPerShot * 0.46
    * (1 + Math.min(1.4, distance / Math.max(reachGate, 0.1)) * 0.34)
    * (decision.intent === 'FINISH' ? 1.28 : decision.intent === 'PRESSURE' ? 1.16 : decision.intent === 'DEFEND' ? 1.10 : 1)
    * (quality.quality < 0.45 ? 1.22 : 1);
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
    type: decision.family,
    targetX: execution.targetX,
    targetY: execution.targetY,
    power: execution.power,
    spinType: execution.spinType,
    actualSpinX: execution.actualSpinX,
    actualSpinZ: execution.actualSpinZ,
    intent: decision.intent,
    direction: decision.direction,
    shotEngine: shotEngineSnapshot,
  };
  auditRegisterShot(gs, player, shotForLegacyTelemetry, quality.quality);
  traceLogShot(gs, player, shotForLegacyTelemetry, quality.quality);
  const isFrameShot = quality.quality < 0.20 || (quality.quality < 0.30 && !quality.canContact);
  pushShotVFX(gs, player, decision.family, quality.quality, isFrameShot, false, null, null, {
    labelOverride: decision.family,
    executionState: quality.bodyState,
    executionLabel: quality.bodyState,
    feelTags: [decision.intent, decision.direction],
    shotEngine: shotEngineSnapshot,
  });
  pushTech(gs, `[SHOT_ENGINE] ${player.name} ${decision.family} ${decision.direction} ${decision.intent} Q=${quality.quality.toFixed(2)} risk=${execution.errorRisk.toFixed(2)}`);
  debugHitGate(gs, player, 'shotengine:hit', { family: decision.family, q: +quality.quality.toFixed(2), targetX: +execution.targetX.toFixed(2), targetY: +execution.targetY.toFixed(2) });
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
    shotEngine: server._lastShotEngineSnapshot ?? null,
  }, plan.quality);
  const serveSnapshot = server._lastShotEngineSnapshot ?? null;
  pushShotVFX(gs, server, plan.family, plan.quality, false, false, null, null, {
    labelOverride: plan.family,
    executionState: plan.isFirst ? 'FIRST_SERVE' : 'SECOND_SERVE',
    executionLabel: plan.isFirst ? 'FIRST_SERVE' : 'SECOND_SERVE',
    feelTags: [plan.intent, plan.direction],
    shotEngine: serveSnapshot,
  });
  pushTech(gs, `[SHOT_ENGINE_SERVE] ${server.name} ${plan.isFirst ? '1st' : '2nd'} ${plan.family} ${plan.direction} ${gs._pendingServeData?.kmh ?? 0}km/h Q=${plan.quality.toFixed(2)}`);
  gs.gameState = GameState.RALLY;
  gs.stateTimer = 0;
  gs.shotEngineOffline = null;
}
// â”€â”€ Tick functions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Medical Time Out â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function tickMTO(gs, dt) {
  const mto = gs.mto;
  if (!mto) {
    // Estado invÃ¡lido â€” limpa e avanÃ§a
    _startNextPointFromMTO(gs);
    return;
  }

  // Aguarda duraÃ§Ã£o do MTO
  if (gs.stateTimer < mto.durationSecs) return;

  // â”€â”€ MTO encerrou â€” decide se o jogador continua â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!mto.decided) {
    mto.decided = true;
    const injured = gs.players[mto.playerIdx];
    const { canContinue } = decideMTOOutcome(injured, mto.severity, gs);
    mto.canContinue = canContinue;

    if (!canContinue) {
      // â”€â”€ ABANDONO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      const winnerIdx = 1 - mto.playerIdx;
      const loser = injured;

      // Registra o set em andamento antes de forÃ§ar o resultado.
      // Sem isso setsHistory fica incompleto e o overlay mostra placar errado.
      const p0 = gs.players[0], p1 = gs.players[1];
      if (p0.games > 0 || p1.games > 0) {
        p0.setsHistory = [...(p0.setsHistory || []), p0.games];
        p1.setsHistory = [...(p1.setsHistory || []), p1.games];
      }

      // ForÃ§a vitÃ³ria do adversÃ¡rio â€” sets mÃ­nimos para passar setsToWin
      gs.players[winnerIdx].sets = gs.setsToWin ?? 2;

      // Registra abandono no gs para exposiÃ§Ã£o no resultado
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

      gs.log.push(`ðŸš« [ABANDONO] ${loser.name} nÃ£o retorna â€” lesÃ£o ${mto.severity}`);
      gs.gameState = GameState.GAME_OVER;
      gs.mto = null;
      return;
    }

    // â”€â”€ RETORNO â€” aplica penalidades e marca lesÃ£o ativa â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    applyInMatchPenalty(injured, mto.injuryType, mto.severity);
    injured._inMatchInjury = {
      injuryType:      mto.injuryType,
      severity:        mto.severity,
      isTemporary:     mto.isTemporary ?? false,
      gamesAfterInjury: 0,
    };
    injured._hadInMatchMTO = true;

    // Garante que a flag visual de lesÃ£o piscante fique ativa
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

    gs.log.push(`â†© [RETORNO] ${injured.name} volta Ã  quadra (${mto.injuryType}/${mto.severity})`);
  }

  // â”€â”€ Inicia o prÃ³ximo ponto â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  _startNextPointFromMTO(gs);
}

/** Reseta o estado para o prÃ³ximo ponto apÃ³s o MTO (equivale ao corpo do scheduleNextPoint) */
function _startNextPointFromMTO(gs) {
  gs.mto = null;
  gs.rally = 0; gs.serveLeft = !gs.serveLeft;
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function tickRally(gs, dt) {
  // â”€â”€ Injetar humidityFriction do ambiente no courtPhysics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Isso permite que handleGroundBounce use fricÃ§Ã£o dinÃ¢mica de humidade
  // sem acoplar EnvironmentSystem diretamente no physics.js.
  if (gs.courtPhysics && gs.environment) {
    gs.courtPhysics.humidityFriction = gs.environment.humidityFrictionAdd ?? 0;
  }
  stepPhysics(gs, dt);
  if (gs.gameState !== GameState.RALLY) return;

  // â”€â”€ Players update + tryHit BEFORE resolve checks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // CrÃ­tico: jogadores devem ter prioridade para tentar rebater a bola antes
  // de qualquer resoluÃ§Ã£o de ponto. Sem isso, a bola pode ser declarada winner
  // logo apÃ³s o 1Âº quique sem dar chance ao defensor de reagir.
  for (const p of gs.players) {
    if (p.hitCooldown > 0) p.hitCooldown -= dt;
    if (p._nearMissTimer > 0) p._nearMissTimer -= dt;  // decrement near-miss hysteresis window
    if (p.swinging) { p.swingTimer += dt; if (p.swingTimer >= TIMING.swingDuration) { p.swinging = false; p.swingTimer = 0; } }
    updatePlayerMovement(p, gs, dt);

    // â”€â”€ Heatmap accumulation (every 8 ticks â‰ˆ 8 frames @60fps) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    p._heatTick = (p._heatTick + 1) & 7;
    if (p._heatTick === 0) {
      const COLS = 12, ROWS = 16;
      const col = Math.floor((p.pos.x + 4.115) / (8.23 / COLS));
      const row = Math.floor(Math.abs(p.pos.y) / (11.885 / ROWS));
      const ci = Math.max(0, Math.min(COLS - 1, col));
      const ri = Math.max(0, Math.min(ROWS - 1, row));
      if (p._heatGrid[ri * COLS + ci] < 65535) p._heatGrid[ri * COLS + ci]++;
    }

    // â”€â”€ PrepTime accumulation: "barra de preparaÃ§Ã£o" â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const ball = gs.ball;
    const ballOnMySide = Math.sign(ball.pos.y) === p.side || Math.abs(ball.pos.y) < 0.5;
    const ballBounced  = ball.bounceCount >= 1;
    const dToBall      = Math.sqrt((p.pos.x - ball.pos.x)**2 + (p.pos.y - ball.pos.y)**2);
    const prepReach    = 10.0;
    const spd          = Math.sqrt(p.vel.x**2 + p.vel.y**2);
    const maxSpd       = p.playerSpeed ?? PLAYER_CFG.speed;

    // â”€â”€ 4 zonas de movimento â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Parado    : < 8% maxSpd  (~0.43 m/s) â†’ acumula rÃ¡pido se em cima da bola
    // Andando   : 8â€“45% maxSpd (~2.4 m/s)  â†’ acumula devagar
    // Trotando  : 45â€“72% maxSpd (~3.9 m/s) â†’ acumula muito pouco
    // Correndo  : > 72% maxSpd             â†’ NÃƒO acumula, decai
    const isStopped  = spd < maxSpd * 0.08;
    const isWalking  = spd < maxSpd * 0.45;
    const isJogging  = spd < maxSpd * 0.72;
    // isRunning = tudo acima

    const inPrepZone = ballOnMySide && ballBounced && dToBall < prepReach
                    && ball.lastHitBy !== p.id;

    if (inPrepZone) {
      // â”€â”€ Marca primeira entrada na prepZone â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      // prep signal Ã© acumulado aqui e passado para o offline contact sensor no momento do hit.
      if (!p._approachInitialized) {
        p._approachInitialized = true;
      }
      // distFactor com curva acentuada: sÃ³ perto da bola realmente conta
      const distFactor = Math.pow(1 - Math.min(1, dToBall / prepReach), 1.8);

      let rate;
      if (isStopped) {
        // Parado em cima da bola: sobe rÃ¡pido â€” mas nÃ£o recompensa tanto quanto antes.
        // Reduzido de 0.45+2.60 para evitar que o AI "plante" passivamente Ã  espera.
        rate = 0.40 + distFactor * 2.00;
      } else if (isWalking) {
        // Andando/ajustando: bom â€” footwork real acontece em movimento
        rate = 0.10 + distFactor * 0.90;
      } else if (isJogging) {
        // Trote: viÃ¡vel â€” open-stance em trote Ã© golpe legÃ­timo no ATP
        rate = 0.04 + distFactor * 0.40;
      } else {
        // Correndo: pequeno acÃºmulo â€” tenistas de elite carregam o swing em movimento.
        // Antes: 0 (forÃ§ava parar para qualquer prep). Agora: corre e ainda carrega um pouco.
        rate = distFactor * 0.12;
      }

      // â”€â”€ Penalidade de velocidade da bola â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      // Bola rÃ¡pida = menos tempo de reaÃ§Ã£o = barra enche mais devagar
      // 12 m/s (43 km/h): sem penalidade | 42 m/s (151 km/h): sÃ³ 25% da taxa
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
    // â”€â”€ Volley prep boost: reflexo + instintoRede reduzem o tempo necessÃ¡rio â”€â”€
    // Para groundstrokes: PREP1=0.55s, PREP2=0.90s â€” carregamento de swing (~0.5s), nÃ£o pausa estÃ¡tica
    // Para voleio: reflexo acelera o ring 1 (reaÃ§Ã£o imediata) e
    //              instintoRede acelera o ring 2 (posicionamento de rede).
    // Ambos no mÃ¡ximo (100) reduzem PREP1 em atÃ© 70% e PREP2 em atÃ© 65%.
    // Isso significa que um SRV_VOL com reflexo 90 + instinto 90 chega num
    // voleio correndo e ainda tem qualidade decente â€” Ã© para o que foi treinado.
    const _isVolleyShot = !p.atNet
      ? (p._volleyType === 'position' || p._volleyType === 'emergency')
      : true;  // atNet = sempre conta como voleio

    let PREP1, PREP2;
    if ((_isVolleyShot || p._volleyType === 'smash') && p.mods) {
      const reflexoFactor  = clamp((p.mods.reflexoQualBonus ?? 0) / 0.18, 0, 1);  // normaliza 0â†’1 para o novo range do volley
      const instintoFactor = ((p.attrs?.jogoDeRede ?? p.attrs?.instintoRede ?? 50) - 50) / 50;  // -1â†’1, 0 em 50
      const instintoNorm   = Math.max(0, instintoFactor);  // sÃ³ bÃ´nus, nunca penaliza

      // Ring 1: reflexo reduz atÃ© 70% do tempo exigido
      // Ring 2: instintoRede reduz atÃ© 65% do tempo exigido
      const prep1Reduction = clamp(reflexoFactor * 0.70, 0, 0.70);
      const prep2Reduction = clamp(instintoNorm   * 0.65, 0, 0.65);

      PREP1 = 0.55 * (1 - prep1Reduction);  // range: 0.165s (reflexo 100) â†’ 0.55s (reflexo 0)
      PREP2 = 0.90 * (1 - prep2Reduction);  // range: 0.315s (instinto 100) â†’ 0.90s (instinto 0)
    } else {
      // Reduzido de 0.85/1.30 para 0.55/0.90 â€” o prep completo Ã© carregamento de swing
      // (~0.5s de rotaÃ§Ã£o de quadril), nÃ£o 2s de pausa estÃ¡tica como antes.
      PREP1 = 0.55;
      PREP2 = 0.90;
    }

    p._prepFrac1 = Math.min(1, (p._prepTime ?? 0) / PREP1);
    p._prepFrac2 = Math.min(1, Math.max(0, ((p._prepTime ?? 0) - PREP1) / PREP2));

    // FIX 13 â€” Stamina â†’ timing window: cansaÃ§o alarga a janela exigida.
    // Jogador com stamina=0 precisa de 30% mais tempo parado para mesma qualidade.
    // Efeito: comeÃ§a a "falhar o timing" antes de perder velocidade visivelmente,
    // replicando o colapso fÃ­sico real em sets longos.
    const lowStaminaPenaltyMult = p._surfaceTalentFx?.lowStaminaPenaltyMult ?? 1;
    const lowStaminaRelief = clamp((p._surfaceTalentFx?.lowStaminaPenaltyReliefFlat ?? 0) / 100, 0, 0.2);
    const staminaTimingPenalty = clamp(1 + (1 - (p.stamina ?? 1.0)) * 0.30 * lowStaminaPenaltyMult * (1 - lowStaminaRelief), 1.0, 1.30);
    p._prepFrac1 = Math.min(1, (p._prepTime ?? 0) / (PREP1 * staminaTimingPenalty));
    p._prepFrac2 = Math.min(1, Math.max(0, ((p._prepTime ?? 0) - PREP1) / (PREP2 * staminaTimingPenalty)));
  }
  for (const p of gs.players) { tryHit(p, gs); if (gs.gameState !== GameState.RALLY) return; }

  // â”€â”€ Resolve checks (rede, fora, bola parada) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  const key = player?.prefs?.netGame ?? 'RELUCTANT';
  let profile;
  switch (key) {
    case 'HUNTER':
      // Sampras: a rede Ã© o plano A, nÃ£o a recompensa.
      // base alto â†’ acumula netIntent em todo rally
      // carry alto â†’ nÃ£o decai entre golpes
      // threshold baixo â†’ decide subir cedo
      // minQ baixo â†’ nÃ£o espera bola perfeita para aproximar
      // fitFloor baixo â†’ qualquer golpe razoÃ¡vel serve de aproximaÃ§Ã£o
      profile = { base: 0.07, carry: 0.58, weakReturn: 0.24, shortBall: 0.28, slowBall: 0.12,
                  pressure: 0.08, neutral: 0.02, threshold: 0.66, minQ: 0.58, maxBehind: 1.1,
                  oppDepth: 0.56, cooldown: 4, fitFloor: 0.46 };
      break;
    case 'PROACTIVE':
      profile = { base: 0.04, carry: 0.54, weakReturn: 0.20, shortBall: 0.24, slowBall: 0.10,
                  pressure: 0.06, neutral: 0.01, threshold: 0.70, minQ: 0.60, maxBehind: 0.95,
                  oppDepth: 0.61, cooldown: 4, fitFloor: 0.50 };
      break;
    case 'OPPORTUNIST':
      // Sobe somente quando a bola convida â€” threshold moderado, exigÃªncia real de fit
      profile = { base: 0.00, carry: 0.44, weakReturn: 0.08, shortBall: 0.16, slowBall: 0.06,
                  pressure: 0.015, neutral: 0.00, threshold: 0.80, minQ: 0.66, maxBehind: 0.55,
                  oppDepth: 0.68, cooldown: 5, fitFloor: 0.58 };
      break;
    case 'RELUCTANT':
      // SÃ³ vai se a bola for muito curta e a qualidade for alta â€” raramente sobe
      profile = { base: 0.00, carry: 0.38, weakReturn: 0.02, shortBall: 0.10, slowBall: 0.04,
                  pressure: 0.00, neutral: 0.00, threshold: 0.82, minQ: 0.64, maxBehind: 0.4,
                  oppDepth: 0.72, cooldown: 4, fitFloor: 0.50 };
      break;
    default: // AVOIDS â€” a rede Ã© territÃ³rio inimigo
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
    carry: clamp(profile.carry + carryShift, 0.24, 0.72),
    threshold: clamp(profile.threshold + thresholdShift, 0.58, 0.99),
    minQ: clamp(profile.minQ + minQShift, 0.54, 0.84),
    fitFloor: clamp(profile.fitFloor + fitShift, 0.42, 0.72),
  };
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

  const netInclined = player.prefs?.netGame === 'HUNTER' || player.prefs?.netGame === 'PROACTIVE';
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
  const attacking = currentIntent === 'FINISH' || currentIntent === 'PRESSURE';
  const surfaceKey = _courtKeyToSurface(gs?.courtId ?? gs?.courtMeta?.surface ?? gs?.surface ?? gs?.courtMods?.surface ?? '');
  const isClay = surfaceKey === 'clay';
  const netSkill = ((player.attrs?.volley ?? player.attrs?.jogoDeRede ?? 50) + (player.attrs?.smash ?? player.attrs?.jogoDeRede ?? 50)) / 2;
  const netSkillGate = netSkill >= 72 || player.prefs?.netGame === 'HUNTER';
  const oppPlayedShort = false;

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
  if (shotFit > 0.25 && effectiveQuality > 0.52) {
    gain += shotFit * 0.12;
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
    || oppDepth > profile.oppDepth;
  const readyToTransition = playerInside
    && !playerDefending
    && netSkillGate
    && effectiveQuality >= profile.minQ
    && shotFit >= profile.fitFloor
    && clearWindow
    && (!isClay || oppPlayedShort || weakReturnBoost > 0.18 || (isSlowBall && effectiveQuality > 0.66) || (attacking && shotFit > 0.62 && effectiveQuality > 0.66));
  const chaosNetWindow = netSkill >= 78
    && playerInside
    && !playerDefending
    && (ctx.transitionCooldown ?? 0) <= 0
    && effectiveQuality >= 0.58
    && (oppPlayedShort || isSlowBall || weakReturnBoost > 0.12 || oppDepth > 0.58)
    && Math.random() < (player.prefs?.netGame === 'PROACTIVE' ? 0.28 : player.prefs?.netGame === 'HUNTER' ? 0.36 : 0.14);

  if (!player.atNet
      && ctx.courtMode === 'BASE'
      && (ctx.transitionCooldown ?? 0) <= 0
      && (readyToTransition || chaosNetWindow)
      && ((ctx.netIntent ?? 0) >= profile.threshold || chaosNetWindow)) {
    player.atNet = false;
    ctx._netApproachedThisPoint = true;
    ctx.courtMode = 'TRANSITION';
    ctx.netPhase = 'APPROACH';
    ctx.transitionCooldown = profile.cooldown;
    ctx.netIntent = Math.max(0.42, (ctx.netIntent ?? 0) * 0.82);
    ctx._approachLandX = shot.targetX ?? 0;
    ctx._approachQuality = clamp((Math.max(shotFit, chaosNetWindow ? 0.68 : 0) * 0.45) + (effectiveQuality * 0.55), 0.50, 1); // compromisso real com a subida
    player.stats.netApproaches++;
    const reason =
      source === 'weak_return' ? ' (saque + resposta fraca)' :
      source === 'short_ball'  ? ' (bola curta)' :
      source === 'slow_ball'   ? ' (bola lenta)' :
      source === 'pressure'    ? ' (pressÃ£o construÃ­da)' :
      '';
    gs.log.push(`ðŸ“¡ [${player.styleData?.abbr ?? 'NET'}] ${player.name} sobe Ã  rede${reason}`);
  }
}







