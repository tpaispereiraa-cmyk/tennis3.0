/**
 * RadarSystem
 * Camada opcional de acompanhamento editorial do Modo Universo.
 * Sem acompanhados, as funções retornam estado vazio e não alteram o fluxo.
 */

export const RADAR_MAX_FOLLOWED = 4;

export function normalizeFollowedPlayerIds(ids, availableIds = null) {
  const allowed = availableIds ? new Set(availableIds) : null;
  return [...new Set((Array.isArray(ids) ? ids : []).filter(Boolean))]
    .filter((id) => !allowed || allowed.has(id))
    .slice(0, RADAR_MAX_FOLLOWED);
}

export function isRadarPlayer(playerOrId, followedPlayerIds = []) {
  const id = typeof playerOrId === 'object' ? playerOrId?.id : playerOrId;
  return !!id && (followedPlayerIds ?? []).includes(id);
}

export function isRadarMatch(playerA, playerB, followedPlayerIds = []) {
  return isRadarPlayer(playerA, followedPlayerIds) || isRadarPlayer(playerB, followedPlayerIds);
}

export function createRadarState(input = {}) {
  return {
    followedPlayerIds: normalizeFollowedPlayerIds(input.followedPlayerIds),
    matchLog: Array.isArray(input.matchLog) ? input.matchLog.slice(-240) : [],
    alerts: Array.isArray(input.alerts) ? input.alerts.slice(-120) : [],
    weeklyDigest: Array.isArray(input.weeklyDigest) ? input.weeklyDigest.slice(-80) : [],
    seasonRecaps: Array.isArray(input.seasonRecaps) ? input.seasonRecaps.slice(-24) : [],
    rankTimeline: input.rankTimeline && typeof input.rankTimeline === 'object' ? input.rankTimeline : {},
    settings: {
      showMatchAlerts: input.settings?.showMatchAlerts !== false,
      showMajorOnly: input.settings?.showMajorOnly ?? true,
    },
  };
}

export function buildRadarRankingTimeline({ followedPlayerIds = [], tournament, outcomes, beforePlayers = [], afterPlayers = [], year }) {
  const beforeById = new Map(beforePlayers.map((player) => [player.id, player]));
  const afterById = new Map(afterPlayers.map((player) => [player.id, player]));
  return followedPlayerIds.flatMap((playerId) => {
    const outcome = readOutcome(outcomes, playerId);
    if (!outcome) return [];
    const before = beforeById.get(playerId);
    const after = afterById.get(playerId);
    return [{
      id: `${year ?? 'year'}:${tournament?.id ?? 'tour'}:${playerId}`,
      playerId,
      tournamentId: tournament?.id ?? null,
      tournamentName: tournament?.name ?? 'Torneio',
      category: tournament?.category ?? null,
      surface: tournament?.surface ?? 'HARD',
      year: year ?? null,
      rankBefore: before?.rankPosition ?? null,
      rankAfter: after?.rankPosition ?? null,
      rankDelta: (before?.rankPosition != null && after?.rankPosition != null) ? before.rankPosition - after.rankPosition : null,
      round: outcome.round ?? null,
      roundLabel: roundLabelCopy(outcome.round),
      points: outcome.points ?? 0,
    }];
  });
}

export function buildRadarMatchRecord({ playerA, playerB, winner, result, tournament, roundLabel, year }) {
  const aWon = winner?.id === playerA?.id;
  const sets = result?.setsDetail ?? result?.sets ?? [];
  const heat = result?.heat?.peak ?? result?.telemetry?.heat?.peak ?? null;
  const loser = aWon ? playerB : playerA;
  const headline = `${winner?.name ?? 'Jogador'} ${aWon ? 'vence' : 'supera'} ${loser?.name ?? 'o adversário'}`;
  return {
    id: `${tournament?.id ?? 'tour'}:${year ?? 'year'}:${roundLabel ?? 'match'}:${playerA?.id ?? 'a'}:${playerB?.id ?? 'b'}:${Date.now()}`,
    tournamentId: tournament?.id ?? null,
    tournamentName: tournament?.name ?? 'Circuito',
    tournamentCategory: tournament?.category ?? null,
    surface: tournament?.surface ?? null,
    year: year ?? null,
    roundLabel: roundLabel ?? 'Partida',
    playerAId: playerA?.id ?? null,
    playerAName: playerA?.name ?? 'Jogador A',
    playerARank: playerA?.rankPosition ?? null,
    playerBId: playerB?.id ?? null,
    playerBName: playerB?.name ?? 'Jogador B',
    playerBRank: playerB?.rankPosition ?? null,
    winnerId: winner?.id ?? null,
    winnerName: winner?.name ?? null,
    score: Array.isArray(sets) ? sets.map((set) => Array.isArray(set) ? set.join('-') : set).join(' · ') : null,
    heat,
    heatLabel: result?.heat?.tier?.label ?? null,
    headline,
    narration: result?.matchNarrativeDossier?.summary ?? result?.narration ?? null,
    highlights: (result?.matchStoryCapsules ?? []).slice(0, 5),
    simulationSource: 'FOLLOWED_HEADLESS',
  };
}

