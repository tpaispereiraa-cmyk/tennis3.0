import { COURT } from '../../core/constants.js';
import { clamp } from '../../core/math.js';

export const COURT_MOVEMENT_STATE_VERSION = 'court-movement-state-v3';

function preferredContactZ(player) {
  const cadence = player?.prefs?.rallyCadence ?? 'BALANCED';
  return { PATIENT: 1.02, MEASURED: 0.94, BALANCED: 0.88, EARLY_ATTACK: 0.82, EXPLOSIVE: 0.76 }[cadence] ?? 0.88;
}

export function updateCourtMovementState(player, gs, beliefBall) {
  if (!player) return null;
  player.ctx ??= {};
  const side = player.side > 0 ? 1 : -1;
  let mode = player.ctx.courtMode ?? (player.atNet ? 'NET' : 'BASE');
  let event = null;

  if (mode === 'TRANSITION' && !player.atNet) {
    const approachQ = clamp(player.ctx._approachQuality ?? 0.5, 0, 1);
    const netZoneY = side * (COURT.halfL * clamp(0.42 - approachQ * 0.08, 0.30, 0.42));
    const reached = side > 0 ? player.pos.y <= netZoneY : player.pos.y >= netZoneY;
    if (reached) {
      player.atNet = true;
      mode = 'NET';
      player.ctx.netPhase = player.ctx.netPhase === 'BASE' || !player.ctx.netPhase ? 'FIRST_VOLLEY' : player.ctx.netPhase;
      player.ctx.netIntent = Math.max(0, (player.ctx.netIntent ?? 0) * 0.40);
      event = 'APPROACH_REACHED';
    }
  }

  if ((mode === 'NET' || player.atNet) && beliefBall?.lastHitBy !== player.id) {
    const coming = side > 0 ? (beliefBall?.vel?.y ?? 0) > 0.02 : (beliefBall?.vel?.y ?? 0) < -0.02;
    const passed = side > 0
      ? (beliefBall?.pos?.y ?? 0) > player.pos.y + 0.42
      : (beliefBall?.pos?.y ?? 0) < player.pos.y - 0.42;
    const lobEvidence = player?._perceptionState?.evidence?.lob ?? 0;
    const clearlyOver = coming && passed
      && (beliefBall?.pos?.z ?? 0) > preferredContactZ(player) + 0.70
      && lobEvidence > 0.42;
    const deepBounce = (beliefBall?.bounceCount ?? 0) > 0
      && beliefBall.lastBounceSide === side
      && Math.abs(beliefBall?.pos?.y ?? 0) > COURT.serviceLineY + 1.0;
    if (clearlyOver || deepBounce) {
      player.atNet = false;
      mode = 'BASE';
      player.ctx.netPhase = 'BASE';
      event = clearlyOver ? 'LOB_READ_RETREAT' : 'DEEP_BOUNCE_RETREAT';
    }
  }

  player.ctx.courtMode = mode;
  const state = Object.freeze({
    version: COURT_MOVEMENT_STATE_VERSION,
    mode,
    phase: player.ctx.netPhase ?? (mode === 'BASE' ? 'BASE' : 'APPROACH'),
    event,
    approachQuality: +(player.ctx._approachQuality ?? 0).toFixed(3),
  });
  player._courtMovementState = state;
  return state;
}

export function resetCourtMovementState(player) {
  if (player) player._courtMovementState = null;
}
