// ============================================
// FORMSYSTEM.JS - Sistema de Forma Baseado em Resultados
// ============================================
// Sistema simples que gerencia a forma dos bladers baseado em:
// - Resultados em torneios (campeão, semi, quartas, etc)
// - Decay natural ao longo do tempo
// - Expectativa vs realidade (top players caindo cedo = maior penalty)

import { getPlayerTraitData } from './traits_data.js';

/**
 * FormTracker - Rastreia e calcula a forma de um blader
 */
export class FormTracker {
  constructor(playerId, playerName, initialForma = 50) {
    this.playerId = playerId;
    this.playerName = playerName;
    
    // ===== FORMA ATUAL (0-100) =====
    this.forma = Math.max(0, Math.min(100, initialForma)); // Garante 0-100
    
    // ===== HISTÓRICO =====
    this.formaHistory = []; // Snapshots ao longo do tempo
    this.recentResults = []; // Últimos 5 resultados
    
    console.log(`👤 ${this.playerName} inicializado - Forma: ${this.forma}`);
  }
  
  /**
   * RETORNA O ESTADO ATUAL DE FORMA
   */
  getFormaState() {
    if (this.forma >= 90) return { name: 'ON_FIRE', buff: 0.20, icon: '🔥', color: '#ff4500' };
    if (this.forma >= 75) return { name: 'HOT_STREAK', buff: 0.13, icon: '⚡', color: '#ff8c00' };
    if (this.forma >= 60) return { name: 'IN_FORM', buff: 0.08, icon: '✨', color: '#ffd700' };
    if (this.forma >= 40) return { name: 'NEUTRAL', buff: 0.00, icon: '➖', color: '#808080' };
    if (this.forma >= 25) return { name: 'STRUGGLING', buff: -0.05, icon: '📉', color: '#4169e1' };
    if (this.forma >= 10) return { name: 'SLUMP', buff: -0.08, icon: '💔', color: '#8b0000' };
    return { name: 'ROCK_BOTTOM', buff: -0.12, icon: '🌊', color: '#000080' };
  }
  
  /**
   * RETORNA MULTIPLICADOR DE STATS (usado em batalhas)
   * Agora com suporte a traits!
   */
  getStatsMultiplier(traitModifiers = {}) {
    const state = this.getFormaState();
    let multiplier = 1.0 + state.buff;
    
    // ===== APLICAR TRAITS COM HOOK 'FORM_MULTIPLIER' =====
    if (traitModifiers.additionalMultipliers) {
      traitModifiers.additionalMultipliers.forEach(bonus => {
        multiplier += bonus;
      });
    }
    
    // ===== APLICAR CAP DE TRAITS (FORM_CAP) =====
    if (traitModifiers.minCap !== undefined) {
      multiplier = Math.max(multiplier, traitModifiers.minCap);
    }
    if (traitModifiers.maxCap !== undefined) {
      multiplier = Math.min(multiplier, traitModifiers.maxCap);
    }
    
    return multiplier;
  }
  
