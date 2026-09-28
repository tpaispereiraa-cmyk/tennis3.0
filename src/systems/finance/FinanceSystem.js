/**
 * FinanceSystem.js — Fase 1 da Camada Financeira
 *
 * Implementa:
 *   1. Prize money por categoria/rodada
 *   2. Custos fixos e variáveis (fisio, viagem, equipamento)
 *   3. Finance object no perfil do jogador
 *   4. Acumulação de earnings por temporada e carreira
 *   5. Budget como pressão de gameplay
 *
 * Exports principais:
 *   PRIZE_MONEY                      — tabela completa
 *   getPrizeMoney(category, round)   — valor de uma rodada
 *   getTournamentCosts(tournament)   — custos de participar de um torneio
 *   initPlayerFinance(player)        — garante que o objeto finance existe
 *   awardPrizeMoney(player, category, round, season) → player
 *   processMonthlyFinances(player, season, monthIndex) → { player, summary }
 *   processYearEndFinances(player, season) → { player, summary }
 *   getFinancialPressure(player)     → { level, label, color }
 */

// ── Prize Money por categoria e rodada (USD) ────────────────────────────────
export const PRIZE_MONEY = {
  GRAND_SLAM: {
    W: 2_400_000, F: 1_200_000, SF: 600_000, QF: 300_000,
    R16: 150_000, R32: 80_000, R64: 50_000, R128: 30_000,
    Q: 15_000, PQ: 8_000,
  },
  SLAM_CLASH: {
    W: 1_600_000, F: 800_000, SF: 400_000, QF: 200_000,
    R16: 100_000, R32: 55_000, R64: 30_000, R128: 18_000,
  },
  MASTERS_1000: {
    W: 1_000_000, F: 500_000, SF: 250_000, QF: 125_000,
    R16: 65_000, R32: 35_000, R64: 20_000,
    Q: 10_000, PQ: 5_000,
  },
  ATP_500: {
    W: 400_000, F: 200_000, SF: 100_000, QF: 50_000,
    R16: 25_000, R32: 8_000,
    Q: 4_000,
  },
  ATP_250: {
    W: 150_000, F: 75_000, SF: 37_000, QF: 18_000,
    R16: 9_000, R32: 4_000,
    Q: 2_000,
  },
  ATP_100: {
    W: 50_000, F: 25_000, SF: 12_000, QF: 6_000,
    R16: 3_000, R32: 1_000, R64: 400,
  },
  FINALS: {
    W: 1_500_000, F: 900_000, SF: 450_000, RR_WIN: 100_000,
  },
  ATP_PROSPECTS: {
    W: 15_000, F: 8_000, SF: 4_000, QF: 2_000, R16: 800,
  },
  PROSPECTS_FINALS: {
    W: 30_000, F: 15_000, SF: 7_000, RR_WIN: 2_000,
  },
};

/**
 * Retorna o prize money para uma categoria/rodada.
 * @param {string} category — ex: 'GRAND_SLAM'
 * @param {string} round    — ex: 'W', 'F', 'SF', 'QF', 'R16'...
 * @returns {number} USD
 */
export function getPrizeMoney(category, round) {
  return PRIZE_MONEY[category]?.[round] ?? 0;
}

// ── Custos de torneio por categoria ─────────────────────────────────────────
// Inclui viagem + hospedagem (escala com prestígio)
const TOURNAMENT_TRAVEL_COSTS = {
  GRAND_SLAM:    12_000,
  SLAM_CLASH:    10_000,
  MASTERS_1000:  8_000,
  ATP_500:       5_000,
  ATP_250:       3_000,
  ATP_100:       2_000,
  FINALS:        10_000,
  ATP_PROSPECTS: 1_500,
  PROSPECTS_FINALS: 2_500,
};

/**
 * Custo de viagem/hospedagem por torneio.
 */
export function getTournamentCosts(tournament) {
  const category = tournament?.category ?? 'ATP_250';
  return TOURNAMENT_TRAVEL_COSTS[category] ?? 3_000;
}

