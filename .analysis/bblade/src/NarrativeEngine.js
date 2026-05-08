// NarrativeEngine.js - Motor de Narrativas Épicas
// Transforma dados brutos em histórias emocionantes

class RivalryDetector {
  constructor() {
    this.rivalryTypes = {
      CLASSIC: 'CLASSIC',
      GIANT_KILLER: 'GIANT_KILLER',
      REMATCH: 'REMATCH',
      GRUDGE: 'GRUDGE'
    };
  }

  detectRivalries(season) {
    const headToHeadMap = this.buildHeadToHeadMap(season);
    const rivalries = [];

    for (const [pairKey, matches] of Object.entries(headToHeadMap)) {
      if (matches.length < 2) continue; // ✅ REDUZIDO: Mínimo 2 encontros (antes era 3)

      const [p1Id, p2Id] = pairKey.split('_vs_');
      const rivalry = this.analyzeRivalry(p1Id, p2Id, matches, season);
      
      // ✅ REDUZIDO: Intensidade mínima de 0.25 (antes era 0.5)
      if (rivalry.intensity > 0.25) {
        rivalries.push(rivalry);
      }
    }

    return rivalries.sort((a, b) => b.intensity - a.intensity);
  }

  buildHeadToHeadMap(season) {
    const map = {};
    
    season.tournaments.forEach(tournament => {
      tournament.matches.forEach(match => {
        const key = this.getPairKey(match.player1.id, match.player2.id);
        if (!map[key]) map[key] = [];
        map[key].push({
          ...match,
          tournamentName: tournament.name,
          round: match.round,
          isFinal: match.round === 'Final'
        });
      });
    });

    return map;
  }

  getPairKey(id1, id2) {
    return id1 < id2 ? `${id1}_vs_${id2}` : `${id2}_vs_${id1}`;
  }

  analyzeRivalry(p1Id, p2Id, matches, season) {
    const p1Wins = matches.filter(m => 
      (m.player1.id === p1Id && m.winner === m.player1.id) ||
      (m.player2.id === p1Id && m.winner === m.player2.id)
    ).length;
    
    const p2Wins = matches.length - p1Wins;
    const winRate = p1Wins / matches.length;
    
    // Calcula rankings médios
    const p1Rank = this.getAverageRank(p1Id, season);
    const p2Rank = this.getAverageRank(p2Id, season);
    
    // Detecta tipo de rivalidade
    const type = this.detectRivalryType(winRate, matches, p1Rank, p2Rank);
    
    // Calcula intensidade
    const intensity = this.calculateIntensity({
      matches,
      winRate,
      p1Rank,
      p2Rank,
      type
    });

    // Partidas memoráveis
    const keyMoments = this.extractKeyMoments(matches);

    return {
      player1: { id: p1Id, wins: p1Wins, rank: p1Rank },
      player2: { id: p2Id, wins: p2Wins, rank: p2Rank },
      type,
      intensity,
      totalMeetings: matches.length,
      keyMoments,
      storyline: this.generateStoryline({ 
        p1Id, p2Id, p1Wins, p2Wins, type, matches, keyMoments 
      })
    };
  }

  detectRivalryType(winRate, matches, p1Rank, p2Rank) {
    // ✅ RELAXADO: CLASSIC - equilíbrio (40-60%) e mínimo 2 encontros (antes era 45-55% e 5 encontros)
    if (winRate >= 0.40 && winRate <= 0.60 && matches.length >= 2) {
      return this.rivalryTypes.CLASSIC;
    }

    // GIANT_KILLER: ranking inferior vencendo superior
    if (Math.abs(p1Rank - p2Rank) > 10) {
      const lowerRankWinning = (p1Rank > p2Rank && winRate > 0.6) || 
                               (p2Rank > p1Rank && winRate < 0.4);
      if (lowerRankWinning) {
        return this.rivalryTypes.GIANT_KILLER;
      }
    }

    // REMATCH: se encontraram em finais
    if (matches.some(m => m.isFinal)) {
      return this.rivalryTypes.REMATCH;
    }

    // ✅ RELAXADO: GRUDGE - partidas intensas e fechadas (antes 60%, agora 50%)
    const closeMatches = matches.filter(m => {
      const scoreDiff = Math.abs(m.score.player1 - m.score.player2);
      return scoreDiff <= 1;
    }).length;

    if (closeMatches / matches.length > 0.5) {
      return this.rivalryTypes.GRUDGE;
    }

    return this.rivalryTypes.CLASSIC;
  }

