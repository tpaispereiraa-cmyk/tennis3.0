import { COURT } from '../../core/constants.js';
import { clamp, rand } from '../../core/math.js';
import { courtVocabularyScore, evaluateCourtIdentityCandidate, getCourtIdentity } from '../../domain/players/PlayerCourtIdentity.js';
import { evaluatePointPattern, pointPatternScore } from './PointPatternDirector.js';
import { getOpponentRead } from './OpponentObservation.js';
import { getShotDefinition } from './ShotCatalog.js';
import { getCapabilityForShot } from './PlayerShotCapabilities.js';
import { getBlueprintsForPhase } from './ShotBlueprints.js';
import { resolveShotStyle } from './ShotStyle.js';
import { chooseTarget } from './ShotTargeting.js';
import { applySignatureMoveToDecision } from './SignatureMoves.js';
import { BodyState, RiskProfile, ShotDirection, ShotFamily, ShotIntent, ShotPhase } from './ShotTypes.js';

const BAD_BODY = new Set([BodyState.STRETCHED, BodyState.LATE, BodyState.FALLING_BACK, BodyState.LOW_PICKUP]);
const FINISH_TAGS = new Set(['finish', 'winner', 'passing']);

function signatures(player = {}) {
  return new Set([player.naturalSignature, player.signatureShot, ...(player.signatureShots ?? [])].filter(Boolean));
}

function phaseFor(context, quality) {
  const raw = context?.phase;
  const opponentY = Math.abs(context?.opponent?.pos?.y ?? COURT.halfL);
  const playerY = Math.abs(context?.player?.pos?.y ?? COURT.halfL);
  const ballZ = context?.ballState?.z ?? context?.ballState?.pos?.z ?? 0.9;
  if (raw === ShotPhase.RETURN || raw === ShotPhase.SERVE) return raw;
  if (raw === ShotPhase.NET || playerY < 6.0) return ShotPhase.NET;
  if (raw === ShotPhase.PASSING || opponentY < 7.6) return ShotPhase.PASSING;
  if (raw === ShotPhase.APPROACH) return raw;
  if (ballZ > 2.15 && playerY < 7.5) return ShotPhase.NET;
  const q = quality?.quality ?? 0.5;
  const arrival = context?.body?.arrivalMargin ?? 0;
  if (q < 0.46 || arrival < -0.075 || BAD_BODY.has(quality?.bodyState)) return ShotPhase.RALLY_DEFENSE;
  if (q > 0.62 && (Math.abs(context?.ballState?.pos?.y ?? COURT.halfL) < 8.75 || Math.abs(context?.opponent?.pos?.x ?? 0) > 1.25)) return ShotPhase.RALLY_ATTACK;
  return ShotPhase.RALLY_NEUTRAL;
}

function deriveState(context, quality, phase) {
  const caps = context?.capabilities ?? {};
  const player = context?.player ?? {};
  const opponent = context?.opponent ?? {};
  const p = player.pos ?? { x: 0, y: COURT.halfL };
  const o = opponent.pos ?? { x: 0, y: -COURT.halfL };
  const ov = opponent.vel ?? opponent.velocity ?? { x: 0, y: 0 };
  const ball = context?.ballState?.pos ?? context?.ballState ?? { x: 0, y: p.y, z: 0.9 };
  const q = clamp(quality?.quality ?? 0.5, 0, 1);
  const ready = clamp(context?.body?.contactReadiness ?? 0.5, 0, 1);
  const arrival = context?.body?.arrivalMargin ?? 0;
  const opponentSpeed = Math.hypot(ov.x ?? 0, ov.y ?? 0);
  const opponentDisplacement = Math.abs(o.x ?? 0);
  const pressureFaced = clamp((player?.ctx?.rallyPressure ?? 0) * 0.62 + (1 - q) * 0.38, 0, 1);
  const advantage = clamp((q - 0.50) * 1.35 + ready * 0.25 + opponentDisplacement * 0.095 + (Math.abs(o.y ?? 0) > 9.4 ? 0.10 : 0) - pressureFaced * 0.26, -1, 1);
  return {
    phase, caps, player, opponent, p, o, ov, ball, q, ready, arrival,
    bodyState: quality?.bodyState ?? BodyState.MOVING,
    ballZ: ball.z ?? context?.ballState?.z ?? 0.9,
    playerY: Math.abs(p.y ?? COURT.halfL), opponentY: Math.abs(o.y ?? COURT.halfL),
    playerX: Math.abs(p.x ?? 0), opponentX: opponentDisplacement,
    opponentSpeed, pressureFaced, advantage,
    rally: context?.score?.rally ?? context?.memory?.shots?.length ?? 0,
    style: resolveShotStyle(context),
    sigs: signatures(player),
  };
}

