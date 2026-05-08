// ═══════════════════════════════════════════════════════════════
//  trace.js — Motor Descritivo Analítico Completo
//  Registra TODOS os pontos do jogo (sem limite de buffer)
//  com cobertura total de: situação de pressão, saque completo,
//  cada golpe (EV, intenção, spin, bounce, zona), padrões de rally,
//  golpe assinatura, override, qualidade de return, stamina,
//  tipo de winner/erro, side deuce/ad, break/set/match point.
// ═══════════════════════════════════════════════════════════════

import { readHeat } from '../systems/analytics/MatchHeat.js';
import { computeRating } from '../ui/game/IndividualRating.jsx';

export const TRACE_ENABLED = true;

// ─── Factory ──────────────────────────────────────────────────
export function createTrace() {
  return {
    points:   [],      // array completo — todos os pontos do jogo
    _current: null,
    _pointSeq: 0,
    // ── Acumuladores live para estatísticas globais ──
    _agg: {
      totalPoints: 0,
      winners:        [0, 0],
      unforcedErrors: [0, 0],
      forcedErrors:   [0, 0],
      aces:           [0, 0],
      doubleFaults:   [0, 0],
      netApproaches:  [0, 0],
      netWon:         [0, 0],
      breakPointsPlayed:    0,
      breakPointsConverted: 0,
      serveKmh1: [[], []],   // [player0_1stServes, player1_1stServes]
      serveKmh2: [[], []],
      rallyLenBuckets: { '0': 0, '1': 0, '2-4': 0, '5-9': 0, '10+': 0 },
    },
  };
}

// ─── startPoint ───────────────────────────────────────────────
export function traceStartPoint(gs) {
  if (!TRACE_ENABLED) return;
  if (!gs.trace) gs.trace = createTrace();
  const t  = gs.trace;
  const p0 = gs.players[0];
  const p1 = gs.players[1];
  const SL = ['0', '15', '30', '40', 'Ad'];

  const srv  = gs.players[gs.server];
  const rcv  = gs.players[1 - gs.server];
  const srvS = srv.score;
  const rcvS = rcv.score;
  const setsNeeded = gs.setsToWin ?? 2;

  const isBreakPoint = gs.inTiebreak
    ? false
    : rcvS >= 3 && (rcvS > srvS || rcvS === 4);

  const isGamePoint = !gs.inTiebreak &&
    srvS >= 3 && (srvS > rcvS || srvS === 4) && !isBreakPoint;

  const serverCloseSet = srv.games >= 5 && srv.games > rcv.games;
  const rcvCloseSet    = rcv.games >= 5 && rcv.games > srv.games;
  const isSetPoint     = (isGamePoint && serverCloseSet) || (isBreakPoint && rcvCloseSet);

  const isMatchPoint = isSetPoint &&
    ((isGamePoint && srv.sets === setsNeeded - 1) ||
     (isBreakPoint && rcv.sets === setsNeeded - 1));

  const isTiebreakMatchPoint = gs.inTiebreak &&
    (gs.tbScore[0] >= 6 || gs.tbScore[1] >= 6) &&
    Math.abs(gs.tbScore[0] - gs.tbScore[1]) >= 1 &&
    (srv.sets === setsNeeded - 1 || rcv.sets === setsNeeded - 1);

  const sideLabel = gs.inTiebreak
    ? ((gs.tbPointsPlayed % 2 === 0) ? 'DEUCE' : 'AD')
    : ((srvS + rcvS) % 2 === 0 ? 'DEUCE' : 'AD');

  const heatStart = readHeat(gs);
  const ratingsAtStart = gs.players.map((p) => _traceRatingSnapshot(p));

  t._pointSeq++;
  t._current = {
    pointId:      t._pointSeq,
    set:          `${p0.sets}-${p1.sets}`,
    game:         `${p0.games}-${p1.games}`,
    score:        `${SL[p0.score] ?? '?'}-${SL[p1.score] ?? '?'}`,
    server:       gs.players[gs.server].name,
    serverId:     gs.server,
    serverStyle:  gs.players[gs.server].styleData?.abbr ?? '?',
    receiver:     gs.players[1 - gs.server].name,
    courtSide:    sideLabel,
    inTiebreak:   gs.inTiebreak,
    tbScore:      gs.inTiebreak ? [...gs.tbScore] : null,

    isBreakPoint,
    isGamePoint,
    isSetPoint,
    isMatchPoint: isMatchPoint || isTiebreakMatchPoint,
    pressureLabel: _pressureLabel(isMatchPoint || isTiebreakMatchPoint, isSetPoint, isBreakPoint, isGamePoint),

    staminaStart: [
      +((p0.stamina ?? 1) * 100).toFixed(0),
      +((p1.stamina ?? 1) * 100).toFixed(0),
    ],
    momentumStart: [
      +((p0.ctx?.momentum ?? 0.5) * 100).toFixed(0),
      +((p1.ctx?.momentum ?? 0.5) * 100).toFixed(0),
    ],
    heatAtStart: heatStart?.score ?? null,
    heatPeakAtStart: heatStart?.peak ?? null,
    heatTierStart: heatStart?.tier?.label ?? null,
    ratingsAtStart,

    serve:     null,
    shots:     [],
    endReason: null,
    endDetail: null,
    winner:    null,
    winnerId:  null,
    winnerType: null,
    rally:     null,
    summary:   null,
  };
}

