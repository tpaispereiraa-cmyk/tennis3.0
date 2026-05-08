import { clamp } from './math.js';

// scoreBias  → valores POSITIVOS aditivos que bonificam shots favoráveis ao estado
// scorePenalty → fatores MULTIPLICATIVOS (0-1) que reduzem shots desfavoráveis SEM zerá-los
// Separar os dois mecanismos evita que pesos pequenos (ex: ACCEL 0.10 em BUILD SAFE)
// sejam zerados por penalidades absolutas em estados comuns como LATE ou ON_THE_RUN.
const EXECUTION_STATE_PROFILES = Object.freeze({
  PLANTED: Object.freeze({
    label: 'Planted',
    executionQualityMult: 1.05,
    intensityDelta: 0.08,
    targetLateralMult: 1.10,
    targetDepthDelta: 0.04,
    powerMult: 1.04,
    clearanceDelta: -0.02,
    spinMult: 0.98,
    scoreBias: { ACCEL: 0.26, DRIVE: 0.10, SHORT_ACCEL: 0.22, BANANA: 0.18, DROP: 0.04 },
    scorePenalty: {},
  }),
  ON_RISE: Object.freeze({
    label: 'On Rise',
    executionQualityMult: 0.98,
    intensityDelta: 0.10,
    targetLateralMult: 1.06,
    targetDepthDelta: 0.06,
    powerMult: 1.03,
    clearanceDelta: -0.03,
    spinMult: 0.90,
    scoreBias: { DRIVE: 0.12, ACCEL: 0.10, TOPSPIN: 0.04 },
    scorePenalty: { SLICE: 0.65, LOB: 0.50 },
  }),
  NEUTRAL: Object.freeze({
    label: 'Neutral',
    executionQualityMult: 1.0,
    intensityDelta: 0,
    targetLateralMult: 1.0,
    targetDepthDelta: 0,
    powerMult: 1.0,
    clearanceDelta: 0,
    spinMult: 1.0,
    scoreBias: {},
    scorePenalty: {},
  }),
  STRETCHED: Object.freeze({
    label: 'Stretched',
    executionQualityMult: 0.88,
    intensityDelta: -0.12,
    targetLateralMult: 0.84,
    targetDepthDelta: -0.08,
    powerMult: 0.90,
    clearanceDelta: 0.05,
    spinMult: 1.06,
    scoreBias: { SLICE: 0.12, TOPSPIN: 0.08, LOB: 0.08, HALF_VOLLEY: 0.06 },
    scorePenalty: { ACCEL: 0.25, SHORT_ACCEL: 0.20, BANANA: 0.15, DROP: 0.50, DRIVE: 0.60 },
  }),
  LATE: Object.freeze({
    label: 'Late',
    executionQualityMult: 0.84,
    intensityDelta: -0.16,
    targetLateralMult: 0.80,
    targetDepthDelta: -0.12,
    powerMult: 0.88,
    clearanceDelta: 0.08,
    spinMult: 1.02,
    scoreBias: { TOPSPIN: 0.12, SLICE: 0.10, LOB: 0.06, HALF_VOLLEY: 0.04 },
    scorePenalty: { ACCEL: 0.20, SHORT_ACCEL: 0.18, BANANA: 0.12, DROP: 0.50, DRIVE: 0.55 },
  }),
  ON_THE_RUN: Object.freeze({
    label: 'On Run',
    executionQualityMult: 0.86,
    intensityDelta: -0.10,
    targetLateralMult: 0.86,
    targetDepthDelta: -0.06,
    powerMult: 0.92,
    clearanceDelta: 0.04,
    spinMult: 1.00,
    scoreBias: { DRIVE: 0.04, TOPSPIN: 0.08, SLICE: 0.06 },
    scorePenalty: { ACCEL: 0.45, SHORT_ACCEL: 0.40, BANANA: 0.30, DROP: 0.60 },
  }),
  FALLING_BACK: Object.freeze({
    label: 'Falling Back',
    executionQualityMult: 0.82,
    intensityDelta: -0.18,
    targetLateralMult: 0.82,
    targetDepthDelta: -0.10,
    powerMult: 0.86,
    clearanceDelta: 0.09,
    spinMult: 1.10,
    scoreBias: { TOPSPIN: 0.14, LOB: 0.10, SLICE: 0.06 },
    scorePenalty: { ACCEL: 0.15, SHORT_ACCEL: 0.12, BANANA: 0.10, DROP: 0.65, DRIVE: 0.55 },
  }),
  JAMMED: Object.freeze({
    label: 'Jammed',
    executionQualityMult: 0.87,
    intensityDelta: -0.08,
    targetLateralMult: 0.72,
    targetDepthDelta: -0.04,
    powerMult: 0.90,
    clearanceDelta: 0.03,
    spinMult: 0.96,
    scoreBias: { TOPSPIN: 0.08, DRIVE: 0.04, SLICE: 0.06 },
    scorePenalty: { ACCEL: 0.55, SHORT_ACCEL: 0.30, BANANA: 0.20, DROP: 0.65 },
  }),
});

