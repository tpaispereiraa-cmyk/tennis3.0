import { ShotFamily, ShotIntent, ShotPhase, RiskProfile } from './ShotTypes.js';
import { getFamiliesForPhase, getShotDefinition } from './ShotCatalog.js';
import { getCapabilityForShot } from './PlayerShotCapabilities.js';
import { chooseDirection, chooseTarget } from './ShotTargeting.js';
import { evaluateShotOpportunityEV } from './ShotOpportunityEV.js';

function chooseIntent(context, quality, ev) {
  const q = quality?.quality ?? 0.5;
  const prefs = context?.prefs ?? {};
  const pressure = context?.player?.ctx?.rallyPressure ?? 0;
  const memory = context?.memory ?? null;
  const ballShort = Math.abs(context?.ballState?.pos?.y ?? 0) < 8.0;

  if (context?.phase === ShotPhase.PASSING) return ShotIntent.PASS;
  if (q < 0.32 || pressure > 0.84) return ShotIntent.DEFEND;
  if (ev?.recommendedIntent === ShotIntent.DEFEND) return ShotIntent.DEFEND;
  if (ev?.recommendedIntent === ShotIntent.RESET) return ShotIntent.RESET;
  if (ev?.recommendedIntent === ShotIntent.FINISH) return ShotIntent.FINISH;
  if (ev?.recommendedIntent === ShotIntent.PRESSURE) return ShotIntent.PRESSURE;
  if (memory?.rallyPlan === 'STABILIZE' && q < 0.62) return ShotIntent.RESET;
  if (ballShort && q > 0.62 && (prefs.netGame === 'PROACTIVE' || prefs.netGame === 'HUNTER')) return ShotIntent.APPROACH;
  if (prefs.buildStyle === 'CENTRE_CONTROL') return ShotIntent.CONTROL;
  return ev?.recommendedIntent ?? ShotIntent.BUILD;
}

function scoreFamily(family, context, quality, intent, ev) {
  const def = getShotDefinition(family);
  const caps = context?.capabilities ?? {};
  const q = quality?.quality ?? 0.5;
  const prefs = context?.prefs ?? {};
  const style = ev?.style;
  const bodyState = quality?.bodyState ?? '';
  const rally = context?.score?.rally ?? 0;
  const ready = context?.body?.contactReadiness ?? 0;
  const arrivalMargin = context?.body?.arrivalMargin ?? 0;
  const cleanPrepared = (ready >= 0.58 || bodyState === 'PLANTED' || bodyState === 'ON_RISE')
    && arrivalMargin >= -0.03
    && q >= 0.45
    && bodyState !== 'LOW_PICKUP';
  const prepared = cleanPrepared || (ready >= 0.62 && arrivalMargin >= -0.06);
  const playable = q > 0.42 && prepared;
  const buildAttack = q >= 0.50 && cleanPrepared;
  let score = getCapabilityForShot(caps, def) * 0.58 + q * 0.30 + (1 - (def?.baseRisk ?? 0.4)) * 0.12;
  const safetyEV = ev?.safetyEV ?? 0.5;
  const pressureEV = ev?.pressureEV ?? 0.5;
  const finishEV = ev?.finishEV ?? 0.5;
  const defenseEV = ev?.defenseEV ?? 0.3;
  const variationEV = ev?.variationEV ?? 0.2;
  const styleEV = ev?.styleEV ?? 0.1;

  if (!def?.intents?.includes(intent)) score -= 0.20;
  if (intent === ShotIntent.BUILD || intent === ShotIntent.CONTROL) {
    if (family === ShotFamily.TOPSPIN) score += playable ? 0.28 : 0.22;
    if (family === ShotFamily.FLAT_DRIVE && buildAttack) score += q > 0.60 ? 0.16 : 0.07;
    if (family === ShotFamily.SLICE) score -= prefs.buildStyle === 'SLICE_CONTROL' ? 0.02 : playable ? 0.40 : 0.26;
    if (family === ShotFamily.LOB) score -= 0.42;
  }
  if (intent === ShotIntent.DEFEND || intent === ShotIntent.RESET) {
    if (family === ShotFamily.TOPSPIN) score += playable ? 0.18 : 0.08;
    if (family === ShotFamily.LOB) score += context?.opponent?.atNet || context?.opponent?.ctx?.courtMode === 'NET' ? 0.20 : -0.20;
    if (family === ShotFamily.SLICE) score += prefs.buildStyle === 'SLICE_CONTROL' || bodyState === 'LOW_PICKUP' ? 0.06 : playable ? -0.18 : -0.06;
    if (family === ShotFamily.FLAT_DRIVE || family === ShotFamily.DROP) score -= 0.18;
  }
  if (intent === ShotIntent.FINISH || intent === ShotIntent.PRESSURE) {
    if (family === ShotFamily.FLAT_DRIVE && q > 0.46 && prepared) score += (intent === ShotIntent.FINISH ? 0.34 : 0.24) + (style?.flatBias ?? 0);
    if (family === ShotFamily.TOPSPIN && caps.topspin > 0.60) score += (intent === ShotIntent.FINISH ? 0.24 : 0.20) + (style?.topspinBias ?? 0);
    if (family === ShotFamily.DROP && (context?.prefs?.buildStyle === 'DROP_VARIATION' || (Math.abs(context?.opponent?.pos?.y ?? 0) > 10.0 && q > 0.62))) score += 0.22 + (style?.dropBias ?? 0);
  }
  if (family === ShotFamily.FLAT_DRIVE) score += finishEV * 0.22 + pressureEV * 0.12 + styleEV * 0.10 - (1 - safetyEV) * 0.16;
  if (family === ShotFamily.TOPSPIN) score += pressureEV * 0.16 + safetyEV * 0.10 + (intent === ShotIntent.BUILD ? variationEV * 0.08 : 0);
  if (family === ShotFamily.DROP) score += finishEV * (style?.dropBias ? 0.24 : 0.10) + variationEV * 0.12 - (1 - safetyEV) * 0.18;
  if (family === ShotFamily.SLICE) score += defenseEV * 0.14 - pressureEV * 0.10 - ((ev?.flags?.cleanContact && prefs.buildStyle !== 'SLICE_CONTROL') ? 0.12 : 0);
  if (family === ShotFamily.LOB) score += defenseEV * 0.18 - pressureEV * 0.14 - (ev?.flags?.rivalExposed ? 0.10 : 0);
  if (context?.memory?.rallyPlan === 'STABILIZE') {
    if (family === ShotFamily.TOPSPIN) score += 0.08;
    if (family === ShotFamily.LOB) score -= context?.opponent?.atNet ? 0 : 0.22;
    if (family === ShotFamily.SLICE) score += 0.02;
    if (family === ShotFamily.FLAT_DRIVE || family === ShotFamily.DROP) score -= 0.10;
  }
  if (context?.memory?.rallyPlan === 'CASH_IN' && q > 0.66) {
    if (family === ShotFamily.FLAT_DRIVE || family === ShotFamily.TOPSPIN || family === ShotFamily.DROP) score += 0.08;
  }
  if ((context?.memory?.familyStreak?.count ?? 0) >= 3 && context.memory.familyStreak.value === family) score -= 0.18;
  if ((context?.memory?.sliceLoop ?? 0) >= 2 && family === ShotFamily.SLICE) score -= playable ? 0.54 : 0.34;
  if ((context?.memory?.softLoop ?? 0) >= 3 && (family === ShotFamily.SLICE || family === ShotFamily.LOB)) score -= playable ? 0.36 : 0.24;
  if (family === ShotFamily.LOB && !(context?.opponent?.atNet || context?.opponent?.ctx?.courtMode === 'NET')) score -= 0.24;
  if (family === ShotFamily.LOB && rally < 6 && intent !== ShotIntent.DEFEND) score -= 0.18;
  if (rally >= 6 && family === ShotFamily.TOPSPIN) score += 0.08;
  if (rally >= 10 && (family === ShotFamily.FLAT_DRIVE || family === ShotFamily.TOPSPIN)) score += 0.10;
  if (rally >= 10 && family === ShotFamily.SLICE && prefs.buildStyle !== 'SLICE_CONTROL') score -= 0.14;
  if (rally >= 18 && family === ShotFamily.FLAT_DRIVE && q > 0.58) score += 0.16;
  if (family === ShotFamily.DROP && Math.abs(context?.opponent?.pos?.y ?? 0) > 10.4 && q > 0.64 && intent !== ShotIntent.DEFEND) score += 0.18;
  if (context?.body?.atNet && family === ShotFamily.VOLLEY) score += 0.22;
  if ((context?.ballState?.z ?? 0) > 1.75 && family === ShotFamily.SMASH) score += 0.30;
  if ((context?.ballState?.z ?? 0) < 0.55 && family === ShotFamily.FLAT_DRIVE) score -= 0.22;
  return score;
}

