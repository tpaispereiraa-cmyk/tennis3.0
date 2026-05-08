// ============================================
// COMBOTRACKER.JS - Sistema de Descoberta de Combos e Meta
// ============================================
// Sistema que trackeia builds efetivos, detecta meta combos,
// e calcula inovação dos jogadores

/**
 * ComboSystem - Gerencia descoberta e tracking de combos
 */
export class ComboSystem {
  constructor() {
    // ===== COMBOS CONHECIDOS =====
    // signature -> {winRate, uses, bestArenas, counters, discoveredBy, date}
    this.knownCombos = new Map();
    
    // ===== META TRACKING =====
    this.metaCombos = []; // Combos dominantes (WR >60% com >20 uses)
    this.emergingCombos = []; // Combos em ascensão
    
    // ===== INNOVATION TRACKING =====
    this.playerInnovations = new Map(); // playerId -> innovation score
    
    // ===== HISTÓRICO =====
    this.comboHistory = []; // Timeline de descobertas
    
    console.log('✅ ComboSystem inicializado');
  }
  
  /**
   * Gera signature única para um beyblade build
   */
  generateSignature(bey) {
    // Signature baseada em componentes principais
    return `${bey.type}_${bey.name}_${bey.color || 'default'}`;
  }
  
  /**
   * Analisa resultado de batalha e trackeia combo
   */
  analyzeBuild(bey, result, context = {}) {
    const signature = this.generateSignature(bey);
    const { won, arena, opponentType, method } = result;
    const { playerId, playerName } = context;
    
    // Inicializar combo se não existir
    if (!this.knownCombos.has(signature)) {
      this.knownCombos.set(signature, {
        signature,
        bey: bey,
        wins: 0,
        losses: 0,
        uses: 0,
        winRate: 0,
        bestArenas: new Map(),
        vsTypes: new Map(), // Performance vs cada tipo
        methods: { burst: 0, KO: 0, ringOut: 0, points: 0 },
        discoveredBy: playerId,
        discovererName: playerName,
        discoveredDate: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        innovationScore: 0
      });
      
      // Log descoberta
      console.log(`🆕 Novo combo descoberto por ${playerName}: ${signature}`);
      
      this.comboHistory.push({
        event: 'DISCOVERY',
        signature,
        playerId,
        playerName,
        date: new Date().toISOString()
      });
    }
    
    const combo = this.knownCombos.get(signature);
    
    // Atualizar stats
    combo.uses++;
    if (won) {
      combo.wins++;
    } else {
      combo.losses++;
    }
    combo.winRate = combo.wins / combo.uses;
    combo.lastUsed = new Date().toISOString();
    
    // Atualizar arena stats
    if (arena) {
      const arenaStats = combo.bestArenas.get(arena) || { wins: 0, uses: 0 };
      arenaStats.uses++;
      if (won) arenaStats.wins++;
      combo.bestArenas.set(arena, arenaStats);
    }
    
    // Atualizar performance vs tipos
    if (opponentType) {
      const vsStats = combo.vsTypes.get(opponentType) || { wins: 0, uses: 0 };
      vsStats.uses++;
      if (won) vsStats.wins++;
      combo.vsTypes.set(opponentType, vsStats);
    }
    
    // Atualizar métodos de vitória
    if (won && method) {
      combo.methods[method] = (combo.methods[method] || 0) + 1;
    }
    
    // Calcular innovation score
    combo.innovationScore = this.calculateComboInnovation(combo);
    
    // Check se virou meta
    this.checkMetaStatus(signature);
  }
  
  /**
   * Detecta se um combo virou META
   */
  detectMetaCombo(signature) {
    const combo = this.knownCombos.get(signature);
    if (!combo) return false;
    
    // Critérios para META:
    // - Win rate > 60%
    // - Usado > 20 vezes
    const isMeta = combo.winRate > 0.60 && combo.uses > 20;
    
    if (isMeta) {
      console.log(`⭐ META COMBO DETECTADO: ${signature} (WR: ${(combo.winRate * 100).toFixed(1)}%)`);
    }
    
    return isMeta;
  }
  
