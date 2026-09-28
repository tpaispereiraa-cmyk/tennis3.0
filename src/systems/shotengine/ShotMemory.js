import { clamp } from '../../core/math.js';
import { ShotDirection, ShotIntent, ShotFamily } from './ShotTypes.js';
import { TacticalPlan } from './TacticalPlanner.js';
import { advanceRallyMission } from './RallyDirector.js';
import { advanceRallyConstruction, resetRallyConstruction } from './RallyConstruction.js';
import { observeOpponentShot } from './OpponentObservation.js';

const MAX_SHOTS = 8;

const TOUCH_MEMORY_VERSION = 'touch-variation-v1';

function ensureMatchTouchMemory(player) {
  if (!player?.ctx) return null;
  player.ctx.matchCtx ??= {};
  if (player.ctx.matchCtx.touchVariation?.version !== TOUCH_MEMORY_VERSION) {
    player.ctx.matchCtx.touchVariation = {
      version: TOUCH_MEMORY_VERSION,
      cooldownPoints: 0,
      heat: 0,
      uses: 0,
      pointsSinceUse: 99,
      lastFamily: null,
    };
  }
  if (player.ctx.matchCtx.touchDefense?.version !== TOUCH_MEMORY_VERSION) {
    player.ctx.matchCtx.touchDefense = {
      version: TOUCH_MEMORY_VERSION,
      alert: 0,
      seen: 0,
      pointsSinceSeen: 99,
      lastFamily: null,
    };
  }
  return player.ctx.matchCtx;
}

export function getTouchVariationState(player) {
  const matchCtx = ensureMatchTouchMemory(player);
  return matchCtx?.touchVariation ?? null;
}

export function getTouchDefenseState(player) {
  const matchCtx = ensureMatchTouchMemory(player);
  return matchCtx?.touchDefense ?? null;
}

function rememberTouchVariation(player, opponent, family) {
  const own = getTouchVariationState(player);
  if (own) {
    own.cooldownPoints = family === ShotFamily.DROP ? 2 : 1;
    own.heat = clamp(own.heat * 0.58 + (family === ShotFamily.DROP ? 0.58 : 0.46), 0, 1);
    own.uses += 1;
    own.pointsSinceUse = 0;
    own.lastFamily = family;
  }

  // A memória fica no defensor: depois de ver a curta, ele passa alguns pontos
  // um pouco mais atento à frente. Isso reduz a atratividade de repetir a mesma
  // solução sem precisar mover o rival por telepatia ou proibir o golpe.
  const defense = getTouchDefenseState(opponent);
  if (defense) {
    defense.alert = clamp(defense.alert * 0.56 + (family === ShotFamily.DROP ? 0.62 : 0.48), 0, 1);
    defense.seen += 1;
    defense.pointsSinceSeen = 0;
    defense.lastFamily = family;
  }
}

function recordBehavior(player, shot, decision, context) {
  if (!player?.ctx) return;
  player.ctx.matchCtx ??= {};
  const fp = player.ctx.matchCtx.behaviorFingerprint ??= {
    shots: 0, families: {}, directions: {}, serveDirections: {}, blueprints: {}, patterns: {}, approaches: 0,
    runarounds: 0, returnAttacks: 0, serves: 0, dropConsidered: 0, contactTimeSum: 0, contactTimeSamples: 0, contactHeightSum: 0,
    baselineDepthSum: 0, positionSamples: 0, insideContactCount: 0, cleanContactCount: 0, dropGapSum: 0, dropGapMin: 9,
  };
  fp.shots++;
  fp.families[shot.family] = (fp.families[shot.family] ?? 0) + 1;
  fp.directions[shot.direction] = (fp.directions[shot.direction] ?? 0) + 1;
  if (shot.blueprintId) fp.blueprints[shot.blueprintId] = (fp.blueprints[shot.blueprintId] ?? 0) + 1;
  if (decision?.activePattern) fp.patterns[decision.activePattern] = (fp.patterns[decision.activePattern] ?? 0) + 1;
  if (shot.intent === 'APPROACH') fp.approaches++;
  if (shot.blueprintTags?.includes('runaround')) fp.runarounds++;
  const dropCandidate = decision?.candidateScores?.find(candidate => candidate.family === 'DROP');
  if (dropCandidate) {
    fp.dropConsidered++;
    const gap = (decision.candidateScores[0]?.score ?? 0) - dropCandidate.score;
    fp.dropGapSum += gap;
    fp.dropGapMin = Math.min(fp.dropGapMin, gap);
  }
  if (shot.serve) { fp.serves++; fp.serveDirections[shot.direction] = (fp.serveDirections[shot.direction] ?? 0) + 1; }
  if (decision?.returnPlanFamily && shot.intent === 'PRESSURE') fp.returnAttacks++;
  const time = context?.body?.contactPoint?.t ?? context?.body?.contactTime;
  if (Number.isFinite(time)) { fp.contactTimeSum += time; fp.contactTimeSamples++; }
  const height = context?.ballState?.pos?.z;
  if (Number.isFinite(height)) fp.contactHeightSum += height;
  const y = Math.abs(player.pos?.y ?? 0);
  if (y >= 8.4) { fp.baselineDepthSum += y - 11.885; fp.positionSamples++; }
  if (y <= 9.15 && !shot.serve) fp.insideContactCount++;
  if ((shot.quality ?? 0) >= 0.53 && (context?.body?.contactReadiness ?? 0) >= 0.46 && (context?.body?.arrivalMargin ?? -1) >= -0.07) fp.cleanContactCount++;
}

