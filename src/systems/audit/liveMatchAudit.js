import { clamp } from '../../core/math.js';

const MAX_EVENTS = 120;
const MAX_PINNED = 12;

function pct(n, d) {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

function mkPlayerAudit(player) {
  return {
    id: player.id,
    name: player.name,
    bigServerProfile: (player.attrs?.saqueForca ?? 0) >= 84,
    attackerProfile:
      (player.attrs?.fhPotencia ?? 0) >= 88 ||
      (player.attrs?.bhPotencia ?? 0) >= 84 ||
      (player.attrs?.topspin ?? 0) >= 88,
    eliteDefenseProfile:
      (player.attrs?.defesa ?? 0) >= 90 &&
      (player.attrs?.velocidade ?? 0) >= 88 &&
      (player.attrs?.leitura ?? 0) >= 86,
    touchProfile:
      (player.attrs?.slice ?? 0) >= 80 ||
      (player.prefs?.buildStyle === 'DROP_VARIATION') ||
      (player.prefs?.buildStyle === 'SLICE_CONTROL'),
    shotCounts: {},
    suspiciousReachStops: 0,
    suspiciousBounceReads: 0,
    shortPointLosses: 0,
    shortPointTotal: 0,
    holdPointsWon: 0,
    holdPointsTotal: 0,
    secondServeReturnWins: 0,
    secondServeReturnTotal: 0,
    secondServeWon: 0,
    secondServeTotal: 0,
    doubleFaultPoints: 0,
    weakAttackForces: 0,
  };
}

function ensureAudit(gs) {
  if (gs.liveAudit) return gs.liveAudit;
  const players = (gs.players ?? []).map(mkPlayerAudit);
  gs.liveAudit = {
    events: [],
    pinned: [],
    counters: {
      totalPoints: 0,
      totalShots: 0,
      shortRallies: 0,
      longRallies: 0,
      sliceFloatFlags: 0,
      weirdReachFlags: 0,
      secondServeFlags: 0,
      touchVoidFlags: 0,
      serveCollapseFlags: 0,
      attackVoidFlags: 0,
      patternFlags: 0,
      trajectoryFlags: 0,
    },
    players,
    _seenKeys: new Map(),
    updatedAt: Date.now(),
  };
  return gs.liveAudit;
}

function getPlayerAudit(gs, playerId) {
  const audit = ensureAudit(gs);
  let found = audit.players.find(p => p.id === playerId);
  if (!found) {
    const player = gs.players?.find(p => p.id === playerId);
    found = mkPlayerAudit(player ?? { id: playerId, name: `P${playerId}`, attrs: {}, prefs: {} });
    audit.players.push(found);
  }
  return found;
}

function pushEvent(gs, event) {
  const audit = ensureAudit(gs);
  const now = Date.now();
  const key = event.key ?? `${event.type}:${event.playerId ?? 'all'}:${event.title}`;
  const lastSeen = audit._seenKeys.get(key) ?? 0;
  const dedupeMs = event.dedupeMs ?? 7000;
  if (now - lastSeen < dedupeMs) return;
  audit._seenKeys.set(key, now);

  const payload = {
    ts: now,
    severity: event.severity ?? 'medium',
    type: event.type ?? 'audit',
    title: event.title,
    detail: event.detail,
    playerId: event.playerId ?? null,
    playerName: event.playerName ?? null,
    frameHint: gs.totalPoints ?? 0,
  };

  audit.events.push(payload);
  if (audit.events.length > MAX_EVENTS) audit.events.shift();

  if (payload.severity === 'high' || payload.severity === 'medium') {
    audit.pinned.push(payload);
    if (audit.pinned.length > MAX_PINNED) audit.pinned.shift();
  }
  audit.updatedAt = now;
}

function maybeFlagSecondServeReturn(gs, receiverAudit, receiver) {
  if (receiverAudit.secondServeReturnTotal < 8) return;
  const winPct = receiverAudit.secondServeReturnWins / receiverAudit.secondServeReturnTotal;
  const expectedFloor = (receiver.attrs?.devolucao ?? 60) >= 92 ? 0.46 : (receiver.attrs?.devolucao ?? 60) >= 86 ? 0.41 : 0.36;
  if (winPct >= expectedFloor) return;
  pushEvent(gs, {
    key: `second-serve-collapse:${receiver.id}`,
    type: 'return',
    severity: 'high',
    playerId: receiver.id,
    playerName: receiver.name,
    title: 'Retorno de 2º saque abaixo do perfil',
    detail: `${receiver.name} está vencendo só ${pct(receiverAudit.secondServeReturnWins, receiverAudit.secondServeReturnTotal)}% dos pontos no 2º saque apesar de devolução ${receiver.attrs?.devolucao ?? '?'}.`,
    dedupeMs: 12000,
  });
  ensureAudit(gs).counters.secondServeFlags++;
}

function maybeFlagSecondServeQuality(gs, serverAudit, server) {
  if (serverAudit.secondServeTotal < 8) return;
  const winPct = serverAudit.secondServeWon / serverAudit.secondServeTotal;
  const precision = server.attrs?.saquePrecisao ?? 60;
  const expectedFloor = precision >= 82 ? 0.50 : precision >= 74 ? 0.46 : 0.41;
  if (winPct >= expectedFloor) return;
  pushEvent(gs, {
    key: `second-serve-collapse-server:${server.id}`,
    type: 'serve',
    severity: 'high',
    playerId: server.id,
    playerName: server.name,
    title: '2º saque colapsando demais',
    detail: `${server.name} está ganhando só ${pct(serverAudit.secondServeWon, serverAudit.secondServeTotal)}% dos pontos de 2º saque com precisão ${precision}.`,
    dedupeMs: 12000,
  });
  ensureAudit(gs).counters.serveCollapseFlags++;
}

function maybeFlagShortPointProfile(gs, playerAudit, player) {
  if (!playerAudit.eliteDefenseProfile || playerAudit.shortPointTotal < 14) return;
  const lossPct = playerAudit.shortPointLosses / playerAudit.shortPointTotal;
  if (lossPct <= 0.60) return;
  pushEvent(gs, {
    key: `short-point-collapse:${player.id}`,
    type: 'defense',
    severity: 'medium',
    playerId: player.id,
    playerName: player.name,
    title: 'Defensor elite perdendo pontos cedo demais',
    detail: `${player.name} está perdendo ${pct(playerAudit.shortPointLosses, playerAudit.shortPointTotal)}% dos rallies curtos (1–3 bolas), o que sugere defesa/leitura subconvertidas.`,
    dedupeMs: 12000,
  });
}

function maybeFlagTouchVoid(gs, playerAudit, player) {
  if (!playerAudit.touchProfile) return;
  const totalShots = Object.values(playerAudit.shotCounts).reduce((sum, n) => sum + n, 0);
  if (totalShots < 60) return;
  const touchMix = (playerAudit.shotCounts.DROP ?? 0) + (playerAudit.shotCounts.SLICE_SHORT ?? 0);
  if (touchMix > 0) return;
  pushEvent(gs, {
    key: `touch-void:${player.id}`,
    type: 'shot-selection',
    severity: 'medium',
    playerId: player.id,
    playerName: player.name,
    title: 'Golpes de toque não aparecem',
    detail: `${player.name} já bateu ${totalShots} bolas, mas ainda não usou DROP nem SLICE_SHORT. Pode haver gate excessivo na decisão.`,
    dedupeMs: 16000,
  });
  ensureAudit(gs).counters.touchVoidFlags++;
}

function maybeFlagAttackVoid(gs, playerAudit, player) {
  if (!playerAudit.attackerProfile) return;
  const totalShots = Object.values(playerAudit.shotCounts).reduce((sum, n) => sum + n, 0);
  if (totalShots < 70) return;
  const finishMix =
    (playerAudit.shotCounts.ACCEL ?? 0) +
    (playerAudit.shotCounts.DRIVE ?? 0) +
    (playerAudit.shotCounts.BANANA ?? 0) +
    (playerAudit.shotCounts.SHORT_ACCEL ?? 0);
  if (finishMix >= Math.max(8, totalShots * 0.06)) return;
  pushEvent(gs, {
    key: `attack-void:${player.id}`,
    type: 'shot-selection',
    severity: 'medium',
    playerId: player.id,
    playerName: player.name,
    title: 'Ataque forte quase não aparece',
    detail: `${player.name} já bateu ${totalShots} bolas, mas quase não está usando golpes de aceleração/pressão. Pode haver gate ofensivo excessivo.`,
    dedupeMs: 15000,
  });
  ensureAudit(gs).counters.attackVoidFlags++;
}

export function initLiveMatchAudit(gs) {
  ensureAudit(gs);
}

export function auditRegisterShot(gs, player, shot, effectiveQuality) {
  const audit = ensureAudit(gs);
  const pa = getPlayerAudit(gs, player.id);
  pa.shotCounts[shot.type] = (pa.shotCounts[shot.type] ?? 0) + 1;
  audit.counters.totalShots++;

  if ((shot.type === 'DROP' || shot.type === 'SLICE_SHORT') && effectiveQuality < 0.4) {
    pushEvent(gs, {
      key: `low-quality-touch:${player.id}:${shot.type}`,
      type: 'shot-selection',
      severity: 'low',
      playerId: player.id,
      playerName: player.name,
      title: 'Toque tentado sob execução baixa',
      detail: `${player.name} escolheu ${shot.type} com qualidade ${Math.round(effectiveQuality * 100)}%. Vale observar se o gate está liberal demais em contexto ruim.`,
      dedupeMs: 6000,
    });
  }

  if ((shot.type === 'ACCEL' || shot.type === 'DRIVE' || shot.type === 'BANANA' || shot.type === 'SHORT_ACCEL') && effectiveQuality < 0.32) {
    pa.weakAttackForces++;
    if (pa.weakAttackForces >= 3) {
      pushEvent(gs, {
        key: `weak-attack-forcing:${player.id}`,
        type: 'shot-selection',
        severity: 'medium',
        playerId: player.id,
        playerName: player.name,
        title: 'Ataque forçado com qualidade muito baixa',
        detail: `${player.name} está insistindo em golpes de pressão com execução ruim. Isso pode indicar leitura tática agressiva demais.`,
        dedupeMs: 9000,
      });
    }
  }

  maybeFlagTouchVoid(gs, pa, player);
  maybeFlagAttackVoid(gs, pa, player);
}

export function auditRegisterHitGate(gs, player, reason, extra = null) {
  const pa = getPlayerAudit(gs, player.id);
  const defense = player.attrs?.defesa ?? 0;
  const reading = player.attrs?.leitura ?? 0;

  if (reason === 'preReachGate' && pa.eliteDefenseProfile && gs.ball?.bounceCount >= 1) {
    const d = Number(extra?.d ?? 999);
    const gate = Number(extra?.reachGate ?? 0);
    const ballZ = Number(extra?.ballZ ?? 0);
    const nearEdge = gate > 0 && d <= gate * 1.10;
    if (nearEdge && ballZ <= 1.9) {
      pa.suspiciousReachStops++;
      ensureAudit(gs).counters.weirdReachFlags++;
      pushEvent(gs, {
        key: `elite-reach-stop:${player.id}`,
        type: 'movement',
        severity: 'high',
        playerId: player.id,
        playerName: player.name,
        title: 'Defensor elite travado perto demais da bola',
        detail: `${player.name} (def ${defense}, leitura ${reading}) foi barrado a ${d.toFixed(2)}m com gate ${gate.toFixed(2)}m após quique. Isso parece perto demais para um perfil defensivo elite.`,
        dedupeMs: 9000,
      });
    }
  }

  if (reason === 'readsAsOut' && pa.eliteDefenseProfile) {
    pa.suspiciousBounceReads++;
  }

  if (reason === 'outsideEffectiveReach' && gs.rally === 0 && player.id === gs.receiver) {
    pushEvent(gs, {
      key: `return-unreachable:${player.id}`,
      type: 'serve',
      severity: 'low',
      playerId: player.id,
      playerName: player.name,
      title: 'Retorno ficou fora do reach',
      detail: `${player.name} ficou fora do reach efetivo no retorno. Isoladamente é normal; repetido demais pode indicar saque comprimindo exageradamente a defesa.`,
      dedupeMs: 7000,
    });
  }
}

export function auditRegisterBounce(gs, ball, bounceEntry) {
  const audit = ensureAudit(gs);
  const shotType = bounceEntry?.shotType ?? ball?._lastShotType ?? 'UNKNOWN';
  const outVz = Math.abs(ball?.vel?.z ?? 0);

  if ((shotType === 'SLICE' || shotType === 'HALF_VOLLEY' || shotType === 'SLICE_SHORT') && outVz > 6.2) {
    audit.counters.sliceFloatFlags++;
    pushEvent(gs, {
      key: `floaty-low-ball:${shotType}`,
      type: 'bounce',
      severity: 'medium',
      playerId: bounceEntry?.player ?? null,
      playerName: gs.players?.[bounceEntry?.player]?.name ?? null,
      title: 'Golpe baixo quicando alto demais',
      detail: `${shotType} saiu do quique com vz=${outVz.toFixed(2)}. Isso pode indicar arco/solver alto demais para golpe de contenção.`,
      dedupeMs: 7000,
    });
  }

  if (shotType === 'DROP' && outVz > 4.9) {
    pushEvent(gs, {
      key: 'drop-bounce-high',
      type: 'bounce',
      severity: 'medium',
      playerId: bounceEntry?.player ?? null,
      playerName: gs.players?.[bounceEntry?.player]?.name ?? null,
      title: 'Drop quicando vivo demais',
      detail: `Um DROP saiu do quique com vz=${outVz.toFixed(2)}. Para um toque curto, isso está alto demais.`,
      dedupeMs: 7000,
    });
  }

  const launchMeta = bounceEntry?.launchMeta ?? null;
  if (launchMeta && launchMeta.netClearance != null) {
    const clr = Number(launchMeta.netClearance);
    if ((shotType === 'TOPSPIN' || shotType === 'DRIVE') && clr > 1.35) {
      audit.counters.trajectoryFlags++;
      pushEvent(gs, {
        key: `high-clearance-${shotType}`,
        type: 'trajectory',
        severity: 'low',
        playerId: bounceEntry?.player ?? null,
        playerName: gs.players?.[bounceEntry?.player]?.name ?? null,
        title: 'Margem na rede alta demais',
        detail: `${shotType} passou com clearance ${clr.toFixed(2)}m. Se isso virar padrão, o solver está comprando arco demais.`,
        dedupeMs: 9000,
      });
    }
  }
}

export function auditRegisterPointEnd(gs, winnerIdx, reason) {
  const audit = ensureAudit(gs);
  audit.counters.totalPoints++;
  if ((gs.rally ?? 0) <= 3) audit.counters.shortRallies++;
  if ((gs.rally ?? 0) >= 9) audit.counters.longRallies++;

  const loserIdx = 1 - winnerIdx;
  const winner = gs.players?.[winnerIdx];
  const loser = gs.players?.[loserIdx];
  const receiver = gs.players?.[gs.receiver];

  if (loser) {
    const loserAudit = getPlayerAudit(gs, loserIdx);
    if ((gs.rally ?? 0) <= 3) {
      loserAudit.shortPointTotal++;
      loserAudit.shortPointLosses++;
    }
    maybeFlagShortPointProfile(gs, loserAudit, loser);
  }

  if (winner) {
    const winnerAudit = getPlayerAudit(gs, winnerIdx);
    if ((gs.rally ?? 0) <= 3) winnerAudit.shortPointTotal++;
    if (winnerIdx === gs.server) {
      winnerAudit.holdPointsTotal++;
      winnerAudit.holdPointsWon++;
    }
  }

  if (loserIdx === gs.server && loser) {
    const serverAudit = getPlayerAudit(gs, loserIdx);
    serverAudit.holdPointsTotal++;
  }

  const pd = gs._pendingServeData;
  if (pd && gs.serveBounced && !pd.isFirst && receiver) {
    const receiverAudit = getPlayerAudit(gs, receiver.id);
    receiverAudit.secondServeReturnTotal++;
    if (winnerIdx === receiver.id) receiverAudit.secondServeReturnWins++;
    maybeFlagSecondServeReturn(gs, receiverAudit, receiver);

    const serverAudit = getPlayerAudit(gs, gs.server);
    serverAudit.secondServeTotal++;
    if (winnerIdx === gs.server) serverAudit.secondServeWon++;
    maybeFlagSecondServeQuality(gs, serverAudit, gs.players[gs.server]);
  }

  if (pd && reason?.includes('DUPLA FALTA')) {
    const serverAudit = getPlayerAudit(gs, gs.server);
    serverAudit.doubleFaultPoints++;
    if (serverAudit.doubleFaultPoints >= 3) {
      pushEvent(gs, {
        key: `double-fault-cluster:${gs.server}`,
        type: 'serve',
        severity: 'medium',
        playerId: gs.server,
        playerName: gs.players?.[gs.server]?.name ?? null,
        title: 'Duplas faltas em excesso',
        detail: `${gs.players?.[gs.server]?.name ?? 'Servidor'} já acumulou ${serverAudit.doubleFaultPoints} duplas faltas nesta partida.`,
        dedupeMs: 10000,
      });
    }
  }

  if (audit.counters.totalPoints >= 18) {
    const shortShare = audit.counters.shortRallies / Math.max(audit.counters.totalPoints, 1);
    if (shortShare > 0.78) {
      pushEvent(gs, {
        key: 'rallies-too-short',
        type: 'macro',
        severity: 'medium',
        title: 'Partida curta demais no agregado',
        detail: `${pct(audit.counters.shortRallies, audit.counters.totalPoints)}% dos pontos estão terminando em 1–3 bolas. Vale observar se saque/first strike está dominando demais o matchup.`,
        dedupeMs: 15000,
      });
    }
  }

  const totalShots = audit.counters.totalShots;
  if (totalShots >= 120) {
    const allCounts = audit.players.reduce((acc, p) => {
      for (const [k, v] of Object.entries(p.shotCounts)) acc[k] = (acc[k] ?? 0) + v;
      return acc;
    }, {});
    const touchTotal = (allCounts.DROP ?? 0) + (allCounts.SLICE_SHORT ?? 0);
    const angleTotal = (allCounts.SHORT_ANGLE ?? 0) + (allCounts.SHORT_ACCEL ?? 0) + (allCounts.BANANA ?? 0);
    if (touchTotal === 0) {
      pushEvent(gs, {
        key: 'global-touch-void',
        type: 'macro',
        severity: 'medium',
        title: 'Partida sem nenhum toque curto',
        detail: `Já houve ${totalShots} golpes e ainda não apareceu DROP nem SLICE_SHORT. O repertório fino pode estar bloqueado demais.`,
        dedupeMs: 18000,
      });
    }
    if (angleTotal <= 1) {
      pushEvent(gs, {
        key: 'global-angle-void',
        type: 'macro',
        severity: 'low',
        title: 'ngulos especiais quase não existem',
        detail: `SHORT_ANGLE, SHORT_ACCEL e BANANA quase não apareceram nesta partida. Vale observar se o sistema está convergindo demais para bolas centrais/profundas.`,
        dedupeMs: 18000,
      });
      audit.counters.patternFlags++;
    }
  }
}

export function buildLiveAuditSnapshot(gs) {
  const audit = ensureAudit(gs);
  const players = audit.players.map(p => ({
    id: p.id,
    name: p.name,
    suspiciousReachStops: p.suspiciousReachStops,
    suspiciousBounceReads: p.suspiciousBounceReads,
    secondServeReturnPct: p.secondServeReturnTotal ? pct(p.secondServeReturnWins, p.secondServeReturnTotal) : null,
    secondServePct: p.secondServeTotal ? pct(p.secondServeWon, p.secondServeTotal) : null,
    shortPointLossPct: p.shortPointTotal ? pct(p.shortPointLosses, p.shortPointTotal) : null,
    shotCounts: { ...p.shotCounts },
  }));

  return {
    updatedAt: audit.updatedAt,
    counters: { ...audit.counters },
    players,
    recent: audit.events.slice(-10).map(e => ({ ...e })),
    pinned: audit.pinned.slice(-6).map(e => ({ ...e })),
    health: {
      rallyBalance: clamp(1 - Math.abs((audit.counters.shortRallies / Math.max(audit.counters.totalPoints, 1)) - 0.62) * 1.6, 0, 1),
      defenseTrust: clamp(1 - (audit.counters.weirdReachFlags * 0.12 + audit.counters.secondServeFlags * 0.10), 0, 1),
      touchTrust: clamp(1 - (audit.counters.touchVoidFlags * 0.14 + audit.counters.sliceFloatFlags * 0.08), 0, 1),
      serveTrust: clamp(1 - (audit.counters.serveCollapseFlags * 0.12), 0, 1),
      attackTrust: clamp(1 - (audit.counters.attackVoidFlags * 0.12 + audit.counters.patternFlags * 0.08 + audit.counters.trajectoryFlags * 0.05), 0, 1),
    },
  };
}

