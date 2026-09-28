import assert from 'node:assert/strict';
import {
  ConstructionStage,
  advanceRallyConstruction,
  constructionDirectionBias,
  evaluateRallyConstruction,
  guideConstructionIntent,
} from '../src/systems/shotengine/RallyConstruction.js';
import { ShotDirection, ShotFamily, ShotIntent } from '../src/systems/shotengine/ShotTypes.js';

function context({ shots = [], oppX = 0, oppVelX = 0, cadence = 'MEASURED', rally = 4, point = 1 } = {}) {
  const player = {
    ctx: { shotMemory: { shots, pressureBuilt: 0.66 } },
    attrs: { visaoTatica: 88, leitura: 86, controle: 80 },
    prefs: { rallyCadence: cadence },
  };
  return {
    gs: { _currentPointId: point },
    player,
    opponent: { pos: { x: oppX, y: -10.1 }, vel: { x: oppVelX, y: 0 } },
    prefs: player.prefs,
    memory: player.ctx.shotMemory,
    score: { rally },
    body: {
      contactReadiness: 0.72,
      arrivalMargin: 0.04,
      opponentVel: { x: oppVelX, y: 0 },
      opponentMovementTelemetry: { bodyCommitmentStrength: 0.72 },
    },
  };
}

const pinnedShots = [
  { family: ShotFamily.TOPSPIN, intent: ShotIntent.BUILD, direction: ShotDirection.CROSS, targetX: 2.7, targetY: -9.6, quality: 0.72, serve: false },
  { family: ShotFamily.TOPSPIN, intent: ShotIntent.PRESSURE, direction: ShotDirection.CROSS, targetX: 2.9, targetY: -9.8, quality: 0.76, serve: false },
];

const trapContext = context({ shots: pinnedShots, oppX: 2.55, oppVelX: -1.35 });
const trap = evaluateRallyConstruction(trapContext, { quality: 0.78, bodyState: 'PLANTED' }, { recommendedIntent: ShotIntent.PRESSURE, finishEV: 0.58 });
assert.equal(trap.stage, ConstructionStage.CASH_OUT, 'duas bolas no lado + rival voltando devem amadurecer a construção');
assert.equal(trap.wrongFootTrap, true, 'a sequência deve criar contrapé atrás da recuperação');
assert.equal(trap.targetSign, 1, 'o alvo do contrapé deve voltar ao lado que o rival está abandonando');
assert.ok(constructionDirectionBias(trap, ShotDirection.BODY, ShotIntent.PRESSURE) > 0.2, 'o plano deve influenciar a disputa de direção');
assert.equal(guideConstructionIntent(trap, ShotIntent.BUILD, trapContext, { quality: 0.78 }, { finishEV: 0.58 }), ShotIntent.REDIRECT);

const openContext = context({ shots: pinnedShots, oppX: 2.55, oppVelX: 0.12 });
const open = evaluateRallyConstruction(openContext, { quality: 0.72, bodyState: 'PLANTED' }, { recommendedIntent: ShotIntent.PRESSURE, finishEV: 0.52 });
assert.equal(open.wrongFootTrap, false, 'rival parado não pode produzir contrapé fictício');
assert.equal(open.targetSign, -1, 'com rival preso, a construção deve enxergar a quadra aberta');
assert.equal(open.recommendedDirection, ShotDirection.WIDE);

const badContext = context({ shots: pinnedShots, oppX: 2.4, oppVelX: -1.4 });
const reset = evaluateRallyConstruction(badContext, { quality: 0.42, bodyState: 'LATE' }, { recommendedIntent: ShotIntent.DEFEND });
assert.equal(reset.stage, ConstructionStage.RESET, 'contato ruim precisa abortar a jogada ensaiada');
assert.equal(reset.wrongFootTrap, false);
assert.equal(guideConstructionIntent(reset, ShotIntent.BUILD, badContext, { quality: 0.42 }, {}), ShotIntent.BUILD);

advanceRallyConstruction({
  player: trapContext.player,
  decision: { family: ShotFamily.FLAT_DRIVE, intent: ShotIntent.REDIRECT, direction: ShotDirection.BODY, rallyConstruction: trap },
  execution: { targetX: 2.8, targetY: -9.2 },
  quality: { quality: 0.78 },
});
assert.equal(trapContext.player.ctx.rallyConstruction.history.length, 1, 'a execução precisa entrar na memória da construção');
assert.equal(trapContext.player.ctx.rallyConstruction.lastExecutedPlan.stage, ConstructionStage.CASH_OUT);

const patient = evaluateRallyConstruction(context({ shots: pinnedShots.slice(0, 2), cadence: 'PATIENT', oppX: 0.7 }), { quality: 0.72, bodyState: 'PLANTED' }, {});
assert.equal(patient.stage, ConstructionStage.PIN, 'jogador paciente deve exigir mais preparação antes de abrir a quadra');

console.log('RallyConstruction: memória, abertura, contrapé e abortagem validados.');
