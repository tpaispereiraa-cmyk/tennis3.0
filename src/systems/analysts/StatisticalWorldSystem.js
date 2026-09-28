import { CALENDAR } from '../tournaments/TournamentSystem.js';

export const PERFORMANCE_SPECIALISTS = {
  ISHIKAWA: { id:'ISHIKAWA', name:'Naomi Ishikawa', title:'Laboratório de Saque', outlet:'First Strike Index', icon:'⚡', color:'#F0B84B' },
  ADEYEMI: { id:'ADEYEMI', name:'Tunde Adeyemi', title:'Devolução e Defesa', outlet:'The Return Room', icon:'🛡', color:'#54C6A4' },
  MORALES: { id:'MORALES', name:'Lucía Morales', title:'Arquitetura de Golpes', outlet:'Shot Pattern Atlas', icon:'◒', color:'#E77967' },
  VOSS: { id:'VOSS', name:'Mara Voss', title:'Movimento e Construção', outlet:'Court Geometry', icon:'⌁', color:'#77A9F7' },
  BENNETT: { id:'BENNETT', name:'Elias Bennett', title:'Projeção e Prospectos', outlet:'Next 100', icon:'✦', color:'#C68AF1' },
  PETROVA: { id:'PETROVA', name:'Irina Petrova', title:'Pressão e Eficiência', outlet:'Pressure Ledger', icon:'◆', color:'#F26B82' },
};

export const SURFACE_META = {
  HARD:    { label:'Piso duro', short:'Hard', color:'#4D9BF8' },
  CLAY:    { label:'Saibro', short:'Saibro', color:'#D96A3A' },
  GRASS:   { label:'Grama', short:'Grama', color:'#54C878' },
  STREET:  { label:'Asfalto', short:'Asfalto', color:'#E5A83E' },
  CARPET:  { label:'Carpete', short:'Carpete', color:'#D45B88' },
  INDOOR:  { label:'Indoor', short:'Indoor', color:'#9B73E8' },
};

const pct = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const ratio = (a, b, fallback = 0) => b > 0 ? a / b : fallback;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = (value, digits = 1) => Number(Number(value || 0).toFixed(digits));

function resolvePlayerMap(state) {
  const rankById = Object.fromEntries([
    ...(state?.rankingStore?.ranked ?? []).map((row, index) => [row.playerId, row.position ?? index + 1]),
    ...(state?.rankingStore?.prospectRanked ?? []).map((row, index) => [row.playerId, row.position ?? index + 1]),
  ]);
  const players = [
    ...(state?.tourPlayers ?? []),
    ...(state?.prospects ?? []),
    ...(state?.retiredPlayers ?? []),
  ];
  return Object.fromEntries(players.map(player => [player.id, {
    ...player,
    rankPosition: player.rankPosition ?? rankById[player.id] ?? null,
  }]));
}

function rankExpectation(rank, overall) {
  const safeRank = Number(rank);
  let base = !Number.isFinite(safeRank) ? 0.45
    : safeRank <= 1 ? 0.81
    : safeRank <= 5 ? 0.74
    : safeRank <= 10 ? 0.68
    : safeRank <= 25 ? 0.61
    : safeRank <= 50 ? 0.55
    : safeRank <= 100 ? 0.48
    : safeRank <= 180 ? 0.42
    : 0.36;
  if (Number.isFinite(overall)) base += clamp((overall - 72) / 170, -0.08, 0.10);
  return clamp(base, 0.28, 0.84);
}

