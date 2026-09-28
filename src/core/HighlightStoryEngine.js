/**
 * HighlightStoryEngine
 *
 * Camada editorial do modo "Simular + Highlights".
 * O coletor legado continua sendo usado exclusivamente para obter os frames
 * determinísticos do replay. Aqui, toda a leitura de placar e de importância
 * é refeita de acordo com as regras compactas atuais.
 */

import { simulateAndCollectHighlights as collectReplayFrames } from './Headless.jsx';
import { MATCH_RULES } from './constants.js';

const META = Object.freeze({
  FINAL_POINT:       { label: 'O DESFECHO', color: '#E8C84A', priority: 110 },
  MATCH_POINT:       { label: 'TUDO EM JOGO', color: '#FF5C6C', priority: 100 },
  SET_POINT:         { label: 'A PORTA DO SET', color: '#FFD166', priority: 78 },
  TIEBREAK_CRITICAL: { label: 'SEM MARGEM', color: '#C084FC', priority: 74 },
  BREAK_POINT:       { label: 'A RACHADURA', color: '#FF9F43', priority: 60 },
  EPIC_RALLY_CLUTCH: { label: 'RALLY DECISIVO', color: '#4FC3F7', priority: 88 },
  EPIC_RALLY:        { label: 'RALLY ASSINATURA', color: '#4FC3F7', priority: 66 },
  GAME_POINT:        { label: 'PONTO DE PRESSÃO', color: '#7DD3A8', priority: 34 },
});

function playerCanCloseGame(player, opponent) {
  return (player?.score ?? 0) >= MATCH_RULES.pointsPerGame - 1
    && (player?.score ?? 0) >= (opponent?.score ?? 0);
}

function playerCanCloseSetFromGame(player, opponent) {
  const nextGames = (player?.games ?? 0) + 1;
  return nextGames >= MATCH_RULES.gamesPerSet
    && nextGames - (opponent?.games ?? 0) >= 2;
}

function getMoment(snapshot) {
  const players = snapshot?.players ?? [];
  const a = players[0];
  const b = players[1];
  if (!a || !b) return { type: null, holders: [] };

  if (snapshot?.inTiebreak) {
    const score = snapshot.tbScore ?? [0, 0];
    const holders = [0, 1].filter((id) =>
      (score[id] ?? 0) >= MATCH_RULES.tiebreakPoints - 1
      && (score[id] ?? 0) >= (score[1 - id] ?? 0)
    );
    if (holders.length) return { type: 'MATCH_POINT', holders };
    if (Math.min(score[0] ?? 0, score[1] ?? 0) >= MATCH_RULES.tiebreakPoints - 2) {
      return { type: 'TIEBREAK_CRITICAL', holders: [] };
    }
    return { type: null, holders: [] };
  }

  const gameHolders = [0, 1].filter((id) => playerCanCloseGame(players[id], players[1 - id]));
  if (!gameHolders.length) return { type: null, holders: [] };

  const setHolders = gameHolders.filter((id) => playerCanCloseSetFromGame(players[id], players[1 - id]));
  if (setHolders.length) return { type: 'SET_POINT', holders: setHolders };

  const receiver = snapshot?.receiver ?? ((snapshot?.server ?? 0) === 0 ? 1 : 0);
  if (gameHolders.includes(receiver)) return { type: 'BREAK_POINT', holders: [receiver] };
  return { type: 'GAME_POINT', holders: gameHolders };
}

function isMatchPoint(result, snapshot, holder) {
  // A configuração da partida costuma estar no snapshot; BO3 é o fallback.
  const setsToWin = snapshot?.setsToWin ?? 2;
  return (snapshot?.players?.[holder]?.sets ?? 0) >= setsToWin - 1;
}

function contextFor(type, snapshot, holder) {
  const players = snapshot?.players ?? [];
  const name = players[holder]?.name?.split(' ').pop() ?? 'alguém';
  const games = `${players[0]?.games ?? 0}–${players[1]?.games ?? 0}`;
  if (type === 'MATCH_POINT') return `A partida coube numa bola. ${name} tinha a chance de encerrá-la.`;
  if (type === 'SET_POINT') return `${name} tinha a porta do set aberta em ${games}.`;
  if (type === 'BREAK_POINT') return `${name} enxergou a primeira rachadura do game em ${games}.`;
  if (type === 'TIEBREAK_CRITICAL') return 'No tie-break, a margem desapareceu.';
  return `O placar de ${games} transformou esta bola em pressão.`;
}

