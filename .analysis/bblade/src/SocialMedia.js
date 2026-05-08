// SocialMedia.js - Tweets e Reações Sociais
// Gera buzz realista nas redes sociais do universo Beyblade

import { generateScoutPerspective, generateConjecture, getCurrentLevelTag } from './ScoutSystem.js';

class SocialMediaEngine {
  constructor() {
    this.tweetTypes = {
      PLAYER_CELEBRATION: 'PLAYER_CELEBRATION',
      PLAYER_RESPECT: 'PLAYER_RESPECT',
      ANALYST_HOTTAKE: 'ANALYST_HOTTAKE',
      ANALYST_PREDICTION: 'ANALYST_PREDICTION',
      FAN_HYPE: 'FAN_HYPE',
      FAN_MEME: 'FAN_MEME',
      RIVALRY_FUEL: 'RIVALRY_FUEL',
      UPSET_REACTION: 'UPSET_REACTION',
      HEADLINE: 'HEADLINE',
      SCOUT_TAKE: 'SCOUT_TAKE',
      CEILING_DEBATE: 'CEILING_DEBATE',
      DEVELOPMENT_REACTION: 'DEVELOPMENT_REACTION',
    };

    this.analysts = [
      { name: 'BeyStats', handle: '@BeyStats', style: 'analytical' },
      { name: 'BladeDaily', handle: '@BladeDaily', style: 'news' },
      { name: 'MetaMaster', handle: '@MetaMaster', style: 'technical' },
      { name: 'BeyHype', handle: '@BeyHype', style: 'hype' }
    ];

    this.trendingTopics = [];
  }

  generateTweets(event, context = {}) {
    const tweets = [];

    switch(event.type) {
      case 'MATCH_END':
        tweets.push(...this.generateMatchEndTweets(event, context));
        break;
      
      case 'TOURNAMENT_END':
        tweets.push(...this.generateTournamentEndTweets(event, context));
        break;
      
      case 'UPSET':
        tweets.push(...this.generateUpsetTweets(event, context));
        break;
      
      case 'RIVALRY':
        tweets.push(...this.generateRivalryTweets(event, context));
        break;
      
      case 'MILESTONE':
        tweets.push(...this.generateMilestoneTweets(event, context));
        break;
      
      case 'SPECIAL_EVENT':
        tweets.push(...this.generateSpecialEventTweets(event, context));
        break;

      case 'PLAYER_DEBUT':
        tweets.push(...this.generateDebutTweets(event, context));
        break;

      case 'DEVELOPMENT_LEAP':
        tweets.push(...this.generateDevelopmentLeapTweets(event, context));
        break;
    }

    // Add engagement metrics
    tweets.forEach(tweet => {
      tweet.likes = this.calculateLikes(tweet, context);
      tweet.retweets = Math.floor(tweet.likes * 0.3);
      tweet.replies = Math.floor(tweet.likes * 0.15);
      tweet.timestamp = Date.now();
    });

    // Update trending
    this.updateTrending(tweets, event);

    return tweets;
  }

