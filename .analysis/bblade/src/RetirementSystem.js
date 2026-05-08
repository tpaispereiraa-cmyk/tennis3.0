// ============================================
// RETIREMENTSYSTEM.JS - Sistema de Aposentadoria Completo
// ============================================

import { releasePlayerImages } from './NewgenImageBank.js';

export class RetirementSystem {
  constructor(universeManager) {
    this.universe = universeManager;
    
    // Armazenamento
    this.retiredPlayers = new Map(); // playerId -> retirement data
    this.hallOfFame = []; // Array de lendas aposentadas
    this.retirementHistory = []; // Log de todas aposentadorias
    
    console.log('✅ Retirement System criado!');
    
    // Fix 2: Inicializar careerPeak para jogadores originais que não têm
    this._initializeCareerPeaks();
  }
  
  _initializeCareerPeaks() {
    const allPlayers = this.universe.TEAMS || this.universe.players || [];
    allPlayers.forEach(player => {
      if (!player.careerPeak) {
        const currentAvg = Object.values(player.attributes || {}).reduce((a, b) => a + b, 0) / 9;
        player.careerPeak = {
          year: this.universe.currentYear,
          avgStats: currentAvg,
          ranking: 999,
          elo: player.elo || 1000
        };
      }
    });
    console.log(`✅ careerPeak inicializado para ${allPlayers.length} jogadores`);
  }

  // ============================================
  // CÁLCULO DO RETIREMENT RISK SCORE (RRS)
  // ============================================
  
  calculateRRS(player, playerId) {
    const ageScore = this.calculateAgeScore(player, playerId);
    const declineScore = this.calculateDeclineScore(player);
    const performanceScore = this.calculatePerformanceScore(player, playerId);
    const burnoutScore = this.calculateBurnoutScore(player, playerId);

    // Fórmula: IdadeScore×0.40 + DeclínioScore×0.30 + PerformanceScore×0.20 + BurnoutScore×0.10
    const rrs = (ageScore * 0.40) + (declineScore * 0.30) + (performanceScore * 0.20) + (burnoutScore * 0.10);

    return Math.round(rrs);
  }

  // ── 1️⃣ IDADE SCORE (40% do peso) ──
  calculateAgeScore(player, playerId) {
    const age = player.age || 25;

    let score;
    if (age <= 28) score = 0;
    else if (age <= 31) score = 10;
    else if (age <= 33) score = 22;
    else if (age <= 35) score = 62;
    else if (age <= 37) score = 80;
    else if (age <= 39) score = 91;
    else if (age <= 41) score = 96;
    else score = 99;

    // Proteção de Elite: top-5 com título nos últimos 12 meses recebe -25
    // Permite que dominantes resistam até 41 sem aposentar cedo
    if (playerId !== undefined && age >= 35) {
      const ranking = this.universe.getCurrentRanking(playerId);
      const titlesLast12 = this.universe.getTitlesInLastMonths(playerId, 12);
      if (ranking <= 5 && titlesLast12 > 0) {
        score = Math.max(0, score - 15);
      }
    }

    return score;
  }

  // ── 2️⃣ DECLÍNIO SCORE (30% do peso) ──
  calculateDeclineScore(player) {
    // Calcular média de stats atual
    const currentAvg = Object.values(player.attributes || {}).reduce((a, b) => a + b, 0) / 9;

    // Buscar pico histórico
    const peakAvg = player.careerPeak?.avgStats || currentAvg;

    // Calcular % de declínio
    const declinePercent = peakAvg > 0 ? ((peakAvg - currentAvg) / peakAvg) * 100 : 0;

    let score = 0;
    if (declinePercent <= 5) score = 0;
    else if (declinePercent <= 10) score = 10;
    else if (declinePercent <= 15) score = 25;
    else if (declinePercent <= 20) score = 40;
    else if (declinePercent <= 30) score = 60;
    else score = 80; // 31%+

    // Fator Multiplicador: Se idade ≥ 35 E declínio ≥ 15%
    if ((player.age || 25) >= 35 && declinePercent >= 15) {
      score *= 1.5;
    }

    return Math.round(score);
  }

