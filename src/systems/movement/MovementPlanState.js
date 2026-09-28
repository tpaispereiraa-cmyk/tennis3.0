import { clamp } from '../../core/math.js';

export const MOVEMENT_PLAN_VERSION = 'movement-plan-v3';

function planDistance(a, b) {
  return Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.y ?? 0) - (b?.y ?? 0));
}

function readSkill(player) {
  const attrs = player?.attrs ?? {};
  return clamp(((attrs.leitura ?? 60) * 0.46 + (attrs.visaoTatica ?? 60) * 0.18
    + (attrs.explosividade ?? 60) * 0.22 + (attrs.velocidade ?? 60) * 0.14) / 100, 0, 1);
}

function initialState(player, shotKey, plan, confidence) {
  const skill = readSkill(player);
  return {
    version: MOVEMENT_PLAN_VERSION,
    shotKey,
    phase: confidence < 0.24 ? 'READ' : 'COMMIT',
    plan: { ...plan },
    revisionBudget: clamp(0.34 + skill * 0.54, 0.34, 0.92),
    revisions: 0,
    correctionCost: 0,
    lastConfidence: confidence,
    acceptedConfidence: confidence,
    sinceRevision: 0,
    lastBounceCount: plan?.bounceCount ?? 0,
    lockedAt: 0,
  };
}

function movementPhase(player, plan, confidence) {
  const distance = planDistance(player?.pos, plan);
  const t = plan?.t ?? 0.3;
  const mode = player?.ctx?.courtMode ?? (player?.atNet ? 'NET' : 'BASE');
  if (mode === 'TRANSITION') return 'APPROACH';
  if (mode === 'NET' || player?.atNet) return plan?.phase === 'LOB_RETREAT' ? 'RETREAT' : 'NET_READ';
  if (confidence < 0.20 && t > 0.34) return 'READ';
  if (distance > 2.1) return 'SPRINT';
  if (distance > 0.72) return 'ADJUST';
  if (t > 0.12) return 'SET';
  return 'HIT';
}

export function stabilizeMovementPlan(player, proposed, {
  shotKey,
  confidence = 0.5,
  bounceCount = 0,
  dt = 1 / 60,
} = {}) {
  if (!player?._tm || !proposed) return proposed;
  let state = player._tm.planState;
  if (!state || state.version !== MOVEMENT_PLAN_VERSION || state.shotKey !== shotKey) {
    state = initialState(player, shotKey, { ...proposed, bounceCount }, confidence);
    player._tm.planState = state;
  } else {
    const current = state.plan;
    const displacement = planDistance(current, proposed);
    const timeShift = Math.abs((current?.t ?? 0.3) - (proposed?.t ?? 0.3));
    const phaseChanged = current?.phase !== proposed?.phase;
    const bounced = bounceCount > (state.lastBounceCount ?? 0);
    const evidenceGain = Math.max(0, confidence - (state.acceptedConfidence ?? 0));
    const currentTime = Math.max(0.04, (current?.t ?? 0.3) - Math.max(0, dt));
    const urgency = clamp(1 - currentTime / 0.72, 0, 1);
    const material = displacement > 0.32 || timeShift > 0.10 || phaseChanged;
    const revisionSeverity = clamp(displacement / 2.2 + timeShift / 0.55 + (phaseChanged ? 0.18 : 0), 0, 1);
    const oldDx = (current.x ?? player.pos.x) - player.pos.x;
    const oldDy = (current.y ?? player.pos.y) - player.pos.y;
    const newDx = (proposed.x ?? player.pos.x) - player.pos.x;
    const newDy = (proposed.y ?? player.pos.y) - player.pos.y;
    const denom = Math.max(1e-6, Math.hypot(oldDx, oldDy) * Math.hypot(newDx, newDy));
    const directionDot = clamp((oldDx * newDx + oldDy * newDy) / denom, -1, 1);
    const routeReversal = directionDot < 0.38
      || (Math.sign(oldDx || 0) !== Math.sign(newDx || 0) && Math.abs(oldDx) > 0.55 && Math.abs(newDx) > 0.55);
    const evidenceAllows = bounced
      || (state.sinceRevision >= 0.075 && evidenceGain > 0.075)
      || (!routeReversal && confidence > 0.54)
      || confidence > 0.88
      || urgency > 0.82;
    const budgetCost = revisionSeverity * (routeReversal ? 0.30 : 0.075);
    const budgetAllows = state.revisionBudget >= budgetCost;

    if (material && evidenceAllows && budgetAllows) {
      state.correctionCost = clamp((1 - directionDot) * 0.34 + revisionSeverity * (routeReversal ? 0.42 : 0.10), 0, 0.82);
      state.revisionBudget = clamp(state.revisionBudget - budgetCost, 0, 1);
      state.revisions += 1;
      state.plan = { ...proposed, bounceCount };
      state.acceptedConfidence = confidence;
      state.sinceRevision = 0;
    } else {
      // Ajustes pequenos são leitura contínua; mudanças grandes sem evidência
      // não teletransportam a decisão. O tempo do plano continua correndo.
      const blend = material ? clamp(0.035 + confidence * 0.035, 0.035, 0.07) : clamp(0.12 + confidence * 0.14, 0.12, 0.26);
      state.plan = {
        ...current,
        x: current.x + (proposed.x - current.x) * blend,
        y: current.y + (proposed.y - current.y) * blend,
        z: current.z + (proposed.z - current.z) * blend,
        t: currentTime,
        uncertainty: proposed.uncertainty,
      };
      state.correctionCost = clamp(state.correctionCost - dt * 1.2, 0, 1);
    }
    state.lastConfidence = confidence;
    state.lastBounceCount = bounceCount;
    state.sinceRevision += Math.max(0, dt);
    state.revisionBudget = clamp(state.revisionBudget + dt * (0.10 + confidence * 0.16), 0, 0.92);
  }

  state.phase = movementPhase(player, state.plan, confidence);
  state.lockedAt += Math.max(0, dt);
  return Object.freeze({
    ...state.plan,
    // A espera é uma decisão viva, não um rótulo eterno herdado do primeiro
    // frame. Revisão brusca, urgência ou janela curta cancelam a preparação.
    appliedContactWait: !!state.plan.appliedContactWait
      && state.correctionCost < 0.24
      && (state.plan.t ?? 0) >= 0.17
      && !['SPRINT', 'HIT', 'RETREAT'].includes(state.phase),
    movementState: state.phase,
    revisionBudget: +state.revisionBudget.toFixed(3),
    revisions: state.revisions,
    correctionCost: +state.correctionCost.toFixed(3),
    planVersion: MOVEMENT_PLAN_VERSION,
  });
}

export function resetMovementPlanState(player) {
  if (player?._tm) player._tm.planState = null;
}
