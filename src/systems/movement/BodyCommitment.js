import { clamp } from '../../core/math.js';

function normalized(x, y, fallback = { x: 0, y: 0 }) {
  const mag = Math.hypot(x, y);
  return mag > 1e-6 ? { x: x / mag, y: y / mag } : { ...fallback };
}

export function createBodyCommitment(player, shotKey = null) {
  const speed = Math.hypot(player?.vel?.x ?? 0, player?.vel?.y ?? 0);
  const carriedDirection = normalized(player?.vel?.x ?? 0, player?.vel?.y ?? 0);
  const carryingRecovery = speed > 0.55;
  return {
    shotKey,
    phase: carryingRecovery ? 'COMMITTED' : 'READING',
    direction: carryingRecovery ? carriedDirection : { x: 0, y: 0 },
    pendingDirection: null,
    strength: carryingRecovery ? clamp(0.20 + speed / 7.2 * 0.62, 0.22, 0.82) : 0,
    reversalTimer: 0,
    reversalDuration: 0,
    reversalSeverity: 0,
    cooldown: 0,
    fooled: false,
    source: carryingRecovery ? 'RECOVERY_MOMENTUM' : 'READ',
    correctionCount: 0,
    lastDot: 1,
  };
}

function recoverySkill(player) {
  const attrs = player?.attrs ?? {};
  return clamp(
    (attrs.leitura ?? 60) * 0.30
      + (attrs.explosividade ?? 60) * 0.38
      + (attrs.velocidade ?? 60) * 0.20
      + (attrs.equilibrio ?? attrs.controle ?? 60) * 0.12,
    0,
    100,
  ) / 100;
}

export function updateBodyCommitment(player, target, dt, {
  shotKey = null,
  perceptionConfidence = 0.5,
  perceptionSkill = 0.6,
  targetTime = 0.4,
  designedWrongFoot = false,
} = {}) {
  if (!player?._tm || !target) return null;
  let state = player._tm.bodyCommitment;
  if (!state || state.shotKey !== shotKey) {
    state = createBodyCommitment(player, shotKey);
    player._tm.bodyCommitment = state;
  }

  state.cooldown = Math.max(0, state.cooldown - dt);
  const dx = (target.x ?? player.pos.x) - player.pos.x;
  const dy = (target.y ?? player.pos.y) - player.pos.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 0.14) {
    state.strength = clamp(state.strength - dt * 2.4, 0, 1);
    if (state.reversalTimer <= 0) state.phase = 'BALANCED';
    return state;
  }

  const targetDirection = normalized(dx, dy, state.direction);
  const urgency = clamp(1 - targetTime / 0.85, 0, 1);
  const commitThreshold = clamp(0.24 + perceptionSkill * 0.12 - urgency * 0.07, 0.20, 0.37);

  if (state.reversalTimer > 0) {
    state.reversalTimer = Math.max(0, state.reversalTimer - dt);
    if (state.reversalTimer <= 0) {
      state.direction = state.pendingDirection ?? targetDirection;
      state.pendingDirection = null;
      state.strength = clamp(0.18 + perceptionConfidence * 0.24, 0.18, 0.42);
      state.phase = 'REACCELERATING';
      state.cooldown = 0.075;
    }
    return state;
  }

  if (state.phase === 'READING' || state.phase === 'BALANCED') {
    if (perceptionConfidence >= commitThreshold || urgency > 0.72) {
      state.direction = targetDirection;
      state.phase = 'COMMITTED';
      state.source = perceptionConfidence >= commitThreshold ? 'PERCEPTION' : 'URGENCY';
      state.strength = clamp(0.12 + urgency * 0.18, 0.12, 0.30);
    }
    return state;
  }

  const dot = clamp(state.direction.x * targetDirection.x + state.direction.y * targetDirection.y, -1, 1);
  const lateralFlip = Math.sign(state.direction.x || 0) !== Math.sign(targetDirection.x || 0)
    && Math.abs(state.direction.x) > 0.28
    && Math.abs(targetDirection.x) > 0.28;
  // Correção angular faz parte da corrida; contrapé exige abandonar de fato
  // a rota carregada. O limiar antigo punia curvas de acompanhamento como uma
  // inversão completa e criava dezenas de falsos wrong-foots por partida.
  const meaningfulChange = dot < 0.22 || (lateralFlip && dot < 0.56);
  state.lastDot = dot;

  if (meaningfulChange && state.strength > 0.18 && state.cooldown <= 0) {
    const angleSeverity = clamp((0.72 - dot) / 1.72, 0, 1);
    const speed = Math.hypot(player.vel?.x ?? 0, player.vel?.y ?? 0);
    const motionSeverity = clamp(speed / 4.8, 0.12, 1);
    const skill = recoverySkill(player);
    const severity = clamp(
      state.strength * 0.50
        + angleSeverity * 0.34
        + motionSeverity * 0.16
        + (designedWrongFoot ? 0.08 : 0)
        - skill * 0.13,
      0.12,
      0.92,
    );
    const duration = clamp(0.055 + severity * 0.205 - skill * 0.035, 0.045, 0.235);
    state.pendingDirection = targetDirection;
    state.reversalTimer = duration;
    state.reversalDuration = duration;
    state.reversalSeverity = severity;
    state.phase = 'BRAKING';
    state.fooled = true;
    state.source = state.source === 'RECOVERY_MOMENTUM' && state.correctionCount === 0
      ? 'RECOVERY_MOMENTUM'
      : designedWrongFoot
        ? 'TACTICAL_WRONG_FOOT'
        : 'PERCEPTION_CORRECTION';
    state.correctionCount += 1;
    return state;
  }

  // Enquanto a leitura não pede inversão real, o corpo ganha compromisso com
  // a primeira passada. A direção acompanha apenas correções pequenas.
  const directionBlend = clamp(dt * (1.8 + perceptionConfidence * 2.2), 0, 0.16);
  state.direction = normalized(
    state.direction.x * (1 - directionBlend) + targetDirection.x * directionBlend,
    state.direction.y * (1 - directionBlend) + targetDirection.y * directionBlend,
    targetDirection,
  );
  state.strength = clamp(state.strength + dt * (1.15 + urgency * 0.85), 0, 1);
  state.phase = state.phase === 'REACCELERATING' && state.strength < 0.38 ? 'REACCELERATING' : 'COMMITTED';
  return state;
}

