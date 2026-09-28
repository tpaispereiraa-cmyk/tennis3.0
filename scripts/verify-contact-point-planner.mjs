import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ContactTiming, chooseContactPointWindow } from '../src/systems/movement/ContactPointPlanner.js';

const profile = { preferredContactZ: 0.92, contactBand: 0.28 };
const trajectory = {
  hitCandidates: [
    { x: 0.25, y: 9.65, z: 0.54, t: 0.20, vz: 3.2, timeSinceBounce: 0.05 },
    { x: 0.30, y: 10.00, z: 0.73, t: 0.31, vz: 2.3, timeSinceBounce: 0.16 },
    { x: 0.36, y: 10.35, z: 0.91, t: 0.43, vz: 1.2, timeSinceBounce: 0.28 },
    { x: 0.40, y: 10.58, z: 0.98, t: 0.52, vz: 0.2, timeSinceBounce: 0.37 },
  ],
};

function player(cadence = 'MEASURED') {
  return {
    id: 1,
    side: 1,
    pos: { x: 0.15, y: 9.45 },
    stamina: 0.9,
    playerSpeed: 8.2,
    playerAccel: 18,
    reach: 0.9,
    prefs: { rallyCadence: cadence },
    attrs: { leitura: 86, controle: 84, explosividade: 75 },
  };
}

const patient = chooseContactPointWindow({
  player: player('PATIENT'),
  gs: { receiver: 0, rally: 4 },
  trajectory,
  profile,
  side: 1,
});
assert.ok(patient.point.z >= 0.85, `jogador com tempo escolheu contato baixo demais: ${patient.point.z}`);
assert.equal(patient.waitForBetterContact, true, 'deve esperar quando há altura futura claramente superior e alcançável');
assert.ok([ContactTiming.WAIT_FOR_PEAK, ContactTiming.IDEAL_HEIGHT].includes(patient.mode));

const returner = player('EARLY_ATTACK');
returner.id = 0;
const earlyReturn = chooseContactPointWindow({
  player: returner,
  gs: { receiver: 0, rally: 0 },
  trajectory,
  profile,
  side: 1,
});
assert.ok(earlyReturn.point.t <= patient.point.t, 'devolução agressiva deve poder encurtar a janela de contato');
assert.ok(earlyReturn.point.z > 0.54, 'mesmo agressivo não deve escolher automaticamente a primeira bola no tornozelo');

const impossible = chooseContactPointWindow({
  player: { ...player(), pos: { x: -4, y: 12.8 }, playerSpeed: 3.0, playerAccel: 4.0 },
  gs: { receiver: 0, rally: 5 },
  trajectory: { hitCandidates: trajectory.hitCandidates.slice(0, 1) },
  profile,
  side: 1,
});
assert.equal(impossible.mode, ContactTiming.EMERGENCY, 'sem janela alcançável o plano precisa assumir contato emergencial');

const physicsSource = await readFile(new URL('../src/core/physics.js', import.meta.url), 'utf8');
assert.ok(physicsSource.includes('hitCandidates'), 'o preditor físico precisa expor várias janelas');
assert.ok(!physicsSource.includes('stopped = (crossPoint && landPoint)'), 'a previsão não pode mais terminar automaticamente no primeiro quique');

console.log('ContactPointPlanner: espera, batida na subida e emergência validadas.');
