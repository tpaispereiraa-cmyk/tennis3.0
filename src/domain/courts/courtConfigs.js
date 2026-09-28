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
  STREET:  'STREET',
  CARPET:  'CARPET',
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
      serveBonus:       0.09,   // % de vantagem extra no saque
      rallyLengthMult:  0.78,   // rallies mais curtos
      staminaDecayMult: 0.90,   // menos desgaste físico (pontos rápidos)
      bounceVariance:   0.08,   // irregularidade do bounce (+erro possível)
      adaptabilityMod:  0.15,   // adaptability mitiga a variância
      winnerMod:        1.14,   // winners mais fáceis de fazer
      ueRiskMod:        1.07,   // mas também mais UE por irregularidade
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
      serveBonus:       -0.08,  // saques menos decisivos
      rallyLengthMult:  1.48,   // rallies longos
      staminaDecayMult: 1.22,   // alto desgaste físico
      bounceVariance:   0.02,   // bounce muito consistente
      adaptabilityMod:  0.05,
      winnerMod:        0.78,   // winners difíceis de fazer
      ueRiskMod:        0.89,   // mas menos UE
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
      serveBonus:       0.06,
      rallyLengthMult:  0.89,
      staminaDecayMult: 0.88,  // condições controladas — menos esforço
      bounceVariance:   0.00,  // bounce perfeito
      adaptabilityMod:  -0.05, // adaptability menos relevante (condições fixas)
      winnerMod:        1.10,
      ueRiskMod:        0.95,
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

  URBAN_COURT: {
    meta: {
      name:      'Urban Arena',
      location:  'Urban Classic',
      icon:      '🛣️',
      surface:   SURFACE.STREET,
      tier:      'GRAND_SLAM',
      label:     'Asfalto',
      desc:      'Concreto armado em arena aberta. Bounce altíssimo e firme. Potência e físico decidem. Calor extremo.',
    },
    physics: {
      restitution:     0.88,
      groundFriction:  0.68,
      windFactor:      0.14,  // arena aberta, vento presente
      altitudeFactor:  1.00,
    },
    style: {
      favors:   ['POWER_BASELINER', 'BIG_SERVER', 'AGG_BASELINER', 'TAKEALLRISK'],
      penalizes: ['CTR_PUNCHER', 'RETRIEVER', 'GRINDER'],
      serveBonus:       0.06,
      rallyLengthMult:  0.88,  // pontos mais curtos mas não tão curtos quanto grama
      staminaDecayMult: 1.28,  // calor do asfalto — desgaste máximo
      bounceVariance:   0.04,
      adaptabilityMod:  0.12,
      winnerMod:        1.08,
      ueRiskMod:        1.12,  // asfalto quente aumenta erros
    },
    visual: {
      surface:         SURFACE.STREET,
      courtColor:      '#232323',  // asfalto cinza quase preto
      courtDark:       '#171717',
      runbackColor:    '#0D0D0D',
      lineColor:       'rgba(255,255,255,0.92)',  // linhas brancas vibrantes
      netColor:        '#BDBDBD',
      stripeAlpha:     0,
      turfPattern:     false,
      asphaltPattern:  true,
      badge:           '🛣️ ASFALTO',
      badgeColor:      '#EF9F27',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  CARPET COURT — Grand Slam do Veludo (Carpet)
  // ═══════════════════════════════════════════════════════════════════════════
  CARPET_COURT: {
    meta: {
      name:      'Velvet Palace',
      location:  'Velvet Grand',
      icon:      '🎭',
      surface:   SURFACE.CARPET,
      tier:      'GRAND_SLAM',
      label:     'Veludo',
      desc:      'Tapete têxtil clássico. A superfície mais rápida do circuito. Bounce quase nulo. Ace é moeda comum.',
    },
    physics: {
      restitution:     0.52,
      groundFriction:  0.62,
      windFactor:      0.00,  // fechado
      altitudeFactor:  1.00,
    },
    style: {
      favors:   ['BIG_SERVER', 'SRV_VOL', 'NET_SPECIALIST', 'TAKEALLRISK'],
      penalizes: ['CTR_PUNCHER', 'RETRIEVER', 'GRINDER'],
      serveBonus:       0.16,   // saque é dominante — mais que grama
      rallyLengthMult:  0.62,   // rallies curtíssimos
      staminaDecayMult: 0.80,   // pontos rápidos — desgaste mínimo
      bounceVariance:   0.01,   // bounce perfeitamente consistente
      adaptabilityMod:  0.08,
      winnerMod:        1.28,   // winners são muito fáceis de fazer
      ueRiskMod:        0.88,
    },
    visual: {
      surface:         SURFACE.CARPET,
      courtColor:      '#D8C49A',  // veludo bege claro
      courtDark:       '#B89D69',
      runbackColor:    '#8A7047',
      lineColor:       'rgba(55,42,28,0.82)',  // linhas escuras para contraste no bege
      netColor:        '#6E5638',
      stripeAlpha:     0.030,
      carpetPattern:   true,
      turfPattern:     false,
      badge:           '🎭 VELUDO',
      badgeColor:      '#D8C49A',
    },
  },


};

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
    // ── Placas de publicidade temáticas ──────────────────────────────
    advertisingTheme: {
      // Paleta noturna: azul royal + dourado + branco
      panels: [
        { bg:'#0d2a6e', text:'#FFD700', label:'MERIDIAN' },
        { bg:'#FFD700', text:'#0d2a6e', label:'OPEN' },
        { bg:'#102050', text:'#FFFFFF', label:'ROLEX' },
        { bg:'#1a3e80', text:'#FFD700', label:'MERIDIAN' },
        { bg:'#0a1a40', text:'#C8D8FF', label:'IBM' },
        { bg:'#FFD700', text:'#050e28', label:'NITTO' },
        { bg:'#0e2558', text:'#FFFFFF', label:'INFOSYS' },
        { bg:'#152d70', text:'#FFD700', label:'MERIDIAN' },
      ],
      slamName: 'MERIDIAN OPEN',
      slamColor: '#FFD700',
    },
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
    // ── Placas de publicidade temáticas ──────────────────────────────
    advertisingTheme: {
      // Paleta terra: laranja saibro + verde Occitane + creme
      panels: [
        { bg:'#8a2e08', text:'#FFD700', label:'OCCITANE' },
        { bg:'#c84a10', text:'#FFFFFF', label:'ROLAND' },
        { bg:'#2d5a1b', text:'#FFCA7A', label:'PERRIER' },
        { bg:'#FFB347', text:'#5c1e04', label:'OCCITANE' },
        { bg:'#6b2208', text:'#FFD580', label:'BNP' },
        { bg:'#1a4010', text:'#FF8844', label:'ROLAND' },
        { bg:'#c84a10', text:'#FFF0D0', label:'LAVAZZA' },
        { bg:'#3a1205', text:'#FFB870', label:'OCCITANE' },
      ],
      slamName: "ROLAND D'OCCITANE",
      slamColor: '#FFB347',
    },
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
    // ── Placas de publicidade temáticas ──────────────────────────────
    advertisingTheme: {
      // Paleta britânica: verde grama + roxo + branco + dourado
      panels: [
        { bg:'#1a5c30', text:'#FFFFFF', label:'ALBION' },
        { bg:'#FFFFFF', text:'#1a5c30', label:'CHAMPIONSHIPS' },
        { bg:'#4B0082', text:'#A8D8A8', label:'ALBION' },
        { bg:'#155028', text:'#E8FFE8', label:'ROLEX' },
        { bg:'#FFFFFF', text:'#4B0082', label:'EVIAN' },
        { bg:'#0d3a1c', text:'#A8D8A8', label:'ALBION' },
        { bg:'#4B0082', text:'#FFFFFF', label:'PIMM\'S' },
        { bg:'#1a6e38', text:'#FFFFFF', label:'CHAMPIONSHIPS' },
      ],
      slamName: 'CHAMPIONSHIPS OF ALBION',
      slamColor: '#A8D8A8',
    },
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
    // ── Placas de publicidade temáticas ──────────────────────────────
    advertisingTheme: {
      // Paleta urbana noturna: roxo elétrico + amarelo néon + cinza
      panels: [
        { bg:'#1a0050', text:'#C084FC', label:'EMPIRE' },
        { bg:'#C084FC', text:'#0a0030', label:'OPEN' },
        { bg:'#0a0a3e', text:'#FFEE44', label:'EMPIRE' },
        { bg:'#200060', text:'#FFFFFF', label:'EMIRATES' },
        { bg:'#FFEE44', text:'#0a0030', label:'OPEN' },
        { bg:'#14145e', text:'#C084FC', label:'HEINEKEN' },
        { bg:'#2a0080', text:'#FFEE44', label:'EMPIRE' },
        { bg:'#0d0d4a', text:'#C084FC', label:'OPPO' },
      ],
      slamName: 'EMPIRE OPEN',
      slamColor: '#C084FC',
    },
  },

  // ── Calendário de seis Slams (IDs atuais) ───────────────────────────────
  // O piso continua vindo de courtKey. Estes perfis cuidam somente da arena.
  B1_GS_MERIDIAN: {
    courtColor:'#1767bd', courtDark:'#0b3f86', runbackColor:'#071d3d', rbScale:1.20,
    venueLabel:'MERIDIAN', labelAlpha:0.105, accentColor:'#7FDBFF', grandSlam:true,
    cornerStyle:'diamond', baselineGlow:'rgba(110,220,255,0.22)', floodTint:'42,132,220',
    arena:{ style:'coastal-modern', tiers:4, roof:'open', scoreboard:'panorama', density:0.96,
      standPalette:['#06264b','#0b4b78','#117ca2','#e8f7ff'], aisleColor:'#d7edf5', vipColor:'#76d7ff',
      lightTemperature:'daylight', signature:'sun-disc', trim:'#78ddff' },
    personnel:{ primary:'#0d5c9d', secondary:'#ffffff', roleRing:'#79e5ff', lineJudge:'#12395c' },
    surfaceFx:{ serviceContrast:0.14, wear:0.82, sheen:0.10 },
    advertisingTheme:{ panels:[
      {bg:'#052c58',text:'#7FDBFF',label:'MERIDIAN'}, {bg:'#eafaff',text:'#07558a',label:'OPEN'},
      {bg:'#0879ae',text:'#ffffff',label:'HORIZON'}, {bg:'#073f70',text:'#7FDBFF',label:'MERIDIAN'},
      {bg:'#f4c45e',text:'#092a45',label:'SOLAR'}, {bg:'#0b5686',text:'#ffffff',label:'PACIFIC'}
    ], slamName:'MERIDIAN OPEN', slamColor:'#48cfff' },
  },
  B2_GS_TERRA: {
    courtColor:'#c4511b', courtDark:'#96340e', runbackColor:'#5b210a', rbScale:0.91,
    venueLabel:'TERRA MAGNA', labelAlpha:0.075, accentColor:'#f4cf9a', grandSlam:true,
    cornerStyle:'arc', baselineGlow:'rgba(255,176,91,0.20)', floodTint:'116,48,15',
    arena:{ style:'clay-terraces', tiers:3, roof:'terraced', scoreboard:'classic', density:0.94,
      standPalette:['#264424','#3f622f','#7f2d13','#ead8b7'], aisleColor:'#c9b692', vipColor:'#f1c76f',
      lightTemperature:'warm', signature:'clay-arches', trim:'#f1c28a', flowerBeds:true },
    personnel:{ primary:'#315f35', secondary:'#f4e4c6', roleRing:'#ffb46a', lineJudge:'#693018' },
    surfaceFx:{ serviceContrast:0.045, wear:1.30, sheen:0.00 },
    advertisingTheme:{ panels:[
      {bg:'#7f2b0c',text:'#f7d08b',label:'TERRA MAGNA'}, {bg:'#31542b',text:'#fff0d2',label:'OCCITANE'},
      {bg:'#d05b20',text:'#ffffff',label:'MAGNA'}, {bg:'#f0c17d',text:'#54200b',label:'TERRE'},
      {bg:'#243f22',text:'#f6c477',label:'PERRIER'}, {bg:'#99370e',text:'#fff1d9',label:'OCCITANE'}
    ], slamName:'TERRA MAGNA', slamColor:'#e17131' },
  },
  B3_GS_HIGHLAND: {
    courtColor:'#23733a', courtDark:'#155029', runbackColor:'#082a18', rbScale:1.14,
    venueLabel:'THE HIGHLAND', labelAlpha:0.060, accentColor:'#f4f0df', grandSlam:true,
    cornerStyle:'cross', baselineGlow:'rgba(224,255,220,0.15)', floodTint:'24,91,44',
    arena:{ style:'heritage-garden', tiers:3, roof:'heritage-canopy', scoreboard:'manual', density:0.92,
      standPalette:['#173f29','#265a37','#f1eee1','#58316f'], aisleColor:'#d7d1bd', vipColor:'#d6bf78',
      lightTemperature:'soft-day', signature:'ivy-crown', trim:'#f0ead8', flowerBeds:true },
    personnel:{ primary:'#f4f0e4', secondary:'#315c3b', roleRing:'#6d3f86', lineJudge:'#f1eee5' },
    surfaceFx:{ serviceContrast:0.025, wear:1.45, sheen:0.00 },
    advertisingTheme:{ panels:[
      {bg:'#16482b',text:'#ffffff',label:'HIGHLAND'}, {bg:'#f5f2e7',text:'#204f31',label:'CHAMPIONSHIPS'},
      {bg:'#573176',text:'#ffffff',label:'ALBION'}, {bg:'#1d5c35',text:'#e8f2e7',label:'HIGHLAND'},
      {bg:'#f5f2e7',text:'#573176',label:'TRADITION'}, {bg:'#123b23',text:'#ffffff',label:'ALBION'}
    ], slamName:'THE HIGHLAND', slamColor:'#f2eee2' },
  },
  B4_GS_URBAN: {
    courtColor:'#30343b', courtDark:'#1a1d22', runbackColor:'#080a0d', rbScale:1.10,
    venueLabel:'URBAN CLASSIC', labelAlpha:0.105, accentColor:'#ffde35', grandSlam:true,
    cornerStyle:'cross', baselineGlow:'rgba(255,222,53,0.24)', floodTint:'45,60,88',
    arena:{ style:'urban-industrial', tiers:4, roof:'steel-grid', scoreboard:'led-ribbon', density:0.98,
      standPalette:['#111820','#26313b','#e5483f','#f4d735'], aisleColor:'#52606b', vipColor:'#ffdd35',
      lightTemperature:'night', signature:'neon-grid', trim:'#ffdf35' },
    personnel:{ primary:'#151a1f', secondary:'#ffdf35', roleRing:'#ff4f45', lineJudge:'#35424c' },
    surfaceFx:{ serviceContrast:0.075, wear:1.10, sheen:0.04 },
    advertisingTheme:{ panels:[
      {bg:'#0d1116',text:'#ffdf35',label:'URBAN'}, {bg:'#ffdf35',text:'#11151a',label:'CLASSIC'},
      {bg:'#e5433a',text:'#ffffff',label:'METRO'}, {bg:'#162938',text:'#63d8ff',label:'NIGHTLINE'},
      {bg:'#222831',text:'#ffdf35',label:'URBAN'}, {bg:'#f1f1ed',text:'#171b20',label:'CITY'}
    ], slamName:'URBAN CLASSIC', slamColor:'#ffdd35' },
  },
  B5_GS_VELVET: {
    courtColor:'#c9af78', courtDark:'#967646', runbackColor:'#382815', rbScale:1.18,
    venueLabel:'VELVET GRAND', labelAlpha:0.090, accentColor:'#f5dfaa', grandSlam:true,
    cornerStyle:'arc', baselineGlow:'rgba(255,224,166,0.23)', floodTint:'112,77,34',
    arena:{ style:'art-deco-palace', tiers:3, roof:'vaulted', scoreboard:'art-deco', density:0.91,
      standPalette:['#321c27','#633447','#b28a55','#ead8aa'], aisleColor:'#a88758', vipColor:'#f1d48f',
      lightTemperature:'amber', signature:'deco-fans', trim:'#e6c579' },
    personnel:{ primary:'#5a2c3d', secondary:'#e7cd91', roleRing:'#f6dea2', lineJudge:'#40222f' },
    surfaceFx:{ serviceContrast:0.055, wear:0.62, sheen:0.13 },
    advertisingTheme:{ panels:[
      {bg:'#3b1e2b',text:'#eacb88',label:'VELVET'}, {bg:'#d5b878',text:'#3a2028',label:'GRAND'},
      {bg:'#704258',text:'#f8e8bd',label:'PALACE'}, {bg:'#24141c',text:'#dcbf80',label:'VELVET'},
      {bg:'#b08d55',text:'#28151e',label:'ATELIER'}, {bg:'#4b2937',text:'#f3ddb0',label:'IMPERIAL'}
    ], slamName:'VELVET GRAND', slamColor:'#d9bb78' },
  },
  B6_GS_CRYSTAL: {
    courtColor:'#24246f', courtDark:'#101044', runbackColor:'#050517', rbScale:1.26,
    venueLabel:'CRYSTAL EMPIRE', labelAlpha:0.115, accentColor:'#b5f2ff', grandSlam:true,
    cornerStyle:'diamond', baselineGlow:'rgba(160,226,255,0.25)', floodTint:'47,35,130',
    arena:{ style:'crystal-dome', tiers:5, roof:'crystal-dome', scoreboard:'halo', density:1.0,
      standPalette:['#090927','#17175d','#3b2a82','#b9efff'], aisleColor:'#32307a', vipColor:'#d6f8ff',
      lightTemperature:'cool-night', signature:'crystal-crown', trim:'#a9edff' },
    personnel:{ primary:'#19185a', secondary:'#b8efff', roleRing:'#cb9cff', lineJudge:'#2f2d79' },
    surfaceFx:{ serviceContrast:0.10, wear:0.50, sheen:0.18 },
    advertisingTheme:{ panels:[
      {bg:'#11104b',text:'#b9efff',label:'CRYSTAL'}, {bg:'#a8ecff',text:'#17144f',label:'EMPIRE'},
      {bg:'#3a2480',text:'#ffffff',label:'CROWN'}, {bg:'#17155d',text:'#cb9cff',label:'CRYSTAL'},
      {bg:'#5b38a0',text:'#dffaff',label:'AURORA'}, {bg:'#09082e',text:'#b9efff',label:'EMPIRE'}
    ], slamName:'CRYSTAL EMPIRE', slamColor:'#a9edff' },
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

const LEGACY_VENUE_ALIASES = Object.freeze({
  JAN_GS_MERIDIAN:'B1_GS_MERIDIAN', MAI_GS_ROLAND:'B2_GS_TERRA',
  JUN_GS_ALBION:'B3_GS_HIGHLAND', AGO_GS_EMPIRE:'B6_GS_CRYSTAL',
});

const GENERIC_VENUE_PROFILES = Object.freeze({
  CLUB: { venueTier:'CLUB', rbScale:0.76, arena:{ tiers:1, density:0.38, style:'club', roof:'open', scoreboard:'compact', standPalette:['#17212a','#25333d','#53616a'], aisleColor:'#303a42', vipColor:'#78909c', trim:'#8aa0ad' }, personnel:{ primary:'#263746', secondary:'#d9e2e7', roleRing:'#78a7bd', lineJudge:'#334955' } },
  CHALLENGER: { venueTier:'CHALLENGER', rbScale:0.88, arena:{ tiers:2, density:0.62, style:'regional', roof:'open', scoreboard:'compact', standPalette:['#10233c','#24486a','#6d7d89'], aisleColor:'#344858', vipColor:'#b3c4ce', trim:'#8eb3c7' }, personnel:{ primary:'#173c59', secondary:'#e8f0f4', roleRing:'#71b9dc', lineJudge:'#294b61' } },
  TOUR: { venueTier:'TOUR', rbScale:1.0, arena:{ tiers:3, density:0.80, style:'tour', roof:'canopy', scoreboard:'panorama', standPalette:['#0d1f55','#6b1010','#252a31','#c6ccd0'], aisleColor:'#32383e', vipColor:'#d3ad58', trim:'#90a4ae' }, personnel:{ primary:'#143f72', secondary:'#f1f5f7', roleRing:'#60b8e8', lineJudge:'#263d50' } },
  MAJOR: { venueTier:'MAJOR', rbScale:1.10, arena:{ tiers:4, density:0.92, style:'major', roof:'architectural', scoreboard:'ribbon', standPalette:['#11194a','#612034','#29333b','#d7dde0'], aisleColor:'#3c4650', vipColor:'#e0bd67', trim:'#b0c4cf' }, personnel:{ primary:'#182e63', secondary:'#ffffff', roleRing:'#e0bd67', lineJudge:'#2a3b4d' } },
});

function inferVenueTier(tournamentId = '') {
  const id = String(tournamentId).toUpperCase();
  if (id.includes('_GS_') || id.includes('ATP_FINALS') || id.includes('_M1000_')) return 'MAJOR';
  if (id.includes('_500_') || id.includes('_250_') || id.includes('OLYMP')) return 'TOUR';
  if (id.includes('_CH100_') || id.includes('_CH75_') || id.includes('_CH50_') || id.includes('_CH25_')) return 'CHALLENGER';
  if (id.includes('_JR') || id.includes('JUNIOR') || id.includes('PROSPECT')) return 'CLUB';
  return 'TOUR';
}

/** Retorna uma arena completa: base por categoria + identidade específica. */
export function getVenueOverride(tournamentId) {
  const id = String(tournamentId ?? '');
  const resolvedId = LEGACY_VENUE_ALIASES[id] ?? id;
  const specific = VENUE_OVERRIDES[resolvedId] ?? {};
  const generic = GENERIC_VENUE_PROFILES[inferVenueTier(resolvedId)] ?? GENERIC_VENUE_PROFILES.TOUR;
  return {
    ...generic,
    ...specific,
    arena: { ...generic.arena, ...(specific.arena ?? {}) },
    personnel: { ...generic.personnel, ...(specific.personnel ?? {}) },
    surfaceFx: { ...(specific.surfaceFx ?? {}) },
  };
}

// ── Ordem para display na UI ──────────────────────────────────────────────────
export const COURT_KEYS = [
  'WIMBLEDON', 'ROLAND_GARROS', 'US_OPEN', 'O2_ARENA', 'URBAN_COURT', 'CARPET_COURT',
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