function objectiveFor(s) {
  if (s.phase === ShotPhase.NET) return s.ballZ > 1.85 ? 'FINISH' : 'CLOSE_NET';
  if (s.phase === ShotPhase.PASSING) return 'PASS';
  if (s.phase === ShotPhase.RALLY_DEFENSE || s.advantage < -0.28) return 'SURVIVE';
  if (s.advantage > 0.42) return 'FINISH';
  if (s.advantage > 0.16) return 'ATTACK';
  if (s.pressureFaced > 0.60) return 'RESET';
  return s.rally >= 5 ? 'MOVE' : 'CONSTRUCT';
}

function requirementFactor(bp, s) {
  const r = bp.requirements;
  if (bp.intent === ShotIntent.APPROACH) {
    const attrs = s.player?.attrs ?? {};
    const netSkill = ((attrs.volley ?? attrs.jogoDeRede ?? (s.caps.volley ?? 0.55) * 100)
      + (attrs.smash ?? attrs.jogoDeRede ?? (s.caps.smash ?? 0.55) * 100)) / 2;
    const netGame = s.player?.prefs?.netGame ?? 'RELUCTANT';
    const minNetSkill = netGame === 'HUNTER' ? 58 : netGame === 'PROACTIVE' ? 68 : netGame === 'OPPORTUNIST' ? 60 : 72;
    // Não declare uma intenção que o controlador de movimento jamais
    // aceitaria. A decisão e a transição usam a mesma realidade corporal.
    if (netSkill < minNetSkill || s.playerY > 10.25) return 0;
  }
  if (r.forehandOnly && s.caps.wing !== 'FOREHAND') return 0;
  if (r.overhead && s.ballZ < 1.70) return 0;
  if (r.opponentAtNet && s.opponentY > 8.0) return 0;
  if (r.opponentDeep != null && s.opponentY < r.opponentDeep) return 0;
  if (r.opponentInside != null && s.opponentY > r.opponentInside) return 0;
  if (r.opponentDisplaced != null && s.opponentX < r.opponentDisplaced) return 0;
  if (r.opponentMoving != null && s.opponentSpeed < r.opponentMoving) return 0;
  if (r.playerWide != null && s.playerX < r.playerWide) return 0;
  if (r.ballShort != null && Math.abs(s.ball.y ?? COURT.halfL) > r.ballShort) return 0;
  if (r.playerInside != null && s.playerY > r.playerInside) return 0;
  if (r.minTopspin != null && (s.caps.topspin ?? 0.6) < r.minTopspin) return 0;
  if (r.minSlice != null && (s.caps.slice ?? 0.55) < r.minSlice) return 0;
  if (r.minTouch != null && (s.caps.touch ?? 0.55) < r.minTouch) return 0;
  if (r.ballZ && (s.ballZ < r.ballZ[0] || s.ballZ > r.ballZ[1])) return 0;
  if (r.minQ != null && s.q < r.minQ - 0.13) return 0;
  if (r.minReady != null && s.ready < r.minReady - 0.16) return 0;
  if (r.minArrival != null && s.arrival < r.minArrival - 0.075) return 0;

  let factor = 1;
  if (r.minQ != null) factor *= clamp(0.35 + (s.q - (r.minQ - 0.13)) / 0.13 * 0.65, 0.25, 1);
  if (r.minReady != null) factor *= clamp(0.40 + (s.ready - (r.minReady - 0.16)) / 0.16 * 0.60, 0.30, 1);
  if (r.minArrival != null) factor *= clamp(0.42 + (s.arrival - (r.minArrival - 0.075)) / 0.075 * 0.58, 0.30, 1);
  return factor;
}

