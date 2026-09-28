import { clamp } from '../../core/math.js';
import { ShotFamily, ShotIntent } from './ShotTypes.js';

// This layer identifies the tactical problem of the current contact. It does
// not pick a shot; ShotDecision still owns quality, risk and final selection.
export const TacticalPlan = Object.freeze({
  STABILIZE: 'STABILIZE',
  BUILD_DEPTH: 'BUILD_DEPTH',
  BREAK_RHYTHM: 'BREAK_RHYTHM',
  PUSH_DEEP_THEN_DROP: 'PUSH_DEEP_THEN_DROP',
  CONSTRUCT_OPENING: 'CONSTRUCT_OPENING',
  ATTACK_SPACE: 'ATTACK_SPACE',
  NEUTRAL: 'NEUTRAL',
});

function cleanContact(context, quality) {
  const state = quality?.bodyState ?? '';
  return (quality?.quality ?? 0.5) >= 0.54
    && (context?.body?.contactReadiness ?? 0) >= 0.44
    && (context?.body?.arrivalMargin ?? 0) >= -0.055
    && !['LOW_PICKUP', 'STRETCHED', 'LATE', 'FALLING_BACK'].includes(state);
}

export function evaluateTacticalPlan(context, quality, ev) {
  const memory = context?.memory ?? {};
  const prefs = context?.prefs ?? {};
  const rally = context?.score?.rally ?? 0;
  const playerY = Math.abs(context?.player?.pos?.y ?? 0);
  const opponentY = Math.abs(context?.opponent?.pos?.y ?? 0);
  const opponentX = Math.abs(context?.opponent?.pos?.x ?? 0);
  const pressure = context?.player?.ctx?.rallyPressure ?? 0;
  const ready = cleanContact(context, quality);
  const dropArtist = prefs.buildStyle === 'DROP_VARIATION';
  const varied = dropArtist || prefs.buildStyle === 'VARIED' || prefs.buildStyle === 'SLICE_CONTROL';
  const hiddenDropSpecialist = context?.player?.naturalSignature === 'DROP_HIDDEN'
    || context?.player?.signatureShot === 'DROP_HIDDEN';
  const caps = context?.capabilities ?? {};
  const organicTouchConstructor = (caps.touch ?? 0.55) >= 0.64
    && (caps.reading ?? 0.55) >= 0.64
    && (caps.tacticalVision ?? 0.55) >= 0.62;
  const allCourtConstructor = context?.player?.styleId === 'ALL_COURT'
    && (caps.wingControl ?? 0.6) >= 0.78
    && (caps.reading ?? 0.6) >= 0.78
    && (caps.tacticalVision ?? 0.6) >= 0.78;
  const opponentDeep = opponentY > 9.00;
  const playerInside = playerY < 12.35;
  const carriedDropPlan = memory?.pointPlan?.type === TacticalPlan.PUSH_DEEP_THEN_DROP;
  const touchMemory = context?.player?.ctx?.matchCtx?.touchVariation ?? {};
  const touchCoolingDown = (touchMemory.cooldownPoints ?? 0) > 0 || (touchMemory.heat ?? 0) > 0.62;

  let type = TacticalPlan.NEUTRAL;
  let confidence = 0.30;
  let reason = 'neutral_rally';
  let families = [ShotFamily.TOPSPIN, ShotFamily.FLAT_DRIVE];
  let intents = [ShotIntent.BUILD, ShotIntent.PRESSURE];

  if (pressure > 0.64 || memory?.rallyPlan === TacticalPlan.STABILIZE) {
    type = TacticalPlan.STABILIZE;
    confidence = clamp(0.48 + pressure * 0.34, 0, 1);
    reason = 'under_pressure';
    families = [ShotFamily.TOPSPIN, ShotFamily.SLICE, ShotFamily.LOB];
    intents = [ShotIntent.DEFEND, ShotIntent.RESET, ShotIntent.CONTROL];
  } else if (!touchCoolingDown && ready && playerInside && opponentDeep && (
    carriedDropPlan
    || ((varied || hiddenDropSpecialist) && (rally >= (hiddenDropSpecialist ? 2 : 3) || (memory?.pressureBuilt ?? 0) >= 0.32))
    || (organicTouchConstructor && rally >= 4 && (memory?.pressureBuilt ?? 0) >= 0.38)
  )) {
    type = TacticalPlan.PUSH_DEEP_THEN_DROP;
    confidence = clamp(0.50 + (opponentY - 9.00) * 0.10 + (dropArtist ? 0.15 : 0) + (hiddenDropSpecialist ? 0.10 : 0) + (organicTouchConstructor ? 0.06 : 0) + (carriedDropPlan ? 0.12 : 0), 0, 0.94);
    reason = carriedDropPlan ? 'depth_plan_matured' : 'opponent_deep_variation';
    families = [ShotFamily.DROP, ShotFamily.SLICE, ShotFamily.TOPSPIN];
    intents = [ShotIntent.BUILD, ShotIntent.PRESSURE, ShotIntent.FINISH];
  } else if (ready && (opponentX > 2.2 || opponentDeep || ev?.flags?.rivalExposed)) {
    type = TacticalPlan.ATTACK_SPACE;
    confidence = clamp(0.44 + (ev?.exposureEV ?? 0) * 0.48, 0, 0.92);
    reason = opponentX > 2.2 ? 'opponent_wide' : 'opponent_exposed';
    families = [ShotFamily.FLAT_DRIVE, ShotFamily.TOPSPIN, ShotFamily.DROP];
    intents = [ShotIntent.PRESSURE, ShotIntent.FINISH, ShotIntent.REDIRECT];
  } else if (ready && allCourtConstructor && rally >= 2) {
    // O construtor all-court não espera uma bola morta nem ataca no escuro:
    // ele reconhece uma troca neutra que pode ser inclinada com profundidade,
    // cruzado pesado ou redirecionamento. Isso dá uma intenção concreta ao
    // controle/leituras de elite, sem promover uma finalização prematura.
    type = TacticalPlan.CONSTRUCT_OPENING;
    confidence = clamp(
      0.39
      + ((caps.wingControl ?? 0.6) - 0.76) * 0.42
      + ((caps.reading ?? 0.6) - 0.76) * 0.28
      + ((caps.tacticalVision ?? 0.6) - 0.76) * 0.22
      + (rally >= 5 ? 0.06 : 0),
      0.38,
      0.78,
    );
    reason = 'all_court_constructs_opening';
    families = [ShotFamily.TOPSPIN, ShotFamily.FLAT_DRIVE, ShotFamily.SLICE];
    intents = [ShotIntent.BUILD, ShotIntent.PRESSURE, ShotIntent.REDIRECT, ShotIntent.CONTROL];
  } else if (ready && ((memory?.softLoop ?? 0) >= 2 || (memory?.directionStreak?.count ?? 0) >= 2 || varied)) {
    type = TacticalPlan.BREAK_RHYTHM;
    confidence = clamp(0.38 + (memory?.softLoop ?? 0) * 0.08 + (varied ? 0.12 : 0), 0, 0.78);
    reason = 'pattern_repetition';
    families = [ShotFamily.SLICE, ShotFamily.DROP, ShotFamily.TOPSPIN];
    intents = [ShotIntent.BUILD, ShotIntent.CONTROL, ShotIntent.PRESSURE];
  } else if (ready && rally >= 2) {
    type = TacticalPlan.BUILD_DEPTH;
    confidence = clamp(0.38 + (rally >= 5 ? 0.12 : 0) + (ev?.safetyEV ?? 0.5) * 0.16, 0, 0.76);
    reason = 'create_depth';
    families = [ShotFamily.TOPSPIN, ShotFamily.FLAT_DRIVE, ShotFamily.SLICE];
    intents = [ShotIntent.BUILD, ShotIntent.CONTROL, ShotIntent.PRESSURE];
  }

  return Object.freeze({ type, confidence: +confidence.toFixed(3), reason, families, intents, carried: carriedDropPlan });
}
