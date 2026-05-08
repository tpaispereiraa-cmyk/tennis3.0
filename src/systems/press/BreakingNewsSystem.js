/**
 * BreakingNewsSystem.js
 * ---------------------------------------------------------------
 * Eventos raros que mudam o circuito de forma persistente.
 *
 * Esta primeira fase cobre:
 *  - anuncio de aposentadoria / farewell tour
 *  - crises medicas gravissimas
 *  - escandalos de doping / apostas
 *  - tragedias pessoais e acidentes graves fora da quadra
 *
 * O foco nao e so gerar noticia: e criar estado permanente no jogador,
 * afetar disponibilidade e alimentar cobertura recorrente.
 */

import { computeHOFData } from '../history/HallOfFame.js';
import { getInjuryDisplayName } from '../health/InjurySystem.js';

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function chance(p) {
  return Math.random() < p;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function weightedPick(items) {
  const total = items.reduce((sum, item) => sum + (item.weight ?? 0), 0);
  if (total <= 0) return items[0] ?? null;
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item.weight ?? 0;
    if (roll <= 0) return item;
  }
  return items[items.length - 1] ?? null;
}

function clonePlayer(player) {
  return {
    ...player,
    attrs: { ...(player.attrs ?? {}) },
    personality: player.personality
      ? {
          ...player.personality,
          currentState: { ...(player.personality.currentState ?? {}) },
          careerMoments: [...(player.personality.careerMoments ?? [])],
          marketability: player.personality.marketability
            ? { ...player.personality.marketability }
            : player.personality.marketability,
          reputation: typeof player.personality.reputation === 'object'
            ? { ...player.personality.reputation }
            : player.personality.reputation,
        }
      : player.personality,
    breakingNews: {
      farewellTour: player.breakingNews?.farewellTour
        ? { ...player.breakingNews.farewellTour }
        : null,
      healthCrisis: player.breakingNews?.healthCrisis
        ? { ...player.breakingNews.healthCrisis }
        : null,
      scandal: player.breakingNews?.scandal
        ? { ...player.breakingNews.scandal }
        : null,
      personalCrisis: player.breakingNews?.personalCrisis
        ? { ...player.breakingNews.personalCrisis }
        : null,
      history: [...(player.breakingNews?.history ?? [])],
      lastMajorYear: player.breakingNews?.lastMajorYear ?? null,
    },
  };
}

function addCareerMoment(player, moment) {
  if (!player.personality) return player;
  const next = clonePlayer(player);
  next.personality.careerMoments = [
    ...(next.personality.careerMoments ?? []),
    {
      importance: 9,
      ...moment,
    },
  ].slice(-24);
  return next;
}

function adjustAttrs(player, deltas = {}) {
  const next = clonePlayer(player);
  for (const [key, delta] of Object.entries(deltas)) {
    if (next.attrs[key] === undefined) continue;
    next.attrs[key] = clamp(next.attrs[key] + delta, 25, 99);
  }
  return next;
}

function adjustMarketability(player, delta) {
  if (!player.personality?.marketability) return player;
  const next = clonePlayer(player);
  next.personality.marketability.score = clamp(
    (next.personality.marketability.score ?? 50) + delta,
    0,
    100,
  );
  return next;
}

function setMood(player, mood, pressureDelta = 0) {
  if (!player.personality) return player;
  const next = clonePlayer(player);
  next.personality.currentState = {
    ...(next.personality.currentState ?? {}),
    mood,
    pressureLevel: clamp(
      (next.personality.currentState?.pressureLevel ?? 45) + pressureDelta,
      0,
      100,
    ),
  };
  return next;
}

function setReputationId(player, reputationId) {
  if (!player.personality?.reputation) return player;
  const next = clonePlayer(player);
  if (typeof next.personality.reputation === 'object') {
    next.personality.reputation = {
      ...next.personality.reputation,
      id: reputationId,
    };
  }
  return next;
}

function countMajorTitles(player) {
  const titles = player.careerTitles ?? {};
  return (titles.gs ?? 0) + (titles.masters ?? 0) + ((titles.atp500 ?? 0) * 0.5);
}

