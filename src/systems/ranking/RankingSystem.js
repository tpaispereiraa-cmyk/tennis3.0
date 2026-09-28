/**
 * RankingSystem.js
 * ─────────────────────────────────────────────────────────────────
 * Sistema de ranking inspirado no ATP real.
 *
 * TOUR PRINCIPAL
 *   • Contagem: 18 resultados nos últimos 12 meses, calibrados para o
 *     calendário do jogo: 6 Grand Slams entram sempre, os 8 melhores Masters
 *     entram em seguida e os 4 melhores resultados restantes fecham a conta.
 *     Assim, Finals, Slam Clash e ATP 500 podem realmente valer uma temporada.
 *   • Defesa de pontos: na semana do mesmo torneio no ano seguinte,
 *     os pontos do ano anterior expiram automaticamente
 *   • Pontos de qualifying CONTAM para o ranking, com valores reduzidos.
 *     Isso cria mobilidade gradual para novatos e jogadores em ascensão.
 *
 * ATP 100
 *   • Categoria exclusiva para jogadores fora do top 50 (rankPosition > 50)
 *   • Draw de 32 | 5 torneios por temporada
 *   • Ponte entre o qualifying e o circuito principal (ATP 250+)
 *
 * PROSPECTS
 *   • Ranking simplificado: soma total de todos os pontos ganhos na temporada
 *   • Sem defesa de pontos, sem limite de torneios
 *   • Reseta a cada temporada
 *
 * ESTRUTURA DE DADOS
 *   RankingEntry {
 *     playerId:    string
 *     points:      number   (total de pontos ativos)
 *     position:    number   (posição no ranking — calculada ao ordenar)
 *     results:     ResultEntry[]   (resultados individuais ativos)
 *   }
 *
 *   ResultEntry {
 *     tournamentId:  string
 *     tournamentName:string
 *     category:      'GRAND_SLAM' | 'MASTERS_1000' | 'ATP_500' | 'ATP_250' | 'ATP_100' | 'FINALS'
 *     points:        number
 *     round:         string   (ex: 'W', 'F', 'SF', 'QF', 'R16', 'R32', 'R64', 'Q')
 *     season:        number   (ano)
 *     weekIndex:     number   (índice do torneio no calendário — para defesa)
 *     mandatory:     boolean  (GS e M1000 são obrigatórios)
 *   }
 */

// ═══════════════════════════════════════════════════════════════════
// TABELAS DE PONTOS
// ═══════════════════════════════════════════════════════════════════

export const TOURNAMENT_POINTS = {
  GRAND_SLAM: {
    // Draw 128 — tabela oficial ATP 2024
    // R128 = perder na 1ª rodada | Q = bonus ao qualifier que entra no MD
    W: 2000, F: 1300, SF: 800, QF: 400, R16: 200, R32: 100, R64: 50, R128: 10, Q: 30,
  },
  SLAM_CLASH: {
    W: 1250, F: 800, SF: 480, QF: 240, R16: 120, R32: 60, R64: 30, R128: 15,
  },
  MASTERS_1000: {
    // Draw 64 (jogo usa 64 vs 96 real — R16 existe aqui como 3ª rodada)
    // Valores calibrados proporcionalmente ao draw menor
    W: 1000, F: 650, SF: 400, QF: 200, R16: 100, R32: 60, R64: 30, Q: 20, PQ: 10,
  },
  ATP_500: {
    // Draw 32 — tabela oficial ATP 2024 (32D)
    // REGRA ATP: perder na 1ª rodada (R32) DÁ pontos no ATP 500 (só o 250 que não dá)
    W: 500, F: 330, SF: 200, QF: 100, R16: 50, R32: 25, Q: 20,
  },
  ATP_250: {
    // Draw 32 — tabela oficial ATP 2024 (32D)
    // REGRA ATP: sem pontos para derrota na 1ª rodada (R32 = 0) — correto para 250
    W: 250, F: 165, SF: 100, QF: 50, R16: 25, R32: 0, Q: 13,
  },
  ATP_100: {
    // Draw 64: ranks 65-128, sem qualifying
    // R64 = perder na 1ª rodada
    W: 100, F: 60, SF: 36, QF: 18, R16: 8, R32: 3, R64: 1, R128: 0,
  },
  ATP_75: {
    W: 75, F: 45, SF: 25, QF: 12, R16: 5, R32: 2, R64: 1, R128: 0,
  },
  ATP_50: {
    W: 50, F: 30, SF: 18, QF: 9, R16: 4, R32: 2, R64: 1, R128: 0,
  },
  ATP_25: {
    W: 25, F: 15, SF: 8, QF: 4, R16: 2, R32: 1,
  },
  FINALS: {
    // O modo Universo usa chave eliminatória de 8 (não round robin).
    // QF evita que quatro classificados para o torneio de elite saiam zerados.
    W: 1500, F: 1000, SF: 500, QF: 250,
  },
  ATP_PROSPECTS: {
    // Draw 16: 8 diretos + 8 do qualify
    // R16 = perder na 1ª rodada
    W: 100, F: 60, SF: 36, QF: 18, R16: 8, R32: 3, R64: 1,
  },
  JUNIOR_50: { W: 50, F: 30, SF: 18, QF: 9, R16: 4, R32: 1 },
  JUNIOR_100: { W: 100, F: 60, SF: 36, QF: 18, R16: 8, R32: 3, R64: 1 },
  JUNIOR_SLAM: { W: 500, F: 300, SF: 180, QF: 90, R16: 45, R32: 20, R64: 8 },
  PROSPECTS_FINALS: {
    W: 200, F: 120, SF: 60, QF: 30,
  },
};

