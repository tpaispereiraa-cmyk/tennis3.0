// ════════════════════════════════════════════════════════════════════
// 🏛️ HALL OF FAME ENGINE
// Critérios de elegibilidade, GOAT score e timeline de carreira
// ════════════════════════════════════════════════════════════════════

// ── Os 4 Grand Slams do universo ────────────────────────────────────
export const GRAND_SLAM_IDS = ['JAN_GS_MERIDIAN', 'MAI_GS_ROLAND', 'JUN_GS_ALBION', 'AGO_GS_EMPIRE'];

export const GRAND_SLAM_INFO = {
  JAN_GS_MERIDIAN: {
    name: 'Open de Meridian', surface: 'HARD',
    color: '#1565C0', light: '#4A90D9', glow: 'rgba(21,101,192,0.4)',
    icon: '🏙️', label: 'Hard', order: 0,
  },
  MAI_GS_ROLAND: {
    name: "Roland d'Occitane", surface: 'CLAY',
    color: '#C4572A', light: '#E8834A', glow: 'rgba(196,87,42,0.4)',
    icon: '🏺', label: 'Saibro', order: 1,
  },
  JUN_GS_ALBION: {
    name: 'Championships of Albion', surface: 'GRASS',
    color: '#2E7D32', light: '#52AA6A', glow: 'rgba(46,125,50,0.4)',
    icon: '🌿', label: 'Grama', order: 2,
  },
  AGO_GS_EMPIRE: {
    name: 'Empire Open', surface: 'INDOOR',
    color: '#6A1B9A', light: '#AB47BC', glow: 'rgba(106,27,154,0.4)',
    icon: '🏟️', label: 'Indoor', order: 3,
  },
};

// ── Tiebreaker em cascata ────────────────────────────────────────────
// 1. GOAT Score total
// 2. Grand Slams
// 3. Masters 1000 (definido pelo usuário como desempate principal)
// 4. Career Grand Slam (todos os 4 diferentes)
// 5. Meses no top 10
// 6. Win rate

export function computeGOATScore(stats) {
  const gsScore         = stats.gs * 100;
  const mastersScore    = stats.masters * 12;
  const finalsScore     = stats.finals_titles * 25;
  const atp500Score     = stats.atp500 * 4;
  const olympicScore    = (stats.olympic_gold ?? 0) * 30;
  const careerSlamBonus = stats.careerSlam ? 150 : 0;
  const top10Score      = Math.min(stats.top10Months ?? 0, 120) * 0.8;
  const winRateScore    = stats.winRate >= 0.75 ? 20
                        : stats.winRate >= 0.65 ? 12
                        : stats.winRate >= 0.55 ? 6 : 0;

  const total = gsScore + mastersScore + finalsScore + atp500Score
              + olympicScore + careerSlamBonus + top10Score + winRateScore;

  return {
    total,
    breakdown: { gsScore, mastersScore, finalsScore, atp500Score, olympicScore, careerSlamBonus, top10Score, winRateScore },
  };
}

// ── Comparador de desempate ─────────────────────────────────────────
export function compareGOAT(a, b) {
  if (b.goatScore.total !== a.goatScore.total) return b.goatScore.total - a.goatScore.total;
  if (b.gs !== a.gs) return b.gs - a.gs;
  if (b.masters !== a.masters) return b.masters - a.masters;       // 🔑 desempate principal
  if ((b.careerSlam?1:0) !== (a.careerSlam?1:0)) return (b.careerSlam?1:0) - (a.careerSlam?1:0);
  if (b.top10Months !== a.top10Months) return b.top10Months - a.top10Months;
  return b.winRate - a.winRate;
}