  /**
   * ATUALIZA FORMA BASEADO EM RESULTADO DE PARTIDA
   * Agora com sistema de UPSET para penalizar favoritos e recompensar underdogs
   */
  updateAfterMatch(matchData) {
    const { 
      won, 
      burstCount = 0, 
      method = 'points',
      playerRanking = 50,      // Ranking do jogador (1 = melhor)
      opponentRanking = 50,    // Ranking do oponente
      is3v0 = false,           // Vitória/derrota 3-0 (dominante/humilhante)
    } = matchData;
    
    let formaChange = 0;
    
    // ===== CALCULAR DIFERENÇA DE RANKING E UPSET =====
    const rankDiff = Math.abs(playerRanking - opponentRanking);
    
    // Upset quando diferença >= 15 posições
    const isUpset15 = rankDiff >= 15;
    const isUpset20 = rankDiff >= 20; // Super upset
    
    // Identificar se é favorito ou underdog
    const isFavorite = playerRanking < opponentRanking; // Número menor = melhor ranking
    const isUnderdog = playerRanking > opponentRanking;
    
    // ===== BASE FORMA CHANGE =====
    if (won) {
      // Vitória básica
      formaChange = 3.0;
      
      // Burst finish vale mais
      if (method === 'burst' || burstCount > 0) {
        formaChange += 1.5;
      }
      
      // Over finish também vale mais
      if (method === 'over') {
        formaChange += 1.0;
      }
      
      // Vitória dominante 3-0
      if (is3v0) {
        formaChange += 2.0;
      }
      
      // ===== UPSET BONUS (UNDERDOG VENCE) =====
      if (isUnderdog && isUpset15) {
        const upsetBonus = isUpset20 ? 2.5 : 1.8; // 20+ = 2.5x, 15-19 = 1.8x
        formaChange *= upsetBonus;
        console.log(`  🎯 ${this.playerName} UPSET! Venceu favorito #${opponentRanking} (${upsetBonus}x forma)`);
      }
      
    } else {
      // Derrota básica
      formaChange = -2.5;
      
      // Burst ou over finish é mais doloroso
      if (method === 'burst') {
        formaChange -= 1.5;
      }
      if (method === 'over') {
        formaChange -= 1.0;
      }
      
      // Derrota humilhante 0-3
      if (is3v0) {
        formaChange -= 2.0;
      }
      
      // ===== UPSET PENALTY (FAVORITO PERDE) =====
      if (isFavorite && isUpset15) {
        const upsetPenalty = isUpset20 ? 2.8 : 2.0; // 20+ = 2.8x, 15-19 = 2.0x
        formaChange *= upsetPenalty;
        console.log(`  💔 ${this.playerName} UPSET! Perdeu para #${opponentRanking} (${upsetPenalty}x perda de forma)`);
      }
    }
    
    // ===== APLICAR TRAITS MOMENTUM =====
    try {
      const traitData = getPlayerTraitData(this.playerName);
      const playerTraits = traitData?.traits || [];
      const getTier = (id) => { const t = playerTraits.find(t => t?.id === id); return t ? t.tier : null; };
      const currentFormState = this.getFormaState().name;

      // ── BOLA_DE_NEVE: ganho por vitória aumentado ──
      if (won) {
        const bnt = getTier('BOLA_DE_NEVE');
        if (bnt === 'COM') formaChange += 5;
        else if (bnt === 'RAR') formaChange += 10;
        else if (bnt === 'LEN') formaChange += 15;
        else if (bnt === 'NEG') formaChange *= 0.6;
      }

      // ── RECUPERACAO_RAPIDA: sai de estados ruins mais rápido ──
      if (won && (currentFormState === 'SLUMP' || currentFormState === 'ROCK_BOTTOM')) {
        const rrt = getTier('RECUPERACAO_RAPIDA');
        if (rrt === 'COM') formaChange *= 1.5;
        else if (rrt === 'RAR') formaChange *= 2.0;
        else if (rrt === 'LEN') {
          // Reset Imediato: após 3 derrotas, salta para NEUTRAL
          const recent = this.recentResults.slice(-3);
          if (recent.length === 3 && recent.every(r => !r.won)) {
            this.forma = 40; // NEUTRAL floor
            formaChange = 0;
          } else {
            formaChange *= 2.5;
          }
        }
        else if (rrt === 'NEG' && currentFormState === 'SLUMP') formaChange -= 6; // espiral descendente
      }

      // ── INQUEBRAVEL: após derrota forma nunca cai abaixo de NEUTRAL (40) ──
      if (!won) {
        const iqt = getTier('INQUEBRAVEL');
        if (iqt === 'COM' && (this.forma + formaChange) < 40) {
          formaChange = 40 - this.forma; // ancora em NEUTRAL
        } else if ((iqt === 'RAR' || iqt === 'LEN') && (this.forma + formaChange) < 60) {
          formaChange = 60 - this.forma; // ancora em IN_FORM
        }
      }

      // ── PICO_DE_ADRENALINA NEG: gangorra — derrota enquanto em forma alta ──
      if (!won && this.forma >= 60) {
        const pat = getTier('PICO_DE_ADRENALINA');
        if (pat === 'NEG') formaChange -= 12; // perde extra em cima da derrota normal
      }
    } catch(e) { /* traits momentum silently fail */ }

    // ===== APLICAR MUDANÇA =====
    const oldForma = this.forma;
    this.forma += formaChange;
    this.forma = Math.max(0, Math.min(100, this.forma)); // Clamp 0-100
    
    // ===== REGISTRAR NO HISTÓRICO =====
    this.recentResults.push({
      type: 'match',
      won,
      method,
      formaChange,
      wasUpset: (won && isUnderdog && isUpset15) || (!won && isFavorite && isUpset15),
      upsetMargin: isUpset15 ? rankDiff : 0,
      timestamp: Date.now()
    });
    
    // Manter apenas últimos 5 resultados
    if (this.recentResults.length > 5) {
      this.recentResults.shift();
    }
    
    // Log detalhado
    const state = this.getFormaState();
    const changeSymbol = formaChange > 0 ? '↗️' : formaChange < 0 ? '↘️' : '➡️';
    const upsetTag = ((won && isUnderdog && isUpset15) || (!won && isFavorite && isUpset15)) 
      ? ` 🎯 UPSET (${rankDiff})` 
      : '';
    
    console.log(
      `📊 ${this.playerName}: ${oldForma.toFixed(0)} → ${this.forma.toFixed(0)} (${formaChange > 0 ? '+' : ''}${formaChange.toFixed(1)})${upsetTag} ${changeSymbol} ${state.icon} ${state.name}`
    );
    
    return {
      oldForma,
      newForma: this.forma,
      change: formaChange,
      state,
      wasUpset: (won && isUnderdog && isUpset15) || (!won && isFavorite && isUpset15)
    };
  }
  