  calculateIntensity(data) {
    let intensity = 0;

    // ✅ AUMENTADO: Base inicial para qualquer encontro repetido
    intensity += 0.2; // Qualquer rivalidade começa com 20% de intensidade

    // ✅ AUMENTADO: Número de encontros (mais encontros = mais intensa)
    intensity += Math.min(data.matches.length / 5, 0.4); // Antes era /10 e max 0.3

    // Equilíbrio (50% = mais intenso)
    const balance = 1 - Math.abs(data.winRate - 0.5) * 2;
    intensity += balance * 0.25;

    // ✅ AUMENTADO: Finals weight - encontros em finais são muito significativos
    const finalsCount = data.matches.filter(m => m.isFinal).length;
    intensity += finalsCount * 0.15; // Antes era 0.1

    // Tipo de rivalidade
    if (data.type === this.rivalryTypes.CLASSIC) intensity += 0.15;
    if (data.type === this.rivalryTypes.GRUDGE) intensity += 0.2;
    if (data.type === this.rivalryTypes.REMATCH) intensity += 0.15; // ✅ NOVO: Bônus para rematches
    if (data.type === this.rivalryTypes.GIANT_KILLER) intensity += 0.2; // ✅ NOVO: Bônus para giant killers

    // Close matches
    const closeMatches = data.matches.filter(m => 
      Math.abs(m.score.player1 - m.score.player2) <= 1
    ).length;
    intensity += (closeMatches / data.matches.length) * 0.2;

    return Math.min(intensity, 1);
  }

  extractKeyMoments(matches) {
    return matches
      .filter(m => m.isFinal || m.hasComeback || m.hasBurst)
      .slice(-3) // Últimos 3 momentos chave
      .map(m => ({
        tournament: m.tournamentName,
        round: m.round,
        winner: m.winner,
        score: m.score,
        type: m.isFinal ? 'FINAL' : m.hasBurst ? 'BURST' : 'COMEBACK'
      }));
  }

  generateStoryline(data) {
    const { p1Id, p2Id, p1Wins, p2Wins, type, matches, keyMoments } = data;
    const total = matches.length;
    const recentMatches = matches.slice(-3);

    let storyline = '';

    switch(type) {
      case this.rivalryTypes.CLASSIC:
        storyline = `A clash of titans. ${p1Id} and ${p2Id} have met ${total} times, ` +
                   `with the series perfectly balanced at ${p1Wins}-${p2Wins}. ` +
                   `Every encounter is a battle for supremacy.`;
        break;

      case this.rivalryTypes.GIANT_KILLER:
        const underdog = p1Wins > p2Wins ? p1Id : p2Id;
        const favorite = p1Wins > p2Wins ? p2Id : p1Id;
        storyline = `The ultimate David vs Goliath story. ${underdog} has made a career ` +
                   `out of slaying giants, with an incredible record against ${favorite}.`;
        break;

      case this.rivalryTypes.REMATCH:
        const finalsCount = matches.filter(m => m.isFinal).length;
        storyline = `They've danced on the biggest stage ${finalsCount} times. ` +
                   `When ${p1Id} and ${p2Id} meet, championships are on the line.`;
        break;

      case this.rivalryTypes.GRUDGE:
        storyline = `Every point matters in this war of attrition. ${p1Id} and ${p2Id} ` +
                   `have built a rivalry on razor-thin margins and unwavering intensity.`;
        break;
    }

    // Adiciona contexto recente
    if (recentMatches.length > 0) {
      const recentWinner = recentMatches[recentMatches.length - 1].winner;
      const streak = this.calculateStreak(recentMatches, recentWinner);
      
      if (streak >= 2) {
        storyline += ` ${recentWinner} has won the last ${streak} encounters.`;
      }
    }

    return storyline;
  }

  calculateStreak(matches, playerId) {
    let streak = 0;
    for (let i = matches.length - 1; i >= 0; i--) {
      if (matches[i].winner === playerId) streak++;
      else break;
    }
    return streak;
  }