function getStateProfile(state) {
  return EXECUTION_STATE_PROFILES[state] ?? EXECUTION_STATE_PROFILES.NEUTRAL;
}

export function applyExecutionStateBias(scores, executionState) {
  // Suporta tanto executionState completo (com .modifiers) quanto o profile direto
  const modifiers = executionState?.modifiers ?? executionState;
  const bias    = modifiers?.scoreBias;
  const penalty = modifiers?.scorePenalty;
  if (!bias && !penalty) return scores;

  const next = { ...scores };

  // Bônus aditivos (apenas valores positivos — estados favoráveis ao shot)
  if (bias) {
    for (const [shotType, delta] of Object.entries(bias)) {
      if (next[shotType] == null || delta <= 0) continue;
      next[shotType] = Math.max(0, next[shotType] + delta);
    }
  }

  // Penalidades multiplicativas (0-1): reduzem sem zerar shots com peso pequeno
  if (penalty) {
    for (const [shotType, factor] of Object.entries(penalty)) {
      if (next[shotType] == null) continue;
      next[shotType] = Math.max(0, next[shotType] * factor);
    }
  }

  return next;
}

export function deriveExecutionState(contactSpace, swingPrep, contactResult, player, ball) {
  const arrivalMargin = contactSpace?.arrivalMarginS ?? player?._arrivalMargin ?? 0;
  const prepWindow = contactSpace?.prepWindowClass ?? 'COMFORTABLE';
  const offsetZone = contactSpace?.offsetZone ?? 'IDEAL';
  const heightZone = contactSpace?.heightZone ?? 'SWEET';
  const balance = contactResult?.balanceFactor ?? 1;
  const timing = contactResult?.timingFactor ?? 1;
  const playerVelX = Math.abs(player?.vel?.x ?? 0);
  const playerVelY = player?.vel?.y ?? 0;
  const runSpeed = Math.hypot(playerVelX, playerVelY);
  const ballVz = ball?.vel?.z ?? 0;
  const playerSide = player?.side ?? 1;

  let state = 'NEUTRAL';

  const lateralGap = Math.abs((ball?.pos?.x ?? 0) - (player?.pos?.x ?? 0));
  const hasFullPrep = swingPrep?.swingType === 'FULL' || swingPrep?.swingType === 'COMPACT';
  const isEmergencyPrep = prepWindow === 'EMERGENCY';
  const isRushPrep = prepWindow === 'RUSH';

  const jammed = offsetZone === 'REACHABLE' && playerVelX < 0.34 && lateralGap < 0.20 && balance < 0.95;
  const fallingBack = playerVelY * playerSide < -0.38 && (heightZone === 'HIGH' || heightZone === 'SHOULDER' || (ball?.pos?.z ?? 0) > 1.15);
  const onRise = ballVz > 0.50 && arrivalMargin > 0.03 && offsetZone !== 'EXTREME' && heightZone !== 'DIRT' && timing > 0.80;
  const onTheRun = runSpeed > 2.8 && balance < 0.89;
  const stretched = offsetZone === 'EXTREME'
    || (offsetZone === 'STRETCH' && (
      (balance < 0.79)
      || (runSpeed > 2.9 && arrivalMargin < 0.03)
      || (balance < 0.84 && runSpeed > 2.1)
    ));
  // Janela de "Late" mais estrita:
  // jogador inteiro e bem posicionado deve cair em Neutral com mais frequência.
  const clearlyLateMargin = arrivalMargin < -0.14;
  const emergencyLate = isEmergencyPrep && arrivalMargin < -0.06 && timing < 0.72;
  const rushedLate = isRushPrep && arrivalMargin < -0.09 && timing < 0.70 && balance < 0.88;
  const comfortableContact = (offsetZone === 'IDEAL' || offsetZone === 'REACHABLE')
    && balance > 0.90
    && timing > 0.76
    && arrivalMargin > -0.05;
  const late = !stretched && !onTheRun && !jammed && (
    !comfortableContact && (
      clearlyLateMargin
      || emergencyLate
      || rushedLate
      || (timing < 0.66 && arrivalMargin < -0.06)
    )
  );
  const planted = arrivalMargin > 0.05 && balance > 0.92 && offsetZone === 'IDEAL' && hasFullPrep && timing > 0.81;

  if (planted) state = 'PLANTED';
  else if (onRise) state = 'ON_RISE';
  else if (stretched) state = 'STRETCHED';
  else if (onTheRun) state = 'ON_THE_RUN';
  else if (fallingBack) state = 'FALLING_BACK';
  else if (jammed) state = 'JAMMED';
  else if (late) state = 'LATE';

  const stateScores = {
    PLANTED: clamp((arrivalMargin - 0.04) * 6 + (balance - 0.92) * 2 + (timing - 0.80) * 2, 0, 1),
    ON_RISE: clamp((ballVz - 0.45) * 1.8 + (timing - 0.78) * 2.4, 0, 1),
    STRETCHED: clamp((offsetZone === 'EXTREME' ? 0.75 : 0.35) + Math.max(0, runSpeed - 2.2) * 0.24 + Math.max(0, 0.86 - balance) * 1.6, 0, 1),
    ON_THE_RUN: clamp(Math.max(0, runSpeed - 2.4) * 0.30 + Math.max(0, 0.92 - balance) * 1.4, 0, 1),
    FALLING_BACK: clamp(Math.max(0, -playerVelY * playerSide - 0.24) * 0.55 + (heightZone === 'HIGH' || heightZone === 'OVERHEAD' ? 0.25 : 0), 0, 1),
    JAMMED: clamp((offsetZone === 'REACHABLE' ? 0.35 : 0) + Math.max(0, 0.24 - lateralGap) * 1.2 + Math.max(0, 0.96 - balance) * 1.2, 0, 1),
    LATE: clamp(Math.max(0, -arrivalMargin - 0.05) * 3.2 + Math.max(0, 0.76 - timing) * 1.9, 0, 1),
    NEUTRAL: 0.2,
  };
  const sortedStates = Object.entries(stateScores).sort((a, b) => b[1] - a[1]);
  const primary = state;
  const secondaryState = sortedStates.find(([name]) => name !== primary && name !== 'NEUTRAL')?.[0] ?? 'NONE';

  const profile = getStateProfile(state);
  return {
    state,
    primaryState: primary,
    secondaryState,
    stateScores,
    label: profile.label,
    arrivalMargin,
    prepWindow,
    offsetZone,
    heightZone,
    modifiers: profile,
  };
}

