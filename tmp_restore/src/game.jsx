import { COURT, PHYSICS, TIMING, THRESHOLDS, PLAYER_CFG, STAMINA, SHOT_DECAY_MULT, INERTIA, GameState, SCORE_LABELS, LOB_TYPES } from './core/constants.js';
import { getTraitEffects, collectTraitContexts, TRAIT_CATALOG } from './systems/traits/TraitSystem.js';
import { traceStartPoint, traceLogShot, traceLogOutcome, traceEndPoint, TRACE_ENABLED } from './core/trace.js';
import { COURTS, getCourtVisual, getCourtPhysics, getCourtStyleMods } from './domain/courts/courtConfigs.js';
import { PLAY_STYLES, STYLE_KEYS } from './domain/players/styles.js';
import { SPIN_MAP, SHOT_PHYSICS } from './systems/shots/shotPhysics.js';
import { v2, v3, mag3, dist2, clamp, rand, movAvg } from './core/math.js';
import { CONTACT } from './config/CONTATO_CONFIG.js';
import { AI } from './systems/ai/aiCoefficients.js';
import { stepPhysics, checkNetCollision, checkOutOfBounds, checkServiceBox, launchBall, predictTrajectory } from './core/physics.js';
import { createCtx, resetCtx, updateMomentum, aiDecideShot, classifyZone, updateRallyPressure, applySetAdjustment, initContextConf, updateTiebreakConf, readMatchContext, recoverMomentumBetweenSets } from './systems/ai/ai.js';
import { initMatchPlans } from './systems/match/MatchPlanSystem.js';
import { getFormModifiers } from './systems/progression/formas.jsx';
import { updatePlayerMovement, resetMovementRuntime } from './systems/movement/TennisMovement.js';
import { initFormaDoDia } from './systems/shots/shotDecision.js';
import { generatePrefs, mergeGeneratedPrefs }   from './domain/players/playerPrefs.js';
import { pushVFX, pushShotVFX } from './systems/vfx/vfx.js';
// ── ATP Shot Engine — Fase 1 ─────────────────────────────────────────────────
import { computeSigmaX, getAtpSpinMultipliers } from './systems/shots/ballOutputEngine.js';
import { assignCoreShotPipeline, buildCoreShotPipeline } from './systems/shots/coreShotPipeline.js';
import { deriveWingIdentity } from './systems/shots/wingIdentity.js';
import { playSound, announceScore } from './systems/audio/sound.js';
import { NAMED_PLAYERS, computePlayerMods, matchDayVarV3, migrateAttrsToV3, recoveryBoost } from './domain/players/players.js';
import { getEffectiveAttrs } from './systems/coaches/CoachArchetypes.js';
import { initEnvironment, updateEnvironment } from './systems/environment/EnvironmentSystem.js';
// MatchParticles removido — NEWME1.0 usa sistema próprio de partículas
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
  const forcedDiff = THRESHOLDS.forcedErrorDiff ?? 0.72;
  const forcedPressure = THRESHOLDS.forcedErrorPressure ?? 0.82;
  const ueRiskMod = gs?.courtMods?.ueRiskMod ?? 1.0;
  const rallyLenMult = gs?.courtMods?.rallyLengthMult ?? 1.0;
  const quality = hitter?._lastQuality ?? 0;
  const diff = hitter?._lastHitDiff ?? 0;
  const pressure = hitter?._lastHitPressure ?? 0;
  const comfortableThreshold = clamp(0.53 - (ueRiskMod - 1.0) * 0.07, 0.48, 0.58);
  const pressureThreshold = clamp(forcedPressure - (rallyLenMult - 1.0) * 0.06, 0.74, 0.86);
  const stretchThreshold = clamp(forcedDiff - Math.max(0, rallyLenMult - 1.0) * 0.05, 0.64, 0.76);
  const underDuress = diff >= stretchThreshold || pressure >= pressureThreshold;
  const barelyControlled = quality < comfortableThreshold || diff >= stretchThreshold + 0.08;
  if (!hitter || hitter._forceUE) return 'UE';
  return barelyControlled && underDuress ? 'FE' : 'UE';
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
      const shotX = hitter.ctx.lastShotX ?? hitter.ctx._lastShotX ?? 0;
      const dir = shotX > 0.5 ? 1 : shotX < -0.5 ? -1 : 0;
      if (dir !== 0) {
        if (hitter.ctx.lastErrorDir === dir) {
          hitter.ctx.errorDirStreak = (hitter.ctx.errorDirStreak ?? 0) + 1;
        } else {
          hitter.ctx.lastErrorDir = dir;
          hitter.ctx.errorDirStreak = 1;
        }
      }
    } else {
      hitter.ctx.consecutiveUE = 0;
      hitter.ctx.errorDirStreak = 0;
    }
  }
  hitter._forceUE = false;
}

function isDecisiveWinnerShot(gs, hitter, defender, meta = {}) {
  if (!hitter || !defender) return false;
  const winnerMod = gs?.courtMods?.winnerMod ?? 1.0;
  const quality = hitter._lastQuality ?? 0;
  const pressure = hitter._lastHitPressure ?? 0;
  const timings = hitter._finalShot?.timings ?? {};
  const dist = meta.dist ?? timings.opponentETAComponents?.dist ?? 99;
  const maxDefSpd = meta.maxDefSpd ?? timings.opponentETAComponents?.maxDefSpd ?? defender.playerSpeed ?? 0;
  const postHitDelay = meta.postHitDelay ?? timings.opponentETAComponents?.postHitDelay ?? defender.ctx?._postHitPause ?? 0;
  const defETA = meta.defETA ?? timings.opponentETA ?? (maxDefSpd > 0 ? (dist / maxDefSpd) + postHitDelay : 99);
  const defReach = meta.defReach ?? defender.reach ?? 0;
  const trulyUnreachable = meta.trulyUnreachable ?? (dist > defReach * 3.55);
  const qualityGate = clamp(0.68 - (winnerMod - 1.0) * 0.12, 0.57, 0.76);
  const pressureLift = clamp((pressure - 0.72) * 0.28, 0, 0.06);
  const timeBeat = defETA >= clamp(1.10 - (winnerMod - 1.0) * 0.18, 0.92, 1.14);
  return trulyUnreachable || timeBeat || (quality + pressureLift) >= qualityGate;
}

export function createStats() {
  return {
    aces: 0, doubleFaults: 0,
    serve1In: 0, serve1Total: 0, serve1AvgKmh: 0,
    serve2In: 0, serve2Total: 0, serve2AvgKmh: 0,
    winners: 0, unforcedErrors: 0, forcedErrors: 0,
    netApproaches: 0, netPointsWon: 0,
    rallyLengths: [],
    byType: { FLAT:0, TOPSPIN:0, DRIVE:0, SLICE:0, VOLLEY:0, DROP:0, DROP2:0,
              SMASH:0, LOB_DEF:0, LOB_ATK:0, BANANA:0, PASSING:0,
              SHORT_ANGLE:0, SLICE_SHORT:0, HALF_VOLLEY:0, HEAVY_TOP:0,
              ACCEL:0, SHORT_ACCEL:0 },  // [FIX v1] rally shots use ACCEL/SHORT_ACCEL — must be declared here
    // Q média e velocidade média por tipo de golpe
    byTypeQSum:  {}, byTypeQCnt:  {},
    byTypeKmhSum:{}, byTypeKmhCnt:{},
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
    // Log por ponto para gráficos (max 300 pontos)
    serveLog: [], // { kmh, physType, dir, isFirst, won, isAce, pointNum }
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

export function createBall() {
  return { pos: v3(0,0,0.5), vel: v3(0,0,0), spin: v3(0,0,0),
           inFlight: false, bounceCount: 0, lastHitBy: -1, lastBounceSide: 0 };
}

export function createPlayer(id, side, name, color, styleId, namedPlayerKey) {
  const named = namedPlayerKey ? NAMED_PLAYERS[namedPlayerKey] : null;
  const rawAttrs = named ? named.attrs : null;
  // FIX: migra jogadores com schema antigo (28 attrs) para v3 (14 attrs) antes de computar mods.
  // Sem isso, attrs como controle, potencia, agressividade ficam undefined → fallback 50 → todos
  // os jogadores legados ficam iguais (nenhuma fraqueza, nenhuma força real).
  const migratedAttrs = rawAttrs ? migrateAttrsToV3(rawAttrs) : null;
  // Aplica bônus ativo do arquétipo do técnico (some se o técnico sair)
  const attrs  = migratedAttrs ? getEffectiveAttrs(migratedAttrs, named?.coach ?? null) : null;
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

  return {
    id, side, name, color, styleId, styleData,
    namedPlayerKey, attrs, mods,
    // Signature: golpe assinatura permanente do jogador
    naturalSignature: named?.naturalSignature ?? null,
    signatureShot:    named?.signatureShot ?? null,
    rallyPattern:  named?.rallyPattern  ?? null,
    playerSpeed, playerAccel, playerDecel,
    pos: v2(0, baseY), basePos: v2(0, baseY), vel: v2(0, 0),
    atNet: false, reach: playerReach, stamina: 1.0,
    hitCooldown: 0, swinging: false, swingTimer: 0,
    score: 0, games: 0, sets: 0, faults: 0,
    setsHistory: [],  // [games_won_set1, games_won_set2, ...] para o scoreboard
    shotCount: 0, errorCount: 0, winnerCount: 0,
    _arrivalMargin: 0.5,  // initialise as "plenty of time"
    _predCrossX: 0,
    _lastQuality: 1.0,    // last shot positioning quality (for UI/debug)
    _nearMissTimer: 0,    // near-miss hysteresis countdown (seconds)
    // ── Position heatmap: 12 cols × 16 rows, player's half-court ────────────
    // X: –singlesW/2 → +singlesW/2 (8.23 m total)
    // Y (depth): 0 (net) → halfL (11.885 m, baseline). Stored as absolute |Y|.
    _heatGrid: new Uint16Array(12 * 16),
    _heatTick: 0,
    ctx: createCtx(), stats: createStats(),
    // Coach: propaga dados do jogador do universo para o motor de jogo.
    // coach contém { coachId, philosophy, ... } — lido pelo sistema de changeover em headless.
    // _coachInstructions começa vazio e é populado no primeiro changeover.
    coach: named?.coach ?? null,
    _coachInstructions: named?._coachInstructions ?? [],
    // ── Shot System v4 — prefs do jogador (Fase 2/3) ────────────────
    // prefs baked na ficha têm prioridade; fallback gera dos attrs.
    prefs: named?.prefs ?? (attrs ? generatePrefs(attrs) : null),
    surfaceStats: named?.surfaceStats ?? null,
    surfaceIdentity: named?.surfaceIdentity ?? null,
    recentForm: named?.recentForm ?? null,
    _talentTrees: derivePlayerTalentTrees(named ?? { attrs: migratedAttrs ?? rawAttrs ?? {}, prefs: named?.prefs ?? null, surfaceStats: named?.surfaceStats ?? null, surfaceIdentity: named?.surfaceIdentity ?? null, recentForm: named?.recentForm ?? null }),
    // formaDoDia inicializado em initGameState via initFormaDoDia()
    _formaDoDia: undefined,
    // Visual DNA: injury e traits para diferenciação visual no canvas
    injury: named?.injury ?? null,
    dna:    named?.dna    ?? null,
    // FASE 3 — Match Plan: gerado em initGameState após criar ambos os jogadores.
    // Contém { directives, confidence, notes, _scout } — lido por CoachInfluencer.
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
}

function techEnd(gs, winnerIdx, reason) {
  const w = gs.players[winnerIdx];
  gs.techLog.push(`[FIM] ▶ ${w.name} vence | ${reason} | rally=${gs.rally}`);
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
    bounceLog: [],  // {x, y, type:'rally'|'winner'|'out', player:0|1, shotType}
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
  const _surface3 = _courtKeyToSurface(courtKey);
  initMatchPlans(gs.players[0], gs.players[1], _surface3, rivalSystem);

  // FASE 2 — Inicializar confiança contextual e pre-calcular formModifiers para cada jogador.
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
    // Cache dos modificadores de forma para uso em tryHit e tickServing
    p._formMods = getFormModifiers(p, _surfaceUpper);
    p._formMods = {
      ...(p._formMods ?? {}),
      qualityMod: (p._formMods?.qualityMod ?? 1.0) * (talentApplied.effects?.qualityMult ?? 1) * (talentApplied.effects?.buildPressureMult ?? 1),
      qualityFlat: (p._formMods?.qualityFlat ?? 0) + (talentApplied.effects?.qualityFlat ?? 0) + (talentApplied.effects?.buildPressureFlat ?? 0),
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
    // Shot System v4 — formaDoDia: inicializar 1× por partida
    // Aproveita _matchDayAdj calculado acima quando disponível.
    initFormaDoDia(p);
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
      // TB conta como 7-6 no histórico
      w.setsHistory = [...(w.setsHistory || []), 7];
      l.setsHistory = [...(l.setsHistory || []), 6];
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
  const ws = w.score, ls = l.score;

  if (ws === 3 && ls === 3) {
    // Deuce → Advantage
    w.score = 4;
  } else if (ws === 4) {
    // Advantage → Game
    _gameWon(gs, winnerIdx);
  } else if (ls === 4) {
    // Oponente tinha Advantage → volta ao Deuce
    w.score = 3; l.score = 3;
  } else if (ws === 3 && ls < 3) {
    // 40-X: game direto
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

  // ── FASE 5: Decrementar duração das instruções do técnico ─────
  // _coachInstructions diminui durationGames a cada game; expirações são removidas.
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

  // ── FASE 5: Sinalizar changeover para o componente de partida ─
  // gs._pendingCoachChangeover = true indica que o componente deve
  // chamar runChangeover() neste changeover (a cada 2 games ou fim de set).
  const totalGames = w.games + l.games; // após incremento w.games
  if (totalGames % 2 === 0 || (w.games === 0 && l.games === 0)) {
    gs._pendingCoachChangeover = true;
  }

  const wG = w.games, lG = l.games;

  // Set normal: ≥6 games com diferença ≥2
  if (wG >= 6 && wG - lG >= 2) {
    _setWon(gs, winnerIdx);
    return;
  }

  // Tiebreak: 6-6
  if (wG === 6 && lG === 6) {
    gs.inTiebreak = true;
    gs.tbScore = [0, 0];
    gs.tbPointsPlayed = 0;
    gs.tbServer = gs.server; // registra quem serve o 1º ponto do TB
    gs.log.push(`⚡ TIEBREAK! | Games 6–6`);
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

  // ── Point history: últimos 20 pontos para RunStrip no HUD ────────────────
  if (!gs.pointHistory) gs.pointHistory = [];
  gs.pointHistory.push({ winner: winnerIdx, reason: displayReason, rally: gs.rally ?? 0 });
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

  // ── Match Point Saved stat (para sombra de trait) ────────────────────────
  // "Salvar" = adversário tinha match point, mas o ponto foi ganho por gs.players[winnerIdx]
  {
    if (pointState[1 - winnerIdx].isMatchPoint) {
      w.stats.matchPointsSaved = (w.stats.matchPointsSaved ?? 0) + 1;
    }
  }

  // Detect ACE
  if (isAce) { w.stats.aces++; gs.log.push(`⚡ ACE! ${w.name}`); }
  displayReason = isAce ? `ACE ${w.name}` : reason;
  if (!isAce && isWinner) w.stats.winners++;
  if (displayReason.includes('DUPLA FALTA')) l.stats.doubleFaults++;
  if (w.atNet) w.stats.netPointsWon++;

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
      wasMatchPointSaved: loserHadMP2,
      wasBreakPointSaved: receiverHadBP && winnerIdx === gs.server,
      wasDeuce:           wasDeuce,
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
      });
    }
    // NOTA: NÃO zerar aqui — traceEndPoint (chamado abaixo) ainda precisa de _pendingServeData
    // para registrar kmh/physType/dir no trace do ponto. Será zerado após o trace.
  }
  if (pd && gs.serveBounced) finalizeServeReturnPattern(gs, pd, serverWon, isAce);

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
  const shotTypeForBounce = ball._lastShotType ?? ball.lastShotType ?? 'UNKNOWN';
  const shotMetaForBounce = ball._lastShotMeta ? { ...ball._lastShotMeta } : null;

  // Track which side of the court the ball bounced on
  ball.lastBounceSide = Math.sign(ball.pos.y);
  // Salva posição exata do quique para resolveOutOfBounds poder verificar se foi dentro
  gs.lastBouncePos = { x: ball.pos.x, y: ball.pos.y };

  // ── Particles & court marks ─────────────────────────────────
  addCourtMark(gs, ball, shotTypeForBounce);

  playSound('BOUNCE');

  // ── BounceLog: acumula todos os quiques para mapa pós-partida ──────────────
  if (!gs.bounceLog) gs.bounceLog = [];
  gs.bounceLog.push({
    x: ball.pos.x,
    y: ball.pos.y,
    type: 'rally',   // será atualizado para 'winner' ou 'out' em resolvePoint/resolveOutOfBounds
    player: ball.lastHitBy ?? -1,
    shotType: shotTypeForBounce,
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
    // Usa velocidade de saída da raquete gravada em tickServing (_serveExitKmh)
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
      resolvePoint(gs, 1 - h, `[CAMPO PRÓPRIO] ${gs.players[h].name}`);
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

      // ── 2º quique fora da quadra = winner GARANTIDO ──────────────────────
      // Se o 2º quique aconteceu além da baseline ou da lateral do defensor,
      // a bola quicou 2x: uma dentro (QB1) e uma fora (QB2). Isso é winner
      // independente de onde o defensor está — ele não pode mais alcançar.
      const bounceOutsideCourt = Math.abs(ball.pos.y) > COURT.halfL + 0.05
                               || Math.abs(ball.pos.x) > COURT.singlesW / 2 + 0.05;

      // ETA real: inclui atraso de postHitPause (jogador ainda em recovery)
      const defETA = maxDefSpd > 0 ? (dist / maxDefSpd) + postHitDelay : 999;

      // Instrumentação para _finalShot.timings (diagnóstico de winners prematuros)
      const hitterFinalShot = gs.players[h]?._finalShot;
      if (hitterFinalShot) {
        hitterFinalShot.timings.opponentETA = +defETA.toFixed(3);
        hitterFinalShot.timings.opponentETAComponents = {
          dist:          +dist.toFixed(2),
          maxDefSpd:     +maxDefSpd.toFixed(2),
          postHitDelay:  +postHitDelay.toFixed(3),
          staminaFactor: +staminaFactor.toFixed(2),
        };
      }

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
        resolvePoint(gs, 1 - h, `[ERRO_TRAJ] ${gs.players[h].name}`);
        gs.players[h].errorCount++;
        return;
      }
      // No tênis real, 2 quiques no campo adversário = ponto garantido, sem exceção.
      resolvePoint(gs, h, `[2 QUIQUES] ${gs.players[1 - h].name}`, true);
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
      const defReach = defender.reach + (defender.playerSpeed * (0.18 + (defender.stamina ?? 1) * 0.12));
      if (isDecisiveWinnerShot(gs, gs.players[h], defender, { dist: distDef, defReach })) {
        resolvePoint(gs, h, `[WINNER · fuga] ${gs.players[h].name}`, true);
      } else {
        resolvePoint(gs, 1 - h, `[FORA] ${gs.players[h].name}`);
        recordShotError(gs, gs.players[h]);
      }
    }
    // Dentro da dead zone → rally continua, oponente pode rebater de fora
    return;
  }

  // Quique fora das linhas (ou sem quique) → erro do batedor
  resolvePoint(gs, 1 - h, `[FORA] ${gs.players[h].name}`);
  const hitterOut = gs.players[h];
  recordShotError(gs, hitterOut);
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
    const defReach = defender.reach + (maxDefSpd * 0.24);
    if (isDecisiveWinnerShot(gs, gs.players[h], defender, { dist: distDef, maxDefSpd, defReach })) {
      resolvePoint(gs, h, `[WINNER · bola parou] ${gs.players[h].name}`, true);
    } else {
      resolvePoint(gs, 1 - h, `[FORA] ${gs.players[h].name}`);
      recordShotError(gs, gs.players[h]);
    }
  } else {
    resolvePoint(gs, 1 - h, `[BOLA PAROU] ${gs.players[h].name}`);
    recordShotError(gs, gs.players[h]);
  }
}

