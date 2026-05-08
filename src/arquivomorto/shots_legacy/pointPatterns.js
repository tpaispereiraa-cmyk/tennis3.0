import { clamp } from '../../core/math.js';

function getExistingPlan(player, rally) {
  if (player?.ctx?._servePatternPlan?.active && rally <= (player.ctx._servePatternPlan.expiresRally ?? 1)) {
    return { ...player.ctx._servePatternPlan, source: 'serve_plus_one' };
  }
  if (player?.ctx?._returnRecoveryPlan?.active && rally <= (player.ctx._returnRecoveryPlan.expiresRally ?? 2)) {
    return { ...player.ctx._returnRecoveryPlan, source: 'return_recovery' };
  }
  if (player?.ctx?._constructionPatternPlan?.active && rally <= (player.ctx._constructionPatternPlan.expiresRally ?? 2)) {
    return { ...player.ctx._constructionPatternPlan, source: 'construction' };
  }
  return null;
}

function normalizePattern(plan) {
  if (!plan?.active) return null;
  const tag = plan.tag ?? null;

  const base = {
    active: true,
    source: plan.source ?? 'construction',
    name: 'Pattern',
    description: 'Build the point with purpose',
    motive: plan.motive ?? 'BUILD_SPACE',
    preferredDir: plan.preferredDir ?? 'OPEN',
    depthBias: clamp(plan.depthBias ?? 0.74, 0.16, 0.90),
    shotBias: plan.shotBias ?? null,
    intensityBonus: clamp(plan.intensityBonus ?? 0, -0.10, 0.18),
    planStrength: clamp(plan.planStrength ?? 0.50, 0.20, 0.92),
    expiresRally: plan.expiresRally ?? 2,
    scoreBias: {},
    targetLateralMult: 1.0,
    targetDepthDelta: 0,
  };

  switch (tag) {
    case 'OPEN_THEN_FINISH':
      return {
        ...base,
        name: 'OPEN_COURT_FINISH',
        description: 'Open the court and finish into space',
        scoreBias: { SHORT_ACCEL: 0.08, ACCEL: 0.10, DRIVE: 0.04 },
        targetLateralMult: 1.08,
        targetDepthDelta: 0.04,
      };
    case 'SLICE_LOCK_THEN_ACCEL':
      return {
        ...base,
        name: 'BACKHAND_LOCK_THEN_DTL',
        description: 'Lock the rally, then break it with pace',
        scoreBias: { SLICE: 0.08, DRIVE: 0.05, ACCEL: 0.08, TOPSPIN: 0.04 },
        targetLateralMult: 1.04,
        targetDepthDelta: 0.03,
      };
    case 'DRAG_FORWARD_THEN_PASS':
      return {
        ...base,
        name: 'DROP_THEN_LOB',
        description: 'Drag forward and punish the recovery',
        scoreBias: { DROP: 0.12, LOB: 0.10, SHORT_ACCEL: 0.06, ACCEL: 0.04 },
        targetLateralMult: 1.06,
        targetDepthDelta: -0.02,
      };
    case 'HEAVY_CROSS_THEN_DTL':
      return {
        ...base,
        name: 'HEAVY_TO_BACKHAND',
        description: 'Push back with spin and change behind it',
        scoreBias: { TOPSPIN: 0.10, DRIVE: 0.06, ACCEL: 0.06 },
        targetLateralMult: 1.05,
        targetDepthDelta: 0.05,
      };
    case 'COUNTER_REDIRECT':
      return {
        ...base,
        name: 'ABSORB_REDIRECT',
        description: 'Absorb pressure and redirect into the gap',
        scoreBias: { DRIVE: 0.10, ACCEL: 0.08, TOPSPIN: 0.04, BANANA: 0.03 },
        targetLateralMult: 1.06,
        targetDepthDelta: 0.02,
      };
    default:
      break;
  }

  if (plan.source === 'serve_plus_one') {
    if (plan.preferredDir === 'BODY') {
      return {
        ...base,
        name: 'BODY_PRESSURE',
        description: 'Jam the returner and take over the next ball',
        scoreBias: { ACCEL: 0.08, TOPSPIN: 0.04, DRIVE: 0.05 },
        targetLateralMult: 0.78,
        targetDepthDelta: 0.03,
      };
    }
    return {
      ...base,
      name: 'SERVE_PLUS_ONE_OPEN',
      description: 'Use the serve opening and attack the open court',
      scoreBias: { ACCEL: 0.10, DRIVE: 0.08, SHORT_ACCEL: 0.06 },
      targetLateralMult: 1.08,
      targetDepthDelta: 0.04,
    };
  }

  if (plan.source === 'return_recovery') {
    const planStrength = clamp((plan.planStrength ?? 0.50) + ((plan.expiresRally ?? 2) >= 3 ? 0.04 : 0), 0.20, 0.92);
    const isPressingRecovery = plan.motive === 'PRESS_OPEN';
    return {
      ...base,
      name: isPressingRecovery ? 'RETURN_RECOVER_PRESS' : 'ABSORB_REDIRECT',
      description: isPressingRecovery ? 'Absorb the serve and turn the next ball outward' : 'Neutralize first, then recover shape',
      planStrength,
      scoreBias: isPressingRecovery
        ? { TOPSPIN: 0.06, DRIVE: 0.09, ACCEL: 0.04, SLICE: 0.02 }
        : { TOPSPIN: 0.08, SLICE: 0.08, DRIVE: 0.04, ACCEL: -0.04 },
      targetLateralMult: isPressingRecovery ? 1.02 : 0.92,
      targetDepthDelta: isPressingRecovery ? 0.04 : 0.03,
    };
  }

  return base;
}

