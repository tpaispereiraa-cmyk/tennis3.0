import { clamp } from '../../core/math.js';
import { COURT } from '../../core/constants.js';
import { getCourtIdentity } from '../../domain/players/PlayerCourtIdentity.js';
import { getOpponentRead } from '../shotengine/OpponentObservation.js';

function norm(player, key, fallback = 60) {
  return clamp((player?.attrs?.[key] ?? fallback) / 100, 0, 1);
}

function lastOwnShot(player, ball) {
  const memoryShot = player?.ctx?.shotMemory?.shots?.at?.(-1) ?? null;
  if (memoryShot && !memoryShot.serve) return memoryShot;
  if (ball?.lastHitBy !== player?.id) return null;
  return {
    targetX: ball?._lastTargetX ?? 0,
    targetY: ball?._lastTargetY ?? 0,
    direction: ball?._lastShotMeta?.direction ?? null,
    intent: ball?._lastShotMeta?.intent ?? null,
    family: ball?._lastShotMeta?.family ?? null,
    quality: ball?._lastShotMeta?.quality ?? 0.5,
  };
}

function shotKey(player, gs, shot) {
  return `${gs?.ball?.lastHitBy ?? -1}:${gs?.rally ?? 0}:${(shot?.targetX ?? 0).toFixed(2)}:${(shot?.targetY ?? 0).toFixed(2)}`;
}

function buildPlan(player, gs, defaultTarget, shot) {
  const identity = getCourtIdentity(player);
  const targetX = clamp(shot?.targetX ?? 0, -COURT.singlesW / 2, COURT.singlesW / 2);
  const targetDepth = Math.abs(shot?.targetY ?? 0);
  const direction = shot?.direction ?? null;
  const intent = shot?.intent ?? 'BUILD';
  const tacticalSkill = norm(player, 'leitura') * 0.45
    + norm(player, 'visaoTatica') * 0.35
    + norm(player, 'controle') * 0.20;
  const movementSkill = norm(player, 'velocidade') * 0.42
    + norm(player, 'explosividade') * 0.34
    + norm(player, 'equilibrio', 60) * 0.24;
  const stamina = clamp(player?.stamina ?? 1, 0, 1);

  // A posição de cobertura nasce do ponto de contato provável do rival. Ela
  // fica levemente do lado onde a bola foi enviada, que é a bissetriz prática
  // entre a paralela curta e a cruzada longa — nunca em cima da própria bola.
  let geometryFactor = 0.20;
  if (direction === 'CROSS' || direction === 'INSIDE_OUT') geometryFactor = 0.24;
  if (direction === 'DTL' || direction === 'INSIDE_IN') geometryFactor = 0.13;
  if (direction === 'CENTER' || direction === 'BODY') geometryFactor = 0.04;
  if (targetDepth < 8.4) geometryFactor += 0.055;
  const idealX = clamp(targetX * geometryFactor, -1.18, 1.18);

  // Jogadores de leitura baixa executam uma versão incompleta da geometria e
  // continuam seguindo demais a bola. O erro é criado uma vez por golpe, para
  // não produzir jitter frame a frame.
  const naiveBallFollowX = clamp((gs?.ball?.pos?.x ?? targetX) * 0.31, -1.42, 1.42);
  const geometryTrust = clamp(0.30 + tacticalSkill * 0.67, 0.42, 0.96);
  const stableReadError = (Math.random() * 2 - 1) * (1 - tacticalSkill) * 0.34;
  const recoveryX = clamp(
    idealX * geometryTrust + naiveBallFollowX * (1 - geometryTrust) + stableReadError
      - (player?.pos?.x ?? 0) * identity.movement.centerRecoveryBias * 0.10,
    -1.48,
    1.48,
  );

  const defensive = intent === 'DEFEND' || intent === 'RESET';
  const attacking = intent === 'PRESSURE' || intent === 'REDIRECT' || intent === 'FINISH';
  const shortReplyThreat = targetDepth > 0 && targetDepth < 8.65;
  const deepPin = targetDepth >= 9.35;
  const observedAttacker = Object.values(gs?.players ?? {}).find(candidate => candidate && candidate !== player && candidate.id !== player.id);
  const dropRead = getOpponentRead(player, observedAttacker)?.dropAwareness ?? 0;
  const depthAdjustment = (defensive ? 0.42 : 0)
    + (shortReplyThreat ? 0.46 : 0)
    - (attacking && deepPin ? 0.18 : 0)
    + (1 - stamina) * 0.16
    - identity.movement.aggressiveRecoveryBias * 0.65
    - identity.positioning.courtPositionAggression * 0.35
    - dropRead * 0.18;
  const side = player?.side > 0 ? 1 : -1;
  const recoveryY = defaultTarget.y + side * depthAdjustment;
  const confidence = clamp(tacticalSkill * 0.68 + movementSkill * 0.20 + stamina * 0.12, 0, 1);
  const coverageWidth = clamp(4.30 - Math.abs(recoveryX) * 0.16 + depthAdjustment * 0.22, 3.85, 4.65);

  return {
    version: 'recovery-positioning-v1',
    key: shotKey(player, gs, shot),
    x: +recoveryX.toFixed(3),
    y: +recoveryY.toFixed(3),
    idealX: +idealX.toFixed(3),
    targetX: +targetX.toFixed(3),
    targetDepth: +targetDepth.toFixed(3),
    confidence: +confidence.toFixed(3),
    geometryTrust: +geometryTrust.toFixed(3),
    coverageWidth: +coverageWidth.toFixed(3),
    depthAdjustment: +depthAdjustment.toFixed(3),
    reason: defensive
      ? 'protect_against_attack_after_defense'
      : shortReplyThreat
        ? 'retreat_after_short_landing'
        : attacking && deepPin
          ? 'hold_aggressive_court_position'
          : direction === 'DTL' || direction === 'INSIDE_IN'
            ? 'close_line_recovery_geometry'
            : 'bisect_crosscourt_and_line',
  };
}

export function resolveRecoveryPosition(player, gs, defaultTarget) {
  if (!player?.ctx || !defaultTarget) return null;
  if (gs?.ball?.lastHitBy !== player.id) {
    player._recoveryPositioning = null;
    return null;
  }
  const shot = lastOwnShot(player, gs.ball);
  if (!shot) return null;
  const key = shotKey(player, gs, shot);
  let plan = player.ctx.recoveryPositioning;
  if (!plan || plan.version !== 'recovery-positioning-v1' || plan.key !== key) {
    plan = buildPlan(player, gs, defaultTarget, shot);
    player.ctx.recoveryPositioning = plan;
  }
  player._recoveryPositioning = plan;
  return plan;
}

export function resetRecoveryPositioning(player) {
  if (player?.ctx) player.ctx.recoveryPositioning = null;
  if (player) player._recoveryPositioning = null;
}
