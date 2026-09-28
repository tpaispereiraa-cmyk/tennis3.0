// ════════════════════════════════════════════════════════════════════
// 🏛️ HALL OF FAME ENGINE
// Critérios de elegibilidade, GOAT score e timeline de carreira
import { buildPlayerMomentEvents } from './PlayerTimelineEvents.js';
// ════════════════════════════════════════════════════════════════════

// ── Os 6 Grand Slams do universo ────────────────────────────────────
import { getInjuryDisplayName } from '../health/InjurySystem.js';
import { RETIREMENT_TYPES } from '../career/RetirementSystem.js';
import { computeCoachRecords } from '../coaching/CoachNarrativeSystem.js';

export const GRAND_SLAM_IDS = ['B1_GS_MERIDIAN', 'B2_GS_TERRA', 'B3_GS_HIGHLAND', 'B4_GS_URBAN', 'B5_GS_VELVET', 'B6_GS_CRYSTAL'];

export const GRAND_SLAM_INFO = {
  B1_GS_MERIDIAN: {
    name: 'Meridian Open', surface: 'HARD',
    color: '#1565C0', light: '#4A90D9', glow: 'rgba(21,101,192,0.4)',
    icon: '🏙️', label: 'Dura', order: 0,
  },
  B2_GS_TERRA: {
    name: 'Terra Magna', surface: 'CLAY',
    color: '#C4572A', light: '#E8834A', glow: 'rgba(196,87,42,0.4)',
    icon: '🏺', label: 'Terra', order: 1,
  },
  B3_GS_HIGHLAND: {
    name: 'The Highland', surface: 'GRASS',
    color: '#2E7D32', light: '#52AA6A', glow: 'rgba(46,125,50,0.4)',
    icon: '🌿', label: 'Prado', order: 2,
  },
  B4_GS_URBAN: {
    name: 'Urban Classic', surface: 'STREET',
    color: '#B45309', light: '#EF9F27', glow: 'rgba(180,83,9,0.4)',
    icon: '🛣️', label: 'Asfalto', order: 3,
  },
  B5_GS_VELVET: {
    name: 'Velvet Grand', surface: 'CARPET',
    color: '#8B1A3A', light: '#C4426A', glow: 'rgba(139,26,58,0.4)',
    icon: '🎭', label: 'Veludo', order: 4,
  },
  B6_GS_CRYSTAL: {
    name: 'Crystal Empire', surface: 'INDOOR',
    color: '#6A1B9A', light: '#AB47BC', glow: 'rgba(106,27,154,0.4)',
    icon: '🏟️', label: 'Cristal', order: 5,
  },
};

const MIN_RECORD_MATCHES = 100;
const HOF_MAX_INDUCTEES = 70;
const HOF_MIN_SLAMS = 1;
const HOF_MIN_MASTERS = 5;
const HOF_SURFACE_KEYS = ['HARD', 'CLAY', 'GRASS', 'STREET', 'CARPET', 'INDOOR'];

function emptySurfaceStats(value = 0) {
  return Object.fromEntries(HOF_SURFACE_KEYS.map(surface => [surface, value]));
}

// ── Tiebreaker em cascata ────────────────────────────────────────────
// 1. GOAT Score total
// 2. Grand Slams
// 3. Masters 1000 (definido pelo usuário como desempate principal)
// 4. Career Grand Slam (todos os 6 diferentes)
// 5. Meses no top 10
// 6. Win rate