  getAverageRank(playerId, season) {
    // Calcula ranking médio baseado em performance
    const playerMatches = [];
    season.tournaments.forEach(t => {
      t.matches.forEach(m => {
        if (m.player1.id === playerId || m.player2.id === playerId) {
          playerMatches.push(m);
        }
      });
    });

    if (playerMatches.length === 0) return 999;

    // Usa seed médio como proxy de ranking
    const avgSeed = playerMatches.reduce((sum, m) => {
      const seed = m.player1.id === playerId ? m.player1.seed : m.player2.seed;
      return sum + (seed || 50);
    }, 0) / playerMatches.length;

    return Math.round(avgSeed);
  }
}

class EraSystem {
  constructor() {
    this.eraTypes = {
      DOMINANCE: 'DOMINANCE',
      GOLDEN_AGE: 'GOLDEN_AGE',
      TRANSITION: 'TRANSITION'
    };

    this.legacyTiers = {
      LEGEND: 'LEGEND',
      ELITE: 'ELITE',
      ESTABLISHED: 'ESTABLISHED',
      RISING: 'RISING'
    };
  }

  analyzeEra(seasons) {
    const eras = [];
    let currentEra = null;

    seasons.forEach((season, idx) => {
      const dominantPlayer = this.getDominantPlayer(season);
      const championsDiversity = this.getChampionsDiversity(season);
      const averageAge = this.getAverageChampionAge(season);

      // Detecta DOMINANCE
      if (dominantPlayer.titleCount >= 2) {
        if (currentEra?.type === this.eraTypes.DOMINANCE && 
            currentEra.player === dominantPlayer.id) {
          currentEra.endYear = season.year;
          currentEra.titleCount += dominantPlayer.titleCount;
        } else {
          if (currentEra) eras.push(currentEra);
          currentEra = {
            type: this.eraTypes.DOMINANCE,
            player: dominantPlayer.id,
            startYear: season.year,
            endYear: season.year,
            titleCount: dominantPlayer.titleCount
          };
        }
      }
      // Detecta GOLDEN_AGE
      else if (championsDiversity >= 5) {
        if (currentEra) eras.push(currentEra);
        currentEra = {
          type: this.eraTypes.GOLDEN_AGE,
          year: season.year,
          champions: championsDiversity,
          description: 'An era of unprecedented competition'
        };
        eras.push(currentEra);
        currentEra = null;
      }
      // Detecta TRANSITION
      else if (idx > 0 && averageAge < 25) {
        if (currentEra?.type === this.eraTypes.TRANSITION) {
          currentEra.endYear = season.year;
        } else {
          if (currentEra) eras.push(currentEra);
          currentEra = {
            type: this.eraTypes.TRANSITION,
            startYear: season.year,
            endYear: season.year,
            description: 'The rise of new blood'
          };
        }
      }
    });

    if (currentEra) eras.push(currentEra);

    return eras.map(era => ({
      ...era,
      name: this.getEraName(era)
    }));
  }

  getDominantPlayer(season) {
    const titleCounts = {};
    
    season.tournaments.forEach(tournament => {
      const winner = tournament.winner;
      if (winner) {
        titleCounts[winner] = (titleCounts[winner] || 0) + 1;
      }
    });

    const entries = Object.entries(titleCounts);
    if (entries.length === 0) return { id: null, titleCount: 0 };

    const [id, count] = entries.reduce((max, curr) => 
      curr[1] > max[1] ? curr : max
    );

    return { id, titleCount: count };
  }

  getChampionsDiversity(season) {
    const uniqueChampions = new Set();
    season.tournaments.forEach(t => {
      if (t.winner) uniqueChampions.add(t.winner);
    });
    return uniqueChampions.size;
  }

  getAverageChampionAge(season) {
    const ages = [];
    season.tournaments.forEach(t => {
      if (t.winner && t.winnerAge) {
        ages.push(t.winnerAge);
      }
    });
    return ages.length > 0 
      ? ages.reduce((sum, age) => sum + age, 0) / ages.length 
      : 30;
  }