function advanceTouchMemoryPoint(player) {
  const own = getTouchVariationState(player);
  if (own) {
    own.cooldownPoints = Math.max(0, (own.cooldownPoints ?? 0) - 1);
    own.heat = clamp((own.heat ?? 0) * 0.72, 0, 1);
    own.pointsSinceUse = Math.min(99, (own.pointsSinceUse ?? 99) + 1);
  }
  const defense = getTouchDefenseState(player);
  if (defense) {
    defense.alert = clamp((defense.alert ?? 0) * 0.76, 0, 1);
    defense.pointsSinceSeen = Math.min(99, (defense.pointsSinceSeen ?? 99) + 1);
  }
}

function emptyMemory() {
  return {
    version: 'shot-memory-v1',
    shots: [],
    directionStreak: null,
    familyStreak: null,
    pressureBuilt: 0,
    pressureFaced: 0,
    lastIntent: null,
    lastDirection: null,
    lastFamily: null,
    lastTargetX: 0,
    lastTargetY: 0,
    sliceLoop: 0,
    softLoop: 0,
    resetStreak: null,  // { count } — quantos planos RESET/DEFEND seguidos
    rallyPlan: 'NEUTRAL',
    pointPlan: null,
  };
}

export function getShotMemory(player) {
  if (!player?.ctx) return emptyMemory();
  if (!player.ctx.shotMemory || player.ctx.shotMemory.version !== 'shot-memory-v1') {
    player.ctx.shotMemory = emptyMemory();
  }
  return player.ctx.shotMemory;
}

function nextStreak(previousValue, previousCount, value) {
  if (!value) return null;
  if (previousValue === value) return { value, count: (previousCount ?? 1) + 1 };
  return { value, count: 1 };
}

function directionAfterPattern(memory, shot) {
  if (memory.directionStreak?.value === ShotDirection.CROSS && (memory.directionStreak?.count ?? 0) >= 2) return ShotDirection.DTL;
  if (memory.directionStreak?.value === ShotDirection.DTL && (memory.directionStreak?.count ?? 0) >= 2) return ShotDirection.CROSS;
  if (memory.directionStreak?.value === ShotDirection.CENTER && (memory.directionStreak?.count ?? 0) >= 2) return ShotDirection.WIDE;
  if (shot?.direction === ShotDirection.BODY) return ShotDirection.CROSS;
  return null;
}

