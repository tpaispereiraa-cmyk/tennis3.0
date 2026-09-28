/**
 * CircuitShiftEngine
 *
 * Turns the raw end-of-tournament data into one editorially readable truth:
 * what changed in the circuit, who carries the new pressure and why the next
 * stop matters.  This is deliberately a small, serialisable record so it can
 * power the post-tournament edition, the Broadcast Hub and future history UI.
 */

const ROUND_LABEL = { 0: 'final', 1: 'semifinal', 2: 'quartas de final', 3: 'oitavas de final' };

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function asMap(players = []) { return new Map(players.filter(Boolean).map(p => [p.id, p])); }
function playerRank(player) { return Number.isFinite(player?.rankPosition) ? player.rankPosition : 999; }
function shortName(player) { return player?.name?.split(' ').slice(-1)[0] ?? 'o circuito'; }

function getFinalists(bracket) {
  const final = (bracket?.rounds ?? []).at(-1)?.find(match => match?.winner && !match?.isBye);
  if (!final) return { final: null, champion: bracket?.champion ?? null, runnerUp: null };
  const champion = final.winner;
  const runnerUp = final.playerA?.id === champion?.id ? final.playerB : final.playerA;
  return { final, champion, runnerUp };
}

function findBiggestUpset(bracket) {
  const rounds = bracket?.rounds ?? [];
  let best = null;
  rounds.forEach((round, roundIndex) => round.forEach(match => {
    if (match?.isBye || !match?.winner || !match?.playerA || !match?.playerB) return;
    const loser = match.playerA.id === match.winner.id ? match.playerB : match.playerA;
    const gap = playerRank(loser) - playerRank(match.winner);
    if (gap < 12) return;
    const depth = rounds.length - 1 - roundIndex;
    const score = gap + Math.max(0, 4 - depth) * 8;
    if (!best || score > best.score) best = { winner: match.winner, loser, gap, depth, score };
  }));
  return best;
}

function findRivalryBeat(bracket, rivalrySystem) {
  if (!rivalrySystem?.getRivalry) return null;
  const rounds = bracket?.rounds ?? [];
  let best = null;
  rounds.forEach((round, roundIndex) => round.forEach(match => {
    if (!match?.winner || !match?.playerA || !match?.playerB || match?.isBye) return;
    const rivalry = rivalrySystem.getRivalry(match.playerA.id, match.playerB.id);
    const charge = rivalry?.emotionalCharge ?? 0;
    if (charge < 1.5) return;
    const depth = rounds.length - 1 - roundIndex;
    const score = charge * 12 + Math.max(0, 4 - depth) * 6;
    if (!best || score > best.score) best = { playerA: match.playerA, playerB: match.playerB, charge, depth, score, rivalry };
  }));
  return best;
}

function findPressureTransfer(beforePlayers, afterPlayers, champion, runnerUp, upset) {
  const before = asMap(beforePlayers);
  const after = asMap(afterPlayers);
  const candidates = [runnerUp, upset?.loser].filter(Boolean);
  let best = null;
  for (const raw of candidates) {
    const from = before.get(raw.id) ?? raw;
    const to = after.get(raw.id) ?? raw;
    const pressureRise = (to?.personality?.currentState?.pressureLevel ?? to?.currentState?.pressureLevel ?? 0)
      - (from?.personality?.currentState?.pressureLevel ?? from?.currentState?.pressureLevel ?? 0);
    const rankDrop = Math.max(0, playerRank(to) - playerRank(from));
    const score = Math.max(0, pressureRise) * 3 + rankDrop * 2 + (raw.id === runnerUp?.id ? 12 : 0);
    if (!best || score > best.score) best = { player: to, before: from, pressureRise, rankDrop, score };
  }
  return best?.score >= 8 ? best : null;
}

function getNextHook({ nextTournament, champion, championAfter, pressure }) {
  if (!nextTournament) return 'A temporada segue, mas o circuito já sai desta semana com outra ordem emocional.';
  const pressureName = pressure?.player?.name;
  const championName = championAfter?.name ?? champion?.name;
  if (pressureName && championName) {
    return `${nextTournament.name} recebe ${championName} como novo alvo — e ${pressureName} com a obrigação de responder.`;
  }
  if (championName) return `${nextTournament.name} será a primeira prova para saber se ${championName} sustenta o novo status.`;
  return `${nextTournament.name} é o próximo capítulo de um circuito que não volta igual desta semana.`;
}

