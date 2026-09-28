import { CASE_PHASES, caseId, seededInt, weightedSeededPick, clamp, seededUnit } from './ShockTypes.js';
import { chooseMoralResponse, applyMoralDecision } from './MoralCore.js';
import { publicShockEvent } from './ShockNarrative.js';

export function openShockCase(definition, actor, year, context = {}, seed = '') {
  const id = caseId(definition.id, year, actor?.id, context);
  const truth = weightedSeededPick(definition.truths ?? [], `${seed}:${id}:truth`) ?? definition.truths?.[0];
  const phase = definition.immediatePublic ? CASE_PHASES.PUBLIC_BREAK : CASE_PHASES.PRIVATE_SIGNAL;
  const caseState = {
    id, type: definition.id, family: definition.family, scope: definition.scope, scale: definition.scale,
    openedYear: year, openedSlot: context.slot ?? context.tournament?.week ?? 0,
    phase, phaseTicks: seededInt(definition.duration?.[0] ?? 3, definition.duration?.[1] ?? 7, seed, id, 'duration'),
    truth, evidenceStrength: clamp(12 + (truth?.severity ?? 40) * .18 + seededUnit(seed, id, 'evidence') * 22),
    publicConfidence: definition.immediatePublic ? 32 : 0,
    response: null, verdict: null, appealEligible: false, effects: {}, history: [{ phase, year, slot: context.slot ?? 0 }],
  };
  return { caseState, events: definition.immediatePublic ? [publicShockEvent(caseState, actor, CASE_PHASES.PUBLIC_BREAK, null, { year })] : [] };
}

function resolveVerdict(c, seed) {
  const culpability = Number(c.truth?.culpability ?? 0);
  const response = c.response?.id;
  const responseDelta = response === 'COOPERATE' || response === 'DISCLOSE' ? 9 : response === 'CONCEAL' ? -10 : 0;
  const proof = clamp(c.evidenceStrength + responseDelta);
  if (culpability <= 8 && proof < 66) return 'CLEARED';
  if (culpability < 28) return proof > 70 ? 'PROCEDURAL_BREACH' : seededUnit(seed, c.id, 'verdict') > .24 ? 'CLEARED' : 'INCONCLUSIVE';
  if (culpability < 55) return proof > 45 ? 'NEGLIGENCE' : 'INCONCLUSIVE';
  return proof + culpability * .35 >= 68 ? 'GUILTY' : 'INCONCLUSIVE';
}

export function advanceShockCase(rawCase, rawPlayer, context = {}) {
  let c = { ...rawCase, history: [...(rawCase.history ?? [])] };
  let player = rawPlayer;
  const events = [];
  const year = context.year ?? c.openedYear;
  if (c.phase === CASE_PHASES.CLOSED) return { caseState: c, player, events };
  c.phaseTicks = Math.max(0, Number(c.phaseTicks ?? 1) - 1);
  if (c.phaseTicks > 0) return { caseState: c, player, events };

  let next = CASE_PHASES.AFTERMATH;
  if (c.phase === CASE_PHASES.PRIVATE_SIGNAL) next = CASE_PHASES.PUBLIC_BREAK;
  else if (c.phase === CASE_PHASES.PUBLIC_BREAK) next = CASE_PHASES.RESPONSE;
  else if (c.phase === CASE_PHASES.RESPONSE) next = c.family === 'INTEGRITY' ? CASE_PHASES.INVESTIGATION : CASE_PHASES.AFTERMATH;
  else if (c.phase === CASE_PHASES.INVESTIGATION) next = CASE_PHASES.VERDICT;
  else if (c.phase === CASE_PHASES.VERDICT) next = c.appealEligible ? CASE_PHASES.APPEAL : CASE_PHASES.RETURN;
  else if (c.phase === CASE_PHASES.APPEAL) next = CASE_PHASES.RETURN;
  else if (c.phase === CASE_PHASES.RETURN) next = CASE_PHASES.AFTERMATH;
  else if (c.phase === CASE_PHASES.AFTERMATH) next = CASE_PHASES.CLOSED;

  c.phase = next;
  c.phaseTicks = next === CASE_PHASES.INVESTIGATION ? seededInt(2, 5, c.id, year, 'investigation') : next === CASE_PHASES.AFTERMATH ? 3 : 1;
  c.publicConfidence = clamp(c.publicConfidence + (next === CASE_PHASES.INVESTIGATION ? 18 : 10));
  if (next === CASE_PHASES.RESPONSE) {
    c.response = player
      ? chooseMoralResponse(player, c, context)
      : { id: 'INSTITUTIONAL_RESPONSE', scores: {}, fear: 0 };
    if (player) player = applyMoralDecision(player, c, c.response, year);
  }
  if (next === CASE_PHASES.INVESTIGATION) c.evidenceStrength = clamp(c.evidenceStrength + seededInt(12, 34, c.id, year, 'discovery'));
  if (next === CASE_PHASES.VERDICT) {
    c.verdict = resolveVerdict(c, context.seed ?? 'shock');
    c.appealEligible = ['GUILTY', 'NEGLIGENCE'].includes(c.verdict) && seededUnit(c.id, year, 'appeal') < .62;
  }
  if (next === CASE_PHASES.APPEAL && seededUnit(c.id, year, 'appeal-result') < .18) c.verdict = c.verdict === 'GUILTY' ? 'NEGLIGENCE' : 'PROCEDURAL_BREACH';
  c.history.push({ phase: next, year, slot: context.slot ?? 0, outcome: c.verdict ?? null });
  if ([CASE_PHASES.PUBLIC_BREAK, CASE_PHASES.RESPONSE, CASE_PHASES.VERDICT, CASE_PHASES.RETURN].includes(next)) {
    const sponsorSeverity = next === CASE_PHASES.VERDICT
      ? (c.verdict === 'GUILTY' ? .95 : c.verdict === 'NEGLIGENCE' ? .68 : c.verdict === 'PROCEDURAL_BREACH' ? .35 : 0)
      : 0;
    events.push(publicShockEvent(c, player, next, c.verdict, { year, response: next === CASE_PHASES.RESPONSE ? c.response?.id : undefined, sponsorSeverity }));
  }
  return { caseState: c, player, events };
}
