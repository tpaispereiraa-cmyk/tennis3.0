const MEMORY_VERSION = 1;
const MAX_TOURNAMENT_MEMORIES = 18;
const MAX_OPPONENT_MEMORIES = 28;
const MAX_OPPONENT_PROFILES = 16;
const MAX_REASON_CODES = 8;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Number(n) || 0));
}

function roundLabelFromIndex(roundIdx, totalRounds) {
  const fromEnd = totalRounds - 1 - roundIdx;
  if (fromEnd === 0) return 'F';
  if (fromEnd === 1) return 'SF';
  if (fromEnd === 2) return 'QF';
  if (fromEnd === 3) return 'R16';
  if (fromEnd === 4) return 'R32';
  return 'EARLY';
}

function roundImportance(round) {
  return { F: 34, SF: 24, QF: 17, R16: 10, R32: 5, EARLY: 2 }[round] ?? 2;
}

function categoryImportance(category) {
  return {
    GRAND_SLAM: 34,
    SLAM_CLASH: 36,
    FINALS: 30,
    MASTERS_1000: 24,
    ATP_500: 14,
    ATP_250: 9,
    ATP_100: 5,
    ATP_75: 4,
    ATP_50: 3,
  }[category] ?? 6;
}

function surfaceLabel(surface) {
  return {
    HARD: 'quadra dura',
    CLAY: 'saibro',
    GRASS: 'grama',
    INDOOR: 'indoor',
    CARPET: 'carpet',
  }[String(surface ?? '').toUpperCase()] ?? String(surface ?? 'piso indefinido').toLowerCase();
}

function normalizeMemoryBank(player) {
  const existing = player?.careerMemory ?? {};
  return {
    version: MEMORY_VERSION,
    tournaments: {
      sacred: [...(existing.tournaments?.sacred ?? [])],
      beloved: [...(existing.tournaments?.beloved ?? [])],
      painful: [...(existing.tournaments?.painful ?? [])],
      haunting: [...(existing.tournaments?.haunting ?? [])],
      provingGrounds: [...(existing.tournaments?.provingGrounds ?? [])],
      all: [...(existing.tournaments?.all ?? [])],
    },
    opponents: {
      respected: [...(existing.opponents?.respected ?? [])],
      disliked: [...(existing.opponents?.disliked ?? [])],
      feared: [...(existing.opponents?.feared ?? [])],
      comfortable: [...(existing.opponents?.comfortable ?? [])],
      stylisticProblems: [...(existing.opponents?.stylisticProblems ?? [])],
      profiles: [...(existing.opponents?.profiles ?? [])],
      all: [...(existing.opponents?.all ?? [])],
    },
    favorites: {
      tournaments: [...(existing.favorites?.tournaments ?? [])],
      opponentsToFace: [...(existing.favorites?.opponentsToFace ?? [])],
      opponentsToAvoid: [...(existing.favorites?.opponentsToAvoid ?? [])],
    },
    lastUpdatedYear: existing.lastUpdatedYear ?? null,
  };
}

function playerStyleSnapshot(player) {
  const attrs = player?.attrs ?? {};
  const styleId = player?.styleId ?? player?.style?.id ?? null;
  const identity = player?.surfaceIdentity ?? null;
  const strengths = [
    ['serve', attrs.serve ?? attrs.saque],
    ['power', attrs.power ?? attrs.potencia],
    ['speed', attrs.speed ?? attrs.velocidade],
    ['stamina', attrs.stamina ?? attrs.resistencia],
    ['defense', attrs.defense ?? attrs.defesa],
    ['volley', attrs.volley ?? attrs.voleio],
    ['mental', attrs.mental ?? attrs.clutch],
    ['return', attrs.return ?? attrs.devolucao],
  ]
    .filter(([, value]) => Number.isFinite(Number(value)))
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 3)
    .map(([key]) => key);
  return {
    styleId,
    signatureShot: player?.signatureShot ?? player?.signatureShotId ?? null,
    rallyPattern: player?.rallyPattern ?? player?.rallyPatternId ?? null,
    surfaceLean: identity?.primary ?? identity?.bestSurface ?? null,
    strengths,
  };
}

