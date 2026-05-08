// CommentaryEngine.js - Commentary Dinâmico em Tempo Real
// Gera narração contextual baseada em história, stakes e momento

class CommentarySystem {
  constructor() {
    this.commentaryTypes = {
      PRE_MATCH: 'PRE_MATCH',
      CLASH: 'CLASH',
      BURST: 'BURST',
      RING_OUT: 'RING_OUT',
      CLUTCH: 'CLUTCH',
      UPSET: 'UPSET',
      POST_MATCH: 'POST_MATCH'
    };

    this.intensity = {
      LOW: 'LOW',
      MEDIUM: 'MEDIUM',
      HIGH: 'HIGH',
      CRITICAL: 'CRITICAL'
    };
  }

  generatePreMatch(p1, p2, context = {}) {
    const {
      rivalry,
      headToHead,
      stakes,
      round,
      tournament,
      p1Form,
      p2Form,
      p1Seed,
      p2Seed
    } = context;

    let commentary = [];

    // Abertura baseada em stakes
    if (stakes === 'FINAL') {
      commentary.push(
        `🏆 It's the moment we've all been waiting for! ${p1.name} versus ${p2.name} in the ${tournament} final!`
      );
    } else if (stakes === 'SEMIFINAL') {
      commentary.push(
        `The semifinal stage! ${p1.name} and ${p2.name} battle for a spot in the championship match!`
      );
    } else {
      commentary.push(
        `${p1.name} takes on ${p2.name} in this ${round} clash!`
      );
    }

    // Rivalidade
    if (rivalry) {
      if (rivalry.type === 'CLASSIC') {
        commentary.push(
          `⚔️ A rivalry renewed! These two warriors have clashed ${rivalry.totalMeetings} times ` +
          `with the series locked at ${rivalry.player1.wins}-${rivalry.player2.wins}.`
        );
      } else if (rivalry.type === 'GIANT_KILLER') {
        commentary.push(
          `🎯 The giant killer strikes again! ${rivalry.intensity > 0.7 ? 'This matchup has been pure magic' : 'History favors the underdog here'}.`
        );
      } else if (rivalry.type === 'GRUDGE') {
        commentary.push(
          `💥 Bad blood! Every encounter between these two has been a war!`
        );
      }

      if (headToHead?.recentWinner && headToHead.streak >= 2) {
        commentary.push(
          `${headToHead.recentWinner} has won the last ${headToHead.streak} meetings!`
        );
      }
    }

    // Seeds e forma
    if (p1Seed && p2Seed) {
      const seedDiff = Math.abs(p1Seed - p2Seed);
      if (seedDiff >= 10) {
        const favorite = p1Seed < p2Seed ? p1.name : p2.name;
        const underdog = p1Seed < p2Seed ? p2.name : p1.name;
        commentary.push(
          `📊 On paper, ${favorite} is the heavy favorite, but ${underdog} loves proving doubters wrong!`
        );
      }
    }

    // Forma atual
    if (p1Form && p2Form) {
      if (p1Form > 1.15) {
        commentary.push(
          `🔥 ${p1.name} is on fire right now, performing at peak level!`
        );
      } else if (p1Form < 0.9) {
        commentary.push(
          `📉 ${p1.name} has struggled recently, looking to bounce back here.`
        );
      }

      if (p2Form > 1.15) {
        commentary.push(
          `⚡ ${p2.name} brings incredible momentum into this match!`
        );
      } else if (p2Form < 0.9) {
        commentary.push(
          `${p2.name} needs this win to regain confidence.`
        );
      }
    }

    // Encerramento motivacional
    if (stakes === 'FINAL') {
      commentary.push(
        `Only one can be crowned champion. Let the battle begin! 🌟`
      );
    } else {
      commentary.push(
        `Let's see who wants it more! 3... 2... 1... GO SHOOT!`
      );
    }

    return commentary;
  }

  generateLiveCommentary(event, context = {}) {
    const {
      eventType,
      intensity,
      score,
      round,
      stakes,
      playerName,
      isComeback,
      isUpset
    } = event;

    switch(eventType) {
      case 'CLASH':
        return this.generateClashCommentary(intensity, score, context);
      
      case 'BURST':
        return this.generateBurstCommentary(playerName, stakes, score, context);
      
      case 'RING_OUT':
        return this.generateRingOutCommentary(playerName, score, context);
      
      case 'CLUTCH':
        return this.generateClutchCommentary(score, stakes, context);
      
      case 'UPSET':
        return this.generateUpsetCommentary(context);
      
      case 'ROUND_WIN':
        return this.generateRoundWinCommentary(playerName, score, isComeback, context);

      default:
        return this.generateGenericCommentary(event);
    }
  }