  /**
   * ATUALIZA FORMA BASEADO EM RESULTADO DE TORNEIO
   */
  updateForma(result) {
    const { 
      placement, // 1st, 2nd, SF (3rd-4th), QF (5th-8th), R16, R32, DNQ
      tournamentType = 'regional', // major, regional, local, exhibition
      playerRanking = 50, // Ranking do jogador (para expectativa)
      totalPlayers = 32 // Total de participantes
    } = result;
    
    // ===== 1. BASE GAIN/LOSS =====
    let formaChange = this.calculateBaseFormaChange(placement);
    
    // ===== 2. TOURNAMENT TYPE MULTIPLIER =====
    const typeMultiplier = {
      major: 1.5,
      regional: 1.0,
      local: 0.5,
      exhibition: 0.2
    }[tournamentType] || 1.0;
    
    formaChange *= typeMultiplier;
    
    // ===== 3. EXPECTATION vs REALITY =====
    const expectationMultiplier = this.calculateExpectationMultiplier(
      placement, 
      playerRanking, 
      totalPlayers
    );
    formaChange *= expectationMultiplier;
    
    // ===== 4. APLICAR MUDANÇA =====
    const oldForma = this.forma;
    this.forma += formaChange;
    this.forma = Math.max(0, Math.min(100, this.forma)); // Clamp 0-100
    
    // ===== 5. REGISTRAR NO HISTÓRICO =====
    this.recentResults.push({
      placement,
      tournamentType,
      formaChange,
      timestamp: Date.now()
    });
    
    // Manter apenas últimos 5 resultados
    if (this.recentResults.length > 5) {
      this.recentResults.shift();
    }
    
    // Snapshot para histórico (cap em 30 — apenas tendência recente importa para save)
    this.formaHistory.push({
      forma: this.forma,
      change: formaChange,
      placement,
      timestamp: Date.now()
    });
    if (this.formaHistory.length > 30) this.formaHistory.shift();
    
    // Log
    const state = this.getFormaState();
    const changeSymbol = formaChange > 0 ? '↗️' : formaChange < 0 ? '↘️' : '➡️';
    console.log(
      `📊 ${this.playerName}: ${oldForma.toFixed(0)} → ${this.forma.toFixed(0)} (${formaChange > 0 ? '+' : ''}${formaChange.toFixed(1)}) ${changeSymbol} ${state.icon} ${state.name}`
    );
    
    return {
      oldForma,
      newForma: this.forma,
      change: formaChange,
      state
    };
  }
  