function isAlreadyUnavailable(player) {
  return !!(
    player.breakingNews?.healthCrisis?.active ||
    player.breakingNews?.scandal?.active ||
    player.breakingNews?.personalCrisis?.active
  );
}

function healthCrisisPublicLabel(subtype, diagnosisName) {
  if (diagnosisName) return diagnosisName;
  if (subtype === 'ONCOLOGY_TREATMENT') return 'Tratamento oncológico';
  if (subtype === 'DEGENERATIVE_CONDITION') return 'Degeneração articular progressiva';
  if (subtype === 'AUTOIMMUNE_COLLAPSE') return 'Doença autoimune sistêmica';
  return 'Condição musculoesquelética degenerativa';
}

function buildHealthCrisisStatement(playerName, subtype, diagnosisName, careerEnding) {
  const label = healthCrisisPublicLabel(subtype, diagnosisName);
  if (careerEnding) {
    return `${playerName} comunicou ao circuito que está fora por causa de ${label.toLowerCase()} e já trabalha com cenário real de encerramento precoce da carreira.`;
  }
  if (subtype === 'ONCOLOGY_TREATMENT') {
    return `${playerName} informou ao circuito que vai interromper a temporada para enfrentar tratamento oncológico, sem previsão pública de retorno.`;
  }
  if (subtype === 'AUTOIMMUNE_COLLAPSE') {
    return `${playerName} avisou ao circuito que está fora por uma doença autoimune sistêmica e que a prioridade absoluta agora é estabilizar a saúde.`;
  }
  return `${playerName} informou ao circuito que vai interromper a temporada por ${label.toLowerCase()}, sem prazo competitivo confiável para retorno.`;
}

export function migrateBreakingNewsState(player) {
  if (!player) return player;
  if (
    player.breakingNews?.farewellTour !== undefined &&
    player.breakingNews?.healthCrisis !== undefined &&
    player.breakingNews?.scandal !== undefined &&
    player.breakingNews?.personalCrisis !== undefined &&
    Array.isArray(player.breakingNews?.history)
  ) {
    return player;
  }
  return clonePlayer({
    ...player,
    breakingNews: {
      farewellTour: player.breakingNews?.farewellTour ?? null,
      healthCrisis: player.breakingNews?.healthCrisis ?? null,
      scandal: player.breakingNews?.scandal ?? null,
      personalCrisis: player.breakingNews?.personalCrisis ?? null,
      history: [...(player.breakingNews?.history ?? [])],
      lastMajorYear: player.breakingNews?.lastMajorYear ?? null,
    },
  });
}

export function isPlayerUnavailableForTournament(player) {
  const p = migrateBreakingNewsState(player);
  if (p.breakingNews?.healthCrisis?.active) return true;
  if (p.breakingNews?.scandal?.active) return true;
  if (p.breakingNews?.personalCrisis?.active) return true;
  return false;
}

function buildFarewellLegendSet(players, state = {}) {
  const hof = computeHOFData({
    ...state,
    tourPlayers: players,
  });
  return new Set(
    (hof?.allStats ?? [])
      .filter(stat => stat?.inducted && !stat?.isRetired)
      .map(stat => stat.id),
  );
}

function farewellCandidates(players, state = {}) {
  const legendIds = buildFarewellLegendSet(players, state);
  return players.filter(player => {
    const p = migrateBreakingNewsState(player);
    const age = p.age ?? 25;
    const slams = p.careerTitles?.gs ?? 0;
    return !p.retirementInfo
      && !p.breakingNews.farewellTour
      && !isAlreadyUnavailable(p)
      && legendIds.has(p.id)
      && slams >= 3
      && age >= 32;
  });
}

function healthCandidates(players) {
  return players.filter(player => {
    const p = migrateBreakingNewsState(player);
    const age = p.age ?? 25;
    const cond = p.physicalCondition ?? 80;
    const severeInjuries = (p.injuryHistory ?? []).filter(h => (h.grade ?? 0) >= 3).length;
    return !p.retirementInfo
      && !isAlreadyUnavailable(p)
      && !p.breakingNews.farewellTour
      && age >= 22
      && (cond <= 70 || severeInjuries >= 1 || age >= 32);
  });
}