export function getPoints(category, round) {
  return TOURNAMENT_POINTS[category]?.[round] ?? 0;
}

// ═══════════════════════════════════════════════════════════════════
// CATEGORIAS OBRIGATÓRIAS NA CONTAGEM
// ═══════════════════════════════════════════════════════════════════

const GRAND_SLAM_CATEGORY = 'GRAND_SLAM';
const MASTERS_CATEGORY = 'MASTERS_1000';
export const RANKING_COUNT = 18;
export const RANKING_MASTERS_SLOTS = 8;

// ═══════════════════════════════════════════════════════════════════
// RANKING STORE
// ═══════════════════════════════════════════════════════════════════

/**
 * Cria um store de ranking vazio.
 * @returns {RankingStore}
 */
export function createRankingStore() {
  return {
    // playerId → ResultEntry[]
    playerResults: {},
    // Cache ordenado — recalculado em computeRanking()
    ranked: [],
    // Ordem de seed usada somente para desempatar jogadores com a mesma
    // pontuação. Assim, uma temporada que começa em 0 mantém a ordem de
    // entrada até que os resultados em quadra passem a separá-los.
    seedOrder: {},
    // Prospects
    prospectResults: {},
    prospectRanked: [],
  };
}

/**
 * Registra o resultado de um jogador num torneio.
 *
 * @param {RankingStore} store
 * @param {string}       playerId
 * @param {object}       tournamentInfo   { id, name, category, weekIndex, season }
 * @param {string}       round            'W' | 'F' | 'SF' | 'QF' | 'R16' | 'R32' | 'R64' | 'Q'
 * @param {boolean}      [isProspect=false]
 */
export function registerResult(store, playerId, tournamentInfo, round, isProspect = false) {
  const { id, name, category, weekIndex, season } = tournamentInfo;
  const pts = getPoints(category, round);

  const entry = {
    tournamentId:   id,
    tournamentName: name,
    category,
    points:         pts,
    round,
    season,
    weekIndex,
    // Mantido no save/export para leitura; a seleção real é feita em
    // computePlayerPoints, onde Masters têm 8 vagas e não 12 vagas forçadas.
    mandatory:      category === GRAND_SLAM_CATEGORY,
  };

  if (isProspect) {
    if (!store.prospectResults[playerId]) store.prospectResults[playerId] = [];
    const prev = store.prospectResults[playerId]
      .find(r => r.tournamentId === id && r.season === season);
    store.prospectResults[playerId] = store.prospectResults[playerId]
      .filter(r => !(r.tournamentId === id && r.season === season));
    store.prospectResults[playerId].push(prev
      ? {
          ...entry,
          // Mesmo torneio não pode inflar o ranking se for reaplicado.
          points: Math.max(prev.points ?? 0, entry.points),
          round: entry.points >= (prev.points ?? 0) ? entry.round : prev.round,
          mandatory: prev.mandatory || entry.mandatory,
        }
      : entry);
  } else {
    if (!store.playerResults[playerId]) store.playerResults[playerId] = [];
    const prev = store.playerResults[playerId]
      .find(r => r.tournamentId === id && r.season === season);
    store.playerResults[playerId] = store.playerResults[playerId]
      .filter(r => !(r.tournamentId === id && r.season === season));
    store.playerResults[playerId].push(prev
      ? {
          ...entry,
          // Mesmo torneio não pode inflar o ranking se for reaplicado.
          points: Math.max(prev.points ?? 0, entry.points),
          round: entry.points >= (prev.points ?? 0) ? entry.round : prev.round,
          mandatory: prev.mandatory || entry.mandatory,
        }
      : entry);
  }
}

/**
 * Aplica a defesa de pontos para uma nova temporada.
 * Remove resultados com season < (currentSeason - 1) e "expira"
 * os resultados da temporada anterior que já passaram no calendário atual.
 *
 * @param {RankingStore} store
 * @param {number}       currentSeason
 * @param {number}       currentWeekIndex   índice do torneio atual no calendário
 */
export function applyPointsDefense(store, currentSeason, currentWeekIndex) {
  const cutoffSeason = currentSeason - 1;

  for (const playerId of Object.keys(store.playerResults)) {
    store.playerResults[playerId] = store.playerResults[playerId].filter(r => {
      // Remove resultados de mais de 1 ano atrás
      if (r.season < cutoffSeason) return false;
      // Remove resultados do ano anterior que já foram "jogados" neste ano
      if (r.season === cutoffSeason && r.weekIndex <= currentWeekIndex) return false;
      return true;
    });
  }
}

