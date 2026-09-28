import { clamp } from '../../core/math.js';
import { PLAYER_CFG } from '../../core/constants.js';
import { getCourtIdentity } from '../../domain/players/PlayerCourtIdentity.js';

export const FootworkStance = Object.freeze({
  OPEN: 'OPEN',
  SEMI_OPEN: 'SEMI_OPEN',
  NEUTRAL: 'NEUTRAL',
  CLOSED: 'CLOSED',
  EMERGENCY: 'EMERGENCY',
});

function attr(player, key, fallback = 60) {
  return Number.isFinite(player?.attrs?.[key]) ? player.attrs[key] : fallback;
}

function isLeftHanded(player) {
  const hand = String(player?.handedness ?? player?.dominantHand ?? player?.maoDominante ?? 'right').toLowerCase();
  return hand === 'left' || hand === 'l' || hand === 'canhoto' || hand === 'esquerda';
}

function incomingKey(gs) {
  return `${gs?.ball?.lastHitBy ?? -1}:${gs?.rally ?? 0}`;
}

function chooseNaturalWing(player, point) {
  const handSign = isLeftHanded(player) ? -1 : 1;
  const delta = (point?.x ?? 0) - (player?.pos?.x ?? 0);
  if (Math.abs(delta) < 0.18) {
    const fh = attr(player, 'fhControle') + attr(player, 'fhPotencia');
    const bh = attr(player, 'bhControle') + attr(player, 'bhPotencia');
    return fh >= bh ? 'FOREHAND' : 'BACKHAND';
  }
  return delta * handSign > 0 ? 'FOREHAND' : 'BACKHAND';
}

function chooseWing(player, point, availableTime, naturalWing = chooseNaturalWing(player, point)) {
  const handSign = isLeftHanded(player) ? -1 : 1;
  const delta = (point?.x ?? 0) - (player?.pos?.x ?? 0);
  const fhStrength = attr(player, 'fhControle') * 0.48 + attr(player, 'fhPotencia') * 0.52;
  const bhStrength = attr(player, 'bhControle') * 0.52 + attr(player, 'bhPotencia') * 0.48;
  const slightBackhandSide = delta * handSign < -0.18 && delta * handSign > -0.78;
  const canRunAround = naturalWing === 'BACKHAND'
    && slightBackhandSide
    && availableTime >= 0.43
    && fhStrength - bhStrength >= clamp(12 - getCourtIdentity(player).movement.forehandRunaroundBias * 35, 7, 17)
    && (player?.stamina ?? 1) >= 0.34;
  return canRunAround ? 'FOREHAND_RUNAROUND' : naturalWing;
}

function chooseStance({ wing, lateralDistance, availableTime, phase, player }) {
  // availableTime já desconta o deslocamento bruto. Margem pequena ainda
  // permite base aberta; emergência é apenas janela fisicamente negativa.
  const emergency = availableTime < -0.04 || phase === 'CONTACT_EMERGENCY';
  if (emergency) return FootworkStance.EMERGENCY;
  if (lateralDistance > 1.65 || phase === 'FORWARD_PICKUP' || phase === 'PEAK_WAIT') return FootworkStance.OPEN;
  if (wing === 'FOREHAND_RUNAROUND') return FootworkStance.SEMI_OPEN;
  if (wing === 'FOREHAND') return availableTime >= 0.48 ? FootworkStance.SEMI_OPEN : FootworkStance.OPEN;
  const balance = attr(player, 'equilibrio', 60);
  return availableTime >= 0.52 && balance >= 62 ? FootworkStance.CLOSED : FootworkStance.NEUTRAL;
}

