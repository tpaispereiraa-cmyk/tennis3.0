// EventsManager.js - Eventos Especiais e Dinâmicos
// Cria momentos épicos emergentes baseados em condições do universo

class SpecialEventsSystem {
  constructor() {
    this.eventTypes = {
      // Scheduled Events
      BATTLE_OF_LEGENDS: 'BATTLE_OF_LEGENDS',
      RIVALS_SHOWDOWN: 'RIVALS_SHOWDOWN',
      RISING_STARS: 'RISING_STARS',
      COUNTRY_WARS: 'COUNTRY_WARS',
      
      // Dynamic Events
      STREAK_CHALLENGE: 'STREAK_CHALLENGE',
      RETIREMENT_MATCH: 'RETIREMENT_MATCH',
      REDEMPTION_ARC: 'REDEMPTION_ARC',
      GRUDGE_REMATCH: 'GRUDGE_REMATCH',
      LEGEND_VS_ROOKIE: 'LEGEND_VS_ROOKIE',
      TITLE_DEFENSE: 'TITLE_DEFENSE',
      COMEBACK_SPECIAL: 'COMEBACK_SPECIAL'
    };

    this.scheduledEvents = [
      {
        type: this.eventTypes.BATTLE_OF_LEGENDS,
        frequency: 'YEARLY',
        month: 12, // Dezembro
        name: 'Battle of Legends',
        description: 'The 8 greatest bladers of all time compete in a round-robin exhibition',
        format: 'ROUND_ROBIN',
        participants: 8,
        qualification: 'TOP_8_ALLTIME'
      },
      {
        type: this.eventTypes.RIVALS_SHOWDOWN,
        frequency: 'QUARTERLY',
        months: [3, 6, 9, 12],
        name: 'Rivals Showdown',
        description: 'The top 3 rivalries settle scores in best-of-7 matches',
        format: 'BEST_OF_7',
        participants: 6, // 3 rivalries
        qualification: 'TOP_3_RIVALRIES'
      },
      {
        type: this.eventTypes.RISING_STARS,
        frequency: 'YEARLY',
        month: 6, // Junho
        name: 'Rising Stars Championship',
        description: 'Young guns under 23 battle for supremacy',
        format: 'SINGLE_ELIM_32',
        participants: 32,
        qualification: 'AGE_UNDER_23'
      },
      {
        type: this.eventTypes.COUNTRY_WARS,
        frequency: 'BIANNUAL',
        months: [1], // January every 2 years
        yearMod: 2,
        name: 'Country Wars',
        description: 'Nations field teams of 4 bladers in ultimate team competition',
        format: 'TEAM_TOURNAMENT',
        participants: 32, // 8 countries x 4
        qualification: 'TOP_4_PER_COUNTRY'
      }
    ];

    this.activeEvents = [];
  }

  checkScheduledEvents(currentMonth, currentYear, universe) {
    const triggeredEvents = [];

    this.scheduledEvents.forEach(eventConfig => {
      if (this.shouldTriggerScheduledEvent(eventConfig, currentMonth, currentYear)) {
        const event = this.generateEvent(eventConfig, universe);
        if (event) {
          triggeredEvents.push(event);
        }
      }
    });

    return triggeredEvents;
  }

  shouldTriggerScheduledEvent(config, month, year) {
    if (config.frequency === 'YEARLY') {
      return config.month === month;
    }

    if (config.frequency === 'QUARTERLY') {
      return config.months.includes(month);
    }

    if (config.frequency === 'BIANNUAL') {
      return config.months.includes(month) && year % config.yearMod === 0;
    }

    return false;
  }

