import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isRadarMatch } from '../src/systems/radar/RadarSystem.js';

const source = readFileSync(new URL('../src/ui/universe/UniverseManager.jsx', import.meta.url), 'utf8');

function section(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0, `Seção ausente: ${startMarker}`);
  assert.ok(end > start, `Fim da seção ausente: ${endMarker}`);
  return source.slice(start, end);
}

assert.equal(isRadarMatch({ id: 'followed' }, { id: 'other' }, ['followed']), true);
assert.equal(isRadarMatch({ id: 'other-a' }, { id: 'other-b' }, ['followed']), false);

const radarResolver = section('function simulateRadarAwareFastMatch', 'function getSetsDetailFromPlayers');
assert.match(radarResolver, /if \(isRadarMatch\(playerA, playerB, followedPlayerIds\)\)[\s\S]*simulateMatchHeadless/);
assert.match(radarResolver, /result\.simulationSource = 'FOLLOWED_HEADLESS'/);

const preparedQualifying = section('function runPreparedQualifyingFastLocal', 'function buildPreparedAtpSmallPackage');
assert.match(preparedQualifying, /simulateRadarAwareFastMatch/);
assert.doesNotMatch(preparedQualifying, /simulateMatchFast\(/);

const genericQualifying = section('function createFastPrepareMatchResolver', 'function simulatePreparedOpeningRounds');
assert.match(genericQualifying, /simulateRadarAwareFastMatch/);
assert.match(genericQualifying, /appendPreparedRadarMatch/);

const preparedOpening = section('function simulatePreparedOpeningRounds', 'function runPreparedQualifyingFastLocal');
assert.match(preparedOpening, /simulateRadarAwareFastMatch/);
assert.match(preparedOpening, /appendPreparedRadarMatch/);
assert.doesNotMatch(preparedOpening, /simulateMatchFast\(/);

const tournamentRunner = section('async function runTournament(', 'async function runQualifyingAsync');
assert.match(tournamentRunner, /const radarMatches = \[\.\.\.\(prepared\?\.radarMatches \?\? \[\]\)\]/);

const fastRunner = section('const runTournamentFast = useCallback', '// Simula um range de torneios');
assert.match(fastRunner, /radarMatches\.push\(\.\.\.\(prepared\?\.radarMatches \?\? \[\]\)\)/);
assert.match(fastRunner, /simulateRadarAwareFastMatch/);

const radarReducer = section("case 'SET_RADAR_FOLLOWED'", "case 'SET_RADAR_SETTINGS'");
assert.match(radarReducer, /preparedTournamentPackage: null/);
assert.match(radarReducer, /preparedTournamentPackageCache: \{\}/);

assert.match(source, /radarFollowSignature: radarFollowSignature\(preparedRadarContext\.followedPlayerIds\)/);
assert.match(source, /pkg\?\.radarFollowSignature === currentRadarSignature/);

const directFastCalls = source.match(/simulateMatchFast\(/g) ?? [];
assert.equal(directFastCalls.length, 4, 'Uma nova chamada direta ao Fast foi adicionada sem passar pela política do Radar');
const directFastPositions = [...source.matchAll(/simulateMatchFast\(/g)].map(match => match.index);
for (const position of directFastPositions.slice(1)) {
  assert.match(source.slice(Math.max(0, position - 500), position), /!isRadarMatch\(/, 'Chamada direta ao Fast sem bloqueio explícito do Radar');
}

console.log('Radar invariant: toda rota rápida conhecida promove partidas acompanhadas para Headless.');
