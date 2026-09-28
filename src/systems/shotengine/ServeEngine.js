import { COURT } from '../../core/constants.js';
import { getCourtIdentity } from '../../domain/players/PlayerCourtIdentity.js';
import { clamp, mag3, rand, weightedPickArr } from '../../core/math.js';
import { buildShotContext } from './ShotContext.js';
import { ShotDirection, ShotFamily, ShotIntent, RiskProfile } from './ShotTypes.js';
import { buildShotDebugPayload, explainShotDecision } from './ShotDebug.js';
import { rememberShot } from './ShotMemory.js';
import { SHOT_TUNING } from './ShotTuning.js';
import { buildShotEngineSnapshot } from './ShotDiagnostics.js';
import { buildServeDelivery, serveFaultChance } from './ServeExchangeEngine.js';
import { applySignatureMoveToServe } from './SignatureMoves.js';

function recentServeSpam(gs, family, direction) {
  const history = gs?._servePatternHistory ?? [];
  const recent = history.slice(-3);
  const sameFamily = recent.filter((s) => s.family === family).length;
  const sameDirection = recent.filter((s) => s.direction === direction).length;
  return sameFamily * 0.08 + sameDirection * 0.10;
}

function resolveServePrefs(server, receiver, gs, isFirstServe) {
  const base = server?.prefs ?? {};
  const identity = getCourtIdentity(server).serveIdentity;
  const directives = new Set((server?._matchPlan?.directives ?? []).map((directive) => directive.type));
  const pressurePoint = !!gs?.inTiebreak
    || (server?.score ?? 0) >= 2
    || (receiver?.score ?? 0) >= 2
    || Math.max(server?.games ?? 0, receiver?.games ?? 0) >= 3;
  let serve1Bias = base.serve1Bias;
  let serve2Bias = base.serve2Bias;
  let pressureMode = null;
  if (directives.has('SERVE_BODY')) serve1Bias = 'BODY';
  if (directives.has('SERVE_WIDE')) serve1Bias = 'WIDE';
  if (pressurePoint) {
    pressureMode = base.pressureServe ?? 'SAFE_RESET';
    if (pressureMode === 'SPOT') serve1Bias = 'T';
    else if (pressureMode === 'BODY_LOCK') serve1Bias = 'BODY';
    else if (pressureMode === 'KICK_TRUST') serve2Bias = 'KICK';
    else if (pressureMode === 'SAFE_RESET') serve2Bias = 'SAFE';
  }
  const signatures = new Set([server?.naturalSignature, server?.signatureShot, ...(server?.signatureShots ?? [])].filter(Boolean));
  const serveSignature = signatures.has('SERVE_FLAT_BOMB') || signatures.has('BIG_SERVE') || server?.signaturePattern === 'SERVE_COMMANDER' || server?.signaturePattern === 'SERVE_FH_KILL' ? 'FLAT'
    : signatures.has('SERVE_KICK_HIGH') ? 'KICK'
      : signatures.has('SERVE_SLICE_WIDE') ? 'SLICE' : null;
  return { ...base, serve1Bias, serve2Bias, _courtServeBias: identity.directionBias, _pressureMode: pressureMode, _serveSignature: serveSignature, _isFirstServe: isFirstServe };
}


