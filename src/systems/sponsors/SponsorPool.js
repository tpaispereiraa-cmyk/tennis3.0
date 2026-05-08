/**
 * SponsorPool.js — Fase 3: Pool de Patrocinadores
 *
 * Motor que gerencia o estado dinâmico das marcas no universo:
 *   — Estado por marca: contratos ativos, budget restante, marcas em urgência
 *   — Cálculo de interesse: qual marca quer qual jogador e por quê
 *   — Geração de ofertas: valor, tipo de contrato sugerido, motivação
 *   — Comportamento sazonal: marcas agem no fim de cada temporada
 *   — Conflito de marca: rival do mesmo patrocinador bloqueia contrato
 *   — Consequências de escândalo: marcas conservadoras recuam
 *
 * INTEGRAÇÃO:
 *   — Chamar initSponsorPool(universe) ao criar/carregar um universo
 *   — Chamar processSponsorSeason(pool, allPlayers, year, opts) no ADVANCE_YEAR
 *   — O retorno inclui: offers[], events[], updatedPool
 *
 * EXPORTS PRINCIPAIS:
 *   initSponsorPool(universe?)          → SponsorPool
 *   getSponsorState(pool, sponsorId)    → SponsorState
 *   computeInterest(sponsor, player, opts) → { score, reasons[] }
 *   generateOffer(sponsor, player, pool, opts) → Offer | null
 *   processSponsorSeason(pool, players, year, opts)
 *     → { updatedPool, offers, events }
 *   applyScandal(pool, player, severity) → { updatedPool, lostContracts[] }
 *   applyRetirement(pool, player)        → { updatedPool, releasedSlots[] }
 *   getActiveSponsorships(pool, playerId) → SponsorContract[]
 *   getPlayerContracts(pool, playerId)   → SponsorContract[]
 *   signContract(pool, contract)         → updatedPool
 *   terminateContract(pool, contractId, reason) → { updatedPool, event }
 */

import {
  SPONSOR_CATALOG,
  SPONSOR_TIERS,
  BRAND_PERSONALITIES,
  getSponsorById,
  getTierData,
  getContractRange,
} from './SponsorProfiles.js';

import {
  evaluateSponsorIdentityFit,
  getSponsorIdentity,
} from './SponsorIdentity.js';

import {
  buildContractClauses,
  flattenBonusAmounts,
  summarizeContractClauses,
} from './SponsorContractClauses.js';

