import { clamp } from '../../core/math.js';
import { ShotFamily, ShotIntent } from './ShotTypes.js';

function familyTechnique(caps, family) {
  const control = caps?.wingControl ?? 0.6;
  const power = caps?.wingPower ?? 0.6;
  const reading = caps?.reading ?? 0.6;
  const consistency = caps?.consistency ?? 0.65;

  if (family === ShotFamily.TOPSPIN) {
    return clamp((caps?.topspin ?? 0.6) * 0.38 + control * 0.27 + (caps?.spinSecurity ?? 0.6) * 0.20 + power * 0.15, 0, 1);
  }
  if (family === ShotFamily.FLAT_DRIVE) {
    return clamp(power * 0.38 + control * 0.34 + consistency * 0.18 + reading * 0.10, 0, 1);
  }
  if (family === ShotFamily.SLICE || family === ShotFamily.CHIP_RETURN) {
    return clamp((caps?.slice ?? 0.55) * 0.42 + control * 0.27 + (caps?.touch ?? 0.55) * 0.19 + reading * 0.12, 0, 1);
  }
  if (family === ShotFamily.DROP || family === ShotFamily.LOB) {
    return clamp((caps?.touch ?? 0.55) * 0.40 + control * 0.25 + reading * 0.20 + (caps?.tacticalVision ?? 0.6) * 0.15, 0, 1);
  }
  if (family === ShotFamily.VOLLEY) {
    return clamp((caps?.volley ?? 0.55) * 0.46 + control * 0.22 + reading * 0.20 + (caps?.touch ?? 0.55) * 0.12, 0, 1);
  }
  if (family === ShotFamily.SMASH) {
    return clamp((caps?.smash ?? 0.55) * 0.48 + power * 0.25 + reading * 0.17 + control * 0.10, 0, 1);
  }
  if (family === ShotFamily.BLOCK_RETURN) {
    return clamp((caps?.return ?? 0.6) * 0.42 + reading * 0.26 + control * 0.20 + consistency * 0.12, 0, 1);
  }
  return clamp(control * 0.36 + power * 0.24 + reading * 0.22 + consistency * 0.18, 0, 1);
}

function intentDemand(intent, finishMode) {
  if (intent === ShotIntent.FINISH) return finishMode === 'margin' ? 0.67 : 0.79;
  if (intent === ShotIntent.REDIRECT || intent === ShotIntent.PASS) return 0.72;
  if (intent === ShotIntent.PRESSURE) return 0.66;
  if (intent === ShotIntent.APPROACH) return 0.62;
  if (intent === ShotIntent.BUILD) return 0.51;
  if (intent === ShotIntent.CONTROL) return 0.46;
  if (intent === ShotIntent.DEFEND) return 0.49;
  if (intent === ShotIntent.RESET) return 0.43;
  return 0.52;
}

