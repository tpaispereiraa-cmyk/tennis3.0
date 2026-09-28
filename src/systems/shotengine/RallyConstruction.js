import { clamp } from '../../core/math.js';
import { ShotDirection, ShotFamily, ShotIntent } from './ShotTypes.js';

export const ConstructionStage = Object.freeze({
  READ: 'READ',
  PROBE: 'PROBE',
  PIN: 'PIN',
  STRETCH: 'STRETCH',
  OPEN: 'OPEN',
  CASH_OUT: 'CASH_OUT',
  RESET: 'RESET',
});

function attr(player, key, fallback = 60) {
  return clamp((player?.attrs?.[key] ?? fallback) / 100, 0, 1);
}

function emptyState(pointId = null) {
  return {
    version: 'rally-construction-v1',
    pointId,
    lastRally: -1,
    contacts: 0,
    stage: ConstructionStage.READ,
    confidence: 0,
    lastOpponentX: 0,
    lastOpponentVelX: 0,
    pinSign: 0,
    pinCount: 0,
    bodyCount: 0,
    openingScore: 0,
    history: [],
    lastExecutedPlan: null,
  };
}

function pointId(context) {
  return context?.gs?._currentPointId ?? context?.gs?._pointSeq ?? null;
}

function getState(context) {
  const player = context?.player;
  if (!player?.ctx) return emptyState(pointId(context));
  const id = pointId(context);
  const rally = context?.score?.rally ?? 0;
  const old = player.ctx.rallyConstruction;
  const newPoint = !old
    || old.version !== 'rally-construction-v1'
    || (id != null && old.pointId !== id)
    || (id == null && rally < (old.lastRally ?? -1));
  if (newPoint) player.ctx.rallyConstruction = emptyState(id);
  return player.ctx.rallyConstruction;
}

function patternFromMemory(memory) {
  const shots = (memory?.shots ?? []).filter(shot => !shot.serve).slice(-4);
  const lateral = shots.filter(shot => Math.abs(shot.targetX ?? 0) >= 0.75);
  let pinSign = 0;
  let pinCount = 0;
  for (let i = lateral.length - 1; i >= 0; i -= 1) {
    const sign = Math.sign(lateral[i].targetX ?? 0);
    if (!pinSign) pinSign = sign;
    if (sign !== pinSign) break;
    pinCount += 1;
  }
  const bodyCount = shots.slice(-3).filter(shot => shot.direction === ShotDirection.BODY || Math.abs(shot.targetX ?? 0) < 0.62).length;
  const deepCount = shots.slice(-3).filter(shot => Math.abs(shot.targetY ?? 0) >= 9.1 && (shot.quality ?? 0) >= 0.50).length;
  return { shots, pinSign, pinCount, bodyCount, deepCount };
}

