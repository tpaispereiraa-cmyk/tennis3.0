/**
 * Editor narrativo do "Simular e ver".
 *
 * A quantidade de capítulos nasce da partida (3..15). A seleção preserva o
 * que estava em jogo, enquanto a narração descreve o placar antes do ponto e
 * a consequência depois dele. Um rally longo não deixa de ser set point.
 */

const MIN_MOMENTS = 3;
const MAX_MOMENTS = 15;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function snapshotFor(clip = {}) {
  return clip.serveSnapshot ?? clip.gsSnapshot ?? null;
}

function playersFor(clip = {}, fallbackPlayers = []) {
  return snapshotFor(clip)?.players ?? fallbackPlayers;
}

function playerName(clip, idx, fallbackPlayers = []) {
  return playersFor(clip, fallbackPlayers)?.[idx]?.name
    ?? (idx === clip?.serverIdx ? clip?.serverName : clip?.receiverName)
    ?? `Jogador ${idx + 1}`;
}

function shortName(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] ?? 'Jogador';
}

function momentKind(clip = {}) {
  if (clip.pressureType) return clip.pressureType;
  if (clip.isMatchPoint) return 'MATCH_POINT';
  if (clip.isSetPoint) return 'SET_POINT';
  return clip.type;
}

function clipOutcome(clip = {}) {
  if (clip._outcome) return clip._outcome;
  if (clip.pointWinnerIdx == null || clip.momentHolderIdx == null) return 'neutral';
  return clip.pointWinnerIdx === clip.momentHolderIdx ? 'converted' : 'saved';
}

function setNumber(clip = {}) {
  return Number(clip.s0 ?? 0) + Number(clip.s1 ?? 0) + 1;
}

function gamesTotal(clip = {}) {
  return Number(clip.g0 ?? 0) + Number(clip.g1 ?? 0);
}

function isDecidingSet(clip = {}, result = {}) {
  const played = result?.setsDetail?.length
    ?? (Number(result?.sets?.[0] ?? 0) + Number(result?.sets?.[1] ?? 0));
  return played > 1 && setNumber(clip) === played;
}

function ordinal(value) {
  return `${value}º`;
}

function scoreAtMoment(clip = {}) {
  const snap = snapshotFor(clip);
  if (snap?.inTiebreak) return `tie-break ${snap.tbScore?.[0] ?? 0}–${snap.tbScore?.[1] ?? 0}`;
  const games = `${clip.g0 ?? snap?.players?.[0]?.games ?? 0}–${clip.g1 ?? snap?.players?.[1]?.games ?? 0}`;
  const pointLabels = ['0', '15', '30', '40', 'vantagem'];
  const p0 = snap?.players?.[0]?.score;
  const p1 = snap?.players?.[1]?.score;
  if (p0 == null || p1 == null) return games;
  return `${games} no set, ${pointLabels[p0] ?? p0}–${pointLabels[p1] ?? p1} no game`;
}

function pointTechnicalData(clip = {}) {
  const frames = Array.isArray(clip.replayFrames) ? clip.replayFrames : [];
  const lastFrame = [...frames].reverse().find((frame) => frame?.pointHistory?.length || frame?.lastShotEvent) ?? null;
  const point = lastFrame?.pointHistory?.[lastFrame.pointHistory.length - 1] ?? null;
  return {
    outcomeType: clip.pointOutcomeType ?? point?.outcomeType ?? null,
    reason: clip.pointReason ?? point?.reason ?? null,
    lastShot: clip.lastShot ?? lastFrame?.lastShotEvent ?? null,
  };
}

