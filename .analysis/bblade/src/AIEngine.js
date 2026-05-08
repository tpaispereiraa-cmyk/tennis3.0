// ============================================
// AIENGINE.JS - Sistema de IA Contextual Inteligente
// ============================================
// Sistema completo de IA que torna cada blader único e estratégico
// com personalidade, memória de rivalidade, e decisões multinível

/**
 * BladerAI - Representa a inteligência artificial de cada blader
 * Contém personalidade, memória de rivalidade, forma atual e preferências
 */
export class BladerAI {
  constructor(playerId, playerName, attributes = {}) {
    this.playerId = playerId;
    this.playerName = playerName;
    
    // ===== PERSONALIDADE DO BLADER =====
    // Valores de 0-10 que definem o estilo de jogo
    this.personality = {
      aggression: this.calculatePersonalityTrait(attributes.attack, attributes.defense),
      adaptability: attributes.adaptability || 5,
      clutchFactor: attributes.clutch || 5,
      riskTolerance: this.calculateRiskTolerance(attributes),
      consistency: this.calculateConsistency(attributes),
      mentalStrength: attributes.intelligence || 5,
      learningRate: (attributes.intelligence || 5) * 0.15, // 0-1.5
      launchPrecision: attributes.launchPower || 5 // Precisão no lançamento
    };
    
    // ===== MEMÓRIA DE RIVALIDADE =====
    // Histórico vs cada oponente (serializable com toJSON)
    this.rivalryMemory = new Map();
    
    // ===== FORMA ATUAL =====
    this.currentForm = {
      winStreak: 0,
      recentTypes: [], // Últimos 5 tipos usados
      favoriteArena: null,
      momentum: 0.5, // 0-1
      confidence: 0.5 // 0-1
    };
    
    // ===== PREFERÊNCIAS DE DECK =====
    this.deckPreferences = {
      diversityIndex: 0.5, // Quão diversificado o deck é (0=mono, 1=muito variado)
      balanceRatio: 0.5, // Preferência por balance vs extremos
      counterplayFocus: 0.5, // Foco em counter vs comfort picks
      arenaSpecialization: 0.5 // Especialização em arenas específicas
    };
    
    // ===== ESTADO INTERNO =====
    this.lastDecision = null; // Debug: última decisão tomada
    this.decisionLog = []; // Log das últimas 10 decisões
  }
  
  /**
   * Calcula trait de personalidade baseado em atributos
   */
  calculatePersonalityTrait(primary, secondary) {
    const avg = ((primary || 5) + (secondary || 5)) / 2;
    return Math.max(1, Math.min(10, avg));
  }
  
  /**
   * Calcula tolerância a risco do blader
   */
  calculateRiskTolerance(attributes) {
    const attack = attributes.attack || 5;
    const defense = attributes.defense || 5;
    const intelligence = attributes.intelligence || 5;
    
    // Alto ataque + baixa defesa = alto risco
    // Alta inteligência modera o risco
    const baseRisk = (attack - defense + 5) / 2;
    const moderated = baseRisk - (intelligence - 5) * 0.3;
    
    return Math.max(1, Math.min(10, moderated));
  }
  
  /**
   * Calcula consistência do blader
   */
  calculateConsistency(attributes) {
    const technique = attributes.technique || 5;
    const stamina = attributes.stamina || 5;
    const intelligence = attributes.intelligence || 5;
    
    // Técnica + Stamina + Inteligência = Consistência
    return (technique + stamina + intelligence) / 3;
  }
  
  /**
   * Atualiza memória de rivalidade após uma partida
   */
  updateRivalryMemory(opponentId, result) {
    if (!this.rivalryMemory.has(opponentId)) {
      this.rivalryMemory.set(opponentId, {
        wins: 0,
        losses: 0,
        totalMatches: 0,
        dominantType: null, // Tipo que o oponente mais usa contra mim
        preferredArena: null,
        burstRate: 0,
        lastEncounter: null,
        typeHistory: [] // Últimos tipos que o oponente usou
      });
    }
    
    const memory = this.rivalryMemory.get(opponentId);
    memory.totalMatches++;
    
    if (result.won) {
      memory.wins++;
    } else {
      memory.losses++;
    }
    
    // Atualizar histórico de tipos
    if (result.opponentType) {
      memory.typeHistory.push(result.opponentType);
      if (memory.typeHistory.length > 10) {
        memory.typeHistory.shift();
      }
      
      // Calcular tipo dominante
      const typeCounts = {};
      memory.typeHistory.forEach(type => {
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });
      memory.dominantType = Object.keys(typeCounts).reduce((a, b) => 
        typeCounts[a] > typeCounts[b] ? a : b
      );
    }
    
    // Atualizar arena preferida
    if (result.arena) {
      memory.preferredArena = result.arena;
    }
    
    // Atualizar burst rate
    if (result.burstCount !== undefined) {
      memory.burstRate = (memory.burstRate * (memory.totalMatches - 1) + 
                         result.burstCount) / memory.totalMatches;
    }
    
    memory.lastEncounter = {
      date: new Date().toISOString(),
      result: result.won ? 'W' : 'L',
      type: result.opponentType,
      arena: result.arena
    };
  }
  