function capabilityScore(bp, s) {
  const weights = Object.entries(bp.capabilityWeights);
  if (!weights.length) return getCapabilityForShot(s.caps, getShotDefinition(bp.family));
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0) || 1;
  return clamp(weights.reduce((sum, [key, weight]) => sum + (s.caps[key] ?? 0.58) * weight, 0) / total, 0, 1);
}

function objectiveFit(bp, objective) {
  const intent = bp.intent;
  if (objective === 'SURVIVE') return [ShotIntent.DEFEND, ShotIntent.RESET].includes(intent) ? 1 : intent === ShotIntent.CONTROL ? 0.72 : 0.18;
  if (objective === 'RESET') return [ShotIntent.RESET, ShotIntent.CONTROL].includes(intent) ? 1 : intent === ShotIntent.BUILD ? 0.72 : 0.35;
  if (objective === 'PASS') return intent === ShotIntent.PASS ? 1 : intent === ShotIntent.DEFEND ? 0.45 : 0.20;
  if (objective === 'CLOSE_NET') return [ShotIntent.PRESSURE, ShotIntent.FINISH].includes(intent) ? 1 : 0.62;
  if (objective === 'FINISH') return intent === ShotIntent.FINISH ? 1 : [ShotIntent.PRESSURE, ShotIntent.PASS].includes(intent) ? 0.78 : 0.34;
  if (objective === 'ATTACK') return [ShotIntent.PRESSURE, ShotIntent.REDIRECT, ShotIntent.APPROACH].includes(intent) ? 1 : intent === ShotIntent.FINISH ? 0.72 : 0.50;
  if (objective === 'MOVE') return ['move', 'short_angle', 'rhythm_break'].some((tag) => bp.tags.includes(tag)) ? 1 : intent === ShotIntent.BUILD ? 0.78 : 0.56;
  return [ShotIntent.BUILD, ShotIntent.CONTROL].includes(intent) ? 1 : intent === ShotIntent.PRESSURE ? 0.68 : 0.43;
}

function preferenceScore(bp, s, context) {
  const prefs = context?.prefs ?? {};
  let score = 0;
  if (bp.preferences.signatures?.some((id) => s.sigs.has(id))) score += 0.14;
  if (bp.preferences.buildStyles?.includes(prefs.buildStyle)) score += 0.07;
  if (bp.preferences.netGames?.includes(prefs.netGame)) score += 0.12;
  if (bp.tags.includes('forehand') && s.caps.wing === 'FOREHAND') score += 0.04;
  if (bp.tags.includes('touch_variation')) score += s.style.dropBias * 0.62 + (s.style.shortAngleBuilder ? 0.07 : 0);
  if (bp.family === ShotFamily.TOPSPIN) score += s.style.topspinBias * 0.55;
  if (bp.family === ShotFamily.FLAT_DRIVE) score += s.style.flatBias * 0.55;
  if (bp.tags.includes('finish') && s.style.earlyStrike) score += 0.055;
  if (bp.tags.includes('safe')) score += s.style.safetyBias * 0.65;
  if (prefs.riskProfile === 'ALLOUT') score += bp.risk * 0.08;
  if (prefs.riskProfile === 'GAMBLER') score += bp.risk * 0.045;
  if (prefs.riskProfile === 'SAFE' || prefs.riskProfile === 'SAFETY_FIRST') score -= bp.risk * 0.09;
  if (prefs.rallyCadence === 'PATIENT' && bp.tags.some((tag) => FINISH_TAGS.has(tag))) score -= 0.055;
  return score;
}

function surfaceScore(bp, context) {
  const surfaceBias = context?.player?._surfaceIdentityFx?.shotBias ?? {};
  let score = 0;
  score += surfaceBias[bp.family] ?? 0;
  if (bp.tags.includes('short_angle')) score += surfaceBias.SHORT_ANGLE ?? 0;
  if (bp.tags.includes('approach')) score += surfaceBias.APPROACH ?? 0;
  if (bp.tags.includes('volley')) score += surfaceBias.VOLLEY ?? 0;
  if (bp.tags.includes('redirect') || bp.tags.includes('line_change')) score += surfaceBias.REDIRECT ?? 0;
  if (bp.tags.includes('first_strike') || bp.tags.includes('finish')) score += surfaceBias.FIRST_STRIKE ?? 0;
  if (bp.tags.includes('return_block')) score += surfaceBias.BLOCK_RETURN ?? 0;
  if (bp.tags.includes('power')) score += surfaceBias.POWER ?? 0;
  return score;
}