function shotFinishPhrase(clip, fallbackPlayers = []) {
  const winnerIdx = clip.pointWinnerIdx;
  if (winnerIdx == null) return null;
  const loserIdx = winnerIdx === 0 ? 1 : 0;
  const winner = shortName(playerName(clip, winnerIdx, fallbackPlayers));
  const loser = shortName(playerName(clip, loserIdx, fallbackPlayers));
  const technical = pointTechnicalData(clip);
  const outcome = String(technical.outcomeType ?? '').toUpperCase();
  const reason = String(technical.reason ?? '');
  const shot = technical.lastShot ?? {};
  const family = String(shot.family ?? '').toUpperCase();
  const direction = String(shot.direction ?? '').toUpperCase();
  const lastShotBelongsToWinner = shot.playerId == null || Number(shot.playerId) === Number(winnerIdx);
  const kmh = Number(shot.kmh);
  const speed = Number.isFinite(kmh) && kmh >= 135 ? ` a ${Math.round(kmh)} km/h` : '';
  const underDuress = ['STRETCHED', 'LATE', 'FALLING_BACK', 'LOW_PICKUP'].includes(String(shot.bodyState ?? '').toUpperCase());
  const balance = underDuress ? ', mesmo golpeando em situação difícil' : '';

  if (outcome === 'ACE' || /\bACE\b/i.test(reason)) {
    return `${winner} escolhe o saque mais direto possível: ace no momento de pressão.`;
  }
  if (outcome === 'DOUBLE_FAULT' || /DUPLA FALTA/i.test(reason)) {
    return `${loser} sente a pressão no segundo saque e entrega o ponto com uma dupla falta.`;
  }
  if (outcome === 'UNFORCED_ERROR' || /NÃO FORÇADO|NAO FORCADO/i.test(reason)) {
    const miss = /REDE/i.test(reason) ? 'na rede' : /FORA|LONGO|LARGO/i.test(reason) ? 'para fora' : 'sem a margem necessária';
    return `${loser} tenta resolver antes da hora e erra ${miss}.`;
  }
  if (outcome === 'FORCED_ERROR' || /ERRO FORÇADO|ERRO FORCADO/i.test(reason)) {
    return `${winner} sustenta a pressão até arrancar o erro de ${loser}.`;
  }
  if (outcome === 'WINNER' || /WINNER/i.test(reason)) {
    if (!lastShotBelongsToWinner) return `${winner} encontra o golpe definitivo antes que ${loser} consiga reagir.`;
    if (family === 'DROP') return `${winner} quebra o ritmo com uma deixadinha e encerra o ponto com toque.`;
    if (family === 'VOLLEY') return `${winner} fecha a rede e decide com um voleio firme${speed}.`;
    if (family === 'SMASH') return `${winner} toma a bola por cima e encerra com um smash sem resposta.`;
    if (family === 'LOB') return `${winner} percebe o avanço e encontra o lob por cima da defesa.`;
    if (shot.intent === 'PASS') return `${winner} encontra a passada quando a rede parecia fechada.`;
    if (direction === 'DTL') return `${winner} muda a direção e dispara o winner paralelo${speed}${balance}.`;
    if (direction === 'CROSS' || direction === 'INSIDE_OUT') return `${winner} abre a quadra e encontra o winner cruzado${speed}${balance}.`;
    if (shot.atNet) return `${winner} avança e mata o ponto antes que ${loser} reorganize a defesa.`;
    if (family === 'FLAT_DRIVE') return `${winner} atravessa a quadra com uma pancada reta${speed}${balance}.`;
    if (family === 'TOPSPIN') return `${winner} acelera com topspin e tira a bola do alcance de ${loser}${balance}.`;
    if (family === 'SLICE') return `${winner} muda a altura com slice e encontra o espaço para concluir.`;
    return `${winner} produz o winner quando a oportunidade finalmente aparece.`;
  }
  if ((clip.rallyLength ?? 0) >= 8) return null;
  return reason ? `${winner} fica com o ponto: ${reason}.` : null;
}

function gameKey(clip = {}) {
  return `${setNumber(clip)}:${clip.g0 ?? 0}:${clip.g1 ?? 0}:${clip.serverIdx ?? 0}`;
}

function isGameClosure(clip = {}) {
  const kind = momentKind(clip);
  if (clipOutcome(clip) !== 'converted') return false;
  return ['GAME_POINT', 'BREAK_POINT', 'SET_POINT', 'MATCH_POINT', 'FINAL_POINT'].includes(kind)
    || clip.type === 'FINAL_POINT';
}

function gameWinnerIdx(clip = {}) {
  return isGameClosure(clip) ? clip.pointWinnerIdx : null;
}

function afterBreakScore(clip = {}) {
  const holder = clip.momentHolderIdx ?? clip.pointWinnerIdx ?? 0;
  return [
    Number(clip.g0 ?? 0) + (holder === 0 ? 1 : 0),
    Number(clip.g1 ?? 0) + (holder === 1 ? 1 : 0),
  ];
}

function afterGameScore(clip = {}) {
  const winner = gameWinnerIdx(clip);
  return [
    Number(clip.g0 ?? 0) + (winner === 0 ? 1 : 0),
    Number(clip.g1 ?? 0) + (winner === 1 ? 1 : 0),
  ];
}

function attachMontage(clip, montage) {
  if (!clip || !montage) return;
  clip.montages ??= [];
  if (!clip.montages.some((entry) => entry.type === montage.type)) clip.montages.push(montage);
  clip.montages.sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
}