  /**
   * Atualiza forma atual do blader
   */
  updateForm(result) {
    // Atualizar win streak
    if (result.won) {
      this.currentForm.winStreak++;
      this.currentForm.momentum = Math.min(1, this.currentForm.momentum + 0.1);
      this.currentForm.confidence = Math.min(1, this.currentForm.confidence + 0.08);
    } else {
      this.currentForm.winStreak = 0;
      this.currentForm.momentum = Math.max(0, this.currentForm.momentum - 0.12);
      this.currentForm.confidence = Math.max(0, this.currentForm.confidence - 0.1);
    }
    
    // Atualizar tipos recentes
    if (result.typeUsed) {
      this.currentForm.recentTypes.push(result.typeUsed);
      if (this.currentForm.recentTypes.length > 5) {
        this.currentForm.recentTypes.shift();
      }
    }
    
    // Atualizar arena favorita (baseado em vitórias)
    if (result.won && result.arena) {
      this.currentForm.favoriteArena = result.arena;
    }
  }
  
  /**
   * DECISÃO MULTINÍVEL: Seleciona beyblade baseado em contexto completo
   * 
   * @param {Array} availableBeys - Beyblades disponíveis no deck
   * @param {Object} context - Contexto da batalha
   * @returns {Object} Beyblade selecionado
   */
  selectBeybladeIA(availableBeys, context = {}) {
    console.log(`\n🧠 [${this.playerName}] Iniciando decisão multinível de IA...`);
    
    const {
      opponent = null,
      opponentId = null,
      tournamentStage = 'R64', // R64, R32, R16, QF, SF, F
      arena = 'BB10_COMPETITIVE',
      currentScore = { self: 0, opponent: 0 },
      matchPoint = false
    } = context;
    
    // Array para armazenar scores de cada beyblade
    const beyScores = availableBeys.map(bey => {
      const scores = {
        bey,
        matchup: 0,    // 30% - Vantagem de tipo
        meta: 0,       // 25% - Análise de meta/contexto
        psychology: 0, // 20% - Fatores psicológicos
        history: 0,    // 15% - Memória de rivalidade
        form: 0,       // 10% - Forma atual
        total: 0
      };
      
      // ===== LAYER 1: META ANALYSIS (25%) =====
      scores.meta = this.analyzeMetaContext(bey, context);
      
      // ===== LAYER 2: MATCHUP ANALYSIS (30%) =====
      if (opponent) {
        scores.matchup = this.analyzeMatchup(bey, opponent);
      } else {
        // Sem oponente conhecido, usar preferência base
        scores.matchup = this.getTypePreferenceScore(bey);
      }
      
      // ===== LAYER 3: PSYCHOLOGY (20%) =====
      scores.psychology = this.analyzePsychology(bey, context);
      
      // ===== LAYER 4: RIVALRY HISTORY (15%) =====
      if (opponentId && this.rivalryMemory.has(opponentId)) {
        scores.history = this.analyzeRivalryHistory(bey, opponentId);
      } else {
        scores.history = 5; // Neutro se não houver histórico
      }
      
      // ===== LAYER 5: FORM BONUS (10%) =====
      scores.form = this.analyzeFormBonus(bey);
      
      // ===== CÁLCULO FINAL COM PESOS =====
      scores.total = (
        scores.matchup * 0.30 +
        scores.meta * 0.25 +
        scores.psychology * 0.20 +
        scores.history * 0.15 +
        scores.form * 0.10
      );
      
      return scores;
    });
    
    // Ordenar por score total
    beyScores.sort((a, b) => b.total - a.total);
    
    // Log da decisão (top 3)
    console.log(`📊 Top 3 escolhas para ${this.playerName}:`);
    beyScores.slice(0, 3).forEach((score, idx) => {
      console.log(`  ${idx + 1}. ${score.bey.name} (${score.bey.type})`);
      console.log(`     Total: ${score.total.toFixed(2)} | Matchup: ${score.matchup.toFixed(1)} | Meta: ${score.meta.toFixed(1)} | Psych: ${score.psychology.toFixed(1)} | History: ${score.history.toFixed(1)} | Form: ${score.form.toFixed(1)}`);
    });
    
    // Guardar última decisão
    this.lastDecision = {
      context,
      chosen: beyScores[0].bey,
      scores: beyScores[0],
      timestamp: new Date().toISOString()
    };
    
    // Adicionar ao log
    this.decisionLog.push(this.lastDecision);
    if (this.decisionLog.length > 10) {
      this.decisionLog.shift();
    }
    
    return beyScores[0].bey;
  }
  