function normalizedPerformance(performance = {}) {
  const firstWon = performance.serve1WonPoints ?? 0;
  const firstLost = performance.serve1LostPoints ?? 0;
  const secondWon = performance.serve2WonPoints ?? 0;
  const secondLost = performance.serve2LostPoints ?? 0;
  const servingWon = performance.pointsWonServing || firstWon + secondWon;
  const servingLost = performance.pointsLostServing || firstLost + secondLost;
  const returnWon = performance.pointsWonReturning ?? 0;
  const returnLost = performance.pointsLostReturning ?? 0;
  return {
    ...performance,
    servePointsWonPct: ratio(servingWon, servingWon + servingLost),
    firstServeWonPct: ratio(firstWon, firstWon + firstLost),
    secondServeWonPct: ratio(secondWon, secondWon + secondLost),
    firstServeInPct: ratio(performance.serve1In ?? 0, performance.serve1Total ?? 0),
    returnPointsWonPct: ratio(returnWon, returnWon + returnLost),
    holdPct: ratio(performance.gamesHeld ?? 0, performance.gamesServed ?? 0),
    breakPct: ratio(performance.gamesConverted ?? 0, performance.gamesReturned ?? 0),
    netPct: ratio(performance.netPointsWon ?? 0, performance.netApproaches ?? 0),
    avgRally: ratio(performance.rallySum ?? 0, performance.rallyCount ?? 0),
    avgQuality: ratio(performance.qualitySum ?? 0, performance.qualityCount ?? 0),
  };
}

function buildRow(id, record, season, player, surface = null) {
  const slice = surface ? season?.surfaces?.[surface] : season;
  if (!slice) return null;
  const matches = slice.matchesPlayed ?? 0;
  const wins = slice.wins ?? 0;
  const losses = surface ? (slice.losses ?? Math.max(0, matches - wins)) : Math.max(0, matches - wins);
  const legacyPerformance = surface ? {} : {
    aces: season?.aces ?? 0,
    winners: season?.winners ?? 0,
    doubleFaults: season?.doubleFaults ?? 0,
    unforcedErrors: season?.unforcedErrors ?? 0,
    pointWinsByType: season?.pointWinsByType ?? {},
    matchesWithStats: (season?.aces || season?.winners || season?.unforcedErrors) ? matches : 0,
  };
  const performance = normalizedPerformance(slice.performance ?? season?.performance ?? legacyPerformance);
  const rank = season?.entryRank ?? player?.rankPosition ?? player?.rank ?? null;
  const overall = season?.entryOverall ?? null;
  const expected = rankExpectation(rank, overall);
  const actual = ratio(wins, matches);
  const confidence = clamp(matches / 18, 0, 1) * clamp((performance.matchesWithStats ?? 0) / 10, 0.25, 1);
  const statsCoverage = ratio(performance.matchesWithStats ?? 0, matches);
  const pointTypes = performance.pointWinsByType ?? {};
  const shotTypes = performance.byType ?? {};
  const name = record?.name ?? player?.name ?? 'Jogador sem nome';
  return {
    id, name,
    age: player?.age ?? record?.age ?? null,
    nationality: player?.nationality ?? record?.nationality ?? null,
    rank, overall, matches, wins, losses,
    winPct: actual, expectedWinPct: expected,
    expectationDelta: (actual - expected) * (0.45 + confidence * 0.55),
    confidence, statsCoverage,
    titles: slice.titles ?? 0,
    performance, pointTypes, shotTypes,
    acesPerMatch: ratio(performance.aces ?? 0, performance.matchesWithStats ?? matches),
    winnersPerMatch: ratio(performance.winners ?? 0, performance.matchesWithStats ?? matches),
    errorsPerMatch: ratio(performance.unforcedErrors ?? 0, performance.matchesWithStats ?? matches),
    aggressionBalance: ratio((performance.winners ?? 0) - (performance.unforcedErrors ?? 0), performance.matchesWithStats ?? matches),
    serveScore: pct(performance.holdPct) * 0.50 + pct(performance.servePointsWonPct) * 0.30 + clamp(ratio(performance.aces ?? 0, Math.max(1, performance.doubleFaults ?? 0)) / 8, 0, 1) * 0.20,
    returnScore: pct(performance.returnPointsWonPct) * 0.58 + pct(performance.breakPct) * 0.42,
    weaponScore: ratio(performance.winners ?? 0, Math.max(1, (performance.winners ?? 0) + (performance.unforcedErrors ?? 0))),
  };
}

