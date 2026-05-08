import { COURT } from '../../core/constants.js';
import { clamp, mag3, rand } from '../../core/math.js';
import { buildShotContext } from './ShotContext.js';
import { ShotDirection, ShotFamily, ShotIntent, RiskProfile } from './ShotTypes.js';
import { buildShotDebugPayload, explainShotDecision } from './ShotDebug.js';
import { rememberShot } from './ShotMemory.js';
import { SHOT_TUNING } from './ShotTuning.js';
import { buildShotEngineSnapshot } from './ShotDiagnostics.js';

function recentServeSpam(gs, family, direction) {
  const history = gs?._servePatternHistory ?? [];
  const recent = history.slice(-3);
  const sameFamily = recent.filter((s) => s.family === family).length;
  const sameDirection = recent.filter((s) => s.direction === direction).length;
  return sameFamily * 0.08 + sameDirection * 0.10;
}

function weightedPick(candidates) {
  const total = candidates.reduce((sum, c) => sum + Math.max(0.01, c.weight), 0);
  let roll = rand(0, total);
  for (const c of candidates) {
    roll -= Math.max(0.01, c.weight);
    if (roll <= 0) return c.value;
  }
  return candidates[candidates.length - 1]?.value;
}

function chooseServeFamily(caps, isFirstServe, prefs = {}, gs = null) {
  const flat = caps.servePower * 0.48 + caps.servePrecision * 0.22 + caps.aggression * 0.30;
  const slice = caps.servePrecision * 0.36 + caps.slice * 0.36 + caps.tacticalVision * 0.28;
  const kick = caps.servePrecision * 0.34 + caps.topspin * 0.42 + caps.consistency * 0.24;

  if (!isFirstServe) {
    const cands = [
      { value: ShotFamily.SERVE_KICK, weight: kick + (prefs.serve2Bias === 'KICK' ? 0.42 : 0) },
      { value: ShotFamily.SERVE_SLICE, weight: slice + (prefs.serve2Bias === 'SLICE' ? 0.36 : 0) },
      { value: ShotFamily.SERVE_FLAT, weight: caps.servePower > 0.82 && caps.servePrecision > 0.70 ? flat * 0.22 : 0.02 },
    ];
    for (const c of cands) c.weight -= recentServeSpam(gs, c.value, null) * 0.55;
    return weightedPick(cands);
  }
  const cands = [
    { value: ShotFamily.SERVE_FLAT, weight: flat + (prefs.serve1Bias === 'POWER' ? 0.38 : 0) },
    { value: ShotFamily.SERVE_SLICE, weight: slice + (prefs.serve1Bias === 'SHAPE' || prefs.serveProfile === 'WIDE_OPENER' ? 0.24 : 0) },
    { value: ShotFamily.SERVE_KICK, weight: kick + (prefs.serve1Bias === 'SHAPE' || prefs.serveProfile === 'KICK_BUILDER' ? 0.18 : 0) },
  ];
  for (const c of cands) c.weight -= recentServeSpam(gs, c.value, null) * 0.45;
  return weightedPick(cands);
}

function chooseServeDirection(caps, family, isFirstServe, prefs = {}, gs = null) {
  const bias = isFirstServe ? prefs.serve1Bias : prefs.serve2Bias;
  const receiver = gs?.players?.[gs?.receiver];
  const receiverX = Math.abs(receiver?.pos?.x ?? 0);
  const receiverWide = receiverX > 2.35;
  const cands = [
    { value: ShotDirection.WIDE, weight: 0.34 + (bias === 'WIDE' ? 0.42 : 0) + (family === ShotFamily.SERVE_SLICE ? 0.18 : 0) - (receiverWide ? 0.12 : 0) },
    { value: ShotDirection.BODY, weight: 0.36 + (bias === 'BODY' ? 0.42 : 0) + (family === ShotFamily.SERVE_KICK || family === ShotFamily.SERVE_FLAT ? 0.10 : 0) },
    { value: ShotDirection.CENTER, weight: 0.30 + (bias === 'T' ? 0.42 : 0) + (receiverWide ? 0.16 : 0) },
  ];
  if (!isFirstServe) {
    cands[0].weight -= 0.10;
    cands[1].weight += family === ShotFamily.SERVE_KICK ? 0.20 : 0.08;
    cands[2].weight += caps.servePrecision > 0.70 ? 0.16 : 0.08;
  }
  for (const c of cands) c.weight -= recentServeSpam(gs, family, c.value);
  return weightedPick(cands);
}

