const TIER_ORDER = ['bronze', 'silver', 'gold', 'legendary', 'mythic'];

export const BADGE_TIER_META = {
  bronze:    { id: 'bronze',    label: 'Bronze',    short: 'BR', color: '#CD7F32', glow: 'rgba(205,127,50,.26)' },
  silver:    { id: 'silver',    label: 'Prata',     short: 'PR', color: '#C0C7D2', glow: 'rgba(192,199,210,.24)' },
  gold:      { id: 'gold',      label: 'Ouro',      short: 'OU', color: '#F2C94C', glow: 'rgba(242,201,76,.28)' },
  legendary: { id: 'legendary', label: 'Lendario',  short: 'LE', color: '#FF6B4A', glow: 'rgba(255,107,74,.30)' },
  mythic:    { id: 'mythic',    label: 'Mitico',    short: 'MI', color: '#B967FF', glow: 'rgba(185,103,255,.34)' },
};

export const BADGE_TIERS = TIER_ORDER.map(id => BADGE_TIER_META[id]);

const CATEGORY_LABELS = {
  legacy: 'Legado',
  titles: 'Titulos',
  slams: 'Grand Slams',
  masters: 'Masters',
  finals: 'ATP Finals',
  surface: 'Superficies',
  ranking: 'Ranking',
  performance: 'Performance',
  tournament: 'Torneios',
};

const STATIC_BADGE_DEFS = [
  {
    id: 'trophy_collector',
    name: 'Colecionador de Trofeus',
    category: 'titles',
    icon: 'T',
    description: 'Volume bruto de titulos na carreira. A prateleira comeca pequena e vira patrimonio.',
    thresholds: [5, 15, 30, 100, 150],
    value: s => s.totalTitles,
    unit: 'titulos',
  },
  {
    id: 'immortal_slams',
    name: 'Imortal em Slams',
    category: 'slams',
    icon: 'GS',
    description: 'Conquistas nos quatro maiores palcos do circuito.',
    thresholds: [1, 3, 6, 10, 15],
    value: s => s.grandSlams,
    unit: 'Grand Slams',
  },
  {
    id: 'masters_legend',
    name: 'Lenda dos Masters',
    category: 'masters',
    icon: 'M',
    description: 'Dominio nos Masters 1000, onde a elite aparece quase sempre.',
    thresholds: [2, 5, 10, 18, 28],
    value: s => s.masters,
    unit: 'Masters 1000',
  },
  {
    id: 'final_boss',
    name: 'Final Boss',
    category: 'finals',
    icon: 'F',
    description: 'Titulos no ATP Finals, o torneio onde so entra quem sustentou o ano inteiro.',
    thresholds: [1, 2, 4, 6, 8],
    value: s => s.finals,
    unit: 'ATP Finals',
  },
  {
    id: 'clay_king',
    name: 'Rei do Saibro',
    category: 'surface',
    icon: 'CL',
    description: 'Titulos no saibro. Controle, paciencia e autoridade ponto a ponto.',
    thresholds: [3, 8, 15, 25, 40],
    value: s => s.surfaceTitles.CLAY,
    unit: 'titulos no saibro',
  },
  {
    id: 'grass_lord',
    name: 'Lorde da Grama',
    category: 'surface',
    icon: 'GR',
    description: 'Titulos na grama, onde tempo de bola e frieza valem ouro.',
    thresholds: [2, 5, 10, 18, 28],
    value: s => s.surfaceTitles.GRASS,
    unit: 'titulos na grama',
  },
  {
    id: 'hard_emperor',
    name: 'Imperador do Hard',
    category: 'surface',
    icon: 'HD',
    description: 'Titulos em quadra dura, o piso que mede adaptacao no calendario inteiro.',
    thresholds: [5, 12, 25, 40, 60],
    value: s => s.surfaceTitles.HARD,
    unit: 'titulos no hard',
  },
  {
    id: 'indoor_assassin',
    name: 'Assassino Indoor',
    category: 'surface',
    icon: 'IN',
    description: 'Titulos indoor, onde saque, devolucao e agressividade ficam sem vento para culpar.',
    thresholds: [2, 5, 10, 16, 24],
    value: s => s.surfaceTitles.INDOOR,
    unit: 'titulos indoor',
  },
  {
    id: 'win_machine',
    name: 'Maquina de Vitorias',
    category: 'performance',
    icon: 'W',
    description: 'Partidas vencidas registradas no universo.',
    thresholds: [50, 150, 300, 500, 800],
    value: s => s.matchWins,
    unit: 'vitorias',
  },
  {
    id: 'top10_hunter',
    name: 'Carrasco do Top 10',
    category: 'performance',
    icon: '10',
    description: 'Vitorias contra jogadores que chegaram ao jogo como Top 10.',
    thresholds: [3, 10, 25, 50, 90],
    value: s => s.top10Wins,
    unit: 'vitorias vs Top 10',
  },
  {
    id: 'bagel_artist',
    name: 'Artista do Bagel',
    category: 'performance',
    icon: '60',
    description: 'Sets vencidos por 6-0. Crueldade esportiva em formato de placar.',
    thresholds: [3, 10, 25, 45, 75],
    value: s => s.bagelsWon,
    unit: 'bagels aplicados',
  },
  {
    id: 'throne_owner',
    name: 'Dono do Trono',
    category: 'ranking',
    icon: '#1',
    description: 'Temporadas registradas terminando ou passando como numero 1.',
    thresholds: [1, 2, 4, 6, 10],
    value: s => s.no1Years,
    unit: 'anos como #1',
  },
  {
    id: 'top10_resident',
    name: 'Morador do Top 10',
    category: 'ranking',
    icon: 'R',
    description: 'Temporadas em que o jogador aparece dentro do Top 10.',
    thresholds: [1, 3, 6, 10, 15],
    value: s => s.top10Years,
    unit: 'anos no Top 10',
  },
  {
    id: 'wild_climb',
    name: 'Escalada Selvagem',
    category: 'ranking',
    icon: '+',
    description: 'Maior salto de ranking registrado de uma temporada para a outra.',
    thresholds: [20, 50, 100, 180, 300],
    value: s => s.biggestRankClimb,
    unit: 'posicoes ganhas',
  },
];