export function computeGOATScore(stats) {
  const gsScore         = stats.gs * 100;
  const mastersScore    = stats.masters * 12;
  const finalsScore     = stats.finals_titles * 25;
  const slamClashScore  = stats.slam_clash * 30;
  const atp500Score     = stats.atp500 * 4;
  const olympicScore    = (stats.olympic_gold ?? 0) * 30;
  const careerSlamBonus = stats.careerSlam ? 240 : 0;  // 6 slams — feito histórico
  const top10Score      = Math.min(stats.top10Months ?? 0, 120) * 0.8;
  const winRateScore    = stats.winRate >= 0.75 ? 20
                        : stats.winRate >= 0.65 ? 12
                        : stats.winRate >= 0.55 ? 6 : 0;

  const total = gsScore + mastersScore + finalsScore + slamClashScore + atp500Score
    + olympicScore + careerSlamBonus + top10Score + winRateScore;

  return {
    total,
    breakdown: { gsScore, mastersScore, finalsScore, slamClashScore, atp500Score, olympicScore, careerSlamBonus, top10Score, winRateScore },
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

function getHofRoute(stats) {
  if ((stats.gs ?? 0) >= HOF_MIN_SLAMS) return 'SLAM';
  if ((stats.masters ?? 0) >= HOF_MIN_MASTERS) return 'MASTERS';
  return null;
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
    masters: 0, slam_clash: 0, atp500: 0, atp250: 0, finals_titles: 0, totalTitles: 0,
      wins: 0, losses: 0, matchesPlayed: 0, careerPts: 0,
      surfTitles:  emptySurfaceStats(),
      surfWins:    emptySurfaceStats(),
      surfLosses:  emptySurfaceStats(),
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

    const ptMap = { GRAND_SLAM: 2000, SLAM_CLASH: 1250, MASTERS_1000: 1000, ATP_500: 500, ATP_250: 250, FINALS: 1500, ATP_100: 100 };
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
      } else if (category === 'SLAM_CLASH') {
        s.slam_clash++;
        s.titleEvents.push({ year: yr, tournamentId: tId, name: tournament.name, category, surface: surf, opponent: finalistObj?.name ?? null });
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
          ls.surfLosses[surf] = (ls.surfLosses[surf] || 0) + 1;
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
            if (loser?.id) {
              const ls = getS(loser.id);
              ls.losses++;
              ls.matchesPlayed++;
              ls.surfLosses[surf] = (ls.surfLosses[surf] || 0) + 1;
            }
          });
        });
      }
    }

    /* if (injuries.length > 0) {
      const totalMissed = injuries.reduce((sum, injury) => sum + Math.max(0, injury.slotsOut ?? 0), 0);
      const mainInjury = [...injuries].sort((a, b) => (b.grade ?? 0) - (a.grade ?? 0) || (b.slotsOut ?? 0) - (a.slotsOut ?? 0))[0];
      events.push({
        year: yr,
        type: 'INJURY_MAJOR',
        title: injuries.length === 1
          ? `${getInjuryDisplayName(mainInjury)} freia a temporada`
          : `${injuries.length} lesões sérias mudam o ano`,
        subtitle: `${formatTournamentLoss(totalMissed)} ao todo${mainInjury?.originTournament && mainInjury.originTournament !== '?' ? ` · começou em ${mainInjury.originTournament}` : ''}`,
        detail: injuries
          .map(injury => `${getInjuryDisplayName(injury)} (grau ${injury.grade}${injury.slotsOut ? ` · ${formatTournamentLoss(injury.slotsOut)}` : ''})`)
          .join(' · '),
        icon: (mainInjury?.grade ?? 0) >= 4 ? '🏥' : '🩹',
        color: (mainInjury?.grade ?? 0) >= 4 ? '#F44336' : '#F57C00',
        isHighlight: (mainInjury?.grade ?? 0) >= 4,
      });
    }

    breakingEvents.map(describeBreakingEvent).filter(Boolean).forEach(event => {
      events.push({ year: yr, ...event });
    }); */
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
    const winRate      = s.matchesPlayed >= MIN_RECORD_MATCHES ? s.wins / s.matchesPlayed : 0;
    const recordWinRate = s.matchesPlayed >= MIN_RECORD_MATCHES ? s.wins / s.matchesPlayed : null;
    const surfaceRecordStats = Object.fromEntries(
      Object.keys(s.surfWins ?? {}).map((surfaceKey) => {
        const wins = s.surfWins?.[surfaceKey] ?? 0;
        const losses = s.surfLosses?.[surfaceKey] ?? 0;
        const matches = wins + losses;
        return [surfaceKey, {
          wins,
          losses,
          matches,
          winRate: matches >= MIN_RECORD_MATCHES ? wins / matches : null,
        }];
      })
    );

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
      top10Months, careerSlam, winRate, recordWinRate,
      recordMinMatches: MIN_RECORD_MATCHES,
      surfaceRecordStats,
      firstYear, lastYear, yearsAsNo1,
      bestYearData: bestYear ? { year: +bestYear[0], ...bestYear[1] } : null,
      isRetired:       retiredSet.has(s.id),
      retirementInfo:  p.retirementInfo ?? null,
    };

    enriched.goatScore = computeGOATScore(enriched);

    const isVeteranActive = !enriched.isRetired && (enriched.age ?? 0) >= 35;
    enriched.isEligible   = enriched.isRetired || isVeteranActive;
    enriched.meetsGS      = s.gs >= HOF_MIN_SLAMS;
    enriched.meetsMasters = s.masters >= HOF_MIN_MASTERS;
    enriched.hofRoute = getHofRoute(enriched);
    enriched.inducted     = enriched.isEligible && !!enriched.hofRoute;

    return enriched;
  }).filter(Boolean);

  const inductees = allStats
    .filter(s => s.inducted)
    .sort(compareGOAT)
    .slice(0, HOF_MAX_INDUCTEES);

  return { inductees, allStats, currentYear, sponsorRecords: _computeSponsorRecords(state, allStats), coachRecords: computeCoachRecords(state?.coachMarket, allPlayers) };
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

