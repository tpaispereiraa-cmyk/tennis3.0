function clampCount(value, fallback) {
  const num = Number.isFinite(value) ? Math.floor(value) : fallback;
  return Math.max(1, num);
}

function fmtNum(value, digits = 2) {
  return Number.isFinite(value) ? Number(value).toFixed(digits) : '?';
}

function fmtPct(value) {
  return Number.isFinite(value) ? `${Math.round(value * 100)}%` : '?';
}

function fmtBodyAlignment(value) {
  if (!value) return '?';
  if (typeof value === 'string') return value;
  if (typeof value !== 'object') return String(value);

  const parts = [];
  if (value.status) parts.push(value.status);
  if (typeof value.crossBodyFlip === 'boolean') parts.push(`flip:${value.crossBodyFlip ? 'Y' : 'N'}`);
  if (Number.isFinite(value.contactWidth)) parts.push(`cW:${fmtNum(value.contactWidth)}`);
  if (Number.isFinite(value.targetWidth)) parts.push(`tW:${fmtNum(value.targetWidth)}`);
  return parts.join(' ') || '?';
}

function scoreLabel(score) {
  return ['0', '15', '30', '40', 'Ad'][score] ?? '?';
}

function pointScoreLabel(gs) {
  if (!gs?.players?.length) return '?';
  if (gs.inTiebreak) return `TB ${gs.tbScore?.[0] ?? 0}-${gs.tbScore?.[1] ?? 0}`;
  return `${scoreLabel(gs.players[0]?.score)}-${scoreLabel(gs.players[1]?.score)}`;
}

function matchScoreLabel(gs) {
  const p0 = gs?.players?.[0];
  const p1 = gs?.players?.[1];
  if (!p0 || !p1) return '?';
  return `sets ${p0.sets}-${p1.sets}  games ${p0.games}-${p1.games}  points ${pointScoreLabel(gs)}`;
}

function createMirrorLogArray(gs, channel) {
  const arr = [];
  arr.push = (...items) => {
    let len = arr.length;
    for (const item of items) {
      const text = typeof item === 'string' ? item : String(item);
      len = Array.prototype.push.call(arr, text);
      appendUnifiedEvent(gs, 'legacy', channel, {
        summary: text,
      });
    }
    return len;
  };
  return arr;
}

function ensurePointBucket(gs, pointId) {
  const log = initUnifiedLog(gs);
  if (log.currentPoint?.pointId === pointId) return log.currentPoint;
  for (let i = log.points.length - 1; i >= 0; i--) {
    if (log.points[i]?.pointId === pointId) return log.points[i];
  }
  return null;
}

function trimBuffer(list, max) {
  while (list.length > max) list.shift();
}

export function initUnifiedLog(gs) {
  if (!gs) return null;
  if (gs.unifiedLog) return gs.unifiedLog;

  gs.unifiedLog = {
    nextEventId: 0,
    nextPointId: 0,
    events: [],
    points: [],
    currentPoint: null,
    rejectDedup: new Map(),
    maxEvents: 8000,
    maxPoints: 500,
    maxPointEvents: 220,
  };

  gs.log = createMirrorLogArray(gs, 'log');
  gs.techLog = [];
  if (!Array.isArray(gs._ptBuf)) gs._ptBuf = [];
  return gs.unifiedLog;
}

export function appendUnifiedEvent(gs, category, stage, payload = {}) {
  const log = initUnifiedLog(gs);
  if (!log) return null;

  const pointId = payload.pointId ?? log.currentPoint?.pointId ?? null;
  const event = {
    id: ++log.nextEventId,
    pointId,
    rally: gs?.rally ?? 0,
    gameState: gs?.gameState ?? null,
    category,
    stage,
    playerId: payload.playerId ?? null,
    playerName: payload.playerName ?? null,
    summary: payload.summary ?? `${category}:${stage}`,
    lines: Array.isArray(payload.lines) ? payload.lines.filter(Boolean).map(String) : [],
    data: payload.data ?? null,
  };

  log.events.push(event);
  trimBuffer(log.events, log.maxEvents);

  if (pointId != null) {
    const point = ensurePointBucket(gs, pointId);
    if (point) {
      point.events.push(event);
      trimBuffer(point.events, log.maxPointEvents);
    }
  }

  return event;
}