// ── Engine principal ─────────────────────────────────────────────────
export function computeHOFData(state) {
  if (!state) return { inductees: [], allStats: [], currentYear: 2025 };

  const allResults = { ...(state.historicalTournamentResults ?? {}), ...(state.tournamentResults ?? {}) };
  const allPlayers = [
    ...(state.tourPlayers    ?? []),
    ...(state.prospects      ?? []),
    ...(state.retiredPlayers ?? []),
  ];

  const playerMap  = Object.fromEntries(allPlayers.map(p => [p.id, p]));
  const retiredSet = new Set((state.retiredPlayers ?? []).map(p => p.id));
  const currentYear = state.year ?? 2025;

  // ── Acumular stats por jogador ──────────────────────────────────
  const stats = {};
  const getS = id => {
    if (!stats[id]) stats[id] = {
      id,
      gs: 0, gsWon: new Set(), gsYears: {},
      masters: 0, atp500: 0, atp250: 0, finals_titles: 0, totalTitles: 0,
      wins: 0, losses: 0, matchesPlayed: 0, careerPts: 0,
      surfTitles:  { HARD:0, CLAY:0, GRASS:0, INDOOR:0 },
      surfWins:    { HARD:0, CLAY:0, GRASS:0, INDOOR:0 },
      seasonData:  {},   // year → { pts, titles, wins, top10Months }
      titleEvents: [],   // { year, tournamentId, name, category, surface, opponent, isSlam }
      finalLosses: [],   // GS final losses: { year, tournamentId, name, surface, opponent }
    };
    return stats[id];
  };

  const yearlyPts = {}; // year → { playerId → pts }

  // Processar resultados cronologicamente
  const ordered = Object.entries(allResults)
    .filter(([, r]) => r?.tournament)
    .sort(([, a], [, b]) => {
      const sa = a._season ?? a.tournament?.season ?? 0;
      const sb = b._season ?? b.tournament?.season ?? 0;
      const sd = sa - sb;
      return sd !== 0 ? sd : (a.tournament?.weekIndex ?? 0) - (b.tournament?.weekIndex ?? 0);
    });

  ordered.forEach(([, res]) => {
    const { tournament } = res;
    if (!tournament) return;
    const yr   = res._season ?? tournament.season ?? currentYear;
    const { category, surface, id: tId } = tournament;
    const surf = surface ?? 'HARD';

    if (!yearlyPts[yr]) yearlyPts[yr] = {};

    const ptMap = { GRAND_SLAM: 2000, MASTERS_1000: 1000, ATP_500: 500, ATP_250: 250, FINALS: 1500, ATP_100: 100 };
    const basePts = ptMap[category] ?? 0;

    // ── Champion ──────────────────────────────────────────────────
    const champObj = res._slim ? res.champion : res.bracket?.champion;
    const finalistObj = res._slim ? res.finalist : (() => {
      const finalRound = res.bracket?.rounds?.[res.bracket.rounds.length - 1]?.[0];
      if (!finalRound || !champObj) return null;
      const a = finalRound.playerA ?? finalRound.player1;
      const b = finalRound.playerB ?? finalRound.player2;
      const loser = (a?.id === champObj.id) ? b : a;
      return loser?.id ? { id: loser.id, name: loser.name } : null;
    })();

    if (champObj) {
      const s = getS(champObj.id);
      s.totalTitles++;
      s.surfTitles[surf] = (s.surfTitles[surf] || 0) + 1;
      if (!s.seasonData[yr]) s.seasonData[yr] = { pts: 0, titles: 0, wins: 0 };
      s.seasonData[yr].titles++;
      yearlyPts[yr][champObj.id] = (yearlyPts[yr][champObj.id] || 0) + basePts;

      if (GRAND_SLAM_IDS.includes(tId)) {
        s.gs++;
        s.gsWon.add(tId);
        if (!s.gsYears[tId]) s.gsYears[tId] = [];
        s.gsYears[tId].push(yr);
        s.titleEvents.push({
          year: yr, tournamentId: tId, name: tournament.name,
          category: 'GRAND_SLAM', surface: surf,
          opponent: finalistObj?.name ?? null, isSlam: true,
        });
        if (finalistObj?.id) {
          getS(finalistObj.id).finalLosses.push({
            year: yr, tournamentId: tId, name: tournament.name,
            surface: surf, opponent: champObj.name,
          });
        }
      } else if (category === 'MASTERS_1000') {
        s.masters++;
        s.titleEvents.push({ year: yr, tournamentId: tId, name: tournament.name, category, surface: surf, opponent: finalistObj?.name ?? null });
      } else if (category === 'FINALS') {
        s.finals_titles++;
        s.titleEvents.push({ year: yr, tournamentId: tId, name: tournament.name, category, surface: surf, opponent: finalistObj?.name ?? null });
      } else if (category === 'OLYMPICS') {
        s.olympic_gold = (s.olympic_gold ?? 0) + 1;
        s.titleEvents.push({ year: yr, tournamentId: tId, name: tournament.name, category, surface: surf, opponent: finalistObj?.name ?? null });
      } else if (category === 'ATP_500') {
        s.atp500++;
        s.titleEvents.push({ year: yr, tournamentId: tId, name: tournament.name, category, surface: surf, opponent: finalistObj?.name ?? null });
      } else {
        s.atp250++;
      }
    }

    // ── Wins / Losses per player ──────────────────────────────────
    if (res._slim) {
      (res.matches ?? []).forEach(({ w, l }) => {
        const ws = getS(w);
        ws.wins++;
        ws.matchesPlayed++;
        ws.surfWins[surf] = (ws.surfWins[surf] || 0) + 1;
        if (!ws.seasonData[yr]) ws.seasonData[yr] = { pts: 0, titles: 0, wins: 0 };
        ws.seasonData[yr].wins++;
        if (l) {
          const ls = getS(l);
          ls.losses++;
          ls.matchesPlayed++;
        }
      });
      // Pre-computed points
      for (const [pid, pts] of Object.entries(res.pts ?? {})) {
        yearlyPts[yr][pid] = (yearlyPts[yr][pid] || 0) + pts;
        const s = getS(pid);
        if (!s.seasonData[yr]) s.seasonData[yr] = { pts: 0, titles: 0, wins: 0 };
        s.seasonData[yr].pts += pts;
      }
    } else {
      const bracket = res.bracket;
      if (bracket?.rounds) {
        bracket.rounds.forEach(round => {
          round.forEach(match => {
            if (!match.winner || match.isBye) return;
            const winner = match.winner;
            const loser  = match.player1?.id === winner.id ? match.player2 : match.player1;
            const ws = getS(winner.id);
            ws.wins++;
            ws.matchesPlayed++;
            ws.surfWins[surf] = (ws.surfWins[surf] || 0) + 1;
            if (!ws.seasonData[yr]) ws.seasonData[yr] = { pts: 0, titles: 0, wins: 0 };
            ws.seasonData[yr].wins++;
            if (loser?.id) { getS(loser.id).losses++; getS(loser.id).matchesPlayed++; }
          });
        });
      }
    }
  });

  // ── Top-10 months: estimativa por temporada ─────────────────────
  // Para cada ano, rank jogadores por pontos naquele ano → top10 = 12 meses
  Object.entries(yearlyPts).forEach(([yr, pts]) => {
    const sorted = Object.entries(pts).sort((a, b) => b[1] - a[1]);
    sorted.forEach(([pid], idx) => {
      const s = stats[pid];
      if (!s) return;
      if (!s.seasonData[yr]) s.seasonData[yr] = { pts: 0, titles: 0, wins: 0 };
      s.seasonData[yr].top10Months = idx < 10 ? 12 : idx < 20 ? 6 : idx < 30 ? 2 : 0;
      s.seasonData[yr].pts = pts[pid] ?? 0;
      s.seasonData[yr].yearEndRank = idx + 1;
    });
  });

  // ── Finalizar: derivar campos + elegibilidade ────────────────────
  const allStats = Object.values(stats).map(s => {
    const p = playerMap[s.id];
    if (!p) return null;

    const top10Months  = Object.values(s.seasonData).reduce((a, d) => a + (d.top10Months ?? 0), 0);
    const careerSlam   = GRAND_SLAM_IDS.every(id => s.gsWon.has(id));
    const winRate      = s.matchesPlayed >= 10 ? s.wins / s.matchesPlayed : 0;

    // Primeiro e último ano com atividade
    const activeYears = Object.keys(s.seasonData).map(Number).filter(y => {
      const d = s.seasonData[y];
      return (d.wins ?? 0) > 0 || (d.titles ?? 0) > 0;
    });
    const firstYear = activeYears.length > 0 ? Math.min(...activeYears) : null;
    const lastYear  = retiredSet.has(s.id)
      ? (p.retirementInfo?.year ?? (activeYears.length > 0 ? Math.max(...activeYears) : currentYear))
      : currentYear;

    // Melhor temporada por pts
    const bestYear = Object.entries(s.seasonData).sort((a, b) => b[1].pts - a[1].pts)[0];

    // Anos como Nº1
    const yearsAsNo1 = Object.entries(s.seasonData)
      .filter(([, d]) => d.yearEndRank === 1)
      .map(([y]) => +y);

    const enriched = {
      ...s,
      gsWon: Array.from(s.gsWon),
      player: p, name: p.name, nationality: p.nationality,
      age: p.age ?? (currentYear - (p.birthYear ?? 2000)),
      styleId: p.styleId, signatureShots: p.signatureShots ?? [],
      color: p.color,
      top10Months, careerSlam, winRate,
      firstYear, lastYear, yearsAsNo1,
      bestYearData: bestYear ? { year: +bestYear[0], ...bestYear[1] } : null,
      isRetired:       retiredSet.has(s.id),
      retirementInfo:  p.retirementInfo ?? null,
    };

    enriched.goatScore = computeGOATScore(enriched);

    const isVeteranActive = !enriched.isRetired && (enriched.age ?? 0) >= 35;
    enriched.isEligible   = enriched.isRetired || isVeteranActive;
    enriched.meetsGS      = s.gs >= 3;
    enriched.meetsTop10   = top10Months >= 20;
    enriched.inducted     = enriched.isEligible && enriched.meetsGS && enriched.meetsTop10;

    return enriched;
  }).filter(Boolean);

  const inductees = allStats
    .filter(s => s.inducted)
    .sort(compareGOAT);

  return { inductees, allStats, currentYear, sponsorRecords: _computeSponsorRecords(state, allStats) };
}

