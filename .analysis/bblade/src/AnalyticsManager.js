// ============================================
// ANALYTICSMANAGER.JS - Sistema Completo de Analytics
// ============================================

/**
 * Sistema de Analytics em 2 níveis:
 * 
 * MATCH (Jogo) - Resultado final 3-0, 3-1, 3-2, etc
 * - Bom para: Mentalidades, Forma, Clutch, Upsets
 * 
 * ROUND - Cada round individual
 * - Bom para: Tipos de peões, Componentes, Arenas
 */

export class AnalyticsManager {
  constructor() {
    // ===== MATCH ANALYTICS (Jogo completo) =====
    this.matchStats = {
      total: 0,
      byMentality: new Map(),        // GLASS_CANNON_vs_IRON_FORTRESS: { wins, losses, etc }
      byForma: new Map(),             // ON_FIRE: { battles, wins, winRate }
      byClutch: new Map(),            // clutchSituations: 2-2, matchPoint, etc
      byUpset: {
        total: 0,
        by15to19: 0,
        by20plus: 0,
        favoriteWins: 0,
        underdogWins: 0,
        biggest: []
      },
      byScoreline: new Map(),         // "3-0": 150, "3-1": 280, "3-2": 320
      byDuration: {
        fast: 0,      // 3 rounds
        medium: 0,    // 4 rounds  
        long: 0       // 5 rounds
      }
    };
    
    // ===== ROUND ANALYTICS (Round individual) =====
    this.roundStats = {
      total: 0,
      byType: new Map(),              // Attack_vs_Defense: { wins, losses, winRate }
      byComponent: {
        layers: new Map(),
        discs: new Map(),
        drivers: new Map()
      },
      byArena: new Map(),             // BB10_COMPETITIVE: { total, favoredTypes, etc }
      byFinishMethod: {
        burst: 0,
        ko: 0,
        over: 0,
        spin: 0
      },
      byTrait: new Map(),             // GELO_NAS_VEIAS: { activations, winsWhenActive }
      byLaunchTechnique: new Map()    // POWER: { uses, wins, winRate, byType, byArena, vsLaunch }
    };
    
    // ===== META TRACKING =====
    this.metaHistory = [];
    this.currentSeason = {
      season: 1,
      topTypes: [],
      topMentalities: [],
      dominantTraits: [],
      avgMatchDuration: 0,
      mostUsedArena: ''
    };
    
    // ===== BALANCE WARNINGS =====
    this.balanceWarnings = [];
    
    console.log('📊 AnalyticsManager initialized');
  }
  
  // ╔══════════════════════════════════════════════════════════╗
  // ║                   RECORD MATCH DATA                      ║
  // ╚══════════════════════════════════════════════════════════╝
  