  generateMatchEndTweets(event, context) {
    const { winner, loser, score, wasUpset, hadBurst, wasClutch } = event;
    const tweets = [];

    // Converter score para o formato esperado se necessário
    let formattedScore = score;
    if (score && score.playerA !== undefined && score.playerB !== undefined) {
      // Determinar quem é winner e loser baseado no objeto
      // Como não sabemos qual é qual, vamos criar um score genérico
      formattedScore = {
        winner: Math.max(score.playerA, score.playerB),
        loser: Math.min(score.playerA, score.playerB)
      };
    }

    // Winner celebrates
    tweets.push({
      type: this.tweetTypes.PLAYER_CELEBRATION,
      author: winner.name,
      handle: `@${winner.name.replace(/\s/g, '')}`,
      content: this.getWinnerCelebration(winner, formattedScore, wasClutch, context),
      sentiment: 'positive'
    });

    // Loser shows respect
    tweets.push({
      type: this.tweetTypes.PLAYER_RESPECT,
      author: loser.name,
      handle: `@${loser.name.replace(/\s/g, '')}`,
      content: this.getLoserReaction(loser, winner, formattedScore),
      sentiment: 'respectful'
    });

    // Analyst reaction
    const analyst = this.getRandomAnalyst();
    tweets.push({
      type: this.tweetTypes.ANALYST_HOTTAKE,
      author: analyst.name,
      handle: analyst.handle,
      content: this.getAnalystTake(event, context, analyst.style),
      sentiment: 'analytical'
    });

    // Fan hype
    tweets.push({
      type: this.tweetTypes.FAN_HYPE,
      author: this.getRandomFanName(),
      handle: `@${this.getRandomFanHandle()}`,
      content: this.getFanReaction(event, context),
      sentiment: 'excited'
    });

    // If upset or special circumstance
    if (wasUpset) {
      tweets.push({
        type: this.tweetTypes.UPSET_REACTION,
        author: this.getRandomFanName(),
        handle: `@${this.getRandomFanHandle()}`,
        content: this.getUpsetReaction(winner, loser, context),
        sentiment: 'shocked'
      });
    }

    return tweets;
  }

  generateTournamentEndTweets(event, context) {
    const { champion, tournament } = event;
    const tweets = [];

    // Headline
    tweets.push({
      type: this.tweetTypes.HEADLINE,
      author: 'Beyblade News',
      handle: '@BeybladeNews',
      content: this.generateHeadline(event),
      sentiment: 'news'
    });

    // Champion celebration
    tweets.push({
      type: this.tweetTypes.PLAYER_CELEBRATION,
      author: champion.name,
      handle: `@${champion.name.replace(/\s/g, '')}`,
      content: this.getChampionCelebration(champion, tournament, context),
      sentiment: 'triumphant'
    });

    // Multiple analyst perspectives
    this.analysts.forEach(analyst => {
      tweets.push({
        type: this.tweetTypes.ANALYST_HOTTAKE,
        author: analyst.name,
        handle: analyst.handle,
        content: this.getTournamentAnalysis(event, context, analyst.style),
        sentiment: 'analytical'
      });
    });

    // Fan celebrations
    for (let i = 0; i < 3; i++) {
      tweets.push({
        type: this.tweetTypes.FAN_HYPE,
        author: this.getRandomFanName(),
        handle: `@${this.getRandomFanHandle()}`,
        content: this.getTournamentFanReaction(champion, tournament),
        sentiment: 'celebratory'
      });
    }

    return tweets;
  }

  generateUpsetTweets(event, context) {
    const { winner, loser, seedDiff } = event;
    const tweets = [];

    // Breaking news style
    tweets.push({
      type: this.tweetTypes.UPSET_REACTION,
      author: 'Beyblade Alerts',
      handle: '@BeyAlerts',
      content: `🚨 UPSET ALERT! #${winner.seed} ${winner.name} defeats #${loser.seed} ${loser.name}! Seed difference: ${seedDiff}!`,
      sentiment: 'breaking'
    });

    // Multiple shocked reactions
    for (let i = 0; i < 4; i++) {
      tweets.push({
        type: this.tweetTypes.FAN_HYPE,
        author: this.getRandomFanName(),
        handle: `@${this.getRandomFanHandle()}`,
        content: this.getShockedReaction(winner, loser, seedDiff),
        sentiment: 'shocked'
      });
    }

    return tweets;
  }