  getLegacyTier(player, allSeasons) {
    const stats = this.calculateLegacyStats(player, allSeasons);

    // LEGEND: 10+ títulos, 5+ anos dominando
    if (stats.totalTitles >= 10 && stats.yearsActive >= 5) {
      return this.legacyTiers.LEGEND;
    }

    // ELITE: 5+ títulos, 3+ anos
    if (stats.totalTitles >= 5 && stats.yearsActive >= 3) {
      return this.legacyTiers.ELITE;
    }

    // ESTABLISHED: 2+ títulos
    if (stats.totalTitles >= 2) {
      return this.legacyTiers.ESTABLISHED;
    }

    // RISING: novo talento
    return this.legacyTiers.RISING;
  }

  calculateLegacyStats(player, allSeasons) {
    let totalTitles = 0;
    const yearsWithTitles = new Set();

    allSeasons.forEach(season => {
      season.tournaments.forEach(tournament => {
        if (tournament.winner === player.id) {
          totalTitles++;
          yearsWithTitles.add(season.year);
        }
      });
    });

    return {
      totalTitles,
      yearsActive: yearsWithTitles.size
    };
  }

  getEraName(era) {
    switch(era.type) {
      case this.eraTypes.DOMINANCE:
        const years = era.startYear === era.endYear 
          ? era.startYear 
          : `${era.startYear}-${era.endYear}`;
        return `The ${era.player} Era (${years})`;

      case this.eraTypes.GOLDEN_AGE:
        return `The Golden Age of ${era.year}`;

      case this.eraTypes.TRANSITION:
        const transYears = era.startYear === era.endYear
          ? era.startYear
          : `${era.startYear}-${era.endYear}`;
        return `The Great Transition (${transYears})`;

      default:
        return 'Unknown Era';
    }
  }
}

class HighlightGenerator {
  constructor() {
    this.highlightTypes = {
      UPSET_OF_YEAR: 'UPSET_OF_YEAR',
      MARATHON_MATCH: 'MARATHON_MATCH',
      PERFECT_RUN: 'PERFECT_RUN',
      COMEBACK_KING: 'COMEBACK_KING',
      BURST_SPECIALIST: 'BURST_SPECIALIST',
      CLUTCH_PLAYER: 'CLUTCH_PLAYER'
    };
  }

  generateSeasonHighlights(season) {
    const highlights = [];

    // UPSET_OF_YEAR
    const biggestUpset = this.findBiggestUpset(season);
    if (biggestUpset) {
      highlights.push({
        type: this.highlightTypes.UPSET_OF_YEAR,
        ...biggestUpset,
        description: `Seed #${biggestUpset.winnerSeed} ${biggestUpset.winner} shocked ` +
                    `the world by defeating #${biggestUpset.loserSeed} ${biggestUpset.loser}!`
      });
    }

    // MARATHON_MATCH
    const longestMatch = this.findLongestMatch(season);
    if (longestMatch) {
      highlights.push({
        type: this.highlightTypes.MARATHON_MATCH,
        ...longestMatch,
        description: `An epic ${longestMatch.duration}-round battle for the ages!`
      });
    }

    // PERFECT_RUN
    const perfectRuns = this.findPerfectRuns(season);
    if (perfectRuns.length > 0) {
      highlights.push({
        type: this.highlightTypes.PERFECT_RUN,
        players: perfectRuns,
        description: `${perfectRuns[0]} didn't drop a single round in ${perfectRuns.length} tournament(s)!`
      });
    }

    // COMEBACK_KING
    const comebackKing = this.findComebackKing(season);
    if (comebackKing) {
      highlights.push({
        type: this.highlightTypes.COMEBACK_KING,
        ...comebackKing,
        description: `${comebackKing.player} pulled off ${comebackKing.comebacks} impossible comebacks!`
      });
    }

    // BURST_SPECIALIST
    const burstSpecialist = this.findBurstSpecialist(season);
    if (burstSpecialist) {
      highlights.push({
        type: this.highlightTypes.BURST_SPECIALIST,
        ...burstSpecialist,
        description: `${burstSpecialist.player} delivered ${burstSpecialist.bursts} devastating bursts!`
      });
    }

    // CLUTCH_PLAYER
    const clutchPlayer = this.findClutchPlayer(season);
    if (clutchPlayer) {
      highlights.push({
        type: this.highlightTypes.CLUTCH_PLAYER,
        ...clutchPlayer,
        description: `${clutchPlayer.player} saved ${clutchPlayer.matchPoints} match points!`
      });
    }

    return highlights;
  }

