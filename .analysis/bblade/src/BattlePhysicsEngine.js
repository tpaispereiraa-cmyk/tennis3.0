// ============================================
// BATTLE PHYSICS ENGINE v4.0 - ULTRA REALISTA
// Sistema de Simulação Frame-a-Frame COMPLETO
// 
// 🎯 FEATURES:
// ✅ Simulação 60 FPS (frame perfeito)
// ✅ Física completa: forças, torques, momentum angular
// ✅ Mecânicas específicas por arena (8 arenas únicas)
// ✅ Colisões elásticas precisas com conservação de energia
// ✅ Sistema de burst progressivo e realista
// ✅ Spin stealing com direções de rotação
// ✅ Três tipos de vitória: Burst, Spin Finish, Ring Out
// ============================================

// ============================================
// CONSTANTES FÍSICAS UNIVERSAIS
// ============================================
const PHYSICS_CONSTANTS = {
  GRAVITY: 9.81, // m/s² (só usado em arenas com altura)
  AIR_FRICTION: 0.9998, // Resistência do ar (quase imperceptível)
  FLOOR_FRICTION: 0.9995, // Atrito com o chão
  FPS: 60, // Frames por segundo
  TIME_STEP: 1/60, // Delta time por frame (0.0166s)
  MAX_SIMULATION_TIME: 180, // 3 minutos máximo
  
  // Constantes de colisão
  BASE_RESTITUTION: 0.85, // Elasticidade base (85% energia preservada)
  COLLISION_THRESHOLD: 30, // Distância mínima para detectar colisão (pixels)
  
  // Constantes de burst
  BURST_THRESHOLD: 100, // Dano total para burst
  BURST_RESISTANCE_BASE: 10, // Resistência base ao burst
  
  // Constantes de spin
  SPIN_DECAY_RATE: 0.02, // Perda natural de spin por segundo
  MIN_SPIN_VELOCITY: 0.5, // Velocidade mínima para considerar "girando"
  
  // Ring out
  RING_OUT_MARGIN: 50, // Pixels além do raio da arena para ring out
};

// ============================================
// DEFINIÇÕES DE ARENAS COMPLETAS
// ============================================
const ARENA_PHYSICS = {
  'BB10_COMPETITIVE': {
    name: 'BB-10 Stadium',
    radius: 221,
    features: {
      tornadoRidge: true,
      tornadoRidgeRadius: 180,
      tornadoRidgeAngle: 0.15, // Inclinação em radianos (~8.6°)
      pockets: true,
      pocketCount: 2,  // Apenas 2 pockets agora
      pocketSizeMultiplier: 0.7,  // 30% menores
      movingParts: false
    },
    physicsModifiers: {
      frictionMultiplier: 1.0,
      gravityMultiplier: 1.0,
      speedBoostZones: []
    }
  },
  
  'NEXUS': {
    name: 'Prismatic Nexus',
    radius: 215,
    features: {
      portals: [
        { x: 150, y: 0, targetX: -150, targetY: 0, radius: 35, cooldown: 2.0 },
        { x: 0, y: 150, targetX: 0, targetY: -150, radius: 35, cooldown: 2.0 },
        { x: -150, y: 0, targetX: 150, targetY: 0, radius: 35, cooldown: 2.0 },
        { x: 0, y: -150, targetX: 0, targetY: 150, radius: 35, cooldown: 2.0 }
      ],
      incline: 0.12,
      movingParts: false
    },
    physicsModifiers: {
      frictionMultiplier: 0.95, // Mais escorregadio
      gravityMultiplier: 1.0,
      portalSpeedBoost: 1.3
    }
  },
  
  'COLOSSEUM_CARNAGE': {
    name: 'Colosseum Carnage',
    radius: 200,
    features: {
      movingObstacles: [
        { id: 0, x: -200, y: 0, vx: 0, vy: 0, radius: 25, active: false, releaseTime: 20 },
        { id: 1, x: 0, y: -200, vx: 0, vy: 0, radius: 25, active: false, releaseTime: 35 },
        { id: 2, x: 200, y: 0, vx: 0, vy: 0, radius: 25, active: false, releaseTime: 50 }
      ],
      gates: [
        { id: 0, x: -200, y: 0, angle: Math.PI, open: false },
        { id: 1, x: 0, y: -200, angle: Math.PI/2, open: false },
        { id: 2, x: 200, y: 0, angle: 0, open: false }
      ],
      gateInterval: 15.0,
      obstacleSpeed: 22,
      crushDamage: 2.5,
      movingParts: true,
      dangerous: true
    },
    physicsModifiers: {
      frictionMultiplier: 1.0,
      gravityMultiplier: 1.0,
      damageMult: 1.4
    }
  },
  
  'VOLCANIC_RAGE': {
    name: 'Volcanic Rage',
    radius: 221,
    features: {
      bowl:              true,
      frictionGradient:  true,
      heatSystem:        true,
      lavaFlows:         true,
      fissures:          true,
      obsidianBelt:      true,
      frictionMap: {
        magmaCore:    { radius:  50, friction: 0.94 },
        lavaFlowRing: { radius: 140, friction: 0.93 },
        obsidianBelt: { radius: 190, friction: 0.92 },
        craterEdge:   { radius: 221, friction: 0.93 },
      },
      movingParts: true,
    },
    physicsModifiers: {
      frictionMultiplier:  'VARIABLE',
      gravityMultiplier:    1.0,
      knockbackMultiplier:  1.1,
      weightAdvantage:      1.2,   // moderado (não domina como antes)
      balanceResistance:    1.3,   // Balance resiste melhor ao caos
      spinDecayMult:        0.95,
    },
  },
  
  'VORTEX_COLISEUM': {
    name: 'Vortex Coliseum',
    radius: 234,
    features: {
      vortex: true,
      vortexStrength: 2.5,
      vortexRadius: 80,
      orbitZones: [
        { minRadius: 80, maxRadius: 150, angularVelocity: 0.5 },
        { minRadius: 150, maxRadius: 220, angularVelocity: -0.3 }
      ],
      movingParts: false
    },
    physicsModifiers: {
      frictionMultiplier: 0.85,
      gravityMultiplier: 1.0,
      momentumPreservation: 1.15 // Momentum dura mais
    }
  },
  
  'PINBALL_INFERNO': {
    name: 'Pinball Inferno',
    radius: 227,
    features: {
      bumpers: [
        // DANGER ZONE (Vermelhos) - Alta elasticidade
        { x: -120, y: -90, radius: 18, bounceForce: 9.0, type: 'danger', color: '#ff0000' },
        { x: 120, y: -90, radius: 18, bounceForce: 9.0, type: 'danger', color: '#ff0000' },
        { x: -120, y: 90, radius: 18, bounceForce: 9.0, type: 'danger', color: '#ff0000' },
        { x: 120, y: 90, radius: 18, bounceForce: 9.0, type: 'danger', color: '#ff0000' },
        
        // COMBO ZONE (Azuis) - Média elasticidade
        { x: -80, y: 0, radius: 20, bounceForce: 7.0, type: 'combo', color: '#4444ff' },
        { x: 80, y: 0, radius: 20, bounceForce: 7.0, type: 'combo', color: '#4444ff' },
        { x: 0, y: -120, radius: 20, bounceForce: 7.0, type: 'combo', color: '#4444ff' },
        { x: 0, y: 120, radius: 20, bounceForce: 7.0, type: 'combo', color: '#4444ff' },
        
        // TRAP ZONE (Amarelos) - Baixa elasticidade
        { x: -60, y: -60, radius: 22, bounceForce: 5.0, type: 'trap', color: '#ffff00' },
        { x: 60, y: -60, radius: 22, bounceForce: 5.0, type: 'trap', color: '#ffff00' },
        { x: -60, y: 60, radius: 22, bounceForce: 5.0, type: 'trap', color: '#ffff00' },
        { x: 60, y: 60, radius: 22, bounceForce: 5.0, type: 'trap', color: '#ffff00' }
      ],
      flippers: [
        { x: -180, y: -50, angle: Math.PI/4, width: 45, bounceForce: 12.0, cooldown: 0.5 },
        { x: 180, y: 0, angle: 3*Math.PI/4, width: 45, bounceForce: 12.0, cooldown: 1.0 },
        { x: -150, y: 80, angle: -Math.PI/4, width: 45, bounceForce: 12.0, cooldown: 1.5 }
      ],
      lanes: {
        upper: { y: -100, bonus: 'attack' },
        middle: { y: 0, bonus: 'risky' },
        lower: { y: 100, bonus: 'defense' }
      },
      comboSystem: true,
      asymmetric: true,
      movingParts: true
    },
    physicsModifiers: {
      frictionMultiplier: 0.88,
      gravityMultiplier: 1.0,
      riccochetBonus: 1.6,
      comboMultiplier: 1.3
    }
  },
  
  'PANGEA_PLATFORM': {
    name: 'Pangea Platform',
    radius: 221,
    features: {
      movingPlates: [
        { id: 0, angle: 0, arcWidth: Math.PI/3, radius: 110, velocity: 0.15, direction: 1 },
        { id: 1, angle: Math.PI/3, arcWidth: Math.PI/3, radius: 110, velocity: 0.18, direction: -1 },
        { id: 2, angle: 2*Math.PI/3, arcWidth: Math.PI/3, radius: 110, velocity: 0.12, direction: 1 },
        { id: 3, angle: Math.PI, arcWidth: Math.PI/3, radius: 110, velocity: 0.16, direction: -1 },
        { id: 4, angle: 4*Math.PI/3, arcWidth: Math.PI/3, radius: 110, velocity: 0.14, direction: 1 },
        { id: 5, angle: 5*Math.PI/3, arcWidth: Math.PI/3, radius: 110, velocity: 0.17, direction: -1 }
      ],
      faultLines: true,
      seismicEvents: {
        interval: 12.0,
        duration: 1.5,
        intensity: 3.5
      },
      centerStable: { radius: 40 },  // Centro sempre estável
      movingParts: true
    },
    physicsModifiers: {
      frictionMultiplier: 0.93,
      gravityModifier: 1.0,
      weightAdvantage: 1.3,  // Beys pesados mais estáveis
      balanceRequired: 1.4   // Balance crucial
    }
  },
  
  'KILLER_SIDES': {
    name: 'Killer Sides Arena',
    radius: 221,
    features: {
      gripTracks: [
        { x1: -200, y1: -180, x2: -200, y2: 180, captureSpeed: 15, launchForce: 25, width: 30 },
        { x1: 200, y1: -180, x2: 200, y2: 180, captureSpeed: 15, launchForce: 25, width: 30 },
        { x1: -180, y1: -200, x2: 180, y2: -200, captureSpeed: 15, launchForce: 25, width: 30 },
        { x1: -180, y1: 200, x2: 180, y2: 200, captureSpeed: 15, launchForce: 25, width: 30 }
      ],
      dangerZone: 160, // Raio da zona perigosa
      movingParts: false
    },
    physicsModifiers: {
      frictionMultiplier: 0.9,
      gravityMultiplier: 1.0,
      speedThreshold: 15 // Velocidade mínima para escapar
    }
  },
  
  'SPEEDWAY_CIRCUIT': {
    name: 'Speedway Circuit',
    radius: 250, // Um pouco maior que as outras
    features: {
      ovalShape: true,
      ovalRatio: 1.6, // Largura/Altura - oval alongado estilo NASCAR
      centerHole: 120, // Centro não acessível (formato rosquinha)
      boostPads: [
        // 4 boost pads nas curvas
        { id: 0, x: -180, y: -80, radius: 35, direction: 'tangent', boostForce: 18 },
        { id: 1, x: 180, y: -80, radius: 35, direction: 'tangent', boostForce: 18 },
        { id: 2, x: 180, y: 80, radius: 35, direction: 'tangent', boostForce: 18 },
        { id: 3, x: -180, y: 80, radius: 35, direction: 'tangent', boostForce: 18 }
      ],
      oilSlicks: [
        // 2 oil slicks nas retas
        { id: 0, x: 0, y: -120, width: 80, height: 40, duration: 2.0 },
        { id: 1, x: 0, y: 120, width: 80, height: 40, duration: 2.0 }
      ],
      checkpoints: [
        // 4 checkpoints invisíveis para contar voltas
        { id: 0, angle: 0, radius: 190 },          // Linha de chegada (direita)
        { id: 1, angle: Math.PI/2, radius: 190 },  // Topo
        { id: 2, angle: Math.PI, radius: 190 },    // Esquerda
        { id: 3, angle: -Math.PI/2, radius: 190 }  // Baixo
      ],
      lapSystem: true,
      targetLaps: 3,
      movingParts: false
    },
    physicsModifiers: {
      frictionMultiplier: 0.92,
      gravityMultiplier: 1.0,
      boostMultiplier: 1.5,
      oilFrictionMultiplier: 0.1 // Quase zero fricção no óleo
    }
  },
  
  'DOMINATION_ZONES': {
    name: 'Domination Zones',
    radius: 225,
    features: {
      zones: [
        // 6 fatias tipo pizza
        { id: 0, angle: 0, arcWidth: Math.PI/3, type: 'ATK', owner: null, captureTime: 0 },
        { id: 1, angle: Math.PI/3, arcWidth: Math.PI/3, type: 'NEUTRAL', owner: null, captureTime: 0 },
        { id: 2, angle: 2*Math.PI/3, arcWidth: Math.PI/3, type: 'DEF', owner: null, captureTime: 0 },
        { id: 3, angle: Math.PI, arcWidth: Math.PI/3, type: 'SPEED', owner: null, captureTime: 0 },
        { id: 4, angle: 4*Math.PI/3, arcWidth: Math.PI/3, type: 'NEUTRAL', owner: null, captureTime: 0 },
        { id: 5, angle: 5*Math.PI/3, arcWidth: Math.PI/3, type: 'SPIN', owner: null, captureTime: 0 }
      ],
      captureRadius: 50, // Raio mínimo da zona
      captureTime: 3.0, // 3 segundos para conquistar
      targetZones: 4, // Precisa de 4 zonas para vencer
      movingParts: false
    },
    physicsModifiers: {
      frictionMultiplier: 1.0,
      gravityMultiplier: 1.0,
      zoneBonuses: {
        ATK: { damageMultiplier: 1.2 },
        DEF: { damageReduction: 0.85 },
        SPEED: { speedBoost: 1.25 },
        SPIN: { spinDecayMultiplier: 0.5 },
        NEUTRAL: {}
      }
    }
  },
  
  'TIDAL_SURGE': {
    name: 'Tidal Surge',
    radius: 220,
    features: {
      tideSystem: true,
      // ── Zonas ──────────────────────────────────────
      zones: {
        island:    40,   // Ilha central — nunca inunda, bônus estabilidade
        floodZone: 80,   // Zona de inundação máxima
        sand:     160,   // Areia — efeito de drag leve
        wall:     220,
      },
      // ── Ciclo de maré ────────────────────────────
      // tideType sorteado no início de cada batalha:
      //   'standard' | 'spiral' | 'double' | 'inverse' | 'chaos'
      tideType: 'standard',
      tideCycle: 12.0,
      // Estado compartilhado (atualizado por frame)
      tide: {
        phase: 'low',       // 'low' | 'rising' | 'high'
        timer: 0,
        floodRadius: 0,
        maxFloodRadius: 80,
        // Espiral
        spiralAngle: 0,
        spiralDirection: 1,   // +1 horário / -1 anti-horário
        // Double
        dualAngle: 0,
        dualFlood: 0,
        // Inverse
        inverseProgress: 0,
        // Chaos
        blobs: [],
        blobTimer: 0,
        // Intensidade escalável por round (1.0→3.0)
        intensity: 1.0,
      },
    },
    physicsModifiers: {
      frictionMultiplier: 1.0,
      gravityMultiplier: 1.0,
      // Fricção gradiente por zona de água
      waterFriction: {
        shallow:   0.970,  // borda da inundação
        mid:       0.945,  // zona média
        deep:      0.910,  // centro da inundação
      },
      waterCurrentForce: {
        rising:  0.022,
        high:    0.048,
      },
      spiralTangentialForce: 0.018,
      // Ilha central
      islandStabilityBonus: 0.08,  // +8% stability por frame dentro da ilha
      islandStaminaSave:    true,   // sem stamina drain na ilha
    }
  },
  
  'STORM_TRACK': {
    name: 'Storm Track',
    radius: 218,
    features: {
      stormWaves: true,
      waveInterval: 8.0, // Onda a cada 8 segundos
      waveWarningTime: 2.0, // Aviso 2s antes
      waveActive: false,
      waveDirection: 0, // Direção em radianos (0 = direita, PI/2 = cima, etc)
      waveTimer: 0,
      nextWaveDirection: 0,
      waveDuration: 1.5, // Onda dura 1.5s
      waveStrength: 8.0, // Força da onda
      movingParts: true
    },
    physicsModifiers: {
      frictionMultiplier: 1.0,
      gravityMultiplier: 1.0,
      waveBoost: 1.3, // +30% velocidade com a onda
      waveSlow: 0.6 // -40% velocidade contra a onda
    }
  }
};

