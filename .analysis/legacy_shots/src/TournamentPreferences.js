/**
 * TournamentPreferences.js
 * ─────────────────────────────────────────────────────────────────
 * Sistema de preferências pessoais de torneio por jogador.
 *
 * Cada jogador possui um ranking ordenado de todos os torneios ATP 500
 * e ATP 250 do calendário. Esse ranking determina:
 *
 *   1. ESCOLHA DE TORNEIOS OPCIONAIS
 *      No início de cada temporada, planSeasonSchedule() analisa o
 *      calendário inteiro e reserva os melhores torneios respeitando
 *      todos os slots obrigatórios e opcionais. O jogador "pensa à frente":
 *      um clay player guarda seus slots opcionais para os 250s de saibro
 *      de Abril/Maio em vez de gastar tudo nos 250s de hard de Janeiro.
 *
 *   2. BÔNUS DE PERFORMANCE
 *      Top 1 (Torneio Favorito)  → +10% mental + +10% físico
 *      Top 2 (2º Favorito)       → +10% mental
 *      Top 3 (3º Favorito)       → +10% físico
 *
 * INTEGRAÇÃO NO GAME LOOP (como usar em game.js):
 * ─────────────────────────────────────────────────────────────────
 *
 *   // 1. No início de cada temporada, para cada jogador NPC:
 *   const playerSeasonPlans = {};
 *   for (const player of allPlayers) {
 *     migrateTournamentPreferences(player); // garante que tem preferências
 *     playerSeasonPlans[player.id] = planSeasonSchedule(player, CALENDAR);
 *   }
 *
 *   // 2. Ao montar o draw de cada torneio:
 *   const { mainDraw, qualifying } = selectTournamentPlayers(
 *     tournament, allPlayers, prospects, injuredSet,
 *     playerSeasonSlots,   // slots contadores (atualizado após cada torneio)
 *     playerSeasonPlans    // planos anuais (fixo na virada da temporada)
 *   );
 *
 *   // 3. O plano pode ser inspecionado para debug:
 *   const plan = playerSeasonPlans['PLAYER_ID'];
 *   console.log(plan.committedIds);   // Set de IDs planejados
 *   console.log(plan.totalCommitted); // número total de torneios no plano
 *   console.log(plan.budget);         // { mandatory500, optional500, ... }
 *
 * GERAÇÃO DE PREFERÊNCIAS
 *   As preferências são geradas proceduralmente baseadas em:
 *   - Superfície preferida do jogador (styleId → surface affinity)
 *   - Prestígio da categoria (500 > 250 levemente)
 *   - Ruído aleatório (personalidade individual)
 *
 * MIGRAÇÃO
 *   migrateTournamentPreferences(player) pode ser chamado em jogadores
 *   existentes que ainda não têm o campo tournamentPreferences.
 */

import { CALENDAR } from './TournamentSystem.js';

// ═══════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════

// Torneios elegíveis para preferência (apenas ATP 500 e ATP 250)
export const PREFERENCE_CATEGORIES = new Set(['ATP_500', 'ATP_250']);

// IDs dos torneios 500 e 250 do calendário (ordem fixa)
export const PREFERABLE_TOURNAMENTS = CALENDAR.filter(
  t => PREFERENCE_CATEGORIES.has(t.category)
).map(t => ({ id: t.id, name: t.name, category: t.category, surface: t.surface, month: t.month }));

// Índice por posição no ranking de preferência → bônus aplicado
export const PREFERENCE_BONUS = {
  0: { mental: 0.10, physical: 0.10, label: '❤️ Favorito',      color: '#FFD700' },
  1: { mental: 0.10, physical: 0.00, label: '💙 2º Favorito',   color: '#87CEEB' },
  2: { mental: 0.00, physical: 0.10, label: '💚 3º Favorito',   color: '#90EE90' },
};

