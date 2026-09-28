import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const heat = await vite.ssrLoadModule('/src/systems/analytics/MatchHeat.js');
  const rating = await vite.ssrLoadModule('/src/ui/game/IndividualRating.jsx');

  const clean = (overrides = {}) => ({
    pointsWonServing: 42, pointsLostServing: 27, pointsWonReturning: 23, pointsLostReturning: 42,
    serve1In: 39, serve1Total: 61, serve1WonPoints: 30, serve2In: 22, serve2Total: 22, serve2WonPoints: 12,
    gamesServed: 9, gamesHeld: 8, gamesReturned: 9, gamesConverted: 2,
    aces: 5, doubleFaults: 2, winners: 16, unforcedErrors: 10, forcedErrors: 9,
    qualitySum: 31, qualityCount: 55, attackPointsPlayed: 16, attackPointsWon: 11,
    defensePointsPlayed: 12, defensePointsWon: 4, netApproaches: 5, netPointsWon: 3,
    breakPointsOpportunities: 5, breakPointsConverted: 2, breakPointsFaced: 5, breakPointsSaved: 3,
    ...overrides,
  });

  const routine = heat.finalizeMatchHeat({
    statsA: clean({ winners: 8, unforcedErrors: 18, qualitySum: 21 }), statsB: clean({ winners: 7, unforcedErrors: 19, qualitySum: 20 }),
    setsDetail: [[6, 1], [6, 2]], points: 92, liveHeat: { score: 18, peak: 29 },
  });
  const classic = heat.finalizeMatchHeat({
    statsA: clean(), statsB: clean({ winners: 18, unforcedErrors: 12, qualitySum: 34 }),
    setsDetail: [[7, 6], [5, 7], [7, 6]], points: 176, liveHeat: { score: 69, peak: 91 },
  });
  assert.ok(classic.score > routine.score + 20, 'clássico precisa superar passeio de forma clara');
  assert.equal(classic.tier.label !== 'MORNO', true, 'clássico não pode sair morno');

  const strong = rating.computeRating(clean(), 80, clean(), { surface: 'HARD' });
  const weak = rating.computeRating(clean({
    serve1In: 29, serve1Total: 62, serve1WonPoints: 23, serve2WonPoints: 7, gamesHeld: 4,
    pointsWonReturning: 12, pointsLostReturning: 51, gamesConverted: 0, aces: 0, doubleFaults: 8,
    winners: 5, unforcedErrors: 25, qualitySum: 21, attackPointsWon: 4, defensePointsWon: 1,
    breakPointsConverted: 0, breakPointsSaved: 1,
  }), 80, clean(), { surface: 'HARD' });
  assert.ok(strong.score > weak.score + 1.3, 'atuação completa precisa abrir distância real da atuação fraca');
  assert.ok(strong.components.devolucao.score > weak.components.devolucao.score, 'devolução precisa alterar o rating');
  assert.ok(strong.confidence > 0.55, 'amostra completa precisa ter confiança útil');

  console.log(JSON.stringify({ routine, classic, ratings: { strong, weak } }, null, 2));
} finally {
  await vite.close();
}