  /**
   * CALCULA GANHO/PERDA BASE DE FORMA
   */
  calculateBaseFormaChange(placement) {
    const changes = {
      '1st': 20,      // Campeão
      '2nd': 15,      // Vice
      'SF': 10,       // Semifinal (3rd-4th)
      'QF': 5,        // Quartas (5th-8th)
      'R16': 2,       // Oitavas (9th-16th)
      'R32': -3,      // Round 1 (17th-32nd)
      'DNQ': -5,      // Não classificou
      'WD': -10       // Desistiu/Lesão
    };
    
    return changes[placement] || 0;
  }
  
  /**
   * CALCULA MULTIPLICADOR BASEADO EM EXPECTATIVA vs REALIDADE
   */
  calculateExpectationMultiplier(placement, playerRanking, totalPlayers) {
    // Expectativa baseada em ranking
    let expectedPlacement = 'QF';
    
    if (playerRanking <= 3) {
      expectedPlacement = '1st'; // Top 3 deveria ganhar
    } else if (playerRanking <= 8) {
      expectedPlacement = 'SF'; // Top 8 deveria chegar em semi
    } else if (playerRanking <= 16) {
      expectedPlacement = 'QF'; // Top 16 deveria chegar em quartas
    } else if (playerRanking <= 32) {
      expectedPlacement = 'R16'; // Top 32 deveria passar do R1
    }
    
    // Comparar resultado com expectativa
    const placementValue = {
      '1st': 7,
      '2nd': 6,
      'SF': 5,
      'QF': 4,
      'R16': 3,
      'R32': 2,
      'DNQ': 1,
      'WD': 0
    };
    
    const expectedValue = placementValue[expectedPlacement] || 4;
    const actualValue = placementValue[placement] || 4;
    
    // Se performou melhor que esperado
    if (actualValue > expectedValue) {
      const difference = actualValue - expectedValue;
      return 1.0 + (difference * 0.25); // +25% por tier acima
    }
    
    // Se performou pior que esperado
    if (actualValue < expectedValue) {
      const difference = expectedValue - actualValue;
      return 1.0 + (difference * 0.4); // +40% penalty por tier abaixo (penalties são maiores!)
    }
    
    // Performou conforme esperado
    return 1.0;
  }
  
  /**
   * APLICA DECAY NATURAL (chamado semanalmente ou mensalmente)
   */
  applyDecay() {
    let decayAmount = 0;
    
    // Forma alta decai mais rápido (difícil manter o pico)
    if (this.forma > 70) {
      decayAmount = -2;
    } 
    // Forma média decai lentamente
    else if (this.forma >= 40 && this.forma <= 70) {
      decayAmount = -1;
    }
    // Forma baixa recupera naturalmente (sistema ajuda quem está mal)
    else if (this.forma < 40) {
      decayAmount = 1;
    }

    // ── INERCIAL: reduz ou zera decay ──
    try {
      const traitData = getPlayerTraitData(this.playerName);
      const playerTraits = traitData?.traits || [];
      const getTier = (id) => { const t = playerTraits.find(t => t?.id === id); return t ? t.tier : null; };
      const inert = getTier('INERCIAL');
      if (inert === 'NEG' && decayAmount < 0) {
        decayAmount *= 3.0; // decay 3x mais rápido (memória curta)
      } else if (inert === 'COM' && decayAmount < 0) {
        decayAmount *= 0.5; // metade do decay
      } else if (inert === 'RAR') {
        if (decayAmount < 0) decayAmount = 0; // zero decay
      } else if (inert === 'LEN') {
        decayAmount = 0; // forma só muda por resultados
      }
    } catch(e) {}
    
    const oldForma = this.forma;
    this.forma += decayAmount;
    this.forma = Math.max(30, Math.min(80, this.forma)); // Nunca vai abaixo de 30 ou acima de 80 naturalmente
    
    if (decayAmount !== 0) {
      console.log(`⏱️ ${this.playerName} decay: ${oldForma.toFixed(0)} → ${this.forma.toFixed(0)}`);
    }
  }
  