// Afinidade de superfície por estilo de jogo
const STYLE_SURFACE_AFFINITY = {
  AGG_BASELINER:  { CLAY: 1.8, HARD: 1.2, GRASS: 0.6, INDOOR: 1.0 },
  CTR_PUNCHER:    { CLAY: 2.0, HARD: 1.0, GRASS: 0.5, INDOOR: 0.9 },
  ALL_COURT:      { CLAY: 1.0, HARD: 1.2, GRASS: 1.1, INDOOR: 1.1 },
  SRV_VOL:        { CLAY: 0.5, HARD: 1.1, GRASS: 2.2, INDOOR: 1.4 },
  BIG_SERVER:     { CLAY: 0.6, HARD: 1.3, GRASS: 2.0, INDOOR: 1.5 },
  RETRIEVER:      { CLAY: 1.9, HARD: 1.1, GRASS: 0.7, INDOOR: 0.9 },
  TAKEALLRISK:    { CLAY: 1.0, HARD: 1.4, GRASS: 1.3, INDOOR: 1.2 },
};

// Leve boost para 500s (prestígio > 250)
const CATEGORY_PRESTIGE = { ATP_500: 1.15, ATP_250: 1.00 };

// ═══════════════════════════════════════════════════════════════════
// GERAÇÃO DE PREFERÊNCIAS
// ═══════════════════════════════════════════════════════════════════

/**
 * Gera um ranking completo de preferências de torneio para um jogador.
 * Retorna array de IDs de torneio ordenados do mais para o menos preferido.
 *
 * @param {object} player  Objeto do jogador (com styleId, potential)
 * @returns {string[]}     Array de tournamentIds ordenado por preferência
 */
export function generateTournamentPreferences(player) {
  const affinity = STYLE_SURFACE_AFFINITY[player.styleId] ?? STYLE_SURFACE_AFFINITY.ALL_COURT;

  // Calcula score para cada torneio elegível
  const scored = PREFERABLE_TOURNAMENTS.map(t => {
    const surfaceScore  = affinity[t.surface] ?? 1.0;
    const prestigeScore = CATEGORY_PRESTIGE[t.category] ?? 1.0;
    const noise         = 0.6 + Math.random() * 0.8; // ruído [0.6, 1.4]

    return {
      id:    t.id,
      score: surfaceScore * prestigeScore * noise,
    };
  });

  // Ordena do maior para o menor score
  scored.sort((a, b) => b.score - a.score);

  return scored.map(s => s.id);
}

/**
 * Migra um jogador existente que ainda não tem tournamentPreferences.
 * Seguro chamar em qualquer jogador — não sobrescreve se já existir.
 *
 * @param {object} player  Objeto do jogador (mutado in-place)
 * @returns {object}       O mesmo player
 */
export function migrateTournamentPreferences(player) {
  if (!player.tournamentPreferences) {
    player.tournamentPreferences = generateTournamentPreferences(player);
  }
  return player;
}

/**
 * Migra uma coleção inteira de jogadores (ex: NAMED_PLAYERS).
 *
 * @param {object} playersMap  { id → player }
 */
export function migrateAllPlayers(playersMap) {
  for (const player of Object.values(playersMap)) {
    migrateTournamentPreferences(player);
  }
}

// ═══════════════════════════════════════════════════════════════════
// CONSULTA DE PREFERÊNCIAS
// ═══════════════════════════════════════════════════════════════════

/**
 * Retorna a posição de um torneio no ranking de preferências do jogador.
 * 0 = favorito absoluto. -1 = torneio não encontrado (não é 500/250).
 *
 * @param {object} player        Objeto do jogador
 * @param {string} tournamentId  ID do torneio
 * @returns {number}
 */
export function getPreferenceRank(player, tournamentId) {
  return player.tournamentPreferences?.indexOf(tournamentId) ?? -1;
}

/**
 * Retorna o bônus de performance para um jogador num torneio específico.
 * Retorna { mental: 0, physical: 0 } se não houver bônus.
 *
 * @param {object} player        Objeto do jogador
 * @param {string} tournamentId  ID do torneio
 * @returns {{ mental: number, physical: number, label?: string, color?: string }}
 */