// ============================================
// CLASSE PRINCIPAL: BEYBLADE
// ============================================
class Beyblade {
  constructor(beybladeData, playerData, startPosition, startVelocity, playerNumber) {
    // Dados originais
    this.data = beybladeData;
    this.player = playerData;
    this.playerNumber = playerNumber;
    
    // Stats efetivos
    this.stats = {
      atk: beybladeData.effectiveStats?.atk || beybladeData.stats?.atk || 10,
      def: beybladeData.effectiveStats?.def || beybladeData.stats?.def || 10,
      sta: beybladeData.effectiveStats?.sta || beybladeData.stats?.sta || 10,
      bal: beybladeData.effectiveStats?.bal || beybladeData.stats?.bal || 10,
      weight: beybladeData.effectiveStats?.weight || beybladeData.stats?.weight || 10,
      spin: beybladeData.effectiveStats?.spin || beybladeData.stats?.spin || 35
    };
    
    // Propriedades físicas
    this.mass = this.calculateMass();
    this.momentOfInertia = this.calculateMomentOfInertia();
    this.contactSurfaceRoughness = this.calculateContactSurface();
    this.burstResistance = this.calculateBurstResistance();
    
    // Estado cinemático
    this.position = { ...startPosition };
    this.velocity = { ...startVelocity };
    this.acceleration = { x: 0, y: 0 };
    
    // Estado rotacional
    this.spinDirection = this.determineSpinDirection();
    this.spinVelocity = this.calculateInitialSpin();
    this.spinAcceleration = 0;
    this.angle = Math.random() * Math.PI * 2; // Ângulo visual
    
    // Estado de saúde
    this.health = {
      spin: 100,
      stamina: 100,
      stability: 100,
      burstDamage: 0
    };
    
    // Estado de jogo
    this.alive = true;
    this.inAir = false;
    this.captured = false; // Para Killer Sides
    this.capturedAtFrame = -1;     // Frame em que foi capturado (usado no release frame-based)
    this.capturedLaunchDx = 0;     // Direção de relançamento pré-calculada
    this.capturedLaunchDy = 0;
    this.capturedLaunchForce = 0;
    this.lastPortalUse = -999; // Para Prismatic Nexus
    
    // Estatísticas
    this.stats_battle = {
      collisions: 0,
      damageDealt: 0,
      damageReceived: 0,
      distance: 0,
      maxVelocity: 0,
      timeAlive: 0
    };
  }
  
  calculateMass() {
    // Massa efetiva = weight + defense + balance + parte do spin
    return (this.stats.weight * 1.8) + 
           (this.stats.def * 0.7) + 
           (this.stats.bal * 0.4) + 
           (this.stats.spin * 0.05);
  }
  
  calculateMomentOfInertia() {
    // I = m * r² (simplificado, assumindo raio ~15px)
    const effectiveRadius = 15;
    return this.mass * effectiveRadius * effectiveRadius * 0.001;
  }
  
  calculateContactSurface() {
    // Attack = superfície mais rugosa (dentes agressivos)
    // Defense = superfície mais lisa
    const attackFactor = Math.min(40, this.stats.atk) / 40;
    const defenseFactor = Math.min(40, this.stats.def) / 40;
    const balanceFactor = Math.min(40, this.stats.bal) / 40;
    
    const roughness = (attackFactor * 0.65) + 
                     ((1 - defenseFactor) * 0.25) + 
                     ((1 - balanceFactor) * 0.10);
    
    return Math.max(0.15, Math.min(0.95, roughness));
  }
  
  calculateBurstResistance() {
    // Defense e Balance aumentam resistência ao burst
    return PHYSICS_CONSTANTS.BURST_RESISTANCE_BASE + 
           (this.stats.def * 0.8) + 
           (this.stats.bal * 0.5) +
           (this.stats.weight * 0.3);
  }
  
  determineSpinDirection() {
    // 70% right spin, 30% left spin
    // Defense types têm mais chance de left spin
    const leftSpinChance = this.data.type === 'Defense' ? 0.4 : 0.3;
    return Math.random() < leftSpinChance ? -1 : 1;
  }
  
  calculateInitialSpin() {
    // Spin inicial baseado no stat de spin
    return this.stats.spin * 2.5;
  }
  
  getSpeed() {
    return Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
  }
  
  getKineticEnergy() {
    return 0.5 * this.mass * (this.velocity.x ** 2 + this.velocity.y ** 2);
  }
  
  getRotationalEnergy() {
    return 0.5 * this.momentOfInertia * (this.spinVelocity ** 2);
  }
  
  getTotalEnergy() {
    return this.getKineticEnergy() + this.getRotationalEnergy();
  }
}

// ============================================
// CLASSE PRINCIPAL: BATTLE PHYSICS ENGINE
// ============================================
class BattlePhysicsEngine {
  constructor(arenaType = 'BB10_COMPETITIVE') {
    this.arenaType = arenaType;
    this.arena = ARENA_PHYSICS[arenaType] || ARENA_PHYSICS['BB10_COMPETITIVE'];
    this.centerX = 500;
    this.centerY = 350;
    
    // Estado da simulação
    this.frame = 0;
    this.time = 0;
    this.timeStep = PHYSICS_CONSTANTS.TIME_STEP;
    
    // Beyblades
    this.beyblades = [];
    
    // Estado da arena
    this.arenaState = {
      rotation: 0, // Para Spinning Disc
      openSections: [], // Para The Pitt
      vortexPhase: 0 // Para Vortex Coliseum
    };
    
    // Histórico de eventos
    this.events = [];
    
    // Cache de cálculos
    this.collisionCache = new Map();
  }
  
