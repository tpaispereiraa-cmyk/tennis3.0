import { clamp } from '../../core/math.js';
import { PLAYER_CFG } from '../../core/constants.js';
import { getCourtIdentity } from '../../domain/players/PlayerCourtIdentity.js';

export const ContactTiming = Object.freeze({
  EMERGENCY: 'EMERGENCY_CONTACT',
  TAKE_EARLY: 'TAKE_EARLY',
  IDEAL_HEIGHT: 'IDEAL_HEIGHT',
  WAIT_FOR_PEAK: 'WAIT_FOR_PEAK',
});

function norm(player, key, fallback = 60) {
  return clamp((player?.attrs?.[key] ?? fallback) / 100, 0, 1);
}

function arrivalTime(player, candidate) {
  const dx = (candidate?.x ?? 0) - (player?.pos?.x ?? 0);
  const dy = (candidate?.y ?? 0) - (player?.pos?.y ?? 0);
  const distance = Math.hypot(dx, dy);
  const speed = Math.max(2.2, (player?.playerSpeed ?? PLAYER_CFG.speed) * (0.78 + clamp(player?.stamina ?? 1, 0, 1) * 0.18));
  const accel = Math.max(3.2, player?.playerAccel ?? PLAYER_CFG.maxAccel);
  const dirX = distance > 1e-6 ? dx / distance : 0;
  const dirY = distance > 1e-6 ? dy / distance : 0;
  // Momentum no sentido oposto não é tempo grátis: primeiro é necessário
  // frear. Isso impede que uma janela bonita, porém fisicamente tardia, vença.
  const projected = (player?.vel?.x ?? 0) * dirX + (player?.vel?.y ?? 0) * dirY;
  const braking = projected < 0 ? Math.abs(projected) / Math.max(3.2, player?.playerDecel ?? accel) : 0;
  const initial = Math.max(0, projected);
  const accelTime = Math.min(Math.max(0, (speed - initial) / accel), Math.sqrt((2 * distance) / accel));
  const accelDistance = initial * accelTime + 0.5 * accel * accelTime * accelTime;
  return braking + accelTime + Math.max(0, distance - accelDistance) / speed;
}

function timingIdentity(player) {
  const cadence = player?.prefs?.rallyCadence ?? 'BALANCED';
  const base = cadence === 'EARLY_ATTACK' ? { early: 0.92, patience: 0.20 }
    : cadence === 'EXPLOSIVE' ? { early: 0.76, patience: 0.28 }
      : cadence === 'PATIENT' ? { early: 0.20, patience: 0.90 }
        : cadence === 'MEASURED' ? { early: 0.38, patience: 0.72 } : { early: 0.50, patience: 0.52 };
  const timing = getCourtIdentity(player).timing;
  return { early: clamp(base.early + timing.earlyContactBias + timing.riseContactBias, 0.08, 1),
    patience: clamp(base.patience + timing.peakContactBias - timing.earlyContactBias, 0.08, 1) };
}