function formatTournamentLoss(slotsOut = 0) {
  const slots = Math.max(0, Math.round(slotsOut || 0));
  if (!slots) return 'sem torneios perdidos mapeados';
  return `${slots} torneio${slots === 1 ? '' : 's'} perdido${slots === 1 ? '' : 's'}`;
}

function describeBreakingEvent(item) {
  if (!item) return null;
  if (String(item.type ?? '').startsWith('CIRCUIT_SHOCK_')) {
    return {
      type: 'CIRCUIT_SHOCK',
      title: item.shockHeadline ?? 'Um caso que marcou a carreira',
      subtitle: item.shockDeck ?? 'O episódio entrou para a memória pública do circuito.',
      detail: item.outcome ? `Conclusão: ${String(item.outcome).toLowerCase().replaceAll('_', ' ')}` : item.shockBody ?? null,
      icon: item.family === 'INTEGRITY' ? '⚖️' : item.family === 'POSITIVE' ? '✦' : '📰',
      color: item.outcome === 'CLEARED' ? '#52AA6A' : item.family === 'INTEGRITY' ? '#AB47BC' : '#64B5F6',
      isHighlight: ['SEISMIC', 'ERA_DEFINING'].includes(item.scale),
    };
  }
  if (item.type === 'RETIREMENT_ANNOUNCED') {
    return {
      type: 'RETIREMENT_ANNOUNCED',
      title: 'Anunciou a temporada final',
      subtitle: item.reason ?? 'A despedida passou a ser parte oficial da narrativa.',
      detail: item.finalSeasonYear ? `A decisão colocou ${item.finalSeasonYear} como último ano completo no circuito.` : null,
      icon: '🎤',
      color: '#E8C84A',
      isHighlight: true,
    };
  }
  if (item.type === 'HEALTH_CRISIS') {
    const subtypeLabel = {
      SURGERY_SETBACK: 'complicação médica grave',
      DEGENERATIVE_CONDITION: 'condição degenerativa',
      ONCOLOGY_TREATMENT: 'tratamento oncológico',
      AUTOIMMUNE_COLLAPSE: 'crise autoimune sistêmica',
    }[item.subtype] ?? 'crise severa de saúde';
    return {
      type: 'BREAKING_NEWS',
      title: 'Crise de saúde muda a carreira',
      subtitle: `${subtypeLabel} afastou o jogador do circuito.`,
      detail: `${item.grade === 6 ? 'Saúde crítica' : 'Crise médica'} · ${formatTournamentLoss(item.slotsRemaining)}`,
      icon: '⚕️',
      color: item.grade >= 6 ? '#F44336' : '#FF7043',
      isHighlight: item.grade >= 6,
    };
  }
  if (item.type === 'SCANDAL') {
    const kindLabel = item.kind === 'DOPING' ? 'investigação por doping' : 'investigação por apostas';
    return {
      type: 'BREAKING_NEWS',
      title: 'Ano atravessado por escândalo',
      subtitle: `${kindLabel} colocou a carreira sob suspeita e suspendeu o fluxo competitivo.`,
      detail: null,
      icon: '📰',
      color: '#AB47BC',
      isHighlight: true,
    };
  }
  if (item.type === 'PERSONAL_CRISIS') {
    const kindLabel = {
      FAMILY_BEREAVEMENT: 'luto familiar',
      SERIOUS_ACCIDENT: 'acidente grave fora da quadra',
      MENTAL_HEALTH_COLLAPSE: 'colapso de saúde mental',
    }[item.kind] ?? 'crise pessoal severa';
    return {
      type: 'BREAKING_NEWS',
      title: 'Fora da quadra, tudo mudou',
      subtitle: `${kindLabel} reposicionou prioridades e interrompeu a rotina de competição.`,
      detail: null,
      icon: '🫥',
      color: '#64B5F6',
      isHighlight: false,
    };
  }
  return null;
}