  /**
   * Registra dados de um MATCH completo (jogo)
   */
  recordMatch(matchData) {
    const {
      playerA,
      playerB,
      winnerId,
      score,          // { playerA: 3, playerB: 1 }
      rounds,         // Array de rounds
      arena,
      isUpset,
      upsetMargin,
      playerARank,
      playerBRank,
      duration
    } = matchData;
    
    this.matchStats.total++;
    
    // ===== MENTALIDADES =====
    // ✅ CORREÇÃO: Criar chave consistente independente de quem venceu
    const mentalities = [playerA.mentality, playerB.mentality].sort();
    const mentalityKey = `${mentalities[0]}_vs_${mentalities[1]}`;
    
    if (!this.matchStats.byMentality.has(mentalityKey)) {
      this.matchStats.byMentality.set(mentalityKey, {
        wins: 0,
        losses: 0,
        totalRounds: 0,
        winRate: 0,
        byArena: new Map(),
        byScoreline: new Map()
      });
    }
    
    const mentalityData = this.matchStats.byMentality.get(mentalityKey);
    
    // ✅ CORREÇÃO: Incrementar wins ou losses dependendo de qual mentalidade ganhou
    const winnerMentality = winnerId === playerA.id ? playerA.mentality : playerB.mentality;
    const loserMentality = winnerId === playerA.id ? playerB.mentality : playerA.mentality;
    
    // Se a primeira mentalidade da chave (alfabeticamente) ganhou
    if (winnerMentality === mentalities[0]) {
      mentalityData.wins++;
    } else {
      mentalityData.losses++;
    }
    
    mentalityData.totalRounds += rounds.length;
    mentalityData.winRate = mentalityData.wins / (mentalityData.wins + mentalityData.losses);
    
    // Por arena
    if (!mentalityData.byArena.has(arena)) {
      mentalityData.byArena.set(arena, { wins: 0, losses: 0 });
    }
    
    // ✅ CORREÇÃO: Incrementar wins ou losses na arena também
    if (winnerMentality === mentalities[0]) {
      mentalityData.byArena.get(arena).wins++;
    } else {
      mentalityData.byArena.get(arena).losses++;
    }
    
    // Por scoreline
    const scoreline = `${Math.max(score.playerA, score.playerB)}-${Math.min(score.playerA, score.playerB)}`;
    if (!mentalityData.byScoreline.has(scoreline)) {
      mentalityData.byScoreline.set(scoreline, 0);
    }
    mentalityData.byScoreline.set(scoreline, mentalityData.byScoreline.get(scoreline) + 1);
    
    // ===== UPSET ANALYTICS =====
    if (isUpset) {
      this.matchStats.byUpset.total++;
      if (upsetMargin >= 20) {
        this.matchStats.byUpset.by20plus++;
      } else if (upsetMargin >= 15) {
        this.matchStats.byUpset.by15to19++;
      }
      this.matchStats.byUpset.underdogWins++;
      
      // Guardar biggest upsets
      this.matchStats.byUpset.biggest.push({
        winner: winnerId === playerA.id ? playerA.name : playerB.name,
        loser: winnerId === playerA.id ? playerB.name : playerA.name,
        margin: upsetMargin,
        arena,
        scoreline
      });
      
      // Manter apenas top 10 upsets
      this.matchStats.byUpset.biggest.sort((a, b) => b.margin - a.margin);
      if (this.matchStats.byUpset.biggest.length > 10) {
        this.matchStats.byUpset.biggest = this.matchStats.byUpset.biggest.slice(0, 10);
      }
    } else {
      this.matchStats.byUpset.favoriteWins++;
    }
    
    // ===== SCORELINE =====
    if (!this.matchStats.byScoreline.has(scoreline)) {
      this.matchStats.byScoreline.set(scoreline, 0);
    }
    this.matchStats.byScoreline.set(scoreline, this.matchStats.byScoreline.get(scoreline) + 1);
    
    // ===== DURATION =====
    if (rounds.length === 3) {
      this.matchStats.byDuration.fast++;
    } else if (rounds.length === 4) {
      this.matchStats.byDuration.medium++;
    } else {
      this.matchStats.byDuration.long++;
    }
  }
  
  // ╔══════════════════════════════════════════════════════════╗
  // ║                   RECORD ROUND DATA                      ║
  // ╚══════════════════════════════════════════════════════════╝
  