function memoryScore(bp, context, identity, awareness = 0) {
  const memory = context?.memory ?? {};
  const shots = memory.shots ?? [];
  const last = shots[shots.length - 1];
  let score = 0;
  const tolerance = identity?.shotVocabulary?.repeatTolerance ?? 0;
  const repeatMult = clamp(1 - tolerance * 1.5 + awareness * 0.65, 0.65, 1.55);
  if (last?.blueprintId === bp.id) score -= 0.16 * repeatMult;
  const recentSame = shots.slice(-5).filter((shot) => shot.blueprintId === bp.id).length;
  score -= recentSame * 0.075 * repeatMult;
  if (memory.familyStreak?.value === bp.family) score -= Math.max(0, (memory.familyStreak.count ?? 1) - 1) * 0.025 * repeatMult;
  if (memory.directionStreak?.value === bp.direction) score -= Math.max(0, (memory.directionStreak.count ?? 1) - 1) * 0.022 * repeatMult;
  if (memory.rallyPlan === 'STABILIZE' && [ShotIntent.RESET, ShotIntent.CONTROL].includes(bp.intent)) score += 0.08;
  if (memory.rallyPlan === 'CASH_IN' && [ShotIntent.FINISH, ShotIntent.PRESSURE].includes(bp.intent)) score += 0.08;
  if (memory.rallyPlan === 'CHANGE_PATTERN' && (bp.tags.includes('rhythm_break') || bp.direction !== memory.lastDirection)) score += 0.09;
  const touch = context?.player?.ctx?.matchCtx?.touchVariation ?? {};
  if (bp.tags.includes('touch_variation')) {
    const variationMult = clamp(1 - (identity?.shotVocabulary?.variationTolerance ?? 0) * 1.4 + awareness * 0.5, 0.65, 1.5);
    score -= ((touch.heat ?? 0) * 0.22 + ((touch.cooldownPoints ?? 0) > 0 ? 0.22 : 0)) * variationMult;
  }
  return score;
}

function matchPlanScore(bp, s, identity) {
  const directives = s.player?._matchPlan?.directives ?? [];
  const adherence = clamp(0.62 + ((s.player?.attrs?.adaptacao ?? 50) + (s.player?.attrs?.visaoTatica ?? 50) - 100) / 500 + (identity?.adaptation?.planAdherence ?? 0), 0.4, 0.85);
  let score = 0;
  for (const directive of directives) {
    const type = directive?.type ?? directive;
    if (type === 'FORCE_LONG') score += ['BUILD', 'CONTROL'].includes(bp.intent) ? 0.045 : bp.intent === 'FINISH' && s.rally < 4 ? -0.035 : 0;
    if (type === 'NET_PRESSURE' && bp.intent === 'APPROACH') score += 0.065;
    if (type === 'LIMIT_NET' && bp.intent === 'APPROACH') score -= 0.065;
    if (type === 'EARLY_AGGRESSION' && s.rally <= 3 && bp.intent === 'PRESSURE') score += 0.055;
    // A target side is only approximate until targeting resolves the final coordinates.
    if ((type === 'ATTACK_BH' || type === 'ATTACK_FH') && ['CROSS', 'DTL'].includes(bp.direction)) {
      const targetSign = Math.sign(s.p.x || s.ball.x || 1) * (bp.direction === 'CROSS' ? -1 : 1);
      const backhandSign = s.opponent?.hand === 'LEFT' ? 1 : -1;
      if (targetSign === (type === 'ATTACK_BH' ? backhandSign : -backhandSign)) score += 0.035;
    }
  }
  return clamp(score * adherence, -0.075, 0.075);
}