export function chooseContactPointWindow({ player, gs, trajectory, profile, side } = {}) {
  const candidates = trajectory?.hitCandidates ?? [];
  if (!player || candidates.length === 0) return null;

  const identity = timingIdentity(player);
  const reading = norm(player, 'leitura');
  const control = norm(player, 'controle');
  const explosion = norm(player, 'explosividade');
  const returnSkill = norm(player, 'devolucao');
  const isReturn = player?.id === gs?.receiver && (gs?.rally ?? 0) === 0;
  // Split-step e leitura compram reação, não velocidade de corrida.
  const returnReactionCredit = isReturn
    ? clamp(0.025 + returnSkill * 0.055 + reading * 0.035 + explosion * 0.020, 0.05, 0.13)
    : 0;
  const preferredZ = profile?.preferredContactZ ?? 0.9;
  const reach = player?.reach ?? PLAYER_CFG.reach;
  const scored = candidates.map((candidate, index) => {
    const movementCandidate = { ...candidate, y: candidate.y + (side > 0 ? 1 : -1) * 0.12 };
    const travel = arrivalTime(player, movementCandidate);
    const margin = candidate.t + returnReactionCredit - travel;
    const reachable = margin >= -0.10;
    const settle = clamp((margin + 0.08) / 0.30, 0, 1);
    const heightFit = 1 - clamp(Math.abs(candidate.z - preferredZ) / Math.max(0.24, profile?.contactBand ?? 0.28), 0, 1);
    const rising = candidate.vz > 0.18;
    const low = candidate.z < preferredZ - 0.16;
    const futureBetter = candidates.slice(index + 1).some(future => {
      if (future.t - candidate.t < 0.10 || future.t - candidate.t > 0.48) return false;
      const futureTarget = { ...future, y: future.y + (side > 0 ? 1 : -1) * 0.12 };
      return future.z > candidate.z + 0.14 && future.t + returnReactionCredit - arrivalTime(player, futureTarget) >= 0.03;
    });
    const timeCost = clamp(candidate.t / 1.05, 0, 1);
    const earlyReward = rising ? identity.early * (1 - timeCost) * 0.42 : 0;
    const preparationReward = settle * (0.32 + control * 0.24);
    const heightReward = heightFit * (0.54 + reading * 0.22);
    const patientReward = identity.patience * heightFit * clamp(candidate.timeSinceBounce / 0.42, 0, 1) * 0.20;
    const returnUrgency = isReturn ? timeCost * 0.28 : 0;
    const lowTooSoonPenalty = low && futureBetter ? 0.78 + identity.patience * 0.32 : 0;
    const lateFallPenalty = candidate.vz < -1.8 ? 0.16 + timeCost * 0.22 : 0;
    const score = (reachable ? 0.42 : -1.15)
      + preparationReward
      + heightReward
      + earlyReward
      + patientReward
      + explosion * (rising ? 0.08 : 0)
      - timeCost * (0.12 + identity.early * 0.12)
      - returnUrgency
      - lowTooSoonPenalty
      - lateFallPenalty;
    return { candidate, score, margin, heightFit, futureBetter, low, rising };
  });

  const reachable = scored.filter(item => item.margin >= -0.08);
  const preparedWindows = reachable.filter(item => item.margin >= 0.035);
  const selected = preparedWindows.length
    ? [...preparedWindows].sort((a, b) => b.score - a.score)[0]
    : reachable.length
      ? [...reachable].sort((a, b) => b.score - a.score)[0]
      // Nenhuma solução alcançável: sobreviver exige a primeira janela, não
      // perseguir a altura ideal enquanto a bola já passou.
      : [...scored].sort((a, b) => a.candidate.t - b.candidate.t)[0];
  if (!selected) return null;
  const earliestReachable = reachable.reduce((best, item) => !best || item.candidate.t < best.candidate.t ? item : best, null);
  const waited = !!earliestReachable
    && selected.margin >= 0.035
    && selected.candidate.t - earliestReachable.candidate.t >= 0.105;
  const mode = selected.margin < 0
    ? ContactTiming.EMERGENCY
    : waited && selected.candidate.vz > 0.15
      ? ContactTiming.WAIT_FOR_PEAK
      : selected.heightFit >= 0.72
        ? ContactTiming.IDEAL_HEIGHT
        : ContactTiming.TAKE_EARLY;
  const stanceOffset = mode === ContactTiming.EMERGENCY ? 0.06 : 0.10 + control * 0.04;

  return Object.freeze({
    mode,
    point: Object.freeze({
      x: selected.candidate.x,
      y: selected.candidate.y + (side > 0 ? 1 : -1) * stanceOffset,
      z: selected.candidate.z,
      t: selected.candidate.t,
    }),
    waitForBetterContact: waited,
    arrivalMargin: +selected.margin.toFixed(3),
    heightFit: +selected.heightFit.toFixed(3),
    candidateCount: candidates.length,
    reason: waited ? 'better_height_and_stance_available' : selected.rising ? 'take_ball_on_rise' : 'best_reachable_window',
  });
}