  // ============================================
  // INICIALIZAÇÃO
  // ============================================
  
  initializeBattle(beyblade1Data, beyblade2Data, player1Data, player2Data, launchData1, launchData2) {
    // Posições iniciais
    const offset = 60;
    const pos1 = { x: this.centerX - offset, y: this.centerY + (Math.random() - 0.5) * 40 };
    const pos2 = { x: this.centerX + offset, y: this.centerY + (Math.random() - 0.5) * 40 };
    
    // Velocidades iniciais baseadas no launch
    const vel1 = this.calculateLaunchVelocity(launchData1);
    const vel2 = this.calculateLaunchVelocity(launchData2);
    
    // Cria beyblades
    this.beyblades = [
      new Beyblade(beyblade1Data, player1Data, pos1, vel1, 1),
      new Beyblade(beyblade2Data, player2Data, pos2, vel2, 2)
    ];

    // ── Tidal Surge: sorteia tipo de maré para essa batalha ──
    if (this.arenaType === 'TIDAL_SURGE') {
      const tideTypes = ['standard', 'spiral', 'double', 'inverse', 'chaos'];
      this.arena.features.tideType = tideTypes[Math.floor(Math.random() * tideTypes.length)];
      // Reseta estado
      const tide = this.arena.features.tide;
      tide.timer = 0; tide.phase = 'low'; tide.floodRadius = 0;
      tide.spiralAngle = 0;
      tide.spiralDirection = Math.random() < 0.5 ? 1 : -1;
      tide.dualAngle = Math.random() * Math.PI * 2;
      tide.dualFlood = 0;
      tide.inverseProgress = 0;
      tide.blobs = []; tide.blobTimer = 0;
      tide.intensity = 1.0;
      // Reseta sistema de tsunami
      const ts = this.arena.features.tsunamiSystem;
      if (ts) {
        ts.timer = 0; ts.active = false; ts.level = null;
        ts.phase = 'idle'; ts.phaseTimer = 0;
        ts.wallOffset = 0; ts.permanentOffset = 0;
        ts.waveRings = [];
      }
    }

    this.logEvent('BATTLE_START', {
      arena: this.arena.name,
      bey1: beyblade1Data.name,
      bey2: beyblade2Data.name
    });
  }
  
  calculateLaunchVelocity(launchData) {
    const basePower = launchData?.power || 8;
    const angle = launchData?.angle || (Math.random() * Math.PI * 2);
    
    return {
      x: Math.cos(angle) * basePower,
      y: Math.sin(angle) * basePower
    };
  }
  
  // ============================================
  // LOOP PRINCIPAL DE SIMULAÇÃO
  // ============================================
  
  simulate() {
    const maxFrames = Math.floor(PHYSICS_CONSTANTS.MAX_SIMULATION_TIME * PHYSICS_CONSTANTS.FPS);
    
    while (this.frame < maxFrames) {
      this.frame++;
      this.time = this.frame * this.timeStep;
      
      // Update arena state
      this.updateArenaState();
      
      // Update beyblades
      for (const bey of this.beyblades) {
        if (!bey.alive) continue;
        
        // KILLER_SIDES: liberar beyblade capturado após 30 frames (0.5s @ 60fps)
        if (bey.captured) {
          if (this.frame - bey.capturedAtFrame >= 30) {
            const dist = Math.sqrt(bey.capturedLaunchDx ** 2 + bey.capturedLaunchDy ** 2);
            if (dist > 0) {
              bey.velocity.x = (bey.capturedLaunchDx / dist) * bey.capturedLaunchForce;
              bey.velocity.y = (bey.capturedLaunchDy / dist) * bey.capturedLaunchForce;
            }
            bey.captured = false;
            this.logEvent('GRIP_TRACK_LAUNCH', {
              player: bey.playerNumber,
              force: bey.capturedLaunchForce
            });
          }
          continue; // física pausada enquanto capturado
        }
        
        // Aplicar forças da arena
        this.applyArenaForces(bey);
        
        // Integrar física
        this.integratePhysics(bey);
        
        // Verificar interações com arena
        this.checkArenaInteractions(bey);
        
        // 🆕 Efeitos especiais contínuos das parts (sem colisão)
        const opponent = this.beyblades.find(b => b !== bey && b.alive);
        if (opponent) {
          this.processPartSpecialEffects(bey, opponent, 0, 0, false);
        }
      }
      
      // Detectar e resolver colisões
      if (this.beyblades[0].alive && this.beyblades[1].alive) {
        this.handleBeybladeCollision(this.beyblades[0], this.beyblades[1]);
      }
      
      // Verificar condições de vitória
      const result = this.checkWinConditions();
      if (result) {
        return this.buildFinalResult(result);
      }
      
      // Decay natural
      this.applyNaturalDecay();

      // Tidal: escala intensidade com o tempo (max 3x)
      if (this.arenaType === 'TIDAL_SURGE') {
        this.arena.features.tide.intensity = Math.min(3.0, 1.0 + (this.time / 60) * 0.5);
      }
    }
    
    // Timeout - determina vencedor por pontos
    return this.buildFinalResult(this.determineTimeoutWinner());
  }
  
  // ============================================
  // ATUALIZAÇÃO DO ESTADO DA ARENA
  // ============================================
  
  updateArenaState() {
    switch (this.arenaType) {
      case 'SPINNING_DISC':
        // Atualiza rotação
        this.arenaState.rotation += this.arena.features.rotationSpeed * this.arena.features.rotationDirection * this.timeStep;
        
        // Verifica se deve mudar direção
        for (const changeTime of this.arena.features.changeDirectionAt) {
          if (Math.abs(this.time - changeTime) < this.timeStep) {
            this.arena.features.rotationDirection *= -1;
            this.logEvent('ARENA_ROTATION_CHANGE', { time: this.time });
          }
        }
        break;
        
      case 'THE_PITT':
        // Atualiza seções abertas/fechadas
        this.arenaState.openSections = this.arena.features.openingSections.filter(section => {
          return this.time >= section.opensAt && this.time < section.closesAt;
        });
        break;
        
      case 'VORTEX_COLISEUM':
        // Atualiza fase do vórtex (oscilação)
        this.arenaState.vortexPhase = Math.sin(this.time * 0.5) * 0.3 + 1.0;
        break;

      case 'TIDAL_SURGE':
        this._updateTidalState();
        break;
    }
  }

  // ============================================
  // TIDAL SURGE — STATE UPDATE (shared headless+visual)
  // ============================================
  _updateTidalState() {
    const feat = this.arena.features;
    const tide = feat.tide;
    const cyc  = feat.tideCycle;
    const type = feat.tideType;

    tide.timer += this.timeStep;

    const easeInOut = t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
    const p = (tide.timer % cyc) / cyc;

    if (type === 'standard') {
      if (p < 0.33) {
        tide.phase = 'low';
        tide.floodRadius = 0;
      } else if (p < 0.66) {
        tide.phase = 'rising';
        tide.floodRadius = tide.maxFloodRadius * easeInOut((p - 0.33) / 0.33) * tide.intensity;
      } else {
        tide.phase = 'high';
        tide.floodRadius = tide.maxFloodRadius * tide.intensity;
      }

    } else if (type === 'spiral') {
      if (p < 0.33) {
        tide.phase = 'low'; tide.floodRadius = 0;
      } else if (p < 0.66) {
        tide.phase = 'rising';
        tide.floodRadius = tide.maxFloodRadius * easeInOut((p - 0.33) / 0.33) * tide.intensity;
      } else {
        tide.phase = 'high';
        tide.floodRadius = tide.maxFloodRadius * tide.intensity;
      }
      tide.spiralAngle += this.timeStep * 1.6 * tide.spiralDirection;

    } else if (type === 'double') {
      const r = Math.sin(p * Math.PI * 2) * 0.5 + 0.5;
      tide.dualFlood = r * tide.maxFloodRadius * 0.85 * tide.intensity;
      tide.dualAngle += this.timeStep * 0.4;
      tide.phase = r > 0.6 ? 'high' : r > 0.2 ? 'rising' : 'low';
      tide.floodRadius = tide.dualFlood;

    } else if (type === 'inverse') {
      if (p < 0.33) {
        tide.phase = 'low'; tide.inverseProgress = 0;
      } else if (p < 0.66) {
        tide.phase = 'rising';
        tide.inverseProgress = easeInOut((p - 0.33) / 0.33) * tide.intensity;
      } else {
        tide.phase = 'high';
        tide.inverseProgress = 1.0 * tide.intensity;
      }
      tide.floodRadius = 0;

    } else if (type === 'chaos') {
      tide.blobTimer += this.timeStep;
      if (tide.blobTimer > 1.5 || tide.blobs.length === 0) {
        tide.blobTimer = 0;
        if (tide.blobs.length < 4) {
          const ang  = Math.random() * Math.PI * 2;
          const dist = Math.random() * feat.zones.sand * 0.75;
          tide.blobs.push({
            x: dist * Math.cos(ang), y: dist * Math.sin(ang),
            r: 0,
            maxR: (25 + Math.random() * 40) * tide.intensity,
            life: 0,
            maxLife: 2.5 + Math.random() * 2,
          });
        }
      }
      tide.blobs = tide.blobs.filter(b => {
        b.life += this.timeStep;
        const half = b.maxLife * 0.5;
        b.r = b.life < half
          ? b.maxR * easeInOut(b.life / half)
          : b.maxR * (1 - easeInOut((b.life - half) / half));
        return b.life < b.maxLife;
      });
      tide.phase = tide.blobs.length > 2 ? 'high' : tide.blobs.length > 0 ? 'rising' : 'low';
      tide.floodRadius = 0;
    }

    // ── TSUNAMI SYSTEM (every 8s, independent of tide type) ───────
    const ts = feat.tsunamiSystem;
    if (ts) {
      const DT = this.timeStep;
      const eio = r => r < 0.5 ? 2*r*r : -1+(4-2*r)*r;

      if (!ts.active) {
        ts.timer += DT;
        if (ts.timer >= ts.interval) {
          // Roll level
          const roll = Math.random();
          ts.level = roll < 0.10 ? 'apocalyptic' : roll < 0.40 ? 'heavy' : 'light';
          ts.active = true;
          ts.phase  = 'warning';
          ts.phaseTimer = 0;
          ts.timer = 0;
          this.logEvent('TSUNAMI_START', { level: ts.level });
        }
      } else {
        const lc = ts.levels[ts.level];
        ts.phaseTimer += DT;

        if (ts.phase === 'warning') {
          if (ts.phaseTimer >= ts.warningDur) {
            ts.phase = 'expanding'; ts.phaseTimer = 0;
          }
        } else if (ts.phase === 'expanding') {
          const prog = Math.min(1, ts.phaseTimer / lc.expandDur);
          ts.wallOffset = lc.maxOffset * eio(prog);
          if (ts.phaseTimer >= lc.expandDur) {
            ts.wallOffset = lc.maxOffset;
            ts.phase = 'hold'; ts.phaseTimer = 0;
          }
        } else if (ts.phase === 'hold') {
          if (ts.phaseTimer >= lc.holdDur) {
            if (lc.returns) {
              ts.phase = 'returning'; ts.phaseTimer = 0;
            } else {
              // Apocalyptic: make permanent
              ts.permanentOffset += ts.wallOffset;
              ts.wallOffset = 0;
              ts.active = false; ts.phase = 'idle'; ts.phaseTimer = 0;
              this.logEvent('TSUNAMI_PERMANENT', { totalShrink: ts.permanentOffset });
            }
          }
        } else if (ts.phase === 'returning') {
          const prog = Math.min(1, ts.phaseTimer / lc.returnDur);
          ts.wallOffset = lc.maxOffset * (1 - eio(prog));
          if (ts.phaseTimer >= lc.returnDur) {
            ts.wallOffset = 0;
            ts.active = false; ts.phase = 'idle'; ts.phaseTimer = 0;
          }
        }
      }
    }
  }
  // ============================================
  // APLICAÇÃO DE FORÇAS DA ARENA
  // ============================================
  