function scandalCandidates(players) {
  return players.filter(player => {
    const p = migrateBreakingNewsState(player);
    const repId = typeof p.personality?.reputation === 'object'
      ? p.personality?.reputation?.id
      : p.personality?.reputation;
    const pressId = p.personality?.pressPersona?.id ?? '';
    return !p.retirementInfo
      && !isAlreadyUnavailable(p)
      && !p.breakingNews.farewellTour
      && (p.rankPosition ?? 999) <= 120
      && (
        ['CONFRONTATIONAL', 'SHOWMAN'].includes(pressId) ||
        ['CONTROVERSIAL', 'VILLAIN', 'ICON'].includes(repId)
      );
  });
}

function personalCandidates(players) {
  return players.filter(player => {
    const p = migrateBreakingNewsState(player);
    return !p.retirementInfo
      && !isAlreadyUnavailable(p)
      && !p.breakingNews.farewellTour
      && (p.age ?? 25) >= 23;
  });
}

function announceFarewell(player, year, context = {}) {
  const next = setMood(
    adjustMarketability(
      addCareerMoment(migrateBreakingNewsState(player), {
        type: 'FAREWELL_TOUR',
        year,
        title: 'Temporada final anunciada',
        description: `${player.name} anunciou que ${year} sera sua ultima temporada completa no circuito.`,
      }),
      8,
    ),
    'FAREWELL_TOUR',
    18,
  );
  next.breakingNews.farewellTour = {
    active: true,
    announcedYear: year,
    finalSeasonYear: year,
    reason: pick([
      'o corpo ja nao responde ao calendario inteiro',
      'quer escolher a propria saida antes que o circuito escolha por ele',
      'entende que este e o momento certo para transformar despedida em legado',
    ]),
    announcedAtTournamentId: context.tournament?.id ?? null,
  };
  next.breakingNews.lastMajorYear = year;
  next.breakingNews.history.push({
    type: 'RETIREMENT_ANNOUNCED',
    year,
    tournamentId: context.tournament?.id ?? null,
  });
  return {
    player: next,
    event: {
      type: 'RETIREMENT_ANNOUNCED',
      year,
      tournamentId: context.tournament?.id ?? null,
      playerId: next.id,
      playerName: next.name,
      finalSeasonYear: year,
      reason: next.breakingNews.farewellTour.reason,
    },
  };
}

function createHealthCrisis(player, year, context = {}) {
  const subtype = weightedPick([
    { id: 'SURGERY_SETBACK', weight: 52 },
    { id: 'DEGENERATIVE_CONDITION', weight: 26 },
    { id: 'ONCOLOGY_TREATMENT', weight: 14 },
    { id: 'AUTOIMMUNE_COLLAPSE', weight: 8 },
  ])?.id ?? 'SURGERY_SETBACK';

  const isTerminalRisk = ['DEGENERATIVE_CONDITION', 'ONCOLOGY_TREATMENT'].includes(subtype);
  const grade = isTerminalRisk ? 6 : 5;
  const slotsRemaining = grade === 6 ? randInt(48, 92) : randInt(24, 46);
  const injuryType = subtype === 'SURGERY_SETBACK' ? 'CHRONIC_CONDITION' : 'SYSTEMIC_ILLNESS';
  const returnChance = grade === 6 ? 0.26 : 0.58;
  const careerEnding = !chance(returnChance);
  const diagnosisBySubtype = {
    SURGERY_SETBACK: 'Condição musculoesquelética degenerativa',
    DEGENERATIVE_CONDITION: 'Degeneração articular progressiva',
    ONCOLOGY_TREATMENT: 'Tratamento oncológico',
    AUTOIMMUNE_COLLAPSE: 'Doença autoimune sistêmica',
  };
  const diagnosisName = diagnosisBySubtype[subtype] ?? getInjuryDisplayName({ type: injuryType, grade });
  const publicStatement = buildHealthCrisisStatement(player.name, subtype, diagnosisName, careerEnding);
  let next = migrateBreakingNewsState(player);
  next = setMood(next, 'HEALTH_CRISIS', 22);
  next = adjustMarketability(next, -4);
  next = addCareerMoment(next, {
    type: 'HEALTH_CRISIS',
    year,
    title: 'Parada abrupta por saude',
    description: `${next.name} se afasta do circuito sem prazo claro depois de uma crise de saude que ultrapassa o vocabulario normal das lesoes.`,
  });
  next.injury = {
    type: injuryType,
    grade,
    diagnosisName,
    slotsRemaining,
    _totalSlots: slotsRemaining,
    penalties: {},
    isPlayingThrough: false,
    comingBackSlots: 0,
    originSlot: context.tournament?.weekIndex ?? 0,
    originTournament: context.tournament?.name ?? 'Breaking News',
    originSeason: year,
  };
  next.breakingNews.healthCrisis = {
    active: true,
    status: careerEnding ? 'CAREER_ENDING' : 'OUT',
    diagnosedYear: year,
    tournamentId: context.tournament?.id ?? null,
    subtype,
    grade,
    diagnosisName,
    publicLabel: healthCrisisPublicLabel(subtype, diagnosisName),
    publicStatement,
    slotsRemaining,
    careerEnding,
    comebackWatch: 0,
  };
  next.breakingNews.lastMajorYear = year;
  next.breakingNews.history.push({
    type: 'HEALTH_CRISIS',
    year,
    subtype,
    grade,
    tournamentId: context.tournament?.id ?? null,
  });
  return {
    player: next,
    event: {
      type: 'HEALTH_CRISIS',
      year,
      tournamentId: context.tournament?.id ?? null,
      playerId: next.id,
      playerName: next.name,
      subtype,
      grade,
      diagnosisName,
      publicStatement,
      slotsRemaining,
      careerEnding,
    },
  };
}