// ─── logShot ──────────────────────────────────────────────────
export function traceLogShot(gs, player, shot, posQuality) {
  if (!TRACE_ENABLED) return;
  if (!gs.trace?._current) return;

  const t     = gs.trace;
  const pt    = t._current;
  const ball  = gs.ball;
  const opp   = gs.players[1 - player.id];
  const ctx   = player.ctx;
  const at    = player._aiTrace ?? {};
  const fs    = player._finalShot ?? {};
  const engine = shot.shotEngine ?? player._lastShotEngineSnapshot ?? null;
  const engineQuality = engine?.quality?.value ?? posQuality;
  const engineExecution = engine?.execution ?? null;
  const engineIntent = engine?.intent ?? shot.intent ?? null;
  const engineDirection = engine?.direction ?? shot.direction ?? null;
  const engineMemory = engine?.memory ?? null;
  const buildMode = engine?.buildMode ?? null;
  const styleSubType = engine?.styleSubType ?? null;
  const opportunityEV = engine?.opportunityEV ?? null;

  const HALF_L = 11.885;
  const shotMeta = ball?._lastShotMeta ? { ...ball._lastShotMeta } : null;

  const depthBucket = (absY) => absY > HALF_L * 0.78 ? 'DEEP' : absY > HALF_L * 0.45 ? 'MID' : 'SHORT';
  const widthBucket = (absX) => absX > 2.8 ? 'WIDE' : absX > 1.2 ? 'MID' : 'CENTRE';
  const playerSide  = player.id === 0 ? 1 : -1;
  const absX        = Math.abs(shot.targetX);
  const dirLabel    = engineDirection === 'CROSS' ? 'CC'
    : engineDirection === 'DTL' ? 'DTL'
    : engineDirection === 'BODY' || engineDirection === 'CENTER' ? 'BODY'
    : absX > 1.5
    ? (shot.targetX * playerSide > 0 ? 'DTL' : 'CC')
    : 'BODY';

  const oppX   = opp.pos.x;
  const oppY   = Math.abs(opp.pos.y);
  const oppLat = widthBucket(Math.abs(oppX));
  const oppDep = depthBucket(oppY);
  const openSide = oppX > 0.5 ? 'LEFT' : oppX < -0.5 ? 'RIGHT' : 'NONE';

  // ballTier vem do novo computeBallTier — OPPORTUNITY/NEUTRAL/DIFFICULT
  const ballTier = at.sc?.ballTier ?? null;
  let ballLabel = ballTier ?? 'NEUTRAL';

  const ballReasons = [];
  if (engineQuality < 0.42)         ballReasons.push('qualidade_baixa');
  if ((ctx.rallyPressure ?? 0) > 0.55) ballReasons.push('sob_pressão');  // stress acumulado
  if (Math.abs(player.pos.x) > 3)   ballReasons.push('wide');
  if (player._arrivalMargin != null && player._arrivalMargin < -0.05) ballReasons.push('atrasado');
  if (ball.pos.z < 0.5)             ballReasons.push('bola_baixa');
  if (ball.pos.z > 1.5)             ballReasons.push('bola_alta');

  const intent       = engineIntent ?? at.sc?.intent ?? ctx.currentIntent ?? 'BUILD';
  const intentReason = engine?.memory?.rallyPlan
    ? `${intent} | plano:${engine.memory.rallyPlan}`
    : _intentReason(intent, at.sc, engineQuality);

  const _sorted = (at.scored ?? []).sort((a, b) => b.EV - a.EV);
  const _top5   = _sorted.slice(0, 5);
  const _chosen = at.chosen ? _sorted.find(s => s.c === at.chosen) : null;
  const _chosenInTop5 = _chosen && _top5.some(s => s.c === at.chosen);
  const _display = _chosenInTop5 ? _top5 : (_chosen ? [..._top5.slice(0, 4), _chosen] : _top5);
  const top5 = _display.map(s => ({
    shotType:     s.c.shotType,
    targetX:      +s.c.targetX.toFixed(2),
    targetDepth:  +s.c.targetDepth.toFixed(2),
    dir:          _dirFrom(s.c.targetX, player.id),
    depth:        depthBucket(Math.abs(s.c.targetDepth * HALF_L)),
    width:        widthBucket(Math.abs(s.c.targetX)),
    power:        Math.round((s.c.power ?? 0.65) * 100),
    ev:           +s.EV.toFixed(3),
    safety:       +s.sub.safety.toFixed(2),
    pressure:     +s.sub.pressure.toFixed(2),
    finish:       +s.sub.finish.toFixed(2),
    rhythm:       +s.sub.rhythm.toFixed(2),
    angle:        +(s.sub.angle  ?? 0).toFixed(2),
    depth_score:  +(s.sub.depth  ?? 0).toFixed(2),
    desired_depth: s.desiredDepth != null ? +s.desiredDepth.toFixed(2) : null,
    tags:         s.c.intentTags ?? [],
    isChosen:     s.c === at.chosen,
  }));

  const whyChosen = fs.wasOverridden
    ? `${fs.evShotType ?? at.chosen?.shotType ?? '?'} → ${fs.executedType} [${fs.overrideReason}]`
    : _whyChosen(at.chosen, at.sc, top5, at.chosenDirLabel);

  const overrideInfo = fs.wasOverridden ? {
    evType:       fs.evShotType,
    executedType: fs.executedType,
    reason:       fs.overrideReason,
    chain:        fs.overrideChain ?? [],
  } : null;

  const isReturn = (engine?.phase === 'RETURN') || (gs.rally === 1 && player.id !== gs.server);
  const hitTarget = player._hitTarget ?? null;
  const movement = {
    courtMode: ctx?.courtMode ?? 'BASE',
    transitionCooldown: ctx?.transitionCooldown ?? 0,
    arrivalMargin: player._arrivalMargin != null ? +(player._arrivalMargin).toFixed(3) : null,
    readiness: player._contactReadiness != null ? +(player._contactReadiness).toFixed(3) : null,
    settle: player._contactSettleTime != null ? +(player._contactSettleTime).toFixed(3) : null,
    commitDist: player._commitDistance != null ? +(player._commitDistance).toFixed(3) : null,
    locomotionMode: player._locomotionMode ?? null,
    contactScore: player._movementContactScore != null ? +(player._movementContactScore).toFixed(3) : null,
    predCrossX: player._predCrossX != null ? +(player._predCrossX).toFixed(2) : null,
    hitTarget: hitTarget ? {
      x: hitTarget.x != null ? +hitTarget.x.toFixed(2) : null,
      y: hitTarget.y != null ? +hitTarget.y.toFixed(2) : null,
      t: hitTarget.t != null ? +hitTarget.t.toFixed(3) : null,
    } : null,
    opponentETA: fs.timings?.opponentETA ?? null,
    opponentETAComponents: fs.timings?.opponentETAComponents ?? null,
  };

  const shotTrace = {
    rallyIndex:  gs.rally,
    isReturn,
    hitter:      player.name,
    hitterId:    player.id,
    receiver:    opp.name,
    atNet:       player.atNet,
    shotType:    shot.type,
    quality:     +engineQuality.toFixed(2),
    qualityBand: engine?.quality?.band ?? null,
    bodyState:   engine?.quality?.bodyState ?? null,
    ballLabel,
    ballReasons,
    rallyPatternApplied:    at.rallyPatternApplied    ?? null,
    signatureShotTriggered: null,
    signatureLabel:         null,
    signatureEmoji:         null,
    signatureSource:        null,
    ballPos:     { x: +ball.pos.x.toFixed(2), y: +ball.pos.y.toFixed(2), z: +ball.pos.z.toFixed(2) },
    hitterPos:   { x: +player.pos.x.toFixed(2), y: +player.pos.y.toFixed(2) },
    oppPos:      { x: +opp.pos.x.toFixed(2),    y: +opp.pos.y.toFixed(2) },
    oppLateral:  oppLat,
    oppDepth:    oppDep,
    openSide,
    oppVeryDeep: at.sc?.oppVeryDeep ?? false,
    oppOut:      +(at.sc?.oppOut ?? 0).toFixed(2),
    intent,
    intentReason,
    inControl:   at.sc?.inControl ?? false,
    momentum:    +(ctx.momentum ?? 0.5).toFixed(2),
    stamina:     +((player.stamina ?? 1) * 100).toFixed(0),
    target: {
      x:     +shot.targetX.toFixed(2),
      y:     +shot.targetY.toFixed(2),
      dir:   dirLabel,
      depth: depthBucket(Math.abs(shot.targetY)),
      width: widthBucket(absX),
    },
    power:  Math.round((engineExecution?.power ?? shot.power ?? 30) * 3.6),
    launchKmh: shotMeta?.launchKmh ?? Math.round(Math.hypot(ball.vel?.x ?? 0, ball.vel?.y ?? 0, ball.vel?.z ?? 0) * 3.6),
    launchVel: shotMeta?.launchVel ?? {
      x: +(ball.vel?.x ?? 0).toFixed(2),
      y: +(ball.vel?.y ?? 0).toFixed(2),
      z: +(ball.vel?.z ?? 0).toFixed(2),
    },
    startZ: shotMeta?.startZ ?? ball.pos.z,
    maxZ: shotMeta?.maxZ ?? ball.pos.z,
    spin:   engineExecution?.spinType ?? shot.spinType,
    spinX:  engineExecution?.spinX ?? shot.actualSpinX ?? null,
    spinZ:  engineExecution?.spinZ ?? shot.actualSpinZ ?? null,
    spinEffective: _spinEffectiveLabel(engineExecution?.spinX ?? shot.actualSpinX ?? null, ball.vel?.y ?? 0),
    netClearance: engineExecution?.netClearance ?? shotMeta?.netClearance ?? null,
    errorRisk: engineExecution?.errorRisk ?? null,
    dispersion: engineExecution?.dispersion ?? null,
    missChance: engineExecution?.missChance ?? shotMeta?.missChance ?? null,
    forcedErrorKind: engineExecution?.forcedErrorKind ?? shotMeta?.forcedErrorKind ?? null,
    identityTags: engineExecution?.identityTags ?? shotMeta?.identityTags ?? [],
    enginePhase: engine?.phase ?? null,
    buildMode,
    styleSubType,
    opportunityEV,
    memoryPlan: engineMemory?.rallyPlan ?? null,
    top5,
    whyChosen,
    overrideInfo,
    evProbError:    player._shotEvProb?.error  != null ? +player._shotEvProb.error.toFixed(3)  : null,
    evProbWin:      player._shotEvProb?.win    != null ? +player._shotEvProb.win.toFixed(3)    : null,
    qualBreakdown:  player._qualBreakdown ?? null,
    shotIntensity:  shot._shotIntensity   != null ? +shot._shotIntensity.toFixed(2)           : null,
    rallyPressure:  +(ctx.rallyPressure   ?? 0).toFixed(2),
    formMod:        player._formMods?.qualityMod != null ? +player._formMods.qualityMod.toFixed(2) : null,
    movement,
    bounce:  null,
    landErr: null,
    outcome: null,
  };

  pt.shots.push(shotTrace);
  gs.trace._lastShot = shotTrace;
}

