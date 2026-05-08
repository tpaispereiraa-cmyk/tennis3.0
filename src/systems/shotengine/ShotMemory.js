import { clamp } from '../../core/math.js';
import { ShotDirection, ShotIntent } from './ShotTypes.js';

const MAX_SHOTS = 8;

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
    rallyPlan: 'NEUTRAL',
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

export function rememberShot({ player, opponent = null, decision, execution, quality, context, serve = false } = {}) {
  if (!player?.ctx || !decision) return null;
  const memory = getShotMemory(player);
  const shot = {
    rally: context?.score?.rally ?? 0,
    phase: context?.phase ?? null,
    family: decision.family,
    intent: decision.intent,
    direction: decision.direction,
    targetX: execution?.targetX ?? decision.target?.x ?? 0,
    targetY: execution?.targetY ?? decision.target?.y ?? 0,
    quality: quality?.quality ?? null,
    bodyState: quality?.bodyState ?? null,
    serve: !!serve,
  };

  memory.shots.push(shot);
  while (memory.shots.length > MAX_SHOTS) memory.shots.shift();

  memory.directionStreak = nextStreak(memory.directionStreak?.value, memory.directionStreak?.count, shot.direction);
  memory.familyStreak = nextStreak(memory.familyStreak?.value, memory.familyStreak?.count, shot.family);
  memory.lastIntent = shot.intent;
  memory.lastDirection = shot.direction;
  memory.lastFamily = shot.family;
  memory.lastTargetX = shot.targetX;
  memory.lastTargetY = shot.targetY;
  memory.sliceLoop = shot.family === 'SLICE' || shot.family === 'CHIP_RETURN'
    ? (memory.sliceLoop ?? 0) + 1
    : 0;
  memory.softLoop = shot.family === 'SLICE' || shot.family === 'LOB' || shot.family === 'CHIP_RETURN'
    ? (memory.softLoop ?? 0) + 1
    : 0;

  const aggressive = shot.intent === ShotIntent.PRESSURE || shot.intent === ShotIntent.FINISH || shot.intent === ShotIntent.APPROACH;
  const defensive = shot.intent === ShotIntent.DEFEND || shot.intent === ShotIntent.RESET;
  const rallyLongBonus = Math.min(0.24, (shot.rally ?? 0) * 0.006);
  const qualityBuild = clamp(((shot.quality ?? 0.5) - 0.42) * 0.28, 0, 0.12);
  memory.pressureBuilt = clamp(memory.pressureBuilt * 0.72 + (aggressive ? 0.28 : defensive ? -0.04 : 0.12) + rallyLongBonus + qualityBuild, 0, 1);
  memory.pressureFaced = clamp((opponent?.ctx?.rallyPressure ?? 0) * 0.55 + (1 - (shot.quality ?? 0.5)) * 0.22 + memory.pressureFaced * 0.23, 0, 1);

  if (memory.pressureBuilt > 0.56) memory.rallyPlan = 'CASH_IN';
  else if (memory.pressureFaced > 0.62) memory.rallyPlan = 'STABILIZE';
  else if ((memory.softLoop ?? 0) >= 3 || (memory.sliceLoop ?? 0) >= 2) memory.rallyPlan = 'CHANGE_PATTERN';
  else if ((memory.directionStreak?.count ?? 0) >= 3) memory.rallyPlan = 'CHANGE_PATTERN';
  else memory.rallyPlan = 'NEUTRAL';

  return memory;
}

export function resetShotMemory(player) {
  if (player?.ctx) player.ctx.shotMemory = emptyMemory();
}

export function memoryDirectionNudge(memory, fallbackDirection) {
  if (!memory) return fallbackDirection;
  if (memory.rallyPlan === 'STABILIZE') return ShotDirection.CENTER;
  if (memory.rallyPlan === 'CHANGE_PATTERN') {
    if (memory.lastDirection === ShotDirection.CROSS) return ShotDirection.DTL;
    if (memory.lastDirection === ShotDirection.DTL) return ShotDirection.CROSS;
    if (memory.lastDirection === ShotDirection.CENTER) return ShotDirection.CROSS;
  }
  if (memory.rallyPlan === 'CASH_IN' && memory.lastDirection === ShotDirection.CROSS) return ShotDirection.WIDE;
  return fallbackDirection;
}
