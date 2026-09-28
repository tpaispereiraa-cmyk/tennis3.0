import { clamp } from '../../core/math.js';

const WING = Object.freeze({
  FOREHAND: 'FOREHAND',
  BACKHAND: 'BACKHAND',
  BODY: 'BODY',
});

function isLeftHanded(player) {
  const hand = String(player?.handedness ?? player?.dominantHand ?? player?.maoDominante ?? 'right').toLowerCase();
  return hand === 'left' || hand === 'l' || hand === 'canhoto' || hand === 'esquerda';
}

export function normalizePreparedWing(wing) {
  if (wing === 'FOREHAND_RUNAROUND') return WING.FOREHAND;
  if (wing === WING.FOREHAND || wing === WING.BACKHAND || wing === WING.BODY) return wing;
  return null;
}

function stanceFitFor(stance, wing, runAround) {
  if (!stance) return 0.72;
  if (stance === 'EMERGENCY') return 0.34;
  if (runAround) {
    if (stance === 'SEMI_OPEN') return 1;
    if (stance === 'OPEN') return 0.90;
    if (stance === 'NEUTRAL') return 0.78;
    return 0.64;
  }
  if (wing === WING.FOREHAND) {
    if (stance === 'SEMI_OPEN') return 1;
    if (stance === 'OPEN') return 0.94;
    if (stance === 'NEUTRAL') return 0.88;
    return 0.74;
  }
  if (wing === WING.BACKHAND) {
    if (stance === 'CLOSED') return 1;
    if (stance === 'NEUTRAL') return 0.96;
    if (stance === 'SEMI_OPEN') return 0.84;
    return 0.76;
  }
  return stance === 'NEUTRAL' ? 0.72 : 0.58;
}

function transferFor(stance, readiness, preparation, alignment, switchSeverity) {
  const stanceTransfer = {
    CLOSED: 0.96,
    NEUTRAL: 0.94,
    SEMI_OPEN: 0.91,
    OPEN: 0.86,
    EMERGENCY: 0.40,
  }[stance] ?? 0.76;
  return clamp(
    stanceTransfer * 0.30
      + readiness * 0.25
      + preparation * 0.23
      + alignment * 0.22
      - switchSeverity * 0.24,
    0,
    1,
  );
}

/**
 * Fecha a cadeia entre o golpe que os pés prepararam e o golpe fisicamente
 * possível no contato. O resultado é uma única leitura mecânica consumida por
 * contexto, execução, erro, stamina e telemetria.
 */