export function getAvailableStatYears(state = {}) {
  const years = new Set([Number(state.year)].filter(Number.isFinite));
  for (const record of Object.values(state?.recordsStore?.playerStats ?? {})) {
    for (const year of Object.keys(record?.seasonData ?? {})) years.add(Number(year));
  }
  return [...years].filter(Number.isFinite).sort((a, b) => b - a);
}

export function buildPerformanceRows(state = {}, year = state.year, surface = null) {
  const playerMap = resolvePlayerMap(state);
  return Object.entries(state?.recordsStore?.playerStats ?? {})
    .map(([id, record]) => buildRow(id, record, record?.seasonData?.[year], playerMap[id], surface))
    .filter(row => row && row.matches > 0);
}

function outcomeComposition(rows) {
  const totals = rows.reduce((acc, row) => {
    const p = row.performance;
    acc.aces += p.aces ?? 0;
    acc.winners += Math.max(0, (p.winners ?? 0) - (p.aces ?? 0));
    acc.forced += p.forcedErrors ?? 0;
    acc.errors += p.unforcedErrors ?? 0;
    return acc;
  }, { aces:0, winners:0, forced:0, errors:0 });
  return [
    { key:'aces', label:'Aces', value:totals.aces, color:'#F0B84B' },
    { key:'winners', label:'Winners em jogo', value:totals.winners, color:'#E77967' },
    { key:'forced', label:'Erros forçados', value:totals.forced, color:'#54C6A4' },
    { key:'errors', label:'Erros não forçados', value:totals.errors, color:'#7B8290' },
  ];
}

function takeQualified(rows, key, count = 5, minimumMatches = 5, direction = 'desc') {
  return [...rows]
    .filter(row => row.matches >= minimumMatches && Number.isFinite(row[key]))
    .sort((a, b) => direction === 'asc' ? a[key] - b[key] : b[key] - a[key])
    .slice(0, count);
}

function countCompletedTournaments(state, year, surface) {
  const pools = [state?.historicalTournamentResults ?? {}, state?.tournamentResults ?? {}];
  const ids = new Set();
  for (const pool of pools) {
    for (const result of Object.values(pool)) {
      const resultYear = Number(result?._season ?? result?.tournament?.season ?? state?.year);
      if (resultYear === Number(year) && result?.tournament?.surface === surface) ids.add(result.tournament.id);
    }
  }
  return ids.size;
}

export function buildSurfaceCycleReviews(state = {}, year = state.year) {
  const currentYear = Number(year) === Number(state.year);
  return Object.keys(SURFACE_META).map(surface => {
    const rows = buildPerformanceRows(state, year, surface);
    if (!rows.length) return null;
    const calendarIndices = CALENDAR
      .map((tournament, index) => tournament.surface === surface ? index : -1)
      .filter(index => index >= 0);
    const lastIndex = calendarIndices.length ? Math.max(...calendarIndices) : -1;
    const closed = !currentYear || (state.calendarIndex ?? 0) > lastIndex;
    const leaders = {
      campaign: takeQualified(rows, 'winPct'),
      serve: takeQualified(rows, 'serveScore'),
      return: takeQualified(rows, 'returnScore'),
      above: takeQualified(rows, 'expectationDelta'),
      below: takeQualified(rows, 'expectationDelta', 5, 5, 'asc'),
    };
    const star = leaders.above[0] ?? leaders.campaign[0];
    const warning = leaders.below[0];
    return {
      surface, ...SURFACE_META[surface], year, closed,
      status: closed ? 'CICLO ENCERRADO' : 'CICLO EM ANDAMENTO',
      rows,
      tournamentCount: countCompletedTournaments(state, year, surface),
      matches: Math.round(rows.reduce((sum, row) => sum + row.matches, 0) / 2),
      composition: outcomeComposition(rows), leaders,
      headline: star
        ? `${star.name} foi a história estatística ${SURFACE_META[surface].label.toLowerCase()}${closed ? '' : ' até aqui'}`
        : `O retrato estatístico do ciclo de ${SURFACE_META[surface].label.toLowerCase()}`,
      verdict: star
        ? `${star.name} venceu ${round(star.winPct * 100, 0)}% das partidas e jogou ${Math.abs(round(star.expectationDelta * 100, 0))} pontos percentuais ${star.expectationDelta >= 0 ? 'acima' : 'abaixo'} da expectativa ajustada à amostra.${warning ? ` No outro extremo, ${warning.name} é o alerta do recorte.` : ''}`
        : 'Ainda não existe amostra suficiente para um veredicto sólido.',
    };
  }).filter(Boolean);
}

