import assert from 'node:assert/strict';
import { buildDynamicHighlightStory, HIGHLIGHT_STORY_LIMITS } from '../src/core/HighlightNarrativeDirector.js';

const players = [
  { id: 'a', name: 'Sebastián Álvarez' },
  { id: 'b', name: 'Wagner' },
];

function clip(chronIdx, type, options = {}) {
  const holder = options.holder ?? 0;
  const snapshotPlayers = players.map((player, idx) => ({
    ...player,
    sets: idx === 0 ? (options.s0 ?? 0) : (options.s1 ?? 0),
    games: idx === 0 ? (options.g0 ?? 0) : (options.g1 ?? 0),
  }));
  return {
    chronIdx,
    type,
    pressureType: options.pressureType ?? type,
    isSetPoint: (options.pressureType ?? type) === 'SET_POINT',
    isMatchPoint: (options.pressureType ?? type) === 'MATCH_POINT',
    s0: options.s0 ?? 0,
    s1: options.s1 ?? 0,
    g0: options.g0 ?? 0,
    g1: options.g1 ?? 0,
    serverIdx: options.serverIdx ?? 0,
    momentHolderIdx: holder,
    pointWinnerIdx: options.winner ?? holder,
    _outcome: (options.winner ?? holder) === holder ? 'converted' : 'saved',
    rallyLength: options.rallyLength ?? 0,
    priority: options.priority ?? 60,
    gsSnapshot: {
      players: snapshotPlayers,
      server: options.serverIdx ?? 0,
      receiver: (options.serverIdx ?? 0) === 0 ? 1 : 0,
      inTiebreak: false,
    },
    replayFrames: options.replayFrames ?? [],
  };
}

const setPointSequence = [
  clip(1, 'SET_POINT', { pressureType: 'SET_POINT', g0: 5, g1: 4, winner: 1, priority: 78 }),
  clip(2, 'EPIC_RALLY_CLUTCH', { pressureType: 'SET_POINT', g0: 5, g1: 4, winner: 0, rallyLength: 12, priority: 88 }),
  clip(3, 'FINAL_POINT', { pressureType: 'MATCH_POINT', s0: 1, g0: 5, g1: 4, winner: 0, priority: 110 }),
];
const sequenceStory = buildDynamicHighlightStory(setPointSequence, { setsDetail: [[6, 4], [6, 4]] }, ...players);
assert.equal(sequenceStory.clips.length, 3);
assert.equal(sequenceStory.clips.filter((entry) => entry.story.kind === 'SET_POINT').length, 2);
assert.match(sequenceStory.chapters[0].setup, /fechar o set/i);
assert.match(sequenceStory.chapters[0].resolution, /salva o set point/i);
assert.match(sequenceStory.chapters[1].setup, /salvou 1 set point|2ª chance/i);
assert.match(sequenceStory.chapters[1].resolution, /12 bolas/i);

const simpleClips = [
  clip(1, 'GAME_POINT'), clip(2, 'GAME_POINT'), clip(3, 'BREAK_POINT', { winner: 0 }),
  clip(4, 'GAME_POINT'), clip(5, 'FINAL_POINT', { pressureType: 'MATCH_POINT', s0: 1 }),
];
const simpleStory = buildDynamicHighlightStory(simpleClips, { setsDetail: [[6, 2], [6, 2]] }, ...players);
assert.equal(simpleStory.clips.length, HIGHLIGHT_STORY_LIMITS.min);

const epicClips = [];
for (let i = 0; i < 5; i++) {
  epicClips.push(clip(i + 1, i % 2 ? 'EPIC_RALLY_CLUTCH' : 'SET_POINT', {
    pressureType: 'SET_POINT', s0: i > 2 ? 1 : 0, s1: i > 2 ? 1 : 0,
    g0: 5, g1: 5, winner: i % 2, rallyLength: i % 2 ? 10 + i : 0, priority: 88,
  }));
}
for (let i = 5; i < 25; i++) {
  epicClips.push(clip(i + 1, i % 3 === 0 ? 'TIEBREAK_CRITICAL' : 'BREAK_POINT', {
    pressureType: i % 3 === 0 ? 'TIEBREAK_CRITICAL' : 'BREAK_POINT',
    s0: 1, s1: 1, g0: 5, g1: 5, winner: i % 2, holder: 1, rallyLength: i % 4 === 0 ? 11 : 0,
  }));
}
epicClips.push(clip(26, 'FINAL_POINT', { pressureType: 'MATCH_POINT', s0: 1, s1: 1, g0: 6, g1: 5, winner: 0, priority: 110 }));
const epicStory = buildDynamicHighlightStory(epicClips, { setsDetail: [[7, 6], [6, 7], [7, 5]] }, ...players);
assert.equal(epicStory.clips.length, HIGHLIGHT_STORY_LIMITS.max);
assert.equal(epicStory.clips.filter((entry) => entry.story.kind === 'SET_POINT').length, 5);
assert.ok(epicStory.clips.every((entry, idx, list) => idx === 0 || entry.chronIdx > list[idx - 1].chronIdx));