export function evaluateStrokePreparation({
  player,
  ball,
  plan = null,
  naturalWing = WING.BODY,
  readiness = 0,
  arrivalMargin = 0,
  spacingQuality = 0.5,
} = {}) {
  const normalizedNatural = normalizePreparedWing(naturalWing) ?? WING.BODY;
  if (!plan?.wing) {
    return Object.freeze({
      version: 'stroke-preparation-v1',
      active: false,
      intendedWing: normalizedNatural,
      naturalWing: normalizedNatural,
      actualWing: normalizedNatural,
      stance: null,
      alignment: 0.72,
      spacing: clamp(spacingQuality, 0, 1),
      stanceFit: 0.72,
      commitment: 0,
      switchSeverity: 0,
      lateSwitch: false,
      jammed: normalizedNatural === WING.BODY,
      preparation: clamp(readiness, 0, 1),
      rotationReadiness: clamp(readiness, 0, 1),
      weightTransfer: 0.72,
      mechanicalIntegrity: 0.72,
      directionFreedom: 0.72,
      powerTransfer: 0.92,
      recoveryExposure: 0,
      runAround: false,
      mode: normalizedNatural === WING.BODY ? 'JAMMED' : 'UNPLANNED',
      reason: 'no_footwork_plan',
    });
  }

  const intendedWing = normalizePreparedWing(plan.wing) ?? normalizedNatural;
  const runAround = !!plan.runAround;
  const px = player?.pos?.x ?? 0;
  const bx = ball?.pos?.x ?? px;
  const lateralDelta = bx - px;
  const lateralDistance = Math.abs(lateralDelta);
  const plannedRadius = Number.isFinite(plan.idealContactRadius)
    ? plan.idealContactRadius
    : Number.isFinite(player?.reach)
      ? player.reach * 0.86
      : 0.74;
  const idealRadius = Math.max(0.35, plannedRadius);
  const handSign = isLeftHanded(player) ? -1 : 1;
  const desiredSideSign = intendedWing === WING.FOREHAND ? handSign : intendedWing === WING.BACKHAND ? -handSign : 0;
  const signedSideDistance = desiredSideSign ? lateralDelta * desiredSideSign : lateralDistance;
  const sideAlignment = desiredSideSign
    ? clamp((signedSideDistance + 0.14) / Math.max(idealRadius * 0.76, 0.28), 0, 1)
    : clamp(1 - lateralDistance / Math.max(idealRadius, 0.35), 0, 1);
  const spacing = clamp(
    Number.isFinite(spacingQuality)
      ? spacingQuality
      : 1 - Math.abs(lateralDistance - idealRadius) / Math.max(idealRadius * 0.72, 0.30),
    0,
    1,
  );
  const jammed = normalizedNatural === WING.BODY || lateralDistance < 0.18;
  const alignment = clamp(sideAlignment * 0.64 + spacing * 0.36 - (jammed ? 0.22 : 0), 0, 1);
  const plannedPreparation = clamp(plan.preparationQuality ?? readiness, 0, 1);
  const commitment = clamp(
    (plan.bodyCommitment ?? 0.35) * 0.58
      + readiness * 0.27
      + plannedPreparation * 0.15,
    0,
    1,
  );
  const wingConflict = intendedWing !== normalizedNatural;
  const crossedBody = desiredSideSign !== 0 && signedSideDistance < -0.08;
  const switchSeverity = wingConflict
    ? clamp(
        0.24
          + commitment * 0.46
          + (crossedBody ? 0.22 : 0)
          + (jammed ? 0.12 : 0)
          + Math.max(0, -arrivalMargin - 0.02) * 0.65,
        0,
        1,
      )
    : jammed
      ? clamp(0.22 + commitment * 0.18, 0, 0.52)
      : 0;
  const actualWing = wingConflict ? normalizedNatural : intendedWing;
  const stanceFit = stanceFitFor(plan.stance, actualWing, runAround);
  const weightTransfer = transferFor(plan.stance, readiness, plannedPreparation, alignment, switchSeverity);
  const rotationReadiness = clamp(
    plannedPreparation * 0.34
      + readiness * 0.25
      + alignment * 0.24
      + stanceFit * 0.17
      - switchSeverity * 0.34,
    0,
    1,
  );
  const arrivalScore = clamp(0.62 + arrivalMargin * 1.35, 0, 1);
  const mechanicalIntegrity = clamp(
    alignment * 0.25
      + spacing * 0.17
      + stanceFit * 0.14
      + weightTransfer * 0.16
      + rotationReadiness * 0.18
      + arrivalScore * 0.10
      - switchSeverity * 0.18,
    0,
    1,
  );
  const directionFreedom = clamp(
    mechanicalIntegrity * 0.68
      + stanceFit * 0.18
      + rotationReadiness * 0.14
      - switchSeverity * 0.22,
    0,
    1,
  );
  const powerTransfer = clamp(
    0.58
      + weightTransfer * 0.25
      + rotationReadiness * 0.20
      + alignment * 0.09
      - switchSeverity * 0.24
      - (jammed ? 0.08 : 0),
    0.42,
    1.08,
  );
  const recoveryExposure = clamp(
    (runAround ? 0.36 : 0)
      + switchSeverity * 0.24
      + (plan.stance === 'CLOSED' ? 0.08 : 0)
      + Math.max(0, 0.52 - spacing) * 0.18,
    0,
    1,
  );
  const lateSwitch = wingConflict && switchSeverity >= 0.48;
  const mode = jammed && switchSeverity >= 0.36
    ? 'JAMMED'
    : switchSeverity >= 0.70 || mechanicalIntegrity < 0.32
      ? 'SURVIVAL'
      : wingConflict
        ? 'ADAPTED'
        : mechanicalIntegrity >= 0.66
          ? 'PREPARED'
          : 'COMPROMISED';

  return Object.freeze({
    version: 'stroke-preparation-v1',
    active: true,
    intendedWing,
    naturalWing: normalizedNatural,
    actualWing,
    plannedWing: plan.wing,
    stance: plan.stance ?? null,
    alignment: +alignment.toFixed(3),
    spacing: +spacing.toFixed(3),
    stanceFit: +stanceFit.toFixed(3),
    commitment: +commitment.toFixed(3),
    switchSeverity: +switchSeverity.toFixed(3),
    lateSwitch,
    jammed,
    preparation: +plannedPreparation.toFixed(3),
    rotationReadiness: +rotationReadiness.toFixed(3),
    weightTransfer: +weightTransfer.toFixed(3),
    mechanicalIntegrity: +mechanicalIntegrity.toFixed(3),
    directionFreedom: +directionFreedom.toFixed(3),
    powerTransfer: +powerTransfer.toFixed(3),
    recoveryExposure: +recoveryExposure.toFixed(3),
    runAround,
    mode,
    reason: lateSwitch
      ? 'prepared_wing_lost_late'
      : wingConflict
        ? 'prepared_wing_adapted'
        : jammed
          ? 'ball_jammed_body'
          : runAround
            ? 'runaround_forehand_committed'
            : 'prepared_wing_preserved',
  });
}
