import { buildSeasonArc } from './SeasonArcEngine.js';

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function topBy(list, scoreFn, limit = 5) {
  return [...list]
    .map((player) => ({ player, score: scoreFn(player) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .filter((entry) => entry.player);
}

function rankPositionOf(ranked = [], playerId) {
  return ranked.find((entry) => entry.playerId === playerId)?.position ?? 999;
}

function buildTopRace(players, ranked = []) {
  const leaders = players
    .map((player) => ({
      player,
      rank: rankPositionOf(ranked, player.id),
      market: player?.personality?.marketability?.score ?? 30,
    }))
    .filter((entry) => entry.rank <= 12)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 5);

  return {
    id: 'WORLD_NO1',
    label: 'Disputa pelo topo',
    headline: 'a corrida pelo numero 1',
    entries: leaders.map((entry, index) => ({
      player: entry.player,
      score: clamp(100 - index * 14 + entry.market * 0.15, 0, 100),
      reason: index === 0
        ? 'entra como referencia imediata da hierarquia'
        : 'segue perto o bastante para transformar um torneio grande em mudanca de ordem',
    })),
  };
}

function buildFinalsRace(players, ranked = []) {
  const contenders = players
    .map((player) => ({
      player,
      rank: rankPositionOf(ranked, player.id),
      formPoints: player?.formPoints ?? 0,
    }))
    .filter((entry) => entry.rank <= 18)
    .sort((a, b) => a.rank - b.rank || b.formPoints - a.formPoints)
    .slice(0, 8);

  return {
    id: 'FINALS_RACE',
    label: 'Vaga no Finals',
    headline: 'a corrida por vaga no Finals',
    entries: contenders.map((entry, index) => ({
      player: entry.player,
      score: clamp(92 - index * 10 + Math.min(12, entry.formPoints / 6), 0, 100),
      reason: index < 4
        ? 'vive trecho que pode consolidar vaga sem drama'
        : 'ainda precisa de semanas fortes para transformar esperança em presenca real',
    })),
  };
}

function buildYoungRace(players) {
  const youngsters = players.filter((player) => (player?.age ?? 99) <= 22);
  const entries = topBy(
    youngsters,
    (player) => {
      const arc = buildSeasonArc(player);
      const rank = player?.rankPosition ?? 999;
      const form = player?.recentForm?.formScore ?? 0.5;
      return clamp(90 - rank * 0.8 + form * 35 + (arc.id === 'PRODIGY_SURGE' ? 18 : 0), 0, 100);
    },
    5,
  ).map(({ player, score }) => ({
    player,
    score,
    reason: 'cada boa semana empurra esse nome para mais perto do titulo simbolico de melhor jovem do ano',
  }));

  return {
    id: 'BEST_YOUNG',
    label: 'Melhor jovem do ano',
    headline: 'a corrida pelo posto de melhor jovem do ano',
    entries,
  };
}

function buildComebackRace(players) {
  const entries = topBy(
    players.filter((player) => {
      const mood = player?.personality?.currentState?.mood ?? '';
      const narrative = String(player?.publicNarrativeMemory?.publicNarrative?.line ?? '').toLowerCase();
      return /comeback|vulnerable|rebuilding|galvanized|vindicated/.test(mood.toLowerCase()) || /ferida aberta|voltou|redenção|redencao/.test(narrative);
    }),
    (player) => {
      const arc = buildSeasonArc(player);
      const rankDelta = (player?.initialRank ?? player?.rankPosition ?? 999) - (player?.rankPosition ?? 999);
      const form = player?.recentForm?.formScore ?? 0.5;
      return clamp(rankDelta * 2 + form * 45 + (arc.id === 'REDEMPTION_SEARCH' ? 14 : 0) + (arc.id === 'VETERAN_RECHARGE' ? 10 : 0), 0, 100);
    },
    5,
  ).map(({ player, score }) => ({
    player,
    score,
    reason: 'o circuito ja comeca a ler a temporada desse nome como tentativa real de retorno',
  }));

  return {
    id: 'COMEBACK',
    label: 'Retorno do ano',
    headline: 'a corrida por retorno do ano',
    entries,
  };
}

function buildAssertionRace(players) {
  const entries = topBy(
    players.filter((player) => {
      const arc = buildSeasonArc(player);
      return ['ASSERTION_RUN', 'QUIET_BUILD', 'PRODIGY_SURGE'].includes(arc.id);
    }),
    (player) => {
      const arc = buildSeasonArc(player);
      const rank = player?.rankPosition ?? 999;
      return clamp((100 - rank) * 0.5 + (arc.volatility ?? 0) * 0.35 + (player?.recentForm?.formScore ?? 0.5) * 35, 0, 100);
    },
    5,
  ).map(({ player, score }) => ({
    player,
    score,
    reason: 'cada campanha forte parece empurrar esse jogador para um novo andar do circuito',
  }));

  return {
    id: 'ASSERTION',
    label: 'Temporada de afirmação',
    headline: 'a corrida pela grande temporada de afirmação',
    entries,
  };
}

export function buildNarrativeRaces({ players = [], ranked = [], year = null } = {}) {
  const pool = players.filter(Boolean);
  const races = [
    buildTopRace(pool, ranked),
    buildFinalsRace(pool, ranked),
    buildYoungRace(pool),
    buildComebackRace(pool),
    buildAssertionRace(pool),
  ].map((race) => ({
    ...race,
    year,
    entries: (race.entries ?? []).filter((entry) => entry?.player),
  })).filter((race) => race.entries.length > 0);

  const featured = races
    .map((race) => ({
      ...race,
      heat: (race.entries[0]?.score ?? 0) - (race.entries[2]?.score ?? race.entries[1]?.score ?? 0),
    }))
    .sort((a, b) => b.heat - a.heat);

  return {
    year,
    races,
    featured: featured.slice(0, 3),
  };
}
