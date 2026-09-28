import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  beginMovementPerception,
  getPerceptionSkills,
  updateMovementPerception,
} from '../src/systems/movement/MovementPerception.js';

const ball = {
  pos: { x: 0.4, y: -9.2, z: 2.45 },
  vel: { x: 3.8, y: 38.5, z: -2.1 },
  spin: { x: -19, y: 0, z: 6.2 },
  inFlight: true,
  bounceCount: 0,
  lastHitBy: 0,
  _isDropShot: true,
  _sliceProfile: 'SHORT_VARIATION',
  _sliceCarryMult: 0.82,
  _sigBounce: 0.72,
  _sigBounceSpin: 1.4,
  _servePhysType: 'SLICE',
  _wrongFoot: { active: true, hitterId: 0, targetX: 4, targetSign: 1, strength: 0.9 },
};

function player(leitura, devolucao) {
  return {
    id: 1,
    attrs: { leitura, devolucao, visaoTatica: leitura, explosividade: leitura },
    _tm: { perception: null },
  };
}

function gameState() {
  return {
    ball: structuredClone(ball),
    rally: 0,
    receiver: 1,
    server: 0,
    _currentPointId: 17,
    pointHistory: [],
    _pendingServeData: {
      // Estes segredos existem no estado global, mas não podem entrar na percepção.
      targetX: 4.0,
      wideHint: 1,
      pressureHint: 1,
    },
  };
}

const low = player(38, 42);
const elite = player(94, 92);
assert.ok(getPerceptionSkills(elite, true).skill > getPerceptionSkills(low, true).skill);
const lowGs = gameState();
const eliteGs = gameState();
const lowStart = beginMovementPerception(low, lowGs, lowGs.ball);
const eliteStart = beginMovementPerception(elite, eliteGs, eliteGs.ball);
assert.ok(eliteStart.reactionDelay < lowStart.reactionDelay, 'leitor de elite deve adquirir a trajetória antes');

const lowView = updateMovementPerception(low, lowGs, 0.15);
const eliteView = updateMovementPerception(elite, eliteGs, 0.15);
assert.ok(elite._perceptionState.confidence > low._perceptionState.confidence, 'elite deve ganhar confiança antes');
assert.ok(Math.abs(eliteView.vel.x - ball.vel.x) < Math.abs(lowView.vel.x - ball.vel.x), 'elite deve errar menos a direção');
assert.equal(lowView._sigBounce ?? null, null, 'signature bounce não pode vazar no impacto');
assert.equal(lowView._sigBounceSpin ?? null, null, 'signature spin não pode vazar no impacto');
assert.equal(lowView._isDropShot, false, 'drop não pode ser identificado instantaneamente');
assert.equal(lowView._servePhysType, null, 'família secreta do saque não pode vazar no impacto');
assert.equal(lowView._wrongFoot, null, 'metadado secreto de contrapé não pode vazar no impacto');

const original = structuredClone(eliteGs.ball);
let lateView = eliteView;
for (let i = 0; i < 35; i++) lateView = updateMovementPerception(elite, eliteGs, 1 / 60);
assert.ok(elite._perceptionState.confidence > 0.90, 'a observação do voo deve convergir');
assert.equal(lateView._isDropShot, false, 'flag secreta de drop não pode vencer evidência cinemática incompatível');
assert.equal(lateView._wrongFoot, null, 'contrapé deve nascer da mudança observada de rota, não de metadado');
assert.equal(lateView._servePhysType, null, 'tipo de saque nunca pode ser copiado do estado secreto');
assert.ok(elite._perceptionState.positionError > 0, 'crença não deve colapsar na verdade exata');
assert.deepEqual(eliteGs.ball, original, 'percepção não pode alterar a bola física');

const movementSource = fs.readFileSync(new URL('../src/systems/movement/TennisMovement.js', import.meta.url), 'utf8');
assert.equal(movementSource.includes('_pendingServeData'), false, 'movimento não pode ler o plano secreto do saque');

console.log('✓ leitura de elite adquire confiança antes e com menor erro direcional');
console.log('✓ metadados secretos não vazam; forma é inferida apenas pela cinemática');
console.log('✓ TennisMovement não acessa _pendingServeData');
