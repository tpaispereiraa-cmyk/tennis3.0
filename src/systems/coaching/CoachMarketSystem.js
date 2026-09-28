import { createCoach, createCoachFromRetiredPlayer, createInitialCoachMarket, inferCoachMethodForPlayer } from './CoachIdentitySystem.js';
import { applyPartnershipToPlayer, applyPartnershipPulse, computeCoachFit, createPartnership, evaluatePartnershipContract, evaluatePartnershipSeason } from './CoachPartnershipSystem.js';

function cloneMarket(market, players = [], year = 2025) {
  if (market?.coachesById && market?.partnershipsById) {
    return {
      _version: 1,
      currentYear: year,
      ...market,
      coachesById: { ...(market.coachesById ?? {}) },
      partnershipsById: { ...(market.partnershipsById ?? {}) },
      yearlyEvents: [...(market.yearlyEvents ?? [])],
      reputationLog: [...(market.reputationLog ?? [])],
      marketMemory: [...(market.marketMemory ?? [])],
    };
  }
  return createInitialCoachMarket(players, year);
}

function rankNeed(player) {
  const rank = player?.rankPosition ?? 999;
  const age = player?.age ?? 25;
  const titles = Object.values(player?.careerTitles ?? {}).reduce((s, v) => s + (Number(v) || 0), 0);
  return (rank <= 12 ? 42 : rank <= 40 ? 30 : rank <= 100 ? 20 : 10) + (age <= 22 ? 14 : age >= 31 ? 12 : 0) + Math.min(16, titles * 2);
}

function findBestFreeCoach(player, market, ctx = {}) {
  const coaches = Object.values(market.coachesById ?? {})
    .filter(c => c.marketStatus === 'FREE')
    .map(coach => ({ coach, score: computeCoachFit(player, coach, ctx) + rankNeed(player) * 0.25 }))
    .sort((a, b) => b.score - a.score);
  // Encaixe ruim deve gerar uma parceria difícil, não deixar um profissional
  // indefinidamente sem equipe apesar de existirem técnicos livres.
  return coaches[0]?.coach ?? null;
}

function assignCoach(player, coach, market, year, reason, ctx, events) {
  const partnership = createPartnership(player, coach, year, reason, ctx);
  market.partnershipsById[partnership.id] = partnership;
  market.coachesById[coach.id] = { ...coach, marketStatus: 'SIGNED', activePlayerId: player.id };
  const nextPlayer = applyPartnershipToPlayer(player, partnership);
  events.push({
    type: 'COACH_START',
    playerId: player.id,
    playerName: player.name,
    coachId: coach.id,
    coachName: coach.name,
    method: coach.method,
    reputation: coach.reputation,
    expectation: partnership.expectation,
    alignment: partnership.alignment,
    confidence: partnership.confidence,
    trust: partnership.trust,
    friction: partnership.friction,
    year,
    text: `${player.name} inicia parceria com ${coach.name}.`,
  });
  return nextPlayer;
}

function shouldSeekCoach(player) {
  if (player?.coaching?.activeCoachId) return false;
  const rank = player?.rankPosition ?? 999;
  return rank <= 400 || (player?.age ?? 25) <= 22 || (player?.age ?? 25) >= 31;
}

function hasValidActiveCoaching(player, market) {
  const coachId = player?.coaching?.activeCoachId;
  const partnershipId = player?.coaching?.partnershipId;
  if (!coachId || !partnershipId) return false;
  const coach = market.coachesById?.[coachId];
  const partnership = market.partnershipsById?.[partnershipId];
  return !!(
    coach &&
    partnership?.status === 'ACTIVE' &&
    partnership.playerId === player.id &&
    partnership.coachId === coachId
  );
}

function requiredCoachSupply(players = []) {
  const demand = players.filter(player => shouldSeekCoach({ ...player, coaching: null })).length;
  return Math.max(36, demand + Math.max(12, Math.ceil(demand * 0.08)));
}