export function getTournamentBonus(player, tournamentId) {
  const rank = getPreferenceRank(player, tournamentId);
  return PREFERENCE_BONUS[rank] ?? { mental: 0, physical: 0 };
}

/**
 * Retorna os 3 torneios favoritos do jogador com seus dados completos.
 *
 * @param {object} player  Objeto do jogador
 * @returns {Array<{ rank: number, tournament: object, bonus: object }>}
 */
export function getTopFavoriteTournaments(player) {
  const prefs = player.tournamentPreferences ?? [];
  return [0, 1, 2]
    .map(rank => {
      const id = prefs[rank];
      const tournament = PREFERABLE_TOURNAMENTS.find(t => t.id === id);
      return tournament ? { rank, tournament, bonus: PREFERENCE_BONUS[rank] } : null;
    })
    .filter(Boolean);
}

/**
 * Retorna os 3 torneios menos preferidos do jogador.
 *
 * @param {object} player  Objeto do jogador
 * @returns {Array<{ rank: number, tournament: object }>}
 */
export function getBottomTournaments(player) {
  const prefs = player.tournamentPreferences ?? [];
  const total = prefs.length;
  return [total - 1, total - 2, total - 3]
    .filter(i => i >= 0)
    .map(rank => {
      const id = prefs[rank];
      const tournament = PREFERABLE_TOURNAMENTS.find(t => t.id === id);
      return tournament ? { rank, tournament } : null;
    })
    .filter(Boolean);
}

// ═══════════════════════════════════════════════════════════════════
// INTEGRAÇÃO COM SEASONSLOTS — PLANEJAMENTO ANTECIPADO
// ═══════════════════════════════════════════════════════════════════

/**
 * SLOT BUDGETS por faixa de ranking.
 * Define quantos torneios obrigatórios e opcionais cada jogador tem por categoria.
 */
function getSlotBudget(rank) {
  return {
    mandatory500: rank <= 10 ? 4 : rank <= 30 ? 3 : rank <= 60 ? 2 : rank <= 100 ? 1 : 0,
    optional500:  2,   // reduzido de 3 — top players ficavam em 7/9 ATP500, excessivo
    mandatory250: rank <= 10 ? 1 : rank <= 30 ? 1 : rank <= 60 ? 2 : rank <= 100 ? 3 : 4,
    optional250:  2,
  };
}

// Cap total de torneios por faixa de ranking (GS + Masters + 500 + 250 + ATP100)
// Impede que jogadores de rank médio joguem mais torneios que o top-10.
function getMaxEvents(rank) {
  if (rank <= 10)  return 22;
  if (rank <= 30)  return 21;
  if (rank <= 60)  return 20;
  if (rank <= 100) return 19;
  if (rank <= 128) return 18;
  return 15;
}

/**
 * planSeasonSchedule — O coração do sistema de inteligência.
 *
 * Roda UMA VEZ no início de cada temporada para cada jogador NPC.
 * Olha o calendário completo e decide antecipadamente quais torneios
 * opcionais jogar, maximizando preferências pessoais.
 *
 * ALGORITMO:
 *   1. Separa torneios obrigatórios (GS, M1000, ATP500/250 mandatory) dos opcionais
 *   2. Para os mandatórios: todos entram automaticamente no plano
 *   3. Para os opcionais (500 e 250 separadamente):
 *      a. Filtra torneios que o jogador gosta (top metade das preferências)
 *      b. Ordena pelo score de preferência (posição no ranking)
 *      c. Pega os N melhores respeitando o budget de slots opcionais
 *   4. Retorna um Set de IDs comprometidos para consulta rápida
 *
 * RESULTADO:
 *   Um jogador clay player com 2 slots opcionais de 250 vai reservar
 *   os 2 melhores 250s de saibro do calendário — mesmo que sejam em Maio —
 *   e ignorar os 250s de hard de Janeiro/Fevereiro.
 *
 * @param {object}   player    Objeto do jogador (com rankPosition, tournamentPreferences)
 * @param {object[]} calendar  Array de torneios (CALENDAR)
 * @param {Set}      [injured] IDs de torneios para ignorar (opcional)
 * @returns {SeasonPlan}
 */