  /**
   * Analisa contexto de meta: torneio, stakes, arena
   */
  analyzeMetaContext(bey, context) {
    let score = 5; // Base neutro
    
    const { tournamentStage, arena, matchPoint } = context;
    
    // ===== STAKES ADJUSTMENT =====
    const stageImportance = {
      'R64': 1, 'R32': 2, 'R16': 3,
      'QF': 5, 'SF': 7, 'F': 10
    };
    const importance = stageImportance[tournamentStage] || 1;
    
    // Em matches importantes, preferir comfort picks
    if (importance >= 5) {
      // Verificar se já usou esse bey recentemente (comfort)
      const recentlyUsed = this.currentForm.recentTypes.includes(bey.type);
      if (recentlyUsed) {
        score += 2;
      }
    }
    
    // Match point: extremos (all-in ou safe)
    if (matchPoint) {
      if (this.personality.riskTolerance > 7) {
        // High risk: vai de attack
        score += bey.type === 'ATTACK' ? 3 : -2;
      } else {
        // Low risk: vai de defense/stamina
        score += (bey.type === 'DEFENSE' || bey.type === 'STAMINA') ? 3 : -1;
      }
    }
    
    // ===== ARENA SPECIALIZATION =====
    // Verificar se é a arena favorita
    if (arena === this.currentForm.favoriteArena) {
      score += 2;
    }
    
    // Arena-type synergy
    const arenaSynergy = this.getArenaSynergy(bey.type, arena);
    score += arenaSynergy;
    
    return Math.max(0, Math.min(10, score));
  }
  
  /**
   * Analisa matchup de tipos
   */
  analyzeMatchup(bey, opponent) {
    const typeMatchups = {
      'ATTACK': { 'STAMINA': 8, 'DEFENSE': 3, 'ATTACK': 5, 'BALANCE': 6 },
      'DEFENSE': { 'ATTACK': 8, 'STAMINA': 3, 'DEFENSE': 5, 'BALANCE': 6 },
      'STAMINA': { 'DEFENSE': 8, 'ATTACK': 3, 'STAMINA': 5, 'BALANCE': 6 },
      'BALANCE': { 'ATTACK': 5, 'DEFENSE': 5, 'STAMINA': 5, 'BALANCE': 5 }
    };
    
    const opponentType = opponent.type || 'BALANCE';
    const score = typeMatchups[bey.type]?.[opponentType] || 5;
    
    return score;
  }
  
  /**
   * Analisa fatores psicológicos
   */
  analyzePsychology(bey, context) {
    let score = 5; // Base
    
    const { currentScore, tournamentStage } = context;
    const selfScore = currentScore?.self || 0;
    const oppScore = currentScore?.opponent || 0;
    
    // ===== SITUAÇÃO DO JOGO =====
    const isAhead = selfScore > oppScore;
    const isBehind = selfScore < oppScore;
    
    // Clutch situations
    const isClutch = tournamentStage === 'F' || tournamentStage === 'SF';
    if (isClutch && this.personality.clutchFactor > 7) {
      // High clutch: boost em situações de pressão
      score += 1.5;
    }
    
    // Risk tolerance em situações diferentes
    if (isBehind) {
      // Perdendo: precisa arriscar?
      if (this.personality.riskTolerance > 6) {
        score += bey.type === 'ATTACK' ? 2 : -1;
      }
    } else if (isAhead) {
      // Ganhando: pode jogar safe?
      if (this.personality.riskTolerance < 5) {
        score += (bey.type === 'DEFENSE' || bey.type === 'STAMINA') ? 2 : -1;
      }
    }
    
    // Adaptability: varia estratégia?
    if (this.personality.adaptability > 7) {
      // Alto adaptability: evita repetir tipos
      const lastType = this.currentForm.recentTypes[this.currentForm.recentTypes.length - 1];
      if (bey.type !== lastType) {
        score += 1;
      }
    }
    
    // Consistency: prefere o que conhece
    if (this.personality.consistency > 7) {
      const isComfort = this.currentForm.recentTypes.includes(bey.type);
      if (isComfort) {
        score += 1.5;
      }
    }
    
    return Math.max(0, Math.min(10, score));
  }
  
