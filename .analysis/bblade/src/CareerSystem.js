// CareerSystem.js - Sistema de Progressão de Carreira
// Fase 3: XP, Skills, Milestones, Auto-improvement

export class CareerTracker {
  constructor(universe) {
    this.universe = universe;
    this.playerCareers = new Map();
    this.initializeCareers();
  }

  initializeCareers() {
    this.universe.players.forEach(player => {
      if (!this.playerCareers.has(player.name)) {
        this.playerCareers.set(player.name, {
          playerName: player.name,
          experiencePoints: 0,
          level: 1,
          skills: {
            deckBuilding: 1,
            adaptability: 1,
            clutch: 1,
            launchPrecision: 1,
            strategyReading: 1
          },
          milestones: [],
          matchCount: 0,
          titleCount: 0,
          clutchWins: 0,
          comebacks: 0,
          perfectGames: 0,
          deckDiversity: 0
        });
      }
    });
  }

  getCareer(playerName) {
    return this.playerCareers.get(playerName) || null;
  }

  getAllCareers() {
    return Array.from(this.playerCareers.values());
  }

  calculateXP(matchResult) {
    const {
      isWin,
      tier,
      round,
      isUpset,
      perfectGame,
      comeback,
      clutchWin
    } = matchResult;

    let xp = 0;

    // Base XP
    xp += isWin ? 10 : 5;

    // Tier Bonus
    const tierBonus = {
      'Grand Slam': 50,
      'Masters': 30,
      'Challengers': 15,
      'Prospects': 10
    };
    xp += tierBonus[tier] || 0;

    // Round Bonus
    const roundBonus = {
      'Final': 100,
      'Semifinal': 50,
      'Quarterfinal': 25,
      'Round of 16': 15
    };
    xp += roundBonus[round] || 0;

    // Special Bonuses
    if (isUpset) xp = Math.floor(xp * 1.5);
    if (perfectGame) xp += 25;
    if (comeback) xp += 30;
    if (clutchWin) xp += 20;

    return Math.floor(xp);
  }

  processMatch(match) {
    const winner = match.winner;
    const loser = match.player1 === winner ? match.player2 : match.player1;

    const winnerCareer = this.getCareer(winner);
    const loserCareer = this.getCareer(loser);

    if (!winnerCareer || !loserCareer) return;

    // Analyze match
    const p1 = this.universe.players.find(p => p.name === match.player1);
    const p2 = this.universe.players.find(p => p.name === match.player2);
    const eloDiff = Math.abs(p1.elo - p2.elo);
    const isUpset = eloDiff > 100 && ((p1.elo < p2.elo && winner === match.player1) || (p2.elo < p1.elo && winner === match.player2));

    let perfectGame = false;
    let comeback = false;
    let clutchWin = false;

    if (match.rounds) {
      const winnerRounds = match.rounds.filter(r => r.winner === winner).length;
      const loserRounds = match.rounds.filter(r => r.winner === loser).length;
      
      perfectGame = loserRounds === 0;
      
      // Check for comeback (was down 0-2 or 1-2)
      let winnerScore = 0;
      let loserScore = 0;
      let wasDown = false;

      match.rounds.forEach(round => {
        if (round.winner === winner) winnerScore++;
        else loserScore++;

        if (loserScore === 2 && winnerScore < 2) wasDown = true;
      });

      comeback = wasDown && winnerScore > loserScore;
      clutchWin = loserScore === 2;
    }

    // Calculate XP
    const winnerXP = this.calculateXP({
      isWin: true,
      tier: match.tier,
      round: match.round,
      isUpset,
      perfectGame,
      comeback,
      clutchWin
    });

    const loserXP = this.calculateXP({
      isWin: false,
      tier: match.tier,
      round: match.round,
      isUpset: false,
      perfectGame: false,
      comeback: false,
      clutchWin: false
    });

    // Add XP
    winnerCareer.experiencePoints += winnerXP;
    loserCareer.experiencePoints += loserXP;

    // Update stats
    winnerCareer.matchCount++;
    loserCareer.matchCount++;

    if (perfectGame) winnerCareer.perfectGames++;
    if (comeback) {
      winnerCareer.comebacks++;
      winnerCareer.clutchWins++;
    }
    if (clutchWin && !comeback) winnerCareer.clutchWins++;

    // Level up check
    this.checkLevelUp(winnerCareer);
    this.checkLevelUp(loserCareer);

    // Auto-allocate skills
    this.autoAllocateSkill(winnerCareer, { perfectGame, comeback, clutchWin, isUpset });
    
    // Check milestones
    this.checkMilestones(winnerCareer);
    this.checkMilestones(loserCareer);
  }