function createScandal(player, year, context = {}) {
  const kind = chance(0.58) ? 'DOPING' : 'BETTING';
  const slotsRemaining = kind === 'DOPING' ? randInt(8, 18) : randInt(14, 28);
  let next = migrateBreakingNewsState(player);
  next = setMood(next, 'UNDER_INVESTIGATION', 24);
  next = adjustMarketability(next, -12);
  next = setReputationId(next, 'CONTROVERSIAL');
  next = addCareerMoment(next, {
    type: 'SCANDAL',
    year,
    title: kind === 'DOPING' ? 'Investigacao por doping' : 'Investigacao por apostas',
    description: `${next.name} entra no centro da pior noticia possivel para um atleta em atividade.`,
  });
  next.breakingNews.scandal = {
    active: true,
    kind,
    status: 'PROVISIONAL_SUSPENSION',
    openedYear: year,
    tournamentId: context.tournament?.id ?? null,
    slotsRemaining,
    returnWatch: 0,
  };
  next.breakingNews.lastMajorYear = year;
  next.breakingNews.history.push({
    type: 'SCANDAL',
    year,
    kind,
    tournamentId: context.tournament?.id ?? null,
  });
  return {
    player: next,
    event: {
      type: 'SCANDAL',
      year,
      tournamentId: context.tournament?.id ?? null,
      playerId: next.id,
      playerName: next.name,
      kind,
      slotsRemaining,
    },
  };
}

function createPersonalCrisis(player, year, context = {}) {
  const kind = weightedPick([
    { id: 'FAMILY_BEREAVEMENT', weight: 58 },
    { id: 'SERIOUS_ACCIDENT', weight: 27 },
    { id: 'MENTAL_HEALTH_COLLAPSE', weight: 15 },
  ])?.id ?? 'FAMILY_BEREAVEMENT';
  const slotsRemaining = kind === 'FAMILY_BEREAVEMENT'
    ? randInt(3, 7)
    : kind === 'SERIOUS_ACCIDENT'
      ? randInt(4, 10)
      : randInt(5, 12);
  const impact = kind === 'MENTAL_HEALTH_COLLAPSE'
    ? { mentalidade: -5, regularidade: -6 }
    : { mentalidade: -3, regularidade: -4 };
  let next = migrateBreakingNewsState(player);
  next = adjustAttrs(next, impact);
  next = setMood(next, kind === 'MENTAL_HEALTH_COLLAPSE' ? 'COLLAPSED' : 'GRIEVING', 16);
  next = addCareerMoment(next, {
    type: 'PERSONAL_CRISIS',
    year,
    title: 'Fora da quadra, tudo mudou',
    description: `${next.name} entra num trecho da carreira em que o tenis deixa de ser o centro da vida por algum tempo.`,
  });
  next.breakingNews.personalCrisis = {
    active: true,
    kind,
    openedYear: year,
    tournamentId: context.tournament?.id ?? null,
    slotsRemaining,
    impact,
    recoveryDelta: Object.fromEntries(Object.entries(impact).map(([key, value]) => [key, Math.round(Math.abs(value) * 0.5)])),
  };
  next.breakingNews.lastMajorYear = year;
  next.breakingNews.history.push({
    type: 'PERSONAL_CRISIS',
    year,
    kind,
    tournamentId: context.tournament?.id ?? null,
  });
  return {
    player: next,
    event: {
      type: 'PERSONAL_CRISIS',
      year,
      tournamentId: context.tournament?.id ?? null,
      playerId: next.id,
      playerName: next.name,
      kind,
      slotsRemaining,
    },
  };
}