export function startUnifiedPoint(gs) {
  const log = initUnifiedLog(gs);
  if (!log) return null;
  log.rejectDedup = new Map();

  const p0 = gs.players?.[0];
  const p1 = gs.players?.[1];
  const point = {
    pointId: ++log.nextPointId,
    live: true,
    startedAtEvent: log.nextEventId + 1,
    startScore: matchScoreLabel(gs),
    serverId: gs.server,
    serverName: gs.players?.[gs.server]?.name ?? '?',
    receiverName: gs.players?.[1 - gs.server]?.name ?? '?',
    pressure: gs.inTiebreak ? `TB ${gs.tbScore?.[0] ?? 0}-${gs.tbScore?.[1] ?? 0}` : null,
    players: [
      p0 ? { name: p0.name, stamina: p0.stamina ?? 1 } : null,
      p1 ? { name: p1.name, stamina: p1.stamina ?? 1 } : null,
    ],
    serve: null,
    shots: [],
    bounces: [],
    events: [],
    outcome: null,
  };

  log.currentPoint = point;
  appendUnifiedEvent(gs, 'point', 'start', {
    pointId: point.pointId,
    summary: `Ponto ${point.pointId} iniciado`,
    lines: [
      `placar ${point.startScore}`,
      `sacador ${point.serverName} | recebedor ${point.receiverName}`,
      `stamina ${point.players.map(p => (p ? `${p.name}:${fmtPct(p.stamina)}` : '?')).join('  ')}`,
    ],
  });
  return point;
}

export function finishUnifiedPoint(gs, winnerIdx, reason, meta = {}) {
  const log = initUnifiedLog(gs);
  const point = log?.currentPoint;
  if (!log || !point) return null;

  point.live = false;
  point.outcome = {
    winnerIdx,
    winnerName: gs.players?.[winnerIdx]?.name ?? '?',
    reason,
    rally: meta.rally ?? gs.rally ?? 0,
    isWinner: !!meta.isWinner,
  };

  appendUnifiedEvent(gs, 'point', 'end', {
    pointId: point.pointId,
    playerId: winnerIdx,
    playerName: point.outcome.winnerName,
    summary: `${point.outcome.winnerName} venceu o ponto`,
    lines: [
      `motivo ${reason}`,
      `rally ${point.outcome.rally}`,
      `placar antes do update ${matchScoreLabel(gs)}`,
    ],
  });

  log.points.push(point);
  trimBuffer(log.points, log.maxPoints);
  log.currentPoint = null;
  return point;
}

export function logMovementState(gs, player, payload = {}) {
  if (!gs || !player) return null;
  const lines = [
    `estado ${payload.prevState ?? '?'} -> ${payload.state ?? '?'}`,
    `court ${player.ctx?.courtMode ?? 'BASE'} | locomotion ${player._locomotionMode ?? '?'}`,
    `arrival ${fmtNum(player._arrivalMargin)}s | contact ${player._movementContactClass ?? 'NONE'}`,
  ];
  if (payload.target) {
    lines.push(`target (${fmtNum(payload.target.x)}, ${fmtNum(payload.target.y)})`);
  }
  if (player._contactPoint) {
    lines.push(`contactPoint (${fmtNum(player._contactPoint.x)}, ${fmtNum(player._contactPoint.y)}, z=${fmtNum(player._contactPoint.z)})`);
  }
  if (player._contactPocketSource) {
    lines.push(`pocket ${player._contactPocketSource} | behind ${fmtNum(player._contactPocketBehind)}`);
  }

  return appendUnifiedEvent(gs, 'movement', 'state', {
    playerId: player.id,
    playerName: player.name,
    summary: `${player.name}: ${payload.prevState ?? 'INIT'} -> ${payload.state ?? '?'}`,
    lines,
    data: {
      state: payload.state ?? null,
      prevState: payload.prevState ?? null,
      target: payload.target ?? null,
    },
  });
}

export function logHitRejection(gs, player, reason, lines = []) {
  if (!gs || !player) return null;
  const log = initUnifiedLog(gs);
  const pointId = log?.currentPoint?.pointId ?? -1;
  const key = `${pointId}:${player.id}:${reason}`;
  const prev = log?.rejectDedup?.get(key);

  if (prev) {
    prev.count += 1;
    prev.lines = lines;
    log.rejectDedup.set(key, prev);
    if (prev.count % 6 !== 1) return null;
    lines = [`repeticoes ${prev.count}`, ...lines];
  } else {
    log?.rejectDedup?.set(key, { count: 1, lines });
  }

  return appendUnifiedEvent(gs, 'hit', 'reject', {
    playerId: player.id,
    playerName: player.name,
    summary: `${player.name} nao bateu: ${reason}`,
    lines,
  });
}

