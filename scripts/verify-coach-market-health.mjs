import assert from 'node:assert/strict';
import { createInitialCoachMarket } from '../src/systems/coaching/CoachIdentitySystem.js';
import { initializePlayersCoaching, migrateCoachMarket, runCoachMarketYear } from '../src/systems/coaching/CoachMarketSystem.js';

function player(index, year = 2025) {
  return {
    id: `player-${year}-${index}`,
    name: `Jogador ${index}`,
    rankPosition: index + 1,
    age: 18 + (index % 19),
    attrs: {
      mentalidade: 45 + (index % 45),
      regularidade: 48 + (index % 40),
      agressividade: 42 + (index % 48),
      potencia: 45 + (index % 43),
      controle: 46 + (index % 42),
    },
    careerTitles: {},
  };
}

function assertHealthy(players, market, label) {
  const coachIds = players.map(row => row.coaching?.activeCoachId).filter(Boolean);
  assert.equal(coachIds.length, players.length, `${label}: há profissionais sem técnico`);
  assert.equal(new Set(coachIds).size, players.length, `${label}: um técnico foi atribuído a dois jogadores`);
  for (const row of players) {
    const coach = market.coachesById?.[row.coaching.activeCoachId];
    const partnership = market.partnershipsById?.[row.coaching.partnershipId];
    assert.equal(coach?.marketStatus, 'SIGNED', `${label}: técnico ativo não está contratado`);
    assert.equal(coach?.activePlayerId, row.id, `${label}: técnico aponta para outro jogador`);
    assert.equal(partnership?.status, 'ACTIVE', `${label}: parceria do jogador não está ativa`);
  }
  const activeIds = new Set(players.map(row => row.id));
  const stale = Object.values(market.coachesById ?? {})
    .filter(coach => coach.marketStatus === 'SIGNED' && !activeIds.has(coach.activePlayerId));
  assert.equal(stale.length, 0, `${label}: existem técnicos presos a jogadores fora do circuito`);
}

let players = Array.from({ length: 250 }, (_, index) => player(index));
let market = createInitialCoachMarket(players, 2025);
({ players, coachMarket: market } = initializePlayersCoaching(players, market, 2025));
assertHealthy(players, market, 'novo universo');
assert.ok(Object.values(market.coachesById).filter(coach => coach.marketStatus === 'FREE').length >= 12, 'novo universo sem reserva de mercado');

for (let year = 2025; year <= 2030; year++) {
  const retiredPlayers = year === 2027 ? players.slice(-18) : [];
  if (retiredPlayers.length) {
    players = players.slice(0, -18);
    const entrants = Array.from({ length: 18 }, (_, index) => ({ ...player(index, year), rankPosition: players.length + index + 1 }));
    players = [...players, ...entrants];
  }
  const result = runCoachMarketYear({
    players,
    prospects: [],
    retiredPlayers,
    coachMarket: market,
    year,
    seasonMetrics: {},
    prevRankMap: {},
  });
  players = result.players;
  market = result.coachMarket;
  assertHealthy(players, market, `temporada ${year}`);
}

// Um save parcialmente quebrado deve reparar somente os ausentes, sem depender
// de todos os jogadores estarem simultaneamente sem técnico.
const partiallyBroken = players.map((row, index) => {
  if (index < 12) return { ...row, coaching: null };
  if (index < 25) return { ...row, coaching: { ...(row.coaching ?? {}), activeCoachId: `missing-coach-${index}` } };
  return row;
});
({ players, coachMarket: market } = initializePlayersCoaching(partiallyBroken, market, 2031));
assertHealthy(players, market, 'reparo parcial de save');

// Um técnico preso a um id que não existe precisa voltar ao mercado.
const ghostCoach = Object.values(market.coachesById).find(coach => coach.marketStatus === 'FREE');
assert.ok(ghostCoach, 'reserva de técnicos desapareceu');
market = {
  ...market,
  coachesById: {
    ...market.coachesById,
    [ghostCoach.id]: { ...ghostCoach, marketStatus: 'SIGNED', activePlayerId: 'jogador-inexistente' },
  },
};
market = migrateCoachMarket(market, players, 2031);
assert.equal(market.coachesById[ghostCoach.id].marketStatus, 'FREE');
assert.equal(market.coachesById[ghostCoach.id].activePlayerId, null);

console.log('Coach market: 250/250 profissionais com vínculos íntegros durante criação, renovação, aposentadoria e reparo.');
