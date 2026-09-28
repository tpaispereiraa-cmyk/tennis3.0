import { GameState } from '../../core/constants.js';
import { clamp } from '../../core/math.js';
import { ShotPhase } from './ShotTypes.js';
import { buildPlayerShotCapabilities, resolveStrokeWing } from './PlayerShotCapabilities.js';
import { getShotMemory } from './ShotMemory.js';
import { evaluateStrokePreparation } from '../movement/StrokePreparation.js';

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
  const naturalWing = resolveStrokeWing(player, ball);
  const playerPos = player?.pos ?? { x: 0, y: 0 };
  const opponentPos = opponent?.pos ?? null;
  const opponentVel = opponent?.vel ?? { x: 0, y: 0 };
  const ballPos = ball?.pos ?? { x: 0, y: 0, z: 0 };
  const ballVel = ball?.vel ?? { x: 0, y: 0, z: 0 };
  const distanceToBall = Number.isFinite(movement?.distanceToBall)
    ? movement.distanceToBall
    : Number.isFinite(player?._movementDistanceToBall)
      ? player._movementDistanceToBall
      : distance2D(playerPos, ballPos);
  const baseReach = movement?.baseReach ?? player?._movementBaseReach ?? player?.reach ?? 0.85;
  const normalContactReach = movement?.normalContactReach ?? player?._movementNormalContactReach ?? baseReach * 1.14;
  const reach = movement?.contactReach ?? player?._movementContactReach ?? baseReach;
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
  const movementPhase = player?._movementTelemetry?.phase ?? player?._tm?.commit?.phase ?? null;
  const rawServeAdvantage = gs?._serveAdvantageContext ?? null;
  // A memória da entrega pertence ao sacador. Sem dono, o antigo contexto
  // acabava premiando também o devolvedor no +2 com a vantagem criada contra
  // ele próprio.
  const serveAdvantage = rawServeAdvantage?.beneficiaryId == null
    || rawServeAdvantage.beneficiaryId === player?.id
    ? rawServeAdvantage
    : null;
  const strokePreparation = evaluateStrokePreparation({
    player,
    ball,
    plan: player?._footworkPlan ?? null,
    naturalWing,
    readiness: contactReadiness,
    arrivalMargin,
    spacingQuality: movement?.footworkSpacingQuality ?? player?._footworkSpacingQuality ?? 0.5,
  });
  const wing = strokePreparation.actualWing ?? naturalWing;
  const capabilities = buildPlayerShotCapabilities(player, {
    gs,
    ball,
    wing,
    phase: resolvedPhase,
    stamina: player?.stamina,
    atNet: !!player?.atNet,
    rally: gs?.rally ?? 0,
    strokePreparation,
  });
  const playerPointScore = gs?.inTiebreak
    ? (gs?.tbScore?.[player?.id] ?? 0)
    : (player?.score ?? 0);
  const opponentPointScore = gs?.inTiebreak
    ? (gs?.tbScore?.[opponent?.id] ?? 0)
    : (opponent?.score ?? 0);

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
    serveAdvantage,
    score: {
      player: playerPointScore,
      opponent: opponentPointScore,
      playerPoints: playerPointScore,
      opponentPoints: opponentPointScore,
      serverPoints: gs?.players?.[gs?.server]?.score ?? 0,
      returnerPoints: gs?.players?.[gs?.receiver]?.score ?? 0,
      playerGames: player?.games ?? 0,
      opponentGames: opponent?.games ?? 0,
      playerSets: player?.sets ?? 0,
      opponentSets: opponent?.sets ?? 0,
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
      baseReach,
      normalContactReach,
      arrivalMargin,
      canContact,
      contactClass,
      preferredContactZ,
      contactReadiness,
      contactSettleTime,
      commitDistance,
      commitDistanceRaw: movement?.commitDistanceRaw ?? player?._commitDistanceRaw ?? null,
      contactPositionError: movement?.contactPositionError ?? player?._contactPositionError ?? null,
      emergencyReachActive: movement?.emergencyReachActive ?? player?._movementEmergencyReachActive ?? false,
      movementContactScore,
      defensiveContact: player?._defensiveContact ?? null,
      locomotionMode,
      movementPhase,
      movementState: movement?.movementState ?? player?._movementTelemetry?.movementState ?? null,
      movementPlanVersion: movement?.movementPlanVersion ?? player?._movementTelemetry?.movementPlanVersion ?? null,
      planRevisions: movement?.planRevisions ?? player?._movementTelemetry?.planRevisions ?? 0,
      planCorrectionCost: movement?.planCorrectionCost ?? player?._movementTelemetry?.planCorrectionCost ?? 0,
      interceptionKind: movement?.interceptionKind ?? player?._movementTelemetry?.interceptionKind ?? null,
      interceptionUncertainty: movement?.interceptionUncertainty ?? player?._movementTelemetry?.interceptionUncertainty ?? null,
      beliefVersion: movement?.beliefVersion ?? player?._movementTelemetry?.beliefVersion ?? null,
      beliefPositionError: movement?.beliefPositionError ?? player?._movementTelemetry?.beliefPositionError ?? null,
      inferredShape: movement?.inferredShape ?? player?._movementTelemetry?.inferredShape ?? null,
      contactTiming: movement?.contactTiming ?? player?._movementTelemetry?.contactTiming ?? null,
      contactTimingReason: movement?.contactTimingReason ?? player?._movementTelemetry?.contactTimingReason ?? null,
      waitedForBetterContact: movement?.waitedForBetterContact ?? player?._movementTelemetry?.waitedForBetterContact ?? false,
      appliedContactWait: movement?.appliedContactWait ?? player?._movementTelemetry?.appliedContactWait ?? false,
      footworkStance: movement?.footworkStance ?? player?._movementTelemetry?.footworkStance ?? null,
      footworkWing: movement?.footworkWing ?? player?._movementTelemetry?.footworkWing ?? null,
      footworkPreparation: movement?.footworkPreparation ?? player?._movementTelemetry?.footworkPreparation ?? null,
      footworkSpacingQuality: movement?.footworkSpacingQuality ?? player?._movementTelemetry?.footworkSpacingQuality ?? null,
      runAroundForehand: movement?.runAroundForehand ?? player?._movementTelemetry?.runAroundForehand ?? false,
      strokePreparation,
      intendedWing: strokePreparation.intendedWing,
      naturalWing: strokePreparation.naturalWing,
      wingAlignment: strokePreparation.alignment,
      stanceFit: strokePreparation.stanceFit,
      bodyCommitmentToWing: strokePreparation.commitment,
      wingSwitchSeverity: strokePreparation.switchSeverity,
      lateWingSwitch: strokePreparation.lateSwitch,
      rotationReadiness: strokePreparation.rotationReadiness,
      weightTransfer: strokePreparation.weightTransfer,
      mechanicalIntegrity: strokePreparation.mechanicalIntegrity,
      directionFreedom: strokePreparation.directionFreedom,
      powerTransfer: strokePreparation.powerTransfer,
      recoveryExposure: strokePreparation.recoveryExposure,
      footingSurface: movement?.footingSurface ?? player?._movementTelemetry?.footingSurface ?? null,
      footingStability: movement?.footingStability ?? player?._movementTelemetry?.footingStability ?? null,
      surfaceSlide: movement?.surfaceSlide ?? player?._movementTelemetry?.surfaceSlide ?? false,
      surfaceSlideControl: movement?.surfaceSlideControl ?? player?._movementTelemetry?.surfaceSlideControl ?? 0,
      surfaceSlipRisk: movement?.surfaceSlipRisk ?? player?._movementTelemetry?.surfaceSlipRisk ?? 0,
      movementEngineVersion: movement?.movementEngineVersion ?? player?._movementTelemetry?.movementEngineVersion ?? null,
      movementCoherence: movement?.movementCoherence ?? player?._movementTelemetry?.movementCoherence ?? 1,
      movementCoherenceSeverity: movement?.movementCoherenceSeverity ?? player?._movementTelemetry?.movementCoherenceSeverity ?? 0,
      movementCoherenceFlags: movement?.movementCoherenceFlags ?? player?._movementTelemetry?.movementCoherenceFlags ?? [],
      bodyCommitment: player?._movementTelemetry ? {
        phase: player._movementTelemetry.bodyCommitmentPhase ?? null,
        strength: player._movementTelemetry.bodyCommitmentStrength ?? 0,
        reversalSeverity: player._movementTelemetry.bodyReversalSeverity ?? 0,
        correctionCount: player._movementTelemetry.bodyCorrectionCount ?? 0,
        fooled: !!player._movementTelemetry.bodyFooled,
        source: player._movementTelemetry.bodyCommitmentSource ?? null,
      } : null,
      splitStep: player?._movementTelemetry ? {
        phase: player._movementTelemetry.splitPhase ?? null,
        timing: player._movementTelemetry.splitTiming ?? null,
        quality: player._movementTelemetry.splitQuality ?? 0,
        landingOffset: player._movementTelemetry.splitLandingOffset ?? 0,
        impulse: player._movementTelemetry.splitImpulse ?? 0,
      } : null,
      stamina: clamp(player?.stamina ?? 1, 0, 1),
      atNet: !!player?.atNet,
      courtMode: player?.ctx?.courtMode ?? (player?.atNet ? 'NET' : 'BASE'),
      opponentVel,
      opponentArrivalMargin: opponent?._arrivalMargin ?? null,
      opponentContactReadiness: opponent?._contactReadiness ?? null,
      opponentLocomotionMode: opponent?._locomotionMode ?? null,
      opponentMovementTelemetry: opponent?._movementTelemetry ?? null,
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
