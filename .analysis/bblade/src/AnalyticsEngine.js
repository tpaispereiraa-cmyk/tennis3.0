// AnalyticsEngine.js - Sistema de Analytics Profundo
// Fase 3: Insights profundos, visualização de dados, progressão

export class UniverseAnalytics {
  constructor(universe) {
    this.universe = universe;
    this.cache = new Map();
    this.cacheTimeout = 5000; // 5 segundos
  }

  clearCache() {
    this.cache.clear();
  }

  getCached(key, calculator) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    const data = calculator();
    this.cache.set(key, { data, timestamp: Date.now() });
    return data;
  }

  // ============ META ANALYSIS ============

  getTypeDistribution(season = null) {
    const key = `typeDistribution_${season || 'all'}`;
    return this.getCached(key, () => {
      const matches = season 
        ? this.universe.matchHistory.filter(m => m.season === season)
        : this.universe.matchHistory;

      const typeStats = {
        Attack: { picks: 0, wins: 0, matches: 0 },
        Defense: { picks: 0, wins: 0, matches: 0 },
        Stamina: { picks: 0, wins: 0, matches: 0 },
        Balance: { picks: 0, wins: 0, matches: 0 }
      };

      matches.forEach(match => {
        const p1Type = match.p1Combo?.layer?.type || 'Balance';
        const p2Type = match.p2Combo?.layer?.type || 'Balance';
        
        typeStats[p1Type].picks++;
        typeStats[p1Type].matches++;
        typeStats[p2Type].picks++;
        typeStats[p2Type].matches++;

        if (match.winner === match.player1) {
          typeStats[p1Type].wins++;
        } else {
          typeStats[p2Type].wins++;
        }
      });

      Object.keys(typeStats).forEach(type => {
        const stats = typeStats[type];
        stats.winRate = stats.matches > 0 ? (stats.wins / stats.matches) * 100 : 0;
        stats.pickRate = matches.length > 0 ? (stats.picks / (matches.length * 2)) * 100 : 0;
      });

      return typeStats;
    });
  }

  getArenaWinRates() {
    return this.getCached('arenaWinRates', () => {
      const arenaStats = {};
      
      this.universe.matchHistory.forEach(match => {
        const arena = match.arena || 'Standard';
        if (!arenaStats[arena]) {
          arenaStats[arena] = {
            Attack: { wins: 0, matches: 0 },
            Defense: { wins: 0, matches: 0 },
            Stamina: { wins: 0, matches: 0 },
            Balance: { wins: 0, matches: 0 },
            total: 0
          };
        }

        const p1Type = match.p1Combo?.layer?.type || 'Balance';
        const p2Type = match.p2Combo?.layer?.type || 'Balance';
        
        arenaStats[arena][p1Type].matches++;
        arenaStats[arena][p2Type].matches++;
        arenaStats[arena].total++;

        if (match.winner === match.player1) {
          arenaStats[arena][p1Type].wins++;
        } else {
          arenaStats[arena][p2Type].wins++;
        }
      });

      Object.keys(arenaStats).forEach(arena => {
        ['Attack', 'Defense', 'Stamina', 'Balance'].forEach(type => {
          const stats = arenaStats[arena][type];
          stats.winRate = stats.matches > 0 ? (stats.wins / stats.matches) * 100 : 0;
        });
      });

      return arenaStats;
    });
  }

  getPartUsageRate(season = null) {
    const key = `partUsage_${season || 'all'}`;
    return this.getCached(key, () => {
      const matches = season 
        ? this.universe.matchHistory.filter(m => m.season === season)
        : this.universe.matchHistory;

      const partUsage = {
        layers: {},
        discs: {},
        drivers: {}
      };

      matches.forEach(match => {
        [match.p1Combo, match.p2Combo].forEach(combo => {
          if (!combo) return;
          
          if (combo.layer) {
            partUsage.layers[combo.layer.name] = (partUsage.layers[combo.layer.name] || 0) + 1;
          }
          if (combo.disc) {
            partUsage.discs[combo.disc.name] = (partUsage.discs[combo.disc.name] || 0) + 1;
          }
          if (combo.driver) {
            partUsage.drivers[combo.driver.name] = (partUsage.drivers[combo.driver.name] || 0) + 1;
          }
        });
      });

      const totalPicks = matches.length * 2;
      
      ['layers', 'discs', 'drivers'].forEach(category => {
        Object.keys(partUsage[category]).forEach(part => {
          const count = partUsage[category][part];
          partUsage[category][part] = {
            count,
            rate: (count / totalPicks) * 100
          };
        });
      });

      return partUsage;
    });
  }

  getMetaTrends(lastNSeasons = 3) {
    const currentSeason = this.universe.season;
    const trends = [];

    for (let i = lastNSeasons - 1; i >= 0; i--) {
      const season = currentSeason - i;
      if (season <= 0) continue;
      
      const typeData = this.getTypeDistribution(season);
      trends.push({
        season,
        Attack: typeData.Attack.winRate,
        Defense: typeData.Defense.winRate,
        Stamina: typeData.Stamina.winRate,
        Balance: typeData.Balance.winRate
      });
    }

    return trends;
  }

  // ============ PLAYER ANALYTICS ============

  getHeadToHeadMatrix() {
    return this.getCached('h2hMatrix', () => {
      const players = this.universe.players;
      const matrix = {};

      players.forEach(p1 => {
        matrix[p1.name] = {};
        players.forEach(p2 => {
          if (p1.name === p2.name) {
            matrix[p1.name][p2.name] = { wins: 0, losses: 0, winRate: 0 };
            return;
          }

          const matches = this.universe.matchHistory.filter(m => 
            (m.player1 === p1.name && m.player2 === p2.name) ||
            (m.player1 === p2.name && m.player2 === p1.name)
          );

          let wins = 0, losses = 0;
          matches.forEach(m => {
            if (m.winner === p1.name) wins++;
            else losses++;
          });

          const total = wins + losses;
          matrix[p1.name][p2.name] = {
            wins,
            losses,
            winRate: total > 0 ? (wins / total) * 100 : 0
          };
        });
      });

      return matrix;
    });
  }

  getEloHistory(playerName) {
    const player = this.universe.players.find(p => p.name === playerName);
    if (!player) return [];

    const history = [];
    let currentElo = 1500;
    history.push({ match: 0, elo: currentElo, event: 'Start' });

    this.universe.matchHistory
      .filter(m => m.player1 === playerName || m.player2 === playerName)
      .forEach((match, idx) => {
        const isWinner = match.winner === playerName;
        const eloChange = isWinner ? 15 : -15;
        currentElo += eloChange;

        const event = match.tournament || 'Regular Match';
        history.push({
          match: idx + 1,
          elo: currentElo,
          event,
          result: isWinner ? 'W' : 'L'
        });
      });

    return history;
  }

  getFormCurve(playerName, lastNMatches = 30) {
    const matches = this.universe.matchHistory
      .filter(m => m.player1 === playerName || m.player2 === playerName)
      .slice(-lastNMatches);

    const curve = [];
    let runningWinRate = 0;
    const windowSize = 5;

    matches.forEach((match, idx) => {
      const isWin = match.winner === playerName;
      const recentMatches = matches.slice(Math.max(0, idx - windowSize + 1), idx + 1);
      const wins = recentMatches.filter(m => m.winner === playerName).length;
      runningWinRate = (wins / recentMatches.length) * 100;

      curve.push({
        match: idx + 1,
        winRate: runningWinRate,
        result: isWin ? 'W' : 'L'
      });
    });

    return curve;
  }

  getClutchStats(playerName) {
    const matches = this.universe.matchHistory.filter(m => 
      m.player1 === playerName || m.player2 === playerName
    );

    let matchPointsSaved = 0;
    let comebacks = 0;
    let clutchWins = 0;

    matches.forEach(match => {
      if (!match.rounds) return;
      
      const playerSide = match.player1 === playerName ? 'p1' : 'p2';
      const opponentSide = playerSide === 'p1' ? 'p2' : 'p1';
      
      let playerScore = 0;
      let opponentScore = 0;
      let opponentWasAhead = false;

      match.rounds.forEach(round => {
        if (round.winner === playerName) playerScore++;
        else opponentScore++;

        if (opponentScore === 2 && playerScore < 2) {
          opponentWasAhead = true;
        }
      });

      if (match.winner === playerName) {
        if (opponentWasAhead) {
          comebacks++;
          clutchWins++;
        }
        if (opponentScore === 2) {
          matchPointsSaved++;
        }
      }
    });

    return {
      matchPointsSaved,
      comebacks,
      clutchWins,
      totalMatches: matches.length,
      clutchRate: matches.length > 0 ? (clutchWins / matches.length) * 100 : 0
    };
  }

  getArenaSpecialization(playerName) {
    const arenaStats = {};
    
    this.universe.matchHistory
      .filter(m => m.player1 === playerName || m.player2 === playerName)
      .forEach(match => {
        const arena = match.arena || 'Standard';
        if (!arenaStats[arena]) {
          arenaStats[arena] = { wins: 0, matches: 0 };
        }
        
        arenaStats[arena].matches++;
        if (match.winner === playerName) {
          arenaStats[arena].wins++;
        }
      });

    Object.keys(arenaStats).forEach(arena => {
      const stats = arenaStats[arena];
      stats.winRate = stats.matches > 0 ? (stats.wins / stats.matches) * 100 : 0;
    });

    const sortedArenas = Object.entries(arenaStats)
      .sort((a, b) => b[1].winRate - a[1].winRate);

    return {
      byArena: arenaStats,
      best: sortedArenas[0] ? { arena: sortedArenas[0][0], ...sortedArenas[0][1] } : null,
      worst: sortedArenas[sortedArenas.length - 1] ? { 
        arena: sortedArenas[sortedArenas.length - 1][0], 
        ...sortedArenas[sortedArenas.length - 1][1] 
      } : null
    };
  }

  // ============ MATCH ANALYTICS ============

  getAverageDuration(filters = {}) {
    let matches = this.universe.matchHistory;

    if (filters.season) {
      matches = matches.filter(m => m.season === filters.season);
    }
    if (filters.tier) {
      matches = matches.filter(m => m.tier === filters.tier);
    }
    if (filters.arena) {
      matches = matches.filter(m => m.arena === filters.arena);
    }

    if (matches.length === 0) return 0;

    const totalDuration = matches.reduce((sum, m) => sum + (m.duration || 0), 0);
    return totalDuration / matches.length;
  }

  getBurstRateByType() {
    const typeStats = {
      Attack: { bursts: 0, matches: 0 },
      Defense: { bursts: 0, matches: 0 },
      Stamina: { bursts: 0, matches: 0 },
      Balance: { bursts: 0, matches: 0 }
    };

    this.universe.matchHistory.forEach(match => {
      if (!match.rounds) return;

      match.rounds.forEach(round => {
        const winnerType = round.winnerCombo?.layer?.type || 'Balance';
        typeStats[winnerType].matches++;
        
        if (round.method === 'Burst Finish') {
          typeStats[winnerType].bursts++;
        }
      });
    });

    Object.keys(typeStats).forEach(type => {
      const stats = typeStats[type];
      stats.burstRate = stats.matches > 0 ? (stats.bursts / stats.matches) * 100 : 0;
    });

    return typeStats;
  }

  getComboEffectiveness() {
    const comboStats = {};

    this.universe.matchHistory.forEach(match => {
      [match.p1Combo, match.p2Combo].forEach((combo, idx) => {
        if (!combo?.layer) return;

        const comboKey = `${combo.layer.name}/${combo.disc?.name || 'None'}/${combo.driver?.name || 'None'}`;
        if (!comboStats[comboKey]) {
          comboStats[comboKey] = {
            wins: 0,
            matches: 0,
            combo: combo
          };
        }

        comboStats[comboKey].matches++;
        
        const playerName = idx === 0 ? match.player1 : match.player2;
        if (match.winner === playerName) {
          comboStats[comboKey].wins++;
        }
      });
    });

    Object.keys(comboStats).forEach(key => {
      const stats = comboStats[key];
      stats.winRate = stats.matches > 0 ? (stats.wins / stats.matches) * 100 : 0;
    });

    return Object.entries(comboStats)
      .sort((a, b) => b[1].winRate - a[1].winRate)
      .slice(0, 20)
      .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
  }

  // ============ HISTORICAL ANALYTICS ============

  getRecordBook() {
    const records = {
      mostTitles: { player: null, count: 0 },
      longestStreak: { player: null, streak: 0, current: 0 },
      highestElo: { player: null, elo: 0 },
      mostWins: { player: null, wins: 0 },
      bestWinRate: { player: null, winRate: 0, wins: 0, matches: 0 },
      mostBursts: { player: null, bursts: 0 },
      mostPerfectGames: { player: null, perfects: 0 }
    };

    this.universe.players.forEach(player => {
      // Most Titles
      const titles = this.universe.seasonWinners.filter(w => w === player.name).length;
      if (titles > records.mostTitles.count) {
        records.mostTitles = { player: player.name, count: titles };
      }

      // Wins and Win Rate
      const playerMatches = this.universe.matchHistory.filter(m => 
        m.player1 === player.name || m.player2 === player.name
      );
      const wins = playerMatches.filter(m => m.winner === player.name).length;
      const winRate = playerMatches.length > 0 ? (wins / playerMatches.length) * 100 : 0;

      if (wins > records.mostWins.wins) {
        records.mostWins = { player: player.name, wins };
      }

      if (playerMatches.length >= 10 && winRate > records.bestWinRate.winRate) {
        records.bestWinRate = { 
          player: player.name, 
          winRate, 
          wins, 
          matches: playerMatches.length 
        };
      }

      // Longest Streak
      let currentStreak = 0;
      let maxStreak = 0;
      playerMatches.forEach(match => {
        if (match.winner === player.name) {
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      });

      if (maxStreak > records.longestStreak.streak) {
        records.longestStreak = { player: player.name, streak: maxStreak, current: currentStreak };
      }

      // Highest ELO
      if (player.elo > records.highestElo.elo) {
        records.highestElo = { player: player.name, elo: player.elo };
      }
    });

    return records;
  }

  getDecadeComparison() {
    const decades = {
      '2010s': { matches: 0, avgDuration: 0, bursts: 0 },
      '2020s': { matches: 0, avgDuration: 0, bursts: 0 }
    };

    this.universe.matchHistory.forEach(match => {
      const season = match.season || 1;
      const decade = season <= 10 ? '2010s' : '2020s';
      
      decades[decade].matches++;
      decades[decade].avgDuration += match.duration || 0;
      
      if (match.rounds) {
        match.rounds.forEach(round => {
          if (round.method === 'Burst Finish') {
            decades[decade].bursts++;
          }
        });
      }
    });

    Object.keys(decades).forEach(decade => {
      if (decades[decade].matches > 0) {
        decades[decade].avgDuration /= decades[decade].matches;
      }
    });

    return decades;
  }

  getUpsetRate(tier) {
    const tournamentMatches = this.universe.matchHistory.filter(m => 
      m.tier === tier && m.round
    );

    let upsets = 0;
    tournamentMatches.forEach(match => {
      const p1 = this.universe.players.find(p => p.name === match.player1);
      const p2 = this.universe.players.find(p => p.name === match.player2);
      
      if (!p1 || !p2) return;

      const eloDiff = Math.abs(p1.elo - p2.elo);
      if (eloDiff > 100) {
        const underdog = p1.elo < p2.elo ? match.player1 : match.player2;
        if (match.winner === underdog) {
          upsets++;
        }
      }
    });

    return tournamentMatches.length > 0 ? (upsets / tournamentMatches.length) * 100 : 0;
  }

  getDominanceIndex(playerName, season = null) {
    const seasonMatches = season
      ? this.universe.matchHistory.filter(m => m.season === season)
      : this.universe.matchHistory;

    const playerMatches = seasonMatches.filter(m => 
      m.player1 === playerName || m.player2 === playerName
    );

    if (playerMatches.length === 0) return 0;

    const wins = playerMatches.filter(m => m.winner === playerName).length;
    const winRate = (wins / playerMatches.length) * 100;

    const player = this.universe.players.find(p => p.name === playerName);
    const avgElo = this.universe.players.reduce((sum, p) => sum + p.elo, 0) / this.universe.players.length;
    const eloAdvantage = player ? ((player.elo - avgElo) / avgElo) * 100 : 0;

    // Dominance Index = (Win Rate * 0.7) + (ELO Advantage * 0.3)
    return (winRate * 0.7) + (eloAdvantage * 0.3);
  }
}
