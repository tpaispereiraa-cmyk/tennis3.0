import { clamp, rand } from '../../core/math.js';
import { BodyState, ShotFamily } from './ShotTypes.js';

// Assinaturas são execuções de elite de um golpe que já existe no motor. Elas
// nunca liberam uma opção impossível: só refinam voo, rotação ou colocação
// quando o cérebro já escolheu a família certa e o corpo está pronto.
const MOVES = Object.freeze({
  FH_TOPSPIN_CROSS: { label: 'Cruzado de Assinatura', emoji: '🌀', blueprints: ['TOPSPIN_DEEP_CROSS', 'BANANA_CURVE'], minQ: .64, minReady: .50, chance: .27, trajectory: { powerAdd: .65, topspinMult: 1.14, curveSpin: .16 }, staminaCost: .10 },
  FH_FLAT_BOMB: { label: 'Forehand Demolidor', emoji: '💥', blueprints: ['FLAT_CROSS_DRIVE', 'FLAT_OPEN_COURT', 'FLAT_INSIDE_IN'], minQ: .67, minReady: .55, chance: .24, trajectory: { powerAdd: 1.05, topspinMult: 1.04, netClearanceAdd: -.025 }, staminaCost: .16 },
  FH_SHORT_ANGLE: { label: 'Ângulo Impossível', emoji: '🎯', blueprints: ['TOPSPIN_SHORT_ANGLE'], minQ: .65, minReady: .55, chance: .27, trajectory: { topspinMult: 1.12, curveSpin: .20, netClearanceAdd: .04 }, staminaCost: .12 },
  BH_TOPSPIN_CROSS: { label: 'Backhand Cruzado Pesado', emoji: '🔁', blueprints: ['TOPSPIN_DEEP_CROSS', 'TOPSPIN_PASS_CROSS', 'BANANA_CURVE'], minQ: .63, minReady: .48, chance: .25, trajectory: { powerAdd: .45, topspinMult: 1.16, curveSpin: .12 }, staminaCost: .11 },
  BH_SLICE_DEEP: { label: 'Slice de Navalha', emoji: '🗡️', blueprints: ['SLICE_DEEP_KNIFE', 'SLICE_SHORT_POISON'], minQ: .59, minReady: .42, chance: .29, trajectory: { backspinMult: 1.20, curveSpin: .12, netClearanceAdd: -.02 }, staminaCost: .08 },
  DROP_HIDDEN: { label: 'Curtinha Invisível', emoji: '🪶', blueprints: ['DROP_DISGUISED_CROSS', 'DROP_STRAIGHT_DEAD'], minQ: .70, minReady: .62, chance: .24, trajectory: { backspinMult: 1.15, powerAdd: -.35, netClearanceAdd: .035 }, staminaCost: .08 },
  VOLLEY_PUNCH: { label: 'Voleio de Fechamento', emoji: '⚡', blueprints: ['VOLLEY_PUNCH_DEEP', 'VOLLEY_ANGLE'], minQ: .62, minReady: .45, chance: .25, trajectory: { powerAdd: .70, netClearanceAdd: -.025 }, staminaCost: .12 },
  LOB_DEFENSIVE_PRECISE: { label: 'Lob Milimétrico', emoji: '🎈', blueprints: ['LOB_DEFENSIVE_DEEP', 'LOB_TOPSPIN_PASS'], minQ: .58, minReady: .38, chance: .23, trajectory: { topspinMult: 1.10, netClearanceAdd: .18 }, staminaCost: .09 },
  SERVE_FLAT_BOMB: { label: 'Saque Bomba', emoji: '🚀', serveFamily: ShotFamily.SERVE_FLAT, minQ: .67, chance: .22, serve: { powerAdd: 1.65, netClearanceAdd: -.025 }, staminaCost: .14 },
  SERVE_SLICE_WIDE: { label: 'Slice Aberto', emoji: '🌪️', serveFamily: ShotFamily.SERVE_SLICE, minQ: .65, chance: .25, serve: { spinZMult: 1.18, netClearanceAdd: .02 }, staminaCost: .10 },
  SERVE_KICK_HIGH: { label: 'Kick Alto', emoji: '⬆️', serveFamily: ShotFamily.SERVE_KICK, minQ: .64, chance: .24, serve: { spinXMult: 1.16, netClearanceAdd: .06 }, staminaCost: .11 },
});