// ── Recordes de patrocínio (consumido pelo HoF e SponsorTab) ────────
function _computeSponsorRecords(state, allStats) {
  const pool = state?.sponsorPool;
  if (!pool) return null;

  const allPlayers = [
    ...(state.tourPlayers    ?? []),
    ...(state.prospects      ?? []),
    ...(state.retiredPlayers ?? []),
  ];

  // Maior contrato único da história (ativos + archivados)
  let biggestContract = null;
  let biggestFee = 0;

  // Jogador com mais renovações consecutivas
  const renewalCount = {};

  // Prospects que viraram campeões (apostas certas)
  const prospectHits = {};

  // Maior pico de fee anual por jogador
  const peakFee = {};

  // Iterar estados por patrocinador
  for (const sp of Object.values(pool.states ?? {})) {
    for (const c of [...(sp.contracts ?? [])]) {
      const pid = c.playerId;
      if (c.annualFee > biggestFee) {
        biggestFee = c.annualFee;
        const player = allPlayers.find(p => p.id === pid);
        biggestContract = { ...c, playerName: player?.name ?? pid };
      }
      if ((c.renewalCount ?? 0) > 0) {
        renewalCount[pid] = Math.max(renewalCount[pid] ?? 0, c.renewalCount);
      }
      if (c.contractType === 'PROSPECT_DEAL') {
        const player = allPlayers.find(p => p.id === pid);
        const stats  = allStats.find(s => s.id === pid);
        if (stats?.gs > 0) {
          prospectHits[pid] = {
            name: player?.name ?? pid,
            sponsorName: c.sponsorName,
            gs: stats.gs,
          };
        }
      }
      peakFee[pid] = Math.max(peakFee[pid] ?? 0, c.annualFee);
    }
  }
  // Também varrer o archive
  for (const c of pool.contractArchive ?? []) {
    const pid = c.playerId;
    if (c.annualFee > biggestFee) {
      biggestFee = c.annualFee;
      const player = allPlayers.find(p => p.id === pid);
      biggestContract = { ...c, playerName: player?.name ?? pid };
    }
    if ((c.renewalCount ?? 0) > 0) {
      renewalCount[pid] = Math.max(renewalCount[pid] ?? 0, c.renewalCount);
    }
    peakFee[pid] = Math.max(peakFee[pid] ?? 0, c.annualFee);
  }

  // Jogador mais leal (mais renovações)
  const mostLoyalId = Object.entries(renewalCount).sort((a, b) => b[1] - a[1])[0];
  const mostLoyalPlayer = mostLoyalId
    ? allPlayers.find(p => p.id === mostLoyalId[0])
    : null;

  // Jogador com maior pico de fee
  const topEarnerId = Object.entries(peakFee).sort((a, b) => b[1] - a[1])[0];
  const topEarnerPlayer = topEarnerId
    ? allPlayers.find(p => p.id === topEarnerId[0])
    : null;

  return {
    biggestContract,
    mostLoyal: mostLoyalPlayer
      ? { id: mostLoyalId[0], name: mostLoyalPlayer.name, renewals: mostLoyalId[1] }
      : null,
    bestProspectBets: Object.values(prospectHits).slice(0, 3),
    topEarner: topEarnerPlayer
      ? { id: topEarnerId[0], name: topEarnerPlayer.name, peakFee: topEarnerId[1] }
      : null,
  };
}