function reconcileMarketAssignments(market, players = [], year = 2025) {
  const playerById = new Map(players.filter(Boolean).map(player => [player.id, player]));
  const claimedCoachIds = new Map();
  for (const player of players) {
    const coachId = player?.coaching?.activeCoachId;
    if (coachId && hasValidActiveCoaching(player, market) && !claimedCoachIds.has(coachId)) {
      claimedCoachIds.set(coachId, player.id);
    }
  }

  for (const [coachId, coach] of Object.entries(market.coachesById ?? {})) {
    const claimedPlayerId = claimedCoachIds.get(coachId) ?? null;
    const recordedPlayer = coach.activePlayerId ? playerById.get(coach.activePlayerId) : null;
    const validRecordedLink = recordedPlayer?.coaching?.activeCoachId === coachId;
    market.coachesById[coachId] = claimedPlayerId
      ? { ...coach, marketStatus: 'SIGNED', activePlayerId: claimedPlayerId }
      : coach.marketStatus === 'SIGNED' || (coach.activePlayerId && !validRecordedLink)
        ? { ...coach, marketStatus: 'FREE', activePlayerId: null }
        : coach;
  }

  for (const [partnershipId, partnership] of Object.entries(market.partnershipsById ?? {})) {
    if (partnership.status !== 'ACTIVE') continue;
    const player = playerById.get(partnership.playerId);
    if (!player || player.coaching?.partnershipId !== partnershipId || player.coaching?.activeCoachId !== partnership.coachId) {
      market.partnershipsById[partnershipId] = {
        ...partnership,
        status: 'ENDED',
        endYear: partnership.endYear ?? year,
        publicStatus: partnership.publicStatus === 'RUPTURE' ? 'RUPTURE' : 'ORPHANED_LINK',
      };
    }
  }
  return market;
}

function ensureCoachSupply(market, players = [], year = 2025) {
  const target = requiredCoachSupply(players);
  let index = 0;
  while (Object.keys(market.coachesById ?? {}).length < target) {
    const coach = createCoach(`supply-${year}-${Object.keys(market.coachesById).length}-${index}`, {
      methodId: inferCoachMethodForPlayer(players[index % Math.max(1, players.length)]),
    });
    market.coachesById[coach.id] = coach;
    index++;
  }
  return market;
}

/** Aplica a memória curta da parceria sem abrir mercado ou trocar técnico. */
export function runCoachRelationshipPulse({ players = [], prospects = [], coachMarket, year = 2025, context = {} }) {
  const market = migrateCoachMarket(coachMarket, [...players, ...prospects], year);
  const all = [...players, ...prospects];
  const updatedById = {};
  const events = [];
  const participatedIds = context.participatedIds ?? new Set();
  const injuryIds = context.injuryIds ?? new Set();
  const formDeltaMap = context.formDeltaMap ?? new Map();
  const winnerId = context.winnerId ?? null;

  for (const player of all) {
    const partnership = player.coaching?.partnershipId ? market.partnershipsById?.[player.coaching.partnershipId] : null;
    const coach = player.coaching?.activeCoachId ? market.coachesById?.[player.coaching.activeCoachId] : null;
    if (!partnership || !coach) {
      updatedById[player.id] = player;
      continue;
    }
    const result = applyPartnershipPulse(player, coach, partnership, {
      ...context,
      year,
      participated: participatedIds.has(player.id),
      formDelta: formDeltaMap.get(player.id) ?? 0,
      wonTitle: winnerId === player.id,
      injured: injuryIds.has(player.id),
    });
    market.partnershipsById[partnership.id] = result.partnership;
    updatedById[player.id] = result.player;
    events.push(...(result.events ?? []).map(event => ({
      ...event,
      monthIndex: context.monthIndex ?? context.worldDate?.month ?? null,
      date: context.worldDate ?? (context.monthIndex ? { year, month: context.monthIndex } : null),
    })));
  }

  const nextMarket = {
    ...market,
    yearlyEvents: [...(market.yearlyEvents ?? []), ...events].slice(-160),
    marketMemory: [...(market.marketMemory ?? []), ...events].slice(-80),
  };
  return {
    coachMarket: nextMarket,
    players: players.map(player => updatedById[player.id] ?? player),
    prospects: prospects.map(player => updatedById[player.id] ?? player),
    events,
  };
}

export function migrateCoachMarket(market, players = [], year = 2025) {
  let next = cloneMarket(market, players, year);
  next = reconcileMarketAssignments(next, players, year);
  return ensureCoachSupply(next, players, year);
}

export function initializePlayersCoaching(players = [], market, year = 2025, ctx = {}) {
  const nextMarket = migrateCoachMarket(market, players, year);
  const events = [];
  const ranked = [...players].sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999));
  const nextPlayers = ranked.map(player => {
    if (hasValidActiveCoaching(player, nextMarket)) return player;
    const candidate = player?.coaching?.activeCoachId
      ? { ...player, coaching: { ...(player.coaching ?? {}), activeCoachId: null, partnershipId: null, publicStatus: 'NEEDS_MARKET' } }
      : player;
    if (!shouldSeekCoach(candidate)) return candidate;
    const coach = findBestFreeCoach(candidate, nextMarket, ctx);
    return coach ? assignCoach(candidate, coach, nextMarket, year, 'INITIAL_MARKET', ctx, events) : candidate;
  });
  const map = Object.fromEntries(nextPlayers.map(p => [p.id, p]));
  return {
    players: players.map(p => map[p.id] ?? p),
    coachMarket: { ...nextMarket, yearlyEvents: [...(nextMarket.yearlyEvents ?? []), ...events].slice(-120) },
    events,
  };
}

