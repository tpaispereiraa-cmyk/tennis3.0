// ============================================
// DEVELOPMENTCONSTANTS.JS - Sistema de Desenvolvimento V2.0
// ============================================

// ==========================================
// CATEGORIAS DE POTENCIAL
// INTERNO APENAS — nunca exibido diretamente na UI
// A UI exibe Perspectivas (ScoutSystem.js), não categorias
// ==========================================
export const POTENTIAL_CATEGORIES = {
  GERACIONAL: {
    id: 'GERACIONAL',
    targetRange: [13, 15],
    totalPoints: [115, 120],
    color: '#ffd700',
    icon: '👑'
  },
  LENDA: {
    id: 'LENDA',
    targetRange: [12, 14.5],
    totalPoints: [100, 110],
    color: '#ff6b35',
    icon: '⭐'
  },
  ELITE: {
    id: 'ELITE',
    targetRange: [11, 14],
    totalPoints: [85, 95],
    color: '#6a4c93',
    icon: '💎'
  },
  CAMPEAO: {
    id: 'CAMPEAO',
    targetRange: [9, 13],
    totalPoints: [65, 80],
    color: '#4a90e2',
    icon: '🏆'
  },
  COMUM: {
    id: 'COMUM',
    targetRange: [7, 10],
    totalPoints: [40, 55],
    color: '#95a5a6',
    icon: '⚙️'
  },
  ABAIXO_DA_MEDIA: {
    id: 'ABAIXO_DA_MEDIA',
    targetRange: [3, 7],
    totalPoints: [15, 30],
    color: '#7f8c8d',
    icon: '📉'
  }
};

// ==========================================
// GROWTHRATES CORRIGIDOS POR ARQUÉTIPO
// Escala: pontos de atributo POR ANO (era 0.1 = 26x menor)
// STEADY = ~2.5pts/ano em boa forma; EARLY_BLOOMER = ~3.5pts/ano
// ==========================================
export const ARCHETYPE_GROWTH_RATES = {
  PRODIGY:      { growthRate: 4.5,  declineRate: 5.64 },
  EARLY_BLOOMER:{ growthRate: 3.2,  declineRate: 3.55 },
  STEADY:       { growthRate: 2.5,  declineRate: 1.75 },
  DIAMOND:      { growthRate: 2.0,  declineRate: 1.74 },
  VOLATILE:     { growthRate: 3.5,  declineRate: 4.20 },
  LATE_BLOOMER: { growthRate: 1.8,  declineRate: 0.87 },
};

// ==========================================
// ALCUNHAS — mantidas para compatibilidade de save
// A exibição principal agora usa ScoutSystem.generateScoutPerspective()
// ==========================================
export const ALCUNHAS = {
  GOLDEN_BOY: {
    id: 'GOLDEN_BOY',
    name: 'Golden Boy',
    minCategory: 'LENDA',
    minRevealPercent: 0.70,
    minAvgStat: 10,
  },
  PRODIGIO: {
    id: 'PRODIGIO',
    name: 'Prodígio',
    minCategory: 'ELITE',
    minRevealPercent: 0.65,
    minAvgStat: 8,
  },
  PROMESSA: {
    id: 'PROMESSA',
    name: 'Promessa',
    minCategory: 'CAMPEAO',
    minRevealPercent: 0.60,
    minAvgStat: 7,
  },
  TALENTO_BRUTO: {
    id: 'TALENTO_BRUTO',
    name: 'Talento Bruto',
    minCategory: 'ELITE',
    maxRevealPercent: 0.50,
    maxAvgStat: 7,
  },
  LATE_BLOOMER: {
    id: 'LATE_BLOOMER',
    name: 'Late Bloomer',
    maxRevealPercent: 0.45,
    maxAvgStat: 6,
  },
  COMUM: {
    id: 'COMUM',
    name: 'Jogador Comum',
    category: 'COMUM',
  }
};

