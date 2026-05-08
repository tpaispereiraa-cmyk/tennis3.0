import { clamp } from '../../core/math.js';
import { BUILD_STYLE_TEMPERATURE, INTENT_TEMPERATURE, NET_TEMPERATURE, RISK_TEMPERATURE } from './shotPoolsConfig.js';

export function computeProfileTemperature(prefs, attrs = {}, ctx = {}, intent = 'BUILD') {
  const base = INTENT_TEMPERATURE[intent] ?? 0.24;
  const riskFactor = RISK_TEMPERATURE[prefs?.riskProfile] ?? 1.0;
  const netFactor = NET_TEMPERATURE[prefs?.netGame] ?? 1.0;
  const buildStyleFactor = BUILD_STYLE_TEMPERATURE[prefs?.buildStyle] ?? 1.0;
  const regularidade = attrs.regularidade ?? 60;
  const mentalidade = attrs.mentalidade ?? 60;
  const recuperacao = attrs.recuperacao ?? 60;
  const adaptacao = attrs.adaptacao ?? 60;
  const visao = attrs.visaoTatica ?? 60;
  const momentum = ctx?.momentum ?? 0.5;
  const rallyPressure = ctx?.rallyPressure ?? 0;
  const recoveryShield = 1.36 - (recuperacao / 100) * 0.56;
  const effectiveRallyPressure = clamp(
    rallyPressure * recoveryShield * (1.18 - (mentalidade / 100) * 0.28),
    0,
    1.2,
  );

  const regFactor = 1.0 + (1 - regularidade / 100) * 0.14;
  const mentalFactor = clamp(1.02 - (mentalidade / 100) * 0.08, 0.93, 1.04);
  const recoveryFactor = clamp(1.02 - (recuperacao / 100) * 0.10, 0.92, 1.03);
  const adaptationFactor = clamp(1.01 - (adaptacao / 100) * 0.08, 0.93, 1.02);
  const visionFactor = clamp(1.0 + ((visao - 60) / 100) * 0.06, 0.96, 1.06);
  const momentumFactor = 1.0 + Math.abs(momentum - 0.5) * 0.26;
  const pressureFactor = 1.0 + clamp(effectiveRallyPressure, 0, 1) * 0.09 * (1.0 - (mentalidade * 0.55 + recuperacao * 0.45) / 100);

  return clamp(
    base * riskFactor * netFactor * buildStyleFactor * regFactor * mentalFactor * recoveryFactor * adaptationFactor * visionFactor * momentumFactor * pressureFactor,
    0.08,
    0.72,
  );
}

export function normalizeAndPick(pool, temperature, randFn = Math.random) {
  const entries = Object.entries(pool ?? {}).filter(([, v]) => v > 0 && Number.isFinite(v));
  if (entries.length === 0) {
    return {
      shotType: 'TOPSPIN',
      normalizedPool: { TOPSPIN: 1 },
      probabilities: { TOPSPIN: 1 },
    };
  }
  if (entries.length === 1) {
    const [shotType] = entries[0];
    return {
      shotType,
      normalizedPool: { [shotType]: 1 },
      probabilities: { [shotType]: 1 },
    };
  }

  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  const normalizedEntries = entries.map(([k, v]) => [k, v / total]);
  const normalizedPool = Object.fromEntries(normalizedEntries);

  if (temperature < 0.06) {
    const [shotType] = normalizedEntries.sort((a, b) => b[1] - a[1])[0];
    return {
      shotType,
      normalizedPool,
      probabilities: normalizedPool,
    };
  }

  const expEntries = normalizedEntries.map(([k, v]) => [k, Math.exp(v / temperature)]);
  const expTotal = expEntries.reduce((sum, [, v]) => sum + v, 0);
  const probabilities = Object.fromEntries(expEntries.map(([k, v]) => [k, v / expTotal]));

  let roll = randFn();
  let shotType = expEntries[expEntries.length - 1][0];
  for (const [key, prob] of Object.entries(probabilities)) {
    roll -= prob;
    if (roll <= 0) {
      shotType = key;
      break;
    }
  }

  return { shotType, normalizedPool, probabilities };
}