function analyzeMontages(clips = []) {
  const ordered = clips
    .filter(Boolean)
    .map((clip) => ({ ...clip, montages: [...(clip.montages ?? [])] }))
    .sort((a, b) => (a.chronIdx ?? 0) - (b.chronIdx ?? 0));
  const groups = new Map();
  for (const clip of ordered) {
    const key = gameKey(clip);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(clip);
  }

  for (const group of groups.values()) {
    const breaks = group.filter((clip) => momentKind(clip) === 'BREAK_POINT');
    const savedBreaks = breaks.filter((clip) => clipOutcome(clip) === 'saved');
    const convertedBreak = breaks.findLast?.((clip) => clipOutcome(clip) === 'converted')
      ?? [...breaks].reverse().find((clip) => clipOutcome(clip) === 'converted');
    const hold = [...group].reverse().find((clip) =>
      momentKind(clip) === 'GAME_POINT' && clipOutcome(clip) === 'converted' && clip.pointWinnerIdx === clip.serverIdx
    );
    if (hold && savedBreaks.length >= 2) {
      attachMontage(hold, {
        type: 'SURVIVAL_HOLD', weight: 92,
        playerIdx: hold.serverIdx, opponentIdx: hold.serverIdx === 0 ? 1 : 0,
        count: savedBreaks.length,
        beats: [`${savedBreaks.length} break points salvos`, 'saque confirmado'],
        clipChronIdxs: [...savedBreaks.map((clip) => clip.chronIdx), hold.chronIdx],
      });
    }
    if (convertedBreak && savedBreaks.length >= 1) {
      attachMontage(convertedBreak, {
        type: 'BREAKTHROUGH', weight: 86,
        playerIdx: convertedBreak.momentHolderIdx, opponentIdx: convertedBreak.serverIdx,
        count: savedBreaks.length + 1,
        beats: [`${savedBreaks.length} chance${savedBreaks.length === 1 ? '' : 's'} perdida${savedBreaks.length === 1 ? '' : 's'}`, 'quebra convertida'],
        clipChronIdxs: [...savedBreaks.map((clip) => clip.chronIdx), convertedBreak.chronIdx],
      });
    }

    for (const kind of ['SET_POINT', 'MATCH_POINT']) {
      const chances = group.filter((clip) => momentKind(clip) === kind);
      const saved = chances.filter((clip) => clipOutcome(clip) === 'saved');
      const converted = [...chances].reverse().find((clip) => clipOutcome(clip) === 'converted');
      if (converted && saved.length) {
        attachMontage(converted, {
          type: kind === 'MATCH_POINT' ? 'MATCH_POINT_SIEGE' : 'SET_POINT_SIEGE',
          weight: kind === 'MATCH_POINT' ? 110 : 102,
          playerIdx: converted.momentHolderIdx,
          opponentIdx: converted.momentHolderIdx === 0 ? 1 : 0,
          count: chances.length,
          beats: [`${saved.length} chance${saved.length === 1 ? '' : 's'} salva${saved.length === 1 ? '' : 's'}`, kind === 'MATCH_POINT' ? 'vitória confirmada' : 'set finalmente fechado'],
          clipChronIdxs: chances.map((clip) => clip.chronIdx),
        });
      }
    }
  }

  const convertedBreaks = ordered.filter((clip) =>
    momentKind(clip) === 'BREAK_POINT' && clipOutcome(clip) === 'converted'
  );
  for (let i = 1; i < convertedBreaks.length; i++) {
    const previous = convertedBreaks[i - 1];
    const current = convertedBreaks[i];
    const afterPrevious = afterBreakScore(previous);
    const immediate = setNumber(previous) === setNumber(current)
      && previous.momentHolderIdx !== current.momentHolderIdx
      && Number(current.g0 ?? -1) === afterPrevious[0]
      && Number(current.g1 ?? -1) === afterPrevious[1];
    if (immediate) {
      attachMontage(current, {
        type: 'IMMEDIATE_REBREAK', weight: 100,
        playerIdx: current.momentHolderIdx, opponentIdx: previous.momentHolderIdx,
        beats: ['quebra conquistada', 'contraquebra imediata'],
        clipChronIdxs: [previous.chronIdx, current.chronIdx],
      });
    }
  }

  const closures = ordered.filter(isGameClosure);
  for (const broken of convertedBreaks) {
    const expected = afterBreakScore(broken);
    const confirmation = closures.find((clip) =>
      clip.chronIdx > broken.chronIdx
      && setNumber(clip) === setNumber(broken)
      && clip.pointWinnerIdx === broken.momentHolderIdx
      && clip.serverIdx === broken.momentHolderIdx
      && Number(clip.g0 ?? -1) === expected[0]
      && Number(clip.g1 ?? -1) === expected[1]
    );
    if (confirmation) {
      attachMontage(confirmation, {
        type: 'BREAK_CONFIRMED', weight: 78,
        playerIdx: broken.momentHolderIdx, opponentIdx: broken.serverIdx,
        beats: ['quebra conquistada', 'saque confirmado'],
        clipChronIdxs: [broken.chronIdx, confirmation.chronIdx],
      });
    }
  }

  let runPlayer = null;
  let runStart = 0;
  let runCount = 0;
  let runSet = null;
  closures.forEach((clip, index) => {
    const winner = gameWinnerIdx(clip);
    const currentSet = setNumber(clip);
    if (winner === runPlayer && currentSet === runSet) runCount += 1;
    else {
      runPlayer = winner;
      runSet = currentSet;
      runStart = index;
      runCount = 1;
    }
    if (runCount >= 3) {
      const runClips = closures.slice(runStart, index + 1);
      const startScore = [Number(runClips[0]?.g0 ?? 0), Number(runClips[0]?.g1 ?? 0)];
      const endScore = afterGameScore(clip);
      const startDeficit = startScore[winner] - startScore[winner === 0 ? 1 : 0];
      const endDeficit = endScore[winner] - endScore[winner === 0 ? 1 : 0];
      const isComeback = startDeficit <= -2 && endDeficit >= 0;
      attachMontage(clip, {
        type: isComeback ? 'COMEBACK_RUN' : 'GAME_RUN', weight: (isComeback ? 96 : 72) + runCount,
        playerIdx: winner, opponentIdx: winner === 0 ? 1 : 0,
        count: runCount,
        startScore,
        endScore,
        beats: isComeback
          ? [`atrás por ${startScore[winner]}–${startScore[winner === 0 ? 1 : 0]}`, `${runCount} games consecutivos`, `chega a ${endScore[winner]}–${endScore[winner === 0 ? 1 : 0]}`]
          : [`${runCount} games consecutivos`, 'controle do set'],
        clipChronIdxs: runClips.map((entry) => entry.chronIdx),
      });
    }
  });

  return ordered;
}

