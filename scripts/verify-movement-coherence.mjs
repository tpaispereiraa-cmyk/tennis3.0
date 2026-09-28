import assert from 'node:assert/strict';
import {
  MOVEMENT_ENGINE_VERSION,
  MovementCoherenceFlag,
  evaluateMovementCoherence,
} from '../src/systems/movement/MovementCoherence.js';

function preparedPlayer() {
  return {
    _arrivalMargin: 0.16,
    _contactReadiness: 0.78,
    _footworkSpacingQuality: 0.86,
    _movementCanContactBall: true,
    _perceptionState: { confidence: 0.82 },
    _surfaceFooting: { stability: 0.96, slideActive: false, slideControl: 0 },
    _tm: { bodyCommitment: { reversalSeverity: 0.08 } },
    _hitTarget: { z: 0.92 },
  };
}

const coherent = evaluateMovementCoherence({
  player: preparedPlayer(),
  gs: { ball: { pos: { z: 0.90 } } },
  contactPlan: { appliedContactWait: false, waitedForBetterContact: false, profile: { preferredContactZ: 0.92 } },
  defendNow: true,
});
assert.equal(coherent.version, MOVEMENT_ENGINE_VERSION);
assert.ok(coherent.score > 0.72, `cadeia limpa recebeu coerência baixa: ${coherent.score}`);
assert.deepEqual(coherent.flags, []);

const broken = preparedPlayer();
broken._arrivalMargin = -0.22;
broken._contactReadiness = 0.16;
broken._footworkSpacingQuality = 0.18;
broken._tm.bodyCommitment.reversalSeverity = 0.68;
const incoherent = evaluateMovementCoherence({
  player: broken,
  gs: { ball: { pos: { z: 0.42 } } },
  contactPlan: {
    appliedContactWait: true,
    waitedForBetterContact: true,
    runAroundForehand: true,
    profile: { preferredContactZ: 0.94 },
  },
  defendNow: true,
});
for (const flag of [
  MovementCoherenceFlag.ARRIVAL_DEFICIT,
  MovementCoherenceFlag.SPACING_BREAKDOWN,
  MovementCoherenceFlag.UNPREPARED_FEET,
  MovementCoherenceFlag.WAIT_COLLAPSED,
  MovementCoherenceFlag.LOW_AFTER_WAIT,
  MovementCoherenceFlag.RUNAROUND_RUSHED,
  MovementCoherenceFlag.WRONG_FOOT_REVERSAL,
]) assert.ok(incoherent.flags.includes(flag), `flag ausente: ${flag}`);
assert.ok(incoherent.score < coherent.score);
assert.ok(incoherent.severity > 0.60);

const rejectedSuggestion = evaluateMovementCoherence({
  player: broken,
  gs: { ball: { pos: { z: 0.42 } } },
  contactPlan: { appliedContactWait: false, waitedForBetterContact: true, profile: { preferredContactZ: 0.94 } },
  defendNow: true,
});
assert.equal(rejectedSuggestion.flags.includes(MovementCoherenceFlag.WAIT_COLLAPSED), false, 'sugestão rejeitada não pode virar espera colapsada');
assert.equal(rejectedSuggestion.flags.includes(MovementCoherenceFlag.LOW_AFTER_WAIT), false, 'bola baixa sem espera aplicada não é contradição');

const inactive = evaluateMovementCoherence({ player: preparedPlayer(), defendNow: false });
assert.equal(inactive.active, false);
assert.equal(inactive.score, 1);

console.log('MovementCoherence: cadeia limpa, contradições e sugestões rejeitadas validadas.');
