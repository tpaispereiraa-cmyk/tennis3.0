/**
 * RankingSystem.js
 * ─────────────────────────────────────────────────────────────────
 * Sistema de ranking inspirado no ATP real.
 *
 * TOUR PRINCIPAL
 *   • Contagem: 18 melhores resultados dos últimos 12 meses (4 GS + 9 M1000
 *     são OBRIGATÓRIOS na contagem — entram mesmo com 0 pts se o jogador
 *     participou do tour naquele período)
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
    W: 100, F: 60, SF: 36, QF: 18, R16: 8, R32: 3, R64: 1,
  },
  FINALS: {
    W: 1500, F: 1000, SF: 500, RR_WIN: 200,
  },
  ATP_PROSPECTS: {
    // Draw 16: 8 diretos + 8 do qualify
    // R16 = perder na 1ª rodada
    W: 100, F: 60, SF: 36, QF: 18, R16: 8,
  },
  PROSPECTS_FINALS: {
    W: 200, F: 120, SF: 60, RR_WIN: 30,
  },
};

export function getPoints(category, round) {
  return TOURNAMENT_POINTS[category]?.[round] ?? 0;
}

// ═══════════════════════════════════════════════════════════════════
// CATEGORIAS OBRIGATÓRIAS NA CONTAGEM
// ═══════════════════════════════════════════════════════════════════

const MANDATORY_CATEGORIES = new Set(['GRAND_SLAM', 'MASTERS_1000']);
const RANKING_COUNT = 18; // Melhores X resultados contam

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
    mandatory:      MANDATORY_CATEGORIES.has(category),
  };

  if (isProspect) {
    if (!store.prospectResults[playerId]) store.prospectResults[playerId] = [];
    // Remove resultado anterior do mesmo torneio (ex: se houve recalculation)
    store.prospectResults[playerId] = store.prospectResults[playerId]
      .filter(r => !(r.tournamentId === id && r.season === season));
    store.prospectResults[playerId].push(entry);
  } else {
    if (!store.playerResults[playerId]) store.playerResults[playerId] = [];
    store.playerResults[playerId] = store.playerResults[playerId]
      .filter(r => !(r.tournamentId === id && r.season === season));
    store.playerResults[playerId].push(entry);
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
 * Calcula o total de pontos de um jogador seguindo as regras ATP:
 * - Obrigatórios (GS + M1000) entram todos
 * - Opcionais: melhor N resultados para completar RANKING_COUNT
 * - Total nunca usa mais de RANKING_COUNT entradas
 *
 * @param {ResultEntry[]} results
 * @returns {{ total: number, used: ResultEntry[] }}
 */
export function computePlayerPoints(results) {
  if (!results || results.length === 0) return { total: 0, used: [] };

  // Separa obrigatórios e opcionais (sem duplicar o mesmo torneio)
  const mandatoryByTournament = {};
  const optionalResults = [];

  for (const r of results) {
    if (r.mandatory) {
      // Mantém o melhor resultado obrigatório por torneio
      const prev = mandatoryByTournament[r.tournamentId];
      if (!prev || r.points > prev.points) {
        mandatoryByTournament[r.tournamentId] = r;
      }
    } else {
      optionalResults.push(r);
    }
  }

  const mandatory = Object.values(mandatoryByTournament);
  // Ordena opcionais por pontos desc para pegar os melhores
  const sortedOptionals = [...optionalResults].sort((a, b) => b.points - a.points);

  const slotsLeft = Math.max(0, RANKING_COUNT - mandatory.length);
  const usedOptionals = sortedOptionals.slice(0, slotsLeft);

  const used = [...mandatory, ...usedOptionals];
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

  entries.sort((a, b) => b.points - a.points || a.playerId.localeCompare(b.playerId));

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
/** @deprecated prospects removed — stub kept for backward compat */
export function computeProspectRanking(_store, _ids) { return []; }
export function resetProspectRanking(_store) {}

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