const survivalClips = [
  clip(1, 'BREAK_POINT', { pressureType: 'BREAK_POINT', holder: 1, serverIdx: 0, g0: 2, g1: 2, winner: 0 }),
  clip(2, 'BREAK_POINT', { pressureType: 'BREAK_POINT', holder: 1, serverIdx: 0, g0: 2, g1: 2, winner: 0 }),
  clip(3, 'GAME_POINT', { pressureType: 'GAME_POINT', holder: 0, serverIdx: 0, g0: 2, g1: 2, winner: 0 }),
  clip(4, 'SET_POINT', { pressureType: 'SET_POINT', holder: 0, serverIdx: 0, g0: 5, g1: 4, winner: 0,
    replayFrames: [{
      pointHistory: [{ winner: 0, outcomeType: 'ACE', reason: 'ACE Sebastián Álvarez' }],
      lastShotEvent: { playerId: 0, family: 'SERVE_FLAT', kmh: 204 },
    }],
  }),
  clip(5, 'FINAL_POINT', { pressureType: 'MATCH_POINT', s0: 1, g0: 5, g1: 4, winner: 0 }),
];
const survivalStory = buildDynamicHighlightStory(survivalClips, { setsDetail: [[6, 4], [6, 4]] }, ...players);
const survivalChapter = survivalStory.chapters.find((chapter) => chapter.montage?.type === 'SURVIVAL_HOLD');
assert.ok(survivalChapter, 'deveria montar dois break points salvos + hold como uma história');
assert.match(survivalChapter.resolution, /salvar 2 chances de quebra/i);
assert.match(survivalStory.chapters.find((chapter) => chapter.kind === 'SET_POINT')?.resolution ?? '', /ace/i);

const rebreakClips = [
  clip(1, 'BREAK_POINT', { pressureType: 'BREAK_POINT', holder: 1, serverIdx: 0, g0: 2, g1: 2, winner: 1 }),
  clip(2, 'BREAK_POINT', { pressureType: 'BREAK_POINT', holder: 0, serverIdx: 1, g0: 2, g1: 3, winner: 0 }),
  clip(3, 'FINAL_POINT', { pressureType: 'MATCH_POINT', s0: 1, g0: 5, g1: 4, winner: 0 }),
];
const rebreakStory = buildDynamicHighlightStory(rebreakClips, { setsDetail: [[6, 4], [6, 4]] }, ...players);
assert.ok(rebreakStory.chapters.some((chapter) => chapter.montage?.type === 'IMMEDIATE_REBREAK'));
assert.match(rebreakStory.chapters.find((chapter) => chapter.montage?.type === 'IMMEDIATE_REBREAK')?.title ?? '', /vantagem dura apenas/i);

const comebackClips = [
  clip(1, 'BREAK_POINT', { pressureType: 'BREAK_POINT', holder: 0, serverIdx: 1, g0: 1, g1: 4, winner: 0 }),
  clip(2, 'GAME_POINT', { pressureType: 'GAME_POINT', holder: 0, serverIdx: 0, g0: 2, g1: 4, winner: 0 }),
  clip(3, 'BREAK_POINT', { pressureType: 'BREAK_POINT', holder: 0, serverIdx: 1, g0: 3, g1: 4, winner: 0 }),
  clip(4, 'FINAL_POINT', { pressureType: 'MATCH_POINT', s0: 1, g0: 5, g1: 4, winner: 0 }),
];
const comebackStory = buildDynamicHighlightStory(comebackClips, { setsDetail: [[4, 6], [6, 4], [6, 4]] }, ...players);
const comebackChapter = comebackStory.chapters.find((chapter) => chapter.montage?.type === 'COMEBACK_RUN');
assert.ok(comebackChapter, 'deveria reconhecer uma reação de 1–4 para 4–4');
assert.match(comebackChapter.resolution, /4–4|4-4/);

console.log('✓ highlights: técnica, sobrevivência, cerco, contraquebra e virada dentro do set');