export function buildCircuitShift({
  tournament,
  bracket,
  beforePlayers = [],
  afterPlayers = [],
  nextTournament = null,
  rivalrySystem = null,
  articles = [],
  year,
} = {}) {
  if (!tournament || !bracket) return null;
  const { champion, runnerUp } = getFinalists(bracket);
  if (!champion) return null;
  const before = asMap(beforePlayers);
  const after = asMap(afterPlayers);
  const championBefore = before.get(champion.id) ?? champion;
  const championAfter = after.get(champion.id) ?? champion;
  const rankGain = Math.max(0, playerRank(championBefore) - playerRank(championAfter));
  const upset = findBiggestUpset(bracket);
  const rivalry = findRivalryBeat(bracket, rivalrySystem);
  const pressure = findPressureTransfer(beforePlayers, afterPlayers, champion, runnerUp, upset);
  const tier = { GRAND_SLAM: 32, FINALS: 28, MASTERS_1000: 22, ATP_500: 14, ATP_250: 9 }[tournament.category] ?? 7;
  const championScore = tier + rankGain * 5 + (championBefore.rankPosition > 10 && championAfter.rankPosition <= 10 ? 24 : 0);
  const upsetScore = (upset?.score ?? 0) + tier * 0.45;
  const rivalryScore = (rivalry?.score ?? 0) + tier * 0.4;
  const dominant = [
    { type: 'STATUS_ASCENT', score: championScore },
    { type: 'UPSET', score: upsetScore },
    { type: 'RIVALRY', score: rivalryScore },
  ].sort((a, b) => b.score - a.score)[0];

  let headline = `${championAfter.name} muda o eixo de ${tournament.name}`;
  let deck = `${championAfter.name} sai da semana com uma nova posição na conversa do circuito.`;
  if (dominant.type === 'UPSET' && upset) {
    headline = `${upset.winner.name} deixa de ser surpresa em ${tournament.name}`;
    deck = `A vitória sobre ${upset.loser.name} no ${ROUND_LABEL[upset.depth] ?? 'torneio'} obriga o circuito a reler o nome de ${shortName(upset.winner)}.`;
  } else if (dominant.type === 'RIVALRY' && rivalry) {
    headline = `${rivalry.playerA.name} × ${rivalry.playerB.name}: agora há memória`; 
    deck = `O encontro em ${tournament.name} elevou uma tensão que já não cabe mais só no placar.`;
  } else if (rankGain >= 4) {
    deck = `${championAfter.name} sobe ${rankGain} posição${rankGain > 1 ? 'ões' : ''} e chega ao próximo evento sob uma cobrança diferente.`;
  }

  const shifts = [
    {
      type: 'STATUS_ASCENT', label: 'Novo status', playerId: championAfter.id, playerName: championAfter.name,
      accent: '#E8C84A',
      text: rankGain > 0
        ? `${championAfter.name} ganhou ${rankGain} posição${rankGain > 1 ? 'ões' : ''} no ranking e agora entra sob outro holofote.`
        : `${championAfter.name} confirmou o nome no centro da conversa do circuito.`,
      before: { rank: playerRank(championBefore) }, after: { rank: playerRank(championAfter) },
    },
  ];
  if (upset) shifts.push({
    type: 'UPSET', label: 'O fato da semana', playerId: upset.winner.id, playerName: upset.winner.name, accent: '#FF7547',
    text: `${upset.winner.name} derrubou ${upset.loser.name} e deixou uma diferença de ${upset.gap} posições impossível de ignorar.`,
  });
  if (pressure) shifts.push({
    type: 'PRESSURE', label: 'Pressão nova', playerId: pressure.player.id, playerName: pressure.player.name, accent: '#FFB347',
    text: `${pressure.player.name} sai do torneio com mais cobrança pública${pressure.rankDrop ? ` e ${pressure.rankDrop} posição${pressure.rankDrop > 1 ? 'ões' : ''} a recuperar` : ''}.`,
    before: { rank: playerRank(pressure.before) }, after: { rank: playerRank(pressure.player) },
  });
  if (rivalry) shifts.push({
    type: 'RIVALRY', label: 'Tensão aberta', playerId: rivalry.playerA.id, playerName: rivalry.playerA.name, accent: '#E040FB',
    text: `${rivalry.playerA.name} e ${rivalry.playerB.name} saem de ${tournament.name} com um duelo que o circuito vai voltar a procurar.`,
  });

  const sourceArticleIds = articles.filter(a => a?.tournament?.id === tournament.id).slice(0, 4).map(a => a.id).filter(Boolean);
  return {
    id: `${year ?? tournament.season ?? 'season'}_${tournament.id}`,
    tournamentId: tournament.id,
    tournamentName: tournament.name,
    tournamentCategory: tournament.category,
    tournamentSurface: tournament.surface,
    year: year ?? tournament.season ?? null,
    champion: { id: championAfter.id, name: championAfter.name, nationality: championAfter.nationality, rank: playerRank(championAfter) },
    headline,
    deck,
    dominantStory: dominant.type,
    shifts: shifts.slice(0, 4),
    nextHook: { tournamentId: nextTournament?.id ?? null, tournamentName: nextTournament?.name ?? null, text: getNextHook({ nextTournament, champion, championAfter, pressure }) },
    sourceArticleIds,
    seen: false,
  };
}