export function planSeasonSchedule(player, calendar, injured = new Set()) {
  const rank   = player.rankPosition ?? 999;
  const budget = getSlotBudget(rank);
  const prefs  = player.tournamentPreferences ?? [];

  // Torneios jogáveis (sem lesão, sem Finals/Prospects que têm acesso próprio)
  const playable = calendar.filter(t =>
    !injured.has(t.id) &&
    !t.isFinals &&
    !t.isProspects
  );

  // ── 1. Torneios sempre obrigatórios ──────────────────────────
  const committed = new Set();

  // GS: sempre
  playable.filter(t => t.isSlam).forEach(t => committed.add(t.id));

  // Masters: sempre (até rank 128; acima disso não aparece no draw mas sem lesão entra)
  if (rank <= 128) {
    playable.filter(t => t.isMasters).forEach(t => committed.add(t.id));
  }

  // ATP 100: rank > 50 entra em todos (sem slot, sem limite)
  if (rank > 50) {
    playable.filter(t => t.isATP100).forEach(t => committed.add(t.id));
  }

  // ── 2. ATP 500 obrigatórios ───────────────────────────────────
  // Os N primeiros 500s do calendário que o jogador tem obrigação
  // são automaticamente incluídos (em ordem cronológica)
  const all500 = playable.filter(t => t.category === 'ATP_500');

  // Para obrigatórios: inclui por ordem de PREFERÊNCIA (não cronológica).
  // Um jogador clay que tem 4 obrigatórios vai preferir os 500s de clay,
  // mas se não tiver 4 de clay, completa com os demais.
  const sorted500ByPref = [...all500].sort((a, b) => {
    const ra = prefs.indexOf(a.id); const rb = prefs.indexOf(b.id);
    const sa = ra === -1 ? 999 : ra;
    const sb = rb === -1 ? 999 : rb;
    return sa - sb;
  });

  // Obrigatórios: pega os N melhores
  sorted500ByPref.slice(0, budget.mandatory500).forEach(t => committed.add(t.id));

  // Opcionais: dos restantes, pega os M melhores que o jogador gosta
  const remaining500 = sorted500ByPref.filter(t => !committed.has(t.id));
  const optional500Picks = _pickOptionals(remaining500, prefs, budget.optional500);
  optional500Picks.forEach(id => committed.add(id));

  // ── 3. ATP 250 obrigatórios e opcionais ───────────────────────
  const all250 = playable.filter(t => t.category === 'ATP_250');

  const sorted250ByPref = [...all250].sort((a, b) => {
    const ra = prefs.indexOf(a.id); const rb = prefs.indexOf(b.id);
    const sa = ra === -1 ? 999 : ra;
    const sb = rb === -1 ? 999 : rb;
    return sa - sb;
  });

  sorted250ByPref.slice(0, budget.mandatory250).forEach(t => committed.add(t.id));

  const remaining250 = sorted250ByPref.filter(t => !committed.has(t.id));
  const optional250Picks = _pickOptionals(remaining250, prefs, budget.optional250);
  optional250Picks.forEach(id => committed.add(id));

  // ── 4. Aplicar cap total de torneios ─────────────────────────
  // Sem cap, jogadores de rank médio acumulavam 27-29 torneios/ano
  // (mais que o top-10). Remove os opcionais menos preferidos até atingir o limite.
  const maxEv = getMaxEvents(rank);
  if (committed.size > maxEv) {
    // Identifica torneios obrigatórios (GS, Masters, ATP100) — nunca removidos
    const hardMandatory = new Set(
      playable
        .filter(t => t.isSlam || t.isMasters || t.isATP100)
        .map(t => t.id)
    );
    // Remove opcionais em ordem inversa de preferência até atingir o cap
    const optionals = [...committed].filter(id => !hardMandatory.has(id));
    // Ordena pelos menos preferidos (maior índice = menos preferido)
    optionals.sort((a, b) => {
      const ra = prefs.indexOf(a); const rb = prefs.indexOf(b);
      const sa = ra === -1 ? 9999 : ra;
      const sb = rb === -1 ? 9999 : rb;
      return sb - sa; // descending — menos preferido primeiro
    });
    let excess = committed.size - maxEv;
    for (const id of optionals) {
      if (excess <= 0) break;
      committed.delete(id);
      excess--;
    }
  }

  // ── 5. Montar plano final ──────────────────────────────────────
  return {
    committedIds: committed,

    // Metadados para debug e exibição
    rank,
    budget,
    totalCommitted: committed.size,

    // Verifica rapidamente se um torneio está no plano
    has(tournamentId) {
      return this.committedIds.has(tournamentId);
    },
  };
}