function matchupReadFor(player, opponent, won) {
  const mine = playerStyleSnapshot(player);
  const theirs = playerStyleSnapshot(opponent);
  const reasons = [];
  let label = won ? 'encaixe favoravel' : 'encaixe desconfortavel';
  let tacticalProblem = null;

  const theirStyle = String(theirs.styleId ?? '').toUpperCase();
  const myStyle = String(mine.styleId ?? '').toUpperCase();
  if (theirStyle.includes('BIG_SERVER') || theirs.strengths.includes('serve')) {
    tacticalProblem = won ? 'pressao de saque controlada' : 'pouco ritmo contra saque';
    reasons.push(won ? 'handled_big_serve' : 'struggled_with_big_serve');
  }
  if (theirStyle.includes('RETRIEVER') || theirStyle.includes('GRINDER') || theirs.strengths.includes('stamina')) {
    tacticalProblem = won ? 'paciencia sustentada' : 'rally longo drenando plano A';
    reasons.push(won ? 'outlasted_defender' : 'drained_by_defense');
  }
  if (theirStyle.includes('TAKEALLRISK') || theirs.strengths.includes('power')) {
    tacticalProblem = won ? 'absorveu explosao' : 'tirou tempo demais';
    reasons.push(won ? 'absorbed_power' : 'rushed_by_power');
  }
  if (theirStyle.includes('NET') || theirStyle.includes('SRV_VOL') || theirs.strengths.includes('volley')) {
    tacticalProblem = won ? 'passou bem contra rede' : 'desconforto contra pressao frontal';
    reasons.push(won ? 'solved_net_pressure' : 'bothered_by_net_pressure');
  }
  if (theirStyle.includes('TACTICAL') || theirs.strengths.includes('mental')) {
    tacticalProblem = won ? 'venceu xadrez tatico' : 'foi lido taticamente';
    reasons.push(won ? 'won_tactical_chess' : 'outread_tactically');
  }
  if (!tacticalProblem && myStyle && theirStyle && myStyle === theirStyle) {
    tacticalProblem = won ? 'espelho vencido' : 'espelho incomodo';
    reasons.push(won ? 'won_style_mirror' : 'lost_style_mirror');
  }
  if (tacticalProblem) label = won ? `gosta do desafio: ${tacticalProblem}` : `evita o encaixe: ${tacticalProblem}`;

  return {
    label,
    tacticalProblem,
    reasons,
    playerStyle: mine,
    opponentStyle: theirs,
  };
}

function upsertWeighted(list, entry, cap) {
  const key = entry.key;
  const idx = list.findIndex(item => item.key === key);
  const nextEntry = {
    ...entry,
    reasons: [...new Set(entry.reasons ?? [])].slice(0, MAX_REASON_CODES),
  };
  const next = idx >= 0
    ? list.map((item, i) => i === idx
      ? {
          ...item,
          ...nextEntry,
          importance: Math.max(item.importance ?? 0, nextEntry.importance ?? 0),
          reasons: [...new Set([...(item.reasons ?? []), ...(nextEntry.reasons ?? [])])].slice(0, MAX_REASON_CODES),
          mentions: (item.mentions ?? 1) + 1,
        }
      : item)
    : [...list, { mentions: 1, ...nextEntry }];
  return next
    .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0) || (b.year ?? 0) - (a.year ?? 0))
    .slice(0, cap);
}

function extractPlayerRun(playerId, bracket) {
  const rounds = bracket?.rounds ?? [];
  const totalRounds = rounds.length;
  const matches = [];
  let reachedRound = 'EARLY';
  let eliminatedBy = null;
  let bestWinRank = 999;
  let defeatedTop10 = false;
  let defeatedTop5 = false;
  let wonMatches = 0;
  for (let roundIdx = 0; roundIdx < rounds.length; roundIdx++) {
    const round = rounds[roundIdx] ?? [];
    const label = roundLabelFromIndex(roundIdx, totalRounds);
    for (const match of round) {
      if (match?.isBye || !match?.playerA || !match?.playerB || !match?.winner) continue;
      const isA = match.playerA.id === playerId;
      const isB = match.playerB.id === playerId;
      if (!isA && !isB) continue;
      const opponent = isA ? match.playerB : match.playerA;
      const won = match.winner.id === playerId;
      reachedRound = label;
      if (won) {
        wonMatches += 1;
        const oppRank = opponent?.rankPosition ?? 999;
        bestWinRank = Math.min(bestWinRank, oppRank);
        if (oppRank <= 10) defeatedTop10 = true;
        if (oppRank <= 5) defeatedTop5 = true;
      } else {
        eliminatedBy = opponent;
      }
      matches.push({ match, opponent, won, round: label, roundIdx });
    }
  }
  return { matches, reachedRound, eliminatedBy, bestWinRank, defeatedTop10, defeatedTop5, wonMatches };
}