// ── tryHit ────────────────────────────────────────────────────────
export function tryHit(player, gs) {
  const ball = gs.ball;
  const opponent = gs.players[1 - player.id];
  if (player.hitCooldown > 0) { debugHitGate(gs, player, 'hitCooldown', { hitCooldown: +(player.hitCooldown ?? 0).toFixed(3) }); return; }
  if (ball.lastHitBy === player.id) { debugHitGate(gs, player, 'alreadyLastHitter'); return; }
  if (gs.isFirstBounce && ball.lastHitBy === gs.server && ball._serveNetTouched) { debugHitGate(gs, player, 'serveNetTouched'); return; }
  // ── Side check com epsilon (evita frame-miss no meio da quadra) ────────────
  const ballY = ball.pos.y;
  const sideEpsilon = 0.18; // tolerância: bola quase no centro → aceitar para ambos os lados
  const netZone = Math.abs(ballY) < THRESHOLDS.netZone;
  if (!netZone && Math.abs(ballY) > sideEpsilon && Math.sign(ballY) !== player.side) {
    debugHitGate(gs, player, 'wrongSide', { ballY: +ballY.toFixed(2), playerSide: player.side });
    return;
  }
  // Fix: só bloqueia receptor enquanto o saque ainda não quicou (!gs.serveBounced).
  // Antes: isFirstBounce podia ser true em mid-rally (reset em caso de rede/erro),
  // bloqueando completamente o receptor de bater na bola.
  if (gs.isFirstBounce && !gs.serveBounced && player.id === gs.receiver && Math.abs(ballY) >= 2.0) {
    debugHitGate(gs, player, 'preServeReturnBlock', { ballY: +ballY.toFixed(2) });
    return;
  }
  const movementHitReady = !!player._movementCanContactBall;
  const lastBounceInCourt = gs.lastBouncePos
    ? Math.abs(gs.lastBouncePos.y) <= COURT.halfL + 0.02
      && Math.abs(gs.lastBouncePos.x) <= COURT.singlesW / 2 + 0.02
    : false;
  const mustHitOverride =
    (ball.bounceCount ?? 0) >= 1 &&
    lastBounceInCourt &&
    movementHitReady &&
    ball.lastHitBy !== player.id &&
    (Math.sign(ballY || player.side) === player.side || Math.abs(ballY) < 0.90);

  // ── Teto de hit adaptativo ──────────────────────────────────────────────────
  // CASO 1 — Lob descendo sem quique (isDescendingHigh):
  //   Bola caindo de cima (vel.z < -0.5) sem ter quicado → smash de lob, teto 4.5m
  // CASO 2 — Bola subindo alto após quique (slow/high bounce):
  //   Drop shot ou slice muito efectuado quica e sobe a 3m+. Na subida vel.z > 0
  //   mas o teto de 2.5m bloqueava tryHit. Jogador bem posicionado não conseguia bater.
  //   Fix: se a bola quicou (bounceCount >= 1) e está acima do teto normal,
  //   elevar para 3.5m — suficiente para pegar bolas altas na subida sem abrir
  //   espaço para hits impossíveis.
  const isDescendingHigh  = ball.vel.z < -0.5 && ball.pos.z > 1.6 && ball.bounceCount === 0;
  const isHighRisingBounce = ball.bounceCount >= 1 && ball.vel.z > 0 && ball.pos.z > THRESHOLDS.ballHitMaxZ;
  const smashZCeiling = isDescendingHigh  ? 4.5
                      : isHighRisingBounce ? 3.5
                      : THRESHOLDS.ballHitMaxZ;

  // ── Bounce gate + Volley de Posição + Volley de Emergência ─────────────────
  // Regras (em ordem de prioridade):
  //   1. atNet=true → voleio intencional, passa sempre (já existia)
  //   2. isDescendingHigh → smash de lob, passa sempre (já existia)
  //   3. VOLLEY DE POSIÇÃO: jogador fisicamente na zona de rede (|y| < NET_VOLLEY_ZONE)
  //      mas atNet ainda false (flag não sincronizou). Quer volear, está lá, permite.
  //      Penalidade leve de qualidade aplicada abaixo.
  //   4. VOLLEY DE EMERGÊNCIA: bola vai passar pelo jogador antes do quique,
  //      verificado via predictTrajectory. Jogador no caminho = intercepta.
  //      Mas antes: checa se bola vai sair — leituraDeJogo decide se ele lê isso.
  //   5. Caso contrário → requer quique (regra padrão).

  const NET_VOLLEY_ZONE  = 5.0;   // metros da rede: jogador avançado mas flag não sincronizou
  const EMERG_REACH_MULT = 1.30;  // reach estendido para emergência (jogador se estica)

  let isPositionVolley   = false;
  let isEmergencyVolley  = false;

  if (ball.bounceCount === 0 && !isDescendingHigh && !player.atNet) {
    const playerDistFromNet = Math.abs(player.pos.y);
    const ballComingToMe    = (player.side > 0 && ball.vel.y > 0)
                           || (player.side < 0 && ball.vel.y < 0);

    // ── VOLLEY DE POSIÇÃO ──────────────────────────────────────────
    // Jogador já avançou até a zona de rede mas atNet não sincronizou ainda.
    if (playerDistFromNet < NET_VOLLEY_ZONE && ballComingToMe) {
      isPositionVolley = true;
    }

    // ── VOLLEY DE EMERGÊNCIA ───────────────────────────────────────
    // Bola vai passar pelo jogador sem quicar — intercepção ou perde o ponto.
    // [PATCH] Guard: só aplica dentro da quadra (dist ≤ halfL+1m). Evita VOLLEY do fundo.
    // EMERG_MAX_DIST: jogador a mais de 7.5m da rede está solidamente na baseline.
    // Nestas posições a bola SEMPRE quica antes de chegar — emergency volley não faz sentido.
    // Antes o guard era COURT.halfL+1m (~12.9m) = toda a quadra, causando VOLLEY do fundo.
    const EMERG_MAX_DIST = 7.5;
    if (!isPositionVolley && ballComingToMe && ball.pos.z < 2.2 && ball.pos.z > 0.25
        && playerDistFromNet <= EMERG_MAX_DIST) {
      const _airDens = gs.environment?.airDensity ?? 1.2;
      const { landPoint: emergLand } = predictTrajectory(ball, player.pos.y, 1.5, _airDens, gs.courtPhysics);

      if (emergLand) {
        // Checa se bola vai sair da quadra (OUT read)
        const willBeOutX = Math.abs(emergLand.x) > COURT.singlesW / 2 + 0.05;
        const willBeOutY = Math.abs(emergLand.y) > COURT.halfL + 0.05;
        const willBeOut  = willBeOutX || willBeOutY;

        if (willBeOut) {
          // Só é legítimo "deixar sair" quando esta projeção ainda representa
          // a primeira queda decisiva da bola. Em rally normal, depois que a bola
          // já entrou em jogo de verdade, o defensor precisa tentar a rebatida.
          const canReadLeaveAsOut = gs.isFirstBounce && ball.bounceCount === 0;
          if (!canReadLeaveAsOut) {
            isEmergencyVolley = true;
          } else {
          // leituraDeJogo decide se o jogador lê que vai sair
          // Margem de out: bola saindo por muito → até jogador burro lê
          // Bola saindo por pouco (< 0.20m) → mesmo leitura alta pode errar
          const leituraFactor  = player.mods?.leituraFactor ?? 0.5;
          const outMarginX     = Math.max(0, Math.abs(emergLand.x) - COURT.singlesW / 2);
          const outMarginY     = Math.max(0, Math.abs(emergLand.y) - COURT.halfL);
          const outMargin      = Math.max(outMarginX, outMarginY);

          // Piso mínimo: bola saindo > 0.40m → qualquer jogador lê (probabilidade base)
          // Acima de 0.40m a leitura começa a aparecer mesmo com leitura 1
          const readThreshold  = 0.40;
          const clearOut       = outMargin > readThreshold;

          // Probabilidade de LER o out corretamente:
          // - Margem clara (>0.40m): leitura 50 já lê ~50%, leitura 100 quase sempre
          // - Margem duvidosa (<0.20m): até leitura 100 tem chance de errar
          const baseReadProb   = clearOut ? 0.30 + leituraFactor * 0.65 : leituraFactor * 0.40;
          const readsAsOut     = Math.random() < baseReadProb;

          if (readsAsOut && !mustHitOverride) {
            // Jogador leu o out → não intercepta → deixa sair → ponto ganho
            debugHitGate(gs, player, 'readsAsOut', {
              landX: +emergLand.x.toFixed(2),
              landY: +emergLand.y.toFixed(2),
            });
            return;  // sai do tryHit sem bater
          }
          // Não leu → vai interceptar mesmo assim (erro tático)
          isEmergencyVolley = true;
          }
        } else {
          // Bola vai cair dentro — checar se passa pelo corpo do jogador
          // Ponto de landPoint está além do jogador (bola passa por ele antes de cair)?
          const ballPastPlayer = player.side > 0
            ? emergLand.y > player.pos.y + 0.3
            : emergLand.y < player.pos.y - 0.3;

          if (ballPastPlayer) {
            // Distância 2D atual — usa reach estendido para emergência
            const dEmerg = Math.sqrt(
              (player.pos.x - ball.pos.x) ** 2 +
              (player.pos.y - ball.pos.y) ** 2
            );
            if (dEmerg < (player.reach ?? 0.85) * EMERG_REACH_MULT) {
              isEmergencyVolley = true;
            }
          }
        }
      }
    }

    // Se não é nenhum tipo de voleio especial → regra normal (aguarda quique)
    if (!isPositionVolley && !isEmergencyVolley) return;
  }

  // Armazena para ajuste de qualidade abaixo
  player._volleyType = isDescendingHigh      ? 'smash'
                     : player.atNet          ? 'intentional'
                     : isPositionVolley       ? 'position'
                     : isEmergencyVolley      ? 'emergency'
                     : null;

  // Per-player reach (includes attribute bonus from alcance)
  const mods = player.mods;
  const baseReach = player.reach;

  const d = dist2(player.pos, { x: ball.pos.x, y: ball.pos.y });
  // Declarações antecipadas — usadas no near-miss block abaixo
  const ballSpd         = mag3(ball.vel);
  const hasBounced      = ball.bounceCount >= 1;
  const withinBaseReach = d < baseReach;
  const outsideAfterBounce = hasBounced && (
    Math.abs(ball.pos.y) > COURT.halfL + 0.05 ||
    Math.abs(ball.pos.x) > COURT.singlesW / 2 + 0.05
  );


  // ── Near-miss hysteresis: se bola esteve na "zona quase" no frame anterior ──
  // Evita perder hit por exatamente 1 frame quando bola rola pelo bico da raquete.
  // Janela de 140ms onde reach é estendido em 8%.
  const wasNearMiss = (player._nearMissTimer ?? 0) > 0;
  if (!outsideAfterBounce && hasBounced && d >= baseReach * 1.04 && d < baseReach * 1.20 && !wasNearMiss) {
    player._nearMissTimer = 0.14;
  }

  // ── Last-chance hit window: 180ms pós-quique, reach estendido em 6% ──
  // Dá tempo extra para pegar bolas lentas/slice que param perto do jogador.
  const timeSinceBounce = ball._timeSinceBounce ?? 999;
  const inLastChance    = hasBounced && timeSinceBounce < (outsideAfterBounce ? 0.10 : 0.18);

  // ── Half Volley detection: bola recém quicou, ainda baixíssima, jogador na meia-quadra ──
  // Acontece quando o jogador está em transição (no-man's land) e a bola quica nos pés dele.
  // É um golpe de bloqueio/punção: sem backswing, timing puro, contato tornozelo/canela.
  // Não confundir com VOLLEY (bounceCount=0) — aqui a bola JÁ quicou.
  // FÍSICA: só acontece em transição real (3.5m–7.0m da rede = no-man's land ATP).
  // Atrás da linha de serviço (>7m) o jogador tem tempo de deixar a bola subir → topspin/slice normal.
  const _playerDistFromNetHV = Math.abs(player.pos.y);
  const isHalfVolley = hasBounced
    && ball.pos.z < 0.42              // bola ainda baixa pós-quique (tornozelo/canela)
    && timeSinceBounce < 0.22         // logo após o quique (< ~220ms) — janela menor
    && _playerDistFromNetHV > 3.5     // no-man's land começa aqui (acima = zona de voleio)
    && _playerDistFromNetHV < 7.0     // limite: linha de serviço (~6.4m) + margem
    && !player.atNet                  // atNet já seria voleio
    && player._volleyType === null;   // não interceptou antes do quique
  player._halfVolleyContext = isHalfVolley;

  // Reach estendido composto (near-miss + last-chance são cumulativos mas não redundantes)
  // FIX VOLLEY APPROACH: NET_SPEC e SRV_VOL subindo à rede têm reach maior (+18%).
  // Fisicamente: voleiador em approach usa momentum para se estender lateralmente —
  // o "stretch volley" é parte essencial do jogo de rede. Só aplica em isPositionVolley
  // (jogador na zona de rede mas atNet não sincronizou ainda).
  const _netApproachStyle = (((player.attrs?.volley ?? player.attrs?.jogoDeRede ?? 50) +
    (player.attrs?.smash ?? player.attrs?.jogoDeRede ?? 50)) / 2) >= 72;
  const _approachReachBonus = (_netApproachStyle && isPositionVolley) ? 0.18 : 0;
  const reachBonus = (wasNearMiss ? 0.07 : 0) + (inLastChance ? 0.05 : 0) + _approachReachBonus;
  const outsideReachPenalty = outsideAfterBounce ? 0.10 : 0;
  const hitSyncReachBonus = movementHitReady && hasBounced ? 0.08 : 0;
  const outerReachMult = 1.04 + reachBonus + hitSyncReachBonus - outsideReachPenalty;

  // ── Speed gate dinâmico ────────────────────────────────────────────────────
  // Regra base: bola precisa de vel mínima para ser "jogável".
  // Override: se a bola estiver dentro do reach E quicou, aceitar spd menor
  // (slice morto, bola rolando) → jogador faz bloqueio/poke em vez de ignorar.
  const minSpdRequiredBase  = (withinBaseReach && hasBounced)
                          ? THRESHOLDS.ballHitMinSpdWithinReach  // 0.10 — poke/bloqueio
                          : THRESHOLDS.ballHitMinSpd;            // 0.25 — fora do reach
  const minSpdRequired = movementHitReady && hasBounced
    ? Math.max(0.06, minSpdRequiredBase - 0.05)
    : minSpdRequiredBase;
  const isSlowBall      = hasBounced && ballSpd < THRESHOLDS.ballHitMinSpd * 1.8 && withinBaseReach;

  // Bola extremamente baixa (< 0.12m) E lenta = quase no chão, difícil de pegar
  const isGroundRolling = ball.pos.z < 0.12 && ballSpd < 0.18 && hasBounced;

  // ── FIX: Antecipar Stamina e Serve Penalty antes de preReachGate ──────────
  // MOTIVO: Evitar misalignment entre preReachGate e effectiveReach
  // que criava zona onde bola passava no gate 1 mas não no gate 2 → aces espúrios
  const staminaFrac    = player.stamina ?? 1.0;
  let effectiveReach = baseReach * (STAMINA.reachMinFactor + staminaFrac * (1 - STAMINA.reachMinFactor));
  const movementContactClass = player._movementContactClass ?? 'NORMAL_HIT';
  const scrambleReachPenalty = movementContactClass === 'EMERGENCY_REACH'
    ? 0.08
    : movementContactClass === 'LOW_BALL_PICKUP'
      ? 0.04
      : 0;
  const executionReachBonus = player._movementCanExecutePlannedShot ? 0.03 : 0;
  effectiveReach *= 1 - scrambleReachPenalty + executionReachBonus;

  // ── Serve speed reach penalty (produz aces realistas em saques rápidos) ──────
  // Saque 200 km/h: receptor tem ~30% menos reach efetivo (difícil alcançar)
  // Saque 160 km/h: ~15% menos reach
  // Saque <140 km/h: sem penalidade (retorno cômodo)
  // Garante 6-14 aces/match em linha com ATP.
  if (gs.rally === 0 && player.id === gs.receiver && gs.ball._serveExitKmh) {
    // ── Serve speed reach penalty (produz aces realistas em saques rápidos) ──────
    // Saque 230 km/h: receptor tem ~17% menos reach efetivo (difícil alcançar)
    // Saque 200 km/h: ~10% menos reach
    // Saque <155 km/h: sem penalidade (retorno cômodo)
    // Meta: 6-14 aces/match em linha com ATP (era >40 por excesso de velocidade/penalidade).
    // Cap reduzido 0.35→0.22: antes mesmo dev=90 ficava com 0.42m de reach (quase impossível)
    // fator range reduzido: clamp(2.2-retMult*1.1, 0.9, 1.5)→(0.75, 1.15) — menos brutal
    const sKmh = gs.ball._serveExitKmh;
    // Threshold 155km/h: saque médio começa a pressionar o reach.
    // Cap 0.38: penalidade máxima de reach expressiva para saques extremos.
    // Divisor 270: calibrado para 240km/h → rawPenalty=0.315, 220km/h → 0.241, 200km/h → 0.167
    const rawServePenalty = clamp((sKmh - 168) / 340, 0, 0.22);
    const retMult = player.mods?.returnMult ?? 0.82;
    // returnMult alto → penalidade menor; baixo → amplificada
    // novo range retMult: clamp ajustado para refletir base mais baixa
    const reachServePenalty = rawServePenalty * clamp(2.10 - retMult * 1.20, 0.45, 1.30);
    effectiveReach *= (1 - reachServePenalty);
    // ── Nerf de ace por tipo/direção: receptor ganha reach extra para reduzir aces em kick/wide ──
    if ((gs.ball._servePhysType ?? '') === 'KICK' && gs.ball.pos.z <= 2.15) {
      effectiveReach *= 1.18;  // kick alto: mais previsível, receptor ajusta melhor (era 1.08)
    }
    if ((gs.ball._serveDir ?? '') === 'WIDE') {
      effectiveReach *= 1.12;  // wide: receptor consegue antecipar a direção e se abrir
    }
    // devolucao alta transforma leitura em passo extra de ajuste no retorno.
    const returnReachBonus = Math.max(0, (retMult - 0.62) * 0.28);
    effectiveReach += returnReachBonus * baseReach;
  }
  if (outsideAfterBounce) {
    const outsideReachCap = baseReach * 0.92;
    effectiveReach = Math.min(effectiveReach, outsideReachCap);
  }
  if (movementHitReady && hasBounced) {
    effectiveReach = Math.max(effectiveReach, baseReach * 1.08);
  }

  // ── Gate 1: Pre-reach agora usa effectiveReach (não apenas baseReach) ──────
  // FIX: Antes usava baseReach * outerReachMult, causando zona de inconsistência
  if (!mustHitOverride && (d >= effectiveReach * outerReachMult || ball.pos.z >= smashZCeiling || ballSpd < minSpdRequired)) {
    debugHitGate(gs, player, 'preReachGate', {
      d: +d.toFixed(2),
      reachGate: +(effectiveReach * outerReachMult).toFixed(2),
      ballZ: +ball.pos.z.toFixed(2),
      smashZCeiling: +smashZCeiling.toFixed(2),
      ballSpd: +ballSpd.toFixed(2),
      minSpdRequired: +minSpdRequired.toFixed(2),
    });
    return;
  }

  // ── Gate 2: Effective reach (final check after all modifiers) ──────
  if (!mustHitOverride && d >= effectiveReach) {
    debugHitGate(gs, player, 'outsideEffectiveReach', {
      d: +d.toFixed(2),
      effectiveReach: +effectiveReach.toFixed(2),
    });
    return;
  }

  // Receiver "touched" only once the ball is truly within their effective reach
  // Moving this AFTER effectiveReach check fixes the ace bug: balls passing within
  // baseReach but outside effectiveReach (stamina penalty) were blocking aces
  if (player.id === gs.receiver) gs.receiverTouched = true;

  const diff = Math.min(1, d / effectiveReach);
  const movementPressureBias = movementContactClass === 'EMERGENCY_REACH'
    ? 0.12
    : movementContactClass === 'LOW_BALL_PICKUP'
      ? 0.06
      : 0;
  if (ball.pos.z < THRESHOLDS.pressureBallZ || diff > THRESHOLDS.pressureReach || isGroundRolling)
    player.ctx.underPressure = true;
  // Reset underPressure: well-positioned (diff < 0.55) AND ball at good height
  // Threshold raised from 0.45→0.55: easier to exit pressure after the ball is reachable
  else if (diff + movementPressureBias < 0.55 && ball.pos.z >= 0.45)
    player.ctx.underPressure = false;
  player.ctx.rallyBalls++;

  // ══════════════════════════════════════════════════════════════════
  // QUALITY — ContactModel como fonte primária
  //
  // O ContactModel calcula todos os fatores físicos do golpe
  // (timing, prep, balance, fatigue, pressure, spin, volley type)
  // de forma multiplicativa. O resultado é a qualidade bruta do contato.
  //
  // Ajustes contextuais aplicados DEPOIS (não são fatores físicos):
  //   1. skillFactor     — atributos do jogador (refinamento fino)
  //   2. servePenalty    — velocidade do saque corroe o retorno
  //   3. carryPenalty    — encadeamento de pressão do golpe anterior
  //   4. weakReturnBoost — vantagem do sacador após return fraco
  //   5. positionCeiling — posição na quadra como teto absoluto
  // ══════════════════════════════════════════════════════════════════

  const coreShotPipeline = buildCoreShotPipeline(player, ball);
  assignCoreShotPipeline(player, coreShotPipeline);
  const prepFrac1 = player._prepFrac1 ?? 0;
  const prepFrac2 = player._prepFrac2 ?? 0;
  const prepScore = coreShotPipeline.prepScore;

  // ── ATP Shot Engine — Fase 1: Contact Space, Swing Prep, Feasibility ────────
  // Computados uma vez aqui, armazenados no player para uso em:
  //   evaluateContact()  → swingPrep.prepQuality como ceiling
  //   aiDecideShot()     → via ballCtx → buildContext() + generateCandidates()
  const _contactSpace = coreShotPipeline.contactSpace;
  const _swingPrep    = coreShotPipeline.swingPrep;
  const _feasibility  = coreShotPipeline.feasibility;
  // ────────────────────────────────────────────────────────────────────────────

  // ── Posição na quadra — teto absoluto ────────────────────────────
  // depthRatio: 0 = rede | 1.0 = baseline | >1.0 = atrás da baseline
  // Bater de muito atrás limita o teto independente de tudo mais.
  // RETRIEVER: penalidade reduzida — jogar atrás é escolha tática, não emergência.
  //   Um retriever bem treinado sabe bater na bola de lá; só não bate com intenção agressiva.
  //   O que muda não é a qualidade de contato, mas o alvo escolhido (shotWeights já refletem isso).
  const depthRatio = (player.pos.y * player.side) / COURT.halfL;
  // Retriever-like: low agressividade + high resistencia → plays deep
  const isRetrieverStyle = (player.attrs?.visaoTatica ?? player.attrs?.agressividade ?? 60) < 48 && (player.attrs?.resistencia ?? 60) >= 68;
  const depthPenaltyScale = isRetrieverStyle ? 0.35 : 0.75;
  let positionCeiling = depthRatio < 0.85
    ? 1.0
    : clamp(1.0 - (depthRatio - 0.85) * depthPenaltyScale, 0.52, 1.0);
  // Normal  — baseline (1.0) → teto 0.89 | 0.5m atrás → 0.80 | 1.5m → 0.67 | 2.5m+ → 0.52
  // Retriever — baseline (1.0) → teto 0.95 | 0.5m atrás → 0.93 | 1.5m → 0.90 | 2.5m+ → 0.87

  // ── ContactModel — fonte primária ────────────────────────────────
  const contactResult = coreShotPipeline.contactResult;
  const _executionState = coreShotPipeline.executionState;
  const defenseAttr  = player.attrs?.defesa ?? 60;
  const defenseMult  = player.mods?.defensaMult ?? (0.60 + (defenseAttr / 100) * 0.65);
  const tacticalRead = clamp(
    (player.mods?.visaoFactor ?? ((player.attrs?.visaoTatica ?? player.attrs?.agressividade ?? 60) / 100))
    + (player._adaptacaoBoost ?? 0) * 0.70,
    0.25,
    1.18
  );
  const defenseSkill = clamp(
    Math.max(0, defenseMult - 0.92) + Math.max(0, (defenseAttr - 50) / 100) * 0.55,
    0,
    0.42
  );
  const scrambleContact =
    contactResult.quality < 0.46 ||
    contactResult.balanceFactor < 0.80 ||
    contactResult.timingFactor < 0.84 ||
    prepScore < 0.42 ||
    (player._arrivalMargin ?? 0) < 0.08;
  const difficultContact =
    scrambleContact ||
    contactResult.quality < 0.60 ||
    (player.ctx?.rallyPressure ?? 0) > 0.55 ||
    depthRatio > 0.96;

  // ── Skill: refinamento fino por atributo (0.90–1.00) ─────────────
  // Amplitude estreita: atributos nunca compensam física ruim,
  // mas diferenciam jogadores de igual posicionamento.
  const isNetShot = player.atNet || player._volleyType === 'position' || player._volleyType === 'emergency' || player._volleyType === 'smash';
  // ── skillAttr: qualidade do golpe de fundo = mistura de potência e controle ──
  // Antes: só potência → jogador potente acertava qualidade alta mesmo sem precisão.
  // Agora: potência (55%) dá a velocidade e solidez do golpe;
  //        controle (45%) dá a consistência e precisão de contato.
  // Efeito real: potencia=90, controle=40 → skillAttr≈67 (forte mas impreciso)
  //              potencia=90, controle=85 → skillAttr≈88 (elite - força com controle)
  //              potencia=55, controle=80 → skillAttr≈66 (médio-forte mas muito consistente)
  // Isso torna potência uma VANTAGEM real (+velocidade +qualidade) sem ser a ÚNICA fonte
  // de qualidade — controle/precisão complementa e é igualmente importante.
  // v4: skillAttr é wing-aware — FH e BH têm potência/controle distintos
  // isNetShot usa volley (toque) ou smash (overhead) diretamente
  const _isBackhandHit = player._isBackhand ?? false;
  const _potAttr  = _isBackhandHit
    ? (player.attrs?.bhPotencia ?? player.attrs?.potencia ?? 50)
    : (player.attrs?.fhPotencia ?? player.attrs?.potencia ?? 50);
  const _ctrlAttr = _isBackhandHit
    ? (player.attrs?.bhControle ?? player.attrs?.controle ?? 50)
    : (player.attrs?.fhControle ?? player.attrs?.controle ?? 50);
  // Net: smash para overhead (lob recebido), volley para tudo mais
  const _netAttrKey = (player._volleyType === 'smash' || ((player.ctx?.lobsReceived ?? 0) > 0))
    ? 'smash' : 'volley';
  const skillAttr = isNetShot
    ? (player.attrs?.[_netAttrKey] ?? player.attrs?.jogoDeRede ?? 50)
    : Math.round(_potAttr * 0.55 + _ctrlAttr * 0.45);
  // skillFactor v2: 0.72–1.20 (era 0.82–1.12)
  // Diferença real entre attr 20 e attr 99: ~67% vs os ~27% anteriores.
  // Curva não-linear (quadrática): jogadores mediocres sofrem mais, elites ganham mais.
  //   attr 20  → 0.76  (era 0.88) — fraco sente a diferença em rallies neutros
  //   attr 40  → 0.88  (era 0.94) — abaixo da média, impacto real
  //   attr 50  → 0.94  (era 0.97) — médio, levemente abaixo do neutro
  //   attr 65  → 1.01  (era 1.02) — sólido, praticamente neutro
  //   attr 80  → 1.10  (era 1.06) — elite, diferença visível em rally neutro
  //   attr 99  → 1.20  (era 1.12) — topo, ~26% acima de attr 20 em absoluto
  // O ponto neutro (×1.0) está em ~attr 62 — jogador médio-forte não ganha nem perde.
  // Isso preserva o domínio do posicionamento/timing mas torna o atributo real em rallies.
  const t = (skillAttr / 100);
  const skillFactor = 0.72 + t * t * 0.28 + t * 0.20;

  // ContactModel × skill
  let qualityBase = clamp(contactResult.quality * skillFactor, 0.05, 1.0);

  if (!isNetShot) {
    const wingMult = _isBackhandHit
      ? (player._surfaceTalentFx?.backhandQualityMult ?? 1)
      : (player._surfaceTalentFx?.forehandQualityMult ?? 1);
    if (wingMult !== 1) qualityBase = clamp(qualityBase * wingMult, 0.05, 1.0);
    const wingFlat = _isBackhandHit
      ? ((player._surfaceTalentFx?.backhandQualityFlat ?? 0) / 100)
      : ((player._surfaceTalentFx?.forehandQualityFlat ?? 0) / 100);
    if (wingFlat !== 0) qualityBase = clamp(qualityBase + wingFlat, 0.05, 1.0);
  }

  if ((player._surfaceTalentFx?.lateContactPenaltyMult ?? 1) !== 1) {
    const timingStress = clamp((0.92 - (contactResult.timingFactor ?? 1)) / 0.22, 0, 1);
    if (timingStress > 0) {
      const relief = 1 + (1 - (player._surfaceTalentFx?.lateContactPenaltyMult ?? 1)) * timingStress;
      qualityBase = clamp(qualityBase * relief, 0.05, 1.0);
    }
  }
  if ((player._surfaceTalentFx?.lateContactReliefFlat ?? 0) !== 0) {
    const timingStress = clamp((0.92 - (contactResult.timingFactor ?? 1)) / 0.22, 0, 1);
    if (timingStress > 0) {
      qualityBase = clamp(qualityBase + ((player._surfaceTalentFx?.lateContactReliefFlat ?? 0) / 100) * timingStress, 0.05, 1.0);
    }
  }

  // ATRIBUTO jogoDeRede → bônus direto de qualidade em volleys
  // reflexoQualBonus: jogoDeRede=100 → +0.175 | jogoDeRede=50 → 0 | jogoDeRede=0 → -0.175
  // Aplicado em net shots: jogador de rede de elite (90+) acerta volleys muito melhores
  // Jogador de fundo com jogoDeRede baixo (30-) penaliza quando forçado à rede
  if (isNetShot && player.mods) {
    const netQual = (player.mods.reflexoQualBonus ?? 0) * 0.75; // max ±0.13 na qualidade
    qualityBase = clamp(qualityBase + netQual, 0.03, 1.0);
    const directNetAttr = _netAttrKey === 'smash'
      ? (player.attrs?.smash ?? player.attrs?.jogoDeRede ?? 50)
      : (player.attrs?.volley ?? player.attrs?.jogoDeRede ?? 50);
    const directNetBonus = ((directNetAttr - 50) / 100) * (_netAttrKey === 'smash' ? 0.18 : 0.16);
    if (directNetBonus !== 0) qualityBase = clamp(qualityBase + directNetBonus, 0.03, 1.0);
    const netTreeMult = _netAttrKey === 'smash'
      ? (player._surfaceTalentFx?.smashQualityMult ?? 1)
      : (player._surfaceTalentFx?.volleyQualityMult ?? 1);
    if (netTreeMult !== 1) qualityBase = clamp(qualityBase * netTreeMult, 0.03, 1.0);
    const netTreeFlat = _netAttrKey === 'smash'
      ? ((player._surfaceTalentFx?.smashQualityFlat ?? 0) / 100)
      : ((player._surfaceTalentFx?.volleyQualityFlat ?? 0) / 100);
    if (netTreeFlat !== 0) qualityBase = clamp(qualityBase + netTreeFlat, 0.03, 1.0);
  }

  // FASE 2.2 — Forma recente: qualityMod suaviza/amplifica qualidade base por surfaceForm
  {
    const qm = player._formMods?.qualityMod ?? 1.0;
    if (qm !== 1.0) {
      const dampedQm = 1 + (qm - 1) * 0.78;
      qualityBase = clamp(qualityBase * dampedQm, 0.05, 1.0);
    }
    const qf = (player._formMods?.qualityFlat ?? 0) / 100;
    if (qf !== 0) qualityBase = clamp(qualityBase + qf, 0.05, 1.0);
  }

  // Defesa agora atua explicitamente em scrambling e bolas profundas.
  // Ela não "anula" física ruim, mas preserva qualidade e eleva o teto de sobrevivência.
  if (!isNetShot && difficultContact && defenseSkill > 0) {
    const defenseBonus = defenseSkill * (scrambleContact ? 0.15 : 0.09);
    const tacticalReadMult = player._surfaceTalentFx?.tacticalReadMult ?? 1;
    const readBonus    = Math.max(0, tacticalRead - 0.50) * (scrambleContact ? 0.03 : 0.02) * tacticalReadMult;
    qualityBase = clamp(qualityBase + defenseBonus + readBonus + ((player._surfaceTalentFx?.tacticalReadFlat ?? 0) / 100), 0.05, 1.0);
    const defensiveQualityMult = player._surfaceTalentFx?.defensiveQualityMult ?? 1;
    if (defensiveQualityMult !== 1) qualityBase = clamp(qualityBase * defensiveQualityMult, 0.05, 1.0);
    const defensiveQualityFlat = (player._surfaceTalentFx?.defensiveQualityFlat ?? 0) / 100;
    if (defensiveQualityFlat !== 0) qualityBase = clamp(qualityBase + defensiveQualityFlat, 0.05, 1.0);
    if (depthRatio > 0.95 || scrambleContact) {
      const ceilingRelief = defenseSkill * (scrambleContact ? 0.12 : 0.07);
      positionCeiling = clamp(positionCeiling + ceilingRelief, 0.52, 1.0);
    }
  }

  // Visao tatica: explora quadra aberta e pune cegueira de padrao
  {
    const visaoBase = player.mods?.visaoFactor ?? ((player.attrs?.visaoTatica ?? player.attrs?.agressividade ?? 60) / 100);
    const visaoFactor = clamp(visaoBase + (player._adaptacaoBoost ?? 0) * 0.70, 0.20, 1.18);
    const oppOffCenter = Math.abs(opponent?.pos?.x ?? 0);
    const openCourtBonus = oppOffCenter > 1.5 ? (visaoFactor - 0.50) * 0.16 : 0;
    if (openCourtBonus !== 0) qualityBase = clamp(qualityBase + openCourtBonus, 0.03, 1.0);
    const sameDirStreak = player.ctx?.consecutiveSameDir ?? 0;
    const patternBlindness = (visaoFactor < 0.55 && gs.rally > 4 && sameDirStreak >= 3)
      ? (0.55 - visaoFactor) * 0.14
      : 0;
    if (patternBlindness > 0) qualityBase = clamp(qualityBase - patternBlindness, 0.03, 1.0);
  }

  // Recuperacao no set: sequencia de erros gera espiral em quem nao recupera bem
  {
    const consecutiveUE = player.ctx?.consecutiveUE ?? 0;
    if (consecutiveUE >= 3) {
      const recup = player.attrs?.recuperacao ?? player.attrs?.mentalidade ?? 70;
      const spiralRisk = (1 - recup / 100) * 0.15;
      qualityBase = clamp(qualityBase - spiralRisk, 0.03, 1.0);
    }
  }

  // ── Velocidade do saque: penalidade + bônus de retorno ──────────────────────
  // PENALIDADE (1º e 2º saque):
  //   FIX: threshold 120→145km/h (2º saque não penaliza), cap 0.32→0.44.
  //   Saques ATP elite (195-240km/h) agora corroem o retorno de verdade.
  //   Resultado: 240km/h → -44% Q | 210km/h → -29% Q | 185km/h → -18% Q | 160km/h → -7% Q
  //   (anterior era: 200km/h → -25% Q — pouco demais, retorno ficava quasi-neutro)
  //
  // BÔNUS (só saque lento / 2º saque):
  //   Returnista com devolucaoSaque alto tem leitura, antecipação e timing específico.
  //   Num 2º saque lento (<165km/h) esse repertório se converte em retorno agressivo.
  if (gs.ball._serveExitKmh && gs.rally === 0) {
    const kmh     = gs.ball._serveExitKmh;
    const retMult = player.mods?.returnMult ?? 0.82;
    const retAttr = (player.attrs?.devolucao ?? 60) / 100;

    // FIX: threshold 120→145: saques de 2º saque não penalizam o retorno.
    // Cap 0.32→0.44: saque de elite corroe o retorno com força real.
    // Divisor 216: (240-145)/216 ≈ 0.44 → cap exato para 240km/h.
    // Resultado: 240km/h → raw=0.44 | 210km/h → 0.30 | 185km/h → 0.185 | 160km/h → 0.069
    const rawPenalty   = clamp((kmh - 155) / 250, 0, 0.30);
    // retMult: devolucao=84 (Bjornstad) → ~0.93; devolucao=60 (Volkov) → ~0.77
    // Bom returnista sofre menos; fraco sofre brutal.
    const servePenalty = rawPenalty * clamp(2.10 - retMult * 1.20, 0.45, 1.30);
    qualityBase = Math.max(0.05, qualityBase - servePenalty);

    // Bônus de returnista em saque lento (2º saque / kick sem força)
    // slowFactor: 0 em 165km/h, max 0.35 em ≤140km/h
    // skillFactor: só returnistas excepcionais (retMult>0.92) ativam boost
    const slowFactor  = clamp((185 - kmh) / 40, 0, 0.50);
    const skillFactor = clamp((retMult - 0.75) / 0.25, 0, 1.0);
    const returnBoost = slowFactor * skillFactor * 0.25;
    if (returnBoost > 0) {
      qualityBase = Math.min(0.92, qualityBase + returnBoost);
    }
    if ((gs.ball._servePhysType ?? '') === 'KICK' && ball.pos.z <= 2.15) {
      qualityBase = Math.min(0.92, qualityBase + 0.05);
    }
    const returnSkillLift = clamp((retAttr - 0.50) * 0.38, -0.12, 0.20);
    if (returnSkillLift !== 0) {
      qualityBase = clamp(qualityBase + returnSkillLift, 0.05, 0.94);
    }
    if (player.id === gs.server) {
      const serveTreeMult = (gs.ball._serveNumber === 2)
        ? (player._surfaceTalentFx?.secondServeQualityMult ?? player._surfaceTalentFx?.serveQualityMult ?? 1)
        : (player._surfaceTalentFx?.serveQualityMult ?? 1);
      if (serveTreeMult !== 1) qualityBase = clamp(qualityBase * serveTreeMult, 0.05, 0.95);
      const serveTreeFlat = (gs.ball._serveNumber === 2)
        ? ((player._surfaceTalentFx?.secondServeQualityFlat ?? player._surfaceTalentFx?.serveQualityFlat ?? 0) / 100)
        : ((player._surfaceTalentFx?.serveQualityFlat ?? 0) / 100);
      if (serveTreeFlat !== 0) qualityBase = clamp(qualityBase + serveTreeFlat, 0.05, 0.95);
    }
  }

  // ── Encadeamento de pressão: golpe forte adversário corroe Q ─────
  // Q adversário ≤ 0.55 → sem penalidade
  // Q adversário = 0.75 → -0.09 | Q = 0.95 → -0.18
  {
    const opp = gs.players[1 - player.id];
    const oppQ = opp._lastQuality ?? 0.5;
    const carryPenalty = Math.max(
      0,
      clamp((oppQ - 0.55) * 0.45, 0, 0.20) * (player._surfaceTalentFx?.carryPressurePenaltyMult ?? 1)
      - ((player._surfaceTalentFx?.carryPressureReliefFlat ?? 0) / 100)
    );  // cap aumentado: pressão do sacador no +1/+2 deve ser sentida
    if (carryPenalty > 0) {
      qualityBase = Math.max(0.05, qualityBase - carryPenalty);
    }
  }

  // ── Vantagem do sacador após return fraco (ATP-realistic) ────────
  // Return fraco → sacador mantém vantagem posicional/qualidade até Bola 6.
  // Decai exponencialmente: B2:100% B3:80% B4:55% B5:30% B6:12% B7+:0%
  {
    const isServer = player.id === gs.server;
    const wrBoost  = player.ctx._weakReturnBoost ?? 0;
    if (isServer && wrBoost > 0) {
      const rallyAge    = gs.rally - (player.ctx._weakReturnRally ?? 0);
      // Serve advantage window — decai por bola jogada após o return
      // ATP real: vantagem do +1 é real e duradoura. Decay extendido:
      // B2:100% B3:88% B4:68% B5:45% B6:22% B7:08% B8+:0%
      const decayFactor = rallyAge <= 1 ? 1.00
                        : rallyAge === 2 ? 0.88
                        : rallyAge === 3 ? 0.68
                        : rallyAge === 4 ? 0.45
                        : rallyAge === 5 ? 0.22
                        : rallyAge === 6 ? 0.08
                        : 0;
      const effectiveBoost = wrBoost * decayFactor;
      if (effectiveBoost > 0) {
        qualityBase = Math.min(0.95, qualityBase + effectiveBoost);
      }
      if (decayFactor === 0) player.ctx._weakReturnBoost = 0;

      // ── FIX: Conectar SERVE_ADV_FINISH/PRESSURE ao currentIntent ──────────
      // SERVE_ADV_FINISH e SERVE_ADV_PRESSURE existiam em aiCoefficients.js
      // mas NUNCA eram lidos em nenhum arquivo. Letra morta.
      // Agora: boost alto → sacador entra em FINISH (ataque direto ao ponto);
      //        boost médio → PRESSURE (construção agressiva);
      //        boost baixo → BUILD (retorno mudou jogo, volta ao neutro).
      // currentIntent influencia température e scoring no decideShotAndBuild.
      if (effectiveBoost > 0) {
        const prevIntent = player.ctx.currentIntent ?? 'BUILD';
        if (effectiveBoost >= AI.INTENT.SERVE_ADV_FINISH * wrBoost) {
          player.ctx.currentIntent = 'FINISH';
        } else if (effectiveBoost >= AI.INTENT.SERVE_ADV_PRESSURE * wrBoost) {
          // Não rebaixar de FINISH para PRESSURE se já estava FINISH
          if (prevIntent !== 'FINISH') player.ctx.currentIntent = 'PRESSURE';
        } else {
          if (prevIntent === 'BUILD') player.ctx.currentIntent = 'BUILD';
        }
      }
    } else if (player.id === gs.server && (player.ctx._weakReturnBoost ?? 0) === 0) {
      // Boost expirou: resetar intent para BUILD (rally virou neutro)
      if (player.ctx.currentIntent === 'FINISH' || player.ctx.currentIntent === 'PRESSURE') {
        player.ctx.currentIntent = 'BUILD';
      }
    }
  }

  // ── Trait strengthBonus + clutchMult: efeitos contextuais de traits ──────
  {
    const traitFxEarly = getUnifiedPlayerTraitFx(player, gs);
    if (traitFxEarly.strengthBonus !== 0) {
      const surfaceTraitDamp = clamp(0.96 + Math.abs((gs.courtMods?.winnerMod ?? 1.0) - 1.0) * 0.10, 0.96, 1.04);
      qualityBase = clamp(qualityBase + traitFxEarly.strengthBonus * 0.0032 * surfaceTraitDamp, 0.05, 1.0);
    }
    // clutchMult: aplicado na qualidade base em momentos decisivos (break point, tiebreak, match point)
    // TIEBREAK_KILLER LEN 1.35× → qualidade sobe 35% neste momento específico
    if (traitFxEarly.clutchMult !== 1.0) {
      const _isBpOrTb = gs.inTiebreak
        || (Math.abs(gs.players[0].score - gs.players[1].score) <= 1
            && Math.max(gs.players[0].score, gs.players[1].score) >= 3);
      const _setsNeeded = gs.setsToWin ?? 2;
      const _opp = gs.players[1 - player.id];
      // MP: servidor com game point para fechar
      const _isMP_srv = !gs.inTiebreak && player.sets === _setsNeeded - 1 &&
        player.id === gs.server &&
        player.score >= 3 && player.score > _opp.score;
      // MP: receiver com break point para fechar
      const _isMP_rcv = !gs.inTiebreak && player.sets === _setsNeeded - 1 &&
        player.id === gs.receiver &&
        player.score >= 3 && player.score > _opp.score;
      // MP em tiebreak
      const _isMP_tb = gs.inTiebreak && player.sets === _setsNeeded - 1 &&
        gs.tbScore[player.id] >= 6 && gs.tbScore[player.id] > gs.tbScore[_opp.id];
      const _isMatchPt = _isMP_srv || _isMP_rcv || _isMP_tb;
      if (_isBpOrTb || _isMatchPt) {
        const clutchFactor = 1 + (traitFxEarly.clutchMult - 1) * (_isMatchPt ? 0.70 : 0.58);
        qualityBase = clamp(qualityBase * clutchFactor, 0.05, 1.0);
        const treePressureMult = player._surfaceTalentFx?.pressurePointQualityMult ?? 1;
        if (treePressureMult !== 1) qualityBase = clamp(qualityBase * treePressureMult, 0.05, 1.0);
        const treePressureFlat = (player._surfaceTalentFx?.pressurePointQualityFlat ?? 0) / 100;
        if (treePressureFlat !== 0) qualityBase = clamp(qualityBase + treePressureFlat, 0.05, 1.0);
      }
    }
    // formFloor: trava a forma mínima do jogador quando trait garante isso
    // INSTINTO_SLAM RAR: formFloor='GRANDE_FORMA' → _formMods.qualityMod nunca cai abaixo de 1.08
    if (traitFxEarly.formFloor && player._formMods) {
      const _floorMap = { BOA_FORMA: 1.04, GRANDE_FORMA: 1.08, IMPARAVEL: 1.14 };
      const _floorVal = _floorMap[traitFxEarly.formFloor] ?? 1.0;
      if ((player._formMods.qualityMod ?? 1.0) < _floorVal) {
        player._formMods.qualityMod = _floorVal;
        // Reaplicar o piso ao qualityBase atual
        qualityBase = clamp(qualityBase * (1 + (_floorVal - 1) * 0.72), 0.05, 1.0);
      }
    }
  }

  // ATRIBUTO mentalidade → mentalFactor: bônus/penalidade direto de qualidade em momentos decisivos
  // Calculado inline aqui pois o valor principal de mentalidade afeta a qualidade do golpe,
  // não apenas o cálculo de erro (que vem depois).
  // Coeff BP/TB: 0.38 | Normal: 0.10
  {
    const _isBpOrTb = gs.inTiebreak
      || (Math.abs(gs.players[0].score - gs.players[1].score) <= 1
          && Math.max(gs.players[0].score, gs.players[1].score) >= 3);
    const _crowd = gs.crowdPressure ?? 0;
    const _crowdTreeMult = player._surfaceTalentFx?.crowdPressureMult ?? 1;
    const _crowdAmp = Math.max(0.7, (_isBpOrTb ? 1 + _crowd * 0.40 : 1 + _crowd * 0.10) - ((player._surfaceTalentFx?.crowdPressureReliefFlat ?? 0) / 100)) * _crowdTreeMult;
    const _mentalBonus = mods
      ? (mods.mentalFactor - 0.60) * (_isBpOrTb ? 0.38 : 0.10) * _crowdAmp
      : 0;
    if (_mentalBonus !== 0) qualityBase = clamp(qualityBase + _mentalBonus, 0.03, 1.0);
    if (_isBpOrTb && mods) {
      const mentalFloor = 0.30 + (mods.mentalFactor - 0.50) * 0.28;
      qualityBase = Math.max(qualityBase, clamp(mentalFloor, 0.20, 0.55));
    }
  }

  // ── Teto de posição: limita o máximo pelo posicionamento na quadra ─
  const finalQuality = clamp(Math.min(qualityBase, positionCeiling), 0.05, 1.0);

  // Salvar resultado para uso posterior (erro, debug)
  player._contactResult = contactResult;
  player._lastQuality   = finalQuality;

  // ── SERVE ADVANTAGE WINDOW ────────────────────────────────────────────
  // Quando o return é fraco, sinaliza ao servidor vantagem nas próximas bolas
  // E semente rallyPressure do returner — ATP: return fraco = rally inteiro na defesa.
  // FIX: weakBoost máx aumentado 0.50 → 0.65; threshold mais alto (0.68 → 0.60 era)
  //   Agora: Q:0.72+ = return sólido (sem vantagem) | Q:0.50 → boost=0.19 | Q:0.20 → boost=0.58 | Q:0.05 → boost=0.65
  //   Impacto direto: sacador ataca MUITO mais forte no serve+1 após retorno médio ou fraco
  if (gs.rally === 0) {
    const server = gs.players[gs.server];
    const returnQ = finalQuality;
    // Threshold subiu para 0.72: qualquer retorno abaixo do "muito bom" já dá vantagem
    // Boost máx subiu para 0.65: sacador realmente domina após return ruim
    const weakBoost = clamp((0.72 - returnQ) / 0.72, 0, 1) * 0.65;
    server.ctx._weakReturnBoost = weakBoost;
    server.ctx._weakReturnRally = gs.rally;

    // ATP: return fraco → returner começa rally sob pressão posicional real.
    // FIX: threshold subiu 0.65 → 0.72 e max 0.80 → 0.92: pressão mais real após retorno médio
    // Q:0.72+ = sem pressão | Q:0.50 → 0.31 | Q:0.25 → 0.66 | Q:0.05 → 0.87
    const returnPressureSeed = clamp((0.72 - returnQ) / 0.72, 0, 1) * 0.92;
    if (returnPressureSeed > 0.02) {
      // player aqui é o returner (rally===0 && player.id===receiver)
      player.ctx.rallyPressure = Math.max(player.ctx.rallyPressure ?? 0, returnPressureSeed);
    }
  }

  // Acumula para Q médio de rally (exclui saques — rally === 0 é o retorno, não queremos contar o saque em si)
  player.stats.qualitySum   += finalQuality;
  player.stats.qualityCount += 1;
  // Individual Rating: deriva _tacticalState do currentIntent (nunca é atribuído explicitamente)
  // FINISH/PRESSURE → ATTACK | RESET → DEFEND | BUILD/? → NEUTRAL
  { const _i = player.ctx?.currentIntent;
    player._tacticalState = (_i === 'FINISH' || _i === 'PRESSURE') ? 'ATTACK'
                          : (_i === 'RESET')                        ? 'DEFEND'
                          : 'NEUTRAL';
  }
  if (player._tacticalState === 'ATTACK')      player.stats.attackShots++;
  else if (player._tacticalState === 'DEFEND') player.stats.defenseShots++;
  player._qualBreakdown = {
    final:           +finalQuality.toFixed(3),
    positionCeiling: +positionCeiling.toFixed(3),
    depthRatio:      +depthRatio.toFixed(3),
    prepFrac1:       +prepFrac1.toFixed(3),
    prepFrac2:       +prepFrac2.toFixed(3),
    prepScore:       +prepScore.toFixed(3),
    skillFactor:     +skillFactor.toFixed(3),
    skillAttr:       Math.round(skillAttr),
    diff:            +diff.toFixed(3),
    arrivalMargin:   +(player._arrivalMargin ?? 0).toFixed(3),
    // ContactModel
    contactQuality:  +contactResult.quality.toFixed(3),
    contactTiming:   +contactResult.timingFactor.toFixed(3),
    contactPrep:     +contactResult.prepFactor.toFixed(3),
    contactBalance:  +contactResult.balanceFactor.toFixed(3),
    contactFatigue:  +contactResult.fatigueFactor.toFixed(3),
    contactPressure: +contactResult.pressureFactor.toFixed(3),
    contactSpin:     +contactResult.spinControlFactor.toFixed(3),
    contactVolley:   +contactResult.volleyFactor.toFixed(3),
    // ATP Shot Engine — Fase 1
    cs_heightZone:   _contactSpace.heightZone,
    cs_offsetZone:   _contactSpace.offsetZone,
    cs_prepWindow:   _contactSpace.prepWindowClass,
    cs_qCeiling:     +_contactSpace.qCeiling.toFixed(3),
    sp_swingType:    _swingPrep.swingType,
    sp_prepQuality:  +_swingPrep.prepQuality.toFixed(3),
    sp_prepTime:     +_swingPrep.prepTimeFactor.toFixed(3),
    sp_balance:      +_swingPrep.balanceFactor.toFixed(3),
    sp_footwork:     +_swingPrep.footworkFactor.toFixed(3),
    ex_state:        _executionState.state,
    ex_label:        _executionState.label,
    fm_viableShots:  _feasibility.getViableShots().join(','),
  };
  // Reset prep timer após bater — preparação "consumida"
  player._prepTime           = 0;
  player._prepFrac1          = 0;
  player._prepFrac2          = 0;
  player._approachInitialized = false;

  // ── Patience: only try winners after enough rally shots ───────
  // rallyLengthMult > 1 (saibro) → precisa de mais bolas antes de arriscar winner → rally mais longo
  // rallyLengthMult < 1 (grama)  → agride mais cedo → ponto mais rápido
  const rallyLenMult     = gs.courtMods?.rallyLengthMult ?? 1.0;
  const basePatience     = mods ? mods.patienceRallyMin : THRESHOLDS.errorRallyMin;
  const patienceThreshold = Math.round(basePatience * rallyLenMult);
  const pastPatienceMin   = gs.rally > patienceThreshold && ball.bounceCount >= 1;

  const sty = player.styleData;
  // ── Trait effects ─────────────────────────────────────────────────────────
  const traitFx    = getUnifiedPlayerTraitFx(player, gs);
  const rallyPressure = player.ctx.rallyPressure ?? 0;
  const mentalFactor = mods?.mentalFactor ?? ((player.attrs?.mentalidade ?? 60) / 100);
  const effectiveRallyPressure = clamp(rallyPressure * (1.40 - mentalFactor * 0.80), 0, 1.2);

  // ── ATP Shot Engine: contexto físico armazenado para classificação UE/FE pós-scatter ──
  // resolveNet / resolveOutOfBounds lêem _lastHitDiff para distinguir UE de FE.
  // FE: jogador esticado (diff >= forcedErrorDiff) ou sob pressão acumulada.
  // UE: erro emergiu do σX gaussiano em bola confortável — física, sem sorteio.
  player._lastHitDiff     = diff;
  player._lastHitPressure = effectiveRallyPressure;

  // Pass finalQuality into shot decision
  const velBefore = { x: ball.vel.x, y: ball.vel.y, z: ball.vel.z };

  // ── Return intent: pre-compute hint for serve return (rally===0) ──────────
  // This seeds the receiver's ctx with a hint that the EV system uses.
  if (gs.rally === 0 && player.id === gs.receiver) {
    const sv = gs.players[gs.server];
    computeReturnIntent(player, sv, ball, finalQuality, gs.rally);
  }

  // Atualiza _matchRead antes de cada decisão — alimenta adaptação mid-match em shotDecision.js
  readMatchContext(player, gs.players[1 - player.id]);

  // ── Wing detection (v4): determina se é BH ou FH ─────────────────
  // Aproximação: jogador destro → BH = bola à esquerda do corpo (x < player.pos.x)
  // Player.side=-1 (topo da quadra) inverte o eixo Y, mas X é simétrico.
  // _handedness: 'right' por padrão (pode ser 'left' para canhoto — future use).
  {
    const bx   = ball.pos.x;
    const px   = player.pos.x;
    const hand = player.handedness ?? 'right';
    // Direito: BH quando bola vem pela esquerda; canhoto: BH pela direita.
    player._isBackhand = hand === 'left'
      ? (bx > px + 0.15)
      : (bx < px - 0.15);
  }
  player._wingIdentity = deriveWingIdentity(player);

  const shot = aiDecideShot(player, ball, gs.players[1 - player.id], finalQuality, {
    isSlowBall,
    isGroundRolling,
    gsRally: gs.rally,
    // ATP Shot Engine — dados de contato para shotDecision.js (Phase 3)
    contactSpace: player._contactSpace,
    swingPrep:    player._swingPrep,
    feasibility:  player._feasibility,
    executionState: player._executionState,
    pipeline: coreShotPipeline,
    // Shot System v4 — importância do ponto para cálculo de pressão (Camada 6)
    scoreState:   _computeScoreImportance(player, gs),
    // v4 Wing context
    isBackhand:   player._isBackhand,
  });

  // trace.js lê _shotEvProb para display — mantido sem lógica de erro
  player._shotEvProb = {
    error: null,
    win:   player._aiTrace?.chosen?._evProbWin ?? null,
  };

  // ── Signature Shot: bônus de qualidade quando o golpe assinatura foi escolhido ──
  // O ai.js já boosted o EV do candidato (mais frequência). Aqui boosted a
  // qualidade de execução: o golpe favorito sai melhor — mas ainda pode errar.
  // Ex: DROP_SHOT com qualityBonus=0.09 e finalQuality=0.45 →
  //   bonus = 0.09 * MULT(1.22) = +10%  → qualidade sobe para 0.50 (capped 0.92)
  const _isSigShot = !!(shot?._sigQualityBonus > 0);
  let finalQualityBoosted = finalQuality;
  if (_isSigShot) {
    const sigBonus = shot._sigQualityBonus * CONTACT.SIG_QUALITY_MULT;
    finalQualityBoosted = clamp(
      finalQuality * (1 + sigBonus),
      finalQuality,          // nunca reduz
      CONTACT.SIG_QUALITY_CAP
    );
    // Atualiza _lastQuality com o valor boosted (UI e encadeamento usam isso)
    player._lastQuality = finalQualityBoosted;
  }
  // Reatribuir finalQuality local para o restante do fluxo usar o valor correto
  // (usa const rebind via let — já declarado como const acima, criamos alias)
  let effectiveQuality = finalQualityBoosted;

  // ATRIBUTO leitura → bônus de qualidade em passing shots
  // Quando adversário está na rede, leitura alta melhora o passing diretamente.
  // leitura=30: -0.020 | leitura=50: neutro | leitura=70: +0.020 | leitura=99: +0.049
  {
    const _opp = gs.players[1 - player.id];
    if (_opp?.atNet && !player.atNet) {
      const _leituraBonus = ((player.attrs?.leitura ?? 50) - 50) / 100 * 0.10;
      if (_leituraBonus !== 0) {
        effectiveQuality = clamp(effectiveQuality + _leituraBonus * (player._surfaceTalentFx?.passingQualityMult ?? 1) + ((player._surfaceTalentFx?.passingQualityFlat ?? 0) / 100), 0.03, 1.0);
        player._lastQuality = effectiveQuality;
      }
    }
  }

  // ATRIBUTO topspin/slice atua em camadas:
  // 1) pressao do spin recebido no contato atual
  // 2) qualidade extra no proprio golpe
  // 3) consistencia lateral do slice via sigma em ballOutputEngine
  if (shot && gs.rally > 1) {
    const incomingSpinDir = (ball.spin?.x ?? 0) * (-(Math.sign(ball.vel?.y ?? 0) || 1));
    const incomingTopspin = Math.max(0, incomingSpinDir);
    const incomingSlice = Math.max(0, -incomingSpinDir);
    const topspinPressure = Math.max(0, (incomingTopspin - 1.2) / 3.0) * 0.14;
    const slicePressure = Math.max(0, (incomingSlice - 0.8) / 2.5) * 0.11;
    const spinPressure = Math.min(0.20, topspinPressure + slicePressure);
    if (spinPressure > 0.002) {
      effectiveQuality = clamp(effectiveQuality * (1 - spinPressure), 0.03, 1.0);
      player._lastQuality = effectiveQuality;
    }
  }

  if (shot) {
    if (shot.type === 'TOPSPIN' || shot.type === 'DRIVE') {
      const _topBonus = ((player.attrs?.topspin ?? 50) - 50) / 100 * (shot.type === 'DRIVE' ? 0.08 : 0.14);
      if (_topBonus !== 0) {
        effectiveQuality = clamp(effectiveQuality + _topBonus, 0.03, 1.0);
        player._lastQuality = effectiveQuality;
      }
    } else if (shot.type === 'SLICE' || shot.type === 'SLICE_SHORT' || shot.type === 'DROP' || shot.type === 'DROP2' || shot.type === 'HALF_VOLLEY') {
      const _slcBonus = ((player.attrs?.slice ?? 50) - 50) / 100
        * (shot.type === 'HALF_VOLLEY' ? 0.08 : shot.type === 'DROP' || shot.type === 'DROP2' ? 0.05 : 0.11);
      if (_slcBonus !== 0) {
        effectiveQuality = clamp(effectiveQuality + _slcBonus, 0.03, 1.0);
        player._lastQuality = effectiveQuality;
      }
    }
    const _shotTreeFx = player._surfaceTalentFx ?? {};
    const _shotTypeKey = shot.type;
    const _shotTreeQuality = (_shotTreeFx.shotQualityFlatMap?.[_shotTypeKey] ?? 0) / 100;
    if (_shotTreeQuality !== 0) {
      effectiveQuality = clamp(effectiveQuality + _shotTreeQuality, 0.03, 1.0);
      player._lastQuality = effectiveQuality;
    }
    const _shotCritChance = (_shotTreeFx.shotCritChanceFlatMap?.[_shotTypeKey] ?? 0) / 100;
    if (_shotCritChance > 0 && Math.random() < _shotCritChance) {
      const _shotCritQuality = (_shotTreeFx.shotCritQualityFlatMap?.[_shotTypeKey] ?? 0) / 100;
      const _critFloor = clamp(0.80 + _shotCritQuality, 0.80, 0.96);
      effectiveQuality = Math.max(effectiveQuality, _critFloor);
      player._lastQuality = effectiveQuality;
      shot._treeCrit = true;
    }
    if (!isNetShot && difficultContact && defenseSkill > 0) {
      const isDefensiveShot = shot.type === 'SLICE' || shot.type === 'TOPSPIN'
        || shot.type === 'HALF_VOLLEY'
        || shot.type === 'LOB_DEF' || shot.type === 'LOB_ATK';
      if (isDefensiveShot) {
        const recoveryBonus = defenseSkill * (
          shot.type === 'SLICE' || shot.type === 'LOB_DEF' || shot.type === 'HALF_VOLLEY'
            ? (scrambleContact ? 0.18 : 0.12)
            : (scrambleContact ? 0.12 : 0.08)
        );
        if (recoveryBonus > 0) {
          effectiveQuality = clamp(effectiveQuality + recoveryBonus, 0.03, 1.0);
          player._lastQuality = effectiveQuality;
        }
      }
    }
  }

  // ── [POT v1] Pressão de pace — bola pesada comprime qualidade do retorno ──
  // Quanto mais rápida a bola recebida, menor a janela de execução do rebatedor.
  // Só age em rally (gs.rally > 1) e não em saque (firstServe/secondServe).
  // Não pune saque: saque tem seu próprio sistema de velocidade/retorno.
  // Devolução alta mitiga parcialmente a penalidade (leitura + timing).
  //
  // Referência de pace (vel horizontal XY antes do hit, em m/s):
  //   18 m/s (65 km/h)  → pressão zero    — bola lenta, sem compressão
  //   26 m/s (94 km/h)  → pressão −0.088  — bola pesada, QD cai ~9%
  //   34 m/s (122 km/h) → pressão −0.176  — bomba, QD cai ~18%
  //   38 m/s (137 km/h) → pressão −0.220  — limite, QD cai ~22%
  {
    const _isRally = gs.rally > 1;
    const _isServe = shot?.type === 'SERVE' || shot?.type === 'SERVE2';
    if (_isRally && !_isServe) {
      const _incomingPace = Math.sqrt(ball.vel.x ** 2 + ball.vel.y ** 2); // m/s horizontal
      const _paceThreshold = 18; // m/s — abaixo disso, sem penalidade
      const _paceMax = 20;       // range de normalização
      const _rawPressure = Math.max(0, (_incomingPace - _paceThreshold) / _paceMax);
      // Devolução mitiga até 35% da pressão (leitura + timing compensa pace)
      const _devAttr = player.attrs?.devolucao ?? 50;
      const _devMitigation = 0.65 + (_devAttr / 100) * 0.35;
      const _pacePressure = Math.min(0.22, _rawPressure * 0.22) * _devMitigation;
      if (_pacePressure > 0.005) {
        effectiveQuality = clamp(effectiveQuality * (1 - _pacePressure), 0.03, 1.0);
        player._lastQuality = effectiveQuality;
      }
    }
  }

  // ── Forçar VOLLEY para voleios de posição e emergência ───────────────────
  // aiDecideShot pode ter escolhido outro tipo (FLAT, TOPSPIN) pois atNet=false.
  // Corrigimos aqui: se o jogador interceptou antes do quique via posição/emergência,
  // o shot DEVE ser VOLLEY fisicamente.
  const _volleyType = player._volleyType;
  if (shot && (_volleyType === 'position' || _volleyType === 'emergency') && shot.type !== 'SMASH') {
    shot.type = 'VOLLEY';
  }
  player._volleyType = null; // limpa após uso

  // ── Debug instrumentation: registra SHOT_EVENT para mapas de análise ──
  if (!gs.debugEvents) gs.debugEvents = [];
  if (gs.debugEvents.length < 2000) {
    const _HALF_W = 4.115, _HALF_L = 11.885;
    const absX = Math.abs(shot.targetX);
    // dirLabel: CC = cross-court, DTL = down the line, BODY = central
    // Para P0 (y > 0, joga para cima): DTL = mesmo lado do corpo, CC = lado oposto
    const playerSideSign = player.id === 0 ? 1 : -1;
    const dirLabel = absX > 1.5
      ? (shot.targetX * playerSideSign > 0 ? 'DTL' : 'CC')
      : 'BODY';
    const absY = Math.abs(shot.targetY);
    const depthBucket = absY > _HALF_L * 0.78 ? 'DEEP' : absY > _HALF_L * 0.45 ? 'MID' : 'SHORT';
    const widthBucket = absX > 2.8 ? 'WIDE' : absX > 1.2 ? 'MID' : 'CENTRE';
    // ── Shot Intent Overlay: ctrlAttr e sigma pré-calculados ──────────────────
    const _isBackhandHit_dbg = player._isBackhand ?? false;
    const _ctrlAttr_dbg = _isBackhandHit_dbg
      ? (player.attrs?.bhControle ?? player.attrs?.controle ?? 50)
      : (player.attrs?.fhControle ?? player.attrs?.controle ?? 50);
    const _sigmaEst = Math.round(computeSigmaX(
      shot.type, effectiveQuality, shot.targetX,
      COURT.singlesW / 2, _ctrlAttr_dbg, player.attrs?.potencia ?? 50,
      undefined, player.pos.x
    ) * 1000) / 1000;
    gs.debugEvents.push({
      type: 'SHOT_EVENT',
      rallyBallIndex: gs.rally,
      playerId: player.id,
      playerSide: player.side,     // +1 = P0 (bottom), -1 = P1 (top)
      ctrlAttr: _ctrlAttr_dbg,    // wing-aware control, for sigma display
      sigma: _sigmaEst,            // pre-computed scatter radius (metres)
      shotType: shot.type,
      spin: shot.spinType ?? 'FLAT',
      power: Math.round(shot.power * 3.6),  // km/h
      fromX: player.pos.x,
      fromY: player.pos.y,
      intentX: shot.targetX,      // aim BEFORE targetBias + gaussian scatter
      intentY: shot.targetY,      // aim BEFORE targetBias + gaussian scatter
      toX: shot.targetX,
      toY: shot.targetY,
      quality: Math.round(effectiveQuality * 100) / 100,
      executionState: shot._executionState ?? player._executionState?.state ?? 'NEUTRAL',
      netPhase: shot._netPhase ?? player.ctx?.netPhase ?? 'BASE',
      wingIdentity: shot._wingIdentity ?? player._wingIdentity?.dominantWing ?? 'BALANCED',
      pointPattern: shot._pointPattern ?? player.ctx?._pointPatternPlan?.name ?? null,
      tacticalState: player._tacticalState ?? 'NEUTRAL',
      underPressure: player.ctx.underPressure ?? false,
      dirLabel,
      depthBucket,
      widthBucket,
      netClearance: shot.netClearance,
      hitHeight: shot.hitHeight,
      actualSpinX: shot.spinX,
      actualSpinZ: shot.spinZ,
      targetDepthFrac: shot.targetDepthFrac ?? null,
      executionQuality: shot.executionQuality ?? effectiveQuality,
      motive: shot._motive ?? null,
      pressureAfter: player.ctx?.rallyPressure ?? 0,
    });
    auditRegisterShot(gs, player, shot, effectiveQuality);
    gs.liveAuditSnap = buildLiveAuditSnapshot(gs);
    // Salva alvo e contato na bola para o bounceLog associar ao quique
    ball._lastTargetX = shot.targetX;
    ball._lastTargetY = shot.targetY;
    ball._lastContactX = player.pos.x;
    ball._lastContactY = player.pos.y;
    // ── Trace: registrar decisão da IA ──
    traceLogShot(gs, player, shot, effectiveQuality);
  }

  // ── Target Bias — centro do alvo migra para o meio quando Q é baixo ─────────
  //
  // Inspirado na observação de que em Q baixo o jogador não consegue executar
  // a intenção de mirar na linha — o centro REAL da distribuição se desloca
  // para o meio da quadra, não apenas dispersa ao redor do alvo declarado.
  //
  // Um FLAT DTL com Q=0.18 não aterrissa ao redor da linha lateral com σ grande:
  // ele vai, na prática, para o meio da quadra (CC) com σ grande.
  // Com Q=0.95 o jogador pode mirar e executar DTL com precisão real.
  //
  // Curva de bias: suave, não-linear, só ativa abaixo de Q=0.70.
  //   Q=0.70 → bias=0.00 (nenhum desvio — golpe sólido executa a intenção)
  //   Q=0.50 → bias=0.09 (9% em direção ao centro)
  //   Q=0.30 → bias=0.22 (22% — golpe pressionado, alvo efetivo recua bastante)
  //   Q=0.18 → bias=0.33 (33% — emergência, o jogador "mira no meio" de facto)
  //   Q=0.05 → bias=0.44 (44% — reflexo puro, quase sem intenção direcional)
  //
  // O bias é aplicado apenas no eixo X (lateral) — o eixo que representa a
  // escolha CC/DTL/WIDE. O eixo Y (profundidade) tem seu próprio controle via σY.
  // Shots especiais (DROP, LOB, SMASH) ficam imunes — têm física própria.
  //
  if (!['DROP','DROP2','LOB_ATK','LOB_DEF','LOB_DEF','SMASH','HALF_VOLLEY'].includes(shot.type)) {
    const _biasFactor = effectiveQuality >= 0.70
      ? 0
      : clamp(Math.pow((0.70 - effectiveQuality) / 0.70, 1.4) * 0.45, 0, 0.44);
    if (_biasFactor > 0.005) {
      // Lerp: targetX → 0 (centro lateral da quadra) na proporção do bias
      shot.targetX = shot.targetX * (1.0 - _biasFactor);
    }
  }

  // ── Quality Scatter — pipeline única: Aim → σ(Q, ctrl, shotType) → Gaussian → land ──
  //
  // Ninguém mira pra fora. O jogador sempre mira em shot.targetX/Y (dentro da quadra).
  // σ vem do ballOutputEngine por shot type com física ATP calibrada:
  //   σBase  → erro residual fixo, existe mesmo em Q perfeito (pros erram ~28 UE/jogo)
  //   σXMax  → desvio máximo em Q=0, por shot type (FLAT > TOPSPIN > SLICE)
  //   dirRisk → DTL ×1.6, WIDE ×2.2 (menor margem lateral nessas direções)
  //   ctrlDiv → controle divide o σ (ctrl=99 → σ −39%)
  //
  // Erro emerge das tails da gaussiana quando a bola pousa perto das linhas.
  // Não há roll separado — a física resolve tudo.
  //
  const _isSpecialShot = shot.type === 'DROP' || shot.type === 'DROP2' || shot.type === 'LOB_ATK' ||
                         shot.type === 'LOB_DEF' || shot.type === 'SMASH' ||
                         shot.type === 'HALF_VOLLEY';
  if (!_isSpecialShot) {
    const _sigma = computeSigmaX(
      shot.type,
      effectiveQuality,
      shot.targetX,
      COURT.singlesW / 2,
      _ctrlAttr,
      _potAttr,
      undefined,
      player.pos.x,
      player.attrs
    );
    const adaptacaoFactor = player.mods?.adaptacaoFactor ?? ((player.attrs?.adaptacao ?? 60) / 100);
    const errorDirStreak = player.ctx?.errorDirStreak ?? 0;
    const lastErrorDir = player.ctx?.lastErrorDir ?? 0;
    const shotDir = shot.targetX > 0.5 ? 1 : shot.targetX < -0.5 ? -1 : 0;
    const patternCorrection = (adaptacaoFactor > 0.65 && errorDirStreak >= 2 && shotDir !== 0 && shotDir === lastErrorDir)
      ? (adaptacaoFactor - 0.65) * 0.30
      : 0;
    const sigma = patternCorrection > 0 ? _sigma * (1 - clamp(patternCorrection, 0, 0.25)) : _sigma;
    if (sigma > 0.03) {
      const _poorQ = clamp((0.55 - effectiveQuality) / 0.55, 0, 1);
      const _sigmaSpreadMult = 1 + _poorQ * 0.90;
      const _u1 = Math.max(1e-6, Math.random());
      const _u2 = Math.random();
      const _r   = Math.min(2.5, Math.sqrt(-2.0 * Math.log(_u1)));
      const _th  = 2.0 * Math.PI * _u2;

      // Y spread dinâmico: Q alto → compressão Y (spread lateral dominante)
      // Q baixo → spread Y cresce até igualar X (mishit em qualquer direção)
      // Q=0.90→yMult=0.60 | Q=0.50→yMult=0.78 | Q=0.25→yMult=0.95 | Q=0.05→yMult=1.12
      const _yMult = clamp(0.58 + (1.0 - effectiveQuality) * 0.72 + _poorQ * 0.26, 0.58, 1.42);

      shot.targetX += _r * Math.cos(_th) * sigma * _sigmaSpreadMult;
      shot.targetY += _r * Math.sin(_th) * sigma * _sigmaSpreadMult * _yMult;

      // Y bounds: Q < 0.28 + ctrl baixo = mishit total (sem floor mínimo)
      const _ySign   = Math.sign(shot.targetY) || (player.side > 0 ? -1 : 1);
      // FIX: para shots normais, cap Y DENTRO da quadra (halfL - 10cm).
      // Antes: halfL + 2.0 = 13.88m — permitia scatter 2m além da baseline, causando
      // falha do solver (tentava atingir target impossível → não conseguia limpar rede → NET).
      // Agora: cap em halfL - 0.10 garante que o solver sempre tem uma trajetória válida.
      // Para mishits (Q<0.28 + ctrl<55) mantemos o range maior (comportamento caótico intencional).
      const _maxAbsY = COURT.halfL + 2.0 + _poorQ * 1.2; // mishit: range largo intencional
      const _normalMaxAbsY = COURT.halfL - 0.10 + _poorQ * 1.55; // q ruim: alvo pode escapar para fora
      const _isMishit = effectiveQuality < 0.36 && _ctrlAttr < 62;
      const _minAbsY = effectiveQuality < 0.22
        ? 3.1
        : effectiveQuality < 0.36
          ? 2.2
          : 0.25;
      if (_isMishit) {
        shot.targetY = _ySign * clamp(Math.abs(shot.targetY), _minAbsY, _maxAbsY);
      } else {
        shot.targetY = _ySign * clamp(Math.abs(shot.targetY), _minAbsY, _normalMaxAbsY);
      }
      const _xSign = Math.sign(shot.targetX) || 1;
      const _maxAbsX = COURT.singlesW / 2 + 3.5 + _poorQ * 1.2;
      if (Math.abs(shot.targetX) > _maxAbsX) shot.targetX = _xSign * _maxAbsX;
    }
  }

  // Convert spinType string to numeric for physics engine
  const _spinNum = shot.spinType === 'TOP' ? 1 : shot.spinType === 'SLICE' ? -1 : SPIN_MAP[shot.type] ?? 0;

  // ATRIBUTO potencia → velocidade fisica da bola (ballSpeedMult)
  // potencia 30 → bola 13% mais lenta | potencia 70 → +10% | potencia 99 → +25%
  // Não aplicar em DROP (velocidade baixa é intencional) nem SMASH (já tem boost de signature)
  const _isSpeedShot = shot.type !== 'DROP' && shot.type !== 'DROP2' && shot.type !== 'DEF_LOB' && shot.type !== 'AGG_LOB';
  // v4: velocidade da bola depende da asa usada
  const _ballSpd = _isSpeedShot
    ? (_isBackhandHit
        ? (mods?.bhBallSpeedMult ?? mods?.ballSpeedMult ?? 1.0)
        : (mods?.fhBallSpeedMult ?? mods?.ballSpeedMult ?? 1.0))
    : 1.0;
  const _flightProfile =
    shot.flightProfile ??
    (shot.type === 'SLICE_SHORT'
      ? { vzMin: -1.20, vzMax: 1.85, maxLandingError: 0.70, netMinZ: COURT.netHeight + 0.010, strictArc: true, solverSpinScale: 2.2 }
      : null);

  const preHitVel = { x: ball.vel.x, y: ball.vel.y, z: ball.vel.z };
  const preHitLastBy = ball.lastHitBy;
  const preHitBounceCount = ball.bounceCount;
  const preHitIsFirstBounce = gs.isFirstBounce;
  const preHitPos = { x: ball.pos.x, y: ball.pos.y, z: ball.pos.z };
  const requiresStrictHitValidation = outsideAfterBounce && !mustHitOverride;
  launchBall(ball, player.pos, shot.targetX, shot.targetY, _spinNum,
             shot.power * _ballSpd, shot.netClearance, shot.hitHeight,
             shot.spinX, shot.spinZ, _flightProfile ? { flightProfile: _flightProfile } : null);
  // spin.x e spin.z já passados para launchBall — solver usa os valores reais.
  ball._isDropShot = shot.type === 'DROP' || shot.type === 'DROP2';
  ball._dropVariant = ball._isDropShot ? shot.type : null;

  // Propaga modificadores de quique de signature para o ball
  // (consumidos em physics.js no primeiro quique)
  if (shot._sigBounce     != null) ball._sigBounce     = shot._sigBounce;
  if (shot._sigBounceSpin != null) ball._sigBounceSpin = shot._sigBounceSpin;

  {
    const _shotTreeFx = player._surfaceTalentFx ?? {};
    const _shotTypeKey = shot.type;
    const _shotPowerFlat = _shotTreeFx.shotPowerFlatMap?.[_shotTypeKey] ?? 0;
    const _shotSpinFlat = _shotTreeFx.shotSpinFlatMap?.[_shotTypeKey] ?? 0;
    const _shotBounceFlat = _shotTreeFx.shotBounceFlatMap?.[_shotTypeKey] ?? 0;

    if (_shotPowerFlat !== 0) {
      const _powerMult = 1 + (_shotPowerFlat / 100) * 0.45;
      ball.vel.x *= _powerMult;
      ball.vel.y *= _powerMult;
    }
    if (_shotSpinFlat !== 0) {
      const _spinMult = 1 + (_shotSpinFlat / 100) * 0.55;
      ball.spin.x *= _spinMult;
      ball.spin.z *= _spinMult;
    }
    if (_shotBounceFlat !== 0) {
      const _bounceMult = clamp(1 + (_shotBounceFlat / 100) * 0.80, 0.70, 1.30);
      const _bounceSpinMult = clamp(1 + (_shotBounceFlat / 100) * 0.35, 0.78, 1.22);
      ball._sigBounce = (ball._sigBounce ?? 1) * _bounceMult;
      ball._sigBounceSpin = (ball._sigBounceSpin ?? 1) * _bounceSpinMult;
    }
  }

  // ── Signature Shot: quality bonus na saída da bola ─────────────
  // Quando o golpe assinatura é executado, a bola sai com velocidade
  // ligeiramente maior — reflete a superioridade técnica no golpe preferido.
  if (shot._sigQualityBonus && shot._sigQualityBonus > 0) {
    const boost = 1 + shot._sigQualityBonus * 0.15;
    ball.vel.x *= boost;
    ball.vel.y *= boost;
    // Não amplificamos z para não alterar a trajetória vertical
  }

  // ── [PATCH v2] Golpes ofensivos ruins mantêm mais carry que bolas defensivas ruins ──
  // Isso preserva a cara do golpe agressivo mesmo quando a execução sai ruim.
  const _isAggressiveShot =
    shot.type === 'ACCEL' ||
    shot.type === 'SHORT_ACCEL' ||
    shot.type === 'DRIVE' ||
    shot.type === 'TOPSPIN';
  const _isDropShot = shot.type === 'DROP' || shot.type === 'DROP2';

  if (_isDropShot) {
    const _dropDamp = effectiveQuality < 0.25
      ? 0.92
      : effectiveQuality < 0.40
        ? 0.96
        : 0.99;
    ball.vel.x *= _dropDamp;
    ball.vel.y *= _dropDamp;
  } else if (effectiveQuality < 0.25) {
    const _damp = _isAggressiveShot ? 0.8 : 0.68;
    ball.vel.x *= _damp;
    ball.vel.y *= _damp;
  } else if (effectiveQuality < 0.40) {
    const _damp = _isAggressiveShot ? 0.88 : 0.78;
    ball.vel.x *= _damp;
    ball.vel.y *= _damp;
  } else if (effectiveQuality < 0.52) {
    const _damp = _isAggressiveShot ? 0.94 : 0.88;
    ball.vel.x *= _damp;
    ball.vel.y *= _damp;
  }

  if (requiresStrictHitValidation) {
    const returnsTowardOpponent = Math.sign(ball.vel.y) === -player.side;
    const horizontalSpeed = Math.sqrt(ball.vel.x ** 2 + ball.vel.y ** 2);
    const meaningfulSpeed = horizontalSpeed > (outsideAfterBounce ? 1.6 : 1.9);
    const prevAngle = Math.atan2(preHitVel.y, preHitVel.x);
    const nextAngle = Math.atan2(ball.vel.y, ball.vel.x);
    const rawAngleDelta = Math.abs(nextAngle - prevAngle);
    const directionDelta = Math.min(rawAngleDelta, Math.abs(rawAngleDelta - Math.PI * 2));
    const meaningfulRedirect =
      directionDelta > (outsideAfterBounce ? 0.22 : 0.30) ||
      Math.sign(ball.vel.y) !== Math.sign(preHitVel.y);
    const advancedAwayFromBody =
      Math.abs(ball.pos.y - preHitPos.y) > 0.10 ||
      Math.abs(ball.pos.x - preHitPos.x) > 0.08;
    const notDeadened =
      Math.abs(ball.vel.y) > Math.max(0.8, Math.abs(preHitVel.y) * 0.18) ||
      Math.abs(ball.vel.x) > Math.max(0.55, Math.abs(preHitVel.x) * 0.18);
    if (!returnsTowardOpponent || !meaningfulSpeed || !meaningfulRedirect || !advancedAwayFromBody || !notDeadened) {
      ball.vel.x = preHitVel.x;
      ball.vel.y = preHitVel.y;
      ball.vel.z = preHitVel.z;
      ball.lastHitBy = preHitLastBy;
      ball.bounceCount = preHitBounceCount;
      gs.isFirstBounce = preHitIsFirstBounce;
      // Tentativa abortada: limpa o prep visual para não parecer que houve hit
      // e aplica micro-cooldown para a bola "passar" sem reacender o ring no mesmo lance.
      player._prepTime = 0;
      player._prepFrac1 = 0;
      player._prepFrac2 = 0;
      player._approachInitialized = false;
      player.hitCooldown = Math.max(player.hitCooldown ?? 0, 0.06);
      debugHitGate(gs, player, 'strictHitValidationRejected', {
        outsideAfterBounce,
        kind: 'outsideAfterBounce',
      });
      return;
    }
  }

  ball.lastHitBy = player.id; ball.bounceCount = 0; ball._bounceId = 0; gs.isFirstBounce = false;
  debugHitGate(gs, player, 'hitConfirmed', { shotType: shot.type, quality: +effectiveQuality.toFixed(3) });
  ball.lastShotType = shot.type;
  ball._lastShotType = shot.type;
  ball._lastShotMeta = {
    shotType: shot.type,
    spinType: shot.spinType ?? 'FLAT',
    powerKmh: Math.round((shot.power ?? 0) * 3.6),
    targetX: shot.targetX ?? null,
    targetY: shot.targetY ?? null,
    netClearance: shot.netClearance ?? null,
    hitHeight: shot.hitHeight ?? null,
    spinX: shot.spinX ?? null,
    spinZ: shot.spinZ ?? null,
    executionQuality: effectiveQuality ?? null,
    tacticalState: player._tacticalState ?? 'NEUTRAL',
    executionState: shot._executionState ?? player._executionState?.state ?? 'NEUTRAL',
    netPhase: shot._netPhase ?? player.ctx?.netPhase ?? 'BASE',
    wingIdentity: shot._wingIdentity ?? player._wingIdentity?.dominantWing ?? 'BALANCED',
    pointPattern: shot._pointPattern ?? player.ctx?._pointPatternPlan?.name ?? null,
    motive: shot._motive ?? null,
    fromX: player.pos?.x ?? null,
    fromY: player.pos?.y ?? null,
  };
  gs.rally++;
  if (gs.rally === 20) gs.pendingScreenFx = { color:'rgba(255,107,53,0.14)', glow:'#FF6B35', shake:false, dur:400 };
  gs.maxRally = Math.max(gs.maxRally, gs.rally);
  player.shotCount++;

  // ── Rally Pressure: update opponent's accumulated stress ───────
  // Each clean shot registers its zone against the opponent.
  // Successive Wide/SHORT_ANGLE shots compound → higher FE risk.
  updateRallyPressure(gs, 1 - player.id, shot.zone, shot.targetX);
  // Player hit cleanly → own pressure resets more aggressively
  player.ctx.rallyPressure = Math.max(0, rallyPressure * 0.40);

  // ── Match context: update opponent's pattern memory ───────────
  // Record where this shot was aimed so the opponent can learn our tendencies
  const oppMc = gs.players[1 - player.id];
  if (oppMc.ctx.matchCtx) {
    if (shot.targetX < -0.5) oppMc.ctx.matchCtx.oppBhHits = (oppMc.ctx.matchCtx.oppBhHits || 0) + 1;
    if (shot.targetX >  0.5) oppMc.ctx.matchCtx.oppFhHits = (oppMc.ctx.matchCtx.oppFhHits || 0) + 1;
    if (shot.type === 'DROP' || shot.type === 'DROP2') oppMc.ctx.matchCtx.oppDrops  = (oppMc.ctx.matchCtx.oppDrops  || 0) + 1;
  }

  // ── Post-hit fatigue pause ─────────────────────────────────────
  // At low stamina, player takes a beat before starting to return to base
  if (staminaFrac < INERTIA.postHitStaminaThresh && player.ctx._postHitPause <= 0) {
    const pauseRange = INERTIA.postHitPauseMax - INERTIA.postHitPauseMin;
    player.ctx._postHitPause = INERTIA.postHitPauseMin + Math.random() * pauseRange
                              * (1 - staminaFrac / INERTIA.postHitStaminaThresh);
  }

  // ── [PATCH v1] Recovery Window Orgânico ────────────────────────────────────
  // No tênis real, bater em movimento exige um momento de reequilíbrio antes
  // de correr de volta para a posição base. Isso cria o espaço temporal que
  // permite ao oponente construir o ponto — mesmo com stamina normal.
  // Condicional triplo: sprint OU qualidade baixa OU bola difícil (hitHeight baixo).
  // 0.10s é pequeno (1-2 frames a 60fps) mas muda completamente a dinâmica de recuperação.
  const sprintSpeed    = Math.sqrt(player.vel.x ** 2 + player.vel.y ** 2);  // local — só para postHitPause
  const sprintFracHit  = sprintSpeed / (player.playerSpeed || 5.5);
  const hitUnderPressure = effectiveQuality < 0.45 || sprintFracHit > 0.50;
  if (hitUnderPressure && player.ctx._postHitPause <= 0) {
    player.ctx._postHitPause = 0.10 + Math.random() * 0.02;  // 100–120ms de reequilíbrio
  }
  if ((player._movementContactClass ?? 'NORMAL_HIT') === 'EMERGENCY_REACH') {
    player.ctx._postHitPause = Math.max(player.ctx._postHitPause ?? 0, 0.13 + Math.random() * 0.02);
    player._postHitRecoveryTimer = Math.max(player._postHitRecoveryTimer ?? 0, 0.18);
  } else if ((player._movementContactClass ?? 'NORMAL_HIT') === 'LOW_BALL_PICKUP') {
    player.ctx._postHitPause = Math.max(player.ctx._postHitPause ?? 0, 0.11 + Math.random() * 0.02);
    player._postHitRecoveryTimer = Math.max(player._postHitRecoveryTimer ?? 0, 0.12);
  }

  // FIX 12 — marcar se o golpe foi em sprint: entra em offBalance no próximo frame
  // Sprint > 65% da velocidade máxima ao bater → footingState 'offBalance'
  player._lastShotWhileRunning = sprintFracHit > 0.65;

  // ── Tech log: batida ──
  const qb = player._qualBreakdown ?? {};
  pushTech(gs,
    `[H${_pad(gs.rally,2)}] ${player.name} │ ${shot.type} │ ${shot.zone} │ ${_fi(shot.power*3.6)}km/h │ Q:${_pct(effectiveQuality)} │ stam:${_pct(staminaFrac)} │ ${player.atNet?'REDE':'BASE'}\n` +
    `     jogador pos(x=${_f2(player.pos.x)}, y=${_f2(player.pos.y)}) vel(x=${_f1(player.vel.x)}, y=${_f1(player.vel.y)})\n` +
    `     contact  timing:${_f2(qb.contactTiming)} prep:${_f2(qb.contactPrep)} bal:${_f2(qb.contactBalance)} fat:${_f2(qb.contactFatigue)} press:${_f2(qb.contactPressure)} spin:${_f2(qb.contactSpin)} vol:${_f2(qb.contactVolley)} → raw:${_pct(qb.contactQuality)}\n` +
    `              skill[${qb.skillAttr}]→×${_f2(qb.skillFactor)}  ceil:${_pct(qb.positionCeiling)} (depth:${_f2(qb.depthRatio)})  rings r1:${_pct(qb.prepFrac1)} r2:${_pct(qb.prepFrac2)}  final:${_pct(qb.final)}\n` +
    `     bola_av vel(x=${_f2(velBefore.x)}, y=${_f2(velBefore.y)}, z=${_f2(velBefore.z)}) z:${_f2(ball.pos.z)}\n` +
    `     alvo    pos(x=${_f2(shot.targetX)}, y=${_f2(shot.targetY)}) clr:${_f2(shot.netClearance)}m hitH:${_f2(shot.hitHeight)}m\n` +
    `     pattern ${shot._pointPattern ?? player.ctx?._pointPatternPlan?.name ?? 'NONE'} [${shot._pointPatternSource ?? player.ctx?._pointPatternPlan?.source ?? 'none'}] exec:${shot._executionState ?? player._executionState?.state ?? 'NEUTRAL'} net:${shot._netPhase ?? player.ctx?.netPhase ?? 'BASE'} wing:${shot._wingIdentity ?? player._wingIdentity?.dominantWing ?? 'BALANCED'}\n` +
    `     bola_dp vel(x=${_f2(ball.vel.x)}, y=${_f2(ball.vel.y)}, z=${_f2(ball.vel.z)}) spin(x=${_f1(ball.spin.x)}, z=${_f1(ball.spin.z)})\n` +
    `     pressão oponente após golpe: ${_pct(gs.players[1 - player.id].ctx.rallyPressure)}`
  );
  player.hitCooldown = TIMING.hitCooldown;
  player.swinging    = true;
  player.swingTimer  = 0;

  // ── Stamina decay ────────────────────────────────────────────────
  const shotMult  = SHOT_DECAY_MULT[shot.type] ?? 1.0;
  const traitStaminaDiv = traitFx.staminaMult > 0 ? traitFx.staminaMult : 1.0;
  const resDrainMult = getStaminaResistanceDrainMult(player);
  const rallyLoad = 1 + Math.max(0, gs.rally - 3) * 0.07;
  const lowStaminaLoad = 1 + Math.pow(1 - (player.stamina ?? 1.0), 1.15) * 0.24;
  const decayRate = STAMINA.decayPerShot * shotMult
                  * resDrainMult
                  * rallyLoad
                  * lowStaminaLoad
                  * (mods ? mods.staminaDecayMult : 1.0)
                  * (gs.courtMods?.staminaDecayMult ?? 1.0)
                  / traitStaminaDiv;
  const prevStam = player.stamina;
  player.stamina = Math.max(0, player.stamina - decayRate);
  if (prevStam > STAMINA.logThreshold && player.stamina <= STAMINA.logThreshold)
    gs.log.push(`😤 [CANSAÇO] ${player.name} (${Math.round(player.stamina * 100)}%)`);
  // ── Log notable bad/good positioning ─────────────────────────
  if (effectiveQuality < 0.28 && gs.rally > 1)
    gs.log.push(`🏃 [CORRIDA] ${player.name} bateu em desvantagem (Q:${Math.round(effectiveQuality*100)}%)`);

  // ── Rally pattern memory ──────────────────────────────────────
  const shotDir = shot.targetX > 0.5 ? 1 : shot.targetX < -0.5 ? -1 : 0;
  if (shotDir !== 0 && shotDir === Math.sign(player.ctx.lastShotX || 0)) {
    player.ctx.consecutiveSameDir = (player.ctx.consecutiveSameDir || 0) + 1;
  } else {
    player.ctx.consecutiveSameDir = 0;
  }
  player.ctx.lastShotX = shot.targetX;
  player.ctx.lastShotType = shot.type; // usado pelo CoachAnalyzer via matchLogRef
  player.ctx.lastPointPattern = shot._pointPattern ?? null;
  // FASE 1.1 — Recovery diagonal: guarda o targetX para posicionamento de recovery
  player.ctx._lastShotX = shot.targetX;
  // Decai para 0 na próxima vez que o jogador bater a bola (gravado acima no próximo hit)

  if (shot.type in player.stats.byType) player.stats.byType[shot.type]++;
  // Acumula Q e velocidade por tipo de golpe
  {
    const st = player.stats;
    const t  = shot.type;
    st.byTypeQSum[t]   = (st.byTypeQSum[t]   ?? 0) + effectiveQuality;
    st.byTypeQCnt[t]   = (st.byTypeQCnt[t]   ?? 0) + 1;
    const shotKmh = Math.round(Math.sqrt(ball.vel.x**2+ball.vel.y**2+ball.vel.z**2)*3.6);
    if (shotKmh > 0) {
      st.byTypeKmhSum[t] = (st.byTypeKmhSum[t] ?? 0) + shotKmh;
      st.byTypeKmhCnt[t] = (st.byTypeKmhCnt[t] ?? 0) + 1;
    }
  }
  // ── Mishit: frame shot / batida fora do sweet spot ──────────────────────────
  // Q < 0.30 → sempre mishit  |  Q 0.30–0.50 → chance decrescente (~20% a 0%)
  // Narrativamente: bola bate na madeira, no frame, timing errado
  const mishitThreshold = 0.30;
  const mishitChanceZone = 0.50;
  let isMishit = false;
  if (effectiveQuality < mishitThreshold) {
    isMishit = true;
  } else if (effectiveQuality < mishitChanceZone) {
    // chance linear: 0.50 → 0%, 0.30 → 20%
    const mishitChance = (mishitChanceZone - effectiveQuality) / (mishitChanceZone - mishitThreshold) * 0.20;
    isMishit = Math.random() < mishitChance;
  }

  if (isMishit) {
    playSound('MISHIT', { speed: Math.round(Math.sqrt(ball.vel.x**2+ball.vel.y**2+ball.vel.z**2)*3.6) });
  } else {
    playSound('HIT', { speed: Math.round(Math.sqrt(ball.vel.x**2+ball.vel.y**2+ball.vel.z**2)*3.6) });
  }
  const isSignatureHit    = !!(player._aiTrace?.signatureShotTriggered);
  const signatureLabelVfx = isSignatureHit ? (player._aiTrace?.signatureLabel ?? null) : null;
  const signatureEmojiVfx = isSignatureHit ? (player._aiTrace?.signatureEmoji ?? null) : null;
  pushShotVFX(gs, player, shot.type, effectiveQuality, isMishit, isSignatureHit, signatureLabelVfx, signatureEmojiVfx, {
    executionState: shot._executionState ?? player._executionState?.state ?? 'NEUTRAL',
    executionLabel: shot._executionLabel ?? player._executionState?.label ?? 'Neutral',
    pointPattern: shot._pointPattern ?? player.ctx?._pointPatternPlan?.name ?? null,
    netPhase: shot._netPhase ?? player.ctx?.netPhase ?? 'BASE',
    wingIdentity: shot._wingIdentity ?? player._wingIdentity?.dominantWing ?? 'BALANCED',
    feelTags: buildShotFeelTags(shot, player),
  });

  // Lob tracking
  const opp = gs.players[1 - player.id];
  if (LOB_TYPES.has(shot.type)) {
    // Só conta como "lob sofrido" se o oponente está na rede e o lob aterrissa fundo.
    // Lobs cobertos com smash não penalizam — o jogador respondeu bem.
    // Conta lob se oponente está na rede OU em trânsito para ela (TRANSITION)
    const oppGoingToNet = opp.atNet || opp.ctx?.courtMode === 'TRANSITION';
    if (oppGoingToNet) {
      opp.ctx.lobsReceived++;
      // Recua apenas após MUITOS lobs não cobertos (threshold generoso para estilos de rede).
      // Net-inclined (HUNTER/PROACTIVE): 4 lobs antes de recuar. Outros: 3.
      const isNetStyle_lob = (((opp.attrs?.volley ?? opp.attrs?.jogoDeRede ?? 50) +
                              (opp.attrs?.smash  ?? opp.attrs?.jogoDeRede ?? 50)) / 2) >= 72
        || opp.prefs?.netGame === 'HUNTER' || opp.prefs?.netGame === 'PROACTIVE';
      const lobThreshold = isNetStyle_lob ? 4 : 3;
      if (opp.ctx.lobsReceived >= lobThreshold) {
        opp.atNet = false;
        opp.ctx.courtMode = 'BASE'; // FSM: volta ao posicionamento de baseline
        opp.ctx.netPhase = 'BASE';
        // Permite re-approach imediato se recuperar — não pune no mesmo ponto
        opp.ctx._netApproachedThisPoint = false;
        gs.log.push(`🏳 ${opp.name} recua após ${opp.ctx.lobsReceived} lobs`);
      }
    }
  }

  // SMASH bem executado: lob foi coberto — decrementa contagem de lobs sofridos
  if (shot.type === 'SMASH' && player.atNet && player.ctx.lobsReceived > 0) {
    player.ctx.lobsReceived = Math.max(0, player.ctx.lobsReceived - 1);
  }

  updateNetApproachIntent(gs, player, opp, shot, effectiveQuality, isSlowBall);
  advanceNetPhaseAfterShot(player, shot, effectiveQuality);
  syncNetPhaseState(player);
}

