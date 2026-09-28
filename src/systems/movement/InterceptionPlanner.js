import { COURT, PLAYER_CFG, THRESHOLDS } from '../../core/constants.js';
import { clamp } from '../../core/math.js';
import { predictTrajectory } from '../../core/physics.js';
import { planContactFootwork } from './FootworkPlanner.js';

export const INTERCEPTION_PLANNER_VERSION = 'interception-planner-v3';

function attr(player, key, fallback = 60) {
  return clamp((player?.attrs?.[key] ?? fallback) / 100, 0, 1);
}

function netAffinity(player) {
  const base = { AVOIDS: 0.10, RELUCTANT: 0.28, OPPORTUNIST: 0.50, PROACTIVE: 0.72, HUNTER: 0.90 }[player?.prefs?.netGame] ?? 0.50;
  return clamp(base + (player?._surfaceIdentityFx?.netRecognition ?? 0), 0.08, 0.98);
}

function arrivalTime(player, point) {
  const dx = point.x - (player?.pos?.x ?? 0);
  const dy = point.y - (player?.pos?.y ?? 0);
  const distance = Math.hypot(dx, dy);
  if (distance < 0.01) return 0;
  const dirX = dx / distance;
  const dirY = dy / distance;
  const speed = Math.max(2.2, (player?.playerSpeed ?? PLAYER_CFG.speed) * (0.76 + clamp(player?.stamina ?? 1, 0, 1) * 0.20));
  const accel = Math.max(3.0, player?.playerAccel ?? PLAYER_CFG.maxAccel);
  const decel = Math.max(3.0, player?.playerDecel ?? PLAYER_CFG.maxDecel);
  const projected = (player?.vel?.x ?? 0) * dirX + (player?.vel?.y ?? 0) * dirY;
  const braking = projected < 0 ? Math.abs(projected) / decel : 0;
  const initial = Math.max(0, projected);
  const accelTime = Math.min(Math.max(0, (speed - initial) / accel), Math.sqrt(2 * distance / accel));
  const accelDistance = initial * accelTime + 0.5 * accel * accelTime * accelTime;
  return braking + accelTime + Math.max(0, distance - accelDistance) / speed;
}

function cadence(player) {
  const value = player?.prefs?.rallyCadence ?? 'BALANCED';
  const base = value === 'EARLY_ATTACK' ? { early: 1, patience: 0.12 }
    : value === 'EXPLOSIVE' ? { early: 0.80, patience: 0.24 }
      : value === 'PATIENT' ? { early: 0.14, patience: 1 }
        : value === 'MEASURED' ? { early: 0.32, patience: 0.76 }
          : { early: 0.52, patience: 0.52 };
  const surfaceBias = player?._surfaceIdentityFx?.patienceBias ?? 0;
  return {
    early: clamp(base.early - surfaceBias, 0.08, 1),
    patience: clamp(base.patience + surfaceBias, 0.08, 1),
  };
}

function scoreGroundCandidate(candidate, player, gs, profile, belief, index, candidates) {
  const previewFootwork = planContactFootwork({ player, gs, point: candidate, phase: 'TRAVEL', profile, persist: false });
  const bodyPoint = previewFootwork?.bodyTarget ?? candidate;
  const travel = arrivalTime(player, bodyPoint);
  const margin = candidate.t - travel;
  const reachable = margin >= -0.11;
  const control = attr(player, 'controle');
  const reading = attr(player, 'leitura');
  const identity = cadence(player);
  const surfaceFx = player?._surfaceIdentityFx ?? {};
  const lowComfort = candidate.z < profile.preferredContactZ ? (surfaceFx.lowContactBonus ?? 0) : 0;
  const highComfort = candidate.z > profile.preferredContactZ ? (surfaceFx.highContactBonus ?? 0) : 0;
  const heightFit = clamp(1 - Math.abs(candidate.z - profile.preferredContactZ) / Math.max(0.22, profile.contactBand) + lowComfort + highComfort, 0, 1);
  const settle = clamp((margin + 0.10) / 0.34, 0, 1);
  const rising = candidate.vz > 0.15;
  const low = candidate.z < profile.preferredContactZ - 0.16;
  const betterAhead = candidates.slice(index + 1).some((future) => future.t - candidate.t >= 0.10
    && future.t - candidate.t <= 0.46
    && future.z > candidate.z + 0.12
    && future.t - arrivalTime(player, future) >= 0.02);
  const uncertainty = clamp(belief?._perceptionUncertainty ?? 0.5, 0, 1);
  const latePredictionRisk = uncertainty * clamp(candidate.t / 1.15, 0, 1);
  const lowRushPenalty = low && betterAhead ? 0.62 + identity.patience * 0.28 : 0;
  const score = (reachable ? 0.52 : -1.4)
    + heightFit * (0.60 + reading * 0.18)
    + settle * (0.32 + control * 0.24 + (surfaceFx.preparationBonus ?? 0))
    + (rising ? identity.early * 0.18 : identity.patience * 0.08)
    - lowRushPenalty
    - latePredictionRisk * 0.22
    - clamp(candidate.t / 1.3, 0, 1) * identity.early * 0.13;
  return { ...candidate, score, margin, heightFit, reachable, betterAhead, kind: 'GROUND', previewFootwork };
}

