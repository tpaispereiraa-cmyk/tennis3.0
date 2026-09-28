import assert from 'node:assert/strict';
import {
  ensureCareerTrajectory,
  normalizeCareerPeakAge,
  getCareerTrajectoryGrowthMultiplier,
  getCareerTrajectoryEffectiveCeiling,
  advanceCareerTrajectory,
} from '../src/systems/career/CareerTrajectorySystem.js';

const ARC_CONFIG = {
  EARLY_BLOOMER: 21,
  EXPLOSIVE: 24,
  VOLATILE: 24,
  STEADY: 29,
  LATE_BLOOMER: 31,
};

function makePlayer(id, arc, age = 17, overrides = {}) {
  const birthYear = 2025 - age;
  const peakAgeAt = ARC_CONFIG[arc] ?? 29;
  return {
    id,
    name: id,
    age,
    birthYear,
    peakAge: birthYear + peakAgeAt,
    developmentStyle: arc,
    potential: 'ELITE',
    rankPosition: 55,
    attrs: { resistencia: 72, recuperacao: 70, mentalidade: 68, regularidade: 69 },
    _devState: { ovrTarget: 84 },
    physicalCondition: 84,
    injuryHistory: [],
    ...overrides,
  };
}

function trajectoryFactor(player, year) {
  return getCareerTrajectoryGrowthMultiplier(ensureCareerTrajectory(player, year), year);
}

// Janelas: precoce acelera antes, tardio guarda a aceleração para depois.
const early = makePlayer('early', 'EARLY_BLOOMER');
const late = makePlayer('late', 'LATE_BLOOMER');
assert.equal(normalizeCareerPeakAge({ birthYear: 2000, peakAge: 2025 }), 25, 'save legado com peakAge absoluto deve ser normalizado');
assert.equal(ensureCareerTrajectory({ ...early, peakAge: 2026, birthYear: 2004 }, 2025).peakAge, 22, 'a migração deve persistir peakAge como idade');
assert.ok(trajectoryFactor({ ...early, age: 20, birthYear: 2005 }, 2025) > trajectoryFactor({ ...early, age: 27, birthYear: 1998 }, 2025));
assert.ok(trajectoryFactor({ ...late, age: 29, birthYear: 1996 }, 2025) > trajectoryFactor({ ...late, age: 22, birthYear: 2003 }, 2025));

// Corpo e equipe não podem criar bônus mágicos; apenas modular uma trajetória.
const healthy = makePlayer('healthy', 'STEADY', 25, { coaching: { activeCoachId: 'fit', startYear: 2022, alignment: 84, trust: 82, confidence: 78, friction: 16 } });
const worn = makePlayer('worn', 'STEADY', 25, {
  physicalCondition: 52,
  injuryBurden: { score: 52 },
  injury: { grade: 2 },
  coaching: { activeCoachId: 'tense', startYear: 2022, alignment: 32, trust: 30, confidence: 31, friction: 86 },
});
assert.ok(trajectoryFactor(healthy, 2025) > trajectoryFactor(worn, 2025));
assert.ok(getCareerTrajectoryEffectiveCeiling(healthy, 84, 2025) <= 84);

const summary = {};
for (const arc of Object.keys(ARC_CONFIG)) {
  let realizationTotal = 0;
  const trendCount = {};
  for (let sample = 0; sample < 500; sample += 1) {
    let player = ensureCareerTrajectory(makePlayer(`${arc}_${sample}`, arc), 2025);
    for (let year = 2025; year < 2040; year += 1) {
      const titleType = sample % 37 === 0 && year % 4 === 0 ? 'SLAM'
        : sample % 13 === 0 && year % 3 === 0 ? 'MASTERS'
          : null;
      const isStressYear = sample % 29 === 0 && year % 5 === 0;
      if (isStressYear) {
        player = {
          ...player,
          physicalCondition: 58,
          injuryHistory: [...(player.injuryHistory ?? []), { type: 'KNEE', grade: 2, season: year }],
        };
      } else {
        player = { ...player, physicalCondition: 84 };
      }
      const result = advanceCareerTrajectory(player, year, {
        titleType,
        seasonMetrics: { wins: titleType ? 18 : 6, tournamentsPlayed: isStressYear ? 27 : 17 },
      });
      player = result.player;
      const realization = player.careerTrajectory.realization;
      assert.ok(Number.isFinite(realization) && realization >= 20 && realization <= 95, `${arc}: realização fora da faixa`);
      assert.ok(player.careerTrajectory.history.length <= 160, `${arc}: histórico sem limite`);
    }
    realizationTotal += player.careerTrajectory.realization;
    const trend = player.careerTrajectory.forecast?.trend ?? 'NONE';
    trendCount[trend] = (trendCount[trend] ?? 0) + 1;
  }
  summary[arc] = {
    meanRealization: Number((realizationTotal / 500).toFixed(2)),
    terminalTrends: trendCount,
  };
}

console.log('Career trajectory verification passed.');
console.table(summary);