export function chooseServeFamily(caps, isFirstServe, prefs = {}, gs = null) {
  const flat = caps.servePower * 0.48 + caps.servePrecision * 0.22 + caps.aggression * 0.30;
  const slice = caps.servePrecision * 0.36 + caps.slice * 0.36 + caps.tacticalVision * 0.28;
  const kick = caps.servePrecision * 0.34 + caps.topspin * 0.42 + caps.consistency * 0.24;

  if (!isFirstServe) {
    const cands = [
      { value: ShotFamily.SERVE_KICK, weight: kick + (prefs.serve2Bias === 'KICK' ? 0.42 : 0) + (prefs._serveSignature === 'KICK' ? 0.12 : 0) + (prefs._pressureMode === 'SAFE_RESET' ? 0.10 : 0) },
      { value: ShotFamily.SERVE_SLICE, weight: slice + (prefs.serve2Bias === 'SLICE' ? 0.36 : 0) + (prefs._serveSignature === 'SLICE' ? 0.10 : 0) },
      { value: ShotFamily.SERVE_FLAT, weight: (caps.servePower > 0.82 && caps.servePrecision > 0.70 ? flat * 0.22 : 0.02) + (prefs._pressureMode === 'BOLD' ? 0.12 : 0) },
    ];
    // 2° saque: kick/slice são naturalmente dominantes — pouca penalidade por repetição
    for (const c of cands) c.weight -= recentServeSpam(gs, c.value, null) * 0.32;
    return weightedPickArr(cands);
  }
  const cands = [
    { value: ShotFamily.SERVE_FLAT, weight: flat + (prefs.serve1Bias === 'POWER' ? 0.38 : 0) + (prefs._serveSignature === 'FLAT' ? 0.14 : 0) + (prefs._pressureMode === 'BOLD' ? 0.16 : 0) },
    { value: ShotFamily.SERVE_SLICE, weight: slice + (prefs.serve1Bias === 'SHAPE' || prefs.serveProfile === 'WIDE_OPENER' ? 0.24 : 0) + (prefs._serveSignature === 'SLICE' ? 0.13 : 0) },
    { value: ShotFamily.SERVE_KICK, weight: kick + (prefs.serve1Bias === 'SHAPE' || prefs.serveProfile === 'KICK_BUILDER' ? 0.18 : 0) + (prefs._serveSignature === 'KICK' ? 0.13 : 0) },
  ];
  // 1° saque: variação e surpresa são o objetivo — maior penalidade por repetição
  for (const c of cands) c.weight -= recentServeSpam(gs, c.value, null) * 0.56;
  return weightedPickArr(cands);
}

export function chooseServeDirection(caps, family, isFirstServe, prefs = {}, gs = null) {
  const bias = isFirstServe ? prefs.serve1Bias : prefs.serve2Bias;
  const receiver = gs?.players?.[gs?.receiver];
  const receiverX = Math.abs(receiver?.pos?.x ?? 0);
  const receiverWide = receiverX > 2.35;
  // Deuce court (serveLeft=true): wide slice abre o forehand do receptor para fora.
  // Ad court (serveLeft=false): T com kick/flat bate no backhand — a jogada clássica.
  const isDeuceCourt = !!gs?.serveLeft;
  const deuceWideSliceBonus  = isDeuceCourt && family === ShotFamily.SERVE_SLICE ? 0.20 : 0;
  const adCenterKickFlatBonus = !isDeuceCourt && (family === ShotFamily.SERVE_KICK || family === ShotFamily.SERVE_FLAT) ? 0.18 : 0;
  const adBodySliceBonus      = !isDeuceCourt && family === ShotFamily.SERVE_SLICE ? 0.12 : 0;
  const cands = [
    { value: ShotDirection.WIDE,   weight: 0.34 + (bias === 'WIDE' ? 0.42 : 0) + (family === ShotFamily.SERVE_SLICE ? 0.18 : 0) - (receiverWide ? 0.12 : 0) + deuceWideSliceBonus },
    { value: ShotDirection.BODY,   weight: 0.36 + (bias === 'BODY' ? 0.42 : 0) + (family === ShotFamily.SERVE_KICK || family === ShotFamily.SERVE_FLAT ? 0.10 : 0) + adBodySliceBonus },
    { value: ShotDirection.CENTER, weight: 0.30 + (bias === 'T'    ? 0.42 : 0) + (receiverWide ? 0.16 : 0) + adCenterKickFlatBonus },
  ];
  if (!isFirstServe) {
    cands[0].weight += family === ShotFamily.SERVE_SLICE ? 0.02 : -0.02;
    cands[1].weight -= family === ShotFamily.SERVE_KICK ? 0.10 : 0.16;
    cands[2].weight += caps.servePrecision > 0.70 ? 0.18 : 0.12;
  }
  for (const c of cands) {
    const specialist = prefs._courtServeBias?.[c.value === ShotDirection.CENTER ? 'T' : c.value] ?? 0;
    c.weight += specialist;
    c.weight -= recentServeSpam(gs, family, c.value) * clamp(1 - specialist * 2, 0.7, 1);
  }
  return weightedPickArr(cands);
}