function serviceTarget(gs, server, direction) {
  const tune = SHOT_TUNING.serve;
  const boxSign = gs?.serveLeft ? 1 : -1;
  const targetY = -server.side * COURT.serviceLineY * tune.targetDepth;
  const targetX = direction === ShotDirection.WIDE
    ? boxSign * tune.targetWideX
    : direction === ShotDirection.BODY
      ? boxSign * tune.targetBodyX
      : boxSign * tune.targetCenterX;
  return { x: targetX, y: targetY, depth: 'SERVICE_BOX', width: direction };
}

function serveSpin(family, power, caps, targetX, travelYSign = -1) {
  const tune = SHOT_TUNING.serve;
  if (family === ShotFamily.SERVE_FLAT) {
    return { spinType: 0, spinX: travelYSign * Math.abs(tune.flatSpinX) * power, spinZ: 0 };
  }
  if (family === ShotFamily.SERVE_SLICE) {
    return {
      spinType: -1,
      spinX: travelYSign * power * Math.abs(tune.sliceSpinX),
      spinZ: Math.sign(targetX || 1) * power * (tune.sliceSpinZBase + caps.slice * tune.sliceSpinZAttr),
    };
  }
  return {
    spinType: 1,
    spinX: -travelYSign * power * (tune.kickSpinXBase + caps.topspin * tune.kickSpinXAttr),
    spinZ: Math.sign(targetX || 1) * power * tune.kickSpinZ,
  };
}

export function prepareServePositions(gs) {
  const server = gs.players?.[gs.server];
  const receiver = gs.players?.[gs.receiver];
  if (!server || !receiver) return;
  const tune = SHOT_TUNING.serve;
  const boxSign = gs.serveLeft ? 1 : -1;
  server.pos.x = -boxSign * tune.stanceX;
  server.pos.y = server.side * (COURT.halfL + tune.serverBackY);
  server.vel.x = 0;
  server.vel.y = 0;
  receiver.pos.x = boxSign * tune.receiverX;
  receiver.pos.y = receiver.side * (COURT.halfL + tune.receiverBackY);
  receiver.vel.x = 0;
  receiver.vel.y = 0;
}

export function planServe(gs) {
  const server = gs.players?.[gs.server];
  const receiver = gs.players?.[gs.receiver];
  const isFirstServe = (server?.faults ?? 0) === 0;
  const context = buildShotContext({ gs, player: server, opponent: receiver });
  const caps = context.capabilities;
  const prefs = context.prefs ?? {};
  const family = chooseServeFamily(caps, isFirstServe, prefs, gs);
  const direction = chooseServeDirection(caps, family, isFirstServe, prefs, gs);
  const target = serviceTarget(gs, server, direction);
  const tune = SHOT_TUNING.serve;
  const risk = isFirstServe && family === ShotFamily.SERVE_FLAT ? RiskProfile.AGGRESSIVE : RiskProfile.NORMAL;
  const q = clamp(caps.servePrecision * tune.qualityPrecision + caps.servePower * tune.qualityPower + caps.mentality * tune.qualityMentality + caps.stamina * tune.qualityStamina, 0, 1);
  const familyPace = family === ShotFamily.SERVE_FLAT ? tune.flatPace : family === ShotFamily.SERVE_SLICE ? tune.slicePace : tune.kickPace;
  const firstServeBoost = isFirstServe ? tune.firstServeBoost : tune.secondServeBoost;
  const power = clamp(tune.powerBase + caps.servePower * tune.powerAttr * familyPace * firstServeBoost + q * tune.qualityPowerBonus, tune.minPower, isFirstServe ? tune.firstMaxPower : tune.secondMaxPower);
  const travelYSign = Math.sign(target.y - server.pos.y) || -server.side || -1;
  const spin = serveSpin(family, power, caps, target.x, travelYSign);

  return Object.freeze({
    family,
    type: family,
    intent: isFirstServe ? ShotIntent.PRESSURE : ShotIntent.BUILD,
    direction,
    target,
    risk,
    quality: q,
    score: q,
    isFirst: isFirstServe,
    power,
    hitHeight: tune.hitHeight,
    netClearance: family === ShotFamily.SERVE_KICK ? tune.kickNetClearance : family === ShotFamily.SERVE_SLICE ? tune.sliceNetClearance : tune.flatNetClearance,
    spinType: spin.spinType,
    actualSpinX: spin.spinX,
    actualSpinZ: spin.spinZ,
    context,
    reason: `serve=${isFirstServe ? 'first' : 'second'}; family=${family}; dir=${direction}`,
  });
}