/**
 * Calcula o total de pontos do ranking do Universo:
 * - Os Grand Slams ativos entram todos (o calendário tem 6)
 * - Os 8 melhores Masters entram em seguida (há 12 no calendário)
 * - As vagas restantes são os melhores resultados de qualquer outra categoria
 *   — inclusive Finals, Slam Clash, ATP 500 e Masters que sobraram.
 * - Total nunca usa mais de RANKING_COUNT entradas
 *
 * @param {ResultEntry[]} results
 * @returns {{ total: number, used: ResultEntry[] }}
 */
export function computePlayerPoints(results) {
  if (!results || results.length === 0) return { total: 0, used: [] };

  // Mantém só a melhor entrada de cada torneio. É uma proteção extra contra
  // replays/importações de saves além da proteção já feita em registerResult.
  const bestByTournament = {};

  for (const r of results) {
    const key = `${r.tournamentId}|${r.season}`;
    const prev = bestByTournament[key];
    if (!prev || (r.points ?? 0) > (prev.points ?? 0)) bestByTournament[key] = r;
  }

  const unique = Object.values(bestByTournament);
  const slams = unique.filter(r => r.category === GRAND_SLAM_CATEGORY);
  const masters = unique
    .filter(r => r.category === MASTERS_CATEGORY)
    .sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  const selectedMasters = masters.slice(0, RANKING_MASTERS_SLOTS);
  const selectedKeys = new Set([...slams, ...selectedMasters].map(r => `${r.tournamentId}|${r.season}`));
  const optionalResults = unique
    .filter(r => !selectedKeys.has(`${r.tournamentId}|${r.season}`))
    .sort((a, b) => (b.points ?? 0) - (a.points ?? 0));

  const slotsLeft = Math.max(0, RANKING_COUNT - slams.length - selectedMasters.length);
  const usedOptionals = optionalResults.slice(0, slotsLeft);

  const used = [...slams, ...selectedMasters, ...usedOptionals];
  const total = used.reduce((s, r) => s + r.points, 0);

  return { total, used };
}

/**
 * Calcula e retorna o ranking ordenado do tour principal.
 * Atualiza store.ranked com o resultado.
 *
 * @param {RankingStore} store
 * @param {string[]}     allPlayerIds   lista de todos os jogadores do tour
 * @returns {RankedPlayer[]}
 */
export function computeRanking(store, allPlayerIds) {
  const entries = allPlayerIds.map(playerId => {
    const results = store.playerResults[playerId] || [];
    const { total, used } = computePlayerPoints(results);
    return { playerId, points: total, used };
  });

  entries.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const seedA = store.seedOrder?.[a.playerId] ?? Number.MAX_SAFE_INTEGER;
    const seedB = store.seedOrder?.[b.playerId] ?? Number.MAX_SAFE_INTEGER;
    return seedA - seedB || a.playerId.localeCompare(b.playerId);
  });

  const ranked = entries.map((e, i) => ({
    ...e,
    position: i + 1,
  }));

  store.ranked = ranked;
  return ranked;
}

/**
 * Calcula e retorna o ranking de Prospects.
 * Simples: soma total de pontos na temporada.
 *
 * @param {RankingStore} store
 * @param {string[]}     allProspectIds
 * @returns {RankedPlayer[]}
 */
export function computeProspectRanking(store, allProspectIds) {
  const ids = [...(allProspectIds ?? [])];
  const entries = ids.map(playerId => {
    const results = store.prospectResults[playerId] || [];
    const total = results.reduce((sum, r) => sum + (r.points ?? 0), 0);
    return { playerId, points: total, used: results };
  });

  entries.sort((a, b) => b.points - a.points || a.playerId.localeCompare(b.playerId));

  const ranked = entries.map((e, i) => ({
    ...e,
    position: i + 1,
  }));

  store.prospectRanked = ranked;
  return ranked;
}

export function resetProspectRanking(store) {
  store.prospectResults = {};
  store.prospectRanked = [];
}

/**
 * Retorna a posição de um jogador no ranking atual.
 * @returns {number} posição (1-based) ou 9999 se não encontrado
 */
export function getPlayerRank(store, playerId) {
  const list = store.ranked;
  const entry = list.find(e => e.playerId === playerId);
  return entry ? entry.position : 9999;
}

/**
 * Retorna os pontos de um jogador no ranking.
 */
export function getPlayerPoints(store, playerId) {
  const list = store.ranked;
  const entry = list.find(e => e.playerId === playerId);
  return entry ? entry.points : 0;
}

/**
 * Retorna os IDs dos top N jogadores do ranking.
 */
export function getTopN(store, n) {
  const list = store.ranked;
  return list.slice(0, n).map(e => e.playerId);
}