export function decideShot(context, quality) {
  const opportunityEV = evaluateShotOpportunityEV(context, quality);
  const intent = chooseIntent(context, quality, opportunityEV);
  const style = opportunityEV.style;
  const families = getFamiliesForPhase(context?.phase ?? ShotPhase.RALLY_NEUTRAL);
  let best = null;
  for (const family of families) {
    const score = scoreFamily(family, context, quality, intent, opportunityEV);
    if (!best || score > best.score) best = { family, score };
  }

  const direction = chooseDirection(context, quality, intent);
  const ready = context?.body?.contactReadiness ?? 0;
  const arrivalMargin = context?.body?.arrivalMargin ?? 0;
  const bodyState = quality?.bodyState ?? '';
  const q = quality?.quality ?? 0.5;
  const oppX = Math.abs(context?.opponent?.pos?.x ?? 0);
  const oppY = Math.abs(context?.opponent?.pos?.y ?? 0);
  const buildMode = intent === ShotIntent.BUILD
    ? (q >= 0.50 && ready >= 0.58 && arrivalMargin >= -0.03 && bodyState !== 'LOW_PICKUP' && (oppX > 0.75 || oppY > 9.15 || (context?.score?.rally ?? 0) >= 5)
      ? 'attack'
      : 'safe')
    : null;
  const target = chooseTarget(context, quality, { intent, direction, buildMode });
  const risk = q > 0.72 && (intent === ShotIntent.PRESSURE || intent === ShotIntent.FINISH)
    ? RiskProfile.AGGRESSIVE
    : q < 0.48
      ? RiskProfile.SAFE
      : RiskProfile.NORMAL;

  return Object.freeze({
    family: best?.family ?? ShotFamily.TOPSPIN,
    type: best?.family ?? ShotFamily.TOPSPIN,
    intent,
    direction,
    target,
    buildMode,
    styleSubType: style.archetype,
    finishProfile: style,
    opportunityEV,
    risk,
    score: best?.score ?? 0,
    reason: `intent=${intent}${buildMode ? `; build=${buildMode}` : ''}; ev=${opportunityEV.recommendedIntent}; ${opportunityEV.reasons.join('+')}; familyScore=${(best?.score ?? 0).toFixed(2)}`,
  });
}