  /**
   * Registra dados de um ROUND individual
   */
  recordRound(roundData) {
    const {
      playerAType,      // Attack, Defense, Stamina, Balance
      playerBType,
      winnerId,
      playerAId,
      playerBId,
      arena,
      finishMethod,     // burst, ko, over, spin
      playerALayer,
      playerADisc,
      playerADriver,
      playerBLayer,
      playerBDisc,
      playerBDriver,
      playerALaunchTechnique,  // NEW: Launch technique usado pelo Player A
      playerBLaunchTechnique,  // NEW: Launch technique usado pelo Player B
      traits            // Traits que ativaram neste round
    } = roundData;
    
    this.roundStats.total++;
    
    // ===== TYPE MATCHUPS =====
    // ✅ CORREÇÃO: Criar chave consistente independente de quem venceu
    // Sempre ordenar alfabeticamente para ter a mesma chave
    const types = [playerAType, playerBType].sort();
    const typeKey = `${types[0]}_vs_${types[1]}`;
    
    if (!this.roundStats.byType.has(typeKey)) {
      this.roundStats.byType.set(typeKey, {
        wins: 0,
        losses: 0,
        winRate: 0,
        byArena: new Map(),
        byFinishMethod: { burst: 0, ko: 0, over: 0, spin: 0 }
      });
    }
    
    const typeData = this.roundStats.byType.get(typeKey);
    
    // ✅ CORREÇÃO: Incrementar wins ou losses dependendo de qual tipo ganhou
    const winnerType = winnerId === playerAId ? playerAType : playerBType;
    const loserType = winnerId === playerAId ? playerBType : playerAType;
    
    // Se o primeiro tipo da chave (alfabeticamente) ganhou
    if (winnerType === types[0]) {
      typeData.wins++;
    } else {
      typeData.losses++;
    }
    
    typeData.winRate = typeData.wins / (typeData.wins + typeData.losses);
    typeData.byFinishMethod[finishMethod]++;
    
    // Por arena
    if (!typeData.byArena.has(arena)) {
      typeData.byArena.set(arena, { wins: 0, losses: 0 });
    }
    
    // ✅ CORREÇÃO: Incrementar wins ou losses na arena também
    if (winnerType === types[0]) {
      typeData.byArena.get(arena).wins++;
    } else {
      typeData.byArena.get(arena).losses++;
    }
    
    // ===== ARENA ANALYTICS =====
    if (!this.roundStats.byArena.has(arena)) {
      this.roundStats.byArena.set(arena, {
        totalRounds: 0,
        typeWins: new Map(),
        finishMethods: { burst: 0, ko: 0, over: 0, spin: 0 },
        avgDuration: 0
      });
    }
    
    const arenaData = this.roundStats.byArena.get(arena);
    arenaData.totalRounds++;
    arenaData.finishMethods[finishMethod]++;
    
    // Contar vitórias por tipo nesta arena
    if (!arenaData.typeWins.has(winnerType)) {
      arenaData.typeWins.set(winnerType, 0);
    }
    arenaData.typeWins.set(winnerType, arenaData.typeWins.get(winnerType) + 1);
    
    // ===== COMPONENTES =====
    const winnerLayer = winnerId === playerAId ? playerALayer : playerBLayer;
    const winnerDisc = winnerId === playerAId ? playerADisc : playerBDisc;
    const winnerDriver = winnerId === playerAId ? playerADriver : playerBDriver;
    
    // Layers
    if (!this.roundStats.byComponent.layers.has(winnerLayer)) {
      this.roundStats.byComponent.layers.set(winnerLayer, {
        uses: 0,
        wins: 0,
        winRate: 0,
        avgVs: new Map(),
        bestArenas: []
      });
    }
    const layerData = this.roundStats.byComponent.layers.get(winnerLayer);
    layerData.wins++;
    layerData.winRate = layerData.wins / layerData.uses;
    
    // Discs
    if (!this.roundStats.byComponent.discs.has(winnerDisc)) {
      this.roundStats.byComponent.discs.set(winnerDisc, {
        uses: 0,
        wins: 0,
        winRate: 0
      });
    }
    this.roundStats.byComponent.discs.get(winnerDisc).wins++;
    
    // Drivers
    if (!this.roundStats.byComponent.drivers.has(winnerDriver)) {
      this.roundStats.byComponent.drivers.set(winnerDriver, {
        uses: 0,
        wins: 0,
        winRate: 0,
        burstRate: 0,
        totalBursts: 0
      });
    }
    const driverData = this.roundStats.byComponent.drivers.get(winnerDriver);
    driverData.wins++;
    if (finishMethod === 'burst') {
      driverData.totalBursts++;
    }
    driverData.winRate = driverData.wins / driverData.uses;
    driverData.burstRate = driverData.totalBursts / driverData.uses;
    
    // ===== FINISH METHODS =====
    this.roundStats.byFinishMethod[finishMethod]++;
    
    // ===== TRAITS =====
    if (traits && traits.length > 0) {
      traits.forEach(trait => {
        if (!this.roundStats.byTrait.has(trait.id)) {
          this.roundStats.byTrait.set(trait.id, {
            activations: 0,
            winsWhenActive: 0,
            winRate: 0
          });
        }
        
        const traitData = this.roundStats.byTrait.get(trait.id);
        traitData.activations++;
        if (trait.playerWon) {
          traitData.winsWhenActive++;
        }
        traitData.winRate = traitData.winsWhenActive / traitData.activations;
      });
    }
    
    // ===== LAUNCH TECHNIQUES =====
    // Rastrear ambas as técnicas usadas
    const launchTechniques = [
      { technique: playerALaunchTechnique, playerId: playerAId, type: playerAType },
      { technique: playerBLaunchTechnique, playerId: playerBId, type: playerBType }
    ];
    
    launchTechniques.forEach(({ technique, playerId, type }) => {
      if (!technique) return; // Skip se não tiver técnica definida
      
      if (!this.roundStats.byLaunchTechnique.has(technique)) {
        this.roundStats.byLaunchTechnique.set(technique, {
          uses: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          byType: new Map(),
          byArena: new Map(),
          byFinishMethod: { burst: 0, ko: 0, over: 0, spin: 0 },
          vsLaunch: new Map()  // HEAD-TO-HEAD: opponentTechnique -> { uses, wins, losses, winRate }
        });
      }
      
      const ltData = this.roundStats.byLaunchTechnique.get(technique);
      ltData.uses++;
      
      const won = playerId === winnerId;
      if (won) {
        ltData.wins++;
        ltData.byFinishMethod[finishMethod]++;
      } else {
        ltData.losses++;
      }
      ltData.winRate = ltData.wins / ltData.uses;
      
      // Por tipo
      if (!ltData.byType.has(type)) {
        ltData.byType.set(type, { uses: 0, wins: 0, winRate: 0 });
      }
      const typeStats = ltData.byType.get(type);
      typeStats.uses++;
      if (won) typeStats.wins++;
      typeStats.winRate = typeStats.wins / typeStats.uses;
      
      // Por arena
      if (!ltData.byArena.has(arena)) {
        ltData.byArena.set(arena, { uses: 0, wins: 0, winRate: 0 });
      }
      const arenaStats = ltData.byArena.get(arena);
      arenaStats.uses++;
      if (won) arenaStats.wins++;
      arenaStats.winRate = arenaStats.wins / arenaStats.uses;
    });

    // ===== HEAD-TO-HEAD ENTRE LAUNCH TECHNIQUES =====
    const techA = playerALaunchTechnique;
    const techB = playerBLaunchTechnique;
    if (techA && techB && techA !== techB) {
      const wonByA = playerAId === winnerId;
      [{ self: techA, opp: techB, won: wonByA }, { self: techB, opp: techA, won: !wonByA }].forEach(({ self, opp, won }) => {
        const ltData = this.roundStats.byLaunchTechnique.get(self);
        if (!ltData) return;
        if (!ltData.vsLaunch.has(opp)) {
          ltData.vsLaunch.set(opp, { uses: 0, wins: 0, losses: 0, winRate: 0 });
        }
        const vs = ltData.vsLaunch.get(opp);
        vs.uses++;
        if (won) { vs.wins++; } else { vs.losses++; }
        vs.winRate = vs.wins / vs.uses;
      });
    }
  }
  