function predictConsequences(bp, s, capability, feasibility, identityRisk = 0) {
  const bodyPenalty = BAD_BODY.has(s.bodyState) ? 0.12 : 0;
  const preparation = clamp(s.q * 0.48 + s.ready * 0.32 + clamp(0.5 + s.arrival * 2.5, 0, 1) * 0.20, 0, 1);
  const margin = bp.tags.includes('safe') || bp.intent === ShotIntent.RESET ? 0.10 : bp.tags.includes('line_change') ? -0.07 : 0;
  const ownErrorChance = clamp(0.035 + bp.risk * 0.23 + (1 - capability) * 0.18 + (1 - preparation) * 0.24 + bodyPenalty + identityRisk - margin, 0.025, 0.58);
  const geometry = clamp(s.opponentX * 0.12 + (s.opponentY > 9.35 && (bp.tags.includes('short') || bp.tags.includes('drop') || bp.tags.includes('short_angle')) ? 0.24 : 0) + (s.opponentY < 8 && bp.tags.includes('passing') ? 0.20 : 0), 0, 0.48);
  const paceThreat = clamp((bp.trajectory.powerAdd ?? 0) * 0.035 + (s.caps.wingPower ?? 0.6) * 0.25, 0, 0.42);
  const shapeThreat = clamp((bp.trajectory.curveSpin ?? 0) * 0.15 + (bp.trajectory.topspinMult ?? 1) * 0.055 + (bp.trajectory.backspinMult ?? 0) * 0.06, 0, 0.28);
  const surprise = bp.tags.includes('touch_variation') || bp.tags.includes('wrong_foot') || bp.tags.includes('banana') ? 0.09 : 0;
  const reachDifficulty = clamp(0.12 + geometry + paceThreat + shapeThreat + surprise + capability * 0.13 - s.opponentSpeed * 0.018, 0.05, 0.94);
  const finish = bp.tags.some((tag) => FINISH_TAGS.has(tag)) ? 0.17 : 0;
  const winnerChance = clamp((reachDifficulty - 0.34) * 0.52 + finish + Math.max(0, s.advantage) * 0.13 - ownErrorChance * 0.18, 0.01, 0.72);
  const forcedErrorChance = clamp(reachDifficulty * 0.26 + (bp.intent === ShotIntent.PRESSURE ? 0.08 : 0) - winnerChance * 0.12, 0.02, 0.34);
  const nextBallAdvantage = clamp((reachDifficulty - 0.42) * 0.78 + (bp.intent === ShotIntent.BUILD ? 0.12 : 0) + (bp.intent === ShotIntent.APPROACH ? 0.08 : 0) - ownErrorChance * 0.30, -0.45, 0.70);
  const pointValue = clamp(winnerChance + forcedErrorChance * 0.68 + nextBallAdvantage * 0.30 - ownErrorChance * 1.12, -0.75, 0.90);
  return Object.freeze({
    inProbability: +(1 - ownErrorChance).toFixed(3), ownErrorChance: +ownErrorChance.toFixed(3),
    reachDifficulty: +reachDifficulty.toFixed(3), winnerChance: +winnerChance.toFixed(3),
    forcedErrorChance: +forcedErrorChance.toFixed(3), nextBallAdvantage: +nextBallAdvantage.toFixed(3),
    expectedPointValue: +(pointValue * feasibility).toFixed(3),
  });
}

