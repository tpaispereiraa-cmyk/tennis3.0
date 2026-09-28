import { GameState } from './constants.js';
import { createBall, gameTick } from '../game.jsx';
import { heatScoreToTier } from '../systems/analytics/MatchHeat.js';
import { buildMatchTelemetry, createSimulationEdgeCaseTracker } from '../systems/analytics/simulationTelemetry.js';
import { narrateMatch } from '../systems/press/MatchNarrator.js';

const DT_HEADLESS = 1 / 120;
const MAX_TICKS_PER_POINT = 30_000;
const MAX_POINTS_PER_MATCH = 600;

function runHeadless(fn) {
  const realSetTimeout = globalThis.setTimeout;
  const pending = [];
  let nextTimerId = 1;
  globalThis.setTimeout = (callback) => {
    pending.push(callback);
    return nextTimerId++;
  };
  try {
    return fn(pending);
  } finally {
    globalThis.setTimeout = realSetTimeout;
  }
}

function buildResumeResult(gs, matchMeta, ticks, points, edgeCases) {
  const [pA, pB] = gs.players;
  const winner = pA.sets > pB.sets ? pA : pB;
  const loser = winner === pA ? pB : pA;
  const setCount = Math.max(pA.setsHistory?.length ?? 0, pB.setsHistory?.length ?? 0);
  const setsDetail = Array.from({ length: setCount }, (_, index) => [
    pA.setsHistory?.[index] ?? 0,
    pB.setsHistory?.[index] ?? 0,
  ]);

  for (const player of [pA, pB]) {
    player.stats.avgQuality = player.stats.qualityCount > 0
      ? Math.round((player.stats.qualitySum / player.stats.qualityCount) * 1000) / 1000
      : null;
  }

  const telemetry = buildMatchTelemetry(pA.stats, pB.stats, {
    points,
    mode: 'resume-headless',
    courtKey: gs.courtKey ?? null,
    surface: gs.courtMeta?.surface ?? null,
    edgeCases,
    validationFlags: [
      ...(edgeCases.length ? ['EDGE_CASES_PRESENT'] : []),
      ...(gs.matchRetirement ? ['MATCH_RETIREMENT'] : []),
    ],
  });
  const result = {
    winner,
    loser,
    format: matchMeta?.format ?? null,
    matchTiebreakScore: gs.matchTiebreakScore ?? null,
    sets: [pA.sets, pB.sets],
    setsDetail,
    stats: { a: pA.stats, b: pB.stats },
    telemetry,
    heat: gs.heat ? {
      score: Math.round(gs.heat.score),
      peak: Math.round(gs.heat.peak),
      tier: heatScoreToTier(gs.heat.peak),
    } : null,
    retirement: gs.matchRetirement ?? null,
    inMatchInjuryEvents: gs.inMatchInjuryEvents ?? [],
    log: gs.log,
    gs,
    ticks,
    points,
    edgeCases,
  };
  try {
    const narration = narrateMatch(winner, loser, result, telemetry.surface ?? gs.courtMeta?.surface ?? 'HARD');
    result.matchNarrativeDossier = {
      headline: narration?.headline ?? `${winner.name} vence ${loser.name}`,
      thesis: narration?.tactical_summary ?? `${winner.name} fechou a partida.`,
      fullReport: narration?.full_report ?? null,
      tags: narration?.tags ?? [],
      mode: 'resume-headless',
      meta: narration?._meta ?? {},
    };
  } catch (error) {
    console.warn('[ResumeHeadless] narrativa final indisponível:', error);
  }
  return result;
}

// Continua exatamente do GameState visual atual. Não reinicia placar, fadiga,
// momento, lesões, estatísticas ou o histórico de sets já assistido.
export function simulateRemainingMatchHeadless(gameState, matchMeta = null) {
  if (!gameState?.players || gameState.players.length !== 2) {
    throw new Error('A partida visual não possui um GameState válido para continuar.');
  }
  const edgeCaseTracker = createSimulationEdgeCaseTracker();
  let ticks = 0;
  let points = 0;

  const gs = runHeadless((pending) => {
    // O POINT_END visual aguarda um timeout real. Como o ponto já foi
    // contabilizado, iniciar o próximo saque é a continuação equivalente.
    if (gameState.gameState === GameState.POINT_END) {
      gameState.rally = 0;
      gameState.serveLeft = !gameState.serveLeft;
      gameState._matchPointCounter = (gameState._matchPointCounter ?? gameState.totalPoints ?? 0) + 1;
      gameState._currentPointId = gameState._matchPointCounter;
      gameState._lastShotEvent = null;
      if (gameState.players[gameState.server]) gameState.players[gameState.server].faults = 0;
      gameState.ball = createBall();
      gameState.lastBouncePos = null;
      gameState.isFirstBounce = true;
      gameState.receiverTouched = false;
      for (const player of gameState.players) {
        player.atNet = false;
        player.pos = { ...player.basePos };
        player.vel = { x: 0, y: 0 };
      }
      gameState.gameState = GameState.PRE_SERVE;
      gameState.stateTimer = 0;
    }

    while (gameState.gameState !== GameState.GAME_OVER && points < MAX_POINTS_PER_MATCH) {
      let ticksThisPoint = 0;
      while (
        gameState.gameState !== GameState.POINT_END &&
        gameState.gameState !== GameState.GAME_OVER &&
        ticksThisPoint < MAX_TICKS_PER_POINT
      ) {
        if (gameState.gameState === GameState.MEDICAL_TIMEOUT && gameState.mto && !gameState.mto.decided) {
          gameState.stateTimer = (gameState.mto.durationSecs ?? 0) + 1;
        }
        gameTick(gameState, DT_HEADLESS);
        ticksThisPoint++;
        ticks++;
      }
      if (ticksThisPoint >= MAX_TICKS_PER_POINT) {
        edgeCaseTracker.add('POINT_TICK_CAP', { mode: 'resume-headless', pointIndex: points, ticksThisPoint });
      }
      for (const callback of pending.splice(0)) callback();
      if (gameState.vfxQueue?.length) gameState.vfxQueue.length = 0;
      if (gameState.pendingHitLabels?.length) gameState.pendingHitLabels.length = 0;
      if (gameState.pendingOutcomeLabels?.length) gameState.pendingOutcomeLabels.length = 0;
      points++;
    }
    return gameState;
  });

  if (points >= MAX_POINTS_PER_MATCH) edgeCaseTracker.add('MATCH_POINT_CAP', { mode: 'resume-headless', points });
  const edgeCases = edgeCaseTracker.flags;
  for (const player of gs.players) {
    if (player._attrsBeforeInjury) {
      player.attrs = { ...player._attrsBeforeInjury };
      player._attrsBeforeInjury = null;
    }
  }
  return buildResumeResult(gs, matchMeta, ticks, points, edgeCases);
}