  // ╔══════════════════════════════════════════════════════════╗
  // ║                   BALANCE ANALYSIS                       ║
  // ╚══════════════════════════════════════════════════════════╝
  
  /**
   * Analisa balanceamento e gera avisos
   */
  analyzeBalance() {
    this.balanceWarnings = [];
    
    // ===== TIPO vs TIPO =====
    this.roundStats.byType.forEach((data, key) => {
      if (data.wins + data.losses < 50) return; // Mínimo de 50 amostras
      
      // Ideal: 45% - 55%
      if (data.winRate > 0.60) {
        this.balanceWarnings.push({
          category: 'TYPE_MATCHUP',
          severity: 'HIGH',
          matchup: key,
          winRate: data.winRate,
          message: `${key} muito forte (${(data.winRate * 100).toFixed(1)}% > 60%)`
        });
      } else if (data.winRate < 0.40) {
        this.balanceWarnings.push({
          category: 'TYPE_MATCHUP',
          severity: 'HIGH',
          matchup: key,
          winRate: data.winRate,
          message: `${key} muito fraco (${(data.winRate * 100).toFixed(1)}% < 40%)`
        });
      } else if (data.winRate > 0.55 || data.winRate < 0.45) {
        this.balanceWarnings.push({
          category: 'TYPE_MATCHUP',
          severity: 'MEDIUM',
          matchup: key,
          winRate: data.winRate,
          message: `${key} desbalanceado (${(data.winRate * 100).toFixed(1)}%)`
        });
      }
    });
    
    // ===== MENTALIDADE vs MENTALIDADE =====
    this.matchStats.byMentality.forEach((data, key) => {
      if (data.wins + data.losses < 30) return;
      
      if (data.winRate > 0.65) {
        this.balanceWarnings.push({
          category: 'MENTALITY_MATCHUP',
          severity: 'HIGH',
          matchup: key,
          winRate: data.winRate,
          message: `Mentalidade ${key} dominante (${(data.winRate * 100).toFixed(1)}%)`
        });
      }
    });
    
    // ===== ARENAS =====
    this.roundStats.byArena.forEach((data, arena) => {
      if (data.totalRounds < 100) return;
      
      // Verificar se algum tipo domina demais
      data.typeWins.forEach((wins, type) => {
        const typeWinRate = wins / data.totalRounds;
        if (typeWinRate > 0.40) {
          this.balanceWarnings.push({
            category: 'ARENA_BIAS',
            severity: 'MEDIUM',
            arena,
            type,
            winRate: typeWinRate,
            message: `${arena}: ${type} muito forte (${(typeWinRate * 100).toFixed(1)}%)`
          });
        }
      });
    });
    
    // Ordenar por severidade
    const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    this.balanceWarnings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    
    return this.balanceWarnings;
  }
  