const BAD_BODY = new Set([BodyState.STRETCHED, BodyState.LATE, BodyState.FALLING_BACK, BodyState.LOW_PICKUP]);

function gameKey(gs) {
  return `${gs?.players?.[0]?.sets ?? 0}:${gs?.players?.[1]?.sets ?? 0}:${gs?.players?.[0]?.games ?? 0}:${gs?.players?.[1]?.games ?? 0}`;
}

function eligible(player, move, quality, gs) {
  if (!move || !player || (player.stamina ?? 1) < .28) return false;
  if (player.ctx?._signatureMoveGameKey === gameKey(gs)) return false;
  if ((quality?.quality ?? 0) < move.minQ || BAD_BODY.has(quality?.bodyState)) return false;
  if ((quality?.contactReadiness ?? quality?.readiness ?? 1) < (move.minReady ?? 0)) return false;
  return true;
}

function activationChance(player, move) {
  const mentality = clamp((player?.attrs?.mentalidade ?? 65) / 100, 0, 1);
  const consistency = clamp((player?.attrs?.regularidade ?? 65) / 100, 0, 1);
  return clamp(move.chance + (mentality - .55) * .09 + (consistency - .55) * .07, .16, .36);
}

function consume(player, gs) {
  if (player?.ctx) player.ctx._signatureMoveGameKey = gameKey(gs);
}

function mergeTrajectory(base = {}, extra = {}) {
  return {
    ...base,
    ...extra,
    powerAdd: (base.powerAdd ?? 0) + (extra.powerAdd ?? 0),
    topspinMult: (base.topspinMult ?? 1) * (extra.topspinMult ?? 1),
    backspinMult: (base.backspinMult ?? 1) * (extra.backspinMult ?? 1),
    curveSpin: (base.curveSpin ?? 0) + (extra.curveSpin ?? 0),
    netClearanceAdd: (base.netClearanceAdd ?? 0) + (extra.netClearanceAdd ?? 0),
  };
}

export function applySignatureMoveToDecision(context, quality, decision) {
  const player = context?.player;
  const move = MOVES[player?.naturalSignature];
  const contact = { ...quality, contactReadiness: context?.body?.contactReadiness ?? quality?.contactReadiness };
  if (!move?.blueprints?.includes(decision?.blueprintId) || !eligible(player, move, contact, context?.gs)) return decision;
  if (rand(0, 1) > activationChance(player, move)) return decision;
  consume(player, context?.gs);
  const signatureMove = Object.freeze({ id: player.naturalSignature, label: move.label, emoji: move.emoji, staminaCost: move.staminaCost, source: 'naturalSignature' });
  return Object.freeze({
    ...decision,
    trajectoryProfile: Object.freeze(mergeTrajectory(decision.trajectoryProfile, move.trajectory)),
    signatureMove,
  });
}

export function applySignatureMoveToServe(plan, server, gs) {
  const move = MOVES[server?.naturalSignature];
  if (!move?.serve || move.serveFamily !== plan?.family || !plan?.isFirst || !eligible(server, move, { quality: plan.quality }, gs)) return plan;
  if (rand(0, 1) > activationChance(server, move)) return plan;
  consume(server, gs);
  const fx = move.serve;
  const signatureMove = Object.freeze({ id: server.naturalSignature, label: move.label, emoji: move.emoji, staminaCost: move.staminaCost, source: 'naturalSignature' });
  return Object.freeze({
    ...plan,
    power: plan.power + (fx.powerAdd ?? 0),
    netClearance: plan.netClearance + (fx.netClearanceAdd ?? 0),
    actualSpinX: plan.actualSpinX * (fx.spinXMult ?? 1),
    actualSpinZ: plan.actualSpinZ * (fx.spinZMult ?? 1),
    signatureMove,
    reason: `${plan.reason}; signatureMove=${move.id}`,
  });
}

export function getSignatureMove(id) {
  return MOVES[id] ?? null;
}