function buildYearBoundaryRetirement(player, seasonYear, type, message) {
  const next = clonePlayer(player);
  next.retirementInfo = {
    type,
    year: seasonYear,
    age: player.age ?? 25,
    rankAtRetirement: player.rankPosition ?? '?',
    message,
  };
  return next;
}

export function processBreakingNewsSeasonClose(players, seasonYear) {
  const activePlayers = [];
  const retiredPlayers = [];
  const events = [];

  for (const rawPlayer of players) {
    const player = migrateBreakingNewsState(rawPlayer);
    const farewell = player.breakingNews?.farewellTour;
    const health = player.breakingNews?.healthCrisis;

    if (farewell?.active && farewell.finalSeasonYear === seasonYear) {
      const retired = buildYearBoundaryRetirement(
        player,
        seasonYear,
        'BREAKING_FAREWELL',
        `${player.name} encerra a carreira ao fim de sua turne de despedida. O circuito passou a temporada inteira olhando para isso.`,
      );
      retiredPlayers.push(retired);
      events.push({
        type: 'breaking_retirement',
        year: seasonYear,
        playerId: player.id,
        playerName: player.name,
        text: `${player.name} fecha a cortina ao fim da temporada de despedida.`,
      });
      continue;
    }

    if (health?.active && health.status === 'CAREER_ENDING') {
      const retired = buildYearBoundaryRetirement(
        player,
        seasonYear,
        'BREAKING_HEALTH',
        `${player.name} confirma que nao voltara ao circuito. ${health.diagnosisName ? `${health.diagnosisName} reescreveu a carreira por completo.` : 'A crise de saude reescreveu a carreira por completo.'}`,
      );
      retiredPlayers.push(retired);
      events.push({
        type: 'breaking_health_retirement',
        year: seasonYear,
        playerId: player.id,
        playerName: player.name,
        diagnosisName: health.diagnosisName ?? null,
        text: `${player.name} confirma aposentadoria apos longo afastamento por saude.`,
      });
      continue;
    }

    activePlayers.push(player);
  }

  return { activePlayers, retiredPlayers, events };
}