import { offlineZero as computeSponsorSignal, offlineTier as getPhaseTwoTier } from '../shotlab/ShotEngineOffline.js';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS DE CONTRATO
// ─────────────────────────────────────────────────────────────────────────────
export const CONTRACT_TYPES = {
  BASE: {
    id: 'BASE',
    label: 'Contrato Base',
    durationRange: [1, 2],
    structure: 'FEE_FIXO',
    description: 'Fee fixo anual. Sem bônus.',
  },
  PERFORMANCE: {
    id: 'PERFORMANCE',
    label: 'Contrato de Performance',
    durationRange: [1, 3],
    structure: 'FEE_BASE_BONUS',
    description: 'Fee base + bônus por Grand Slam, nº1, títulos Masters.',
    bonusTriggers: {
      GRAND_SLAM_TITLE: 300_000,
      NUMBER_ONE:       500_000,
      MASTERS_TITLE:    150_000,
      TOP_10:           80_000,
    },
  },
  IMAGE: {
    id: 'IMAGE',
    label: 'Contrato de Imagem',
    durationRange: [2, 4],
    structure: 'FEE_ALTO',
    description: 'Fee alto fixo. Obrigações de aparições públicas.',
    apparanceObligation: true,
  },
  EQUIPMENT: {
    id: 'EQUIPMENT',
    label: 'Contrato de Equipamento',
    durationRange: [1, 3],
    structure: 'FEE_EQUIPAMENTO',
    description: 'Fee + provisão de equipamento. Exclusividade de uso em quadra.',
    exclusivityInPlay: true,
  },
  AMBASSADOR: {
    id: 'AMBASSADOR',
    label: 'Contrato de Embaixador',
    durationRange: [3, 5],
    structure: 'FEE_PREMIUM_ROYALTIES',
    description: 'Fee premium + royalties. Exclusividade total na categoria.',
    globalCampaign: true,
    categoryExclusivity: true,
  },
  PROSPECT_DEAL: {
    id: 'PROSPECT_DEAL',
    label: 'Deal de Prospect',
    durationRange: [2, 4],
    structure: 'FEE_BAIXO_ESCADA',
    description: 'Fee baixo + escada de gatilhos. Dobra se top 50, triplica se top 10.',
    ladderTriggers: {
      TOP_50: 2.0,
      TOP_10: 3.0,
      TOP_5:  4.0,
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// RAZÕES DE RESCISÃO
// ─────────────────────────────────────────────────────────────────────────────
export const TERMINATION_REASONS = {
  EXPIRED:           'EXPIRED',          // contrato encerrou normalmente
  SCANDAL:           'SCANDAL',          // rescisão por imagem
  PERFORMANCE_DROP:  'PERFORMANCE_DROP', // jogador caiu abaixo do threshold
  INJURY_LONG:       'INJURY_LONG',      // lesão longa (6+ meses)
  RIVAL_ASCENDED:    'RIVAL_ASCENDED',   // rival do mesmo sponsor venceu GS
  BUDGET_CUT:        'BUDGET_CUT',       // marca cortou budget
  RETIREMENT:        'RETIREMENT',       // jogador se aposentou
  MUTUAL:            'MUTUAL',           // rescisão mútua
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────────────────────────────────────

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

function randBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// INICIALIZAÇÃO DO POOL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cria o estado inicial do pool de patrocinadores.
 * Cada marca recebe um estado mutable (contratos, budget restante, urgência).
 *
 * @param {object} [universe] — contexto do universo (opcional, para seed de estado)
 * @returns {SponsorPool}
 */
export function initSponsorPool(universe = {}) {
  const states = {};

  for (const sponsor of SPONSOR_CATALOG) {
    states[sponsor.id] = {
      sponsorId:         sponsor.id,
      contracts:         [],           // SponsorContract[] ativos
      budgetUsed:        0,            // total comprometido nesta temporada (USD/ano)
      urgency:           1.0,          // começa em 1.0 — todas as marcas sem contratos buscam ativamente
      lastSeasonActive:  null,         // último ano com contratos ativos
      historyLog:        [],           // eventos históricos desta marca
    };
  }

  return {
    states,
    contractArchive: [],    // contratos encerrados (histórico)
    lastProcessedYear: null,
  };
}

/**
 * Recupera o estado de uma marca (cria se não existir — idempotente).
 */
export function getSponsorState(pool, sponsorId) {
  if (!pool.states[sponsorId]) {
    pool.states[sponsorId] = {
      sponsorId,
      contracts:        [],
      budgetUsed:       0,
      urgency:          0,
      lastSeasonActive: null,
      historyLog:       [],
    };
  }
  return pool.states[sponsorId];
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTRATOS — ACESSO E GESTÃO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna todos os contratos ativos de um jogador.
 */
export function getPlayerContracts(pool, playerId) {
  const all = [];
  for (const state of Object.values(pool.states)) {
    const playerContracts = state.contracts.filter(c => c.playerId === playerId);
    all.push(...playerContracts);
  }
  return all;
}

/**
 * Retorna contratos ativos de um jogador numa categoria específica.
 */
export function getPlayerContractInCategory(pool, playerId, category) {
  return getPlayerContracts(pool, playerId).find(c => c.category === category) ?? null;
}

/**
 * Verifica se um jogador pode receber contrato de uma marca (sem conflito de categoria).
 */
export function canSignWithSponsor(pool, playerId, sponsor) {
  const existingInCategory = getPlayerContractInCategory(pool, playerId, sponsor.category);
  return !existingInCategory;
}

/**
 * Assina um contrato: atualiza pool, debita budget da marca.
 */
export function signContract(pool, contract) {
  const state = getSponsorState(pool, contract.sponsorId);

  state.contracts.push(contract);
  state.budgetUsed      += contract.annualFee;
  state.urgency          = Math.max(0, state.urgency - 0.2);
  state.lastSeasonActive = contract.seasonSigned;

  state.historyLog.push({
    year:    contract.seasonSigned,
    event:   'SIGNED',
    playerId: contract.playerId,
    value:   contract.annualFee,
  });

  return { ...pool, states: { ...pool.states, [contract.sponsorId]: state } };
}

/**
 * Encerra um contrato por uma razão.
 * Devolve o budget ao pool da marca e arquiva o contrato.
 *
 * @returns {{ updatedPool, event }}
 */
export function terminateContract(pool, contractId, reason = TERMINATION_REASONS.EXPIRED, year = null) {
  let foundContract = null;
  let foundSponsorId = null;

  const newStates = { ...pool.states };

  for (const [sponsorId, state] of Object.entries(newStates)) {
    const idx = state.contracts.findIndex(c => c.id === contractId);
    if (idx !== -1) {
      foundContract  = state.contracts[idx];
      foundSponsorId = sponsorId;

      const newContracts = [...state.contracts];
      newContracts.splice(idx, 1);

      newStates[sponsorId] = {
        ...state,
        contracts:  newContracts,
        budgetUsed: Math.max(0, state.budgetUsed - foundContract.annualFee),
        historyLog: [...state.historyLog, {
          year:    year ?? foundContract.seasonSigned,
          event:   'TERMINATED',
          reason,
          playerId: foundContract.playerId,
          value:   foundContract.annualFee,
        }],
      };
      break;
    }
  }

  if (!foundContract) return { updatedPool: pool, event: null };

  const archivedContract = {
    ...foundContract,
    terminationReason: reason,
    terminatedYear: year,
  };

  const updatedPool = {
    ...pool,
    states:          newStates,
    contractArchive: [...pool.contractArchive, archivedContract],
  };

  const event = {
    type:       'CONTRACT_TERMINATED',
    sponsorId:  foundSponsorId,
    playerId:   foundContract.playerId,
    reason,
    year,
    annualFee:  foundContract.annualFee,
    contractId,
  };

  return { updatedPool, event };
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERESSE — computeInterest
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula o score de interesse de uma marca num jogador (0–100).
 * Retorna também as razões (para narrativa e debug).
 *
 * @param {object} sponsor  — perfil da marca (de SPONSOR_CATALOG)
 * @param {object} player   — objeto do jogador
 * @param {object} [opts]   — { pool, allPlayers, year, newsEngine, rivalrySystem }
 * @returns {{ score: number, reasons: string[], eligible: boolean, ineligibleReason?: string }}
 */
export function computeInterest(sponsor, player, opts = {}) {
  const { pool, allPlayers = [], year } = opts;

  // ── Pré-checks de elegibilidade ──────────────────────────────────────────
  const tierData = getTierData(sponsor.tier);
  const signal   = player.phaseTwo?.sponsorSignal
    ?? computeSponsorSignal(player, opts).score;
  const mktScore = player.personality?.marketability?.score ?? 20;

  if (mktScore < sponsor.minMarketability) {
    return { score: 0, reasons: [], eligible: false,
      ineligibleReason: `Marketability ${mktScore} abaixo do mínimo ${sponsor.minMarketability}` };
  }

  if (pool) {
    const state = getSponsorState(pool, sponsor.id);
    const budgetAvailable = sponsor.budget - state.budgetUsed;
    const [minFee] = getContractRange(sponsor.tier);
    if (budgetAvailable < minFee) {
      return { score: 0, reasons: [], eligible: false,
        ineligibleReason: 'Budget da marca esgotado' };
    }

    // Máximo de contratos
    if (state.contracts.length >= sponsor.maxContracts) {
      return { score: 0, reasons: [], eligible: false,
        ineligibleReason: `Limite de contratos atingido (${sponsor.maxContracts})` };
    }

    // Conflito de categoria
    if (!canSignWithSponsor(pool, player.id, sponsor)) {
      return { score: 0, reasons: [], eligible: false,
        ineligibleReason: 'Jogador já tem contrato nessa categoria' };
    }

    // Conflito de marca: rival do mesmo patrocinador
    const hasSponsoredRival = _checkRivalConflict(pool, player, sponsor, allPlayers, opts);
    if (hasSponsoredRival) {
      return { score: 0, reasons: [], eligible: false,
        ineligibleReason: 'Conflito: marca patrocina rival direto' };
    }
  }

  // ── Base: sinal combinado ────────────────────────────────────────────────
  let score   = signal;
  const reasons = [];

  // ── Bônus por estilo preferido ───────────────────────────────────────────
  const playerStyle = player.style?.id ?? player.styleId;
  if (playerStyle && sponsor.preferredStyles.includes(playerStyle)) {
    score += 12;
    reasons.push(`Estilo ${playerStyle} alinhado com a marca`);
  }

  // ── Bônus por nacionalidade preferida ───────────────────────────────────
  const playerNat = player.nationality ?? player.country;
  if (playerNat && sponsor.preferredNationality.includes(playerNat)) {
    score += 10;
    reasons.push(`Mercado ${playerNat} prioritário para a marca`);
  }

  // ── Personalidade da marca ───────────────────────────────────────────────
  score += _personalityBonus(sponsor, player, opts);
  const personalityNote = _personalityReason(sponsor, player, opts);
  if (personalityNote) reasons.push(personalityNote);

  // ── Marca de luxo: prefere veteranos ────────────────────────────────────
  if (sponsor.luxuryBrand) {
    const age = player.age ?? 25;
    if (age >= 28) {
      score += 8;
      reasons.push('Marca de luxo valoriza veteranos');
    } else if (age < 22) {
      score -= 10;
    }
  }

  // ── Marca de energia: prefere IFR alto ──────────────────────────────────
  if (sponsor.energyBrand) {
    const ifr = player.phaseTwo?.ifr ?? 50;
    if (ifr >= 75) {
      score += 15;
      reasons.push('Marca de energia: jogador está em chamas (IFR alto)');
    } else if (ifr < 40) {
      score -= 10;
    }
  }

  // ── Urgência da marca (sem contratos na categoria há +1 temporada) ───────
  if (pool) {
    const state = getSponsorState(pool, sponsor.id);
    if (state.urgency > 0.5) {
      score += Math.round(state.urgency * 15);
      reasons.push('Marca está buscando ativamente novos atletas');
    }
  }

  // ── riskTolerance: marcas conservadoras evitam jovens sem histórico ──────
  const age = player.age ?? 25;
  const isProspect = age <= 20 || (player.rankPosition ?? 999) > 150;
  if (isProspect) {
    if (sponsor.riskTolerance >= 0.6) {
      score += 8;
      reasons.push('Marca aposta em prospects');
    } else if (sponsor.riskTolerance < 0.3) {
      score -= 15;
      reasons.push('Marca conservadora evita apostas em prospects');
    }
  }

  // ── Escândalo do jogador ─────────────────────────────────────────────────
  const pressPersona = player.personality?.pressPersona;
  if (pressPersona === 'CONFRONTATIONAL' && sponsor.conservativeImage) {
    score -= 20;
    reasons.push('Perfil confrontador afasta marcas conservadoras');
  }

  // ── Superfície preferida da marca ────────────────────────────────────────
  if (sponsor.preferredSurface) {
    const surfId = player.surfaceIdentity?.id ?? player.surfaceIdentity;
    if (surfId === sponsor.preferredSurface) {
      score += 10;
      reasons.push(`Especialista na superfície preferida da marca`);
    }
  }

  // ── Histórico de relacionamento (lealdade) ────────────────────────────────
  if (pool) {
    const hadContract = _hadPreviousContract(pool, player.id, sponsor.id);
    if (hadContract) {
      const loyaltyBonus = Math.round(sponsor.loyaltyFactor * 12);
      score += loyaltyBonus;
      if (loyaltyBonus > 0) reasons.push('Relacionamento anterior com a marca');
    }
  }

  const identityFit = evaluateSponsorIdentityFit(sponsor, player, opts);
  if (identityFit.scoreDelta) score += identityFit.scoreDelta;
  reasons.push(...identityFit.reasons);

  return {
    score:    clamp(Math.round(score), 0, 100),
    reasons,
    eligible: true,
    signal,
    mktScore,
    identityFit,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GERAÇÃO DE OFERTA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gera uma oferta concreta de contrato, se o interesse for suficiente.
 *
 * @param {object}  sponsor    — perfil da marca
 * @param {object}  player     — objeto do jogador
 * @param {object}  pool       — estado atual do pool
 * @param {object}  [opts]     — { allPlayers, year, competitors }
 * @returns {Offer | null}
 */
export function generateOffer(sponsor, player, pool, opts = {}) {
  const interestResult = computeInterest(sponsor, player, { ...opts, pool });

  if (!interestResult.eligible) return null;

  // Threshold por tier: ENTRY/MID são mais permissivos (menos exigentes em signal)
  const INTEREST_THRESHOLD =
    sponsor.tier === 'ENTRY'   ? 28 :
    sponsor.tier === 'MID'     ? 35 :
    sponsor.tier === 'PREMIUM' ? 42 :
    50; // ELITE
  if (interestResult.score < INTEREST_THRESHOLD) return null;

  const tierData    = getTierData(sponsor.tier);
  const [minFee, maxFee] = tierData.contractRange;

  // Valor base: proporcional ao sinal do jogador dentro da faixa da marca
  const signalRatio = clamp(interestResult.signal / 100, 0, 1);
  const baseFee     = Math.round(minFee + signalRatio * (maxFee - minFee));

  // Urgência eleva o valor (marca sem contratos paga mais)
  const state     = getSponsorState(pool, sponsor.id);
  const urgencyMult = 1 + state.urgency * 0.25;

  // Competição: se outro sponsor do mesmo tier também quer o jogador, valor sobe
  const competitionMult = opts.competitors?.includes(sponsor.id) ? 1.15 : 1.0;

  // Histórico de lealdade: desconto sutil para renovação
  const hadPrevious = _hadPreviousContract(pool, player.id, sponsor.id);
  const loyaltyMult = hadPrevious ? (0.90 + sponsor.loyaltyFactor * 0.15) : 1.0;

  const annualFee = Math.round(
    baseFee * urgencyMult * competitionMult * loyaltyMult / 1000
  ) * 1000; // arredonda para milhares

  // Tipo de contrato sugerido baseado na personalidade da marca
  const contractType = _suggestContractType(sponsor, player, annualFee);
  const brandIdentity = getSponsorIdentity(sponsor);
  const campaignConcept = interestResult.identityFit?.campaignConcept ?? null;
  const clauses = buildContractClauses({
    sponsor,
    player,
    contractType,
    annualFee,
    duration: CONTRACT_TYPES[contractType].durationRange?.[0] ?? 1,
    campaignConcept,
  });

  // Duração baseada no tipo e lealdade da marca
  const [minDur, maxDur] = CONTRACT_TYPES[contractType].durationRange;
  const durationBonus = sponsor.loyaltyFactor > 0.7 ? 1 : 0;
  const duration = Math.min(maxDur, randBetween(minDur, minDur + durationBonus + (interestResult.score >= 70 ? 1 : 0)));

  return {
    id:          `offer_${uid()}`,
    sponsorId:   sponsor.id,
    sponsorName: sponsor.name,
    sponsorTier: sponsor.tier,
    category:    sponsor.category,
    playerId:    player.id,
    playerName:  player.name,
    contractType,
    annualFee,
    duration,
    interestScore: interestResult.score,
    reasons:     interestResult.reasons,
    brandIdentity,
    campaignConcept,
    fitSummary: campaignConcept?.pitch ?? brandIdentity?.summary ?? null,
    clauses,
    clauseSummary: summarizeContractClauses(clauses),
    seasonOffered: opts.year ?? null,
    logo:        sponsor.logo,
    tagline:     sponsor.tagline,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PROCESSAMENTO SAZONAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Processa o comportamento das marcas no fim de uma temporada.
 *
 * Para cada marca:
 *   1. Verifica contratos vencendo e decide renovar, renegociar ou encerrar
 *   2. Marca com budget sobrando busca novos jogadores
 *   3. Marca que perdeu atleta entra em urgência
 *   4. Gera ofertas para jogadores elegíveis
 *
 * @param {SponsorPool}  pool
 * @param {object[]}     allPlayers   — todos os jogadores do universo
 * @param {number}       year         — temporada que está encerrando
 * @param {object}       [opts]       — { newsEngine, rivalrySystem }
 * @returns {{ updatedPool, offers: Offer[], events: Event[], renewals: Renewal[] }}
 */
export function processSponsorSeason(pool, allPlayers, year, opts = {}) {
  let currentPool = { ...pool, states: { ...pool.states } };
  const allOffers  = [];
  const allEvents  = [];
  const renewals   = [];

  // ── Passo 1: Processar contratos ativos — vencimento e renovação ─────────
  for (const sponsor of SPONSOR_CATALOG) {
    const state = getSponsorState(currentPool, sponsor.id);

    // Resetar budgetUsed para recalcular a partir dos contratos ainda ativos
    let newBudgetUsed = 0;
    const contractsToKeep = [];
    const contractsExpiring = [];

    for (const contract of state.contracts) {
      const seasonsElapsed = year - contract.seasonSigned;
      if (seasonsElapsed >= contract.duration) {
        contractsExpiring.push(contract);
      } else {
        contractsToKeep.push(contract);
        newBudgetUsed += contract.annualFee;
      }
    }

    // Processar vencimentos
    for (const contract of contractsExpiring) {
      const player = allPlayers.find(p => p.id === contract.playerId);
      if (!player) {
        // Jogador não existe mais — arquivar silenciosamente
        currentPool.contractArchive.push({ ...contract, terminationReason: TERMINATION_REASONS.RETIREMENT, terminatedYear: year });
        continue;
      }

      const renewalDecision = _evaluateRenewal(sponsor, player, contract, currentPool, { ...opts, year, allPlayers });

      if (renewalDecision.renew) {
        // Renovação: atualiza fee e duração
        const newContract = {
          ...contract,
          id:           `contract_${uid()}`,
          annualFee:    renewalDecision.newFee,
          duration:     renewalDecision.newDuration,
          seasonSigned: year,
          renewedFrom:  contract.id,
        };
        contractsToKeep.push(newContract);
        newBudgetUsed += newContract.annualFee;
        currentPool.contractArchive.push({ ...contract, terminationReason: TERMINATION_REASONS.EXPIRED, terminatedYear: year });

        renewals.push({ type: 'RENEWED', contract: newContract, oldContract: contract });
        allEvents.push({
          type:       'CONTRACT_RENEWED',
          sponsorId:  sponsor.id,
          sponsorName: sponsor.name,
          playerId:   player.id,
          playerName: player.name,
          oldFee:     contract.annualFee,
          newFee:     newContract.annualFee,
          year,
        });
      } else {
        // Não renovado
        currentPool.contractArchive.push({ ...contract, terminationReason: TERMINATION_REASONS.EXPIRED, terminatedYear: year });
        renewals.push({ type: 'NOT_RENEWED', contract, reason: renewalDecision.reason });
        allEvents.push({
          type:       'CONTRACT_EXPIRED',
          sponsorId:  sponsor.id,
          sponsorName: sponsor.name,
          playerId:   player.id,
          playerName: player.name,
          reason:     renewalDecision.reason,
          year,
        });
      }
    }

    // Atualiza estado da marca
    const slotsLeft = sponsor.maxContracts - contractsToKeep.length;
    const budgetLeft = sponsor.budget - newBudgetUsed;
    const [minFee] = getContractRange(sponsor.tier);
    const hasRoomForNew = slotsLeft > 0 && budgetLeft >= minFee;

    // Urgência sobe se a marca perdeu contratos e tem budget sobrando
    const lostContracts = contractsExpiring.length;
    const newUrgency = clamp(
      (lostContracts > 0 && hasRoomForNew) ? state.urgency + 0.3 : Math.max(0, state.urgency - 0.15),
      0, 1
    );

    currentPool.states[sponsor.id] = {
      ...state,
      contracts:   contractsToKeep,
      budgetUsed:  newBudgetUsed,
      urgency:     newUrgency,
      lastSeasonActive: contractsToKeep.length > 0 ? year : state.lastSeasonActive,
    };
  }

  // ── Passo 2: Gerar ofertas para jogadores elegíveis ──────────────────────
  // Cada jogador que não tem contrato numa categoria pode receber oferta de marcas ativas
  const eligiblePlayers = allPlayers.filter(p => !p.retired && (p.rankPosition ?? 999) <= 500);

  for (const sponsor of SPONSOR_CATALOG) {
    const state = getSponsorState(currentPool, sponsor.id);
    const [minFee] = getContractRange(sponsor.tier);
    const budgetAvailable = sponsor.budget - state.budgetUsed;
    const slotsAvailable  = sponsor.maxContracts - state.contracts.length;

    if (budgetAvailable < minFee || slotsAvailable <= 0) continue;

    // Calcular interesse para todos os jogadores elegíveis
    const candidatesWithInterest = eligiblePlayers
      .filter(p => canSignWithSponsor(currentPool, p.id, sponsor))
      .map(p => ({
        player: p,
        interest: computeInterest(sponsor, p, { ...opts, pool: currentPool, allPlayers, year }),
      }))
      .filter(c => c.interest.eligible && c.interest.score >= 45)
      .sort((a, b) => b.interest.score - a.interest.score);

    // Top candidatos recebem oferta (limita para não sobrecarregar)
    const topCandidates = candidatesWithInterest.slice(0, Math.min(5, slotsAvailable * 2));

    for (const { player } of topCandidates) {
      // Detectar competidores (outras marcas do mesmo tier querendo o mesmo jogador)
      const competitors = SPONSOR_CATALOG
        .filter(s => s.id !== sponsor.id && s.tier === sponsor.tier && s.category === sponsor.category)
        .map(s => s.id);

      const offer = generateOffer(sponsor, player, currentPool, { ...opts, year, allPlayers, competitors });
      if (offer) allOffers.push(offer);
    }
  }

  // ── Passo 3: Processar aceitação automática de IA ────────────────────────
  // (Jogadores controlados pelo usuário terão as ofertas apresentadas na UI)
  const { acceptedOffers, rejectedOffers } = _resolveOffers(allOffers, allPlayers, currentPool, year);

  for (const offer of acceptedOffers) {
    const contract = _offerToContract(offer, year);
    currentPool = signContract(currentPool, contract);

    allEvents.push({
      type:       'CONTRACT_SIGNED',
      sponsorId:  offer.sponsorId,
      sponsorName: offer.sponsorName,
      playerId:   offer.playerId,
      playerName: offer.playerName,
      annualFee:  offer.annualFee,
      contractType: offer.contractType,
      duration:   offer.duration,
      tier:       offer.sponsorTier,
      year,
      isElite:    offer.sponsorTier === 'ELITE',
    });
  }

  return {
    updatedPool: { ...currentPool, lastProcessedYear: year },
    offers:     allOffers,
    acceptedOffers,
    rejectedOffers,
    events:     allEvents,
    renewals,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ESCNDALO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aplica consequências de escândalo de um jogador nas suas marcas.
 *
 * @param {SponsorPool} pool
 * @param {object}      player
 * @param {number}      severity — 0–1 (0.3 = polêmica, 0.7 = grave, 1.0 = crítico)
 * @param {number}      year
 * @returns {{ updatedPool, lostContracts: Contract[] }}
 */
export function applyScandal(pool, player, severity = 0.5, year = null) {
  let currentPool = pool;
  const lostContracts = [];

  const playerContracts = getPlayerContracts(pool, player.id);

  for (const contract of playerContracts) {
    const sponsor = getSponsorById(contract.sponsorId);
    if (!sponsor) continue;

    // Marcas conservadoras têm maior chance de rescindir
    const rescindThreshold = sponsor.conservativeImage
      ? 0.3     // conservative: qualquer escândalo moderado
      : 0.65;   // outras: só escândalos graves

    if (severity >= rescindThreshold) {
      const { updatedPool, event } = terminateContract(
        currentPool, contract.id, TERMINATION_REASONS.SCANDAL, year
      );
      currentPool = updatedPool;
      lostContracts.push(contract);

      // Marca em urgência: perdeu um atleta, quer encontrar substituto
      const state = getSponsorState(currentPool, sponsor.id);
      currentPool.states[sponsor.id] = { ...state, urgency: Math.min(1, state.urgency + 0.4) };
    }
  }

  return { updatedPool: currentPool, lostContracts };
}

// ─────────────────────────────────────────────────────────────────────────────
// APOSENTADORIA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Encerra todos os contratos de um jogador aposentado.
 */
export function applyRetirement(pool, player, year = null) {
  let currentPool = pool;
  const releasedSlots = [];

  const playerContracts = getPlayerContracts(pool, player.id);

  for (const contract of playerContracts) {
    const { updatedPool } = terminateContract(
      currentPool, contract.id, TERMINATION_REASONS.RETIREMENT, year
    );
    currentPool = updatedPool;
    releasedSlots.push({ sponsorId: contract.sponsorId, category: contract.category });

    // Urgência sobe: marca perdeu um atleta
    const state = getSponsorState(currentPool, contract.sponsorId);
    currentPool.states[contract.sponsorId] = {
      ...state,
      urgency: Math.min(1, state.urgency + 0.35),
    };
  }

  return { updatedPool: currentPool, releasedSlots };
}

// ─────────────────────────────────────────────────────────────────────────────
// QUEDA DE PERFORMANCE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifica se alguma marca quer rescindir por queda de performance do jogador.
 * Chamado após ADVANCE_YEAR quando o sinal do jogador caiu significativamente.
 *
 * @param {SponsorPool} pool
 * @param {object}      player
 * @param {number}      year
 * @returns {{ updatedPool, terminatedContracts[] }}
 */
export function checkPerformanceDrop(pool, player, year) {
  let currentPool = pool;
  const terminatedContracts = [];

  const signal = player.phaseTwo?.sponsorSignal ?? 30;
  const playerContracts = getPlayerContracts(pool, player.id);

  for (const contract of playerContracts) {
    const sponsor = getSponsorById(contract.sponsorId);
    if (!sponsor) continue;

    // Marca só rescinde se o jogador caiu abaixo do minMarketability
    const mktScore = player.personality?.marketability?.score ?? 20;
    if (mktScore >= sponsor.minMarketability) continue;

    // Marcas conservadoras (loyaltyFactor baixo) rescindem mais rápido
    const rescindChance = 1 - sponsor.loyaltyFactor;
    if (Math.random() < rescindChance) {
      const { updatedPool, event } = terminateContract(
        currentPool, contract.id, TERMINATION_REASONS.PERFORMANCE_DROP, year
      );
      currentPool = updatedPool;
      terminatedContracts.push(contract);
    }
  }

  return { updatedPool: currentPool, terminatedContracts };
}

// ─────────────────────────────────────────────────────────────────────────────
// LESÃO LONGA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Marca pode suspender ou encerrar contrato em lesão longa (6+ meses).
 */
export function checkLongInjury(pool, player, injuryMonths, year) {
  if (injuryMonths < 6) return { updatedPool: pool, terminatedContracts: [] };

  let currentPool = pool;
  const terminatedContracts = [];
  const playerContracts = getPlayerContracts(pool, player.id);

  for (const contract of playerContracts) {
    const sponsor = getSponsorById(contract.sponsorId);
    if (!sponsor) continue;

    // Marcas com loyaltyFactor alto aguentam lesão
    const toleratesInjury = sponsor.loyaltyFactor >= 0.7;
    if (toleratesInjury && injuryMonths < 12) continue;

    if (Math.random() < (1 - sponsor.loyaltyFactor) * 0.7) {
      const { updatedPool } = terminateContract(
        currentPool, contract.id, TERMINATION_REASONS.INJURY_LONG, year
      );
      currentPool = updatedPool;
      terminatedContracts.push(contract);
    }
  }

  return { updatedPool: currentPool, terminatedContracts };
}

// ─────────────────────────────────────────────────────────────────────────────
// RIVAL VENCEU GRAND SLAM
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Quando um jogador (rival) vence um GS, patrocinadores compartilhados com
 * outros atletas revisam a prioridade dos contratos ativos.
 */
export function onRivalWonGrandSlam(pool, grandSlamWinnerId, allPlayers, year) {
  const winner = allPlayers.find(p => p.id === grandSlamWinnerId);
  if (!winner) return { updatedPool: pool, events: [] };

  const winnerContracts = getPlayerContracts(pool, grandSlamWinnerId);
  const winnerSponsorIds = winnerContracts.map(c => c.sponsorId);

  let currentPool = pool;
  const events = [];

  // Para cada marca que patrocina o vencedor, vê se tem outro atleta com
  // contrato menor que pode ser revisto (narrativa de "rebaixamento")
  for (const sponsorId of winnerSponsorIds) {
    const state = getSponsorState(currentPool, sponsorId);
    const sponsor = getSponsorById(sponsorId);
    if (!sponsor) continue;

    // Contratos de outros jogadores da mesma marca
    const otherContracts = state.contracts.filter(c => c.playerId !== grandSlamWinnerId);
    for (const contract of otherContracts) {
      const otherPlayer = allPlayers.find(p => p.id === contract.playerId);
      if (!otherPlayer) continue;

      // Narrativa: marca reavalia a prioridade (não rescisão automática — isso vai para a UI)
      events.push({
        type:       'BRAND_REPRIORITIZED',
        sponsorId,
        sponsorName: sponsor.name,
        winnerId:   grandSlamWinnerId,
        winnerName: winner.name,
        affectedPlayerId: contract.playerId,
        affectedPlayerName: otherPlayer.name,
        year,
        note: `${sponsor.name} reavalia posição de ${otherPlayer.name} após GS de ${winner.name}`,
      });
    }
  }

  return { updatedPool: currentPool, events };
}

// ─────────────────────────────────────────────────────────────────────────────
// GETTERS UTILITÁRIOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna todos os contratos ativos de um patrocinador.
 */
export function getSponsorContracts(pool, sponsorId) {
  return getSponsorState(pool, sponsorId).contracts;
}

/**
 * Retorna o budget restante de um patrocinador.
 */
export function getSponsorBudgetRemaining(pool, sponsorId) {
  const sponsor = getSponsorById(sponsorId);
  if (!sponsor) return 0;
  const state = getSponsorState(pool, sponsorId);
  return sponsor.budget - state.budgetUsed;
}

/**
 * Retorna o jogador mais bem pago no universo (maior fee total de contratos).
 */
export function getHighestPaidPlayer(pool, allPlayers) {
  const totals = {};
  for (const state of Object.values(pool.states)) {
    for (const contract of state.contracts) {
      totals[contract.playerId] = (totals[contract.playerId] ?? 0) + contract.annualFee;
    }
  }
  const topId = Object.entries(totals).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!topId) return null;
  return {
    player: allPlayers.find(p => p.id === topId) ?? null,
    totalAnnual: totals[topId],
  };
}

/**
 * Retorna marcas que estão em urgência (buscando contratos).
 */
export function getUrgentSponsors(pool, minUrgency = 0.5) {
  return SPONSOR_CATALOG
    .map(s => ({ sponsor: s, state: getSponsorState(pool, s.id) }))
    .filter(({ state }) => state.urgency >= minUrgency)
    .sort((a, b) => b.state.urgency - a.state.urgency);
}

/**
 * Retorna o histórico de contratos de um jogador (ativos + arquivados).
 */
export function getFullContractHistory(pool, playerId) {
  const active   = getPlayerContracts(pool, playerId);
  const archived = pool.contractArchive.filter(c => c.playerId === playerId);
  return { active, archived, total: active.length + archived.length };
}

/**
 * Resumo financeiro de patrocínio por jogador.
 */
export function getSponsorshipEarnings(pool, playerId) {
  const active   = getPlayerContracts(pool, playerId);
  const archived = pool.contractArchive.filter(c => c.playerId === playerId);

  const annualActive = active.reduce((s, c) => s + c.annualFee, 0);
  const careerTotal  = archived.reduce((s, c) => s + c.annualFee * c.duration, 0)
    + active.reduce((s, c) => s + c.annualFee, 0); // valor parcial dos ativos

  return {
    annualActive,
    careerTotal,
    activeContracts: active.length,
    highestTier: active.reduce((best, c) => {
      const order = ['ENTRY', 'MID', 'PREMIUM', 'ELITE'];
      return order.indexOf(c.sponsorTier) > order.indexOf(best) ? c.sponsorTier : best;
    }, 'ENTRY'),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS PRIVADOS
// ─────────────────────────────────────────────────────────────────────────────

function _checkRivalConflict(pool, player, sponsor, allPlayers, opts = {}) {
  const state = getSponsorState(pool, sponsor.id);
  const rivalrySystem = opts.rivalrySystem;
  if (!rivalrySystem) return false;

  const rivals = rivalrySystem.getRivalsOf?.(player.id) ?? [];
  const intensRivals = rivals.filter(r => r.intensity >= 65);

  for (const rivalry of intensRivals) {
    const isPatrocinado = state.contracts.some(c => c.playerId === rivalry.opponentId);
    if (isPatrocinado) return true;
  }
  return false;
}

function _hadPreviousContract(pool, playerId, sponsorId) {
  return pool.contractArchive.some(c => c.playerId === playerId && c.sponsorId === sponsorId);
}

function _personalityBonus(sponsor, player, opts = {}) {
  const signal = player.phaseTwo?.sponsorSignal ?? 50;
  const rank   = player.rankPosition ?? 200;
  const slams  = _countGrandSlams(player);
  const ifr    = player.phaseTwo?.ifr ?? 50;

  switch (sponsor.personality) {
    case BRAND_PERSONALITIES.CHAMPION_HUNTER:
      return rank <= 1 ? 20 : rank <= 5 ? 12 : rank <= 10 ? 6 : 0;

    case BRAND_PERSONALITIES.REBEL_SEEKER:
      const isRebel = ['CONFRONTATIONAL', 'CHARISMATIC'].includes(
        player.personality?.pressPersona
      );
      return isRebel ? 15 : 0;

    case BRAND_PERSONALITIES.HERITAGE:
      return slams >= 3 ? 18 : slams >= 1 ? 10 : 0;

    case BRAND_PERSONALITIES.INNOVATION:
      const age = player.age ?? 25;
      return age <= 22 ? 18 : age <= 25 ? 10 : 0;

    case BRAND_PERSONALITIES.MASS_APPEAL:
      return signal >= 70 ? 12 : signal >= 55 ? 6 : 0;

    case BRAND_PERSONALITIES.UNDERDOG_PATRON:
      return rank >= 51 && rank <= 200 ? 15 : 0;

    case BRAND_PERSONALITIES.SURFACE_EXPERT:
      const surfDepth = player.surfaceIdentity?.depth ?? 0;
      return surfDepth >= 0.7 ? 15 : surfDepth >= 0.4 ? 8 : 0;

    case BRAND_PERSONALITIES.GLOBAL_REACH:
      const bigMarkets = ['US', 'CN', 'IN', 'BR', 'DE', 'GB', 'FR', 'JP'];
      return bigMarkets.includes(player.nationality ?? player.country) ? 12 : 0;

    default:
      return 0;
  }
}

function _personalityReason(sponsor, player, opts = {}) {
  const rank  = player.rankPosition ?? 200;
  const slams = _countGrandSlams(player);
  const age   = player.age ?? 25;
  const ifr   = player.phaseTwo?.ifr ?? 50;

  switch (sponsor.personality) {
    case BRAND_PERSONALITIES.CHAMPION_HUNTER:
      return rank <= 10 ? `Top ${rank} do ranking — exatamente o que a marca quer` : null;
    case BRAND_PERSONALITIES.HERITAGE:
      return slams >= 1 ? `${slams} Grand Slam(s) — histórico valorizado pela marca` : null;
    case BRAND_PERSONALITIES.INNOVATION:
      return age <= 25 ? `Jogador jovem (${age} anos) — alinha com a visão de futuro da marca` : null;
    case BRAND_PERSONALITIES.REBEL_SEEKER:
      return `Perfil de personalidade combina com a identidade da marca`;
    default:
      return null;
  }
}

function _countGrandSlams(player) {
  const hist = Array.isArray(player._seasonHistory) ? player._seasonHistory : [];
  return hist.filter(s => s.titleWon === 'SLAM').length;
}

function _suggestContractType(sponsor, player, annualFee) {
  const tierData = getTierData(sponsor.tier);
  const [, maxFee] = tierData.contractRange;
  const rank = player.rankPosition ?? 200;
  const age  = player.age ?? 25;
  const isProspect = age <= 21 || rank > 150;

  if (isProspect && sponsor.riskTolerance >= 0.5) return 'PROSPECT_DEAL';
  if (sponsor.tier === 'ELITE' && annualFee >= maxFee * 0.7) return 'AMBASSADOR';
  if (sponsor.luxuryBrand) return 'IMAGE';
  if (['RACKET', 'APPAREL'].includes(sponsor.category)) return 'EQUIPMENT';
  if (sponsor.personality === BRAND_PERSONALITIES.CHAMPION_HUNTER && rank <= 20) return 'PERFORMANCE';
  return 'BASE';
}

function _evaluateRenewal(sponsor, player, contract, pool, opts = {}) {
  const { year, allPlayers } = opts;

  // Jogador aposentado ou não encontrado
  if (!player || player.retired) {
    return { renew: false, reason: 'Jogador aposentado' };
  }

  // Recalcula interesse atual
  const interest = computeInterest(sponsor, player, { ...opts, pool, allPlayers });
  if (!interest.eligible) {
    return { renew: false, reason: interest.ineligibleReason };
  }

  // Decisão base: loyaltyFactor + interesse atual
  const baseRenewScore = sponsor.loyaltyFactor * 60 + interest.score * 0.4;

  if (baseRenewScore < 40) {
    return { renew: false, reason: 'Interesse insuficiente para renovação' };
  }

  // Calcula novo fee: ajusta pelo sinal atual
  const tierData = getTierData(sponsor.tier);
  const [minFee, maxFee] = tierData.contractRange;
  const signal = player.phaseTwo?.sponsorSignal ?? 40;
  const signalRatio = clamp(signal / 100, 0, 1);
  const newFee = Math.round(
    (minFee + signalRatio * (maxFee - minFee)) * (0.9 + sponsor.loyaltyFactor * 0.2) / 1000
  ) * 1000;

  const [minDur, maxDur] = CONTRACT_TYPES[contract.contractType]?.durationRange ?? [1, 2];
  const newDuration = sponsor.loyaltyFactor >= 0.7 ? Math.min(maxDur, contract.duration + 1) : minDur;

  return { renew: true, newFee, newDuration };
}

function _resolveOffers(offers, allPlayers, pool, year) {
  const accepted  = [];
  const rejected  = [];

  // Agrupa por jogador
  const offersByPlayer = {};
  for (const offer of offers) {
    if (!offersByPlayer[offer.playerId]) offersByPlayer[offer.playerId] = [];
    offersByPlayer[offer.playerId].push(offer);
  }

  for (const [playerId, playerOffers] of Object.entries(offersByPlayer)) {
    const player = allPlayers.find(p => p.id === playerId);
    if (!player) continue;

    // Agrupa por categoria (jogador só pode ter 1 por categoria)
    const byCategory = {};
    for (const offer of playerOffers) {
      if (!byCategory[offer.category]) byCategory[offer.category] = [];
      byCategory[offer.category].push(offer);
    }

    for (const [category, catOffers] of Object.entries(byCategory)) {
      // Verifica se já tem contrato nessa categoria (pode ter sido assinado nesta rodada)
      const alreadySigned = accepted.some(
        a => a.playerId === playerId && a.category === category
      );
      if (alreadySigned) {
        rejected.push(...catOffers);
        continue;
      }

      // IA do jogador: escolhe a melhor oferta baseado na personalidade
      const chosen = _aiChooseOffer(player, catOffers);
      if (chosen) {
        accepted.push(chosen);
        rejected.push(...catOffers.filter(o => o.id !== chosen.id));
      } else {
        rejected.push(...catOffers);
      }
    }
  }

  return { acceptedOffers: accepted, rejectedOffers: rejected };
}

function _aiChooseOffer(player, offers) {
  if (!offers.length) return null;

  const pressPersona  = player.personality?.pressPersona;
  const finance       = player.finance;
  const budget        = finance?.budget ?? 0;
  const inCrisis      = budget < -50_000;

  // Em crise financeira: aceita qualquer oferta válida
  if (inCrisis) {
    return offers.sort((a, b) => b.annualFee - a.annualFee)[0];
  }

  // SHOWMAN: prefere marcas de alto perfil (tier ELITE/PREMIUM) mesmo com fee menor
  if (pressPersona === 'SHOWMAN') {
    const elite = offers.filter(o => o.sponsorTier === 'ELITE');
    if (elite.length) return elite.sort((a, b) => b.interestScore - a.interestScore)[0];
    const premium = offers.filter(o => o.sponsorTier === 'PREMIUM');
    if (premium.length) return premium.sort((a, b) => b.annualFee - a.annualFee)[0];
  }

  // INTELLECTUAL / RESERVED: prefere contratos longos e estáveis
  if (['INTELLECTUAL', 'RESERVED'].includes(pressPersona)) {
    return offers.sort((a, b) => b.duration - a.duration || b.annualFee - a.annualFee)[0];
  }

  // CONFRONTATIONAL: pode rejeitar marcas conservadoras
  if (pressPersona === 'CONFRONTATIONAL') {
    const nonConservative = offers.filter(o => {
      const sponsor = getSponsorById(o.sponsorId);
      return sponsor && !sponsor.conservativeImage;
    });
    if (nonConservative.length) {
      return nonConservative.sort((a, b) => b.annualFee - a.annualFee)[0];
    }
    // Aceita conservadora se não há alternativa (e chance de 40%)
    if (Math.random() > 0.4) return null;
  }

  // Default: maior fee
  return offers.sort((a, b) => b.annualFee - a.annualFee)[0];
}

function _offerToContract(offer, year) {
  return {
    id:           `contract_${uid()}`,
    sponsorId:    offer.sponsorId,
    sponsorName:  offer.sponsorName,
    sponsorTier:  offer.sponsorTier,
    category:     offer.category,
    playerId:     offer.playerId,
    playerName:   offer.playerName,
    contractType: offer.contractType,
    annualFee:    offer.annualFee,
    duration:     offer.duration,
    seasonSigned: year,
    logo:         offer.logo,
    tagline:      offer.tagline,
    brandIdentity: offer.brandIdentity ?? null,
    campaignConcept: offer.campaignConcept ?? null,
    fitSummary:   offer.fitSummary ?? null,
    clauses:      offer.clauses ?? null,
    clauseSummary: offer.clauseSummary ?? summarizeContractClauses(offer.clauses),
    bonuses:      flattenBonusAmounts(offer.clauses, CONTRACT_TYPES[offer.contractType]?.bonusTriggers ?? null),
  };
}

