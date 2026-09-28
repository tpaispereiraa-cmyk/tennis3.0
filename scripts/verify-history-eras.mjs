import {
  createHistoryBook,
  recordAnnualHistorySnapshot,
  analyzeHistoryTrends,
  recordHistoryTrendAnalysis,
  processEraSignals,
  writeHistoryNarrative,
  calibrateHistoryBook,
} from '../src/systems/history/WorldHistoryBook.js';

function snapshot(year) {
  const dynasty = year < 2045;
  const interregnum = year >= 2045 && year < 2065;
  const young = year >= 2065;
  const champions = dynasty
    ? ['A', 'A', 'A', 'A', `B${year}`, `C${year}`]
    : interregnum
      ? [`P${year}`, `Q${year}`, `R${year}`, `S${year}`, `T${year}`, `U${year}`]
      : ['Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6'];
  const ids = young ? ['Y1', 'Y2', 'Y3', 'Y4', 'Y5'] : ['A', 'B', 'C', 'D', 'E'];
  return {
    id: `season-${year}`,
    year,
    source: 'SEASON_CLOSE',
    chronicleId: `chronicle-${year}`,
    ranking: {
      leader: { id: ids[0], name: ids[0], age: young ? 21 : 29 },
      top10: ids.map((id, index) => ({ id, name: id, age: young ? 21 + index : 27 + index })),
      top25Ids: ids,
      averageAge: young ? 23.5 : 28.5,
      under21: young ? 5 : 1,
      under23: young ? 12 : 3,
      over30: young ? 2 : 9,
      styles: [{ style: young ? 'ALL_COURT' : 'BIG_SERVER', count: young ? 13 : 8 }],
      nationalities: [{ code: young ? 'BR' : 'US', count: young ? 10 : 6 }],
    },
    titles: {
      grandSlams: champions.map((id, index) => ({ id, name: id, tournament: `Major ${index + 1}`, surface: 'HARD' })),
      slamClashes: [], masters: [], atp500: [], finalsChampion: null, finalsRunnerUp: null,
      leaders: [], total: champions.length, championCount: new Set(champions).size,
    },
    surfaces: { breakdown: { HARD: 6 }, dominant: null },
    rivalries: [],
    events: { calendarSlam: dynasty && year % 7 === 0, grandSlamSweep: false, grandSlamDominator: dynasty ? { name: 'A', count: 4 } : null, retirements: [], promotions: [], styleMigrations: [] },
    metrics: { totalMatches: 500, totalTournaments: 40, championCount: new Set(champions).size, averageTop25Age: young ? 23.5 : 28.5, under23Top25: young ? 12 : 3, over30Top25: young ? 2 : 9, topChampionShare: dynasty ? .66 : .17 },
  };
}

let book = createHistoryBook(2025);
for (let year = 2025; year < 2115; year += 1) {
  book = recordAnnualHistorySnapshot(book, snapshot(year));
  const analysis = analyzeHistoryTrends(book, year);
  book = recordHistoryTrendAnalysis(book, analysis);
  book = processEraSignals(book, analysis);
  book = writeHistoryNarrative(book, analysis);
  book = calibrateHistoryBook(book);
}

// A segunda passada deve ser estável: nenhuma correção pode reaparecer só
// porque o arquivo foi salvo e carregado novamente.
book = calibrateHistoryBook(book);

const eraIds = new Set(book.eras.map(era => era.id));
const duplicateYears = book.annualSnapshots.length !== new Set(book.annualSnapshots.map(item => item.year)).size;
const orphanEvents = book.eraEvents.filter(event => !eraIds.has(event.eraId));
const invalidPointer = book.activeEraId && !book.eras.some(era => era.id === book.activeEraId && era.status !== 'CLOSED');
const tooManyChapters = book.eras.some(era => (era.chapters?.length ?? 0) > 80);

if (duplicateYears || orphanEvents.length || invalidPointer || tooManyChapters) {
  throw new Error(JSON.stringify({ duplicateYears, orphanEvents: orphanEvents.length, invalidPointer, tooManyChapters }));
}

console.log(JSON.stringify({
  years: book.annualSnapshots.length,
  eras: book.eras.length,
  closedEras: book.eras.filter(era => era.status === 'CLOSED').length,
  chapters: book.eras.reduce((sum, era) => sum + (era.chapters?.length ?? 0), 0),
  openWithEnd: book.eras.filter(era => era.status !== 'CLOSED' && era.endYear != null).map(era => ({ id: era.id, status: era.status, endYear: era.endYear })),
  calibration: book.metadata.calibration,
}));