  // ╔══════════════════════════════════════════════════════════╗
  // ║                      EXPORT DATA                         ║
  // ╚══════════════════════════════════════════════════════════╝
  
  /**
   * Exporta dados de MATCHES em CSV
   */
  exportMatchesCSV() {
    let csv = 'Matchup,Total Games,Wins,Losses,Win Rate,3-0,3-1,3-2\n';
    
    this.matchStats.byMentality.forEach((data, key) => {
      const total = data.wins + data.losses;
      const rate = (data.winRate * 100).toFixed(1);
      const score30 = data.byScoreline.get('3-0') || 0;
      const score31 = data.byScoreline.get('3-1') || 0;
      const score32 = data.byScoreline.get('3-2') || 0;
      
      csv += `${key},${total},${data.wins},${data.losses},${rate}%,${score30},${score31},${score32}\n`;
    });
    
    return csv;
  }
  
  /**
   * Exporta dados de ROUNDS em CSV
   */
  exportRoundsCSV() {
    let csv = 'Type Matchup,Total Rounds,Wins,Losses,Win Rate,Burst,KO,Over,Spin\n';
    
    this.roundStats.byType.forEach((data, key) => {
      const total = data.wins + data.losses;
      const rate = (data.winRate * 100).toFixed(1);
      
      csv += `${key},${total},${data.wins},${data.losses},${rate}%,${data.byFinishMethod.burst},${data.byFinishMethod.ko},${data.byFinishMethod.over},${data.byFinishMethod.spin}\n`;
    });
    
    return csv;
  }
  