  generateRivalryTweets(event, context) {
    const { player1, player2, rivalry } = event;
    const tweets = [];

    // Rivalry fuel from players
    tweets.push({
      type: this.tweetTypes.RIVALRY_FUEL,
      author: player1.name,
      handle: `@${player1.name.replace(/\s/g, '')}`,
      content: this.getRivalryTrashTalk(player1, player2, context),
      sentiment: 'competitive'
    });

    tweets.push({
      type: this.tweetTypes.RIVALRY_FUEL,
      author: player2.name,
      handle: `@${player2.name.replace(/\s/g, '')}`,
      content: this.getRivalryResponse(player2, player1, context),
      sentiment: 'competitive'
    });

    // Fans picking sides
    tweets.push({
      type: this.tweetTypes.FAN_HYPE,
      author: this.getRandomFanName(),
      handle: `@${this.getRandomFanHandle()}`,
      content: `Team ${player1.name} all the way! ${player2.name} is going DOWN! 🔥 #${player1.name}vs${player2.name}`,
      sentiment: 'partisan'
    });

    tweets.push({
      type: this.tweetTypes.FAN_HYPE,
      author: this.getRandomFanName(),
      handle: `@${this.getRandomFanHandle()}`,
      content: `${player2.name} has this easy. ${player1.name} better watch out! 💪 #${player1.name}vs${player2.name}`,
      sentiment: 'partisan'
    });

    return tweets;
  }

  generateMilestoneTweets(event, context) {
    const { player, milestone } = event;
    const tweets = [];

    // Official recognition
    tweets.push({
      type: this.tweetTypes.HEADLINE,
      author: 'Beyblade League',
      handle: '@BeyLeague',
      content: `🎊 MILESTONE ALERT: ${player.name} ${milestone.description}! Congratulations on this incredible achievement! 🏆`,
      sentiment: 'celebratory'
    });

    // Player gratitude
    tweets.push({
      type: this.tweetTypes.PLAYER_CELEBRATION,
      author: player.name,
      handle: `@${player.name.replace(/\s/g, '')}`,
      content: `Wow. ${milestone.value} ${milestone.type}. This is surreal. Thank you to everyone who believed in me! 🙏✨`,
      sentiment: 'grateful'
    });

    // Analyst context
    const analyst = this.getRandomAnalyst();
    tweets.push({
      type: this.tweetTypes.ANALYST_HOTTAKE,
      author: analyst.name,
      handle: analyst.handle,
      content: this.getMilestoneAnalysis(player, milestone, analyst.style),
      sentiment: 'analytical'
    });

    return tweets;
  }

  generateSpecialEventTweets(event, context) {
    const tweets = [];

    // Event announcement
    tweets.push({
      type: this.tweetTypes.HEADLINE,
      author: 'Beyblade Events',
      handle: '@BeyEvents',
      content: `📢 ${event.name.toUpperCase()} ANNOUNCED! ${event.description} ${event.stakes ? `Stakes: ${event.stakes}` : ''} 🎯`,
      sentiment: 'announcement'
    });

    // Analyst preview
    this.analysts.slice(0, 2).forEach(analyst => {
      tweets.push({
        type: this.tweetTypes.ANALYST_PREDICTION,
        author: analyst.name,
        handle: analyst.handle,
        content: this.getEventPreview(event, analyst.style),
        sentiment: 'predictive'
      });
    });

    // Fan hype
    for (let i = 0; i < 3; i++) {
      tweets.push({
        type: this.tweetTypes.FAN_HYPE,
        author: this.getRandomFanName(),
        handle: `@${this.getRandomFanHandle()}`,
        content: this.getEventHype(event),
        sentiment: 'hyped'
      });
    }

    return tweets;
  }

  // Content generators
  getWinnerCelebration(winner, score, wasClutch, context) {
    const templates = [
      `LETS GOOOOO! 🔥 That's how it's done!${score ? ` ${score.winner}-${score.loser}!` : ''}`,
      `Another W in the books! 💪 Never doubted myself for a second!`,
      `🏆 Victory tastes sweet! Thank you to all my fans!`,
      `That's ${context.winStreak || 1} in a row! The momentum is REAL! 🚀`,
      `Hard work pays off! Proud of this performance! ✨`
    ];

    if (wasClutch) {
      return `CLUTCH GENE ACTIVATED! 💎 That match point win hit different!${score ? ` ${score.winner}-${score.loser}!` : ''} 🔥`;
    }

    return templates[Math.floor(Math.random() * templates.length)];
  }