  applyArenaForces(bey) {
    const features = this.arena.features;
    
    // Força centrípeta/inclinação (BB-10, NEXUS)
    if (features.tornadoRidge || features.incline) {
      this.applyTornadoRidgeForce(bey);
    }
    
    // Vórtex (VORTEX_COLISEUM)
    if (features.vortex) {
      this.applyVortexForce(bey);
    }
    
    // Espiral gravitacional (GRAVITY)
    if (features.spiral) {
      this.applySpiralForce(bey);
    }
    
    // Força de Coriolis (SPINNING_DISC)
    if (features.rotating && this.arena.physicsModifiers.coriolisEffect) {
      this.applyCoriolisForce(bey);
    }
    
    // Força centrífuga (SPINNING_DISC)
    if (features.rotating) {
      this.applyCentrifugalForce(bey);
    }
    
    // Gravidade variável (GRAVITY)
    if (features.gravityZones) {
      this.applyVariableGravity(bey);
    }
    
    // Volcanic Rage - Heat System + Eruption + Lava Flows
    if (features.heatSystem || (features.bowl && features.frictionGradient)) {
      this.applyVolcanicRageForces(bey);
    }

    // Tidal Surge — maré completa
    if (features.tideSystem) {
      this.applyTidalForces(bey);
    }
  }
  
