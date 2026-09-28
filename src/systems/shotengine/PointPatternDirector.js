import { clamp } from '../../core/math.js';
import { getCourtIdentity } from '../../domain/players/PlayerCourtIdentity.js';
import { evaluateRallyConstruction } from './RallyConstruction.js';

// Observes the rally; the tactical brain alone chooses among viable blueprints.
export function evaluatePointPattern(context, quality) {
  const construction = evaluateRallyConstruction(context, quality);
  const identity = getCourtIdentity(context?.player);
  const shots = (context?.memory?.shots ?? context?.player?.ctx?.shotMemory?.shots ?? []).filter(shot => !shot.serve);
  const last = shots.at(-1);
  const opponentDeep = Math.abs(context?.opponent?.pos?.y ?? 0) >= 9.2;
  const lastDeep = Math.abs(last?.targetY ?? 0) >= 9.05 && (last?.quality ?? 0) >= 0.5;
  const clean = construction.clean && (quality?.quality ?? 0) >= 0.56;
  const favorites = identity.construction.favoritePatterns;
  let activePattern = construction.stage;
  let confidence = construction.confidence * 0.55;
  if (clean && opponentDeep && lastDeep && favorites.includes('DEPTH_TO_DROP')) {
    activePattern = 'DEPTH_TO_DROP';
    confidence = clamp(0.42 + construction.confidence * 0.36, 0, 0.78);
  } else if (clean && favorites.includes('SETUP_FOREHAND') && construction.stage !== 'READ') {
    activePattern = 'SETUP_FOREHAND';
    confidence = clamp(0.32 + construction.confidence * 0.32, 0, 0.65);
  } else if (clean && favorites.includes('SETUP_NET') && Math.abs(context?.ballState?.pos?.y ?? 99) < 8.6) {
    activePattern = 'SETUP_NET';
    confidence = clamp(0.28 + construction.confidence * 0.3, 0, 0.6);
  }
  if (!clean) { activePattern = 'RESET'; confidence = 0.7; }
  return Object.freeze({ activePattern, confidence, construction, opponentDeep, lastDeep, clean });
}

export function pointPatternScore(pattern, blueprint) {
  if (!pattern) return 0;
  const { activePattern, confidence, construction } = pattern;
  let bias = (construction.familyBias?.[blueprint.family] ?? 0) * 0.35;
  if (construction.recommendedDirection === blueprint.direction) bias += 0.025 * confidence;
  if (activePattern === 'DEPTH_TO_DROP') {
    if (blueprint.family === 'DROP') bias += 0.09 * confidence;
    if (blueprint.tags.includes('short_angle') || blueprint.id === 'SLICE_SHORT_POISON') bias += 0.07 * confidence;
    if (blueprint.tags.includes('push_back')) bias += 0.025 * confidence;
  } else if (activePattern === 'SETUP_FOREHAND' && blueprint.tags.includes('runaround')) bias += 0.065 * confidence;
  else if (activePattern === 'SETUP_NET' && blueprint.intent === 'APPROACH') bias += 0.08 * confidence;
  else if (activePattern === 'RESET' && ['RESET', 'CONTROL', 'DEFEND'].includes(blueprint.intent)) bias += 0.05;
  return clamp(bias, -0.08, 0.12);
}