// ── Tick functions ─────────────────────────────────────────────────
export function gameTick(gs, dt) {
  if (gs.gameState === GameState.GAME_OVER || gs.gameState === GameState.POINT_END) return;
  gs.stateTimer += dt;
  updateEnvironment(gs, dt);
  if (gs.stateTimer % 3 < dt) pruneOldMarks(gs);  // prune marks every ~3s
  switch (gs.gameState) {
    case GameState.PRE_SERVE:        tickPreServe(gs, dt);  break;
    case GameState.SERVING:          tickServing(gs, dt);   break;
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
// ── SERVE EV + RETURN EV SYSTEM ─────────────────────────────────
// ═══════════════════════════════════════════════════════════════════
//
// Replaces the flat weighted-random serve selection with:
//   A) ServeDecisionEV: candidateGen → pressureScore/safetyScore/
//                       rewardScore/patternScore → softmax pick
//   B) ReturnPositioningEV: receiver moves to best position BEFORE
//      the serve based on server's history (no telepathy).
//   C) ReturnShotEV: first ball of rally uses EV to choose how to
//      return (chip, block, drive, lob) based on serve type/speed.
//
// All existing physics (launchBall, spin, scatter, faultProb base,
// SERVE_DEFS) remain untouched — only the selection is replaced.
// ────────────────────────────────────────────────────────────────────

// ── Clamp helper ─────────────────────────────────────────────────
function _c01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

function getServeIdentityPrefs(player) {
  const merged = mergeGeneratedPrefs(player?.attrs ?? {}, player?.prefs ?? {});
  if (player) player.prefs = merged;
  return merged;
}

// ── A) SERVE DECISION EV ─────────────────────────────────────────

// Serve candidate: wraps a SERVE_DEFS index with intent metadata.
function makeServeCand(defIdx, dir, tags, tXOverride = null) {
  return { defIdx, dir, tags, tXOverride };
}

// ── Shot System v4 — Score Importance ──────────────────────────────
// Calcula a importância do ponto atual para o cálculo de pressão (Camada 6).
// Retorna { importance, isBreakPoint, isMatchPoint, isSetPoint }.
//   normal     = 1.0
//   set_point  = 1.4
//   break_point= 1.6
//   match_point= 2.0
function _computeScoreImportance(player, gs) {
  const scoreState = _getPointPressureState(gs)[player.id];

  const importance = scoreState.isMatchPoint ? 2.0
                   : scoreState.isBreakPoint ? 1.6
                   : scoreState.isSetPoint   ? 1.4
                   : scoreState.isGamePoint  ? 1.2
                   : 1.0;

  return {
    importance,
    isGamePoint: scoreState.isGamePoint,
    isBreakPoint: scoreState.isBreakPoint,
    isMatchPoint: scoreState.isMatchPoint,
    isSetPoint: scoreState.isSetPoint,
  };
}

// Build serve candidates for current situation (8–12 options).
function generateServeCands(isSec, sl, servePower = 0.70) {
  const cands = [];

  // SERVE_DEFS indices:
  // 0=FLAT-T  1=FLAT-WIDE  2=FLAT-BODY  3=SLICE-WIDE
  // 4=SLICE-T  5=KICK-BODY  6=KICK-T

  if (!isSec) {
    // 1st serve: full arsenal, aggressive options available
    cands.push(makeServeCand(0, 'T',    ['RUSH']));          // FLAT-T
    cands.push(makeServeCand(1, 'WIDE', ['OPEN']));          // FLAT-WIDE
    cands.push(makeServeCand(2, 'BODY', ['JAM']));           // FLAT-BODY
    cands.push(makeServeCand(3, 'WIDE', ['OPEN']));          // SLICE-WIDE
    cands.push(makeServeCand(4, 'T',    ['RUSH']));          // SLICE-T
    cands.push(makeServeCand(5, 'BODY', ['JAM']));           // KICK-BODY
    cands.push(makeServeCand(6, 'T',    ['SAFE']));          // KICK-T
    // Style extras
    if (servePower >= 0.85)  // Big server / serve-volleyer analog
      cands.push(makeServeCand(1, 'WIDE', ['OPEN', 'RUSH']));  // extra FLAT-WIDE
    if (servePower <= 0.55)  // defensive server analog
      cands.push(makeServeCand(6, 'T', ['SAFE']));            // extra KICK-T
  } else {
    // 2nd serve: conservative. No FLAT-WIDE (too risky). KICK dominates.
    cands.push(makeServeCand(5, 'BODY', ['JAM',  'SAFE']));  // KICK-BODY
    cands.push(makeServeCand(6, 'T',    ['SAFE']));           // KICK-T
    cands.push(makeServeCand(3, 'WIDE', ['OPEN', 'SAFE']));  // SLICE-WIDE (moderate)
    cands.push(makeServeCand(4, 'T',    ['SAFE']));           // SLICE-T
    cands.push(makeServeCand(2, 'BODY', ['JAM',  'SAFE']));  // FLAT-BODY (risky but available)
    // Retriever/CTR never use FLAT on 2nd
    if (servePower > 0.55)  // attacking servers
      cands.push(makeServeCand(0, 'T', ['SAFE']));            // FLAT-T (conservative depth)
  }

  return cands;
}

// PressureScore: does this serve displacement the receiver?
function servePressureScore(c, sCtx) {
  let p = 0.45;
  const rvX = sCtx.rvX;  // receiver X (signed)

  // WIDE: effective when receiver is central; weaker when already wide
  if (c.dir === 'WIDE') {
    p += _c01((1.0 - Math.abs(rvX) / 2.0)) * 0.35;
    if (sCtx.rvIsWide) p -= 0.18;  // receiver already covering wide
  }
  // BODY: jams when receiver is inside or has narrow stance
  if (c.dir === 'BODY') p += sCtx.rvIsInside ? 0.28 : 0.10;
  // T: effective when receiver has drifted wide
  if (c.dir === 'T')    p += sCtx.rvIsWide ? 0.25 : 0.08;

  // Spin type bonus: slice/kick create extra discomfort
  const physType = sCtx.serveDefs[c.defIdx][0];
  if (physType === 'SLICE') p += 0.10;  // lateral bounce hard to handle
  if (physType === 'KICK')  p += sCtx.rvIsInside ? 0.14 : 0.06;  // high kick to body

  return _c01(p);
}

// SafetyScore: how likely is this serve to go IN?
function serveSafetyScore(c, sCtx) {
  let s = 0.72;  // neutral base
  const physType = sCtx.serveDefs[c.defIdx][0];
  const isSec = sCtx.isSec;

  if (physType === 'KICK')  s += isSec ? 0.22 : 0.10;
  if (physType === 'FLAT')  s -= isSec ? 0.32 : 0.10;
  if (physType === 'SLICE') s -= isSec ? 0.08 : 0.02;
  if (c.dir === 'WIDE')     s -= isSec ? 0.22 : 0.08;
  if (c.dir === 'T')        s -= 0.04;  // T slightly riskier than body

  // Aggressive depth increases miss chance
  const tYMid = isSec ? 0.56 : 0.64;
  s -= Math.max(0, tYMid - 0.68) * 1.0;

  // Break point: extra caution on 2nd serve
  if (sCtx.isBreakPoint && isSec) s += 0.10;

  // Stamina: tired servers are less precise
  if (sCtx.stamina < 0.55) s -= 0.07;

  // Recent faults: dial back on 2nd serve
  if (sCtx.recentFaults >= 2 && isSec) s += 0.08;

  return _c01(s);
}

// RewardScore: pure win potential (ace / weak return opportunity)
function serveRewardScore(c, sCtx) {
  let r = 0.30;  // base
  const physType = sCtx.serveDefs[c.defIdx][0];
  const isSec = sCtx.isSec;

  // FLAT-WIDE hardest to return, highest reward on 1st
  if (physType === 'FLAT' && c.dir === 'WIDE' && !isSec) r += 0.30;
  if (physType === 'FLAT' && c.dir === 'T' && !isSec)    r += 0.20;

  // SLICE-WIDE: medium reward (harder to attack after awkward bounce)
  if (physType === 'SLICE' && c.dir === 'WIDE') r += 0.18;

  // Big server amplification
  if ((sCtx.saqAttr ?? 60) >= 82 && physType === 'FLAT') r += 0.12;
  if ((sCtx.netAttr ?? 50) >= 78 && c.dir === 'WIDE') r += 0.10;

  // 2nd serve: reward drops (safety > reward)
  if (isSec) r *= 0.50;

  // Recent ace streak: this type is working, keep it
  if (sCtx.serve1InStreak >= 3 && physType === sCtx.lastPhysType) r += 0.08;

  return _c01(r);
}

// PatternScore: reward variation, punish spam
function servePatternScore(c, sCtx) {
  const hist = sCtx.serveHistory;
  if (hist.length < 2) return 0.55;  // neutral early on

  let p = 0.55;
  const recent = hist.slice(-3);

  // Count consecutive same direction
  const sameDir = recent.filter(h => h.dir === c.dir).length;
  if (sameDir >= 2) p -= 0.25;
  else if (sameDir === 0) p += 0.18;

  // Count consecutive same physType
  const physType = sCtx.serveDefs[c.defIdx][0];
  const samePT = recent.filter(h => h.physType === physType).length;
  if (samePT >= 2) p -= 0.12;
  else if (samePT === 0) p += 0.10;

  return _c01(p);
}

function serveIdentityScore(c, sCtx) {
  const prefs = sCtx.servePrefs || {};
  const physType = sCtx.serveDefs[c.defIdx][0];
  const isSec = sCtx.isSec;
  let score = 0.52;

  switch (prefs.serveProfile) {
    case 'CANNON':
      if (!isSec && physType === 'FLAT') score += 0.22;
      if (!isSec && (c.dir === 'T' || c.dir === 'WIDE')) score += 0.10;
      if (isSec && c.dir === 'WIDE') score -= 0.14;
      if (isSec && physType === 'KICK') score -= 0.06;
      break;
    case 'PRECISION':
      if (c.dir === 'T') score += 0.18;
      if (physType === 'SLICE' && c.dir === 'T') score += 0.06;
      if (isSec && physType === 'FLAT' && c.dir === 'WIDE') score -= 0.14;
      break;
    case 'BODY_JAMMER':
      if (c.dir === 'BODY') score += 0.22;
      if (physType === 'FLAT' || physType === 'KICK') score += 0.04;
      if (c.dir === 'WIDE') score -= 0.08;
      break;
    case 'WIDE_OPENER':
      if (c.dir === 'WIDE') score += 0.22;
      if (physType === 'SLICE' && c.dir === 'WIDE') score += 0.08;
      if (c.dir === 'BODY') score -= 0.07;
      break;
    case 'KICK_BUILDER':
      if (physType === 'KICK') score += isSec ? 0.24 : 0.12;
      if (isSec && physType === 'FLAT') score -= 0.14;
      if (c.dir === 'T') score += 0.05;
      break;
    default:
      if (c.dir !== 'BODY' && !isSec) score += 0.03;
      break;
  }

  if (!isSec) {
    switch (prefs.serve1Bias) {
      case 'POWER': if (physType === 'FLAT') score += 0.16; break;
      case 'T':     if (c.dir === 'T') score += 0.14; break;
      case 'BODY':  if (c.dir === 'BODY') score += 0.14; break;
      case 'WIDE':  if (c.dir === 'WIDE') score += 0.14; break;
      case 'SHAPE': if (physType !== 'FLAT') score += 0.12; break;
      default: score += 0.03; break;
    }
  } else {
    switch (prefs.serve2Bias) {
      case 'KICK':  if (physType === 'KICK') score += 0.20; break;
      case 'T':     if (c.dir === 'T') score += 0.12; break;
      case 'BODY':  if (c.dir === 'BODY') score += 0.12; break;
      case 'SLICE': if (physType === 'SLICE') score += 0.16; break;
      case 'SAFE':
        if (physType === 'KICK') score += 0.12;
        if (c.dir === 'WIDE' && physType === 'FLAT') score -= 0.12;
        break;
      default:
        score += 0.02;
        break;
    }
  }

  if (sCtx.isBreakPoint) {
    switch (prefs.pressureServe) {
      case 'BOLD':
        if (!isSec && physType === 'FLAT') score += 0.16;
        if (isSec && c.dir === 'WIDE') score -= 0.08;
        break;
      case 'SPOT':
        if (c.dir === 'T') score += 0.16;
        if (physType === 'SLICE' && c.dir === 'T') score += 0.05;
        break;
      case 'BODY_LOCK':
        if (c.dir === 'BODY') score += 0.18;
        break;
      case 'KICK_TRUST':
        if (physType === 'KICK') score += 0.18;
        break;
      case 'SAFE_RESET':
        if (isSec && physType === 'KICK') score += 0.14;
        if (physType === 'FLAT' && c.dir === 'WIDE') score -= 0.12;
        break;
      default:
        break;
    }
  }

  return _c01(score);
}

function serveTacticalScore(c, sCtx) {
  const state = sCtx.tacticalState;
  if (!state) return 0.52;
  let score = 0.52;
  score += state.dirBias?.[c.dir] ?? 0;
  if (state.hotDir === c.dir) score += 0.08;
  if (state.varyFrom === c.dir) score -= 0.18;
  if (state.counterOpenDir === c.dir) score += 0.10;
  if (state.anticipatedDir === c.dir) score -= 0.08 + (state.patternPressure ?? 0) * 0.08;
  return _c01(score);
}

// Score a serve candidate → {EV, sub}
function scoreServeCand(c, sCtx) {
  const sP = servePressureScore(c, sCtx);
  const sR = serveRewardScore(c, sCtx);
  const sS = serveSafetyScore(c, sCtx);
  const sV = servePatternScore(c, sCtx);
  const sI = serveIdentityScore(c, sCtx);
  const sT = serveTacticalScore(c, sCtx);

  let EV;
  if (sCtx.isSec) {
    // 2nd serve: safety dominates
    EV = 0.16 * sP + 0.08 * sR + 0.39 * sS + 0.10 * sV + 0.14 * sI + 0.13 * sT;
  } else {
    // 1st serve: balanced — pressure and reward matter more
    EV = 0.24 * sP + 0.18 * sR + 0.16 * sS + 0.10 * sV + 0.18 * sI + 0.14 * sT;
  }

  return { c, EV, sub: { pressure: sP, reward: sR, safety: sS, pattern: sV, identity: sI, tactical: sT } };
}

// Softmax pick for serve (shared temperature logic)
function serveTemperature(sCtx) {
  let t = 0.18;
  // Clear read of receiver position → more decisive
  if (sCtx.rvIsInside && !sCtx.isSec) t *= 0.75;
  if (sCtx.rvIsWide)                   t *= 0.80;
  // 2nd serve: more conservative (lower temp = more predictable/safe)
  if (sCtx.isSec) t *= 0.70;
  // Break point: very cautious on 2nd
  if (sCtx.isBreakPoint && sCtx.isSec) t *= 0.60;
  return Math.max(0.06, Math.min(0.32, t));
}

// Main EV serve selection — returns a scored candidate
function evPickServe(isSec, sl, sv, rv, isBreakPoint, serveDefs) {
  const mc = sv.ctx.matchCtx;
  const serveHistory = mc.serveHistory || [];
  const servePrefs = getServeIdentityPrefs(sv);
  const tacticalState = computeServePatternState(sv.ctx.matchCtx, rv.ctx.matchCtx, isSec, sl);

  // Build context object
  const rvX       = rv.pos.x;
  const rvY       = rv.pos.y;
  const rvSide    = rv.side;
  const rvBaseY   = rvSide * (COURT.halfL + 2.0);

  // Receiver posture (heuristic, no telepathy — pure position read)
  const rvIsWide   = Math.abs(rvX) > 1.1;
  const rvIsInside = Math.abs(rvY) < Math.abs(rvBaseY) - 0.8;  // stepped in from baseline
  const rvIsDeep   = Math.abs(rvY) > Math.abs(rvBaseY) + 0.5;  // far behind baseline

  const sCtx = {
    isSec, sl,
    saqAttr:  sv.attrs?.saqueForca ?? sv.attrs?.saque ?? 60,
    netAttr:  ((sv.attrs?.volley ?? sv.attrs?.jogoDeRede ?? 50) + (sv.attrs?.smash ?? sv.attrs?.jogoDeRede ?? 50)) / 2,
    rvX, rvIsWide, rvIsInside, rvIsDeep,
    isBreakPoint, stamina: sv.stamina ?? 1.0,
    serveHistory,
    serve1InStreak: mc.serve1InStreak || 0,
    recentFaults:   mc.recentFaults   || 0,
    lastPhysType:   serveHistory.length ? serveHistory[serveHistory.length - 1].physType : null,
    serveDefs,
    servePrefs,
    tacticalState,
  };

  const cands  = generateServeCands(isSec, sl, (sv.attrs?.saqueForca ?? sv.attrs?.saque ?? 60) / 100);
  const scored = cands.map(c => scoreServeCand(c, sCtx));
  const temp   = serveTemperature(sCtx);

  // Softmax pick
  const maxEV = Math.max(...scored.map(s => s.EV));
  const exps  = scored.map(s => Math.exp((s.EV - maxEV) / temp));
  const sum   = exps.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < scored.length; i++) {
    r -= exps[i]; if (r <= 0) return { picked: scored[i], sCtx, scored };
  }
  return { picked: scored[scored.length - 1], sCtx, scored };
}

// Derive serveIntent from candidate tags
function deriveServeIntent(c) {
  if (c.tags.includes('OPEN'))  return c.tags.includes('RUSH') ? 'RUSH' : 'OPEN';
  if (c.tags.includes('JAM'))   return 'JAM';
  if (c.tags.includes('SAFE'))  return 'SAFE';
  if (c.tags.includes('RUSH'))  return 'RUSH';
  return 'SAFE';
}

// Push to serveHistory (circular, max 8)
function pushServeHistory(mc, entry) {
  mc.serveHistory = mc.serveHistory || [];
  mc.serveHistory.push(entry);
  if (mc.serveHistory.length > 8) mc.serveHistory.shift();
}

function computeServePatternState(serverMc, receiverMc, isSec, sl) {
  const hist = (serverMc?.serveHistory || []).filter(h => h.isSec === isSec).slice(-6);
  const result = {
    anticipatedDir: null,
    hotDir: null,
    varyFrom: null,
    counterOpenDir: null,
    dirBias: { WIDE: 0, T: 0, BODY: 0 },
    patternPressure: 0,
  };
  if (!hist.length) return result;

  const recentSide = hist.filter(h => h.serveLeft === sl).slice(-4);
  const sample = recentSide.length >= 2 ? recentSide : hist;
  const counts = { WIDE: 0, T: 0, BODY: 0 };
  const wins = { WIDE: 0, T: 0, BODY: 0 };
  const aggressiveReads = { WIDE: 0, T: 0, BODY: 0 };
  const discomfortReads = { WIDE: 0, T: 0, BODY: 0 };
  const aggressiveFamilies = new Set(['DRIVE_ATTACK', 'DRIVE_NEUTRAL', 'COUNTER_UP', 'BLOCK_BODY']);
  const discomfortFamilies = new Set(['CHIP_STRETCH', 'BLOCK_STRETCH', 'CHIP_RESET', 'BLOCK_RESET', 'RESET_BODY']);

  sample.forEach((h, idx) => {
    const w = Math.pow(0.84, sample.length - 1 - idx);
    const dir = h.dir || 'T';
    counts[dir] += w;
    if (h.won) wins[dir] += w;
    if (aggressiveFamilies.has(h.returnFamily)) aggressiveReads[dir] += w;
    if (discomfortFamilies.has(h.returnFamily)) discomfortReads[dir] += w;
  });

  const total = counts.WIDE + counts.T + counts.BODY || 1;
  const dirs = ['WIDE', 'T', 'BODY'];
  dirs.forEach(dir => {
    const share = counts[dir] / total;
    const winRate = counts[dir] > 0 ? wins[dir] / counts[dir] : 0.5;
    const anticipation = Math.max(0, share - 0.34) * 0.55 + aggressiveReads[dir] * 0.18;
    const comfort = discomfortReads[dir] * 0.10;
    result.dirBias[dir] = clamp((winRate - 0.52) * 0.55 - anticipation + comfort, -0.35, 0.35);
  });

  const sortedByShare = [...dirs].sort((a, b) => counts[b] - counts[a]);
  const sortedByBias = [...dirs].sort((a, b) => result.dirBias[b] - result.dirBias[a]);
  const topDir = sortedByShare[0];
  const topShare = counts[topDir] / total;
  const topWinRate = counts[topDir] > 0 ? wins[topDir] / counts[topDir] : 0.5;
  const topAggroReads = aggressiveReads[topDir];

  if (topShare >= 0.52 || sample.slice(-3).filter(h => h.dir === topDir).length >= 2) {
    result.anticipatedDir = topDir;
  }
  if (topShare >= 0.52 && topWinRate < 0.50 + Math.max(0, topAggroReads - 0.5) * 0.05) {
    result.varyFrom = topDir;
    result.patternPressure = clamp(topShare * 0.9 + topAggroReads * 0.12, 0, 1);
  } else if (topWinRate >= 0.64 && topShare <= 0.58) {
    result.hotDir = topDir;
  }

  result.counterOpenDir = sortedByBias[0];
  if (result.counterOpenDir === result.varyFrom) {
    result.counterOpenDir = sortedByBias[1] ?? result.counterOpenDir;
  }

  if (result.anticipatedDir === 'T' && (aggressiveReads.T > 0.7 || topShare > 0.56)) {
    result.dirBias.BODY += 0.08;
    result.dirBias.WIDE += 0.10;
  }
  if (result.anticipatedDir === 'BODY' && aggressiveReads.BODY > 0.45) {
    result.dirBias.WIDE += 0.12;
  }
  if (result.anticipatedDir === 'WIDE' && aggressiveReads.WIDE > 0.45) {
    result.dirBias.BODY += 0.08;
    result.dirBias.T += 0.08;
  }

  dirs.forEach(dir => { result.dirBias[dir] = clamp(result.dirBias[dir], -0.35, 0.35); });
  return result;
}

function finalizeServeReturnPattern(gs, pd, serverWon, isAce) {
  if (!pd) return;
  const server = gs.players[gs.server];
  const receiver = gs.players[gs.receiver];
  const serverMc = server?.ctx?.matchCtx;
  const receiverMc = receiver?.ctx?.matchCtx;
  if (!serverMc || !receiverMc) return;

  const serveEntry = [...(serverMc.serveHistory || [])].reverse().find(e => e.pointNum === pd.pointNum);
  const returnPlan = receiver?.ctx?._returnPlan ?? null;
  if (serveEntry) {
    serveEntry.outcome = serverWon ? (isAce ? 'ACE' : 'WON') : 'LOST';
    serveEntry.won = !!serverWon;
    serveEntry.returnFamily = returnPlan?.family ?? null;
    serveEntry.returnHint = receiver?.ctx?._returnHint ?? null;
    serveEntry.serverWon = !!serverWon;
  }

  const lastReturn = [...(receiverMc.returnHistory || [])].reverse().find(e => e.pointNum === pd.pointNum || !e.pointNum);
  if (lastReturn) {
    lastReturn.pointNum = pd.pointNum;
    lastReturn.serverWon = !!serverWon;
    lastReturn.receiverWon = !serverWon;
    lastReturn.serveDir = pd.dir;
    lastReturn.serveType = pd.physType;
  }

  serverMc.servePatternState = computeServePatternState(serverMc, receiverMc, pd.isFirst ? false : true, pd.serveLeft);
  receiverMc.returnReadState = {
    anticipatedDir: serverMc.servePatternState.anticipatedDir,
    punishDir: serverMc.servePatternState.varyFrom,
    openDir: serverMc.servePatternState.counterOpenDir,
    patternPressure: serverMc.servePatternState.patternPressure,
  };
}

function buildServeFirstBallPlan(serveData, returnPlan, server) {
  if (!serveData || !returnPlan || !server) return null;
  const attrs = server.attrs ?? {};
  const attackSkill = ((attrs.visaoTatica ?? attrs.agressividade ?? 60) + (attrs.controle ?? 60)) / 200;
  const powerSkill = (attrs.potencia ?? attrs.forca ?? 60) / 100;
  const confidence = clamp(attackSkill * 0.55 + powerSkill * 0.45, 0, 1);

  let motive = 'PRESS_OPEN';
  let preferredDir = 'OPEN';
  let depthBias = 0.74;
  let shotBias = null;
  let intensityBonus = 0.06;
  let planStrength = 0.38;

  switch (returnPlan.family) {
    case 'BLOCK_STRETCH':
    case 'CHIP_STRETCH':
      motive = 'FINISH_OPEN';
      preferredDir = 'OPEN';
      depthBias = 0.80;
      shotBias = powerSkill > 0.68 ? 'ACCEL' : 'SHORT_ACCEL';
      intensityBonus = 0.14;
      planStrength = 0.78;
      break;
    case 'BLOCK_BODY':
    case 'RESET_BODY':
      motive = 'JAM_BODY';
      preferredDir = 'BODY';
      depthBias = 0.73;
      shotBias = powerSkill > 0.64 ? 'ACCEL' : 'TOPSPIN';
      intensityBonus = 0.08;
      planStrength = 0.62;
      break;
    case 'BLOCK_RESET':
      motive = 'PRESS_OPEN';
      preferredDir = serveData.dir === 'BODY' ? 'OPEN' : 'SAME';
      depthBias = 0.76;
      shotBias = powerSkill > 0.66 ? 'ACCEL' : 'TOPSPIN';
      intensityBonus = 0.10;
      planStrength = 0.66;
      break;
    case 'CHIP_RESET':
      motive = 'DRAG_FORWARD';
      preferredDir = 'OPEN';
      depthBias = 0.71;
      shotBias = 'TOPSPIN';
      intensityBonus = 0.04;
      planStrength = 0.54;
      break;
    case 'COUNTER_UP':
      motive = 'BUILD_HEAVY';
      preferredDir = 'BODY';
      depthBias = 0.78;
      shotBias = 'TOPSPIN';
      intensityBonus = 0.03;
      planStrength = 0.44;
      break;
    case 'DRIVE_ATTACK':
      motive = 'PRESS_OPEN';
      preferredDir = serveData.dir === 'WIDE' ? 'SAME' : 'OPEN';
      depthBias = 0.77;
      shotBias = 'TOPSPIN';
      intensityBonus = 0.02;
      planStrength = 0.34;
      break;
    case 'DRIVE_NEUTRAL':
      motive = 'BUILD_SPACE';
      preferredDir = 'OPEN';
      depthBias = 0.73;
      shotBias = 'TOPSPIN';
      intensityBonus = 0.00;
      planStrength = 0.26;
      break;
    default:
      break;
  }

  if (serveData.physType === 'KICK' && returnPlan.family !== 'DRIVE_ATTACK') {
    depthBias = Math.max(depthBias, 0.77);
    if (shotBias === 'ACCEL' && confidence < 0.72) shotBias = 'TOPSPIN';
  }
  if (serveData.dir === 'BODY' && preferredDir === 'OPEN') {
    planStrength += 0.04;
  }

  return {
    active: true,
    motive,
    preferredDir,
    depthBias: clamp(depthBias, 0.60, 0.86),
    shotBias,
    intensityBonus: clamp(intensityBonus, -0.02, 0.18),
    planStrength: clamp(planStrength + confidence * 0.10, 0.20, 0.90),
    expiresRally: 2,
    sourceFamily: returnPlan.family,
    serveDir: serveData.dir,
    servePhysType: serveData.physType,
  };
}

function buildReturnRecoveryPlan(serveData, returnPlan) {
  if (!serveData || !returnPlan) return null;
  const family = returnPlan.family;
  const isSoftReset =
    family === 'BLOCK_RESET' ||
    family === 'CHIP_RESET' ||
    family === 'BLOCK_STRETCH' ||
    family === 'CHIP_STRETCH' ||
    family === 'RESET_BODY';
  if (!isSoftReset) return null;

  return {
    active: true,
    motive: 'NEUTRALIZE',
    preferredDir: serveData.dir === 'BODY' ? 'BODY' : 'CENTRE',
    depthBias: family.includes('STRETCH') ? 0.79 : 0.76,
    shotBias: family.includes('CHIP') ? 'SLICE' : 'TOPSPIN',
    intensityBonus: -0.06,
    planStrength: family.includes('STRETCH') ? 0.68 : 0.52,
    expiresRally: 2,
    sourceFamily: family,
  };
}

// ── B) RETURN POSITIONING EV ──────────────────────────────────────
// Receiver decides WHERE to stand before the serve based on:
//   - server's observed serve history (dirs + types)
//   - tendências derivadas de attrs (saque + netGame pref) quando histórico é raso
//   - 1st vs 2nd serve context

// Compute a simple serve probability map from history
// serverAttrs: { saque, agressividade, netGame (pref) }
function serveHistoryProbs(mc, isSec, serverAttrs = {}, tacticalState = null) {
  const hist = (mc?.serveHistory || []).filter(h => h.isSec === isSec);

  // Prior baseado em attrs — substitui os arquétipos.
  // saque alto + agressividade alta → mais WIDE (abertura agressiva)
  // saque alto + netGame HUNTER/PROACTIVE → mais T (rush ao centro, aproximação)
  // saque médio/baixo → mais BODY + T (segurança)
  // v4: saqueForca para potência de saque; visaoTatica para intenção tática
  const saqPct   = (serverAttrs.saqueForca ?? serverAttrs.saque ?? 60) / 100;
  const agPct    = (serverAttrs.visaoTatica ?? serverAttrs.agressividade ?? 60) / 100;
  const netGame  = serverAttrs.netGame ?? 'RELUCTANT'; // pref do jogador

  // Tendência de WIDE: saques agressivos preferem abertura de quadra
  const wideBase = 0.22 + saqPct * 0.14 + agPct * 0.08;
  // Tendência de T: net hunters usam T para rush; controladores usam T para segurança
  const tBase    = (netGame === 'HUNTER' || netGame === 'PROACTIVE')
    ? 0.38 + saqPct * 0.10
    : 0.30 + (1 - agPct) * 0.10;
  // BODY: complemento
  const bodyBase = Math.max(0.15, 1.0 - wideBase - tBase);

  // Normalizar para somar 1.0
  const total = wideBase + tBase + bodyBase;
  const prior = {
    WIDE: wideBase / total,
    T:    tBase    / total,
    BODY: bodyBase / total,
  };

  if (hist.length < 3) return prior;  // confiar no prior até ter dados suficientes

  // Weighted history (recent decays at 0.82 per shot back)
  const counts = { WIDE: 0, T: 0, BODY: 0 };
  hist.forEach((h, i) => {
    const weight = Math.pow(0.82, hist.length - 1 - i);
    counts[h.dir] = (counts[h.dir] || 0) + weight;
  });
  const histTotal  = Object.values(counts).reduce((a, b) => a + b, 0.001);
  const empirical  = { WIDE: counts.WIDE / histTotal, T: counts.T / histTotal, BODY: counts.BODY / histTotal };

  // Blend: 60% empírico, 40% prior
  const blend = 0.60;
  const probs = {
    WIDE: blend * empirical.WIDE + (1 - blend) * prior.WIDE,
    T:    blend * empirical.T    + (1 - blend) * prior.T,
    BODY: blend * empirical.BODY + (1 - blend) * prior.BODY,
  };
  if (tacticalState?.anticipatedDir && probs[tacticalState.anticipatedDir] != null) {
    probs[tacticalState.anticipatedDir] += 0.08 + (tacticalState.patternPressure ?? 0) * 0.06;
    const sum2 = probs.WIDE + probs.T + probs.BODY;
    probs.WIDE /= sum2; probs.T /= sum2; probs.BODY /= sum2;
  }
  return probs;
}

// Return positioning candidates: lateral × depth = 6-9 combos
function generateReturnPosCands(isSec, sl) {
  // Lateral bias (relative to base return position)
  // Positive = toward T side, Negative = toward Wide side
  // (actual direction depends on serveLeft; we normalise by sign)
  const laterals = [
    { rxBias: 0.0,   tag: 'CENTER' },
    { rxBias: -0.6,  tag: 'SHIFT_WIDE' },   // drift wide (cover wide serve)
    { rxBias:  0.5,  tag: 'SHIFT_T' },      // drift toward T
  ];
  const depths = [
    { ryBias: 0.0,  tag: 'NORMAL' },
    { ryBias: 1.0,  tag: 'STEP_IN' },       // metres forward (into court)
    { ryBias: -0.8, tag: 'STEP_BACK' },     // metres backward
  ];

  const cands = [];
  laterals.forEach(l => depths.forEach(d => {
    cands.push({ rxBias: l.rxBias, ryBias: d.ryBias, tags: [l.tag, d.tag] });
  }));
  return cands;
}

// Score a return positioning candidate
function scoreReturnPosCand(rc, rCtx) {
  const probs = rCtx.serveProbs;
  const anticipatedDir = rCtx.tacticalRead?.anticipatedDir ?? null;
  const openDir = rCtx.tacticalRead?.openDir ?? null;
  const patternPressure = rCtx.tacticalRead?.patternPressure ?? 0;

  // coverageScore: how well does this position cover the likely serves?
  // SHIFT_T covers T and BODY better; SHIFT_WIDE covers WIDE.
  let coverage = 0;
  const isShiftT    = rc.tags.includes('SHIFT_T');
  const isShiftWide = rc.tags.includes('SHIFT_WIDE');
  const isCenter    = rc.tags.includes('CENTER');
  const isStepIn    = rc.tags.includes('STEP_IN');
  const isStepBack  = rc.tags.includes('STEP_BACK');

  if (isCenter)    coverage = (probs.T + probs.BODY) * 0.55 + probs.WIDE * 0.35;
  if (isShiftT)    coverage = probs.T * 0.75 + probs.BODY * 0.60 + probs.WIDE * 0.12;
  if (isShiftWide) coverage = probs.WIDE * 0.72 + probs.T * 0.22 + probs.BODY * 0.18;

  if (anticipatedDir === 'T' && isShiftT) coverage += 0.12 + patternPressure * 0.08;
  if (anticipatedDir === 'BODY' && isCenter) coverage += 0.11 + patternPressure * 0.06;
  if (anticipatedDir === 'WIDE' && isShiftWide) coverage += 0.12 + patternPressure * 0.08;
  if (openDir === 'WIDE' && isShiftT) coverage -= 0.04;
  if (openDir === 'BODY' && isShiftWide) coverage -= 0.04;

  // attackScore: step-in gives return advantage on 2nd serve or weak server
  let attack = 0;
  if (rCtx.isSec && isStepIn)  attack = 0.35 * (rCtx.returnAggroMode);
  if (!rCtx.isSec && isStepIn) attack = -0.10;  // stepping in against fast 1st = risky

  // riskScore: stepping in against big server 1st is dangerous
  let risk = 0;
  if (isStepIn  && !rCtx.isSec && rCtx.serverPower > 0.72) risk = -0.22;
  if (isStepBack && rCtx.isSec) risk = -0.10;  // stepping back on slow 2nd wastes advantage

  const EV = _c01(coverage + attack + risk);
  return { rc, EV };
}

// Pick return position via EV
function evPickReturnPos(rv, sv, gs) {
  const mc   = sv.ctx.matchCtx;
  const rvMc = rv.ctx.matchCtx;
  const isSec  = sv.faults === 1;
  const sl     = gs.serveLeft;
  const tacticalRead = computeServePatternState(mc, rvMc, isSec, sl);

  const serveProbs   = serveHistoryProbs(mc, isSec, { ...(sv.attrs ?? {}), netGame: sv.prefs?.netGame }, tacticalRead);
  const returnAggro  = rvMc.returnAggroMode || 0;
  // v4: saqueForca define a potência bruta do saque; saquePrecisao já foi usado em precAttr
  const _svSaqPct    = (sv.attrs?.saqueForca ?? sv.attrs?.saque ?? 60) / 100;
  const serverPower  = 0.68 + _svSaqPct * 0.28; // saqueForca=50→0.82, saqueForca=90→0.93

  const rCtx = { isSec, serveProbs, returnAggroMode: returnAggro, serverPower, tacticalRead };
  const cands  = generateReturnPosCands(isSec, sl);
  const scored = cands.map(rc => scoreReturnPosCand(rc, rCtx));
  rvMc.returnReadState = {
    anticipatedDir: tacticalRead.anticipatedDir,
    openDir: tacticalRead.counterOpenDir,
    patternPressure: tacticalRead.patternPressure,
  };

  const temp = isSec ? 0.22 : 0.18;
  const maxEV = Math.max(...scored.map(s => s.EV));
  const exps  = scored.map(s => Math.exp((s.EV - maxEV) / temp));
  const sumE  = exps.reduce((a, b) => a + b, 0);
  let r = Math.random() * sumE;
  for (let i = 0; i < scored.length; i++) {
    r -= exps[i]; if (r <= 0) return scored[i].rc;
  }
  return scored[scored.length - 1].rc;
}

// ── C) RETURN SHOT EV ────────────────────────────────────────────
// Called when the receiver makes first contact (rally === 0, i.e.
// serve return). Returns a hint object { type, targetXBias, depthBias }
// that aiDecideShot will use via the normal EV pipeline.
// We don't bypass aiDecideShot — we just pre-seed the intent.

// Classify incoming serve quality for the receiver
function classifyServeForReturn(ball, quality, sStyle) {
  const spd3d = Math.sqrt(ball.vel.x**2 + ball.vel.y**2 + ball.vel.z**2);
  const kmh   = spd3d * 3.6;

  // Height at contact matters a lot (kick serve = high, flat = low)
  const isHigh = ball.pos.z > 1.10;
  // [FIX] Classificação realista de saques ATP:
  // 1º saque ATP médio: ~195 km/h → deve ser HARD para o retornador
  // Threshold anterior (160 km/h) era muito baixo — classificava 90% dos saques como NEUTRAL
  const isFast    = kmh > 175;   // saque acima da média ATP = difícil de atacar
  const isVFast   = kmh > 200;   // saque de elite — quase impossível de atacar
  const isVSlow   = kmh < 120;   // saque muito lento (2º saque fraco) = fácil de atacar

  if (quality < 0.35 || (isVFast && isHigh))           return 'HARD';
  if (quality < 0.50 || (isFast  && isHigh))            return 'HARD';
  if (isFast && quality >= 0.55)                         return 'HARD';   // saque rápido e bem colocado
  if (quality >= 0.68 && (isVSlow || (!isFast && !isHigh))) return 'EASY'; // 2º saque real fraco
  return 'NEUTRAL';
}

function classifyServeForReturnV2(ball, quality, sv, rv) {
  const serveData = sv?._pendingServeData ?? null;
  const spd3d = Math.sqrt(ball.vel.x**2 + ball.vel.y**2 + ball.vel.z**2);
  const kmh   = serveData?.kmh ?? ball._serveExitKmh ?? (spd3d * 3.6);
  const physType = serveData?.physType ?? 'FLAT';
  const dir = serveData?.dir ?? 'T';
  const isHigh = ball.pos.z > 1.10;
  const isFast = kmh > 175;
  const isVFast = kmh > 200;
  const isSlow = kmh < 135;
  const isAttackable2nd = (sv?.faults === 1) && kmh < 160;
  const latGap = Math.abs((ball?.pos?.x ?? 0) - (rv?.pos?.x ?? 0));
  const stretch = latGap > 1.55 || (dir === 'WIDE' && latGap > 1.15);
  const jammed = dir === 'BODY' && latGap < 0.70;
  const kickPlayable = physType === 'KICK' && isHigh && kmh < 182 && latGap < 1.45;

  let kind = 'NEUTRAL';
  if (quality < 0.35 || (isVFast && isHigh) || (isFast && quality >= 0.55) || stretch) kind = 'HARD';
  else if (quality >= 0.68 && (isAttackable2nd || (isSlow && !isHigh))) kind = 'EASY';
  if (kickPlayable && kind === 'HARD') kind = 'NEUTRAL';

  return { kind, kmh, physType, dir, isHigh, isFast, isVFast, isSlow, isAttackable2nd, stretch, jammed, kickPlayable, quality };
}

// Given serve context, pre-compute a return intent hint
// This nudges the EV system (already called in aiDecideShot) toward
// the right return type. We don't override — just set ctx fields.
function computeReturnIntent(rv, sv, ball, quality, gsRally) {
  if (gsRally !== 0) return;  // only for first touch (serve return)

  const serveInfo = classifyServeForReturnV2(ball, quality, sv, rv);
  const rvMc = rv.ctx.matchCtx;
  const serveIntent = sv.ctx.matchCtx.serveIntent || 'SAFE';
  const attrs = rv.attrs ?? {};
  const retSkill = (attrs.devolucao ?? 60) / 100;
  const control = clamp(((attrs.controle ?? 60) / 100) * 0.45 + retSkill * 0.55, 0, 1);
  const read = (attrs.leitura ?? 60) / 100;
  const aggr = (attrs.visaoTatica ?? attrs.agressividade ?? 60) / 100;
  const touch = ((attrs.slice ?? 60) + (attrs.maos ?? attrs.controle ?? 60)) / 200;
  const canDrive = retSkill > 0.68 && control > 0.61;
  const canChip = touch > 0.62;

  let family = 'RESET';
  if (serveInfo.stretch) family = canChip ? 'CHIP_STRETCH' : 'BLOCK_STRETCH';
  else if (serveInfo.jammed) family = control > 0.62 ? 'BLOCK_BODY' : 'RESET_BODY';
  else if (serveInfo.kind === 'EASY' && canDrive && aggr > 0.56) family = 'DRIVE_ATTACK';
  else if (serveInfo.kind === 'HARD' && canChip && (serveInfo.physType === 'SLICE' || serveInfo.isHigh)) family = 'CHIP_RESET';
  else if (serveInfo.kind === 'HARD') family = 'BLOCK_RESET';
  else if (serveInfo.kind === 'NEUTRAL' && serveInfo.physType === 'KICK' && canDrive && read > 0.66) family = 'COUNTER_UP';
  else if (serveInfo.kind === 'NEUTRAL' && serveInfo.dir === 'BODY') family = 'BLOCK_BODY';
  else if (serveInfo.kind === 'NEUTRAL' && canDrive && aggr > 0.62 && serveInfo.kmh < 170) family = 'DRIVE_NEUTRAL';

  // Decide aggro mode for this return
  let aggroBoost = 0;
  if (serveInfo.kind === 'EASY')    aggroBoost =  0.30;
  if (serveInfo.kind === 'HARD')    aggroBoost = -0.25;
  if (serveIntent === 'OPEN')  aggroBoost -= 0.10;  // server opened court, be careful
  if (serveIntent === 'JAM')   aggroBoost += 0.15;  // jam = receiver can drive out
  aggroBoost += clamp((retSkill - 0.55) * 0.30, -0.06, 0.12);
  if (serveInfo.kickPlayable) aggroBoost += clamp((retSkill - 0.58) * 0.18, 0, 0.08);
  if (family === 'DRIVE_ATTACK' || family === 'DRIVE_NEUTRAL' || family === 'COUNTER_UP') aggroBoost += 0.16;
  if (family === 'CHIP_STRETCH' || family === 'CHIP_RESET') aggroBoost -= 0.06;
  if (family === 'BLOCK_RESET' || family === 'RESET_BODY') aggroBoost -= 0.12;

  // returnAggroMode drifts toward new value over time (smoothed)
  rvMc.returnAggroMode = _c01((rvMc.returnAggroMode || 0) * 0.75 + _c01(0.5 + aggroBoost) * 0.25);

  // Intent hint: set on ctx so EV rally system can use it on rally shot 1
  // 'neutralize' → hit deep middle to kill server's +1 angle
  // 'attack'     → drive aggressively (2nd serve / easy)
  // 'defend'     → chip back / reset (hard serve)
  const returnHint = serveInfo.kind === 'EASY'   ? 'attack'
                   : serveInfo.kind === 'HARD'   ? 'defend'
                   : serveIntent === 'OPEN' ? 'neutralize'
                   : 'neutralize';

  rv.ctx._returnHint = returnHint;
  rv.ctx._returnPlan = {
    family,
    serveKind: serveInfo.kind,
    serveDir: serveInfo.dir,
    servePhysType: serveInfo.physType,
    aggression: _c01(0.5 + aggroBoost),
    stretch: serveInfo.stretch,
    jammed: serveInfo.jammed,
  };
  const servePointData = sv?._pendingServeData ?? null;
  sv.ctx._servePatternPlan = buildServeFirstBallPlan(servePointData, rv.ctx._returnPlan, sv);
  rv.ctx._returnRecoveryPlan = buildReturnRecoveryPlan(servePointData, rv.ctx._returnPlan);

  // returnHistory
  rvMc.returnHistory = rvMc.returnHistory || [];
  rvMc.returnHistory.push({
    hint: returnHint,
    family,
    quality,
    serveDir: serveInfo.dir,
    serveType: serveInfo.physType,
    pointNum: sv?._pendingServeData?.pointNum ?? null,
  });
  if (rvMc.returnHistory.length > 6) rvMc.returnHistory.shift();
}

// ── End of SERVE EV + RETURN EV ──────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function tickPreServe(gs, dt) {
  const sv = gs.players[gs.server], rv = gs.players[gs.receiver], ball = gs.ball;
  sv.ctx._servePatternPlan = null;
  rv.ctx._returnRecoveryPlan = null;
  rv.ctx._returnPlan = null;
  rv.ctx._returnHint = null;
  const sx = gs.serveLeft ? -1.5 : 1.5;
  // Receptor posicionado ATRÁS da baseline para receber saque (+2m atrás)
  const rvBaseY = rv.side * (COURT.halfL + 2.0);
  sv.vel = v2(0, 0);
  rv.vel = v2(0, 0);
  sv.pos.x += (sx - sv.pos.x) * 0.15;
  sv.pos.y += (sv.side * (COURT.halfL + 0.5) - sv.pos.y) * 0.12;

  // ── Return Positioning EV ─────────────────────────────────────────
  // Compute position once at the start of PRE_SERVE (stateTimer ~ 0)
  // and store it; receiver drifts there during the wait.
  if (gs.stateTimer < 0.05 || !gs._rvPosTarget) {
    const rc = evPickReturnPos(rv, sv, gs);
    // Apply lateral bias: positive rxBias shifts toward T side (toward center)
    // Sign of shift depends on serveLeft (which half the serve goes to)
    const baseX = gs.serveLeft ? COURT.singlesW * 0.22 : -COURT.singlesW * 0.22;
    const biasSign = gs.serveLeft ? -1 : 1;  // T is at x≈0, so shifting toward T = inward
    gs._rvPosTarget = {
      x: baseX + biasSign * rc.rxBias,
      y: rvBaseY + rv.side * rc.ryBias,  // ryBias>0 = step in (toward net)
      tags: rc.tags,
    };

    // Debug log
    if (typeof window !== 'undefined' && window.EV_DEBUG) {
      console.log(`[RPOS] ${rv.name} → [${rc.tags.join('+')}] rx:${rc.rxBias.toFixed(1)} ry:${rc.ryBias.toFixed(1)} isSec:${sv.faults===1}`);
    }
  }

  const rvTargetX = clamp(gs._rvPosTarget.x, -COURT.singlesW / 2 + 0.2, COURT.singlesW / 2 - 0.2);
  const rvTargetY = clamp(gs._rvPosTarget.y, rv.side > 0 ? COURT.halfL + 0.5 : -(COURT.halfL + 4.0), rv.side > 0 ? COURT.halfL + 4.0 : -(COURT.halfL + 0.5));

  rv.pos.x += (rvTargetX - rv.pos.x) * 0.10;
  rv.pos.y += (rvTargetY - rv.pos.y) * 0.12;
  ball.pos.x = sv.pos.x; ball.pos.y = sv.pos.y; ball.pos.z = 0.8;
  if (gs.stateTimer > TIMING.preServeDelay) {
    gs._rvPosTarget = null;  // clear for next point
    gs.gameState = GameState.SERVING; gs.stateTimer = 0;
  }
}

