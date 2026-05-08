import { clamp } from '../../core/math.js';
import { getWingControle, getWingPotencia } from '../../domain/players/attributes.js';

export function getWingSideSign(handedness = 'right', wing = 'FH') {
  const rightHanded = handedness !== 'left';
  if (wing === 'FH') return rightHanded ? 1 : -1;
  return rightHanded ? -1 : 1;
}

export function deriveWingIdentity(playerOrAttrs) {
  const player = playerOrAttrs?.attrs ? playerOrAttrs : null;
  const attrs = player?.attrs ?? playerOrAttrs ?? {};
  const handedness = player?.handedness ?? 'right';

  const fhPower = getWingPotencia(attrs, false);
  const fhControl = getWingControle(attrs, false);
  const bhPower = getWingPotencia(attrs, true);
  const bhControl = getWingControle(attrs, true);
  const slice = attrs.slice ?? 60;
  const topspin = attrs.topspin ?? 60;

  const fhComposite = fhPower * 0.54 + fhControl * 0.46;
  const bhComposite = bhPower * 0.48 + bhControl * 0.52;
  const attackGap = fhComposite - bhComposite;
  const controlGap = fhControl - bhControl;
  const dominantWing = attackGap > 7 ? 'FH' : attackGap < -5 ? 'BH' : 'BALANCED';
  const stableWing = controlGap > 6 ? 'FH' : controlGap < -6 ? 'BH' : 'BALANCED';
  const vulnerableWing = controlGap < -9 ? 'FH' : controlGap > 9 ? 'BH' : null;

  const runAroundBase = dominantWing === 'FH'
    ? clamp((attackGap - 4) / 22, 0, 1)
    : dominantWing === 'BH'
      ? -clamp((-attackGap - 3) / 20, 0, 0.7)
      : 0;
  const runAroundBias = runAroundBase * getWingSideSign(handedness, 'BH');

  return {
    handedness,
    dominantWing,
    stableWing,
    vulnerableWing,
    fhComposite,
    bhComposite,
    attackGap,
    controlGap,
    runAroundBias,
    insideOutBias: dominantWing === 'FH' ? clamp((fhPower - bhPower + topspin * 0.25) / 55, 0, 1) : 0.18,
    backhandLineBias: dominantWing === 'BH' ? clamp((-attackGap + bhControl * 0.18) / 55, 0, 1) : 0.10,
    backhandSliceBias: vulnerableWing === 'BH'
      ? clamp((slice - bhPower * 0.35 + 18) / 60, 0.12, 1)
      : clamp((slice - bhPower * 0.25 + 10) / 70, 0.05, 0.55),
    heavyBackhandBias: stableWing === 'BH'
      ? clamp((bhControl + topspin * 0.30 - 40) / 55, 0, 1)
      : 0.08,
  };
}

export function applyWingIdentityBias(scores, wingIdentity, isBackhand, rally = 0) {
  if (!scores || !wingIdentity) return scores;
  const s = { ...scores };

  if (!isBackhand) {
    if (wingIdentity.dominantWing === 'FH') {
      if ((s.ACCEL ?? 0) > 0) s.ACCEL = Math.min(s.ACCEL + 0.08, 1.0);
      if ((s.DRIVE ?? 0) > 0) s.DRIVE = Math.min(s.DRIVE + 0.07, 1.0);
      if ((s.SHORT_ACCEL ?? 0) > 0) s.SHORT_ACCEL = Math.min(s.SHORT_ACCEL + 0.06, 1.0);
      if ((s.BANANA ?? 0) > 0) s.BANANA = Math.min(s.BANANA + 0.10 * wingIdentity.insideOutBias, 1.0);
    }
    if (wingIdentity.stableWing === 'FH' && (s.TOPSPIN ?? 0) > 0) {
      s.TOPSPIN = Math.min(s.TOPSPIN + 0.05, 1.0);
    }
  } else {
    if (wingIdentity.dominantWing === 'BH' || wingIdentity.stableWing === 'BH') {
      if ((s.TOPSPIN ?? 0) > 0) s.TOPSPIN = Math.min(s.TOPSPIN + 0.07 + wingIdentity.heavyBackhandBias * 0.05, 1.0);
      if ((s.DRIVE ?? 0) > 0) s.DRIVE = Math.min(s.DRIVE + 0.06, 1.0);
      if ((s.ACCEL ?? 0) > 0 && rally >= 2) s.ACCEL = Math.min(s.ACCEL + 0.05, 1.0);
    }
    if (wingIdentity.vulnerableWing === 'BH') {
      if ((s.SLICE ?? 0) > 0) s.SLICE = Math.min(s.SLICE + 0.08 + wingIdentity.backhandSliceBias * 0.08, 1.0);
      if ((s.TOPSPIN ?? 0) > 0) s.TOPSPIN = Math.max(0, s.TOPSPIN - 0.03);
      if ((s.ACCEL ?? 0) > 0) s.ACCEL = Math.max(0, s.ACCEL - 0.08);
      if ((s.BANANA ?? 0) > 0) s.BANANA = Math.max(0, s.BANANA - 0.12);
    }
  }

  return s;
}

export function getWingRecoverBias(player) {
  const wingIdentity = player?._wingIdentity ?? deriveWingIdentity(player);
  const phase = player?.ctx?.netPhase ?? 'BASE';
  const netPenalty = phase === 'BASE' ? 1 : 0.45;
  return clamp(wingIdentity.runAroundBias * netPenalty, -0.32, 0.32);
}