export function logServeDecision(gs, server, serveExec) {
  if (!gs || !server || !serveExec?.serve) return null;
  const log = initUnifiedLog(gs);
  if (log?.currentPoint) {
    log.currentPoint.serve = {
      ...serveExec.serve,
      picked: serveExec.ev?.picked?.c?.blueprint?.id ?? null,
    };
  }

  const ranking = (serveExec.ev?.scored ?? [])
    .slice(0, 5)
    .map(entry => {
      const id = entry?.c?.blueprint?.id ?? '?';
      const score = Number.isFinite(entry?.score) ? entry.score.toFixed(3) : '?';
      return `${id}:${score}`;
    });

  return appendUnifiedEvent(gs, 'serve', 'select', {
    playerId: server.id,
    playerName: server.name,
    summary: `${server.name} escolheu ${serveExec.serve.id} ${serveExec.serve.dir} ${serveExec.serve.kmh}km/h`,
    lines: [
      `tipo ${serveExec.serve.physType} | ${serveExec.serve.isSecond ? '2o saque' : '1o saque'} | intent ${serveExec.serve.intent}`,
      `target (${fmtNum(serveExec.serve.targetX)}, ${fmtNum(serveExec.serve.targetY)}) | clearance ${fmtNum(serveExec.serve.netClearance)}m`,
      `faultMode ${serveExec.serve.faultMode ?? 'none'} | sigmaX ${fmtNum(serveExec.serve.sigmaX, 3)} | serveSQ ${fmtNum(serveExec.serve.serveSQ, 3)}`,
      ranking.length ? `ranking ${ranking.join('  ')}` : null,
    ],
    data: serveExec.serve,
  });
}

export function logShotPipeline(gs, player, payload = {}) {
  if (!gs || !player) return null;
  const lines = Array.isArray(payload.lines) ? payload.lines : [];
  return appendUnifiedEvent(gs, 'shot', payload.stage ?? 'pipeline', {
    playerId: player.id,
    playerName: player.name,
    summary: payload.summary ?? `${player.name} pipeline de shot`,
    lines,
    data: payload.data ?? null,
  });
}

export function logShotExecution(gs, player, shot, payload = {}) {
  if (!gs || !player || !shot) return null;
  const log = initUnifiedLog(gs);
  if (log?.currentPoint) {
    log.currentPoint.shots.push({
      hitterId: player.id,
      hitterName: player.name,
      type: shot.type,
      family: shot.family,
      subtype: shot.subtype ?? null,
      targetX: shot.targetX,
      targetY: shot.targetY,
      quality: payload.effectiveQuality ?? shot.effectiveQuality ?? null,
    });
  }

  const familyRanking = shot.familyScores
    ? Object.entries(shot.familyScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([key, value]) => `${key}:${fmtNum(value, 3)}`)
    : [];
  const subtypeRanking = (shot.subtypeScores ?? [])
    .slice(0, 4)
    .map(entry => `${entry.subtype}:${fmtNum(entry.score, 3)}`);
  const redirectLine = shot.redirectReason
    ? `redirect ${shot.redirectReason}${shot.redirectFrom ? ` <- ${shot.redirectFrom}` : ''}`
    : null;

  return appendUnifiedEvent(gs, 'shot', 'execute', {
    playerId: player.id,
    playerName: player.name,
    summary: `${player.name} bateu ${shot.type}${shot.subtype ? `/${shot.subtype}` : ''} q=${fmtNum(payload.effectiveQuality ?? shot.effectiveQuality, 3)}`,
    lines: [
      `family ${shot.family} | zone ${shot.zone ?? '?'} | band ${shot.qualityBand ?? '?'}`,
      `target (${fmtNum(shot.targetX)}, ${fmtNum(shot.targetY)}) | power ${fmtNum(shot.power * 3.6, 1)}km/h | net ${fmtNum(shot.netClearance)}m`,
      `body ${fmtBodyAlignment(shot.bodyAlignment)} | errorMode ${shot.errorMode ?? 'CLEAN'} | flight ${shot.flightValidation?.status ?? '?'}`,
      redirectLine,
      familyRanking.length ? `families ${familyRanking.join('  ')}` : null,
      subtypeRanking.length ? `subtypes ${subtypeRanking.join('  ')}` : null,
      payload.contactSummary ?? null,
    ],
    data: {
      type: shot.type,
      family: shot.family,
      subtype: shot.subtype ?? null,
      targetX: shot.targetX,
      targetY: shot.targetY,
      quality: payload.effectiveQuality ?? shot.effectiveQuality ?? null,
    },
  });
}