  /**
   * Exporta dados de ARENAS em CSV
   */
  exportArenasCSV() {
    let csv = 'Arena,Total Rounds,Attack Wins,Defense Wins,Stamina Wins,Balance Wins,Burst%,KO%,Over%,Spin%\n';
    
    this.roundStats.byArena.forEach((data, arena) => {
      const attackWins = data.typeWins.get('Attack') || 0;
      const defenseWins = data.typeWins.get('Defense') || 0;
      const staminaWins = data.typeWins.get('Stamina') || 0;
      const balanceWins = data.typeWins.get('Balance') || 0;
      
      const burstPct = ((data.finishMethods.burst / data.totalRounds) * 100).toFixed(1);
      const koPct = ((data.finishMethods.ko / data.totalRounds) * 100).toFixed(1);
      const overPct = ((data.finishMethods.over / data.totalRounds) * 100).toFixed(1);
      const spinPct = ((data.finishMethods.spin / data.totalRounds) * 100).toFixed(1);
      
      csv += `${arena},${data.totalRounds},${attackWins},${defenseWins},${staminaWins},${balanceWins},${burstPct}%,${koPct}%,${overPct}%,${spinPct}%\n`;
    });
    
    return csv;
  }
  
  /**
   * Download de arquivo CSV
   */
  downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  /**
   * Exporta JSON completo
   */
  exportJSON() {
    return {
      matchStats: {
        total: this.matchStats.total,
        byMentality: Array.from(this.matchStats.byMentality.entries()).map(([k, v]) => ({
          matchup: k,
          ...v,
          byArena: Array.from(v.byArena.entries()),
          byScoreline: Array.from(v.byScoreline.entries())
        })),
        byUpset: this.matchStats.byUpset,
        byScoreline: Array.from(this.matchStats.byScoreline.entries()),
        byDuration: this.matchStats.byDuration
      },
      roundStats: {
        total: this.roundStats.total,
        byType: Array.from(this.roundStats.byType.entries()).map(([k, v]) => ({
          matchup: k,
          ...v,
          byArena: Array.from(v.byArena.entries())
        })),
        byArena: Array.from(this.roundStats.byArena.entries()).map(([k, v]) => ({
          arena: k,
          ...v,
          typeWins: Array.from(v.typeWins.entries())
        })),
        byFinishMethod: this.roundStats.byFinishMethod,
        byTrait: Array.from(this.roundStats.byTrait.entries())
      },
      balanceWarnings: this.balanceWarnings,
      metaHistory: this.metaHistory
    };
  }
  
  // ╔══════════════════════════════════════════════════════════╗
  // ║                     SERIALIZATION                        ║
  // ╚══════════════════════════════════════════════════════════╝
  
  toJSON() {
    // Helper: serializa um entry cujos valores podem ter Maps aninhados
    // JSON.stringify converte Maps silenciosamente para {} — precisamos serializar antes
    const serializeEntry = ([key, val]) => {
      const s = { ...val };
      if (s.byArena    instanceof Map) s.byArena    = Array.from(s.byArena.entries());
      if (s.byScoreline instanceof Map) s.byScoreline = Array.from(s.byScoreline.entries());
      if (s.byType     instanceof Map) s.byType     = Array.from(s.byType.entries());
      if (s.vsLaunch   instanceof Map) s.vsLaunch   = Array.from(s.vsLaunch.entries());
      if (s.typeWins   instanceof Map) s.typeWins   = Array.from(s.typeWins.entries());
      if (s.avgVs      instanceof Map) s.avgVs      = Array.from(s.avgVs.entries());
      return [key, s];
    };
    return {
      matchStats: {
        total: this.matchStats.total,
        byMentality: Array.from(this.matchStats.byMentality.entries()).map(serializeEntry),
        byForma:     Array.from(this.matchStats.byForma.entries()).map(serializeEntry),
        byClutch:    Array.from(this.matchStats.byClutch.entries()).map(serializeEntry),
        byUpset:     this.matchStats.byUpset,
        byScoreline: Array.from(this.matchStats.byScoreline.entries()),
        byDuration:  this.matchStats.byDuration
      },
      roundStats: {
        total:   this.roundStats.total,
        byType:  Array.from(this.roundStats.byType.entries()).map(serializeEntry),
        byComponent: {
          layers:  Array.from(this.roundStats.byComponent.layers.entries()).map(serializeEntry),
          discs:   Array.from(this.roundStats.byComponent.discs.entries()).map(serializeEntry),
          drivers: Array.from(this.roundStats.byComponent.drivers.entries()).map(serializeEntry)
        },
        byArena:       Array.from(this.roundStats.byArena.entries()).map(serializeEntry),
        byFinishMethod: this.roundStats.byFinishMethod,
        byTrait:       Array.from(this.roundStats.byTrait.entries()).map(serializeEntry),
        byLaunchTechnique: Array.from((this.roundStats.byLaunchTechnique || new Map()).entries()).map(serializeEntry)
      },
      metaHistory:   this.metaHistory,
      currentSeason: this.currentSeason
    };
  }
  