/**
 * Seleciona os melhores torneios opcionais de uma lista, respeitando
 * a ordem de preferência do jogador e o budget disponível.
 * Jogador não escolhe torneios da metade inferior da sua lista.
 *
 * @param {object[]} candidates  Torneios candidatos (já ordenados por preferência)
 * @param {string[]} prefs       Lista de preferências do jogador
 * @param {number}   budget      Número máximo de opcionais a escolher
 * @returns {string[]}           IDs dos torneios escolhidos
 */
function _pickOptionals(candidates, prefs, budget) {
  if (budget <= 0 || !candidates.length) return [];

  // Determina o midpoint da categoria para rejeitar os que o jogador odeia
  // Usa a posição relativa dentro dos candidatos da mesma categoria
  const catIds = candidates.map(t => t.id);
  const catPrefs = prefs.filter(id => catIds.includes(id));
  const midpoint  = Math.floor(catPrefs.length / 2);

  // Filtra apenas os que estão na metade boa
  const acceptable = candidates.filter(t => {
    const catRank = catPrefs.indexOf(t.id);
    return catRank === -1 || catRank < midpoint;
  });

  // Já estão ordenados por preferência — pega os N melhores
  return acceptable.slice(0, budget).map(t => t.id);
}

/**
 * Dado um plano de temporada, verifica se o jogador deve entrar num torneio.
 * Substitui wantsToEnterOptional para uso com planejamento antecipado.
 *
 * @param {SeasonPlan} plan        Retorno de planSeasonSchedule
 * @param {string}     tournamentId
 * @returns {boolean}
 */
export function isInSeasonPlan(plan, tournamentId) {
  return plan?.committedIds?.has(tournamentId) ?? false;
}

/**
 * Compatibilidade retroativa — usado quando não há plano pré-computado.
 * Avalia torneio a torneio sem visão de futuro (comportamento legado).
 * Mantido para casos onde planSeasonSchedule não foi chamado ainda.
 *
 * @param {object} player      Objeto do jogador
 * @param {object} tournament  Definição do torneio
 * @returns {boolean}
 */
export function wantsToEnterOptional(player, tournament) {
  const prefs = player.tournamentPreferences;
  // Sem preferências definidas: entra apenas nos 50% iniciais do calendário da categoria
  // (antes retornava true para tudo → preenchimento máximo sempre)
  if (!prefs || !prefs.length) {
    const catTourneys = PREFERABLE_TOURNAMENTS.filter(t => t.category === tournament.category);
    const idx = catTourneys.findIndex(t => t.id === tournament.id);
    return idx !== -1 && idx < Math.ceil(catTourneys.length / 2);
  }

  const rank = prefs.indexOf(tournament.id);
  // Torneio fora da lista de preferências: não entra (era true antes — entrava em tudo)
  if (rank === -1) return false;

  const catIds   = PREFERABLE_TOURNAMENTS.filter(t => t.category === tournament.category).map(t => t.id);
  const catPrefs = prefs.filter(id => catIds.includes(id));
  const catRank  = catPrefs.indexOf(tournament.id);
  const midpoint = Math.floor(catPrefs.length / 2);

  return catRank < midpoint;
}