  findBiggestUpset(season) {
    let biggestUpset = null;
    let maxDiff = 0;

    season.tournaments.forEach(tournament => {
      tournament.matches.forEach(match => {
        if (!match.player1.seed || !match.player2.seed) return;

        const seedDiff = Math.abs(match.player1.seed - match.player2.seed);
        const lowerSeedWon = (match.winner === match.player1.id && match.player1.seed > match.player2.seed) ||
                            (match.winner === match.player2.id && match.player2.seed > match.player1.seed);

        if (lowerSeedWon && seedDiff > maxDiff) {
          maxDiff = seedDiff;
          biggestUpset = {
            tournament: tournament.name,
            winner: match.winner,
            winnerSeed: match.winner === match.player1.id ? match.player1.seed : match.player2.seed,
            loser: match.winner === match.player1.id ? match.player2.id : match.player1.id,
            loserSeed: match.winner === match.player1.id ? match.player2.seed : match.player1.seed,
            seedDifference: seedDiff
          };
        }
      });
    });

    return biggestUpset;
  }

  findLongestMatch(season) {
    let longest = null;
    let maxRounds = 0;

    season.tournaments.forEach(tournament => {
      tournament.matches.forEach(match => {
        const totalRounds = (match.score?.player1 || 0) + (match.score?.player2 || 0);
        if (totalRounds > maxRounds) {
          maxRounds = totalRounds;
          longest = {
            tournament: tournament.name,
            player1: match.player1.id,
            player2: match.player2.id,
            score: match.score,
            duration: totalRounds
          };
        }
      });
    });

    return longest;
  }

  findPerfectRuns(season) {
    const playerRounds = {};

    season.tournaments.forEach(tournament => {
      const tournamentRounds = {};

      tournament.matches.forEach(match => {
        // Track rounds dropped
        if (!tournamentRounds[match.player1.id]) {
          tournamentRounds[match.player1.id] = { dropped: 0, won: 0 };
        }
        if (!tournamentRounds[match.player2.id]) {
          tournamentRounds[match.player2.id] = { dropped: 0, won: 0 };
        }

        if (match.winner === match.player1.id) {
          tournamentRounds[match.player1.id].dropped += match.score?.player2 || 0;
          tournamentRounds[match.player1.id].won++;
        } else {
          tournamentRounds[match.player2.id].dropped += match.score?.player1 || 0;
          tournamentRounds[match.player2.id].won++;
        }
      });

      // Check for perfect runs (won tournament without dropping rounds)
      Object.entries(tournamentRounds).forEach(([player, stats]) => {
        if (stats.dropped === 0 && stats.won >= 3 && tournament.winner === player) {
          if (!playerRounds[player]) playerRounds[player] = 0;
          playerRounds[player]++;
        }
      });
    });

    return Object.entries(playerRounds)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([player]) => player);
  }

  findComebackKing(season) {
    const comebacks = {};

    season.tournaments.forEach(tournament => {
      tournament.matches.forEach(match => {
        // Detecta comeback 0-2 para 3-2
        if (match.score && match.score.player1 === 3 && match.score.player2 === 2) {
          // Precisa verificar se estava 0-2 (não temos histórico detalhado, então aproximamos)
          comebacks[match.player1.id] = (comebacks[match.player1.id] || 0) + 0.5;
        }
        if (match.score && match.score.player2 === 3 && match.score.player1 === 2) {
          comebacks[match.player2.id] = (comebacks[match.player2.id] || 0) + 0.5;
        }
      });
    });

    const entries = Object.entries(comebacks);
    if (entries.length === 0) return null;

    const [player, count] = entries.reduce((max, curr) => 
      curr[1] > max[1] ? curr : max
    );

    return {
      player,
      comebacks: Math.round(count)
    };
  }

  findBurstSpecialist(season) {
    const bursts = {};

    season.tournaments.forEach(tournament => {
      tournament.matches.forEach(match => {
        if (match.hasBurst) {
          bursts[match.winner] = (bursts[match.winner] || 0) + 1;
        }
      });
    });

    const entries = Object.entries(bursts);
    if (entries.length === 0) return null;

    const [player, count] = entries.reduce((max, curr) => 
      curr[1] > max[1] ? curr : max
    );

    return { player, bursts: count };
  }

  findClutchPlayer(season) {
    const clutchMoments = {};

    season.tournaments.forEach(tournament => {
      tournament.matches.forEach(match => {
        // Match point = quando estava 2-2 e ganhou 3-2
        if (match.score && 
            ((match.score.player1 === 3 && match.score.player2 === 2) ||
             (match.score.player2 === 3 && match.score.player1 === 2))) {
          clutchMoments[match.winner] = (clutchMoments[match.winner] || 0) + 1;
        }
      });
    });

    const entries = Object.entries(clutchMoments);
    if (entries.length === 0) return null;

    const [player, count] = entries.reduce((max, curr) => 
      curr[1] > max[1] ? curr : max
    );

    return { player, matchPoints: count };
  }

  generateCareerHighlights(player, allSeasons) {
    const highlights = [];

    let totalTitles = 0;
    let totalMatches = 0;
    let totalWins = 0;
    let longestWinStreak = 0;
    let currentStreak = 0;

    allSeasons.forEach(season => {
      season.tournaments.forEach(tournament => {
        if (tournament.winner === player.id) {
          totalTitles++;
        }

        tournament.matches.forEach(match => {
          if (match.player1.id === player.id || match.player2.id === player.id) {
            totalMatches++;
            if (match.winner === player.id) {
              totalWins++;
              currentStreak++;
              longestWinStreak = Math.max(longestWinStreak, currentStreak);
            } else {
              currentStreak = 0;
            }
          }
        });
      });
    });

    highlights.push({
      type: 'CAREER_TITLES',
      value: totalTitles,
      description: `${totalTitles} tournament victories`
    });

    const winRate = totalMatches > 0 ? (totalWins / totalMatches * 100).toFixed(1) : 0;
    highlights.push({
      type: 'WIN_RATE',
      value: winRate,
      description: `${winRate}% career win rate (${totalWins}-${totalMatches - totalWins})`
    });

    if (longestWinStreak > 0) {
      highlights.push({
        type: 'LONGEST_STREAK',
        value: longestWinStreak,
        description: `${longestWinStreak}-match winning streak`
      });
    }

    return highlights;
  }
}