export function buildSeasonReview(state = {}, year = state.year) {
  const rows = buildPerformanceRows(state, year);
  const minMatches = rows.some(row => row.matches >= 12) ? 10 : 3;
  const leaders = {
    campaign: takeQualified(rows, 'winPct', 8, minMatches),
    serve: takeQualified(rows, 'serveScore', 8, minMatches),
    return: takeQualified(rows, 'returnScore', 8, minMatches),
    weapons: takeQualified(rows, 'weaponScore', 8, minMatches),
    above: takeQualified(rows, 'expectationDelta', 8, minMatches),
    below: takeQualified(rows, 'expectationDelta', 8, minMatches, 'asc'),
  };
  const revelation = leaders.above[0];
  const disappointment = leaders.below[0];
  const completed = Number(year) < Number(state.year) || (state.calendarIndex ?? 0) >= CALENDAR.length;
  return {
    year, completed, rows, leaders,
    composition: outcomeComposition(rows),
    matches: Math.round(rows.reduce((sum, row) => sum + row.matches, 0) / 2),
    trackedPlayers: rows.length,
    statsCoverage: ratio(rows.reduce((sum, row) => sum + row.performance.matchesWithStats, 0), rows.reduce((sum, row) => sum + row.matches, 0)),
    headline: revelation
      ? `${revelation.name} é quem mais rompeu o roteiro de ${year}`
      : `O almanaque estatístico de ${year}`,
    summary: revelation
      ? `${revelation.name} produziu ${round(revelation.expectationDelta * 100, 0)} pontos percentuais acima da expectativa. ${disappointment ? `${disappointment.name}, por outro lado, ficou ${Math.abs(round(disappointment.expectationDelta * 100, 0))} abaixo do patamar projetado.` : ''}`
      : 'A temporada ainda não tem partidas suficientes para uma leitura confiável.',
  };
}

function dominantShot(row) {
  const ignored = new Set(['serve', 'servePlusOne', 'return', 'rally']);
  return Object.entries(row.pointTypes ?? {})
    .filter(([key]) => !ignored.has(key))
    .sort((a, b) => b[1] - a[1])[0] ?? null;
}