  checkLevelUp(career) {
    const xpForNextLevel = career.level * 100;
    
    while (career.experiencePoints >= xpForNextLevel) {
      career.level++;
      career.experiencePoints -= xpForNextLevel;
      
      this.addMilestone(career, {
        type: 'level_up',
        title: `Reached Level ${career.level}`,
        description: `Leveled up to ${career.level}`,
        date: this.universe.season
      });
    }
  }

  autoAllocateSkill(career, matchContext) {
    const { perfectGame, comeback, clutchWin, isUpset } = matchContext;
    
    // Chance to improve based on performance
    const rand = Math.random();
    
    if (clutchWin && rand < 0.3) {
      this.improveSkill(career, 'clutch');
    }
    
    if (comeback && rand < 0.25) {
      this.improveSkill(career, 'adaptability');
    }
    
    if (perfectGame && rand < 0.2) {
      this.improveSkill(career, 'launchPrecision');
    }

    if (isUpset && rand < 0.15) {
      this.improveSkill(career, 'strategyReading');
    }

    // Deck building improves with diversity
    if (career.matchCount % 20 === 0 && rand < 0.2) {
      this.improveSkill(career, 'deckBuilding');
    }
  }

  improveSkill(career, skillName) {
    if (career.skills[skillName] < 10) {
      career.skills[skillName]++;
      
      this.addMilestone(career, {
        type: 'skill_up',
        title: `${skillName} Improved`,
        description: `${skillName} increased to ${career.skills[skillName]}`,
        date: this.universe.season
      });
    }
  }

  checkMilestones(career) {
    const milestones = [
      {
        id: 'first_title',
        check: () => career.titleCount === 1,
        title: 'First Title',
        description: 'Won your first championship'
      },
      {
        id: 'wins_100',
        check: () => career.matchCount >= 100 && !career.milestones.some(m => m.id === 'wins_100'),
        title: '100 Matches',
        description: 'Competed in 100 matches'
      },
      {
        id: 'titles_10',
        check: () => career.titleCount === 10,
        title: 'Legend',
        description: 'Won 10 championships'
      },
      {
        id: 'comeback_king',
        check: () => career.comebacks >= 10 && !career.milestones.some(m => m.id === 'comeback_king'),
        title: 'Comeback King',
        description: 'Completed 10 comebacks from match point'
      },
      {
        id: 'perfect_10',
        check: () => career.perfectGames >= 10 && !career.milestones.some(m => m.id === 'perfect_10'),
        title: 'Perfectionist',
        description: 'Won 10 perfect games (3-0)'
      },
      {
        id: 'max_skill',
        check: () => Object.values(career.skills).some(s => s === 10) && !career.milestones.some(m => m.id === 'max_skill'),
        title: 'Master',
        description: 'Maxed out a skill to level 10'
      }
    ];

    milestones.forEach(milestone => {
      if (milestone.check()) {
        this.addMilestone(career, {
          ...milestone,
          type: 'achievement',
          date: this.universe.season
        });
      }
    });
  }

  addMilestone(career, milestone) {
    if (!career.milestones.some(m => m.id === milestone.id)) {
      career.milestones.push({
        ...milestone,
        timestamp: Date.now()
      });
    }
  }

  updateTitleCount(playerName) {
    const career = this.getCareer(playerName);
    if (career) {
      career.titleCount++;
      this.checkMilestones(career);
    }
  }

  getSkillBonus(playerName, skillType) {
    const career = this.getCareer(playerName);
    if (!career) return 0;

    const skillLevel = career.skills[skillType] || 1;
    
    // Each skill level adds 2% bonus (max 20% at level 10)
    return (skillLevel - 1) * 0.02;
  }

  getTopSkillPlayers(skillName) {
    const careers = this.getAllCareers();
    return careers
      .sort((a, b) => b.skills[skillName] - a.skills[skillName])
      .slice(0, 10)
      .map(c => ({
        player: c.playerName,
        skill: c.skills[skillName],
        level: c.level
      }));
  }

  getLeaderboard() {
    const careers = this.getAllCareers();
    return {
      byLevel: careers.sort((a, b) => b.level - a.level).slice(0, 10),
      byXP: careers.sort((a, b) => b.experiencePoints - a.experiencePoints).slice(0, 10),
      byTitles: careers.sort((a, b) => b.titleCount - a.titleCount).slice(0, 10),
      byComebacks: careers.sort((a, b) => b.comebacks - a.comebacks).slice(0, 10)
    };
  }
}

export const SKILL_DESCRIPTIONS = {
  deckBuilding: 'Improves combo selection and type matchup decisions',
  adaptability: 'Faster adjustment to opponent strategies mid-match',
  clutch: 'Better performance in high-pressure situations',
  launchPrecision: 'More consistent launch techniques and stamina',
  strategyReading: 'Better prediction of opponent moves and patterns'
};