export function evaluateExecutionQuality(context, quality, decision) {
  const caps = context?.capabilities ?? {};
  const body = context?.body ?? {};
  const contactQuality = clamp(quality?.quality ?? 0.5, 0, 1);
  const technique = familyTechnique(caps, decision?.family);
  const readiness = clamp(body.contactReadiness ?? 0, 0, 1);
  const arrival = body.arrivalMargin ?? 0;
  const arrivalScore = clamp(0.58 + arrival * 1.55, 0, 1);
  const stableBody = ['PLANTED', 'ON_RISE'].includes(quality?.bodyState)
    ? 1
    : quality?.bodyState === 'MOVING'
      ? 0.76
      : quality?.bodyState === 'AERIAL'
        ? 0.68
        : 0.34;
  const mechanics = body.strokePreparation ?? null;
  const mechanicalActive = !!mechanics?.active;
  const mechanicalIntegrity = clamp(mechanics?.mechanicalIntegrity ?? 0.72, 0, 1);
  const stanceFit = clamp(mechanics?.stanceFit ?? 0.72, 0, 1);
  const weightTransfer = clamp(mechanics?.weightTransfer ?? 0.72, 0, 1);
  const switchSeverity = clamp(mechanics?.switchSeverity ?? 0, 0, 1);
  const preparation = mechanicalActive
    ? clamp(
        readiness * 0.28
          + arrivalScore * 0.20
          + stableBody * 0.14
          + mechanicalIntegrity * 0.22
          + stanceFit * 0.07
          + weightTransfer * 0.09,
        0,
        1,
      )
    : clamp(readiness * 0.48 + arrivalScore * 0.32 + stableBody * 0.20, 0, 1);
  const decisionQuality = clamp(
    (caps.tacticalVision ?? 0.6) * 0.35
      + (caps.reading ?? 0.6) * 0.30
      + (caps.consistency ?? 0.65) * 0.20
      + (caps.mentality ?? 0.6) * 0.15,
    0,
    1,
  );
  const serveInitiative = context?.serveAdvantage ?? null;
  const plusOne = (context?.score?.rally ?? 0) <= 1 && serveInitiative?.beneficiaryId === context?.player?.id;
  // Uma devolução curta/fofa não dá controle técnico de graça, mas dá
  // tempo para preparar a primeira bola. A vantagem entra uma vez, como margem
  // de preparação, em vez de alterar simultaneamente qualidade, risco e alvo.
  const initiativePreparation = plusOne
    ? clamp((serveInitiative?.score ?? 0) * 0.075 + (serveInitiative?.attackableReturn ? 0.050 : 0), 0, 0.12)
    : 0;
  const demand = clamp(intentDemand(decision?.intent, decision?.finishMode) - initiativePreparation * 0.45, 0, 1);
  const availableExecution = mechanicalActive
    ? contactQuality * 0.42 + technique * 0.31 + preparation * 0.17 + mechanicalIntegrity * 0.10
    : contactQuality * 0.46 + technique * 0.34 + preparation * 0.20;
  const intentFit = clamp(0.5 + (availableExecution - demand) * 1.25, 0, 1);
  const ambitionGap = Math.max(0, demand - availableExecution);
  const executionQuality = clamp(
    mechanicalActive
      ? contactQuality * 0.44
        + technique * 0.28
        + preparation * 0.12
        + mechanicalIntegrity * 0.10
        + decisionQuality * 0.06
        - ambitionGap * 0.10
        - switchSeverity * 0.035
        + initiativePreparation
      : contactQuality * 0.48
        + technique * 0.30
        + preparation * 0.14
        + decisionQuality * 0.08
        - ambitionGap * 0.10
        + initiativePreparation,
    0,
    1,
  );
  const emergencyBody = quality?.bodyState === 'STRETCHED' || quality?.bodyState === 'LATE';
  const compromisedBody = emergencyBody
    || quality?.bodyState === 'LOW_PICKUP'
    || quality?.bodyState === 'FALLING_BACK'
    || quality?.bodyState === 'JAMMED';
  const executionMode = mechanics?.mode === 'SURVIVAL'
    ? 'SURVIVAL'
    : mechanics?.mode === 'JAMMED'
      ? 'SHAPED'
      : emergencyBody && (contactQuality < 0.52 || readiness < 0.30)
    ? 'SURVIVAL'
    : compromisedBody
      ? 'SHAPED'
      : intentFit >= 0.56 && executionQuality >= 0.56
        ? 'FULL'
        : intentFit >= 0.30 && executionQuality >= 0.43
          ? 'SHAPED'
          : 'SURVIVAL';

  return Object.freeze({
    contactQuality,
    executionQuality,
    technique,
    preparation,
    mechanicalIntegrity,
    stanceFit,
    weightTransfer,
    switchSeverity,
    powerTransfer: mechanics?.powerTransfer ?? 0.92,
    directionFreedom: mechanics?.directionFreedom ?? 0.72,
    strokePreparationMode: mechanics?.mode ?? null,
    decisionQuality,
    intentDemand: demand,
    intentFit,
    ambitionGap,
    initiativePreparation,
    executionMode,
  });
}