// ==========================================
// PRIORIDADES POR MENTALIDADE
// ==========================================
export const MENTALITY_STAT_PRIORITIES = {
  ALL_ROUNDER: {
    primary: ['attack', 'defense', 'stamina', 'speed'],
    secondary: ['technique', 'intelligence', 'adaptability'],
    tertiary: ['launchPower', 'clutch'],
    avoid: [],
    weights: { primary: 0.50, secondary: 0.35, tertiary: 0.15 }
  },
  
  GLASS_CANNON: {
    primary: ['attack', 'speed', 'launchPower'],
    secondary: ['technique', 'clutch'],
    tertiary: ['stamina', 'intelligence'],
    avoid: ['defense', 'adaptability'],
    weights: { primary: 0.70, secondary: 0.20, tertiary: 0.10 }
  },
  
  IRON_FORTRESS: {
    primary: ['defense', 'stamina', 'intelligence'],
    secondary: ['adaptability', 'technique'],
    tertiary: ['clutch', 'attack'],
    avoid: ['speed', 'launchPower'],
    weights: { primary: 0.65, secondary: 0.25, tertiary: 0.10 }
  },
  
  ETERNAL_SPINNER: {
    primary: ['stamina', 'technique', 'intelligence'],
    secondary: ['defense', 'adaptability'],
    tertiary: ['clutch', 'speed'],
    avoid: ['attack', 'launchPower'],
    weights: { primary: 0.60, secondary: 0.30, tertiary: 0.10 }
  },
  
  CALCULATED_CHAOS: {
    primary: ['intelligence', 'adaptability', 'technique'],
    secondary: ['attack', 'clutch'],
    tertiary: ['speed', 'stamina'],
    avoid: ['defense'],
    weights: { primary: 0.55, secondary: 0.30, tertiary: 0.15 }
  },
  
  HIGH_RISK_GAMBLER: {
    primary: ['attack', 'launchPower', 'clutch'],
    secondary: ['speed'],
    tertiary: ['technique', 'intelligence'],
    avoid: ['defense', 'stamina', 'adaptability'],
    weights: { primary: 0.75, secondary: 0.15, tertiary: 0.10 }
  },
  
  MOMENTUM_MASTER: {
    primary: ['clutch', 'adaptability', 'intelligence'],
    secondary: ['speed', 'technique', 'attack'],
    tertiary: ['stamina', 'defense'],
    avoid: ['launchPower'],
    weights: { primary: 0.60, secondary: 0.30, tertiary: 0.10 }
  },
  
  SYNERGY_SEEKER: {
    primary: ['technique', 'intelligence', 'adaptability'],
    secondary: ['defense', 'stamina', 'clutch'],
    tertiary: ['attack', 'speed'],
    avoid: ['launchPower'],
    weights: { primary: 0.55, secondary: 0.30, tertiary: 0.15 }
  },
  
  ADAPTIVE_TACTICIAN: {
    primary: ['intelligence', 'adaptability', 'technique'],
    secondary: ['clutch', 'defense'],
    tertiary: ['attack', 'stamina', 'speed'],
    avoid: [],
    weights: { primary: 0.55, secondary: 0.30, tertiary: 0.15 }
  },
  
  PERFECTIONIST: {
    primary: ['technique', 'launchPower', 'intelligence'],
    secondary: ['attack', 'speed', 'clutch'],
    tertiary: ['defense', 'stamina'],
    avoid: ['adaptability'],
    weights: { primary: 0.60, secondary: 0.30, tertiary: 0.10 }
  },
  
  CHAOS_AGENT: {
    primary: ['attack', 'speed', 'adaptability'],
    secondary: ['launchPower', 'clutch'],
    tertiary: ['technique', 'intelligence'],
    avoid: ['defense', 'stamina'],
    weights: { primary: 0.65, secondary: 0.25, tertiary: 0.10 }
  },
  
  MOMENTUM_THIEF: {
    primary: ['clutch', 'intelligence', 'adaptability'],
    secondary: ['technique', 'defense'],
    tertiary: ['attack', 'stamina', 'speed'],
    avoid: ['launchPower'],
    weights: { primary: 0.60, secondary: 0.30, tertiary: 0.10 }
  }
};

// ==========================================
// CONSTANTES DO SISTEMA
// ==========================================
export const DEV_CONSTANTS = {
  MAX_STAT_VALUE: 20,  // v2.0 — cap elevado para forçar especialização real em todos os níveis
  MIN_STAT_VALUE: 3,
  REVEAL_PERCENT_MIN: 0.40,
  REVEAL_PERCENT_MAX: 0.80,
  BREAKTHROUGH_BASE_CHANCE: 0.05,
  REGRESSION_BASE_CHANCE: 0.08
};