  applyTornadoRidgeForce(bey) {
    const dx = bey.position.x - this.centerX;
    const dy = bey.position.y - this.centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      const ridgeRadius = this.arena.features.tornadoRidgeRadius || 180;
      const ridgeAngle = this.arena.features.tornadoRidgeAngle || 0.15;
      
      if (distance > ridgeRadius) {
        // Força para o centro (inclinação)
        const forceMagnitude = (distance - ridgeRadius) * Math.tan(ridgeAngle) * 0.5;
        bey.acceleration.x -= (dx / distance) * forceMagnitude;
        bey.acceleration.y -= (dy / distance) * forceMagnitude;
      }
    }
  }
  
  applyVortexForce(bey) {
    const dx = bey.position.x - this.centerX;
    const dy = bey.position.y - this.centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < this.arena.features.vortexRadius) {
      const strength = this.arena.features.vortexStrength * this.arenaState.vortexPhase;
      const pullForce = (1 - distance / this.arena.features.vortexRadius) * strength;
      
      // Força para o centro
      if (distance > 0) {
        bey.acceleration.x -= (dx / distance) * pullForce;
        bey.acceleration.y -= (dy / distance) * pullForce;
      }
      
      // Componente tangencial (rotação)
      const tangentialForce = pullForce * 0.3;
      bey.acceleration.x += (-dy / distance) * tangentialForce;
      bey.acceleration.y += (dx / distance) * tangentialForce;
    }
  }
  
  applySpiralForce(bey) {
    const dx = bey.position.x - this.centerX;
    const dy = bey.position.y - this.centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      const angle = Math.atan2(dy, dx);
      const spiralAngle = angle + this.time * 0.5;
      
      const forceMagnitude = this.arena.features.spiralForceStrength || 0.8;
      bey.acceleration.x += Math.cos(spiralAngle) * forceMagnitude * 0.2;
      bey.acceleration.y += Math.sin(spiralAngle) * forceMagnitude * 0.2;
    }
  }
  
  applyCoriolisForce(bey) {
    // Força de Coriolis: F = -2m(Ω × v)
    const omega = this.arena.features.rotationSpeed * this.arena.features.rotationDirection;
    const coriolisX = -2 * omega * bey.velocity.y;
    const coriolisY = 2 * omega * bey.velocity.x;
    
    bey.acceleration.x += coriolisX * 0.5;
    bey.acceleration.y += coriolisY * 0.5;
  }
  
  applyCentrifugalForce(bey) {
    const dx = bey.position.x - this.centerX;
    const dy = bey.position.y - this.centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      const omega = this.arena.features.rotationSpeed;
      const centrifugal = omega * omega * distance * this.arena.physicsModifiers.centrifugalBoost;
      
      bey.acceleration.x += (dx / distance) * centrifugal;
      bey.acceleration.y += (dy / distance) * centrifugal;
    }
  }
  
  applyVariableGravity(bey) {
    const dx = bey.position.x - this.centerX;
    const dy = bey.position.y - this.centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Encontra zona de gravidade
    let gravityMult = 1.0;
    for (const zone of this.arena.features.gravityZones) {
      const zoneDist = Math.sqrt((bey.position.x - zone.x) ** 2 + (bey.position.y - zone.y) ** 2);
      if (zoneDist < zone.radius) {
        gravityMult = zone.gravityMult;
        break;
      }
    }
    
    // Aplica resistência proporcional à gravidade
    // Gravidade baixa = menos atrito, alta = mais atrito
    bey.velocity.x *= Math.pow(PHYSICS_CONSTANTS.FLOOR_FRICTION, gravityMult);
    bey.velocity.y *= Math.pow(PHYSICS_CONSTANTS.FLOOR_FRICTION, gravityMult);
  }
  
  // ============================================
  // IRON CRUCIBLE - FORÇAS ESPECÍFICAS
  // ============================================
  
  applyVolcanicRageForces(bey) {
    const dx = bey.position.x - this.centerX;
    const dy = bey.position.y - this.centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const zones = this.arena.features.frictionMap;

    // ── Knockback preservado no Magma Core (sem pull) ─────────
    // Não há pull central — knockback age livremente

    // ── Eruption: força outward radial (ignora weight) ────────
    if (this.arenaState && this.arenaState.eruptionActive) {
      const elapsed = this.arenaState.time - this.arenaState.eruptionStartTime;
      const duration = 1.5;
      if (elapsed < duration && distance > 0) {
        const force = this.arena.physicsModifiers.knockbackMultiplier *
                      6.5 * (1.0 - elapsed / duration);
        bey.acceleration.x += (dx / distance) * force;
        bey.acceleration.y += (dy / distance) * force;
      }
    }

    // ── Obsidian Belt micro-reflexões ─────────────────────────
    if (distance >= zones.lavaFlowRing.radius && distance < zones.obsidianBelt.radius) {
      if (Math.random() < 0.08) {
        const lossSpeed = Math.sqrt(bey.velocity.x ** 2 + bey.velocity.y ** 2) * 0.15;
        const randomAngle = Math.random() * Math.PI * 2;
        bey.velocity.x -= Math.cos(randomAngle) * lossSpeed;
        bey.velocity.y -= Math.sin(randomAngle) * lossSpeed;
      }
    }

    // ── Lava Flow drag ────────────────────────────────────────
    if (bey.onLavaFlow) {
      bey.velocity.x *= 0.95;
      bey.velocity.y *= 0.95;
    }
  }

  // Mantém nome antigo como alias
  applyIronCrucibleForces(bey) { this.applyVolcanicRageForces(bey); }

  // ============================================
  // TIDAL SURGE — APLICAÇÃO DE FORÇAS (idêntico ao visual)
  // ============================================
  applyTidalForces(bey) {
    const feat = this.arena.features;
    const tide = feat.tide;
    const mods = this.arena.physicsModifiers;
    const type = feat.tideType;

    const dx = bey.position.x - this.centerX;
    const dy = bey.position.y - this.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const zones = feat.zones;

    // ── Ilha central: bônus de estabilidade ──────────
    if (dist < zones.island) {
      bey.health.stability = Math.min(100, bey.health.stability + mods.islandStabilityBonus * this.timeStep * 60);
      // sem stamina drain na ilha — não aplicamos nada além do decay natural
      return; // restante das forças não se aplica
    }

    // ── Areia seca: leve drag extra ──────────────────
    if (dist > zones.floodZone && dist < zones.sand) {
      bey.velocity.x *= 0.9992;
      bey.velocity.y *= 0.9992;
    }

    const applyWaterAt = (wx, wy, radius, phaseName) => {
      const wdx = bey.position.x - wx;
      const wdy = bey.position.y - wy;
      const wd  = Math.sqrt(wdx * wdx + wdy * wdy);
      if (wd >= radius || radius <= 0) return;

      // Profundidade normalizada [0=borda, 1=centro]
      const depth = 1 - (wd / radius);

      // Fricção gradiente
      const { shallow, mid, deep } = mods.waterFriction;
      const friction = depth < 0.33 ? shallow : depth < 0.66 ? mid : deep;
      bey.velocity.x *= friction;
      bey.velocity.y *= friction;

      // Stamina drain gradiente
      bey.health.stamina -= (0.04 + depth * 0.08) * this.timeStep;

      // Corrente centrípeta
      const force = phaseName === 'high'
        ? mods.waterCurrentForce.high
        : mods.waterCurrentForce.rising;
      const adx = wx - bey.position.x;
      const ady = wy - bey.position.y;
      const ad  = Math.sqrt(adx * adx + ady * ady);
      if (ad > 0) {
        bey.acceleration.x += (adx / ad) * force * depth;
        bey.acceleration.y += (ady / ad) * force * depth;
      }

      // Corrente tangencial (maré espiral)
      if (type === 'spiral') {
        const tang = mods.spiralTangentialForce * tide.spiralDirection * depth;
        bey.acceleration.x += (-wdy / (wd || 1)) * tang;
        bey.acceleration.y += ( wdx / (wd || 1)) * tang;
      }
    };

    if (type === 'standard' || type === 'spiral') {
      if (tide.phase !== 'low') {
        applyWaterAt(this.centerX, this.centerY, tide.floodRadius, tide.phase);
      }

    } else if (type === 'double') {
      if (tide.dualFlood > 0) {
        for (const side of [0, Math.PI]) {
          const ax = this.centerX + Math.cos(tide.dualAngle + side) * zones.floodZone * 0.5;
          const ay = this.centerY + Math.sin(tide.dualAngle + side) * zones.floodZone * 0.5;
          applyWaterAt(ax, ay, tide.dualFlood, tide.phase);
        }
      }

    } else if (type === 'inverse') {
      const inv = tide.inverseProgress || 0;
      if (inv > 0) {
        const innerEdge = zones.sand - inv * (zones.sand - zones.floodZone);
        if (dist > innerEdge && dist < zones.wall) {
          const depth = (dist - innerEdge) / (zones.wall - innerEdge);
          const friction = mods.waterFriction.shallow + depth * (mods.waterFriction.deep - mods.waterFriction.shallow);
          bey.velocity.x *= friction;
          bey.velocity.y *= friction;
          bey.health.stamina -= (0.04 + depth * 0.06) * this.timeStep;
          // Corrente empurra para dentro
          if (dist > 0) {
            bey.acceleration.x -= (dx / dist) * mods.waterCurrentForce.high * depth;
            bey.acceleration.y -= (dy / dist) * mods.waterCurrentForce.high * depth;
          }
        }
      }

    } else if (type === 'chaos') {
      for (const blob of tide.blobs) {
        const bx = this.centerX + blob.x;
        const by = this.centerY + blob.y;
        applyWaterAt(bx, by, blob.r, 'high');
      }
    }

    // ── TSUNAMI: shrink effective wall and push blades inward ─────
    const ts = feat.tsunamiSystem;
    if (ts && (ts.wallOffset > 0 || ts.permanentOffset > 0)) {
      const effectiveWall = (feat.zones?.wall || 220) - ts.permanentOffset - ts.wallOffset;
      if (dist > effectiveWall - bey.health?.stability * 0.01) {
        const angle = Math.atan2(bey.position.y - this.centerY, bey.position.x - this.centerX);
        // Push force scales with penetration depth
        const penetration = dist - effectiveWall;
        const forceMult = ts.level === 'apocalyptic' ? 2.2 : ts.level === 'heavy' ? 1.5 : 0.9;
        const pushForce = Math.min(6, 0.8 + penetration * 0.15) * forceMult;
        bey.acceleration.x -= Math.cos(angle) * pushForce;
        bey.acceleration.y -= Math.sin(angle) * pushForce;
        // Reposition
        if (dist > effectiveWall) {
          bey.position.x = this.centerX + Math.cos(angle) * (effectiveWall - 1);
          bey.position.y = this.centerY + Math.sin(angle) * (effectiveWall - 1);
          // Reflect outward velocity
          const dot = bey.velocity.x * Math.cos(angle) + bey.velocity.y * Math.sin(angle);
          if (dot > 0) {
            bey.velocity.x -= 2 * dot * Math.cos(angle);
            bey.velocity.y -= 2 * dot * Math.sin(angle);
          }
          bey.velocity.x *= 0.70; bey.velocity.y *= 0.70;
          bey.health.stamina -= forceMult * 0.6;
        }
      }
    }
  }

  applyBowlForce(bey) {
    // Bowl sem pull central — apenas resiste ao movimento para fora
    const dx = bey.position.x - this.centerX;
    const dy = bey.position.y - this.centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const wall = this.arena.radius;

    if (distance > 0 && distance > wall * 0.7) {
      const normalizedDist = (distance - wall * 0.7) / (wall * 0.3);
      const bowlForce = normalizedDist * 2.5;
      bey.acceleration.x -= (dx / distance) * bowlForce;
      bey.acceleration.y -= (dy / distance) * bowlForce;
    }
  }

  applyGravityTrap(bey) {
    // Removido — Volcanic Rage não tem gravity trap clássico
  }
  
  getVariableFriction(bey) {
    const dx = bey.position.x - this.centerX;
    const dy = bey.position.y - this.centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const fm = this.arena.features.frictionMap;
    if (!fm) return 1.0;

    // Suporte ao novo mapa de zonas (Volcanic Rage)
    if (fm.magmaCore) {
      if (distance < fm.magmaCore.radius)    return fm.magmaCore.friction;
      if (distance < fm.lavaFlowRing.radius) return fm.lavaFlowRing.friction;
      if (distance < fm.obsidianBelt.radius) return fm.obsidianBelt.friction;
      return fm.craterEdge.friction;
    }

    // Mapa legado (outras arenas com center/mid/outer)
    if (distance < fm.center.radius) {
      return fm.center.friction;
    } else if (distance < fm.mid.radius) {
      const t = (distance - fm.center.radius) /
                (fm.mid.radius - fm.center.radius);
      return fm.center.friction + t * (fm.mid.friction - fm.center.friction);
    } else {
      const t = (distance - fm.mid.radius) /
                (fm.outer.radius - fm.mid.radius);
      return fm.mid.friction + t * (fm.outer.friction - fm.mid.friction);
    }
  }
  
  // ============================================
  // INTEGRAÇÃO FÍSICA (MOVIMENTO)
  // ============================================
  
  integratePhysics(bey) {
    // Integração de Euler melhorada (semi-implícita)
    
    // Atualiza velocidade com aceleração
    bey.velocity.x += bey.acceleration.x * this.timeStep;
    bey.velocity.y += bey.acceleration.y * this.timeStep;
    
    // Aplica atrito
    let frictionMult = this.arena.physicsModifiers.frictionMultiplier || 1.0;
    
    // Volcanic Rage: fricção variável baseada em posição
    if (frictionMult === 'VARIABLE' && this.arena.features.frictionMap) {
      const variableFriction = this.getVariableFriction(bey);
      // Usa fricção variável diretamente
      bey.velocity.x *= variableFriction;
      bey.velocity.y *= variableFriction;
    } else {
      // Fricção normal para outras arenas
      bey.velocity.x *= Math.pow(PHYSICS_CONSTANTS.FLOOR_FRICTION, frictionMult);
      bey.velocity.y *= Math.pow(PHYSICS_CONSTANTS.FLOOR_FRICTION, frictionMult);
    }
    
    bey.velocity.x *= PHYSICS_CONSTANTS.AIR_FRICTION;
    bey.velocity.y *= PHYSICS_CONSTANTS.AIR_FRICTION;
    
    // Atualiza posição
    const oldX = bey.position.x;
    const oldY = bey.position.y;
    bey.position.x += bey.velocity.x * this.timeStep;
    bey.position.y += bey.velocity.y * this.timeStep;
    
    // Atualiza distância percorrida
    const distMoved = Math.sqrt((bey.position.x - oldX) ** 2 + (bey.position.y - oldY) ** 2);
    bey.stats_battle.distance += distMoved;
    
    // Atualiza velocidade máxima
    const speed = bey.getSpeed();
    if (speed > bey.stats_battle.maxVelocity) {
      bey.stats_battle.maxVelocity = speed;
    }
    
    // Atualiza spin
    bey.spinVelocity += bey.spinAcceleration * this.timeStep;
    
    // Limpa aceleração para o próximo frame
    bey.acceleration.x = 0;
    bey.acceleration.y = 0;
    bey.spinAcceleration = 0;
    
    // Atualiza ângulo visual
    bey.angle += bey.spinVelocity * bey.spinDirection * this.timeStep * 0.1;
  }
  
  // ============================================
  // INTERAÇÕES COM ARENA
  // ============================================
  
  checkArenaInteractions(bey) {
    // Colisão com parede
    this.checkWallCollision(bey);
    
    // Features específicas por arena
    switch (this.arenaType) {
      case 'NEXUS':
        this.checkPortalTeleport(bey);
        break;
      case 'PINBALL_HELL':
        this.checkBumperCollision(bey);
        this.checkFlipperCollision(bey);
        break;
      case 'KILLER_SIDES':
        this.checkGripTrackCapture(bey);
        break;
      case 'THE_PITT':
        this.checkPittOpenings(bey);
        break;
    }
  }
  
  checkWallCollision(bey) {
    const dx = bey.position.x - this.centerX;
    const dy = bey.position.y - this.centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Ring out check
    const ringOutThreshold = this.arena.radius + PHYSICS_CONSTANTS.RING_OUT_MARGIN;
    if (distance > ringOutThreshold) {
      bey.alive = false;
      this.logEvent('RING_OUT', {
        player: bey.playerNumber,
        time: this.time,
        distance: distance.toFixed(1)
      });
      return;
    }
    
    // Wall bounce
    if (distance > this.arena.radius) {
      // Normal da parede
      const nx = dx / distance;
      const ny = dy / distance;
      
      // Reposiciona dentro da arena
      bey.position.x = this.centerX + nx * this.arena.radius;
      bey.position.y = this.centerY + ny * this.arena.radius;
      
      // Calcula velocidade de reflexão
      const dot = bey.velocity.x * nx + bey.velocity.y * ny;
      const restitution = PHYSICS_CONSTANTS.BASE_RESTITUTION;
      
      bey.velocity.x -= 2 * dot * nx * restitution;
      bey.velocity.y -= 2 * dot * ny * restitution;
      
      // Dano de parede
      const impactSpeed = Math.abs(dot);
      const wallDamage = impactSpeed * 0.3;
      bey.health.stability -= wallDamage;
      bey.health.burstDamage += wallDamage * 0.5;
      
      this.logEvent('WALL_BOUNCE', {
        player: bey.playerNumber,
        impact: impactSpeed.toFixed(2)
      });
    }
  }
  
  checkPortalTeleport(bey) {
    if (!this.arena.features.portals) return;
    
    for (const portal of this.arena.features.portals) {
      const dx = bey.position.x - (this.centerX + portal.x);
      const dy = bey.position.y - (this.centerY + portal.y);
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < portal.radius) {
        // Verifica cooldown
        if (this.time - bey.lastPortalUse < portal.cooldown) continue;
        
        // Teleporta!
        bey.position.x = this.centerX + portal.targetX;
        bey.position.y = this.centerY + portal.targetY;
        
        // Speed boost
        const speedBoost = this.arena.physicsModifiers.portalSpeedBoost || 1.3;
        bey.velocity.x *= speedBoost;
        bey.velocity.y *= speedBoost;
        
        bey.lastPortalUse = this.time;
        
        this.logEvent('PORTAL_TELEPORT', {
          player: bey.playerNumber,
          from: { x: portal.x, y: portal.y },
          to: { x: portal.targetX, y: portal.targetY }
        });
      }
    }
  }
  
  checkBumperCollision(bey) {
    if (!this.arena.features.bumpers) return;
    
    for (const bumper of this.arena.features.bumpers) {
      const dx = bey.position.x - (this.centerX + bumper.x);
      const dy = bey.position.y - (this.centerY + bumper.y);
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < bumper.radius + 15) { // 15 = raio do beyblade
        // Calcula reflexão com boost
        const nx = dx / distance;
        const ny = dy / distance;
        
        // Afasta da superfície
        const overlap = (bumper.radius + 15) - distance;
        bey.position.x += nx * overlap;
        bey.position.y += ny * overlap;
        
        // Aplica força de ricochete
        const dot = bey.velocity.x * nx + bey.velocity.y * ny;
        bey.velocity.x -= 2 * dot * nx;
        bey.velocity.y -= 2 * dot * ny;
        
        // Boost de velocidade
        const speed = bey.getSpeed();
        const boostFactor = bumper.bounceForce / speed;
        bey.velocity.x *= boostFactor;
        bey.velocity.y *= boostFactor;
        
        this.logEvent('BUMPER_HIT', {
          player: bey.playerNumber,
          boost: boostFactor.toFixed(2)
        });
      }
    }
  }
  
  checkFlipperCollision(bey) {
    if (!this.arena.features.flippers) return;
    
    for (const flipper of this.arena.features.flippers) {
      // Simplificado: flipper como linha
      const fx = this.centerX + flipper.x;
      const fy = this.centerY + 0; // Flippers horizontais
      
      // Distância à linha do flipper
      const dx = bey.position.x - fx;
      const dy = bey.position.y - fy;
      
      if (Math.abs(dx) < flipper.width/2 && Math.abs(dy) < 20) {
        // Hit!
        const forceAngle = flipper.angle + (dy > 0 ? Math.PI/4 : -Math.PI/4);
        bey.velocity.x = Math.cos(forceAngle) * flipper.bounceForce;
        bey.velocity.y = Math.sin(forceAngle) * flipper.bounceForce;
        
        this.logEvent('FLIPPER_LAUNCH', {
          player: bey.playerNumber,
          force: flipper.bounceForce
        });
      }
    }
  }
  
  checkGripTrackCapture(bey) {
    if (!this.arena.features.gripTracks) return;
    
    const speed = bey.getSpeed();
    const speedThreshold = this.arena.physicsModifiers.speedThreshold;
    
    // Se velocidade < threshold, beyblade pode ser capturado
    if (speed < speedThreshold && !bey.captured) {
      for (const track of this.arena.features.gripTracks) {
        // Verifica proximidade ao track
        const distToLine = this.pointToLineDistance(
          bey.position.x, bey.position.y,
          this.centerX + track.x1, this.centerY + track.y1,
          this.centerX + track.x2, this.centerY + track.y2
        );
        
        if (distToLine < track.width / 2) {
          // CAPTURADO!
          bey.captured = true;
          bey.velocity.x = 0;
          bey.velocity.y = 0;
          
          // Calcula direção para o centro
          const dx = this.centerX - bey.position.x;
          const dy = this.centerY - bey.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          // Armazena dados de relançamento — liberação acontece no loop principal após 30 frames (0.5s @ 60fps)
          bey.capturedAtFrame = this.frame;
          bey.capturedLaunchDx = dx;
          bey.capturedLaunchDy = dy;
          bey.capturedLaunchForce = track.launchForce;
          
          this.logEvent('GRIP_TRACK_CAPTURE', {
            player: bey.playerNumber,
            speed: speed.toFixed(2)
          });
          
          break;
        }
      }
    }
  }
  
  checkPittOpenings(bey) {
    if (!this.arenaState.openSections || this.arenaState.openSections.length === 0) return;
    
    const dx = bey.position.x - this.centerX;
    const dy = bey.position.y - this.centerY;
    const angle = Math.atan2(dy, dx);
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Verifica se está em uma seção aberta
    for (const section of this.arenaState.openSections) {
      let angleDiff = Math.abs(angle - section.angle);
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
      
      if (angleDiff < section.width / 2 && distance > this.arena.radius * 0.7) {
        // Beyblade cai no buraco!
        bey.alive = false;
        this.logEvent('PITT_FALL', {
          player: bey.playerNumber,
          time: this.time
        });
      }
    }
  }
  
  pointToLineDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) param = dot / lenSq;
    
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  // ============================================
  // COLISÃO ENTRE BEYBLADES - FÍSICA ULTRA REALISTA
  // ============================================
  
  handleBeybladeCollision(bey1, bey2) {
    const dx = bey2.position.x - bey1.position.x;
    const dy = bey2.position.y - bey1.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const minDistance = PHYSICS_CONSTANTS.COLLISION_THRESHOLD;
    
    if (distance < minDistance) {
      // === PREPARAÇÃO ===
      const nx = dx / distance;
      const ny = dy / distance;
      
      // Velocidades relativas
      const dvx = bey1.velocity.x - bey2.velocity.x;
      const dvy = bey1.velocity.y - bey2.velocity.y;
      const dvn = dvx * nx + dvy * ny;
      
      // Se estão se afastando, ignora
      if (dvn > 0) return;
      
      // === FASE 1: CÁLCULO DE MASSAS EFETIVAS ===
      const mass1 = bey1.mass + (bey1.spinVelocity * 0.12);
      const mass2 = bey2.mass + (bey2.spinVelocity * 0.12);
      
      // === FASE 2: SUPERFÍCIES DE CONTATO ===
      const roughness1 = bey1.contactSurfaceRoughness;
      const roughness2 = bey2.contactSurfaceRoughness;
      const avgRoughness = (roughness1 + roughness2) / 2;
      
      // === FASE 3: COEFICIENTE DE RESTITUIÇÃO ===
      const baseRestitution = PHYSICS_CONSTANTS.BASE_RESTITUTION;
      const restitution = baseRestitution * (1.0 - avgRoughness * 0.15);
      
      // === FASE 4: IMPULSO BASE ===
      const impulse = -(1 + restitution) * dvn / (1/mass1 + 1/mass2);
      
      // === FASE 5: ATTACK MULTIPLIERS ===
      // Attack aumenta força do impulso gerado
      const attackMult1 = 1.0 + (bey1.stats.atk / 40);
      const attackMult2 = 1.0 + (bey2.stats.atk / 40);
      
      // === FASE 6: VELOCITY BOOST ===
      // Velocidades maiores = colisões mais violentas
      const relSpeed = bey1.getSpeed() + bey2.getSpeed();
      const velocityBoost = 1.0 + Math.pow(relSpeed / 15, 1.4);
      
      // === FASE 7: KNOCKBACK FINAL ===
      const knockbackScale = 12.0; // Ajuste para arena
      let kb1 = (impulse / (mass1 / 3.5)) * attackMult2 * velocityBoost * knockbackScale;
      let kb2 = (impulse / (mass2 / 3.5)) * attackMult1 * velocityBoost * knockbackScale;
      
      // === FASE 7.5: WEIGHT ADVANTAGE (VOLCANIC RAGE) ===
      // Beys pesadas têm vantagem moderada — weightAdvantage: 1.2
      if (this.arena.physicsModifiers.weightAdvantage) {
        const weightAdv = this.arena.physicsModifiers.weightAdvantage;
        const weightRatio = bey1.stats.weight / bey2.stats.weight;
        
        if (weightRatio > 1.0) {
          kb1 /= (1.0 + (weightRatio - 1.0) * weightAdv * 0.2);
          kb2 *= (1.0 + (weightRatio - 1.0) * weightAdv * 0.2);
        } else if (weightRatio < 1.0) {
          kb1 *= (1.0 + (1.0/weightRatio - 1.0) * weightAdv * 0.2);
          kb2 /= (1.0 + (1.0/weightRatio - 1.0) * weightAdv * 0.2);
        }
      }
      
      // === FASE 8: SPIN INTERACTION ===
      const sameSpin = (bey1.spinDirection === bey2.spinDirection);
      let spinTransfer = 0;
      let knockbackMult = 1.0;
      
      if (sameSpin) {
        // Mesma direção: spins se ANULAM = explosão de energia
        spinTransfer = 0.65;
        knockbackMult = 6.5;
        
        const avgSpin = (bey1.spinVelocity + bey2.spinVelocity) / 2;
        bey1.spinVelocity = avgSpin * 0.58;
        bey2.spinVelocity = avgSpin * 0.58;
      } else {
        // Direções opostas: spins preservados mas há transferência
        spinTransfer = 0.28;
        knockbackMult = 4.8;
        
        bey1.spinVelocity *= 0.91;
        bey2.spinVelocity *= 0.91;
      }
      
      // === FASE 9: APLICAR KNOCKBACK ===
      const finalKb1 = kb1 * knockbackMult;
      const finalKb2 = kb2 * knockbackMult;
      
      bey1.velocity.x += nx * finalKb1;
      bey1.velocity.y += ny * finalKb1;
      bey2.velocity.x -= nx * finalKb2;
      bey2.velocity.y -= ny * finalKb2;
      
      // === FASE 10: COMPONENTE TANGENCIAL (IMPREVISIBILIDADE) ===
      const tx = -ny;
      const ty = nx;
      const tangentialFactor = avgRoughness * 2.5 * relSpeed * 0.22;
      const randomDeviation = (Math.random() - 0.5) * Math.PI * 0.35 * avgRoughness;
      
      const rtx = tx * Math.cos(randomDeviation) - ty * Math.sin(randomDeviation);
      const rty = tx * Math.sin(randomDeviation) + ty * Math.cos(randomDeviation);
      
      bey1.velocity.x += rtx * tangentialFactor * roughness1;
      bey1.velocity.y += rty * tangentialFactor * roughness1;
      bey2.velocity.x -= rtx * tangentialFactor * roughness2;
      bey2.velocity.y -= rty * tangentialFactor * roughness2;
      
      // === FASE 11: SPIN TRANSFER (SPIN → VELOCIDADE LINEAR) ===
      const spinBoost1 = bey1.spinVelocity * spinTransfer * 0.18;
      const spinBoost2 = bey2.spinVelocity * spinTransfer * 0.18;
      const boostAngle1 = Math.atan2(bey1.velocity.y, bey1.velocity.x) + (Math.random() - 0.5) * 1.2;
      const boostAngle2 = Math.atan2(bey2.velocity.y, bey2.velocity.x) + (Math.random() - 0.5) * 1.2;
      
      bey1.velocity.x += Math.cos(boostAngle1) * spinBoost1;
      bey1.velocity.y += Math.sin(boostAngle1) * spinBoost1;
      bey2.velocity.x += Math.cos(boostAngle2) * spinBoost2;
      bey2.velocity.y += Math.sin(boostAngle2) * spinBoost2;
      
      // === FASE 12: CÁLCULO DE DANO ===
      const speed1 = bey1.getSpeed();
      const speed2 = bey2.getSpeed();
      
      // Impact força = atk * velocidade^1.5
      // TEC: hit accuracy — glancing blow reduz impacto a 35%
      const _hitAcc1 = bey1.data?.hitAccuracy ?? bey1.hitAccuracy ?? 0.68;
      const _hitAcc2 = bey2.data?.hitAccuracy ?? bey2.hitAccuracy ?? 0.68;
      const _glance1 = Math.random() > _hitAcc1 ? 0.35 : 1.0;
      const _glance2 = Math.random() > _hitAcc2 ? 0.35 : 1.0;
      const impact1 = (bey1.stats.atk * 0.75) * Math.pow(speed1, 1.5) * (1 + roughness1 * 0.5) * _glance1;
      const impact2 = (bey2.stats.atk * 0.75) * Math.pow(speed2, 1.5) * (1 + roughness2 * 0.5) * _glance2;
      
      // Defense reduz dano recebido
      const defReduction1 = Math.max(0.3, 1.0 - (bey1.stats.def / 80));
      const defReduction2 = Math.max(0.3, 1.0 - (bey2.stats.def / 80));
      
      const damageMult = sameSpin ? 1.4 : 1.0;
      const damage1 = (impact2 / mass1) * defReduction1 * damageMult;
      const damage2 = (impact1 / mass2) * defReduction2 * damageMult;
      
      // Aplica dano
      bey1.health.stamina -= damage1 * 0.5;
      bey1.health.stability -= damage1 * 0.6;
      bey1.health.burstDamage += damage1 * 3.0;
      
      bey2.health.stamina -= damage2 * 0.5;
      bey2.health.stability -= damage2 * 0.6;
      bey2.health.burstDamage += damage2 * 3.0;

      // ── STAMINA BURST ABSORPTION ──
      // Quando Stamina é atingido por Attack, o STA absorve parte do burst acumulado
      // e retorna 15% como recoil para o Atacante.
      if (bey2.data?.type === 'Attack' && bey1.data?.type === 'Stamina') {
        const sta1 = bey1.stats.sta || 10;
        const absorptionRate1 = Math.min(0.60, sta1 / 40);
        const rawBurst1 = damage1 * 3.0;
        const absorbed1 = rawBurst1 * absorptionRate1;
        bey1.health.burstDamage = Math.max(0, bey1.health.burstDamage - absorbed1);
        bey2.health.burstDamage += absorbed1 * 0.15; // recoil no Atacante
        this.logEvent('STAMINA_BURST_ABSORPTION', { bey: 1, absorbed: absorbed1.toFixed(1), recoil: (absorbed1 * 0.15).toFixed(1) });
      }
      if (bey1.data?.type === 'Attack' && bey2.data?.type === 'Stamina') {
        const sta2 = bey2.stats.sta || 10;
        const absorptionRate2 = Math.min(0.60, sta2 / 40);
        const rawBurst2 = damage2 * 3.0;
        const absorbed2 = rawBurst2 * absorptionRate2;
        bey2.health.burstDamage = Math.max(0, bey2.health.burstDamage - absorbed2);
        bey1.health.burstDamage += absorbed2 * 0.15; // recoil no Atacante
        this.logEvent('STAMINA_BURST_ABSORPTION', { bey: 2, absorbed: absorbed2.toFixed(1), recoil: (absorbed2 * 0.15).toFixed(1) });
      }
      
      // === 🆕 EFEITOS ESPECIAIS DAS PARTS (colisão) ===
      this.processPartSpecialEffects(bey1, bey2, damage1, damage2, true);
      this.processPartSpecialEffects(bey2, bey1, damage2, damage1, true);
      
      // === FASE 13: VERIFICAR BURST ===
      this.checkBurstDamage(bey1);
      this.checkBurstDamage(bey2);
      
      // === ESTATÍSTICAS ===
      bey1.stats_battle.collisions++;
      bey2.stats_battle.collisions++;
      bey1.stats_battle.damageDealt += damage2;
      bey2.stats_battle.damageDealt += damage1;
      bey1.stats_battle.damageReceived += damage1;
      bey2.stats_battle.damageReceived += damage2;
      
      // === LOG ===
      this.logEvent('COLLISION', {
        time: this.time.toFixed(2),
        impact1: impact1.toFixed(1),
        impact2: impact2.toFixed(1),
        damage1: damage1.toFixed(1),
        damage2: damage2.toFixed(1),
        sameSpin
      });
      
      // === SEPARAR BEYBLADES (EVITAR OVERLAP) ===
      const overlap = minDistance - distance;
      const separationX = nx * (overlap / 2 + 1);
      const separationY = ny * (overlap / 2 + 1);
      
      bey1.position.x -= separationX;
      bey1.position.y -= separationY;
      bey2.position.x += separationX;
      bey2.position.y += separationY;
    }
  }
  
  checkBurstDamage(bey) {
    if (bey.health.burstDamage >= PHYSICS_CONSTANTS.BURST_THRESHOLD) {
      // Calcula probabilidade de burst baseada em resistência
      const burstChance = Math.min(0.95, (bey.health.burstDamage - PHYSICS_CONSTANTS.BURST_THRESHOLD) / bey.burstResistance);
      
      if (Math.random() < burstChance) {
        bey.alive = false;
        this.logEvent('BURST', {
          player: bey.playerNumber,
          damage: bey.health.burstDamage.toFixed(1),
          chance: (burstChance * 100).toFixed(1) + '%'
        });
      }
    }
  }
  
  // ============================================
  // 🆕 EFEITOS ESPECIAIS DAS PARTS
  // ============================================

  processPartSpecialEffects(bey, opponent, damageOnBey, damageByBey, isCollision) {
    const parts = bey.data;
    const time = this.time;

    // ── LAYER EFFECTS ──────────────────────────────────────────
    const layer = parts?.layer;
    if (layer?.special) {
      switch (layer.special) {
        case 'spin_steal_boost':
          // Crescent Moon - +20% spin steal em toda colisão
          if (isCollision) {
            const bonus = layer.specialValue || 0.20;
            const stolen = opponent.spinVelocity * 0.05 * bonus;
            opponent.spinVelocity -= stolen;
            bey.spinVelocity += stolen * 0.5;
          }
          break;

        case 'upward_force':
          // Eagle Talon - knockback vertical aumentado (usa stability)
          if (isCollision) {
            const upForce = layer.specialValue || 0.30;
            opponent.health.stability -= damageByBey * upForce * 2;
          }
          break;

        case 'hit_absorption':
          // Turtle Shell - primeiros N hits absorvidos
          if (isCollision) {
            if (!bey.hitsAbsorbed) bey.hitsAbsorbed = 0;
            const maxAbsorb = layer.specialValue || 3;
            if (bey.hitsAbsorbed < maxAbsorb) {
              bey.hitsAbsorbed++;
              bey.health.stamina += damageOnBey * 0.5; // Devolver parte do dano absorvido
              bey.health.stability += damageOnBey * 0.6;
              bey.health.stamina = Math.min(100, bey.health.stamina);
              bey.health.stability = Math.min(100, bey.health.stability);
            }
          }
          break;

        case 'double_hit':
          // Atom Split - 10% chance de dano duplo
          if (isCollision && Math.random() < (layer.specialValue || 0.10)) {
            opponent.health.stamina -= damageByBey * 0.5;
            opponent.health.stability -= damageByBey * 0.6;
          }
          break;

        case 'scaling_damage':
          // Tidal Wave - dano aumenta com hits consecutivos
          if (isCollision) {
            if (!bey.consecutiveHits) bey.consecutiveHits = 0;
            bey.consecutiveHits++;
            const scaleBonus = bey.consecutiveHits * (layer.specialValue || 0.15);
            const extraDmg = damageByBey * Math.min(scaleBonus, 1.5); // Cap at +150%
            opponent.health.stamina -= extraDmg * 0.5;
            opponent.health.stability -= extraDmg * 0.6;
          } else {
            bey.consecutiveHits = 0; // Reset se não colidiu
          }
          break;
      }
    }

    // ── DISC EFFECTS ──────────────────────────────────────────
    const disc = parts?.disc;
    if (disc?.special) {
      switch (disc.special) {
        case 'critical_boost':
          // Precision - +15% chance de crítico
          if (isCollision && Math.random() < (disc.specialValue || 0.15)) {
            opponent.health.stamina -= damageByBey * 0.5;
            opponent.health.stability -= damageByBey * 0.6;
            opponent.health.burstDamage += damageByBey * 3.0;
          }
          break;

        case 'pull_effect':
          // Cyclone - puxa adversário
          if (!isCollision) {
            const dx = bey.position.x - opponent.position.x;
            const dy = bey.position.y - opponent.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const pullRadius = disc.specialValue || 25;
            if (dist < pullRadius && dist > 0) {
              const pullStrength = 0.4 * this.timeStep;
              opponent.velocity.x += (dx / dist) * pullStrength;
              opponent.velocity.y += (dy / dist) * pullStrength;
            }
          }
          break;

        case 'reactive_speed':
          // Voltage - +20% speed após levar hit
          if (isCollision && damageOnBey > 0 && !bey.reactiveSpeedActive) {
            bey.reactiveSpeedActive = true;
            bey.reactiveSpeedEnd = time + 2.0;
            const boost = disc.specialValue || 0.20;
            bey.velocity.x *= (1 + boost);
            bey.velocity.y *= (1 + boost);
          }
          if (bey.reactiveSpeedActive && time > (bey.reactiveSpeedEnd || 0)) {
            bey.reactiveSpeedActive = false;
          }
          break;

        case 'knockback_immunity':
          // Monolith - imune a knockback quando velocidade baixa
          // (aplicado após colisão - reverter o knockback se speed < threshold)
          if (isCollision) {
            const speed = bey.getSpeed();
            const threshold = disc.specialValue || 3;
            if (speed < threshold) {
              // Cancelar parte do knockback recebido
              bey.velocity.x *= 0.3;
              bey.velocity.y *= 0.3;
            }
          }
          break;

        case 'weight_shift':
          // Mystic - peso muda a cada 5s
          if (!bey.lastWeightShift) bey.lastWeightShift = 0;
          if (time - bey.lastWeightShift > 5.0) {
            bey.lastWeightShift = time;
            const shift = disc.specialValue || 3;
            const delta = (Math.random() > 0.5 ? shift : -shift);
            bey.stats.weight = Math.max(1, bey.stats.weight + delta);
            bey.mass = bey.calculateMass();
          }
          break;
      }
    }

    // ── DRIVER EFFECTS ──────────────────────────────────────────
    const driver = parts?.driver;
    if (driver?.special) {
      switch (driver.special) {
        case 'regen_boost':
          // Spiral - +0.5 stamina/s contínuo
          if (!isCollision) {
            const regenRate = driver.specialValue || 0.5;
            bey.health.stamina += regenRate * this.timeStep;
            bey.health.stamina = Math.min(100, bey.health.stamina);
          }
          break;

        case 'damage_reflect':
          // Diamond - reflete 15% do dano recebido
          if (isCollision && damageOnBey > 0) {
            const reflectPct = driver.specialValue || 0.15;
            const reflected = damageOnBey * reflectPct;
            opponent.health.stamina -= reflected * 0.5;
            opponent.health.stability -= reflected * 0.6;
          }
          break;

        case 'burst_speed':
          // Sprint - +50% speed nos primeiros N segundos
          if (time < (driver.specialDuration || 3) && !bey.burstSpeedApplied) {
            const speedBoost = driver.specialValue || 0.50;
            bey.velocity.x *= (1 + speedBoost);
            bey.velocity.y *= (1 + speedBoost);
            bey.burstSpeedApplied = true;
          }
          break;

        case 'wobble_immunity':
          // Equilibrium - mantém stability alta
          if (!isCollision) {
            bey.health.stability = Math.max(bey.health.stability, 30);
          }
          break;

        case 'last_stand':
          // Nova - +100% ataque quando < 20% stamina
          if (isCollision) {
            const threshold = driver.specialThreshold || 0.20;
            if (bey.health.stamina / 100 < threshold) {
              const atkBoost = driver.specialValue || 1.0;
              opponent.health.stamina -= damageByBey * atkBoost * 0.5;
              opponent.health.stability -= damageByBey * atkBoost * 0.6;
              opponent.health.burstDamage += damageByBey * atkBoost * 3.0;
            }
          }
          break;
      }
    }

    // ── ARMOR EFFECTS ──────────────────────────────────────────
    const armor = parts?.armor;
    if (armor?.effect) {
      switch (armor.effect) {
        case 'poison_sting':
          // Scorpion Tail - DoT stacking
          if (isCollision) {
            if (!opponent.poisonStacks) opponent.poisonStacks = 0;
            const maxStacks = armor.maxStacks || 4;
            opponent.poisonStacks = Math.min(maxStacks, opponent.poisonStacks + 1);
          }
          // Aplicar dano de veneno por tick
          if (opponent.poisonStacks > 0) {
            if (!opponent.lastPoisonTick) opponent.lastPoisonTick = 0;
            if (time - opponent.lastPoisonTick >= (armor.tickRate || 1.0)) {
              opponent.health.stamina -= opponent.poisonStacks;
              opponent.lastPoisonTick = time;
            }
          }
          break;

        case 'ice_wall':
          // Permafrost - barrier que absorve 1 hit a cada 8s
          if (!bey.iceWallReady) bey.iceWallReady = true;
          if (!bey.lastIceWall) bey.lastIceWall = 0;
          if (isCollision && damageOnBey > 0 && bey.iceWallReady) {
            // Cancelar dano recebido (já aplicado - reverter)
            bey.health.stamina += damageOnBey * 0.5;
            bey.health.stability += damageOnBey * 0.6;
            bey.health.stamina = Math.min(100, bey.health.stamina);
            bey.health.stability = Math.min(100, bey.health.stability);
            bey.iceWallReady = false;
            bey.lastIceWall = time;
          }
          if (!bey.iceWallReady && time - bey.lastIceWall >= (armor.cooldown || 8.0)) {
            bey.iceWallReady = true;
          }
          break;

        case 'triple_strike':
          // Trident Guard - 15% chance de 3x hits
          if (isCollision && Math.random() < (armor.procChance || 0.15)) {
            const extraHits = armor.extraHits || 2;
            opponent.health.stamina -= damageByBey * extraHits * 0.5;
            opponent.health.stability -= damageByBey * extraHits * 0.6;
            opponent.health.burstDamage += damageByBey * extraHits * 3.0;
          }
          break;

        case 'spectrum_shift':
          // Prism Shell - muda elemento a cada 5s
          if (!bey.currentElement) bey.currentElement = 0;
          if (!bey.lastElementShift) bey.lastElementShift = 0;
          if (time - bey.lastElementShift >= (armor.shiftInterval || 5.0)) {
            bey.currentElement = (bey.currentElement + 1) % (armor.elements?.length || 4);
            bey.lastElementShift = time;
          }
          if (isCollision) {
            const element = armor.elements?.[bey.currentElement] || 'fire';
            switch (element) {
              case 'fire':
                opponent.health.stamina -= damageByBey * 0.2 * 0.5;
                break;
              case 'ice':
                opponent.velocity.x *= 0.85;
                opponent.velocity.y *= 0.85;
                break;
              case 'lightning':
                if (Math.random() < 0.15) opponent.health.stability -= 5;
                break;
              case 'wind':
                opponent.velocity.x *= 1.2;
                opponent.velocity.y *= 1.2;
                break;
            }
          }
          break;

        case 'web_trap':
          // Spider Web - slow stacking
          if (isCollision) {
            if (!opponent.webStacks) opponent.webStacks = 0;
            const slowPct = armor.slowPercent || 0.20;
            const maxSlow = armor.maxSlow || 0.60;
            opponent.webStacks = Math.min(maxSlow, opponent.webStacks + slowPct);
            opponent.velocity.x *= (1 - opponent.webStacks * this.timeStep * 2);
            opponent.velocity.y *= (1 - opponent.webStacks * this.timeStep * 2);
          }
          break;

        case 'execute':
          // Skull Crusher - 3x dano se adversário < 25% stamina
          if (isCollision && opponent.health.stamina / 100 <= (armor.executeThreshold || 0.25)) {
            const execMult = (armor.executeMultiplier || 3.0) - 1; // Extra além do base
            opponent.health.stamina -= damageByBey * execMult * 0.5;
            opponent.health.stability -= damageByBey * execMult * 0.6;
            opponent.health.burstDamage += damageByBey * execMult * 3.0;
          }
          break;

        case 'moon_phases':
          // Luna Cycle - stats cíclicos
          if (!bey.moonPhaseStart) bey.moonPhaseStart = time;
          if (isCollision && armor.phases) {
            const cycleDur = armor.cycleDuration || 20.0;
            const elapsed = time - bey.moonPhaseStart;
            const phaseIdx = Math.floor((elapsed / cycleDur) * armor.phases.length) % armor.phases.length;
            const phase = armor.phases[phaseIdx];
            const atkMod = (phase?.atkMod || 1.0) - 1; // Delta além do base
            if (atkMod > 0) {
              opponent.health.stamina -= damageByBey * atkMod * 0.5;
              opponent.health.stability -= damageByBey * atkMod * 0.6;
            }
          }
          break;

        case 'precision_timing':
          // Clockwork - crit a cada 10 hits
          if (isCollision) {
            if (!bey.clockworkHits) bey.clockworkHits = 0;
            bey.clockworkHits++;
            const critEvery = armor.criticalEvery || 10;
            if (bey.clockworkHits >= critEvery) {
              opponent.health.stamina -= damageByBey * 1.5 * 0.5;
              opponent.health.stability -= damageByBey * 1.5 * 0.6;
              opponent.health.burstDamage += damageByBey * 1.5 * 3.0;
              bey.clockworkHits = 0;
            }
          }
          break;
      }
    }
  }

  // ============================================
  // DECAY NATURAL
  // ============================================
  
  applyNaturalDecay() {
    for (const bey of this.beyblades) {
      if (!bey.alive) continue;
      
      // Decay de spin
      const spinDecayMult = this.arena.physicsModifiers.spinDecayMult || 1.0;
      bey.spinVelocity -= PHYSICS_CONSTANTS.SPIN_DECAY_RATE * spinDecayMult * this.timeStep;
      bey.spinVelocity = Math.max(0, bey.spinVelocity);
      
      // Atualiza health.spin baseado em spinVelocity
      bey.health.spin = (bey.spinVelocity / bey.calculateInitialSpin()) * 100;
      
      // Decay de stamina (muito lento)
      bey.health.stamina -= 0.01 * this.timeStep;
      bey.health.stamina = Math.max(0, bey.health.stamina);
      
      // Decay de stability baseado em velocidade (movimento = desgaste)
      const speed = bey.getSpeed();
      const stabilityLoss = (speed * 0.001 + 0.005) * this.timeStep;
      bey.health.stability -= stabilityLoss;
      bey.health.stability = Math.max(0, bey.health.stability);
    }
  }
  
  // ============================================
  // VERIFICAÇÃO DE CONDIÇÕES DE VITÓRIA
  // ============================================
  
  checkWinConditions() {
    const bey1 = this.beyblades[0];
    const bey2 = this.beyblades[1];
    
    // BURST FINISH
    if (!bey1.alive && bey2.alive) {
      return { winner: 2, loser: 1, finishType: 'BURST' };
    }
    if (bey1.alive && !bey2.alive) {
      return { winner: 1, loser: 2, finishType: 'BURST' };
    }
    
    // RING OUT (já marcado como !alive)
    // (detalhes no log de eventos)
    
    // SPIN FINISH
    if (bey1.spinVelocity <= PHYSICS_CONSTANTS.MIN_SPIN_VELOCITY && bey2.spinVelocity > PHYSICS_CONSTANTS.MIN_SPIN_VELOCITY) {
      bey1.alive = false;
      return { winner: 2, loser: 1, finishType: 'SPIN_FINISH' };
    }
    if (bey2.spinVelocity <= PHYSICS_CONSTANTS.MIN_SPIN_VELOCITY && bey1.spinVelocity > PHYSICS_CONSTANTS.MIN_SPIN_VELOCITY) {
      bey2.alive = false;
      return { winner: 1, loser: 2, finishType: 'SPIN_FINISH' };
    }
    
    // Ambos pararam (improvável mas possível)
    if (bey1.spinVelocity <= PHYSICS_CONSTANTS.MIN_SPIN_VELOCITY && bey2.spinVelocity <= PHYSICS_CONSTANTS.MIN_SPIN_VELOCITY) {
      // Quem tem mais stamina vence
      if (bey1.health.stamina > bey2.health.stamina) {
        return { winner: 1, loser: 2, finishType: 'SURVIVOR' };
      } else {
        return { winner: 2, loser: 1, finishType: 'SURVIVOR' };
      }
    }
    
    return null;
  }
  
  determineTimeoutWinner() {
    const bey1 = this.beyblades[0];
    const bey2 = this.beyblades[1];
    
    // Pontua: spin + stamina + stability
    const score1 = bey1.health.spin + bey1.health.stamina + bey1.health.stability;
    const score2 = bey2.health.spin + bey2.health.stamina + bey2.health.stability;
    
    if (score1 > score2) {
      return { winner: 1, loser: 2, finishType: 'SURVIVOR' };
    } else {
      return { winner: 2, loser: 1, finishType: 'SURVIVOR' };
    }
  }
  
  // ============================================
  // RESULTADO FINAL
  // ============================================
  
  buildFinalResult(winCondition) {
    return {
      winner: winCondition.winner,
      loser: winCondition.loser,
      finishType: winCondition.finishType,
      duration: this.time.toFixed(2),
      frames: this.frame,
      
      // Estatísticas finais
      beyblade1: {
        name: this.beyblades[0].data.name,
        player: this.beyblades[0].player.name,
        finalHealth: {
          spin: this.beyblades[0].health.spin.toFixed(1),
          stamina: this.beyblades[0].health.stamina.toFixed(1),
          stability: this.beyblades[0].health.stability.toFixed(1),
          burstDamage: this.beyblades[0].health.burstDamage.toFixed(1)
        },
        stats: {
          collisions: this.beyblades[0].stats_battle.collisions,
          damageDealt: this.beyblades[0].stats_battle.damageDealt.toFixed(1),
          damageReceived: this.beyblades[0].stats_battle.damageReceived.toFixed(1),
          distance: this.beyblades[0].stats_battle.distance.toFixed(0),
          maxVelocity: this.beyblades[0].stats_battle.maxVelocity.toFixed(1)
        }
      },
      
      beyblade2: {
        name: this.beyblades[1].data.name,
        player: this.beyblades[1].player.name,
        finalHealth: {
          spin: this.beyblades[1].health.spin.toFixed(1),
          stamina: this.beyblades[1].health.stamina.toFixed(1),
          stability: this.beyblades[1].health.stability.toFixed(1),
          burstDamage: this.beyblades[1].health.burstDamage.toFixed(1)
        },
        stats: {
          collisions: this.beyblades[1].stats_battle.collisions,
          damageDealt: this.beyblades[1].stats_battle.damageDealt.toFixed(1),
          damageReceived: this.beyblades[1].stats_battle.damageReceived.toFixed(1),
          distance: this.beyblades[1].stats_battle.distance.toFixed(0),
          maxVelocity: this.beyblades[1].stats_battle.maxVelocity.toFixed(1)
        }
      },
      
      // Eventos importantes
      events: this.events.filter(e => 
        ['COLLISION', 'BURST', 'RING_OUT', 'SPIN_FINISH', 'PORTAL_TELEPORT', 'GRIP_TRACK_LAUNCH', 'BUMPER_HIT'].includes(e.type)
      ),
      
      // Metadata
      arena: this.arena.name,
      arenaType: this.arenaType
    };
  }
  
  // ============================================
  // LOGGING DE EVENTOS
  // ============================================
  
  logEvent(type, data) {
    this.events.push({
      frame: this.frame,
      time: this.time.toFixed(3),
      type,
      data
    });
  }
}

// ============================================
// EXPORTS
// ============================================
export { BattlePhysicsEngine, ARENA_PHYSICS, PHYSICS_CONSTANTS, Beyblade };
export default BattlePhysicsEngine;