function tickServing(gs, dt) {
  if (gs.stateTimer <= TIMING.serveWindup) return;
  const sv    = gs.players[gs.server], ball = gs.ball, sStyle = sv.styleData;
  const isSec = sv.faults === 1;
  gs.lastServeFirst   = !isSec;
  gs.receiverTouched  = false;
  const sl = gs.serveLeft; // serve direction shorthand

  // ── Smart serve selection ──────────────────────────────────────────────────
  // 7 serve types: [0]FLAT-T [1]FLAT-WIDE [2]FLAT-BODY [3]SLICE-WIDE
  //                [4]SLICE-T [5]KICK-BODY [6]KICK-T
  // [physType, spin, logName, clrMin, clrMax, sideSpinMult]
  // FLAT clearance elevado (0.38-0.52m) para compensar imprecisão de launchBall em saques diagonais rápidos.
  // SLICE/KICK já têm trajetória mais lenta/arredondada, clearance menor é suficiente.
  const SERVE_DEFS = [
    ['FLAT',  0,  'FLAT-T',      0.38, 0.52, 0.10],  // flat: quase sem sidespin
    ['FLAT',  0,  'FLAT-WIDE',   0.40, 0.54, 0.10],
    ['FLAT',  0,  'FLAT-BODY',   0.40, 0.54, 0.10],
    ['SLICE', -1, 'SLICE-WIDE',  0.34, 0.45, 1.18],  // slice segue abrindo, mas menos automático
    ['SLICE', -1, 'SLICE-T',     0.32, 0.42, 1.08],  // T slice mais sutil e menos ace-factory
    ['KICK',  1,  'KICK-BODY',   0.52, 0.68, 0.45],  // era 0.75 → kick: sidespin suave, bounce alto
    ['KICK',  1,  'KICK-T',      0.46, 0.62, 0.45],  // era 0.75 → kick: sobe e desvia
  ];

  // ── Serve Decision EV ──────────────────────────────────────────────────────
  // Replaces the old weighted-random pick. Uses pressure/safety/reward/pattern
  // scoring + softmax to choose physType + direction. All physics unchanged.
  const rv = gs.players[gs.receiver];
  const scoreState = _getPointPressureState(gs);
  const isBreakPoint = scoreState[gs.receiver].isBreakPoint;

  const { picked: evPick, sCtx: evSCtx, scored: evScored } =
    evPickServe(isSec, sl, sv, rv, isBreakPoint, SERVE_DEFS);
  const chosen = evPick.c.defIdx;

  const [physType, svcSpin, svcName, clrMin, clrMax, sideSpinMult] = SERVE_DEFS[chosen];

  // ── Signature Shot: BIG_SERVE — detectar se este saque é um golpe assinatura.
  // O saque vai por caminho separado (evPickServe), nunca passa pelo evChooseShot
  // nem pelo loop de boost de EV. Detectar aqui para que pushShotVFX
  // exiba o label dourado corretamente.
  const _SERVE_SIG_KEYS = new Set([
    'SERVE_FLAT_BOMB', 'SERVE_KICK_HIGH',
    'SERVE_SLICE_WIDE', 'SERVE_JAM_BODY', 'SERVE_T_LASER',
  ]);
  const isSignatureServe = !isSec &&
    !!sv.naturalSignature &&
    _SERVE_SIG_KEYS.has(sv.naturalSignature);

  // ── Power: 1º saque diferencia por tipo para dar realismo ─────────────────
  // FLAT: máxima velocidade; SLICE: moderado; KICK: mais lento mas com efeito
  // traitServeMult: CANHAO_SAQUE, PRECISAO_CIRURGICA, SEGUNDO_SAQUE_ARMA, etc.
  const svTraitFx   = getUnifiedPlayerTraitFx(sv, gs);
  const traitServeDelta = svTraitFx.serveMult - 1;
  const traitServMult = 1 + traitServeDelta * (isSec ? 0.58 : 0.46);
  const mult1 = (sv.mods ? sv.mods.serveMult1 : 1.0) * traitServMult;
  const mult2 = (sv.mods ? sv.mods.serveMult2 : 1.0) * traitServMult;
  let svcPow;
  // Serve power from attrs.saque (v3): 0–100 scale
  // saque=50 → ~55-65 m/s (198-234 km/h) flat first | saque=90 → ~65-75 m/s (234-270 km/h)
  // saqueForca: define o range de velocidade (km/h) do saque
  const _saqAttr = sv.attrs?.saqueForca ?? sv.attrs?.saque ?? 60;
  // Calibrado para velocidades ATP reais (m/s direto → km/h = m/s * 3.6)
  // saque=50→184-214km/h (1º) / 126-148km/h (2º)
  // saque=90→212-253km/h (1º) / 143-171km/h (2º) — elite tier correto
  const _srv1Min = 41 + _saqAttr * 0.20;   // saque=50→51.0  saque=90→59.0  (m/s)
  const _srv1Max = 46 + _saqAttr * 0.27;   // saque=50→59.5  saque=90→70.3  (m/s)
  const _srv2Min = 29 + _saqAttr * 0.12;
  const _srv2Max = 33 + _saqAttr * 0.16;
  if (!isSec) {
    if      (physType === 'FLAT')  svcPow = rand(_srv1Min, _srv1Max) * mult1;
    else if (physType === 'SLICE') svcPow = rand(_srv1Min * 0.77, _srv1Max * 0.79) * mult1;
    else                           svcPow = rand(_srv1Min * 0.66, _srv1Max * 0.71) * mult1;
  } else {
    const maxSec = _srv1Min * mult1 * 0.72;  // 2º saque: bem mais contido
    if      (physType === 'FLAT')  svcPow = Math.min(rand(_srv2Min, _srv2Max) * mult2, maxSec * 0.88);
    else if (physType === 'SLICE') svcPow = Math.min(rand(_srv2Min, _srv2Max) * mult2 * 0.82, maxSec * 0.94);
    else                           svcPow = Math.min(rand(_srv2Min, _srv2Max) * mult2 * 0.90, maxSec * 0.90);
  }
  // Big server bonus: saque ≥ 85 gives extra kick on 1st flat
  if (_saqAttr >= 85 && !isSec && physType === 'FLAT') svcPow *= 1.03 + (_saqAttr - 85) * 0.002;

  // ── Court surface serve bonus: grama/indoor favorecem sacadores; saibro penaliza ──
  // serveBonus +0.12 (Wimbledon) = 12% mais força de saque; -0.10 (RG) = 10% menos.
  const courtServeBonus = gs.courtMods?.serveBonus ?? 0;
  svcPow *= (1 + courtServeBonus);

  // svcPow já está em m/s reais (calibrado nas fórmulas _srv1Min/_srv1Max acima).
  // Não há mais SERVE_SPEED_SCALE — a divisão anterior reduzia o saque para ~144km/h.
  let svcPowFis = svcPow;

  // Hard cap ATP: recordes reais ~250km/h. BIG_SERVER saque=99 pode chegar a ~239km/h.
  // 66.4 m/s × 3.6 = 239 km/h — nível elite absoluto correto.
  const ATP_MAX_SERVE_MS = 69.4; // ≈ 250 km/h — teto extremo, mais raro
  svcPowFis = Math.min(svcPowFis, ATP_MAX_SERVE_MS);
  let svcClr = rand(clrMin, clrMax);

  // Target Y: 2º saque vai para o centro da caixa (50-62%), nunca perto da service line
  const tYfrac = isSec ? rand(0.50, 0.62) : rand(0.58, 0.70);
  let tY = -sv.side * COURT.serviceLineY * tYfrac;
  // Diagonal rule: sl=true → ball must land at x>=0; sl=false → x<=0
  let tX;
  switch (chosen) {
    case 0: tX = sl ? rand(0.10, 0.60) : rand(-0.60, -0.10); break;  // FLAT-T
    case 1: tX = sl ? rand(1.4, 2.4)  : rand(-2.4, -1.4); break;     // FLAT-WIDE
    case 2: tX = sl ? rand(0.5, 1.4)  : rand(-1.4, -0.5); break;     // FLAT-BODY
    case 3: tX = sl ? rand(1.0, 1.9)  : rand(-1.9, -1.0); break;     // SLICE-WIDE
    case 4: tX = sl ? rand(0.10, 0.7) : rand(-0.7, -0.10); break;    // SLICE-T
    case 5: tX = sl ? rand(0.4, 1.3)  : rand(-1.3, -0.4); break;     // KICK-BODY
    case 6: tX = sl ? rand(0.10, 0.6) : rand(-0.6, -0.10); break;    // KICK-T
    default: tX = 0;
  }

  // ── Probabilidade de falta (mecanismo principal de fault rate realístico) ──
  // Calibrado para ATP real: srv1Prec=90 → ~77% in; srv1Prec=78 → ~72%; srv1Prec=70 → ~68%.
  const staminaFracSv  = sv.stamina ?? 1.0;
  const fatiguePenalty = (1 - staminaFracSv) * (isSec ? 0.05 : 0.08);
  // FIX: coeff 0.05→0.20 — mentalidade importa de verdade em break points
  // mental=97 (Nakamura): bpPenalty=0.006 (quase protegido) | mental=68 (Ajuba): 0.064 (sente o peso)
  const bpPenalty      = isBreakPoint && isSec ? (1 - (sv.mods?.pressaoFactor ?? 0.70)) * 0.20 : 0;

  // v4: saque split — precisão para scatter/faultRate, força para velocidade da bola
  const precAttr = sv.attrs?.saquePrecisao ?? sv.attrs?.saque ?? 70;
  const servePrecMult = clamp(sv.mods?.servePrecisaoMult ?? 1.0, 0.85, 1.30);
  const serveScatterMult = clamp((sv.mods?.serveScatter ?? 0.75) / 0.75, 0.70, 1.30);
  const servePrecisionStability = clamp(0.90 + (servePrecMult - 1.0) * 0.90, 0.78, 1.20);
  // FIX: fórmula anterior dava ~9.8% de dupla falta para saque:92 — muito acima do real ATP (~3-5%).
  // Fórmula ajustada: base 0.04 (ATP elite mínimo) + escala 0.18 por falta de precisão.
  //   saque:92 → 5.4% | saque:85 → 6.7% | saque:70 → 9.4% | saque:50 → 13%
  // 1º saque: mantido — variabilidade alta é parte do design (serve para abrir risco/recompensa).
  const baseFaultRate = isSec
    ? clamp((0.038 + (1 - precAttr / 100) * 0.16) / servePrecisionStability, 0.02, 0.20)
    : (0.29 + (1 - precAttr / 100) * 0.44) / servePrecisionStability;  // 1o saque levemente mais estável
  const faultProb = clamp(baseFaultRate + fatiguePenalty + bpPenalty, 0, 0.55);
  // FASE 2.2: serveMod > 1 = mais confiante = menos faltas; < 1 = menos confiante = mais faltas
  const faultProbFinal = clamp(faultProb / (sv._formMods?.serveMod ?? 1.0), 0, 0.55);

  let isLongFault = false, isNetFault = false;
  if (Math.random() < faultProbFinal) {
    // Saque falhado: direcionar propositalmente para fora da caixa
    // 1º saque: agressivo → 60% LONG / 20% WIDE / 20% NET
    // 2º saque: conservador, mira central → menos LONG (vai curto, não longo)
    //           30% LONG / 45% WIDE / 25% NET
    const r = Math.random();
    const longThresh = isSec ? 0.30 : 0.60;
    const wideThresh = isSec ? 0.75 : 0.80;  // 30+45=75% | 60+20=80%
    const faultDir = r < longThresh ? 'LONG' : r < wideThresh ? 'WIDE' : 'NET';
    if (faultDir === 'LONG') {
      // 1º saque: tYfrac 0.58-0.70 → |tY| 3.71-4.48m → mult mínimo = 6.4/4.48 = 1.43 → usar 1.80+
      // 2º saque: tYfrac 0.50-0.62 → |tY| 3.20-3.97m → mult mínimo = 6.4/3.20 = 2.00 → usar 2.05+
      const longMult = isSec ? (2.05 + Math.random() * 0.20) : (1.80 + Math.random() * 0.20);
      tY *= longMult;
      isLongFault = true;   // pula o clamp de tY abaixo (senão clamp anula a correção)
    } else if (faultDir === 'WIDE') {
      tX = Math.sign(tX || (sl ? 1 : -1)) * (COURT.singlesW / 2 + 0.25 + Math.random() * 0.60);
    } else {
      isNetFault = true;    // vel.z será forçado negativo APÓS launchBall (netClearance é ignorado)
    }
    // Track fault for serve EV pattern memory
    if (sv.ctx.matchCtx) {
      sv.ctx.matchCtx.recentFaults = Math.min(4, (sv.ctx.matchCtx.recentFaults || 0) + 1);
      if (!isSec) sv.ctx.matchCtx.serve1InStreak = 0;
    }
  }

  // ── ATP Shot Engine — Serve Strike Quality (serveSQ) ─────────────────────
  // Serve não tem Contact Space (não reage à bola), mas tem qualidade de execução
  // baseada em atributo saque + fadiga. Este SQ alimenta computeSigmaX e getAtpSpinMultipliers,
  // alinhando o saque com a mesma física dos groundstrokes.
  //
  // precAttr=92 (elite) → serveSQ≈0.88 (1º) / 0.80 (2º)
  // precAttr=70 (médio) → serveSQ≈0.72 (1º) / 0.64 (2º)
  // precAttr=50 (fraco) → serveSQ≈0.62 (1º) / 0.54 (2º)
  const staminaFracSq = sv.stamina ?? 1.0;
  const fatigueSqMod  = 0.88 + staminaFracSq * 0.12; // stamina=1.0→1.00 | stamina=0.5→0.94 | stamina=0→0.88
  const secPenalty    = isSec ? 0.08 : 0.0;           // 2º saque conservador = menos qualidade de execução
  const serveSQMult   = clamp(0.92 + (servePrecMult - 1.0) * 0.55, 0.84, 1.14);
  const serveSQ       = clamp((0.50 + precAttr / 100 * 0.45) * fatigueSqMod * serveSQMult - secPenalty, 0.35, 0.95);

  // ── Dispersão gaussiana de trajetória — agora via computeSigmaX ───────────
  // Substitui o gaussian manual (sigma = sigmaBase × (1-precFrac) × 0.5).
  // computeSigmaX usa a mesma calibração ATP dos groundstrokes:
  //   FLAT serve  → FLAT  σXMax=0.80 (saque plano, alta velocidade, menos margem)
  //   KICK serve  → TOPSPIN σXMax=0.55 (spin Magnus dá margem extra)
  //   SLICE serve → SLICE  σXMax=0.45 (mais controlado lateralmente)
  // Mapeamento de physType → shotType equivalente para σ
  const serveToShotType = { FLAT: 'FLAT', KICK: 'TOPSPIN', SLICE: 'SLICE' };
  const serveSigmaType  = serveToShotType[physType] ?? 'FLAT';
  const SERVE_HALF_S    = COURT.singlesW / 2;

  // σX ATP calibrado: precisão controla o alvo, mas saque forte paga risco lateral real.
  const _saqForcaAttr = sv.attrs?.saqueForca ?? sv.attrs?.saque ?? 60;
  let serveSigmaX = computeSigmaX(
    serveSigmaType, serveSQ, tX, SERVE_HALF_S,
    precAttr,   // saque attr faz papel de controle (precisão = controle para saques)
    _saqForcaAttr,
    'FULL',     // serve sempre é swing completo
    sv.pos.x
  ) * serveScatterMult;

  if (physType === 'SLICE') serveSigmaX *= 1.22;
  if (isSec) serveSigmaX *= 0.92;

  // Box-Muller para aplicar σX no scatter
  const gaussRand = (sigma) => {
    const u1 = Math.max(1e-9, Math.random()), u2 = Math.random();
    return sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
  // σX → X scatter direto. Y scatter usa 65% do X (profundidade tem menos variância que lateral)
  tX += gaussRand(serveSigmaX);
  tY += gaussRand(serveSigmaX * 0.58);

  // 2º saque: alvo mais central e seguro
  if (isSec) {
    tX *= 0.82;
    tY *= 0.94;
  }

  // Clamp tX à metade diagonal correta com margem de segurança de 0.50m da sideline
  // [PATCH] Exceto WIDE faults: já foram colocados além da sideline, não clampar
  const sideLimit = COURT.singlesW / 2 - 0.50;
  const minX = sl ? 0.0 : -sideLimit;
  const maxX = sl ? sideLimit : 0.0;
  const isWideFault = Math.abs(tX) > COURT.singlesW / 2;   // detecta se foi wide fault
  if (!isWideFault) tX = Math.max(minX, Math.min(maxX, tX));

  // Clamp tY dentro da caixa de serviço (0→serviceLineY na metade do receptor)
  // Limitar a 95% da service line para evitar que saques longos se tornem DFs triviais
  // EXCEÇÃO: isLongFault — tY já foi empurrado além da service line propositalmente, não clampar
  const minAbsY = COURT.serviceLineY * 0.08;   // mínimo: 8% da caixa (bola muito curta = net)
  const maxAbsY = COURT.serviceLineY * 0.96;   // máximo: 96% (margem antes da service line)
  const tYsign = Math.sign(tY) || -sv.side;
  if (!isLongFault) tY = tYsign * Math.max(minAbsY, Math.min(maxAbsY, Math.abs(tY)));

  if (!isSec) sv.stats.serve1Total++; else sv.stats.serve2Total++;

  // ── Determine display target name ──────────────────────────────────────────
  const absX = Math.abs(tX);
  let tgtName;
  if   (absX < 0.8) tgtName = 'T';
  else if (absX < 1.6) tgtName = 'BODY';
  else tgtName = 'WIDE';

  // ── Launch ─────────────────────────────────────────────────────────────────
  ball.pos.x = sv.pos.x; ball.pos.y = sv.pos.y;
  launchBall(ball, { x: sv.pos.x, y: sv.pos.y }, tX, tY, svcSpin, svcPowFis, svcClr, 2.5);
  ball._serveNetTouched = false;
  ball._lipNet = false;

  // NET fault: launchBall ignora o parâmetro netClearance (era do solver antigo).
  // Forçar vel.z negativo garante que a bola bate na rede antes de cruzar para o outro lado.
  if (isNetFault) {
    ball.vel.z = -(Math.abs(ball.vel.z) + 1.5 + Math.random() * 1.0);
  }

  // Captura velocidade de saída da raquete (medição realista como radar ATP)
  // launchBall já definiu ball.vel — mag3 aqui é a velocidade no instante do contato
  ball._serveExitKmh = Math.round(mag3(ball.vel) * 3.6);

  // Registra qualidade estimada do saque no servidor para o mecanismo de carryover.
  // O receiver vai usar sv._lastQuality para calcular a penalidade de momentum.
  // Fórmula: 1º saque ~180-230km/h → Q 0.65-0.90 | 2º saque ~130-160km/h → Q 0.45-0.65
  sv._lastQuality = clamp(0.37 + (ball._serveExitKmh - 112) / 290, 0.37, 0.90);

  const sm = svcPowFis * 0.6;
  // ── Spin por família de saque — Fase ATP ──────────────────────────────────
  // getAtpSpinMultipliers usa o atributo topspin/slice do servidor para escalar o RPM real.
  // Antes: multiplicadores fixos independentes do jogador.
  // Agora: jogador com topspin=85 produz kick com quique ~25% mais alto que topspin=50.
  //
  // Mapeamento: KICK usa topspinMult (topspin attribute → kick bounce height)
  //             SLICE usa sliceMult (slice attribute → serve slice lateral)
  //             FLAT: spin mínimo (não muda — FLAT serve não tem efeito relevante)
  const serveSpinMults = getAtpSpinMultipliers(
    physType === 'KICK' ? 'HEAVY_TOP' : physType === 'SLICE' ? 'SLICE' : 'FLAT',
    sv.attrs,
    sv.mods,
    serveSQ
  );
  const { topspinMult: serveTopMult, sliceMult: serveSlcMult } = serveSpinMults;

  if (physType === 'KICK') {
    // FIX P3.3: sidespin do KICK com variância gaussiana — cada kick é ligeiramente diferente,
    // tornando mais difícil para o receptor prever a direção exata do desvio lateral.
    const kickSideVariance = (Math.random() + Math.random() - 1.0) * 0.12;
    ball.spin.x = -sm * 2.8 * serveTopMult * Math.sign(ball.vel.y);  // ATP: topspinMult amplifica quique
    ball.spin.z = sm * (sideSpinMult + kickSideVariance) * (sl ? 1 : -1);
  } else if (physType === 'SLICE') {
    ball.spin.x =  sm * 0.6  * serveSlcMult * Math.sign(ball.vel.y); // ATP: sliceMult amplifica corte lateral
    ball.spin.z = sm * sideSpinMult * (sl ? 1 : -1);
  } else {
    ball.spin.x = -sm * 0.15 * Math.sign(ball.vel.y);                // FLAT: spin mínimo (inalterado)
    ball.spin.z = 0;
  }

  // Guarda alvo para log de delta no 1º quique (validação do solver)
  ball._serveTargetY = tY;
  ball._servePhysType = physType;
  ball._serveDir      = tgtName;   // 'T' | 'BODY' | 'WIDE' — usado para ajuste de ace
  gs.log.push(`🎾 [${sStyle.abbr}] ${isSec?'2º':'1º'} SAQUE ${svcName} · ${ball._serveExitKmh}km/h → ${tgtName}`);
  ball.lastHitBy = gs.server; sv.shotCount++;

  // ── Registrar dados do saque para resolvePoint ────────────────────────────
  gs._pendingServeData = {
    isFirst:  !isSec,
    kmh:      ball._serveExitKmh,
    physType: physType,
    dir:      tgtName,
    serveLeft: sl,
    pointNum: gs.totalPoints + 1,
  };

  // ── Match context: record serve direction for serve+1 tactic ──
  if (sv.ctx.matchCtx) {
    const absXServe = Math.abs(tX);
    if   (absXServe < 0.8) sv.ctx.matchCtx.serveDir = 'BODY';
    else if (sl)           sv.ctx.matchCtx.serveDir = 'RIGHT';
    else                   sv.ctx.matchCtx.serveDir = 'LEFT';
    sv.ctx.matchCtx.serveN = (sv.ctx.matchCtx.serveN || 0) + 1;

    // ── EV: record serve intent and history ────────────────────────
    const intent = deriveServeIntent(evPick.c);
    sv.ctx.matchCtx.serveIntent  = intent;
    sv.ctx.matchCtx.servePhys    = physType;
    // push to circular history (will be updated with outcome later)
    pushServeHistory(sv.ctx.matchCtx, {
      dir:      evPick.c.dir,
      physType: physType,
      isSec:    isSec,
      serveLeft: sl,
      pointNum: gs.totalPoints + 1,
      outcome:  'IN',  // optimistic; fault resolution will not update this easily
    });
    // update serve1InStreak
    if (!isSec) sv.ctx.matchCtx.serve1InStreak = (sv.ctx.matchCtx.serve1InStreak || 0) + 1;
    sv.ctx.matchCtx.recentFaults = 0;  // reset on successful serve

    // ── EV Debug log ───────────────────────────────────────────────
    if (typeof window !== 'undefined' && window.EV_DEBUG) {
      const top2 = [...evScored].sort((a,b)=>b.EV-a.EV).slice(0,2);
      console.log(`[SV-EV] ${sv.name} ${isSec?'2nd':'1st'} | recv:[x:${_f2(rv.pos.x)} ${evSCtx.rvIsWide?'WIDE':evSCtx.rvIsInside?'IN':'MID'}] | intent:${intent}`);
      top2.forEach((s,i)=>{ const ch=s===evPick?'★':` ${i+1}`; console.log(`  ${ch} ${SERVE_DEFS[s.c.defIdx][2].padEnd(12)} dir:${s.c.dir.padEnd(5)} EV:${s.EV.toFixed(3)} [P:${s.sub.pressure.toFixed(2)} R:${s.sub.reward.toFixed(2)} S:${s.sub.safety.toFixed(2)} V:${s.sub.pattern.toFixed(2)}]`); });
    }
  }

  // ── Tech log ───────────────────────────────────────────────────────────────
  pushTech(gs,
    `[SQ] ${isSec?'2º':'1º'} SAQUE │ ${sv.name} │ ${svcName} │ ${ball._serveExitKmh}km/h │ alvo:${tgtName} │ intent:${sv.ctx.matchCtx.serveIntent||'?'} │ falta:${sv.faults} │ serveSQ:${serveSQ.toFixed(2)} │ σX:${serveSigmaX.toFixed(3)}m\n` +
    `     servidor  pos(x=${_f2(sv.pos.x)}, y=${_f2(sv.pos.y)})\n` +
    `     receptor  pos(x=${_f2(rv.pos.x)}, y=${_f2(rv.pos.y)}) [${evSCtx.rvIsWide?'WIDE':evSCtx.rvIsInside?'INSIDE':'MID'}]\n` +
    `     alvo      pos(x=${_f2(tX)}, y=${_f2(tY)})  clr:${_f2(svcClr)}m\n` +
    `     bola vel  (x=${_f2(ball.vel.x)}, y=${_f2(ball.vel.y)}, z=${_f2(ball.vel.z)})\n` +
    `     bola spin (x=${_f1(ball.spin.x)}, z=${_f1(ball.spin.z)})`
  );

  playSound('HIT', { speed: Math.round(Math.sqrt(ball.vel.x**2+ball.vel.y**2+ball.vel.z**2)*3.6) });
  pushShotVFX(gs, sv, svcName, isSec ? 0.55 : 0.92, false, isSignatureServe);
  // Serve-and-volley removido — arquétipo SRV_VOL não está mais ativo no jogo.
  // Subida à rede acontece apenas via lógica de approach durante o rally (game.js ~2036).
  gs.gameState = GameState.RALLY; gs.stateTimer = 0; gs.serveBounced = false; gs.isFirstBounce = true;
}

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
      // prepScore é acumulado aqui e passado para o ContactModel no momento do hit.
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
    const staminaTimingPenalty = clamp(1 + (1 - (p.stamina ?? 1.0)) * 0.30 * lowStaminaPenaltyMult * (1 - lowStaminaRelief), 1.0, 1.30);
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
  const key = player?.prefs?.netGame ?? 'RELUCTANT';
  let profile;
  switch (key) {
    case 'HUNTER':
      // Sampras: a rede é o plano A, não a recompensa.
      // base alto → acumula netIntent em todo rally
      // carry alto → não decai entre golpes
      // threshold baixo → decide subir cedo
      // minQ baixo → não espera bola perfeita para aproximar
      // fitFloor baixo → qualquer golpe razoável serve de aproximação
      profile = { base: 0.20, carry: 0.80, weakReturn: 0.40, shortBall: 0.34, slowBall: 0.22,
                  pressure: 0.16, neutral: 0.12, threshold: 0.38, minQ: 0.36, maxBehind: 2.0,
                  oppDepth: 0.42, cooldown: 1, fitFloor: 0.18 };
      break;
    case 'PROACTIVE':
      profile = { base: 0.08, carry: 0.70, weakReturn: 0.26, shortBall: 0.24, slowBall: 0.14,
                  pressure: 0.10, neutral: 0.05, threshold: 0.52, minQ: 0.44, maxBehind: 1.5,
                  oppDepth: 0.52, cooldown: 2, fitFloor: 0.28 };
      break;
    case 'OPPORTUNIST':
      // Sobe somente quando a bola convida — threshold moderado, exigência real de fit
      profile = { base: 0.01, carry: 0.52, weakReturn: 0.10, shortBall: 0.16, slowBall: 0.08,
                  pressure: 0.02, neutral: 0.00, threshold: 0.68, minQ: 0.54, maxBehind: 0.9,
                  oppDepth: 0.62, cooldown: 3, fitFloor: 0.40 };
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
    carry: clamp(profile.carry + carryShift, 0.30, 0.82),
    threshold: clamp(profile.threshold + thresholdShift, 0.42, 0.98),
    minQ: clamp(profile.minQ + minQShift, 0.38, 0.80),
    fitFloor: clamp(profile.fitFloor + fitShift, 0.18, 0.60),
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

function advanceNetPhaseAfterShot(player, shot, effectiveQuality) {
  const ctx = player?.ctx;
  if (!ctx || !shot) return;

  syncNetPhaseState(player);

  const shotType = shot.type ?? 'TOPSPIN';
  const isApproachShot = ['SLICE', 'DRIVE', 'ACCEL', 'TOPSPIN', 'SHORT_ACCEL'].includes(shotType);
  const isNetTouch = shotType === 'VOLLEY' || shotType === 'HALF_VOLLEY';
  const isFinisher = shotType === 'SMASH'
    || ((shotType === 'VOLLEY' || shotType === 'ACCEL' || shotType === 'SHORT_ACCEL') && effectiveQuality >= 0.66);

  if (ctx.courtMode === 'TRANSITION' && isApproachShot) {
    ctx.netPhase = 'APPROACH';
    return;
  }

  if (player.atNet && ctx.courtMode === 'NET') {
    if (ctx.netPhase === 'APPROACH' && isNetTouch) {
      ctx.netPhase = 'FIRST_VOLLEY';
      return;
    }
    if ((ctx.netPhase === 'FIRST_VOLLEY' && (isNetTouch || isFinisher)) || isFinisher) {
      ctx.netPhase = 'CLOSE_FINISH';
      return;
    }
  }

  if (!player.atNet && ctx.courtMode === 'BASE') {
    ctx.netPhase = 'BASE';
  }
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
  const oppPlayedShort = opp?.ctx?.lastShotType === 'DROP'
    || opp?.ctx?.lastShotType === 'DROP2'
    || opp?.ctx?.lastShotType === 'SLICE_SHORT'
    || ((opp?.ctx?._returnHint ?? null) === 'defend' && gs.rally <= 1);

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
    gain += shotFit * 0.18;
  }
  if (!oppPlayedShort && !isSlowBall && attacking && effectiveQuality > 0.60) {
    gain += profile.neutral;
  }
  if (playerDefending) {
    gain *= 0.15;
  }

  ctx.netIntent = clamp((ctx.netIntent ?? 0) * profile.carry + gain, 0, 1);
  ctx.netIntentSource = source;

  const clearWindow = oppPlayedShort
    || isSlowBall
    || weakReturnBoost > 0.16
    || oppDepth > profile.oppDepth;
  const readyToTransition = playerInside
    && !playerDefending
    && effectiveQuality >= profile.minQ
    && shotFit >= profile.fitFloor
    && clearWindow;

  if (!player.atNet
      && ctx.courtMode === 'BASE'
      && (ctx.transitionCooldown ?? 0) <= 0
      && readyToTransition
      && (ctx.netIntent ?? 0) >= profile.threshold) {
    player.atNet = false;
    ctx._netApproachedThisPoint = true;
    ctx.courtMode = 'TRANSITION';
    ctx.netPhase = 'APPROACH';
    ctx.transitionCooldown = profile.cooldown;
    ctx.netIntent = Math.max(0.18, (ctx.netIntent ?? 0) * 0.45);
    ctx._approachLandX = shot.targetX ?? 0;
    ctx._approachQuality = clamp(shotFit, 0, 1); // qualidade do approach para profundidade na rede
    player.stats.netApproaches++;
    const reason =
      source === 'weak_return' ? ' (saque + resposta fraca)' :
      source === 'short_ball'  ? ' (bola curta)' :
      source === 'slow_ball'   ? ' (bola lenta)' :
      source === 'pressure'    ? ' (pressão construída)' :
      '';
    gs.log.push(`📡 [${player.styleData?.abbr ?? 'NET'}] ${player.name} sobe à rede${reason}`);
  }
}