  /**
   * Analisa histórico de rivalidade
   */
  analyzeRivalryHistory(bey, opponentId) {
    const memory = this.rivalryMemory.get(opponentId);
    if (!memory || memory.totalMatches < 2) {
      return 5; // Não há dados suficientes
    }
    
    let score = 5;
    
    // ===== COUNTER O TIPO DOMINANTE DO OPONENTE =====
    if (memory.dominantType) {
      const typeMatchups = {
        'ATTACK': 'DEFENSE',
        'DEFENSE': 'STAMINA',
        'STAMINA': 'ATTACK',
        'BALANCE': 'BALANCE'
      };
      
      const counterType = typeMatchups[memory.dominantType];
      if (bey.type === counterType) {
        score += 3;
      }
    }
    
    // ===== EVITAR TIPOS QUE PERDERAM MUITO =====
    const typeWinRate = this.calculateTypeWinRateVsOpponent(bey.type, opponentId);
    if (typeWinRate < 0.3) {
      score -= 2; // Tipo tem histórico ruim vs esse oponente
    } else if (typeWinRate > 0.7) {
      score += 2; // Tipo tem histórico bom
    }
    
    // ===== LEARNING RATE =====
    // Bladers inteligentes aprendem mais rápido
    const learningBonus = this.personality.learningRate * memory.totalMatches * 0.1;
    score += learningBonus;
    
    return Math.max(0, Math.min(10, score));
  }
  
  /**
   * Analisa bônus de forma
   */
  analyzeFormBonus(bey) {
    let score = 5;
    
    // Momentum boost
    const momentumBonus = (this.currentForm.momentum - 0.5) * 4; // -2 a +2
    score += momentumBonus;
    
    // Confidence boost
    const confidenceBonus = (this.currentForm.confidence - 0.5) * 2; // -1 a +1
    score += confidenceBonus;
    
    // Win streak boost
    if (this.currentForm.winStreak >= 3) {
      score += 1;
    }
    if (this.currentForm.winStreak >= 5) {
      score += 1;
    }
    
    return Math.max(0, Math.min(10, score));
  }
  
  /**
   * Seleciona técnica de lançamento baseada em contexto
   */
  selectLaunchTechnique(bey, context = {}) {
    const { currentScore, matchPoint, tournamentStage } = context;
    const selfScore = currentScore?.self || 0;
    const oppScore = currentScore?.opponent || 0;
    const isBehind = selfScore < oppScore;
    
    // Técnicas disponíveis por tipo
    const techniques = {
      'ATTACK': ['RUSH_LAUNCH', 'SLIDING_SHOOT', 'BANKING_SHOOT', 'HAMMER_DROP', 'SATELLITE_LAUNCH'],
      'DEFENSE': ['STEADY_LAUNCH', 'CENTER_LOCK', 'PHANTOM_LAUNCH', 'PENDULUM_LAUNCH'],
      'STAMINA': ['SMOOTH_LAUNCH', 'FLOWER_PATTERN', 'PENDULUM_LAUNCH', 'VORTEX_LAUNCH'],
      'BALANCE': ['RUSH_LAUNCH', 'STEADY_LAUNCH', 'BANKING_SHOOT', 'MIRROR_LAUNCH', 'VORTEX_LAUNCH']
    };
    
    const available = techniques[bey.type] || ['RUSH_LAUNCH'];
    
    // 🆕 NOVOS LAUNCHES - Seleção contextual
    const intel = this.personality?.adaptability || 5;

    // Phantom Launch - Defensivos contra agressivos
    if ((bey.type === 'Defense' || bey.type === 'Stamina') && Math.random() < 0.25) {
      return 'PHANTOM_LAUNCH';
    }

    // Mirror Launch - Requer alta inteligência/adaptabilidade
    if (intel >= 7 && Math.random() < 0.15) {
      return 'MIRROR_LAUNCH';
    }

    // Pendulum Launch - Stamina builds
    if (bey.type === 'Stamina' && Math.random() < 0.25) {
      return 'PENDULUM_LAUNCH';
    }

    // Vortex Launch - Balance builds
    if (bey.type === 'Balance' && Math.random() < 0.20) {
      return 'VORTEX_LAUNCH';
    }

    // Hammer Drop - Attack builds ou quando na frente
    if (bey.type === 'Attack' && Math.random() < 0.20) {
      return 'HAMMER_DROP';
    }

    // Satellite Launch - Attack/Balance quando atrás no score
    if (isBehind && (bey.type === 'Attack' || bey.type === 'Balance') && Math.random() < 0.20) {
      return 'SATELLITE_LAUNCH';
    }
    
    // Risk tolerance influencia escolha
    if (this.personality.riskTolerance > 7 || (isBehind && matchPoint)) {
      // Alto risco: técnicas agressivas
      const aggressive = ['RUSH_LAUNCH', 'SLIDING_SHOOT', 'BANKING_SHOOT', 'HAMMER_DROP', 'SATELLITE_LAUNCH'];
      const options = available.filter(t => aggressive.includes(t));
      return options.length > 0 ? options[0] : available[0];
    }
    
    // Forma influencia
    if (this.currentForm.momentum > 0.7) {
      // Em forma: pode arriscar
      return available[Math.floor(Math.random() * available.length)];
    }
    
    // Default: primeira opção (mais segura)
    return available[0];
  }
  