  /**
   * RETORNA RESUMO DA FORMA ATUAL
   */
  getFormaSummary() {
    const state = this.getFormaState();
    
    return {
      playerId: this.playerId,
      playerName: this.playerName,
      forma: this.forma,
      state: state.name,
      buff: state.buff,
      icon: state.icon,
      color: state.color,
      statsMultiplier: this.getStatsMultiplier(),
      recentResults: this.recentResults.slice(-5),
      trend: this.calculateTrend()
    };
  }
  
  /**
   * PROCESSA TRAITS v2.0 E RETORNA MODIFICADORES
   * Suporta formato: playerTraits = [{ id, tier }]
   * tier: 'NEG' | 'COM' | 'RAR' | 'LEN'
   */
  processTraits(playerTraits = [], battleContext = {}) {
    const modifiers = {
      additionalMultipliers: [],
      minCap: undefined,
      maxCap: undefined
    };
    
    if (!playerTraits || playerTraits.length === 0) return modifiers;
    
    const { 
      selfWins = 0, 
      opponentWins = 0, 
      winsNeeded = 3,
      currentRound = 1,
      maxRounds = 5,
      winStreak = 0,
      lossStreak = 0,
      rivalryMatches = 0,
      tournamentStage = 'R64',
    } = battleContext;

    // Normaliza entrada para sempre ter {id, tier}
    const normalizedTraits = playerTraits.map(t => {
      if (t && typeof t === 'object' && t.id) return t;
      return null;
    }).filter(Boolean);

    const getTier = (id) => {
      const t = normalizedTraits.find(t => t.id === id);
      return t ? t.tier : null;
    };
    const hasPositive = (id) => {
      const tier = getTier(id);
      return tier === 'COM' || tier === 'RAR' || tier === 'LEN';
    };
    const hasNegative = (id) => getTier(id) === 'NEG';

    // ── SANGUE_FRIO (adversário a 1 vitória de fechar) ──
    if (opponentWins === winsNeeded - 1) {
      const tier = getTier('SANGUE_FRIO');
      if (tier === 'NEG') { modifiers.additionalMultipliers.push(-0.15); }
      else if (tier === 'COM') { modifiers.additionalMultipliers.push(0.10); }
      else if (tier === 'RAR') { modifiers.additionalMultipliers.push(0.20); }
      else if (tier === 'LEN') { modifiers.additionalMultipliers.push(0.30); }
    }

    // ── VIRADISTA (0-2 atrás) ──
    if (selfWins === 0 && opponentWins === 2) {
      const tier = getTier('VIRADISTA');
      if (tier === 'NEG') { modifiers.maxCap = 0.85; }
      else if (tier === 'COM') { modifiers.additionalMultipliers.push(0.15); }
      else if (tier === 'RAR') { modifiers.additionalMultipliers.push(0.25); }
      else if (tier === 'LEN') { modifiers.additionalMultipliers.push(0.35); }
    }

    // ── FENIX (lossStreak) ──
    if (lossStreak >= 1) {
      const tier = getTier('FENIX');
      if (tier === 'COM' && lossStreak >= 1) { modifiers.additionalMultipliers.push(0.10); }
      else if (tier === 'RAR' && lossStreak >= 2) { modifiers.additionalMultipliers.push(0.20); }
      else if (tier === 'LEN' && lossStreak >= 2) { modifiers.additionalMultipliers.push(0.30); }
    }

    // ── PRESSAO_ABSOLUTA (placar empatado + round decisivo) ──
    if (selfWins === opponentWins && selfWins === winsNeeded - 1) {
      const tier = getTier('PRESSAO_ABSOLUTA');
      if (tier === 'NEG') { modifiers.additionalMultipliers.push(-0.25); }
      else if (tier === 'COM') { modifiers.additionalMultipliers.push(0.15); }
      else if (tier === 'RAR') { modifiers.additionalMultipliers.push(0.25); }
      else if (tier === 'LEN') { modifiers.additionalMultipliers.push(0.35); }
    }

    // ── ULTRAMARATONISTA (rounds tardios) ──
    {
      const threshold = maxRounds === 5 ? 4 : 3;
      if (currentRound >= threshold) {
        const tier = getTier('ULTRAMARATONISTA');
        if (tier === 'NEG') {
          const penalty = (currentRound - 1) * 0.08;
          modifiers.additionalMultipliers.push(-penalty);
        } else if (tier === 'COM') { modifiers.additionalMultipliers.push(0.15); }
        else if (tier === 'RAR') { modifiers.additionalMultipliers.push(0.20); }
        else if (tier === 'LEN') { modifiers.additionalMultipliers.push(0.25); }
      } else if (getTier('ULTRAMARATONISTA') === 'NEG') {
        // Gas Curto decai mesmo antes do threshold
        const penalty = (currentRound - 1) * 0.08;
        if (penalty > 0) modifiers.additionalMultipliers.push(-penalty);
      }
    }

    // ── RELOGIO_BIOLOGICO (aquecimento cumulativo) ──
    {
      const tier = getTier('RELOGIO_BIOLOGICO');
      if (tier === 'NEG') {
        // Começa em -20% no R1
        modifiers.additionalMultipliers.push(-0.20 + (currentRound - 1) * 0.08);
      } else if (tier === 'COM') {
        const bonus = (currentRound - 1) * 0.08;
        if (bonus > 0) modifiers.additionalMultipliers.push(bonus);
      } else if (tier === 'RAR') {
        if (currentRound >= 2) modifiers.additionalMultipliers.push((currentRound - 1) * 0.15);
      } else if (tier === 'LEN') {
        // R1 normal, R2 +15%, R3 +30%, R4 +45%, R5 +60%
        if (currentRound >= 2) modifiers.additionalMultipliers.push((currentRound - 1) * 0.15);
      }
    }

    // ── AVALANCHE (winStreak) ──
    if (winStreak >= 3) {
      const tier = getTier('AVALANCHE');
      if (tier === 'NEG') { modifiers.maxCap = 1.10; }
      else if (tier === 'COM') { modifiers.additionalMultipliers.push(0.15); }
      else if (tier === 'RAR') { modifiers.additionalMultipliers.push(0.20 + (winStreak - 3) * 0.05); }
      else if (tier === 'LEN') { modifiers.additionalMultipliers.push(0.25 + (winStreak - 3) * 0.05); }
    }

    // ── MEMORIA_FOTOGRAFICA (rivalidade) ──
    if (rivalryMatches >= 3) {
      const tier = getTier('MEMORIA_FOTOGRAFICA');
      if (tier === 'COM') { modifiers.additionalMultipliers.push(0.20); }
      else if (tier === 'RAR') { modifiers.additionalMultipliers.push(0.25); }
      else if (tier === 'LEN') { modifiers.additionalMultipliers.push(0.30); }
    }

    // ── RIVAL_ETERNO (total confrontos >= 5) ──
    if (rivalryMatches >= 5) {
      const tier = getTier('RIVAL_ETERNO');
      if (tier === 'NEG') { modifiers.additionalMultipliers.push(-0.10); }
      else if (tier === 'COM') { modifiers.additionalMultipliers.push(0.10); }
      else if (tier === 'RAR') { modifiers.additionalMultipliers.push(0.20); }
      else if (tier === 'LEN') { modifiers.additionalMultipliers.push(0.30); }
    }

    // ── PICO_DE_ADRENALINA (forma alta) ──
    {
      const tier = getTier('PICO_DE_ADRENALINA');
      if (tier === 'COM' && this.forma >= 90) { modifiers.additionalMultipliers.push(0.03); }
      else if (tier === 'RAR' && this.forma >= 90) { modifiers.additionalMultipliers.push(0.05); }
      else if (tier === 'LEN' && this.forma >= 95) { modifiers.additionalMultipliers.push(0.20); }
      // NEG: efeito Gangorra é tratado em updateAfterMatch
    }

    // ── BASE_SOLIDA (piso do multiplier) ──
    {
      const tier = getTier('BASE_SOLIDA');
      if (tier === 'COM') { modifiers.minCap = 0.85; }
      else if (tier === 'RAR') { modifiers.minCap = 0.90; }
      else if (tier === 'LEN') { modifiers.minCap = 0.95; }
    }

    // ── LEAO_ENCURRALADO (forma baixa) ──
    {
      const formaState = this.getFormaState().name;
      if (formaState === 'SLUMP' || formaState === 'ROCK_BOTTOM') {
        const tier = getTier('LEAO_ENCURRALADO');
        if (tier === 'NEG') { modifiers.maxCap = 0.75; }
        else if (tier === 'COM') { modifiers.minCap = 0.85; }
        else if (tier === 'RAR') { modifiers.additionalMultipliers.push(0.15); modifiers.minCap = 0.85; }
        else if (tier === 'LEN') { modifiers.additionalMultipliers.push(0.35); modifiers.minCap = 0.85; }
      }
    }

    // ── VOLATILIDADE_CALCULADA (forma extrema) ──
    {
      const formaState = this.getFormaState().name;
      const tier = getTier('VOLATILIDADE_CALCULADA');
      if (tier === 'COM') {
        if (formaState === 'ON_FIRE') modifiers.additionalMultipliers.push(0.10);
        if (formaState === 'ROCK_BOTTOM') modifiers.additionalMultipliers.push(0.05);
      } else if (tier === 'RAR') {
        if (formaState === 'ON_FIRE') modifiers.additionalMultipliers.push(0.15);
        if (formaState === 'SLUMP') modifiers.minCap = 0.80;
        if (formaState === 'ROCK_BOTTOM') modifiers.minCap = 0.80;
      } else if (tier === 'LEN') {
        if (formaState === 'ON_FIRE') modifiers.additionalMultipliers.push(0.40);
        modifiers.minCap = 1.0; // mínimo garantido em NEUTRAL
      }
    }

    // ── MAQUINA (reduz variância — via minCap no lançamento) ──
    {
      const tier = getTier('MAQUINA');
      if (tier === 'COM') { modifiers.varianceReduction = 0.15; }
      else if (tier === 'RAR') { modifiers.varianceReduction = 0.25; }
      else if (tier === 'LEN') { modifiers.varianceReduction = 0.50; }
    }

    // ── INQUEBRAVEL (garante mínimo após derrota) ──
    // Lógica principal tratada em updateAfterMatch / FormManager
    // Aqui apenas garante cap se in battle
    {
      const tier = getTier('INQUEBRAVEL');
      if (tier === 'RAR' || tier === 'LEN') {
        // Garante mínimo IN_FORM (60 de forma)
        if (this.forma < 60) {
          modifiers.minCap = 1.08; // buff mínimo de IN_FORM
        }
      }
    }

    return modifiers;
  }
  
