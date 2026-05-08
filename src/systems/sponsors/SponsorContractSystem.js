/**
 * SponsorContractSystem.js — Fase 4: Sistema de Contratos
 *
 * Camada de execução que conecta SponsorPool (Fase 3) ao universo vivo:
 *
 *   4.1  Efeitos imediatos da assinatura
 *          → budget do jogador, marketability, categoria de equipamento,
 *            bônus por AMBASSADOR/PERFORMANCE, notícia no NewsEngine
 *
 *   4.2  Fluxo completo de oferta e negociação
 *          → geração de interesse, formação de oferta com competição,
 *            decisão da IA, assinatura com todos os efeitos
 *
 *   4.3  Monitoramento mid-season (chamado após cada torneio)
 *          → verificar top-10, lesão longa, escândalo, rival GS
 *            e disparar consequências em tempo real
 *
 *   4.4  Renovação e rescisão com três desfechos
 *          → RENOVAÇÃO automática, NEGOCIAÇÃO com contra-proposta,
 *            RESCISÃO narrativa (ELITE gera crise)
 *
 *   4.5  Mercado livre e leilão de talentos
 *          → janela anual com até 2 rodadas de contra-oferta,
 *            disputas entre marcas viram notícia especulativa
 *
 * INTEGRAÇÃO:
 *   UniverseManager ADVANCE_YEAR   → runSponsorshipWindow(state)
 *   UniverseManager SeasonPulse    → runSponsorshipPulse(state, pulseResult)
 *   UniverseManager FINISH_TOURNAMENT → monitorContracts(state, tournament)
 *   UniverseManager APPLY_RETIREMENT  → handleRetirementSponsors(state, player)
 *
 * EXPORTS PRINCIPAIS:
 *   runSponsorshipWindow(state)         → { state, news, chronicleEvents }
 *   runSponsorshipPulse(state, pulseResult) → { state, news, chronicleEvents }
 *   monitorContracts(state, opts)       → { state, news, bonuses }
 *   handleRetirementSponsors(state, player) → { state, news }
 *   applySigningEffects(state, player, contract) → state
 *   buildSponsorNewsArticles(events, state) → Article[]
 *   buildSponsorChronicleEvents(events, players) → ChronicleEvent[]
 *   getSponsorshipProfile(pool, player) → SponsorshipProfile
 */

import {
  SPONSOR_CATALOG,
  SPONSOR_TIERS,
  getSponsorById,
  getTierData,
  getContractRange,
} from './SponsorProfiles.js';

import {
  initSponsorPool,
  getSponsorState,
  getPlayerContracts,
  getPlayerContractInCategory,
  canSignWithSponsor,
  signContract,
  terminateContract,
  computeInterest,
  generateOffer,
  processSponsorSeason,
  applyScandal,
  applyRetirement,
  checkPerformanceDrop,
  checkLongInjury,
  onRivalWonGrandSlam,
  getFullContractHistory,
  getSponsorshipEarnings,
  getUrgentSponsors,
  CONTRACT_TYPES,
  TERMINATION_REASONS,
} from './SponsorPool.js';

import { initPlayerFinance } from '../finance/FinanceSystem.js';
import { JOURNALISTS } from '../press/NewsEngine.js';
import { getSponsorIdentity } from './SponsorIdentity.js';
import {
  buildContractClauses,
  flattenBonusAmounts,
  summarizeContractClauses,
} from './SponsorContractClauses.js';
import {
  recordSponsorRenewal,
  recordSponsorSigning,
  recordSponsorTermination,
} from './SponsorMemorySystem.js';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

/** Boost de marketability por tier ao assinar contrato */
const MARKETABILITY_BOOST = {
  ENTRY:   1,
  MID:     2,
  PREMIUM: 4,
  ELITE:   8,
};

/** Número máximo de rodadas de contra-oferta no leilão */
const MAX_AUCTION_ROUNDS = 2;

/** Threshold de interesse para gerar notícia especulativa de disputa */
const BIDDING_WAR_THRESHOLD = 72;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
function uid() { return Math.random().toString(36).slice(2, 10); }

function _ensurePool(state) {
  if (!state.sponsorPool) {
    return { ...state, sponsorPool: initSponsorPool() };
  }
  return state;
}

function _findPlayer(state, playerId) {
  return state.players?.find(p => p.id === playerId) ?? null;
}