function closingStake(clip, holderIdx) {
  const ownSets = Number(holderIdx === 0 ? clip.s0 : clip.s1) || 0;
  const otherSets = Number(holderIdx === 0 ? clip.s1 : clip.s0) || 0;
  if (ownSets < otherSets) return 'empatar a partida';
  if (ownSets === otherSets) return 'assumir a vantagem em sets';
  return 'ficar mais perto da vitória';
}

function breakStake(clip, holderIdx) {
  const ownGames = Number(holderIdx === 0 ? clip.g0 : clip.g1) || 0;
  const otherGames = Number(holderIdx === 0 ? clip.g1 : clip.g0) || 0;
  const after = ownGames + 1;
  if (ownGames < otherGames) return `buscar ${after}–${otherGames} e devolver o set ao equilíbrio`;
  if (ownGames === otherGames) return `abrir ${after}–${otherGames} e passar a comandar o set`;
  return `ampliar para ${after}–${otherGames} e apertar ainda mais o adversário`;
}

function rallyEnding(clip = {}, winnerName = 'O vencedor do ponto') {
  const rally = Number(clip.rallyLength ?? 0);
  if (rally >= 12) return `${winnerName} prevalece depois de ${rally} bolas — uma troca longa o bastante para mexer com a confiança dos dois lados.`;
  if (rally >= 8) return `${winnerName} vence uma troca de ${rally} bolas num ponto em que nenhuma decisão foi pequena.`;
  return null;
}