export function resolvePointPatternPlan(player, opponent, rally) {
  const existing = getExistingPlan(player, rally);
  const normalized = normalizePattern(existing);
  if (normalized) return normalized;

  const patternHistory = player?.ctx?.patternHistory ?? [];
  const recent = patternHistory.slice(-3);
  if (recent.length < 2) return null;

  const last = recent[recent.length - 1];
  const prev = recent[recent.length - 2];
  const oppX = Math.abs(opponent?.pos?.x ?? 0);
  const oppDepth = Math.abs(opponent?.pos?.y ?? 0);

  if (last.spin === 'TOP' && prev.spin === 'TOP' && last.dir === prev.dir && oppDepth > 8.4) {
    return {
      active: true,
      source: 'live_memory',
      name: 'HEAVY_TO_BACKHAND',
      description: 'Keep the weight of shot until the lane opens',
      motive: 'BUILD_HEAVY',
      preferredDir: 'OPEN',
      depthBias: 0.82,
      shotBias: 'TOPSPIN',
      intensityBonus: 0.03,
      planStrength: 0.52,
      expiresRally: rally + 2,
      scoreBias: { TOPSPIN: 0.08, DRIVE: 0.04, ACCEL: 0.04 },
      targetLateralMult: 1.04,
      targetDepthDelta: 0.04,
    };
  }

  if ((last.type === 'SLICE' || prev.type === 'SLICE') && oppX > 1.3) {
    return {
      active: true,
      source: 'live_memory',
      name: 'BACKHAND_LOCK_THEN_DTL',
      description: 'Use shape and discomfort before changing direction',
      motive: 'RHYTHM_BREAK',
      preferredDir: 'BODY',
      depthBias: 0.72,
      shotBias: 'SLICE',
      intensityBonus: -0.01,
      planStrength: 0.46,
      expiresRally: rally + 1,
      scoreBias: { SLICE: 0.08, DRIVE: 0.05, ACCEL: 0.04 },
      targetLateralMult: 0.96,
      targetDepthDelta: 0.02,
    };
  }

  return null;
}

export function applyPointPatternBias(scores, pointPatternPlan) {
  if (!pointPatternPlan?.scoreBias) return scores;
  const next = { ...scores };
  for (const [shotType, delta] of Object.entries(pointPatternPlan.scoreBias)) {
    if (next[shotType] == null) continue;
    next[shotType] = Math.max(0, Math.min(1, next[shotType] + delta * (pointPatternPlan.planStrength ?? 0.5)));
  }
  if (pointPatternPlan.shotBias && next[pointPatternPlan.shotBias] != null) {
    next[pointPatternPlan.shotBias] = Math.min(1, next[pointPatternPlan.shotBias] + 0.10 * (pointPatternPlan.planStrength ?? 0.5));
  }
  return next;
}
