import { getShotDefinition } from './ShotCatalog.js';
import { qualityBand } from './ShotQuality.js';

function pct(value) {
  return `${Math.round((value ?? 0) * 100)}%`;
}

export function describeShotContext(context, quality = null) {
  const parts = [];
  parts.push(`fase ${context?.phase ?? 'UNKNOWN'}`);
  parts.push(`asa ${context?.wing ?? 'UNKNOWN'}`);
  if (quality) parts.push(`contato ${quality.bodyState}/${qualityBand(quality.quality)} (${pct(quality.quality)})`);
  if (context?.body?.contactClass) parts.push(`sensor ${context.body.contactClass}`);
  return parts.join(' | ');
}

export function explainShotDecision(decision, context = null, quality = null) {
  if (!decision) return 'Nenhuma decisao de shot foi gerada.';
  const def = getShotDefinition(decision.family);
  const label = def?.label ?? decision.family;
  const intent = decision.intent ?? 'sem intent';
  const direction = decision.direction ?? 'sem direcao';
  const target = decision.target
    ? `${decision.target.depth ?? 'MID'}-${decision.target.width ?? 'CENTER'}`
    : 'sem alvo';
  const q = quality ? `Q ${qualityBand(quality.quality)} ${pct(quality.quality)}` : 'Q n/a';
  const reason = decision.reason ? ` Motivo: ${decision.reason}` : '';
  const ctx = context ? ` Contexto: ${describeShotContext(context, quality)}.` : '';
  return `${label} | ${intent} | ${direction} | ${target} | ${q}.${reason}${ctx}`;
}

export function buildShotDebugPayload({ context, quality, decision = null, notes = [] } = {}) {
  return Object.freeze({
    version: 'shot-debug-v1',
    summary: decision
      ? explainShotDecision(decision, context, quality)
      : describeShotContext(context, quality),
    context: Object.freeze({
      phase: context?.phase ?? null,
      wing: context?.wing ?? null,
      prefs: context?.prefs ?? {},
      memory: context?.memory
        ? {
            rallyPlan: context.memory.rallyPlan,
            directionStreak: context.memory.directionStreak,
            familyStreak: context.memory.familyStreak,
            pressureBuilt: context.memory.pressureBuilt,
            pressureFaced: context.memory.pressureFaced,
            sliceLoop: context.memory.sliceLoop,
            softLoop: context.memory.softLoop,
          }
        : null,
      body: context?.body ?? {},
      ballState: context?.ballState ?? {},
    }),
    quality: quality ?? null,
    decision: decision ?? null,
    notes: Object.freeze([...notes]),
  });
}