  /**
   * Verifica status de meta de um combo
   */
  checkMetaStatus(signature) {
    const combo = this.knownCombos.get(signature);
    if (!combo) return;
    
    const isMeta = this.detectMetaCombo(signature);
    
    if (isMeta) {
      // Adicionar aos meta combos se não estiver
      const existingIndex = this.metaCombos.findIndex(c => c.signature === signature);
      if (existingIndex === -1) {
        this.metaCombos.push(combo);
        
        // Log evento
        this.comboHistory.push({
          event: 'META_EMERGE',
          signature,
          winRate: combo.winRate,
          uses: combo.uses,
          date: new Date().toISOString()
        });
      }
    }
    
    // Check emergindo (WR >55%, uses 10-20)
    const isEmerging = combo.winRate > 0.55 && combo.uses >= 10 && combo.uses < 20;
    if (isEmerging) {
      const existingIndex = this.emergingCombos.findIndex(c => c.signature === signature);
      if (existingIndex === -1) {
        this.emergingCombos.push(combo);
      }
    }
  }
  
  /**
   * Encontra counter para um combo dominante
   */
  findCounter(targetSignature) {
    const targetCombo = this.knownCombos.get(targetSignature);
    if (!targetCombo) return null;
    
    const targetType = targetCombo.bey.type;
    
    // Buscar combos que performam bem contra o tipo do target
    const counters = [];
    
    this.knownCombos.forEach((combo, signature) => {
      if (signature === targetSignature) return; // Skip self
      
      const vsStats = combo.vsTypes.get(targetType);
      if (vsStats && vsStats.uses >= 3) {
        const vsWinRate = vsStats.wins / vsStats.uses;
        
        if (vsWinRate > 0.6) {
          counters.push({
            signature,
            combo,
            vsWinRate,
            confidence: vsStats.uses // Mais usos = mais confiança
          });
        }
      }
    });
    
    // Ordenar por winRate vs tipo, depois por confidence
    counters.sort((a, b) => {
      if (Math.abs(a.vsWinRate - b.vsWinRate) < 0.05) {
        return b.confidence - a.confidence;
      }
      return b.vsWinRate - a.vsWinRate;
    });
    
    return counters.length > 0 ? counters[0] : null;
  }
  
  /**
   * Calcula innovation score de um jogador
   */
  calculateInnovation(playerId) {
    let innovationScore = 0;
    let uniqueBuilds = 0;
    let metaDiscoveries = 0;
    
    // Contar combos descobertos por esse jogador
    this.knownCombos.forEach(combo => {
      if (combo.discoveredBy === playerId) {
        uniqueBuilds++;
        innovationScore += combo.innovationScore;
        
        // Bônus se descobriu um meta
        if (this.metaCombos.includes(combo)) {
          metaDiscoveries++;
          innovationScore += 50;
        }
      }
    });
    
    // Média
    const avgInnovation = uniqueBuilds > 0 ? innovationScore / uniqueBuilds : 0;
    
    const result = {
      playerId,
      uniqueBuilds,
      metaDiscoveries,
      totalInnovation: innovationScore,
      avgInnovation,
      rank: 0 // Será preenchido no ranking
    };
    
    this.playerInnovations.set(playerId, result);
    return result;
  }
  
  /**
   * Calcula innovation score de um combo específico
   */
  calculateComboInnovation(combo) {
    let score = 0;
    
    // Base: uso precoce = mais inovador
    const daysSinceDiscovery = (Date.now() - new Date(combo.discoveredDate)) / (1000 * 60 * 60 * 24);
    if (daysSinceDiscovery < 30) {
      score += 20; // Descoberta recente
    }
    
    // Win rate alto = combo efetivo
    if (combo.winRate > 0.65) {
      score += 30;
    } else if (combo.winRate > 0.55) {
      score += 15;
    }
    
    // Versatilidade em arenas
    const arenaCount = combo.bestArenas.size;
    score += Math.min(20, arenaCount * 5); // Até 20 pontos
    
    // Performance vs múltiplos tipos
    const typeCount = combo.vsTypes.size;
    score += Math.min(20, typeCount * 5); // Até 20 pontos
    
    // Métodos de vitória diversificados
    const methods = Object.values(combo.methods).filter(v => v > 0).length;
    score += methods * 3;
    
    return score;
  }
  
  /**
   * Retorna ranking de inovação dos jogadores
   */
  getInnovationRankings() {
    const rankings = [];
    
    this.playerInnovations.forEach((data, playerId) => {
      rankings.push(data);
    });
    
    // Ordenar por total innovation
    rankings.sort((a, b) => b.totalInnovation - a.totalInnovation);
    
    // Atribuir ranks
    rankings.forEach((data, idx) => {
      data.rank = idx + 1;
    });
    
    return rankings;
  }
  
  /**
   * Retorna os melhores combos
   */
  getTopCombos(limit = 10) {
    const combos = Array.from(this.knownCombos.values());
    
    // Filtrar combos com uso mínimo
    const qualified = combos.filter(c => c.uses >= 5);
    
    // Ordenar por win rate, depois por uses
    qualified.sort((a, b) => {
      if (Math.abs(a.winRate - b.winRate) < 0.02) {
        return b.uses - a.uses;
      }
      return b.winRate - a.winRate;
    });
    
    return qualified.slice(0, limit);
  }
  