function buildMomentStory(clip, counters, result, fallbackPlayers) {
  const kind = momentKind(clip);
  const holderIdx = clip.momentHolderIdx ?? clip.serverIdx ?? 0;
  const opponentIdx = holderIdx === 0 ? 1 : 0;
  const winnerIdx = clip.pointWinnerIdx;
  const holder = playerName(clip, holderIdx, fallbackPlayers);
  const opponent = playerName(clip, opponentIdx, fallbackPlayers);
  const winner = playerName(clip, winnerIdx, fallbackPlayers);
  const holderShort = shortName(holder);
  const opponentShort = shortName(opponent);
  const winnerShort = shortName(winner);
  const onServe = holderIdx === clip.serverIdx;
  const outcome = clipOutcome(clip);
  const setNo = setNumber(clip);
  const rallyLine = shotFinishPhrase(clip, fallbackPlayers) ?? rallyEnding(clip, winnerShort);
  const attemptKey = `${kind}:${setNo}:${holderIdx}`;
  const attempt = (counters.get(attemptKey) ?? 0) + 1;
  counters.set(attemptKey, attempt);
  const attemptText = attempt > 1 ? `É a ${attempt}ª chance de ${holderShort}. ` : '';

  if (kind === 'MATCH_POINT') {
    const action = onServe ? 'saca para fechar a partida' : 'tem a chance de fechar a partida na devolução';
    return {
      title: attempt > 1 ? `${holderShort}, outra vez a um ponto da vitória` : `${holderShort} pode encerrar a partida`,
      setup: `${attemptText}${holderShort} ${action}, com o placar em ${scoreAtMoment(clip)}. ${opponentShort} precisa sobreviver. Será o fim?`,
      resolution: outcome === 'converted'
        ? `${holderShort} converte. ${rallyLine ?? `A chance vira vitória e ${opponentShort} já não tem outra resposta.`}`
        : `${opponentShort} salva o match point. ${rallyLine ?? 'A partida se recusou a terminar naquela bola.'}`,
      kind,
      stakes: 'a partida',
      attempt,
    };
  }

  if (kind === 'SET_POINT') {
    const route = onServe ? 'tem o saque na mão' : 'pressiona a devolução';
    const consequence = closingStake(clip, holderIdx);
    return {
      title: `${holderShort} tem ${attempt > 1 ? 'outra ' : ''}chance de fechar o ${ordinal(setNo)} set`,
      setup: `${attemptText}Em ${scoreAtMoment(clip)}, ${holderShort} ${route} para fechar o set e ${consequence}. ${opponentShort} consegue manter o set vivo?`,
      resolution: outcome === 'converted'
        ? `${holderShort} aproveita a chance e fecha o ${ordinal(setNo)} set. ${rallyLine ?? `O placar muda de peso: ${consequence}.`}`
        : `${opponentShort} salva o set point e mantém o ${ordinal(setNo)} set aberto. ${rallyLine ?? `${holderShort} terá de construir tudo outra vez.`}`,
      kind,
      stakes: `${ordinal(setNo)} set`,
      attempt,
    };
  }

  if (kind === 'BREAK_POINT') {
    const consequence = breakStake(clip, holderIdx);
    return {
      title: `${holderShort} ameaça o saque de ${opponentShort}`,
      setup: `${attemptText}${holderShort} tem break point em ${scoreAtMoment(clip)}: pode ${consequence}. ${opponentShort} encontra um primeiro saque ou a pressão muda de lado?`,
      resolution: outcome === 'converted'
        ? `${holderShort} quebra o saque de ${opponentShort} e passa a ${consequence}. ${rallyLine ?? 'A partida ganha uma direção nova.'}`
        : `${opponentShort} apaga o break point e protege o saque. ${rallyLine ?? `${holderShort} deixa escapar a abertura que tinha criado.`}`,
      kind,
      stakes: 'o saque',
      attempt,
    };
  }

  if (kind === 'TIEBREAK_CRITICAL') {
    return {
      title: `O tie-break entra na zona em que uma bola decide tudo`,
      setup: `${scoreAtMoment(clip)}. Nenhum dos dois tem margem para um ponto comum agora. Quem suporta melhor esta troca?`,
      resolution: `${winnerShort} fica com o ponto. ${rallyLine ?? 'A vantagem é curta no placar, mas enorme na pressão.'}`,
      kind,
      stakes: 'o tie-break',
      attempt,
    };
  }

  if (kind === 'FIFTH_SET_OPENER') {
    return {
      title: 'Tudo recomeça no set decisivo',
      setup: `${holderShort} e ${opponentShort} chegam ao set final sem qualquer proteção no placar. Quem consegue jogar como se o desgaste não existisse?`,
      resolution: `${winnerShort} leva o primeiro golpe desta última disputa. Ainda não é vantagem definitiva, mas é a primeira palavra.`,
      kind,
      stakes: 'o set decisivo',
      attempt,
    };
  }

  if (kind === 'FINAL_POINT' || clip.type === 'FINAL_POINT') {
    return {
      title: `${winnerShort} chega à última bola`,
      setup: `${winnerShort} está a um ponto de transformar tudo o que aconteceu em vitória. ${opponentShort} ainda consegue estender a partida?`,
      resolution: `${winnerShort} fecha a partida. ${rallyLine ?? 'O último ponto confirma o resultado e encerra a resistência do outro lado.'}`,
      kind: 'FINAL_POINT',
      stakes: 'o desfecho',
      attempt,
    };
  }

  if ((clip.rallyLength ?? 0) >= 8 || ['EPIC_RALLY', 'EPIC_RALLY_CLUTCH'].includes(clip.type)) {
    const rally = Number(clip.rallyLength ?? 0);
    return {
      title: `${rally} bolas para descobrir quem cederia primeiro`,
      setup: `O placar era ${scoreAtMoment(clip)}, mas a tensão desta troca vai além do número. ${holderShort} e ${opponentShort} entram num rally que exige uma decisão a cada golpe.`,
      resolution: rallyLine ?? `${winnerShort} vence o ponto e sai da troca com algo maior que o placar: confiança.`,
      kind: 'EPIC_RALLY',
      stakes: 'a confiança',
      attempt,
    };
  }

  return {
    title: 'Um ponto capaz de mudar o peso do game',
    setup: `Com o set em ${scoreAtMoment(clip)}, este ponto pode alterar a pressão do game. Quem consegue tomar a iniciativa?`,
    resolution: `${winnerShort} fica com o ponto e obriga o adversário a jogar o restante do game sob outra pressão.`,
    kind: kind ?? 'GAME_POINT',
    stakes: 'o game',
    attempt,
  };
}