export function evaluateRallyConstruction(context, quality, ev = null) {
  const state = getState(context);
  const memory = context?.memory ?? context?.player?.ctx?.shotMemory ?? null;
  const pattern = patternFromMemory(memory);
  const q = quality?.quality ?? 0.5;
  const ready = context?.body?.contactReadiness ?? 0;
  const arrival = context?.body?.arrivalMargin ?? 0;
  const bodyState = quality?.bodyState ?? '';
  const clean = q >= 0.55 && ready >= 0.44 && arrival >= -0.055
    && !['LOW_PICKUP', 'LATE', 'STRETCHED', 'FALLING_BACK'].includes(bodyState);
  const player = context?.player;
  const oppX = context?.opponent?.pos?.x ?? 0;
  const oppVelX = context?.body?.opponentVel?.x ?? context?.opponent?.vel?.x ?? 0;
  const oppWide = Math.abs(oppX) >= 1.55;
  const lateralSpeed = Math.abs(oppVelX);
  const recoveringToCenter = oppWide && lateralSpeed >= 0.58 && Math.sign(oppVelX) === -Math.sign(oppX);
  const commitment = context?.body?.opponentMovementTelemetry?.bodyCommitment
    ?? context?.opponent?._movementTelemetry?.bodyCommitment
    ?? null;
  const commitmentStrength = commitment?.strength ?? context?.opponent?._movementTelemetry?.bodyCommitmentStrength ?? 0;
  const tacticalRead = attr(player, 'visaoTatica') * 0.48 + attr(player, 'leitura') * 0.38 + attr(player, 'controle') * 0.14;
  const cadence = context?.prefs?.rallyCadence ?? 'MEASURED';
  const requiredSetup = cadence === 'EXPLOSIVE' ? 1 : cadence === 'PATIENT' ? 3 : 2;
  const maturePin = pattern.pinCount >= requiredSetup;
  const bodyTrap = pattern.bodyCount >= 2 && lateralSpeed >= 0.52;
  const openingScore = clamp(
    pattern.pinCount * 0.16
    + pattern.deepCount * 0.08
    + (oppWide ? 0.24 : 0)
    + clamp(lateralSpeed / 3.2, 0, 1) * 0.16
    + commitmentStrength * 0.12
    + (memory?.pressureBuilt ?? 0) * 0.18,
    0,
    1,
  );

  let stage = ConstructionStage.READ;
  let reason = 'reading_exchange';
  let recommendedDirection = null;
  let targetSign = 0;
  let wrongFootTrap = false;

  if (!clean) {
    stage = ConstructionStage.RESET;
    reason = 'construction_aborted_by_contact';
    recommendedDirection = ShotDirection.CENTER;
  } else if (pattern.shots.length === 0) {
    stage = ConstructionStage.PROBE;
    reason = 'first_pattern_ball';
  } else if ((maturePin || bodyTrap) && oppWide) {
    const cashWindow = q >= 0.68 && ready >= 0.54 && openingScore >= 0.62
      && ![ShotIntent.DEFEND, ShotIntent.RESET].includes(ev?.recommendedIntent);
    stage = cashWindow ? ConstructionStage.CASH_OUT : ConstructionStage.OPEN;
    if (recoveringToCenter && (maturePin || bodyTrap) && tacticalRead >= 0.54) {
      // O rival volta ao centro: atacar novamente o lado abandonado exige uma
      // reversão física real. Isto é o contrapé construído.
      targetSign = Math.sign(oppX || pattern.pinSign || 1);
      wrongFootTrap = true;
      recommendedDirection = ShotDirection.BODY;
      reason = 'attack_behind_recovery';
    } else {
      targetSign = -Math.sign(oppX || pattern.pinSign || 1);
      recommendedDirection = ShotDirection.WIDE;
      reason = 'open_court_created';
    }
  } else if (maturePin || bodyTrap) {
    stage = ConstructionStage.STRETCH;
    recommendedDirection = bodyTrap ? ShotDirection.CROSS : ShotDirection.WIDE;
    targetSign = pattern.pinSign;
    reason = bodyTrap ? 'body_pressure_then_move' : 'stretch_pinned_side';
  } else if (pattern.pinCount > 0 || pattern.bodyCount > 0) {
    stage = ConstructionStage.PIN;
    recommendedDirection = pattern.bodyCount > pattern.pinCount ? ShotDirection.BODY : ShotDirection.CROSS;
    targetSign = pattern.pinSign;
    reason = pattern.bodyCount > pattern.pinCount ? 'building_body_pressure' : 'building_side_pressure';
  } else {
    stage = ConstructionStage.PROBE;
    reason = 'pattern_not_established';
  }

  const confidence = clamp(tacticalRead * 0.52 + openingScore * 0.34 + (clean ? 0.14 : -0.12), 0, 1);
  state.lastRally = context?.score?.rally ?? state.lastRally;
  state.contacts = pattern.shots.length;
  state.stage = stage;
  state.confidence = +confidence.toFixed(3);
  state.lastOpponentX = oppX;
  state.lastOpponentVelX = oppVelX;
  state.pinSign = pattern.pinSign;
  state.pinCount = pattern.pinCount;
  state.bodyCount = pattern.bodyCount;
  state.openingScore = +openingScore.toFixed(3);

  return Object.freeze({
    version: state.version,
    stage,
    contacts: pattern.shots.length,
    confidence: state.confidence,
    pinSign: pattern.pinSign,
    pinCount: pattern.pinCount,
    bodyCount: pattern.bodyCount,
    openingScore: state.openingScore,
    recommendedDirection,
    targetSign,
    wrongFootTrap,
    clean,
    reason,
    familyBias: Object.freeze(stage === ConstructionStage.RESET
      ? { [ShotFamily.TOPSPIN]: 0.04, [ShotFamily.SLICE]: 0.03 }
      : stage === ConstructionStage.OPEN || stage === ConstructionStage.CASH_OUT
        ? { [ShotFamily.FLAT_DRIVE]: 0.09, [ShotFamily.TOPSPIN]: 0.07 }
        : { [ShotFamily.TOPSPIN]: 0.065, [ShotFamily.FLAT_DRIVE]: 0.025 }),
  });
}

export function constructionFamilyBias(construction, family) {
  return construction?.familyBias?.[family] ?? 0;
}

export function constructionDirectionBias(construction, direction, intent) {
  if (!construction || construction.stage === ConstructionStage.READ) return 0;
  if (construction.stage === ConstructionStage.RESET) return direction === ShotDirection.CENTER ? 0.18 : 0;
  if (construction.recommendedDirection !== direction) return 0;
  const attacking = [ShotIntent.PRESSURE, ShotIntent.REDIRECT, ShotIntent.FINISH].includes(intent);
  return (attacking ? 0.30 : 0.18) * (0.55 + (construction.confidence ?? 0) * 0.45);
}

export function guideConstructionIntent(construction, intent, context, quality, ev = null) {
  if (!construction?.clean || [ShotIntent.DEFEND, ShotIntent.RESET, ShotIntent.APPROACH, ShotIntent.PASS, ShotIntent.FINISH].includes(intent)) return intent;
  const q = quality?.quality ?? 0.5;
  if (construction.stage === ConstructionStage.CASH_OUT && q >= 0.68) {
    return (ev?.finishEV ?? 0) >= 0.68 ? ShotIntent.FINISH : ShotIntent.REDIRECT;
  }
  if (construction.stage === ConstructionStage.OPEN && intent === ShotIntent.BUILD && q >= 0.62) return ShotIntent.PRESSURE;
  if (construction.stage === ConstructionStage.STRETCH && intent === ShotIntent.CONTROL) return ShotIntent.BUILD;
  return intent;
}

export function advanceRallyConstruction({ player, decision, execution, quality } = {}) {
  const state = player?.ctx?.rallyConstruction;
  if (!state || !decision) return state ?? null;
  const entry = Object.freeze({
    stage: decision?.rallyConstruction?.stage ?? state.stage,
    intent: decision.intent,
    family: decision.family,
    direction: decision.direction,
    targetX: +(execution?.targetX ?? decision?.target?.x ?? 0).toFixed(3),
    targetY: +(execution?.targetY ?? decision?.target?.y ?? 0).toFixed(3),
    quality: +(quality?.quality ?? 0.5).toFixed(3),
  });
  state.lastExecutedPlan = entry;
  state.history.push(entry);
  if (state.history.length > 8) state.history.shift();
  return state;
}

export function resetRallyConstruction(player) {
  if (player?.ctx) player.ctx.rallyConstruction = emptyState(null);
}