function updatePointPlan(memory, { player, opponent, shot, serve }) {
  const q = shot.quality ?? 0.5;
  const rally = shot.rally ?? 0;
  const oppX = Math.abs(opponent?.pos?.x ?? 0);
  const oppY = Math.abs(opponent?.pos?.y ?? 0);
  const buildStyle = player?.prefs?.buildStyle ?? 'BALANCED';
  const aggressiveStyle = buildStyle === 'DTL_HUNTER' || buildStyle === 'COUNTER_REDIRECT' || player?.prefs?.rallyCadence === 'EXPLOSIVE';
  const previous = memory.pointPlan;
  let next = null;

  // A profundidade deixa de ser só um alvo: para jogadores de variação ela
  // prepara uma intenção curta que pode amadurecer no próximo contato.
  const pushedOpponentDeep = shot.family !== ShotFamily.DROP
    && Math.abs(shot.targetY ?? 0) >= 9.35
    && q >= 0.58
    && (shot.intent === ShotIntent.BUILD || shot.intent === ShotIntent.PRESSURE || shot.intent === ShotIntent.REDIRECT);
  if (pushedOpponentDeep && (buildStyle === 'DROP_VARIATION' || buildStyle === 'VARIED') && rally >= 2) {
    next = {
      type: TacticalPlan.PUSH_DEEP_THEN_DROP,
      targetDirection: ShotDirection.CENTER,
      urgency: clamp(0.56 + (q - 0.58) * 0.42 + (buildStyle === 'DROP_VARIATION' ? 0.12 : 0), 0.48, 0.88),
      confidence: clamp(q * 0.76 + (memory.pressureBuilt ?? 0) * 0.24, 0, 1),
      reason: 'depth_setup',
    };
  } else if (serve && (shot.intent === ShotIntent.PRESSURE || shot.intent === ShotIntent.FINISH || q >= 0.62)) {
    next = {
      type: 'SERVE_PLUS_ONE',
      targetDirection: shot.direction === ShotDirection.WIDE ? ShotDirection.WIDE : ShotDirection.BODY,
      urgency: 0.72,
      confidence: q,
      reason: 'serve_setup',
    };
  } else if (oppX > 2.35 || oppY > 9.75 || memory.pressureBuilt > 0.54) {
    next = {
      type: 'ATTACK_SPACE',
      targetDirection: oppX > 2.35 ? ShotDirection.WIDE : ShotDirection.CROSS,
      urgency: clamp(0.48 + memory.pressureBuilt * 0.34 + (q - 0.55) * 0.20, 0.30, 0.92),
      confidence: clamp(q * 0.72 + memory.pressureBuilt * 0.28, 0, 1),
      reason: oppX > 2.35 ? 'opponent_wide' : 'opponent_deep',
    };
  } else {
    const patternDirection = directionAfterPattern(memory, shot);
    if (patternDirection) {
      next = {
        type: aggressiveStyle ? 'REDIRECT_PATTERN' : 'CHANGE_PATTERN',
        targetDirection: patternDirection,
        urgency: clamp(0.42 + (memory.directionStreak?.count ?? 1) * 0.10, 0.40, 0.84),
        confidence: clamp(0.48 + q * 0.30 + (rally >= 4 ? 0.12 : 0), 0, 1),
        reason: 'direction_streak',
      };
    }
  }

  if (!next && previous) {
    const agedUrgency = (previous.urgency ?? 0.4) * 0.62;
    if (agedUrgency > 0.24) next = { ...previous, urgency: +agedUrgency.toFixed(3), reason: `${previous.reason ?? 'carry'}:carry` };
  }

  memory.pointPlan = next ? Object.freeze(next) : null;
}