function applyMontageStory(baseStory, clip, fallbackPlayers = []) {
  const montage = clip.montages?.[0];
  if (!montage) return baseStory;
  const player = shortName(playerName(clip, montage.playerIdx, fallbackPlayers));
  const opponent = shortName(playerName(clip, montage.opponentIdx, fallbackPlayers));
  const pointWinner = shortName(playerName(clip, clip.pointWinnerIdx, fallbackPlayers));
  const technical = shotFinishPhrase(clip, fallbackPlayers) ?? rallyEnding(clip, pointWinner);
  const withTechnical = technical ? `${technical} ` : '';
  const common = { montage: { ...montage, label: 'MONTAGEM DA PARTIDA' } };

  if (montage.type === 'SURVIVAL_HOLD') return {
    ...baseStory,
    ...common,
    title: `${player} sobrevive ao game mais perigoso do set`,
    setup: `${opponent} criou ${montage.count} break points no mesmo game. ${player} apagou um por um e agora tem a chance de completar a fuga. O desgaste vira alívio ou ainda há uma última armadilha?`,
    resolution: `${withTechnical}${player} confirma o saque depois de salvar ${montage.count} chances de quebra. O placar registra apenas um game; a montagem mostra o tamanho da sobrevivência.`,
    stakes: 'um game de sobrevivência',
  };
  if (montage.type === 'BREAKTHROUGH') return {
    ...baseStory,
    ...common,
    title: `${player} insiste até finalmente abrir a defesa de ${opponent}`,
    setup: `${player} já viu ${montage.count - 1} oportunidade${montage.count - 1 === 1 ? '' : 's'} desaparecer${montage.count - 1 === 1 ? '' : 'em'} neste game. A nova chance pode transformar pressão acumulada em quebra real.`,
    resolution: `${withTechnical}Desta vez ${player} converte. Depois de ${montage.count} investidas, o saque de ${opponent} finalmente cai.`,
    stakes: 'uma quebra construída',
  };
  if (montage.type === 'IMMEDIATE_REBREAK') return {
    ...baseStory,
    ...common,
    title: 'A vantagem dura apenas um game',
    setup: `${opponent} tinha acabado de conquistar a quebra. Antes que pudesse consolidá-la, ${player} chega ao break point para devolver tudo imediatamente.`,
    resolution: `${withTechnical}${player} contraquebra. A vantagem de ${opponent} desaparece antes de virar controle, e o set recomeça emocionalmente.`,
    stakes: 'a contraquebra',
  };
  if (montage.type === 'BREAK_CONFIRMED') return {
    ...baseStory,
    ...common,
    title: `${player} tenta transformar a quebra em controle`,
    setup: `${player} derrubou o saque de ${opponent}; agora precisa confirmar no próprio serviço. Uma quebra só muda o set quando sobrevive ao game seguinte.`,
    resolution: `${withTechnical}${player} confirma. A quebra deixa de ser um instante isolado e passa a comandar o placar.`,
    stakes: 'a confirmação da quebra',
  };
  if (montage.type === 'GAME_RUN') return {
    ...baseStory,
    ...common,
    title: `${player} transforma um momento em uma sequência`,
    setup: `${player} chega a este ponto carregando ${montage.count - 1} games consecutivos. Mais um e a reação deixa de ser impressão: vira domínio do set.`,
    resolution: `${withTechnical}São ${montage.count} games seguidos para ${player}. ${opponent} já não tenta apenas recuperar o placar; precisa interromper uma partida que ganhou velocidade contra ele.`,
    stakes: `${montage.count} games consecutivos`,
  };
  if (montage.type === 'COMEBACK_RUN') {
    const startOwn = montage.startScore?.[montage.playerIdx] ?? 0;
    const startOther = montage.startScore?.[montage.opponentIdx] ?? 0;
    const endOwn = montage.endScore?.[montage.playerIdx] ?? 0;
    const endOther = montage.endScore?.[montage.opponentIdx] ?? 0;
    return {
      ...baseStory,
      ...common,
      title: `${player} apaga uma desvantagem que parecia controlar o set`,
      setup: `${player} estava atrás por ${startOwn}–${startOther}. Depois de ${montage.count - 1} games seguidos, chega a este ponto para completar uma reação que mudou o lado da pressão.`,
      resolution: `${withTechnical}São ${montage.count} games consecutivos e o placar chega a ${endOwn}–${endOther} para ${player}. ${opponent} não perdeu apenas a vantagem; perdeu o roteiro que parecia ter construído.`,
      stakes: 'uma virada dentro do set',
    };
  }
  if (montage.type === 'SET_POINT_SIEGE') return {
    ...baseStory,
    ...common,
    title: `${player} recebe mais uma chance de fechar um set que não termina`,
    setup: `${opponent} já salvou ${montage.count - 1} set point${montage.count - 1 === 1 ? '' : 's'}. ${player} volta à linha de chegada, mas agora carrega também o peso das oportunidades anteriores.`,
    resolution: `${withTechnical}${player} finalmente fecha o set na ${montage.count}ª chance. A resistência de ${opponent} alongou o capítulo, mas não mudou o dono do desfecho.`,
    stakes: 'um cerco no fim do set',
  };
  if (montage.type === 'MATCH_POINT_SIEGE') return {
    ...baseStory,
    ...common,
    title: `${player} tenta terminar uma partida que insiste em continuar`,
    setup: `${opponent} já escapou de ${montage.count - 1} match point${montage.count - 1 === 1 ? '' : 's'}. ${player} encontra outra chance, agora contra a resistência e contra a memória do que deixou passar.`,
    resolution: `${withTechnical}Na ${montage.count}ª oportunidade, ${player} finalmente encerra a partida. O último ponto termina também o cerco.`,
    stakes: 'um cerco no fim da partida',
  };
  return { ...baseStory, ...common };
}

