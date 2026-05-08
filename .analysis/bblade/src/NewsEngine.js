// ============================================
// NEWS ENGINE - Sistema Inteligente de Notícias
// ============================================
// Gera notícias dinâmicas baseadas em eventos do jogo
// para fazer o Modo Universo parecer mais vivo

import { generateDebutNewsContent, generateDevelopmentLeapContent, getCurrentLevelTag } from './ScoutSystem.js';

export class NewsEngine {
  constructor(universeManager) {
    this.universeManager = universeManager;
    this.newsHistory = [];
    this.maxNewsHistory = 100;
  }

  // ============================================
  // GERAÇÃO DE NOTÍCIAS
  // ============================================

  /**
   * Gera notícias após um torneio
   */
  generateTournamentNews(tournament, winner, finalMatch) {
    const news = [];
    const timestamp = Date.now();

    // 1. CAMPEÃO DO TORNEIO
    news.push({
      id: `tournament_win_${timestamp}`,
      type: 'TOURNAMENT_WIN',
      category: 'tournament',
      priority: 5,
      timestamp,
      title: this.getTournamentWinHeadline(tournament, winner),
      description: this.getTournamentWinDescription(tournament, winner, finalMatch),
      players: [winner.id],
      tournamentName: tournament.name,
      icon: '🏆',
      color: '#facc15'
    });

    // 2. MUDANÇAS DE RANKING
    const rankingChanges = this.detectRankingChanges();
    rankingChanges.forEach(change => {
      news.push(this.generateRankingNews(change, timestamp));
    });

    // 3. RIVALIDADES
    const rivalryNews = this.generateRivalryNews(finalMatch, timestamp);
    if (rivalryNews) news.push(rivalryNews);

    // 4. UPSETS
    const upsetNews = this.generateUpsetNews(tournament, timestamp);
    if (upsetNews) news.push(upsetNews);

    // 5. STREAKS
    const streakNews = this.generateStreakNews(timestamp);
    streakNews.forEach(n => news.push(n));

    // 6. RECORDES
    const recordNews = this.generateRecordNews(winner, tournament, timestamp);
    if (recordNews) news.push(recordNews);

    // Adicionar ao histórico
    this.addNewsToHistory(news);

    return news;
  }

  /**
   * Gera manchete para vitória em torneio
   */
  getTournamentWinHeadline(tournament, winner) {
    const headlines = [
      `${winner.name} CONQUISTA O ${tournament.name}!`,
      `${winner.name} É CAMPEÃO DO ${tournament.name}!`,
      `GLORY! ${winner.name} VENCE ${tournament.name}`,
      `${winner.name} TRIUNFA NO ${tournament.name}!`,
      `TÍTULO! ${winner.name} DOMINA ${tournament.name}`
    ];
    return headlines[Math.floor(Math.random() * headlines.length)];
  }

