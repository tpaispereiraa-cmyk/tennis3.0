// ============================================
// HeadlessBattle.js - Motor de Batalha Headless
// ============================================
//
// USA O MESMO MOTOR DO BattleArena (BattleComponents.jsx)
// Física 100% idêntica ao "ver jogo", porém:
//   - Canvas fake (ctx no-op proxy) → zero renderização
//   - While loop no lugar do requestAnimationFrame → velocidade máxima
//   - Tempo simulado a 60fps → física idêntica à exibição visual
//
// Para o bracket: substitui completamente SimulationEngine
// ============================================

import { 
  MENTALITIES, 
  LAUNCH_TECHNIQUES, 
  LAUNCH_QUALITY, 
  determineLaunchQuality,
  selectLaunchTechnique
} from './UniverseManager.js';
import { calculateStatBreakdown, calculateTotalStat } from './utils/stats.js';
import { getPlayerTraitData } from './traits_data.js';
// applyArenaPreferenceModifier removido — arena preference agora é parte do BASE (deck building)

// ─── Ctx fake: todos os draw calls viram no-op ────────────────────
function createFakeCtx() {
  const noop = () => fakeCtx;
  const fakeCtx = new Proxy({}, {
    get(target, prop) {
      if (prop === 'measureText') return () => ({ width: 0 });
      if (prop === 'canvas')      return { width: 1000, height: 700 };
      if (prop === 'globalAlpha') return 1;
      if (prop === 'fillStyle')   return '#000';
      if (prop === 'strokeStyle') return '#000';
      if (prop === 'lineWidth')   return 1;
      if (prop === 'font')        return '';
      if (prop === 'textAlign')   return 'left';
      if (prop === 'shadowColor') return '';
      if (prop === 'shadowBlur')  return 0;
      if (prop === 'globalCompositeOperation') return 'source-over';
      return noop;
    },
    set() { return true; }
  });
  return fakeCtx;
}

// ─── Seleção estratégica de beyblade (igual App.jsx) ──────────────
function selectBeybladeStrategically(availableDeck, opponentBey, arena, lastResult) {
  if (!availableDeck || availableDeck.length === 0) return null;
  const typeCounters = { Attack: 'Defense', Defense: 'Stamina', Stamina: 'Attack', Balance: 'Attack' };
  const arenaPreferences = { NEXUS: 'Attack', BB10_COMPETITIVE: 'Attack', BURST: 'Defense' };
  let scores = availableDeck.map(bey => {
    let score = 0;
    if (opponentBey?.type && bey?.type === typeCounters[opponentBey.type]) score += 30;
    if (bey?.type === arenaPreferences[arena]) score += 15;
    if (lastResult === 'loss' && opponentBey?.type && bey?.type === typeCounters[opponentBey.type]) score += 20;
    const statTotal = (bey?.stats?.atk||0)+(bey?.stats?.def||0)+(bey?.stats?.sta||0)+(bey?.stats?.bal||0);
    score += statTotal * 0.3;
    if (opponentBey?.rotation && bey?.rotation && bey.rotation !== opponentBey.rotation) score += 10;
    return { bey, score };
  });
  scores.sort((a, b) => b.score - a.score);
  return scores[0]?.bey || availableDeck[0];
}

// ─── Calcula prêmios pós-batalha (idêntico ao BattleComponents) ───
function calculateAwards(result, replayData) {
  const awards = [];
  const bey1Stats = replayData.bey1?.finalStats || {};
  const bey2Stats = replayData.bey2?.finalStats || {};
  
  // Most Aggressive
  if (bey1Stats.hits > bey2Stats.hits * 1.5) {
    awards.push({ 
      name: '⚔️ RELENTLESS AGGRESSOR', 
      winner: replayData.bey1?.name, 
      desc: `Landed ${bey1Stats.hits} hits vs ${bey2Stats.hits}` 
    });
  } else if (bey2Stats.hits > bey1Stats.hits * 1.5) {
    awards.push({ 
      name: '⚔️ RELENTLESS AGGRESSOR', 
      winner: replayData.bey2?.name, 
      desc: `Landed ${bey2Stats.hits} hits vs ${bey1Stats.hits}` 
    });
  }
  
  // Perfect Launch
  const launch1Quality = replayData.events?.find(e => e.type === 'LAUNCH')?.data?.quality1;
  const launch2Quality = replayData.events?.find(e => e.type === 'LAUNCH')?.data?.quality2;
  
  if (launch1Quality === 'PERFECT') {
    awards.push({ 
      name: '⭐ PERFECT LAUNCH', 
      winner: replayData.bey1?.name, 
      desc: 'Flawless launch technique' 
    });
  }
  if (launch2Quality === 'PERFECT') {
    awards.push({ 
      name: '⭐ PERFECT LAUNCH', 
      winner: replayData.bey2?.name, 
      desc: 'Flawless launch technique' 
    });
  }
  
  return awards;
}

// ─── Roda UM round (mesma física do BattleArena, sem render) ──────
export function runHeadlessRound(bey1, bey2, md3State, _syncCapture = null) {
  return new Promise((_resolveInner) => {
    // Se _syncCapture fornecido, captura o resultado sincronamente (para runHeadlessRoundSync)
    const _resolve = _syncCapture != null
      ? (r) => { _syncCapture.result = r; _resolveInner(r); }
      : _resolveInner;
    const _fakeCtx = createFakeCtx();
    const _noop = () => {};
    let _battleDone = false;

    // Tempo simulado: começa agora e avança 16.667ms por frame (60fps perfeito)
    let _simTime = Date.now();
    let replayEventsRef = [];
    let statsHistoryRef = [];
    let battleStartTimeRef = _simTime;

    // ─── INÍCIO DO MOTOR (extraído de BattleComponents.jsx - BattleArena useEffect) ─────
    const canvas = { width: 1000, height: 700 };
    const ctx = _fakeCtx;
    // Usa módulo para repetir arenas se necessário (ex: [BB10_COMPETITIVE] vira BB10_COMPETITIVE, BB10_COMPETITIVE, BB10...)
    const arenaType = md3State.arenaOrder[(md3State.currentRound - 1) % md3State.arenaOrder.length] || 'BB10_COMPETITIVE';

    const centerX = 500, centerY = 350;
    
    // Get launch techniques
    const launch1 = LAUNCH_TECHNIQUES[md3State.launch1 || 'STANDARD'];
    const launch2 = LAUNCH_TECHNIQUES[md3State.launch2 || 'STANDARD'];
    
    // Get launch quality
    const quality1 = md3State.launchQuality1 || { key: 'STANDARD', ...LAUNCH_QUALITY.STANDARD };
    const quality2 = md3State.launchQuality2 || { key: 'STANDARD', ...LAUNCH_QUALITY.STANDARD };
    
    // Initialize replay recording
    replayEventsRef = [];
    statsHistoryRef = [];
    battleStartTimeRef = _simTime;
    
    // Record launch techniques AND quality
    function recordEvent(type, data) {
      const timestamp = (_simTime - battleStartTimeRef) / 1000;
      replayEventsRef.push({ timestamp, type, data });
    }
    
    // AddEvent function for compatibility (headless version - just records)
    function addEvent(type, title, description) {
      recordEvent(type, { title, description });
    }
    
    recordEvent('LAUNCH', {
      bey1: bey1.name,
      bey2: bey2.name,
      launch1: md3State.launch1,
      launch2: md3State.launch2,
      quality1: quality1.key,
      quality2: quality2.key
    });
    
    // Arena configurations
    const ARENA_CONFIGS = {
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
        exits: [
          { angle: Math.PI / 2,                       width: 30 },
          { angle: Math.PI / 2 + (2 * Math.PI / 3),   width: 30 },
          { angle: Math.PI / 2 + (4 * Math.PI / 3),   width: 30 },
        ],
        exitsOpen: false,
        exitsOpenTime: 2.0,
        exitRing: null,
        gracePeriod: {
          enabled: true,
          duration: 2.0,
          exitMultiplier: 0,
          wallRingOutDisabled: true
        },
        wallRingOut: false,
        sweetSpots: [],
        pockets: [
          { angle: Math.PI / 2,                       width: 30, depth: 50, ringOutRadius: 18 },
          { angle: Math.PI / 2 + (2 * Math.PI / 3),   width: 30, depth: 50, ringOutRadius: 18 },
          { angle: Math.PI / 2 + (4 * Math.PI / 3),   width: 30, depth: 50, ringOutRadius: 18 },
        ],
        colors: {
          center: '#d0d8e0',
          inner: '#b0bcc8',
          ridge: '#8898aa',
          outer: '#6a7888',
          wall: '#505a68'
        }
      },
      VOLCANIC_RAGE: {
        name: 'Volcanic Rage',
        type: 'bowl',
        zones: {
          magmaCore:     50,
          lavaFlowRing: 140,
          obsidianBelt: 190,
          craterEdge:   221,
          wall:         221,
        },
        frictionGradient: {
          magmaCore:    { radius:  50, friction: 0.998 },
          lavaFlowRing: { radius: 140, friction: 0.997 },
          obsidianBelt: { radius: 190, friction: 0.996 },
          craterEdge:   { radius: 221, friction: 0.995 },
        },
        friction:            0.997,
        knockbackMultiplier: 1.15,
        weightAdvantage:     1.2,
        balanceResistance:   1.1,
        gravityModifier:     1.0,
        heatSystem: {
          level:             0,
          maxLevel:        100,
          gainPerSecond:     3,
          gainOnCollision:   8,
          gainOnCenterIdle:  5,
          gainOnLavaRiver:   3,
          resetTo:          35,
        },
        eruptionEvent: {
          active:       false,
          startTime:    0,
          duration:     0.6,
          outwardForce: 12.0,
          lavaBombs: {
            count:          3,
            countMax:       5,
            knockback:      3.5,
            staminaDrain:   8,
            stabilityDrain: 5,
            radius:        25,
            lifetime:       2.5,
          },
        },
        lavaRivers: {
          count:         3,
          rotationSpeed: 0.18,
          armWidth:      28,
          armLength:     [55, 135],
          pushForce:     1.8,
          staminaDrain:  2,
        },
        obsidianCurrent: {
          tangentialForce: 0.4,
          direction:       1,
          frictionBoost:   0.001,
        },
        fissureSystem: {
          count:              2,
          width:              40,
          openDelay:          4.0,
          open:               false,
          rotationSpeed:      (2 * Math.PI) / 25,
          baseAngle:          0,
          submersionDuration: 1.8,
          spinDrainPerSec:    12,
          dragMultiplier:     0.88,
          heavyEscapeBonus:   0.25,
        },
        exits:   [],
        pockets: [],
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
        // ═══════════════════════════════════════════════════════════════
        // CARNAGE COLOSSEUM — Redesign Oval (mirror de ArenaConfigs.js)
        // ═══════════════════════════════════════════════════════════════
        name: 'Carnage Colosseum',
        type: 'oval',
        zones: {
          wallA: 255, wallB: 148,
          outerA: 285, outerB: 170,
        },
        gates: {
          A: { open: false, openTime: null },
          B: { open: false, openTime: null },
        },
        carnageEvent: {
          revealed: false, revealTime: 3.0, activeEvent: null,
          events: ['INFERNO_WALLS','PHANTOM_PAIR','THE_CHAMPION','FROZEN_GROUND','BLOOD_MOON','SANDSTORM','THE_EXECUTIONER','DIVINE_JUDGMENT'],
          phantomBlades: [],
          championBlade: null,
          sandstorm: { direction: 1, timer: 0, switchInterval: 8.0, force: 0.12 },
          executioner: {
            currentA: 255, phase: 0, animating: false, animTimer: 0, animDuration: 2.5,
            startA: 255, targetA: 255,
            firstAt: 15.0, secondAt: 30.0, firstTargetA: 195, secondTargetA: 138,
          },
          divine: {
            strikes: [], nextStrikeTimer: 4.0, strikeInterval: 3.5,
            warningDuration: 0.8, warnings: [],
            effects: ['SPIN_BOOST','SPIN_DRAIN','STAMINA_BOOST','STAMINA_DRAIN','KNOCKBACK','INVISIBILITY','SHIELD','CHAOS'],
          },
        },
        exits: [], pockets: [],
        colors: {
          sand: '#c4934a', stoneOuter: '#2d2010', stoneInner: '#4a3420',
          gateA: '#8b0000', gateB: '#8b0000',
        },
        floorSink: {
          interval: 5.0, sinkDuration: 1.0, riseDuration: 1.0,
          phase: 'flat', timer: 0.0, depth: 0.0,
          pullForce: 0.55, idleTimer: 4.5,
        },
      },
      PANGEA_PLATFORM: {
        name: 'Pangea Platform Stadium',
        type: 'circular',
        zones: {
          centerStable: 40,     // Centro estável
          plateZone: 180,       // Zona das placas
          wall: 221
        },
        plates: [
          { id: 0, angle: 0, arcWidth: Math.PI/3, radius: 110, velocity: 0.15, direction: 1, currentAngle: 0 },
          { id: 1, angle: Math.PI/3, arcWidth: Math.PI/3, radius: 110, velocity: 0.18, direction: -1, currentAngle: Math.PI/3 },
          { id: 2, angle: 2*Math.PI/3, arcWidth: Math.PI/3, radius: 110, velocity: 0.12, direction: 1, currentAngle: 2*Math.PI/3 },
          { id: 3, angle: Math.PI, arcWidth: Math.PI/3, radius: 110, velocity: 0.16, direction: -1, currentAngle: Math.PI },
          { id: 4, angle: 4*Math.PI/3, arcWidth: Math.PI/3, radius: 110, velocity: 0.14, direction: 1, currentAngle: 4*Math.PI/3 },
          { id: 5, angle: 5*Math.PI/3, arcWidth: Math.PI/3, radius: 110, velocity: 0.17, direction: -1, currentAngle: 5*Math.PI/3 }
        ],
        seismic: {
          interval: 12.0,       // Terremoto a cada 12s
          duration: 1.5,        // Duração do terremoto
          intensity: 3.5,       // Intensidade
          lastQuakeTime: 0,
          active: false,
          activeTimer: 0,
          warningActive: false,
          warningStartTime: 0,
          warningTime: 1.5,
          aftershocks: {
            enabled: true,
            count: 3,
            delay: 0.8,
            intensity: 3.0,
            currentAftershock: 0,
            lastAftershockTime: 0
          },
          fissures: {
            enabled: true,
            chance: 0.20,
            activeFissures: [],
            fissureWidth: 20,
            duration: 2.0
          }
        },
        exits: [],
        pockets: [],
        colors: {
          center: '#2d5016',    // Verde escuro (terra)
          plates: ['#4a6b2a', '#3a5b1a', '#5a7b3a', '#3a5b2a', '#4a6b1a', '#5a7b2a'], // Tons de verde
          faultLine: '#8b4513', // Marrom (falhas)
          wall: '#6b8b3a',      // Verde oliva
          quake: '#ff6b6b'      // Vermelho (terremoto)
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
        // ── Center score bumper — elastic bounce + 1000 pts per hit ──
        centerBumper: {
          x: 0, y: 0, radius: 28,
          pointsPerHit: 1000,
          pointsGoal: 12000,
          cooldown: 0,
          maxCooldown: 0.3,
          multiplierStreak: 3, // Suggestion A: after 3 consecutive hits → 2000 pts next hit
        },
        // ── Flippers — auto-trigger at bottom ────────────────────────
        flippers: [
          { id: 'left',  x: -110, y: 290, angle:  Math.PI / 5, launchPower: 20, triggerRadius: 40, cooldown: 0, maxCooldown: 1.5, active: false },
          { id: 'right', x:  110, y: 290, angle: -Math.PI / 5, launchPower: 20, triggerRadius: 40, cooldown: 0, maxCooldown: 1.5, active: false },
        ],
        // ── Ring out gap between flippers ────────────────────────────
        ringOutGap: { x: 0, y: 310, width: 104, height: 40 },
        // ── Gravity pulls downward ────────────────────────────────────
        gravity: { strength: 0.10 },
        // ── Score state (reset each battle) ──────────────────────────
        score: { b1: 0, b2: 0 },
        consecutiveCenterHits: { b1: 0, b2: 0 },
        centerBumperCooldownB1: 0,
        centerBumperCooldownB2: 0,
        // ── Neon grid floor colors ────────────────────────────────────
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
        exits: [],
        pockets: [],
        sweetSpots: [],
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
      STORM_TRACK: {
        name: 'Storm Track',
        type: 'circular',
        zones: {
          center: 50,
          inner: 140,
          outer: 190,
          wall: 218
        },
        // Sistema de múltiplos storms
        stormSystem: {
          currentStorm: null,
          stormHistory: [],
          stormQueue: [],
          
          timing: {
            peaceDuration: 5.0,
            warningDuration: 2.0,
            stormDuration: 4.0,
            currentPhase: 'peace',
            phaseStartTime: 0
          },
          
          intensity: {
            level: 1,
            levelUpTime: 20.0,
            lastLevelUpTime: 0
          },
          
          stormTypes: {
            RAIN_WAVE: {
              chance: 0.30,
              waveDirection: 0,
              waveForce: 5.0,
              waveWidth: Math.PI / 2,
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
          
          apocalypse: {
            triggerTime: 90.0,
            active: false,
            storms: []
          }
        },
        exits: [],
        pockets: [],
        sweetSpots: [],
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
      },
      DOMINATION_ZONES: {
        name: 'Domination Zones',
        type: 'circular',
        zones: {
          center: 50,
          zoneRadius: 180,
          wall: 225
        },
        peripheralZones: [
          { 
            id: 1,
            angle: 0,
            arcWidth: Math.PI / 4,
            radius: 170,
            captureRadius: 40,
            points: 1,
            owner: null,
            captureProgress: { player1: 0, player2: 0 }
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
          radius: 50,
          points: 2,
          owner: null,
          captureProgress: { player1: 0, player2: 0 },
          contested: false
        },
        pointsSystem: {
          captureTime: 1.0,
          targetPoints: 5,
          player1: { totalPoints: 0, zonesOwned: [], lastCapture: null },
          player2: { totalPoints: 0, zonesOwned: [], lastCapture: null }
        },
        exits: [],
        pockets: [],
        sweetSpots: [],
        colors: {
          floor: '#1a1a2a',
          wall: '#2a2a3a',
          uncaptured: '#666666',
          player1: '#ff4444',
          player2: '#4444ff',
          capturing: '#ffff44',
          centralZone: '#8844ff'
        }
      },
      TIDAL_SURGE: {
        name: 'Tidal Surge',
        type: 'circular',
        zones: { center: 40, floodZone: 80, normalZone: 160, wall: 220 },
        arenaZones: { island: 40, floodZone: 80, sand: 160, wall: 220 },
        tideSystem: {
          tideType: 'standard',        // sorteado no init
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
        tsunamiSystem: {
          timer: 0, interval: 8.0,
          active: false, level: null,
          phase: 'idle', phaseTimer: 0,
          wallOffset: 0, permanentOffset: 0,
          waveRings: [],
          levels: {
            light:       { chance: 0.60, maxOffset: 28,  expandDur: 1.1, holdDur: 0.4, returnDur: 0.9,  returns: true  },
            heavy:       { chance: 0.30, maxOffset: 60,  expandDur: 1.7, holdDur: 0.7, returnDur: 1.4,  returns: true  },
            apocalyptic: { chance: 0.10, maxOffset: 110, expandDur: 2.4, holdDur: 0.9, returnDur: 0,    returns: false },
          },
          warningDur: 1.2,
        },
        exits: [],
        pockets: [],
        sweetSpots: [],
        colors: {
          floor:     '#c8a060',
          wall:      '#1a4a8a',
          waterLow:  'rgba(60,140,220,0.45)',
          waterHigh: 'rgba(20,80,190,0.75)',
          wave:      '#8dd4f0',
        }
      }
    };
    
    // 🔍 DEBUG: Log para rastrear problemas de arena
    console.log('🎮 HeadlessBattle - Arena Debug:');
    console.log('  📥 arenaType recebido:', arenaType);
    console.log('  🔑 Existe no ARENA_CONFIGS?', !!ARENA_CONFIGS[arenaType]);
    console.log('  📋 Chaves disponíveis:', Object.keys(ARENA_CONFIGS));
    
    const ARENA = JSON.parse(JSON.stringify(ARENA_CONFIGS[arenaType] || ARENA_CONFIGS.BB10_COMPETITIVE)); // Deep copy para permitir modificação de sistemas dinâmicos

    // ── TIDAL SURGE: sorteia tipo de maré ────────────────────────
    if (arenaType === 'TIDAL_SURGE') {
      const tideTypes = ['standard', 'spiral', 'double', 'inverse', 'chaos'];
      const tide = ARENA.tideSystem;
      tide.tideType        = tideTypes[Math.floor(Math.random() * tideTypes.length)];
      tide.spiralDirection = Math.random() < 0.5 ? 1 : -1;
      tide.dualAngle       = Math.random() * Math.PI * 2;
      tide.blobs           = [];
      tide.blobTimer       = 0;
      tide.intensity       = 1.0;
      // Reset tsunami
      const ts = ARENA.tsunamiSystem;
      if (ts) {
        ts.timer = 0; ts.active = false; ts.level = null;
        ts.phase = 'idle'; ts.phaseTimer = 0;
        ts.wallOffset = 0; ts.permanentOffset = 0;
        ts.waveRings = [];
      }
    }
    
    // ── PINBALL INFERNO V3: reset score state per battle ────────────
    if (arenaType === 'PINBALL_INFERNO') {
      ARENA.score                  = { b1: 0, b2: 0 };
      ARENA.consecutiveCenterHits  = { b1: 0, b2: 0 };
      ARENA.centerBumperCooldownB1 = 0;
      ARENA.centerBumperCooldownB2 = 0;
      if (ARENA.centerBumper) ARENA.centerBumper.cooldown = 0;
      ARENA.bumpers.forEach(bmp => { bmp.cooldown = 0; bmp.active = false; });
      ARENA.flippers.forEach(fl  => { fl.cooldown  = 0; fl.active  = false; });
    }

    console.log('  ✅ Arena selecionada:', ARENA.name);
    console.log('  🏟️ Arena type:', ARENA.type);
    
    const gameParticles = [];
    const gameBrokenPieces = [];
    const permanentDebris = [];

    // ════════════════════════════════════════════════════════════════
    // SISTEMA DE PARTÍCULAS MELHORADO v2.0 (FASE 1)
    // ════════════════════════════════════════════════════════════════

    // Definições de tipos de partículas
    const PARTICLE_TYPES = {
      SPARK: {
        shapes: ['star', 'cross', 'diamond'],
        colors: ['#ffff00', '#ff9900', '#ffffff', '#ffaa00'],
        sizes: [2, 3, 4, 3],
        lifetime: 0.6,
        glow: true,
        glowIntensity: 15,
        speed: { min: 3, max: 6 },
        gravity: 0,
        fade: 'quadratic'
      },
      
      DEBRIS: {
        shapes: ['square', 'triangle', 'circle'],
        colors: null,
        sizes: [2, 3, 4, 5],
        lifetime: 1.2,
        rotation: true,
        rotationSpeed: { min: -0.3, max: 0.3 },
        gravity: 0.15,
        bounce: true,
        bounceRestitution: 0.4,
        speed: { min: 2, max: 5 }
      },
      
      SMOKE: {
        shapes: ['circle'],
        colors: ['rgba(100, 100, 100, 0.6)', 'rgba(80, 80, 80, 0.5)', 'rgba(120, 120, 120, 0.4)'],
        sizes: [4, 5, 6, 7],
        lifetime: 1.0,
        expansion: 1.8,
        fade: 'exponential',
        speed: { min: 0.5, max: 2 },
        gravity: -0.05,
        blur: true
      },
      
      ENERGY: {
        shapes: ['ring', 'wave', 'plus'],
        colors: null,
        sizes: [3, 4, 5],
        lifetime: 0.8,
        pulse: true,
        pulseSpeed: 0.1,
        glow: true,
        glowIntensity: 20,
        speed: { min: 2, max: 4 },
        expansion: 1.3
      },
      
      IMPACT: {
        shapes: ['star', 'diamond', 'cross'],
        colors: ['#ffffff', '#ffff00', '#ff9900'],
        sizes: [3, 4, 5, 6],
        lifetime: 0.4,
        glow: true,
        glowIntensity: 25,
        speed: { min: 4, max: 8 },
        gravity: 0.1,
        fade: 'linear'
      }
    };

    // Nova função addParticle com tipos
    function addParticle(x, y, colorOrType, count = 20, typeOverride = null) {
      let type = typeOverride;
      let color = colorOrType;
      
      if (typeof colorOrType === 'string' && PARTICLE_TYPES[colorOrType.toUpperCase()]) {
        type = colorOrType.toUpperCase();
        color = null;
      }
      
      if (!type) type = 'DEBRIS';
      
      const config = PARTICLE_TYPES[type];
      const actualCount = Math.floor(count);
      
      for (let i = 0; i < actualCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speedRange = config.speed || { min: 2, max: 4 };
        const speed = Math.random() * (speedRange.max - speedRange.min) + speedRange.min;
        
        const particleColor = config.colors 
          ? config.colors[Math.floor(Math.random() * config.colors.length)]
          : (color || '#ffffff');
        
        const particle = {
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          maxLife: config.lifetime || 1,
          age: 0,
          type: type,
          shape: config.shapes[Math.floor(Math.random() * config.shapes.length)],
          color: particleColor,
          size: config.sizes[Math.floor(Math.random() * config.sizes.length)],
          baseSize: config.sizes[Math.floor(Math.random() * config.sizes.length)],
          rotation: config.rotation ? Math.random() * Math.PI * 2 : 0,
          rotationSpeed: config.rotation 
            ? (Math.random() * (config.rotationSpeed.max - config.rotationSpeed.min) + config.rotationSpeed.min)
            : 0,
          gravity: config.gravity || 0,
          bounced: false,
          glow: config.glow || false,
          glowIntensity: config.glowIntensity || 10,
          blur: config.blur || false,
          expansion: config.expansion || 1,
          pulse: config.pulse || false,
          pulseSpeed: config.pulseSpeed || 0.1,
          fade: config.fade || 'linear',
          scale: 1
        };
        
        gameParticles.push(particle);
      }
    }

    // Funções helper para criar tipos específicos
    function addSparkParticles(x, y, count = 15) {
      addParticle(x, y, 'SPARK', count);
    }

    function addDebrisParticles(x, y, color, count = 12) {
      addParticle(x, y, color, count, 'DEBRIS');
    }

    function addSmokeParticles(x, y, count = 8) {
      addParticle(x, y, 'SMOKE', count);
    }

    function addEnergyParticles(x, y, color, count = 10) {
      addParticle(x, y, color, count, 'ENERGY');
    }

    function addImpactParticles(x, y, count = 20) {
      addParticle(x, y, 'IMPACT', count);
    }

    // Funções de desenho de formas
    function drawStar(ctx, x, y, spikes, outerRadius, innerRadius) {
      ctx.beginPath();
      let rot = Math.PI / 2 * 3;
      let step = Math.PI / spikes;
      
      ctx.moveTo(x, y - outerRadius);
      for (let i = 0; i < spikes; i++) {
        ctx.lineTo(x + Math.cos(rot) * outerRadius, y + Math.sin(rot) * outerRadius);
        rot += step;
        ctx.lineTo(x + Math.cos(rot) * innerRadius, y + Math.sin(rot) * innerRadius);
        rot += step;
      }
      ctx.lineTo(x, y - outerRadius);
      ctx.closePath();
      ctx.fill();
    }

    function drawCross(ctx, x, y, size) {
      const w = size * 0.3;
      ctx.fillRect(x - size, y - w, size * 2, w * 2);
      ctx.fillRect(x - w, y - size, w * 2, size * 2);
    }

    function drawDiamond(ctx, x, y, size) {
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size, y);
      ctx.lineTo(x, y + size);
      ctx.lineTo(x - size, y);
      ctx.closePath();
      ctx.fill();
    }

    function drawPlus(ctx, x, y, size) {
      const w = size * 0.25;
      ctx.fillRect(x - size * 0.8, y - w, size * 1.6, w * 2);
      ctx.fillRect(x - w, y - size * 0.8, w * 2, size * 1.6);
    }

    function drawWave(ctx, x, y, size) {
      ctx.beginPath();
      for (let i = 0; i <= 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        const r = size + Math.sin(angle * 4) * size * 0.3;
        const px = x + Math.cos(angle) * r;
        const py = y + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
    
    
    function createBurstEffect(b) {
      const pieces = [
        { type: 'layer', size: 15, color: b.color },
        { type: 'disc', size: 12, color: b.bey.colors[1] || b.color },
        { type: 'driver', size: 10, color: b.bey.colors[2] || b.color }
      ];
      
      pieces.forEach((piece, i) => {
        const angle = (Math.PI * 2 / 3) * i + Math.random() * 0.5;
        const speed = 4 + Math.random() * 3;
        const newPiece = {
          x: b.x,
          y: b.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.2,
          size: piece.size,
          color: piece.color,
          type: piece.type,
          life: 1,
          gravity: 0.15,
          bounced: false,
          settled: false
        };
        
        gameBrokenPieces.push(newPiece);
      });
      
      // FASE 1: Enhanced burst particles
      addImpactParticles(b.x, b.y, 40);
      addDebrisParticles(b.x, b.y, b.color, 20);
      addSmokeParticles(b.x, b.y, 15);
      addEnergyParticles(b.x, b.y, b.color, 25);
      addScreenShake(2.5);
      addFlashEffect(b.color, 0.4, 180);
      addParticle(b.x, b.y, '#ffffff', 30);
      addParticle(b.x, b.y, '#fbbf24', 20);
    }

    const b1 = {
      x: centerX - 80, y: centerY,
      vx: (((bey1?.effectiveStats?.atk || 10) * 0.8) + 3) * launch1.speedMod * quality1.speedMod,
      vy: (((bey1?.effectiveStats?.atk || 10) * 0.5) + 2) * launch1.speedMod * quality1.speedMod,
      rotation: 0,
      spinSpeed: (8 + (((bey1?.effectiveStats?.spin || 40) * 2.0))) * launch1.spinMod * quality1.spinMod,
      spinDirection: (bey1?.rotation === 'Left') ? -1 : 1,
      stamina: 250,
      hits: 0,
      burstDamage: 0,
      stability: 150,
      radius: 26,
      color: bey1?.color || '#3b82f6',
      bey: bey1 || { 
        name: 'Bey1', 
        type: 'Balance', 
        rotation: 'Right',
        colors: ['#3b82f6', '#ffffff', '#cccccc'],
        effectiveStats: { atk: 10, def: 10, sta: 10, bal: 10, weight: 10, spin: 40 },
        synergies: [],
        breakpoints: []
      },
      alive: true,
      ironWallActive: bey1?.breakpoints?.some(bp => bp?.stat === 'DEF') || false,
      ironWallUsed: false,
      flowerPatternPhase: 0,
      lastRailBoost: 0,
      warpChain: 0,
      lastPortalTime: 0,
      portalCooldown: 0,
      inPortal: false,
      portalBoostFrames: 0,
      portalBoostAngle: 0,
      launchTechnique: md3State.launch1,
      launchPattern: launch1.pattern,
      launchQuality: quality1.key,
      burstRiskMod: launch1.burstRisk * quality1.burstRisk,
      lastStopTime: 0,
      eternalSpinActive: bey1?.breakpoints?.some(bp => bp?.name?.includes('Eternal Spin')) || false,
      eternalSpinTimer: 0,
      // FIX: usa effectiveStats (igual ao sistema de combate), não stats (base sem modificadores)
      hasBladeStorm: (bey1?.effectiveStats?.atk || bey1?.stats?.atk || 0) >= 27,
      hasAbsoluteBarrier: (bey1?.effectiveStats?.def || bey1?.stats?.def || 0) >= 27,
      hasGyroLock: (bey1?.effectiveStats?.bal || bey1?.stats?.bal || 0) >= 27,
      hasGravityWell: (bey1?.effectiveStats?.weight || bey1?.stats?.weight || 0) >= 27,
      hasCelestialRotation: (bey1?.effectiveStats?.spin || bey1?.stats?.spin || 0) >= 50,
      // ── NOVOS BREAKPOINTS 17 ──
      hasCortePreciso:      (bey1?.effectiveStats?.atk    || bey1?.stats?.atk    || 0) >= 17,
      hasPosturaDeAco:      (bey1?.effectiveStats?.def    || bey1?.stats?.def    || 0) >= 17,
      hasInercia:           (bey1?.effectiveStats?.sta    || bey1?.stats?.sta    || 0) >= 17,
      hasCentroGravidade:   (bey1?.effectiveStats?.bal    || bey1?.stats?.bal    || 0) >= 17,
      hasAncoragem:         (bey1?.effectiveStats?.weight || bey1?.stats?.weight || 0) >= 17,
      hasTurbilhao:         (bey1?.effectiveStats?.spin   || bey1?.stats?.spin   || 0) >= 17,
      // ── NOVOS BREAKPOINTS 27 ──
      hasRajadaDeAco:       (bey1?.effectiveStats?.atk    || bey1?.stats?.atk    || 0) >= 27,
      hasMuroVivo:          (bey1?.effectiveStats?.def    || bey1?.stats?.def    || 0) >= 27,
      hasEspiralEterna:     (bey1?.effectiveStats?.sta    || bey1?.stats?.sta    || 0) >= 27,
      hasCamaraRessonancia: (bey1?.effectiveStats?.bal    || bey1?.stats?.bal    || 0) >= 27,
      hasCampoGravitacional:(bey1?.effectiveStats?.weight || bey1?.stats?.weight || 0) >= 27,
      hasNucleoPerpetuo:    (bey1?.effectiveStats?.spin   || bey1?.stats?.spin   || 0) >= 27,
      // estados runtime
      _corteStacksOnOpp: 0, _corteExpiryOnOpp: 0,
      _hitStreak: 0,
      _muroVivoAvailable: true,
      _espiralEternaActive: false, _espiralEternaUntil: 0, _espiralEternaTriggered: false,
      _nucleoPerpetuoActive: false, _nucleoPerpetuoTriggered: false,
      armorEffect: bey1?.armor?.effect || null,
      armorBurnStacks: [],
      armorAdaptiveDefense: 0,
      armorVoidPulseTimer: 0,
      // 🆕 Novos estados de parts especiais
      armorPoisonStacks: 0,
      armorLastPoisonTick: 0,
      armorIceWallReady: true,
      armorIceWallLastUsed: 0,
      armorWebStacks: 0,
      armorMoonPhaseStart: 0,
      armorClockworkHits: 0,
      armorCurrentElement: 0,
      armorLastElementShift: 0,
      layerConsecutiveHits: 0,
      layerHitsAbsorbed: 0,
      discLastWeightShift: 0,
      driverBurstSpeedApplied: false,
      stats: {
        maxSpin: (8 + (((bey1?.effectiveStats?.spin || 40) * 2.0))) * launch1.spinMod * quality1.spinMod,
        damageCaused: 0,
        hitsLanded: 0
      },
      tippingAngle: 0,
      isTipping: false,
      tippingSide: Math.random() > 0.5 ? 1 : -1,
      fellOver: false
    };
    
    const b2 = {
      x: centerX + 80, y: centerY,
      vx: -(((bey2?.effectiveStats?.atk || 10) * 0.8) + 3) * launch2.speedMod * quality2.speedMod,
      vy: -(((bey2?.effectiveStats?.atk || 10) * 0.5) + 2) * launch2.speedMod * quality2.speedMod,
      rotation: 0,
      spinSpeed: (8 + (((bey2?.effectiveStats?.spin || 40) * 2.0))) * launch2.spinMod * quality2.spinMod,
      spinDirection: (bey2?.rotation === 'Left') ? -1 : 1,
      stamina: 250,
      hits: 0,
      burstDamage: 0,
      stability: 150,
      radius: 26,
      color: bey2?.color || '#ef4444',
      bey: bey2 || { 
        name: 'Bey2', 
        type: 'Balance', 
        rotation: 'Right',
        colors: ['#ef4444', '#ffffff', '#cccccc'],
        effectiveStats: { atk: 10, def: 10, sta: 10, bal: 10, weight: 10, spin: 40 },
        synergies: [],
        breakpoints: []
      },
      alive: true,
      ironWallActive: bey2?.breakpoints?.some(bp => bp?.stat === 'DEF') || false,
      ironWallUsed: false,
      flowerPatternPhase: 0,
      lastRailBoost: 0,
      warpChain: 0,
      lastPortalTime: 0,
      portalCooldown: 0,
      inPortal: false,
      portalBoostFrames: 0,
      portalBoostAngle: 0,
      launchTechnique: md3State.launch2,
      launchPattern: launch2.pattern,
      launchQuality: quality2.key,
      burstRiskMod: launch2.burstRisk * quality2.burstRisk,
      lastStopTime: 0,
      eternalSpinActive: bey2?.breakpoints?.some(bp => bp?.name?.includes('Eternal Spin')) || false,
      eternalSpinTimer: 0,
      // FIX: usa effectiveStats (igual ao sistema de combate), não stats (base sem modificadores)
      hasBladeStorm: (bey2?.effectiveStats?.atk || bey2?.stats?.atk || 0) >= 27,
      hasAbsoluteBarrier: (bey2?.effectiveStats?.def || bey2?.stats?.def || 0) >= 27,
      hasGyroLock: (bey2?.effectiveStats?.bal || bey2?.stats?.bal || 0) >= 27,
      hasGravityWell: (bey2?.effectiveStats?.weight || bey2?.stats?.weight || 0) >= 27,
      hasCelestialRotation: (bey2?.effectiveStats?.spin || bey2?.stats?.spin || 0) >= 50,
      // ── NOVOS BREAKPOINTS 17 ──
      hasCortePreciso:      (bey2?.effectiveStats?.atk    || bey2?.stats?.atk    || 0) >= 17,
      hasPosturaDeAco:      (bey2?.effectiveStats?.def    || bey2?.stats?.def    || 0) >= 17,
      hasInercia:           (bey2?.effectiveStats?.sta    || bey2?.stats?.sta    || 0) >= 17,
      hasCentroGravidade:   (bey2?.effectiveStats?.bal    || bey2?.stats?.bal    || 0) >= 17,
      hasAncoragem:         (bey2?.effectiveStats?.weight || bey2?.stats?.weight || 0) >= 17,
      hasTurbilhao:         (bey2?.effectiveStats?.spin   || bey2?.stats?.spin   || 0) >= 17,
      // ── NOVOS BREAKPOINTS 27 ──
      hasRajadaDeAco:       (bey2?.effectiveStats?.atk    || bey2?.stats?.atk    || 0) >= 27,
      hasMuroVivo:          (bey2?.effectiveStats?.def    || bey2?.stats?.def    || 0) >= 27,
      hasEspiralEterna:     (bey2?.effectiveStats?.sta    || bey2?.stats?.sta    || 0) >= 27,
      hasCamaraRessonancia: (bey2?.effectiveStats?.bal    || bey2?.stats?.bal    || 0) >= 27,
      hasCampoGravitacional:(bey2?.effectiveStats?.weight || bey2?.stats?.weight || 0) >= 27,
      hasNucleoPerpetuo:    (bey2?.effectiveStats?.spin   || bey2?.stats?.spin   || 0) >= 27,
      // estados runtime
      _corteStacksOnOpp: 0, _corteExpiryOnOpp: 0,
      _hitStreak: 0,
      _muroVivoAvailable: true,
      _espiralEternaActive: false, _espiralEternaUntil: 0, _espiralEternaTriggered: false,
      _nucleoPerpetuoActive: false, _nucleoPerpetuoTriggered: false,
      armorEffect: bey2?.armor?.effect || null,
      armorBurnStacks: [],
      armorAdaptiveDefense: 0,
      armorVoidPulseTimer: 0,
      // 🆕 Novos estados de parts especiais
      armorPoisonStacks: 0,
      armorLastPoisonTick: 0,
      armorIceWallReady: true,
      armorIceWallLastUsed: 0,
      armorWebStacks: 0,
      armorMoonPhaseStart: 0,
      armorClockworkHits: 0,
      armorCurrentElement: 0,
      armorLastElementShift: 0,
      layerConsecutiveHits: 0,
      layerHitsAbsorbed: 0,
      discLastWeightShift: 0,
      driverBurstSpeedApplied: false,
      stats: {
        maxSpin: (8 + (((bey2?.effectiveStats?.spin || 40) * 2.0))) * launch2.spinMod * quality2.spinMod,
        damageCaused: 0,
        hitsLanded: 0
      },
      tippingAngle: 0,
      isTipping: false,
      tippingSide: Math.random() > 0.5 ? 1 : -1,
      fellOver: false
    };

    // ── TRAITS: BATTLE_INIT v2.0 ─────────────────────────────
    try {
      // getPlayerTraitData imported at top
      const applyBattleTraits = (bState, playerName, md3St, isTeam1) => {
        const data = getPlayerTraitData(playerName);
        const playerTraits = data?.traits || [];
        const favoriteArena = data?.favoriteArena || '';
        const ownLaunchTech = isTeam1 ? md3St?.launch1 : md3St?.launch2;
        const agg = ['RUSH','POWER','SLIDING'];
        const def = ['ENDURANCE','PRECISION'];
        const isAgg = agg.some(t => (ownLaunchTech || '').includes(t));
        const isDef = def.some(t => (ownLaunchTech || '').includes(t));

        const getTier = (id) => {
          const t = playerTraits.find(t => t && t.id === id);
          return t ? t.tier : null;
        };

        // ── Contexto de batalha ──
        const selfWins    = isTeam1 ? (md3St?.team1Wins || 0) : (md3St?.team2Wins || 0);
        const oppWins     = isTeam1 ? (md3St?.team2Wins || 0) : (md3St?.team1Wins || 0);
        const winsNeeded  = md3St?.winsNeeded || 2;
        const currentRound= md3St?.currentRound || 1;
        const maxRounds   = md3St?.maxRounds || 5;
        const stage       = md3St?.tournamentStage || 'R64';
        const tier_t      = md3St?.tournamentTier  || '';
        const format      = md3St?.format || 'MD3';
        const arenaList   = md3St?.arenaOrder || [];
        const currentArena= arenaList[(currentRound - 1) % Math.max(1, arenaList.length)] || '';
        const isEarlyStage= ['R64','R32','R16'].includes(stage);
        const isKnockout  = ['QF','SF','F'].includes(stage);
        const isFinal     = stage === 'F';
        const isTiebreak  = (currentRound === maxRounds) && (selfWins === oppWins);
        const isAtHome    = (currentArena === favoriteArena);
        const isMD3       = format === 'MD3';
        const isRedemption= tier_t === 'REDEMPTION';
        const isGrandSlam = tier_t === 'GRAND_SLAM' || tier_t === 'PREMIER';
        // Optional context extras (passed when available)
        const oppFormState      = isTeam1 ? (md3St?.team2FormaName || 'NEUTRAL') : (md3St?.team1FormaName || 'NEUTRAL');
        const oppIsDownForm     = ['STRUGGLING','SLUMP','ROCK_BOTTOM'].includes(oppFormState);
        const oppIsSlumpOrWorse = ['SLUMP','ROCK_BOTTOM'].includes(oppFormState);
        const h2hAdv            = isTeam1 ? (md3St?.team1H2HAdv || 0) : (md3St?.team2H2HAdv || 0);
        const prevRoundBurst    = isTeam1 ? (md3St?.team1PrevBurst || false) : (md3St?.team2PrevBurst || false);
        const repeatTechRounds  = isTeam1 ? (md3St?.team2RepeatTech || 0) : (md3St?.team1RepeatTech || 0); // opp repeat
        const tourneyWins       = isTeam1 ? (md3St?.team1TourneyWins || 0) : (md3St?.team2TourneyWins || 0);
        const lastWonVsOpp      = isTeam1 ? (md3St?.team1LastLostVsOpp || false) : (md3St?.team2LastLostVsOpp || false);
        // Tier comparison via average stats (proxy para CACADOR)
        const myAvgStat  = bState.bey?.effectiveStats ? Object.values(bState.bey.effectiveStats).reduce((a,b)=>a+b,0)/6 : 20;
        const oppBState  = isTeam1 ? null : null; // accessible via caller context
        const oppAvgStat = isTeam1 ? (md3St?.team2AvgStat || 20) : (md3St?.team1AvgStat || 20);
        const isUnderdog = myAvgStat < oppAvgStat;

        // Helper: aplica multiplicador de stats completo
        const applyStatMult = (mult) => {
          bState.vx        *= mult;
          bState.vy        *= mult;
          bState.spinSpeed *= mult;
          if (bState.bey?.effectiveStats) {
            const es = bState.bey.effectiveStats;
            const cap = (s, max) => Math.min(max, Math.round(s * mult));
            bState.bey = { ...bState.bey, effectiveStats: {
              atk: cap(es.atk||10, 48), def: cap(es.def||10, 48),
              sta: cap(es.sta||10, 48), bal: cap(es.bal||10, 48),
              weight: cap(es.weight||10, 48), spin: cap(es.spin||40, 95)
            }};
          }
        };

        // ── DESTRUIDOR_DE_BURST ──
        {
          const tier = getTier('DESTRUIDOR_DE_BURST');
          if (tier === 'NEG') bState._burstDmgBonus = (bState._burstDmgBonus||0) - 0.25;
          else if (tier === 'COM') bState._burstDmgBonus = (bState._burstDmgBonus||0) + 0.20;
          else if (tier === 'RAR') { bState._burstDmgBonus = (bState._burstDmgBonus||0) + 0.30; bState._critBonus = (bState._critBonus||0) + 0.10; }
          else if (tier === 'LEN') { bState._burstDmgBonus = (bState._burstDmgBonus||0) + 0.45; bState._critBonus = (bState._critBonus||0) + 0.15; bState._critGuaranteesBurst = true; }
        }

        // ── ARMADURA_VIVA ──
        {
          const tier = getTier('ARMADURA_VIVA');
          if (tier === 'NEG') bState.burstRiskMod *= 1.30;
          else if (tier === 'COM') bState.burstRiskMod *= 0.70;
          else if (tier === 'RAR') { bState.burstRiskMod *= 0.60; bState._burstFailPenaltyToOpp = 0.05; }
          else if (tier === 'LEN') { bState.burstRiskMod *= 0.50; bState._burstFailPenaltyToOpp = 0.10; }
        }

        // ── PISTOLEIRO ──
        if (isAgg) {
          const tier = getTier('PISTOLEIRO');
          if (tier === 'NEG') bState.burstRiskMod *= 1.40;
          else if (tier === 'COM') bState.burstRiskMod *= 0.80;
          else if (tier === 'RAR') { bState.burstRiskMod *= 0.70; bState._burstDmgBonus = (bState._burstDmgBonus||0) + 0.15; }
          else if (tier === 'LEN') { bState.burstRiskMod *= 0.60; bState._burstDmgBonus = (bState._burstDmgBonus||0) + 0.25; bState.vx *= 1.20; bState.vy *= 1.20; }
        }

        // ── CALCULISTA ──
        if (isDef) {
          const tier = getTier('CALCULISTA');
          if (tier === 'NEG') { bState.vx *= 0.85; bState.vy *= 0.85; }
          else if (tier === 'COM') { bState.spinSpeed *= 1.10; }
          else if (tier === 'RAR') { bState.spinSpeed *= 1.15; bState._spinDecayOwn = (bState._spinDecayOwn||1.0) * 0.80; }
          else if (tier === 'LEN') { bState.spinSpeed *= 1.15; bState._spinDecayOwn = (bState._spinDecayOwn||1.0) * 0.60; }
        }

        // ── ETERNO_GIRO ──
        {
          const tier = getTier('ETERNO_GIRO');
          if (tier === 'NEG') bState._spinDecayOwn = (bState._spinDecayOwn||1.0) * 1.15;
          else if (tier === 'COM') bState._spinDecayBonus = (bState._spinDecayBonus||0) + 0.10;
          else if (tier === 'RAR') { bState._spinDecayBonus = (bState._spinDecayBonus||0) + 0.15; bState._spinDecayOwn = (bState._spinDecayOwn||1.0) * 0.80; }
          else if (tier === 'LEN') { bState._spinDecayBonus = (bState._spinDecayBonus||0) + 0.25; bState._eterno_r1_nodecay = true; }
        }

        // ── SANGUE_QUENTE (forma alta) ──
        {
          const tier = getTier('SANGUE_QUENTE');
          if (tier === 'NEG') bState.burstRiskMod *= 1.20;
          else if (tier === 'COM') bState._burstDmgBonus = (bState._burstDmgBonus||0) + 0.10;
          else if (tier === 'RAR') { bState._burstDmgBonus = (bState._burstDmgBonus||0) + 0.20; bState._critBonus = (bState._critBonus||0) + 0.10; }
          else if (tier === 'LEN') { bState._burstDmgBonus = (bState._burstDmgBonus||0) + 0.45; bState._critBonus = (bState._critBonus||0) + 0.15; }
        }

        // ── CONTRA_GOLPE (reage a critical hit anterior) ──
        bState._contraGolqueTier = getTier('CONTRA_GOLPE');
        if (bState._contraGolqueTier) {
          // Flag para o loop de colisão verificar no próximo hit
          // O bônus é aplicado quando receivedCritLastRound está ativo
        }

        // ── GUERRA_DE_ATRITO (flag — spin inferior) ──
        bState._guerraDeAtritoTier = getTier('GUERRA_DE_ATRITO');

        // ── IMPLACAVEL (ganhou round anterior por burst) ──
        bState._implacavelTier = getTier('IMPLACAVEL');
        if (prevRoundBurst) {
          const tier = getTier('IMPLACAVEL');
          if (tier === 'NEG') { /* penalidade em def — aplicada como aumento de burst recebido */ bState.burstRiskMod *= 1.15; }
          else if (tier === 'COM') { applyStatMult(1.10); }
          else if (tier === 'RAR') { applyStatMult(1.20); bState._burstDmgBonus = (bState._burstDmgBonus||0) + 0.10; }
          else if (tier === 'LEN') {
            const cascadeBonus = 0.08 * ((isTeam1 ? md3St?.team1BurstCount : md3St?.team2BurstCount) || 1);
            applyStatMult(1.0 + cascadeBonus);
          }
        }

        // ════════════ STATS_PARCIAL TRAITS ════════════

        // ── FECHADOR (selfWins === winsNeeded - 1) ──
        if (selfWins === winsNeeded - 1) {
          const tier = getTier('FECHADOR');
          if (tier === 'NEG') { bState.vx *= 0.80; bState.vy *= 0.80; bState.spinSpeed *= 0.80; }
          else if (tier === 'COM') { bState.vx *= 1.15; bState.vy *= 1.15; bState.spinSpeed *= 1.10; }
          else if (tier === 'RAR') { applyStatMult(1.25); bState._burstDmgBonus = (bState._burstDmgBonus||0) + 0.15; }
          else if (tier === 'LEN') { applyStatMult(1.30); bState._burstDmgBonus = (bState._burstDmgBonus||0) + 0.25; }
        }

        // ── MENTALIDADE_DE_SET (último round) ──
        if (currentRound === maxRounds) {
          const tier = getTier('MENTALIDADE_DE_SET');
          if (tier === 'NEG') { bState.spinSpeed *= 0.80; bState.vx *= 0.80; bState.vy *= 0.80; }
          else if (tier === 'COM') { bState.spinSpeed *= 1.20; bState.vx *= 1.10; bState.vy *= 1.10; }
          else if (tier === 'RAR') { applyStatMult(1.30); }
          else if (tier === 'LEN') { applyStatMult(1.40); bState.burstRiskMod *= 0.80; }
        }

        // ── INSTINTO_DO_CAMPEONATO (Final) ──
        if (isFinal) {
          const tier = getTier('INSTINTO_DO_CAMPEONATO');
          if (tier === 'NEG') { bState.vx *= 0.80; bState.vy *= 0.80; bState.spinSpeed *= 0.80; }
          else if (tier === 'COM') { bState.vx *= 1.15; bState.vy *= 1.15; bState.spinSpeed *= 1.10; }
          else if (tier === 'RAR') { applyStatMult(1.25); }
          else if (tier === 'LEN') { applyStatMult(1.35); bState.burstRiskMod *= 0.80; }
        }

        // ── GLADIADOR (adversário repetiu técnica) ──
        if (repeatTechRounds >= 2) {
          const tier = getTier('GLADIADOR');
          if (tier === 'NEG') { bState.vx *= 0.90; bState.vy *= 0.90; }
          else if (tier === 'COM') { bState.vx *= 1.15; bState.vy *= 1.15; bState.spinSpeed *= 1.10; }
          else if (tier === 'RAR') { applyStatMult(1.25); bState._burstDmgBonus = (bState._burstDmgBonus||0) + 0.15; }
          else if (tier === 'LEN') { applyStatMult(1.35); bState._burstDmgBonus = (bState._burstDmgBonus||0) + 0.20; }
        }

        // ── DESTRUIDOR_DE_MORAL (adversário em forma baixa) ──
        if (oppIsDownForm) {
          const tier = getTier('DESTRUIDOR_DE_MORAL');
          if (tier === 'NEG') { bState.vx *= 0.85; bState.vy *= 0.85; }
          else if (tier === 'COM') { applyStatMult(1.10); }
          else if (tier === 'RAR') { applyStatMult(1.20); if (oppIsSlumpOrWorse) bState._burstDmgBonus = (bState._burstDmgBonus||0) + 0.15; }
          else if (tier === 'LEN') { applyStatMult(1.30); bState._burstDmgBonus = (bState._burstDmgBonus||0) + 0.20; }
        }

        // ── VENENO_LENTO (acumula burst damage por round) ──
        {
          const tier = getTier('VENENO_LENTO');
          const roundBonus = (currentRound - 1); // R1=0, R2=+1, R3=+2 etc.
          if (tier === 'NEG') { /* custo de burst em baixo spin — sem ajuste aqui, lógica conceptual */ }
          else if (tier === 'COM' && roundBonus > 0) bState._burstDmgBonus = (bState._burstDmgBonus||0) + roundBonus * 0.10;
          else if (tier === 'RAR' && roundBonus > 0) { bState._burstDmgBonus = (bState._burstDmgBonus||0) + roundBonus * 0.15; }
          else if (tier === 'LEN' && roundBonus > 0) {
            // A partir do R2, adversário perde spin extra
            bState._spinDecayBonus = (bState._spinDecayBonus||0) + roundBonus * 0.05;
          }
        }

        // ── RELAMPAGO (formato MD3) ──
        if (isMD3) {
          const tier = getTier('RELAMPAGO');
          if (tier === 'NEG') { /* Decay de momentum x2 — tratado conceitualmente */ }
          else if (tier === 'COM') { bState.vx *= 1.15; bState.vy *= 1.15; bState.spinSpeed *= 1.10; }
          else if (tier === 'RAR') { applyStatMult(1.25); }
          else if (tier === 'LEN') { applyStatMult(1.30); bState._burstDmgBonus = (bState._burstDmgBonus||0) + 0.20; }
        } else if (getTier('RELAMPAGO') === 'NEG') {
          // Penalty em MD5/MD7
        }

        // ── ESPECIALISTA_TIEBREAK (tiebreak) ──
        if (isTiebreak) {
          const tier = getTier('ESPECIALISTA_TIEBREAK');
          if (tier === 'NEG') { applyStatMult(0.80); }
          else if (tier === 'COM') { bState.vx *= 1.10; bState.vy *= 1.10; bState.spinSpeed *= 1.20; }
          else if (tier === 'RAR') { applyStatMult(1.30); }
          else if (tier === 'LEN') { applyStatMult(1.40); bState.burstRiskMod *= 0.75; }
        }

        // ════════════ ARENA TRAITS ════════════

        // ── REI_DA_SELVA (arena favorita) ──
        if (isAtHome) {
          const tier = getTier('REI_DA_SELVA');
          if (tier === 'NEG') { /* NEG = penalidade fora de casa, sem efeito aqui */ }
          else if (tier === 'COM') { bState.spinSpeed *= 1.15; bState.vx *= 1.10; bState.vy *= 1.10; }
          else if (tier === 'RAR') { applyStatMult(1.25); }
          else if (tier === 'LEN') { applyStatMult(1.35); /* adversário recebe penalidade — via oppBurstRisk */ }
        } else {
          // Fora de casa
          if (getTier('REI_DA_SELVA') === 'NEG') { bState.vx *= 0.90; bState.vy *= 0.90; bState.spinSpeed *= 0.90; }
        }

        // ── CAMALEAO (fora da arena favorita) ──
        if (!isAtHome) {
          const tier = getTier('CAMALEAO');
          if (tier === 'NEG') { /* Modificadores negativos da arena amplificados — tratado conceitualmente */ }
          else if (tier === 'COM') { /* Anula negativos — tratado conceitualmente */ }
          else if (tier === 'RAR') { bState.vx *= 1.10; bState.vy *= 1.10; bState.spinSpeed *= 1.05; }
          else if (tier === 'LEN') { applyStatMult(1.15); /* age como arena favorita — spin bonus extra */ }
        } else if (getTier('CAMALEAO') === 'NEG') {
          // Em casa, NEG não tem efeito
        }

        // ── EXPLORADOR (fora de casa) ──
        if (!isAtHome) {
          const tier = getTier('EXPLORADOR');
          if (tier === 'NEG') { bState.vx *= 0.85; bState.vy *= 0.85; bState.spinSpeed *= 0.90; }
          else if (tier === 'COM') { bState.vx *= 1.10; bState.vy *= 1.10; bState.spinSpeed *= 1.05; }
          else if (tier === 'RAR') { applyStatMult(1.15 + (currentRound - 1) * 0.02); }
          else if (tier === 'LEN') { applyStatMult(1.20 + (currentRound - 1) * 0.05); }
        }

        // ── ARQUITETO (sinergia tipo bey / arena) ──
        {
          const beyType = bState.bey?.type || '';
          // Sinergias: Attack beys em arenas agressivas, Stamina em arenas abertas etc.
          const synergies = {
            Attack:  ['COLOSSEUM_CARNAGE','KILLER_SIDES','VOLCANIC_RAGE'],
            Defense: ['VOLCANIC_RAGE','PANGEA_PLATFORM','BB10_COMPETITIVE'],
            Stamina: ['VORTEX_COLISEUM','NEXUS','STORM_TRACK'],
            Balance: ['BB10_COMPETITIVE','NEXUS','PANGEA_PLATFORM'],
          };
          const hasSynergy = (synergies[beyType] || []).includes(currentArena);
          const tier = getTier('ARQUITETO');
          if (tier === 'NEG' && !hasSynergy) { bState.vx *= 0.85; bState.vy *= 0.85; }
          else if (tier === 'COM' && hasSynergy) { applyStatMult(1.15); }
          else if (tier === 'RAR' && hasSynergy) { applyStatMult(1.25); bState.vx *= 1.05; bState.vy *= 1.05; }
          else if (tier === 'LEN' && hasSynergy) { applyStatMult(1.30); /* variância de colisão reduzida via _critBonus */ bState._critBonus = (bState._critBonus||0) + 0.05; }
        }

        // ════════════ PALCO TRAITS ════════════

        // ── SANGUE_DE_CAMPEON (Grand Slams / Premier) ──
        if (isGrandSlam) {
          const tier = getTier('SANGUE_DE_CAMPEON');
          if (tier === 'NEG') { bState.vx *= 0.85; bState.vy *= 0.85; bState.spinSpeed *= 0.85; }
          else if (tier === 'COM') { bState.vx *= 1.10; bState.vy *= 1.10; bState.spinSpeed *= 1.10; }
          else if (tier === 'RAR') { applyStatMult(1.20); }
          else if (tier === 'LEN') { applyStatMult(1.30); }
        }

        // ── ESPECIALISTA_MATA_MATA (QF em diante) ──
        if (isKnockout) {
          const tier = getTier('ESPECIALISTA_MATA_MATA');
          if (tier === 'NEG') { bState.vx *= 0.90; bState.vy *= 0.90; }
          else if (tier === 'COM') { bState.vx *= 1.15; bState.vy *= 1.15; bState.spinSpeed *= 1.10; }
          else if (tier === 'RAR') { applyStatMult(1.25); }
          else if (tier === 'LEN') { applyStatMult(isFinal ? 1.35 : 1.25); bState.burstRiskMod *= isFinal ? 0.80 : 0.90; }
        }

        // ── REI_DOS_GRUPOS (fases iniciais) ──
        if (isEarlyStage) {
          const tier = getTier('REI_DOS_GRUPOS');
          if (tier === 'NEG') { bState.vx *= 0.85; bState.vy *= 0.85; bState.spinSpeed *= 0.85; }
          else if (tier === 'COM') { bState.vx *= 1.15; bState.vy *= 1.15; bState.spinSpeed *= 1.10; }
          else if (tier === 'RAR') { applyStatMult(1.25); }
          else if (tier === 'LEN') { applyStatMult(1.30); }
        }

        // ── CACADOR_DE_GIGANTES (underdog vs tier superior) ──
        if (isUnderdog) {
          const tier = getTier('CACADOR_DE_GIGANTES');
          if (tier === 'NEG') { bState.vx *= 0.90; bState.vy *= 0.90; }
          else if (tier === 'COM') { applyStatMult(1.10); }
          else if (tier === 'RAR') { applyStatMult(1.20); bState._burstDmgBonus = (bState._burstDmgBonus||0) + 0.15; }
          else if (tier === 'LEN') { applyStatMult(1.30); /* forma HOT_STREAK — sem acesso direto aqui */ }
        } else {
          if (getTier('CACADOR_DE_GIGANTES') === 'NEG') { /* penalidade vs inferior — já sem bônus */ }
        }

        // ── MONSTRO_DO_REDEMPTION ──
        if (isRedemption) {
          const tier = getTier('MONSTRO_DO_REDEMPTION');
          if (tier === 'NEG') { applyStatMult(0.85); }
          else if (tier === 'COM') { applyStatMult(1.20); }
          else if (tier === 'RAR') { applyStatMult(1.30); }
          else if (tier === 'LEN') { applyStatMult(1.40); bState._burstDmgBonus = (bState._burstDmgBonus||0) + 0.20; }
        }

        // ════════════ RIVALIDADE TRAITS (STATS_PARCIAL) ════════════

        // ── PSICOLOGICO (h2h vantagem >= 3) ──
        if (h2hAdv >= 3) {
          const tier = getTier('PSICOLOGICO');
          if (tier === 'NEG') { bState.vx *= 0.85; bState.vy *= 0.85; }
          else if (tier === 'COM') { bState.spinSpeed *= 1.10; bState.vx *= 1.05; bState.vy *= 1.05; }
          else if (tier === 'RAR') { applyStatMult(1.20); }
          else if (tier === 'LEN') { applyStatMult(1.30); }
        } else if (h2hAdv <= -3) {
          // Complexo do adversário
          if (getTier('PSICOLOGICO') === 'NEG') { bState.vx *= 0.85; bState.vy *= 0.85; bState.spinSpeed *= 0.85; }
        }

        // ── ESPECIALISTA_EM_REVANCHE (última vitória foi do adversário) ──
        if (lastWonVsOpp) {
          const tier = getTier('ESPECIALISTA_EM_REVANCHE');
          if (tier === 'NEG') { applyStatMult(0.85); }
          else if (tier === 'COM') { bState.spinSpeed *= 1.15; bState.vx *= 1.10; bState.vy *= 1.10; }
          else if (tier === 'RAR') { applyStatMult(1.25); }
          else if (tier === 'LEN') { applyStatMult(1.35); }
        }

        // ── ESPECIALISTA_EM_SERIE (acumula por vitórias no torneio) ──
        if (tourneyWins > 0) {
          const tier = getTier('ESPECIALISTA_EM_SERIE');
          const cap  = tier === 'LEN' ? 5 : tier === 'RAR' ? 5 : 5;
          const wins = Math.min(tourneyWins, cap);
          if (tier === 'NEG') { applyStatMult(1.0 - wins * 0.02); }
          else if (tier === 'COM') { applyStatMult(1.0 + wins * 0.03); }
          else if (tier === 'RAR') { applyStatMult(1.0 + wins * 0.05); }
          else if (tier === 'LEN') { applyStatMult(1.0 + wins * 0.07); }
        }

        // ── REI_DA_ARENA_DOMINANCIA (spin > 130% adversário) ──
        // Flag armazenada — comparação de spin feita pós-init quando ambos estão iniciados
        bState._reiDaArenaTier = getTier('REI_DA_ARENA_DOMINANCIA');

        return bState;
      };
      const t1name = md3State?.team1?.name || '';
      const t2name = md3State?.team2?.name || '';
      // Calcular avg stats para CACADOR_DE_GIGANTES
      const _avgBey1 = bey1?.effectiveStats ? Object.values(bey1.effectiveStats).reduce((a,b)=>a+b,0)/6 : 20;
      const _avgBey2 = bey2?.effectiveStats ? Object.values(bey2.effectiveStats).reduce((a,b)=>a+b,0)/6 : 20;
      const md3WithAvg = { ...md3State, team1AvgStat: _avgBey1, team2AvgStat: _avgBey2 };
      applyBattleTraits(b1, t1name, md3WithAvg, true);
      applyBattleTraits(b2, t2name, md3WithAvg, false);

      // ── REI_DA_ARENA_DOMINANCIA pós-init (spin comparison) ──
      if (b1._reiDaArenaTier || b2._reiDaArenaTier) {
        const ratio = b1.spinSpeed > 0 && b2.spinSpeed > 0 ? b1.spinSpeed / b2.spinSpeed : 1;
        if (ratio >= 1.30 && b1._reiDaArenaTier) {
          const t = b1._reiDaArenaTier;
          if (t === 'NEG') { /* complacência — sem bônus */ }
          else if (t === 'COM') { b1.spinSpeed *= 1.15; }
          else if (t === 'RAR') { b1.spinSpeed *= 1.25; b1._spinDecayBonus = (b1._spinDecayBonus||0) + 0.08; }
          else if (t === 'LEN') { b1.spinSpeed *= 1.25; b1._spinDecayBonus = (b1._spinDecayBonus||0) + 0.15; }
        }
        if ((1/ratio) >= 1.30 && b2._reiDaArenaTier) {
          const t = b2._reiDaArenaTier;
          if (t === 'NEG') { /* complacência */ }
          else if (t === 'COM') { b2.spinSpeed *= 1.15; }
          else if (t === 'RAR') { b2.spinSpeed *= 1.25; b2._spinDecayBonus = (b2._spinDecayBonus||0) + 0.08; }
          else if (t === 'LEN') { b2.spinSpeed *= 1.25; b2._spinDecayBonus = (b2._spinDecayBonus||0) + 0.15; }
        }
        // GUERRA_DE_ATRITO pós-init (spin inferior)
        if (b1.spinSpeed < b2.spinSpeed && b1._guerraDeAtritoTier) {
          const t = b1._guerraDeAtritoTier;
          if (t === 'NEG') { b1._spinDecayOwn = (b1._spinDecayOwn||1.0) * 1.20; }
          else if (t === 'COM') { b1.spinSpeed *= 1.10; b1.burstRiskMod *= 0.90; }
          else if (t === 'RAR') { b1.spinSpeed *= 1.20; b1._burstDmgBonus = (b1._burstDmgBonus||0) + 0.15; }
          else if (t === 'LEN') { b1._absorcaoCinetica = true; }
        }
        if (b2.spinSpeed < b1.spinSpeed && b2._guerraDeAtritoTier) {
          const t = b2._guerraDeAtritoTier;
          if (t === 'NEG') { b2._spinDecayOwn = (b2._spinDecayOwn||1.0) * 1.20; }
          else if (t === 'COM') { b2.spinSpeed *= 1.10; b2.burstRiskMod *= 0.90; }
          else if (t === 'RAR') { b2.spinSpeed *= 1.20; b2._burstDmgBonus = (b2._burstDmgBonus||0) + 0.15; }
          else if (t === 'LEN') { b2._absorcaoCinetica = true; }
        }
      }
    } catch(e) { console.warn('traits battle_init error:', e); }
    // ─────────────────────────────────────────────────────────

    // ─────────────────────────────────────────────────────────
    // ── MENTALITY BATTLE EFFECTS ─────────────────────────────
    // Aplica efeitos especiais das novas mentalidades ao estado de batalha
    // ─────────────────────────────────────────────────────────
    try {
      function applyMentalityEffects(bState, bey, team, quality, opponentScore, currentRoundNum, arenaName) {
        const mentality = team?.mentality;
        if (!mentality) return;

        // ── 🧩 ADAPTIVE_TACTICIAN ─────────────────────────────
        // +10% stats por round após o 1º, +10% adicional por round perdido
        if (mentality === 'ADAPTIVE_TACTICIAN') {
          const round = currentRoundNum || 1;
          const roundsLost = opponentScore || 0; // oponente ganhou X rounds = eu perdi X
          const bonus = ((round - 1) * 0.10) + (roundsLost * 0.10);
          if (bonus > 0) {
            const mult = 1 + bonus;
            // Modifica velocidade inicial (proxy para atk effectiveStat)
            bState.vx *= mult;
            bState.vy *= mult;
            // Modifica spinSpeed (proxy para sta)
            bState.spinSpeed *= Math.sqrt(mult); // raiz para não ser OP
            if (bonus >= 0.2) {
              addParticle(bState.x, bState.y, '#14b8a6', 15);
              recordEvent('ADAPTIVE_TACTICIAN_BOOST', { bonus: Math.round(bonus * 100), round, roundsLost });
            }
          }
        }

        // ── ✨ PERFECTIONIST ──────────────────────────────────
        // +25% velocidade/spin em PERFECT launch; -20% em WEAK/CRITICAL_FAIL
        if (mentality === 'PERFECTIONIST') {
          const launchKey = quality?.key;
          if (launchKey === 'PERFECT') {
            bState.vx *= 1.25;
            bState.vy *= 1.25;
            bState.spinSpeed *= 1.25;
            addParticle(bState.x, bState.y, '#facc15', 20);
            addParticle(bState.x, bState.y, '#ffffff', 12);
            recordEvent('PERFECTIONIST_PERFECT', { team: team.name });
          } else if (launchKey === 'WEAK' || launchKey === 'CRITICAL_FAIL') {
            bState.vx *= 0.80;
            bState.vy *= 0.80;
            bState.spinSpeed *= 0.80;
            addParticle(bState.x, bState.y, '#facc15', 6);
            recordEvent('PERFECTIONIST_FRUSTRATED', { launchKey, team: team.name });
          }
        }

        // ── 🌪️ CHAOS_AGENT ────────────────────────────────────
        // +30% stats em arenas caóticas; -15% em arenas calmas
        if (mentality === 'CHAOS_AGENT') {
          const hazardArenas = [
            'VOLCANIC_RAGE', 'COLOSSEUM_CARNAGE', 'STORM_TRACK',
            'PANGEA_PLATFORM', 'VORTEX_MAELSTROM', 'TIDAL_SURGE',
            'TORNADO_RIDGE', 'GRAVITON_COLOSSEUM', 'KILLER_SIDES',
            'VORTEX_COLISEUM'
          ];
          const arena = arenaName || '';
          if (hazardArenas.includes(arena)) {
            bState.vx *= 1.30;
            bState.vy *= 1.30;
            bState.spinSpeed *= 1.15;
            addParticle(bState.x, bState.y, '#a855f7', 20);
            addParticle(bState.x, bState.y, '#c026d3', 12);
            recordEvent('CHAOS_AGENT_POWERED', { arena, team: team.name });
          } else if (arena) {
            bState.vx *= 0.85;
            bState.vy *= 0.85;
            bState.spinSpeed *= 0.90;
            recordEvent('CHAOS_AGENT_BORED', { arena, team: team.name });
          }
        }

        // ── 🦹 MOMENTUM_THIEF ─────────────────────────────────
        // +5% velocidade/spin por vitória do adversário (min 2 vitórias)
        if (mentality === 'MOMENTUM_THIEF') {
          const opponentWins = opponentScore || 0;
          if (opponentWins >= 2) {
            const streakMult = 1 + (opponentWins * 0.05);
            bState.vx *= streakMult;
            bState.vy *= streakMult;
            bState.spinSpeed *= Math.sqrt(streakMult);
            bState.burstRiskMod *= Math.max(0.5, 1 - opponentWins * 0.05); // Mais resistente a burst
            addParticle(bState.x, bState.y, '#6366f1', 15);
            addParticle(bState.x, bState.y, '#4f46e5', 10);
            recordEvent('MOMENTUM_THIEF_ACTIVATED', { opponentWins, team: team.name });
          }
        }
      }

      const roundNum = md3State?.currentRound || 1;
      const arenaName = md3State?.arenaOrder?.[(roundNum - 1) % (md3State?.arenaOrder?.length || 1)] || '';
      applyMentalityEffects(b1, bey1, md3State?.team1, md3State?.launchQuality1, md3State?.team2Wins, roundNum, arenaName);
      applyMentalityEffects(b2, bey2, md3State?.team2, md3State?.launchQuality2, md3State?.team1Wins, roundNum, arenaName);
    } catch(e) {
      console.warn('MentalityEffects error:', e);
    }
    // ─────────────────────────────────────────────────────────

    // ─────────────────────────────────────────────────────────
    // ── ATRIBUTOS POR ROUND: CLT Clutch extra + ADA scaling ──
    // Aplicados DEPOIS da inicialização de b1/b2 para garantir
    // que effectiveStats e vx/vy/spinSpeed reflitam o estado real.
    // ─────────────────────────────────────────────────────────
    try {
      const _roundNum   = md3State?.currentRound || 1;
      const _t1Wins     = md3State?.team1Wins    || 0;
      const _t2Wins     = md3State?.team2Wins    || 0;
      const _winsNeeded = md3State?.winsNeeded   || 2;

      // Clutch situation por equipe (cada uma tem sua perspectiva)
      const _isClutch1 = (
        (_winsNeeded - _t1Wins === 1) ||         // match point para a equipe
        (_t2Wins > _t1Wins) ||                    // atrás no placar
        (_t1Wins === _t2Wins && _roundNum >= 2)  // empatado no round 2+
      );
      const _isClutch2 = (
        (_winsNeeded - _t2Wins === 1) ||
        (_t1Wins > _t2Wins) ||
        (_t1Wins === _t2Wins && _roundNum >= 2)
      );

      function applyRoundAttrEffects(bState, team, isClutchSit, roundN) {
        const attrs = team?.attributes;
        if (!attrs) return;

        // ── ADA ROUND SCALING ──────────────────────────────────────────
        // Cada round após o 1º, ADA adiciona % em sta+spin
        // ADA=20: +5% por round. ADA=10 (neutro médio): +2.5%/round
        const adaptPerRound = (attrs.adaptability || 10) * (5 / 20) / 100;
        const totalAdaptBonus = (roundN - 1) * adaptPerRound;
        if (totalAdaptBonus > 0.001) {
          const aMult = 1 + totalAdaptBonus;
          bState.spinSpeed        *= aMult;
          bState.stats.maxSpin   *= aMult;
          if (bState.bey?.effectiveStats) {
            // Clone para não mutar referência original
            bState.bey = { ...bState.bey, effectiveStats: { ...bState.bey.effectiveStats } };
            bState.bey.effectiveStats.sta  = Math.min(48, Math.round((bState.bey.effectiveStats.sta  || 10) * aMult));
            bState.bey.effectiveStats.spin = Math.min(95, Math.round((bState.bey.effectiveStats.spin || 40) * aMult));
          }
        }

        // ── CLT CLUTCH EXTRA ───────────────────────────────────────────
        // Só dispara em situação clutch detectada neste round
        if (isClutchSit) {
          const clutch = attrs.clutch || 7;
          const clutchExtra = clutch < 7
            ? (clutch - 7) * (24 / 7) / 100
            : (clutch - 7) * (30 / 13) / 100;
          if (Math.abs(clutchExtra) > 0.001) {
            const cMult = 1 + clutchExtra;
            bState.vx            *= cMult;
            bState.vy            *= cMult;
            bState.spinSpeed     *= cMult;
            bState.stats.maxSpin *= cMult;
            if (bState.bey?.effectiveStats) {
              bState.bey = { ...bState.bey, effectiveStats: { ...bState.bey.effectiveStats } };
              const CAPS = { atk: 48, def: 48, sta: 48, bal: 48, weight: 48, spin: 95 };
              ['atk','def','sta','bal','weight','spin'].forEach(s => {
                if (bState.bey.effectiveStats[s] !== undefined)
                  bState.bey.effectiveStats[s] = Math.min(CAPS[s] || 48, Math.round(bState.bey.effectiveStats[s] * cMult));
              });
            }
            // Recomputar flags de habilidade especial (podem ter atingido threshold)
            bState.hasBladeStorm       = (bState.bey?.effectiveStats?.atk    || 0) >= 27;
            bState.hasAbsoluteBarrier  = (bState.bey?.effectiveStats?.def    || 0) >= 27;
            bState.hasGyroLock         = (bState.bey?.effectiveStats?.bal    || 0) >= 27;
            bState.hasGravityWell      = (bState.bey?.effectiveStats?.weight || 0) >= 27;
            bState.hasCelestialRotation= (bState.bey?.effectiveStats?.spin   || 0) >= 50;
            if (clutchExtra > 0) {
              addParticle(bState.x, bState.y, '#ffd700', 20);
              recordEvent('CLUTCH_BONUS_ACTIVATED', { clutch, bonus: Math.round(clutchExtra * 100), round: roundN });
            }
          }
        }
      }

      applyRoundAttrEffects(b1, md3State?.team1, _isClutch1, _roundNum);
      applyRoundAttrEffects(b2, md3State?.team2, _isClutch2, _roundNum);
    } catch(e) {
      console.warn('RoundAttrEffects error:', e);
    }
    // ─────────────────────────────────────────────────────────

    const isOppositeSpin = (b1.spinDirection !== b2.spinDirection);

    // ============================================
    // 🆕 APLICAR LAUNCH PATTERNS (HEADLESS)
    // ============================================
    applyLaunchPattern(b1, launch1, b2, launch2, 0);
    applyLaunchPattern(b2, launch2, b1, launch1, 0);

    let winner = null;
    let winMethod = '';
    let endingTimer = 0;
    let burstDelay = 0;
    let burstTriggered = false;

    // ============================================
    // 🆕 PROCESSAR NOVOS LAUNCH PATTERNS (HEADLESS)
    // ============================================
    function applyLaunchPattern(bey, launchTechnique, opponentBey, opponentLaunch, battleTime) {
      if (!launchTechnique || !launchTechnique.pattern) return;
      
      const pattern = launchTechnique.pattern;
      const special = launchTechnique.special || {};
      
      switch (pattern) {
        
        // ========================================
        // 👻 PHANTOM LAUNCH
        // ========================================
        case 'phantom':
          bey.vx *= launchTechnique.speedMod;
          bey.vy *= launchTechnique.speedMod;
          bey.isInvisible = true;
          bey.invulnerable = special.invulnerable || true;
          bey.invisibleStartTime = Date.now();
          bey.phantomDuration = special.invisibleDuration || 2.0;
          
          setTimeout(() => {
            if (bey.isInvisible) {
              bey.isInvisible = false;
              bey.invulnerable = false;
              const emergeBurst = special.emergeBurst || 1.4;
              bey.vx *= emergeBurst;
              bey.vy *= emergeBurst;
            }
          }, (special.invisibleDuration || 2.0) * 1000);
          break;
        
        // ========================================
        // 🪞 MIRROR LAUNCH
        // ========================================
        case 'mirror':
          if (special.copyOpponent && opponentLaunch && opponentBey) {
            setTimeout(() => {
              const bonusMultiplier = special.bonusMultiplier || 1.10;
              const opponentSpeed = Math.sqrt(opponentBey.vx ** 2 + opponentBey.vy ** 2);
              const angle = Math.atan2(opponentBey.vy, opponentBey.vx);
              bey.vx = Math.cos(angle) * opponentSpeed * bonusMultiplier;
              bey.vy = Math.sin(angle) * opponentSpeed * bonusMultiplier;
              bey.spinSpeed = opponentBey.spinSpeed * bonusMultiplier;
            }, (special.delay || 0.3) * 1000);
          }
          break;
        
        // ========================================
        // 🛰️ SATELLITE LAUNCH
        // ========================================
        case 'satellite': {
          // Raio seguro: respeita o hard wall clamp (wall - 34) que é o limite real de colisão
          // wall - 34 = 187 para BB10; sem -34 para outras arenas, mas usamos margem extra
          // Para arenas ovais (wallA/wallB), usar o menor eixo para garantir que a órbita
          // não ultrapasse nenhum lado. Para arenas normais, usar zones.wall.
          const _zw = ARENA.zones?.wall;
          const _zA = ARENA.zones?.wallA;
          const _zB = ARENA.zones?.wallB;
          const _rawWall = _zA != null && _zB != null
            ? Math.min(_zA, _zB)           // oval: menor eixo é o limitante
            : (_zw || ARENA.arenaRadius || 220);   // fallback p/ pinball (arenaRadius) ou padrão
          const effectiveWall = _rawWall - (arenaType === 'BB10_COMPETITIVE' ? 34 : 0);
          const safeOrbitRadius = Math.min(
            special.orbitRadius || 200,
            effectiveWall - bey.radius - 25  // margem confortável de 25px
          );
          bey.isOrbiting = true;
          bey.orbitStartTime = Date.now();
          bey.orbitDuration = special.orbitDuration || 3.0;
          bey.orbitRadius = safeOrbitRadius;
          bey.orbitAngle = Math.random() * Math.PI * 2;
          bey.orbitSpeed = (Math.PI * 2) / bey.orbitDuration;
          bey.orbitMomentum = 0;
          
          // 🛰️ Teleportar imediatamente para a posição inicial da órbita
          // evita que o peão passe 1 frame com posição antiga (centerX ± 80) sem proteção
          bey.x = centerX + Math.cos(bey.orbitAngle) * bey.orbitRadius;
          bey.y = centerY + Math.sin(bey.orbitAngle) * bey.orbitRadius;
          bey.vx = -Math.sin(bey.orbitAngle) * bey.orbitRadius * bey.orbitSpeed;
          bey.vy =  Math.cos(bey.orbitAngle) * bey.orbitRadius * bey.orbitSpeed;
          
          bey.updateOrbit = (deltaTime) => {
            if (bey.isOrbiting && (Date.now() - bey.orbitStartTime) / 1000 < bey.orbitDuration) {
              bey.orbitAngle += bey.orbitSpeed * deltaTime;
              bey.x = centerX + Math.cos(bey.orbitAngle) * bey.orbitRadius;
              bey.y = centerY + Math.sin(bey.orbitAngle) * bey.orbitRadius;
              bey.vx = -Math.sin(bey.orbitAngle) * bey.orbitRadius * bey.orbitSpeed;
              bey.vy =  Math.cos(bey.orbitAngle) * bey.orbitRadius * bey.orbitSpeed;
              bey.orbitMomentum += (special.momentumGain || 0.15) * deltaTime;
            } else if (bey.isOrbiting) {
              bey.isOrbiting = false;
              const diveBurst = special.diveBurst || 1.5;
              const angle = Math.atan2(centerY - bey.y, centerX - bey.x);
              const diveSpeed = launchTechnique.speedMod * diveBurst * (1 + bey.orbitMomentum) * 8;
              bey.vx = Math.cos(angle) * diveSpeed;
              bey.vy = Math.sin(angle) * diveSpeed;
            }
          };
          break;
        }
        // ========================================
        case 'pendulum':
          bey.isPendulum = true;
          bey.pendulumPhase = 0;
          bey.pendulumSpeed = special.oscillationSpeed || 2.5;
          bey.centerRadius = special.centerRadius || 40;
          bey.outerRadius = special.outerRadius || 180;
          bey.currentRadius = bey.outerRadius;
          bey.evasionBonus = special.evasionBonus || 0.15;
          bey.energyConservation = special.energyConservation || 0.90;
          
          bey.updatePendulum = (deltaTime) => {
            if (!bey.isPendulum) return;
            if (bey.pendulumPhase === 0) {
              bey.currentRadius -= bey.pendulumSpeed * deltaTime * 30;
              if (bey.currentRadius <= bey.centerRadius) {
                bey.currentRadius = bey.centerRadius;
                bey.pendulumPhase = 1;
              }
            } else {
              bey.currentRadius += bey.pendulumSpeed * deltaTime * 30;
              if (bey.currentRadius >= bey.outerRadius) {
                bey.currentRadius = bey.outerRadius;
                bey.pendulumPhase = 0;
              }
            }
            const angle = Math.atan2(bey.vy, bey.vx);
            // FIX: Usar centro real da arena, não (0,0)
            bey.x = centerX + Math.cos(angle) * bey.currentRadius;
            bey.y = centerY + Math.sin(angle) * bey.currentRadius;
          };
          break;
        
        // ========================================
        // 🌀 VORTEX LAUNCH
        // ========================================
        case 'vortex':
          bey.isVortex = true;
          bey.vortexStartTime = Date.now();
          bey.vortexDuration = special.vortexDuration || 8.0;
          bey.vortexRadius = special.vortexRadius || 40;
          bey.pullStrength = special.pullStrength || 2.0;
          bey.collisionBoost = special.collisionBoost || 1.20;
          
          bey.updateVortex = (opponent, deltaTime) => {
            if (!bey.isVortex) return;
            const elapsed = (Date.now() - bey.vortexStartTime) / 1000;
            if (elapsed > bey.vortexDuration) {
              bey.isVortex = false;
              return;
            }
            const dx = opponent.x - bey.x;
            const dy = opponent.y - bey.y;
            const dist = Math.sqrt(dx ** 2 + dy ** 2);
            if (dist < bey.vortexRadius && dist > 0) {
              const pullForce = bey.pullStrength * (1 - dist / bey.vortexRadius);
              const angle = Math.atan2(dy, dx);
              opponent.vx += Math.cos(angle) * pullForce * deltaTime;
              opponent.vy += Math.sin(angle) * pullForce * deltaTime;
            }
          };
          break;
        
        // ========================================
        // 🔨 HAMMER DROP
        // ========================================
        case 'hammer':
          bey.isHammer = true;
          bey.hammerFirstHit = true;
          bey.hammerMultiplier = special.firstHitMultiplier || 2.0;
          bey.slowdownAfter = special.slowdownAfter || 0.70;
          
          bey.onHammerHit = (collision, opponent) => {
            if (bey.hammerFirstHit) {
              bey.hammerFirstHit = false;
              const extraDamage = collision.damage * (bey.hammerMultiplier - 1);
              opponent.stamina -= extraDamage;
              opponent.burstDamage += extraDamage * 0.5;
              bey.vx *= bey.slowdownAfter;
              bey.vy *= bey.slowdownAfter;
            }
          };
          break;
      }
    }

          function checkCollision() {
      // ═══════════════════════════════════════════════════════════════
      // KNOCKBACK-CENTRIC COMBAT SYSTEM v3.0
      // ═══════════════════════════════════════════════════════════════
      // Design Philosophy: Knockback as the core combat pillar
      // 
      // Key Changes:
      // - Knockback based on impact power vs effective mass
      // - Arena controls energy loss, not collision
      // - Attack creates displacement, Weight anchors, Defense absorbs
      // - Over Finish through positioning, not RNG
      // - No instant amortization after knockback
      // 
      // New Systems:
      // - Impact Power = (ATK * 0.45) * velocity^1.2 * typeMultiplier
      // - Effective Mass = (weight * 1.8) + (spin * 0.12) + (stability * 0.6)
      // - Knockback = (impact / mass) * modifiers, clamped [0.15, 3.5]
      // - Direct velocity application, arena handles deceleration
      // 
      // Expected Results:
      // - Clear type identity in knockback behavior
      // - Positioning becomes tactical
      // - Over Finish through repeated displacement
      // ═══════════════════════════════════════════════════════════════
      
      // COLOSSEUM CARNAGE: Arena sempre aberta, obstáculos são a ameaça
      // (Sem lógica de paredes fechadas como The Pitt tinha)
      
      if (!b1 || !b2 || !b1.alive || !b2.alive) return;
      const dx = b2.x - b1.x;
      const dy = b2.y - b1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < b1.radius + b2.radius) {
        
        // ============================================
        // 🆕 VERIFICAR LAUNCH PATTERN EFFECTS (HEADLESS)
        // ============================================
        
        // 👻 PHANTOM LAUNCH - Invulnerabilidade
        if (b1.invulnerable || b2.invulnerable) {
          return; // Não aplicar colisão
        }
        
        // ⏰ PENDULUM LAUNCH - Evasão aumentada
        if (b1.isPendulum && b1.evasionBonus && Math.random() < b1.evasionBonus) {
          return; // Evadiu o hit
        }
        if (b2.isPendulum && b2.evasionBonus && Math.random() < b2.evasionBonus) {
          return; // Evadiu o hit
        }
        
        const angle = Math.atan2(dy, dx);
        
        const impactForce = Math.sqrt(b1.vx * b1.vx + b1.vy * b1.vy) + Math.sqrt(b2.vx * b2.vx + b2.vy * b2.vy);
        const collisionX = (b1.x + b2.x) / 2;
        const collisionY = (b1.y + b2.y) / 2;
        addImpactParticles(collisionX, collisionY, Math.min(25, impactForce * 1.5));
        addSparkParticles(collisionX, collisionY, 15);
        
          // Screen shake for strong impacts (FASE 1)
          const impactStrength = Math.min(impactForce / 8, 2);
          addScreenShake(impactStrength);
          if (impactStrength > 1.5) {
            addFlashEffect('#ffffff', 0.2, 60);
          }
        if (impactForce > 12) {
          addParticle((b1.x + b2.x) / 2, (b1.y + b2.y) / 2, '#ff0000', 30);
          addParticle((b1.x + b2.x) / 2, (b1.y + b2.y) / 2, '#ffff00', 25);
        }
        
        const collisionForce = impactForce;
        recordEvent('COLLISION', {
          force: collisionForce,
          location: { x: (b1.x + b2.x) / 2, y: (b1.y + b2.y) / 2 }
        });
        
        // Opposite Spin Mechanics
        if (isOppositeSpin) {
          // Spin Equalization - faster loses spin, slower gains
          const spinDiff = Math.abs(b1.spinSpeed - b2.spinSpeed);
          let equalizationRate = 0.15;
          
          recordEvent('SPIN_EQUALIZATION', {
            spinDiff,
            b1Speed: b1.spinSpeed,
            b2Speed: b2.spinSpeed
          });
          
          // Spin Stealer synergy bonus
          const hasSpinStealer1 = b1.bey?.synergies?.some(s => s?.name?.includes('Spin Stealer')) || false;
          const hasSpinStealer2 = b2.bey?.synergies?.some(s => s?.name?.includes('Spin Stealer')) || false;
          
          if (b1.spinSpeed > b2.spinSpeed) {
            const transfer = spinDiff * equalizationRate;
            const gainMultiplier = hasSpinStealer2 ? 1.1 : 0.8;
            b1.spinSpeed -= transfer;
            b2.spinSpeed += transfer * gainMultiplier;
            b2.spinSpeed = Math.min(b2.stats.maxSpin, b2.spinSpeed); // Cap no máximo
            addParticle(b1.x, b1.y, '#ff00ff', 15);
            if (hasSpinStealer2) addParticle(b2.x, b2.y, '#00ffff', 20);
          } else if (b2.spinSpeed > b1.spinSpeed) {
            const transfer = spinDiff * equalizationRate;
            const gainMultiplier = hasSpinStealer1 ? 1.1 : 0.8;
            b2.spinSpeed -= transfer;
            b1.spinSpeed += transfer * gainMultiplier;
            b1.spinSpeed = Math.min(b1.stats.maxSpin, b1.spinSpeed); // Cap no máximo
            addParticle(b2.x, b2.y, '#ff00ff', 15);
            if (hasSpinStealer1) addParticle(b1.x, b1.y, '#00ffff', 20);
          }
        }
        
        // ═══════════════════════════════════════════════════════════════
        // NEW KNOCKBACK SYSTEM - IMPACT POWER vs EFFECTIVE MASS
        // ═══════════════════════════════════════════════════════════════
        
        // Calculate collision velocities
        const velocity1 = Math.sqrt(b1.vx * b1.vx + b1.vy * b1.vy);
        const velocity2 = Math.sqrt(b2.vx * b2.vx + b2.vy * b2.vy);
        
        // Type multipliers for impact power
        const getTypeMultiplier = (type) => {
          if (type === 'Attack') return 1.15;
          if (type === 'Defense' || type === 'Stamina') return 0.9;
          return 1.0; // Balance
        };
        
        const type1Mult = getTypeMultiplier(b1.bey?.type);
        const type2Mult = getTypeMultiplier(b2.bey?.type);
        
        // IMPACT POWER - Attack stat + velocity scaling
        const impactPower1 = 
          ((b1.bey?.effectiveStats?.atk || 10) * 0.45) * 
          Math.pow(velocity1, 1.2) * 
          type1Mult;
        
        const impactPower2 = 
          ((b2.bey?.effectiveStats?.atk || 10) * 0.45) * 
          Math.pow(velocity2, 1.2) * 
          type2Mult;
        
        // EFFECTIVE MASS - Weight, spin, and stability
        const effectiveMass1 = 
          ((b1.bey?.effectiveStats?.weight || 10) * 1.8) + 
          (b1.spinSpeed * 0.12) + 
          (b1.stability * 0.6);
        
        const effectiveMass2 = 
          ((b2.bey?.effectiveStats?.weight || 10) * 1.8) + 
          (b2.spinSpeed * 0.12) + 
          (b2.stability * 0.6);
        
        // ═══════════════════════════════════════════════════════════════
        // SOLUÇÃO 2: WEIGHT DIFFERENTIAL AMPLIFIER
        // ═══════════════════════════════════════════════════════════════
        // Calcula proporção de peso para amplificar diferenças
        const weightRatio12 = effectiveMass2 / effectiveMass1; // quanto b2 é mais pesado que b1
        const weightRatio21 = effectiveMass1 / effectiveMass2; // quanto b1 é mais pesado que b2
        
        // Legacy force variables for damage calculations (unchanged)
        let force1 = (b1.bey?.effectiveStats?.atk || 10) * 0.5;
        let force2 = (b2.bey?.effectiveStats?.atk || 10) * 0.5;
        
        // Attack types hit harder
        if (b1.bey?.type === 'Attack') force1 *= 1.18;
        if (b2.bey?.type === 'Attack') force2 *= 1.18;
        
        // Height interactions
        const heightDiff = (b1.bey?.height || 70) - (b2.bey?.height || 70);
        if (Math.abs(heightDiff) >= 10) {
          if (heightDiff < 0) { // b1 is lower
            force1 *= 1.15; // Low hits from below bonus
            addParticle(b1.x, b1.y, '#ffa500', 10);
          } else { // b2 is lower
            force2 *= 1.15;
            addParticle(b2.x, b2.y, '#ffa500', 10);
          }
        }
        
        // Momentum synergy
        const hasMomentum1 = b1.bey?.synergies?.some(s => s?.name?.includes('Momentum')) || false;
        const hasMomentum2 = b2.bey?.synergies?.some(s => s?.name?.includes('Momentum')) || false;
        
        if (hasMomentum1) force1 *= (1 + velocity1 * 0.1);
        if (hasMomentum2) force2 *= (1 + velocity2 * 0.1);

        // ── CORTE PRECISO (ATK 17): aplica stack de instabilidade no oponente ──
        if (b1.hasCortePreciso && velocity1 > 6 && Math.random() < 0.30) {
          b2._corteStacksOnOpp = Math.min(2, (b2._corteStacksOnOpp || 0) + 1);
          b2._corteExpiryOnOpp = _simTime + 4000;
          addParticle(b2.x, b2.y, '#ff6600', 12);
          recordEvent('CORTE_PRECISO', { attacker: 'b1', stacks: b2._corteStacksOnOpp });
        }
        if (b2.hasCortePreciso && velocity2 > 6 && Math.random() < 0.30) {
          b1._corteStacksOnOpp = Math.min(2, (b1._corteStacksOnOpp || 0) + 1);
          b1._corteExpiryOnOpp = _simTime + 4000;
          addParticle(b1.x, b1.y, '#ff6600', 12);
          recordEvent('CORTE_PRECISO', { attacker: 'b2', stacks: b1._corteStacksOnOpp });
        }

        // ── RAJADA DE ACO (ATK 27): a cada 3 hits consecutivos, próximo é crit garantido ──
        if (b1.hasRajadaDeAco) {
          b1._hitStreak = (b1._hitStreak || 0) + 1;
          if (b1._hitStreak >= 3) { b1._hitStreak = 0; b1._rajadaReady = true; }
        }
        if (b2.hasRajadaDeAco) {
          b2._hitStreak = (b2._hitStreak || 0) + 1;
          if (b2._hitStreak >= 3) { b2._hitStreak = 0; b2._rajadaReady = true; }
        }
        
        // Precision (BAL synergy)
        const hasPrecision1 = b1.bey?.synergies?.some(s => s?.name?.includes('Precision')) || false;
        const hasPrecision2 = b2.bey?.synergies?.some(s => s?.name?.includes('Precision')) || false;
        if (hasPrecision1 && Math.random() < 0.15) {
          force1 *= 1.5;
          addParticle(b1.x, b1.y, '#fbbf24', 25);
        }
        if (hasPrecision2 && Math.random() < 0.15) {
          force2 *= 1.5;
          addParticle(b2.x, b2.y, '#fbbf24', 25);
        }

        // ── TEC: HIT ACCURACY — Glancing Blow ────────────────────────────
        // hitAccuracy: 0.40 (TEC=0) → 1.00 (TEC=15). Neutro TEC=7 ≈ 0.68
        // Colisão glancing = força reduzida a 35% (apenas rozou)
        const _acc1 = b1.bey?.hitAccuracy ?? 0.68;
        const _acc2 = b2.bey?.hitAccuracy ?? 0.68;
        if (Math.random() > _acc1) {
          force1 *= 0.35;
          addParticle(b1.x, b1.y, '#94a3b8', 6);
          recordEvent('GLANCING_BLOW', { bey: 'b1', accuracy: _acc1 });
        }
        if (Math.random() > _acc2) {
          force2 *= 0.35;
          addParticle(b2.x, b2.y, '#94a3b8', 6);
          recordEvent('GLANCING_BLOW', { bey: 'b2', accuracy: _acc2 });
        }
        
        // ═══════════════════════════════════════════════════════════════
        // KNOCKBACK CALCULATION - Core Combat System
        // ═══════════════════════════════════════════════════════════════
        
        // Base knockback from impact/mass ratio
        // v3.3: MULTIPLICADOR 5X para knockback dramático!
        let knockback1 = (impactPower2 / effectiveMass1) * 5.0;
        let knockback2 = (impactPower1 / effectiveMass2) * 5.0;
        
        // ═══════════════════════════════════════════════════════════════
        // SOLUÇÃO 2: TYPE-SPECIFIC KNOCKBACK MODIFIERS
        // ═══════════════════════════════════════════════════════════════
        
        // ATTACK TYPE - Hit harder but also get knocked back more (high risk, high reward)
        if (b1.bey?.type === 'Attack') {
          knockback2 *= 1.5; // Attack empurra 50% mais
          knockback1 *= 1.2; // Attack também sofre 20% mais recoil
        }
        if (b2.bey?.type === 'Attack') {
          knockback1 *= 1.5;
          knockback2 *= 1.2;
        }
        
        // STAMINA TYPE - Anchors to arena when moving slowly
        if (b1.bey?.type === 'Stamina') {
          const staminaGrip = 1 - (velocity1 / 15); // mais grip quando lento
          knockback1 *= Math.max(0.4, staminaGrip); // reduz até 60% do knockback
          if (velocity1 < 3) addParticle(b1.x, b1.y, '#00ff88', 15);
        }
        if (b2.bey?.type === 'Stamina') {
          const staminaGrip = 1 - (velocity2 / 15);
          knockback2 *= Math.max(0.4, staminaGrip);
          if (velocity2 < 3) addParticle(b2.x, b2.y, '#00ff88', 15);
        }
        
        // WEIGHT DIFFERENTIAL AMPLIFIER - Dramatiza diferença leve vs pesado
        if (weightRatio12 > 1.25) {
          // b2 é 25%+ mais pesado que b1 - b1 sofre MUITO mais knockback
          const amplifier = Math.pow(weightRatio12, 0.8);
          knockback1 *= amplifier;
          addParticle(b1.x, b1.y, '#ff6600', 25);
          recordEvent('WEIGHT_ADVANTAGE', {
            heavier: 'b2',
            lighter: 'b1',
            ratio: weightRatio12,
            amplifier: amplifier
          });
        } else if (weightRatio21 > 1.25) {
          // b1 é 25%+ mais pesado que b2
          const amplifier = Math.pow(weightRatio21, 0.8);
          knockback2 *= amplifier;
          addParticle(b2.x, b2.y, '#ff6600', 25);
          recordEvent('WEIGHT_ADVANTAGE', {
            heavier: 'b1',
            lighter: 'b2',
            ratio: weightRatio21,
            amplifier: amplifier
          });
        }
        
        // Arena modifiers (slight variations by arena type)
        let arenaModifier = arenaType === 'COLOSSEUM_CARNAGE' ? 1.1 : 
                              arenaType === 'NEXUS' ? 1.1 : 
                              1.0;
        
        // CARNAGE COLOSSEUM — BLOOD_MOON dobra o dano de colisão
        if (arenaType === 'COLOSSEUM_CARNAGE' && ARENA.carnageEvent?.revealed && ARENA.carnageEvent?.activeEvent === 'BLOOD_MOON') {
          arenaModifier *= 2.0;
        }
        
        // VOLCANIC RAGE: knockback ×1.1 + heat bonus + weight advantage 1.2x (moderado)
        if (arenaType === 'VOLCANIC_RAGE') {
          arenaModifier = 1.1; // knockback base aumentado

          // Bônus de calor: quanto mais quente, mais violento o impacto
          const heatLevel = (ARENA.heatSystem && ARENA.heatSystem.level) || 0;
          arenaModifier *= (1.0 + (heatLevel / 100) * 0.2); // até +20% no heat máximo

          // Sobe heat ao colidir
          if (ARENA.heatSystem) {
            ARENA.heatSystem.level = Math.min(
              ARENA.heatSystem.maxLevel,
              ARENA.heatSystem.level + ARENA.heatSystem.gainOnCollision
            );
          }

          // Weight advantage 1.2x (moderado — não opressivo como antes)
          const weightAdv = 1.2;
          const weightRatio = effectiveMass1 / effectiveMass2;
          if (weightRatio > 1.15) {
            knockback1 /= (1.0 + (weightRatio - 1.0) * weightAdv * 0.2);
            knockback2 *= (1.0 + (weightRatio - 1.0) * weightAdv * 0.2);
          } else if (weightRatio < 0.85) {
            const inverseRatio = effectiveMass2 / effectiveMass1;
            knockback1 *= (1.0 + (inverseRatio - 1.0) * weightAdv * 0.2);
            knockback2 /= (1.0 + (inverseRatio - 1.0) * weightAdv * 0.2);
          }
        }
        
        knockback1 *= arenaModifier;
        knockback2 *= arenaModifier;
        
        // Type matchup modifiers
        if (b1.bey?.type === 'Defense') {
          const defReduction = Math.min((b1.bey?.effectiveStats?.def || 10) * 0.015, 0.4);
          knockback1 *= (1 - defReduction);
        }
        if (b2.bey?.type === 'Defense') {
          const defReduction = Math.min((b2.bey?.effectiveStats?.def || 10) * 0.015, 0.4);
          knockback2 *= (1 - defReduction);
        }
        
        // GYRO LOCK (BAL 27+) - Severe knockback reduction, not immunity
        if (b1.hasGyroLock) {
          knockback1 *= 0.35; // 65% reduction
          addParticle(b1.x, b1.y, '#8b5cf6', 15);
        }
        if (b2.hasGyroLock) {
          knockback2 *= 0.35;
          addParticle(b2.x, b2.y, '#8b5cf6', 15);
        }
        
        // GRAVITY WELL (WEIGHT 27+) - Fixed 30% reduction, not immunity
        if (b1.hasGravityWell) {
          knockback1 *= 0.70; // 30% reduction
          addParticle(b1.x, b1.y, '#8b008b', 12);
        }
        if (b2.hasGravityWell) {
          knockback2 *= 0.70;
          addParticle(b2.x, b2.y, '#8b008b', 12);
        }
        
        // Heavy Hitter synergy
        const hasHeavyHitter1 = b1.bey?.synergies?.some(s => s?.name?.includes('Heavy Hitter')) || false;
        const hasHeavyHitter2 = b2.bey?.synergies?.some(s => s?.name?.includes('Heavy Hitter')) || false;
        if (hasHeavyHitter1) knockback2 *= 1.25;
        if (hasHeavyHitter2) knockback1 *= 1.25;
        
        
        // Balance type converts knockback to rotational displacement
        // SOLUÇÃO 2: Anti-knockback quando girando rápido
        if (b1.bey?.type === 'Balance') {
          const spinPercent = b1.spinSpeed / b1.stats.maxSpin;
          const balanceFactor = (b1.bey?.effectiveStats?.bal || 10) * 0.02;
          
          // Alta rotação = converte knockback em spin e reduz knockback linear
          if (spinPercent > 0.5) {
            b1.rotation += knockback1 * balanceFactor * 3;
            knockback1 *= (0.5 + (1 - spinPercent) * 0.5); // reduz até 50% quando spin = 100%
            addParticle(b1.x, b1.y, '#fbbf24', 20);
          } else {
            b1.rotation += knockback1 * balanceFactor;
            knockback1 *= 0.85; // Slightly reduced linear knockback
          }
        }
        if (b2.bey?.type === 'Balance') {
          const spinPercent = b2.spinSpeed / b2.stats.maxSpin;
          const balanceFactor = (b2.bey?.effectiveStats?.bal || 10) * 0.02;
          
          if (spinPercent > 0.5) {
            b2.rotation += knockback2 * balanceFactor * 3;
            knockback2 *= (0.5 + (1 - spinPercent) * 0.5);
            addParticle(b2.x, b2.y, '#fbbf24', 20);
          } else {
            b2.rotation += knockback2 * balanceFactor;
            knockback2 *= 0.85;
          }
        }
        
        // MANDATORY CLAMP - v3.3: Aumentado para permitir knockbacks dramáticos!
        // ANTES: 0.25-6.0 | AGORA: 1.0-60.0 (10x maior!)
        knockback1 = Math.max(1.0, Math.min(60.0, knockback1));
        knockback2 = Math.max(1.0, Math.min(60.0, knockback2));

        // ── POSTURA DE ACO (DEF 17): excesso de knockback > 20 vira recuperação de spin ──
        if (b1.hasPosturaDeAco && knockback1 > 20) {
          const excess1 = knockback1 - 20;
          knockback1 = 20;
          b1.spinSpeed += excess1 * 0.08;
          addParticle(b1.x, b1.y, '#60a5fa', 18);
          recordEvent('POSTURA_DE_ACO', { bey: 'b1', excessAbsorbed: excess1.toFixed(1), spinGain: (excess1*0.08).toFixed(1) });
        }
        if (b2.hasPosturaDeAco && knockback2 > 20) {
          const excess2 = knockback2 - 20;
          knockback2 = 20;
          b2.spinSpeed += excess2 * 0.08;
          addParticle(b2.x, b2.y, '#60a5fa', 18);
          recordEvent('POSTURA_DE_ACO', { bey: 'b2', excessAbsorbed: excess2.toFixed(1), spinGain: (excess2*0.08).toFixed(1) });
        }

        // ── CAMARA DE RESSONANCIA (BAL 27): knockback recebido reduzido a 40%, 60% vira spin ──
        if (b1.hasCamaraRessonancia) {
          const converted1 = knockback1 * 0.60;
          knockback1 *= 0.40;
          b1.spinSpeed += converted1 * 0.06;
          addParticle(b1.x, b1.y, '#fbbf24', 14);
          recordEvent('CAMARA_RESSONANCIA', { bey: 'b1', spinGain: (converted1*0.06).toFixed(1) });
        }
        if (b2.hasCamaraRessonancia) {
          const converted2 = knockback2 * 0.60;
          knockback2 *= 0.40;
          b2.spinSpeed += converted2 * 0.06;
          addParticle(b2.x, b2.y, '#fbbf24', 14);
          recordEvent('CAMARA_RESSONANCIA', { bey: 'b2', spinGain: (converted2*0.06).toFixed(1) });
        }
        
        // ═══════════════════════════════════════════════════════════════
        // APPLY KNOCKBACK - Direct velocity modification
        // ═══════════════════════════════════════════════════════════════
        // v3.3: DAMPING REMOVIDO! Aplicação direta de knockback com 1.2x boost!
        // ANTES: 0.85 damping | AGORA: 1.2 boost!
        
        b1.vx -= Math.cos(angle) * knockback1 * 1.2;
        b1.vy -= Math.sin(angle) * knockback1 * 1.2;
        b2.vx += Math.cos(angle) * knockback2 * 1.2;
        b2.vy += Math.sin(angle) * knockback2 * 1.2; // FIX: era 0.85, causava viés sistemático pró-b1
        
        // ═══════════════════════════════════════════════════════════════
        // v3.5-HÍBRIDO: COOLDOWN TEMPORAL
        // ═══════════════════════════════════════════════════════════════
        // Desabilita gravidade por 30 frames (0.5s) após colisão
        // Permite knockback se expressar COMPLETAMENTE antes da gravidade agir!
        const currentFrame = Math.floor(_simTime / 16.67);  // ~60fps
        const COOLDOWN_FRAMES = 30;  // 0.5 segundos
        
        b1.gravityDisabledUntil = currentFrame + COOLDOWN_FRAMES;
        b2.gravityDisabledUntil = currentFrame + COOLDOWN_FRAMES;
        // ═══════════════════════════════════════════════════════════════
        
        // Warp Chain bonus (NEXUS arena)
        if (arenaType === 'NEXUS') {
          if (b1.warpChain >= 2) {
            force1 *= (1 + (b1.warpChain * 0.25));
            addParticle(b1.x, b1.y, '#ff00ff', 20);
            recordEvent('WARP_CHAIN_BONUS', {
              bey: 'b1',
              chain: b1.warpChain,
              damageMultiplier: (1 + (b1.warpChain * 0.25))
            });
            b1.warpChain = 0; // Reset after use
          }
          if (b2.warpChain >= 2) {
            force2 *= (1 + (b2.warpChain * 0.25));
            addParticle(b2.x, b2.y, '#ff00ff', 20);
            recordEvent('WARP_CHAIN_BONUS', {
              bey: 'b2',
              chain: b2.warpChain,
              damageMultiplier: (1 + (b2.warpChain * 0.25))
            });
            b2.warpChain = 0; // Reset after use
          }
        }
        
        // Pinball V3: collision near wall amplifies force
        if (arenaType === 'PINBALL_INFERNO') {
          const arenaR = ARENA.arenaRadius || 165;
          const dist1  = Math.sqrt((b1.x - centerX) ** 2 + (b1.y - centerY) ** 2);
          const dist2  = Math.sqrt((b2.x - centerX) ** 2 + (b2.y - centerY) ** 2);
          // Amplify collisions in the outer 40px ring (near pink border)
          if (dist1 > arenaR - 40 || dist2 > arenaR - 40) {
            force1 *= 1.25;
            force2 *= 1.25;
          }
        }
        
        // Vortex Burst bonus (VORTEX_COLISEUM arena)
        if (arenaType === 'VORTEX_COLISEUM' && ARENA.momentum) {
          const stacks1 = Math.floor(ARENA.momentum.bey1Stacks);
          const stacks2 = Math.floor(ARENA.momentum.bey2Stacks);
          
          if (stacks1 >= 3) {
            const burstMultiplier = 1 + (stacks1 * 0.3); // +30% per stack
            force1 *= burstMultiplier;
            addParticle(b1.x, b1.y, '#c084fc', 30);
            addParticle(b1.x, b1.y, '#fbbf24', 20);
            recordEvent('VORTEX_BURST', {
              bey: 'b1',
              stacks: stacks1,
              damageMultiplier: burstMultiplier
            });
            ARENA.momentum.bey1Stacks = 0; // Reset after burst
          }
          if (stacks2 >= 3) {
            const burstMultiplier = 1 + (stacks2 * 0.3); // +30% per stack
            force2 *= burstMultiplier;
            addParticle(b2.x, b2.y, '#c084fc', 30);
            addParticle(b2.x, b2.y, '#fbbf24', 20);
            recordEvent('VORTEX_BURST', {
              bey: 'b2',
              stacks: stacks2,
              damageMultiplier: burstMultiplier
            });
            ARENA.momentum.bey2Stacks = 0; // Reset after burst
          }
        }

        // Separation force - prevent beyblades from overlapping
        // SOLUÇÃO 2: aumentado de 1.2 para 2.5 (beyblades "bounceam")
        const separationForce = 2.5;
        b1.x -= Math.cos(angle) * separationForce;
        b1.y -= Math.sin(angle) * separationForce;
        b2.x += Math.cos(angle) * separationForce;
        b2.y += Math.sin(angle) * separationForce;
        
        // ═══════════════════════════════════════════════════════════════
        // STAMINA DAMAGE - Separate from knockback
        // ═══════════════════════════════════════════════════════════════
        // BALANCEAMENTO v2: DEF 0.75→0.80 (defesa mais responsiva), bonus oculto force>15 removido
        let damage1 = Math.max(0.8, (force2 - (b1.bey?.effectiveStats?.def || 10) * 0.80) * 1.4);
        let damage2 = Math.max(0.8, (force1 - (b2.bey?.effectiveStats?.def || 10) * 0.80) * 1.4);
        
        // ═══════════════════════════════════════════════════════════════
        // SOLUÇÃO 2: WEIGHT EFFICIENCY - Heavy beyblades lose less stamina
        // ═══════════════════════════════════════════════════════════════
        const weight1 = (b1.bey?.effectiveStats?.weight || 10);
        const weight2 = (b2.bey?.effectiveStats?.weight || 10);
        
        const weightEfficiency1 = 1 - (weight1 / 40); // weight 20 = 50% efficiency
        const weightEfficiency2 = 1 - (weight2 / 40);
        
        damage1 *= (0.7 + weightEfficiency1 * 0.6); // peso reduz damage até 40%
        damage2 *= (0.7 + weightEfficiency2 * 0.6);
        
        // Recoil damage for Attack types - they hit hard but take damage too
        if (b1.bey?.type === 'Attack') {
          const recoilDamage = force1 * 0.25;
          damage1 += recoilDamage;
          b1.burstDamage += force1 * 0.03;
          addParticle(b1.x, b1.y, '#ff6600', 8);
        }
        if (b2.bey?.type === 'Attack') {
          const recoilDamage = force2 * 0.25;
          damage2 += recoilDamage;
          b2.burstDamage += force2 * 0.03;
          addParticle(b2.x, b2.y, '#ff6600', 8);
        }
        
        const hasFortress1 = b1.bey?.synergies?.some(s => s?.name?.includes('Fortress')) || false;
        const hasFortress2 = b2.bey?.synergies?.some(s => s?.name?.includes('Fortress')) || false;
        if (hasFortress1) damage1 *= 0.6;
        if (hasFortress2) damage2 *= 0.6;
        
        // ABSOLUTE BARRIER (DEF 27+) - Reduz TODO dano em 60%
        if (b1.hasAbsoluteBarrier) {
          damage1 *= 0.4;
          addParticle(b1.x, b1.y, '#00ffff', 20);
        }
        if (b2.hasAbsoluteBarrier) {
          damage2 *= 0.4;
          addParticle(b2.x, b2.y, '#00ffff', 20);
        }
        
        if (b1.ironWallActive && !b1.ironWallUsed) {
          damage1 = 0;
          b1.ironWallUsed = true;
          addParticle(b1.x, b1.y, '#3b82f6', 40);
        }
        if (b2.ironWallActive && !b2.ironWallUsed) {
          damage2 = 0;
          b2.ironWallUsed = true;
          addParticle(b2.x, b2.y, '#3b82f6', 40);
        }
        
        b1.stamina -= damage1;
        b2.stamina -= damage2;

        // ── ESPIRAL ETERNA: sinaliza penalidade de stamina ao ser atingido durante espiral ──
        if (b1._espiralEternaActive) b1._espiralEternaHitPenalty = true;
        if (b2._espiralEternaActive) b2._espiralEternaHitPenalty = true;
        
        // 🆕 HAMMER DROP - Primeiro hit (HEADLESS)
        if (b1.onHammerHit) {
          b1.onHammerHit({ damage: damage2 }, b2);
        }
        if (b2.onHammerHit) {
          b2.onHammerHit({ damage: damage1 }, b1);
        }
        
        // SPIN LOSS ON IMPACT
        const spinLoss1 = (force2 / 15) * (1 - (b1.bey?.effectiveStats?.spin || 40) / 60);
        const spinLoss2 = (force1 / 15) * (1 - (b2.bey?.effectiveStats?.spin || 40) / 60);
        
        b1.spinSpeed -= spinLoss1;
        b2.spinSpeed -= spinLoss2;

        // ── TURBILHAO (SPIN 17): recupera 15% do spin perdido no impacto ──
        if (b1.hasTurbilhao) { b1.spinSpeed += spinLoss1 * 0.15; addParticle(b1.x, b1.y, '#a5f3fc', 10); }
        if (b2.hasTurbilhao) { b2.spinSpeed += spinLoss2 * 0.15; addParticle(b2.x, b2.y, '#a5f3fc', 10); }

        // ── MESTRE_DO_SPIN_OUT: decay de spin extra
        if (b1._spinDecayBonus) b2.spinSpeed *= (1 - b1._spinDecayBonus * 0.015);
        if (b2._spinDecayBonus) b1.spinSpeed *= (1 - b2._spinDecayBonus * 0.015);
        // ── EFEITO_RICOCHETE: perde spin extra ao sofrer critical hit (aplicado depois)

        // Strong impacts cause massive spin loss
        if (velocity1 > 10 || velocity2 > 10) {
          b1.spinSpeed *= 0.97;
          b2.spinSpeed *= 0.97;
          addParticle(b1.x, b1.y, '#ff0000', 15);
          addParticle(b2.x, b2.y, '#ff0000', 15);
        }
        
        // ── CENTRO DE GRAVIDADE (BAL 17): -20% burst recebido se spin > 50% ──
        const cgSpinPct1 = b1.spinSpeed / (b1.stats?.maxSpin || 100);
        const cgSpinPct2 = b2.spinSpeed / (b2.stats?.maxSpin || 100);
        const cgMod1 = (b1.hasCentroGravidade && cgSpinPct1 > 0.5) ? 0.80 : 1.0;
        const cgMod2 = (b2.hasCentroGravidade && cgSpinPct2 > 0.5) ? 0.80 : 1.0;

        // BASE BURST DAMAGE - increased significantly
        let burstDamage1 = force2 * 0.08 * b1.burstRiskMod * cgMod1;
        let burstDamage2 = force1 * 0.08 * b2.burstRiskMod * cgMod2;

        // ── TRAIT BURST MODIFIERS (_burstDmgBonus: positive = attacks harder, negative = less)
        // b1's bonus affects how hard b1 HITS b2 (burstDamage2), and vice versa
        if (b1._burstDmgBonus) burstDamage2 *= (1 + b1._burstDmgBonus);
        if (b2._burstDmgBonus) burstDamage1 *= (1 + b2._burstDmgBonus);
        // Clip negatives to 0
        burstDamage1 = Math.max(0, burstDamage1);
        burstDamage2 = Math.max(0, burstDamage2);

        // CRITICAL HIT SYSTEM - chance based on conditions
        const collisionVelocity1 = Math.sqrt(b1.vx * b1.vx + b1.vy * b1.vy);
        const collisionVelocity2 = Math.sqrt(b2.vx * b2.vx + b2.vy * b2.vy);
        
        let criticalHit1 = false;
        let criticalHit2 = false;
        
        // ── RAJADA DE ACO (ATK 27): crit garantido no 3º hit consecutivo ──
        if (b1._rajadaReady) {
          criticalHit1 = true;
          b1._rajadaReady = false;
          burstDamage2 *= 2.0;
          addParticle(b2.x, b2.y, '#ff0000', 50);
          addParticle(b2.x, b2.y, '#ff9900', 35);
          recordEvent('RAJADA_DE_ACO', { attacker: 'b1', damage: burstDamage2 });
          addEvent('CRITICAL_HIT', `${bey1.name} - RAJADA DE AÇO!`, `${Math.round(burstDamage2)} burst damage`);
        }
        if (b2._rajadaReady) {
          criticalHit2 = true;
          b2._rajadaReady = false;
          burstDamage1 *= 2.0;
          addParticle(b1.x, b1.y, '#ff0000', 50);
          addParticle(b1.x, b1.y, '#ff9900', 35);
          recordEvent('RAJADA_DE_ACO', { attacker: 'b2', damage: burstDamage1 });
          addEvent('CRITICAL_HIT', `${bey2.name} - RAJADA DE AÇO!`, `${Math.round(burstDamage1)} burst damage`);
        }

        // Critical conditions for b1 hitting b2
        if (!criticalHit1 && b1.bey?.type === 'Attack' && collisionVelocity1 > 7) {
          const critChance1 = 0.30 + (b1._critBonus || 0);
          if (Math.random() < critChance1) {
            criticalHit1 = true;
            // EFEITO_RICOCHETE: b2 sofre spin loss extra ao ser crittado
            if (b2._hasRicochete) b2.spinSpeed *= (1 - 0.10);
            burstDamage2 *= 2.0;
            addParticle(b2.x, b2.y, '#ff0000', 50);
            addParticle(b2.x, b2.y, '#ffff00', 40);
            recordEvent('CRITICAL_BURST_HIT', { 
              attacker: 'b1', 
              victim: 'b2',
              damage: burstDamage2,
              reason: 'Attack High Speed'
            });
            addEvent('CRITICAL_HIT', `${bey1.name} - CRITICAL HIT!`, `${Math.round(burstDamage2)} damage`);
          }
        }
        
        // Critical conditions for b2 hitting b1
        if (!criticalHit2 && b2.bey?.type === 'Attack' && collisionVelocity2 > 7) {
          const critChance2 = 0.30 + (b2._critBonus || 0);
          if (Math.random() < critChance2) {
            criticalHit2 = true;
            // EFEITO_RICOCHETE: b1 sofre spin loss extra ao ser crittado
            if (b1._hasRicochete) b1.spinSpeed *= (1 - 0.10);
            burstDamage1 *= 2.0;
            addParticle(b1.x, b1.y, '#ff0000', 50);
            addParticle(b1.x, b1.y, '#ffff00', 40);
            recordEvent('CRITICAL_BURST_HIT', { 
              attacker: 'b2', 
              victim: 'b1',
              damage: burstDamage1,
              reason: 'Attack High Speed'
            });
            addEvent('CRITICAL_HIT', `${bey2.name} - CRITICAL HIT!`, `${Math.round(burstDamage1)} damage`);
          }
        }
        
        
        
        // Vulnerability multipliers - low balance = easier to burst
        if ((b1.bey?.effectiveStats?.bal || 10) < 9) {
          burstDamage1 *= 1.5;
          if (Math.random() < 0.02) addParticle(b1.x, b1.y, '#ff6600', 8);
        }
        if ((b2.bey?.effectiveStats?.bal || 10) < 9) {
          burstDamage2 *= 1.5;
          if (Math.random() < 0.02) addParticle(b2.x, b2.y, '#ff6600', 8);
        }
        
        // Height difference critical - under/upper attack
        if (Math.abs(heightDiff) >= 12) {
          if (heightDiff < 0 && collisionVelocity1 > 5) {
            // b1 is lower - under attack critical
            if (Math.random() < 0.20) {
              burstDamage2 *= 1.8;
              addParticle(b2.x, b2.y, '#00ffff', 30);
              recordEvent('CRITICAL_BURST_HIT', { 
                attacker: 'b1', 
                victim: 'b2',
                damage: burstDamage2,
                reason: 'Under Attack'
              });
            }
          } else if (heightDiff > 0 && collisionVelocity2 > 5) {
            // b2 is lower
            if (Math.random() < 0.20) {
              burstDamage1 *= 1.8;
              addParticle(b1.x, b1.y, '#00ffff', 30);
              recordEvent('CRITICAL_BURST_HIT', { 
                attacker: 'b2', 
                victim: 'b1',
                damage: burstDamage1,
                reason: 'Under Attack'
              });
            }
          }
        }
        
        // Type matchup burst bonus
        if (b1.bey?.type === 'Attack' && b2.bey?.type === 'Stamina') {
          burstDamage2 *= 1.3; // Attack ainda pressiona mais Stamina

          // ── STAMINA BURST ABSORPTION ──
          // Stamina usa seu STA para absorver burst de Ataques, desestabilizando o atacante
          const sta2 = b2.bey?.effectiveStats?.sta || 10;
          const absorptionRate2 = Math.min(0.60, sta2 / 40); // STA=24 → 60% absorção máx
          const absorbed2 = burstDamage2 * absorptionRate2;
          burstDamage2 -= absorbed2;                     // Stamina absorve parte do burst
          b1.burstDamage += absorbed2 * 0.15;            // 15% retorna como recoil p/ o Atacante
          if (absorbed2 > 2) {
            addParticle(b2.x, b2.y, '#00ff88', 18);
            recordEvent('STAMINA_BURST_ABSORPTION', { bey: 'b2', absorbed: absorbed2.toFixed(1), recoil: (absorbed2 * 0.15).toFixed(1) });
          }
        }
        if (b2.bey?.type === 'Attack' && b1.bey?.type === 'Stamina') {
          burstDamage1 *= 1.3;

          // ── STAMINA BURST ABSORPTION ──
          const sta1 = b1.bey?.effectiveStats?.sta || 10;
          const absorptionRate1 = Math.min(0.60, sta1 / 40);
          const absorbed1 = burstDamage1 * absorptionRate1;
          burstDamage1 -= absorbed1;
          b2.burstDamage += absorbed1 * 0.15;
          if (absorbed1 > 2) {
            addParticle(b1.x, b1.y, '#00ff88', 18);
            recordEvent('STAMINA_BURST_ABSORPTION', { bey: 'b1', absorbed: absorbed1.toFixed(1), recoil: (absorbed1 * 0.15).toFixed(1) });
          }
        }
        
        // Apply burst damage
        b1.burstDamage += burstDamage1;
        b2.burstDamage += burstDamage2;

        // ── CONTRA_GOLPE: reação ao critical hit recebido ──
        if (criticalHit2 && b1._contraGolqueTier) {
          const cgt = b1._contraGolqueTier;
          if (cgt === 'NEG') { b1.spinSpeed *= 0.90; } // Efeito Ricochete extra
          else if (cgt === 'COM') { b1._contraGolpeActive = true; b1._contraGolpeMult = 1.15; }
          else if (cgt === 'RAR') { b1._contraGolpeActive = true; b1._contraGolpeMult = 1.25; b1._burstDmgBonus = (b1._burstDmgBonus||0) + 0.15; }
          else if (cgt === 'LEN') {
            // Absorção Cinética: converte 30% do dano recebido em velocidade
            const absorcao = burstDamage1 * 0.30;
            b1.spinSpeed += absorcao * 0.05;
            b1.vx *= 1.10; b1.vy *= 1.10;
          }
          recordEvent('CONTRA_GOLPE_ACTIVATED', { bey: 'b1', tier: cgt });
        }
        if (criticalHit1 && b2._contraGolqueTier) {
          const cgt = b2._contraGolqueTier;
          if (cgt === 'NEG') { b2.spinSpeed *= 0.90; }
          else if (cgt === 'COM') { b2._contraGolpeActive = true; b2._contraGolpeMult = 1.15; }
          else if (cgt === 'RAR') { b2._contraGolpeActive = true; b2._contraGolpeMult = 1.25; b2._burstDmgBonus = (b2._burstDmgBonus||0) + 0.15; }
          else if (cgt === 'LEN') {
            const absorcao = burstDamage2 * 0.30;
            b2.spinSpeed += absorcao * 0.05;
            b2.vx *= 1.10; b2.vy *= 1.10;
          }
          recordEvent('CONTRA_GOLPE_ACTIVATED', { bey: 'b2', tier: cgt });
        }

        // ── Aplicar CONTRA_GOLPE bônus no próximo hit (se ativo) ──
        if (b1._contraGolpeActive && b1._contraGolpeMult) {
          b1.vx *= b1._contraGolpeMult; b1.vy *= b1._contraGolpeMult;
          b1._contraGolpeActive = false; b1._contraGolpeMult = 1.0;
        }
        if (b2._contraGolpeActive && b2._contraGolpeMult) {
          b2.vx *= b2._contraGolpeMult; b2.vy *= b2._contraGolpeMult;
          b2._contraGolpeActive = false; b2._contraGolpeMult = 1.0;
        }

        // ── GUERRA_DE_ATRITO LEN: Absorção — 30% do dano recebido vira resistência ──
        if (b1._absorcaoCinetica) { b1.spinSpeed += damage1 * 0.02; b1.burstDamage = Math.max(0, b1.burstDamage - burstDamage1 * 0.30); }
        if (b2._absorcaoCinetica) { b2.spinSpeed += damage2 * 0.02; b2.burstDamage = Math.max(0, b2.burstDamage - burstDamage2 * 0.30); }

        // ── MURO VIVO (DEF 27): quando burst cruza 60, reseta para 30 + 8s escudo -50% ──
        if (b1.hasMuroVivo && b1._muroVivoAvailable && b1.burstDamage >= 60) {
          b1.burstDamage = 30;
          b1._muroVivoAvailable = false;
          b1._muroVivoShieldUntil = _simTime + 8000;
          addParticle(b1.x, b1.y, '#60a5fa', 50);
          addParticle(b1.x, b1.y, '#ffffff', 35);
          recordEvent('MURO_VIVO', { bey: 'b1', shieldDuration: 8 });
          addEvent('MURO_VIVO', `${bey1.name} - MURO VIVO!`, 'Burst resetado + escudo 8s');
        }
        if (b2.hasMuroVivo && b2._muroVivoAvailable && b2.burstDamage >= 60) {
          b2.burstDamage = 30;
          b2._muroVivoAvailable = false;
          b2._muroVivoShieldUntil = _simTime + 8000;
          addParticle(b2.x, b2.y, '#60a5fa', 50);
          addParticle(b2.x, b2.y, '#ffffff', 35);
          recordEvent('MURO_VIVO', { bey: 'b2', shieldDuration: 8 });
          addEvent('MURO_VIVO', `${bey2.name} - MURO VIVO!`, 'Burst resetado + escudo 8s');
        }

        // ── Aplicar escudo do Muro Vivo ao burst recebido ──
        if (b1._muroVivoShieldUntil && _simTime < b1._muroVivoShieldUntil) {
          b1.burstDamage = Math.max(0, b1.burstDamage - burstDamage1 * 0.50);
        }
        if (b2._muroVivoShieldUntil && _simTime < b2._muroVivoShieldUntil) {
          b2.burstDamage = Math.max(0, b2.burstDamage - burstDamage2 * 0.50);
        }
        
        // Record significant burst damage
        if (burstDamage1 > 8) {
          recordEvent('CRITICAL_BURST_DAMAGE', { bey: 'b1', damage: burstDamage1, total: b1.burstDamage });
        }
        if (burstDamage2 > 8) {
          recordEvent('CRITICAL_BURST_DAMAGE', { bey: 'b2', damage: burstDamage2, total: b2.burstDamage });
        }
        
        // Clamp stability
        b1.stability = Math.max(0, b1.stability);
        b2.stability = Math.max(0, b2.stability);
        
        if (damage1 > 8) addParticle(b1.x, b1.y, '#ff9900', 20);
        if (damage2 > 8) addParticle(b2.x, b2.y, '#ff9900', 20);
        
        b1.hits++;
        b2.hits++;
        b1.stats.hitsLanded++;
        b2.stats.hitsLanded++;
        b1.stats.damageCaused += damage2;
        b2.stats.damageCaused += damage1;
        
        // BLADE STORM (ATK 27+) - 30% chance de hit duplo (era 40%)
        if (b1.hasBladeStorm && Math.random() < 0.30) {
          b2.stamina -= damage2 * 0.5; // Meio dano no segundo hit
          b2.burstDamage += burstDamage2 * 0.5;
          addParticle(b2.x, b2.y, '#ff0000', 40);
          addParticle(b2.x, b2.y, '#ffff00', 30);
          recordEvent('BLADE_STORM', { attacker: 'b1', bonusDamage: damage2 * 0.5 });
        }
        if (b2.hasBladeStorm && Math.random() < 0.30) {
          b1.stamina -= damage1 * 0.5;
          b1.burstDamage += burstDamage1 * 0.5;
          addParticle(b1.x, b1.y, '#ff0000', 40);
          addParticle(b1.x, b1.y, '#ffff00', 30);
          recordEvent('BLADE_STORM', { attacker: 'b2', bonusDamage: damage1 * 0.5 });
        }

        // 🦹 MOMENTUM_THIEF - rouba momentum stacks (VORTEX_COLISEUM)
        if (arenaType === 'VORTEX_COLISEUM' && ARENA.momentum) {
          if (md3State?.team1?.mentality === 'MOMENTUM_THIEF' && ARENA.momentum.bey2Stacks > 0) {
            const stolen = Math.min(1, ARENA.momentum.bey2Stacks);
            ARENA.momentum.bey2Stacks = Math.max(0, ARENA.momentum.bey2Stacks - stolen);
            ARENA.momentum.bey1Stacks += stolen * 0.5;
            recordEvent('MOMENTUM_STEAL', { attacker: 'b1', stolen });
          }
          if (md3State?.team2?.mentality === 'MOMENTUM_THIEF' && ARENA.momentum.bey1Stacks > 0) {
            const stolen = Math.min(1, ARENA.momentum.bey1Stacks);
            ARENA.momentum.bey1Stacks = Math.max(0, ARENA.momentum.bey1Stacks - stolen);
            ARENA.momentum.bey2Stacks += stolen * 0.5;
            recordEvent('MOMENTUM_STEAL', { attacker: 'b2', stolen });
          }
        }
        const balanceResistance1 = (b1.bey?.effectiveStats?.bal || 10) / 20;
        const balanceResistance2 = (b2.bey?.effectiveStats?.bal || 10) / 20;
        
        // ═══════════════════════════════════════════════════════════════
        // 🆕 ON-HIT EFFECTS DAS NOVAS PARTS
        // ═══════════════════════════════════════════════════════════════
        function applyOnHitPartEffects(attacker, defender, dmgToDef, bdToDef) {
          const arm = attacker.bey?.armor;
          const lay = attacker.bey?.layer;
          const dis = attacker.bey?.disc;
          const drv = attacker.bey?.driver;

          if (lay?.special === 'spin_steal_boost') {
            const stolen = defender.spinSpeed * 0.04 * (1 + (lay.specialValue || 0.20));
            defender.spinSpeed = Math.max(0, defender.spinSpeed - stolen);
            attacker.spinSpeed += stolen * 0.4;
          }
          if (lay?.special === 'upward_force') {
            defender.burstDamage += bdToDef * (lay.specialValue || 0.30);
          }
          if (lay?.special === 'hit_absorption') {
            const maxAbs = lay.specialValue || 3;
            if (attacker.layerHitsAbsorbed < maxAbs) {
              attacker.layerHitsAbsorbed++;
              attacker.stamina = Math.min(250, attacker.stamina + dmgToDef * 0.6);
              recordEvent('TURTLE_SHELL_ABSORB', { remaining: maxAbs - attacker.layerHitsAbsorbed });
            }
          }
          if (lay?.special === 'double_hit') {
            if (Math.random() < (lay.specialValue || 0.10)) {
              defender.stamina -= dmgToDef * 0.6;
              defender.burstDamage += bdToDef * 0.5;
              recordEvent('DOUBLE_HIT', { attacker: attacker === b1 ? 'b1' : 'b2' });
            }
          }
          if (lay?.special === 'scaling_damage') {
            attacker.layerConsecutiveHits = (attacker.layerConsecutiveHits || 0) + 1;
            const scale = Math.min(attacker.layerConsecutiveHits * (lay.specialValue || 0.15), 1.5);
            defender.stamina -= dmgToDef * scale * 0.4;
            defender.burstDamage += bdToDef * scale * 0.3;
          }
          if (dis?.special === 'critical_boost') {
            if (Math.random() < (dis.specialValue || 0.15)) {
              defender.stamina -= dmgToDef * 0.5;
              defender.burstDamage += bdToDef * 0.8;
              recordEvent('PRECISION_CRIT', { attacker: attacker === b1 ? 'b1' : 'b2' });
            }
          }
          if (dis?.special === 'reactive_speed') {
            const defDis = defender.bey?.disc;
            if (defDis?.special === 'reactive_speed') {
              defender.vx *= (1 + (defDis.specialValue || 0.20));
              defender.vy *= (1 + (defDis.specialValue || 0.20));
            }
          }
          if (dis?.special === 'knockback_immunity') {
            const speed = Math.sqrt(attacker.vx ** 2 + attacker.vy ** 2);
            if (speed < (dis.specialValue || 3)) { attacker.vx *= 0.3; attacker.vy *= 0.3; }
          }
          if (drv?.special === 'damage_reflect') {
            defender.stamina -= dmgToDef * (drv.specialValue || 0.15);
          }
          if (drv?.special === 'last_stand') {
            if (attacker.stamina / 250 < (drv.specialThreshold || 0.20)) {
              const atkBoost = drv.specialValue || 1.0;
              defender.stamina -= dmgToDef * atkBoost * 0.5;
              defender.burstDamage += bdToDef * atkBoost * 0.5;
              recordEvent('LAST_STAND', { attacker: attacker === b1 ? 'b1' : 'b2' });
            }
          }
          if (arm?.effect === 'poison_sting') {
            defender.armorPoisonStacks = Math.min(arm.maxStacks || 4, (defender.armorPoisonStacks || 0) + 1);
            recordEvent('POISON_STACK', { target: defender === b1 ? 'b1' : 'b2', stacks: defender.armorPoisonStacks });
          }
          if (arm?.effect === 'ice_wall') {
            const defArm = defender.bey?.armor;
            if (defArm?.effect === 'ice_wall' && defender.armorIceWallReady) {
              defender.stamina = Math.min(250, defender.stamina + dmgToDef * 0.7);
              defender.armorIceWallReady = false;
              defender.armorIceWallLastUsed = _simTime;
              recordEvent('ICE_WALL_BLOCKED', { bey: defender === b1 ? 'b1' : 'b2' });
            }
          }
          if (arm?.effect === 'triple_strike') {
            if (Math.random() < (arm.procChance || 0.15)) {
              const extraHits = arm.extraHits || 2;
              defender.stamina -= dmgToDef * extraHits * 0.4;
              defender.burstDamage += bdToDef * extraHits * 0.3;
              recordEvent('TRIPLE_STRIKE', { attacker: attacker === b1 ? 'b1' : 'b2' });
            }
          }
          if (arm?.effect === 'spectrum_shift') {
            const element = arm.elements?.[attacker.armorCurrentElement || 0] || 'fire';
            switch (element) {
              case 'fire':      defender.stamina -= dmgToDef * 0.20; break;
              case 'ice':       defender.vx *= 0.75; defender.vy *= 0.75; break;
              case 'lightning': if (Math.random() < 0.15) defender.burstDamage += bdToDef * 0.5; break;
              case 'wind':      defender.vx *= 1.3; defender.vy *= 1.3; break;
            }
          }
          if (arm?.effect === 'web_trap') {
            const slowPct = arm.slowPercent || 0.20;
            defender.armorWebStacks = Math.min(arm.maxSlow || 0.60, (defender.armorWebStacks || 0) + slowPct);
            defender.vx *= (1 - (defender.armorWebStacks || 0) * 0.35);
            defender.vy *= (1 - (defender.armorWebStacks || 0) * 0.35);
          }
          if (arm?.effect === 'execute') {
            if (defender.stamina / 250 <= (arm.executeThreshold || 0.25)) {
              const execMult = (arm.executeMultiplier || 3.0) - 1;
              defender.stamina -= dmgToDef * execMult * 0.5;
              defender.burstDamage += bdToDef * execMult * 0.5;
              recordEvent('EXECUTE', { attacker: attacker === b1 ? 'b1' : 'b2' });
            }
          }
          if (arm?.effect === 'moon_phases' && arm.phases) {
            if (!attacker.armorMoonPhaseStart) attacker.armorMoonPhaseStart = _simTime;
            const phaseIdx = Math.floor(((_simTime - attacker.armorMoonPhaseStart) / (arm.cycleDuration || 20)) * arm.phases.length) % arm.phases.length;
            const atkDelta = ((arm.phases[phaseIdx]?.atkMod || 1.0) - 1);
            if (atkDelta > 0) defender.stamina -= dmgToDef * atkDelta * 0.4;
          }
          if (arm?.effect === 'precision_timing') {
            attacker.armorClockworkHits = (attacker.armorClockworkHits || 0) + 1;
            if (attacker.armorClockworkHits >= (arm.criticalEvery || 10)) {
              defender.stamina -= dmgToDef * 1.5;
              defender.burstDamage += bdToDef * 1.5;
              attacker.armorClockworkHits = 0;
              recordEvent('CLOCKWORK_CRIT', { attacker: attacker === b1 ? 'b1' : 'b2' });
            }
          }
        }

        applyOnHitPartEffects(b1, b2, damage1, burstDamage2);
        applyOnHitPartEffects(b2, b1, damage2, burstDamage1);

        // Base stability loss from impact force
        let stabilityLoss1 = force2 * 0.04 * (1 - Math.min((b1.bey?.effectiveStats?.bal || 10) * 0.02, 0.4));
        let stabilityLoss2 = force1 * 0.04 * (1 - Math.min((b2.bey?.effectiveStats?.bal || 10) * 0.02, 0.4));
        
        // High velocity impacts cause extra destabilization
        if (velocity1 > 7) stabilityLoss2 *= 1.6;
        if (velocity2 > 7) stabilityLoss1 *= 1.6;
        
        // Perfect Balance breakpoint reduces stability loss
        const hasPerfectBalance1 = b1.bey?.breakpoints?.some(bp => bp?.stat === 'BAL') || false;
        const hasPerfectBalance2 = b2.bey?.breakpoints?.some(bp => bp?.stat === 'BAL') || false;
        
        if (hasPerfectBalance1) stabilityLoss1 *= 0.3;
        if (hasPerfectBalance2) stabilityLoss2 *= 0.3;
        
        // GYRO LOCK (BAL 27+) - Estabilidade FIXA (não perde)
        if (b1.hasGyroLock) stabilityLoss1 = 0;
        if (b2.hasGyroLock) stabilityLoss2 = 0;
        
        // Apply stability loss and mark hit time for recovery system
        b1.stability -= stabilityLoss1;
        b2.stability -= stabilityLoss2;
        b1.lastHitTime = _simTime;
        b2.lastHitTime = _simTime;
        
        // Clamp to valid range (will be re-clamped against dynamic cap later)
        b1.stability = Math.max(0, b1.stability);
        b2.stability = Math.max(0, b2.stability);
      }
    }

    // Helper function to ensure finite values for gradients
    function ensureFinite(value, defaultValue = 0) {
      return (typeof value === 'number' && isFinite(value)) ? value : defaultValue;
    }
    
    function drawArmorVisual(ctx, b) {
      const armor = b.bey.armor;
      if (!armor) return;
      
      // Validate coordinates
      if (!isFinite(b.x) || !isFinite(b.y) || !isFinite(b.radius)) {
        return;
      }
      
      ctx.save();
      ctx.translate(b.x, b.y);
      
      const armorRadius = b.radius + 5;
      const time = _simTime * 0.001;
      
      switch(armor.visual) {
        case 'chains':
          // Rotating chains
          ctx.strokeStyle = armor.color;
          ctx.lineWidth = 2;
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i + time;
            ctx.beginPath();
            ctx.arc(0, 0, armorRadius, angle - 0.2, angle + 0.2);
            ctx.stroke();
          }
          break;
          
        case 'spikes':
          // Sharp spikes radiating outward
          ctx.strokeStyle = armor.color;
          ctx.lineWidth = 3;
          for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            const x1 = Math.cos(angle) * b.radius;
            const y1 = Math.sin(angle) * b.radius;
            const x2 = Math.cos(angle) * (armorRadius + 6);
            const y2 = Math.sin(angle) * (armorRadius + 6);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
          break;
          
        case 'ring':
          // Protective ring
          ctx.strokeStyle = armor.color;
          ctx.lineWidth = 4;
          ctx.globalAlpha = 0.6;
          ctx.beginPath();
          ctx.arc(0, 0, armorRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;
          
        case 'feather':
          // Light feather particles
          ctx.fillStyle = armor.color;
          ctx.globalAlpha = 0.4;
          for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i + time * 2;
            const x = Math.cos(angle) * armorRadius;
            const y = Math.sin(angle) * armorRadius;
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          break;
          
        case 'flames':
          // Fire aura
          ctx.fillStyle = armor.color;
          ctx.globalAlpha = 0.5;
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i + time * 3;
            const flameSize = 3 + Math.sin(time * 5 + i) * 2;
            const x = Math.cos(angle) * armorRadius;
            const y = Math.sin(angle) * armorRadius;
            ctx.beginPath();
            ctx.arc(x, y, flameSize, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          break;
          
        case 'ice':
          // Ice crystals
          ctx.strokeStyle = armor.color;
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.7;
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i;
            const x = Math.cos(angle) * armorRadius;
            const y = Math.sin(angle) * armorRadius;
            ctx.beginPath();
            ctx.moveTo(x - 3, y);
            ctx.lineTo(x + 3, y);
            ctx.moveTo(x, y - 3);
            ctx.lineTo(x, y + 3);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          break;
          
        case 'lightning':
          // Electric arcs
          ctx.strokeStyle = armor.color;
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.8;
          for (let i = 0; i < 4; i++) {
            const angle = (Math.PI * 2 / 4) * i + time * 4;
            const x1 = Math.cos(angle) * b.radius;
            const y1 = Math.sin(angle) * b.radius;
            const x2 = Math.cos(angle + 0.5) * armorRadius;
            const y2 = Math.sin(angle + 0.5) * armorRadius;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          break;
          
                  case 'shadow':
          // Dark aura
          const shadowGrad = ctx.createRadialGradient(0, 0, ensureFinite(b.radius), 0, 0, ensureFinite(armorRadius + 8));
          shadowGrad.addColorStop(0, 'transparent');
          shadowGrad.addColorStop(1, armor.color + '60');
          ctx.fillStyle = shadowGrad;
          ctx.beginPath();
          ctx.arc(0, 0, ensureFinite(armorRadius + 8), 0, Math.PI * 2);
          ctx.fill();
          break;
          
        case 'gravity':
          // Gravity waves
          ctx.strokeStyle = armor.color;
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.3;
          for (let r = 0; r < 3; r++) {
            const radius = armorRadius + r * 6 + Math.sin(time * 2 + r) * 2;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          break;
          
        case 'vortex':
          // Swirling wind
          ctx.strokeStyle = armor.color;
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.5;
          for (let i = 0; i < 3; i++) {
            const startAngle = time * 3 + (Math.PI * 2 / 3) * i;
            ctx.beginPath();
            ctx.arc(0, 0, armorRadius, startAngle, startAngle + 1);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          break;
          
        case 'magnet':
          // North/South poles
          ctx.fillStyle = '#ff0000';
          ctx.beginPath();
          ctx.arc(0, -armorRadius, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#0000ff';
          ctx.beginPath();
          ctx.arc(0, armorRadius, 4, 0, Math.PI * 2);
          ctx.fill();
          break;
          
        case 'blades':
          // Spinning blades
          ctx.strokeStyle = armor.color;
          ctx.lineWidth = 3;
          for (let i = 0; i < 4; i++) {
            const angle = (Math.PI * 2 / 4) * i + time * 5;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * (armorRadius + 8), Math.sin(angle) * (armorRadius + 8));
            ctx.stroke();
          }
          break;
          
        case 'rubber':
          // Rubber dots
          ctx.fillStyle = armor.color;
          for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 / 12) * i;
            const x = Math.cos(angle) * armorRadius;
            const y = Math.sin(angle) * armorRadius;
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
          
        case 'crystal':
          // Crystalline structure
          ctx.strokeStyle = armor.color;
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.6;
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * armorRadius, Math.sin(angle) * armorRadius);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          break;
          
        case 'void':
          // Void distortion
          ctx.strokeStyle = armor.color;
          ctx.lineWidth = 3;
          ctx.globalAlpha = 0.4;
          const voidRadius = armorRadius + Math.sin(time * 4) * 3;
          ctx.beginPath();
          ctx.arc(0, 0, voidRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;
          
        case 'solar':
          // Sun rays
          ctx.strokeStyle = armor.color;
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.7;
          for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 / 12) * i + time;
            const length = 4 + Math.sin(time * 3 + i) * 2;
            const x1 = Math.cos(angle) * armorRadius;
            const y1 = Math.sin(angle) * armorRadius;
            const x2 = Math.cos(angle) * (armorRadius + length);
            const y2 = Math.sin(angle) * (armorRadius + length);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          break;
          
        case 'orbital':
          // Orbiting particles
          ctx.fillStyle = armor.color;
          for (let i = 0; i < 3; i++) {
            const angle = time * 2 + (Math.PI * 2 / 3) * i;
            const x = Math.cos(angle) * armorRadius;
            const y = Math.sin(angle) * armorRadius;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
          
        case 'fangs':
          // Beast fangs
          ctx.strokeStyle = armor.color;
          ctx.lineWidth = 3;
          for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            const x1 = Math.cos(angle) * armorRadius;
            const y1 = Math.sin(angle) * armorRadius;
            const x2 = Math.cos(angle) * (armorRadius + 5);
            const y2 = Math.sin(angle) * (armorRadius + 5);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
          break;
          
        case 'quantum':
          // Quantum flicker
          ctx.strokeStyle = armor.color;
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.3 + Math.sin(time * 10) * 0.3;
          ctx.beginPath();
          ctx.arc(0, 0, armorRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;
          
        case 'scales':
          // Dragon scales
          ctx.fillStyle = armor.color;
          ctx.globalAlpha = 0.7;
          for (let layer = 0; layer < 2; layer++) {
            for (let i = 0; i < 8; i++) {
              const angle = (Math.PI * 2 / 8) * i + layer * 0.2;
              const x = Math.cos(angle) * (armorRadius - layer * 3);
              const y = Math.sin(angle) * (armorRadius - layer * 3);
              ctx.beginPath();
              ctx.arc(x, y, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          ctx.globalAlpha = 1;
          break;
      }
      
      ctx.restore();
    }


    // ════════════════════════════════════════════════════════════════
    // SISTEMA DE MOTION TRAILS (FASE 1)
    // ════════════════════════════════════════════════════════════════
    const b1Trail = [];
    const b2Trail = [];

    // Função para atualizar trail
    function updateTrail(beyblade, trail, maxLength = 8) {
      if (!beyblade || !beyblade.alive) {
        trail.length = 0;
        return;
      }
      
      const velocity = Math.sqrt(beyblade.vx ** 2 + beyblade.vy ** 2);
      const spinPercent = beyblade.spinSpeed / (beyblade.stats?.maxSpin || 100);
      
      // Apenas criar trail em alta velocidade ou alto spin
      if (velocity > 3 || spinPercent > 0.7) {
        trail.push({
          x: beyblade.x,
          y: beyblade.y,
          rotation: beyblade.rotation,
          radius: beyblade.radius,
          alpha: 1,
          time: _simTime
        });
        
        // Limitar tamanho do trail
        if (trail.length > maxLength) {
          trail.shift();
        }
      } else {
        // Limpar trail quando parado
        if (velocity < 1) {
          trail.length = 0;
        }
      }
      
      // Fade out trails antigos
      const now = _simTime;
      for (let i = trail.length - 1; i >= 0; i--) {
        const age = (now - trail[i].time) / 1000;
        if (age >= 0.5) {
          trail.splice(i, 1);
        }
      }
    }

    // Função para desenhar trail
    function drawTrail(trail, color, teamColors) {
      if (!trail || trail.length < 2) return;
      
      const now = _simTime;
      
      trail.forEach((pos, index) => {
        const age = (now - pos.time) / 1000;
        const maxAge = 0.5;
        const lifePercent = 1 - (age / maxAge);
        
        // Alpha decresce com a idade E com a posição no array
        const positionAlpha = (index / trail.length);
        const alpha = positionAlpha * lifePercent * 0.4;
        
        if (alpha <= 0) return;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(pos.x, pos.y);
        ctx.rotate(pos.rotation);
        
        // Desenhar versão simplificada do beyblade
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, pos.radius);
        gradient.addColorStop(0, teamColors?.[0] || color || '#3b82f6');
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, pos.radius * 1.2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      });
      
      ctx.globalAlpha = 1;
    }

    // ════════════════════════════════════════════════════════════════
    // SCREEN SHAKE & FLASH FUNCTIONS (FASE 1)
    // ════════════════════════════════════════════════════════════════
    let screenShake = { x: 0, y: 0, intensity: 0 };
    let flashEffect = { active: false, color: '#ffffff', alpha: 0 };

    function addScreenShake(intensity = 1) {
      const shakeX = (Math.random() - 0.5) * intensity * 8;
      const shakeY = (Math.random() - 0.5) * intensity * 8;
      
      screenShake = { x: shakeX, y: shakeY, intensity };
      
      // Decay do shake
      setTimeout(() => {
        screenShake = { x: 0, y: 0, intensity: 0 };
      }, 100);
    }

    function addFlashEffect(color = '#ffffff', intensity = 0.6, duration = 150) {
      flashEffect = { active: true, color, alpha: intensity };
      
      setTimeout(() => {
        flashEffect = { active: false, color: '#ffffff', alpha: 0 };
      }, duration);
    }

    // ════════════════════════════════════════════════════════════════
    // FUNÇÕES DE DESENHO DAS CAMADAS - SISTEMA 3 CAMADAS
    // ════════════════════════════════════════════════════════════════
    
    function drawLayer(ctx, b, colors, type) {
      const radius = b.radius;
      
      switch(type) {
        case 'Attack':
          drawAttackLayer(ctx, radius, colors);
          break;
          
        case 'Defense':
          drawDefenseLayer(ctx, radius, colors);
          break;
          
        case 'Stamina':
          drawStaminaLayer(ctx, radius, colors);
          break;
          
        case 'Balance':
          drawBalanceLayer(ctx, radius, colors);
          break;
          
        default:
          drawBalanceLayer(ctx, radius, colors);
      }
    }
    
    function drawAttackLayer(ctx, radius, colors) {
      // Design agressivo com lâminas pontiagudas
      const bladeCount = 5;
      
      // Base circular
      ctx.fillStyle = colors[0];
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.85, 0, Math.PI * 2);
      ctx.fill();
      
      // Lâminas agressivas
      ctx.fillStyle = colors[0];
      ctx.strokeStyle = colors[1] || '#ffffff';
      ctx.lineWidth = 1.5;
      
      for (let i = 0; i < bladeCount; i++) {
        const angle = (Math.PI * 2 / bladeCount) * i;
        
        ctx.save();
        ctx.rotate(angle);
        
        // Lâmina triangular afiada
        ctx.beginPath();
        ctx.moveTo(radius * 0.4, 0);
        ctx.lineTo(radius * 0.3, -radius * 0.2);
        ctx.lineTo(radius, -radius * 0.1);
        ctx.lineTo(radius * 1.05, 0);
        ctx.lineTo(radius, radius * 0.1);
        ctx.lineTo(radius * 0.3, radius * 0.2);
        ctx.closePath();
        
        ctx.fill();
        ctx.stroke();
        
        // Detalhe da lâmina
        ctx.strokeStyle = colors[2] || colors[1];
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(radius * 0.5, 0);
        ctx.lineTo(radius * 0.95, 0);
        ctx.stroke();
        
        ctx.restore();
      }
      
      // Anel central de reforço
      ctx.strokeStyle = colors[1];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.4, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    function drawDefenseLayer(ctx, radius, colors) {
      // Design circular sólido com escudo
      
      // Base sólida
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      gradient.addColorStop(0, colors[0]);
      gradient.addColorStop(0.7, colors[0]);
      gradient.addColorStop(1, colors[1] || '#ffffff');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = colors[1] || '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Anéis de reforço concêntricos
      const ringCount = 4;
      for (let i = 1; i <= ringCount; i++) {
        const ringRadius = radius * (i / (ringCount + 1));
        ctx.strokeStyle = i % 2 === 0 ? colors[2] || colors[1] : colors[1];
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      
      // Padrão hexagonal de reforço
      const hexCount = 6;
      for (let i = 0; i < hexCount; i++) {
        const angle = (Math.PI * 2 / hexCount) * i;
        const x = Math.cos(angle) * radius * 0.65;
        const y = Math.sin(angle) * radius * 0.65;
        
        ctx.fillStyle = colors[2] || colors[0];
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = colors[1];
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    
    function drawStaminaLayer(ctx, radius, colors) {
      // Design aerodinâmico suave
      
      // Base circular lisa
      ctx.fillStyle = colors[0];
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Borda suave
      ctx.strokeStyle = colors[1] || '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Padrão de círculos aerodinâmicos
      const circleCount = 8;
      for (let i = 0; i < circleCount; i++) {
        const angle = (Math.PI * 2 / circleCount) * i;
        const distance = radius * 0.7;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        
        // Círculo pequeno
        ctx.fillStyle = colors[1] || '#ffffff';
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Anel ao redor
        ctx.strokeStyle = colors[2] || colors[1];
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      
      // Espirais suaves
      ctx.strokeStyle = colors[2] || colors[1];
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.4;
      
      for (let i = 0; i < 3; i++) {
        const startAngle = (Math.PI * 2 / 3) * i;
        const spiralRadius = radius * 0.85;
        
        ctx.beginPath();
        for (let t = 0; t <= 1; t += 0.1) {
          const angle = startAngle + t * Math.PI * 0.5;
          const r = spiralRadius * (1 - t * 0.3);
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          
          if (t === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    
    function drawBalanceLayer(ctx, radius, colors) {
      // Design híbrido
      
      // Base com gradiente
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      gradient.addColorStop(0, colors[0]);
      gradient.addColorStop(0.6, colors[0]);
      gradient.addColorStop(1, colors[1] || '#ffffff');
      
      ctx.fillStyle = gradient;
      
      // Forma hexagonal irregular
      ctx.beginPath();
      const points = 6;
      for (let i = 0; i < points; i++) {
        const angle = (Math.PI * 2 / points) * i;
        const r = i % 2 === 0 ? radius : radius * 0.85;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      
      ctx.strokeStyle = colors[1] || '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Detalhes mistos
      for (let i = 0; i < points; i++) {
        const angle = (Math.PI * 2 / points) * i;
        
        // Mini lâmina
        if (i % 2 === 0) {
          ctx.save();
          ctx.rotate(angle);
          
          ctx.fillStyle = colors[2] || colors[0];
          ctx.beginPath();
          ctx.moveTo(radius * 0.6, -5);
          ctx.lineTo(radius * 0.9, 0);
          ctx.lineTo(radius * 0.6, 5);
          ctx.closePath();
          ctx.fill();
          
          ctx.restore();
        }
        // Círculo de reforço
        else {
          const x = Math.cos(angle) * radius * 0.7;
          const y = Math.sin(angle) * radius * 0.7;
          
          ctx.fillStyle = colors[1] || '#ffffff';
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    
    function drawDisc(ctx, b, colors) {
      const radius = b.radius;
      
      // Disco central com padrão
      const discGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.6);
      discGradient.addColorStop(0, colors[1] || '#ffffff');
      discGradient.addColorStop(0.5, colors[0]);
      discGradient.addColorStop(1, colors[1] || '#ffffff');
      
      ctx.fillStyle = discGradient;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.55, 0, Math.PI * 2);
      ctx.fill();
      
      // Borda do disco
      ctx.strokeStyle = colors[2] || colors[1];
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Padrão interno (6 segmentos)
      ctx.strokeStyle = colors[2] || colors[1];
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.6;
      
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 / 6) * i;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * radius * 0.5, Math.sin(angle) * radius * 0.5);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    
    function drawDriver(ctx, b, colors) {
      const radius = b.radius;
      
      // Ponta do driver
      const driverGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.3);
      driverGradient.addColorStop(0, colors[2] || '#cccccc');
      driverGradient.addColorStop(1, colors[0]);
      
      ctx.fillStyle = driverGradient;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.25, 0, Math.PI * 2);
      ctx.fill();
      
      // Borda da ponta
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
      
      // Mini anel ao redor
      ctx.strokeStyle = colors[2] || colors[1];
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.28, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    function drawBey(b) {
      if (!b || !b.alive) {
        // Se caiu de lado, desenhar no chão
        if (b && b.fellOver) {
          ctx.save();
          ctx.translate(b.x, b.y);
          
          // Desenhar deitado de lado
          ctx.rotate(b.tippingSide * Math.PI / 2);
          ctx.globalAlpha = 0.7;
          
          const teamColors = b.bey?.colors || [b.color || '#3b82f6', '#ffffff', '#cccccc'];
          
          // Corpo do beyblade deitado
          ctx.fillStyle = teamColors[0];
          ctx.beginPath();
          ctx.ellipse(0, 0, b.radius, b.radius * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.strokeStyle = teamColors[1] || '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          ctx.restore();
          ctx.globalAlpha = 1;
        }
        return;
      }
      
      if (isNaN(b.x) || isNaN(b.y) || !isFinite(b.x) || !isFinite(b.y)) {
        b.x = centerX;
        b.y = centerY;
        b.vx = 0;
        b.vy = 0;
      }
      
      const currentSpinPercent = (b.spinSpeed / (b.stats?.maxSpin || 100));
      
      // SPIN FINISH ANIMATION - Progressive tipping
      if (currentSpinPercent < 0.15 && !b.isTipping && !b.fellOver) {
        b.isTipping = true;
      }
      
      if (b.isTipping && !b.fellOver) {
        // Gradualmente inclinar - VELOCIDADE AUMENTADA para queda mais rápida
        const tippingSpeed = 0.04; // Aumentado de 0.015 para 0.04 (quase 3x mais rápido)
        b.tippingAngle += tippingSpeed;
        
        // Reduzir movimento enquanto caindo
        b.vx *= 0.90;
        b.vy *= 0.90;
        b.spinSpeed *= 0.95; // Perder spin mais rápido enquanto caindo
        
        // Quando atingir ~90 graus, está completamente deitado
        if (b.tippingAngle >= Math.PI / 2) {
          b.tippingAngle = Math.PI / 2;
          b.fellOver = true;
          // Note: alive status will be determined by post-physics check
          
          // Visual feedback de queda
          addDebrisParticles(b.x, b.y, b.color, 12);
          addSmokeParticles(b.x, b.y, 8);
          
          recordEvent('FELL_OVER', {
            bey: b === b1 ? 'b1' : 'b2',
            time: _simTime
          });
        }
      }
      
      if (currentSpinPercent > 0.6) {
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = b.bey?.colors?.[0] || b.color || '#3b82f6';
        for (let i = 0; i < 3; i++) {
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(b.rotation - (i * 0.3 * b.spinDirection));
          ctx.beginPath();
          ctx.arc(0, 0, b.radius * 1.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }
      
      ctx.save();
      ctx.translate(b.x, b.y);
      
      // Apply tipping transformation
      if (b.tippingAngle > 0) {
        // Criar efeito 3D de inclinação
        const scaleY = Math.cos(b.tippingAngle);
        ctx.scale(1, scaleY);
        
        // Adicionar wobble quando está caindo
        const wobbleAmount = b.tippingAngle * 2;
        const wobbleX = Math.sin(_simTime * 0.01) * wobbleAmount;
        const wobbleY = Math.cos(_simTime * 0.01) * wobbleAmount;
        ctx.translate(wobbleX, wobbleY);
      }
      
      ctx.rotate(b.rotation);
      
      // ════════════════════════════════════════════════════════════════
      // DESENHO DO BEYBLADE - SISTEMA DE 3 CAMADAS
      // ════════════════════════════════════════════════════════════════
      
      // currentSpinPercent já foi declarado anteriormente (linha 3256)
      const teamColors = b.bey?.colors || [b.color || '#3b82f6', '#ffffff', '#cccccc'];
      const beyType = b.bey?.type || 'Balance';
      
      // ──────────────────────────────────────────────────────
      // GLOW AURA em alta velocidade (CAMADA 0 - MAIS BAIXA)
      // ──────────────────────────────────────────────────────
      if (currentSpinPercent > 0.6) {
        const glowIntensity = (currentSpinPercent - 0.6) / 0.4;
        const glowRadius = b.radius * (1.3 + glowIntensity * 0.3);
        
        ctx.save();
        ctx.globalAlpha = glowIntensity * 0.4;
        ctx.shadowBlur = 25;
        ctx.shadowColor = teamColors[0];
        
        const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
        glowGradient.addColorStop(0, teamColors[0]);
        glowGradient.addColorStop(0.5, teamColors[0] + '80');
        glowGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      }
      
      // ──────────────────────────────────────────────────────
      // TORNADO RIDGE INDICATOR (BB-10 only)
      // ──────────────────────────────────────────────────────
      if (b.inTornadoRidge && currentSpinPercent > 0.4) {
        ctx.save();
        ctx.globalAlpha = 0.6 + Math.sin(_simTime * 0.008) * 0.2;
        ctx.strokeStyle = '#ffa500';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffa500';
        ctx.beginPath();
        ctx.arc(0, 0, b.radius * 1.4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      
      // ──────────────────────────────────────────────────────
      // CAMADA 1: DRIVER (base/ponta)
      // ──────────────────────────────────────────────────────
      drawDriver(ctx, b, teamColors);
      
      // ──────────────────────────────────────────────────────
      // CAMADA 2: DISC (meio)
      // ──────────────────────────────────────────────────────
      drawDisc(ctx, b, teamColors);
      
      // ──────────────────────────────────────────────────────
      // CAMADA 3: LAYER (topo - design por tipo)
      // ──────────────────────────────────────────────────────
      drawLayer(ctx, b, teamColors, beyType);
      
      // ──────────────────────────────────────────────────────
      // ROTATION INDICATOR RING
      // ──────────────────────────────────────────────────────
      ctx.strokeStyle = (b.bey?.rotation === 'Left') ? '#00ffff' : '#ffaa00';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, b.radius + 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      
      // ──────────────────────────────────────────────────────
      // CENTER ICON ou TEXT
      // ──────────────────────────────────────────────────────
      const customIcon = b === b1 ? null : null;
      if (customIcon && customIcon.complete) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(customIcon, -10, -10, 20, 20);
        ctx.restore();
      } else {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 2;
        const beyName = b.bey?.name || 'BEY';
        ctx.fillText(beyName.substring(0, 3).toUpperCase(), 0, 0);
        ctx.shadowBlur = 0;
      }
      
      ctx.restore();
      
      // Draw ARMOR visual effect OVER the beyblade
      if (b.bey?.armor) {
        drawArmorVisual(ctx, b);
      }
      
      const staminaColor = b.stamina > 125 ? '#10B981' : b.stamina > 50 ? '#F59E0B' : '#EF4444';
      // Background shadow for readability
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(b.x - 34, b.y - 52, 68, 34);
      
      // STAMINA bar (biggest)
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(b.x - 32, b.y - 50, 64, 8);
      ctx.fillStyle = staminaColor;
      ctx.fillRect(b.x - 32, b.y - 50, (b.stamina / 250) * 64, 8);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(b.x - 32, b.y - 50, 64, 8);
      
      // TIPPING WARNING
      if (b.isTipping && !b.fellOver) {
        ctx.save();
        ctx.globalAlpha = 0.5 + Math.sin(_simTime * 0.01) * 0.3;
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CAINDO!', b.x, b.y - 50);
        ctx.restore();
      }
      
      // Burst damage bar
      const burstThreshold = 100 - ((b.bey?.effectiveStats?.bal || 10) * 2);
      const burstPercent = Math.min(1, b.burstDamage / burstThreshold);
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(b.x - 32, b.y - 40, 64, 6);
      const burstColor = burstPercent > 0.7 ? '#ff0000' : burstPercent > 0.4 ? '#ff9900' : '#ffff00';
      ctx.fillStyle = burstColor;
      ctx.fillRect(b.x - 32, b.y - 40, burstPercent * 64, 6);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(b.x - 32, b.y - 40, 64, 6);
      
      // Spin speed bar
      const spinColor = currentSpinPercent > 0.6 ? '#06B6D4' : currentSpinPercent > 0.3 ? '#F59E0B' : '#EF4444';
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(b.x - 32, b.y - 32, 64, 5);
      ctx.fillStyle = spinColor;
      ctx.fillRect(b.x - 32, b.y - 32, currentSpinPercent * 64, 5);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(b.x - 32, b.y - 32, 64, 5);
      
      // Stability bar
      const stabilityPercent = Math.max(0, b.stability / 150);
      const stabilityColor = stabilityPercent > 0.6 ? '#8b5cf6' : stabilityPercent > 0.3 ? '#f59e0b' : '#ef4444';
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(b.x - 32, b.y - 25, 64, 5);
      ctx.fillStyle = stabilityColor;
      ctx.fillRect(b.x - 32, b.y - 25, stabilityPercent * 64, 5);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(b.x - 32, b.y - 25, 64, 5);
      
      // Bey name label (bigger, above bars)
      const beyLabel = b.bey?.name ? b.bey.name.substring(0, 8).toUpperCase() : 'BEY';
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(b.x - 32, b.y - 62, 64, 12);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(beyLabel, b.x, b.y - 53);
    }

    // ════════════════════════════════════════════════════════════════
    // SISTEMA DE ILUMINAÇÃO PSEUDO-3D
    // ════════════════════════════════════════════════════════════════
    
    function drawBeyShadow(b) {
      if (!b || !b.alive || b.fellOver) return;
      
      const shadowOffset = 6;
      const shadowBlur = 10;
      const shadowAlpha = 0.5;
      
      ctx.save();
      ctx.globalAlpha = shadowAlpha;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = shadowBlur;
      ctx.shadowOffsetX = shadowOffset;
      ctx.shadowOffsetY = shadowOffset;
      
      // Sombra elíptica (mais realista)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, b.radius * 0.95, b.radius * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    }
    
    function drawArenaLighting() {
      // Iluminação superior (como se tivesse luz de cima)
      const lightGradient = ctx.createRadialGradient(
        centerX, centerY - 80, 0,
        centerX, centerY, 280
      );
      lightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
      lightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
      lightGradient.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
      
      ctx.fillStyle = lightGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Vinheta nas bordas
      const vignetteGradient = ctx.createRadialGradient(
        centerX, centerY, 150,
        centerX, centerY, 350
      );
      vignetteGradient.addColorStop(0, 'transparent');
      vignetteGradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
      
      ctx.fillStyle = vignetteGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    function drawArena() {
      if (arenaType === 'COLOSSEUM_CARNAGE') {
        drawColosseumCarnage();
      } else if (arenaType === 'NEXUS') {
        drawOctagonalArena();
      } else if (arenaType === 'VOLCANIC_RAGE') {
        drawIronCrucible();
      } else if (arenaType === 'PANGEA_PLATFORM') {
        drawPangeaPlatform();
      } else if (arenaType === 'KILLER_SIDES') {
        drawKillerSidesArena();
      } else if (arenaType === 'PINBALL_INFERNO') {
        drawPinballInferno();
      } else if (arenaType === 'VORTEX_COLISEUM') {
        drawVortexColiseum();
      } else {
        drawCircularArena();
      }
      
      // Debug log para verificar qual arena está sendo renderizada
      if (Math.random() < 0.01) { // Log a cada ~100 frames
        console.log('🏟️ Arena atual:', arenaType, '| Round:', md3State?.currentRound);
      }
    }
    

    // ════════════════════════════════════════════════════════════════
    // IRON CRUCIBLE: LAVA FLOW HELPER FUNCTIONS  
    // ════════════════════════════════════════════════════════════════
    
    function generateLavaFlowPattern(currentTime) {
      const patterns = [];
      const patternTypes = [
        'horizontal', 'vertical', 'diagonal45', 'diagonal135',
        'spiral_out_cw', 'spiral_out_ccw', 'spiral_in',
        'arc90', 'arc180', 'snake', 'semicircle',
        'wave_h', 'wave_v', 'spiral_double',
        'radial4', 'radial6', 'radial8',
        'ring', 'ring_double', 'ring_pulse',
        'grid', 'logarithmic', 'flower', 'chaos'
      ];
      
      if (Math.random() < 0.01) {
        return [{ type: 'global', createdAt: Date.now() * 0.001, lifetime: 5.0, points: [] }];
      }
      
      const flowCount = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < flowCount; i++) {
        const type = patternTypes[Math.floor(Math.random() * patternTypes.length)];
        patterns.push({
          type: type,
          createdAt: Date.now() * 0.001,
          lifetime: 5.0,
          points: generateFlowPoints(type),
          width: 15 + Math.random() * 25
        });
      }
      
      return patterns;
    }
    
    function generateFlowPoints(type) {
      const points = [];

      switch(type) {
        case 'horizontal': {
          const y = (Math.random() - 0.5) * 280;
          for (let x = -200; x <= 200; x += 8) points.push({ x, y });
          break;
        }
        case 'vertical': {
          const x = (Math.random() - 0.5) * 280;
          for (let y = -200; y <= 200; y += 8) points.push({ x, y });
          break;
        }
        case 'diagonal45': {
          for (let t = -260; t <= 260; t += 8) points.push({ x: t, y: t });
          break;
        }
        case 'diagonal135': {
          for (let t = -260; t <= 260; t += 8) points.push({ x: t, y: -t });
          break;
        }
        case 'spiral_out_cw': {
          for (let t = 0; t < 6 * Math.PI; t += 0.15) {
            const r = t * 10; if (r > 210) break;
            points.push({ x: Math.cos(t) * r, y: Math.sin(t) * r });
          }
          break;
        }
        case 'spiral_out_ccw': {
          for (let t = 0; t < 6 * Math.PI; t += 0.15) {
            const r = t * 10; if (r > 210) break;
            points.push({ x: Math.cos(-t) * r, y: Math.sin(-t) * r });
          }
          break;
        }
        case 'spiral_in': {
          for (let t = 0; t < 6 * Math.PI; t += 0.15) {
            const r = 200 - t * 10; if (r < 5) break;
            points.push({ x: Math.cos(t) * r, y: Math.sin(t) * r });
          }
          break;
        }
        case 'arc90': {
          const startA = Math.random() * Math.PI * 2;
          const r = 80 + Math.random() * 100;
          for (let a = startA; a < startA + Math.PI / 2; a += 0.08)
            points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
          break;
        }
        case 'arc180': {
          const startA = Math.random() * Math.PI * 2;
          const r = 80 + Math.random() * 100;
          for (let a = startA; a < startA + Math.PI; a += 0.08)
            points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
          break;
        }
        case 'snake': {
          for (let x = -200; x <= 200; x += 8)
            points.push({ x, y: Math.sin(x * 0.05) * 80 });
          break;
        }
        case 'semicircle': {
          const startA = Math.random() * Math.PI * 2;
          const r = 100 + Math.random() * 80;
          for (let a = startA; a < startA + Math.PI; a += 0.08)
            points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
          break;
        }
        case 'wave_h': {
          for (let x = -200; x <= 200; x += 6)
            points.push({ x, y: Math.sin(x * 0.08) * 60 });
          break;
        }
        case 'wave_v': {
          for (let y = -200; y <= 200; y += 6)
            points.push({ x: Math.sin(y * 0.08) * 60, y });
          break;
        }
        case 'spiral_double': {
          for (let t = 0; t < 5 * Math.PI; t += 0.15) {
            const r = t * 10; if (r > 210) break;
            points.push({ x: Math.cos(t) * r,  y: Math.sin(t) * r });
            points.push({ x: Math.cos(t + Math.PI) * r, y: Math.sin(t + Math.PI) * r });
          }
          break;
        }
        case 'radial4': {
          [0,1,2,3].forEach(i => {
            const a = (Math.PI / 2) * i;
            for (let r = 0; r <= 200; r += 8) points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
          });
          break;
        }
        case 'radial6': {
          for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i;
            for (let r = 0; r <= 200; r += 8) points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
          }
          break;
        }
        case 'radial8': {
          for (let i = 0; i < 8; i++) {
            const a = (Math.PI / 4) * i;
            for (let r = 0; r <= 200; r += 8) points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
          }
          break;
        }
        case 'ring': {
          const rRing = 80 + Math.random() * 80;
          for (let a = 0; a < Math.PI * 2; a += 0.1)
            points.push({ x: Math.cos(a) * rRing, y: Math.sin(a) * rRing });
          break;
        }
        case 'ring_double': {
          [90, 155].forEach(rR => {
            for (let a = 0; a < Math.PI * 2; a += 0.1)
              points.push({ x: Math.cos(a) * rR, y: Math.sin(a) * rR });
          });
          break;
        }
        case 'ring_pulse': {
          const rBase = 100 + Math.random() * 60;
          for (let a = 0; a < Math.PI * 2; a += 0.08) {
            const rP = rBase + Math.sin(a * 6) * 20;
            points.push({ x: Math.cos(a) * rP, y: Math.sin(a) * rP });
          }
          break;
        }
        case 'grid': {
          [-80,0,80].forEach(gx => { for (let gy=-180; gy<=180; gy+=8) points.push({x:gx,y:gy}); });
          [-80,0,80].forEach(gy => { for (let gx=-180; gx<=180; gx+=8) points.push({x:gx,y:gy}); });
          break;
        }
        case 'logarithmic': {
          for (let t = 0.1; t < 7; t += 0.1) {
            const r = Math.exp(t * 0.5) * 8; if (r > 210) break;
            points.push({ x: Math.cos(t * 2) * r, y: Math.sin(t * 2) * r });
          }
          break;
        }
        case 'flower': {
          for (let a = 0; a < Math.PI * 2; a += 0.05) {
            const r = 100 * Math.abs(Math.cos(3 * a));
            points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
          }
          break;
        }
        case 'chaos': {
          for (let i = 0; i < 12; i++) {
            const cx2 = (Math.random() - 0.5) * 320;
            const cy2 = (Math.random() - 0.5) * 320;
            const cLen = 30 + Math.random() * 60;
            const cAngle = Math.random() * Math.PI * 2;
            for (let j = 0; j < cLen; j += 8)
              points.push({ x: cx2 + Math.cos(cAngle) * j, y: cy2 + Math.sin(cAngle) * j });
          }
          break;
        }
        default: {
          for (let a = 0; a < Math.PI * 2; a += 0.1)
            points.push({ x: Math.cos(a) * 100, y: Math.sin(a) * 100 });
        }
      }

      return points;
    }
    
    function isOnLavaFlow(bladeX, bladeY, flows, centerX, centerY) {
      for (const flow of flows) {
        if (flow.type === 'global') return true;
        
        for (const point of flow.points) {
          const flowX = centerX + point.x;
          const flowY = centerY + point.y;
          const dist = Math.sqrt((bladeX - flowX) ** 2 + (bladeY - flowY) ** 2);
          
          if (dist < flow.width / 2) return true;
        }
      }
      return false;
    }

        function handleIronCruciblePhysics(b, bSpinPercent, velocity) {
      // ── VOLCANIC RAGE v3 — HeadlessBattle sync ───────────────────
      const distToCenter = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
      const zones = ARENA.zones;
      const currentBattleTime = (_simTime - battleStartTimeRef) / 1000;

      // ── INIT ──────────────────────────────────────────────────────
      if (!ARENA._volcanoInit) {
        ARENA._volcanoInit          = true;
        ARENA.heatSystem.level      = 0;
        ARENA.eruptionEvent.active  = false;
        ARENA.eruptionEvent.startTime = 0;
        ARENA.fissureSystem.open    = false;
        ARENA.fissureSystem.baseAngle = 0;
        ARENA._lavaBombs            = [];
      }

      const hs = ARENA.heatSystem;
      const er = ARENA.eruptionEvent;
      const fs = ARENA.fissureSystem;
      const rivers = ARENA.lavaRivers;

      // ── ÂNGULOS DINÂMICOS ──────────────────────────────────────────
      const riverAngle = currentBattleTime * rivers.rotationSpeed;
      if (fs.open) fs.baseAngle = currentBattleTime * fs.rotationSpeed;
      if (!fs.open && currentBattleTime >= fs.openDelay) fs.open = true;

      // ── HEAT ──────────────────────────────────────────────────────
      if (!er.active) {
        hs.level = Math.min(hs.maxLevel, hs.level + hs.gainPerSecond / 60);
        if (distToCenter < zones.magmaCore && velocity < 1.5)
          hs.level = Math.min(hs.maxLevel, hs.level + hs.gainOnCenterIdle / 60);
        if (b.onLavaRiver)
          hs.level = Math.min(hs.maxLevel, hs.level + hs.gainOnLavaRiver / 60);
      }

      // ── ERUPTION ──────────────────────────────────────────────────
      if (!er.active && hs.level >= hs.maxLevel) {
        er.active    = true;
        er.startTime = currentBattleTime;
        for (let i = 0; i < 24; i++) {
          const a = (Math.PI * 2 / 24) * i;
          addParticle(centerX + Math.cos(a) * 15, centerY + Math.sin(a) * 15, '#ffdd00', 20);
        }
        recordEvent && recordEvent('VOLCANIC_ERUPTION', { heat: hs.level });
      }

      if (er.active) {
        const elapsed = currentBattleTime - er.startTime;
        if (elapsed < er.duration) {
          if (distToCenter > 5) {
            const angleFrom = Math.atan2(b.y - centerY, b.x - centerX);
            const ratio = elapsed / er.duration;
            const force = er.outwardForce * (1.0 - ratio * ratio);
            b.vx += Math.cos(angleFrom) * force;
            b.vy += Math.sin(angleFrom) * force;
          }
        } else {
          er.active = false;
          hs.level  = hs.resetTo;
          const lb = er.lavaBombs;
          const bombCount = lb.count + Math.floor(Math.random() * (lb.countMax - lb.count + 1));
          for (let i = 0; i < bombCount; i++) {
            const a = (Math.PI * 2 / bombCount) * i + Math.random() * 0.5;
            const r = zones.magmaCore + Math.random() * (zones.lavaFlowRing - zones.magmaCore);
            ARENA._lavaBombs.push({ x: centerX + Math.cos(a) * r, y: centerY + Math.sin(a) * r, spawnTime: currentBattleTime, hit: false });
          }
        }
      }

      // ── LAVA BOMBS ────────────────────────────────────────────────
      if (ARENA._lavaBombs.length > 0) {
        const bombs = er.lavaBombs;
        ARENA._lavaBombs = ARENA._lavaBombs.filter(bm => {
          if (bm.hit || currentBattleTime - bm.spawnTime > bombs.lifetime) return false;
          const dist = Math.sqrt((b.x - bm.x) ** 2 + (b.y - bm.y) ** 2);
          if (dist < bombs.radius) {
            bm.hit = true;
            const pa = Math.atan2(b.y - bm.y, b.x - bm.x);
            b.vx += Math.cos(pa) * bombs.knockback;
            b.vy += Math.sin(pa) * bombs.knockback;
            b.stamina   -= bombs.staminaDrain;
            b.stability -= bombs.stabilityDrain;
          }
          return !bm.hit;
        });
      }

      // ── RIOS DE LAVA ROTATIVOS ────────────────────────────────────
      b.onLavaRiver = false;
      if (distToCenter >= zones.magmaCore && distToCenter <= zones.lavaFlowRing) {
        const bAngle = ((Math.atan2(b.y - centerY, b.x - centerX) + Math.PI * 2) % (Math.PI * 2));
        const armHalfRad = (rivers.armWidth * Math.PI / 180) / 2;
        for (let i = 0; i < rivers.count; i++) {
          const armAngle = (riverAngle + (Math.PI * 2 / rivers.count) * i) % (Math.PI * 2);
          let diff = Math.abs(bAngle - armAngle);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          if (diff < armHalfRad) {
            b.onLavaRiver = true;
            const tangAngle = Math.atan2(b.y - centerY, b.x - centerX) + Math.PI / 2;
            const fade = 1 - diff / armHalfRad;
            b.vx += Math.cos(tangAngle) * rivers.pushForce * fade;
            b.vy += Math.sin(tangAngle) * rivers.pushForce * fade;
            b.stamina -= (rivers.staminaDrain / 60);
            break;
          }
        }
      }

      // ── OBSIDIAN BELT — corrente orbital ──────────────────────────
      if (distToCenter >= zones.lavaFlowRing && distToCenter < zones.obsidianBelt) {
        const oc = ARENA.obsidianCurrent;
        const tangAngle = Math.atan2(b.y - centerY, b.x - centerX) + Math.PI / 2 * oc.direction;
        b.vx += Math.cos(tangAngle) * oc.tangentialForce;
        b.vy += Math.sin(tangAngle) * oc.tangentialForce;
      }

      // ── FRICÇÃO ───────────────────────────────────────────────────
      let frictionFactor;
      if (distToCenter < zones.magmaCore)      frictionFactor = 0.998;
      else if (distToCenter < zones.lavaFlowRing) frictionFactor = 0.997;
      else if (distToCenter < zones.obsidianBelt) frictionFactor = 0.997;
      else                                        frictionFactor = 0.995;
      b.vx *= frictionFactor;
      b.vy *= frictionFactor;

      // ── TIGELA RASA ───────────────────────────────────────────────
      if (distToCenter > zones.magmaCore) {
        const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
        const distRatio = (distToCenter - zones.magmaCore) / (zones.wall - zones.magmaCore);
        const bowlStrength = er.active ? 0.02 : 0.06;
        b.vx += Math.cos(angleToCenter) * bowlStrength * distRatio * distRatio;
        b.vy += Math.sin(angleToCenter) * bowlStrength * distRatio * distRatio;
      }

      // ── FISSURAS ROTATIVAS ────────────────────────────────────────
      if (distToCenter >= zones.obsidianBelt && fs.open) {
        const bAngle = ((Math.atan2(b.y - centerY, b.x - centerX) + Math.PI * 2) % (Math.PI * 2));
        let inFissure = false;
        for (let i = 0; i < fs.count; i++) {
          const fa = (fs.baseAngle + (Math.PI * 2 / fs.count) * i) % (Math.PI * 2);
          const halfW = (fs.width / Math.max(distToCenter * 2, 1)) * Math.PI;
          let diff = Math.abs(bAngle - fa);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          if (diff < halfW) { inFissure = true; break; }
        }
        if (inFissure && !b.submerged) {
          b.submerged = true; b.submergedVisual = true;
          b.submersionStartTime = currentBattleTime;
        }
      } else if (distToCenter < zones.obsidianBelt && b.submerged) {
        b.submerged = false; b.submergedVisual = false;
      }

      if (b.submerged) {
        const timeSubmerged = currentBattleTime - (b.submersionStartTime || currentBattleTime);
        b.vx *= fs.dragMultiplier; b.vy *= fs.dragMultiplier;
        b.stamina -= (fs.spinDrainPerSec / 60);
        const bWeight = b.bey?.effectiveStats?.weight || 10;
        if (bWeight >= 20 && Math.random() < (fs.heavyEscapeBonus / 60)) {
          b.submerged = false; b.submergedVisual = false;
        } else if (timeSubmerged >= fs.submersionDuration) {
          b.alive = false; b.submerged = false; b.submergedVisual = false;
          recordEvent && recordEvent('THERMAL_KO', { bey: b === b1 ? 'b1' : 'b2', time: currentBattleTime });
        }
      }

      // ── WALL CLAMP ────────────────────────────────────────────────
      if (!b.isOrbiting && distToCenter > zones.wall - b.radius) {
        const angle = Math.atan2(b.y - centerY, b.x - centerX);
        b.x = centerX + Math.cos(angle) * (zones.wall - b.radius);
        b.y = centerY + Math.sin(angle) * (zones.wall - b.radius);
        const nx = Math.cos(angle), ny = Math.sin(angle);
        const dot = b.vx * nx + b.vy * ny;
        if (er.active) {
          if (dot > 0) { b.vx -= dot * nx; b.vy -= dot * ny; }
          b.vx *= 0.55; b.vy *= 0.55;
          const spd = Math.sqrt(b.vx ** 2 + b.vy ** 2);
          if (spd > 16) { b.vx = (b.vx / spd) * 16; b.vy = (b.vy / spd) * 16; }
          b.stamina -= 0.8;
        } else {
          b.vx -= 2 * dot * nx; b.vy -= 2 * dot * ny;
          b.vx *= 0.80; b.vy *= 0.80;
          b.stamina -= 1.2;
          b.burstDamage += 0.3;
        }
      }

      // ── STAMINA LOSS BASE ─────────────────────────────────────────
      let staminaLoss = 0.10 - ((b.bey?.effectiveStats?.sta || 10) * 0.003);
      staminaLoss += velocity * 0.004;
      b.stamina -= staminaLoss;
    }
    
    function handlePangeaPlatformPhysics(b, bSpinPercent, velocity) {
      // PANGEA PLATFORM: 6 tectonic plates + earthquakes + aftershocks + fissures
      // Beys on a plate get tangential force from plate rotation
      const distToCenter = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
      const zones = ARENA.zones;
      const currentTime = _simTime / 1000;
      const seismic = ARENA.seismic;
      const afs = seismic.aftershocks;
      const fis = seismic.fissures;

      // Update plate angles (each plate rotates independently)
      ARENA.plates.forEach(plate => {
        plate.currentAngle += plate.velocity * plate.direction * (1 / 60);
        if (plate.currentAngle > Math.PI * 2) plate.currentAngle -= Math.PI * 2;
        if (plate.currentAngle < 0) plate.currentAngle += Math.PI * 2;
      });

      // ── SEISMIC STATE MACHINE ──────────────────────────────────────
      const isIdle = !seismic.active && !seismic.warningActive && afs.currentAftershock === 0;
      if (isIdle && currentTime - seismic.lastQuakeTime >= seismic.interval) {
        seismic.warningActive = true;
        seismic.warningStartTime = currentTime;
      }

      // Warning phase
      if (seismic.warningActive && !seismic.active) {
        if (Math.random() < 0.3) addScreenShake(1.5);
        if (currentTime - seismic.warningStartTime >= seismic.warningTime) {
          seismic.warningActive = false;
          seismic.active = true;
          seismic.activeTimer = 0;
          seismic.lastQuakeTime = currentTime;
          addScreenShake(8);
          if (Math.random() < fis.chance) {
            const fissureIdx = Math.floor(Math.random() * ARENA.plates.length);
            fis.activeFissures = [{ plateIndex: fissureIdx, createdAt: currentTime }];
          }
          recordEvent('PANGEA_EARTHQUAKE', { intensity: seismic.intensity });
        }
      }

      // Main quake
      if (seismic.active) {
        seismic.activeTimer += 1;
        if (seismic.activeTimer >= seismic.duration * 60) {
          seismic.active = false;
          seismic.activeTimer = 0;
          fis.activeFissures = [];
          if (afs.enabled) {
            afs.currentAftershock = 1;
            afs.lastAftershockTime = currentTime;
          }
        } else {
          const quakeForce = seismic.intensity * 0.12;
          b.vx += (Math.random() - 0.5) * quakeForce;
          b.vy += (Math.random() - 0.5) * quakeForce;
          if (Math.random() < 0.3) addScreenShake(3);
          if (Math.random() < 0.06) addParticle(b.x, b.y, '#ff6b6b', 8);
        }
      }

      // Aftershocks
      if (!seismic.active && afs.currentAftershock > 0 && afs.currentAftershock <= afs.count) {
        if (currentTime - afs.lastAftershockTime >= afs.delay) {
          const aftershockForce = afs.intensity * 0.12;
          b.vx += (Math.random() - 0.5) * aftershockForce;
          b.vy += (Math.random() - 0.5) * aftershockForce;
          if (Math.random() < 0.2) addScreenShake(2);
          afs.lastAftershockTime = currentTime;
          afs.currentAftershock++;
          if (afs.currentAftershock > afs.count) afs.currentAftershock = 0;
        }
      }

      // Fissure ring-out check
      if (fis.activeFissures.length > 0 && distToCenter > zones.centerStable && distToCenter < zones.plateZone) {
        const bladeAngle = ((Math.atan2(b.y - centerY, b.x - centerX) + Math.PI * 2) % (Math.PI * 2));
        for (const fissure of fis.activeFissures) {
          const plate = ARENA.plates[fissure.plateIndex];
          if (!plate) continue;
          const fissureAngle = (plate.currentAngle - (Math.PI / ARENA.plates.length) + Math.PI * 2) % (Math.PI * 2);
          let angleDiff = Math.abs(bladeAngle - fissureAngle);
          if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
          const halfWidth = Math.asin(Math.min((fis.fissureWidth / 2) / Math.max(distToCenter, 1), 1));
          if (angleDiff < halfWidth) {
            b.stamina = 0;
            recordEvent('FISSURE_RINGOUT', { bey: b === b1 ? 'b1' : 'b2' });
          }
        }
      }

      // Determine which plate (pie slice) bey is on
      let currentPlate = null;
      if (distToCenter >= zones.centerStable && distToCenter < zones.plateZone) {
        const angleFromCenter = ((Math.atan2(b.y - centerY, b.x - centerX) + Math.PI * 2) % (Math.PI * 2));
        const plateArc = Math.PI * 2 / 6;

        for (const plate of ARENA.plates) {
          const plateCenter = (plate.currentAngle + Math.PI * 2) % (Math.PI * 2);
          let angleDiff = Math.abs(angleFromCenter - plateCenter);
          if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
          if (angleDiff < plateArc / 2) { currentPlate = plate; break; }
        }
      }

      // Apply tangential plate force when on a plate
      if (currentPlate) {
        const angleFromCenter = Math.atan2(b.y - centerY, b.x - centerX);
        const tangentialAngle = angleFromCenter + (Math.PI / 2) * currentPlate.direction;
        const plateForce = currentPlate.velocity * 1.0;
        b.vx += Math.cos(tangentialAngle) * plateForce;
        b.vy += Math.sin(tangentialAngle) * plateForce;
        if (Math.random() < 0.03) {
          const color = currentPlate.direction > 0 ? '#5a8a30' : '#8b4513';
          addParticle(b.x, b.y, color, 4);
        }
      }

      // Standard friction
      b.vx *= 0.990;
      b.vy *= 0.990;

      // Weak gravity toward center
      const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
      if (distToCenter > zones.centerStable) {
        b.vx += Math.cos(angleToCenter) * 0.06;
        b.vy += Math.sin(angleToCenter) * 0.06;
      }

      // Stamina drain
      let staminaLoss = 0.14 - ((b.bey?.effectiveStats?.sta || 10) * 0.005);
      staminaLoss += velocity * 0.009;
      if (seismic.active) staminaLoss *= 1.2;
      if (afs.currentAftershock > 0) staminaLoss *= 1.1;

      if (velocity < 2 && b.bey?.type === 'Stamina') {
        staminaLoss *= 0.6;
        if (isOppositeSpin) staminaLoss *= 0.7;
      }

      const hasPerpetual = b.bey?.synergies?.some(s => s?.name?.includes('Perpetual')) || false;
      if (hasPerpetual) staminaLoss -= 0.01;
      if (b.eternalSpinActive && b.eternalSpinTimer < 300) staminaLoss = 0;

      b.stamina -= staminaLoss;

      // Wall collision — órbita salta a checagem (Fix satellite launch)
      if (!b.isOrbiting && distToCenter > zones.wall - b.radius) {
        const angle = Math.atan2(b.y - centerY, b.x - centerX);
        b.x = centerX + Math.cos(angle) * (zones.wall - b.radius);
        b.y = centerY + Math.sin(angle) * (zones.wall - b.radius);

        const normalX = Math.cos(angle);
        const normalY = Math.sin(angle);
        const dotProduct = b.vx * normalX + b.vy * normalY;

        b.vx = b.vx - 2 * dotProduct * normalX;
        b.vy = b.vy - 2 * dotProduct * normalY;

        b.vx *= 0.75;
        b.vy *= 0.75;
        b.stamina -= 1.5;
        b.burstDamage += 0.4;

        addParticle(b.x, b.y, '#ffffff', 10);
      }
    }
    
    function handlePinballInfernoPhysics(b, bSpinPercent, velocity) {
      // ═══════════════════════════════════════════════════════════════════
      // PINBALL INFERNO V3 — Nova arena completa
      // Win conditions: Points (8000), Ring Out, Spin Finish, Burst Finish
      // ═══════════════════════════════════════════════════════════════════
      const beyIndex = b === b1 ? 0 : 1;
      const beyKey   = beyIndex === 0 ? 'b1' : 'b2';
      const bRelX    = b.x - centerX;
      const bRelY    = b.y - centerY;
      const distToCenter = Math.sqrt(bRelX ** 2 + bRelY ** 2);
      const arenaR   = ARENA.arenaRadius;

      // ── GRAVITY (pulls blade downward) ───────────────────────────────
      b.vy += ARENA.gravity.strength;

      // ── ARENA WALL — pink neon border bounce ─────────────────────────
      if (distToCenter > arenaR - b.radius) {
        const angle = Math.atan2(bRelY, bRelX);
        b.x = centerX + Math.cos(angle) * (arenaR - b.radius - 1);
        b.y = centerY + Math.sin(angle) * (arenaR - b.radius - 1);
        const nx = Math.cos(angle), ny = Math.sin(angle);
        const dot = b.vx * nx + b.vy * ny;
        b.vx = (b.vx - 2 * dot * nx) * 0.85;
        b.vy = (b.vy - 2 * dot * ny) * 0.85;
        addParticle(b.x, b.y, '#ff2d78', 8);
        addScreenShake(0.5);
        b.stamina     -= 0.5;
        b.burstDamage += 0.1;
      }

      // ── SIDE BUMPERS — velocity-scaled push ──────────────────────────
      ARENA.bumpers.forEach(bumper => {
        const bx = centerX + bumper.x;
        const by = centerY + bumper.y;
        const d  = Math.sqrt((b.x - bx) ** 2 + (b.y - by) ** 2);
        if (d < bumper.radius + b.radius && bumper.cooldown <= 0) {
          const angle    = Math.atan2(b.y - by, b.x - bx);
          const curSpeed = Math.sqrt(b.vx ** 2 + b.vy ** 2);
          const force    = bumper.bounceForce + curSpeed * 0.5;
          b.vx = Math.cos(angle) * force;
          b.vy = Math.sin(angle) * force;
          b.x  = bx + Math.cos(angle) * (bumper.radius + b.radius + 1);
          b.y  = by + Math.sin(angle) * (bumper.radius + b.radius + 1);
          bumper.cooldown = 0.4;
          bumper.active   = true;
          // reset center-hit streak (Suggestion A multiplier)
          ARENA.consecutiveCenterHits[beyKey] = 0;
          addParticle(b.x, b.y, '#ffcc22', 12);
          addScreenShake(1.2);
          b.stamina     -= 1.5;
          b.burstDamage += 0.4;
          recordEvent('PINBALL_BUMPER_HIT', { bey: beyKey, bumperId: bumper.id });
        }
        if (bumper.cooldown > 0) {
          bumper.cooldown -= 1 / 60;
          if (bumper.cooldown <= 0) bumper.active = false;
        }
      });

      // ── CENTER SCORE BUMPER — elastic bounce + 1000 pts ─────────────
      const cb        = ARENA.centerBumper;
      const cbCoolKey = beyIndex === 0 ? 'centerBumperCooldownB1' : 'centerBumperCooldownB2';
      if (distToCenter < cb.radius + b.radius && ARENA[cbCoolKey] <= 0) {
        // Elastic — no velocity loss
        const angle = Math.atan2(bRelY, bRelX);
        const nx = Math.cos(angle), ny = Math.sin(angle);
        const dot = b.vx * nx + b.vy * ny;
        b.vx -= 2 * dot * nx;
        b.vy -= 2 * dot * ny;
        b.x   = centerX + nx * (cb.radius + b.radius + 1);
        b.y   = centerY + ny * (cb.radius + b.radius + 1);

        // Suggestion A — streak multiplier
        ARENA.consecutiveCenterHits[beyKey] = (ARENA.consecutiveCenterHits[beyKey] || 0) + 1;
        const streak = ARENA.consecutiveCenterHits[beyKey];
        const pts    = streak > cb.multiplierStreak ? cb.pointsPerHit * 2 : cb.pointsPerHit;
        ARENA.score[beyKey] = (ARENA.score[beyKey] || 0) + pts;
        ARENA[cbCoolKey]    = cb.maxCooldown;
        cb.cooldown         = cb.maxCooldown;

        addParticle(centerX, centerY, '#00f5ff', 20);
        addScreenShake(1.5);
        recordEvent('CENTER_BUMPER_HIT', {
          bey: beyKey, pts,
          totalScore: ARENA.score[beyKey],
          streak,
          multiplierActive: streak > cb.multiplierStreak,
        });

        // ── POINTS WIN ──────────────────────────────────────────────
        if (ARENA.score[beyKey] >= cb.pointsGoal) {
          const opponent    = beyIndex === 0 ? b2 : b1;
          opponent.stamina  = 0;
          recordEvent('POINTS_WIN', { winner: beyKey, score: ARENA.score[beyKey] });
        }
      }
      if (ARENA[cbCoolKey] > 0) ARENA[cbCoolKey] -= 1 / 60;
      if (cb.cooldown      > 0) cb.cooldown      -= 1 / 60;

      // ── FLIPPERS — auto-trigger, launch blade upward ─────────────────
      ARENA.flippers.forEach(flipper => {
        const fx = centerX + flipper.x;
        const fy = centerY + flipper.y;
        const d  = Math.sqrt((b.x - fx) ** 2 + (b.y - fy) ** 2);
        if (d < flipper.triggerRadius + b.radius && flipper.cooldown <= 0) {
          const launchAngle = flipper.id === 'left'
            ? -(Math.PI / 2 + Math.PI / 5)   // upper-right
            : -(Math.PI / 2 - Math.PI / 5);  // upper-left
          const curSpeed = Math.sqrt(b.vx ** 2 + b.vy ** 2);
          const power    = flipper.launchPower + curSpeed * 0.3;
          b.vx = Math.cos(launchAngle) * power;
          b.vy = Math.sin(launchAngle) * power;
          flipper.cooldown = flipper.maxCooldown;
          flipper.active   = true;
          addParticle(b.x, b.y, '#4169ff', 15);
          addScreenShake(2.0);
          recordEvent('FLIPPER_LAUNCH', { bey: beyKey, flipper: flipper.id });
        }
        if (flipper.cooldown > 0) {
          flipper.cooldown -= 1 / 60;
          if (flipper.cooldown <= 0) flipper.active = false;
        }
      });

      // ── RING OUT GAP — instant elimination ───────────────────────────
      const rog    = ARENA.ringOutGap;
      const inGapX = bRelX >= (rog.x - rog.width  / 2) && bRelX <= (rog.x + rog.width  / 2);
      const inGapY = bRelY >= (rog.y - rog.height / 2) && bRelY <= (rog.y + rog.height / 2);
      if (inGapX && inGapY) {
        b.stamina     = 0;
        b.spinPercent = 0;
        recordEvent('PINBALL_RINGOUT', { bey: beyKey });
      }

      // ── FRICTION ─────────────────────────────────────────────────────
      b.vx *= 0.993;
      b.vy *= 0.993;

      // ── STAMINA DRAIN ─────────────────────────────────────────────────
      let staminaLoss = 0.14 - ((b.bey?.effectiveStats?.sta || 10) * 0.004);
      staminaLoss += velocity * 0.008;
      const hasPerpetual = b.bey?.synergies?.some(s => s?.name?.includes('Perpetual')) || false;
      if (hasPerpetual) staminaLoss -= 0.01;
      if (b.eternalSpinActive && b.eternalSpinTimer < 300) staminaLoss = 0;
      b.stamina -= staminaLoss;
    }
    
    function handleVortexColiseumPhysics(b, bSpinPercent, velocity) {
      const distToCenter = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
      const zones = ARENA.zones;
      const beyIndex = b === b1 ? 0 : 1;
      
      // Determine current orbit
      let currentOrbit = 'outer';
      let orbitMultiplier = 1.0;
      
      if (distToCenter <= zones.innerOrbit) {
        currentOrbit = 'inner';
        orbitMultiplier = 1.4; // +40% speed in inner orbit
      } else if (distToCenter <= zones.middleOrbit) {
        currentOrbit = 'middle';
        orbitMultiplier = 1.0; // Normal speed
      } else if (distToCenter <= zones.outerOrbit) {
        currentOrbit = 'outer';
        orbitMultiplier = 0.8; // -20% speed in outer orbit
      }
      
      // Vortex pull force - pulls toward center with rotation
      const vortexStrength = ARENA.vortex.strength;
      const pullForce = (zones.wall - distToCenter) / zones.wall * vortexStrength;
      
      // Calculate tangential (orbital) force based on vortex rotation
      const angleFromCenter = Math.atan2(b.y - centerY, b.x - centerX);
      const vortexDirection = ARENA.vortex.inversed ? -1 : 1;
      const tangentialAngle = angleFromCenter + (Math.PI / 2) * vortexDirection;
      
      // Apply vortex forces
      const radialPull = pullForce * 0.4;
      const tangentialForce = pullForce * 0.6 * orbitMultiplier;
      
      // Pull toward center
      const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
      b.vx += Math.cos(angleToCenter) * radialPull;
      b.vy += Math.sin(angleToCenter) * radialPull;
      
      // Apply orbital force
      b.vx += Math.cos(tangentialAngle) * tangentialForce;
      b.vy += Math.sin(tangentialAngle) * tangentialForce;
      
      // VISUAL: Particles being sucked into vortex
      if (distToCenter > zones.vortexCore && Math.random() < 0.15) {
        const particleAngle = angleToCenter + (Math.random() - 0.5) * 0.3;
        const particleX = b.x + Math.cos(particleAngle) * 20;
        const particleY = b.y + Math.sin(particleAngle) * 20;
        const color = ARENA.vortex.inversed ? '#ff4444' : '#c084fc';
        addParticle(particleX, particleY, color, 6);
      }
      
      // Storm Surge - strong ejection when inversed
      if (ARENA.vortex.inversed && distToCenter < zones.middleOrbit) {
        const ejectForce = 7.0; // BRUTAL ejection - beys fly to wall!
        b.vx -= Math.cos(angleToCenter) * ejectForce;
        b.vy -= Math.sin(angleToCenter) * ejectForce;
        
        if (Math.random() < 0.05) {
          addParticle(b.x, b.y, '#ff0000', 8);
        }
      }
      
      // Track momentum stacks (complete revolutions in inner orbit)
      if (currentOrbit === 'inner') {
        const currentAngle = Math.atan2(b.y - centerY, b.x - centerX);
        const lastAngle = beyIndex === 0 ? ARENA.momentum.bey1LastAngle : ARENA.momentum.bey2LastAngle;
        
        // VISUAL: Colorful trail for beys in inner orbit
        const momentumStacks = beyIndex === 0 ? ARENA.momentum.bey1Stacks : ARENA.momentum.bey2Stacks;
        if (Math.random() < 0.2) {
          const trailColor = momentumStacks > 3 ? '#ffd700' : momentumStacks > 1 ? '#8b5cf6' : '#6366f1';
          addParticle(b.x, b.y, trailColor, 5 + momentumStacks);
        }
        
        // Check if completed a full revolution
        const angleDiff = currentAngle - lastAngle;
        if (Math.abs(angleDiff) > Math.PI) {
          // Crossed the -π/π boundary
          if (beyIndex === 0) {
            ARENA.momentum.bey1Stacks += 1;
            // Visual feedback for stack gain
            for (let i = 0; i < 15; i++) {
              const angle = (Math.PI * 2 / 15) * i;
              const x = b.x + Math.cos(angle) * 15;
              const y = b.y + Math.sin(angle) * 15;
              addParticle(x, y, '#ffd700', 8);
            }
            recordEvent('MOMENTUM_STACK', { bey: 'b1', stacks: ARENA.momentum.bey1Stacks });
          } else {
            ARENA.momentum.bey2Stacks += 1;
            // Visual feedback for stack gain
            for (let i = 0; i < 15; i++) {
              const angle = (Math.PI * 2 / 15) * i;
              const x = b.x + Math.cos(angle) * 15;
              const y = b.y + Math.sin(angle) * 15;
              addParticle(x, y, '#ffd700', 8);
            }
            recordEvent('MOMENTUM_STACK', { bey: 'b2', stacks: ARENA.momentum.bey2Stacks });
          }
        }
        
        if (beyIndex === 0) {
          ARENA.momentum.bey1LastAngle = currentAngle;
        } else {
          ARENA.momentum.bey2LastAngle = currentAngle;
        }
      }
      
      // Decay momentum stacks when not in inner orbit
      if (currentOrbit !== 'inner') {
        if (beyIndex === 0) {
          ARENA.momentum.bey1Stacks = Math.max(0, ARENA.momentum.bey1Stacks - ARENA.momentum.stackDecayRate / 60);
        } else {
          ARENA.momentum.bey2Stacks = Math.max(0, ARENA.momentum.bey2Stacks - ARENA.momentum.stackDecayRate / 60);
        }
      }
      
      // ═══════════════════════════════════════════════════════════
      // BUMPERS - Push beys away on contact
      // ═══════════════════════════════════════════════════════════
      if (ARENA.bumpers) {
        ARENA.bumpers.forEach(bumper => {
          const bumperX = centerX + Math.cos(bumper.angle) * bumper.radius;
          const bumperY = centerY + Math.sin(bumper.angle) * bumper.radius;
          const distToBumper = Math.sqrt((b.x - bumperX) ** 2 + (b.y - bumperY) ** 2);
          
          if (distToBumper < bumper.size + b.radius && bumper.cooldown <= 0) {
            // BUMPER HIT! Push away from bumper
            const pushAngle = Math.atan2(b.y - bumperY, b.x - bumperX);
            const pushForce = 7;
            
            b.vx += Math.cos(pushAngle) * pushForce;
            b.vy += Math.sin(pushAngle) * pushForce;
            
            bumper.cooldown = 0.5; // Half second cooldown
            
            // Visual feedback
            for (let i = 0; i < 15; i++) {
              const angle = (Math.PI * 2 / 15) * i;
              const px = bumperX + Math.cos(angle) * (bumper.size + 10);
              const py = bumperY + Math.sin(angle) * (bumper.size + 10);
              addParticle(px, py, bumper.color, 8);
            }
            
            recordEvent('BUMPER_HIT', {
              bey: beyIndex === 0 ? 'b1' : 'b2',
              bumper: bumper.id
            });
          }
          
          // Decay cooldown
          if (bumper.cooldown > 0) {
            bumper.cooldown -= 1/60;
          }
        });
      }
      // ═══════════════════════════════════════════════════════════
      
      // Check slingshot points - WITH ENHANCED VISUALS
      ARENA.slingshotPoints.forEach(slingshot => {
        const slingshotX = centerX + Math.cos(slingshot.angle) * slingshot.radius;
        const slingshotY = centerY + Math.sin(slingshot.angle) * slingshot.radius;
        const distToSlingshot = Math.sqrt((b.x - slingshotX) ** 2 + (b.y - slingshotY) ** 2);
        
        if (distToSlingshot < 35 && slingshot.cooldown <= 0 && velocity > 4) {
          // SLINGSHOT ACTIVATED - launch to opposite side
          const oppositeAngle = slingshot.angle + Math.PI;
          const launchForce = 18;
          
          b.vx = Math.cos(oppositeAngle) * launchForce;
          b.vy = Math.sin(oppositeAngle) * launchForce;
          
          slingshot.cooldown = 1.5;
          
          // ENHANCED VISUAL: Explosion effect at launch
          for (let i = 0; i < 30; i++) {
            const angle = (Math.PI * 2 / 30) * i;
            const px = slingshotX + Math.cos(angle) * 25;
            const py = slingshotY + Math.sin(angle) * 25;
            addParticle(px, py, '#fbbf24', 12);
            addParticle(px, py, '#ffffff', 8);
          }
          addScreenShake(2.0);
          
          recordEvent('SLINGSHOT_LAUNCH', {
            bey: beyIndex === 0 ? 'b1' : 'b2',
            angle: oppositeAngle
          });
        }
      });
      
      // Orbit-specific physics
      if (currentOrbit === 'inner') {
        // Inner orbit - high speed, high risk
        b.vx *= 0.990; // Low friction
        b.vy *= 0.990;
        
        if (Math.random() < 0.03) {
          addParticle(b.x, b.y, '#c084fc', 5);
        }
      } else if (currentOrbit === 'middle') {
        // Middle orbit - balanced
        b.vx *= 0.985;
        b.vy *= 0.985;
      } else {
        // Outer orbit - safe, stamina recovery
        b.vx *= 0.980; // More friction
        b.vy *= 0.980;
        
        // Stamina recovery in outer orbit
        if (bSpinPercent < 0.9) {
          b.stamina += 0.1;
          b.stamina = Math.min(250, b.stamina); // Cap no máximo
          if (Math.random() < 0.02) {
            addParticle(b.x, b.y, '#8b5cf6', 3);
          }
        }
      }
      
      // Stamina drain based on orbit
      let staminaLoss = 0.12 - ((b.bey?.effectiveStats?.sta || 10) * 0.005);
      
      if (currentOrbit === 'inner') {
        staminaLoss += velocity * 0.015; // High drain in inner orbit
      } else if (currentOrbit === 'middle') {
        staminaLoss += velocity * 0.008;
      } else {
        staminaLoss += velocity * 0.005; // Low drain in outer orbit
        staminaLoss *= 0.7; // 30% less stamina drain in safe zone
      }
      
      // LAD bonus
      if (velocity < 2 && b.bey?.type === 'Stamina') {
        staminaLoss *= 0.6;
        if (isOppositeSpin) staminaLoss *= 0.7;
      }
      
      const hasPerpetual = b.bey?.synergies?.some(s => s?.name?.includes('Perpetual')) || false;
      if (hasPerpetual) staminaLoss -= 0.01;
      
      // ETERNAL SPIN (STA 27+)
      if (b.eternalSpinActive && b.eternalSpinTimer < 300) {
        staminaLoss = 0;
      }
      
      b.stamina -= staminaLoss;
      
      // Wall collision — órbita salta a checagem (Fix satellite launch)
      if (!b.isOrbiting && distToCenter > zones.wall - b.radius) {
        const angle = Math.atan2(b.y - centerY, b.x - centerX);
        b.x = centerX + Math.cos(angle) * (zones.wall - b.radius);
        b.y = centerY + Math.sin(angle) * (zones.wall - b.radius);
        
        const normalX = Math.cos(angle);
        const normalY = Math.sin(angle);
        const dotProduct = b.vx * normalX + b.vy * normalY;
        
        b.vx = b.vx - 2 * dotProduct * normalX;
        b.vy = b.vy - 2 * dotProduct * normalY;
        
        b.vx *= 0.75;
        b.vy *= 0.75;
        b.stamina -= 1.5;
        b.burstDamage += 0.4;
        
        addParticle(b.x, b.y, '#a78bfa', 10);
      }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // SPEEDWAY CIRCUIT - Physics Handler (Headless)
    // ═══════════════════════════════════════════════════════════════
    function handleSpeedwayCircuitPhysics(b, bSpinPercent, velocity) {
      const zones = ARENA.zones;
      const ovalRatio = ARENA.ovalRatio || 1.6;
      const beyIndex = b === b1 ? 0 : 1;
      
      const dx = (b.x - centerX) / ovalRatio;
      const dy = b.y - centerY;
      const distToCenter = Math.sqrt(dx * dx + dy * dy);
      
      // Wall collision (oval) — órbita salta a checagem (Fix satellite launch)
      if (!b.isOrbiting && distToCenter > zones.wall - b.radius) {
        const angle = Math.atan2(b.y - centerY, (b.x - centerX) / ovalRatio);
        b.x = centerX + Math.cos(angle) * (zones.wall - b.radius) * ovalRatio;
        b.y = centerY + Math.sin(angle) * (zones.wall - b.radius);
        
        const normalX = Math.cos(angle);
        const normalY = Math.sin(angle);
        const vxOval = b.vx / ovalRatio;
        const vyOval = b.vy;
        const dotProduct = vxOval * normalX + vyOval * normalY;
        const vxOvalNew = vxOval - 2 * dotProduct * normalX;
        const vyOvalNew = vyOval - 2 * dotProduct * normalY;
        
        b.vx = vxOvalNew * ovalRatio * 0.75;
        b.vy = vyOvalNew * 0.75;
        b.stamina -= 1.5;
        b.burstDamage += 0.4;
      }
      
      // Boost pads
      if (ARENA.boostPads) {
        ARENA.boostPads.forEach(pad => {
          const distToPad = Math.sqrt((b.x - (centerX + pad.x)) ** 2 + (b.y - (centerY + pad.y)) ** 2);
          if (distToPad < pad.radius && (!pad.cooldown || pad.cooldown <= 0)) {
            const angleFromCenter = Math.atan2(b.y - centerY, (b.x - centerX) / ovalRatio);
            const tangentAngle = angleFromCenter + Math.PI / 2;
            b.vx += Math.cos(tangentAngle) * 18.0;
            b.vy += Math.sin(tangentAngle) * 18.0;
            pad.cooldown = 2.0;
            recordEvent('BOOST_PAD', { bey: beyIndex === 0 ? 'b1' : 'b2', pad: pad.id });
          }
          if (pad.cooldown > 0) pad.cooldown -= 1/60;
        });
      }
      
      // Oil slicks
      if (ARENA.oilSlicks) {
        ARENA.oilSlicks.forEach(oil => {
          const inOilX = Math.abs((b.x - centerX) - oil.x) < oil.width / 2;
          const inOilY = Math.abs((b.y - centerY) - oil.y) < oil.height / 2;
          if (inOilX && inOilY) {
            b.vx *= 1.02;
            b.vy *= 1.02;
          }
        });
      }
      
      // Center hole collision
      if (distToCenter < zones.centerHole) {
        const pushAngle = Math.atan2(b.y - centerY, b.x - centerX);
        b.vx += Math.cos(pushAngle) * 5.0;
        b.vy += Math.sin(pushAngle) * 5.0;
      }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // DOMINATION ZONES - Physics Handler (Headless)
    // ═══════════════════════════════════════════════════════════════
    function handleDominationZonesPhysics(b, bSpinPercent, velocity) {
      const zones = ARENA.zones;
      const beyIndex = b === b1 ? 0 : 1;
      const playerKey = beyIndex === 0 ? 'player1' : 'player2';
      const distToCenter = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
      const ps = ARENA.pointsSystem;

      // Wall collision — órbita salta a checagem (Fix satellite launch)
      if (!b.isOrbiting && distToCenter > zones.wall - b.radius) {
        const angle = Math.atan2(b.y - centerY, b.x - centerX);
        b.x = centerX + Math.cos(angle) * (zones.wall - b.radius);
        b.y = centerY + Math.sin(angle) * (zones.wall - b.radius);
        const normalX = Math.cos(angle);
        const normalY = Math.sin(angle);
        const dotProduct = b.vx * normalX + b.vy * normalY;
        b.vx = b.vx - 2 * dotProduct * normalX;
        b.vy = b.vy - 2 * dotProduct * normalY;
        b.vx *= 0.75;
        b.vy *= 0.75;
        b.stamina -= 1.5;
        b.burstDamage += 0.4;
      }

      // TIGELA RASA (Shallow Bowl Effect)
      // Pull suave para o centro - força aumenta com distância
      if (distToCenter > zones.center) {
        const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
        const distanceRatio = (distToCenter - zones.center) / (zones.wall - zones.center);
        const bowlStrength = 0.08;
        const pullForce = bowlStrength * distanceRatio;
        
        b.vx += Math.cos(angleToCenter) * pullForce;
        b.vy += Math.sin(angleToCenter) * pullForce;
      }

      // Central zone check
      const cz = ARENA.centralZone;
      if (cz && cz.owner === null && distToCenter <= cz.radius) {
        cz.captureProgress[playerKey] += 1 / 60;
        if (cz.captureProgress[playerKey] >= ps.captureTime) {
          cz.owner = playerKey;
          ps[playerKey].totalPoints += cz.points;
          ps[playerKey].zonesOwned.push('center');
          ps[playerKey].lastCapture = _simTime;
          recordEvent('ZONE_CAPTURED', { bey: beyIndex === 0 ? 'b1' : 'b2', zone: 'center', points: cz.points });
          if (ps[playerKey].totalPoints >= ps.targetPoints) {
            const otherBey = beyIndex === 0 ? b2 : b1;
            otherBey.spinPercent = 0; otherBey.stamina = 0;
          }
        }
      }

      // Peripheral zones - PIZZA SLICES
      if (ARENA.peripheralZones) {
        for (const zone of ARENA.peripheralZones) {
          if (zone.owner !== null) continue;
          
          // Calcula ângulo do beyblade em relação ao centro
          const beyAngle = Math.atan2(b.y - centerY, b.x - centerX);
          
          // Normaliza ângulo para [0, 2π]
          let normalizedBeyAngle = beyAngle;
          while (normalizedBeyAngle < 0) normalizedBeyAngle += Math.PI * 2;
          while (normalizedBeyAngle >= Math.PI * 2) normalizedBeyAngle -= Math.PI * 2;
          
          // Normaliza ângulo da zona
          let normalizedZoneAngle = zone.angle;
          while (normalizedZoneAngle < 0) normalizedZoneAngle += Math.PI * 2;
          while (normalizedZoneAngle >= Math.PI * 2) normalizedZoneAngle -= Math.PI * 2;
          
          // Calcula diferença angular
          let angleDiff = Math.abs(normalizedBeyAngle - normalizedZoneAngle);
          if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
          
          // Verifica se está dentro da fatia
          const isInSliceAngle = angleDiff <= zone.arcWidth / 2;
          const isInSliceRadius = distToCenter >= zones.center && distToCenter <= zones.zoneRadius;
          
          if (isInSliceAngle && isInSliceRadius) {
            zone.captureProgress[playerKey] += 1 / 60;
            if (zone.captureProgress[playerKey] >= ps.captureTime) {
              zone.owner = playerKey;
              ps[playerKey].totalPoints += zone.points;
              ps[playerKey].zonesOwned.push(zone.id);
              ps[playerKey].lastCapture = _simTime;
              recordEvent('ZONE_CAPTURED', { bey: beyIndex === 0 ? 'b1' : 'b2', zone: zone.id, points: zone.points });
              if (ps[playerKey].totalPoints >= ps.targetPoints) {
                const otherBey = beyIndex === 0 ? b2 : b1;
                otherBey.spinPercent = 0; otherBey.stamina = 0;
              }
            }
          }
        }
      }

      // Friction
      b.vx *= 0.992;
      b.vy *= 0.992;
    }
    
    // ═══════════════════════════════════════════════════════════════
    // TIDAL SURGE - Physics Handler (Headless) — idêntico ao BattleArena
    // ═══════════════════════════════════════════════════════════════
    function handleTidalSurgePhysics(b, bSpinPercent, velocity) {
      const tide  = ARENA.tideSystem;
      const zones = ARENA.arenaZones || ARENA.zones;
      const type  = tide.tideType || 'standard';
      const DT    = 1/60;

      // ── UPDATE DO ESTADO DA MARÉ (once per frame via b1) ──────────
      if (b === b1) {
        const cyc   = tide.cycleDuration || 12;
        const eio   = r => r < 0.5 ? 2*r*r : -1+(4-2*r)*r;
        const intens = tide.intensity || 1.0;

        // Escalada por tempo (max 3x em 4 minutos)
        tide.intensity = Math.min(3.0, 1.0 + (_simTime / 1000 / 60) * 0.5);

        tide.timer += DT;
        const p = (tide.timer % cyc) / cyc;

        if (type === 'standard') {
          if (p < 0.33) { tide.phase = 'low'; tide.floodRadius = 0; }
          else if (p < 0.66) { tide.phase = 'rising'; tide.floodRadius = tide.maxFloodRadius * eio((p-0.33)/0.33) * intens; }
          else { tide.phase = 'high'; tide.floodRadius = tide.maxFloodRadius * intens; }

        } else if (type === 'spiral') {
          if (p < 0.33) { tide.phase = 'low'; tide.floodRadius = 0; }
          else if (p < 0.66) { tide.phase = 'rising'; tide.floodRadius = tide.maxFloodRadius * eio((p-0.33)/0.33) * intens; }
          else { tide.phase = 'high'; tide.floodRadius = tide.maxFloodRadius * intens; }
          tide.spiralAngle += DT * 1.6 * (tide.spiralDirection || 1);

        } else if (type === 'double') {
          const r = Math.sin(p * Math.PI * 2) * 0.5 + 0.5;
          tide.dualFlood = r * tide.maxFloodRadius * 0.85 * intens;
          tide.dualAngle += DT * 0.4;
          tide.phase = r > 0.6 ? 'high' : r > 0.2 ? 'rising' : 'low';
          tide.floodRadius = tide.dualFlood;

        } else if (type === 'inverse') {
          if (p < 0.33) { tide.phase = 'low'; tide.inverseProgress = 0; }
          else if (p < 0.66) { tide.phase = 'rising'; tide.inverseProgress = eio((p-0.33)/0.33) * intens; }
          else { tide.phase = 'high'; tide.inverseProgress = 1.0 * intens; }
          tide.floodRadius = 0;

        } else if (type === 'chaos') {
          tide.blobTimer += DT;
          if (tide.blobTimer > 1.5 || tide.blobs.length === 0) {
            tide.blobTimer = 0;
            if (tide.blobs.length < 4) {
              const ang  = Math.random() * Math.PI * 2;
              const dist = Math.random() * (zones.sand || 160) * 0.75;
              tide.blobs.push({
                x: dist * Math.cos(ang), y: dist * Math.sin(ang),
                r: 0, maxR: (25 + Math.random() * 40) * intens,
                life: 0, maxLife: 2.5 + Math.random() * 2,
              });
            }
          }
          tide.blobs = tide.blobs.filter(bl => {
            bl.life += DT;
            const half = bl.maxLife * 0.5;
            bl.r = bl.life < half
              ? bl.maxR * eio(bl.life / half)
              : bl.maxR * (1 - eio((bl.life - half) / half));
            return bl.life < bl.maxLife;
          });
          tide.phase = tide.blobs.length > 2 ? 'high' : tide.blobs.length > 0 ? 'rising' : 'low';
          tide.floodRadius = 0;
        }

        // ── TSUNAMI SYSTEM UPDATE ─────────────────────────────────────
        const ts = ARENA.tsunamiSystem;
        if (ts) {
          if (!ts.active) {
            ts.timer += DT;
            if (ts.timer >= ts.interval) {
              const roll = Math.random();
              ts.level = roll < 0.10 ? 'apocalyptic' : roll < 0.40 ? 'heavy' : 'light';
              ts.active = true; ts.phase = 'warning'; ts.phaseTimer = 0; ts.timer = 0;
              recordEvent('TSUNAMI_START', { level: ts.level });
            }
          } else {
            const lc = ts.levels[ts.level];
            ts.phaseTimer += DT;
            if (ts.phase === 'warning') {
              if (ts.phaseTimer >= ts.warningDur) { ts.phase = 'expanding'; ts.phaseTimer = 0; }
            } else if (ts.phase === 'expanding') {
              const prg = Math.min(1, ts.phaseTimer / lc.expandDur);
              ts.wallOffset = lc.maxOffset * eio(prg);
              if (ts.phaseTimer >= lc.expandDur) { ts.wallOffset = lc.maxOffset; ts.phase = 'hold'; ts.phaseTimer = 0; }
            } else if (ts.phase === 'hold') {
              if (ts.phaseTimer >= lc.holdDur) {
                if (lc.returns) { ts.phase = 'returning'; ts.phaseTimer = 0; }
                else { ts.permanentOffset += ts.wallOffset; ts.wallOffset = 0; ts.active = false; ts.phase = 'idle'; ts.phaseTimer = 0; recordEvent('TSUNAMI_PERMANENT', { shrink: ts.permanentOffset }); }
              }
            } else if (ts.phase === 'returning') {
              const prg = Math.min(1, ts.phaseTimer / lc.returnDur);
              ts.wallOffset = lc.maxOffset * (1 - eio(prg));
              if (ts.phaseTimer >= lc.returnDur) { ts.wallOffset = 0; ts.active = false; ts.phase = 'idle'; ts.phaseTimer = 0; }
            }
          }
        }
      }

      const dx   = b.x - centerX;
      const dy   = b.y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const islandR = zones.island || 40;
      const floodR  = zones.floodZone || 80;
      const sandR   = zones.sand || 160;
      const wallR   = zones.wall || 220;

      // ── WALL COLLISION ─────────────────────────────────────────────
      if (!b.isOrbiting && dist > wallR - b.radius) {
        const angle   = Math.atan2(b.y - centerY, b.x - centerX);
        b.x = centerX + Math.cos(angle) * (wallR - b.radius);
        b.y = centerY + Math.sin(angle) * (wallR - b.radius);
        const nx = Math.cos(angle), ny = Math.sin(angle);
        const dot = b.vx * nx + b.vy * ny;
        b.vx = b.vx - 2 * dot * nx;
        b.vy = b.vy - 2 * dot * ny;
        const wallMult = tide.phase === 'high' ? 0.65 : 0.75;
        b.vx *= wallMult; b.vy *= wallMult;
        b.stamina  -= tide.phase === 'high' ? 0.8 : 1.5;
        b.burstDamage += tide.phase === 'high' ? 0.2 : 0.4;
      }

      // ── ILHA CENTRAL: bônus, sem penalidade ───────────────────────
      if (dist < islandR) return;

      // ── AREIA SECA: drag leve ──────────────────────────────────────
      if (dist > floodR && dist < sandR) {
        b.vx *= 0.9992; b.vy *= 0.9992;
      }

      // ── helper: aplicar água num foco ─────────────────────────────
      const applyWaterAt = (wx, wy, radius, phaseName) => {
        const wdx = b.x - wx, wdy = b.y - wy;
        const wd  = Math.sqrt(wdx * wdx + wdy * wdy);
        if (wd >= radius || radius <= 0) return;

        const depth   = 1 - wd / radius;
        const friction = depth < 0.33 ? 0.970 : depth < 0.66 ? 0.945 : 0.910;
        b.vx *= friction; b.vy *= friction;

        b.stamina -= (0.04 + depth * 0.08) * DT;

        const force = phaseName === 'high' ? 0.048 : 0.022;
        const adx = wx - b.x, ady = wy - b.y, ad = Math.sqrt(adx*adx + ady*ady) || 1;
        b.vx += (adx / ad) * force * depth;
        b.vy += (ady / ad) * force * depth;

        if (type === 'spiral') {
          const dir = tide.spiralDirection || 1;
          b.vx += (-wdy / (wd || 1)) * 0.018 * dir * depth;
          b.vy += ( wdx / (wd || 1)) * 0.018 * dir * depth;
        }
      };

      if (type === 'standard' || type === 'spiral') {
        if (tide.phase !== 'low') applyWaterAt(centerX, centerY, tide.floodRadius, tide.phase);

      } else if (type === 'double') {
        if ((tide.dualFlood || 0) > 0) {
          for (const side of [0, Math.PI]) {
            const ax = centerX + Math.cos((tide.dualAngle||0) + side) * floodR * 0.5;
            const ay = centerY + Math.sin((tide.dualAngle||0) + side) * floodR * 0.5;
            applyWaterAt(ax, ay, tide.dualFlood, tide.phase);
          }
        }

      } else if (type === 'inverse') {
        const inv = tide.inverseProgress || 0;
        if (inv > 0) {
          const innerEdge = sandR - inv * (sandR - floodR);
          if (dist > innerEdge && dist < wallR) {
            const depth   = (dist - innerEdge) / (wallR - innerEdge);
            const friction = 0.970 + depth * (0.910 - 0.970);
            b.vx *= friction; b.vy *= friction;
            b.stamina -= (0.04 + depth * 0.06) * DT;
            if (dist > 0) {
              b.vx -= (dx / dist) * 0.048 * depth;
              b.vy -= (dy / dist) * 0.048 * depth;
            }
          }
        }

      } else if (type === 'chaos') {
        for (const blob of (tide.blobs || [])) {
          applyWaterAt(centerX + blob.x, centerY + blob.y, blob.r, 'high');
        }
      }

      // ── TSUNAMI: borda efetiva encolhe, empurra blades para dentro ─
      const ts = ARENA.tsunamiSystem;
      if (ts && (ts.wallOffset > 0 || ts.permanentOffset > 0)) {
        const effectiveWall = wallR - ts.permanentOffset - ts.wallOffset;
        if (dist > effectiveWall) {
          const angle     = Math.atan2(b.y - centerY, b.x - centerX);
          const penetration = dist - effectiveWall;
          const forceMult = ts.level === 'apocalyptic' ? 2.2 : ts.level === 'heavy' ? 1.5 : 0.9;
          const pushForce = Math.min(6, 0.8 + penetration * 0.15) * forceMult;
          b.vx -= Math.cos(angle) * pushForce * DT * 60;
          b.vy -= Math.sin(angle) * pushForce * DT * 60;
          // Hard clamp
          b.x = centerX + Math.cos(angle) * (effectiveWall - b.radius);
          b.y = centerY + Math.sin(angle) * (effectiveWall - b.radius);
          const dot = b.vx * Math.cos(angle) + b.vy * Math.sin(angle);
          if (dot > 0) { b.vx -= 2 * dot * Math.cos(angle); b.vy -= 2 * dot * Math.sin(angle); }
          b.vx *= 0.68; b.vy *= 0.68;
          b.stamina  -= forceMult * 0.7;
          b.burstDamage += forceMult * 0.25;
        }
      }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // STORM TRACK - Physics Handler (Headless)
    // ═══════════════════════════════════════════════════════════════
    function applyStormEffects(b, stormType, storm) {
      const currentTime = _simTime * 0.001;
      
      switch(stormType) {
        case 'RAIN_WAVE':
          applyRainWaveEffect(b, storm.stormTypes.RAIN_WAVE);
          break;
        case 'WIND_VORTEX':
          applyWindVortexEffect(b, storm.stormTypes.WIND_VORTEX);
          break;
        case 'LIGHTNING_STORM':
          applyLightningStormEffect(b, storm.stormTypes.LIGHTNING_STORM, currentTime);
          break;
        case 'THUNDER_DOME':
          applyThunderDomeEffect(b, storm.stormTypes.THUNDER_DOME, currentTime);
          break;
        case 'HAIL_BARRAGE':
          applyHailBarrageEffect(b, storm.stormTypes.HAIL_BARRAGE, currentTime);
          break;
        case 'TORNADO_FURY':
          applyTornadoFuryEffect(b, storm.stormTypes.TORNADO_FURY);
          break;
      }
    }
    
    function applyRainWaveEffect(b, rainWave) {
      const beyAngle = Math.atan2(b.vy, b.vx);
      let angleDiff = beyAngle - rainWave.waveDirection;
      
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      
      if (Math.abs(angleDiff) < rainWave.waveWidth / 2) {
        // Going with the wave
        const pushForce = rainWave.waveForce * 0.3;
        b.vx += Math.cos(rainWave.waveDirection) * pushForce;
        b.vy += Math.sin(rainWave.waveDirection) * pushForce;
        
        if (Math.random() < 0.1) {
          addParticle(b.x, b.y, '#00aaff', 8);
        }
      }
    }
    
    function applyWindVortexEffect(b, windVortex) {
      windVortex.vortices.forEach(vortex => {
        const dx = vortex.x - b.x;
        const dy = vortex.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < windVortex.vortexRadius) {
          const pullStr = (1 - dist / windVortex.vortexRadius) * windVortex.pullForce;
          const angle = Math.atan2(dy, dx);
          const tangentAngle = angle + Math.PI / 2;
          
          b.vx += Math.cos(angle) * pullStr * 0.15;
          b.vy += Math.sin(angle) * pullStr * 0.15;
          b.vx += Math.cos(tangentAngle) * pullStr * 0.1;
          b.vy += Math.sin(tangentAngle) * pullStr * 0.1;
          
          if (Math.random() < 0.1) {
            addParticle(b.x, b.y, '#ccccff', 6);
          }
        }
      });
    }
    
    function applyLightningStormEffect(b, lightning, currentTime) {
      lightning.strikes.forEach(strike => {
        const dx = strike.x - b.x;
        const dy = strike.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < strike.radius && (!b.lightningHit || currentTime - b.lightningHit > 1.0)) {
          b.vx *= 0.5; // Reduz velocidade drasticamente
          b.vy *= 0.5;
          b.stamina -= 8;
          b.stability = Math.max(0, b.stability - 20);
          b.lightningHit = currentTime;
          
          addParticle(b.x, b.y, '#ffff00', 30);
          addParticle(b.x, b.y, '#ffffff', 25);
          recordEvent('LIGHTNING_STRIKE', { bey: b === b1 ? 'b1' : 'b2' });
        }
      });
    }
    
    function applyThunderDomeEffect(b, dome, currentTime) {
      const distToCenter = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
      const domeEdge = dome.domeRadius;
      
      if (distToCenter > domeEdge - dome.repulsionRange) {
        const repulsionStr = dome.repulsionForce * (1 - (domeEdge - distToCenter) / dome.repulsionRange);
        const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
        
        b.vx += Math.cos(angleToCenter) * repulsionStr * 0.2;
        b.vy += Math.sin(angleToCenter) * repulsionStr * 0.2;
        
        if (currentTime - dome.lastTickTime > dome.tickRate) {
          b.stamina -= dome.damagePerTick;
          dome.lastTickTime = currentTime;
          addParticle(b.x, b.y, '#00ffff', 12);
        }
      }
    }
    
    function applyHailBarrageEffect(b, hail, currentTime) {
      hail.hailstones.forEach(stone => {
        const dx = stone.x - b.x;
        const dy = stone.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 15 && !stone.hit) {
          stone.hit = true;
          b.stamina -= hail.damagePerHit;
          b.slowedUntil = currentTime + 1.0;
          
          addParticle(b.x, b.y, '#aaccff', 10);
        }
      });
      
      if (b.slowedUntil && currentTime < b.slowedUntil) {
        b.vx *= hail.slowEffect;
        b.vy *= hail.slowEffect;
      }
    }
    
    function applyTornadoFuryEffect(b, tornado) {
      const dx = tornado.tornadoX - b.x;
      const dy = tornado.tornadoY - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < tornado.tornadoRadius) {
        const pullStr = (1 - dist / tornado.tornadoRadius) * tornado.pullForce;
        const angle = Math.atan2(dy, dx);
        const tangentAngle = angle + Math.PI / 2;
        
        b.vx += Math.cos(angle) * pullStr * 0.25;
        b.vy += Math.sin(angle) * pullStr * 0.25;
        b.vx += Math.cos(tangentAngle) * pullStr * 0.2;
        b.vy += Math.sin(tangentAngle) * pullStr * 0.2;
        
        // Lift chance
        if (Math.random() < tornado.liftChance * 0.01 && !b.lifted) {
          b.lifted = true;
          b.liftEndTime = (_simTime * 0.001) + 2.0;
          recordEvent('TORNADO_LIFT', { bey: b === b1 ? 'b1' : 'b2' });
        }
        
        if (Math.random() < 0.15) {
          addParticle(b.x, b.y, '#ff6666', 15);
        }
      }
      
      if (b.lifted && _simTime * 0.001 > b.liftEndTime) {
        b.lifted = false;
        b.stamina -= 15;
        b.stability = Math.max(0, b.stability - 30);
        addParticle(b.x, b.y, '#ff6666', 20);
        recordEvent('TORNADO_LIFT', { bey: b === b1 ? 'b1' : 'b2' });
      }
    }
    
    // [Dead code removed: updateColosseumCarnageGates, spawnColosseumItem, updateColosseumItems,
    //  updateItemMovement, applyItemEffect — lógica migrada para handleColosseumCarnagePhysics]

    function updateStormTrackSystem() {
      if (!ARENA.stormSystem) {
        console.log('❌ No stormSystem found!');
        return;
      }
      
      const storm = ARENA.stormSystem;
      const currentTime = _simTime * 0.001;
      const timing = storm.timing;
      
      // Check for level up
      if (currentTime - storm.intensity.lastLevelUpTime > storm.intensity.levelUpTime) {
        storm.intensity.level = Math.min(3, storm.intensity.level + 1);
        storm.intensity.lastLevelUpTime = currentTime;
        console.log(`⚡ Storm Level Up! Now at level ${storm.intensity.level}`);
        recordEvent('STORM_LEVEL_UP', { level: storm.intensity.level });
      }
      
      // Phase management
      const phaseElapsed = currentTime - timing.phaseStartTime;
      
      switch(timing.currentPhase) {
        case 'peace':
          if (phaseElapsed > timing.peaceDuration) {
            // Start warning
            timing.currentPhase = 'warning';
            timing.phaseStartTime = currentTime;
            
            // Choose next storm
            storm.currentStorm = chooseNextStorm(storm);
            initializeStorm(storm, storm.currentStorm);
            
            console.log(`⚠️ Storm Warning: ${storm.currentStorm} incoming!`);
            recordEvent('STORM_WARNING', { type: storm.currentStorm });
          }
          break;
        case 'warning':
          if (phaseElapsed > timing.warningDuration) {
            // Start storm
            timing.currentPhase = 'active';
            timing.phaseStartTime = currentTime;
            console.log(`🌪️ Storm Active: ${storm.currentStorm}!`);
            recordEvent('STORM_START', { type: storm.currentStorm });
          }
          break;
        case 'active':
          // Update active storm
          updateActiveStorm(storm, storm.currentStorm, currentTime);
          
          if (phaseElapsed > timing.stormDuration) {
            // End storm
            timing.currentPhase = 'peace';
            timing.phaseStartTime = currentTime;
            storm.stormHistory.push(storm.currentStorm);
            console.log(`✅ Storm Ended: ${storm.currentStorm}`);
            storm.currentStorm = null;
            recordEvent('STORM_END');
          }
          break;
      }
      
      // Check for apocalypse mode
      if (!storm.apocalypse.active && currentTime > storm.apocalypse.triggerTime) {
        storm.apocalypse.active = true;
        storm.apocalypse.storms = ['THUNDER_DOME', 'TORNADO_FURY'];
        console.log('💥 APOCALYPSE MODE ACTIVATED!');
        recordEvent('APOCALYPSE_MODE');
      }
    }
    
    function chooseNextStorm(storm) {
      const level = storm.intensity.level;
      const stormTypes = storm.stormTypes;
      
      // Build pool of available storms based on level
      const pool = [];
      Object.keys(stormTypes).forEach(key => {
        const stormData = stormTypes[key];
        
        // Level restrictions
        if (key === 'TORNADO_FURY' && level < 2) return;
        if (key === 'THUNDER_DOME' && level < 2) return;
        if (key === 'HAIL_BARRAGE' && level < 2) return;
        
        // Add to pool based on chance
        const weight = Math.floor(stormData.chance * 100);
        for (let i = 0; i < weight; i++) {
          pool.push(key);
        }
      });
      
      return pool[Math.floor(Math.random() * pool.length)];
    }
    
    function initializeStorm(storm, stormType) {
      const stormData = storm.stormTypes[stormType];
      
      switch(stormType) {
        case 'RAIN_WAVE':
          stormData.waveDirection = Math.random() * Math.PI * 2;
          stormData.currentWave = 0;
          break;
        case 'WIND_VORTEX':
          stormData.vortices = [];
          for (let i = 0; i < stormData.vortexCount; i++) {
            const angle = (Math.PI * 2 / stormData.vortexCount) * i + Math.random() * 0.5;
            const radius = 100 + Math.random() * 60;
            stormData.vortices.push({
              x: centerX + Math.cos(angle) * radius,
              y: centerY + Math.sin(angle) * radius
            });
          }
          break;
        case 'LIGHTNING_STORM':
          stormData.strikes = [];
          stormData.currentStrikes = 0;
          stormData.lastStrikeTime = _simTime * 0.001;
          break;
        case 'HAIL_BARRAGE':
          stormData.hailstones = [];
          stormData.lastSpawnTime = _simTime * 0.001;
          break;
      }
    }
    
    function updateActiveStorm(storm, stormType, currentTime) {
      const stormData = storm.stormTypes[stormType];
      
      switch(stormType) {
        case 'LIGHTNING_STORM':
          if (currentTime - stormData.lastStrikeTime > stormData.strikeInterval && stormData.currentStrikes < stormData.strikeCount) {
            // Spawn new lightning strike
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 150;
            stormData.strikes.push({
              x: centerX + Math.cos(angle) * radius,
              y: centerY + Math.sin(angle) * radius,
              radius: stormData.strikeRadius
            });
            stormData.lastStrikeTime = currentTime;
            stormData.currentStrikes++;
          }
          break;
        case 'HAIL_BARRAGE':
          if (currentTime - stormData.lastSpawnTime > stormData.spawnRate && stormData.hailstones.length < stormData.totalCount) {
            // Spawn new hailstone
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 180;
            stormData.hailstones.push({
              x: centerX + Math.cos(angle) * radius,
              y: centerY + Math.sin(angle) * radius,
              hit: false
            });
            stormData.lastSpawnTime = currentTime;
          }
          break;
      }
    }
    
    function handleStormTrackPhysics(b, bSpinPercent, velocity) {
      const zones = ARENA.zones;
      const storm = ARENA.stormSystem;
      const distToCenter = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
      const currentTime = _simTime * 0.001;
      
      // ═══════════════════════════════════════════════════════════════
      // STORM SYSTEM UPDATE (once per frame)
      // ═══════════════════════════════════════════════════════════════
      if (storm && b === b1) { // Only update once per frame (when processing b1)
        const timing = storm.timing;
        
        // Check for level up
        if (currentTime - storm.intensity.lastLevelUpTime > storm.intensity.levelUpTime) {
          storm.intensity.level = Math.min(3, storm.intensity.level + 1);
          storm.intensity.lastLevelUpTime = currentTime;
          console.log(`⚡ Storm Level Up! Now at level ${storm.intensity.level}`);
          recordEvent('STORM_LEVEL_UP', { level: storm.intensity.level });
        }
        
        // Phase management
        const phaseElapsed = currentTime - timing.phaseStartTime;
        
        switch(timing.currentPhase) {
          case 'peace':
            if (phaseElapsed > timing.peaceDuration) {
              // Start warning
              timing.currentPhase = 'warning';
              timing.phaseStartTime = currentTime;
              
              // Choose next storm
              const stormTypes = storm.stormTypes;
              const pool = [];
              Object.keys(stormTypes).forEach(key => {
                const stormData = stormTypes[key];
                if (key === 'TORNADO_FURY' && storm.intensity.level < 2) return;
                if (key === 'THUNDER_DOME' && storm.intensity.level < 2) return;
                if (key === 'HAIL_BARRAGE' && storm.intensity.level < 2) return;
                const weight = Math.floor(stormData.chance * 100);
                for (let i = 0; i < weight; i++) pool.push(key);
              });
              storm.currentStorm = pool[Math.floor(Math.random() * pool.length)];
              
              // Initialize storm
              const stormData = storm.stormTypes[storm.currentStorm];
              switch(storm.currentStorm) {
                case 'RAIN_WAVE':
                  stormData.waveDirection = Math.random() * Math.PI * 2;
                  stormData.currentWave = 0;
                  break;
                case 'WIND_VORTEX':
                  stormData.vortices = [];
                  for (let i = 0; i < stormData.vortexCount; i++) {
                    const angle = (Math.PI * 2 / stormData.vortexCount) * i + Math.random() * 0.5;
                    const radius = 100 + Math.random() * 60;
                    stormData.vortices.push({
                      x: centerX + Math.cos(angle) * radius,
                      y: centerY + Math.sin(angle) * radius
                    });
                  }
                  break;
                case 'LIGHTNING_STORM':
                  stormData.strikes = [];
                  stormData.currentStrikes = 0;
                  stormData.lastStrikeTime = currentTime;
                  break;
                case 'HAIL_BARRAGE':
                  stormData.hailstones = [];
                  stormData.lastSpawnTime = currentTime;
                  break;
              }
              
              console.log(`⚠️ Storm Warning: ${storm.currentStorm} incoming!`);
              recordEvent('STORM_WARNING', { type: storm.currentStorm });
            }
            break;
          case 'warning':
            if (phaseElapsed > timing.warningDuration) {
              timing.currentPhase = 'active';
              timing.phaseStartTime = currentTime;
              console.log(`🌪️ Storm Active: ${storm.currentStorm}!`);
              recordEvent('STORM_START', { type: storm.currentStorm });
            }
            break;
          case 'active':
            // Update active storm
            const stormData = storm.stormTypes[storm.currentStorm];
            switch(storm.currentStorm) {
              case 'LIGHTNING_STORM':
                if (currentTime - stormData.lastStrikeTime > stormData.strikeInterval && stormData.currentStrikes < stormData.strikeCount) {
                  const angle = Math.random() * Math.PI * 2;
                  const radius = Math.random() * 150;
                  stormData.strikes.push({
                    x: centerX + Math.cos(angle) * radius,
                    y: centerY + Math.sin(angle) * radius,
                    radius: stormData.strikeRadius
                  });
                  stormData.lastStrikeTime = currentTime;
                  stormData.currentStrikes++;
                }
                break;
              case 'HAIL_BARRAGE':
                if (currentTime - stormData.lastSpawnTime > stormData.spawnRate && stormData.hailstones.length < stormData.totalCount) {
                  const angle = Math.random() * Math.PI * 2;
                  const radius = Math.random() * 180;
                  stormData.hailstones.push({
                    x: centerX + Math.cos(angle) * radius,
                    y: centerY + Math.sin(angle) * radius,
                    hit: false
                  });
                  stormData.lastSpawnTime = currentTime;
                }
                break;
            }
            
            if (phaseElapsed > timing.stormDuration) {
              timing.currentPhase = 'peace';
              timing.phaseStartTime = currentTime;
              storm.stormHistory.push(storm.currentStorm);
              console.log(`✅ Storm Ended: ${storm.currentStorm}`);
              storm.currentStorm = null;
              recordEvent('STORM_END');
            }
            break;
        }
        
        // Check for apocalypse mode
        if (!storm.apocalypse.active && currentTime > storm.apocalypse.triggerTime) {
          storm.apocalypse.active = true;
          storm.apocalypse.storms = ['THUNDER_DOME', 'TORNADO_FURY'];
          console.log('💥 APOCALYPSE MODE ACTIVATED!');
          recordEvent('APOCALYPSE_MODE');
        }
      }
      
      // Wall collision — órbita salta a checagem (Fix satellite launch)
      if (!b.isOrbiting && distToCenter > zones.wall - b.radius) {
        const angle = Math.atan2(b.y - centerY, b.x - centerX);
        b.x = centerX + Math.cos(angle) * (zones.wall - b.radius);
        b.y = centerY + Math.sin(angle) * (zones.wall - b.radius);
        
        const normalX = Math.cos(angle);
        const normalY = Math.sin(angle);
        const dotProduct = b.vx * normalX + b.vy * normalY;
        b.vx = b.vx - 2 * dotProduct * normalX;
        b.vy = b.vy - 2 * dotProduct * normalY;
        b.vx *= 0.75;
        b.vy *= 0.75;
        b.stamina -= 1.5;
        b.burstDamage += 0.4;
      }
      
      // Bowl effect - gravitational pull toward center
      const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
      if (distToCenter > zones.center) {
        const bowlStrength = 0.08;
        const distanceRatio = (distToCenter - zones.center) / (zones.wall - zones.center);
        const pullForce = bowlStrength * distanceRatio;
        b.vx += Math.cos(angleToCenter) * pullForce;
        b.vy += Math.sin(angleToCenter) * pullForce;
      }
      
      // Apply storm effects if active
      if (storm && storm.currentStorm && storm.timing.currentPhase === 'active') {
        applyStormEffects(b, storm.currentStorm, storm);
      }
    }
    
    function drawColosseumCarnage() {
      const zones = ARENA.zones;
      const colors = ARENA.colors;
      const time = _simTime * 0.001;
      
      // Validate zones
      if (!zones || !colors) return;
      
      const centerX = ensureFinite(500, 500);
      const centerY = ensureFinite(350, 350);
      
      // Check if walls should open (after 1.5 seconds)
      if (!ARENA.gatesOpen && battleStartTimeRef) {
        const elapsed = (_simTime - battleStartTimeRef) / 1000;
        if (elapsed >= 1.5) {
          ARENA.gatesOpen = true;
          ARENA.openTime = _simTime;
          
          // Visual feedback - explosion effect
          for (let i = 0; i < 60; i++) {
            const angle = (Math.PI * 2 / 60) * i;
            const radius = zones.wall;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            addParticle(x, y, '#ff0000', 20);
            addParticle(x, y, '#ffaa00', 15);
          }
          
          recordEvent('GATE_OPENS', {
            time: elapsed
          });
        }
      }
      
      // Draw the void (opened floor) - PURE BLACK CIRCLE
      if (ARENA.gatesOpen) {
        ctx.fillStyle = colors.void;
        ctx.beginPath();
        ctx.arc(centerX, centerY, zones.wall + 10, 0, Math.PI * 2);
        ctx.fill();
        
        // Pulsing danger zone warning
        const pulseAlpha = 0.3 + Math.sin(time * 8) * 0.2;
        ctx.globalAlpha = pulseAlpha;
        ctx.strokeStyle = colors.danger;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(centerX, centerY, zones.dangerZone, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      
      // Draw main floor (inner safe zone)
      const innerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, zones.dangerZone);
      innerGradient.addColorStop(0, colors.center);
      innerGradient.addColorStop(0.5, colors.inner);
      innerGradient.addColorStop(1, colors.outer);
      ctx.fillStyle = innerGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.dangerZone, 0, Math.PI * 2);
      ctx.fill();
      
      // Deep concave center
      const centerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, zones.centerBowl);
      centerGradient.addColorStop(0, '#000000');
      centerGradient.addColorStop(0.6, colors.center);
      centerGradient.addColorStop(1, colors.inner);
      ctx.fillStyle = centerGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.centerBowl, 0, Math.PI * 2);
      ctx.fill();
      
      // ════════════════════════════════════════════════════════════════
      // TEXTURA: GRADE METÁLICA (FASE 2)
      // ════════════════════════════════════════════════════════════════
      ctx.save();
      ctx.strokeStyle = 'rgba(120, 120, 120, 0.25)';
      ctx.lineWidth = 0.5;
      
      const gridSize = 15;
      const arenaBounds = 200;
      
      // Linhas verticais
      for (let x = -arenaBounds; x <= arenaBounds; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(centerX + x, centerY - arenaBounds);
        ctx.lineTo(centerX + x, centerY + arenaBounds);
        ctx.stroke();
      }
      
      // Linhas horizontais
      for (let y = -arenaBounds; y <= arenaBounds; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(centerX - arenaBounds, centerY + y);
        ctx.lineTo(centerX + arenaBounds, centerY + y);
        ctx.stroke();
      }
      
      // Parafusos nas interseções
      ctx.fillStyle = 'rgba(80, 80, 80, 0.4)';
      for (let x = -arenaBounds; x <= arenaBounds; x += gridSize * 3) {
        for (let y = -arenaBounds; y <= arenaBounds; y += gridSize * 3) {
          const dist = Math.sqrt((x) ** 2 + (y) ** 2);
          if (dist <= zones.dangerZone) {
            ctx.beginPath();
            ctx.arc(centerX + x, centerY + y, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      
      ctx.restore();
      
      // Walls (if not opened yet)
      if (!ARENA.gatesOpen) {
        // Solid wall ring
        ctx.strokeStyle = colors.wall;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(centerX, centerY, zones.wall, 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner wall shadow
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(centerX, centerY, zones.wall - 4, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Wall fragments falling animation
        const timeSinceOpen = (_simTime - ARENA.openTime) / 1000;
        if (timeSinceOpen < 1.5) {
          ctx.globalAlpha = 1 - (timeSinceOpen / 1.5);
          
          // Draw falling wall segments
          for (let i = 0; i < 16; i++) {
            const angle = (Math.PI * 2 / 16) * i;
            const fallProgress = timeSinceOpen * 60;
            const x = centerX + Math.cos(angle) * (zones.wall + fallProgress);
            const y = centerY + Math.sin(angle) * (zones.wall + fallProgress);
            
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle + timeSinceOpen * 3);
            ctx.fillStyle = colors.wall;
            ctx.fillRect(-8, -15, 16, 30);
            ctx.restore();
          }
          
          ctx.globalAlpha = 1;
        }
      }
      
      // Danger zone edge warning
      ctx.strokeStyle = colors.danger;
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.dangerZone, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Arena name and warning
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ARENA.name, centerX, centerY - zones.wall - 30);
      
      // Warning text
      if (!ARENA.gatesOpen) {
        const elapsed = (_simTime - (battleStartTimeRef || _simTime)) / 1000;
        const countdown = Math.max(0, 1.5 - elapsed);
        if (countdown > 0) {
          // Countdown bar
          const barWidth = 180;
          const barX = centerX - barWidth / 2;
          const barY = centerY - zones.wall - 22;
          const progress = countdown / 1.5;
          
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(barX, barY, barWidth, 18);
          const dangerColor = countdown < 0.5 ? '#ff0000' : countdown < 1.0 ? '#ff6600' : '#ffaa00';
          ctx.fillStyle = dangerColor;
          ctx.fillRect(barX, barY, barWidth * progress, 18);
          
          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = 2;
          ctx.strokeRect(barX, barY, barWidth, 18);
          
          // Pulsing cracks on the floor pre-opening
          const crackAlpha = (1.0 - progress) * 0.8;
          ctx.globalAlpha = crackAlpha;
          ctx.strokeStyle = '#ff3300';
          ctx.lineWidth = 2 + (1.0 - progress) * 3;
          for (let i = 0; i < 8; i++) {
            const crackAngle = (Math.PI * 2 / 8) * i + elapsed * 0.5;
            const crackLen = zones.dangerZone * 0.7 * (1.0 - progress * 0.5);
            ctx.beginPath();
            ctx.moveTo(centerX + Math.cos(crackAngle) * 15, centerY + Math.sin(crackAngle) * 15);
            ctx.lineTo(centerX + Math.cos(crackAngle + 0.1) * crackLen, centerY + Math.sin(crackAngle + 0.1) * crackLen);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          
          const shakeAmount = countdown < 0.5 ? (0.5 - countdown) * 4 : 0;
          ctx.fillStyle = `rgba(255,${countdown < 0.5 ? 0 : 100},0,${0.8 + Math.sin(elapsed * 15) * 0.2})`;
          ctx.font = `bold ${16 + shakeAmount}px sans-serif`;
          ctx.fillText(`💀 THE PITT OPENS IN ${countdown.toFixed(1)}s 💀`, centerX, barY - 8);
        }
      } else {
        // OPENED - lava glow at the edges of the void
        const lavaTime = _simTime * 0.001;
        const lavaGlow = ctx.createRadialGradient(centerX, centerY, zones.dangerZone * 0.8, centerX, centerY, zones.dangerZone + 15);
        lavaGlow.addColorStop(0, 'rgba(255,50,0,0)');
        lavaGlow.addColorStop(0.7, `rgba(255,100,0,${0.3 + Math.sin(lavaTime * 3) * 0.15})`);
        lavaGlow.addColorStop(1, `rgba(255,0,0,${0.5 + Math.sin(lavaTime * 5) * 0.2})`);
        ctx.fillStyle = lavaGlow;
        ctx.beginPath();
        ctx.arc(centerX, centerY, zones.dangerZone + 15, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = `rgba(255,50,0,${0.7 + Math.sin(lavaTime * 4) * 0.2})`;
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('🔥 THE PITT IS OPEN — DANGER! 🔥', centerX, centerY - zones.wall - 12);
      }
    }
    
    function drawKillerSidesArena() {
      const zones = ARENA.zones;
      const colors = ARENA.colors;
      const time = _simTime * 0.001;
      
      // Validate zones
      if (!zones || !colors) return;
      
      const centerX = ensureFinite(500, 500);
      const centerY = ensureFinite(350, 350);
      
      // Outer wall
      ctx.fillStyle = colors.wall;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.wall, 0, Math.PI * 2);
      ctx.fill();
      
      // Outer slope
      ctx.fillStyle = colors.outer;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.outerSlope, 0, Math.PI * 2);
      ctx.fill();
      
      // Tornado ridge
      ctx.fillStyle = colors.ridge;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.tornadoRidge, 0, Math.PI * 2);
      ctx.fill();
      
      // Inner slope
      ctx.fillStyle = colors.inner;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.innerSlope, 0, Math.PI * 2);
      ctx.fill();
      
      // Center bowl
      ctx.fillStyle = colors.center;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.centerBowl, 0, Math.PI * 2);
      ctx.fill();
      
      // GRIP CIRCULAR TRACK (green dashed line, almost complete circle)
      const gripPulse = 0.8 + Math.sin(time * 3) * 0.2;
      ctx.globalAlpha = gripPulse;
      
      // Calculate ramp angles
      const rampStart = ARENA.gripRampAngle - ARENA.gripRampWidth / 2;
      const rampEnd = ARENA.gripRampAngle + ARENA.gripRampWidth / 2;
      
      // Draw grip track (excluding ramp gap)
      ctx.strokeStyle = colors.grip;
      ctx.lineWidth = 8;
      ctx.setLineDash([15, 8]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.gripRadius, rampEnd, rampStart + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Draw grip glow
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
      ctx.lineWidth = 16;
      ctx.setLineDash([15, 8]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.gripRadius, rampEnd, rampStart + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      
      ctx.globalAlpha = 1;
      
      // RAMP/GAP (red arc pointing to center)
      const rampPulse = 0.9 + Math.sin(time * 4) * 0.1;
      ctx.globalAlpha = rampPulse;
      
      // Ramp arc
      ctx.strokeStyle = colors.ramp;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.gripRadius, rampStart, rampEnd);
      ctx.stroke();
      
      // Ramp glow
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.gripRadius, rampStart, rampEnd);
      ctx.stroke();
      
      // Arrow pointing to center from ramp
      const arrowAngle = ARENA.gripRampAngle;
      const arrowStartX = centerX + Math.cos(arrowAngle) * zones.gripRadius;
      const arrowStartY = centerY + Math.sin(arrowAngle) * zones.gripRadius;
      const arrowEndX = centerX + Math.cos(arrowAngle) * (zones.gripRadius - 40);
      const arrowEndY = centerY + Math.sin(arrowAngle) * (zones.gripRadius - 40);
      
      // Arrow line
      ctx.strokeStyle = colors.ramp;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(arrowStartX, arrowStartY);
      ctx.lineTo(arrowEndX, arrowEndY);
      ctx.stroke();
      
      // Arrow head
      const arrowSize = 12;
      const arrowHeadAngle1 = arrowAngle + Math.PI + 0.3;
      const arrowHeadAngle2 = arrowAngle + Math.PI - 0.3;
      ctx.beginPath();
      ctx.moveTo(arrowEndX, arrowEndY);
      ctx.lineTo(
        arrowEndX + Math.cos(arrowHeadAngle1) * arrowSize,
        arrowEndY + Math.sin(arrowHeadAngle1) * arrowSize
      );
      ctx.moveTo(arrowEndX, arrowEndY);
      ctx.lineTo(
        arrowEndX + Math.cos(arrowHeadAngle2) * arrowSize,
        arrowEndY + Math.sin(arrowHeadAngle2) * arrowSize
      );
      ctx.stroke();
      
      ctx.globalAlpha = 1;
      
      // Center target marker (X)
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      const crossSize = 10;
      ctx.beginPath();
      ctx.moveTo(centerX - crossSize, centerY - crossSize);
      ctx.lineTo(centerX + crossSize, centerY + crossSize);
      ctx.moveTo(centerX + crossSize, centerY - crossSize);
      ctx.lineTo(centerX - crossSize, centerY + crossSize);
      ctx.stroke();
      
      // Arena wall outline
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.wall, 0, Math.PI * 2);
      ctx.stroke();
      
      // Arena name
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ARENA.name, centerX, centerY - zones.wall - 30);
      
      // Info text
      ctx.fillStyle = 'rgba(16, 185, 129, 0.8)';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('🌀 GRIP → CAPTURA LENTA → LANÇA AO CENTRO 🌀', centerX, centerY - zones.wall - 12);
    }
    
    function drawCircularArena() {
      const zones = ARENA.zones;
      const colors = ARENA.colors;
      
      // Validate arena zones
      if (!zones || !colors) return;
      
      const centerX = ensureFinite(500, 500);
      const centerY = ensureFinite(350, 350);
      
      // Outer slope
      ctx.fillStyle = colors.wall;
      ctx.beginPath();
      ctx.arc(centerX, centerY, ensureFinite(zones.wall, 170), 0, Math.PI * 2);
      ctx.fill();
      
      // Outer slope gradient
      ctx.fillStyle = colors.outer;
      ctx.beginPath();
      ctx.arc(centerX, centerY, ensureFinite(zones.outerSlope, 150), 0, Math.PI * 2);
      ctx.fill();
      
      // Tornado Ridge - HIGHLIGHT IT AS DANGER ZONE
      const gradient = ctx.createRadialGradient(
        centerX, centerY, ensureFinite(zones.tornadoRidge - 15, 110), 
        centerX, centerY, ensureFinite(zones.tornadoRidge, 125)
      );
      gradient.addColorStop(0, colors.ridge);
      gradient.addColorStop(1, colors.outer);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, ensureFinite(zones.tornadoRidge, 125), 0, Math.PI * 2);
      ctx.fill();
      
      // Tornado Ridge highlight - ENHANCED PULSING WARNING
      const pulseIntensity = 0.5 + Math.sin(_simTime * 0.005) * 0.3;
      ctx.globalAlpha = pulseIntensity;
      ctx.strokeStyle = '#ffaa00';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.tornadoRidge, 0, Math.PI * 2);
      ctx.stroke();
      
      // Inner glow on ridge
      ctx.strokeStyle = '#ff6600';
      ctx.lineWidth = 4;
      ctx.globalAlpha = pulseIntensity * 0.6;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.tornadoRidge - 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      
      // SWEET SPOTS - Visual indicators
      if (ARENA.sweetSpots && ARENA.sweetSpots.length > 0) {
        ARENA.sweetSpots.forEach((spot, idx) => {
          const spotX = centerX + Math.cos(spot.angle) * spot.radius;
          const spotY = centerY + Math.sin(spot.angle) * spot.radius;
          const spotPulse = 0.6 + Math.sin(_simTime * 0.004 + idx) * 0.4;
          
          // Glowing sweet spot marker
          ctx.save();
          ctx.shadowBlur = 15 * spotPulse;
          ctx.shadowColor = '#00ff00';
          ctx.fillStyle = '#00ff00';
          ctx.globalAlpha = spotPulse;
          ctx.beginPath();
          ctx.arc(spotX, spotY, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          
          // Radiating lines from sweet spot
          ctx.strokeStyle = `rgba(0, 255, 0, ${spotPulse * 0.4})`;
          ctx.lineWidth = 2;
          for (let i = 0; i < 3; i++) {
            const offset = i * 10;
            ctx.beginPath();
            ctx.arc(spotX, spotY, 8 + offset, 0, Math.PI * 2);
            ctx.stroke();
          }
        });
      }
      
      // Inner slope
      ctx.fillStyle = colors.inner;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.innerSlope, 0, Math.PI * 2);
      ctx.fill();
      
      // Center bowl
      const centerGradient = ctx.createRadialGradient(
        centerX, centerY, 0, 
        centerX, centerY, ensureFinite(zones.centerBowl, 30)
      );
      centerGradient.addColorStop(0, colors.center);
      centerGradient.addColorStop(1, colors.inner);
      ctx.fillStyle = centerGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, ensureFinite(zones.centerBowl, 30), 0, Math.PI * 2);
      ctx.fill();
      
      // ════════════════════════════════════════════════════════════════
      // TEXTURA: PADRÃO CIRCULAR CONCÊNTRICO (FASE 2)
      // ════════════════════════════════════════════════════════════════
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      
      // Círculos concêntricos de textura
      for (let r = 30; r < zones.wall; r += 15) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      // Linhas radiais
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      for (let i = 0; i < 16; i++) {
        const angle = (Math.PI * 2 / 16) * i;
        ctx.beginPath();
        ctx.moveTo(
          centerX + Math.cos(angle) * 20,
          centerY + Math.sin(angle) * 20
        );
        ctx.lineTo(
          centerX + Math.cos(angle) * zones.wall,
          centerY + Math.sin(angle) * zones.wall
        );
        ctx.stroke();
      }
      
      // ═══════════════════════════════════════════════════════════════
      // DRAW EXITS AS ACTUAL HOLES — ROTATING RING
      // ═══════════════════════════════════════════════════════════════
      if (ARENA.exits && ARENA.exits.length > 0) {
        // Abrir exits após o tempo configurado
        if (!ARENA.exitsOpen && _simTime >= (ARENA.exitsOpenTime * 1000)) {
          ARENA.exitsOpen = true;
        }
        
        // Advance rotation cada frame (apenas se exits estiverem abertos)
        if (ARENA.exitRing && ARENA.exitsOpen) {
          ARENA.exitRing.currentAngle += ARENA.exitRing.rotationSpeed * ARENA.exitRing.direction;
        }
        const rotOffset = ARENA.exitRing ? ARENA.exitRing.currentAngle : 0;

        // Só desenhar exits se estiverem abertos
        if (ARENA.exitsOpen) {
          ctx.globalCompositeOperation = 'destination-out';

          ARENA.exits.forEach(exit => {
            const halfA = exit.halfAngle || 0.10;
            const baseAngle = exit.angle + rotOffset;
            const startAngle = baseAngle - halfA;
            const endAngle = baseAngle + halfA;

          ctx.save();
          ctx.translate(screenShake.x, screenShake.y);
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.arc(centerX, centerY, zones.wall + 20, startAngle, endAngle);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        });

        ctx.globalCompositeOperation = 'source-over';

        ARENA.exits.forEach(exit => {
          const halfA = exit.halfAngle || 0.10;
          const baseAngle = exit.angle + rotOffset;
          const startAngle = baseAngle - halfA;
          const endAngle = baseAngle + halfA;

          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.arc(centerX, centerY, zones.wall + 25, startAngle, endAngle);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = 4;
          ctx.globalAlpha = 0.6 + Math.sin(_simTime * 0.008) * 0.3;
          ctx.beginPath();
          ctx.arc(centerX, centerY, zones.wall + 2, startAngle, endAngle);
          ctx.stroke();
          ctx.globalAlpha = 1;

          const markerAngle = baseAngle;
          const markerX = centerX + Math.cos(markerAngle) * (zones.wall + 15);
          const markerY = centerY + Math.sin(markerAngle) * (zones.wall + 15);
          const markerSize = 8 + Math.sin(_simTime * 0.008) * 2;
          ctx.fillStyle = '#ff0000';
          ctx.beginPath();
          ctx.arc(markerX, markerY, markerSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffaa00';
          ctx.lineWidth = 2;
          ctx.stroke();

          for (let i = 0; i < 2; i++) {
            const arrowDist = zones.wall - 20 - (i * 20);
            const arrowX = centerX + Math.cos(markerAngle) * arrowDist;
            const arrowY = centerY + Math.sin(markerAngle) * arrowDist;
            ctx.fillStyle = `rgba(255, 170, 0, ${0.5 - i * 0.15})`;
            ctx.save();
            ctx.translate(arrowX, arrowY);
            ctx.rotate(markerAngle);
            ctx.beginPath();
            ctx.moveTo(8, 0);
            ctx.lineTo(-4, -6);
            ctx.lineTo(-4, 6);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        });

        // Rotation indicator
        const rotDir = ARENA.exitRing?.direction > 0 ? '↻' : '↺';
        ctx.fillStyle = 'rgba(180,180,220,0.55)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${rotDir} EXIT RING ROTATES`, centerX, centerY - zones.wall - 12);
        } else {
          // Exits ainda fechados - mostrar indicador
          ctx.fillStyle = 'rgba(255,100,100,0.7)';
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          const timeLeft = (ARENA.exitsOpenTime - (_simTime / 1000)).toFixed(1);
          ctx.fillText(`🔒 EXITS OPEN IN ${timeLeft}s`, centerX, centerY - zones.wall - 12);
        }
      }
      
      // Arena wall ring (what remains after exits are cut)
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 5;
      ctx.globalCompositeOperation = 'destination-over';
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.wall, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      
      // ── RED DANGER RING — pulsa mais rápido quando bey está perto ──
      const b1Dist = Math.sqrt((b1.x - centerX) ** 2 + (b1.y - centerY) ** 2);
      const b2Dist = Math.sqrt((b2.x - centerX) ** 2 + (b2.y - centerY) ** 2);
      const closestDist = Math.min(b1Dist, b2Dist);
      const dangerProximity = Math.max(0, (closestDist - zones.outerSlope) / (zones.wall - zones.outerSlope));
      const pulseSpeed = 2 + (1 - dangerProximity) * 6; // Pulsa mais rápido quando mais perto
      const _t = _simTime * 0.001;
      const ringAlpha = 0.4 + Math.sin(_t * pulseSpeed) * 0.35;
      const ringWidth = 4 + (1 - dangerProximity) * 6; // Mais grosso quando em perigo
      
      ctx.save();
      ctx.shadowBlur = 15 + (1 - dangerProximity) * 20;
      ctx.shadowColor = '#ff0000';
      ctx.strokeStyle = `rgba(255, 0, 0, ${ringAlpha})`;
      ctx.lineWidth = ringWidth;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.wall - 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      
      // ── RING-OUT SPEED INDICATOR — mostra o bey em zona de perigo ──
      [[b1, bey1], [b2, bey2]].forEach(([b, bey], idx) => {
        if (!b.alive) return;
        const bDist = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
        if (bDist > zones.outerSlope) {
          // Bey está na zona de perigo — mostrar velocidade de ring-out
          const bVel = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          const ringOutThreshold = 8.5;
          const dangerPct = Math.min(1, bVel / ringOutThreshold);
          
          const labelX = centerX + (idx === 0 ? -130 : 130);
          const labelY = centerY + 100;
          
          ctx.fillStyle = 'rgba(0,0,0,0.8)';
          ctx.fillRect(labelX - 55, labelY - 24, 110, 40);
          
          ctx.strokeStyle = dangerPct > 0.8 ? '#ff0000' : dangerPct > 0.5 ? '#ff6600' : '#ffaa00';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(labelX - 55, labelY - 24, 110, 40);
          
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#ffffff';
          ctx.fillText('⚠ PERIGO DE RING-OUT', labelX, labelY - 8);
          
          // Speed bar
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(labelX - 45, labelY + 2, 90, 8);
          const barColor = dangerPct > 0.8 ? '#ff0000' : dangerPct > 0.5 ? '#ff6600' : '#ffd700';
          ctx.fillStyle = barColor;
          ctx.fillRect(labelX - 45, labelY + 2, 90 * dangerPct, 8);
          
          // Flash quando próximo de ring-out
          if (dangerPct > 0.85) {
            ctx.globalAlpha = 0.3 + Math.sin(_t * 12) * 0.25;
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(labelX - 55, labelY - 24, 110, 40);
            ctx.globalAlpha = 1;
          }
        }
      });
      ctx.textAlign = 'center';
      
      // Arena name
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ARENA.name, centerX, centerY - zones.wall - 30);
      
      // Warning text - updated to explain new mechanic
      ctx.fillStyle = 'rgba(255, 80, 80, 0.9)';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('🔴 ANEL INTEIRO ELIMINA EM ALTA VELOCIDADE 🔴', centerX, centerY - zones.wall - 12);
    }
    
    function drawOctagonalArena() {
      const nexusZones = ARENA.zones;
      const nexusColors = ARENA.colors;
      const zones = ARENA.zones;
      const colors = ARENA.colors;
      
      // Validate zones
      if (!nexusZones || !nexusColors) return;
      
      const centerX = ensureFinite(500, 500);
      const centerY = ensureFinite(350, 350);
      
      // Draw octagonal floor
      ctx.fillStyle = nexusColors.floor;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i - Math.PI / 8;
        const x = centerX + Math.cos(angle) * nexusZones.wall;
        const y = centerY + Math.sin(angle) * nexusZones.wall;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      
      // Draw main area
      ctx.fillStyle = nexusColors.main;
      ctx.beginPath();
      ctx.arc(centerX, centerY, nexusZones.mainArea, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw center safe zone
      const centerGradient = ctx.createRadialGradient(
        centerX, centerY, 0, 
        centerX, centerY, ensureFinite(nexusZones.centerSafe, 40)
      );
      centerGradient.addColorStop(0, nexusColors.center);
      centerGradient.addColorStop(1, nexusColors.main);
      ctx.fillStyle = centerGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, ensureFinite(nexusZones.centerSafe, 40), 0, Math.PI * 2);
      ctx.fill();
      
      // ════════════════════════════════════════════════════════════════
      // TEXTURA: PADRÃO HEXAGONAL (FASE 2)
      // ════════════════════════════════════════════════════════════════
      function drawHexagon(ctx, x, y, size) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          const hx = x + size * Math.cos(angle);
          const hy = y + size * Math.sin(angle);
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.stroke();
      }
      
      const hexSize = 12;
      const hexHeight = hexSize * Math.sqrt(3);
      
      ctx.strokeStyle = 'rgba(167, 139, 250, 0.2)';
      ctx.lineWidth = 0.8;
      
      for (let x = -250; x <= 250; x += hexSize * 1.5) {
        for (let y = -250; y <= 250; y += hexHeight) {
          const offsetX = (y / hexHeight) % 2 === 0 ? 0 : hexSize * 0.75;
          const hexX = centerX + x + offsetX;
          const hexY = centerY + y;
          
          const distFromCenter = Math.sqrt(
            (hexX - centerX) ** 2 + (hexY - centerY) ** 2
          );
          if (distFromCenter > nexusZones.wall) continue;
          
          drawHexagon(ctx, hexX, hexY, hexSize);
        }
      }
      
      // Draw slope indicators (concentric circles showing the incline)
      ctx.strokeStyle = nexusColors.grid;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.2;
      
      // Inner slope circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, nexusZones.mainArea * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      
      // Mid slope circle  
      ctx.beginPath();
      ctx.arc(centerX, centerY, nexusZones.mainArea * 0.75, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.globalAlpha = 1;
      
      // Draw grid pattern
      ctx.strokeStyle = nexusColors.grid;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + Math.cos(angle) * nexusZones.wall, centerY + Math.sin(angle) * nexusZones.wall);
        ctx.stroke();
      }
      for (let r = 40; r <= nexusZones.wall; r += 40) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      // Draw slope arrows (showing the incline direction)
      ctx.strokeStyle = nexusColors.grid;
      ctx.fillStyle = nexusColors.grid;
      ctx.globalAlpha = 0.15;
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i;
        const startR = nexusZones.mainArea * 0.7;
        const endR = nexusZones.mainArea * 0.85;
        
        // Arrow line
        const startX = centerX + Math.cos(angle) * startR;
        const startY = centerY + Math.sin(angle) * startR;
        const endX = centerX + Math.cos(angle) * endR;
        const endY = centerY + Math.sin(angle) * endR;
        
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // Arrow head pointing inward
        const headLength = 8;
        const headAngle = Math.PI / 6;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(
          startX + headLength * Math.cos(angle + Math.PI - headAngle),
          startY + headLength * Math.sin(angle + Math.PI - headAngle)
        );
        ctx.moveTo(startX, startY);
        ctx.lineTo(
          startX + headLength * Math.cos(angle + Math.PI + headAngle),
          startY + headLength * Math.sin(angle + Math.PI + headAngle)
        );
        ctx.stroke();
      }
      
      ctx.globalAlpha = 1;
      
      // Draw portals - ENHANCED WITH OPENING/CLOSING EFFECTS
      ARENA.portals.forEach(portal => {
        const portalX = centerX + Math.cos(portal.angle) * portal.radius;
        const portalY = centerY + Math.sin(portal.angle) * portal.radius;
        const portalSize = 25;
        
        // Portal glow (pulsing) - ENHANCED
        const pulseIntensity = portal.active ? (0.6 + Math.sin(_simTime * 0.006) * 0.4) : 0.15;
        const glowSize = portal.active ? portalSize * 3 : portalSize * 1.5;
        
        ctx.globalAlpha = pulseIntensity;
        const glowGradient = ctx.createRadialGradient(portalX, portalY, 0, portalX, portalY, glowSize);
        glowGradient.addColorStop(0, portal.color);
        glowGradient.addColorStop(0.5, `${portal.color}80`);
        glowGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(portalX, portalY, glowSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        // Portal particles when active
        if (portal.active && Math.random() < 0.3) {
          const particleAngle = Math.random() * Math.PI * 2;
          const particleRadius = 15 + Math.random() * 10;
          const px = portalX + Math.cos(particleAngle) * particleRadius;
          const py = portalY + Math.sin(particleAngle) * particleRadius;
          
          ctx.save();
          ctx.globalAlpha = 0.6;
          ctx.fillStyle = portal.color;
          ctx.beginPath();
          ctx.arc(px, py, 2 + Math.random() * 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        
        // Portal hexagon
        ctx.save();
        ctx.translate(portalX, portalY);
        const rotationSpeed = portal.active ? 0.002 : 0.0005;
        ctx.rotate(_simTime * rotationSpeed);
        
        // Outer hexagon - THICKER when active
        ctx.strokeStyle = portal.color;
        ctx.lineWidth = portal.active ? 5 : 2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI * 2 / 6) * i;
          const x = Math.cos(angle) * portalSize;
          const y = Math.sin(angle) * portalSize;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        
        // Inner hexagon - ANIMATED
        ctx.beginPath();
        const innerScale = portal.active ? 0.6 + Math.sin(_simTime * 0.004) * 0.1 : 0.5;
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI * 2 / 6) * i + Math.PI / 6;
          const x = Math.cos(angle) * (portalSize * innerScale);
          const y = Math.sin(angle) * (portalSize * innerScale);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        
        // Portal center - SWIRLING EFFECT
        if (portal.active) {
          const innerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, portalSize * 0.5);
          innerGradient.addColorStop(0, '#ffffff');
          innerGradient.addColorStop(0.3, portal.color);
          innerGradient.addColorStop(1, 'rgba(0,0,0,0.9)');
          ctx.fillStyle = innerGradient;
          ctx.beginPath();
          ctx.arc(0, 0, portalSize * 0.5, 0, Math.PI * 2);
          ctx.fill();
          
          // Swirl lines
          ctx.strokeStyle = portal.color;
          ctx.lineWidth = 2;
          for (let i = 0; i < 4; i++) {
            const swirlAngle = (Math.PI * 2 / 4) * i + _simTime * 0.003;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(swirlAngle) * portalSize * 0.3, Math.sin(swirlAngle) * portalSize * 0.3);
            ctx.stroke();
          }
        } else {
          // Cooldown indicator - CLOSING EFFECT
          ctx.fillStyle = 'rgba(0,0,0,0.8)';
          ctx.beginPath();
          ctx.arc(0, 0, portalSize * 0.4, 0, Math.PI * 2);
          ctx.fill();
          
          // X mark when closed
          ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-portalSize * 0.2, -portalSize * 0.2);
          ctx.lineTo(portalSize * 0.2, portalSize * 0.2);
          ctx.moveTo(portalSize * 0.2, -portalSize * 0.2);
          ctx.lineTo(-portalSize * 0.2, portalSize * 0.2);
          ctx.stroke();
        }
        
        ctx.restore();
        
        // Portal label - BRIGHTER when active
        ctx.fillStyle = portal.active ? portal.color : `${portal.color}80`;
        ctx.font = portal.active ? 'bold 11px sans-serif' : 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const labelY = portalY > centerY ? portalY + portalSize + 15 : portalY - portalSize - 15;
        const labels = ['NORTH', 'EAST', 'SOUTH', 'WEST'];
        ctx.fillText(labels[portal.id], portalX, labelY);
      });
      
      // Draw octagonal wall
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 6;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i - Math.PI / 8;
        const x = centerX + Math.cos(angle) * nexusZones.wall;
        const y = centerY + Math.sin(angle) * nexusZones.wall;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      
      // ═══════════════════════════════════════════════════════════
      // PORTAL SUCTION TIMER
      // ═══════════════════════════════════════════════════════════
      if (ARENA.portalSuction && ARENA.portalSuction.enabled) {
        const suction = ARENA.portalSuction;
        const currentTime = _simTime / 1000;
        
        if (suction.currentlyActive && suction.activePortal) {
          // Show active suction with pulsing effect
          const portal = suction.activePortal;
          const elapsed = currentTime - suction.suctionStartTime;
          const remaining = suction.duration - elapsed;
          const progress = elapsed / suction.duration;
          
          // Warning at active portal
          const portalX = centerX + Math.cos(portal.angle) * portal.radius;
          const portalY = centerY + Math.sin(portal.angle) * portal.radius;
          
          ctx.save();
          ctx.shadowBlur = 20 + Math.sin(currentTime * 10) * 10;
          ctx.shadowColor = portal.color;
          ctx.fillStyle = portal.color;
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('⚡ SUCTION! ⚡', portalX, portalY - 45);
          ctx.restore();
          
          // Timer bar at top
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(centerX - 100, 30, 200, 30);
          
          ctx.fillStyle = portal.color;
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`PORTAL SUCTION: ${remaining.toFixed(1)}s`, centerX, 48);
          
          // Progress bar
          ctx.fillStyle = `rgba(255, 255, 255, 0.3)`;
          ctx.fillRect(centerX - 90, 54, 180, 4);
          ctx.fillStyle = portal.color;
          ctx.fillRect(centerX - 90, 54, 180 * progress, 4);
        } else {
          // Show cooldown until next suction
          const timeSinceLastSuction = currentTime - suction.lastSuctionTime;
          const timeUntilNext = suction.interval - timeSinceLastSuction;
          
          if (timeUntilNext > 0 && timeUntilNext < 3) {
            // Warning in last 3 seconds
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(centerX - 80, 30, 160, 25);
            
            const alpha = 0.6 + Math.sin(currentTime * 3) * 0.4;
            ctx.fillStyle = `rgba(255, 170, 0, ${alpha})`;
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`Next Suction: ${timeUntilNext.toFixed(1)}s`, centerX, 48);
          }
        }
      }
      // ═══════════════════════════════════════════════════════════
      
      // Arena name
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ARENA.name, centerX, centerY - nexusZones.wall - 30);
      
      // Additional info for NEXUS
      ctx.fillStyle = 'rgba(138, 43, 226, 0.7)';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('⬇ PISO INCLINADO + PORTAIS ⬇', centerX, centerY - nexusZones.wall - 12);
    }
    
    function drawIronCrucible() {
      // VOLCANIC RAGE v3 — HeadlessBattle visual
      const zones  = ARENA.zones || {};
      const hs     = ARENA.heatSystem    || {};
      const er     = ARENA.eruptionEvent || {};
      const fs     = ARENA.fissureSystem || {};
      const rivers = ARENA.lavaRivers    || {};
      const time   = _simTime * 0.001;

      const R_CORE = ensureFinite(zones.magmaCore,    50);
      const R_LAVA = ensureFinite(zones.lavaFlowRing, 140);
      const R_OBS  = ensureFinite(zones.obsidianBelt, 190);
      const R_WALL = ensureFinite(zones.wall,         221);

      const cx = ensureFinite(centerX, 220);
      const cy = ensureFinite(centerY, 220);

      const heatPct    = Math.max(0, Math.min(1, (hs.level || 0) / (hs.maxLevel || 100)));
      const riverAngle = time * (rivers.rotationSpeed || 0.18);

      ctx.save();
      ctx.fillStyle = '#050001';
      ctx.beginPath(); ctx.arc(cx, cy, R_WALL + 4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      ctx.save();
      const craterG = ctx.createRadialGradient(cx, cy, R_OBS, cx, cy, R_WALL + 2);
      craterG.addColorStop(0, '#2a0808'); craterG.addColorStop(1, '#0a0202');
      ctx.fillStyle = craterG;
      ctx.beginPath(); ctx.arc(cx, cy, R_WALL+2, 0, Math.PI*2); ctx.arc(cx, cy, R_OBS, 0, Math.PI*2, true); ctx.fill();
      ctx.restore();

      ctx.save();
      const obsG = ctx.createRadialGradient(cx, cy, R_LAVA, cx, cy, R_OBS);
      obsG.addColorStop(0, '#1a0c18'); obsG.addColorStop(1, '#100510');
      ctx.fillStyle = obsG;
      ctx.beginPath(); ctx.arc(cx, cy, R_OBS, 0, Math.PI*2); ctx.arc(cx, cy, R_LAVA, 0, Math.PI*2, true); ctx.fill();
      ctx.restore();

      ctx.save();
      const lavaBaseG = ctx.createRadialGradient(cx, cy, R_CORE, cx, cy, R_LAVA);
      lavaBaseG.addColorStop(0, '#4a1000'); lavaBaseG.addColorStop(1, '#200500');
      ctx.fillStyle = lavaBaseG;
      ctx.beginPath(); ctx.arc(cx, cy, R_LAVA, 0, Math.PI*2); ctx.arc(cx, cy, R_CORE, 0, Math.PI*2, true); ctx.fill();
      ctx.restore();

      const armCount   = rivers.count || 3;
      const armHalfRad = ((rivers.armWidth || 28) * Math.PI / 180) / 2;
      for (let i = 0; i < armCount; i++) {
        const armCenter = riverAngle + (Math.PI * 2 / armCount) * i;
        ctx.save();
        ctx.globalAlpha = 0.65 + Math.sin(time * 2.5 + i * 2.1) * 0.2;
        const rg = ctx.createRadialGradient(cx, cy, R_CORE, cx, cy, R_LAVA);
        rg.addColorStop(0, '#ff9900'); rg.addColorStop(0.5, '#ff3300'); rg.addColorStop(1, 'rgba(100,0,0,0)');
        ctx.fillStyle = rg; ctx.shadowBlur = 12; ctx.shadowColor = '#ff4400';
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R_LAVA, armCenter - armHalfRad, armCenter + armHalfRad);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }

      ctx.save();
      const coreG = ctx.createRadialGradient(cx, cy, 0, cx, cy, R_CORE);
      coreG.addColorStop(0, '#ffffff'); coreG.addColorStop(0.2, '#ffcc00');
      coreG.addColorStop(0.6, '#ff5500'); coreG.addColorStop(1, '#881000');
      ctx.fillStyle = coreG; ctx.shadowBlur = 25 + heatPct * 20; ctx.shadowColor = '#ff4400';
      ctx.beginPath(); ctx.arc(cx, cy, R_CORE, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 0.9; ctx.fillStyle = '#fff'; ctx.shadowBlur = 10; ctx.shadowColor = '#ffee88';
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI*2); ctx.fill();
      ctx.restore();

      if (fs.open) {
        ctx.save();
        for (let i = 0; i < (fs.count || 2); i++) {
          const fa = ((fs.baseAngle || 0) + (Math.PI*2 / (fs.count||2)) * i) % (Math.PI*2);
          const x1 = cx + Math.cos(fa)*(R_OBS+2), y1 = cy + Math.sin(fa)*(R_OBS+2);
          const x2 = cx + Math.cos(fa)*(R_WALL-2), y2 = cy + Math.sin(fa)*(R_WALL-2);
          ctx.globalAlpha = 1; ctx.strokeStyle='#020000'; ctx.lineWidth=fs.width||40; ctx.lineCap='round';
          ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
          const gp = 0.6 + Math.sin(time*5+i*2.3)*0.35;
          ctx.globalAlpha=gp; ctx.strokeStyle='#ff2200'; ctx.lineWidth=(fs.width||40)*0.5;
          ctx.shadowBlur=18; ctx.shadowColor='#ff1100';
          ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
          ctx.globalAlpha=gp*0.8; ctx.strokeStyle='#ffdd44'; ctx.lineWidth=(fs.width||40)*0.12;
          ctx.shadowBlur=8; ctx.shadowColor='#ffcc00';
          ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
        }
        ctx.restore();
      }

      if (heatPct > 0) {
        ctx.save();
        ctx.globalAlpha=0.88;
        ctx.strokeStyle = heatPct>0.8 ? '#ff0000' : heatPct>0.5 ? '#ff4400' : '#ff9900';
        ctx.lineWidth=8; ctx.lineCap='round';
        ctx.shadowBlur = heatPct>0.5 ? 12 : 4; ctx.shadowColor='#ff3300';
        ctx.beginPath(); ctx.arc(cx, cy, R_WALL-10, -Math.PI/2, -Math.PI/2 + Math.PI*2*heatPct); ctx.stroke();
        ctx.globalAlpha=1; ctx.fillStyle='rgba(255,160,60,0.85)'; ctx.font='bold 11px sans-serif'; ctx.textAlign='center'; ctx.shadowBlur=0;
        ctx.fillText('\ud83c\udf21 ' + Math.round(hs.level||0) + '%', cx, cy - R_WALL - 12);
        ctx.restore();
      }

      if (er.active) {
        const eRatio = Math.min((time-(er.startTime||0))/(er.duration||0.6),1);
        const inten = 1 - eRatio*eRatio;
        ctx.save(); ctx.globalAlpha=inten*0.75;
        const eG = ctx.createRadialGradient(cx,cy,0,cx,cy,R_OBS);
        eG.addColorStop(0,'#ffffff'); eG.addColorStop(0.15,'#ffee00'); eG.addColorStop(0.5,'#ff4400'); eG.addColorStop(1,'transparent');
        ctx.fillStyle=eG; ctx.beginPath(); ctx.arc(cx,cy,R_OBS,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=inten; ctx.fillStyle='#fff'; ctx.font='bold 16px sans-serif'; ctx.textAlign='center'; ctx.shadowBlur=20; ctx.shadowColor='#ff0000';
        ctx.fillText('\ud83c\udf0b ERUPTION!', cx, cy-R_LAVA-14);
        ctx.restore();
      }

      ctx.save();
      ctx.fillStyle='rgba(255,150,80,0.9)'; ctx.font='bold 18px sans-serif'; ctx.textAlign='center';
      ctx.shadowBlur=10; ctx.shadowColor='#ff4400';
      ctx.fillText('\ud83c\udf0b VOLCANIC RAGE', cx, cy - R_WALL - 28);
      ctx.shadowBlur=0;
      ctx.restore();
    }
    function drawPangeaPlatform() {
      // PANGEA PLATFORM: 6 tectonic plates as pie slices rotating independently
      const zones = ARENA.zones;
      const colors = ARENA.colors;
      const seismic = ARENA.seismic;
      const time = _simTime * 0.001;

      if (!zones || !colors || !ARENA.plates) return;

      const cx = ensureFinite(500, 500);
      const cy = ensureFinite(350, 350);

      // Earthquake screen shake
      let shakeX = 0, shakeY = 0;
      if (seismic && seismic.active) {
        const shakeIntensity = (seismic.intensity || 3.5) * 1.5;
        shakeX = (Math.random() - 0.5) * shakeIntensity;
        shakeY = (Math.random() - 0.5) * shakeIntensity;
      }

      ctx.save();
      ctx.translate(shakeX, shakeY);

      // Outer wall background (earthy dark)
      ctx.fillStyle = '#1a2a0a';
      ctx.beginPath();
      ctx.arc(cx, cy, zones.wall, 0, Math.PI * 2);
      ctx.fill();

      // Draw 6 tectonic plates as pie slices
      const plateCount = ARENA.plates.length;
      const plateArc = (Math.PI * 2) / plateCount;

      ARENA.plates.forEach((plate, index) => {
        const startAngle = plate.currentAngle - plateArc / 2;
        const endAngle = plate.currentAngle + plateArc / 2;
        const plateColor = (colors.plates && colors.plates[index]) || '#4a6b2a';

        // Plate fill (from center stable zone edge outward)
        ctx.fillStyle = plateColor;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, zones.plateZone, startAngle, endAngle);
        ctx.closePath();
        ctx.fill();

        // Geological texture lines within each plate
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        for (let r = zones.centerStable + 20; r < zones.plateZone - 10; r += 22) {
          ctx.beginPath();
          ctx.arc(cx, cy, r, startAngle + 0.05, endAngle - 0.05);
          ctx.stroke();
        }

        // Fault line at the leading edge of each plate
        ctx.strokeStyle = colors.faultLine || '#8b4513';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(
          cx + Math.cos(startAngle) * zones.centerStable,
          cy + Math.sin(startAngle) * zones.centerStable
        );
        ctx.lineTo(
          cx + Math.cos(startAngle) * zones.plateZone,
          cy + Math.sin(startAngle) * zones.plateZone
        );
        ctx.stroke();
        ctx.setLineDash([]);

        // Plate direction indicator arrow
        const midAngle = plate.currentAngle;
        const arrowR = (zones.centerStable + zones.plateZone) / 2;
        const ax = cx + Math.cos(midAngle) * arrowR;
        const ay = cy + Math.sin(midAngle) * arrowR;
        const tangDir = midAngle + (Math.PI / 2) * plate.direction;

        ctx.save();
        ctx.translate(ax, ay);
        ctx.rotate(tangDir);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(-6, -5);
        ctx.lineTo(-6, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });

      // Center stable zone (solid, no rotation)
      const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, zones.centerStable);
      centerGrad.addColorStop(0, '#7aaa40');
      centerGrad.addColorStop(1, colors.center || '#2d5016');
      ctx.fillStyle = centerGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, zones.centerStable, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ESTÁVEL', cx, cy + 4);

      // Earthquake visual effect
      if (seismic && seismic.active) {
        ctx.strokeStyle = colors.quake || '#ff6b6b';
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.4 + Math.sin(time * 25) * 0.4;
        ctx.beginPath();
        ctx.arc(cx, cy, zones.plateZone * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.fillStyle = colors.quake || '#ff6b6b';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('🌍 TERREMOTO!', cx, cy - zones.wall + 20);
      } else if (seismic) {
        const currentTime = _simTime / 1000;
        const timeToNext = seismic.interval - (currentTime - seismic.lastQuakeTime);
        ctx.fillStyle = 'rgba(255,107,107,0.65)';
        ctx.font = '11px sans-serif';
        ctx.fillText(`💥 Terremoto em: ${Math.max(0, timeToNext).toFixed(1)}s`, cx, cy - zones.wall + 18);
      }

      // Outer wall ring
      ctx.strokeStyle = '#8b6b3a';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, zones.wall, 0, Math.PI * 2);
      ctx.stroke();

      // Arena name
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(ARENA.name, cx, cy - zones.wall - 30);

      ctx.fillStyle = 'rgba(100, 220, 100, 0.75)';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('🌍 6 PLACAS TECTÔNICAS | TERREMOTOS A CADA 12s', cx, cy - zones.wall - 12);

      ctx.restore();
    }
    
    function drawPinballInferno() {
      // ═══════════════════════════════════════════════════════════════════
      // PINBALL INFERNO V3 — Neon Grid floor + pink border + score HUD
      // ═══════════════════════════════════════════════════════════════════
      const colors = ARENA.colors;
      const time   = _simTime * 0.001;
      const arenaR = ARENA.arenaRadius;
      const cx = centerX, cy = centerY;

      // ── CLIP CIRCLE ──────────────────────────────────────────────────
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, arenaR, 0, Math.PI * 2);
      ctx.clip();

      // ── FLOOR: Dark base ─────────────────────────────────────────────
      ctx.fillStyle = '#040010';
      ctx.fillRect(cx - arenaR, cy - arenaR, arenaR * 2, arenaR * 2);

      // ── FLOOR: Neon cyan grid ─────────────────────────────────────────
      const gridStep = 22;
      ctx.strokeStyle = `rgba(0, 245, 255, ${0.07 + Math.sin(time * 1.2) * 0.02})`;
      ctx.lineWidth = 0.8;
      for (let gx = cx - arenaR; gx <= cx + arenaR; gx += gridStep) {
        ctx.beginPath(); ctx.moveTo(gx, cy - arenaR); ctx.lineTo(gx, cy + arenaR); ctx.stroke();
      }
      for (let gy = cy - arenaR; gy <= cy + arenaR; gy += gridStep) {
        ctx.beginPath(); ctx.moveTo(cx - arenaR, gy); ctx.lineTo(cx + arenaR, gy); ctx.stroke();
      }

      // ── FLOOR: Pink diagonal grid ─────────────────────────────────────
      ctx.strokeStyle = `rgba(255, 45, 120, ${0.05 + Math.sin(time * 0.7) * 0.02})`;
      ctx.lineWidth = 0.6;
      for (let i = -arenaR * 2; i <= arenaR * 2; i += gridStep * 1.5) {
        ctx.beginPath(); ctx.moveTo(cx + i, cy - arenaR); ctx.lineTo(cx + i + arenaR * 2, cy + arenaR); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + i, cy - arenaR); ctx.lineTo(cx + i - arenaR * 2, cy + arenaR); ctx.stroke();
      }

      // ── FLOOR: Radial glow overlay ────────────────────────────────────
      const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, arenaR);
      radGrad.addColorStop(0,    `rgba(0, 245, 255, ${0.06 + Math.sin(time * 2) * 0.02})`);
      radGrad.addColorStop(0.35, 'rgba(0,0,0,0)');
      radGrad.addColorStop(0.75, 'rgba(255, 45, 120, 0.04)');
      radGrad.addColorStop(1,    'rgba(255, 45, 120, 0.14)');
      ctx.fillStyle = radGrad;
      ctx.fillRect(cx - arenaR, cy - arenaR, arenaR * 2, arenaR * 2);

      ctx.restore(); // end clip

      // ── OUTER PINK NEON BORDER ────────────────────────────────────────
      const glowPulse = 0.7 + 0.3 * Math.sin(time * 2);
      for (let i = 6; i >= 1; i--) {
        ctx.beginPath();
        ctx.arc(cx, cy, arenaR + i * 3, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 45, 120, ${glowPulse * 0.05 * (7 - i)})`;
        ctx.lineWidth = 5;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(cx, cy, arenaR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 45, 120, ${0.85 + 0.15 * Math.sin(time * 2)})`;
      ctx.lineWidth = 4;
      ctx.shadowColor = '#ff2d78';
      ctx.shadowBlur  = 18;
      ctx.stroke();
      ctx.shadowBlur = 0;
      // inner edge
      ctx.beginPath();
      ctx.arc(cx, cy, arenaR - 6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 45, 120, 0.18)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // ── SIDE BUMPERS (4 diagonal) ─────────────────────────────────────
      ARENA.bumpers.forEach(bumper => {
        const bx      = cx + bumper.x;
        const by      = cy + bumper.y;
        const isActive = bumper.active || bumper.cooldown > 0;
        const pulse    = 0.85 + 0.15 * Math.sin(time * 2.5 + bumper.id);

        // outer glow
        ctx.beginPath();
        ctx.arc(bx, by, bumper.radius + 10, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? 'rgba(255, 200, 30, 0.18)' : 'rgba(100, 60, 160, 0.08)';
        ctx.fill();

        // body
        ctx.beginPath();
        ctx.arc(bx, by, bumper.radius, 0, Math.PI * 2);
        const bg = ctx.createRadialGradient(bx - bumper.radius * 0.3, by - bumper.radius * 0.3, 1, bx, by, bumper.radius);
        if (isActive) {
          bg.addColorStop(0, '#fff8c0');
          bg.addColorStop(1, '#ff9900');
        } else {
          bg.addColorStop(0, '#2a1a3a');
          bg.addColorStop(1, '#100818');
        }
        ctx.fillStyle = bg;
        ctx.shadowColor = isActive ? '#ffaa00' : '#441166';
        ctx.shadowBlur  = isActive ? 20 : 6;
        ctx.fill();

        // outer ring
        ctx.beginPath();
        ctx.arc(bx, by, bumper.radius, 0, Math.PI * 2);
        ctx.strokeStyle = isActive
          ? `rgba(255, 180, 0, ${pulse})`
          : `rgba(140, 80, 200, ${0.5 * pulse})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // inner ring
        ctx.beginPath();
        ctx.arc(bx, by, bumper.radius * 0.52, 0, Math.PI * 2);
        ctx.strokeStyle = isActive ? 'rgba(255,255,255,0.5)' : 'rgba(200, 160, 255, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.shadowBlur = 0;
        if (bumper.cooldown > 0) {
          bumper.cooldown -= 1 / 60;
          if (bumper.cooldown <= 0) bumper.active = false;
        }
      });

      // ── CENTER SCORE BUMPER ───────────────────────────────────────────
      const cb       = ARENA.centerBumper;
      const cbActive = cb.cooldown > 0;
      const cbPulse  = 0.6 + 0.4 * Math.sin(time * 3.5);
      const scores   = ARENA.score || { b1: 0, b2: 0 };
      const maxScore = cb.pointsGoal;

      // Score progress arcs (b1=pink from top, b2=cyan from bottom)
      if (scores.b1 > 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, cb.radius + 16, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * Math.min(scores.b1 / maxScore, 1)));
        ctx.strokeStyle = '#ff2d78';
        ctx.lineWidth   = 4;
        ctx.shadowColor = '#ff2d78';
        ctx.shadowBlur  = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      if (scores.b2 > 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, cb.radius + 22, Math.PI / 2, Math.PI / 2 + (Math.PI * 2 * Math.min(scores.b2 / maxScore, 1)));
        ctx.strokeStyle = '#00f5ff';
        ctx.lineWidth   = 4;
        ctx.shadowColor = '#00f5ff';
        ctx.shadowBlur  = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // glow layers
      for (let r = cb.radius + 22; r > cb.radius; r -= 5) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = cbActive
          ? `rgba(255,255,255, ${(r - cb.radius) * 0.025})`
          : `rgba(0,245,255, ${(r - cb.radius) * 0.012 * cbPulse})`;
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      // body
      ctx.beginPath();
      ctx.arc(cx, cy, cb.radius, 0, Math.PI * 2);
      const cbGrad = ctx.createRadialGradient(cx - 6, cy - 6, 2, cx, cy, cb.radius);
      if (cbActive) {
        cbGrad.addColorStop(0, '#ffffff');
        cbGrad.addColorStop(0.5, '#88ffff');
        cbGrad.addColorStop(1, 'rgba(0, 245, 255, 0.9)');
      } else {
        cbGrad.addColorStop(0, `rgba(100, 240, 255, ${0.7 + 0.3 * cbPulse})`);
        cbGrad.addColorStop(1, `rgba(0, 100, 200, ${0.5 + 0.2 * cbPulse})`);
      }
      ctx.fillStyle  = cbGrad;
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur  = cbActive ? 35 : 18 * cbPulse;
      ctx.fill();
      // ring
      ctx.beginPath();
      ctx.arc(cx, cy, cb.radius, 0, Math.PI * 2);
      ctx.strokeStyle = cbActive ? '#ffffff' : `rgba(0, 245, 255, ${0.7 + 0.3 * cbPulse})`;
      ctx.lineWidth   = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
      // label
      ctx.fillStyle       = cbActive ? '#000' : 'rgba(255,255,255,0.9)';
      ctx.font            = 'bold 9px monospace';
      ctx.textAlign       = 'center';
      ctx.textBaseline    = 'middle';
      ctx.fillText('1K', cx, cy);

      // ── FLIPPERS ─────────────────────────────────────────────────────
      ARENA.flippers.forEach(flipper => {
        const fx       = cx + flipper.x;
        const fy       = cy + flipper.y;
        const isActive = flipper.active || flipper.cooldown > 0;
        const len      = 50;

        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(flipper.angle);

        ctx.shadowColor = '#4169ff';
        ctx.shadowBlur  = isActive ? 22 : 10;

        const fGrad = ctx.createLinearGradient(-len / 2, 0, len / 2, 0);
        fGrad.addColorStop(0, isActive ? '#99aaff' : '#2244cc');
        fGrad.addColorStop(1, isActive ? '#4169ff' : '#0f2080');
        ctx.fillStyle = fGrad;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-len / 2, -7, len, 14, 7);
        else ctx.rect(-len / 2, -7, len, 14);
        ctx.fill();

        // highlight
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-len / 2 + 2, -6, len - 4, 5, 3);
        else ctx.rect(-len / 2 + 2, -6, len - 4, 5);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.restore();

        if (flipper.cooldown > 0) {
          flipper.cooldown -= 1 / 60;
          if (flipper.cooldown <= 0) flipper.active = false;
        }
      });

      // ── RING OUT GAP ──────────────────────────────────────────────────
      const rog       = ARENA.ringOutGap;
      const rogX      = cx + rog.x;
      const rogY      = cy + rog.y;
      const dangPulse = 0.5 + 0.5 * Math.abs(Math.sin(time * 5));

      ctx.fillStyle = `rgba(255, 30, 30, ${0.12 + 0.08 * dangPulse})`;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(rogX - rog.width / 2 - 4, rogY - rog.height / 2 - 4, rog.width + 8, rog.height + 8, 5);
      else ctx.rect(rogX - rog.width / 2 - 4, rogY - rog.height / 2 - 4, rog.width + 8, rog.height + 8);
      ctx.fill();

      ctx.fillStyle = '#010005';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(rogX - rog.width / 2, rogY - rog.height / 2, rog.width, rog.height, 4);
      else ctx.rect(rogX - rog.width / 2, rogY - rog.height / 2, rog.width, rog.height);
      ctx.fill();

      ctx.strokeStyle = `rgba(255, 30, 30, ${0.6 + 0.4 * dangPulse})`;
      ctx.lineWidth   = 1.5;
      ctx.shadowColor = '#ff2222';
      ctx.shadowBlur  = 10;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(rogX - rog.width / 2, rogY - rog.height / 2, rog.width, rog.height, 4);
      else ctx.rect(rogX - rog.width / 2, rogY - rog.height / 2, rog.width, rog.height);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // ── SCORE HUD (top of arena) ──────────────────────────────────────
      const hudY = cy - arenaR + 18;
      ctx.font         = 'bold 11px monospace';
      ctx.textBaseline = 'middle';

      ctx.fillStyle = '#ff2d78';
      ctx.textAlign = 'left';
      ctx.fillText(`\u25C6 ${scores.b1 || 0}`, cx - arenaR + 10, hudY);

      ctx.fillStyle = 'rgba(255,215,0,0.55)';
      ctx.textAlign = 'center';
      ctx.fillText(`/ ${cb.pointsGoal}`, cx, hudY);

      ctx.fillStyle = '#00f5ff';
      ctx.textAlign = 'right';
      ctx.fillText(`${scores.b2 || 0} \u25C6`, cx + arenaR - 10, hudY);
    }

    function drawVortexColiseum() {
      const zones = ARENA.zones;
      const colors = ARENA.colors;
      const time = _simTime * 0.001;
      
      // Update vortex rotation
      const vortexSpeed = ARENA.vortex.inversed ? -ARENA.vortex.rotationSpeed : ARENA.vortex.rotationSpeed;
      ARENA.vortex.currentAngle += vortexSpeed * (1/60);
      
      // Update storm surge timer
      ARENA.vortex.surgeTimer += 1/60;
      if (ARENA.vortex.surgeTimer >= ARENA.vortex.surgeCooldown) {
        ARENA.vortex.inversed = true;
        if (ARENA.vortex.surgeTimer >= ARENA.vortex.surgeCooldown + ARENA.vortex.surgeDuration) {
          ARENA.vortex.inversed = false;
          ARENA.vortex.surgeTimer = 0;
        }
      }
      
      // Draw outer wall
      ctx.fillStyle = colors.wall;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.wall, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw outer orbit zone
      const outerGradient = ctx.createRadialGradient(centerX, centerY, zones.middleOrbit, centerX, centerY, zones.outerOrbit);
      outerGradient.addColorStop(0, colors.middle);
      outerGradient.addColorStop(1, colors.outer);
      ctx.fillStyle = outerGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.outerOrbit, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw middle orbit zone
      const middleGradient = ctx.createRadialGradient(centerX, centerY, zones.innerOrbit, centerX, centerY, zones.middleOrbit);
      middleGradient.addColorStop(0, colors.inner);
      middleGradient.addColorStop(1, colors.middle);
      ctx.fillStyle = middleGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.middleOrbit, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw inner orbit zone
      const innerGradient = ctx.createRadialGradient(centerX, centerY, zones.vortexCore, centerX, centerY, zones.innerOrbit);
      innerGradient.addColorStop(0, colors.core);
      innerGradient.addColorStop(1, colors.inner);
      ctx.fillStyle = innerGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.innerOrbit, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw vortex core with spinning effect
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(ARENA.vortex.currentAngle);
      
      // Vortex spiral lines
      ctx.strokeStyle = colors.vortex;
      ctx.lineWidth = 3;
      for (let i = 0; i < 8; i++) {
        const startAngle = (Math.PI * 2 / 8) * i;
        ctx.beginPath();
        for (let r = zones.vortexCore; r < zones.innerOrbit; r += 2) {
          const spiralAngle = startAngle + (r / zones.innerOrbit) * Math.PI;
          const x = Math.cos(spiralAngle) * r;
          const y = Math.sin(spiralAngle) * r;
          if (r === zones.vortexCore) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }
      
      ctx.restore();
      
      // Draw vortex core center
      const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, zones.vortexCore);
      coreGradient.addColorStop(0, '#ffffff');
      coreGradient.addColorStop(0.3, colors.vortex);
      coreGradient.addColorStop(1, colors.core);
      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.vortexCore, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw orbit boundary lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      // Inner orbit boundary
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.innerOrbit, 0, Math.PI * 2);
      ctx.stroke();
      
      // Middle orbit boundary
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.middleOrbit, 0, Math.PI * 2);
      ctx.stroke();
      
      // Outer orbit boundary
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.outerOrbit, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.setLineDash([]);
      
      // Draw slingshot points
      ARENA.slingshotPoints.forEach((slingshot, idx) => {
        const slingshotX = centerX + Math.cos(slingshot.angle) * slingshot.radius;
        const slingshotY = centerY + Math.sin(slingshot.angle) * slingshot.radius;
        
        const pulseSize = slingshot.cooldown > 0 ? 1.3 : 1.0;
        const glowIntensity = slingshot.cooldown > 0 ? 0.8 : 0.4;
        
        // Glow effect
        ctx.save();
        ctx.shadowBlur = 20 * glowIntensity;
        ctx.shadowColor = colors.slingshot;
        ctx.fillStyle = colors.slingshot;
        ctx.beginPath();
        ctx.arc(slingshotX, slingshotY, 10 * pulseSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(slingshotX, slingshotY, 10 * pulseSize, 0, Math.PI * 2);
        ctx.stroke();
        
        // Arrow pointing inward
        ctx.save();
        ctx.translate(slingshotX, slingshotY);
        ctx.rotate(slingshot.angle + Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('→', 0, 5);
        ctx.restore();
        
        // Cooldown
        if (slingshot.cooldown > 0) {
          slingshot.cooldown -= 1/60;
        }
      });
      
      // Draw bumpers
      if (ARENA.bumpers) {
        ARENA.bumpers.forEach(bumper => {
          const bumperX = centerX + Math.cos(bumper.angle) * bumper.radius;
          const bumperY = centerY + Math.sin(bumper.angle) * bumper.radius;
          
          const pulseSize = bumper.cooldown > 0 ? 1.2 : 1.0;
          const glowIntensity = bumper.cooldown > 0 ? 0.9 : 0.5;
          
          // Glow effect
          ctx.save();
          ctx.shadowBlur = 15 * glowIntensity;
          ctx.shadowColor = bumper.color;
          ctx.fillStyle = bumper.color;
          ctx.beginPath();
          ctx.arc(bumperX, bumperY, bumper.size * pulseSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          
          // Border
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(bumperX, bumperY, bumper.size * pulseSize, 0, Math.PI * 2);
          ctx.stroke();
          
          // Inner circle
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.beginPath();
          ctx.arc(bumperX, bumperY, bumper.size * pulseSize * 0.5, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      
      // Arena wall
      ctx.strokeStyle = colors.vortex;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.wall, 0, Math.PI * 2);
      ctx.stroke();
      
      // ── STORM SURGE STATUS + BUILDUP ─────────────────────────
      const surgeTimer = ARENA.vortex.surgeTimer;
      const surgeCooldown = ARENA.vortex.surgeCooldown;
      const surgeActive = ARENA.vortex.inversed;
      const timeToSurge = surgeCooldown - surgeTimer;
      
      const vBarWidth = 240;
      const vBarX = centerX - vBarWidth / 2;
      const vBarY = centerY - zones.wall - 58;
      
      if (surgeActive) {
        // SURGE ACTIVE - Red pulsing overlay on core
        const surgeGlow = 0.3 + Math.sin(_simTime * 0.08) * 0.25;
        ctx.globalAlpha = surgeGlow;
        ctx.fillStyle = '#ff2200';
        ctx.beginPath();
        ctx.arc(centerX, centerY, zones.innerOrbit, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        ctx.save();
        ctx.shadowBlur = 30 + Math.sin(_simTime * 0.05) * 10;
        ctx.shadowColor = '#ff0000';
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${18 + Math.sin(_simTime * 0.06) * 2}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('⚡  STORM SURGE!  ⚡', centerX, vBarY + 16);
        ctx.restore();
        
        addScreenShake && surgeTimer % 0.5 < 0.02 && addScreenShake(0.5);
        
      } else if (timeToSurge < 2.5) {
        // BUILDUP PHASE - core glows progressively white
        const buildIntensity = (2.5 - timeToSurge) / 2.5;
        const buildGlow = buildIntensity * 0.5;
        
        ctx.globalAlpha = buildGlow;
        const buildColor = `rgba(255, ${Math.floor(255 * (1 - buildIntensity))}, 0, 1)`;
        ctx.fillStyle = buildColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, zones.vortexCore * (1 + buildIntensity * 0.8), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        // Charge bar
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(vBarX - 5, vBarY - 5, vBarWidth + 10, 32);
        
        const surgeColor = buildIntensity > 0.7 ? '#ff0000' : buildIntensity > 0.4 ? '#ff6600' : '#c084fc';
        ctx.fillStyle = surgeColor;
        ctx.fillRect(vBarX, vBarY, vBarWidth * buildIntensity, 22);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(vBarX, vBarY, vBarWidth, 22);
        
        const pulseAlpha = 0.8 + Math.sin(_simTime * 0.07) * 0.2;
        ctx.fillStyle = `rgba(255,255,255,${pulseAlpha})`;
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`⚠ STORM SURGE EM ${timeToSurge.toFixed(1)}s ⚠`, centerX, vBarY + 15);
        
      } else {
        // Normal state - show calm meter
        const calmProgress = (surgeCooldown - timeToSurge) / surgeCooldown;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(vBarX - 5, vBarY - 5, vBarWidth + 10, 32);
        ctx.fillStyle = '#4c1d95';
        ctx.fillRect(vBarX, vBarY, vBarWidth * calmProgress, 22);
        ctx.strokeStyle = 'rgba(192,132,252,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(vBarX, vBarY, vBarWidth, 22);
        ctx.fillStyle = 'rgba(192,132,252,0.7)';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🌀  VÓRTEX COLISEUM  🌀', centerX, vBarY + 15);
      }
      
      // Arena name
      ctx.save();
      ctx.shadowBlur = 20 + Math.sin(time * 2) * 10;
      ctx.shadowColor = colors.vortex;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ARENA.name, centerX, centerY - zones.wall - 30);
      ctx.restore();
      
      // MOMENTUM STACKS HUD — bigger and clearer
      if (ARENA.momentum) {
        const stacks1 = Math.floor(ARENA.momentum.bey1Stacks);
        const stacks2 = Math.floor(ARENA.momentum.bey2Stacks);
        
        // Player 1 momentum (left side)
        if (stacks1 > 0) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
          ctx.fillRect(15, centerY - 35, 140, 50);
          
          ctx.fillStyle = '#a78bfa';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`⭐ MOMENTUM`, 25, centerY - 14);
          
          // Stars display
          let starText = '';
          for (let i = 0; i < Math.min(stacks1, 5); i++) starText += '★';
          if (stacks1 > 5) starText += `+${stacks1 - 5}`;
          ctx.fillStyle = stacks1 >= 3 ? '#ff6600' : '#fbbf24';
          ctx.font = `bold ${stacks1 >= 3 ? 20 : 16}px sans-serif`;
          ctx.fillText(starText, 25, centerY + 10);
          
          // Burst ready indicator
          if (stacks1 >= 3) {
            ctx.fillStyle = `rgba(255,100,0,${0.5 + Math.sin(_simTime * 0.07) * 0.4})`;
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText('⚡ BURST READY!', 25, centerY + 28);
          }
        }
        
        // Player 2 momentum (right side)
        if (stacks2 > 0) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
          ctx.fillRect(canvas.width - 155, centerY - 35, 140, 50);
          
          ctx.fillStyle = '#a78bfa';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(`MOMENTUM ⭐`, canvas.width - 25, centerY - 14);
          
          let starText = '';
          for (let i = 0; i < Math.min(stacks2, 5); i++) starText += '★';
          if (stacks2 > 5) starText = `${stacks2 - 5}+` + starText;
          ctx.fillStyle = stacks2 >= 3 ? '#ff6600' : '#fbbf24';
          ctx.font = `bold ${stacks2 >= 3 ? 20 : 16}px sans-serif`;
          ctx.fillText(starText, canvas.width - 25, centerY + 10);
          
          if (stacks2 >= 3) {
            ctx.fillStyle = `rgba(255,100,0,${0.5 + Math.sin(_simTime * 0.07) * 0.4})`;
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText('⚡ BURST READY!', canvas.width - 25, centerY + 28);
          }
        }
        
        ctx.textAlign = 'center'; // Reset alignment
      }
      
      // Orbit labels
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      
      // Inner orbit label
      ctx.fillStyle = colors.inner;
      ctx.fillText('⚡ FAST', centerX, centerY - zones.innerOrbit - 8);
      
      // Middle orbit label
      ctx.fillStyle = colors.middle;
      ctx.fillText('⚖️ BALANCED', centerX, centerY - zones.middleOrbit - 8);
      
      // Outer orbit label
      ctx.fillStyle = colors.outer;
      ctx.fillText('🛡️ SAFE', centerX, centerY - zones.outerOrbit - 8);
    }
    
    function update() {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      drawArena();
      
      // Iluminação da arena (FASE 2 - Pseudo-3D)
      drawArenaLighting();
      
      // Opposite spin indicator
      if (isOppositeSpin) {
        ctx.save();
        ctx.globalAlpha = 0.3 + Math.sin(_simTime * 0.005) * 0.2;
        ctx.fillStyle = '#ff00ff';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        const yPos = (ARENA.type === 'circular' || ARENA.type === 'pinball_v3')
          ? centerY - (ARENA.zones?.wall || ARENA.arenaRadius || 165) - 50
          : centerY - ARENA.zones.height / 2.5 - 50;
        ctx.fillText('⚡ OPPOSITE SPIN', centerX, yPos);
        ctx.restore();
      }
      
      
      // ════════════════════════════════════════════════════════════════
      // RENDERIZAÇÃO DE PARTÍCULAS v2.0 (FASE 1)
      // ════════════════════════════════════════════════════════════════
      for (let i = gameParticles.length - 1; i >= 0; i--) {
        const p = gameParticles[i];
        
        // Atualizar física
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        
        // Atualizar rotação
        if (p.rotationSpeed) {
          p.rotation += p.rotationSpeed;
        }
        
        // Atualizar idade e vida
        p.age += 0.016; // ~60fps
        const lifePercent = p.age / p.maxLife;
        
        // Calcular fade baseado no tipo
        if (p.fade === 'linear') {
          p.life = 1 - lifePercent;
        } else if (p.fade === 'quadratic') {
          p.life = Math.pow(1 - lifePercent, 2);
        } else if (p.fade === 'exponential') {
          p.life = Math.exp(-lifePercent * 3);
        }
        
        // Remover se morreu
        if (p.life <= 0 || p.age >= p.maxLife) {
          gameParticles.splice(i, 1);
          continue;
        }
        
        // Aplicar expansion
        if (p.expansion > 1) {
          p.scale = 1 + (p.expansion - 1) * lifePercent;
        }
        
        // Aplicar pulse
        if (p.pulse) {
          p.scale *= 1 + Math.sin(p.age * p.pulseSpeed * Math.PI * 2) * 0.2;
        }
        
        const renderSize = p.size * p.scale;
        
        // Configurar alpha
        ctx.globalAlpha = p.life;
        
        // Configurar glow
        if (p.glow) {
          ctx.shadowBlur = p.glowIntensity * p.life;
          ctx.shadowColor = p.color;
        }
        
        // Configurar blur (fumaça)
        if (p.blur) {
          ctx.filter = `blur(${2 * p.scale}px)`;
        }
        
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        
        ctx.fillStyle = p.color;
        
        // Desenhar forma
        switch(p.shape) {
          case 'star':
            drawStar(ctx, 0, 0, 5, renderSize * 2, renderSize);
            break;
            
          case 'cross':
            drawCross(ctx, 0, 0, renderSize);
            break;
            
          case 'diamond':
            drawDiamond(ctx, 0, 0, renderSize);
            break;
            
          case 'plus':
            drawPlus(ctx, 0, 0, renderSize);
            break;
            
          case 'ring':
            ctx.strokeStyle = p.color;
            ctx.lineWidth = Math.max(1, renderSize * 0.3);
            ctx.beginPath();
            ctx.arc(0, 0, renderSize, 0, Math.PI * 2);
            ctx.stroke();
            break;
            
          case 'wave':
            drawWave(ctx, 0, 0, renderSize);
            break;
            
          case 'square':
            ctx.fillRect(-renderSize, -renderSize, renderSize * 2, renderSize * 2);
            break;
            
          case 'triangle':
            ctx.beginPath();
            ctx.moveTo(0, -renderSize);
            ctx.lineTo(renderSize, renderSize);
            ctx.lineTo(-renderSize, renderSize);
            ctx.closePath();
            ctx.fill();
            break;
            
          default: // circle
            ctx.beginPath();
            ctx.arc(0, 0, renderSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
        
        // Reset effects
        ctx.shadowBlur = 0;
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
      }
      
      
      for (let i = gameBrokenPieces.length - 1; i >= 0; i--) {
        const piece = gameBrokenPieces[i];
        
        if (!piece.settled) {
          piece.x += piece.vx;
          piece.y += piece.vy;
          piece.vy += piece.gravity;
          piece.vx *= 0.98;
          piece.rotation += piece.rotationSpeed;
          
          // Check if piece hit the "ground" (bottom 20% of arena or near center)
          const distToCenter = Math.sqrt((piece.x - centerX) ** 2 + (piece.y - centerY) ** 2);
          const arenaRadius = ARENA.zones?.wall || ARENA.arenaRadius || 165;
          
          // Bounce physics
          if (distToCenter > arenaRadius - 20 || piece.y > centerY + 100) {
            if (!piece.bounced) {
              piece.vy *= -0.4; // Bounce
              piece.vx *= 0.7;
              piece.bounced = true;
            } else {
              // Settle on ground
              piece.settled = true;
              piece.vx = 0;
              piece.vy = 0;
              piece.rotationSpeed *= 0.5;
              
              // Move to permanent debris
              permanentDebris.push({...piece, opacity: 1});
              gameBrokenPieces.splice(i, 1);
              continue;
            }
          }
          
          // Slow down rotation
          piece.rotationSpeed *= 0.99;
        }
        
        // Draw piece
        ctx.globalAlpha = 1;
        ctx.save();
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.rotation);
        
        if (piece.type === 'layer') {
          ctx.fillStyle = piece.color;
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let j = 0; j < 6; j++) {
            const angle = (Math.PI * 2 / 6) * j;
            const px = Math.cos(angle) * piece.size;
            const py = Math.sin(angle) * piece.size;
            if (j === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (piece.type === 'disc') {
          ctx.fillStyle = piece.color;
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, piece.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          // Disc details
          ctx.fillStyle = '#333';
          ctx.beginPath();
          ctx.arc(0, 0, piece.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (piece.type === 'driver') {
          ctx.fillStyle = piece.color;
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -piece.size);
          ctx.lineTo(piece.size * 0.7, piece.size);
          ctx.lineTo(-piece.size * 0.7, piece.size);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        
        ctx.restore();
      }
      
      // Draw permanent debris (settled pieces)
      for (const debris of permanentDebris) {
        ctx.globalAlpha = debris.opacity * 0.8;
        ctx.save();
        ctx.translate(debris.x, debris.y);
        ctx.rotate(debris.rotation);
        
        if (debris.type === 'layer') {
          ctx.fillStyle = debris.color;
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let j = 0; j < 6; j++) {
            const angle = (Math.PI * 2 / 6) * j;
            const px = Math.cos(angle) * debris.size;
            const py = Math.sin(angle) * debris.size;
            if (j === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (debris.type === 'disc') {
          ctx.fillStyle = debris.color;
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, debris.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          ctx.fillStyle = '#333';
          ctx.beginPath();
          ctx.arc(0, 0, debris.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (debris.type === 'driver') {
          ctx.fillStyle = debris.color;
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -debris.size);
          ctx.lineTo(debris.size * 0.7, debris.size);
          ctx.lineTo(-debris.size * 0.7, debris.size);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      
      // ═══════════════════════════════════════════════════════════════
      // SPIN FINISH SYSTEM - Progressive Fall Animation
      // ═══════════════════════════════════════════════════════════════
      // Flow:
      // 1. Stamina/Spin hits 0 → Start tipping animation (isTipping = true)
      // 2. Tipping animation plays (~1-2 seconds)
      // 3. When tippingAngle reaches 90° → fellOver = true
      // 4. ONLY THEN declare winner
      // 
      // This prevents the "frozen game" bug where alive = false was set
      // before the animation completed, creating an inconsistent state
      // ═══════════════════════════════════════════════════════════════
      
      [b1, b2].forEach(b => {
        if (!b.alive) return; // Skip physics for dead beyblades
        
        // ETERNAL SPIN (STA 27+) - Stamina congelada por 5s iniciais
        if (b.eternalSpinActive && b.eternalSpinTimer < 300) { // 300 frames = ~5s a 60fps
          b.eternalSpinTimer++;
          if (b.eternalSpinTimer === 1) {
            addParticle(b.x, b.y, '#00ff88', 60);
            recordEvent('ETERNAL_SPIN_ACTIVATED', { bey: b === b1 ? 'b1' : 'b2' });
          }
        }
        
        const bSpinPercent = (b.spinSpeed / b.stats.maxSpin);
        const velocity = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        
        // CELESTIAL ROTATION (SPIN 50+) - Ganha spin ao se mover
        if (b.hasCelestialRotation && velocity > 4) {
          b.spinSpeed += 0.15;
          b.spinSpeed = Math.min(b.stats.maxSpin, b.spinSpeed); // Cap no máximo
          if (Math.random() < 0.05) {
            addParticle(b.x, b.y, '#ffd700', 8);
          }
        }
        
        // GRAVITY WELL (WEIGHT 27+) - Puxa oponente continuamente
        if (b.hasGravityWell) {
          const opponent = b === b1 ? b2 : b1;
          if (opponent.alive) {
            const dx = b.x - opponent.x;
            const dy = b.y - opponent.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0 && dist < 150) {
              const pullForce = 0.3;
              opponent.vx += (dx / dist) * pullForce;
              opponent.vy += (dy / dist) * pullForce;
              
              if (Math.random() < 0.03) {
                addParticle(opponent.x, opponent.y, '#8b008b', 5);
              }
            }
          }
        }
        
        // ========== ARMOR CONTINUOUS EFFECTS ==========
        
        // Air Glide (Feather Frame) - Less friction
        if (b.armorEffect === 'air_glide') {
          b.vx *= 1.003; // Slight boost to counteract normal friction
          b.vy *= 1.003;
        }
        
        // Center Pull (Gravity Disk)
        if (b.armorEffect === 'center_pull') {
          const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
          const distToCenter = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
          if (distToCenter > 40) {
            b.vx += Math.cos(angleToCenter) * 0.25;
            b.vy += Math.sin(angleToCenter) * 0.25;
          }
        }
        
        // Regen Aura (Solar Disc)
        if (b.armorEffect === 'regen_aura') {
          b.stamina += 0.5;
          b.stamina = Math.min(250, b.stamina); // Cap no máximo
          if (Math.random() < 0.02) {
            addParticle(b.x, b.y, '#ffa500', 5);
          }
        }
        
        // Void Pulse (removes buffs every 5s)
        if (b.armorEffect === 'void_pulse') {
          b.armorVoidPulseTimer++;
          if (b.armorVoidPulseTimer >= 300) { // 5s at 60fps
            b.armorVoidPulseTimer = 0;
            const opponent = b === b1 ? b2 : b1;
            opponent.armorBurnStacks = [];
            opponent.armorAdaptiveDefense = Math.max(0, opponent.armorAdaptiveDefense - 3);
            addParticle(b.x, b.y, '#000000', 40);
            addParticle(opponent.x, opponent.y, '#ffffff', 30);
            recordEvent('VOID_PULSE', { caster: b === b1 ? 'b1' : 'b2' });
          }
        }
        
        // Apply Burn DoT
        for (let i = b.armorBurnStacks.length - 1; i >= 0; i--) {
          const burn = b.armorBurnStacks[i];
          b.stamina -= burn.damage / 60; // Damage per frame
          burn.duration--;
          if (burn.duration <= 0) {
            b.armorBurnStacks.splice(i, 1);
          }
        }

        // ═══════════════════════════════════════════════════════════════
        // 🆕 EFEITOS CONTÍNUOS DAS NOVAS PARTS
        // ═══════════════════════════════════════════════════════════════
        const bOpponent = b === b1 ? b2 : b1;

        // Poison DoT (Scorpion Tail)
        if ((b.armorPoisonStacks || 0) > 0) {
          b.stamina -= b.armorPoisonStacks / 60;
        }

        // Ice Wall cooldown (Permafrost)
        if (!b.armorIceWallReady && b.bey?.armor?.effect === 'ice_wall') {
          const cooldown = (b.bey.armor.cooldown || 8) * 60; // frames
          if (!b._iceWallFrames) b._iceWallFrames = 0;
          b._iceWallFrames++;
          if (b._iceWallFrames >= cooldown) { b.armorIceWallReady = true; b._iceWallFrames = 0; }
        }

        // Spectrum Shift element cycling (Prism Shell)
        if (b.bey?.armor?.effect === 'spectrum_shift') {
          const arm = b.bey.armor;
          const intervalFrames = (arm.shiftInterval || 5.0) * 60;
          if (!b._elementFrames) b._elementFrames = 0;
          b._elementFrames++;
          if (b._elementFrames >= intervalFrames) {
            b.armorCurrentElement = ((b.armorCurrentElement || 0) + 1) % (arm.elements?.length || 4);
            b._elementFrames = 0;
          }
        }

        // Cyclone pull effect
        if (b.bey?.disc?.special === 'pull_effect' && bOpponent?.alive) {
          const dis = b.bey.disc;
          const dx = b.x - bOpponent.x;
          const dy = b.y - bOpponent.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < (dis.specialValue || 25) && dist > 0) {
            bOpponent.vx += (dx / dist) * 0.3;
            bOpponent.vy += (dy / dist) * 0.3;
          }
        }

        // Spiral regen
        if (b.bey?.driver?.special === 'regen_boost') {
          b.stamina = Math.min(250, b.stamina + (b.bey.driver.specialValue || 0.5) / 60);
        }

        // Sprint burst speed (primeiros ~3s = 180 frames)
        if (b.bey?.driver?.special === 'burst_speed' && !b.driverBurstSpeedApplied) {
          const boost = b.bey.driver.specialValue || 0.50;
          b.vx *= (1 + boost);
          b.vy *= (1 + boost);
          b.driverBurstSpeedApplied = true;
          recordEvent('BURST_SPEED', { bey: b === b1 ? 'b1' : 'b2' });
        }

        // Equilibrium - estabilidade mínima
        if (b.bey?.driver?.special === 'wobble_immunity') {
          b.stability = Math.max(b.stability, 20);
        }
        if (b.launchPattern === 'flower' && bSpinPercent > 0.3) {
          // Banking/Flower Pattern - already handled in Tornado Ridge section but enhance it
          b.flowerPatternPhase += 0.18;
        } else if (b.launchPattern === 'wobble' && bSpinPercent > 0.2) {
          // Weak Launch - unstable wobbling makes it harder to hit
          const wobbleX = Math.sin(_simTime * 0.015) * 3;
          const wobbleY = Math.cos(_simTime * 0.015) * 3;
          b.x += wobbleX;
          b.y += wobbleY;
          
          // Weak launch benefits from opposite spin
          if (isOppositeSpin && Math.random() < 0.05) {
            b.stamina += 0.3; // Slight stamina regen
            b.stamina = Math.min(250, b.stamina); // Cap no máximo
            addParticle(b.x, b.y, '#8b5cf6', 3);
          }
        } else if (b.launchPattern === 'center') {
          // Flat Launch - strong center pull
          const distToCenter = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
          if (distToCenter > 50) {
            const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
            b.vx += Math.cos(angleToCenter) * 0.5;
            b.vy += Math.sin(angleToCenter) * 0.5;
          }
        } else if (b.launchPattern === 'aggressive' && velocity > 6) {
          // Power Launch - maintain high speed
          const speedBoost = 1.02;
          b.vx *= speedBoost;
          b.vy *= speedBoost;
          
          if (Math.random() < 0.03) {
            addParticle(b.x, b.y, '#ef4444', 5);
          }
        } else if (b.launchPattern === 'sliding') {
          // SLIDING SHOOT - Stays on outer edge at high speed
          const distToCenter = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
          const targetRadius = arenaType === 'NEXUS' ? 130 : 140;
          
          if (distToCenter < targetRadius - 20) {
            // Push back to edge
            const angle = Math.atan2(b.y - centerY, b.x - centerX);
            b.vx += Math.cos(angle) * 0.8;
            b.vy += Math.sin(angle) * 0.8;
          }
          
          // Tangential boost to maintain speed
          const angle = Math.atan2(b.y - centerY, b.x - centerX);
          const tangentX = -Math.sin(angle);
          const tangentY = Math.cos(angle);
          b.vx += tangentX * 0.3;
          b.vy += tangentY * 0.3;
          
          if (Math.random() < 0.05) {
            addParticle(b.x, b.y, '#22c55e', 5);
          }
        } else if (b.launchPattern === 'gattyaki') {
          // GATTYAKI - Delayed launch, conserves spin early
          if (bSpinPercent > 0.7) {
            // In early game, move slowly
            b.vx *= 0.95;
            b.vy *= 0.95;
          } else {
            // Late game, become aggressive
            b.vx *= 1.01;
            b.vy *= 1.01;
          }
        } else if (b.launchPattern === 'tornado_stall') {
          // TORNADO STALLING - Stay on tornado ridge
          const distToCenter = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
          const tornadoRadius = arenaType === 'NEXUS' ? 120 : (arenaType === 'BB10_COMPETITIVE' ? 125 : 115);
          
          if (Math.abs(distToCenter - tornadoRadius) > 15) {
            const angle = Math.atan2(b.y - centerY, b.x - centerX);
            if (distToCenter < tornadoRadius) {
              b.vx += Math.cos(angle) * 0.4;
              b.vy += Math.sin(angle) * 0.4;
            } else {
              b.vx -= Math.cos(angle) * 0.4;
              b.vy -= Math.sin(angle) * 0.4;
            }
          }
          
          // Circular motion
          const ridgeAngle = Math.atan2(b.y - centerY, b.x - centerX);
          const tangentX = -Math.sin(ridgeAngle);
          const tangentY = Math.cos(ridgeAngle);
          b.vx += tangentX * 0.2;
          b.vy += tangentY * 0.2;
        } else if (b.launchPattern === 'rush') {
          // RUSH LAUNCH - Burns out fast
          if (bSpinPercent > 0.5) {
            b.vx *= 1.03; // Super fast early
            b.vy *= 1.03;
            b.spinSpeed *= 0.993; // But loses spin faster
            
            if (Math.random() < 0.05) {
              addParticle(b.x, b.y, '#f97316', 8);
            }
          }
        } else if (b.launchPattern === 'catapult') {
          // CATAPULT - Upper attack trajectory
          const opponent = b === b1 ? b2 : b1;
          if (opponent && opponent.alive) {
            const dx = opponent.x - b.x;
            const dy = opponent.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 100 && velocity > 5) {
              // Boost toward opponent
              b.vx += (dx / dist) * 0.4;
              b.vy += (dy / dist) * 0.4;
              
              if (Math.random() < 0.03) {
                addParticle(b.x, b.y, '#eab308', 6);
              }
            }
          }
        } else if (b.launchPattern === 'snipe') {
          // SNIPE - Aims directly at opponent
          const opponent = b === b1 ? b2 : b1;
          if (opponent && opponent.alive && velocity > 3) {
            const dx = opponent.x - b.x;
            const dy = opponent.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 40) {
              const targetAngle = Math.atan2(dy, dx);
              const currentAngle = Math.atan2(b.vy, b.vx);
              const angleDiff = targetAngle - currentAngle;
              
              // Steer toward target
              b.vx += Math.cos(targetAngle) * 0.3;
              b.vy += Math.sin(targetAngle) * 0.3;
            }
          }
        } else if (b.launchPattern === 'drift') {
          // DRIFT - Unpredictable movement
          const driftPhase = _simTime * 0.003;
          b.vx += Math.sin(driftPhase) * 0.4;
          b.vy += Math.cos(driftPhase * 1.3) * 0.4;
          
          if (Math.random() < 0.05) {
            addParticle(b.x, b.y, '#3b82f6', 4);
          }
        } else if (b.launchPattern === 'barrage') {
          // BARRAGE - Rapid direction changes for multi-hits
          if (Math.random() < 0.1) {
            const randomAngle = Math.random() * Math.PI * 2;
            b.vx += Math.cos(randomAngle) * 1.5;
            b.vy += Math.sin(randomAngle) * 1.5;
            addParticle(b.x, b.y, '#a3e635', 10);
          }
        } else if (b.launchPattern === 'defensive') {
          // DEFENSIVE - Minimize movement and damage
          b.vx *= 0.97;
          b.vy *= 0.97;
          
          // Stay near center
          const distToCenter = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
          if (distToCenter > 60) {
            const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
            b.vx += Math.cos(angleToCenter) * 0.3;
            b.vy += Math.sin(angleToCenter) * 0.3;
          }
        } else if (b.launchPattern === 'chaos') {
          // CHAOS - Completely erratic
          if (Math.random() < 0.15) {
            b.vx += (Math.random() - 0.5) * 2;
            b.vy += (Math.random() - 0.5) * 2;
            addParticle(b.x, b.y, '#c026d3', 6);
          }
        } else if (b.launchPattern === 'pocket_avoid' && arenaType === 'BURST') {
          // POCKET AVOIDANCE - Stays away from pockets
          if (ARENA.pockets) {
            ARENA.pockets.forEach(pocket => {
              const pocketX = centerX + Math.cos(pocket.angle) * ARENA.zones.wall;
              const pocketY = centerY + Math.sin(pocket.angle) * ARENA.zones.wall;
              const distToPocket = Math.sqrt((b.x - pocketX) ** 2 + (b.y - pocketY) ** 2);
              
              if (distToPocket < 60) {
                const awayAngle = Math.atan2(b.y - pocketY, b.x - pocketX);
                b.vx += Math.cos(awayAngle) * 0.6;
                b.vy += Math.sin(awayAngle) * 0.6;
                addParticle(b.x, b.y, '#0ea5e9', 5);
              }
            });
          }
        } else if (b.launchPattern === 'exit_rush' && arenaType === 'BB10_COMPETITIVE') {
          // EXIT RUSH - Aims for exits (with rotation tracking)
          if (ARENA.exits && velocity > 7) {
            let nearestExit = null;
            let nearestDist = Infinity;
            const rotOff = ARENA.exitRing ? ARENA.exitRing.currentAngle : 0;

            ARENA.exits.forEach(exit => {
              const exitAngleRot = exit.angle + rotOff;
              const exitX = centerX + Math.cos(exitAngleRot) * (ARENA.zones.wall + 10);
              const exitY = centerY + Math.sin(exitAngleRot) * (ARENA.zones.wall + 10);
              const dist = Math.sqrt((b.x - exitX) ** 2 + (b.y - exitY) ** 2);

              if (dist < nearestDist) {
                nearestDist = dist;
                nearestExit = { ...exit, rotatedAngle: exitAngleRot };
              }
            });

            if (nearestExit && nearestDist < 80) {
              const exitAngle = nearestExit.rotatedAngle;
              b.vx += Math.cos(exitAngle) * 0.5;
              b.vy += Math.sin(exitAngle) * 0.5;

              if (Math.random() < 0.05) {
                addParticle(b.x, b.y, '#fb923c', 8);
              }
            }
          }
        } else if (b.launchPattern === 'portal_jump' && arenaType === 'NEXUS') {
          // PORTAL JUMP - Actively seeks portals
          if (ARENA.portals && b.portalCooldown <= 0) {
            let nearestPortal = null;
            let nearestDist = Infinity;
            
            ARENA.portals.forEach(portal => {
              if (!portal.active) return;
              const portalX = centerX + Math.cos(portal.angle) * portal.radius;
              const portalY = centerY + Math.sin(portal.angle) * portal.radius;
              const dist = Math.sqrt((b.x - portalX) ** 2 + (b.y - portalY) ** 2);
              
              if (dist < nearestDist) {
                nearestDist = dist;
                nearestPortal = { x: portalX, y: portalY };
              }
            });
            
            if (nearestPortal && nearestDist < 100 && velocity > 3) {
              const portalAngle = Math.atan2(nearestPortal.y - b.y, nearestPortal.x - b.x);
              b.vx += Math.cos(portalAngle) * 0.4;
              b.vy += Math.sin(portalAngle) * 0.4;
              
              if (Math.random() < 0.05) {
                addParticle(b.x, b.y, '#8b5cf6', 6);
              }
            }
          }
        }
        
        if (arenaType === 'NEXUS') {
          handleOctagonalArenaPhysics(b, bSpinPercent, velocity);
        } else if (arenaType === 'VOLCANIC_RAGE') {
          handleIronCruciblePhysics(b, bSpinPercent, velocity);
        } else if (arenaType === 'PANGEA_PLATFORM') {
          handlePangeaPlatformPhysics(b, bSpinPercent, velocity);
        } else if (arenaType === 'COLOSSEUM_CARNAGE') {
          handleColosseumCarnagePhysics(b, bSpinPercent, velocity);
        } else if (arenaType === 'KILLER_SIDES') {
          handleKillerSidesPhysics(b, bSpinPercent, velocity);
        } else if (arenaType === 'PINBALL_INFERNO') {
          handlePinballInfernoPhysics(b, bSpinPercent, velocity);
        } else if (arenaType === 'VORTEX_COLISEUM') {
          handleVortexColiseumPhysics(b, bSpinPercent, velocity);
        } else if (arenaType === 'SPEEDWAY_CIRCUIT') {
          handleSpeedwayCircuitPhysics(b, bSpinPercent, velocity);
        } else if (arenaType === 'DOMINATION_ZONES') {
          handleDominationZonesPhysics(b, bSpinPercent, velocity);
        } else if (arenaType === 'TIDAL_SURGE') {
          handleTidalSurgePhysics(b, bSpinPercent, velocity);
        } else if (arenaType === 'STORM_TRACK') {
          handleStormTrackPhysics(b, bSpinPercent, velocity);
        } else {
          handleCircularArenaPhysics(b, bSpinPercent, velocity);
        }
        
        // Common physics
        if (bSpinPercent < 0.3) {
          const wobbleAmount = (0.3 - bSpinPercent) * 2;
          b.x += Math.sin(_simTime * 0.02) * wobbleAmount;
          b.y += Math.cos(_simTime * 0.02) * wobbleAmount;
          
          // Wobbling causes gradual stability loss
          const wobbleStabilityLoss = (0.3 - bSpinPercent) * 0.15;
          b.stability -= wobbleStabilityLoss;
          
          // Visual feedback when wobbling hard
          if (bSpinPercent < 0.15 && Math.random() < 0.05) {
            addParticle(b.x, b.y, '#ff9900', 3);
          }
        }
        
        // ── CAMPO GRAVITACIONAL (PESO 27): oponente próximo perde 10% velocity/frame ──
        if (b.hasCampoGravitacional) {
          const opp = b === b1 ? b2 : b1;
          const dxG = opp.x - b.x, dyG = opp.y - b.y;
          const distG = Math.sqrt(dxG*dxG + dyG*dyG);
          if (distG < 65 && opp.alive) {
            opp.vx *= 0.90;
            opp.vy *= 0.90;
            if (Math.random() < 0.08) addParticle(b.x, b.y, '#8b008b', 8);
          }
        }

        // ── ESPIRAL ETERNA: colisao custou +12 stamina (sinalizado por flag) ──
        if (b._espiralEternaHitPenalty) { b.stamina -= 12; b._espiralEternaHitPenalty = false; }

        // 🛰️ SATELLITE: órbita controla posição diretamente — pular integração de velocidade
        if (!b.isOrbiting) {
          b.x += b.vx;
          b.y += b.vy;
        }
        b.rotation += b.spinSpeed * 0.1 * b.spinDirection;
        
        // ── POST-MOVEMENT HARD WALL CLAMP (BB10_COMPETITIVE) ─────────
        // 🛰️ SATELLITE: pular clamp durante órbita — updateOrbit já garante posição válida
        if (arenaType === 'BB10_COMPETITIVE' && !b.isOrbiting) {
          const _pDist = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
          const _pWall = ARENA.zones.wall - 34;
          if (_pDist > _pWall - b.radius) {
            const _pAngle = Math.atan2(b.y - centerY, b.x - centerX);
            let _inPocket = false;
            if (ARENA.exitsOpen && ARENA.exits) {
              ARENA.exits.forEach(exit => {
                let _angleDiff = _pAngle - exit.angle;
                _angleDiff = ((_angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
                const _halfA = (exit.width / 25) * 0.32;
                if (Math.abs(_angleDiff) < _halfA) _inPocket = true;
              });
            }
            if (!_inPocket) {
              b.x = centerX + Math.cos(_pAngle) * (_pWall - b.radius);
              b.y = centerY + Math.sin(_pAngle) * (_pWall - b.radius);
              const _dot = b.vx * Math.cos(_pAngle) + b.vy * Math.sin(_pAngle);
              if (_dot > 0) {
                b.vx -= 2 * _dot * Math.cos(_pAngle);
                b.vy -= 2 * _dot * Math.sin(_pAngle);
                b.vx *= 0.7;
                b.vy *= 0.7;
              }
            }
          }
        }
        // ─────────────────────────────────────────────────────────────
        const hasInfiniteSpin = b.bey?.breakpoints?.some(bp => bp?.stat === 'SPIN') || false;
        let spinDecay = hasInfiniteSpin ? 0.9995 : 0.998;

        // ── INERCIA (STA 17): decay 35% menor ──
        if (b.hasInercia) spinDecay = 1 - (1 - spinDecay) * 0.65;

        // ── ESPIRAL ETERNA (STA 27): quando spin < 35%, decay para por 8s (mas colisoes custam +12 stamina) ──
        if (b.hasEspiralEterna && !b.fellOver) {
          if (bSpinPercent < 0.35 && !b._espiralEternaTriggered) {
            b._espiralEternaActive = true;
            b._espiralEternaUntil = _simTime + 8000;
            b._espiralEternaTriggered = true;
            addParticle(b.x, b.y, '#00ffcc', 30);
            recordEvent('ESPIRAL_ETERNA', { bey: b === b1 ? 'b1' : 'b2' });
          }
          if (b._espiralEternaActive && _simTime < b._espiralEternaUntil) {
            spinDecay = 1.0; // sem decay
          } else if (b._espiralEternaActive && _simTime >= b._espiralEternaUntil) {
            b._espiralEternaActive = false;
          }
        }

        // ── NUCLEO PERPETUO (SPIN 27): quando spin < 40%, halva decay pelo resto do round ──
        if (b.hasNucleoPerpetuo && !b._nucleoPerpetuoTriggered && bSpinPercent < 0.40) {
          b._nucleoPerpetuoActive = true;
          b._nucleoPerpetuoTriggered = true;
          addParticle(b.x, b.y, '#e0f2fe', 25);
          recordEvent('NUCLEO_PERPETUO', { bey: b === b1 ? 'b1' : 'b2' });
        }
        if (b._nucleoPerpetuoActive) spinDecay = 1 - (1 - spinDecay) * 0.50;

        // ── CORTE PRECISO: drena stability ao longo do tempo (stacks do oponente) ──
        if (b._corteStacksOnOpp > 0) {
          if (_simTime < b._corteExpiryOnOpp) {
            b.stability -= b._corteStacksOnOpp * 2 * (16.67 / 1000); // 2 stability/s por stack
          } else {
            b._corteStacksOnOpp = 0;
          }
        }

        b.spinSpeed *= spinDecay;
        
        // Additional spin decay at low spin speeds
        if (bSpinPercent < 0.3) {
          b.spinSpeed *= 0.995;
        }
        
        // VISUAL: Slow rotation when dying
        if (bSpinPercent < 0.2) {
          // Super slow rotation - visível ao olho
          b.spinSpeed *= 0.993;
          
          // Partículas de "cansaço"
          if (Math.random() < 0.05) {
            addParticle(b.x, b.y, '#888', 2);
          }
        }
        
        if (bSpinPercent < 0.25 && Math.random() < 0.1) {
          addParticle(b.x, b.y, '#fbbf24', 3);
        }
        
        // Check if spin speed is too low to continue - START TIPPING
        // FIX: usa percentual (consistente com drawBey que usa < 0.15)
        // Antes: spinSpeed < 0.3 (absoluto = nunca disparava, spin começa em ~90+)
        if (bSpinPercent < 0.15 && !b.isTipping && !b.fellOver && !winner && !burstTriggered) {
          // Start tipping animation
          b.isTipping = true;
          b.lastStopTime = _simTime;
          recordEvent('SPIN_TOO_LOW', {
            bey: b === b1 ? 'b1' : 'b2',
            finalSpin: b.spinSpeed,
            spinPercent: bSpinPercent
          });
        }
        
        // Progressive Burst System with Critical Hits
        const burstThreshold = 50 - ((b.bey?.effectiveStats?.bal || 10) * 1.0);
        
        // Check for instant burst conditions
        let instantBurst = false;
        
        // Critical Burst from accumulated damage
        if (b.burstDamage >= burstThreshold && !winner && !burstTriggered) {
          instantBurst = true;
        }
        
        // Emergency burst check - very fragile beyblades
        if (b.burstDamage >= 35 && (b.bey?.effectiveStats?.bal || 10) < 8 && !winner && !burstTriggered) {
          instantBurst = true;
        }
        
        if (instantBurst) {
          recordEvent('BURST', {
            bey: b === b1 ? 'b1' : 'b2',
            burstDamage: b.burstDamage,
            threshold: burstThreshold
          });
          burstTriggered = true;
          burstDelay = 30;
          createBurstEffect(b);
          b.alive = false;
          b.burstTime = _simTime;
          
          // Check for simultaneous burst (Draw)
          const opponent = b === b1 ? b2 : b1;
          if (opponent.burstTime && Math.abs(b.burstTime - opponent.burstTime) < 50) {
            winner = 'DRAW';
            winMethod = 'Draw (Double Burst)';
            recordEvent('DRAW', { reason: 'Both burst simultaneously' });
          }
        }
        
        // Stamina depletion - START TIPPING animation when stamina hits 0
        if (b.stamina <= 0 && !b.isTipping && !b.fellOver && !winner && !burstTriggered) {
          // Start tipping animation
          b.isTipping = true;
          b.staminaDepletionTime = _simTime;
          recordEvent('STAMINA_DEPLETED', {
            bey: b === b1 ? 'b1' : 'b2'
          });
        }
        
        // Slower stamina loss when stamina is very low - extend endgame
        if (b.stamina < 30 && b.stamina > 0) {
          const lowStaminaPenalty = (30 - b.stamina) * 0.02; // Reduced from 0.03
          b.stamina -= lowStaminaPenalty;
        }
      });
      
      // ════════════════════════════════════════════════════════════════════
      // CARNAGE COLOSSEUM — Física Oval + 8 Eventos (mirror de BattleArena.jsx)
      function handleColosseumCarnagePhysics(b, bSpinPercent, velocity) {
        const zones = ARENA.zones;
        const ce    = ARENA.carnageEvent;
        const currentTime = _simTime * 0.001;

        // ── Revelação do evento aos 3s (headless) ──────────────────────
        if (!ce.revealed && currentTime >= ce.revealTime) {
          ce.revealed    = true;
          const idx      = Math.floor(Math.random() * ce.events.length);
          ce.activeEvent = ce.events[idx];

          if (ce.activeEvent === 'PHANTOM_PAIR') {
            const wA = zones.wallA;
            ce.phantomBlades = [
              { x: -(wA - 20), y: 0, vx: 6, vy: 1.5, radius: 18, hp: 80, alive: true },
              { x:  (wA - 20), y: 0, vx: -6, vy: -1.5, radius: 18, hp: 80, alive: true },
            ];
          }
          if (ce.activeEvent === 'THE_CHAMPION') {
            ce.championBlade = { x: -(zones.wallA - 30), y: 0, vx: 14, vy: 0, radius: 36, hp: 200, alive: true };
          }
          if (ce.activeEvent === 'THE_EXECUTIONER') {
            ce.executioner.currentA = zones.wallA;
            ce.executioner.phase    = 0;
          }
          if (ce.activeEvent === 'DIVINE_JUDGMENT') {
            ce.divine.nextStrikeTimer = 4.0;
            ce.divine.strikes = []; ce.divine.warnings = [];
          }
          recordEvent('CARNAGE_EVENT_REVEALED', { event: ce.activeEvent });
        }

        // ── Atualização contínua (apenas no b1 para evitar duplo update) ─
        if (b === b1 && ce.revealed && ce.activeEvent) {
          const dt = 1/60;
          const timeSinceReveal = currentTime - ce.revealTime;

          // PHANTOM_PAIR move
          if (ce.activeEvent === 'PHANTOM_PAIR') {
            ce.phantomBlades.forEach(ph => {
              if (!ph.alive) return;
              ph.x += ph.vx * dt; ph.y += ph.vy * dt;
              const wA = zones.wallA, wB = zones.wallB;
              if (Math.abs(ph.x) > wA - ph.radius) { ph.vx *= -0.9; ph.x = Math.sign(ph.x) * (wA - ph.radius); }
              if (Math.abs(ph.y) > wB - ph.radius) { ph.vy *= -0.9; ph.y = Math.sign(ph.y) * (wB - ph.radius); }
            });
          }

          // THE_CHAMPION move
          if (ce.activeEvent === 'THE_CHAMPION' && ce.championBlade?.alive) {
            const ch = ce.championBlade;
            ch.x += ch.vx * dt; ch.y += ch.vy * dt;
            const wA = zones.wallA, wB = zones.wallB;
            const px = ch.x, py = ch.y;
            const ovalVal = (px / (wA - ch.radius)) ** 2 + (py / (wB - ch.radius)) ** 2;
            if (ovalVal >= 1) {
              const nX = px / ((wA - ch.radius) ** 2), nY = py / ((wB - ch.radius) ** 2);
              const nL = Math.sqrt(nX**2 + nY**2) || 1;
              const nx = nX/nL, ny = nY/nL;
              const dot = ch.vx*nx + ch.vy*ny;
              ch.vx -= 2*dot*nx; ch.vy -= 2*dot*ny;
              ch.vx *= 0.85; ch.vy *= 0.85;
              const t = 1/Math.sqrt(ovalVal);
              ch.x = px*t; ch.y = py*t;
            }
          }

          // SANDSTORM switch direction
          if (ce.activeEvent === 'SANDSTORM') {
            ce.sandstorm.timer += dt;
            if (ce.sandstorm.timer >= ce.sandstorm.switchInterval) {
              ce.sandstorm.timer = 0;
              ce.sandstorm.direction *= -1;
            }
          }

          // THE_EXECUTIONER compression
          if (ce.activeEvent === 'THE_EXECUTIONER') {
            const ex = ce.executioner;
            if (ex.phase === 0 && timeSinceReveal >= ex.firstAt && !ex.animating) {
              ex.animating = true; ex.animTimer = 0;
              ex.startA = ex.currentA; ex.targetA = ex.firstTargetA;
            }
            if (ex.phase === 1 && timeSinceReveal >= ex.secondAt && !ex.animating) {
              ex.animating = true; ex.animTimer = 0;
              ex.startA = ex.currentA; ex.targetA = ex.secondTargetA;
            }
            if (ex.animating) {
              ex.animTimer += dt;
              const progress = Math.min(1, ex.animTimer / ex.animDuration);
              const ease = 1 - Math.pow(1 - progress, 3);
              ex.currentA = ex.startA + (ex.targetA - ex.startA) * ease;
              if (progress >= 1) {
                ex.animating = false; ex.currentA = ex.targetA;
                ex.phase = Math.min(2, ex.phase + 1);
                recordEvent('EXECUTIONER_COMPRESSION', { phase: ex.phase, newWallA: ex.currentA });
              }
            }
          }

          // DIVINE_JUDGMENT — spawn raios simplificado no headless
          if (ce.activeEvent === 'DIVINE_JUDGMENT') {
            const div = ce.divine;
            div.nextStrikeTimer -= dt;
            if (div.nextStrikeTimer <= 0) {
              const ang = Math.random() * Math.PI * 2;
              const r   = Math.random() * zones.wallB * 0.8;
              const effIdx = Math.floor(Math.random() * div.effects.length);
              div.strikes.push({ x: Math.cos(ang)*r*(zones.wallA/zones.wallB), y: Math.sin(ang)*r, age: 0, effect: div.effects[effIdx], radius: 32, applied: false });
              div.nextStrikeTimer = div.strikeInterval;
            }
            div.strikes.forEach(s => { s.age += dt; });
            div.strikes = div.strikes.filter(s => s.age < 1.5);
          }
        }

        // ── Effective semi-axes ────────────────────────────────────────
        const effA = ce.activeEvent === 'THE_EXECUTIONER' ? ce.executioner.currentA : zones.wallA;
        const effB = zones.wallB;

        // ── Evento: fricção ────────────────────────────────────────────
        if (ce.revealed && ce.activeEvent === 'FROZEN_GROUND') {
          b.vx *= 0.9988; b.vy *= 0.9988;
        } else {
          b.vx *= 0.991; b.vy *= 0.991;
        }

        // ── Evento: SANDSTORM — força tangencial ──────────────────────
        if (ce.revealed && ce.activeEvent === 'SANDSTORM') {
          const px = b.x - centerX, py = b.y - centerY;
          const dist = Math.sqrt(px**2 + py**2);
          if (dist > 15) {
            const tx = -py/dist, ty = px/dist;
            const force = ce.sandstorm.force * ce.sandstorm.direction;
            b.vx += tx * force; b.vy += ty * force;
          }
        }

        // ── Evento: PHANTOM_PAIR — colisão com fantasmas ───────────────
        if (ce.revealed && ce.activeEvent === 'PHANTOM_PAIR') {
          ce.phantomBlades.forEach(ph => {
            if (!ph.alive) return;
            const dx = (b.x - centerX) - ph.x, dy = (b.y - centerY) - ph.y;
            const dist = Math.sqrt(dx**2 + dy**2);
            if (dist < ph.radius + b.radius) {
              const nx = dx/(dist||1), ny = dy/(dist||1);
              b.vx += nx*6; b.vy += ny*6;
              ph.hp -= 20 + bSpinPercent * 15;
              ph.vx -= nx*4; ph.vy -= ny*4;
              addParticle(b.x, b.y, '#c8c8ff', 15);
              if (ph.hp <= 0) {
                ph.alive = false;
                b.stamina   = Math.min(250, b.stamina + 250);
                b.stability = Math.min(150, (b.stability||100) + 150);
                recordEvent('PHANTOM_DEFEATED', { bey: b === b1 ? 'b1' : 'b2' });
              }
            }
          });
        }

        // ── Evento: THE_CHAMPION — colisão com campeão ────────────────
        if (ce.revealed && ce.activeEvent === 'THE_CHAMPION' && ce.championBlade?.alive) {
          const ch = ce.championBlade;
          const dx = (b.x - centerX) - ch.x, dy = (b.y - centerY) - ch.y;
          const dist = Math.sqrt(dx**2 + dy**2);
          if (dist < ch.radius + b.radius) {
            const nx = dx/(dist||1), ny = dy/(dist||1);
            b.vx += nx*12; b.vy += ny*12;
            b.stamina -= 12; b.stability -= 10; b.burstDamage += 3;
            ch.hp -= 15 + bSpinPercent*10;
            ch.vx -= nx*3; ch.vy -= ny*3;
            addParticle(b.x, b.y, '#ffd700', 20);
            if (ch.hp <= 0) {
              ch.alive = false;
              recordEvent('CHAMPION_DEFEATED', { bey: b === b1 ? 'b1' : 'b2' });
            }
          }
        }

        // ── Evento: DIVINE_JUDGMENT — efeito de raios ─────────────────
        if (ce.revealed && ce.activeEvent === 'DIVINE_JUDGMENT') {
          ce.divine.strikes.forEach(s => {
            if (s.age > 0.3 || s.applied) return;
            const dx = (b.x - centerX) - s.x, dy = (b.y - centerY) - s.y;
            if (Math.sqrt(dx**2 + dy**2) < s.radius + b.radius) {
              s.applied = true;
              switch (s.effect) {
                case 'SPIN_BOOST':    b.stamina = Math.min(250, b.stamina + 40); break;
                case 'SPIN_DRAIN':    b.stamina = Math.max(0, b.stamina - 35); break;
                case 'STAMINA_BOOST': b.stamina = Math.min(250, b.stamina + 50); break;
                case 'STAMINA_DRAIN': b.stamina = Math.max(0, b.stamina - 40); break;
                case 'KNOCKBACK': { const ang = Math.atan2(b.y-centerY, b.x-centerX); b.vx += Math.cos(ang)*10; b.vy += Math.sin(ang)*10; break; }
                case 'SHIELD':  b.shieldEffect = { timer: 180 }; break;
                case 'CHAOS':   b.vx = (Math.random()-0.5)*14; b.vy = (Math.random()-0.5)*14; b.stamina += (Math.random()-0.5)*50; break;
              }
              recordEvent('DIVINE_STRIKE', { bey: b === b1 ? 'b1' : 'b2', effect: s.effect });
            }
          });
        }

        // ── Colisão com parede OVAL ─────────────────────────────────────
        // 🛰️ SATELLITE: pular durante órbita — updateOrbit garante posição válida
        const px = b.x - centerX, py = b.y - centerY;
        const r  = b.radius || 15;
        const eA = effA - r, eB = effB - r;
        const oval = (eA > 0 && eB > 0) ? (px/eA)**2 + (py/eB)**2 : 0;

        if (!b.isOrbiting && oval >= 1 && eA > 0 && eB > 0) {
          const nX = px/(eA*eA), nY = py/(eB*eB);
          const nL = Math.sqrt(nX**2 + nY**2) || 1;
          const nx = nX/nL, ny = nY/nL;
          const t = 1/Math.sqrt(oval);
          b.x = centerX + px*t; b.y = centerY + py*t;
          const dot = b.vx*nx + b.vy*ny;
          b.vx -= 2*dot*nx; b.vy -= 2*dot*ny;
          b.vx *= 0.72; b.vy *= 0.72;

          if (ce.activeEvent === 'INFERNO_WALLS') {
            b.stamina   -= 3.5;
            b.stability  = Math.max(0, (b.stability||100) - 8);
            b.burstDamage += 1.0;
            addParticle(b.x, b.y, '#ff4400', 12);
          } else {
            b.stamina   -= 1.8;
            b.burstDamage += 0.5;
          }
          addParticle(b.x, b.y, '#c4934a', 8);
        }

        // ── FLOOR SINK — tick da mecânica (apenas no b1) ─────────────────
        if (b === b1 && ARENA.floorSink) {
          const fs = ARENA.floorSink;
          const dt = 1/60;
          if (fs.phase === 'flat') {
            fs.idleTimer += dt;
            if (fs.idleTimer >= fs.interval) { fs.idleTimer = 0; fs.timer = 0; fs.phase = 'sinking'; }
          } else if (fs.phase === 'sinking') {
            fs.timer += dt;
            const p = Math.min(1, fs.timer / fs.sinkDuration);
            fs.depth = p < 0.5 ? 2*p*p : 1 - Math.pow(-2*p+2,2)/2;
            if (fs.timer >= fs.sinkDuration) { fs.depth = 1.0; fs.timer = 0; fs.phase = 'rising'; }
          } else if (fs.phase === 'rising') {
            fs.timer += dt;
            const p = Math.min(1, fs.timer / fs.riseDuration);
            fs.depth = 1.0 - (p < 0.5 ? 2*p*p : 1 - Math.pow(-2*p+2,2)/2);
            if (fs.timer >= fs.riseDuration) { fs.depth = 0.0; fs.timer = 0; fs.phase = 'flat'; }
          }
        }

        // ── FLOOR SINK — atração ao centro ────────────────────────────────
        if (ARENA.floorSink && ARENA.floorSink.depth > 0.01) {
          const fs  = ARENA.floorSink;
          const px  = b.x - centerX, py = b.y - centerY;
          const dist = Math.sqrt(px*px + py*py);
          if (dist > 5) {
            const distFactor = Math.min(1, dist / 120);
            const pull = fs.pullForce * fs.depth * distFactor;
            b.vx -= (px / dist) * pull;
            b.vy -= (py / dist) * pull;
          }
        }

        // ── Drenagem de stamina base ─────────────────────────────────────
        let staminaLoss = 0.14 - ((b.bey?.effectiveStats?.sta || 10) * 0.005);
        staminaLoss += velocity * 0.008;
        if (ce.revealed && ce.activeEvent === 'BLOOD_MOON') staminaLoss *= 2.0;

        const hasPerpetual = b.bey?.synergies?.some(s => s?.name?.includes('Perpetual')) || false;
        if (hasPerpetual) staminaLoss -= 0.01;
        if (b.eternalSpinActive && b.eternalSpinTimer < 300) staminaLoss = 0;
        b.stamina -= staminaLoss;

        if (b.shieldEffect && b.shieldEffect.timer > 0) b.shieldEffect.timer--;
      }
      
      function handleKillerSidesPhysics(b, bSpinPercent, velocity) {
        const distToCenter = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
        const zones = ARENA.zones;
        
        // Initialize grip state if doesn't exist
        if (!b.gripState) {
          b.gripState = {
            captured: false,
            angle: 0,  // Current angle on grip track
            spinAtCapture: 0,
            captureTime: 0  // Track time in grip
          };
        }
        
        const distToGripRadius = Math.abs(distToCenter - zones.gripRadius);
        const nearGrip = distToGripRadius < 10;  // Within 10px of grip radius
        
        // Calculate blade's current angle relative to center
        const bladeAngle = Math.atan2(b.y - centerY, b.x - centerX);
        
        // Normalize angle to 0-2π range
        const normalizeAngle = (angle) => {
          let normalized = angle % (Math.PI * 2);
          if (normalized < 0) normalized += Math.PI * 2;
          return normalized;
        };
        
        // Check if blade is in ramp gap
        const rampStart = ARENA.gripRampAngle - ARENA.gripRampWidth / 2;
        const rampEnd = ARENA.gripRampAngle + ARENA.gripRampWidth / 2;
        const normalizedBladeAngle = normalizeAngle(bladeAngle);
        const normalizedRampStart = normalizeAngle(rampStart);
        const normalizedRampEnd = normalizeAngle(rampEnd);
        
        let inRampGap = false;
        if (normalizedRampStart < normalizedRampEnd) {
          inRampGap = normalizedBladeAngle >= normalizedRampStart && normalizedBladeAngle <= normalizedRampEnd;
        } else {
          // Gap wraps around 0
          inRampGap = normalizedBladeAngle >= normalizedRampStart || normalizedBladeAngle <= normalizedRampEnd;
        }
        
        // GRIP CAPTURE LOGIC
        if (!b.gripState.captured) {
          // Capture if: near grip AND slow velocity AND NOT in ramp gap
          if (nearGrip && velocity < ARENA.gripVelocityThreshold && !inRampGap) {
            b.gripState.captured = true;
            b.gripState.angle = bladeAngle;
            b.gripState.spinAtCapture = b.stamina;
            b.gripState.captureTime = 0;  // Reset timer
            
            // Visual feedback
            addParticle(b.x, b.y, '#10b981', 20);
            addParticle(b.x, b.y, '#059669', 15);
            
            recordEvent('GRIP_CAPTURE', {
              bey: b === b1 ? 'b1' : 'b2',
              velocity: velocity.toFixed(2),
              spin: b.stamina.toFixed(1)
            });
          }
        }
        
        // GRIP MOVEMENT LOGIC
        if (b.gripState.captured) {
          // Increment time in grip (assuming ~60 FPS)
          b.gripState.captureTime += 1/60;
          
          // Calculate acceleration multiplier: +20% per 0.5 seconds
          const halfSecondsInGrip = Math.floor(b.gripState.captureTime / 0.5);
          const accelerationMultiplier = 1.0 + (halfSecondsInGrip * 0.20);
          
          // Calculate grip speed based on CURRENT SPIN (not velocity!)
          const spinPercent = b.stamina / 100;  // 0-1 range
          const baseGripSpeed = spinPercent * 0.06;  // Base speed (tripled)
          const gripSpeed = baseGripSpeed * accelerationMultiplier;  // Apply acceleration!
          
          // Direction based on rotation type
          const direction = b.bey?.rotation === 'Right' ? 1 : -1;
          
          // Update angle
          b.gripState.angle += gripSpeed * direction;
          
          // Keep blade on grip track
          b.x = centerX + Math.cos(b.gripState.angle) * zones.gripRadius;
          b.y = centerY + Math.sin(b.gripState.angle) * zones.gripRadius;
          
          // Reset velocity (blade is locked to grip)
          b.vx = 0;
          b.vy = 0;
          
          // Visual feedback during grip travel
          if (Math.random() < 0.1) {
            addParticle(b.x, b.y, '#10b981', 8);
          }
          
          // Check if reached ramp gap for launch
          const normalizedGripAngle = normalizeAngle(b.gripState.angle);
          let reachedRamp = false;
          if (normalizedRampStart < normalizedRampEnd) {
            reachedRamp = normalizedGripAngle >= normalizedRampStart && normalizedGripAngle <= normalizedRampEnd;
          } else {
            reachedRamp = normalizedGripAngle >= normalizedRampStart || normalizedGripAngle <= normalizedRampEnd;
          }
          
          // LAUNCH when hitting ramp
          if (reachedRamp) {
            // Calculate current tangential velocity from grip rotation
            // gripSpeed is angular velocity, convert to linear velocity
            const tangentialVelocity = gripSpeed * zones.gripRadius;
            
            // Calculate launch vector to center
            const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
            
            // Use actual grip velocity as launch speed (no artificial limit!)
            const launchSpeed = tangentialVelocity;
            
            b.vx = Math.cos(angleToCenter) * launchSpeed;
            b.vy = Math.sin(angleToCenter) * launchSpeed;
            
            // Reset grip state
            b.gripState.captured = false;
            
            // Visual feedback
            addParticle(b.x, b.y, '#ef4444', 50);
            addParticle(b.x, b.y, '#dc2626', 40);
            addParticle(b.x, b.y, '#ffffff', 30);
            
            recordEvent('GRIP_LAUNCH', {
              bey: b === b1 ? 'b1' : 'b2',
              launchSpeed: launchSpeed.toFixed(2),
              spin: b.stamina.toFixed(1)
            });
          }
          
          return; // Skip normal physics while in grip
        }
        
        // NORMAL PHYSICS (when not in grip) - IDENTICAL TO BB-10
        
        // Initialize cooldown if doesn't exist
        if (!b.gravityDisabledUntil) b.gravityDisabledUntil = 0;
        
        const DEAD_ZONE_RADIUS = 40;  // Center free for knockback
        const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
        
        // Check cooldown (after recent collision)
        const currentFrame = Math.floor(_simTime / 16.67);  // ~60fps
        const inCooldown = currentFrame < b.gravityDisabledUntil;
        
        // Apply gravity ONLY if outside dead zone AND no active cooldown
        if (distToCenter > DEAD_ZONE_RADIUS && !inCooldown) {
          let gravity = 0.12;  // Same as BB-10
          
          // Zone-based gravity (mimicking BB-10)
          if (distToCenter < zones.centerBowl) gravity *= 0.5;
          else if (distToCenter < zones.innerSlope) gravity *= 0.8;
          else if (distToCenter < zones.tornadoRidge) gravity *= 1.2;
          else if (distToCenter < zones.outerSlope) gravity *= 1.5;
          else gravity *= 2.0;
          
          b.vx += Math.cos(angleToCenter) * gravity;
          b.vy += Math.sin(angleToCenter) * gravity;
        }
        
        // Friction - IDENTICAL TO BB-10
        b.vx *= 0.997;
        b.vy *= 0.997;
        
        // Stamina drain - IDENTICAL TO BB-10
        let staminaLoss = 0.15 - ((b.bey?.effectiveStats?.sta || 10) * 0.005);
        staminaLoss += velocity * 0.010;
        
        // Zone-based stamina adjustment
        if (distToCenter < zones.centerBowl) staminaLoss *= 0.8;
        else if (distToCenter > zones.outerSlope) staminaLoss *= 1.2;
        
        // LAD bonus
        if (velocity < 2 && b.bey?.type === 'Stamina') {
          staminaLoss *= 0.5;
          if (isOppositeSpin) staminaLoss *= 0.7;
          if (Math.random() < 0.05) addParticle(b.x, b.y, '#00ff88', 5);
        }
        
        const hasPerpetual = b.bey?.synergies?.some(s => s?.name?.includes('Perpetual')) || false;
        if (hasPerpetual) staminaLoss -= 0.01;
        
        // ETERNAL SPIN
        if (b.eternalSpinActive && b.eternalSpinTimer < 300) {
          staminaLoss = 0;
          if (Math.random() < 0.05) {
            addParticle(b.x, b.y, '#00ffaa', 5);
          }
        }
        
        b.stamina -= staminaLoss;
        
        // Wall collision — órbita salta a checagem (Fix satellite launch)
        if (!b.isOrbiting && distToCenter > zones.wall - b.radius) {
          const angle = Math.atan2(b.y - centerY, b.x - centerX);
          b.x = centerX + Math.cos(angle) * (zones.wall - b.radius);
          b.y = centerY + Math.sin(angle) * (zones.wall - b.radius);
          
          const normalX = Math.cos(angle);
          const normalY = Math.sin(angle);
          const dotProduct = b.vx * normalX + b.vy * normalY;
          
          b.vx = b.vx - 2 * dotProduct * normalX;
          b.vy = b.vy - 2 * dotProduct * normalY;
          
          b.vx *= 0.75;
          b.vy *= 0.75;
          b.stamina -= 1.5;
          b.burstDamage += 0.4;
          
          // Enable gravity cooldown after wall collision
          b.gravityDisabledUntil = currentFrame + 30;  // 30 frames (~0.5s)
          
          addParticle(b.x, b.y, '#ffffff', 10);
        }
      }
      
      function handleCircularArenaPhysics(b, bSpinPercent, velocity) {
        const distToCenter = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
        const zones = ARENA.zones;

        // BB10_COMPETITIVE: parede física = wallR - 34 (anel verde)
        const physWall = (arenaType === 'BB10_COMPETITIVE') ? zones.wall - 34 : zones.wall;
        let currentZone = 'wall';
        if (distToCenter <= zones.centerBowl) currentZone = 'center';
        else if (distToCenter <= zones.innerSlope) currentZone = 'innerSlope';
        else if (distToCenter <= zones.tornadoRidge) currentZone = 'tornadoRidge';
        else if (distToCenter <= zones.outerSlope) currentZone = 'outerSlope';
        
        // Check pockets/exits
        let inPocket = false;
        let inExit = false;
        
        if (ARENA.pockets && ARENA.pockets.length > 0) {
          ARENA.pockets.forEach(pocket => {
            const pocketX = centerX + Math.cos(pocket.angle) * physWall;
            const pocketY = centerY + Math.sin(pocket.angle) * physWall;
            const distToPocket = Math.sqrt((b.x - pocketX) ** 2 + (b.y - pocketY) ** 2);
            
            if (distToPocket < pocket.radius) {
              inPocket = true;
              b.vx *= 0.88;
              b.vy *= 0.88;
              b.stamina -= 0.3;
              b.burstDamage += 0.2;
              
              if (Math.random() < 0.02) {
                addParticle(b.x, b.y, '#4488ff', 5);
              }
            }
          });
        }
        
        // BB-10 Grace Period Helper Function
        function getEffectiveExitWidth(exit, battleTime) {
          const isGraceArena = arenaType === 'BB10_COMPETITIVE';
          if (isGraceArena && ARENA.gracePeriod && ARENA.gracePeriod.enabled) {
            if (battleTime < ARENA.gracePeriod.duration) {
              return exit.width * ARENA.gracePeriod.exitMultiplier;
            }
          }
          return exit.width;
        }
        
        if (ARENA.exits && ARENA.exits.length > 0 && ARENA.exitsOpen) {
          const angleToCenter = Math.atan2(b.y - centerY, b.x - centerX);
          const rotOffset = ARENA.exitRing ? ARENA.exitRing.currentAngle : 0;
          const currentBattleTime = (_simTime - battleStartTimeRef) / 1000;
          
          ARENA.exits.forEach(exit => {
            // BB-10 Grace Period: exits menores nos primeiros 3s
            const effectiveWidth = getEffectiveExitWidth(exit, currentBattleTime);
            const halfA = (effectiveWidth / 25) * 0.3;
            
            const exitAngle = exit.angle + rotOffset;
            let angleDiff = angleToCenter - exitAngle;
            angleDiff = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
            if (Math.abs(angleDiff) < halfA && distToCenter > physWall - 10) {
              inExit = true;
            }
          });
        }
        
        // Tornado Ridge mechanics with Sweet Spot Boost
        if (currentZone === 'tornadoRidge' && b.bey?.type === 'Attack' && bSpinPercent > 0.4) {
          b.inTornadoRidge = true;
          if (velocity > 5) {
            b.flowerPatternPhase += 0.2;
            const ridgeAngle = Math.atan2(b.y - centerY, b.x - centerX);
            const tangentX = -Math.sin(ridgeAngle);
            const tangentY = Math.cos(ridgeAngle);
            
            // BB-10 SWEET SPOT CHECK
            let inSweetSpot = false;
            if (false) { // BB10_COMPETITIVE: sweetspot boost removido
              if (ARENA.sweetSpots && ARENA.sweetSpots.length > 0) {
                ARENA.sweetSpots.forEach(spot => {
                let angleDiff = ridgeAngle - spot.angle;
                angleDiff = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
                if (Math.abs(angleDiff) < spot.width && Math.abs(distToCenter - spot.radius) < 15) {
                  inSweetSpot = true;
                }
              });
              }
            }
            
            if (inSweetSpot && ARENA.sweetSpots && ARENA.sweetSpots.length > 0) {
              const boost = ARENA.sweetSpots[0].boost || 1.15;
              b.vx *= boost;
              b.vy *= boost;
              if (Math.random() < 0.15) {
                addParticle(b.x, b.y, '#00ff00', 5);
              }
            }
            
            b.vx += tangentX * 0.3;
            b.vy += tangentY * 0.3;
            b.vx *= 0.995;
            b.vy *= 0.995;
            
            if (Math.random() < 0.05) {
              addParticle(b.x, b.y, '#ffa500', 3);
            }
          }
        } else {
          b.inTornadoRidge = false;
          b.vx *= 0.997;
          b.vy *= 0.997;
        }
        
        // Center Bowl
        // v3.4: PULL REMOVIDO! Stamina agora se comporta como outros tipos!
        /*
        if (currentZone === 'center' && b.bey?.type === 'Stamina') {
          b.vx *= 0.99;
          b.vy *= 0.99;
          
          const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
          if (distToCenter > 15) {
            b.vx += Math.cos(angleToCenter) * 0.1;
            b.vy += Math.sin(angleToCenter) * 0.1;
          }
        }
        */
        
        // Flower Pattern for Attack
        if (b.bey?.type === 'Attack' && bSpinPercent > 0.4 && !inPocket) {
          b.flowerPatternPhase += 0.15;
          const patternRadius = 40;
          const patternX = Math.cos(b.flowerPatternPhase) * patternRadius;
          const patternY = Math.sin(b.flowerPatternPhase * 2) * patternRadius * 0.5;
          b.vx += patternX * 0.015;
          b.vy += patternY * 0.015;
        }
        
        // Stamina center pull
        // v3.4: CENTER PULL REMOVIDO! Também anulava knockback!
        // ANTES: centerPull = 0.35 puxava Stamina para centro
        // AGORA: Stamina se move LIVREMENTE como os outros!
        /*
        if (b.bey?.type === 'Stamina' && currentZone !== 'center') {
          const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
          const centerPull = 0.35;
          b.vx += Math.cos(angleToCenter) * centerPull;
          b.vy += Math.sin(angleToCenter) * centerPull;
        }
        */
        
        // ═══════════════════════════════════════════════════════════════
        // Arena slope gravity
        // v3.5-HÍBRIDO: Sistema Completo (Dead Zone + Gravidade Reduzida + Cooldown)
        // ═══════════════════════════════════════════════════════════════
        //
        // SISTEMA MULTI-CAMADAS:
        //   1. Dead Zone (40px): SEM gravidade no centro
        //   2. Cooldown (30 frames pós-colisão): SEM gravidade  
        //   3. Fora: Gravidade base 0.12
        //
        // RESULTADO: Knockback preservado 95% do tempo! 🚀
        
        // Inicializar cooldown se não existir
        if (!b.gravityDisabledUntil) b.gravityDisabledUntil = 0;
        
        const DEAD_ZONE_RADIUS = 40;  // Centro livre para knockback
        const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
        
        // VERIFICAR COOLDOWN (após colisão recente)
        const currentFrame = Math.floor(_simTime / 16.67);  // ~60fps
        const inCooldown = currentFrame < b.gravityDisabledUntil;
        
        // APLICAR GRAVIDADE apenas se:
        // - FORA do dead zone E
        // - SEM cooldown ativo
        if (distToCenter > DEAD_ZONE_RADIUS && !inCooldown) {
          let gravity = 0.12;  // Base REDUZIDA (12x menor que original 0.5!)
          
          // Progressão suave com distância (evita transição abrupta)
          const distBeyondDeadZone = distToCenter - DEAD_ZONE_RADIUS;
          const distanceMultiplier = 1.0 + (distBeyondDeadZone / 120);
          gravity *= Math.min(distanceMultiplier, 1.8);
          
          // Ajustar por zona
          if (currentZone === 'center') gravity *= 0.8;
          else if (currentZone === 'innerSlope') gravity *= 1.2;
          else if (currentZone === 'tornadoRidge') gravity *= 1.5;
          else if (currentZone === 'outerSlope') gravity *= 2.0;  // MAIS FORTE!
          
          b.vx += Math.cos(angleToCenter) * gravity;
          b.vy += Math.sin(angleToCenter) * gravity;
        }
        // CASO CONTRÁRIO: SEM gravidade! Knockback age livremente! ✅
        // ═══════════════════════════════════════════════════════════════
        
        // Stamina drain by zone
        let staminaLoss = 0.15 - ((b.bey?.effectiveStats?.sta || 10) * 0.005);
        staminaLoss += velocity * 0.010;
        
        if (currentZone === 'center') staminaLoss *= 0.8;
        else if (currentZone === 'tornadoRidge' && b.bey?.type === 'Attack') staminaLoss *= 0.9;
        else if (currentZone === 'outerSlope') staminaLoss *= 1.2;
        
        // LAD
        if (velocity < 2 && b.bey?.type === 'Stamina') {
          staminaLoss *= 0.5;
          if (isOppositeSpin) staminaLoss *= 0.7;
          if (Math.random() < 0.05) addParticle(b.x, b.y, '#00ff88', 5);
        }
        
        const hasPerpetual = b.bey?.synergies?.some(s => s?.name?.includes('Perpetual')) || false;
        if (hasPerpetual) staminaLoss -= 0.01;
        
        // ETERNAL SPIN (STA 27+) - Não perde stamina nos primeiros 5s
        if (b.eternalSpinActive && b.eternalSpinTimer < 300) {
          staminaLoss = 0;
          if (Math.random() < 0.05) {
            addParticle(b.x, b.y, '#00ffaa', 5);
          }
        }
        
        b.stamina -= staminaLoss;
        
        // ═══════════════════════════════════════════════════════════════
        // BB-10 WALL SYSTEM: O anel vermelho todo dá ring-out em alta velocidade
        // ─ Hits fracos: ricocheteiam com dano
        // ─ Hits fortes: ring-out em qualquer ponto do anel
        // ─ Exits (buracos): ring-out com velocidade ainda menor
        // ═══════════════════════════════════════════════════════════════
        
        if (!b.isOrbiting && distToCenter > physWall - b.radius) {
          
          // Grace period global: bloqueia ring-out completamente
          const graceCurrentTimeSim = (_simTime - battleStartTimeRef) / 1000;
          const inGracePeriodSim = ARENA.gracePeriod?.enabled &&
                                   ARENA.gracePeriod?.wallRingOutDisabled &&
                                   graceCurrentTimeSim < ARENA.gracePeriod.duration;

          // Thresholds: competitive é mais difícil de sair
          // BB10_COMPETITIVE: parede sólida NUNCA dá ring-out — só pockets após 2s
          // VOLCANIC_RAGE: parede sólida NUNCA dá ring-out — só KO térmico pelas fissuras
          const isCompetitiveSim = arenaType === 'BB10_COMPETITIVE';
          const isVolcanicSim    = arenaType === 'VOLCANIC_RAGE';
          if ((isCompetitiveSim || isVolcanicSim) && !inExit) {
            // Parede sólida: rebata, sem ring-out
          } else {
          // ── ANCORAGEM (PESO 17): threshold de ring-out +30% ──
          const wallRingOutVelocity = inExit
            ? (isCompetitiveSim ? 1.5 : 6)
            : (b.hasAncoragem ? 8.5 * 1.30 : 8.5);

          if (!inGracePeriodSim && velocity > wallRingOutVelocity && !winner && !burstTriggered) {
            // RING-OUT! O bey atravessa o anel vermelho
            b.ringOutTime = _simTime;
            
            const opponent = b === b1 ? b2 : b1;
            const timeDiff = opponent.ringOutTime ? Math.abs(b.ringOutTime - opponent.ringOutTime) : Infinity;
            
            // Partículas dramáticas no ponto de saída
            addParticle(b.x, b.y, '#ff0000', 50);
            addParticle(b.x, b.y, '#ffaa00', 40);
            addParticle(b.x, b.y, '#ffffff', 30);
            addScreenShake(3.5);
            
            if (timeDiff < 100) {
              recordEvent('DRAW', { reason: 'Both ring out simultaneously' });
              winner = 'DRAW';
              winMethod = 'Draw (Double Ring-Out)';
              b.alive = false;
              opponent.alive = false;
              addParticle(opponent.x, opponent.y, '#ffaa00', 40);
            } else {
              recordEvent('RING_OUT', { 
                bey: b === b1 ? 'b1' : 'b2',
                velocity,
                inExit,
                location: { x: b.x, y: b.y }
              });
              winner = b === b1 ? b2 : b1;
              winMethod = 'Ring-Out Finish';
              b.alive = false;
              const loserName = b === b1 ? bey1.name : bey2.name;
              addEvent('RING_OUT', '💥 RING OUT! 💥', `${loserName} exits the arena!`);
            }
            
          } else {
            // Velocidade baixa/média: rebate com dano proporcional à velocidade
            const angle = Math.atan2(b.y - centerY, b.x - centerX);
            b.x = centerX + Math.cos(angle) * (physWall - b.radius);
            b.y = centerY + Math.sin(angle) * (physWall - b.radius);
            
            const normalX = Math.cos(angle);
            const normalY = Math.sin(angle);
            const dotProduct = b.vx * normalX + b.vy * normalY;
            
            b.vx = b.vx - 2 * dotProduct * normalX;
            b.vy = b.vy - 2 * dotProduct * normalY;
            
            // Energia perdida aumenta com velocidade (rebate mais fraco quanto mais forte bate)
            const energyLoss = Math.min(0.85, 0.55 + velocity * 0.04);
            b.vx *= (1 - energyLoss);
            b.vy *= (1 - energyLoss);
            
            const wallDamage = 1.5 + velocity * 0.3;
            b.stamina -= wallDamage;
            b.burstDamage += 0.4 + velocity * 0.08;
            
            // Visual: cor mais intensa para impactos maiores
            const particleCount = Math.min(30, 8 + Math.floor(velocity * 1.5));
            addParticle(b.x, b.y, '#ffffff', particleCount);
            if (velocity > 5) addParticle(b.x, b.y, '#ff4444', Math.floor(velocity * 2));
          }
          } // fecha else (isCompetitiveSim && !inExit)
        }
      }
      
      function handleOctagonalArenaPhysics(b, bSpinPercent, velocity) {
        const nexusZones = ARENA.zones;
        const distToCenter = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
        
        // ═══════════════════════════════════════════════════════════
        // PORTAL SUCTION SYSTEM - Every 5 seconds
        // ═══════════════════════════════════════════════════════════
        const currentTime = _simTime / 1000;
        const suction = ARENA.portalSuction;
        
        if (suction && suction.enabled) {
          // Check if it's time to start new suction
          if (!suction.currentlyActive && currentTime - suction.lastSuctionTime >= suction.interval) {
            // Start new suction
            suction.currentlyActive = true;
            suction.suctionStartTime = currentTime;
            suction.lastSuctionTime = currentTime;
            
            // Pick random portal
            const randomPortal = ARENA.portals[Math.floor(Math.random() * ARENA.portals.length)];
            suction.activePortal = randomPortal;
            
            // Visual feedback - explosion at portal
            const portalX = centerX + Math.cos(randomPortal.angle) * randomPortal.radius;
            const portalY = centerY + Math.sin(randomPortal.angle) * randomPortal.radius;
            for (let i = 0; i < 40; i++) {
              const angle = (Math.PI * 2 / 40) * i;
              const px = portalX + Math.cos(angle) * 30;
              const py = portalY + Math.sin(angle) * 30;
              addParticle(px, py, randomPortal.color, 15);
            }
            
            recordEvent('PORTAL_SUCTION_START', {
              portal: randomPortal.id,
              time: currentTime
            });
          }
          
          // Check if suction should end
          if (suction.currentlyActive && currentTime - suction.suctionStartTime >= suction.duration) {
            suction.currentlyActive = false;
            suction.activePortal = null;
          }
          
          // Apply suction force if active
          if (suction.currentlyActive && suction.activePortal) {
            const portal = suction.activePortal;
            const portalX = centerX + Math.cos(portal.angle) * portal.radius;
            const portalY = centerY + Math.sin(portal.angle) * portal.radius;
            const distToPortal = Math.sqrt((b.x - portalX) ** 2 + (b.y - portalY) ** 2);
            
            // Suction strength decreases with distance
            const suctionStrength = Math.max(0, (300 - distToPortal) / 300) * 1.5;
            const angleToPortal = Math.atan2(portalY - b.y, portalX - b.x);
            
            // Pull toward portal
            b.vx += Math.cos(angleToPortal) * suctionStrength;
            b.vy += Math.sin(angleToPortal) * suctionStrength;
            
            // Visual particles being sucked
            if (Math.random() < 0.3) {
              addParticle(b.x, b.y, portal.color, 6);
            }
            
            // If bey reaches portal, teleport it out to random portal
            if (distToPortal < 35) {
              const otherPortals = ARENA.portals.filter(p => p.id !== portal.id);
              const exitPortal = otherPortals[Math.floor(Math.random() * otherPortals.length)];
              
              // Eject from exit portal
              const exitAngle = exitPortal.angle + Math.PI;
              const exitX = centerX + Math.cos(exitAngle) * 100;
              const exitY = centerY + Math.sin(exitAngle) * 100;
              
              // Teleport trail
              for (let i = 0; i < 25; i++) {
                const t = i / 25;
                const px = portalX + (exitX - portalX) * t;
                const py = portalY + (exitY - portalY) * t;
                addParticle(px, py, portal.color, 5);
                addParticle(px, py, exitPortal.color, 5);
              }
              
              b.x = exitX;
              b.y = exitY;
              
              // Eject velocity
              b.vx = Math.cos(exitAngle) * 10;
              b.vy = Math.sin(exitAngle) * 10;
              
              // Exit explosion
              for (let i = 0; i < 30; i++) {
                const angle = (Math.PI * 2 / 30) * i;
                const px = exitX + Math.cos(angle) * 25;
                const py = exitY + Math.sin(angle) * 25;
                addParticle(px, py, exitPortal.color, 12);
              }
              
              recordEvent('PORTAL_SUCTION_TELEPORT', {
                from: portal.id,
                to: exitPortal.id
              });
            }
          }
        }
        // ═══════════════════════════════════════════════════════════
        
        // Update portal cooldowns
        if (b.portalCooldown > 0) {
          b.portalCooldown -= 0.016; // ~60fps
        }
        
        // Apply portal boost after exiting (jetstream effect)
        if (b.portalBoostFrames && b.portalBoostFrames > 0) {
          const boostForce = 0.8; // Reduced from 1.2 for stability
          b.vx += Math.cos(b.portalBoostAngle) * boostForce;
          b.vy += Math.sin(b.portalBoostAngle) * boostForce;
          b.portalBoostFrames--;
          
          // Visual trail during boost
          if (Math.random() < 0.3) {
            addParticle(b.x, b.y, '#00ffff', 5);
          }
        }
        
        // Check portal interactions
        if (!b.inPortal && b.portalCooldown <= 0) {
          ARENA.portals.forEach(portal => {
            if (!portal.active) return;
            
            const portalX = centerX + Math.cos(portal.angle) * portal.radius;
            const portalY = centerY + Math.sin(portal.angle) * portal.radius;
            const distToPortal = Math.sqrt((b.x - portalX) ** 2 + (b.y - portalY) ** 2);
            
            if (distToPortal < 30 && velocity > 2) {
              // TELEPORT!
              b.inPortal = true;
              b.portalBoostFrames = 15;
              
              // Choose random exit portal (not the entry one)
              const otherPortals = ARENA.portals.filter(p => p.id !== portal.id && p.active);
              if (otherPortals.length > 0) {
                const exitPortal = otherPortals[Math.floor(Math.random() * otherPortals.length)];
                
                // Calculate safe exit position - INSIDE the arena, away from portal edge
                const safeDistance = 100; // Distance from center instead of portal edge
                const exitAngle = exitPortal.angle + Math.PI; // Opposite side - shoot INTO arena
                const exitX = centerX + Math.cos(exitAngle) * safeDistance;
                const exitY = centerY + Math.sin(exitAngle) * safeDistance;
                
                // Warp trail particles from entry to exit - ENHANCED
                for (let i = 0; i < 30; i++) {
                  const t = i / 30;
                  const px = portalX + (exitX - portalX) * t;
                  const py = portalY + (exitY - portalY) * t;
                  addParticle(px, py, portal.color, 5);
                  addParticle(px, py, exitPortal.color, 5);
                  if (i % 3 === 0) {
                    addParticle(px, py, '#ffffff', 8);
                  }
                }
                
                // Entry portal explosion effect
                for (let i = 0; i < 20; i++) {
                  const angle = (Math.PI * 2 / 20) * i;
                  const px = portalX + Math.cos(angle) * 20;
                  const py = portalY + Math.sin(angle) * 20;
                  addParticle(px, py, portal.color, 10);
                }
                
                // SAFELY teleport to new position
                b.x = exitX;
                b.y = exitY;
                
                // WARP CATAPULT - Launch TOWARDS CENTER with controlled force
                const launchAngle = Math.atan2(centerY - exitY, centerX - exitX);
                const launchSpeed = 12; // Reduced from 18 for stability
                
                // Set velocity towards center
                b.vx = Math.cos(launchAngle) * launchSpeed;
                b.vy = Math.sin(launchAngle) * launchSpeed;
                
                // Store boost angle for continuous boost
                b.portalBoostAngle = launchAngle;
                
                // Warp chain system
                b.warpChain++;
                b.lastPortalTime = currentTime;
                
                // Set cooldown (3 seconds - reduced)
                b.portalCooldown = 3.0;
                portal.active = false;
                setTimeout(() => { portal.active = true; }, 3000);
                
                // Visual effects - EXPLOSIVE EXIT with shockwave
                addParticle(exitX, exitY, exitPortal.color, 100);
                addParticle(exitX, exitY, '#ffffff', 80);
                addParticle(exitX, exitY, portal.color, 60);
                addParticle(exitX, exitY, '#ffff00', 40);
                
                // Shockwave ring
                for (let i = 0; i < 16; i++) {
                  const ringAngle = (Math.PI * 2 / 16) * i;
                  const ringX = exitX + Math.cos(ringAngle) * 30;
                  const ringY = exitY + Math.sin(ringAngle) * 30;
                  addParticle(ringX, ringY, exitPortal.color, 15);
                }
                
                // Launch trail particles - create a beam effect
                for (let i = 0; i < 30; i++) {
                  const trailDist = i * 4;
                  const trailX = exitX + Math.cos(launchAngle) * trailDist;
                  const trailY = exitY + Math.sin(launchAngle) * trailDist;
                  addParticle(trailX, trailY, exitPortal.color, 10);
                  addParticle(trailX, trailY, '#ffffff', 6);
                }
                
                // Record event
                recordEvent('PORTAL_WARP', {
                  bey: b === b1 ? 'b1' : 'b2',
                  from: portal.id,
                  to: exitPortal.id,
                  warpChain: b.warpChain,
                  velocity: launchSpeed
                });
                
                // FASE 1: Portal teleport effects
                addEnergyParticles(b.x, b.y, '#a78bfa', 20);
                addSparkParticles(b.x, b.y, 10);
                // Check for warp chain bonus
                if (currentTime - b.lastPortalTime < 3 && b.warpChain >= 2) {
                  // WARP CHAIN ACTIVATED!
                  recordEvent('WARP_CHAIN_ACTIVE', {
                    bey: b === b1 ? 'b1' : 'b2',
                    chain: b.warpChain
                  });
                  addParticle(b.x, b.y, '#ff00ff', 60);
                  addParticle(b.x, b.y, '#ffff00', 50);
                }
                
                // Reset portal flag immediately after teleport
                b.inPortal = false;
              } else {
                // No valid exit portal - cancel teleport
                b.inPortal = false;
              }
            }
          });
        }
        
        // Reset warp chain if too much time passed
        if (currentTime - b.lastPortalTime > 3) {
          b.warpChain = 0;
        }
        
        // Apply warp chain damage bonus on next hit
        // This is checked in collision detection
        
        // Friction - reduced to preserve portal momentum
        b.vx *= 0.990;
        b.vy *= 0.990;
        
        // ═══════════════════════════════════════════════════════════════
        // ARENA SLOPE GRAVITY
        // v3.5-HÍBRIDO: Dead Zone + Gravidade Reduzida + Cooldown
        // ═══════════════════════════════════════════════════════════════
        
        // Inicializar cooldown
        if (!b.gravityDisabledUntil) b.gravityDisabledUntil = 0;
        
        const DEAD_ZONE_RADIUS = 40;  // Centro livre
        const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
        
        // Verificar cooldown
        const currentFrame = Math.floor(_simTime / 16.67);
        const inCooldown = currentFrame < b.gravityDisabledUntil;
        
        // Aplicar gravidade (OCTAGONAL/NEXUS)
        if (distToCenter > DEAD_ZONE_RADIUS && !inCooldown) {
          let gravity = 0.12;  // Base reduzida (era 0.08-0.50, agora ~8x menor!)
          
          // Progressão com distância
          const distBeyondDeadZone = distToCenter - DEAD_ZONE_RADIUS;
          const distanceMultiplier = 1.0 + (distBeyondDeadZone / 120);
          gravity *= Math.min(distanceMultiplier, 1.8);
          
          // Ajustar por zona (similar mas muito mais fraco)
          if (distToCenter <= nexusZones.centerSafe) gravity *= 0.8;
          else if (distToCenter <= nexusZones.mainArea * 0.5) gravity *= 1.2;
          else if (distToCenter <= nexusZones.mainArea) gravity *= 1.5;
          else gravity *= 2.0;
          
          b.vx += Math.cos(angleToCenter) * gravity;
          b.vy += Math.sin(angleToCenter) * gravity;
          
          // Visual feedback para slope (particles quando deslizando)
          if (gravity > 0.08 && velocity > 3 && Math.random() < 0.08) {
            addParticle(b.x, b.y, ARENA.colors.grid, 3);
          }
        }
        
        // Extra center pull para Stamina (REDUZIDO também!)
        // v3.5-HÍBRIDO: 0.15 → 0.03 (5x menor)
        if (b.bey?.type === 'Stamina' && distToCenter > DEAD_ZONE_RADIUS && !inCooldown) {
          const extraPull = 0.03;  // Era 0.15, agora 5x menor!
          b.vx += Math.cos(angleToCenter) * extraPull;
          b.vy += Math.sin(angleToCenter) * extraPull;
        }
        // ═══════════════════════════════════════════════════════════════
        
        // Stamina drain - varies by zone like circular arenas
        let staminaLoss = 0.14 - ((b.bey?.effectiveStats?.sta || 10) * 0.005);
        staminaLoss += velocity * 0.008;
        
        // Zone-based stamina multipliers
        if (distToCenter < nexusZones.centerSafe) {
          staminaLoss *= 0.7; // Safe zone - efficient
        } else if (distToCenter < nexusZones.mainArea * 0.5) {
          staminaLoss *= 0.9; // Inner area - normal
        } else if (distToCenter < nexusZones.mainArea) {
          staminaLoss *= 1.1; // Main area - slightly more drain
        } else {
          staminaLoss *= 1.3; // Near walls - high drain
        }
        
        // LAD
        if (velocity < 2 && b.bey?.type === 'Stamina') {
          staminaLoss *= 0.6;
          if (isOppositeSpin) staminaLoss *= 0.7;
          if (Math.random() < 0.05) addParticle(b.x, b.y, '#00ff88', 5);
        }
        
        const hasPerpetual = b.bey?.synergies?.some(s => s?.name?.includes('Perpetual')) || false;
        if (hasPerpetual) staminaLoss -= 0.01;
        
        // ETERNAL SPIN (STA 27+) - Não perde stamina nos primeiros 5s
        if (b.eternalSpinActive && b.eternalSpinTimer < 300) {
          staminaLoss = 0;
        }
        
        b.stamina -= staminaLoss;
        
        // SAFETY CHECK: Ensure bey is always within arena bounds
        // 🛰️ SATELLITE: pular durante órbita — updateOrbit controla posição
        const maxDistFromCenter = nexusZones.wall - b.radius - 10;
        if (!b.isOrbiting && distToCenter > maxDistFromCenter) {
          // Emergency repositioning - place back in safe zone
          const angle = Math.atan2(b.y - centerY, b.x - centerX);
          b.x = centerX + Math.cos(angle) * maxDistFromCenter;
          b.y = centerY + Math.sin(angle) * maxDistFromCenter;
          
          // Reduce velocity
          b.vx *= 0.7;
          b.vy *= 0.7;
          
          addParticle(b.x, b.y, '#ff9900', 15);
        }
        
        // Octagonal wall collision
        // 🛰️ SATELLITE: pular durante órbita — updateOrbit garante posição válida
        const wallMargin = b.radius + 5;
        const octagonRadius = nexusZones.wall;
        
        if (!b.isOrbiting && distToCenter > octagonRadius - wallMargin) {
          // Push back inside
          const angle = Math.atan2(b.y - centerY, b.x - centerX);
          b.x = centerX + Math.cos(angle) * (octagonRadius - wallMargin);
          b.y = centerY + Math.sin(angle) * (octagonRadius - wallMargin);
          
          // Bounce
          const normalX = Math.cos(angle);
          const normalY = Math.sin(angle);
          const dotProduct = b.vx * normalX + b.vy * normalY;
          
          b.vx = b.vx - 2 * dotProduct * normalX;
          b.vy = b.vy - 2 * dotProduct * normalY;
          
          b.vx *= 0.75;
          b.vy *= 0.75;
          b.stamina -= 1.5;
          b.burstDamage += 0.4;
          
          addParticle(b.x, b.y, '#ffffff', 10);
        }
      }
      
      function distanceToSegment(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSquared = dx * dx + dy * dy;
        
        if (lengthSquared === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
        
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
        const projX = x1 + t * dx;
        const projY = y1 + t * dy;
        
        return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
      }
      
      // ============================================
      // 🆕 UPDATE LAUNCH PATTERNS (HEADLESS)
      // ============================================
      const deltaTime = 1/60; // 60 FPS

      // Phantom Launch - Update invisibility
      if (b1.isInvisible) {
        const elapsed = (_simTime - b1.invisibleStartTime) / 1000;
        if (elapsed >= b1.phantomDuration) {
          b1.isInvisible = false;
          b1.invulnerable = false;
        }
      }
      if (b2.isInvisible) {
        const elapsed = (_simTime - b2.invisibleStartTime) / 1000;
        if (elapsed >= b2.phantomDuration) {
          b2.isInvisible = false;
          b2.invulnerable = false;
        }
      }

      // Satellite Launch — roda ANTES da física de arena para garantir posição correta
      if (b1.updateOrbit) b1.updateOrbit(deltaTime);
      if (b2.updateOrbit) b2.updateOrbit(deltaTime);
      
      checkCollision();
      
      // Pendulum Launch
      if (b1.updatePendulum) b1.updatePendulum(deltaTime);
      if (b2.updatePendulum) b2.updatePendulum(deltaTime);
      
      // Vortex Launch
      if (b1.updateVortex) b1.updateVortex(b2, deltaTime);
      if (b2.updateVortex) b2.updateVortex(b1, deltaTime);
      
      // ═══════════════════════════════════════════════════════════════
      // STABILITY SYSTEM v2.0 - Dynamic Equilibrium & Control
      // ═══════════════════════════════════════════════════════════════
      // Process stability for both beyblades
      [b1, b2].forEach(b => {
        if (!b.alive) return;
        
        const bSpinPercent = (b.spinSpeed / b.stats.maxSpin);
        const velocity = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        
        // DYNAMIC STABILITY CAP - Falls as beyblade weakens
        const maxStability = Math.min(150, 150 * (0.6 + bSpinPercent * 0.4)); // Cap absoluto em 150
        b.stability = Math.min(b.stability, maxStability);
        
        // RECOVERY SYSTEM - Only when calm and not recently hit
        const timeSinceLastHit = _simTime - (b.lastHitTime || 0);
        const canRecover = velocity < 1.5 && timeSinceLastHit > 750; // 750ms = ~45 frames at 60fps
        
        if (canRecover) {
          if (b.bey?.type === 'Defense') {
            // Defense types recover better
            // SOLUÇÃO 2: aumentado de 0.18 para 0.35
            b.stability += 0.35;
          } else if (velocity < 1) {
            // Very low velocity allows some recovery
            // SOLUÇÃO 2: aumentado de 0.08 para 0.20
            b.stability += 0.20;
          }
          b.stability = Math.min(maxStability, b.stability);
        }
        
        // LATE GAME INSTABILITY - Wobble from low spin/stamina
        if (bSpinPercent < 0.3 || b.stamina < 50) {
          const instabilityFactor = Math.max(0, 0.3 - bSpinPercent) + Math.max(0, (50 - b.stamina) / 200);
          b.stability -= instabilityFactor * 0.25;
        }
        
        // CRITICAL STABILITY CHECK - Enhanced Over Finish mechanics
        const balanceResistance = (b.bey?.effectiveStats?.bal || 10);
        const criticalThreshold = 15 + (balanceResistance * 1.5);
        
        if (b.stability < criticalThreshold && bSpinPercent > 0.1 && !winner && !burstTriggered) {
          // Over Finish now based on actual stability collapse, not RNG
          const collapseRisk = (criticalThreshold - b.stability) / criticalThreshold;
          
          // High velocity makes collapse more likely
          const velocityFactor = Math.min(1, velocity / 8);
          
          // Combined collapse chance
          const shouldCollapse = collapseRisk > 0.7 || (collapseRisk > 0.5 && velocityFactor > 0.6);
          
          if (shouldCollapse) {
            recordEvent('OVER_FINISH', {
              bey: b === b1 ? 'b1' : 'b2',
              finalStability: b.stability,
              criticalThreshold: criticalThreshold,
              collapseRisk: collapseRisk,
              reason: 'Stability collapse from repeated impacts'
            });
            winner = b === b1 ? b2 : b1;
            winMethod = 'Over Finish';
            b.alive = false;
            
            // Over Finish visual - bey tips over
            addParticle(b.x, b.y, b.color, 30);
            addParticle(b.x, b.y, '#ff9900', 25);
            addParticle(b.x, b.y, '#ffffff', 20);
          }
        }
        
        // Clamp to valid range
        b.stability = Math.max(0, Math.min(maxStability, b.stability));
      });
      
      // ═══════════════════════════════════════════════════════════════
      // POST-PHYSICS WINNER CHECK - Simple and Reliable
      // ═══════════════════════════════════════════════════════════════
      // After all physics updates, check if one fell and the other didn't
      // This is the FINAL authority on Spin Finish victories
      // ═══════════════════════════════════════════════════════════════
      if (!winner && !burstTriggered) {
        // Case 1: B1 fell, B2 is standing
        if (b1.fellOver && !b2.fellOver && b2.alive) {
          recordEvent('SPIN_FINISH_FINAL', {
            winner: 'b2',
            loser: 'b1',
            reason: 'B1 fell over, B2 still spinning'
          });
          winner = b2;
          winMethod = 'Spin Finish';
          b1.alive = false;
          addParticle(b1.x, b1.y, b1.color, 20);
          addParticle(b2.x, b2.y, '#00ff00', 30); // Victory particles
        }
        // Case 2: B2 fell, B1 is standing
        else if (b2.fellOver && !b1.fellOver && b1.alive) {
          recordEvent('SPIN_FINISH_FINAL', {
            winner: 'b1',
            loser: 'b2',
            reason: 'B2 fell over, B1 still spinning'
          });
          winner = b1;
          winMethod = 'Spin Finish';
          b2.alive = false;
          addParticle(b2.x, b2.y, b2.color, 20);
          addParticle(b1.x, b1.y, '#00ff00', 30); // Victory particles
        }
        // Case 3: Both fell - check timing for draw
        else if (b1.fellOver && b2.fellOver && !winner) {
          const time1 = b1.staminaDepletionTime || b1.lastStopTime || 0;
          const time2 = b2.staminaDepletionTime || b2.lastStopTime || 0;
          const timeDiff = Math.abs(time1 - time2);
          
          if (timeDiff < 200) {
            // Both fell within 200ms - it's a draw
            recordEvent('DRAW', { 
              reason: 'Both fell simultaneously',
              timeDiff: timeDiff
            });
            winner = 'DRAW';
            winMethod = 'Draw';
            b1.alive = false;
            b2.alive = false;
            addParticle(b1.x, b1.y, '#ffff00', 30);
            addParticle(b2.x, b2.y, '#ffff00', 30);
          } else {
            // Someone fell first - they lose
            if (time1 < time2) {
              // B1 fell first
              winner = b2;
              winMethod = 'Spin Finish';
              b1.alive = false;
              recordEvent('SPIN_FINISH_FINAL', {
                winner: 'b2',
                loser: 'b1',
                reason: 'B1 fell first'
              });
            } else {
              // B2 fell first
              winner = b1;
              winMethod = 'Spin Finish';
              b2.alive = false;
              recordEvent('SPIN_FINISH_FINAL', {
                winner: 'b1',
                loser: 'b2',
                reason: 'B2 fell first'
              });
            }
          }
        }
      }
      
      if (burstTriggered && burstDelay > 0) {
        burstDelay--;
        if (burstDelay === 0 && winner !== 'DRAW') {
          if (!b1.alive && b2.alive) {
            winner = b2;
            winMethod = 'Burst Finish';
            addEvent('BURST', 'BURST FINISH!', `${bey2.name} destroys opponent!`);
          } else if (!b2.alive && b1.alive) {
            winner = b1;
            winMethod = 'Burst Finish';
            addEvent('BURST', 'BURST FINISH!', `${bey1.name} destroys opponent!`);
          }
        }
      }
      
      // Sombras dos beyblades (FASE 2 - Pseudo-3D)
      drawBeyShadow(b1);
      drawBeyShadow(b2);
      
      // Update and draw motion trails (FASE 1)
      updateTrail(b1, b1Trail, 8);
      updateTrail(b2, b2Trail, 8);
      drawTrail(b1Trail, b1.color, b1.bey?.colors);
      drawTrail(b2Trail, b2.color, b2.bey?.colors);

      drawBey(b1);
      drawBey(b2);
      
      // BURST FINISH ANNOUNCEMENT
      if (burstTriggered && endingTimer > 0 && endingTimer < 90) {
        ctx.save();
        const scale = Math.min(1, endingTimer / 20);
        const alpha = endingTimer < 60 ? 1 : (90 - endingTimer) / 30;
        
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ff0000';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 8;
        ctx.font = `bold ${60 * scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const text = '💥 BURST FINISH! 💥';
        ctx.strokeText(text, centerX, centerY - 100);
        ctx.fillText(text, centerX, centerY - 100);
        
        ctx.restore();
      }
      
      // SPIN FINISH ANNOUNCEMENT
      if (winner && winMethod === 'Spin Finish' && endingTimer > 0 && endingTimer < 70) {
        ctx.save();
        const scale = Math.min(1, endingTimer / 20);
        const alpha = endingTimer < 50 ? 1 : (70 - endingTimer) / 20;
        
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#fbbf24';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 6;
        ctx.font = `bold ${50 * scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const text = '🌀 SPIN FINISH! 🌀';
        ctx.strokeText(text, centerX, centerY - 100);
        ctx.fillText(text, centerX, centerY - 100);
        
        ctx.restore();
      }
      
      _noop({
        stamina1: Math.max(0, (b1.stamina / 250) * 100),
        stamina2: Math.max(0, (b2.stamina / 250) * 100),
        spin1: Math.max(0, (b1.spinSpeed / b1.stats.maxSpin) * 100),
        spin2: Math.max(0, (b2.spinSpeed / b2.stats.maxSpin) * 100),
        stability1: Math.max(0, (b1.stability / 150) * 100),
        stability2: Math.max(0, (b2.stability / 150) * 100)
      });
      
      // Update Battle HUD State
      _noop({
        stamina1: Math.max(0, (b1.stamina / 250) * 100),
        stamina2: Math.max(0, (b2.stamina / 250) * 100),
        spin1: Math.max(0, (b1.spinSpeed / b1.stats.maxSpin) * 100),
        spin2: Math.max(0, (b2.spinSpeed / b2.stats.maxSpin) * 100),
        stability1: Math.max(0, (b1.stability / 150) * 100),
        stability2: Math.max(0, (b2.stability / 150) * 100),
        time: (_simTime - battleStartTimeRef) / 1000,
        bey1Combos: 0, // TODO: Add combo tracking
        bey2Combos: 0
      });
      
      // Record stats history for replay
      const currentTime = (_simTime - battleStartTimeRef) / 1000;
      statsHistoryRef.push({
        time: currentTime,
        stamina1: Math.max(0, Math.min(100, (b1.stamina / 250) * 100)), // FIX: era /150, stamina começa em 250
        stamina2: Math.max(0, Math.min(100, (b2.stamina / 250) * 100)), // FIX: era /150, stamina começa em 250
        spin1: Math.max(0, (b1.spinSpeed / b1.stats.maxSpin) * 100),
        spin2: Math.max(0, (b2.spinSpeed / b2.stats.maxSpin) * 100)
      });
      
      if (winner) {
        endingTimer++;
        
        // Longer delay for burst to show pieces settling
        const delayFrames = 1; // HEADLESS: resolve immediately on winner
        
        if (endingTimer >= delayFrames) {
          // CORREÇÃO: Verificar se é DRAW antes de acessar propriedades do objeto
          const isDraw = winner === 'DRAW';
          
          const _replayData = {
              events: replayEventsRef,
              statsHistory: statsHistoryRef,
              duration: (_simTime - battleStartTimeRef) / 1000,
              arena: arenaType,
              bey1: {
                name: bey1.name,
                type: bey1.type,
                rotation: bey1.rotation,
                launch: md3State.launch1,
                finalStats: {
                  hits: b1.stats.hitsLanded,
                  damage: b1.stats.damageCaused,
                  finalSpin: b1.spinSpeed,
                  finalStamina: b1.stamina
                }
              },
              bey2: {
                name: bey2.name,
                type: bey2.type,
                rotation: bey2.rotation,
                launch: md3State.launch2,
                finalStats: {
                  hits: b2.stats.hitsLanded,
                  damage: b2.stats.damageCaused,
                  finalSpin: b2.spinSpeed,
                  finalStamina: b2.stamina
                }
              }
            };
          const _result = {
            winner: isDraw ? 'DRAW' : winner.bey,
            loser: isDraw ? 'DRAW' : (winner === b1 ? b2.bey : b1.bey),
            method: winMethod,
            winnerStats: isDraw ? null : winner.stats,
            loserStats: isDraw ? null : (winner === b1 ? b2.stats : b1.stats),
            replayData: _replayData
          };
          // ✅ Calcula prêmios pós-batalha (igual ao BattleComponents)
          _replayData.awards = calculateAwards(_result, _replayData);
          _resolve(_result);
          _battleDone = true;
          return;
        }
      }
      
      
      // Restore screen shake and draw flash effect (FASE 1)
      ctx.restore();
      
      // Draw flash effect (ALWAYS LAST)
      if (flashEffect.active) {
        ctx.globalAlpha = flashEffect.alpha;
        ctx.fillStyle = flashEffect.color;
        ctx.fillRect(0, 0, 1000, 700);
        ctx.globalAlpha = 1;
      }

      // HEADLESS: no rAF - while loop handles iteration
    }
    
    // HEADLESS: while loop starts iteration
    // ─── FIM DO MOTOR ────────────────────────────────────────────────────────────────────

    // While loop: substitui requestAnimationFrame
    const MAX_FRAMES = 60 * 180; // 3 minutos de segurança
    let _frameCount = 0;

    while (!_battleDone && _frameCount < MAX_FRAMES) {
      update();
      _simTime += 16.667; // avança o relógio simulado 1 frame a 60fps
      _frameCount++;
    }

    // Safety: se chegou no limite sem vencedor
    if (!_battleDone) {
      const _timeoutReplayData = {
        events: replayEventsRef,
        statsHistory: statsHistoryRef,
        arena: md3State?.arenaOrder?.[0] || 'BB10_COMPETITIVE',
        bey1: {
          name: bey1?.name,
          type: bey1?.type,
          rotation: bey1?.rotation,
          launch: md3State?.launch1,
          finalStats: { hits: 0, damage: 0, finalSpin: 0, finalStamina: 0 }
        },
        bey2: {
          name: bey2?.name,
          type: bey2?.type,
          rotation: bey2?.rotation,
          launch: md3State?.launch2,
          finalStats: { hits: 0, damage: 0, finalSpin: 0, finalStamina: 0 }
        }
      };
      const _timeoutResult = {
        winner: 'DRAW',
        loser: 'DRAW',
        method: 'Timeout',
        winnerStats: null,
        loserStats: null,
        replayData: _timeoutReplayData
      };
      // ✅ Calcula prêmios mesmo em timeout
      _timeoutReplayData.awards = calculateAwards(_timeoutResult, _timeoutReplayData);
      _resolve(_timeoutResult);
    }
  });
}

// ─── Roda um MD3/MD5 completo ─────────────────────────────────────
export async function runHeadlessMD3(team1, team2, arenaOrder, format = 'MD3', onRoundComplete = null, context = {}) {
  // 🔧 FIX: Suporte para MD3, MD5 e MD7
  let winsNeeded, maxRounds;
  
  if (format === 'MD1') {
    winsNeeded = 1;
    maxRounds = 1;
  } else if (format === 'MD7') {
    winsNeeded = 4;
    maxRounds = 7;
  } else if (format === 'MD5') {
    winsNeeded = 3;
    maxRounds = 5;
  } else { // MD3 ou qualquer outro = default MD3
    winsNeeded = 2;
    maxRounds = 3;
  }
  


  const score = { team1: 0, team2: 0 };
  const rounds = [];
  const usedBeys1 = [];
  const usedBeys2 = [];
  let lastResult1 = null;
  let lastResult2 = null;

  for (let roundNum = 1; roundNum <= maxRounds; roundNum++) {
    // 🔧 FIX: Verificação DUPLA para garantir que pare quando alguém ganhar
    if (score.team1 >= winsNeeded || score.team2 >= winsNeeded) {
      break;
    }

    const arena = arenaOrder[(roundNum - 1) % arenaOrder.length] || 'BB10_COMPETITIVE';

    // Seleciona beyblades
    const available1 = (team1.deck || []).filter(b => !usedBeys1.includes(b));
    const available2 = (team2.deck || []).filter(b => !usedBeys2.includes(b));
    // FIX: passa null como oponente na primeira seleção, depois reavalia com oponente conhecido
    const bey1 = selectBeybladeStrategically(available1.length ? available1 : team1.deck, null, arena, lastResult1);
    const bey2 = selectBeybladeStrategically(available2.length ? available2 : team2.deck, bey1, arena, lastResult2);

    if (!bey1 || !bey2) break;

    usedBeys1.push(bey1);
    usedBeys2.push(bey2);

    // Seleciona técnicas de lançamento
    const launch1Key = selectLaunchTechnique(bey1.type, bey2.type, bey2.rotation, bey1.rotation, arena);
    const launch2Key = selectLaunchTechnique(bey2.type, bey1.type, bey1.rotation, bey2.rotation, arena);
    
    const launchPower1 = team1?.attributes?.launchPower || 5;
    const launchPower2 = team2?.attributes?.launchPower || 5;
    
    const quality1 = determineLaunchQuality ? determineLaunchQuality(launchPower1, team1.name, context?.tournamentStage || 'R64', team1?.mentality) : { key: 'STANDARD', ...LAUNCH_QUALITY.STANDARD };
    const quality2 = determineLaunchQuality ? determineLaunchQuality(launchPower2, team2.name, context?.tournamentStage || 'R64', team2?.mentality) : { key: 'STANDARD', ...LAUNCH_QUALITY.STANDARD };

    // ── Dados computados a partir dos rounds anteriores ──
    const _prevRound = rounds.length > 0 ? rounds[rounds.length - 1] : null;
    const _team1PrevBurst = _prevRound?.winner === 'team1' && (_prevRound?.method || '').toLowerCase().includes('burst');
    const _team2PrevBurst = _prevRound?.winner === 'team2' && (_prevRound?.method || '').toLowerCase().includes('burst');

    // Contar rounds consecutivos em que o adversário usou a mesma técnica de lançamento
    const _countRepeatTech = (launch, rounds, asTeam) => {
      let count = 0;
      for (let i = rounds.length - 1; i >= 0; i--) {
        const r = rounds[i];
        const usedKey = asTeam === 'team1' ? r.launch1 : r.launch2;
        if (usedKey === launch) count++; else break;
      }
      return count;
    };
    const _team1RepeatTech = _countRepeatTech(launch1Key, rounds, 'team1'); // rounds que TIME1 repetiu mesma tech
    const _team2RepeatTech = _countRepeatTech(launch2Key, rounds, 'team2');

    // Contar vitórias de cada equipe no torneio atual (via context ou default 0)
    const _team1TourneyWins = context?.team1TourneyWins ?? 0;
    const _team2TourneyWins = context?.team2TourneyWins ?? 0;

    // H2H advantage (positivo = team1 tem mais vitórias contra team2)
    const _team1H2HAdv = context?.team1H2HAdv ?? 0;
    const _team2H2HAdv = context?.team2H2HAdv ?? 0;

    // Última derrota vs adversário específico (para ESPECIALISTA_EM_REVANCHE)
    const _team1LastLostVsOpp = context?.team1LastLostVsOpp ?? false;
    const _team2LastLostVsOpp = context?.team2LastLostVsOpp ?? false;

    // Estado de forma do adversário (para DESTRUIDOR_DE_MORAL)
    const _team1OppFormaName = context?.team2FormaName ?? 'NEUTRAL';
    const _team2OppFormaName = context?.team1FormaName ?? 'NEUTRAL';

    const md3State = {
      team1, team2,
      team1Wins: score.team1,
      team2Wins: score.team2,
      winsNeeded,
      maxRounds,
      currentRound: roundNum,
      arenaOrder: arenaOrder,
      format,
      launch1: launch1Key,
      launch2: launch2Key,
      launchQuality1: quality1,
      launchQuality2: quality2,
      tournamentStage: context?.tournamentStage || 'R64',
      tournamentTier:  context?.tournamentTier  || '',
      lostRound1Team1: rounds.length > 0 && !rounds[0]?.team1Won,
      lostRound1Team2: rounds.length > 0 && rounds[0]?.team1Won,
      // ── campos extras para traits ──
      team1PrevBurst: _team1PrevBurst,
      team2PrevBurst: _team2PrevBurst,
      team1RepeatTech: _team1RepeatTech,   // rounds consecutivos que TIME1 usou a mesma tech (para GLADIADOR do adversário: team2RepeatTech → visto por team1)
      team2RepeatTech: _team2RepeatTech,
      team1TourneyWins: _team1TourneyWins,
      team2TourneyWins: _team2TourneyWins,
      team1H2HAdv: _team1H2HAdv,
      team2H2HAdv: _team2H2HAdv,
      team1LastLostVsOpp: _team1LastLostVsOpp,
      team2LastLostVsOpp: _team2LastLostVsOpp,
      team1FormaName: _team2OppFormaName, // FormaName do ADVERSÁRIO de team1 (usado para DESTRUIDOR_DE_MORAL de team1)
      team2FormaName: _team1OppFormaName,
    };

    const result = await runHeadlessRound(
      bey1,  // arena preference já está no BASE (aplicado em adaptDeckForArena)
      bey2,  // arena preference já está no BASE (aplicado em adaptDeckForArena)
      md3State
    );

    const team1Won = result.winner === bey1 || result.winner?.name === bey1.name;
    const team2Won = result.winner === bey2 || result.winner?.name === bey2.name;

    if (team1Won) { 
      score.team1++; 
      lastResult1 = 'win'; 
      lastResult2 = 'loss'; 
    }
    else if (team2Won) { 
      score.team2++; 
      lastResult1 = 'loss'; 
      lastResult2 = 'win'; 
    }
    else {
    }
    
    // 🔧 FIX: Verificação IMEDIATA após atualizar score
    if (score.team1 >= winsNeeded || score.team2 >= winsNeeded) {
      rounds.push({
        roundNumber: roundNum,
        arena,
        winner: team1Won ? 'team1' : (team2Won ? 'team2' : 'draw'),
        winnerBey: result.winner,
        loserBey: result.loser,
        method: result.method,
        bey1, bey2,
        launch1: launch1Key,
        launch2: launch2Key,
      });
      break; // PARA IMEDIATAMENTE
    }

    const roundData = {
      roundNumber: roundNum,
      arena,
      winner: team1Won ? 'team1' : (team2Won ? 'team2' : 'draw'),
      winnerBey: result.winner,
      loserBey: result.loser,
      method: result.method,
      bey1, bey2,
      launch1: launch1Key,
      launch2: launch2Key,
    };

    rounds.push(roundData);
    if (onRoundComplete) onRoundComplete(roundNum, roundData, { ...score });
  }

  const matchWinner = score.team1 > score.team2 ? team1 : (score.team2 > score.team1 ? team2 : null);

  return {
    winner: matchWinner,
    score,
    rounds,
    format,
  };
}

// ─── VERSÃO SÍNCRONA — para simulação em turbo (sem async/await) ──────────────
//
// runHeadlessRoundSync: extrai o resultado do while loop síncrono sem overhead de Promise.
// Funciona porque o executor de Promise roda SINCRONAMENTE, então _syncCapture.result
// já está preenchido antes de qualquer microtask ser enfileirada.
//
export function runHeadlessRoundSync(bey1, bey2, md3State) {
  const capture = { result: null };
  runHeadlessRound(bey1, bey2, md3State, capture);
  return capture.result;
}

// runHeadlessMD3Sync: mesmo fluxo de runHeadlessMD3 mas síncrono e sem console.log.
// Usado pelo turbo multi-season para máxima velocidade.
export function runHeadlessMD3Sync(team1, team2, arenaOrder, format = 'MD3', context = {}) {
  let winsNeeded, maxRounds;
  if (format === 'MD7') { winsNeeded = 4; maxRounds = 7; }
  else if (format === 'MD1') { winsNeeded = 1; maxRounds = 1; }
  else if (format === 'MD5') { winsNeeded = 3; maxRounds = 5; }
  else { winsNeeded = 2; maxRounds = 3; }

  const score = { team1: 0, team2: 0 };
  const rounds = [];
  const usedBeys1 = [];
  const usedBeys2 = [];
  let lastResult1 = null;
  let lastResult2 = null;

  for (let roundNum = 1; roundNum <= maxRounds; roundNum++) {
    if (score.team1 >= winsNeeded || score.team2 >= winsNeeded) break;

    const arena = arenaOrder[(roundNum - 1) % arenaOrder.length] || 'BB10_COMPETITIVE';

    const available1 = (team1.deck || []).filter(b => !usedBeys1.includes(b));
    const available2 = (team2.deck || []).filter(b => !usedBeys2.includes(b));
    const bey1 = selectBeybladeStrategically(available1.length ? available1 : team1.deck, null, arena, lastResult1);
    const bey2 = selectBeybladeStrategically(available2.length ? available2 : team2.deck, bey1, arena, lastResult2);
    if (!bey1 || !bey2) break;

    usedBeys1.push(bey1);
    usedBeys2.push(bey2);

    const launch1Key = selectLaunchTechnique(bey1.type, bey2.type, bey2.rotation, bey1.rotation, arena);
    const launch2Key = selectLaunchTechnique(bey2.type, bey1.type, bey1.rotation, bey2.rotation, arena);

    const launchPower1 = team1?.attributes?.launchPower || 5;
    const launchPower2 = team2?.attributes?.launchPower || 5;
    const quality1 = determineLaunchQuality ? determineLaunchQuality(launchPower1, team1.name, context?.tournamentStage || 'R64', team1?.mentality) : { key: 'STANDARD', ...LAUNCH_QUALITY.STANDARD };
    const quality2 = determineLaunchQuality ? determineLaunchQuality(launchPower2, team2.name, context?.tournamentStage || 'R64', team2?.mentality) : { key: 'STANDARD', ...LAUNCH_QUALITY.STANDARD };

    const _prevRound = rounds.length > 0 ? rounds[rounds.length - 1] : null;
    const _team1PrevBurst = _prevRound?.winner === 'team1' && (_prevRound?.method || '').toLowerCase().includes('burst');
    const _team2PrevBurst = _prevRound?.winner === 'team2' && (_prevRound?.method || '').toLowerCase().includes('burst');

    const _countRepeatTechSync = (launch, rds, asTeam) => {
      let count = 0;
      for (let i = rds.length - 1; i >= 0; i--) {
        const usedKey = asTeam === 'team1' ? rds[i].launch1 : rds[i].launch2;
        if (usedKey === launch) count++; else break;
      }
      return count;
    };
    const _team1RepeatTech = _countRepeatTechSync(launch1Key, rounds, 'team1');
    const _team2RepeatTech = _countRepeatTechSync(launch2Key, rounds, 'team2');

    const md3State = {
      team1, team2,
      team1Wins: score.team1, team2Wins: score.team2,
      winsNeeded, maxRounds, currentRound: roundNum, arenaOrder, format,
      launch1: launch1Key, launch2: launch2Key,
      launchQuality1: quality1, launchQuality2: quality2,
      tournamentStage: context?.tournamentStage || 'R64',
      tournamentTier:  context?.tournamentTier  || '',
      lostRound1Team1: rounds.length > 0 && !rounds[0]?.team1Won,
      lostRound1Team2: rounds.length > 0 && rounds[0]?.team1Won,
      team1PrevBurst: _team1PrevBurst, team2PrevBurst: _team2PrevBurst,
      team1RepeatTech: _team1RepeatTech, team2RepeatTech: _team2RepeatTech,
      team1TourneyWins: context?.team1TourneyWins ?? 0,
      team2TourneyWins: context?.team2TourneyWins ?? 0,
      team1H2HAdv: context?.team1H2HAdv ?? 0,
      team2H2HAdv: context?.team2H2HAdv ?? 0,
      team1LastLostVsOpp: context?.team1LastLostVsOpp ?? false,
      team2LastLostVsOpp: context?.team2LastLostVsOpp ?? false,
      team1FormaName: context?.team2FormaName ?? 'NEUTRAL',
      team2FormaName: context?.team1FormaName ?? 'NEUTRAL',
    };

    const result = runHeadlessRoundSync(bey1, bey2, md3State);
    if (!result) break;

    const team1Won = result.winner === bey1 || result.winner?.name === bey1.name;
    const team2Won = result.winner === bey2 || result.winner?.name === bey2.name;

    if (team1Won) { score.team1++; lastResult1 = 'win';  lastResult2 = 'loss'; }
    else if (team2Won) { score.team2++; lastResult1 = 'loss'; lastResult2 = 'win';  }

    rounds.push({
      roundNumber: roundNum, arena,
      winner: team1Won ? 'team1' : (team2Won ? 'team2' : 'draw'),
      winnerBey: result.winner, loserBey: result.loser,
      method: result.method, bey1, bey2,
      launch1: launch1Key, launch2: launch2Key,
    });

    if (score.team1 >= winsNeeded || score.team2 >= winsNeeded) break;
  }

  const matchWinner = score.team1 > score.team2 ? team1 : (score.team2 > score.team1 ? team2 : null);
  return { winner: matchWinner, score, rounds, format };
}
