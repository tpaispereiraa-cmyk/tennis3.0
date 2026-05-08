import { clamp } from '../../core/math.js';

export function resolveShotStyle(context = {}) {
  const caps = context?.capabilities ?? {};
  const prefs = context?.prefs ?? {};
  const cadence = prefs.rallyCadence ?? 'BALANCED';
  const risk = prefs.riskProfile ?? 'CALCULATED';
  const build = prefs.buildStyle ?? 'VARIED';
  const serveProfile = prefs.serveProfile ?? 'BALANCED';

  const power = caps.wingPower ?? 0.6;
  const aggression = caps.aggression ?? 0.6;
  const vision = caps.tacticalVision ?? 0.6;
  const control = caps.wingControl ?? caps.control ?? 0.6;
  const spin = caps.topspin ?? 0.6;
  const touch = caps.touch ?? 0.55;

  const earlyCadence = cadence === 'EXPLOSIVE' || cadence === 'EARLY_ATTACK';
  const highRisk = risk === 'ALLOUT' || risk === 'GAMBLER';
  const lowRisk = risk === 'SAFE' || risk === 'SAFETY_FIRST';
  const dtlHunter = build === 'DTL_HUNTER';
  const heavySpin = build === 'HEAVY_SPIN_PRESSURE';
  const dropArtist = build === 'DROP_VARIATION';
  const redirector = build === 'COUNTER_REDIRECT';

  let archetype = 'BALANCED_BUILDER';
  if (earlyCadence && highRisk && power >= 0.64) archetype = 'REDLINE_FINISHER';
  else if ((earlyCadence || serveProfile === 'CANNON') && power >= 0.66) archetype = 'FIRST_STRIKE';
  else if (dtlHunter || redirector || (vision >= 0.68 && aggression >= 0.62)) archetype = 'PATTERN_FINISHER';
  else if (heavySpin && spin >= 0.66) archetype = 'HEAVY_PRESSER';
  else if (dropArtist && touch >= 0.62) archetype = 'TOUCH_DISRUPTOR';
  else if (lowRisk || cadence === 'PATIENT') archetype = 'GRINDER_CLOSER';

  const aggressionPush = clamp((aggression - 0.55) * 0.16 + (power - 0.60) * 0.12, -0.05, 0.07);
  const controlBrake = lowRisk ? 0.04 : 0;
  const earlyPush = earlyCadence ? 0.06 : cadence === 'MEASURED' ? 0.02 : 0;
  const riskPush = risk === 'ALLOUT' ? 0.07 : risk === 'GAMBLER' ? 0.04 : 0;

  const finishQ = clamp(0.61 - earlyPush - riskPush - aggressionPush + controlBrake, 0.48, 0.70);
  const pressureQ = clamp(0.53 - earlyPush * 0.65 - riskPush * 0.55 - aggressionPush, 0.43, 0.62);

  return Object.freeze({
    archetype,
    cadence,
    risk,
    build,
    earlyStrike: archetype === 'REDLINE_FINISHER' || archetype === 'FIRST_STRIKE',
    needsAdvantage: archetype === 'GRINDER_CLOSER',
    finishQ,
    pressureQ,
    finishRally: archetype === 'REDLINE_FINISHER' ? 2 : archetype === 'FIRST_STRIKE' ? 3 : archetype === 'GRINDER_CLOSER' ? 7 : 4,
    paceAdd: archetype === 'REDLINE_FINISHER' ? 3.2 : archetype === 'FIRST_STRIKE' ? 2.7 : archetype === 'HEAVY_PRESSER' ? 1.9 : 1.2,
    returnAttackBias: archetype === 'REDLINE_FINISHER' ? 0.08 : archetype === 'FIRST_STRIKE' ? 0.06 : archetype === 'GRINDER_CLOSER' ? -0.05 : 0,
    flatBias: archetype === 'REDLINE_FINISHER' || dtlHunter ? 0.16 : archetype === 'FIRST_STRIKE' ? 0.10 : 0,
    topspinBias: heavySpin || archetype === 'HEAVY_PRESSER' ? 0.16 : 0.04,
    dropBias: archetype === 'TOUCH_DISRUPTOR' ? 0.18 : 0,
    safetyBias: clamp((control - aggression) * 0.12 + (lowRisk ? 0.08 : 0), -0.04, 0.14),
  });
}