export function executeServe({ gs, launchBall }) {
  const server = gs.players?.[gs.server];
  if (!server || !gs.ball) return null;
  prepareServePositions(gs);
  const plan = planServe(gs);
  gs.ball.pos.x = server.pos.x;
  gs.ball.pos.y = server.pos.y;
  launchBall(
    gs.ball,
    server.pos,
    plan.target.x,
    plan.target.y,
    plan.spinType,
    plan.power,
    plan.netClearance,
    plan.hitHeight,
    plan.actualSpinX,
    plan.actualSpinZ,
  );

  gs.lastServeFirst = plan.isFirst;
  gs.serveBounced = false;
  gs.receiverTouched = false;
  gs.isFirstBounce = true;
  gs._pendingServeData = {
    isFirst: plan.isFirst,
    kmh: Math.round(mag3(gs.ball.vel) * 3.6),
    physType: plan.family,
    dir: plan.direction,
    targetX: plan.target.x,
    targetY: plan.target.y,
    power: plan.power,
    spinX: plan.actualSpinX,
    spinZ: plan.actualSpinZ,
    netClearance: plan.netClearance,
    pressureHint: clamp(plan.power / (plan.isFirst ? 50 : 40) + Math.abs(plan.actualSpinZ) * 0.035 + Math.abs(plan.target.x) * 0.06, 0, 1),
    jamHint: plan.direction === ShotDirection.BODY ? 1 : plan.direction === ShotDirection.CENTER ? 0.35 : 0,
    wideHint: plan.direction === ShotDirection.WIDE ? 1 : Math.abs(plan.target.x) > 1.8 ? 0.55 : 0,
    pointNum: (gs.pointHistory?.length ?? 0) + 1,
  };
  gs._servePatternHistory = [
    ...(gs._servePatternHistory ?? []).slice(-7),
    { family: plan.family, direction: plan.direction, isFirst: plan.isFirst },
  ];

  const stats = server.stats;
  if (stats) {
    if (plan.isFirst) stats.serve1Total++;
    else stats.serve2Total++;
  }

  gs.ball.lastHitBy = server.id;
  gs.ball._serveTargetY = plan.target.y;
  gs.ball._serveExitKmh = gs._pendingServeData.kmh;
  gs.ball._servePhysType = plan.family === ShotFamily.SERVE_SLICE
    ? 'SLICE'
    : plan.family === ShotFamily.SERVE_KICK
      ? 'KICK'
      : null;
  gs.ball._lastTargetX = plan.target.x;
  gs.ball._lastTargetY = plan.target.y;
  gs.ball._lastContactX = server.pos.x;
  gs.ball._lastContactY = server.pos.y;
  gs.ball._lastShotType = plan.family;
  gs.ball.lastShotType = plan.family;
  gs.ball._lastShotMeta = {
    netClearance: plan.netClearance,
    power: plan.power,
    launchKmh: gs._pendingServeData.kmh,
    launchVel: {
      x: +(gs.ball.vel.x ?? 0).toFixed(2),
      y: +(gs.ball.vel.y ?? 0).toFixed(2),
      z: +(gs.ball.vel.z ?? 0).toFixed(2),
    },
    startZ: plan.hitHeight,
    maxZ: Math.max(plan.hitHeight ?? 0, gs.ball.pos.z ?? 0),
    spinX: plan.actualSpinX,
    spinZ: plan.actualSpinZ,
    errorRisk: 1 - plan.quality,
    serve: true,
  };

  server._lastShotEngine = buildShotDebugPayload({
    context: plan.context,
    quality: { quality: plan.quality, bodyState: 'SERVE_STANCE', canContact: true },
    decision: plan,
    notes: [explainShotDecision(plan, plan.context, { quality: plan.quality })],
  });
  server._lastShotEngineSnapshot = buildShotEngineSnapshot({
    context: plan.context,
    quality: { quality: plan.quality, bodyState: 'SERVE_STANCE', canContact: true },
    decision: plan,
    execution: {
      targetX: plan.target.x,
      targetY: plan.target.y,
      power: plan.power,
      netClearance: plan.netClearance,
      spinType: plan.spinType,
      actualSpinX: plan.actualSpinX,
      actualSpinZ: plan.actualSpinZ,
      errorRisk: 1 - plan.quality,
      dispersion: 0,
    },
  });
  rememberShot({
    player: server,
    opponent: gs.players?.[gs.receiver],
    decision: plan,
    execution: { targetX: plan.target.x, targetY: plan.target.y },
    quality: { quality: plan.quality, bodyState: 'SERVE_STANCE', canContact: true },
    context: plan.context,
    serve: true,
  });
  return plan;
}
