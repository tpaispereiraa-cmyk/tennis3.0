import { clamp } from '../../core/math.js';

export const MOVEMENT_ENGINE_VERSION = 'movement-engine-v3';

export const MovementCoherenceFlag = Object.freeze({
  ARRIVAL_DEFICIT: 'ARRIVAL_DEFICIT',
  SPACING_BREAKDOWN: 'SPACING_BREAKDOWN',
  UNPREPARED_FEET: 'UNPREPARED_FEET',
  WAIT_COLLAPSED: 'WAIT_COLLAPSED',
  LOW_AFTER_WAIT: 'LOW_AFTER_WAIT',
  RUNAROUND_RUSHED: 'RUNAROUND_RUSHED',
  UNCONTROLLED_SLIDE: 'UNCONTROLLED_SLIDE',
  WRONG_FOOT_REVERSAL: 'WRONG_FOOT_REVERSAL',
});

export function evaluateMovementCoherence({ player, gs, contactPlan = null, defendNow = false } = {}) {
  if (!player || !defendNow) {
    return Object.freeze({
      version: MOVEMENT_ENGINE_VERSION,
      active: false,
      score: 1,
      severity: 0,
      flags: Object.freeze([]),
      reason: 'no_incoming_contact',
    });
  }

  const arrival = player?._arrivalMargin ?? 0;
  const readiness = clamp(player?._contactReadiness ?? 0, 0, 1);
  const spacing = clamp(player?._footworkSpacingQuality ?? 0.5, 0, 1);
  const perception = clamp(player?._perceptionState?.confidence ?? 0.65, 0, 1);
  const footing = clamp(player?._surfaceFooting?.stability ?? 1, 0, 1);
  const reversal = clamp(player?._tm?.bodyCommitment?.reversalSeverity ?? 0, 0, 1);
  const waitSuggested = !!contactPlan?.waitedForBetterContact;
  const waitPlanned = !!contactPlan?.appliedContactWait;
  const runAround = !!contactPlan?.runAroundForehand;
  const preferredZ = contactPlan?.profile?.preferredContactZ ?? player?._hitTarget?.z ?? 0.9;
  const ballZ = gs?.ball?.pos?.z ?? preferredZ;
  const lowContact = ballZ < Math.max(0.40, preferredZ - 0.38);
  const slideActive = !!player?._surfaceFooting?.slideActive;
  const slideControl = clamp(player?._surfaceFooting?.slideControl ?? 0, 0, 1);
  const flags = [];

  if (arrival < -0.16) flags.push(MovementCoherenceFlag.ARRIVAL_DEFICIT);
  if (spacing < 0.30 && player?._movementCanContactBall) flags.push(MovementCoherenceFlag.SPACING_BREAKDOWN);
  if (readiness < 0.22 && player?._movementCanContactBall) flags.push(MovementCoherenceFlag.UNPREPARED_FEET);
  if (waitPlanned && arrival < 0.06) flags.push(MovementCoherenceFlag.WAIT_COLLAPSED);
  if (waitPlanned && lowContact) flags.push(MovementCoherenceFlag.LOW_AFTER_WAIT);
  if (runAround && arrival < 0.08) flags.push(MovementCoherenceFlag.RUNAROUND_RUSHED);
  if (slideActive && slideControl < 0.48) flags.push(MovementCoherenceFlag.UNCONTROLLED_SLIDE);
  if (reversal > 0.48) flags.push(MovementCoherenceFlag.WRONG_FOOT_REVERSAL);

  const timingScore = clamp((arrival + 0.18) / 0.46, 0, 1);
  const score = clamp(
    0.20
      + timingScore * 0.18
      + readiness * 0.18
      + spacing * 0.16
      + perception * 0.08
      + footing * 0.12
      + (1 - reversal) * 0.08,
    0,
    1,
  );
  const structuralFlags = flags.filter(flag => [
    MovementCoherenceFlag.WAIT_COLLAPSED,
    MovementCoherenceFlag.LOW_AFTER_WAIT,
    MovementCoherenceFlag.RUNAROUND_RUSHED,
  ].includes(flag)).length;
  const severity = clamp((1 - score) * 0.72 + structuralFlags * 0.16 + Math.max(0, flags.length - structuralFlags - 1) * 0.045, 0, 1);

  return Object.freeze({
    version: MOVEMENT_ENGINE_VERSION,
    active: true,
    score: +score.toFixed(3),
    severity: +severity.toFixed(3),
    flags: Object.freeze(flags),
    arrival: +arrival.toFixed(3),
    readiness: +readiness.toFixed(3),
    spacing: +spacing.toFixed(3),
    perception: +perception.toFixed(3),
    footing: +footing.toFixed(3),
    reversal: +reversal.toFixed(3),
    waitPlanned,
    waitSuggested,
    runAround,
    reason: flags.length ? flags.join('+') : 'movement_chain_coherent',
  });
}

export function resetMovementCoherence(player) {
  if (player) player._movementCoherence = null;
}