function aerialCandidate(player, belief, trajectory, profile, courtMode) {
  if (!['TRANSITION', 'NET'].includes(courtMode) && !player?.atNet) return null;
  if ((belief?.bounceCount ?? 0) > 0) return null;
  const point = trajectory?.crossPoint;
  if (!point || point.z < 0.58 || point.z > THRESHOLDS.ballHitMaxZ + 0.75) return null;
  const side = player?.side > 0 ? 1 : -1;
  const cutY = side * clamp(2.45 + (1 - netAffinity(player)) * 0.85, 2.2, 3.45);
  const candidate = {
    x: point.x,
    y: side > 0 ? Math.min(point.y, cutY) : Math.max(point.y, cutY),
    z: point.z,
    t: clamp(point.t - 0.055, 0.05, 0.9),
    vz: belief?.vel?.z ?? 0,
  };
  const margin = candidate.t - arrivalTime(player, candidate);
  if (margin < -0.16) return null;
  return { ...candidate, margin, reachable: true, score: 1.08 + clamp(margin, -0.1, 0.3) * 0.7, kind: candidate.z >= 1.58 ? 'OVERHEAD' : 'VOLLEY', heightFit: 0.8 };
}

function lobRetreat(player, belief, trajectory, profile, courtMode) {
  if (!['TRANSITION', 'NET'].includes(courtMode) && !player?.atNet) return null;
  const land = trajectory?.landPoint;
  if (!land) return null;
  const side = player?.side > 0 ? 1 : -1;
  const behind = side > 0 ? land.y > (player.pos?.y ?? 0) + 0.75 : land.y < (player.pos?.y ?? 0) - 0.75;
  const deep = Math.abs(land.y) > COURT.serviceLineY + 1.0;
  const evidence = player?._perceptionState?.evidence?.lob ?? 0;
  if (!behind || !deep || evidence < 0.34) return null;
  return {
    x: land.x,
    y: clamp(land.y + side * 0.92, side > 0 ? 0.6 : -COURT.halfL - 2, side > 0 ? COURT.halfL + 2 : -0.6),
    z: profile.preferredContactZ,
    t: Math.max(0.34, land.t + 0.20),
    margin: land.t - arrivalTime(player, land),
    reachable: true,
    score: 2.2,
    kind: 'LOB_RETREAT',
    heightFit: 0.7,
  };
}

function fallbackCandidate(player, belief, trajectory, profile, baseTarget) {
  const source = trajectory?.optimalHitPoint ?? trajectory?.crossPoint;
  if (source) return { ...source, kind: 'EMERGENCY', score: -0.4, margin: source.t - arrivalTime(player, source), reachable: false, heightFit: 0.3 };
  if (trajectory?.landPoint) {
    const side = player?.side > 0 ? 1 : -1;
    return { x: trajectory.landPoint.x, y: trajectory.landPoint.y + side * 0.72, z: profile.preferredContactZ, t: trajectory.landPoint.t + 0.30, kind: 'BOUNCE_RECOVERY', score: -0.25, margin: -0.1, reachable: false, heightFit: 0.5 };
  }
  return { x: belief?.pos?.x ?? baseTarget.x, y: baseTarget.y, z: profile.preferredContactZ, t: 0.30, kind: 'EMERGENCY', score: -0.8, margin: -0.2, reachable: false, heightFit: 0.2 };
}