  checkDynamicEvents(universe) {
    const triggeredEvents = [];

    // STREAK_CHALLENGE
    const streakEvent = this.checkStreakChallenge(universe);
    if (streakEvent) triggeredEvents.push(streakEvent);

    // RETIREMENT_MATCH
    const retirementEvent = this.checkRetirementMatch(universe);
    if (retirementEvent) triggeredEvents.push(retirementEvent);

    // REDEMPTION_ARC
    const redemptionEvent = this.checkRedemptionArc(universe);
    if (redemptionEvent) triggeredEvents.push(redemptionEvent);

    // GRUDGE_REMATCH
    const grudgeEvent = this.checkGrudgeRematch(universe);
    if (grudgeEvent) triggeredEvents.push(grudgeEvent);

    // LEGEND_VS_ROOKIE
    const legendRookieEvent = this.checkLegendVsRookie(universe);
    if (legendRookieEvent) triggeredEvents.push(legendRookieEvent);

    // TITLE_DEFENSE
    const titleDefenseEvent = this.checkTitleDefense(universe);
    if (titleDefenseEvent) triggeredEvents.push(titleDefenseEvent);
    
    // ✅ NOVO: RIVALRY_SHOWDOWN - Confronto direto entre rivais
    const rivalryShowdownEvent = this.checkRivalryShowdown(universe);
    if (rivalryShowdownEvent) triggeredEvents.push(rivalryShowdownEvent);
    
    // ✅ NOVO: UNFINISHED_BUSINESS - Revanche após derrota significativa
    const unfinishedBusinessEvent = this.checkUnfinishedBusiness(universe);
    if (unfinishedBusinessEvent) triggeredEvents.push(unfinishedBusinessEvent);

    return triggeredEvents;
  }

  checkStreakChallenge(universe) {
    // Procura por jogadores com 15+ vitórias consecutivas
    const players = universe.getActivePlayers();
    
    for (const player of players) {
      const streak = this.calculateWinStreak(player, universe);
      
      if (streak >= 15) {
        return this.generateEvent({
          type: this.eventTypes.STREAK_CHALLENGE,
          name: `${player.name}'s Streak Challenge`,
          description: `Can anyone stop ${player.name}'s incredible ${streak}-match winning streak?`,
          format: 'GAUNTLET',
          participants: 5, // Jogador + 4 desafiantes
          protagonist: player.id,
          stakes: `${streak}-match streak on the line`
        }, universe);
      }
    }

    return null;
  }

  checkRetirementMatch(universe) {
    // Procura por jogadores perto da aposentadoria (age > 35)
    const players = universe.getActivePlayers();
    
    for (const player of players) {
      if (player.age >= 35 && Math.random() < 0.05) { // 5% chance por mês
        const rival = this.findGreatestRival(player, universe);
        
        return this.generateEvent({
          type: this.eventTypes.RETIREMENT_MATCH,
          name: `${player.name}'s Farewell Match`,
          description: `A legend hangs up the launcher. One final battle against ${rival?.name || 'a worthy opponent'}.`,
          format: 'BEST_OF_7',
          participants: 2,
          protagonist: player.id,
          opponent: rival?.id,
          stakes: 'Legacy and honor'
        }, universe);
      }
    }

    return null;
  }

  checkRedemptionArc(universe) {
    // Procura por ex-campeões que não ganham há 24+ meses
    const players = universe.getActivePlayers();
    const currentMonth = universe.currentMonth;
    
    for (const player of players) {
      const lastTitle = this.getLastTitleMonth(player, universe);
      const monthsSinceTitle = currentMonth - lastTitle;
      
      if (lastTitle > 0 && monthsSinceTitle >= 24) {
        return this.generateEvent({
          type: this.eventTypes.REDEMPTION_ARC,
          name: `${player.name}'s Redemption`,
          description: `${monthsSinceTitle} months without a title. Can ${player.name} reclaim past glory?`,
          format: 'SINGLE_ELIM_16',
          participants: 16,
          protagonist: player.id,
          stakes: 'A return to greatness'
        }, universe);
      }
    }

    return null;
  }