function isCloseMatch(match) {
  const sets = match?.result?.setsDetail ?? [];
  if (!sets.length) return false;
  const decidedByTb = sets.some(([a, b]) => Math.max(a, b) >= 7 && Math.abs(a - b) <= 2);
  const fullDistance = sets.length >= 3 || (match?.bestOf === 5 && sets.length >= 5);
  return decidedByTb || fullDistance;
}

function buildTournamentMemory({ player, previousPlayer, tournament, bracket, year }) {
  const run = extractPlayerRun(player.id, bracket);
  if (!run.matches.length) return null;

  const championId = bracket?.champion?.id ?? null;
  const isChampion = championId === player.id;
  const age = player.age ?? previousPlayer?.age ?? (player.birthYear ? year - player.birthYear : null);
  const rankBefore = previousPlayer?.rankPosition ?? player.rankPosition ?? 999;
  const rankAfter = player.rankPosition ?? rankBefore;
  const rankJump = rankBefore - rankAfter;
  const categoryScore = categoryImportance(tournament?.category);
  const roundScore = isChampion ? 38 : roundImportance(run.reachedRound);
  const reasons = [];
  let emotion = isChampion ? 'pride' : 'neutral';
  let type = isChampion ? 'SIGNATURE_TITLE' : 'TOURNAMENT_MARK';
  let importance = categoryScore + roundScore;

  if (isChampion) {
    reasons.push('title');
    if (['GRAND_SLAM', 'SLAM_CLASH'].includes(tournament?.category)) {
      reasons.push('major_title');
      emotion = 'sacred';
      importance += 28;
      type = 'SACRED_TITLE';
    }
    if ((player.careerTitles?.total ?? 0) <= 1) {
      reasons.push('first_title_feeling');
      importance += 8;
    }
  }

  if ((age ?? 99) <= 21 && (run.reachedRound === 'QF' || run.reachedRound === 'SF' || run.reachedRound === 'F' || isChampion || run.defeatedTop10)) {
    reasons.push('young_breakthrough');
    emotion = isChampion ? emotion : 'discovery';
    type = isChampion ? type : 'BREAKTHROUGH';
    importance += 18;
  }

  if (rankJump >= 18) {
    reasons.push('ranking_leap');
    importance += clamp(rankJump, 0, 35);
    if (!isChampion) emotion = 'arrival';
  }

  if (run.defeatedTop5) {
    reasons.push('beat_top5');
    importance += 16;
  } else if (run.defeatedTop10) {
    reasons.push('beat_top10');
    importance += 11;
  }

  if (player.injury?.active || previousPlayer?.injury?.active || previousPlayer?.physicalCondition < 72) {
    reasons.push(isChampion ? 'won_through_physical_doubt' : 'played_under_physical_doubt');
    importance += isChampion ? 20 : 8;
    if (isChampion || run.reachedRound === 'F' || run.reachedRound === 'SF') {
      emotion = 'redemption';
      type = isChampion ? 'REDEMPTION_TITLE' : 'REDEMPTION_RUN';
    }
  }

  const loss = run.matches.find(m => !m.won);
  if (loss) {
    const oppRank = loss.opponent?.rankPosition ?? 999;
    const myRank = rankBefore;
    const upsetGap = oppRank - myRank;
    const lateLoss = ['F', 'SF', 'QF', 'R16'].includes(loss.round);
    if (upsetGap >= 22 && lateLoss) {
      reasons.push('painful_upset_loss');
      emotion = 'scar';
      type = 'HAUNTING_LOSS';
      importance += clamp(upsetGap, 0, 45) + roundImportance(loss.round);
    } else if (lateLoss && isCloseMatch(loss.match)) {
      reasons.push('close_late_loss');
      emotion = 'unfinished_business';
      type = 'PAINFUL_EXIT';
      importance += 12;
    }
  }

  if (importance < 30) return null;

  return {
    key: `${player.id}-${tournament?.id ?? tournament?.name}-${year}`,
    type,
    emotion,
    importance: Math.round(importance),
    year,
    playerAge: age,
    tournament: {
      id: tournament?.id ?? null,
      name: tournament?.name ?? 'Torneio',
      category: tournament?.category ?? null,
      surface: tournament?.surface ?? null,
      surfaceLabel: surfaceLabel(tournament?.surface),
      location: tournament?.location ?? null,
    },
    result: {
      champion: isChampion,
      reachedRound: run.reachedRound,
      wonMatches: run.wonMatches,
      eliminatedBy: run.eliminatedBy ? {
        id: run.eliminatedBy.id,
        name: run.eliminatedBy.name,
        rank: run.eliminatedBy.rankPosition ?? null,
      } : null,
      defeatedTop10: run.defeatedTop10,
      defeatedTop5: run.defeatedTop5,
    },
    rankingContext: {
      rankBefore,
      rankAfter,
      rankJump,
    },
    physicalContext: {
      hadActiveInjury: !!(player.injury?.active || previousPlayer?.injury?.active),
      physicalConditionBefore: previousPlayer?.physicalCondition ?? null,
      physicalConditionAfter: player.physicalCondition ?? null,
    },
    reasons,
    quoteSeeds: reasons.map(reason => `memory:${reason}`),
  };
}