  /**
   * Retorna meta report
   */
  getMetaReport() {
    return {
      metaCombos: this.metaCombos.map(c => ({
        signature: c.signature,
        type: c.bey.type,
        winRate: c.winRate,
        uses: c.uses,
        discoverer: c.discovererName
      })),
      emergingCombos: this.emergingCombos.map(c => ({
        signature: c.signature,
        type: c.bey.type,
        winRate: c.winRate,
        uses: c.uses
      })),
      totalCombos: this.knownCombos.size,
      recentDiscoveries: this.comboHistory
        .filter(e => e.event === 'DISCOVERY')
        .slice(-10)
    };
  }
  
  /**
   * Sugere build baseado em meta atual e opponent
   */
  suggestBuild(context = {}) {
    const { opponentType, arena, avoidMeta = false } = context;
    
    let candidates = Array.from(this.knownCombos.values());
    
    // Filtrar por meta preference
    if (avoidMeta) {
      candidates = candidates.filter(c => !this.metaCombos.includes(c));
    }
    
    // Score cada candidato
    const scored = candidates.map(combo => {
      let score = combo.winRate * 50; // Base
      
      // Bônus vs opponent type
      if (opponentType) {
        const vsStats = combo.vsTypes.get(opponentType);
        if (vsStats && vsStats.uses >= 3) {
          const vsWR = vsStats.wins / vsStats.uses;
          score += vsWR * 30;
        }
      }
      
      // Bônus na arena específica
      if (arena) {
        const arenaStats = combo.bestArenas.get(arena);
        if (arenaStats && arenaStats.uses >= 3) {
          const arenaWR = arenaStats.wins / arenaStats.uses;
          score += arenaWR * 20;
        }
      }
      
      return { combo, score };
    });
    
    // Ordenar e retornar top
    scored.sort((a, b) => b.score - a.score);
    return scored.length > 0 ? scored[0].combo : null;
  }
  
  // ===== SERIALIZAÇÃO =====
  
  toJSON() {
    return {
      knownCombos: Array.from(this.knownCombos.entries()).map(([sig, combo]) => {
        return [sig, {
          ...combo,
          bestArenas: Array.from(combo.bestArenas.entries()),
          vsTypes: Array.from(combo.vsTypes.entries())
        }];
      }),
      metaCombos: this.metaCombos.map(c => c.signature),
      emergingCombos: this.emergingCombos.map(c => c.signature),
      playerInnovations: Array.from(this.playerInnovations.entries()),
      comboHistory: this.comboHistory
    };
  }
  
  static fromJSON(data) {
    const system = new ComboSystem();
    
    if (data.knownCombos) {
      data.knownCombos.forEach(([sig, combo]) => {
        system.knownCombos.set(sig, {
          ...combo,
          bestArenas: new Map(combo.bestArenas || []),
          vsTypes: new Map(combo.vsTypes || [])
        });
      });
    }
    
    if (data.metaCombos) {
      system.metaCombos = data.metaCombos
        .map(sig => system.knownCombos.get(sig))
        .filter(Boolean);
    }
    
    if (data.emergingCombos) {
      system.emergingCombos = data.emergingCombos
        .map(sig => system.knownCombos.get(sig))
        .filter(Boolean);
    }
    
    if (data.playerInnovations) {
      system.playerInnovations = new Map(data.playerInnovations);
    }
    
    if (data.comboHistory) {
      system.comboHistory = data.comboHistory;
    }
    
    return system;
  }
}

/**
 * Utility: Analisa diversidade de deck
 */
export function analyzeDeckDiversity(deck) {
  const types = deck.map(bey => bey.type);
  const uniqueTypes = new Set(types);
  
  // Diversity index: 0 (mono-type) a 1 (muito diverso)
  const diversityIndex = (uniqueTypes.size - 1) / 3; // Max 4 tipos
  
  // Distribution
  const distribution = {};
  types.forEach(type => {
    distribution[type] = (distribution[type] || 0) + 1;
  });
  
  // Balance ratio: quão equilibrado é
  const maxCount = Math.max(...Object.values(distribution));
  const minCount = Math.min(...Object.values(distribution));
  const balanceRatio = minCount / maxCount; // 0 (desbalanceado) a 1 (balanceado)
  
  return {
    diversityIndex,
    balanceRatio,
    distribution,
    uniqueTypes: uniqueTypes.size
  };
}