export function logBounceEvent(gs, ball, payload = {}) {
  if (!gs || !ball) return null;
  const log = initUnifiedLog(gs);
  if (log?.currentPoint) {
    log.currentPoint.bounces.push({
      x: ball.pos?.x ?? null,
      y: ball.pos?.y ?? null,
      z: ball.pos?.z ?? null,
      bounceCount: ball.bounceCount ?? 0,
    });
  }

  const telemetry = payload.bounceTelemetry ?? {};
  return appendUnifiedEvent(gs, 'ball', 'bounce', {
    playerId: ball.lastHitBy ?? null,
    playerName: ball.lastHitBy != null ? gs.players?.[ball.lastHitBy]?.name ?? null : null,
    summary: `quique #${ball.bounceCount ?? '?'} em (${fmtNum(ball.pos?.x)}, ${fmtNum(ball.pos?.y)})`,
    lines: [
      `vel (${fmtNum(ball.vel?.x)}, ${fmtNum(ball.vel?.y)}, ${fmtNum(ball.vel?.z)})`,
      Number.isFinite(telemetry.exitSpeedKmh) ? `exit ${fmtNum(telemetry.exitSpeedKmh, 1)}km/h | apex ${fmtNum(telemetry.apexHeight)}m` : null,
      Number.isFinite(telemetry.nextBounceTime) ? `nextBounce t=${fmtNum(telemetry.nextBounceTime, 3)}s @ (${fmtNum(telemetry.nextBounceX)}, ${fmtNum(telemetry.nextBounceY)})` : null,
    ],
    data: {
      x: ball.pos?.x ?? null,
      y: ball.pos?.y ?? null,
      z: ball.pos?.z ?? null,
      bounceCount: ball.bounceCount ?? 0,
    },
  });
}

function renderPoint(point, detailLimit) {
  const lines = [];
  lines.push(`POINT #${point.pointId}${point.live ? ' [LIVE]' : ''}`);
  lines.push(`score ${point.startScore} | server ${point.serverName}`);
  for (const event of point.events) {
    const who = event.playerName ? `[${event.playerName}] ` : '';
    lines.push(`- ${event.category}/${event.stage} ${who}${event.summary}`);
    for (const detail of event.lines.slice(0, detailLimit)) {
      lines.push(`    ${detail}`);
    }
  }
  if (point.outcome) {
    lines.push(`outcome ${point.outcome.winnerName} | ${point.outcome.reason}`);
  }
  lines.push('');
  return lines;
}

export function generateUnifiedRealtimeLog(gs, pointLimit = 8, detailLimit = 5) {
  const log = gs?.unifiedLog;
  if (!log) return '[ sem dados do unified log ]';

  const limit = clampCount(pointLimit, 8);
  const detailCount = clampCount(detailLimit, 5);
  const completed = Array.isArray(log.points) ? log.points.slice(-limit) : [];
  const points = [...completed];
  if (log.currentPoint) points.push(log.currentPoint);
  if (!points.length) return '[ ainda nao ha pontos registrados ]';

  const lines = [];
  lines.push('UNIFIED PIPELINE LOG');
  lines.push('==============================');
  lines.push(matchScoreLabel(gs));
  lines.push(`janela ultimos ${limit} pontos${log.currentPoint ? ' + ponto ao vivo' : ''}`);
  lines.push('');
  const floating = log.events.filter(event => event.pointId == null).slice(-8);
  if (floating.length) {
    lines.push('MATCH EVENTS');
    lines.push('------------');
    for (const event of floating) {
      lines.push(`- ${event.category}/${event.stage} ${event.summary}`);
      for (const line of event.lines.slice(0, detailCount)) {
        lines.push(`    ${line}`);
      }
    }
    lines.push('');
  }
  for (const point of points) lines.push(...renderPoint(point, detailCount));
  return lines.join('\n');
}

export function generateUnifiedMatchLog(gs, pointLimit = 24, detailLimit = 6) {
  return generateUnifiedRealtimeLog(gs, pointLimit, detailLimit);
}