// ── Custos anuais fixos ──────────────────────────────────────────────────────
/**
 * Calcula todos os custos anuais de um jogador.
 * @returns {{ equipment: number, physio: number, prepFisico: number, total: number }}
 */
export function computeAnnualCosts(player) {
  // Equipamentos: escala com ranking (melhores jogadores usam mais)
  const rank = player.rankPosition ?? 200;
  const equipment = rank <= 10  ? 8_000
    : rank <= 50  ? 6_000
    : rank <= 100 ? 4_500
    :               3_000;

  // Physio: ~12 torneios por ano por padrão, proporcional à atividade
  const tournamentsPlayed = player.finance?.tournamentsThisSeason ?? 12;
  const physioPerTournament = rank <= 20 ? 4_000 : rank <= 100 ? 2_500 : 1_200;
  const physio = physioPerTournament * Math.min(tournamentsThisSeason(player), 20);

  // Preparador físico básico: custo estrutural próprio, sem depender de treinador.
  const prepFisico = rank <= 20 ? 15_000 : rank <= 100 ? 8_000 : rank <= 200 ? 4_000 : 0;

  const total = equipment + physio + prepFisico;
  return { equipment, physio, prepFisico, total };
}

function tournamentsThisSeason(player) {
  return player.finance?.tournamentsThisSeason ?? 12;
}

// ── Inicialização do objeto finance ─────────────────────────────────────────
/**
 * Garante que player.finance existe com todos os campos necessários.
 * Seguro chamar múltiplas vezes (idempotente).
 */
export function initPlayerFinance(player) {
  if (player.finance) {
    // Migração: garante novos campos
    player.finance.earningsBySeason   = player.finance.earningsBySeason   ?? {};
    player.finance.costsBySeason      = player.finance.costsBySeason      ?? {};
    player.finance.prizeMoneyLog      = player.finance.prizeMoneyLog      ?? [];
    player.finance.monthlyCostsPaidBySeason = player.finance.monthlyCostsPaidBySeason ?? {};
    player.finance.monthlyCostLog      = player.finance.monthlyCostLog      ?? [];
    // Fluxo financeiro vindo de decisões e situações de vida fora da quadra.
    player.finance.lifeEarnings        = player.finance.lifeEarnings        ?? 0;
    player.finance.propertyAssets      = player.finance.propertyAssets      ?? 0;
    player.finance.propertyInvested    = player.finance.propertyInvested    ?? 0;
    player.finance.tournamentsThisSeason = player.finance.tournamentsThisSeason ?? 0;
    player.finance.totalTournamentsPlayed = player.finance.totalTournamentsPlayed ?? 0;
    return player;
  }

  player.finance = {
    // ── Carreira ──────────────────────────────────────────────
    careerEarnings:       0,       // prize money total acumulado (USD)
    earningsBySeason:     {},      // { ano: valor } prize money por temporada
    costsBySeason:        {},      // { ano: valor } custos por temporada
    monthlyCostsPaidBySeason: {},  // { ano: [1..12] } meses ja debitados
    careerBudgetNet:      0,       // earnings - custos acumulado da carreira
    lifeEarnings:         0,       // receita líquida gerada fora de premiações
    propertyAssets:       0,       // valor estimado do portfólio residencial
    propertyInvested:     0,       // entrada/capital já destinado a imóveis

    // ── Temporada corrente ────────────────────────────────────
    currentSeasonEarnings: 0,      // prize money da temporada atual
    currentSeasonCosts:    0,      // custos acumulados na temporada atual
    tournamentsThisSeason: 0,      // torneios jogados nesta temporada
    totalTournamentsPlayed: 0,     // total histórico de torneios

    // ── Saldo disponível ──────────────────────────────────────
    budget:               0,       // saldo atual (pode ser negativo)
    budgetNegativeSince:  null,    // ano em que o budget ficou negativo (para pressão)

    // ── Log de prize money (últimos 50 eventos) ───────────────
    prizeMoneyLog: [],             // [{ season, tournamentName, category, round, amount }]
    monthlyCostLog: [],            // [{ season, monthIndex, amount }]

    // ── Custos estruturais (calculados no fim de cada temporada)
    lastCostBreakdown: null,       // { coach, equipment, physio, prepFisico, total }
  };

  return player;
}