  // ── 3️⃣ PERFORMANCE SCORE (20% do peso) ──
  calculatePerformanceScore(player, playerId) {
    const currentRanking = this.universe.getCurrentRanking(playerId);
    const titlesLast12Months = this.universe.getTitlesInLastMonths(playerId, 12);
    const titlesLast24Months = this.universe.getTitlesInLastMonths(playerId, 24);
    const rankingDrop = this.universe.getRankingDrop(playerId, 12);

    let score = 0;

    // Base score por ranking
    if (currentRanking <= 8 && titlesLast12Months > 0) score = 0; // Dominando
    else if (currentRanking <= 16) score = 5; // Consistente
    else if (currentRanking <= 32) score = 10; // Relevante
    else if (currentRanking <= 48) score = 25; // Decadência
    else if (currentRanking <= 64) score = 40; // Irrelevante
    else score = 40;

    // SEM títulos há 2+ anos
    if (titlesLast24Months === 0 && currentRanking >= 49) {
      score += 20;
    }

    // Bônus/Penalidades
    if (rankingDrop >= 20) score += 20; // Caiu muito
    if (titlesLast12Months > 0 && this.hasMajorTitleLast6Months(playerId)) score -= 15; // Ganhou major recentemente
    
    return Math.max(0, Math.round(score));
  }

  // ── 4️⃣ BURNOUT SCORE (10% do peso) ──
  calculateBurnoutScore(player, playerId) {
    // Fix: usa idade como proxy de carreira (debut ~18 anos) para evitar o bug do debutYear 2024 fixo
    const yearsActive = Math.max((player.age || 25) - 18, 0);
    const totalRegressions = player.development?.regressions || 0;
    const currentForm = this.universe.formManager?.getFormaSummary(playerId)?.currentForm || 50;
    const yearsWithoutTitle = this.universe.getYearsWithoutTitle(playerId);

    let score = 0;

    // Anos de carreira
    if (yearsActive >= 15) score += 35;
    else if (yearsActive >= 12) score += 20;

    // Regressões acumuladas
    if (totalRegressions >= 5) score += 15;

    // Forma mental baixa prolongada
    if (currentForm < 30) score += 25;

    // Sem títulos há muito tempo
    if (yearsWithoutTitle >= 3) score += 20;

    // Fator Multiplicador: Se idade ≥ 36 E burnout ≥ 40
    if ((player.age || 25) >= 36 && score >= 40) {
      score *= 1.3;
    }

    return Math.round(score);
  }

  // ============================================
  // CHECAGEM ANUAL DE APOSENTADORIAS
  // ============================================

  checkAnnualRetirements() {
    console.log('🏁 Verificando aposentadorias anuais...');

    // Suporte a this.universe.TEAMS (propriedade exposta) ou this.universe.players (fallback)
    const allPlayers = this.universe.TEAMS || this.universe.players || [];
    const eligibleRetirements = [];

    // Calcular RRS para cada jogador
    allPlayers.forEach((player, index) => {
      if (player.status !== 'PROFESSIONAL') return;

      const rrs = this.calculateRRS(player, index);
      const chance = this.getRetirementChance(rrs);

      // Roll para aposentadoria
      if (Math.random() < chance) {
        eligibleRetirements.push({
          player,
          playerId: index,
          rrs,
          chance
        });
      }
    });

    // Aplicar limitadores
    const finalRetirements = this.applyLimiters(eligibleRetirements);

    // Processar aposentadorias
    const processed = [];
    finalRetirements.forEach(retirement => {
      const result = this.processRetirement(retirement.player, retirement.playerId);
      if (result) {
        processed.push(result);
      }
    });

    console.log(`✅ ${processed.length} aposentadoria(s) processada(s)`);
    return processed;
  }