export function buildRadarAlerts(match, followedPlayerIds = []) {
  if (!match) return [];
  const alerts = [];
  const bothFollowed = followedPlayerIds.includes(match.playerAId) && followedPlayerIds.includes(match.playerBId);
  const winnerWasUnderdog = match.winnerId === match.playerAId
    ? (match.playerARank ?? 999) > (match.playerBRank ?? 999) + 18
    : (match.playerBRank ?? 999) > (match.playerARank ?? 999) + 18;
  if (bothFollowed) alerts.push({ type:'FOLLOWED_DUEL', weight:100, headline:`Encontro de Radar: ${match.playerAName} x ${match.playerBName}` });
  if (match.roundLabel === 'F' || /final/i.test(match.roundLabel ?? '')) alerts.push({ type:'TITLE_MATCH', weight:92, headline:`Decisão no Radar: ${match.headline}` });
  if ((match.heat ?? 0) >= 80) alerts.push({ type:'CLASSIC', weight:84, headline:`Jogo em chamas: ${match.headline}` });
  if (winnerWasUnderdog) alerts.push({ type:'UPSET', weight:76, headline:`Zebra no Radar: ${match.headline}` });
  if (!alerts.length) alerts.push({ type:'FOLLOWED_MATCH', weight:42, headline:match.headline });
  return alerts.map((alert, index) => ({
    ...alert,
    id:`${match.id}:alert:${index}`,
    matchId:match.id,
    tournamentName:match.tournamentName,
    playerIds:[match.playerAId, match.playerBId],
    year:match.year,
  }));
}

export function buildRadarSeasonRecap({ year, followedPlayerIds = [], players = [], matchLog = [] }) {
  if (!followedPlayerIds.length) return null;
  const playerById = new Map(players.map((player) => [player.id, player]));
  const matches = matchLog.filter((match) => Number(match.year) === Number(year));
  const stories = followedPlayerIds.map((id) => {
    const player = playerById.get(id);
    const own = matches.filter((match) => match.playerAId === id || match.playerBId === id);
    const wins = own.filter((match) => match.winnerId === id).length;
    const biggest = [...own].sort((a, b) => (b.heat ?? 0) - (a.heat ?? 0))[0] ?? null;
    return { playerId:id, playerName:player?.name ?? (biggest?.playerAId === id ? biggest?.playerAName : biggest?.playerBName) ?? 'Jogador acompanhado', rank:player?.rankPosition ?? null, matches:own.length, wins, biggest };
  });
  const headline = stories.length === 1
    ? `${stories[0].playerName}: o ano sob a lente do Radar`
    : `${stories.length} trajetórias acompanhadas no ano`;
  return { id:`radar-year:${year}`, year, headline, stories, matchOfYear:[...matches].sort((a,b) => (b.heat ?? 0) - (a.heat ?? 0))[0] ?? null };
}

const ROUND_COPY = {
  R128:'1ª rodada', R64:'2ª rodada', R32:'3ª rodada', R16:'oitavas',
  QF:'quartas de final', SF:'semifinal', F:'final', W:'campeão',
};

function readOutcome(outcomes, playerId) {
  if (!outcomes) return null;
  if (outcomes instanceof Map) return outcomes.get(playerId) ?? null;
  return outcomes[playerId] ?? null;
}

function nextRound(round) {
  return ({ R128:'R64', R64:'R32', R32:'R16', R16:'QF', QF:'SF', SF:'F', F:'W' })[round] ?? null;
}

export function roundLabelCopy(round) {
  return ROUND_COPY[round] ?? round ?? 'fase não registrada';
}

export function buildRadarDigest({ followedPlayerIds = [], players = [], matchLog = [], tournament, year, outcomes = null }) {
  if (!followedPlayerIds.length) return null;
  const byId = new Map(players.map((player) => [player.id, player]));
  const records = matchLog.filter((row) => row.tournamentId === tournament?.id);
  const entries = followedPlayerIds.map((id) => {
    const player = byId.get(id);
    const matches = records.filter((row) => row.playerAId === id || row.playerBId === id);
    const last = matches.at(-1) ?? null;
    const outcome = readOutcome(outcomes, id);
    const won = matches.filter((match) => match.winnerId === id).length;
    const outcomeLabel = outcome?.round === 'W'
      ? 'CAMPEÃO'
      : outcome?.round
        ? `Saiu na ${roundLabelCopy(outcome.round)}`
        : last?.winnerId === id
          ? `Avançou para ${roundLabelCopy(nextRound(last.roundLabel))}`
          : matches.length ? 'Campanha em andamento' : 'Não entrou em quadra';
    return {
      playerId: id,
      playerName: player?.name ?? (last?.playerAId === id ? last?.playerAName : last?.playerBName) ?? 'Jogador acompanhado',
      rank: player?.rankPosition ?? null,
      matches: matches.length,
      wins: won,
      won: !!last && last.winnerId === id,
      lastMatch: last,
      campaign: matches,
      outcome: outcome ? { ...outcome, label:outcomeLabel } : null,
      outcomeLabel,
    };
  });
  return {
    id: `${year ?? 'year'}:${tournament?.id ?? 'tour'}:digest`,
    tournamentId: tournament?.id ?? null,
    tournamentName: tournament?.name ?? 'Circuito',
    year: year ?? null,
    entries,
  };
}