  getLoserReaction(loser, winner, score) {
    const scoreText = score ? ` ${score.winner}-${score.loser}.` : '';
    const templates = [
      `Tough loss. ${winner.name} played incredible today. GGs! 🤝`,
      `Not my day. Congrats to ${winner.name}. I'll be back stronger! 💪`,
      `${winner.name} brought their A-game. Much respect. Time to train harder! 🎯`,
      `Close one!${scoreText} I'll learn from this!`,
      `Well played ${winner.name}. This just makes me hungrier for the next one! 🔥`
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }

  getAnalystTake(event, context, style) {
    const { winner, loser, score } = event;
    
    // Converter score se necessário
    let formattedScore = score;
    if (score && score.playerA !== undefined && score.playerB !== undefined) {
      formattedScore = {
        winner: Math.max(score.playerA, score.playerB),
        loser: Math.min(score.playerA, score.playerB)
      };
    }

    if (style === 'analytical') {
      return `${winner.name}'s form multiplier at 1.${Math.floor(Math.random() * 30 + 10)} proved decisive. ` +
             `Win probability was ${Math.floor(Math.random() * 20 + 40)}% pre-match. Execution: flawless. 📊`;
    }

    if (style === 'technical') {
      return `Key factor: ${winner.name}'s combo adaptation in round ${Math.floor(Math.random() * 3 + 1)}. ` +
             `Attack pattern shift completely neutralized ${loser.name}'s defense meta. 🎯`;
    }

    if (style === 'hype') {
      return `${winner.name.toUpperCase()} SHOWED UP TODAY! 🔥🔥🔥 ` +
             `That's the ${winner.name} we know and love! Absolutely DOMINANT! 💪`;
    }

    const scoreText = formattedScore ? ` ${formattedScore.winner}-${formattedScore.loser}` : '';
    return `${winner.name} defeats ${loser.name}${scoreText}. ` +
           `Solid performance from both competitors. 🏆`;
  }

  getFanReaction(event, context) {
    const { winner, hadBurst, wasClutch } = event;
    
    const templates = [
      `OMG ${winner.name}!!! THAT WAS INSANE!!! 🔥🔥🔥`,
      `${winner.name} is built different fr fr 💯`,
      `LETS GOOOO ${winner.name.toUpperCase()}!!! 🚀`,
      `${winner.name} haters real quiet rn 👀`,
      `This is why ${winner.name} is the GOAT! 🐐✨`
    ];

    if (hadBurst) {
      return `THE BURST FINISH!!! ${winner.name} IS CRAZY!!! 💥💥💥 I'M SCREAMING!!!`;
    }

    if (wasClutch) {
      return `${winner.name} CLUTCHED IT!!! MY HEART CAN'T TAKE THIS!!! 💎🔥`;
    }

    return templates[Math.floor(Math.random() * templates.length)];
  }

  getUpsetReaction(winner, loser, context) {
    const templates = [
      `WAIT WHAT??? ${winner.name} JUST BEAT ${loser.name}??? 🤯`,
      `NO WAY. NO. WAY. ${winner.name}??? Against ${loser.name}??? I'M SHOOK! 😱`,
      `THE UPSET OF THE CENTURY! ${winner.name} YOU ABSOLUTE LEGEND! 🌟`,
      `${loser.name} just lost to ${winner.name}... I can't believe what I just watched 👁️👄👁️`,
      `EVERYONE GET IN HERE! ${winner.name} JUST PULLED OFF THE IMPOSSIBLE! 🚨`
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }

  getChampionCelebration(champion, tournament, context) {
    return `🏆 ${tournament} CHAMPION! 🏆 This is what dreams are made of! ` +
           `Thank you to my team, my fans, and everyone who supported me! ` +
           `We did it! 🙌✨ #Champion #BeybladeLife`;
  }

  getTournamentAnalysis(event, context, style) {
    const { champion, tournament } = event;

    if (style === 'analytical') {
      return `${champion.name} takes ${tournament} with a ${Math.floor(Math.random() * 20 + 70)}% win rate. ` +
             `Meta adaptation and form consistency were key factors. Elite performance. 📈`;
    }

    if (style === 'technical') {
      return `${champion.name}'s combo diversity throughout ${tournament} was masterclass level. ` +
             `${Math.floor(Math.random() * 5 + 3)} different setups, all executed perfectly. This is how you win titles. 🎯`;
    }

    if (style === 'news') {
      return `BREAKING: ${champion.name} claims ${tournament} title. ` +
             `Dominant display from start to finish. Full recap coming soon. 📰`;
    }

    return `${champion.name} proves why they're one of the best with another title run! 🏆`;
  }

  getTournamentFanReaction(champion, tournament) {
    const templates = [
      `${champion.name.toUpperCase()} IS YOUR ${tournament.toUpperCase()} CHAMPION!!! I'M CRYING!!! 😭🏆`,
      `LETS GOOOOO ${champion.name}!!! ABSOLUTELY DESERVED!!! 🔥🔥🔥`,
      `${champion.name} just different man... another trophy for the collection 🏆✨`,
      `CHAMPIONSHIP VIBES!!! ${champion.name} YOU LEGEND!!! 💪👑`,
      `This is why I love Beyblade! ${champion.name} clutched the whole tournament! 🚀`
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }

  getShockedReaction(winner, loser, seedDiff) {
    if (seedDiff >= 20) {
      return `BRO. #${winner.seed} JUST BEAT #${loser.seed}. ` +
             `I NEED TO SIT DOWN. THIS IS NOT REAL. 🤯🤯🤯`;
    }

    return `${winner.name} really just did that huh... ${loser.name} in shambles rn 💀`;
  }

  getRivalryTrashTalk(player1, player2, context) {
    const templates = [
      `@${player2.name.replace(/\s/g, '')} talk is cheap. See you in the stadium. 😤`,
      `Another day, another W against @${player2.name.replace(/\s/g, '')}. When will you learn? 🎯`,
      `@${player2.name.replace(/\s/g, '')} better bring their A+ game. I'm not holding back this time. 🔥`,
      `The score doesn't lie. ${context.myWins || 0}-${context.theirWins || 0}. @${player2.name.replace(/\s/g, '')} 👀`
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }

  getRivalryResponse(player2, player1, context) {
    const templates = [
      `@${player1.name.replace(/\s/g, '')} Keep that same energy when we meet. I'll be ready. 💪`,
      `Talk all you want @${player1.name.replace(/\s/g, '')}. Results speak louder than tweets. 🎯`,
      `@${player1.name.replace(/\s/g, '')} This isn't over. Not even close. See you soon. 😤`,
      `Rent free in your head @${player1.name.replace(/\s/g, '')}. I love it. 😏`
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }

  getMilestoneAnalysis(player, milestone, style) {
    if (style === 'analytical') {
      return `${player.name}'s ${milestone.value} ${milestone.type} puts them in elite company. ` +
             `Statistical dominance across ${Math.floor(Math.random() * 5 + 3)} seasons. Truly remarkable. 📊`;
    }

    return `${player.name} reaches ${milestone.value} ${milestone.type}! ` +
           `Join us in celebrating this incredible achievement! 🎊`;
  }

  getEventPreview(event, style) {
    if (style === 'analytical') {
      return `${event.name} predictions: Form analysis suggests ${event.participants?.[0]?.name || 'TBD'} ` +
             `has slight edge, but ${event.format} format means anything can happen. 📊`;
    }

    return `${event.name} is going to be EPIC! ${event.description} ` +
           `Who's your pick to win? 🤔`;
  }

  getEventHype(event) {
    const templates = [
      `${event.name.toUpperCase()}!!! THIS IS GONNA BE SO GOOD!!! 🔥🔥🔥`,
      `Can't wait for ${event.name}! This is what we've been waiting for! 🚀`,
      `${event.name} about to be absolutely LEGENDARY! Mark your calendars! 📅✨`,
      `The hype for ${event.name} is REAL! Who else is hyped?? 🙋‍♂️🔥`
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }

  generateHeadline(event) {
    const { champion, tournament } = event;
    
    const templates = [
      `🏆 ${champion.name.toUpperCase()} WINS ${tournament.toUpperCase()}! 🏆`,
      `CHAMPION CROWNED: ${champion.name} Takes ${tournament} Title!`,
      `${champion.name} Reigns Supreme at ${tournament}!`,
      `BREAKING: ${champion.name} Claims ${tournament} Championship!`
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }

  // Helper methods
  calculateLikes(tweet, context) {
    let baseLikes = 100;

    // Type multipliers
    if (tweet.type === this.tweetTypes.HEADLINE) baseLikes *= 3;
    if (tweet.type === this.tweetTypes.UPSET_REACTION) baseLikes *= 2.5;
    if (tweet.type === this.tweetTypes.RIVALRY_FUEL) baseLikes *= 2;

    // Sentiment multipliers
    if (tweet.sentiment === 'shocked') baseLikes *= 2;
    if (tweet.sentiment === 'celebratory') baseLikes *= 1.8;
    if (tweet.sentiment === 'hyped') baseLikes *= 1.5;

    // Context multipliers
    if (context.isFinal) baseLikes *= 2;
    if (context.wasUpset) baseLikes *= 1.5;

    // Randomization
    const variation = 0.5 + Math.random();
    return Math.floor(baseLikes * variation);
  }

  updateTrending(tweets, event) {
    // Extract hashtags and topics
    tweets.forEach(tweet => {
      const content = tweet.content.toLowerCase();
      
      // Add event-specific topics
      if (event.winner) {
        this.addToTrending(`#${event.winner.name.replace(/\s/g, '')}`);
      }
      
      if (event.tournament) {
        this.addToTrending(`#${event.tournament.replace(/\s/g, '')}`);
      }

      // Extract hashtags from content
      const hashtags = content.match(/#\w+/g);
      if (hashtags) {
        hashtags.forEach(tag => this.addToTrending(tag));
      }
    });

    // Keep only top 10 trending
    this.trendingTopics = this.trendingTopics
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  // ============================================
  // TWEETS DE DEBUT — baseados em perspectiva, nunca em potencial real
  // ============================================
  generateDebutTweets(event, context) {
    const { player, scoutTag, scoutIcon } = event;
    const tweets = [];
    if (!player) return tweets;

    try {
      const perspective = generateScoutPerspective(player);
      const conjecture  = generateConjecture(player, perspective);

      // Scout take
      const scoutTemplates = [
        `Thread sobre ${player.name}: ${perspective.desc} ${conjecture} 🧵`,
        `Novo nome no circuito: ${player.name}. ${perspective.tag}. Vou acompanhar de perto.`,
        `${player.name} estreou. ${perspective.desc} Primeiras impressões: ${perspective.tag}.`,
        `Scout report de ${player.name}: ${conjecture}`,
      ];
      tweets.push({
        type: this.tweetTypes.SCOUT_TAKE,
        author: this.getRandomAnalyst().name,
        handle: this.getRandomAnalyst().handle,
        content: scoutTemplates[Math.floor(Math.random() * scoutTemplates.length)],
        sentiment: 'analytical',
      });

      // Fan reaction ao debut
      const fanTemplates = [
        `Quem é esse ${player.name}? Acabei de ver o debut. Interessante... 👀`,
        `${player.name} no circuito! Vamos ver no que dá! 🔥`,
        `${scoutIcon || '🆕'} Novo blader! ${player.name}. Alguém sabe mais sobre ele?`,
      ];
      tweets.push({
        type: this.tweetTypes.FAN_HYPE,
        author: this.getRandomFanName(),
        handle: `@${this.getRandomFanHandle()}`,
        content: fanTemplates[Math.floor(Math.random() * fanTemplates.length)],
        sentiment: 'curious',
      });
    } catch(e) {
      tweets.push({
        type: this.tweetTypes.HEADLINE,
        author: 'Beyblade News',
        handle: '@BeybladeNews',
        content: `🆕 ${player.name} entra para o circuito profissional!`,
        sentiment: 'news',
      });
    }

    return tweets;
  }

  // ============================================
  // TWEETS DE SALTO DE DESENVOLVIMENTO
  // ============================================
  generateDevelopmentLeapTweets(event, context) {
    const { player, fromLevel, toLevel } = event;
    const tweets = [];
    if (!player) return tweets;

    try {
      const conjecture = generateConjecture(player, generateScoutPerspective(player));

      const debateTemplates = [
        `Gente ainda discutindo o teto de ${player.name}. Ele acabou de subir de nível. A conversa continua.`,
        `${player.name} foi de "${fromLevel || 'nível anterior'}" para algo claramente diferente essa temporada. ${conjecture}`,
        `Quem apostou que ${player.name} não chegaria tão longe, tá quieto hoje.`,
        `${player.name} provando que as avaliações iniciais foram conservadoras. Até onde vai isso?`,
      ];
      tweets.push({
        type: this.tweetTypes.CEILING_DEBATE,
        author: this.getRandomAnalyst().name,
        handle: this.getRandomAnalyst().handle,
        content: debateTemplates[Math.floor(Math.random() * debateTemplates.length)],
        sentiment: 'analytical',
      });

      // Reação de fan
      const fanTemplates = [
        `${player.name} CRESCEU! Vocês estão vendo?? 📈📈📈`,
        `${player.name} não é mais o mesmo. Ponto final.`,
        `Era só questão de tempo. ${player.name} subiu de patamar! 🔥`,
      ];
      tweets.push({
        type: this.tweetTypes.DEVELOPMENT_REACTION,
        author: this.getRandomFanName(),
        handle: `@${this.getRandomFanHandle()}`,
        content: fanTemplates[Math.floor(Math.random() * fanTemplates.length)],
        sentiment: 'excited',
      });
    } catch(e) {}

    return tweets;
  }

  // ============================================
  // SCOUT TAKE AVULSO (pode ser chamado a qualquer momento)
  // ============================================
  generateScoutTake(player) {
    if (!player) return null;
    try {
      const perspective = generateScoutPerspective(player);
      const conjecture  = generateConjecture(player, perspective);
      const analyst     = this.getRandomAnalyst();
      const templates   = [
        `Thread sobre ${player.name}: o crescimento dos últimos meses é real. O que me intriga é a curva. 🧵`,
        `${player.name} está desenvolvendo mais rápido do que a maioria esperava. Ainda é cedo demais para saber onde isso para.`,
        `Perguntam se ${player.name} pode ser grande. A resposta honesta: ${conjecture}`,
        `Scout report ${player.name}: ${perspective.desc} Acompanhem nos próximos 18 meses.`,
      ];
      return {
        type: this.tweetTypes.SCOUT_TAKE,
        author: analyst.name,
        handle: analyst.handle,
        content: templates[Math.floor(Math.random() * templates.length)],
        sentiment: 'analytical',
        likes: Math.floor(200 + Math.random() * 800),
        retweets: Math.floor(50 + Math.random() * 200),
        replies: Math.floor(20 + Math.random() * 100),
        timestamp: Date.now(),
      };
    } catch(e) { return null; }
  }

  addToTrending(topic) {
    const existing = this.trendingTopics.find(t => t.topic === topic);
    if (existing) {
      existing.count++;
    } else {
      this.trendingTopics.push({ topic, count: 1 });
    }
  }

  getTrending() {
    return this.trendingTopics;
  }

  getRandomAnalyst() {
    return this.analysts[Math.floor(Math.random() * this.analysts.length)];
  }

  getRandomFanName() {
    const names = [
      'BeyFan2024', 'SpinMaster', 'BurstKing', 'LauncherLife',
      'StadiumHero', 'BladeEnthusiast', 'TopSpinner', 'BeySquad'
    ];
    return names[Math.floor(Math.random() * names.length)];
  }

  getRandomFanHandle() {
    return `${this.getRandomFanName()}${Math.floor(Math.random() * 9999)}`;
  }
}

export default SocialMediaEngine;