export function rememberShot({ player, opponent = null, decision, execution, quality, context, serve = false } = {}) {
  if (!player?.ctx || !decision) return null;
  const memory = getShotMemory(player);
  const shot = {
    rally: context?.score?.rally ?? 0,
    phase: context?.phase ?? null,
    family: decision.family,
    blueprintId: decision.blueprintId ?? null,
    blueprintLabel: decision.blueprintLabel ?? null,
    blueprintTags: decision.shotBlueprint?.tags ?? [],
    intent: decision.intent,
    direction: decision.direction,
    targetX: execution?.targetX ?? decision.target?.x ?? 0,
    targetY: execution?.targetY ?? decision.target?.y ?? 0,
    quality: quality?.quality ?? null,
    bodyState: quality?.bodyState ?? null,
    sliceProfile: decision.sliceProfile ?? execution?.sliceProfile ?? null,
    serve: !!serve,
  };

  memory.shots.push(shot);
  recordBehavior(player, shot, decision, context);
  if (!serve) observeOpponentShot(opponent, player, shot);
  while (memory.shots.length > MAX_SHOTS) memory.shots.shift();

  memory.directionStreak = nextStreak(memory.directionStreak?.value, memory.directionStreak?.count, shot.direction);
  memory.familyStreak = nextStreak(memory.familyStreak?.value, memory.familyStreak?.count, shot.family);
  memory.lastIntent = shot.intent;
  memory.lastDirection = shot.direction;
  memory.lastFamily = shot.family;
  memory.lastBlueprintId = shot.blueprintId;
  memory.lastTargetX = shot.targetX;
  memory.lastTargetY = shot.targetY;
  memory.sliceLoop = shot.family === 'SLICE' || shot.family === 'CHIP_RETURN'
    ? (memory.sliceLoop ?? 0) + 1
    : 0;
  memory.softLoop = shot.family === 'SLICE' || shot.family === 'LOB' || shot.family === 'CHIP_RETURN'
    ? (memory.softLoop ?? 0) + 1
    : 0;
  const touchVariation = shot.family === ShotFamily.DROP
    || (shot.family === ShotFamily.SLICE && shot.sliceProfile === 'SHORT_VARIATION')
    || ((shot.family === ShotFamily.TOPSPIN || shot.family === ShotFamily.FLAT_DRIVE)
      && Math.abs(shot.targetY ?? 0) < 5.85
      && Math.abs(shot.targetX ?? 0) > 1.90);
  if (touchVariation) {
    const variationType = shot.family === ShotFamily.DROP
      ? ShotFamily.DROP
      : shot.family === ShotFamily.SLICE
        ? 'SLICE_SHORT'
        : 'SHORT_ANGLE';
    rememberTouchVariation(player, opponent, variationType);
  }
  // resetStreak: rastreia planos defensivos consecutivos. Quando alcança 2-3,
  // a pipeline força uma quebra (vide opportunityGate.breakingLoop).
  const isDefensive = shot.intent === ShotIntent.DEFEND || shot.intent === ShotIntent.RESET;
  memory.resetStreak = isDefensive
    ? { count: (memory.resetStreak?.count ?? 0) + 1 }
    : null;

  const aggressive = shot.intent === ShotIntent.PRESSURE || shot.intent === ShotIntent.REDIRECT || shot.intent === ShotIntent.FINISH || shot.intent === ShotIntent.APPROACH;
  const defensive = shot.intent === ShotIntent.DEFEND || shot.intent === ShotIntent.RESET;
  const rallyLongBonus = Math.min(0.24, (shot.rally ?? 0) * 0.006);
  const qualityBuild = clamp(((shot.quality ?? 0.5) - 0.42) * 0.28, 0, 0.12);
  memory.pressureBuilt = clamp(memory.pressureBuilt * 0.72 + (aggressive ? 0.28 : defensive ? -0.04 : 0.12) + rallyLongBonus + qualityBuild, 0, 1);
  memory.pressureFaced = clamp((opponent?.ctx?.rallyPressure ?? 0) * 0.55 + (1 - (shot.quality ?? 0.5)) * 0.22 + memory.pressureFaced * 0.23, 0, 1);

  if (memory.pressureBuilt > 0.56) memory.rallyPlan = 'CASH_IN';
  else if (memory.pressureFaced > 0.62) memory.rallyPlan = 'STABILIZE';
  else if ((memory.softLoop ?? 0) >= 3 || (memory.sliceLoop ?? 0) >= 2) memory.rallyPlan = 'CHANGE_PATTERN';
  else if (memory.directionStreak?.value === ShotDirection.BODY && (memory.directionStreak?.count ?? 0) >= 2) memory.rallyPlan = 'CHANGE_PATTERN';
  else if ((memory.directionStreak?.count ?? 0) >= 3) memory.rallyPlan = 'CHANGE_PATTERN';
  else memory.rallyPlan = 'NEUTRAL';

  updatePointPlan(memory, { player, opponent, shot, serve });
  advanceRallyMission({ player, decision, quality, execution });
  advanceRallyConstruction({ player, decision, quality, execution });

  return memory;
}

export function resetShotMemory(player) {
  if (player?.ctx) {
    advanceTouchMemoryPoint(player);
    player.ctx.shotMemory = emptyMemory();
    resetRallyConstruction(player);
  }
}

export function memoryDirectionNudge(memory, fallbackDirection) {
  if (!memory) return fallbackDirection;
  if (memory.rallyPlan === 'STABILIZE') return ShotDirection.CENTER;
  if (memory.rallyPlan === 'CHANGE_PATTERN') {
    if (memory.lastDirection === ShotDirection.CROSS) return ShotDirection.DTL;
    if (memory.lastDirection === ShotDirection.DTL) return ShotDirection.CROSS;
    if (memory.lastDirection === ShotDirection.CENTER) return ShotDirection.CROSS;
    if (memory.lastDirection === ShotDirection.BODY) return ShotDirection.CROSS;
  }
  if (memory.rallyPlan === 'CASH_IN' && memory.lastDirection === ShotDirection.CROSS) return ShotDirection.WIDE;
  if (memory.pointPlan?.targetDirection) return memory.pointPlan.targetDirection;
  return fallbackDirection;
}