  /**
   * CALCULA TENDÊNCIA (subindo, descendo ou estável)
   */
  calculateTrend() {
    if (this.recentResults.length < 3) return 'stable';
    
    const recent3 = this.recentResults.slice(-3);
    const totalChange = recent3.reduce((sum, r) => sum + r.formaChange, 0);
    
    if (totalChange > 15) return 'rising';
    if (totalChange < -15) return 'falling';
    return 'stable';
  }
  
  // ===== SERIALIZAÇÃO =====
  
  toJSON() {
    return {
      playerId: this.playerId,
      playerName: this.playerName,
      forma: this.forma,
      formaHistory: this.formaHistory,
      recentResults: this.recentResults
    };
  }
  
  static fromJSON(data) {
    const tracker = new FormTracker(data.playerId, data.playerName, data.forma);
    tracker.formaHistory = data.formaHistory || [];
    tracker.recentResults = data.recentResults || [];
    return tracker;
  }
}

/**
 * FormManager - Gerencia forma de todos os bladers
 */
export class FormManager {
  constructor(teams) {
    this.formTrackers = new Map();
    
    // Criar tracker para cada team (todos começam com forma 50 - neutral)
    teams.forEach((team, index) => {
      const tracker = new FormTracker(index, team.name, 50);
      this.formTrackers.set(index, tracker);
    });
    
    console.log(`✅ FormManager inicializado com ${this.formTrackers.size} bladers (todos em NEUTRAL)`);
  }
  
