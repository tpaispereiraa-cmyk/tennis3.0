import { shotTuningSummary } from './ShotTuning.js';
import { qualityBand } from './ShotQuality.js';

export function buildShotEngineSnapshot({ context, quality, decision, execution } = {}) {
  const caps = context?.capabilities ?? {};
  const memory = context?.memory ?? {};
  return Object.freeze({
    version: 'shot-diagnostics-v1',
    tuning: shotTuningSummary(),
    phase: context?.phase ?? null,
    family: decision?.family ?? null,
    intent: decision?.intent ?? null,
    direction: decision?.direction ?? null,
    buildMode: decision?.buildMode ?? null,
    styleSubType: decision?.styleSubType ?? decision?.finishProfile?.archetype ?? null,
    opportunityEV: decision?.opportunityEV ?? null,
    quality: quality
      ? {
          value: quality.quality,
          band: qualityBand(quality.quality),
          bodyState: quality.bodyState,
          canContact: quality.canContact,
          scores: quality.scores,
          penalties: quality.penalties,
        }
      : null,
    attributes: {
      wingPower: caps.wingPower ?? null,
      wingControl: caps.wingControl ?? null,
      topspin: caps.topspin ?? null,
      slice: caps.slice ?? null,
      servePower: caps.servePower ?? null,
      servePrecision: caps.servePrecision ?? null,
      return: caps.return ?? null,
      riskTolerance: caps.riskTolerance ?? null,
      errorResistance: caps.errorResistance ?? null,
    },
    memory: {
      rallyPlan: memory.rallyPlan ?? null,
      directionStreak: memory.directionStreak ?? null,
      familyStreak: memory.familyStreak ?? null,
      pressureBuilt: memory.pressureBuilt ?? null,
      pressureFaced: memory.pressureFaced ?? null,
      sliceLoop: memory.sliceLoop ?? null,
      softLoop: memory.softLoop ?? null,
    },
    execution: execution
      ? {
          targetX: execution.targetX,
          targetY: execution.targetY,
          power: execution.power,
          netClearance: execution.netClearance,
          spinType: execution.spinType,
          spinX: execution.actualSpinX,
          spinZ: execution.actualSpinZ,
          errorRisk: execution.errorRisk,
          dispersion: execution.dispersion,
          missChance: execution.missChance,
          forcedErrorKind: execution.forcedErrorKind,
          identityTags: execution.identityTags ?? [],
        }
      : null,
  });
}