  // ── Converter RRS em chance de aposentadoria ──
  // Thresholds ajustados para que medianos aposentem entre 35-39 (~71% acumulado)
  // e dominantes resistam até 41 com apenas 5%/ano
  getRetirementChance(rrs) {
    if (rrs >= 88) return 0.72; // 72% chance - colapso total
    if (rrs >= 65) return 0.45; // 45% chance - declínio forte (média ~38-39 anos)
    if (rrs >= 42) return 0.22; // 22% chance - declínio moderado (~36-37 anos)
    if (rrs >= 22) return 0.07; // 7%  chance - início do declínio (~35 anos)
    return 0; // Sem risco
  }

  // ── Aplicar limitadores (max 4, proteções, etc) ──
  applyLimiters(eligibleRetirements) {
    // Sem limite fixo de aposentadorias — todas as elegíveis são processadas
    let filtered = eligibleRetirements;

    // Proteção Top 8 (reduzir RRS em -20)
    filtered = filtered.filter(ret => {
      const ranking = this.universe.getCurrentRanking(ret.playerId);
      if (ranking <= 8) {
        // Recalcular com bônus de -20
        const adjustedRRS = ret.rrs - 20;
        const adjustedChance = this.getRetirementChance(adjustedRRS);
        
        // Re-roll com chance ajustada
        return Math.random() < adjustedChance;
      }
      return true;
    });

    // Proteção Campeão do Kings Court (imunidade por 1 ano)
    const kingsCourtChampion = this.universe.getKingsCourtChampion();
    filtered = filtered.filter(ret => ret.playerId !== kingsCourtChampion);

    return filtered;
  }

  // ============================================
  // PROCESSAR APOSENTADORIA
  // ============================================

  processRetirement(player, playerId) {
    console.log(`🏁 Processando aposentadoria de ${player.name}...`);

    // Compilar resumo de carreira PRIMEIRO (necessário para determinar tipo correto)
    const careerSummary = this.compileCareerSummary(player, playerId);

    // Determinar tipo de aposentadoria (passa careerSummary para leitura correta de títulos)
    const type = this.determineRetirementType(player, playerId, careerSummary);

    // Marcar como aposentado
    player.retirement = {
      isRetired: true,
      retirementYear: this.universe.currentYear,
      retirementReason: type,
      farewellTourCompleted: false,
      careerSummary
    };

    player.status = 'RETIRED';

    // 🖼️ Liberar imagem do banco para reutilização futura
    releasePlayerImages(player);

    // ⚔️ Congelar rivalidades do jogador
    if (this.universe.rivalrySystem) {
      this.universe.rivalrySystem.onRetirement(playerId);
    }

    // Salvar em retiredPlayers
    this.retiredPlayers.set(playerId, {
      player: { ...player },
      type,
      careerSummary,
      retirementDate: {
        year: this.universe.currentYear,
        month: 12
      }
    });

    // Se for LEGENDARY, adicionar ao Hall of Fame
    if (type === 'LEGENDARY') {
      this.hallOfFame.push({
        player: { ...player },
        careerSummary,
        inductionYear: this.universe.currentYear
      });
      console.log(`🏛️ ${player.name} adicionado ao Hall of Fame!`);
    }

    // Adicionar ao histórico
    this.retirementHistory.push({
      playerId,
      playerName: player.name,
      type,
      year: this.universe.currentYear,
      careerSummary
    });

    console.log(`✅ ${player.name} aposentado (${type})`);

    // Coletar badges conquistados até a aposentadoria
    const badges = this.universe.achievementEngine
      ? this.universe.achievementEngine.getPlayerAchievements(playerId)
      : [];

    return {
      player,
      playerId,
      type,
      careerSummary,
      badges,
    };
  }