  /**
   * Inicializa um novo jogador no FormManager (usado ao promover Rising Stars)
   */
  initializePlayer(playerId, player) {
    if (!this.formTrackers.has(playerId)) {
      const tracker = new FormTracker(playerId, player.name, 50);
      this.formTrackers.set(playerId, tracker);
      console.log(`✅ FormManager: ${player.name} (ID: ${playerId}) inicializado`);
    }
  }

  /**
   * Obtém tracker de um jogador
   */
  getTracker(playerId) {
    return this.formTrackers.get(playerId);
  }
  
  /**
   * Obtém multiplicador de stats de um jogador
   */
  getStatsMultiplier(playerId) {
    const tracker = this.getTracker(playerId);
    return tracker ? tracker.getStatsMultiplier() : 1.0;
  }
  
  /**
   * Obtém multiplicador de stats COM TRAITS aplicados
   */
  getStatsMultiplierWithTraits(playerId, playerTraits = [], battleContext = {}) {
    const tracker = this.getTracker(playerId);
    if (!tracker) return 1.0;
    
    // Processar traits e obter modificadores
    const traitModifiers = tracker.processTraits(playerTraits, battleContext);
    
    // Aplicar modificadores ao multiplicador base
    return tracker.getStatsMultiplier(traitModifiers);
  }
  
