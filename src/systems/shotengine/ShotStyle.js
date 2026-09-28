import { clamp } from '../../core/math.js';

export function resolveShotStyle(context = {}) {
  const caps = context?.capabilities ?? {};
  const prefs = context?.prefs ?? {};
  const cadence = prefs.rallyCadence ?? 'BALANCED';
  const risk = prefs.riskProfile ?? 'CALCULATED';
  const build = prefs.buildStyle ?? 'VARIED';
  const serveProfile = prefs.serveProfile ?? 'BALANCED';
  const styleId = context?.player?.styleId ?? 'ALL_COURT';

  const power = caps.wingPower ?? 0.6;
  const aggression = caps.aggression ?? 0.6;
  const vision = caps.tacticalVision ?? 0.6;
  const control = caps.wingControl ?? caps.control ?? 0.6;
  const spin = caps.topspin ?? 0.6;
  const touch = caps.touch ?? 0.55;
  const reading = caps.reading ?? 0.6;
  const allCourtConstructor = styleId === 'ALL_COURT'
    && control >= 0.78
    && vision >= 0.78
    && reading >= 0.78;

  const earlyCadence = cadence === 'EXPLOSIVE' || cadence === 'EARLY_ATTACK';
  const highRisk = risk === 'ALLOUT' || risk === 'GAMBLER';
  const lowRisk = risk === 'SAFE' || risk === 'SAFETY_FIRST';
  const dtlHunter = build === 'DTL_HUNTER';
  const heavySpin = build === 'HEAVY_SPIN_PRESSURE';
  const dropArtist = build === 'DROP_VARIATION';
  const shortAngleBuilder = build === 'CROSS_SHORT_ANGLE';
  const redirector = build === 'COUNTER_REDIRECT';

  let archetype = 'BALANCED_BUILDER';
  if (allCourtConstructor) archetype = 'ALL_COURT_CONSTRUCTOR';
  else if (earlyCadence && highRisk && power >= 0.64) archetype = 'REDLINE_FINISHER';
  else if ((earlyCadence || serveProfile === 'CANNON') && power >= 0.66) archetype = 'FIRST_STRIKE';
  else if (dtlHunter || redirector || (vision >= 0.68 && aggression >= 0.62)) archetype = 'PATTERN_FINISHER';
  else if (heavySpin && spin >= 0.66) archetype = 'HEAVY_PRESSER';
  else if (dropArtist && touch >= 0.62) archetype = 'TOUCH_DISRUPTOR';
  else if (lowRisk || cadence === 'PATIENT') archetype = 'GRINDER_CLOSER';

  const aggressionPush = clamp((aggression - 0.55) * 0.16 + (power - 0.60) * 0.12, -0.05, 0.07);

  // Nível 1 — Spreads amplificados para diferenciar estilos de forma perceptível.
  // Antes: earlyPush 0.06, riskPush 0.07, controlBrake 0.04 — spread total ~0.17.
  // Agora: spread total ~0.38 — EXPLOSIVE vs PATIENT são notavelmente diferentes.
  const patientBrake   = cadence === 'PATIENT' ? 0.08 : 0;
  const earlyPush      = earlyCadence ? 0.14 : cadence === 'EARLY_ATTACK' ? 0.14 : cadence === 'MEASURED' ? 0.04 : 0;
  const riskPush       = risk === 'ALLOUT' ? 0.13 : risk === 'GAMBLER' ? 0.08 : 0;
  const controlBrake   = risk === 'SAFETY_FIRST' ? 0.10 : risk === 'SAFE' ? 0.06 : 0;

  const finishQ = clamp(0.61 - earlyPush - riskPush - aggressionPush + controlBrake + patientBrake, 0.44, 0.76);
  const pressureQ = clamp(0.53 - earlyPush * 0.65 - riskPush * 0.55 - aggressionPush + patientBrake * 0.5, 0.40, 0.66);

  // Nível 2 — Flags de comportamento por buildStyle.
  const crossDominant   = build === 'CROSS_DOMINANT';   // força cruzado com mais peso
  const centreControl   = build === 'CENTRE_CONTROL';   // prefere centro e profundidade controlada
  const counterRedirect = build === 'COUNTER_REDIRECT'; // RESET é arma, não recuo

  return Object.freeze({
    archetype,
    cadence,
    risk,
    build,
    earlyStrike: archetype === 'REDLINE_FINISHER' || archetype === 'FIRST_STRIKE',
    needsAdvantage: archetype === 'GRINDER_CLOSER',
    isPatient: cadence === 'PATIENT' || cadence === 'MEASURED',
    isExplosive: earlyCadence,
    crossDominant,
    centreControl,
    counterRedirect,
    allCourtConstructor,
    // O construtor all-court não ganha força bruta: ganha reconhecimento de
    // padrão. Leitura, controle e visão convertem uma vantagem já construída
    // em pressão, em vez de deixá-la evaporar em mais uma bola neutra.
    constructionPressure: allCourtConstructor
      ? clamp(((control + vision + reading) / 3 - 0.72) * 0.42 + 0.035, 0.035, 0.14)
      : 0,
    constructionFinish: allCourtConstructor
      ? clamp(((control + vision) / 2 - 0.74) * 0.26, 0, 0.07)
      : 0,
    finishQ,
    pressureQ,
    // finishRally: golpes mínimos antes de tentar FINISH. Gate real no ShotOpportunityEV.
    finishRally: archetype === 'REDLINE_FINISHER' ? 1 : archetype === 'FIRST_STRIKE' ? 2 : allCourtConstructor ? 3 : cadence === 'PATIENT' ? 6 : cadence === 'MEASURED' ? 4 : archetype === 'GRINDER_CLOSER' ? 7 : 3,
    paceAdd: archetype === 'REDLINE_FINISHER' ? 3.2 : archetype === 'FIRST_STRIKE' ? 2.7 : archetype === 'HEAVY_PRESSER' ? 1.9 : 1.2,
    returnAttackBias: archetype === 'REDLINE_FINISHER' ? 0.08 : archetype === 'FIRST_STRIKE' ? 0.06 : archetype === 'GRINDER_CLOSER' ? -0.05 : 0,
    flatBias: archetype === 'REDLINE_FINISHER' || dtlHunter ? 0.16 : archetype === 'FIRST_STRIKE' ? 0.10 : 0,
    topspinBias: heavySpin || archetype === 'HEAVY_PRESSER' ? 0.16 : 0.04,
    dropBias: archetype === 'TOUCH_DISRUPTOR' ? 0.18 : 0,
    shortAngleBuilder,
    safetyBias: clamp((control - aggression) * 0.12 + (lowRisk ? 0.08 : 0), -0.04, 0.14),
  });
}