function buildOpponentMemory({ player, previousPlayer, opponent, match, tournament, year, round, won, rivalry = null }) {
  if (!opponent?.id || opponent.id === player.id) return null;
  const age = player.age ?? previousPlayer?.age ?? (player.birthYear ? year - player.birthYear : null);
  const myRank = previousPlayer?.rankPosition ?? player.rankPosition ?? 999;
  const oppRank = opponent.rankPosition ?? 999;
  const reasons = [];
  let relationship = won ? 'comfortable' : 'problem';
  let emotion = won ? 'confidence' : 'friction';
  let importance = categoryImportance(tournament?.category) + roundImportance(round);
  const matchupRead = matchupReadFor(player, opponent, won);
  reasons.push(...matchupRead.reasons);

  if (['F', 'SF', 'QF'].includes(round)) {
    reasons.push('big_stage_meeting');
    importance += 12;
  }
  if (isCloseMatch(match)) {
    reasons.push('close_match');
    relationship = 'respected';
    emotion = won ? 'respect' : 'unfinished_business';
    importance += 10;
  }
  if (!won && oppRank > myRank + 20) {
    reasons.push('upset_by_lower_ranked');
    relationship = 'haunting';
    emotion = 'scar';
    importance += clamp(oppRank - myRank, 0, 42);
  }
  if (won && oppRank <= 10) {
    reasons.push('beat_elite_opponent');
    relationship = 'respected';
    emotion = 'validation';
    importance += 14;
  }
  if (!won && oppRank <= 10) {
    reasons.push('elite_wall');
    relationship = 'feared';
    emotion = 'challenge';
    importance += 10;
  }
  if (!won && ['F', 'SF'].includes(round)) {
    reasons.push('denied_big_title_path');
    relationship = relationship === 'haunting' ? relationship : 'stylistic_problem';
    importance += 12;
  }
  if (rivalry?.graduated || rivalry?.intensity >= 0.3) {
    reasons.push('rivalry_memory');
    relationship = rivalry?.winnerWasTrailer && won ? 'respected' : relationship;
    importance += Math.round((rivalry.intensity ?? 0.25) * 24);
  }

  if (importance < 20) return null;

  return {
    key: `${player.id}-${opponent.id}-${tournament?.id ?? tournament?.name}-${year}-${round}`,
    opponentId: opponent.id,
    opponentName: opponent.name,
    opponentRank: oppRank,
    relationship,
    emotion,
    importance: Math.round(importance),
    year,
    playerAge: age,
    tournament: {
      id: tournament?.id ?? null,
      name: tournament?.name ?? 'Torneio',
      category: tournament?.category ?? null,
      surface: tournament?.surface ?? null,
      surfaceLabel: surfaceLabel(tournament?.surface),
    },
    matchContext: {
      round,
      won,
      close: isCloseMatch(match),
      score: (match?.result?.setsDetail ?? []).map(([a, b]) => `${a}-${b}`).join(', '),
    },
    matchupRead,
    rivalryContext: rivalry ? {
      type: rivalry.type ?? null,
      status: rivalry.status ?? null,
      intensity: rivalry.intensity ?? 0,
      priorMatches: rivalry.priorMatches ?? null,
      winnerH2hWins: rivalry.winnerH2hWins ?? null,
      loserH2hWins: rivalry.loserH2hWins ?? null,
      narrativeBase: rivalry.narrativeBase ?? null,
    } : null,
    reasons,
    quoteSeeds: reasons.map(reason => `opponent:${reason}`),
  };
}