  /**
   * Obtém resumo da forma de um jogador
   */
  getFormaSummary(playerId) {
    const tracker = this.getTracker(playerId);
    return tracker ? tracker.getFormaSummary() : null;
  }
  
  /**
   * Atualiza forma após partida
   */
  updateAfterMatch(playerId, matchData) {
    const tracker = this.getTracker(playerId);
    if (tracker) {
      return tracker.updateAfterMatch(matchData);
    }
    return null;
  }
  
  /**
   * Atualiza forma após torneio
   */
  updateAfterTournament(playerId, result) {
    const tracker = this.getTracker(playerId);
    if (tracker) {
      return tracker.updateForma(result);
    }
    return null;
  }
  
  /**
   * Aplica decay em todos os jogadores (chamar semanalmente)
   */
  applyWeeklyDecay() {
    console.log('⏱️ Aplicando decay semanal de forma...');
    this.formTrackers.forEach(tracker => {
      tracker.applyDecay();
    });
  }
  
  /**
   * Obtém rankings por forma
   */
  getFormaRankings() {
    const rankings = [];
    
    this.formTrackers.forEach((tracker, id) => {
      const summary = tracker.getFormaSummary();
      rankings.push(summary);
    });
    
    // Ordenar por forma (maior primeiro)
    rankings.sort((a, b) => b.forma - a.forma);
    
    return rankings;
  }
  
  /**
   * Obtém jogadores em boa/má forma
   */
  getPlayersByFormaState() {
    const byState = {
      ON_FIRE: [],
      HOT_STREAK: [],
      IN_FORM: [],
      NEUTRAL: [],
      STRUGGLING: [],
      SLUMP: [],
      ROCK_BOTTOM: []
    };
    
    this.formTrackers.forEach(tracker => {
      const summary = tracker.getFormaSummary();
      byState[summary.state].push(summary);
    });
    
    return byState;
  }
  
  // ===== SERIALIZAÇÃO =====
  
  toJSON() {
    return {
      formTrackers: Array.from(this.formTrackers.entries()).map(([id, tracker]) => 
        [id, tracker.toJSON()]
      )
    };
  }
  
  static fromJSON(data, teams) {
    const manager = new FormManager(teams);
    
    if (data.formTrackers) {
      data.formTrackers.forEach(([id, trackerData]) => {
        manager.formTrackers.set(id, FormTracker.fromJSON(trackerData));
      });
    }
    
    return manager;
  }
}