export function planInterception({ player, gs, beliefBall, baseTarget, profile } = {}) {
  if (!player || !gs || !beliefBall || !baseTarget || !profile) return null;
  const side = player.side > 0 ? 1 : -1;
  const courtMode = player?.ctx?.courtMode ?? (player?.atNet ? 'NET' : 'BASE');
  const laneShift = 0.30 + netAffinity(player) * 1.16;
  const targetY = baseTarget.y - side * laneShift;
  // O perfil do jogador expressa preferência, não o limite físico da raquete.
  // Primeiro amostramos também pickups baixos; depois o score decide se vale
  // esperar uma altura melhor. Filtrar pelo ideal fazia jogadores pacientes
  // declararem todo slice baixo como "sem solução".
  const physicalWindow = {
    ...profile,
    minContactZ: Math.min(profile.minContactZ ?? 0.55, 0.40),
    maxContactZ: Math.max(profile.maxContactZ ?? 1.4, 1.72),
    lowBallBonus: Math.min(profile.lowBallBonus ?? -0.18, -0.14),
  };
  const trajectory = predictTrajectory(beliefBall, targetY, 2.65, gs?.environment?.airDensity, gs?.courtPhysics, physicalWindow, gs?.environment);
  const ground = (trajectory?.hitCandidates ?? []).map((candidate, index, all) => scoreGroundCandidate(candidate, player, gs, profile, beliefBall, index, all));
  const special = [lobRetreat(player, beliefBall, trajectory, profile, courtMode), aerialCandidate(player, beliefBall, trajectory, profile, courtMode)].filter(Boolean);
  const candidates = [...special, ...ground];
  let selected = [...candidates].sort((a, b) => b.score - a.score)[0] ?? fallbackCandidate(player, beliefBall, trajectory, profile, baseTarget);

  // Uma curtinha inferida muda a urgência, não fornece seu alvo secreto.
  const dropEvidence = player?._perceptionState?.evidence?.drop ?? 0;
  if (dropEvidence > 0.62 && trajectory?.landPoint) {
    const shortReachable = ground.filter((candidate) => candidate.reachable).sort((a, b) => a.t - b.t)[0];
    if (shortReachable) selected = { ...shortReachable, kind: 'SHORT_BALL_SPRINT', score: shortReachable.score + dropEvidence * 0.20 };
  }

  const phase = selected.kind === 'LOB_RETREAT' ? 'LOB_RETREAT'
    : selected.kind === 'VOLLEY' ? 'NET_CUT'
      : selected.kind === 'OVERHEAD' ? 'OVERHEAD_CUT'
        : selected.kind === 'SHORT_BALL_SPRINT' ? 'FORWARD_PICKUP'
          : selected.margin < -0.04 ? 'CONTACT_EMERGENCY'
            : selected.betterAhead && selected.heightFit > 0.66 ? 'CONTACT_WINDOW'
              : 'TRAVEL';
  let point = { x: selected.x, y: selected.y, z: selected.z, t: selected.t };
  const footwork = planContactFootwork({ player, gs, point, phase, profile });
  if (footwork?.bodyTarget) point = { ...footwork.bodyTarget };
  const uncertainty = clamp((beliefBall?._perceptionUncertainty ?? 0.5)
    + (trajectory?.uncertainty?.bounceVariance ?? 0) * 1.8, 0, 1);

  return Object.freeze({
    version: INTERCEPTION_PLANNER_VERSION,
    x: clamp(point.x, -COURT.singlesW / 2 - THRESHOLDS.outerPlayerX, COURT.singlesW / 2 + THRESHOLDS.outerPlayerX),
    y: clamp(point.y, side > 0 ? 0.55 : -COURT.halfL - THRESHOLDS.outerPlayerY, side > 0 ? COURT.halfL + THRESHOLDS.outerPlayerY : -0.55),
    z: point.z ?? profile.preferredContactZ,
    t: clamp(point.t ?? 0.30, 0.04, 1.30),
    phase,
    profile,
    bounceCount: beliefBall.bounceCount ?? 0,
    uncertainty: +uncertainty.toFixed(3),
    confidence: +(1 - uncertainty).toFixed(3),
    contactTiming: selected.margin < -0.04 ? 'EMERGENCY_CONTACT' : selected.betterAhead ? 'WAIT_FOR_PEAK' : selected.heightFit >= 0.72 ? 'IDEAL_HEIGHT' : 'TAKE_EARLY',
    contactTimingReason: selected.kind.toLowerCase(),
    contactCandidateCount: candidates.length,
    waitedForBetterContact: !!selected.betterAhead,
    appliedContactWait: !!selected.betterAhead && selected.margin >= 0.035,
    footworkStance: footwork?.stance ?? null,
    footworkWing: footwork?.wing ?? null,
    footworkPreparation: footwork?.preparationQuality ?? null,
    idealContactRadius: footwork?.idealContactRadius ?? null,
    runAroundForehand: !!footwork?.runAround,
    isAfterBounce: (beliefBall.bounceCount ?? 0) >= 1 && beliefBall.lastBounceSide === player.side,
    predictedLanding: trajectory?.landPoint ? { ...trajectory.landPoint } : null,
    selectedKind: selected.kind,
    arrivalMargin: +selected.margin.toFixed(3),
    alternatives: Object.freeze([...candidates].sort((a, b) => b.score - a.score).slice(0, 5).map((candidate) => Object.freeze({ kind: candidate.kind, t: +candidate.t.toFixed(3), z: +candidate.z.toFixed(3), margin: +candidate.margin.toFixed(3), score: +candidate.score.toFixed(3) }))),
  });
}
