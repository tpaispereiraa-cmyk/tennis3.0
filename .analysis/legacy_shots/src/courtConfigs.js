/**
 * courtConfigs.js — Configurações físicas e visuais de cada quadra
 *
 * Cada quadra define:
 *   physics  → overrides aplicados sobre PHYSICS de constants.js
 *   style    → modificadores de atributos/estilos dos jogadores nesta superfície
 *   visual   → paleta de cores e flags para o pixelCourt
 *   meta     → informações de UI (nome, local, ícone, superfície, raridade)
 *
 * Integrações:
 *   - game.js      usa physics (restitution, groundFriction) via getCourtPhysics()
 *   - ai.js / game.js usam style.favors/penalizes para modificar erro/winner rates
 *   - pixelCourt.js usa visual para desenhar a superfície correta
 *   - HomeScreen.jsx exibe meta para o seletor de quadra
 */

// ── Superfícies base ────────────────────────────────────────────────────────
export const SURFACE = Object.freeze({
  GRASS:   'GRASS',
  CLAY:    'CLAY',
  HARD:    'HARD',
  INDOOR:  'INDOOR',
});

// ── Catálogo completo de quadras ────────────────────────────────────────────
export const COURTS = {

  // ═══════════════════════════════════════════════════════════════════════════
  //  WIMBLEDON — Centre Court (Grama)
  // ═══════════════════════════════════════════════════════════════════════════
  WIMBLEDON: {
    meta: {
      name:      'Centre Court',
      location:  'Wimbledon',
      icon:      '🌿',
      surface:   SURFACE.GRASS,
      tier:      'GRAND_SLAM',
      label:     'Grama rápida',
      desc:      'Bounce baixo e irregular. Serve & Volley domina. Adaptabilidade vale mais que consistência.',
    },
    physics: {
      restitution:     0.62,  // bola fica baixa após bounce
      groundFriction:  0.65,  // desliza mais (grama)
      windFactor:      0.12,  // vento moderado (outdoor)
      altitudeFactor:  1.00,
    },
    style: {
      // Estilos que ganham bônus nesta quadra
      favors:   ['BIG_SERVER', 'SRV_VOL', 'NET_SPECIALIST', 'POWER_BASELINER'],
      penalizes: ['CTR_PUNCHER', 'GRINDER'],  // topspin alto perde o efeito no bounce baixo
      // Modificadores numéricos aplicados em game.js
      serveBonus:       0.12,   // % de vantagem extra no saque
      rallyLengthMult:  0.72,   // rallies mais curtos
      staminaDecayMult: 0.90,   // menos desgaste físico (pontos rápidos)
      bounceVariance:   0.08,   // irregularidade do bounce (+erro possível)
      adaptabilityMod:  0.15,   // adaptability mitiga a variância
      winnerMod:        1.20,   // winners mais fáceis de fazer
      ueRiskMod:        1.10,   // mas também mais UE por irregularidade
    },
    visual: {
      surface:         SURFACE.GRASS,
      courtColor:      '#1a6e38',
      courtDark:       '#155c30',
      runbackColor:    '#0e2e18',
      lineColor:       'rgba(240,248,240,0.92)',
      netColor:        '#e8e0c0',
      stripeAlpha:     0.028,
      turfPattern:     true,
      turfPx:          6,
      // Badge de superfície
      badge:           '🌿 GRAMA',
      badgeColor:      '#00FF88',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  ROLAND GARROS — Philippe Chatrier (Saibro)
  // ═══════════════════════════════════════════════════════════════════════════
  ROLAND_GARROS: {
    meta: {
      name:      'Court Philippe Chatrier',
      location:  'Roland Garros',
      icon:      '🏺',
      surface:   SURFACE.CLAY,
      tier:      'GRAND_SLAM',
      label:     'Saibro lento',
      desc:      'Bounce alto e lento. Rallies longos. Stamina e consistência decidem o ponto.',
    },
    physics: {
      restitution:     0.85,   // bounce alto — bola sobe muito
      groundFriction:  0.92,   // muita aderência — bola freia no chão
      windFactor:      0.10,
      altitudeFactor:  1.00,
    },
    style: {
      favors:   ['CTR_PUNCHER', 'RETRIEVER', 'GRINDER'],
      penalizes: ['SRV_VOL', 'BIG_SERVER', 'POWER_BASELINER', 'TAKEALLRISK'],
      serveBonus:       -0.10,  // saques menos decisivos
      rallyLengthMult:  1.65,   // rallies muito longos
      staminaDecayMult: 1.30,   // alto desgaste físico
      bounceVariance:   0.02,   // bounce muito consistente
      adaptabilityMod:  0.05,
      winnerMod:        0.70,   // winners difíceis de fazer
      ueRiskMod:        0.85,   // mas menos UE
      slideBonus:       true,   // players deslizam no saibro
    },
    visual: {
      surface:         SURFACE.CLAY,
      courtColor:      '#c1440e',
      courtDark:       '#a83a0c',
      runbackColor:    '#7a2a08',
      lineColor:       'rgba(255,255,255,0.85)',
      netColor:        '#f0e8d0',
      stripeAlpha:     0.022,
      turfPattern:     false,
      clayPattern:     true,    // granulado de saibro
      badge:           '🏺 SAIBRO',
      badgeColor:      '#FF6B35',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  US OPEN — Arthur Ashe (Quadra Dura)
  // ═══════════════════════════════════════════════════════════════════════════
  US_OPEN: {
    meta: {
      name:      'Arthur Ashe Stadium',
      location:  'US Open',
      icon:      '🏙️',
      surface:   SURFACE.HARD,
      tier:      'GRAND_SLAM',
      label:     'Hard médio',
      desc:      'Bounce consistente. Terreno neutro — todos os estilos são viáveis. All-Court Players dominam.',
    },
    physics: {
      restitution:     0.74,
      groundFriction:  0.82,
      windFactor:      0.08,
      altitudeFactor:  1.00,
    },
    style: {
      favors:   ['ALL_COURT', 'AGG_BASELINER', 'TACTICAL_TECHNICIAN', 'MOMENTUM_PLAYER'],
      penalizes: [],
      serveBonus:       0.02,
      rallyLengthMult:  1.00,
      staminaDecayMult: 1.00,
      bounceVariance:   0.01,
      adaptabilityMod:  0.02,
      winnerMod:        1.00,
      ueRiskMod:        1.00,
    },
    visual: {
      surface:         SURFACE.HARD,
      courtColor:      '#2a5fa8',
      courtDark:       '#1e4a88',
      runbackColor:    '#102040',
      lineColor:       'rgba(255,255,255,0.90)',
      netColor:        '#d8d8d8',
      stripeAlpha:     0.018,
      turfPattern:     false,
      hardPattern:     true,   // linhas de asfalto
      badge:           '🏙️ HARD',
      badgeColor:      '#00D4FF',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  ATP FINALS — O2 Arena (Indoor)
  // ═══════════════════════════════════════════════════════════════════════════
  O2_ARENA: {
    meta: {
      name:      'O₂ Arena',
      location:  'ATP Finals – Londres',
      icon:      '🏟️',
      surface:   SURFACE.INDOOR,
      tier:      'MASTERS',
      label:     'Indoor rápido',
      desc:      'Sem vento. Condições perfeitas e controladas. Serve e agressividade dominam.',
    },
    physics: {
      restitution:     0.68,
      groundFriction:  0.72,
      windFactor:      0.00,   // indoor = sem vento
      altitudeFactor:  1.00,
    },
    style: {
      favors:   ['BIG_SERVER', 'AGG_BASELINER', 'POWER_BASELINER', 'TAKEALLRISK'],
      penalizes: ['RETRIEVER', 'GRINDER'],
      serveBonus:       0.08,
      rallyLengthMult:  0.85,
      staminaDecayMult: 0.88,  // condições controladas — menos esforço
      bounceVariance:   0.00,  // bounce perfeito
      adaptabilityMod:  -0.05, // adaptability menos relevante (condições fixas)
      winnerMod:        1.15,
      ueRiskMod:        0.92,
    },
    visual: {
      surface:         SURFACE.INDOOR,
      courtColor:      '#1a1a5a',
      courtDark:       '#12124a',
      runbackColor:    '#0a0a30',
      lineColor:       'rgba(200,220,255,0.90)',
      netColor:        '#8899cc',
      stripeAlpha:     0.025,
      turfPattern:     false,
      indoorGlow:      true,  // efeito de luz artificial
      badge:           '🏟️ INDOOR',
      badgeColor:      '#AA88FF',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  QUEEN'S CLUB (Grama Rápida Premium)
  // ═══════════════════════════════════════════════════════════════════════════
  QUEENS_CLUB: {
    meta: {
      name:      "Queen's Club",
      location:  'Londres',
      icon:      '⚡',
      surface:   SURFACE.GRASS,
      tier:      'PREMIUM',
      label:     'Grama ultra-rápida',
      desc:      'Bounce ultra-baixo. Preparação para Wimbledon. Velocidade extrema — equivalente ao Storm Track.',
    },
    physics: {
      restitution:     0.54,   // ancora baixíssimo
      groundFriction:  0.58,
      windFactor:      0.14,
      altitudeFactor:  1.00,
    },
    style: {
      favors:   ['BIG_SERVER', 'SRV_VOL', 'NET_SPECIALIST', 'POWER_BASELINER'],
      penalizes: ['CTR_PUNCHER', 'RETRIEVER', 'GRINDER'],
      serveBonus:       0.20,   // serve muito poderoso aqui
      rallyLengthMult:  0.58,
      staminaDecayMult: 0.80,
      bounceVariance:   0.12,   // grama velha — muito irregular
      adaptabilityMod:  0.20,
      winnerMod:        1.40,
      ueRiskMod:        1.25,
    },
    visual: {
      surface:         SURFACE.GRASS,
      courtColor:      '#0f5228',
      courtDark:       '#0a3d1e',
      runbackColor:    '#061a0f',
      lineColor:       'rgba(245,255,240,0.95)',
      netColor:        '#e0dcc0',
      stripeAlpha:     0.035,
      turfPattern:     true,
      turfPx:          4,       // turfPattern mais fino = grama mais curta
      badge:           '⚡ ULTRA GRASS',
      badgeColor:      '#88FF44',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  MONTE CARLO (Saibro Lento Premium)
  // ═══════════════════════════════════════════════════════════════════════════
  MONTE_CARLO: {
    meta: {
      name:      'Monte-Carlo Country Club',
      location:  'Mônaco',
      icon:      '🌊',
      surface:   SURFACE.CLAY,
      tier:      'PREMIUM',
      label:     'Saibro pesado',
      desc:      'Saibro mais lento do circuito. Rally de 30+ golpes comum. Equivalente ao Eternal Spinner.',
    },
    physics: {
      restitution:     0.90,   // bounce altíssimo — bola sobe muito
      groundFriction:  0.94,   // muito alto mas físicamente coerente (era 0.97 — criava física aberrante)
      windFactor:      0.06,   // Mediterrâneo — vento calmo
      altitudeFactor:  1.00,
    },
    style: {
      favors:   ['CTR_PUNCHER', 'RETRIEVER', 'GRINDER'],
      penalizes: ['SRV_VOL', 'BIG_SERVER', 'AGG_BASELINER', 'POWER_BASELINER'],
      serveBonus:       -0.18,
      rallyLengthMult:  2.20,  // rallies épicos
      staminaDecayMult: 1.55,
      bounceVariance:   0.03,
      adaptabilityMod:  0.04,
      winnerMod:        0.55,
      ueRiskMod:        0.78,
    },
    visual: {
      surface:         SURFACE.CLAY,
      courtColor:      '#b83a0a',
      courtDark:       '#9a3008',
      runbackColor:    '#6a2006',
      lineColor:       'rgba(255,255,255,0.88)',
      netColor:        '#f0e0c8',
      stripeAlpha:     0.028,
      turfPattern:     false,
      clayPattern:     true,
      clayHeavy:       true,   // saibro mais escuro, mais textura
      badge:           '🌊 SAIBRO PESADO',
      badgeColor:      '#FF4422',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  INDIAN WELLS (Hard de Altitude)
  // ═══════════════════════════════════════════════════════════════════════════
  INDIAN_WELLS: {
    meta: {
      name:      'Stadium 1',
      location:  'Indian Wells',
      icon:      '🌵',
      surface:   SURFACE.HARD,
      tier:      'PREMIUM',
      label:     'Hard de altitude',
      desc:      'Altitude aumenta velocidade da bola em 10%. Serve e flat shots valem ainda mais.',
    },
    physics: {
      restitution:     0.74,
      groundFriction:  0.80,
      windFactor:      0.04,   // deserto — vento seco mas calmo
      altitudeFactor:  1.10,  // +10% velocidade de bola (ar rarefeito)
    },
    style: {
      favors:   ['BIG_SERVER', 'AGG_BASELINER', 'ALL_COURT', 'POWER_BASELINER'],
      penalizes: ['RETRIEVER', 'GRINDER'],
      serveBonus:       0.15,
      rallyLengthMult:  0.88,
      staminaDecayMult: 1.08,  // altitude cansa mais
      bounceVariance:   0.01,
      adaptabilityMod:  0.03,
      winnerMod:        1.18,
      ueRiskMod:        1.05,
    },
    visual: {
      surface:         SURFACE.HARD,
      courtColor:      '#3565b0',
      courtDark:       '#28508a',
      runbackColor:    '#182838',
      lineColor:       'rgba(255,255,255,0.92)',
      netColor:        '#d0d8e8',
      stripeAlpha:     0.016,
      turfPattern:     false,
      hardPattern:     true,
      desertAmbient:   true,   // fundo com tons de deserto
      badge:           '🌵 ALTITUDE',
      badgeColor:      '#FFD700',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  BERCY (Indoor com Saibro — Paris Masters)
  // ═══════════════════════════════════════════════════════════════════════════
  BERCY: {
    meta: {
      name:      'Palais Omnisports de Bercy',
      location:  'Paris',
      icon:      '🎭',
      surface:   SURFACE.INDOOR,
      tier:      'PREMIUM',
      label:     'Indoor sobre saibro',
      desc:      'Indoor com saibro compactado. Combina velocidade indoor com bounce alto. Caótico e imprevisível.',
    },
    physics: {
      restitution:     0.80,   // saibro compactado — bounce alto
      groundFriction:  0.86,
      windFactor:      0.00,   // indoor
      altitudeFactor:  1.00,
    },
    style: {
      favors:   ['ALL_COURT', 'MOMENTUM_PLAYER', 'CTR_PUNCHER'],  // navegar o caos + saibro alto
      penalizes: ['SRV_VOL', 'NET_SPECIALIST'],    // net approach difícil com bounce alto
      serveBonus:       0.04,
      rallyLengthMult:  1.22,
      staminaDecayMult: 1.15,
      bounceVariance:   0.07,    // combinação incomum = imprevisível
      adaptabilityMod:  0.18,    // adaptability é chave aqui
      winnerMod:        0.95,
      ueRiskMod:        1.18,    // mais erros pelo caos da superfície
    },
    visual: {
      surface:         SURFACE.INDOOR,
      courtColor:      '#4a2060',  // roxo sobre terra
      courtDark:       '#381848',
      runbackColor:    '#200e30',
      lineColor:       'rgba(220,200,255,0.88)',
      netColor:        '#aa88cc',
      stripeAlpha:     0.020,
      turfPattern:     false,
      clayPattern:     true,
      indoorGlow:      true,
      bercy:           true,    // combinação única
      badge:           '🎭 INDOOR CLAY',
      badgeColor:      '#CC66FF',
    },
  },
};

// ── Personalidade visual por torneio ─────────────────────────────────────────
//
// Cada entrada sobrescreve / complementa o visual do courtKey base.
// O renderer lê isso via getVenueOverride(tournamentId).
//
// Campos disponíveis:
//   courtColor / courtDark / runbackColor  — cores da quadra
//   rbScale      — multiplica rbH e rbW no recalcLayout (1.0 = padrão)
//   venueLabel   — texto sutil estampado no chão da quadra
//   labelAlpha   — opacidade do texto (0..1, default 0.055)
//   accentColor  — cor para detalhes decorativos (corners, linhas extra)
//   grandSlam    — true ativa decoração extra (corners dourados, baseline glow)
//   cornerStyle  — 'diamond' | 'cross' | 'arc' (shape dos cantos decorativos)
//   baselineGlow — cor do glow suave nas baselines (só Grand Slams)
//   floodTint    — sobrescreve cor do bloom dos holofotes no fundo
//
export const VENUE_OVERRIDES = {

  // ════════════════════════════════════════════════
  //  GRAND SLAMS — tratamento premium
  // ════════════════════════════════════════════════

  // Open de Meridian — Hard noturno, azul royal profundo
  JAN_GS_MERIDIAN: {
    courtColor:   '#1a3e80',
    courtDark:    '#0e2558',
    runbackColor: '#08142e',
    rbScale:      1.20,
    venueLabel:   'MERIDIAN',
    labelAlpha:   0.10,
    accentColor:  '#FFD700',
    grandSlam:    true,
    cornerStyle:  'diamond',
    baselineGlow: 'rgba(255,210,0,0.18)',
    floodTint:    '20,55,140',
  },

  // Roland d'Occitane — Saibro alaranjado, íntimo e dramático
  MAI_GS_ROLAND: {
    courtColor:   '#c84a10',
    courtDark:    '#9a3508',
    runbackColor: '#5c1e04',
    rbScale:      0.88,
    venueLabel:   'OCCITANE',
    labelAlpha:   0.08,
    accentColor:  '#FFB347',
    grandSlam:    true,
    cornerStyle:  'arc',
    baselineGlow: 'rgba(255,140,40,0.20)',
    floodTint:    '90,30,8',
  },

  // Championships of Albion — Grama clássica, espaçosa, solene
  JUN_GS_ALBION: {
    courtColor:   '#1a6e38',
    courtDark:    '#104825',
    runbackColor: '#062010',
    rbScale:      1.15,
    venueLabel:   'ALBION',
    labelAlpha:   0.07,
    accentColor:  '#A8D8A8',
    grandSlam:    true,
    cornerStyle:  'cross',
    baselineGlow: 'rgba(100,220,130,0.15)',
    floodTint:    '12,60,25',
  },

  // Empire Open — Indoor dramático, roxo elétrico
  AGO_GS_EMPIRE: {
    courtColor:   '#14145e',
    courtDark:    '#0a0a3e',
    runbackColor: '#050520',
    rbScale:      1.25,
    venueLabel:   'EMPIRE',
    labelAlpha:   0.12,
    accentColor:  '#C084FC',
    grandSlam:    true,
    cornerStyle:  'diamond',
    baselineGlow: 'rgba(160,80,255,0.22)',
    floodTint:    '30,10,90',
  },

  // ════════════════════════════════════════════════
  //  MASTERS 1000 — personalidade sutil
  // ════════════════════════════════════════════════

  JAN_M1000_GOLD_COAST: {
    courtColor:   '#1e5caa',
    runbackColor: '#0c1e3a',
    rbScale:      1.10,
    venueLabel:   'GOLD COAST',
    labelAlpha:   0.055,
    accentColor:  '#FFD700',
  },
  MAR_M1000_DESERT: {
    courtColor:   '#2856a0',
    runbackColor: '#10203a',
    rbScale:      1.05,
    venueLabel:   'DESERT',
    labelAlpha:   0.050,
    accentColor:  '#FFA040',
  },
  MAR_M1000_BAY: {
    courtColor:   '#225599',
    runbackColor: '#0e1e36',
    rbScale:      1.08,
    venueLabel:   'BAY CITY',
    labelAlpha:   0.050,
    accentColor:  '#60C0FF',
  },
  MAI_M1000_MONTE: {
    courtColor:   '#be3e0c',
    courtDark:    '#922e08',
    runbackColor: '#601e04',
    rbScale:      0.92,
    venueLabel:   'MONTE ROSSO',
    labelAlpha:   0.055,
    accentColor:  '#FF6633',
  },
  MAI_M1000_ETERNAL: {
    courtColor:   '#c04010',
    runbackColor: '#681808',
    rbScale:      0.95,
    venueLabel:   'ETERNAL CITY',
    labelAlpha:   0.050,
    accentColor:  '#FFAA44',
  },
  AGO_M1000_LAKESHORE: {
    courtColor:   '#155c2e',
    courtDark:    '#0e4020',
    runbackColor: '#061810',
    rbScale:      1.10,
    venueLabel:   'LAKESHORE',
    labelAlpha:   0.055,
    accentColor:  '#88EE88',
  },
  AGO_M1000_ATLANTIC: {
    courtColor:   '#175e30',
    runbackColor: '#081a0e',
    rbScale:      1.05,
    venueLabel:   'ATLANTIC',
    labelAlpha:   0.050,
    accentColor:  '#66DD99',
  },
  OUT_M1000_DRAGON: {
    courtColor:   '#141460',
    courtDark:    '#0c0c46',
    runbackColor: '#070730',
    rbScale:      1.12,
    venueLabel:   'DRAGON CUP',
    labelAlpha:   0.060,
    accentColor:  '#FF4444',
  },
  NOV_M1000_CAPITAL: {
    courtColor:   '#101050',
    runbackColor: '#06062a',
    rbScale:      1.10,
    venueLabel:   'CAPITAL',
    labelAlpha:   0.055,
    accentColor:  '#8888FF',
  },

  // ════════════════════════════════════════════════
  //  ATP FINALS — especial
  // ════════════════════════════════════════════════

  DEZ_ATP_FINALS: {
    courtColor:   '#0e0e4a',
    courtDark:    '#060630',
    runbackColor: '#030320',
    rbScale:      1.30,
    venueLabel:   'ATP FINALS',
    labelAlpha:   0.14,
    accentColor:  '#FFD700',
    grandSlam:    true,
    cornerStyle:  'diamond',
    baselineGlow: 'rgba(255,200,0,0.25)',
    floodTint:    '15,15,80',
  },
};

/** Retorna o override visual do torneio, ou {} se não houver */
export function getVenueOverride(tournamentId) {
  return VENUE_OVERRIDES[tournamentId] ?? {};
}

// ── Ordem para display na UI ──────────────────────────────────────────────────
export const COURT_KEYS = [
  'WIMBLEDON', 'ROLAND_GARROS', 'US_OPEN', 'O2_ARENA',
  'QUEENS_CLUB', 'MONTE_CARLO', 'INDIAN_WELLS', 'BERCY',
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Retorna o config de física mesclado com os defaults de constants.js */
export function getCourtPhysics(courtKey) {
  const court = COURTS[courtKey];
  if (!court) return null;
  return {
    ...court.physics,
    surface: court.meta?.surface ?? court.visual?.surface ?? SURFACE.HARD,
    bounceVariance: court.style?.bounceVariance ?? 0,
    adaptabilityMod: court.style?.adaptabilityMod ?? 0,
  };
}

/** Retorna o config visual para pixelCourt.js */
export function getCourtVisual(courtKey) {
  const court = COURTS[courtKey];
  if (!court) return COURTS.US_OPEN.visual;
  return court.visual;
}

/** Verifica se um estilo é favorecido nessa quadra (+bônus) */
export function isStyleFavored(courtKey, styleId) {
  return COURTS[courtKey]?.style?.favors?.includes(styleId) ?? false;
}

/** Verifica se um estilo é penalizado nessa quadra (-penalidade) */
export function isStylePenalized(courtKey, styleId) {
  return COURTS[courtKey]?.style?.penalizes?.includes(styleId) ?? false;
}

/**
 * Retorna um multiplicador composto para aplicar nos cálculos de jogo.
 * winnerMod, ueRiskMod, rallyLengthMult, serveBonus, staminaDecayMult
 */
export function getCourtStyleMods(courtKey) {
  const s = COURTS[courtKey]?.style;
  if (!s) return {
    serveBonus: 0, rallyLengthMult: 1, staminaDecayMult: 1,
    bounceVariance: 0, adaptabilityMod: 0,
    winnerMod: 1, ueRiskMod: 1,
  };
  return {
    serveBonus:       s.serveBonus       ?? 0,
    rallyLengthMult:  s.rallyLengthMult  ?? 1,
    staminaDecayMult: s.staminaDecayMult ?? 1,
    bounceVariance:   s.bounceVariance   ?? 0,
    adaptabilityMod:  s.adaptabilityMod  ?? 0,
    winnerMod:        s.winnerMod        ?? 1,
    ueRiskMod:        s.ueRiskMod        ?? 1,
    favors:           s.favors           ?? [],
    penalizes:        s.penalizes        ?? [],
  };
}

export default COURTS;