function storyLabel(story, clip) {
  if (story.montage) {
    const montageLabels = {
      SURVIVAL_HOLD: 'GAME DE SOBREVIVÊNCIA',
      BREAKTHROUGH: 'PRESSÃO CONVERTIDA',
      IMMEDIATE_REBREAK: 'CONTRAQUEBRA',
      BREAK_CONFIRMED: 'QUEBRA CONFIRMADA',
      GAME_RUN: 'ARRANCADA',
      COMEBACK_RUN: 'VIRADA NO SET',
      SET_POINT_SIEGE: 'CERCO NO SET',
      MATCH_POINT_SIEGE: 'CERCO FINAL',
    };
    return montageLabels[story.montage.type] ?? 'MONTAGEM DA PARTIDA';
  }
  const labels = {
    MATCH_POINT: 'MATCH POINT',
    SET_POINT: 'SET POINT',
    BREAK_POINT: 'BREAK POINT',
    TIEBREAK_CRITICAL: 'TIE-BREAK',
    FIFTH_SET_OPENER: 'SET DECISIVO',
    FINAL_POINT: 'PONTO FINAL',
    EPIC_RALLY: 'RALLY ESPECIAL',
    GAME_POINT: 'PONTO DE PRESSÃO',
  };
  const base = labels[story.kind] ?? 'MOMENTO DA PARTIDA';
  return (clip.rallyLength ?? 0) >= 8 && !['EPIC_RALLY', 'GAME_POINT'].includes(story.kind)
    ? `${base} · ${clip.rallyLength} BOLAS`
    : base;
}

function editorialScore(clip, result) {
  const kind = momentKind(clip);
  const outcome = clipOutcome(clip);
  let score = Number(clip.priority ?? 0);
  if (kind === 'MATCH_POINT') score += 120;
  if (kind === 'SET_POINT') score += 100;
  if (clip.type === 'FINAL_POINT') score += 140;
  if (kind === 'TIEBREAK_CRITICAL') score += 58;
  if (kind === 'BREAK_POINT') score += outcome === 'converted' ? 48 : 12;
  if ((clip.rallyLength ?? 0) >= 8) score += Math.min(40, Number(clip.rallyLength) * 2);
  if (isDecidingSet(clip, result)) score += 26;
  if (gamesTotal(clip) >= 8) score += 12;
  if (clip.montages?.length) score += Math.min(120, clip.montages[0].weight ?? 60);
  return score;
}