  getTournamentWinDescription(tournament, winner, finalMatch) {
    const margin = finalMatch ? this.getMatchMargin(finalMatch) : 'decisiva';
    const tier = tournament.tier || 'Pro';
    
    const descriptions = [
      `Em uma final ${margin}, ${winner.name} conquista mais um título ${tier} para sua coleção.`,
      `${winner.name} demonstra supremacia ao vencer o ${tournament.name} com performance ${margin}.`,
      `Mais uma conquista para ${winner.name}, que mostra por que é um dos melhores do circuito.`,
      `${winner.name} adiciona o ${tournament.name} ao seu currículo em vitória ${margin}.`
    ];
    
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  getMatchMargin(match) {
    if (!match.score) return 'equilibrada';
    const diff = Math.abs(match.score.winner - match.score.loser);
    if (diff === 0) return 'extremamente equilibrada';
    if (diff <= 1) return 'muito equilibrada';
    if (diff === 2) return 'equilibrada';
    return 'dominante';
  }

  // ============================================
  // NOTÍCIAS DE RANKING
  // ============================================

  detectRankingChanges() {
    const changes = [];
    const currentRankings = this.getCurrentRankings();
    const previousRankings = this.getPreviousRankings();

    currentRankings.forEach((player, currentRank) => {
      const previousRank = previousRankings.get(player.id);
      
      if (previousRank === undefined) return; // Novo no ranking
      
      const movement = previousRank - currentRank;
      
      // Mudanças significativas
      if (Math.abs(movement) >= 3) {
        changes.push({
          player,
          currentRank,
          previousRank,
          movement,
          isNewLeader: currentRank === 1 && previousRank > 1,
          enteredTop10: currentRank <= 10 && previousRank > 10,
          leftTop10: currentRank > 10 && previousRank <= 10
        });
      }
    });

    return changes;
  }

  generateRankingNews(change, baseTimestamp) {
    const { player, currentRank, previousRank, movement, isNewLeader, enteredTop10 } = change;

    // NOVO LÍDER DO RANKING
    if (isNewLeader) {
      return {
        id: `new_leader_${player.id}_${baseTimestamp}`,
        type: 'NEW_LEADER',
        category: 'ranking',
        priority: 5,
        timestamp: baseTimestamp + 1,
        title: `🚨 ${player.name} É O NOVO #1 DO MUNDO!`,
        description: `Após vitória consistente, ${player.name} alcança o topo do ranking mundial pela primeira vez!`,
        players: [player.id],
        icon: '👑',
        color: '#facc15',
        stats: {
          currentRank,
          previousRank,
          movement
        }
      };
    }

    // ENTRADA NO TOP 10
    if (enteredTop10) {
      return {
        id: `top10_${player.id}_${baseTimestamp}`,
        type: 'TOP_10_ENTRY',
        category: 'ranking',
        priority: 4,
        timestamp: baseTimestamp + 2,
        title: `${player.name} ENTRA NO TOP 10!`,
        description: `Grande performance eleva ${player.name} para o #${currentRank}, entrando no grupo de elite mundial!`,
        players: [player.id],
        icon: '⭐',
        color: '#60a5fa',
        stats: {
          currentRank,
          previousRank,
          movement
        }
      };
    }

    // GRANDE SALTO NO RANKING
    if (movement >= 10) {
      return {
        id: `big_jump_${player.id}_${baseTimestamp}`,
        type: 'BIG_RANKING_JUMP',
        category: 'ranking',
        priority: 3,
        timestamp: baseTimestamp + 3,
        title: `📈 ${player.name} SOBE ${movement} POSIÇÕES!`,
        description: `Performance impressionante leva ${player.name} do #${previousRank} para #${currentRank} no ranking mundial!`,
        players: [player.id],
        icon: '📈',
        color: '#22c55e',
        stats: {
          currentRank,
          previousRank,
          movement
        }
      };
    }

    // SALTO MODERADO
    if (movement >= 5) {
      return {
        id: `ranking_rise_${player.id}_${baseTimestamp}`,
        type: 'RANKING_RISE',
        category: 'ranking',
        priority: 2,
        timestamp: baseTimestamp + 4,
        title: `${player.name} em ascensão no ranking`,
        description: `${player.name} ganha ${movement} posições e agora ocupa o #${currentRank} mundial.`,
        players: [player.id],
        icon: '📊',
        color: '#22c55e',
        stats: {
          currentRank,
          previousRank,
          movement
        }
      };
    }

    // QUEDA NO RANKING
    if (movement <= -5) {
      return {
        id: `ranking_drop_${player.id}_${baseTimestamp}`,
        type: 'RANKING_DROP',
        category: 'ranking',
        priority: 2,
        timestamp: baseTimestamp + 5,
        title: `${player.name} cai ${Math.abs(movement)} posições`,
        description: `Fase difícil faz ${player.name} descer do #${previousRank} para #${currentRank}.`,
        players: [player.id],
        icon: '📉',
        color: '#ef4444',
        stats: {
          currentRank,
          previousRank,
          movement: Math.abs(movement)
        }
      };
    }

    return null;
  }

  // ============================================
  // NOTÍCIAS DE RIVALIDADE
  // ============================================

  generateRivalryNews(match, baseTimestamp) {
    if (!match || !this.universeManager.narrativeEngine) return null;

    const rivalries = this.universeManager.narrativeEngine.rivalries || [];
    const matchRivalry = rivalries.find(r => 
      (r.player1?.id === match.winnerId && r.player2?.id === match.loserId) ||
      (r.player2?.id === match.winnerId && r.player1?.id === match.loserId)
    );

    // ✅ FIX: intensity é 0-1, não 0-100
    if (!matchRivalry || matchRivalry.intensity < 0.40) return null;

    const winner = this.universeManager.players[match.winnerId];
    const loser = this.universeManager.players[match.loserId];

    // Nova rivalidade surgindo (✅ FIX: usar totalMeetings)
    if (matchRivalry.totalMeetings <= 3 && matchRivalry.intensity >= 0.50) {
      return {
        id: `new_rivalry_${match.winnerId}_${match.loserId}_${baseTimestamp}`,
        type: 'NEW_RIVALRY',
        category: 'rivalry',
        priority: 4,
        timestamp: baseTimestamp + 10,
        title: `⚔️ NOVA RIVALIDADE: ${winner.name} vs ${loser.name}`,
        description: `A tensão aumenta! O confronto entre ${winner.name} e ${loser.name} promete render grandes batalhas.`,
        players: [match.winnerId, match.loserId],
        icon: '⚔️',
        color: '#dc2626',
        stats: {
          intensity: Math.round(matchRivalry.intensity * 100),
          matchCount: matchRivalry.totalMeetings
        }
      };
    }

    // Rivalidade intensificando (✅ FIX: usar totalMeetings)
    if (matchRivalry.intensity >= 0.70) {
      return {
        id: `heated_rivalry_${match.winnerId}_${match.loserId}_${baseTimestamp}`,
        type: 'HEATED_RIVALRY',
        category: 'rivalry',
        priority: 4,
        timestamp: baseTimestamp + 11,
        title: `🔥 RIVALIDADE ESQUENTA: ${winner.name} vence ${loser.name}!`,
        description: `Mais um capítulo da intensa rivalidade! ${winner.name} leva a melhor, mas a história está longe de acabar.`,
        players: [match.winnerId, match.loserId],
        icon: '🔥',
        color: '#f97316',
        stats: {
          intensity: Math.round(matchRivalry.intensity * 100),
          matchCount: matchRivalry.totalMeetings,
          record: this.getRivalryRecord(matchRivalry, match.winnerId)
        }
      };
    }

    return null;
  }

  getRivalryRecord(rivalry, winnerId) {
    // Conta vitórias do jogador na rivalidade
    const wins = rivalry.history?.filter(h => h.winnerId === winnerId).length || 0;
    const total = rivalry.totalMeetings || 0; // ✅ FIX: usar totalMeetings
    const losses = total - wins;
    return `${wins}-${losses}`;
  }

  // ============================================
  // NOTÍCIAS DE UPSET
  // ============================================

  generateUpsetNews(tournament, baseTimestamp) {
    const recentMatches = this.universeManager.matchLog?.slice(-10) || [];
    
    for (const match of recentMatches.reverse()) {
      if (match.rankingDiff && Math.abs(match.rankingDiff) >= 15) {
        const winner = this.universeManager.players[match.winnerId];
        const loser = this.universeManager.players[match.loserId];
        
        if (!winner || !loser) continue;

        return {
          id: `upset_${match.winnerId}_${match.loserId}_${baseTimestamp}`,
          type: 'MAJOR_UPSET',
          category: 'upset',
          priority: 4,
          timestamp: baseTimestamp + 20,
          title: `😱 UPSET GIGANTE! ${winner.name} vence ${loser.name}!`,
          description: `Em uma das maiores surpresas da temporada, ${winner.name} derrota o favorito ${loser.name} no ${tournament.name}!`,
          players: [match.winnerId, match.loserId],
          icon: '😱',
          color: '#f97316',
          stats: {
            rankingDiff: Math.abs(match.rankingDiff)
          }
        };
      }
    }

    return null;
  }

  // ============================================
  // NOTÍCIAS DE STREAK
  // ============================================

  generateStreakNews(baseTimestamp) {
    const news = [];
    const playerHistories = this.universeManager.playerHistories || new Map();

    playerHistories.forEach((history, playerId) => {
      const player = this.universeManager.players[playerId];
      if (!player) return;

      // Win Streak
      if (history.currentStreak >= 5) {
        const intensity = history.currentStreak >= 10 ? 'IMPARÁVEL' : 
                         history.currentStreak >= 7 ? 'EM CHAMAS' : 'QUENTE';
        
        news.push({
          id: `win_streak_${playerId}_${baseTimestamp}`,
          type: 'WIN_STREAK',
          category: 'streak',
          priority: history.currentStreak >= 10 ? 4 : 3,
          timestamp: baseTimestamp + 30,
          title: `🔥 ${intensity}! ${player.name} com ${history.currentStreak} vitórias seguidas!`,
          description: `${player.name} está em forma espetacular com ${history.currentStreak} vitórias consecutivas!`,
          players: [playerId],
          icon: '🔥',
          color: '#dc2626',
          stats: {
            streak: history.currentStreak
          }
        });
      }

      // Losing Streak
      if (history.currentStreak <= -4) {
        news.push({
          id: `lose_streak_${playerId}_${baseTimestamp}`,
          type: 'LOSING_STREAK',
          category: 'streak',
          priority: 2,
          timestamp: baseTimestamp + 31,
          title: `${player.name} em crise: ${Math.abs(history.currentStreak)} derrotas seguidas`,
          description: `Momento difícil para ${player.name}, que precisa encontrar soluções urgentemente.`,
          players: [playerId],
          icon: '😰',
          color: '#ef4444',
          stats: {
            streak: Math.abs(history.currentStreak)
          }
        });
      }
    });

    return news;
  }

  // ============================================
  // NOTÍCIAS DE RECORDES
  // ============================================

  generateRecordNews(winner, tournament, baseTimestamp) {
    const history = this.universeManager.playerHistories?.get(winner.id);
    if (!history) return null;

    const totalTitles = history.titles?.length || 0;

    // Marcos de títulos
    const milestones = [5, 10, 15, 20, 25, 30, 40, 50];
    if (milestones.includes(totalTitles)) {
      return {
        id: `milestone_${winner.id}_${totalTitles}_${baseTimestamp}`,
        type: 'MILESTONE',
        category: 'record',
        priority: 5,
        timestamp: baseTimestamp + 40,
        title: `🎯 MARCO HISTÓRICO! ${winner.name} conquista ${totalTitles}º título!`,
        description: `${winner.name} entra para o seleto grupo de jogadores com ${totalTitles}+ títulos na carreira!`,
        players: [winner.id],
        icon: '🎯',
        color: '#8b5cf6',
        stats: {
          totalTitles
        }
      };
    }

    return null;
  }

  // ============================================
  // UTILITÁRIOS
  // ============================================

  getCurrentRankings() {
    const rankings = new Map();
    const sortedPlayers = Array.from(this.universeManager.bbpRankings.entries())
      .sort((a, b) => b[1] - a[1]);

    sortedPlayers.forEach(([playerId, points], index) => {
      const player = this.universeManager.players[playerId];
      if (player) {
        rankings.set(player, index + 1);
      }
    });

    return rankings;
  }

  getPreviousRankings() {
    // Usa snapshot anterior do ranking se disponível
    if (this.universeManager.rankingHistory && this.universeManager.rankingHistory.length > 0) {
      return new Map(this.universeManager.rankingHistory[this.universeManager.rankingHistory.length - 1]);
    }
    return new Map();
  }

  addNewsToHistory(news) {
    const arr = Array.isArray(news) ? news : [news];
    this.newsHistory = [...arr, ...this.newsHistory].slice(0, this.maxNewsHistory);
  }

  /**
   * Gera manchetes contextualizadas por era
   * Chamado por: getTournamentWinHeadline, generateRecordNews
   */
  getEraContext(winnerName) {
    try {
      const um = this.universeManager;
      if (!um?.eraSystem) return null;
      const era = um.eraSystem.getCurrentEra?.();
      if (!era) return null;
      // Verificar se o jogador é rei da era
      if (era.championName === winnerName) return `Rei da ${era.name}`;
      // Verificar se é a primeira vitória do jogador na era
      return null;
    } catch(e) { return null; }
  }

  /**
   * Gera notícia especial de marco histórico com referência de era
   */
  generateEraContextNews(playerName, achievement, timestamp) {
    try {
      const um = this.universeManager;
      if (!um?.eraSystem) return null;
      const eras = um.eraSystem.eras || [];
      if (eras.length < 2) return null;
      const prevEra = eras[eras.length - 2];
      if (!prevEra) return null;
      const templates = [
        `${playerName} — o primeiro campeão fora da ${prevEra.name} a ${achievement}`,
        `${achievement}: ${playerName} quebra sequência da ${prevEra.name}`,
        `${playerName} escreve a primeira linha da história da nova era`,
      ];
      const title = templates[Math.floor(Math.random() * templates.length)];
      return {
        id: `era_context_${timestamp}_${Math.random()}`,
        type: 'ERA_RECORD',
        category: 'era',
        priority: 7,
        timestamp,
        title,
        description: `${playerName} conquista ${achievement} — um marco que redefine os limites do que é possível na nova geração.`,
        icon: '🏛️',
        color: '#c9a84c',
      };
    } catch(e) { return null; }
  }

  // ============================================
  // NOTÍCIA DE DEBUT DE NOVO BLADER
  // ============================================

  generatePlayerDebutNews(player) {
    if (!player) return null;
    const timestamp = Date.now();
    try {
      const content = generateDebutNewsContent(player);
      return {
        id: `debut_${player.id || player.name}_${timestamp}`,
        type: 'PLAYER_DEBUT',
        category: 'debut',
        priority: 3,
        timestamp,
        title: content.title,
        description: content.description,
        players: [player.id || player.name],
        icon: content.scoutIcon || '🆕',
        color: content.scoutColor || '#60a5fa',
        scoutTag: content.scoutTag,
      };
    } catch(e) {
      return {
        id: `debut_${player.id || player.name}_${timestamp}`,
        type: 'PLAYER_DEBUT',
        category: 'debut',
        priority: 2,
        timestamp,
        title: `${player.name} entra no circuito profissional`,
        description: 'Mais um nome para acompanhar nas próximas temporadas.',
        players: [player.id || player.name],
        icon: '🆕', color: '#60a5fa',
      };
    }
  }

  // ============================================
  // NOTÍCIA DE SALTO DE NÍVEL
  // ============================================

  generateDevelopmentLeapNews(player, previousAttributes, timestamp = Date.now()) {
    if (!player || !previousAttributes) return null;
    try {
      const prevTag = getCurrentLevelTag(previousAttributes);
      const newTag  = getCurrentLevelTag(player.attributes);
      if (prevTag.tier === newTag.tier) return null; // não mudou de faixa
      const content = generateDevelopmentLeapContent(player, prevTag.tier, newTag.tier);
      return {
        id: `devleap_${player.id || player.name}_${timestamp}`,
        type: 'DEVELOPMENT_LEAP',
        category: 'development',
        priority: 4,
        timestamp,
        title: content.title,
        description: content.description,
        players: [player.id || player.name],
        icon: '📈', color: newTag.color,
        fromLevel: prevTag.label,
        toLevel: newTag.label,
      };
    } catch(e) { return null; }
  }

  getRecentNews(limit = 20) {
    return this.newsHistory.slice(0, limit);
  }

  getNewsByCategory(category, limit = 10) {
    return this.newsHistory
      .filter(n => n.category === category)
      .slice(0, limit);
  }

  clearOldNews(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 dias
    const now = Date.now();
    this.newsHistory = this.newsHistory.filter(n => 
      (now - n.timestamp) < maxAge
    );
  }
}

export default NewsEngine;