function deductCosts(player, season, amount, breakdown, monthIndex = null) {
  if (amount <= 0) return player;

  player.finance.budget              -= amount;
  player.finance.currentSeasonCosts   = (player.finance.currentSeasonCosts ?? 0) + amount;
  player.finance.careerBudgetNet     -= amount;
  player.finance.costsBySeason[season] = (player.finance.costsBySeason[season] ?? 0) + amount;
  player.finance.lastCostBreakdown    = breakdown;

  if (monthIndex !== null) {
    player.finance.monthlyCostLog.push({ season, monthIndex, amount });
    if (player.finance.monthlyCostLog.length > 36) player.finance.monthlyCostLog.shift();
  }

  if (player.finance.budget < 0 && player.finance.budgetNegativeSince === null) {
    player.finance.budgetNegativeSince = season;
  }
  if (player.finance.budget >= 0) {
    player.finance.budgetNegativeSince = null;
  }

  return player;
}

// ── Awardear prize money após torneio ───────────────────────────────────────
/**
 * Concede prize money ao jogador baseado na rodada que atingiu.
 * Chame esta função no FINISH_TOURNAMENT do UniverseManager.
 *
 * @param {object} player     — objeto do jogador
 * @param {string} category   — categoria do torneio
 * @param {string} round      — rodada atingida ('W', 'F', 'SF', 'QF', 'R16', etc.)
 * @param {number} season     — ano/temporada
 * @param {string} tournamentName — nome para o log
 * @returns {object} player atualizado (mutado in-place)
 */
export function awardPrizeMoney(player, category, round, season, tournamentName = '') {
  const amount = getPrizeMoney(category, round);
  if (amount <= 0) return player;

  initPlayerFinance(player);

  // Acumula earnings
  player.finance.careerEarnings        += amount;
  player.finance.currentSeasonEarnings += amount;
  player.finance.budget                += amount;
  player.finance.earningsBySeason[season] =
    (player.finance.earningsBySeason[season] ?? 0) + amount;
  player.finance.tournamentsThisSeason++;
  player.finance.totalTournamentsPlayed++;

  // Log (últimos 50)
  player.finance.prizeMoneyLog.push({
    season,
    tournamentName,
    category,
    round,
    amount,
  });
  if (player.finance.prizeMoneyLog.length > 50) {
    player.finance.prizeMoneyLog.shift();
  }

  // Limpa budget negativo se agora positivo
  if (player.finance.budget >= 0 && player.finance.budgetNegativeSince !== null) {
    player.finance.budgetNegativeSince = null;
  }

  return player;
}

// ── Processar custos mensais ────────────────────────────────────────────────
/**
 * Deduz 1/12 dos custos estruturais do jogador.
 * Seguro chamar mais de uma vez no mesmo mes: nao duplica cobrança.
 */
export function processMonthlyFinances(player, season, monthIndex = 1) {
  initPlayerFinance(player);

  const month = Math.max(1, Math.min(12, Math.round(monthIndex || 1)));
  const paid = new Set(player.finance.monthlyCostsPaidBySeason[season] ?? []);
  if (paid.has(month)) {
    return {
      player,
      summary: {
        season,
        monthIndex: month,
        costs: 0,
        alreadyProcessed: true,
        budgetEnd: player.finance.budget,
      },
    };
  }

  const annual = computeAnnualCosts(player);
  const monthly = {
    equipment: Math.round((annual.equipment ?? 0) / 12),
    physio: Math.round((annual.physio ?? 0) / 12),
    prepFisico: Math.round((annual.prepFisico ?? 0) / 12),
  };
  monthly.total = monthly.equipment + monthly.physio + monthly.prepFisico;

  paid.add(month);
  player.finance.monthlyCostsPaidBySeason[season] = [...paid].sort((a, b) => a - b);
  deductCosts(player, season, monthly.total, { ...monthly, annualProjection: annual.total }, month);

  return {
    player,
    summary: {
      season,
      monthIndex: month,
      costs: monthly.total,
      budgetEnd: player.finance.budget,
      costsBreakdown: monthly,
    },
  };
}

