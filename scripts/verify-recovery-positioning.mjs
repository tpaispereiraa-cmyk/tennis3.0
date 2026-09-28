import assert from 'node:assert/strict';
import { resolveRecoveryPosition } from '../src/systems/movement/RecoveryPositioning.js';

function makePlayer({ reading = 88, direction = 'CROSS', intent = 'BUILD', targetX = 3.1, targetY = -9.6 } = {}) {
  return {
    id: 0,
    side: 1,
    stamina: 0.9,
    attrs: {
      leitura: reading,
      visaoTatica: reading,
      controle: reading,
      velocidade: 78,
      explosividade: 76,
      equilibrio: 80,
    },
    ctx: {
      shotMemory: {
        shots: [{ serve: false, direction, intent, targetX, targetY, quality: 0.74 }],
      },
    },
  };
}

function makeGs(player, rally = 5) {
  const shot = player.ctx.shotMemory.shots.at(-1);
  return {
    rally,
    ball: {
      lastHitBy: player.id,
      pos: { x: shot.targetX * 0.55, y: -3, z: 1 },
      _lastTargetX: shot.targetX,
      _lastTargetY: shot.targetY,
    },
  };
}

const originalRandom = Math.random;
Math.random = () => 0.5;
try {
  const widePlayer = makePlayer();
  const wideGs = makeGs(widePlayer);
  const wide = resolveRecoveryPosition(widePlayer, wideGs, { x: 0, y: 12.1 });
  assert.ok(wide.x > 0.35 && wide.x < 1.2, `recuperação cruzada deveria fechar a bissetriz sem perseguir a bola: ${wide.x}`);
  assert.ok(Math.abs(wide.x) < Math.abs(wide.targetX) * 0.5, 'âncora não pode ficar em cima do alvo enviado');

  const dtlPlayer = makePlayer({ direction: 'DTL' });
  const dtl = resolveRecoveryPosition(dtlPlayer, makeGs(dtlPlayer), { x: 0, y: 12.1 });
  assert.ok(dtl.x < wide.x, 'paralela deve exigir recuperação mais próxima do centro');

  const defensePlayer = makePlayer({ intent: 'DEFEND', targetX: 0.3, targetY: -8.0 });
  const defense = resolveRecoveryPosition(defensePlayer, makeGs(defensePlayer), { x: 0, y: 12.1 });
  assert.ok(defense.depthAdjustment >= 0.8, 'bola curta defensiva precisa fazer o jogador proteger profundidade');
  assert.ok(defense.y > 12.8, 'lado positivo deve recuar depois de uma defesa curta');

  const firstX = wide.x;
  wideGs.ball.pos.x = -3.8;
  const stable = resolveRecoveryPosition(widePlayer, wideGs, { x: -1.5, y: 12.1 });
  assert.equal(stable.x, firstX, 'o plano deve permanecer estável durante o mesmo golpe, sem jitter seguindo a bola');

  const poorPlayer = makePlayer({ reading: 38 });
  const poor = resolveRecoveryPosition(poorPlayer, makeGs(poorPlayer), { x: 0, y: 12.1 });
  assert.ok(wide.geometryTrust > poor.geometryTrust, 'leitura alta deve executar melhor a geometria de recuperação');
  assert.ok(wide.confidence > poor.confidence, 'a telemetria deve preservar diferença de inteligência tática');
} finally {
  Math.random = originalRandom;
}

console.log('RecoveryPositioning: bissetriz, profundidade, identidade e estabilidade validadas.');
