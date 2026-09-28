import assert from 'node:assert/strict';
import { buildFollowedPlayerTimeline } from '../src/systems/radar/PlayerLifeTimeline.js';

const player = {
  id: 'player-1',
  name: 'Roux-Girard',
  lifeSimulation: {
    activeSituations: [{
      id: 'active-recovery',
      type: 'WELLNESS_REBUILD',
      label: 'Rotina de recuperação',
      startedAt: { year: 2029, month: 7 },
      initialMonths: 6,
      monthsRemaining: 4,
      effects: { matchFocus: 1, recovery: 4, pressure: -3, injuryRisk: -4 },
    }],
    situationHistory: [{
      id: 'commercial-cycle',
      type: 'COMMERCIAL_OVERLOAD',
      label: 'Agenda comercial pesada',
      resolvedAt: { year: 2029, month: 6 },
      initialMonths: 4,
      monthsRemaining: 0,
      effects: { matchFocus: -2, recovery: -1, pressure: 7, commercial: 10 },
    }],
  },
};

const state = {
  year: 2029,
  coachMarket: { coachesById: { 'coach-1': { name: 'Marta Silva' } } },
  events: [
    { id: 'coach-start', type: 'COACH_START', playerId: player.id, coachId: 'coach-1', year: 2029, month: 1 },
    { id: 'coach-injury', type: 'COACH_INJURY_TENSION', playerId: player.id, coachId: 'coach-1', year: 2029, month: 7 },
    { id: 'injury', type: 'injury', playerId: player.id, year: 2029, month: 1 },
    { id: 'withdrawal', type: 'injury_wd', playerId: player.id, year: 2029, month: 1 },
  ],
  sponsorPool: {
    states: {
      active: { contracts: [{
        id: 'prospect-contract',
        playerId: player.id,
        sponsorName: 'Strato',
        contractType: 'PROSPECT_DEAL',
        annualFee: 2_793_000,
        signedDate: { year: 2028, month: 8 },
      }] },
    },
  },
};

const timeline = buildFollowedPlayerTimeline(player, state);
const rowById = id => timeline.find(row => row.id === id);

assert.equal(rowById('world:coach-start').title, 'Novo técnico: Marta Silva');
assert.match(rowById('world:coach-injury').title, /Lesão.*técnico/i);
assert.equal(rowById('world:injury').title, 'Lesão confirmada');
assert.equal(rowById('world:withdrawal').title, 'Desistência por lesão');
assert.match(rowById('world:withdrawal').text, /WD significa withdrawal/i);

const activeCycle = rowById('active:active-recovery');
assert.equal(activeCycle.kind, 'CICLO ATIVO');
assert.match(activeCycle.text, /restam 4 de 6 meses/i);
assert.deepEqual(activeCycle.impactTags.map(tag => tag.label), [
  'FOCO +1',
  'RECUPERAÇÃO +4',
  'PRESSÃO −3',
  'RISCO DE LESÃO −4',
]);
assert.ok(activeCycle.impactTags.every(tag => tag.tone === 'good'));

const finishedCycle = rowById('resolved:commercial-cycle');
assert.match(finishedCycle.text, /modificadores mensais terminaram.*não são apagados/i);
assert.ok(finishedCycle.impactTags.some(tag => tag.label === 'IMAGEM COMERCIAL +10' && tag.tone === 'good'));
assert.ok(finishedCycle.impactTags.some(tag => tag.label === 'PRESSÃO +7' && tag.tone === 'bad'));

const sponsor = rowById('signed:prospect-contract');
assert.match(sponsor.text, /^Contrato de promessa/);
assert.match(sponsor.text, /Top 50, Top 10 e Top 5/);

for (const row of timeline) {
  assert.doesNotMatch(row.title, /COACH_|INJURY_|PROSPECT_DEAL/);
  assert.doesNotMatch(row.text ?? '', /COACH_|INJURY_|PROSPECT_DEAL/);
}

console.log('Player life timeline: códigos internos traduzidos, ciclos explicados e impactos validados.');