function _updatePlayer(state, updatedPlayer) {
  return {
    ...state,
    players: state.players.map(p => p.id === updatedPlayer.id ? updatedPlayer : p),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4.1 EFEITOS IMEDIATOS DA ASSINATURA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aplica ao jogador todos os efeitos imediatos de assinar um contrato:
 *   - Crédita fee anual no budget
 *   - Atualiza marketability
 *   - Marca categoria de equipamento no perfil
 *   - Registra no finance.sponsorships
 *
 * @param {object} state      — estado do universo
 * @param {object} player     — objeto do jogador
 * @param {object} contract   — contrato assinado
 * @returns {object} state atualizado
 */
export function applySigningEffects(state, player, contract) {
  const sponsor = getSponsorById(contract.sponsorId);
  if (!sponsor) return state;

  let updatedPlayer = { ...player };
  initPlayerFinance(updatedPlayer);

  // ── Crédito financeiro ────────────────────────────────────────────────────
  updatedPlayer.finance.budget                += contract.annualFee;
  updatedPlayer.finance.currentSeasonEarnings += contract.annualFee;
  updatedPlayer.finance.careerEarnings        += contract.annualFee;
  updatedPlayer.finance.sponsorshipEarnings    =
    (updatedPlayer.finance.sponsorshipEarnings ?? 0) + contract.annualFee;

  // Histórico de patrocínio por temporada
  const yr = contract.seasonSigned ?? state.year ?? 0;
  updatedPlayer.finance.sponsorshipBySeason = updatedPlayer.finance.sponsorshipBySeason ?? {};
  updatedPlayer.finance.sponsorshipBySeason[yr] =
    (updatedPlayer.finance.sponsorshipBySeason[yr] ?? 0) + contract.annualFee;

  // ── Marketability boost ───────────────────────────────────────────────────
  const boost = MARKETABILITY_BOOST[contract.sponsorTier] ?? 1;
  if (updatedPlayer.personality?.marketability) {
    updatedPlayer.personality = {
      ...updatedPlayer.personality,
      marketability: {
        ...updatedPlayer.personality.marketability,
        score: clamp(
          (updatedPlayer.personality.marketability.score ?? 30) + boost,
          0, 100
        ),
      },
    };
  }

  // ── Categoria de equipamento ──────────────────────────────────────────────
  if (contract.category === 'RACKET') {
    updatedPlayer.equipment = {
      ...(updatedPlayer.equipment ?? {}),
      racketBrand:   sponsor.name,
      racketTier:    contract.sponsorTier,
      racketLogo:    sponsor.logo,
    };
  }
  if (contract.category === 'APPAREL') {
    updatedPlayer.equipment = {
      ...(updatedPlayer.equipment ?? {}),
      apparelBrand:  sponsor.name,
      apparelTier:   contract.sponsorTier,
      apparelLogo:   sponsor.logo,
    };
  }

  // ── Registro de contratos ativos no perfil do jogador ────────────────────
  updatedPlayer.activeContracts = updatedPlayer.activeContracts ?? [];
  updatedPlayer.activeContracts = [
    ...updatedPlayer.activeContracts.filter(c => c.category !== contract.category),
    {
      contractId:   contract.id,
      sponsorId:    contract.sponsorId,
      sponsorName:  sponsor.name,
      sponsorLogo:  sponsor.logo,
      category:     contract.category,
      tier:         contract.sponsorTier,
      annualFee:    contract.annualFee,
      contractType: contract.contractType,
      duration:     contract.duration,
      seasonSigned: contract.seasonSigned,
      campaignConcept: contract.campaignConcept ?? null,
      fitSummary:   contract.fitSummary ?? null,
      clauses:      contract.clauses ?? null,
      clauseSummary: contract.clauseSummary ?? summarizeContractClauses(contract.clauses),
    },
  ];

  updatedPlayer = recordSponsorSigning(updatedPlayer, contract, { year: contract.seasonSigned ?? state.year ?? null });

  return _updatePlayer(state, updatedPlayer);
}

/**
 * Remove do perfil do jogador a referência a um contrato encerrado.
 */
export function applyTerminationEffects(state, player, contract) {
  let updatedPlayer = {
    ...player,
    activeContracts: (player.activeContracts ?? []).filter(
      c => c.contractId !== contract.id
    ),
  };

  // Marketability recua levemente se era ELITE (perda de prestígio)
  if (contract.sponsorTier === 'ELITE' && updatedPlayer.personality?.marketability) {
    updatedPlayer.personality = {
      ...updatedPlayer.personality,
      marketability: {
        ...updatedPlayer.personality.marketability,
        score: clamp(updatedPlayer.personality.marketability.score - 3, 0, 100),
      },
    };
  }

  if (!contract._skipSponsorMemory) {
    updatedPlayer = recordSponsorTermination(
      updatedPlayer,
      contract,
      contract.terminationReason ?? contract._terminationReason ?? TERMINATION_REASONS.EXPIRED,
      { year: contract.terminatedYear ?? state.year ?? null }
    );
  }

  return _updatePlayer(state, updatedPlayer);
}

function applyRenewalMemory(state, playerId, oldContract, newContract, year) {
  const player = _findPlayer(state, playerId);
  if (!player) return state;
  return _updatePlayer(state, recordSponsorRenewal(player, oldContract, newContract, { year }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 4.2 FLUXO COMPLETO DE ASSINATURA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Assina um contrato e aplica todos os efeitos ao universo.
 * Versão high-level que orquestra pool + jogador + notícia.
 *
 * @param {object} state    — estado do universo
 * @param {object} offer    — oferta gerada por generateOffer()
 * @returns {{ state, article }}
 */
export function executeContractSigning(state, offer) {
  state = _ensurePool(state);

  const player = _findPlayer(state, offer.playerId);
  if (!player) return { state, article: null };
  const sponsor = getSponsorById(offer.sponsorId);

  // Criar contrato a partir da oferta
  const contract = {
    id:           `contract_${uid()}`,
    sponsorId:    offer.sponsorId,
    sponsorName:  offer.sponsorName,
    sponsorTier:  offer.sponsorTier,
    category:     offer.category,
    playerId:     offer.playerId,
    playerName:   offer.playerName,
    contractType: offer.contractType,
    annualFee:    offer.annualFee,
    baseFee:      offer.annualFee,   // ← fee original para escada de prospect
    duration:     offer.duration,
    seasonSigned: state.year ?? offer.seasonOffered,
    logo:         offer.logo,
    tagline:      offer.tagline,
    brandIdentity: offer.brandIdentity ?? getSponsorIdentity(getSponsorById(offer.sponsorId)),
    campaignConcept: offer.campaignConcept ?? null,
    fitSummary:   offer.fitSummary ?? null,
    clauses:      offer.clauses ?? buildContractClauses({
      sponsor,
      player,
      contractType: offer.contractType,
      annualFee: offer.annualFee,
      duration: offer.duration,
      campaignConcept: offer.campaignConcept ?? null,
    }),
    clauseSummary: offer.clauseSummary ?? null,
    bonuses:      null,
  };
  contract.clauseSummary = contract.clauseSummary ?? summarizeContractClauses(contract.clauses);
  contract.bonuses = flattenBonusAmounts(contract.clauses, CONTRACT_TYPES[offer.contractType]?.bonusTriggers ?? null);

  // Atualiza pool
  const updatedPool = signContract(state.sponsorPool, contract);
  state = { ...state, sponsorPool: updatedPool };

  // Efeitos no jogador
  state = applySigningEffects(state, player, contract);

  // Notícia
  const article = _buildSigningArticle(contract, player, state);

  return { state, article, contract };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4.3 MONITORAMENTO MID-SEASON
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifica eventos que afetam contratos ativos após cada torneio.
 * Deve ser chamado no FINISH_TOURNAMENT do UniverseManager.
 *
 * Verifica para cada jogador:
 *   — Bônus de performance disparados (top-10, título)
 *   — Queda de performance → rescisão antecipada
 *   — Lesão longa → rescisão / suspensão
 *   — Rival venceu Grand Slam → evento narrativo
 *
 * @param {object} state
 * @param {object} opts — { tournament, grandSlamWinnerId, injuredPlayers }
 * @returns {{ state, news: Article[], bonuses: BonusEvent[] }}
 */
export function monitorContracts(state, opts = {}) {
  state = _ensurePool(state);

  const { tournament, grandSlamWinnerId, injuredPlayers = [] } = opts;
  const allPlayers = state.players ?? [];
  const year       = state.year ?? 0;
  const news       = [];
  const bonuses    = [];

  // ── Bônus de performance (PERFORMANCE contracts) ─────────────────────────
  for (const player of allPlayers) {
    const playerContracts = getPlayerContracts(state.sponsorPool, player.id);
    const perfContracts   = playerContracts.filter(c => c.contractType === 'PERFORMANCE');

    for (const contract of perfContracts) {
      const bonusTriggers = contract.bonuses ?? CONTRACT_TYPES.PERFORMANCE.bonusTriggers;
      let totalBonus = 0;
      const triggers = [];

      // Top 10 atingido
      if ((player.rankPosition ?? 999) <= 10 && !(contract._top10Awarded)) {
        totalBonus += bonusTriggers.TOP_10 ?? 0;
        triggers.push('TOP_10');
      }

      // Grand Slam title
      if (grandSlamWinnerId === player.id) {
        totalBonus += bonusTriggers.GRAND_SLAM_TITLE ?? 0;
        triggers.push('GRAND_SLAM_TITLE');
      }

      // Masters title
      if (tournament?.category === 'MASTERS_1000' && tournament?.winnerId === player.id) {
        totalBonus += bonusTriggers.MASTERS_TITLE ?? 0;
        triggers.push('MASTERS_TITLE');
      }

      if (totalBonus > 0) {
        let updatedPlayer = { ..._findPlayer(state, player.id) };
        initPlayerFinance(updatedPlayer);
        updatedPlayer.finance.budget                += totalBonus;
        updatedPlayer.finance.currentSeasonEarnings += totalBonus;
        updatedPlayer.finance.careerEarnings        += totalBonus;
        updatedPlayer.finance.sponsorshipEarnings    =
          (updatedPlayer.finance.sponsorshipEarnings ?? 0) + totalBonus;

        // Marcar top10 como pago (evita dupla contagem na temporada)
        if (triggers.includes('TOP_10')) {
          const idx = state.sponsorPool.states[contract.sponsorId]?.contracts
            .findIndex(c => c.id === contract.id);
          if (idx !== undefined && idx >= 0) {
            state.sponsorPool.states[contract.sponsorId].contracts[idx] = {
              ...contract,
              _top10Awarded: true,
            };
          }
        }

        state = _updatePlayer(state, updatedPlayer);
        bonuses.push({
          playerId:   player.id,
          playerName: player.name,
          sponsorId:  contract.sponsorId,
          sponsorName: contract.sponsorName,
          amount:     totalBonus,
          triggers,
          year,
        });

        // Notícia de bônus de performance
        if (totalBonus >= 150_000) {
          news.push(_buildBonusArticle(player, contract, totalBonus, triggers, state));
        }
      }
    }
  }

  // ── Prospect Deal: verificar escada de gatilhos ───────────────────────────
  // REGRA: cada milestone é independente e sempre calculado sobre baseFee.
  // O fee final = baseFee × (maior multiplier já desbloqueado).
  // Só dispara quando um milestone MAIOR que o atual é atingido.
  // Isso previne: (a) compounding entre milestones, (b) disparo fora de ordem.
  for (const player of allPlayers) {
    const playerContracts = getPlayerContracts(state.sponsorPool, player.id);
    const prospectContracts = playerContracts.filter(c => c.contractType === 'PROSPECT_DEAL');

    for (const contract of prospectContracts) {
      const rank   = player.rankPosition ?? 999;
      const ladder = CONTRACT_TYPES.PROSPECT_DEAL.ladderTriggers;

      // Determina o maior milestone que o jogador já atingiu agora
      let targetMultiplier = 1;
      let targetMilestone  = null;
      if      (rank <= 5)  { targetMultiplier = ladder.TOP_5;  targetMilestone = 'TOP_5';  }
      else if (rank <= 10) { targetMultiplier = ladder.TOP_10; targetMilestone = 'TOP_10'; }
      else if (rank <= 50) { targetMultiplier = ladder.TOP_50; targetMilestone = 'TOP_50'; }

      if (!targetMilestone) continue; // jogador fora do top 50 — nada a fazer

      // Verifica se este milestone já foi desbloqueado
      const stateKey     = `_${targetMilestone.toLowerCase()}Unlocked`;
      const alreadyDone  = !!contract[stateKey];
      if (alreadyDone) continue;

      // Calcula o novo fee a partir do baseFee original (nunca do fee atual)
      const baseFee  = contract.baseFee ?? contract.annualFee; // fallback para contratos antigos
      const newFee   = Math.round(baseFee * targetMultiplier / 1000) * 1000;
      const delta    = newFee - contract.annualFee;

      // Atualizar contrato no pool — marca TODOS os milestones menores também
      // (previne disparo out-of-order em torneios futuros)
      const sponsorState = state.sponsorPool.states[contract.sponsorId];
      if (sponsorState) {
        const idx = sponsorState.contracts.findIndex(c => c.id === contract.id);
        if (idx >= 0) {
          sponsorState.contracts[idx] = {
            ...contract,
            baseFee:           baseFee,
            annualFee:         newFee,
            _top50Unlocked:    true,   // sempre marca todos os inferiores
            _top10Unlocked:    targetMilestone === 'TOP_10' || targetMilestone === 'TOP_5',
            _top5Unlocked:     targetMilestone === 'TOP_5',
          };
          sponsorState.budgetUsed = Math.max(0, (sponsorState.budgetUsed ?? 0) + delta);
        }
      }

      // Crédito ao jogador (apenas se o fee subiu)
      if (delta > 0) {
        let updatedPlayer = { ..._findPlayer(state, player.id) };
        initPlayerFinance(updatedPlayer);
        updatedPlayer.finance.budget             = (updatedPlayer.finance.budget ?? 0) + delta;
        updatedPlayer.finance.sponsorshipEarnings = (updatedPlayer.finance.sponsorshipEarnings ?? 0) + delta;
        state = _updatePlayer(state, updatedPlayer);
      }

      // Notícia
      news.push(_buildProspectLadderArticle(player, contract, newFee, targetMilestone, state));

      bonuses.push({
        type:        'PROSPECT_LADDER',
        playerId:    player.id,
        playerName:  player.name,
        sponsorName: contract.sponsorName,
        milestone:   targetMilestone,
        oldFee:      contract.annualFee,
        newFee,
        year,
      });
    }
  }

  // ── Rival venceu Grand Slam ───────────────────────────────────────────────
  if (grandSlamWinnerId) {
    const { updatedPool, events: rivalEvents } = onRivalWonGrandSlam(
      state.sponsorPool, grandSlamWinnerId, allPlayers, year
    );
    state = { ...state, sponsorPool: updatedPool };

    for (const ev of rivalEvents) {
      // Evento narrativo — gera notícia especulativa de "marca reavalia"
      if (Math.random() < 0.4) {
        news.push(_buildRivalGSArticle(ev, state));
      }
    }
  }

  // ── Lesões longas ─────────────────────────────────────────────────────────
  for (const injuredPlayer of injuredPlayers) {
    const injuryMonths = injuredPlayer.injury?.monthsOut ?? 0;
    if (injuryMonths < 6) continue;

    const player = _findPlayer(state, injuredPlayer.id);
    if (!player) continue;

    const { updatedPool, terminatedContracts } = checkLongInjury(
      state.sponsorPool, player, injuryMonths, year
    );
    state = { ...state, sponsorPool: updatedPool };

    for (const contract of terminatedContracts) {
      state = applyTerminationEffects(state, player, { ...contract, _terminationReason: TERMINATION_REASONS.INJURY_LONG, terminatedYear: year });
      news.push(_buildInjuryTerminationArticle(player, contract, injuryMonths, state));
    }
  }

  return { state, news, bonuses };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4.4 RENOVAÇÃO E RESCISÃO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Processa renovações e rescisões de contratos vencendo.
 * Retorna três categorias de desfecho com artigos narrativos.
 *
 * @param {object} state
 * @param {object[]} expiringContracts — contratos que vencem nesta temporada
 * @returns {{ state, renewals, negotiations, terminations, news }}
 */
export function processContractRenewals(state, expiringContracts) {
  state = _ensurePool(state);

  const renewals     = [];
  const negotiations = [];
  const terminations = [];
  const news         = [];
  const year         = state.year ?? 0;

  for (const contract of expiringContracts) {
    const player  = _findPlayer(state, contract.playerId);
    const sponsor = getSponsorById(contract.sponsorId);
    if (!player || !sponsor) continue;

    const interest = computeInterest(sponsor, player, {
      pool: state.sponsorPool,
      allPlayers: state.players,
      year,
    });

    const currentSignal = player.phaseTwo?.sponsorSignal ?? 40;
    const tierData      = getTierData(sponsor.tier);
    const [minFee, maxFee] = tierData.contractRange;

    // Calcula novo fee baseado no sinal atual
    const signalRatio = clamp(currentSignal / 100, 0, 1);
    const renewFee    = Math.round(
      (minFee + signalRatio * (maxFee - minFee)) * (0.9 + sponsor.loyaltyFactor * 0.2) / 1000
    ) * 1000;

    const feeDelta    = renewFee - contract.annualFee;
    const feeDropPct  = feeDelta < 0 ? Math.abs(feeDelta / contract.annualFee) : 0;

    // ── Decidir desfecho ────────────────────────────────────────────────────
    if (!interest.eligible || interest.score < 30) {
      // RESCISÃO: marca não quer renovar
      const { updatedPool } = terminateContract(
        state.sponsorPool, contract.id, TERMINATION_REASONS.EXPIRED, year
      );
      state = { ...state, sponsorPool: updatedPool };
      state = applyTerminationEffects(state, player, contract);
      terminations.push({ contract, player, sponsor, reason: interest.ineligibleReason });
      news.push(_buildTerminationArticle(player, contract, sponsor, interest.ineligibleReason, state));

    } else if (feeDropPct > 0.30 && sponsor.loyaltyFactor < 0.65) {
      // NEGOCIAÇÃO: marca quer renovar mas fee cai mais de 30%
      const counterOffer = Math.round(contract.annualFee * 0.85 / 1000) * 1000; // jogador pede 85%
      const accepted     = renewFee >= counterOffer || sponsor.loyaltyFactor >= 0.7;
      const finalFee     = accepted ? Math.max(renewFee, counterOffer) : renewFee;

      if (accepted) {
        const newContract = {
          ...contract,
          id:           `contract_${uid()}`,
          annualFee:    finalFee,
          baseFee:      contract.baseFee ?? contract.annualFee, // preserva base original
          duration:     Math.max(1, contract.duration - 1),
          seasonSigned: year,
          renewedFrom:  contract.id,
          negotiated:   true,
        };
        const { updatedPool } = terminateContract(
          state.sponsorPool, contract.id, TERMINATION_REASONS.EXPIRED, year
        );
        state = { ...state, sponsorPool: signContract(updatedPool, newContract) };
        state = applyTerminationEffects(state, player, { ...contract, _skipSponsorMemory: true, terminatedYear: year });
        state = applySigningEffects(state, _findPlayer(state, player.id), newContract);
        state = applyRenewalMemory(state, player.id, contract, newContract, year);
        negotiations.push({ type: 'NEGOTIATED', contract: newContract, oldContract: contract });
        news.push(_buildNegotiationArticle(player, contract, newContract, sponsor, state));
      } else {
        const { updatedPool } = terminateContract(
          state.sponsorPool, contract.id, TERMINATION_REASONS.EXPIRED, year
        );
        state = { ...state, sponsorPool: updatedPool };
        state = applyTerminationEffects(state, player, { ...contract, _terminationReason: 'NEGOTIATION_FAILED', terminatedYear: year });
        negotiations.push({ type: 'NEGOTIATION_FAILED', contract, player, sponsor });
        news.push(_buildTerminationArticle(player, contract, sponsor, 'Negociação não chegou a acordo', state));
      }

    } else {
      // RENOVAÇÃO automática
      const newDuration = sponsor.loyaltyFactor >= 0.7
        ? Math.min(CONTRACT_TYPES[contract.contractType]?.durationRange?.[1] ?? 3, contract.duration + 1)
        : contract.duration;

      const newContract = {
        ...contract,
        id:           `contract_${uid()}`,
        annualFee:    renewFee,
        baseFee:      contract.baseFee ?? contract.annualFee, // preserva base original
        duration:     newDuration,
        seasonSigned: year,
        renewedFrom:  contract.id,
      };
      const { updatedPool } = terminateContract(
        state.sponsorPool, contract.id, TERMINATION_REASONS.EXPIRED, year
      );
      state = { ...state, sponsorPool: signContract(updatedPool, newContract) };
      state = applyTerminationEffects(state, player, { ...contract, _skipSponsorMemory: true, terminatedYear: year });
      state = applySigningEffects(state, _findPlayer(state, player.id), newContract);
      state = applyRenewalMemory(state, player.id, contract, newContract, year);
      renewals.push({ contract: newContract, oldContract: contract });

      // Notícia só se renovação é significativa (ELITE ou fee subiu muito)
      if (contract.sponsorTier === 'ELITE' || feeDelta > 200_000) {
        news.push(_buildRenewalArticle(player, contract, newContract, sponsor, state));
      }
    }
  }

  return { state, renewals, negotiations, terminations, news };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4.5 MERCADO LIVRE E LEILÃO DE TALENTOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Executa a janela anual de transferências de patrocínio.
 *
 * Processo:
 *   1. Identificar jogadores no mercado livre (sem contrato em categoria)
 *   2. Marcas com vagas publicam interesse
 *   3. Marcas concorrentes fazem contra-ofertas (até MAX_AUCTION_ROUNDS)
 *   4. Disputas viram notícia especulativa antes do anúncio
 *   5. Contratos assinados com todos os efeitos
 *
 * @param {object} state
 * @returns {{ state, signedContracts, biddingWars, news }}
 */
export function runTransferWindow(state) {
  state = _ensurePool(state);

  const allPlayers     = state.players ?? [];
  const year           = state.year ?? 0;
  const signedContracts = [];
  const biddingWars    = [];
  const news           = [];

  // ── Passo 1: Mapa de candidatos por categoria ────────────────────────────
  const candidatesByCategory = {};

  for (const sponsor of SPONSOR_CATALOG) {
    const state_s  = getSponsorState(state.sponsorPool, sponsor.id);
    const budgetLeft = sponsor.budget - state_s.budgetUsed;
    const [minFee] = getContractRange(sponsor.tier);
    if (budgetLeft < minFee || state_s.contracts.length >= sponsor.maxContracts) continue;

    if (!candidatesByCategory[sponsor.category]) {
      candidatesByCategory[sponsor.category] = [];
    }

    // Jogadores sem contrato nessa categoria
    // Threshold por tier: ENTRY/MID mais permissivos, ELITE mais seletivos
    const tierThreshold = sponsor.tier === 'ENTRY' ? 28
      : sponsor.tier === 'MID'   ? 35
      : sponsor.tier === 'PREMIUM' ? 42
      : 50; // ELITE

    const eligible = allPlayers
      .filter(p => !p.retired && canSignWithSponsor(state.sponsorPool, p.id, sponsor))
      .map(p => ({
        player:   p,
        interest: computeInterest(sponsor, p, {
          pool: state.sponsorPool,
          allPlayers,
          year,
        }),
      }))
      .filter(c => c.interest.eligible && c.interest.score >= tierThreshold)
      .sort((a, b) => b.interest.score - a.interest.score)
      .slice(0, 10);

    for (const { player, interest } of eligible) {
      const existing = candidatesByCategory[sponsor.category].find(c => c.playerId === player.id);
      if (existing) {
        existing.interestedSponsors.push({ sponsor, interest });
      } else {
        candidatesByCategory[sponsor.category].push({
          playerId: player.id,
          player,
          interestedSponsors: [{ sponsor, interest }],
        });
      }
    }
  }

  // ── Passo 2: Leilão com contra-ofertas ───────────────────────────────────
  for (const [category, candidates] of Object.entries(candidatesByCategory)) {
    for (const candidate of candidates) {
      const { player, interestedSponsors } = candidate;

      // Já assinou nesta janela (pode ter sido em categoria diferente)
      if (signedContracts.some(c => c.playerId === player.id && c.category === category)) continue;

      // Verificar novamente se o jogador ainda pode assinar (estado mudou)
      const stillEligible = interestedSponsors.filter(({ sponsor }) =>
        canSignWithSponsor(state.sponsorPool, player.id, sponsor)
      );
      if (!stillEligible.length) continue;

      // Detectar disputa (2+ marcas do mesmo tier com interesse alto)
      const topTierBidders = stillEligible.filter(({ interest }) => interest.score >= BIDDING_WAR_THRESHOLD);
      const isBiddingWar   = topTierBidders.length >= 2;

      if (isBiddingWar) {
        // Notícia especulativa antes do anúncio
        const bidderNames = topTierBidders.slice(0, 2).map(b => b.sponsor.name);
        news.push(_buildBiddingWarSpecArticle(player, bidderNames, category, state));
        biddingWars.push({
          playerId:   player.id,
          playerName: player.name,
          category,
          bidders:    bidderNames,
          year,
        });
      }

      // Rodadas de leilão: cada marca eleva a oferta para superar a anterior
      let bestOffer = null;
      let roundOffers = [];

      for (let round = 0; round < MAX_AUCTION_ROUNDS; round++) {
        roundOffers = [];

        for (const { sponsor } of stillEligible) {
          const sState = getSponsorState(state.sponsorPool, sponsor.id);
          const budgetLeft = sponsor.budget - sState.budgetUsed;
          const [minFee, maxFee] = getContractRange(sponsor.tier);
          if (budgetLeft < minFee) continue;

          // Na rodada 2, só os que estão abaixo do líder tentam superar
          if (round > 0 && bestOffer && bestOffer.annualFee >= maxFee * 0.95) continue;

          // Gera oferta com urgência elevada em rodadas posteriores
          const urgencyBoost  = round * 0.15;
          const stateWithBoost = {
            ...state.sponsorPool,
            states: {
              ...state.sponsorPool.states,
              [sponsor.id]: {
                ...sState,
                urgency: Math.min(1, sState.urgency + urgencyBoost),
              },
            },
          };
          const poolWithBoost = stateWithBoost;
          const offer = generateOffer(sponsor, player, poolWithBoost, { allPlayers, year });
          if (offer) roundOffers.push(offer);
        }

        // Melhor oferta desta rodada
        const roundBest = roundOffers.sort((a, b) => b.annualFee - a.annualFee)[0];
        if (roundBest && (!bestOffer || roundBest.annualFee > bestOffer.annualFee)) {
          bestOffer = roundBest;
        }
      }

      if (!bestOffer) continue;

      // Decisão do jogador entre todas as ofertas
      const allOffers = roundOffers.length > 0 ? roundOffers : [bestOffer];
      const chosen    = _playerChooseOffer(player, allOffers);
      if (!chosen) continue;

      // Executar assinatura
      const { state: newState, article, contract } = executeContractSigning(state, chosen);
      state = newState;
      if (article) news.push(article);
      if (contract) signedContracts.push(contract);
    }
  }

  return { state, signedContracts, biddingWars, news };
}

// ─────────────────────────────────────────────────────────────────────────────
// JANELA ANUAL COMPLETA (entry point do ADVANCE_YEAR)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ponto de entrada para o ADVANCE_YEAR do UniverseManager.
 * Executa toda a lógica sazonal de patrocínio em sequência:
 *   1. Processar renovações e rescisões
 *   2. Verificar queda de performance
 *   3. Executar janela de transferências (mercado livre)
 *   4. Gerar eventos para ChronicleEngine
 *
 * @param {object} state — estado completo do universo
 * @returns {{ state, news: Article[], chronicleEvents: ChronicleEvent[] }}
 */
export function runSponsorshipWindow(state, opts = {}) {
  state = _ensurePool(state);

  const year       = state.year ?? 0;
  const allPlayers = state.players ?? [];
  const includeTransferWindow = opts.includeTransferWindow ?? false;

  // ── Urgência: marcas sem contratos ativos entram com urgência máxima ──────
  // Garante que mesmo no ano 2+ sponsors que perderam todos os contratos
  // busquem ativamente novos atletas.
  for (const [sponsorId, sState] of Object.entries(state.sponsorPool.states)) {
    if (sState.contracts.length === 0 && sState.urgency < 0.9) {
      state.sponsorPool.states[sponsorId] = { ...sState, urgency: 1.0 };
    }
  }
  const allNews    = [];
  const chronicleEvents = [];

  // ── Passo 1: Contratos vencendo ──────────────────────────────────────────
  const expiringContracts = [];
  for (const sponsorState of Object.values(state.sponsorPool.states)) {
    for (const contract of sponsorState.contracts) {
      const seasonsElapsed = year - contract.seasonSigned;
      if (seasonsElapsed >= contract.duration) {
        expiringContracts.push(contract);
      }
    }
  }

  if (expiringContracts.length > 0) {
    const renewalResult = processContractRenewals(state, expiringContracts);
    state = renewalResult.state;
    allNews.push(...renewalResult.news);

    // Chronicle: rescisões ELITE são marcos de carreira
    for (const { contract, player, sponsor } of renewalResult.terminations) {
      if (contract.sponsorTier === 'ELITE') {
        chronicleEvents.push(_buildEliteTerminationChronicleEvent(player, contract, sponsor, year));
      }
    }
  }

  // ── Passo 2: Queda de performance ────────────────────────────────────────
  for (const player of allPlayers) {
    const prevSignal = player.phaseTwo?.sponsorSignal ?? 50;
    if (prevSignal < 35) {
      const { updatedPool, terminatedContracts } = checkPerformanceDrop(
        state.sponsorPool, player, year
      );
      state = { ...state, sponsorPool: updatedPool };

      for (const contract of terminatedContracts) {
        state = applyTerminationEffects(state, player, { ...contract, _terminationReason: TERMINATION_REASONS.PERFORMANCE_DROP, terminatedYear: year });
        const sponsor = getSponsorById(contract.sponsorId);
        if (sponsor) {
          allNews.push(_buildTerminationArticle(player, contract, sponsor, 'Queda de performance', state));
        }
      }
    }
  }

  // ── Passo 3: Mercado livre e leilão ──────────────────────────────────────
  // Desde o SeasonPulse, o mercado livre roda preferencialmente mês a mês.
  // Mantemos a opção para saves/fluxos antigos, mas o ADVANCE_YEAR novo desliga.
  if (includeTransferWindow) {
    const windowResult = runTransferWindow(state);
    state = windowResult.state;
    allNews.push(...windowResult.news);

    // Chronicle: primeiro contrato ELITE de um jogador é marco
    for (const contract of windowResult.signedContracts) {
      if (contract.sponsorTier === 'ELITE') {
        const player = _findPlayer(state, contract.playerId);
        if (player) {
          const history = getFullContractHistory(state.sponsorPool, player.id);
          const firstElite = !history.archived.some(c => c.sponsorTier === 'ELITE');
          if (firstElite) {
            chronicleEvents.push(_buildFirstEliteChronicleEvent(player, contract, year));
          }
        }
      }
    }
  }

  // ── Passo 4: Jogador sem patrocinador há 2+ temporadas ───────────────────
  for (const player of allPlayers) {
    if (player.retired) continue;
    const contracts = getPlayerContracts(state.sponsorPool, player.id);
    if (contracts.length === 0) {
      const history = getFullContractHistory(state.sponsorPool, player.id);
      const lastContract = history.archived
        .sort((a, b) => (b.terminatedYear ?? 0) - (a.terminatedYear ?? 0))[0];
      const yearsSince = lastContract ? year - (lastContract.terminatedYear ?? year) : 999;

      if (yearsSince >= 2 && Math.random() < 0.3) {
        allNews.push(_buildForgottenPlayerArticle(player, yearsSince, state));
      }
    }
  }

  // ── Passo 5: Pulso comercial da temporada ───────────────────────────────
  // Só vira notícia quando a carteira comercial conta uma história clara:
  // império, dependência extrema, reconstrução ou risco reputacional.
  allNews.push(...buildCommercialPulseArticles(state, year));

  return { state, news: allNews, chronicleEvents };
}

/**
 * Pulso mensal de patrocínios.
 * Roda a parte viva do mercado durante a temporada: vagas, leilões,
 * performance em queda e marcos comerciais. Renovações contratuais seguem
 * no fechamento anual porque os contratos ainda são medidos por temporada.
 */
export function runSponsorshipPulse(state, pulseResult = {}) {
  state = _ensurePool(state);

  const pulses = pulseResult.pulses ?? [];
  const hasMonthlyPulse = pulses.some(p => p.type === 'MONTHLY');
  if (!hasMonthlyPulse) return { state, news: [], chronicleEvents: [], signedContracts: [] };

  const year = state.year ?? 0;
  const allPlayers = state.players ?? [];
  const news = [];
  const chronicleEvents = [];

  for (const [sponsorId, sState] of Object.entries(state.sponsorPool.states ?? {})) {
    if ((sState.contracts?.length ?? 0) === 0 && sState.urgency < 0.75) {
      state.sponsorPool.states[sponsorId] = { ...sState, urgency: 0.75 };
    }
  }

  for (const player of allPlayers) {
    if (player.retired) continue;
    const prevSignal = player.phaseTwo?.sponsorSignal ?? 50;
    if (prevSignal < 28) {
      const { updatedPool, terminatedContracts } = checkPerformanceDrop(
        state.sponsorPool, player, year
      );
      state = { ...state, sponsorPool: updatedPool };

      for (const contract of terminatedContracts) {
        state = applyTerminationEffects(state, player, { ...contract, _terminationReason: TERMINATION_REASONS.PERFORMANCE_DROP, terminatedYear: year });
        const sponsor = getSponsorById(contract.sponsorId);
        if (sponsor) news.push(_buildTerminationArticle(player, contract, sponsor, 'Queda de performance', state));
      }
    }
  }

  const windowResult = runTransferWindow(state);
  state = windowResult.state;
  news.push(...windowResult.news);

  for (const contract of windowResult.signedContracts) {
    if (contract.sponsorTier !== 'ELITE') continue;
    const player = _findPlayer(state, contract.playerId);
    if (!player) continue;
    const history = getFullContractHistory(state.sponsorPool, player.id);
    const firstElite = !history.archived.some(c => c.sponsorTier === 'ELITE');
    if (firstElite) chronicleEvents.push(_buildFirstEliteChronicleEvent(player, contract, year));
  }

  return {
    state,
    news,
    chronicleEvents,
    signedContracts: windowResult.signedContracts,
    biddingWars: windowResult.biddingWars,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// APOSENTADORIA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Trata os contratos de um jogador que se aposentou.
 * Encerra todos os contratos e gera notícias de despedida.
 */
export function handleRetirementSponsors(state, player) {
  state = _ensurePool(state);

  const year = state.year ?? 0;
  const { updatedPool, releasedSlots } = applyRetirement(state.sponsorPool, player, year);
  state = { ...state, sponsorPool: updatedPool };
  state = _updatePlayer(state, { ...player, activeContracts: [] });

  const news = [];
  const retiredContracts = state.sponsorPool.contractArchive
    .filter(c => c.playerId === player.id && c.terminationReason === TERMINATION_REASONS.RETIREMENT && c.terminatedYear === year);

  if (retiredContracts.length > 0) {
    const eliteContracts = retiredContracts.filter(c => c.sponsorTier === 'ELITE');
    if (eliteContracts.length > 0) {
      news.push(_buildRetirementSponsorArticle(player, eliteContracts, state));
    }
  }

  return { state, news, releasedSlots };
}

// ─────────────────────────────────────────────────────────────────────────────
// ESCNDALO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aplica consequências de escândalo e gera notícias correspondentes.
 */
export function handleScandal(state, player, severity = 0.5) {
  state = _ensurePool(state);

  const year = state.year ?? 0;
  const { updatedPool, lostContracts } = applyScandal(
    state.sponsorPool, player, severity, year
  );
  state = { ...state, sponsorPool: updatedPool };

  const news = [];
  for (const contract of lostContracts) {
    const sponsor = getSponsorById(contract.sponsorId);
    state = applyTerminationEffects(state, _findPlayer(state, player.id), { ...contract, _terminationReason: TERMINATION_REASONS.SCANDAL, terminatedYear: year });
    if (sponsor) {
      news.push(_buildScandalTerminationArticle(player, contract, sponsor, severity, state));
    }
  }

  return { state, news, lostContracts };
}

// ─────────────────────────────────────────────────────────────────────────────
// PERFIL DE PATROCÍNIO (para UnifiedPlayerProfile)
// ─────────────────────────────────────────────────────────────────────────────

function buildCommercialProfile(player, activeContracts, earnings, history) {
  const annual = earnings?.annualActive ?? 0;
  const sorted = [...(activeContracts ?? [])].sort((a, b) => (b.annualFee ?? 0) - (a.annualFee ?? 0));
  const anchor = sorted[0] ?? null;
  const anchorShare = annual > 0 && anchor ? Math.round(((anchor.annualFee ?? 0) / annual) * 100) : 0;
  const categories = Array.from(new Set((activeContracts ?? []).map(c => c.category).filter(Boolean)));
  const tiers = Array.from(new Set((activeContracts ?? []).map(c => c.sponsorTier).filter(Boolean)));
  const eliteCount = activeContracts.filter(c => c.sponsorTier === 'ELITE').length;
  const premiumCount = activeContracts.filter(c => c.sponsorTier === 'PREMIUM').length;
  const mkt = player?.personality?.marketability?.score ?? 30;
  const signal = player?.phaseTwo?.sponsorSignal ?? 0;
  const careerTotal = earnings?.careerTotal ?? player?.finance?.sponsorshipEarnings ?? 0;
  const archived = history?.archived ?? [];
  const ruptures = archived.filter(c => ['SCANDAL', 'PERFORMANCE_DROP', 'INJURY_LONG'].includes(c.terminationReason)).length;

  let archetype = 'Em construção';
  let tone = '#8899AA';
  if (eliteCount >= 2 || annual >= 12_000_000) {
    archetype = 'Império global';
    tone = '#FFD700';
  } else if (eliteCount >= 1 || annual >= 5_000_000) {
    archetype = 'Franquia premium';
    tone = '#60FF90';
  } else if (activeContracts.length >= 3 || categories.length >= 3) {
    archetype = 'Portfólio diversificado';
    tone = '#60C8FF';
  } else if (activeContracts.length === 0 && (history?.total ?? 0) > 0) {
    archetype = 'Nome em reconstrução';
    tone = '#FFB060';
  } else if (activeContracts.length === 0) {
    archetype = 'Ainda sem mercado';
    tone = '#8899AA';
  }

  const concentrationRisk =
    anchorShare >= 70 ? 'alto'
    : anchorShare >= 50 ? 'moderado'
    : activeContracts.length > 0 ? 'baixo'
    : 'nulo';

  const portfolioHealth =
    annual >= 8_000_000 && concentrationRisk !== 'alto' ? 'blindado'
    : annual >= 2_000_000 || activeContracts.length >= 2 ? 'saudável'
    : activeContracts.length > 0 ? 'frágil'
    : 'vazio';

  const runway =
    signal >= 82 && mkt >= 75 ? 'forte expansão'
    : signal >= 65 ? 'crescimento provável'
    : signal >= 45 ? 'estável'
    : 'pressão comercial';

  const headline = anchor
    ? `${anchor.sponsorName} ancora um portfólio ${portfolioHealth}, com ${anchorShare}% da receita anual em uma única marca.`
    : 'Sem contrato ativo, o nome depende de resultado e narrativa pública para voltar ao radar das marcas.';

  const diagnosis = ruptures > 0
    ? `Há ${ruptures} ruptura${ruptures > 1 ? 's' : ''} sensível${ruptures > 1 ? 's' : ''} no histórico, o que torna reputação e regularidade ainda mais importantes.`
    : activeContracts.length >= 2
      ? `A carteira tem ${categories.length} categoria${categories.length !== 1 ? 's' : ''} e reduz a dependência de um único setor.`
      : activeContracts.length === 1
        ? 'O negócio ainda depende muito de uma relação central; a próxima oferta pode mudar o patamar.'
        : 'O potencial comercial existe, mas ainda não virou carteira.';

  return {
    archetype,
    tone,
    annual,
    careerTotal,
    activeCount: activeContracts.length,
    anchorSponsor: anchor ? {
      sponsorId: anchor.sponsorId,
      sponsorName: anchor.sponsorName,
      annualFee: anchor.annualFee,
      tier: anchor.sponsorTier,
      category: anchor.category,
      share: anchorShare,
    } : null,
    anchorShare,
    concentrationRisk,
    portfolioHealth,
    runway,
    categories,
    tiers,
    eliteCount,
    premiumCount,
    ruptureCount: ruptures,
    headline,
    diagnosis,
  };
}

/**
 * Retorna um perfil completo de patrocínio para exibição no perfil do jogador.
 *
 * @param {object} pool
 * @param {object} player
 * @returns {SponsorshipProfile}
 */
export function getSponsorshipProfile(pool, player) {
  const activeContracts = getPlayerContracts(pool, player.id);
  const earnings        = getSponsorshipEarnings(pool, player.id);
  const history         = getFullContractHistory(pool, player.id);

  // Agrupa por categoria para display
  const byCategory = {};
  for (const contract of activeContracts) {
    byCategory[contract.category] = {
      sponsorId:   contract.sponsorId,
      sponsorName: contract.sponsorName,
      sponsorLogo: contract.logo,
      tier:        contract.sponsorTier,
      annualFee:   contract.annualFee,
      contractType: contract.contractType,
      seasonsLeft: contract.duration - ((pool._currentYear ?? contract.seasonSigned) - contract.seasonSigned),
    };
  }

  // Maior contrato da história do jogador
  const biggestEver = history.archived
    .concat(activeContracts)
    .sort((a, b) => b.annualFee - a.annualFee)[0] ?? null;

  // Marca de maior fidelidade (mais renovações)
  const renewalCount = {};
  for (const c of history.archived) {
    if (c.renewedFrom) {
      renewalCount[c.sponsorId] = (renewalCount[c.sponsorId] ?? 0) + 1;
    }
  }
  const mostLoyalSponsorId = Object.entries(renewalCount)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const mostLoyalSponsor   = mostLoyalSponsorId ? getSponsorById(mostLoyalSponsorId) : null;
  const commercialProfile  = buildCommercialProfile(player, activeContracts, earnings, history);

  return {
    activeContracts,
    byCategory,
    earnings,
    commercialProfile,
    totalActiveAnnual: earnings.annualActive,
    careerSponsorshipTotal: earnings.careerTotal,
    highestTier: earnings.highestTier,
    biggestContract: biggestEver
      ? {
          sponsorName: biggestEver.sponsorName,
          annualFee:   biggestEver.annualFee,
          tier:        biggestEver.sponsorTier,
          year:        biggestEver.seasonSigned,
        }
      : null,
    mostLoyalSponsor: mostLoyalSponsor
      ? { name: mostLoyalSponsor.name, logo: mostLoyalSponsor.logo, renewals: renewalCount[mostLoyalSponsorId] }
      : null,
    totalContracts: history.total,
    isWithoutSponsor: activeContracts.length === 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RECORDES PARA HALL OF FAME
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computa recordes de patrocínio para o HallOfFame.
 */
export function computeSponsorRecords(pool, allPlayers) {
  const archive = pool.contractArchive;
  const allContracts = [
    ...archive,
    ...Object.values(pool.states).flatMap(s => s.contracts),
  ];

  // Maior contrato único
  const biggestContract = allContracts
    .sort((a, b) => b.annualFee - a.annualFee)[0] ?? null;

  // Jogador com mais renovações consecutivas
  const renewalChains = {};
  for (const c of allContracts) {
    if (!c.renewedFrom) continue;
    const key = `${c.playerId}_${c.sponsorId}`;
    renewalChains[key] = (renewalChains[key] ?? 0) + 1;
  }
  const topRenewalKey = Object.entries(renewalChains)
    .sort((a, b) => b[1] - a[1])[0];
  const mostRenewals = topRenewalKey
    ? {
        playerId:   topRenewalKey[0].split('_')[0],
        sponsorId:  topRenewalKey[0].split('_')[1],
        renewals:   topRenewalKey[1],
        player:     allPlayers.find(p => p.id === topRenewalKey[0].split('_')[0]),
        sponsor:    getSponsorById(topRenewalKey[0].split('_')[1]),
      }
    : null;

  // Marca que mais apostou em prospects que viraram top 10
  const prospectsByBrand = {};
  for (const c of allContracts.filter(c => c.contractType === 'PROSPECT_DEAL')) {
    const player = allPlayers.find(p => p.id === c.playerId);
    if (player && (player.rankPosition ?? 999) <= 10) {
      prospectsByBrand[c.sponsorId] = (prospectsByBrand[c.sponsorId] ?? 0) + 1;
    }
  }
  const bestProspectBrandId = Object.entries(prospectsByBrand)
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  const bestProspectBrand = bestProspectBrandId
    ? { sponsor: getSponsorById(bestProspectBrandId), prospects: prospectsByBrand[bestProspectBrandId] }
    : null;

  // Jogador mais bem pago no pico (maior fee único)
  const peakFeeByPlayer = {};
  for (const c of allContracts) {
    if (!peakFeeByPlayer[c.playerId] || c.annualFee > peakFeeByPlayer[c.playerId].fee) {
      peakFeeByPlayer[c.playerId] = { fee: c.annualFee, sponsorId: c.sponsorId, year: c.seasonSigned };
    }
  }
  const highestPeakEntry = Object.entries(peakFeeByPlayer)
    .sort((a, b) => b[1].fee - a[1].fee)[0];
  const highestPaidEver = highestPeakEntry
    ? {
        player:    allPlayers.find(p => p.id === highestPeakEntry[0]),
        fee:       highestPeakEntry[1].fee,
        sponsor:   getSponsorById(highestPeakEntry[1].sponsorId),
        year:      highestPeakEntry[1].year,
      }
    : null;

  return {
    biggestContract: biggestContract
      ? {
          annualFee:   biggestContract.annualFee,
          player:      allPlayers.find(p => p.id === biggestContract.playerId),
          sponsor:     getSponsorById(biggestContract.sponsorId),
          year:        biggestContract.seasonSigned,
        }
      : null,
    mostRenewals,
    bestProspectBrand,
    highestPaidEver,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GERAÇÃO DE ARTIGOS — NewsEngine
// ─────────────────────────────────────────────────────────────────────────────

function _buildSigningArticle(contract, player, state) {
  const sponsor  = getSponsorById(contract.sponsorId);
  const isElite  = contract.sponsorTier === 'ELITE';
  const isMid    = ['ENTRY', 'MID'].includes(contract.sponsorTier);
  const journalist = isElite
    ? pick([JOURNALISTS.CARVALHO, JOURNALISTS.FONTAINE])
    : isMid
    ? pick([JOURNALISTS.NAKANO, JOURNALISTS.SANTOS])
    : pick(Object.values(JOURNALISTS));

  const feeStr  = _fmtUSD(contract.annualFee);
  const typeStr = CONTRACT_TYPES[contract.contractType]?.label ?? 'Contrato';
  const identity = contract.brandIdentity ?? getSponsorIdentity(sponsor);
  const concept = contract.campaignConcept;
  const clauseLine = contract.clauseSummary
    ? `O pacote inclui ${contract.clauseSummary}.`
    : null;
  const fitLine = concept?.pitch
    ?? contract.fitSummary
    ?? identity?.summary
    ?? `${sponsor.name} vê encaixe estratégico em ${player.name}.`;

  const headlines = isElite ? [
    `${player.name} fecha acordo de ${feeStr}/ano com ${sponsor.name}`,
    `${sponsor.name} anuncia ${player.name} como novo embaixador global`,
    `Deal histórico: ${player.name} e ${sponsor.name} selam parceria de ${contract.duration} anos`,
  ] : [
    `${player.name} assina com ${sponsor.name}`,
    `${sponsor.name} anuncia contrato com ${player.name}`,
    `${player.name} fecha ${typeStr.toLowerCase()} com ${sponsor.name}`,
  ];

  const bodies = isElite ? [
    `${player.name} é o novo rosto de ${sponsor.name}. O acordo, de ${feeStr} por ano e duração de ${contract.duration} temporada${contract.duration > 1 ? 's' : ''}, coloca o tenista entre os atletas mais bem pagos do circuito. ${fitLine} ${clauseLine ?? ''}`.trim(),
    `A parceria entre ${player.name} e ${sponsor.name} vai além dos courts. Com um contrato de ${feeStr} anuais, a marca prepara uma ${identity?.campaignScale ?? 'campanha global'} em torno de ${identity?.signatureAngle ?? 'imagem competitiva'}. ${clauseLine ?? ''}`.trim(),
  ] : [
    `${sponsor.name} confirma contrato com ${player.name}. O acordo entra em vigor imediatamente. ${fitLine} ${clauseLine ?? ''}`.trim(),
    `${player.name} adiciona ${sponsor.name} ao seu portfólio de patrocinadores. O ${typeStr.toLowerCase()} tem duração de ${contract.duration} temporada${contract.duration > 1 ? 's' : ''} e nasce com o conceito de ${identity?.signatureAngle ?? 'campanha de performance'}. ${clauseLine ?? ''}`.trim(),
  ];

  return {
    id:         `news_${uid()}`,
    type:       isElite ? 'SPONSOR_ELITE' : 'SPONSOR',
    subtype:    'SIGNING',
    priority:   isElite ? 9 : 5,
    headline:   pick(headlines),
    body:       pick(bodies),
    journalist: journalist.id,
    journalistName: journalist.name,
    icon:       '🤝',
    color:      isElite ? '#FFD700' : '#60C8FF',
    playerIds:  [player.id],
    sponsorId:  contract.sponsorId,
    brandWorld: identity?.category?.world ?? null,
    campaignConcept: concept ?? null,
    year:       state.year ?? contract.seasonSigned,
    contractId: contract.id,
    tier:       contract.sponsorTier,
  };
}

function _buildTerminationArticle(player, contract, sponsor, reason, state) {
  const isElite = contract.sponsorTier === 'ELITE';

  const headlines = isElite ? [
    `${sponsor.name} encerra contrato com ${player.name}`,
    `Separação: ${player.name} e ${sponsor.name} encerram parceria`,
    `${sponsor.name} não renova com ${player.name} — mudança de estratégia`,
  ] : [
    `${sponsor.name} não renova com ${player.name}`,
    `${player.name} fica livre na categoria ${contract.category}`,
  ];

  const bodies = isElite ? [
    `A parceria entre ${player.name} e ${sponsor.name} chegou ao fim. Depois de ${contract.duration} temporada${contract.duration > 1 ? 's' : ''}, a marca opta por não renovar. ${reason ? reason + '.' : 'O circuito aguarda o próximo passo do tenista.'} A rescisão de um contrato ELITE raramente passa despercebida — e desta vez não é diferente.`,
    `${sponsor.name} confirma o encerramento do contrato com ${player.name}. A marca não divulgou os motivos, mas fontes próximas indicam ${reason ? reason.toLowerCase() : 'mudança nas prioridades de investimento'}. Para o tenista, começa uma nova fase de mercado.`,
  ] : [
    `${sponsor.name} não renova acordo com ${player.name}. O tenista entra no mercado livre na categoria.`,
  ];

  return {
    id:         `news_${uid()}`,
    type:       isElite ? 'SPONSOR_ELITE' : 'SPONSOR',
    subtype:    'TERMINATION',
    priority:   isElite ? 8 : 3,
    headline:   pick(headlines),
    body:       pick(bodies),
    journalist: isElite ? JOURNALISTS.FONTAINE.id : JOURNALISTS.SANTOS.id,
    journalistName: isElite ? JOURNALISTS.FONTAINE.name : JOURNALISTS.SANTOS.name,
    icon:       isElite ? '💔' : '📋',
    color:      isElite ? '#FF6060' : '#888',
    playerIds:  [player.id],
    sponsorId:  contract.sponsorId,
    year:       state.year ?? 0,
    contractId: contract.id,
    tier:       contract.sponsorTier,
  };
}

function _buildRenewalArticle(player, oldContract, newContract, sponsor, state) {
  const feeUp   = newContract.annualFee > oldContract.annualFee;
  const feeStr  = _fmtUSD(newContract.annualFee);
  const isElite = newContract.sponsorTier === 'ELITE';

  const headlines = [
    `${sponsor.name} renova com ${player.name} — ${feeUp ? 'contrato maior' : 'acordo ajustado'}`,
    `${player.name} segue com ${sponsor.name} por mais ${newContract.duration} temporada${newContract.duration > 1 ? 's' : ''}`,
    isElite
      ? `Renovação ELITE: ${player.name} e ${sponsor.name} estendem parceria`
      : `${sponsor.name} mantém ${player.name} no portfólio`,
  ];

  return {
    id:         `news_${uid()}`,
    type:       'SPONSOR',
    subtype:    'RENEWAL',
    priority:   isElite ? 8 : 4,
    headline:   pick(headlines),
    body:       `${sponsor.name} e ${player.name} renovam contrato por ${newContract.duration} temporada${newContract.duration > 1 ? 's' : ''} no valor de ${feeStr} anuais. ${feeUp ? 'O novo acordo representa um aumento em relação ao contrato anterior.' : 'Os termos foram revisados em linha com a performance recente do atleta.'}`,
    journalist: JOURNALISTS.FONTAINE.id,
    journalistName: JOURNALISTS.FONTAINE.name,
    icon:       '🔄',
    color:      '#60FF90',
    playerIds:  [player.id],
    sponsorId:  newContract.sponsorId,
    year:       state.year ?? 0,
    tier:       newContract.sponsorTier,
  };
}

function _buildNegotiationArticle(player, oldContract, newContract, sponsor, state) {
  return {
    id:         `news_${uid()}`,
    type:       'SPONSOR',
    subtype:    'NEGOTIATION',
    priority:   5,
    headline:   `${player.name} e ${sponsor.name} chegam a acordo após negociação`,
    body:       `Depois de conversas sobre os termos de renovação, ${player.name} e ${sponsor.name} fecharam um novo contrato. O acordo tem duração de ${newContract.duration} temporada${newContract.duration > 1 ? 's' : ''} e valor revisado de ${_fmtUSD(newContract.annualFee)} anuais. Fontes indicam que a negociação foi mais complexa do que o habitual.`,
    journalist: JOURNALISTS.FONTAINE.id,
    journalistName: JOURNALISTS.FONTAINE.name,
    icon:       '🤝',
    color:      '#FFB060',
    playerIds:  [player.id],
    sponsorId:  newContract.sponsorId,
    year:       state.year ?? 0,
    tier:       newContract.sponsorTier,
  };
}

function _buildBiddingWarSpecArticle(player, bidderNames, category, state) {
  const [b1, b2] = bidderNames;
  return {
    id:         `news_${uid()}`,
    type:       'SPONSOR',
    subtype:    'BIDDING_WAR',
    priority:   7,
    headline:   `Disputa: ${b1} e ${b2} brigam por ${player.name}`,
    body:       `Segundo fontes próximas ao circuito, ${b1} e ${b2} estão em negociação direta pela categoria ${_catLabel(category)} de ${player.name}. A disputa pode elevar o valor do contrato significativamente. O anúncio oficial é esperado nos próximos dias.`,
    journalist: JOURNALISTS.FONTAINE.id,
    journalistName: JOURNALISTS.FONTAINE.name,
    icon:       '⚔️',
    color:      '#AB47BC',
    playerIds:  [player.id],
    year:       state.year ?? 0,
    speculative: true,
  };
}

function _buildBonusArticle(player, contract, totalBonus, triggers, state) {
  const sponsor  = getSponsorById(contract.sponsorId);
  const triggerLabels = triggers.map(t => ({
    GRAND_SLAM_TITLE: 'título de Grand Slam',
    NUMBER_ONE: 'chegada ao nº1',
    MASTERS_TITLE: 'título de Masters',
    TOP_10: 'entrada no top 10',
  }[t] ?? t)).join(' e ');

  return {
    id:         `news_${uid()}`,
    type:       'SPONSOR',
    subtype:    'BONUS',
    priority:   6,
    headline:   `${player.name} recebe bônus de ${_fmtUSD(totalBonus)} de ${sponsor?.name ?? contract.sponsorName}`,
    body:       `O ${triggerLabels} de ${player.name} ativa cláusula de bônus de performance no contrato com ${sponsor?.name ?? contract.sponsorName}. O valor adicional de ${_fmtUSD(totalBonus)} é creditado imediatamente ao atleta.`,
    journalist: JOURNALISTS.PETROV.id,
    journalistName: JOURNALISTS.PETROV.name,
    icon:       '💰',
    color:      '#FFD700',
    playerIds:  [player.id],
    year:       state.year ?? 0,
  };
}

function _buildProspectLadderArticle(player, contract, newFee, milestone, state) {
  const milestoneLabel = { TOP_50: 'top 50', TOP_10: 'top 10', TOP_5: 'top 5' }[milestone] ?? milestone;
  const sponsor = getSponsorById(contract.sponsorId);

  return {
    id:         `news_${uid()}`,
    type:       'SPONSOR',
    subtype:    'PROSPECT_LADDER',
    priority:   7,
    headline:   `${player.name} atinge ${milestoneLabel} — contrato com ${sponsor?.name ?? contract.sponsorName} sobe para ${_fmtUSD(newFee)}`,
    body:       `A escada de gatilhos no deal de prospect de ${player.name} com ${sponsor?.name ?? contract.sponsorName} é ativada. Com a chegada ao ${milestoneLabel}, o fee sobe automaticamente para ${_fmtUSD(newFee)} por ano. A marca apostou cedo — e a aposta começa a pagar.`,
    journalist: JOURNALISTS.NAKANO.id,
    journalistName: JOURNALISTS.NAKANO.name,
    icon:       '🚀',
    color:      '#66BB6A',
    playerIds:  [player.id],
    year:       state.year ?? 0,
  };
}

function _buildScandalTerminationArticle(player, contract, sponsor, severity, state) {
  const tone = severity >= 0.7 ? 'grave' : 'polêmico';

  return {
    id:         `news_${uid()}`,
    type:       'SPONSOR',
    subtype:    'SCANDAL',
    priority:   8,
    headline:   `${sponsor.name} rescinde contrato com ${player.name} após incidente ${tone}`,
    body:       `Em comunicado, ${sponsor.name} confirma o encerramento imediato do contrato com ${player.name}. "Nossos valores não estão alinhados com os acontecimentos recentes", afirmou a marca. O impacto financeiro para o tenista é imediato.`,
    journalist: pick([JOURNALISTS.FONTAINE, JOURNALISTS.REED]).id,
    journalistName: pick([JOURNALISTS.FONTAINE, JOURNALISTS.REED]).name,
    icon:       '🔥',
    color:      '#FF4444',
    playerIds:  [player.id],
    sponsorId:  contract.sponsorId,
    year:       state.year ?? 0,
    tier:       contract.sponsorTier,
  };
}

function _buildInjuryTerminationArticle(player, contract, injuryMonths, state) {
  const sponsor = getSponsorById(contract.sponsorId);
  return {
    id:         `news_${uid()}`,
    type:       'SPONSOR',
    subtype:    'INJURY_TERMINATION',
    priority:   5,
    headline:   `${sponsor?.name ?? contract.sponsorName} suspende contrato com ${player.name}`,
    body:       `Com ${injuryMonths} meses de afastamento previsto, ${sponsor?.name ?? contract.sponsorName} ativa cláusula de suspensão no contrato de ${player.name}. O acordo pode ser retomado mediante retorno e desempenho.`,
    journalist: JOURNALISTS.SANTOS.id,
    journalistName: JOURNALISTS.SANTOS.name,
    icon:       '🩹',
    color:      '#F44336',
    playerIds:  [player.id],
    year:       state.year ?? 0,
  };
}

function _buildRivalGSArticle(event, state) {
  return {
    id:         `news_${uid()}`,
    type:       'SPONSOR',
    subtype:    'RIVAL_GS',
    priority:   4,
    headline:   `Vitória de ${event.winnerName} pressiona posição de ${event.affectedPlayerName} em ${event.sponsorName}`,
    body:       `Fontes próximas à ${event.sponsorName} indicam que a conquista de Grand Slam de ${event.winnerName} pode redefinir as prioridades da marca. ${event.affectedPlayerName}, que também tem contrato com a empresa, aguarda definição sobre seu status no portfólio.`,
    journalist: JOURNALISTS.FONTAINE.id,
    journalistName: JOURNALISTS.FONTAINE.name,
    icon:       '🔮',
    color:      '#AB47BC',
    playerIds:  [event.winnerId, event.affectedPlayerId].filter(Boolean),
    year:       state.year ?? event.year ?? 0,
    speculative: true,
  };
}

function _buildForgottenPlayerArticle(player, yearsSince, state) {
  return {
    id:         `news_${uid()}`,
    type:       'SPONSOR',
    subtype:    'FORGOTTEN',
    priority:   3,
    headline:   `${player.name}: ${yearsSince} temporada${yearsSince > 1 ? 's' : ''} sem patrocinador`,
    body:       `O nome de ${player.name} não aparece em nenhum anúncio. ${yearsSince} temporada${yearsSince > 1 ? 's' : ''} se passaram desde o último contrato. O mercado parece ter seguido em frente. O tenista, não necessariamente.`,
    journalist: JOURNALISTS.SANTOS.id,
    journalistName: JOURNALISTS.SANTOS.name,
    icon:       '🌧️',
    color:      '#90A4AE',
    playerIds:  [player.id],
    year:       state.year ?? 0,
  };
}

function buildCommercialPulseArticles(state, year) {
  const pool = state.sponsorPool;
  if (!pool) return [];

  const candidates = (state.players ?? [])
    .filter(player => player && !player.retired)
    .map(player => {
      try {
        const profile = getSponsorshipProfile(pool, player);
        const commercial = profile.commercialProfile;
        if (!commercial) return null;

        let pulse = null;
        let weight = 0;
        if (commercial.archetype === 'Império global') {
          pulse = 'EMPIRE';
          weight = 100 + commercial.annual / 1_000_000;
        } else if (commercial.archetype === 'Franquia premium' && commercial.runway === 'forte expansão') {
          pulse = 'ASCENSION';
          weight = 82 + commercial.annual / 1_000_000;
        } else if (commercial.concentrationRisk === 'alto' && commercial.annual >= 1_500_000) {
          pulse = 'CONCENTRATION';
          weight = 74 + commercial.anchorShare;
        } else if (commercial.ruptureCount > 0 && commercial.activeCount > 0) {
          pulse = 'REBUILD';
          weight = 68 + commercial.ruptureCount * 8 + commercial.annual / 1_000_000;
        } else if (commercial.activeCount >= 4 && commercial.categories.length >= 4) {
          pulse = 'DIVERSIFIED';
          weight = 70 + commercial.categories.length * 4;
        }

        return pulse ? { player, profile, commercial, pulse, weight } : null;
      } catch (_) {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3);

  return candidates.map(item => _buildCommercialPulseArticle(item, state, year));
}

function _buildCommercialPulseArticle(item, state, year) {
  const { player, commercial, pulse } = item;
  const anchor = commercial.anchorSponsor;
  const journalist = pulse === 'EMPIRE'
    ? JOURNALISTS.CARVALHO
    : pulse === 'CONCENTRATION'
      ? JOURNALISTS.PETROV
      : pulse === 'REBUILD'
        ? JOURNALISTS.FONTAINE
        : JOURNALISTS.NAKANO;

  const templates = {
    EMPIRE: {
      subtype: 'COMMERCIAL_EMPIRE',
      priority: 8,
      color: '#FFD700',
      icon: '👑',
      headline: `${player.name} já não é só tenista: é uma plataforma global`,
      body: `Com ${_fmtUSD(commercial.annual)} por ano em contratos ativos, ${player.name} atravessa a temporada como ${commercial.archetype.toLowerCase()}. ${commercial.headline} ${commercial.diagnosis}`,
    },
    ASCENSION: {
      subtype: 'COMMERCIAL_ASCENSION',
      priority: 7,
      color: '#60FF90',
      icon: '📈',
      headline: `Mercado vê ${player.name} como próximo salto premium do circuito`,
      body: `${player.name} combina sinal de mercado em alta, visibilidade e uma carteira anual de ${_fmtUSD(commercial.annual)}. ${commercial.headline} A leitura interna é de ${commercial.runway}.`,
    },
    CONCENTRATION: {
      subtype: 'COMMERCIAL_RISK',
      priority: 6,
      color: '#FFB060',
      icon: '⚠️',
      headline: `${player.name} cresce no mercado, mas depende demais de ${anchor?.sponsorName ?? 'uma marca'}`,
      body: `${anchor?.sponsorName ?? 'Uma única marca'} representa ${commercial.anchorShare}% da receita anual de patrocínio de ${player.name}. O portfólio é classificado como ${commercial.portfolioHealth}, mas o risco de concentração é ${commercial.concentrationRisk}.`,
    },
    REBUILD: {
      subtype: 'COMMERCIAL_REBUILD',
      priority: 6,
      color: '#AB47BC',
      icon: '🧩',
      headline: `${player.name} reconstrói imagem comercial após ruptura no histórico`,
      body: `${player.name} volta a montar carteira de marcas mesmo carregando ${commercial.ruptureCount} ruptura${commercial.ruptureCount > 1 ? 's' : ''} sensível${commercial.ruptureCount > 1 ? 's' : ''}. ${commercial.diagnosis} Hoje a receita anual ativa é de ${_fmtUSD(commercial.annual)}.`,
    },
    DIVERSIFIED: {
      subtype: 'COMMERCIAL_PORTFOLIO',
      priority: 6,
      color: '#60C8FF',
      icon: '🧠',
      headline: `${player.name} vira case de carteira comercial diversificada`,
      body: `Poucos jogadores espalham presença por tantas frentes. ${player.name} tem contratos em ${commercial.categories.length} categorias e reduz a exposição a uma única marca. ${commercial.headline}`,
    },
  };

  const tpl = templates[pulse] ?? templates.ASCENSION;
  return {
    id: `news_${uid()}`,
    type: pulse === 'EMPIRE' ? 'SPONSOR_ELITE' : 'SPONSOR',
    subtype: tpl.subtype,
    priority: tpl.priority,
    headline: tpl.headline,
    body: tpl.body,
    journalist: journalist.id,
    journalistName: journalist.name,
    icon: tpl.icon,
    color: tpl.color,
    playerIds: [player.id],
    sponsorId: anchor?.sponsorId ?? null,
    year: year ?? state.year ?? 0,
    commercialPulse: {
      pulse,
      archetype: commercial.archetype,
      annual: commercial.annual,
      anchorShare: commercial.anchorShare,
      concentrationRisk: commercial.concentrationRisk,
      portfolioHealth: commercial.portfolioHealth,
    },
  };
}

function _buildRetirementSponsorArticle(player, eliteContracts, state) {
  const names = eliteContracts.map(c => c.sponsorName).join(' e ');
  return {
    id:         `news_${uid()}`,
    type:       'SPONSOR',
    subtype:    'RETIREMENT',
    priority:   6,
    headline:   `Com a aposentadoria de ${player.name}, ${names} encerra${eliteContracts.length > 1 ? 'm' : ''} contratos`,
    body:       `A aposentadoria de ${player.name} encerra automaticamente os contratos com ${names}. Uma era de patrocínio de elite chega ao fim junto com a carreira do atleta. O mercado vai sentir a lacuna.`,
    journalist: JOURNALISTS.CARVALHO.id,
    journalistName: JOURNALISTS.CARVALHO.name,
    icon:       '🌅',
    color:      '#FFD700',
    playerIds:  [player.id],
    year:       state.year ?? 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GERAÇÃO DE EVENTOS — ChronicleEngine
// ─────────────────────────────────────────────────────────────────────────────

function _buildFirstEliteChronicleEvent(player, contract, year) {
  const sponsor = getSponsorById(contract.sponsorId);
  return {
    type:      'SPONSOR_MILESTONE',
    subtype:   'FIRST_ELITE',
    year,
    playerId:  player.id,
    text:      `Assina primeiro contrato ELITE da carreira com ${sponsor?.name ?? contract.sponsorName} (${_fmtUSD(contract.annualFee)}/ano).`,
    icon:      '👑',
    weight:    8,
  };
}

function _buildEliteTerminationChronicleEvent(player, contract, sponsor, year) {
  return {
    type:      'SPONSOR_MILESTONE',
    subtype:   'ELITE_TERMINATION',
    year,
    playerId:  player.id,
    text:      `Contrato ELITE com ${sponsor.name} encerrado após ${contract.duration} temporada${contract.duration > 1 ? 's' : ''}.`,
    icon:      '💔',
    weight:    5,
  };
}

/**
 * Converte eventos do SponsorPool em ChronicleEvents para o ChronicleEngine.
 * Chamado após processSponsorSeason / runSponsorshipWindow.
 */
export function buildSponsorChronicleEvents(events, players) {
  return events
    .filter(ev => ev.type && ev.playerId)
    .map(ev => {
      const player = players.find(p => p.id === ev.playerId);
      if (!player) return null;

      switch (ev.type) {
        case 'CONTRACT_SIGNED':
          return ev.isElite
            ? {
                type:     'SPONSOR_MILESTONE',
                subtype:  ev.isElite ? 'ELITE_SIGNING' : 'SIGNING',
                year:     ev.year,
                playerId: ev.playerId,
                text:     `Assina com ${ev.sponsorName} (${_fmtUSD(ev.annualFee)}/ano, ${ev.duration} temp.).`,
                icon:     ev.isElite ? '👑' : '🤝',
                weight:   ev.isElite ? 7 : 3,
              }
            : null;

        case 'CONTRACT_TERMINATED':
          return ev.tier === 'ELITE'
            ? {
                type:     'SPONSOR_MILESTONE',
                subtype:  'ELITE_LOSS',
                year:     ev.year,
                playerId: ev.playerId,
                text:     `Perde contrato ELITE com ${ev.sponsorName}.`,
                icon:     '💔',
                weight:   6,
              }
            : null;

        default:
          return null;
      }
    })
    .filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS UTILITÁRIOS PRIVADOS
// ─────────────────────────────────────────────────────────────────────────────

function _fmtUSD(v) {
  if (!v && v !== 0) return '—';
  const abs = Math.abs(v);
  if (!isFinite(abs) || isNaN(abs)) return '$∞';
  if (abs >= 1_000_000_000) return `$${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `$${Math.round(abs / 1_000)}K`;
  return `$${abs}`;
}

function _catLabel(category) {
  const map = {
    RACKET: 'raquetes', APPAREL: 'vestuário', LUXURY: 'luxo',
    FINANCE: 'serviços financeiros', TECH: 'tecnologia',
    ENERGY: 'bebidas e nutrição', AIRLINE: 'aviação',
    AUTOMOTIVE: 'automotivo', RETAIL: 'varejo', MEDIA: 'mídia',
    CONSUMER: 'consumo de massa',
  };
  return map[category] ?? category;
}

function _playerChooseOffer(player, offers) {
  if (!offers.length) return null;

  const pressPersona = player.personality?.pressPersona;
  const budget       = player.finance?.budget ?? 0;
  const inCrisis     = budget < -50_000;

  if (inCrisis) return offers.sort((a, b) => b.annualFee - a.annualFee)[0];

  if (pressPersona === 'SHOWMAN') {
    const elite = offers.filter(o => o.sponsorTier === 'ELITE');
    if (elite.length) return elite[0];
    const premium = offers.filter(o => o.sponsorTier === 'PREMIUM');
    if (premium.length) return premium.sort((a, b) => b.annualFee - a.annualFee)[0];
  }

  if (['INTELLECTUAL', 'RESERVED'].includes(pressPersona)) {
    return offers.sort((a, b) => b.duration - a.duration || b.annualFee - a.annualFee)[0];
  }

  if (pressPersona === 'CONFRONTATIONAL') {
    const nonConservative = offers.filter(o => {
      const s = getSponsorById(o.sponsorId);
      return s && !s.conservativeImage;
    });
    if (nonConservative.length) return nonConservative.sort((a, b) => b.annualFee - a.annualFee)[0];
    if (Math.random() > 0.4) return null;
  }

  return offers.sort((a, b) => b.annualFee - a.annualFee)[0];
}

