import { clamp } from '../../core/math.js';
import { ShotDirection, ShotFamily, ShotIntent } from './ShotTypes.js';

// Diretor de rally: a decisão de golpe continua soberana, mas agora cada ponto
// ganha uma missão de 2-3 contatos. Missões não forçam uma bola impossível.
export const RallyMission = Object.freeze({
  PIN_WEAK_WING: 'PIN_WEAK_WING',
  DRAW_AND_STRIKE: 'DRAW_AND_STRIKE',
  WRONG_FOOT_TRAP: 'WRONG_FOOT_TRAP',
  DEPTH_SQUEEZE: 'DEPTH_SQUEEZE',
  PASSING_TRAP: 'PASSING_TRAP',
  NEUTRAL: 'NEUTRAL',
});

const safe = (context, quality) => (quality?.quality ?? 0.5) >= 0.52
  && (context?.body?.contactReadiness ?? 0) >= 0.40
  && (context?.body?.arrivalMargin ?? 0) >= -0.06
  && !['LOW_PICKUP', 'LATE', 'STRETCHED', 'FALLING_BACK'].includes(quality?.bodyState);

function pickMission(context, quality) {
  const directives = context?.player?._matchPlan?.directives ?? [];
  const types = new Set(directives.map(d => d.type));
  const opponent = context?.opponent ?? {};
  const oppMoving = Math.abs(context?.body?.opponentVel?.x ?? opponent?.vel?.x ?? 0) > 0.82;
  const oppAtNet = !!opponent?.atNet || opponent?.ctx?.courtMode === 'NET';
  const oppDeep = Math.abs(opponent?.pos?.y ?? 0) > 9.3;
  const q = quality?.quality ?? 0.5;
  if (oppAtNet) return RallyMission.PASSING_TRAP;
  if (oppMoving && q >= 0.60) return RallyMission.WRONG_FOOT_TRAP;
  if (types.has('ATTACK_BH') || types.has('ATTACK_FH')) return RallyMission.PIN_WEAK_WING;
  if (oppDeep && q >= 0.56) return RallyMission.DRAW_AND_STRIKE;
  if (types.has('FORCE_LONG') || (context?.score?.rally ?? 0) >= 2) return RallyMission.DEPTH_SQUEEZE;
  return RallyMission.NEUTRAL;
}

function missionTargetDirection(context, mission) {
  const opponentX = context?.opponent?.pos?.x ?? 0;
  if (mission === RallyMission.WRONG_FOOT_TRAP) return Math.abs(opponentX) > 0.45 ? ShotDirection.WIDE : ShotDirection.CROSS;
  if (mission === RallyMission.PASSING_TRAP) return Math.abs(opponentX) > 0.6 ? ShotDirection.DTL : ShotDirection.CROSS;
  if (mission === RallyMission.PIN_WEAK_WING) return opponentX >= 0 ? ShotDirection.CROSS : ShotDirection.DTL;
  if (mission === RallyMission.DRAW_AND_STRIKE) return ShotDirection.CENTER;
  if (mission === RallyMission.DEPTH_SQUEEZE) return ShotDirection.CROSS;
  return null;
}

export function getRallyMission(context, quality) {
  const player = context?.player;
  if (!player?.ctx) return { type:RallyMission.NEUTRAL, stage:'READ', confidence:0, direction:null, familyBias:{} };
  const current = player.ctx.rallyDirector;
  const canKeep = current && current.pointId === context?.gs?._currentPointId && current.stage !== 'ABANDONED';
  if (canKeep) return current;
  const type = pickMission(context, quality);
  const mission = {
    pointId: context?.gs?._currentPointId ?? null,
    type,
    stage: safe(context, quality) ? 'SETUP' : 'SURVIVE',
    confidence: +(safe(context, quality) ? 0.56 : 0.28).toFixed(3),
    direction: missionTargetDirection(context, type),
    familyBias: {},
    contacts: 0,
  };
  if (type === RallyMission.DRAW_AND_STRIKE) mission.familyBias = { TOPSPIN:.07, DROP:.025 };
  if (type === RallyMission.DEPTH_SQUEEZE || type === RallyMission.PIN_WEAK_WING) mission.familyBias = { TOPSPIN:.065, FLAT_DRIVE:.025 };
  if (type === RallyMission.WRONG_FOOT_TRAP) mission.familyBias = { FLAT_DRIVE:.075, TOPSPIN:.04 };
  if (type === RallyMission.PASSING_TRAP) mission.familyBias = { FLAT_DRIVE:.06, LOB:.07 };
  player.ctx.rallyDirector = mission;
  return mission;
}

export function missionFamilyBias(mission, family) {
  if (!mission || mission.stage === 'SURVIVE' || mission.stage === 'ABANDONED') return 0;
  return mission.familyBias?.[family] ?? 0;
}

export function missionDirectionBias(mission, direction, intent) {
  if (!mission || mission.stage === 'SURVIVE' || mission.stage === 'ABANDONED') return 0;
  if (mission.direction !== direction) return 0;
  return (intent === ShotIntent.PRESSURE || intent === ShotIntent.REDIRECT || intent === ShotIntent.FINISH ? 0.20 : 0.12) * (mission.confidence ?? 0.5);
}

export function guideMissionIntent(mission, intent, context, quality) {
  if (!mission || !safe(context, quality)) return intent;
  if (mission.stage === 'SETUP' && [RallyMission.PIN_WEAK_WING, RallyMission.DEPTH_SQUEEZE, RallyMission.DRAW_AND_STRIKE].includes(mission.type) && intent === ShotIntent.RESET) return ShotIntent.BUILD;
  if (mission.stage === 'STRIKE' && intent === ShotIntent.BUILD) return ShotIntent.PRESSURE;
  return intent;
}

export function advanceRallyMission({ player, decision, quality, execution } = {}) {
  const mission = player?.ctx?.rallyDirector;
  if (!mission || !decision) return mission;
  mission.contacts = (mission.contacts ?? 0) + 1;
  const q = quality?.quality ?? 0.5;
  const depth = Math.abs(execution?.targetY ?? 0);
  const aggressive = [ShotIntent.PRESSURE, ShotIntent.REDIRECT, ShotIntent.FINISH, ShotIntent.PASS].includes(decision.intent);
  if (q < 0.44 || ['LATE','STRETCHED','LOW_PICKUP'].includes(quality?.bodyState)) { mission.stage='SURVIVE'; mission.confidence=+clamp((mission.confidence??.5)*.72,0,.8).toFixed(3); return mission; }
  if (mission.stage === 'SURVIVE' && q >= .62) mission.stage = 'SETUP';
  else if (mission.stage === 'SETUP' && (depth >= 9.15 || decision.intent === ShotIntent.BUILD || decision.intent === ShotIntent.CONTROL)) mission.stage = mission.type === RallyMission.DRAW_AND_STRIKE ? 'DRAW' : 'OPEN';
  else if ((mission.stage === 'OPEN' || mission.stage === 'DRAW') && (aggressive || mission.contacts >= 3)) mission.stage='STRIKE';
  else if (mission.stage === 'STRIKE' && aggressive) mission.stage='CASH_OUT';
  mission.confidence=+clamp((mission.confidence??.5)+(q-.5)*.14+(aggressive ? .03 : 0),.18,.96).toFixed(3);
  return mission;
}