export function tickBreakingNews(player, context = {}) {
  let next = migrateBreakingNewsState(player);
  const events = [];

  const scandal = next.breakingNews?.scandal;
  if (scandal?.active && (scandal.slotsRemaining ?? 0) > 0) {
    scandal.slotsRemaining -= 1;
    if (scandal.slotsRemaining <= 0) {
      scandal.active = false;
      scandal.status = 'RETURNING';
      scandal.returnWatch = 6;
      events.push({
        type: 'SCANDAL_RESOLVED',
        year: context.year ?? null,
        playerId: next.id,
        playerName: next.name,
        kind: scandal.kind,
      });
    }
  } else if (scandal?.status === 'RETURNING' && (scandal.returnWatch ?? 0) > 0 && context.participated) {
    scandal.returnWatch -= 1;
    if (scandal.returnWatch <= 0) {
      next.breakingNews.scandal = null;
    }
  }

  const personal = next.breakingNews?.personalCrisis;
  if (personal?.active && (personal.slotsRemaining ?? 0) > 0) {
    personal.slotsRemaining -= 1;
    if (personal.slotsRemaining <= 0) {
      next = adjustAttrs(next, personal.recoveryDelta ?? {});
      personal.active = false;
      events.push({
        type: 'PERSONAL_CRISIS_RESOLVED',
        year: context.year ?? null,
        playerId: next.id,
        playerName: next.name,
        kind: personal.kind,
      });
      next.breakingNews.personalCrisis = null;
    }
  }

  const health = next.breakingNews?.healthCrisis;
  if (health?.active && health.status === 'OUT' && !next.injury) {
    if (health.careerEnding) {
      health.status = 'CAREER_ENDING';
      health.publicStatement = buildHealthCrisisStatement(next.name, health.subtype, health.diagnosisName, true);
      events.push({
        type: 'HEALTH_CAREER_ENDING',
        year: context.year ?? null,
        playerId: next.id,
        playerName: next.name,
        subtype: health.subtype,
        diagnosisName: health.diagnosisName ?? null,
        publicStatement: health.publicStatement ?? null,
      });
    } else {
      health.status = 'RETURNING';
      health.comebackWatch = 8;
      health.publicStatement = `${next.name} comunicou ao circuito que retomou os treinos e passa a trabalhar com retorno gradual após ${health.diagnosisName?.toLowerCase() ?? 'a crise de saúde'}.`;
      next = adjustAttrs(next, health.grade >= 6
        ? { resistencia: -8, regularidade: -7, velocidade: -4 }
        : { resistencia: -5, regularidade: -4, velocidade: -2 });
      events.push({
        type: 'HEALTH_RETURN',
        year: context.year ?? null,
        playerId: next.id,
        playerName: next.name,
        subtype: health.subtype,
        grade: health.grade,
        diagnosisName: health.diagnosisName ?? null,
        publicStatement: health.publicStatement ?? null,
      });
    }
  } else if (health?.status === 'RETURNING' && (health.comebackWatch ?? 0) > 0 && context.participated) {
    health.comebackWatch -= 1;
    if (health.comebackWatch <= 0) {
      next.breakingNews.healthCrisis = null;
    }
  }

  return { player: next, events };
}

export function maybeTriggerBreakingNews(players, year, state = {}, context = {}) {
  const phase = context.phase ?? 'TOURNAMENT';
  const chanceMap = {
    SEASON_OPEN: 0.24,
    TOURNAMENT: 0.05,
  };
  if (!chance(chanceMap[phase] ?? 0.05)) {
    return { players, events: [] };
  }

  const roster = players.map(migrateBreakingNewsState);
  const occupied = new Set();
  const eventType = weightedPick([
    { id: 'RETIREMENT_ANNOUNCEMENT', weight: phase === 'SEASON_OPEN' ? 44 : 26 },
    { id: 'HEALTH_CRISIS', weight: 24 },
    { id: 'SCANDAL', weight: 18 },
    { id: 'PERSONAL_CRISIS', weight: 14 },
  ])?.id;

  const pickCandidate = (poolBuilder) => {
    const pool = poolBuilder(roster)
      .filter(player => !occupied.has(player.id))
      .map(player => ({
        player,
        weight:
          Math.max(1, 120 - (player.rankPosition ?? 120))
          + ((player.personality?.marketability?.score ?? 50) * 0.2)
          + ((player.careerTitles?.gs ?? 0) * 18),
      }));
    return weightedPick(pool)?.player ?? null;
  };

  const candidate = eventType === 'RETIREMENT_ANNOUNCEMENT'
    ? pickCandidate((rosterPlayers) => farewellCandidates(rosterPlayers, state))
    : eventType === 'HEALTH_CRISIS'
      ? pickCandidate(healthCandidates)
      : eventType === 'SCANDAL'
        ? pickCandidate(scandalCandidates)
        : pickCandidate(personalCandidates);

  if (!candidate) return { players: roster, events: [] };

  let outcome;
  if (eventType === 'RETIREMENT_ANNOUNCEMENT') outcome = announceFarewell(candidate, year, context);
  else if (eventType === 'HEALTH_CRISIS') outcome = createHealthCrisis(candidate, year, context);
  else if (eventType === 'SCANDAL') outcome = createScandal(candidate, year, context);
  else outcome = createPersonalCrisis(candidate, year, context);

  const updatedPlayers = roster.map(player => player.id === outcome.player.id ? outcome.player : player);
  return {
    players: updatedPlayers,
    events: [outcome.event],
  };
}

