import { clamp } from '../../core/math.js';

function stableNoise(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function playerSeed(player) {
  if (typeof player?.id === 'number') return player.id + 7;
  return String(player?.id ?? '').split('').reduce((sum, c) => sum + c.charCodeAt(0), 7);
}

export function getSplitStepSkill(player, isServeReturn = false) {
  const attrs = player?.attrs ?? {};
  const reading = clamp((attrs.leitura ?? 60) / 100, 0, 1);
  const explosive = clamp((attrs.explosividade ?? 60) / 100, 0, 1);
  const speed = clamp((attrs.velocidade ?? 60) / 100, 0, 1);
  const returning = clamp((attrs.devolucao ?? attrs.retorno ?? 60) / 100, 0, 1);
  return clamp(
    reading * 0.37
      + explosive * 0.33
      + speed * 0.18
      + returning * (isServeReturn ? 0.12 : 0),
    0,
    1,
  );
}

export function beginSplitStep(player, gs, isServeReturn = false) {
  if (!player?._tm) return null;
  const skill = getSplitStepSkill(player, isServeReturn);
  const point = gs?._currentPointId ?? gs?.pointHistory?.length ?? 0;
  const rally = gs?.rally ?? 0;
  const noise = stableNoise((point + 1) * 211 + (rally + 1) * 43 + playerSeed(player) * 17);
  const currentSpeed = Math.hypot(player.vel?.x ?? 0, player.vel?.y ?? 0);
  const recoveryLoad = clamp((player._tm.recoverInertiaTimer ?? 0) / 0.22, 0, 1);
  const movementLoad = clamp((currentSpeed - 2.2) / 4.2, 0, 1);
  const idealLanding = isServeReturn ? 0.045 : 0.060;
  const variability = (isServeReturn ? 0.030 : 0.038) * (1.18 - skill * 0.64);
  const landingOffset = clamp(
    idealLanding
      + (0.58 - skill) * (isServeReturn ? 0.070 : 0.085)
      + noise * variability
      + recoveryLoad * 0.025
      + movementLoad * 0.018,
    -0.018,
    0.185,
  );

  let timing = 'ON_TIME';
  if (landingOffset < 0.018) timing = 'EARLY';
  else if (landingOffset > (isServeReturn ? 0.125 : 0.145)) timing = 'MISSED';
  else if (landingOffset > (isServeReturn ? 0.092 : 0.108)) timing = 'LATE';

  const timingPenalty = timing === 'ON_TIME' ? 0
    : timing === 'EARLY' ? 0.18
      : timing === 'LATE' ? 0.25
        : 0.48;
  const balancePenalty = recoveryLoad * 0.14 + movementLoad * 0.08;
  const quality = clamp(0.32 + skill * 0.68 - timingPenalty - balancePenalty, 0.12, 0.98);
  const resetTimer = timing === 'EARLY'
    ? clamp(0.070 - skill * 0.030, 0.035, 0.065)
    : 0;
  const landingTimer = Math.max(0, landingOffset);
  const state = {
    shotKey: `${gs?.ball?.lastHitBy ?? -1}:${rally}:${point}`,
    phase: timing === 'EARLY' ? 'RESETTING' : landingTimer > 0 ? 'AIRBORNE' : 'LANDED',
    timing,
    quality,
    skill,
    landingOffset,
    landingTimer,
    resetTimer,
    firstStepTimer: 0,
    firstStepDuration: 0,
    impulse: 0,
    missPenaltyTimer: timing === 'MISSED' ? clamp(0.115 - quality * 0.045, 0.070, 0.11) : 0,
    isServeReturn,
    movementLoad,
    recoveryLoad,
  };
  player._tm.splitStep = state;
  syncLegacySplitFields(player);
  return state;
}

function openFirstStep(state) {
  if (state.timing === 'MISSED') {
    state.phase = 'RECOVERING';
    state.firstStepTimer = 0;
    state.firstStepDuration = 0;
    state.impulse = 0;
    return;
  }
  state.phase = 'PUSH';
  state.firstStepDuration = clamp(0.085 + state.quality * 0.075, 0.09, 0.16);
  state.firstStepTimer = state.firstStepDuration;
  const timingMult = state.timing === 'ON_TIME' ? 1 : state.timing === 'EARLY' ? 0.62 : 0.48;
  state.impulse = clamp((0.16 + state.quality * 0.46) * timingMult, 0.10, 0.60);
}

export function updateSplitStep(player, dt) {
  const state = player?._tm?.splitStep;
  if (!state) return null;
  const delta = Math.max(0, dt || 0);
  if (state.phase === 'AIRBORNE') {
    state.landingTimer = Math.max(0, state.landingTimer - delta);
    if (state.landingTimer <= 0) openFirstStep(state);
  } else if (state.phase === 'RESETTING') {
    state.resetTimer = Math.max(0, state.resetTimer - delta);
    if (state.resetTimer <= 0) openFirstStep(state);
  } else if (state.phase === 'LANDED') {
    openFirstStep(state);
  } else if (state.phase === 'PUSH') {
    state.firstStepTimer = Math.max(0, state.firstStepTimer - delta);
    if (state.firstStepTimer <= 0) state.phase = 'SETTLED';
  } else if (state.phase === 'RECOVERING') {
    state.missPenaltyTimer = Math.max(0, state.missPenaltyTimer - delta);
    if (state.missPenaltyTimer <= 0) state.phase = 'SETTLED';
  }
  syncLegacySplitFields(player);
  return state;
}

export function applySplitStepToSteering(player, steering) {
  const state = player?._tm?.splitStep;
  if (!state) return steering;
  let { desiredVx, desiredVy, maxAccelStep, maxDecelStep } = steering;
  if (state.phase === 'AIRBORNE') {
    // No ar não existe mudança súbita de apoio: conserva o vetor que já possuía,
    // mas sem o congelamento exponencial do modelo anterior.
    desiredVx = desiredVx * 0.24 + (player.vel?.x ?? 0) * 0.76;
    desiredVy = desiredVy * 0.24 + (player.vel?.y ?? 0) * 0.76;
    maxAccelStep *= 0.22 + state.quality * 0.10;
    maxDecelStep *= 0.74;
  } else if (state.phase === 'RESETTING') {
    maxAccelStep *= 0.48 + state.quality * 0.16;
    maxDecelStep *= 0.86;
  } else if (state.phase === 'RECOVERING') {
    maxAccelStep *= 0.82;
  }
  return { ...steering, desiredVx, desiredVy, maxAccelStep, maxDecelStep };
}

export function getSplitStepImpulse(player) {
  const state = player?._tm?.splitStep;
  if (!state || state.phase !== 'PUSH' || state.firstStepTimer <= 0) return 0;
  const fade = clamp(state.firstStepTimer / Math.max(0.001, state.firstStepDuration), 0, 1);
  return state.impulse * (0.35 + fade * 0.65);
}

export function syncLegacySplitFields(player) {
  if (!player?._tm) return;
  const state = player._tm.splitStep;
  player._tm.splitTimer = state
    ? Math.max(0, state.landingTimer ?? 0) + Math.max(0, state.resetTimer ?? 0)
    : 0;
  player._tm.firstStepBoostTimer = state?.firstStepTimer ?? 0;
  player._tm.firstStepBoostDuration = state?.firstStepDuration ?? 0;
}