function gaussian() {
  const u1 = Math.max(1e-9, rand(0, 1));
  const u2 = Math.max(1e-9, rand(0, 1));
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function organicServeNoise(sigma) {
  const realism = SHOT_TUNING.realism.serve;
  const tail = rand(0, 1) < realism.humanTailChance ? realism.humanTailMult : 1;
  return gaussian() * sigma * tail;
}

function serviceTarget(gs, server, direction, family, isFirstServe = true, caps = null) {
  const tune = SHOT_TUNING.serve;
  const realism = SHOT_TUNING.realism.serve;
  const boxSign = gs?.serveLeft ? 1 : -1;
  // Kick precisa cair fundo para o quique alto ser eficaz.
  // Flat também vai fundo para maximizar pressão de ritmo.
  // Slice prioriza efeito lateral — profundidade moderada.
  const depth = family === ShotFamily.SERVE_KICK ? tune.kickTargetDepth
    : family === ShotFamily.SERVE_FLAT ? tune.flatTargetDepth
    : tune.sliceTargetDepth;
  const baseY = -server.side * COURT.serviceLineY * depth;
  const baseX = direction === ShotDirection.WIDE
    ? boxSign * tune.targetWideX
    : direction === ShotDirection.BODY
      ? boxSign * tune.targetBodyX
      : boxSign * tune.targetCenterX;
  const precision = caps?.servePrecision ?? clamp((server?.attrs?.saquePrecisao ?? 70) / 100, 0, 1);
  const power = caps?.servePower ?? clamp((server?.attrs?.saqueForca ?? 70) / 100, 0, 1);
  const precisionTighten = 1 - precision * realism.precisionTighten;
  const powerSpread = 1 + power * realism.powerSpread * (isFirstServe ? 1 : 0.45);
  const sigmaX = (isFirstServe ? realism.firstSigmaX : realism.secondSigmaX) * precisionTighten * powerSpread;
  const sigmaY = (isFirstServe ? realism.firstSigmaY : realism.secondSigmaY) * precisionTighten * powerSpread;
  const familyBiasX = family === ShotFamily.SERVE_SLICE && direction === ShotDirection.WIDE ? boxSign * realism.sliceWideBias : 0;
  const familyBiasY = -server.side * (
    family === ShotFamily.SERVE_KICK ? COURT.serviceLineY * realism.kickDeepBias
      : family === ShotFamily.SERVE_FLAT ? COURT.serviceLineY * realism.flatLineBias
        : 0
  );
  const bodyJitter = direction === ShotDirection.BODY ? gaussian() * realism.bodyJitter : 0;
  const marginX = isFirstServe ? 0.10 : 0.26;
  const minX = gs?.serveLeft ? 0.05 + marginX : -COURT.singlesW / 2 + marginX;
  const maxX = gs?.serveLeft ? COURT.singlesW / 2 - marginX : -0.05 - marginX;
  const minY = server.side > 0 ? -COURT.serviceLineY + (isFirstServe ? 0.08 : 0.24) : 0.08;
  const maxY = server.side > 0 ? -0.08 : COURT.serviceLineY - (isFirstServe ? 0.08 : 0.24);
  const x = clamp(baseX + familyBiasX + bodyJitter + organicServeNoise(sigmaX), Math.min(minX, maxX), Math.max(minX, maxX));
  const y = clamp(baseY + familyBiasY + organicServeNoise(sigmaY), Math.min(minY, maxY), Math.max(minY, maxY));
  const zoneId = `${isFirstServe ? 'first' : 'second'}_${String(family).toLowerCase()}_${String(direction).toLowerCase()}_serve`;
  const landingEnvelope = Object.freeze({
    zoneId,
    centerX: +baseX.toFixed(3),
    centerY: +baseY.toFixed(3),
    sigmaX: +sigmaX.toFixed(3),
    sigmaY: +sigmaY.toFixed(3),
    biasX: +(familyBiasX + bodyJitter).toFixed(3),
    biasY: +familyBiasY.toFixed(3),
    riskShape: isFirstServe ? 'first_serve_cloud' : 'second_serve_margin',
    surfaceSpread: 0,
    intendedX: x,
    intendedY: y,
  });
  return { x, y, depth: 'SERVICE_BOX', width: direction, landingEnvelope };
}

export function maybeForceServeFault(plan, server) {
  const precision = clamp((server?.attrs?.saquePrecisao ?? 70) / 100, 0, 1);
  const power = clamp((server?.attrs?.saqueForca ?? 70) / 100, 0, 1);
  const stamina = clamp(server?.stamina ?? 1, 0, 1);
  const isFirst = !!plan.isFirst;
  const chance = serveFaultChance({
    precision,
    power,
    isFirst,
    family: plan.family,
    direction: plan.direction,
    stamina,
  });
  if (rand(0, 1) >= chance) return null;
  const r = rand(0, 1);
  return r < (isFirst ? 0.58 : 0.36) ? 'LONG' : r < (isFirst ? 0.82 : 0.70) ? 'WIDE' : 'NET';
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
  const returnSkill = clamp((receiver.attrs?.devolucao ?? receiver.attrs?.retorno ?? 65) / 100, 0, 1);
  const serverPrecision = clamp((server.attrs?.saquePrecisao ?? 70) / 100, 0, 1);
  const serverPower = clamp((server.attrs?.saqueForca ?? 70) / 100, 0, 1);
  const technicalServeThreat = clamp(serverPrecision * 0.64 + serverPower * 0.24 - returnSkill * 0.22, 0, 1);
  receiver.pos.y = receiver.side * (COURT.halfL + tune.receiverBackY + technicalServeThreat * 0.42);
  receiver.vel.x = 0;
  receiver.vel.y = 0;
}

export function planServe(gs) {
  const server = gs.players?.[gs.server];
  const receiver = gs.players?.[gs.receiver];
  const isFirstServe = (server?.faults ?? 0) === 0;
  const context = buildShotContext({ gs, player: server, opponent: receiver });
  const caps = context.capabilities;
  const prefs = resolveServePrefs(server, receiver, gs, isFirstServe);
  const family = chooseServeFamily(caps, isFirstServe, prefs, gs);
  const direction = chooseServeDirection(caps, family, isFirstServe, prefs, gs);
  const target = serviceTarget(gs, server, direction, family, isFirstServe, caps);
  const tune = SHOT_TUNING.serve;
  const risk = isFirstServe && family === ShotFamily.SERVE_FLAT ? RiskProfile.AGGRESSIVE : RiskProfile.NORMAL;
  const q = clamp(caps.servePrecision * tune.qualityPrecision + caps.servePower * tune.qualityPower + caps.mentality * tune.qualityMentality + caps.stamina * tune.qualityStamina, 0, 1);
  const precisionPressure = clamp((caps.servePrecision - 0.62) * 0.70 + ((caps.tacticalVision ?? 0.6) - 0.58) * 0.28, 0, 0.38);
  const familyPace = family === ShotFamily.SERVE_FLAT ? tune.flatPace : family === ShotFamily.SERVE_SLICE ? tune.slicePace : tune.kickPace;
  const firstServeBoost = isFirstServe ? tune.firstServeBoost : tune.secondServeBoost;
  const power = clamp(tune.powerBase + caps.servePower * tune.powerAttr * familyPace * firstServeBoost + q * tune.qualityPowerBonus, tune.minPower, isFirstServe ? tune.firstMaxPower : tune.secondMaxPower);
  const travelYSign = Math.sign(target.y - server.pos.y) || -server.side || -1;
  const spin = serveSpin(family, power, caps, target.x, travelYSign);

  const plan = Object.freeze({
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
    precisionPressure,
    hitHeight: tune.hitHeight,
    netClearance: family === ShotFamily.SERVE_KICK ? tune.kickNetClearance : family === ShotFamily.SERVE_SLICE ? tune.sliceNetClearance : tune.flatNetClearance,
    spinType: spin.spinType,
    actualSpinX: spin.spinX,
    actualSpinZ: spin.spinZ,
    context,
    reason: `serve=${isFirstServe ? 'first' : 'second'}; family=${family}; dir=${direction}; pressure=${prefs._pressureMode ?? 'none'}; signature=${prefs._serveSignature ?? 'none'}`,
  });
  return applySignatureMoveToServe(plan, server, gs);
}

export function executeServe({ gs, launchBall }) {
  const server = gs.players?.[gs.server];
  if (!server || !gs.ball) return null;
  prepareServePositions(gs);
  const plan = planServe(gs);
  if (plan.signatureMove) {
    server.stamina = clamp((server.stamina ?? 1) - 0.004 * plan.signatureMove.staminaCost, 0, 1);
  }
  const forcedFaultKind = maybeForceServeFault(plan, server);
  const faultTarget = forcedFaultKind === 'LONG'
    ? { x: plan.target.x, y: plan.target.y + Math.sign(plan.target.y || 1) * (1.35 + rand(0, 0.85)) }
    : forcedFaultKind === 'WIDE'
      ? { x: plan.target.x + Math.sign(plan.target.x || 1) * (1.05 + rand(0, 0.65)), y: plan.target.y }
      : { x: plan.target.x, y: plan.target.y };
  const launchTarget = forcedFaultKind ? { ...plan.target, ...faultTarget } : plan.target;
  const launchNetClearance = forcedFaultKind === 'NET'
    ? Math.max(0.05, plan.netClearance - (0.70 + rand(0, 0.28)))
    : plan.netClearance;
  gs.ball.pos.x = server.pos.x;
  gs.ball.pos.y = server.pos.y;
  launchBall(
    gs.ball,
    server.pos,
    launchTarget.x,
    launchTarget.y,
    plan.spinType,
    plan.power,
    launchNetClearance,
    plan.hitHeight,
    plan.actualSpinX,
    plan.actualSpinZ,
  );

  gs.lastServeFirst = plan.isFirst;
  gs.serveBounced = false;
  gs.receiverTouched = false;
  gs.isFirstBounce = true;
  const serveKmh = Math.round(mag3(gs.ball.vel) * 3.6);
  const paceThreat = clamp(
    (serveKmh - (plan.isFirst ? 138 : 122)) / (plan.isFirst ? 72 : 66),
    0,
    1,
  );
  const spinThreat = clamp(
    (Math.abs(plan.actualSpinZ) + Math.abs(plan.actualSpinX) * 0.22) / 18,
    0,
    1,
  );
  const placementThreat = plan.direction === ShotDirection.BODY ? 0.82
    : plan.direction === ShotDirection.WIDE ? 0.76
      : 0.48;
  const pressureHint = clamp(
    paceThreat * 0.58
      + spinThreat * 0.18
      + placementThreat * 0.22
      + plan.precisionPressure * 0.38,
    0,
    plan.isFirst ? 0.98 : 0.82,
  );
  const delivery = buildServeDelivery({
    server,
    caps: plan.context?.capabilities,
    kmh: serveKmh,
    isFirst: plan.isFirst,
    family: plan.family,
    direction: plan.direction,
    spinX: plan.actualSpinX,
    spinZ: plan.actualSpinZ,
    target: launchTarget,
    patternHistory: gs._servePatternHistory ?? [],
    courtMods: gs.courtMods ?? {},
  });
  gs._pendingServeData = {
    serverId: gs.server,
    isFirst: plan.isFirst,
    kmh: serveKmh,
    physType: plan.family,
    dir: plan.direction,
    targetX: launchTarget.x,
    targetY: launchTarget.y,
    landingEnvelope: launchTarget.landingEnvelope ?? plan.target?.landingEnvelope ?? null,
    power: plan.power,
    spinX: plan.actualSpinX,
    spinZ: plan.actualSpinZ,
    servePrecision: Math.round((server.attrs?.saquePrecisao ?? 70)),
    precisionPressure: plan.precisionPressure,
    netClearance: launchNetClearance,
    forcedFaultKind,
    pressureHint,
    paceThreat: +paceThreat.toFixed(3),
    spinThreat: +spinThreat.toFixed(3),
    placementThreat: +placementThreat.toFixed(3),
    delivery,
    exchangeVersion: delivery.version,
    jamHint: clamp((plan.direction === ShotDirection.BODY ? (plan.isFirst ? 1 : 0.58) : plan.direction === ShotDirection.CENTER ? (plan.isFirst ? 0.35 : 0.22) : 0) + plan.precisionPressure * (plan.isFirst ? 0.52 : 0.24), 0, 1),
    wideHint: clamp((plan.direction === ShotDirection.WIDE ? 1 : Math.abs(plan.target.x) > 1.8 ? 0.55 : 0) + plan.precisionPressure * 0.42, 0, 1),
    pointNum: gs._currentPointId ?? ((gs.pointHistory?.length ?? 0) + 1),
  };
  gs._serveAdvantageContext = Object.freeze({
    version: delivery.version,
    level: 'PENDING',
    score: delivery.threat,
    reason: 'serveDelivery',
    serveKmh: gs._pendingServeData.kmh,
    delivery,
    beneficiaryId: gs.server,
  });
  gs._servePatternHistory = [
    ...(gs._servePatternHistory ?? []).slice(-7),
    {
      serverId: gs.server,
      family: plan.family,
      direction: plan.direction,
      isFirst: plan.isFirst,
      targetSign: Math.sign(launchTarget.x || 0),
      pointNum: gs._currentPointId ?? ((gs.pointHistory?.length ?? 0) + 1),
    },
  ];
  if (server.ctx?.matchCtx) {
    server.ctx.matchCtx.serveHistory = [
      ...(server.ctx.matchCtx.serveHistory ?? []).slice(-7),
      {
        dir: plan.direction,
        physType: plan.family,
        isSec: !plan.isFirst,
        kmh: gs._pendingServeData.kmh,
      },
    ];
    server.ctx.matchCtx.serveDir = plan.direction;
    server.ctx.matchCtx.serveN = (server.ctx.matchCtx.serveN ?? 0) + 1;
  }

  const stats = server.stats;
  if (stats) {
    if (plan.isFirst) stats.serve1Total++;
    else stats.serve2Total++;
  }

  gs.ball.lastHitBy = server.id;
  gs.ball._serveTargetY = launchTarget.y;
  gs.ball._serveExitKmh = gs._pendingServeData.kmh;
  gs.ball._servePhysType = plan.family === ShotFamily.SERVE_SLICE
    ? 'SLICE'
    : plan.family === ShotFamily.SERVE_KICK
      ? 'KICK'
      : null;
  gs.ball._lastTargetX = launchTarget.x;
  gs.ball._lastTargetY = launchTarget.y;
  gs.ball._lastContactX = server.pos.x;
  gs.ball._lastContactY = server.pos.y;
  gs.ball._lastShotType = plan.family;
  gs.ball.lastShotType = plan.family;
  gs.ball._lastShotMeta = {
    netClearance: launchNetClearance,
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
    forcedFaultKind,
    errorRisk: 1 - plan.quality,
    serve: true,
    landingEnvelope: launchTarget.landingEnvelope ?? plan.target?.landingEnvelope ?? null,
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
      targetX: launchTarget.x,
      targetY: launchTarget.y,
      power: plan.power,
      netClearance: launchNetClearance,
      spinType: plan.spinType,
      actualSpinX: plan.actualSpinX,
      actualSpinZ: plan.actualSpinZ,
      errorRisk: 1 - plan.quality,
      dispersion: 0,
      landingEnvelope: launchTarget.landingEnvelope ?? plan.target?.landingEnvelope ?? null,
    },
  });
  rememberShot({
    player: server,
    opponent: gs.players?.[gs.receiver],
    decision: plan,
    execution: { targetX: launchTarget.x, targetY: launchTarget.y },
    quality: { quality: plan.quality, bodyState: 'SERVE_STANCE', canContact: true },
    context: plan.context,
    serve: true,
  });
  return plan;
}