// ─── logShotOutcome ───────────────────────────────────────────
export function traceLogOutcome(gs, bounceX, bounceY, outcomeType) {
  if (!TRACE_ENABLED) return;
  const shot = gs.trace?._lastShot;
  if (!shot) return;

  const err = shot.target
    ? +Math.sqrt((bounceX - shot.target.x) ** 2 + (bounceY - shot.target.y) ** 2).toFixed(2)
    : null;
  const ball = gs.ball;
  const shotMeta = ball?._lastShotMeta ?? null;

  shot.bounce  = {
    x:    +bounceX.toFixed(2),
    y:    +bounceY.toFixed(2),
    zone: _bounceZone(bounceX, bounceY),
    postKmh: ball?.vel ? Math.round(Math.hypot(ball.vel.x ?? 0, ball.vel.y ?? 0, ball.vel.z ?? 0) * 3.6) : null,
  };
  if (shotMeta?.maxZ != null) shot.maxZ = +shotMeta.maxZ.toFixed(2);
  shot.landErr = err;
  if (outcomeType) shot.outcome = outcomeType;
  gs.trace._lastShot = null;
}

// ─── endPoint ─────────────────────────────────────────────────
export function traceEndPoint(gs, winnerIdx, reason, isWinner) {
  if (!TRACE_ENABLED) return;
  if (!gs.trace?._current) return;

  const t  = gs.trace;
  const pt = t._current;

  let endType = 'UNKNOWN';
  if (reason.includes('WINNER') || reason.includes('bola parou') || isWinner) endType = 'WINNER';
  else if (reason.includes('[FORA]') || reason.includes('fuga'))               endType = 'OUT';
  else if (reason.includes('[REDE]'))                                           endType = 'NET';
  else if (reason.includes('DUPLA FALTA'))                                      endType = 'DOUBLE_FAULT';
  else if (reason.includes('CAMPO PRÓPRIO'))                                    endType = 'CAMPO_PROPRIO';
  else if (reason.includes('FORÇADO') || reason.includes('forced'))             endType = 'FORCED_ERROR';
  else if (reason.includes('NÃO-FORÇADO') || reason.includes('unforced'))       endType = 'UNFORCED_ERROR';

  pt.endReason = endType;
  pt.endDetail = reason;
  pt.winner    = gs.players[winnerIdx].name;
  pt.winnerId  = winnerIdx;
  pt.rally     = gs.rally;
  const heatEnd = readHeat(gs);
  pt.heatAtEnd = heatEnd?.score ?? null;
  pt.heatPeak = heatEnd?.peak ?? null;
  pt.heatTier = heatEnd?.tier?.label ?? null;
  pt.heatDelta = pt.heatAtStart != null && heatEnd?.score != null
    ? +(heatEnd.score - pt.heatAtStart).toFixed(1)
    : null;
  pt.ratingsAtEnd = gs.players.map((p) => _traceRatingSnapshot(p));
  _syncOpenShotTelemetry(gs);

  if (endType === 'WINNER') {
    const lastShot = pt.shots[pt.shots.length - 1];
    pt.winnerType = _classifyWinner(lastShot);
  }

  // ── Serve snapshot ─────────────────────────────────────────
  const pd = gs._pendingServeData;
  if (pd || gs.serveBounced) {
    pt.serve = pt.serve ?? {};
    if (pd) {
      pt.serve.kmh      = pd.kmh;
      pt.serve.physType = pd.physType;
      pt.serve.dir      = pd.dir;
      pt.serve.isFirst  = pd.isFirst;
      pt.serve.targetY  = gs.ball?._serveTargetY != null ? +gs.ball._serveTargetY.toFixed(2) : null;
    }
    pt.serve.serverWon = winnerIdx === gs.server;
    pt.serve.isAce     = endType === 'WINNER'
                       && winnerIdx === gs.server
                       && !gs.receiverTouched
                       && gs.rally <= 1;
    pt.serve.isDF      = endType === 'DOUBLE_FAULT';
    pt.serve.rallyLen  = gs.rally;

    const returnShot = pt.shots.find(s => s.isReturn);
    if (returnShot?.bounce)  pt.serve.returnBounce  = returnShot.bounce;
    if (returnShot) {
      pt.serve.returnQuality = returnShot.quality;
      pt.serve.returnType    = returnShot.shotType;
      pt.serve.returnIntent  = returnShot.intent ?? null;
    }
  }

  // ── Mini-summary ───────────────────────────────────────────
  const shots = pt.shots;
  const total = shots.length;
  if (total > 0) {
    const cc   = shots.filter(s => s.target?.dir === 'CC').length;
    const dtl  = shots.filter(s => s.target?.dir === 'DTL').length;
    const body = shots.filter(s => s.target?.dir === 'BODY').length;
    const deep = shots.filter(s => s.target?.depth === 'DEEP').length;
    const mid  = shots.filter(s => s.target?.depth === 'MID').length;
    const sh   = shots.filter(s => s.target?.depth === 'SHORT').length;
    const pct  = n => total > 0 ? Math.round(n / total * 100) : 0;
    const patterns   = _detectPatterns(shots);
    const approached = shots.some(s => s.intent === 'APPROACH');
    const netShots   = shots.filter(s => s.atNet);
    const avgQuality = +(shots.reduce((s, sh) => s + sh.quality, 0) / total).toFixed(2);
    const avgPower   = Math.round(shots.reduce((s, sh) => s + (sh.power ?? 0), 0) / total);
    const maxSpeed   = shots.reduce((m, sh) => Math.max(m, sh.power ?? 0), 0);
    const avgMom     = +(shots.reduce((s, sh) => s + sh.momentum, 0) / total).toFixed(2);
    const intents    = [...new Set(shots.map(s => s.intent))];
    const intentCounts = _countBy(shots.map(s => s.intent).filter(Boolean));
    const bodyStates = _countBy(shots.map(s => s.bodyState).filter(Boolean));
    const shotTypes = _countBy(shots.map(s => s.shotType).filter(Boolean));
    const forcedErrors = _countBy(shots.map(s => s.forcedErrorKind).filter(Boolean));
    const maxZ = shots.reduce((m, sh) => Math.max(m, sh.maxZ ?? sh.ballPos?.z ?? 0), 0);
    const maxLaunchKmh = shots.reduce((m, sh) => Math.max(m, sh.launchKmh ?? sh.power ?? 0), 0);
    const spins      = shots.reduce((acc, s) => {
      if (s.spinEffective) acc[s.spinEffective] = (acc[s.spinEffective] ?? 0) + 1;
      else if (s.spin) acc[s.spin] = (acc[s.spin] ?? 0) + 1;
      return acc;
    }, {});

    pt.summary = {
      totalShots:      total,
      ccPct: pct(cc),  dtlPct: pct(dtl), bodyPct: pct(body),
      deepPct: pct(deep), midPct: pct(mid), shortPct: pct(sh),
      patternBroken:    patterns.broken,
      dominantPattern:  patterns.dominant,
      hadApproach:      approached,
      netAttempts:      netShots.length,
      movementStates:   [...new Set(shots.map(s => s.movement?.courtMode).filter(Boolean))],
      avgArrivalMargin: shots.length
        ? +(
            shots
              .map(s => s.movement?.arrivalMargin)
              .filter(v => v != null)
              .reduce((sum, v, _, arr) => sum + v / Math.max(arr.length, 1), 0)
          ).toFixed(3)
        : null,
      avgQuality,
      avgPower,
      maxSpeed,
      maxLaunchKmh,
      maxZ: +maxZ.toFixed(2),
      avgMomentum:      avgMom,
      intentsUsed:      intents,
      intentCounts,
      bodyStates,
      shotTypes,
      forcedErrors,
      spinDistribution: spins,
    };
  }

  // ── Acumuladores globais ────────────────────────────────────
  const agg = t._agg;
  agg.totalPoints++;
  if (endType === 'WINNER')         agg.winners[winnerIdx]++;
  if (endType === 'UNFORCED_ERROR') agg.unforcedErrors[1 - winnerIdx]++;
  if (endType === 'FORCED_ERROR')   agg.forcedErrors[1 - winnerIdx]++;

  const sv = pt.serve;
  if (sv) {
    if (sv.isAce) agg.aces[gs.server]++;
    if (sv.isDF)  agg.doubleFaults[gs.server]++;
    if (sv.kmh) {
      if (sv.isFirst !== false) agg.serveKmh1[gs.server].push(sv.kmh);
      else                      agg.serveKmh2[gs.server].push(sv.kmh);
    }
  }

  if (pt.isBreakPoint) {
    agg.breakPointsPlayed++;
    if (winnerIdx !== gs.server) agg.breakPointsConverted++;
  }

  if ((pt.summary?.netAttempts ?? 0) > 0) {
    agg.netApproaches[winnerIdx]++;
    agg.netWon[winnerIdx]++;
  }

  const rl = gs.rally ?? 0;
  const rb = rl === 0 ? '0' : rl === 1 ? '1' : rl <= 4 ? '2-4' : rl <= 9 ? '5-9' : '10+';
  agg.rallyLenBuckets[rb] = (agg.rallyLenBuckets[rb] ?? 0) + 1;

  t.points.push({ ...pt });
  t._current = null;
}

