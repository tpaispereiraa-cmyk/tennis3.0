// ============================================
// ARENA CONFIGURATIONS
// Configurações de todas as 12 arenas do jogo
// ============================================

export const ARENA_CONFIGS = {
  BB10_COMPETITIVE: {
    name: 'BB-10 Competitive',
    type: 'circular',
    competitive: true,
    zones: {
      centerBowl: 40,
      innerSlope: 110,
      tornadoRidge: 160,
      outerSlope: 195,
      wall: 221,
    },
    // Exits = aberturas para os pockets (ficam FECHADAS nos primeiros 2s)
    exits: [
      { angle: Math.PI / 2,                       width: 30 }, // Baixo
      { angle: Math.PI / 2 + (2 * Math.PI / 3),   width: 30 }, // Cima-esquerda
      { angle: Math.PI / 2 + (4 * Math.PI / 3),   width: 30 }, // Cima-direita
    ],
    exitsOpen: false,       // Portas fechadas no início
    exitsOpenTime: 2.0,     // Abrem em 2 segundos
    exitRing: null,
    gracePeriod: {
      enabled: true,
      duration: 2.0,          // 2s de graça
      exitMultiplier: 0,      // Saídas bloqueadas durante graça
      wallRingOutDisabled: true
    },
    // Pockets: formas triangulares visuais que se projetam para fora da parede
    pockets: [
      { angle: Math.PI / 2,                       width: 30, depth: 50, ringOutRadius: 18 },
      { angle: Math.PI / 2 + (2 * Math.PI / 3),   width: 30, depth: 50, ringOutRadius: 18 },
      { angle: Math.PI / 2 + (4 * Math.PI / 3),   width: 30, depth: 50, ringOutRadius: 18 },
    ],
    wallRingOut: false,   // NUNCA ring-out pela parede sólida — só pelos pockets
    sweetSpots: [],
    colors: {
      // Floor layers (dark theme)
      floor:      '#0d0f12',
      floorMid:   '#111418',
      floorInner: '#0f1216',
      center:     '#131720',
      inner:      '#0e1219',
      ridge:      '#111520',
      outer:      '#0d1018',
      wall:       '#0a0c10',
      // Green ring
      ringOuter:  '#2a8a00',
      ringMid:    '#3ebc10',
      ringInner:  '#5ae030',
      ringShine:  '#90ff60',
      // Pockets
      pocket:     '#0a0c10',
      pocketBody: '#181c24',
      pocketFrame:'#2a3040',
      pocketBolt: '#8899aa',
      // Doors
      door:       '#dd1800',
      doorGlow:   '#ff3300',
      doorYellow: '#ffcc00',
      // White center ring
      centerRing: 'rgba(255,255,255,0.85)',
    }
  },
  VOLCANIC_RAGE: {
    name: 'Volcanic Rage',
    type: 'bowl',

    // ── ZONAS ──────────────────────────────────────────────────
    zones: {
      magmaCore:     50,   // r0–50   : Magma Core (fricção mínima, calor máximo)
      lavaFlowRing: 140,   // r50–140 : Lava River Ring (rios giratórios)
      obsidianBelt: 190,   // r140–190: Obsidian Belt (corrente orbital)
      craterEdge:   221,   // r190–221: Crater Edge + fissuras rotativas
      wall:         221,
    },

    // ── FRICÇÃO — lava rock é escorregadio ─────────────────────
    // 0.997/frame = blades mantêm momentum, parecem deslizar
    frictionGradient: {
      magmaCore:    { radius:  50, friction: 0.998 }, // fundido — quasi sem atrito
      lavaFlowRing: { radius: 140, friction: 0.997 }, // escorregadio
      obsidianBelt: { radius: 190, friction: 0.996 }, // pedra polida
      craterEdge:   { radius: 221, friction: 0.995 }, // rocha rugosa
    },

    // ── FÍSICA BASE ────────────────────────────────────────────
    friction:            0.997,
    knockbackMultiplier: 1.15,
    weightAdvantage:     1.2,
    balanceResistance:   1.1,
    gravityModifier:     1.0,

    // ── SISTEMA DE CALOR ───────────────────────────────────────
    heatSystem: {
      level:             0,
      maxLevel:        100,
      gainPerSecond:     3,    // +3/s passivo → eruption mínima em ~33s
      gainOnCollision:   8,    // +8 por colisão forte
      gainOnCenterIdle:  5,    // +5/s bey parada no Magma Core
      gainOnLavaRiver:   3,    // +3/s bey dentro do rio de lava
      resetTo:          35,    // Heat reseta para 35 pós-erupção
    },

    // ── ERUPTION — choque explosivo curto ──────────────────────
    // Força alta + duração curta = impacto, não barreira
    eruptionEvent: {
      active:       false,
      startTime:    0,
      duration:     0.6,   // curta: é um choque, não uma barreira sustentada
      outwardForce: 12.0,  // forte, mas só por 0.6s
      // Lava Bombs: SEMPRE 3–5 pós-erupção (não aleatório)
      lavaBombs: {
        count:          3,   // mínimo garantido
        countMax:       5,
        knockback:      3.5,
        staminaDrain:   8,
        stabilityDrain: 5,
        radius:        25,
        lifetime:       2.5,
      },
    },

    // ── RIOS DE LAVA ROTATIVOS ─────────────────────────────────
    // 3 braços que giram lentamente, empurrando tangencialmente
    lavaRivers: {
      count:         3,          // 3 rios a 120° entre si
      rotationSpeed: 0.18,       // rad/s — uma volta em ~35s
      armWidth:      28,         // largura angular de cada braço (graus)
      armLength:     [55, 135],  // extensão radial: do magmaCore ao lavaFlowRing
      // Efeito sobre bey dentro do rio
      pushForce:     1.8,        // força tangencial (na direção da rotação)
      staminaDrain:  2,          // -2%/s de stamina
      // A corrente acelera a bey — não freia!
    },

    // ── OBSIDIAN BELT — corrente orbital ──────────────────────
    // Beys nessa zona ganham empurrão tangencial suave (como óleo)
    obsidianCurrent: {
      tangentialForce: 0.4,   // força orbital por frame
      direction:       1,     // 1=CCW, -1=CW (mesmo sentido dos rios)
      frictionBoost:   0.001, // adiciona 0.001 ao friction (mais aderência aqui)
    },

    // ── FISSURAS ROTATIVAS ─────────────────────────────────────
    // 2 fissuras que giram ao redor da borda — visível, previsível, perigoso
    fissureSystem: {
      count:              2,
      width:              40,       // mais largas = mais legíveis
      openDelay:          4.0,      // fechadas nos primeiros 4s
      open:               false,
      rotationSpeed:      (2 * Math.PI) / 25,  // uma volta em 25s
      baseAngle:          0,        // ângulo inicial (dinâmico em runtime)
      // Submersão
      submersionDuration: 1.8,
      spinDrainPerSec:    12,
      dragMultiplier:     0.88,
      heavyEscapeBonus:   0.25,
    },

    exits:   [],
    pockets: [],

    // ── CORES ──────────────────────────────────────────────────
    colors: {
      magmaCore:    '#ff7700',
      lavaRiver:    '#ff4400',
      lavaGlow:     '#ff9900',
      obsidianBelt: '#2a0f28',
      craterEdge:   '#1a0810',
      wall:         '#0e0408',
      eruption:     '#ffee00',
      fissure:      '#ff3300',
      coreCenter:   '#ffff99',
    },
  },
  KILLER_SIDES: {
    name: 'Killer Sides Arena',
    type: 'circular',
    zones: {
      centerBowl: 39,      // Same as BB10_COMPETITIVE
      innerSlope: 104,      // Same as BB10_COMPETITIVE
      tornadoRidge: 163,   // Same as BB10_COMPETITIVE
      outerSlope: 195,     // Same as BB10_COMPETITIVE
      gripRadius: 202,     // Circular grip track radius
      wall: 221            // Same as BB10_COMPETITIVE
    },
    exits: [],
    pockets: [],
    // Grip mechanics
    gripVelocityThreshold: 6.9,  // Velocity to escape grip
    gripRampAngle: 0,             // Ramp position (radians, 0 = right)
    gripRampWidth: 0.4,           // Ramp gap width (radians, ~23°)
    colors: {
      center: '#6a7b8f',
      inner: '#5a6b7f',
      ridge: '#6b7a94',
      outer: '#4a5568',
      wall: '#3a4556',
      grip: '#10b981',    // Green grip
      ramp: '#ef4444'     // Red ramp
    }
  },
  NEXUS: {
    name: 'Prismatic Nexus Arena',
    type: 'octagonal',
    zones: {
      centerSafe: 52,
      mainArea: 182,
      wall: 215
    },
    portals: [
      { id: 0, angle: 0, radius: 195, color: '#00d4ff', active: true, cooldown: 0 },           // Norte (Azul)
      { id: 1, angle: Math.PI / 2, radius: 195, color: '#ff00ff', active: true, cooldown: 0 }, // Leste (Rosa)
      { id: 2, angle: Math.PI, radius: 195, color: '#00ff88', active: true, cooldown: 0 },     // Sul (Verde)
      { id: 3, angle: -Math.PI / 2, radius: 195, color: '#ffd700', active: true, cooldown: 0 } // Oeste (Dourado)
    ],
    portalSuction: {
      enabled: true,
      interval: 7.0,              // Suck every 7 seconds
      lastSuctionTime: 0,
      duration: 1.5,              // Suction lasts 1.5 seconds
      currentlyActive: false,
      activePortal: null,
      suctionStartTime: 0
    },
    colors: {
      floor: '#1a1a2e',
      center: '#2d2d44',
      main: '#252538',
      wall: '#3a3a5a',
      grid: '#4a4a6a'
    }
  },
  COLOSSEUM_CARNAGE: {
    // ═══════════════════════════════════════════════════════════════════
    // CARNAGE COLOSSEUM — Redesign Completo
    // Arena oval estilo Coliseu Romano. Aos 3s, um evento é sorteado
    // (1 de 8, mesma probabilidade) e domina o round inteiro.
    // ═══════════════════════════════════════════════════════════════════
    name: 'Carnage Colosseum',
    type: 'oval',

    // ── GEOMETRIA OVAL ───────────────────────────────────────────────
    // Eixo horizontal (a) e vertical (b) — usados na física e no draw
    zones: {
      wallA: 255,    // semi-eixo maior (horizontal) — borda de jogo
      wallB: 148,    // semi-eixo menor (vertical)   — borda de jogo
      outerA: 285,   // semi-eixo maior visual (pedra)
      outerB: 170,   // semi-eixo menor visual (pedra)
    },

    // ── PORTÕES ─────────────────────────────────────────────────────
    // A = esquerda (oeste), B = direita (leste)
    gates: {
      A: { open: false, openTime: null },
      B: { open: false, openTime: null },
    },

    // ── MECÂNICA PERMANENTE: CHÃO QUE AFUNDA ────────────────────────
    // A cada 5s o chão afunda como funil por 1s (puxando peões ao centro)
    // depois sobe de volta em 1s. Ocorre em TODO round, independente do evento.
    floorSink: {
      interval:      5.0,   // ciclo: afunda a cada 5s
      sinkDuration:  1.0,   // duração do afundamento
      riseDuration:  1.0,   // duração do retorno
      phase:         'flat',      // 'flat' | 'sinking' | 'rising'
      timer:         0.0,         // contador dentro da fase atual
      depth:         0.0,         // 0.0 = plano, 1.0 = funil máximo
      pullForce:     0.55,        // força de atração ao centro quando afundando
      idleTimer:     4.5,         // começa a contar antes para impactar logo
    },

    // ── SISTEMA DE EVENTOS ─────────────────────────────────────────
    carnageEvent: {
      revealed:    false,
      revealTime:  3.0,
      activeEvent: null,  // definido no reveal

      // Pool de 8 eventos — mesma probabilidade (12.5% cada)
      events: [
        'INFERNO_WALLS',
        'PHANTOM_PAIR',
        'THE_CHAMPION',
        'FROZEN_GROUND',
        'BLOOD_MOON',
        'SANDSTORM',
        'THE_EXECUTIONER',
        'DIVINE_JUDGMENT',
      ],

      // ── Estado: PHANTOM_PAIR ──────────────────────────────────────
      // Dois peões brancos entram pelos portões — derrota = recuperação total
      phantomBlades: [],
      // {x, y, vx, vy, radius:18, hp:80, alive:true, type:'phantom'}

      // ── Estado: THE_CHAMPION ─────────────────────────────────────
      // Um peão 2x tamanho entra rápido — neutro, ataca ambos
      championBlade: null,
      // {x, y, vx, vy, radius:36, hp:200, alive:true, type:'champion'}

      // ── Estado: SANDSTORM ─────────────────────────────────────────
      sandstorm: {
        direction:       1,     // 1 = horário, -1 = anti-horário
        timer:           0,     // tempo desde última troca
        switchInterval:  8.0,   // troca de sentido a cada 8s
        force:           0.12,  // força tangencial aplicada por frame
      },

      // ── Estado: THE_EXECUTIONER ───────────────────────────────────
      // Paredes comprimem aos 15s e 30s após o reveal
      executioner: {
        currentA:       255,    // wallA efetivo atual (diminui nas compressões)
        phase:          0,      // 0=aguardando, 1=primeira feita, 2=segunda feita
        animating:      false,
        animTimer:      0,
        animDuration:   2.5,    // duração da animação de compressão (s)
        startA:         255,    // para interpolação
        targetA:        255,    // alvo de currentA
        firstAt:        15.0,   // primeira compressão após reveal (s)
        secondAt:       30.0,   // segunda compressão após reveal (s)
        firstTargetA:   195,    // semi-eixo após 1ª compressão
        secondTargetA:  138,    // semi-eixo após 2ª compressão
      },

      // ── Estado: DIVINE_JUDGMENT ───────────────────────────────────
      // Raios caem em posições aleatórias com efeitos sorteados
      divine: {
        strikes:          [],    // [{x, y, age, effect, radius, color}]
        nextStrikeTimer:  0,     // contador até próximo raio
        strikeInterval:   3.5,   // raio a cada 3.5s
        warningDuration:  0.8,   // aviso visual antes do raio
        warnings:         [],    // [{x, y, age}]
        effects: ['SPIN_BOOST','SPIN_DRAIN','STAMINA_BOOST','STAMINA_DRAIN','KNOCKBACK','INVISIBILITY','SHIELD','CHAOS'],
      },
    },

    exits:   [],
    pockets: [],

    // ── PALETA DE CORES ─────────────────────────────────────────────
    colors: {
      // Chão de areia
      sand:       '#c4934a',
      sandLight:  '#e0b870',
      sandDark:   '#9a6a30',
      sandCenter: '#d4a85a',
      // Paredes de pedra
      stoneOuter: '#2d2010',
      stoneMid:   '#3d2c1a',
      stoneInner: '#4a3420',
      stoneEdge:  '#5a4028',
      stoneAccent:'#6a5030',
      // Portões
      gateA:      '#8b0000',
      gateB:      '#8b0000',
      gateOpen:   '#ff2200',
      // Eventos
      evInferno:   '#ff4400',
      evPhantom:   '#c8c8ff',
      evChampion:  '#ffd700',
      evIce:       '#88ddff',
      evBloodMoon: '#220011',
      evSandstorm: '#c4934a',
      evExecutioner: '#cc2222',
      evDivine:    '#44ffee',
    },
  },
  PANGEA_PLATFORM: {
    name: 'Pangea Platform Stadium',
    type: 'circular',
    zones: {
      centerStable: 40,
      plateZone: 180,
      wall: 221
    },
    plates: [
      { id: 0, angle: 0, velocity: 0.28, direction: 1, currentAngle: 0 },             // AUMENTADO ~2x
      { id: 1, angle: Math.PI/3, velocity: 0.32, direction: -1, currentAngle: Math.PI/3 },
      { id: 2, angle: 2*Math.PI/3, velocity: 0.25, direction: 1, currentAngle: 2*Math.PI/3 },
      { id: 3, angle: Math.PI, velocity: 0.30, direction: -1, currentAngle: Math.PI },
      { id: 4, angle: 4*Math.PI/3, velocity: 0.27, direction: 1, currentAngle: 4*Math.PI/3 },
      { id: 5, angle: 5*Math.PI/3, velocity: 0.31, direction: -1, currentAngle: 5*Math.PI/3 }
    ],
    seismic: {
      interval: 8.0,              // REDUZIDO de 12s → 8s
      duration: 2.0,              // AUMENTADO de 1.5s → 2.0s
      intensity: 7.0,             // DOBRADO de 3.5 → 7.0
      warningTime: 1.5,           // NOVO - aviso antes
      lastQuakeTime: 0,
      active: false,
      activeTimer: 0,
      warningActive: false,
      warningStartTime: 0,
      // NOVO: Aftershocks
      aftershocks: {
        enabled: true,
        count: 3,                 // 3 aftershocks
        delay: 0.8,               // 0.8s entre cada
        intensity: 3.0,           // Mais fracos
        currentAftershock: 0,
        lastAftershockTime: 0
      },
      // NOVO: Fissures
      fissures: {
        enabled: true,
        chance: 0.20,             // 20% chance de abrir fenda
        activeFissures: [],
        fissureWidth: 20,         // 20px width
        duration: 2.0             // Dura durante o earthquake
      }
    },
    exits: [],
    pockets: [],
    colors: {
      center: '#2d5016',
      plates: ['#4a6b2a', '#3a5b1a', '#5a7b3a', '#3a5b2a', '#4a6b1a', '#5a7b2a'],
      faultLine: '#8b4513',
      wall: '#6b8b3a',
      quake: '#ff6b6b',
      fissure: '#ff0000'
    }
  },
  PINBALL_INFERNO: {
    name: 'Pinball Inferno',
    type: 'pinball_v3',
    arenaRadius: 330,
    // ── 4 diagonal bumpers — perto das bordas (~266px do centro, borda em 288) ──
    bumpers: [
      { id: 0, x: -198, y: -177, radius: 22, bounceForce: 12.0, cooldown: 0, active: false }, // top-left
      { id: 1, x:  198, y: -177, radius: 22, bounceForce: 12.0, cooldown: 0, active: false }, // top-right
      { id: 2, x: -226, y:  140, radius: 22, bounceForce: 12.0, cooldown: 0, active: false }, // bottom-left
      { id: 3, x:  226, y:  140, radius: 22, bounceForce: 12.0, cooldown: 0, active: false }, // bottom-right
    ],
    // ── Center score bumper — elastic bounce + 1000 pts ─────────────
    centerBumper: {
      x: 0, y: 0, radius: 28,
      pointsPerHit: 1000,
      pointsGoal: 12000,
      cooldown: 0,
      maxCooldown: 0.3,
      multiplierStreak: 3, // 3 consecutive center hits → next hit = 2000 pts
    },
    // ── Flippers at bottom ───────────────────────────────────────────
    flippers: [
      { id: 'left',  x: -110, y: 290, angle:  Math.PI / 5, launchPower: 20, triggerRadius: 40, cooldown: 0, maxCooldown: 1.5, active: false },
      { id: 'right', x:  110, y: 290, angle: -Math.PI / 5, launchPower: 20, triggerRadius: 40, cooldown: 0, maxCooldown: 1.5, active: false },
    ],
    // ── Ring out gap ─────────────────────────────────────────────────
    ringOutGap: { x: 0, y: 310, width: 104, height: 40 },
    // ── Gravity ──────────────────────────────────────────────────────
    gravity: { strength: 0.10 },
    // ── Score state (reset on battle start) ─────────────────────────
    score: { b1: 0, b2: 0 },
    consecutiveCenterHits: { b1: 0, b2: 0 },
    centerBumperCooldownB1: 0,
    centerBumperCooldownB2: 0,
    // ── Colors ───────────────────────────────────────────────────────
    colors: {
      wall:         '#ff2d78',
      floor:        '#040010',
      gridCyan:     '#00f5ff',
      gridPink:     '#ff2d78',
      bumperBody:   '#1a1025',
      bumperRing:   '#8855cc',
      centerBumper: '#00f5ff',
      flippers:     '#4169ff',
      ringOutGap:   '#ff2222',
    },
  },
  VORTEX_COLISEUM: {
    name: 'Vortex Coliseum',
    type: 'circular',
    zones: {
      vortexCore: 46,      // Center vortex
      innerOrbit: 104,      // Fast orbit - high risk/reward
      middleOrbit: 169,    // Balanced orbit
      outerOrbit: 208,     // Safe orbit - stamina recovery
      wall: 228
    },
    vortex: {
      strength: 0.8,       // Pull strength
      rotationSpeed: 2.0,  // Vortex rotation speed (rad/s)
      currentAngle: 0,
      inversed: false,
      surgeTimer: 0,
      surgeDuration: 2.0,  // Storm surge lasts 2 seconds
      surgeCooldown: 5.0   // Surge every 5 seconds
    },
    slingshotPoints: [
      { id: 0, angle: 0, radius: 170, cooldown: 0 },              // North
      { id: 1, angle: Math.PI / 2, radius: 170, cooldown: 0 },    // East
      { id: 2, angle: Math.PI, radius: 170, cooldown: 0 },        // South
      { id: 3, angle: -Math.PI / 2, radius: 170, cooldown: 0 }    // West
    ],
    bumpers: [], // Bumpers removidos
    momentum: {
      bey1Stacks: 0,
      bey2Stacks: 0,
      bey1LastAngle: 0,
      bey2LastAngle: 0,
      stackDecayRate: 0.3  // Stacks decay over time
    },
    colors: {
      core: '#1a0033',      // Deep purple vortex
      inner: '#4c1d95',     // Purple inner orbit
      middle: '#6366f1',    // Blue middle orbit
      outer: '#8b5cf6',     // Light purple outer orbit
      wall: '#a78bfa',      // Bright purple wall
      vortex: '#c084fc',    // Vortex glow
      slingshot: '#fbbf24'  // Gold slingshot points
    }
  },
  DOMINATION_ZONES: {
    name: 'Domination Zones',
    type: 'circular',
    zones: {
      center: 50,          // Centro
      zoneRadius: 180,     // Raio das zonas
      wall: 225            // Parede
    },
    // NOVO: 8 zonas periféricas + 1 central
    peripheralZones: [
      { 
        id: 1,
        angle: 0,                    // Norte
        arcWidth: Math.PI / 4,       // 45° cada
        radius: 170,
        captureRadius: 40,           // Raio de detecção
        points: 1,
        owner: null,                 // null, 'player1', 'player2'
        captureProgress: {
          player1: 0,                // Progresso de captura (0-1.0)
          player2: 0
        }
      },
      { id: 2, angle: Math.PI / 4, arcWidth: Math.PI / 4, radius: 170, captureRadius: 40, points: 1, owner: null, captureProgress: { player1: 0, player2: 0 } },
      { id: 3, angle: Math.PI / 2, arcWidth: Math.PI / 4, radius: 170, captureRadius: 40, points: 1, owner: null, captureProgress: { player1: 0, player2: 0 } },
      { id: 4, angle: 3 * Math.PI / 4, arcWidth: Math.PI / 4, radius: 170, captureRadius: 40, points: 1, owner: null, captureProgress: { player1: 0, player2: 0 } },
      { id: 5, angle: Math.PI, arcWidth: Math.PI / 4, radius: 170, captureRadius: 40, points: 1, owner: null, captureProgress: { player1: 0, player2: 0 } },
      { id: 6, angle: 5 * Math.PI / 4, arcWidth: Math.PI / 4, radius: 170, captureRadius: 40, points: 1, owner: null, captureProgress: { player1: 0, player2: 0 } },
      { id: 7, angle: 3 * Math.PI / 2, arcWidth: Math.PI / 4, radius: 170, captureRadius: 40, points: 1, owner: null, captureProgress: { player1: 0, player2: 0 } },
      { id: 8, angle: 7 * Math.PI / 4, arcWidth: Math.PI / 4, radius: 170, captureRadius: 40, points: 1, owner: null, captureProgress: { player1: 0, player2: 0 } }
    ],
    centralZone: {
      id: 'center',
      x: 0,
      y: 0,
      radius: 50,              // Círculo central
      points: 2,               // VALE 2 PONTOS
      owner: null,
      captureProgress: {
        player1: 0,
        player2: 0
      },
      contested: false         // Se ambos estão na zona
    },
    // Sistema de pontos
    pointsSystem: {
      captureTime: 1.0,          // 1 segundo acumulado para capturar
      targetPoints: 5,           // Precisa de 5 pontos para vencer
      player1: {
        totalPoints: 0,          // Pontos totais coletados
        zonesOwned: [],          // IDs das zonas capturadas
        lastCapture: null        // Timestamp da última captura
      },
      player2: {
        totalPoints: 0,
        zonesOwned: [],
        lastCapture: null
      }
    },
    colors: {
      floor: '#1a1a2a',
      wall: '#2a2a3a',
      uncaptured: '#666666',     // Zona não capturada
      player1: '#ff4444',        // Vermelho
      player2: '#4444ff',        // Azul
      capturing: '#ffff44',      // Amarelo (sendo capturada)
      centralZone: '#8844ff'     // Roxo para zona central
    }
  },
  TIDAL_SURGE: {
    name: 'Tidal Surge',
    type: 'circular',
    zones: {
      center: 40,       // Ilha — nunca inunda (legacy compat)
      floodZone: 80,
      normalZone: 160,
      wall: 220
    },
    // Zonas estruturadas (usadas pelo engine)
    arenaZones: {
      island:    40,
      floodZone: 80,
      sand:      160,
      wall:      220,
    },
    tideSystem: {
      // tideType sorteado no initializeBattle
      tideType: 'standard',
      phase: 'low',
      timer: 0,
      cycleDuration: 12.0,
      floodRadius: 0,
      maxFloodRadius: 80,
      spiralAngle: 0,
      spiralDirection: 1,
      dualAngle: 0,
      dualFlood: 0,
      inverseProgress: 0,
      blobs: [],
      blobTimer: 0,
      intensity: 1.0,
    },
    // ── TSUNAMI SYSTEM ─────────────────────────────────────────────
    tsunamiSystem: {
      timer: 0,            // counts up; triggers when >= interval
      interval: 8.0,       // trigger every 8 seconds
      active: false,
      level: null,         // 'light' | 'heavy' | 'apocalyptic'
      phase: 'idle',       // 'idle' | 'warning' | 'expanding' | 'hold' | 'returning'
      phaseTimer: 0,
      wallOffset: 0,       // current inward shrink of wall (px)
      permanentOffset: 0,  // accumulated from apocalyptic tsunamis (never reset)
      waveRings: [],       // visual wave rings [ { r, alpha, speed } ]
      // per-level config
      levels: {
        light:       { chance: 0.60, maxOffset: 28,  expandDur: 1.1, holdDur: 0.4, returnDur: 0.9,  returns: true  },
        heavy:       { chance: 0.30, maxOffset: 60,  expandDur: 1.7, holdDur: 0.7, returnDur: 1.4,  returns: true  },
        apocalyptic: { chance: 0.10, maxOffset: 110, expandDur: 2.4, holdDur: 0.9, returnDur: 0,    returns: false },
      },
      warningDur: 1.2,
    },
    colors: {
      floor:     '#c8a060',
      floorWet:  '#8a6030',
      wall:      '#1a4a8a',
      wallWave:  '#3a8adc',
      waterLow:  'rgba(60,140,220,0.45)',
      waterHigh: 'rgba(20,80,190,0.75)',
      foam:      'rgba(200,235,255,0.85)',
      wave:      '#8dd4f0',
      sand:      '#d4b870',
      sandWet:   '#a07840',
      islandTop: '#e8d090',
    }
  },
  STORM_TRACK: {
    name: 'Storm Track',
    type: 'circular',
    zones: {
      center: 50,
      inner: 140,
      outer: 190,
      wall: 218
    },
    // NOVO: Sistema de múltiplos storms
    stormSystem: {
      currentStorm: null,        // Storm ativo atual
      stormHistory: [],          // Storms já usados
      stormQueue: [],            // Próximos storms
      
      timing: {
        peaceDuration: 5.0,      // 5s de paz entre storms
        warningDuration: 2.0,    // 2s de aviso
        stormDuration: 4.0,      // 4s de storm ativo
        currentPhase: 'peace',   // peace, warning, active
        phaseStartTime: 0
      },
      
      intensity: {
        level: 1,                // 1, 2, 3
        levelUpTime: 20.0,       // Aumenta nível a cada 20s
        lastLevelUpTime: 0
      },
      
      // Tipos de storm com probabilidades
      stormTypes: {
        RAIN_WAVE: {
          chance: 0.30,
          waveDirection: 0,
          waveForce: 5.0,
          waveWidth: Math.PI / 2,  // 90° arc
          chainWaves: { count: 2, delay: 1.0 },
          currentWave: 0
        },
        WIND_VORTEX: {
          chance: 0.25,
          vortices: [],
          vortexCount: 1,
          vortexRadius: 40,
          pullForce: 4.0,
          rotationSpeed: 3.0
        },
        LIGHTNING_STORM: {
          chance: 0.20,
          strikes: [],
          strikeCount: 5,
          strikeInterval: 0.6,
          strikeRadius: 35,
          stunDuration: 0.8,
          lastStrikeTime: 0,
          currentStrikes: 0
        },
        THUNDER_DOME: {
          chance: 0.15,
          domeRadius: 180,
          repulsionForce: 8.0,
          repulsionRange: 40,
          damagePerTick: 3,
          tickRate: 0.2,
          lastTickTime: 0
        },
        HAIL_BARRAGE: {
          chance: 0.07,
          hailstones: [],
          totalCount: 40,
          spawnRate: 0.1,
          lastSpawnTime: 0,
          damagePerHit: 2,
          slowEffect: 0.85
        },
        TORNADO_FURY: {
          chance: 0.03,
          tornadoX: 0,
          tornadoY: 0,
          tornadoRadius: 180,
          pullForce: 10.0,
          rotationSpeed: 5.0,
          liftChance: 0.3,
          liftedBlades: []
        }
      },
      
      // Apocalypse mode
      apocalypse: {
        triggerTime: 90.0,       // Aos 90s
        active: false,
        storms: []               // 2 storms simultâneos
      }
    },
    colors: {
      floor: '#1a1a1a',
      wall: '#3a3a3a',
      warning: '#ffff00',
      rainWave: '#00aaff',
      windVortex: '#ccccff',
      lightning: '#ffff00',
      thunderDome: '#00ffff',
      hail: '#aaccff',
      tornado: '#ff6666',
      grid: '#444444'
    }
  }
};