function scoreBlueprint(bp, s, context, quality, objective, pattern, courtIdentity) {
  const feasibility = requirementFactor(bp, s);
  if (feasibility <= 0) return null;
  const capability = capabilityScore(bp, s);
  const identity = evaluateCourtIdentityCandidate({ player: s.player, context, quality, ev: { flags: { rivalExposed: s.advantage > 0.3, highEasyBounce: s.ballZ > 1.15 } }, family: bp.family, intent: bp.intent });
  const prediction = predictConsequences(bp, s, capability, feasibility, identity?.riskAdd ?? 0);
  const fit = objectiveFit(bp, objective);
  const preference = preferenceScore(bp, s, context);
  const surface = surfaceScore(bp, context);
  const awareness = getOpponentRead(s.opponent, s.player)?.dropAwareness ?? 0;
  const identityScore = clamp((identity?.total ?? 0) + courtVocabularyScore(courtIdentity, bp), -0.15, 0.19);
  const patternScore = pointPatternScore(pattern, bp);
  const planScore = matchPlanScore(bp, s, courtIdentity);
  const memory = memoryScore(bp, context, courtIdentity, bp.family === ShotFamily.DROP ? awareness : 0);
  const adaptationScore = bp.family === ShotFamily.DROP ? -awareness * 0.12 : (awareness > 0.2 && (bp.tags.includes('short_angle') || bp.tags.includes('line_change')) ? awareness * 0.035 * clamp((s.player?.attrs?.adaptacao ?? 50) / 100, 0, 1) : 0);
  // A curtinha precisa vencer por contexto e execução, não por receber
  // um prêmio de raridade. Esse custo pequeno preserva sua natureza surpresa.
  const variationCost = bp.family === ShotFamily.DROP ? 0.075 * clamp(1 - (courtIdentity.shotVocabulary.variationTolerance ?? 0) + awareness * 0.5, 0.72, 1.4) : bp.id === 'BANANA_CURVE' ? 0.018 : 0;
  const components = Object.freeze({ baseUtility: bp.baseUtility * 0.24, capabilityScore: capability * 0.23, objectiveScore: fit * 0.24,
    predictionScore: prediction.expectedPointValue * 0.34, preferenceScore: preference, surfaceScore: surface,
    identityScore, patternScore, matchPlanScore: planScore, memoryScore: memory, adaptationScore,
    physicalDifficulty: -(1 - feasibility) * 0.24, variationCost: -variationCost });
  const score = Object.values(components).reduce((sum, value) => sum + value, 0);
  return { blueprint: bp, score, feasibility, capability, objectiveFit: fit, preference, memory, prediction, identity, pattern, components, awareness };
}

function selectCandidate(candidates, s) {
  const ranked = [...candidates].sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const tolerance = clamp((s.caps.tacticalVision ?? 0.6) * 0.08 + (s.caps.consistency ?? 0.6) * 0.05, 0.055, 0.13);
  const viable = ranked.filter((candidate) => best.score - candidate.score <= tolerance);
  if (viable.length === 1) return { chosen: best, mode: 'predicted_clear_winner', ranked };
  const temperature = clamp(0.055 + (1 - (s.caps.consistency ?? 0.6)) * 0.06 + (s.style.isExplosive ? 0.018 : 0), 0.05, 0.13);
  const weighted = viable.map((candidate) => ({ candidate, weight: Math.exp((candidate.score - best.score) / temperature) }));
  let roll = rand(0, weighted.reduce((sum, item) => sum + item.weight, 0));
  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) return { chosen: item.candidate, mode: 'dna_softmax', ranked };
  }
  return { chosen: best, mode: 'dna_softmax_fallback', ranked };
}

function riskProfile(candidate, s) {
  if (candidate.blueprint.risk >= 0.60 || candidate.identity?.riskAdd >= 0.05) return RiskProfile.AGGRESSIVE;
  if (s.q < 0.44 || candidate.blueprint.risk <= 0.25) return RiskProfile.SAFE;
  return RiskProfile.NORMAL;
}

export function generateShotCandidates(context, quality) {
  const phase = phaseFor(context, quality);
  const state = deriveState(context, quality, phase);
  const objective = objectiveFor(state);
  const pattern = evaluatePointPattern(context, quality);
  const courtIdentity = getCourtIdentity(context?.player);
  let pool = getBlueprintsForPhase(phase);
  // A transição de fases não pode deixar um contato sem vocabulário.
  if (!pool.length) pool = getBlueprintsForPhase(ShotPhase.RALLY_NEUTRAL);
  let candidates = pool.map((bp) => scoreBlueprint(bp, state, context, quality, objective, pattern, courtIdentity)).filter(Boolean);
  if (!candidates.length) {
    candidates = getBlueprintsForPhase(ShotPhase.RALLY_NEUTRAL)
      .filter((bp) => ['TOPSPIN_DEEP_CROSS', 'TOPSPIN_HEAVY_MIDDLE'].includes(bp.id))
      .map((bp) => scoreBlueprint(bp, state, context, quality, 'RESET', pattern, courtIdentity)).filter(Boolean);
  }
  return Object.freeze({ phase, objective, state, candidates, pattern });
}