// ─── traceDump — dump legível de todos os pontos ──────────────
export function traceDump(gs) {
  if (!gs.trace) return '[ sem dados de trace ]';
  const pts = gs.trace.points;
  if (pts.length === 0) return '[ ainda não há pontos completados ]';

  const lines = [];
  lines.push('╔══════════════════════════════════════════════════════════════');
  lines.push(`║  LOG MATADOR COMPLETO — ${pts.length} ponto(s) registrados`);
  lines.push('╚══════════════════════════════════════════════════════════════');

  for (const pt of pts) {
    const pressTag = pt.pressureLabel ? `  ⚡${pt.pressureLabel}` : '';
    lines.push('');
    lines.push(
      `┌─ #${pt.pointId}  Set ${pt.set}  Game ${pt.game}  ${pt.score}` +
      `  Srv:${pt.server} [${pt.serverStyle}]  ${pt.courtSide}${pressTag}`
    );
    lines.push(`│  Stamina start: [${pt.staminaStart[0]}% / ${pt.staminaStart[1]}%]  Momentum: [${pt.momentumStart[0]}% / ${pt.momentumStart[1]}%]`);
    if (pt.heatAtStart != null || pt.heatAtEnd != null) {
      lines.push(`│  Heat: ${pt.heatAtStart ?? '?'}${pt.heatTierStart ? ` (${pt.heatTierStart})` : ''} → ${pt.heatAtEnd ?? '?'}${pt.heatTier ? ` (${pt.heatTier})` : ''}${pt.heatDelta != null ? `  Δ${pt.heatDelta >= 0 ? '+' : ''}${pt.heatDelta}` : ''}`);
    }
    if (pt.ratingsAtEnd?.length) {
      const ratingsLine = pt.ratingsAtEnd.map((r, i) => {
        const prev = pt.ratingsAtStart?.[i]?.score;
        const delta = prev != null && r.score != null ? +(r.score - prev).toFixed(1) : null;
        return `${r.player}:${r.score ?? '?'}${delta != null ? ` (${delta >= 0 ? '+' : ''}${delta})` : ''}`;
      }).join('  |  ');
      lines.push(`│  Ratings: ${ratingsLine}`);
    }
    if (pt.inTiebreak && pt.tbScore) {
      lines.push(`│  TIEBREAK  ${pt.tbScore[0]}-${pt.tbScore[1]}`);
    }

    if (pt.serve) {
      const sv = pt.serve;
      const serveTag = sv.isDF   ? '❌ DUPLA FALTA'
                     : sv.isAce  ? `⚡ ACE ${sv.physType ?? ''} ${sv.dir ?? ''} ${sv.kmh ?? '?'}km/h`
                     : sv.kmh    ? `🎾 ${sv.isFirst ? '1º' : '2º'} SAQUE ${sv.physType ?? ''}-${sv.dir ?? ''} ${sv.kmh}km/h`
                     : '🎾 SAQUE';
      const outTag   = sv.serverWon ? '✓ HOLD' : '✗ BREAK';
      lines.push(`│  ${serveTag}  →  ${outTag}  rally:${sv.rallyLen ?? '?'}`);
      if (sv.returnQuality != null) {
        lines.push(`│  Return: ${sv.returnType ?? '?'}  Q:${(sv.returnQuality*100).toFixed(0)}%`);
      }
      if (sv.targetY != null) {
        lines.push(`│  Serve targetY: ${sv.targetY}${sv.returnIntent ? `  returnIntent:${sv.returnIntent}` : ''}`);
      }
    }

    for (const s of (pt.shots ?? [])) {
      lines.push('│');
      const rallyLabel = s.rallyIndex === 0 ? '🎾 SAQUE' : s.isReturn ? `↩ RETURN` : `🏓 Bola ${s.rallyIndex + 1}`;
      const netTag     = s.atNet ? ' [REDE]' : '';
      const _intensityStr = s.shotIntensity != null ? `  int:${(s.shotIntensity*100).toFixed(0)}%` : '';
      const _pressureStr  = s.rallyPressure > 0.15   ? `  pres:${(s.rallyPressure*100).toFixed(0)}%` : '';
      const _formStr      = s.formMod != null && Math.abs(s.formMod - 1.0) > 0.02 ? `  forma:${s.formMod.toFixed(2)}` : '';
      const _engineStr = [
        s.enginePhase ? `phase:${s.enginePhase}` : null,
        s.buildMode ? `build:${s.buildMode}` : null,
        s.styleSubType ? `style:${s.styleSubType}` : null,
        s.opportunityEV ? `ev:safe ${s.opportunityEV.safetyEV.toFixed(2)} pressure ${s.opportunityEV.pressureEV.toFixed(2)} finish ${s.opportunityEV.finishEV.toFixed(2)} variation ${s.opportunityEV.variationEV.toFixed(2)} conf ${s.opportunityEV.confidence.toFixed(2)}` : null,
        s.qualityBand ? `band:${s.qualityBand}` : null,
        s.bodyState ? `body:${s.bodyState}` : null,
        s.errorRisk != null ? `risk:${(s.errorRisk*100).toFixed(0)}%` : null,
        s.missChance != null ? `miss:${(s.missChance*100).toFixed(0)}%` : null,
        s.dispersion != null ? `disp:${(s.dispersion*100).toFixed(0)}%` : null,
        s.forcedErrorKind ? `forced:${s.forcedErrorKind}` : null,
        s.memoryPlan ? `mem:${s.memoryPlan}` : null,
      ].filter(Boolean).join('  ');
      lines.push(`│  ┌ ${s.ballLabel}${s.ballReasons.length ? ' (' + s.ballReasons.join(', ') + ')' : ''}  z:${s.ballPos.z}  maxZ:${s.maxZ ?? '?'}  Q:${(s.quality*100).toFixed(0)}%${_engineStr ? `  ${_engineStr}` : ''}  Mom:${(s.momentum*100).toFixed(0)}%  Stam:${s.stamina}%${_intensityStr}${_pressureStr}${_formStr}${s.evProbError != null ? `  errP:${(s.evProbError*100).toFixed(1)}%` : ''}`);
      lines.push(`│  │  Hitter(x:${s.hitterPos.x} y:${s.hitterPos.y})  ctrl:${s.inControl?'SIM':'NÃO'}`);
      lines.push(`│  │  Opp(x:${s.oppPos.x} y:${s.oppPos.y})  lat:${s.oppLateral}  dep:${s.oppDepth}  open:${s.openSide}  out:${(s.oppOut*100).toFixed(0)}%`);
      lines.push(`│  ├ Intent: ${s.intent}  "${s.intentReason}"`);
      if (s.opportunityEV?.reasons?.length) {
        lines.push(`│  │  EV reason: ${s.opportunityEV.recommendedIntent} | ${s.opportunityEV.reasons.join('+')}`);
      }
      if (s.movement) {
        const mv = s.movement;
        const arr = mv.arrivalMargin != null ? `arr:${mv.arrivalMargin.toFixed(3)}s  ` : '';
        const prep = mv.readiness != null ? `ready:${mv.readiness.toFixed(2)} settle:${(mv.settle ?? 0).toFixed(2)}s d:${(mv.commitDist ?? 0).toFixed(2)} ${mv.locomotionMode ?? ''}  ` : '';
        const eta = mv.opponentETA != null ? `oppETA:${mv.opponentETA.toFixed(3)}s  ` : '';
        const pred = mv.predCrossX != null ? `predX:${mv.predCrossX}  ` : '';
        const tgt = mv.hitTarget ? `hit(${mv.hitTarget.x},${mv.hitTarget.y})@${mv.hitTarget.t}s` : '';
        lines.push(`│  │  Move: ${mv.courtMode}${mv.transitionCooldown ? ` cd:${mv.transitionCooldown}` : ''}  ${arr}${prep}${eta}${pred}${tgt}`.trimEnd());
      }
      if (s.top5?.length) {
        lines.push(`│  ├ Candidatos:`);
        for (let ci = 0; ci < s.top5.length; ci++) {
          const c   = s.top5[ci];
          const st  = c.isChosen ? '★' : '○';
          const low = c.isChosen && ci >= 4 ? ' ⤵softmax' : '';
          lines.push(
            `│  │  ${st} ${c.shotType.padEnd(13)} ${c.dir.padEnd(5)} ${c.depth.padEnd(6)} ${c.width.padEnd(7)}` +
            ` P:${c.power}%  EV:${c.ev.toFixed(3)} [S:${c.safety.toFixed(2)} P:${c.pressure.toFixed(2)} F:${c.finish.toFixed(2)} R:${c.rhythm.toFixed(2)}]` +
            `${c.tags.length ? '  [' + c.tags.join(',') + ']' : ''}${low}`
          );
        }
      }
      if (s.overrideInfo) {
        lines.push(`│  ├ EV:${s.overrideInfo.evType} → Exec:${s.shotType}  dir:${s.target.dir}  depth:${s.target.depth}  alvo(${s.target.x},${s.target.y})  ${s.power}km/h  spin:${s.spin ?? '?'}  ⚠️${s.overrideInfo.reason}`);
      } else {
        const spinStr = s.spin != null
          ? `${s.spin}${s.spinX != null ? ` x:${Number(s.spinX).toFixed(1)}` : ''}${s.spinZ != null ? ` z:${Number(s.spinZ).toFixed(1)}` : ''}`
          : '?';
        const tags = s.identityTags?.length ? `  tags:${s.identityTags.join('/')}` : '';
        const clear = s.netClearance != null ? `  net:${Number(s.netClearance).toFixed(2)}m` : '';
        const launch = s.launchKmh != null ? `  v0:${s.launchKmh}km/h` : '';
        lines.push(`│  ├ ${s.shotType}  dir:${s.target.dir}  depth:${s.target.depth}  width:${s.target.width}  alvo(${s.target.x},${s.target.y})  ${s.power}km/h${launch}${clear}  spin:${spinStr}${s.spinEffective ? ` (${s.spinEffective})` : ''}${tags}`);
      }
      if (s.whyChosen) lines.push(`│  │  Motivo: "${s.whyChosen}"`);
      if (s.bounce) {
        const errStr = s.landErr != null ? `  err:${s.landErr}m` : '';
        const post = s.bounce.postKmh != null ? `  pós:${s.bounce.postKmh}km/h` : '';
        const maxZ = s.maxZ != null ? `  maxZ:${s.maxZ}m` : '';
        const forced = s.forcedErrorKind ? `  forced:${s.forcedErrorKind}` : '';
        lines.push(`│  └ Caiu(${s.bounce.x},${s.bounce.y}) [${s.bounce.zone}]${errStr}${maxZ}${post}${forced}${s.outcome ? '  → ' + s.outcome : ''}`);
      } else {
        lines.push(`│  └ sem quique`);
      }
    }

    lines.push('│');
    const wt = pt.winnerType ? `  [${pt.winnerType}]` : '';
    lines.push(`└─ ${pt.endReason}${wt}  "${pt.endDetail}"  Venceu:${pt.winner}  Rally:${pt.rally}`);

    if (pt.summary) {
      const sm = pt.summary;
      lines.push(`   Dir: CC:${sm.ccPct}% DTL:${sm.dtlPct}% BODY:${sm.bodyPct}%  |  Dep: DEEP:${sm.deepPct}% MID:${sm.midPct}% SHORT:${sm.shortPct}%`);
      lines.push(`   Shots:${sm.totalShots}  AvgQ:${(sm.avgQuality*100).toFixed(0)}%  AvgP:${sm.avgPower}km/h  Max:${sm.maxSpeed}km/h  AvgMom:${(sm.avgMomentum*100).toFixed(0)}%`);
      lines.push(`   Física: MaxV0:${sm.maxLaunchKmh ?? sm.maxSpeed}km/h  MaxZ:${sm.maxZ ?? '?'}m  Shots:${_fmtCounts(sm.shotTypes)}`);
      lines.push(`   Intent: ${_fmtCounts(sm.intentCounts)}  Body: ${_fmtCounts(sm.bodyStates)}${Object.keys(sm.forcedErrors ?? {}).length ? `  Forced:${_fmtCounts(sm.forcedErrors)}` : ''}`);
      if (sm.avgArrivalMargin != null || sm.movementStates?.length) {
        lines.push(`   Move: states=${(sm.movementStates ?? []).join('/') || '—'}${sm.avgArrivalMargin != null ? `  avgArrival:${sm.avgArrivalMargin}s` : ''}`);
      }
      lines.push(`   Spin: ${Object.entries(sm.spinDistribution ?? {}).map(([k,v])=>`${k}:${v}`).join(' ')}`);
      if (sm.dominantPattern) lines.push(`   Padrão: ${sm.dominantPattern}${sm.patternBroken ? '  ⚡quebrado' : ''}`);
      if (sm.hadApproach) lines.push(`   ↑ Subida à rede (${sm.netAttempts} vol(s))`);
    }
  }

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  return lines.join('\n');
}