function normalizeClip(legacyClip, result) {
  const snapshot = legacyClip?.serveSnapshot ?? legacyClip?.gsSnapshot ?? null;
  const moment = getMoment(snapshot);
  const holder = moment.holders.length === 1 ? moment.holders[0] : legacyClip?.momentHolderIdx ?? legacyClip?.serverIdx ?? 0;
  let type = legacyClip?.type ?? 'GAME_POINT';
  let pressureType = moment.type ?? null;

  // O ponto final nunca é descartado. Se ele também era match point, o
  // contexto fica registrado sem sacrificar o fechamento do reel.
  if (type !== 'FINAL_POINT' && moment.type) {
    if (moment.type === 'MATCH_POINT' && !isMatchPoint(result, snapshot, holder)) {
      type = 'SET_POINT';
      pressureType = 'SET_POINT';
    }
    else if (moment.type === 'SET_POINT' && isMatchPoint(result, snapshot, holder)) {
      type = 'MATCH_POINT';
      pressureType = 'MATCH_POINT';
    }
    else type = moment.type;
  }

  // Rallies longos ainda têm prioridade quando ocorrem sob alta pressão.
  if (type !== 'FINAL_POINT' && (legacyClip?.rallyLength ?? 0) >= 8) {
    if (['MATCH_POINT', 'SET_POINT', 'TIEBREAK_CRITICAL'].includes(moment.type)) type = 'EPIC_RALLY_CLUTCH';
    else if (!moment.type) type = 'EPIC_RALLY';
  }

  const meta = META[type] ?? META.GAME_POINT;
  const pointWinnerIdx = legacyClip?.pointWinnerIdx ?? null;
  const outcome = pointWinnerIdx == null || !moment.holders.length
    ? 'neutral'
    : moment.holders.includes(pointWinnerIdx) ? 'converted' : 'saved';
  return {
    ...legacyClip,
    type,
    label: meta.label,
    color: meta.color,
    priority: meta.priority,
    momentHolderIdx: holder,
    pressureType,
    isSetPoint: pressureType === 'SET_POINT',
    isMatchPoint: pressureType === 'MATCH_POINT',
    _outcome: outcome,
    contextLine: contextFor(type, snapshot, holder),
    compactRules: true,
  };
}

function dedupeAndPace(clips) {
  const byMoment = new Map();
  for (const clip of clips) {
    const key = clip?.chronIdx ?? `fallback-${byMoment.size}`;
    const previous = byMoment.get(key);
    if (!previous || (clip.priority ?? 0) > (previous.priority ?? 0)) byMoment.set(key, clip);
  }
  const ordered = [...byMoment.values()].sort((a, b) => (a.chronIdx ?? 0) - (b.chronIdx ?? 0));
  if (ordered.length <= 48) return ordered;

  // Mantém os grandes momentos e reduz o ruído de vários games seguidos.
  const protectedClips = ordered.filter(c =>
    c.isSetPoint || c.isMatchPoint ||
    ['FINAL_POINT', 'MATCH_POINT', 'SET_POINT', 'TIEBREAK_CRITICAL', 'EPIC_RALLY_CLUTCH'].includes(c.type) ||
    (['BREAK_POINT', 'GAME_POINT'].includes(c.type) && c._outcome === 'converted')
  );
  const spaced = ordered.filter((clip, index) => index === 0 || index === ordered.length - 1 || index % 3 === 0);
  const selected = new Map();
  [...protectedClips, ...spaced].forEach(c => selected.set(c.chronIdx, c));
  return [...selected.values()].sort((a, b) => (a.chronIdx ?? 0) - (b.chronIdx ?? 0));
}

export function simulateAndCollectStoryHighlights(...args) {
  const { result, allClips } = collectReplayFrames(...args);
  const cleanClips = dedupeAndPace((allClips ?? []).map((clip) => normalizeClip(clip, result)));
  return { result, allClips: cleanClips };
}