function samePlayer(a, b) {
  if (!a || !b) return false;
  return String(a.id ?? a) === String(b.id ?? b);
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeCategory(category) {
  const c = String(category ?? '').toUpperCase();
  if (c === 'GRAND_SLAM') return 'gs';
  if (c === 'MASTERS_1000') return 'masters';
  if (c === 'FINALS') return 'finals';
  if (c === 'ATP_500') return 'atp500';
  if (c === 'ATP_250') return 'atp250';
  if (c === 'SLAM_CLASH') return 'slamClash';
  return c.toLowerCase();
}

function getChampion(result) {
  return result?._slim ? result.champion : result?.bracket?.champion;
}

function getFinalist(result) {
  if (result?._slim) return result.finalist;
  const champion = result?.bracket?.champion;
  const finalMatch = result?.bracket?.rounds?.at?.(-1)?.[0];
  if (!champion || !finalMatch) return null;
  const a = finalMatch.playerA ?? finalMatch.player1;
  const b = finalMatch.playerB ?? finalMatch.player2;
  return samePlayer(a, champion) ? b : a;
}

function resultYear(result, fallbackYear = null) {
  return result?._season ?? result?.tournament?.season ?? fallbackYear;
}

function tournamentKey(tournament) {
  return tournament?.id ?? tournament?.name ?? 'unknown';
}

function addSurfaceCount(stats, surface) {
  const key = String(surface ?? '').toUpperCase();
  if (!key) return;
  stats.surfaceTitles[key] = (stats.surfaceTitles[key] ?? 0) + 1;
}

function getMatchStatsForPlayer(match, playerId, slimEntry = null) {
  if (slimEntry?.st) {
    const isWinnerA = slimEntry.wa === true;
    const side = slimEntry.w === playerId
      ? (isWinnerA ? 'a' : 'b')
      : (isWinnerA ? 'b' : 'a');
    return slimEntry.st?.[side] ?? null;
  }
  const a = match?.playerA ?? match?.player1;
  const side = samePlayer(a, playerId) ? 'a' : 'b';
  return match?.result?.stats?.[side] ?? null;
}

function setsForPlayer(matchOrEntry, playerId) {
  const sd = matchOrEntry?.sd ?? matchOrEntry?.result?.setsDetail ?? matchOrEntry?.setsDetail ?? [];
  if (!Array.isArray(sd) || !sd.length) return [];
  const winnerIsA = matchOrEntry?.wa ?? samePlayer(matchOrEntry?.playerA ?? matchOrEntry?.player1, matchOrEntry?.winner ?? matchOrEntry?.w);
  const playerIsWinner = samePlayer(matchOrEntry?.winner ?? matchOrEntry?.w, playerId);
  const playerIsA = playerIsWinner ? !!winnerIsA : !winnerIsA;
  return sd.map(set => {
    const a = safeNumber(set?.[0]);
    const b = safeNumber(set?.[1]);
    return playerIsA ? [a, b] : [b, a];
  });
}

function countMatch(playerId, opponentId, stats, matchOrEntry, playersById) {
  const sets = setsForPlayer(matchOrEntry, playerId);
  stats.matchWins += samePlayer(matchOrEntry?.winner ?? matchOrEntry?.w, playerId) ? 1 : 0;
  stats.matchLosses += samePlayer(matchOrEntry?.loser ?? matchOrEntry?.l, playerId) ? 1 : 0;
  for (const [own, opp] of sets) {
    if (own === 6 && opp === 0) stats.bagelsWon += 1;
    if (own === 0 && opp === 6) stats.bagelsLost += 1;
  }
  const opponent = playersById.get(String(opponentId));
  if (samePlayer(matchOrEntry?.winner ?? matchOrEntry?.w, playerId) && (opponent?.rankPosition ?? 999) <= 10) {
    stats.top10Wins += 1;
  }
  const playerStats = getMatchStatsForPlayer(matchOrEntry, playerId, matchOrEntry);
  stats.aces += safeNumber(playerStats?.aces);
  stats.winners += safeNumber(playerStats?.winners);
}

function buildStats(player, context = {}) {
  const playerId = String(player?.id ?? '');
  const playersById = new Map((context.allPlayers ?? []).filter(Boolean).map(p => [String(p.id), p]));
  const stats = {
    totalTitles: 0,
    grandSlams: 0,
    masters: 0,
    finals: 0,
    atp500: 0,
    atp250: 0,
    slamClash: 0,
    surfaceTitles: {},
    tournamentWins: new Map(),
    finalistRuns: 0,
    matchWins: 0,
    matchLosses: 0,
    top10Wins: 0,
    bagelsWon: 0,
    bagelsLost: 0,
    aces: 0,
    winners: 0,
    no1Years: 0,
    top10Years: 0,
    biggestRankClimb: 0,
  };

  const careerTitles = player?.careerTitles ?? {};
  const titleTotalsFromProfile = {
    grandSlams: safeNumber(careerTitles.gs),
    masters: safeNumber(careerTitles.masters),
    finals: safeNumber(careerTitles.finals),
    atp500: safeNumber(careerTitles.atp500),
    atp250: safeNumber(careerTitles.atp250),
    slamClash: safeNumber(careerTitles.slamClash),
  };
  const titleTotalsFromResults = {
    grandSlams: 0,
    masters: 0,
    finals: 0,
    atp500: 0,
    atp250: 0,
    slamClash: 0,
  };

  const allResults = {
    ...(context.historicalTournamentResults ?? {}),
    ...(context.tournamentResults ?? {}),
  };

  let countedTitlesFromResults = 0;
  for (const result of Object.values(allResults)) {
    if (!result?.tournament) continue;
    const champion = getChampion(result);
    const finalist = getFinalist(result);
    const isChampion = samePlayer(champion, playerId);
    if (isChampion) {
      countedTitlesFromResults += 1;
      const category = normalizeCategory(result.tournament.category);
      if (category === 'gs') titleTotalsFromResults.grandSlams += 1;
      else if (category === 'masters') titleTotalsFromResults.masters += 1;
      else if (category === 'finals') titleTotalsFromResults.finals += 1;
      else if (category === 'atp500') titleTotalsFromResults.atp500 += 1;
      else if (category === 'atp250') titleTotalsFromResults.atp250 += 1;
      else if (category === 'slamClash') titleTotalsFromResults.slamClash += 1;
      addSurfaceCount(stats, result.tournament.surface);
      const key = tournamentKey(result.tournament);
      const current = stats.tournamentWins.get(key) ?? { count: 0, name: result.tournament.name ?? key };
      stats.tournamentWins.set(key, { ...current, count: current.count + 1 });
    }
    if (samePlayer(finalist, playerId)) stats.finalistRuns += 1;

    if (result?._slim) {
      for (const entry of result.matches ?? []) {
        if (entry?.w !== playerId && entry?.l !== playerId) continue;
        const opponentId = entry.w === playerId ? entry.l : entry.w;
        countMatch(playerId, opponentId, stats, entry, playersById);
      }
    } else {
      for (const round of result.bracket?.rounds ?? []) {
        for (const match of round ?? []) {
          if (!match?.winner || match?.isBye) continue;
          const a = match.playerA ?? match.player1;
          const b = match.playerB ?? match.player2;
          if (!samePlayer(a, playerId) && !samePlayer(b, playerId)) continue;
          const loser = match.loser ?? (samePlayer(a, match.winner) ? b : a);
          const opponent = samePlayer(a, playerId) ? b : a;
          countMatch(playerId, opponent?.id, stats, { ...match, loser }, playersById);
        }
      }
    }
  }

  stats.grandSlams = Math.max(titleTotalsFromProfile.grandSlams, titleTotalsFromResults.grandSlams);
  stats.masters = Math.max(titleTotalsFromProfile.masters, titleTotalsFromResults.masters);
  stats.finals = Math.max(titleTotalsFromProfile.finals, titleTotalsFromResults.finals);
  stats.atp500 = Math.max(titleTotalsFromProfile.atp500, titleTotalsFromResults.atp500);
  stats.atp250 = Math.max(titleTotalsFromProfile.atp250, titleTotalsFromResults.atp250);
  stats.slamClash = Math.max(titleTotalsFromProfile.slamClash, titleTotalsFromResults.slamClash);

  const careerTotal = Object.values(careerTitles).reduce((sum, value) => {
    if (typeof value === 'object') return sum + safeNumber(value?.gold);
    return sum + safeNumber(value);
  }, 0);
  stats.totalTitles = Math.max(careerTotal, countedTitlesFromResults, stats.grandSlams + stats.masters + stats.finals + stats.atp500 + stats.atp250 + stats.slamClash);

  const history = Array.isArray(player?._rankHistory) ? [...player._rankHistory] : [];
  history.sort((a, b) => safeNumber(a.year) - safeNumber(b.year));
  let prevRank = null;
  for (const entry of history) {
    const rank = safeNumber(entry.rank ?? entry.position, null);
    if (!rank) continue;
    if (rank === 1) stats.no1Years += 1;
    if (rank <= 10) stats.top10Years += 1;
    if (prevRank && prevRank > rank) stats.biggestRankClimb = Math.max(stats.biggestRankClimb, prevRank - rank);
    prevRank = rank;
  }

  return stats;
}

function badgeFromDef(def, stats) {
  const value = safeNumber(def.value(stats));
  let tierIndex = -1;
  for (let i = 0; i < def.thresholds.length; i += 1) {
    if (value >= def.thresholds[i]) tierIndex = i;
  }
  if (tierIndex < 0) return null;
  const tier = BADGE_TIER_META[TIER_ORDER[tierIndex]];
  const nextValue = def.thresholds[tierIndex + 1] ?? null;
  return {
    id: def.id,
    name: def.name,
    category: def.category,
    categoryLabel: CATEGORY_LABELS[def.category] ?? def.category,
    icon: def.icon,
    description: def.description,
    thresholds: def.thresholds,
    value,
    unit: def.unit,
    tier,
    tierIndex,
    nextValue,
    progress: nextValue ? Math.min(1, value / nextValue) : 1,
  };
}

function buildTournamentLegendBadges(stats) {
  const thresholds = [2, 4, 6, 9, 12];
  return [...stats.tournamentWins.entries()]
    .map(([key, item]) => badgeFromDef({
      id: `tournament_legend_${key}`,
      name: `Lenda de ${item.name}`,
      category: 'tournament',
      icon: 'L',
      description: `Venceu ${item.name} vezes suficientes para transformar o torneio em territorio proprio.`,
      thresholds,
      value: () => item.count,
      unit: `titulos em ${item.name}`,
    }, stats))
    .filter(Boolean);
}

export function getPlayerBadges(player, context = {}) {
  if (!player?.id) return [];
  const stats = buildStats(player, context);
  return [
    ...STATIC_BADGE_DEFS.map(def => badgeFromDef(def, stats)).filter(Boolean),
    ...buildTournamentLegendBadges(stats),
  ].sort((a, b) => {
    if (b.tierIndex !== a.tierIndex) return b.tierIndex - a.tierIndex;
    if (b.value !== a.value) return b.value - a.value;
    return a.name.localeCompare(b.name);
  });
}

export function getBadgeStats(player, context = {}) {
  return buildStats(player, context);
}

export function diffBadgeUnlocks(before = [], after = []) {
  const beforeMap = new Map((before ?? []).map(b => [b.id, b]));
  return (after ?? []).filter(badge => {
    const old = beforeMap.get(badge.id);
    return !old || (badge.tierIndex ?? -1) > (old.tierIndex ?? -1);
  });
}

export function generateBadgeNewsArticles({ player, unlocks = [], tournament = null, year = null } = {}) {
  if (!player?.id || !unlocks?.length) return [];
  return unlocks
    .filter(badge => badge.tierIndex >= 0)
    .slice(0, 2)
    .map(badge => ({
      id: `badge_${player.id}_${badge.id}_${badge.tier.id}_${year ?? 'y'}_${tournament?.id ?? 'circuit'}`,
      type: 'BADGE_UNLOCK',
      year,
      player,
      tournament,
      headline: `${player.name} desbloqueia ${badge.name} ${badge.tier.label}`,
      deck: `${badge.value} ${badge.unit}. A conquista agora aparece oficialmente na galeria de carreira.`,
      body: `${player.name} adicionou uma nova marca ao perfil: ${badge.name}, tier ${badge.tier.label}. ${badge.description}`,
      tags: ['badge', 'conquista', badge.categoryLabel, badge.tier.label],
      badge: {
        id: badge.id,
        name: badge.name,
        tier: badge.tier,
        value: badge.value,
        unit: badge.unit,
      },
      createdAt: Date.now(),
    }));
}