function dynamicTarget(clips, result) {
  const sets = result?.setsDetail ?? [];
  const closeSets = sets.filter(([a, b]) => Math.abs(a - b) <= 1).length;
  const savedClosers = clips.filter((clip) =>
    ['SET_POINT', 'MATCH_POINT'].includes(momentKind(clip)) && clipOutcome(clip) === 'saved'
  ).length;
  const convertedBreaks = clips.filter((clip) => momentKind(clip) === 'BREAK_POINT' && clipOutcome(clip) === 'converted').length;
  const epicRallies = clips.filter((clip) => Number(clip.rallyLength ?? 0) >= 8).length;
  const hasTiebreak = clips.some((clip) => momentKind(clip) === 'TIEBREAK_CRITICAL' || snapshotFor(clip)?.inTiebreak);
  const montageCount = clips.filter((clip) => clip.montages?.length).length;
  const deciding = sets.length >= 3;
  return clamp(
    3 + Math.max(0, sets.length - 2) + closeSets + Math.min(3, savedClosers) +
      Math.min(3, convertedBreaks) + Math.min(2, epicRallies) + Math.min(3, montageCount) +
      (hasTiebreak ? 1 : 0) + (deciding ? 1 : 0),
    MIN_MOMENTS,
    MAX_MOMENTS,
  );
}

function curate(clips, result) {
  if (!clips.length) return [];
  const ordered = [...clips].sort((a, b) => (a.chronIdx ?? 0) - (b.chronIdx ?? 0));
  const required = ordered.filter((clip) => {
    const kind = momentKind(clip);
    return kind === 'SET_POINT' || kind === 'MATCH_POINT' || clip.type === 'FINAL_POINT';
  });
  const target = Math.max(Math.min(MAX_MOMENTS, required.length), dynamicTarget(ordered, result));
  const selected = new Map(required.map((clip) => [clip.chronIdx, clip]));

  const candidates = ordered
    .filter((clip) => !selected.has(clip.chronIdx))
    .filter((clip) => {
      const kind = momentKind(clip);
      if (kind === 'BREAK_POINT') {
        return clipOutcome(clip) === 'converted' || isDecidingSet(clip, result) || gamesTotal(clip) >= 8 || (clip.rallyLength ?? 0) >= 8;
      }
      if (kind === 'GAME_POINT') return clip.montages?.length || (clip.rallyLength ?? 0) >= 10;
      return ['TIEBREAK_CRITICAL', 'FIFTH_SET_OPENER', 'EPIC_RALLY', 'EPIC_RALLY_CLUTCH'].includes(kind)
        || (clip.rallyLength ?? 0) >= 8;
    })
    .sort((a, b) => editorialScore(b, result) - editorialScore(a, result));

  for (const clip of candidates) {
    if (selected.size >= target || selected.size >= MAX_MOMENTS) break;
    selected.set(clip.chronIdx, clip);
  }

  if (selected.size < Math.min(MIN_MOMENTS, ordered.length)) {
    const fillers = ordered
      .filter((clip) => !selected.has(clip.chronIdx))
      .sort((a, b) => editorialScore(b, result) - editorialScore(a, result));
    for (const clip of fillers) {
      if (selected.size >= Math.min(MIN_MOMENTS, ordered.length)) break;
      selected.set(clip.chronIdx, clip);
    }
  }

  // Em partidas anormais com mais de 15 set/match points, preservamos o
  // primeiro aviso, as tentativas salvas mais pesadas e o fechamento.
  if (selected.size > MAX_MOMENTS) {
    const essentials = [...selected.values()]
      .sort((a, b) => editorialScore(b, result) - editorialScore(a, result))
      .slice(0, MAX_MOMENTS);
    selected.clear();
    essentials.forEach((clip) => selected.set(clip.chronIdx, clip));
  }

  return [...selected.values()].sort((a, b) => (a.chronIdx ?? 0) - (b.chronIdx ?? 0));
}

export function buildDynamicHighlightStory(allClips = [], result = {}, playerA = null, playerB = null) {
  const fallbackPlayers = [playerA, playerB];
  const analyzed = analyzeMontages(allClips.filter(Boolean));
  const selected = curate(analyzed, result);
  const counters = new Map();
  const clips = selected.map((clip) => {
    const baseStory = buildMomentStory(clip, counters, result, fallbackPlayers);
    const mountedStory = applyMontageStory(baseStory, clip, fallbackPlayers);
    const story = { ...mountedStory, label: storyLabel(mountedStory, clip) };
    return {
      ...clip,
      _selectionReason: `${story.kind}: ${story.stakes}`,
      story,
      contextLine: story.setup,
    };
  });
  return {
    clips,
    chapters: clips.map((clip, index) => ({
      ...clip.story,
      chronIdx: clip.chronIdx,
      index,
    })),
    meta: {
      selectedMoments: clips.length,
      availableMoments: allClips.length,
      montageChapters: clips.filter((clip) => clip.story?.montage).length,
      min: MIN_MOMENTS,
      max: MAX_MOMENTS,
    },
  };
}

export const HIGHLIGHT_STORY_LIMITS = Object.freeze({ min: MIN_MOMENTS, max: MAX_MOMENTS });