  // ===== MÉTODOS AUXILIARES =====
  
  getTypePreferenceScore(bey) {
    // Baseado na personalidade, alguns tipos são preferidos
    const preferences = {
      'ATTACK': this.personality.aggression,
      'DEFENSE': 10 - this.personality.riskTolerance,
      'STAMINA': this.personality.consistency,
      'BALANCE': this.personality.adaptability
    };
    
    return preferences[bey.type] || 5;
  }
  
  getArenaSynergy(type, arena) {
    const synergies = {
      'BB10_COMPETITIVE': { 'BALANCE': 1 },
      'NEXUS': { 'ATTACK': 2, 'BALANCE': 1 },
      'VOLCANIC_RAGE': { 'STAMINA': 2, 'DEFENSE': 1 },
      'COLOSSEUM_CARNAGE': { 'ATTACK': 3 },
      'VORTEX_COLISEUM': { 'STAMINA': 2 },
      'PINBALL_INFERNO': { 'ATTACK': 2 },
      'PANGEA_PLATFORM': { 'BALANCE': 2 },
      'KILLER_SIDES': { 'ATTACK': 2, 'BALANCE': 1 }
    };
    
    return synergies[arena]?.[type] || 0;
  }
  
  calculateTypeWinRateVsOpponent(type, opponentId) {
    const memory = this.rivalryMemory.get(opponentId);
    if (!memory || !memory.typeHistory) return 0.5;
    
    // Simplificado: assumir que usou o tipo nas partidas
    const winRate = memory.totalMatches > 0 ? memory.wins / memory.totalMatches : 0.5;
    return winRate;
  }
  
  // ===== SERIALIZAÇÃO PARA SAVE/LOAD =====
  
  toJSON() {
    return {
      playerId: this.playerId,
      playerName: this.playerName,
      personality: this.personality,
      rivalryMemory: Array.from(this.rivalryMemory.entries()),
      currentForm: this.currentForm,
      deckPreferences: this.deckPreferences,
      lastDecision: this.lastDecision,
      decisionLog: this.decisionLog
    };
  }
  
  static fromJSON(data) {
    const ai = new BladerAI(data.playerId, data.playerName);
    ai.personality = data.personality;
    ai.rivalryMemory = new Map(data.rivalryMemory || []);
    ai.currentForm = data.currentForm;
    ai.deckPreferences = data.deckPreferences;
    ai.lastDecision = data.lastDecision;
    ai.decisionLog = data.decisionLog || [];
    return ai;
  }
}

/**
 * AIManager - Gerencia todas as AIs dos bladers
 */
export class AIManager {
  constructor(teams) {
    this.bladerAIs = new Map();
    
    // Criar AI para cada team
    teams.forEach((team, index) => {
      const ai = new BladerAI(index, team.name, team.attributes);
      this.bladerAIs.set(index, ai);
    });
    
    console.log(`✅ AIManager inicializado com ${this.bladerAIs.size} bladers`);
  }
  
  getAI(playerId) {
    return this.bladerAIs.get(playerId);
  }
  
  updateAfterMatch(playerId, opponentId, result) {
    const ai = this.getAI(playerId);
    if (ai) {
      ai.updateRivalryMemory(opponentId, result);
      ai.updateForm(result);
    }
  }
  
  // Serialização
  toJSON() {
    return {
      bladerAIs: Array.from(this.bladerAIs.entries()).map(([id, ai]) => [id, ai.toJSON()])
    };
  }
  
  static fromJSON(data, teams) {
    const manager = new AIManager(teams);
    
    if (data.bladerAIs) {
      data.bladerAIs.forEach(([id, aiData]) => {
        manager.bladerAIs.set(id, BladerAI.fromJSON(aiData));
      });
    }
    
    return manager;
  }
}