export function buildSpecialistDispatches(state = {}, year = state.year) {
  const review = buildSeasonReview(state, year);
  const { rows, leaders } = review;
  const young = rows.filter(row => (row.age ?? 99) <= 23 && row.matches >= 3)
    .sort((a, b) => b.expectationDelta - a.expectationDelta);
  const serve = leaders.serve[0];
  const ret = leaders.return[0];
  const weapon = leaders.weapons[0];
  const movement = [...rows].filter(row => row.matches >= 5)
    .sort((a, b) => (b.returnScore + b.performance.avgRally / 80) - (a.returnScore + a.performance.avgRally / 80))[0];
  const prospect = young[0];
  const pressure = leaders.above[0];
  const weaponType = weapon ? dominantShot(weapon) : null;
  const coverageText = review.statsCoverage >= 0.75 ? 'amostra forte' : review.statsCoverage >= 0.4 ? 'amostra moderada' : 'amostra parcial';

  return [
    { analyst:PERFORMANCE_SPECIALISTS.ISHIKAWA, subject:serve, eyebrow:'SAQUE · MODELO DE DOMÍNIO', headline:serve ? `${serve.name} está criando mais distância com o primeiro golpe` : 'O saque ainda não produziu um líder confiável', body:serve ? `Hold de ${round(serve.performance.holdPct * 100, 0)}%, ${round(serve.acesPerMatch, 1)} aces por partida e índice de domínio ${round(serve.serveScore * 100, 0)}. A leitura combina sustentação dos games, pontos ganhos no saque e relação ace/dupla falta.` : 'A base exige mais games de saque registrados.', confidence:coverageText },
    { analyst:PERFORMANCE_SPECIALISTS.ADEYEMI, subject:ret, eyebrow:'DEVOLUÇÃO · PRESSÃO CONTÍNUA', headline:ret ? `${ret.name} transforma games de devolução em território próprio` : 'A corrida da devolução está aberta', body:ret ? `${round(ret.performance.returnPointsWonPct * 100, 0)}% dos pontos de devolução e ${round(ret.performance.breakPct * 100, 0)}% dos games convertidos. Não é apenas sobreviver ao saque: é retirar a primeira vantagem do rival.` : 'Ainda faltam pontos de devolução detalhados.', confidence:coverageText },
    { analyst:PERFORMANCE_SPECIALISTS.MORALES, subject:weapon, eyebrow:'GOLPES · ASSINATURA OFENSIVA', headline:weapon ? `${weapon.name} tem a relação winner/erro mais limpa do circuito` : 'Nenhuma arma se separou do pelotão', body:weapon ? `${round(weapon.winnersPerMatch, 1)} winners e ${round(weapon.errorsPerMatch, 1)} erros por partida.${weaponType ? ` O golpe decisivo mais recorrente no ledger é ${weaponType[0].replaceAll('_', ' ').toLowerCase()}.` : ''}` : 'Os simuladores rápidos já entram no recorte, mas a assinatura por golpe fica mais precisa nas partidas headless.', confidence:coverageText },
    { analyst:PERFORMANCE_SPECIALISTS.VOSS, subject:movement, eyebrow:'MOVIMENTO · GEOMETRIA DO PONTO', headline:movement ? `${movement.name} está ganhando a disputa antes do contato` : 'Sem amostra suficiente de construção', body:movement ? `O cruzamento entre eficiência defensiva, devolução e rally médio de ${round(movement.performance.avgRally, 1)} aponta um jogador que prolonga o ponto sem apenas empurrar a bola. É um indício, não uma leitura de tracking milimétrico.` : 'A análise depende de rallies e dados de defesa acumulados.', confidence:coverageText },
    { analyst:PERFORMANCE_SPECIALISTS.BENNETT, subject:prospect, eyebrow:'NEXT 100 · SINAL PRECOCE', headline:prospect ? `${prospect.name} está adiantado em relação à própria idade e ranking` : 'Nenhum jovem rompeu o intervalo de confiança', body:prospect ? `Aos ${prospect.age}, joga ${round(prospect.expectationDelta * 100, 0)} pontos percentuais acima da expectativa em ${prospect.matches} partidas. Isso identifica desenvolvimento fora da curva; não promete que o teto será atingido.` : 'O modelo prefere não inventar um prodígio quando a amostra é pequena.', confidence:coverageText },
    { analyst:PERFORMANCE_SPECIALISTS.PETROVA, subject:pressure, eyebrow:'EFICIÊNCIA · CONTRA A EXPECTATIVA', headline:pressure ? `${pressure.name} é o maior vencedor do contexto, não só do placar` : 'O contexto ainda não separou ninguém', body:pressure ? `${round(pressure.winPct * 100, 0)}% de vitórias contra ${round(pressure.expectedWinPct * 100, 0)}% esperados. Ranking de entrada, força estimada e tamanho da amostra reduzem o risco de confundir uma semana quente com uma nova realidade.` : 'Ainda não existe volume suficiente para calibrar a expectativa.', confidence:coverageText },
  ];
}

export function buildStatisticalWorld(state = {}, year = state.year) {
  return {
    years: getAvailableStatYears(state),
    season: buildSeasonReview(state, year),
    surfaces: buildSurfaceCycleReviews(state, year),
    dispatches: buildSpecialistDispatches(state, year),
  };
}