function _countBy(values) {
  return values.reduce((acc, value) => {
    if (value == null || value === '') return acc;
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function _fmtCounts(obj = {}) {
  const entries = Object.entries(obj);
  if (!entries.length) return '—';
  return entries.map(([k, v]) => `${k}:${v}`).join(' ');
}

function _spinEffectiveLabel(spinX, velY) {
  if (spinX == null || Math.abs(spinX) < 0.35) return 'flat/neutral';
  const eff = spinX * (-(Math.sign(velY) || 1));
  if (eff > 0.35) return 'topspin';
  if (eff < -0.35) return 'backspin';
  return 'flat/neutral';
}

function _syncOpenShotTelemetry(gs) {
  const shot = gs?.trace?._lastShot;
  const meta = gs?.ball?._lastShotMeta;
  if (!shot || !meta) return;
  if (meta.maxZ != null) shot.maxZ = +meta.maxZ.toFixed(2);
  if (meta.forcedErrorKind != null) shot.forcedErrorKind = meta.forcedErrorKind;
  if (meta.missChance != null && shot.missChance == null) shot.missChance = meta.missChance;
}

// ─── traceStats — resumo agregado do jogo ─────────────────────
export function traceStats(gs) {
  if (!gs.trace) return null;
  const agg = gs.trace._agg;
  if (agg.totalPoints === 0) return null;

  const avg = arr => arr.length ? Math.round(arr.reduce((s,v)=>s+v,0)/arr.length) : null;
  const pct = (a, b) => b > 0 ? +(a / b * 100).toFixed(1) : null;

  return {
    totalPoints:    agg.totalPoints,
    winners:        agg.winners,
    unforcedErrors: agg.unforcedErrors,
    forcedErrors:   agg.forcedErrors,
    aces:           agg.aces,
    doubleFaults:   agg.doubleFaults,
    breakPoints: {
      played:    agg.breakPointsPlayed,
      converted: agg.breakPointsConverted,
      pct:       pct(agg.breakPointsConverted, agg.breakPointsPlayed),
    },
    serveSpeed: [
      { avg1st: avg(agg.serveKmh1[0]), avg2nd: avg(agg.serveKmh2[0]), max1st: Math.max(0, ...agg.serveKmh1[0]) },
      { avg1st: avg(agg.serveKmh1[1]), avg2nd: avg(agg.serveKmh2[1]), max1st: Math.max(0, ...agg.serveKmh1[1]) },
    ],
    rallyLengths: agg.rallyLenBuckets,
    netPlay: [
      { attempts: agg.netApproaches[0], won: agg.netWon[0], pct: pct(agg.netWon[0], agg.netApproaches[0]) },
      { attempts: agg.netApproaches[1], won: agg.netWon[1], pct: pct(agg.netWon[1], agg.netApproaches[1]) },
    ],
  };
}

// ─── traceServeDump ───────────────────────────────────────────
export function traceServeDump(gs) {
  if (!gs.trace) return '[ sem dados de trace ]';
  const pts = gs.trace.points.filter(p => p.serve);
  if (pts.length === 0) return '[ nenhum ponto com saque registrado ]';

  const lines = [];
  lines.push('╔══════════════════════════════════════════════════════════════');
  lines.push(`║  SERVE TRACE — ${pts.length} ponto(s) (jogo completo)`);
  lines.push('╚══════════════════════════════════════════════════════════════');

  const aggFor = (serverId) => {
    const mine = pts.filter(p => p.serverId === serverId);
    const a = {
      total: 0, won: 0, aces: 0, dfs: 0,
      first: 0, firstWon: 0, second: 0, secondWon: 0,
      avgKmh1: [], avgKmh2: [],
      byDir: {}, byType: {},
      rallyWon: { '0': {w:0,n:0}, '1': {w:0,n:0}, '2-4': {w:0,n:0}, '5-9': {w:0,n:0}, '10+': {w:0,n:0} },
      bpFaced: 0, bpSaved: 0,
    };
    for (const pt of mine) {
      const sv = pt.serve;
      a.total++;
      if (sv.serverWon) a.won++;
      if (sv.isAce) a.aces++;
      if (sv.isDF)  a.dfs++;
      if (pt.isBreakPoint) { a.bpFaced++; if (sv.serverWon) a.bpSaved++; }
      if (sv.isFirst !== false) {
        a.first++; if (sv.serverWon) a.firstWon++;
        if (sv.kmh) a.avgKmh1.push(sv.kmh);
      } else {
        a.second++; if (sv.serverWon) a.secondWon++;
        if (sv.kmh) a.avgKmh2.push(sv.kmh);
      }
      const dir = sv.dir ?? 'T';
      if (!a.byDir[dir]) a.byDir[dir] = {w:0,l:0};
      if (sv.serverWon) a.byDir[dir].w++; else a.byDir[dir].l++;
      const tp = sv.physType ?? 'FLAT';
      if (!a.byType[tp]) a.byType[tp] = {w:0,l:0};
      if (sv.serverWon) a.byType[tp].w++; else a.byType[tp].l++;
      const rl = sv.rallyLen ?? 0;
      const rb = rl === 0 ? '0' : rl === 1 ? '1' : rl <= 4 ? '2-4' : rl <= 9 ? '5-9' : '10+';
      if (!a.rallyWon[rb]) a.rallyWon[rb] = {w:0,n:0};
      a.rallyWon[rb].n++; if (sv.serverWon) a.rallyWon[rb].w++;
    }
    return a;
  };

  const pct = (a, b) => b > 0 ? Math.round(a / b * 100) + '%' : 'N/A';
  const avg = arr => arr.length ? Math.round(arr.reduce((s,v)=>s+v,0)/arr.length) : 0;
  const max = arr => arr.length ? Math.max(...arr) : 0;

  for (const sid of [0, 1]) {
    const a    = aggFor(sid);
    const name = gs.players[sid]?.name ?? `P${sid}`;
    lines.push('');
    lines.push(`┌─ ${name.toUpperCase()} ────────────────────────────────────────────`);
    lines.push(`│  Games sacados: ${a.total}  ganhos:${a.won} (${pct(a.won, a.total)})`);
    lines.push(`│  Aces: ${a.aces}   Duplas faltas: ${a.dfs}`);
    lines.push(`│  Break pts enfrentados: ${a.bpFaced}  salvos: ${a.bpSaved} (${pct(a.bpSaved, a.bpFaced)})`);
    lines.push(`│  1º SAQUE: ${a.first} pts  ganhos:${a.firstWon} (${pct(a.firstWon, a.first)})  avg:${avg(a.avgKmh1)} max:${max(a.avgKmh1)} km/h`);
    lines.push(`│  2º SAQUE: ${a.second} pts  ganhos:${a.secondWon} (${pct(a.secondWon, a.second)})  avg:${avg(a.avgKmh2)} max:${max(a.avgKmh2)} km/h`);
    lines.push('│  Por direção:');
    for (const [d, c] of Object.entries(a.byDir)) {
      const tot = c.w + c.l; if (!tot) continue;
      lines.push(`│    ${d.padEnd(6)}: ${c.w}/${tot} (${pct(c.w, tot)})`);
    }
    lines.push('│  Por tipo:');
    for (const [tp, c] of Object.entries(a.byType)) {
      const tot = c.w + c.l; if (!tot) continue;
      lines.push(`│    ${tp.padEnd(8)}: ${c.w}/${tot} (${pct(c.w, tot)})`);
    }
    lines.push('│  Por duração rally:');
    for (const [range, c] of Object.entries(a.rallyWon)) {
      if (!c.n) continue;
      lines.push(`│    bolas ${range.padEnd(4)}: ${c.w}/${c.n} (${pct(c.w, c.n)})`);
    }
    lines.push('└────────────────────────────────────────────────────────────');
  }

  lines.push('');
  lines.push('┌─ HISTÓRICO ────────────────────────────────────────────────');
  for (const pt of pts) {
    const sv  = pt.serve;
    const tag = sv.isDF   ? '[DF]        '
              : sv.isAce  ? `[ACE ${sv.kmh ?? '?'}km/h ]`
              : sv.kmh    ? `[${sv.isFirst?'1º':'2º'} ${(sv.physType??'FLAT').padEnd(5)} ${sv.kmh}km/h]`
              : '[?]         ';
    const dir = (sv.dir ?? '?').padEnd(4);
    const out = sv.serverWon ? '✓' : '✗';
    const bp  = pt.isBreakPoint ? ' ⚡BP' : '';
    const sp  = pt.isSetPoint   ? ' 🏆SP' : '';
    const mp  = pt.isMatchPoint ? ' 🎯MP' : '';
    const ret = sv.returnQuality != null ? `  ret:${(sv.returnQuality*100).toFixed(0)}%` : '';
    lines.push(
      `│  #${String(pt.pointId).padStart(3)} ${pt.set} ${pt.game} ${pt.score.padEnd(7)}` +
      ` ${tag} ${dir} ${out} rally:${sv.rallyLen ?? '?'}${bp}${sp}${mp}${ret}  [${pt.winner}]`
    );
  }
  lines.push('└────────────────────────────────────────────────────────────');
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// Helpers privados
// ═══════════════════════════════════════════════════════════════

function _pressureLabel(isMatchPoint, isSetPoint, isBreakPoint, isGamePoint) {
  if (isMatchPoint) return 'MATCH POINT';
  if (isSetPoint)   return 'SET POINT';
  if (isBreakPoint) return 'BREAK POINT';
  if (isGamePoint)  return 'GAME POINT';
  return null;
}

function _classifyWinner(lastShot) {
  if (!lastShot) return 'WINNER';
  const atNet = lastShot.atNet;
  const type  = lastShot.shotType ?? '';
  if (atNet) {
    if (type.includes('VOLLEY') || type.includes('SMASH')) return 'NET_WINNER';
    return 'PASSING_SHOT';
  }
  if (type === 'DROP_SHOT') return 'DROP_WINNER';
  if (type === 'SMASH')     return 'SMASH_WINNER';
  const dir = lastShot.target?.dir;
  if (dir === 'DTL') return 'WINNER_DTL';
  if (dir === 'CC')  return 'WINNER_CC';
  return 'WINNER_BODY';
}

function _bounceZone(x, y) {
  const ax    = Math.abs(x);
  const ay    = Math.abs(y);
  const depth = ay > 11.885 * 0.78 ? 'DEEP' : ay > 11.885 * 0.45 ? 'MID' : 'SHORT';
  const width = ax > 2.8 ? 'WIDE' : ax > 1.2 ? 'MID' : 'CENTRE';
  return `${depth}_${width}`;
}

function _dirFrom(targetX, playerId) {
  const absX = Math.abs(targetX);
  if (absX <= 1.5) return 'BODY';
  const sign = targetX * (playerId === 0 ? 1 : -1);
  return sign > 0 ? 'DTL' : 'CC';
}

function _intentReason(intent, sc, quality) {
  if (!sc) return intent;
  if (intent === 'RESET') {
    if (sc.ballTier === 'DIFFICULT') return 'bola difícil → recuperar posição';
    if (sc.toughBall)                return 'bola difícil → recuperar posição';
    return 'sob pressão → priorizar segurança';
  }
  if (intent === 'BUILD')    return sc.easyBall ? 'construir pressão' : 'início de rally → paciência';
  if (intent === 'PRESSURE') {
    if (sc.oppOut > 0.45) return `oponente deslocado (${(sc.oppOut*100).toFixed(0)}%) → pressionar`;
    if ((sc.momentum ?? 0.5) > 0.60) return 'momentum alto → pressionar';
    if (sc.ballTier === 'OPPORTUNITY' || sc.easyBall) return 'bola fácil → pressionar';
    return 'construindo pressão';
  }
  if (intent === 'FINISH') {
    if (sc.ballTier === 'OPPORTUNITY' && sc.oppOut > 0.50) return 'posição dominante + quadra aberta → winner';
    return 'bola fácil + controle → tentar winner';
  }
  if (intent === 'APPROACH') return 'bola curta → subir à rede';
  return intent;
}

function _whyChosen(chosen, sc, top5, chosenDirLabel) {
  if (!chosen) return null;
  const parts   = [];
  const chosen5 = top5?.find(c => c.isChosen);
  if (!sc) return `${chosen.shotType} escolhido pelo sistema`;
  const tags = chosen.intentTags ?? [];
  if (tags.includes('BREAK_PATTERN'))  parts.push('quebrou padrão');
  if (tags.includes('OPEN'))           parts.push('quadra aberta');
  if (tags.includes('APPROACH'))       parts.push('sobe à rede');
  if (chosenDirLabel === 'CC')         parts.push('cross-court');
  else if (chosenDirLabel === 'DTL')   parts.push('down-the-line');
  else {
    if (tags.includes('CC'))  parts.push('cross-court');
    if (tags.includes('DTL')) parts.push('down-the-line');
  }
  if (tags.includes('DEEP'))           parts.push('profundo');
  if (tags.includes('DROP'))           parts.push('drop shot tático');
  if (tags.includes('SAFE'))           parts.push('margem segura');
  if (sc.ballTier === 'DIFFICULT' || sc.toughBall) parts.push('bola difícil → priorizou segurança');
  if ((sc.ballTier === 'OPPORTUNITY' || sc.easyBall) && sc.inControl && sc.oppOut > 0.45) parts.push('vantagem clara → ataque');
  else if (sc.ballTier === 'OPPORTUNITY' || sc.easyBall) parts.push('bola fácil');
  if (sc.oppVeryDeep)                  parts.push('oponente recuado');
  if (sc.oppOut > 0.50)                parts.push(`oponente fora (${(sc.oppOut*100).toFixed(0)}%)`);
  if (parts.length === 0 && chosen5) {
    const best = Object.entries({ segurança: chosen5.safety, pressão: chosen5.pressure, finalização: chosen5.finish, ritmo: chosen5.rhythm })
      .sort((a, b) => b[1] - a[1])[0];
    parts.push(`melhor ${best[0]} (${best[1].toFixed(2)})`);
  }
  return parts.join(' + ') || (chosen?.c?.shotType ? `${chosen.c.shotType} por EV máximo` : 'EV máximo');
}

function _detectPatterns(shots) {
  if (shots.length < 3) return { broken: false, dominant: null };
  let runs = [], cur = shots[0]?.target?.dir, cnt = 1;
  for (let i = 1; i < shots.length; i++) {
    const d = shots[i]?.target?.dir;
    if (d === cur) { cnt++; } else { runs.push({ dir: cur, len: cnt }); cur = d; cnt = 1; }
  }
  runs.push({ dir: cur, len: cnt });
  const broken   = runs.some(r => r.len >= 2) && runs.length > 1;
  const dominant = runs.sort((a, b) => b.len - a.len)[0];
  return { broken, dominant: dominant?.len >= 2 ? `${dominant.dir} ×${dominant.len}` : null };
}

function _traceRatingSnapshot(player) {
  if (!player) return null;
  const stats = player.stats ?? {};
  const shotCount = Math.max(
    player.shotCount ?? 0,
    stats.qualityCount ?? 0,
    (stats.attackShots ?? 0) + (stats.defenseShots ?? 0),
  );
  const rating = computeRating(stats, Math.max(shotCount, 1));
  return {
    playerId: player.id,
    player: player.name,
    score: rating?.score ?? null,
    tier: rating?.tier?.label ?? null,
  };
}