class NarrativeEngine {
  constructor() {
    this.rivalryDetector = new RivalryDetector();
    this.eraSystem = new EraSystem();
    this.highlightGenerator = new HighlightGenerator();
    this.rivalries = []; // 🔧 FIX: Array para armazenar rivalidades
  }

  // API Principal
  analyzeNarratives(currentSeason, allSeasons, players) {
    // 🔧 FIX: Armazenar rivalidades detectadas
    this.rivalries = this.rivalryDetector.detectRivalries(currentSeason);
    
    return {
      rivalries: this.rivalries,
      eras: this.eraSystem.analyzeEra(allSeasons),
      seasonHighlights: this.highlightGenerator.generateSeasonHighlights(currentSeason),
      legacyTiers: this.generateLegacyTiers(players, allSeasons)
    };
  }
  
  // 🔧 FIX: Adicionar método para obter rivalidades
  getRivalries() {
    return this.rivalries || [];
  }
  
  // 🔧 FIX: Adicionar método para obter rivalidade específica
  getRivalry(player1Id, player2Id) {
    if (!this.rivalries || this.rivalries.length === 0) return null;
    
    return this.rivalries.find(r => 
      (r.player1?.id === player1Id && r.player2?.id === player2Id) ||
      (r.player2?.id === player1Id && r.player1?.id === player2Id)
    );
  }

  generateLegacyTiers(players, allSeasons) {
    return players.map(player => ({
      player: player.id,
      tier: this.eraSystem.getLegacyTier(player, allSeasons),
      highlights: this.highlightGenerator.generateCareerHighlights(player, allSeasons)
    }));
  }

  getRivalryStoryline(player1Id, player2Id, currentSeason) {
    const rivalries = this.rivalryDetector.detectRivalries(currentSeason);
    const rivalry = rivalries.find(r => 
      (r.player1.id === player1Id && r.player2.id === player2Id) ||
      (r.player2.id === player1Id && r.player1.id === player2Id)
    );

    return rivalry ? rivalry.storyline : null;
  }
}

export default NarrativeEngine;
export { RivalryDetector, EraSystem, HighlightGenerator };
