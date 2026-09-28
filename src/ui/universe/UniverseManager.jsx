/**
 * UniverseManager.jsx
 * -----------------------------------------------------------------
 * Modo Universo — Calendário Anual Completo
 *
 * — 128 jogadores no tour: 16 originais + 112 newgens (20-36 anos)
 * — 32 prospects: gerados entre 15-22 anos
 * — 43 torneios por temporada (4 GS + 9 M1000 + 9 ATP500 + 13 ATP250 + 6 Juniors + 2 Finals)
 * — Sistema de ranking estilo ATP com defesa de pontos
 * — Qualifying simulado antes de cada chave principal
 * — Brackets com seeding, BYE e wildcards
 * — Grand Slams: 5 sets | Demais: 3 sets
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { NAMED_PLAYERS, overallRating, getPlayerPhoto } from '../../domain/players/players.js';
import { generateNewgenBatch, generateNewgen } from '../../systems/newgen/NewgenSystem.js';
import { advanceSeason, currentAge, applyCareerAlcunhas } from '../../systems/progression/DevelopmentSystem.js';
import { simulateMatchHeadless, simulateMatchSlim, simulateMatchMid } from '../../core/Headless.jsx';
import { simulateAndCollectStoryHighlights } from '../../core/HighlightStoryEngine.js';
import { buildDynamicHighlightStory } from '../../core/HighlightNarrativeDirector.js';
import { simulateRemainingMatchHeadless } from '../../core/ResumeHeadless.js';
import { simulateMatchFast, courtKeyToSurface } from '../../core/FastSimulation.js';
import {
  CALENDAR,
  roundIndexToLabel, computeTournamentPoints,
  selectTournamentPlayers, runQualifying, generateBracket, advanceRound,
  createSeasonSlots, updateSeasonSlots, buildATPFirstRound, prepareTournamentPackageSync,
  selectParallelPairPlayers,
} from '../../systems/tournaments/TournamentSystem.js';
import {
  generateTournamentPreferences,
  migrateTournamentPreferences,
  getTournamentBonus,
} from '../../systems/tournaments/TournamentPreferences.js';
import {
  createRankingStore, registerResult, computeRanking, computeProspectRanking,
  resetProspectRanking, applyPointsDefense,
  TOURNAMENT_POINTS,
} from '../../systems/ranking/RankingSystem.js';
import TournamentBracket from '../tournaments/TournamentBracket.jsx';
import { PLAY_STYLES, SIGNATURE_SHOTS, RALLY_PATTERNS } from '../../domain/players/styles.js';
import { gameTick, initGameState, onBounce } from '../../game.jsx';
import { GameState, TRAIL_LEN, TIMING, MATCH_RULES, isTiebreakSetScore } from '../../core/constants.js';
import { mag3 } from '../../core/math.js';
import { processSeasonRetirements, computeRetirementChance, retirementRiskLabel, refreshMonthlyRetirementOutlook } from '../../systems/career/RetirementSystem.js';
import { initPlayerFinance, awardPrizeMoney, processMonthlyFinances, processYearEndFinances } from '../../systems/finance/FinanceSystem.js';
import { createEmptyPoolState, assignNewgenPhoto, releaseRetiredPhotos } from '../../systems/newgen/NewgenImagePool.js';
import { generateKits, getAppearance } from '../pixel/appearances.js';
import { ovrTier, potentialNarrative, scoutSummary, topStrengths, topWeaknesses } from '../../systems/scouting/ScoutProfile.js';
import { updatePerceptions } from '../../systems/circuit/CircuitPerceptions.js';
import { getPlayerTraits, progressTraitsForSeason } from '../../systems/traits/TraitSystem.js';
import { ATTR_CATEGORIES } from '../../domain/players/attributes.js';
import {
  rollPreTournamentInjury, shouldWithdraw, tickInjury,
  applyInjuryToPlayer, decayPhysicalCondition, recoverPhysicalCondition,
  ensurePhysicalCondition, buildInjuryEvent, injuryStatusLabel,
  applyPreTournamentInjuries,
} from '../../systems/health/InjurySystem.js';
import DefinitiveME from '../game/NEWME1.0.jsx';
import MatchOverScreen from '../game/MatchOverScreen.jsx';
import TracePanel from '../game/TracePanel.jsx';
import DebugLog from '../game/DebugLog.jsx';
import LiveHighlightsControlRoom from '../game/LiveHighlightsControlRoom.jsx';
import {
  applyFormModifier, applyCompetitiveAttributeImpact, calcTournamentFormDeltas,
  applySeasonReset, applyMonthlyFormRegression, capTournamentFormDelta,
  clampFormPoints, FORM_POINTS_TABLE, updateRecentForm,
} from '../../systems/progression/formas.jsx';
import { RivalrySystem } from '../../systems/circuit/RivalrySystem.js';
import ChronicleEngine from '../../systems/press/ChronicleEngine.js';
import { NewsEngine, generateTournamentNews, generateUpcomingTournamentNews, generateYearEndNews, genTournamentWrap, generateSponsorNewsFromChronicleEvents, careerMomentNarrativeLine, genLifeEventArticle, generateSeasonPulseNews } from '../../systems/press/NewsEngine.js';
import { generateYouthCircuitCoverage, generateYouthCircuitPreview } from '../../systems/press/YouthCircuitPressSystem.js';
import { generateBreakingNewsArticles, generateBreakingTournamentFollowups } from '../../systems/press/NewsEngine.js';
import {
  generateMonthlyInterviewFeature,
  generateGrandSlamChampionInterviewFeature,
  summarizeInterviewForPlayer,
} from '../../systems/press/InterviewEngine.js';
import { applyNarrativeConsequences } from '../../systems/narrative/NarrativeConsequenceEngine.js';
import { buildCircuitShift } from '../../systems/narrative/CircuitShiftEngine.js';
import { updateCareerMemoriesForTournament } from '../../systems/narrative/CareerMemorySystem.js';
import { buildSeasonAct } from '../../systems/narrative/SeasonActEngine.js';
import { buildNarrativeRaces } from '../../systems/narrative/NarrativeRaceEngine.js';
import { buildTournamentChapter } from '../../systems/narrative/TournamentChapterEngine.js';
import { O_OUTRO_MUNDO, markAsJunior, markAsProfessional, orderJuniorCandidates } from '../../systems/progression/OOutroMundo.js';
import { computeHOFData, buildPlayerTimeline, GRAND_SLAM_INFO, GRAND_SLAM_IDS } from '../../systems/history/HallOfFame.js';
import {
  createHistoryBook,
  migrateHistoryBook,
  serializeHistoryBook,
  buildAnnualHistorySnapshot,
  recordAnnualHistorySnapshot,
  analyzeHistoryTrends,
  recordHistoryTrendAnalysis,
  processEraSignals,
  writeHistoryNarrative,
  calibrateHistoryBook,
} from '../../systems/history/WorldHistoryBook.js';
import { narrateMatchLight } from '../../systems/press/MatchNarrator.js';
import { processPersonalityEvolution, migratePlayerPersonality } from '../../domain/players/PlayerPersonality.js';
import { ensureCareerTrajectory } from '../../systems/career/CareerTrajectorySystem.js';
import { ensureYouthProfile } from '../../systems/youth/YouthFoundationSystem.js';
import { ensureSurfaceProfile, recordSurfaceMatch } from '../../systems/surfaces/SurfaceIdentitySystem.js';
import { createYouthCohortUniverse, ensureYouthCohortUniverse, advanceYouthCohortUniverse, getCohortMaterializationBlueprint } from '../../systems/youth/YouthCohortUniverseSystem.js';
import { applyYouthAgeCaps } from '../../systems/youth/YouthDevelopmentGuardrails.js';
import { ensureJuniorCircuitProfile, recordJuniorCircuitTournament, summarizeYouthCircuitSeason } from '../../systems/youth/YouthCircuitSystem.js';
import { resolveJuniorSurvival, summarizeYouthSurvivalSeason } from '../../systems/youth/YouthSurvivalSystem.js';
import { isReadyForProfessionalTransition, materializeAlternativePathway, materializeJuniorFromCohort, promoteYouthToProfessional } from '../../systems/youth/YouthTransitionSystem.js';
import { ensureYouthShadowHistory } from '../../systems/youth/YouthShadowHistorySystem.js';
import { createCompetitiveDensityState, ensureCompetitiveDensityState, planCompetitiveDensity, consumeCompetitiveDirective } from '../../systems/youth/CompetitiveDensityDirector.js';
import { buildIdentityDuel, buildPlayerIdentity } from '../../domain/players/PlayerIdentity.js';
import { offlineIdentity as updatePlayerPhaseTwo, offlineIdentity as pushMatchRating } from '../../systems/shotlab/ShotEngineOffline.js';
import { getPlayerBadges, diffBadgeUnlocks, generateBadgeNewsArticles } from '../../systems/achievements/BadgeSystem.js';
import { migratePlayerLifeData } from '../../domain/players/PlayerLifeData.js';
import { rollLifeEvents, runLifePulseEvents, migrateLifeEventLog } from '../../systems/life/LifeEventSystem.js';
import { ensureLifeSimulation, getLifeMatchModifiers, processMonthlyLifeSimulation } from '../../systems/life/LifeSimulationSystem.js';
import { processMonthlyPropertyPortfolio } from '../../systems/life/LifePropertySystem.js';
import { ensurePlayerHype, processMonthlyHype } from '../../systems/narrative/HypeSystem.js';
import {
  migrateBreakingNewsState,
  maybeTriggerBreakingNews,
  tickBreakingNews,
  processBreakingNewsSeasonClose,
  isPlayerUnavailableForTournament,
} from '../../systems/press/BreakingNewsSystem.js';
import { initSponsorPool } from '../../systems/sponsors/SponsorPool.js';
import { ensureSponsorPoolFoundation } from '../../systems/sponsors/SponsorCompanySystem.js';
import {
  runSponsorshipWindow,
  runSponsorshipPulse,
  monitorContracts,
  handleRetirementSponsors,
  handleScandal,
  computeSponsorRecords,
} from '../../systems/sponsors/SponsorContractSystem.js';
import {
  createSeasonPulseState,
  runSeasonPulse,
  SEASON_PULSE_PHASES,
} from '../../systems/season/SeasonPulseSystem.js';
import { createWorldDate, ensurePlayerBirthDate, normalizeUniverseDate } from '../../systems/season/UniverseTimeSystem.js';
import { createInitialCoachMarket } from '../../systems/coaching/CoachIdentitySystem.js';
import { initializePlayersCoaching, migrateCoachMarket, runCoachMarketYear, runCoachRelationshipPulse } from '../../systems/coaching/CoachMarketSystem.js';
import { coachEventToNews } from '../../systems/coaching/CoachNarrativeSystem.js';
import {
  SAVE_SCHEMA_VERSION,
  compactRankingStoreForSave,
} from '../../systems/save/SaveGameSystem.js';
import { createSaveArtifactOffThread, decodeSaveFileOffThread } from '../../systems/save/SaveGameWorkerClient.js';
import { loadLatestAutosave, storeRotatingAutosave } from '../../systems/save/SaveBackupStore.js';
import { computeRating } from '../game/IndividualRating.jsx';
import { BROADCAST_THEME as U, SURFACE_THEME } from '../theme/uiTheme.js';
import {
  RADAR_MAX_FOLLOWED,
  createRadarState,
  normalizeFollowedPlayerIds,
  isRadarMatch,
  buildRadarMatchRecord,
  buildRadarDigest,
  buildRadarAlerts,
  buildRadarSeasonRecap,
  buildRadarRankingTimeline,
} from '../../systems/radar/RadarSystem.js';
const UNIVERSE_TOUR_TARGET = 250;

function radarFollowSignature(followedPlayerIds = []) {
  return [...new Set((followedPlayerIds ?? []).filter(Boolean))].sort().join('|');
}

function appendPreparedRadarMatch(radarMatches, playerA, playerB, result, tournament, roundLabel, year) {
  if (result?.simulationSource !== 'FOLLOWED_HEADLESS') return;
  const winner = result.winner?.id === playerA?.id ? playerA : playerB;
  radarMatches.push(buildRadarMatchRecord({ playerA, playerB, winner, result, tournament, roundLabel, year }));
}

// Invariante do Radar: partidas com um acompanhado nunca podem cair no
// FastSimulation. O resto do circuito continua usando o modo escolhido.
function simulateRadarAwareFastMatch(playerA, playerB, surface, bestOf, tournament, roundLabel, followedPlayerIds = [], rivalrySystem = null) {
  const simA = applyTournamentContextModifiers(playerA, tournament);
  const simB = applyTournamentContextModifiers(playerB, tournament);
  if (isRadarMatch(playerA, playerB, followedPlayerIds)) {
    const result = simulateMatchHeadless(
      { playerData: simA }, { playerData: simB },
      tournament?.courtKey ?? tournament?.surface ?? surface,
      bestOf,
      rivalrySystem,
      tournament?.isSlam ?? false,
      { category: tournament?.category, round: roundLabel, format: tournament?.format ?? null, radarFollowed: true },
    );
    result.simulationSource = 'FOLLOWED_HEADLESS';
    return result;
  }
  const result = simulateMatchFast(simA, simB, surface, bestOf, {
    format: tournament?.format ?? null,
    tournamentTier: tournament?.category ?? null,
    roundLabel,
  });
  result.simulationSource = 'FAST';
  return result;
}

function getSetsDetailFromPlayers(players = []) {
  const [playerA, playerB] = players;
  const aHistory = playerA?.setsHistory ?? [];
  const bHistory = playerB?.setsHistory ?? [];
  const count = Math.max(aHistory.length, bHistory.length);
  return Array.from({ length: count }, (_, index) => [
    aHistory[index] ?? 0,
    bHistory[index] ?? 0,
  ]);
}

function stripLegacyCoachData(player) {
  if (!player) return player;
  const {
    coach,
    coachHistory,
    _coachInstructions,
    _adaptacaoBoost,
    ...rest
  } = player;
  return rest;
}

function stripOldCoachButKeepBancoVivo(player) {
  return stripLegacyCoachData(player);
}
const DEV_TITLE_BY_CATEGORY = {
  GRAND_SLAM: 'SLAM',
  SLAM_CLASH: 'SLAM_CLASH',
  MASTERS_1000: 'MASTERS',
  ATP_500: 'ATP500',
  ATP_250: 'ATP250',
  ATP_100: 'ATP100',
  ATP_75: 'ATP75',
  ATP_50: 'ATP50',
  ATP_25: 'ATP25',
  FINALS: 'ATP500',
};

function ensureDevelopmentLedger(player, year = 2025) {
  if (!player?.attrs) return player;
  const currentOverall = overallRating(player.attrs);
  const existing = player.developmentLedger ?? {};
  const debutOverall = existing.debutOverall ?? player._proDebutOverall ?? player._ovrSeed ?? currentOverall;
  const ledgerYear = existing.currentYear ?? year;
  const seasonStartOverall = ledgerYear === year
    ? (existing.seasonStartOverall ?? currentOverall)
    : currentOverall;
  const seasonStartAttrs = ledgerYear === year
    ? (existing.seasonStartAttrs ?? { ...(player.attrs ?? {}) })
    : { ...(player.attrs ?? {}) };
  return {
    ...player,
    _proDebutOverall: debutOverall,
    developmentLedger: {
      _version: 1,
      debutYear: existing.debutYear ?? player.proDebutYear ?? year,
      ...existing,
      debutOverall,
      currentYear: year,
      seasonStartOverall,
      seasonStartAttrs,
      currentAttrs: { ...(player.attrs ?? {}) },
      seasonAttrDelta: Object.fromEntries(Object.keys(player.attrs ?? {}).map(key => [
        key,
        (player.attrs?.[key] ?? 0) - (seasonStartAttrs?.[key] ?? player.attrs?.[key] ?? 0),
      ]).filter(([, delta]) => delta !== 0)),
      seasonDelta: +(currentOverall - seasonStartOverall).toFixed(2),
      careerDelta: +(currentOverall - debutOverall).toFixed(2),
      currentOverall,
      history: Array.isArray(existing.history) ? existing.history.slice(-36) : [],
    },
  };
}

function applyRTDDevelopmentLedger(beforePlayers = [], afterPlayers = [], year = 2025, monthIndex = null) {
  const beforeMap = Object.fromEntries((beforePlayers ?? []).map(p => [p.id, ensureDevelopmentLedger(p, year)]));
  return (afterPlayers ?? []).map(raw => {
    if (!raw?.attrs) return raw;
    const before = beforeMap[raw.id] ?? ensureDevelopmentLedger(raw, year);
    const beforeLedger = before.developmentLedger ?? {};
    const beforeOverall = overallRating(before.attrs);
    const afterOverall = overallRating(raw.attrs);
    const ledgerYear = beforeLedger.currentYear ?? year;
    const seasonStartOverall = ledgerYear === year
      ? (beforeLedger.seasonStartOverall ?? beforeOverall)
      : beforeOverall;
    const seasonStartAttrs = ledgerYear === year
      ? (beforeLedger.seasonStartAttrs ?? { ...(before.attrs ?? {}) })
      : { ...(before.attrs ?? {}) };
    const debutOverall = beforeLedger.debutOverall ?? before._proDebutOverall ?? before._ovrSeed ?? beforeOverall;
    const monthlyDelta = +(afterOverall - beforeOverall).toFixed(2);
    const attrMonthlyDelta = Object.fromEntries(Object.keys(raw.attrs ?? {}).map(key => [
      key,
      (raw.attrs?.[key] ?? 0) - (before.attrs?.[key] ?? raw.attrs?.[key] ?? 0),
    ]).filter(([, delta]) => delta !== 0));
    const seasonAttrDelta = Object.fromEntries(Object.keys(raw.attrs ?? {}).map(key => [
      key,
      (raw.attrs?.[key] ?? 0) - (seasonStartAttrs?.[key] ?? raw.attrs?.[key] ?? 0),
    ]).filter(([, delta]) => delta !== 0));
    const history = [
      ...(beforeLedger.history ?? []),
      {
        year,
        monthIndex,
        beforeOverall,
        afterOverall,
        delta: monthlyDelta,
        attrDelta: attrMonthlyDelta,
      },
    ].slice(-36);
    return {
      ...raw,
      _proDebutOverall: debutOverall,
      developmentLedger: {
        ...beforeLedger,
        _version: 1,
        debutOverall,
        currentYear: year,
        seasonStartOverall,
        seasonStartAttrs,
        currentAttrs: { ...(raw.attrs ?? {}) },
        lastAttrDelta: attrMonthlyDelta,
        seasonAttrDelta,
        currentOverall: afterOverall,
        lastMonthDelta: monthlyDelta,
        seasonDelta: +(afterOverall - seasonStartOverall).toFixed(2),
        careerDelta: +(afterOverall - debutOverall).toFixed(2),
        history,
      },
    };
  });
}

function sanitizeBracketSaveState(savedState, tournamentId = null) {
  if (!savedState || typeof savedState !== 'object') return null;
  const bracket = savedState.bracket ?? null;
  const phase = savedState.phase ?? null;
  const qBracket = savedState.qBracket ?? null;
  const done = !!savedState.done;
  const qDone = !!savedState.qDone;
  const qualifiers = Array.isArray(savedState.qualifiers) ? savedState.qualifiers.filter(Boolean) : [];

  const hasBracketRounds = Array.isArray(bracket?.rounds) && bracket.rounds.length > 0;
  const hasQRounds = Array.isArray(qBracket?.rounds) && qBracket.rounds.length > 0;
  const claimedTournamentId = savedState.tournamentId ?? null;

  if (tournamentId && claimedTournamentId && claimedTournamentId !== tournamentId) return null;
  if (phase === 'MAIN_DRAW' && !hasBracketRounds) return null;
  if (phase === 'QUALIFYING' && !hasQRounds) return null;
  if (!phase && !hasBracketRounds && !hasQRounds) return null;

  return {
    phase: phase ?? (hasBracketRounds ? 'MAIN_DRAW' : 'QUALIFYING'),
    qBracket: hasQRounds ? qBracket : null,
    qDone: hasQRounds ? qDone : !!hasBracketRounds,
    bracket: hasBracketRounds ? bracket : null,
    qualifiers,
    done,
    tournamentId: claimedTournamentId ?? tournamentId ?? null,
  };
}

function isBaseCircuitTournament(tournament) {
  if (!tournament) return false;
  return !!(
    tournament.isBaseCircuit ||
    tournament.isATP100 ||
    tournament.isATP75 ||
    tournament.isATP50 ||
    tournament.isATP25 ||
    tournament.category === 'ATP_100' ||
    tournament.category === 'ATP_75' ||
    tournament.category === 'ATP_50' ||
    tournament.category === 'ATP_25'
  );
}

function isOlympicSeasonYear(year) {
  const y = Number(year);
  return Number.isFinite(y) && y >= 2028 && (y - 2028) % 4 === 0;
}

function isJuniorTournament(tournament) {
  if (!tournament) return false;
  return !!(
    tournament.isJuniors ||
    tournament.isProspects ||
    tournament.isProspectsFinals ||
    tournament.category === 'JUNIOR_50' ||
    tournament.category === 'JUNIOR_100' ||
    tournament.category === 'JUNIOR_SLAM' ||
    tournament.category === 'ATP_PROSPECTS' ||
    tournament.category === 'PROSPECTS_FINALS'
  );
}

function shouldUseFastInvisibleTournament(tournament) {
  if (!tournament) return false;
  return (
    isJuniorTournament(tournament) ||
    isBaseCircuitTournament(tournament)
  );
}

function createJuniorNewgens(seasonYear, count, poolOpts, cohortUniverse = null) {
  if (count <= 0) return [];
  let densityState = poolOpts._competitiveDensityState ?? createCompetitiveDensityState(seasonYear);
  const generated = [];
  for (let index = 0; index < count; index += 1) {
    const directive = densityState.pendingDirectives?.[0] ?? null;
    const blueprint = getCohortMaterializationBlueprint(cohortUniverse, seasonYear, index, directive);
    const generationOptions = {
      ageRange: blueprint.ageRange ?? [O_OUTRO_MUNDO.JUNIOR_AGE_MIN, O_OUTRO_MUNDO.JUNIOR_AGE_MAX],
      nationality: blueprint.nationality,
      forcePotential: blueprint.potential,
      forceDevelopmentStyle: blueprint.developmentStyle,
      ...poolOpts,
    };
    const player = generateNewgen(seasonYear, generationOptions);
    poolOpts._poolState = generationOptions._poolState;
    let nextPlayer = markAsJunior({
      ...player,
      formPoints: 0,
      formHistory: [],
      _ovrSeed: overallRating(player.attrs),
    }, seasonYear);
    nextPlayer = migrateTournamentPreferences(nextPlayer);
    nextPlayer = migrateLifeEventLog(nextPlayer);
    nextPlayer = migratePlayerLifeData(nextPlayer);
    nextPlayer = initPlayerFinance(nextPlayer);
    nextPlayer = materializeJuniorFromCohort(ensureYouthProfile(nextPlayer, seasonYear, 'JUNIOR_NEWGEN'), seasonYear, { blueprint });
    if (directive) {
      const consumed = consumeCompetitiveDirective(densityState, nextPlayer, seasonYear);
      densityState = consumed.state;
      nextPlayer = consumed.player;
    }
    generated.push(nextPlayer);
  }
  poolOpts._competitiveDensityState = densityState;
  return generated;
}

function normalizeJuniorField(players = [], seasonYear) {
  return orderJuniorCandidates(players).map((player, index) => ensureJuniorCircuitProfile(applyYouthAgeCaps(ensureYouthProfile(ensurePlayerBirthDate(markAsJunior({
    ...player,
    age: Math.min(player.age ?? O_OUTRO_MUNDO.JUNIOR_AGE_MAX, O_OUTRO_MUNDO.JUNIOR_AGE_OUT),
    birthYear: player.birthYear ?? (seasonYear - (player.age ?? O_OUTRO_MUNDO.JUNIOR_AGE_MAX)),
    rankPosition: index + 1,
    _ovrSeed: player._ovrSeed ?? overallRating(player.attrs),
    formPoints: player.formPoints ?? 0,
    formHistory: player.formHistory ?? [],
  }, seasonYear), { year: seasonYear, month: 1 }, seasonYear), seasonYear, 'JUNIOR_NORMALIZATION'), { age: player.age }), seasonYear));
}

function buildJuniorSeasonTransition({
  prospects = [],
  vacancies,
  seasonYear,
  poolOpts,
  cohortUniverse = null,
  competitiveDensity = null,
  densityRoster = [],
}) {
  // A idade já foi atualizada no mês de aniversário; a virada não pode
  // adicionar mais um ano artificial aos juniors.
  const aged = normalizeJuniorField(prospects, seasonYear);

  const survival = resolveJuniorSurvival(aged, seasonYear);
  const surviving = survival.active;
  const forcedPromotionIds = new Set(
    surviving
      .filter(player => (player.age ?? 0) >= O_OUTRO_MUNDO.JUNIOR_FORCED_PROMOTION_AGE)
      .map(player => player.id)
  );
  const promotionPool = orderJuniorCandidates(surviving).filter(player =>
    forcedPromotionIds.has(player.id) || isReadyForProfessionalTransition(player)
  ).slice(0, O_OUTRO_MUNDO.JUNIOR_PROMOTION_RANK);
  const promotedCount = Math.min(Math.max(0, vacancies), promotionPool.length);
  const promotedIds = new Set(promotionPool.slice(0, promotedCount).map(player => player.id));

  const promoted = surviving
    .filter(player => promotedIds.has(player.id))
    .map(player => {
      const age = Math.max(
        player.age ?? 17,
        17,
      );
      let nextPlayer = markAsProfessional(promoteYouthToProfessional({
        ...player,
        age,
        birthYear: player.birthYear ?? (seasonYear - age),
        rankPosition: null,
      }, seasonYear, { cohortUniverse }));
      nextPlayer = migrateTournamentPreferences(nextPlayer);
      nextPlayer = migrateLifeEventLog(nextPlayer);
      nextPlayer = migratePlayerLifeData(nextPlayer);
      return initPlayerFinance(nextPlayer);
    });

  const retained = surviving.filter(player =>
    !promotedIds.has(player.id) && (player.age ?? 0) <= O_OUTRO_MUNDO.JUNIOR_MAX_AGE
  );
  const agedOut = surviving
    .filter(player => !promotedIds.has(player.id) && (player.age ?? 0) > O_OUTRO_MUNDO.JUNIOR_MAX_AGE)
    .map(player => ({
      ...player,
      retirementInfo: {
        type: 'PROSPECT_AGED_OUT',
        age: player.age,
        year: seasonYear,
        message: `${player.name} encerra o ciclo junior sem conseguir a promocao ao profissional`,
      },
    }));

  const replenishment = Math.max(0, O_OUTRO_MUNDO.JUNIOR_TARGET - retained.length);
  poolOpts._competitiveDensityState = planCompetitiveDensity([...densityRoster, ...surviving], seasonYear, competitiveDensity);
  const newJuniors = createJuniorNewgens(seasonYear, replenishment, poolOpts, cohortUniverse);
  const finalJuniors = normalizeJuniorField([...retained, ...newJuniors], seasonYear);

  return { promoted, agedOut, droppedOut: survival.droppedOut, finalJuniors, competitiveDensity: poolOpts._competitiveDensityState };
}

// -------------------------------------------------------------------
// SLIM MATCH RESULT — remove campos pesados antes de salvar no estado
// -------------------------------------------------------------------
/**
 * Remove campos grandes do HeadlessResult que NÃO s—o necess—rios após
 * a partida ser armazenada no bracket. Esses campos (gs, log, ticks, points
 * e rallyLengths/serveLog dentro de stats) podem somar 50—150 KB por partida.
 * Num torneio com 63 partidas — 48 torneios na temporada = ~3 000—9 000 partidas
 * acumuladas no React state sem nunca serem lidas de volta.
 *
 * Campos MANTIDOS (todos lidos após o torneio):
 *   sets, setsDetail          ? UI do bracket, rivalidade, records
 *   stats.a / stats.b         ? IndividualRating (sem rallyLengths/serveLog)
 *   retirement                ? eventos de lesão
 *   inMatchInjuryEvents       ? eventos de lesão
 *   heat                      ? exibi——o de heat no bracket
 *   traitMetrics              ? métricas de traits sombra
 *   winner / loser            ? identidade (j— nos jogadores, mas por segurança)
 *
 * Campos REMOVIDOS (nunca lidos após armazenamento):
 *   gs                        ? GameState completo (~30—80 KB de física/log)
 *   log                       ? ~300 strings de debug
 *   ticks / points            ? contadores de profiling
 *   stats.*.rallyLengths      ? array de todos os rallies (~300 números)
 *   stats.*.serveLog          ? array de todos os saques
 */
function compactStoryCapsuleForBracket(capsule) {
  if (!capsule || typeof capsule !== 'object') return null;
  return {
    type: capsule.type ?? null,
    title: capsule.title ?? null,
    oneLine: capsule.oneLine ?? null,
    mode: capsule.mode ?? null,
    weight: capsule.weight ?? null,
    tags: Array.isArray(capsule.tags) ? capsule.tags.slice(0, 6) : [],
  };
}

function compactNarrativeDossierForBracket(dossier) {
  if (!dossier || typeof dossier !== 'object') return null;
  return {
    headline: dossier.headline ?? null,
    thesis: dossier.thesis ?? null,
    mode: dossier.mode ?? null,
    heatScore: dossier.heatScore ?? 0,
    tags: Array.isArray(dossier.tags) ? dossier.tags.slice(0, 8) : [],
    topMoments: Array.isArray(dossier.topMoments)
      ? dossier.topMoments.slice(0, 5).map(compactStoryCapsuleForBracket).filter(Boolean)
      : [],
  };
}

function tournamentDebugLog(step, data = {}) {
  const safeData = data && typeof data === 'object' ? data : { value: data };
  console.info(`[TournamentFlow] ${step}`, {
    at: new Date().toISOString(),
    ...safeData,
  });
}

function slimMatchResult(res) {
  if (!res) return res;
  function slimStats(s) {
    if (!s) return s;
    const {
      rallyLengths: _rl,
      serveLog: _sl,
      returnLog: _retLog,
      receptionLog: _recLog,
      contactLog: _contactLog,
      shotLog: _shotLog,
      intentLog: _intentLog,
      ...rest
    } = s;
    return rest;
  }
  const {
    gs: _gs,
    log: _log,
    ticks: _ticks,
    points: _pts,
    winner: _winner,
    loser: _loser,
    matchNarrativeDossier,
    matchStoryCapsules,
    storyTags,
    ...slim
  } = res;
  if (slim.stats) {
    slim.stats = {
      a: slimStats(slim.stats.a),
      b: slimStats(slim.stats.b),
    };
  }
  if (matchNarrativeDossier) {
    slim.matchNarrativeDossier = compactNarrativeDossierForBracket(matchNarrativeDossier);
  }
  if (Array.isArray(matchStoryCapsules)) {
    slim.matchStoryCapsules = matchStoryCapsules
      .slice(0, 6)
      .map(compactStoryCapsuleForBracket)
      .filter(Boolean);
  }
  if (Array.isArray(storyTags)) {
    slim.storyTags = storyTags.slice(0, 10);
  }
  return slim;
}

function compactBracketPlayerForRuntime(player) {
  if (!player || typeof player !== 'object') return player ?? null;
  return {
    id: player.id,
    name: player.name,
    nationality: player.nationality,
    rankPosition: player.rankPosition,
    seed: player.seed,
    styleId: player.styleId,
    color: player.color,
    photo: player.photo ?? null,
    namedPlayerKey: player.namedPlayerKey ?? null,
    isJunior: player.isJunior ?? false,
  };
}

function compactBracketMatchForRuntime(match) {
  if (!match || typeof match !== 'object') return match;
  const playerA = compactBracketPlayerForRuntime(match.playerA ?? match.player1);
  const playerB = compactBracketPlayerForRuntime(match.playerB ?? match.player2);
  const winner = compactBracketPlayerForRuntime(match.winner);
  const loser = compactBracketPlayerForRuntime(match.loser);
  return {
    ...match,
    playerA,
    playerB,
    player1: playerA,
    player2: playerB,
    winner,
    loser,
    result: slimMatchResult(match.result),
  };
}

function compactBracketForRuntime(bracket) {
  if (!bracket || typeof bracket !== 'object') return bracket;
  return {
    ...bracket,
    players: Array.isArray(bracket.players)
      ? bracket.players.map(compactBracketPlayerForRuntime)
      : bracket.players,
    seeds: Array.isArray(bracket.seeds)
      ? bracket.seeds.map(compactBracketPlayerForRuntime)
      : bracket.seeds,
    champion: compactBracketPlayerForRuntime(bracket.champion),
    finalist: compactBracketPlayerForRuntime(bracket.finalist),
    rounds: Array.isArray(bracket.rounds)
      ? bracket.rounds.map(round => Array.isArray(round) ? round.map(compactBracketMatchForRuntime) : round)
      : bracket.rounds,
    qualifyingRounds: Array.isArray(bracket.qualifyingRounds)
      ? bracket.qualifyingRounds.map(round => Array.isArray(round) ? round.map(compactBracketMatchForRuntime) : round)
      : bracket.qualifyingRounds,
    qualRoundsData: Array.isArray(bracket.qualRoundsData)
      ? bracket.qualRoundsData.map(round => Array.isArray(round) ? round.map(compactBracketMatchForRuntime) : round)
      : bracket.qualRoundsData,
  };
}

function compactTournamentResultForRuntime(result) {
  if (!result || typeof result !== 'object') return result;
  return {
    ...result,
    bracket: compactBracketForRuntime(result.bracket),
    qualifiers: Array.isArray(result.qualifiers)
      ? result.qualifiers.map(compactBracketPlayerForRuntime)
      : result.qualifiers,
    preQualWinners: Array.isArray(result.preQualWinners)
      ? result.preQualWinners.map(compactBracketPlayerForRuntime)
      : result.preQualWinners,
  };
}

// -------------------------------------------------------------------
// DESIGN TOKENS
// -------------------------------------------------------------------

const SURFACE_COLOR = {
  CLAY:   { ...SURFACE_THEME.CLAY, icon: '🧱' },
  GRASS:  { ...SURFACE_THEME.GRASS, icon: '🌿' },
  HARD:   { ...SURFACE_THEME.HARD, icon: '🔵' },
  STREET: { ...SURFACE_THEME.STREET, icon: '🛣️' },
  CARPET: { ...SURFACE_THEME.CARPET, icon: '🎭' },
  INDOOR: { ...SURFACE_THEME.INDOOR, icon: '🏟️' },
};

const CAT_COLOR = {
  GRAND_SLAM:    { main: '#FFD700', label: 'Grand Slam',    icon: '🏆' },
  SLAM_CLASH:    { main: '#FF8A3D', label: 'Clash Slam',    icon: '🎾' },
  MASTERS_1000:  { main: '#E040FB', label: 'Masters 1000',  icon: '🎾' },
  ATP_500:       { main: '#00BCD4', label: 'ATP 500',       icon: '🎾' },
  ATP_250:       { main: '#66BB6A', label: 'ATP 250',       icon: '🎾' },
  ATP_100:       { main: '#8D6E63', label: 'ATP 100',       icon: '🎾' },
  ATP_75:        { main: '#A1887F', label: 'ATP 75',        icon: '🎾' },
  ATP_50:        { main: '#BCAAA4', label: 'ATP 50',        icon: '🎾' },
  ATP_25:        { main: '#D7CCC8', label: 'ATP 25',        icon: '🎾' },
  ATP_PROSPECTS: { main: '#FF7043', label: 'Juniors',     icon: '🎾' },
  JUNIOR_50:      { main: '#B7B3B0', label: 'Junior 50',   icon: '🎾' },
  JUNIOR_100:     { main: '#FFB067', label: 'Junior 100',  icon: '🎾' },
  JUNIOR_SLAM:    { main: '#FFD166', label: 'Junior Slam', icon: '🎾' },
  FINALS:        { main: '#F44336', label: 'Finals',        icon: '🎾' },
  PROSPECTS_FINALS: { main: '#FF7043', label: 'Junior Finals', icon: '🎾' },
  OLYMPICS:      { main: '#1976D2', label: 'Jogos Olímpicos', icon: '🎾' },
};

// -------------------------------------------------------------------
// CSS
// -------------------------------------------------------------------

function injectCSS() {
  if (document.getElementById('uv-styles')) return;
  const css = `
.uv-screen{width:100%;min-height:100vh;background:#080F0C;font-family:'Barlow',sans-serif;color:#FFF;overflow-y:auto;display:flex;flex-direction:column}
.uv-topbar{height:48px;background:#0D1A12;border-bottom:2px solid #C4572A;display:flex;align-items:center;padding:0 28px;gap:16px;flex-shrink:0;z-index:30}
.uv-back-btn{background:none;border:1px solid rgba(255,255,255,.10);color:rgba(255,255,255,.55);font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:500;letter-spacing:2px;padding:4px 14px;cursor:pointer;text-transform:uppercase;transition:all .15s}
.uv-back-btn:hover{background:#1C3020;color:#FFF;border-color:rgba(255,255,255,.22)}
.uv-scroll{overflow-y:auto;scrollbar-width:thin;scrollbar-color:#162419 transparent}
.uv-scroll::-webkit-scrollbar{width:3px}
.uv-scroll::-webkit-scrollbar-thumb{background:#162419}
.uv-card{background:#111D16;border:1px solid rgba(255,255,255,.08);transition:all .18s}
.uv-card:hover{background:#162419;border-color:rgba(255,255,255,.16)}
.uv-btn{border:none;cursor:pointer;font-family:'Barlow Condensed',sans-serif;font-weight:600;letter-spacing:2px;text-transform:uppercase;transition:all .15s}
.uv-btn-primary{background:#C4572A;color:#FFF;padding:10px 24px;font-size:12px}
.uv-btn-primary:hover{background:#D97448}
.uv-btn-primary:disabled{background:#1C3020;color:rgba(255,255,255,.25);cursor:not-allowed}
.uv-btn-ghost{background:none;border:1px solid rgba(255,255,255,.14);color:rgba(255,255,255,.6);padding:6px 16px;font-size:10px}
.uv-btn-ghost:hover{background:#162419;color:#FFF;border-color:rgba(255,255,255,.28)}
.uv-bracket-match{background:#0D1A12;border:1px solid rgba(255,255,255,.08);padding:7px 10px;margin-bottom:3px;cursor:pointer;transition:all .13s;position:relative}
.uv-bracket-match:hover{background:#111D16;border-color:rgba(255,255,255,.18)}
.uv-bracket-match.won{border-left:3px solid #FFD700}
.uv-player-row{display:flex;align-items:center;padding:8px 16px;border-bottom:1px solid rgba(255,255,255,.06);cursor:pointer;transition:background .12s}
.uv-player-row:hover{background:#162419}
.uv-tab{background:none;border:none;border-bottom:2px solid transparent;color:rgba(255,255,255,.45);font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:500;letter-spacing:2px;padding:10px 18px;cursor:pointer;text-transform:uppercase;transition:all .15s}
.uv-tab.active{color:#FFF;border-bottom-color:#C4572A}
.uv-tab:hover{color:#FFF}
@keyframes uv-up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.uv-a1{animation:uv-up .35s .04s both}
.uv-a2{animation:uv-up .35s .10s both}
.uv-a3{animation:uv-up .35s .16s both}
@keyframes uv-pulse{0%,100%{opacity:.5}50%{opacity:1}}
.uv-live{animation:uv-pulse 1.4s infinite}
  `;
  const el = document.createElement('style');
  el.id = 'uv-styles';
  el.textContent = css;
  document.head.appendChild(el);
}

// -------------------------------------------------------------------
// PRÉ-JOGO — REDESIGN
// -------------------------------------------------------------------

function injectPreGameCSS() {
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&family=Barlow+Condensed:ital,wght@0,300;0,400;0,600;0,700;0,800;1,400;1,600&display=swap');

    @keyframes pg-up    { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
    @keyframes pg-in    { from{opacity:0} to{opacity:1} }
    @keyframes pg-left  { from{opacity:0;transform:translateX(-36px)} to{opacity:1;transform:translateX(0)} }
    @keyframes pg-right { from{opacity:0;transform:translateX(36px)} to{opacity:1;transform:translateX(0)} }
    @keyframes pg-scan  { 0%{transform:translateY(-100%)} 100%{transform:translateY(200vh)} }
    @keyframes pg-vs    { 0%{opacity:0;transform:scale(.3) rotate(-10deg)} 55%{transform:scale(1.1) rotate(2deg)} 100%{opacity:1;transform:scale(1) rotate(0)} }
    @keyframes pg-glow  { 0%,100%{opacity:.5} 50%{opacity:1} }
    @keyframes pg-shine { 0%{background-position:-300% 0} 100%{background-position:300% 0} }
    @keyframes pg-pulse-r { 0%,100%{box-shadow:0 0 20px var(--rc)33} 50%{box-shadow:0 0 50px var(--rc)77} }
    @keyframes pg-fill  { from{width:0} to{width:var(--tw)} }

    .pg-screen {
      position:fixed; inset:0; z-index:200;
      background:#02040A;
      font-family:'Barlow Condensed',sans-serif;
      overflow-y:auto; overflow-x:hidden;
      scrollbar-width:thin; scrollbar-color:#0d1117 transparent;
    }
    .pg-scan-line {
      position:fixed; top:0; left:0; right:0; height:1px;
      background:linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent);
      animation:pg-scan 9s linear infinite; pointer-events:none; z-index:9999;
    }
    .pg-glass {
      background:rgba(255,255,255,.026);
      border:1px solid rgba(255,255,255,.07);
      backdrop-filter:blur(2px);
    }
    .pg-label {
      font-family:'Space Mono',monospace; font-size:8px;
      letter-spacing:.26em; text-transform:uppercase; color:rgba(255,255,255,.3);
    }
    .pg-skip {
      background:none; border:1px solid rgba(255,255,255,.1);
      color:rgba(255,255,255,.35); font-family:'Space Mono',monospace;
      font-size:9px; letter-spacing:.18em; padding:6px 16px;
      cursor:pointer; text-transform:uppercase; transition:all .2s;
    }
    .pg-skip:hover { border-color:rgba(255,255,255,.3); color:rgba(255,255,255,.7); }
    .pg-cta-main {
      background:linear-gradient(135deg,#B84E24 0%,#D4723E 100%);
      border:none; color:#FFF;
      font-family:'Bebas Neue',sans-serif; font-size:26px; letter-spacing:.32em;
      padding:18px 72px; cursor:pointer; position:relative; overflow:hidden;
      clip-path:polygon(16px 0,100% 0,calc(100% - 16px) 100%,0 100%);
      transition:transform .2s,box-shadow .2s;
      box-shadow:0 8px 48px rgba(180,78,36,.45);
    }
    .pg-cta-main::after {
      content:''; position:absolute; inset:0;
      background:linear-gradient(90deg,transparent,rgba(255,255,255,.16),transparent);
      background-size:300% 100%; animation:pg-shine 2.8s ease-in-out infinite;
    }
    .pg-cta-main:hover { transform:translateY(-3px); box-shadow:0 14px 56px rgba(180,78,36,.6); }
    .pg-cta-sec {
      background:none; cursor:pointer; transition:all .15s;
      font-family:'Space Mono',monospace; font-size:9px;
      letter-spacing:.2em; text-transform:uppercase; padding:10px 28px;
    }
    .pg-bar-track {
      height:5px; border-radius:3px; overflow:hidden;
      background:rgba(255,255,255,.055); display:flex; position:relative;
    }
    .pg-bar-a { border-radius:3px 0 0 3px; transition:width .7s ease; }
    .pg-bar-b { border-radius:0 3px 3px 0; flex:1; }
    .pg-midline {
      position:absolute; left:50%; top:0; bottom:0; width:1px;
      background:rgba(255,255,255,.1); transform:translateX(-50%);
    }
    .pg-dossier { max-width:1220px; margin:0 auto; padding:22px 28px 46px; }
    .pg-dossier-hero { display:grid; grid-template-columns:1fr 280px 1fr; align-items:stretch; gap:12px; }
    .pg-dossier-grid { display:grid; grid-template-columns:minmax(0,1.18fr) minmax(330px,.82fr); gap:12px; margin-top:12px; }
    .pg-player-now { position:relative; overflow:hidden; min-height:180px; padding:22px; display:flex; align-items:center; gap:18px; }
    .pg-player-now.right { flex-direction:row-reverse; text-align:right; }
    .pg-weapon-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
    .pg-radar-wrap { display:grid; grid-template-columns:270px 1fr; gap:18px; align-items:center; }
    .pg-past-strip { display:grid; grid-template-columns:repeat(6,minmax(100px,1fr)); gap:7px; }
    .pg-kpi-row { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; }
    @media (max-width:980px) {
      .pg-dossier-hero { grid-template-columns:1fr 190px 1fr; }
      .pg-dossier-grid, .pg-radar-wrap { grid-template-columns:1fr; }
      .pg-past-strip { grid-template-columns:repeat(3,1fr); }
    }
    @media (max-width:700px) {
      .pg-dossier { padding:14px 12px 36px; }
      .pg-dossier-hero { grid-template-columns:1fr; }
      .pg-player-now.right { flex-direction:row; text-align:left; }
      .pg-weapon-grid { grid-template-columns:1fr; }
      .pg-past-strip { grid-template-columns:repeat(2,1fr); }
    }
  `;
  const existing = document.getElementById('pg-styles');
  if (existing) {
    existing.textContent = css;
    return;
  }
  const el = document.createElement('style');
  el.id = 'pg-styles'; el.textContent = css;
  document.head.appendChild(el);
}

// -- Surface DNA ----------------------------------------------------
const PG_SURF = {
  CLAY:   { key:'CLAY',   label:'Saibro',      color:'#C4572A', glow:'rgba(196,87,42,', bg:'rgba(196,87,42,.12)' },
  GRASS:  { key:'GRASS',  label:'Grama',        color:'#2E7D32', glow:'rgba(46,125,50,',  bg:'rgba(46,125,50,.12)'  },
  HARD:   { key:'HARD',   label:'Quadra Dura', color:'#1565C0', glow:'rgba(21,101,192,', bg:'rgba(21,101,192,.12)'  },
  INDOOR: { key:'INDOOR', label:'Indoor',      color:'#6A1B9A', glow:'rgba(106,27,154,', bg:'rgba(106,27,154,.12)'  },
};

// -- Configs --------------------------------------------------------
const PG_CAT = {
  GRAND_SLAM:    { label:'Grand Slam',    color:'#FFD700', icon:'🏆' },
  SLAM_CLASH:    { label:'Clash Slam',    color:'#FF8A3D', icon:'🎾' },
  MASTERS_1000:  { label:'Masters 1000',  color:'#E040FB', icon:'🎾' },
  ATP_500:       { label:'ATP 500',       color:'#00BCD4', icon:'🎾' },
  ATP_250:       { label:'ATP 250',       color:'#66BB6A', icon:'🎾' },
  ATP_100:       { label:'ATP 100',       color:'#8D6E63', icon:'🎾' },
  ATP_75:        { label:'ATP 75',        color:'#A1887F', icon:'🎾' },
  ATP_50:        { label:'ATP 50',        color:'#BCAAA4', icon:'🎾' },
  ATP_25:        { label:'ATP 25',        color:'#D7CCC8', icon:'🎾' },
  FINALS:        { label:'Finals',        color:'#F44336', icon:'🎾' },
  ATP_PROSPECTS: { label:'Juniors',     color:'#FF7043', icon:'🎾' },
  JUNIOR_50:      { label:'Junior 50',  color:'#B7B3B0', icon:'🎾' },
  JUNIOR_100:     { label:'Junior 100', color:'#FFB067', icon:'🎾' },
  JUNIOR_SLAM:    { label:'Junior Slam',color:'#FFD166', icon:'🎾' },
};

const PG_ROUND = {0:'1ª Ronda',1:'2ª Ronda',2:'3ª Ronda',3:'Oitavas',4:'Quartas',5:'Semifinal',6:'Final'};

const PG_STYLE = {
  AGG_BASELINER: { label:'Agg. Baseliner', icon:'🏆', color:'#FF6B35' },
  CTR_PUNCHER:   { label:'Counter-Puncher',icon:'🎾', color:'#FF4444' },
  ALL_COURT:     { label:'All-Court',      icon:'🎾', color:'#FFD700' },
  SRV_VOL:       { label:'Serve & Volley', icon:'🎾', color:'#00FF88' },
  BIG_SERVER:    { label:'Big Server',     icon:'🎾', color:'#AA44FF' },
  RETRIEVER:     { label:'Retriever',      icon:'🎾', color:'#00AAFF' },
  TAKEALLRISK:   { label:'Take All Risk',  icon:'🎾', color:'#FF69B4' },
  GRINDER:       { label:'Grinder',        icon:'🎾', color:'#FFA726' },
  PWR_BASE:      { label:'Power Baseline', icon:'🎾', color:'#FF5722' },
  TACT_TEC:      { label:'Tactical',       icon:'🎾', color:'#26C6DA' },
  NET_SPEC:      { label:'Net Spec.',      icon:'🎾', color:'#66BB6A' },
  ADPT_TAC:      { label:'Adaptativo',     icon:'🎾', color:'#AB47BC' },
  MOMENTUM_PLAYER:{ label:'Momentum',      icon:'🎾', color:'#EF5350' },
};

const PG_RIVALRY = {
  CLASSIC:      { label:'Rivalidade Clássica',  color:'#FFD700', icon:'🎾'  },
  DOMINATION:   { label:'Dominância',           color:'#EF5350', icon:'🎾'  },
  GIANT_KILLER: { label:'Caçador de Gigantes',  color:'#FF9800', icon:'🎾'  },
  GRUDGE:       { label:'Guerra de Atrito',      color:'#E91E63', icon:'🎾'  },
  FINALS_CURSE: { label:'Maldição das Finais',   color:'#AA44FF', icon:'🎾'  },
  THRONE_RIVALS:{ label:'Rivais do Trono',       color:'#00BCD4', icon:'🎾'  },
  ERA_CLASH:    { label:'Choque de Eras',        color:'#66BB6A', icon:'🎾'  },
};

const PG_STATUS_WEIGHT = { LEGENDARY:4, INTENSE:3, ACTIVE:2, BREWING:1, FROZEN:0 };

const SIG_SHOT_LABEL = {
  INSIDE_OUT_FH:'Inside-Out FH', TOPSPIN_CROSS:'Topspin Cross', SHORT_ANGLE_FH:'ngulo Curto',
  SLICE_BH:'Slice BH', DROP_SHOT:'Drop Shot', BIG_SERVE:'Saque Dom.', VOLLEY_FINISH:'Voleio',
  BANANA_BH:'Banana BH', DTL_BH:'BH DTL', FLAT_WINNER:'Flat Winner',
};
const RALLY_PAT_LABEL = {
  CROSS_HEAVY:'Cruzado Dom.', DTL_HUNTER:'Caçador DTL', DEEP_GRINDER:'Fundão',
  SHORT_ANGLE_BUILDER:'ngulo Curto', CENTRE_CONTROL:'Centro', AGGRESSIVE_EARLY:'Ataque Precoce',
  SERVE_PLUS_ONE:'Serve+1', NET_APPROACH:'Rede', DEFENSIVE_BASE:'Defesa Base', RHYTHM_DISRUPTION:'Quebra Ritmo',
};

// -- Helpers --------------------------------------------------------
function pgSurfKey(courtKey) {
  if (!courtKey) return 'HARD';
  if (courtKey === 'ROLAND_GARROS') return 'CLAY';
  if (courtKey === 'WIMBLEDON')     return 'GRASS';
  if (courtKey === 'INDOOR')        return 'INDOOR';
  return 'HARD';
}

function pgOvrColor(v) {
  return v >= 90 ? '#FFD700' : v >= 82 ? '#00BCD4' : v >= 72 ? '#66BB6A' : '#94a3b8';
}

function pgSeasonStats(playerId, hist, year) {
  let wins = 0, losses = 0, titles = 0, gsWins = 0;
  Object.values(hist ?? {}).forEach(res => {
    const s = res._season ?? res.tournament?.season ?? res.tournament?.year;
    if (s !== year) return;
    const cat = res.tournament?.category;
    if (res._slim) {
      (res.matches ?? []).forEach(({ w, l }) => { if (w === playerId) wins++; else if (l === playerId) losses++; });
      if (res.champion?.id === playerId) { titles++; if (cat==='GRAND_SLAM') gsWins++; }
    } else {
      const { bracket, tournament } = res;
      if (!bracket?.rounds) return;
      bracket.rounds.forEach(rnd => rnd.forEach(m => {
        if (!m.winner || m.isBye) return;
        if (m.winner.id === playerId) wins++;
        else { const l = m.playerA?.id===m.winner.id ? m.playerB : m.playerA; if (l?.id===playerId) losses++; }
      }));
      if (bracket.champion?.id === playerId) { titles++; if (tournament?.category==='GRAND_SLAM') gsWins++; }
    }
  });
  return { wins, losses, titles, gsWins };
}

function pgH2H(idA, idB, rivalrySystem, hist) {
  const rivalry = rivalrySystem?.getRivalry?.(idA, idB) || null;
  let rawA = 0, rawB = 0, lastMatches = [];
  Object.values(hist ?? {}).forEach(res => {
    if (res._slim) {
      (res.matches ?? []).forEach(({ w, l }) => {
        if (!((w===idA&&l===idB)||(w===idB&&l===idA))) return;
        if (w===idA) rawA++; else rawB++;
        lastMatches.push({ winnerId:w, year:res._season, tourName:res.tournament?.name, cat:res.tournament?.category });
      });
    } else {
      const { bracket, tournament } = res;
      if (!bracket?.rounds) return;
      bracket.rounds.forEach((rnd, ri) => rnd.forEach(m => {
        if (!m.winner || m.isBye) return;
        const ids = [m.playerA?.id, m.playerB?.id].filter(Boolean);
        if (!ids.includes(idA) || !ids.includes(idB)) return;
        const w = m.winner?.id;
        if (w===idA) rawA++; else if (w===idB) rawB++;
        lastMatches.push({ winnerId:w, year:tournament?.season, tourName:tournament?.name, cat:tournament?.category, roundIdx:ri });
      }));
    }
  });
  const wA = rivalry ? (rivalry.p1Id===idA ? rivalry.p1Wins : rivalry.p2Wins) : rawA;
  const wB = rivalry ? (rivalry.p1Id===idA ? rivalry.p2Wins : rivalry.p1Wins) : rawB;
  return { wA, wB, total: wA+wB, rivalry, lastMatches: lastMatches.slice(-6).reverse() };
}

// -- Edge computation (who leads each dimension) --------------------
function computeEdges(pA, pB, surfKey) {
  const a = pA.attrs ?? {}, b = pB.attrs ?? {};
  const dims = [
    { key:'serve',    label:'SAQUE',     icon:'🎾',
      sA:(a.srv1Vel??70)*.55+(a.srv2Vel??60)*.25+(a.srv1Pct??65)*.2,
      sB:(b.srv1Vel??70)*.55+(b.srv2Vel??60)*.25+(b.srv1Pct??65)*.2 },
    { key:'return',   label:'RETORNO',   icon:'🎾',
      sA:(a.retorno??a.consistencia??70)*.5+(a.reflexos??a.velocidade??65)*.3+(a.bhPotencia??70)*.2,
      sB:(b.retorno??b.consistencia??70)*.5+(b.reflexos??b.velocidade??65)*.3+(b.bhPotencia??70)*.2 },
    { key:'baseline', label:'FUNDO',     icon:'🎾',
      sA:(a.fhPotencia??70)*.4+(a.consistencia??70)*.35+(a.bhPotencia??70)*.25,
      sB:(b.fhPotencia??70)*.4+(b.consistencia??70)*.35+(b.bhPotencia??70)*.25 },
    { key:'mental',   label:'MENTAL',    icon:'🎾',
      sA:(a.mentalidade??a.pressao??a.clutch??70),
      sB:(b.mentalidade??b.pressao??b.clutch??70) },
    { key:'movement', label:'FÍSICO',    icon:'🏆',
      sA:(a.velocidade??70)*.6+(a.resistencia??a.stamina??70)*.4,
      sB:(b.velocidade??70)*.6+(b.resistencia??b.stamina??70)*.4 },
    { key:'form',     label:'FORMA',     icon:'🎾',
      sA:50+Math.max(-28,Math.min(28,(pA.formPoints??0)*1.1)),
      sB:50+Math.max(-28,Math.min(28,(pB.formPoints??0)*1.1)) },
  ];
  // Surface advantage
  const saA = pA.surfaceIdentity, saB = pB.surfaceIdentity;
  dims.push({ key:'surface', label:'SUPERFÍCIE', icon:'🎾',
    sA: saA?.surface?.toUpperCase()===surfKey ? 55+(saA.winRate??52) : 48,
    sB: saB?.surface?.toUpperCase()===surfKey ? 55+(saB.winRate??52) : 48,
  });

  return dims.map(d => {
    const tot = d.sA + d.sB;
    const pA2 = tot > 0 ? (d.sA/tot)*100 : 50;
    const diff = d.sA - d.sB;
    const edge = Math.abs(diff) < 2.5 ? 'EVEN' : diff > 0 ? 'A' : 'B';
    const mag = Math.min(1, Math.abs(diff) / 22);
    return { ...d, pA: pA2, pB: 100-pA2, edge, mag };
  });
}

// -- Matchup narrative ----------------------------------------------
function pgMatchupNote(sA, sB) {
  const notes = {
    'AGG_BASELINER_vs_CTR_PUNCHER': 'O Baseliner busca terminar cedo; o Counter-Puncher absorve e replica no timing.',
    'AGG_BASELINER_vs_RETRIEVER':   'Winner vs. parede. O Retriever devolve tudo — quantos erros precisa para cair?',
    'AGG_BASELINER_vs_GRINDER':     'Agressividade vs. topspin pesado. O Grinder vai segurar até o Baseliner errar.',
    'SRV_VOL_vs_CTR_PUNCHER':       'Subida à rede vs. o melhor passador — cada voleio é uma aposta.',
    'BIG_SERVER_vs_CTR_PUNCHER':    'Saque rápido vs. rally longo. Quem dita o ritmo define a partida.',
    'BIG_SERVER_vs_BIG_SERVER':     'Batalha de saques. O primeiro break vai valer ouro.',
    'GRINDER_vs_RETRIEVER':         'Fundão pesado vs. paciência — dois jogadores que não erram primeiro.',
    'ALL_COURT_vs_ALL_COURT':       'Dois all-courters — decide nas transições e nos grandes momentos.',
    'TAKEALLRISK_vs_CTR_PUNCHER':   'Caos vs. controle. O All-Risk cria situações impossíveis; o Counter precisa de paciência.',
    'THRONE_RIVALS_default':        'Dois que já estiveram no topo — cada ponto carrega o peso do legado.',
  };
  const k1 = `${sA}_vs_${sB}`, k2 = `${sB}_vs_${sA}`;
  return notes[k1] || notes[k2] || 'Confronto equilibrado em estilos — detalhes de execução decidem.';
}

// -- Pre-match paragraph --------------------------------------------
function pgNarrative(pA, pB, h2h, surfKey, tournament) {
  const nA = pA.name, nB = pB.name;
  const surfLabel = { CLAY:'saibro', GRASS:'grama', HARD:'quadra dura', STREET:'asfalto', CARPET:'veludo', INDOOR:'indoor' }[surfKey] ?? 'quadra';
  const saA = pA.surfaceIdentity, saB = pB.surfaceIdentity;
  const aHome = saA?.surface?.toUpperCase() === surfKey;
  const bHome = saB?.surface?.toUpperCase() === surfKey;
  const fpA = pA.formPoints ?? 0, fpB = pB.formPoints ?? 0;
  const rivalry = h2h.rivalry;
  const rankA = pA.rankPosition ?? 99, rankB = pB.rankPosition ?? 99;
  const rankDiff = Math.abs(rankA - rankB);

  if (rivalry?.status === 'LEGENDARY') {
    return `Uma rivalidade lendária chega a ${tournament?.name ?? 'este torneio'}. ${nA} e ${nB} acumulam ${h2h.wA}—${h2h.wB} em ${h2h.total} encontros ao longo de ${rivalry.seasons?.length ?? '?'} temporadas. ${aHome ? `${nA} está em casa no ${surfLabel}.` : bHome ? `${nB} está em casa nesta superfície.` : `Nenhum dos dois tem vantagem clara de superfície.`} Seja qual for o resultado, este é mais um capítulo de uma história que o circuito vai citar por anos.`;
  }
  if (rivalry?.status === 'INTENSE') {
    const leader = h2h.wA > h2h.wB ? nA : h2h.wB > h2h.wA ? nB : null;
    const trail  = leader === nA ? nB : nA;
    return leader
      ? `${nA} e ${nB} têm uma série intensa — ${h2h.wA}—${h2h.wB} no H2H. ${leader} lidera, mas a diferença é menor do que o circuito sente quando esses dois jogam. ${bHome ? `${nB} tem o ${surfLabel} como trunfo.` : aHome ? `${nA} tem a superfície do seu lado.` : ''}`
      : `${nA} e ${nB} — uma série intensa que o H2H empatado não resume. Cada partida entre eles tem um peso que os números não capturam completamente.`;
  }
  if (h2h.total === 0) {
    if (rankDiff >= 25) {
      const fav = rankA < rankB ? nA : nB;
      return `Primeiro encontro entre ${nA} e ${nB}. ${fav} chega com vantagem de ranking, mas estreias têm lógica própria — sem H2H, sem padrão estabelecido. ${aHome ? `${nA} tem o ${surfLabel} do seu lado.` : bHome ? `${nB} tem a superfície como argumento.` : ''}`;
    }
    return `Primeira vez que ${nA} e ${nB} se encontram profissionalmente. Sem H2H para consultar — os dois vão se ler em tempo real. ${aHome ? `${nA} chega em terreno familiar no ${surfLabel}.` : bHome ? `${nB} está em casa nesta superfície.` : ''}`;
  }
  if (aHome && !bHome && fpA > 8)
    return `${nA} em forma e em casa no ${surfLabel}. Uma combinação pesada para ${nB}, que vai precisar de um nível excepcional para inverter um H2H de ${h2h.wA}—${h2h.wB} nessas condições.`;
  if (bHome && !aHome && fpB > 8)
    return `${nB} em forma e em casa no ${surfLabel}. ${nA} chega com H2H de ${h2h.wA}—${h2h.wB} — mas a superfície e o ritmo recente de ${nB} são argumentos pesados do outro lado.`;
  if (fpA > 15 && fpB < -8)
    return `${nA} atravessa um excelente momento; ${nB} busca reencontrar o melhor nível. O H2H de ${h2h.wA}—${h2h.wB} dá contexto histórico, mas forma atual é um argumento diferente.`;
  if (fpB > 15 && fpA < -8)
    return `${nB} em alta; ${nA} com resultados irregulares recentes. O H2H de ${h2h.wA}—${h2h.wB} é história — hoje o momento de ${nB} pode falar mais alto.`;
  const lead = h2h.wA > h2h.wB ? nA : h2h.wB > h2h.wA ? nB : null;
  const gap  = Math.abs(h2h.wA - h2h.wB);
  if (lead && gap >= 3)
    return `${lead} chega com vantagem consistente no H2H — ${h2h.wA}—${h2h.wB} em ${h2h.total} encontros. O adversário vai precisar mudar algo estrutural para inverter essa narrativa. ${aHome ? `${nA} tem o ${surfLabel} do seu lado.` : bHome ? `${nB} tem a superfície como argumento.` : ''}`;
  return `${nA} e ${nB} chegam a mais um duelo com H2H apertado — ${h2h.wA}—${h2h.wB} em ${h2h.total} partidas. Sem favorito claro além dos dados de hoje. ${aHome ? `${nA} tem o ${surfLabel} do seu lado.` : bHome ? `${nB} está em casa nesta superfície.` : ''}`;
}

function pgSafePct(wins, total) {
  return total > 0 ? Math.round((wins / total) * 100) : null;
}

function pgSafeName(player, fallback = 'Jogador') {
  return player?.name || fallback;
}

function pgFirstName(player, fallback = 'Jogador') {
  return pgSafeName(player, fallback).split(' ')[0] || fallback;
}

function pgLastName(player, fallback = 'Jogador') {
  const parts = pgSafeName(player, fallback).split(' ').filter(Boolean);
  return parts[parts.length - 1] || fallback;
}

function pgTraitList(player, limit = 6) {
  try {
    return (getPlayerTraits(player) ?? [])
      .map((slot) => slot?.name ?? slot?.traitId)
      .filter(Boolean)
      .slice(0, limit);
  } catch {
    return [];
  }
}

function pgPerceptionList(player, limit = 4) {
  return (player?.perceptions ?? [])
    .filter((p) => p?.claim && p?.status !== 'REFUTED')
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
    .slice(0, limit);
}

function pgCategoryScore(player, catId) {
  const attrs = player?.attrs ?? {};
  const cat = ATTR_CATEGORIES.find((entry) => entry.id === catId);
  if (!cat?.attrs?.length) return 50;
  const values = cat.attrs.map((entry) => attrs?.[entry.key] ?? 50);
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function pgCategoryDuelRows(playerA, playerB) {
  return ATTR_CATEGORIES.map((cat) => {
    const a = pgCategoryScore(playerA, cat.id);
    const b = pgCategoryScore(playerB, cat.id);
    const diff = a - b;
    return {
      id: cat.id,
      label: cat.label,
      color: cat.color,
      a,
      b,
      diff,
      leader: Math.abs(diff) < 3 ? 'EVEN' : diff > 0 ? 'A' : 'B',
      note: cat.attrs.slice(0, 2).map((entry) => entry.label).join(' + '),
    };
  });
}

function pgSurfaceRecord(player, surfKey) {
  const raw = player?.surfaceStats?.[surfKey] ?? {};
  const wins = raw.wins ?? raw.w ?? 0;
  const losses = raw.losses ?? raw.l ?? 0;
  const total = wins + losses;
  return { wins, losses, total, pct: pgSafePct(wins, total) };
}

function pgBuildMetrics(playerA, playerB, seasonA, seasonB, h2h, surfKey) {
  const surfaceA = pgSurfaceRecord(playerA, surfKey);
  const surfaceB = pgSurfaceRecord(playerB, surfKey);
  return [
    {
      label: 'Ranking',
      a: playerA?.rankPosition ?? 999,
      b: playerB?.rankPosition ?? 999,
      invert: true,
      fmt: (value) => `#${value === 999 ? '--' : value}`,
    },
    {
      label: 'Nivel',
      a: overallRating(playerA?.attrs ?? {}),
      b: overallRating(playerB?.attrs ?? {}),
      fmt: (value) => `${value}`,
    },
    {
      label: 'Temporada',
      a: pgSafePct(seasonA.wins, seasonA.wins + seasonA.losses) ?? 0,
      b: pgSafePct(seasonB.wins, seasonB.wins + seasonB.losses) ?? 0,
      fmt: (value) => `${value}%`,
    },
    {
      label: surfKey,
      a: surfaceA.pct ?? 0,
      b: surfaceB.pct ?? 0,
      fmt: (value) => `${value}%`,
    },
    {
      label: 'Titulos',
      a: sumCareerTitles(playerA),
      b: sumCareerTitles(playerB),
      fmt: (value) => `${value}`,
    },
    {
      label: 'H2H',
      a: h2h?.wA ?? 0,
      b: h2h?.wB ?? 0,
      fmt: (value) => `${value}`,
    },
  ];
}

function pgGeneratePressVoices(playerA, playerB, h2h, surfKey, seasonA, seasonB, edges) {
  const edgeA = edges.filter((edge) => edge.edge === 'A').length;
  const edgeB = edges.filter((edge) => edge.edge === 'B').length;
  const fav = edgeA === edgeB
    ? (overallRating(playerA?.attrs ?? {}) >= overallRating(playerB?.attrs ?? {}) ? playerA : playerB)
    : (edgeA > edgeB ? playerA : playerB);
  const dog = fav?.id === playerA?.id ? playerB : playerA;
  const surfaceFav = pgSurfaceRecord(fav, surfKey);
  const h2hLine = h2h?.total
    ? `${h2h.wA}-${h2h.wB} no H2H`
    : 'sem histórico direto';
  const seasonFav = fav?.id === playerA?.id ? seasonA : seasonB;
  const seasonDog = dog?.id === playerA?.id ? seasonA : seasonB;

  return [
    {
      outlet: 'Circuit Analytics',
      analyst: 'Volkov',
      pick: pgSafeName(fav),
      angle: `${pgFirstName(fav)} aparece como favorito técnico.`,
      quote: `${h2hLine}, ${surfaceFav.pct ?? '--'}% na superfície e ${edgeA === edgeB ? 'equilíbrio fino nas dimensões' : `${Math.max(edgeA, edgeB)} dimensões em vantagem`} empurram a leitura para esse lado.`,
    },
    {
      outlet: 'TennisIQ',
      analyst: 'Okafor',
      pick: pgSafeName(fav),
      angle: `O encaixe de estilos favorece ${pgFirstName(fav)}, mas exige disciplina.`,
      quote: `${pgFirstName(dog)} ainda tem janela real se conseguir deslocar a partida para ${dog?.styleId ?? 'o seu idioma competitivo'} e alongar os pontos onde o rival perde conforto.`,
    },
    {
      outlet: 'O Contraditório',
      analyst: 'Ferreira',
      pick: pgSafeName(dog),
      angle: `A zebra tem argumento.`,
      quote: `${pgFirstName(dog)} chega com ${seasonDog?.wins ?? 0}-${seasonDog?.losses ?? 0} no ano contra ${seasonFav?.wins ?? 0}-${seasonFav?.losses ?? 0} do favorito aparente? Não exatamente, mas o jogo pode virar se a pressão bater cedo e o roteiro esperado quebrar no primeiro set.`,
    },
  ];
}

function pgBuildMomentumSummary(playerA, playerB, seasonA, seasonB, surfKey) {
  const surfA = pgSurfaceRecord(playerA, surfKey);
  const surfB = pgSurfaceRecord(playerB, surfKey);
  const trendA = playerA.formPoints ?? 0;
  const trendB = playerB.formPoints ?? 0;
  const surfaceLeader = (surfA.pct ?? 0) === (surfB.pct ?? 0) ? null : ((surfA.pct ?? 0) > (surfB.pct ?? 0) ? playerA : playerB);
  const formLeader = trendA === trendB ? null : (trendA > trendB ? playerA : playerB);
  return [
    surfaceLeader ? `${pgFirstName(surfaceLeader)} chega mais confortável na ${String(surfKey || '').toLowerCase()}, com ${Math.max(surfA.pct ?? 0, surfB.pct ?? 0)}% de aproveitamento.` : 'A superfície não separa muito os dois.',
    formLeader ? `${pgFirstName(formLeader)} vive momento mais quente no recorte recente de forma.` : 'A forma recente também está bem próxima.',
    `No ano, ${pgFirstName(playerA)} vai de ${seasonA?.wins ?? 0}-${seasonA?.losses ?? 0}, enquanto ${pgFirstName(playerB)} aparece em ${seasonB?.wins ?? 0}-${seasonB?.losses ?? 0}.`,
  ];
}

// --------------------------------------------------------------------
// SUB-COMPONENTS
// --------------------------------------------------------------------

function PGPhoto({ player, size=70 }) {
  const photo = getPlayerPhoto(player);
  const [ok, setOk] = React.useState(!!photo);
  const initials = pgSafeName(player, '??').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() ?? '??';
  const base = {
    width:size, height:size, borderRadius:3, overflow:'hidden', flexShrink:0,
    background:`${player?.color??'#111'}22`,
    border:`1.5px solid ${player?.color??'rgba(255,255,255,.1)'}44`,
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:size*.33, fontWeight:800, color:'#fff', fontFamily:"'Bebas Neue',sans-serif",
  };
  if (photo&&ok) return (
    <div style={base}>
      <img src={photo} alt={player?.name} onError={()=>setOk(false)}
        style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'top center'}} />
    </div>
  );
  return <div style={base}>{initials}</div>;
}

// -- Mini form dots -------------------------------------------------
function PGFormDots({ player, count=8 }) {
  const hist = (player.formHistory ?? []).slice(-count).reverse();
  if (!hist.length) return <span style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:'rgba(255,255,255,.18)'}}>—</span>;
  return (
    <div style={{display:'flex',gap:3,alignItems:'center'}}>
      {hist.map((e,i) => {
        const won = e.delta > 0;
        const c = won ? '#2ECC71' : '#EF5350';
        const title = `${e.tournamentName??''} ${e.year??''} (${won?'V':'D'})`;
        return <div key={i} title={title} style={{
          width:7, height:7, borderRadius:'50%', flexShrink:0,
          background:won?c:'transparent', border:`1.5px solid ${c}`,
          boxShadow:won?`0 0 5px ${c}55`:'none',
        }}/>;
      })}
    </div>
  );
}

// -- Player side panel ----------------------------------------------
function PGPlayerCard({ player, side, seasonStats, surfKey, colorOther, delay=0 }) {
  const ovr  = overallRating(player.attrs);
  const ovrC = pgOvrColor(ovr);
  const sty  = PG_STYLE[player.styleId] ?? { label:player.styleId??'—', icon:'🎾', color:'#94a3b8' };
  const fp   = player.formPoints ?? 0;
  const formC = fp > 10 ? '#2ECC71' : fp < -10 ? '#EF5350' : '#FFD700';
  const formLbl = fp > 15 ? '? EM ALTA' : fp > 5 ? '? BOA FORMA' : fp < -15 ? '? EM BAIXA' : fp < -5 ? '? IRREGULAR' : '? NEUTRO';
  const isLeft = side === 'left';
  const pColor = player.color ?? sty.color ?? '#888';
  const saHome = player.surfaceIdentity?.surface?.toUpperCase() === surfKey;

  const sigIds = player.signatureShots ?? (player.signatureShot ? [player.signatureShot] : null);
  const sigId  = sigIds?.[0];

  const attrs = [
    { k:'FH',   v: player.attrs?.fhPotencia??70,   c:'#FF6B35' },
    { k:'BH',   v: player.attrs?.bhPotencia??70,   c:'#FFB300' },
    { k:'SRV',  v: player.attrs?.srv1Vel??70,      c:'#AA44FF' },
    { k:'CONS', v: player.attrs?.consistencia??70, c:'#00BCD4' },
    { k:'MENT', v: player.attrs?.mentalidade??player.attrs?.pressao??70, c:'#E91E63' },
    { k:'VEL',  v: player.attrs?.velocidade??70,   c:'#2ECC71' },
  ];

  return (
    <div style={{
      display:'flex', flexDirection:'column', gap:10,
      animation:`${isLeft?'pg-left':'pg-right'} .5s ${delay}s both`,
    }}>
      {/* Main card */}
      <div className="pg-glass" style={{
        padding:'16px', borderTop:`2px solid ${pColor}99`,
        position:'relative', overflow:'hidden',
      }}>
        {/* Color wash */}
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none',
          background:`radial-gradient(ellipse 70% 50% at ${isLeft?'0%':'100%'} 0%, ${pColor}09 0%, transparent 70%)`,
        }}/>

        {/* Header */}
        <div style={{display:'flex', alignItems:'flex-start', gap:12, marginBottom:14, position:'relative'}}>
          <PGPhoto player={player} size={62} />
          <div style={{flex:1, minWidth:0}}>
            <div style={{
              fontFamily:"'Bebas Neue',sans-serif", fontSize:24, letterSpacing:'.06em',
              lineHeight:.95, color:'#FFF', marginBottom:5,
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
            }}>{pgSafeName(player)}</div>
            <div style={{display:'flex', gap:5, flexWrap:'wrap', marginBottom:7}}>
              <span style={{
                fontFamily:"'Space Mono',monospace", fontSize:8, padding:'2px 7px',
                background:`${sty.color}12`, border:`1px solid ${sty.color}35`,
                color:sty.color, letterSpacing:'.07em',
              }}>{sty.icon} {sty.label}</span>
              {player.nationality && <span style={{
                fontFamily:"'Space Mono',monospace", fontSize:8, padding:'2px 7px',
                background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.09)',
                color:'rgba(255,255,255,.45)', letterSpacing:'.06em',
              }}>{player.nationality}</span>}
              {saHome && <span style={{
                fontFamily:"'Space Mono',monospace", fontSize:8, padding:'2px 7px',
                background:'rgba(255,215,0,.07)', border:'1px solid rgba(255,215,0,.2)',
                color:'#FFD700', letterSpacing:'.06em',
              }}>🏠 CASA</span>}
            </div>
            <div style={{display:'flex', gap:16, alignItems:'flex-end'}}>
              <div>
                <div className="pg-label">RANK</div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:28,
                  color:player.rankPosition===1?'#FFD700':'rgba(255,255,255,.9)',
                  lineHeight:1, letterSpacing:'.04em'}}>
                  #{player.rankPosition??'—'}
                </div>
              </div>
              <div>
                <div className="pg-label">N—VEL</div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:28,
                  color:ovrTier(ovr).color, lineHeight:1, letterSpacing:'.04em'}}>{ovrTier(ovr).grade}</div>
              </div>
              <div>
                <div className="pg-label">IDADE</div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:22,
                  color:'rgba(255,255,255,.6)', lineHeight:1.1}}>{player.age??'—'}a</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sig shot + rally */}
        {(sigId || player.rallyPattern) && (
          <div style={{display:'flex', gap:7, marginBottom:12}}>
            {sigId && (
              <div style={{flex:1, padding:'5px 9px',
                background:'rgba(255,107,53,.07)', border:'1px solid rgba(255,107,53,.22)',borderRadius:2}}>
                <div className="pg-label" style={{marginBottom:2}}>GOLPE PRINCIPAL</div>
                <div style={{fontSize:11,fontWeight:700,color:'#FF6B35'}}>
                  ? {SIG_SHOT_LABEL[sigId]??sigId}
                  {sigIds.length>1 && <span style={{color:'rgba(255,107,53,.5)',fontSize:9}}> +{sigIds.length-1}</span>}
                </div>
              </div>
            )}
            {player.rallyPattern && (
              <div style={{flex:1, padding:'5px 9px',
                background:'rgba(0,188,212,.06)', border:'1px solid rgba(0,188,212,.18)',borderRadius:2}}>
                <div className="pg-label" style={{marginBottom:2}}>PADR—O RALLY</div>
                <div style={{fontSize:11,fontWeight:700,color:'#00BCD4'}}>
                  ?? {RALLY_PAT_LABEL[player.rallyPattern]??player.rallyPattern}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Strengths — qualitative, sem números */}
        <div style={{display:'flex',flexDirection:'column',gap:4,marginBottom:11}}>
          {(topStrengths(player.attrs, 3)?.length ? topStrengths(player.attrs, 3) : [
            { key:'base', label:'Base', catColor:pColor, tier:'good' },
            { key:'leitura', label:'Leitura', catColor:'#4A90D9', tier:'good' },
            { key:'competicao', label:'Competição', catColor:'#E8C84A', tier:'good' },
          ]).map(s => (
            <div key={s.key} style={{display:'flex',alignItems:'center',gap:7}}>
              <div className="pg-label" style={{width:38,flexShrink:0,color:s.catColor}}>{s.label.split(' ')[0].toUpperCase()}</div>
              <div style={{flex:1,height:3,borderRadius:2,background:'rgba(255,255,255,.055)',overflow:'hidden'}}>
                <div style={{height:'100%',width:`${s.tier==='elite'?92:s.tier==='great'?76:60}%`,borderRadius:2,
                  background:`linear-gradient(90deg,${s.catColor},${s.catColor}88)`,
                  boxShadow:`0 0 4px ${s.catColor}40`}}/>
              </div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:7,
                color:s.catColor,width:36,textAlign:'right',letterSpacing:'.04em'}}>
                {s.tier==='elite'?'ELITE':s.tier==='great'?'FORTE':'S—LIDO'}
              </div>
            </div>
          ))}
        </div>

        {/* Form */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:formC,
            fontWeight:700,letterSpacing:'.1em'}}>{formLbl}</span>
          <PGFormDots player={player} count={8} />
        </div>
      </div>

      {/* Season mini-card */}
      <div className="pg-glass" style={{padding:'11px 14px'}}>
        <div className="pg-label" style={{marginBottom:8}}>TEMPORADA</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:4,textAlign:'center'}}>
          {[
            {l:'V-D', v:`${seasonStats.wins}-${seasonStats.losses}`, c:'rgba(255,255,255,.75)'},
            {l:'T—tulos', v:seasonStats.titles, c:seasonStats.titles>0?'#FFD700':'rgba(255,255,255,.18)'},
            {l:'GS', v:seasonStats.gsWins, c:seasonStats.gsWins>0?'#E91E63':'rgba(255,255,255,.18)'},
            {l:'Form', v:fp>0?`+${fp}`:fp, c:formC},
          ].map(s => (
            <div key={s.l}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,
                color:s.c,letterSpacing:'.03em',lineHeight:1}}>{s.v}</div>
              <div className="pg-label" style={{marginTop:1,fontSize:7}}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// -- Edge Battle center column --------------------------------------
function PGEdgeBattle({ edges, pA, pB, colorA, colorB }) {
  const edgeCountA = edges.filter(e=>e.edge==='A').length;
  const edgeCountB = edges.filter(e=>e.edge==='B').length;

  return (
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {/* Header */}
      <div className="pg-glass" style={{padding:'10px 14px'}}>
        <div className="pg-label" style={{textAlign:'center',marginBottom:8}}>VANTAGEM POR DIMENS—O</div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
            <div style={{textAlign:'left'}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:30,color:colorA,lineHeight:1}}>{edgeCountA}</div>
            <div className="pg-label" style={{fontSize:7}}>{pgLastName(pA)}</div>
          </div>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:'rgba(255,255,255,.25)',letterSpacing:'.1em'}}>
            DIMENS—ES
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:30,color:colorB,lineHeight:1}}>{edgeCountB}</div>
            <div className="pg-label" style={{fontSize:7}}>{pgLastName(pB)}</div>
          </div>
        </div>
      </div>

      {/* Each dimension */}
      {edges.map((d, i) => {
        const isA = d.edge==='A', isB = d.edge==='B', isE = d.edge==='EVEN';
        const cA = isA ? colorA : 'rgba(255,255,255,.1)';
        const cB = isB ? colorB : 'rgba(255,255,255,.08)';
        const edgeC = isA ? colorA : isB ? colorB : 'rgba(255,255,255,.3)';
        const nameA = pgLastName(pA);
        const nameB = pgLastName(pB);
        return (
          <div key={d.key} style={{animation:`pg-up .4s ${.3+i*.06}s both`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
              <div style={{
                fontFamily:"'Space Mono',monospace",fontSize:7,letterSpacing:'.15em',
                color: isA ? colorA : 'rgba(255,255,255,.2)',
                fontWeight: isA ? 700 : 400,
              }}>{isA ? `? ${nameA.toUpperCase()}` : `${Math.round(d.pA)}%`}</div>
              <div style={{display:'flex',alignItems:'center',gap:5}}>
                <span style={{fontSize:10}}>{d.icon}</span>
                <span style={{
                  fontFamily:"'Space Mono',monospace",fontSize:8,letterSpacing:'.18em',
                  color: isE ? 'rgba(255,255,255,.4)' : edgeC,
                  fontWeight:700,
                }}>{d.label}</span>
              </div>
              <div style={{
                fontFamily:"'Space Mono',monospace",fontSize:7,letterSpacing:'.15em',
                color: isB ? colorB : 'rgba(255,255,255,.2)',
                fontWeight: isB ? 700 : 400, textAlign:'right',
              }}>{isB ? `${nameB.toUpperCase()} ?` : `${Math.round(d.pB)}%`}</div>
            </div>
            <div className="pg-bar-track">
              <div className="pg-bar-a" style={{
                width:`${d.pA}%`,
                background: isA ? `linear-gradient(90deg,${colorA}cc,${colorA}77)` : 'rgba(255,255,255,.09)',
                boxShadow: isA && d.mag > .45 ? `0 0 8px ${colorA}66` : 'none',
              }}/>
              <div className="pg-bar-b" style={{
                background: isB ? `linear-gradient(90deg,${colorB}77,${colorB}cc)` : 'rgba(255,255,255,.06)',
                boxShadow: isB && d.mag > .45 ? `0 0 8px ${colorB}66` : 'none',
              }}/>
              <div className="pg-midline"/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// -- H2H History ----------------------------------------------------
function PGH2HHistory({ h2h, pA, pB, colorA, colorB }) {
  if (!h2h.lastMatches.length) return null;
  const catConf = { GRAND_SLAM:{c:'#FFD700',l:'GS'}, SLAM_CLASH:{c:'#FF8A3D',l:'CLASH'}, MASTERS_1000:{c:'#E040FB',l:'M'}, ATP_500:{c:'#00BCD4',l:'500'}, ATP_250:{c:'#66BB6A',l:'250'}, ATP_100:{c:'#8D6E63',l:'100'}, ATP_75:{c:'#A1887F',l:'75'}, ATP_50:{c:'#BCAAA4',l:'50'}, ATP_25:{c:'#D7CCC8',l:'25'}, FINALS:{c:'#F44336',l:'FIN'} };
  const roundL = {0:'R1',1:'R2',2:'R3',3:'QF',4:'QF',5:'SF',6:'F'};
  return (
    <div>
      <div className="pg-label" style={{marginBottom:9,textAlign:'center'}}>HIST—RICO DO DUELO</div>
      <div style={{display:'flex',flexDirection:'column',gap:4}}>
        {h2h.lastMatches.slice(0,5).map((m,i) => {
          const wonByA = m.winnerId === pA.id;
          const wc = wonByA ? colorA : colorB;
          const wName = wonByA ? pA.name : pB.name;
          const cc = catConf[m.cat];
          const rl = roundL[m.roundIdx] ?? '';
          return (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap:8, padding:'6px 10px',
              background:'rgba(255,255,255,.022)', borderRadius:2,
              borderLeft:`2px solid ${wc}66`,
              animation:`pg-in .3s ${.07*i}s both`,
            }}>
              <div style={{
                width:20, height:20, borderRadius:'50%', flexShrink:0,
                background:`${wc}18`, border:`1px solid ${wc}44`,
                display:'flex',alignItems:'center',justifyContent:'center',
                fontFamily:"'Bebas Neue',sans-serif",fontSize:9,color:wc,
              }}>{wonByA?'A':'B'}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,
                  color:wc,fontSize:12,letterSpacing:'.05em',lineHeight:1,
                  overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {pgLastName({ name: wName })}
                </div>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:7,
                  color:'rgba(255,255,255,.28)',letterSpacing:'.04em',marginTop:1,
                  overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {m.tourName??'—'}{rl?` — ${rl}`:''}
                </div>
              </div>
              <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:2,flexShrink:0}}>
                {cc && <span style={{fontFamily:"'Space Mono',monospace",fontSize:7,color:cc.c}}>{cc.l}</span>}
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:'rgba(255,255,255,.28)'}}>{m.year??'—'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------
// MAIN COMPONENT
// --------------------------------------------------------------------
function LegacyPreGameAnalysis({ preGamePending, universeState, onStart, onStartHighlights, onSimHighlights, onSkip }) {
  React.useEffect(() => { injectPreGameCSS(); }, []);

  const { playerA, playerB, tournament, roundIdx, bestOf } = preGamePending;
  if (!playerA || !playerB) {
    return (
      <div className="pg-screen" style={{display:'flex', alignItems:'center', justifyContent:'center', padding:32}}>
        <div className="pg-glass" style={{maxWidth:760, width:'100%', padding:'22px 24px'}}>
          <div className="pg-label" style={{marginBottom:10}}>PRÉ-JOGO INDISPONÍVEL</div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, color:'rgba(255,255,255,.7)', lineHeight:1.55}}>
            O confronto ainda não tem dois jogadores válidos para montar a análise completa. Dá para seguir em frente sem travar a navegação.
          </div>
          <div style={{display:'flex', justifyContent:'flex-end', marginTop:18}}>
            <button className="pg-skip" onClick={onSkip}>VOLTAR</button>
          </div>
        </div>
      </div>
    );
  }
  const year    = universeState?.year ?? 2025;
  const hist    = {
    ...(universeState?.historicalTournamentResults ?? {}),
    ...(universeState?.tournamentResults ?? {}),
  };
  const rs      = universeState?.rivalrySystem;
  const surfKey = pgSurfKey(tournament?.courtKey);
  const surf    = PG_SURF[surfKey] ?? PG_SURF.HARD;
  const catCfg  = PG_CAT[tournament?.category] ?? { label:tournament?.category??'Torneio', color:'#888', icon:'🎾' };
  const roundLbl = PG_ROUND[roundIdx] ?? (roundIdx!=null?`R${roundIdx+1}`:'Partida');

  const statsA = React.useMemo(() => {
    try { return pgSeasonStats(playerA?.id, hist, year); } catch { return { wins: 0, losses: 0, titles: 0, gsWins: 0 }; }
  }, [playerA?.id, year, hist]);
  const statsB = React.useMemo(() => {
    try { return pgSeasonStats(playerB?.id, hist, year); } catch { return { wins: 0, losses: 0, titles: 0, gsWins: 0 }; }
  }, [playerB?.id, year, hist]);
  const h2h    = React.useMemo(() => {
    try { return pgH2H(playerA?.id, playerB?.id, rs, hist); } catch { return { wA: 0, wB: 0, total: 0, rivalry: null, lastMatches: [] }; }
  }, [playerA?.id, playerB?.id, rs, hist]);
  const edges  = React.useMemo(() => {
    try { return computeEdges(playerA ?? {}, playerB ?? {}, surfKey); } catch { return []; }
  }, [playerA, playerB, surfKey]);
  const traitA = React.useMemo(() => pgTraitList(playerA), [playerA]);
  const traitB = React.useMemo(() => pgTraitList(playerB), [playerB]);
  const percA  = React.useMemo(() => pgPerceptionList(playerA), [playerA]);
  const percB  = React.useMemo(() => pgPerceptionList(playerB), [playerB]);
  const duelRows = React.useMemo(() => {
    try { return pgCategoryDuelRows(playerA, playerB); } catch { return []; }
  }, [playerA, playerB]);
  const metricRows = React.useMemo(() => {
    try { return pgBuildMetrics(playerA, playerB, statsA, statsB, h2h, surfKey); } catch { return []; }
  }, [playerA, playerB, statsA, statsB, h2h, surfKey]);
  const pressVoices = React.useMemo(() => {
    try { return pgGeneratePressVoices(playerA, playerB, h2h, surfKey, statsA, statsB, edges); } catch { return []; }
  }, [playerA, playerB, h2h, surfKey, statsA, statsB, edges]);
  const momentumSummary = React.useMemo(() => {
    try { return pgBuildMomentumSummary(playerA, playerB, statsA, statsB, surfKey); } catch { return []; }
  }, [playerA, playerB, statsA, statsB, surfKey]);
  const identityDuel = React.useMemo(() => {
    try { return buildIdentityDuel(playerA, playerB, { surfaceKey: surfKey }); } catch { return null; }
  }, [playerA, playerB, surfKey]);

  const narrative = pgNarrative(playerA, playerB, h2h, surfKey, tournament);
  const matchNote = pgMatchupNote(playerA.styleId, playerB.styleId);

  const styA = PG_STYLE[playerA.styleId] ?? { label:playerA.styleId??'—', icon:'🎾', color:'#888' };
  const styB = PG_STYLE[playerB.styleId] ?? { label:playerB.styleId??'—', icon:'🎾', color:'#888' };
  const colorA = playerA.color ?? styA.color ?? '#C4572A';
  const colorB = playerB.color ?? styB.color ?? '#1565C0';

  const rivalry    = h2h.rivalry;
  const rivalryCfg = rivalry ? (PG_RIVALRY[rivalry.type] ?? PG_RIVALRY.CLASSIC) : null;
  const statusW    = rivalry ? (PG_STATUS_WEIGHT[rivalry.status] ?? 0) : 0;
  const pctA  = h2h.total > 0 ? Math.round(h2h.wA/h2h.total*100) : 50;

  const lastSurf = playerA.surfaceIdentity?.surface?.toUpperCase()===surfKey;
  const lastSurfB = playerB.surfaceIdentity?.surface?.toUpperCase()===surfKey;

  return (
    <div className="pg-screen">
      <div className="pg-scan-line"/>

      {/* ---- TOPBAR ---- */}
      <div style={{
        position:'sticky', top:0, zIndex:100,
        display:'flex', justifyContent:'space-between', alignItems:'center',
        padding:'0 24px', height:42,
        background:`rgba(2,4,10,.97)`,
        borderBottom:`1px solid ${surf.color}28`,
        backdropFilter:'blur(16px)',
        animation:'pg-in .3s both',
      }}>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <div style={{width:2, height:16, background:surf.color, opacity:.65}}/>
          <span style={{
            fontFamily:"'Space Mono',monospace", fontSize:8,
            letterSpacing:'.28em', color:'rgba(255,255,255,.3)', textTransform:'uppercase',
          }}>PRÉ-JOGO — {catCfg.icon} {catCfg.label} — {surf.label} — {roundLbl}</span>
        </div>
        <button className="pg-skip" onClick={onSkip}>PULAR »</button>
      </div>

      {/* ---- HERO — Names collision ---- */}
      <div style={{
        position:'relative', overflow:'hidden', paddingBottom:0,
        background:`linear-gradient(180deg, ${surf.bg} 0%, transparent 100%)`,
      }}>
        {/* Atmospheric glow */}
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none',
          background:`radial-gradient(ellipse 110% 70% at 50% -5%, ${surf.color}1A 0%, transparent 60%)`,
          animation:'pg-glow 5s ease-in-out infinite',
        }}/>
        {/* Diagonal divider line */}
        <div style={{
          position:'absolute', left:'50%', top:0, bottom:0, width:1,
          background:`linear-gradient(180deg, transparent, ${surf.color}33, transparent)`,
          transform:'translateX(-50%)',
        }}/>

        <div style={{position:'relative', maxWidth:1160, margin:'0 auto', padding:'40px 28px 32px'}}>
          {/* Tournament pill */}
          <div style={{display:'flex', justifyContent:'center', marginBottom:22, animation:'pg-in .5s .1s both'}}>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:8,
              padding:'5px 18px',
              border:`1px solid ${catCfg.color}2E`,
              background:`${catCfg.color}0A`,
            }}>
              <span style={{fontSize:12}}>{catCfg.icon}</span>
              <span style={{fontFamily:"'Space Mono',monospace", fontSize:9, letterSpacing:'.22em',
                color:catCfg.color, textTransform:'uppercase'}}>
                {tournament?.name ?? 'Torneio'} — {roundLbl} — {tournament?.format === 'SUPER_TB_10' ? 'STB10' : `MD${bestOf}`}
              </span>
            </div>
          </div>

          {/* Huge names */}
          <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:0}}>
            {/* Player A */}
            <div style={{flex:1, textAlign:'right', paddingRight:36, animation:'pg-left .7s .12s both'}}>
              <div style={{
                fontFamily:"'Bebas Neue',sans-serif", lineHeight:.9,
                fontSize:'clamp(28px,4.5vw,52px)', letterSpacing:'.05em',
                color:'rgba(255,255,255,.55)',
              }}>{pgSafeName(playerA).split(' ').slice(0,-1).join(' ')}</div>
              <div style={{
                fontFamily:"'Bebas Neue',sans-serif", lineHeight:.9,
                fontSize:'clamp(46px,7vw,82px)', letterSpacing:'.04em',
                color:colorA, textShadow:`0 0 80px ${colorA}66, 0 0 30px ${colorA}44`,
              }}>{pgLastName(playerA)}</div>
              <div style={{display:'flex', justifyContent:'flex-end', alignItems:'center', gap:8, marginTop:8}}>
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:9,
                  color:'rgba(255,255,255,.35)',letterSpacing:'.1em'}}>#{playerA.rankPosition??'—'}</span>
                <span style={{padding:'2px 8px',background:`${styA.color}12`,
                  border:`1px solid ${styA.color}30`,fontFamily:"'Space Mono',monospace",
                  fontSize:8,color:styA.color,letterSpacing:'.07em'}}>
                  {styA.icon} {styA.label}
                </span>
                {lastSurf && <span style={{padding:'2px 8px',background:'rgba(255,215,0,.07)',
                  border:'1px solid rgba(255,215,0,.2)',fontFamily:"'Space Mono',monospace",
                  fontSize:8,color:'#FFD700',letterSpacing:'.06em'}}>🏠 CASA</span>}
              </div>
            </div>

            {/* VS + H2H */}
            <div style={{flexShrink:0, display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
              <div style={{
                fontFamily:"'Bebas Neue',sans-serif",
                fontSize:'clamp(40px,6.5vw,70px)',
                color:surf.color, lineHeight:1, letterSpacing:'.1em',
                animation:'pg-vs .75s .4s both',
                textShadow:`0 0 50px ${surf.color}AA`,
              }}>VS</div>
              {h2h.total > 0 ? (
                <div style={{textAlign:'center',animation:'pg-up .4s .65s both'}}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:'.04em',lineHeight:1}}>
                    <span style={{color:h2h.wA>=h2h.wB?colorA:'rgba(255,255,255,.35)'}}>{h2h.wA}</span>
                    <span style={{color:'rgba(255,255,255,.15)',margin:'0 5px'}}>—</span>
                    <span style={{color:h2h.wB>=h2h.wA?colorB:'rgba(255,255,255,.35)'}}>{h2h.wB}</span>
                  </div>
                  <div className="pg-label" style={{marginTop:2}}>H2H — {h2h.total} partidas</div>
                </div>
              ) : (
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:8,
                  color:'rgba(255,255,255,.22)',letterSpacing:'.14em',textAlign:'center',
                  animation:'pg-in .4s .65s both'}}>1— ENCONTRO</div>
              )}
            </div>

            {/* Player B */}
            <div style={{flex:1, paddingLeft:36, animation:'pg-right .7s .12s both'}}>
              <div style={{
                fontFamily:"'Bebas Neue',sans-serif", lineHeight:.9,
                fontSize:'clamp(28px,4.5vw,52px)', letterSpacing:'.05em',
                color:'rgba(255,255,255,.55)',
              }}>{pgSafeName(playerB).split(' ').slice(0,-1).join(' ')}</div>
              <div style={{
                fontFamily:"'Bebas Neue',sans-serif", lineHeight:.9,
                fontSize:'clamp(46px,7vw,82px)', letterSpacing:'.04em',
                color:colorB, textShadow:`0 0 80px ${colorB}66, 0 0 30px ${colorB}44`,
              }}>{pgLastName(playerB)}</div>
              <div style={{display:'flex', alignItems:'center', gap:8, marginTop:8}}>
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:9,
                  color:'rgba(255,255,255,.35)',letterSpacing:'.1em'}}>#{playerB.rankPosition??'—'}</span>
                <span style={{padding:'2px 8px',background:`${styB.color}12`,
                  border:`1px solid ${styB.color}30`,fontFamily:"'Space Mono',monospace",
                  fontSize:8,color:styB.color,letterSpacing:'.07em'}}>
                  {styB.icon} {styB.label}
                </span>
                {lastSurfB && <span style={{padding:'2px 8px',background:'rgba(255,215,0,.07)',
                  border:'1px solid rgba(255,215,0,.2)',fontFamily:"'Space Mono',monospace",
                  fontSize:8,color:'#FFD700',letterSpacing:'.06em'}}>🏠 CASA</span>}
              </div>
            </div>
          </div>

          {/* -- Rivalry banner (if exists) -- */}
          {rivalry && rivalryCfg && statusW >= 2 && (
            <div style={{
              marginTop:22, padding:'12px 22px',
              border:`1px solid ${rivalryCfg.color}44`,
              background:`linear-gradient(90deg, ${rivalryCfg.color}0A 0%, ${rivalryCfg.color}05 50%, ${rivalryCfg.color}0A 100%)`,
              display:'flex', alignItems:'center', gap:14,
              animation:'pg-up .5s .8s both',
              boxShadow:`0 0 40px ${rivalryCfg.color}12`,
              '--rc': rivalryCfg.color,
            }}>
              <span style={{fontSize:20, animation:'pg-glow 2.5s ease-in-out infinite'}}>{rivalryCfg.icon}</span>
              <div style={{flex:1}}>
                <div style={{
                  fontFamily:"'Space Mono',monospace", fontSize:9, letterSpacing:'.22em',
                  color:rivalryCfg.color, fontWeight:700, textTransform:'uppercase', marginBottom:3,
                }}>{rivalryCfg.label}
                  {rivalry.status === 'LEGENDARY' && <span style={{marginLeft:8,
                    fontFamily:"'Space Mono',monospace",fontSize:8,letterSpacing:'.1em',
                    padding:'1px 6px',background:`${rivalryCfg.color}22`,
                    border:`1px solid ${rivalryCfg.color}44`,color:rivalryCfg.color}}>LEND—RIA</span>}
                  {rivalry.status === 'INTENSE' && <span style={{marginLeft:8,
                    fontFamily:"'Space Mono',monospace",fontSize:8,letterSpacing:'.1em',
                    padding:'1px 6px',background:`${rivalryCfg.color}22`,
                    border:`1px solid ${rivalryCfg.color}44`,color:rivalryCfg.color}}>INTENSA</span>}
                </div>
                {rivalry.narrative && (
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontStyle:'italic',
                    fontSize:12, color:`${rivalryCfg.color}BB`, lineHeight:1.4}}>
                    {rivalry.narrative}
                  </div>
                )}
              </div>
              <div style={{flexShrink:0,textAlign:'right'}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,
                  color:rivalryCfg.color,lineHeight:1}}>{h2h.wA}—{h2h.wB}</div>
                <div className="pg-label" style={{fontSize:7}}>H2H TOTAL</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---- BODY ---- */}
      <div style={{maxWidth:1160, margin:'0 auto', padding:'0 28px 52px', display:'flex', flexDirection:'column', gap:14}}>

        {/* -- Narrative -- */}
        <div className="pg-glass" style={{
          padding:'16px 20px', borderLeft:`3px solid ${surf.color}55`,
          animation:'pg-up .5s .5s both',
        }}>
          <div className="pg-label" style={{marginBottom:7}}>CONTEXTO DA PARTIDA</div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontStyle:'italic',
            fontSize:15,color:'rgba(255,255,255,.6)',lineHeight:1.6}}>
            {narrative}
          </div>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1.15fr .85fr', gap:14}}>
          <div className="pg-glass" style={{padding:'16px 18px', animation:'pg-up .45s .58s both'}}>
            <div className="pg-label" style={{marginBottom:10}}>PAINEL EDITORIAL</div>
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
              {(pressVoices.length ? pressVoices : [{
                outlet:'Circuit Desk',
                analyst:'Radar',
                pick:'Duelo em aberto',
                angle:'Ainda não há consenso forte entre os sinais disponíveis.',
                quote:'O confronto chega mais equilibrado do que a amostra atual permite cravar, então o primeiro set deve dizer muito sobre para onde a partida vai correr.',
              }]).map((voice, idx) => (
                <div key={`${voice.analyst}-${idx}`} style={{
                  padding:'11px 12px',
                  background:'rgba(255,255,255,.02)',
                  border:'1px solid rgba(255,255,255,.06)',
                  borderLeft:`2px solid ${idx === 0 ? surf.color : idx === 1 ? '#2ECC71' : '#F06428'}`,
                }}>
                  <div style={{display:'flex', justifyContent:'space-between', gap:12, marginBottom:5}}>
                    <span style={{fontFamily:"'Space Mono',monospace", fontSize:8, color:'rgba(255,255,255,.35)', letterSpacing:'.12em'}}>
                      {voice.outlet} / {voice.analyst}
                    </span>
                    <span style={{fontFamily:"'Space Mono',monospace", fontSize:8, color:'rgba(255,255,255,.5)', letterSpacing:'.1em'}}>
                      FAVORITO: {pgLastName({ name: voice.pick }).toUpperCase()}
                    </span>
                  </div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, color:'#FFF', letterSpacing:'.02em', marginBottom:4}}>
                    {voice.angle}
                  </div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontStyle:'italic', color:'rgba(255,255,255,.52)', lineHeight:1.5}}>
                    {voice.quote}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pg-glass" style={{padding:'16px 18px', animation:'pg-up .45s .66s both'}}>
            <div className="pg-label" style={{marginBottom:10}}>MOMENTO DO CONFRONTO</div>
            <div style={{display:'flex', flexDirection:'column', gap:9}}>
              {(momentumSummary.length ? momentumSummary : ['Ainda não há amostra suficiente para separar os dois por momento recente.']).map((line, idx) => (
                <div key={idx} style={{
                  padding:'10px 12px',
                  background:'rgba(255,255,255,.02)',
                  border:'1px solid rgba(255,255,255,.05)',
                  fontFamily:"'Barlow Condensed',sans-serif",
                  fontSize:12.5,
                  color:'rgba(255,255,255,.7)',
                  lineHeight:1.5,
                }}>
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* -- 3-col: player A | center | player B -- */}
        <div style={{display:'grid', gridTemplateColumns:'1fr minmax(220px,280px) 1fr', gap:14}}>
          <PGPlayerCard player={playerA} side="left"  seasonStats={statsA} surfKey={surfKey} colorOther={colorB} delay={.15}/>

          {/* Center column */}
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {/* Edge battle */}
            <div className="pg-glass" style={{padding:'14px 16px', animation:'pg-up .4s .3s both'}}>
              <PGEdgeBattle edges={edges} pA={playerA} pB={playerB} colorA={colorA} colorB={colorB}/>
            </div>

            {/* H2H bar */}
            {h2h.total > 0 && (
              <div className="pg-glass" style={{padding:'14px 16px', animation:'pg-up .4s .55s both'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:7}}>
                  <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:colorA,lineHeight:1}}>{h2h.wA}</span>
                  <div className="pg-label" style={{textAlign:'center'}}>H2H — {h2h.total} PARTIDAS</div>
                  <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:colorB,lineHeight:1}}>{h2h.wB}</span>
                </div>
                <div className="pg-bar-track" style={{height:6,marginBottom:5}}>
                  <div className="pg-bar-a" style={{
                    width:`${pctA}%`,
                    background:`linear-gradient(90deg,${colorA},${colorA}88)`,
                    boxShadow:h2h.wA>h2h.wB?`0 0 10px ${colorA}55`:'none',
                  }}/>
                  <div className="pg-bar-b" style={{
                    background:`linear-gradient(90deg,${colorB}88,${colorB})`,
                    boxShadow:h2h.wB>h2h.wA?`0 0 10px ${colorB}55`:'none',
                  }}/>
                  <div className="pg-midline"/>
                </div>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:`${colorA}88`}}>{pctA}%</span>
                  <span style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:`${colorB}88`}}>{100-pctA}%</span>
                </div>
                <div style={{marginTop:12}}>
                  <PGH2HHistory h2h={h2h} pA={playerA} pB={playerB} colorA={colorA} colorB={colorB}/>
                </div>
              </div>
            )}

            {/* Style note */}
            <div className="pg-glass" style={{padding:'12px 16px', animation:'pg-up .4s .7s both'}}>
              <div className="pg-label" style={{marginBottom:7}}>CHOQUE DE ESTILOS</div>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:8,
                  color:styA.color,letterSpacing:'.07em',fontWeight:700}}>{styA.icon} {styA.label}</span>
                <div style={{flex:1,height:1,background:'rgba(255,255,255,.08)'}}/>
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:8,
                  color:styB.color,letterSpacing:'.07em',fontWeight:700}}>{styB.icon} {styB.label}</span>
              </div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontStyle:'italic',
                fontSize:12,color:'rgba(255,255,255,.45)',lineHeight:1.45,textAlign:'center'}}>
                {matchNote}
              </div>
            </div>
          </div>

          <PGPlayerCard player={playerB} side="right" seasonStats={statsB} surfKey={surfKey} colorOther={colorA} delay={.22}/>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1fr .95fr', gap:14}}>
          <div className="pg-glass" style={{padding:'16px 18px', animation:'pg-up .45s .78s both'}}>
            <div className="pg-label" style={{marginBottom:10}}>DUELO DE ATRIBUTOS</div>
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
              {(duelRows.length ? duelRows : [{
                id:'fallback',
                a:50, b:50, color:'#888', label:'LEITURA BASE', note:'amostra inicial', leader:'EVEN',
              }]).map((row, idx) => {
                const total = Math.max(1, row.a + row.b);
                const pctA = Math.round((row.a / total) * 100);
                const pctB = 100 - pctA;
                const leftStrong = row.leader === 'A';
                const rightStrong = row.leader === 'B';
                return (
                  <div key={row.id} style={{
                    padding:'10px 12px',
                    background:'rgba(255,255,255,.02)',
                    border:'1px solid rgba(255,255,255,.05)',
                  }}>
                    <div style={{display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:10, alignItems:'center'}}>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:24, color:leftStrong ? colorA : 'rgba(255,255,255,.85)', lineHeight:1}}>{row.a}</div>
                      <div style={{textAlign:'center'}}>
                        <div style={{fontFamily:"'Space Mono',monospace", fontSize:7.5, color:row.color, letterSpacing:'.18em'}}>{row.label}</div>
                        <div style={{fontFamily:"'Space Mono',monospace", fontSize:6.5, color:'rgba(255,255,255,.22)', letterSpacing:'.12em', marginTop:2}}>{row.note}</div>
                      </div>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:24, color:rightStrong ? colorB : 'rgba(255,255,255,.85)', lineHeight:1, textAlign:'right'}}>{row.b}</div>
                    </div>
                    <div className="pg-bar-track" style={{height:5, marginTop:8}}>
                      <div className="pg-bar-a" style={{width:`${pctA}%`, background:leftStrong ? `linear-gradient(90deg,${colorA},${colorA}99)` : 'rgba(255,255,255,.1)'}} />
                      <div className="pg-bar-b" style={{background:rightStrong ? `linear-gradient(90deg,${colorB}99,${colorB})` : 'rgba(255,255,255,.07)'}} />
                      <div className="pg-midline"/>
                    </div>
                    <div style={{display:'flex', justifyContent:'space-between', marginTop:5}}>
                      <span style={{fontFamily:"'Space Mono',monospace", fontSize:7, color:'rgba(255,255,255,.26)'}}>{pctA}%</span>
                      <span style={{fontFamily:"'Space Mono',monospace", fontSize:7, color:'rgba(255,255,255,.26)'}}>{pctB}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pg-glass" style={{padding:'16px 18px', animation:'pg-up .45s .86s both'}}>
            <div className="pg-label" style={{marginBottom:10}}>INDICADORES-CHAVE</div>
            <div style={{display:'flex', flexDirection:'column', gap:8}}>
              {(metricRows.length ? metricRows : [{
                label:'Contexto',
                a:'--',
                b:'--',
                invert:false,
                fmt:(value)=>`${value}`,
              }]).map((row) => {
                const aWins = row.invert ? row.a < row.b : row.a > row.b;
                const bWins = row.invert ? row.b < row.a : row.b > row.a;
                return (
                  <div key={row.label} style={{
                    display:'grid',
                    gridTemplateColumns:'1fr auto 1fr',
                    gap:10,
                    alignItems:'center',
                    padding:'10px 12px',
                    background:'rgba(255,255,255,.02)',
                    border:'1px solid rgba(255,255,255,.05)',
                  }}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:24, color:aWins ? colorA : 'rgba(255,255,255,.82)', lineHeight:1}}>
                      {row.fmt(row.a)}
                    </div>
                    <div style={{fontFamily:"'Space Mono',monospace", fontSize:7, color:'rgba(255,255,255,.32)', letterSpacing:'.16em', textTransform:'uppercase', textAlign:'center'}}>
                      {row.label}
                    </div>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:24, color:bWins ? colorB : 'rgba(255,255,255,.82)', lineHeight:1, textAlign:'right'}}>
                      {row.fmt(row.b)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14}}>
          {[
            { player: playerA, color: colorA, title: 'IDENTIDADE DO LADO A', traits: traitA, perceptions: percA },
            { player: playerB, color: colorB, title: 'IDENTIDADE DO LADO B', traits: traitB, perceptions: percB },
          ].map((side, idx) => (
            <div key={side.title} className="pg-glass" style={{padding:'16px 18px', animation:`pg-up .45s ${0.94 + idx * 0.06}s both`}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
                <div className="pg-label">{side.title}</div>
                <div style={{fontFamily:"'Space Mono',monospace", fontSize:8, color:side.color, letterSpacing:'.12em'}}>
                  {pgLastName(side.player).toUpperCase()}
                </div>
              </div>

              <div style={{marginBottom:12}}>
                <div style={{fontFamily:"'Space Mono',monospace", fontSize:7, color:'rgba(255,255,255,.24)', letterSpacing:'.16em', marginBottom:7}}>TRAITS</div>
                <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
                  {(side.traits.length ? side.traits : ['Sem traits destacados']).map((item) => (
                    <span key={item} style={{
                      fontFamily:"'Barlow Condensed',sans-serif",
                      fontSize:12,
                      color:'#FFF',
                      padding:'4px 8px',
                      background:'rgba(255,255,255,.03)',
                      border:`1px solid ${side.color}22`,
                    }}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div style={{fontFamily:"'Space Mono',monospace", fontSize:7, color:'rgba(255,255,255,.24)', letterSpacing:'.16em', marginBottom:7}}>PERCEPÇÕES DO CIRCUITO</div>
                <div style={{display:'flex', flexDirection:'column', gap:7}}>
                  {(side.perceptions.length ? side.perceptions : [{ claim:'Mercado ainda sem consenso consolidado', confidence:null, status:'EM ABERTO' }]).map((item, perceptionIdx) => (
                    <div key={`${item.claim}-${perceptionIdx}`} style={{
                      padding:'9px 10px',
                      background:'rgba(255,255,255,.02)',
                      border:'1px solid rgba(255,255,255,.05)',
                    }}>
                      <div style={{display:'flex', justifyContent:'space-between', gap:10}}>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:12.5, color:'rgba(255,255,255,.82)'}}>{item.claim}</div>
                        <div style={{fontFamily:"'Space Mono',monospace", fontSize:7, color:side.color, letterSpacing:'.12em'}}>
                          {item.confidence != null ? `${item.confidence}%` : item.status}
                        </div>
                      </div>
                      {item.status && item.confidence != null && (
                        <div style={{fontFamily:"'Space Mono',monospace", fontSize:6.5, color:'rgba(255,255,255,.24)', letterSpacing:'.14em', marginTop:4}}>
                          {item.status}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {identityDuel && (
          <div className="pg-glass" style={{padding:'16px 18px', animation:'pg-up .45s 1.02s both'}}>
            <div className="pg-label" style={{marginBottom:10}}>DNA COMPETITIVO</div>
            <div style={{display:'grid', gridTemplateColumns:'1fr .9fr 1fr', gap:14}}>
              {[identityDuel.a, identityDuel.b].map((identity, idx) => (
                <div key={identity.player?.id ?? idx} style={{display:'flex', flexDirection:'column', gap:10}}>
                  <div style={{padding:'12px 13px', background:'rgba(255,255,255,.02)', border:`1px solid ${(idx === 0 ? colorA : colorB)}22`}}>
                    <div style={{display:'flex', justifyContent:'space-between', gap:10, alignItems:'center'}}>
                      <div>
                        <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:24, color:idx === 0 ? colorA : colorB, lineHeight:1}}>
                          {identity.signature.headline}
                        </div>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:12.5, color:'rgba(255,255,255,.62)', lineHeight:1.45, marginTop:5}}>
                          {identity.signature.subline}
                        </div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontFamily:"'Space Mono',monospace", fontSize:7, color:'rgba(255,255,255,.24)', letterSpacing:'.14em'}}>MOOD</div>
                        <div style={{fontFamily:"'Space Mono',monospace", fontSize:8, color:idx === 0 ? colorA : colorB, letterSpacing:'.12em', marginTop:4}}>
                          {identity.signature.moodTag}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
                    {[
                      ['Reputação', identity.personality.reputation.label],
                      ['Forma', identity.form.state],
                      ['Superfície', identity.surface.label],
                      ['Traço dominante', identity.dna.dominantTrait?.name ?? 'Sem trait dominante'],
                    ].map(([label, value]) => (
                      <div key={label} style={{padding:'10px 11px', background:'rgba(255,255,255,.018)', border:'1px solid rgba(255,255,255,.06)'}}>
                        <div style={{fontFamily:"'Space Mono',monospace", fontSize:6.5, color:'rgba(255,255,255,.28)', letterSpacing:'.2em', textTransform:'uppercase', marginBottom:4}}>{label}</div>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:12.5, color:'#FFF', lineHeight:1.35}}>{value}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{padding:'11px 12px', background:'rgba(255,255,255,.018)', border:'1px solid rgba(255,255,255,.06)'}}>
                    <div style={{fontFamily:"'Space Mono',monospace", fontSize:6.5, color:'rgba(255,255,255,.28)', letterSpacing:'.2em', textTransform:'uppercase', marginBottom:6}}>Leitura pública</div>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:12.5, color:'rgba(255,255,255,.74)', lineHeight:1.5}}>
                      {identity.reputation.consensus ?? 'Circuito ainda sem consenso claro.'}
                    </div>
                  </div>

                  <div style={{padding:'11px 12px', background:'rgba(255,255,255,.018)', border:'1px solid rgba(255,255,255,.06)'}}>
                    <div style={{fontFamily:"'Space Mono',monospace", fontSize:6.5, color:'rgba(255,255,255,.28)', letterSpacing:'.2em', textTransform:'uppercase', marginBottom:6}}>Contradicao central</div>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:12.5, color:'rgba(255,255,255,.74)', lineHeight:1.5}}>
                      {identity.contradictions?.[0]?.summary ?? 'Retrato mais linear: sem paradoxo dominante antes da partida.'}
                    </div>
                  </div>
                </div>
              ))}

              <div style={{display:'flex', flexDirection:'column', gap:10}}>
                <div style={{padding:'12px 13px', background:'rgba(255,255,255,.018)', border:'1px solid rgba(255,255,255,.06)'}}>
                  <div style={{fontFamily:"'Space Mono',monospace", fontSize:7, color:surf.color, letterSpacing:'.22em', textTransform:'uppercase', marginBottom:8}}>Contraste central</div>
                  <div style={{display:'grid', gap:8}}>
                    {[
                      ['tempo', identityDuel.contrast.tempo],
                      ['risco', identityDuel.contrast.risk],
                      ['persona', identityDuel.contrast.persona],
                      ['mood', identityDuel.contrast.mood],
                      ['paradoxo', identityDuel.contrast.paradox],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <div style={{fontFamily:"'Space Mono',monospace", fontSize:6.5, color:'rgba(255,255,255,.24)', letterSpacing:'.18em', textTransform:'uppercase', marginBottom:3}}>{label}</div>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:12.5, color:'#FFF', lineHeight:1.4}}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{padding:'12px 13px', background:'rgba(255,255,255,.018)', border:'1px solid rgba(255,255,255,.06)'}}>
                  <div style={{fontFamily:"'Space Mono',monospace", fontSize:7, color:surf.color, letterSpacing:'.22em', textTransform:'uppercase', marginBottom:8}}>Forças e rachaduras</div>
                  <div style={{display:'grid', gap:8}}>
                    {[
                      `${identityDuel.a.firstName}: ${identityDuel.a.dna.strengths[0]?.label ?? 'base sólida'} / fraqueza: ${identityDuel.a.dna.weaknesses[0]?.label ?? 'sem ponto cego gritante'}`,
                      `${identityDuel.b.firstName}: ${identityDuel.b.dna.strengths[0]?.label ?? 'base sólida'} / fraqueza: ${identityDuel.b.dna.weaknesses[0]?.label ?? 'sem ponto cego gritante'}`,
                    ].map((line, idx) => (
                      <div key={idx} style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:12.5, color:'rgba(255,255,255,.74)', lineHeight:1.5}}>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* -- CTA -- */}
        <div style={{
          display:'flex', flexDirection:'column', alignItems:'center', gap:11,
          paddingTop:8, animation:'pg-up .5s 1s both',
        }}>
          <button className="pg-cta-main" onClick={onStart}>? PARTIDA COMPLETA</button>
          <div style={{display:'flex',gap:10}}>
            {onSimHighlights && (
              <button className="pg-cta-sec" onClick={onSimHighlights}
                style={{
                  border:'1px solid rgba(100,180,255,.3)',color:'rgba(100,180,255,.75)',
                  background:'rgba(100,180,255,.06)',
                }}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(100,180,255,.13)';e.currentTarget.style.color='#64B4FF';}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(100,180,255,.06)';e.currentTarget.style.color='rgba(100,180,255,.75)';}}>
                🎬 SIMULAR + HIGHLIGHTS
              </button>
            )}
            {onStartHighlights && (
              <button className="pg-cta-sec" onClick={onStartHighlights}
                style={{
                  border:'1px solid rgba(255,215,0,.28)',color:'rgba(255,215,0,.75)',
                  background:'rgba(255,215,0,.05)',
                }}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,215,0,.14)';e.currentTarget.style.color='#FFD700';}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,215,0,.05)';e.currentTarget.style.color='rgba(255,215,0,.75)';}}>
                ? S— OS HIGHLIGHTS
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function pgTopSeven(player) {
  const attrs = player?.attrs ?? {};
  const seen = new Set();
  return ATTR_CATEGORIES.flatMap((category) => category.attrs.map((attr) => ({
    ...attr,
    category: category.label,
    color: category.color,
    value: Number(attrs[attr.key] ?? 0),
  })))
    .filter((attr) => attr.value > 0 && !seen.has(attr.key) && seen.add(attr.key))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);
}

function pgWeaponReading(weapon, opponent) {
  const rivalValue = Number(opponent?.attrs?.[weapon.key] ?? 0);
  const gap = weapon.value - rivalValue;
  if (weapon.value >= 92 && gap >= 8) return `arma de elite e vantagem clara de ${gap} pontos`;
  if (gap >= 6) return `uma das rotas mais limpas para ferir o rival (+${gap})`;
  if (gap <= -6) return `ponto forte, mas o rival responde ainda melhor (${Math.abs(gap)} acima)`;
  if (weapon.value >= 88) return 'nível de elite; os dois possuem resposta forte neste setor';
  return 'força confiável, com diferença pequena no confronto direto';
}

function PGNowPlayer({ player, opponent, stats, surfKey, color, side }) {
  const style = PG_STYLE[player.styleId] ?? { label:player.styleId ?? 'Sem estilo', color };
  const ovr = overallRating(player.attrs ?? {});
  const surface = pgSurfaceRecord(player, surfKey);
  const seasonPct = pgSafePct(stats.wins, stats.wins + stats.losses);
  const form = player.formPoints ?? 0;
  const formLabel = form >= 12 ? 'EM ALTA' : form <= -12 ? 'EM BAIXA' : form >= 4 ? 'BOM MOMENTO' : form <= -4 ? 'OSCILANDO' : 'ESTÁVEL';
  const top = pgTopSeven(player)[0];
  return (
    <div className={`pg-glass pg-player-now ${side === 'right' ? 'right' : ''}`} style={{borderTop:`2px solid ${color}`}}>
      <div style={{position:'absolute',inset:0,pointerEvents:'none',background:`radial-gradient(circle at ${side==='right'?'100%':'0%'} 0%,${color}20,transparent 58%)`}}/>
      <PGPhoto player={player} size={92}/>
      <div style={{position:'relative',flex:1,minWidth:0}}>
        <div className="pg-label" style={{color,marginBottom:5}}>{side==='right'?'DESAFIANTE':'LADO DO QUADRO'} · #{player.rankPosition ?? '—'}</div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'clamp(32px,4vw,52px)',letterSpacing:'.045em',lineHeight:.92,color:'#fff'}}>{pgLastName(player).toUpperCase()}</div>
        <div style={{fontSize:12,color:'rgba(255,255,255,.48)',letterSpacing:'.08em',marginTop:7}}>{style.label} · {player.age ?? '—'} ANOS · NÍVEL {ovr}</div>
        <div className="pg-kpi-row" style={{marginTop:16}}>
          {[
            ['ANO',`${stats.wins}-${stats.losses}`],
            ['APROV.',seasonPct == null?'—':`${seasonPct}%`],
            [PG_SURF[surfKey]?.label?.toUpperCase() ?? 'PISO',surface.pct == null?'—':`${surface.pct}%`],
            ['FORMA',formLabel],
          ].map(([label,value]) => <div key={label} style={{padding:'8px 6px',background:'rgba(255,255,255,.025)',border:'1px solid rgba(255,255,255,.055)'}}>
            <div className="pg-label" style={{fontSize:6.5}}>{label}</div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:value.length>8?14:20,color:value===formLabel?color:'#fff',marginTop:3,lineHeight:1}}>{value}</div>
          </div>)}
        </div>
        {top && <div style={{fontSize:11.5,color:'rgba(255,255,255,.62)',marginTop:11,lineHeight:1.4}}>
          Arma máxima: <span style={{color:top.color,fontWeight:700}}>{top.label} {top.value}</span>. {pgWeaponReading(top, opponent)}.
        </div>}
      </div>
    </div>
  );
}

function PGH2HCore({ h2h, colorA, colorB, nameA, nameB }) {
  const pct = h2h.total ? Math.round(h2h.wA / h2h.total * 100) : 50;
  const circumference = 2 * Math.PI * 54;
  return (
    <div className="pg-glass" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:16,position:'relative',overflow:'hidden'}}>
      <div className="pg-label" style={{marginBottom:7}}>HEAD TO HEAD</div>
      <svg width="142" height="142" viewBox="0 0 142 142" aria-label={`Head to head ${h2h.wA} a ${h2h.wB}`}>
        <circle cx="71" cy="71" r="54" fill="none" stroke={colorB} strokeWidth="10" opacity=".8"/>
        <circle cx="71" cy="71" r="54" fill="none" stroke={colorA} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${circumference * pct / 100} ${circumference}`} transform="rotate(-90 71 71)"/>
        <text x="71" y="65" textAnchor="middle" fill="#fff" fontFamily="Bebas Neue" fontSize="32">{h2h.wA}—{h2h.wB}</text>
        <text x="71" y="84" textAnchor="middle" fill="rgba(255,255,255,.35)" fontFamily="Space Mono" fontSize="7">{h2h.total ? `${h2h.total} ENCONTROS` : 'PRIMEIRO ENCONTRO'}</text>
      </svg>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18,width:'100%',fontFamily:"'Space Mono',monospace",fontSize:7,letterSpacing:'.08em'}}>
        <span style={{color:colorA,textAlign:'right'}}>{nameA.toUpperCase()} {pct}%</span>
        <span style={{color:colorB}}>{100-pct}% {nameB.toUpperCase()}</span>
      </div>
    </div>
  );
}

function PGRadarDuel({ rows, playerA, playerB, colorA, colorB }) {
  const data = (rows ?? []).slice(0, 6);
  const center = 130, radius = 92;
  const point = (index, value) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / Math.max(1, data.length);
    const r = radius * Math.max(.15, Math.min(1, Number(value ?? 0) / 100));
    return `${center + Math.cos(angle)*r},${center + Math.sin(angle)*r}`;
  };
  const ring = (scale) => data.map((_,i)=>point(i,scale*100)).join(' ');
  return (
    <div className="pg-radar-wrap">
      <svg viewBox="0 0 260 260" style={{width:'100%',maxWidth:270,margin:'0 auto',overflow:'visible'}}>
        {[.25,.5,.75,1].map(scale=><polygon key={scale} points={ring(scale)} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="1"/>)}
        {data.map((_,i)=><line key={i} x1={center} y1={center} x2={point(i,100).split(',')[0]} y2={point(i,100).split(',')[1]} stroke="rgba(255,255,255,.07)"/>)}
        <polygon points={data.map((row,i)=>point(i,row.a)).join(' ')} fill={`${colorA}25`} stroke={colorA} strokeWidth="2"/>
        <polygon points={data.map((row,i)=>point(i,row.b)).join(' ')} fill={`${colorB}20`} stroke={colorB} strokeWidth="2"/>
        {data.map((row,i)=>{const [x,y]=point(i,114).split(',').map(Number);return <text key={row.id} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,.5)" fontFamily="Space Mono" fontSize="7">{row.label}</text>;})}
      </svg>
      <div>
        <div className="pg-label" style={{marginBottom:12}}>MAPA DO CONFRONTO</div>
        {data.map((row) => {
          const lead = row.leader==='A' ? playerA : row.leader==='B' ? playerB : null;
          const c = row.leader==='A' ? colorA : row.leader==='B' ? colorB : 'rgba(255,255,255,.55)';
          return <div key={row.id} style={{display:'grid',gridTemplateColumns:'44px 1fr 44px',gap:9,alignItems:'center',marginBottom:9}}>
            <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:row.leader==='A'?colorA:'#fff'}}>{row.a}</span>
            <div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:'rgba(255,255,255,.42)',letterSpacing:'.09em'}}><span>{row.label}</span><span style={{color:c}}>{lead ? `${pgLastName(lead)} +${Math.abs(row.diff)}` : 'EQUILÍBRIO'}</span></div>
              <div style={{height:4,display:'flex',marginTop:4,background:'rgba(255,255,255,.05)'}}><div style={{width:`${row.a/(row.a+row.b)*100}%`,background:colorA}}/><div style={{flex:1,background:colorB}}/></div>
            </div>
            <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:row.leader==='B'?colorB:'#fff',textAlign:'right'}}>{row.b}</span>
          </div>;
        })}
        <div style={{display:'flex',gap:16,marginTop:12,fontSize:10,color:'rgba(255,255,255,.42)'}}><span><b style={{color:colorA}}>●</b> {pgLastName(playerA)}</span><span><b style={{color:colorB}}>●</b> {pgLastName(playerB)}</span></div>
      </div>
    </div>
  );
}

function PGSevenWeapons({ player, opponent, color }) {
  const weapons = pgTopSeven(player);
  return <div style={{padding:'15px 16px',background:'rgba(255,255,255,.018)',border:`1px solid ${color}25`}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:12}}><div className="pg-label">7 ARMAS DE {pgLastName(player).toUpperCase()}</div><span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,color}}>{weapons[0]?.value ?? '—'}</span></div>
    {weapons.map((weapon,index) => {
      const rival = Number(opponent?.attrs?.[weapon.key] ?? 0);
      const gap = weapon.value-rival;
      return <div key={weapon.key} style={{display:'grid',gridTemplateColumns:'20px 96px 1fr 32px',gap:8,alignItems:'center',marginBottom:8}} title={weapon.note}>
        <span style={{fontFamily:"'Space Mono',monospace",fontSize:7,color:'rgba(255,255,255,.25)'}}>0{index+1}</span>
        <span style={{fontSize:11.5,color:index===0?'#fff':'rgba(255,255,255,.7)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{weapon.label}</span>
        <div style={{height:5,background:'rgba(255,255,255,.055)',position:'relative'}}><div style={{height:'100%',width:`${weapon.value}%`,background:`linear-gradient(90deg,${weapon.color},${color})`}}/></div>
        <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:weapon.color,textAlign:'right'}}>{weapon.value}</span>
        <span/><span style={{gridColumn:'2 / 5',fontSize:9.5,color:gap>=6?color:'rgba(255,255,255,.32)',marginTop:-5}}>{pgWeaponReading(weapon,opponent)}</span>
      </div>;
    })}
  </div>;
}

function PGRecentPast({ h2h, playerA, playerB, colorA, colorB }) {
  const matches = h2h.lastMatches ?? [];
  if (!matches.length) return <div style={{padding:'22px',color:'rgba(255,255,255,.45)',fontStyle:'italic'}}>Não existe passado entre eles. Hoje começa a história.</div>;
  return <div className="pg-past-strip">{matches.slice(0,6).map((match,index)=>{
    const aWon=match.winnerId===playerA.id; const winner=aWon?playerA:playerB; const color=aWon?colorA:colorB;
    return <div key={`${match.year}-${match.tourName}-${index}`} style={{padding:'11px 10px',background:`${color}09`,border:`1px solid ${color}25`,borderTop:`2px solid ${color}`}}>
      <div className="pg-label" style={{fontSize:6.5}}>{index===0?'ÚLTIMO':'ANTES'} · {match.year ?? '—'}</div>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:19,color,marginTop:6,lineHeight:1}}>{pgLastName(winner)}</div>
      <div style={{fontSize:10,color:'rgba(255,255,255,.48)',marginTop:5,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{match.tourName ?? 'Torneio'}</div>
      <div style={{fontFamily:"'Space Mono',monospace",fontSize:7,color:'rgba(255,255,255,.25)',marginTop:4}}>{PG_ROUND[match.roundIdx] ?? PG_CAT[match.cat]?.label ?? 'CONFRONTO'}</div>
    </div>;
  })}</div>;
}

function PreGameAnalysis({ preGamePending, universeState, onStart, onStartHighlights, onSimHighlights, onSkip }) {
  React.useEffect(() => { injectPreGameCSS(); }, []);
  const { playerA, playerB, tournament, roundIdx, bestOf } = preGamePending ?? {};
  if (!playerA || !playerB) return <div className="pg-screen" style={{display:'grid',placeItems:'center'}}><button className="pg-skip" onClick={onSkip}>VOLTAR</button></div>;
  const year = universeState?.year ?? 2025;
  const hist = {...(universeState?.historicalTournamentResults ?? {}),...(universeState?.tournamentResults ?? {})};
  const surfKey=pgSurfKey(tournament?.courtKey), surf=PG_SURF[surfKey] ?? PG_SURF.HARD;
  const catCfg=PG_CAT[tournament?.category] ?? {label:tournament?.category ?? 'Torneio',color:'#aaa',icon:'●'};
  const roundLbl=PG_ROUND[roundIdx] ?? (roundIdx!=null?`R${roundIdx+1}`:'Partida');
  const statsA=pgSeasonStats(playerA.id,hist,year), statsB=pgSeasonStats(playerB.id,hist,year);
  const h2h=pgH2H(playerA.id,playerB.id,universeState?.rivalrySystem,hist);
  const rows=pgCategoryDuelRows(playerA,playerB);
  const edges=computeEdges(playerA,playerB,surfKey);
  const styleA=PG_STYLE[playerA.styleId] ?? {color:'#C4572A'}, styleB=PG_STYLE[playerB.styleId] ?? {color:'#4A90D9'};
  const colorA=playerA.color ?? styleA.color, colorB=playerB.color ?? styleB.color;
  const narrative=pgNarrative(playerA,playerB,h2h,surfKey,tournament);
  const matchup=pgMatchupNote(playerA.styleId,playerB.styleId);
  const decisive=edges.filter(e=>e.edge!=='EVEN').sort((a,b)=>Math.abs(b.sA-b.sB)-Math.abs(a.sA-a.sB)).slice(0,2);
  const rivalry=h2h.rivalry, rivalryCfg=rivalry ? (PG_RIVALRY[rivalry.type] ?? PG_RIVALRY.CLASSIC) : null;
  return <div className="pg-screen">
    <div className="pg-scan-line"/>
    <div style={{position:'sticky',top:0,zIndex:20,height:44,padding:'0 24px',display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(2,4,10,.96)',borderBottom:`1px solid ${surf.color}35`,backdropFilter:'blur(14px)'}}>
      <div className="pg-label" style={{color:'rgba(255,255,255,.5)'}}>DOSSIÊ H2H · {catCfg.label} · {surf.label} · {roundLbl}</div><button className="pg-skip" onClick={onSkip}>FECHAR</button>
    </div>
    <main className="pg-dossier">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'end',gap:16,marginBottom:14}}>
        <div><div className="pg-label" style={{color:catCfg.color,marginBottom:5}}>{tournament?.name ?? 'Torneio'} · TEMPORADA {year}</div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'clamp(30px,4vw,48px)',letterSpacing:'.06em',lineHeight:1}}>O PASSADO ENCONTRA O AGORA</div></div>
        {rivalryCfg && <div style={{padding:'7px 11px',border:`1px solid ${rivalryCfg.color}45`,color:rivalryCfg.color,fontFamily:"'Space Mono',monospace",fontSize:8,letterSpacing:'.12em'}}>{rivalryCfg.label.toUpperCase()}</div>}
      </div>
      <section className="pg-dossier-hero">
        <PGNowPlayer player={playerA} opponent={playerB} stats={statsA} surfKey={surfKey} color={colorA} side="left"/>
        <PGH2HCore h2h={h2h} colorA={colorA} colorB={colorB} nameA={pgLastName(playerA)} nameB={pgLastName(playerB)}/>
        <PGNowPlayer player={playerB} opponent={playerA} stats={statsB} surfKey={surfKey} color={colorB} side="right"/>
      </section>
      <section className="pg-glass" style={{marginTop:12,padding:'15px 18px',borderLeft:`3px solid ${surf.color}`}}>
        <div className="pg-label" style={{marginBottom:6}}>LEITURA EM UMA FRASE</div><div style={{fontSize:15.5,fontStyle:'italic',color:'rgba(255,255,255,.72)',lineHeight:1.55}}>{narrative}</div>
      </section>
      <section className="pg-dossier-grid">
        <div className="pg-glass" style={{padding:'18px'}}><PGRadarDuel rows={rows} playerA={playerA} playerB={playerB} colorA={colorA} colorB={colorB}/></div>
        <div className="pg-glass" style={{padding:'18px'}}>
          <div className="pg-label" style={{marginBottom:12}}>COMO ESTE JOGO PODE SER DECIDIDO</div>
          <div style={{fontSize:14,color:'#fff',lineHeight:1.45,marginBottom:13}}>{matchup}</div>
          {decisive.map((edge,index)=>{const leader=edge.edge==='A'?playerA:playerB;const color=edge.edge==='A'?colorA:colorB;return <div key={edge.key} style={{padding:'11px 12px',marginBottom:8,background:`${color}09`,borderLeft:`2px solid ${color}`}}><div className="pg-label" style={{color}}>CHAVE {index+1} · {edge.label}</div><div style={{fontSize:12.5,color:'rgba(255,255,255,.7)',marginTop:5}}>{pgLastName(leader)} chega com a vantagem mais nítida deste setor. É uma rota provável para tomar o controle.</div></div>;})}
          <div style={{padding:'11px 12px',background:'rgba(255,255,255,.025)',border:'1px solid rgba(255,255,255,.06)'}}><div className="pg-label">PRESENTE</div><div style={{fontSize:12.5,color:'rgba(255,255,255,.62)',marginTop:5}}>Forma recente: <PGFormDots player={playerA} count={6}/> <span style={{display:'inline-block',width:10}}/> <PGFormDots player={playerB} count={6}/></div></div>
        </div>
      </section>
      <section className="pg-glass" style={{marginTop:12,padding:'18px'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:12}}><div className="pg-label">PASSADO RECENTE · ÚLTIMOS CAPÍTULOS</div><span style={{fontSize:11,color:'rgba(255,255,255,.34)'}}>quem venceu, onde e quando</span></div><PGRecentPast h2h={h2h} playerA={playerA} playerB={playerB} colorA={colorA} colorB={colorB}/></section>
      <section className="pg-glass" style={{marginTop:12,padding:'18px'}}><div style={{marginBottom:13}}><div className="pg-label">ARSENAL COMPARADO</div><div style={{fontSize:12,color:'rgba(255,255,255,.42)',marginTop:5}}>Os sete atributos mais fortes de cada jogador, lidos contra a mesma habilidade do adversário.</div></div><div className="pg-weapon-grid"><PGSevenWeapons player={playerA} opponent={playerB} color={colorA}/><PGSevenWeapons player={playerB} opponent={playerA} color={colorB}/></div></section>
      <section style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10,paddingTop:22}}>
        <button className="pg-cta-main" onClick={onStart}>VER PARTIDA COMPLETA</button>
        <div style={{display:'flex',gap:9,flexWrap:'wrap',justifyContent:'center'}}>
          {onSimHighlights && <button className="pg-cta-sec" onClick={onSimHighlights} style={{border:'1px solid rgba(100,180,255,.32)',color:'#64B4FF',background:'rgba(100,180,255,.06)'}}>SIMULAR + HIGHLIGHTS</button>}
          {onStartHighlights && <button className="pg-cta-sec" onClick={onStartHighlights} style={{border:'1px solid rgba(255,215,0,.3)',color:'#FFD700',background:'rgba(255,215,0,.05)'}}>SÓ OS HIGHLIGHTS</button>}
        </div>
      </section>
    </main>
  </div>;
}

function buildHighlightsSuspenseLabel(gs, context) {
  if (!context) return null;
  if (context.isMatchPoint) {
    return {
      text: 'CLÍMAX',
      color: '#FF6B6B',
      tone: 'definição máxima',
      subline: gs?.inTiebreak ? 'Tie-break em ponto crítico' : 'A partida entrou em zona de definição',
      intensity: 'EXPLOSÃO',
    };
  }
  if (context.isSetPoint) {
    return {
      text: 'FIM DE SET',
      color: '#FFD166',
      tone: 'set sob tensão',
      subline: gs?.inTiebreak ? 'Tie-break em aberto' : 'O set está em ponto delicado',
      intensity: 'PRESSÃO',
    };
  }
  if (context.isBreakPoint) {
    return {
      text: 'PRESSÃO',
      color: '#FF9F43',
      tone: 'devolução ameaçando',
      subline: 'Game sob forte pressão na devolução',
      intensity: 'SUBINDO',
    };
  }
  if (context.isGamePoint) {
    return {
      text: 'PONTO GRANDE',
      color: '#4ECDC4',
      tone: 'fechamento de game',
      subline: 'O game se aproxima de um desfecho importante',
      intensity: 'ESTÁVEL',
    };
  }
  return null;
}

function buildHighlightsPulseMessage(snap, latestFeed = null) {
  if (latestFeed?.label?.subline) return latestFeed.label.subline;
  if (!snap) return 'Lendo o ritmo da partida';
  if (snap.inTiebreak) return 'Tie-break em andamento';
  const p0 = snap.players?.[0];
  const p1 = snap.players?.[1];
  if (!p0 || !p1) return 'Transmissão ao vivo';
  const gameGap = Math.abs((p0.games ?? 0) - (p1.games ?? 0));
  const pointGap = Math.abs((p0.score ?? 0) - (p1.score ?? 0));
  if (pointGap === 0 && (p0.score ?? 0) >= 2 && (p1.score ?? 0) >= 2) return 'Game em tensão máxima';
  if (gameGap === 0 && (p0.games ?? 0) >= 4 && (p1.games ?? 0) >= 4) return 'Set em momento sensível';
  if (Math.max(p0.sets ?? 0, p1.sets ?? 0) > 0) return 'A partida ganhou temperatura';
  return 'Transmissão ao vivo';
}

// -------------------------------------------------------------------
// SEASON PLANNING — gera planos anuais para todos os jogadores NPC
// -------------------------------------------------------------------

/**
 * Gera o mapa de season counts zerados para todos os jogadores.
 * Rastreia quantos ATP 250 e 500 cada um j— jogou na temporada.
 */
function buildSeasonSlots(tourPlayers) {
  const slots = {};
  for (const player of tourPlayers) {
    slots[player.id] = createSeasonSlots();
  }
  return slots;
}

// -------------------------------------------------------------------
// RECORDS STORE — stats acumuladas por jogador, independente do hist—rico
// Atualizado incrementalmente a cada torneio conclu—do.
// Nunca — apagado — sobrevive ao trimming do historicalTournamentResults.
// -------------------------------------------------------------------

const GS_IDS_SET = new Set(['B1_GS_MERIDIAN','B2_GS_TERRA','B3_GS_HIGHLAND','B4_GS_URBAN','B5_GS_VELVET','B6_GS_CRYSTAL']);

/** Retorna (criando se necess—rio) o objeto de stats de um jogador no store. */
function _rsGet(store, id) {
  if (!store.playerStats[id]) {
    store.playerStats[id] = {
      id,
      // identity snapshot — atualizado sempre que temos o player object
      name: null, nationality: null, age: null, color: null, styleId: null, photo: null,
      // t—tulos por categoria
      titles:0, gs:0, slam_clash:0, masters:0, atp500:0, atp250:0, atp100:0,
      finals_titles:0, prospects_titles:0, prospects_finals_titles:0,
      // finais / semifinais
      finals:0, finalLosses:0, semifinals:0,
      gsFinalsWon:0, gsFinalsLost:0,
      // GS vencidos (array de IDs — para career grand slam)
      gsWonIds:[],
      // W/L / partidas
      wins:0, losses:0, matchesPlayed:0,
      surfWins:{HARD:0,CLAY:0,GRASS:0,STREET:0,CARPET:0,INDOOR:0},
      surfLosses:{HARD:0,CLAY:0,GRASS:0,STREET:0,CARPET:0,INDOOR:0},
      surfTitles:{HARD:0,CLAY:0,GRASS:0,STREET:0,CARPET:0,INDOOR:0},
      // streaks
      winStreak:0, curStreak:0,
      // sets / bagels / tiebreaks
      bagels:0, doubleBagels:0, tiebreaksWon:0,
      setsWon:0, setsLost:0,
      // execu——o de golpe / saque
      aces:0, winners:0, doubleFaults:0, unforcedErrors:0,
      pointWinsByType:{},
      // temporadas com t—tulo (array de anos)
      titleYears:[],
      // idade nos t—tulos
      youngestChampAge:null, oldestChampAge:null,
      // pontos
      careerPts:0,
      // dados por temporada — mant—m —ltimas MAX_SEASON_DATA seasons
      seasonData:{},
    };
  }
  const s = store.playerStats[id];
  if (s.aces == null) s.aces = 0;
  if (s.winners == null) s.winners = 0;
  if (s.doubleFaults == null) s.doubleFaults = 0;
  if (s.unforcedErrors == null) s.unforcedErrors = 0;
  if (s.pointWinsByType == null) s.pointWinsByType = {};
  return store.playerStats[id];
}

const MAX_SEASON_DATA = 20; // guarda at— 20 temporadas de seasonData por jogador

const PERFORMANCE_STAT_FIELDS = [
  'aces', 'winners', 'doubleFaults', 'unforcedErrors', 'forcedErrors',
  'serve1In', 'serve1Total', 'serve1WonPoints', 'serve1LostPoints',
  'serve2In', 'serve2Total', 'serve2WonPoints', 'serve2LostPoints',
  'pointsWonServing', 'pointsLostServing', 'pointsWonReturning', 'pointsLostReturning',
  'gamesServed', 'gamesHeld', 'gamesReturned', 'gamesConverted',
  'breakPointsWon', 'breakPointsFaced', 'netApproaches', 'netPointsWon',
  'rallySum', 'rallyCount', 'rallyMax', 'longRallies',
  'qualitySum', 'qualityCount', 'attackShots', 'defenseShots',
  'attackPointsPlayed', 'attackPointsWon', 'defensePointsPlayed', 'defensePointsWon',
];

function _rsEmptyPerformance() {
  return {
    matchesWithStats: 0,
    byType: {},
    pointWinsByType: {},
    ...Object.fromEntries(PERFORMANCE_STAT_FIELDS.map(field => [field, 0])),
  };
}

function _rsEnsurePerformance(target) {
  if (!target.performance) target.performance = _rsEmptyPerformance();
  const performance = target.performance;
  for (const field of PERFORMANCE_STAT_FIELDS) {
    if (!Number.isFinite(performance[field])) performance[field] = 0;
  }
  if (!Number.isFinite(performance.matchesWithStats)) performance.matchesWithStats = 0;
  if (!performance.byType) performance.byType = {};
  if (!performance.pointWinsByType) performance.pointWinsByType = {};
  return performance;
}

/** Snapshot de identidade do jogador (para exibi——o mesmo após aposentadoria). */
function _rsSnap(s, player) {
  if (!player) return;
  s.name        = player.name;
  s.nationality = player.nationality;
  s.age         = player.age ?? s.age;
  s.color       = player.color ?? s.color;
  s.styleId     = player.styleId ?? s.styleId;
  s.photo       = player.photo   ?? s.photo;
}

function _rsSeasonData(s, yr) {
  if (!s.seasonData[yr]) {
    s.seasonData[yr] = {
      pts:0, titles:0, wins:0, matchesPlayed:0,
      aces:0, winners:0, doubleFaults:0, unforcedErrors:0,
      pointWinsByType:{}, surfaces:{}, performance:_rsEmptyPerformance(),
      entryRank:null, entryOverall:null,
    };
  }
  if (s.seasonData[yr].matchesPlayed == null) s.seasonData[yr].matchesPlayed = 0;
  if (s.seasonData[yr].aces == null) s.seasonData[yr].aces = 0;
  if (s.seasonData[yr].winners == null) s.seasonData[yr].winners = 0;
  if (s.seasonData[yr].doubleFaults == null) s.seasonData[yr].doubleFaults = 0;
  if (s.seasonData[yr].unforcedErrors == null) s.seasonData[yr].unforcedErrors = 0;
  if (s.seasonData[yr].pointWinsByType == null) s.seasonData[yr].pointWinsByType = {};
  if (s.seasonData[yr].surfaces == null) s.seasonData[yr].surfaces = {};
  _rsEnsurePerformance(s.seasonData[yr]);
  return s.seasonData[yr];
}

function _rsSurfaceData(season, surface) {
  const key = surface ?? 'HARD';
  if (!season.surfaces[key]) {
    season.surfaces[key] = {
      wins:0, losses:0, matchesPlayed:0, titles:0,
      performance:_rsEmptyPerformance(),
    };
  }
  _rsEnsurePerformance(season.surfaces[key]);
  return season.surfaces[key];
}

/**
 * Atualiza o recordsStore com um resultado de torneio.
 * Funciona tanto com formato full-bracket quanto slim.
 * @param {object} store  — recordsStore mut—vel (c—pia rasa j— feita pelo caller)
 * @param {object} result — resultado do torneio (bracket ou slim)
 * @param {number} year   — temporada do torneio
 * @param {object} playerMap — { [id]: player } para snapshots de identidade
 */
function updateRecordsStoreWithResult(store, result, year, playerMap) {
  const { tournament } = result;
  if (!tournament) return;
  const { category, surface, id: tid } = tournament;
  const surf = surface ?? 'HARD';

  const pm = playerMap ?? {};
  const snap = (s, id) => _rsSnap(s, pm[id]);
  const seasonFor = (s, id) => {
    const season = _rsSeasonData(s, year);
    const player = pm[id];
    if (season.entryRank == null) {
      season.entryRank = player?.rankPosition ?? player?.rank ?? null;
    }
    if (season.entryOverall == null && player?.attrs) {
      season.entryOverall = Math.round(overallRating(player.attrs));
    }
    return season;
  };

  // Uma memória curta, mas rica, das partidas que podem virar lenda no almanaque.
  // Não depende do bracket antigo, que é compactado ao fim da temporada.
  const rememberMatch = ({ winnerId, loserId, setsDetail, stats, roundIndex=0, heat=0, maxRally=0 }) => {
    if (!winnerId || !loserId) return;
    const score = (setsDetail ?? []).map(([a,b]) => `${a}-${b}`).join(' ');
    const key = `${year}:${tid}:${winnerId}:${loserId}:${score}`;
    const matches = Array.isArray(store.matchRecords) ? store.matchRecords : [];
    if (matches.some(m => m.key === key)) return;
    const a = stats?.a ?? {}, b = stats?.b ?? {};
    const totalGames = (setsDetail ?? []).reduce((sum, [x,y]) => sum + x + y, 0);
    matches.push({
      key, year, tournamentId:tid, tournamentName:tournament.name ?? 'Torneio',
      category, surface:surf, roundIndex, winnerId, loserId, score,
      totalGames, maxRally: maxRally ?? 0, heat: heat ?? 0,
      aces: Math.max(a.aces ?? 0, b.aces ?? 0),
      winners: Math.max(a.winners ?? 0, b.winners ?? 0),
      tiebreaks: (setsDetail ?? []).filter(([x,y]) => isTiebreakSetScore(x,y)).length,
    });
    // Preserva as mais relevantes e recentes; evita fazer o save crescer para sempre.
    store.matchRecords = matches.sort((x,y) => ((y.totalGames + y.maxRally + y.heat) - (x.totalGames + x.maxRally + x.heat)) || y.year - x.year).slice(0, 80);
  };

  // -- helper: processar um set result de uma partida ---------------
  function processSets(wId, lId, sd, winnerIsA) {
    if (!sd?.length) return;
    const ws = _rsGet(store, wId);
    const ls = lId ? _rsGet(store, lId) : null;
    const wBagels = sd.filter(([a,b]) => winnerIsA ? a===MATCH_RULES.gamesPerSet && b===0 : b===MATCH_RULES.gamesPerSet && a===0).length;
    const lBagels = sd.filter(([a,b]) => winnerIsA ? b===MATCH_RULES.gamesPerSet && a===0 : a===MATCH_RULES.gamesPerSet && b===0).length;
    ws.bagels += wBagels;
    if (wBagels >= 2) ws.doubleBagels++;
    if (ls) { ls.bagels += lBagels; }
    sd.forEach(([a,b]) => {
      const [wG,lG] = winnerIsA ? [a,b] : [b,a];
      ws.setsWon++;
      if (ls) { ls.setsLost++; if (lG > wG) ls.setsWon++; }
      if (isTiebreakSetScore(a, b)) ws.tiebreaksWon++;
    });
  }

  function processMatchStats(pAId, pBId, stats) {
    const accumulate = (id, raw) => {
      if (!id || !raw) return;
      const s = _rsGet(store, id);
      const season = seasonFor(s, id);
      const surface = _rsSurfaceData(season, surf);
      const seasonPerf = _rsEnsurePerformance(season);
      const surfacePerf = _rsEnsurePerformance(surface);
      seasonPerf.matchesWithStats++;
      surfacePerf.matchesWithStats++;

      // Headless e FastSimulation usam alguns nomes diferentes. O ledger normaliza
      // ambos para que a análise histórica seja comparável entre níveis de torneio.
      const normalized = {
        ...raw,
        serve1WonPoints: raw.serve1WonPoints ?? raw.serve1Won ?? 0,
        serve1LostPoints: raw.serve1LostPoints ?? Math.max(0, (raw.serve1In ?? 0) - (raw.serve1Won ?? 0)),
        serve2WonPoints: raw.serve2WonPoints ?? raw.serve2Won ?? 0,
        serve2LostPoints: raw.serve2LostPoints ?? Math.max(0, (raw.serve2In ?? 0) - (raw.serve2Won ?? 0)),
        rallySum: raw.rallySum ?? (raw.rallyLengths ?? []).reduce((sum, value) => sum + value, 0),
        rallyCount: raw.rallyCount ?? (raw.rallyLengths ?? []).length,
        rallyMax: raw.rallyMax ?? ((raw.rallyLengths ?? []).length ? Math.max(...raw.rallyLengths) : 0),
      };
      for (const field of PERFORMANCE_STAT_FIELDS) {
        const value = Number(normalized[field] ?? 0);
        if (!Number.isFinite(value)) continue;
        if (field === 'rallyMax') {
          seasonPerf[field] = Math.max(seasonPerf[field], value);
          surfacePerf[field] = Math.max(surfacePerf[field], value);
        } else {
          seasonPerf[field] += value;
          surfacePerf[field] += value;
        }
      }
      for (const mapField of ['byType', 'pointWinsByType']) {
        for (const [shotType, rawCount] of Object.entries(raw[mapField] ?? {})) {
          const count = Number(rawCount ?? 0);
          if (!Number.isFinite(count)) continue;
          seasonPerf[mapField][shotType] = (seasonPerf[mapField][shotType] ?? 0) + count;
          surfacePerf[mapField][shotType] = (surfacePerf[mapField][shotType] ?? 0) + count;
        }
      }

      // Campos legados continuam alimentados para Hall da Fama e saves antigos.
      const aces = raw.aces ?? 0;
      const winners = raw.winners ?? 0;
      const doubleFaults = raw.doubleFaults ?? 0;
      const unforcedErrors = raw.unforcedErrors ?? 0;
      s.aces += aces;
      s.winners += winners;
      s.doubleFaults += doubleFaults;
      s.unforcedErrors += unforcedErrors;
      season.aces += aces;
      season.winners += winners;
      season.doubleFaults += doubleFaults;
      season.unforcedErrors += unforcedErrors;
      for (const [shotType, count] of Object.entries(raw.pointWinsByType ?? {})) {
        s.pointWinsByType[shotType] = (s.pointWinsByType[shotType] ?? 0) + count;
        season.pointWinsByType[shotType] = (season.pointWinsByType[shotType] ?? 0) + count;
      }
    };

    accumulate(pAId, stats?.a);
    accumulate(pBId, stats?.b);
  }

  if (result._slim) {
    // -- SLIM FORMAT --------------------------------------------------
    if (result.champion) {
      const s = _rsGet(store, result.champion.id);
      snap(s, result.champion.id);
      s.titles++;
      if (category==='GRAND_SLAM')       { s.gs++; if (!s.gsWonIds.includes(tid)) s.gsWonIds.push(tid); }
      if (category==='SLAM_CLASH')       s.slam_clash++;
      if (category==='MASTERS_1000')     s.masters++;
      if (category==='ATP_500')          s.atp500++;
      if (category==='ATP_250')          s.atp250++;
      if (category==='FINALS')           s.finals_titles++;
      if (category==='OLYMPICS')         s.olympic_gold = (s.olympic_gold ?? 0) + 1;

      s.surfTitles[surf] = (s.surfTitles[surf]||0) + 1;
      s.finals++;
      if (category==='GRAND_SLAM') s.gsFinalsWon++;
      if (!s.titleYears.includes(year)) s.titleYears.push(year);
      const age = pm[result.champion.id]?.age ?? s.age;
      if (age) {
        if (s.youngestChampAge===null || age < s.youngestChampAge) s.youngestChampAge = age;
        if (s.oldestChampAge===null   || age > s.oldestChampAge)   s.oldestChampAge   = age;
      }
      const championSeason = seasonFor(s, result.champion.id);
      championSeason.titles++;
      _rsSurfaceData(championSeason, surf).titles++;
    }
    if (result.finalist) {
      const s = _rsGet(store, result.finalist.id);
      snap(s, result.finalist.id);
      s.finals++;
      s.finalLosses++;
      if (category==='GRAND_SLAM') s.gsFinalsLost++;
    }
    (result.semis ?? []).forEach(sf => {
      const s = _rsGet(store, sf.id);
      snap(s, sf.id);
      s.semifinals++;
    });
    (result.matches ?? []).forEach(({ w, l, sd, wa=true, st=null }) => {
      const ws = _rsGet(store, w);
      snap(ws, w);
      ws.wins++;
      ws.matchesPlayed++;
      ws.surfWins[surf] = (ws.surfWins[surf]||0) + 1;
      ws.curStreak++;
      if (ws.curStreak > ws.winStreak) ws.winStreak = ws.curStreak;
      const wSeason = seasonFor(ws, w);
      wSeason.wins++;
      wSeason.matchesPlayed++;
      const wSurface = _rsSurfaceData(wSeason, surf);
      wSurface.wins++;
      wSurface.matchesPlayed++;
      processSets(w, l, sd, wa);
      if (l) {
        const ls = _rsGet(store, l);
        snap(ls, l);
        ls.losses++;
        ls.matchesPlayed++;
        ls.surfLosses[surf] = (ls.surfLosses[surf]||0) + 1;
        ls.curStreak = 0;
        const lSeason = seasonFor(ls, l);
        lSeason.matchesPlayed++;
        const lSurface = _rsSurfaceData(lSeason, surf);
        lSurface.losses++;
        lSurface.matchesPlayed++;
      }
      processMatchStats(wa ? w : l, wa ? l : w, st);
      rememberMatch({ winnerId:w, loserId:l, setsDetail:sd, stats:st });
    });
    for (const [pid, pts] of Object.entries(result.pts ?? {})) {
      const s = _rsGet(store, pid);
      s.careerPts += pts;
      seasonFor(s, pid).pts += pts;
    }

  } else {
    // -- FULL BRACKET FORMAT -----------------------------------------
    const { bracket } = result;
    if (!bracket) return;

    if (bracket.champion) {
      const champ = bracket.champion;
      const s = _rsGet(store, champ.id);
      snap(s, champ.id);
      s.titles++;
      if (category==='GRAND_SLAM')       { s.gs++; if (!s.gsWonIds.includes(tid)) s.gsWonIds.push(tid); }
      if (category==='SLAM_CLASH')       s.slam_clash++;
      if (category==='MASTERS_1000')     s.masters++;
      if (category==='ATP_500')          s.atp500++;
      if (category==='ATP_250')          s.atp250++;
      if (category==='ATP_100')          s.atp100++;
      if (category==='ATP_75')           s.atp75 = (s.atp75 ?? 0) + 1;
      if (category==='ATP_50')           s.atp50 = (s.atp50 ?? 0) + 1;
      if (category==='ATP_25')           s.atp25 = (s.atp25 ?? 0) + 1;
      if (category==='FINALS')           s.finals_titles++;
      if (category==='OLYMPICS')         s.olympic_gold = (s.olympic_gold ?? 0) + 1;

      s.surfTitles[surf] = (s.surfTitles[surf]||0) + 1;
      if (!s.titleYears.includes(year)) s.titleYears.push(year);
      const age = pm[champ.id]?.age ?? s.age;
      if (age) {
        if (s.youngestChampAge===null || age < s.youngestChampAge) s.youngestChampAge = age;
        if (s.oldestChampAge===null   || age > s.oldestChampAge)   s.oldestChampAge   = age;
      }
      const championSeason = seasonFor(s, champ.id);
      championSeason.titles++;
      _rsSurfaceData(championSeason, surf).titles++;
    }

    if (bracket.rounds) {
      bracket.rounds.forEach((round, roundIndex) => {
        round.forEach(match => {
          if (!match.winner || match.isBye) return;
          const winner = match.winner;
          const pA = match.playerA ?? match.player1;
          const pB = match.playerB ?? match.player2;
          const loser = pA?.id === winner.id ? pB : pA;
          const ws = _rsGet(store, winner.id);
          snap(ws, winner.id);
          ws.wins++;
          ws.matchesPlayed++;
          ws.surfWins[surf] = (ws.surfWins[surf]||0) + 1;
          ws.curStreak++;
          if (ws.curStreak > ws.winStreak) ws.winStreak = ws.curStreak;
          const wSeason = seasonFor(ws, winner.id);
          wSeason.wins++;
          wSeason.matchesPlayed++;
          const wSurface = _rsSurfaceData(wSeason, surf);
          wSurface.wins++;
          wSurface.matchesPlayed++;
          processSets(winner.id, loser?.id, match.result?.setsDetail ?? match.setsDetail, pA?.id === winner.id);
          processMatchStats(pA?.id, pB?.id, match.result?.stats ?? null);
          rememberMatch({
            winnerId:winner.id, loserId:loser?.id,
            setsDetail:match.result?.setsDetail ?? match.setsDetail,
            stats:match.result?.stats, roundIndex,
            heat:match.result?.heat?.peak ?? match.result?.heatPeak ?? 0,
            maxRally:match.result?.maxRally ?? 0,
          });
          if (loser?.id) {
            const ls = _rsGet(store, loser.id);
            snap(ls, loser.id);
            ls.losses++;
            ls.matchesPlayed++;
            ls.surfLosses[surf] = (ls.surfLosses[surf]||0) + 1;
            ls.curStreak = 0;
            const lSeason = seasonFor(ls, loser.id);
            lSeason.matchesPlayed++;
            const lSurface = _rsSurfaceData(lSeason, surf);
            lSurface.losses++;
            lSurface.matchesPlayed++;
          }
        });
      });

      // finalist & champion finals count
      const finalRound = bracket.rounds[bracket.rounds.length - 1];
      if (finalRound && bracket.champion) {
        const finalMatch = finalRound[0];
        if (finalMatch && !finalMatch.isBye) {
          const pA = finalMatch.playerA ?? finalMatch.player1;
          const pB = finalMatch.playerB ?? finalMatch.player2;
          const champId = bracket.champion.id;
          const runnerId = pA?.id === champId ? pB?.id : pA?.id;
          const cs = _rsGet(store, champId);
          cs.finals++;
          if (category==='GRAND_SLAM') cs.gsFinalsWon++;
          if (runnerId) {
            const rs = _rsGet(store, runnerId);
            snap(rs, runnerId);
            rs.finals++;
            rs.finalLosses++;
            if (category==='GRAND_SLAM') rs.gsFinalsLost++;
          }
        }
      }
      // semis
      if (bracket.rounds.length >= 2) {
        const sfRound = bracket.rounds[bracket.rounds.length - 2];
        sfRound?.forEach(m => {
          if (m.isBye || !m.winner) return;
          const pA = m.playerA ?? m.player1;
          const pB = m.playerB ?? m.player2;
          const lId = pA?.id === m.winner.id ? pB?.id : pA?.id;
          if (lId) { const ls = _rsGet(store, lId); snap(ls, lId); ls.semifinals++; }
        });
      }
    }

    // pontos
    try {
      const pointMap = computeTournamentPoints(tournament, bracket, TOURNAMENT_POINTS);
      for (const [pid, { points }] of pointMap) {
        if (points > 0) {
          const s = _rsGet(store, pid);
          s.careerPts += points;
          seasonFor(s, pid).pts += points;
        }
      }
    } catch(_) {}
  }

  // trim seasonData para MAX_SEASON_DATA seasons mais recentes
  for (const s of Object.values(store.playerStats)) {
    const keys = Object.keys(s.seasonData).map(Number).sort((a,b) => a-b);
    if (keys.length > MAX_SEASON_DATA) {
      keys.slice(0, keys.length - MAX_SEASON_DATA).forEach(k => delete s.seasonData[k]);
    }
  }
}

/**
 * Constr—i um recordsStore do zero a partir do hist—rico existente.
 * Usado na migra——o de saves antigos (one-time).
 */
function buildRecordsStoreFromHistory(state) {
  const store = { _version: 1, playerStats: {} };
  const allPlayers = [
    ...(state.tourPlayers ?? []),
    ...(state.prospects ?? []),
    ...(state.retiredPlayers ?? []),
  ];
  const playerMap = Object.fromEntries(allPlayers.map(p => [p.id, p]));

  const allResults = {
    ...(state.historicalTournamentResults ?? {}),
    ...(state.tournamentResults ?? {}),
  };

  // ordena por temporada + weekIndex para curStreak ser correto
  const ordered = Object.values(allResults)
    .filter(r => r.tournament && (r._slim || r.bracket))
    .sort((a,b) => {
      const yA = a._season ?? a.tournament?.season ?? 0;
      const yB = b._season ?? b.tournament?.season ?? 0;
      if (yA !== yB) return yA - yB;
      return (a.tournament?.weekIndex??0) - (b.tournament?.weekIndex??0);
    });

  for (const res of ordered) {
    const year = res._season ?? res.tournament?.season ?? state.year;
    updateRecordsStoreWithResult(store, res, year, playerMap);
  }

  return store;
}

/** Retorna o recordsStore atual, criando/migrando se necess—rio. */
function getOrMigrateRecordsStore(state) {
  if (state.recordsStore?._version === 1 &&
      Object.keys(state.recordsStore.playerStats ?? {}).length > 0) {
    return state.recordsStore;
  }
  // migra——o one-time
  return buildRecordsStoreFromHistory(state);
}

// -------------------------------------------------------------------
// SLIM FORMAT — reduz tamanho do save ao virar o ano
// -------------------------------------------------------------------

function compactPerformanceStats(raw) {
  if (!raw) return null;
  const compact = {};
  for (const field of PERFORMANCE_STAT_FIELDS) {
    const value = Number(raw[field] ?? 0);
    if (Number.isFinite(value) && value !== 0) compact[field] = value;
  }
  // aliases usados pelo FastSimulation antes da normalização no recordsStore
  for (const field of ['serve1Won', 'serve2Won']) {
    const value = Number(raw[field] ?? 0);
    if (Number.isFinite(value) && value !== 0) compact[field] = value;
  }
  for (const mapField of ['byType', 'pointWinsByType']) {
    const entries = Object.entries(raw[mapField] ?? {}).filter(([, value]) => Number(value) !== 0);
    if (entries.length) compact[mapField] = Object.fromEntries(entries);
  }
  return Object.keys(compact).length ? compact : null;
}

/**
 * Converte um resultado completo de torneio (com bracket enorme)
 * em um objeto m—nimo que preserva tudo que os consumers precisam.
 * Redu——o t—pica: ~98% do tamanho original.
 */
function slimifyTournamentResult(result, year) {
  // Se j— est— slim, devolve intacto (champion, matches, pts preservados).
  // Atualiza _season apenas se ainda não definido.
  if (result?._slim) {
    return { ...result, _season: result._season ?? year };
  }
  const { bracket, tournament } = result ?? {};
  if (!tournament) return null;

  const slim = {
    _slim: true,
    _season: year,
    tournament: {
      id: tournament.id, name: tournament.name, category: tournament.category,
      surface: tournament.surface, season: tournament.season ?? year,
      weekIndex: tournament.weekIndex, isSlam: tournament.isSlam ?? false,
      isMasters: tournament.isMasters ?? false, bestOf: tournament.bestOf ?? 3,
      isJuniors: tournament.isJuniors ?? false,
    },
    champion:  null,
    finalist:  null,
    semis:     [],
    matches:   [],   // [{ w: id, l: id }]
    pts:       {},   // { [playerId]: number }
  };

  if (!bracket) return slim;

  // Champion
  if (bracket.champion) {
    slim.champion = { id: bracket.champion.id, name: bracket.champion.name };
  }

  if (bracket.rounds?.length > 0) {
    // Finalist — perdedor da —ltima rodada
    const finalRound = bracket.rounds[bracket.rounds.length - 1];
    const finalMatch = finalRound?.[0];
    if (finalMatch && !finalMatch.isBye && bracket.champion) {
      const a = finalMatch.playerA ?? finalMatch.player1;
      const b = finalMatch.playerB ?? finalMatch.player2;
      const loser = (a?.id === bracket.champion.id) ? b : a;
      if (loser?.id) slim.finalist = { id: loser.id, name: loser.name };
    }

    // Semifinalistas — perdedores da pen—ltima rodada
    if (bracket.rounds.length >= 2) {
      const sfRound = bracket.rounds[bracket.rounds.length - 2];
      sfRound?.forEach(m => {
        if (m.isBye || !m.winner) return;
        const a = m.playerA ?? m.player1;
        const b = m.playerB ?? m.player2;
        const loser = (a?.id === m.winner.id) ? b : a;
        if (loser?.id) slim.semis.push({ id: loser.id, name: loser.name });
      });
    }

    // Todos os resultados W/L (apenas IDs)
    bracket.rounds.forEach(round => {
      round.forEach(match => {
        if (!match.winner || match.isBye) return;
        const a = match.playerA ?? match.player1;
        const b = match.playerB ?? match.player2;
        const loser = match.loser ?? ((a?.id === match.winner.id) ? b : a);
        if (match.winner?.id && loser?.id) {
          const sd = match.result?.setsDetail ?? match.setsDetail ?? null;
          const pA = match.playerA ?? match.player1;
          const entry = { w: match.winner.id, l: loser.id };
          if (sd?.length) {
            entry.sd = sd.map(([a,b]) => [a,b]);
            entry.wa = (pA?.id === match.winner.id); // winner — playerA?
          }
          if (match.result?.stats?.a || match.result?.stats?.b) {
            entry.st = {
              a: compactPerformanceStats(match.result?.stats?.a),
              b: compactPerformanceStats(match.result?.stats?.b),
            };
          }
          slim.matches.push(entry);
        }
      });
    });
  }

  // Pontos pr—-computados
  try {
    const pointMap = computeTournamentPoints(tournament, bracket, TOURNAMENT_POINTS);
    for (const [pid, { points }] of pointMap) {
      if (points > 0) slim.pts[pid] = (slim.pts[pid] ?? 0) + points;
    }
  } catch (_) {}

  return slim;
}

/**
 * Vers—o m—nima de um jogador aposentado para exibi——o no HOF e recordes.
 * Descarta attrs, _devState, traits, coachHistory, injuryHistory, etc.
 */
function slimifyRetiredPlayer(p) {
  return {
    id: p.id, name: p.name, nationality: p.nationality,
    styleId: p.styleId, signatureShots: p.signatureShots ?? [],
    color: p.color, age: p.age, photo: p.photo ?? null,
    namedPlayerKey: p.namedPlayerKey ?? null,
    retirementInfo: p.retirementInfo ?? null,
    // -- hist—rico permanente (lendas com =3 GS chegam aqui com tudo) --
    careerTitles:      p.careerTitles      ?? { gs:0, slamClash:0, masters:0, finals:0, atp500:0, atp250:0, atp100:0 },
    alcunha:           p.alcunha           ?? null,
    _careerTitles:     p._careerTitles     ?? 0,
    _careerGrandSlams: p._careerGrandSlams ?? 0,
    _careerWins:       p._careerWins       ?? 0,
    _careerFinals:     p._careerFinals     ?? 0,
    _rankHistory:      p._rankHistory      ?? [],
    _seasonHistory:    p._seasonHistory    ?? [],
    birthYear:         p.birthYear         ?? null,
    peakAge:           p.peakAge           ?? null,
    personality:       p.personality       ?? null,
    careerTrajectory:  p.careerTrajectory  ?? null,
    youthProfile:      p.youthProfile      ?? null,
    surfaceStats:      p.surfaceStats      ?? null,
    surfaceIdentity:   p.surfaceIdentity   ?? null,
    surfaceProfile:    p.surfaceProfile    ?? null,
    dna:               p.dna               ?? null,
    injuryHistory:     p.injuryHistory     ?? [],
    lifeEventLog:      p.lifeEventLog      ?? [],
    // A biografia do Hall precisa sobreviver ao enxugamento do aposentado.
    // Mantemos apenas os rastros narrativos, nunca dados pesados de simulação.
    sponsorTimeline:   p.sponsorTimeline   ?? [],
    coachTimeline:     p.coachTimeline     ?? [],
    latestInterview:   p.latestInterview   ?? null,
    lifeMemory:        p.lifeMemory        ?? null,
    _isSlimRetired: true,
  };
}

function slimifyYouthExit(p) {
  return {
    id: p.id,
    name: p.name,
    fullName: p.fullName ?? null,
    nationality: p.nationality,
    age: p.age,
    birthYear: p.birthYear ?? null,
    styleId: p.styleId ?? null,
    photo: p.photo ?? null,
    youthProfile: p.youthProfile ?? null,
    retirementInfo: p.retirementInfo ?? null,
    generatedIn: p.generatedIn ?? null,
  };
}

function slimifyArchivePlayer(p) {
  if (!p) return null;
  return {
    id: p.id ?? null,
    name: p.name ?? p.fullName ?? '',
    firstName: p.firstName ?? null,
    fullName: p.fullName ?? p.name ?? '',
    nationality: p.nationality ?? null,
    rankPosition: p.rankPosition ?? null,
    age: p.age ?? null,
    styleId: p.styleId ?? null,
    color: p.color ?? null,
    photo: p.photo ?? null,
    alcunha: p.alcunha ?? null,
    careerTitles: p.careerTitles ?? null,
    latestInterview: p.latestInterview ?? null,
  };
}

function slimifyArchiveJournalist(journalist) {
  if (!journalist) return null;
  return {
    id: journalist.id ?? null,
    name: journalist.name ?? '',
    outlet: journalist.outlet ?? '',
    specialty: journalist.specialty ?? null,
    style: journalist.style ?? null,
    icon: journalist.icon ?? '',
    color: journalist.color ?? null,
  };
}

function slimifyArchivedArticle(article) {
  if (!article || typeof article !== 'object') return article;
  const compact = { ...article };
  compact.player = slimifyArchivePlayer(article.player);
  compact.playerB = slimifyArchivePlayer(article.playerB);
  compact.winner = slimifyArchivePlayer(article.winner);
  compact.loser = slimifyArchivePlayer(article.loser);
  compact.journalist = slimifyArchiveJournalist(article.journalist);
  return compact;
}

function slimifyArchivedInterview(interview) {
  if (!interview || typeof interview !== 'object') return interview;
  return {
    ...interview,
    player: slimifyArchivePlayer(interview.player),
    journalist: slimifyArchiveJournalist(interview.journalist),
  };
}

function slimifyInterviewArchiveItem(item) {
  if (!item || typeof item !== 'object') return item;
  return {
    ...item,
    interview: slimifyArchivedInterview(item.interview),
  };
}

function slimifyPlayerForSave(player) {
  if (!player || typeof player !== 'object') return player;
  const compact = { ...player, youthProfile: player.youthProfile ?? null };
  compact.formHistory = (compact.formHistory ?? []).slice(-24);
  return compact;
}

function compactHistoricalMatchForSave(match) {
  if (!match || typeof match !== 'object') return match;
  const compact = {
    w: match.w,
    l: match.l,
  };
  if (match.sd?.length) compact.sd = match.sd.map(([a, b]) => [a, b]);
  if (match.wa !== undefined) compact.wa = match.wa;
  return compact;
}

function compactTournamentResultForSave(result) {
  if (!result || typeof result !== 'object') return result;
  return {
    ...result,
    matches: (result.matches ?? []).map(compactHistoricalMatchForSave),
  };
}

function slimifyNewsEngineForSave(newsEngine) {
  const raw = newsEngine?.toJSON?.() ?? newsEngine ?? null;
  if (!raw) return null;
  return {
    ...raw,
    feed: (raw.feed ?? []).map(slimifyArchivedArticle),
  };
}

const WORLD_MILESTONE_EVENT = /GRAND_SLAM|SLAM|TITLE|CHAMPION|RETIRE|CAREER|RECORD|NO1|NUMBER_ONE|RANKING_MILESTONE|BREAKING|SCANDAL|HEALTH_CAREER|DEATH|LEGACY|ERA|RIVALRY|OLYMPIC|BREAKTHROUGH|COMEBACK/i;

function compactWorldEventsPreservingMilestones(events, recentRoutineLimit = 1800) {
  const rows = Array.isArray(events) ? events : [];
  const routineCount = rows.reduce((count, event) => count + (WORLD_MILESTONE_EVENT.test(String(event?.type ?? '')) ? 0 : 1), 0);
  const discardRoutine = Math.max(0, routineCount - recentRoutineLimit);
  let routineSeen = 0;
  return rows.filter(event => {
    if (WORLD_MILESTONE_EVENT.test(String(event?.type ?? ''))) return true;
    routineSeen += 1;
    return routineSeen > discardRoutine;
  });
}

function buildUniverseSavePayload(s) {
  const slimHistorical = {};
  for (const [key, result] of Object.entries(s.historicalTournamentResults ?? {})) {
    slimHistorical[key] = compactTournamentResultForSave(
      result._slim ? result : slimifyTournamentResult(result, result._season ?? s.year - 1)
    );
  }
  const slimCurrent = {};
  for (const [key, result] of Object.entries(s.tournamentResults ?? {})) {
    slimCurrent[key] = compactTournamentResultForSave(
      result._slim ? result : slimifyTournamentResult(result, result._season ?? s.year)
    );
  }

  return {
    _version: SAVE_SCHEMA_VERSION,
    year: s.year,
    worldDate: s.worldDate ?? createWorldDate(s.year ?? 2025, 1),
    season: s.season,
    calendarIndex: s.calendarIndex,
    tourPlayers: (s.tourPlayers ?? []).map(slimifyPlayerForSave),
    prospects: (s.prospects ?? []).map(slimifyPlayerForSave),
    youthCohortUniverse: s.youthCohortUniverse ?? createYouthCohortUniverse(s.year ?? 2025, (s.prospects ?? []).length),
    competitiveDensity: ensureCompetitiveDensityState(s.competitiveDensity, s.year ?? 2025),
    circuitShock: s.circuitShock ?? null,
    youthExitArchive: (s.youthExitArchive ?? []).slice(-500),
    retiredPlayers: (s.retiredPlayers ?? []).map(player => player._isSlimRetired ? player : slimifyRetiredPlayer(player)),
    rankingStore: compactRankingStoreForSave(s.rankingStore),
    tournamentResults: slimCurrent,
    historicalTournamentResults: slimHistorical,
    events: compactWorldEventsPreservingMilestones(s.events),
    playerSeasonSlots: s.playerSeasonSlots ?? {},
    newgenImagePool: s.newgenImagePool ?? {},
    yearSummary: s.yearSummary ?? null,
    rivalrySystem: s.rivalrySystem?.toJSON?.() ?? null,
    chronicleEngine: s.chronicleEngine?.toJSON?.() ?? null,
    newsEngine: slimifyNewsEngineForSave(s.newsEngine),
    coachMarket: s.coachMarket ?? null,
    sponsorPool: s.sponsorPool ?? null,
    pendingOffers: s.pendingOffers ?? [],
    highestPaidPlayerId: s.highestPaidPlayerId ?? null,
    seasonPulseState: s.seasonPulseState ?? createSeasonPulseState(s.year ?? 2025),
    monthlyInterviews: (s.monthlyInterviews ?? []).map(slimifyInterviewArchiveItem),
    grandSlamInterviews: (s.grandSlamInterviews ?? []).map(slimifyInterviewArchiveItem),
    recordsStore: s.recordsStore ?? { _version:1, playerStats:{} },
    radar: s.radar ?? createRadarState(),
    circuitShifts: (s.circuitShifts ?? []).slice(-120),
    latestCircuitShift: s.latestCircuitShift ?? null,
    historyBook: serializeHistoryBook(s.historyBook, s.year ?? 2025),
  };
}

// -------------------------------------------------------------------
// INICIALIZA——O DO UNIVERSO
// -------------------------------------------------------------------

function seedAllNewInitialCareer(player, seasonYear) {
  if (!player || (player.age ?? 0) <= 23) return player;
  if (Math.random() > 0.20) return player;

  let simulated = {
    ...player,
    age: 17,
    _devState: {
      ...(player._devState ?? {}),
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
    },
  };

  const startYear = Math.max((player.birthYear ?? (seasonYear - (player.age ?? 17))) + 17, seasonYear - 20);
  for (let year = startYear; year < seasonYear; year++) {
    const result = advanceSeason([simulated], year, 12, {}, {}, null);
    simulated = result?.updatedPlayers?.[0] ?? simulated;
  }

  const ovrTarget = simulated?._devState?.ovrTarget ?? player?._devState?.ovrTarget ?? overallRating(simulated.attrs);
  const nearPeakFactor = 0.92 + Math.random() * 0.08;
  const desiredOvrFloor = Math.round(ovrTarget * nearPeakFactor);
  let currentOvr = overallRating(simulated.attrs);

  if (currentOvr < desiredOvrFloor) {
    const attrKeys = Object.keys(simulated.attrs ?? {});
    let guard = 0;
    while (currentOvr < desiredOvrFloor && guard < 600) {
      const key = attrKeys[guard % attrKeys.length];
      if ((simulated.attrs[key] ?? 0) < 99) simulated.attrs[key] += 1;
      currentOvr = overallRating(simulated.attrs);
      guard++;
    }
  }

  return {
    ...simulated,
    age: player.age,
    birthYear: player.birthYear,
    circuitLevel: 'PRO',
    _devState: {
      ...simulated._devState,
      attrGrowthAccum: simulated?._devState?.attrGrowthAccum ?? {},
    },
  };
}

function buildUniverse(universeMode = 'normal') {
  // 16 jogadores originais — gera 5 kits, kit[0] — a apar—ncia can—nica
  const useNamedCast = universeMode !== 'all_new';
  const named = useNamedCast
    ? Object.values(NAMED_PLAYERS).map(p => ({
        ...p,
        formPoints: 0,
        formHistory: [],
        kits:           generateKits(p.id, p.namedPlayerKey, 5),
        activeKitIndex: 0,
      }))
    : [];

  // Inicializa o pool de imagens para newgens
  const poolOpts = { _poolState: createEmptyPoolState() };

  // 64 newgens para completar a camada profissional do universo.
  const tourNewgenCount = Math.max(0, UNIVERSE_TOUR_TARGET - named.length);
  const initialProAgeRange = universeMode === 'all_new' ? [17, 37] : [20, 36];
  const newgensTour = generateNewgenBatch(2025, tourNewgenCount, {
    ageRange: initialProAgeRange, ...poolOpts,
  }).map(p => {
    const basePlayer = { ...p, formPoints: 0, formHistory: [], circuitLevel: 'PRO' };
    return universeMode === 'all_new'
      ? seedAllNewInitialCareer(basePlayer, 2025)
      : basePlayer;
  });

  // Juniors: base viva do submundo. Entram jovens e não podem envelhecer presos aqui.
  const initialYouthCohortUniverse = createYouthCohortUniverse(2025, O_OUTRO_MUNDO.JUNIOR_TARGET);
  const juniorJuniors = normalizeJuniorField(
    createJuniorNewgens(2025, O_OUTRO_MUNDO.JUNIOR_TARGET, poolOpts, initialYouthCohortUniverse),
    2025,
  );

  const rankingStore = createRankingStore();

  // Ordem de entrada: nomes conhecidos respeitam o rank de abertura; no modo
  // all-new, o OVR organiza o ponto de partida antes de os resultados falarem.
  const allTour = [...named, ...newgensTour].sort((a, b) => {
    if (useNamedCast) {
      const aRank = a.initialRank ?? 9999;
      const bRank = b.initialRank ?? 9999;
      if (aRank !== bRank) return aRank - bRank;
    }
    return overallRating(b.attrs) - overallRating(a.attrs);
  });

  // Universo novo começa sem herdar uma temporada fictícia: todos têm 0
  // ponto. A ordem inicial apenas resolve empates até os torneios reais
  // começarem a formar o ranking em quadra.
  rankingStore.seedOrder = Object.fromEntries(allTour.map((player, index) => [player.id, index + 1]));

  const tourPlayers = allTour.map((p, idx) => ({ ...p, rankPosition: idx + 1 }));

  // Calcula ranking inicial
  const initialRanked     = computeRanking(rankingStore, tourPlayers.map(p => p.id));
  const initRankMap       = Object.fromEntries(initialRanked.map(r => [r.playerId, r.position]));
  const tourPlayersSynced = tourPlayers.map(p => ({ ...p, rankPosition: initRankMap[p.id] ?? p.rankPosition }));

  const tourPlayersWithPrefs = tourPlayersSynced.map(p => migrateTournamentPreferences({ ...p }));
  const playerSeasonSlots    = buildSeasonSlots(tourPlayersWithPrefs);
  const chronicleEngine      = new ChronicleEngine();

  const tourPlayersWithPersonality = tourPlayersWithPrefs.map(p =>
    p.personality ? p : migratePlayerPersonality({ ...p })
  );

  const tourPlayersWithLife = tourPlayersWithPersonality.map(p => {
    let np = migrateLifeEventLog(p);
    np = migratePlayerLifeData(np);
    // -- Kit migration: jogadores sem kits (save antigo) recebem kits agora --
    if (!np.kits?.length) {
      np = { ...np, kits: generateKits(np.id, np.namedPlayerKey ?? null, 5), activeKitIndex: 0 };
    }
    const withYouth = ensureYouthProfile(ensurePlayerBirthDate(ensureCareerTrajectory(np, 2025, 'UNIVERSE_CREATION'), { year: 2025, month: 1 }, 2025), 2025, 'UNIVERSE_CREATION');
    return ensureSurfaceProfile(withYouth, { year: 2025, source: np.isNewgen ? 'NEWGEN' : 'UNIVERSE_CREATION' });
  });

  const coachMarketSeed = createInitialCoachMarket([...tourPlayersWithLife, ...juniorJuniors], 2025);
  const initialCoaching = initializePlayersCoaching(
    tourPlayersWithLife.map(p => migrateBreakingNewsState(stripOldCoachButKeepBancoVivo(p))),
    coachMarketSeed,
    2025,
  );
  const tourWithoutCoaches = initialCoaching.players;
  const seasonOpenBreaking = maybeTriggerBreakingNews(
    tourWithoutCoaches,
    2025,
    {},
    { phase: 'SEASON_OPEN', tournament: CALENDAR[0] },
  );
  const tourAtSeasonOpen = seasonOpenBreaking.players ?? tourWithoutCoaches;
  const initialCompetitiveDensity = planCompetitiveDensity(
    [...tourAtSeasonOpen, ...juniorJuniors],
    2025,
    poolOpts._competitiveDensityState,
  );
  const initialPreparedBundle = buildPreparedTournamentPackageBundle(
    CALENDAR[0],
    tourAtSeasonOpen,
    juniorJuniors,
    playerSeasonSlots,
    2025,
  );
  const initialPreparedTournamentPackage = initialPreparedBundle.currentPackage;
  const initialNewsEngine = new NewsEngine();
  const initialBreakingArticles = generateBreakingNewsArticles(
    seasonOpenBreaking.events ?? [],
    tourAtSeasonOpen,
    2025,
  );
  initialNewsEngine.push([
    ...initialBreakingArticles,
    ...generateUpcomingTournamentNews(
      CALENDAR[0],
      initialPreparedTournamentPackage,
      { year: 2025, tourPlayers: tourAtSeasonOpen, prospects: juniorJuniors, tournamentResults: {}, historicalTournamentResults: {} },
      { seasonStart: true },
    ),
  ]);

  return {
    year: 2025,
    worldDate: createWorldDate(2025, 1),
    season: 1,
    newgenImagePool: poolOpts._poolState,
    tourPlayers:  tourAtSeasonOpen.map(p  => ensurePlayerHype(ensureLifeSimulation(ensureDevelopmentLedger(initPlayerFinance(p), 2025), { year: 2025, month: 1 }), { year:2025, month:1 })),
    prospects:    juniorJuniors.map(p => ensureLifeSimulation(ensureDevelopmentLedger(initPlayerFinance(ensureYouthProfile(ensurePlayerBirthDate(ensureCareerTrajectory(p, 2025, 'UNIVERSE_CREATION'), { year: 2025, month: 1 }, 2025), 2025, 'UNIVERSE_CREATION')), 2025), { year: 2025, month: 1 })),
    youthCohortUniverse: ensureYouthCohortUniverse(initialYouthCohortUniverse, 2025, juniorJuniors.length),
    competitiveDensity: initialCompetitiveDensity,
    youthExitArchive: [],
    rankingStore,
    calendarIndex: 0,
    preparedTournamentPackage: initialPreparedTournamentPackage,
    preparedTournamentPackageCache: initialPreparedBundle.packageCache,
    tournamentResults: {},
    historicalTournamentResults: {}, // acumula resultados de TODAS as temporadas
    circuitShifts: [],
    latestCircuitShift: null,
    circuitShock: seasonOpenBreaking.directorState,
    // Livro das Eras: memória macro-histórica. O patch 1 apenas persiste a
    // base; a classificação de eras entra nos patches seguintes.
    historyBook: createHistoryBook(2025),
    recordsStore: { _version:1, playerStats:{} }, // stats acumuladas — nunca apagado
    events: [
      ...(seasonOpenBreaking.events ?? []).map(e => ({ ...e, year: 2025 })),
      ...(initialCoaching.events ?? []).slice(0, 12).map(e => ({ ...e, year: 2025, icon: '[t+]' })),
    ],
    view: null,
    retiredPlayers: [],
    
    playerSeasonSlots,   // { playerId ? SeasonSlots } — contadores de slots usados
    rivalrySystem: new RivalrySystem(), // inst—ncia viva — atualizada fora do reducer
    chronicleEngine,
    newsEngine: initialNewsEngine,       // motor de jornalismo — feed de artigos
    coachMarket: initialCoaching.coachMarket,

    // -- Sponsorship System (Fases 3—5) ---------------------------
    sponsorPool: initSponsorPool({ year: 2025 }),
    pendingOffers: [],
    highestPaidPlayerId: null,
    seasonPulseState: createSeasonPulseState(2025),
    monthlyInterviews: [],
    grandSlamInterviews: [],
    radar: createRadarState(),

  };
}

// -------------------------------------------------------------------
// REDUCER
// -------------------------------------------------------------------

function reducer(state, action) {
  switch (action.type) {
    case 'SET_PREPARED_TOURNAMENT_PACKAGE':
      return {
        ...state,
        preparedTournamentPackage: action.package ?? null,
        preparedTournamentPackageCache: action.packageCache ?? (action.package ? { [action.package.tournamentId]: action.package } : {}),
      };

    case 'SET_VIEW':
      return { ...state, view: action.view };

    case 'SET_RADAR_FOLLOWED': {
      const availableIds = [...(state.tourPlayers ?? []), ...(state.prospects ?? []), ...(state.retiredPlayers ?? [])].map((player) => player.id);
      const followedPlayerIds = normalizeFollowedPlayerIds(action.playerIds, availableIds);
      return {
        ...state,
        tourPlayers: (state.tourPlayers ?? []).map(player => followedPlayerIds.includes(player.id)
          ? ensureYouthShadowHistory(player, { year: state.year, trigger: 'RADAR_FOLLOWED', cohortUniverse: state.youthCohortUniverse })
          : player),
        prospects: (state.prospects ?? []).map(player => followedPlayerIds.includes(player.id)
          ? ensureYouthShadowHistory(player, { year: state.year, trigger: 'RADAR_FOLLOWED', cohortUniverse: state.youthCohortUniverse })
          : player),
        radar: {
          ...(state.radar ?? createRadarState()),
          followedPlayerIds,
        },
        // O pacote pode conter qualifying e rodadas iniciais já resolvidos.
        // Ao mudar o Radar, ele precisa ser reconstruído para que nenhum jogo
        // do novo acompanhado permaneça com um resultado vindo do Fast.
        preparedTournamentPackage: null,
        preparedTournamentPackageCache: {},
      };
    }

    case 'SET_RADAR_SETTINGS':
      return { ...state, radar: { ...(state.radar ?? createRadarState()), settings: { ...(state.radar?.settings ?? {}), ...(action.settings ?? {}) } } };

    case 'APPEND_RADAR_COVERAGE': {
      const radar = state.radar ?? createRadarState();
      const matches = [...(radar.matchLog ?? []), ...(action.matches ?? [])].slice(-240);
      const digest = action.digest ?? null;
      return {
        ...state,
        radar: {
          ...radar,
          matchLog: matches,
          alerts: [...(radar.alerts ?? []), ...(action.alerts ?? [])].slice(-120),
          weeklyDigest: digest ? [...(radar.weeklyDigest ?? []), digest].slice(-80) : (radar.weeklyDigest ?? []),
        },
      };
    }

    case 'SKIP_TOURNAMENT': {
      // Avan—a calendarIndex sem simular (usado para Olimp—adas em anos não-ol—mpicos)
      return {
        ...state,
        calendarIndex: state.calendarIndex + 1,
        preparedTournamentPackage: null,
        preparedTournamentPackageCache: {},
      };
    }

    case 'APPLY_TOURNAMENT_RESULT': {
      const { tournamentId, result, tournament } = action;
      tournamentDebugLog('reducer:apply:start', {
        tournamentId,
        tournamentName: tournament?.name,
        category: tournament?.category,
        champion: result?.bracket?.champion?.name ?? null,
        rounds: result?.bracket?.rounds?.length ?? 0,
        alreadyApplied: !!state.tournamentResults?.[tournamentId],
      });
      if (state.tournamentResults?.[tournamentId]) {
        tournamentDebugLog('reducer:apply:skip-already-applied', { tournamentId });
        return state;
      }
      const { bracket, qualifiers, preQualWinners } = result;
      const radarMatches = (result?.radarMatches?.length ? result.radarMatches : (bracket?.rounds ?? []).flatMap((round) => round ?? [])
        .filter((match) => match?.result?.simulationSource === 'FOLLOWED_HEADLESS')
        .map((match) => buildRadarMatchRecord({
          playerA: match.playerA,
          playerB: match.playerB,
          winner: match.winner,
          result: match.result,
          tournament,
          roundLabel: match.result?.roundLabel ?? null,
          year: state.year,
        }))) ?? [];

      // -- Rota——o de kits por torneio ----------------------------------------
      // Cada jogador sorteia um dos seus 5 kits no in—cio de cada torneio.
      // Usa tournamentId + playerId como semente para ser determin—stico
      // (replay do mesmo torneio = mesmo kit).
      function pickKitIndex(playerId, tId, numKits) {
        if (!numKits || numKits <= 1) return 0;
        let h = 5381;
        const s = `${tId}|${playerId}`;
        for (let i = 0; i < s.length; i++) {
          h = ((h << 5) + h) + s.charCodeAt(i);
          h = h & 0x7fffffff;
        }
        return h % numKits;
      }
      const tourPlayersWithKits = state.tourPlayers.map(p => {
        if (!p.kits?.length) return p;
        const idx = pickKitIndex(p.id, tournamentId, p.kits.length);
        if (idx === p.activeKitIndex) return p; // sem mudan—a, evita re-render
        return { ...p, activeKitIndex: idx };
      });
      const newStore = { ...state.rankingStore };
      const isJuniors = isJuniorTournament(tournament);
      const pointMap = computeTournamentPoints(tournament, bracket, TOURNAMENT_POINTS);
      const tInfo = { id: tournament.id, name: tournament.name, category: tournament.category, weekIndex: tournament.weekIndex, season: state.year };

      // Mapa de todos os jogadores para atualizar finance rapidamente
      const allPlayersById = Object.fromEntries(
        [...tourPlayersWithKits, ...state.prospects].map(p => [p.id, p])
      );

      for (const [pid, { round, points }] of pointMap) {
        registerResult(newStore, pid, tInfo, round, isJuniors);
        // -- Finance: prize money ----------------------------------------------
        const fp = allPlayersById[pid];
        if (fp) awardPrizeMoney(fp, tournament.category, round, state.year, tournament.name);
      }

      // Pontos de Qualify (Q): jogadores que passaram o qualify e entram no main draw
      if (!isJuniors && qualifiers?.length > 0) {
        const qPts = TOURNAMENT_POINTS[tournament.category]?.['Q'] ?? 0;
        if (qPts > 0) {
          for (const q of qualifiers) {
            registerResult(newStore, q.id, tInfo, 'Q', false);
          }
        }
      }

      // Pontos de Pr—-Qualify (PQ): jogadores que venceram o pr—-qualify (ranks 65-128)
      if (!isJuniors && preQualWinners?.length > 0) {
        const pqPts = TOURNAMENT_POINTS[tournament.category]?.['PQ'] ?? 0;
        if (pqPts > 0) {
          for (const q of preQualWinners) {
            registerResult(newStore, q.id, tInfo, 'PQ', false);
          }
        }
      }

      // Ranking ATP-style: expira resultados da mesma semana do ano anterior
      // assim que o torneio atual termina, não apenas na virada da temporada.
      applyPointsDefense(newStore, state.year, tournament.weekIndex ?? -1);

      // Recalcula rankings
      const allIds = state.tourPlayers.map(p => p.id);
      const ranked = computeRanking(newStore, allIds);
      const prospectIds = state.prospects.map(p => p.id);
      const prospectRanked = computeProspectRanking(newStore, prospectIds);
      // Atualiza rankPosition
      const rankMap = Object.fromEntries(ranked.map(r => [r.playerId, r.position]));
      const prospectRankMap = Object.fromEntries(prospectRanked.map(r => [r.playerId, r.position]));

      // -- LES—ES: atualizar estado p—s-torneio ------------------
      const injuryMeta = result.updatedByInjury ?? {};
      const withdrawals = result.injuryWithdrawals ?? new Set();
      const injEventsRaw = result.injuryEvents ?? [];

      const injuryEventsForTimeline = injEventsRaw
        .filter(Boolean)
        .filter(e => {
          const player = state.tourPlayers.find(p => p.id === e.playerId);
          const pos = player?.rankPosition ?? 99;
          const grade = injuryMeta[e.playerId]?.injury?.grade ?? e.injury?.grade ?? 1;
          return pos <= 50 || grade >= 2;
        })
        .map(e => ({ ...e, year: state.year }));

      // -- FORMA: calcular deltas deste torneio ---------------------
      const bracketRounds = result.bracket?.rounds ?? [];
      const totalBRounds  = bracketRounds.length;
      const formDeltaMap  = new Map();
      const formHistMap   = {};
      const participatedIds = new Set();
      const ROUND_FULL_LABEL = {
        F: 'Final', SF: 'Semifinal', QF: 'Quartas', R16: 'Oitavas', R32: '3— Rodada',
      };
      bracketRounds.forEach((round, roundIdx) => {
        const fromEnd      = totalBRounds - 1 - roundIdx;
        const formRoundIdx = Math.max(0, Math.min(4, 4 - fromEnd));
        const rl           = fromEnd === 0 ? 'F' : fromEnd === 1 ? 'SF' : fromEnd === 2 ? 'QF' : fromEnd === 3 ? 'R16' : 'R32';
        const rlFull       = ROUND_FULL_LABEL[rl] ?? rl;
        const row          = FORM_POINTS_TABLE[formRoundIdx] ?? { win: 0, loss: 0 };
        round.forEach(match => {
          if (match.isBye || !match.winner) return;
          if (match.playerA?.id) participatedIds.add(match.playerA.id);
          if (match.playerB?.id) participatedIds.add(match.playerB.id);
          const winId  = match.winner.id;
          const loser  = match.playerA?.id === winId ? match.playerB : match.playerA;
          if (!loser) return;
          const loseId = loser.id;
          formDeltaMap.set(winId,  (formDeltaMap.get(winId)  ?? 0) + row.win);
          formDeltaMap.set(loseId, (formDeltaMap.get(loseId) ?? 0) + row.loss);
          if (!formHistMap[winId])  formHistMap[winId]  = [];
          if (!formHistMap[loseId]) formHistMap[loseId] = [];
          formHistMap[winId].push({  round: rl, label: `Vence a ${rlFull}`,   delta: row.win,  tournamentName: tournament.name, year: state.year });
          formHistMap[loseId].push({ round: rl, label: `Perde na ${rlFull}`,  delta: row.loss, tournamentName: tournament.name, year: state.year });
        });
      });
      // Uma chave longa não pode transformar um bom torneio em meses de
      // superioridade automática. Consolidamos o saldo por evento.
      for (const [playerId, rawDelta] of formDeltaMap.entries()) {
        const cappedDelta = capTournamentFormDelta(rawDelta);
        formDeltaMap.set(playerId, cappedDelta);
        if (cappedDelta !== rawDelta) {
          if (!formHistMap[playerId]) formHistMap[playerId] = [];
          formHistMap[playerId].push({
            round: 'FORM_CAP',
            label: 'Consolidação da forma no torneio',
            delta: cappedDelta - rawDelta,
            tournamentName: tournament.name,
            year: state.year,
          });
        }
      }
      for (const q of qualifiers ?? []) participatedIds.add(q.id);
      for (const pq of preQualWinners ?? []) participatedIds.add(pq.id);
      const breakingResolvedEvents = [];

      const updatedTourPlayers = tourPlayersWithKits.map(p => {
        // Aplica estado de lesão atualizado da rodada
        let np = injuryMeta[p.id] ?? ensurePhysicalCondition(p);
        // Só quem realmente entrou em quadra acumula desgaste. Retirados e
        // jogadores fora da chave usam o slot para recuperar condição física.
        if (participatedIds.has(p.id) && !withdrawals.has(p.id)) {
          np = decayPhysicalCondition(np, tournament);
        } else {
          np = recoverPhysicalCondition(np);
        }
        // Tick da lesão (avan—a 1 slot)
        np = tickInjury(np);
        const breakingTick = tickBreakingNews(np, {
          year: state.year,
          tournament,
          participated: participatedIds.has(p.id),
        });
        np = breakingTick.player;
        if (breakingTick.events?.length) {
          breakingResolvedEvents.push(...breakingTick.events);
        }
        // Aplica delta de forma (macro — formPoints para ranking)
        const fDelta = formDeltaMap.get(p.id) ?? 0;
        const newFP  = clampFormPoints((np.formPoints ?? 0) + fDelta);
        const newFH  = fDelta !== 0
          ? [...(np.formHistory ?? []), ...(formHistMap[p.id] ?? [])]
          : (np.formHistory ?? []);
        // FASE 2.1 — Atualizar recentForm (micro — por superfície, para motor de jogo)
        // Percorrer os rounds para encontrar a partida deste jogador e seu resultado
        const surf = tournament.surface ?? 'HARD';
        const oppRank = np.rankPosition ?? 99;
        let npWithForm = { ...np, formPoints: newFP, formHistory: newFH, rankPosition: rankMap[p.id] ?? np.rankPosition };

        // FASE 2 (nova): partidas de qualifying — eliminados nunca chegavam ao main draw
        // mas precisam ter recentForm atualizado (IFR congelava para quem s— jogou classify)
        const qualRoundsData = result.qualRoundsData ?? [];
        for (const qm of qualRoundsData) {
          const isA = qm.playerA?.id === p.id;
          const isB = qm.playerB?.id === p.id;
          if (!isA && !isB) continue;
          const opp = isA ? qm.playerB : qm.playerA;
          const won = qm.winner?.id === p.id;
          npWithForm = updateRecentForm(npWithForm, {
            won,
            surface: qm.surface ?? surf,
            oppRank: opp?.rankPosition ?? 99,
            sets: qm.sets ?? [0, 0],
          });
          npWithForm = recordSurfaceMatch(npWithForm, {
            won,
            surface: qm.surface ?? surf,
            year: state.year,
            importance: 0.22,
          });
        }

        const champId = bracket.champion?.id;
        bracketRounds.forEach(round => {
          round.forEach(match => {
            if (match.isBye || !match.winner || !match.playerA || !match.playerB) return;
            const isA = match.playerA.id === p.id;
            const isB = match.playerB.id === p.id;
            if (!isA && !isB) return;
            const opp = isA ? match.playerB : match.playerA;
            const won = match.winner.id === p.id;
            // FASE 3: extrair tiebreaks do match result para tiebreakForm
            const myStats  = isA ? match.result?.stats?.a : match.result?.stats?.b;
            const oppStats = isA ? match.result?.stats?.b : match.result?.stats?.a;
            const tbWon    = myStats?.tiebreaksWon  ?? null;
            const tbLost   = oppStats?.tiebreaksWon ?? null;
            npWithForm = updateRecentForm(npWithForm, {
              won,
              surface: surf,
              oppRank: opp.rankPosition ?? 99,
              sets:    match.result?.sets ?? [0, 0],
              tiebreakWon:  tbWon  !== null && (tbWon  > 0) ? true  : (tbWon  !== null ? false : null),
              tiebreakLost: tbLost !== null && (tbLost > 0) ? true  : null,
            });
            // Surface Identity 2.0: dominio e confianca evoluem; o DNA de
            // formacao permanece imutavel.
            const isFinal = champId && won && match.winner.id === champId &&
              bracketRounds.indexOf(round) === bracketRounds.length - 1;
            npWithForm = recordSurfaceMatch(npWithForm, {
              won,
              surface: surf,
              isTournamentTitle: isFinal,
              isSlam: tournament.category === 'GRAND_SLAM',
              year: state.year,
              importance: tournament.category === 'GRAND_SLAM' ? 1 : isFinal ? 0.72 : 0.38,
            });
          });
        });

        // -- Fase 2: match rating individual (IndividualRating) ------------------
        // Para cada partida do jogador neste torneio, extrai rating da engine completa
        bracketRounds.forEach(round => {
          round.forEach(match => {
            if (match.isBye || !match.result?.stats || !match.playerA || !match.playerB) return;
            const isA = match.playerA.id === p.id;
            const isB = match.playerB.id === p.id;
            if (!isA && !isB) return;
            const matchStats = isA ? match.result.stats.a : match.result.stats.b;
            if (!matchStats) return;
            // shotCount: total de golpes (engine completa tem attackShots/defenseShots)
            const shotCount = (matchStats.attackShots ?? 0) + (matchStats.defenseShots ?? 0) +
              (matchStats.qualityCount ?? matchStats.winners ?? 0);
            if (shotCount > 0 || matchStats.qualityCount > 0) {
              const rating = computeRating(matchStats, Math.max(shotCount, matchStats.qualityCount ?? 1));
              npWithForm = pushMatchRating(npWithForm, rating.score);
            } else {
              // Fallback para FastSimulation: usa winners/aces/erros para efici—ncia b—sica
              const w   = matchStats.winners ?? 0;
              const a   = matchStats.aces    ?? 0;
              const ue  = matchStats.unforcedErrors ?? 0;
              const fe  = matchStats.forcedErrors   ?? 0;
              const est = Math.max(w + a + ue + fe, 1);
              if (est > 1) {
                const effRating = computeRating(
                  { ...matchStats, attackShots: w + a, defenseShots: fe, qualityCount: 0 },
                  est
                );
                npWithForm = pushMatchRating(npWithForm, effRating.score);
              }
            }
          });
        });

        // -- Fase 2: atualiza IFR + Visibilidade + SponsorSignal ----------------
        npWithForm = updatePlayerPhaseTwo(npWithForm, {
          year: state.year,
          newsEngine:    state.newsEngine    ?? null,
          rivalrySystem: state.rivalrySystem ?? null,
          allPlayers:    state.tourPlayers,
        });

        return npWithForm;
      });

      const updatedJuniors = state.prospects.map((p, idx) => {
        const junior = {
          ...ensurePhysicalCondition(p),
          rankPosition: prospectRankMap[p.id] ?? p.rankPosition ?? (idx + 1),
          circuitLevel: 'JUNIOR',
          isProspect: true,
        };
        if (!isJuniors) return junior;
        const circuitResult = pointMap.get?.(p.id);
        return recordJuniorCircuitTournament(junior, tournament, {
          ...circuitResult,
          isChampion: bracket.champion?.id === p.id,
          isFinalist: bracket.finalist?.id === p.id,
        }, state.year, { cohortUniverse: state.youthCohortUniverse });
      });
      // Evento narrativo
      const champ = bracket.champion;
      const newEvents = [];
      if (champ) newEvents.push({ type: 'title', text: `${champ.name} vence ${tournament.name}`, tournamentId, year: state.year });
      newEvents.push(...injuryEventsForTimeline);

      // -- Olimp—adas: atualiza careerTitles.olympic nos jogadores --------------
      if (tournament.isOlympic) {
        const _rounds = bracket.rounds ?? [];
        const _finalMatch = _rounds.at(-1)?.[0];
        const _sfRound = _rounds.at(-2) ?? [];
        const _finalistId = _finalMatch
          ? (_finalMatch.playerA?.id === champ?.id ? _finalMatch.playerB?.id : _finalMatch.playerA?.id)
          : null;
        const _bronzeIds = new Set();
        for (const m of _sfRound) {
          if (m.isBye || !m.winner || !m.playerA || !m.playerB) continue;
          const _loser = m.playerA.id === m.winner.id ? m.playerB : m.playerA;
          if (_loser) _bronzeIds.add(_loser.id);
        }
        // Aplica medals nos updatedTourPlayers depois (override feito logo abaixo)
        for (let _i = 0; _i < updatedTourPlayers.length; _i++) {
          const _p = updatedTourPlayers[_i];
          const _oly = { ...(_p.careerTitles?.olympic ?? { gold: 0, silver: 0, bronze: 0 }) };
          if (champ && _p.id === champ.id)         _oly.gold   = (_oly.gold   ?? 0) + 1;
          else if (_p.id === _finalistId)           _oly.silver = (_oly.silver ?? 0) + 1;
          else if (_bronzeIds.has(_p.id))           _oly.bronze = (_oly.bronze ?? 0) + 1;
          else continue;
          updatedTourPlayers[_i] = {
            ..._p,
            careerTitles: { ...(_p.careerTitles ?? {}), olympic: _oly },
          };
        }
        if (champ) newEvents.push({ type: 'olympic_gold', text: `${champ.name} conquista ouro ol—mpico`, tournamentId, year: state.year });
      }

      // -- Les—es em campo e abandonos (do resultado de cada partida do bracket) --
      const bracketRoundsForInMatch = result.bracket?.rounds ?? [];
      for (const round of bracketRoundsForInMatch) {
        for (const match of round) {
          if (!match.result) continue;
          // Abandono
          if (match.result.retirement) {
            const ret = match.result.retirement;
            newEvents.push({
              type: 'in_match_retirement',
              text: `${ret.playerName} abandona partida em ${tournament.name} por lesão (${ret.injuryType})`,
              playerId: ret.playerId,
              playerName: ret.playerName,
              year: state.year,
              injury: { grade: ret.severity === 'SEVERE' ? 3 : 2, type: ret.injuryType },
            });
          }
          // MTO sem abandono
          if (match.result.inMatchInjuryEvents?.length > 0 && !match.result.retirement) {
            for (const ev of match.result.inMatchInjuryEvents.slice(0, 1)) {
              if (ev.type === 'in_match_injury') {
                const player = state.tourPlayers.find(p => p.id === ev.playerId);
                const pos = player?.rankPosition ?? 99;
                if (pos <= 30) { // s— logar MTO de top-30
                  newEvents.push({
                    ...ev,
                    year: state.year,
                    text: `${ev.playerName} para para atendimento m—dico em ${tournament.name}`,
                  });
                }
              }
            }
          }
        }
      }

      // -- RIVALIDADES: alimenta sistema com cada partida do bracket --
      const rs = state.rivalrySystem;
      if (rs) {
        const totalRounds = bracketRounds.length;
        bracketRounds.forEach((round, roundIdx) => {
          const fromEnd = totalRounds - 1 - roundIdx;
          const rl = fromEnd === 0 ? 'F' : fromEnd === 1 ? 'SF' : fromEnd === 2 ? 'QF' : fromEnd === 3 ? 'R16' : 'R32';
          round.forEach(match => {
            if (match.isBye || !match.winner || !match.playerA || !match.playerB) return;
            const winnerId = match.winner.id;
            const loserId  = (match.playerA.id === winnerId ? match.playerB : match.playerA).id;
            rs.updateFromMatch({
              player1Id:  match.playerA.id,
              player2Id:  match.playerB.id,
              winnerId,
              round:      rl,
              category:   tournament.category,
              tournament: tournament.name,
              season:     state.year,
              setsDetail: match.result?.setsDetail ?? [],
            }, { players: [...updatedTourPlayers, ...updatedJuniors] });
          });
        });
      }

      const newResult = { bracket, qualifiers, preQualWinners: preQualWinners ?? [], tournament };
      const storedResult = compactTournamentResultForRuntime(newResult);

      // -- Records Store: atualiza incrementalmente -------------------
      const allPlayersForSnap = [...(state.tourPlayers ?? []), ...(state.prospects ?? [])];
      const entryRankById = Object.fromEntries([
        ...(state.rankingStore?.ranked ?? []).map((row, index) => [row.playerId, row.position ?? index + 1]),
        ...(state.rankingStore?.prospectRanked ?? []).map((row, index) => [row.playerId, row.position ?? index + 1]),
      ]);
      const snapMap = Object.fromEntries(allPlayersForSnap.map(p => [p.id, {
        ...p,
        rankPosition: p.rankPosition ?? entryRankById[p.id] ?? null,
      }]));
      const currentRecordsStore = getOrMigrateRecordsStore(state);
      // Deep-copy cada objeto de stats individual para evitar muta——o de refer—ncias
      // compartilhadas quando o React StrictMode invoca o reducer duas vezes.
      // Um shallow spread ({ ...currentRecordsStore.playerStats }) copia apenas as
      // chaves do mapa — os objetos internos continuam sendo a mesma refer—ncia, ent—o
      // os ++ do updateRecordsStoreWithResult corrompem o estado "original" na 2— chamada.
      const updatedRecordsStore = {
        _version: 1,
        playerStats: Object.fromEntries(
          Object.entries(currentRecordsStore.playerStats).map(([id, v]) => [id, {
            ...v,
            gsWonIds:   [...(v.gsWonIds   ?? [])],
            titleYears: [...(v.titleYears ?? [])],
            surfWins:   { ...(v.surfWins   ?? {}) },
            surfLosses: { ...(v.surfLosses ?? {}) },
            surfTitles: { ...(v.surfTitles ?? {}) },
            pointWinsByType: { ...(v.pointWinsByType ?? {}) },
            seasonData: Object.fromEntries(
              Object.entries(v.seasonData ?? {}).map(([yr, sd]) => [yr, {
                ...sd,
                pointWinsByType: { ...(sd.pointWinsByType ?? {}) },
                performance: sd.performance ? {
                  ...sd.performance,
                  byType: { ...(sd.performance.byType ?? {}) },
                  pointWinsByType: { ...(sd.performance.pointWinsByType ?? {}) },
                } : undefined,
                surfaces: Object.fromEntries(
                  Object.entries(sd.surfaces ?? {}).map(([surface, surfaceData]) => [surface, {
                    ...surfaceData,
                    performance: surfaceData.performance ? {
                      ...surfaceData.performance,
                      byType: { ...(surfaceData.performance.byType ?? {}) },
                      pointWinsByType: { ...(surfaceData.performance.pointWinsByType ?? {}) },
                    } : undefined,
                  }])
                ),
              }])
            ),
          }])
        ),
      };
      updateRecordsStoreWithResult(updatedRecordsStore, newResult, state.year, snapMap);
      tournamentDebugLog('reducer:records:done', {
        tournamentId,
        playerStats: Object.keys(updatedRecordsStore.playerStats ?? {}).length,
      });

      // -- Fase 4/5: monitorar contratos ativos após torneio --------
      let postMonitorTourPlayers = updatedTourPlayers;
      let postMonitorJuniors   = updatedJuniors;
      let postMonitorPool        = state.sponsorPool;
      let postMonitorCoachMarket = state.coachMarket;
      let postMonitorNews        = [];
      let pulseDevEvents         = [];
      let monthlyInterviewArchive = state.monthlyInterviews ?? [];
      let grandSlamInterviewArchive = state.grandSlamInterviews ?? [];
      let breakingWaveEvents     = [];
      let nextCircuitShockState  = state.circuitShock;
      if (state.sponsorPool) {
        const gsWinnerId = tournament?.category === 'GRAND_SLAM'
          ? bracket?.champion?.id ?? null : null;
        const injured6plus = [...updatedTourPlayers, ...updatedJuniors]
          .filter(p => p.injury?.active && (p.injury?.monthsOut ?? 0) >= 6);
        const monResult = monitorContracts(
          { ...state, players: [...updatedTourPlayers, ...updatedJuniors] },
          { tournament, grandSlamWinnerId: gsWinnerId, injuredPlayers: injured6plus }
        );
        const monMap = Object.fromEntries((monResult.state.players ?? []).map(p => [p.id, p]));
        postMonitorTourPlayers = updatedTourPlayers.map(p => monMap[p.id] ?? p);
        postMonitorJuniors   = updatedJuniors.map(p => monMap[p.id] ?? p);
        postMonitorPool        = monResult.state.sponsorPool ?? state.sponsorPool;
        if (monResult.news.length > 0 && state.newsEngine) {
          // Cap: m—ximo 2 artigos de patroc—nio por torneio.
          // Prioriza ELITE e jogadores melhor ranqueados.
          const _monNewsSorted = [...monResult.news].sort((a, b) => {
            const aElite = (a.type === 'SPONSOR_ELITE') ? 1 : 0;
            const bElite = (b.type === 'SPONSOR_ELITE') ? 1 : 0;
            if (aElite !== bElite) return bElite - aElite;
            return (a.player?.rankPosition ?? 999) - (b.player?.rankPosition ?? 999);
          });
          postMonitorNews = _monNewsSorted.slice(0, 2);
        }
      }

      const nextCalendarIndex = state.calendarIndex + 1;
      const nextTournament = CALENDAR[nextCalendarIndex] ?? null;
      tournamentDebugLog('reducer:next-tournament:start', {
        tournamentId,
        nextCalendarIndex,
        nextTournamentId: nextTournament?.id ?? null,
        nextTournamentName: nextTournament?.name ?? null,
      });
      if (nextTournament) {
        const breakingWave = maybeTriggerBreakingNews(
          postMonitorTourPlayers,
          state.year,
          state,
          { phase: 'TOURNAMENT', tournament: nextTournament },
        );
        postMonitorTourPlayers = breakingWave.players ?? postMonitorTourPlayers;
        breakingWaveEvents = breakingWave.events ?? [];
        nextCircuitShockState = breakingWave.directorState ?? nextCircuitShockState;
      }
      postMonitorTourPlayers = updateCareerMemoriesForTournament(postMonitorTourPlayers, {
        tournament,
        bracket,
        year: state.year,
        previousPlayers: state.tourPlayers,
        rivalrySystem: state.rivalrySystem ?? null,
      });
      postMonitorJuniors = updateCareerMemoriesForTournament(postMonitorJuniors, {
        tournament,
        bracket,
        year: state.year,
        previousPlayers: state.prospects,
        rivalrySystem: state.rivalrySystem ?? null,
      });
      const shouldPrepareNextPackage = shouldPrebuildTournamentPackage(nextTournament);
      const playerSeasonSlotsAfterCurrent = result.playerSeasonSlotsAfterSelection ?? state.playerSeasonSlots ?? {};
      const shouldReusePairedPackage = !!(
        nextTournament &&
        shouldPrepareNextPackage &&
        isParallelWeekATPEvent(nextTournament) &&
        state.preparedTournamentPackageCache?.[nextTournament.id] &&
        state.preparedTournamentPackageCache?.[nextTournament.id]?.radarFollowSignature === radarFollowSignature(state.radar?.followedPlayerIds) &&
        tournament?.parallelGroup &&
        nextTournament.parallelGroup === tournament.parallelGroup
      );
      if (nextTournament && !shouldPrepareNextPackage) {
        tournamentDebugLog('reducer:next-package:skipped', {
          tournamentId,
          nextTournamentId: nextTournament.id,
          nextTournamentName: nextTournament.name,
          category: nextTournament.category,
        });
      }
      const nextPreparedBundle = nextTournament && shouldPrepareNextPackage
        ? (
            shouldReusePairedPackage
              ? {
                  currentPackage: state.preparedTournamentPackageCache?.[nextTournament.id] ?? null,
                  packageCache: state.preparedTournamentPackageCache ?? {},
                }
              : buildPreparedTournamentPackageBundle(
                  nextTournament,
                  postMonitorTourPlayers,
                  postMonitorJuniors,
                  playerSeasonSlotsAfterCurrent,
                  state.year,
                  {
                    followedPlayerIds: state.radar?.followedPlayerIds ?? [],
                    rivalrySystem: state.rivalrySystem ?? null,
                  },
                )
          )
        : { currentPackage: null, packageCache: {} };
      const nextPreparedTournamentPackage = nextPreparedBundle.currentPackage;
      tournamentDebugLog('reducer:next-package:done', {
        tournamentId,
        nextTournamentId: nextTournament?.id ?? null,
        hasPackage: !!nextPreparedTournamentPackage,
        cacheSize: Object.keys(nextPreparedBundle.packageCache ?? {}).length,
      });
      const seasonPulseResult = runSeasonPulse({
        ...state,
        sponsorPool: postMonitorPool,
        rankingStore: newStore,
        recordsStore: updatedRecordsStore,
        tourPlayers: postMonitorTourPlayers,
        prospects: postMonitorJuniors.length ? postMonitorJuniors : updatedJuniors,
        tournamentResults: {
          ...state.tournamentResults,
          [tournamentId]: storedResult,
        },
        calendarIndex: nextCalendarIndex,
      }, {
        phase: SEASON_PULSE_PHASES.POST_TOURNAMENT,
        tournament,
        result: newResult,
        year: state.year,
        weekIndex: tournament?.weekIndex ?? state.calendarIndex,
      });
      // O aniversário é uma mudança civil, não um efeito de fechamento anual.
      // Sincronizamos todos antes dos pulsos de vida, equipe e mercado.
      postMonitorTourPlayers = postMonitorTourPlayers.map(player =>
        ensurePlayerBirthDate(player, seasonPulseResult.timing?.date, state.year)
      );
      postMonitorJuniors = postMonitorJuniors.map(player =>
        ensurePlayerBirthDate(player, seasonPulseResult.timing?.date, state.year)
      );
      const hasMonthlyPulse = seasonPulseResult.pulses?.some(
        pulse => pulse.type === SEASON_PULSE_PHASES.MONTHLY
      );
      // Janeiro começa com o reset sazonal. A partir da primeira troca real
      // de mês, a forma perde 18% do saldo e precisa ser renovada em quadra.
      const shouldRegressMonthlyForm = hasMonthlyPulse
        && state.seasonPulseState?.lastMonthIndex != null;
      if (shouldRegressMonthlyForm) {
        const regressPlayerForm = (player) => {
          const before = clampFormPoints(player?.formPoints ?? 0);
          const after = applyMonthlyFormRegression(before);
          if (before === after) return player;
          return {
            ...player,
            formPoints: after,
            formHistory: [
              ...(player.formHistory ?? []),
              {
                round: 'MONTHLY_REGRESSION',
                label: 'Forma regressa em direção ao nível normal',
                delta: after - before,
                tournamentName: 'Ciclo mensal',
                year: state.year,
                monthIndex: seasonPulseResult.timing?.monthIndex ?? null,
              },
            ].slice(-180),
          };
        };
        postMonitorTourPlayers = postMonitorTourPlayers.map(regressPlayerForm);
        postMonitorJuniors = postMonitorJuniors.map(regressPlayerForm);
      }
      try {
        const coachPulse = runCoachRelationshipPulse({
          players: postMonitorTourPlayers,
          prospects: postMonitorJuniors,
          coachMarket: postMonitorCoachMarket,
          year: state.year,
          context: {
            tournament,
            participatedIds,
            // A timeline pública filtra lesões menores, mas a equipe sente todas elas.
            injuryIds: new Set(injEventsRaw.map(event => event?.playerId).filter(Boolean)),
            formDeltaMap,
            winnerId: bracket?.champion?.id ?? null,
            monthlyPulse: seasonPulseResult.pulses?.some(pulse => pulse.type === SEASON_PULSE_PHASES.MONTHLY),
            worldDate: seasonPulseResult.timing?.date,
            monthIndex: seasonPulseResult.timing?.monthIndex,
          },
        });
        postMonitorTourPlayers = coachPulse.players ?? postMonitorTourPlayers;
        postMonitorJuniors = coachPulse.prospects ?? postMonitorJuniors;
        postMonitorCoachMarket = coachPulse.coachMarket ?? postMonitorCoachMarket;
        if (coachPulse.events?.length) newEvents.push(...coachPulse.events);
        if (coachPulse.events?.length) {
          const playerLookup = Object.fromEntries([...postMonitorTourPlayers, ...postMonitorJuniors].map(player => [player.id, player]));
          const coachArticles = coachPulse.events
            .filter(event => ['COACH_TOURNAMENT_HIGH', 'COACH_INJURY_TENSION', 'COACH_TOURNAMENT_TENSION'].includes(event.type))
            .map(event => coachEventToNews(event, playerLookup[event.playerId], postMonitorCoachMarket?.coachesById?.[event.coachId]))
            .filter(Boolean)
            .slice(0, 2);
          if (coachArticles.length) postMonitorNews = [...postMonitorNews, ...coachArticles];
        }
      } catch (error) {
        console.warn('[CoachPulse] erro:', error?.message);
      }
      if (state.sponsorPool && seasonPulseResult.pulses?.some(p => p.type === SEASON_PULSE_PHASES.MONTHLY)) {
        try {
          const sponsorPulse = runSponsorshipPulse({
            ...state,
            players: [...postMonitorTourPlayers, ...postMonitorJuniors],
            sponsorPool: postMonitorPool,
            seasonPulseState: seasonPulseResult.state.seasonPulseState,
            year: state.year,
            worldDate: seasonPulseResult.timing?.date,
          }, seasonPulseResult);
          const pulsePlayerMap = Object.fromEntries((sponsorPulse.state.players ?? []).map(p => [p.id, p]));
          postMonitorTourPlayers = postMonitorTourPlayers.map(p => pulsePlayerMap[p.id] ?? p);
          postMonitorJuniors = postMonitorJuniors.map(p => pulsePlayerMap[p.id] ?? p);
          postMonitorPool = sponsorPulse.state.sponsorPool ?? postMonitorPool;

          if (sponsorPulse.news?.length > 0) {
            const pulseNewsSorted = [...sponsorPulse.news].sort((a, b) => {
              const aElite = a.type === 'SPONSOR_ELITE' ? 1 : 0;
              const bElite = b.type === 'SPONSOR_ELITE' ? 1 : 0;
              if (aElite !== bElite) return bElite - aElite;
              return (a.player?.rankPosition ?? 999) - (b.player?.rankPosition ?? 999);
            });
            postMonitorNews = [...postMonitorNews, ...pulseNewsSorted.slice(0, 3)];
          }

          if (sponsorPulse.chronicleEvents?.length > 0 && state.chronicleEngine) {
            state.chronicleEngine._sponsorEvents = [
              ...(state.chronicleEngine._sponsorEvents ?? []),
              ...sponsorPulse.chronicleEvents,
            ].slice(-160);
            if (state.newsEngine) {
              const eliteMilestoneArticles = generateSponsorNewsFromChronicleEvents(
                sponsorPulse.chronicleEvents,
                postMonitorTourPlayers,
                state.year,
              );
              postMonitorNews = [...postMonitorNews, ...eliteMilestoneArticles.slice(0, 2)];
            }
          }
        } catch (e) {
          console.warn('[SponsorshipPulse] erro:', e?.message);
        }
      }
      let lifeEventsByPlayer = {};
      if (seasonPulseResult.pulses?.some(p => p.type === SEASON_PULSE_PHASES.MONTHLY)) {
        try {
          const lifePulse = runLifePulseEvents(
            [...postMonitorTourPlayers, ...postMonitorJuniors].map(p => migratePlayerLifeData(p)),
            state.year,
            {
              pulses: seasonPulseResult.pulses,
              rankMap,
              prospectRankMap,
              titleWinners: bracket?.champion?.id ? { [bracket.champion.id]: tournament } : {},
              chanceMultiplier: 0.08,
              maxEvents: 1,
              worldDate: seasonPulseResult.timing?.date,
            }
          );
          const lifePulseMap = Object.fromEntries((lifePulse.players ?? []).map(p => [p.id, p]));
          lifeEventsByPlayer = Object.fromEntries((lifePulse.results ?? []).map(result => [result.player?.id, result.events ?? []]).filter(([id]) => !!id));
          postMonitorTourPlayers = postMonitorTourPlayers.map(p => lifePulseMap[p.id] ?? p);
          postMonitorJuniors = postMonitorJuniors.map(p => lifePulseMap[p.id] ?? p);

          const lifeNews = (lifePulse.events ?? [])
            .filter(e => e.newsworthy)
            .slice(0, 4)
            .map(event => {
              const player = lifePulse.results?.find(r => (r.events ?? []).includes(event))?.player;
              return player ? genLifeEventArticle(player, event, state.year) : null;
            })
            .filter(Boolean);
          if (lifeNews.length > 0) postMonitorNews = [...postMonitorNews, ...lifeNews];
        } catch (e) {
          console.warn('[LifePulse] erro:', e?.message);
        }
      }
      if (seasonPulseResult.pulses?.some(p => p.type === SEASON_PULSE_PHASES.MONTHLY)) {
        const lifeSimulation = processMonthlyLifeSimulation(
          [...postMonitorTourPlayers, ...postMonitorJuniors],
          seasonPulseResult.timing?.date ?? { year: state.year, month: seasonPulseResult.timing?.monthIndex ?? 1 },
          lifeEventsByPlayer,
        );
        const lifeSimulationMap = Object.fromEntries((lifeSimulation.players ?? []).map(player => [player.id, player]));
        postMonitorTourPlayers = postMonitorTourPlayers.map(player => lifeSimulationMap[player.id] ?? player);
        postMonitorJuniors = postMonitorJuniors.map(player => lifeSimulationMap[player.id] ?? player);
        newEvents.push(...(lifeSimulation.events ?? []));
        const propertyPulse = processMonthlyPropertyPortfolio(
          [...postMonitorTourPlayers, ...postMonitorJuniors],
          seasonPulseResult.timing?.date ?? { year: state.year, month: seasonPulseResult.timing?.monthIndex ?? 1 },
        );
        const propertyMap = Object.fromEntries((propertyPulse.players ?? []).map(player => [player.id, player]));
        postMonitorTourPlayers = postMonitorTourPlayers.map(player => propertyMap[player.id] ?? player);
        postMonitorJuniors = postMonitorJuniors.map(player => propertyMap[player.id] ?? player);
        newEvents.push(...(propertyPulse.events ?? []));
      }
      if (seasonPulseResult.pulses?.some(p => p.type === SEASON_PULSE_PHASES.MONTHLY)) {
        const retirementPulse = refreshMonthlyRetirementOutlook(
          [...postMonitorTourPlayers, ...postMonitorJuniors],
          seasonPulseResult.timing?.date,
          { ...state.tournamentResults, [tournamentId]: storedResult },
        );
        const retirementMap = Object.fromEntries((retirementPulse.players ?? []).map(player => [player.id, player]));
        postMonitorTourPlayers = postMonitorTourPlayers.map(player => retirementMap[player.id] ?? player);
        postMonitorJuniors = postMonitorJuniors.map(player => retirementMap[player.id] ?? player);
        newEvents.push(...(retirementPulse.events ?? []));
      }
      if (seasonPulseResult.pulses?.some(p => p.type === SEASON_PULSE_PHASES.MONTHLY)) {
        try {
          const championId = bracket?.champion?.id ?? null;
          const pulseTitleWinners = championId
            ? { [championId]: DEV_TITLE_BY_CATEGORY[tournament?.category] ?? 'ATP250' }
            : {};
          const devBeforePlayers = [...postMonitorTourPlayers, ...postMonitorJuniors];
          const devPulse = advanceSeason(
            devBeforePlayers,
            seasonPulseResult.timing?.date ?? { year: state.year, month: seasonPulseResult.timing?.monthIndex ?? 1 },
            1,
            pulseTitleWinners,
            {},
            { recordSeasonLedger: false },
          );
          const devLedgerPlayers = applyRTDDevelopmentLedger(
            devBeforePlayers,
            devPulse.updatedPlayers ?? devBeforePlayers,
            state.year,
            seasonPulseResult.timing?.monthIndex ?? null,
          );
          const devMap = Object.fromEntries(devLedgerPlayers.map(p => [p.id, p]));
          postMonitorTourPlayers = postMonitorTourPlayers.map(p => devMap[p.id] ?? p);
          postMonitorJuniors = postMonitorJuniors.map(p => devMap[p.id] ?? p);
          pulseDevEvents = (devPulse.events ?? []).map(e => ({
            ...e,
            year: state.year,
            monthIndex: seasonPulseResult.timing?.monthIndex ?? null,
            source: 'MONTHLY_DEVELOPMENT_PULSE',
          }));
        } catch (e) {
          console.warn('[DevelopmentPulse] erro:', e?.message);
        }
      }
      if (seasonPulseResult.pulses?.some(p => p.type === SEASON_PULSE_PHASES.MONTHLY)) {
        const hypePulse = processMonthlyHype(
          [...postMonitorTourPlayers, ...postMonitorJuniors],
          seasonPulseResult.timing?.date ?? { year: state.year, month: seasonPulseResult.timing?.monthIndex ?? 1 },
          { winnerId: bracket?.champion?.id ?? null, formDeltaMap, tournamentCategory: tournament?.category },
        );
        const hypeMap = Object.fromEntries((hypePulse.players ?? []).map(player => [player.id, player]));
        postMonitorTourPlayers = postMonitorTourPlayers.map(player => hypeMap[player.id] ?? player);
        postMonitorJuniors = postMonitorJuniors.map(player => hypeMap[player.id] ?? player);
        newEvents.push(...(hypePulse.events ?? []));
      }
      if (seasonPulseResult.pulses?.some(p => p.type === SEASON_PULSE_PHASES.MONTHLY)) {
        const monthIndex = seasonPulseResult.timing?.monthIndex ?? 1;
        postMonitorTourPlayers = postMonitorTourPlayers.map(p =>
          processMonthlyFinances(initPlayerFinance(p), state.year, monthIndex).player
        );
        postMonitorJuniors = postMonitorJuniors.map(p =>
          processMonthlyFinances(initPlayerFinance(p), state.year, monthIndex).player
        );
      }
      if (seasonPulseResult.pulses?.some(p => p.type === SEASON_PULSE_PHASES.MONTHLY)) {
        const pulseArticles = generateSeasonPulseNews(
          seasonPulseResult,
          {
            ...state,
            tourPlayers: postMonitorTourPlayers,
            prospects: postMonitorJuniors,
          },
          { developmentEvents: pulseDevEvents }
        );
        if (pulseArticles.length > 0) postMonitorNews = [...postMonitorNews, ...pulseArticles.slice(0, 1)];
      }
      if (seasonPulseResult.pulses?.some(p => p.type === SEASON_PULSE_PHASES.MONTHLY)) {
        try {
          const monthlyInterview = generateMonthlyInterviewFeature({
            ...state,
            tourPlayers: postMonitorTourPlayers,
            prospects: postMonitorJuniors,
            monthlyInterviews: monthlyInterviewArchive,
          }, seasonPulseResult);
          if (monthlyInterview?.interview) {
            monthlyInterviewArchive = [...monthlyInterviewArchive, monthlyInterview].slice(-36);
            const latest = monthlyInterview.summary ?? summarizeInterviewForPlayer(monthlyInterview.interview);
            postMonitorTourPlayers = postMonitorTourPlayers.map(p =>
              p.id === monthlyInterview.playerId
                ? { ...p, latestInterview: latest }
                : p
            );
            postMonitorJuniors = postMonitorJuniors.map(p =>
              p.id === monthlyInterview.playerId
                ? { ...p, latestInterview: latest }
                : p
            );
          }
        } catch (e) {
          console.warn('[MonthlyInterview] erro:', e?.message);
        }
      }
      if (tournament?.category === 'GRAND_SLAM' && bracket?.champion?.id) {
        try {
          const champion = postMonitorTourPlayers.find(p => p.id === bracket.champion.id)
            ?? postMonitorJuniors.find(p => p.id === bracket.champion.id)
            ?? bracket.champion;
          const slamInterview = generateGrandSlamChampionInterviewFeature({
            ...state,
            tourPlayers: postMonitorTourPlayers,
            prospects: postMonitorJuniors,
            tournamentResults: {
              ...state.tournamentResults,
              [tournamentId]: storedResult,
            },
            grandSlamInterviews: grandSlamInterviewArchive,
          }, tournament, champion, newResult);
          if (slamInterview?.interview) {
            grandSlamInterviewArchive = [...grandSlamInterviewArchive, slamInterview].slice(-32);
            const latest = slamInterview.summary ?? summarizeInterviewForPlayer(slamInterview.interview);
            postMonitorTourPlayers = postMonitorTourPlayers.map(p =>
              p.id === slamInterview.playerId
                ? { ...p, latestInterview: latest }
                : p
            );
            postMonitorJuniors = postMonitorJuniors.map(p =>
              p.id === slamInterview.playerId
                ? { ...p, latestInterview: latest }
                : p
            );
          }
        } catch (e) {
          console.warn('[GrandSlamInterview] erro:', e?.message);
        }
      }

      // Um veredito confirmado repercute nos contratos. Investigação não é
      // condenação: CLEARED/INCONCLUSIVE nunca acionam rompimento comercial.
      for (const shockEvent of [...breakingResolvedEvents, ...breakingWaveEvents]) {
        if (!(shockEvent.sponsorSeverity > 0) || !postMonitorPool) continue;
        const accused = postMonitorTourPlayers.find(p => p.id === shockEvent.playerId);
        if (!accused) continue;
        try {
          const scandalResult = handleScandal({
            ...state,
            sponsorPool: postMonitorPool,
            tourPlayers: postMonitorTourPlayers,
            prospects: postMonitorJuniors,
          }, accused, shockEvent.sponsorSeverity);
          postMonitorPool = scandalResult.state.sponsorPool;
          postMonitorTourPlayers = scandalResult.state.tourPlayers ?? postMonitorTourPlayers;
          postMonitorJuniors = scandalResult.state.prospects ?? postMonitorJuniors;
          postMonitorNews.push(...(scandalResult.news ?? []));
        } catch (e) {
          console.warn('[CircuitShock:Sponsors] erro:', e?.message);
        }
      }

      const postStateView = {
        ...state,
        worldDate: seasonPulseResult.timing?.date ?? state.worldDate ?? createWorldDate(state.year, 1),
        nextTournament,
        tourPlayers: postMonitorTourPlayers,
        prospects: postMonitorJuniors.length ? postMonitorJuniors : updatedJuniors,
        tournamentResults: {
          ...state.tournamentResults,
          [tournamentId]: storedResult,
        },
      };
      let badgeNewsArticles = [];
      try {
        const championId = bracket?.champion?.id ?? getResChampion(newResult)?.id ?? null;
        if (championId) {
          const beforePlayer = [...(state.tourPlayers ?? []), ...(state.prospects ?? [])].find(p => p.id === championId) ?? bracket?.champion ?? null;
          const afterPlayer = [...(postMonitorTourPlayers ?? []), ...(postMonitorJuniors ?? [])].find(p => p.id === championId) ?? beforePlayer;
          const beforeBadges = getPlayerBadges(beforePlayer, {
            tournamentResults: state.tournamentResults ?? {},
            historicalTournamentResults: state.historicalTournamentResults ?? {},
            allPlayers: [...(state.tourPlayers ?? []), ...(state.prospects ?? [])],
            currentYear: state.year,
          });
          const afterBadges = getPlayerBadges(afterPlayer, {
            tournamentResults: postStateView.tournamentResults ?? {},
            historicalTournamentResults: state.historicalTournamentResults ?? {},
            allPlayers: [...(postMonitorTourPlayers ?? []), ...(postMonitorJuniors ?? [])],
            currentYear: state.year,
          });
          const unlocks = diffBadgeUnlocks(beforeBadges, afterBadges)
            .filter(b => ['titles', 'slams', 'masters', 'finals', 'surface', 'tournament'].includes(b.category));
          badgeNewsArticles = generateBadgeNewsArticles({
            player: afterPlayer,
            unlocks,
            tournament,
            year: state.year,
          });
        }
      } catch (e) {
        console.warn('[BadgeSystem] erro ao gerar noticias:', e?.message);
      }
      const breakingEvents = [...breakingResolvedEvents, ...breakingWaveEvents].map(e => ({ ...e, year: e.year ?? state.year }));
      const postNewsArticles = isJuniors
        ? generateYouthCircuitCoverage({
          tournament,
          bracket,
          prospects: postStateView.prospects,
          year: state.year,
        })
        : generateTournamentNews(tournament, bracket, postStateView, result).slice(0, 6);
      tournamentDebugLog('reducer:news:post-generated', {
        tournamentId,
        postNews: postNewsArticles.length,
      });
      const previewNewsArticles = nextTournament && nextPreparedTournamentPackage
        ? (isJuniorTournament(nextTournament)
          ? generateYouthCircuitPreview({
            tournament: nextTournament,
            preparedPackage: nextPreparedTournamentPackage,
            prospects: postStateView.prospects,
            year: state.year,
          })
          : generateUpcomingTournamentNews(nextTournament, nextPreparedTournamentPackage, postStateView, { seasonStart: false }).slice(0, 2))
        : [];
      tournamentDebugLog('reducer:news:preview-generated', {
        tournamentId,
        previewNews: previewNewsArticles.length,
      });
      const breakingNewsArticles = generateBreakingNewsArticles(breakingEvents, postMonitorTourPlayers, state.year);
      const breakingFollowupArticles = generateBreakingTournamentFollowups(
        tournament,
        { bracket, qualifiers, preQualWinners: preQualWinners ?? [] },
        postStateView,
      );
      const relationalArticles = [
        ...postNewsArticles.filter(article => !article.isYouthCircuitCoverage),
        ...breakingFollowupArticles,
        ...breakingNewsArticles,
      ];
      const relationalResult = applyNarrativeConsequences({
        players: postMonitorTourPlayers,
        articles: relationalArticles,
        rivalrySystem: state.rivalrySystem ?? null,
        year: state.year,
        stateLike: postStateView,
      });
      const relationalTourPlayers = relationalResult.players ?? postMonitorTourPlayers;
      if (state.newsEngine) {
        state.newsEngine.push([...postNewsArticles, ...previewNewsArticles]);
        if (postMonitorNews.length > 0) state.newsEngine.append(postMonitorNews);
        if (badgeNewsArticles.length > 0) state.newsEngine.append(badgeNewsArticles);
        if (breakingFollowupArticles.length > 0) state.newsEngine.append(breakingFollowupArticles);
        if (breakingNewsArticles.length > 0) state.newsEngine.append(breakingNewsArticles);
      }

      // A edição pós-torneio usa a mudança real de ranking, pressão, rivalidade
      // e resultados desta chave; ela também sobrevive no save como memória curta.
      const circuitShift = buildCircuitShift({
        tournament,
        bracket,
        beforePlayers: state.tourPlayers,
        afterPlayers: relationalTourPlayers,
        nextTournament,
        rivalrySystem: state.rivalrySystem ?? null,
        articles: relationalArticles,
        year: state.year,
      });

      tournamentDebugLog('reducer:apply:return-state', {
        tournamentId,
        nextCalendarIndex,
        calendarAdvancedTo: nextTournament?.name ?? null,
        tourPlayers: relationalTourPlayers.length,
        prospects: (postMonitorJuniors.length ? postMonitorJuniors : updatedJuniors).length,
      });

      return {
        ...state,
        worldDate: seasonPulseResult.timing?.date ?? state.worldDate ?? createWorldDate(state.year, 1),
        sponsorPool: postMonitorPool,
        coachMarket: postMonitorCoachMarket,
        rankingStore: newStore,
        recordsStore: updatedRecordsStore,
        tourPlayers: relationalTourPlayers,
        prospects: postMonitorJuniors.length ? postMonitorJuniors : updatedJuniors,
        playerSeasonSlots: playerSeasonSlotsAfterCurrent,
        preparedTournamentPackage: nextPreparedTournamentPackage,
        preparedTournamentPackageCache: nextPreparedBundle.packageCache,
        tournamentResults: {
          ...state.tournamentResults,
          [tournamentId]: storedResult,
        },
        historicalTournamentResults: state.historicalTournamentResults ?? {},
        circuitShifts: circuitShift
          ? [...(state.circuitShifts ?? []).filter(shift => shift?.id !== circuitShift.id), circuitShift].slice(-120)
          : (state.circuitShifts ?? []),
        latestCircuitShift: circuitShift ?? state.latestCircuitShift ?? null,
        circuitShock: nextCircuitShockState,
        events: [...state.events, ...newEvents, ...breakingEvents, ...pulseDevEvents].slice(-1200),
        calendarIndex: nextCalendarIndex,
        seasonPulseState: seasonPulseResult.state.seasonPulseState,
        monthlyInterviews: monthlyInterviewArchive,
        grandSlamInterviews: grandSlamInterviewArchive,
        radar: (() => {
          const radar = state.radar ?? createRadarState();
          const matchLog = [...(radar.matchLog ?? []), ...radarMatches].slice(-240);
          const digest = buildRadarDigest({
            followedPlayerIds: radar.followedPlayerIds ?? [],
            players: [...relationalTourPlayers, ...(postMonitorJuniors.length ? postMonitorJuniors : updatedJuniors)],
            matchLog,
            tournament,
            year: state.year,
            outcomes: pointMap,
          });
          const rawRadarAlerts = radarMatches.flatMap((match) => buildRadarAlerts(match, radar.followedPlayerIds ?? []));
          const visibleRadarAlerts = radar.settings?.showMatchAlerts === false
            ? []
            : (radar.settings?.showMajorOnly ?? true)
              ? rawRadarAlerts.filter((alert) => alert.weight >= 76)
              : rawRadarAlerts;
          const timelineEntries = buildRadarRankingTimeline({
            followedPlayerIds: radar.followedPlayerIds ?? [],
            tournament,
            outcomes: pointMap,
            beforePlayers: [...state.tourPlayers, ...(state.prospects ?? [])],
            afterPlayers: [...relationalTourPlayers, ...(postMonitorJuniors.length ? postMonitorJuniors : updatedJuniors)],
            year: state.year,
          });
          const rankTimeline = { ...(radar.rankTimeline ?? {}) };
          for (const entry of timelineEntries) {
            rankTimeline[entry.playerId] = [...(rankTimeline[entry.playerId] ?? []).filter((row) => row.id !== entry.id), entry].slice(-20);
          }
          return {
            ...radar,
            matchLog,
            rankTimeline,
            weeklyDigest: digest ? [...(radar.weeklyDigest ?? []), digest].slice(-80) : (radar.weeklyDigest ?? []),
            alerts: radarMatches.length
              ? [...(radar.alerts ?? []), ...visibleRadarAlerts].slice(-120)
              : (radar.alerts ?? []),
          };
        })(),
      };
    }

    case 'ADVANCE_YEAR': {
      // -- RANKING: preserva pontos do ano anterior com defesa rolling --
      // Em vez de criar um store zerado, copia o store atual e aplica
      // applyPointsDefense para expirar resultados com mais de 1 ano.
      // Juniors mant—m ranking vivo at— envelhecerem ou subirem.
      const newStore = {
        playerResults:   { ...state.rankingStore.playerResults },
        prospectResults: { ...state.rankingStore.prospectResults },
        ranked:          [],
        prospectRanked:  [...(state.rankingStore.prospectRanked ?? [])],
      };
      // Copia profunda dos resultados por jogador (evita muta——o do state anterior)
      for (const pid of Object.keys(newStore.playerResults)) {
        newStore.playerResults[pid] = [...newStore.playerResults[pid]];
      }
      // Expira resultados com mais de 1 temporada (weekIndex=-1 para não expirar nada no in—cio)
      applyPointsDefense(newStore, state.year + 1, -1);
      resetProspectRanking(newStore);
      const nextYear = state.year + 1;
      const agedJuniorsBase = (state.prospects ?? []).map((p, idx) => markAsJunior({
        ...p,
        rankPosition: p.rankPosition ?? (idx + 1),
        _ovrSeed: p._ovrSeed ?? overallRating(p.attrs),
      }, nextYear)).map(p => ensurePlayerBirthDate(p, { year: nextYear, month: 1 }, nextYear));

      // -- 1. DESENVOLVIMENTO (atributos, decl—nio, alcunhas) ----
      // Mapeia category do calend—rio ? titleType do DevelopmentSystem
      const CAT_TO_TITLE = {
        GRAND_SLAM:       'SLAM',
        SLAM_CLASH:       'SLAM_CLASH',
        MASTERS_1000:     'MASTERS',
        ATP_500:          'ATP500',
        ATP_250:          'ATP250',
        ATP_100:          'ATP100',
        ATP_75:           'ATP75',
        ATP_50:           'ATP50',
        ATP_25:           'ATP25',
        FINALS:           'ATP500',       // ATP Finals = peso de 500
      };
      const TITLE_ORDER = ['SLAM', 'SLAM_CLASH', 'MASTERS', 'ATP500', 'ATP250', 'ATP100', 'ATP75', 'ATP50', 'ATP25'];
      const SURFACE_FROM_CAT = {
        GRAND_SLAM: null, // surface varies — handled per tournament below
        MASTERS_1000: null, FINALS: null, ATP_500: null, ATP_250: null, ATP_75: null, ATP_50: null, ATP_25: null,
      };
      const titleWinners = {};
      // -- Coletar seasonMetrics: wins, finals, surface wins, tiebreaks, etc. --
      const seasonMetrics = {};
      const _smAdd = (pid, field, val = 1) => {
        if (!pid) return;
        seasonMetrics[pid] = seasonMetrics[pid] ?? {};
        seasonMetrics[pid][field] = (seasonMetrics[pid][field] ?? 0) + val;
      };
      const _ensureSurfaceBlock = (pid, surface, category = null) => {
        if (!pid || !surface) return null;
        seasonMetrics[pid] = seasonMetrics[pid] ?? {};
        seasonMetrics[pid].surfaceBlocks = seasonMetrics[pid].surfaceBlocks ?? {};
        const block = seasonMetrics[pid].surfaceBlocks[surface] = seasonMetrics[pid].surfaceBlocks[surface] ?? {
          wins: 0,
          qfs: 0,
          semis: 0,
          finals: 0,
          titles: 0,
          byCategory: {},
        };
        if (category) {
          block.byCategory[category] = block.byCategory[category] ?? { qfs: 0, semis: 0, finals: 0, titles: 0 };
        }
        return block;
      };
      const _smSurfaceWin = (pid, surface) => {
        const block = _ensureSurfaceBlock(pid, surface);
        if (block) block.wins += 1;
      };
      const _smSurfaceRound = (pid, surface, category, level) => {
        const block = _ensureSurfaceBlock(pid, surface, category);
        if (!block) return;
        const byCategory = category ? block.byCategory[category] : null;
        if (level === 'QF' || level === 'SF' || level === 'F' || level === 'W') {
          block.qfs += 1;
          if (byCategory) byCategory.qfs += 1;
        }
        if (level === 'SF' || level === 'F' || level === 'W') {
          block.semis += 1;
          if (byCategory) byCategory.semis += 1;
        }
        if (level === 'F' || level === 'W') {
          block.finals += 1;
          if (byCategory) byCategory.finals += 1;
        }
        if (level === 'W') {
          block.titles += 1;
          if (byCategory) byCategory.titles += 1;
        }
      };

      for (const res of Object.values(state.tournamentResults)) {
        const { bracket, tournament } = res ?? {};
        // Suporta tanto formato completo (bracket) quanto slim (res._slim)
        if (!bracket && !res?._slim) continue;
        const cat       = tournament?.category ?? '';
        const surface   = tournament?.surface  ?? null;  // 'CLAY'|'GRASS'|'HARD'|'STREET'|'CARPET'|'INDOOR'
        const isGS      = cat === 'GRAND_SLAM';
        const isMasters = cat === 'MASTERS_1000';
        const isIndoor  = surface === 'INDOOR';
        const titleType = CAT_TO_TITLE[cat] ?? 'ATP250';

        // Campeão — formato completo usa bracket.champion, slim usa res.champion
        const champ = res._slim ? res.champion : bracket?.champion;
        if (champ) {
          const existing = titleWinners[champ.id];
          if (!existing || TITLE_ORDER.indexOf(titleType) < TITLE_ORDER.indexOf(existing))
            titleWinners[champ.id] = titleType;
          if (isIndoor) _smAdd(champ.id, 'indoorTitles');
          // -- Contagem total de t—tulos (usada em metas de parceria) --
          _smAdd(champ.id, 'titles');

          // Contagem por categoria — acumula TODOS os t—tulos (não s— o melhor do ano)
          seasonMetrics[champ.id] = seasonMetrics[champ.id] ?? {};
          const _ct = seasonMetrics[champ.id].titlesByCategory = seasonMetrics[champ.id].titlesByCategory ?? {};
          const _CT_KEY = { GRAND_SLAM: 'gs', SLAM_CLASH: 'slamClash', MASTERS_1000: 'masters', FINALS: 'finals', ATP_500: 'atp500', ATP_250: 'atp250', ATP_100: 'atp100', ATP_75: 'atp75', ATP_50: 'atp50', ATP_25: 'atp25' };
          const _ctKey = _CT_KEY[cat] ?? 'atp250';
          _ct[_ctKey] = (_ct[_ctKey] ?? 0) + 1;
          _smSurfaceRound(champ.id, surface, cat, 'W');
        }

        // -- Resultados slim: extrair wins/finals/semis das arrays do slim --
        if (res._slim) {
          // Finals: campe—o + finalista (+ especializa——es por categoria)
          if (champ?.id)         _smAdd(champ.id,        'finals');
          if (res.finalist?.id)  _smAdd(res.finalist.id, 'finals');
          if (res.finalist?.id)  _smSurfaceRound(res.finalist.id, surface, cat, 'F');
          if (isGS) {
            if (champ?.id)        _smAdd(champ.id,        'slamFinals');
            if (res.finalist?.id) _smAdd(res.finalist.id, 'slamFinals');
          }
          if (isMasters) {
            if (champ?.id)        _smAdd(champ.id,        'mastersFinals');
            if (res.finalist?.id) _smAdd(res.finalist.id, 'mastersFinals');
          }
          // Semifinalistas
          for (const sf of (res.semis ?? [])) {
            if (sf?.id) {
              _smAdd(sf.id, 'semifinalReached');
              if (isGS) _smAdd(sf.id, 'slamSFs');
              _smSurfaceRound(sf.id, surface, cat, 'SF');
            }
          }
          // Wins + surface wins por match
          for (const m of (res.matches ?? [])) {
            if (!m.w) continue;
            _smAdd(m.w, 'wins');
            if (surface === 'CLAY')                     _smAdd(m.w, 'clayWins');
            if (surface === 'GRASS')                    _smAdd(m.w, 'grassWins');
            if (surface === 'HARD' || surface === 'INDOOR') _smAdd(m.w, 'hardWins');
            _smSurfaceWin(m.w, surface);
          }
          continue; // tiebreaks/matchPoints não dispon—veis em slim — aceit—vel
        }

        // -- Formato completo (bracket): percorrer rounds --
        const rounds = bracket.rounds ?? [];
        const totalRounds = rounds.length;
        for (let ri = 0; ri < rounds.length; ri++) {
          const isLastRound   = ri === totalRounds - 1;
          const isSecondLast  = ri === totalRounds - 2;
          const isThirdLast   = ri === totalRounds - 3;
          for (const match of rounds[ri]) {
            if (match.isBye || !match.winner || !match.result) continue;
            const winnerId = match.winner.id;
            const loserId  = (match.playerA?.id === winnerId ? match.playerB : match.playerA)?.id;

            // Wins
            _smAdd(winnerId, 'wins');

            // Finals / semifinals
            if (isLastRound) {
              _smAdd(winnerId, 'finals');
              if (loserId) _smAdd(loserId, 'finals');
              if (loserId) _smSurfaceRound(loserId, surface, cat, 'F');
              // T—tulo
              _smAdd(winnerId, 'titles');
              // Slam / Masters specific
              if (isGS)      { _smAdd(winnerId, 'slamFinals');    if (loserId) _smAdd(loserId, 'slamFinals'); }
              if (isMasters) { _smAdd(winnerId, 'mastersFinals'); if (loserId) _smAdd(loserId, 'mastersFinals'); }
            }
            if (isSecondLast) {
              _smAdd(winnerId, 'semifinalReached');
              if (loserId) _smAdd(loserId, 'semifinalReached');
              if (isGS) { _smAdd(winnerId, 'slamSFs'); if (loserId) _smAdd(loserId, 'slamSFs'); }
              _smSurfaceRound(winnerId, surface, cat, 'SF');
              if (loserId) _smSurfaceRound(loserId, surface, cat, 'SF');
            }
            if (isThirdLast) {
              _smSurfaceRound(winnerId, surface, cat, 'QF');
              if (loserId) _smSurfaceRound(loserId, surface, cat, 'QF');
            }

            // Surface wins
            if (surface === 'CLAY')   _smAdd(winnerId, 'clayWins');
            if (surface === 'GRASS')  _smAdd(winnerId, 'grassWins');
            if (surface === 'HARD' || surface === 'INDOOR') _smAdd(winnerId, 'hardWins');

            // Tiebreaks + match points saved from detailed match result
            const tm = match.result?.traitMetrics;
            if (tm) {
              if (tm.a?.tiebreaksWon && match.playerA?.id === winnerId)    _smAdd(winnerId, 'tiebreaksWon', tm.a.tiebreaksWon);
              if (tm.b?.tiebreaksWon && match.playerB?.id === winnerId)    _smAdd(winnerId, 'tiebreaksWon', tm.b.tiebreaksWon);
              if (tm.a?.matchPointsSaved && match.playerA?.id === winnerId) _smAdd(winnerId, 'matchPointsSaved', tm.a.matchPointsSaved);
              if (tm.b?.matchPointsSaved && match.playerB?.id === winnerId) _smAdd(winnerId, 'matchPointsSaved', tm.b.matchPointsSaved);
            }
          }
        }
      }

      // Carga real de calendário: os slots já são atualizados quando a entrada
      // é confirmada. Ela vira métrica anual para a trajetória, sem inferir
      // participação por ranking ou por narrativa.
      for (const [playerId, slots] of Object.entries(state.playerSeasonSlots ?? {})) {
        const tournamentsPlayed = new Set(slots?.enrolledTournaments ?? []).size;
        const activeWeeks = new Set(slots?.enrolledWeeks ?? []).size;
        if (tournamentsPlayed === 0 && activeWeeks === 0) continue;
        seasonMetrics[playerId] = seasonMetrics[playerId] ?? {};
        seasonMetrics[playerId].tournamentsPlayed = tournamentsPlayed;
        seasonMetrics[playerId].activeWeeks = activeWeeks;
      }

      const { updatedPlayers: updatedTour, events: tourDevEvents } = advanceSeason(state.tourPlayers, state.year, 0, titleWinners, seasonMetrics);
      const updatedJuniorsRaw = [];
      const prospDevEvents = [];

      // -- Finance: processa custos anuais para todos os jogadores ----------
      for (const p of updatedTour)          { initPlayerFinance(p); processYearEndFinances(p, state.year); }


      // -- Fase 2: recalcula IFR + Visibilidade anualmente ------------------
      const phase2Opts = { year: state.year, newsEngine: state.newsEngine, rivalrySystem: state.rivalrySystem, allPlayers: updatedTour };
      for (let i = 0; i < updatedTour.length; i++)
        updatedTour[i] = updatePlayerPhaseTwo(updatedTour[i], phase2Opts);

      // Coleta eventos de migra——o de estilo para a timeline
      const styleMigEvents = [...(tourDevEvents ?? []), ...(prospDevEvents ?? [])]
        .filter(e => e.type === 'STYLE_MIGRATION')
        .map(e => ({ ...e, year: state.year }));
      const trajectoryEvents = [...(tourDevEvents ?? []), ...(prospDevEvents ?? [])]
        .filter(e => String(e.type ?? '').startsWith('CAREER_'))
        .map(e => ({
          ...e,
          year: state.year,
          text: e.text ?? `${e.player ?? 'Jogador'}: ${e.note ?? e.label ?? 'mudança de trajetória registrada.'}`,
          icon: e.type === 'CAREER_OUTLOOK_CHANGED' ? '[traj]' : '[traj*]',
        }));

      // -- Personalidade pr—-aquecimento para o sistema de patroc—nio ------
      // processPersonalityEvolution roda mais tarde (linha ~2068, precisa de finalTourPlayers).
      // Mas o sponsorshipWindow precisa de personality.marketability atualizada para calcular
      // interesse de marcas corretamente. Fazemos uma passagem antecipada aqui,
      // usando rankPosition (j— atualizado pelo —ltimo torneio) + dados dispon—veis.
      {
        const _prevRkSponsor = Object.fromEntries(
          [...state.tourPlayers, ...state.prospects].map(p => [p.id, p.rankPosition ?? 999])
        );
        for (let i = 0; i < updatedTour.length; i++) {
          updatedTour[i] = processPersonalityEvolution(updatedTour[i], {
            currentRank:   updatedTour[i].rankPosition ?? 999,
            prevRank:      _prevRkSponsor[updatedTour[i].id] ?? 999,
            titleWon:      titleWinners[updatedTour[i].id] ?? null,
            seasonMetrics: seasonMetrics[updatedTour[i].id] ?? {},
            year:          state.year,
            rivalrySystem: state.rivalrySystem ?? null,
          });
        }
        // Recalcula phaseTwo.sponsorSignal com a marketability j— atualizada
        for (let i = 0; i < updatedTour.length; i++)
          updatedTour[i] = updatePlayerPhaseTwo(updatedTour[i], phase2Opts);
      }

      // -- Fase 3/4/5: janela anual de patroc—nio -------------------
      let _sponsorResult = null;
      if (state.sponsorPool) {
        try {
          _sponsorResult = runSponsorshipWindow({
            ...state,
            players: [...updatedTour],
            // A janela roda na abertura da nova temporada; assinatura e
            // memória comercial precisam pertencer ao novo ano civil.
            year: nextYear,
            worldDate: createWorldDate(nextYear, 1),
          }, { includeTransferWindow: false });
          const _spMap = Object.fromEntries(
            (_sponsorResult.state.players ?? []).map(p => [p.id, p])
          );
          for (let i = 0; i < updatedTour.length; i++) {
            if (_spMap[updatedTour[i].id]) updatedTour[i] = _spMap[updatedTour[i].id];
          }

          if (_sponsorResult.news.length > 0 && state.newsEngine) {
            // Cap: m—ximo 5 artigos de patroc—nio por temporada.
            // Prioridade: ELITE > rescis—o ELITE > assinatura top-ranked > renova——o.
            const _spNewsSorted = [..._sponsorResult.news].sort((a, b) => {
              const spTier = t => t.type === 'SPONSOR_ELITE' ? 3
                : (t.subtype === 'TERMINATION' || t.subtype === 'ELITE_LOSS') ? 2
                : 1;
              if (spTier(a) !== spTier(b)) return spTier(b) - spTier(a);
              return (a.player?.rankPosition ?? 999) - (b.player?.rankPosition ?? 999);
            });
            state.newsEngine.append(_spNewsSorted.slice(0, 5));
          }
          if (_sponsorResult.chronicleEvents?.length > 0 && state.chronicleEngine) {
            state.chronicleEngine._sponsorEvents = [
              ...(state.chronicleEngine._sponsorEvents ?? []),
              ..._sponsorResult.chronicleEvents,
            ].slice(-160);
            // FASE 2: chronicle events ELITE ? artigos no NewsEngine
            // (signings e terminations normais j— geram artigos via _buildSigningArticle;
            //  aqui cobrimos os milestones de carreira que s— existiam no chronicle)
            if (state.newsEngine) {
              const allPlayersForSponsor = [...(updatedTour ?? [])];
              const eliteMilestoneArticles = generateSponsorNewsFromChronicleEvents(
                _sponsorResult.chronicleEvents,
                allPlayersForSponsor,
                state.year,
              );
              if (eliteMilestoneArticles.length > 0) {
                state.newsEngine.append(eliteMilestoneArticles);
              }
            }
          }
        } catch (e) {
          // silencioso — não interrompe o avanão de temporada
          console.warn('[SponsorshipWindow] erro:', e?.message);
        }
      }

      // -- Alcunhas de carreira (Grand Slam completo, Slam King, GOAT, etc.) --
      // Requer dados HOF — roda uma vez por temporada após o advanceSeason.
      try {
        const hofStateForAlcunha = {
          tourPlayers: updatedTour,
          prospects: [],
          retiredPlayers: state.retiredPlayers ?? [],
          historicalTournamentResults: state.historicalTournamentResults ?? {},
          tournamentResults: state.tournamentResults ?? {},
          year: state.year,
        };
        const { allStats: hofStats } = computeHOFData(hofStateForAlcunha);
        const allPlayersForAlcunha = [...updatedTour, ...(state.retiredPlayers ?? [])];
        const { updatedPlayers: withCareerAlcunhas } = applyCareerAlcunhas(allPlayersForAlcunha, hofStats);
        const alcunhaById = Object.fromEntries(withCareerAlcunhas.map(p => [p.id, p.alcunha]));
        // Reaplica somente onde houve mudan—a (não sobrescreve todo o objeto)
        for (const arr of [updatedTour]) {
          for (let i = 0; i < arr.length; i++) {
            const newA = alcunhaById[arr[i].id];
            if (newA && !arr[i].alcunha) arr[i] = { ...arr[i], alcunha: newA };
          }
        }
        if (state.retiredPlayers) {
          for (let i = 0; i < state.retiredPlayers.length; i++) {
            const newA = alcunhaById[state.retiredPlayers[i].id];
            if (newA && !state.retiredPlayers[i].alcunha) {
              state.retiredPlayers[i] = { ...state.retiredPlayers[i], alcunha: newA };
            }
          }
        }
      } catch(e) {
        // silencioso — não interrompe o avanão de temporada
      }

      // -- 2. APOSENTADORIAS DO TOUR -----------------------------
      const breakingSeasonClose = processBreakingNewsSeasonClose(updatedTour, state.year);
      const {
        activePlayers,
        retiredPlayers: newlyRetiredFromSystem,
        events: retEventsCore,
      } = processSeasonRetirements(
        breakingSeasonClose.activePlayers,
        state.year,
        state.tournamentResults,
      );
      const newlyRetired = [
        ...breakingSeasonClose.retiredPlayers,
        ...newlyRetiredFromSystem,
      ];
      const retEvents = [
        ...(breakingSeasonClose.events ?? []),
        ...(retEventsCore ?? []),
      ];
      const retainedTourCount = activePlayers.length;
      const tourVacancies = Math.max(0, UNIVERSE_TOUR_TARGET - retainedTourCount);

      // -- 3. NOVOS NEWGENS: substituem aposentados direto no tour --
      // Libera fotos dos aposentados antes de atribuir aos novos
      const poolAfterRelease = releaseRetiredPhotos(
        newlyRetired,
        state.newgenImagePool ?? createEmptyPoolState(),
      );
      const newgenPoolOpts = { _poolState: poolAfterRelease };
      const {
        promoted: promotedJuniors,
        agedOut: agedOutJuniors,
        droppedOut: droppedOutJuniors,
        finalJuniors,
        competitiveDensity: densityAfterJuniors,
      } = buildJuniorSeasonTransition({
        prospects: state.prospects ?? [],
        vacancies: tourVacancies,
        seasonYear: nextYear,
        poolOpts: newgenPoolOpts,
        cohortUniverse: state.youthCohortUniverse,
        competitiveDensity: state.competitiveDensity,
        densityRoster: activePlayers,
      });

      const proNewgenCount = Math.max(0, tourVacancies - promotedJuniors.length);
      let nextCompetitiveDensity = densityAfterJuniors;
      const newTourEntrants = [];
      for (let entrantIndex = 0; entrantIndex < proNewgenCount; entrantIndex += 1) {
        const directive = nextCompetitiveDensity?.pendingDirectives?.[0] ?? null;
        const blueprint = getCohortMaterializationBlueprint(state.youthCohortUniverse, nextYear, `pro-${entrantIndex}`, directive);
        const entrantOptions = {
          ageRange: blueprint.ageRange ? [Math.max(17, blueprint.ageRange[0]), Math.max(19, blueprint.ageRange[1])] : [17, 23],
          nationality: blueprint.nationality,
          forcePotential: blueprint.potential,
          forceDevelopmentStyle: blueprint.developmentStyle,
          ...newgenPoolOpts,
        };
        let np = generateNewgen(nextYear, entrantOptions);
        newgenPoolOpts._poolState = entrantOptions._poolState;
        np = materializeAlternativePathway(migrateTournamentPreferences({ ...np }), nextYear, { cohortUniverse: state.youthCohortUniverse, blueprint });
        if (directive) {
          const consumed = consumeCompetitiveDirective(nextCompetitiveDensity, np, nextYear);
          nextCompetitiveDensity = consumed.state;
          np = consumed.player;
        }
        np = migrateLifeEventLog(np);
        np = migratePlayerLifeData(np);
        newTourEntrants.push(initPlayerFinance(np));
      }
      const updatedImagePool = newgenPoolOpts._poolState;

      // -- 4. MONTAR ARRAYS FINAIS -------------------------------
      const finalTourPlayers = [...new Map(
        [...activePlayers, ...promotedJuniors, ...newTourEntrants].map(p => [p.id, p])
      ).values()].slice(0, UNIVERSE_TOUR_TARGET);
      const allRetired = [...newlyRetired, ...agedOutJuniors, ...droppedOutJuniors];

      const prevRankMap = Object.fromEntries(
        state.tourPlayers.map(p => [p.id, p.rankPosition ?? 999])
      );
      const coachYearResult = runCoachMarketYear({
        players: finalTourPlayers.map(stripOldCoachButKeepBancoVivo),
        prospects: finalJuniors.map(stripOldCoachButKeepBancoVivo),
        retiredPlayers: allRetired,
        coachMarket: state.coachMarket,
        year: state.year,
        seasonMetrics,
        prevRankMap,
      });
      const tourWithoutCoaches = coachYearResult.players;
      const prospectsWithoutCoaches = coachYearResult.prospects;
      const coachYearEvents = coachYearResult.events ?? [];

      // -- 7. RANKINGS -------------------------------------------
      const ranked = computeRanking(newStore, finalTourPlayers.map(p => p.id));
      const prospectRanked = computeProspectRanking(newStore, prospectsWithoutCoaches.map(p => p.id));
      const rankMap = Object.fromEntries(ranked.map(r => [r.playerId, r.position]));
      const prospectRankMap = Object.fromEntries(prospectRanked.map(r => [r.playerId, r.position]));

      // -- 7.5 EVOLU——O DE PERSONALIDADE ------------------------
      // Roda após rankMap calculado e após _seasonHistory atualizado.
      // Processa tour + prospects em um —nico passo.
      const allAfterPersonality = [
        ...tourWithoutCoaches,
        ...prospectsWithoutCoaches,
      ].map(p =>
        processPersonalityEvolution(p, {
          currentRank:   rankMap[p.id] ?? prospectRankMap[p.id] ?? 999,
          prevRank:      prevRankMap[p.id] ?? p.rankPosition ?? 999,
          titleWon:      titleWinners[p.id]       ?? null,
          seasonMetrics: seasonMetrics[p.id]      ?? {},
          year:          state.year,
          rivalrySystem: state.rivalrySystem      ?? null,
        })
      );
      const _personMap              = Object.fromEntries(allAfterPersonality.map(p => [p.id, p]));
      const tourAfterPersonality    = tourWithoutCoaches.map(p => _personMap[p.id] ?? p);
      const prospectsAfterPersonality = prospectsWithoutCoaches.map(p => _personMap[p.id] ?? p);

      // -- 7.6 LIFE EVENTS --------------------------------------
      // Rola eventos de vida fora da quadra para cada jogador.
      // Roda após personalidade (marketability j— atualizada).
      const _lifeEventResults = [...tourAfterPersonality, ...prospectsAfterPersonality].map(p => {
        const isInjured  = !!(p.injury?.slotsRemaining > 0);
        const titleWon   = !!(titleWinners[p.id]);
        const rank       = rankMap[p.id] ?? prospectRankMap[p.id] ?? 999;
        return rollLifeEvents(
          migrateLifeEventLog(migratePlayerLifeData(p)),
          state.year,
          {
            rank,
            titleWonThisSeason: titleWon,
            injured: isInjured,
            chanceMultiplier: 0,
            maxEvents: 0,
          }
        );
      });
      const _lifeMap = Object.fromEntries(
        _lifeEventResults.map(r => [r.player.id, r.player])
      );
      const tourAfterLife      = tourAfterPersonality.map(p      => _lifeMap[p.id] ?? p);
      const prospectsAfterLife = prospectsAfterPersonality.map(p => _lifeMap[p.id] ?? p);

      // -- 7.7 LIFE EVENT NEWS — envia eventos notici—veis ao NewsEngine --
      if (state.newsEngine) {
        const allLifeEvents = _lifeEventResults.flatMap(r => r.events ?? []);
        const newsworthyEvents = allLifeEvents.filter(e => e.newsworthy);
        if (newsworthyEvents.length > 0) {
          const lifeArticles = newsworthyEvents
            .map(event => {
              const player = _lifeMap[
                _lifeEventResults.find(r => (r.events ?? []).includes(event))?.player?.id
              ];
              if (!player) return null;
              return genLifeEventArticle(player, event, state.year);
            })
            .filter(Boolean);
          if (lifeArticles.length > 0) state.newsEngine.append(lifeArticles);
        }
      }

      if (state.newsEngine && coachYearEvents.length > 0) {
        const playerLookup = Object.fromEntries([...tourWithoutCoaches, ...prospectsWithoutCoaches].map(p => [p.id, p]));
        const coachArticles = coachYearEvents
          .filter(e => ['COACH_START', 'COACH_RUPTURE', 'COACH_ERA', 'COACH_BREAKTHROUGH', 'COACH_SLAM', 'COACH_TENSION', 'COACH_RENEWAL', 'COACH_CONTRACT_END'].includes(e.type))
          .map(e => coachEventToNews(e, playerLookup[e.playerId], coachYearResult.coachMarket?.coachesById?.[e.coachId]))
          .filter(Boolean);
        if (coachArticles.length > 0) state.newsEngine.append(coachArticles);
      }

      // -- 7.8 TRAITS 2.0: progressão viva de temporada -------------------
      const traitSeasonPass = progressTraitsForSeason(
        [...tourAfterLife, ...prospectsAfterLife, ...allRetired],
        {
          year: state.year,
          seasonMetricsByPlayer: seasonMetrics,
          titleWinners,
          rankMap,
          prospectRankMap,
          prevRankMap,
        },
      );
      const traitPlayerMap = Object.fromEntries(
        (traitSeasonPass.updatedPlayers ?? []).map(p => [p.id, p])
      );
      const tourAfterTraits = tourAfterLife.map(p => traitPlayerMap[p.id] ?? p);
      const prospectsAfterTraits = prospectsAfterLife.map(p => traitPlayerMap[p.id] ?? p);
      const retiredAfterTraits = allRetired.map(p => traitPlayerMap[p.id] ?? p);

      // -- 8. EVENTOS --------------------------------------------
      const promoted = [...promotedJuniors, ...newTourEntrants];
      const promoEvents = promoted.map(p => ({
        type: 'promotion',
        text: `${p.name} entra no tour principal para a nova temporada`,
        playerId: p.id,
        playerName: p.name,
        year: state.year,
        icon: '🎾',
      }));

      const agedOutEvents = agedOutJuniors.slice(0, 8).map(p => ({
        type: 'prospect_retired',
        text: `${p.name} encerra o ciclo j—nior sem conseguir a promo——o ao profissional`,
        playerId: p.id,
        playerName: p.name,
        year: state.year,
        icon: '🎾',
      }));
      const _agedOutJuniors_noop = [].map(p => ({
        type: 'prospect_retired',
        text: p.retirementInfo.message,
        playerId: p.id,
        playerName: p.name,
        year: state.year,
        icon: '🎾',
      }));

      let seasonOpenBreakingNext = { players: null, events: [] };

      let yearEvents = [
        { type: 'year', text: `Temporada ${nextYear} come—a`, year: nextYear },
        ...retEvents,
        ...(traitSeasonPass.events ?? []),
        ...promoEvents,
        ...agedOutEvents,
        ...coachYearEvents.map(e => ({
          ...e,
          year: e.year ?? state.year,
          icon: e.type === 'COACH_RUPTURE' ? '[t-]' : e.type === 'COACH_ERA' ? '[era]' : '[t+]',
        })),
        // aged-out s— entra na timeline se o jogador era top-8 prospects
        // agedOutEvents removed
        // Migra——es de estilo por decl—nio f—sico
        ...styleMigEvents,
        // Viradas de trajetória: causas e leitura da próxima fase
        ...trajectoryEvents,
      ];

      // -- 9. RESUMO DE TEMPORADA (para modal) ------------------
      // Calcula OVR ganhos/perdidos usando _seasonHistory
      const allUpdated = [...finalTourPlayers, ...finalJuniors];
      const ovrChanges = allUpdated
        .map(p => {
          const hist = p._seasonHistory;
          const last = Array.isArray(hist) ? hist[hist.length - 1] : null;
          return last ? { player: p, delta: last.ovrDelta, ovrBefore: last.ovrBefore, ovrAfter: last.ovr } : null;
        })
        .filter(Boolean)
        .filter(x => x.delta !== 0);

      const topGainers = [...ovrChanges].filter(x => x.delta > 0).sort((a,b) => b.delta - a.delta).slice(0,5);
      const topLosers  = [...ovrChanges].filter(x => x.delta < 0).sort((a,b) => a.delta - b.delta).slice(0,5);

      // Les—es do ano — escaneia injuryHistory de todos os jogadores
      // (mais confi—vel do que filtrar events, pega todas independente de ranking)
      const allPlayersThisYear = [...updatedTour];
      const yearInjuriesSet = new Map(); // playerId ? melhor evento
      // Tamb—m pega eventos de lesão que passaram pela timeline (com year marcado)
      for (const e of state.events) {
        if ((e.type === 'injury' || e.type === 'injury_wd') && e.year === state.year) {
          const id = e.playerId;
          const grade = e.injury?.grade ?? 1;
          const existing = yearInjuriesSet.get(id);
          if (!existing || grade > (existing.injury?.grade ?? 1)) {
            yearInjuriesSet.set(id, e);
          }
        }
      }
      // Complementa com injuryHistory dos jogadores (captura les—es que não entraram na timeline)
      for (const p of allPlayersThisYear) {
        const hist = p.injuryHistory ?? [];
        for (const h of hist) {
          if (h.year === state.year || h.slot >= (state.calendarIndex ?? 0) - 41) {
            const id = p.id;
            if (!yearInjuriesSet.has(id)) {
              yearInjuriesSet.set(id, {
                type: 'injury',
                playerName: p.name,
                playerId: id,
                injury: { grade: h.grade, type: h.type },
                text: `${p.name} — ${h.type ?? '?'} (Grau ${h.grade})`,
                year: state.year,
              });
            }
          }
        }
      }
      const yearInjuries = Array.from(yearInjuriesSet.values());

      // -- Coletar campe—es de todos os torneios do ano ----------
      const champions = [];
      for (const res of Object.values(state.tournamentResults)) {
        const { bracket, tournament } = res ?? {};
        // Suporta formato completo (bracket) e slim (res._slim)
        const champ   = res._slim ? res.champion   : bracket?.champion;
        const finalist = res._slim ? res.finalist  : (() => {
          const finalRound = bracket?.rounds?.at(-1) ?? [];
          const finalMatch = finalRound[0];
          return finalMatch && champ
            ? (finalMatch.playerA?.id === champ.id ? finalMatch.playerB : finalMatch.playerA)
            : null;
        })();
        const setsDetail = res._slim ? [] : (bracket?.rounds?.at(-1)?.[0]?.result?.setsDetail ?? []);

        if (!tournament || !champ) continue;
        champions.push({
          tournament: {
            id: tournament.id, name: tournament.name,
            category: tournament.category, surface: tournament.surface,
            weekIndex: tournament.weekIndex ?? 0,
          },
          champion: { id: champ.id, name: champ.name, nationality: champ.nationality, styleId: champ.styleId, styleData: champ.styleData, color: champ.color },
          finalist: finalist ? { id: finalist.id, name: finalist.name, nationality: finalist.nationality } : null,
          setsDetail,
        });
      }
      // Ordena por prest—gio (GS > FINALS > M1000 > 500 > 250) e depois por weekIndex
      const catOrder = { GRAND_SLAM:0, SLAM_CLASH:1, FINALS:2, MASTERS_1000:3, ATP_500:4, ATP_250:5, ATP_100:6, ATP_75:7, ATP_50:8, ATP_25:9 };
      champions.sort((a,b) => {
        const co = (catOrder[a.tournament.category]??9) - (catOrder[b.tournament.category]??9);
        return co !== 0 ? co : (a.tournament.weekIndex - b.tournament.weekIndex);
      });

      // -- Calcular premia——es do ano -----------------------------
      // N—mero 1 da temporada (maior wins no tour principal)
      const allTourSorted = [...activePlayers].sort((a,b) => (a.rankPosition??999)-(b.rankPosition??999));
      const noOne = allTourSorted[0] ?? null;
      // Mais melhorado (maior delta OVR positivo)
      const mostImproved = topGainers[0]?.player ?? null;
      // Campeão de mais Grand Slams no ano
      const gsChampCounts = {};
      for (const c of champions) {
        if (c.tournament.category === 'GRAND_SLAM') {
          gsChampCounts[c.champion.id] = (gsChampCounts[c.champion.id] ?? 0) + 1;
        }
      }
      const gsKing = Object.entries(gsChampCounts).sort((a,b)=>b[1]-a[1])[0];
      const gsKingPlayer = gsKing ? activePlayers.find(p=>p.id===gsKing[0]) : null;
      // Maior n—mero de t—tulos totais no ano
      const titleCounts = {};
      for (const c of champions) {
        titleCounts[c.champion.id] = (titleCounts[c.champion.id] ?? 0) + 1;
      }
      const mostTitlesEntry = Object.entries(titleCounts).sort((a,b)=>b[1]-a[1])[0];
      const mostTitlesPlayer = mostTitlesEntry ? [...activePlayers,...promoted].find(p=>p.id===mostTitlesEntry[0]) : null;
      const mostTitlesCount = mostTitlesEntry?.[1] ?? 0;
      // Melhor newcomer (promoted player com melhor ranking final)
      const bestNewcomer = [...promoted].sort((a,b)=>(a.rankPosition??999)-(b.rankPosition??999))[0] ?? null;

      const awards = {
        noOne,
        mostImproved,
        gsKingPlayer,
        gsKingCount: gsKing?.[1] ?? 0,
        mostTitlesPlayer,
        mostTitlesCount,
        bestNewcomer,
      };

      const juniorPromotionSpotlight = [...promotedJuniors]
        .sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999))
        .map((player) => ({
          ...player,
          juniorSeason: buildJuniorPromotionSnapshot(player, state.tournamentResults ?? {}, state.year),
        }));

      const allRetiredForHof = [...(state.retiredPlayers ?? []), ...retiredAfterTraits]
        .filter((p, i, arr) => p?.id && arr.findIndex(x => x?.id === p.id) === i);

      const yearSummary = {
        year: state.year,
        topGainers,
        topLosers,
        injuries: yearInjuries,
        retired: retiredAfterTraits,
        newTourEntrants,
        juniorPromotionSpotlight,
        champions,
        awards,
        seasonMetrics,
        traitProgressions: traitSeasonPass.deltas ?? [],
        hofTributes: (() => {
          try {
            const tributeState = {
              ...state,
              year: nextYear,
              tourPlayers: finalTourPlayers,
              prospects: finalJuniors,
              retiredPlayers: allRetiredForHof,
              tournamentResults: state.tournamentResults,
              historicalTournamentResults: state.historicalTournamentResults ?? {},
            };
            const hofData = computeHOFData(tributeState);
            const inductedIds = new Set((hofData.inductees ?? []).map(item => item.id));
            return retiredAfterTraits
              .filter(player => inductedIds.has(player.id))
              .map((player) => {
                const stats = hofData.allStats.find(item => item.id === player.id);
                const timeline = buildPlayerTimeline(player.id, tributeState);
                return {
                  playerId: player.id,
                  stats,
                  timeline: timeline.events ?? [],
                  epitaph: timeline.epitaph ?? null,
                  goatRank: Math.max(1, (hofData.inductees ?? []).findIndex(item => item.id === player.id) + 1),
                  reasonLabel: buildRetirementReasonLabel(player),
                  reasonText: player.retirementInfo?.message ?? null,
                  headline: `${player.name} fecha a cortina como Hall of Famer`,
                  subline: `${player.name} deixa o circuito por ${buildRetirementReasonLabel(player).toLowerCase()} e entra direto na galeria máxima da história.`,
                };
              })
              .sort((a, b) => (b.stats?.goatScore?.total ?? 0) - (a.stats?.goatScore?.total ?? 0));
          } catch (_) {
            return [];
          }
        })(),
      };
      yearSummary.radarYearbook = buildRadarSeasonRecap({
        year: state.year,
        followedPlayerIds: state.radar?.followedPlayerIds ?? [],
        players: [...(state.tourPlayers ?? []), ...(state.prospects ?? []), ...(state.retiredPlayers ?? [])],
        matchLog: state.radar?.matchLog ?? [],
      });

      // Jogadores com rankPosition atualizado para o novo ano
      // Usa tourAfterTraits/prospectsAfterTraits (já com personalidade, life events e traits evoluídos)
      const newTourPlayers  = tourAfterTraits.map(p => {
        const newRank = rankMap[p.id] ?? p.rankPosition ?? 999;
        const prevHist = Array.isArray(p._rankHistory) ? p._rankHistory : [];
        // Evita duplicar o mesmo ano se advanceSeason for chamado mais de uma vez
        const rankHistUpdated = prevHist.some(h => h.year === nextYear)
          ? prevHist
          : [...prevHist, { year: nextYear, rank: newRank }];
        return {
          ...p,
          rankPosition: newRank,
          formPoints: applySeasonReset(p.formPoints ?? 0),
          _rankHistory: rankHistUpdated,
        };
      });

      // -- Percep——es do circuito: atualiza uma vez por temporada ---------
      // Roda depois do rank final — usa o hist—rico completo da temporada.
      const newTourPlayersWithPerceptions = newTourPlayers.map(p => {
        try {
          return updatePerceptions(
            p,
            state.tournamentResults,
            state.year,
            newTourPlayers,
            state.newsEngine?.feed ?? [],
          );
        } catch (_) { return p; }
      });
      newTourPlayers.splice(0, newTourPlayers.length, ...newTourPlayersWithPerceptions);

      seasonOpenBreakingNext = maybeTriggerBreakingNews(
        newTourPlayers,
        nextYear,
        state,
        { phase: 'SEASON_OPEN', tournament: CALENDAR[0] },
      );
      newTourPlayers.splice(
        0,
        newTourPlayers.length,
        ...(seasonOpenBreakingNext.players ?? newTourPlayers),
      );
      yearEvents.unshift(
        ...((seasonOpenBreakingNext.events ?? []).map(e => ({ ...e, year: nextYear }))),
      );

      const updatedJuniors = prospectsAfterTraits;

      // Regenera planos de temporada com os novos rankings e prefer—ncias
      // Cada jogador re-planeja seus torneios para o ano seguinte
      
      const newSeasonSlots = buildSeasonSlots(newTourPlayers);
      const seasonOpenPreparedBundle = buildPreparedTournamentPackageBundle(
        CALENDAR[0],
        newTourPlayers,
        updatedJuniors,
        newSeasonSlots,
        nextYear,
        {
          followedPlayerIds: state.radar?.followedPlayerIds ?? [],
          rivalrySystem: state.rivalrySystem ?? null,
        },
      );
      const seasonOpenPreparedTournamentPackage = seasonOpenPreparedBundle.currentPackage;

      // -- CR—NICAS + LIVRO DAS ERAS: fecha o retrato factual do ano antes
      // de avançar. A gravação é idempotente para simulações repetidas.
      const seasonChronicle = state.chronicleEngine?.generateYearEntry(state) ?? null;
      const seasonHistorySnapshot = buildAnnualHistorySnapshot(state, seasonChronicle);
      const historyWithSnapshot = recordAnnualHistorySnapshot(state.historyBook, seasonHistorySnapshot);
      const historyTrendAnalysis = analyzeHistoryTrends(historyWithSnapshot, state.year);
      const historyWithTrends = recordHistoryTrendAnalysis(historyWithSnapshot, historyTrendAnalysis);
      const historyWithEras = processEraSignals(historyWithTrends, historyTrendAnalysis);
      const historyWithNarrative = writeHistoryNarrative(historyWithEras, historyTrendAnalysis);
      const nextHistoryBook = calibrateHistoryBook(historyWithNarrative);

      // -- Fase 5: encerrar contratos de aposentados ----------------
      if (state.sponsorPool) {
        try {
          for (const retired of newlyRetired) {
            const { state: sAfter, news: rNews } = handleRetirementSponsors(
              { ...state, players: [...updatedTour] },
              retired
            );
            if (sAfter.sponsorPool) state = { ...state, sponsorPool: sAfter.sponsorPool };
            const retiredIdx = updatedTour.findIndex(p => p.id === retired.id);
            if (retiredIdx >= 0 && sAfter.players) {
              const updated = sAfter.players.find(p => p.id === retired.id);
              if (updated) updatedTour[retiredIdx] = updated;
            }
            if (rNews.length > 0 && state.newsEngine) state.newsEngine.append(rNews);
          }
        } catch (e) {
          console.warn('[RetirementSponsors] erro:', e?.message);
        }
      }

      // -- RIVALIDADES: notifica aposentadorias e poda rivalidades velhas --
      if (state.rivalrySystem) {
        for (const p of retiredAfterTraits) {
          state.rivalrySystem.onRetirement(p.id);
        }
        state.rivalrySystem.pruneStale(state.year);
      }
      const seasonEndPulseResult = runSeasonPulse(state, {
        phase: SEASON_PULSE_PHASES.SEASON_END,
        year: state.year,
        weekIndex: 51,
        completedTournaments: Object.keys(state.tournamentResults ?? {}).length,
      });
      const nextSeasonPulseState = createSeasonPulseState(nextYear, {
        lastSeasonClose: seasonEndPulseResult.state.seasonPulseState?.lastSeasonClose ?? null,
      });

      return {
        ...state,
        year: nextYear,
        worldDate: createWorldDate(nextYear, 1),
        season: state.season + 1,
        newgenImagePool: updatedImagePool,
        coachMarket: coachYearResult.coachMarket,
        rankingStore: newStore,
        tourPlayers:  newTourPlayers.map(stripOldCoachButKeepBancoVivo),
        prospects:    updatedJuniors.map(stripOldCoachButKeepBancoVivo),
        youthExitArchive: [
          ...(state.youthExitArchive ?? []),
          ...agedOutJuniors.map(slimifyYouthExit),
          ...droppedOutJuniors.map(slimifyYouthExit),
        ].slice(-500),
        youthCohortUniverse: advanceYouthCohortUniverse(
          summarizeYouthSurvivalSeason(
            summarizeYouthCircuitSeason(state.youthCohortUniverse, state.year, state.prospects?.length ?? 0),
            state.year,
          ),
          nextYear,
          updatedJuniors.length,
        ),
        competitiveDensity: nextCompetitiveDensity,
        retiredPlayers: (() => {
          // Slim os novos aposentados + os antigos j— no state
          // Mant—m apenas quem tem potencial HOF (=3 Grand Slams)
          // Os outros s—o deletados permanentemente para economizar espa—o

          // 1. Construir hist—rico completo (old + new slim entries)
          const allSlim = {};
          for (const [key, res] of Object.entries(state.historicalTournamentResults ?? {})) {
            allSlim[key] = res._slim ? res : slimifyTournamentResult(res, res._season ?? state.year - 1);
          }
          // Adiciona current year slim
          for (const [tid, res] of Object.entries(state.tournamentResults ?? {})) {
            const slim = slimifyTournamentResult(res, state.year);
            if (slim) allSlim[`${tid}_${state.year}`] = slim;
          }

          // 2. Contar títulos grandes por jogador
          const gsCount = {};
          const mastersCount = {};
          for (const res of Object.values(allSlim)) {
            const champId = res._slim ? res.champion?.id : res.bracket?.champion?.id;
            const cat = res.tournament?.category;
            if (!champId) continue;
            if (cat === 'GRAND_SLAM') gsCount[champId] = (gsCount[champId] ?? 0) + 1;
            if (cat === 'MASTERS_1000') mastersCount[champId] = (mastersCount[champId] ?? 0) + 1;
          }

          // 3. Mesclar antigos + novos. Todo profissional aposentado continua
          // no arquivo; o perfil slim evita que preservar memoria custe caro.
          const allRetiredMerged = [...(state.retiredPlayers ?? []), ...retiredAfterTraits];
          return allRetiredMerged
            .filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i) // dedup
            .filter(p => !p.retirementInfo?.isYouthExit && p.retirementInfo?.type !== 'PROSPECT_AGED_OUT')
            .map(p => p._isSlimRetired ? p : slimifyRetiredPlayer(p));
        })(),
        tournamentResults: {},
        historicalTournamentResults: (() => {
          // Slim todos os existentes + adiciona current year slim
          const result = {};
          for (const [key, res] of Object.entries(state.historicalTournamentResults ?? {})) {
            result[key] = res._slim ? res : slimifyTournamentResult(res, res._season ?? state.year - 1);
          }
          for (const [tid, res] of Object.entries(state.tournamentResults ?? {})) {
            const slim = slimifyTournamentResult(res, state.year);
            if (slim) result[`${tid}_${state.year}`] = slim;
          }
          return result;
        })(),
        calendarIndex: 0,
        preparedTournamentPackage: seasonOpenPreparedTournamentPackage,
        preparedTournamentPackageCache: seasonOpenPreparedBundle.packageCache,
        // A memoria detalhada recente fica aqui; historia longa e marcos ja
        // estao nos arquivos de carreira, cronicas, recordes e Livro das Eras.
        events: compactWorldEventsPreservingMilestones([...state.events, ...yearEvents]),
        yearSummary,
        radar: (() => {
          const radar = state.radar ?? createRadarState();
          return {
            ...radar,
            seasonRecaps: yearSummary.radarYearbook
              ? [...(radar.seasonRecaps ?? []), yearSummary.radarYearbook].slice(-24)
              : (radar.seasonRecaps ?? []),
          };
        })(),
        seasonPulseState: nextSeasonPulseState,
        circuitShock: seasonOpenBreakingNext.directorState ?? state.circuitShock,
        historyBook: nextHistoryBook,
        monthlyInterviews: state.monthlyInterviews ?? [],
        grandSlamInterviews: state.grandSlamInterviews ?? [],
        
        playerSeasonSlots: newSeasonSlots,
        chronicleEngine: state.chronicleEngine,
        newsEngine: (() => {
          // Passa newTourPlayers/updatedJuniors para que generateYearEndNews
          // acesse personality j— evolu—da (p—s step 7.5)
          const yearEndArticles = generateYearEndNews({
            ...state,
            tourPlayers: newTourPlayers,
            prospects:   updatedJuniors,
            events:      [...state.events, ...yearEvents],
          });
          if (state.newsEngine && yearEndArticles.length > 0) {
            state.newsEngine.push(yearEndArticles);
          }
          const seasonOpenBreakingArticles = generateBreakingNewsArticles(
            seasonOpenBreakingNext.events ?? [],
            newTourPlayers,
            nextYear,
          );
          if (state.newsEngine && seasonOpenBreakingArticles.length > 0) {
            state.newsEngine.append(seasonOpenBreakingArticles);
          }
          const nextSeasonPreviewArticles = generateUpcomingTournamentNews(
            CALENDAR[0],
            seasonOpenPreparedTournamentPackage,
            {
              ...state,
              year: nextYear,
              tourPlayers: newTourPlayers,
              prospects: updatedJuniors,
              tournamentResults: {},
              historicalTournamentResults: state.historicalTournamentResults ?? {},
            },
            { seasonStart: true },
          );
          if (state.newsEngine && nextSeasonPreviewArticles.length > 0) {
            state.newsEngine.append(nextSeasonPreviewArticles);
          }
          return state.newsEngine;
        })(),

        // -- Sponsorship (Fases 3—5) -------------------------------
        sponsorPool: _sponsorResult?.state?.sponsorPool ?? state.sponsorPool,
        pendingOffers: _sponsorResult?.acceptedOffers ?? [],
        highestPaidPlayerId: (() => {
          const pool = _sponsorResult?.state?.sponsorPool ?? state.sponsorPool;
          if (!pool) return null;
          const totals = {};
          for (const sp of Object.values(pool.states ?? {})) {
            for (const c of sp.contracts ?? []) {
              totals[c.playerId] = (totals[c.playerId] ?? 0) + c.annualFee;
            }
          }
          return Object.entries(totals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
        })(),
        recordsStore: (() => {
          // Atualiza snapshots de identidade (age muda todo ano) sem recalcular stats
          const base = getOrMigrateRecordsStore(state);
          const allP = [...(newTourPlayers ?? []), ...(updatedJuniors ?? [])];
          const updated = { _version:1, playerStats: { ...base.playerStats } };
          for (const p of allP) {
            const s = updated.playerStats[p.id];
            if (s) _rsSnap(s, p);
          }
          return updated;
        })(),
      };
    }

    case 'DISMISS_SUMMARY':
      return { ...state, yearSummary: null };

    default:
      return state;
  }
}

// -------------------------------------------------------------------
// SIMULA——O DO BRACKET
// -------------------------------------------------------------------

/**
 * Aplica b—nus de torneio favorito (TournamentPreferences) sobre os attrs de um jogador.
 * Retorna um novo objeto de attrs com mental e physical escalados se o jogador tem prefer—ncia.
 */
function applyTournamentBonus(player, tournamentId) {
  const bonus = getTournamentBonus(player, tournamentId);
  if (!bonus || (bonus.mental === 0 && bonus.physical === 0)) return player;
  const attrs = { ...player.attrs };
  // mental: afeta mental, composure, pressure
  if (bonus.mental > 0) {
    if (attrs.mental    != null) attrs.mental    = Math.min(99, attrs.mental    + bonus.mental    * 10);
    if (attrs.composure != null) attrs.composure = Math.min(99, attrs.composure + bonus.mental    * 8);
    if (attrs.pressure  != null) attrs.pressure  = Math.min(99, attrs.pressure  + bonus.mental    * 6);
  }
  // physical: afeta speed, stamina, agility
  if (bonus.physical > 0) {
    if (attrs.speed   != null) attrs.speed   = Math.min(99, attrs.speed   + bonus.physical * 8);
    if (attrs.stamina != null) attrs.stamina = Math.min(99, attrs.stamina + bonus.physical * 6);
    if (attrs.agility != null) attrs.agility = Math.min(99, attrs.agility + bonus.physical * 5);
  }
  return { ...player, attrs };
}

const TOURNAMENT_MINDSET_NEUTRAL = Object.freeze({
  tier: '0',
  label: 'Focado',
  modifier: 1,
  reason: 'Preparacao normal para o torneio',
  tone: 'neutral',
});

const TOURNAMENT_MINDSET_POOL = [
  { tier: '-', label: 'Inquieto', modifier: 0.95, tone: 'negative', weight: 28, reasons: [
    'Cobrança recente da imprensa',
    'Pequena distracao fora da quadra',
    'Semana de treino irregular',
    'Viagem desgastante antes do torneio',
  ] },
  { tier: '+', label: 'Bem conectado', modifier: 1.03, tone: 'positive', weight: 20, reasons: [
    'Confiança renovada nos treinos',
    'Boa energia com a equipe',
    'Chega embalado por sensacao positiva',
    'Ambiente do torneio combina com seu momento',
  ] },
  { tier: '--', label: 'Sob pressao', modifier: 0.88, tone: 'negative', weight: 17, reasons: [
    'Pressao do patrocinador',
    'Defesa pesada de pontos',
    'Sequencia ruim aumentou a cobranca',
    'Expectativa publica virou peso',
  ] },
  { tier: '++', label: 'Muito focado', modifier: 1.07, tone: 'positive', weight: 10, reasons: [
    'Compromisso pessoal com esta campanha',
    'Motivacao especial para este torneio',
    'Resposta prometida depois de resultado ruim',
    'Conexao forte com o tecnico nesta semana',
  ] },
  { tier: '---', label: 'Desconectado', modifier: 0.75, tone: 'negative', weight: 4, reasons: [
    'Problema familiar severo',
    'Crise publica abalou a preparacao',
    'Conflito interno com a equipe',
    'Desgaste mental chegou ao limite',
  ] },
  { tier: '+++', label: 'Extremamente determinado', modifier: 1.12, tone: 'positive', weight: 2, reasons: [
    'Homenagem pessoal move sua campanha',
    'Ultima chance sentida como missao',
    'Retorno simbolico depois de fase dificil',
    'Promessa privada virou combustivel competitivo',
  ] },
];

function hashStringSeed(value) {
  let h = 2166136261;
  const s = String(value ?? '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededUnit(seed) {
  const h = hashStringSeed(seed);
  return (h % 1000000) / 1000000;
}

function weightedMindsetPick(seed) {
  const total = TOURNAMENT_MINDSET_POOL.reduce((sum, item) => sum + item.weight, 0);
  let r = seededUnit(seed) * total;
  for (const item of TOURNAMENT_MINDSET_POOL) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return TOURNAMENT_MINDSET_POOL[0];
}

function rollTournamentMindset(player, tournament, seasonYear = null) {
  if (!player?.id || !tournament?.id) return TOURNAMENT_MINDSET_NEUTRAL;
  const seedBase = `${seasonYear ?? tournament.season ?? ''}|${tournament.id}|${player.id}`;
  if (seededUnit(`${seedBase}|focus`) < 0.90) return TOURNAMENT_MINDSET_NEUTRAL;
  const picked = weightedMindsetPick(`${seedBase}|tier`);
  const reasons = picked.reasons ?? [];
  const reason = reasons[Math.floor(seededUnit(`${seedBase}|reason`) * reasons.length)] ?? picked.label;
  return {
    tier: picked.tier,
    label: picked.label,
    modifier: picked.modifier,
    reason,
    tone: picked.tone,
  };
}

function applyTournamentMindsetToAttrs(attrs = {}, mindset = null) {
  const mult = mindset?.modifier ?? 1;
  if (!attrs || mult === 1) return attrs;
  const impact = Math.max(-4, Math.min(4, (mult - 1) * 20));
  return applyCompetitiveAttributeImpact(attrs, impact);
}

function applyLifeSimulationToAttrs(attrs = {}, player = null) {
  const life = getLifeMatchModifiers(player);
  if (!attrs || (!life.mentalidade && !life.regularidade && !life.resistencia)) return attrs;
  const next = { ...attrs };
  for (const [key, delta] of Object.entries(life)) {
    if (key === 'injuryRisk' || typeof next[key] !== 'number' || !delta) continue;
    next[key] = Math.max(1, Math.min(99, next[key] + delta));
  }
  return next;
}

function withTournamentMindset(player, tournament, seasonYear = null) {
  if (!player) return player;
  const mindset = player.tournamentMindset ?? rollTournamentMindset(player, tournament, seasonYear);
  return { ...player, tournamentMindset: mindset };
}

function applyTournamentContextModifiers(player, tournamentOrId) {
  if (!player) return player;
  const tournamentId = typeof tournamentOrId === 'object' ? tournamentOrId?.id : tournamentOrId;
  const basePlayer = typeof tournamentOrId === 'object'
    ? withTournamentMindset(player, tournamentOrId, tournamentOrId?.season ?? null)
    : player;
  const afterForm = basePlayer.formPoints ? { ...basePlayer, attrs: applyFormModifier(basePlayer.attrs, basePlayer.formPoints) } : basePlayer;
  const afterBonus = applyTournamentBonus(afterForm, tournamentId);
  const afterLife = { ...afterBonus, attrs: applyLifeSimulationToAttrs(afterBonus.attrs, basePlayer) };
  return {
    ...afterLife,
    attrs: applyTournamentMindsetToAttrs(afterLife.attrs, basePlayer.tournamentMindset),
    // FastSimulation também sabe aplicar forma/mindset quando recebe um
    // jogador cru. Este marcador impede a segunda aplicação no Universo.
    _matchContextApplied: true,
  };
}

function hydrateTournamentMindsets(pkg, tournament, seasonYear = null) {
  if (!pkg || !tournament) return pkg;
  const hydrate = (player) => withTournamentMindset(player, tournament, seasonYear);
  const hydrateMatch = (match) => ({
    ...match,
    playerA: hydrate(match.playerA),
    playerB: hydrate(match.playerB),
    winner: hydrate(match.winner),
  });
  return {
    ...pkg,
    rawMainDraw: (pkg.rawMainDraw ?? []).map(hydrate),
    rawQualifying: (pkg.rawQualifying ?? []).map(hydrate),
    rawPreQualifying: (pkg.rawPreQualifying ?? []).map(hydrate),
    directEntrants: (pkg.directEntrants ?? []).map(hydrate),
    mainDrawPlayers: (pkg.mainDrawPlayers ?? []).map(hydrate),
    preQualWinners: (pkg.preQualWinners ?? []).map(hydrate),
    qualifiers: (pkg.qualifiers ?? []).map(hydrate),
    qualRoundsData: (pkg.qualRoundsData ?? []).map(m => ({
      ...m,
      playerA: hydrate(m.playerA),
      playerB: hydrate(m.playerB),
      winner: hydrate(m.winner),
    })),
    preQualBracket: pkg.preQualBracket ? {
      ...pkg.preQualBracket,
      rounds: (pkg.preQualBracket.rounds ?? []).map(round => round.map(hydrateMatch)),
      qualifiers: (pkg.preQualBracket.qualifiers ?? []).map(hydrate),
    } : pkg.preQualBracket,
    qualifyingBracket: pkg.qualifyingBracket ? {
      ...pkg.qualifyingBracket,
      rounds: (pkg.qualifyingBracket.rounds ?? []).map(round => round.map(hydrateMatch)),
      qualifiers: (pkg.qualifyingBracket.qualifiers ?? []).map(hydrate),
    } : pkg.qualifyingBracket,
    bracket: pkg.bracket ? {
      ...pkg.bracket,
      rounds: (pkg.bracket.rounds ?? []).map(round => round.map(hydrateMatch)),
      champion: hydrate(pkg.bracket.champion),
    } : pkg.bracket,
  };
}

function clonePreparedTournamentPackage(pkg) {
  if (!pkg) return null;
  return {
    ...pkg,
    injuryWithdrawals: new Set(pkg.injuryWithdrawals ? [...pkg.injuryWithdrawals] : []),
    injuryEvents: [...(pkg.injuryEvents ?? [])],
    updatedByInjury: { ...(pkg.updatedByInjury ?? {}) },
    preQualWinners: [...(pkg.preQualWinners ?? [])],
    qualifiers: [...(pkg.qualifiers ?? [])],
    directEntrants: [...(pkg.directEntrants ?? [])],
    mainDrawPlayers: [...(pkg.mainDrawPlayers ?? [])],
    qualRoundsData: [...(pkg.qualRoundsData ?? [])],
    radarMatches: [...(pkg.radarMatches ?? [])],
    playerSeasonSlotsAfterSelection: Object.fromEntries(
      Object.entries(pkg.playerSeasonSlotsAfterSelection ?? {}).map(([key, value]) => [key, value ? { ...value } : value])
    ),
    preQualBracket: pkg.preQualBracket ? {
      ...pkg.preQualBracket,
      rounds: (pkg.preQualBracket.rounds ?? []).map(round => round.map(match => ({ ...match }))),
      qualifiers: [...(pkg.preQualBracket.qualifiers ?? [])],
    } : null,
    qualifyingBracket: pkg.qualifyingBracket ? {
      ...pkg.qualifyingBracket,
      rounds: (pkg.qualifyingBracket.rounds ?? []).map(round => round.map(match => ({ ...match }))),
      qualifiers: [...(pkg.qualifyingBracket.qualifiers ?? [])],
    } : null,
    bracket: pkg.bracket ? {
      ...pkg.bracket,
      rounds: (pkg.bracket.rounds ?? []).map(round => round.map(match => ({ ...match }))),
    } : null,
  };
}

function isParallelWeekATPEvent(tournament) {
  return !!(
    tournament?.parallelGroup &&
    (tournament.category === 'ATP_250' || tournament.category === 'ATP_500')
  );
}

function shouldPrebuildTournamentPackage(tournament) {
  if (!tournament) return false;
  return true;
}

function getPreparedOpeningStopSize(tournament) {
  const category = tournament?.category ?? null;
  if (category === 'ATP_250' || category === 'ATP_500') return 8;
  if (category === 'MASTERS_1000' || category === 'GRAND_SLAM') return 16;
  return null;
}

function isUnavailableForTournamentNow(player) {
  if (!player) return true;
  if (isPlayerUnavailableForTournament(player)) return true;
  return (player.injury?.slotsRemaining ?? 0) > 0;
}

function buildPreparedTournamentPackageBundle(tournament, tourPlayers, prospects, playerSeasonSlots = {}, seasonYear = null, radarContext = {}) {
  if (!tournament) {
    return {
      currentPackage: null,
      packageCache: {},
    };
  }

  if (!isParallelWeekATPEvent(tournament)) {
    const singlePackage = buildPreparedTournamentPackage(
      tournament,
      tourPlayers,
      prospects,
      playerSeasonSlots,
      seasonYear,
      false,
      null,
      radarContext,
    );
    return {
      currentPackage: singlePackage,
      packageCache: singlePackage ? { [tournament.id]: singlePackage } : {},
    };
  }

  const siblingTournaments = CALENDAR
    .filter((entry) => entry.parallelGroup === tournament.parallelGroup && entry.category === tournament.category)
    .sort((a, b) => {
      const weekDelta = (a.weekIndex ?? 0) - (b.weekIndex ?? 0);
      if (weekDelta !== 0) return weekDelta;
      const monthDelta = (a.monthNum ?? 0) - (b.monthNum ?? 0);
      if (monthDelta !== 0) return monthDelta;
      return CALENDAR.findIndex((entry) => entry.id === a.id) - CALENDAR.findIndex((entry) => entry.id === b.id);
    });

  const packageCache = {};

  // Sorteio conjunto: dividir o pool entre os dois torneios de uma vez.
  // Garante que nenhum jogador apareça nos dois — a divisão é feita antes
  // de qualquer chamada individual de seleção.
  if (siblingTournaments.length === 2) {
    const [tA, tB] = siblingTournaments;
    const sorted = [...tourPlayers].sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999));
    const sortedProspects = [...prospects].sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999));

    const { A: selA, B: selB } = selectParallelPairPlayers(
      tA, tB, sorted, sortedProspects, new Set(), playerSeasonSlots
    );
    const reservedAIds = new Set([...(selA.mainDraw ?? []), ...(selA.qualifying ?? []), ...(selA.fillerPool ?? [])].map(player => player.id));
    const reservedBIds = new Set([...(selB.mainDraw ?? []), ...(selB.qualifying ?? []), ...(selB.fillerPool ?? [])].map(player => player.id));
    const selAWithSiblingLock = { ...selA, siblingReservedIds: reservedBIds };
    const selBWithSiblingLock = { ...selB, siblingReservedIds: reservedAIds };

    // Atualizar slots para ambos antes de montar os packages
    const slotsAfter = { ...playerSeasonSlots };
    for (const p of [...selA.mainDraw, ...selA.qualifying]) {
      if (!slotsAfter[p.id]) slotsAfter[p.id] = createSeasonSlots();
      updateSeasonSlots(slotsAfter[p.id], p, tA);
    }
    for (const p of [...selB.mainDraw, ...selB.qualifying]) {
      if (!slotsAfter[p.id]) slotsAfter[p.id] = createSeasonSlots();
      updateSeasonSlots(slotsAfter[p.id], p, tB);
    }

    // Montar packages com os campos já definidos
    const pkgA = buildPreparedTournamentPackage(tA, tourPlayers, prospects, slotsAfter, seasonYear, false, selAWithSiblingLock, radarContext);
    const pkgB = buildPreparedTournamentPackage(tB, tourPlayers, prospects, slotsAfter, seasonYear, false, selBWithSiblingLock, radarContext);
    packageCache[tA.id] = pkgA;
    packageCache[tB.id] = pkgB;
  } else {
    // Fallback para grupos com != 2 torneios (não deveria acontecer no calendário padrão)
    let slotsCursor = playerSeasonSlots;
    for (const siblingTournament of siblingTournaments) {
      const siblingPackage = buildPreparedTournamentPackage(
        siblingTournament, tourPlayers, prospects, slotsCursor, seasonYear, true, null, radarContext,
      );
      packageCache[siblingTournament.id] = siblingPackage;
      slotsCursor = siblingPackage?.playerSeasonSlotsAfterSelection ?? slotsCursor;
    }
  }

  return {
    currentPackage: packageCache[tournament.id] ?? null,
    packageCache,
  };
}

function createFastPrepareMatchResolver(surface, bestOf, tournament = null, radarContext = {}, radarMatches = []) {
  return (playerA, playerB, matchContext = {}) => {
    const roundLabel = matchContext.phase === 'pre_qualifying'
      ? 'Pré-qualifying'
      : matchContext.phase === 'qualifying'
        ? 'Qualifying'
        : matchContext.roundLabel ?? 'Partida';
    const result = simulateRadarAwareFastMatch(
      playerA,
      playerB,
      surface,
      bestOf,
      tournament,
      roundLabel,
      radarContext.followedPlayerIds ?? [],
      radarContext.rivalrySystem ?? null,
    );
    const winner = result.winner?.id === playerA.id ? playerA : playerB;
    appendPreparedRadarMatch(radarMatches, playerA, playerB, result, tournament, roundLabel, radarContext.seasonYear ?? matchContext.seasonYear ?? null);
    return { winner, result };
  };
}

function simulatePreparedOpeningRounds(bracket, tournament, surface, bestOf, radarContext = {}, radarMatches = []) {
  const stopSize = getPreparedOpeningStopSize(tournament);
  if (!bracket || !stopSize) return bracket;

  let currentBracket = {
    ...bracket,
    rounds: (bracket.rounds ?? []).map(round => round.map(match => ({ ...match }))),
    currentRound: bracket.currentRound ?? 0,
    isComplete: false,
    champion: null,
  };
  const totalInitialPlayers = currentBracket.rounds?.[0]?.reduce((sum, match) =>
    sum + (match.playerA ? 1 : 0) + (match.playerB ? 1 : 0), 0) ?? tournament?.draw ?? 0;

  tournamentDebugLog('prepare:opening:start', {
    tournamentId: tournament?.id,
    category: tournament?.category,
    initialPlayers: totalInitialPlayers,
    stopSize,
  });

  let guard = 0;
  while (!currentBracket.isComplete && guard < 12) {
    guard++;
    const roundIndex = currentBracket.currentRound ?? 0;
    const round = currentBracket.rounds?.[roundIndex] ?? [];
    const playersInRound = round.reduce((sum, match) =>
      sum + (match.playerA ? 1 : 0) + (match.playerB ? 1 : 0), 0);

    if (playersInRound <= stopSize) break;

    const playedRound = round.map((match) => {
      if (!match || match.winner || match.isBye || !match.playerA || !match.playerB) return match;
      const roundLabel = roundIndexToLabel(roundIndex, Math.max(1, currentBracket.rounds?.length ?? 1));
      const result = simulateRadarAwareFastMatch(
        match.playerA,
        match.playerB,
        surface,
        bestOf,
        tournament,
        roundLabel,
        radarContext.followedPlayerIds ?? [],
        radarContext.rivalrySystem ?? null,
      );
      const winner = result.winner?.id === match.playerA.id ? match.playerA : match.playerB;
      appendPreparedRadarMatch(radarMatches, match.playerA, match.playerB, result, tournament, roundLabel, radarContext.seasonYear ?? null);
      return { ...match, winner, result: slimMatchResult(result), isBye: false };
    });

    currentBracket = {
      ...currentBracket,
      rounds: currentBracket.rounds.map((existingRound, idx) => idx === roundIndex ? playedRound : existingRound),
    };
    currentBracket = advanceRound(currentBracket);

    tournamentDebugLog('prepare:opening:round-done', {
      tournamentId: tournament?.id,
      roundIndex,
      playersInRound,
      nextRound: currentBracket.currentRound,
      nextPlayers: currentBracket.rounds?.[currentBracket.currentRound]?.reduce((sum, match) =>
        sum + (match.playerA ? 1 : 0) + (match.playerB ? 1 : 0), 0) ?? 0,
    });
  }

  tournamentDebugLog('prepare:opening:done', {
    tournamentId: tournament?.id,
    currentRound: currentBracket.currentRound,
    rounds: currentBracket.rounds?.length ?? 0,
    isComplete: !!currentBracket.isComplete,
    guard,
  });

  return currentBracket;
}

function runPreparedQualifyingFastLocal(players, spotsToFill, tournament, surface, bestOf, phaseLabel = 'qualifying', radarContext = {}, radarMatches = []) {
  const active = [...(players ?? [])].filter(Boolean);
  if (!active.length || spotsToFill <= 0) return { qualifiers: [], bracket: null, qualRoundsData: [] };
  if (active.length <= spotsToFill) return { qualifiers: active.slice(0, spotsToFill), bracket: null, qualRoundsData: [] };

  let current = active;
  const rounds = [];
  const qualRoundsData = [];
  let roundIndex = 0;
  let guard = 0;

  while (current.length > spotsToFill && guard < 12) {
    guard++;
    const round = [];
    const next = [];
    for (let i = 0; i < current.length; i += 2) {
      const playerA = current[i] ?? null;
      const playerB = current[i + 1] ?? null;
      if (!playerB) {
        round.push({ matchId: `Q${roundIndex}_${i / 2}`, playerA, playerB: null, isBye: true, winner: playerA, result: null });
        if (playerA) next.push(playerA);
        continue;
      }
      const roundLabel = phaseLabel === 'pre_qualifying' ? 'Pré-qualifying' : phaseLabel === 'qualifying' ? 'Qualifying' : phaseLabel;
      const result = simulateRadarAwareFastMatch(
        playerA,
        playerB,
        surface,
        bestOf,
        tournament,
        roundLabel,
        radarContext.followedPlayerIds ?? [],
        radarContext.rivalrySystem ?? null,
      );
      const winner = result.winner?.id === playerA.id ? playerA : playerB;
      appendPreparedRadarMatch(radarMatches, playerA, playerB, result, tournament, roundLabel, radarContext.seasonYear ?? null);
      const match = { matchId: `Q${roundIndex}_${i / 2}`, playerA, playerB, isBye: false, winner, result: slimMatchResult(result) };
      round.push(match);
      next.push(winner);
      qualRoundsData.push({
        playerA,
        playerB,
        winner,
        surface,
        sets: result?.sets ?? [0, 0],
        phase: phaseLabel,
      });
    }
    rounds.push(round);
    current = next;
    roundIndex++;
  }

  return {
    qualifiers: current.slice(0, spotsToFill),
    bracket: {
      isQualifying: true,
      qualifyOut: spotsToFill,
      drawSize: active.length,
      totalSlots: active.length,
      rounds,
      currentRound: Math.max(0, rounds.length - 1),
      isComplete: true,
      qualifiers: current.slice(0, spotsToFill),
    },
    qualRoundsData,
  };
}

function buildPreparedAtpSmallPackage(tournament, tourPlayers, prospects, playerSeasonSlots = {}, seasonYear = null, applySeasonSlotTracking = false, preSelected = null, radarContext = {}) {
  const surface = courtKeyToSurface(tournament.courtKey ?? tournament.surface);
  const bestOf = tournament.bestOf ?? 3;
  const preparedRadarContext = { ...radarContext, seasonYear };
  const radarMatches = [];
  tournamentDebugLog('prepare:small-atp:start', {
    tournamentId: tournament?.id,
    category: tournament?.category,
    draw: tournament?.draw,
  });

  // sorted e sortedProspects sempre necessários — usados no fillerPool quando
  // o torneio não veio de um sorteio conjunto de paralelos.
  const sorted = [...(tourPlayers ?? [])].sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999));
  const sortedProspects = [...(prospects ?? [])].sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999));

  // preSelected: campo já dividido pelo sorteio conjunto de paralelos
  // Se presente, pula o selectTournamentPlayers e usa diretamente
  const selected = preSelected
    ?? selectTournamentPlayers(tournament, sorted, sortedProspects, new Set(), playerSeasonSlots);
  tournamentDebugLog('prepare:small-atp:selected', {
    tournamentId: tournament?.id,
    rawMain: selected.mainDraw?.length ?? 0,
    rawQual: selected.qualifying?.length ?? 0,
  });

  const rawMainDraw = (selected.mainDraw ?? []).map(p => withTournamentMindset(p, tournament, seasonYear));
  const rawQualifying = (selected.qualifying ?? []).map(p => withTournamentMindset(p, tournament, seasonYear));
  const rawPreQualifying = (selected.preQualifying ?? []).map(p => withTournamentMindset(p, tournament, seasonYear));

  if (applySeasonSlotTracking && ['ATP_500', 'ATP_250'].includes(tournament.category)) {
    for (const player of [...rawMainDraw, ...rawQualifying]) {
      if (!playerSeasonSlots[player.id]) playerSeasonSlots[player.id] = createSeasonSlots();
      updateSeasonSlots(playerSeasonSlots[player.id], player, tournament);
    }
  }

  const injuries = applyPreTournamentInjuries([...rawMainDraw, ...rawQualifying, ...rawPreQualifying], tournament, seasonYear);
  const getPlayer = (player) => {
    if (!player || injuries.injuryWithdrawals.has(player.id)) return null;
    return applyInjuryToPlayer(injuries.updatedByInjury[player.id] ?? player);
  };
  const directEntrants = rawMainDraw.map(getPlayer).filter(Boolean);
  const qualPool = rawQualifying.map(getPlayer).filter(Boolean);
  const qualStage = runPreparedQualifyingFastLocal(qualPool, tournament.qualifyOut ?? 0, tournament, surface, bestOf, 'qualifying', preparedRadarContext, radarMatches);
  const usedIds = new Set([...directEntrants, ...(qualStage.qualifiers ?? [])].map(p => p.id));
  const siblingReservedIds = preSelected?.siblingReservedIds ?? new Set();
  const fillerSource = preSelected
    ? (preSelected.fillerPool ?? [])
    : [...sorted, ...sortedProspects];
  const fillerPool = fillerSource
    .map(p => withTournamentMindset(p, tournament, seasonYear))
    .map(getPlayer)
    .filter(p => p && !usedIds.has(p.id) && !siblingReservedIds.has(p.id));
  const mainDrawPlayers = [...directEntrants, ...(qualStage.qualifiers ?? [])];
  for (const filler of fillerPool) {
    if (mainDrawPlayers.length >= (tournament.draw ?? 32)) break;
    mainDrawPlayers.push(filler);
    usedIds.add(filler.id);
  }
  mainDrawPlayers.sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999));

  const bracket = simulatePreparedOpeningRounds(
    generateBracket(tournament, mainDrawPlayers.slice(0, tournament.draw ?? 32)),
    tournament,
    surface,
    bestOf,
    preparedRadarContext,
    radarMatches,
  );

  tournamentDebugLog('prepare:small-atp:done', {
    tournamentId: tournament?.id,
    directEntrants: directEntrants.length,
    qualifiers: qualStage.qualifiers?.length ?? 0,
    mainDraw: mainDrawPlayers.length,
    currentRound: bracket?.currentRound ?? null,
  });

  return {
    tournamentId: tournament.id,
    seasonYear,
    surface,
    courtKey: tournament.courtKey ?? tournament.surface,
    bestOf,
    format: tournament.format ?? null,
    directEntrants,
    rawMainDraw,
    rawQualifying,
    rawPreQualifying,
    preQualWinners: [],
    qualifiers: qualStage.qualifiers ?? [],
    preQualBracket: null,
    qualifyingBracket: qualStage.bracket,
    mainDrawPlayers: mainDrawPlayers.slice(0, tournament.draw ?? 32),
    bracket,
    injuryWithdrawals: injuries.injuryWithdrawals ?? new Set(),
    injuryEvents: injuries.injuryEvents ?? [],
    updatedByInjury: injuries.updatedByInjury ?? {},
    qualRoundsData: qualStage.qualRoundsData ?? [],
    radarMatches,
    radarFollowSignature: radarFollowSignature(preparedRadarContext.followedPlayerIds),
    wildcards: [],
    playerSeasonSlotsAfterSelection: Object.fromEntries(
      Object.entries(playerSeasonSlots ?? {}).map(([key, value]) => [key, value ? { ...value } : value])
    ),
  };
}

function buildPreparedTournamentPackage(tournament, tourPlayers, prospects, playerSeasonSlots = {}, seasonYear = null, applySeasonSlotTracking = false, preSelected = null, radarContext = {}) {
  const surface = courtKeyToSurface(tournament.courtKey ?? tournament.surface);
  const bestOf = tournament.bestOf ?? 3;
  const preparedRadarContext = { ...radarContext, seasonYear };
  const radarMatches = [];
  tournamentDebugLog('prepare:package:start', {
    tournamentId: tournament?.id,
    tournamentName: tournament?.name,
    category: tournament?.category,
    draw: tournament?.draw,
  });
  const prepared = (tournament?.category === 'ATP_250' || tournament?.category === 'ATP_500')
    ? buildPreparedAtpSmallPackage(tournament, tourPlayers, prospects, playerSeasonSlots, seasonYear, applySeasonSlotTracking, preSelected, preparedRadarContext)
    : prepareTournamentPackageSync({
        tournament,
        tourPlayers,
        prospects,
        playerSeasonSlots,
        seasonYear,
        matchResolver: createFastPrepareMatchResolver(surface, bestOf, tournament, preparedRadarContext, radarMatches),
        applySeasonSlotTracking,
      });
  if (!prepared) return prepared;
  tournamentDebugLog('prepare:package:sync-done', {
    tournamentId: tournament?.id,
    mainDraw: prepared.mainDrawPlayers?.length ?? 0,
    qualifiers: prepared.qualifiers?.length ?? 0,
    qualRounds: prepared.qualRoundsData?.length ?? 0,
  });
  const preparedWithMindsets = hydrateTournamentMindsets(prepared, tournament, seasonYear);
  const preparedWithOpening = {
    ...preparedWithMindsets,
    bracket: simulatePreparedOpeningRounds(preparedWithMindsets.bracket, tournament, surface, bestOf, preparedRadarContext, radarMatches),
  };

  const field = [...(preparedWithOpening.mainDrawPlayers ?? [])].sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999));
  const topSeeds = field.slice(0, 8);
  const rankedField = field.map((player, index) => ({ playerId: player.id, position: index + 1 }));
  const pressuredFavorites = topSeeds
    .filter((player) => /pressão|pressao|ferida aberta|rótulo|rotulo|tropeços recentes/i.test(player?.publicNarrativeMemory?.publicNarrative?.line ?? ''));
  const championTargets = topSeeds
    .filter((player) => /mudança de patamar|mudanca de patamar|consenso|alvo nas costas|cobrança|cobranca/i.test(player?.publicNarrativeMemory?.publicNarrative?.line ?? ''));
  const respectedFloaters = field
    .filter((player) => !topSeeds.some((seed) => seed.id === player.id))
    .filter((player) => /ameaça|ameaca|tendência|tendencia|validação|validacao/i.test(player?.publicNarrativeMemory?.publicNarrative?.line ?? ''))
    .slice(0, 4);
  const narrativeRaces = buildNarrativeRaces({
    players: field,
    ranked: rankedField,
    year: seasonYear,
  });
  const seasonAct = buildSeasonAct({
    tournament,
    calendarIndex: tournament?.weekIndex ?? 0,
    year: seasonYear,
  });
  const calendarContext = {
    seasonAct,
    narrativeRaces,
    tournamentChapter: buildTournamentChapter({
      tournament,
      seasonAct,
      narrativeRaces,
      pressuredFavorites,
      championTargets,
      respectedFloaters,
      topSeeds,
    }),
    pressuredFavorites: pressuredFavorites.map((player) => player.id),
    championTargets: championTargets.map((player) => player.id),
    respectedFloaters: respectedFloaters.map((player) => player.id),
    storylineLines: [
      pressuredFavorites[0]
        ? `${pressuredFavorites[0]?.name} chega como favorito sob cobrança real.`
        : null,
      championTargets[0]
        ? `${championTargets[0]?.name} entra como campeão recente com alvo nas costas.`
        : null,
      respectedFloaters[0]
        ? `${respectedFloaters[0]?.name} entra mais respeitado do que o ranking sozinho sugeriria.`
        : null,
    ].filter(Boolean),
  };
  tournamentDebugLog('prepare:package:done', {
    tournamentId: tournament?.id,
    currentRound: preparedWithOpening.bracket?.currentRound ?? null,
    bracketRounds: preparedWithOpening.bracket?.rounds?.length ?? 0,
  });
  return {
    ...preparedWithOpening,
    calendarContext,
    radarMatches: [...(preparedWithOpening.radarMatches ?? []), ...radarMatches],
    radarFollowSignature: radarFollowSignature(preparedRadarContext.followedPlayerIds),
  };
}

/**
 * Roda qualifying + chave principal, retornando bracket completo.
 *
 * @param {object}   tournament
 * @param {object[]} tourPlayers
 * @param {object[]} prospects
 * @param {function} onProgress

 * @param {object}   playerSeasonSlots  { playerId ? SeasonSlots } — contadores de slots
 */
async function runTournament(tournament, tourPlayers, prospects, onProgress, playerSeasonSlots = {}, partialStateRef = null, seasonYear = null, rivalrySystem = null, preparedPackage = null, followedPlayerIds = []) {
  tournamentDebugLog('runTournament:start', {
    tournamentId: tournament?.id,
    tournamentName: tournament?.name,
    category: tournament?.category,
    draw: tournament?.draw,
    prepared: !!preparedPackage,
  });
  const SURFACE_COURT = { CLAY: 'ROLAND_GARROS', GRASS: 'WIMBLEDON', HARD: 'US_OPEN', STREET: 'URBAN_COURT', CARPET: 'CARPET_COURT', INDOOR: 'O2_ARENA' };
  const courtKey  = SURFACE_COURT[tournament.surface] ?? 'US_OPEN';
  const bestOf    = tournament.bestOf ?? 3;
  const prepared = preparedPackage ? clonePreparedTournamentPackage(preparedPackage) : null;
  const preQualWinners = prepared?.preQualWinners ?? [];
  const qualifiers = prepared?.qualifiers ?? [];
  const allMainDraw = prepared?.mainDrawPlayers ?? [];
  const injuryWithdrawals = prepared?.injuryWithdrawals ?? new Set();
  const injuryEvents = prepared?.injuryEvents ?? [];
  const updatedByInjury = prepared?.updatedByInjury ?? {};
  const radarMatches = [...(prepared?.radarMatches ?? [])];
  let qualRoundsData = [...(prepared?.qualRoundsData ?? [])];
  const currentPlayersById = new Map(
    [...tourPlayers, ...prospects].filter(Boolean).map((player) => [player.id, player])
  );

  if (!prepared) {
    tournamentDebugLog('runTournament:prepare-field:start', {
      tournamentId: tournament?.id,
      tourPlayers: tourPlayers?.length ?? 0,
      prospects: prospects?.length ?? 0,
    });
    const { qualifyOut = 0, preQualIn = 0 } = tournament;
    const pqOut = tournament.preQualOut ?? Math.ceil(preQualIn / 2);
    const sorted = [...tourPlayers].sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999));
    const sortedProsp = [...prospects].sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999));
    const { mainDraw: rawMain, qualifying: rawQual, preQualifying: rawPreQual } = selectTournamentPlayers(
      tournament, sorted, sortedProsp, new Set(), playerSeasonSlots,
    );
    const mainWithMindset = rawMain.map(p => withTournamentMindset(p, tournament, seasonYear));
    const qualWithMindset = rawQual.map(p => withTournamentMindset(p, tournament, seasonYear));
    const preQualWithMindset = rawPreQual.map(p => withTournamentMindset(p, tournament, seasonYear));

    if (['ATP_500','ATP_250','MASTERS_1000'].includes(tournament.category)) {
      for (const player of [...mainWithMindset, ...qualWithMindset]) {
        if (!playerSeasonSlots[player.id]) playerSeasonSlots[player.id] = createSeasonSlots();
        updateSeasonSlots(playerSeasonSlots[player.id], player, tournament);
      }
    }

    const injuries = applyPreTournamentInjuries([...mainWithMindset, ...qualWithMindset, ...preQualWithMindset], tournament, seasonYear);
    tournamentDebugLog('runTournament:prepare-field:done', {
      tournamentId: tournament?.id,
      mainDraw: rawMain.length,
      qualifying: rawQual.length,
      preQualifying: rawPreQual.length,
      injuryWithdrawals: injuries.injuryWithdrawals?.size ?? 0,
    });
    qualRoundsData = [];
    const getPlayer = (player) => {
      if (injuries.injuryWithdrawals.has(player.id)) return null;
      return applyInjuryToPlayer(injuries.updatedByInjury[player.id] ?? player);
    };

    let builtPreQualWinners = [];
    if (rawPreQual.length > 0 && pqOut > 0) {
      const pool = preQualWithMindset.map(getPlayer).filter(Boolean);
      if (pool.length > 0) {
        builtPreQualWinners = await runQualifyingAsync(pool, pqOut, courtKey, bestOf, onProgress, tournament, followedPlayerIds, rivalrySystem, radarMatches, seasonYear, 'Pré-qualifying');
      }
    }

    let builtQualifiers = [];
    if ((rawQual.length > 0 || builtPreQualWinners.length > 0) && qualifyOut > 0) {
      const pool = [...qualWithMindset.map(getPlayer).filter(Boolean), ...builtPreQualWinners];
      if (pool.length > 0) {
        builtQualifiers = await runQualifyingAsync(pool, qualifyOut, courtKey, bestOf, onProgress, tournament, followedPlayerIds, rivalrySystem, radarMatches, seasonYear, 'Qualifying');
      }
    }

    preQualWinners.splice(0, preQualWinners.length, ...builtPreQualWinners);
    qualifiers.splice(0, qualifiers.length, ...builtQualifiers);
    allMainDraw.splice(0, allMainDraw.length, ...[...mainWithMindset.map(getPlayer).filter(Boolean), ...builtQualifiers].slice(0, tournament.draw));
    injuryWithdrawals.clear?.();
    for (const id of injuries.injuryWithdrawals) injuryWithdrawals.add(id);
    injuryEvents.splice(0, injuryEvents.length, ...(injuries.injuryEvents ?? []));
    Object.assign(updatedByInjury, injuries.updatedByInjury ?? {});
  }

  if (prepared) {
    tournamentDebugLog('runTournament:prepared-package', {
      tournamentId: tournament?.id,
      mainDraw: allMainDraw.length,
      qualifiers: qualifiers.length,
      preQualWinners: preQualWinners.length,
    });
    const unavailableIds = new Set(
      [...currentPlayersById.values()]
        .filter((player) => isUnavailableForTournamentNow(player))
        .map((player) => player.id)
    );
    if (unavailableIds.size > 0) {
      for (const id of unavailableIds) injuryWithdrawals.add(id);
      const keepEligible = (player) => player && !unavailableIds.has(player.id);
      preQualWinners.splice(0, preQualWinners.length, ...preQualWinners.filter(keepEligible));
      qualifiers.splice(0, qualifiers.length, ...qualifiers.filter(keepEligible));
      allMainDraw.splice(0, allMainDraw.length, ...allMainDraw.filter(keepEligible));
    }
  }

  if (partialStateRef) {
    partialStateRef._qualifiers    = qualifiers;
    partialStateRef._preQualWinners = preQualWinners;
  }

  // 5. Bracket principal
  const bracket = await runBracketAsync(
    allMainDraw,
    courtKey,
    bestOf,
    onProgress,
    partialStateRef?._snapshotRef ?? null,
    tournament,
    rivalrySystem,
    prepared?.bracket ?? null,
    followedPlayerIds,
  );

  tournamentDebugLog('runTournament:done', {
    tournamentId: tournament?.id,
    champion: bracket?.champion?.name ?? null,
    rounds: bracket?.rounds?.length ?? 0,
    matches: bracket?.rounds?.reduce((sum, round) => sum + (round?.length ?? 0), 0) ?? 0,
  });

  return {
    bracket,
    qualifiers,
    preQualWinners,
    wildcards: [],
    injuryWithdrawals,
    injuryEvents,
    updatedByInjury,
    qualRoundsData,
    radarMatches,
    playerSeasonSlotsAfterSelection: prepared?.playerSeasonSlotsAfterSelection ?? playerSeasonSlots,
  };
}
/**
 * Simula qualifying: pool de N jogadores ? M classificados.
 * Usa eliminat—ria simples randomizada.
 */
/**
 * Roda qualifying com eliminat—ria real em bracket.
 * Todos os jogadores jogam a cada rodada (pares). Odd player recebe bye.
 * Continua at— restar <= spotsToFill jogadores.
 *
 * Exemplo: 64 ? 32 (1 rodada), 32 ? 16 (1 rodada), etc.
 * Para preQual: 64 jogadores ? 1 rodada ? 32 passam.
 * Para qualify: 64 (32 diretos + 32 do preQual) ? 1 rodada ? 32 qualificados.
 */
async function runQualifyingAsync(players, spotsToFill, courtKey, bestOf, onProgress, tournament = null, followedPlayerIds = [], rivalrySystem = null, radarMatches = [], seasonYear = null, phaseLabel = 'Qualifying') {
  if (!players?.length || spotsToFill <= 0) return [];

  const surface = courtKeyToSurface(courtKey);

  const fastSim = (a, b) => {
    const res = simulateRadarAwareFastMatch(a, b, surface, bestOf, tournament, 'Qualifying', followedPlayerIds, rivalrySystem);
    if (res.simulationSource === 'FOLLOWED_HEADLESS') {
      const winner = res.winner?.id === a.id ? a : b;
      radarMatches.push(buildRadarMatchRecord({ playerA:a, playerB:b, winner, result:res, tournament, roundLabel:phaseLabel, year:seasonYear }));
    }
    return res.winner.id === a.id ? a : b;
  };

  // Embaralha para randomizar os confrontos
  let current = [...players];
  for (let i = current.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [current[i], current[j]] = [current[j], current[i]];
  }

  // Roda rodadas de elimina——o at— ter <= spotsToFill vencedores
  while (current.length > spotsToFill) {
    await new Promise(r => setTimeout(r, 0)); // yield para não travar UI
    const next = [];
    for (let i = 0; i < current.length; i += 2) {
      if (i + 1 >= current.length) {
        next.push(current[i]); // n—mero —mpar: —ltimo recebe bye
      } else {
        next.push(fastSim(current[i], current[i + 1]));
      }
    }
    current = next;
  }

  return current.slice(0, spotsToFill);
}

/**
 * Roda o bracket principal (eliminat—ria simples).
 * Suporta chaves de qualquer tamanho, aplica BYE para completar pot—ncia de 2.
 */

// Decide quando o main draw ainda pode usar FastSimulation.
// ATP 250/500: fastsim antes da QF; QF em diante usa mid (1/60).
// Masters/GS: fastsim antes da R16; R16 em diante usa mid (1/60).
// Qualifying, base circuit e juniors continuam no caminho FastSimulation,
// exceto partidas do Radar, que são sempre promovidas ao Headless completo.
function shouldUseFastMainDrawRound(tournament = null, playersInRound = 0) {
  const category = tournament?.category ?? null;
  if (category === 'ATP_250' || category === 'ATP_500') return playersInRound > 8;
  if (category === 'MASTERS_1000' || category === 'GRAND_SLAM') return playersInRound > 16;
  return false;
}

function pickHeadlessEngine(drawSize, playersInRound, tournament = null) {
  const category = tournament?.category ?? null;
  if (category === 'SLAM_CLASH') return playersInRound <= 8 ? simulateMatchHeadless : simulateMatchSlim;
  return simulateMatchMid;
}

async function runPreparedBracketRemainderAsync(preparedBracket, courtKey, bestOf, onProgress, snapshotRef = null, tournament = null, rivalrySystem = null, followedPlayerIds = []) {
  const rounds = (preparedBracket?.rounds ?? []).map(round => round.map(match => ({ ...match })));
  let currentRoundIndex = preparedBracket?.currentRound ?? 0;
  const totalSlots = preparedBracket?.totalSlots ?? preparedBracket?.draw ?? 0;
  const byeCount = preparedBracket?.byeCount ?? 0;
  const drawSize = preparedBracket?.draw ?? totalSlots;

  tournamentDebugLog('bracket:prepared-resume:start', {
    tournamentId: tournament?.id,
    currentRoundIndex,
    rounds: rounds.length,
    drawSize,
  });

  const saveSnapshot = () => {
    if (!snapshotRef) return;
    snapshotRef.current = {
      rounds: rounds.map(r => [...r]),
      currentRound: currentRoundIndex,
      isComplete: false,
      champion: null,
      totalSlots,
      byeCount,
      drawSize,
    };
  };

  while (currentRoundIndex < rounds.length) {
    const roundMatches = rounds[currentRoundIndex] ?? [];
    saveSnapshot();
    const playersInRound = roundMatches.reduce((sum, match) =>
      sum + (match.playerA ? 1 : 0) + (match.playerB ? 1 : 0), 0);
    tournamentDebugLog('bracket:prepared-round:start', {
      tournamentId: tournament?.id,
      roundIndex: currentRoundIndex,
      playersInRound,
    });

    const next = [];
    for (let i = 0; i < roundMatches.length; i++) {
      const { playerA: a, playerB: b } = roundMatches[i];
      let winner = roundMatches[i].winner ?? (!b ? a : null);
      let matchResult = roundMatches[i].result ?? null;

      if (a && b && !winner) {
        const simA = applyTournamentContextModifiers(a, tournament);
        const simB = applyTournamentContextModifiers(b, tournament);
        const sz = playersInRound;
        const rl = sz === 2 ? 'F' : sz === 4 ? 'SF' : sz === 8 ? 'QF' : sz === 16 ? 'R16' : sz === 32 ? 'R32' : sz === 64 ? 'R64' : sz === 128 ? 'R128' : `R${sz}`;
        const rlFull = { F:'Final', SF:'Semifinal', QF:'Quartas de Final', R16:'Oitavas', R32:'3— Rodada', R64:'2— Rodada', R128:'1— Rodada' }[rl] ?? rl;
        const res = shouldUseFastMainDrawRound(tournament, sz) && !isRadarMatch(a, b, followedPlayerIds)
          ? simulateMatchFast(simA, simB, courtKeyToSurface(courtKey), bestOf, { format: tournament?.format ?? null, tournamentTier: tournament?.category ?? null, roundLabel: rl })
          : (isRadarMatch(a, b, followedPlayerIds) ? simulateMatchHeadless : pickHeadlessEngine(drawSize, sz, tournament))({ playerData: simA }, { playerData: simB }, courtKey, bestOf, rivalrySystem, tournament?.isSlam ?? false, { category: tournament?.category, round: rl, format: tournament?.format ?? null, isSlamClash: !!tournament?.isSlamClash, radarFollowed: isRadarMatch(a, b, followedPlayerIds) });
        const aWon = res.sets[0] > res.sets[1];
        if (isRadarMatch(a, b, followedPlayerIds)) res.simulationSource = 'FOLLOWED_HEADLESS';
        winner = aWon ? a : b;
        matchResult = slimMatchResult(res);
        try {
          const surfKey = (tournament?.surface ?? 'HARD').toUpperCase();
          matchResult.narration = narrateMatchLight(aWon ? a : b, aWon ? b : a, res, surfKey);
        } catch { /* silencioso */ }
        if (onProgress) await onProgress({
          phase: 'main',
          roundIndex: currentRoundIndex,
          roundLabel: rl,
          roundLabelFull: rlFull,
          playerA: a,
          playerB: b,
          result: res,
          winner: aWon ? a : b,
          loser: aWon ? b : a,
        });
        await new Promise(r => setTimeout(r, 0));
      }

      roundMatches[i] = { playerA: a, playerB: b, winner, isBye: !b, result: matchResult };
      if (winner) next.push(winner);
      saveSnapshot();
    }

    if (next.length <= 1) {
      const champion = next[0] ?? null;
      tournamentDebugLog('bracket:prepared-resume:done', {
        tournamentId: tournament?.id,
        champion: champion?.name ?? null,
        rounds: rounds.length,
      });
      return { rounds, champion, totalSlots, byeCount, drawSize };
    }

    currentRoundIndex++;
    const nextMatches = [];
    for (let i = 0; i < next.length; i += 2) {
      const a = next[i];
      const b = next[i + 1] ?? null;
      nextMatches.push({ playerA: a, playerB: b, winner: !b ? a : null, isBye: !b, result: null });
    }
    if (rounds[currentRoundIndex]) {
      rounds[currentRoundIndex] = rounds[currentRoundIndex].map((match, idx) => nextMatches[idx] ? { ...match, ...nextMatches[idx] } : match);
    } else {
      rounds.push(nextMatches);
    }
  }

  return { rounds, champion: null, totalSlots, byeCount, drawSize };
}

async function runBracketAsync(players, courtKey, bestOf, onProgress, snapshotRef = null, tournament = null, rivalrySystem = null, preparedBracketTemplate = null, followedPlayerIds = []) {
  if ((preparedBracketTemplate?.currentRound ?? 0) > 0) {
    return runPreparedBracketRemainderAsync(preparedBracketTemplate, courtKey, bestOf, onProgress, snapshotRef, tournament, rivalrySystem, followedPlayerIds);
  }
  tournamentDebugLog('bracket:start', {
    tournamentId: tournament?.id,
    tournamentName: tournament?.name,
    category: tournament?.category,
    players: players?.length ?? 0,
    courtKey,
    bestOf,
    preparedTemplate: !!preparedBracketTemplate,
  });
  // Pr—xima pot—ncia de 2
  let totalSlots = preparedBracketTemplate?.totalSlots ?? 1;
  while (totalSlots < players.length) totalSlots *= 2;
  const byeCount = preparedBracketTemplate?.byeCount ?? (totalSlots - players.length);

  // Ordena por ranking e monta R1 com distribui——o ATP real de seeds
  const seeded = [...players].sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999));
  const r1Template = preparedBracketTemplate?.rounds?.[0]
    ? preparedBracketTemplate.rounds[0].map(match => ({ ...match, result: null }))
    : buildATPFirstRound(seeded, totalSlots);
  const totalMatches = r1Template.length;
  tournamentDebugLog('bracket:r1-built', {
    tournamentId: tournament?.id,
    totalSlots,
    byeCount,
    r1Matches: totalMatches,
  });

  const rounds = [];

  // Fun——o auxiliar: salva snapshot parcial compat—vel com TournamentBracket savedState
  const saveSnapshot = (currentRoundIndex) => {
    if (!snapshotRef) return;
    snapshotRef.current = {
      rounds: rounds.map(r => [...r]),
      currentRound: currentRoundIndex,
      isComplete: false,
      champion: null,
      totalSlots,
      byeCount,
      drawSize: players.length,
    };
  };

  // R1 inicial: BYEs j— resolvidos pelo buildATPFirstRound
  const r1Pending = r1Template.map(m => ({ ...m }));
  rounds.push(r1Pending);
  saveSnapshot(0);

  // Simula matches reais da R1
  for (let i = 0; i < totalMatches; i++) {
    if (r1Pending[i].isBye) continue; // BYE j— resolvido
    const a = r1Pending[i].playerA;
    const b = r1Pending[i].playerB;
    let winner = null;
    let matchResult = null;
    if (a && b) {
      const simA = applyTournamentContextModifiers(a, tournament);
      const simB = applyTournamentContextModifiers(b, tournament);
      const res = shouldUseFastMainDrawRound(tournament, players.length) && !isRadarMatch(a, b, followedPlayerIds)
        ? simulateMatchFast(simA, simB, courtKeyToSurface(courtKey), bestOf, { format: tournament?.format ?? null, tournamentTier: tournament?.category ?? null, roundLabel: 'R64' })
        : (isRadarMatch(a, b, followedPlayerIds) ? simulateMatchHeadless : pickHeadlessEngine(players.length, players.length, tournament))({ playerData: simA }, { playerData: simB }, courtKey, bestOf, rivalrySystem, tournament?.isSlam ?? false, { category: tournament?.category, round: 'R64', format: tournament?.format ?? null, isSlamClash: !!tournament?.isSlamClash, radarFollowed: isRadarMatch(a, b, followedPlayerIds) });
      const aWon = res.sets[0] > res.sets[1];
      if (isRadarMatch(a, b, followedPlayerIds)) res.simulationSource = 'FOLLOWED_HEADLESS';
      winner = aWon ? a : b;
      matchResult = slimMatchResult(res);
      // -- Narra——o leve para enriquecer artigos do NewsEngine --
      try {
        const surfKey = (tournament?.surface ?? 'HARD').toUpperCase();
        matchResult.narration = narrateMatchLight(aWon ? a : b, aWon ? b : a, res, surfKey);
      } catch { /* silencioso */ }
      if (onProgress) await onProgress({
        phase: 'main',
        roundIndex: 0,
        roundLabel: null,
        roundLabelFull: null,
        playerA: a, playerB: b,
        result: res,
        winner: aWon ? a : b,
        loser: aWon ? b : a,
      });
      // Yield para o React renderizar o overlay antes da pr—xima partida
      await new Promise(r => setTimeout(r, 0));
    }
    r1Pending[i] = { playerA: a, playerB: b, winner, isBye: false, result: matchResult };
    saveSnapshot(0);
  }


  // Rodadas seguintes
  let current = r1Pending.map(m => m.winner).filter(Boolean);
  let currentRoundIndex = 1;

  while (current.length > 1) {
    tournamentDebugLog('bracket:round:start', {
      tournamentId: tournament?.id,
      roundIndex: currentRoundIndex,
      playersInRound: current.length,
      engine: shouldUseFastMainDrawRound(tournament, current.length)
        ? 'fast'
        : (pickHeadlessEngine(players.length, current.length, tournament) === simulateMatchHeadless ? 'headless' : 'mid/slim'),
    });
    // Inicializa round com matches pendentes para snapshot imediato
    const roundMatches = [];
    for (let i = 0; i < current.length; i += 2) {
      const a = current[i];
      const b = current[i + 1] ?? null;
      roundMatches.push({ playerA: a, playerB: b, winner: !b ? a : null, isBye: !b, result: null });
    }
    rounds.push(roundMatches);
    saveSnapshot(currentRoundIndex);

    const next = [];
    for (let i = 0; i < roundMatches.length; i++) {
      const { playerA: a, playerB: b } = roundMatches[i];
      let winner = roundMatches[i].winner;
      let matchResult = null;

      if (b) {
        const simA = applyTournamentContextModifiers(a, tournament);
        const simB = applyTournamentContextModifiers(b, tournament);
        const sz = current.length;
        const rl = sz === 2 ? 'F' : sz === 4 ? 'SF' : sz === 8 ? 'QF' : sz === 16 ? 'R16' : sz === 32 ? 'R32' : sz === 64 ? 'R64' : `R${sz}`;
        const rlFull = { F:'Final', SF:'Semifinal', QF:'Quartas de Final', R16:'Oitavas', R32:'3— Rodada', R64:'2— Rodada' }[rl] ?? rl;
        const res = shouldUseFastMainDrawRound(tournament, sz) && !isRadarMatch(a, b, followedPlayerIds)
          ? simulateMatchFast(simA, simB, courtKeyToSurface(courtKey), bestOf, { format: tournament?.format ?? null, tournamentTier: tournament?.category ?? null, roundLabel: rl })
          : (isRadarMatch(a, b, followedPlayerIds) ? simulateMatchHeadless : pickHeadlessEngine(players.length, sz, tournament))({ playerData: simA }, { playerData: simB }, courtKey, bestOf, rivalrySystem, tournament?.isSlam ?? false, { category: tournament?.category, round: rl, format: tournament?.format ?? null, isSlamClash: !!tournament?.isSlamClash, radarFollowed: isRadarMatch(a, b, followedPlayerIds) });
        const aWon = res.sets[0] > res.sets[1];
        if (isRadarMatch(a, b, followedPlayerIds)) res.simulationSource = 'FOLLOWED_HEADLESS';
        winner = aWon ? a : b;
        matchResult = slimMatchResult(res);
        // -- Narra——o leve (SF e F recebem narra——o completa via NewsEngine;
        //    aqui garantimos headline b—sica para todas as rodadas) --
        try {
          const surfKey = (tournament?.surface ?? 'HARD').toUpperCase();
          matchResult.narration = narrateMatchLight(aWon ? a : b, aWon ? b : a, res, surfKey);
        } catch { /* silencioso */ }
        if (onProgress) await onProgress({
          phase: 'main',
          roundIndex: currentRoundIndex,
          roundLabel: rl,
          roundLabelFull: rlFull,
          playerA: a, playerB: b,
          result: res,
          winner: aWon ? a : b,
          loser: aWon ? b : a,
        });
        // Yield para o React renderizar o overlay antes da pr—xima partida
        await new Promise(r => setTimeout(r, 0));
      }

      roundMatches[i] = { playerA: a, playerB: b, winner, isBye: !b, result: matchResult };
      saveSnapshot(currentRoundIndex);
      next.push(winner);
    }

    current = next;
    tournamentDebugLog('bracket:round:done', {
      tournamentId: tournament?.id,
      roundIndex: currentRoundIndex,
      survivors: current.length,
      survivorNames: current.slice(0, 4).map(p => p?.name).filter(Boolean),
    });
    currentRoundIndex++;
  }

  const champion = current[0] ?? null;
  tournamentDebugLog('bracket:done', {
    tournamentId: tournament?.id,
    champion: champion?.name ?? null,
    rounds: rounds.length,
  });

  return {
    rounds,
    champion,
    totalSlots,
    byeCount,
    drawSize: players.length,
  };
}

/**
 * Distribui jogadores nas posi——es do bracket com seeding ATP-like.
 */
function buildBracketSlots(seeded, byeIds, totalSlots) {
  const slots = new Array(totalSlots).fill(null);

  // Seed positions: 0, last, quarter, 3/4, etc.
  const positions = [];
  positions.push(0);
  if (totalSlots >= 2) positions.push(totalSlots - 1);
  if (totalSlots >= 4) { positions.push(Math.floor(totalSlots / 2)); positions.push(Math.floor(totalSlots / 2) - 1); }
  if (totalSlots >= 8) {
    positions.push(Math.floor(totalSlots / 4));
    positions.push(totalSlots - Math.floor(totalSlots / 4) - 1);
    positions.push(Math.floor(totalSlots * 3 / 4));
    positions.push(Math.floor(totalSlots / 4) - 1); // era totalSlots*3/4-1 = DUPLICATA!
  }
  // Fill remaining positions
  const used = new Set(positions);
  for (let i = 1; positions.length < totalSlots; i++) {
    if (!used.has(i)) { positions.push(i); used.add(i); }
  }

  for (let i = 0; i < seeded.length; i++) {
    slots[positions[i]] = seeded[i];
  }

  return slots;
}

// -------------------------------------------------------------------
// COMPONENTES AUXILIARES
// -------------------------------------------------------------------

function OvrBadge({ player, surface }) {
  const ovr = overallRating(player.attrs);
  return <span style={{ fontFamily: U.mono, fontSize: 14, fontWeight: 700, color: ovrTier(ovr).color }}>{ovrTier(ovr).grade}</span>;
}

function RankBadge({ rank }) {
  const color = rank <= 8 ? U.gold : rank <= 32 ? U.white : U.textDim;
  return (
    <span style={{ fontFamily: U.mono, fontSize: 10, color, minWidth: 28, textAlign: 'right' }}>
      #{rank}
    </span>
  );
}

function SurfaceTag({ surface }) {
  const sc = SURFACE_COLOR[surface] ?? SURFACE_COLOR.HARD;
  return (
    <span style={{ background: `${sc.main}22`, border: `1px solid ${sc.main}55`, color: sc.light, fontFamily: U.display, fontSize: 8, fontWeight: 600, letterSpacing: 2, padding: '2px 6px', textTransform: 'uppercase' }}>
      {sc.icon} {sc.label}
    </span>
  );
}

function CatBadge({ category }) {
  const cc = CAT_COLOR[category] ?? { main: '#888', label: category, icon: '🎾' };
  return (
    <span style={{ background: `${cc.main}22`, border: `1px solid ${cc.main}55`, color: cc.main, fontFamily: U.display, fontSize: 8, fontWeight: 600, letterSpacing: 2, padding: '2px 6px', textTransform: 'uppercase' }}>
      {cc.icon} {cc.label}
    </span>
  );
}

function MindsetBadge({ mindset }) {
  const m = mindset ?? TOURNAMENT_MINDSET_NEUTRAL;
  const iconMap = {
    '+++': '▲▲▲',
    '++': '▲▲',
    '+': '▲',
    '0': '•',
    '-': '▼',
    '--': '▼▼',
    '---': '▼▼▼',
  };
  const colorMap = {
    '+++': '#5CFF9B',
    '++': '#8CFFB8',
    '+': '#B8FFD0',
    '0': 'rgba(242,237,228,.32)',
    '-': '#FFB36B',
    '--': '#FF7A62',
    '---': '#FF4D5E',
  };
  const pct = Math.round(((m.modifier ?? 1) - 1) * 100);
  const pctText = pct === 0 ? '100% dos atributos neste torneio' : `${pct > 0 ? '+' : ''}${pct}% neste torneio`;
  const title = `${m.label ?? 'Focado'}: ${m.reason ?? 'Preparacao normal'} (${pctText})`;
  return (
    <span
      title={title}
      style={{
        fontFamily: U.mono,
        fontSize: 8,
        letterSpacing: 1,
        color: colorMap[m.tier] ?? colorMap['0'],
        minWidth: 22,
        textAlign: 'center',
        flexShrink: 0,
        textShadow: m.tier !== '0' ? `0 0 10px ${colorMap[m.tier]}55` : 'none',
      }}
    >
      {iconMap[m.tier] ?? iconMap['0']}
    </span>
  );
}

function PlayerChip({ player, rank, isWinner, highlight }) {
  if (!player) return (
    <div style={{ padding: '5px 10px', color: U.textFaint, fontFamily: U.mono, fontSize: 10 }}>BYE</div>
  );
  const ovr = overallRating(player.attrs);
  const natFlag = player.nationality ? ` — ${player.nationality}` : '';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px',
      background: highlight ? 'rgba(255,215,0,.07)' : 'transparent',
    }}>
      <PlayerFace player={player} size={28} gold={isWinner} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: U.display, fontSize: 12, fontWeight: 600, color: isWinner ? U.gold : U.white, letterSpacing: 1, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {player.name}{natFlag}
        </div>
        <div style={{ fontFamily: U.mono, fontSize: 9, color: U.textFaint }}>{ovrTier(ovr).grade}</div>
      </div>
      <MindsetBadge mindset={player.tournamentMindset} />
      {rank && <RankBadge rank={rank} />}
      {isWinner && <span style={{ fontSize: 10 }}>??</span>}
    </div>
  );
}

// -------------------------------------------------------------------
// TELAS
// -------------------------------------------------------------------

// -- Dashboard / Calendário ------------------------------------------
function SeasonDashboard({ state, dispatch, onBack }) {
  const [tab, setTab] = useState('calendar'); // 'calendar' | 'ranking' | 'prospects'
  const [ceremonyData, setCeremonyData] = useState(null); // { tournament, bracket }
  const [simulating, setSimulating] = useState(false);
  const [simProgress, setSimProgress] = useState(0);

  const nextTournament = CALENDAR[state.calendarIndex];
  const allDone = state.calendarIndex >= CALENDAR.length;

  if (state.view?.type === 'bracket') {
    const res = state.tournamentResults[state.view.id];
    return (
      <BracketView
        result={res}
        players={state.tourPlayers}
        prospects={state.prospects}
        onBack={() => dispatch({ type: 'SET_VIEW', view: null })}
      />
    );
  }

  if (state.view?.type === 'ranking') {
    return (
      <RankingView
        players={state.tourPlayers}
        rankingStore={state.rankingStore}
        onBack={() => dispatch({ type: 'SET_VIEW', view: null })}
      />
    );
  }

  const handleRunNext = async () => {
    if (simulating || allDone) return;
    const tournament = CALENDAR[state.calendarIndex];

    // Olimp—adas: s— ocorrem em anos ol—mpicos (year % 4 === 0)
    // Em outros anos, o slot — pulado silenciosamente
    if (tournament.isOlympic) {
      if (!isOlympicSeasonYear(state.year)) {
        dispatch({ type: 'SKIP_TOURNAMENT' });
        return;
      }
      // Ano ol—mpico: simula com runTournamentFast usando selectOlympicPlayers
      setSimulating(true);
      const loopSlots = Object.fromEntries(
        Object.entries(state.playerSeasonSlots ?? {}).map(([k, v]) => [k, { ...v }])
      );
      try {
        const { bracket, qualifiers, preQualWinners, wildcards, injuryWithdrawals, injuryEvents, updatedByInjury } = runTournamentFast(
          tournament, state.tourPlayers, state.prospects, loopSlots,
        );
        dispatch({
          type: 'APPLY_TOURNAMENT_RESULT',
          tournamentId: tournament.id,
          result: { bracket, qualifiers, preQualWinners, wildcards,
            injuryWithdrawals: injuryWithdrawals ?? new Set(),
            injuryEvents: injuryEvents ?? [], updatedByInjury: updatedByInjury ?? {} },
          tournament,
        });
      } finally {
        setSimulating(false);
      }
      return;
    }

    if (shouldUseFastInvisibleTournament(tournament)) {
      setSimulating(true);
      const loopSlots = Object.fromEntries(
        Object.entries(state.playerSeasonSlots ?? {}).map(([k, v]) => [k, { ...v }])
      );
      try {
        const { bracket, qualifiers, preQualWinners, wildcards, injuryWithdrawals, injuryEvents, updatedByInjury } = runTournamentFast(
          tournament, state.tourPlayers, state.prospects, loopSlots,
        );
        dispatch({
          type: 'APPLY_TOURNAMENT_RESULT',
          tournamentId: tournament.id,
          result: { bracket, qualifiers, preQualWinners, wildcards,
            injuryWithdrawals: injuryWithdrawals ?? new Set(),
            injuryEvents: injuryEvents ?? [], updatedByInjury: updatedByInjury ?? {} },
          tournament,
        });
      } finally {
        setSimulating(false);
      }
      return;
    }

    setSimulating(true);
    setSimProgress(0);

    try {
      let matchCount = 0;
      const onProgress = () => { matchCount++; setSimProgress(matchCount); };

      const result = await runTournament(
        tournament,
        state.tourPlayers,
        state.prospects,
        onProgress,
        state.playerSeasonSlots ?? {},
        null,
        state.year,
        state.rivalrySystem ?? null,
        null,
        state.radar?.followedPlayerIds ?? [],
      );

      dispatch({
        type: 'APPLY_TOURNAMENT_RESULT',
        tournamentId: tournament.id,
        result,
        tournament,
      });

      // Mostra cerim—nia se houver campe—o (não para Juniors nem Challengers)
      const champ = getResChampion(result);
      const skipCeremony = isBaseCircuitTournament(tournament);
      if (champ && !skipCeremony) {
        let wrapData = null;
        try {
          const wrapArt = genTournamentWrap({
            tournament, bracket: result.bracket, year: state.year,
            updatedByInjury: result.updatedByInjury ?? {},
            injuryWithdrawals: result.injuryWithdrawals ?? new Set(),
            allPlayers: [...state.tourPlayers, ...(state.prospects ?? [])],
          });
          wrapData = wrapArt?.wrapData ?? null;
        } catch {}
        setCeremonyData({ tournament, bracket: result.bracket, wrapData });
      }
    } finally {
      setSimulating(false);
    }
  };

  // Agrupa torneios por m—s
  const byMonth = {};
  for (const t of CALENDAR) {
    if (!byMonth[t.month]) byMonth[t.month] = [];
    byMonth[t.month].push(t);
  }

  return (
    <div className="uv-screen">
      <div className="uv-topbar">
        <button className="uv-back-btn" onClick={onBack}>? Voltar</button>
        <div style={{ width: 1, height: 20, background: U.border }} />
        <span style={{ fontFamily: U.display, fontSize: 14, fontWeight: 600, letterSpacing: 3, color: U.white }}>UNIVERSO — {state.year}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: U.mono, fontSize: 10, color: U.textFaint }}>{state.calendarIndex}/{CALENDAR.length} torneios</span>
      </div>

      {/* Tabs */}
      <div style={{ background: U.bgMid, borderBottom: `1px solid ${U.border}`, display: 'flex', padding: '0 24px', flexShrink: 0 }}>
        {['calendar', 'ranking', 'prospects'].map(t => (
          <button key={t} className={`uv-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t === 'calendar' ? '?? Calendário' : t === 'ranking' ? '?? Ranking' : '?? Juniors'}
          </button>
        ))}
      </div>

      {/* Next tournament bar */}
      {!allDone && (
        <div style={{ background: U.bgPanel, borderBottom: `1px solid ${U.border}`, padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {nextTournament && (
            <>
              <span style={{ fontSize: 18 }}>{nextTournament.icon}</span>
              <div>
                <div style={{ fontFamily: U.display, fontSize: 13, fontWeight: 600, letterSpacing: 1, color: U.white }}>{nextTournament.name}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
                  <CatBadge category={nextTournament.category} />
                  <SurfaceTag surface={nextTournament.surface} />
                  <span style={{ fontFamily: U.mono, fontSize: 9, color: U.textFaint }}>DRAW {nextTournament.draw} — {nextTournament.format === 'SUPER_TB_10' ? 'STB10' : (nextTournament.bestOf === 5 ? 'BO5' : 'BO3')}</span>
                </div>
              </div>
              <div style={{ flex: 1 }} />
              {simulating ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="uv-live" style={{ fontFamily: U.mono, fontSize: 10, color: U.clay }}>? SIMULANDO</div>
                  <span style={{ fontFamily: U.mono, fontSize: 10, color: U.textFaint }}>{simProgress} jogos</span>
                </div>
              ) : (
                <button className="uv-btn uv-btn-primary" onClick={handleRunNext}>
                  Simular {nextTournament.name} ?
                </button>
              )}
            </>
          )}
        </div>
      )}

      {allDone && (
        <div style={{ background: '#1a2700', borderBottom: `1px solid #4CAF5033`, padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <span>??</span>
          <span style={{ fontFamily: U.display, fontSize: 13, letterSpacing: 1, color: '#4CAF50' }}>TEMPORADA {state.year} CONCLU—DA</span>
          <div style={{ flex: 1 }} />
          <button className="uv-btn uv-btn-primary" style={{ background: '#2E7D32' }} onClick={() => dispatch({ type: 'ADVANCE_YEAR' })}>
            Avan—ar para {state.year + 1} ?
          </button>
        </div>
      )}

      {/* Content */}
      <div className="uv-scroll" style={{ flex: 1, padding: 24 }}>
        {tab === 'calendar' && (
          <div>
            {Object.entries(byMonth).map(([month, tournaments]) => (
              <div key={month} style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: U.display, fontSize: 11, fontWeight: 600, letterSpacing: 4, color: U.textFaint, marginBottom: 10, textTransform: 'uppercase' }}>
                  {month}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {tournaments.map(t => {
                    const done = !!state.tournamentResults[t.id];
                    const isNext = CALENDAR[state.calendarIndex]?.id === t.id;
                    const cc = CAT_COLOR[t.category] ?? { main: '#888' };
                    const sc = SURFACE_COLOR[t.surface] ?? SURFACE_COLOR.HARD;
                    const result = state.tournamentResults[t.id];
                    const champ = getResChampion(result);

                    return (
                      <div
                        key={t.id}
                        onClick={() => done && dispatch({ type: 'SET_VIEW', view: { type: 'bracket', id: t.id } })}
                        style={{
                          background: isNext ? `${cc.main}11` : done ? U.bgPanel : U.bgMid,
                          border: `1px solid ${isNext ? cc.main + '55' : done ? U.border : U.border}`,
                          padding: '10px 16px',
                          display: 'flex', alignItems: 'center', gap: 12,
                          cursor: done ? 'pointer' : 'default',
                          opacity: !done && !isNext && !simulating ? 0.6 : 1,
                          transition: 'all .15s',
                        }}
                        className={done ? 'uv-card' : ''}
                      >
                        <span style={{ fontSize: 16, flexShrink: 0 }}>{t.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: U.display, fontSize: 13, fontWeight: 600, letterSpacing: 1, color: done ? U.white : isNext ? U.white : U.textDim, textTransform: 'uppercase' }}>
                            {t.name}
                          </div>
                          <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center' }}>
                            <CatBadge category={t.category} />
                            <SurfaceTag surface={t.surface} />
                            <span style={{ fontFamily: U.mono, fontSize: 8, color: U.textFaint }}>
                              {t.draw} jogadores {t.format === 'SUPER_TB_10' ? '— STB10' : (t.bestOf === 5 ? '— BO5' : '')}{t.isOlympic ? (state.year % 4 === 0 ? ' — ANO OL—MPICO ??' : ' — somente anos ol—mpicos') : ''}
                            </span>
                          </div>
                        </div>

                        {done && champ && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <PlayerFace player={champ} size={22} gold />
                            <div>
                              <div style={{ fontFamily: U.display, fontSize: 10, fontWeight: 600, color: U.gold, letterSpacing: 1, textTransform: 'uppercase' }}>{champ.name}</div>
                              <div style={{ fontFamily: U.mono, fontSize: 8, color: U.textFaint }}>{champ.nationality}</div>
                            </div>
                            <span style={{ fontSize: 12 }}>??</span>
                          </div>
                        )}

                        {isNext && !simulating && (
                          <span style={{ fontFamily: U.mono, fontSize: 9, color: cc.main, letterSpacing: 2 }}>PR—XIMO</span>
                        )}
                        {isNext && simulating && (
                          <span className="uv-live" style={{ fontFamily: U.mono, fontSize: 9, color: U.clay }}>? AO VIVO</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'ranking' && (
          <RankingTab players={state.tourPlayers} rankingStore={state.rankingStore} dispatch={dispatch} />
        )}

        {tab === 'prospects' && (
          <JuniorsTab prospects={state.prospects} rankingStore={state.rankingStore} />
        )}
      </div>
    </div>
  );
}

// -- Ranking Tab -----------------------------------------------------
function RankingTab({ players, rankingStore, dispatch }) {
  const ranked = rankingStore.ranked.length > 0 ? rankingStore.ranked : players.map((p, i) => ({ playerId: p.id, position: i + 1, points: 0 }));
  const playerMap = Object.fromEntries(players.map(p => [p.id, p]));

  return (
    <div>
      <div style={{ fontFamily: U.mono, fontSize: 9, letterSpacing: 4, color: U.textFaint, marginBottom: 16 }}>RANKING DO TOUR PRINCIPAL</div>
      {ranked.slice(0, 100).map(entry => {
        const p = playerMap[entry.playerId];
        if (!p) return null;
        const ovr = overallRating(p.attrs);
        const pos = entry.position;
        const posColor = pos <= 8 ? U.gold : pos <= 32 ? U.white : U.textDim;

        return (
          <div key={p.id} className="uv-player-row" style={{ alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: U.mono, fontSize: 12, fontWeight: 700, color: posColor, minWidth: 32, textAlign: 'right' }}>{pos}</span>
            <PlayerFace player={p} size={26} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: U.display, fontSize: 12, fontWeight: 600, color: U.white, letterSpacing: 1, textTransform: 'uppercase' }}>{p.name}</div>
              <div style={{ fontFamily: U.mono, fontSize: 9, color: U.textFaint }}>{p.nationality} — {p.styleId} — {p.age}a</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: U.mono, fontSize: 12, fontWeight: 700, color: U.white }}>{entry.points} pts</div>
              <div style={{ fontFamily: U.mono, fontSize: 9, color: U.textFaint }}>{ovrTier(ovr).grade}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// -- Juniors Tab ----------------------------------------------------
function JuniorsTab({ prospects, rankingStore }) {
  const pRanked = rankingStore.prospectRanked.length > 0
    ? rankingStore.prospectRanked
    : prospects.map((p, i) => ({ playerId: p.id, position: i + 1, points: 0 }));
  const playerMap = Object.fromEntries(prospects.map(p => [p.id, p]));

  return (
    <div>
      <div style={{ fontFamily: U.mono, fontSize: 9, letterSpacing: 4, color: U.textFaint, marginBottom: 16 }}>RANKING PROSPECTS</div>
      {pRanked.map(entry => {
        const p = playerMap[entry.playerId];
        if (!p) return null;
        const ovr = overallRating(p.attrs);
        return (
          <div key={p.id} className="uv-player-row" style={{ gap: 10 }}>
            <span style={{ fontFamily: U.mono, fontSize: 12, fontWeight: 700, color: entry.position <= 8 ? '#FF7043' : U.textDim, minWidth: 32, textAlign: 'right' }}>{entry.position}</span>
            <PlayerFace player={p} size={26} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: U.display, fontSize: 12, fontWeight: 600, color: U.white, letterSpacing: 1, textTransform: 'uppercase' }}>{p.name}</div>
              <div style={{ fontFamily: U.mono, fontSize: 9, color: U.textFaint }}>{p.nationality} — {p.age}a</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: U.mono, fontSize: 12, fontWeight: 700, color: '#FF7043' }}>{entry.points} pts</div>
              <div style={{ fontFamily: U.mono, fontSize: 9, color: U.textFaint }}>{ovrTier(ovr).grade}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// -- Bracket View -----------------------------------------------------

/** L— o campe—o de um resultado slim ou full sem quebrar. */
function getResChampion(res) {
  if (!res) return null;
  return res._slim ? res.champion : (res.bracket?.champion ?? null);
}

function BracketView({ result, players, prospects, onBack }) {
  const [selectedRound, setSelectedRound] = useState(0);

  if (!result) return (
    <div className="uv-screen">
      <div className="uv-topbar"><button className="uv-back-btn" onClick={onBack}>? Voltar</button></div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: U.textFaint, fontFamily: U.mono }}>Resultado não encontrado</div>
      </div>
    </div>
  );

  const tournament = result.tournament ?? {};
  const sc = SURFACE_COLOR[tournament.surface] ?? SURFACE_COLOR.HARD;
  const cc = CAT_COLOR[tournament.category] ?? { main: '#888', label: tournament.category, icon: '🎾' };
  const allPlayers = [...players, ...prospects];
  const playerMap = Object.fromEntries(allPlayers.map(p => [p.id, p]));
  const champion = getResChampion(result);

  // -- SLIM FORMAT (loaded from save) ------------------------------
  if (result._slim) {
    const finalist = result.finalist;
    const semis    = result.semis ?? [];
    const matches  = result.matches ?? []; // [{w,l}]

    // Reconstruct podium rows
    const podium = [
      champion  ? { rank: 1, icon: '🎾', label: 'Campeão',     color: U.gold,    p: champion  } : null,
      finalist  ? { rank: 2, icon: '🎾', label: 'Finalista',   color: U.textDim, p: finalist  } : null,
      ...semis.map(s => ({ rank: 3, icon: '🎾', label: 'Semifinal', color: U.textFaint, p: s })),
    ].filter(Boolean);

    // Group remaining W/L matches as simple list
    const champId    = champion?.id;
    const finalistId = finalist?.id;
    const semiIds    = new Set(semis.map(s => s.id));

    // Assign round label heuristic from podium membership
    const getRoundLabel = (wId, lId) => {
      if (wId === champId)    return 'Final';
      if (semiIds.has(lId))   return 'Semifinal';
      return '—';
    };

    return (
      <div className="uv-screen">
        <div className="uv-topbar">
          <button className="uv-back-btn" onClick={onBack}>? Voltar</button>
          <div style={{ width: 1, height: 20, background: U.border }} />
          <span style={{ fontSize: 14 }}>{tournament.icon}</span>
          <div>
            <div style={{ fontFamily: U.display, fontSize: 14, fontWeight: 700, letterSpacing: 2, color: U.white, textTransform: 'uppercase' }}>{tournament.name}</div>
          </div>
          <div style={{ flex: 1 }} />
          <CatBadge category={tournament.category} />
          <SurfaceTag surface={tournament.surface} />
        </div>

        <div className="uv-scroll" style={{ flex: 1, padding: 20 }}>
          {/* P—dio */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: U.mono, fontSize: 8, letterSpacing: 4, color: U.textFaint, marginBottom: 10 }}>RESULTADOS</div>
            {podium.map(({ rank, icon, label, color, p }) => {
              const pFull = playerMap[p.id];
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${U.border}` }}>
                  <span style={{ fontSize: rank === 1 ? 22 : 16, width: 28, textAlign: 'center' }}>{icon}</span>
                  <PlayerFace player={pFull ?? p} size={rank === 1 ? 30 : 22} gold={rank === 1} />
                  <div>
                    <div style={{ fontFamily: U.mono, fontSize: 7, letterSpacing: 3, color: U.textFaint }}>{label}</div>
                    <div style={{ fontFamily: U.display, fontSize: rank === 1 ? 15 : 12, fontWeight: 700, color, letterSpacing: 1, textTransform: 'uppercase' }}>{p.name}</div>
                    <div style={{ fontFamily: U.mono, fontSize: 8, color: U.textFaint }}>{p.nationality ?? (pFull?.nationality ?? '')}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Todos os confrontos */}
          {matches.length > 0 && (
            <div>
              <div style={{ fontFamily: U.mono, fontSize: 8, letterSpacing: 4, color: U.textFaint, marginBottom: 10 }}>CONFRONTOS ({matches.length})</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 6 }}>
                {matches.map(({ w, l }, i) => {
                  const wp = playerMap[w];
                  const lp = playerMap[l];
                  const rl = getRoundLabel(w, l);
                  return (
                    <div key={i} style={{ background: U.bgPanel, border: `1px solid ${U.border}`, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {rl !== '—' && <span style={{ fontFamily: U.mono, fontSize: 7, color: cc.main, letterSpacing: 1, minWidth: 48 }}>{rl}</span>}
                      <div style={{ flex: 1, fontFamily: U.display, fontSize: 10, fontWeight: 700, color: U.white, letterSpacing: 1, textTransform: 'uppercase' }}>
                        {wp?.name ?? w}
                      </div>
                      <span style={{ fontFamily: U.mono, fontSize: 8, color: U.textFaint }}>def.</span>
                      <div style={{ flex: 1, fontFamily: U.display, fontSize: 10, color: U.textDim, letterSpacing: 1, textTransform: 'uppercase' }}>
                        {lp?.name ?? l}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // -- FULL BRACKET FORMAT (live / mid-season, não-salvo) -----------
  const { bracket, qualifiers } = result;
  const { rounds } = bracket;

  const roundLabels = rounds.map((_, ri) => {
    const fromEnd = rounds.length - 1 - ri;
    const labels = ['Final', 'Semifinal', 'Quartas', 'Oitavas', '3— Rod.', '2— Rod.', '1— Rod.'];
    return labels[fromEnd] ?? `Rodada ${ri + 1}`;
  });

  const currentMatches = rounds[selectedRound] ?? [];

  return (
    <div className="uv-screen">
      <div className="uv-topbar">
        <button className="uv-back-btn" onClick={onBack}>? Voltar</button>
        <div style={{ width: 1, height: 20, background: U.border }} />
        <span style={{ fontSize: 14 }}>{tournament.icon}</span>
        <div>
          <div style={{ fontFamily: U.display, fontSize: 14, fontWeight: 700, letterSpacing: 2, color: U.white, textTransform: 'uppercase' }}>{tournament.name}</div>
        </div>
        <div style={{ flex: 1 }} />
        <CatBadge category={tournament.category} />
        <SurfaceTag surface={tournament.surface} />
      </div>

      {champion && (
        <div style={{ background: `${cc.main}14`, borderBottom: `1px solid ${cc.main}44`, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>??</span>
          <div>
            <div style={{ fontFamily: U.mono, fontSize: 8, letterSpacing: 3, color: U.textFaint }}>CAMPE—O</div>
            <div style={{ fontFamily: U.display, fontSize: 18, fontWeight: 700, color: U.gold, letterSpacing: 2, textTransform: 'uppercase' }}>{champion.name}</div>
            <div style={{ fontFamily: U.mono, fontSize: 9, color: U.textFaint }}>{champion.nationality} — {champion.styleId}</div>
          </div>
        </div>
      )}

      <div style={{ background: U.bgMid, borderBottom: `1px solid ${U.border}`, display: 'flex', padding: '0 20px', overflow: 'auto', flexShrink: 0 }}>
        {roundLabels.map((label, ri) => (
          <button key={ri} className={`uv-tab${selectedRound === ri ? ' active' : ''}`} onClick={() => setSelectedRound(ri)}>
            {label} ({rounds[ri].filter(m => !m.isBye).length})
          </button>
        ))}
      </div>

      <div className="uv-scroll" style={{ flex: 1, padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 8 }}>
          {currentMatches.map((match, mi) => {
            const isWon = (p) => p && match.winner?.id === p.id;
            const setScore = match.result
              ? `${match.result.sets[0]}—${match.result.sets[1]}`
              : match.isBye ? 'BYE' : '—';

            if (match.isBye && !match.playerB) {
              return (
                <div key={mi} style={{ background: U.bgPanel, border: `1px solid ${U.border}`, padding: 2, opacity: 0.5 }}>
                  <PlayerChip player={match.playerA} isWinner={true} />
                  <div style={{ padding: '4px 10px', fontFamily: U.mono, fontSize: 9, color: U.textFaint }}>BYE</div>
                </div>
              );
            }

            return (
              <div key={mi} style={{ background: U.bgPanel, border: `1px solid ${U.border}`, padding: 2 }}>
                <PlayerChip player={match.playerA} isWinner={isWon(match.playerA)} />
                <div style={{ display: 'flex', alignItems: 'center', padding: '2px 10px', gap: 8 }}>
                  <div style={{ flex: 1, height: 1, background: U.border }} />
                  <span style={{ fontFamily: U.mono, fontSize: 10, color: U.textFaint }}>{setScore}</span>
                  {match.result && (
                    <span style={{ fontFamily: U.mono, fontSize: 9, color: U.textFaint }}>
                      {match.result.setsDetail?.map(([a,b]) => `${a}—${b}`).join(' ')}
                    </span>
                  )}
                  <div style={{ flex: 1, height: 1, background: U.border }} />
                </div>
                <PlayerChip player={match.playerB} isWinner={isWon(match.playerB)} />
              </div>
            );
          })}
        </div>

        {qualifiers?.length > 0 && selectedRound === 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{ fontFamily: U.mono, fontSize: 8, letterSpacing: 4, color: U.textFaint, marginBottom: 8 }}>QUALIFICADOS ({qualifiers.length})</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {qualifiers.map(q => (
                <div key={q.id} style={{ background: U.bgPanel, border: `1px solid ${U.border}`, padding: '4px 10px', fontFamily: U.display, fontSize: 10, color: U.textDim, letterSpacing: 1, textTransform: 'uppercase' }}>
                  {q.name}
                </div>
              ))}
            </div>
          </div>
        )}
        {result?.preQualWinners?.length > 0 && selectedRound === 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontFamily: U.mono, fontSize: 8, letterSpacing: 4, color: U.textFaint, marginBottom: 8 }}>PR—-QUALIFY WINNERS ({result.preQualWinners.length})</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {result.preQualWinners.map(q => (
                <div key={q.id} style={{ background: U.bgPanel, border: `1px solid ${U.border}`, padding: '4px 10px', fontFamily: U.display, fontSize: 10, color: U.textFaint, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.7 }}>
                  {q.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// -- Ranking View -----------------------------------------------------
function RankingView({ players, rankingStore, onBack }) {
  return (
    <div className="uv-screen">
      <div className="uv-topbar">
        <button className="uv-back-btn" onClick={onBack}>? Voltar</button>
        <div style={{ width: 1, height: 20, background: U.border }} />
        <span style={{ fontFamily: U.display, fontSize: 14, fontWeight: 600, letterSpacing: 3, color: U.white }}>RANKING TOUR</span>
      </div>
      <div className="uv-scroll" style={{ flex: 1, padding: 20 }}>
        <RankingTab players={players} rankingStore={rankingStore} dispatch={() => {}} />
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// END YEAR CEREMONY — Cerim—nia de Encerramento de Temporada
// -------------------------------------------------------------------

const _EY_CSS = `
@keyframes _ey_in    { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
@keyframes _ey_zoom  { from{opacity:0;transform:scale(.92)} to{opacity:1;transform:scale(1)} }
@keyframes _ey_pulse { 0%,100%{opacity:.7} 50%{opacity:1} }
@keyframes _ey_glow  { 0%,100%{text-shadow:0 0 20px var(--ey-c,#FFD700)} 50%{text-shadow:0 0 60px var(--ey-c,#FFD700),0 0 120px var(--ey-c,#FFD700)} }
@keyframes _ey_scan  { 0%{transform:translateY(-100%)} 100%{transform:translateY(200%)} }
@keyframes _ey_star  { 0%,100%{transform:scale(1) rotate(0deg);opacity:.8} 50%{transform:scale(1.3) rotate(180deg);opacity:1} }
@keyframes _ey_bar   { from{width:0} to{width:100%} }
@keyframes _ey_count { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
._ey_overlay {
  position:fixed;inset:0;z-index:9998;
  background:#e7ddc5;
  display:flex;flex-direction:column;overflow:hidden;
  animation:_ey_zoom .5s cubic-bezier(.16,1,.3,1);
  font-family:'Barlow Condensed','Barlow Condensed',sans-serif;
}
._ey_stars {
  position:absolute;inset:0;pointer-events:none;overflow:hidden;opacity:.14;
}
._ey_star_dot {
  position:absolute;border-radius:50%;background:white;
  animation:_ey_pulse linear infinite;
}
._ey_scanline {
  position:absolute;left:0;right:0;height:2px;
  background:linear-gradient(90deg,transparent,rgba(255,215,0,.15),transparent);
  animation:_ey_scan 6s linear infinite;pointer-events:none;
}
._ey_tab_btn {
  padding:14px 20px;border:none;cursor:pointer;background:transparent;
  font-family:'Space Mono',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;
  border-bottom:2px solid transparent;transition:all .2s;flex:1;
}
._ey_tab_btn:hover { background:rgba(255,255,255,.03); }
._ey_tab_btn.active { border-bottom-color:#FFD700;color:#FFD700; }
._ey_card {
  background:rgba(255,255,255,.032);border:1px solid rgba(255,255,255,.07);
  padding:14px 16px;transition:background .15s;
}
._ey_card:hover { background:rgba(255,255,255,.055); }
._ey_award_card {
  background:linear-gradient(135deg,rgba(255,255,255,.04),rgba(255,255,255,.015));
  border:1px solid rgba(255,255,255,.1);padding:20px 24px;
  position:relative;overflow:hidden;
}
._ey_pill {
  display:inline-flex;align-items:center;gap:5px;
  padding:3px 10px;border:1px solid rgba(255,255,255,.12);
  font-family:'Space Mono',monospace;font-size:8px;letter-spacing:2px;text-transform:uppercase;
  color:rgba(255,255,255,.45);
}
/* Arquivo anual: a cerimônia tem a mesma matéria física das fichas.  Isto
   neutraliza o tema escuro herdado das abas antigas sem apagar os acentos que
   continuam úteis em filetes, barras e bordas. */
._ey_overlay, ._ey_overlay * { text-shadow:none !important; }
._ey_overlay [style] { color:#3B2F21 !important; }
._ey_overlay button { color:#3B2F21 !important; }
._ey_overlay ._ey_card, ._ey_overlay ._ey_award_card { background:rgba(255,255,255,.26);border-color:rgba(79,59,35,.20); }
._ey_overlay ._ey_tab_btn.active { border-bottom-color:#B9784A;color:#3B2F21 !important;font-weight:800; }
._ey_overlay ._ey_tab_btn:hover { background:rgba(79,59,35,.07); }
`;

function _ey_injectCSS() {
  if (document.getElementById('_ey_styles_v2')) return;
  document.getElementById('_ey_styles')?.remove();
  const s = document.createElement('style');
  s.id = '_ey_styles_v2'; s.textContent = _EY_CSS;
  document.head.appendChild(s);
}

function isJuniorResultEntry(result, targetYear = null) {
  const tournament = result?.tournament;
  if (!tournament) return false;
  const season = result?._season ?? tournament?.season ?? tournament?.year ?? null;
  if (targetYear != null && season != null && season !== targetYear) return false;
  return !!(
    tournament.isJuniors ||
    tournament.isProspects ||
    tournament.isProspectsFinals ||
    tournament.category === 'ATP_PROSPECTS' ||
    tournament.category === 'PROSPECTS_FINALS'
  );
}

function juniorRoundLabel(fromEnd) {
  if (fromEnd === 0) return 'campeao';
  if (fromEnd === 1) return 'finalista';
  if (fromEnd === 2) return 'semifinalista';
  if (fromEnd === 3) return 'quartas';
  return 'rodadas iniciais';
}

function buildJuniorPromotionSnapshot(player, tournamentResults = {}, year) {
  if (!player) return null;
  let wins = 0;
  let losses = 0;
  let titles = 0;
  let finals = 0;
  let juniorFinalsTitle = 0;
  let bestFinish = 'sem campanha registrada';
  let bestDepth = Number.POSITIVE_INFINITY;

  Object.values(tournamentResults ?? {}).forEach((result) => {
    if (!isJuniorResultEntry(result, year)) return;
    const tournament = result?.tournament ?? {};
    const rounds = result?.bracket?.rounds ?? [];
    let deepestFromEnd = null;
    let playedThisEvent = false;

    rounds.forEach((round, roundIdx) => {
      const fromEnd = Math.max(0, rounds.length - 1 - roundIdx);
      round.forEach((match) => {
        if (match?.isBye || !match?.winner) return;
        const isA = match.playerA?.id === player.id;
        const isB = match.playerB?.id === player.id;
        if (!isA && !isB) return;
        playedThisEvent = true;
        deepestFromEnd = deepestFromEnd == null ? fromEnd : Math.min(deepestFromEnd, fromEnd);
        if (match.winner?.id === player.id) wins += 1;
        else losses += 1;
      });
    });

    if (result?.bracket?.champion?.id === player.id) {
      titles += 1;
      if (tournament.category === 'PROSPECTS_FINALS') juniorFinalsTitle += 1;
    }

    const finalMatch = rounds.at(-1)?.[0];
    if (finalMatch && playedThisEvent) {
      const finalist =
        finalMatch.playerA?.id === result?.bracket?.champion?.id
          ? finalMatch.playerB
          : finalMatch.playerA;
      if (result?.bracket?.champion?.id === player.id || finalist?.id === player.id) finals += 1;
    }

    if (deepestFromEnd != null && deepestFromEnd < bestDepth) {
      bestDepth = deepestFromEnd;
      bestFinish = juniorRoundLabel(deepestFromEnd);
    }
  });

  return {
    juniorRank: player.rankPosition ?? null,
    wins,
    losses,
    titles,
    finals,
    juniorFinalsTitle,
    bestFinish,
  };
}

// Starfield background
function EyStars({ count = 60 }) {
  const stars = React.useMemo(() => {
    const s = [];
    for (let i = 0; i < count; i++) {
      s.push({
        left: `${Math.random()*100}%`,
        top: `${Math.random()*100}%`,
        size: Math.random() * 2 + 0.5,
        dur: `${2 + Math.random() * 4}s`,
        delay: `${Math.random() * 4}s`,
        opacity: 0.1 + Math.random() * 0.35,
      });
    }
    return s;
  }, []);
  return (
    <div className="_ey_stars">
      <div className="_ey_scanline" />
      {stars.map((s, i) => (
        <div key={i} className="_ey_star_dot" style={{
          left: s.left, top: s.top,
          width: s.size, height: s.size,
          opacity: s.opacity,
          animationDuration: s.dur,
          animationDelay: s.delay,
        }} />
      ))}
    </div>
  );
}

// Score formatter
function fmtScore(setsDetail) {
  if (!setsDetail?.length) return '';
  return setsDetail.map(([a,b]) => `${a}—${b}`).join(' ');
}

const CAT_META = {
  GRAND_SLAM:    { color:'#FFD700', label:'Grand Slam',   short:'GS',     icon:'🏆' },
  SLAM_CLASH:    { color:'#FF8A3D', label:'Clash Slam',   short:'CS',     icon:'🎾' },
  FINALS:        { color:'#F44336', label:'ATP Finals',   short:'FINALS', icon:'🎾' },
  MASTERS_1000:  { color:'#CE93D8', label:'Masters 1000', short:'M1000',  icon:'🎾' },
  ATP_500:       { color:'#4DD0E1', label:'ATP 500',      short:'500',    icon:'🎾' },
  ATP_250:       { color:'#81C784', label:'ATP 250',      short:'250',    icon:'🎾' },
  ATP_PROSPECTS: { color:'#FF8A65', label:'Juniors',    short:'PROS',   icon:'🎾' },
  JUNIOR_50:      { color:'#B7B3B0', label:'Junior 50',  short:'J50',    icon:'🎾' },
  JUNIOR_100:     { color:'#FFB067', label:'Junior 100', short:'J100',   icon:'🎾' },
  JUNIOR_SLAM:    { color:'#FFD166', label:'Junior Slam',short:'J-SLAM', icon:'🎾' },
  PROSPECTS_FINALS: { color:'#FF8A65', label:'Junior Finals', short:'PF', icon:'🎾' },
  ATP_100: { color:'#8D6E63', label:'ATP 100', short:'100', icon:'🎾' },
  ATP_75: { color:'#A1887F', label:'ATP 75', short:'75', icon:'🎾' },
  ATP_50: { color:'#BCAAA4', label:'ATP 50', short:'50', icon:'🎾' },
  ATP_25: { color:'#D7CCC8', label:'ATP 25', short:'25', icon:'🎾' },
  OLYMPICS:      { color:'#1976D2', label:'Jogos Olímpicos', short:'OLY', icon:'🎾' },
};

const SURF_META = {
  CLAY:   { color:'#C4572A', label:'Saibro' },
  GRASS:  { color:'#2E7D32', label:'Grama' },
  HARD:   { color:'#1565C0', label:'Dura' },
  STREET: { color:'#B45309', label:'Asfalto' },
  CARPET: { color:'#8B1A3A', label:'Veludo' },
  INDOOR: { color:'#6A1B9A', label:'Indoor' },
};

// -- TAB: TEMPORADA (Overview) ------------------------------------
function TabTemporada({ summary }) {
  const { year, champions, awards, topGainers, retired, traitProgressions = [] } = summary;
  const gsChamps = champions.filter(c => c.tournament.category === 'GRAND_SLAM');
  const clashChamps = champions.filter(c => c.tournament.category === 'SLAM_CLASH');
  const finalsChamp = champions.find(c => c.tournament.category === 'FINALS');

  return (
    <div style={{ padding: '28px 32px 40px', display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* #1 Reveal */}
      {awards.noOne && (
        <div style={{
          position: 'relative', overflow: 'hidden',
          padding: '32px 36px',
          background: 'linear-gradient(135deg, rgba(255,215,0,.06) 0%, rgba(255,215,0,.02) 100%)',
          border: '1px solid rgba(255,215,0,.2)',
          borderLeft: '3px solid #FFD700',
          animation: '_ey_in .5s ease',
        }}>
          <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '40%',
            background: 'linear-gradient(90deg, transparent, rgba(255,215,0,.03))', pointerEvents: 'none' }} />
          <div style={{
            fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: 5,
            color: '#FFD700', textTransform: 'uppercase', marginBottom: 10, opacity: .7,
          }}>N— 1 do Mundo — Temporada {year}</div>
          <div style={{
            fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif",
            fontSize: 'clamp(40px,6vw,72px)', fontWeight: 900,
            color: '#FFD700', lineHeight: .9, letterSpacing: -1,
            textShadow: '0 0 40px rgba(255,215,0,.3)',
            animation: '_ey_glow 4s ease-in-out infinite',
            '--ey-c': '#FFD700',
          }}>{awards.noOne.name}</div>
          <div style={{ display: 'flex', gap: 24, marginTop: 14, flexWrap: 'wrap' }}>
            <span className="_ey_pill">{awards.noOne.nationality}</span>
            <span className="_ey_pill">{awards.noOne.styleData?.label ?? awards.noOne.styleId}</span>
            {awards.mostTitlesPlayer?.id === awards.noOne.id && (
              <span className="_ey_pill" style={{ color:'#FFD700', borderColor:'rgba(255,215,0,.3)' }}>
                {awards.mostTitlesCount} t—tulos na temporada
              </span>
            )}
          </div>
        </div>
      )}

      {/* Grand Slam Row */}
      {gsChamps.length > 0 && (
        <div>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: 4, color: 'rgba(255,215,0,.55)', textTransform: 'uppercase', marginBottom: 14 }}>
            ? Grand Slams
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(gsChamps.length, 4)}, 1fr)`, gap: 4 }}>
            {gsChamps.map((c, i) => {
              const surf = SURF_META[c.tournament.surface] ?? { color: '#888', label: '?' };
              return (
                <div key={i} className="_ey_card" style={{
                  borderLeft: `3px solid ${surf.color}`,
                  animation: `_ey_in .4s ease ${i * .08}s both`,
                }}>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, letterSpacing: 2, color: surf.color, textTransform: 'uppercase', marginBottom: 6 }}>
                    {c.tournament.name}
                  </div>
                  <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>
                    {c.champion.name}
                  </div>
                  {c.finalist && (
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,.3)', marginTop: 4 }}>
                      def. {c.finalist.name} {fmtScore(c.setsDetail)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {clashChamps.length > 0 && (
        <div>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: 4, color: 'rgba(255,138,61,.72)', textTransform: 'uppercase', marginBottom: 14 }}>
            ?? Clash Slams
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(clashChamps.length, 4)}, 1fr)`, gap: 4 }}>
            {clashChamps.map((c, i) => {
              const surf = SURF_META[c.tournament.surface] ?? { color: '#FF8A3D', label: '?' };
              return (
                <div key={i} className="_ey_card" style={{
                  borderLeft: `3px solid #FF8A3D`,
                  animation: `_ey_in .4s ease ${i * .08}s both`,
                }}>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, letterSpacing: 2, color: surf.color, textTransform: 'uppercase', marginBottom: 6 }}>
                    {c.tournament.name}
                  </div>
                  <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>
                    {c.champion.name}
                  </div>
                  {c.finalist && (
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,.3)', marginTop: 4 }}>
                      def. {c.finalist.name} {fmtScore(c.setsDetail)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ATP Finals */}
      {finalsChamp && (
        <div>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: 4, color: 'rgba(244,67,54,.65)', textTransform: 'uppercase', marginBottom: 14 }}>
            ?? ATP Finals
          </div>
          <div className="_ey_card" style={{ borderLeft: '3px solid #F44336', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 28, fontWeight: 800, color: '#fff' }}>
                {finalsChamp.champion.name}
              </div>
              {finalsChamp.finalist && (
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,.35)', marginTop: 4 }}>
                  def. {finalsChamp.finalist.name} {fmtScore(finalsChamp.setsDetail)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3-column: Most Improved, Newcomer, Retired count */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {awards.mostImproved && (
          <div className="_ey_card" style={{ borderLeft: '3px solid #52C46A', animation: '_ey_in .5s ease .2s both' }}>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, letterSpacing: 2, color: '#52C46A', marginBottom: 6 }}>MAIS EVOLU—DO</div>
            <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 20, fontWeight: 700, color: '#fff' }}>{awards.mostImproved.name}</div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#52C46A', marginTop: 3 }}>
              Maior evolu——o da temporada — {awards.mostImproved.age} anos
            </div>
          </div>
        )}
        {awards.bestNewcomer && (
          <div className="_ey_card" style={{ borderLeft: '3px solid #4A90C4', animation: '_ey_in .5s ease .3s both' }}>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, letterSpacing: 2, color: '#4A90C4', marginBottom: 6 }}>REVELA——O</div>
            <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 20, fontWeight: 700, color: '#fff' }}>{awards.bestNewcomer.name}</div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#4A90C4', marginTop: 3 }}>
              #{awards.bestNewcomer.rankPosition ?? '?'} — 1— ano no tour
            </div>
          </div>
        )}
        <div className="_ey_card" style={{ borderLeft: '3px solid rgba(255,255,255,.2)', animation: '_ey_in .5s ease .4s both' }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, letterSpacing: 2, color: 'rgba(255,255,255,.35)', marginBottom: 6 }}>APOSENTADOS</div>
          <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 40, fontWeight: 900, color: 'rgba(255,255,255,.6)', lineHeight: 1 }}>
            {retired.length}
          </div>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: 'rgba(255,255,255,.25)', marginTop: 3 }}>
            0 promovidos das prospects
          </div>
        </div>
      </div>

      {traitProgressions.length > 0 && (
        <div>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: 4, color: 'rgba(0,212,255,.62)', textTransform: 'uppercase', marginBottom: 14 }}>
            Evolução de Traits
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0,1fr))', gap:8 }}>
            {traitProgressions.slice(0, 6).map((item, i) => (
              <div key={`${item.playerId}-${i}`} className="_ey_card" style={{ borderLeft:'3px solid #00D4FF', background:'linear-gradient(180deg, rgba(0,212,255,.08), rgba(255,255,255,.02))' }}>
                <div style={{ fontFamily:"'Barlow Condensed','Barlow Condensed',sans-serif", fontSize:24, fontWeight:800, color:'#fff', lineHeight:1 }}>
                  {item.playerName}
                </div>
                {item.gained?.length > 0 && (
                  <div style={{ marginTop:10 }}>
                    <div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:2, color:'#00D4FF', textTransform:'uppercase', marginBottom:6 }}>ganhou</div>
                    <div style={{ fontFamily:"'Barlow Condensed','Barlow Condensed',sans-serif", fontSize:16, color:'#D6F7FF', lineHeight:1.2 }}>
                      {item.gained.join(' · ')}
                    </div>
                  </div>
                )}
                {item.healed?.length > 0 && (
                  <div style={{ marginTop:10 }}>
                    <div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:2, color:'#7CFFB2', textTransform:'uppercase', marginBottom:6 }}>superou</div>
                    <div style={{ fontFamily:"'Barlow Condensed','Barlow Condensed',sans-serif", fontSize:16, color:'#E9FFF1', lineHeight:1.2 }}>
                      {item.healed.join(' · ')}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// -- TAB: PREMIA——ES ----------------------------------------------
function TabPremiacoes({ summary }) {
  const { year, awards, topGainers, topLosers, champions, seasonMetrics } = summary;

  const gsKingLabel = awards.gsKingCount >= 3 ? 'DOMINADOR DOS GRAND SLAMS' :
                      awards.gsKingCount === 2 ? 'REI DOS GRAND SLAMS' : 'CAMPE—O DE GRAND SLAM';

  const allAwards = [
    {
      icon: '🎾', title: 'Jogador do Ano',
      name: awards.noOne?.name ?? '—',
      sub: awards.noOne ? `N— 1 mundial — ${awards.noOne.nationality}` : '',
      color: '#FFD700',
      desc: awards.noOne ? `${awards.noOne.name} dominou a temporada ${year} e encerrou o ano no topo do ranking mundial.` : '',
    },
    ...(awards.gsKingPlayer ? [{
      icon: '🏆', title: gsKingLabel,
      name: awards.gsKingPlayer.name,
      sub: `${awards.gsKingCount} Grand Slam${awards.gsKingCount > 1 ? 's' : ''} em ${year}`,
      color: '#FFD700',
      desc: `Uma temporada hist—rica nos Grand Slams. ${awards.gsKingPlayer.name} conquistou ${awards.gsKingCount} trof—u${awards.gsKingCount > 1 ? 's' : ''} no principais torneios do mundo.`,
    }] : []),
    ...(awards.mostTitlesPlayer && awards.mostTitlesCount > 1 ? [{
      icon: '🎾', title: 'Mais T—tulos na Temporada',
      name: awards.mostTitlesPlayer.name,
      sub: `${awards.mostTitlesCount} t—tulos em ${year}`,
      color: '#CE93D8',
      desc: `Com ${awards.mostTitlesCount} trof—us em ${year}, ${awards.mostTitlesPlayer.name} foi o jogador mais vitorioso da temporada.`,
    }] : []),
    ...(awards.mostImproved ? [{
      icon: '🎾', title: 'Mais Evolu—do',
      name: awards.mostImproved.name,
      sub: `Maior evolu——o — ${awards.mostImproved.nationality}`,
      color: '#52C46A',
      desc: `Desenvolvimento impressionante. ${awards.mostImproved.name} foi o jogador que mais cresceu em nível absoluto durante ${year}.`,
    }] : []),
    ...(awards.bestNewcomer ? [{
      icon: '🎾', title: 'Revela——o do Ano',
      name: awards.bestNewcomer.name,
      sub: `#${awards.bestNewcomer.rankPosition ?? '?'} — 1— ano no tour principal`,
      color: '#4A90C4',
      desc: `Subiu das prospects e se firmou. ${awards.bestNewcomer.name} foi a maior surpresa do tour em ${year}.`,
    }] : []),
  ];

  return (
    <div style={{ padding: '28px 32px 40px', display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Main awards */}
      <div>
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: 4, color: 'rgba(255,215,0,.55)', textTransform: 'uppercase', marginBottom: 16 }}>
          Pr—mios Individuais
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {allAwards.map((a, i) => (
            <div key={i} className="_ey_award_card" style={{
              borderLeft: `3px solid ${a.color}`,
              animation: `_ey_in .4s ease ${i * .1}s both`,
            }}>
              <div style={{ position: 'absolute', top: -20, right: -20, fontSize: 80, opacity: .04, userSelect: 'none' }}>{a.icon}</div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{a.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, letterSpacing: 3, color: a.color, textTransform: 'uppercase', marginBottom: 4 }}>{a.title}</div>
                  <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 26, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>{a.name}</div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>{a.sub}</div>
                  {a.desc && <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 13, color: 'rgba(255,255,255,.45)', lineHeight: 1.5, marginTop: 8 }}>{a.desc}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* OVR gainers */}
      <div>
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: 4, color: '#52C46A', textTransform: 'uppercase', marginBottom: 12 }}>
          ? Maiores Evolu——es da Temporada
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {topGainers.map(({ player, delta, ovrBefore, ovrAfter }, i) => (
            <div key={player.id} className="_ey_card" style={{
              display: 'flex', alignItems: 'center', gap: 12,
              borderLeft: '2px solid #52C46A',
              animation: `_ey_in .35s ease ${i * .07}s both`,
            }}>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, color: 'rgba(82,196,106,.4)', minWidth: 20, textAlign: 'center' }}>#{i+1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 16, fontWeight: 700, color: '#fff' }}>{player.name}</div>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.3)' }}>{player.age}a — {player.nationality}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {(() => {
                  const gBefore = ovrTier(ovrBefore).grade;
                  const gAfter  = ovrTier(ovrAfter).grade;
                  const changed = gBefore !== gAfter;
                  return (
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,.3)', letterSpacing: 1 }}>
                      {changed
                        ? <><span style={{ color: 'rgba(255,255,255,.25)' }}>{gBefore}</span> <span style={{ color: '#52C46A' }}>? {gAfter}</span></>
                        : <span style={{ color: 'rgba(82,196,106,.4)' }}>{gAfter} ?</span>
                      }
                    </div>
                  );
                })()}
                <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 22, fontWeight: 800, color: '#52C46A', lineHeight: 1 }}>Maior evolu——o</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* OVR losers */}
      <div>
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: 4, color: '#D45050', textTransform: 'uppercase', marginBottom: 12 }}>
          ? Maiores Decl—nios da Temporada
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {topLosers.map(({ player, delta, ovrBefore, ovrAfter }, i) => (
            <div key={player.id} className="_ey_card" style={{
              display: 'flex', alignItems: 'center', gap: 12,
              borderLeft: '2px solid #D45050',
            }}>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, color: 'rgba(212,80,80,.4)', minWidth: 20, textAlign: 'center' }}>#{i+1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,.6)' }}>{player.name}</div>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.25)' }}>{player.age}a — {player.nationality}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {(() => {
                  const gBefore = ovrTier(ovrBefore).grade;
                  const gAfter  = ovrTier(ovrAfter).grade;
                  const changed = gBefore !== gAfter;
                  return (
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,.25)', letterSpacing: 1 }}>
                      {changed
                        ? <><span style={{ color: 'rgba(255,255,255,.3)' }}>{gBefore}</span> <span style={{ color: '#D45050' }}>? {gAfter}</span></>
                        : <span style={{ color: 'rgba(212,80,80,.4)' }}>{gAfter} ?</span>
                      }
                    </div>
                  );
                })()}
                <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 22, fontWeight: 800, color: '#D45050', lineHeight: 1 }}>Decl—nio</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// -- TAB: CAMPE—ES ------------------------------------------------
function TabCampeoes({ summary }) {
  const { champions } = summary;
  const [filter, setFilter] = React.useState('ALL');

  const filterOpts = [
    { id: 'ALL', label: 'Todos' },
    { id: 'GRAND_SLAM', label: 'Grand Slams' },
    { id: 'SLAM_CLASH', label: 'Clash Slams' },
    { id: 'FINALS', label: 'Finals' },
    { id: 'MASTERS_1000', label: 'Masters' },
    { id: 'ATP_500', label: 'ATP 500' },
    { id: 'ATP_250', label: 'ATP 250' },
    { id: 'ATP_100', label: 'ATP 100' },
    { id: 'ATP_75', label: 'ATP 75' },
    { id: 'ATP_50', label: 'ATP 50' },
    { id: 'ATP_25', label: 'ATP 25' },
  ];

  const filtered = filter === 'ALL' ? champions : champions.filter(c => c.tournament.category === filter);

  // Title count per player (filtered)
  const titleCounts = {};
  for (const c of champions) {
    titleCounts[c.champion.name] = (titleCounts[c.champion.name] ?? 0) + 1;
  }

  return (
    <div style={{ padding: '24px 32px 40px' }}>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
        {filterOpts.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: '6px 14px', border: 'none', cursor: 'pointer',
            fontFamily: "'Space Mono',monospace", fontSize: 8, letterSpacing: 2, textTransform: 'uppercase',
            background: filter === f.id ? 'rgba(255,215,0,.15)' : 'rgba(255,255,255,.04)',
            color: filter === f.id ? '#FFD700' : 'rgba(255,255,255,.4)',
            borderBottom: filter === f.id ? '2px solid #FFD700' : '2px solid transparent',
          }}>{f.label}</button>
        ))}
      </div>

      {/* Champions grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {filtered.map((c, i) => {
          const cat = CAT_META[c.tournament.category] ?? { color: '#888', label: '?', icon: '🏆' };
          const surf = SURF_META[c.tournament.surface ?? 'HARD'] ?? { color: '#888' };
          const tc = titleCounts[c.champion.name];
          return (
            <div key={i} className="_ey_card" style={{
              display: 'grid', gridTemplateColumns: '120px 1fr auto',
              gap: 16, alignItems: 'center',
              borderLeft: `3px solid ${surf.color}`,
              animation: `_ey_in .35s ease ${i * .04}s both`,
            }}>
              {/* Tournament */}
              <div>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, letterSpacing: 2, color: surf.color, textTransform: 'uppercase', marginBottom: 3 }}>
                  {surf.label}
                </div>
                <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,.7)', lineHeight: 1.2 }}>
                  {c.tournament.name}
                </div>
                <div style={{ marginTop: 4 }}>
                  <span style={{
                    fontFamily: "'Space Mono',monospace", fontSize: 7, letterSpacing: 2, padding: '2px 6px',
                    background: `${cat.color}18`, border: `1px solid ${cat.color}44`,
                    color: cat.color, textTransform: 'uppercase',
                  }}>{cat.label}</span>
                </div>
              </div>
              {/* Champion */}
              <div>
                <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                  {c.champion.name}
                </div>
                {c.finalist && (
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,.3)', marginTop: 4 }}>
                    def. {c.finalist.name}
                    {c.setsDetail?.length > 0 && <span style={{ color: 'rgba(255,255,255,.2)', marginLeft: 8 }}>{fmtScore(c.setsDetail)}</span>}
                  </div>
                )}
              </div>
              {/* Title count badge */}
              {tc > 1 && (
                <div style={{
                  background: 'rgba(255,215,0,.12)', border: '1px solid rgba(255,215,0,.25)',
                  padding: '6px 12px', textAlign: 'center', flexShrink: 0,
                }}>
                  <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 24, fontWeight: 900, color: '#FFD700', lineHeight: 1 }}>{tc}—</div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, color: 'rgba(255,215,0,.6)', letterSpacing: 1 }}>t—tulos</div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: 'rgba(255,255,255,.25)', padding: '20px 0', textAlign: 'center' }}>
            Nenhum torneio nesta categoria.
          </div>
        )}
      </div>
    </div>
  );
}

// -- TAB: APOSENTADOS ---------------------------------------------
function TabAposentados({ summary }) {
  const { retired, year } = summary;

  // Split tour vs prospects
  const tourRetired = retired.filter(p => p.retirementInfo?.type !== 'PROSPECT_AGED_OUT');
  const prospectsRetired = retired.filter(p => p.retirementInfo?.type === 'PROSPECT_AGED_OUT');

  const RETIRE_TYPES = {
    AGE_DECLINE: { label: 'Decl—nio f—sico', icon: '🏆', color: '#9E9E9E' },
    LOW_PERFORMANCE: { label: 'Baixo desempenho', icon: '🎾', color: '#607D8B' },
    INJURY_FORCED: { label: 'For—ado por lesão', icon: '🎾', color: '#F44336' },
    VOLUNTARY: { label: 'Volunt—ria', icon: '🎾', color: '#78909C' },
    PROSPECT_AGED_OUT: { label: 'Juniors — sem promover', icon: '🎾', color: '#546E7A' },
  };

  return (
    <div style={{ padding: '28px 32px 40px', display: 'flex', flexDirection: 'column', gap: 28 }}>

      {tourRetired.length === 0 && prospectsRetired.length === 0 ? (
        <div style={{
          padding: '60px 0', textAlign: 'center',
          fontFamily: "'Space Mono',monospace", fontSize: 11, color: 'rgba(255,255,255,.2)',
          letterSpacing: 3,
        }}>NENHUMA APOSENTADORIA NESTA TEMPORADA</div>
      ) : null}

      {/* Tour Retirements */}
      {tourRetired.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <div style={{ width: 2, height: 22, background: 'rgba(255,255,255,.3)' }} />
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: 4, color: 'rgba(255,255,255,.45)', textTransform: 'uppercase' }}>
              Tour Principal — {tourRetired.length} aposentadoria{tourRetired.length > 1 ? 's' : ''}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tourRetired.map((p, i) => {
              const info = p.retirementInfo ?? {};
              const rt = RETIRE_TYPES[info.type] ?? { label: 'Aposentadoria', icon: '🎾', color: '#78909C' };
              const isLegend = (info.peakRank ?? info.rankAtRetirement ?? 999) <= 10;
              return (
                <div key={i} className="_ey_card" style={{
                  borderLeft: `3px solid ${isLegend ? 'rgba(255,215,0,.5)' : 'rgba(255,255,255,.15)'}`,
                  animation: `_ey_in .45s ease ${i * .1}s both`,
                  background: isLegend ? 'rgba(255,215,0,.04)' : 'rgba(255,255,255,.032)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{ fontSize: 22, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>{rt.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{
                          fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif",
                          fontSize: 22, fontWeight: 800,
                          color: isLegend ? '#FFD700' : 'rgba(255,255,255,.8)', lineHeight: 1,
                        }}>{p.name}</span>
                        {isLegend && <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: 'rgba(255,215,0,.6)', letterSpacing: 2 }}>LENDA</span>}
                      </div>
                      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.35)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {info.age && <span>{info.age} anos</span>}
                        {info.rankAtRetirement && <span>#{info.rankAtRetirement} no ranking</span>}
                        {p.nationality && <span>{p.nationality}</span>}
                        {p.styleData?.label && <span>{p.styleData.label}</span>}
                      </div>
                      {info.message && (
                        <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 13, color: 'rgba(255,255,255,.35)', lineHeight: 1.5, marginTop: 8 }}>
                          {info.message}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, letterSpacing: 2, color: rt.color, textTransform: 'uppercase', marginBottom: 4 }}>
                        {rt.label}
                      </div>
                      {info.career?.seasons && (
                        <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,.3)' }}>
                          {info.career.seasons} temp.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Juniors aged out */}
      {prospectsRetired.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{ width: 2, height: 16, background: '#546E7A' }} />
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: 4, color: '#546E7A', textTransform: 'uppercase' }}>
              Juniors — Encerramento de carreira jovem ({prospectsRetired.length})
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 4 }}>
            {prospectsRetired.map((p, i) => (
              <div key={i} className="_ey_card" style={{ borderLeft: '2px solid #37474F', opacity: .7 }}>
                <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,.5)' }}>{p.name}</div>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.25)', marginTop: 3 }}>
                  {p.age ?? (p.retirementInfo?.age)} anos — #{p.rankPosition ?? '?'} prospects
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// -- TAB: REVELA——ES (Talent Hunter) -----------------------------
function TabRevelacoes({ summary, allPlayers }) {
  const { newTourEntrants = [], year } = summary;

  // Sub-20 talent scan — jogadores com at— 19 anos no tour principal
  const talents = React.useMemo(() => {
    const pool = allPlayers ?? [];
    return pool
      .filter(p => {
        const age = p.age ?? 99;
        return age <= 19;
      })
      .sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999))
      .slice(0, 20);
  }, [allPlayers]);

  const getGrade = (p) => {
    const pot = p.potential ?? 'REGULAR';
    if (['LENDA', 'ELITE'].includes(pot)) return { label: 'ELITE', color: '#C9A84C' };
    if (pot === 'CAMPEAO') return { label: 'CAMPE—O', color: '#52C46A' };
    return { label: 'PROMESSA', color: '#4A8EC2' };
  };

  return (
    <div style={{ padding: '28px 32px 40px', display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* Talent Hunter Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 2, height: 32, background: '#C9A84C' }} />
        <div>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: 4, color: '#C9A84C', textTransform: 'uppercase' }}>
            Talent Hunter — ATP-100
          </div>
          <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 22, fontWeight: 900, color: '#fff', marginTop: 3 }}>
            Jovens Sub-20 no Circuito
          </div>
          <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 12, color: 'rgba(255,255,255,.3)', marginTop: 2 }}>
            Jogadores com at— 19 anos ativos no tour profissional em {year}
          </div>
        </div>
      </div>

      {/* Talent list */}
      {talents.length === 0 ? (
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: 'rgba(255,255,255,.2)', padding: '28px 0', letterSpacing: 2 }}>
          NENHUM JOGADOR SUB-20 NO CIRCUITO NESTA TEMPORADA.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {talents.map((p, i) => {
            const grade = getGrade(p);
            const ovr = p._ovrSnapshot ?? 0;
            const isNew = newTourEntrants.some(n => n.id === p.id);
            return (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: 'rgba(255,255,255,.03)',
                border: `1px solid ${isNew ? grade.color + '44' : 'rgba(255,255,255,.06)'}`,
                borderLeft: `3px solid ${grade.color}`,
                padding: '10px 16px',
                borderRadius: 2,
              }}>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: 'rgba(255,255,255,.22)', minWidth: 28, textAlign: 'center' }}>
                  #{p.rankPosition ?? '—'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 19, fontWeight: 800, color: '#fff' }}>
                      {p.name}
                    </div>
                    {isNew && (
                      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, color: grade.color, letterSpacing: 2, border: `1px solid ${grade.color}44`, padding: '1px 6px' }}>
                        ESTREANTE
                      </span>
                    )}
                    <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, color: grade.color, letterSpacing: 2, border: `1px solid ${grade.color}33`, padding: '1px 6px' }}>
                      {grade.label}
                    </span>
                  </div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.3)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <span>{p.nationality}</span>
                    <span>{p.age} anos</span>
                    <span>{p.styleId}</span>
                    {p.naturalSignature && <span>? {p.naturalSignature.replace(/_/g,' ')}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, color: 'rgba(255,255,255,.25)', marginBottom: 2 }}>N—VEL</div>
                  <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 30, fontWeight: 900, color: grade.color, lineHeight: 1 }}>{grade?.grade ?? ovrTier(ovr).grade}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New entrants this season */}
      {newTourEntrants.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{ width: 2, height: 20, background: '#52C46A' }} />
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: 3, color: '#52C46A', textTransform: 'uppercase' }}>
              Novos Profissionais {year} — {newTourEntrants.length} jogadores
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 4 }}>
            {newTourEntrants.map((p, i) => (
              <div key={p.id} style={{
                padding: '8px 12px', border: '1px solid rgba(82,196,106,.18)',
                borderLeft: '2px solid #52C46A', background: 'rgba(82,196,106,.04)',
              }}>
                <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 16, fontWeight: 800, color: '#fff' }}>{p.name}</div>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 7.5, color: 'rgba(255,255,255,.3)', marginTop: 3 }}>
                  {p.nationality} — {p.age} anos — {p.styleId}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// -- TAB: LES—ES --------------------------------------------------
function TabLesoes({ summary }) {
  const { injuries } = summary;
  const INJURY_GRADE = {
    1: { color: '#FFC107', label: 'Leve',    bg: 'rgba(255,193,7,.08)' },
    2: { color: '#FF9800', label: 'Moderada', bg: 'rgba(255,152,0,.08)' },
    3: { color: '#F44336', label: 'Grave',   bg: 'rgba(244,67,54,.08)' },
  };

  const deduped = Object.values(
    injuries.reduce((acc, e) => {
      const id = e.playerId ?? e.playerName ?? e.text;
      const prev = acc[id];
      const grade = e.injury?.grade ?? 1;
      if (!prev || grade > (prev.injury?.grade ?? 1)) acc[id] = e;
      return acc;
    }, {})
  ).sort((a,b) => (b.injury?.grade ?? 1) - (a.injury?.grade ?? 1));

  return (
    <div style={{ padding: '28px 32px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: 4, color: '#FFC107', textTransform: 'uppercase' }}>
          ?? Relat—rio M—dico — {deduped.length} les—es registradas
        </div>
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          {[1,2,3].map(g => {
            const meta = INJURY_GRADE[g];
            const cnt = deduped.filter(e => (e.injury?.grade ?? 1) === g).length;
            return cnt > 0 ? (
              <span key={g} style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, padding: '3px 10px', letterSpacing: 1, border: `1px solid ${meta.color}44`, color: meta.color }}>
                G{g}: {cnt}
              </span>
            ) : null;
          })}
        </div>
      </div>

      {deduped.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', fontFamily: "'Space Mono',monospace", fontSize: 11, color: 'rgba(255,255,255,.2)', letterSpacing: 3 }}>
          TEMPORADA SEM LES—ES REGISTRADAS
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {deduped.map((e, i) => {
            const grade = e.injury?.grade ?? 1;
            const meta = INJURY_GRADE[grade] ?? INJURY_GRADE[1];
            return (
              <div key={i} className="_ey_card" style={{
                display: 'flex', alignItems: 'center', gap: 12,
                borderLeft: `3px solid ${meta.color}`,
                background: meta.bg,
                animation: `_ey_in .35s ease ${i * .05}s both`,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 700, color: '#fff' }}>
                    {e.playerName ?? '—'}
                  </div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.35)', marginTop: 3 }}>
                    {e.injury?.type ?? 'Tipo desconhecido'}
                  </div>
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 22, fontWeight: 900, color: meta.color, lineHeight: 1 }}>G{grade}</div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, letterSpacing: 1, color: meta.color, opacity: .7, marginTop: 2 }}>{meta.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// -- TAB: RATINGS -------------------------------------------------
function TabRatings({ allPlayers }) {
  const [filter, setFilter] = React.useState('all'); // 'all' | 'up' | 'down' | 'same'

  const rows = React.useMemo(() => {
    return [...(allPlayers ?? [])]
      .map(p => {
        const hist = p._seasonHistory;
        const last = Array.isArray(hist) ? hist[hist.length - 1] : null;
        const delta    = last ? (last.ovrDelta ?? 0) : 0;
        const ovrAfter = last ? (last.ovr ?? p.ovr ?? 0) : (p.ovr ?? 0);
        return { id: p.id, name: p.name, rank: p.rankPosition ?? 999, delta, ovrAfter };
      })
      .filter(r => {
        if (filter === 'up')   return r.delta > 0;
        if (filter === 'down') return r.delta < 0;
        if (filter === 'same') return r.delta === 0;
        return true;
      })
      .sort((a, b) => a.rank - b.rank);
  }, [allPlayers, filter]);

  const FILTERS = [
    { id: 'all',  label: 'Todos',     icon: '🏆' },
    { id: 'up',   label: 'Subiram',   icon: '🏆' },
    { id: 'down', label: 'Ca—ram',    icon: '🏆' },
    { id: 'same', label: 'Est—vel',   icon: '—' },
  ];

  return (
    <div style={{ padding: '28px 32px 40px' }}>
      {/* Header + filtros */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: 4, color: '#FFD700', textTransform: 'uppercase' }}>
          ?? Varia——o de Rating — {(allPlayers ?? []).length} jogadores
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              background: filter === f.id ? 'rgba(255,215,0,.18)' : 'rgba(255,255,255,.04)',
              border: `1px solid ${filter === f.id ? 'rgba(255,215,0,.5)' : 'rgba(255,255,255,.1)'}`,
              color: filter === f.id ? '#FFD700' : 'rgba(255,255,255,.4)',
              fontFamily: "'Space Mono',monospace", fontSize: 8, letterSpacing: 2,
              padding: '5px 14px', cursor: 'pointer', transition: 'all .15s',
              textTransform: 'uppercase',
            }}>
              {f.icon} {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Cabe—alho */}
        <div style={{
          display: 'grid', gridTemplateColumns: '52px 1fr 70px 80px',
          padding: '6px 14px',
          fontFamily: "'Space Mono',monospace", fontSize: 7, letterSpacing: 3,
          color: 'rgba(255,255,255,.25)', textTransform: 'uppercase',
          borderBottom: '1px solid rgba(255,255,255,.06)',
          marginBottom: 4,
        }}>
          <span>RANK</span>
          <span>JOGADOR</span>
          <span style={{ textAlign: 'right' }}>RATING</span>
          <span style={{ textAlign: 'right' }}>VARIA——O</span>
        </div>

        {rows.length === 0 && (
          <div style={{ padding: '60px 0', textAlign: 'center', fontFamily: "'Space Mono',monospace", fontSize: 11, color: 'rgba(255,255,255,.2)', letterSpacing: 3 }}>
            NENHUM JOGADOR NESTE FILTRO
          </div>
        )}

        {rows.map((r, i) => {
          const isUp   = r.delta > 0;
          const isDown = r.delta < 0;
          const deltaColor = isUp ? '#4CAF50' : isDown ? '#F44336' : 'rgba(255,255,255,.25)';
          const deltaBg    = isUp ? 'rgba(76,175,80,.07)' : isDown ? 'rgba(244,67,54,.07)' : 'transparent';
          const deltaStr   = isUp ? `+${r.delta}` : isDown ? `${r.delta}` : '—';
          const icon       = isUp ? '?' : isDown ? '?' : '—';

          return (
            <div key={r.id} style={{
              display: 'grid', gridTemplateColumns: '52px 1fr 70px 80px',
              alignItems: 'center',
              padding: '9px 14px',
              background: i % 2 === 0 ? 'rgba(255,255,255,.02)' : 'transparent',
              borderLeft: `2px solid ${isUp ? '#4CAF5055' : isDown ? '#F4433655' : 'transparent'}`,
              transition: 'background .15s',
              animation: `_ey_in .25s ease ${Math.min(i, 30) * .018}s both`,
            }}>
              {/* Rank */}
              <div style={{
                fontFamily: "'Space Mono',monospace", fontSize: 11, fontWeight: 700,
                color: r.rank <= 10 ? '#FFD700' : r.rank <= 30 ? 'rgba(255,215,0,.55)' : 'rgba(255,255,255,.3)',
              }}>
                #{r.rank}
              </div>

              {/* Nome */}
              <div style={{
                fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif",
                fontSize: 17, fontWeight: r.rank <= 20 ? 700 : 500,
                color: r.rank <= 10 ? '#fff' : 'rgba(255,255,255,.75)',
                letterSpacing: .3,
              }}>
                {r.name}
              </div>

              {/* N—vel atual */}
              <div style={{
                textAlign: 'right',
                fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 600,
                color: ovrTier(r.ovrAfter).color, opacity: .7,
              }}>
                {ovrTier(r.ovrAfter).grade}
              </div>

              {/* Delta de nível */}
              {(() => {
                const gBefore = ovrTier(r.ovrAfter - r.delta).grade;
                const gAfter  = ovrTier(r.ovrAfter).grade;
                const changed = gBefore !== gAfter;
                return (
                  <div style={{
                    textAlign: 'right',
                    fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif",
                    fontSize: 16, fontWeight: 800,
                    color: deltaColor,
                    background: deltaBg,
                    padding: '2px 10px',
                    letterSpacing: .5,
                  }}>
                    <span style={{ fontSize: 10, marginRight: 4, verticalAlign: 'middle' }}>{icon}</span>
                    {changed ? `${gBefore}?${gAfter}` : deltaStr}
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -- TAB: NOVIDADES DO CIRCUITO ----------------------------------
function TabNovidades({ summary }) {
  const { juniorPromotionSpotlight = [], retired = [], year, traitProgressions = [] } = summary;

  const PLAY_STYLES_LABEL = {
    AGGRESSIVE_BASELINER: 'Baseliner Agressivo',
    ALL_COURT: 'All Court',
    BIG_SERVER: 'Servidor',
    COUNTER_PUNCHER: 'Defensor',
    NET_RUSHER: 'Chega — Rede',
    SERVE_VOLLEY: 'Serve & Volley',
  };

  const sorted = [...juniorPromotionSpotlight]
    .sort((a, b) => (a?.juniorSeason?.juniorRank ?? 999) - (b?.juniorSeason?.juniorRank ?? 999))
    .slice(0, 3);

  const tourRetiredCount = retired.filter(p => p.retirementInfo?.type !== 'PROSPECT_AGED_OUT').length;

  return (
    <div style={{ padding: '28px 32px 40px' }}>

      {/* Header resumo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 28, padding: '16px 20px', background: 'rgba(76,175,80,.06)', border: '1px solid rgba(76,175,80,.2)', borderLeft: '3px solid rgba(76,175,80,.6)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 40, fontWeight: 900, color: '#4CAF50', lineHeight: 1 }}>{sorted.length}</div>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, letterSpacing: 3, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', marginTop: 3 }}>Promovidos do Junior</div>
        </div>
        <div style={{ width: 1, height: 48, background: 'rgba(255,255,255,.1)' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 40, fontWeight: 900, color: 'rgba(255,255,255,.4)', lineHeight: 1 }}>{tourRetiredCount}</div>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, letterSpacing: 3, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', marginTop: 3 }}>Vagas Abertas</div>
        </div>
        <div style={{ flex: 1, fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 14, color: 'rgba(255,255,255,.3)', lineHeight: 1.5 }}>
          Os holofotes agora ficam nos 3 melhores juniores do ano, nomes que garantiram a subida para {year + 1} e chegam ao Tour Principal para ocupar as vagas abertas pela transicao da temporada {year}.
        </div>
      </div>

      {traitProgressions.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: 4, color: 'rgba(0,212,255,.7)', textTransform: 'uppercase', marginBottom: 14 }}>
            Mudanças de identidade competitiva
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0, 1fr))', gap:12 }}>
            {traitProgressions.slice(0, 3).map((item, i) => (
              <div key={`${item.playerId}-${i}`} className="_ey_card" style={{ borderLeft:'3px solid #00D4FF', background:'linear-gradient(180deg, rgba(0,212,255,.09), rgba(255,255,255,.02))' }}>
                <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 26, fontWeight: 800, color: '#fff', lineHeight: .95 }}>
                  {item.playerName}
                </div>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.35)', marginTop: 6, letterSpacing: 2 }}>
                  TEMPORADA {year}
                </div>
                {item.gained?.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, letterSpacing: 2.5, color: '#00D4FF', textTransform: 'uppercase', marginBottom: 6 }}>
                      novos traços
                    </div>
                    <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 18, color: '#D6F7FF', lineHeight: 1.15 }}>
                      {item.gained.join(' · ')}
                    </div>
                  </div>
                )}
                {item.healed?.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, letterSpacing: 2.5, color: '#7CFFB2', textTransform: 'uppercase', marginBottom: 6 }}>
                      sombras vencidas
                    </div>
                    <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 18, color: '#ECFFF2', lineHeight: 1.15 }}>
                      {item.healed.join(' · ')}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', fontFamily: "'Space Mono',monospace", fontSize: 11, color: 'rgba(255,255,255,.2)', letterSpacing: 3 }}>
          NENHUMA PROMOCAO JUNIOR REGISTRADA
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
          {sorted.map((p, i) => {
            const ovr = overallRating(p.attrs ?? {});
            const age = p.age ?? (p.birthYear ? year + 1 - p.birthYear : null);
            const styleLabel = PLAY_STYLES_LABEL[p.styleId] ?? (p.styleId ?? '—');
            const strengths = topStrengths(p.attrs ?? {}, 3).map(s => s.label);
            const weakness = topWeaknesses(p.attrs ?? {}, 1)[0]?.label ?? 'Jogo em desenvolvimento';
            const season = p.juniorSeason ?? {};
            const seasonLine = [
              season.titles ? `${season.titles} titulo${season.titles > 1 ? 's' : ''}` : null,
              season.finals ? `${season.finals} final${season.finals > 1 ? 's' : ''}` : null,
              (season.wins || season.losses) ? `${season.wins ?? 0}V-${season.losses ?? 0}D` : null,
            ].filter(Boolean).join('  |  ');
            const proceduralText = (() => {
              const parts = [];
              if (season.juniorRank) parts.push(`Fechou o circuito junior em #${season.juniorRank}`);
              if (season.titles) parts.push(`levantando ${season.titles} titulo${season.titles > 1 ? 's' : ''}`);
              if (season.juniorFinalsTitle) parts.push('e ainda saiu campeao do Junior Finals');
              else if (season.bestFinish && season.bestFinish !== 'sem campanha registrada') parts.push(`com pico de ${season.bestFinish}`);
              const core = parts.join(' ');
              const close = season.wins || season.losses
                ? `A campanha terminou em ${season.wins ?? 0} vitorias e ${season.losses ?? 0} derrotas, credenciais suficientes para chegar ao profissional com moral.`
                : 'A leitura interna do circuito trata a subida como merecida e no tempo certo.'
              return `${core}. ${close}`.replace(/\.\s*\./g, '.').trim();
            })();

            return (
              <div key={p.id ?? i} className="_ey_card" style={{
                display: 'flex', flexDirection: 'column', gap: 14, padding: '18px 18px 20px',
                borderLeft: `3px solid ${i === 0 ? '#4CAF50' : i === 1 ? '#8BC34A' : 'rgba(76,175,80,.45)'}`,
                background: 'linear-gradient(180deg, rgba(76,175,80,.08), rgba(255,255,255,.02))',
                animation: `_ey_in .35s ease ${i * .04}s both`,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, letterSpacing: 3, color: '#4CAF50', textTransform: 'uppercase' }}>
                      Promocao Junior #{season.juniorRank ?? (i + 1)}
                    </div>
                    <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 30, fontWeight: 800, color: '#fff', lineHeight: .95, marginTop: 8 }}>
                      {p.name}
                    </div>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.32)', marginTop: 6, letterSpacing: 1.5 }}>
                      {p.nationality ?? '—'}  |  {age ?? '—'} anos  |  {styleLabel}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 34, fontWeight: 900, color: ovrTier(ovr).color, lineHeight: 1 }}>
                      {ovrTier(ovr).grade}
                    </div>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.26)', letterSpacing: 2 }}>
                      NIVEL INICIAL
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, letterSpacing: 2.5, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', marginBottom: 8 }}>
                      Qualidades Principais
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {strengths.map((item) => (
                        <span key={item} className="_ey_pill" style={{ color: '#D7F5DF', borderColor: 'rgba(76,175,80,.25)', background: 'rgba(76,175,80,.08)' }}>
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
                      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, letterSpacing: 2, color: 'rgba(255,255,255,.28)', textTransform: 'uppercase', marginBottom: 6 }}>
                        Ajuste Necessario
                      </div>
                      <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 18, color: '#FF9B8A', lineHeight: 1.15 }}>
                        {weakness}
                      </div>
                    </div>
                    <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
                      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, letterSpacing: 2, color: 'rgba(255,255,255,.28)', textTransform: 'uppercase', marginBottom: 6 }}>
                        Resume do Ano
                      </div>
                      <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 18, color: '#fff', lineHeight: 1.15 }}>
                        {seasonLine || 'Campanha monitorada internamente'}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 15, color: 'rgba(255,255,255,.5)', lineHeight: 1.55 }}>
                    {proceduralText}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// -- MAIN CEREMONY ------------------------------------------------
function TabGala({ summary, allPlayers, onDismiss }) {
  const { year, awards, retired = [], newTourEntrants = [], champions = [], topGainers = [] } = summary;
  const nextYear = year + 1;
  const [revealStep, setRevealStep] = React.useState(1);

  React.useEffect(() => {
    setRevealStep(1);
    let step = 1;
    const timer = setInterval(() => {
      step += 1;
      setRevealStep(step);
      if (step >= 5) clearInterval(timer);
    }, 850);
    return () => clearInterval(timer);
  }, [year]);

  const styleLabel = React.useCallback((player) => {
    if (!player) return 'Jogador';
    return player.styleData?.label
      ?? PLAY_STYLES[player.styleId]?.label
      ?? String(player.styleId ?? 'Jogador').replace(/_/g, ' ');
  }, []);

  const playerOvr = React.useCallback((player) => {
    if (!player) return 0;
    if (typeof player._ovrSnapshot === 'number') return player._ovrSnapshot;
    return overallRating(player.attrs ?? {});
  }, []);

  const getStrengths = React.useCallback((player, n = 3) => {
    if (!player?.attrs) return [];
    return topStrengths(player.attrs, n).map(s => s.label);
  }, []);

  const proAwards = React.useMemo(() => {
    const list = [];
    if (awards?.noOne) list.push({ kicker: 'Jogador do Ano', color: '#FFD700', icon: 'T', player: awards.noOne, detail: `N— 1 do mundo e refer—ncia máxima da temporada ${year}.` });
    if (awards?.gsKingPlayer) list.push({ kicker: awards.gsKingCount >= 3 ? 'Dominador dos Slams' : 'Rei dos Slams', color: '#F6C453', icon: 'GS', player: awards.gsKingPlayer, detail: `${awards.gsKingCount} Grand Slam${awards.gsKingCount > 1 ? 's' : ''} conquistado${awards.gsKingCount > 1 ? 's' : ''} no ano.` });
    if (awards?.mostImproved) list.push({ kicker: 'Mais Evolu—do', color: '#52C46A', icon: 'UP', player: awards.mostImproved, detail: 'Maior salto t—cnico e competitivo da temporada.' });
    return list.slice(0, 3);
  }, [awards, year]);

  const u22Pool = React.useMemo(() => [...(allPlayers ?? [])].filter(p => (p?.age ?? 99) <= 22).sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999)), [allPlayers]);

  const u22Awards = React.useMemo(() => {
    const bestU22 = u22Pool[0] ?? null;
    const risingU22 = topGainers.find(({ player }) => (player?.age ?? 99) <= 22)?.player ?? null;
    const entrantU22 = [...newTourEntrants].filter(p => (p?.age ?? 99) <= 22).sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999))[0] ?? null;
    return [
      bestU22 ? { kicker: 'L—der Sub-22', color: '#6FD3FF', icon: 'U22', player: bestU22, detail: `Melhor posicionado entre os jovens no come—o de ${nextYear}.` } : null,
      risingU22 ? { kicker: 'Ascens—o Jovem', color: '#8BE28B', icon: 'RISE', player: risingU22, detail: 'Evolu——o de nível que mudou o teto de expectativa.' } : null,
      entrantU22 ? { kicker: 'Estreante para Vigiar', color: '#FF9F68', icon: 'NEW', player: entrantU22, detail: 'Novo nome que j— entrou pedindo aten——o do circuito.' } : null,
    ].filter(Boolean);
  }, [u22Pool, topGainers, newTourEntrants, nextYear]);

  const retirementSpotlight = React.useMemo(() => [...retired]
    .filter(p => p?.retirementInfo?.type !== 'PROSPECT_AGED_OUT')
    .sort((a, b) => {
      const aPeak = a?.retirementInfo?.peakRank ?? a?.retirementInfo?.rankAtRetirement ?? 999;
      const bPeak = b?.retirementInfo?.peakRank ?? b?.retirementInfo?.rankAtRetirement ?? 999;
      if (aPeak !== bPeak) return aPeak - bPeak;
      const aGs = a?._careerGrandSlams ?? a?.careerTitles?.gs ?? 0;
      const bGs = b?._careerGrandSlams ?? b?.careerTitles?.gs ?? 0;
      return bGs - aGs;
    }).slice(0, 2), [retired]);

  const watchList = React.useMemo(() => [...newTourEntrants].sort((a, b) => {
    const potA = typeof a.potential === 'number' ? a.potential : playerOvr(a);
    const potB = typeof b.potential === 'number' ? b.potential : playerOvr(b);
    return potB - potA;
  }).slice(0, 4), [newTourEntrants, playerOvr]);

  const headlineChampions = React.useMemo(() => {
      const catOrder = { GRAND_SLAM: 0, SLAM_CLASH: 1, FINALS: 2, MASTERS_1000: 3, ATP_500: 4, ATP_250: 5, ATP_100: 6, ATP_75: 7, ATP_50: 8, ATP_25: 9 };
    return [...champions].sort((a, b) => (catOrder[a.tournament.category] ?? 9) - (catOrder[b.tournament.category] ?? 9)).slice(0, 5);
  }, [champions]);

  const revealStyle = (step) => ({
    opacity: revealStep >= step ? 1 : 0,
    transform: revealStep >= step ? 'translateY(0)' : 'translateY(26px)',
    transition: 'opacity .55s ease, transform .55s ease',
  });

  return (
    <div style={{ padding: '26px 28px 40px', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ position: 'relative', overflow: 'hidden', padding: '28px 30px 30px', border: '1px solid rgba(255,215,0,.16)', background: 'radial-gradient(circle at top left, rgba(255,215,0,.14), transparent 34%), linear-gradient(135deg, rgba(10,14,24,.94), rgba(5,8,13,.98))', boxShadow: '0 18px 60px rgba(0,0,0,.35)' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.03), transparent)', transform: 'translateX(-100%)', animation: '_ey_scan 5.5s linear infinite' }} />
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, letterSpacing: 5, color: 'rgba(255,215,0,.55)', textTransform: 'uppercase', marginBottom: 8 }}>The Season Awards</div>
            <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 'clamp(42px,7vw,78px)', fontWeight: 900, lineHeight: .9, color: '#F5E7AE', textShadow: '0 0 35px rgba(255,215,0,.18)' }}>NIGHT OF {year}</div>
            <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 18, color: 'rgba(255,255,255,.55)', marginTop: 10, maxWidth: 760, lineHeight: 1.45 }}>Uma noite para coroar os gigantes do circuito, homenagear os que saem de cena e apresentar os nomes que v—o incendiar a temporada {nextYear}.</div>
          </div>
          <button onClick={onDismiss} style={{ alignSelf: 'center', background: 'linear-gradient(135deg, rgba(255,215,0,.2), rgba(255,215,0,.08))', border: '1px solid rgba(255,215,0,.35)', color: '#FFD700', cursor: 'pointer', fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', padding: '12px 24px' }}>Abrir {nextYear}</button>
        </div>
      </div>

      <div style={{ ...revealStyle(1), display: 'grid', gridTemplateColumns: '1.3fr .9fr', gap: 10 }}>
        <div className="_ey_award_card" style={{ borderLeft: '4px solid #FFD700', minHeight: 220 }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, letterSpacing: 4, color: '#FFD700', textTransform: 'uppercase', marginBottom: 8 }}>Trof—u Supremo</div>
          <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 16, color: 'rgba(255,255,255,.45)', textTransform: 'uppercase', letterSpacing: 2 }}>Jogador do Ano</div>
          <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 'clamp(40px,5vw,62px)', fontWeight: 900, color: '#fff', lineHeight: .92, marginTop: 8 }}>{awards?.noOne?.name ?? 'Sem vencedor'}</div>
          {awards?.noOne && <>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
              <span className="_ey_pill">{awards.noOne.nationality}</span>
              <span className="_ey_pill">{styleLabel(awards.noOne)}</span>
              <span className="_ey_pill">#{awards.noOne.rankPosition ?? 1}</span>
            </div>
            <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 16, color: 'rgba(255,255,255,.5)', marginTop: 16, lineHeight: 1.45, maxWidth: 760 }}>{awards.gsKingPlayer?.id === awards.noOne.id ? `${awards.noOne.name} dominou os grandes palcos e ainda fechou o ano na lideran—a do mundo.` : `${awards.noOne.name} terminou a corrida anual como refer—ncia absoluta do circuito profissional.`}</div>
          </>}
        </div>
        <div className="_ey_card" style={{ borderLeft: '3px solid rgba(255,255,255,.18)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, letterSpacing: 3, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', marginBottom: 10 }}>Headlines da Noite</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div><div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 28, fontWeight: 900, color: '#52C46A', lineHeight: 1 }}>{newTourEntrants.length}</div><div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.3)', letterSpacing: 2 }}>NOVOS PROFISSIONAIS</div></div>
              <div><div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 28, fontWeight: 900, color: '#D4A86A', lineHeight: 1 }}>{retired.filter(p => p?.retirementInfo?.type !== 'PROSPECT_AGED_OUT').length}</div><div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.3)', letterSpacing: 2 }}>GRANDES SA—DAS</div></div>
              <div><div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 28, fontWeight: 900, color: '#6FD3FF', lineHeight: 1 }}>{u22Pool.length}</div><div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.3)', letterSpacing: 2 }}>SUB-22 NO TOUR</div></div>
            </div>
          </div>
          <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 14, lineHeight: 1.5, color: 'rgba(255,255,255,.42)' }}>O circuito chega em {nextYear} com mudan—a de guarda, novos rostos e mais pressão no topo.</div>
        </div>
      </div>

      <div style={{ ...revealStyle(2), display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="_ey_card" style={{ borderLeft: '3px solid #FFD700' }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, letterSpacing: 4, color: '#FFD700', textTransform: 'uppercase', marginBottom: 14 }}>Premia——es Profissionais</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {proAwards.map((award) => <div key={award.kicker} style={{ padding: '14px 14px 16px', background: 'rgba(255,255,255,.03)', border: `1px solid ${award.color}22`, minHeight: 172 }}><div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, letterSpacing: 2, color: award.color, textTransform: 'uppercase', marginBottom: 10 }}>{award.icon} {award.kicker}</div><div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 24, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{award.player.name}</div><div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.32)', marginTop: 4 }}>{award.player.nationality} — {styleLabel(award.player)}</div><div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 13, color: 'rgba(255,255,255,.44)', marginTop: 10, lineHeight: 1.45 }}>{award.detail}</div></div>)}
          </div>
        </div>
        <div className="_ey_card" style={{ borderLeft: '3px solid #6FD3FF' }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, letterSpacing: 4, color: '#6FD3FF', textTransform: 'uppercase', marginBottom: 14 }}>Gala Sub-22</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {u22Awards.map((award) => <div key={award.kicker} style={{ padding: '14px 14px 16px', background: 'rgba(255,255,255,.03)', border: `1px solid ${award.color}22`, minHeight: 172 }}><div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, letterSpacing: 2, color: award.color, textTransform: 'uppercase', marginBottom: 10 }}>{award.icon} {award.kicker}</div><div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 24, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{award.player.name}</div><div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.32)', marginTop: 4 }}>{award.player.age} anos — #{award.player.rankPosition ?? '?'}</div><div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 13, color: 'rgba(255,255,255,.44)', marginTop: 10, lineHeight: 1.45 }}>{award.detail}</div></div>)}
          </div>
        </div>
      </div>

      <div style={{ ...revealStyle(3), display: 'grid', gridTemplateColumns: '1.05fr .95fr', gap: 10 }}>
        <div className="_ey_card" style={{ borderLeft: '3px solid rgba(255,255,255,.22)' }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, letterSpacing: 4, color: 'rgba(255,255,255,.45)', textTransform: 'uppercase', marginBottom: 14 }}>Legado e Despedidas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {retirementSpotlight.map((player) => {
              const info = player.retirementInfo ?? {};
              const gs = player._careerGrandSlams ?? player.careerTitles?.gs ?? 0;
              const peak = info.peakRank ?? info.rankAtRetirement ?? player.rankPosition ?? '?';
              const photo = getPlayerPhoto(player);
              return <div key={player.id} style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 16, alignItems: 'stretch', padding: 10, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)' }}><div style={{ minHeight: 120, position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, rgba(255,255,255,.08), rgba(255,255,255,.02))', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start', padding: 10 }}>{photo && <img src={photo} alt={player.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center center', background: 'rgba(3,6,8,.45)' }} />}{photo && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(3,6,8,.08), rgba(3,6,8,.58))' }} />}<div style={{ position: 'relative', zIndex: 1, fontFamily: "'Space Mono',monospace", fontSize: 8, color: '#FFD700', letterSpacing: 2, background: 'rgba(0,0,0,.45)', padding: '3px 6px' }}>PICO #{peak}</div></div><div><div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{player.name}</div><div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.35)', letterSpacing: 2, marginTop: 4 }}>{player.nationality} — {styleLabel(player)} — {info.age ?? player.age ?? '?'} anos</div><div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 12 }}><div><div style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, color: 'rgba(255,255,255,.25)' }}>GRAND SLAMS</div><div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 22, color: '#F0D07F' }}>{gs}</div></div><div><div style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, color: 'rgba(255,255,255,.25)' }}>TEMPORADAS</div><div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 22, color: '#fff' }}>{info.career?.seasons ?? '—'}</div></div><div><div style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, color: 'rgba(255,255,255,.25)' }}>SA—DA</div><div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 18, color: 'rgba(255,255,255,.7)' }}>{info.type ?? 'Aposentadoria'}</div></div></div>{info.message && <div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 14, color: 'rgba(255,255,255,.42)', lineHeight: 1.5, marginTop: 10 }}>{info.message}</div>}</div></div>;
            })}
          </div>
        </div>
        <div className="_ey_card" style={{ borderLeft: '3px solid #A57BFF' }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, letterSpacing: 4, color: '#A57BFF', textTransform: 'uppercase', marginBottom: 14 }}>Palco dos Campe—es</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {headlineChampions.map((entry, idx) => {
              const cat = CAT_META[entry.tournament.category] ?? { color: '#888', icon: '—', label: entry.tournament.category, short: entry.tournament.category };
              return <div key={`${entry.tournament.id}-${idx}`} style={{ display: 'grid', gridTemplateColumns: '70px 1fr auto', gap: 12, alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,.028)', border: '1px solid rgba(255,255,255,.05)' }}><div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: cat.color, letterSpacing: 2, textTransform: 'uppercase' }}>{cat.short}</div><div><div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 800, color: '#fff' }}>{entry.champion.name}</div><div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.28)' }}>{entry.tournament.name}</div></div><div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 16, color: cat.color }}>{cat.icon}</div></div>;
            })}
          </div>
        </div>
      </div>

      <div style={{ ...revealStyle(4) }} className="_ey_card">
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, letterSpacing: 4, color: '#52C46A', textTransform: 'uppercase', marginBottom: 16 }}>Jogadores para Ficar de Olho em {nextYear}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {watchList.map((player) => {
            const photo = getPlayerPhoto(player);
            const strengths = getStrengths(player, 3);
            const ovr = playerOvr(player);
            const grade = ovrTier(ovr);
            const identity = buildPlayerIdentity(player, { surfaceKey: player?.surfaceIdentity?.surface ?? null });
            const latestInterview = player?.latestInterview ?? null;
            return <div key={player.id} style={{ background: 'rgba(255,255,255,.022)', border: '1px solid rgba(255,255,255,.06)', overflow: 'hidden' }}><div style={{ height: 188, position: 'relative', background: 'linear-gradient(135deg, rgba(111,211,255,.14), rgba(255,255,255,.02))' }}>{photo && <img src={photo} alt={player.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center center', background: 'rgba(2,4,10,.5)' }} />}{photo && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(2,4,10,.08), rgba(2,4,10,.72))' }} />}<div style={{ position: 'absolute', top: 10, left: 10, fontFamily: "'Space Mono',monospace", fontSize: 7, color: '#fff', letterSpacing: 2, background: 'rgba(0,0,0,.45)', padding: '3px 6px' }}>#{player.rankPosition ?? 'NEW'}</div><div style={{ position: 'absolute', right: 10, bottom: 10, fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 34, fontWeight: 900, color: grade.color, textShadow: '0 0 20px rgba(0,0,0,.35)' }}>{grade.grade}</div></div><div style={{ padding: '12px 12px 14px' }}><div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 24, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{player.name}</div><div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.32)', letterSpacing: 1.5, marginTop: 4 }}>{player.nationality} — {player.age} anos — {styleLabel(player)}</div><div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 15, color: '#fff', lineHeight: 1.05, textTransform: 'uppercase', marginTop: 10 }}>{identity.signature.headline}</div><div style={{ fontFamily: "'Barlow','Barlow',sans-serif", fontSize: 12, color: 'rgba(255,255,255,.58)', lineHeight: 1.55, marginTop: 7 }}>{identity.signature.subline}</div><div style={{ marginTop: 10, padding: '10px 10px 9px', border: '1px solid rgba(111,211,255,.14)', background: 'rgba(111,211,255,.06)' }}><div style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, color: '#7FDBB6', letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 4 }}>Arco de {nextYear}</div><div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 15, color: '#fff', textTransform: 'uppercase', lineHeight: 1.1 }}>{identity.seasonArc?.label ?? 'Temporada em aberto'}</div><div style={{ fontFamily: "'Barlow','Barlow',sans-serif", fontSize: 12, color: 'rgba(255,255,255,.54)', lineHeight: 1.5, marginTop: 6 }}>{identity.seasonArc?.summary ?? identity.reputation.consensus ?? potentialNarrative(player)}</div></div><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>{[identity.signature.moodTag, identity.signature.formTag, identity.signature.reputationTag, identity.signature.contradictionTag].filter(Boolean).map((tag) => <span key={tag} className="_ey_pill" style={{ color: '#CBE7FF', borderColor: 'rgba(111,211,255,.22)' }}>{tag}</span>)}</div><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>{strengths.map((s) => <span key={s} className="_ey_pill" style={{ color: '#CBE7FF', borderColor: 'rgba(111,211,255,.22)' }}>{s}</span>)}</div><div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 13, color: 'rgba(255,255,255,.46)', lineHeight: 1.45, marginTop: 10 }}>{scoutSummary(player)}</div>{latestInterview?.quote && <div style={{ fontFamily: "'Barlow','Barlow',sans-serif", fontSize: 12, color: 'rgba(255,255,255,.72)', lineHeight: 1.55, marginTop: 10, fontStyle: 'italic' }}>{latestInterview.quote}</div>}<div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: '#7FDBB6', letterSpacing: 1.5, marginTop: 10, textTransform: 'uppercase' }}>Leitura pública: {identity.reputation.consensus ?? potentialNarrative(player)}</div></div></div>;
          })}
        </div>
      </div>

      <div style={{ ...revealStyle(5) }} className="_ey_card">
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, letterSpacing: 4, color: 'rgba(255,255,255,.45)', textTransform: 'uppercase', marginBottom: 10 }}>—ltimo chamado</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
          <div><div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 30, fontWeight: 900, color: '#fff', lineHeight: 1 }}>O palco apaga. A temporada {nextYear} est— pronta.</div><div style={{ fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 15, color: 'rgba(255,255,255,.42)', marginTop: 8, lineHeight: 1.45 }}>Os premiados j— foram coroados. Agora — hora de descobrir quem sustenta o status, quem explode e quem toma o circuito de assalto.</div></div>
          <button onClick={onDismiss} style={{ background: 'linear-gradient(135deg, rgba(255,215,0,.18), rgba(255,215,0,.08))', border: '1px solid rgba(255,215,0,.32)', color: '#FFD700', cursor: 'pointer', fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', padding: '12px 20px' }}>Come—ar {nextYear}</button>
        </div>
      </div>
    </div>
  );
}

function normalizeYearSurface(surface) {
  const key = String(surface ?? 'HARD').toUpperCase();
  if (key.includes('CLAY') || key.includes('ROLAND')) return 'CLAY';
  if (key.includes('GRASS') || key.includes('WIMBLEDON')) return 'GRASS';
  if (key.includes('INDOOR') || key.includes('O2')) return 'INDOOR';
  if (key.includes('STREET') || key.includes('URBAN')) return 'STREET';
  if (key.includes('CARPET') || key.includes('VELVET')) return 'CARPET';
  return 'HARD';
}

function TabSurfaceAlmanac({ summary }) {
  const groups = Object.entries(SURF_META).map(([key, meta]) => {
    const titles = (summary.champions ?? []).filter(entry => normalizeYearSurface(entry.tournament?.surface) === key);
    const wins = titles.reduce((acc, item) => {
      const id = item.champion?.id ?? item.champion?.name;
      if (!id) return acc;
      acc[id] = { player:item.champion, count:(acc[id]?.count ?? 0) + 1 };
      return acc;
    }, {});
    const leader = Object.values(wins).sort((a,b) => b.count - a.count || a.player.name.localeCompare(b.player.name))[0] ?? null;
    const marquee = titles.filter(item => ['GRAND_SLAM','SLAM_CLASH','FINALS','MASTERS_1000'].includes(item.tournament?.category)).slice(0, 3);
    const copy = leader
      ? leader.count > 1
        ? `${leader.player.name} foi a assinatura deste piso: ${leader.count} títulos e uma presença que mudou a leitura da temporada.`
        : `${leader.player.name} levou o principal capítulo, mas ${new Set(titles.map(item => item.champion?.id)).size} nomes dividiram o território.`
      : 'Nenhuma campanha registrada neste piso nesta temporada.';
    return { key, meta, titles, leader, marquee, copy };
  }).filter(group => group.titles.length > 0);

  return (
    <div style={{ padding:'28px 32px 42px' }}>
      <div style={{ maxWidth:960, marginBottom:25 }}>
        <div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.28em', textTransform:'uppercase', color:'#6D5B43', marginBottom:10 }}>dossiê editorial · temporada {summary.year}</div>
        <h2 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'clamp(34px,5vw,58px)', lineHeight:.9, margin:0, textTransform:'uppercase' }}>O ano contado por cada piso.</h2>
        <p style={{ fontFamily:"'Crimson Pro',Georgia,serif", fontSize:18, lineHeight:1.55, margin:'13px 0 0' }}>Não são só troféus: é onde cada jogador construiu autoridade, onde a hierarquia rachou e onde a próxima rivalidade começou a aparecer.</p>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(330px,1fr))', gap:14 }}>
        {groups.map((group, index) => (
          <article key={group.key} style={{ minHeight:270, padding:'18px 19px 20px', background:'rgba(255,255,255,.28)', border:'1px solid rgba(79,59,35,.20)', borderTop:`4px solid ${group.meta.color}`, animation:`_ey_in .35s ease ${index * .05}s both` }}>
            <div style={{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'baseline' }}>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.22em', textTransform:'uppercase', color:'#6D5B43' }}>caderno de superfície</div>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.14em', color:'#6D5B43' }}>{group.titles.length} título{group.titles.length !== 1 ? 's' : ''}</div>
            </div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:34, fontWeight:900, lineHeight:1, textTransform:'uppercase', marginTop:9 }}>{group.meta.label}</div>
            <div style={{ fontFamily:"'Crimson Pro',Georgia,serif", fontSize:15.5, lineHeight:1.55, marginTop:10 }}>{group.copy}</div>
            {group.leader && <div style={{ marginTop:14, padding:'10px 12px', borderLeft:`3px solid ${group.meta.color}`, background:`${group.meta.color}14` }}><div style={{ fontFamily:"'Space Mono',monospace", fontSize:7, letterSpacing:'.18em', textTransform:'uppercase', color:'#6D5B43' }}>figura do piso</div><div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:22, fontWeight:900, textTransform:'uppercase', lineHeight:1, marginTop:5 }}>{group.leader.player.name}</div></div>}
            {group.marquee.length > 0 && <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:13 }}>{group.marquee.map((entry, i) => <span key={`${entry.tournament.id}-${i}`} style={{ fontFamily:"'Space Mono',monospace", fontSize:7, letterSpacing:'.08em', padding:'4px 6px', border:'1px solid rgba(79,59,35,.18)', background:'rgba(255,255,255,.24)' }}>{entry.tournament.name}: {entry.champion.name}</span>)}</div>}
          </article>
        ))}
      </div>
    </div>
  );
}

function TabProspectWatch({ summary, allPlayers = [] }) {
  const promoted = summary.juniorPromotionSpotlight ?? [];
  const promotedIds = new Set(promoted.map(player => player.id));
  const youngTour = allPlayers.filter(player => (player.age ?? 99) <= 22 && !promotedIds.has(player.id)).sort((a,b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999));
  const prospects = [...promoted, ...youngTour].slice(0, 8);
  return (
    <div style={{ padding:'28px 32px 42px' }}>
      <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(250px,.38fr)', gap:22, borderBottom:'2px solid #B9784A', paddingBottom:22, marginBottom:22 }}>
        <div><div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.28em', textTransform:'uppercase', color:'#6D5B43', marginBottom:10 }}>observatório · próxima geração</div><h2 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'clamp(34px,5vw,58px)', lineHeight:.9, margin:0, textTransform:'uppercase' }}>Quem entra no próximo ano para mudar o roteiro.</h2><p style={{ fontFamily:"'Crimson Pro',Georgia,serif", fontSize:18, lineHeight:1.55, margin:'13px 0 0' }}>A turma promovida e os jovens que já deixaram de ser promessa. Cada ficha aponta o argumento que eles levam para a temporada {summary.year + 1}.</p></div>
        <div style={{ border:'1px solid rgba(79,59,35,.22)', background:'rgba(255,255,255,.26)', padding:'14px 16px', alignSelf:'end' }}><div style={{ fontFamily:"'Space Mono',monospace", fontSize:7, letterSpacing:'.18em', textTransform:'uppercase', color:'#6D5B43' }}>subidas confirmadas</div><div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:48, fontWeight:900, lineHeight:.82, marginTop:9 }}>{promoted.length}</div><div style={{ fontFamily:"'Crimson Pro',Georgia,serif", fontSize:14, lineHeight:1.45, marginTop:8 }}>juniores já carimbados para o Tour.</div></div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(255px,1fr))', gap:12 }}>
        {prospects.map((player, index) => {
          const ovr = overallRating(player.attrs ?? {});
          const strengths = topStrengths(player.attrs ?? {}, 2).map(item => item.label).join(' · ') || 'perfil em maturação';
          const junior = player.juniorSeason;
          const status = promotedIds.has(player.id) ? `promovido do junior #${junior?.juniorRank ?? '—'}` : `já no tour · #${player.rankPosition ?? '—'}`;
          const hook = promotedIds.has(player.id)
            ? `${junior?.titles ?? 0} título(s), ${junior?.wins ?? 0} vitórias e uma vaga conquistada com campanha própria.`
            : `Aos ${player.age ?? '—'} anos, já tem ranking para transformar expectativa em pressão real.`;
          return <article key={player.id ?? index} style={{ padding:'16px 16px 18px', minHeight:208, background:'rgba(255,255,255,.27)', border:'1px solid rgba(79,59,35,.20)', borderTop:`4px solid ${index < promoted.length ? '#5A8E5D' : '#7A9AB0'}` }}><div style={{ display:'flex', justifyContent:'space-between', gap:10 }}><div style={{ fontFamily:"'Space Mono',monospace", fontSize:7, letterSpacing:'.16em', textTransform:'uppercase', color:'#6D5B43' }}>{status}</div><div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:22, lineHeight:.9 }}>{ovrTier(ovr).grade}</div></div><div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:27, fontWeight:900, lineHeight:1, textTransform:'uppercase', marginTop:13 }}>{player.name}</div><div style={{ fontFamily:"'Space Mono',monospace", fontSize:7, letterSpacing:'.12em', color:'#6D5B43', marginTop:6 }}>{player.nationality ?? '—'} · {player.age ?? '—'} anos · #{player.rankPosition ?? 'novo'}</div><div style={{ marginTop:13, fontFamily:"'Crimson Pro',Georgia,serif", fontSize:15, lineHeight:1.52 }}>{hook}</div><div style={{ marginTop:13, paddingTop:10, borderTop:'1px solid rgba(79,59,35,.15)', fontFamily:"'Space Mono',monospace", fontSize:7, letterSpacing:'.1em', textTransform:'uppercase', color:'#6D5B43' }}>armas: {strengths}</div></article>;
        })}
      </div>
    </div>
  );
}

function YearCoverPage({ summary }) {
  const awards = summary.awards ?? {};
  const headline = awards.noOne?.name
    ? `${awards.noOne.name} fecha ${summary.year} no topo.`
    : `O circuito encerra ${summary.year}.`;
  return <div style={{ minHeight:'100%', display:'grid', placeItems:'center', padding:'clamp(34px,7vw,92px) 32px', background:'radial-gradient(circle at 72% 16%, rgba(185,120,74,.22), transparent 28%), linear-gradient(160deg, rgba(255,255,255,.3), transparent)' }}><div style={{ width:'min(980px,100%)', borderTop:'5px solid #B9784A', borderBottom:'1px solid rgba(79,59,35,.25)', padding:'26px 0 34px' }}><div style={{ fontFamily:"'Space Mono',monospace", fontSize:9, letterSpacing:'.38em', textTransform:'uppercase', color:'#6D5B43' }}>a redação do circuito apresenta</div><div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:'clamp(72px,14vw,180px)', letterSpacing:'-.035em', lineHeight:.72, textTransform:'uppercase', marginTop:22 }}>O ANO<br/>{summary.year}</div><div style={{ maxWidth:700, fontFamily:"'Crimson Pro',Georgia,serif", fontSize:'clamp(20px,2.2vw,28px)', lineHeight:1.38, marginTop:28 }}>{headline} Esta é a edição que guarda os nomes, os pisos, as promessas e os adeuses que mudaram o circuito.</div><div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:10, marginTop:34 }}>{[['títulos narrados', summary.champions?.length ?? 0], ['novas subidas', summary.juniorPromotionSpotlight?.length ?? 0], ['despedidas', summary.retired?.filter(p => p?.retirementInfo?.type !== 'PROSPECT_AGED_OUT').length ?? 0]].map(([label,value]) => <div key={label} style={{ padding:'12px 14px', background:'rgba(255,255,255,.25)', border:'1px solid rgba(79,59,35,.2)' }}><div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:34, fontWeight:900, lineHeight:.9 }}>{value}</div><div style={{ fontFamily:"'Space Mono',monospace", fontSize:7, letterSpacing:'.14em', textTransform:'uppercase', color:'#6D5B43', marginTop:6 }}>{label}</div></div>)}</div></div></div>;
}

function YearFinalPage({ summary, onDismiss }) {
  const leader = summary.awards?.noOne?.name ?? 'O novo número um';
  return <div style={{ minHeight:'100%', display:'grid', placeItems:'center', padding:'clamp(34px,7vw,92px) 32px', background:'radial-gradient(circle at 18% 80%, rgba(90,142,93,.16), transparent 28%), linear-gradient(160deg, rgba(255,255,255,.28), transparent)' }}><div style={{ width:'min(860px,100%)', textAlign:'center', borderTop:'4px solid #5A8E5D', paddingTop:26 }}><div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.3em', textTransform:'uppercase', color:'#6D5B43' }}>última página · {summary.year}</div><div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'clamp(48px,8vw,94px)', fontWeight:900, lineHeight:.84, textTransform:'uppercase', marginTop:18 }}>A edição fecha.<br/>O circuito não.</div><p style={{ fontFamily:"'Crimson Pro',Georgia,serif", fontSize:21, lineHeight:1.5, margin:'24px auto', maxWidth:680 }}>{leader} entra em {summary.year + 1} com o alvo nas costas. Os nomes desta edição agora deixam de ser retrospecto — viram a pressão do próximo capítulo.</p><button onClick={onDismiss} style={{ padding:'14px 23px', cursor:'pointer', background:'rgba(90,142,93,.14)', border:'1px solid rgba(56,95,59,.45)', fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.18em', textTransform:'uppercase' }}>abrir temporada {summary.year + 1} →</button></div></div>;
}

function YearSummaryModal({ summary, onDismiss, allPlayers }) {
  React.useEffect(() => { _ey_injectCSS(); }, []);
  const [page, setPage] = React.useState(0);
  if (!summary) return null;

  const { year } = summary;
  const nextYear = year + 1;
  const PAGES = [
    { label:'Capa', kicker:'edição anual', render:() => <YearCoverPage summary={summary} /> },
    { label:'A Coroação', kicker:'os melhores do ano', render:() => <TabGala summary={summary} allPlayers={allPlayers} onDismiss={onDismiss} /> },
    { label:'O Reino dos Pisos', kicker:'o circuito por superfície', render:() => <TabSurfaceAlmanac summary={summary} /> },
    { label:'Novos Donos', kicker:'próxima geração', render:() => <TabProspectWatch summary={summary} allPlayers={allPlayers} /> },
    { label:'O Ano em Movimento', kicker:'ascensões e mudanças', render:() => <TabNovidades summary={summary} /> },
    { label:'Quem Ficou', kicker:'memória e despedidas', render:() => <TabAposentados summary={summary} /> },
    { label:'Próximo Capítulo', kicker:'a porta para o novo ano', render:() => <YearFinalPage summary={summary} onDismiss={onDismiss} /> },
  ];
  const currentPage = PAGES[page] ?? PAGES[0];

  return (
    <div className="_ey_overlay" style={{ zIndex: 9999 }}>
      <EyStars />

      {/* Main panel */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(180deg, #eee5d1 0%, #e2d4b7 100%)',
      }}>

        {/* -- CINEMATIC HEADER -- */}
        <div style={{
          flexShrink: 0, position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(135deg, #f3ebd8 0%, #e5d7ba 60%)',
          borderBottom: '1px solid rgba(79,59,35,.22)',
          padding: '20px 32px 16px',
        }}>
          {/* Gold accent line */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #B9784A, #B9784A88, transparent)' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, letterSpacing: 6, color: 'rgba(255,215,0,.5)', textTransform: 'uppercase', marginBottom: 6 }}>
                {currentPage.kicker}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
                <div style={{
                  fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif",
                  fontSize: 'clamp(36px,5vw,56px)', fontWeight: 900,
                  color: '#FFD700', lineHeight: .9, letterSpacing: -1,
                  textShadow: '0 0 30px rgba(255,215,0,.25)',
                }}>
                  {currentPage.label}
                </div>
                <div style={{
                  fontFamily: "'Space Mono',monospace", fontSize: 10, letterSpacing: 3,
                  color: 'rgba(255,255,255,.2)', alignSelf: 'flex-end', paddingBottom: 4,
                }}>
                  {String(page + 1).padStart(2, '0')}/{String(PAGES.length).padStart(2, '0')}
                </div>
              </div>
            </div>
            <button onClick={onDismiss} style={{
              background: 'rgba(185,120,74,.12)',
              border: '1px solid rgba(126,79,47,.42)',
              color: '#3B2F21', cursor: 'pointer',
              fontFamily: "'Barlow Condensed','Barlow Condensed',sans-serif",
              fontSize: 14, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase',
              padding: '12px 28px', transition: 'all .2s',
            }}
              onMouseEnter={e => { e.target.style.background = 'rgba(185,120,74,.22)'; }}
              onMouseLeave={e => { e.target.style.background = 'rgba(185,120,74,.12)'; }}
            >
              Iniciar {nextYear} ?
            </button>
          </div>
        </div>

        <div style={{ flexShrink:0, padding:'10px 32px', display:'flex', alignItems:'center', gap:8, borderBottom:'1px solid rgba(79,59,35,.18)', background:'rgba(255,255,255,.22)' }}>
          {PAGES.map((item, index) => <div key={item.label} style={{ height:3, flex:1, background:index === page ? '#B9784A' : index < page ? 'rgba(185,120,74,.42)' : 'rgba(79,59,35,.16)' }} />)}
        </div>

        {/* -- PÁGINA EDITORIAL -- */}
        <div key={currentPage.label} style={{ flex:1, overflowY:'auto', scrollbarWidth:'thin', scrollbarColor:'rgba(126,79,47,.45) transparent', animation:'_ey_in .32s ease' }}>
          {currentPage.render()}
        </div>

        <div style={{ flexShrink:0, display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:14, alignItems:'center', padding:'12px 32px 14px', borderTop:'1px solid rgba(79,59,35,.22)', background:'rgba(255,255,255,.26)' }}>
          <button disabled={page === 0} onClick={() => setPage(value => Math.max(0, value - 1))} style={{ justifySelf:'start', padding:'9px 13px', cursor:page === 0 ? 'default' : 'pointer', opacity:page === 0 ? .36 : 1, background:'transparent', border:'1px solid rgba(79,59,35,.27)', fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.14em', textTransform:'uppercase' }}>← página anterior</button>
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.18em', textTransform:'uppercase', color:'#6D5B43' }}>edição {year} · {currentPage.label}</div>
          {page < PAGES.length - 1 ? <button onClick={() => setPage(value => Math.min(PAGES.length - 1, value + 1))} style={{ justifySelf:'end', padding:'9px 13px', cursor:'pointer', background:'rgba(185,120,74,.14)', border:'1px solid rgba(126,79,47,.42)', fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.14em', textTransform:'uppercase' }}>próxima página →</button> : <button onClick={onDismiss} style={{ justifySelf:'end', padding:'9px 13px', cursor:'pointer', background:'rgba(90,142,93,.14)', border:'1px solid rgba(56,95,59,.42)', fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.14em', textTransform:'uppercase' }}>começar {nextYear} →</button>}
        </div>
      </div>
    </div>
  );
}

function buildRetirementReasonLabel(player) {
  const info = player?.retirementInfo ?? {};
  const type = info.type ?? '';
  if (type === 'BREAKING_HEALTH') {
    const diagnosis = player?.breakingNews?.healthCrisis?.diagnosisName ?? null;
    return diagnosis ? `Saúde · ${diagnosis}` : 'Saúde';
  }
  if (type === 'BREAKING_FAREWELL') return 'Despedida planejada';
  if (type === 'VOLUNTARIA_PICO') return 'Saiu no auge';
  if (type === 'DESGASTE_NATURAL') return 'Idade e desgaste natural';
  if (type === 'FORCADA_LESAO') {
    const injury = player?.injury ?? null;
    return injury ? `Lesão · ${getInjuryDisplayName(injury)}` : 'Lesão grave';
  }
  if (type === 'BURNOUT') return 'Esgotamento competitivo';
  if (type === 'FORCADA_RANKING') return 'Queda de nível competitivo';
  return info.message ? 'Encerramento de carreira' : 'Aposentadoria';
}

function buildHofTributes(summary, allPlayers) {
  if (!summary?.hofTributes?.length) return [];
  return summary.hofTributes.map((tribute, index) => {
    const stats = tribute.stats;
    const player = stats?.player ?? allPlayers.find(p => p.id === tribute.playerId) ?? null;
    const timeline = tribute.timeline ?? [];
    const topMoments = timeline
      .filter(event => ['GRAND_SLAM', 'CAREER_SLAM', 'YEAR_END_NO1', 'MASTERS_1000', 'FINALS', 'RETIREMENT_ANNOUNCED', 'BREAKING_NEWS'].includes(event.type))
      .slice(-6)
      .reverse();
    const gsRows = GRAND_SLAM_IDS.map((gsId) => {
      const info = GRAND_SLAM_INFO[gsId];
      const wonYears = (stats?.gsYears?.[gsId] ?? []).slice().sort((a, b) => a - b);
      return { gsId, info, wonYears };
    });
    const retirementAge = player?.retirementInfo?.age ?? stats?.retirementInfo?.age ?? player?.age ?? null;
    const goatRank = tribute.goatRank ?? Math.max(1, index + 1);
    const goatNarrative = goatRank === 1
      ? 'Entra no Hall of Fame já como o maior GOAT Score da história do universo.'
      : goatRank === 2
        ? 'Entra no Hall of Fame já como o 2º maior GOAT Score da história, imediatamente abaixo do topo absoluto.'
        : goatRank === 3
          ? 'Entra no Hall of Fame completando o pódio histórico de GOAT Score do universo.'
          : goatRank <= 5
            ? `Entra no Hall of Fame já entre os ${goatRank} maiores GOAT Scores de todos os tempos.`
            : goatRank <= 10
              ? `Entra no Hall of Fame já no top ${goatRank} histórico de GOAT Score, um patamar que quase ninguém toca.`
              : `Entra no Hall of Fame ocupando o ${goatRank}º lugar no GOAT Score histórico, ainda assim em território de lenda plena.`;
    return {
      key: `${tribute.playerId}-${index}`,
      player,
      stats,
      topMoments,
      gsRows,
      epitaph: tribute.epitaph ?? null,
      retirementAge,
      goatRank,
      goatNarrative,
      reasonLabel: tribute.reasonLabel ?? buildRetirementReasonLabel(player),
      reasonText: tribute.reasonText ?? player?.retirementInfo?.message ?? null,
      headline: tribute.headline ?? `${stats?.name ?? player?.name ?? 'Lenda'} se despede do circuito`,
      subline: tribute.subline ?? 'Uma carreira grande demais para sair em silêncio.',
    };
  });
}

function HallOfFameRetirementTribute({ tributes, onDismiss }) {
  const [idx, setIdx] = React.useState(0);
  React.useEffect(() => { _ey_injectCSS(); }, []);
  const tribute = tributes?.[idx] ?? null;
  if (!tribute) return null;

  const player = tribute.player;
  const stats = tribute.stats;
  const photo = getPlayerPhoto(player);
  const careerSpan = stats?.firstYear && stats?.lastYear ? `${stats.firstYear} — ${stats.lastYear}` : 'trajetória histórica';
  const titles = stats?.totalTitles ?? 0;
  const surfaceWins = Object.entries(stats?.surfTitles ?? {}).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0];
  const dominantSurface = surfaceWins?.[1] > 0 ? surfaceWins : null;
  const nextLabel = idx < tributes.length - 1 ? 'Próxima despedida' : 'Ir para a gala';

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1300, background:'radial-gradient(circle at 18% 18%, rgba(232,200,74,.12), transparent 24%), radial-gradient(circle at 84% 10%, rgba(255,255,255,.08), transparent 18%), linear-gradient(180deg, rgba(2,6,9,.98), rgba(4,10,14,.995))', display:'flex', alignItems:'stretch', justifyContent:'center' }}>
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg, rgba(255,255,255,.022) 1px, transparent 1px), linear-gradient(180deg, rgba(255,255,255,.02) 1px, transparent 1px)', backgroundSize:'34px 34px', opacity:.18, pointerEvents:'none' }} />
      <div style={{ position:'relative', width:'min(1600px, 100%)', height:'100%', display:'grid', gridTemplateRows:'auto 1fr auto', padding:'22px 26px 18px', overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14, borderBottom:'1px solid rgba(232,200,74,.18)', paddingBottom:14 }}>
          <span style={{ fontFamily:"'Space Mono',monospace", fontSize:9, letterSpacing:'.34em', color:'#FFD700', textTransform:'uppercase' }}>Breaking retirement</span>
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:28, color:'#fff', letterSpacing:'.08em', textTransform:'uppercase' }}>Hall of Fame Farewell</span>
          <div style={{ marginLeft:'auto', fontFamily:"'Space Mono',monospace", fontSize:8, color:'rgba(255,255,255,.38)', letterSpacing:'.24em', textTransform:'uppercase' }}>
            {idx + 1}/{tributes.length}
          </div>
        </div>

        <div style={{ minHeight:0, overflowY:'auto', paddingTop:18 }}>
          <div style={{ display:'grid', gridTemplateColumns:'420px minmax(0,1fr)', gap:22, minHeight:'100%' }}>
            <div style={{ border:'1px solid rgba(232,200,74,.18)', background:'linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.01))', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg, rgba(232,200,74,.18), transparent 28%, rgba(0,0,0,.38) 100%)', pointerEvents:'none' }} />
              <div style={{ position:'relative', minHeight:560, display:'flex', alignItems:'flex-end', padding:18 }}>
                {photo ? (
                  <img src={photo} alt={player?.name} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', objectPosition:'top center', filter:'saturate(.95) contrast(1.02)' }} />
                ) : (
                  <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Barlow Condensed',sans-serif", fontSize:120, color:'rgba(255,255,255,.12)' }}>
                    {player?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '??'}
                  </div>
                )}
                <div style={{ position:'relative', zIndex:1 }}>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, color:'rgba(255,255,255,.5)', letterSpacing:'.24em', textTransform:'uppercase' }}>{careerSpan}</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:46, fontWeight:800, color:'#fff', lineHeight:.92, textTransform:'uppercase', marginTop:8 }}>{player?.name}</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:12 }}>
                    <span style={{ fontFamily:"'Space Mono',monospace", fontSize:8, color:'#FFD700', border:'1px solid rgba(232,200,74,.35)', background:'rgba(232,200,74,.1)', padding:'5px 8px', letterSpacing:'.18em', textTransform:'uppercase' }}>Hall of Fame</span>
                    <span style={{ fontFamily:"'Space Mono',monospace", fontSize:8, color:'rgba(255,255,255,.8)', border:'1px solid rgba(255,255,255,.14)', background:'rgba(255,255,255,.04)', padding:'5px 8px', letterSpacing:'.18em', textTransform:'uppercase' }}>{tribute.reasonLabel}</span>
                    {tribute.retirementAge != null && <span style={{ fontFamily:"'Space Mono',monospace", fontSize:8, color:'rgba(255,255,255,.8)', border:'1px solid rgba(255,255,255,.14)', background:'rgba(255,255,255,.04)', padding:'5px 8px', letterSpacing:'.18em', textTransform:'uppercase' }}>{tribute.retirementAge} anos</span>}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateRows:'auto auto auto 1fr', gap:16, minHeight:0 }}>
              <div style={{ border:'1px solid rgba(232,200,74,.15)', background:'linear-gradient(180deg, rgba(232,200,74,.08), rgba(255,255,255,.015))', padding:'18px 20px' }}>
                <div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, color:'#FFD700', letterSpacing:'.28em', textTransform:'uppercase', marginBottom:8 }}>A manchete do adeus</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:38, fontWeight:800, color:'#fff', lineHeight:.96, textTransform:'uppercase' }}>{tribute.headline}</div>
                <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:15, color:'rgba(255,255,255,.72)', lineHeight:1.65, marginTop:12 }}>{tribute.subline}</div>
                {tribute.reasonText && (
                  <div style={{ marginTop:12, paddingLeft:12, borderLeft:'2px solid rgba(232,200,74,.35)', fontFamily:"'Barlow',sans-serif", fontSize:14, color:'rgba(255,255,255,.58)', lineHeight:1.6 }}>
                    {tribute.reasonText}
                  </div>
                )}
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(4, minmax(0, 1fr))', gap:12 }}>
                {[
                  { label:'Grand Slams', value: stats?.gs ?? 0, color:'#FFD700' },
                  { label:'Masters', value: stats?.masters ?? 0, color:'#D17BFF' },
                  { label:'Títulos', value: titles, color:'#FFFFFF' },
                  { label:'GOAT Score', value: stats?.goatScore?.total ?? 0, color:'#52AA6A' },
                ].map((item) => (
                  <div key={item.label} style={{ border:`1px solid ${item.color}28`, background:`${item.color}10`, padding:'14px 16px' }}>
                    <div style={{ fontFamily:"'Space Mono',monospace", fontSize:7, color:'rgba(255,255,255,.36)', letterSpacing:'.22em', textTransform:'uppercase' }}>{item.label}</div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:34, fontWeight:800, color:item.color, lineHeight:1, marginTop:8 }}>{item.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ border:'1px solid rgba(82,197,94,.22)', background:'rgba(82,197,94,.08)', padding:'14px 16px' }}>
                <div style={{ fontFamily:"'Space Mono',monospace", fontSize:7, color:'rgba(255,255,255,.34)', letterSpacing:'.22em', textTransform:'uppercase', marginBottom:6 }}>Lugar no panteão</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:22, fontWeight:800, color:'#52C55E', lineHeight:1, textTransform:'uppercase' }}>
                  GOAT Score · #{tribute.goatRank}
                </div>
                <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:13, color:'rgba(255,255,255,.72)', lineHeight:1.65, marginTop:8 }}>
                  {tribute.goatNarrative}
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1.15fr .85fr', gap:14 }}>
                <div style={{ border:'1px solid rgba(255,255,255,.08)', background:'rgba(255,255,255,.02)', padding:'16px 18px' }}>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, color:'rgba(255,255,255,.44)', letterSpacing:'.24em', textTransform:'uppercase', marginBottom:12 }}>Mapa de legado</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4, minmax(0, 1fr))', gap:8 }}>
                    {tribute.gsRows.map(({ gsId, info, wonYears }) => (
                      <div key={gsId} style={{ border:`1px solid ${wonYears.length ? `${info.color}44` : 'rgba(255,255,255,.08)'}`, background:wonYears.length ? `${info.color}12` : 'rgba(255,255,255,.02)', padding:'10px 10px 12px', minHeight:102 }}>
                        <div style={{ fontSize:20 }}>{info.icon}</div>
                        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, color:wonYears.length ? info.light : 'rgba(255,255,255,.5)', textTransform:'uppercase', marginTop:6 }}>{info.label}</div>
                        <div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, color:wonYears.length ? '#fff' : 'rgba(255,255,255,.28)', marginTop:6, lineHeight:1.6 }}>
                          {wonYears.length ? wonYears.join(' · ') : 'nunca venceu'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ border:'1px solid rgba(255,255,255,.08)', background:'rgba(255,255,255,.02)', padding:'16px 18px' }}>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, color:'rgba(255,255,255,.44)', letterSpacing:'.24em', textTransform:'uppercase', marginBottom:10 }}>Números que ficam</div>
                  <div style={{ display:'grid', gap:10 }}>
                    <div><div style={{ fontFamily:"'Space Mono',monospace", fontSize:7, color:'rgba(255,255,255,.28)', letterSpacing:'.18em', textTransform:'uppercase' }}>Win rate</div><div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:28, color:'#fff' }}>{Math.round((stats?.winRate ?? 0) * 100)}%</div></div>
                    <div><div style={{ fontFamily:"'Space Mono',monospace", fontSize:7, color:'rgba(255,255,255,.28)', letterSpacing:'.18em', textTransform:'uppercase' }}>Meses no top 10</div><div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:28, color:'#fff' }}>{stats?.top10Months ?? 0}</div></div>
                    <div><div style={{ fontFamily:"'Space Mono',monospace", fontSize:7, color:'rgba(255,255,255,.28)', letterSpacing:'.18em', textTransform:'uppercase' }}>Anos como nº1</div><div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:28, color:'#fff' }}>{stats?.yearsAsNo1?.length ?? 0}</div></div>
                    <div><div style={{ fontFamily:"'Space Mono',monospace", fontSize:7, color:'rgba(255,255,255,.28)', letterSpacing:'.18em', textTransform:'uppercase' }}>Superfície-símbolo</div><div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:22, color:'#fff' }}>{dominantSurface ? `${dominantSurface[0]} · ${dominantSurface[1]} títulos` : 'legado plural'}</div></div>
                  </div>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, minHeight:0 }}>
                <div style={{ border:'1px solid rgba(255,255,255,.08)', background:'rgba(255,255,255,.02)', padding:'16px 18px', minHeight:0 }}>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, color:'#FFD700', letterSpacing:'.24em', textTransform:'uppercase', marginBottom:10 }}>Feitos que definem a lenda</div>
                  <div style={{ display:'grid', gap:10 }}>
                    {tribute.topMoments.slice(0, 5).map((event, eventIdx) => (
                      <div key={`${event.type}-${event.year}-${eventIdx}`} style={{ borderLeft:`2px solid ${event.color ?? '#FFD700'}`, paddingLeft:10 }}>
                        <div style={{ fontFamily:"'Space Mono',monospace", fontSize:7, color:'rgba(255,255,255,.3)', letterSpacing:'.18em', textTransform:'uppercase' }}>{event.year} · {event.type.replace(/_/g, ' ')}</div>
                        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:17, color:'#fff', textTransform:'uppercase', lineHeight:1.2, marginTop:4 }}>{event.title}</div>
                        {event.subtitle && <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:12, color:'rgba(255,255,255,.58)', lineHeight:1.55, marginTop:4 }}>{event.subtitle}</div>}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ border:'1px solid rgba(255,255,255,.08)', background:'rgba(255,255,255,.02)', padding:'16px 18px', minHeight:0 }}>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, color:'rgba(255,255,255,.44)', letterSpacing:'.24em', textTransform:'uppercase', marginBottom:10 }}>Última palavra</div>
                  <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:14, color:'rgba(255,255,255,.72)', lineHeight:1.75 }}>
                    {tribute.epitaph?.text ?? `${stats?.name ?? player?.name} deixa o circuito com uma carreira que já não precisava de confirmação. O Hall of Fame não aparece aqui como prêmio póstumo, mas como reconhecimento inevitável de uma presença que deformou o teto histórico do universo.`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:12, borderTop:'1px solid rgba(255,255,255,.08)', paddingTop:14 }}>
          <button onClick={() => idx > 0 ? setIdx(idx - 1) : null} disabled={idx === 0} style={{ fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.18em', textTransform:'uppercase', padding:'10px 14px', border:'1px solid rgba(255,255,255,.12)', background:'rgba(255,255,255,.03)', color:idx === 0 ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.72)', cursor:idx === 0 ? 'default' : 'pointer' }}>Anterior</button>
          <button onClick={() => idx < tributes.length - 1 ? setIdx(idx + 1) : onDismiss()} style={{ fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.2em', textTransform:'uppercase', padding:'10px 16px', border:'1px solid rgba(232,200,74,.35)', background:'rgba(232,200,74,.12)', color:'#FFD700', cursor:'pointer' }}>{nextLabel}</button>
          <div style={{ marginLeft:'auto', fontFamily:"'Space Mono',monospace", fontSize:8, color:'rgba(255,255,255,.3)', letterSpacing:'.16em', textTransform:'uppercase' }}>A cerimônia anual começa depois desta despedida</div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// -------------------------------------------------------------------

import BroadcastUniverse from './BroadcastUniverse.jsx';
import WelcomeToUniverse from './WelcomeToUniverse.jsx';
import HeadlessOverlay from '../game/HeadlessOverlay.jsx';

// -------------------------------------------------------------------
// TOURNAMENT CEREMONY — cerim—nia p—s-final
// Props: tournament, bracket, state, onClose
// -------------------------------------------------------------------

const _CER_CSS = `
@keyframes _cer_fadein  { from{opacity:0}to{opacity:1} }
@keyframes _cer_rise    { from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)} }
@keyframes _cer_zoom    { from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)} }
@keyframes _cer_trophy  { 0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-10px) rotate(3deg)} }
@keyframes _cer_glow    { 0%,100%{filter:drop-shadow(0 0 12px var(--cer-sc))}50%{filter:drop-shadow(0 0 28px var(--cer-sc))} }
@keyframes _cer_confetti{ 0%{transform:translateY(-10px) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(600deg);opacity:0} }
@keyframes _cer_score_pop{ 0%{transform:scale(1.6);opacity:0}60%{transform:scale(.95)}100%{transform:scale(1);opacity:1} }
@keyframes _cer_scan    { 0%{background-position:0 0}100%{background-position:0 100%} }

._cer_overlay{
  position:fixed;inset:0;z-index:9999;
  background:rgba(43,33,23,.58);
  display:flex;align-items:center;justify-content:center;
  padding:18px;
  box-sizing:border-box;
  animation:_cer_fadein .35s ease;overflow:hidden;
}
._cer_panel{
  position:relative;width:min(96vw,1840px);height:min(95vh,960px);max-height:95vh;
  background:
    radial-gradient(circle at 18% 18%, color-mix(in srgb, var(--cer-sc) 14%, transparent), transparent 34%),
    linear-gradient(160deg,#eee5d1,#e3d6ba 58%,#d8c7a6);
  border:1px solid rgba(76,57,35,.27);
  outline:1px solid rgba(76,57,35,.12);
  outline-offset:4px;
  display:flex;flex-direction:column;overflow:hidden;
  animation:_cer_zoom .45s cubic-bezier(.16,1,.3,1);
}
._cer_side_rail{
  min-width:0;align-self:start;display:grid;gap:14px;
  padding:16px;background:linear-gradient(180deg,rgba(255,255,255,.28),rgba(117,91,56,.06));
  border:1px solid rgba(79,59,35,.20);animation:_cer_rise .42s ease .08s backwards;
}
._cer_recap_layout{
  display:grid;grid-template-columns:minmax(0,1fr) minmax(310px,350px);gap:18px;align-items:start;
}
._cer_recap_main{min-width:0;}
._cer_hero_grid{
  display:grid;grid-template-columns:minmax(330px,.78fr) minmax(500px,1.22fr);
  gap:18px;align-items:stretch;margin-bottom:18px;
}
._cer_stat_grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;}
._cer_category_grid{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:7px;margin-bottom:13px;}
._cer_surface_grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:7px;}
._cer_editorial_grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,.62fr);gap:18px;}
._cer_press_grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;}
@media (max-width: 1500px){
  ._cer_recap_layout{grid-template-columns:minmax(0,1fr) 300px;gap:14px;}
  ._cer_category_grid{grid-template-columns:repeat(4,minmax(0,1fr));}
  ._cer_surface_grid{grid-template-columns:repeat(3,minmax(0,1fr));}
}
@media (max-width: 1340px){
  ._cer_recap_layout{grid-template-columns:1fr;}
  ._cer_side_rail{grid-template-columns:repeat(3,minmax(0,1fr));}
  ._cer_side_rail > div:first-child{grid-column:1/-1;}
}
._cer_confetti_piece{
  position:absolute;top:-16px;pointer-events:none;border-radius:2px;
  animation:_cer_confetti linear infinite;
}
._cer_photo_winner{
  width:clamp(86px,10vw,122px);height:clamp(86px,10vw,122px);
  border-radius:50%;overflow:hidden;flex-shrink:0;
  border:3px solid var(--cer-sc);
  animation:_cer_glow 3s ease-in-out infinite;
}
._cer_photo_runner{
  width:clamp(72px,9vw,100px);height:clamp(72px,9vw,100px);
  border-radius:50%;overflow:hidden;flex-shrink:0;
  border:2px solid rgba(255,255,255,.18);
  filter:grayscale(.4);
}
._cer_set_w{
  display:flex;align-items:center;justify-content:center;
  width:42px;height:42px;
  font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:24px;
  animation:_cer_score_pop .4s cubic-bezier(.16,1,.3,1) backwards;
}
._cer_set_l{
  display:flex;align-items:center;justify-content:center;
  width:42px;height:42px;
  font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:20px;
  color:rgba(255,255,255,.3);
}
._cer_tab{
  font-family:'Space Mono',monospace;font-size:8px;letter-spacing:.4em;
  text-transform:uppercase;padding:9px 20px;border:none;cursor:pointer;
  transition:all .15s;background:transparent;
  border-bottom:2px solid transparent;
}
._cer_tab.active{border-bottom-color:var(--cer-sc);color:var(--cer-sc);}
._cer_tab:not(.active){color:rgba(59,47,33,.62);}
._cer_fact{
  padding:14px 18px;
  border-left:2px solid var(--cer-sc);
  background:rgba(255,255,255,.02);
  animation:_cer_rise .4s ease backwards;
  font-family:'Crimson Pro',Georgia,serif;font-size:14px;line-height:1.75;
  color:rgba(242,237,228,.78);
}
._cer_stat_card{
  padding:14px 16px;background:rgba(255,255,255,.03);
  border:1px solid rgba(255,255,255,.06);
}
._cer_mag_grid{
  flex:1;display:grid;
  grid-template-columns:minmax(0,1.02fr) minmax(0,.82fr) minmax(280px,.74fr);
  min-height:0;overflow:hidden;
}
._cer_mag_grid > div{min-width:0;}
._cer_panel_card{
  background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.014));
  border:1px solid rgba(255,255,255,.07);
}
._cer_metric_tile{
  min-width:0;padding:11px 12px;
  background:rgba(255,255,255,.025);
  border:1px solid rgba(255,255,255,.06);
}
._cer_route_row{
  display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:10px;align-items:center;
  padding:9px 11px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.055);
}
._cer_news_card{
  padding:12px 14px;background:rgba(255,255,255,.026);
  border:1px solid rgba(255,255,255,.06);border-left:3px solid var(--cer-sc);
}
._cer_btn_close{
  position:absolute;top:12px;right:14px;z-index:20;
  background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);
  color:rgba(255,255,255,.45);cursor:pointer;width:30px;height:30px;
  display:flex;align-items:center;justify-content:center;
  font-size:14px;transition:all .15s;
}
._cer_btn_close:hover{background:rgba(255,255,255,.14);color:#fff;}
._cer_section_hd{
  font-family:'Space Mono',monospace;font-size:7px;letter-spacing:.5em;
  text-transform:uppercase;color:rgba(59,47,33,.62);margin-bottom:12px;
}
/* O caderno pós-torneio compartilha a paleta de arquivo da ficha.  A regra
   intencionalmente vence os estilos legados do antigo painel escuro: nada de
   texto branco/amarelo sobre o papel. As cores de superfície permanecem em
   bordas, barras e fundos, não como fonte de baixo contraste. */
._cer_panel [style]{color:#3B2F21 !important;text-shadow:none !important;}
._cer_panel button{color:#3B2F21 !important;}
._cer_panel [style*="background"]{ }
._cer_panel ._cer_tab.active{color:#3B2F21 !important;border-bottom-color:var(--cer-sc);font-weight:800;}
._cer_panel ._cer_btn_close{background:rgba(59,47,33,.06);border-color:rgba(59,47,33,.22);}
._cer_panel ._cer_btn_close:hover{background:rgba(59,47,33,.13);color:#3B2F21 !important;}
@media (max-width: 1240px){
  ._cer_overlay{padding:0 1vw;justify-content:center;}
  ._cer_panel{width:98vw;height:94vh;}
  ._cer_recap_layout{grid-template-columns:1fr;}
  ._cer_side_rail{grid-template-columns:repeat(3,minmax(0,1fr));}
  ._cer_side_rail > div:first-child{grid-column:1/-1;}
  ._cer_mag_grid{grid-template-columns:1fr;overflow-y:auto;}
  ._cer_mag_grid > div{border-right:none!important;border-bottom:1px solid rgba(255,255,255,.06);}
}
@media (max-width: 900px){
  ._cer_hero_grid,._cer_editorial_grid{grid-template-columns:1fr;}
  ._cer_press_grid{grid-template-columns:1fr;}
}
@media (max-width: 820px){
  ._cer_side_rail{grid-template-columns:1fr;}
  ._cer_stat_grid{grid-template-columns:repeat(2,minmax(0,1fr));}
  ._cer_category_grid{grid-template-columns:repeat(2,minmax(0,1fr));}
  ._cer_surface_grid{grid-template-columns:repeat(2,minmax(0,1fr));}
}
`;

function _cerInjectCSS() {
  if (document.getElementById('_cer_css_v6')) return;
  document.getElementById('_cer_css_v5')?.remove();
  document.getElementById('_cer_css_v4')?.remove();
  document.getElementById('_cer_css_v3')?.remove();
  document.getElementById('_cer_css_v2')?.remove();
  const s = document.createElement('style');
  s.id = '_cer_css_v6'; s.textContent = _CER_CSS;
  document.head.appendChild(s);
}

function _CerSemiPlayerRow({ p }) {
  const photo = getPlayerPhoto(p);
  const [photoOk, setPhotoOk] = React.useState(!!photo);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '7px 10px', marginBottom: 5,
      background: 'rgba(255,255,255,.02)',
      border: '1px solid rgba(255,255,255,.05)',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', overflow: 'hidden',
        flexShrink: 0, background: p?.color ? `${p.color}22` : '#151915',
        border: '1px solid rgba(255,255,255,.1)',
      }}>
        {photo && photoOk
          ? <img src={photo} onError={() => setPhotoOk(false)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontFamily: "'Bebas Neue',sans-serif", color: 'rgba(255,255,255,.5)' }}>
              {p?.name?.charAt(0)}
            </div>
        }
      </div>
      <div>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 600, fontSize: 12, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', lineHeight: 1 }}>
          {p?.name?.split(' ').slice(-1)[0]}
        </div>
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, color: 'rgba(255,255,255,.2)' }}>
          {p?.nationality}
        </div>
      </div>
    </div>
  );
}

// Confetti
function _CerConfetti({ sc }) {
  const pieces = React.useMemo(() => {
    const cols = [sc, '#FFD700', '#fff', '#FF6B35', '#00FF88', sc + 'bb'];
    return Array.from({ length: 36 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 4,
      dur: Math.random() * 3 + 3,
      size: Math.random() * 7 + 3,
      color: cols[Math.floor(Math.random() * cols.length)],
      rot: Math.random() * 360,
    }));
  }, [sc]);
  return (
    <>
      {pieces.map(p => (
        <div key={p.id} className="_cer_confetti_piece" style={{
          left: `${p.left}%`,
          width: p.size, height: p.size * (Math.random() > .5 ? 1 : 2.5),
          background: p.color,
          animationDuration: `${p.dur}s`,
          animationDelay: `${p.delay}s`,
          transform: `rotate(${p.rot}deg)`,
        }} />
      ))}
    </>
  );
}

// Photo with fallback
function _CerPhoto({ player, winner, sc }) {
  const photo = getPlayerPhoto(player);
  const [ok, setOk] = React.useState(!!photo);
  const initials = player?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?';
  const cls = winner ? '_cer_photo_winner' : '_cer_photo_runner';
  const inner = photo && ok
    ? <img src={photo} alt={player?.name} onError={() => setOk(false)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
    : <div style={{
        width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: player?.color ? `${player.color}28` : '#192019',
        fontFamily: "'Bebas Neue',sans-serif", fontSize: winner ? 52 : 36,
        fontWeight: 700, color: 'rgba(255,255,255,.7)',
      }}>{initials}</div>;
  return <div className={cls} style={winner ? { '--cer-sc': sc } : {}}>{inner}</div>;
}

// Surface config
function _cerSurface(courtKey) {
  const MAP = {
    US_OPEN:       { label: 'Quadra Dura',  icon: '🎾', color: '#1565C0', key: 'HARD'   },
    ROLAND_GARROS: { label: 'Saibro',       icon: '🎾',  color: '#C4572A', key: 'CLAY'   },
    WIMBLEDON:     { label: 'Grama',         icon: '🎾',  color: '#2E7D32', key: 'GRASS'  },
    O2_ARENA:      { label: 'Indoor',        icon: '🎾', color: '#6A1B9A', key: 'INDOOR' },
  };
  return MAP[courtKey] ?? MAP.US_OPEN;
}

// Generate procedural fun facts
function _cerFacts(tournament, champion, runner, finalMatch, bracket) {
  if (!champion) return [];
  const facts = [];
  const seed = champion.name ?? 'x';
  const sd = finalMatch?.result?.setsDetail ?? [];
  const ct = champion.careerTitles ?? {};
  const champOvr = overallRating(champion.attrs ?? {});
  const runnerOvr = runner ? overallRating(runner.attrs ?? {}) : 0;
  const champIsA = finalMatch?.winner?.id === finalMatch?.playerA?.id;
  const style = PLAY_STYLES[champion.styleId];
  const rounds = bracket?.rounds ?? [];

  // Dura——o da final
  if (sd.length >= 3) {
    const totalGames = sd.reduce((s, [a, b]) => s + a + b, 0);
    const sets = sd.length;
    const maxSets = tournament.bestOf === 5 ? 5 : 3;
    if (sets === maxSets) {
      facts.push(`?? Final —pica! ${sets} sets e ${totalGames} games — batalha máxima de um lado ao outro da quadra.`);
    } else {
      facts.push(`? ${champion.name.split(' ')[0]} dominou em ${sets} sets com ${totalGames} games — efici—ncia impec—vel.`);
    }
  } else if (sd.length === 2) {
    const totalGames = sd.reduce((s, [a, b]) => s + a + b, 0);
    facts.push(`?? Final resolvida em 2 sets. ${champion.name.split(' ')[0]} foi implac—vel — ${totalGames} games no total.`);
  }

  // Set heroico
  const bigSet = sd.find(([a, b]) => a + b >= 18);
  if (bigSet) {
    facts.push(`?? O set ${bigSet[0]}—${bigSet[1]} foi um dos mais tensos — desgaste f—sico e mental no limite.`);
  }

  // OVR upside-down
  if (runner && runnerOvr > champOvr + 3) {
    facts.push(`?? A zebra aconteceu! ${champion.name.split(' ')[0]} (${ovrTier(champOvr).grade}) derrubou o favorito ${runner.name.split(' ')[0]} (${ovrTier(runnerOvr).grade}).`);
  } else if (runner && champOvr > runnerOvr + 5) {
    facts.push(`?? Favorito confirmado. ${champion.name.split(' ')[0]} (${ovrTier(champOvr).grade}) mostrou porque — o melhor.`);
  }

  // T—tulos
  if (tournament.isOlympic) {
    const oly = ct.olympic ?? {};
    const golds = oly.gold ?? 1;
    if (golds === 1) facts.push(`?? OURO OL—MPICO! ${champion.name.split(' ')[0]} escreve história — medalha que vai al—m do ranking.`);
    else facts.push(`???? ${golds}— ouro ol—mpico de ${champion.name.split(' ')[0]} — um legado que ultrapassa qualquer circuito.`);
  } else if (tournament.isSlam) {
    const gs = ct.gs ?? 0;
    if (gs === 1) facts.push(`? PRIMEIRO Grand Slam de ${champion.name.split(' ')[0]}. A carreira nunca mais ser— a mesma.`);
    else if (gs === 2) facts.push(`?? Dois Grand Slams — ${champion.name.split(' ')[0]} j— pertence — história do t—nis.`);
    else if (gs >= 5) facts.push(`? ${gs} Grand Slams — lenda viva em a——o. ${champion.name.split(' ')[0]} — de outro planeta.`);
    else facts.push(`? ${gs}— Grand Slam de ${champion.name.split(' ')[0]} — a cole——o cresce.`);
  } else if (tournament.category === 'SLAM_CLASH') {
    const cs = ct.slamClash ?? 0;
    if (cs === 1) facts.push(`?? Primeiro Clash Slam de ${champion.name.split(' ')[0]} — e j— num formato em que um super tie-break decide tudo.`);
    else facts.push(`?? ${cs}— Clash Slam de ${champion.name.split(' ')[0]} — especialista em sobreviver ao formato mais cruel do circuito.`);
  } else if (tournament.isMasters) {
    const m = ct.masters ?? 0;
    if (m === 1) facts.push(`?? Primeiro Masters 1000! ${champion.name.split(' ')[0]} chega ao topo do circuito.`);
    else facts.push(`?? ${m}— Masters 1000 — consist—ncia de campe—o.`);
  }

  // Estilo de jogo
  if (style) {
    const styleDescs = {
      AGG_BASELINER: 'pressão constante do fundo transformada em trof—u',
      CTR_PUNCHER: 'contra-ataques letais que destru—ram o adversário',
      ALL_COURT: 'versatilidade completa em cada momento decisivo',
      SRV_VOL: 'saque devastador e voleios de alta cirurgia',
      BIG_SERVER: 'saque dominador como arma definitiva',
      RETRIEVER: 'defesa inabal—vel at— criar o ponto decisivo',
      TAKEALLRISK: 't—nis explosivo com risco m—ximo — e recompensa máxima',
      GRINDER: 'paciência infinita, consist—ncia letal',
      PWR_BASE: 'bolas planas de velocidade assassina',
      TACT_TEC: 'intelig—ncia t—tica como principal arma',
      NET_SPEC: 'dom—nio absoluto da rede',
      ADPT_TAC: 'leitura do jogo e adapta——o constante',
    };
    const d = styleDescs[champion.styleId];
    if (d) facts.push(`?? A f—rmula do t—tulo: ${d}.`);
  }

  // Partidas jogadas
  const champWins = rounds.reduce((acc, rnd) =>
    acc + rnd.filter(m => m.winner?.id === champion.id && !m.isBye).length, 0);
  if (champWins > 0) {
    facts.push(`?? ${champion.name.split(' ')[0]} venceu ${champWins} partidas nesta campanha — sem conceder derrota.`);
  }

  // Runner-up
  if (runner) {
    facts.push(`?? ${runner.name.split(' ')[0]} chegou longe — a final foi um duelo de estilos diferentes e alt—ssimo nível.`);
  }

  return facts.slice(0, 5);
}

// -----------------------------------------------------------------
// JOURNALIST REPORT — cobertura narrativa do torneio
// -----------------------------------------------------------------

function _jPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function _jFmtScore(setsDetail, winnerIsA) {
  if (!setsDetail?.length) return '';
  return setsDetail.map(([a, b]) => winnerIsA ? `${a}—${b}` : `${b}—${a}`).join(' ');
}

function _jTotalGames(setsDetail) {
  return (setsDetail ?? []).reduce((s, [a, b]) => s + a + b, 0);
}

function _jHasTiebreak(setsDetail) {
  return (setsDetail ?? []).some(([a, b]) => isTiebreakSetScore(a, b));
}

function _jRoundName(fromEnd) {
  if (fromEnd === 0) return 'Final';
  if (fromEnd === 1) return 'Semifinal';
  if (fromEnd === 2) return 'Quartas de Final';
  if (fromEnd === 3) return 'Oitavas';
  return `Rodada ${fromEnd + 1}`;
}

function _buildJournalistReport(tournament, bracket, state) {
  const rounds     = bracket?.rounds ?? [];
  const champion   = bracket?.champion;
  if (!champion || !rounds.length) return null;

  const totalRounds = rounds.length;
  const isGS       = tournament?.isSlam;
  const isMasters  = tournament?.isMasters;
  const year       = state?.year ?? '';
  const tourName   = tournament?.name ?? 'Torneio';
  const surface    = tournament?.surface ?? 'HARD';

  // -- Coleta todos os jogadores e partidas -------------------------
  const allPlayers = new Map();
  const allMatches = []; // { match, roundIdx, fromEnd }
  rounds.forEach((rnd, ri) => {
    const fromEnd = totalRounds - 1 - ri;
    rnd.forEach(m => {
      if (m.isBye) return;
      if (m.playerA) allPlayers.set(m.playerA.id, m.playerA);
      if (m.playerB) allPlayers.set(m.playerB.id, m.playerB);
      if (m.winner && m.playerA && m.playerB) {
        allMatches.push({ match: m, roundIdx: ri, fromEnd });
      }
    });
  });

  const champOvr = overallRating(champion.attrs ?? {});

  // -- Favorito (maior OVR no draw) ---------------------------------
  let favorite = null;
  let favoriteOvr = 0;
  for (const [, p] of allPlayers) {
    const o = overallRating(p.attrs ?? {});
    if (o > favoriteOvr) { favoriteOvr = o; favorite = p; }
  }
  const favIsChamp = favorite?.id === champion.id;

  // -- Quando o favorito caiu (se não ganhou) ------------------------
  let favEliminatedBy = null, favEliminatedRound = null;
  if (!favIsChamp && favorite) {
    for (const { match, fromEnd } of allMatches) {
      const loser = match.winner?.id === match.playerA?.id ? match.playerB : match.playerA;
      if (loser?.id === favorite.id) {
        favEliminatedBy = match.winner;
        favEliminatedRound = fromEnd;
        break;
      }
    }
  }

  // -- Caminho do campe—o --------------------------------------------
  const champPath = allMatches
    .filter(({ match }) => match.winner?.id === champion.id)
    .sort((a, b) => a.roundIdx - b.roundIdx)
    .map(({ match, fromEnd }) => {
      const opp    = match.playerA?.id === champion.id ? match.playerB : match.playerA;
      const isA    = match.playerA?.id === champion.id;
      const sd     = match.result?.setsDetail ?? [];
      const score  = _jFmtScore(sd, isA);
      const oppOvr = opp ? overallRating(opp.attrs ?? {}) : 0;
      const totalG = _jTotalGames(sd);
      const sets   = sd.length;
      const hasTB  = _jHasTiebreak(sd);
      return { opp, score, oppOvr, totalG, sets, hasTB, roundName: _jRoundName(fromEnd), fromEnd };
    });

  // -- Maior zebra ---------------------------------------------------
  let bigUpset = null, bigUpsetDiff = 0;
  for (const { match, fromEnd } of allMatches) {
    const w = match.winner;
    const l = match.playerA?.id === w?.id ? match.playerB : match.playerA;
    if (!w || !l) continue;
    const diff = overallRating(l.attrs ?? {}) - overallRating(w?.attrs ?? {});
    if (diff > bigUpsetDiff) {
      bigUpsetDiff = diff;
      const sd   = match.result?.setsDetail ?? [];
      const isA  = match.playerA?.id === w.id;
      bigUpset = { winner: w, loser: l, diff, score: _jFmtScore(sd, isA), roundName: _jRoundName(fromEnd) };
    }
  }

  // -- Partida mais —pica (mais games totais + tiebreaks) ------------
  let epicMatch = null, epicScore = 0;
  for (const { match, fromEnd } of allMatches) {
    const sd    = match.result?.setsDetail ?? [];
    const total = _jTotalGames(sd);
    const tbs   = sd.filter(([a, b]) => isTiebreakSetScore(a, b)).length;
    const score = total + tbs * 8 + (sd.length >= 3 ? 15 : 0);
    if (score > epicScore) {
      epicScore = score;
      const w   = match.winner;
      const l   = match.playerA?.id === w?.id ? match.playerB : match.playerA;
      const isA = match.playerA?.id === w?.id;
      epicMatch = { winner: w, loser: l, score: _jFmtScore(sd, isA), total, tbs, sets: sd.length, roundName: _jRoundName(fromEnd), sd };
    }
  }

  // -- Partida mais dominante (menor games do perdedor por set) ------
  let dominantMatch = null, dominantScore = 999;
  for (const { match, fromEnd } of allMatches) {
    const sd = match.result?.setsDetail ?? [];
    if (sd.length < 2) continue;
    const w   = match.winner;
    const l   = match.playerA?.id === w?.id ? match.playerB : match.playerA;
    const isA = match.playerA?.id === w?.id;
    const loserGames = sd.reduce((s, [a, b]) => s + (isA ? b : a), 0);
    if (loserGames < dominantScore) {
      dominantScore = loserGames;
      dominantMatch = { winner: w, loser: l, score: _jFmtScore(sd, isA), loserGames, roundName: _jRoundName(fromEnd) };
    }
  }

  // -- Prospect (mais jovem a chegar longe) -------------------------
  const U23_CUTOFF = 23;
  let prospect = null, prospectDeepness = -1;
  for (const { match, fromEnd } of allMatches) {
    // procura perdedores jovens que chegaram longe
    const w = match.winner;
    const l = match.playerA?.id === w?.id ? match.playerB : match.playerA;
    for (const p of [w, l]) {
      if (!p || p.id === champion.id) continue;
      const age = p.age ?? 99;
      if (age > U23_CUTOFF) continue;
      const depth = totalRounds - 1 - match.roundIdx; // quanto mais perto da final, maior
      // "fromEnd" menor = mais pr—ximo da final
      const deepness = (totalRounds - 1) - fromEnd + (w?.id === p.id ? 0.5 : 0);
      if (deepness > prospectDeepness) {
        prospectDeepness = deepness;
        const deepRound = w?.id === p.id
          ? allMatches.filter(({ match: m }) => m.winner?.id === p.id).length
          : null;
        prospect = {
          player: p,
          age,
          exitRound: w?.id === p.id ? null : _jRoundName(fromEnd),
          deepestRound: _jRoundName(fromEnd),
          wasWinner: w?.id === p.id,
        };
      }
    }
  }

  // -- Decep——o (top-3 OVR que saiu antes das semis) ----------------
  let disappointment = null;
  const topPlayers = [...allPlayers.values()]
    .filter(p => p.id !== champion.id)
    .sort((a, b) => overallRating(b.attrs ?? {}) - overallRating(a.attrs ?? {}))
    .slice(0, 4);

  for (const p of topPlayers) {
    const exitInfo = allMatches.find(({ match, fromEnd }) => {
      const l = match.playerA?.id === match.winner?.id ? match.playerB : match.playerA;
      return l?.id === p.id && fromEnd >= 2; // saiu antes das semis
    });
    if (exitInfo) {
      const elimBy = exitInfo.match.winner;
      disappointment = { player: p, ovr: overallRating(p.attrs ?? {}), eliminatedBy: elimBy, round: _jRoundName(exitInfo.fromEnd) };
      break;
    }
  }

  return {
    champion, champOvr, champPath,
    favorite, favoriteOvr, favIsChamp, favEliminatedBy, favEliminatedRound,
    bigUpset, bigUpsetDiff,
    epicMatch, dominantMatch,
    prospect,
    disappointment,
    tourName, isGS, isMasters, year, surface,
  };
}

function _JournalistReport({ report, sc }) {
  const T = {
    disp: "'Barlow Condensed',sans-serif",
    mono: "'Space Mono',monospace",
    serif: "'Crimson Pro',Georgia,serif",
  };

  if (!report) return (
    <div style={{ padding: '40px 32px', color: 'rgba(255,255,255,.3)', fontFamily: T.serif, fontSize: 16, textAlign: 'center' }}>
      Dados insuficientes para gerar a cobertura.
    </div>
  );

  const {
    champion, champOvr, champPath,
    favorite, favoriteOvr, favIsChamp, favEliminatedBy, favEliminatedRound,
    bigUpset, bigUpsetDiff,
    epicMatch, dominantMatch,
    prospect, disappointment,
    tourName, isGS, isMasters, year,
  } = report;

  const fn  = n => n?.split(' ').pop() ?? n ?? '—'; // sobrenome
  const ffn = n => n ?? '—'; // nome completo

  // -- Bloco de se——o do jornalista ---------------------------------
  function Section({ icon, title, delay = 0, children }) {
    return (
      <div style={{
        marginBottom: 28,
        animation: `_cer_rise .45s ease ${delay}s backwards`,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
          borderBottom: `1px solid ${sc}22`, paddingBottom: 8,
        }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <span style={{
            fontFamily: T.mono, fontSize: 8, letterSpacing: '.4em',
            color: sc, textTransform: 'uppercase',
          }}>{title}</span>
        </div>
        <div style={{
          fontFamily: T.serif, fontSize: 15.5, lineHeight: 1.82,
          color: 'rgba(242,237,228,.82)',
        }}>
          {children}
        </div>
      </div>
    );
  }

  // -- Helpers de texto ---------------------------------------------
  function P({ children, style }) {
    return <p style={{ margin: '0 0 10px 0', ...style }}>{children}</p>;
  }

  function Highlight({ children }) {
    return <strong style={{ color: '#fff', fontWeight: 700 }}>{children}</strong>;
  }

  function Score({ children }) {
    return <span style={{
      fontFamily: T.mono, fontSize: 11, color: sc,
      background: `${sc}14`, padding: '1px 7px',
      border: `1px solid ${sc}33`,
      margin: '0 3px',
    }}>{children}</span>;
  }

  // -- Abertura -----------------------------------------------------
  const openings = isGS ? [
    `${tourName} de ${year} entrou para a história com ${ffn(champion.name)} erguendo o trof—u. Mas o que aconteceu nos dez dias anteriores merece ser contado al—m do placar.`,
    `Quando a poeira baixou em ${tourName}, o nome gravado no trof—u era o de ${ffn(champion.name)}. A jornada para chegar l— foi tudo menos simples.`,
    `${tourName} ${year}. O Grand Slam terminou. ${ffn(champion.name)} — campe—o. Esta — a história de como chegamos aqui.`,
  ] : [
    `${tourName} chegou ao fim. ${ffn(champion.name)} — o campe—o. Mas o torneio guardou muito mais do que o nome no trof—u.`,
    `A semana em ${tourName} acabou do jeito certo para ${ffn(champion.name)}. O caminho at— o t—tulo, por—m, não foi passeio.`,
    `${tourName} de ${year} terminou. Aqui est— o que aconteceu — do primeiro ponto at— o trof—u nas m—os de ${ffn(champion.name)}.`,
  ];

  // -- Caminho do campe—o --------------------------------------------
  let champPathText = null;
  if (champPath.length > 0) {
    const hardest = champPath.reduce((best, r) =>
      (r.totalG + r.sets * 5) > (best.totalG + best.sets * 5) ? r : best, champPath[0]);
    const easiest = champPath.reduce((best, r) =>
      (r.totalG) < (best.totalG) ? r : best, champPath[0]);

    const intro = _jPick([
      `${fn(champion.name)} precisou vencer ${champPath.length} partidas para chegar ao t—tulo.`,
      `A campanha de ${fn(champion.name)} durou ${champPath.length} partidas — cada uma com sua pr—pria história.`,
      `Do ${champPath[0]?.roundName ?? 'in—cio'} — Final, ${fn(champion.name)} não perdeu uma partida sequer.`,
    ]);

    const hardestLine = hardest ? _jPick([
      ` O teste mais duro veio na ${hardest.roundName}, contra ${ffn(hardest.opp?.name)} — ${hardest.sets} sets e ${hardest.totalG} games${hardest.hasTB ? ', com tiebreak' : ''}.`,
      ` ${hardest.roundName} foi o ponto de maior atrito: ${ffn(hardest.opp?.name)} levou ${fn(champion.name)} ao limite em ${hardest.sets} sets.`,
    ]) : '';

    const easiestLine = easiest && easiest !== hardest ? _jPick([
      ` Na ${easiest.roundName}, contra ${ffn(easiest.opp?.name)}, a mensagem foi clara: ${easiest.score}.`,
      ` O momento mais claro de dom—nio foi na ${easiest.roundName} — ${fn(champion.name)} despachou ${ffn(easiest.opp?.name)} por ${easiest.score} sem cerim—nia.`,
    ]) : '';

    champPathText = intro + hardestLine + easiestLine;
  }

  // -- Favorito -----------------------------------------------------
  let favText = null;
  if (favIsChamp) {
    favText = _jPick([
      `${ffn(champion.name)} entrou em ${tourName} como o favorito (${ovrTier(champOvr).grade}) e confirmou o que o ranking j— dizia. Nem sempre o favoritismo encontra essa correspond—ncia — desta vez encontrou.`,
      `O favorito venceu. ${ffn(champion.name)}, ${ovrTier(champOvr).grade}, fez exatamente o que se esperava. Em t—nis isso — mais raro do que parece — e merece ser reconhecido.`,
      `Quando o favorito ganha, fica f—cil dizer que era previs—vel. Mas ${ffn(champion.name)} não apenas ganhou — dominou o torneio de ponta a ponta como seu nível ${ovrTier(champOvr).grade} prometia.`,
    ]);
  } else if (favorite && favEliminatedBy) {
    const roundName = favEliminatedRound != null ? _jRoundName(favEliminatedRound) : 'cedo';
    favText = _jPick([
      `${ffn(favorite.name)} chegou a ${tourName} como o favorito do draw (${ovrTier(favoriteOvr).grade}). N—o chegou ao trof—u. Foi eliminado na ${roundName} por ${ffn(favEliminatedBy?.name)} — uma das viradas mais comentadas do torneio.`,
      `O drama da semana não foi s— na Final. ${ffn(favorite.name)}, favorito de nível ${ovrTier(favoriteOvr).grade}, não passou da ${roundName}. ${ffn(favEliminatedBy?.name)} encerrou a campanha antes que ela se tornasse o que todos esperavam.`,
      `Favorito vencedor — not—cia; favorito eliminado — história. ${ffn(favorite.name)} (${ovrTier(favoriteOvr).grade}) saiu na ${roundName}, abatido por ${ffn(favEliminatedBy?.name)}. O torneio ficou em aberto a partir da—.`,
    ]);
  }

  // -- Zebra ---------------------------------------------------------
  let zebraText = null;
  if (bigUpset && bigUpsetDiff >= 3) {
    const { winner, loser, diff, score, roundName } = bigUpset;
    const wOvr = overallRating(winner.attrs ?? {});
    const lOvr = overallRating(loser.attrs ?? {});
    zebraText = _jPick([
      `A zebra do torneio foi ${ffn(winner.name)} derrubando ${ffn(loser.name)} na ${roundName}. Uma diferen—a de ${Math.round(diff)} pontos de OVR (${wOvr} vs ${lOvr}) no papel — e nada disso na quadra. Placar: ${score}.`,
      `Se voc— apostou em ${ffn(loser.name)} na ${roundName}, foi uma aposta que parecia segura. ${ffn(winner.name)} discordou: ${score}. A diferen—a de OVR era de ${Math.round(diff)} pontos — tudo ignorado em quadra.`,
      `${ffn(winner.name)} não devia vencer ${ffn(loser.name)} na ${roundName}. ${ovrTier(wOvr).grade} contra ${ovrTier(lOvr).grade}. Mas o t—nis não l— relat—rios de scout. ${score}.`,
    ]);
  }

  // -- Partida —pica ------------------------------------------------
  let epicText = null;
  if (epicMatch) {
    const { winner, loser, score, total, tbs, sets, roundName } = epicMatch;
    const tbLine = tbs > 0 ? ` com ${tbs === 1 ? 'um tiebreak' : `${tbs} tiebreaks`}` : '';
    epicText = _jPick([
      `A partida que o p—blico não vai esquecer foi ${ffn(winner?.name)} vs ${ffn(loser?.name)} na ${roundName}: ${sets} sets${tbLine}, ${total} games no total. Placar final: ${score}. O tipo de confronto que define torneios.`,
      `${roundName}: ${ffn(winner?.name)} e ${ffn(loser?.name)} passaram ${total} games se destruindo${tbLine}. ${score}. Quando acabou, os dois sa—ram sabendo que tinham participado de algo especial.`,
      `O melhor t—nis da semana aconteceu na ${roundName}. ${ffn(winner?.name)} e ${ffn(loser?.name)}, ${sets} sets${tbLine}. ${total} games de alt—ssimo nível. O placar diz ${score} — mas o placar não conta metade da história.`,
    ]);
  }

  // -- Partida dominante --------------------------------------------
  let dominantText = null;
  if (dominantMatch && dominantMatch.loserGames <= 4 && dominantMatch.winner?.id !== epicMatch?.winner?.id) {
    const { winner, loser, score, loserGames, roundName } = dominantMatch;
    dominantText = _jPick([
      `O aviso mais claro do torneio veio de ${ffn(winner?.name)}: ${score} sobre ${ffn(loser?.name)} na ${roundName}. S— ${loserGames} games cedidos. Uma li——o.`,
      `${ffn(winner?.name)} não quis perder tempo na ${roundName}. ${score} contra ${ffn(loser?.name)}. ${loserGames === 0 ? 'Nenhum game cedido' : `Apenas ${loserGames} games para o adversário`}. Dominância raramente vista neste nível.`,
    ]);
  }

  // -- Prospect -----------------------------------------------------
  let prospectText = null;
  if (prospect?.player && prospect.player.id !== champion.id) {
    const p = prospect.player;
    const pStyle = PLAY_STYLES[p.styleId];
    prospectText = _jPick([
      `Entre os jovens do draw, ${ffn(p.name)} (${p.age} anos) foi o nome que ficou. Chegou at— a ${prospect.deepestRound} — o suficiente para mostrar que esse nome vai aparecer muito mais vezes nos pr—ximos anos.`,
      `${p.age} anos, ${pStyle ? pStyle.label : 'estilo definido'}. ${ffn(p.name)} não veio para ser figurante — chegou at— a ${prospect.deepestRound} e deixou a pergunta no ar: quanto falta para ele estar brigando pelo trof—u?`,
      `A promessa do torneio tinha nome: ${ffn(p.name)}, ${p.age} anos. A ${prospect.deepestRound} foi seu teto desta vez. Mas o que mostrou não foi de algu—m que veio aprender — foi de algu—m que veio competir.`,
    ]);
  }

  // -- Decep——o ------------------------------------------------------
  let disappointmentText = null;
  if (disappointment && disappointment.player.id !== champion.id && (!favorite || disappointment.player.id !== favorite.id)) {
    const p = disappointment.player;
    disappointmentText = _jPick([
      `A decep——o do torneio teve rosto: ${ffn(p.name)} (${ovrTier(disappointment.ovr).grade}), esperado para chegar longe, caiu ainda nas ${disappointment.round} para ${ffn(disappointment.eliminatedBy?.name)}. O t—nis raramente respeita reputa——es.`,
      `${ffn(p.name)} entrou em ${tourName} de nível ${ovrTier(disappointment.ovr).grade} e saiu antes do esperado, eliminado nas ${disappointment.round} por ${ffn(disappointment.eliminatedBy?.name)}. Uma campanha para esquecer depressa.`,
    ]);
  }

  // -- Encerramento -------------------------------------------------
  const closings = [
    `${tourName} ${year} acabou. O trof—u ficou com ${ffn(champion.name)}. As histórias ficam com todos.`,
    `Fim de ${tourName}. Pr—xima parada no calend—rio. Mas ${fn(champion.name)} sai daqui diferente — com um t—tulo que não se apaga.`,
    `O circuito segue. Mas antes de mudar de p—gina, vale guardar o que aconteceu aqui: ${ffn(champion.name)}, campe—o de ${tourName} ${year}.`,
  ];

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px 32px' }}>

      {/* Byline */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22,
        paddingBottom: 14, borderBottom: `1px solid ${sc}22`,
        animation: '_cer_rise .35s ease backwards',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: `${sc}22`, border: `1px solid ${sc}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
        }}>??</div>
        <div>
          <div style={{ fontFamily: T.mono, fontSize: 9, color: 'rgba(255,255,255,.7)', letterSpacing: '.2em' }}>
            COBERTURA ESPECIAL
          </div>
          <div style={{ fontFamily: T.mono, fontSize: 7, color: 'rgba(255,255,255,.3)', letterSpacing: '.3em', marginTop: 3 }}>
            {tourName.toUpperCase()} — {year} — RELAT—RIO COMPLETO
          </div>
        </div>
      </div>

      {/* Abertura */}
      <div style={{
        fontFamily: T.serif, fontSize: 17, lineHeight: 1.85,
        color: 'rgba(242,237,228,.9)', marginBottom: 28,
        animation: '_cer_rise .4s ease .05s backwards',
      }}>
        <P>{_jPick(openings)}</P>
      </div>

      {/* Se——es */}
      {champPathText && (
        <Section icon="???" title="O Caminho do Campeão" delay={0.1}>
          <P>{champPathText}</P>
          {/* linha por rodada */}
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {champPath.map((r, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 10px',
                background: r.fromEnd === 0 ? `${sc}12` : 'rgba(255,255,255,.025)',
                border: `1px solid ${r.fromEnd === 0 ? sc + '44' : 'rgba(255,255,255,.06)'}`,
                borderLeft: `3px solid ${r.fromEnd === 0 ? sc : 'rgba(255,255,255,.12)'}`,
              }}>
                <span style={{ fontFamily: T.mono, fontSize: 7, color: 'rgba(255,255,255,.3)', letterSpacing: '.2em', minWidth: 90, textTransform: 'uppercase' }}>{r.roundName}</span>
                <span style={{ fontFamily: T.disp, fontSize: 14, color: 'rgba(255,255,255,.8)', fontWeight: 700, textTransform: 'uppercase', flex: 1 }}>
                  {r.opp?.name ?? '—'}
                </span>
                {r.score && (
                  <Score>{r.score}</Score>
                )}
                {r.hasTB && <span style={{ fontSize: 10 }}>?</span>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {favText && (
        <Section icon={favIsChamp ? '??' : '??'} title={favIsChamp ? 'O Favorito Confirmado' : 'A Queda do Favorito'} delay={0.18}>
          <P>{favText}</P>
        </Section>
      )}

      {zebraText && (
        <Section icon="??" title="A Grande Zebra" delay={0.24}>
          <P>{zebraText}</P>
        </Section>
      )}

      {epicText && (
        <Section icon="??" title="A Partida da Semana" delay={0.3}>
          <P>{epicText}</P>
        </Section>
      )}

      {dominantText && (
        <Section icon="??" title="Demoli——o" delay={0.35}>
          <P>{dominantText}</P>
        </Section>
      )}

      {prospectText && (
        <Section icon="??" title="A Promessa" delay={0.38}>
          <P>{prospectText}</P>
        </Section>
      )}

      {disappointmentText && (
        <Section icon="??" title="A Decep——o" delay={0.42}>
          <P>{disappointmentText}</P>
        </Section>
      )}

      {/* Closing */}
      <div style={{
        marginTop: 8,
        padding: '16px 20px',
        background: `${sc}0a`,
        border: `1px solid ${sc}22`,
        borderLeft: `3px solid ${sc}`,
        fontFamily: T.serif, fontSize: 15, lineHeight: 1.75,
        color: `${sc}cc`, fontStyle: 'italic',
        animation: '_cer_rise .45s ease .48s backwards',
      }}>
        {_jPick(closings)}
      </div>
    </div>
  );
}

function CircuitShiftEdition({ shift, onDismiss, onOpenNext }) {
  if (!shift) return null;
  const accent = shift.tournamentSurface === 'CLAY' ? '#D76A3D'
    : shift.tournamentSurface === 'GRASS' ? '#58C98A'
    : shift.tournamentSurface === 'INDOOR' ? '#B18CFF' : '#66C7FF';
  const dominantLabel = {
    STATUS_ASCENT: 'MUDANÇA DE STATUS', UPSET: 'O FATO DA SEMANA', RIVALRY: 'TENSÃO QUE FICA',
  }[shift.dominantStory] ?? 'EDIÇÃO ESPECIAL';
  return (
    <div style={{ position:'fixed', inset:0, zIndex:10020, overflowY:'auto', background:'#050709', color:'#F2EDE4', fontFamily:"'Barlow',sans-serif" }}>
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', background:`radial-gradient(circle at 82% 8%, ${accent}24, transparent 30%), radial-gradient(circle at 12% 88%, #E8C84A12, transparent 32%)` }} />
      <div style={{ position:'relative', width:'min(1180px, 94vw)', margin:'0 auto', padding:'clamp(34px,6vw,82px) 0 52px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:18, paddingBottom:16, borderBottom:'1px solid rgba(255,255,255,.11)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'#FF5A5A', boxShadow:'0 0 16px #FF5A5A', animation:'_cer_glow 1.4s ease infinite' }} />
            <span style={{ fontFamily:"'Space Mono',monospace", fontSize:9, letterSpacing:'.3em', color:'rgba(242,237,228,.6)' }}>EDIÇÃO ESPECIAL · PÓS-TORNEIO</span>
          </div>
          <button onClick={onDismiss} style={{ border:'1px solid rgba(255,255,255,.14)', background:'rgba(255,255,255,.04)', color:'rgba(255,255,255,.62)', padding:'9px 12px', fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.16em', cursor:'pointer' }}>PULAR EDIÇÃO</button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1.5fr) minmax(300px,.65fr)', gap:28, padding:'clamp(32px,5vw,62px) 0 30px' }}>
          <section>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:9, color:accent, letterSpacing:'.28em', marginBottom:16 }}>{dominantLabel} · {shift.tournamentName?.toUpperCase()}</div>
            <h1 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'clamp(54px,8vw,116px)', lineHeight:.83, letterSpacing:'.025em', margin:0, textTransform:'uppercase', maxWidth:820 }}>{shift.headline}</h1>
            <p style={{ maxWidth:720, margin:'26px 0 0', fontSize:'clamp(17px,2vw,23px)', lineHeight:1.5, color:'rgba(242,237,228,.65)' }}>{shift.deck}</p>
            <div style={{ marginTop:32, padding:'18px 20px', borderLeft:`3px solid ${accent}`, background:`linear-gradient(90deg, ${accent}18, transparent)`, fontFamily:"'Barlow Condensed',sans-serif", fontSize:22, letterSpacing:'.02em', color:'#fff' }}>
              {shift.champion?.name} é o campeão da semana. O que muda é o tamanho do alvo.
            </div>
          </section>
          <aside style={{ alignSelf:'start', border:'1px solid rgba(255,255,255,.1)', background:'linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.012))', padding:22 }}>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.25em', color:'rgba(255,255,255,.36)', marginBottom:18 }}>O CAMPEÃO SAI ASSIM</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:40, lineHeight:.9, textTransform:'uppercase', color:'#E8C84A' }}>{shift.champion?.name}</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:9, marginTop:18 }}>
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:52, color:'#fff' }}>#{shift.champion?.rank ?? '—'}</span>
              <span style={{ fontFamily:"'Space Mono',monospace", fontSize:8, color:'rgba(255,255,255,.38)', letterSpacing:'.18em' }}>RANKING ATUAL</span>
            </div>
            <div style={{ marginTop:20, paddingTop:14, borderTop:'1px solid rgba(255,255,255,.08)', fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.16em', color:accent }}>{shift.tournamentCategory?.replace(/_/g, ' ')}</div>
          </aside>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))', gap:12, marginTop:8 }}>
          {(shift.shifts ?? []).map((item, index) => (
            <div key={`${item.type}-${item.playerId}-${index}`} style={{ minHeight:170, padding:'18px 18px 20px', border:'1px solid rgba(255,255,255,.09)', borderTop:`3px solid ${item.accent}`, background:'rgba(255,255,255,.025)', animation:`_cer_rise .45s ease ${index * .08}s backwards` }}>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, color:item.accent, letterSpacing:'.22em', textTransform:'uppercase' }}>{item.label}</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:25, color:'#fff', letterSpacing:'.03em', textTransform:'uppercase', margin:'15px 0 8px' }}>{item.playerName}</div>
              <div style={{ fontSize:14, lineHeight:1.55, color:'rgba(242,237,228,.62)' }}>{item.text}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop:28, padding:'24px clamp(18px,3vw,34px)', border:`1px solid ${accent}55`, background:`linear-gradient(100deg, ${accent}1c, rgba(255,255,255,.025))`, display:'grid', gridTemplateColumns:'minmax(0,1fr) auto', gap:22, alignItems:'center' }}>
          <div>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, color:accent, letterSpacing:'.3em', marginBottom:10 }}>PRÓXIMO CAPÍTULO · {shift.nextHook?.tournamentName?.toUpperCase() ?? 'CALENDÁRIO'}</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'clamp(23px,3vw,36px)', color:'#fff', lineHeight:1.05, textTransform:'uppercase' }}>{shift.nextHook?.text}</div>
          </div>
          <div style={{ display:'flex', gap:9, flexWrap:'wrap' }}>
            <button onClick={onDismiss} style={{ fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.16em', padding:'13px 15px', border:'1px solid rgba(255,255,255,.16)', color:'rgba(255,255,255,.74)', background:'transparent', cursor:'pointer' }}>VOLTAR À CENTRAL</button>
            <button onClick={onOpenNext} style={{ fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.16em', padding:'13px 15px', border:`1px solid ${accent}`, color:'#071014', background:accent, cursor:'pointer', fontWeight:700 }}>VER O PRÓXIMO CAPÍTULO</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TournamentTurningPointsPage({ bracket, champion, runner, getDisplayRank, accent }) {
  const matches = React.useMemo(() => (bracket?.rounds ?? []).flatMap((round, roundIndex) => round
    .filter(match => match?.winner && !match?.isBye)
    .map(match => ({ ...match, roundIndex, fromEnd:(bracket?.rounds?.length ?? 1) - 1 - roundIndex }))), [bracket]);
  const roundLabel = (fromEnd) => fromEnd === 0 ? 'Final' : fromEnd === 1 ? 'Semifinal' : fromEnd === 2 ? 'Quartas' : fromEnd === 3 ? 'Oitavas' : 'Rodadas iniciais';
  const resolveLoser = (match) => match.playerA?.id === match.winner?.id ? match.playerB : match.playerA;
  const surprises = matches.map(match => {
    const loser = resolveLoser(match);
    const winnerRank = getDisplayRank(match.winner) ?? match.winner?.rankPosition ?? 999;
    const loserRank = getDisplayRank(loser) ?? loser?.rankPosition ?? 999;
    const ovrSwing = overallRating(loser?.attrs ?? {}) - overallRating(match.winner?.attrs ?? {});
    return { match, winner:match.winner, loser, score:(winnerRank - loserRank) + Math.max(0, ovrSwing) * .7 + (match.fromEnd * .6), rankGap:winnerRank - loserRank };
  }).filter(item => item.winner && item.loser).sort((a,b) => b.score - a.score);
  const surprise = surprises[0] ?? null;
  const disappointments = matches.map(match => {
    const loser = resolveLoser(match);
    const winnerRank = getDisplayRank(match.winner) ?? match.winner?.rankPosition ?? 999;
    const loserRank = getDisplayRank(loser) ?? loser?.rankPosition ?? 999;
    const expectation = Math.max(0, loserRank <= winnerRank ? winnerRank - loserRank : 0) + Math.max(0, overallRating(loser?.attrs ?? {}) - overallRating(match.winner?.attrs ?? {})) * .55;
    return { match, winner:match.winner, loser, score:expectation + match.fromEnd * .45 };
  }).filter(item => item.loser && item.loser.id !== champion?.id).sort((a,b) => b.score - a.score);
  const disappointment = disappointments[0] ?? null;
  const campaign = (player) => matches.filter(match => match.winner?.id === player?.id).sort((a,b) => a.roundIndex - b.roundIndex);
  const campaignLine = (player) => campaign(player).map(match => {
    const opponent = match.playerA?.id === player?.id ? match.playerB : match.playerA;
    const isA = match.playerA?.id === player?.id;
    const score = (match.result?.setsDetail ?? []).map(([a,b]) => `${isA ? a : b}-${isA ? b : a}`).join(' ') || 'W/O';
    return { label:roundLabel(match.fromEnd), opponent, score };
  });
  const StoryCard = ({ type, item, fallback, color }) => {
    const player = item?.winner ?? fallback;
    const isFallback = !item;
    const run = campaignLine(player);
    const headline = type === 'surpresa'
      ? isFallback ? `${player?.name ?? 'O campeão'} confirmou o favoritismo.` : `${player?.name} virou a leitura do torneio.`
      : isFallback ? `${runner?.name ?? 'A finalista'} foi a campanha que mais ficou curta.` : `${item.loser?.name} saiu antes do roteiro esperado.`;
    const copy = type === 'surpresa'
      ? isFallback ? 'Sem zebra estatística grande: o campeão foi quem sustentou a pressão até o troféu.' : `${player?.name} derrubou ${item.loser?.name} em ${roundLabel(item.match.fromEnd).toLowerCase()} e abriu uma das páginas mais improváveis da semana.`
      : isFallback ? 'A final é onde a ambição de quase todo torneio encontra seu limite.' : `${item.loser?.name} caiu diante de ${item.winner?.name}; uma saída que reposiciona expectativa, ranking e o próximo torneio.`;
    return <article style={{ padding:'20px 20px 18px', border:'1px solid rgba(79,59,35,.22)', borderTop:`5px solid ${color}`, background:'rgba(255,255,255,.28)', minHeight:360 }}><div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.22em', textTransform:'uppercase', color:'#6D5B43' }}>{type}</div><div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'clamp(28px,3vw,40px)', fontWeight:900, textTransform:'uppercase', lineHeight:.94, marginTop:14 }}>{headline}</div><div style={{ fontFamily:"'Crimson Pro',Georgia,serif", fontSize:16, lineHeight:1.56, marginTop:13 }}>{copy}</div><div style={{ marginTop:18, paddingTop:12, borderTop:'1px solid rgba(79,59,35,.16)' }}><div style={{ fontFamily:"'Space Mono',monospace", fontSize:7, letterSpacing:'.18em', textTransform:'uppercase', color:'#6D5B43', marginBottom:8 }}>campanha que explica</div>{run.length ? <div style={{ display:'grid', gap:5 }}>{run.map((step, index) => <div key={`${step.label}-${index}`} style={{ display:'grid', gridTemplateColumns:'90px 1fr auto', gap:9, alignItems:'center', padding:'7px 8px', background:'rgba(255,255,255,.22)', borderLeft:`2px solid ${color}` }}><span style={{ fontFamily:"'Space Mono',monospace", fontSize:7, color:'#6D5B43', textTransform:'uppercase' }}>{step.label}</span><span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:17, fontWeight:800, textTransform:'uppercase' }}>{step.opponent?.name ?? '—'}</span><span style={{ fontFamily:"'Space Mono',monospace", fontSize:8 }}>{step.score}</span></div>)}</div> : <div style={{ fontFamily:"'Crimson Pro',Georgia,serif", fontSize:15 }}>A história se decidiu em uma única partida que mudou o peso da semana.</div>}</div></article>;
  };
  return <div style={{ flex:1, overflowY:'auto', padding:'28px 28px 34px', background:`radial-gradient(circle at 84% 4%, ${accent}20, transparent 27%), linear-gradient(180deg, rgba(255,255,255,.18), transparent 45%)` }}><div style={{ maxWidth:850, marginBottom:24 }}><div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.28em', textTransform:'uppercase', color:'#6D5B43', marginBottom:10 }}>o lado que o troféu não conta</div><h2 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'clamp(35px,5vw,60px)', fontWeight:900, lineHeight:.88, textTransform:'uppercase', margin:0 }}>Quem mudou a lógica da semana.</h2><p style={{ fontFamily:"'Crimson Pro',Georgia,serif", fontSize:18, lineHeight:1.55, margin:'14px 0 0' }}>Todo torneio deixa duas marcas: quem excedeu o próprio tamanho e quem saiu antes de transformar expectativa em campanha.</p></div><div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:14 }}><StoryCard type="surpresa" item={surprise?.score > .5 ? surprise : null} fallback={champion} color={accent} /><StoryCard type="decepção" item={disappointment?.score > .5 ? disappointment : null} fallback={runner} color="#B05D4C" /></div></div>;
}

function TournamentCircuitTab({ shift, accent }) {
  if (!shift) return null;
  const storyLabel = {
    STATUS_ASCENT: 'mudança de status',
    UPSET: 'o fato da semana',
    RIVALRY: 'tensão que fica',
  }[shift.dominantStory] ?? 'edição especial';
  return (
    <div style={{ flex:1, overflowY:'auto', padding:'26px 28px 32px', background:`radial-gradient(circle at 85% 3%, ${accent}20, transparent 30%), linear-gradient(180deg, rgba(255,255,255,.18), transparent 40%)` }}>
      <div style={{ borderBottom:`2px solid ${accent}`, paddingBottom:20, marginBottom:20 }}>
        <div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.32em', textTransform:'uppercase', color:'#6D5B43', marginBottom:12 }}>arquivo do circuito · pós-torneio</div>
        <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(230px,.38fr)', gap:24, alignItems:'end' }}>
          <div>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.22em', textTransform:'uppercase', color:'#6D5B43', marginBottom:9 }}>{storyLabel} · {shift.tournamentName}</div>
            <h2 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'clamp(34px,5vw,64px)', lineHeight:.9, letterSpacing:'.015em', textTransform:'uppercase', margin:0 }}>{shift.headline}</h2>
            <p style={{ fontFamily:"'Crimson Pro',Georgia,serif", fontSize:18, lineHeight:1.55, maxWidth:760, margin:'16px 0 0' }}>{shift.deck}</p>
          </div>
          <div style={{ border:`1px solid ${accent}66`, borderTop:`4px solid ${accent}`, background:'rgba(255,255,255,.28)', padding:'15px 16px' }}>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:7, letterSpacing:'.2em', textTransform:'uppercase', color:'#6D5B43' }}>campeão após a semana</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:29, fontWeight:900, lineHeight:1, textTransform:'uppercase', marginTop:11 }}>{shift.champion?.name ?? 'campeão'}</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:8, marginTop:14 }}>
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:46, fontWeight:900, lineHeight:.8 }}>#{shift.champion?.rank ?? '—'}</span>
              <span style={{ fontFamily:"'Space Mono',monospace", fontSize:7, letterSpacing:'.15em', textTransform:'uppercase', color:'#6D5B43' }}>ranking atual</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.24em', textTransform:'uppercase', color:'#6D5B43', marginBottom:10 }}>o que mudou nesta semana</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))', gap:11 }}>
        {(shift.shifts ?? []).map((item, index) => (
          <article key={`${item.type}-${item.playerId}-${index}`} style={{ minHeight:164, padding:'17px 18px 19px', border:'1px solid rgba(79,59,35,.22)', borderTop:`4px solid ${item.accent ?? accent}`, background:'rgba(255,255,255,.22)' }}>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:7, letterSpacing:'.2em', textTransform:'uppercase', color:'#6D5B43' }}>{item.label}</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:25, fontWeight:900, lineHeight:1, letterSpacing:'.02em', textTransform:'uppercase', margin:'14px 0 8px' }}>{item.playerName}</div>
            <div style={{ fontFamily:"'Crimson Pro',Georgia,serif", fontSize:15, lineHeight:1.55 }}>{item.text}</div>
          </article>
        ))}
      </div>

      <div style={{ marginTop:22, padding:'18px 20px', borderLeft:`4px solid ${accent}`, borderTop:'1px solid rgba(79,59,35,.2)', borderRight:'1px solid rgba(79,59,35,.2)', borderBottom:'1px solid rgba(79,59,35,.2)', background:`linear-gradient(90deg, ${accent}1A, rgba(255,255,255,.16))` }}>
        <div style={{ fontFamily:"'Space Mono',monospace", fontSize:7, letterSpacing:'.22em', textTransform:'uppercase', color:'#6D5B43', marginBottom:8 }}>próximo capítulo · {shift.nextHook?.tournamentName ?? 'calendário'}</div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:25, fontWeight:800, lineHeight:1.05, textTransform:'uppercase' }}>{shift.nextHook?.text ?? 'O circuito segue para o próximo torneio.'}</div>
      </div>
    </div>
  );
}

function TournamentCeremony({ tournament, bracket, wrapData: wrapDataProp = null, state, circuitShift = null, onClose }) {
  _cerInjectCSS();
  const [page, setPage] = React.useState(0);
  const [expandedId, setExpandedId] = React.useState(null);

  const sc = _cerSurface(tournament?.courtKey ?? tournament?.surface ?? 'US_OPEN');

  const champion = bracket?.champion ?? null;
  const rounds = bracket?.rounds ?? [];
  const finalRound = rounds[rounds.length - 1] ?? [];
  const finalMatch = finalRound.find(m => m.winner && !m.isBye) ?? null;
  const runner = finalMatch
    ? (finalMatch.playerA?.id === champion?.id ? finalMatch.playerB : finalMatch.playerA)
    : null;
  const sd = finalMatch?.result?.setsDetail ?? [];
  const champIsA = finalMatch?.winner?.id === finalMatch?.playerA?.id;

  const styleChamp = PLAY_STYLES[champion?.styleId];
  const styleRunner = PLAY_STYLES[runner?.styleId];
  const champOvr = champion ? overallRating(champion.attrs ?? {}) : 0;
  const runnerOvr = runner ? overallRating(runner.attrs ?? {}) : 0;
  const officialRankById = React.useMemo(() => {
    const map = new Map();
    for (const row of state?.rankingStore?.ranked ?? []) {
      if (row?.playerId && Number.isFinite(row.position)) map.set(row.playerId, row.position);
    }
    for (const row of state?.rankingStore?.prospectRanked ?? []) {
      if (row?.playerId && Number.isFinite(row.position)) map.set(row.playerId, row.position);
    }
    for (const player of [...(state?.tourPlayers ?? []), ...(state?.prospects ?? [])]) {
      if (player?.id && !map.has(player.id) && Number.isFinite(player.rankPosition)) {
        map.set(player.id, player.rankPosition);
      }
    }
    return map;
  }, [state?.rankingStore, state?.tourPlayers, state?.prospects]);
  const getDisplayRank = React.useCallback((player) => {
    if (!player?.id) return null;
    const official = officialRankById.get(player.id);
    if (Number.isFinite(official)) return official;
    return Number.isFinite(player.rankPosition) ? player.rankPosition : null;
  }, [officialRankById]);
  const PAGES = [
    { id:'recap', label:'Capa e troféu', kicker:'a edição do campeão' },
    { id:'turning', label:'O ponto de virada', kicker:'surpresa e decepção' },
    { id:'stats', label:'Os números', kicker:'estatísticas que chamam atenção' },
    { id:'draw', label:'As campanhas', kicker:'os caminhos do torneio' },
    ...(circuitShift ? [{ id:'circuit', label:'A consequência', kicker:'rota do circuito' }] : []),
    { id:'press', label:'A redação', kicker:'o arquivo da semana' },
  ];
  const tab = PAGES[page]?.id ?? 'recap';
  const currentPage = PAGES[page] ?? PAGES[0];
  const freshChampion = React.useMemo(() => {
    if (!champion?.id) return champion;
    return [
      ...(state?.tourPlayers ?? []),
      ...(state?.prospects ?? []),
      ...(state?.retiredPlayers ?? []),
    ].find(p => p?.id === champion.id) ?? champion;
  }, [champion?.id, state?.tourPlayers, state?.prospects, state?.retiredPlayers]);

  const instantTitleSnapshot = React.useMemo(() => {
    const baseCt = freshChampion?.careerTitles ?? champion?.careerTitles ?? {};
    const baseSurface = freshChampion?.surfaceStats ?? champion?.surfaceStats ?? {};
    const categoryToKey = (category) => {
      if (category === 'GRAND_SLAM') return 'gs';
      if (category === 'SLAM_CLASH') return 'slamClash';
      if (category === 'MASTERS_1000') return 'masters';
      if (category === 'FINALS' || category === 'PROSPECTS_FINALS') return 'finals';
      if (category === 'ATP_500') return 'atp500';
      if (category === 'ATP_250') return 'atp250';
      if (category === 'ATP_100') return 'atp100';
      return 'atp250';
    };
    const currentYear = state?.year ?? tournament?.year ?? tournament?.season ?? null;
    const currentKey = `${tournament?.id ?? tournament?.name ?? 'current'}|${currentYear ?? 'now'}`;
    const categoryCounts = {
      gs: 0, slamClash: 0, masters: 0, finals: 0,
      atp500: 0, atp250: 0, atp100: 0,
    };
    const surfaceCounts = {
      HARD: 0, CLAY: 0, GRASS: 0, STREET: 0, CARPET: 0, INDOOR: 0,
    };
    const seen = new Set();
    const addTitle = (tour, champ, year) => {
      if (!champion?.id || champ?.id !== champion.id) return;
      const key = `${tour?.id ?? tour?.name ?? 'unknown'}|${year ?? tour?.season ?? 'unknown'}`;
      if (seen.has(key)) return;
      seen.add(key);
      const catKey = categoryToKey(tour?.category);
      categoryCounts[catKey] = (categoryCounts[catKey] ?? 0) + 1;
      const surface = String(tour?.surface ?? tour?.courtKey ?? 'HARD').toUpperCase();
      const normalizedSurface = surface.includes('CLAY') || surface.includes('ROLAND') ? 'CLAY'
        : surface.includes('GRASS') || surface.includes('WIMBLEDON') ? 'GRASS'
        : surface.includes('INDOOR') || surface.includes('O2') ? 'INDOOR'
        : surface.includes('STREET') || surface.includes('URBAN') ? 'STREET'
        : surface.includes('CARPET') || surface.includes('SILK') ? 'CARPET'
        : 'HARD';
      surfaceCounts[normalizedSurface] = (surfaceCounts[normalizedSurface] ?? 0) + 1;
    };

    for (const res of Object.values(state?.historicalTournamentResults ?? {})) {
      if (!res) continue;
      const resTour = res.tournament ?? null;
      const resChamp = res._slim ? res.champion : res.bracket?.champion;
      addTitle(resTour, resChamp, res._season ?? resTour?.season ?? null);
    }
    addTitle(tournament, champion, currentYear);
    seen.add(currentKey);

    const ctInstant = {
      ...baseCt,
      gs: Math.max(baseCt.gs ?? 0, categoryCounts.gs ?? 0),
      slamClash: Math.max(baseCt.slamClash ?? 0, categoryCounts.slamClash ?? 0),
      masters: Math.max(baseCt.masters ?? 0, categoryCounts.masters ?? 0),
      finals: Math.max(baseCt.finals ?? 0, categoryCounts.finals ?? 0),
      atp500: Math.max(baseCt.atp500 ?? 0, categoryCounts.atp500 ?? 0),
      atp250: Math.max(baseCt.atp250 ?? 0, categoryCounts.atp250 ?? 0),
      atp100: Math.max(baseCt.atp100 ?? 0, categoryCounts.atp100 ?? 0),
      olympic: baseCt.olympic ?? {},
    };
    const surfaceInstant = Object.fromEntries(['HARD', 'CLAY', 'GRASS', 'STREET', 'CARPET', 'INDOOR'].map(surface => [
      surface,
      Math.max(baseSurface?.[surface]?.titlesWon ?? 0, surfaceCounts[surface] ?? 0),
    ]));
    return { careerTitles: ctInstant, surfaceTitles: surfaceInstant };
  }, [champion?.id, freshChampion, tournament, state?.historicalTournamentResults, state?.year]);

  const ct = instantTitleSnapshot.careerTitles;
  const surfaceTitleCounts = instantTitleSnapshot.surfaceTitles;
  const totalTitles = (ct.gs ?? 0) + (ct.slamClash ?? 0) + (ct.masters ?? 0) + (ct.finals ?? 0) + (ct.atp500 ?? 0) + (ct.atp250 ?? 0) + (ct.atp100 ?? 0);
  const legacyRankings = React.useMemo(() => {
    const byId = new Map();
    const eventTitlesById = new Map();
    const eventEditionsSeen = new Set();
    for (const player of [
      ...(state?.tourPlayers ?? []),
      ...(state?.prospects ?? []),
      ...(state?.retiredPlayers ?? []),
      champion,
      freshChampion,
    ]) {
      if (!player?.id) continue;
      byId.set(player.id, { ...(byId.get(player.id) ?? {}), ...player });
    }
    const normalizeEventName = value => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
    const sameTournament = candidate => {
      if (!candidate) return false;
      if (candidate.id && tournament?.id) return candidate.id === tournament.id;
      return normalizeEventName(candidate.name) === normalizeEventName(tournament?.name);
    };
    const registerEventTitle = (resultTournament, winner, year) => {
      if (!winner?.id || !sameTournament(resultTournament)) return;
      const editionKey = `${resultTournament?.id ?? normalizeEventName(resultTournament?.name)}|${year ?? resultTournament?.season ?? 'unknown'}`;
      if (eventEditionsSeen.has(editionKey)) return;
      eventEditionsSeen.add(editionKey);
      eventTitlesById.set(winner.id, (eventTitlesById.get(winner.id) ?? 0) + 1);
      byId.set(winner.id, { ...(byId.get(winner.id) ?? {}), ...winner });
    };
    for (const result of Object.values(state?.historicalTournamentResults ?? {})) {
      const resultTournament = result?.tournament ?? null;
      const winner = result?._slim ? result?.champion : result?.bracket?.champion;
      registerEventTitle(resultTournament, winner, result?._season ?? resultTournament?.season ?? null);
    }
    registerEventTitle(tournament, champion, state?.year ?? tournament?.year ?? tournament?.season ?? null);
    if (champion?.id) {
      const current = byId.get(champion.id) ?? champion;
      byId.set(champion.id, {
        ...current,
        careerTitles: ct,
        surfaceStats: Object.fromEntries(Object.entries(surfaceTitleCounts ?? {}).map(([surface, n]) => [
          surface,
          { ...(current.surfaceStats?.[surface] ?? {}), titlesWon: n },
        ])),
      });
    }

    const titleTotal = (player) => {
      const t = player?.careerTitles ?? {};
      return (t.gs ?? 0) + (t.slamClash ?? 0) + (t.masters ?? 0) + (t.finals ?? 0) + (t.atp500 ?? 0) + (t.atp250 ?? 0) + (t.atp100 ?? 0);
    };
    const surfaceTotal = (player) => {
      if (player?.id === champion?.id) return surfaceTitleCounts?.[sc.key] ?? 0;
      return player?.surfaceStats?.[sc.key]?.titlesWon ?? 0;
    };
    const eventTotal = player => eventTitlesById.get(player?.id) ?? 0;
    const sortRows = (metric) => [...byId.values()]
      .map(player => ({
        id: player.id,
        name: player.name ?? 'Jogador',
        value: metric(player),
        rank: null,
      }))
      .filter(row => row.value > 0)
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
      .map((row, index) => ({ ...row, rank: index + 1 }));
    const buildView = (ranked) => {
      const champIdx = ranked.findIndex(row => row.id === champion?.id);
      const leaders = ranked.slice(0, 5);
      if (champIdx < 0 || champIdx < 5) return { rows: leaders, championRank: champIdx >= 0 ? ranked[champIdx]?.rank : null };
      const context = ranked.slice(Math.max(0, champIdx - 1), Math.min(ranked.length, champIdx + 2));
      const rows = [...ranked.slice(0, 3), ...context]
        .filter((row, index, list) => list.findIndex(item => item.id === row.id) === index)
        .slice(0, 5);
      return {
        rows,
        championRank: ranked[champIdx]?.rank ?? null,
      };
    };
    return {
      overall: buildView(sortRows(titleTotal)),
      surface: buildView(sortRows(surfaceTotal)),
      event: buildView(sortRows(eventTotal)),
    };
  }, [state?.tourPlayers, state?.prospects, state?.retiredPlayers, state?.historicalTournamentResults, state?.year, champion?.id, freshChampion, ct, surfaceTitleCounts, sc.key, tournament]);

  const facts = React.useMemo(() =>
    _cerFacts(tournament, champion, runner, finalMatch, bracket),
    [champion?.id, runner?.id]
  );

  // Journalist report — computed once
  const journalistReport = React.useMemo(() =>
    _buildJournalistReport(tournament, bracket, state),
    [champion?.id]
  );

  const isGS = tournament?.isSlam;
  const isMasters = tournament?.isMasters;
  const catLabel = isGS ? 'GRAND SLAM' : tournament?.category === 'SLAM_CLASH' ? 'CLASH SLAM' : isMasters ? 'MASTERS 1000'
    : tournament?.category === 'FINALS' ? 'ATP FINALS'
    : tournament?.category === 'ATP_500' ? 'ATP 500'
    : tournament?.category === 'ATP_250' ? 'ATP 250'
    : tournament?.category === 'ATP_100' ? 'ATP 100'
    : tournament?.category === 'ATP_75' ? 'ATP 75'
    : tournament?.category === 'ATP_50' ? 'ATP 50'
    : tournament?.category === 'ATP_25' ? 'ATP 25'
    : 'ATP 250';

  // Total players
  const totalPlayers = new Set(
    rounds.flatMap(r => r.flatMap(m => [m.playerA?.id, m.playerB?.id].filter(Boolean)))
  ).size;

  // Semis losers
  const semiRound = rounds[rounds.length - 2] ?? [];
  const semiLosers = semiRound
    .filter(m => m.winner && !m.isBye)
    .map(m => m.playerA?.id === m.winner?.id ? m.playerB : m.playerA)
    .filter(p => p && p.id !== champion?.id && p.id !== runner?.id)
    .slice(0, 2);

  const finalScoreText = sd.length
    ? sd.map(([a, b]) => champIsA ? `${a}-${b}` : `${b}-${a}`).join(' ')
    : 'sem placar';
  const totalGamesFinal = sd.reduce((sum, [a, b]) => sum + a + b, 0);
  const setsWon = sd.filter(([a, b]) => champIsA ? a > b : b > a).length;
  const setsLost = sd.filter(([a, b]) => champIsA ? a < b : b < a).length;
  const identityChamp = React.useMemo(() => {
    try { return champion ? buildPlayerIdentity(champion, { surfaceKey: sc.key }) : null; }
    catch { return null; }
  }, [champion?.id, sc.key]);

  const championRoute = React.useMemo(() => {
    if (!champion?.id) return [];
    return rounds.map((round, ri) => {
      const m = round.find(match => match?.winner?.id === champion.id && !match.isBye);
      if (!m) return null;
      const fromEnd = rounds.length - 1 - ri;
      const roundLabel = fromEnd === 0 ? 'Final' : fromEnd === 1 ? 'Semi' : fromEnd === 2 ? 'Quartas' : fromEnd === 3 ? 'Oitavas' : `R${round.filter(x => !x.isBye).length * 2}`;
      const opponent = m.playerA?.id === champion.id ? m.playerB : m.playerA;
      const isA = m.playerA?.id === champion.id;
      const ownStats = isA ? m.result?.stats?.a : m.result?.stats?.b;
      const oppStats = isA ? m.result?.stats?.b : m.result?.stats?.a;
      const sets = m.result?.setsDetail ?? [];
      const score = sets.length ? sets.map(([a, b]) => `${isA ? a : b}-${isA ? b : a}`).join(' ') : 'W/O';
      const setsFor = sets.filter(([a, b]) => isA ? a > b : b > a).length;
      const setsAgainst = sets.filter(([a, b]) => isA ? a < b : b < a).length;
      const heat = m.result?.heat?.score ?? m.result?.heat?.peak ?? null;
      const games = sets.reduce((s, [a, b]) => s + a + b, 0);
      return { roundLabel, opponent, score, setsFor, setsAgainst, heat, games, fromEnd, stats: ownStats ?? null, oppStats: oppStats ?? null };
    }).filter(Boolean).reverse();
  }, [champion?.id, rounds]);

  const campaignStats = React.useMemo(() => {
    const wins = championRoute.length;
    const allSets = championRoute.flatMap(route => {
      const match = rounds.flatMap(r => r).find(m => {
        const opp = m.playerA?.id === champion?.id ? m.playerB : m.playerA;
        return m.winner?.id === champion?.id && opp?.id === route.opponent?.id;
      });
      return match?.result?.setsDetail ?? [];
    });
    const setDiff = allSets.reduce((acc, [a, b]) => {
      const matchA = a > b ? 1 : 0;
      const matchB = b > a ? 1 : 0;
      return acc + matchA - matchB;
    }, 0);
    const heatVals = championRoute.map(r => r.heat).filter(v => v != null);
    const avgHeat = heatVals.length ? Math.round(heatVals.reduce((s, v) => s + v, 0) / heatVals.length) : null;
    const games = championRoute.reduce((s, r) => s + (r.games ?? 0), 0);
    const winners = championRoute.reduce((s, r) => s + (r.stats?.winners ?? 0), 0);
    const aces = championRoute.reduce((s, r) => s + (r.stats?.aces ?? 0), 0);
    const unforcedErrors = championRoute.reduce((s, r) => s + (r.stats?.unforcedErrors ?? 0), 0);
    const setsPlayed = championRoute.reduce((s, r) => s + (r.setsFor ?? 0) + (r.setsAgainst ?? 0), 0);
    const gamesHeld = championRoute.reduce((s, r) => s + (r.stats?.gamesHeld ?? 0), 0);
    const gamesServed = championRoute.reduce((s, r) => s + (r.stats?.gamesServed ?? 0), 0);
    const gamesConverted = championRoute.reduce((s, r) => s + (r.stats?.gamesConverted ?? 0), 0);
    const gamesReturned = championRoute.reduce((s, r) => s + (r.stats?.gamesReturned ?? 0), 0);
    const oppBreaks = championRoute.reduce((s, r) => s + (r.oppStats?.gamesConverted ?? 0), 0);
    const oppReturnGames = championRoute.reduce((s, r) => s + (r.oppStats?.gamesReturned ?? 0), 0);
    const oppGamesHeld = championRoute.reduce((s, r) => s + (r.oppStats?.gamesHeld ?? 0), 0);
    const oppGamesServed = championRoute.reduce((s, r) => s + (r.oppStats?.gamesServed ?? 0), 0);
    const servePointsWon = championRoute.reduce((s, r) => s + (r.stats?.pointsWonServing ?? 0), 0);
    const servePointsLost = championRoute.reduce((s, r) => s + (r.stats?.pointsLostServing ?? 0), 0);
    const returnPointsWon = championRoute.reduce((s, r) => s + (r.stats?.pointsWonReturning ?? 0), 0);
    const returnPointsLost = championRoute.reduce((s, r) => s + (r.stats?.pointsLostReturning ?? 0), 0);
    const winnersPerSet = setsPlayed ? Math.round((winners / setsPlayed) * 10) / 10 : null;
    const avgAces = wins ? Math.round((aces / wins) * 10) / 10 : null;
    const errorsPerSet = setsPlayed ? Math.round((unforcedErrors / setsPlayed) * 10) / 10 : null;
    const directHoldPct = gamesServed ? Math.round((gamesHeld / gamesServed) * 100) : null;
    const breakHoldPct = oppReturnGames ? Math.round(((oppReturnGames - oppBreaks) / oppReturnGames) * 100) : null;
    const servePointPct = (servePointsWon + servePointsLost) ? Math.round((servePointsWon / (servePointsWon + servePointsLost)) * 100) : null;
    const returnPointPct = (returnPointsWon + returnPointsLost) ? Math.round((returnPointsWon / (returnPointsWon + returnPointsLost)) * 100) : null;
    const directBreakPct = gamesReturned ? Math.round((gamesConverted / gamesReturned) * 100) : null;
    const oppServiceBreakPct = oppGamesServed ? Math.round(((oppGamesServed - oppGamesHeld) / oppGamesServed) * 100) : null;
    const breakPct = directBreakPct != null
      ? directBreakPct
      : oppServiceBreakPct;
    const holdPct = directHoldPct ?? breakHoldPct;
    return {
      wins, setDiff, avgHeat, games, setsPlayed, winnersPerSet, avgAces, errorsPerSet,
      holdPct, breakPct, servePointPct, returnPointPct,
      hasServiceGames: gamesServed > 0 || gamesReturned > 0,
    };
  }, [championRoute, rounds, champion?.id]);

  const tournamentBenchmarks = React.useMemo(() => {
    const totals = {
      matches: 0, playerMatches: 0, playerSets: 0,
        winners: 0, aces: 0, unforcedErrors: 0,
        gamesHeld: 0, gamesServed: 0, gamesConverted: 0, gamesReturned: 0,
        pointsWonServing: 0, pointsLostServing: 0,
        pointsWonReturning: 0, pointsLostReturning: 0,
    };
    for (const match of rounds.flatMap(round => round)) {
      if (!match?.winner || match.isBye || !match.result) continue;
      const setsPlayed = match.result?.setsDetail?.length ?? 0;
      const sides = [match.result?.stats?.a, match.result?.stats?.b].filter(Boolean);
      if (!sides.length) continue;
      totals.matches += 1;
      for (const stats of sides) {
        totals.playerMatches += 1;
        totals.playerSets += setsPlayed;
        totals.winners += stats.winners ?? 0;
        totals.aces += stats.aces ?? 0;
        totals.unforcedErrors += stats.unforcedErrors ?? 0;
        totals.gamesHeld += stats.gamesHeld ?? 0;
        totals.gamesServed += stats.gamesServed ?? 0;
        totals.gamesConverted += stats.gamesConverted ?? 0;
        totals.gamesReturned += stats.gamesReturned ?? 0;
        totals.pointsWonServing += stats.pointsWonServing ?? 0;
        totals.pointsLostServing += stats.pointsLostServing ?? 0;
        totals.pointsWonReturning += stats.pointsWonReturning ?? 0;
        totals.pointsLostReturning += stats.pointsLostReturning ?? 0;
      }
    }
    const oneDecimal = value => Math.round(value * 10) / 10;
    return {
      winnersPerSet: totals.playerSets ? oneDecimal(totals.winners / totals.playerSets) : null,
      acesPerMatch: totals.playerMatches ? oneDecimal(totals.aces / totals.playerMatches) : null,
      errorsPerSet: totals.playerSets ? oneDecimal(totals.unforcedErrors / totals.playerSets) : null,
      holdPct: totals.gamesServed ? Math.round((totals.gamesHeld / totals.gamesServed) * 100) : null,
      breakPct: totals.gamesReturned ? Math.round((totals.gamesConverted / totals.gamesReturned) * 100) : null,
      servePointPct: (totals.pointsWonServing + totals.pointsLostServing)
        ? Math.round((totals.pointsWonServing / (totals.pointsWonServing + totals.pointsLostServing)) * 100)
        : null,
      returnPointPct: (totals.pointsWonReturning + totals.pointsLostReturning)
        ? Math.round((totals.pointsWonReturning / (totals.pointsWonReturning + totals.pointsLostReturning)) * 100)
        : null,
      hasServiceGames: totals.gamesServed > 0 || totals.gamesReturned > 0,
    };
  }, [rounds]);

  const pressCards = React.useMemo(() => {
    const headline = journalistReport?.headline ?? `${champion?.name ?? 'Campeão'} transforma ${tournament?.name ?? 'o torneio'} em declaração de força`;
    const deck = journalistReport?.deck ?? facts[0] ?? `A campanha terminou com ${finalScoreText}, mas o impacto vai além do placar.`;
    const body = journalistReport?.body ?? facts.slice(1, 3).join(' ');
    return [
      { label:'Manchete', tone:sc.color, title:headline, text:deck },
      { label:'Leitura', tone:'#5BB8E4', title:'O que decidiu', text:body || `A final teve ${totalGamesFinal || 'poucos'} games e controle nos pontos que realmente importavam.` },
      { label:'Próximo capítulo', tone:'#E8C84A', title:'Consequência no circuito', text:`${champion?.name?.split(' ')[0] ?? 'O campeão'} sai com ${totalTitles} título(s) de carreira e uma narrativa mais pesada para o próximo torneio.` },
    ];
  }, [journalistReport, champion?.id, tournament?.id, facts, finalScoreText, totalGamesFinal, totalTitles, sc.color]);

  const championStartRank = bracket?.entryRanks?.[champion?.id]
    ?? (Number.isFinite(champion?.rankPosition) ? champion.rankPosition : null);
  const championEndRank = getDisplayRank(freshChampion ?? champion);
  const serviceGameMetrics = campaignStats.hasServiceGames || tournamentBenchmarks.hasServiceGames;
  const statTiles = [
    { label:'Winners / set', raw:campaignStats.winnersPerSet, value:campaignStats.winnersPerSet ?? '—', average:tournamentBenchmarks.winnersPerSet, averageSuffix:'', color:sc.color },
    { label:'Aces / partida', raw:campaignStats.avgAces, value:campaignStats.avgAces ?? '—', average:tournamentBenchmarks.acesPerMatch, averageSuffix:'', color:'#B88A12' },
    serviceGameMetrics
      ? { label:'Hold', raw:campaignStats.holdPct, value:campaignStats.holdPct != null ? `${campaignStats.holdPct}%` : '—', average:tournamentBenchmarks.holdPct, averageSuffix:'%', color:'#D36B2C' }
      : { label:'Pts ganhos no saque', raw:campaignStats.servePointPct, value:campaignStats.servePointPct != null ? `${campaignStats.servePointPct}%` : '—', average:tournamentBenchmarks.servePointPct, averageSuffix:'%', color:'#D36B2C' },
    serviceGameMetrics
      ? { label:'Break rate', raw:campaignStats.breakPct, value:campaignStats.breakPct != null ? `${campaignStats.breakPct}%` : '—', average:tournamentBenchmarks.breakPct, averageSuffix:'%', color:'#397FA8' }
      : { label:'Pts ganhos na devolução', raw:campaignStats.returnPointPct, value:campaignStats.returnPointPct != null ? `${campaignStats.returnPointPct}%` : '—', average:tournamentBenchmarks.returnPointPct, averageSuffix:'%', color:'#397FA8' },
    { label:'Erros não forçados / set', raw:campaignStats.errorsPerSet, value:campaignStats.errorsPerSet ?? '—', average:tournamentBenchmarks.errorsPerSet, averageSuffix:'', color:'#A34E4E', lowerBetter:true },
    { label:'Ranking', value:championEndRank ? `#${championEndRank}` : '—', startRank:championStartRank, endRank:championEndRank, color:'#43855D', ranking:true },
  ];

  const categoryPalette = [
    ['Grand Slam', 'GS', ct.gs ?? 0, '#FFD700'],
    ['Clash Slam', 'CS', ct.slamClash ?? 0, '#FF8A3D'],
    ['Masters 1000', 'M1000', ct.masters ?? 0, '#E8C84A'],
    ['ATP Finals', 'FIN', ct.finals ?? 0, '#C84FEB'],
    ['ATP 500', '500', ct.atp500 ?? 0, '#4A90D9'],
    ['ATP 250', '250', ct.atp250 ?? 0, '#2ECC71'],
    ['ATP 100', '100', ct.atp100 ?? 0, '#9CA3AF'],
    ['Ouro Olímpico', 'OLY', ct.olympic?.gold ?? 0, '#1976D2'],
  ];
  const surfacePalette = [
    ['Hard', 'HARD', '#4A90D9'],
    ['Saibro', 'CLAY', '#C4572A'],
    ['Grama', 'GRASS', '#2ECC71'],
    ['Street', 'STREET', '#EF9F27'],
    ['Carpet', 'CARPET', '#C4426A'],
    ['Indoor', 'INDOOR', '#C84FEB'],
  ];
  const renderLegacyRankingPanel = (title, data, color, unitLabel) => {
    const Row = ({ row, tone = color }) => {
      const isChamp = row.id === champion?.id;
      return (
        <div style={{
          display:'grid',
          gridTemplateColumns:'38px minmax(0,1fr) auto',
          gap:10,
          alignItems:'center',
          padding:'10px 11px',
          border:`1px solid ${isChamp ? tone+'66' : 'rgba(79,59,35,.14)'}`,
          borderLeft:`3px solid ${isChamp ? tone : 'transparent'}`,
          background:isChamp ? `${tone}16` : 'rgba(255,255,255,.20)',
          minWidth:0,
        }}>
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, fontWeight:700, color:isChamp ? tone : '#8A765A', letterSpacing:'.04em' }}>#{row.rank}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:18, color:'#3B2F21', textTransform:'uppercase', lineHeight:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{row.name}</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:16, color:isChamp ? tone : '#6D5B43', whiteSpace:'nowrap' }}>{row.value} <span style={{ fontFamily:"'Space Mono',monospace", fontSize:7, fontWeight:500 }}>{unitLabel}</span></div>
        </div>
      );
    };
    return (
      <section style={{ minWidth:0, overflow:'hidden', border:`1px solid ${color}4A`, background:`linear-gradient(155deg, ${color}12, rgba(255,255,255,.26) 52%, rgba(117,91,56,.07))`, padding:'16px 14px 14px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, marginBottom:12 }}>
          <div>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:9, fontWeight:700, color, letterSpacing:'.19em', textTransform:'uppercase', lineHeight:1.35 }}>{title}</div>
            <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:10, color:'#7D6A50', marginTop:4 }}>arquivo histórico · campeão em destaque</div>
          </div>
          <div style={{ minWidth:42, textAlign:'center', padding:'5px 7px', border:`1px solid ${color}55`, background:`${color}12` }}>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:6, letterSpacing:'.12em', color:'#7D6A50', textTransform:'uppercase' }}>posição</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:20, color, lineHeight:1, marginTop:2 }}>#{data.championRank ?? '—'}</div>
          </div>
        </div>
        <div style={{ display:'grid', gap:4 }}>
          {(data.rows ?? []).map(row => <Row key={`${title}-${row.id}`} row={row} />)}
          {!(data.rows ?? []).length && <div style={{ padding:'16px 10px', fontFamily:"'Barlow',sans-serif", fontSize:12, color:'#8A765A', textAlign:'center' }}>Ainda não há campeões registrados.</div>}
        </div>
      </section>
    );
  };

  const CSS_VAR = { '--cer-sc': sc.color };

  return (
    <div className="_cer_overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <_CerConfetti sc={sc.color} />

      <div className="_cer_panel" style={CSS_VAR}>
        <button className="_cer_btn_close" onClick={onClose}>?</button>

        {/* -- HEADER -- */}
        <div style={{
          padding: '16px 28px 14px',
          background: `linear-gradient(135deg, ${sc.color}1a 0%, transparent 60%)`,
          borderBottom: `1px solid ${sc.color}33`,
          display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0,
        }}>
          <span style={{ fontSize: 28 }}>{tournament?.icon ?? '??'}</span>
          <div>
            <div style={{
              fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900,
              fontSize: 'clamp(18px,2.6vw,26px)', color: '#fff',
              letterSpacing: '.07em', textTransform: 'uppercase', lineHeight: 1,
            }}>{tournament?.name}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 5, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{
                fontFamily: "'Space Mono',monospace", fontSize: 7, letterSpacing: '.4em',
                color: sc.color, background: `${sc.color}18`, border: `1px solid ${sc.color}44`,
                padding: '2px 8px', textTransform: 'uppercase',
              }}>{catLabel}</span>
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.35)', letterSpacing: '.2em' }}>
                {sc.icon} {sc.label}
              </span>
              {tournament?.location && (
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.25)', letterSpacing: '.15em' }}>
                  ?? {tournament.location}
                </span>
              )}
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,.25)', letterSpacing: '.15em' }}>
                {state?.year}
              </span>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 38, animation: '_cer_trophy 2.5s ease-in-out infinite' }}>??</div>
        </div>

        <div style={{ display:'flex', gap:7, padding:'10px 28px', borderBottom:'1px solid rgba(79,59,35,.22)', background:'rgba(255,255,255,.2)', flexShrink:0 }}>
          {PAGES.map((item, index) => <div key={item.id} style={{ height:3, flex:1, background:index === page ? sc.color : index < page ? `${sc.color}66` : 'rgba(79,59,35,.15)' }} />)}
        </div>

        {/* -- CONTENT -- */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

          {/* ---------- TAB: PÓDIO PREMIUM ---------- */}
          {tab === 'recap' && (
            <div style={{ flex:1, overflowY:'auto', padding:'22px 24px 26px', background:`radial-gradient(circle at 20% 0%, ${sc.color}14, transparent 34%), linear-gradient(180deg, rgba(255,255,255,.018), transparent 30%)` }}>
              <div className="_cer_recap_layout">
              <main className="_cer_recap_main">
              <div className="_cer_hero_grid">
                <section style={{ position:'relative', minHeight:360, overflow:'hidden', border:`1px solid ${sc.color}30`, background:`linear-gradient(145deg, ${sc.color}12, rgba(255,255,255,.018) 42%, rgba(0,0,0,.28))`, padding:'28px 28px 24px' }}>
                  <div style={{ position:'absolute', inset:'auto -12% -34% auto', width:360, height:360, borderRadius:'50%', background:`radial-gradient(circle, ${sc.color}22, transparent 70%)`, pointerEvents:'none' }} />
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.48em', color:`${sc.color}B5`, textTransform:'uppercase', marginBottom:22 }}>Edição de campeão</div>
                  <div style={{ display:'flex', gap:24, alignItems:'center', position:'relative', zIndex:1 }}>
                    <_CerPhoto player={champion} winner sc={sc.color} />
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:'clamp(26px,3.25vw,44px)', color:'#fff', lineHeight:.9, textTransform:'uppercase', letterSpacing:'.01em', textShadow:`0 0 34px ${sc.color}18`, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'min(420px,42vw)' }}>{champion?.name}</div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:15 }}>
                        {[champion?.nationality, styleChamp?.label, identityChamp?.archetype?.label ?? identityChamp?.archetype?.name, `${champOvr} OVR`, ovrTier(champOvr).grade].filter(Boolean).map((tag, i) => (
                          <span key={`${tag}-${i}`} style={{ fontFamily:"'Space Mono',monospace", fontSize:7, letterSpacing:'.13em', textTransform:'uppercase', color:i >= 3 ? sc.color : 'rgba(255,255,255,.58)', border:`1px solid ${i >= 3 ? sc.color+'55' : 'rgba(255,255,255,.13)'}`, background:i >= 3 ? `${sc.color}17` : 'rgba(255,255,255,.04)', padding:'5px 8px' }}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop:34, position:'relative', zIndex:1, padding:'16px 18px', border:`1px solid ${sc.color}40`, background:`${sc.color}0E`, textAlign:'center' }}>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:24, color:'#fff', textTransform:'uppercase', lineHeight:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {champion?.name} <span style={{ color:sc.color }}>x</span> <span style={{ color:'rgba(255,255,255,.58)' }}>{runner?.name ?? '—'}</span>
                    </div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:'clamp(24px,3.2vw,38px)', color:sc.color, lineHeight:.95, marginTop:10, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{finalScoreText}</div>
                    <div style={{ fontFamily:"'Space Mono',monospace", fontSize:7, color:'rgba(255,255,255,.32)', letterSpacing:'.18em', marginTop:7 }}>{setsWon}-{setsLost} sets · {totalGamesFinal || '—'} games</div>
                  </div>
                </section>

                <section style={{ display:'grid', gridTemplateRows:'auto 1fr', gap:12, minHeight:360 }}>
                  <div className="_cer_stat_grid">
                    {statTiles.map(tile => {
                      const delta = Number.isFinite(tile.raw) && Number.isFinite(tile.average)
                        ? Math.round((tile.raw - tile.average) * 10) / 10
                        : null;
                      const favorable = delta == null ? null : tile.lowerBetter ? delta < 0 : delta > 0;
                      const level = delta == null || Math.abs(delta) < 0.05
                        ? 'na média'
                        : `${Math.abs(delta)} ${delta > 0 ? 'acima' : 'abaixo'}`;
                      const rankGain = tile.ranking && Number.isFinite(tile.startRank) && Number.isFinite(tile.endRank)
                        ? tile.startRank - tile.endRank
                        : null;
                      return (
                        <div key={tile.label} style={{ padding:'14px 14px 12px', minWidth:0, border:`1px solid ${tile.color}42`, borderTop:`3px solid ${tile.color}`, background:`linear-gradient(155deg, ${tile.color}13, rgba(255,255,255,.20))` }}>
                          <div style={{ display:'flex', justifyContent:'space-between', gap:8, alignItems:'baseline' }}>
                            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:7.5, fontWeight:700, color:'#6D5B43', letterSpacing:'.12em', textTransform:'uppercase' }}>{tile.label}</div>
                            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:6.5, color:'#8A765A', textTransform:'uppercase' }}>campeão</div>
                          </div>
                          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:36, color:tile.color, lineHeight:.9, marginTop:9, whiteSpace:'nowrap' }}>{tile.value}</div>
                          <div style={{ height:1, background:'rgba(79,59,35,.17)', margin:'11px 0 8px' }} />
                          {tile.ranking ? (
                            <div>
                              <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:10.5, color:'#6D5B43' }}>Entrada <b>{tile.startRank ? `#${tile.startRank}` : '—'}</b> → final <b>{tile.endRank ? `#${tile.endRank}` : '—'}</b></div>
                              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:7, fontWeight:700, color:tile.color, marginTop:5, textTransform:'uppercase', letterSpacing:'.08em' }}>{rankGain == null ? 'variação indisponível' : rankGain > 0 ? `↑ subiu ${rankGain} ${rankGain === 1 ? 'posição' : 'posições'}` : rankGain < 0 ? `↓ caiu ${Math.abs(rankGain)} ${rankGain === -1 ? 'posição' : 'posições'}` : '→ manteve a posição'}</div>
                            </div>
                          ) : (
                            <div style={{ display:'flex', justifyContent:'space-between', gap:8, alignItems:'end' }}>
                              <div>
                                <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:9.5, color:'#7D6A50' }}>Média do torneio</div>
                                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:18, color:'#574832', lineHeight:1, marginTop:2 }}>{tile.average != null ? `${tile.average}${tile.averageSuffix}` : '—'}</div>
                              </div>
                              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:6.5, fontWeight:700, color:favorable == null ? '#8A765A' : favorable ? '#43855D' : '#A34E4E', textTransform:'uppercase', textAlign:'right', maxWidth:78, lineHeight:1.35 }}>{level}</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ border:'1px solid rgba(255,255,255,.075)', background:'rgba(255,255,255,.022)', padding:'16px 16px 15px', minHeight:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'baseline', marginBottom:12 }}>
                      <div className="_cer_section_hd" style={{ marginBottom:0, color:`${sc.color}AA` }}>Palmarés do campeão</div>
                      <div style={{ fontFamily:"'Space Mono',monospace", fontSize:7, color:'rgba(255,255,255,.3)', letterSpacing:'.18em', textTransform:'uppercase' }}>{totalTitles} títulos totais</div>
                    </div>
                    <div style={{ fontFamily:"'Space Mono',monospace", fontSize:6.5, color:'rgba(255,255,255,.28)', letterSpacing:'.2em', textTransform:'uppercase', marginBottom:8 }}>Categorias</div>
                    <div className="_cer_category_grid">
                      {categoryPalette.map(([label, abbr, n, color]) => (
                        <div key={label} style={{ minWidth:0, padding:'10px 6px', textAlign:'center', border:`1px solid ${color}30`, background:`linear-gradient(180deg, ${color}14, rgba(255,255,255,.012))` }}>
                          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:24, color, lineHeight:1 }}>{n}</div>
                          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:5.5, color:`${color}AA`, letterSpacing:'.08em', textTransform:'uppercase', marginTop:5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{abbr}</div>
                          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:8.5, color:'rgba(255,255,255,.36)', textTransform:'uppercase', lineHeight:1, marginTop:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontFamily:"'Space Mono',monospace", fontSize:6.5, color:'rgba(255,255,255,.28)', letterSpacing:'.2em', textTransform:'uppercase', marginBottom:8 }}>Terrenos</div>
                    <div className="_cer_surface_grid">
                      {surfacePalette.map(([label, key, color]) => (
                        <div key={key} style={{ minWidth:0, padding:'9px 7px', border:`1px solid ${color}2B`, background:`${color}0D` }}>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                            <span style={{ fontFamily:"'Space Mono',monospace", fontSize:6, color:`${color}A0`, letterSpacing:'.11em', textTransform:'uppercase', overflow:'hidden', textOverflow:'ellipsis' }}>{label}</span>
                            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:22, color, lineHeight:1 }}>{surfaceTitleCounts[key] ?? 0}</span>
                          </div>
                          <div style={{ height:4, marginTop:8, background:'rgba(255,255,255,.055)', overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${Math.min(100, (surfaceTitleCounts[key] ?? 0) * 12)}%`, background:color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>

              <section style={{ border:'1px solid rgba(255,255,255,.075)', background:'rgba(255,255,255,.018)', padding:'16px 18px', marginBottom:18 }}>
                <div className="_cer_section_hd" style={{ color:`${sc.color}AA` }}>Caminho até o troféu</div>
                <div style={{ display:'grid', gridTemplateColumns:`repeat(${Math.max(1, championRoute.length)}, minmax(92px,1fr))`, gap:8 }}>
                  {championRoute.map((r, i) => {
                    const photo = getPlayerPhoto(r.opponent);
                    const initials = r.opponent?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?';
                    const opponentRank = getDisplayRank(r.opponent);
                    return (
                      <div key={`${r.roundLabel}-${r.opponent?.id ?? i}`} style={{ minWidth:0, padding:'11px 9px', textAlign:'center', border:`1px solid ${i === championRoute.length - 1 ? sc.color+'48' : 'rgba(255,255,255,.07)'}`, background:i === championRoute.length - 1 ? `${sc.color}10` : 'rgba(255,255,255,.025)' }}>
                        <div style={{ width:42, height:42, margin:'0 auto 8px', borderRadius:'50%', overflow:'hidden', border:`1px solid ${i === championRoute.length - 1 ? sc.color+'99' : 'rgba(255,255,255,.18)'}`, background:'rgba(255,255,255,.04)' }}>
                          {photo ? <img src={photo} alt={r.opponent?.name ?? ''} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top center' }} /> : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Bebas Neue',sans-serif", fontSize:17, color:'rgba(255,255,255,.48)' }}>{initials}</div>}
                        </div>
                        <div style={{ fontFamily:"'Space Mono',monospace", fontSize:6, color:i === championRoute.length - 1 ? sc.color : 'rgba(255,255,255,.34)', letterSpacing:'.14em', textTransform:'uppercase' }}>{r.roundLabel}</div>
                        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:13, color:'#fff', textTransform:'uppercase', lineHeight:1, marginTop:5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {r.opponent?.name?.split(' ').slice(-1)[0] ?? 'BYE'}{opponentRank ? <span style={{ color:'rgba(255,255,255,.42)', marginLeft:4 }}>#{opponentRank}</span> : null}
                        </div>
                        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:15, color:sc.color, lineHeight:1, marginTop:7, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.score}</div>
                        <div style={{ fontFamily:"'Space Mono',monospace", fontSize:5.5, color:'rgba(255,255,255,.28)', marginTop:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.setsFor}-{r.setsAgainst} sets · heat {r.heat ?? '—'}</div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <div className="_cer_editorial_grid">
                <section style={{ border:'1px solid rgba(255,255,255,.075)', background:'rgba(255,255,255,.018)', padding:'16px 18px' }}>
                  <div className="_cer_section_hd" style={{ color:`${sc.color}AA` }}>Leitura do torneio</div>
                  <div className="_cer_press_grid">
                    {pressCards.map((card, i) => (
                      <div key={card.label} style={{ padding:'14px 15px', background:'rgba(255,255,255,.026)', border:`1px solid ${card.tone}28`, borderTop:`3px solid ${card.tone}` }}>
                        <div style={{ fontFamily:"'Space Mono',monospace", fontSize:6.5, color:card.tone, letterSpacing:'.22em', textTransform:'uppercase', marginBottom:7 }}>{card.label}</div>
                        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:20, color:'#fff', textTransform:'uppercase', lineHeight:1.05 }}>{card.title}</div>
                        <div style={{ fontFamily:"'Crimson Pro',Georgia,serif", fontSize:13.5, color:'rgba(242,237,228,.66)', lineHeight:1.55, marginTop:8 }}>{card.text}</div>
                      </div>
                    ))}
                  </div>
                </section>

                <section style={{ border:'1px solid rgba(255,255,255,.075)', background:'rgba(255,255,255,.018)', padding:'16px 18px' }}>
                  <div className="_cer_section_hd">Destaques rápidos</div>
                  <div style={{ display:'grid', gap:8 }}>
                    {facts.slice(0, 4).map((f, i) => <div key={i} className="_cer_fact" style={{ padding:'11px 13px', animationDelay:`${.08 + i * .05}s` }}>{f}</div>)}
                  </div>
                </section>
              </div>
              </main>
              <aside className="_cer_side_rail" style={CSS_VAR}>
                <div style={{ padding:'2px 2px 4px' }}>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:24, color:'#3B2F21', textTransform:'uppercase', lineHeight:1 }}>Livro dos campeões</div>
                  <div style={{ fontFamily:"'Crimson Pro',Georgia,serif", fontSize:12.5, color:'#7D6A50', lineHeight:1.4, marginTop:5 }}>A conquista de hoje dentro da história do circuito, do piso e deste torneio.</div>
                </div>
                {renderLegacyRankingPanel('Títulos gerais', legacyRankings.overall, '#9A7613', 'tit.')}
                {renderLegacyRankingPanel(`Títulos na ${sc.label}`, legacyRankings.surface, sc.color, 'tit.')}
                {renderLegacyRankingPanel(`Títulos · ${tournament?.name ?? 'este torneio'}`, legacyRankings.event, '#397FA8', 'tit.')}
              </aside>
              </div>
            </div>
          )}

          {tab === 'turning' && (
            <TournamentTurningPointsPage bracket={bracket} champion={champion} runner={runner} getDisplayRank={getDisplayRank} accent={sc.color} />
          )}

          {tab === 'circuit' && (
            <TournamentCircuitTab shift={circuitShift} accent={sc.color} />
          )}

          {/* ---------- TAB: STATS ---------- */}
          {tab === 'stats' && (() => {
            const heatClr = n => {
              if (n == null) return 'rgba(255,255,255,.25)';
              if (n >= 85) return '#FFD700';
              if (n >= 75) return '#FF5533';
              if (n >= 62) return '#FF9944';
              if (n >= 48) return '#FFD700';
              if (n >= 35) return '#7ab4ff';
              return '#4A7A9B';
            };

            const roundHeatData = (() => {
              const allR = bracket.rounds ?? [];
              const totalR = allR.length;
              return allR.map((rnd, ri) => {
                const fromEnd = totalR - 1 - ri;
                const label = fromEnd === 0 ? 'Final' : fromEnd === 1 ? 'Semifinal' : fromEnd === 2 ? 'Quartas' : fromEnd === 3 ? 'Oitavas' : `R${rnd.filter(m=>!m.isBye).length*2}`;
                const heats = rnd.map(m => m.result?.heat?.score ?? m.result?.heat?.peak ?? null).filter(v => v != null);
                const avg = heats.length ? Math.round(heats.reduce((s,v)=>s+v,0)/heats.length) : null;
                const peak = heats.length ? Math.round(Math.max(...heats)) : null;
                return { label, avg, peak, games: heats.length, fromEnd };
              }).reverse();
            })();

            const epicRanking = (() => {
              const allR = bracket.rounds ?? [];
              const totalR = allR.length;
              const matches = [];
              allR.forEach((rnd, ri) => {
                const fromEnd = totalR - 1 - ri;
                const rl = fromEnd === 0 ? 'Final' : fromEnd === 1 ? 'Semifinal' : fromEnd === 2 ? 'Quartas' : fromEnd === 3 ? 'Oitavas' : `R${rnd.filter(m=>!m.isBye).length*2}`;
                rnd.forEach(m => {
                  if (m.isBye || !m.winner) return;
                  const sd2 = m.result?.setsDetail ?? [];
                  const heat = m.result?.heat?.score ?? m.result?.heat?.peak ?? 0;
                  const tbs = sd2.filter(([a,b]) => (a===7&&b===6)||(a===6&&b===7)).length;
                  const scoreN = heat + sd2.length * 4 + tbs * 8;
                  const l = m.playerA?.id === m.winner?.id ? m.playerB : m.playerA;
                  matches.push({ w: m.winner, l, sd: sd2, heat, sets: sd2.length, tbs, round: rl, scoreN });
                });
              });
              return matches.sort((a,b) => b.scoreN - a.scoreN).slice(0, 5);
            })();

            const finalistPaths = (() => {
              const allR = bracket.rounds ?? [];
              const totalR = allR.length;
              const players = [champion, runner, ...semiLosers].filter(Boolean);
              return players.map(player => {
                const wins = [];
                allR.forEach((rnd, ri) => {
                  const fromEnd = totalR - 1 - ri;
                  const rl = fromEnd === 0 ? 'F' : fromEnd === 1 ? 'SF' : fromEnd === 2 ? 'QF' : fromEnd === 3 ? 'R16' : 'R32';
                  rnd.forEach(m => {
                    if (m.winner?.id !== player.id || m.isBye) return;
                    const opp = m.playerA?.id === player.id ? m.playerB : m.playerA;
                    const isA = m.playerA?.id === player.id;
                    const sd2 = m.result?.setsDetail ?? [];
                    const score = sd2.map(([a,b]) => `${isA?a:b}-${isA?b:a}`).join(' ');
                    wins.push({ opp, score, round: rl, sets: sd2.length });
                  });
                });
                const isChamp = player.id === champion?.id;
                const badge = isChamp ? '??' : player.id === runner?.id ? '??' : '??';
                return { player, wins, badge, isChamp };
              });
            })();

            const milestones = (() => {
              const ms = [];
              if (champion) {
                const ct2 = champion.careerTitles ?? {};
                const isSlam = tournament?.isSlam;
                const isMasters = tournament?.isMasters;
                if (isSlam && (ct2.gs ?? 0) === 1) ms.push({ icon: '🏆', text: `Primeiro Grand Slam de carreira de ${champion.name}` });
                else if (isSlam && (ct2.gs ?? 0) >= 5) ms.push({ icon: '🎾', text: `${champion.name} chega a ${ct2.gs} Grand Slams — territ—rio hist—rico` });
                else if (isSlam) ms.push({ icon: '🏆', text: `${ct2.gs ?? 1}— Grand Slam de ${champion.name}` });
                if (tournament?.category === 'SLAM_CLASH' && (ct2.slamClash ?? 0) === 1) ms.push({ icon: '🎾', text: `Primeiro Clash Slam de ${champion.name}` });
                else if (tournament?.category === 'SLAM_CLASH') ms.push({ icon: '🎾', text: `${ct2.slamClash ?? 1}— Clash Slam de ${champion.name}` });
                if (isMasters && (ct2.masters ?? 0) === 1) ms.push({ icon: '🎾', text: `Primeiro Masters 1000 de ${champion.name}` });
                if (tournament?.category === 'FINALS' && (ct2.finals ?? 0) === 1) ms.push({ icon: '🎾', text: `Primeiro ATP Finals de ${champion.name}` });
                const totalT = (ct2.gs??0)+(ct2.slamClash??0)+(ct2.masters??0)+(ct2.finals??0)+(ct2.atp500??0)+(ct2.atp250??0);
                if ([10,20,30,50].includes(totalT)) ms.push({ icon: '🎾', text: `${champion.name} atinge ${totalT} t—tulos na carreira` });
                (champion.personality?.careerMoments ?? [])
                  .filter(m => m.year === state?.year)
                  .forEach(m => {
                    if (m.type === 'FIRST_SLAM') ms.push({ icon: '🎾', text: m.title ?? `Primeiro Slam hist—rico de ${champion.name}` });
                    if (m.type === 'DROUGHT_END') ms.push({ icon: '🎾', text: m.title ?? `Fim da seca de t—tulos de ${champion.name}` });
                    if (m.type === 'COMEBACK') ms.push({ icon: '🎾', text: m.title ?? `Retorno definitivo de ${champion.name}` });
                  });
              }
              return ms.slice(0, 6);
            })();

            const totalMatches = rounds.reduce((s,r)=>s+r.filter(m=>!m.isBye&&m.winner).length,0);

            return (
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 26 }}>

                {/* Heat por rodada */}
                <div>
                  <div className="_cer_section_hd" style={{ color: `${sc.color}88` }}>??? Heat por Rodada</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {roundHeatData.map((rd, i) => (
                      <div key={i} style={{
                        display: 'grid', gridTemplateColumns: '90px 1fr 52px 42px',
                        alignItems: 'center', gap: 12, padding: '9px 14px',
                        background: rd.fromEnd === 0 ? `${sc.color}0a` : 'rgba(255,255,255,.02)',
                        border: `1px solid ${rd.fromEnd === 0 ? sc.color+'22' : 'rgba(255,255,255,.05)'}`,
                      }}>
                        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: rd.fromEnd === 0 ? sc.color : 'rgba(255,255,255,.35)', letterSpacing: '.2em', textTransform: 'uppercase' }}>{rd.label}</div>
                        <div style={{ height: 6, background: 'rgba(255,255,255,.06)', borderRadius: 3, overflow: 'hidden' }}>
                          {rd.avg != null && <div style={{ height: '100%', width: `${rd.avg}%`, background: heatClr(rd.avg), borderRadius: 3, transition: 'width .4s' }} />}
                        </div>
                        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 18, color: rd.avg != null ? heatClr(rd.avg) : 'rgba(255,255,255,.2)', textAlign: 'right', lineHeight: 1 }}>
                          {rd.avg ?? '—'}
                        </div>
                        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, color: 'rgba(255,255,255,.25)', textAlign: 'right' }}>
                          {rd.games > 0 ? `${rd.games}j` : '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top partidas —picas */}
                {epicRanking.length > 0 && (
                  <div>
                    <div className="_cer_section_hd">?? Partidas Mais —picas</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {epicRanking.map((m, i) => {
                        const scoreStr = m.sd.map(([a,b])=>`${a}-${b}`).join(' ');
                        return (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '9px 14px',
                            background: i === 0 ? `${sc.color}0c` : 'rgba(255,255,255,.02)',
                            border: `1px solid ${i === 0 ? sc.color+'33' : 'rgba(255,255,255,.05)'}`,
                            borderLeft: `3px solid ${heatClr(m.heat)}`,
                          }}>
                            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: 20, color: heatClr(m.heat), minWidth: 26, lineHeight: 1 }}>{i+1}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 13, color: '#fff', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                                {m.w?.name} <span style={{ color: 'rgba(255,255,255,.3)', fontWeight: 400 }}>def.</span> {m.l?.name}
                              </div>
                              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, color: 'rgba(255,255,255,.3)', marginTop: 2, letterSpacing: '.1em' }}>
                                {m.round} — {scoreStr}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {m.tbs > 0 && <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, color: '#FFD700', background: 'rgba(255,215,0,.1)', border: '1px solid rgba(255,215,0,.2)', padding: '2px 6px' }}>TB</span>}
                              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 16, color: heatClr(m.heat), minWidth: 32, textAlign: 'right', lineHeight: 1 }}>{m.heat > 0 ? m.heat : '—'}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Caminhos dos finalistas */}
                <div>
                  <div className="_cer_section_hd">??? Caminhos dos Finalistas</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {finalistPaths.map(({ player, wins, badge, isChamp }, pi) => (
                      <div key={player?.id ?? pi} style={{
                        padding: '12px 16px',
                        background: isChamp ? `${sc.color}08` : 'rgba(255,255,255,.02)',
                        border: `1px solid ${isChamp ? sc.color+'22' : 'rgba(255,255,255,.06)'}`,
                      }}>
                        <div style={{
                          fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800,
                          fontSize: 15, color: isChamp ? sc.color : 'rgba(255,255,255,.6)',
                          textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8,
                        }}>{badge} {player?.name}</div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {wins.map((w, wi) => (
                            <div key={wi} style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center',
                              padding: '5px 10px', minWidth: 72,
                              background: 'rgba(255,255,255,.03)',
                              border: '1px solid rgba(255,255,255,.07)',
                            }}>
                              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 6, color: 'rgba(255,255,255,.25)', letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 3 }}>{w.round}</div>
                              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 600, fontSize: 12, color: 'rgba(255,255,255,.65)', textTransform: 'uppercase', letterSpacing: '.03em', textAlign: 'center' }}>{w.opp?.name?.split(' ').pop() ?? '?'}</div>
                              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: isChamp ? sc.color : 'rgba(255,255,255,.35)', marginTop: 2 }}>{w.score}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recordes e marcos */}
                {milestones.length > 0 && (
                  <div>
                    <div className="_cer_section_hd">?? Recordes & Marcos</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {milestones.map((m, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '11px 16px',
                          background: 'rgba(255,255,255,.025)',
                          border: `1px solid ${sc.color}22`,
                          borderLeft: `3px solid ${sc.color}`,
                          animation: `_cer_rise .4s ease ${i * .07}s backwards`,
                        }}>
                          <span style={{ fontSize: 18, flexShrink: 0 }}>{m.icon}</span>
                          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, color: 'rgba(255,255,255,.82)', letterSpacing: '.04em', fontWeight: 600 }}>{m.text}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats gerais */}
                <div>
                  <div className="_cer_section_hd">Dados Gerais</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {[
                      ['Draw', totalPlayers, '??'],
                      ['Rodadas', rounds.length, '??'],
                      ['Sets na Final', sd.length, '??'],
                      ['Games na Final', sd.reduce((s,[a,b])=>s+a+b,0), '??'],
                      ['Partidas Totais', totalMatches, '??'],
                      ['No P—dio', semiLosers.length + 2, '???'],
                    ].map(([label, val, icon]) => (
                      <div key={label} className="_cer_stat_card">
                        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, color: 'rgba(255,255,255,.28)', letterSpacing: '.3em', textTransform: 'uppercase', marginBottom: 6 }}>{icon} {label}</div>
                        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 28, color: 'rgba(255,255,255,.8)', lineHeight: 1 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            );
          })()}

          {/* ---------- TAB: BRACKET ---------- */}
          {tab === 'draw' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
              <div className="_cer_section_hd" style={{ color: `${sc.color}88` }}>Resultados por Rodada</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[...rounds].reverse().map((round, revIdx) => {
                  const fromEnd = revIdx;
                  const roundLabel = fromEnd === 0 ? '?? FINAL' : fromEnd === 1 ? 'SEMIFINAIS' : fromEnd === 2 ? 'QUARTAS DE FINAL' : fromEnd === 3 ? 'OITAVAS' : `R${round.filter(m => !m.isBye).length * 2}`;
                  return (
                    <div key={revIdx}>
                      <div style={{
                        fontFamily: "'Space Mono',monospace", fontSize: 7, letterSpacing: '.45em',
                        color: fromEnd === 0 ? sc.color : 'rgba(255,255,255,.25)',
                        textTransform: 'uppercase', marginBottom: 8,
                        borderLeft: `3px solid ${fromEnd === 0 ? sc.color : 'rgba(255,255,255,.08)'}`,
                        paddingLeft: 10,
                      }}>{roundLabel}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {round.filter(m => !m.isBye && m.playerA && m.playerB).map((m, mi) => {
                          const wa = m.winner?.id === m.playerA?.id;
                          const msd = m.result?.setsDetail ?? [];
                          const isChampMatch = m.winner?.id === champion?.id && fromEnd === 0;
                          return (
                            <div key={mi} style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '9px 14px',
                              background: isChampMatch ? `${sc.color}0a` : 'rgba(255,255,255,.02)',
                              border: `1px solid ${isChampMatch ? `${sc.color}22` : 'rgba(255,255,255,.05)'}`,
                            }}>
                              <div style={{
                                flex: 1, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700,
                                fontSize: 13, textTransform: 'uppercase', letterSpacing: '.04em',
                                color: wa ? (fromEnd === 0 ? sc.color : '#fff') : 'rgba(255,255,255,.38)',
                              }}>{m.playerA?.name}</div>
                              <div style={{ display: 'flex', gap: 3 }}>
                                {msd.map(([a, b], si) => (
                                  <div key={si} style={{
                                    fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800,
                                    fontSize: 13, minWidth: 16, textAlign: 'center',
                                    color: a > b ? (wa ? (fromEnd === 0 ? sc.color : 'rgba(255,255,255,.7)') : 'rgba(255,255,255,.5)') : 'rgba(255,255,255,.18)',
                                  }}>{a}</div>
                                ))}
                              </div>
                              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, color: 'rgba(255,255,255,.15)' }}>vs</div>
                              <div style={{ display: 'flex', gap: 3 }}>
                                {msd.map(([a, b], si) => (
                                  <div key={si} style={{
                                    fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800,
                                    fontSize: 13, minWidth: 16, textAlign: 'center',
                                    color: b > a ? (!wa ? (fromEnd === 0 ? sc.color : 'rgba(255,255,255,.7)') : 'rgba(255,255,255,.5)') : 'rgba(255,255,255,.18)',
                                  }}>{b}</div>
                                ))}
                              </div>
                              <div style={{
                                flex: 1, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700,
                                fontSize: 13, textTransform: 'uppercase', letterSpacing: '.04em',
                                textAlign: 'right',
                                color: !wa ? (fromEnd === 0 ? sc.color : '#fff') : 'rgba(255,255,255,.38)',
                              }}>{m.playerB?.name}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ---------- TAB: JORNALISMO ---------- */}
          {tab === 'press' && (() => {
            const feed = state?.newsEngine?.feed ?? [];
            const upcomingTournament = CALENDAR[state?.calendarIndex] ?? null;
            const tourneyArticles = feed.filter(a =>
              a.tournament?.id === tournament?.id ||
              (
                upcomingTournament &&
                a.tournament?.id === upcomingTournament.id &&
                (a.type === 'PREVIEW' || a.type === 'PREDICTION')
              ) ||
              (a.player?.id === champion?.id && a.year === state?.year && !a.tournament)
            );

            const TYPE_PRIORITY = { CHAMPION:0, RECORD:1, EPIC_MATCH:1, UPSET:2, RIVALRY:2, INJURY:3, PROSPECT:3, PREVIEW:4, PREDICTION:4, ANALYSIS:5, TOURNAMENT_WRAP:6, RUMOR:7, COLUMN:8 };
            const sorted = [...tourneyArticles].sort((a,b) => (TYPE_PRIORITY[a.type]??9) - (TYPE_PRIORITY[b.type]??9));

            const TYPE_META = {
              CHAMPION:        { icon: '🎾', label: 'Campeão',       color: '#E8C84A' },
              UPSET:           { icon: '🏆', label: 'Zebra',         color: '#FF6B35' },
              EPIC_MATCH:      { icon: '🎾', label: 'Duelo —pico',   color: '#EF5350' },
              RIVALRY:         { icon: '🎾', label: 'Rivalidade',    color: '#E040FB' },
              RECORD:          { icon: '🎾', label: 'Recorde',       color: '#2ECC71' },
              INJURY:          { icon: '🎾', label: 'Les—o',         color: '#F44336' },
              COMEBACK:        { icon: '🎾', label: 'Retorno',       color: '#00BCD4' },
              PROSPECT:        { icon: '🎾', label: 'Revela——o',     color: '#66BB6A' },
              RETIREMENT:      { icon: '🎾', label: 'Aposentadoria', color: '#90A4AE' },
              ANALYSIS:        { icon: '🎾', label: 'An—lise',       color: '#4A90D9' },
              COLUMN:          { icon: '🎾', label: 'Coluna',        color: '#D4A017' },
              RUMOR:           { icon: '🎾', label: 'Rumor',         color: '#AB47BC' },
              TOURNAMENT_WRAP: { icon: '🎾', label: 'Balanão',       color: '#5CB8E4' },
              SPONSOR_ELITE:   { icon: '🎾', label: 'Patroc—nio',    color: '#FFD700' },
              SPONSOR:         { icon: '🎾', label: 'Patroc—nio',    color: '#60C8FF' },
            };

            if (sorted.length === 0) {
              return (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '40px' }}>
                  <div style={{ fontSize: 36, opacity: 0.25 }}>??</div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: '.3em', color: 'rgba(255,255,255,.2)', textTransform: 'uppercase' }}>
                    Nenhum artigo encontrado
                  </div>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: 'rgba(255,255,255,.18)', textAlign: 'center', maxWidth: 320 }}>
                    Os artigos s—o gerados automaticamente após cada torneio e aparecem aqui na pr—xima abertura da cerim—nia.
                  </div>
                </div>
              );
            }

            return (
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ marginBottom: 6 }}>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, letterSpacing: '.35em', color: 'rgba(255,255,255,.22)', textTransform: 'uppercase' }}>
                    {sorted.length} artigo{sorted.length !== 1 ? 's' : ''} — {tournament?.name}
                  </div>
                </div>

                {sorted.map((art, idx) => {
                  const meta = TYPE_META[art.type] ?? { icon: '🎾', label: art.type, color: '#888' };
                  const j = typeof art.journalist === 'object' ? art.journalist : null;
                  const jName  = j?.name ?? (typeof art.journalist === 'string' ? art.journalist : '');
                  const jIcon  = j?.icon  ?? '';
                  const jColor = j?.color ?? meta.color;
                  const isExpanded = expandedId === (art.id ?? idx);
                  const isWrap = art.type === 'TOURNAMENT_WRAP';

                  return (
                    <div
                      key={art.id ?? idx}
                      onClick={() => setExpandedId(isExpanded ? null : (art.id ?? idx))}
                      style={{
                        padding: '13px 16px',
                        background: isExpanded ? `${meta.color}0c` : 'rgba(255,255,255,.025)',
                        border: `1px solid ${isExpanded ? meta.color+'44' : 'rgba(255,255,255,.06)'}`,
                        borderLeft: `3px solid ${meta.color}`,
                        cursor: 'pointer',
                        transition: 'background .12s, border .12s',
                        animation: `_cer_rise .3s ease ${Math.min(idx*.04,.4)}s backwards`,
                      }}
                    >
                      {/* Topo do card */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                          padding: '3px 7px',
                          background: `${meta.color}18`, border: `1px solid ${meta.color}33`,
                        }}>
                          <span style={{ fontSize: 10 }}>{meta.icon}</span>
                          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 6, color: meta.color, letterSpacing: '.18em', textTransform: 'uppercase' }}>{meta.label}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700,
                            fontSize: 16, color: '#fff', lineHeight: 1.2, letterSpacing: '.03em',
                          }}>{art.headline}</div>
                          {art.deck && !isExpanded && (
                            <div style={{ fontFamily: "'Crimson Pro',Georgia,serif", fontSize: 13, color: 'rgba(255,255,255,.45)', marginTop: 3, lineHeight: 1.35 }}>{art.deck}</div>
                          )}
                        </div>
                        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: 'rgba(255,255,255,.2)', flexShrink: 0, marginTop: 2 }}>
                          {isExpanded ? '?' : '?'}
                        </div>
                      </div>

                      {/* Corpo expandido */}
                      {isExpanded && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${meta.color}22` }}>
                          {art.deck && (
                            <div style={{ fontFamily: "'Crimson Pro',Georgia,serif", fontSize: 14, color: 'rgba(255,255,255,.6)', marginBottom: 10, lineHeight: 1.5, fontStyle: 'italic' }}>
                              {art.deck}
                            </div>
                          )}
                          <div style={{ fontFamily: "'Crimson Pro',Georgia,serif", fontSize: 15, color: 'rgba(242,237,228,.82)', lineHeight: 1.78 }}>
                            {art.body}
                          </div>
                          {isWrap && art.wrapData?.heat && (
                            <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                              <div>
                                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 6, color: 'rgba(255,255,255,.3)', letterSpacing: '.2em', marginBottom: 2 }}>HEAT M—DIO</div>
                                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 26, color: '#FF9944', lineHeight: 1 }}>{art.wrapData.heat.avg}</div>
                              </div>
                              <div>
                                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 6, color: 'rgba(255,255,255,.3)', letterSpacing: '.2em', marginBottom: 2 }}>TIER</div>
                                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 14, color: 'rgba(255,255,255,.55)' }}>{art.wrapData.heat.tier}</div>
                              </div>
                              {art.wrapData.injured?.length > 0 && (
                                <div>
                                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 6, color: 'rgba(255,255,255,.3)', letterSpacing: '.2em', marginBottom: 2 }}>LESIONADOS</div>
                                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 14, color: '#EF5350' }}>{art.wrapData.injured.length}</div>
                                </div>
                              )}
                            </div>
                          )}
                          {isWrap && (art.wrapData?.aftermath?.meaning || art.wrapData?.aftermath?.nextHook) && (
                            <div style={{ marginTop: 12, padding: '12px 14px', background: 'linear-gradient(180deg, rgba(92,184,228,.08), rgba(255,255,255,.02))', border: '1px solid rgba(92,184,228,.18)', borderLeft: '3px solid rgba(92,184,228,.55)' }}>
                              {art.wrapData?.aftermath?.meaning && (
                                <div style={{ marginBottom: art.wrapData?.aftermath?.nextHook ? 10 : 0 }}>
                                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 6, color: 'rgba(92,184,228,.8)', letterSpacing: '.22em', marginBottom: 4, textTransform: 'uppercase' }}>O que este torneio significou</div>
                                  <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'rgba(255,255,255,.8)', lineHeight: 1.55 }}>{art.wrapData.aftermath.meaning}</div>
                                </div>
                              )}
                              {art.wrapData?.aftermath?.nextHook && (
                                <div>
                                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 6, color: 'rgba(255,255,255,.36)', letterSpacing: '.22em', marginBottom: 4, textTransform: 'uppercase' }}>O que muda agora</div>
                                  <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: '#fff', lineHeight: 1.55 }}>{art.wrapData.aftermath.nextHook}</div>
                                </div>
                              )}
                            </div>
                          )}
                          {art.tags?.length > 0 && (
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
                              {art.tags.slice(0,6).map((tag,ti) => (
                                <span key={ti} style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, color: 'rgba(255,255,255,.28)', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', padding: '2px 6px', letterSpacing: '.1em' }}>#{tag}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Rodap— jornalista */}
                      {jName && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 7 }}>
                          <span style={{ fontSize: 10 }}>{jIcon}</span>
                          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, color: jColor, letterSpacing: '.12em', opacity: 0.65 }}>{jName}</span>
                          {art.year && <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, color: 'rgba(255,255,255,.15)', letterSpacing: '.1em', marginLeft: 3 }}>{art.year}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

        </div>{/* -- END CONTENT -- */}

        <div style={{ borderTop:'1px solid rgba(79,59,35,.22)', padding:'11px 24px', display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:12, alignItems:'center', background:'rgba(255,255,255,.24)', flexShrink:0 }}>
          <button disabled={page === 0} onClick={() => setPage(value => Math.max(0, value - 1))} style={{ justifySelf:'start', fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.15em', textTransform:'uppercase', padding:'9px 12px', cursor:page === 0 ? 'default' : 'pointer', opacity:page === 0 ? .35 : 1, background:'transparent', border:'1px solid rgba(79,59,35,.25)' }}>← página anterior</button>
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:7, letterSpacing:'.18em', textTransform:'uppercase', color:'#6D5B43' }}>{currentPage.kicker} · {page + 1}/{PAGES.length}</div>
          {page < PAGES.length - 1 ? <button onClick={() => setPage(value => Math.min(PAGES.length - 1, value + 1))} style={{ justifySelf:'end', fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.15em', textTransform:'uppercase', padding:'9px 12px', cursor:'pointer', background:`${sc.color}16`, border:`1px solid ${sc.color}66` }}>próxima página →</button> : <button onClick={onClose} style={{ justifySelf:'end', fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.15em', textTransform:'uppercase', padding:'9px 12px', cursor:'pointer', background:`${sc.color}16`, border:`1px solid ${sc.color}66` }}>fechar edição →</button>}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// buildCompactClips — selects 5 essential moments from allClips
// -----------------------------------------------------------------------------
function buildCompactClips(allClips) {
  if (!allClips?.length) return [];
  if (allClips.length <= 5) return allClips;

  const used = new Set();
  const result = [];

  function add(clip, reason = '?') {
    if (!clip || used.has(clip.chronIdx)) return false;
    used.add(clip.chronIdx);
    result.push({ ...clip, _selectionReason: reason });
    return true;
  }

  // 1. First notable moment (skip generic low-priority types)
  const SKIP = ['GAME_POINT', 'BREAK_POINT'];
  add(
    allClips.find(c => !SKIP.includes(c.type)) ?? allClips[0],
    'primeiro momento not—vel'
  );

  // 2. Best rally (longest — threshold aligned with new RALLY_EPIC = 10)
  const bestRally = [...allClips]
    .filter(c => c.rallyLength >= 7)
    .sort((a, b) => b.rallyLength - a.rallyLength)[0];
  if (bestRally) add(bestRally, `melhor rally (${bestRally.rallyLength} bolas)`);

  // 3. Most dramatic non-terminal moment (highest priority, not match/final).
  //    BREAK_POINT: only converted ones (break real) — saved break points s—o enganosos.
  //    Prefer converted moments as a tiebreaker for all other types.
  const dramatic = [...allClips]
    .filter(c => {
      if (used.has(c.chronIdx)) return false;
      if (['MATCH_POINT','FINAL_POINT','GAME_POINT'].includes(c.type)) return false;
      if (c.type === 'BREAK_POINT' && c.pointWinnerIdx !== c.momentHolderIdx) return false;
      return true;
    })
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      const aConv = (a.pointWinnerIdx === a.momentHolderIdx) ? 0 : 1;
      const bConv = (b.pointWinnerIdx === b.momentHolderIdx) ? 0 : 1;
      return aConv - bConv;
    })[0];
  if (dramatic) add(dramatic, `momento mais dram—tico (prioridade ${dramatic?.priority})`);

  // 4. Last match point save (drama of the near-miss) + the converted match point.
  //    If all match points were converted on first try, just show last two.
  const mps = allClips.filter(c => c.type === 'MATCH_POINT');
  const convertedMps = mps.filter(c => c.pointWinnerIdx === c.momentHolderIdx);
  const savedMps     = mps.filter(c => c.pointWinnerIdx !== c.momentHolderIdx);
  if (savedMps.length > 0 && convertedMps.length > 0) {
    add(savedMps[savedMps.length - 1],      '—ltimo match point salvo (tensão)');
    add(convertedMps[convertedMps.length - 1], 'match point convertido (vencedor)');
  } else {
    for (const mp of mps.slice(-2)) add(mp, 'match point');
  }

  // 5. Final point (always last)
  add(allClips[allClips.length - 1], 'ponto final da partida');

  return result.sort((a, b) => a.chronIdx - b.chronIdx);
}

// buildHighlightsClips — curated middle ground: all decisive moments, no filler
// Strategy: everything that changes tension. GAME_POINT excluded (too routine).
// Break points capped so a hold-fest doesn't flood the reel.
// SET_POINT: only shows converted ones (holder won the point) — unconverted set
// points that were saved/lost are confusing and misleading to the viewer.
// -----------------------------------------------------------------------------
function buildHighlightsClips(allClips) {
  if (!allClips?.length) return [];

  const HIGH_PRI   = ['MATCH_POINT', 'FINAL_POINT', 'FIFTH_SET_OPENER',
                      'EPIC_RALLY_CLUTCH', 'TIEBREAK_CRITICAL'];
  const MEDIUM_PRI = ['SET_POINT', 'EPIC_RALLY'];
  // BREAK_POINT: apenas convertidos
  // GAME_POINT: nunca

  const result = [];
  const used   = new Set();

  function add(clip, reason) {
    if (!clip || used.has(clip.chronIdx)) return false;
    used.add(clip.chronIdx);
    result.push({ ...clip, _selectionReason: reason });
    return true;
  }

  // 1. All HIGH priority — always keep every one
  for (const c of allClips) {
    if (HIGH_PRI.includes(c.type)) add(c, `alta prioridade (${c.type})`);
  }

  // 2. MEDIUM priority
  //    SET_POINT: only converted ones (holder won the point), cap 1 per set.
  //    If no converted set point exists for a set, show the last one anyway
  //    (dramatic even if saved).
  //    EPIC_RALLY: all.
  const spBySet = {};
  for (const c of allClips) {
    if (c.type !== 'SET_POINT' || used.has(c.chronIdx)) continue;
    const key = `${c.s0}-${c.s1}`;
    if (!spBySet[key]) spBySet[key] = { converted: [], saved: [] };
    const wasConverted = c.pointWinnerIdx === c.momentHolderIdx;
    if (wasConverted) spBySet[key].converted.push(c);
    else              spBySet[key].saved.push(c);
  }
  for (const { converted, saved } of Object.values(spBySet)) {
    // Prefer converted: show last converted set point (the winning moment).
    const toShow = converted.length > 0
      ? converted[converted.length - 1]
      : saved[saved.length - 1]; // fallback: last saved (still dramatic context)
    const spReason = converted.length > 0 ? 'set point convertido' : 'set point (fallback — nenhum convertido)';
    if (toShow) add(toShow, spReason);
  }
  for (const c of allClips) {
    if (c.type === 'EPIC_RALLY' && !used.has(c.chronIdx)) add(c, `rally —pico (${c.rallyLength} bolas)`);
  }

  // 3. BREAK_POINT — somente breaks CONVERTIDOS (receiver venceu o ponto = break real)
  //    Break points salvos s—o enganosos no replay ao vivo: o ponto pode divergir
  //    da simula——o original, mostrando um "break point" sem break na tela.
  //    Cap: 1 por set, m—ximo 3 total. Prefer—ncia: mais tarde no set (mais pressão).
  const bpBySet = {};
  const bpConverted = allClips
    .filter(c =>
      c.type === 'BREAK_POINT' &&
      !used.has(c.chronIdx) &&
      c.pointWinnerIdx === c.momentHolderIdx // apenas breaks reais
    )
    .sort((a, b) => (b.g0 + b.g1) - (a.g0 + a.g1)); // mais tarde no set = mais pressão
  let bpTotal = 0;
  for (const c of bpConverted) {
    if (bpTotal >= 3) break;
    const setKey = `${c.s0}-${c.s1}`;
    if ((bpBySet[setKey] ?? 0) >= 1) continue;
    add(c, `break convertido — games ${c.g0}—${c.g1} no set`);
    bpBySet[setKey] = (bpBySet[setKey] ?? 0) + 1;
    bpTotal++;
  }

  // 4. Ensure FINAL_POINT is always included
  const last = allClips[allClips.length - 1];
  if (last) add(last);

  return result.sort((a, b) => a.chronIdx - b.chronIdx);
}

function getMatchWinnerIdxV2(result) {
  const sets = result?.sets ?? [0, 0];
  return (sets[0] ?? 0) > (sets[1] ?? 0) ? 0 : 1;
}

function clipSetNumberV2(clip) {
  return (clip?.s0 ?? 0) + (clip?.s1 ?? 0) + 1;
}

function clipGamesTotalV2(clip) {
  return (clip?.g0 ?? 0) + (clip?.g1 ?? 0);
}

function clipIsDecidingSetV2(clip, result) {
  const totalSetsPlayed = (result?.setsDetail ?? []).length || ((result?.sets?.[0] ?? 0) + (result?.sets?.[1] ?? 0));
  return clipSetNumberV2(clip) >= Math.max(1, totalSetsPlayed);
}

function clipPlayerNameV2(clip, idx) {
  const player = clip?.gsSnapshot?.players?.[idx] ?? clip?.serveSnapshot?.players?.[idx];
  return player?.name ?? (idx === clip?.serverIdx ? clip?.serverName : clip?.receiverName) ?? 'Jogador';
}

function clipOutcomeV2(clip) {
  if (!clip) return 'neutral';
  if (['FINAL_POINT', 'EPIC_RALLY', 'EPIC_RALLY_CLUTCH', 'TIEBREAK_CRITICAL', 'FIFTH_SET_OPENER'].includes(clip.type)) {
    return 'neutral';
  }
  if (clip.pointWinnerIdx == null || clip.momentHolderIdx == null) return 'neutral';
  return clip.pointWinnerIdx === clip.momentHolderIdx ? 'converted' : 'saved';
}

function clipOutcomeLineV2(clip) {
  if (!clip) return null;
  const outcome = clip._outcome ?? clipOutcomeV2(clip);
  const holder = clipPlayerNameV2(clip, clip.momentHolderIdx);
  const saver = clipPlayerNameV2(clip, clip.pointWinnerIdx);
  if (clip.type === 'BREAK_POINT') {
    return outcome === 'converted'
      ? `Break point convertido por ${holder} - ${clip.score ?? ''}`.trim()
      : `Break point salvo por ${saver} - ${clip.score ?? ''}`.trim();
  }
  if (clip.type === 'SET_POINT') {
    return outcome === 'converted'
      ? `Set point convertido por ${holder} - ${clip.score ?? ''}`.trim()
      : `Set point salvo por ${saver} - ${clip.score ?? ''}`.trim();
  }
  if (clip.type === 'MATCH_POINT') {
    return outcome === 'converted'
      ? `Match point convertido por ${holder} - ${clip.score ?? ''}`.trim()
      : `Match point salvo por ${saver} - ${clip.score ?? ''}`.trim();
  }
  return clip.contextLine ?? null;
}

function normalizeClipForReelV2(clip, reason = null) {
  if (!clip) return null;
  const outcome = clip._outcome ?? clipOutcomeV2(clip);
  const contextLine = clipOutcomeLineV2({ ...clip, _outcome: outcome }) ?? clip.contextLine;
  const labelSuffix = outcome === 'saved' ? ' SALVO' : outcome === 'converted' ? ' CONVERTIDO' : '';
  const shouldSuffix = ['BREAK_POINT', 'SET_POINT', 'MATCH_POINT'].includes(clip.type) && !String(clip.label ?? '').includes(labelSuffix.trim());
  return {
    ...clip,
    _outcome: outcome,
    _selectionReason: reason ?? clip._selectionReason,
    contextLine,
    label: shouldSuffix ? `${clip.label}${labelSuffix}` : clip.label,
  };
}

function normalizeClipListForReelV2(allClips) {
  return (allClips ?? [])
    .map((clip) => normalizeClipForReelV2(clip))
    .filter(Boolean)
    .sort((a, b) => (a.chronIdx ?? 0) - (b.chronIdx ?? 0));
}

// O headless entrega o que aconteceu ponto a ponto. Esta camada transforma
// esses fatos em uma leitura editorial que o reel e o bracket podem reutilizar.
function buildReelMatchStory(result, allClips, playerA, playerB, tournament = null) {
  const clips = normalizeClipListForReelV2(allClips);
  const directedStory = buildDynamicHighlightStory(clips, result, playerA, playerB);
  const winnerIdx = getMatchWinnerIdxV2(result);
  const winner = winnerIdx === 0 ? playerA : playerB;
  const loser = winnerIdx === 0 ? playerB : playerA;
  const details = result?.setsDetail ?? [];
  const closeSets = details.filter(([a, b]) => Math.abs(a - b) <= 1).length;
  const decidingSet = details.length >= 3 && details[details.length - 1];
  const converted = clips.filter(c => (c._outcome ?? clipOutcomeV2(c)) === 'converted');
  const winnerMoments = converted.filter(c => c.pointWinnerIdx === winnerIdx);
  const swing = [...winnerMoments]
    .filter(c => ['BREAK_POINT', 'SET_POINT', 'TIEBREAK_CRITICAL', 'EPIC_RALLY_CLUTCH'].includes(c.type))
    .sort((a, b) => clipNarrativeScoreV2(b, result) - clipNarrativeScoreV2(a, result))[0] ?? null;
  const rally = [...clips]
    .filter(c => (c.rallyLength ?? 0) >= 8)
    .sort((a, b) => (b.rallyLength ?? 0) - (a.rallyLength ?? 0))[0] ?? null;
  const final = clips.findLast?.(c => c.type === 'FINAL_POINT') ?? clips[clips.length - 1] ?? null;
  const scoreline = details.map(([a, b]) => `${a}–${b}`).join(', ');
  const tournamentLabel = tournament?.name ? ` no ${tournament.name}` : '';
  const tension = decidingSet || closeSets >= 2 || clips.some(c => c.type === 'TIEBREAK_CRITICAL')
    ? 'uma partida que mudou de mão sob pressão'
    : 'uma atuação que encontrou seu rumo cedo e sustentou a vantagem';
  const turningLine = swing
    ? `${winner?.name ?? 'O vencedor'} tomou a partida num ${String(swing.label ?? 'momento decisivo').toLowerCase()}${swing.contextLine ? `: ${swing.contextLine}` : ''}.`
    : `${winner?.name ?? 'O vencedor'} construiu a vantagem sem conceder uma virada limpa.`;
  const rallyLine = rally
    ? `A assinatura foi um rally de ${rally.rallyLength} bolas, o ponto que deu corpo ao confronto.`
    : 'A assinatura foi a capacidade de transformar os poucos pontos grandes em vantagem real.';
  const headline = `${winner?.name ?? 'Vencedor'} vence ${loser?.name ?? 'o rival'}${tournamentLabel}`;

  const topMoments = directedStory.chapters.map((chapter) => ({
    type: chapter.kind,
    title: chapter.title,
    oneLine: chapter.resolution,
    setup: chapter.setup,
    weight: chapter.montage
      ? 1 + Math.min(.25, Number(chapter.montage.weight ?? 0) / 500)
      : chapter.kind === 'MATCH_POINT' ? 1 : chapter.kind === 'SET_POINT' ? .9 : .75,
    clipChronIdx: chapter.chronIdx,
  }));
  const definingChapter = [...directedStory.chapters]
    .filter((chapter) => chapter.montage?.playerIdx === winnerIdx)
    .sort((a, b) => (b.montage?.weight ?? 0) - (a.montage?.weight ?? 0))[0] ?? null;

  const dossier = {
    headline,
    thesis: definingChapter
      ? `${winner?.name ?? 'O vencedor'} venceu depois de protagonizar o capítulo decisivo: ${definingChapter.title.toLowerCase()}.`
      : `${winner?.name ?? 'O vencedor'} saiu com ${tension}.`,
    fullReport: `${headline}. ${topMoments.map(moment => moment.oneLine).join(' ') || `${turningLine} ${rallyLine}`}`,
    tags: [decidingSet ? 'DECISIVO' : null, closeSets ? 'TENSÃO' : null, rally ? 'RALLIES' : null].filter(Boolean),
    heatScore: result?.heat?.peak ? Math.max(0, Math.min(1, result.heat.peak / 100)) : 0,
    mode: 'sim-highlights',
    topMoments,
    meta: { scoreline, closeSets, hasDecidingSet: !!decidingSet, clipCount: directedStory.clips.length },
  };
  return {
    ...result,
    matchNarrativeDossier: dossier,
    matchStoryCapsules: [{ type: 'headline', title: headline, oneLine: dossier.thesis, weight: 1 }, ...topMoments],
  };
}

function clipNarrativeScoreV2(clip, result) {
  if (!clip) return -Infinity;
  let score = clip.priority ?? 0;

  const winnerIdx = getMatchWinnerIdxV2(result);
  const momentConverted = (clip._outcome ?? clipOutcomeV2(clip)) === 'converted';
  const momentSaved = (clip._outcome ?? clipOutcomeV2(clip)) === 'saved';
  const pointWonByMatchWinner = clip.pointWinnerIdx === winnerIdx;
  const momentOwnedByMatchWinner = clip.momentHolderIdx === winnerIdx;
  const gamesTotal = clipGamesTotalV2(clip);
  const lateSet = gamesTotal >= 8;
  const veryLateSet = gamesTotal >= 10;
  const decidingSet = clipIsDecidingSetV2(clip, result);
  const trailingHolder =
    (clip.momentHolderIdx === 0 && (clip.s0 ?? 0) < (clip.s1 ?? 0)) ||
    (clip.momentHolderIdx === 1 && (clip.s1 ?? 0) < (clip.s0 ?? 0));

  if (pointWonByMatchWinner) score += 5;
  if (momentOwnedByMatchWinner) score += 4;
  if (momentConverted) score += 8;
  if (momentSaved) score += clip.type === 'MATCH_POINT' ? 10 : 2;
  if (lateSet) score += 7;
  if (veryLateSet) score += 5;
  if (decidingSet) score += 12;
  if (clipSetNumberV2(clip) >= 3) score += 4;
  if (trailingHolder) score += 8;
  if ((clip.rallyLength ?? 0) >= 10) score += Math.min(16, clip.rallyLength ?? 0);

  switch (clip.type) {
    case 'FINAL_POINT':       score += 100; break;
    case 'MATCH_POINT':       score += momentConverted ? 42 : 34; break;
    case 'FIFTH_SET_OPENER':  score += 26; break;
    case 'EPIC_RALLY_CLUTCH': score += 28; break;
    case 'TIEBREAK_CRITICAL': score += 22; break;
    case 'SET_POINT':         score += momentConverted ? 20 : 10; break;
    case 'BREAK_POINT':       score += momentConverted ? 18 : 0; break;
    case 'EPIC_RALLY':        score += 14; break;
    case 'GAME_POINT':        score -= 26; break;
    default: break;
  }

  return score;
}

function findMomentumSwingClipV2(allClips, result, used = new Set()) {
  const winnerIdx = getMatchWinnerIdxV2(result);
  return [...allClips]
    .filter(c => {
      if (!c || used.has(c.chronIdx)) return false;
      if (['FINAL_POINT', 'MATCH_POINT', 'GAME_POINT'].includes(c.type)) return false;
      if (c.pointWinnerIdx !== winnerIdx) return false;
      if (c.type === 'BREAK_POINT' && c._outcome === 'saved' && !savedBreakPointIsBroadcastWorthyV2(c, result)) return false;
      return (
        c.type === 'BREAK_POINT' ||
        c.type === 'SET_POINT' ||
        c.type === 'EPIC_RALLY_CLUTCH' ||
        c.type === 'TIEBREAK_CRITICAL' ||
        (c.rallyLength ?? 0) >= 9
      );
    })
    .sort((a, b) => clipNarrativeScoreV2(b, result) - clipNarrativeScoreV2(a, result))[0] ?? null;
}

function buildCompactClipsV2(allClips, result) {
  const clips = normalizeClipListForReelV2(allClips);
  if (!clips.length) return [];
  return clips
    .filter((clip) => {
      if (!['BREAK_POINT', 'SET_POINT', 'MATCH_POINT', 'FINAL_POINT'].includes(clip?.type)) return false;
      if (clip.type === 'FINAL_POINT') return true;
      return (clip._outcome ?? clipOutcomeV2(clip)) === 'converted';
    })
    .map((clip) => ({
      ...clip,
      _selectionReason:
        clip.type === 'BREAK_POINT'
          ? 'break point convertido'
          : clip.type === 'SET_POINT'
            ? 'set point convertido'
            : clip.type === 'FINAL_POINT'
              ? 'ponto final / match point convertido'
              : 'match point convertido',
    }))
    .sort((a, b) => a.chronIdx - b.chronIdx);
}

function pickBestClipInRangeV2(allClips, startRatio, endRatio, result, used, predicate = () => true) {
  if (!allClips?.length) return null;
  const startIdx = Math.max(0, Math.floor(allClips.length * startRatio));
  const endIdx = Math.min(allClips.length, Math.max(startIdx + 1, Math.ceil(allClips.length * endRatio)));
  return allClips
    .slice(startIdx, endIdx)
    .filter((clip) => !used.has(clip.chronIdx) && predicate(clip))
    .sort((a, b) => clipNarrativeScoreV2(b, result) - clipNarrativeScoreV2(a, result))[0] ?? null;
}

function savedBreakPointIsBroadcastWorthyV2(clip, result) {
  if (!clip || clip.type !== 'BREAK_POINT' || clip._outcome !== 'saved') return false;
  return clipGamesTotalV2(clip) >= 8 ||
    clipIsDecidingSetV2(clip, result) ||
    (clip.rallyLength ?? 0) >= 8 ||
    /TB|Ad|40/i.test(String(clip.score ?? ''));
}

function clipAllowedInBroadcastHighlightsV2(clip, result, allowGamePointFallback = false) {
  if (!clip) return false;
  if (clip.type === 'GAME_POINT') return allowGamePointFallback;
  if (clip.type === 'BREAK_POINT' && clip._outcome === 'saved') {
    return savedBreakPointIsBroadcastWorthyV2(clip, result);
  }
  if (clip.type === 'SET_POINT' && clip._outcome === 'saved') {
    return clipGamesTotalV2(clip) >= 8 || clipIsDecidingSetV2(clip, result) || (clip.rallyLength ?? 0) >= 7;
  }
  return true;
}

function buildHighlightsBroadcastClipsV2(allClips, result) {
  const clips = normalizeClipListForReelV2(allClips);
  if (!clips.length) return [];
  const selected = [];
  const used = new Set();
  // Um único corte: curto o bastante para não cansar, mas com espaço para
  // apresentar a partida, mostrar a virada e entregar o desfecho.
  const targetCount = Math.max(3, Math.min(15, Math.round(clips.length * .45)));
  function add(clip, reason) {
    if (!clip || used.has(clip.chronIdx)) return false;
    const normalized = normalizeClipForReelV2(clip, reason);
    if (!normalized) return false;
    used.add(clip.chronIdx);
    selected.push(normalized);
    return true;
  }
  const nonGameClips = clips.filter((clip) => clipAllowedInBroadcastHighlightsV2(clip, result, false));
  const candidateClips = nonGameClips.length ? nonGameClips : clips.filter((clip) => clipAllowedInBroadcastHighlightsV2(clip, result, true));
  const firstNotable = candidateClips.find((clip) => !['GAME_POINT', 'BREAK_POINT'].includes(clip.type)) ?? candidateClips[0];
  add(firstNotable, 'abertura da transmiss?o');
  add(
    pickBestClipInRangeV2(candidateClips, 0.08, 0.32, result, used, (clip) =>
      clipAllowedInBroadcastHighlightsV2(clip, result, false) &&
      (clipNarrativeScoreV2(clip, result) >= 58 || ['BREAK_POINT', 'SET_POINT', 'EPIC_RALLY', 'EPIC_RALLY_CLUTCH'].includes(clip.type))
    ),
    'primeiro sinal de tens?o'
  );
  add(findMomentumSwingClipV2(candidateClips, result, used), 'mudan?a de temperatura');
  add(
    [...candidateClips]
      .filter((clip) => !used.has(clip.chronIdx) && ((clip.rallyLength ?? 0) >= 8 || clip.type === 'EPIC_RALLY'))
      .sort((a, b) => clipNarrativeScoreV2(b, result) - clipNarrativeScoreV2(a, result))[0] ?? null,
    'rally assinatura da partida'
  );
  add(
    pickBestClipInRangeV2(candidateClips, 0.72, 0.96, result, used, (clip) =>
      clipAllowedInBroadcastHighlightsV2(clip, result, false) &&
      (['MATCH_POINT', 'SET_POINT', 'FINAL_POINT', 'TIEBREAK_CRITICAL'].includes(clip.type) ||
      clipNarrativeScoreV2(clip, result) >= 70
      )
    ),
    'cl?max antes do desfecho'
  );
  add(clips[clips.length - 1], 'fechamento da transmiss?o');
  if (selected.length < targetCount) {
    const filler = [...candidateClips]
      .filter((clip) => !used.has(clip.chronIdx))
      .sort((a, b) => clipNarrativeScoreV2(b, result) - clipNarrativeScoreV2(a, result));
    for (const clip of filler) {
      if (selected.length >= targetCount) break;
      add(clip, 'bloco complementar da edi??o');
    }
  }
  return selected
    .sort((a, b) => a.chronIdx - b.chronIdx)
    .slice(0, targetCount);
}
function buildHighlightsClipsV2(allClips, result) {
  return buildHighlightsBroadcastClipsV2(allClips, result);
}

function reelLineVariantV2(seed, variants) {
  const n = Math.abs(Number(seed ?? 0));
  return variants[n % variants.length];
}

function buildReelNarrativeBeatV2(clip, index, total, result) {
  const outcome = clip?._outcome ?? clipOutcomeV2(clip);
  const winnerName = result?.winner?.name?.split(' ').pop() ?? 'o vencedor';
  const holderName = clip?.momentHolderIdx === 0
    ? result?.gs?.players?.[0]?.name?.split(' ').pop()
    : result?.gs?.players?.[1]?.name?.split(' ').pop();
  const seed = (clip?.chronIdx ?? index) + index * 17;
  const isSaved = outcome === 'saved';

  if (index === 0) return {
    title: 'O primeiro aviso',
    line: reelLineVariantV2(seed, [
      'Antes do placar pesar, veio o primeiro ponto que mostrou onde a partida poderia quebrar.',
      'Toda partida começa silenciosa. Esta começou com um aviso.',
      'Ainda não era a virada, mas já era o tipo de ponto que muda o jeito de olhar o jogo.',
    ]),
  };
  if (index === total - 1 || clip?.type === 'FINAL_POINT') return {
    title: 'Quando não havia mais volta',
    line: reelLineVariantV2(seed, [
      `E então ${winnerName} encontrou o último espaço. O resto virou placar.`,
      `O último ponto não explicou tudo, mas colocou um ponto final na história de ${winnerName}.`,
      'Depois de tudo que a partida adiou, este foi o ponto que não deixou mais nada em aberto.',
    ]),
  };
  if (clip?.type === 'MATCH_POINT') return isSaved ? {
    title: 'O ponto que poderia ter acabado com tudo',
    line: reelLineVariantV2(seed, [
      'Era para ser o fim. Mas alguém se recusou a aceitar o roteiro.',
      'A linha de chegada apareceu cedo demais — e foi empurrada para longe.',
      'Por um instante a partida acabou. No ponto seguinte, ela nasceu de novo.',
    ]),
  } : {
    title: 'O ponto que passou a valer a partida',
    line: reelLineVariantV2(seed, [
      'Não era apenas mais uma bola. Era a chance de carregar a partida inteira para um lado.',
      'A quadra diminuiu, o barulho sumiu e a partida coube naquele ponto.',
      'Tudo o que veio antes levou até aqui: uma bola para decidir quem seguiria de pé.',
    ]),
  };
  if (clip?.type === 'SET_POINT') return isSaved ? {
    title: 'A porta que não se fechou',
    line: reelLineVariantV2(seed, [
      'O set esteve na mão. Depois, voltou a ser uma pergunta.',
      'A chance de fechar passou perto demais para não deixar cicatriz.',
      'Quando parecia resolvido, o jogo escolheu continuar respirando.',
    ]),
  } : {
    title: 'O ponto que mudou o peso do jogo',
    line: reelLineVariantV2(seed, [
      'Não decidiu a partida inteira, mas mudou tudo o que ela exigiria dali em diante.',
      'Um set pode ser só um set — até o momento em que ele muda a coragem de quem está do outro lado.',
      'A primeira grande fronteira da partida apareceu aqui.',
    ]),
  };
  if (clip?.type === 'BREAK_POINT') return isSaved ? {
    title: 'A ameaça que foi recusada',
    line: reelLineVariantV2(seed, [
      'A brecha apareceu. A resposta veio antes que ela virasse queda.',
      'Havia uma porta aberta para a virada. Ela foi fechada no último segundo.',
      'O jogo pediu fraqueza. A resposta foi sobrevivência.',
    ]),
  } : {
    title: 'O ponto que começou a decidir',
    line: reelLineVariantV2(seed, [
      'Foi aqui que a partida deixou de ser equilibrada e passou a ter direção.',
      'Não era o fim, mas era a primeira rachadura que realmente importava.',
      'Um break não fecha uma história. Às vezes, porém, é ele que escreve o começo do final.',
    ]),
  };
  if (clip?.type === 'TIEBREAK_CRITICAL') return {
    title: 'Quando cada bola ficou pesada',
    line: reelLineVariantV2(seed, [
      'No tie-break, não existe ponto pequeno. Este fez a quadra inteira prender a respiração.',
      'A partida já não aceitava erros comuns. Cada escolha passou a ter consequência.',
      'A margem desapareceu. Sobrou nervo, leitura e uma bola para sobreviver.',
    ]),
  };
  if ((clip?.rallyLength ?? 0) >= 8) return {
    title: 'A troca que deu alma ao jogo',
    line: reelLineVariantV2(seed, [
      `Foram ${clip.rallyLength} bolas para descobrir quem cederia primeiro.`,
      'Foi o tipo de rally que não muda apenas o placar: muda a confiança.',
      'Por alguns segundos, a partida inteira coube numa troca que ninguém quis abandonar.',
    ]),
  };
  return {
    title: holderName ? `O momento de ${holderName}` : 'Um capítulo da partida',
    line: 'Nem todo ponto entra na memória. Este entrou porque empurrou a história para o próximo capítulo.',
  };
}

function buildBroadcastChaptersV2(clips, result) {
  if (!clips?.length) return [];
  const chapterFor = (clip, index) => {
    return buildReelNarrativeBeatV2(clip, index, clips.length, result);
  };
  return clips.map((clip, index) => ({ ...chapterFor(clip, index), chronIdx: clip?.chronIdx, index }));
}

function reelDirectionForClipV2(clip) {
  const storyKind = clip?.story?.kind ?? clip?.pressureType ?? clip?.type;
  if (clip?.story?.montage) return { zoom: 1.032, accent: '#E8C84A', label: 'MONTAGEM', shake: 'medium', dim: .24 };
  const isFinal = ['MATCH_POINT', 'FINAL_POINT'].includes(storyKind);
  const isPressure = isFinal || ['SET_POINT', 'TIEBREAK_CRITICAL', 'BREAK_POINT', 'EPIC_RALLY_CLUTCH'].includes(storyKind);
  const isRally = (clip?.rallyLength ?? 0) >= 8;
  if (isFinal) return { zoom: 1.045, accent: '#FF5C6C', label: 'CLÍMAX', shake: 'heavy', dim: .30 };
  if (storyKind === 'TIEBREAK_CRITICAL') return { zoom: 1.035, accent: '#C84FEB', label: 'TIEBREAK', shake: 'medium', dim: .24 };
  if (storyKind === 'SET_POINT' || storyKind === 'BREAK_POINT') return { zoom: 1.026, accent: clip.color ?? '#FF9F43', label: 'PRESSÃO', shake: 'soft', dim: .18 };
  if (isRally) return { zoom: 1.012, accent: '#4FC3F7', label: 'RALLY', shake: 'soft', dim: .10 };
  if (isPressure) return { zoom: 1.02, accent: clip?.color ?? '#E8C84A', label: 'MOMENTO', shake: 'soft', dim: .14 };
  return { zoom: 1, accent: clip?.color ?? '#4A90D9', label: 'JOGO', shake: 'none', dim: .05 };
}

function clipGameKeyV2(clip) {
  if (!clip) return 'unknown';
  return `${clip.s0 ?? 0}-${clip.s1 ?? 0}:${clip.g0 ?? 0}-${clip.g1 ?? 0}`;
}

function scoreGameStoryBlockV2(group, result) {
  if (!group?.length) return -Infinity;
  const scores = group
    .map((clip) => clipNarrativeScoreV2(clip, result))
    .sort((a, b) => b - a);
  const importantCount = group.filter((clip) =>
    ['BREAK_POINT', 'SET_POINT', 'MATCH_POINT', 'FINAL_POINT', 'TIEBREAK_CRITICAL', 'EPIC_RALLY_CLUTCH'].includes(clip.type)
  ).length;
  const convertedCount = group.filter((clip) => (clip._outcome ?? clipOutcomeV2(clip)) === 'converted').length;
  const savedCount = group.filter((clip) => (clip._outcome ?? clipOutcomeV2(clip)) === 'saved').length;
  const longRallies = group.filter((clip) => (clip.rallyLength ?? 0) >= 8).length;
  const deuceLike = group.filter((clip) => /40|Ad|TB/i.test(String(clip.score ?? ''))).length;
  const decidingSet = group.some((clip) => clipIsDecidingSetV2(clip, result));
  const sameGameSwing = convertedCount > 0 && savedCount > 0;
  const climax = group.some((clip) => ['MATCH_POINT', 'FINAL_POINT', 'SET_POINT'].includes(clip.type));
  let score = 0;
  score += (scores[0] ?? 0);
  score += Math.round((scores[1] ?? 0) * 0.7);
  score += Math.min(28, group.length * 5);
  score += importantCount * 8;
  score += longRallies * 5;
  score += deuceLike * 4;
  if (sameGameSwing) score += 18;
  if (climax) score += 12;
  if (decidingSet) score += 14;
  return score;
}

function buildDeepGameStoryClipsV2(allClips, result) {
  const clips = normalizeClipListForReelV2(allClips);
  if (!clips.length) return [];
  if (clips.length <= 8) {
    return clips.map((clip) => ({ ...clip, _selectionReason: 'partida curta; story completo' }));
  }

  const sorted = [...clips].sort((a, b) => a.chronIdx - b.chronIdx);
  const groups = [];
  let current = [];
  let currentKey = null;

  for (const clip of sorted) {
    const key = clipGameKeyV2(clip);
    if (current.length === 0 || key === currentKey) {
      current.push(clip);
      currentKey = key;
    } else {
      groups.push(current);
      current = [clip];
      currentKey = key;
    }
  }
  if (current.length) groups.push(current);

  const scoredGroups = groups.map((group, idx) => ({
    idx,
    group,
    score: scoreGameStoryBlockV2(group, result),
  }));

  const chosenGroupIdx = new Set();
  const takeTopGroups = Math.min(5, Math.max(3, Math.round(sorted.length / 10)));

  for (const entry of scoredGroups.sort((a, b) => b.score - a.score)) {
    if (chosenGroupIdx.size >= takeTopGroups) break;
    const hasNarrativeWeight = entry.group.some((clip) =>
      clipNarrativeScoreV2(clip, result) >= 70 ||
      ['BREAK_POINT', 'SET_POINT', 'MATCH_POINT', 'FINAL_POINT', 'TIEBREAK_CRITICAL', 'EPIC_RALLY_CLUTCH'].includes(clip.type)
    );
    if (!hasNarrativeWeight) continue;
    chosenGroupIdx.add(entry.idx);
  }

  const finalClip = sorted[sorted.length - 1];
  const finalGroupIdx = groups.findIndex((group) => group.some((clip) => clip.chronIdx === finalClip?.chronIdx));
  if (finalGroupIdx >= 0) chosenGroupIdx.add(finalGroupIdx);

  const swing = findMomentumSwingClipV2(sorted, result, new Set());
  const swingGroupIdx = groups.findIndex((group) => group.some((clip) => clip.chronIdx === swing?.chronIdx));
  if (swingGroupIdx >= 0) chosenGroupIdx.add(swingGroupIdx);

  const selected = [];
  for (const idx of [...chosenGroupIdx].sort((a, b) => a - b)) {
    const group = groups[idx];
    if (!group?.length) continue;
    const topType = [...group]
      .sort((a, b) => clipNarrativeScoreV2(b, result) - clipNarrativeScoreV2(a, result))[0];
    const reason = group.length >= 3
      ? `bloco de game (${group.length} pontos) em torno de ${topType?.type ?? 'momento chave'}`
      : `momento de game em torno de ${topType?.type ?? 'ponto chave'}`;
    group.forEach((clip) => selected.push({ ...clip, _selectionReason: reason }));
  }

  const deduped = [];
  const seen = new Set();
  for (const clip of selected.sort((a, b) => a.chronIdx - b.chronIdx)) {
    if (seen.has(clip.chronIdx)) continue;
    seen.add(clip.chronIdx);
    deduped.push(clip);
  }
  return deduped;
}

// -----------------------------------------------------------------------------
// CinematicReel — Sim Highlights experience
// Phases: SELECT ? INTRO ? LIVE ? (next clip) ? DONE
// -----------------------------------------------------------------------------
const REEL_INTRO_DURATION = 10_000;  // leitura confortável; o botão permite começar antes

function CinematicReel({
  simHlState,
  gsRef,
  trailRef,
  frameHistoryRef,
  speedRef,
  simSpeed,
  setSimSpeed,
  onDone,
}) {
  const { allClips = [], result, playerA, playerB, tournament } = simHlState;
  const normalizedAllClips = React.useMemo(() => normalizeClipListForReelV2(allClips), [allClips]);
  const compactClips    = React.useMemo(() => buildCompactClipsV2(normalizedAllClips, result),    [normalizedAllClips, result]);
  const dynamicStory = React.useMemo(
    () => buildDynamicHighlightStory(normalizedAllClips, result, playerA, playerB),
    [normalizedAllClips, result, playerA, playerB],
  );
  const highlightsClips = dynamicStory.clips;
  const broadcastChapters = dynamicStory.chapters;
  const deepStoryClips  = normalizedAllClips;
  // Simular + Highlights tem um único corte editorial: compacto e intenso.
  // Não há mais uma tela pedindo que o jogador escolha formato de replay.
  const [mode] = useState('highlights');
  const [clipIdx,    setClipIdx]   = useState(0);
  const [phase,      setPhase]     = useState('INTRO');        // 'INTRO' | 'LIVE'
  const [showDone,   setShowDone]  = useState(false);
  const [snap,       setSnap]      = useState(null);
  const [pointDone,  setPointDone] = useState(false);
  const [introAnim,  setIntroAnim] = useState(false);         // trigger re-animation on clip change

  const rafRef           = useRef(null);
  const introTimer       = useRef(null);
  const autoDoneTimer    = useRef(null);
  const runningRef       = useRef(false);
  const replayBaseRef    = useRef(null);

  const clips = mode === 'compact'
    ? compactClips
    : mode === 'highlights'
      ? highlightsClips
      : normalizedAllClips;
  const clip  = clips[clipIdx];
  const activeChapter = mode === 'highlights'
    ? broadcastChapters[clipIdx]
    : null;
  const reelDirection = reelDirectionForClipV2(clip);
  const modeMeta = mode === 'compact'
    ? {
        title: 'IMPACT POINTS',
        deck: 'breaks, sets e match points convertidos',
        accent: '#E8C84A',
        status: 'PONTOS DE IMPACTO',
      }
  : mode === 'highlights'
    ? {
        title: 'REEL INTENSO',
        deck: `${highlightsClips.length} momentos escolhidos pela história desta partida`,
        accent: '#A78BFA',
        status: 'HISTÓRIA DA PARTIDA',
      }
      : {
          title: 'COBERTURA ESTENDIDA',
          deck: 'mais contexto, mais jogo, menos mist?rio estrutural',
          accent: '#4A90D9',
          status: 'COBERTURA AMPLIADA',
        };

  // -- takeSnap — stable fn, called only at clip-load and point-end --
  // The canvas in NEWME1.0 reads gsRef directly every RAF frame, so we
  // do NOT need to call this 60x/s. Only call it when HUD data changes.
  const takeSnapFn = useCallback((gs) => {
    setSnap({
      players: gs.players.map(p => ({
        ...p,
        styleData: { ...(p.styleData ?? {}) },
        ctx:       { ...(p.ctx       ?? {}) },
        stamina: p.stamina,
        namedPlayerKey: p.namedPlayerKey,
        setsHistory: p.setsHistory,
        _heatGrid: p._heatGrid ? new Uint16Array(p._heatGrid) : null,
      })),
      ball:         { ...gs.ball },
      gameState:    gs.gameState,
      rally: gs.rally, maxRally: gs.maxRally,
      totalPoints:  gs.totalPoints ?? 0,
      setsDetail:   getSetsDetailFromPlayers(gs.players),
      server:       gs.server      ?? 0,
      ballZ:        gs.ball?.pos?.z ?? 0,
      ballSpeed:    0,
      courtMeta:    gs.courtMeta,
      bounceLog:    gs.bounceLog    ? [...gs.bounceLog]    : [],
      debugEvents:  [],
      trace:        null,
      inTiebreak:   gs.inTiebreak  ?? false,
      tbScore:      gs.tbScore     ? [...gs.tbScore]     : [0, 0],
      heat:         gs.heat        ? { ...gs.heat }      : null,
      pointHistory: gs.pointHistory ? [...gs.pointHistory] : [],
      matchFeelTelemetry: (gs.matchFeelTelemetry ?? []).slice(-40).map(e => ({ ...e })),
      lastMatchFeelPoint: gs.lastMatchFeelPoint ? { ...gs.lastMatchFeelPoint } : null,
      lastMatchDirectorCue: gs.lastMatchDirectorCue ? { ...gs.lastMatchDirectorCue } : null,
      matchArcState: gs.matchArcState ? { ...gs.matchArcState } : null,
      matchStoryCapsules: (gs.matchStoryCapsules ?? []).slice(-40).map(e => ({ ...e })),
      lastMatchStoryCapsule: gs.lastMatchStoryCapsule ? { ...gs.lastMatchStoryCapsule } : null,
      matchNarrativeDossier: gs.matchNarrativeDossier ? { ...gs.matchNarrativeDossier } : null,
    });
  }, []); // eslint-disable-line

  const buildReplayGs = useCallback((baseGs, frame) => {
    if (!baseGs || !frame) return null;
    const basePlayers = baseGs.players ?? [];
    const framePlayers = frame.players ?? [];
    return {
      ...baseGs,
      _bounce: typeof baseGs?._bounce === 'function' ? baseGs._bounce : (() => {}),
      gameState: frame.gameState ?? baseGs.gameState,
      rally: frame.rally ?? baseGs.rally ?? 0,
      totalPoints: frame.totalPoints ?? baseGs.totalPoints ?? 0,
      server: frame.server ?? baseGs.server ?? 0,
      receiver: frame.receiver ?? baseGs.receiver ?? 1,
      inTiebreak: frame.inTiebreak ?? baseGs.inTiebreak ?? false,
      tbScore: frame.tbScore ? [...frame.tbScore] : (baseGs.tbScore ? [...baseGs.tbScore] : [0, 0]),
      pointHistory: frame.pointHistory ? [...frame.pointHistory] : (baseGs.pointHistory ? [...baseGs.pointHistory] : []),
      lastShotEvent: frame.lastShotEvent ? JSON.parse(JSON.stringify(frame.lastShotEvent)) : null,
      lastBouncePos: frame.lastBouncePos ? { ...frame.lastBouncePos } : null,
      pendingHitLabels: [],
      pendingOutcomeLabels: [],
      pendingFlash: null,
      pendingScreenFx: null,
      ball: {
        ...(baseGs.ball ?? {}),
        ...(frame.ball ?? {}),
        pos: { ...(frame.ball?.pos ?? baseGs.ball?.pos ?? {}) },
        vel: { ...(frame.ball?.vel ?? baseGs.ball?.vel ?? {}) },
      },
      players: basePlayers.map((bp, i) => {
        const fp = framePlayers[i];
        if (!fp) return bp;
        return {
          ...bp,
          pos: { ...(fp.pos ?? bp.pos ?? {}) },
          vel: { ...(fp.vel ?? bp.vel ?? {}) },
          atNet: fp.atNet ?? bp.atNet ?? false,
          stamina: fp.stamina ?? bp.stamina ?? 1,
          ctx: {
            ...(bp.ctx ?? {}),
            ...(fp.ctx ?? {}),
          },
        };
      }),
    };
  }, []);

  // -- Load a clip snapshot into gsRef -------------------------------
  const loadSnapshot = useCallback((idx) => {
    const clipList = mode === 'compact'
      ? compactClips
      : mode === 'highlights'
      ? highlightsClips
      : normalizedAllClips;
    const clipData = clipList[idx];
    if (!clipData) return;

    // Prefer serveSnapshot (saved at the exact SERVING tick in headless) over
    // gsSnapshot (saved at PRE_SERVE). serveSnapshot guarantees player positions
    // and stateTimer are byte-for-byte identical to what the headless used when
    // it started consuming the recorded randomSequence — making replay deterministic.
    const raw = clipData.serveSnapshot ?? clipData.gsSnapshot;
    if (!raw) return;

    try {
      const gs = JSON.parse(JSON.stringify(raw));
      gs._bounce = () => {};
      replayBaseRef.current = JSON.parse(JSON.stringify(gs));

      // If we fell back to gsSnapshot (old clips without serveSnapshot),
      // do the manual PRE_SERVE skip as before.
      if (!clipData.serveSnapshot && gs.gameState === GameState.PRE_SERVE) {
        gs._rvPosTarget = null;
        const bigDt = 0.05;
        for (let i = 0; i < 50 && gs.gameState === GameState.PRE_SERVE; i++) {
          gs.stateTimer += bigDt;
          const sv = gs.players[gs.server];
          const rv = gs.players[gs.receiver];
          const HALF_L = 23.77 / 2;
          const sx = gs.serveLeft ? -1.5 : 1.5;
          sv.pos.x += (sx - sv.pos.x) * 0.5;
          sv.pos.y += (sv.side * (HALF_L + 0.5) - sv.pos.y) * 0.5;
          rv.pos.x += ((gs.serveLeft ? 2.0 : -2.0) - rv.pos.x) * 0.5;
          rv.pos.y += (rv.side * (HALF_L + 2.0) - rv.pos.y) * 0.5;
        }
        gs.stateTimer = (TIMING.preServeDelay ?? 1.2) + 0.01;
        const sv = gs.players[gs.server];
        gs.ball.pos.x = sv.pos.x;
        gs.ball.pos.y = sv.pos.y;
        gs.ball.pos.z = 0.8;
        gs.ball.inFlight = false;
      }

      gsRef.current = gs;
      if (frameHistoryRef) frameHistoryRef.current = clipData.replayFrames ? [...clipData.replayFrames] : [];
      takeSnapFn(gs);
    } catch {}
    if (trailRef) trailRef.current = [];
  }, [normalizedAllClips, compactClips, highlightsClips, mode, gsRef, trailRef, frameHistoryRef, takeSnapFn]); // eslint-disable-line

  // -- Navigate to a clip --------------------------------------------
  const goToClip = useCallback((idx, startPhase = 'INTRO') => {
    if (rafRef.current)    cancelAnimationFrame(rafRef.current);
    if (introTimer.current) clearTimeout(introTimer.current);
    if (autoDoneTimer.current) clearTimeout(autoDoneTimer.current);
    runningRef.current = false;

    setClipIdx(idx);
    setPhase(startPhase);
    setPointDone(false);
    setIntroAnim(v => !v);   // flip to re-trigger CSS animation

    if (startPhase === 'LIVE') {
      // loadSnapshot calls takeSnapFn — do NOT setSnap(null) or it overwrites the HUD
      loadSnapshot(idx);
    } else {
      setSnap(null);  // INTRO phase: clear HUD while card is showing
    }
  }, [loadSnapshot]);

  const goLive = useCallback(() => {
    if (introTimer.current) clearTimeout(introTimer.current);
    setPhase('LIVE');
    setPointDone(false);
    loadSnapshot(clipIdx);  // calls takeSnapFn internally — do NOT setSnap(null) after this
  }, [clipIdx, loadSnapshot]);

  const handleNext = useCallback(() => {
    if (phase === 'INTRO') { goLive(); return; }
    const next = clipIdx + 1;
    if (next >= clips.length) { setShowDone(true); }
    else { goToClip(next, 'INTRO'); }
  }, [phase, clipIdx, clips, goLive, goToClip]);

  const handlePrev = useCallback(() => {
    if (clipIdx > 0) goToClip(clipIdx - 1, 'INTRO');
  }, [clipIdx, goToClip]);

  // -- Intro auto-advance ---------------------------------------------
  useEffect(() => {
    if (phase !== 'INTRO' || !mode) return;
    introTimer.current = setTimeout(goLive, REEL_INTRO_DURATION);
    return () => clearTimeout(introTimer.current);
  }, [phase, clipIdx, mode]); // eslint-disable-line

  // -- Live game loop -------------------------------------------------
  useEffect(() => {
    if (phase !== 'LIVE' || showDone) return;
    const recordedFrames = clip?.replayFrames ?? [];
    let running = true;
    runningRef.current = true;

    if (recordedFrames.length > 0 && replayBaseRef.current) {
      let framePtr = 0;
      let lastTs = null;
      let carryFrames = 0;
      const loopRecorded = () => {
        if (!running || !replayBaseRef.current) return;
        const now = performance.now();
        if (lastTs == null) lastTs = now;
        const deltaMs = Math.min(100, now - lastTs);
        lastTs = now;
        const speed = Math.max(0.25, Number(speedRef?.current ?? 1));
        carryFrames += (deltaMs / (1000 / 60)) * speed;
        const framesToAdvance = Math.max(1, Math.floor(carryFrames));
        if (framesToAdvance >= 1) carryFrames -= framesToAdvance;

        for (let i = 0; i < framesToAdvance; i++) {
          const frame = recordedFrames[Math.min(framePtr, recordedFrames.length - 1)];
          const replayGs = buildReplayGs(replayBaseRef.current, frame);
          if (replayGs) {
            gsRef.current = replayGs;
            if (trailRef) trailRef.current = frame?.trail ? frame.trail.map((t) => ({ ...t })) : [];
            takeSnapFn(replayGs);
          }
          framePtr++;
          if (framePtr >= recordedFrames.length) {
            running = false;
            runningRef.current = false;
            setPointDone(true);
            return;
          }
        }
        rafRef.current = requestAnimationFrame(loopRecorded);
      };
      rafRef.current = requestAnimationFrame(loopRecorded);
      return () => {
        running = false;
        runningRef.current = false;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }

    // Fallback legado: re-simula——o determin—stica
    // CRITICAL: must match DT_HEADLESS = 1/120 exactly.
    // The random sequence was recorded with DT=1/120 — using a different DT
    // changes when each gameTick consumes a random number, making the physics
    // diverge even with the same sequence. We run 2 ticks per RAF frame
    // (2 — 1/120 = 1/60 wall-clock) to maintain correct visual speed.
    const DT = 1 / 120;
    const TICKS_PER_FRAME = 2;
    const randomSequence = clip?.randomSequence;
    let rIdx = 0;
    let _origRandom = null;
    if (randomSequence?.length > 0) {
      _origRandom = Math.random;
      Math.random = () => rIdx < randomSequence.length ? randomSequence[rIdx++] : _origRandom();
    }

    const restoreRandom = () => {
      if (_origRandom) { Math.random = _origRandom; _origRandom = null; }
    };

    function loop() {
      if (!running || !gsRef.current) { restoreRandom(); return; }
      const gs = gsRef.current;

      const speed = speedRef?.current ?? 1;
      const ticksThisFrame = Math.round(TICKS_PER_FRAME * speed);

      for (let t = 0; t < ticksThisFrame; t++) {
        // Skip serve windup so the ball launches immediately
        if (gs.gameState === GameState.SERVING && gs.stateTimer <= (TIMING.serveWindup ?? 0.4)) {
          gs.stateTimer = (TIMING.serveWindup ?? 0.4) + 0.01;
        }
        gameTick(gs, DT);
        if (gs.ball?.inFlight && trailRef) {
          trailRef.current = trailRef.current ?? [];
          trailRef.current.push({ ...gs.ball.pos });
          if (trailRef.current.length > TRAIL_LEN) trailRef.current.shift();
        }
        if (gs.gameState === GameState.POINT_END || gs.gameState === GameState.GAME_OVER) {
          restoreRandom();
          // Flush POINT_END transitions synchronously
          for (let i = 0; i < 120 && gs.gameState === GameState.POINT_END; i++) gameTick(gs, DT);
          takeSnapFn(gs);
          running = false;
          runningRef.current = false;
          setPointDone(true);
          return;
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      runningRef.current = false;
      restoreRandom();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, clipIdx, clip, showDone, buildReplayGs, takeSnapFn]); // eslint-disable-line

  // -- Auto-advance after point ends ---------------------------------
  useEffect(() => {
    if (!pointDone) return;
    autoDoneTimer.current = setTimeout(handleNext, activeChapter?.montage ? 5200 : 3600);
    return () => clearTimeout(autoDoneTimer.current);
  }, [pointDone, activeChapter]); // eslint-disable-line

  // -- Keyboard navigation --------------------------------------------
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); handleNext(); }
      if (e.key === 'ArrowLeft')                     { e.preventDefault(); handlePrev(); }
      if (e.key === 'Escape')                         onDone();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [handleNext, handlePrev, onDone]);

  // -- MODE SELECT ----------------------------------------------------
  if (!mode) {
    return (
      <div style={{
        width:'100vw', height:'100vh', overflow:'hidden',
        background:'linear-gradient(160deg,#030d07 0%,#050c11 55%,#07050d 100%)',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        fontFamily:"'Space Mono',monospace", color:'#F2EDE4', gap:0,
      }}>
        {/* Glow */}
        <div style={{ position:'absolute', top:'20%', left:'30%', width:400, height:400, borderRadius:'50%',
          background:'radial-gradient(circle,rgba(74,144,217,.08),transparent 70%)', filter:'blur(60px)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:'15%', right:'25%', width:300, height:300, borderRadius:'50%',
          background:'radial-gradient(circle,rgba(232,200,74,.06),transparent 70%)', filter:'blur(50px)', pointerEvents:'none' }}/>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:56, position:'relative', zIndex:1 }}>
          <div style={{ fontSize:9, letterSpacing:'.55em', color:'rgba(255,255,255,.2)', marginBottom:16, textTransform:'uppercase' }}>
            {playerA?.name?.toUpperCase()} vs {playerB?.name?.toUpperCase()}
          </div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900,
            fontSize:'clamp(28px,4vw,48px)', letterSpacing:'.06em', textTransform:'uppercase',
            color:'#F2EDE4', lineHeight:1 }}>
            SIM HIGHLIGHTS
          </div>
          <div style={{ width:60, height:2, background:'rgba(255,255,255,.12)', margin:'20px auto 0' }}/>
        </div>

        {/* Cards */}
        <div style={{ display:'flex', gap:20, position:'relative', zIndex:1, padding:'0 24px', flexWrap:'wrap', justifyContent:'center' }}>
          {[
            {
              id:'compact',
              title:'IMPACT POINTS',
              sub:'Mostra todos os break points, set points e match points da partida.',
              vibe:'Suspense maximo',
              color:'#E8C84A',
              icon:'—',
            },
            {
              id:'highlights',
              title:'HIGHLIGHTS DE TRANSMISSAO',
              sub:'Uma edicao guiada da partida, com capitulos narrativos e menos pista estrutural.',
              vibe:'Modo recomendado',
              color:'#A78BFA',
              icon:'—',
            },
            {
              id:'extended',
              title:'COBERTURA ESTENDIDA',
              sub:'Mais pontos e mais contexto. Ainda editado, mas com menos protecao anti-spoiler.',
              vibe:'Para ver mais jogo',
              color:'#4A90D9',
              icon:'—',
            },
          ].filter(opt => opt.id !== 'deep-story').map(opt => (
            <div key={opt.id}
              onClick={() => {
                const modeClips = opt.id === 'compact'
                  ? compactClips
                  : opt.id === 'highlights'
                    ? highlightsClips
                    : opt.id === 'deep-story'
                      ? deepStoryClips
                      : normalizedAllClips;
                const modeLabel = opt.id === 'compact'
                  ? 'IMPACT'
                  : opt.id === 'highlights'
                    ? 'M—DIO'
                    : opt.id === 'deep-story'
                      ? 'DEEP STORY'
                      : 'ESTENDIDO';
                console.group(`%c[HL-REEL] Modo ${modeLabel} — ${modeClips.length} clips selecionados`, 'color:#FFD700;font-weight:bold');
                modeClips.forEach((c, i) => {
                  const outcome = c._outcome ?? clipOutcomeV2(c);
                  const converted = outcome === 'converted';
                  const saved = outcome === 'saved';
                  console.log(
                    `%c  #${String(i+1).padStart(2)} ${c.type.padEnd(20)} %c${converted ? 'converted' : saved ? 'saved' : 'neutral'}%c  sets=${c.s0}-${c.s1} games=${c.g0}-${c.g1}  score="${c.score}"  motivo="${c._selectionReason ?? '?'}"`,
                    `color:${c.color}`,
                    `color:${converted ? '#22c55e' : saved ? '#f59e0b' : '#94a3b8'}`,
                    'color:#666'
                  );
                });
                console.groupEnd();
                setMode(opt.id); goToClip(0, 'INTRO');
              }}
              style={{
                width:'clamp(200px,26vw,280px)',
                padding:'28px 24px 24px',
                background:'rgba(255,255,255,.028)',
                border:`1px solid ${opt.color}28`,
                cursor:'pointer', position:'relative', overflow:'hidden',
                transition:'all .18s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background=`${opt.color}0e`;
                e.currentTarget.style.borderColor=`${opt.color}66`;
                e.currentTarget.style.transform='translateY(-3px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background='rgba(255,255,255,.028)';
                e.currentTarget.style.borderColor=`${opt.color}28`;
                e.currentTarget.style.transform='none';
              }}
            >
              <div style={{ fontSize:26, marginBottom:12 }}>{opt.icon}</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900,
                fontSize:26, letterSpacing:'.1em', color:opt.color, marginBottom:6 }}>
                {opt.title}
              </div>
              <div style={{ fontSize:9, letterSpacing:'.12em', color:'rgba(255,255,255,.4)', marginBottom:20, lineHeight:1.6 }}>
                {opt.sub}
              </div>
              <div style={{
                display:'inline-flex', alignItems:'center', justifyContent:'center',
                padding:'6px 12px', marginBottom:18,
                fontSize:8, letterSpacing:'.22em', textTransform:'uppercase',
                color:`${opt.color}dd`, background:`${opt.color}12`, border:`1px solid ${opt.color}30`,
              }}>
                {opt.vibe}
              </div>
              <div style={{ fontSize:8, letterSpacing:'.18em', color:'rgba(255,255,255,.2)', lineHeight:1.8 }}>
                entrar sem saber quantos capitulos vem pela frente
              </div>
            </div>
          ))}
        </div>

        {/* Close */}
        <button onClick={onDone} style={{
          marginTop:48, background:'transparent', border:'none', cursor:'pointer',
          fontSize:8, letterSpacing:'.3em', color:'rgba(255,255,255,.2)',
          fontFamily:"'Space Mono',monospace", textTransform:'uppercase',
          padding:'10px 24px',
          transition:'color .15s',
        }}
          onMouseEnter={e=>e.currentTarget.style.color='rgba(255,255,255,.5)'}
          onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,.2)'}
        >
          ? VOLTAR AO BRACKET
        </button>
      </div>
    );
  }

  // -- DONE / RESULT SCREEN ------------------------------------------
  if (showDone) {
    const aWon = (result?.sets?.[0]??0) > (result?.sets?.[1]??0);
    const winnerP = aWon ? playerA : playerB;
    const loserP  = aWon ? playerB : playerA;
    const scoreStr = (result?.setsDetail ?? [])
      .map(([a,b]) => aWon ? `${a}\u2013${b}` : `${b}\u2013${a}`)
      .join('   ');
    const ovrW = winnerP?.attrs ? overallRating(winnerP.attrs) : '—';
    const ovrL = loserP?.attrs  ? overallRating(loserP.attrs)  : '—';
    const dossier = result?.matchNarrativeDossier ?? null;
    const storyMoments = [...(dossier?.topMoments ?? [])]
      .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
      .slice(0, 3)
      .sort((a, b) => (a.clipChronIdx ?? 0) - (b.clipChronIdx ?? 0));
    return (
      <div style={{
        width:'100vw', height:'100vh',
        background:'linear-gradient(160deg,#020b05 0%,#04080e 60%,#06040b 100%)',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        fontFamily:"'Space Mono',monospace", color:'#F2EDE4', gap:32,
        overflow:'hidden',
      }}>
        <div style={{ position:'absolute', top:'20%', left:'50%', transform:'translateX(-50%)',
          width:600, height:600, borderRadius:'50%',
          background:'radial-gradient(circle,rgba(232,200,74,.07),transparent 65%)',
          filter:'blur(80px)', pointerEvents:'none' }}/>

        <div style={{ fontSize:9, letterSpacing:'.5em', color:'rgba(255,255,255,.2)', textAlign:'center' }}>
          RESULTADO FINAL
        </div>
        <div style={{ textAlign:'center', position:'relative', zIndex:1 }}>
          <div style={{ fontSize:10, letterSpacing:'.38em', color:'#E8C84A', marginBottom:14 }}>VENCEDOR</div>
          <div style={{
            fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900,
            fontSize:'clamp(40px,7vw,80px)', textTransform:'uppercase',
            letterSpacing:'.04em', color:'#E8C84A', lineHeight:.9,
          }}>{winnerP?.name ?? '—'}</div>
          <div style={{ fontSize:9, letterSpacing:'.18em', color:'rgba(255,255,255,.3)', marginTop:10 }}>
            {ovrTier(ovrW).grade} — {ovrTier(ovrW).label}
          </div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif",
            fontSize:'clamp(24px,3vw,36px)', fontWeight:700,
            letterSpacing:'.22em', color:'#E8C84A', marginTop:20, marginBottom:8 }}>
            {scoreStr}
          </div>
          <div style={{ fontSize:9, letterSpacing:'.14em', color:'rgba(255,255,255,.2)' }}>
            vs {loserP?.name ?? '—'}  —  {ovrTier(ovrL).grade}
          </div>
        </div>
        <div style={{ fontSize:8, letterSpacing:'.25em', color:'rgba(255,255,255,.18)' }}>
          {dossier?.thesis ?? 'transmissão encerrada'}
        </div>
        {storyMoments.length > 0 && (
          <div style={{ width:'min(760px, calc(100vw - 48px))', display:'grid', gridTemplateColumns:`repeat(${storyMoments.length}, minmax(0, 1fr))`, gap:10, position:'relative', zIndex:1 }}>
            {storyMoments.map((moment, index) => (
              <div key={`${moment.type}-${index}`} style={{ textAlign:'left', padding:'13px 14px', background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.09)' }}>
                <div style={{ fontSize:7, letterSpacing:'.22em', color:'#E8C84A', textTransform:'uppercase', marginBottom:7 }}>{moment.title}</div>
                <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:13, lineHeight:1.38, color:'rgba(255,255,255,.64)' }}>{moment.oneLine}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ fontSize:8, letterSpacing:'.2em', color:'rgba(255,255,255,.28)', textTransform:'uppercase' }}>
          {tournament?.name ? `${tournament.name} · resultado pronto para atualizar a chave` : 'resultado pronto para atualizar a chave'}
        </div>
        <button onClick={onDone} style={{
          fontFamily:"'Space Mono',monospace", fontSize:9, fontWeight:700,
          letterSpacing:'.28em', textTransform:'uppercase',
          background:'rgba(232,200,74,.1)', border:'1px solid rgba(232,200,74,.35)',
          color:'#E8C84A', padding:'14px 40px', cursor:'pointer',
          clipPath:'polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)',
          marginTop:8,
        }}>
          ? CONCLUIR
        </button>
      </div>
    );
  }

  if (!clip) return null;

  // -- BROADCAST HEADER ---------------------------------------------
  const BroadcastHeader = () => (
    <div style={{
      position:'absolute', top:0, left:0, right:0, zIndex:300,
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'14px 16px 0', pointerEvents:'none',
    }}>
      <div style={{
        display:'inline-flex', alignItems:'center', gap:8,
        padding:'6px 12px', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.12)',
        fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.24em', textTransform:'uppercase',
        color:'rgba(255,255,255,.62)',
      }}>
        <div style={{ width:6, height:6, borderRadius:'50%', background:modeMeta.accent, boxShadow: `0 0 10px ${modeMeta.accent}` }}/>
        {modeMeta.status}
      </div>
      <div style={{
        fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.24em', textTransform:'uppercase',
        color:'rgba(255,255,255,.22)'
      }}>
        NO AR
      </div>
    </div>
  );
  // -- NAV CONTROLS --------------------------------------------------
  const NavControls = () => (
    <div style={{
      position:'absolute', bottom:0, left:0, right:0, zIndex:300,
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'0 20px 18px',
      background:'linear-gradient(0deg,rgba(0,0,0,.7) 0%,transparent 100%)',
      pointerEvents:'none',
    }}>
      {/* Prev */}
      <button onClick={handlePrev} disabled={clipIdx === 0} style={{
        pointerEvents:'all', background:'transparent',
        border:'1px solid rgba(255,255,255,.12)', color:'rgba(255,255,255,.4)',
        fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.22em',
        padding:'9px 18px', cursor:'pointer', textTransform:'uppercase',
        clipPath:'polygon(5px 0,100% 0,calc(100% - 5px) 100%,0 100%)',
        opacity: clipIdx === 0 ? 0 : 1, transition:'opacity .2s',
      }}>? ANTERIOR</button>

      {/* Center: close */}
      <button onClick={onDone} style={{
        pointerEvents:'all', background:'transparent', border:'none',
        cursor:'pointer', fontSize:8, letterSpacing:'.22em', color:'rgba(255,255,255,.2)',
        fontFamily:"'Space Mono',monospace", textTransform:'uppercase', padding:'9px',
      }}>?</button>

      {/* Next */}
      <button onClick={handleNext} style={{
        pointerEvents:'all',
        background: phase === 'INTRO' ? `${clip.color}20` : 'rgba(255,255,255,.06)',
        border:`1px solid ${phase === 'INTRO' ? clip.color + '55' : 'rgba(255,255,255,.14)'}`,
        color: phase === 'INTRO' ? clip.color : 'rgba(255,255,255,.55)',
        fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.22em',
        padding:'9px 18px', cursor:'pointer', textTransform:'uppercase',
        clipPath:'polygon(5px 0,100% 0,calc(100% - 5px) 100%,0 100%)',
        transition:'all .15s',
      }}>
        {phase === 'INTRO'
          ? '▶ VER O PONTO'
          : clipIdx + 1 >= clips.length
            ? 'RESULTADO ▶'
            : 'PRÓXIMO ▶'}
      </button>
    </div>
  );

  // -- INTRO CARD ----------------------------------------------------
  const IntroCard = () => {
    const playerAName = playerA?.name ?? '?';
    const playerBName = playerB?.name ?? '?';
    const holderName  = clip.momentHolderIdx === 0 ? playerAName : playerBName;
    const winnerName  = clip.pointWinnerIdx  === 0 ? playerAName : playerBName;
    const clipOutcome = clip._outcome ?? clipOutcomeV2(clip);
    const winnerMatchesHolder = clipOutcome === 'converted';
    const clipWasSaved = clipOutcome === 'saved';

    const SCORE_LABELS = ['0', '15', '30', '40', 'Ad'];
    const snap = clip.gsSnapshot;
    const snapSv   = snap ? snap.players[snap.server]   : null;
    const snapRv   = snap ? snap.players[snap.receiver] : null;
    const scorePts0 = snap && !snap.inTiebreak ? (SCORE_LABELS[snap.players[0]?.score] ?? snap.players[0]?.score) : null;
    const scorePts1 = snap && !snap.inTiebreak ? (SCORE_LABELS[snap.players[1]?.score] ?? snap.players[1]?.score) : null;
    const snapScoreStr = snap
      ? snap.inTiebreak
        ? `TB ${snap.tbScore[0]}—${snap.tbScore[1]}`
        : `${snap.players[0]?.games}—${snap.players[1]?.games}  (${scorePts0}—${scorePts1})`
      : clip.score;
    const simpleScore = snap
      ? snap.inTiebreak
        ? `TIEBREAK · ${snap.tbScore[0]}–${snap.tbScore[1]}`
        : `${snap.players[0]?.sets ?? 0}–${snap.players[1]?.sets ?? 0} EM SETS  ·  ${snap.players[0]?.games ?? 0}–${snap.players[1]?.games ?? 0} NO SET`
      : null;
    const modeLabel = mode === 'compact'
      ? 'IMPACT'
      : mode === 'highlights'
        ? 'M—DIO'
        : mode === 'deep-story'
          ? 'DEEP STORY'
          : 'ESTENDIDO';

    console.group(
      `%c[HL ${clipIdx+1}/${clips.length}] ${clip.type} — ${clip.label}`,
      `color:${clip.color};font-weight:bold`
    );
    console.log(`%c?? MOTIVO DA SELE——O`, 'color:#FFD700;font-weight:bold',
      clip._selectionReason ?? '(sem raz—o registrada)');
    console.log(`%c?? MODO`, 'color:#888', modeLabel,
      `| transmissao guiada`);
    console.log(`%c?? FRASE EXIBIDA`, 'color:#aaa', `"${clip.contextLine}"`);
    console.groupCollapsed(`%c?? ESTADO DO JOGO no PRE_SERVE (inicio do ponto)`, 'color:#74ACDF');
      console.log(`  Sets    : ${clip.s0}—${clip.s1}`);
      console.log(`  Games   : ${clip.g0}—${clip.g1}`);
      console.log(`  Placar  : ${snapScoreStr}`);
      if (snap) {
        console.log(`  Servidor: ${snapSv?.name} | score idx=${snapSv?.score}`);
        console.log(`  Receiver: ${snapRv?.name} | score idx=${snapRv?.score}`);
        if (snap.inTiebreak) console.log(`  ? TIEBREAK: ${snap.tbScore[0]}—${snap.tbScore[1]}`);
      }
    console.groupEnd();
    console.groupCollapsed(`%c? MOMENTO`, 'color:#FF8C42');
      console.log(`  Tipo         : ${clip.type}`);
      console.log(`  Detentor mom.: ${holderName} (idx ${clip.momentHolderIdx})`);
      console.log(`  Servidor     : ${clip.serverName} (idx ${clip.serverIdx})`);
      if (clip.rallyLength > 0) console.log(`  Rally        : ${clip.rallyLength} bolas`);
    console.groupEnd();
    console.groupCollapsed(
      `%c${winnerMatchesHolder ? 'RESULTADO: CONVERTIDO' : clipWasSaved ? 'RESULTADO: SALVO' : 'RESULTADO: NEUTRO'}`,
      `color:${winnerMatchesHolder ? '#22c55e' : clipWasSaved ? '#f59e0b' : '#94a3b8'};font-weight:bold`
    );
      console.log(`  Quem fez o ponto: ${winnerName} (idx ${clip.pointWinnerIdx})`);
      console.log(`  Holder era      : ${holderName} (idx ${clip.momentHolderIdx})`);
      console.log(`  Match           : ${winnerMatchesHolder
        ? `${holderName} ganhou o ponto: momento convertido`
        : clipWasSaved
          ? `${winnerName} salvou o momento contra ${holderName}`
          : `${winnerName} venceu um ponto neutro`}`);
      if (clipWasSaved) {
        console.warn(`  Clip salvo: o replay mostra o holder perdendo o ponto, mas o card deve vender isto como defesa/sobrevivencia.`);
      }
    console.groupEnd();
    console.log(`%c?? raw clip`, 'color:#555', clip);
    console.groupEnd();

    const glow = clip.color;
    return (
      <div style={{
        position:'absolute', inset:0, zIndex:200,
        background:`linear-gradient(160deg, #020508 0%, #040810 50%, #060408 100%)`,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        overflow:'hidden',
      }}>
        {/* Ambient glow */}
        <div style={{
          position:'absolute', top:'10%', left:'50%', transform:'translateX(-50%)',
          width:700, height:500, borderRadius:'50%',
          background:`radial-gradient(circle, ${glow}18 0%, transparent 65%)`,
          filter:'blur(60px)', pointerEvents:'none',
          animation:'reel-glow-pulse 3s ease-in-out infinite',
        }}/>
        {/* Scanlines */}
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none',
          backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,.15) 3px,rgba(0,0,0,.15) 4px)',
          opacity:.4,
        }}/>

        {/* Content */}
        <div style={{
          position:'relative', zIndex:1,
          display:'flex', flexDirection:'column', alignItems:'center',
          gap:0, textAlign:'center', padding:'0 40px', maxWidth:700,
          animation:'reel-intro-in .5s cubic-bezier(.16,1,.3,1) both',
        }}>
          {activeChapter && (
            <div style={{ marginBottom:32, maxWidth:620 }}>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.3em', color:glow, textTransform:'uppercase', marginBottom:12 }}>
                Capítulo {String(clipIdx + 1).padStart(2, '0')} de {String(clips.length).padStart(2, '0')}
              </div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:'clamp(30px,4vw,48px)', letterSpacing:'.045em', lineHeight:.95, color:'#F2EDE4', textTransform:'uppercase', marginBottom:14 }}>
                {activeChapter.title}
              </div>
              <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:'clamp(15px,1.75vw,20px)', lineHeight:1.5, color:'rgba(255,255,255,.58)' }}>
                {activeChapter.setup}
              </div>
              {activeChapter.montage?.beats?.length > 0 && (
                <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:7, flexWrap:'wrap', marginTop:18 }}>
                  {activeChapter.montage.beats.map((beat, beatIndex) => (
                    <React.Fragment key={`${beat}-${beatIndex}`}>
                      {beatIndex > 0 && <span style={{ color:'rgba(255,255,255,.2)', fontSize:10 }}>→</span>}
                      <span style={{
                        padding:'5px 9px',
                        border:`1px solid ${glow}42`,
                        background:`${glow}0e`,
                        color:'rgba(255,255,255,.64)',
                        fontFamily:"'Space Mono',monospace",
                        fontSize:7,
                        letterSpacing:'.13em',
                        textTransform:'uppercase',
                      }}>
                        {beat}
                      </span>
                    </React.Fragment>
                  ))}
                  <span style={{ fontFamily:"'Space Mono',monospace", fontSize:7, color:glow, letterSpacing:'.16em', marginLeft:4 }}>
                    {activeChapter.montage.clipChronIdxs?.length ?? 1} PONTOS NA HISTÓRIA
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Quem está escrevendo este capítulo */}
          <div style={{
            display:'flex', alignItems:'center', gap:14, marginBottom:22,
            animation:'reel-intro-in .5s cubic-bezier(.16,1,.3,1) .15s both',
          }}>
            <div style={{
              fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900,
              fontSize:'clamp(19px,2.5vw,28px)', textTransform:'uppercase',
              letterSpacing:'.06em', lineHeight:1,
              color: clip.momentHolderIdx === 0 ? '#F2EDE4' : 'rgba(255,255,255,.35)',
            }}>{playerA?.name?.split(' ').pop()?.toUpperCase() ?? '—'}</div>
            <div style={{ width:20, height:1, background:'rgba(255,255,255,.18)', flexShrink:0 }}/>
            <div style={{
              fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900,
              fontSize:'clamp(19px,2.5vw,28px)', textTransform:'uppercase',
              letterSpacing:'.06em', lineHeight:1,
              color: clip.momentHolderIdx === 1 ? '#F2EDE4' : 'rgba(255,255,255,.35)',
            }}>{playerB?.name?.split(' ').pop()?.toUpperCase() ?? '—'}</div>
          </div>

          {/* A frase já aparece como narrativa no capítulo acima. */}
          <div style={{
            display:'none',
            fontFamily:"'Barlow',sans-serif", fontSize:'clamp(14px,1.8vw,20px)',
            color:'rgba(255,255,255,.65)', lineHeight:1.5, marginBottom:28,
            fontWeight:400,
            animation:'reel-intro-in .5s cubic-bezier(.16,1,.3,1) .22s both',
          }}>
            {activeChapter?.setup ?? clip.contextLine}
          </div>

          {/* Placar: presente, mas só uma leitura limpa do momento. */}
          <div style={{
            display: simpleScore ? 'flex' : 'none', flexDirection:'column', alignItems:'center', gap:0,
            animation:'reel-intro-in .5s cubic-bezier(.16,1,.3,1) .30s both',
            paddingTop:12, borderTop:'1px solid rgba(255,255,255,.09)', minWidth:260,
          }}>
            <div style={{
              fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.3em',
              color:'rgba(255,255,255,.32)', textTransform:'uppercase', marginBottom:7,
            }}>
              Placar neste instante
            </div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:18, letterSpacing:'.1em', color:'rgba(255,255,255,.72)' }}>{simpleScore}</div>
          </div>

          <button
            onClick={goLive}
            style={{
              marginTop:26,
              padding:'12px 28px',
              background:`${glow}1c`,
              border:`1px solid ${glow}88`,
              color:'#F2EDE4',
              fontFamily:"'Space Mono',monospace",
              fontSize:9,
              fontWeight:700,
              letterSpacing:'.22em',
              textTransform:'uppercase',
              cursor:'pointer',
              boxShadow:`0 0 24px ${glow}18`,
              animation:'reel-intro-in .45s cubic-bezier(.16,1,.3,1) .42s both',
            }}
          >
            ▶ VER O PONTO
          </button>

          {false && mode !== 'extended' && (
            <div style={{
              display:'flex', flexDirection:'column', alignItems:'center', gap:10,
              animation:'reel-intro-in .5s cubic-bezier(.16,1,.3,1) .30s both',
            }}>
              <div style={{
                fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.3em',
                color:'rgba(255,255,255,.28)', textTransform:'uppercase',
              }}>
                {modeMeta.title}
              </div>
              <div style={{
                fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900,
                fontSize:'clamp(24px,4vw,40px)', lineHeight:1,
                color:'#F2EDE4', letterSpacing:'.08em', textTransform:'uppercase'
              }}>
                {['MATCH_POINT', 'FINAL_POINT'].includes(clip.type)
                  ? (clipWasSaved ? 'SOBREVIVEU AO FIM' : 'DECISAO NO AR')
                  : ['SET_POINT', 'TIEBREAK_CRITICAL', 'BREAK_POINT'].includes(clip.type)
                    ? (clipWasSaved ? 'PONTO SALVO' : 'PRESSAO MAXIMA')
                    : clip.rallyLength >= 10
                      ? 'TROCA ESTENDIDA'
                      : 'CAPITULO DA PARTIDA'}
              </div>
              <div style={{ width:44, height:1, background:'rgba(255,255,255,.08)' }}/>
              <div style={{
                fontFamily:"'Barlow',sans-serif", fontWeight:500,
                fontSize:'clamp(13px,1.8vw,18px)', letterSpacing:'.04em',
                color:'rgba(255,255,255,.52)', maxWidth:420,
              }}>
                {mode === 'compact'
                  ? 'So os impact points: break points, set points e match points.'
                  : clipWasSaved
                    ? 'Um momento defensivo entrou porque mudou a temperatura da partida.'
                    : 'Um capitulo selecionado para contar a historia sem denunciar o tamanho do jogo.'}
              </div>
            </div>
          )}

          {/* Rally length badge (only for rally clips) */}
          {false && clip.rallyLength >= 10 && (
            <div style={{
              marginTop:20, padding:'6px 18px',
              background:'rgba(79,195,247,.08)', border:'1px solid rgba(79,195,247,.2)',
              fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.22em',
              color:'rgba(79,195,247,.7)',
              animation:'reel-intro-in .4s cubic-bezier(.16,1,.3,1) .38s both',
            }}>
              {clip.rallyLength} BOLAS
            </div>
          )}
        </div>

        {/* Bottom hint */}
        <div style={{
          position:'absolute', bottom:64, left:0, right:0,
          textAlign:'center', zIndex:1,
          fontFamily:"'Space Mono',monospace", fontSize:7,
          color:'rgba(255,255,255,.14)', letterSpacing:'.3em',
          animation:'reel-intro-in .4s ease .6s both',
        }}>
          ESPAÇO VER O PONTO  —  ← VOLTAR  —  ESC SAIR
        </div>
      </div>
    );
  };

  // -- LIVE HUD ------------------------------------------------------
  const LiveHUD = () => (
    <>
      {/* Type badge top-left */}
      <div style={{
        position:'absolute', top:26, left:16, zIndex:150,
        display:'flex', alignItems:'center', gap:7,
        padding:'6px 14px',
        background:`${clip.color}18`, border:`1px solid ${clip.color}44`,
        fontFamily:"'Space Mono',monospace", fontSize:8, fontWeight:700,
        letterSpacing:'.24em', color:clip.color, textTransform:'uppercase',
        pointerEvents:'none',
      }}>
        <div style={{ width:5, height:5, borderRadius:'50%', background:clip.color,
          boxShadow:`0 0 8px ${clip.color}`, animation:'reel-dot-pulse 1.5s ease-in-out infinite' }}/>
        {clip.story?.label ?? clip.label}
      </div>
      <div style={{
        position:'absolute', top:59, left:16, zIndex:150,
        fontFamily:"'Space Mono',monospace", fontSize:7, letterSpacing:'.22em',
        color:reelDirection.accent, pointerEvents:'none', textTransform:'uppercase', opacity:.72,
      }}>
        {reelDirection.label} · DIREÇÃO AO VIVO
      </div>
      <div style={{
        position:'absolute', top:30, right:16, zIndex:150,
        fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.2em',
        color:'rgba(255,255,255,.3)', pointerEvents:'none', textTransform:'uppercase',
      }}>
        {modeMeta.title}
      </div>
      {/* A chamada cria suspense antes do ponto; a resolução explica o que ele mudou. */}
      <div style={{
        position:'absolute', bottom:52, left:16, zIndex:150,
        fontFamily:"'Barlow Condensed',sans-serif", fontSize:pointDone ? 18 : 14,
        color:pointDone ? 'rgba(255,255,255,.92)' : 'rgba(255,255,255,.48)', letterSpacing:'.035em',
        pointerEvents:'none', maxWidth:'min(760px,72vw)', lineHeight:1.35,
        padding:pointDone ? '12px 15px' : 0,
        background:pointDone ? 'rgba(3,6,10,.78)' : 'transparent',
        borderLeft:pointDone ? `3px solid ${reelDirection.accent}` : 'none',
        textShadow:'0 2px 12px rgba(0,0,0,.8)',
        animation:pointDone ? 'reel-resolution-in .35s cubic-bezier(.16,1,.3,1) both' : 'none',
      }}>
        {pointDone
          ? (activeChapter?.resolution ?? clip.story?.resolution ?? clip.contextLine)
          : (activeChapter?.setup ?? clip.story?.setup ?? clip.contextLine)}
      </div>
    </>
  );

  return (
    <div style={{ width:'100vw', height:'100vh', position:'relative', overflow:'hidden', background:'#050505' }}>

      {/* Inject reel CSS animations once */}
      <style>{`
        @keyframes reel-strip-fill { from{width:0} to{width:100%} }
        @keyframes reel-glow-pulse { 0%,100%{opacity:.6} 50%{opacity:1} }
        @keyframes reel-dot-pulse  { 0%,100%{opacity:.4;transform:scale(1)} 50%{opacity:1;transform:scale(1.3)} }
        @keyframes reel-intro-in   { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes reel-badge-in   { from{opacity:0;transform:scale(.88)} to{opacity:1;transform:scale(1)} }
        @keyframes reel-resolution-in { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes reel-impact-soft { 0%,100%{transform:translate(0,0)} 20%{transform:translate(-2px,1px)} 45%{transform:translate(2px,-1px)} 70%{transform:translate(-1px,1px)} }
        @keyframes reel-impact-medium { 0%,100%{transform:translate(0,0)} 18%{transform:translate(-4px,2px)} 38%{transform:translate(4px,-2px)} 58%{transform:translate(-3px,1px)} 78%{transform:translate(2px,-1px)} }
        @keyframes reel-impact-heavy { 0%,100%{transform:translate(0,0)} 14%{transform:translate(-7px,3px)} 28%{transform:translate(7px,-3px)} 44%{transform:translate(-5px,2px)} 60%{transform:translate(5px,-2px)} 76%{transform:translate(-2px,1px)} }
      `}</style>

      {/* NEWME-Lite for highlights */}
      <div style={{
        position:'absolute', inset:0,
        opacity: phase === 'LIVE' ? 1 : 0,
        transition:'opacity .35s ease',
        pointerEvents: phase === 'LIVE' ? 'auto' : 'none',
        transform: phase === 'LIVE' ? `scale(${reelDirection.zoom})` : 'scale(1)',
        transformOrigin: clip?.momentHolderIdx === 0 ? '35% 52%' : '65% 52%',
        transitionProperty:'opacity, transform',
        transitionDuration:'350ms, 900ms',
        transitionTimingFunction:'ease, cubic-bezier(.16,1,.3,1)',
        animation: pointDone && reelDirection.shake !== 'none' ? `reel-impact-${reelDirection.shake} 520ms ease-out` : 'none',
      }}>
        <DefinitiveME
          gsRef={gsRef}
          snap={snap}
          trailRef={trailRef}
          onMenu={onDone}
          simSpeed={simSpeed}
          setSimSpeed={setSimSpeed}
          speedRef={speedRef}
          frameHistoryRef={frameHistoryRef}
          bugMode={false}
          setBugMode={() => {}}
          bugSpeedSaveRef={{ current: 1 }}
          disableCameraMotion
          liteMode
          liteMeta={{
            label: clip?.story?.label ?? clip?.label,
            players: `${playerA?.name ?? '?'} vs ${playerB?.name ?? '?'}`,
            counter: modeMeta.status,
          }}
        />
      </div>

      {phase === 'LIVE' && (
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none', zIndex:140,
          background:`radial-gradient(ellipse 72% 64% at 50% 50%, transparent 34%, ${reelDirection.accent}${Math.round(reelDirection.dim * 255).toString(16).padStart(2, '0')} 100%)`,
          mixBlendMode:'screen', opacity:.75,
          transition:'background .5s ease',
        }}/>
      )}

      {/* Broadcast header */}
      <BroadcastHeader />

      {/* INTRO card */}
      {phase === 'INTRO' && <IntroCard key={`intro-${clipIdx}-${introAnim}`} />}

      {/* Live HUD */}
      {phase === 'LIVE' && <LiveHUD />}

      {/* Navigation */}
      <NavControls />
    </div>
  );
}

export default function UniverseManager({ onBack, universeMode = 'normal', autoLoadKey = 0 }) {
  useEffect(() => { injectCSS(); }, []);

  const [phase, setPhase] = useState('home');
  const lastAutoLoadKeyRef = useRef(0);
  const lastAutosaveSignatureRef = useRef(null);
  const [universeState, setUniverseState] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [simProgress, setSimProgress] = useState(0);
  const [simMode, setSimMode] = useState('headless'); // 'headless' | 'fast'
  const [stopOnBreaking, setStopOnBreaking] = useState(false);
  const [simBreakingArticle, setSimBreakingArticle] = useState(null);
  const [simEvent, setSimEvent] = useState(null);       // latest match event
  const [simFeed, setSimFeed] = useState([]);           // last N match events
  const [simTournament, setSimTournament] = useState(null); // current tournament being simmed
  const [simTotal, setSimTotal] = useState(0);          // expected total matches
  const [simOverlayYear, setSimOverlayYear] = useState(null);
  const simFeedRef = useRef([]);
  const stopSimRef  = useRef(false);   // set to true to abort headless simulation
  const [liveBracketTournament, setLiveBracketTournament] = useState(null);
  const liveBracketSavedStateRef   = useRef(null); // persists bracket progress across navigations
  const liveBracketLastIdRef       = useRef(null); // id of the last opened tournament
  const [watchMatchState, setWatchMatchState] = useState(null);
  const [watchFinishing, setWatchFinishing] = useState(false);
  const [highlightsModeRef] = useState({ current: false }); // usar ref-in-state para não re-render
  const [highlightsPaused, setHighlightsPaused] = useState(false); // true = mostrando ponto ao vivo
  // Fechamentos de game comuns continuam disponíveis, mas desligados por padrão:
  // a sala deve esperar tensão real em vez de interromper a partida a cada game.
  const [hlFilters, setHlFilters] = useState({ gamePoint: false, breakPoint: true, setPoint: true, matchPoint: true });
  const hlFiltersRef = useRef({ gamePoint: false, breakPoint: true, setPoint: true, matchPoint: true });
  const [hlFeed, setHlFeed] = useState([]); // feed de pontos durante headless
  const hlFeedRef = useRef([]);
  const [preGamePending, setPreGamePending] = useState(null);
  const [simHlLoading, setSimHlLoading] = useState(null); // { playerA, playerB, tournamentName }
  const countBreakingArticles = useCallback((stateLike) => (
    (stateLike?.newsEngine?.feed ?? []).filter(article => article?.type === 'BREAKING').length
  ), []);
  const getLatestBreakingArticle = useCallback((stateLike) => (
    (stateLike?.newsEngine?.feed ?? []).find(article => article?.type === 'BREAKING') ?? null
  ), []);
  // Sim-Highlights state: lista de clips prontos para replay
  const [simHlState, setSimHlState] = useState(null); // { allClips, result, playerA, playerB, onResult, keyA, keyB }
  const HISTORY_LEN = 600;

  // ME refs
  const gsRef = useRef(null);
  const trailRef = useRef(null);
  const frameHistoryRef = useRef(null);
  const speedRef = useRef(1);
  const [simSpeed, setSimSpeed] = useState(1);
  const [snap, setSnap] = useState(null);
  const [ceremonyData, setCeremonyData] = useState(null); // { tournament, bracket }
  const rafRef = useRef(null);

  const resetTransientUniverseRuntime = useCallback(() => {
    liveBracketSavedStateRef.current = null;
    liveBracketLastIdRef.current = null;
    stopSimRef.current = false;
    setLiveBracketTournament(null);
    setWatchMatchState(null);
    setWatchFinishing(false);
    setPreGamePending(null);
    setSimHlLoading(null);
    setSimHlState(null);
    setSnap(null);
    setSimulating(false);
    setSimProgress(0);
    setSimTournament(null);
    setSimEvent(null);
    setSimFeed([]);
    simFeedRef.current = [];
    setHighlightsPaused(false);
    hlFeedRef.current = [];
    setHlFeed([]);
    setCeremonyData(null);
    gsRef.current = null;
    trailRef.current = [];
    frameHistoryRef.current = [];
  }, []);

  const universeDispatch = useCallback((action) => {
    setUniverseState(prev => reducer(prev, action));
  }, []);

  const handleInitUniverse = () => {
    resetTransientUniverseRuntime();
    setUniverseState(buildUniverse(universeMode));
    setPhase('running');
  };

  useEffect(() => {
    if (!universeState || simulating) return;
    const currentTournament = CALENDAR[universeState.calendarIndex];
    if (!currentTournament) return;
    if (!shouldPrebuildTournamentPackage(currentTournament)) return;
    const currentPackage = universeState.preparedTournamentPackage;
    const cachedPackage = universeState.preparedTournamentPackageCache?.[currentTournament.id] ?? null;
    const currentRadarSignature = radarFollowSignature(universeState.radar?.followedPlayerIds);
    const packageMatchesRadar = (pkg) => pkg?.radarFollowSignature === currentRadarSignature;
    if (currentPackage?.tournamentId === currentTournament.id && currentPackage?.seasonYear === universeState.year && packageMatchesRadar(currentPackage)) return;
    if (cachedPackage?.tournamentId === currentTournament.id && cachedPackage?.seasonYear === universeState.year && packageMatchesRadar(cachedPackage)) {
      universeDispatch({
        type: 'SET_PREPARED_TOURNAMENT_PACKAGE',
        package: cachedPackage,
        packageCache: universeState.preparedTournamentPackageCache ?? {},
      });
      return;
    }
    const nextBundle = buildPreparedTournamentPackageBundle(
      currentTournament,
      universeState.tourPlayers,
      universeState.prospects,
      universeState.playerSeasonSlots ?? {},
      universeState.year,
      {
        followedPlayerIds: universeState.radar?.followedPlayerIds ?? [],
        rivalrySystem: universeState.rivalrySystem ?? null,
      },
    );
    universeDispatch({
      type: 'SET_PREPARED_TOURNAMENT_PACKAGE',
      package: nextBundle.currentPackage,
      packageCache: nextBundle.packageCache,
    });
  }, [
    universeState?.calendarIndex,
    universeState?.year,
    universeState?.tourPlayers,
    universeState?.prospects,
    universeState?.preparedTournamentPackage,
    universeState?.preparedTournamentPackageCache,
    universeState?.radar?.followedPlayerIds,
    universeState?.rivalrySystem,
    simulating,
    universeDispatch,
  ]);

  // -- Simula——o R—pida (FastSimulation) ------------------------------
  // Constrói um bracket completo com FastSimulation como base. A política do
  // Radar promove toda partida acompanhada para o Headless completo.
  // Compat—vel com o formato esperado por APPLY_TOURNAMENT_RESULT.
  const runTournamentFast = useCallback((tournament, tourPlayers, prospects, playerSeasonSlots = {}, preparedPackage = null) => {
    const surface = courtKeyToSurface(tournament.courtKey ?? tournament.surface);
    const bestOf  = tournament.bestOf ?? 3;
    const followedPlayerIds = universeState?.radar?.followedPlayerIds ?? [];
    const radarMatches = [];
    const { qualifyOut = 0, preQualIn = 0 } = tournament;
    const pqOut   = tournament.preQualOut ?? Math.ceil(preQualIn / 2);
    const prepared = clonePreparedTournamentPackage(
      preparedPackage
      ?? (universeState?.preparedTournamentPackage?.tournamentId === tournament.id
        ? universeState.preparedTournamentPackage
        : null)
    );
    radarMatches.push(...(prepared?.radarMatches ?? []));
    const currentPlayersById = new Map(
      [...tourPlayers, ...prospects].filter(Boolean).map((player) => [player.id, player])
    );

    // -- 1. Seleciona pools --------------------------------------------
    let rawMain = prepared?.rawMainDraw ?? [];
    let rawQual = prepared?.rawQualifying ?? [];
    let rawPreQual = prepared?.rawPreQualifying ?? [];
    if (!prepared) {
      const sorted      = [...tourPlayers].sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999));
      const sortedProsp = [...prospects].sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999));
      ({ mainDraw: rawMain, qualifying: rawQual, preQualifying: rawPreQual } = selectTournamentPlayers(
        tournament, sorted, sortedProsp, new Set(), playerSeasonSlots,
      ));
      rawMain = rawMain.map(p => withTournamentMindset(p, tournament, universeState?.year ?? null));
      rawQual = rawQual.map(p => withTournamentMindset(p, tournament, universeState?.year ?? null));
      rawPreQual = rawPreQual.map(p => withTournamentMindset(p, tournament, universeState?.year ?? null));
    }

    // Atualiza season slots
    if (['ATP_500','ATP_250','MASTERS_1000'].includes(tournament.category)) {
      for (const player of [...rawMain, ...rawQual]) {
        if (!playerSeasonSlots[player.id]) playerSeasonSlots[player.id] = createSeasonSlots();
        updateSeasonSlots(playerSeasonSlots[player.id], player, tournament);
      }
    }

    // -- 2. Fun——o auxiliar de match r—pido ---------------------------
    const resolveMatch = (a, b, roundLabel) => {
      const res = simulateRadarAwareFastMatch(a, b, surface, bestOf, tournament, roundLabel, followedPlayerIds, universeState?.rivalrySystem ?? null);
      if (res.simulationSource === 'FOLLOWED_HEADLESS') {
        const winner = res.winner?.id === a.id ? a : b;
        radarMatches.push(buildRadarMatchRecord({ playerA:a, playerB:b, winner, result:res, tournament, roundLabel, year:universeState?.year }));
      }
      return res;
    };

    // -- 3a. PR—-QUALIFY: preQualIn ? pqOut passam -------------------
    const preQualWinners = [...(prepared?.preQualWinners ?? [])];
    // FASE 2: rastrear partidas de qualifying para updateRecentForm dos eliminados
    const qualRoundsData = [...(prepared?.qualRoundsData ?? [])];  // [{playerA, playerB, winner, surface, sets}]
    if (!prepared && rawPreQual.length > 0 && pqOut > 0) {
      const pool = [...rawPreQual].sort(() => Math.random() - 0.5);
      for (let i = 0; i + 1 < pool.length && preQualWinners.length < pqOut; i += 2) {
        const sA = pool[i], sB = pool[i + 1];
        const res = resolveMatch(sA, sB, 'Pré-qualifying');
        const winnerPlayer = res.winner.id === sA.id ? sA : sB;
        preQualWinners.push(winnerPlayer);
        qualRoundsData.push({ playerA: sA, playerB: sB, winner: winnerPlayer, surface, sets: res.sets ?? [0, 0] });
      }
    }

    // -- 3b. QUALIFY: qualDirectIn + preQualWinners ? qualifyOut passam
    const qualifiers = [...(prepared?.qualifiers ?? [])];
    if (!prepared && (rawQual.length > 0 || preQualWinners.length > 0) && qualifyOut > 0) {
      const pool = [...rawQual, ...preQualWinners].sort(() => Math.random() - 0.5);
      for (let i = 0; i + 1 < pool.length && qualifiers.length < qualifyOut; i += 2) {
        const sA = pool[i], sB = pool[i + 1];
        const res = resolveMatch(sA, sB, 'Qualifying');
        const winnerPlayer = res.winner.id === sA.id ? sA : sB;
        qualifiers.push(winnerPlayer);
        qualRoundsData.push({ playerA: sA, playerB: sB, winner: winnerPlayer, surface, sets: res.sets ?? [0, 0] });
      }
    }

    // -- 4. Main draw -------------------------------------------------
    const allMainDraw = prepared ? [...(prepared.mainDrawPlayers ?? [])] : [...rawMain, ...qualifiers].slice(0, tournament.draw);

    // -- 5. Les—es em todos os participantes (l—gica can—nica compartilhada) --
    let fastWithdrawals = prepared?.injuryWithdrawals ?? new Set();
    let fastInjuryEvents = prepared?.injuryEvents ?? [];
    let fastUpdatedByInjury = prepared?.updatedByInjury ?? {};
    let activeDraw = [...allMainDraw];
    if (!prepared) {
      const allFastParticipants = [...rawMain, ...rawQual, ...rawPreQual, ...allMainDraw]
        .filter((p, i, arr) => p && arr.findIndex(x => x?.id === p.id) === i);
      const injuries = applyPreTournamentInjuries(allFastParticipants, tournament, null);
      fastWithdrawals = injuries.injuryWithdrawals;
      fastInjuryEvents = injuries.injuryEvents;
      fastUpdatedByInjury = injuries.updatedByInjury;
      activeDraw = allMainDraw
        .filter(p => p && !fastWithdrawals.has(p.id))
        .map(p => {
          const up = fastUpdatedByInjury[p.id] ?? p;
          return applyInjuryToPlayer(up);
        });
    }
    if (prepared) {
      const unavailableIds = new Set(
        [...currentPlayersById.values()]
          .filter((player) => isUnavailableForTournamentNow(player))
          .map((player) => player.id)
      );
      if (unavailableIds.size > 0) {
        for (const id of unavailableIds) fastWithdrawals.add(id);
        const keepEligible = (player) => player && !unavailableIds.has(player.id);
        preQualWinners.splice(0, preQualWinners.length, ...preQualWinners.filter(keepEligible));
        qualifiers.splice(0, qualifiers.length, ...qualifiers.filter(keepEligible));
        activeDraw = activeDraw.filter(keepEligible);
      }
    }

    // -- 6. Bracket r—pido --------------------------------------------
    let totalSlots = prepared?.bracket?.totalSlots ?? 1;
    while (totalSlots < activeDraw.length) totalSlots *= 2;
    const seeded     = [...activeDraw].sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999));
    const r1Template = prepared?.bracket?.rounds?.[0]
      ? prepared.bracket.rounds[0].map(match => ({ ...match, result: null }))
      : buildATPFirstRound(seeded, totalSlots);

    const _rl = (sz) => sz === 2 ? 'F' : sz === 4 ? 'SF' : sz === 8 ? 'QF' : sz === 16 ? 'R16' : sz === 32 ? 'R32' : sz === 64 ? 'R64' : sz === 128 ? 'R128' : 'R?';
    const _opts = (a, b, rl) => ({ format: tournament?.format ?? null, tournamentTier: tournament.category, roundLabel: rl, rankA: a?.rankPosition ?? null, rankB: b?.rankPosition ?? null });

    // Prepara jogador para FastSim: aplica forma + b—nus de torneio favorito
    const prepFast = (p) => {
      let s = applyTournamentContextModifiers(p, tournament);
      return s;
    };

    const rounds = [];
    const r1 = r1Template.map(m => {
      if (m.isBye || !m.playerA || !m.playerB) return m;
      const a = m.playerA, b = m.playerB;
      const result = resolveMatch(a, b, _rl(totalSlots));
      const winner = result.winner.id === a.id ? a : b;
      return { ...m, winner, isBye: false, result };
    });
    rounds.push(r1);

    let current = r1.map(m => m.winner).filter(Boolean);
    while (current.length > 1) {
      const rl = _rl(current.length);
      const roundMatches = [];
      const next = [];
      for (let i = 0; i < current.length; i += 2) {
        const a = current[i], b = current[i + 1] ?? null;
        if (!b) { roundMatches.push({ playerA: a, playerB: null, winner: a, isBye: true, result: null }); next.push(a); continue; }
        const result = resolveMatch(a, b, rl);
        const winner = result.winner.id === a.id ? a : b;
        roundMatches.push({ playerA: a, playerB: b, winner, isBye: false, result });
        next.push(winner);
      }
      rounds.push(roundMatches);
      current = next;
    }

    return {
      bracket: { rounds, champion: current[0] ?? null, totalSlots },
      qualifiers,
      preQualWinners,
      wildcards: [],
      injuryWithdrawals: fastWithdrawals,
      injuryEvents: fastInjuryEvents,
      updatedByInjury: fastUpdatedByInjury,
      qualRoundsData,  // FASE 2: partidas de qualifying para updateRecentForm
      radarMatches,
      playerSeasonSlotsAfterSelection: prepared?.playerSeasonSlotsAfterSelection ?? playerSeasonSlots,
    };
  }, [
    universeState?.preparedTournamentPackage,
    universeState?.radar?.followedPlayerIds,
    universeState?.rivalrySystem,
    universeState?.year,
  ]);
  // Simula um range de torneios usando FastSimulation.
  // mode: 'month' | 'champions' | 'year' | '5years' | 'decade' | '15years' | '20years'
  const handleFastSimulateRange = useCallback(async (mode) => {
    if (simulating || !universeState) return;

    // -- SINGLE: simula apenas o torneio atual com FastSimulation -----
    if (mode === 'single') {
      const calIdx = universeState.calendarIndex;
      if (calIdx >= CALENDAR.length) return;
      const tournament = CALENDAR[calIdx];
      stopSimRef.current = false;
      setSimulating(true);
      setSimProgress(0);
      setSimMode('headless');
      setSimTournament(tournament);
      setSimOverlayYear(universeState.year);
      setSimTotal(1);
      setSimProgress(0);
      try {
        const loopSeasonSlots = Object.fromEntries(
          Object.entries(universeState.playerSeasonSlots ?? {}).map(([k, v]) => [k, { ...v }])
        );
        const result = shouldUseFastInvisibleTournament(tournament)
          ? (() => {
              const { bracket, qualifiers, preQualWinners, wildcards, injuryWithdrawals, injuryEvents, updatedByInjury } = runTournamentFast(
                tournament,
                universeState.tourPlayers,
                universeState.prospects,
                loopSeasonSlots,
                universeState.preparedTournamentPackage?.tournamentId === tournament.id
                  ? universeState.preparedTournamentPackage
                  : null,
              );
              return {
                bracket,
                qualifiers,
                preQualWinners,
                wildcards,
                injuryWithdrawals: injuryWithdrawals ?? new Set(),
                injuryEvents: injuryEvents ?? [],
                updatedByInjury: updatedByInjury ?? {},
              };
            })()
          : await runTournament(
              tournament,
              universeState.tourPlayers,
              universeState.prospects,
              null,
              loopSeasonSlots,
              null,
              universeState.year,
              universeState.rivalrySystem ?? null,
              universeState.preparedTournamentPackage?.tournamentId === tournament.id
                ? universeState.preparedTournamentPackage
                : null,
              universeState.radar?.followedPlayerIds ?? [],
            );
        if (!stopSimRef.current) {
          universeDispatch({
            type: 'APPLY_TOURNAMENT_RESULT',
            tournamentId: tournament.id,
            result,
            tournament,
          });
        }
      } finally {
        setSimulating(false);
        setSimProgress(0);
        setSimMode('headless');
        setSimTournament(null);
      }
      return;
    }

    const multiYearCount = mode === '5years' ? 5 : mode === 'decade' ? 10 : mode === '15years' ? 15 : mode === '20years' ? 20 : 0;
    if (multiYearCount > 0) {
      stopSimRef.current = false;
      setSimulating(true);
      setSimProgress(0);
      setSimMode('headless');
      setSimBreakingArticle(null);
      setSimOverlayYear(universeState.year);
      setSimTotal(multiYearCount * CALENDAR.length);
      try {
        let currentState = universeState;
        let breakingSeenCount = countBreakingArticles(currentState);
        for (let year = 0; year < multiYearCount; year++) {
          // Simula o ano inteiro a partir do calendarIndex atual (ou 0 se j— acabou)
          const startIdx = currentState.calendarIndex >= CALENDAR.length ? 0 : currentState.calendarIndex;

          // Se a temporada j— terminou, avan—a o ano antes de simular
          if (currentState.calendarIndex >= CALENDAR.length) {
            currentState = reducer(currentState, { type: 'ADVANCE_YEAR' });
          }

          const loopSeasonSlots = Object.fromEntries(
            Object.entries(currentState.playerSeasonSlots ?? {}).map(([k, v]) => [k, { ...v }])
          );

          // Simula todos os torneios da temporada
          for (let idx = currentState.calendarIndex; idx < CALENDAR.length; idx++) {
            if (stopSimRef.current) break;
            const tournament = CALENDAR[idx];
            setSimProgress(year * CALENDAR.length + idx);
            setSimTournament(tournament);
            setSimOverlayYear(currentState.year);
            await new Promise(r => setTimeout(r, 0));

            // Olimp—adas: pula em anos não-ol—mpicos
            if (tournament.isOlympic && !isOlympicSeasonYear(currentState.year)) {
              currentState = reducer(currentState, { type: 'SKIP_TOURNAMENT' });
              continue;
            }

            const result = shouldUseFastInvisibleTournament(tournament)
              ? (() => {
                  const { bracket, qualifiers, preQualWinners, wildcards, injuryWithdrawals, injuryEvents, updatedByInjury } = runTournamentFast(
                    tournament,
                    currentState.tourPlayers,
                    currentState.prospects,
                    loopSeasonSlots,
                  );
                  return {
                    bracket,
                    qualifiers,
                    preQualWinners,
                    wildcards,
                    injuryWithdrawals: injuryWithdrawals ?? new Set(),
                    injuryEvents: injuryEvents ?? [],
                    updatedByInjury: updatedByInjury ?? {},
                  };
                })()
              : await runTournament(
                  tournament,
                  currentState.tourPlayers,
                  currentState.prospects,
                  null,
                  loopSeasonSlots,
                  null,
                  currentState.year,
                  currentState.rivalrySystem ?? null,
                  null,
                  currentState.radar?.followedPlayerIds ?? [],
                );

            const nextState = reducer(currentState, {
              type: 'APPLY_TOURNAMENT_RESULT',
              tournamentId: tournament.id,
              result,
              tournament,
            });
            currentState = { ...nextState, playerSeasonSlots: loopSeasonSlots };
            const nextBreakingCount = countBreakingArticles(nextState);
            if (nextBreakingCount > breakingSeenCount) {
              const newestBreaking = getLatestBreakingArticle(nextState);
              if (newestBreaking) setSimBreakingArticle(newestBreaking);
              if (stopOnBreaking) stopSimRef.current = true;
            }
            breakingSeenCount = nextBreakingCount;
          }

          if (stopSimRef.current) break;
          // Avan—a o ano ao fim da temporada
          currentState = reducer(currentState, { type: 'ADVANCE_YEAR' });
          setSimProgress((year + 1) * CALENDAR.length);
        }
        setUniverseState(currentState);
      } finally {
        setSimulating(false);
        setSimProgress(0);
        setSimMode('headless');
        setSimTournament(null);
      }
      return;
    }

    const startIdx = universeState.calendarIndex;
    if (startIdx >= CALENDAR.length) return;

    // Determina at— qual —ndice simular
    const currentMonthNum = CALENDAR[startIdx]?.monthNum ?? 1;
    let endIdx;
    if (mode === 'month') {
      // Todos os torneios do m—s atual
      endIdx = startIdx;
      while (endIdx < CALENDAR.length && CALENDAR[endIdx].monthNum === currentMonthNum) endIdx++;
    } else if (mode === 'champions') {
      // At— o DEZ_ATP_FINALS (inclusive)
      const champIdx = CALENDAR.findIndex(t => t.id === 'DEZ_ATP_FINALS');
      endIdx = champIdx >= 0 ? champIdx + 1 : CALENDAR.length;
      if (endIdx <= startIdx) endIdx = CALENDAR.length; // j— passou, vai at— o fim
    } else {
      // Ano inteiro
      endIdx = CALENDAR.length;
    }

    stopSimRef.current = false;
    setSimulating(true);
    setSimProgress(0);
    setSimMode('headless');
    setSimBreakingArticle(null);
    setSimTotal(endIdx - startIdx);
    try {
      let currentState = universeState;
      let breakingSeenCount = countBreakingArticles(currentState);
      const total = endIdx - startIdx;
      // Cria c—pias mut—veis dos planos e slots para o loop (slots s—o atualizados a cada torneio)
      const loopSeasonSlots = Object.fromEntries(
        Object.entries(currentState.playerSeasonSlots ?? {}).map(([k, v]) => [k, { ...v }])
      );

      let done = 0;

      for (let idx = startIdx; idx < endIdx; idx++) {
        if (stopSimRef.current) break;
        const tournament = CALENDAR[idx];
        setSimTournament(tournament);
        setSimProgress(done);

        // Yield para não travar a UI entre torneios
        await new Promise(r => setTimeout(r, 0));

        // Olimp—adas: pula em anos não-ol—mpicos
        if (tournament.isOlympic && !isOlympicSeasonYear(currentState.year)) {
          currentState = reducer(currentState, { type: 'SKIP_TOURNAMENT' });
          done++;
          continue;
        }

        const result = shouldUseFastInvisibleTournament(tournament)
          ? (() => {
              const { bracket, qualifiers, preQualWinners, wildcards, injuryWithdrawals, injuryEvents, updatedByInjury } = runTournamentFast(
                tournament,
                currentState.tourPlayers,
                currentState.prospects,
                loopSeasonSlots,
              );
              return {
                bracket,
                qualifiers,
                preQualWinners,
                wildcards,
                injuryWithdrawals: injuryWithdrawals ?? new Set(),
                injuryEvents: injuryEvents ?? [],
                updatedByInjury: updatedByInjury ?? {},
              };
            })()
          : await runTournament(
              tournament,
              currentState.tourPlayers,
              currentState.prospects,
              null,
              loopSeasonSlots,
              null,
              currentState.year,
              currentState.rivalrySystem ?? null,
              null,
              currentState.radar?.followedPlayerIds ?? [],
            );

        // Aplica resultado e atualiza snapshot local
        const nextState = reducer(currentState, {
          type: 'APPLY_TOURNAMENT_RESULT',
          tournamentId: tournament.id,
          result,
          tournament,
        });
        // Preserva os slots atualizados no snapshot local
        currentState = { ...nextState, playerSeasonSlots: loopSeasonSlots };
        const nextBreakingCount = countBreakingArticles(nextState);
        if (nextBreakingCount > breakingSeenCount) {
          const newestBreaking = getLatestBreakingArticle(nextState);
          if (newestBreaking) setSimBreakingArticle(newestBreaking);
          if (stopOnBreaking) stopSimRef.current = true;
        }
        breakingSeenCount = nextBreakingCount;
        done++;
        setSimProgress(done);
      }

      // Commit final de uma vez (mesmo se parou no meio — salva o progresso)
      setUniverseState(currentState);
    } finally {
      setSimulating(false);
      setSimProgress(0);
      setSimMode('headless');
      setSimTournament(null);
    }
  }, [simulating, universeState, runTournamentFast, countBreakingArticles, getLatestBreakingArticle, stopOnBreaking]);

  const handleSimulate = useCallback(async (mode) => {
    if (simulating || !universeState) return;
    const calIdx = universeState.calendarIndex;
    if (calIdx >= CALENDAR.length) return;

    // -- Range modes (headless, multiple tournaments) ------------------
    if (mode === 'sim_month' || mode === 'sim_grandslam' || mode === 'sim_year' || mode === 'sim_5years' || mode === 'sim_decade' || mode === 'sim_15years' || mode === 'sim_20years') {

      // -- MULTI-YEAR: temporadas completas em headless ---------------
      const multiYearCount = mode === 'sim_5years' ? 5 : mode === 'sim_decade' ? 10 : mode === 'sim_15years' ? 15 : mode === 'sim_20years' ? 20 : 0;
      if (multiYearCount > 0) {
        setSimulating(true);
        setSimProgress(0);
        setSimMode('headless');
        setSimTournament(null);
        setSimEvent(null);
        setSimFeed([]);
        setSimBreakingArticle(null);
        setSimOverlayYear(universeState.year);
        simFeedRef.current = [];
        stopSimRef.current = false;
        try {
          let currentState = universeState;
          let breakingSeenCount = countBreakingArticles(currentState);
          for (let year = 0; year < multiYearCount; year++) {
            if (stopSimRef.current) break;
            // Se a temporada j— terminou, avan—a antes de simular
            if (currentState.calendarIndex >= CALENDAR.length) {
              currentState = reducer(currentState, { type: 'ADVANCE_YEAR' });
            }

            const loopSeasonSlots = Object.fromEntries(
              Object.entries(currentState.playerSeasonSlots ?? {}).map(([k, v]) => [k, { ...v }])
            );

            for (let idx = currentState.calendarIndex; idx < CALENDAR.length; idx++) {
              if (stopSimRef.current) break;
              const tournament = CALENDAR[idx];
              setSimTournament(tournament);
              setSimOverlayYear(currentState.year);
              setSimProgress(year * CALENDAR.length + idx);
              await new Promise(r => setTimeout(r, 0));

              // Olimp—adas: pula em anos não-ol—mpicos
              if (tournament.isOlympic && !isOlympicSeasonYear(currentState.year)) {
                currentState = reducer(currentState, { type: 'SKIP_TOURNAMENT' });
                continue;
              }

              let matchCount = 0;
              const onProgress = async (event) => {
                if (stopSimRef.current) {
                  const e = new Error('SIM_STOPPED'); e.isStopRequest = true; throw e;
                }
                matchCount++;
                setSimProgress(year * CALENDAR.length + idx * 10 + matchCount);
                if (event) {
                  setSimEvent(event);
                  simFeedRef.current = [{ ...event, id: matchCount + idx * 100 }, ...simFeedRef.current].slice(0, 14);
                  setSimFeed([...simFeedRef.current]);
                }
              };

              try {
                let result;
                result = shouldUseFastInvisibleTournament(tournament)
                  ? (() => {
                      const { bracket, qualifiers, preQualWinners, wildcards, injuryWithdrawals, injuryEvents, updatedByInjury } = runTournamentFast(
                        tournament,
                        currentState.tourPlayers,
                        currentState.prospects,
                        loopSeasonSlots,
                      );
                      return {
                        bracket,
                        qualifiers,
                        preQualWinners,
                        wildcards,
                        injuryWithdrawals: injuryWithdrawals ?? new Set(),
                        injuryEvents: injuryEvents ?? [],
                        updatedByInjury: updatedByInjury ?? {},
                      };
                    })()
                  : await runTournament(
                      tournament,
                      currentState.tourPlayers,
                      currentState.prospects,
                      onProgress,
                      loopSeasonSlots,
                      null,
                      currentState.year,
                      currentState.rivalrySystem ?? null,
                      null,
                      currentState.radar?.followedPlayerIds ?? [],
                    );
                const nextState = reducer(currentState, {
                  type: 'APPLY_TOURNAMENT_RESULT',
                  tournamentId: tournament.id,
                  result,
                  tournament,
                });
                currentState = { ...nextState, playerSeasonSlots: loopSeasonSlots };
                const nextBreakingCount = countBreakingArticles(nextState);
                if (nextBreakingCount > breakingSeenCount) {
                  const newestBreaking = getLatestBreakingArticle(nextState);
                  if (newestBreaking) setSimBreakingArticle(newestBreaking);
                  if (stopOnBreaking) stopSimRef.current = true;
                }
                breakingSeenCount = nextBreakingCount;
              } catch (e) {
                if (e.isStopRequest) break;
                throw e;
              }
            }

            if (stopSimRef.current) break;
            // Avan—a o ano
            currentState = reducer(currentState, { type: 'ADVANCE_YEAR' });
          }
          setUniverseState(currentState);
        } finally {
          setSimulating(false);
          setSimProgress(0);
          setSimTournament(null);
          setSimEvent(null);
          setSimFeed([]);
          simFeedRef.current = [];
          setSimMode('headless');
        }
        return;
      }
      const currentMonthNum = CALENDAR[calIdx]?.monthNum ?? 1;
      let endIdx;
      if (mode === 'sim_month') {
        // Todos os torneios do m—s atual, para antes do pr—ximo m—s
        endIdx = calIdx;
        while (endIdx < CALENDAR.length && CALENDAR[endIdx].monthNum === currentMonthNum) endIdx++;
      } else if (mode === 'sim_grandslam') {
        // Para ANTES do pr—ximo Grand Slam ou Finals de dezembro
        endIdx = calIdx;
        while (endIdx < CALENDAR.length) {
          const t = CALENDAR[endIdx];
          if (t.category === 'GRAND_SLAM' || t.category === 'FINALS') break;
          endIdx++;
        }
        // Se j— estamos no grand slam/finals, avan—a um (não simula ele)
        if (endIdx === calIdx) endIdx = calIdx; // permanece sem simular nada
      } else {
        // Ano inteiro — at— o —ltimo torneio
        endIdx = CALENDAR.length;
      }

      if (endIdx <= calIdx) return; // nada a simular

      setSimulating(true);
      setSimProgress(0);
      setSimMode('headless');
      setSimTournament(null);
      setSimEvent(null);
      setSimFeed([]);
      setSimBreakingArticle(null);
      setSimOverlayYear(universeState.year);
      simFeedRef.current = [];
      stopSimRef.current = false;
      try {
        let currentState = universeState;
        let breakingSeenCount = countBreakingArticles(currentState);
        const loopSeasonSlots = Object.fromEntries(
          Object.entries(currentState.playerSeasonSlots ?? {}).map(([k, v]) => [k, { ...v }])
        );
        let done = 0;
        for (let idx = calIdx; idx < endIdx; idx++) {
          if (stopSimRef.current) break;
          const tournament = CALENDAR[idx];
          setSimTournament(tournament);
          setSimOverlayYear(currentState.year);
          setSimProgress(done);
          await new Promise(r => setTimeout(r, 0));

          // Olimp—adas: pula em anos não-ol—mpicos
          if (tournament.isOlympic && !isOlympicSeasonYear(currentState.year)) {
            currentState = reducer(currentState, { type: 'SKIP_TOURNAMENT' });
            done++;
            continue;
          }

          let matchCount = 0;
          const onProgress = async (event) => {
            if (stopSimRef.current) {
              const e = new Error('SIM_STOPPED'); e.isStopRequest = true; throw e;
            }
            matchCount++;
            setSimProgress(done * 10 + matchCount);
            if (event) {
              setSimEvent(event);
              simFeedRef.current = [{ ...event, id: matchCount }, ...simFeedRef.current].slice(0, 14);
              setSimFeed([...simFeedRef.current]);
            }
          };
          try {
            let result;
            result = shouldUseFastInvisibleTournament(tournament)
              ? (() => {
                  const { bracket, qualifiers, preQualWinners, wildcards, injuryWithdrawals, injuryEvents, updatedByInjury } = runTournamentFast(
                    tournament,
                    currentState.tourPlayers,
                    currentState.prospects,
                    loopSeasonSlots,
                  );
                  return {
                    bracket,
                    qualifiers,
                    preQualWinners,
                    wildcards,
                    injuryWithdrawals: injuryWithdrawals ?? new Set(),
                    injuryEvents: injuryEvents ?? [],
                    updatedByInjury: updatedByInjury ?? {},
                  };
                })()
              : await runTournament(
                  tournament,
                  currentState.tourPlayers,
                  currentState.prospects,
                  onProgress,
                  loopSeasonSlots,
                  null,
                  currentState.year,
                  currentState.rivalrySystem ?? null,
                  null,
                  currentState.radar?.followedPlayerIds ?? [],
                );
            const nextState = reducer(currentState, {
              type: 'APPLY_TOURNAMENT_RESULT',
              tournamentId: tournament.id,
              result,
              tournament,
            });
            currentState = { ...nextState, playerSeasonSlots: loopSeasonSlots };
            const nextBreakingCount = countBreakingArticles(nextState);
            if (nextBreakingCount > breakingSeenCount) {
              const newestBreaking = getLatestBreakingArticle(nextState);
              if (newestBreaking) setSimBreakingArticle(newestBreaking);
              if (stopOnBreaking) stopSimRef.current = true;
            }
            breakingSeenCount = nextBreakingCount;
            done++;
            setSimProgress(done);
          } catch (e) {
            if (e.isStopRequest) break;
            throw e;
          }
        }
        setUniverseState(currentState);
      } finally {
        setSimulating(false);
        setSimProgress(0);
        setSimTournament(null);
        setSimEvent(null);
        setSimFeed([]);
        simFeedRef.current = [];
        setSimMode('headless');
      }
      return;
    }

    // -- Modo padr—o: simula apenas o torneio atual (headless) ----------
    const tournament = CALENDAR[calIdx];
    tournamentDebugLog('handleSimulate:start', {
      tournamentId: tournament?.id,
      tournamentName: tournament?.name,
      category: tournament?.category,
      calendarIndex: calIdx,
      year: universeState.year,
      mode: shouldUseFastInvisibleTournament(tournament) ? 'fast-invisible' : 'headless-overlay',
    });

    if (shouldUseFastInvisibleTournament(tournament)) {
      stopSimRef.current = false;
      setSimulating(true);
      try {
        const loopSlots = Object.fromEntries(
          Object.entries(universeState.playerSeasonSlots ?? {}).map(([k, v]) => [k, { ...v }])
        );
        const { bracket, qualifiers, preQualWinners, wildcards, injuryWithdrawals, injuryEvents, updatedByInjury } = runTournamentFast(
          tournament,
          universeState.tourPlayers,
          universeState.prospects,
          loopSlots,
          universeState.preparedTournamentPackage?.tournamentId === tournament.id
            ? universeState.preparedTournamentPackage
            : null,
        );
        universeDispatch({
          type: 'APPLY_TOURNAMENT_RESULT',
          tournamentId: tournament.id,
          result: {
            bracket,
            qualifiers,
            preQualWinners,
            wildcards,
            injuryWithdrawals: injuryWithdrawals ?? new Set(),
            injuryEvents: injuryEvents ?? [],
            updatedByInjury: updatedByInjury ?? {},
          },
          tournament,
        });
        tournamentDebugLog('handleSimulate:fast-invisible:dispatch-called', {
          tournamentId: tournament?.id,
          champion: bracket?.champion?.name ?? null,
        });
      } catch (e) {
        if (!e.isStopRequest) console.error('[handleSimulate] Fast low-tier error:', e);
      } finally {
        setSimulating(false);
        setSimProgress(0);
        setSimTournament(null);
        setSimEvent(null);
        setSimFeed([]);
        simFeedRef.current = [];
        setSimMode('headless');
      }
      return;
    }

    stopSimRef.current = false;   // clear any previous stop request
    setSimulating(true);
    setSimProgress(0);
    setSimMode('headless');
    setSimTournament(tournament);
    setSimEvent(null);
    setSimFeed([]);
    setSimOverlayYear(universeState.year);
    simFeedRef.current = [];
    const estTotal = Math.max(1, (tournament.draw ?? 32) - 1);
    setSimTotal(estTotal);

    // -- Verifica se existe snapshot parcial para retomar --------------
    const sanitizedResumeState = sanitizeBracketSaveState(
      liveBracketSavedStateRef.current,
      tournament.id,
    );
    const hasSavedState = sanitizedResumeState
      && liveBracketLastIdRef.current === tournament.id
      && !sanitizedResumeState.done;

    const partialStateRef = { _qualifiers: [], _snapshotRef: { current: null } };

    // Se tem snapshot parcial, pre-carrega para que o resume saiba o ponto de parada
    if (hasSavedState) {
      partialStateRef._snapshotRef.current = sanitizedResumeState.bracket ?? null;
      partialStateRef._qualifiers = sanitizedResumeState.qualifiers ?? [];
    } else if (liveBracketLastIdRef.current === tournament.id && liveBracketSavedStateRef.current) {
      liveBracketSavedStateRef.current = null;
    }

    try {
      let matchCount = 0;
      const onProgress = async (event) => {
        if (stopSimRef.current) {
          const abortErr = new Error('SIM_STOPPED');
          abortErr.isStopRequest = true;
          throw abortErr;
        }
        matchCount++;
        setSimProgress(matchCount);
        if (event) {
          setSimEvent(event);
          simFeedRef.current = [{ ...event, id: matchCount }, ...simFeedRef.current].slice(0, 14);
          setSimFeed([...simFeedRef.current]);
        }
      };

      let result;
      if (hasSavedState && partialStateRef._snapshotRef.current) {
        tournamentDebugLog('handleSimulate:resume:start', {
          tournamentId: tournament?.id,
          savedRound: partialStateRef._snapshotRef.current?.currentRound ?? null,
        });
        // -- Resume: continua a partir do snapshot salvo ----------------
        // Reconstr—i os jogadores vivos do —ltimo round completo
        const savedBracket = partialStateRef._snapshotRef.current;
        const SURFACE_COURT = { CLAY: 'ROLAND_GARROS', GRASS: 'WIMBLEDON', HARD: 'US_OPEN', STREET: 'URBAN_COURT', CARPET: 'CARPET_COURT', INDOOR: 'O2_ARENA' };
        const courtKey = SURFACE_COURT[tournament.surface] ?? 'US_OPEN';
        const bestOf   = tournament.bestOf ?? 3;

        // Pega sobreviventes do —ltimo round completo
        const lastCompleteRound = savedBracket.rounds[savedBracket.currentRound - 1] ?? savedBracket.rounds[0];
        const survivors = (lastCompleteRound ?? [])
          .filter(m => m.winner)
          .map(m => m.winner)
          .filter(Boolean);

        // Se não sobrou ningu—m (round incompleto), pega os winners do round anterior
        const startPlayers = survivors.length > 1
          ? survivors
          : (savedBracket.rounds[savedBracket.currentRound] ?? [])
              .map(m => m.playerA ?? m.winner).filter(Boolean);

        // Continua o bracket a partir dos sobreviventes
        const resumedBracket = await runBracketAsync(
          startPlayers,
          courtKey,
          bestOf,
          onProgress,
          partialStateRef._snapshotRef,
          tournament,
          universeState.rivalrySystem ?? null,
          null,
          universeState.radar?.followedPlayerIds ?? [],
        );

        // Mescla rounds anteriores com os novos
        const mergedRounds = [
          ...savedBracket.rounds.slice(0, savedBracket.currentRound),
          ...resumedBracket.rounds,
        ];

        result = {
          bracket: { ...resumedBracket, rounds: mergedRounds },
          qualifiers: partialStateRef._qualifiers ?? [],
          preQualWinners: [],
          wildcards: [],
          injuryWithdrawals: new Set(),
          injuryEvents: [],
          updatedByInjury: {},
        };
        liveBracketSavedStateRef.current = null; // limpa o snapshot
      } else {
        // -- Fresh start ------------------------------------------------
        tournamentDebugLog('handleSimulate:fresh-run:start', {
          tournamentId: tournament?.id,
          preparedPackage: universeState.preparedTournamentPackage?.tournamentId === tournament.id,
        });
        result = await runTournament(
          tournament,
          universeState.tourPlayers,
          universeState.prospects,
          onProgress,
          universeState.playerSeasonSlots ?? {},
          partialStateRef,
          universeState.year,
          universeState.rivalrySystem ?? null,
          universeState.preparedTournamentPackage?.tournamentId === tournament.id
            ? universeState.preparedTournamentPackage
            : null,
          universeState.radar?.followedPlayerIds ?? [],
        );
      }
      tournamentDebugLog('handleSimulate:runTournament:return', {
        tournamentId: tournament?.id,
        champion: result?.bracket?.champion?.name ?? null,
        rounds: result?.bracket?.rounds?.length ?? 0,
      });
      universeDispatch({
        type: 'APPLY_TOURNAMENT_RESULT',
        tournamentId: tournament.id,
        result,
        tournament,
      });
      tournamentDebugLog('handleSimulate:dispatch-called', {
        tournamentId: tournament?.id,
        champion: result?.bracket?.champion?.name ?? null,
      });

      // Mostra cerim—nia após torneios principais
      const skipCeremony = tournament.isJuniors || isBaseCircuitTournament(tournament);
      if (getResChampion(result) && !skipCeremony) {
        tournamentDebugLog('handleSimulate:ceremony:start', {
          tournamentId: tournament?.id,
          champion: getResChampion(result)?.name ?? null,
        });
        // Gera wrapData aqui, antes do newsEngine processar — para a aba AN—LISE
        let wrapData = null;
        try {
          const wrapArt = genTournamentWrap({
            tournament,
            bracket: result.bracket,
            year: universeState.year,
            updatedByInjury: result.updatedByInjury ?? {},
            injuryWithdrawals: result.injuryWithdrawals ?? new Set(),
            allPlayers: [...universeState.tourPlayers, ...(universeState.prospects ?? [])],
          });
          wrapData = wrapArt?.wrapData ?? null;
        } catch (we) {
          console.warn('[handleSimulate] wrapData falhou:', we);
        }
        setCeremonyData({ tournament, bracket: result.bracket, wrapData });
        tournamentDebugLog('handleSimulate:ceremony:set', {
          tournamentId: tournament?.id,
          hasWrapData: !!wrapData,
        });
      }
    } catch (e) {
      // Se o usu—rio parou, salva o estado parcial para continuar no bracket
      if (e.isStopRequest && partialStateRef._snapshotRef.current) {
        liveBracketSavedStateRef.current = {
          phase: 'MAIN_DRAW',
          qBracket: null,
          qDone: true,
          bracket: partialStateRef._snapshotRef.current,
          qualifiers: partialStateRef._qualifiers ?? [],
          done: false,
          tournamentId: tournament.id,
        };
        liveBracketLastIdRef.current = tournament.id;
      } else if (!e.isStopRequest) {
        console.error('[handleSimulate] Erro ao simular torneio:', e);
        tournamentDebugLog('handleSimulate:error', {
          tournamentId: tournament?.id,
          message: e?.message,
          stack: e?.stack,
        });
      }
    } finally {
      tournamentDebugLog('handleSimulate:finally', {
        tournamentId: tournament?.id,
      });
      setSimulating(false);
      setSimProgress(0);
      setSimTournament(null);
      setSimEvent(null);
      setSimFeed([]);
      simFeedRef.current = [];
    }
  }, [simulating, universeState, universeDispatch, countBreakingArticles, getLatestBreakingArticle, stopOnBreaking]);


  // -- SAVE / LOAD -------------------------------------------------------
  const handleSaveGame = useCallback(async () => {
    if (!universeState) return;
    const s = universeState;
    const payload = buildUniverseSavePayload(s);
    try {
      const artifact = await createSaveArtifactOffThread(payload, { gameVersion: '0.7.0' });
      await storeRotatingAutosave(artifact, {
        ...artifact.header,
        year: s.year,
        season: s.season,
        reason: 'MANUAL',
      });
      const url = URL.createObjectURL(artifact.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hv_universe_T${s.season ?? 1}_${s.year ?? 2025}${artifact.extension}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      console.info(`[SaveGame] Save V${SAVE_SCHEMA_VERSION}: ${(artifact.storedBytes / 1024 / 1024).toFixed(2)} MB (${artifact.compressed ? 'gzip' : 'JSON'}).`);
    } catch (error) {
      console.error('[SaveGame] Falha ao salvar:', error);
      alert(`Nao foi possivel salvar o jogo: ${error?.message ?? 'erro desconhecido'}`);
    }
  }, [universeState]);

  // Snapshot silencioso depois de progresso real no calendario. Mantemos tres
  // copias rotativas no navegador; nao baixa arquivo e nao interrompe a tela.
  useEffect(() => {
    if (!universeState || phase !== 'running' || simulating) return undefined;
    const signature = `${universeState.year}:${universeState.calendarIndex}:${universeState.season}`;
    if (lastAutosaveSignatureRef.current === signature) return undefined;
    const timer = setTimeout(async () => {
      try {
        const payload = buildUniverseSavePayload(universeState);
        const artifact = await createSaveArtifactOffThread(payload, { gameVersion: '0.7.0' });
        await storeRotatingAutosave(artifact, {
          ...artifact.header,
          year: universeState.year,
          season: universeState.season,
          reason: 'AUTO_PROGRESS',
        });
        lastAutosaveSignatureRef.current = signature;
      } catch (error) {
        console.warn('[Autosave] Nao foi possivel criar o snapshot automatico:', error);
      }
    }, 2200);
    return () => clearTimeout(timer);
  }, [phase, simulating, universeState?.year, universeState?.season, universeState?.calendarIndex]);

  const handleLoadGame = useCallback((source = null) => {
    const loadFile = async (file) => {
      if (!file) return;
      try {
          const decoded = await decodeSaveFileOffThread(file);
          const data = decoded.payload;

          const rivalrySystem   = new RivalrySystem();
          rivalrySystem.fromJSON(data.rivalrySystem ?? null);

          const chronicleEngine = new ChronicleEngine();
          chronicleEngine.fromJSON(data.chronicleEngine ?? null);

          const newsEngine = NewsEngine.fromJSON(data.newsEngine ?? null);

          // -- Sincroniza careerTitles a partir do recordsStore --------------
          // Garante que saves antigos (onde careerTitles estava zerado) mostrem
          // os t—tulos corretos — o recordsStore — a fonte de verdade acumulada.
          const _rs = data.recordsStore ?? { _version:1, playerStats:{} };
          const _syncCareerTitles = (players) => (players ?? []).map(p => {
            const st = _rs.playerStats?.[p.id];
            if (!st) return p;
            const synced = {
              gs:      st.gs      ?? 0,
              slamClash: st.slam_clash ?? 0,
              masters: st.masters ?? 0,
              finals:  st.finals_titles ?? 0,
              atp500:  st.atp500  ?? 0,
              atp250:  st.atp250  ?? 0,
              atp100:  st.atp100  ?? 0,
              olympic: st.olympic_gold > 0 ? { gold: st.olympic_gold } : (p.careerTitles?.olympic ?? undefined),
            };
            // S— substitui se o objeto atual ainda estiver totalmente zerado
            // (saves novos j— ter—o os valores corretos no pr—prio objeto)
            const ct = p.careerTitles ?? {};
            const currentTotal = (ct.gs??0)+(ct.slamClash??0)+(ct.masters??0)+(ct.finals??0)+(ct.atp500??0)+(ct.atp250??0)+(ct.atp100??0);
            const syncedTotal  = synced.gs+synced.slamClash+synced.masters+synced.finals+synced.atp500+synced.atp250+synced.atp100;
            if (currentTotal === 0 && syncedTotal > 0) {
              return { ...p, careerTitles: synced,
                _careerTitles:     st.titles  ?? syncedTotal,
                _careerGrandSlams: st.gs      ?? 0,
                _careerWins:       st.wins    ?? p._careerWins    ?? 0,
                _careerFinals:     st.finals  ?? p._careerFinals  ?? 0,
              };
            }
            return p;
          });

          const loadedWorldDate = normalizeUniverseDate(data.worldDate ?? { year: data.year ?? 2025, month: 1 }, data.year ?? 2025);
          const migrateLoadedSurface = player => ensureSurfaceProfile(player, { year: loadedWorldDate.year, source: 'SAVE_MIGRATION' });
          const loadedTourPlayers = _syncCareerTitles(data.tourPlayers ?? []).map(p => migrateLoadedSurface(ensureLifeSimulation(ensureDevelopmentLedger(applyYouthAgeCaps(ensureYouthProfile(ensurePlayerBirthDate(ensureCareerTrajectory(stripOldCoachButKeepBancoVivo(p), loadedWorldDate.year, 'SAVE_MIGRATION'), loadedWorldDate, loadedWorldDate.year), loadedWorldDate.year, 'SAVE_MIGRATION'), { age: p.age }), loadedWorldDate.year), loadedWorldDate)));
          const loadedProspects = (data.prospects ?? []).map(p => migrateLoadedSurface(ensureLifeSimulation(ensureDevelopmentLedger(applyYouthAgeCaps(ensureYouthProfile(ensurePlayerBirthDate(ensureCareerTrajectory(stripOldCoachButKeepBancoVivo(p), loadedWorldDate.year, 'SAVE_MIGRATION'), loadedWorldDate, loadedWorldDate.year), loadedWorldDate.year, 'SAVE_MIGRATION'), { age: p.age }), loadedWorldDate.year), loadedWorldDate)));
          let loadedCoachMarket = migrateCoachMarket(data.coachMarket, [...loadedTourPlayers, ...loadedProspects], data.year ?? 2025);
          // Repara individualmente os ausentes. A função preserva quem já tem
          // vínculo válido, então saves parcialmente quebrados também voltam a
          // ter um mercado coerente sem resetar as parcerias existentes.
          const seededCoaching = initializePlayersCoaching(loadedTourPlayers, loadedCoachMarket, data.year ?? 2025);
          loadedCoachMarket = seededCoaching.coachMarket;
          let loadedCoachingPlayers = seededCoaching.players;

          // Recalcula no carregamento: saves antigos guardam o cache `ranked`
          // com a regra anterior, mas os resultados brutos continuam válidos.
          const loadedRankingStore = {
            ...(data.rankingStore ?? createRankingStore()),
            playerResults: Object.fromEntries(Object.entries(data.rankingStore?.playerResults ?? {}).map(([id, rows]) => [id, [...rows]])),
            prospectResults: Object.fromEntries(Object.entries(data.rankingStore?.prospectResults ?? {}).map(([id, rows]) => [id, [...rows]])),
            seedOrder: data.rankingStore?.seedOrder ?? Object.fromEntries(loadedCoachingPlayers.map((player, index) => [player.id, index + 1])),
            ranked: [], prospectRanked: [],
          };
          const loadedRanked = computeRanking(loadedRankingStore, loadedCoachingPlayers.map(p => p.id));
          const loadedProspectRanked = computeProspectRanking(loadedRankingStore, loadedProspects.map(p => p.id));
          const loadedRankMap = Object.fromEntries(loadedRanked.map(r => [r.playerId, r.position]));
          const loadedProspectRankMap = Object.fromEntries(loadedProspectRanked.map(r => [r.playerId, r.position]));
          loadedCoachingPlayers = loadedCoachingPlayers.map(p => ({ ...p, rankPosition: loadedRankMap[p.id] ?? p.rankPosition }));
          const rankedLoadedProspects = loadedProspects.map(p => ({ ...p, rankPosition: loadedProspectRankMap[p.id] ?? p.rankPosition }));

          const loaded = {
            year:                        data.year                        ?? 2025,
            worldDate:                   loadedWorldDate,
            season:                      data.season                      ?? 1,
            calendarIndex:               data.calendarIndex               ?? 0,
            tourPlayers:                 loadedCoachingPlayers,
            prospects:                   rankedLoadedProspects,
            youthCohortUniverse:         ensureYouthCohortUniverse(data.youthCohortUniverse, loadedWorldDate.year, rankedLoadedProspects.length),
            competitiveDensity:          ensureCompetitiveDensityState(data.competitiveDensity, loadedWorldDate.year),
            circuitShock:                data.circuitShock ?? null,
            youthExitArchive:            (data.youthExitArchive ?? []).slice(-500),
            retiredPlayers:              _syncCareerTitles(data.retiredPlayers ?? []).map(p => migrateLoadedSurface(ensureYouthProfile(ensurePlayerBirthDate(ensureCareerTrajectory(stripOldCoachButKeepBancoVivo(p), loadedWorldDate.year, 'SAVE_MIGRATION'), loadedWorldDate, loadedWorldDate.year), loadedWorldDate.year, 'SAVE_MIGRATION'))),
            coachMarket:                 loadedCoachMarket,
            rankingStore:                loadedRankingStore,
            tournamentResults:           data.tournamentResults           ?? {},
            historicalTournamentResults: data.historicalTournamentResults ?? {},
            circuitShifts:               (data.circuitShifts ?? []).slice(-120),
            latestCircuitShift:          data.latestCircuitShift ?? null,
            historyBook:                 migrateHistoryBook(data.historyBook, data.chronicleEngine, data.year ?? 2025),
            events:                      data.events                      ?? [],
            
            playerSeasonSlots:           data.playerSeasonSlots           ?? {},
            newgenImagePool:             data.newgenImagePool             ?? {},
            yearSummary:                 data.yearSummary                 ?? null,
            preparedTournamentPackage:   null,
            preparedTournamentPackageCache: {},
            view:                        null,
            rivalrySystem,
            chronicleEngine,
            newsEngine,
            sponsorPool:                 ensureSponsorPoolFoundation(data.sponsorPool ?? initSponsorPool({ year: data.year ?? 2025 }), data.year ?? 2025),
            pendingOffers:               data.pendingOffers       ?? [],
            highestPaidPlayerId:         data.highestPaidPlayerId ?? null,
            seasonPulseState:            data.seasonPulseState    ?? createSeasonPulseState(data.year ?? 2025),
            monthlyInterviews:           data.monthlyInterviews   ?? [],
            grandSlamInterviews:         data.grandSlamInterviews ?? [],
            recordsStore:                data.recordsStore        ?? { _version:1, playerStats:{} },
            radar:                       createRadarState(data.radar),
          };

          resetTransientUniverseRuntime();
          setUniverseState(loaded);
          setPhase('running');
        } catch (err) {
          console.error('[LoadGame] Erro ao carregar save:', err);
          alert(`Erro ao carregar o arquivo: ${err?.message ?? 'save invalido'}`);
        }
    };
    if (source instanceof Blob) {
      loadFile(source);
      return;
    }
    const input    = document.createElement('input');
    input.type     = 'file';
    input.accept   = '.tennis-save,.json,.gz,application/json,application/gzip';
    input.onchange = (event) => loadFile(event.target.files?.[0]);
    input.click();
  }, [resetTransientUniverseRuntime]);

  const handleRestoreAutosave = useCallback(async () => {
    try {
      const latest = await loadLatestAutosave();
      if (!latest?.blob) {
        alert('Ainda nao existe um backup automatico neste navegador.');
        return;
      }
      const label = `${latest.year ?? 'ano desconhecido'} · ${new Date(latest.savedAt).toLocaleString('pt-BR')}`;
      if (!confirm(`Recuperar o backup automatico mais recente?\n${label}`)) return;
      handleLoadGame(latest.blob);
    } catch (error) {
      console.error('[Autosave] Falha ao recuperar:', error);
      alert(`Nao foi possivel recuperar o backup: ${error?.message ?? 'erro desconhecido'}`);
    }
  }, [handleLoadGame]);

  useEffect(() => {
    if (!autoLoadKey || lastAutoLoadKeyRef.current === autoLoadKey) return;
    lastAutoLoadKeyRef.current = autoLoadKey;
    handleLoadGame();
  }, [autoLoadKey, handleLoadGame]);

  const handleViewBracket = useCallback((tournament) => {
    if (!tournament?.id) return;
    // Only clear saved state when opening a DIFFERENT tournament
    // Use liveBracketLastIdRef so we still know the last id after the user
    // clicked "voltar" and liveBracketTournament became null
    if (liveBracketLastIdRef.current !== tournament.id) {
      liveBracketSavedStateRef.current = null;
    }
    liveBracketLastIdRef.current = tournament.id;
    setLiveBracketTournament(tournament);
  }, []);

  const handleBracketApplyResult = useCallback((bracket, qualifiers) => {
    if (!liveBracketTournament || !universeState) return;
    const t = liveBracketTournament;
    const prepared = universeState.preparedTournamentPackage?.tournamentId === t.id
      ? universeState.preparedTournamentPackage
      : null;
    const result = {
      bracket,
      qualifiers,
      preQualWinners: prepared?.preQualWinners ?? [],
      wildcards: [],
      injuryWithdrawals: prepared?.injuryWithdrawals ?? new Set(),
      injuryEvents: prepared?.injuryEvents ?? [],
      updatedByInjury: prepared?.updatedByInjury ?? {},
      qualRoundsData: prepared?.qualRoundsData ?? [],
    };
    universeDispatch({
      type: 'APPLY_TOURNAMENT_RESULT',
      tournamentId: t.id,
      result,
      tournament: t,
    });
    liveBracketSavedStateRef.current = null;
    liveBracketLastIdRef.current     = null;
    setLiveBracketTournament(null);

    // Mostra cerim—nia se houver campe—o (mesma regra dos outros caminhos)
    const skipCeremony = t.isJuniors || isBaseCircuitTournament(t);
    if (getResChampion(result) && !skipCeremony) {
      let wrapData = null;
      try {
        const wrapArt = genTournamentWrap({
          tournament: t, bracket,
          year: universeState.year,
          updatedByInjury: result.updatedByInjury ?? {},
          injuryWithdrawals: result.injuryWithdrawals ?? new Set(),
          allPlayers: [...universeState.tourPlayers, ...(universeState.prospects ?? [])],
        });
        wrapData = wrapArt?.wrapData ?? null;
      } catch {}
      setCeremonyData({ tournament: t, bracket, wrapData });
    }
  }, [liveBracketTournament, universeState, universeDispatch]);

  // Game loop for watching matches
  useEffect(() => {
    if (!watchMatchState) return;
    const DT_FIXED = 1 / 60;
    let running = true;
    const prev = { g0: -1, g1: -1, s0: -1, s1: -1, tb: false };
    // Dá tempo para o espectador ler a telemetria antes de abrir o próximo ponto.
    // Quando a oportunidade chega cedo, o motor a conserva em PRE_SERVE; não a pula.
    const highlightsReadingStartedAt = performance.now();
    const HIGHLIGHTS_READING_MIN_MS = 2600;

    // Classifica o tipo de ponto atual (em PRE_SERVE)
    // Retorna: { isGamePoint, isBreakPoint, isSetPoint, isMatchPoint } ou null
    function classifyPoint(gs) {
      if (gs.gameState !== GameState.PRE_SERVE) return null;
      const sv = gs.players[gs.server];
      const rv = gs.players[gs.receiver];
      const setsNeeded = gs.setsToWin ?? 2;

      let isBreakPoint = false, isGamePoint = false;

      if (gs.inTiebreak) {
        const tbSv = gs.tbScore[gs.server];
        const tbRv = gs.tbScore[gs.receiver];
        // No tie-break é preciso liderar por um ponto para ter chance real de fechar.
        // O empate em 6-6 não pode virar dois "set points" simultâneos.
        isGamePoint  = tbSv >= 6 && tbSv - tbRv >= 1;
        isBreakPoint = tbRv >= 6 && tbRv - tbSv >= 1;
        if (!isGamePoint && !isBreakPoint) return null;
      } else {
        isGamePoint  = sv.score >= 3 && (sv.score > rv.score || sv.score === 4);
        isBreakPoint = rv.score >= 3 && (rv.score > sv.score || rv.score === 4);
        if (!isGamePoint && !isBreakPoint) return null;
      }

      // Set point: quem vai ganhar o game pode fechar o set?
      const svGames = sv.games, rvGames = rv.games;
      let isSetPoint = false;
      if (isGamePoint && (svGames >= 5 || (gs.inTiebreak))) isSetPoint = true;
      if (isBreakPoint && (rvGames >= 5 || (gs.inTiebreak))) isSetPoint = true;

      // Match point: quem pode fechar o set est— a um set do t—tulo?
      let isMatchPoint = false;
      if (isSetPoint) {
        if (isGamePoint && sv.sets === setsNeeded - 1) isMatchPoint = true;
        if (isBreakPoint && rv.sets === setsNeeded - 1) isMatchPoint = true;
      }

      const opportunityPlayerIndex = isBreakPoint ? gs.receiver : gs.server;
      return {
        isGamePoint, isBreakPoint, isSetPoint, isMatchPoint,
        opportunityPlayerIndex,
        opportunityName: gs.players[opportunityPlayerIndex]?.name ?? null,
      };
    }

    // Deve parar e mostrar ao vivo este ponto?
    function shouldStop(gs) {
      const c = classifyPoint(gs);
      if (!c) return false;
      const f = hlFiltersRef.current;
      if (c.isMatchPoint && f.matchPoint) return true;
      if (c.isSetPoint   && f.setPoint)   return true;
      if (c.isBreakPoint && f.breakPoint) return true;
      if (c.isGamePoint  && f.gamePoint)  return true;
      return false;
    }

    // Label curto para o feed
    function pointLabel(gs) {
      const c = classifyPoint(gs);
      const label = buildHighlightsSuspenseLabel(gs, c);
      if (!label || !c) return null;
      const name = c.opportunityName ?? 'O jogador';
      const headline = c.isMatchPoint
        ? `${name} pode fechar a partida`
        : c.isSetPoint
          ? `${name} pode fechar o set`
          : c.isBreakPoint
            ? `${name} ameaça o saque rival`
            : `${name} tenta confirmar o game`;
      return { ...label, ...c, headline };
    }

    function gameJustEnded(gs) {
      const g0 = gs.players[0].games, g1 = gs.players[1].games;
      const s0 = gs.players[0].sets,  s1 = gs.players[1].sets;
      if (s0 !== prev.s0 || s1 !== prev.s1) return true;
      if (g0 !== prev.g0 || g1 !== prev.g1) return true;
      if (prev.tb && !gs.inTiebreak) return true;
      return false;
    }

    function savePrev(gs) {
      prev.g0 = gs.players[0].games; prev.g1 = gs.players[1].games;
      prev.s0 = gs.players[0].sets;  prev.s1 = gs.players[1].sets;
      prev.tb = gs.inTiebreak;
    }

    function takeSnap(gs) {
      setSnap({
        players: gs.players.map(p => ({
          ...p,
          styleData: { ...(p.styleData ?? {}) },
          ctx: { ...(p.ctx ?? {}) },
          stamina: p.stamina,
          namedPlayerKey: p.namedPlayerKey,
          setsHistory: p.setsHistory,
          _heatGrid: p._heatGrid ? new Uint16Array(p._heatGrid) : null,
        })),
        ball: { ...gs.ball },
        gameState: gs.gameState,
        rally: gs.rally, maxRally: gs.maxRally,
        totalPoints: gs.totalPoints ?? 0,
        setsDetail: getSetsDetailFromPlayers(gs.players),
        server: gs.server ?? 0,
        ballZ: gs.ball.pos.z,
        ballSpeed: Math.round(mag3(gs.ball.vel) * 3.6),
        courtMeta: gs.courtMeta,
        bounceLog: gs.bounceLog ? [...gs.bounceLog] : [],
        debugEvents: gs.debugEvents ? [...gs.debugEvents] : [],
        trace: gs.trace ?? null,
        inTiebreak: gs.inTiebreak ?? false,
        tbScore: gs.tbScore ? [...gs.tbScore] : [0, 0],
        heat: gs.heat ? { ...gs.heat } : null,
        pointHistory: gs.pointHistory ? [...gs.pointHistory] : [],
        matchFeelTelemetry: (gs.matchFeelTelemetry ?? []).slice(-40).map(e => ({ ...e })),
        lastMatchFeelPoint: gs.lastMatchFeelPoint ? { ...gs.lastMatchFeelPoint } : null,
        lastMatchDirectorCue: gs.lastMatchDirectorCue ? { ...gs.lastMatchDirectorCue } : null,
        matchArcState: gs.matchArcState ? { ...gs.matchArcState } : null,
        matchStoryCapsules: (gs.matchStoryCapsules ?? []).slice(-40).map(e => ({ ...e })),
        lastMatchStoryCapsule: gs.lastMatchStoryCapsule ? { ...gs.lastMatchStoryCapsule } : null,
        matchNarrativeDossier: gs.matchNarrativeDossier ? { ...gs.matchNarrativeDossier } : null,
      });
    }

    const SCORE_LABELS = ['0', '15', '30', '40', 'Ad'];
    function formatScore(gs) {
      if (gs.inTiebreak) return `TB ${gs.tbScore[0]}—${gs.tbScore[1]}`;
      const sv = gs.players[gs.server], rv = gs.players[gs.receiver];
      const sg = SCORE_LABELS[sv.score] ?? sv.score;
      const rg = SCORE_LABELS[rv.score] ?? rv.score;
      return `${sv.games}-${rv.games} (${sg}-${rg})`;
    }

    function loop() {
      if (!running || !gsRef.current) return;
      const gs = gsRef.current;

      // -- HIGHLIGHTS: headless at— encontrar ponto para parar -----------
      if (highlightsModeRef.current && !highlightsPaused) {
        let ticks = 0;
        // Snapshot do estado antes do ponto para poder logar no feed
        let prePointSnap = null;

        while (running && ticks < 800) {
          // Em PRE_SERVE: captura estado antes de simular e verifica se para
          if (gs.gameState === GameState.PRE_SERVE) {
            const lbl = pointLabel(gs);
            if (lbl) {
              // Guarda snap do pr—-ponto para adicionar ao feed depois
              prePointSnap = {
                label: lbl,
                headline: lbl.headline,
                opportunityName: lbl.opportunityName,
                opportunityPlayerIndex: lbl.opportunityPlayerIndex,
                subline: lbl.subline,
                tone: lbl.tone,
                intensity: lbl.intensity,
                score: formatScore(gs),
                s0: gs.players[0].sets, s1: gs.players[1].sets,
                g0: gs.players[0].games, g1: gs.players[1].games,
                inTiebreak: !!gs.inTiebreak,
              };
            }
            if (shouldStop(gs)) {
              if (performance.now() - highlightsReadingStartedAt < HIGHLIGHTS_READING_MIN_MS) {
                takeSnap(gs);
                rafRef.current = requestAnimationFrame(loop);
                return;
              }
              if (prePointSnap) {
                const detected = { ...prePointSnap, id: Date.now() + ticks };
                hlFeedRef.current = [detected, ...hlFeedRef.current].slice(0, 12);
                setHlFeed([...hlFeedRef.current]);
                prePointSnap = null;
              }
              savePrev(gs);
              setHighlightsPaused(true);
              break;
            }
          }

          gameTick(gs, DT_FIXED);
          ticks++;
          if (gs.gameState === GameState.GAME_OVER) { running = false; break; }

          // Pula POINT_END: adiciona ao feed e avan—a
          if (gs.gameState === GameState.POINT_END && prePointSnap) {
            // Quem ganhou o ponto?
            const p0 = gs.players[0], p1 = gs.players[1];
            // Avan—a at— sair do POINT_END
            for (let i = 0; i < 90 && gs.gameState === GameState.POINT_END; i++) gameTick(gs, DT_FIXED);
            // Adiciona ao feed
            const entry = { ...prePointSnap, id: Date.now() + ticks };
            hlFeedRef.current = [entry, ...hlFeedRef.current].slice(0, 12);
            setHlFeed([...hlFeedRef.current]);
            prePointSnap = null;
            continue;
          }
          if (gs.gameState === GameState.POINT_END) {
            for (let i = 0; i < 90 && gs.gameState === GameState.POINT_END; i++) gameTick(gs, DT_FIXED);
          }
        }

        takeSnap(gs);
        if (gs.gameState === GameState.GAME_OVER) { running = false; return; }
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // -- NORMAL ou HIGHLIGHTS AO VIVO ---------------------------------
      gameTick(gs, DT_FIXED * (speedRef.current ?? 1));
      if (gs.ball.inFlight) {
        trailRef.current.push({ ...gs.ball.pos });
        if (trailRef.current.length > TRAIL_LEN) trailRef.current.shift();
      } else if (trailRef.current.length > 0) {
        trailRef.current.shift();
      }
      const hist = frameHistoryRef.current ?? [];
      hist.push({
        ts: Date.now(),
        frameIdx: (hist.length > 0 ? hist[hist.length - 1].frameIdx + 1 : 0),
        ball: {
          pos: { ...gs.ball.pos },
          vel: { ...gs.ball.vel },
          inFlight: gs.ball.inFlight,
          bounceCount: gs.ball.bounceCount,
          lastHitBy: gs.ball.lastHitBy,
          spin: { ...(gs.ball.spin || { x: 0, y: 0, z: 0 }) },
          lastShotType: gs.ball._lastShotType ?? gs.ball.lastShotType ?? null,
          lastShotMeta: gs.ball._lastShotMeta ? { ...gs.ball._lastShotMeta } : null,
          serveTargetY: gs.ball._serveTargetY ?? null,
          serveExitKmh: gs.ball._serveExitKmh ?? null,
        },
        players: gs.players.map(p => ({
          id: p.id,
          name: p.name,
          color: p.color,
          pos: { ...p.pos },
          vel: { ...(p.vel || { x: 0, y: 0 }) },
          styleId: p.styleId,
          namedPlayerKey: p.namedPlayerKey,
          ctx: p.ctx ? {
            intent: p.ctx.intent ?? null,
            courtMode: p.ctx.courtMode ?? null,
            momentum: p.ctx.momentum ?? null,
            _momentumEWMA: p.ctx._momentumEWMA ?? null,
            underPressure: p.ctx.underPressure ?? null,
            rallyPressure: p.ctx.rallyPressure ?? null,
            lastShotType: p.ctx.lastShotType ?? null,
            netPhase: p.ctx.netPhase ?? null,
            _footingState: p.ctx._footingState ?? null,
            _postHitPause: p.ctx._postHitPause ?? null,
          } : null,
          stamina: p.stamina ?? null,
          shotCount: p.shotCount ?? 0,
          winnerCount: p.winnerCount ?? 0,
          errorCount: p.errorCount ?? 0,
          _arrivalMargin: p._arrivalMargin ?? null,
          _posLocked: p._posLocked ?? null,
          _stableTarget: p._stableTarget ? { ...p._stableTarget } : null,
          _postHitRecoveryTimer: p._postHitRecoveryTimer ?? null,
          _serveShortDetected: p._serveShortDetected ?? null,
          _readPauseFrames: p._readPauseFrames ?? null,
        })),
        trail: trailRef.current.map(t => ({ ...t })),
        rally: gs.rally,
        gameState: gs.gameState,
        ballSpeed: Math.round(Math.sqrt((gs.ball.vel.x || 0) ** 2 + (gs.ball.vel.y || 0) ** 2 + (gs.ball.vel.z || 0) ** 2) * 3.6),
        lastShotEvent: (() => {
          const evs = gs.debugEvents;
          if (!evs || evs.length === 0) return null;
          const ev = evs[evs.length - 1];
          return ev.type === 'SHOT_EVENT' ? { ...ev } : null;
        })(),
        lastBouncePos: gs.lastBouncePos ? { ...gs.lastBouncePos } : null,
        recentShotEvents: (gs.debugEvents ?? []).slice(-80).map(ev => ({ ...ev })),
        recentBounceLog: (gs.bounceLog ?? []).slice(-80).map(b => ({ ...b, launchMeta: b.launchMeta ? { ...b.launchMeta } : null })),
        liveAudit: gs.liveAuditSnap ? {
          ...gs.liveAuditSnap,
          counters: { ...(gs.liveAuditSnap.counters ?? {}) },
          health: { ...(gs.liveAuditSnap.health ?? {}) },
          players: (gs.liveAuditSnap.players ?? []).map(lp => ({ ...lp, shotCounts: { ...(lp.shotCounts ?? {}) } })),
          recent: (gs.liveAuditSnap.recent ?? []).map(e => ({ ...e })),
          pinned: (gs.liveAuditSnap.pinned ?? []).map(e => ({ ...e })),
        } : null,
        courtMeta: gs.courtMeta ? { ...gs.courtMeta } : null,
        courtPhysics: gs.courtPhysics ? { ...gs.courtPhysics } : null,
        matchFeelTelemetry: (gs.matchFeelTelemetry ?? []).slice(-40).map(e => ({ ...e })),
        lastMatchFeelPoint: gs.lastMatchFeelPoint ? { ...gs.lastMatchFeelPoint } : null,
        lastMatchDirectorCue: gs.lastMatchDirectorCue ? { ...gs.lastMatchDirectorCue } : null,
        matchArcState: gs.matchArcState ? { ...gs.matchArcState } : null,
        matchStoryCapsules: (gs.matchStoryCapsules ?? []).slice(-40).map(e => ({ ...e })),
        lastMatchStoryCapsule: gs.lastMatchStoryCapsule ? { ...gs.lastMatchStoryCapsule } : null,
        matchNarrativeDossier: gs.matchNarrativeDossier ? { ...gs.matchNarrativeDossier } : null,
        score: gs.players?.map(p => ({ sets: p.sets, games: p.games, score: p.score })) ?? [],
        server: gs.server,
        totalPoints: gs.totalPoints,
        isFirstBounce: gs.isFirstBounce,
        serveBounced: gs.serveBounced,
        receiverTouched: gs.receiverTouched,
      });
      if (hist.length > HISTORY_LEN) hist.shift();
      frameHistoryRef.current = hist;
      takeSnap(gs);
      if (gs.gameState === GameState.GAME_OVER) { running = false; return; }

      if (highlightsModeRef.current && highlightsPaused && gameJustEnded(gs)) {
        setHighlightsPaused(false);
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    if (gsRef.current) savePrev(gsRef.current);
    rafRef.current = requestAnimationFrame(loop);
    return () => { running = false; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [watchMatchState, highlightsPaused]);

  useEffect(() => { speedRef.current = simSpeed; }, [simSpeed]);

  // -- Auto-simulate low-tier and junior tournaments invisibly --
  useEffect(() => {
    if (simulating || !universeState || liveBracketTournament || watchMatchState || preGamePending) return;
    const calIdx = universeState.calendarIndex;
    if (calIdx >= CALENDAR.length) return;
    const nextT = CALENDAR[calIdx];
    if (!nextT) return;
    const isAutoSimTournament =
      isBaseCircuitTournament(nextT) ||
      isJuniorTournament(nextT);
    if (!isAutoSimTournament) return;
    // Already simulated?
    if (universeState.tournamentResults?.[nextT.id]) return;

    // Fire fast invisible simulation automatically
    setSimulating(true);
    setSimProgress(0);
    setSimMode('headless');
    setSimTournament(nextT);
    setSimEvent(null);
    setSimFeed([]);
    simFeedRef.current = [];
    const loopSeasonSlots = Object.fromEntries(
      Object.entries(universeState.playerSeasonSlots ?? {}).map(([k, v]) => [k, { ...v }])
    );

    Promise.resolve().then(async () => {
      try {
        const { bracket, qualifiers, preQualWinners, wildcards, injuryWithdrawals, injuryEvents, updatedByInjury } = runTournamentFast(
          nextT,
          universeState.tourPlayers,
          universeState.prospects,
          loopSeasonSlots,
        );
        universeDispatch({
          type: 'APPLY_TOURNAMENT_RESULT',
          tournamentId: nextT.id,
          result: {
            bracket,
            qualifiers,
            preQualWinners,
            wildcards,
            injuryWithdrawals: injuryWithdrawals ?? new Set(),
            injuryEvents: injuryEvents ?? [],
            updatedByInjury: updatedByInjury ?? {},
          },
          tournament: nextT,
        });
      } catch (e) {
        console.error('[AutoSim] erro ao simular', nextT.name, e);
      } finally {
        setSimulating(false);
        setSimProgress(0);
        setSimTournament(null);
        setSimEvent(null);
        setSimFeed([]);
        simFeedRef.current = [];
        setSimMode('headless');
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [universeState?.calendarIndex, simulating, liveBracketTournament, watchMatchState, preGamePending]);

  const handleWatchMatch = useCallback((match, roundIdx, matchIdx, onResult) => {
    const { playerA, playerB } = match;
    if (!playerA || !playerB) return;
    const courtKey = liveBracketTournament?.courtKey ?? 'US_OPEN';
    const bestOf   = liveBracketTournament?.bestOf ?? 3;
    const format   = liveBracketTournament?.format ?? null;
    // Show pre-game analysis before starting the match engine
    setPreGamePending({ playerA, playerB, courtKey, bestOf, format, roundIdx, matchIdx, onResult,
      tournament: liveBracketTournament });
  }, [liveBracketTournament]);

  const cleanupSimHighlights = useCallback((stateOverride = null) => {
    const active = stateOverride ?? simHlState;
    if (active?.keyA) delete NAMED_PLAYERS[active.keyA];
    if (active?.keyB) delete NAMED_PLAYERS[active.keyB];
    gsRef.current = null;
    trailRef.current = [];
    frameHistoryRef.current = [];
    setSnap(null);
    setSimHlState(null);
    setSimHlLoading(null);
    setSimSpeed(1);
  }, [simHlState, setSimSpeed]);

  const handleLaunchMatch = useCallback((mode = 'full') => {
    if (!preGamePending) return;
    const { playerA, playerB, courtKey, bestOf, format, roundIdx, matchIdx, onResult } = preGamePending;
    const keyA = `__WATCH_${playerA.id}__`;
    const keyB = `__WATCH_${playerB.id}__`;

    // -- Modo "Simular e Ver Highlights" -----------------------------
    if (mode === 'sim-highlights') {
      setPreGamePending(null);
      setSimHlLoading({
        playerA,
        playerB,
        tournamentName: preGamePending?.tournament?.name ?? 'Tournament',
      });
      setSimSpeed(1);
      // Roda headless num timeout para não bloquear o render do loading
      setTimeout(() => {
        try {
          const { result, allClips } = simulateAndCollectStoryHighlights(
            { playerData: playerA },
            { playerData: playerB },
            courtKey,
            bestOf,
            universeState?.rivalrySystem ?? null,
            preGamePending?.tournament?.isSlam ?? false,
            { category: preGamePending?.tournament?.category ?? null, round: 'WATCH', format: format ?? null, isSlamClash: !!preGamePending?.tournament?.isSlamClash },
          );
          // Injeta temporariamente nas NAMED_PLAYERS para o 2D funcionar
          NAMED_PLAYERS[keyA] = playerA;
          NAMED_PLAYERS[keyB] = playerB;
          const storyResult = buildReelMatchStory(
            result,
            allClips,
            playerA,
            playerB,
            preGamePending?.tournament ?? null,
          );
          setSimHlLoading(null);
          setSimHlState({ allClips, result: storyResult, playerA, playerB, tournament: preGamePending?.tournament ?? null, onResult, keyA, keyB });
        } catch (e) {
          console.error('[SimHL] Erro:', e);
          setSimHlLoading(null);
        }
      }, 0);
      return;
    }

    NAMED_PLAYERS[keyA] = playerA;
    NAMED_PLAYERS[keyB] = playerB;
    const _isSlam = preGamePending?.tournament?.isSlam ?? false;
    gsRef.current = initGameState(null, null, keyA, keyB, courtKey, bestOf, null, { format: format ?? null, isSlamClash: !!preGamePending?.tournament?.isSlamClash });
    gsRef.current.isSlam = _isSlam;
    trailRef.current = [];
    frameHistoryRef.current = [];
    highlightsModeRef.current = (mode === 'highlights');
    setHighlightsPaused(false);
    hlFeedRef.current = [];
    setHlFeed([]);
    setSnap(null);
    setPreGamePending(null);
    setWatchMatchState({ playerA, playerB, courtKey, bestOf, format, roundIdx, matchIdx, onResult, keyA, keyB,
                         tournamentId: preGamePending?.tournament?.id ?? null, isSlam: _isSlam });
  }, [preGamePending, highlightsModeRef]);

  if (phase === 'home') {
return <WelcomeToUniverse onInit={handleInitUniverse} onBack={onBack} />;
  }

  if (!universeState) return null;

  // PRÉ-JOGO
  if (preGamePending) {
    return (
      <PreGameAnalysis
        preGamePending={preGamePending}
        universeState={universeState}
        onStart={() => handleLaunchMatch('full')}
        onStartHighlights={() => handleLaunchMatch('highlights')}
        onSimHighlights={() => handleLaunchMatch('sim-highlights')}
        onSkip={handleLaunchMatch}
      />
    );
  }

  if (simHlLoading) {
    return (
      <div style={{
        width:'100vw', height:'100vh', overflow:'hidden',
        background:'linear-gradient(160deg,#030d07 0%,#050c11 55%,#07050d 100%)',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        fontFamily:"'Space Mono',monospace", color:'#F2EDE4',
      }}>
        <div style={{ position:'absolute', top:'18%', left:'26%', width:360, height:360, borderRadius:'50%',
          background:'radial-gradient(circle,rgba(74,144,217,.08),transparent 70%)', filter:'blur(60px)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'14%', right:'24%', width:280, height:280, borderRadius:'50%',
          background:'radial-gradient(circle,rgba(232,200,74,.06),transparent 70%)', filter:'blur(50px)', pointerEvents:'none' }} />

        <div style={{ fontSize:9, letterSpacing:'.5em', color:'rgba(255,255,255,.24)', marginBottom:18, textTransform:'uppercase' }}>
          {simHlLoading.tournamentName}
        </div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:'clamp(28px,4vw,46px)',
          letterSpacing:'.06em', textTransform:'uppercase', lineHeight:1, marginBottom:12 }}>
          Preparando Highlights
        </div>
        <div style={{ fontSize:10, letterSpacing:'.18em', color:'rgba(255,255,255,.45)', textTransform:'uppercase', marginBottom:28 }}>
          {simHlLoading.playerA?.name?.toUpperCase()} vs {simHlLoading.playerB?.name?.toUpperCase()}
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:22 }}>
          <div style={{ width:9, height:9, borderRadius:'50%', background:'#4A90D9', boxShadow:'0 0 12px #4A90D9', animation:'ho-pulse 1.2s infinite' }} />
          <div style={{ width:9, height:9, borderRadius:'50%', background:'#E8C84A', boxShadow:'0 0 12px #E8C84A', animation:'ho-pulse 1.2s .2s infinite' }} />
          <div style={{ width:9, height:9, borderRadius:'50%', background:'#2ECC71', boxShadow:'0 0 12px #2ECC71', animation:'ho-pulse 1.2s .4s infinite' }} />
        </div>
        <div style={{ fontSize:8, letterSpacing:'.22em', color:'rgba(255,255,255,.26)', textTransform:'uppercase' }}>
          Simulando partida — curando momentos — montando reel
        </div>
      </div>
    );
  }

  // SIM-HIGHLIGHTS PLAYER
  if (simHlState) {
    return (
      <CinematicReel
        simHlState={simHlState}
        gsRef={gsRef}
        trailRef={trailRef}
        frameHistoryRef={frameHistoryRef}
        speedRef={speedRef}
        simSpeed={simSpeed}
        setSimSpeed={setSimSpeed}
        onDone={() => {
          const { result, onResult } = simHlState;
          if (onResult) {
            onResult({
              sets: result.sets,
              setsDetail: result.setsDetail,
              matchNarrativeDossier: result.matchNarrativeDossier ?? null,
              matchStoryCapsules: result.matchStoryCapsules ?? [],
            });
          }
          cleanupSimHighlights(simHlState);
        }}
      />
    );
  }

  // WATCH MATCH
  if (watchMatchState) {
    const isOver = snap?.gameState === GameState.GAME_OVER;
    const p0 = snap?.players?.[0];
    const p1 = snap?.players?.[1];
    const latestHlFeed = hlFeed?.[0] ?? null;
    const latestHlLabel = latestHlFeed?.label ?? null;
    const pulseMessage = buildHighlightsPulseMessage(snap, latestHlFeed);
    const intensityLabel = latestHlLabel?.intensity
      ?? (snap?.inTiebreak ? 'PRESSÃO' : 'ESTÁVEL');
    const tensionColor = latestHlLabel?.color ?? (snap?.inTiebreak ? '#FFD166' : '#4ECDC4');

    const finishWatchedMatch = (result) => {
      delete NAMED_PLAYERS[watchMatchState.keyA];
      delete NAMED_PLAYERS[watchMatchState.keyB];
      if (result && watchMatchState.onResult) {
        watchMatchState.onResult(result);
      }
      setWatchFinishing(false);
      setWatchMatchState(null);
      setSnap(null);
    };

    const handleMatchDone = () => {
      const livePlayers = gsRef.current?.players ?? [p0, p1];
      finishWatchedMatch({
        sets: [livePlayers[0]?.sets ?? 0, livePlayers[1]?.sets ?? 0],
        setsDetail: getSetsDetailFromPlayers(livePlayers),
        stats: { a: livePlayers[0]?.stats ?? {}, b: livePlayers[1]?.stats ?? {} },
        heat: gsRef.current?.heat ?? snap?.heat ?? null,
        retirement: gsRef.current?.matchRetirement ?? null,
        inMatchInjuryEvents: gsRef.current?.inMatchInjuryEvents ?? [],
        matchNarrativeDossier: snap?.matchNarrativeDossier ?? null,
        matchStoryCapsules: snap?.matchStoryCapsules ?? [],
      });
    };

    const handleSimulateRemaining = () => {
      if (watchFinishing || !gsRef.current) return;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setWatchFinishing(true);
      window.setTimeout(() => {
        try {
          const result = simulateRemainingMatchHeadless(gsRef.current, {
            format: watchMatchState.format ?? null,
            category: liveBracketTournament?.category ?? null,
            round: 'WATCH',
            isSlamClash: !!liveBracketTournament?.isSlamClash,
          });
          finishWatchedMatch({
            sets: result.sets,
            setsDetail: result.setsDetail,
            stats: result.stats,
            telemetry: result.telemetry,
            heat: result.heat,
            retirement: result.retirement,
            inMatchInjuryEvents: result.inMatchInjuryEvents,
            matchNarrativeDossier: result.matchNarrativeDossier ?? null,
            matchStoryCapsules: result.matchStoryCapsules ?? [],
          });
        } catch (error) {
          console.error('[Universe] falha ao simular restante da partida assistida:', error);
          setWatchFinishing(false);
        }
      }, 0);
    };

    if (isOver) {
      return (
        <div style={{ width: '100vw', height: '100vh', background: '#05080e', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <MatchOverScreen
            p0={p0} p1={p1}
            maxRally={snap?.maxRally ?? 0}
            totalPoints={snap?.totalPoints ?? 0}
            bounceLog={snap?.bounceLog ?? []}
            debugEvents={snap?.debugEvents ?? []}
            heat={snap?.heat ?? null}
            courtMeta={snap?.courtMeta ?? null}
            matchNarrativeDossier={snap?.matchNarrativeDossier ?? null}
            matchStoryCapsules={snap?.matchStoryCapsules ?? []}
            onNew={handleMatchDone}
            onSame={handleMatchDone}
          />
        </div>
      );
    }

    return (
      <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#050505', position: 'relative' }}>
        <DefinitiveME
          gsRef={gsRef}
          trailRef={trailRef}
          snap={snap}
          onMenu={handleSimulateRemaining}
          simSpeed={simSpeed}
          setSimSpeed={setSimSpeed}
          speedRef={speedRef}
          frameHistoryRef={frameHistoryRef}
          bugMode={false}
          setBugMode={() => {}}
          bugSpeedSaveRef={{ current: 1 }}
          tournamentId={watchMatchState?.tournamentId ?? null}
          universePlayerA={watchMatchState?.playerA ?? null}
          universePlayerB={watchMatchState?.playerB ?? null}
        />
        <button
          onClick={handleSimulateRemaining}
          disabled={watchFinishing}
          style={{
            position:'fixed', right:18, bottom:18, zIndex:320,
            padding:'10px 14px', border:'1px solid rgba(232,200,74,.55)',
            background:watchFinishing ? 'rgba(12,17,15,.94)' : 'rgba(232,200,74,.12)',
            color:watchFinishing ? 'rgba(242,237,228,.55)' : '#F2EDE4',
            fontFamily:"'Space Mono',monospace", fontSize:8, fontWeight:700,
            letterSpacing:2, textTransform:'uppercase', cursor:watchFinishing ? 'wait' : 'pointer',
            boxShadow:'0 10px 28px rgba(0,0,0,.35)',
          }}
        >{watchFinishing ? 'SIMULANDO RESTANTE…' : 'SIMULAR RESTANTE →'}</button>
        <DebugLog gsRef={gsRef} />
        <TracePanel gsRef={gsRef} />


        {/* Sala de direção: cobre a quadra apenas enquanto o motor procura o próximo corte. */}
        {highlightsModeRef.current && (
          <LiveHighlightsControlRoom
            visible={!highlightsPaused}
            snap={snap}
            match={watchMatchState}
            feed={hlFeed}
            filters={hlFilters}
            onToggleFilter={(key) => {
              const next = { ...hlFiltersRef.current, [key]: !hlFiltersRef.current[key] };
              hlFiltersRef.current = next;
              setHlFilters(next);
            }}
            headline={hlFeed[0]?.headline ?? null}
            pulseMessage={buildHighlightsPulseMessage(snap, hlFeed[0])}
            intensityLabel={hlFeed[0]?.label?.intensity ?? 'EM LEITURA'}
            tensionColor={hlFeed[0]?.label?.color ?? '#52C7F5'}
          />
        )}

        {/* Legado visual mantido temporariamente fora da renderização para facilitar comparação. */}
        {false && highlightsModeRef.current && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            opacity: highlightsPaused ? 0 : 1,
            pointerEvents: highlightsPaused ? 'none' : 'auto',
            transition: 'opacity .4s ease',
            background: 'linear-gradient(160deg, #030d07 0%, #050c11 60%, #07050d 100%)',
            display: 'flex', flexDirection: 'column',
            fontFamily: "'Space Mono',monospace",
            overflow: 'hidden',
          }}>

            {/* Scanline sutil */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: .025,
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 3px)',
              backgroundSize: '100% 4px' }} />
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
              backgroundImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(196,87,42,.07) 0%, transparent 70%)' }} />

            {/* Top bar */}
            <div style={{
              position: 'relative', zIndex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '13px 28px', flexShrink: 0,
              borderBottom: '1px solid rgba(255,255,255,.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4CAF50',
                  boxShadow: '0 0 10px #4CAF50', animation: 'ho-pulse 1.5s infinite' }} />
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,.35)', letterSpacing: '.3em' }}>LIVE CUT PREVIEW — AO VIVO</span>
              </div>
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,.15)', letterSpacing: '.15em' }}>
                {watchMatchState?.playerA?.name?.toUpperCase()} vs {watchMatchState?.playerB?.name?.toUpperCase()}
              </span>
            </div>

            {/* Placar central + mini quadra */}
            <div style={{
              position: 'relative', zIndex: 1, flexShrink: 0,
              display: 'flex', alignItems: 'stretch',
              borderBottom: '1px solid rgba(255,255,255,.05)',
            }}>
              {/* -- Scoreboard (esquerda) -- */}
              <div style={{
                flex: 1, padding: '20px 28px',
                display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center',
              }}>
                <div style={{
                  marginBottom: 10,
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,.03)',
                  border: '1px solid rgba(255,255,255,.08)',
                  borderLeft: `3px solid ${tensionColor}`,
                }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                    <div>
                      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: '.05em', color: '#F2EDE4', textTransform: 'uppercase', lineHeight: 1 }}>
                        {latestHlFeed?.headline ?? 'Transmissão ao vivo'}
                      </div>
                      <div style={{ marginTop: 6, fontSize: 10, color: 'rgba(255,255,255,.5)', letterSpacing: '.16em', textTransform: 'uppercase' }}>
                        {pulseMessage}
                      </div>
                    </div>
                    <div style={{ textAlign:'right', minWidth: 112 }}>
                      <div style={{ fontSize: 8, color: 'rgba(255,255,255,.25)', letterSpacing: '.22em', textTransform: 'uppercase' }}>tensão</div>
                      <div style={{ marginTop: 4, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 20, color: tensionColor, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                        {intensityLabel}
                      </div>
                    </div>
                  </div>
                </div>
                {[0, 1].map(pi => {
                  const p = snap?.players?.[pi];
                  if (!p) return null;
                  const isServer = snap?.server === pi;
                  const PLAYER_COLOR = pi === 0 ? '#4FC3F7' : '#FF8A65';
                  const setsDetail = snap?.setsDetail ?? [];
                  return (
                    <div key={pi} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px',
                      background: 'rgba(255,255,255,.025)',
                      border: `1px solid rgba(255,255,255,.07)`,
                      borderLeft: `3px solid ${PLAYER_COLOR}`,
                    }}>
                      {/* Name + serve indicator */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 7,
                        }}>
                          {isServer && (
                            <div style={{
                              width: 7, height: 7, borderRadius: '50%',
                              background: '#E07050', boxShadow: '0 0 6px #E07050', flexShrink: 0,
                            }}/>
                          )}
                          <span style={{
                            fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 18,
                            color: '#fff', textTransform: 'uppercase', letterSpacing: '.03em',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>{p.name}</span>
                        </div>
                      </div>
                      {/* Set boxes */}
                      <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                        {setsDetail.map((sd, si) => {
                          const myGames  = sd?.[pi]  ?? 0;
                          const oppGames = sd?.[1-pi] ?? 0;
                          const won = myGames > oppGames;
                          return (
                            <div key={si} style={{
                              width: 28, height: 28,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 17,
                              color: won ? PLAYER_COLOR : 'rgba(255,255,255,.25)',
                              background: won ? `${PLAYER_COLOR}18` : 'rgba(255,255,255,.03)',
                              border: `1px solid ${won ? PLAYER_COLOR + '55' : 'rgba(255,255,255,.07)'}`,
                            }}>{myGames}</div>
                          );
                        })}
                        {/* Games atual */}
                        <div style={{
                          width: 28, height: 28, marginLeft: 3,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 17,
                          color: '#fff',
                          background: 'rgba(255,255,255,.08)',
                          border: '1px solid rgba(255,255,255,.18)',
                        }}>{p.games ?? 0}</div>
                        {/* Pontos */}
                        <div style={{
                          width: 36, height: 28, marginLeft: 2,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 17,
                          color: isServer ? '#E07050' : 'rgba(255,255,255,.4)',
                          background: isServer ? 'rgba(196,87,42,.12)' : 'transparent',
                          border: `1px solid ${isServer ? 'rgba(196,87,42,.3)' : 'rgba(255,255,255,.05)'}`,
                        }}>
                          {['0','15','30','40','Ad'][p.score ?? 0] ?? '0'}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* Column headers */}
                <div style={{
                  display: 'flex', justifyContent: 'flex-end', gap: 3, paddingRight: 0,
                  marginTop: -2,
                }}>
                  {(snap?.setsDetail ?? []).map((_, si) => (
                    <div key={si} style={{
                      width: 28, textAlign: 'center',
                      fontFamily: 'monospace', fontSize: 7,
                      color: 'rgba(255,255,255,.2)', letterSpacing: '.1em',
                    }}>S{si+1}</div>
                  ))}
                  <div style={{ width: 31, textAlign: 'center', fontFamily: 'monospace', fontSize: 7, color: 'rgba(255,255,255,.2)' }}>J</div>
                  <div style={{ width: 38, textAlign: 'center', fontFamily: 'monospace', fontSize: 7, color: 'rgba(255,255,255,.2)' }}>PT</div>
                </div>
              </div>

              {/* -- Mini quadra de quiques (direita) -- */}
              <div style={{
                width: 140, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,.05)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '12px 16px', gap: 8,
              }}>
                <div style={{ fontSize: 7, letterSpacing: '.3em', color: 'rgba(255,255,255,.18)' }}>QUIQUES</div>
                {(() => {
                  const bounceLog = snap?.bounceLog ?? [];
                  const W = 100, H = 160, PAD = 8;
                  const cw = W - PAD*2, ch = H - PAD*2;
                  const COURT_HL = 11.885, COURT_HW = 4.115;
                  function toSvg(x, y) {
                    return [
                      PAD + ((x + COURT_HW) / (COURT_HW*2)) * cw,
                      PAD + ((y + COURT_HL) / (COURT_HL*2)) * ch,
                    ];
                  }
                  const [nX1, nY] = toSvg(-COURT_HW, 0);
                  const [nX2]     = toSvg( COURT_HW, 0);
                  const [sLx]     = toSvg(-COURT_HW*(4.115/5.485), 0);
                  const [sRx]     = toSvg( COURT_HW*(4.115/5.485), 0);
                  const [sMx]     = toSvg(0, 0);
                  const [,svcTy]  = toSvg(0, -COURT_HL*0.55);
                  const [,svcBy]  = toSvg(0,  COURT_HL*0.55);

                  // last 40 bounces, fade older ones
                  const dots = bounceLog.slice(-40);
                  const COLORS = ['#4FC3F7', '#FF8A65'];
                  return (
                    <svg width={W} height={H} style={{ display: 'block' }}>
                      <rect x={PAD} y={PAD} width={cw} height={ch} fill="#0e1f0e" rx={2}/>
                      <rect x={PAD} y={PAD} width={cw} height={ch} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth={1}/>
                      {/* Singles lines */}
                      <line x1={sLx} y1={PAD} x2={sLx} y2={PAD+ch} stroke="rgba(255,255,255,.1)" strokeWidth={.7}/>
                      <line x1={sRx} y1={PAD} x2={sRx} y2={PAD+ch} stroke="rgba(255,255,255,.1)" strokeWidth={.7}/>
                      {/* Net */}
                      <line x1={nX1} y1={nY} x2={nX2} y2={nY} stroke="rgba(255,255,255,.45)" strokeWidth={1.5}/>
                      {/* Service lines */}
                      <line x1={sLx} y1={svcTy} x2={sRx} y2={svcTy} stroke="rgba(255,255,255,.08)" strokeWidth={.7}/>
                      <line x1={sLx} y1={svcBy} x2={sRx} y2={svcBy} stroke="rgba(255,255,255,.08)" strokeWidth={.7}/>
                      <line x1={sMx} y1={nY} x2={sMx} y2={svcTy} stroke="rgba(255,255,255,.07)" strokeWidth={.7}/>
                      <line x1={sMx} y1={nY} x2={sMx} y2={svcBy} stroke="rgba(255,255,255,.07)" strokeWidth={.7}/>
                      {dots.map((b, i) => {
                        if (b.x == null || b.y == null) return null;
                        const [dx, dy] = toSvg(b.x, b.y);
                        const age = i / dots.length;
                        const opacity = 0.25 + age * 0.75;
                        const r = age > 0.85 ? 3.5 : 2;
                        const col = b.type === 'out' ? '#FF5555' : (COLORS[b.player] ?? '#aaa');
                        return <circle key={i} cx={dx} cy={dy} r={r} fill={col} opacity={opacity}/>;
                      })}
                      {/* Last bounce ring */}
                      {(() => {
                        const last = dots[dots.length-1];
                        if (!last || last.x == null) return null;
                        const [lx, ly] = toSvg(last.x, last.y);
                        const col = last.type === 'out' ? '#FF5555' : (COLORS[last.player] ?? '#aaa');
                        return <circle cx={lx} cy={ly} r={6} fill="none" stroke={col} strokeWidth={1.5} opacity={.5}/>;
                      })()}
                    </svg>
                  );
                })()}
                {/* Legend */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {(snap?.players ?? []).map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: i === 0 ? '#4FC3F7' : '#FF8A65' }}/>
                      <span style={{ fontFamily: 'monospace', fontSize: 7, color: 'rgba(255,255,255,.35)' }}>
                        {p?.name?.split(' ').pop()?.slice(0,8)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Corpo: toggles esquerda + feed direita */}
            <div style={{
              position: 'relative', zIndex: 1, flex: 1,
              display: 'grid', gridTemplateColumns: '300px 1fr',
              overflow: 'hidden',
            }}>

              {/* Toggles */}
              <div style={{ borderRight: '1px solid rgba(255,255,255,.05)', padding: '22px 28px', overflowY: 'auto' }}>
                <div style={{ fontSize: 7, color: 'rgba(255,255,255,.2)', letterSpacing: '.35em', marginBottom: 18, textTransform: 'uppercase' }}>
                  CAPTURAR AO VIVO
                </div>
                {[
                  { key: 'matchPoint', label: 'Cl—max',               sub: 'Ponto de defini——o máxima', color: '#FF4444' },
                  { key: 'setPoint',   label: 'Fim de set',           sub: 'Set em ponto delicado',     color: '#FFD700' },
                  { key: 'breakPoint', label: 'Press—o na devolução', sub: 'Game sob ameaça real',      color: '#FF8C42' },
                  { key: 'gamePoint',  label: 'Fechamento de game',   sub: 'Game perto do desfecho',    color: '#66BB6A' },
                ].map(({ key, label, sub, color }) => {
                  const active = hlFilters[key];
                  return (
                    <div key={key}
                      onClick={() => {
                        const next = { ...hlFiltersRef.current, [key]: !hlFiltersRef.current[key] };
                        hlFiltersRef.current = next;
                        setHlFilters(next);
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10,
                        cursor: 'pointer', padding: '11px 14px',
                        background: active ? `${color}0e` : 'rgba(255,255,255,.02)',
                        border: `1px solid ${active ? `${color}38` : 'rgba(255,255,255,.05)'}`,
                        transition: 'all .15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = active ? `${color}1a` : 'rgba(255,255,255,.04)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = active ? `${color}0e` : 'rgba(255,255,255,.02)'; }}
                    >
                      <div style={{
                        width: 34, height: 18, borderRadius: 9, flexShrink: 0,
                        background: active ? color : 'rgba(255,255,255,.1)',
                        position: 'relative', transition: 'all .2s',
                        boxShadow: active ? `0 0 14px ${color}55` : 'none',
                      }}>
                        <div style={{
                          position: 'absolute', top: 3, width: 12, height: 12, borderRadius: '50%',
                          background: '#fff', transition: 'left .2s', left: active ? 19 : 3,
                        }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
                          color: active ? color : 'rgba(255,255,255,.25)' }}>{label}</div>
                        <div style={{ fontSize: 8, color: 'rgba(255,255,255,.18)', letterSpacing: '.06em', marginTop: 2 }}>{sub}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Feed */}
              <div style={{ overflowY: 'auto', padding: '22px 0' }}>
                <div style={{ fontSize: 7, color: 'rgba(255,255,255,.2)', letterSpacing: '.35em',
                  padding: '0 28px 14px', textTransform: 'uppercase' }}>RADAR DE TENS—O</div>
                {hlFeed.length === 0
                  ? (
                    <div style={{ padding: '60px 28px', textAlign: 'center' }}>
                      <div style={{ fontSize: 32, opacity: .1, marginBottom: 14 }}>??</div>
                      <div style={{ fontSize: 8, color: 'rgba(255,255,255,.1)', letterSpacing: '.25em' }}>LENDO O RITMO…</div>
                    </div>
                  )
                  : hlFeed.map((item, i) => (
                    <div key={item.id ?? i} style={{
                      padding: '12px 28px', borderBottom: '1px solid rgba(255,255,255,.04)',
                      background: i === 0 ? 'rgba(255,255,255,.02)' : 'transparent',
                      display: 'flex', alignItems: 'center', gap: 18,
                      animation: i === 0 ? 'ho-slide-up .25s ease both' : 'none',
                    }}>
                      <div style={{
                        flexShrink: 0, padding: '4px 10px',
                        background: `${item.label.color}12`, border: `1px solid ${item.label.color}38`,
                        fontSize: 7, fontWeight: 700, color: item.label.color, letterSpacing: '.18em',
                        whiteSpace: 'nowrap',
                      }}>{item.label.text}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', fontWeight: 700, letterSpacing: '.06em' }}>
                          {item.headline ?? item.label.text}
                        </div>
                        <div style={{ fontSize: 8, color: 'rgba(255,255,255,.22)', letterSpacing: '.05em', marginTop: 2 }}>
                          {item.subline ?? item.score}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, fontSize: 8, color: 'rgba(255,255,255,.18)', letterSpacing: '.08em' }}>
                        <div>Set {item.s0}—{item.s1}</div>
                        <div style={{ marginTop: 2 }}>{item.g0}—{item.g1}</div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // LIVE BRACKET
  if (liveBracketTournament) {
    const existingResult = universeState.tournamentResults?.[liveBracketTournament.id];
    return (
      <TournamentBracket
        tournament={liveBracketTournament}
        tourPlayers={universeState.tourPlayers}
        prospects={universeState.prospects}
        preparedPackage={universeState.preparedTournamentPackage?.tournamentId === liveBracketTournament.id
          ? universeState.preparedTournamentPackage
          : null}
        existingResult={existingResult}
        savedState={sanitizeBracketSaveState(liveBracketSavedStateRef.current, liveBracketTournament.id)}
        onBack={() => {
          setPreGamePending(null);
          setWatchMatchState(null);
          setSimHlLoading(null);
          setSimHlState(null);
          setSnap(null);
          setLiveBracketTournament(null);
        }}
        onWatchMatch={handleWatchMatch}
        onApplyResult={handleBracketApplyResult}
        onSaveProgress={(s) => {
          liveBracketSavedStateRef.current = s ? sanitizeBracketSaveState(s, liveBracketTournament.id) : null;
        }}
        playerSeasonSlots={universeState.playerSeasonSlots ?? {}}
        historicalTournamentResults={universeState.historicalTournamentResults ?? {}}
        currentYear={universeState.year}
        allPlayers={[...universeState.tourPlayers, ...(universeState.retiredPlayers ?? [])]}
      />
    );
  }

  // BROADCAST HUB
  return (
    <>
      <BroadcastUniverse
        state={universeState}
        dispatch={universeDispatch}
        onBack={() => {
          resetTransientUniverseRuntime();
          setPhase('home');
        }}
        onSimulate={handleSimulate}
        onFastSimulateRange={handleFastSimulateRange}
        onViewBracket={handleViewBracket}
        simulating={simulating}
        simProgress={simProgress}
        simMode={simMode}
        stopOnBreaking={stopOnBreaking}
        onToggleStopOnBreaking={setStopOnBreaking}
        onSaveGame={handleSaveGame}
        onLoadGame={handleLoadGame}
        onRestoreAutosave={handleRestoreAutosave}
      />
      {simulating && simMode === 'headless' && (
        <HeadlessOverlay
          tournament={simTournament}
          simEvent={simEvent}
          simFeed={simFeed}
          simProgress={simProgress}
          simTotal={simTotal}
          stopOnBreaking={stopOnBreaking}
          onToggleStopOnBreaking={setStopOnBreaking}
          breakingArticle={simBreakingArticle}
          onStop={() => { stopSimRef.current = true; }}
          calendar={CALENDAR}
          calendarIndex={universeState.calendarIndex}
          tournamentResults={universeState.tournamentResults ?? {}}
          historicalTournamentResults={universeState.historicalTournamentResults ?? {}}
          year={simOverlayYear ?? universeState.year}
          rivalrySystem={universeState.rivalrySystem ?? null}
          players={universeState.tourPlayers ?? []}
          rankingStore={universeState.rankingStore ?? null}
        />
      )}
      {ceremonyData && (
        <TournamentCeremony
          tournament={ceremonyData.tournament}
          bracket={ceremonyData.bracket}
          wrapData={ceremonyData.wrapData ?? null}
          state={universeState}
          circuitShift={universeState?.latestCircuitShift?.tournamentId === ceremonyData.tournament?.id
            ? universeState.latestCircuitShift
            : null}
          onClose={() => setCeremonyData(null)}
        />
      )}
      {universeState?.yearSummary?.hofTributes?.length > 0 && (
        <HallOfFameRetirementTribute
          tributes={buildHofTributes(universeState.yearSummary, [...(universeState.tourPlayers ?? []), ...(universeState.retiredPlayers ?? [])])}
          onDismiss={() => {
            const remaining = (universeState.yearSummary?.hofTributes ?? []).slice(1);
            setUniverseState(prev => prev ? ({
              ...prev,
              yearSummary: prev.yearSummary ? { ...prev.yearSummary, hofTributes: remaining } : prev.yearSummary,
            }) : prev);
          }}
        />
      )}
      {universeState?.yearSummary && (!universeState?.yearSummary?.hofTributes || universeState.yearSummary.hofTributes.length === 0) && (
        <YearSummaryModal
          summary={universeState.yearSummary}
          allPlayers={universeState.tourPlayers}
          onDismiss={() => universeDispatch({ type: 'DISMISS_SUMMARY' })}
        />
      )}
    </>
  );
}