export function planContactFootwork({ player, gs, point, phase = 'TRAVEL', profile = null, persist = true } = {}) {
  if (!player || !point || !gs?.ball) return null;
  const protectedPhase = ['NET_CUT', 'OVERHEAD_CUT', 'LOB_RETREAT', 'RUNBACK'].includes(phase);
  if (protectedPhase || player?.atNet || player?.ctx?.courtMode === 'NET') return null;

  const distance = Math.hypot((point.x ?? 0) - (player.pos?.x ?? 0), (point.y ?? 0) - (player.pos?.y ?? 0));
  const speed = Math.max(2.4, player?.playerSpeed ?? PLAYER_CFG.speed);
  const availableTime = Math.max(0, (point.t ?? 0.28) - distance / speed);
  const key = incomingKey(gs);
  const previous = persist && player._footworkPlan?.key === key ? player._footworkPlan : null;
  const naturalWing = previous?.naturalWing ?? chooseNaturalWing(player, point);
  const wing = previous?.wing ?? chooseWing(player, point, availableTime, naturalWing);
  const stance = chooseStance({ wing, lateralDistance: Math.abs((point.x ?? 0) - (player.pos?.x ?? 0)), availableTime, phase, player });
  const control = clamp(attr(player, wing.startsWith('FOREHAND') ? 'fhControle' : 'bhControle') / 100, 0, 1);
  const baseReach = player?.reach ?? PLAYER_CFG.reach;
  const spacingMult = stance === FootworkStance.EMERGENCY ? 0.70
    : stance === FootworkStance.OPEN ? 0.82
      : stance === FootworkStance.SEMI_OPEN ? 0.86
        : stance === FootworkStance.CLOSED ? 0.90
          : 0.86;
  const idealContactRadius = clamp(baseReach * spacingMult + (control - 0.5) * 0.055, baseReach * 0.68, baseReach * 0.94);
  const handSign = isLeftHanded(player) ? -1 : 1;
  const wingSign = wing.startsWith('FOREHAND') ? handSign : -handSign;
  const runAroundExtra = wing === 'FOREHAND_RUNAROUND' ? 0.13 : 0;
  const lateralOffset = wingSign * (idealContactRadius + runAroundExtra);
  const side = player?.side > 0 ? 1 : -1;
  const existingBehind = Math.abs((point.y ?? 0) - (gs.ball?.pos?.y ?? point.y));
  const stanceDepth = stance === FootworkStance.CLOSED ? 0.18
    : stance === FootworkStance.NEUTRAL ? 0.15
      : stance === FootworkStance.EMERGENCY ? 0.04
        : 0.10;
  const addBehind = Math.max(0, stanceDepth - existingBehind);
  const bodyTarget = {
    x: (point.x ?? 0) - lateralOffset,
    y: (point.y ?? 0) + side * addBehind,
    z: point.z,
    t: point.t,
  };
  const preparationQuality = clamp(
    availableTime * 1.45
      + control * 0.30
      + clamp(attr(player, 'equilibrio', 60) / 100, 0, 1) * 0.22
      - (stance === FootworkStance.EMERGENCY ? 0.32 : 0),
    0,
    1,
  );
  // O compromisso cresce conforme a janela fecha. Ele não é uma punição por
  // si só: apenas determina quanto custa abandonar a ala já carregada.
  const timeCommitment = 1 - clamp(availableTime / 0.72, 0, 1);
  const bodyCommitment = clamp(
    timeCommitment * 0.52
      + preparationQuality * 0.30
      + (stance === FootworkStance.CLOSED ? 0.10 : stance === FootworkStance.SEMI_OPEN ? 0.06 : 0)
      + (wing === 'FOREHAND_RUNAROUND' ? 0.08 : 0),
    0,
    1,
  );
  const stanceLoad = stance === FootworkStance.CLOSED ? 0.96
    : stance === FootworkStance.NEUTRAL ? 0.92
      : stance === FootworkStance.SEMI_OPEN ? 0.88
        : stance === FootworkStance.OPEN ? 0.82
          : 0.38;
  const weightTransferPotential = clamp(
    stanceLoad * 0.42 + preparationQuality * 0.38 + control * 0.20,
    0,
    1,
  );
  const plan = {
    version: 'footwork-plan-v2',
    key,
    naturalWing,
    wing,
    stance,
    bodyTarget,
    idealContactRadius: +idealContactRadius.toFixed(3),
    availableTime: +availableTime.toFixed(3),
    preparationQuality: +preparationQuality.toFixed(3),
    bodyCommitment: +bodyCommitment.toFixed(3),
    stanceLoad: +stanceLoad.toFixed(3),
    weightTransferPotential: +weightTransferPotential.toFixed(3),
    runAround: wing === 'FOREHAND_RUNAROUND',
    preferredContactZ: profile?.preferredContactZ ?? null,
    reason: wing === 'FOREHAND_RUNAROUND'
      ? 'run_around_backhand_for_weapon'
      : stance === FootworkStance.EMERGENCY
        ? 'survival_base'
        : stance === FootworkStance.OPEN
          ? 'open_base_for_lateral_or_early_contact'
          : 'set_base_for_clean_contact',
  };
  if (persist) player._footworkPlan = plan;
  return plan;
}

export function resetFootworkPlan(player) {
  if (player) player._footworkPlan = null;
}