function applyTournamentMemory(bank, memory) {
  if (!memory) return bank;
  const next = {
    ...bank,
    tournaments: { ...bank.tournaments },
    favorites: { ...bank.favorites },
  };
  next.tournaments.all = upsertWeighted(next.tournaments.all, memory, MAX_TOURNAMENT_MEMORIES);
  if (memory.type === 'SACRED_TITLE' || memory.type === 'REDEMPTION_TITLE') {
    next.tournaments.sacred = upsertWeighted(next.tournaments.sacred, memory, 8);
  }
  if (['SIGNATURE_TITLE', 'BREAKTHROUGH', 'REDEMPTION_RUN'].includes(memory.type) || memory.emotion === 'discovery') {
    next.tournaments.beloved = upsertWeighted(next.tournaments.beloved, memory, 8);
  }
  if (memory.type === 'BREAKTHROUGH') {
    next.tournaments.provingGrounds = upsertWeighted(next.tournaments.provingGrounds, memory, 8);
  }
  if (memory.type === 'PAINFUL_EXIT') {
    next.tournaments.painful = upsertWeighted(next.tournaments.painful, memory, 8);
  }
  if (memory.type === 'HAUNTING_LOSS') {
    next.tournaments.haunting = upsertWeighted(next.tournaments.haunting, memory, 8);
  }
  next.favorites.tournaments = [
    ...next.tournaments.sacred,
    ...next.tournaments.beloved,
    ...next.tournaments.provingGrounds,
  ]
    .filter((item, idx, arr) => item && arr.findIndex(x => x.key === item.key) === idx)
    .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))
    .slice(0, 5);
  return next;
}

function applyOpponentMemory(bank, memory) {
  if (!memory) return bank;
  const next = {
    ...bank,
    opponents: { ...bank.opponents },
    favorites: { ...bank.favorites },
  };
  next.opponents.all = upsertWeighted(next.opponents.all, memory, MAX_OPPONENT_MEMORIES);
  next.opponents.profiles = upsertOpponentProfile(next.opponents.profiles, memory);
  if (memory.relationship === 'respected') next.opponents.respected = upsertWeighted(next.opponents.respected, memory, 10);
  if (memory.relationship === 'comfortable') next.opponents.comfortable = upsertWeighted(next.opponents.comfortable, memory, 10);
  if (memory.relationship === 'feared') next.opponents.feared = upsertWeighted(next.opponents.feared, memory, 10);
  if (memory.relationship === 'haunting') next.opponents.disliked = upsertWeighted(next.opponents.disliked, memory, 10);
  if (memory.relationship === 'stylistic_problem' || memory.relationship === 'problem') {
    next.opponents.stylisticProblems = upsertWeighted(next.opponents.stylisticProblems, memory, 10);
  }
  next.favorites.opponentsToFace = [...next.opponents.comfortable, ...next.opponents.respected]
    .filter((item, idx, arr) => item && arr.findIndex(x => x.opponentId === item.opponentId) === idx)
    .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))
    .slice(0, 5);
  next.favorites.opponentsToAvoid = [...next.opponents.feared, ...next.opponents.disliked, ...next.opponents.stylisticProblems]
    .filter((item, idx, arr) => item && arr.findIndex(x => x.opponentId === item.opponentId) === idx)
    .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))
    .slice(0, 5);
  return next;
}

