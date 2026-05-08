// ============================================
// DATA.JS - Todos os dados estáticos do jogo
// REDISTRIBUÍDO COM MENTALIDADES EQUILIBRADAS
// ============================================
//
// 📈 SISTEMA DE DESENVOLVIMENTO V2.0
// ============================================
// NOTA: Os jogadores ainda estão no formato antigo (ceiling individual),
// mas serão automaticamente migrados para o novo sistema ao carregar o jogo.
//
// NOVO FORMATO (exemplo):
// potential: {
//   category: 'LENDA',           // GERACIONAL, LENDA, ELITE, CAMPEAO, COMUM, ABAIXO_DA_MEDIA
//   totalPoints: 105,            // Total de pontos que pode ganhar
//   pointsEarned: 0,             // Pontos já ganhos
//   pointsRemaining: 105,        // Pontos ainda disponíveis
//   growthPool: 0.0,             // Acumula frações até virar 1 ponto
//   revealPercent: 0.65,         // % do potencial ao aparecer (40-80%)
//   alcunha: 'PRODIGIO'          // GOLDEN_BOY, PRODIGIO, PROMESSA, etc
// }
//
// MIGRAÇÃO AUTOMÁTICA: Os jogadores abaixo serão convertidos automaticamente!
// ============================================

export const TEAMS = [
  // 🌎 AMÉRICA DO NORTE
  
  // #1 - ALL_ROUNDER
  { 
    name: 'Marcus "The Wall" Williams', 
    colors: ['#1e3a8a', '#dc2626', '#ffffff'], 
    mentality: 'ALL_ROUNDER', 
    country: '🇺🇸 EUA',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,85m | Peso: 82kg | Corpo atlético e forte',
    playStyle: 'Equilibrado - Combina defesa sólida com contra-ataques precisos',
    photoUrl: 'https://i.imgur.com/AGTHCNs.jpg',
    iconUrl: 'https://i.imgur.com/t09gn3x.png',
    fullBodyUrl: 'https://i.imgur.com/AGTHCNs.jpg',
    favoriteArena: 'BB10_COMPETITIVE',
    attributes: { attack: 11, defense: 11, stamina: 12, speed: 12, technique: 10, launchPower: 8, intelligence: 10, adaptability: 10, clutch: 11 },
    potential: {
      category: 'ELITE',
      totalPoints: 90,
      pointsEarned: 72,
      pointsRemaining: 18,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.8,
      thresholds: { floor: 54, likely: 62, possible: 72, ceiling: 90 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'STEADY',
      peakAge: [27, 32],
      growthRate: 2.5,
      declineRate: 1.75
    },
    development: {
      yearsActive: 7,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'ELITE',
    age: 24,
  },
  
  // #2 - MOMENTUM_MASTER
  { 
    name: 'Alex "Frostbite" Tremblay', 
    colors: ['#dc2626', '#ffffff', '#000000'], 
    mentality: 'HIGH_RISK_GAMBLER', 
    country: '🇨🇦 Canadá',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,78m | Peso: 75kg | Magro e ágil',
    playStyle: 'Momentum - Explode quando consegue embalar vitórias',
    photoUrl: 'https://i.imgur.com/KieQSlN.jpg',
    iconUrl: 'https://i.imgur.com/kJuD9G6.png',
    fullBodyUrl: 'https://i.imgur.com/bK03xf4.png',
    favoriteArena: 'STORM_TRACK',
    attributes: { attack: 13, defense: 3, stamina: 4, speed: 11, technique: 6, launchPower: 14, intelligence: 6, adaptability: 6, clutch: 14 },
    potential: {
      category: 'CAMPEAO',
      totalPoints: 72,
      pointsEarned: 46,
      pointsRemaining: 26,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.65,
      thresholds: { floor: 43, likely: 50, possible: 57, ceiling: 72 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'STEADY',
      peakAge: [27, 32],
      growthRate: 2.5,
      declineRate: 1.75
    },
    development: {
      yearsActive: 6,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 23,
  },
  
  // 🌎 AMÉRICA DO SUL
  
  // #3 - GLASS_CANNON (MANTIDO)
  { 
    name: 'Sávio "Blast Boom" Luiz', 
    colors: ['#16a34a', '#fbbf24', '#3b82f6'], 
    mentality: 'GLASS_CANNON', 
    country: '🇧🇷 Brasil',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,72m | Peso: 68kg | Corpo compacto e explosivo',
    playStyle: 'Glass Cannon - Ataques devastadores com defesa arriscada',
    photoUrl: 'https://i.imgur.com/Mqu1dvL.jpg',
    iconUrl: 'https://i.imgur.com/H9i0vag.png',
    fullBodyUrl: 'https://i.imgur.com/NUb4BLg.png',
    favoriteArena: 'COLOSSEUM_CARNAGE',
    attributes: { attack: 15, defense: 8, stamina: 7, speed: 15, technique: 12, launchPower: 15, intelligence: 8, adaptability: 9, clutch: 9 },
    potential: {
      category: 'GERACIONAL',
      totalPoints: 117,
      pointsEarned: 76,
      pointsRemaining: 41,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.65,
      thresholds: { floor: 70, likely: 81, possible: 93, ceiling: 117 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'VOLATILE',
      peakAge: [22, 27],
      growthRate: 3.5,
      declineRate: 4.20
    },
    development: {
      yearsActive: 5,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'ELITE',
    age: 18,
  },
  
  // #4 - IRON_FORTRESS
  { 
    name: 'Diego "Táctico" Navarro', 
    colors: ['#7dd3fc', '#ffffff', '#fbbf24'], 
    mentality: 'IRON_FORTRESS', 
    country: '🇦🇷 Argentina',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,80m | Peso: 77kg | Atlético e calculista',
    playStyle: 'Fortaleza - Defesa impenetrável que cansa o oponente',
    photoUrl: 'https://i.imgur.com/YvbSJZI.jpg',
    iconUrl: 'https://i.imgur.com/I2t0x2x.png',
    fullBodyUrl: 'https://i.imgur.com/6F6GreQ.png',
    favoriteArena: 'NEXUS',
    attributes: { attack: 5, defense: 15, stamina: 14, speed: 4, technique: 8, launchPower: 4, intelligence: 14, adaptability: 11, clutch: 5 },
    potential: {
      category: 'CAMPEAO',
      totalPoints: 72,
      pointsEarned: 50,
      pointsRemaining: 22,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.7,
      thresholds: { floor: 43, likely: 50, possible: 57, ceiling: 72 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'EARLY_BLOOMER',
      peakAge: [23, 28],
      growthRate: 3.2,
      declineRate: 3.55
    },
    development: {
      yearsActive: 0,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'TOP',
    age: 21,
  },
  
  // 🌍 EUROPA
  
  // #5 - ETERNAL_SPINNER
  { 
    name: 'Jean "Infinite Spin" Dubois', 
    colors: ['#3b82f6', '#ffffff', '#dc2626'], 
    mentality: 'IRON_FORTRESS', 
    country: '🇫🇷 França',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,76m | Peso: 71kg | Esbelto e elegante',
    playStyle: 'Spinner Eterno - Stamina infinita que vence por resistência',
    photoUrl: 'https://i.imgur.com/tw3gooB.jpg',
    iconUrl: 'https://i.imgur.com/cuOBqck.png',
    fullBodyUrl: 'https://i.imgur.com/k2dTV1P.png',
    favoriteArena: 'VORTEX_COLISEUM',
    attributes: { attack: 5, defense: 15, stamina: 15, speed: 5, technique: 11, launchPower: 5, intelligence: 15, adaptability: 14, clutch: 7 },
    potential: {
      category: 'ELITE',
      totalPoints: 90,
      pointsEarned: 67,
      pointsRemaining: 23,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.75,
      thresholds: { floor: 54, likely: 62, possible: 72, ceiling: 90 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'STEADY',
      peakAge: [27, 32],
      growthRate: 2.5,
      declineRate: 1.75
    },
    development: {
      yearsActive: 3,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'TOP',
    age: 23,
  },
  
  // #6 - SYNERGY_SEEKER
  { 
    name: 'Klaus "Precision" Müller', 
    colors: ['#000000', '#dc2626', '#fbbf24'], 
    mentality: 'MOMENTUM_THIEF', 
    country: '🇩🇪 Alemanha',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,83m | Peso: 80kg | Forte e disciplinado',
    playStyle: 'Sinergia - Maximiza combinações de componentes',
    photoUrl: 'https://i.imgur.com/XimV4aI.jpg',
    iconUrl: 'https://i.imgur.com/LsZma12.png',
    fullBodyUrl: 'https://i.imgur.com/zzq1Ihd.png',
    favoriteArena: 'PANGEA_PLATFORM',
    attributes: { attack: 8, defense: 11, stamina: 7, speed: 7, technique: 15, launchPower: 6, intelligence: 15, adaptability: 15, clutch: 15 },
    potential: {
      category: 'ELITE',
      totalPoints: 90,
      pointsEarned: 76,
      pointsRemaining: 14,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.85,
      thresholds: { floor: 54, likely: 62, possible: 72, ceiling: 90 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'STEADY',
      peakAge: [27, 32],
      growthRate: 2.5,
      declineRate: 1.75
    },
    development: {
      yearsActive: 5,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'ELITE',
    age: 25,
  },
  
  // #7 - HIGH_RISK_GAMBLER (MANTIDO)
  { 
    name: 'Oliver "Wild Card" Ashford', 
    colors: ['#dc2626', '#ffffff', '#1e3a8a'], 
    mentality: 'MOMENTUM_MASTER', 
    country: '🇬🇧 Inglaterra',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,75m | Peso: 73kg | Corpo médio, energia intensa',
    playStyle: 'Alto Risco - Apostas ousadas que podem virar o jogo',
    photoUrl: 'https://via.placeholder.com/270x480/dc2626/ffffff?text=Oliver',
    iconUrl: 'https://i.imgur.com/4YHF4ty.png',
    fullBodyUrl: 'https://i.imgur.com/IOlviac.png',
    favoriteArena: 'TYPHOON_RIDGE',
    attributes: { attack: 10, defense: 7, stamina: 6, speed: 13, technique: 9, launchPower: 6, intelligence: 13, adaptability: 15, clutch: 15 },
    potential: {
      category: 'ELITE',
      totalPoints: 90,
      pointsEarned: 70,
      pointsRemaining: 20,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.78,
      thresholds: { floor: 54, likely: 62, possible: 72, ceiling: 90 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'STEADY',
      peakAge: [27, 32],
      growthRate: 2.5,
      declineRate: 1.75
    },
    development: {
      yearsActive: 7,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'TOP',
    age: 24,
  },
  
  // #8 - CALCULATED_CHAOS
  { 
    name: 'Leonardo "Harmony" Rossi', 
    colors: ['#16a34a', '#ffffff', '#dc2626'], 
    mentality: 'ETERNAL_SPINNER', 
    country: '🇮🇹 Itália',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,81m | Peso: 76kg | Elegante e artístico',
    playStyle: 'Caos Calculado - Imprevisível mas sempre no controle',
    photoUrl: 'https://i.imgur.com/RDKMqTG.jpg',
    iconUrl: 'https://i.imgur.com/vkzxqKm.png',
    fullBodyUrl: 'https://i.imgur.com/gbTDN3S.png',
    favoriteArena: 'SERPENT_PIT',
    attributes: { attack: 5, defense: 10, stamina: 15, speed: 7, technique: 15, launchPower: 5, intelligence: 15, adaptability: 13, clutch: 4 },
    potential: {
      category: 'CAMPEAO',
      totalPoints: 72,
      pointsEarned: 63,
      pointsRemaining: 9,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.88,
      thresholds: { floor: 43, likely: 50, possible: 57, ceiling: 72 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'STEADY',
      peakAge: [27, 32],
      growthRate: 2.5,
      declineRate: 1.75
    },
    development: {
      yearsActive: 6,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'ELITE',
    age: 28,
  },
  
  // 🌏 ÁSIA
  
  // #9 - ALL_ROUNDER
  { 
    name: 'Takeshi "Iron Tank" Yamamoto', 
    colors: ['#dc2626', '#ffffff', '#000000'], 
    mentality: 'MOMENTUM_THIEF', 
    country: '🇯🇵 Japão',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,77m | Peso: 80kg | Muscular e compacto',
    playStyle: 'Completo - Sem pontos fracos',
    photoUrl: 'https://i.imgur.com/ddgWEsH.jpg',
    iconUrl: 'https://i.imgur.com/C0icPw9.png',
    fullBodyUrl: 'https://i.imgur.com/mDMiWlK.png',
    favoriteArena: 'BAMBOO_FORTRESS',
    attributes: { attack: 7, defense: 10, stamina: 7, speed: 7, technique: 15, launchPower: 6, intelligence: 15, adaptability: 15, clutch: 15 },
    potential: {
      category: 'ELITE',
      totalPoints: 90,
      pointsEarned: 73,
      pointsRemaining: 17,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.82,
      thresholds: { floor: 54, likely: 62, possible: 72, ceiling: 90 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'EARLY_BLOOMER',
      peakAge: [23, 28],
      growthRate: 3.2,
      declineRate: 3.55
    },
    development: {
      yearsActive: 10,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'ELITE',
    age: 24,
  },
  
  // #10 - IRON_FORTRESS
  { 
    name: 'Chen "Dragon Wall" Wei', 
    colors: ['#dc2626', '#fbbf24', '#000000'], 
    mentality: 'MOMENTUM_MASTER', 
    country: '🇨🇳 China',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,82m | Peso: 78kg | Forte e imponente',
    playStyle: 'Muralha - Defesa lendária',
    photoUrl: 'https://i.imgur.com/fP68Yk7.jpg',
    iconUrl: 'https://i.imgur.com/ZFtJLdF.png',
    fullBodyUrl: 'https://i.imgur.com/yelrkVs.png',
    favoriteArena: 'TERRACOTTA_BASIN',
    attributes: { attack: 7, defense: 6, stamina: 6, speed: 11, technique: 8, launchPower: 6, intelligence: 11, adaptability: 14, clutch: 14 },
    potential: {
      category: 'ELITE',
      totalPoints: 90,
      pointsEarned: 54,
      pointsRemaining: 36,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.6,
      thresholds: { floor: 54, likely: 62, possible: 72, ceiling: 90 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'EARLY_BLOOMER',
      peakAge: [23, 28],
      growthRate: 3.2,
      declineRate: 3.55
    },
    development: {
      yearsActive: 6,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'ELITE',
    age: 20,
  },
  
  // #11 - HIGH_RISK_GAMBLER (MANTIDO)
  { 
    name: 'Park "E-Striker" Min-Jun', 
    colors: ['#3b82f6', '#dc2626', '#ffffff'], 
    mentality: 'ETERNAL_SPINNER', 
    country: '🇰🇷 Coreia do Sul',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,73m | Peso: 70kg | Ágil e reflexos rápidos',
    playStyle: 'Apostador - Tudo ou nada em cada lance',
    photoUrl: 'https://i.imgur.com/fdZRpeT.jpg',
    iconUrl: 'https://i.imgur.com/0eqCCM8.png',
    fullBodyUrl: 'https://i.imgur.com/tDgwoxl.png',
    favoriteArena: 'DIGITAL_DIMENSION',
    attributes: { attack: 4, defense: 8, stamina: 15, speed: 5, technique: 12, launchPower: 3, intelligence: 12, adaptability: 10, clutch: 3 },
    potential: {
      category: 'CAMPEAO',
      totalPoints: 72,
      pointsEarned: 39,
      pointsRemaining: 33,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.55,
      thresholds: { floor: 43, likely: 50, possible: 57, ceiling: 72 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'EARLY_BLOOMER',
      peakAge: [23, 28],
      growthRate: 3.2,
      declineRate: 3.55
    },
    development: {
      yearsActive: 2,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'TOP',
    age: 19,
  },
  
  // #12 - MOMENTUM_MASTER
  { 
    name: 'Raj "Chakra" Patel', 
    colors: ['#f97316', '#ffffff', '#16a34a'], 
    mentality: 'CHAOS_AGENT', 
    country: '🇮🇳 Índia',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,70m | Peso: 65kg | Leve e espiritual',
    playStyle: 'Momentum - Energia crescente que alimenta vitórias',
    photoUrl: 'https://i.imgur.com/Hn61tI9.jpg',
    iconUrl: 'https://i.imgur.com/GemnzoK.png',
    fullBodyUrl: 'https://i.imgur.com/0GICIqK.png',
    favoriteArena: 'CHAKRA_COLISEUM',
    attributes: { attack: 15, defense: 5, stamina: 5, speed: 15, technique: 7, launchPower: 12, intelligence: 5, adaptability: 15, clutch: 11 },
    potential: {
      category: 'CAMPEAO',
      totalPoints: 72,
      pointsEarned: 64,
      pointsRemaining: 8,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.9,
      thresholds: { floor: 43, likely: 50, possible: 57, ceiling: 72 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'STEADY',
      peakAge: [27, 32],
      growthRate: 2.5,
      declineRate: 1.75
    },
    development: {
      yearsActive: 1,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 30,
  },
  
  // 🌍 ÁFRICA
  
  // #13 - SYNERGY_SEEKER
  { 
    name: 'Hassan "Pharaoh" Al-Rahman', 
    colors: ['#fbbf24', '#000000', '#3b82f6'], 
    mentality: 'MOMENTUM_THIEF', 
    country: '🇪🇬 Egito',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,84m | Peso: 81kg | Porte nobre e imponente',
    playStyle: 'Sinergia - Combinações perfeitas de componentes',
    photoUrl: 'https://i.imgur.com/a8KJFrz.jpg',
    iconUrl: 'https://i.imgur.com/IRzQqJz.png',
    fullBodyUrl: 'https://i.imgur.com/1aaUxTX.png',
    favoriteArena: 'PYRAMID_PLATEAU',
    attributes: { attack: 7, defense: 9, stamina: 6, speed: 6, technique: 12, launchPower: 4, intelligence: 14, adaptability: 14, clutch: 15 },
    potential: {
      category: 'CAMPEAO',
      totalPoints: 72,
      pointsEarned: 61,
      pointsRemaining: 11,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.85,
      thresholds: { floor: 43, likely: 50, possible: 57, ceiling: 72 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'STEADY',
      peakAge: [27, 32],
      growthRate: 2.5,
      declineRate: 1.75
    },
    development: {
      yearsActive: 12,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'ELITE',
    age: 28,
  },
  
  // #14 - GLASS_CANNON (MANTIDO)
  { 
    name: 'Thabo "Thunder" Nkosi', 
    colors: ['#16a34a', '#fbbf24', '#000000'], 
    mentality: 'PERFECTIONIST', 
    country: '🇿🇦 África do Sul',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,79m | Peso: 74kg | Explosivo e poderoso',
    playStyle: 'Glass Cannon - Ofensiva fulminante',
    photoUrl: 'https://i.imgur.com/Nm2Gr3N.jpg',
    iconUrl: 'https://i.imgur.com/MHzndrD.png',
    fullBodyUrl: 'https://i.imgur.com/iHuMPLG.png',
    favoriteArena: 'SAVANNA_STAMPEDE',
    attributes: { attack: 11, defense: 6, stamina: 7, speed: 11, technique: 15, launchPower: 15, intelligence: 15, adaptability: 6, clutch: 11 },
    potential: {
      category: 'ELITE',
      totalPoints: 90,
      pointsEarned: 74,
      pointsRemaining: 16,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.83,
      thresholds: { floor: 54, likely: 62, possible: 72, ceiling: 90 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'STEADY',
      peakAge: [27, 32],
      growthRate: 2.5,
      declineRate: 1.75
    },
    development: {
      yearsActive: 10,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'TOP',
    age: 26,
  },
  
  // 🌏 OCEANIA
  
  // #15 - ETERNAL_SPINNER
  { 
    name: 'Jake "Outback" Morrison', 
    colors: ['#16a34a', '#fbbf24', '#000000'], 
    mentality: 'IRON_FORTRESS', 
    country: '🇦🇺 Austrália',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,88m | Peso: 85kg | Alto e resistente',
    playStyle: 'Resistência - Sobrevive a qualquer batalha',
    photoUrl: 'https://i.imgur.com/hFkUhHf.jpg',
    iconUrl: 'https://i.imgur.com/o2fG8tf.png',
    fullBodyUrl: 'https://i.imgur.com/XyrvkXf.png',
    favoriteArena: 'DESERT_DUNES',
    attributes: { attack: 5, defense: 15, stamina: 14, speed: 4, technique: 8, launchPower: 4, intelligence: 14, adaptability: 11, clutch: 5 },
    potential: {
      category: 'CAMPEAO',
      totalPoints: 72,
      pointsEarned: 50,
      pointsRemaining: 22,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.7,
      thresholds: { floor: 43, likely: 50, possible: 57, ceiling: 72 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'EARLY_BLOOMER',
      peakAge: [23, 28],
      growthRate: 3.2,
      declineRate: 3.55
    },
    development: {
      yearsActive: 8,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 21,
  },
  
  // #16 - CALCULATED_CHAOS
  { 
    name: 'Liam "Storm" Fletcher', 
    colors: ['#000000', '#ffffff', '#3b82f6'], 
    mentality: 'CHAOS_AGENT', 
    country: '🇳🇿 Nova Zelândia',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,75m | Peso: 72kg | Magro e estratégico',
    playStyle: 'Caos Calculado - Turbulência controlada',
    photoUrl: 'https://i.imgur.com/LImgglr.jpg',
    iconUrl: 'https://i.imgur.com/S4WckPT.png',
    fullBodyUrl: 'https://i.imgur.com/mUHRwuM.png',
    favoriteArena: 'TEMPEST_STADIUM',
    attributes: { attack: 15, defense: 5, stamina: 5, speed: 15, technique: 6, launchPower: 12, intelligence: 5, adaptability: 15, clutch: 11 },
    potential: {
      category: 'CAMPEAO',
      totalPoints: 72,
      pointsEarned: 63,
      pointsRemaining: 9,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.88,
      thresholds: { floor: 43, likely: 50, possible: 57, ceiling: 72 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'STEADY',
      peakAge: [27, 32],
      growthRate: 2.5,
      declineRate: 1.75
    },
    development: {
      yearsActive: 3,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 29,
  },
  
  // 🌎 AMÉRICA CENTRAL
  
  // #17 - GLASS_CANNON (MANTIDO)
  { 
    name: 'Carlos "El Matador" Hernández', 
    colors: ['#dc2626', '#fbbf24', '#16a34a'], 
    mentality: 'PERFECTIONIST', 
    country: '🇲🇽 México',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,76m | Peso: 73kg | Ágil e agressivo',
    playStyle: 'Glass Cannon - Ataque audacioso',
    photoUrl: 'https://i.imgur.com/placeholder1.jpg',
    iconUrl: 'https://i.imgur.com/aE26aOB.png',
    fullBodyUrl: 'https://i.imgur.com/IyxDDgj.png',
    favoriteArena: 'AZTEC_ARENA',
    attributes: { attack: 12, defense: 7, stamina: 8, speed: 12, technique: 15, launchPower: 15, intelligence: 15, adaptability: 7, clutch: 12 },
    potential: {
      category: 'ELITE',
      totalPoints: 90,
      pointsEarned: 82,
      pointsRemaining: 8,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.92,
      thresholds: { floor: 54, likely: 62, possible: 72, ceiling: 90 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'DIAMOND',
      peakAge: [29, 35],
      growthRate: 2.0,
      declineRate: 1.74
    },
    development: {
      yearsActive: 11,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'ELITE',
    age: 31,
  },
  
  // #18 - ALL_ROUNDER
  { 
    name: 'Dante "Ice Breaker" Moreau', 
    colors: ['#3b82f6', '#ffffff', '#dc2626'], 
    mentality: 'ALL_ROUNDER', 
    country: '🇭🇹 Haiti',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,77m | Peso: 74kg | Equilibrado e técnico',
    playStyle: 'Completo - Versatilidade total',
    photoUrl: 'https://i.imgur.com/placeholder2.jpg',
    iconUrl: 'https://i.imgur.com/y5ghkz9.png',
    fullBodyUrl: 'https://i.imgur.com/n3NfkoC.png',
    favoriteArena: 'CARIBBEAN_COVE',
    attributes: { attack: 11, defense: 11, stamina: 11, speed: 10, technique: 8, launchPower: 7, intelligence: 8, adaptability: 8, clutch: 10 },
    potential: {
      category: 'CAMPEAO',
      totalPoints: 72,
      pointsEarned: 56,
      pointsRemaining: 16,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.78,
      thresholds: { floor: 43, likely: 50, possible: 57, ceiling: 72 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'STEADY',
      peakAge: [27, 32],
      growthRate: 2.5,
      declineRate: 1.75
    },
    development: {
      yearsActive: 13,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 26,
  },
  
  // 🌎 AMÉRICA DO NORTE (continuação)
  
  // #19 - HIGH_RISK_GAMBLER (MANTIDO)
  { 
    name: 'Isaiah "Velocity" Jackson', 
    colors: ['#dc2626', '#3b82f6', '#ffffff'], 
    mentality: 'CHAOS_AGENT', 
    country: '🇺🇸 EUA',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,80m | Peso: 76kg | Veloz e ousado',
    playStyle: 'Alto Risco - Velocidade extrema com perigo',
    photoUrl: 'https://i.imgur.com/placeholder3.jpg',
    iconUrl: 'https://i.imgur.com/VEphl6J.png',
    fullBodyUrl: 'https://i.imgur.com/szyO6Hn.png',
    favoriteArena: 'VELOCITY_VORTEX',
    attributes: { attack: 15, defense: 5, stamina: 4, speed: 15, technique: 6, launchPower: 12, intelligence: 5, adaptability: 15, clutch: 11 },
    potential: {
      category: 'LENDA',
      totalPoints: 105,
      pointsEarned: 63,
      pointsRemaining: 42,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.6,
      thresholds: { floor: 63, likely: 73, possible: 84, ceiling: 105 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'VOLATILE',
      peakAge: [22, 27],
      growthRate: 3.5,
      declineRate: 4.20
    },
    development: {
      yearsActive: 8,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'TOP',
    age: 18,
  },
  
  // 🌎 AMÉRICA DO SUL (continuação)
  
  // #20 - IRON_FORTRESS
  { 
    name: 'Miguel "Tsunami" Vargas', 
    colors: ['#3b82f6', '#ffffff', '#dc2626'], 
    mentality: 'CHAOS_AGENT', 
    country: '🇨🇱 Chile',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,81m | Peso: 79kg | Sólido como rocha',
    playStyle: 'Fortaleza - Defesa que esmaga o ataque inimigo',
    photoUrl: 'https://i.imgur.com/placeholder4.jpg',
    iconUrl: 'https://i.imgur.com/ifRO6ua.png',
    fullBodyUrl: 'https://i.imgur.com/LXjX0M1.png',
    favoriteArena: 'ANDES_SUMMIT',
    attributes: { attack: 15, defense: 5, stamina: 5, speed: 14, technique: 6, launchPower: 11, intelligence: 4, adaptability: 14, clutch: 10 },
    potential: {
      category: 'CAMPEAO',
      totalPoints: 72,
      pointsEarned: 56,
      pointsRemaining: 16,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.78,
      thresholds: { floor: 43, likely: 50, possible: 57, ceiling: 72 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'STEADY',
      peakAge: [27, 32],
      growthRate: 2.5,
      declineRate: 1.75
    },
    development: {
      yearsActive: 0,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 25,
  },
  
  // #21 - MOMENTUM_MASTER
  { 
    name: 'Roberto "Caribe" Sánchez', 
    colors: ['#fbbf24', '#3b82f6', '#dc2626'], 
    mentality: 'CHAOS_AGENT', 
    country: '🇨🇴 Colômbia',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,74m | Peso: 71kg | Rítmico e fluido',
    playStyle: 'Momentum - Ondas de vitórias crescentes',
    photoUrl: 'https://i.imgur.com/placeholder5.jpg',
    iconUrl: 'https://i.imgur.com/q2k8IgY.png',
    fullBodyUrl: 'https://i.imgur.com/zdgOna1.png',
    favoriteArena: 'EMERALD_BASIN',
    attributes: { attack: 15, defense: 5, stamina: 5, speed: 15, technique: 6, launchPower: 11, intelligence: 5, adaptability: 14, clutch: 10 },
    potential: {
      category: 'CAMPEAO',
      totalPoints: 72,
      pointsEarned: 59,
      pointsRemaining: 13,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.82,
      thresholds: { floor: 43, likely: 50, possible: 57, ceiling: 72 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'STEADY',
      peakAge: [27, 32],
      growthRate: 2.5,
      declineRate: 1.75
    },
    development: {
      yearsActive: 7,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 28,
  },
  
  // #22 - SYNERGY_SEEKER
  { 
    name: 'André "Reggae" Williams', 
    colors: ['#16a34a', '#fbbf24', '#000000'], 
    mentality: 'ADAPTIVE_TACTICIAN', 
    country: '🇯🇲 Jamaica',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,78m | Peso: 75kg | Relaxado mas focado',
    playStyle: 'Sinergia - Harmonia perfeita entre componentes',
    photoUrl: 'https://i.imgur.com/placeholder6.jpg',
    iconUrl: 'https://i.imgur.com/QMOCvGk.png',
    fullBodyUrl: 'https://i.imgur.com/NYSVCwZ.png',
    favoriteArena: 'TROPICAL_TYPHOON',
    attributes: { attack: 5, defense: 8, stamina: 4, speed: 4, technique: 9, launchPower: 4, intelligence: 13, adaptability: 13, clutch: 7 },
    potential: {
      category: 'COMUM',
      totalPoints: 47,
      pointsEarned: 32,
      pointsRemaining: 15,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.7,
      thresholds: { floor: 28, likely: 32, possible: 37, ceiling: 47 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'DIAMOND',
      peakAge: [28, 34],
      growthRate: 2.0,
      declineRate: 1.74
    },
    development: {
      yearsActive: 10,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 27,
  },
  
  // #23 - ETERNAL_SPINNER
  { 
    name: 'Mateo "Condor" Flores', 
    colors: ['#dc2626', '#ffffff', '#3b82f6'], 
    mentality: 'PERFECTIONIST', 
    country: '🇵🇪 Peru',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,69m | Peso: 66kg | Leve e resistente',
    playStyle: 'Resistência - Voa alto e dura mais',
    photoUrl: 'https://i.imgur.com/placeholder7.jpg',
    iconUrl: 'https://i.imgur.com/mCoiP1T.png',
    fullBodyUrl: 'https://i.imgur.com/31OIxAp.png',
    favoriteArena: 'MACHU_PEAK',
    attributes: { attack: 10, defense: 6, stamina: 6, speed: 9, technique: 15, launchPower: 14, intelligence: 14, adaptability: 4, clutch: 9 },
    potential: {
      category: 'CAMPEAO',
      totalPoints: 72,
      pointsEarned: 61,
      pointsRemaining: 11,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.85,
      thresholds: { floor: 43, likely: 50, possible: 57, ceiling: 72 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'LATE_BLOOMER',
      peakAge: [30, 35],
      growthRate: 1.8,
      declineRate: 0.87
    },
    development: {
      yearsActive: 9,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 32,
  },
  
  // #24 - CALCULATED_CHAOS
  { 
    name: 'Gabriel "Pampas" Silva', 
    colors: ['#7dd3fc', '#ffffff', '#fbbf24'], 
    mentality: 'GLASS_CANNON', 
    country: '🇺🇾 Uruguai',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,79m | Peso: 77kg | Técnico e imprevisível',
    playStyle: 'Caos Calculado - Estratégia turbulenta',
    photoUrl: 'https://i.imgur.com/placeholder8.jpg',
    iconUrl: 'https://i.imgur.com/R39onwL.png',
    fullBodyUrl: 'https://i.imgur.com/6tNUfNW.png',
    favoriteArena: 'PAMPA_PLAINS',
    attributes: { attack: 13, defense: 3, stamina: 3, speed: 12, technique: 7, launchPower: 12, intelligence: 4, adaptability: 5, clutch: 6 },
    potential: {
      category: 'COMUM',
      totalPoints: 47,
      pointsEarned: 30,
      pointsRemaining: 17,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.65,
      thresholds: { floor: 28, likely: 32, possible: 37, ceiling: 47 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'STEADY',
      peakAge: [27, 32],
      growthRate: 2.5,
      declineRate: 1.75
    },
    development: {
      yearsActive: 14,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 24,
  },
  
  // #25 - HIGH_RISK_GAMBLER
  { 
    name: 'Rafael "Samba" Costa', 
    colors: ['#16a34a', '#fbbf24', '#3b82f6'], 
    mentality: 'CALCULATED_CHAOS', 
    country: '🇧🇷 Brasil',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,73m | Peso: 70kg | Rápido e imprevisível',
    playStyle: 'Alto Risco - Jogo malandro e arriscado',
    photoUrl: 'https://i.imgur.com/placeholder9.jpg',
    iconUrl: 'https://i.imgur.com/rNh5h8N.png',
    fullBodyUrl: 'https://i.imgur.com/gFcV87P.png',
    favoriteArena: 'COPACABANA_CHAOS',
    attributes: { attack: 6, defense: 4, stamina: 4, speed: 5, technique: 11, launchPower: 5, intelligence: 14, adaptability: 11, clutch: 8 },
    potential: {
      category: 'COMUM',
      totalPoints: 47,
      pointsEarned: 33,
      pointsRemaining: 14,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.72,
      thresholds: { floor: 28, likely: 32, possible: 37, ceiling: 47 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'DIAMOND',
      peakAge: [28, 34],
      growthRate: 2.0,
      declineRate: 1.74
    },
    development: {
      yearsActive: 6,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 26,
  },
  
  // #26 - ALL_ROUNDER
  { 
    name: 'Sebastián "Tango" Méndez', 
    colors: ['#7dd3fc', '#ffffff', '#fbbf24'], 
    mentality: 'ALL_ROUNDER', 
    country: '🇦🇷 Argentina',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,80m | Peso: 78kg | Elegante e preciso',
    playStyle: 'Completo - Dança entre ataque e defesa',
    photoUrl: 'https://i.imgur.com/placeholder10.jpg',
    iconUrl: 'https://i.imgur.com/ztwJIpI.png',
    fullBodyUrl: 'https://i.imgur.com/whFmfQw.png',
    favoriteArena: 'PAMPAS_ARENA',
    attributes: { attack: 11, defense: 11, stamina: 11, speed: 10, technique: 8, launchPower: 7, intelligence: 8, adaptability: 8, clutch: 10 },
    potential: {
      category: 'CAMPEAO',
      totalPoints: 72,
      pointsEarned: 56,
      pointsRemaining: 16,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.78,
      thresholds: { floor: 43, likely: 50, possible: 57, ceiling: 72 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'STEADY',
      peakAge: [27, 32],
      growthRate: 2.5,
      declineRate: 1.75
    },
    development: {
      yearsActive: 8,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 30,
  },
  
  // #27 - GLASS_CANNON (MANTIDO)
  { 
    name: 'Antonio "Jaguar" Rojas', 
    colors: ['#16a34a', '#fbbf24', '#dc2626'], 
    mentality: 'ADAPTIVE_TACTICIAN', 
    country: '🇻🇪 Venezuela',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,75m | Peso: 72kg | Ágil e feroz',
    playStyle: 'Glass Cannon - Predador letal',
    photoUrl: 'https://i.imgur.com/placeholder11.jpg',
    iconUrl: 'https://i.imgur.com/rnb9UPV.png',
    fullBodyUrl: 'https://i.imgur.com/bRyMmiM.png',
    favoriteArena: 'JUNGLE_JAWS',
    attributes: { attack: 5, defense: 7, stamina: 4, speed: 4, technique: 8, launchPower: 4, intelligence: 12, adaptability: 12, clutch: 6 },
    potential: {
      category: 'COMUM',
      totalPoints: 47,
      pointsEarned: 25,
      pointsRemaining: 22,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.55,
      thresholds: { floor: 28, likely: 32, possible: 37, ceiling: 47 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'EARLY_BLOOMER',
      peakAge: [23, 28],
      growthRate: 3.2,
      declineRate: 3.55
    },
    development: {
      yearsActive: 12,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'TOP',
    age: 20,
  },
  
  // #28 - IRON_FORTRESS
  { 
    name: 'Eduardo "Puma" Gutiérrez', 
    colors: ['#dc2626', '#ffffff', '#16a34a'], 
    mentality: 'CALCULATED_CHAOS', 
    country: '🇵🇾 Paraguai',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,82m | Peso: 80kg | Robusto e ágil',
    playStyle: 'Fortaleza - Defesa móvel e poderosa',
    photoUrl: 'https://i.imgur.com/placeholder12.jpg',
    iconUrl: 'https://i.imgur.com/SuLP6TN.png',
    fullBodyUrl: 'https://i.imgur.com/TzwYA3F.png',
    favoriteArena: 'GRAN_CHACO',
    attributes: { attack: 8, defense: 4, stamina: 4, speed: 5, technique: 12, launchPower: 5, intelligence: 14, adaptability: 12, clutch: 8 },
    potential: {
      category: 'COMUM',
      totalPoints: 47,
      pointsEarned: 39,
      pointsRemaining: 8,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.85,
      thresholds: { floor: 28, likely: 32, possible: 37, ceiling: 47 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'LATE_BLOOMER',
      peakAge: [30, 35],
      growthRate: 1.8,
      declineRate: 0.87
    },
    development: {
      yearsActive: 2,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 33,
  },
  
  // 🌍 EUROPA (continuação)
  
  // #29 - CALCULATED_CHAOS (MANTIDO)
  { 
    name: 'Pierre "Le Phantom" Dubois', 
    colors: ['#3b82f6', '#ffffff', '#dc2626'], 
    mentality: 'HIGH_RISK_GAMBLER', 
    country: '🇫🇷 França',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,76m | Peso: 73kg | Misterioso e técnico',
    playStyle: 'Caos Calculado - Fantasma imprevisível',
    photoUrl: 'https://i.imgur.com/placeholder13.jpg',
    iconUrl: 'https://i.imgur.com/yyqe5xF.png',
    fullBodyUrl: 'https://i.imgur.com/IyS933q.png',
    favoriteArena: 'VERSAILLES_VAULT',
    attributes: { attack: 8, defense: 3, stamina: 3, speed: 8, technique: 4, launchPower: 9, intelligence: 4, adaptability: 4, clutch: 10 },
    potential: {
      category: 'ABAIXO_DA_MEDIA',
      totalPoints: 22,
      pointsEarned: 20,
      pointsRemaining: 2,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.92,
      thresholds: { floor: 13, likely: 15, possible: 17, ceiling: 22 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'LATE_BLOOMER',
      peakAge: [30, 35],
      growthRate: 1.8,
      declineRate: 0.87
    },
    development: {
      yearsActive: 15,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'ELITE',
    age: 35,
  },
  
  // #30 - GLASS_CANNON (MANTIDO)
  { 
    name: 'Hans "Blitz" Schmidt', 
    colors: ['#000000', '#dc2626', '#fbbf24'], 
    mentality: 'MOMENTUM_THIEF', 
    country: '🇩🇪 Alemanha',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,84m | Peso: 81kg | Forte e explosivo',
    playStyle: 'Glass Cannon - Blitzkrieg ofensivo',
    photoUrl: 'https://i.imgur.com/placeholder14.jpg',
    iconUrl: 'https://i.imgur.com/xymweFd.png',
    fullBodyUrl: 'https://i.imgur.com/2pxTuAy.png',
    favoriteArena: 'IRON_COLOSSEUM',
    attributes: { attack: 4, defense: 5, stamina: 3, speed: 3, technique: 8, launchPower: 3, intelligence: 9, adaptability: 9, clutch: 10 },
    potential: {
      category: 'ABAIXO_DA_MEDIA',
      totalPoints: 22,
      pointsEarned: 20,
      pointsRemaining: 2,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.95,
      thresholds: { floor: 13, likely: 15, possible: 17, ceiling: 22 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'LATE_BLOOMER',
      peakAge: [30, 35],
      growthRate: 1.8,
      declineRate: 0.87
    },
    development: {
      yearsActive: 17,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'TOP',
    age: 36,
  },
  
  // #31 - MOMENTUM_MASTER
  { 
    name: 'William "Lionheart" Sterling', 
    colors: ['#dc2626', '#ffffff', '#1e3a8a'], 
    mentality: 'PERFECTIONIST', 
    country: '🇬🇧 Inglaterra',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,79m | Peso: 76kg | Nobre e determinado',
    playStyle: 'Momentum - Coragem crescente em batalha',
    photoUrl: 'https://i.imgur.com/placeholder15.jpg',
    iconUrl: 'https://i.imgur.com/toMdHT4.png',
    fullBodyUrl: 'https://i.imgur.com/rhs2mPY.png',
    favoriteArena: 'LONDON_BRIDGE_ARENA',
    attributes: { attack: 10, defense: 6, stamina: 6, speed: 9, technique: 15, launchPower: 14, intelligence: 14, adaptability: 4, clutch: 9 },
    potential: {
      category: 'CAMPEAO',
      totalPoints: 72,
      pointsEarned: 61,
      pointsRemaining: 11,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.85,
      thresholds: { floor: 43, likely: 50, possible: 57, ceiling: 72 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'LATE_BLOOMER',
      peakAge: [30, 35],
      growthRate: 1.8,
      declineRate: 0.87
    },
    development: {
      yearsActive: 18,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 32,
  },
  
  // #32 - SYNERGY_SEEKER
  { 
    name: 'Marco "Gladiator" Bianchi', 
    colors: ['#16a34a', '#ffffff', '#dc2626'], 
    mentality: 'ETERNAL_SPINNER', 
    country: '🇮🇹 Itália',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,83m | Peso: 79kg | Guerreiro e estrategista',
    playStyle: 'Sinergia - Combinações de gladiador',
    photoUrl: 'https://i.imgur.com/placeholder16.jpg',
    iconUrl: 'https://i.imgur.com/9MgYXGs.png',
    fullBodyUrl: 'https://i.imgur.com/GQi8T6B.png',
    favoriteArena: 'COLOSSEUM_CARNAGE',
    attributes: { attack: 5, defense: 10, stamina: 15, speed: 6, technique: 15, launchPower: 4, intelligence: 15, adaptability: 12, clutch: 4 },
    potential: {
      category: 'CAMPEAO',
      totalPoints: 72,
      pointsEarned: 59,
      pointsRemaining: 13,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.82,
      thresholds: { floor: 43, likely: 50, possible: 57, ceiling: 72 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'DIAMOND',
      peakAge: [29, 35],
      growthRate: 2.0,
      declineRate: 1.74
    },
    development: {
      yearsActive: 14,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 29,
  },
  
  // #33 - ETERNAL_SPINNER
  { 
    name: 'Fernando "Torero" García', 
    colors: ['#dc2626', '#fbbf24', '#000000'], 
    mentality: 'IRON_FORTRESS', 
    country: '🇪🇸 Espanha',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,77m | Peso: 74kg | Elegante e resistente',
    playStyle: 'Resistência - Arte da persistência',
    photoUrl: 'https://i.imgur.com/placeholder17.jpg',
    iconUrl: 'https://i.imgur.com/LPiFJRx.png',
    fullBodyUrl: 'https://i.imgur.com/N1pJUYx.png',
    favoriteArena: 'BULLFIGHT_BASIN',
    attributes: { attack: 5, defense: 15, stamina: 15, speed: 5, technique: 10, launchPower: 5, intelligence: 15, adaptability: 12, clutch: 5 },
    potential: {
      category: 'CAMPEAO',
      totalPoints: 72,
      pointsEarned: 61,
      pointsRemaining: 11,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.85,
      thresholds: { floor: 43, likely: 50, possible: 57, ceiling: 72 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'DIAMOND',
      peakAge: [29, 35],
      growthRate: 2.0,
      declineRate: 1.74
    },
    development: {
      yearsActive: 11,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 31,
  },
  
  // #34 - HIGH_RISK_GAMBLER
  { 
    name: 'João "Navegador" Carvalho', 
    colors: ['#16a34a', '#dc2626', '#fbbf24'], 
    mentality: 'ADAPTIVE_TACTICIAN', 
    country: '🇵🇹 Portugal',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,75m | Peso: 73kg | Aventureiro e ousado',
    playStyle: 'Alto Risco - Navega em mares perigosos',
    photoUrl: 'https://i.imgur.com/placeholder18.jpg',
    iconUrl: 'https://i.imgur.com/VQ8XkXT.png',
    fullBodyUrl: 'https://i.imgur.com/Ryhe8Bg.png',
    favoriteArena: 'ATLANTIC_ABYSS',
    attributes: { attack: 5, defense: 7, stamina: 4, speed: 4, technique: 9, launchPower: 4, intelligence: 13, adaptability: 13, clutch: 7 },
    potential: {
      category: 'COMUM',
      totalPoints: 47,
      pointsEarned: 31,
      pointsRemaining: 16,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.68,
      thresholds: { floor: 28, likely: 32, possible: 37, ceiling: 47 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'DIAMOND',
      peakAge: [28, 34],
      growthRate: 2.0,
      declineRate: 1.74
    },
    development: {
      yearsActive: 13,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 26,
  },
  
  // 🌍 ESCANDINÁVIA
  
  // #35 - ALL_ROUNDER
  { 
    name: 'Erik "Viking" Andersson', 
    colors: ['#3b82f6', '#fbbf24', '#ffffff'], 
    mentality: 'ALL_ROUNDER', 
    country: '🇸🇪 Suécia',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,86m | Peso: 83kg | Forte como um viking',
    playStyle: 'Completo - Guerreiro nórdico completo',
    photoUrl: 'https://i.imgur.com/placeholder19.jpg',
    iconUrl: 'https://i.imgur.com/JD7Dppr.png',
    fullBodyUrl: 'https://i.imgur.com/7719hnV.png',
    favoriteArena: 'NORDIC_FJORD',
    attributes: { attack: 12, defense: 11, stamina: 11, speed: 11, technique: 9, launchPower: 7, intelligence: 9, adaptability: 9, clutch: 10 },
    potential: {
      category: 'CAMPEAO',
      totalPoints: 72,
      pointsEarned: 63,
      pointsRemaining: 9,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.88,
      thresholds: { floor: 43, likely: 50, possible: 57, ceiling: 72 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'LATE_BLOOMER',
      peakAge: [30, 35],
      growthRate: 1.8,
      declineRate: 0.87
    },
    development: {
      yearsActive: 8,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 34,
  },
  
  // #36 - IRON_FORTRESS
  { 
    name: 'Lars "Fjord" Hansen', 
    colors: ['#dc2626', '#ffffff', '#1e3a8a'], 
    mentality: 'HIGH_RISK_GAMBLER', 
    country: '🇳🇴 Noruega',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,85m | Peso: 82kg | Sólido como fiordes',
    playStyle: 'Fortaleza - Defesa de gelo e pedra',
    photoUrl: 'https://i.imgur.com/placeholder20.jpg',
    iconUrl: 'https://i.imgur.com/0J4WgdA.png',
    fullBodyUrl: 'https://i.imgur.com/8pTn2g6.png',
    favoriteArena: 'GLACIER_GATES',
    attributes: { attack: 9, defense: 3, stamina: 3, speed: 7, technique: 4, launchPower: 10, intelligence: 4, adaptability: 4, clutch: 10 },
    potential: {
      category: 'ABAIXO_DA_MEDIA',
      totalPoints: 22,
      pointsEarned: 20,
      pointsRemaining: 2,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.95,
      thresholds: { floor: 13, likely: 15, possible: 17, ceiling: 22 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'LATE_BLOOMER',
      peakAge: [30, 35],
      growthRate: 1.8,
      declineRate: 0.87
    },
    development: {
      yearsActive: 16,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 36,
  },
  
  // #37 - MOMENTUM_MASTER
  { 
    name: 'Mikkel "Aurora" Jørgensen', 
    colors: ['#16a34a', '#fbbf24', '#3b82f6'], 
    mentality: 'SYNERGY_SEEKER', 
    country: '🇩🇰 Dinamarca',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,80m | Peso: 77kg | Iluminado e rápido',
    playStyle: 'Momentum - Luz crescente de vitórias',
    photoUrl: 'https://i.imgur.com/placeholder21.jpg',
    iconUrl: 'https://i.imgur.com/hYSMkrh.png',
    fullBodyUrl: 'https://i.imgur.com/kyK8gKJ.png',
    favoriteArena: 'NORTHERN_LIGHTS',
    attributes: { attack: 4, defense: 7, stamina: 6, speed: 3, technique: 11, launchPower: 3, intelligence: 11, adaptability: 11, clutch: 9 },
    potential: {
      category: 'COMUM',
      totalPoints: 47,
      pointsEarned: 29,
      pointsRemaining: 18,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.62,
      thresholds: { floor: 28, likely: 32, possible: 37, ceiling: 47 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'STEADY',
      peakAge: [27, 32],
      growthRate: 2.5,
      declineRate: 1.75
    },
    development: {
      yearsActive: 18,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 25,
  },
  
  // #38 - SYNERGY_SEEKER
  { 
    name: 'Aleksi "Sauna" Virtanen', 
    colors: ['#3b82f6', '#ffffff', '#000000'], 
    mentality: 'SYNERGY_SEEKER', 
    country: '🇫🇮 Finlândia',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,78m | Peso: 75kg | Calmo e preciso',
    playStyle: 'Sinergia - Harmonia sob pressão',
    photoUrl: 'https://i.imgur.com/placeholder22.jpg',
    iconUrl: 'https://i.imgur.com/vqqmwQH.png',
    fullBodyUrl: 'https://i.imgur.com/t47GUAm.png',
    favoriteArena: 'MIDNIGHT_SUN',
    attributes: { attack: 3, defense: 6, stamina: 6, speed: 4, technique: 12, launchPower: 4, intelligence: 12, adaptability: 12, clutch: 10 },
    potential: {
      category: 'COMUM',
      totalPoints: 47,
      pointsEarned: 35,
      pointsRemaining: 12,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.75,
      thresholds: { floor: 28, likely: 32, possible: 37, ceiling: 47 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'DIAMOND',
      peakAge: [28, 34],
      growthRate: 2.0,
      declineRate: 1.74
    },
    development: {
      yearsActive: 7,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 30,
  },
  
  // 🌍 EUROPA ORIENTAL
  
  // #39 - GLASS_CANNON (MANTIDO)
  { 
    name: 'Dmitri "Red Storm" Volkov', 
    colors: ['#dc2626', '#fbbf24', '#000000'], 
    mentality: 'ETERNAL_SPINNER', 
    country: '🇷🇺 Rússia',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,84m | Peso: 80kg | Tempestade vermelha',
    playStyle: 'Glass Cannon - Ofensiva soviética',
    photoUrl: 'https://i.imgur.com/placeholder23.jpg',
    iconUrl: 'https://i.imgur.com/yTrC3gJ.png',
    fullBodyUrl: 'https://i.imgur.com/DO8Xozk.png',
    favoriteArena: 'RED_SQUARE',
    attributes: { attack: 5, defense: 9, stamina: 15, speed: 7, technique: 14, launchPower: 4, intelligence: 14, adaptability: 11, clutch: 3 },
    potential: {
      category: 'CAMPEAO',
      totalPoints: 72,
      pointsEarned: 54,
      pointsRemaining: 18,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.75,
      thresholds: { floor: 43, likely: 50, possible: 57, ceiling: 72 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'STEADY',
      peakAge: [27, 32],
      growthRate: 2.5,
      declineRate: 1.75
    },
    development: {
      yearsActive: 12,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'ELITE',
    age: 27,
  },
  
  // #40 - ETERNAL_SPINNER
  { 
    name: 'Krzysztof "Eagle" Nowak', 
    colors: ['#dc2626', '#ffffff', '#000000'], 
    mentality: 'ETERNAL_SPINNER', 
    country: '🇵🇱 Polônia',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,82m | Peso: 78kg | Resistente e livre',
    playStyle: 'Resistência - Voo longo e persistente',
    photoUrl: 'https://i.imgur.com/placeholder24.jpg',
    iconUrl: 'https://i.imgur.com/dPrE0IP.png',
    fullBodyUrl: 'https://i.imgur.com/QEy3Atj.png',
    favoriteArena: 'WARSAW_WINDS',
    attributes: { attack: 5, defense: 9, stamina: 15, speed: 6, technique: 14, launchPower: 4, intelligence: 14, adaptability: 11, clutch: 3 },
    potential: {
      category: 'CAMPEAO',
      totalPoints: 72,
      pointsEarned: 51,
      pointsRemaining: 21,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.72,
      thresholds: { floor: 43, likely: 50, possible: 57, ceiling: 72 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'STEADY',
      peakAge: [27, 32],
      growthRate: 2.5,
      declineRate: 1.75
    },
    development: {
      yearsActive: 9,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 27,
  },
  
  // #41 - CALCULATED_CHAOS
  { 
    name: 'Ján "Tatra" Kovács', 
    colors: ['#3b82f6', '#dc2626', '#ffffff'], 
    mentality: 'ADAPTIVE_TACTICIAN', 
    country: '🇸🇰 Eslováquia',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,79m | Peso: 76kg | Montanhês estratégico',
    playStyle: 'Caos Calculado - Táticas alpinas',
    photoUrl: 'https://i.imgur.com/placeholder25.jpg',
    iconUrl: 'https://i.imgur.com/AHdm1lK.png',
    fullBodyUrl: 'https://i.imgur.com/Kg8Hsjr.png',
    favoriteArena: 'TATRA_PEAKS',
    attributes: { attack: 5, defense: 7, stamina: 5, speed: 5, technique: 9, launchPower: 5, intelligence: 14, adaptability: 14, clutch: 7 },
    potential: {
      category: 'COMUM',
      totalPoints: 47,
      pointsEarned: 38,
      pointsRemaining: 9,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.82,
      thresholds: { floor: 28, likely: 32, possible: 37, ceiling: 47 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'LATE_BLOOMER',
      peakAge: [30, 35],
      growthRate: 1.8,
      declineRate: 0.87
    },
    development: {
      yearsActive: 9,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 34,
  },
  
  // #42 - HIGH_RISK_GAMBLER
  { 
    name: 'Viktor "Cossack" Petrov', 
    colors: ['#3b82f6', '#fbbf24', '#dc2626'], 
    mentality: 'CALCULATED_CHAOS', 
    country: '🇺🇦 Ucrânia',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,81m | Peso: 77kg | Guerreiro ousado',
    playStyle: 'Alto Risco - Carga de cavalaria',
    photoUrl: 'https://i.imgur.com/placeholder26.jpg',
    iconUrl: 'https://i.imgur.com/7Q6iufX.png',
    fullBodyUrl: 'https://i.imgur.com/0kydVYI.png',
    favoriteArena: 'STEPPES_STADIUM',
    attributes: { attack: 8, defense: 4, stamina: 4, speed: 4, technique: 11, launchPower: 4, intelligence: 13, adaptability: 11, clutch: 7 },
    potential: {
      category: 'COMUM',
      totalPoints: 47,
      pointsEarned: 31,
      pointsRemaining: 16,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.68,
      thresholds: { floor: 28, likely: 32, possible: 37, ceiling: 47 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'DIAMOND',
      peakAge: [28, 34],
      growthRate: 2.0,
      declineRate: 1.74
    },
    development: {
      yearsActive: 16,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 29,
  },
  
  // #43 - ALL_ROUNDER
  { 
    name: 'Nikola "Balkan Beast" Jovanović', 
    colors: ['#dc2626', '#3b82f6', '#ffffff'], 
    mentality: 'MOMENTUM_MASTER', 
    country: '🇷🇸 Sérvia',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,87m | Peso: 84kg | Forte e equilibrado',
    playStyle: 'Completo - Besta balcânica completa',
    photoUrl: 'https://i.imgur.com/placeholder27.jpg',
    iconUrl: 'https://i.imgur.com/umV1HWm.png',
    fullBodyUrl: 'https://i.imgur.com/Wz18o8u.png',
    favoriteArena: 'BALKAN_BASIN',
    attributes: { attack: 11, defense: 8, stamina: 8, speed: 15, technique: 11, launchPower: 7, intelligence: 14, adaptability: 15, clutch: 15 },
    potential: {
      category: 'LENDA',
      totalPoints: 105,
      pointsEarned: 86,
      pointsRemaining: 19,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.82,
      thresholds: { floor: 63, likely: 73, possible: 84, ceiling: 105 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'STEADY',
      peakAge: [27, 32],
      growthRate: 2.5,
      declineRate: 1.75
    },
    development: {
      yearsActive: 11,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 27,
  },
  
  // #44 - IRON_FORTRESS
  { 
    name: 'Andreas "Spartan" Papadopoulos', 
    colors: ['#3b82f6', '#ffffff', '#000000'], 
    mentality: 'IRON_FORTRESS', 
    country: '🇬🇷 Grécia',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,80m | Peso: 78kg | Guerreiro espartano',
    playStyle: 'Fortaleza - Escudo impenetrável',
    photoUrl: 'https://i.imgur.com/placeholder28.jpg',
    iconUrl: 'https://i.imgur.com/613Bvul.png',
    fullBodyUrl: 'https://i.imgur.com/D2fY1oi.png',
    favoriteArena: 'PARTHENON_PLATFORM',
    attributes: { attack: 5, defense: 15, stamina: 15, speed: 5, technique: 10, launchPower: 5, intelligence: 15, adaptability: 13, clutch: 7 },
    potential: {
      category: 'CAMPEAO',
      totalPoints: 72,
      pointsEarned: 64,
      pointsRemaining: 8,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.9,
      thresholds: { floor: 43, likely: 50, possible: 57, ceiling: 72 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'LATE_BLOOMER',
      peakAge: [30, 35],
      growthRate: 1.8,
      declineRate: 0.87
    },
    development: {
      yearsActive: 9,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 36,
  },
  
  // #45 - MOMENTUM_MASTER
  { 
    name: 'Mehmet "Sultan" Yılmaz', 
    colors: ['#dc2626', '#ffffff', '#000000'], 
    mentality: 'CALCULATED_CHAOS', 
    country: '🇹🇷 Turquia',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,83m | Peso: 79kg | Imperial e poderoso',
    playStyle: 'Momentum - Conquista crescente',
    photoUrl: 'https://i.imgur.com/placeholder29.jpg',
    iconUrl: 'https://i.imgur.com/J1Won9a.png',
    fullBodyUrl: 'https://i.imgur.com/HJbqocl.png',
    favoriteArena: 'OTTOMAN_OCTAGON',
    attributes: { attack: 7, defense: 4, stamina: 4, speed: 5, technique: 12, launchPower: 5, intelligence: 14, adaptability: 12, clutch: 8 },
    potential: {
      category: 'COMUM',
      totalPoints: 47,
      pointsEarned: 38,
      pointsRemaining: 9,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.82,
      thresholds: { floor: 28, likely: 32, possible: 37, ceiling: 47 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'LATE_BLOOMER',
      peakAge: [30, 35],
      growthRate: 1.8,
      declineRate: 0.87
    },
    development: {
      yearsActive: 18,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 34,
  },
  
  // 🌏 ÁSIA (continuação)
  
  // #46 - SYNERGY_SEEKER
  { 
    name: 'Hiroshi "Shadow Blade" Nakamura', 
    colors: ['#000000', '#dc2626', '#ffffff'], 
    mentality: 'PERFECTIONIST', 
    country: '🇯🇵 Japão',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,74m | Peso: 71kg | Ninja silencioso',
    playStyle: 'Sinergia - Harmonia das sombras',
    photoUrl: 'https://i.imgur.com/placeholder30.jpg',
    iconUrl: 'https://i.imgur.com/O1xwjVC.png',
    fullBodyUrl: 'https://i.imgur.com/Tq3kqnU.png',
    favoriteArena: 'SAMURAI_SHRINE',
    attributes: { attack: 14, defense: 9, stamina: 10, speed: 14, technique: 15, launchPower: 15, intelligence: 15, adaptability: 7, clutch: 14 },
    potential: {
      category: 'LENDA',
      totalPoints: 105,
      pointsEarned: 99,
      pointsRemaining: 6,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.95,
      thresholds: { floor: 63, likely: 73, possible: 84, ceiling: 105 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'DIAMOND',
      peakAge: [29, 35],
      growthRate: 2.0,
      declineRate: 1.74
    },
    development: {
      yearsActive: 16,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 31,
  },
  
  // #47 - ETERNAL_SPINNER
  { 
    name: 'Li "Phoenix" Chang', 
    colors: ['#dc2626', '#fbbf24', '#000000'], 
    mentality: 'MOMENTUM_MASTER', 
    country: '🇨🇳 China',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,76m | Peso: 73kg | Renasce das cinzas',
    playStyle: 'Resistência - Imortalidade da fênix',
    photoUrl: 'https://i.imgur.com/placeholder31.jpg',
    iconUrl: 'https://i.imgur.com/S4WckPT.png',
    fullBodyUrl: 'https://i.imgur.com/mUHRwuM.png',
    favoriteArena: 'FORBIDDEN_CITY',
    attributes: { attack: 8, defense: 5, stamina: 5, speed: 11, technique: 8, launchPower: 5, intelligence: 11, adaptability: 14, clutch: 14 },
    potential: {
      category: 'CAMPEAO',
      totalPoints: 72,
      pointsEarned: 51,
      pointsRemaining: 21,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.72,
      thresholds: { floor: 43, likely: 50, possible: 57, ceiling: 72 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'STEADY',
      peakAge: [27, 32],
      growthRate: 2.5,
      declineRate: 1.75
    },
    development: {
      yearsActive: 13,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 25,
  },
  
  // #48 - CALCULATED_CHAOS
  { 
    name: 'Kim "Tiger Claw" Dae-Jung', 
    colors: ['#ffffff', '#dc2626', '#3b82f6'], 
    mentality: 'MOMENTUM_MASTER', 
    country: '🇰🇷 Coreia do Sul',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,75m | Peso: 72kg | Feroz e estratégico',
    playStyle: 'Caos Calculado - Garra imprevisível',
    photoUrl: 'https://i.imgur.com/placeholder32.jpg',
    iconUrl: 'https://i.imgur.com/MHjJodY.png',
    fullBodyUrl: 'https://i.imgur.com/xrmNcoy.png',
    favoriteArena: 'SEOUL_SURGE',
    attributes: { attack: 8, defense: 6, stamina: 6, speed: 11, technique: 8, launchPower: 6, intelligence: 11, adaptability: 14, clutch: 14 },
    potential: {
      category: 'CAMPEAO',
      totalPoints: 72,
      pointsEarned: 56,
      pointsRemaining: 16,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.78,
      thresholds: { floor: 43, likely: 50, possible: 57, ceiling: 72 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'STEADY',
      peakAge: [27, 32],
      growthRate: 2.5,
      declineRate: 1.75
    },
    development: {
      yearsActive: 7,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 28,
  },
  
  // #49 - ALL_ROUNDER
  { 
    name: 'Wang "Terracotta" Jian', 
    colors: ['#fbbf24', '#dc2626', '#000000'], 
    mentality: 'GLASS_CANNON', 
    country: '🇨🇳 China',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,81m | Peso: 79kg | Sólido como estátua',
    playStyle: 'Completo - Guerreiro de terracota',
    photoUrl: 'https://i.imgur.com/placeholder33.jpg',
    iconUrl: 'https://i.imgur.com/cNJlZBG.png',
    fullBodyUrl: 'https://i.imgur.com/xmrLw40.png',
    favoriteArena: 'TERRACOTTA_BASIN',
    attributes: { attack: 11, defense: 3, stamina: 3, speed: 9, technique: 6, launchPower: 9, intelligence: 3, adaptability: 4, clutch: 5 },
    potential: {
      category: 'ABAIXO_DA_MEDIA',
      totalPoints: 22,
      pointsEarned: 19,
      pointsRemaining: 3,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.9,
      thresholds: { floor: 13, likely: 15, possible: 17, ceiling: 22 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'LATE_BLOOMER',
      peakAge: [30, 35],
      growthRate: 1.8,
      declineRate: 0.87
    },
    development: {
      yearsActive: 10,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 35,
  },
  
  // #50 - IRON_FORTRESS
  { 
    name: 'Somchai "Golden Temple" Suwan', 
    colors: ['#fbbf24', '#dc2626', '#ffffff'], 
    mentality: 'ALL_ROUNDER', 
    country: '🇹🇭 Tailândia',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,70m | Peso: 68kg | Sagrado e resistente',
    playStyle: 'Fortaleza - Templo dourado impenetrável',
    photoUrl: 'https://i.imgur.com/placeholder34.jpg',
    iconUrl: 'https://i.imgur.com/9qugSKf.png',
    fullBodyUrl: 'https://i.imgur.com/wOqlozz.png',
    favoriteArena: 'BANGKOK_BELLS',
    attributes: { attack: 11, defense: 11, stamina: 11, speed: 11, technique: 8, launchPower: 7, intelligence: 8, adaptability: 8, clutch: 10 },
    potential: {
      category: 'CAMPEAO',
      totalPoints: 72,
      pointsEarned: 57,
      pointsRemaining: 15,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.8,
      thresholds: { floor: 43, likely: 50, possible: 57, ceiling: 72 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'STEADY',
      peakAge: [27, 32],
      growthRate: 2.5,
      declineRate: 1.75
    },
    development: {
      yearsActive: 17,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 30,
  },
  
  // #51 - MOMENTUM_MASTER
  { 
    name: 'Nguyen "Dragon Fist" Minh', 
    colors: ['#dc2626', '#fbbf24', '#16a34a'], 
    mentality: 'HIGH_RISK_GAMBLER', 
    country: '🇻🇳 Vietnã',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,72m | Peso: 70kg | Rápido como dragão',
    playStyle: 'Momentum - Punho de dragão crescente',
    photoUrl: 'https://i.imgur.com/placeholder35.jpg',
    iconUrl: 'https://i.imgur.com/i2TgEmn.png',
    fullBodyUrl: 'https://i.imgur.com/UBgtp7N.png',
    favoriteArena: 'HALONG_HARBOR',
    attributes: { attack: 8, defense: 3, stamina: 3, speed: 8, technique: 4, launchPower: 9, intelligence: 4, adaptability: 4, clutch: 10 },
    potential: {
      category: 'ABAIXO_DA_MEDIA',
      totalPoints: 22,
      pointsEarned: 20,
      pointsRemaining: 2,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.92,
      thresholds: { floor: 13, likely: 15, possible: 17, ceiling: 22 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'STEADY',
      peakAge: [27, 32],
      growthRate: 2.5,
      declineRate: 1.75
    },
    development: {
      yearsActive: 12,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 26,
  },
  
  // #52 - SYNERGY_SEEKER
  { 
    name: 'Arif "Archipelago" Rahman', 
    colors: ['#dc2626', '#ffffff', '#000000'], 
    mentality: 'SYNERGY_SEEKER', 
    country: '🇮🇩 Indonésia',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,73m | Peso: 71kg | Diverso e harmônico',
    playStyle: 'Sinergia - Mil ilhas em harmonia',
    photoUrl: 'https://i.imgur.com/placeholder36.jpg',
    iconUrl: 'https://i.imgur.com/zwujlVS.png',
    fullBodyUrl: 'https://i.imgur.com/zareMpD.png',
    favoriteArena: 'JAVA_JUNGLE',
    attributes: { attack: 3, defense: 7, stamina: 7, speed: 4, technique: 11, launchPower: 4, intelligence: 11, adaptability: 11, clutch: 10 },
    potential: {
      category: 'COMUM',
      totalPoints: 47,
      pointsEarned: 33,
      pointsRemaining: 14,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.72,
      thresholds: { floor: 28, likely: 32, possible: 37, ceiling: 47 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'DIAMOND',
      peakAge: [28, 34],
      growthRate: 2.0,
      declineRate: 1.74
    },
    development: {
      yearsActive: 8,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 29,
  },
  
  // #53 - ETERNAL_SPINNER
  { 
    name: 'Rizal "Typhoon" Santos', 
    colors: ['#3b82f6', '#dc2626', '#fbbf24'], 
    mentality: 'HIGH_RISK_GAMBLER', 
    country: '🇵🇭 Filipinas',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,68m | Peso: 66kg | Tempestade persistente',
    playStyle: 'Resistência - Tufão infinito',
    photoUrl: 'https://i.imgur.com/placeholder37.jpg',
    iconUrl: 'https://i.imgur.com/9rrjR1k.png',
    fullBodyUrl: 'https://i.imgur.com/HUszlDH.png',
    favoriteArena: 'MANILA_MONSOON',
    attributes: { attack: 11, defense: 3, stamina: 3, speed: 9, technique: 5, launchPower: 11, intelligence: 5, adaptability: 5, clutch: 12 },
    potential: {
      category: 'COMUM',
      totalPoints: 47,
      pointsEarned: 28,
      pointsRemaining: 19,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.6,
      thresholds: { floor: 28, likely: 32, possible: 37, ceiling: 47 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'STEADY',
      peakAge: [27, 32],
      growthRate: 2.5,
      declineRate: 1.75
    },
    development: {
      yearsActive: 11,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 24,
  },
  
  // 🌍 ORIENTE MÉDIO
  
  // #54 - CALCULATED_CHAOS
  { 
    name: 'Amir "Silk Road" Kazemi', 
    colors: ['#16a34a', '#dc2626', '#ffffff'], 
    mentality: 'GLASS_CANNON', 
    country: '🇮🇷 Irã',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,79m | Peso: 76kg | Mercador estratégico',
    playStyle: 'Caos Calculado - Rota da seda imprevisível',
    photoUrl: 'https://i.imgur.com/placeholder38.jpg',
    iconUrl: 'https://i.imgur.com/SVIzRN3.png',
    fullBodyUrl: 'https://i.imgur.com/6WjIM39.png',
    favoriteArena: 'PERSIAN_PALACE',
    attributes: { attack: 11, defense: 3, stamina: 3, speed: 9, technique: 6, launchPower: 9, intelligence: 3, adaptability: 4, clutch: 5 },
    potential: {
      category: 'ABAIXO_DA_MEDIA',
      totalPoints: 22,
      pointsEarned: 19,
      pointsRemaining: 3,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.9,
      thresholds: { floor: 13, likely: 15, possible: 17, ceiling: 22 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'LATE_BLOOMER',
      peakAge: [30, 35],
      growthRate: 1.8,
      declineRate: 0.87
    },
    development: {
      yearsActive: 6,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 32,
  },
  
  // #55 - HIGH_RISK_GAMBLER
  { 
    name: 'Arjun "Maharaja" Singh', 
    colors: ['#f97316', '#ffffff', '#16a34a'], 
    mentality: 'ADAPTIVE_TACTICIAN', 
    country: '🇮🇳 Índia',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,77m | Peso: 74kg | Real e ousado',
    playStyle: 'Alto Risco - Apostas de maharaja',
    photoUrl: 'https://i.imgur.com/placeholder39.jpg',
    iconUrl: 'https://i.imgur.com/T52d9he.png',
    fullBodyUrl: 'https://i.imgur.com/CH8bPOd.png',
    favoriteArena: 'TAJ_TORNADO',
    attributes: { attack: 7, defense: 10, stamina: 7, speed: 6, technique: 12, launchPower: 6, intelligence: 15, adaptability: 15, clutch: 9 },
    potential: {
      category: 'CAMPEAO',
      totalPoints: 72,
      pointsEarned: 61,
      pointsRemaining: 11,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.85,
      thresholds: { floor: 43, likely: 50, possible: 57, ceiling: 72 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'LATE_BLOOMER',
      peakAge: [30, 35],
      growthRate: 1.8,
      declineRate: 0.87
    },
    development: {
      yearsActive: 14,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 33,
  },
  
  // #56 - ALL_ROUNDER
  { 
    name: 'Hassan "Crescent" Malik', 
    colors: ['#16a34a', '#ffffff', '#dc2626'], 
    mentality: 'CALCULATED_CHAOS', 
    country: '🇵🇰 Paquistão',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,80m | Peso: 77kg | Equilibrado e forte',
    playStyle: 'Completo - Crescente completo',
    photoUrl: 'https://i.imgur.com/placeholder40.jpg',
    iconUrl: 'https://i.imgur.com/IRzQqJz.png',
    fullBodyUrl: 'https://i.imgur.com/1aaUxTX.png',
    favoriteArena: 'KARACHI_CRATER',
    attributes: { attack: 8, defense: 4, stamina: 4, speed: 4, technique: 11, launchPower: 4, intelligence: 13, adaptability: 11, clutch: 8 },
    potential: {
      category: 'COMUM',
      totalPoints: 47,
      pointsEarned: 32,
      pointsRemaining: 15,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.7,
      thresholds: { floor: 28, likely: 32, possible: 37, ceiling: 47 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'DIAMOND',
      peakAge: [28, 34],
      growthRate: 2.0,
      declineRate: 1.74
    },
    development: {
      yearsActive: 15,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 27,
  },
  
  // 🌍 ÁFRICA (continuação)
  
  // #57 - IRON_FORTRESS
  { 
    name: 'Kwame "Black Panther" Mensah', 
    colors: ['#000000', '#fbbf24', '#16a34a'], 
    mentality: 'SYNERGY_SEEKER', 
    country: '🇬🇭 Gana',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,84m | Peso: 81kg | Poderoso e ágil',
    playStyle: 'Fortaleza - Pantera defensiva',
    photoUrl: 'https://i.imgur.com/placeholder41.jpg',
    iconUrl: 'https://i.imgur.com/Q3zXBxx.png',
    fullBodyUrl: 'https://i.imgur.com/UBrw0j1.png',
    favoriteArena: 'GHANA_GROVE',
    attributes: { attack: 4, defense: 7, stamina: 6, speed: 3, technique: 10, launchPower: 3, intelligence: 10, adaptability: 10, clutch: 9 },
    potential: {
      category: 'COMUM',
      totalPoints: 47,
      pointsEarned: 25,
      pointsRemaining: 22,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.55,
      thresholds: { floor: 28, likely: 32, possible: 37, ceiling: 47 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'EARLY_BLOOMER',
      peakAge: [23, 28],
      growthRate: 3.2,
      declineRate: 3.55
    },
    development: {
      yearsActive: 9,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 20,
  },
  
  // #58 - MOMENTUM_MASTER
  { 
    name: 'Amara "Nile Storm" Okafor', 
    colors: ['#16a34a', '#ffffff', '#000000'], 
    mentality: 'CHAOS_AGENT', 
    country: '🇳🇬 Nigéria',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,78m | Peso: 75kg | Tempestade crescente',
    playStyle: 'Momentum - Enchente do Nilo',
    photoUrl: 'https://i.imgur.com/placeholder42.jpg',
    iconUrl: 'https://i.imgur.com/Aac6Ahv.png',
    fullBodyUrl: 'https://i.imgur.com/j0D1Hi9.png',
    favoriteArena: 'NIGER_DELTA',
    attributes: { attack: 14, defense: 3, stamina: 3, speed: 11, technique: 5, launchPower: 9, intelligence: 4, adaptability: 11, clutch: 8 },
    potential: {
      category: 'COMUM',
      totalPoints: 47,
      pointsEarned: 33,
      pointsRemaining: 14,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.72,
      thresholds: { floor: 28, likely: 32, possible: 37, ceiling: 47 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'STEADY',
      peakAge: [27, 32],
      growthRate: 2.5,
      declineRate: 1.75
    },
    development: {
      yearsActive: 2,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 28,
  },
  
  // #59 - SYNERGY_SEEKER
  { 
    name: 'Jabari "Serengeti" Kimathi', 
    colors: ['#fbbf24', '#16a34a', '#000000'], 
    mentality: 'ADAPTIVE_TACTICIAN', 
    country: '🇰🇪 Quênia',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,82m | Peso: 78kg | Livre e estratégico',
    playStyle: 'Sinergia - Savana em harmonia',
    photoUrl: 'https://i.imgur.com/placeholder43.jpg',
    iconUrl: 'https://i.imgur.com/C9DkMlD.png',
    fullBodyUrl: 'https://i.imgur.com/yPzkXOo.png',
    favoriteArena: 'SERENGETI_PLAINS',
    attributes: { attack: 6, defense: 9, stamina: 6, speed: 6, technique: 12, launchPower: 5, intelligence: 15, adaptability: 15, clutch: 8 },
    potential: {
      category: 'CAMPEAO',
      totalPoints: 72,
      pointsEarned: 54,
      pointsRemaining: 18,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.75,
      thresholds: { floor: 43, likely: 50, possible: 57, ceiling: 72 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'DIAMOND',
      peakAge: [28, 34],
      growthRate: 2.0,
      declineRate: 1.74
    },
    development: {
      yearsActive: 10,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 28,
  },
  
  // #60 - ETERNAL_SPINNER
  { 
    name: 'Zuberi "Atlas Lion" Idrissi', 
    colors: ['#dc2626', '#16a34a', '#000000'], 
    mentality: 'MOMENTUM_THIEF', 
    country: '🇲🇦 Marrocos',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,76m | Peso: 73kg | Rei resistente',
    playStyle: 'Resistência - Leão do Atlas eterno',
    photoUrl: 'https://i.imgur.com/placeholder44.jpg',
    iconUrl: 'https://i.imgur.com/WovoYOA.png',
    fullBodyUrl: 'https://i.imgur.com/VVTXhti.png',
    favoriteArena: 'ATLAS_ASCENT',
    attributes: { attack: 7, defense: 9, stamina: 6, speed: 6, technique: 13, launchPower: 5, intelligence: 14, adaptability: 14, clutch: 15 },
    potential: {
      category: 'CAMPEAO',
      totalPoints: 72,
      pointsEarned: 63,
      pointsRemaining: 9,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.88,
      thresholds: { floor: 43, likely: 50, possible: 57, ceiling: 72 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'LATE_BLOOMER',
      peakAge: [30, 35],
      growthRate: 1.8,
      declineRate: 0.87
    },
    development: {
      yearsActive: 10,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 34,
  },
  
  // #61 - CALCULATED_CHAOS
  { 
    name: 'Kofi "Sahara" Diallo', 
    colors: ['#fbbf24', '#dc2626', '#16a34a'], 
    mentality: 'SYNERGY_SEEKER', 
    country: '🇸🇳 Senegal',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,75m | Peso: 72kg | Deserto imprevisível',
    playStyle: 'Caos Calculado - Tempestade de areia',
    photoUrl: 'https://i.imgur.com/placeholder45.jpg',
    iconUrl: 'https://i.imgur.com/ySpTTYt.png',
    fullBodyUrl: 'https://i.imgur.com/oQ4iguG.png',
    favoriteArena: 'SAHARA_SANDS',
    attributes: { attack: 4, defense: 7, stamina: 6, speed: 3, technique: 11, launchPower: 3, intelligence: 11, adaptability: 11, clutch: 9 },
    potential: {
      category: 'COMUM',
      totalPoints: 47,
      pointsEarned: 30,
      pointsRemaining: 17,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.65,
      thresholds: { floor: 28, likely: 32, possible: 37, ceiling: 47 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'DIAMOND',
      peakAge: [28, 34],
      growthRate: 2.0,
      declineRate: 1.74
    },
    development: {
      yearsActive: 16,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 26,
  },
  
  // 🌏 OCEANIA (continuação)
  
  // #62 - GLASS_CANNON
  { 
    name: 'Tane "Haka Warrior" Parata', 
    colors: ['#000000', '#ffffff', '#dc2626'], 
    mentality: 'IRON_FORTRESS', 
    country: '🇳🇿 Nova Zelândia',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,83m | Peso: 80kg | Guerreiro feroz',
    playStyle: 'Glass Cannon - Haka ofensivo',
    photoUrl: 'https://i.imgur.com/placeholder46.jpg',
    iconUrl: 'https://i.imgur.com/lc8gO6y.png',
    fullBodyUrl: 'https://i.imgur.com/blCsqmu.png',
    favoriteArena: 'MAORI_MOUNTAINS',
    attributes: { attack: 5, defense: 15, stamina: 15, speed: 5, technique: 10, launchPower: 5, intelligence: 15, adaptability: 13, clutch: 6 },
    potential: {
      category: 'CAMPEAO',
      totalPoints: 72,
      pointsEarned: 63,
      pointsRemaining: 9,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.88,
      thresholds: { floor: 43, likely: 50, possible: 57, ceiling: 72 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'LATE_BLOOMER',
      peakAge: [30, 35],
      growthRate: 1.8,
      declineRate: 0.87
    },
    development: {
      yearsActive: 8,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 35,
  },
  
  // #63 - HIGH_RISK_GAMBLER
  { 
    name: 'Koa "Reef Guardian" Kealoha', 
    colors: ['#3b82f6', '#16a34a', '#fbbf24'], 
    mentality: 'GLASS_CANNON', 
    country: '🇺🇸 Havaí',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,79m | Peso: 76kg | Protetor ousado',
    playStyle: 'Alto Risco - Ondas arriscadas',
    photoUrl: 'https://i.imgur.com/placeholder47.jpg',
    iconUrl: 'https://i.imgur.com/FRZU3m4.png',
    fullBodyUrl: 'https://i.imgur.com/jwGna4o.png',
    favoriteArena: 'WAIKIKI_WAVES',
    attributes: { attack: 15, defense: 4, stamina: 3, speed: 12, technique: 7, launchPower: 12, intelligence: 4, adaptability: 5, clutch: 6 },
    potential: {
      category: 'COMUM',
      totalPoints: 47,
      pointsEarned: 33,
      pointsRemaining: 14,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.72,
      thresholds: { floor: 28, likely: 32, possible: 37, ceiling: 47 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'STEADY',
      peakAge: [27, 32],
      growthRate: 2.5,
      declineRate: 1.75
    },
    development: {
      yearsActive: 17,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 29,
  },
  
  // #64 - MOMENTUM_MASTER
  { 
    name: 'Mateo "Island Thunder" Rabuka', 
    colors: ['#3b82f6', '#ffffff', '#dc2626'], 
    mentality: 'GLASS_CANNON', 
    country: '🇫🇯 Fiji',
    status: 'PROFESSIONAL',
    gender: 'male',
    debutYear: 2024,
    physicalDesc: 'Altura: 1,80m | Peso: 77kg | Trovão crescente',
    playStyle: 'Momentum - Tempestade insular crescente',
    photoUrl: 'https://i.imgur.com/placeholder48.jpg',
    iconUrl: 'https://i.imgur.com/mCoiP1T.png',
    fullBodyUrl: 'https://i.imgur.com/31OIxAp.png',
    favoriteArena: 'FIJI_FORTRESS',
    attributes: { attack: 14, defense: 4, stamina: 4, speed: 13, technique: 8, launchPower: 13, intelligence: 4, adaptability: 5, clutch: 6 },
    potential: {
      category: 'COMUM',
      totalPoints: 47,
      pointsEarned: 38,
      pointsRemaining: 9,
      growthPool: 0.0,
      breakthroughBonus: 0,
      revealPercent: 0.82,
      thresholds: { floor: 28, likely: 32, possible: 37, ceiling: 47 },
      alcunha: null,
    },
    developmentStyle: {
      archetype: 'LATE_BLOOMER',
      peakAge: [30, 35],
      growthRate: 1.8,
      declineRate: 0.87
    },
    development: {
      yearsActive: 11,
      lastGrowth: 0,
      totalGrowth: 0,
      breakthroughs: 0,
      regressions: 0
    },
    tier: 'PRO',
    age: 33,
  },
];

// ==========================================
// RESTANTE DO ARQUIVO (ARENAS, TORNEIOS, etc)
// ==========================================
// ============================================

// ============================================
// CALENDAR CONFIG - REFORMULADO "AS TRÊS ERAS"
// ============================================
const CALENDAR_CONFIG = {
  // ============================================
  // 🌀 BEYBLADE PRO CIRCUIT - CALENDÁRIO 2026
  // Sistema baseado em escolhas estratégicas e arena mastery
  // ============================================
  
  // Metadados das Temporadas
  seasons: {
    SPRING: { id: 'SPRING', name: '🌸 Primavera', months: [1, 2, 3], theme: 'Renascimento e Velocidade' },
    SUMMER: { id: 'SUMMER', name: '☀️ Verão', months: [4, 5, 6], theme: 'Caos e Glória' },
    AUTUMN: { id: 'AUTUMN', name: '🍂 Outono', months: [7, 8, 9], theme: 'Resistência e Gravidade' },
    WINTER: { id: 'WINTER', name: '❄️ Inverno', months: [10, 11, 12], theme: 'Consagração e Legado' }
  },
  
  // Alias para compatibilidade
  eras: {
    ASCENSION: { id: 'ASCENSION', name: '🌸 Primavera', months: [1, 2, 3], theme: 'Renascimento e Velocidade' },
    BATTLE: { id: 'BATTLE', name: '☀️ Verão', months: [4, 5, 6, 7, 8, 9], theme: 'Competição Intensa' },
    GLORY: { id: 'GLORY', name: '❄️ Inverno', months: [10, 11, 12], theme: 'Consagração e Legado' }
  },
  
  // Sistema de Tiers
  tiers: {
    PREMIER_CHAMPIONSHIP: {
      name: 'Premier Championship',
      points: { 1: 2000, 2: 1200, 3: 720, 5: 360, 9: 180, 17: 90, 33: 45 },
      participants: 64,
      format: 'MD5'
    },
    ELITE_MASTERS: {
      name: 'Elite Masters',
      points: { 1: 1000, 2: 600, 3: 360, 5: 180, 9: 90, 17: 45 },
      participants: 32,
      format: 'MD3'
    },
    RISING_STAR: {
      name: 'Rising Star Series',
      points: { 1: 500, 2: 300, 3: 180, 5: 90, 9: 45, 17: 20 },
      participants: 32,
      format: 'MD3'
    },
    REGIONAL_CIRCUIT: {
      name: 'Regional Circuit',
      points: { 1: 250, 2: 150, 3: 90, 5: 45, 9: 20 },
      participants: 32,
      format: 'MD3'
    }
  },
  
  // Sistema de Rotação de Arenas - Premier Championships
  premierArenas: [
    'BB-10 Competitive',
    'Killer Sides',
    'Prismatic Nexus',
    'Pangea Platform',
    'Colosseum Carnage',
    'Pinball Inferno',
    'Vortex Coliseum',
    'Domination Zones',
    'Tidal Surge',
    'Storm Track'
  ],
  
  months: [
    // ========================================
    // 🌸 JANEIRO - Primavera
    // ========================================
    { 
      id: 1, 
      name: 'Janeiro', 
      shortName: 'JAN',
      season: 'SPRING',
      theme: 'Abertura Explosiva',
      tournaments: [
        { 
          id: 'PC_GENESIS',
          name: '🎆 GENESIS PREMIER CHAMPIONSHIP', 
          type: 'PREMIER_CHAMPIONSHIP', 
          tier: 'PREMIER_CHAMPIONSHIP', 
          arena: 'ALL', 
          matchFormat: 'MD5', 
          arenaRotation: 'random', 
          participants: 64,
          description: 'O maior evento para começar o ano - O nascimento de lendas',
          wildCards: 8,
          qualification: 'TOP_56_BBP_PLUS_8_WILDCARDS',
          narrativeWeight: 'MAXIMUM'
        },
        { 
          id: 'RS_NEW_YEAR',
          name: '⚡ New Year Rising Star', 
          type: 'RISING_STAR', 
          tier: 'RISING_STAR', 
          arena: 'BB-10 Competitive', 
          matchFormat: 'MD3', 
          arenaRotation: null, 
          participants: 32,
          description: 'Primeira chance de pontuar no ano novo',
          qualification: 'OPEN_ENTRY',
          narrativeWeight: 'MEDIUM'
        },
        { 
          id: 'RC_ROOKIE',
          name: '🎯 Rookie Circuit', 
          type: 'REGIONAL_CIRCUIT', 
          tier: 'REGIONAL_CIRCUIT', 
          arena: 'Prismatic Nexus', 
          matchFormat: 'MD3', 
          arenaRotation: null, 
          participants: 16,
          description: 'Torneio focado em novatos e rankings baixos',
          qualification: 'RANKS_49_64',
          narrativeWeight: 'LOW'
        }
      ]
    },
    
    // ========================================
    // 🌸 FEVEREIRO - Primavera
    // ========================================
    { 
      id: 2, 
      name: 'Fevereiro', 
      shortName: 'FEV',
      season: 'SPRING',
      theme: 'The Elite Masters Begin',
      tournaments: [
        { 
          id: 'EM_PRISMATIC',
          name: '💎 PRISMATIC NEXUS ELITE MASTERS', 
          type: 'ELITE_MASTERS', 
          tier: 'ELITE_MASTERS', 
          arena: 'Prismatic Nexus', 
          matchFormat: 'MD3', 
          arenaRotation: null, 
          participants: 32,
          description: 'Maestria octogonal - Mobilidade e reflexos',
          qualification: 'AUTO_TOP_32_BBP',
          concurrentWith: 'EM_VORTEX',
          mustChoose: true,
          arenaExclusive: true,
          narrativeWeight: 'HIGH',
          arenaPickSystem: {
            enabled: true,
            factors: {
              winrate: 0.40,
              styleCompatibility: 0.30,
              avoidRepetition: 0.15,
              competitiveSpread: 0.10,
              rankingStrategy: 0.05
            }
          }
        },
        { 
          id: 'EM_VORTEX',
          name: '🌀 VORTEX COLISEUM ELITE MASTERS', 
          type: 'ELITE_MASTERS', 
          tier: 'ELITE_MASTERS', 
          arena: 'Vortex Coliseum', 
          matchFormat: 'MD3', 
          arenaRotation: null, 
          participants: 32,
          description: 'O vórtex infinito - Stamina testada ao extremo',
          qualification: 'AUTO_TOP_32_BBP',
          concurrentWith: 'EM_PRISMATIC',
          mustChoose: true,
          arenaExclusive: true,
          narrativeWeight: 'HIGH',
          arenaPickSystem: {
            enabled: true,
            factors: {
              winrate: 0.40,
              styleCompatibility: 0.30,
              avoidRepetition: 0.15,
              competitiveSpread: 0.10,
              rankingStrategy: 0.05
            }
          }
        },
        { 
          id: 'RC_WINTER',
          name: '🎯 Winter Regional Circuit', 
          type: 'REGIONAL_CIRCUIT', 
          tier: 'REGIONAL_CIRCUIT', 
          arena: 'Storm Track', 
          matchFormat: 'MD3', 
          arenaRotation: null, 
          participants: 24,
          description: 'Tempestade de inverno para todos',
          qualification: 'OPEN_ENTRY',
          narrativeWeight: 'MEDIUM'
        }
      ]
    },
    
    // ========================================
    // 🌸 MARÇO - Primavera
    // ========================================
    { 
      id: 3, 
      name: 'Março', 
      shortName: 'MAR',
      season: 'SPRING',
      theme: 'Continental Pride',
      tournaments: [
        { 
          id: 'CONTINENTAL_WAR',
          name: '🎪 CONTINENTAL WAR - Team Championship', 
          type: 'TEAM_EVENT', 
          tier: 'SPECIAL', 
          arena: 'BB-10 Competitive', 
          matchFormat: 'MD3', 
          arenaRotation: null, 
          participants: 48,
          description: 'Orgulho continental - As 6 regiões do mundo',
          format: 'team_tournament',
          teamSize: 6,
          numberOfTeams: 8,
          points: 400,
          narrativeWeight: 'HIGH'
        },
        { 
          id: 'RS_SPRING',
          name: '⚡ Spring Rising Star', 
          type: 'RISING_STAR', 
          tier: 'RISING_STAR', 
          arena: 'Colosseum Carnage', 
          matchFormat: 'MD3', 
          arenaRotation: null, 
          participants: 32,
          description: 'O coliseu gladiatorial abre suas portas',
          qualification: 'OPEN_ENTRY',
          narrativeWeight: 'MEDIUM'
        },
        { 
          id: 'RC_CONTINENTAL',
          name: '🎯 Continental Qualifiers', 
          type: 'REGIONAL_CIRCUIT', 
          tier: 'REGIONAL_CIRCUIT', 
          arena: 'VARIOUS', 
          matchFormat: 'MD3', 
          arenaRotation: 'regional', 
          participants: 16,
          description: 'Qualificação regional simultânea',
          qualification: 'REGIONAL',
          narrativeWeight: 'MEDIUM'
        }
      ]
    },
    
    // ========================================
    // ☀️ ABRIL - Verão
    // ========================================
    { 
      id: 4, 
      name: 'Abril', 
      shortName: 'ABR',
      season: 'SUMMER',
      theme: 'Vernal Championship',
      tournaments: [
        { 
          id: 'PC_VERNAL',
          name: '🌸 VERNAL PREMIER CHAMPIONSHIP', 
          type: 'PREMIER_CHAMPIONSHIP', 
          tier: 'PREMIER_CHAMPIONSHIP', 
          arena: 'ALL', 
          matchFormat: 'MD5', 
          arenaRotation: 'random', 
          participants: 64,
          description: 'Premier da Primavera - Resistência testada',
          wildCards: 8,
          qualification: 'TOP_56_BBP_PLUS_8_WILDCARDS',
          narrativeWeight: 'MAXIMUM'
        },
        { 
          id: 'RC_SPRING',
          name: '🎯 Spring Circuit', 
          type: 'REGIONAL_CIRCUIT', 
          tier: 'REGIONAL_CIRCUIT', 
          arena: 'Pangea Platform', 
          matchFormat: 'MD3', 
          arenaRotation: null, 
          participants: 32,
          description: 'Tectônicas em movimento',
          qualification: 'OPEN_ENTRY',
          narrativeWeight: 'MEDIUM'
        }
      ]
    },
    
    // ========================================
    // ☀️ MAIO - Verão
    // ========================================
    { 
      id: 5, 
      name: 'Maio', 
      shortName: 'MAI',
      season: 'SUMMER',
      theme: 'The Storm Arrives',
      tournaments: [
        { 
          id: 'EM_STORM',
          name: '⛈️ STORM TRACK ELITE MASTERS', 
          type: 'ELITE_MASTERS', 
          tier: 'ELITE_MASTERS', 
          arena: 'Storm Track', 
          matchFormat: 'MD3', 
          arenaRotation: null, 
          participants: 32,
          description: 'Tempestade total - Ventos, raios e caos',
          qualification: 'AUTO_TOP_32_BBP',
          concurrentWith: 'EM_KILLER',
          mustChoose: true,
          arenaExclusive: true,
          narrativeWeight: 'HIGH',
          arenaPickSystem: {
            enabled: true,
            factors: {
              winrate: 0.40,
              styleCompatibility: 0.30,
              avoidRepetition: 0.15,
              competitiveSpread: 0.10,
              rankingStrategy: 0.05
            }
          }
        },
        { 
          id: 'EM_KILLER',
          name: '⚔️ KILLER SIDES ELITE MASTERS', 
          type: 'ELITE_MASTERS', 
          tier: 'ELITE_MASTERS', 
          arena: 'Killer Sides', 
          matchFormat: 'MD3', 
          arenaRotation: null, 
          participants: 32,
          description: 'Arena técnica definitiva - Velocidade é sobrevivência',
          qualification: 'AUTO_TOP_32_BBP',
          concurrentWith: 'EM_STORM',
          mustChoose: true,
          arenaExclusive: true,
          narrativeWeight: 'HIGH',
          arenaPickSystem: {
            enabled: true,
            factors: {
              winrate: 0.40,
              styleCompatibility: 0.30,
              avoidRepetition: 0.15,
              competitiveSpread: 0.10,
              rankingStrategy: 0.05
            }
          }
        },
        { 
          id: 'RS_MEDITERRANEAN',
          name: '⚡ Mediterranean Rising Star', 
          type: 'RISING_STAR', 
          tier: 'RISING_STAR', 
          arena: 'Tidal Surge', 
          matchFormat: 'MD3', 
          arenaRotation: null, 
          participants: 32,
          description: 'Ondas do mediterrâneo',
          qualification: 'OPEN_ENTRY',
          narrativeWeight: 'MEDIUM'
        }
      ]
    },
    
    // ========================================
    // ☀️ JUNHO - Verão
    // ========================================
    { 
      id: 6, 
      name: 'Junho', 
      shortName: 'JUN',
      season: 'SUMMER',
      theme: 'Mid-Season Break',
      tournaments: [
        { 
          id: 'MID_SEASON_INV',
          name: '🌴 MID-SEASON INVITATIONAL', 
          type: 'INVITATIONAL', 
          tier: 'SPECIAL', 
          arena: 'CHOICE', 
          matchFormat: 'MD3', 
          arenaRotation: 'choice', 
          participants: 16,
          description: 'Show de meio de ano - Sem pressão, pura exibição',
          qualification: 'TOP_8_PLUS_8_INVITED',
          noBBPPoints: true,
          narrativeWeight: 'HIGH'
        },
        { 
          id: 'RS_PRE_ZENITH',
          name: '⚡ Pre-Zenith Rising Star', 
          type: 'RISING_STAR', 
          tier: 'RISING_STAR', 
          arena: 'Pinball Inferno', 
          matchFormat: 'MD3', 
          arenaRotation: null, 
          participants: 32,
          description: 'Pinball caótico antes do Zenith',
          qualification: 'OPEN_ENTRY',
          narrativeWeight: 'MEDIUM'
        },
        { 
          id: 'QUALIFIER_MID',
          name: '🎯 Last Chance Qualifier - Mid Season', 
          type: 'QUALIFIER', 
          tier: 'SPECIAL', 
          arena: 'Domination Zones', 
          matchFormat: 'MD3', 
          arenaRotation: null, 
          participants: 24,
          description: 'Domine as zonas e suba no ranking',
          qualification: 'RANKS_33_56',
          points: 300,
          narrativeWeight: 'MEDIUM'
        }
      ]
    },
    
    // ========================================
    // 🍂 JULHO - Outono
    // ========================================
    { 
      id: 7, 
      name: 'Julho', 
      shortName: 'JUL',
      season: 'AUTUMN',
      theme: 'Zenith Championship',
      tournaments: [
        { 
          id: 'PC_ZENITH',
          name: '🏆 ZENITH PREMIER CHAMPIONSHIP', 
          type: 'PREMIER_CHAMPIONSHIP', 
          tier: 'PREMIER_CHAMPIONSHIP', 
          arena: 'ALL', 
          matchFormat: 'MD5', 
          arenaRotation: 'random', 
          participants: 64,
          description: 'O mais prestigioso - Tradição e glória no auge do ano',
          wildCards: 8,
          qualification: 'TOP_56_BBP_PLUS_8_WILDCARDS',
          narrativeWeight: 'MAXIMUM'
        },
        { 
          id: 'RC_SUMMER',
          name: '🎯 Summer Classic Circuit', 
          type: 'REGIONAL_CIRCUIT', 
          tier: 'REGIONAL_CIRCUIT', 
          arena: 'BB-10 Competitive', 
          matchFormat: 'MD3', 
          arenaRotation: null, 
          participants: 32,
          description: 'A clássica de verão',
          qualification: 'OPEN_ENTRY',
          narrativeWeight: 'MEDIUM'
        }
      ]
    },
    
    // ========================================
    // 🍂 AGOSTO - Outono
    // ========================================
    { 
      id: 8, 
      name: 'Agosto', 
      shortName: 'AGO',
      season: 'AUTUMN',
      theme: 'Summer Showdown',
      tournaments: [
        { 
          id: 'EM_TIDAL',
          name: '🌊 TIDAL SURGE ELITE MASTERS', 
          type: 'ELITE_MASTERS', 
          tier: 'ELITE_MASTERS', 
          arena: 'Tidal Surge', 
          matchFormat: 'MD3', 
          arenaRotation: null, 
          participants: 32,
          description: 'Ondas titânicas - Timing é tudo',
          qualification: 'AUTO_TOP_32_BBP',
          concurrentWith: 'EM_CARNAGE',
          mustChoose: true,
          arenaExclusive: true,
          narrativeWeight: 'HIGH',
          arenaPickSystem: {
            enabled: true,
            factors: {
              winrate: 0.40,
              styleCompatibility: 0.30,
              avoidRepetition: 0.15,
              competitiveSpread: 0.10,
              rankingStrategy: 0.05
            }
          }
        },
        { 
          id: 'EM_CARNAGE',
          name: '🏛️ CARNAGE COLOSSEUM ELITE MASTERS', 
          type: 'ELITE_MASTERS', 
          tier: 'ELITE_MASTERS', 
          arena: 'Colosseum Carnage', 
          matchFormat: 'MD3', 
          arenaRotation: null, 
          participants: 32,
          description: 'Coliseu gladiatorial - Força bruta e destruição',
          qualification: 'AUTO_TOP_32_BBP',
          concurrentWith: 'EM_TIDAL',
          mustChoose: true,
          arenaExclusive: true,
          narrativeWeight: 'HIGH',
          arenaPickSystem: {
            enabled: true,
            factors: {
              winrate: 0.40,
              styleCompatibility: 0.30,
              avoidRepetition: 0.15,
              competitiveSpread: 0.10,
              rankingStrategy: 0.05
            }
          }
        },
        { 
          id: 'RS_SUMMER_SLAM',
          name: '⚡ Summer Slam Rising Star', 
          type: 'RISING_STAR', 
          tier: 'RISING_STAR', 
          arena: 'Vortex Coliseum', 
          matchFormat: 'MD3', 
          arenaRotation: null, 
          participants: 32,
          description: 'Vórtex de verão',
          qualification: 'OPEN_ENTRY',
          narrativeWeight: 'MEDIUM'
        },
        { 
          id: 'ALL_STAR_WEEK',
          name: '⭐ ALL-STAR SKILLS COMPETITION', 
          type: 'ALL_STAR', 
          tier: 'SPECIAL', 
          arena: 'VARIOUS', 
          matchFormat: 'SKILLS', 
          arenaRotation: 'various', 
          participants: 24,
          description: 'Celebração - Fastest Launch, Precision, Longest Spin, 1v1 Exhibition',
          noBBPPoints: true,
          events: ['fastest_launch', 'precision_target', 'longest_spin', 'exhibition_1v1'],
          narrativeWeight: 'MEDIUM'
        }
      ]
    },
    
    // ========================================
    // 🍂 SETEMBRO - Outono
    // ========================================
    { 
      id: 9, 
      name: 'Setembro', 
      shortName: 'SET',
      season: 'AUTUMN',
      theme: 'The Fall Elite Masters Double',
      tournaments: [
        { 
          id: 'EM_DOMINATION',
          name: '🎯 DOMINATION ZONES ELITE MASTERS', 
          type: 'ELITE_MASTERS', 
          tier: 'ELITE_MASTERS', 
          arena: 'Domination Zones', 
          matchFormat: 'MD3', 
          arenaRotation: null, 
          participants: 32,
          description: 'Controle territorial - Domine ou morra',
          qualification: 'AUTO_TOP_32_BBP',
          concurrentWith: 'EM_PINBALL',
          mustChoose: true,
          arenaExclusive: true,
          narrativeWeight: 'HIGH',
          arenaPickSystem: {
            enabled: true,
            factors: {
              winrate: 0.40,
              styleCompatibility: 0.30,
              avoidRepetition: 0.15,
              competitiveSpread: 0.10,
              rankingStrategy: 0.05
            }
          }
        },
        { 
          id: 'EM_PINBALL',
          name: '🎰 PINBALL INFERNO ELITE MASTERS', 
          type: 'ELITE_MASTERS', 
          tier: 'ELITE_MASTERS', 
          arena: 'Pinball Inferno', 
          matchFormat: 'MD3', 
          arenaRotation: null, 
          participants: 32,
          description: 'Inferno pinball - Caos total com física de pinball',
          qualification: 'AUTO_TOP_32_BBP',
          concurrentWith: 'EM_DOMINATION',
          mustChoose: true,
          arenaExclusive: true,
          narrativeWeight: 'HIGH',
          arenaPickSystem: {
            enabled: true,
            factors: {
              winrate: 0.40,
              styleCompatibility: 0.30,
              avoidRepetition: 0.15,
              competitiveSpread: 0.10,
              rankingStrategy: 0.05
            }
          }
        },
        { 
          id: 'RC_AUTUMN',
          name: '🎯 Autumn Classic Circuit', 
          type: 'REGIONAL_CIRCUIT', 
          tier: 'REGIONAL_CIRCUIT', 
          arena: 'Killer Sides', 
          matchFormat: 'MD3', 
          arenaRotation: null, 
          participants: 24,
          description: 'Outono técnico',
          qualification: 'OPEN_ENTRY',
          narrativeWeight: 'MEDIUM'
        }
      ]
    },
    
    // ========================================
    // ❄️ OUTUBRO - Inverno
    // ========================================
    { 
      id: 10, 
      name: 'Outubro', 
      shortName: 'OUT',
      season: 'WINTER',
      theme: 'The Final Elite Masters Rush',
      tournaments: [
        { 
          id: 'EM_PANGEA',
          name: '🌍 PANGEA PLATFORM ELITE MASTERS', 
          type: 'ELITE_MASTERS', 
          tier: 'ELITE_MASTERS', 
          arena: 'Pangea Platform', 
          matchFormat: 'MD3', 
          arenaRotation: null, 
          participants: 32,
          description: 'Placas tectônicas - Terremotos e fissuras',
          qualification: 'AUTO_TOP_32_BBP',
          concurrentWith: 'EM_BB10',
          mustChoose: true,
          arenaExclusive: true,
          narrativeWeight: 'HIGH',
          arenaPickSystem: {
            enabled: true,
            factors: {
              winrate: 0.40,
              styleCompatibility: 0.30,
              avoidRepetition: 0.15,
              competitiveSpread: 0.10,
              rankingStrategy: 0.05
            }
          }
        },
        { 
          id: 'EM_BB10',
          name: '🏟️ BB-10 COMPETITIVE ELITE MASTERS', 
          type: 'ELITE_MASTERS', 
          tier: 'ELITE_MASTERS', 
          arena: 'BB-10 Competitive', 
          matchFormat: 'MD3', 
          arenaRotation: null, 
          participants: 32,
          description: 'The Classic Masters - Fundação do esporte',
          qualification: 'AUTO_TOP_32_BBP',
          concurrentWith: 'EM_PANGEA',
          mustChoose: true,
          arenaExclusive: true,
          narrativeWeight: 'HIGH',
          arenaPickSystem: {
            enabled: true,
            factors: {
              winrate: 0.40,
              styleCompatibility: 0.30,
              avoidRepetition: 0.15,
              competitiveSpread: 0.10,
              rankingStrategy: 0.05
            }
          }
        },
        { 
          id: 'RS_HALLOWEEN',
          name: '⚡ Halloween Havoc Rising Star', 
          type: 'RISING_STAR', 
          tier: 'RISING_STAR', 
          arena: 'Pinball Inferno', 
          matchFormat: 'MD3', 
          arenaRotation: null, 
          participants: 32,
          description: 'Terror de Halloween no pinball',
          qualification: 'OPEN_ENTRY',
          narrativeWeight: 'MEDIUM'
        },
        { 
          id: 'RC_LAST_CHANCE',
          name: '🎯 Last Chance Circuit', 
          type: 'REGIONAL_CIRCUIT', 
          tier: 'REGIONAL_CIRCUIT', 
          arena: 'Storm Track', 
          matchFormat: 'MD3', 
          arenaRotation: null, 
          participants: 32,
          description: 'Última chance antes do Apex',
          qualification: 'RANKS_41_72',
          narrativeWeight: 'MEDIUM'
        }
      ]
    },
    
    // ========================================
    // ❄️ NOVEMBRO - Inverno
    // ========================================
    { 
      id: 11, 
      name: 'Novembro', 
      shortName: 'NOV',
      season: 'WINTER',
      theme: 'Apex & Finals Race',
      tournaments: [
        { 
          id: 'PC_APEX',
          name: '🗽 APEX PREMIER CHAMPIONSHIP', 
          type: 'PREMIER_CHAMPIONSHIP', 
          tier: 'PREMIER_CHAMPIONSHIP', 
          arena: 'ALL', 
          matchFormat: 'MD5', 
          arenaRotation: 'random', 
          participants: 64,
          description: 'Último Premier - Tudo ou nada',
          wildCards: 8,
          qualification: 'TOP_56_BBP_PLUS_8_WILDCARDS',
          narrativeWeight: 'MAXIMUM'
        },
        { 
          id: 'CHAMPIONSHIP_CHASE',
          name: '⚡ CHAMPIONSHIP CHASE TOURNAMENT', 
          type: 'FINALS_QUALIFIER', 
          tier: 'CHAMPIONSHIP', 
          arena: 'CHOICE', 
          matchFormat: 'MD3', 
          arenaRotation: 'choice', 
          participants: 24,
          description: 'Corrida final - Ranks 9-32 lutam por 4 vagas no Grand Finals',
          qualification: 'RANKS_9_TO_32_BBP',
          qualifySlots: 4,
          points: 800,
          narrativeWeight: 'MAXIMUM'
        },
        { 
          id: 'RC_PRE_FINALS',
          name: '🎯 Pre-Finals Warm-up Circuit', 
          type: 'REGIONAL_CIRCUIT', 
          tier: 'REGIONAL_CIRCUIT', 
          arena: 'Domination Zones', 
          matchFormat: 'MD3', 
          arenaRotation: null, 
          participants: 16,
          description: 'Aquecimento antes das finais',
          qualification: 'OPEN_ENTRY',
          narrativeWeight: 'LOW'
        }
      ]
    },
    
    // ========================================
    // ❄️ DEZEMBRO - Inverno
    // ========================================
    { 
      id: 12, 
      name: 'Dezembro', 
      shortName: 'DEZ',
      season: 'WINTER',
      theme: 'The Grand Finale',
      tournaments: [
        { 
          id: 'GRAND_FINALS',
          name: '🏆 GRAND FINALS - ULTIMATE CHAMPIONSHIP', 
          type: 'GRAND_FINALS', 
          tier: 'CHAMPIONSHIP', 
          arena: 'CHOICE', 
          matchFormat: 'MD5', 
          arenaRotation: 'choice', 
          participants: 8,
          description: 'O MAIOR EVENTO DO ANO - Coroa de Campeão Mundial',
          qualification: 'TOP_4_BBP_PLUS_4_FROM_CHASE',
          format: 'double_elimination',
          points: 1500,
          pointsMultiplier: 2.0,
          specialRules: {
            doubleElimination: true,
            arenaChoice: true,
            winnerPicksArena: true,
            prizeMultiplier: 5.0,
            legacyEvent: true,
            hallOfFameEntry: true,
            worldChampionTitle: true
          },
          narrativeWeight: 'LEGENDARY'
        },
        { 
          id: 'CHAMPIONS_EXHIBITION',
          name: '🎪 Champions Exhibition', 
          type: 'EXHIBITION', 
          tier: 'SPECIAL', 
          arena: 'ALL', 
          matchFormat: 'MD3', 
          arenaRotation: 'showcase', 
          participants: 16,
          description: 'Celebração de fim de ano com os campeões',
          qualification: 'CHAMPIONS_ONLY',
          noBBPPoints: true,
          narrativeWeight: 'MEDIUM'
        },
        { 
          id: 'NEW_GEN_SHOWCASE',
          name: '🎯 New Generation Showcase', 
          type: 'REGIONAL_CIRCUIT', 
          tier: 'REGIONAL_CIRCUIT', 
          arena: 'Prismatic Nexus', 
          matchFormat: 'MD3', 
          arenaRotation: null, 
          participants: 16,
          description: 'Vitrine para a nova geração',
          qualification: 'ROOKIES_ONLY',
          points: 250,
          narrativeWeight: 'MEDIUM'
        }
      ]
    }
  ]
};

// ============================================
// POINTS CONFIG - SISTEMA REBALANCEADO
// ============================================
const POINTS_CONFIG = {
  // Premier Championship (64 players, 6 rounds) - Maior evento
  PREMIER_CHAMPIONSHIP: { 
    R64: 45,
    R32: 90,
    R16: 180,
    QF: 360,
    SF: 720,
    F_LOSER: 1200,
    F_WINNER: 2000
  },
  
  // Compatibilidade - Grand Slam aponta para Premier
  GRAND_SLAM: { 
    R64: 45,
    R32: 90,
    R16: 180,
    QF: 360,
    SF: 720,
    F_LOSER: 1200,
    F_WINNER: 2000
  },
  
  // Elite Masters (32 players) - Masters de arena específica
  ELITE_MASTERS: {
    R32: 45,
    R16: 90,
    QF: 180,
    SF: 360,
    F_LOSER: 600,
    F_WINNER: 1000
  },
  
  // Compatibilidade - Masters aponta para Elite Masters
  MASTERS: {
    R32: 45,
    R16: 90,
    QF: 180,
    SF: 360,
    F_LOSER: 600,
    F_WINNER: 1000
  },
  
  // Major Masters (32 players) - Compatibilidade
  MAJOR_MASTERS: {
    R32: 45,
    R16: 90,
    QF: 180,
    SF: 360,
    F_LOSER: 600,
    F_WINNER: 1000
  },
  
  // Masters Plus (16-32 players) - Eventos especiais
  ATP_500_PLUS: {
    R16: 50,
    QF: 100,
    SF: 175,
    F_LOSER: 250,
    F_WINNER: 350
  },
  
  // Rising Star Series (32 players) - Challengers rebranded
  RISING_STAR: {
    R32: 20,
    R16: 45,
    QF: 90,
    SF: 180,
    F_LOSER: 300,
    F_WINNER: 500
  },
  
  // Regional Circuit (16-32 players) - Torneios regionais
  REGIONAL_CIRCUIT: {
    R32: 10,
    R16: 20,
    QF: 45,
    SF: 90,
    F_LOSER: 150,
    F_WINNER: 250
  },
  
  // Standard Masters (16 players, 4 rounds) - Valor aumentado
  ATP_500: {
    R16: 0,         // Auto avança
    QF: 75,         // ↑ de 50
    SF: 125,        // ↑ de 100
    F_LOSER: 175,   // ↑ de 150
    F_WINNER: 250   // ↑ de 200
  },
  
  // Challengers Plus (24 players) - Novo formato
  ATP_250_PLUS: {
    R24: 25,
    R16: 50,
    QF: 75,
    SF: 125,
    F_LOSER: 175,
    F_WINNER: 250
  },
  
  // Challengers (16 players, 4 rounds) - Mais valioso
  ATP_250: {
    R16: 0,         // Auto avança
    QF: 50,         // ↑ de 25
    SF: 75,         // ↑ de 50
    F_LOSER: 100,   // ↑ de 75
    F_WINNER: 150   // ↑ de 100
  },
  
  // Prospects (32 players, 5 rounds) - MUITO mais valioso
  ATP_100: {
    R32: 10,        // ↑ de 5
    R16: 20,        // ↑ de 10
    QF: 30,         // ↑ de 15
    SF: 50,         // ↑ de 25
    F_LOSER: 75,    // ↑ de 25
    F_WINNER: 100   // ↑ de 20 (5x mais!)
  },
  
  // Swiss Tournament (64 players, 7 rounds + knockout)
  SWISS_TOURNAMENT: {
    WIN: 10,        // Por vitória na fase suíça
    TOP_16: 50,     // Bonus por avançar
    QF: 100,
    SF: 175,
    F_LOSER: 250,
    F_WINNER: 350
  },
  
  // Battle Royale / Accumulative
  BATTLE_ROYALE: {
    WIN: 5,         // Por cada vitória
    TOP_8: 25,      // Bonus por avançar
    QF: 50,
    SF: 100,
    F_LOSER: 150,
    F_WINNER: 200
  },
  
  // Team Events (pontos individuais)
  TEAM_EVENT: {
    MATCH_WIN: 15,  // Por vitória individual
    TEAM_WIN: 25,   // Bonus se time vencer
    FINALIST: 50,
    CHAMPION: 100
  },
  
  // Special Events
  INVITATIONAL: {
    R16: 25,
    QF: 50,
    SF: 100,
    F_LOSER: 150,
    F_WINNER: 200
  },
  
  WILD_CARD: {
    R16: 10,
    QF: 25,
    SF: 50,
    F_LOSER: 75,
    F_WINNER: 100
  },
  
  QUALIFIER: {
    R32: 5,
    R16: 10,
    QF: 15,
    SF: 25,
    QUALIFY: 50     // Bonus por se qualificar
  },
  
  // Mid-Season Finals
  MID_SEASON_FINALS: {
    QF: 150,
    SF: 250,
    F_LOSER: 400,
    F_WINNER: 600
  },
  
  // Grand Finals Qualifier
  GRAND_FINALS_QUALIFIER: {
    R16: 50,
    QF: 100,
    SF: 200,
    F_LOSER: 300,
    F_WINNER: 500,  // + vaga nas Finals
    QUALIFY_BONUS: 200
  },
  
  // Grand Finals (valores dobrados)
  GRAND_FINALS: {
    PARTICIPATION: 200,  // Só por estar lá
    FIRST_WIN: 100,      // Primeira vitória
    QF: 400,
    SF: 700,
    F_LOSER: 1000,
    F_WINNER: 1600       // 2x o Grand Slam winner
  },
  
  // Regional e Legacy Events
  REGIONAL: {
    MATCH_WIN: 25,
    FINALIST: 100,
    CHAMPION: 150
  },
  
  LEGACY: {
    R16: 15,
    QF: 30,
    SF: 50,
    F_LOSER: 75,
    F_WINNER: 100
  },
  
  // Grudge Matches (com multiplier)
  GRUDGE_MATCH: {
    WIN: 50,
    SERIES_WIN: 100  // Se vencer melhor de 3
  },
  
  // ===== 🔧 CORREÇÃO: CONFIGURAÇÕES FALTANTES =====
  
  // Major Masters (ATP 500+)
  MAJOR_MASTERS: {
    R32: 50,
    R16: 100,
    QF: 200,
    SF: 350,
    F_LOSER: 500,
    F_WINNER: 700
  },
  
  // ATP 500 Plus (Masters aprimorado)
  ATP_500_PLUS: {
    R32: 45,
    R16: 90,
    QF: 180,
    SF: 320,
    F_LOSER: 450,
    F_WINNER: 650
  },
  
  // ATP 250 Plus (Challengers aprimorado)
  ATP_250_PLUS: {
    R32: 30,
    R16: 60,
    QF: 120,
    SF: 200,
    F_LOSER: 300,
    F_WINNER: 450
  },
  
  // ALL_STAR (eventos sem pontos BBP oficiais, mas dão pontos de participação)
  ALL_STAR: {
    PARTICIPATION: 10,
    MATCH_WIN: 5,
    QF: 10,
    SF: 15,
    F_LOSER: 20,
    F_WINNER: 25
  }
};

// ============================================
// ARENA_CONFIG - CONFIGURAÇÃO CENTRALIZADA DE ARENAS
// ============================================
// ✨ SINGLE SOURCE OF TRUTH para todas as arenas do jogo
// Inclui: preferências, modificadores de stats E specs físicas
// Para adicionar uma nova arena, copie um bloco e modifique os valores!
// ============================================

const ARENA_CONFIG = {
  // ===== BB-10 STADIUM (ARENA CLÁSSICA) =====
  'BB-10 Competitive': {
    // Identificação
    code: 'BB10_COMPETITIVE',  // Código interno usado pelo engine
    name: 'BB-10 Competitive Stadium',
    description: 'Arena competitiva clássica - Balanceada e justa, sem gimmicks',
    
    // Preferências de Deck
    favoredTypes: ['Attack', 'Balance'],
    disfavoredTypes: ['Defense'],
    preferredStats: ['atk', 'speed', 'bal'],
    
    // Modificadores de Stats (BattleEngine)
    statModifiers: {},  // REMOVIDO — arena stat modifiers eliminados
    
    // Especificações Físicas (SimulationEngine)
    physicsSpecs: {
      radius: 221,
      surfaceFriction: 0.65,
      gravityModifier: 1.0,
      wallElasticity: 0.75,
      features: { tornadoRidge: true, pockets: true, pocketCount: 2, pocketSizeMultiplier: 0.7 }
    }
  },

  // ===== PRISMATIC NEXUS =====
  'Prismatic Nexus': {
    code: 'NEXUS',
    name: 'Prismatic Nexus Arena',
    description: 'Portais e inclinação favorecem mobilidade e adaptação',
    
    favoredTypes: ['Attack', 'Balance'],
    disfavoredTypes: ['Stamina'],
    preferredStats: ['atk', 'bal', 'speed'],
    
    statModifiers: {},  // REMOVIDO — arena stat modifiers eliminados
    
    physicsSpecs: {
      radius: 215,
      centerRadius: 80,
      portalZones: [
        { x: 150, y: 0, radius: 40 },
        { x: -150, y: 0, radius: 40 },
        { x: 0, y: 150, radius: 40 },
        { x: 0, y: -150, radius: 40 }
      ],
      surfaceFriction: 0.55,
      gravityModifier: 0.95,
      wallElasticity: 0.88,
      features: { portals: true, energyFields: true }
    }
  },

  // ===== COLOSSEUM CARNAGE (ARENA GLADIATORIAL) =====
  'Colosseum Carnage': {
    code: 'COLOSSEUM_CARNAGE',
    name: 'Colosseum Carnage Arena',
    description: 'Arena gladiatorial - Portões liberam obstáculos móveis que esmagam tudo no caminho',
    
    favoredTypes: ['Attack', 'Defense'],
    disfavoredTypes: ['Stamina'],
    preferredStats: ['atk', 'def', 'technique'],
    
    statModifiers: {},  // REMOVIDO — arena stat modifiers eliminados
    
    physicsSpecs: {
      radius: 200,
      surfaceFriction: 0.60,
      gravityModifier: 1.0,
      wallElasticity: 0.85,
      features: { 
        movingObstacles: true, 
        gateSystem: true, 
        crushZones: true,
        obstacleCount: 3,
        gateInterval: 15.0  // Portões abrem a cada 15s
      }
    }
  },

  // ===== IRON CRUCIBLE (CALDEIRÃO DEFENSIVO) =====
  'Volcanic Rage': {
    code: 'VOLCANIC_RAGE',
    name: 'Volcanic Rage Stadium',
    description: 'Tigela profunda com fricção variável - centro de alta fricção ancora tanks, bordas escorregadias repelem atacantes',
    
    favoredTypes: ['Defense', 'Stamina'],
    disfavoredTypes: ['Attack'],
    preferredStats: ['def', 'weight', 'sta'],
    
    statModifiers: {},  // REMOVIDO — arena stat modifiers eliminados
    
    physicsSpecs: {
      radius: 228,
      surfaceFriction: 'VARIABLE',  // Centro alto, bordas baixo
      frictionMap: {
        center: 0.95,    // Alta fricção no centro
        mid: 0.70,       // Fricção normal no meio
        outer: 0.35      // Baixa fricção nas bordas
      },
      gravityModifier: 1.25,  // Gravity trap para beys pesados
      wallElasticity: 0.65,
      features: { 
        bowl: true, 
        frictionGradient: true,
        depthGradient: 0.8,
        heavyWeightMeta: true 
      }
    }
  },

  // ===== VORTEX COLISEUM =====
  'Vortex Coliseum': {
    code: 'VORTEX_COLISEUM',
    name: 'Vortex Coliseum',
    description: 'Vórtex central e órbitas favorecem resistência e momentum',
    
    favoredTypes: ['Stamina', 'Balance'],
    disfavoredTypes: ['Defense'],
    preferredStats: ['sta', 'bal', 'spin'],
    
    statModifiers: {},  // REMOVIDO — arena stat modifiers eliminados
    
    physicsSpecs: {
      radius: 234,
      vortexStrength: 0.8,
      rotationSpeed: 0.5,
      surfaceFriction: 0.60,
      gravityModifier: 1.05,
      wallElasticity: 0.80,
      features: { vortex: true, rotating: true }
    }
  },

  // ===== PINBALL INFERNO 2.0 (REDESIGN COMPLETO) =====
  'Storm Track': {
    code: 'STORM_TRACK',
    name: 'Storm Track Arena',
    description: 'Arena meteorológica com zonas de vento variável, raios aleatórios e correntes de ar - velocidade e adaptação são essenciais',
    
    favoredTypes: ['Attack', 'Balance'],
    disfavoredTypes: ['Defense'],
    preferredStats: ['atk', 'speed', 'technique', 'bal'],
    
    statModifiers: {},  // REMOVIDO — arena stat modifiers eliminados
    
    physicsSpecs: {
      radius: 227,
      surfaceFriction: 0.45,
      gravityModifier: 1.0,
      wallElasticity: 0.95,
      features: { 
        windZones: true,
        lightning: true,
        airCurrents: true,
        weatherSystem: true,
        dynamicEnvironment: true
      },
      windZones: {
        tornado: { count: 2, strength: 1.5, radius: 25, color: '#4a90e2' },  // Azul
        gust: { count: 3, strength: 1.2, radius: 30, color: '#87ceeb' },     // Azul claro
        calm: { count: 2, strength: 0.8, radius: 35, color: '#90ee90' }      // Verde claro
      },
      lightning: { 
        frequency: 'random', 
        timing: [0.8, 1.5, 2.2],  // Tempos variáveis
        shockEffect: true 
      }
    }
  },

  // ===== PANGEA PLATFORM (PLACAS TECTÔNICAS) =====
  'Pangea Platform': {
    code: 'PANGEA_PLATFORM',
    name: 'Pangea Platform Stadium',
    description: 'Placas tectônicas móveis criam fissuras e colisões - peso e balance dominam o caos geológico',
    
    favoredTypes: ['Balance', 'Defense'],
    disfavoredTypes: ['Attack', 'Stamina'],
    preferredStats: ['bal', 'weight', 'technique'],
    
    statModifiers: {},  // REMOVIDO — arena stat modifiers eliminados
    
    physicsSpecs: {
      radius: 221,
      surfaceFriction: 0.68,
      gravityModifier: 1.0,
      wallElasticity: 0.80,
      features: { 
        movingPlates: true, 
        faultLines: true, 
        seismic: true,
        plateCount: 6,
        plateSpeed: 0.3,  // Velocidade de movimento das placas
        quakeInterval: 12.0  // Terremoto a cada 12s
      }
    }
  },

  // ===== TIDAL SURGE =====
  'Tidal Surge': {
    code: 'TIDAL_SURGE',
    name: 'Tidal Surge Arena',
    description: 'Arena costeira onde a maré muda tudo — areia vira água, correntes puxam para o centro, e a ilha é o único refúgio seco. Cada batalha sorteia um tipo de maré diferente.',

    favoredTypes: ['Stamina', 'Balance'],
    disfavoredTypes: ['Attack', 'Defense'],
    preferredStats: ['sta', 'bal', 'spin'],

    statModifiers: {},

    physicsSpecs: {
      radius: 220,
      islandRadius: 40,
      floodZoneRadius: 80,
      surfaceFriction: 0.97,       // base (água varia por profundidade)
      wallElasticity: 0.72,
      features: {
        tideSystem: true,
        tideTypes: ['standard', 'spiral', 'double', 'inverse', 'chaos'],
        islandBonus: true,
        escalatingIntensity: true,
      }
    }
  },

  // ===== KILLER SIDES =====
  'Killer Sides': {
    code: 'KILLER_SIDES',
    name: 'Killer Sides Arena',
    description: 'Grip tracks laterais capturam beys lentos e os disparam ao centro em alta velocidade - velocidade é fuga, lentidão é projétil mortal!',
    
    favoredTypes: ['Attack', 'Balance'],
    disfavoredTypes: ['Defense', 'Stamina'],
    preferredStats: ['speed', 'atk', 'technique'],
    
    statModifiers: {},  // REMOVIDO — arena stat modifiers eliminados
    
    physicsSpecs: {
      radius: 221,
      centerSafeZone: 90,
      surfaceFriction: 0.68,
      gravityModifier: 1.0,
      wallElasticity: 0.72,
      features: { killZones: true, strategy: true }
    }
  }
};

// ============================================
// ARENA_PREFERENCES - Mantido para compatibilidade
// ============================================
// Cria aliases para nomes do calendário ('BB-10 Competitive') e códigos internos ('BB10_COMPETITIVE')
const ARENA_PREFERENCES = {};

Object.entries(ARENA_CONFIG).forEach(([key, config]) => {
  // Adiciona pela chave original (nome do calendário)
  ARENA_PREFERENCES[key] = {
    name: config.name,
    favoredTypes: config.favoredTypes,
    disfavoredTypes: config.disfavoredTypes,
    preferredStats: config.preferredStats,
    description: config.description
  };
  
  // Adiciona também pelo código interno para compatibilidade
  ARENA_PREFERENCES[config.code] = ARENA_PREFERENCES[key];
});


// Exports
export { 
  CALENDAR_CONFIG as CALENDAR_STRUCTURE, 
  POINTS_CONFIG, 
  ARENA_PREFERENCES,
  ARENA_CONFIG  // ✨ Nova configuração centralizada de arenas
};