function buildRetirementNarrative(stats) {
  const info = stats?.retirementInfo;
  if (!info) return null;
  const typeDef = RETIREMENT_TYPES[info.type] ?? null;
  const reasonLabel = typeDef?.label ?? 'Encerramento de carreira';
  const rankText = Number.isFinite(info.rankAtRetirement) ? `saiu como #${info.rankAtRetirement}` : null;
  const ageText = Number.isFinite(info.age) ? `aos ${info.age} anos` : null;
  const meta = [reasonLabel, ageText, rankText].filter(Boolean).join(' · ');
  return {
    title: 'Aposentadoria',
    subtitle: info.message ?? `${stats.name} encerrou a carreira.`,
    detail: meta || `${stats.gs} Grand Slam${stats.gs !== 1 ? 's' : ''} · ${stats.totalTitles} títulos`,
  };
}

function buildYearSummaryEvent(year, season, titles, losses, no1, firstYear, lastYear) {
  if (!season && !titles.length && !losses.length && !no1) return null;
  const totalTitles = titles.length;
  const slamTitles = titles.filter(t => t.isSlam).length;
  const bigTitles = titles.filter(t => !t.isSlam && ['MASTERS_1000', 'FINALS', 'SLAM_CLASH'].includes(t.category)).length;
  const majorInjuries = (season?.injuries ?? []).filter(inj => (inj.grade ?? 0) >= 3);
  const fragments = [];

  if (no1) fragments.push('terminou o ano como nº1');
  else if (season?.rank) fragments.push(`fechou em #${season.rank}`);

  if (Number.isFinite(season?.wins) && season.wins > 0) fragments.push(`${season.wins} vitórias`);
  if (Number.isFinite(season?.finals) && season.finals > 0) fragments.push(`${season.finals} final${season.finals === 1 ? '' : 's'}`);
  if (totalTitles > 0) fragments.push(`${totalTitles} título${totalTitles === 1 ? '' : 's'}`);
  if (majorInjuries.length > 0) fragments.push(`${majorInjuries.length} lesão${majorInjuries.length === 1 ? '' : 'ões'} grave${majorInjuries.length === 1 ? '' : 's'}`);

  let title = `Temporada ${year}`;
  if (year === firstYear) title = 'Primeiros passos no circuito';
  else if (year === lastYear) title = 'Capítulo final';
  else if (slamTitles >= 2) title = 'Ano de peso histórico';
  else if (slamTitles === 1) title = 'Ano de Grand Slam';
  else if (no1) title = 'Ano no topo do ranking';
  else if (majorInjuries.length > 0 && totalTitles === 0) title = 'Ano interrompido pelo corpo';
  else if (bigTitles >= 2 || totalTitles >= 3) title = 'Ano empilhando conquistas';
  else if (season?.inDecline) title = 'Ano de transição';
  else if ((season?.ovrDelta ?? 0) >= 4) title = 'Ano de ascensão';

  const detailBits = [];
  if (slamTitles > 0) detailBits.push(`${slamTitles} Grand Slam${slamTitles === 1 ? '' : 's'}`);
  if (bigTitles > 0) detailBits.push(`${bigTitles} grande${bigTitles === 1 ? '' : 's'} título${bigTitles === 1 ? '' : 's'}`);
  if (losses.length > 0) detailBits.push(`${losses.length} final${losses.length === 1 ? '' : 's'} de Slam perdida${losses.length === 1 ? '' : 's'}`);
  if (season?.titleWhileInjured) detailBits.push('conseguiu título mesmo lesionado');
  if (season?.inDecline) detailBits.push('sinais claros de declínio competitivo');

  return {
    year,
    type: 'YEAR_SUMMARY',
    title,
    subtitle: fragments.length ? fragments.join(' · ') : 'Ano sem métricas relevantes registradas.',
    detail: detailBits.length ? detailBits.join(' · ') : null,
    icon: no1 ? '👑' : majorInjuries.length > 0 ? '📆' : '🗓️',
    color: no1 ? '#E8C84A' : majorInjuries.length > 0 ? '#EF6C57' : '#8FA3B2',
    isHighlight: no1 || slamTitles > 0,
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

  const player = pStats.player ?? {};
  const seasonHistory = [...(player._seasonHistory ?? [])].sort((a, b) => a.year - b.year);
  const seasonMap = Object.fromEntries(seasonHistory.map(season => [season.year, season]));
  const injuryHistory = Array.isArray(player.injuryHistory) ? player.injuryHistory : [];
  const breakingHistory = [
    ...(Array.isArray(player.breakingNews?.history) ? player.breakingNews.history : []),
    ...(Array.isArray(player.circuitShock?.publicHistory) ? player.circuitShock.publicHistory : []),
  ];
  const events = [];
  // A memória pessoal pertence ao jogador, não à tela da ficha. Por isso a
  // mesma fonte continua enriquecendo a biografia depois da aposentadoria.
  const archivedSponsorEvents = state.chronicleEngine?.getSponsorTimeline
    ? (state.chronicleEngine.getSponsorTimeline(playerId) ?? [])
    : [];
  const archivedCoachEvents = state.coachMarket?.yearlyEvents ?? [];
  const lifeMoments = buildPlayerMomentEvents(player, {
    sponsorEvents: archivedSponsorEvents,
    coachEvents: archivedCoachEvents,
  }).filter(event => event.type.startsWith('LIFE_') || event.type === 'SPONSOR' || event.type.startsWith('COACH_') || event.type === 'RANKING');

  // ── ESTREIA ──────────────────────────────────────────────────────
  if (pStats.firstYear) {
    events.push({
      year: pStats.firstYear, type: 'DEBUT',
      title: 'Estreia no Circuito Profissional',
      subtitle: `${pStats.name} chega ao tour`,
      detail: seasonMap[pStats.firstYear]?.rank ? `Já fechou o primeiro recorte em #${seasonMap[pStats.firstYear].rank}.` : null, icon: '🌱', color: '#52AA6A', isHighlight: false,
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
  const injuriesByYear = {};
  injuryHistory
    .filter(injury => (injury?.grade ?? 0) >= 3)
    .forEach(injury => {
      const year = injury.season ?? injury.year ?? injury.originSeason ?? null;
      if (!year) return;
      if (!injuriesByYear[year]) injuriesByYear[year] = [];
      injuriesByYear[year].push(injury);
    });
  const breakingByYear = {};
  breakingHistory.forEach(item => {
    const year = item?.year ?? null;
    if (!year) return;
    if (!breakingByYear[year]) breakingByYear[year] = [];
    breakingByYear[year].push(item);
  });

  // Anos relevantes
  const relevantYears = new Set();
  if (pStats.firstYear) relevantYears.add(pStats.firstYear);
  seasonHistory.forEach(season => relevantYears.add(season.year));
  pStats.titleEvents.forEach(ev => relevantYears.add(ev.year));
  pStats.finalLosses.forEach(l => relevantYears.add(l.year));
  (pStats.yearsAsNo1 ?? []).forEach(y => relevantYears.add(y));
  Object.keys(injuriesByYear).forEach(y => relevantYears.add(Number(y)));
  Object.keys(breakingByYear).forEach(y => relevantYears.add(Number(y)));
  if (pStats.lastYear) relevantYears.add(pStats.lastYear);

  // Rastrear Career Slam progressivamente
  const gsWonSoFar = new Set();
  let slamTitleCount = 0;
  const slamWinsBySurface = emptySurfaceStats(0);
  const yearsArr   = Array.from(relevantYears).sort((a, b) => a - b);

  yearsArr.forEach(yr => {
    const season  = seasonMap[yr] ?? null;
    const titles  = titlesByYear[yr] ?? [];
    const losses  = lossByYear[yr]   ?? [];
    const injuries = injuriesByYear[yr] ?? [];
    const breakingEvents = breakingByYear[yr] ?? [];
    const slamTs  = titles.filter(t => t.isSlam);
    const bigTs   = titles.filter(t => !t.isSlam && (t.category === 'MASTERS_1000' || t.category === 'FINALS' || t.category === 'SLAM_CLASH'));
    const smallTs = titles.filter(t => !t.isSlam && t.category !== 'MASTERS_1000' && t.category !== 'FINALS' && t.category !== 'SLAM_CLASH');

    const summaryEvent = buildYearSummaryEvent(yr, season, titles, losses, no1Set.has(yr), pStats.firstYear, pStats.lastYear);
    if (summaryEvent) events.push(summaryEvent);

    // GS titles
    slamTs.forEach(t => {
      const wasComplete = GRAND_SLAM_IDS.every(id => gsWonSoFar.has(id));
      gsWonSoFar.add(t.tournamentId);
      const completedNow = !wasComplete && GRAND_SLAM_IDS.every(id => gsWonSoFar.has(id));
      slamTitleCount += 1;
      const surface = String(t.surface ?? GRAND_SLAM_INFO[t.tournamentId]?.surface ?? '').toUpperCase();
      if (surface) slamWinsBySurface[surface] = (slamWinsBySurface[surface] ?? 0) + 1;

      const gsInfo = GRAND_SLAM_INFO[t.tournamentId];
      events.push({
        year: yr, type: 'GRAND_SLAM',
        title: t.name,
        subtitle: `${slamTitleCount}º Grand Slam${surface ? ` · ${slamWinsBySurface[surface]}º na ${gsInfo?.label?.toLowerCase() ?? surface.toLowerCase()}` : ''}${t.opponent ? ` · def. ${t.opponent} na final` : ''}`,
        detail: gsInfo?.label ?? null,
        icon: '⭐', color: gsInfo?.color ?? '#E8C84A', light: gsInfo?.light,
        isHighlight: true, surface: t.surface, tournamentId: t.tournamentId,
        gsCount: slamTitleCount,
      });

      if (completedNow) {
        events.push({
          year: yr, type: 'CAREER_SLAM',
          title: 'Career Grand Slam Completo',
          subtitle: `Conquistou os ${GRAND_SLAM_IDS.length} títulos em ${HOF_SURFACE_KEYS.length} superfícies diferentes`,
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
        icon: t.category === 'FINALS' ? '👑' : t.category === 'SLAM_CLASH' ? '⚔️' : '💜',
        color: t.category === 'FINALS' ? '#E8C84A' : t.category === 'SLAM_CLASH' ? '#FF8A3D' : '#9C27B0',
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
    if (injuries.length > 0) {
      const totalMissed = injuries.reduce((sum, injury) => sum + Math.max(0, injury.slotsOut ?? 0), 0);
      const mainInjury = [...injuries].sort((a, b) => (b.grade ?? 0) - (a.grade ?? 0) || (b.slotsOut ?? 0) - (a.slotsOut ?? 0))[0];
      events.push({
        year: yr,
        type: 'INJURY_MAJOR',
        title: injuries.length === 1
          ? `${getInjuryDisplayName(mainInjury)} freia a temporada`
          : `${injuries.length} lesões sérias mudam o ano`,
        subtitle: `${formatTournamentLoss(totalMissed)} ao todo${mainInjury?.originTournament && mainInjury.originTournament !== '?' ? ` · começou em ${mainInjury.originTournament}` : ''}`,
        detail: injuries
          .map(injury => `${getInjuryDisplayName(injury)} (grau ${injury.grade}${injury.slotsOut ? ` · ${formatTournamentLoss(injury.slotsOut)}` : ''})`)
          .join(' · '),
        icon: (mainInjury?.grade ?? 0) >= 4 ? '🏥' : '🩹',
        color: (mainInjury?.grade ?? 0) >= 4 ? '#F44336' : '#F57C00',
        isHighlight: (mainInjury?.grade ?? 0) >= 4,
      });
    }
    breakingEvents.map(describeBreakingEvent).filter(Boolean).forEach(event => {
      events.push({ year: yr, ...event });
    });
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

  // Vida, equipe, contratos e marcos de ranking também são legado. Eles
  // aparecem aqui sem substituir os grandes títulos detalhados acima.
  lifeMoments.forEach(event => {
    events.push({
      ...event,
      type: event.type === 'RANKING' ? 'RANKING_MILESTONE' : event.type,
      isHighlight: (event.importance ?? 0) >= 8,
    });
  });

  // ── APOSENTADORIA ────────────────────────────────────────────────
  if (pStats.isRetired && pStats.lastYear) {
    const retirementNarrative = buildRetirementNarrative(pStats);
    events.push({
      year: pStats.lastYear, type: 'RETIREMENT',
      title: retirementNarrative?.title ?? 'Aposentadoria',
      subtitle: retirementNarrative?.subtitle ?? `${pStats.name} encerra a carreira lendária`,
      detail: retirementNarrative?.detail ?? `${pStats.gs} Grand Slam${pStats.gs !== 1 ? 's' : ''} · ${pStats.totalTitles} títulos · ${pStats.matchesPlayed} partidas`,
      icon: '🎾', color: '#8090A0', isHighlight: false,
    });
  }

  // ── Epítafo do ChronicleEngine ───────────────────────────────────
  const epitaph = state.chronicleEngine?.epitaphs?.[playerId] ?? null;

  // Ordenar por ano → prioridade de tipo
  const typePri = {
    RETIREMENT: -2,
    DEBUT: 0,
    YEAR_SUMMARY: 1,
    RIVALRY: 2,
    BREAKING_NEWS: 3,
    RANKING_MILESTONE: 5,
    SPONSOR: 5,
    COACH_START: 5,
    COACH_RUPTURE: 6,
    RETIREMENT_ANNOUNCED: 4,
    INJURY_MAJOR: 5,
    TITLES_MINOR: 6,
    GS_FINAL_LOSS: 7,
    YEAR_END_NO1: 8,
    MASTERS_1000: 9,
    FINALS: 9,
    SLAM_CLASH: 10,
    GRAND_SLAM: 11,
    CAREER_SLAM: 18,  // 6 slams diferentes — feito muito mais raro
  };
  events.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return (typePri[b.type] ?? 3) - (typePri[a.type] ?? 3);
  });

  return { events, epitaph, stats: pStats };
}