  generateClashCommentary(intensity, score, context) {
    const templates = {
      LOW: [
        "They're feeling each other out...",
        "Steady exchange of attacks.",
        "Both bladers looking for an opening."
      ],
      MEDIUM: [
        "The intensity is building!",
        "What a clash!",
        "Neither wants to give an inch!",
        "Back and forth action!"
      ],
      HIGH: [
        "INCREDIBLE collision!",
        "The stadium is SHAKING!",
        "WHAT A BATTLE!",
        "THIS IS INSANE!",
        "They're going ALL OUT!"
      ],
      CRITICAL: [
        "🔥 ABSOLUTE MAYHEM IN THE STADIUM! 🔥",
        "💥 CHAMPIONSHIP INTENSITY! 💥",
        "⚡ THIS IS WHAT IT'S ALL ABOUT! ⚡",
        "🌟 LEGENDARY CLASH! 🌟"
      ]
    };

    const level = intensity || this.intensity.MEDIUM;
    const options = templates[level];
    return options[Math.floor(Math.random() * options.length)];
  }

  generateBurstCommentary(playerName, stakes, score, context) {
    if (stakes === 'FINAL' || stakes === 'CHAMPIONSHIP') {
      return [
        `💥💥💥 CHAMPIONSHIP BURST! ${playerName.toUpperCase()} WITH THE EXPLOSIVE FINISH! 💥💥💥`,
        `THE CROWD GOES WILD!`,
        stakes === 'FINAL' ? `A BURST IN THE FINALS! UNBELIEVABLE!` : `WHAT A WAY TO WIN IT ALL!`
      ];
    }

    if (score?.isMatchPoint) {
      return [
        `💥 BURST FINISH! ${playerName.toUpperCase()} CLOSES IT OUT!`,
        `MATCH POINT BURST! That's how champions do it!`
      ];
    }

    const templates = [
      `💥 BURST! ${playerName} explodes the competition!`,
      `🌟 SPECTACULAR BURST by ${playerName}!`,
      `💫 ${playerName.toUpperCase()} WITH THE BURST!`,
      `⚡ EXPLOSIVE! ${playerName} shatters the defense!`
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }

  generateRingOutCommentary(playerName, score, context) {
    const templates = [
      `🎯 Ring out! ${playerName} with perfect precision!`,
      `OUT OF THE STADIUM! ${playerName} shows perfect control!`,
      `${playerName} sends it flying! That's ringout mastery!`,
      `💫 Calculated knockout by ${playerName}!`
    ];

    if (score?.isMatchPoint) {
      return `🏁 GAME OVER! ${playerName.toUpperCase()} WINS IT WITH A RING OUT!`;
    }

    return templates[Math.floor(Math.random() * templates.length)];
  }

  generateClutchCommentary(score, stakes, context) {
    const { player1Score, player2Score, leader } = score;

    if (player1Score === 2 && player2Score === 2) {
      return [
        `⚠️ MATCH POINT! We're at 2-2!`,
        `IT ALL COMES DOWN TO THIS!`,
        `WINNER TAKES ALL! 2-2!`,
        `🔥 EVERYTHING ON THE LINE! 🔥`
      ];
    }

    if ((player1Score === 2 && player2Score === 1) || (player2Score === 2 && player1Score === 1)) {
      return `⚡ ${leader} at match point! One round from victory!`;
    }

    return `The pressure is mounting! ${leader} needs one more!`;
  }

  generateUpsetCommentary(context) {
    const { winner, loser, seedDiff } = context;

    if (seedDiff >= 20) {
      return [
        `🚨 MASSIVE UPSET! ABSOLUTE CHAOS! 🚨`,
        `${winner.toUpperCase()} JUST SHOCKED THE WORLD!`,
        `Nobody saw this coming! INCREDIBLE!`
      ];
    }

    if (seedDiff >= 10) {
      return [
        `🎯 UPSET ALERT! ${winner} takes down ${loser}!`,
        `The underdog DELIVERS! What a performance!`,
        `${winner} refuses to follow the script!`
      ];
    }

    return `${winner} pulls off the upset!`;
  }

  generateRoundWinCommentary(playerName, score, isComeback, context) {
    if (isComeback) {
      return `💪 ${playerName} fights back! Now at ${score.player1}-${score.player2}!`;
    }

    if (score.player1 === 1 && score.player2 === 0 || score.player2 === 1 && score.player1 === 0) {
      return `${playerName} draws first blood!`;
    }

    const templates = [
      `${playerName} takes it! ${score.player1}-${score.player2}!`,
      `Round to ${playerName}!`,
      `${playerName} extends the lead!`,
      `Another one for ${playerName}!`
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }

  generateGenericCommentary(event) {
    return `${event.description || 'The battle continues...'}`;
  }

  generatePostMatch(result, context = {}) {
    const {
      winner,
      loser,
      finalScore,
      stakes,
      wasUpset,
      wasComeback,
      hadBurst,
      rivalry,
      winStreak,
      tournament
    } = context;

    let commentary = [];

    // Resultado principal
    if (stakes === 'FINAL') {
      commentary.push(
        `🏆 ${winner.name.toUpperCase()} IS YOUR ${tournament?.toUpperCase() || 'TOURNAMENT'} CHAMPION! 🏆`
      );
      commentary.push(
        `Victory by a score of ${finalScore.winner}-${finalScore.loser}!`
      );
    } else {
      commentary.push(
        `${winner.name} defeats ${loser.name} ${finalScore.winner}-${finalScore.loser}!`
      );
    }

    // Contexto especial
    if (wasUpset) {
      commentary.push(
        `🚨 A stunning upset! ${winner.name} proves the doubters wrong!`
      );
    }

    if (wasComeback && finalScore.winner === 3 && finalScore.loser === 2) {
      commentary.push(
        `💪 An INCREDIBLE comeback! Down but never out!`
      );
    }

    if (hadBurst) {
      commentary.push(
        `⚡ And they finished it with a BURST! Explosive!`
      );
    }

    // Rivalidade
    if (rivalry) {
      const newRecord = rivalry.player1.id === winner.id 
        ? `${rivalry.player1.wins + 1}-${rivalry.player2.wins}`
        : `${rivalry.player1.wins}-${rivalry.player2.wins + 1}`;
      
      commentary.push(
        `The rivalry continues! All-time series now ${newRecord}.`
      );
    }

    // Win streak
    if (winStreak && winStreak >= 3) {
      commentary.push(
        `${winner.name} extends their winning streak to ${winStreak} matches!`
      );
    }

    // Próximos passos
    if (stakes === 'SEMIFINAL') {
      commentary.push(
        `${winner.name} advances to the finals!`
      );
    } else if (stakes !== 'FINAL') {
      commentary.push(
        `${winner.name} moves on to the next round!`
      );
    }

    // Encerramento motivacional
    if (stakes === 'FINAL') {
      commentary.push(
        `What a tournament! Congratulations to our champion! 🌟`
      );
    } else {
      commentary.push(
        `What a match! ${loser.name} fought valiantly, but ${winner.name} had the edge today.`
      );
    }

    return commentary;
  }

  // Gera commentary contextual baseado em múltiplos fatores
  getContextualIntensity(score, round, stakes, rivalry) {
    let intensityScore = 0;

    // Score proximity
    const scoreDiff = Math.abs(score.player1 - score.player2);
    if (scoreDiff === 0) intensityScore += 30;
    else if (scoreDiff === 1) intensityScore += 20;
    else if (scoreDiff === 2) intensityScore += 10;

    // Match point situation
    if (score.player1 === 2 || score.player2 === 2) {
      intensityScore += 25;
    }
    if (score.player1 === 2 && score.player2 === 2) {
      intensityScore += 50; // Game point!
    }

    // Stakes
    if (stakes === 'FINAL') intensityScore += 40;
    else if (stakes === 'SEMIFINAL') intensityScore += 30;
    else if (stakes === 'QUARTERFINAL') intensityScore += 20;

    // Rivalry
    if (rivalry) {
      intensityScore += rivalry.intensity * 20;
    }

    // Convert to intensity level
    if (intensityScore >= 80) return this.intensity.CRITICAL;
    if (intensityScore >= 50) return this.intensity.HIGH;
    if (intensityScore >= 25) return this.intensity.MEDIUM;
    return this.intensity.LOW;
  }
}

class CommentaryEngine {
  constructor() {
    this.system = new CommentarySystem();
    this.commentaryHistory = [];
  }

  // API Principal
  commentate(event, context) {
    const commentary = this.system.generateLiveCommentary(event, context);
    
    this.commentaryHistory.push({
      timestamp: Date.now(),
      event,
      commentary,
      context
    });

    return commentary;
  }

  setupMatch(p1, p2, context) {
    const preMatch = this.system.generatePreMatch(p1, p2, context);
    
    this.commentaryHistory = [{
      timestamp: Date.now(),
      type: 'PRE_MATCH',
      commentary: preMatch,
      context
    }];

    return preMatch;
  }

  concludeMatch(result, context) {
    const postMatch = this.system.generatePostMatch(result, context);
    
    this.commentaryHistory.push({
      timestamp: Date.now(),
      type: 'POST_MATCH',
      commentary: postMatch,
      context
    });

    return postMatch;
  }

  getMatchCommentary() {
    return this.commentaryHistory;
  }

  clearHistory() {
    this.commentaryHistory = [];
  }
}

export default CommentaryEngine;
export { CommentarySystem };