  checkGrudgeRematch(universe) {
    // Procura por rivalidades onde um jogador perdeu 3+ vezes seguidas
    const rivalries = universe.narrativeEngine?.rivalryDetector.detectRivalries(
      universe.getCurrentSeason()
    ) || [];

    for (const rivalry of rivalries) {
      const recentMatches = this.getRecentMatches(
        rivalry.player1.id, 
        rivalry.player2.id, 
        universe
      );

      if (recentMatches.length >= 3) {
        const allSameWinner = recentMatches.every(m => m.winner === recentMatches[0].winner);
        
        if (allSameWinner) {
          const loser = recentMatches[0].winner === rivalry.player1.id 
            ? rivalry.player2.id 
            : rivalry.player1.id;

          return this.generateEvent({
            type: this.eventTypes.GRUDGE_REMATCH,
            name: 'The Grudge Match',
            description: `${loser} demands a rematch after 3 straight losses. Pride is on the line!`,
            format: 'BEST_OF_7',
            participants: 2,
            protagonist: loser,
            opponent: recentMatches[0].winner,
            stakes: 'Revenge and respect'
          }, universe);
        }
      }
    }

    return null;
  }

  checkLegendVsRookie(universe) {
    // Top 3 vs estrela nascente (age < 20, recent success)
    const players = universe.getActivePlayers();
    const top3 = this.getTop3Players(universe);
    const rookies = players.filter(p => p.age < 20);

    for (const rookie of rookies) {
      const recentWins = this.getRecentWins(rookie, universe, 3);
      
      if (recentWins >= 2) { // 2+ wins in last 3 months
        const legend = top3[Math.floor(Math.random() * top3.length)];
        
        return this.generateEvent({
          type: this.eventTypes.LEGEND_VS_ROOKIE,
          name: 'Legend vs Rising Star',
          description: `The young gun ${rookie.name} challenges legend ${legend.name}!`,
          format: 'BEST_OF_5',
          participants: 2,
          protagonist: rookie.id,
          opponent: legend.id,
          stakes: 'Passing of the torch?'
        }, universe);
      }
    }

    return null;
  }

  checkTitleDefense(universe) {
    // Último campeão defende contra desafiante
    const lastChampion = universe.getLastTournamentWinner();
    if (!lastChampion) return null;

    const challenger = this.findTopContender(lastChampion, universe);
    if (!challenger) return null;

    // 10% chance por mês após ganhar título
    if (Math.random() < 0.1) {
      return this.generateEvent({
        type: this.eventTypes.TITLE_DEFENSE,
        name: 'Championship Defense',
        description: `${lastChampion.name} puts the title on the line against top contender ${challenger.name}!`,
        format: 'BEST_OF_7',
        participants: 2,
        protagonist: lastChampion.id,
        opponent: challenger.id,
        stakes: 'Championship glory'
      }, universe);
    }

    return null;
  }

  // ✅ NOVO: Confronto direto entre jogadores com rivalidade estabelecida
  checkRivalryShowdown(universe) {
    const rivalries = universe.narrativeEngine?.rivalryDetector.detectRivalries(
      universe.getCurrentSeason()
    ) || [];

    // Pegar a rivalidade mais intensa
    if (rivalries.length > 0) {
      const topRivalry = rivalries[0];
      
      // 15% de chance de criar um evento especial de rivalidade
      if (Math.random() < 0.15) {
        const p1 = universe.getPlayerById(topRivalry.player1.id);
        const p2 = universe.getPlayerById(topRivalry.player2.id);
        
        return this.generateEvent({
          type: 'RIVALRY_SHOWDOWN',
          name: `${p1.name} vs ${p2.name}: The Rivalry Continues`,
          description: `After ${topRivalry.totalMeetings} epic battles, these rivals meet again! Current score: ${topRivalry.player1.wins}-${topRivalry.player2.wins}`,
          format: 'BEST_OF_5',
          participants: 2,
          protagonist: topRivalry.player1.id,
          opponent: topRivalry.player2.id,
          stakes: `Rivalry supremacy (${topRivalry.type})`
        }, universe);
      }
    }

    return null;
  }

