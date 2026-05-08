import { GameState } from '../../core/constants.js';
import { clamp } from '../../core/math.js';
import { ShotPhase } from './ShotTypes.js';
import { buildPlayerShotCapabilities, resolveStrokeWing } from './PlayerShotCapabilities.js';
import { getShotMemory } from './ShotMemory.js';

function courtSide(player) {
  return player?.side && player.side < 0 ? -1 : 1;
}

function distance2D(a, b) {
  if (!a || !b) return 0;
  return Math.hypot((a.x ?? 0) - (b.x ?? 0), (a.y ?? 0) - (b.y ?? 0));
}

export function inferShotPhase(gs, player, opponent) {
  if (gs?.gameState === GameState.PRE_SERVE || gs?.gameState === GameState.SERVING) {
    return player?.id === gs?.server ? ShotPhase.SERVE : ShotPhase.RETURN;
  }
  if ((gs?.rally ?? 0) === 0 && player?.id === gs?.receiver) return ShotPhase.RETURN;
  if (player?.atNet || player?.ctx?.courtMode === 'NET') return ShotPhase.NET;
  if (opponent?.atNet || opponent?.ctx?.courtMode === 'NET') return ShotPhase.PASSING;
  const pressure = clamp(player?.ctx?.rallyPressure ?? 0, 0, 1);
  if (pressure > 0.68) return ShotPhase.RALLY_DEFENSE;
  if ((player?.ctx?.netIntent ?? 0) > 0.65 || player?.ctx?.courtMode === 'TRANSITION') return ShotPhase.APPROACH;
  return ShotPhase.RALLY_NEUTRAL;
}

export function buildShotContext({ gs, player, opponent = null, phase = null, movement = null, memory = null } = {}) {
  const ball = gs?.ball ?? null;
  const side = courtSide(player);
  const resolvedPhase = phase ?? inferShotPhase(gs, player, opponent);
  const wing = resolveStrokeWing(player, ball);
  const capabilities = buildPlayerShotCapabilities(player, { ball, wing });
  const playerPos = player?.pos ?? { x: 0, y: 0 };
  const opponentPos = opponent?.pos ?? null;
  const ballPos = ball?.pos ?? { x: 0, y: 0, z: 0 };
  const ballVel = ball?.vel ?? { x: 0, y: 0, z: 0 };
  const distanceToBall = distance2D(playerPos, ballPos);
  const reach = player?.reach ?? 0.85;
  const incoming = side > 0 ? (ballVel.y ?? 0) > 0.02 : (ballVel.y ?? 0) < -0.02;
  const ballSpeed = Math.hypot(ballVel.x ?? 0, ballVel.y ?? 0);
  const contactClass = movement?.contactClass ?? player?._movementContactClass ?? null;
  const arrivalMargin = movement?.arrivalMargin ?? player?._arrivalMargin ?? 0;
  const canContact = movement?.canContact ?? player?._movementCanContactBall ?? distanceToBall <= reach * 1.25;
  const preferredContactZ = movement?.preferredContactZ ?? player?._hitTarget?.z ?? null;
  const contactReadiness = movement?.contactReadiness ?? player?._contactReadiness ?? 0;
  const contactSettleTime = movement?.contactSettleTime ?? player?._contactSettleTime ?? 0;
  const commitDistance = movement?.commitDistance ?? player?._commitDistance ?? null;
  const movementContactScore = movement?.movementContactScore ?? player?._movementContactScore ?? 0;
  const locomotionMode = movement?.locomotionMode ?? player?._locomotionMode ?? null;

  return Object.freeze({
    version: 'shot-context-v1',
    gs,
    player,
    opponent,
    ball,
    phase: resolvedPhase,
    side,
    wing,
    capabilities,
    prefs: player?.prefs ?? {},
    score: {
      player: player?.score ?? 0,
      opponent: opponent?.score ?? 0,
      server: gs?.server,
      receiver: gs?.receiver,
      rally: gs?.rally ?? 0,
    },
    court: {
      surface: gs?.courtPhysics?.surface ?? gs?.courtId ?? 'HARD',
      netHeight: gs?.court?.netHeight ?? null,
      wind: gs?.environment?.wind ?? null,
      airDensity: gs?.environment?.airDensity ?? null,
    },
    body: {
      playerPos,
      opponentPos,
      distanceToBall,
      reach,
      arrivalMargin,
      canContact,
      contactClass,
      preferredContactZ,
      contactReadiness,
      contactSettleTime,
      commitDistance,
      movementContactScore,
      locomotionMode,
      stamina: clamp(player?.stamina ?? 1, 0, 1),
      atNet: !!player?.atNet,
      courtMode: player?.ctx?.courtMode ?? (player?.atNet ? 'NET' : 'BASE'),
    },
    ballState: {
      pos: ballPos,
      vel: ballVel,
      speed: ballSpeed,
      z: ballPos.z ?? 0,
      vz: ballVel.z ?? 0,
      incoming,
      bounceCount: ball?.bounceCount ?? 0,
      lastHitBy: ball?.lastHitBy ?? -1,
      lastBounceSide: ball?.lastBounceSide ?? 0,
    },
    memory: memory ?? getShotMemory(player),
  });
}