// ==========================================
// HELPER: Determinar Categoria por Average
// ==========================================
export function determineCategoryByAverage(avgTarget) {
  if (avgTarget >= 14) return 'GERACIONAL';
  if (avgTarget >= 13) return 'LENDA';
  if (avgTarget >= 11.5) return 'ELITE';
  if (avgTarget >= 10) return 'CAMPEAO';
  if (avgTarget >= 8) return 'COMUM';
  return 'ABAIXO_DA_MEDIA';
}

// ==========================================
// HELPER: Calcular Total Points por Categoria
// ==========================================
export function calculateTotalPoints(category, variation = 0) {
  const cat = POTENTIAL_CATEGORIES[category];
  if (!cat) return 70;
  
  const [min, max] = cat.totalPoints;
  const base = Math.floor((min + max) / 2);
  return base + variation;
}

// ==========================================
// HELPER: Gerar Atributos Iniciais
// ==========================================
export function generateInitialAttributes(category, revealPercent) {
  const cat = POTENTIAL_CATEGORIES[category];
  if (!cat) return null;
  
  const [minAvg, maxAvg] = cat.targetRange;
  const targetAvg = (minAvg + maxAvg) / 2;
  const targetTotal = targetAvg * 9;
  
  const currentTotal = Math.round(targetTotal * revealPercent);
  
  // Distribuir pontos com variação
  const baseValue = Math.floor(currentTotal / 9);
  const remainder = currentTotal - (baseValue * 9);
  
  const attributes = {
    attack: baseValue,
    defense: baseValue,
    stamina: baseValue,
    speed: baseValue,
    technique: baseValue,
    launchPower: baseValue,
    intelligence: baseValue,
    adaptability: baseValue,
    clutch: baseValue
  };
  
  // Distribuir remainder aleatoriamente
  const stats = Object.keys(attributes);
  for (let i = 0; i < remainder; i++) {
    const stat = stats[Math.floor(Math.random() * stats.length)];
    attributes[stat]++;
  }
  
  return attributes;
}

// ==========================================
// HELPER: Determinar Alcunha (Nickname/Title)
// ==========================================
export function determineAlcunha(playerData, attributes) {
  const { category, revealPercent } = playerData;
  
  // Calcular média dos atributos
  const statValues = Object.values(attributes);
  const avgStat = statValues.reduce((sum, val) => sum + val, 0) / statValues.length;
  
  // Verificar cada alcunha em ordem de prestígio
  const alcunhaOrder = [
    'GOLDEN_BOY',
    'PRODIGIO',
    'TALENTO_BRUTO',
    'PROMESSA',
    'LATE_BLOOMER',
    'COMUM'
  ];
  
  for (const alcunhaId of alcunhaOrder) {
    const alcunha = ALCUNHAS[alcunhaId];
    
    // Se tem categoria específica, deve ser exata
    if (alcunha.category && alcunha.category !== category) {
      continue;
    }
    
    // Verificar categoria mínima
    if (alcunha.minCategory) {
      const categoryRanks = ['ABAIXO_DA_MEDIA', 'COMUM', 'CAMPEAO', 'ELITE', 'LENDA', 'GERACIONAL'];
      const playerRank = categoryRanks.indexOf(category);
      const minRank = categoryRanks.indexOf(alcunha.minCategory);
      if (playerRank < minRank) continue;
    }
    
    // Verificar reveal percent mínimo
    if (alcunha.minRevealPercent && revealPercent < alcunha.minRevealPercent) {
      continue;
    }
    
    // Verificar reveal percent máximo
    if (alcunha.maxRevealPercent && revealPercent > alcunha.maxRevealPercent) {
      continue;
    }
    
    // Verificar stat médio mínimo
    if (alcunha.minAvgStat && avgStat < alcunha.minAvgStat) {
      continue;
    }
    
    // Verificar stat médio máximo
    if (alcunha.maxAvgStat && avgStat > alcunha.maxAvgStat) {
      continue;
    }
    
    // Se passou em todos os checks, retorna o ID da alcunha (não o objeto completo)
    return alcunhaId;
  }
  
  // Fallback para COMUM
  return 'COMUM';
}