  static fromJSON(data) {
    const manager = new AnalyticsManager();

    // Helper: converte qualquer forma de "serialized Map" de volta para Map
    // Suporta: array-of-entries [[k,v],...], plain object {k:v,...}, ou Map já pronto
    const toMap = (raw) => {
      if (!raw) return new Map();
      if (raw instanceof Map) return raw;
      if (Array.isArray(raw)) return new Map(raw);
      // Plain object {} — legado de saves onde Maps não foram serializados corretamente
      return new Map(Object.entries(raw));
    };

    // Helper: restaura Map cujos valores podem ter Maps aninhados
    const restoreMapWithNestedMaps = (raw) => {
      return new Map(Array.from(toMap(raw).entries()).map(([key, val]) => {
        const restored = { ...val };
        restored.byArena     = toMap(restored.byArena);
        restored.byScoreline = toMap(restored.byScoreline);
        restored.byType      = toMap(restored.byType);
        restored.vsLaunch    = toMap(restored.vsLaunch);
        restored.typeWins    = toMap(restored.typeWins);
        restored.avgVs       = toMap(restored.avgVs);
        return [key, restored];
      }));
    };

    if (data.matchStats) {
      manager.matchStats.total        = data.matchStats.total || 0;
      manager.matchStats.byMentality  = restoreMapWithNestedMaps(data.matchStats.byMentality);
      manager.matchStats.byForma      = restoreMapWithNestedMaps(data.matchStats.byForma);
      manager.matchStats.byClutch     = restoreMapWithNestedMaps(data.matchStats.byClutch);
      manager.matchStats.byUpset      = data.matchStats.byUpset || manager.matchStats.byUpset;
      manager.matchStats.byScoreline  = toMap(data.matchStats.byScoreline);
      manager.matchStats.byDuration   = data.matchStats.byDuration || manager.matchStats.byDuration;
    }

    if (data.roundStats) {
      manager.roundStats.total              = data.roundStats.total || 0;
      manager.roundStats.byType             = restoreMapWithNestedMaps(data.roundStats.byType);
      manager.roundStats.byComponent.layers = restoreMapWithNestedMaps(data.roundStats.byComponent?.layers);
      manager.roundStats.byComponent.discs  = restoreMapWithNestedMaps(data.roundStats.byComponent?.discs);
      manager.roundStats.byComponent.drivers= restoreMapWithNestedMaps(data.roundStats.byComponent?.drivers);
      manager.roundStats.byArena            = restoreMapWithNestedMaps(data.roundStats.byArena);
      manager.roundStats.byFinishMethod     = data.roundStats.byFinishMethod || manager.roundStats.byFinishMethod;
      manager.roundStats.byTrait            = restoreMapWithNestedMaps(data.roundStats.byTrait);
      // byLaunchTechnique pode não existir em saves antigos
      if (data.roundStats.byLaunchTechnique) {
        manager.roundStats.byLaunchTechnique = restoreMapWithNestedMaps(data.roundStats.byLaunchTechnique);
      }
    }

    manager.metaHistory   = data.metaHistory   || [];
    manager.currentSeason = data.currentSeason || manager.currentSeason;

    return manager;
  }
}