function upsertOpponentProfile(profiles, memory) {
  const idx = profiles.findIndex(profile => profile.opponentId === memory.opponentId);
  const current = idx >= 0 ? profiles[idx] : {
    opponentId: memory.opponentId,
    opponentName: memory.opponentName,
    firstMarkedYear: memory.year,
    meetingsRemembered: 0,
    winsRemembered: 0,
    lossesRemembered: 0,
    relationshipScore: 0,
    reasons: [],
    memories: [],
  };
  const delta = memory.matchContext?.won ? 1 : -1;
  const emotionalWeight = memory.relationship === 'haunting' ? -3
    : memory.relationship === 'feared' || memory.relationship === 'stylistic_problem' || memory.relationship === 'problem' ? -2
    : memory.relationship === 'respected' ? 1
    : memory.relationship === 'comfortable' ? 2
    : delta;
  const nextProfile = {
    ...current,
    opponentName: memory.opponentName,
    opponentRank: memory.opponentRank,
    lastYear: memory.year,
    meetingsRemembered: (current.meetingsRemembered ?? 0) + 1,
    winsRemembered: (current.winsRemembered ?? 0) + (memory.matchContext?.won ? 1 : 0),
    lossesRemembered: (current.lossesRemembered ?? 0) + (memory.matchContext?.won ? 0 : 1),
    relationshipScore: clamp((current.relationshipScore ?? 0) + emotionalWeight, -12, 12),
    dominantRelationship: memory.relationship,
    emotionalTone: memory.emotion,
    matchupRead: memory.matchupRead ?? current.matchupRead ?? null,
    rivalryContext: memory.rivalryContext ?? current.rivalryContext ?? null,
    reasons: [...new Set([...(current.reasons ?? []), ...(memory.reasons ?? [])])].slice(0, 12),
    memories: upsertWeighted(current.memories ?? [], memory, 5),
    importance: Math.max(current.importance ?? 0, memory.importance ?? 0) + Math.min(10, (current.meetingsRemembered ?? 0) + 1),
  };
  const next = idx >= 0
    ? profiles.map((profile, i) => i === idx ? nextProfile : profile)
    : [...profiles, nextProfile];
  return next
    .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0) || Math.abs(b.relationshipScore ?? 0) - Math.abs(a.relationshipScore ?? 0))
    .slice(0, MAX_OPPONENT_PROFILES);
}

export function updateCareerMemoriesForTournament(players = [], { tournament, bracket, year, previousPlayers = [], rivalrySystem = null } = {}) {
  if (!Array.isArray(players) || !bracket?.rounds?.length || !tournament) return players;
  const previousById = Object.fromEntries((previousPlayers ?? []).map(p => [p.id, p]));
  const playerById = Object.fromEntries(players.map(p => [p.id, p]));

  return players.map(player => {
    const previousPlayer = previousById[player.id] ?? player;
    const run = extractPlayerRun(player.id, bracket);
    if (!run.matches.length) return player;

    let bank = normalizeMemoryBank(player);
    const tournamentMemory = buildTournamentMemory({ player, previousPlayer, tournament, bracket, year });
    bank = applyTournamentMemory(bank, tournamentMemory);

    for (const item of run.matches) {
      const opponent = playerById[item.opponent?.id] ?? item.opponent;
      const rivalry = rivalrySystem?.getRivalryContext?.(item.won ? player.id : opponent?.id, item.won ? opponent?.id : player.id) ?? null;
      const opponentMemory = buildOpponentMemory({
        player,
        previousPlayer,
        opponent,
        match: item.match,
        tournament,
        year,
        round: item.round,
        won: item.won,
        rivalry,
      });
      bank = applyOpponentMemory(bank, opponentMemory);
    }

    bank.lastUpdatedYear = year;
    return { ...player, careerMemory: bank };
  });
}