  // ✅ NOVO: Revanche após derrota em final ou semifinal importante
  checkUnfinishedBusiness(universe) {
    // Procura por jogadores que perderam recentemente em finais/semifinais
    const recentTournaments = this.getRecentTournaments(universe, 2); // Últimos 2 torneios
    
    for (const tournament of recentTournaments) {
      if (!tournament.runnerUp) continue;
      
      const loser = universe.getPlayerById(tournament.runnerUp.id);
      const winner = universe.getPlayerById(tournament.champion.id);
      
      if (!loser || !winner) continue;
      
      // 20% de chance de criar evento de revanche
      if (Math.random() < 0.20) {
        return this.generateEvent({
          type: 'UNFINISHED_BUSINESS',
          name: `Unfinished Business: ${loser.name}'s Revenge`,
          description: `${loser.name} seeks redemption after losing to ${winner.name} in the ${tournament.tournamentName} finals!`,
          format: 'BEST_OF_7',
          participants: 2,
          protagonist: loser.id,
          opponent: winner.id,
          stakes: 'Redemption and pride'
        }, universe);
      }
    }

    return null;
  }

  generateEvent(config, universe) {
    const participants = this.selectParticipants(config, universe);
    
    if (!participants || participants.length < 2) {
      return null; // Não há participantes suficientes
    }

    return {
      id: `EVENT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: config.type,
      name: config.name,
      description: config.description,
      format: config.format,
      participants,
      stakes: config.stakes || 'Glory and honor',
      protagonist: config.protagonist,
      opponent: config.opponent,
      createdAt: universe.currentMonth,
      status: 'SCHEDULED'
    };
  }

  selectParticipants(config, universe) {
    const players = universe.getActivePlayers();

    switch(config.qualification) {
      case 'TOP_8_ALLTIME':
        return this.getTop8AllTime(universe);
      
      case 'TOP_3_RIVALRIES':
        return this.getTop3Rivalries(universe);
      
      case 'AGE_UNDER_23':
        return players
          .filter(p => p.age < 23)
          .slice(0, config.participants);
      
      case 'TOP_4_PER_COUNTRY':
        return this.getTopPlayersByCountry(universe, 4);
      
      default:
        if (config.protagonist && config.opponent) {
          return [
            players.find(p => p.id === config.protagonist),
            players.find(p => p.id === config.opponent)
          ].filter(Boolean);
        }
        
        if (config.protagonist) {
          const protagonist = players.find(p => p.id === config.protagonist);
          const others = this.selectChallengers(protagonist, config.participants - 1, universe);
          return [protagonist, ...others];
        }

        return players.slice(0, config.participants);
    }
  }

  executeEvent(event, universe) {
    // Executa o evento especial
    console.log(`🎊 SPECIAL EVENT: ${event.name}`);
    console.log(`📜 ${event.description}`);
    console.log(`⚔️ Format: ${event.format}`);
    console.log(`🎯 Stakes: ${event.stakes}`);

    // Determina o vencedor do evento (primeiro participante por padrão)
    const results = { winner: event.participants[0], format: event.format };

    event.status = 'COMPLETED';
    event.results = results;
    event.completedAt = universe.currentMonth;

    return {
      event,
      results,
      highlights: this.generateEventHighlights(event, results)
    };
  }

  generateEventHighlights(event, results) {
    return {
      title: `${event.name} - ${results.winner.name} Triumphs!`,
      description: event.description,
      winner: results.winner.name,
      stakes: event.stakes,
      memorable: `${results.winner.name} proved they belong among the elite!`
    };
  }

  // Helper methods
  calculateWinStreak(player, universe) {
    // Implementação simplificada
    return Math.floor(Math.random() * 20);
  }

  findGreatestRival(player, universe) {
    const rivalries = universe.narrativeEngine?.rivalryDetector.detectRivalries(
      universe.getCurrentSeason()
    ) || [];

    const playerRivalry = rivalries.find(r => 
      r.player1.id === player.id || r.player2.id === player.id
    );

    if (playerRivalry) {
      const rivalId = playerRivalry.player1.id === player.id 
        ? playerRivalry.player2.id 
        : playerRivalry.player1.id;
      return universe.getPlayerById(rivalId);
    }

    return null;
  }

  getLastTitleMonth(player, universe) {
    // Implementação simplificada
    return universe.currentMonth - Math.floor(Math.random() * 36);
  }

  getRecentMatches(p1Id, p2Id, universe) {
    // Implementação simplificada
    return [];
  }

  getTop3Players(universe) {
    return universe.getActivePlayers()
      .sort((a, b) => (b.titles || 0) - (a.titles || 0))
      .slice(0, 3);
  }

  getRecentWins(player, universe, months) {
    // Implementação simplificada
    return Math.floor(Math.random() * months);
  }

  findTopContender(champion, universe) {
    const players = universe.getActivePlayers()
      .filter(p => p.id !== champion.id);
    return players[Math.floor(Math.random() * Math.min(5, players.length))];
  }

  selectChallengers(protagonist, count, universe) {
    return universe.getActivePlayers()
      .filter(p => p.id !== protagonist.id)
      .slice(0, count);
  }

  getTop8AllTime(universe) {
    return universe.getActivePlayers()
      .sort((a, b) => (b.titles || 0) - (a.titles || 0))
      .slice(0, 8);
  }

  getTop3Rivalries(universe) {
    const rivalries = universe.narrativeEngine?.rivalryDetector.detectRivalries(
      universe.getCurrentSeason()
    ) || [];
    
    return rivalries.slice(0, 3).flatMap(r => [
      universe.getPlayerById(r.player1.id),
      universe.getPlayerById(r.player2.id)
    ]).filter(Boolean);
  }

  // ✅ NOVO: Pega os N torneios mais recentes
  getRecentTournaments(universe, count = 3) {
    const tournaments = [];
    let checkMonth = universe.currentMonth;
    let checkYear = universe.currentYear;
    
    for (let i = 0; i < count; i++) {
      checkMonth--;
      if (checkMonth < 1) {
        checkMonth = 12;
        checkYear--;
      }
      
      const tournament = universe.getTournamentHistory(checkYear, checkMonth);
      if (tournament) {
        tournaments.push(tournament);
      }
    }
    
    return tournaments;
  }

  getTopPlayersByCountry(universe, perCountry) {
    // Implementação simplificada
    return universe.getActivePlayers().slice(0, 32);
  }
}

class EventsManager {
  constructor() {
    this.system = new SpecialEventsSystem();
    this.upcomingEvents = [];
    this.completedEvents = [];
  }

  update(universe) {
    // Check for scheduled events
    const scheduledEvents = this.system.checkScheduledEvents(
      universe.currentMonth,
      universe.currentYear,
      universe
    );

    // Check for dynamic events
    const dynamicEvents = this.system.checkDynamicEvents(universe);

    // Add new events
    [...scheduledEvents, ...dynamicEvents].forEach(event => {
      if (!this.upcomingEvents.find(e => e.type === event.type)) {
        this.upcomingEvents.push(event);
      }
    });

    return {
      scheduled: scheduledEvents,
      dynamic: dynamicEvents
    };
  }

  executeNextEvent(universe) {
    if (this.upcomingEvents.length === 0) return null;

    const event = this.upcomingEvents.shift();
    const results = this.system.executeEvent(event, universe);
    
    this.completedEvents.push(results);
    
    return results;
  }

  getUpcomingEvents() {
    return this.upcomingEvents;
  }

  getCompletedEvents() {
    return this.completedEvents;
  }
}

export default EventsManager;
export { SpecialEventsSystem };