// ── Processar fim de temporada ───────────────────────────────────────────────
/**
 * Deduz custos anuais, atualiza budget e retorna sumário da temporada financeira.
 * Chame no ADVANCE_YEAR do UniverseManager.
 *
 * @param {object} player — objeto do jogador
 * @param {number} season — ano que está encerrando
 * @returns {{ player: object, summary: object }}
 */
export function processYearEndFinances(player, season) {
  initPlayerFinance(player);

  const costs = computeAnnualCosts(player);
  const monthsPaid = new Set(player.finance.monthlyCostsPaidBySeason?.[season] ?? []);
  const alreadyPaid = player.finance.costsBySeason?.[season] ?? 0;
  const remainingCosts = monthsPaid.size > 0
    ? Math.max(0, costs.total - alreadyPaid)
    : costs.total;

  // Deduz apenas o que ainda nao foi pago nos pulsos mensais.
  deductCosts(player, season, remainingCosts, { ...costs, remainingAtYearEnd: remainingCosts }, null);

  const summary = {
    season,
    earnings:     player.finance.currentSeasonEarnings,
    costs:        player.finance.costsBySeason[season] ?? costs.total,
    net:          player.finance.currentSeasonEarnings - (player.finance.costsBySeason[season] ?? costs.total),
    budgetEnd:    player.finance.budget,
    costsBreakdown: { ...costs, paidMonthly: alreadyPaid, remainingAtYearEnd: remainingCosts },
  };

  // Reset de temporada
  player.finance.currentSeasonEarnings = 0;
  player.finance.currentSeasonCosts    = 0;
  player.finance.tournamentsThisSeason  = 0;

  return { player, summary };
}

// ── Pressão financeira ───────────────────────────────────────────────────────
/**
 * Retorna o nível de pressão financeira do jogador.
 * Usado para UI e consequências de gameplay.
 *
 * @returns {{ level: 'OK'|'WARNING'|'CRITICAL'|'CRISIS', label: string, color: string }}
 */
export function getFinancialPressure(player) {
  if (!player.finance) return { level: 'OK', label: 'Estável', color: '#60FF90' };

  const budget   = player.finance.budget ?? 0;
  const negSince = player.finance.budgetNegativeSince;
  const rank     = player.rankPosition ?? 200;

  // Referência: top 50 aguenta déficits maiores
  const criticalThreshold = rank <= 50 ? -300_000 : -100_000;
  const warningThreshold  = rank <= 50 ? -100_000 : -30_000;

  if (budget > 200_000)          return { level: 'OK',       label: 'Sólido',        color: '#60FF90' };
  if (budget > 0)                return { level: 'OK',       label: 'Estável',       color: '#A8E890' };
  if (budget > warningThreshold) return { level: 'WARNING',  label: 'Atenção',       color: '#FFD700' };
  if (budget > criticalThreshold)return { level: 'CRITICAL', label: 'Crítico',       color: '#FF8C00' };
  return                                { level: 'CRISIS',   label: 'Crise',         color: '#FF4444' };
}

// ── Formatadores ─────────────────────────────────────────────────────────────
/**
 * Formata um valor USD de forma compacta: $2.4M, $400K, $18K
 */
export function formatUSD(value) {
  if (!value && value !== 0) return '—';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${abs}`;
}

export const ROUND_PRIZE_LABEL = {
  W: 'Título', F: 'Final', SF: 'Semifinal', QF: 'Quartas',
  R16: 'Oitavas', R32: '3ª Rodada', R64: '2ª Rodada', R128: '1ª Rodada',
  Q: 'Qualifying', PQ: 'Pré-Qualify', RR_WIN: 'Round Robin',
};

export const CAT_PRIZE_LABEL = {
  GRAND_SLAM: 'Grand Slam', SLAM_CLASH: 'Clash Slam', MASTERS_1000: 'Masters 1000',
  ATP_500: 'ATP 500', ATP_250: 'ATP 250', ATP_100: 'Challenger',
  FINALS: 'ATP Finals', ATP_PROSPECTS: 'Prospects', PROSPECTS_FINALS: 'Prosp. Finals',
};