export function applyBodyCommitmentToSteering(player, steering) {
  const state = player?._tm?.bodyCommitment;
  if (!state) return steering;
  let { desiredVx, desiredVy, maxAccelStep, maxDecelStep } = steering;
  const desiredSpeed = Math.hypot(desiredVx, desiredVy);

  if (state.reversalTimer > 0) {
    const progress = clamp(state.reversalTimer / Math.max(0.001, state.reversalDuration), 0, 1);
    const severity = clamp(state.reversalSeverity, 0, 1);
    const oldVx = state.direction.x * desiredSpeed;
    const oldVy = state.direction.y * desiredSpeed;
    const directionalCarry = clamp(progress * severity * 0.72, 0, 0.68);
    desiredVx = desiredVx * (1 - directionalCarry) + oldVx * directionalCarry;
    desiredVy = desiredVy * (1 - directionalCarry) + oldVy * directionalCarry;
    maxAccelStep *= 1 - severity * (0.52 + progress * 0.18);
    maxDecelStep *= 1 - severity * 0.18;
  } else if (state.phase === 'COMMITTED' && state.strength > 0.18) {
    const confidence = clamp(player?._perceptionState?.confidence ?? 0.5, 0, 1);
    const lock = clamp(state.strength * (1 - confidence * 0.58) * 0.28, 0, 0.22);
    desiredVx = desiredVx * (1 - lock) + state.direction.x * desiredSpeed * lock;
    desiredVy = desiredVy * (1 - lock) + state.direction.y * desiredSpeed * lock;
  } else if (state.phase === 'REACCELERATING') {
    maxAccelStep *= 0.88;
  }

  return { ...steering, desiredVx, desiredVy, maxAccelStep, maxDecelStep };
}

export function getBodyCommitmentPenalty(player) {
  const state = player?._tm?.bodyCommitment;
  if (!state || state.reversalTimer <= 0) return 0;
  const remaining = clamp(state.reversalTimer / Math.max(0.001, state.reversalDuration), 0, 1);
  return clamp(0.018 + state.reversalSeverity * 0.105 * remaining, 0, 0.13);
}