// ── Timeline de carreira para um jogador ────────────────────────────
export function buildPlayerTimeline(playerId, state) {
  const { allStats } = computeHOFData(state);
  const pStats = allStats.find(s => s.id === playerId);
  if (!pStats) return { events: [], epitaph: null, stats: null };

  const allPlayers = [
    ...(state.tourPlayers    ?? []),
    ...(state.prospects      ?? []),
    ...(state.retiredPlayers ?? []),
  ];

  const events = [];

  // ── ESTREIA ──────────────────────────────────────────────────────
  if (pStats.firstYear) {
    events.push({
      year: pStats.firstYear, type: 'DEBUT',
      title: 'Estreia no Circuito Profissional',
      subtitle: `${pStats.name} chega ao tour`,
      detail: null, icon: '🌱', color: '#52AA6A', isHighlight: false,
    });
  }

  // ── TÍTULOS por ano ───────────────────────────────────────────────
  const titlesByYear = {};
  pStats.titleEvents.forEach(ev => {
    if (!titlesByYear[ev.year]) titlesByYear[ev.year] = [];
    titlesByYear[ev.year].push(ev);
  });

  const lossByYear = {};
  pStats.finalLosses.forEach(l => {
    if (!lossByYear[l.year]) lossByYear[l.year] = [];
    lossByYear[l.year].push(l);
  });

  // ── Nº1 anos ─────────────────────────────────────────────────────
  const no1Set = new Set(pStats.yearsAsNo1 ?? []);

  // Anos relevantes
  const relevantYears = new Set();
  if (pStats.firstYear) relevantYears.add(pStats.firstYear);
  pStats.titleEvents.forEach(ev => relevantYears.add(ev.year));
  pStats.finalLosses.forEach(l => relevantYears.add(l.year));
  (pStats.yearsAsNo1 ?? []).forEach(y => relevantYears.add(y));
  if (pStats.lastYear) relevantYears.add(pStats.lastYear);

  // Rastrear Career Slam progressivamente
  const gsWonSoFar = new Set();
  const yearsArr   = Array.from(relevantYears).sort((a, b) => a - b);

  yearsArr.forEach(yr => {
    const titles  = titlesByYear[yr] ?? [];
    const losses  = lossByYear[yr]   ?? [];
    const slamTs  = titles.filter(t => t.isSlam);
    const bigTs   = titles.filter(t => !t.isSlam && (t.category === 'MASTERS_1000' || t.category === 'FINALS'));
    const smallTs = titles.filter(t => !t.isSlam && t.category !== 'MASTERS_1000' && t.category !== 'FINALS');

    // GS titles
    slamTs.forEach(t => {
      const wasComplete = GRAND_SLAM_IDS.every(id => gsWonSoFar.has(id));
      gsWonSoFar.add(t.tournamentId);
      const completedNow = !wasComplete && GRAND_SLAM_IDS.every(id => gsWonSoFar.has(id));

      const gsInfo = GRAND_SLAM_INFO[t.tournamentId];
      events.push({
        year: yr, type: 'GRAND_SLAM',
        title: t.name,
        subtitle: t.opponent ? `def. ${t.opponent} na final` : 'Campeão',
        detail: gsInfo?.label ?? null,
        icon: '⭐', color: gsInfo?.color ?? '#E8C84A', light: gsInfo?.light,
        isHighlight: true, surface: t.surface, tournamentId: t.tournamentId,
        gsCount: pStats.gs,
      });

      if (completedNow) {
        events.push({
          year: yr, type: 'CAREER_SLAM',
          title: 'Career Grand Slam Completo',
          subtitle: 'Conquistou os 4 títulos em 4 superfícies diferentes',
          detail: 'Uma das conquistas mais raras do esporte',
          icon: '🏆', color: '#FFD700', isHighlight: true, isMega: true,
        });
      }
    });

    // Grandes títulos (Masters / Finals)
    bigTs.forEach(t => {
      events.push({
        year: yr, type: t.category,
        title: t.name,
        subtitle: t.opponent ? `def. ${t.opponent} na final` : 'Campeão',
        detail: null,
        icon: t.category === 'FINALS' ? '👑' : '💜',
        color: t.category === 'FINALS' ? '#E8C84A' : '#9C27B0',
        isHighlight: slamTs.length === 0,
      });
    });

    // Vários ATP 500/250 no mesmo ano → agrupar
    if (smallTs.length > 0) {
      events.push({
        year: yr, type: 'TITLES_MINOR',
        title: `${smallTs.length} título${smallTs.length > 1 ? 's' : ''} no circuito`,
        subtitle: smallTs.map(t => t.name).join(' · '),
        detail: null, icon: '🏅', color: '#66BB6A', isHighlight: false,
      });
    }

    // GS final losses
    losses.forEach(l => {
      const gsInfo = GRAND_SLAM_INFO[l.tournamentId];
      events.push({
        year: yr, type: 'GS_FINAL_LOSS',
        title: `Vice em ${l.name}`,
        subtitle: l.opponent ? `Perdeu para ${l.opponent} na final` : 'Vice-campeão',
        detail: null, icon: '🥈', color: gsInfo?.color ?? '#607080',
        isHighlight: false,
      });
    });

    // Ano como Nº1
    if (no1Set.has(yr) && titles.length === 0) {
      events.push({
        year: yr, type: 'YEAR_END_NO1',
        title: 'Nº1 do Mundo',
        subtitle: `Fechou ${yr} no topo do ranking`,
        detail: null, icon: '👑', color: '#E8C84A', isHighlight: true,
      });
    }
  });

  // ── RIVALIDADES ────────────────────────────────────────────────────
  if (state.rivalrySystem?.getPlayerRivalries) {
    const playerRivalries = state.rivalrySystem.getPlayerRivalries(playerId) ?? [];
    const notable = playerRivalries
      .filter(r => r.intensity >= 0.35 && r.totalMatches >= 3)
      .slice(0, 2);

    notable.forEach(r => {
      const opponentId = r.p1Id === playerId ? r.p2Id : r.p1Id;
      const opp = allPlayers.find(p => p.id === opponentId);
      const myW  = r.p1Id === playerId ? r.p1Wins : r.p2Wins;
      const oppW = r.p1Id === playerId ? r.p2Wins : r.p1Wins;
      const startYr = Math.min(...(r.seasons ?? [pStats.firstYear ?? 2025]));

      const statusColors = {
        LEGENDARY: '#D4A820', INTENSE: '#E07840', ACTIVE: '#52AA6A', FROZEN: '#4A90C4',
      };

      events.push({
        year: startYr, type: 'RIVALRY',
        title: `Rivalidade: ${opp?.name ?? '?'}`,
        subtitle: `${r.totalMatches} duelos — H2H ${myW}–${oppW}`,
        detail: r.narrative ?? null,
        icon: '⚔️', color: statusColors[r.status] ?? '#D4A820',
        isHighlight: r.status === 'LEGENDARY',
        rivalryStatus: r.status, rivalryType: r.type,
      });
    });
  }

  // ── APOSENTADORIA ────────────────────────────────────────────────
  if (pStats.isRetired && pStats.lastYear) {
    const info = pStats.retirementInfo;
    events.push({
      year: pStats.lastYear, type: 'RETIREMENT',
      title: 'Aposentadoria',
      subtitle: info?.message ?? `${pStats.name} encerra a carreira lendária`,
      detail: `${pStats.gs} Grand Slam${pStats.gs !== 1 ? 's' : ''} · ${pStats.totalTitles} títulos · ${pStats.matchesPlayed} partidas`,
      icon: '🎾', color: '#8090A0', isHighlight: false,
    });
  }

  // ── Epítafo do ChronicleEngine ───────────────────────────────────
  const epitaph = state.chronicleEngine?.epitaphs?.[playerId] ?? null;

  // Ordenar por ano → prioridade de tipo
  const typePri = {
    DEBUT: 0, RIVALRY: 1, TITLES_MINOR: 2, GS_FINAL_LOSS: 3,
    YEAR_END_NO1: 4, MASTERS_1000: 5, FINALS: 5,
    GRAND_SLAM: 9, CAREER_SLAM: 10, RETIREMENT: -1,
  };
  events.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return (typePri[b.type] ?? 3) - (typePri[a.type] ?? 3);
  });

  return { events, epitaph, stats: pStats };
}