export function runCoachMarketYear({ players = [], prospects = [], retiredPlayers = [], coachMarket, year = 2025, seasonMetrics = {}, prevRankMap = {} }) {
  let market = migrateCoachMarket(coachMarket, [...players, ...prospects], year);
  const events = [];

  for (const retired of retiredPlayers ?? []) {
    if (!retired?.id || market.coachesById[`coach_ret_${retired.id}`]) continue;
    const gs = retired.careerTitles?.gs ?? 0;
    if (gs >= 1 || (retired.careerBest?.rank ?? 999) <= 20) {
      const coach = createCoachFromRetiredPlayer(retired, year);
      if (coach) {
        market.coachesById[coach.id] = coach;
        events.push({ type: 'COACH_ENTERED_MARKET', playerId: retired.id, playerName: retired.name, coachId: coach.id, coachName: coach.name, year, text: `${retired.name} volta ao circuito como tecnico.` });
      }
    }
  }

  const ctx = { seasonMetrics, prevRankMap };
  const pool = [...players, ...prospects];
  const updatedById = {};
  for (const player of pool) {
    let p = player;
    const partnership = p.coaching?.partnershipId ? market.partnershipsById[p.coaching.partnershipId] : null;
    const coach = p.coaching?.activeCoachId ? market.coachesById[p.coaching.activeCoachId] : null;
    if (p.coaching?.activeCoachId && (!partnership || !coach)) {
      if (coach?.activePlayerId === p.id) {
        market.coachesById[coach.id] = { ...coach, marketStatus: 'FREE', activePlayerId: null };
      }
      p = {
        ...p,
        coaching: {
          ...(p.coaching ?? {}),
          activeCoachId: null,
          partnershipId: null,
          publicStatus: 'NEEDS_MARKET',
          confidence: Math.min(42, p.coaching?.confidence ?? 42),
          trust: Math.min(42, p.coaching?.trust ?? 42),
          friction: Math.max(48, p.coaching?.friction ?? 48),
        },
      };
    }
    if (partnership && coach) {
      const result = evaluatePartnershipSeason(p, coach, partnership, year, ctx);
      const contractResult = result.partnership.status === 'ACTIVE'
        ? evaluatePartnershipContract(result.player, coach, result.partnership, year, ctx)
        : result;
      market.partnershipsById[partnership.id] = contractResult.partnership;
      p = contractResult.player;
      events.push(...result.events.map(e => ({ ...e, playerName: p.name, coachName: coach.name })));
      events.push(...(contractResult === result ? [] : contractResult.events.map(e => ({ ...e, playerName: p.name, coachName: coach.name }))));
      if (contractResult.partnership.status === 'ENDED') {
        market.coachesById[coach.id] = { ...coach, marketStatus: 'FREE', activePlayerId: null, reputation: Math.max(20, coach.reputation - 2) };
        p = { ...p, coaching: { ...(p.coaching ?? {}), activeCoachId: null, partnershipId: null, publicStatus: 'BETWEEN_COACHES' } };
      } else {
        market.coachesById[coach.id] = {
          ...coach,
          reputation: Math.min(99, coach.reputation + ((seasonMetrics[p.id]?.titles ?? 0) ? 2 : 0) + ((seasonMetrics[p.id]?.titlesByCategory?.gs ?? 0) ? 4 : 0)),
        };
      }
    }
    if (!p.coaching?.activeCoachId && shouldSeekCoach(p)) {
      const nextCoach = findBestFreeCoach(p, market, ctx);
      if (nextCoach) p = assignCoach(p, nextCoach, market, year, partnership ? 'RESET_AFTER_RUPTURE' : 'ANNUAL_MARKET', ctx, events);
    }
    updatedById[p.id] = p;
  }

  const updatedPlayers = players.map(p => updatedById[p.id] ?? p);
  const updatedProspects = prospects.map(p => updatedById[p.id] ?? p);
  const updatedPool = [...updatedPlayers, ...updatedProspects];
  market = ensureCoachSupply(reconcileMarketAssignments(market, updatedPool, year), updatedPool, year);

  market = {
    ...market,
    currentYear: year,
    yearlyEvents: [...(market.yearlyEvents ?? []), ...events].slice(-160),
    marketMemory: [...(market.marketMemory ?? []), ...events.filter(e => ['COACH_RUPTURE', 'COACH_ERA', 'COACH_ENTERED_MARKET'].includes(e.type))].slice(-80),
    reputationLog: [
      ...(market.reputationLog ?? []),
      ...Object.values(market.coachesById).map(c => ({ year, coachId: c.id, reputation: c.reputation, activePlayerId: c.activePlayerId ?? null })),
    ].slice(-400),
  };
  return {
    coachMarket: market,
    players: updatedPlayers,
    prospects: updatedProspects,
    events,
  };
}