  // ── Determinar tipo de aposentadoria (5 tipos) ──
  // careerSummary é passado para evitar ler player.retirement que ainda não foi setado
  determineRetirementType(player, playerId, careerSummary = null) {
    const age          = player.age || 25;
    const rrs          = this.calculateRRS(player, playerId);
    const declineScore = this.calculateDeclineScore(player);
    const burnoutScore = this.calculateBurnoutScore(player, playerId);

    // Usa careerSummary compilado (passado) ou busca do histórico diretamente
    const history      = this.universe.playerHistories?.get(playerId) || {};
    const totalTitles  = careerSummary?.totalTitles ?? history.titles?.total ?? 0;
    const peakRanking  = player.careerPeak?.ranking || 99;

    // 5️⃣ APOSENTADORIA LENDÁRIA
    // Critério: 38+ anos, pico top-10, 5+ títulos, ou 3+ títulos se pico top-3
    const legendaryBase = (age >= 38 && peakRanking <= 10 && totalTitles >= 5)
                       || (age >= 36 && peakRanking <= 3  && totalTitles >= 3);
    if (legendaryBase) {
      const chance = totalTitles >= 10 ? 0.70 : totalTitles >= 7 ? 0.50 : 0.30;
      if (Math.random() < chance) return 'LEGENDARY';
    }

    // 3️⃣ APOSENTADORIA FORÇADA POR LESÃO
    // Critério: 3+ regressões E 30+ anos (mais comum que antes)
    const recentRegressions = player.development?.regressions || 0;
    if (recentRegressions >= 3 && age >= 30) {
      const injuryChance = recentRegressions >= 5 ? 0.35 : 0.15;
      if (Math.random() < injuryChance) return 'INJURY';
    }

    // 4️⃣ APOSENTADORIA PREMATURA (burnout jovem)
    // Critério: 26–33 anos, burnout >= 50 (mais acessível)
    if (age >= 26 && age <= 33 && burnoutScore >= 50) {
      const prematureChance = burnoutScore >= 70 ? 0.20 : 0.10;
      if (Math.random() < prematureChance) return 'PREMATURE';
    }

    // 2️⃣ APOSENTADORIA POR DECLÍNIO CRÍTICO
    // Critério: declínio >= 40 (antes era 60) E rrs >= 50
    if (declineScore >= 40 && rrs >= 50) {
      const declineChance = declineScore >= 70 ? 0.50 : declineScore >= 55 ? 0.35 : 0.20;
      if (Math.random() < declineChance) return 'DECLINE';
    }

    // 1️⃣ APOSENTADORIA NATURAL (default)
    return 'NATURAL';
  }

  // ── Compilar resumo de carreira ──
  compileCareerSummary(player, playerId) {
    const history = this.universe.playerHistories?.get(playerId) || {};
    const yearsActive = (this.universe.currentYear - (player.debutYear || this.universe.currentYear));

    return {
      yearsActive,
      totalTitles: history.titles?.total || 0,
      peakRanking: player.careerPeak?.ranking || 99,
      peakElo: player.careerPeak?.elo || 0,
      totalMatches: history.totalMatches || 0,
      totalWins: history.wins || 0,
      totalLosses: history.losses || 0
    };
  }

  // promoteRisingStars removido — lógica centralizada em UniverseManager.promoteRisingStars()

  // ============================================
  // HELPERS
  // ============================================

  hasMajorTitleLast6Months(playerId) {
    const titles = this.universe.getTitlesInLastMonths(playerId, 6);
    // Verificar se algum é major (Grand Slam ou Kings Court)
    // Por simplicidade, retornar true se tiver qualquer título
    return titles > 0;
  }

  // Obter estatísticas de aposentadorias
  getRetirementStats() {
    return {
      totalRetirements: this.retiredPlayers.size,
      hallOfFameSize: this.hallOfFame.length,
      retirementsByType: this.retirementHistory.reduce((acc, ret) => {
        acc[ret.type] = (acc[ret.type] || 0) + 1;
        return acc;
      }, {})
    };
  }
}