export function decideConcreteShot(context, quality) {
  const generated = generateShotCandidates(context, quality);
  const selection = selectCandidate(generated.candidates, generated.state);
  const selected = selection.chosen;
  const bp = selected.blueprint;
  const target = chooseTarget(context, quality, {
    family: bp.family, intent: bp.intent, direction: bp.direction, depth: bp.depth, width: bp.width,
    blueprintId: bp.id, lockTargetShape: true, allowWrongFoot: bp.allowWrongFoot,
    finishMode: bp.finishMode, buildMode: bp.buildMode, sliceProfile: bp.sliceProfile,
  });
  const finalDirection = target?.direction ?? bp.direction;
  const identity = selected.identity ?? {};
  const approachFit = bp.intent === ShotIntent.APPROACH
    ? clamp(selected.capability * 0.56 + selected.feasibility * 0.44, 0, 1)
    : 0;
  const decision = Object.freeze({
    family: bp.family, type: bp.family, intent: bp.intent, direction: finalDirection, target,
    blueprintId: bp.id, blueprintLabel: bp.label, shotBlueprint: bp,
    trajectoryProfile: bp.trajectory, predictedOutcome: selected.prediction,
    wrongFoot: target?.wrongFoot ?? null, buildMode: bp.buildMode, finishMode: bp.finishMode,
    sliceProfile: bp.sliceProfile, touchRescue: false,
    approachMode: bp.intent === ShotIntent.APPROACH ? (bp.family === ShotFamily.SLICE ? 'chip' : 'drive') : null,
    approachFit,
    approachIntent: approachFit,
    _approachFit: approachFit,
    _approachIntent: approachFit,
    styleSubType: generated.state.style.archetype, finishProfile: generated.state.style,
    tacticalPlan: Object.freeze({ type: generated.objective, confidence: +selected.objectiveFit.toFixed(3), blueprintId: bp.id }),
    rallyMission: Object.freeze({ type: generated.objective, stage: generated.phase, confidence: +selected.objectiveFit.toFixed(3), contacts: generated.state.rally }),
    rallyConstruction: Object.freeze({ stage: generated.pattern.activePattern, confidence: generated.pattern.confidence, reason: 'observed_rally_pattern', blueprintId: bp.id }),
    opportunityEV: Object.freeze({ rallyState: generated.phase, recommendedIntent: bp.intent, reasons: [`objective:${generated.objective}`, `blueprint:${bp.id}`], flags: {} }),
    courtIdentity: Object.freeze({
      favoritePlayHit: identity.favoritePlayHit ?? null, instinctTriggered: identity.instinctTriggered ?? null,
      blindSpotTriggered: identity.blindSpotTriggered ?? null, labels: identity.labels ?? [],
      scoreDelta: +selected.components.identityScore.toFixed(3), riskAdd: +(identity.riskAdd ?? 0).toFixed(3),
    }),
    coaching: Object.freeze({ planInfluence: null, trustModifier: 0, tacticalFocusHit: null, frictionPenalty: 0, scoreDelta: 0, riskAdd: 0 }),
    candidateScores: Object.freeze(selection.ranked.slice(0, 12).map((candidate) => Object.freeze({
      blueprintId: candidate.blueprint.id, label: candidate.blueprint.label, family: candidate.blueprint.family,
      intent: candidate.blueprint.intent, score: +candidate.score.toFixed(3), feasibility: +candidate.feasibility.toFixed(3),
      capability: +candidate.capability.toFixed(3), expectedPointValue: candidate.prediction.expectedPointValue,
      errorChance: candidate.prediction.ownErrorChance, winnerChance: candidate.prediction.winnerChance,
      ...candidate.components, finalScore: +candidate.score.toFixed(3),
      selected: candidate.blueprint.id === bp.id,
    }))),
    activePattern: generated.pattern.activePattern,
    patternConfidence: generated.pattern.confidence,
    opponentReadState: Object.freeze({ dropAwareness: selected.awareness }),
    selectionMode: selection.mode,
    tacticalDirection: Object.freeze({ direction: finalDirection, baseDirection: bp.direction, source: 'blueprint' }),
    risk: riskProfile(selected, generated.state), score: selected.score,
    reason: `brain=v2; phase=${generated.phase}; objective=${generated.objective}; blueprint=${bp.id}; ev=${selected.prediction.expectedPointValue}; error=${selected.prediction.ownErrorChance}; winner=${selected.prediction.winnerChance}; select=${selection.mode}`,
  });
  return applySignatureMoveToDecision(context, quality, decision);
}
