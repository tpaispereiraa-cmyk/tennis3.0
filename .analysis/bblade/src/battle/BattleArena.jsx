// ============================================
// BATTLE ARENA (REFATORADO)
// Componente principal da arena de batalha
// ============================================
//
// 🎯 REFATORAÇÃO v2.0
// Este arquivo agora importa módulos organizados:
// - arena/ArenaConfigs.js - Configurações das 12 arenas
// - arena/ArenaPhysics.js - Físicas específicas por arena
// - rendering/ParticleSystem.js - Sistema de partículas
// - rendering/BeybladeRenderer.js - Renderização de beyblades
// - rendering/ArenaRenderer.js - Renderização de arenas
// - physics/CollisionSystem.js - Sistema de colisões
// - physics/BattlePhysics.js - Física geral
// - core/BattleState.js - Gerenciamento de estado
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { calculateStatBreakdown, calculateTotalStat } from '../utils/stats.js';
import { useTurbo } from '../TurboContext.jsx';
import { BattleHUD } from '../BattleHUD.jsx';
import { EventFeed } from '../EventFeed.jsx';
import { CountdownOverlay, LaunchSequenceOverlay, FinishOverlay } from '../PhaseOverlays.jsx';
import { 
  EnhancedParticleSystem, 
  EnhancedImpactEffects,
  renderPremiumArena,
  renderCompetitiveArena
} from '../EnhancedRenderer.js';
import { LAUNCH_TECHNIQUES, LAUNCH_QUALITY } from '../UniverseManager.js';
import { applyArenaModifiers, applyFormMultiplier, calculateCollision, AdvancedPhysics, PHYSICS_CONSTANTS } from '../BattleEngine.js';

// 🎯 NOVOS IMPORTS - Módulos refatorados
import { ARENA_CONFIGS } from './arena/ArenaConfigs.js';
import { applyArenaPhysics } from './arena/ArenaPhysics.js';
import { 
  addParticle, 
  addSparkParticles, 
  createBurstEffect,
  updateParticles,
  renderParticles 
} from './rendering/ParticleSystem.js';
import { 
  drawBey, 
  drawTrail, 
  updateTrail 
} from './rendering/BeybladeRenderer.js';
import { drawArena } from './rendering/ArenaRenderer.js';
import { 
  checkCollision, 
  resolveCollision, 
  applyCollisionResult,
  checkWallCollision,
  resolveWallCollision
} from './physics/CollisionSystem.js';
import { 
  applyFriction,
  updatePosition,
  updateRotation,
  decaySpin,
  getVelocity,
  calculateStability,
  initializeBeybladePhysics
} from './physics/BattlePhysics.js';
import { 
  createInitialBattleState,
  updateBattleState,
  registerHit,
  checkWinConditions,
  createArenaState,
  updateArenaState
} from './core/BattleState.js';

// ⚠️ NOTA: O código completo do loop de batalha continua abaixo
// mas agora usa as funções importadas dos módulos refatorados.

const BattleArena = ({ bey1, bey2, onEnd, md3State }) => {
  const turbo = useTurbo(); // ✅ NOVO
  const canvasRef = useRef(null);
  const [stats, setStats] = useState({ stamina1: 100, stamina2: 100, spin1: 100, spin2: 100, stability1: 100, stability2: 100 });
  const [introPhase, setIntroPhase] = useState('rip'); // Inicia direto em 'rip' (que mostra launch quality)
  const [showQualityText, setShowQualityText] = useState(true); // Mostra launch quality imediatamente
  const replayEventsRef = useRef([]);
  const battleStartTimeRef = useRef(0);
  const statsHistoryRef = useRef([]);
  
  // Battle HUD State
  const [battleState, setBattleState] = useState({
    stamina1: 100,
    stamina2: 100,
    spin1: 100,
    spin2: 100,
    stability1: 100,
    stability2: 100,
    time: 0,
    bey1Combos: 0,
    bey2Combos: 0
  });
  const [events, setEvents] = useState([]);
  
  // ✨ ENHANCED RENDERER SYSTEMS
  const particleSystemRef = useRef(null);
  const impactEffectsRef = useRef(null);
  
  if (!particleSystemRef.current) {
    particleSystemRef.current = new EnhancedParticleSystem();
    impactEffectsRef.current = new EnhancedImpactEffects(particleSystemRef.current);
  }
  
  // Function to add battle events
  const addEvent = (type, title, description = '') => {
    const newEvent = {
      id: Date.now() + Math.random(),
      type,
      title,
      description,
      timestamp: Date.now()
    };
    
    setEvents(prev => [...prev, newEvent]);
    
    // Auto-remover evento após 5 segundos
    setTimeout(() => {
      setEvents(prev => prev.filter(e => e.id !== newEvent.id));
    }, 5000);
  };
  
  // Load custom icons as images
  const customIcon1Ref = useRef(null);
  const customIcon2Ref = useRef(null);
  const [iconsLoaded, setIconsLoaded] = useState(false);
  
  useEffect(() => {
    const loadIcons = async () => {
      // ⭐ PRIORIDADE: iconUrl > customIcon
      const icon1Src = md3State?.team1?.team?.iconUrl || md3State?.team1?.team?.customIcon || md3State?.team1?.customIcon || md3State?.team1?.iconUrl;
      const icon2Src = md3State?.team2?.team?.iconUrl || md3State?.team2?.team?.customIcon || md3State?.team2?.customIcon || md3State?.team2?.iconUrl;
      
      if (icon1Src) {
        const img1 = new Image();
        img1.src = icon1Src;
        await new Promise((resolve) => {
          img1.onload = resolve;
          img1.onerror = resolve; // Continue even if load fails
        });
        customIcon1Ref.current = img1;
      }
      
      if (icon2Src) {
        const img2 = new Image();
        img2.src = icon2Src;
        await new Promise((resolve) => {
          img2.onload = resolve;
          img2.onerror = resolve;
        });
        customIcon2Ref.current = img2;
      }
      
      setIconsLoaded(true);
    };
    
    loadIcons();
  }, [md3State]);

  // Intro phase effect - Apenas transição rápida de 'rip' para 'battle'
  useEffect(() => {
    if (introPhase === 'rip') {
      // Mostra launch quality por 2 segundos, depois começa a batalha
      const timer = setTimeout(() => {
        setIntroPhase('battle');
        setShowQualityText(false);
      }, turbo.turboEnabled ? 0 : 3500); // Cinematic launch screen duration
      return () => clearTimeout(timer);
    }
  }, [introPhase, turbo]); // ✅ ADICIONAR turbo

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bey1 || !bey2 || !md3State || !md3State.arenaOrder || !md3State.currentRound) return;
    if (introPhase !== 'battle') return;
    
    const arenaType = md3State.arenaOrder[md3State.currentRound - 1];
    const ctx = canvas.getContext('2d');
    canvas.width = 1000;
    canvas.height = 700;

    // ✅ TURBO: quantas vezes roda física por frame de render
    const TURBO_STEPS = turbo.turboEnabled ? Math.max(1, Math.floor(turbo.getTurboMultiplier())) : 1;

    const centerX = 500, centerY = 350;
    
    // Get launch techniques
    const launch1 = LAUNCH_TECHNIQUES[md3State.launch1 || 'STANDARD'];
    const launch2 = LAUNCH_TECHNIQUES[md3State.launch2 || 'STANDARD'];
    
    // Get launch quality
    const quality1 = md3State.launchQuality1 || { key: 'STANDARD', ...LAUNCH_QUALITY.STANDARD };
    const quality2 = md3State.launchQuality2 || { key: 'STANDARD', ...LAUNCH_QUALITY.STANDARD };
    
    // Initialize replay recording
    replayEventsRef.current = [];
    statsHistoryRef.current = [];
    battleStartTimeRef.current = Date.now();
    
    // Record launch techniques AND quality
    function recordEvent(type, data) {
      const timestamp = (Date.now() - battleStartTimeRef.current) / 1000;
      replayEventsRef.current.push({ timestamp, type, data });
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
    
    const ARENA = JSON.parse(JSON.stringify(ARENA_CONFIGS[arenaType] || ARENA_CONFIGS.BB10_COMPETITIVE)); // Deep copy para permitir modificação de sistemas dinâmicos

    // ── TIDAL SURGE: sorteia tipo de maré e espelha arenaZones ───
    if (arenaType === 'TIDAL_SURGE') {
      const tideTypes = ['standard', 'spiral', 'double', 'inverse', 'chaos'];
      ARENA.tideSystem.tideType  = tideTypes[Math.floor(Math.random() * tideTypes.length)];
      ARENA.tideSystem.spiralDirection = Math.random() < 0.5 ? 1 : -1;
      ARENA.tideSystem.dualAngle = Math.random() * Math.PI * 2;
      ARENA.tideSystem.blobs     = [];
      ARENA.tideSystem.blobTimer = 0;
      ARENA.tideSystem.intensity = 1.0;
      // Espelha arenaZones para o handler de física
      ARENA.arenaZones = ARENA.arenaZones || { island:40, floodZone:80, sand:160, wall:220 };
    }

    // ── PINBALL INFERNO V3: reset score state per battle ─────────
    if (arenaType === 'PINBALL_INFERNO') {
      ARENA.score                  = { b1: 0, b2: 0 };
      ARENA.consecutiveCenterHits  = { b1: 0, b2: 0 };
      ARENA.centerBumperCooldownB1 = 0;
      ARENA.centerBumperCooldownB2 = 0;
      if (ARENA.centerBumper) ARENA.centerBumper.cooldown = 0;
      ARENA.bumpers.forEach(bmp => { bmp.cooldown = 0; bmp.active = false; });
      ARENA.flippers.forEach(fl  => { fl.cooldown  = 0; fl.active  = false; });
    }
    
    // Cria estado da arena para controlar efeitos temporais
    const arenaState = createArenaState(arenaType);
    
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
      
      // FASE 1: Burst particles — reduced for clarity
      addImpactParticles(b.x, b.y, 14);
      addDebrisParticles(b.x, b.y, b.color, 8);
      addSmokeParticles(b.x, b.y, 5);
      addEnergyParticles(b.x, b.y, b.color, 10);
      addScreenShake(2.5);
      addFlashEffect(b.color, 0.4, 180);
      addParticle(b.x, b.y, '#ffffff', 10);
      addParticle(b.x, b.y, '#fbbf24', 8);
      addShockwave(b.x, b.y, b.color, '#ffffff', 2.2);
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
      hasBladeStorm: (bey1?.stats?.atk || 0) >= 27,
      hasAbsoluteBarrier: (bey1?.stats?.def || 0) >= 27,
      hasGyroLock: (bey1?.stats?.bal || 0) >= 27,
      hasGravityWell: (bey1?.stats?.weight || 0) >= 27,
      hasCelestialRotation: (bey1?.stats?.spin || 0) >= 50,
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
      discReactiveSpeedEnd: 0,
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
      hasBladeStorm: (bey2?.stats?.atk || 0) >= 27,
      hasAbsoluteBarrier: (bey2?.stats?.def || 0) >= 27,
      hasGyroLock: (bey2?.stats?.bal || 0) >= 27,
      hasGravityWell: (bey2?.stats?.weight || 0) >= 27,
      hasCelestialRotation: (bey2?.stats?.spin || 0) >= 50,
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
      discReactiveSpeedEnd: 0,
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

    const isOppositeSpin = (b1.spinDirection !== b2.spinDirection);

    // ============================================
    // 🆕 APLICAR LAUNCH PATTERNS
    // ============================================
    // Aplicar patterns especiais dos novos launches
    applyLaunchPattern(b1, launch1, b2, launch2, 0);
    applyLaunchPattern(b2, launch2, b1, launch1, 0);

    // ─────────────────────────────────────────────────────────
    // ── 🆕 MENTALITY BATTLE EFFECTS ──────────────────────────
    // Aplica efeitos especiais das novas mentalidades ao estado visual
    // ─────────────────────────────────────────────────────────
    try {
      function applyMentalityEffects(bState, team, quality, opponentScore, roundNum, arenaName) {
        const mentality = team?.mentality;
        if (!mentality) return;

        // 🧩 ADAPTIVE_TACTICIAN - evolui por round e por derrota
        if (mentality === 'ADAPTIVE_TACTICIAN') {
          const round = roundNum || 1;
          const roundsLost = opponentScore || 0;
          const bonus = ((round - 1) * 0.10) + (roundsLost * 0.10);
          if (bonus > 0) {
            const mult = 1 + bonus;
            bState.vx *= mult;
            bState.vy *= mult;
            bState.spinSpeed *= Math.sqrt(mult);
            if (bonus >= 0.2) {
              addParticle(bState.x, bState.y, '#14b8a6', 15);
            }
          }
        }

        // ✨ PERFECTIONIST - tudo ou nada no launch quality
        if (mentality === 'PERFECTIONIST') {
          const launchKey = quality?.key;
          if (launchKey === 'PERFECT') {
            bState.vx *= 1.25;
            bState.vy *= 1.25;
            bState.spinSpeed *= 1.25;
            addParticle(bState.x, bState.y, '#facc15', 20);
            addParticle(bState.x, bState.y, '#ffffff', 12);
            addShockwave(bState.x, bState.y, '#facc15', '#ffffff', 1.2);
          } else if (launchKey === 'WEAK' || launchKey === 'CRITICAL_FAIL') {
            bState.vx *= 0.80;
            bState.vy *= 0.80;
            bState.spinSpeed *= 0.80;
            addParticle(bState.x, bState.y, '#facc15', 6);
          }
        }

        // 🌪️ CHAOS_AGENT - prospera no caos das arenas
        if (mentality === 'CHAOS_AGENT') {
          const hazardArenas = [
            'VOLCANIC_RAGE', 'COLOSSEUM_CARNAGE', 'STORM_TRACK',
            'PANGEA_PLATFORM', 'VORTEX_MAELSTROM', 'TIDAL_SURGE',
            'TORNADO_RIDGE', 'GRAVITON_COLOSSEUM', 'KILLER_SIDES',
            'VORTEX_COLISEUM'
          ];
          if (hazardArenas.includes(arenaName)) {
            bState.vx *= 1.30;
            bState.vy *= 1.30;
            bState.spinSpeed *= 1.15;
            addParticle(bState.x, bState.y, '#a855f7', 20);
            addParticle(bState.x, bState.y, '#c026d3', 12);
          } else if (arenaName) {
            bState.vx *= 0.85;
            bState.vy *= 0.85;
            bState.spinSpeed *= 0.90;
          }
        }

        // 🦹 MOMENTUM_THIEF - cresce contra adversários em streak
        if (mentality === 'MOMENTUM_THIEF') {
          const opponentWins = opponentScore || 0;
          if (opponentWins >= 2) {
            const streakMult = 1 + (opponentWins * 0.05);
            bState.vx *= streakMult;
            bState.vy *= streakMult;
            bState.spinSpeed *= Math.sqrt(streakMult);
            bState.burstRiskMod *= Math.max(0.5, 1 - opponentWins * 0.05);
            addParticle(bState.x, bState.y, '#6366f1', 15);
            addParticle(bState.x, bState.y, '#4f46e5', 10);
          }
        }
      }

      const currentRoundNum = md3State?.currentRound || 1;
      const arenaName = arenaType; // already computed above
      applyMentalityEffects(b1, md3State?.team1, quality1, md3State?.team2Wins || 0, currentRoundNum, arenaName);
      applyMentalityEffects(b2, md3State?.team2, quality2, md3State?.team1Wins || 0, currentRoundNum, arenaName);
    } catch(e) {
      console.warn('MentalityEffects error:', e);
    }
    // ─────────────────────────────────────────────────────────

    // ─────────────────────────────────────────────────────────
    // ── ATRIBUTOS POR ROUND: CLT Clutch extra + ADA scaling ──
    // ─────────────────────────────────────────────────────────
    try {
      const _vRoundNum   = md3State?.currentRound || 1;
      const _vT1Wins     = md3State?.team1Wins    || 0;
      const _vT2Wins     = md3State?.team2Wins    || 0;
      const _vWinsNeeded = md3State?.winsNeeded   || 2;

      const _vIsClutch1 = (
        (_vWinsNeeded - _vT1Wins === 1) ||
        (_vT2Wins > _vT1Wins) ||
        (_vT1Wins === _vT2Wins && _vRoundNum >= 2)
      );
      const _vIsClutch2 = (
        (_vWinsNeeded - _vT2Wins === 1) ||
        (_vT1Wins > _vT2Wins) ||
        (_vT1Wins === _vT2Wins && _vRoundNum >= 2)
      );

      function applyRoundAttrEffectsVisual(bState, team, isClutchSit, roundN) {
        const attrs = team?.attributes;
        if (!attrs) return;

        // ADA ROUND SCALING — sta+spin crescem cada round
        const adaptPerRound = (attrs.adaptability || 7) * (5 / 15) / 100;
        const totalAdaptBonus = (roundN - 1) * adaptPerRound;
        if (totalAdaptBonus > 0.001) {
          const aMult = 1 + totalAdaptBonus;
          bState.spinSpeed       *= aMult;
          bState.stats.maxSpin  *= aMult;
          if (bState.bey?.effectiveStats) {
            bState.bey = { ...bState.bey, effectiveStats: { ...bState.bey.effectiveStats } };
            bState.bey.effectiveStats.sta  = Math.min(48, Math.round((bState.bey.effectiveStats.sta  || 10) * aMult));
            bState.bey.effectiveStats.spin = Math.min(95, Math.round((bState.bey.effectiveStats.spin || 40) * aMult));
          }
        }

        // CLT CLUTCH EXTRA — só em situação decisiva
        if (isClutchSit) {
          const clutch = attrs.clutch || 7;
          const clutchExtra = clutch < 7
            ? (clutch - 7) * (24 / 7) / 100
            : (clutch - 7) * (30 / 8) / 100;
          if (Math.abs(clutchExtra) > 0.001) {
            const cMult = 1 + clutchExtra;
            bState.vx            *= cMult;
            bState.vy            *= cMult;
            bState.spinSpeed     *= cMult;
            bState.stats.maxSpin *= cMult;
            if (bState.bey?.effectiveStats) {
              bState.bey = { ...bState.bey, effectiveStats: { ...bState.bey.effectiveStats } };
              const VCAPS = { atk: 48, def: 48, sta: 48, bal: 48, weight: 48, spin: 95 };
              ['atk','def','sta','bal','weight','spin'].forEach(s => {
                if (bState.bey.effectiveStats[s] !== undefined)
                  bState.bey.effectiveStats[s] = Math.min(VCAPS[s] || 48, Math.round(bState.bey.effectiveStats[s] * cMult));
              });
            }
            bState.hasBladeStorm        = (bState.bey?.effectiveStats?.atk    || 0) >= 27;
            bState.hasAbsoluteBarrier   = (bState.bey?.effectiveStats?.def    || 0) >= 27;
            bState.hasGyroLock          = (bState.bey?.effectiveStats?.bal    || 0) >= 27;
            bState.hasGravityWell       = (bState.bey?.effectiveStats?.weight || 0) >= 27;
            bState.hasCelestialRotation = (bState.bey?.effectiveStats?.spin   || 0) >= 50;
            if (clutchExtra > 0) addParticle(bState.x, bState.y, '#ffd700', 20);
          }
        }
      }

      applyRoundAttrEffectsVisual(b1, md3State?.team1, _vIsClutch1, _vRoundNum);
      applyRoundAttrEffectsVisual(b2, md3State?.team2, _vIsClutch2, _vRoundNum);
    } catch(e) {
      console.warn('RoundAttrEffects error:', e);
    }
    // ─────────────────────────────────────────────────────────

    let winner = null;
    let winMethod = '';
    let endingTimer = 0;
    let burstDelay = 0;
    let burstTriggered = false;

    // ============================================
    // 🆕 PROCESSAR NOVOS LAUNCH PATTERNS
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
          // Começar com velocidade muito baixa
          bey.vx *= launchTechnique.speedMod;
          bey.vy *= launchTechnique.speedMod;
          
          // Marcar como invisível
          bey.isInvisible = true;
          bey.invulnerable = special.invulnerable || true;
          bey.invisibleStartTime = Date.now();
          bey.phantomDuration = special.invisibleDuration || 2.0;
          
          // Agendar emergência
          setTimeout(() => {
            if (bey.isInvisible) {
              bey.isInvisible = false;
              bey.invulnerable = false;
              
              // Burst de velocidade ao emergir
              const emergeBurst = special.emergeBurst || 1.4;
              bey.vx *= emergeBurst;
              bey.vy *= emergeBurst;
              
              addParticle(bey.x, bey.y, '#a78bfa', 30);
              addShockwave(bey.x, bey.y, '#a78bfa', '#ffffff', 1.2);
              recordEvent('PHANTOM_EMERGE', { bey: bey === b1 ? 'b1' : 'b2' });
            }
          }, (special.invisibleDuration || 2.0) * 1000);
          break;
        
        // ========================================
        // 🪞 MIRROR LAUNCH
        // ========================================
        case 'mirror':
          if (special.copyOpponent && opponentLaunch && opponentBey) {
            // Aguardar delay
            setTimeout(() => {
              // Copiar os mods do adversário
              const bonusMultiplier = special.bonusMultiplier || 1.10;
              const opponentSpeed = Math.sqrt(opponentBey.vx ** 2 + opponentBey.vy ** 2);
              
              // Calcular direção e aplicar velocidade copiada
              const angle = Math.atan2(opponentBey.vy, opponentBey.vx);
              bey.vx = Math.cos(angle) * opponentSpeed * bonusMultiplier;
              bey.vy = Math.sin(angle) * opponentSpeed * bonusMultiplier;
              bey.spinSpeed = opponentBey.spinSpeed * bonusMultiplier;
              
              addParticle(bey.x, bey.y, '#e0e7ff', 25);
              addParticle(opponentBey.x, opponentBey.y, '#e0e7ff', 15);
              recordEvent('MIRROR_COPY', { 
                bey: bey === b1 ? 'b1' : 'b2',
                bonus: bonusMultiplier 
              });
            }, (special.delay || 0.3) * 1000);
          }
          break;
        
        // ========================================
        // 🛰️ SATELLITE LAUNCH
        // ========================================
        case 'satellite': {
          // FIX: raio dinâmico — fica dentro da arena independente do mapa
          // Para arenas ovais (wallA/wallB), usar o menor eixo para evitar ultrapassar a borda
          const _zw = ARENA.zones?.wall;
          const _zA = ARENA.zones?.wallA;
          const _zB = ARENA.zones?.wallB;
          const _rawWall = (_zA != null && _zB != null)
            ? Math.min(_zA, _zB)   // oval: menor eixo é o limitante
            : (_zw || ARENA.arenaRadius || 220);   // fallback p/ pinball (arenaRadius) ou padrão
          const safeOrbitRadius = Math.min(
            special.orbitRadius || 200,
            _rawWall - bey.radius - 25  // margem confortável de 25px
          );
          // Iniciar em órbita
          bey.isOrbiting = true;
          bey.orbitStartTime = Date.now();
          bey.orbitDuration = special.orbitDuration || 3.0;
          bey.orbitRadius = safeOrbitRadius;
          bey.orbitAngle = Math.random() * Math.PI * 2; // Ângulo inicial aleatório
          bey.orbitSpeed = (Math.PI * 2) / bey.orbitDuration; // Uma volta completa
          bey.orbitMomentum = 0;
          
          // Configurar função de update que será chamada no loop
          bey.updateOrbit = (deltaTime) => {
            if (bey.isOrbiting && (Date.now() - bey.orbitStartTime) / 1000 < bey.orbitDuration) {
              // Atualizar ângulo
              bey.orbitAngle += bey.orbitSpeed * deltaTime;
              
              // FIX: Posição orbital (usar centro REAL da arena, não (0,0))
              bey.x = centerX + Math.cos(bey.orbitAngle) * bey.orbitRadius;
              bey.y = centerY + Math.sin(bey.orbitAngle) * bey.orbitRadius;
              
              // Velocidade tangencial
              bey.vx = -Math.sin(bey.orbitAngle) * bey.orbitRadius * bey.orbitSpeed;
              bey.vy = Math.cos(bey.orbitAngle) * bey.orbitRadius * bey.orbitSpeed;
              
              // Ganhar momentum
              bey.orbitMomentum += (special.momentumGain || 0.15) * deltaTime;
              
              // Efeito visual orbital
              if (Math.random() < 0.1) {
                addParticle(bey.x, bey.y, '#06b6d4', 8);
              }
              
            } else if (bey.isOrbiting) {
              // Terminou órbita, mergulhar ao centro
              bey.isOrbiting = false;
              
              const diveBurst = special.diveBurst || 1.5;
              // FIX: Mergulhar em direção ao centro REAL da arena
              const angle = Math.atan2(centerY - bey.y, centerX - bey.x);
              
              const diveSpeed = launchTechnique.speedMod * diveBurst * (1 + bey.orbitMomentum) * 8;
              bey.vx = Math.cos(angle) * diveSpeed;
              bey.vy = Math.sin(angle) * diveSpeed;
              
              addParticle(bey.x, bey.y, '#06b6d4', 40);
              addShockwave(bey.x, bey.y, '#06b6d4', '#ffffff', 1.5);
              recordEvent('SATELLITE_DIVE', { 
                bey: bey === b1 ? 'b1' : 'b2',
                momentum: Math.round(bey.orbitMomentum * 100)
              });
            }
          };
          break;
        }
        
        // ========================================
        // ⏰ PENDULUM LAUNCH
        // ========================================
        case 'pendulum':
          bey.isPendulum = true;
          bey.pendulumPhase = 0; // 0 = indo ao centro, 1 = indo à borda
          bey.pendulumSpeed = special.oscillationSpeed || 2.5;
          bey.centerRadius = special.centerRadius || 40;
          bey.outerRadius = special.outerRadius || 180;
          bey.currentRadius = bey.outerRadius; // Começar na borda
          bey.evasionBonus = special.evasionBonus || 0.15;
          bey.energyConservation = special.energyConservation || 0.90;
          
          bey.updatePendulum = (deltaTime) => {
            if (!bey.isPendulum) return;
            
            // Movimento pendular
            if (bey.pendulumPhase === 0) {
              // Indo ao centro
              bey.currentRadius -= bey.pendulumSpeed * deltaTime * 30;
              if (bey.currentRadius <= bey.centerRadius) {
                bey.currentRadius = bey.centerRadius;
                bey.pendulumPhase = 1;
              }
            } else {
              // Indo à borda
              bey.currentRadius += bey.pendulumSpeed * deltaTime * 30;
              if (bey.currentRadius >= bey.outerRadius) {
                bey.currentRadius = bey.outerRadius;
                bey.pendulumPhase = 0;
              }
            }
            
            // FIX: Aplicar movimento circular no raio atual (usando centro REAL da arena)
            const angle = Math.atan2(bey.vy, bey.vx);
            const speed = Math.sqrt(bey.vx ** 2 + bey.vy ** 2);
            bey.x = centerX + Math.cos(angle) * bey.currentRadius;
            bey.y = centerY + Math.sin(angle) * bey.currentRadius;
            
            // Efeito visual
            if (Math.random() < 0.08) {
              addParticle(bey.x, bey.y, '#fbbf24', 5);
            }
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
            
            // Calcular distância ao adversário
            const dx = opponent.x - bey.x;
            const dy = opponent.y - bey.y;
            const dist = Math.sqrt(dx ** 2 + dy ** 2);
            
            // Se dentro do raio, aplicar pull
            if (dist < bey.vortexRadius && dist > 0) {
              const pullForce = bey.pullStrength * (1 - dist / bey.vortexRadius);
              const angle = Math.atan2(dy, dx);
              
              opponent.vx += Math.cos(angle) * pullForce * deltaTime;
              opponent.vy += Math.sin(angle) * pullForce * deltaTime;
              
              // Efeito visual de pull
              if (Math.random() < 0.15) {
                addParticle(
                  (bey.x + opponent.x) / 2,
                  (bey.y + opponent.y) / 2,
                  '#8b5cf6',
                  10
                );
              }
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
          bey.impactRadius = special.impactRadius || 35;
          bey.slowdownAfter = special.slowdownAfter || 0.70;
          bey.createShockwave = special.shockwave || true;
          
          // Função chamada ao colidir
          bey.onHammerHit = (collision, opponent) => {
            if (bey.hammerFirstHit) {
              bey.hammerFirstHit = false;
              
              // Aplicar dano extra
              const extraDamage = collision.damage * (bey.hammerMultiplier - 1);
              opponent.stamina -= extraDamage;
              opponent.burstDamage += extraDamage * 0.5;
              
              // Efeitos visuais
              if (bey.createShockwave) {
                addShockwave(opponent.x, opponent.y, '#f59e0b', '#000000', 2.0);
              }
              addParticle(opponent.x, opponent.y, '#f59e0b', 50);
              addParticle(bey.x, bey.y, '#fbbf24', 30);
              
              // Slowdown após hit
              bey.vx *= bey.slowdownAfter;
              bey.vy *= bey.slowdownAfter;
              
              recordEvent('HAMMER_DROP_HIT', { 
                bey: bey === b1 ? 'b1' : 'b2',
                damage: Math.round(extraDamage)
              });
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
      // - No one-shots, no immunity
      // ═══════════════════════════════════════════════════════════════
      
      if (!b1 || !b2 || !b1.alive || !b2.alive) return;
      const dx = b2.x - b1.x;
      const dy = b2.y - b1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < b1.radius + b2.radius) {
        
        // ============================================
        // 🆕 VERIFICAR LAUNCH PATTERN EFFECTS
        // ============================================
        
        // 👻 PHANTOM LAUNCH - Invulnerabilidade
        if (b1.invulnerable || b2.invulnerable) {
          // Hit passa através do beyblade invisível
          if (Math.random() < 0.2) {
            addParticle((b1.x + b2.x) / 2, (b1.y + b2.y) / 2, '#a78bfa', 15);
          }
          return; // Não aplicar colisão
        }
        
        // ⏰ PENDULUM LAUNCH - Evasão aumentada
        if (b1.isPendulum && b1.evasionBonus && Math.random() < b1.evasionBonus) {
          addParticle(b1.x, b1.y, '#fbbf24', 20);
          recordEvent('PENDULUM_EVADE', { bey: 'b1' });
          return; // Evadiu o hit
        }
        if (b2.isPendulum && b2.evasionBonus && Math.random() < b2.evasionBonus) {
          addParticle(b2.x, b2.y, '#fbbf24', 20);
          recordEvent('PENDULUM_EVADE', { bey: 'b2' });
          return; // Evadiu o hit
        }
        
        const angle = Math.atan2(dy, dx);
        
        const impactForce = Math.sqrt(b1.vx * b1.vx + b1.vy * b1.vy) + Math.sqrt(b2.vx * b2.vx + b2.vy * b2.vy);
        const collisionX = (b1.x + b2.x) / 2;
        const collisionY = (b1.y + b2.y) / 2;
        addImpactParticles(collisionX, collisionY, Math.min(10, impactForce * 0.8));
        addSparkParticles(collisionX, collisionY, 6);
        addShockwave(collisionX, collisionY, b1.bey?.colors?.[0] || b1.color, b2.bey?.colors?.[0] || b2.color, Math.min(impactForce / 10, 2.0));
        
          // Screen shake for strong impacts (FASE 1)
          const impactStrength = Math.min(impactForce / 8, 2);
          addScreenShake(impactStrength);
          if (impactStrength > 1.5) {
            addFlashEffect('#ffffff', 0.2, 60);
          }
        if (impactForce > 12) {
          addParticle((b1.x + b2.x) / 2, (b1.y + b2.y) / 2, '#ff0000', 10);
          addParticle((b1.x + b2.x) / 2, (b1.y + b2.y) / 2, '#ffff00', 8);
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
        if (b1.bey?.type === 'Attack') force1 *= 1.25;
        if (b2.bey?.type === 'Attack') force2 *= 1.25;
        
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
        
        // ── CORTE PRECISO (ATK 17): stack de instabilidade ──
        if (b1.hasCortePreciso && velocity1 > 6 && Math.random() < 0.30) {
          b2._corteStacksOnOpp = Math.min(2, (b2._corteStacksOnOpp || 0) + 1);
          b2._corteExpiryOnOpp = Date.now() + 4000;
          addParticle(b2.x, b2.y, '#ff6600', 12);
        }
        if (b2.hasCortePreciso && velocity2 > 6 && Math.random() < 0.30) {
          b1._corteStacksOnOpp = Math.min(2, (b1._corteStacksOnOpp || 0) + 1);
          b1._corteExpiryOnOpp = Date.now() + 4000;
          addParticle(b1.x, b1.y, '#ff6600', 12);
        }
        // ── RAJADA DE ACO (ATK 27): hit streak ──
        if (b1.hasRajadaDeAco) { b1._hitStreak = (b1._hitStreak||0)+1; if (b1._hitStreak >= 3) { b1._hitStreak=0; b1._rajadaReady=true; } }
        if (b2.hasRajadaDeAco) { b2._hitStreak = (b2._hitStreak||0)+1; if (b2._hitStreak >= 3) { b2._hitStreak=0; b2._rajadaReady=true; } }
        
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

        // ── TEC: HIT ACCURACY — Glancing Blow ─────────────────────────
        // hitAccuracy: 0.40 (TEC=0) → 1.00 (TEC=15). Neutro TEC=7 ≈ 0.68
        const _vAcc1 = b1.bey?.hitAccuracy ?? 0.68;
        const _vAcc2 = b2.bey?.hitAccuracy ?? 0.68;
        if (Math.random() > _vAcc1) {
          force1 *= 0.35;
          addParticle(b1.x, b1.y, '#94a3b8', 6);
        }
        if (Math.random() > _vAcc2) {
          force2 *= 0.35;
          addParticle(b2.x, b2.y, '#94a3b8', 6);
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
        
        // VOLCANIC_RAGE: knockback ×1.1 + heat bonus + sobe heat na colisão
        if (arenaType === 'VOLCANIC_RAGE') {
          arenaModifier = ARENA.knockbackMultiplier || 1.1;
          const heatLevel = (ARENA.heatSystem && ARENA.heatSystem.level) || 0;
          arenaModifier *= (1.0 + (heatLevel / 100) * 0.2); // até +20% com heat máximo
          // Colisão sobe o heat (+5)
          if (ARENA.heatSystem && !ARENA.eruptionEvent?.active) {
            ARENA.heatSystem.level = Math.min(
              ARENA.heatSystem.maxLevel,
              (ARENA.heatSystem.level || 0) + ARENA.heatSystem.gainOnCollision
            );
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
        
        // VOLCANIC_RAGE WELL (WEIGHT 27+) - Fixed 30% reduction, not immunity
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
        knockback1 = Math.max(1.0, Math.min(60.0, knockback1));
        knockback2 = Math.max(1.0, Math.min(60.0, knockback2));

        // ── POSTURA DE ACO (DEF 17): excesso de knockback > 20 → spin recovery ──
        if (b1.hasPosturaDeAco && knockback1 > 20) { const ex1=knockback1-20; knockback1=20; b1.spinSpeed+=ex1*0.08; addParticle(b1.x,b1.y,'#60a5fa',18); }
        if (b2.hasPosturaDeAco && knockback2 > 20) { const ex2=knockback2-20; knockback2=20; b2.spinSpeed+=ex2*0.08; addParticle(b2.x,b2.y,'#60a5fa',18); }
        // ── CAMARA DE RESSONANCIA (BAL 27): knockback 40%, 60% → spin ──
        if (b1.hasCamaraRessonancia) { const cv1=knockback1*0.60; knockback1*=0.40; b1.spinSpeed+=cv1*0.06; addParticle(b1.x,b1.y,'#fbbf24',14); }
        if (b2.hasCamaraRessonancia) { const cv2=knockback2*0.60; knockback2*=0.40; b2.spinSpeed+=cv2*0.06; addParticle(b2.x,b2.y,'#fbbf24',14); }

        // ═══════════════════════════════════════════════════════════════
        // APPLY KNOCKBACK - Direct velocity modification
        // ═══════════════════════════════════════════════════════════════
        // v3.3: DAMPING REMOVIDO! Aplicação direta de knockback com 1.2x boost!
        // ANTES: 0.85 damping | AGORA: 1.2 boost!
        
        b1.vx -= Math.cos(angle) * knockback1 * 1.2;
        b1.vy -= Math.sin(angle) * knockback1 * 1.2;
        b2.vx += Math.cos(angle) * knockback2 * 1.2;
        b2.vy += Math.sin(angle) * knockback2 * 0.85;
        
        // ═══════════════════════════════════════════════════════════════
        // v3.5-HÍBRIDO: COOLDOWN TEMPORAL
        // ═══════════════════════════════════════════════════════════════
        // Desabilita gravidade por 30 frames (0.5s) após colisão
        // Permite knockback se expressar COMPLETAMENTE antes da gravidade agir!
        const currentFrame = Math.floor(Date.now() / 16.67);  // ~60fps
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
        
        // Pinball V3: near-wall collision amplifier
        if (arenaType === 'PINBALL_INFERNO') {
          const arenaR = ARENA.arenaRadius || 165;
          const dist1  = Math.sqrt((b1.x - centerX) ** 2 + (b1.y - centerY) ** 2);
          const dist2  = Math.sqrt((b2.x - centerX) ** 2 + (b2.y - centerY) ** 2);
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
        // SOLUÇÃO 2: Reduzido multiplicador de 2.0 para 1.4 e defesa de 0.6 para 0.75
        let damage1 = Math.max(0.8, (force2 - (b1.bey?.effectiveStats?.def || 10) * 0.75) * 1.4);
        let damage2 = Math.max(0.8, (force1 - (b2.bey?.effectiveStats?.def || 10) * 0.75) * 1.4);
        
        if (force2 > 15) damage1 *= 1.5;
        if (force1 > 15) damage2 *= 1.5;
        
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
        if (b1._espiralEternaActive) b1._espiralEternaHitPenalty = true;
        if (b2._espiralEternaActive) b2._espiralEternaHitPenalty = true;
        
        // 🆕 HAMMER DROP - Primeiro hit
        if (b1.onHammerHit) {
          b1.onHammerHit({ damage: damage2 }, b2);
        }
        if (b2.onHammerHit) {
          b2.onHammerHit({ damage: damage1 }, b1);
        }
        
        // ✨ PREMIUM IMPACT EFFECTS
        if (impactEffectsRef.current && particleSystemRef.current) {
          const impactX = (b1.x + b2.x) / 2;
          const impactY = (b1.y + b2.y) / 2;
          const velocity1 = Math.sqrt(b1.vx ** 2 + b1.vy ** 2);
          const velocity2 = Math.sqrt(b2.vx ** 2 + b2.vy ** 2);
          const impactForce = (velocity1 + velocity2) / 2;
          
          // Shockwave para impactos fortes
          if (impactForce > 3) {
            impactEffectsRef.current.createShockwave(impactX, impactY, Math.min(impactForce / 10, 2));
          }
          
          // Partículas coloridas
          particleSystemRef.current.emit({
            x: impactX,
            y: impactY,
            count: Math.floor(Math.min(impactForce * 3, 30)),
            speed: 6,
            size: 3,
            color: impactForce > 5 ? '#ff3300' : '#ffaa00',
            lifetime: 0.5,
            glow: true,
            glowIntensity: 12,
            spread: 10,
          });
        }
        
        // SPIN LOSS ON IMPACT
        const spinLoss1 = (force2 / 15) * (1 - (b1.bey?.effectiveStats?.spin || 40) / 60);
        const spinLoss2 = (force1 / 15) * (1 - (b2.bey?.effectiveStats?.spin || 40) / 60);
        
        b1.spinSpeed -= spinLoss1;
        b2.spinSpeed -= spinLoss2;
        // ── TURBILHAO (SPIN 17): recupera 15% do spin perdido ──
        if (b1.hasTurbilhao) { b1.spinSpeed += spinLoss1*0.15; addParticle(b1.x,b1.y,'#a5f3fc',10); }
        if (b2.hasTurbilhao) { b2.spinSpeed += spinLoss2*0.15; addParticle(b2.x,b2.y,'#a5f3fc',10); }
        
        // Strong impacts cause massive spin loss
        if (velocity1 > 10 || velocity2 > 10) {
          b1.spinSpeed *= 0.97;
          b2.spinSpeed *= 0.97;
          addParticle(b1.x, b1.y, '#ff0000', 15);
          addParticle(b2.x, b2.y, '#ff0000', 15);
        }
        
        // ── CENTRO DE GRAVIDADE (BAL 17): -20% burst se spin > 50% ──
        const _cgSp1 = b1.spinSpeed/(b1.stats?.maxSpin||100), _cgSp2 = b2.spinSpeed/(b2.stats?.maxSpin||100);
        const _cgMod1 = (b1.hasCentroGravidade && _cgSp1 > 0.5) ? 0.80 : 1.0;
        const _cgMod2 = (b2.hasCentroGravidade && _cgSp2 > 0.5) ? 0.80 : 1.0;
        // BASE BURST DAMAGE - increased significantly
        let burstDamage1 = force2 * 0.08 * b1.burstRiskMod * _cgMod1;
        let burstDamage2 = force1 * 0.08 * b2.burstRiskMod * _cgMod2;
        
        // CRITICAL HIT SYSTEM - chance based on conditions
        const collisionVelocity1 = Math.sqrt(b1.vx * b1.vx + b1.vy * b1.vy);
        const collisionVelocity2 = Math.sqrt(b2.vx * b2.vx + b2.vy * b2.vy);
        
        let criticalHit1 = false;
        let criticalHit2 = false;
        
        // Critical conditions for b1 hitting b2
        if (b1.bey?.type === 'Attack' && collisionVelocity1 > 7) {
          // Attack type at high speed = 30% critical chance
          if (Math.random() < 0.30) {
            criticalHit1 = true;
            burstDamage2 *= 2.0;
            addParticle(b2.x, b2.y, '#ff0000', 14);
            addParticle(b2.x, b2.y, '#ffff00', 10);
            addShockwave(b2.x, b2.y, '#ff0000', '#ffff00', 1.8);
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
        if (b2.bey?.type === 'Attack' && collisionVelocity2 > 7) {
          if (Math.random() < 0.30) {
            criticalHit2 = true;
            burstDamage1 *= 2.0;
            addParticle(b1.x, b1.y, '#ff0000', 14);
            addParticle(b1.x, b1.y, '#ffff00', 10);
            addShockwave(b1.x, b1.y, '#ff0000', '#ffff00', 1.8);
            recordEvent('CRITICAL_BURST_HIT', { 
              attacker: 'b2', 
              victim: 'b1',
              damage: burstDamage1,
              reason: 'Attack High Speed'
            });
            addEvent('CRITICAL_HIT', `${bey2.name} - CRITICAL HIT!`, `${Math.round(burstDamage1)} damage`);
          }
        }
        
        // ── RAJADA DE ACO: crit garantido no 3 hits ──
        if (b1._rajadaReady && !criticalHit1) { criticalHit1=true; b1._rajadaReady=false; burstDamage2*=2.0; addParticle(b2.x,b2.y,'#ff0000',50); }
        if (b2._rajadaReady && !criticalHit2) { criticalHit2=true; b2._rajadaReady=false; burstDamage1*=2.0; addParticle(b1.x,b1.y,'#ff0000',50); }
        
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
          burstDamage2 *= 1.3; // Attack destroys Stamina
        }
        if (b2.bey?.type === 'Attack' && b1.bey?.type === 'Stamina') {
          burstDamage1 *= 1.3;
        }
        
        // Apply burst damage
        b1.burstDamage += burstDamage1;
        b2.burstDamage += burstDamage2;
        
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
        
        if (damage1 > 8) addParticle(b1.x, b1.y, '#ff9900', 7);
        if (damage2 > 8) addParticle(b2.x, b2.y, '#ff9900', 7);
        
        b1.hits++;
        b2.hits++;
        b1.stats.hitsLanded++;
        b2.stats.hitsLanded++;
        b1.stats.damageCaused += damage2;
        b2.stats.damageCaused += damage1;
        
        // BLADE STORM (ATK 27+) - 40% chance de hit duplo
        if (b1.hasBladeStorm && Math.random() < 0.40) {
          b2.stamina -= damage2 * 0.5;
          b2.burstDamage += burstDamage2 * 0.5;
          addParticle(b2.x, b2.y, '#ff0000', 10);
          addParticle(b2.x, b2.y, '#ffff00', 8);
          recordEvent('BLADE_STORM', { attacker: 'b1', bonusDamage: damage2 * 0.5 });
        }
        if (b2.hasBladeStorm && Math.random() < 0.40) {
          b1.stamina -= damage1 * 0.5;
          b1.burstDamage += burstDamage1 * 0.5;
          addParticle(b1.x, b1.y, '#ff0000', 10);
          addParticle(b1.x, b1.y, '#ffff00', 8);
          recordEvent('BLADE_STORM', { attacker: 'b2', bonusDamage: damage1 * 0.5 });
        }

        // 🦹 MOMENTUM_THIEF - rouba momentum stacks do adversário (VORTEX_COLISEUM)
        if (arenaType === 'VORTEX_COLISEUM' && ARENA.momentum) {
          if (md3State?.team1?.mentality === 'MOMENTUM_THIEF' && ARENA.momentum.bey2Stacks > 0) {
            const stolen = Math.min(1, ARENA.momentum.bey2Stacks);
            ARENA.momentum.bey2Stacks = Math.max(0, ARENA.momentum.bey2Stacks - stolen);
            ARENA.momentum.bey1Stacks += stolen * 0.5;
            addParticle(b1.x, b1.y, '#6366f1', 10);
            recordEvent('MOMENTUM_STEAL', { attacker: 'b1', stolen });
          }
          if (md3State?.team2?.mentality === 'MOMENTUM_THIEF' && ARENA.momentum.bey1Stacks > 0) {
            const stolen = Math.min(1, ARENA.momentum.bey1Stacks);
            ARENA.momentum.bey1Stacks = Math.max(0, ARENA.momentum.bey1Stacks - stolen);
            ARENA.momentum.bey2Stacks += stolen * 0.5;
            addParticle(b2.x, b2.y, '#6366f1', 10);
            recordEvent('MOMENTUM_STEAL', { attacker: 'b2', stolen });
          }
        }
        
        // STABILITY DAMAGE - Impacts destabilize significantly
        const balanceResistance1 = (b1.bey?.effectiveStats?.bal || 10) / 20;
        const balanceResistance2 = (b2.bey?.effectiveStats?.bal || 10) / 20;
        
        // Calculate stability loss based on impact force and balance resistance
        let stabilityLoss1 = (force2 / 10) * (1 - balanceResistance1);
        let stabilityLoss2 = (force1 / 10) * (1 - balanceResistance2);

        // ═══════════════════════════════════════════════════════════════
        // 🆕 ON-HIT EFFECTS DAS NOVAS PARTS
        // ═══════════════════════════════════════════════════════════════
        function applyOnHitPartEffects(attacker, defender, dmgToDef, bdToDef) {
          const arm = attacker.bey?.armor;
          const lay = attacker.bey?.layer;
          const dis = attacker.bey?.disc;
          const drv = attacker.bey?.driver;

          // ── LAYER effects ──
          if (lay?.special === 'spin_steal_boost') {
            const bonus = lay.specialValue || 0.20;
            const stolen = defender.spinSpeed * 0.04 * (1 + bonus);
            defender.spinSpeed = Math.max(0, defender.spinSpeed - stolen);
            attacker.spinSpeed += stolen * 0.4;
            addParticle(attacker.x, attacker.y, '#e2e8f0', 5);
          }
          if (lay?.special === 'upward_force') {
            defender.burstDamage += bdToDef * (lay.specialValue || 0.30);
            addParticle(defender.x, defender.y, '#fbbf24', 6);
          }
          if (lay?.special === 'hit_absorption') {
            const maxAbs = lay.specialValue || 3;
            if (attacker.layerHitsAbsorbed < maxAbs) {
              attacker.layerHitsAbsorbed++;
              attacker.stamina = Math.min(250, attacker.stamina + dmgToDef * 0.6);
              addParticle(attacker.x, attacker.y, '#34d399', 8);
              recordEvent('TURTLE_SHELL_ABSORB', { remaining: maxAbs - attacker.layerHitsAbsorbed });
            }
          }
          if (lay?.special === 'double_hit') {
            if (Math.random() < (lay.specialValue || 0.10)) {
              defender.stamina -= dmgToDef * 0.6;
              defender.burstDamage += bdToDef * 0.5;
              addParticle(defender.x, defender.y, '#60a5fa', 10);
              addParticle(defender.x, defender.y, '#a78bfa', 8);
              recordEvent('DOUBLE_HIT', { attacker: attacker === b1 ? 'b1' : 'b2' });
            }
          }
          if (lay?.special === 'scaling_damage') {
            attacker.layerConsecutiveHits = (attacker.layerConsecutiveHits || 0) + 1;
            const scale = Math.min(attacker.layerConsecutiveHits * (lay.specialValue || 0.15), 1.5);
            defender.stamina -= dmgToDef * scale * 0.4;
            defender.burstDamage += bdToDef * scale * 0.3;
            if (attacker.layerConsecutiveHits > 1) addParticle(defender.x, defender.y, '#0ea5e9', 5);
          }

          // ── DISC effects ──
          if (dis?.special === 'critical_boost') {
            if (Math.random() < (dis.specialValue || 0.15)) {
              defender.stamina -= dmgToDef * 0.5;
              defender.burstDamage += bdToDef * 0.8;
              addParticle(defender.x, defender.y, '#f59e0b', 12);
              recordEvent('PRECISION_CRIT', { attacker: attacker === b1 ? 'b1' : 'b2' });
            }
          }
          if (dis?.special === 'reactive_speed') {
            // Aplica no defender (reage ao tomar dano)
            const defDis = defender.bey?.disc;
            if (defDis?.special === 'reactive_speed') {
              const boost = defDis.specialValue || 0.20;
              defender.vx *= (1 + boost);
              defender.vy *= (1 + boost);
              addParticle(defender.x, defender.y, '#facc15', 8);
            }
          }
          if (dis?.special === 'knockback_immunity') {
            const speed = Math.sqrt(attacker.vx ** 2 + attacker.vy ** 2);
            if (speed < (dis.specialValue || 3)) {
              attacker.vx *= 0.3;
              attacker.vy *= 0.3;
              addParticle(attacker.x, attacker.y, '#6b7280', 6);
            }
          }

          // ── DRIVER effects ──
          if (drv?.special === 'damage_reflect') {
            const reflected = dmgToDef * (drv.specialValue || 0.15);
            defender.stamina -= reflected;
            addParticle(attacker.x, attacker.y, '#93c5fd', 6);
          }
          if (drv?.special === 'last_stand') {
            if (attacker.stamina / 250 < (drv.specialThreshold || 0.20)) {
              const atkBoost = drv.specialValue || 1.0;
              defender.stamina -= dmgToDef * atkBoost * 0.5;
              defender.burstDamage += bdToDef * atkBoost * 0.5;
              addParticle(attacker.x, attacker.y, '#f97316', 20);
              addParticle(attacker.x, attacker.y, '#fbbf24', 15);
              recordEvent('LAST_STAND', { attacker: attacker === b1 ? 'b1' : 'b2' });
            }
          }

          // ── ARMOR effects (on-hit) ──
          if (arm?.effect === 'poison_sting') {
            defender.armorPoisonStacks = Math.min(arm.maxStacks || 4, (defender.armorPoisonStacks || 0) + 1);
            addParticle(defender.x, defender.y, '#7c3aed', 6);
            recordEvent('POISON_STACK', { target: defender === b1 ? 'b1' : 'b2', stacks: defender.armorPoisonStacks });
          }
          if (arm?.effect === 'ice_wall') {
            // Defensor absorve hit se tiver ice wall ativa
            const defArm = defender.bey?.armor;
            if (defArm?.effect === 'ice_wall' && defender.armorIceWallReady) {
              defender.stamina = Math.min(250, defender.stamina + dmgToDef * 0.7);
              defender.armorIceWallReady = false;
              defender.armorIceWallLastUsed = Date.now();
              addParticle(defender.x, defender.y, '#bae6fd', 20);
              addShockwave(defender.x, defender.y, '#bae6fd', '#ffffff', 1.0);
              recordEvent('ICE_WALL_BLOCKED', { bey: defender === b1 ? 'b1' : 'b2' });
            }
          }
          if (arm?.effect === 'triple_strike') {
            if (Math.random() < (arm.procChance || 0.15)) {
              const extraHits = arm.extraHits || 2;
              defender.stamina -= dmgToDef * extraHits * 0.4;
              defender.burstDamage += bdToDef * extraHits * 0.3;
              addParticle(defender.x, defender.y, '#0ea5e9', 15);
              addParticle(attacker.x, attacker.y, '#0ea5e9', 10);
              recordEvent('TRIPLE_STRIKE', { attacker: attacker === b1 ? 'b1' : 'b2' });
            }
          }
          if (arm?.effect === 'spectrum_shift') {
            const element = arm.elements?.[attacker.armorCurrentElement || 0] || 'fire';
            switch (element) {
              case 'fire':   defender.stamina -= dmgToDef * 0.20; addParticle(defender.x, defender.y, '#ef4444', 8); break;
              case 'ice':    defender.vx *= 0.75; defender.vy *= 0.75; addParticle(defender.x, defender.y, '#67e8f9', 8); break;
              case 'lightning': if (Math.random() < 0.15) { defender.burstDamage += bdToDef * 0.5; addParticle(defender.x, defender.y, '#fde047', 12); } break;
              case 'wind':   defender.vx *= 1.3; defender.vy *= 1.3; addParticle(defender.x, defender.y, '#a7f3d0', 8); break;
            }
          }
          if (arm?.effect === 'web_trap') {
            const slowPct = arm.slowPercent || 0.20;
            defender.armorWebStacks = Math.min(arm.maxSlow || 0.60, (defender.armorWebStacks || 0) + slowPct);
            defender.vx *= (1 - (defender.armorWebStacks || 0) * 0.35);
            defender.vy *= (1 - (defender.armorWebStacks || 0) * 0.35);
            addParticle(defender.x, defender.y, '#e5e7eb', 5);
          }
          if (arm?.effect === 'execute') {
            if (defender.stamina / 250 <= (arm.executeThreshold || 0.25)) {
              const execMult = (arm.executeMultiplier || 3.0) - 1;
              defender.stamina -= dmgToDef * execMult * 0.5;
              defender.burstDamage += bdToDef * execMult * 0.5;
              addParticle(defender.x, defender.y, '#1c1917', 20);
              addParticle(attacker.x, attacker.y, '#dc2626', 15);
              addShockwave(defender.x, defender.y, '#dc2626', '#000000', 1.5);
              recordEvent('EXECUTE', { attacker: attacker === b1 ? 'b1' : 'b2' });
            }
          }
          if (arm?.effect === 'moon_phases' && arm.phases) {
            const now = Date.now() * 0.001;
            if (!attacker.armorMoonPhaseStart) attacker.armorMoonPhaseStart = now;
            const phaseIdx = Math.floor(((now - attacker.armorMoonPhaseStart) / (arm.cycleDuration || 20)) * arm.phases.length) % arm.phases.length;
            const atkDelta = ((arm.phases[phaseIdx]?.atkMod || 1.0) - 1);
            if (atkDelta > 0) { defender.stamina -= dmgToDef * atkDelta * 0.4; addParticle(attacker.x, attacker.y, '#e0e7ff', 6); }
          }
          if (arm?.effect === 'precision_timing') {
            attacker.armorClockworkHits = (attacker.armorClockworkHits || 0) + 1;
            if (attacker.armorClockworkHits >= (arm.criticalEvery || 10)) {
              defender.stamina -= dmgToDef * 1.5;
              defender.burstDamage += bdToDef * 1.5;
              attacker.armorClockworkHits = 0;
              addParticle(defender.x, defender.y, '#92400e', 20);
              addParticle(attacker.x, attacker.y, '#fbbf24', 15);
              addShockwave(defender.x, defender.y, '#b45309', '#fbbf24', 1.3);
              recordEvent('CLOCKWORK_CRIT', { attacker: attacker === b1 ? 'b1' : 'b2' });
            }
          }
        }

        applyOnHitPartEffects(b1, b2, damage1, burstDamage2);
        applyOnHitPartEffects(b2, b1, damage2, burstDamage1);

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
        b1.lastHitTime = Date.now();
        b2.lastHitTime = Date.now();
        
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
      const time = Date.now() * 0.001;
      
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
          time: Date.now()
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
      const now = Date.now();
      for (let i = trail.length - 1; i >= 0; i--) {
        const age = (now - trail[i].time) / 1000;
        if (age >= 0.5) {
          trail.splice(i, 1);
        }
      }
    }

    // Função para desenhar trail — ribbon comet style
    function drawTrail(trail, color, teamColors) {
      if (!trail || trail.length < 3) return;

      const baseColor = teamColors?.[0] || color || '#3b82f6';

      // ── Comet ribbon via quadratic path ──────────────────────────
      ctx.save();
      ctx.lineCap  = 'round';
      ctx.lineJoin = 'round';

      for (let i = 1; i < trail.length; i++) {
        const prev = trail[i - 1];
        const curr = trail[i];
        const t    = i / trail.length; // 0 = oldest, 1 = newest

        const alpha = t * t * 0.55;          // quadratic fade, max ~0.55 at tip
        const lw    = curr.radius * 0.55 * t; // tapers from 0 to ~14px

        if (alpha < 0.02 || lw < 0.5) continue;

        ctx.globalAlpha = alpha;
        ctx.strokeStyle = baseColor;
        ctx.lineWidth   = lw;
        ctx.shadowBlur  = 10 * t;
        ctx.shadowColor = baseColor;

        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
        ctx.stroke();
      }

      // ── Glow dot at trail tip (second-to-last position for slight lag) ──
      if (trail.length >= 2) {
        const tip = trail[trail.length - 1];
        ctx.globalAlpha = 0.28;
        ctx.shadowBlur  = 20;
        ctx.shadowColor = baseColor;
        const tg = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, tip.radius * 0.9);
        tg.addColorStop(0, baseColor);
        tg.addColorStop(1, 'transparent');
        ctx.fillStyle = tg;
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, tip.radius * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.shadowBlur  = 0;
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
    
    // ════════════════════════════════════════════════════════════════
    // ⚔️ SIGNATURE BLADE - SISTEMA DE RENDERIZAÇÃO LENDÁRIA
    // ════════════════════════════════════════════════════════════════

    function drawSignatureBey(ctx, b, colors, beyType, currentSpinPercent, customIcon) {
      const radius = b.radius;
      const t = Date.now();
      const pulse = Math.sin(t * 0.004) * 0.5 + 0.5;       // 0..1 lento
      const pulse2 = Math.sin(t * 0.007 + 1.2) * 0.5 + 0.5; // defasado
      const spinDir = b.spinDirection || 1;

      // ── AURA EXTERNA ÉPICA (antes de tudo, sem ctx.save/restore do bey) ──
      // Feita em coords do mundo (b.x, b.y) — chamamos de fora do ctx.rotate

      // ── CAMADA 1: DRIVER dourado Signature ──
      const drvGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.28);
      drvGrad.addColorStop(0,   '#fff8dc');
      drvGrad.addColorStop(0.4, '#ffd700');
      drvGrad.addColorStop(1,   colors[0]);
      ctx.fillStyle = drvGrad;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ffd700';
      ctx.stroke();
      ctx.shadowBlur = 0;

      // ── CAMADA 2: DISC dourado com gravura ──
      const discGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.58);
      discGrad.addColorStop(0,   '#fff3b0');
      discGrad.addColorStop(0.35, colors[0]);
      discGrad.addColorStop(0.75, colors[1] || '#ffffff');
      discGrad.addColorStop(1,   '#ffd700');
      ctx.fillStyle = discGrad;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.56, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ffd700';
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Gravura interna do disco — 8 raios dourados
      ctx.save();
      ctx.globalAlpha = 0.55;
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 / 8) * i;
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * radius * 0.5, Math.sin(a) * radius * 0.5);
        ctx.stroke();
      }
      ctx.restore();

      // ── CAMADA 3: LAYER Signature — ornamental e único ──
      drawSignatureLayer(ctx, radius, colors, beyType, pulse);

      // ── ROTATION INDICATOR — dourado duplo ──
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ffd700';
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(0, 0, radius + 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.4 + pulse * 0.3;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, radius + 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // ── ANEL GIRATÓRIO EXTERNO — arcos de energia ──
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = colors[0];
      ctx.lineWidth = 2;
      ctx.shadowBlur = 12;
      ctx.shadowColor = colors[0];
      const arcOffset = (t * 0.002 * spinDir) % (Math.PI * 2);
      for (let i = 0; i < 3; i++) {
        const start = arcOffset + (Math.PI * 2 / 3) * i;
        ctx.beginPath();
        ctx.arc(0, 0, radius + 12, start, start + 0.9);
        ctx.stroke();
      }
      ctx.restore();

      // ── CENTRO — ícone ou símbolo ⚔️ ──
      if (customIcon && customIcon.complete) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(customIcon, -10, -10, 20, 20);
        ctx.restore();
      } else {
        ctx.save();
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillText('⚔', 0, 0);
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    }

    function drawSignatureLayer(ctx, radius, colors, beyType, pulse) {
      // Forma base hexagonal + estrela de 6 pontas com as cores do jogador
      const c0 = colors[0];
      const c1 = colors[1] || '#ffffff';
      const c2 = colors[2] || '#cccccc';

      // Base: gradiente radial rico
      const baseGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      baseGrad.addColorStop(0,    c1);
      baseGrad.addColorStop(0.45, c0);
      baseGrad.addColorStop(0.85, c0);
      baseGrad.addColorStop(1,    '#ffd700');
      ctx.fillStyle = baseGrad;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();

      // Borda dourada espessa
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ffd700';
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Estrela de 6 pontas como layer ornamental
      const outer = radius * 0.95;
      const inner = radius * 0.52;
      ctx.fillStyle = c0;
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (Math.PI / 6) * i - Math.PI / 2;
        const r = i % 2 === 0 ? outer : inner;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Pontas adicionais de destaque por tipo
      ctx.save();
      ctx.globalAlpha = 0.8;
      if (beyType === 'Attack' || beyType === 'Extreme') {
        // 5 lâminas afiadas extra atrás das pontas da estrela
        ctx.fillStyle = c2;
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
          const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
          ctx.save();
          ctx.rotate(a);
          ctx.beginPath();
          ctx.moveTo(radius * 0.55, 0);
          ctx.lineTo(radius * 1.05, -radius * 0.12);
          ctx.lineTo(radius * 1.05, radius * 0.12);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      } else if (beyType === 'Defense') {
        // Anéis concêntricos reforçados
        for (let i = 1; i <= 3; i++) {
          ctx.strokeStyle = i % 2 === 0 ? '#ffd700' : c1;
          ctx.lineWidth = 2.5 - i * 0.5;
          ctx.globalAlpha = 0.7 - i * 0.1;
          ctx.beginPath();
          ctx.arc(0, 0, radius * (0.78 - i * 0.14), 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (beyType === 'Stamina') {
        // Espirais de energia duplas
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.6;
        for (let s = 0; s < 2; s++) {
          ctx.beginPath();
          for (let t = 0; t <= 1; t += 0.02) {
            const a = s * Math.PI + t * Math.PI * 3;
            const r = radius * 0.2 + t * radius * 0.7;
            const x = Math.cos(a) * r;
            const y = Math.sin(a) * r;
            if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      } else {
        // Balance/outros — diamantes adicionais
        ctx.fillStyle = c2;
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
          const a = (Math.PI / 2) * i + Math.PI / 4;
          const cx2 = Math.cos(a) * radius * 0.75;
          const cy2 = Math.sin(a) * radius * 0.75;
          const ds = 5;
          ctx.save();
          ctx.translate(cx2, cy2);
          ctx.rotate(a);
          ctx.beginPath();
          ctx.moveTo(0, -ds); ctx.lineTo(ds * 0.6, 0);
          ctx.lineTo(0, ds); ctx.lineTo(-ds * 0.6, 0);
          ctx.closePath();
          ctx.fill(); ctx.stroke();
          ctx.restore();
        }
      }
      ctx.restore();

      // Anel interior dourado pulsante (inner glow)
      ctx.save();
      ctx.globalAlpha = 0.35 + pulse * 0.25;
      ctx.strokeStyle = '#fff8dc';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ffd700';
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.38, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Aura externa — chamada ANTES do ctx.translate/rotate do bey (coords mundo)
    function drawSignatureWorldAura(ctx, b, colors, currentSpinPercent) {
      if (!b || !b.alive) return;
      const t = Date.now();
      const pulse = Math.sin(t * 0.004) * 0.5 + 0.5;
      const pulse2 = Math.sin(t * 0.007 + 2.1) * 0.5 + 0.5;
      const radius = b.radius;
      const spinDir = b.spinDirection || 1;

      ctx.save();

      // ── CORONA DOURADA EXTERNA ──
      const coronaRadius = radius * (1.9 + pulse * 0.3);
      const coronaGrad = ctx.createRadialGradient(b.x, b.y, radius * 0.8, b.x, b.y, coronaRadius);
      coronaGrad.addColorStop(0,   colors[0] + 'cc');
      coronaGrad.addColorStop(0.4, colors[0] + '55');
      coronaGrad.addColorStop(0.7, '#ffd70033');
      coronaGrad.addColorStop(1,   'transparent');
      ctx.globalAlpha = 0.5 + pulse * 0.2;
      ctx.fillStyle = coronaGrad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, coronaRadius, 0, Math.PI * 2);
      ctx.fill();

      // ── ANÉIS PULSANTES ──
      const ringAngOff = (t * 0.0015 * spinDir) % (Math.PI * 2);
      for (let ri = 0; ri < 2; ri++) {
        const ringR = radius * (1.55 + ri * 0.35) + pulse2 * 4;
        ctx.globalAlpha = (0.55 - ri * 0.15) * (0.6 + pulse * 0.4);
        ctx.strokeStyle = ri === 0 ? '#ffd700' : colors[0];
        ctx.lineWidth = ri === 0 ? 2.5 : 1.5;
        ctx.shadowBlur = 12;
        ctx.shadowColor = ri === 0 ? '#ffd700' : colors[0];
        // Arcos separados girando
        const arcCount = 4 - ri;
        for (let ai = 0; ai < arcCount; ai++) {
          const start = ringAngOff * (ri + 1) + (Math.PI * 2 / arcCount) * ai;
          ctx.beginPath();
          ctx.arc(b.x, b.y, ringR, start, start + 0.75);
          ctx.stroke();
        }
      }
      ctx.shadowBlur = 0;

      // ── PARTÍCULAS DOURADAS ORBITANDO ──
      const particleCount = 6;
      ctx.globalAlpha = 0.8;
      for (let pi = 0; pi < particleCount; pi++) {
        const baseAngle = (Math.PI * 2 / particleCount) * pi;
        const orbitAngle = baseAngle + (t * 0.002 * spinDir);
        const orbitR = radius * (1.65 + Math.sin(t * 0.003 + pi) * 0.15);
        const px = b.x + Math.cos(orbitAngle) * orbitR;
        const py = b.y + Math.sin(orbitAngle) * orbitR;
        const pSize = 2.5 + Math.sin(t * 0.006 + pi * 1.3) * 1.5;

        ctx.fillStyle = pi % 2 === 0 ? '#ffd700' : colors[0];
        ctx.shadowBlur = 8;
        ctx.shadowColor = pi % 2 === 0 ? '#ffd700' : colors[0];
        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // ── LIGHTNING ARCS quando em alta velocidade ──
      if (currentSpinPercent > 0.5) {
        const arcAlpha = (currentSpinPercent - 0.5) / 0.5;
        ctx.globalAlpha = arcAlpha * 0.7;
        ctx.strokeStyle = '#fff8dc';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#ffd700';
        const arcAngBase = (t * 0.004 * spinDir) % (Math.PI * 2);
        for (let li = 0; li < 3; li++) {
          const la = arcAngBase + (Math.PI * 2 / 3) * li;
          const x0 = b.x + Math.cos(la) * radius * 1.1;
          const y0 = b.y + Math.sin(la) * radius * 1.1;
          const x1 = b.x + Math.cos(la + 0.4) * radius * 1.7;
          const y1 = b.y + Math.sin(la + 0.4) * radius * 1.7;
          const mx = (x0 + x1) / 2 + (Math.random() - 0.5) * 8;
          const my = (y0 + y1) / 2 + (Math.random() - 0.5) * 8;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.quadraticCurveTo(mx, my, x1, y1);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      }

      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Badge "SIGNATURE" desenhado sobre as barras (coords mundo)
    function drawSignatureBadge(ctx, b) {
      if (!b || !b.alive) return;
      const t = Date.now();
      const pulse = Math.sin(t * 0.005) * 0.5 + 0.5;
      const sigName = b.bey?.signatureName || '⚔ SIGNATURE';
      const shortName = sigName.length > 18 ? sigName.substring(0, 17) + '…' : sigName;

      ctx.save();

      const bx = b.x;
      const by = b.y - 72; // acima das barras normais

      // Fundo do badge
      ctx.fillStyle = `rgba(0,0,0,${0.75 + pulse * 0.1})`;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(bx - 36, by - 7, 72, 13, 4)
                    : ctx.rect(bx - 36, by - 7, 72, 13);
      ctx.fill();

      // Borda dourada pulsante
      ctx.strokeStyle = `rgba(255,215,0,${0.7 + pulse * 0.3})`;
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 6 + pulse * 4;
      ctx.shadowColor = '#ffd700';
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Texto
      ctx.fillStyle = '#ffd700';
      ctx.font = `bold ${7 + pulse * 0.5}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 3;
      ctx.fillText('⚔ ' + shortName, bx, by);
      ctx.shadowBlur = 0;

      ctx.restore();
    }

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
      
      // 🆕 PHANTOM LAUNCH - Aplicar opacidade
      if (b.opacity !== undefined && b.opacity < 1.0) {
        ctx.save();
        ctx.globalAlpha = b.opacity;
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
            time: Date.now()
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
        const wobbleX = Math.sin(Date.now() * 0.01) * wobbleAmount;
        const wobbleY = Math.cos(Date.now() * 0.01) * wobbleAmount;
        ctx.translate(wobbleX, wobbleY);
      }
      
      ctx.rotate(b.rotation);
      
      // ════════════════════════════════════════════════════════════════
      // DESENHO DO BEYBLADE - SISTEMA DE 3 CAMADAS
      // ════════════════════════════════════════════════════════════════
      
      // currentSpinPercent já foi declarado anteriormente (linha 3256)
      const teamColors = b.bey?.colors || [b.color || '#3b82f6', '#ffffff', '#cccccc'];
      const beyType = b.bey?.type || 'Balance';
      const isSignature = b.bey?.isSignature === true;

      // ──────────────────────────────────────────────────────
      // GLOW AURA em alta velocidade (CAMADA 0 - MAIS BAIXA)
      // ──────────────────────────────────────────────────────
      if (currentSpinPercent > 0.6) {
        const glowIntensity = (currentSpinPercent - 0.6) / 0.4;
        const glowRadius = b.radius * (isSignature ? 1.8 + glowIntensity * 0.5 : 1.3 + glowIntensity * 0.3);
        
        ctx.save();
        ctx.globalAlpha = glowIntensity * (isSignature ? 0.65 : 0.4);
        ctx.shadowBlur = isSignature ? 40 : 25;
        ctx.shadowColor = isSignature ? '#ffd700' : teamColors[0];
        
        const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
        if (isSignature) {
          glowGradient.addColorStop(0,   '#fff8dc');
          glowGradient.addColorStop(0.3, teamColors[0]);
          glowGradient.addColorStop(0.6, '#ffd70066');
          glowGradient.addColorStop(1,   'transparent');
        } else {
          glowGradient.addColorStop(0, teamColors[0]);
          glowGradient.addColorStop(0.5, teamColors[0] + '80');
          glowGradient.addColorStop(1, 'transparent');
        }
        
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
        ctx.globalAlpha = 0.6 + Math.sin(Date.now() * 0.008) * 0.2;
        ctx.strokeStyle = '#ffa500';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffa500';
        ctx.beginPath();
        ctx.arc(0, 0, b.radius * 1.4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (isSignature) {
        // ⚔️ SIGNATURE BLADE — renderização épica completa
        const customIconRef = b === b1 ? customIcon1Ref.current : customIcon2Ref.current;
        drawSignatureBey(ctx, b, teamColors, beyType, currentSpinPercent, customIconRef);
      } else {
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
        const customIcon = b === b1 ? customIcon1Ref.current : customIcon2Ref.current;
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
      }
      
      ctx.restore();
      
      // Draw ARMOR visual effect OVER the beyblade
      if (b.bey?.armor) {
        drawArmorVisual(ctx, b);
      }

      // ── SLEEK STATUS BARS ─────────────────────────────────────────
      const barW = 60; const barH = 5; const barGap = 7;
      const bx   = b.x - barW / 2;
      const by0  = b.y - 56;

      // Helper: draw one bar
      function drawBar(x, y, w, h, fill, fillColor, borderColor) {
        // track
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 2);
        ctx.fill();
        // fill
        if (fill > 0) {
          ctx.fillStyle = fillColor;
          ctx.shadowBlur = 4; ctx.shadowColor = fillColor;
          ctx.beginPath();
          ctx.roundRect(x, y, Math.max(2, fill * w), h, 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        // border
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 2);
        ctx.stroke();
      }

      // Stamina
      const stamC = b.stamina > 125 ? '#10B981' : b.stamina > 50 ? '#F59E0B' : '#EF4444';
      drawBar(bx, by0,                   barW, barH + 1, b.stamina / 250, stamC, 'rgba(255,255,255,0.18)');
      // Burst risk
      const burstThreshold = 100 - ((b.bey?.effectiveStats?.bal || 10) * 2);
      const burstPct       = Math.min(1, b.burstDamage / burstThreshold);
      const burstC         = burstPct > 0.7 ? '#ff2244' : burstPct > 0.4 ? '#ff9900' : '#ffdd44';
      drawBar(bx, by0 + barGap,          barW, barH,     burstPct,         burstC,  'rgba(255,255,255,0.14)');
      // Spin
      const spinC = currentSpinPercent > 0.6 ? '#06B6D4' : currentSpinPercent > 0.3 ? '#F59E0B' : '#EF4444';
      drawBar(bx, by0 + barGap * 2,      barW, barH,     currentSpinPercent, spinC, 'rgba(255,255,255,0.14)');
      // Stability
      const stabilityPercent = Math.max(0, b.stability / 150);
      const stabilityColor   = stabilityPercent > 0.6 ? '#8b5cf6' : stabilityPercent > 0.3 ? '#f59e0b' : '#ef4444';
      drawBar(bx, by0 + barGap * 3,      barW, barH,     stabilityPercent,   stabilityColor, 'rgba(255,255,255,0.14)');
      
      // Bey name — elegant minimal label
      const beyLabel = (b.bey?.signatureName || b.bey?.name || 'BEY').substring(0, 12).toUpperCase();
      const teamC0   = (b.bey?.colors?.[0] || b.color || '#3b82f6');
      ctx.save();
      ctx.shadowBlur  = 6;
      ctx.shadowColor = teamC0;
      ctx.fillStyle   = teamC0;
      ctx.font        = 'bold 8px "Orbitron", monospace';
      ctx.textAlign   = 'center';
      ctx.fillText(beyLabel, b.x, b.y - 60);
      ctx.shadowBlur = 0;
      ctx.restore();

      // Tipping warning — pulsing
      if (b.isTipping && !b.fellOver) {
        ctx.save();
        ctx.globalAlpha = 0.55 + Math.sin(Date.now() * 0.012) * 0.3;
        ctx.fillStyle   = '#ff2244';
        ctx.shadowBlur  = 10;
        ctx.shadowColor = '#ff2244';
        ctx.font        = 'bold 10px sans-serif';
        ctx.textAlign   = 'center';
        ctx.fillText('⚠', b.x, b.y - 70);
        ctx.restore();
      }
      
      // 🆕 PHANTOM LAUNCH - Restaurar opacidade
      if (b.opacity !== undefined && b.opacity < 1.0) {
        ctx.restore();
      }
    }

    // ════════════════════════════════════════════════════════════════
    // SISTEMA DE ILUMINAÇÃO PSEUDO-3D
    // ════════════════════════════════════════════════════════════════
    
    function drawBeyShadow(b) {
      if (!b || !b.alive || b.fellOver) return;
      const teamColors = b.bey?.colors || [b.color || '#3b82f6'];
      const c = teamColors[0];
      const spinPct = b.spinSpeed / (b.stats?.maxSpin || 100);

      // ── Soft drop shadow (ellipse offset) ───────────────────────
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.ellipse(b.x + 5, b.y + 6, b.radius * 0.9, b.radius * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // ── Colored floor illumination — fades with spin ────────────
      if (spinPct > 0.2) {
        const intensity = spinPct * 0.45;
        ctx.save();
        ctx.globalAlpha = intensity;
        const floorGrad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius * 2.6);
        floorGrad.addColorStop(0,   c + '55');
        floorGrad.addColorStop(0.5, c + '22');
        floorGrad.addColorStop(1,   'transparent');
        ctx.fillStyle = floorGrad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius * 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    
    function drawArenaLighting() {
      // ── Top spotlight — off-center for depth ──────────────────────
      const lightGradient = ctx.createRadialGradient(
        centerX - 30, centerY - 70, 0,
        centerX, centerY, 290
      );
      lightGradient.addColorStop(0,   'rgba(255,255,255,0.13)');
      lightGradient.addColorStop(0.4, 'rgba(255,255,255,0.04)');
      lightGradient.addColorStop(1,   'rgba(0,0,0,0.22)');
      ctx.fillStyle = lightGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // ── Vignette ──────────────────────────────────────────────────
      const vignetteGradient = ctx.createRadialGradient(
        centerX, centerY, 130,
        centerX, centerY, 380
      );
      vignetteGradient.addColorStop(0, 'transparent');
      vignetteGradient.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = vignetteGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // ── Dynamic bey illumination on arena surface ─────────────────
      const beys = [b1, b2];
      beys.forEach(b => {
        if (!b || !b.alive) return;
        const spinPct = b.spinSpeed / (b.stats?.maxSpin || 100);
        if (spinPct < 0.15) return;
        const c = b.bey?.colors?.[0] || b.color || '#3b82f6';
        const alpha = spinPct * 0.12;
        ctx.save();
        ctx.globalAlpha = alpha;
        const dynGrad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 110);
        dynGrad.addColorStop(0, c);
        dynGrad.addColorStop(0.6, c + '44');
        dynGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = dynGrad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 110, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
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
      } else if (arenaType === 'SPEEDWAY_CIRCUIT') {
        drawSpeedwayCircuit();
      } else if (arenaType === 'DOMINATION_ZONES') {
        drawDominationZones();
      } else if (arenaType === 'TIDAL_SURGE') {
        drawTidalSurge();
      } else if (arenaType === 'STORM_TRACK') {
        drawStormTrack();
      } else {
        drawCircularArena();
      }
    }
    

    // ════════════════════════════════════════════════════════════════
    // IRON CRUCIBLE: LAVA FLOW HELPER FUNCTIONS
    // ════════════════════════════════════════════════════════════════
    
    // Gera padrão de lava flow aleatório
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
      
      // 1% chance de GLOBAL APOCALYPSE
      if (Math.random() < 0.01) {
        return [{
          type: 'global',
          createdAt: Date.now() * 0.001,
          lifetime: 5.0,
          points: []
        }];
      }
      
      const flowCount = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < flowCount; i++) {
        const type = patternTypes[Math.floor(Math.random() * patternTypes.length)];
        const pattern = {
          type: type,
          createdAt: Date.now() * 0.001,
          lifetime: 5.0,
          points: generateFlowPoints(type),
          width: 15 + Math.random() * 25
        };
        patterns.push(pattern);
      }
      
      return patterns;
    }
    
    // Gera pontos do padrão de lava (todos os 20+ padrões)
    function generateFlowPoints(type) {
      const points = [];

      switch(type) {
        // ─── LINEARES ───────────────────────────────────────────
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
        // ─── CURVILÍNEAS ────────────────────────────────────────
        case 'spiral_out_cw': {
          for (let t = 0; t < 6 * Math.PI; t += 0.15) {
            const r = t * 10;
            if (r > 210) break;
            points.push({ x: Math.cos(t) * r, y: Math.sin(t) * r });
          }
          break;
        }
        case 'spiral_out_ccw': {
          for (let t = 0; t < 6 * Math.PI; t += 0.15) {
            const r = t * 10;
            if (r > 210) break;
            points.push({ x: Math.cos(-t) * r, y: Math.sin(-t) * r });
          }
          break;
        }
        case 'spiral_in': {
          for (let t = 0; t < 6 * Math.PI; t += 0.15) {
            const r = 200 - t * 10;
            if (r < 5) break;
            points.push({ x: Math.cos(t) * r, y: Math.sin(t) * r });
          }
          break;
        }
        case 'arc90': {
          const startA = Math.random() * Math.PI * 2;
          const r = 80 + Math.random() * 100;
          for (let a = startA; a < startA + Math.PI / 2; a += 0.08) {
            points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
          }
          break;
        }
        case 'arc180': {
          const startA = Math.random() * Math.PI * 2;
          const r = 80 + Math.random() * 100;
          for (let a = startA; a < startA + Math.PI; a += 0.08) {
            points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
          }
          break;
        }
        case 'snake': {
          for (let x = -200; x <= 200; x += 8) {
            points.push({ x, y: Math.sin(x * 0.05) * 80 });
          }
          break;
        }
        case 'semicircle': {
          const startA = Math.random() * Math.PI * 2;
          const r = 100 + Math.random() * 80;
          for (let a = startA; a < startA + Math.PI; a += 0.08) {
            points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
          }
          break;
        }
        case 'wave_h': {
          for (let x = -200; x <= 200; x += 6) {
            points.push({ x, y: Math.sin(x * 0.08) * 60 });
          }
          break;
        }
        case 'wave_v': {
          for (let y = -200; y <= 200; y += 6) {
            points.push({ x: Math.sin(y * 0.08) * 60, y });
          }
          break;
        }
        case 'spiral_double': {
          for (let t = 0; t < 5 * Math.PI; t += 0.15) {
            const r = t * 10;
            if (r > 210) break;
            points.push({ x: Math.cos(t) * r,  y: Math.sin(t) * r });
            points.push({ x: Math.cos(t + Math.PI) * r, y: Math.sin(t + Math.PI) * r });
          }
          break;
        }
        // ─── RADIAIS ────────────────────────────────────────────
        case 'radial4': {
          [0, 1, 2, 3].forEach(i => {
            const a = (Math.PI / 2) * i;
            for (let r = 0; r <= 200; r += 8) {
              points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
            }
          });
          break;
        }
        case 'radial6': {
          for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i;
            for (let r = 0; r <= 200; r += 8) {
              points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
            }
          }
          break;
        }
        case 'radial8': {
          for (let i = 0; i < 8; i++) {
            const a = (Math.PI / 4) * i;
            for (let r = 0; r <= 200; r += 8) {
              points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
            }
          }
          break;
        }
        case 'ring': {
          const rRing = 80 + Math.random() * 80;
          for (let a = 0; a < Math.PI * 2; a += 0.1) {
            points.push({ x: Math.cos(a) * rRing, y: Math.sin(a) * rRing });
          }
          break;
        }
        case 'ring_double': {
          [90, 155].forEach(rR => {
            for (let a = 0; a < Math.PI * 2; a += 0.1) {
              points.push({ x: Math.cos(a) * rR, y: Math.sin(a) * rR });
            }
          });
          break;
        }
        case 'ring_pulse': {
          const rBase = 100 + Math.random() * 60;
          for (let a = 0; a < Math.PI * 2; a += 0.08) {
            const rPulse = rBase + Math.sin(a * 6) * 20;
            points.push({ x: Math.cos(a) * rPulse, y: Math.sin(a) * rPulse });
          }
          break;
        }
        // ─── COMPLEXOS ──────────────────────────────────────────
        case 'grid': {
          [-80, 0, 80].forEach(gx => {
            for (let gy = -180; gy <= 180; gy += 8) points.push({ x: gx, y: gy });
          });
          [-80, 0, 80].forEach(gy => {
            for (let gx = -180; gx <= 180; gx += 8) points.push({ x: gx, y: gy });
          });
          break;
        }
        case 'logarithmic': {
          for (let t = 0.1; t < 7; t += 0.1) {
            const r = Math.exp(t * 0.5) * 8;
            if (r > 210) break;
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
            for (let j = 0; j < cLen; j += 8) {
              points.push({ x: cx2 + Math.cos(cAngle) * j, y: cy2 + Math.sin(cAngle) * j });
            }
          }
          break;
        }
        default: {
          for (let a = 0; a < Math.PI * 2; a += 0.1) {
            points.push({ x: Math.cos(a) * 100, y: Math.sin(a) * 100 });
          }
        }
      }

      return points;
    }
    
    // Verifica se blade está sobre lava flow
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
      // ════════════════════════════════════════════════════════════════
      // VOLCANIC RAGE v3 — Reimaginada
      // ────────────────────────────────────────────────────────────────
      // Zonas:
      //   Magma Core    (r0–50)   : fricção mínima, heat máximo
      //   Lava River    (r50–140) : 3 rios rotativos que EMPURRAM tangencialmente
      //   Obsidian Belt (r140–190): corrente orbital suave
      //   Crater Edge   (r190–221): 2 fissuras ROTATIVAS — o perigo que se move
      // ════════════════════════════════════════════════════════════════

      const distToCenter = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
      const zones        = ARENA.zones;
      const currentBattleTime = (Date.now() - battleStartTimeRef.current) / 1000;

      // ── INIT ────────────────────────────────────────────────────────
      if (!ARENA._volcanoInit) {
        ARENA._volcanoInit          = true;
        ARENA.heatSystem.level      = 0;
        ARENA.eruptionEvent.active  = false;
        ARENA.eruptionEvent.startTime = 0;
        ARENA.fissureSystem.open    = false;
        ARENA.fissureSystem.baseAngle = 0; // ângulo dinâmico das fissuras
        ARENA._lavaBombs            = [];
        ARENA._riverAngle           = 0;   // ângulo dos rios de lava (giram com o tempo)
      }

      // ── ATUALIZAR ÂNGULO DOS RIOS E FISSURAS ─────────────────────────
      // Ambos giram continuamente — calculado a partir do tempo absoluto
      const rivers   = ARENA.lavaRivers;
      const riverAngle = currentBattleTime * rivers.rotationSpeed; // rad acumulado
      const fs = ARENA.fissureSystem;
      if (fs.open) {
        fs.baseAngle = currentBattleTime * fs.rotationSpeed;
      }

      // ── ABRIR FISSURAS após openDelay ────────────────────────────────
      if (!fs.open && currentBattleTime >= fs.openDelay) {
        fs.open = true;
      }

      // ════════════════════════════════════════════════════════════════
      // HEAT METER
      // ════════════════════════════════════════════════════════════════
      const hs = ARENA.heatSystem;
      const er = ARENA.eruptionEvent;

      if (!er.active) {
        hs.level = Math.min(hs.maxLevel, hs.level + hs.gainPerSecond / 60);
        if (distToCenter < zones.magmaCore && velocity < 1.5)
          hs.level = Math.min(hs.maxLevel, hs.level + hs.gainOnCenterIdle / 60);
        if (b.onLavaRiver)
          hs.level = Math.min(hs.maxLevel, hs.level + hs.gainOnLavaRiver / 60);
      }

      // ── DISPARA ERUPÇÃO ──────────────────────────────────────────────
      if (!er.active && hs.level >= hs.maxLevel) {
        er.active    = true;
        er.startTime = currentBattleTime;
        for (let i = 0; i < 30; i++) {
          const a = (Math.PI * 2 / 30) * i;
          addParticle(centerX + Math.cos(a) * 15, centerY + Math.sin(a) * 15, '#ffdd00', 22);
          addParticle(centerX + Math.cos(a) * 35, centerY + Math.sin(a) * 35, '#ff5500', 16);
        }
        recordEvent('VOLCANIC_ERUPTION', { heat: hs.level });
      }

      // ── ERUPÇÃO ATIVA: impulso explosivo único e curto ───────────────
      if (er.active) {
        const elapsed = currentBattleTime - er.startTime;
        if (elapsed < er.duration) {
          if (distToCenter > 5) {
            const angleFrom = Math.atan2(b.y - centerY, b.x - centerX);
            // Força decai rapidamente (easing: 1 - ratio^2)
            const ratio = elapsed / er.duration;
            const force = er.outwardForce * (1.0 - ratio * ratio);
            b.vx += Math.cos(angleFrom) * force;
            b.vy += Math.sin(angleFrom) * force;
            if (Math.random() < 0.3) addParticle(b.x, b.y, '#ffaa00', 8);
          }
        } else {
          // Erupção termina — SEMPRE spawna lava bombs
          er.active = false;
          hs.level  = hs.resetTo;
          const bombCount = er.lavaBombs.count + Math.floor(Math.random() * (er.lavaBombs.countMax - er.lavaBombs.count + 1));
          for (let i = 0; i < bombCount; i++) {
            const a = (Math.PI * 2 / bombCount) * i + Math.random() * 0.5;
            const r = zones.magmaCore + Math.random() * (zones.lavaFlowRing - zones.magmaCore);
            ARENA._lavaBombs.push({
              x: centerX + Math.cos(a) * r,
              y: centerY + Math.sin(a) * r,
              spawnTime: currentBattleTime,
              hit: false,
            });
          }
        }
      }

      // ── LAVA BOMBS ────────────────────────────────────────────────────
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
            b.stability  = (b.stability || 100) - bombs.stabilityDrain;
            for (let p = 0; p < 8; p++) addParticle(b.x, b.y, '#ff8800', 10);
          }
          return !bm.hit;
        });
      }

      // ════════════════════════════════════════════════════════════════
      // RIOS DE LAVA — 3 braços rotativos no Lava River Ring (r50–140)
      // Cada braço cobre um sector angular e empurra tangencialmente.
      // A bey ganha velocidade na direção do fluxo — não freia!
      // ════════════════════════════════════════════════════════════════
      b.onLavaRiver = false;
      if (distToCenter >= zones.magmaCore && distToCenter <= zones.lavaFlowRing) {
        const bAngle = ((Math.atan2(b.y - centerY, b.x - centerX) + Math.PI * 2) % (Math.PI * 2));
        const armHalfWidth = (rivers.armWidth * Math.PI / 180) / 2;

        for (let i = 0; i < rivers.count; i++) {
          const armAngle = (riverAngle + (Math.PI * 2 / rivers.count) * i) % (Math.PI * 2);
          let diff = Math.abs(bAngle - armAngle);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;

          if (diff < armHalfWidth) {
            b.onLavaRiver = true;
            // Empurrão tangencial na direção da rotação do rio (CCW)
            const tangAngle = Math.atan2(b.y - centerY, b.x - centerX) + Math.PI / 2;
            // Fade nas bordas do braço para transição suave
            const fade = 1 - diff / armHalfWidth;
            b.vx += Math.cos(tangAngle) * rivers.pushForce * fade;
            b.vy += Math.sin(tangAngle) * rivers.pushForce * fade;
            b.stamina -= (rivers.staminaDrain / 60);
            if (Math.random() < 0.08) addParticle(b.x, b.y, '#ff5500', 4);
            break;
          }
        }
      }

      // ════════════════════════════════════════════════════════════════
      // OBSIDIAN BELT — corrente orbital (r140–190)
      // Em vez de micro-reflexões aleatórias, empurra tangencialmente
      // como entrar numa corrente de óleo viscoso.
      // ════════════════════════════════════════════════════════════════
      if (distToCenter >= zones.lavaFlowRing && distToCenter < zones.obsidianBelt) {
        const oc = ARENA.obsidianCurrent;
        // Mesma direção dos rios mas mais fraca
        const tangAngle = Math.atan2(b.y - centerY, b.x - centerX) + Math.PI / 2 * oc.direction;
        b.vx += Math.cos(tangAngle) * oc.tangentialForce;
        b.vy += Math.sin(tangAngle) * oc.tangentialForce;
        if (Math.random() < 0.03) addParticle(b.x, b.y, '#5a1a6a', 3);
      }

      // ════════════════════════════════════════════════════════════════
      // FRICÇÃO POR ZONA — agora baixa e variada
      // ════════════════════════════════════════════════════════════════
      let frictionFactor;
      if (distToCenter < zones.magmaCore) {
        frictionFactor = 0.998; // quasi sem atrito — fundido
      } else if (distToCenter < zones.lavaFlowRing) {
        frictionFactor = 0.997; // escorregadio
      } else if (distToCenter < zones.obsidianBelt) {
        frictionFactor = 0.996 + ARENA.obsidianCurrent.frictionBoost; // pedra polida
      } else {
        frictionFactor = 0.995; // rocha rugosa de borda
      }
      b.vx *= frictionFactor;
      b.vy *= frictionFactor;

      // ════════════════════════════════════════════════════════════════
      // TIGELA RASA — slope gravitacional (rocha vulcânica inclinada)
      // ════════════════════════════════════════════════════════════════
      if (distToCenter > zones.magmaCore) {
        const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
        const distRatio = (distToCenter - zones.magmaCore) / (zones.wall - zones.magmaCore);
        const bowlStrength = er.active ? 0.02 : 0.06;
        b.vx += Math.cos(angleToCenter) * bowlStrength * distRatio * distRatio;
        b.vy += Math.sin(angleToCenter) * bowlStrength * distRatio * distRatio;
      }

      // ════════════════════════════════════════════════════════════════
      // FISSURAS ROTATIVAS — Crater Edge (r190–221)
      // 2 fissuras que giram continuamente — visível e previsível
      // ════════════════════════════════════════════════════════════════
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
          b.submerged = true;
          b.submergedVisual = true;
          b.submersionStartTime = currentBattleTime;
          for (let p = 0; p < 12; p++) addParticle(b.x, b.y, '#cc2200', 8);
        }
      } else if (distToCenter < zones.obsidianBelt && b.submerged) {
        b.submerged = false;
        b.submergedVisual = false;
      }

      // ── SUBMERSÃO ativa ──────────────────────────────────────────────
      if (b.submerged) {
        const timeSubmerged = currentBattleTime - (b.submersionStartTime || currentBattleTime);
        b.vx *= fs.dragMultiplier;
        b.vy *= fs.dragMultiplier;
        b.stamina -= (fs.spinDrainPerSec / 60);
        if (Math.random() < 0.1) addParticle(b.x, b.y, '#ff2200', 5);
        const bWeight = b.bey?.effectiveStats?.weight || 10;
        if (bWeight >= 20 && Math.random() < (fs.heavyEscapeBonus / 60)) {
          b.submerged = false; b.submergedVisual = false;
          addParticle(b.x, b.y, '#ffaa00', 12);
        } else if (timeSubmerged >= fs.submersionDuration) {
          b.alive = false; b.submerged = false; b.submergedVisual = false;
          recordEvent('THERMAL_KO', { bey: b === b1 ? 'b1' : 'b2', time: currentBattleTime });
        }
      }

      // ════════════════════════════════════════════════════════════════
      // WALL CLAMP — absorve durante erupção, rebate normalmente
      // ════════════════════════════════════════════════════════════════
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
          b.vx *= 0.80; b.vy *= 0.80; // bounce mais energético (friction baixa = mais inércia)
          b.stamina -= 1.2;
          b.burstDamage = (b.burstDamage || 0) + 0.3;
          addParticle(b.x, b.y, '#ff6600', 10);
        }
      }
    }
    function handlePangeaPlatformPhysics(b, bSpinPercent, velocity) {
      // PANGEA PLATFORM: 6 tectonic plates + earthquakes + aftershocks + fissures
      const distToCenter = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
      const zones = ARENA.zones;
      const currentTime = Date.now() / 1000;
      const seismic = ARENA.seismic;
      const afs = seismic.aftershocks;
      const fis = seismic.fissures;

      // Update plate angles
      ARENA.plates.forEach(plate => {
        plate.currentAngle += plate.velocity * plate.direction * (1 / 60);
        if (plate.currentAngle > Math.PI * 2) plate.currentAngle -= Math.PI * 2;
        if (plate.currentAngle < 0) plate.currentAngle += Math.PI * 2;
      });

      // ── SEISMIC STATE MACHINE ──────────────────────────────────────
      // Idle → Warning → Main Quake → Aftershocks → Idle
      const isIdle = !seismic.active && !seismic.warningActive && afs.currentAftershock === 0;
      if (isIdle && currentTime - seismic.lastQuakeTime >= seismic.interval) {
        seismic.warningActive = true;
        seismic.warningStartTime = currentTime;
      }

      // Warning phase: subtle shake, plates glow
      if (seismic.warningActive && !seismic.active) {
        if (Math.random() < 0.3) addScreenShake(1.5);
        if (Math.random() < 0.02) addParticle(b.x, b.y, '#ffaa44', 3);
        if (currentTime - seismic.warningStartTime >= seismic.warningTime) {
          seismic.warningActive = false;
          seismic.active = true;
          seismic.activeTimer = 0;
          seismic.lastQuakeTime = currentTime;
          addScreenShake(8);
          // 20% chance to open fissures
          if (Math.random() < fis.chance) {
            const fissureIdx = Math.floor(Math.random() * ARENA.plates.length);
            fis.activeFissures = [{ plateIndex: fissureIdx, createdAt: currentTime }];
          }
          recordEvent('PANGEA_EARTHQUAKE', { intensity: seismic.intensity });
        }
      }

      // Main quake: violent impulses
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

      // Aftershocks: 3x weaker impulses
      if (!seismic.active && afs.currentAftershock > 0 && afs.currentAftershock <= afs.count) {
        if (currentTime - afs.lastAftershockTime >= afs.delay) {
          const aftershockForce = afs.intensity * 0.12;
          b.vx += (Math.random() - 0.5) * aftershockForce;
          b.vy += (Math.random() - 0.5) * aftershockForce;
          if (Math.random() < 0.2) addScreenShake(2);
          if (Math.random() < 0.04) addParticle(b.x, b.y, '#ffaa44', 5);
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

      // Plate tangential force
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

      if (currentPlate) {
        const angleFromCenter = Math.atan2(b.y - centerY, b.x - centerX);
        const tangentialAngle = angleFromCenter + (Math.PI / 2) * currentPlate.direction;
        b.vx += Math.cos(tangentialAngle) * currentPlate.velocity * 1.0;
        b.vy += Math.sin(tangentialAngle) * currentPlate.velocity * 1.0;
        if (Math.random() < 0.03) addParticle(b.x, b.y, currentPlate.direction > 0 ? '#5a8a30' : '#8b4513', 4);
      }

      b.vx *= 0.990;
      b.vy *= 0.990;

      const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
      if (distToCenter > zones.centerStable) {
        b.vx += Math.cos(angleToCenter) * 0.06;
        b.vy += Math.sin(angleToCenter) * 0.06;
      }

      let staminaLoss = 0.14 - ((b.bey?.effectiveStats?.sta || 10) * 0.005);
      staminaLoss += velocity * 0.009;
      if (seismic.active) staminaLoss *= 1.2;
      if (afs.currentAftershock > 0) staminaLoss *= 1.1;

      if (velocity < 2 && b.bey?.type === 'Stamina') {
        staminaLoss *= 0.6;
        if (isOppositeSpin) staminaLoss *= 0.7;
      }
      const hasPerpetual2 = b.bey?.synergies?.some(s => s?.name?.includes('Perpetual')) || false;
      if (hasPerpetual2) staminaLoss -= 0.01;
      if (b.eternalSpinActive && b.eternalSpinTimer < 300) staminaLoss = 0;
      b.stamina -= staminaLoss;

      if (!b.isOrbiting && distToCenter > zones.wall - b.radius) { // satellite guard
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
      // PINBALL INFERNO V3
      // ═══════════════════════════════════════════════════════════════════
      const beyIndex = b === b1 ? 0 : 1;
      const beyKey   = beyIndex === 0 ? 'b1' : 'b2';
      const bRelX    = b.x - centerX;
      const bRelY    = b.y - centerY;
      const distToCenter = Math.sqrt(bRelX ** 2 + bRelY ** 2);
      const arenaR   = ARENA.arenaRadius;

      // ── GRAVITY ──────────────────────────────────────────────────────
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
        const angle = Math.atan2(bRelY, bRelX);
        const nx = Math.cos(angle), ny = Math.sin(angle);
        const dot = b.vx * nx + b.vy * ny;
        b.vx -= 2 * dot * nx;
        b.vy -= 2 * dot * ny;
        b.x   = centerX + nx * (cb.radius + b.radius + 1);
        b.y   = centerY + ny * (cb.radius + b.radius + 1);

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

        if (ARENA.score[beyKey] >= cb.pointsGoal) {
          const opponent   = beyIndex === 0 ? b2 : b1;
          opponent.stamina = 0;
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
            ? -(Math.PI / 2 + Math.PI / 5)
            : -(Math.PI / 2 - Math.PI / 5);
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
        for (let i = 0; i < 25; i++) {
          const a = Math.random() * Math.PI * 2;
          addParticle(b.x + Math.cos(a) * 10, b.y + Math.sin(a) * 10, '#ff0000', 8);
        }
        recordEvent('PINBALL_RINGOUT', { bey: beyKey });
      }

      // ── FRICTION ─────────────────────────────────────────────────────
      b.vx *= 0.993;
      b.vy *= 0.993;

      // ── STAMINA DRAIN ─────────────────────────────────────────────────
      let staminaLoss = 0.14 - ((b.bey?.effectiveStats?.sta || 10) * 0.004);
      staminaLoss += velocity * 0.008;
      const hasPerpetual3 = b.bey?.synergies?.some(s => s?.name?.includes('Perpetual')) || false;
      if (hasPerpetual3) staminaLoss -= 0.01;
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
      
      // Wall collision
      if (!b.isOrbiting && distToCenter > zones.wall - b.radius) { // satellite guard
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
    // SPEEDWAY CIRCUIT - Physics Handler
    // ═══════════════════════════════════════════════════════════════
    function handleSpeedwayCircuitPhysics(b, bSpinPercent, velocity) {
      const zones = ARENA.zones;
      const ovalRatio = ARENA.ovalRatio || 1.6;
      const beyIndex = b === b1 ? 0 : 1;
      const playerNum = beyIndex + 1;
      
      // Calculate distance from center considering oval shape
      const dx = (b.x - centerX) / ovalRatio;
      const dy = b.y - centerY;
      const distToCenter = Math.sqrt(dx * dx + dy * dy);
      
      // ═══ OUTER WALL COLLISION (OVAL) ═══
      if (!b.isOrbiting && distToCenter > zones.wall - b.radius) { // satellite guard
        // Calculate angle in oval space
        const angle = Math.atan2(b.y - centerY, (b.x - centerX) / ovalRatio);
        
        // Reposition on boundary (convert back to screen space)
        b.x = centerX + Math.cos(angle) * (zones.wall - b.radius) * ovalRatio;
        b.y = centerY + Math.sin(angle) * (zones.wall - b.radius);
        
        // Calculate normal in oval space
        const normalX = Math.cos(angle);
        const normalY = Math.sin(angle);
        
        // Transform velocity to oval space for reflection
        const vxOval = b.vx / ovalRatio;
        const vyOval = b.vy;
        
        // Reflect velocity
        const dotProduct = vxOval * normalX + vyOval * normalY;
        const vxOvalNew = vxOval - 2 * dotProduct * normalX;
        const vyOvalNew = vyOval - 2 * dotProduct * normalY;
        
        // Transform back to screen space
        b.vx = vxOvalNew * ovalRatio * 0.75;
        b.vy = vyOvalNew * 0.75;
        
        // Apply damage
        b.stamina -= 1.5;
        b.burstDamage += 0.4;
        
        addParticle(b.x, b.y, '#ffffff', 10);
      }
      
      // Boost pads
      ARENA.boostPads.forEach(pad => {
        const distToPad = Math.sqrt((b.x - (centerX + pad.x)) ** 2 + (b.y - (centerY + pad.y)) ** 2);
        
        if (distToPad < pad.radius && pad.cooldown <= 0) {
          // Calculate boost direction tangent to the oval track
          const angleFromCenter = Math.atan2(b.y - centerY, (b.x - centerX) / ovalRatio);
          const tangentAngle = angleFromCenter + Math.PI / 2;
          
          // Apply boost force
          const boostForce = 18.0;
          b.vx += Math.cos(tangentAngle) * boostForce;
          b.vy += Math.sin(tangentAngle) * boostForce;
          
          // Visual feedback
          pad.cooldown = 2.0;
          pad.active = true;
          
          for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 / 20) * i;
            const px = b.x + Math.cos(angle) * 25;
            const py = b.y + Math.sin(angle) * 25;
            addParticle(px, py, '#ffaa00', 12);
          }
          
          recordEvent('BOOST_PAD', { bey: beyIndex === 0 ? 'b1' : 'b2', pad: pad.id });
        }
        
        // Cooldown decay
        if (pad.cooldown > 0) {
          pad.cooldown -= 1/60;
          if (pad.cooldown <= 0) {
            pad.active = false;
          }
        }
      });
      
      // Oil slicks
      ARENA.oilSlicks.forEach(oil => {
        const inOilX = Math.abs((b.x - centerX) - oil.x) < oil.width / 2;
        const inOilY = Math.abs((b.y - centerY) - oil.y) < oil.height / 2;
        
        if (inOilX && inOilY) {
          // Check if this bey is already affected
          const beyKey = `bey${beyIndex}`;
          const existing = oil.active.find(a => a.bey === beyKey);
          
          if (!existing) {
            // Enter oil - start timer
            oil.active.push({ bey: beyKey, timer: 2.0 });
            
            // Visual feedback
            for (let i = 0; i < 10; i++) {
              addParticle(b.x + (Math.random() - 0.5) * 30, b.y + (Math.random() - 0.5) * 30, '#0066aa', 8);
            }
          }
        }
      });
      
      // Apply oil friction reduction
      ARENA.oilSlicks.forEach(oil => {
        oil.active.forEach((affected, idx) => {
          if (affected.bey === `bey${beyIndex}` && affected.timer > 0) {
            // Reduce friction dramatically (almost zero control)
            b.vx *= 1.02; // Accelerate slightly (slippery)
            b.vy *= 1.02;
            
            affected.timer -= 1/60;
            
            // Visual trail
            if (Math.random() < 0.3) {
              addParticle(b.x, b.y, '#0088cc', 6);
            }
            
            if (affected.timer <= 0) {
              oil.active.splice(idx, 1);
            }
          }
        });
      });
      
      // Checkpoint system for lap counting
      const angleFromCenter = Math.atan2(b.y - centerY, (b.x - centerX) / ovalRatio);
      
      ARENA.checkpoints.forEach((cp, cpIdx) => {
        const cpAngle = cp.angle;
        const angleDiff = Math.abs(angleFromCenter - cpAngle);
        const isNearCheckpoint = angleDiff < 0.3 || angleDiff > (Math.PI * 2 - 0.3);
        
        if (isNearCheckpoint && distToCenter > zones.innerTrack && distToCenter < zones.outerTrack) {
          const passedKey = beyIndex === 0 ? 'passed1' : 'passed2';
          const lastCpKey = beyIndex === 0 ? 'player1LastCheckpoint' : 'player2LastCheckpoint';
          const lapsKey = beyIndex === 0 ? 'player1Laps' : 'player2Laps';
          
          if (!cp[passedKey]) {
            // Check if this is the next checkpoint in order
            const lastCp = ARENA.lapSystem[lastCpKey];
            const expectedCp = (lastCp + 1) % 4;
            
            if (cpIdx === expectedCp) {
              cp[passedKey] = true;
              ARENA.lapSystem[lastCpKey] = cpIdx;
              
              // If passing checkpoint 0 (finish line) after completing all others
              if (cpIdx === 0 && lastCp === 3) {
                ARENA.lapSystem[lapsKey]++;
                
                // Visual celebration
                for (let i = 0; i < 30; i++) {
                  const angle = (Math.PI * 2 / 30) * i;
                  const px = b.x + Math.cos(angle) * 30;
                  const py = b.y + Math.sin(angle) * 30;
                  addParticle(px, py, beyIndex === 0 ? '#ff6666' : '#6666ff', 15);
                }
                
                recordEvent('LAP_COMPLETE', { 
                  bey: beyIndex === 0 ? 'b1' : 'b2', 
                  lap: ARENA.lapSystem[lapsKey],
                  target: ARENA.lapSystem.targetLaps
                });
              }
            }
          }
        } else {
          // Reset passed flag when far from checkpoint
          const passedKey = beyIndex === 0 ? 'passed1' : 'passed2';
          cp[passedKey] = false;
        }
      });
      
      // Check lap victory condition
      const lapsKey = beyIndex === 0 ? 'player1Laps' : 'player2Laps';
      if (ARENA.lapSystem[lapsKey] >= ARENA.lapSystem.targetLaps) {
        // This bey won by laps!
        const otherBey = beyIndex === 0 ? b2 : b1;
        otherBey.spinPercent = 0;
        otherBey.stamina = 0;
      }
      
      // Center hole collision
      if (distToCenter < zones.centerHole) {
        // Push bey back out
        const pushAngle = Math.atan2(b.y - centerY, b.x - centerX);
        const pushForce = 5.0;
        b.vx += Math.cos(pushAngle) * pushForce;
        b.vy += Math.sin(pushAngle) * pushForce;
      }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // DOMINATION ZONES - Physics Handler
    // ═══════════════════════════════════════════════════════════════
    function handleDominationZonesPhysics(b, bSpinPercent, velocity) {
      const zones = ARENA.zones;
      const beyIndex = b === b1 ? 0 : 1;
      const playerKey = beyIndex === 0 ? 'player1' : 'player2';
      const distToCenter = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
      const ps = ARENA.pointsSystem;

      // ── WALL COLLISION ────────────────────────────────────────────
      if (!b.isOrbiting && distToCenter > zones.wall - b.radius) { // satellite guard
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

      // ── TIGELA RASA (Shallow Bowl Effect) ────────────────────────
      // Pull suave para o centro - força aumenta com distância
      if (distToCenter > zones.center) {
        const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
        // Força proporcional à distância (tigela rasa)
        const distanceRatio = (distToCenter - zones.center) / (zones.wall - zones.center);
        const bowlStrength = 0.08; // Suave o suficiente para permitir escape
        const pullForce = bowlStrength * distanceRatio;
        
        b.vx += Math.cos(angleToCenter) * pullForce;
        b.vy += Math.sin(angleToCenter) * pullForce;
      }

      // ── CENTRAL ZONE ─────────────────────────────────────────────
      const cz = ARENA.centralZone;
      if (cz && cz.owner === null && distToCenter <= cz.radius) {
        cz.captureProgress[playerKey] += 1 / 60;
        if (cz.captureProgress[playerKey] >= ps.captureTime) {
          cz.owner = playerKey;
          ps[playerKey].totalPoints += cz.points;
          ps[playerKey].zonesOwned.push('center');
          ps[playerKey].lastCapture = Date.now();
          const pColor = beyIndex === 0 ? '#ff4444' : '#4444ff';
          for (let i = 0; i < 30; i++) {
            const a = (Math.PI * 2 / 30) * i;
            addParticle(centerX + Math.cos(a) * 35, centerY + Math.sin(a) * 35, pColor, 14);
          }
          recordEvent('ZONE_CAPTURED', { bey: beyIndex === 0 ? 'b1' : 'b2', zone: 'center', points: cz.points });
          if (ps[playerKey].totalPoints >= ps.targetPoints) {
            const otherBey = beyIndex === 0 ? b2 : b1;
            otherBey.spinPercent = 0; otherBey.stamina = 0;
          }
        }
      }

      // ── PERIPHERAL ZONES (PIZZA SLICES) ──────────────────────────
      if (ARENA.peripheralZones) {
        for (const zone of ARENA.peripheralZones) {
          if (zone.owner !== null) continue; // Already captured
          
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
          // Ajusta para o caminho mais curto
          if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
          
          // Verifica se está dentro da fatia (pizza slice)
          const isInSliceAngle = angleDiff <= zone.arcWidth / 2;
          const isInSliceRadius = distToCenter >= zones.center && distToCenter <= zones.zoneRadius;
          
          if (isInSliceAngle && isInSliceRadius) {
            zone.captureProgress[playerKey] += 1 / 60;
            // Particle feedback while capturing
            if (Math.random() < 0.05) {
              const pColor = beyIndex === 0 ? '#ff6666' : '#6666ff';
              const particleRadius = (zones.center + zones.zoneRadius) / 2;
              const particleX = centerX + Math.cos(zone.angle) * particleRadius;
              const particleY = centerY + Math.sin(zone.angle) * particleRadius;
              addParticle(particleX, particleY, pColor, 5);
            }
            if (zone.captureProgress[playerKey] >= ps.captureTime) {
              zone.owner = playerKey;
              ps[playerKey].totalPoints += zone.points;
              ps[playerKey].zonesOwned.push(zone.id);
              ps[playerKey].lastCapture = Date.now();
              const pColor = beyIndex === 0 ? '#ff4444' : '#4444ff';
              // Partículas ao longo da fatia
              for (let i = 0; i < 20; i++) {
                const particleAngle = zone.angle - zone.arcWidth/2 + (zone.arcWidth * i / 20);
                const particleRadius = zones.center + Math.random() * (zones.zoneRadius - zones.center);
                const px = centerX + Math.cos(particleAngle) * particleRadius;
                const py = centerY + Math.sin(particleAngle) * particleRadius;
                addParticle(px, py, pColor, 10);
              }
              recordEvent('ZONE_CAPTURED', { bey: beyIndex === 0 ? 'b1' : 'b2', zone: zone.id, points: zone.points });
              if (ps[playerKey].totalPoints >= ps.targetPoints) {
                const otherBey = beyIndex === 0 ? b2 : b1;
                otherBey.spinPercent = 0; otherBey.stamina = 0;
              }
            }
          }
        }
      }

      // ── FRICTION ─────────────────────────────────────────────────
      b.vx *= 0.992;
      b.vy *= 0.992;
    }
    
    // ═══════════════════════════════════════════════════════════════
    // TIDAL SURGE - Physics Handler (espelhado com BattlePhysicsEngine.applyTidalForces)
    // ═══════════════════════════════════════════════════════════════
    function handleTidalSurgePhysics(b, bSpinPercent, velocity) {
      const zones = ARENA.zones;
      const tide  = ARENA.tideSystem;
      const type  = tide.tideType || 'standard';

      const dx   = b.x - centerX;
      const dy   = b.y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // ═══ WALL COLLISION ═══
      if (!b.isOrbiting && dist > zones.wall - b.radius) {
        const angle = Math.atan2(b.y - centerY, b.x - centerX);
        b.x = centerX + Math.cos(angle) * (zones.wall - b.radius);
        b.y = centerY + Math.sin(angle) * (zones.wall - b.radius);
        const normalX = Math.cos(angle), normalY = Math.sin(angle);
        const dot = b.vx * normalX + b.vy * normalY;
        b.vx = b.vx - 2 * dot * normalX;
        b.vy = b.vy - 2 * dot * normalY;

        // Maré alta: parede de água absorve impacto (menos dano, mais corrente)
        const wallMult = tide.phase === 'high' ? 0.65 : 0.75;
        b.vx *= wallMult; b.vy *= wallMult;
        const wallDmg = tide.phase === 'high' ? 0.8 : 1.5;
        b.stamina -= wallDmg;
        b.burstDamage += tide.phase === 'high' ? 0.2 : 0.4;
        addParticle(b.x, b.y, tide.phase === 'high' ? '#88ccff' : '#ffffff', 10);
      }

      // ═══ ILHA CENTRAL ═══
      if (dist < (ARENA.arenaZones?.island || 40)) {
        // Bônus de estabilidade: não aplicamos penalidades
        return;
      }

      // ═══ AREIA SECA: drag leve ═══
      const sandR = ARENA.arenaZones?.sand || 160;
      const floodR = ARENA.arenaZones?.floodZone || 80;
      if (dist > floodR && dist < sandR) {
        b.vx *= 0.9992; b.vy *= 0.9992;
      }

      // ── helper: aplica efeito de água num ponto focal ──
      const applyWaterAt = (wx, wy, radius, phaseName) => {
        const wdx = b.x - wx, wdy = b.y - wy;
        const wd  = Math.sqrt(wdx * wdx + wdy * wdy);
        if (wd >= radius || radius <= 0) return;

        const depth   = 1 - wd / radius;
        const friction = depth < 0.33 ? 0.970 : depth < 0.66 ? 0.945 : 0.910;
        b.vx *= friction; b.vy *= friction;
        b.stamina -= (0.04 + depth * 0.08) * (1/60);

        // Corrente centrípeta
        const force = phaseName === 'high' ? 0.048 : 0.022;
        const adx = wx - b.x, ady = wy - b.y;
        const ad  = Math.sqrt(adx * adx + ady * ady) || 1;
        b.vx += (adx / ad) * force * depth;
        b.vy += (ady / ad) * force * depth;

        // Corrente tangencial (espiral)
        if (type === 'spiral') {
          const dir = tide.spiralDirection || 1;
          b.vx += (-wdy / (wd || 1)) * 0.018 * dir * depth;
          b.vy += ( wdx / (wd || 1)) * 0.018 * dir * depth;
        }

        // Partículas de água
        if (Math.random() < 0.10) {
          const alpha = depth > 0.5 ? 0.8 : 0.5;
          const col = phaseName === 'high' ? '#5aacff' : '#88ccff';
          addParticle(
            b.x + (Math.random()-0.5) * 16,
            b.y + (Math.random()-0.5) * 16,
            col, 5 + depth * 5
          );
        }
      };

      if (type === 'standard' || type === 'spiral') {
        if (tide.phase !== 'low') {
          applyWaterAt(centerX, centerY, tide.floodRadius, tide.phase);
        }

      } else if (type === 'double') {
        if (tide.dualFlood > 0) {
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
          if (dist > innerEdge && dist < zones.wall) {
            const depth = (dist - innerEdge) / (zones.wall - innerEdge);
            const friction = 0.970 + depth * (0.910 - 0.970);
            b.vx *= friction; b.vy *= friction;
            b.stamina -= (0.04 + depth * 0.06) * (1/60);
            // Corrente empurra para dentro
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

      // ── TSUNAMI: borda encolhe, empurra blades para dentro ──────
      const ts = ARENA.tsunamiSystem;
      if (ts && (ts.wallOffset > 0 || ts.permanentOffset > 0)) {
        const effectiveWall = zones.wall - (ts.permanentOffset||0) - (ts.wallOffset||0);
        if (dist > effectiveWall) {
          const angle      = Math.atan2(b.y - centerY, b.x - centerX);
          const penetration = dist - effectiveWall;
          const forceMult  = ts.level === 'apocalyptic' ? 2.2 : ts.level === 'heavy' ? 1.5 : 0.9;
          const pushForce  = Math.min(6, 0.8 + penetration * 0.12) * forceMult;
          // Reflect & clamp
          b.x = centerX + Math.cos(angle) * (effectiveWall - b.radius);
          b.y = centerY + Math.sin(angle) * (effectiveWall - b.radius);
          const dot = b.vx * Math.cos(angle) + b.vy * Math.sin(angle);
          if (dot > 0) { b.vx -= 2*dot*Math.cos(angle); b.vy -= 2*dot*Math.sin(angle); }
          b.vx -= Math.cos(angle) * pushForce * 0.15;
          b.vy -= Math.sin(angle) * pushForce * 0.15;
          b.vx *= 0.68; b.vy *= 0.68;
          b.stamina -= forceMult * 0.8;
          b.burstDamage += forceMult * 0.28;
          // Spray particles
          if (Math.random() < 0.5) {
            const colsByLevel = { light:'#22ff88', heavy:'#cc44ff', apocalyptic:'#ff2244' };
            addParticle(b.x, b.y, colsByLevel[ts.level||'light'] || '#22ff88', 9);
          }
        }
      }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // STORM TRACK - Physics Handler
    // ═══════════════════════════════════════════════════════════════
    function handleStormTrackPhysics(b, bSpinPercent, velocity) {
      const zones = ARENA.zones;
      const stormSystem = ARENA.stormSystem;
      const distToCenter = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
      
      // ═══ WALL COLLISION ═══
      if (!b.isOrbiting && distToCenter > zones.wall - b.radius) { // satellite guard
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
      
      // ═══ BOWL EFFECT - Gravitational pull toward center ═══
      const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
      
      // Stronger pull the farther from center (bowl gets steeper)
      if (distToCenter > zones.center) {
        const bowlStrength = 0.08; // Força da tigela
        const distanceRatio = (distToCenter - zones.center) / (zones.wall - zones.center);
        const pullForce = bowlStrength * distanceRatio;
        
        b.vx += Math.cos(angleToCenter) * pullForce;
        b.vy += Math.sin(angleToCenter) * pullForce;
        
        // Visual feedback - particles rolling down the bowl
        if (Math.random() < 0.05 && distanceRatio > 0.5) {
          addParticle(b.x, b.y, '#888888', 4);
        }
      }
      
      // ═══ STORM EFFECTS ═══
      if (stormSystem && stormSystem.timing.currentPhase === 'active' && stormSystem.currentStorm) {
        const activeStorm = stormSystem.stormTypes[stormSystem.currentStorm];
        const bAbsX = b.x - centerX;
        const bAbsY = b.y - centerY;
        
        switch (stormSystem.currentStorm) {
          case 'LIGHTNING_STORM':
            // Verifica colisão com raios
            if (activeStorm.strikes) {
              activeStorm.strikes.forEach(strike => {
                const distToStrike = Math.sqrt((bAbsX - strike.x) ** 2 + (bAbsY - strike.y) ** 2);
                if (distToStrike < strike.radius) {
                  // Raio atingiu o beyblade!
                  if (!b.lightningHit || Date.now() - b.lightningHit > 1000) {
                    b.vx *= 0.5; // Reduz velocidade drasticamente
                    b.vy *= 0.5;
                    b.stamina -= 8;
                    b.stability = Math.max(0, b.stability - 20);
                    b.lightningHit = Date.now();
                    
                    addParticle(b.x, b.y, '#ffff00', 30);
                    addParticle(b.x, b.y, '#ffffff', 25);
                    recordEvent('LIGHTNING_STRIKE', { bey: b === b1 ? 'b1' : 'b2' });
                  }
                }
              });
            }
            break;
            
          case 'WIND_VORTEX':
            // Atração para vórtices
            if (activeStorm.vortices) {
              activeStorm.vortices.forEach(vortex => {
                const distToVortex = Math.sqrt((bAbsX - vortex.x) ** 2 + (bAbsY - vortex.y) ** 2);
                if (distToVortex < activeStorm.vortexRadius) {
                  const angleToVortex = Math.atan2(vortex.y - bAbsY, vortex.x - bAbsX);
                  const tangentAngle = angleToVortex + Math.PI / 2;
                  const strength = (1 - distToVortex / activeStorm.vortexRadius) * activeStorm.pullForce;
                  
                  // Pull + rotation
                  b.vx += Math.cos(angleToVortex) * strength * 0.1;
                  b.vy += Math.sin(angleToVortex) * strength * 0.1;
                  b.vx += Math.cos(tangentAngle) * strength * 0.15;
                  b.vy += Math.sin(tangentAngle) * strength * 0.15;
                  
                  if (Math.random() < 0.1) {
                    addParticle(b.x, b.y, '#ccccff', 8);
                  }
                }
              });
            }
            break;
            
          case 'HAIL_BARRAGE':
            // Colisão com granizo
            if (activeStorm.hailstones) {
              activeStorm.hailstones.forEach(hail => {
                const distToHail = Math.sqrt((bAbsX - hail.x) ** 2 + (bAbsY - hail.y) ** 2);
                if (distToHail < 15) {
                  b.stamina -= activeStorm.damagePerHit || 2;
                  b.vx *= activeStorm.slowEffect || 0.85;
                  b.vy *= activeStorm.slowEffect || 0.85;
                  
                  if (Math.random() < 0.3) {
                    addParticle(b.x, b.y, '#aaccff', 10);
                  }
                }
              });
            }
            break;
            
          case 'RAIN_WAVE':
            // Onda de chuva - aumenta fricção se estiver ativa
            if (arenaState.rainActive) {
              b.vx *= 0.98;
              b.vy *= 0.98;
              
              if (Math.random() < 0.05) {
                addParticle(b.x, b.y, '#00aaff', 6);
              }
            }
            break;
            
          case 'THUNDER_DOME':
            // Repulsão da parede durante thunder dome
            if (distToCenter > activeStorm.domeRadius - activeStorm.repulsionRange) {
              const repelAngle = Math.atan2(bAbsY, bAbsX);
              const repelForce = activeStorm.repulsionForce;
              
              b.vx -= Math.cos(repelAngle) * repelForce * 0.1;
              b.vy -= Math.sin(repelAngle) * repelForce * 0.1;
              
              // Dano por tick
              const currentTime = arenaState.time;
              if (!activeStorm.lastTickTime || currentTime - activeStorm.lastTickTime >= activeStorm.tickRate) {
                b.stamina -= activeStorm.damagePerTick || 3;
                activeStorm.lastTickTime = currentTime;
                
                if (Math.random() < 0.3) {
                  addParticle(b.x, b.y, '#00ffff', 12);
                }
              }
            }
            break;
            
          case 'TORNADO_FURY':
            // Tornado no centro - pull muito forte
            const distToTornado = Math.sqrt(
              (bAbsX - activeStorm.tornadoX) ** 2 + 
              (bAbsY - activeStorm.tornadoY) ** 2
            );
            
            if (distToTornado < activeStorm.tornadoRadius) {
              const angleToTornado = Math.atan2(
                activeStorm.tornadoY - bAbsY,
                activeStorm.tornadoX - bAbsX
              );
              const tangentAngle = angleToTornado + Math.PI / 2;
              const strength = (1 - distToTornado / activeStorm.tornadoRadius) * activeStorm.pullForce;
              
              // Pull muito forte + rotation
              b.vx += Math.cos(angleToTornado) * strength * 0.15;
              b.vy += Math.sin(angleToTornado) * strength * 0.15;
              b.vx += Math.cos(tangentAngle) * strength * 0.2;
              b.vy += Math.sin(tangentAngle) * strength * 0.2;
              
              // Chance de "levantar" o beyblade
              if (distToTornado < 30 && Math.random() < activeStorm.liftChance * 0.01) {
                b.stamina -= 15;
                b.stability = Math.max(0, b.stability - 30);
                
                addParticle(b.x, b.y, '#ff6666', 20);
                recordEvent('TORNADO_LIFT', { bey: b === b1 ? 'b1' : 'b2' });
              }
              
              if (Math.random() < 0.15) {
                addParticle(b.x, b.y, '#ff6666', 10);
              }
            }
            break;
        }
      }
    }
    
    function drawColosseumCarnage() {
      // ═══════════════════════════════════════════════════════════════════
      // CARNAGE COLOSSEUM — Renderer Oval
      // Arena oval estilo Coliseu Romano com chão de areia e paredes de pedra.
      // O evento ativo muda o visual do round inteiro.
      // ═══════════════════════════════════════════════════════════════════
      const zones  = ARENA.zones;
      const colors = ARENA.colors;
      const ce     = ARENA.carnageEvent;
      const time   = arenaState.time;
      if (!zones || !colors || !ce) return;

      const cx = 500, cy = 350; // centro do canvas
      const outerA = zones.outerA, outerB = zones.outerB;
      const innerA = zones.wallA,  innerB = zones.wallB;

      // ── Effective wallA (pode diminuir com THE_EXECUTIONER) ────────
      const effA = ce.activeEvent === 'THE_EXECUTIONER'
        ? ce.executioner.currentA
        : innerA;
      const effB = innerB; // vertical não comprime

      // ════════════════════════════════════════════════════════════════
      // 1. ATMOSFERA DO EVENTO — fundo colorido suave
      // ════════════════════════════════════════════════════════════════
      if (ce.activeEvent === 'BLOOD_MOON') {
        ctx.fillStyle = '#0a0004';
        ctx.fillRect(0, 0, 1000, 700);
      } else {
        ctx.fillStyle = '#1a120a';
        ctx.fillRect(0, 0, 1000, 700);
      }

      // ════════════════════════════════════════════════════════════════
      // 2. PAREDE EXTERNA DE PEDRA (anel sólido)
      // ════════════════════════════════════════════════════════════════
      // Anel de pedra do coliseu
      const stoneGrad = ctx.createRadialGradient(cx, cy, innerB, cx, cy, outerB + 20);
      stoneGrad.addColorStop(0, colors.stoneEdge);
      stoneGrad.addColorStop(0.4, colors.stoneMid);
      stoneGrad.addColorStop(0.8, colors.stoneOuter);
      stoneGrad.addColorStop(1, '#1a0e06');
      ctx.fillStyle = stoneGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, outerA + 8, outerB + 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Arcos decorativos na parede (estilo Coliseu)
      const numArches = 16;
      for (let i = 0; i < numArches; i++) {
        const ang  = (i / numArches) * Math.PI * 2;
        const archA = outerA - 8, archB = outerB - 8;
        const ax   = cx + Math.cos(ang) * archA;
        const ay   = cy + Math.sin(ang) * archB;
        ctx.save();
        ctx.translate(ax, ay);
        ctx.rotate(ang + Math.PI / 2);
        ctx.fillStyle = 'rgba(20,12,5,0.6)';
        ctx.fillRect(-6, -14, 12, 20);
        ctx.strokeStyle = 'rgba(100,70,35,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-6, -14, 12, 20);
        ctx.restore();
      }

      // Linha interna da parede (borda da área de jogo)
      ctx.strokeStyle = colors.stoneInner;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(cx, cy, innerA + 4, innerB + 4, 0, 0, Math.PI * 2);
      ctx.stroke();

      // ════════════════════════════════════════════════════════════════
      // 3. CHÃO DE AREIA — base sempre presente
      // ════════════════════════════════════════════════════════════════
      // Fundo de areia — muda cor por evento
      let sandColor1 = colors.sandLight;
      let sandColor2 = colors.sandDark;
      if (ce.activeEvent === 'BLOOD_MOON') {
        sandColor1 = '#6a1520'; sandColor2 = '#3a0810';
      } else if (ce.activeEvent === 'FROZEN_GROUND') {
        sandColor1 = '#a0c8e0'; sandColor2 = '#5a8aaa';
      } else if (ce.activeEvent === 'INFERNO_WALLS') {
        sandColor1 = '#d4803a'; sandColor2 = '#8a4010';
      }

      // ── FloorSink: profundidade atual (0 = plano, 1 = funil máximo) ──
      const fs     = ARENA.floorSink;
      const depth  = fs ? fs.depth : 0;

      // Chão base — sempre desenhado
      const sandGrad = ctx.createRadialGradient(cx, cy - 20, 0, cx, cy, innerB);
      sandGrad.addColorStop(0, sandColor1);
      sandGrad.addColorStop(0.55, colors.sand);
      sandGrad.addColorStop(1, sandColor2);
      ctx.fillStyle = sandGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, effA, effB, 0, 0, Math.PI * 2);
      ctx.fill();

      // ── EFEITO FUNIL — desenhado sobre o chão quando depth > 0 ───────
      if (depth > 0.01) {
        const numRings  = 10;   // anéis concêntricos do funil
        const maxShift  = 22;   // deslocamento vertical máximo do centro (perspectiva)
        const maxDark   = 0.72; // escurecimento máximo no centro

        // Clip dentro da arena para não vazar
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, cy, effA - 1, effB - 1, 0, 0, Math.PI * 2);
        ctx.clip();

        // Anéis do funil — do externo ao interno
        // Cada anel é deslocado para baixo proporcionalmente à proximidade do centro
        // simulando a perspectiva de uma superfície côncava
        for (let i = numRings; i >= 0; i--) {
          const t      = i / numRings;            // 1.0 = borda, 0.0 = centro
          const tInv   = 1 - t;                   // 0.0 = borda, 1.0 = centro
          const rA     = effA * t;
          const rB     = effB * t;
          // Quanto mais perto do centro, mais afundado (shift para baixo em perspectiva)
          const yShift = tInv * tInv * maxShift * depth;
          // Escurece progressivamente para o centro (simula profundidade)
          const dark   = tInv * tInv * maxDark * depth;
          const alpha  = tInv * 0.55 * depth;

          if (rA < 2 || rB < 2) {
            // Centro — buraco escuro
            ctx.fillStyle = `rgba(30,15,5,${0.85 * depth})`;
            ctx.beginPath();
            ctx.ellipse(cx, cy + yShift, Math.max(2, rA), Math.max(1, rB * 0.4), 0, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Anel de sombra/profundidade
            ctx.fillStyle = `rgba(10,5,0,${alpha})`;
            ctx.beginPath();
            ctx.ellipse(cx, cy + yShift * 0.8, rA, rB * (1 - tInv * 0.3 * depth), 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Brilho nas bordas do funil (reflexo de luz saindo da boca)
        const rimGrad = ctx.createRadialGradient(cx, cy, effB * (1 - 0.15 * depth), cx, cy, effB);
        rimGrad.addColorStop(0, 'transparent');
        rimGrad.addColorStop(1, `rgba(240,190,90,${0.25 * depth})`);
        ctx.fillStyle = rimGrad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, effA, effB, 0, 0, Math.PI * 2);
        ctx.fill();

        // Partículas de areia caindo para o centro (linhas radiais suaves)
        if (depth > 0.3) {
          const numStreams = 16;
          ctx.strokeStyle = `rgba(196,147,74,${depth * 0.35})`;
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 6]);
          for (let i = 0; i < numStreams; i++) {
            const ang   = (i / numStreams) * Math.PI * 2 + time * 0.6;
            const startT = 0.35 + Math.sin(time * 2 + i) * 0.1;
            const endT  = 0.05;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(ang) * effA * startT, cy + Math.sin(ang) * effB * startT);
            ctx.lineTo(cx + Math.cos(ang) * effA * endT,   cy + Math.sin(ang) * effB * endT + 8 * depth);
            ctx.stroke();
          }
          ctx.setLineDash([]);
        }

        ctx.restore();

        // Aviso de afundamento na borda — pulso vermelho sutil
        if (fs.phase === 'flat' && fs.idleTimer >= fs.interval - 1.0) {
          const warnAlpha = ((fs.idleTimer - (fs.interval - 1.0)) / 1.0) * 0.4;
          ctx.strokeStyle = `rgba(180,80,20,${warnAlpha * Math.abs(Math.sin(time * 12))})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(cx, cy, effA - 3, effB - 3, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Marcas de areia (trilhas texturizadas) — menos visíveis quando afundando
      ctx.strokeStyle = `rgba(200,160,80,${0.12 * (1 - depth * 0.6)})`;
      ctx.lineWidth = 1;
      for (let r = 30; r < innerB; r += 28) {
        const rA = r * (innerA / innerB);
        ctx.beginPath();
        ctx.ellipse(cx, cy, rA, r, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // ════════════════════════════════════════════════════════════════
      // 4. EFEITOS VISUAIS DO EVENTO ATIVO
      // ════════════════════════════════════════════════════════════════

      // ── INFERNO_WALLS — chamas nas bordas ────────────────────────
      if (ce.activeEvent === 'INFERNO_WALLS') {
        const numFlames = 36;
        for (let i = 0; i < numFlames; i++) {
          const ang    = (i / numFlames) * Math.PI * 2;
          const flameT = (time * 4 + i * 0.7) % (Math.PI * 2);
          const height = 18 + Math.sin(flameT) * 10;
          const fx     = cx + Math.cos(ang) * (effA - 6);
          const fy     = cy + Math.sin(ang) * (effB - 6);
          const fGrad  = ctx.createRadialGradient(fx, fy, 0, fx, fy, height);
          fGrad.addColorStop(0, 'rgba(255,220,50,0.9)');
          fGrad.addColorStop(0.4, 'rgba(255,100,0,0.7)');
          fGrad.addColorStop(1, 'rgba(200,0,0,0)');
          ctx.fillStyle = fGrad;
          ctx.beginPath();
          ctx.ellipse(fx, fy, height * 0.4, height, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // Glow vermelho pulsante na borda
        const glow = ctx.createRadialGradient(cx, cy, effA - 35, cx, cy, effA + 10);
        glow.addColorStop(0, 'transparent');
        glow.addColorStop(0.6, `rgba(255,80,0,${0.15 + Math.sin(time * 5) * 0.1})`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.ellipse(cx, cy, effA + 15, effB + 15, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── PHANTOM_PAIR — peões fantasma ─────────────────────────────
      if (ce.activeEvent === 'PHANTOM_PAIR') {
        ce.phantomBlades.forEach(ph => {
          if (!ph.alive) return;
          const px = cx + ph.x, py = cy + ph.y;
          // Aura
          const aura = ctx.createRadialGradient(px, py, 0, px, py, ph.radius + 12);
          aura.addColorStop(0, 'rgba(200,200,255,0.5)');
          aura.addColorStop(1, 'rgba(150,150,255,0)');
          ctx.fillStyle = aura;
          ctx.beginPath();
          ctx.arc(px, py, ph.radius + 12, 0, Math.PI * 2);
          ctx.fill();
          // Corpo branco
          ctx.fillStyle = 'rgba(240,240,255,0.95)';
          ctx.beginPath();
          ctx.arc(px, py, ph.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#aaaaee';
          ctx.lineWidth = 2;
          ctx.stroke();
          // HP bar
          const hpFrac = ph.hp / 80;
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(px - 18, py - ph.radius - 10, 36, 5);
          ctx.fillStyle = `hsl(${hpFrac * 120},80%,55%)`;
          ctx.fillRect(px - 18, py - ph.radius - 10, 36 * hpFrac, 5);
        });
      }

      // ── THE_CHAMPION — peão gigante ───────────────────────────────
      if (ce.activeEvent === 'THE_CHAMPION' && ce.championBlade && ce.championBlade.alive) {
        const ch = ce.championBlade;
        const px = cx + ch.x, py = cy + ch.y;
        // Aura dourada
        const aura = ctx.createRadialGradient(px, py, ch.radius * 0.5, px, py, ch.radius + 20);
        aura.addColorStop(0, `rgba(255,220,50,${0.3 + Math.sin(time * 6) * 0.2})`);
        aura.addColorStop(1, 'rgba(255,150,0,0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(px, py, ch.radius + 20, 0, Math.PI * 2);
        ctx.fill();
        // Corpo dourado
        const chGrad = ctx.createRadialGradient(px - ch.radius * 0.3, py - ch.radius * 0.3, 0, px, py, ch.radius);
        chGrad.addColorStop(0, '#fff0a0');
        chGrad.addColorStop(0.5, '#d4a000');
        chGrad.addColorStop(1, '#7a5500');
        ctx.fillStyle = chGrad;
        ctx.beginPath();
        ctx.arc(px, py, ch.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 3;
        ctx.stroke();
        // Corona
        ctx.fillStyle = '#ffd700';
        ctx.font = `${ch.radius * 0.6}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('♛', px, py);
        // HP bar
        const hpFrac = ch.hp / 200;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(px - 28, py - ch.radius - 12, 56, 7);
        ctx.fillStyle = `hsl(${hpFrac * 120},80%,50%)`;
        ctx.fillRect(px - 28, py - ch.radius - 12, 56 * hpFrac, 7);
      }

      // ── FROZEN_GROUND — efeito de gelo ────────────────────────────
      if (ce.activeEvent === 'FROZEN_GROUND') {
        // Rachaduras de gelo radiais
        ctx.strokeStyle = 'rgba(180,230,255,0.35)';
        ctx.lineWidth = 1.2;
        const cracks = 12;
        for (let i = 0; i < cracks; i++) {
          const ang = (i / cracks) * Math.PI * 2 + 0.3;
          ctx.beginPath();
          let rx = cx, ry = cy;
          for (let seg = 0; seg < 6; seg++) {
            const segLen = 20 + Math.random() * 25;
            const jitter = (Math.random() - 0.5) * 0.4;
            rx += Math.cos(ang + jitter) * segLen;
            ry += Math.sin(ang + jitter) * segLen;
            if (seg === 0) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
          }
          ctx.stroke();
        }
        // Brilho azul gelo
        const iceGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, effB);
        iceGlow.addColorStop(0, 'rgba(150,220,255,0.12)');
        iceGlow.addColorStop(1, 'rgba(80,160,220,0.05)');
        ctx.fillStyle = iceGlow;
        ctx.beginPath();
        ctx.ellipse(cx, cy, effA, effB, 0, 0, Math.PI * 2);
        ctx.fill();
        // Overlay de névoa
        ctx.fillStyle = `rgba(180,230,255,${0.06 + Math.sin(time * 1.5) * 0.03})`;
        ctx.beginPath();
        ctx.ellipse(cx, cy, effA, effB, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── BLOOD_MOON — arena sombria ────────────────────────────────
      if (ce.activeEvent === 'BLOOD_MOON') {
        // Vinheta vermelha
        const vigGrad = ctx.createRadialGradient(cx, cy, effB * 0.3, cx, cy, effB);
        vigGrad.addColorStop(0, 'transparent');
        vigGrad.addColorStop(0.7, 'rgba(100,0,15,0.2)');
        vigGrad.addColorStop(1, 'rgba(180,0,20,0.45)');
        ctx.fillStyle = vigGrad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, effA, effB, 0, 0, Math.PI * 2);
        ctx.fill();
        // Pulso vermelho
        const pulse = 0.08 + Math.sin(time * 2.5) * 0.05;
        ctx.strokeStyle = `rgba(200,0,30,${pulse * 3})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(cx, cy, effA - 5, effB - 5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // ── SANDSTORM — partículas de areia girando ───────────────────
      if (ce.activeEvent === 'SANDSTORM') {
        const dir = ce.sandstorm.direction;
        const numParticles = 30;
        for (let i = 0; i < numParticles; i++) {
          const baseAng = (i / numParticles) * Math.PI * 2;
          const swirl   = baseAng + dir * time * 0.8 + Math.sin(time * 2 + i) * 0.3;
          const r       = 40 + (i / numParticles) * (effB - 50);
          const rA      = r * (effA / effB);
          const px      = cx + Math.cos(swirl) * rA;
          const py      = cy + Math.sin(swirl) * r;
          const alpha   = 0.15 + Math.sin(time * 3 + i) * 0.1;
          ctx.fillStyle = `rgba(196,147,74,${alpha})`;
          ctx.beginPath();
          ctx.arc(px, py, 3 + Math.sin(time + i) * 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
        // Seta de direção
        const arrowAlpha = 0.4 + Math.sin(time * 3) * 0.2;
        ctx.strokeStyle = `rgba(220,170,80,${arrowAlpha})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.ellipse(cx, cy, effA * 0.55, effB * 0.55, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // ── THE_EXECUTIONER — paredes comprimindo ─────────────────────
      if (ce.activeEvent === 'THE_EXECUTIONER') {
        // Paredes avançando (drawn on both sides)
        const ex  = ce.executioner;
        const origA = ARENA.zones.wallA;
        if (ex.currentA < origA - 2) {
          // Parede oeste avançando
          const wallX = cx - ex.currentA;
          const wallGrad = ctx.createLinearGradient(cx - origA, 0, wallX, 0);
          wallGrad.addColorStop(0, 'rgba(80,40,20,0.95)');
          wallGrad.addColorStop(1, 'rgba(180,50,20,0.7)');
          ctx.fillStyle = wallGrad;
          ctx.fillRect(0, cy - effB, wallX - (cx - origA), effB * 2);
          // Parede leste
          const wallX2 = cx + ex.currentA;
          const wallGrad2 = ctx.createLinearGradient(wallX2, 0, cx + origA, 0);
          wallGrad2.addColorStop(0, 'rgba(180,50,20,0.7)');
          wallGrad2.addColorStop(1, 'rgba(80,40,20,0.95)');
          ctx.fillStyle = wallGrad2;
          ctx.fillRect(wallX2, cy - effB, (cx + origA) - wallX2, effB * 2);
          // Bordas das paredes comprimidas
          ctx.strokeStyle = `rgba(220,60,20,${0.7 + Math.sin(time * 8) * 0.3})`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(wallX, cy - effB); ctx.lineTo(wallX, cy + effB);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(wallX2, cy - effB); ctx.lineTo(wallX2, cy + effB);
          ctx.stroke();
        }
        // Indicadores de fase
        if (ex.phase === 0) {
          const timeToFirst = ex.firstAt - (time - ce.revealTime);
          if (timeToFirst > 0 && timeToFirst < 5) {
            ctx.fillStyle = `rgba(220,60,20,${0.5 + Math.sin(time * 10) * 0.4})`;
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`⚔ COMPRESSÃO EM ${Math.ceil(timeToFirst)}s ⚔`, cx, cy - effB - 18);
          }
        }
      }

      // ── DIVINE_JUDGMENT — avisos e raios ─────────────────────────
      if (ce.activeEvent === 'DIVINE_JUDGMENT') {
        const div = ce.divine;
        // Avisos (círculo pulsante antes do raio)
        div.warnings.forEach(w => {
          const alpha = 0.3 + Math.sin(w.age * 20) * 0.3;
          ctx.strokeStyle = `rgba(100,255,220,${alpha})`;
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(cx + w.x, cy + w.y, 32, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        });
        // Raios
        div.strikes.forEach(s => {
          const decay = Math.max(0, 1 - s.age / 1.5);
          const px    = cx + s.x, py = cy + s.y;
          // Raio do céu
          ctx.strokeStyle = `rgba(100,255,220,${decay * 0.8})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(px, 0); ctx.lineTo(px, py);
          ctx.stroke();
          // Impacto
          const impactGrad = ctx.createRadialGradient(px, py, 0, px, py, s.radius * decay);
          impactGrad.addColorStop(0, `rgba(200,255,240,${decay})`);
          impactGrad.addColorStop(0.5, `${s.color}${Math.floor(decay * 180).toString(16).padStart(2,'0')}`);
          impactGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = impactGrad;
          ctx.beginPath();
          ctx.arc(px, py, s.radius, 0, Math.PI * 2);
          ctx.fill();
          // Label do efeito
          if (s.age < 0.8) {
            ctx.fillStyle = s.color;
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(s.effect.replace('_', ' '), px, py - s.radius - 8);
          }
        });
      }

      // ════════════════════════════════════════════════════════════════
      // 5. PORTÕES A e B
      // ════════════════════════════════════════════════════════════════
      const drawGate = (isLeft) => {
        const gKey   = isLeft ? 'A' : 'B';
        const gate   = ARENA.gates[gKey];
        const gx     = cx + (isLeft ? -(effA) : effA);
        const gy     = cy;

        ctx.save();
        ctx.translate(gx, gy);

        const gateOpen = gate && gate.open;
        const frameColor = gateOpen ? colors.gateOpen : colors.gateA;

        // Marco da porta
        ctx.fillStyle = frameColor;
        ctx.fillRect(-6, -22, 12, 44);

        if (!gateOpen) {
          // Barras
          ctx.strokeStyle = '#4a0000';
          ctx.lineWidth = 2.5;
          for (let bar = -18; bar <= 18; bar += 9) {
            ctx.beginPath();
            ctx.moveTo(isLeft ? 2 : -2, bar);
            ctx.lineTo(isLeft ? 8 : -8, bar);
            ctx.stroke();
          }
        } else {
          // Brilho de portão aberto
          ctx.fillStyle = `rgba(255,60,0,${0.5 + Math.sin(time * 10) * 0.3})`;
          ctx.fillRect(-6, -22, 12, 44);
        }

        // Label
        ctx.fillStyle = gateOpen ? '#ff6633' : 'rgba(200,80,50,0.7)';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`GATE ${gKey}`, 0, isLeft ? 32 : 32);
        ctx.restore();
      };
      drawGate(true);
      drawGate(false);

      // ════════════════════════════════════════════════════════════════
      // 6. BORDA ELÍPTICA DE JOGO (linha de separação areia/parede)
      // ════════════════════════════════════════════════════════════════
      ctx.strokeStyle = colors.stoneEdge;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(cx, cy, effA, effB, 0, 0, Math.PI * 2);
      ctx.stroke();

      // ════════════════════════════════════════════════════════════════
      // 7. BANNER DO EVENTO — topo da tela (quando revelado)
      // ════════════════════════════════════════════════════════════════
      if (ce.revealed && ce.activeEvent) {
        const eventMeta = {
          INFERNO_WALLS:   { label: '🔥 INFERNO WALLS',    color: '#ff4400' },
          PHANTOM_PAIR:    { label: '👻 PHANTOM PAIR',     color: '#c8c8ff' },
          THE_CHAMPION:    { label: '👑 THE CHAMPION',     color: '#ffd700' },
          FROZEN_GROUND:   { label: '❄️ FROZEN GROUND',    color: '#88ddff' },
          BLOOD_MOON:      { label: '🌑 BLOOD MOON',       color: '#cc3355' },
          SANDSTORM:       { label: '🌪️ SANDSTORM',        color: '#e0b870' },
          THE_EXECUTIONER: { label: '⚔️ THE EXECUTIONER',  color: '#cc2222' },
          DIVINE_JUDGMENT: { label: '⚡ DIVINE JUDGMENT',  color: '#44ffee' },
        };
        const meta = eventMeta[ce.activeEvent];
        if (meta) {
          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          ctx.fillRect(0, 0, 1000, 28);
          ctx.fillStyle = meta.color;
          ctx.font = 'bold 13px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(meta.label, 500, 19);
        }
      }

      // ════════════════════════════════════════════════════════════════
      // 8. PRÉ-REVELAÇÃO — suspense antes dos 3s
      // ════════════════════════════════════════════════════════════════
      if (!ce.revealed) {
        const countdown = Math.max(0, ce.revealTime - time);
        const pulse = 0.6 + Math.sin(time * 8) * 0.4;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, 1000, 30);
        ctx.fillStyle = `rgba(201,168,76,${pulse})`;
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`⚔ DESTINO DO ROUND REVELA EM ${countdown.toFixed(1)}s ⚔`, 500, 20);
      }
    }

    function drawKillerSidesArena() {
      const zones = ARENA.zones;
      const colors = ARENA.colors;
      const time = Date.now() * 0.001;
      
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
      if (!zones || !colors) return;

      const cx = ensureFinite(500, 500);
      const cy = ensureFinite(350, 350);
      const t  = Date.now();

      // ════════════════════════════════════════════════════════════════
      // BB10_COMPETITIVE — Visual redesign (green ring, dark floor)
      // ════════════════════════════════════════════════════════════════
      if (arenaType === 'BB10_COMPETITIVE') {
        const wallR    = zones.wall;       // 221
        const greenW   = 34;               // espessura do anel verde
        const playR    = wallR - greenW;   // raio do chão de jogo (~187)
        const currentBattleTime = (Date.now() - battleStartTimeRef.current) / 1000;
        if (!ARENA.exitsOpen && currentBattleTime >= ARENA.exitsOpenTime) ARENA.exitsOpen = true;

        // Animação da porta
        const doorAnimDuration = 0.55;
        let doorOpenProgress = 0;
        if (ARENA.exitsOpen) {
          doorOpenProgress = Math.min(1, (currentBattleTime - ARENA.exitsOpenTime) / doorAnimDuration);
        }

        // ── 0. SOMBRA EXTERNA ─────────────────────────────────────────
        ctx.save();
        ctx.shadowBlur = 40;
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(cx, cy, wallR + 4, 0, Math.PI*2); ctx.fill();
        ctx.restore();

        // ── 1. CHÃO ESCURO (dentro do anel verde) ─────────────────────
        const floorGrad = ctx.createRadialGradient(cx, cy - 30, 10, cx, cy, playR);
        floorGrad.addColorStop(0,   '#1a1f2a');
        floorGrad.addColorStop(0.45,'#0f1318');
        floorGrad.addColorStop(1,   '#0a0d12');
        ctx.fillStyle = floorGrad;
        ctx.beginPath(); ctx.arc(cx, cy, playR, 0, Math.PI*2); ctx.fill();

        // Anéis concêntricos sutis no chão
        for (let r = 30; r < playR; r += 28) {
          ctx.save();
          ctx.strokeStyle = 'rgba(255,255,255,0.025)';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke();
          ctx.restore();
        }

        // ── 2. CÍRCULO BRANCO CENTRAL ─────────────────────────────────
        const whiteRingR = zones.innerSlope - 20; // ~90px
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.75)';
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(255,255,255,0.4)';
        ctx.beginPath(); ctx.arc(cx, cy, whiteRingR, 0, Math.PI*2); ctx.stroke();
        ctx.restore();

        // ── 3. ANEL VERDE — multicamadas 3D ──────────────────────────
        // Camada base escura (sombra do anel)
        ctx.save();
        ctx.strokeStyle = '#1a5500';
        ctx.lineWidth = greenW + 6;
        ctx.beginPath(); ctx.arc(cx, cy, wallR - greenW/2, 0, Math.PI*2); ctx.stroke();
        ctx.restore();

        // Camada principal verde
        const greenGrad = ctx.createRadialGradient(cx, cy, playR - 4, cx, cy, wallR + 2);
        greenGrad.addColorStop(0,    '#6aee38');
        greenGrad.addColorStop(0.25, '#4dc820');
        greenGrad.addColorStop(0.55, '#3aaa0e');
        greenGrad.addColorStop(0.82, '#2a8800');
        greenGrad.addColorStop(1,    '#1a5800');
        ctx.save();
        ctx.strokeStyle = greenGrad;
        ctx.lineWidth = greenW;
        ctx.beginPath(); ctx.arc(cx, cy, wallR - greenW/2, 0, Math.PI*2); ctx.stroke();
        ctx.restore();

        // Brilho interno (borda interior do anel - mais clara)
        ctx.save();
        ctx.strokeStyle = 'rgba(140,255,80,0.55)';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(100,255,50,0.4)';
        ctx.beginPath(); ctx.arc(cx, cy, playR + 2, 0, Math.PI*2); ctx.stroke();
        ctx.restore();

        // Brilho externo (borda exterior do anel)
        ctx.save();
        ctx.strokeStyle = 'rgba(30,90,5,0.8)';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(cx, cy, wallR - 2, 0, Math.PI*2); ctx.stroke();
        ctx.restore();

        // Reflexo de luz (arco no topo-esquerdo)
        ctx.save();
        ctx.globalAlpha = 0.28;
        ctx.strokeStyle = '#b0ff80';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#80ff40';
        ctx.beginPath();
        ctx.arc(cx, cy, wallR - greenW/2, Math.PI * 1.1, Math.PI * 1.65);
        ctx.stroke();
        ctx.restore();

        // ── 4. POCKETS ────────────────────────────────────────────────
        ARENA.exits.forEach((exit) => {
          const angle    = exit.angle;
          const halfArc  = (exit.width / 25) * 0.34;
          const pW       = 44; // largura do bolso em px
          const pD       = 52; // profundidade
          const pInner   = wallR - 4;
          const pOuter   = wallR + pD;

          // Buraco no anel verde (corta o verde)
          ctx.save();
          ctx.globalCompositeOperation = 'destination-out';
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(cx, cy, wallR + 2, angle - halfArc * 1.05, angle + halfArc * 1.05);
          ctx.arc(cx, cy, playR + 1, angle + halfArc * 1.05, angle - halfArc * 1.05, true);
          ctx.closePath();
          ctx.fill();
          ctx.restore();

          // Corpo do pocket — retângulo apontando para fora
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(angle);

          // Fundo escuro do bolso
          const bGrad = ctx.createLinearGradient(pInner, 0, pOuter, 0);
          bGrad.addColorStop(0, '#1c2230');
          bGrad.addColorStop(0.4, '#151a24');
          bGrad.addColorStop(1, '#0a0d12');
          ctx.fillStyle = bGrad;
          ctx.beginPath();
          ctx.rect(pInner, -pW/2, pOuter - pInner, pW);
          ctx.fill();

          // Frame metálico do bolso
          ctx.strokeStyle = '#2e3d52';
          ctx.lineWidth = 2;
          ctx.shadowBlur = 0;
          ctx.beginPath();
          ctx.rect(pInner, -pW/2, pOuter - pInner, pW);
          ctx.stroke();

          // Destaque interno (parte mais clara da abertura)
          const hiGrad = ctx.createLinearGradient(pInner, -pW/2, pInner, pW/2);
          hiGrad.addColorStop(0, 'rgba(80,110,150,0.3)');
          hiGrad.addColorStop(0.5, 'rgba(40,60,90,0.1)');
          hiGrad.addColorStop(1, 'rgba(80,110,150,0.3)');
          ctx.fillStyle = hiGrad;
          ctx.fillRect(pInner, -pW/2, 12, pW);

          // 4 parafusos nos cantos
          const boltR = 4;
          const boltMargin = 7;
          [[pInner + boltMargin, -pW/2 + boltMargin],
           [pInner + boltMargin,  pW/2 - boltMargin],
           [pOuter - boltMargin, -pW/2 + boltMargin],
           [pOuter - boltMargin,  pW/2 - boltMargin]].forEach(([bx, by]) => {
            // Base do parafuso
            ctx.fillStyle = '#1a2333';
            ctx.beginPath(); ctx.arc(bx, by, boltR + 1, 0, Math.PI*2); ctx.fill();
            // Cabeça do parafuso
            const boltGrad = ctx.createRadialGradient(bx - 1, by - 1, 0, bx, by, boltR);
            boltGrad.addColorStop(0, '#aabbcc');
            boltGrad.addColorStop(0.6, '#6688aa');
            boltGrad.addColorStop(1, '#334455');
            ctx.fillStyle = boltGrad;
            ctx.beginPath(); ctx.arc(bx, by, boltR, 0, Math.PI*2); ctx.fill();
            // Cruz do parafuso
            ctx.strokeStyle = 'rgba(0,0,0,0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(bx - 2.5, by); ctx.lineTo(bx + 2.5, by); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(bx, by - 2.5); ctx.lineTo(bx, by + 2.5); ctx.stroke();
          });

          ctx.restore();

          // ── GRACE DOOR — dentro do anel verde ──────────────────
          if (!ARENA.exitsOpen || doorOpenProgress < 1) {
            const doorAlpha = ARENA.exitsOpen
              ? Math.max(0, 1 - doorOpenProgress * 2.5)
              : 1.0;

            if (doorAlpha > 0.02) {
              // Duas metades da porta saem pelas bordas
              const pull = doorOpenProgress * halfArc * 2.8;
              const doorR = wallR - greenW/2; // raio central do anel verde

              ctx.save();
              ctx.globalAlpha = doorAlpha;
              ctx.lineCap = 'round';

              // Fundo amarelo (aviso)
              ctx.strokeStyle = '#ffcc00';
              ctx.lineWidth = 11;
              ctx.shadowBlur = 0;
              ctx.beginPath();
              ctx.arc(cx, cy, doorR, angle - halfArc, angle - pull, false);
              ctx.stroke();
              ctx.beginPath();
              ctx.arc(cx, cy, doorR, angle + pull, angle + halfArc, false);
              ctx.stroke();

              // Sobreposição vermelha
              ctx.strokeStyle = '#dd1800';
              ctx.lineWidth = 8;
              ctx.shadowBlur = 12;
              ctx.shadowColor = '#ff2200';
              ctx.beginPath();
              ctx.arc(cx, cy, doorR, angle - halfArc, angle - pull, false);
              ctx.stroke();
              ctx.beginPath();
              ctx.arc(cx, cy, doorR, angle + pull, angle + halfArc, false);
              ctx.stroke();

              // Linha de aviso branca no centro
              ctx.strokeStyle = 'rgba(255,255,255,0.6)';
              ctx.lineWidth = 1.5;
              ctx.shadowBlur = 0;
              ctx.beginPath();
              ctx.arc(cx, cy, doorR, angle - halfArc, angle - pull, false);
              ctx.stroke();
              ctx.beginPath();
              ctx.arc(cx, cy, doorR, angle + pull, angle + halfArc, false);
              ctx.stroke();

              ctx.restore();

              // Partículas ao abrir
              if (ARENA.exitsOpen && doorOpenProgress < 0.35 && Math.random() < 0.7) {
                const ba = angle + (Math.random() - 0.5) * halfArc * 2;
                const br = wallR - greenW/2 + (Math.random() - 0.5) * greenW;
                addParticle(cx + Math.cos(ba)*br, cy + Math.sin(ba)*br, '#ff4400', 5);
                addParticle(cx + Math.cos(ba)*br, cy + Math.sin(ba)*br, '#ffcc00', 3);
              }
            }
          }

          // Glow vermelho após abertura
          if (ARENA.exitsOpen && doorOpenProgress > 0.3) {
            const openA = Math.min(1, (doorOpenProgress - 0.3) / 0.4);
            ctx.save();
            ctx.globalAlpha = openA * (0.55 + Math.sin(t * 0.008) * 0.3);
            ctx.strokeStyle = '#ff2200';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 16;
            ctx.shadowColor = '#ff4400';
            ctx.beginPath();
            ctx.arc(cx, cy, playR + 2, angle - halfArc, angle + halfArc);
            ctx.stroke();
            ctx.restore();
          }

          // Badge countdown / OPEN
          const lDist = wallR + 56;
          const lx = cx + Math.cos(angle) * lDist;
          const ly = cy + Math.sin(angle) * lDist;
          ctx.save();
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          if (!ARENA.exitsOpen) {
            const tLeft = (ARENA.exitsOpenTime - currentBattleTime).toFixed(1);
            ctx.fillStyle = 'rgba(0,0,0,0.75)';
            ctx.fillRect(lx - 26, ly - 9, 52, 18);
            ctx.strokeStyle = '#dd1800';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(lx - 26, ly - 9, 52, 18);
            ctx.fillStyle = '#ff8866';
            ctx.fillText('\uD83D\uDD12 ' + tLeft + 's', lx, ly);
          } else if (doorOpenProgress < 1) {
            ctx.fillStyle = 'rgba(255,140,0,0.95)';
            ctx.fillText('\uD83D\uDCA5 OPEN!', lx, ly);
          }
          ctx.restore();
        });

        // ── 5. BORDAS FINAIS E HUD ────────────────────────────────────

        // Anel de aviso vermelho pulsante (só quando bey está perto)
        const b1d = Math.sqrt((b1.x - cx)**2 + (b1.y - cy)**2);
        const b2d = Math.sqrt((b2.x - cx)**2 + (b2.y - cy)**2);
        const nearWall = Math.min(b1d, b2d) > playR - 20;
        if (nearWall) {
          const pa = 0.3 + Math.sin(t * 0.012) * 0.2;
          ctx.save();
          ctx.globalAlpha = pa;
          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = 2;
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#ff0000';
          ctx.beginPath(); ctx.arc(cx, cy, playR - 2, 0, Math.PI*2); ctx.stroke();
          ctx.restore();
        }

        // Arena name
        ctx.fillStyle = 'rgba(255,255,255,0.88)';
        ctx.font = 'bold 17px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ARENA.name, cx, cy - wallR - 28);

        // Subtítulo
        const subLabel = ARENA.exitsOpen
          ? '\u26A1 POCKETS ACTIVE — RING OUT \u26A1'
          : `\uD83D\uDD12 POCKETS OPEN IN ${Math.max(0, ARENA.exitsOpenTime - currentBattleTime).toFixed(1)}s`;
        ctx.fillStyle = ARENA.exitsOpen ? 'rgba(255,80,50,0.9)' : 'rgba(180,200,255,0.75)';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(subLabel, cx, cy - wallR - 11);

        return; // ← sai antes do renderer genérico
      }
      // ════════════════════════════════════════════════════════════════

      // ── LAYER 0: outer plate / wall ───────────────────────────────
      const wallGrad = ctx.createRadialGradient(cx, cy - 40, 60, cx, cy, zones.wall + 10);
      wallGrad.addColorStop(0,   '#2a3040');
      wallGrad.addColorStop(0.6, colors.wall || '#3a4556');
      wallGrad.addColorStop(1,   '#1a2030');
      ctx.fillStyle = wallGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, ensureFinite(zones.wall, 221), 0, Math.PI * 2);
      ctx.fill();

      // ── LAYER 1: outer slope ──────────────────────────────────────
      const outerGrad = ctx.createRadialGradient(cx, cy - 30, 40, cx, cy, zones.outerSlope);
      outerGrad.addColorStop(0,   '#3a4860');
      outerGrad.addColorStop(1,   colors.outer || '#4a5568');
      ctx.fillStyle = outerGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, ensureFinite(zones.outerSlope, 195), 0, Math.PI * 2);
      ctx.fill();

      // ── LAYER 2: tornado ridge — metallic band ────────────────────
      const ridgeGrad = ctx.createRadialGradient(cx, cy, zones.tornadoRidge - 18, cx, cy, zones.tornadoRidge + 8);
      ridgeGrad.addColorStop(0, '#505878');
      ridgeGrad.addColorStop(0.5, '#6a7a9a');
      ridgeGrad.addColorStop(1, colors.outer || '#4a5568');
      ctx.fillStyle = ridgeGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, ensureFinite(zones.tornadoRidge, 163), 0, Math.PI * 2);
      ctx.fill();

      // Ridge pulsing warning ring
      const pulseI = 0.45 + Math.sin(t * 0.005) * 0.28;
      ctx.save();
      ctx.globalAlpha = pulseI;
      ctx.strokeStyle = '#ffaa00';
      ctx.lineWidth = 6;
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#ff7700';
      ctx.beginPath();
      ctx.arc(cx, cy, zones.tornadoRidge, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = pulseI * 0.5;
      ctx.strokeStyle = '#ff6600';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, zones.tornadoRidge - 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // ── LAYER 3: inner slope ──────────────────────────────────────
      const innerGrad = ctx.createRadialGradient(cx, cy - 20, 20, cx, cy, zones.innerSlope);
      innerGrad.addColorStop(0, '#4a5870');
      innerGrad.addColorStop(1, colors.inner || '#5a6b7f');
      ctx.fillStyle = innerGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, ensureFinite(zones.innerSlope, 104), 0, Math.PI * 2);
      ctx.fill();

      // ── LAYER 4: center bowl — deep concave look ──────────────────
      const centerGrad = ctx.createRadialGradient(cx - 8, cy - 10, 0, cx, cy, zones.centerBowl);
      centerGrad.addColorStop(0,   '#8a9ab8');
      centerGrad.addColorStop(0.4, colors.center || '#6a7b8f');
      centerGrad.addColorStop(1,   colors.inner  || '#5a6b7f');
      ctx.fillStyle = centerGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, ensureFinite(zones.centerBowl, 39), 0, Math.PI * 2);
      ctx.fill();

      // ── HEX TILE GRID — confined within wall radius ───────────────
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, zones.wall - 2, 0, Math.PI * 2);
      ctx.clip();

      const hexSize = 18;
      const hexH    = hexSize * Math.sqrt(3);
      const hexCols = Math.ceil((zones.wall * 2) / (hexSize * 1.5)) + 2;
      const hexRows = Math.ceil((zones.wall * 2) / hexH) + 2;
      const startX  = cx - zones.wall - hexSize;
      const startY  = cy - zones.wall - hexH;

      for (let row = 0; row < hexRows; row++) {
        for (let col = 0; col < hexCols; col++) {
          const hx = startX + col * hexSize * 1.5;
          const hy = startY + row * hexH + (col % 2 === 0 ? 0 : hexH / 2);
          const dist = Math.sqrt((hx - cx) ** 2 + (hy - cy) ** 2);
          if (dist > zones.wall + hexSize) continue;

          // Brightness varies with distance from center — inner tiles brighter
          const brightness = 1 - dist / (zones.wall * 1.1);
          const hexAlpha = 0.055 + brightness * 0.04;

          ctx.globalAlpha = hexAlpha;
          ctx.strokeStyle = 'rgba(180,200,255,1)';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          for (let v = 0; v < 6; v++) {
            const va = (Math.PI / 3) * v - Math.PI / 6;
            const vx = hx + hexSize * 0.92 * Math.cos(va);
            const vy = hy + hexSize * 0.92 * Math.sin(va);
            if (v === 0) ctx.moveTo(vx, vy); else ctx.lineTo(vx, vy);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
      ctx.restore();
      ctx.globalAlpha = 1;

      // ── RADIAL LINES — subtle depth indicator ─────────────────────
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, zones.wall - 1, 0, Math.PI * 2);
      ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 24; i++) {
        const a = (Math.PI * 2 / 24) * i;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 22, cy + Math.sin(a) * 22);
        ctx.lineTo(cx + Math.cos(a) * (zones.wall - 4), cy + Math.sin(a) * (zones.wall - 4));
        ctx.stroke();
      }
      ctx.restore();

      // ── SWEET SPOTS ───────────────────────────────────────────────
      if (ARENA.sweetSpots) {
        ARENA.sweetSpots.forEach((spot, idx) => {
          const sx = cx + Math.cos(spot.angle) * spot.radius;
          const sy = cy + Math.sin(spot.angle) * spot.radius;
          const sp = 0.5 + Math.sin(t * 0.004 + idx * 2.1) * 0.35;
          ctx.save();
          ctx.shadowBlur  = 12 * sp;
          ctx.shadowColor = '#00ff88';
          ctx.strokeStyle = `rgba(0,255,136,${sp * 0.7})`;
          ctx.lineWidth   = 1.5;
          ctx.beginPath(); ctx.arc(sx, sy, 10, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.arc(sx, sy, 16, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
        });
      }

      // ── POCKETS + GRACE DOORS (BB10_COMPETITIVE) ─────────────────
      if (ARENA.exits.length > 0) {
        const currentBattleTime = (Date.now() - battleStartTimeRef.current) / 1000;
        if (!ARENA.exitsOpen && currentBattleTime >= ARENA.exitsOpenTime) ARENA.exitsOpen = true;

        const cx = centerX;
        const cy = centerY;
        const wallR = zones.wall;
        const t = Date.now();

        // Animação da porta: 0 = fechada, 1 = totalmente aberta
        const doorAnimDuration = 0.55;
        let doorOpenProgress = 0;
        if (ARENA.exitsOpen) {
          const timeSinceOpen = currentBattleTime - ARENA.exitsOpenTime;
          doorOpenProgress = Math.min(1, timeSinceOpen / doorAnimDuration);
        }

        ARENA.exits.forEach((exit) => {
          const angle = exit.angle;
          const halfArcRad = (exit.width / 25) * 0.32;

          // ── POCKET BODY — trapézio projetado para fora ───────────
          const pocketDepth = 50;
          const outerR = wallR + pocketDepth;

          const leftAngle  = angle - halfArcRad * 1.3;
          const rightAngle = angle + halfArcRad * 1.3;
          const leftInner  = { x: cx + Math.cos(leftAngle)  * wallR,   y: cy + Math.sin(leftAngle)  * wallR };
          const rightInner = { x: cx + Math.cos(rightAngle) * wallR,   y: cy + Math.sin(rightAngle) * wallR };
          const leftOuter  = { x: cx + Math.cos(leftAngle  + 0.03) * outerR, y: cy + Math.sin(leftAngle  + 0.03) * outerR };
          const rightOuter = { x: cx + Math.cos(rightAngle - 0.03) * outerR, y: cy + Math.sin(rightAngle - 0.03) * outerR };
          const tipOuter   = { x: cx + Math.cos(angle) * (outerR + 8), y: cy + Math.sin(angle) * (outerR + 8) };

          // Fundo escuro do pocket
          ctx.save();
          ctx.shadowBlur = 18;
          ctx.shadowColor = 'rgba(0,0,0,0.9)';
          ctx.fillStyle = '#06060c';
          ctx.beginPath();
          ctx.moveTo(leftInner.x, leftInner.y);
          ctx.lineTo(leftOuter.x, leftOuter.y);
          ctx.lineTo(tipOuter.x,  tipOuter.y);
          ctx.lineTo(rightOuter.x, rightOuter.y);
          ctx.lineTo(rightInner.x, rightInner.y);
          ctx.arc(cx, cy, wallR, rightAngle, leftAngle, true);
          ctx.closePath();
          ctx.fill();
          ctx.restore();

          // Borda metálica do pocket
          ctx.save();
          ctx.strokeStyle = ARENA.exitsOpen ? '#8a1010' : '#3a4060';
          ctx.lineWidth = 2.5;
          ctx.shadowBlur = ARENA.exitsOpen ? 10 : 4;
          ctx.shadowColor = ARENA.exitsOpen ? '#ff2200' : '#2244aa';
          ctx.beginPath();
          ctx.moveTo(leftInner.x, leftInner.y);
          ctx.lineTo(leftOuter.x, leftOuter.y);
          ctx.lineTo(tipOuter.x,  tipOuter.y);
          ctx.lineTo(rightOuter.x, rightOuter.y);
          ctx.lineTo(rightInner.x, rightInner.y);
          ctx.stroke();
          ctx.restore();

          // ── GRACE DOOR — arco vermelho que se afasta quando abre ─
          if (!ARENA.exitsOpen || doorOpenProgress < 1) {
            const doorAlpha = ARENA.exitsOpen
              ? Math.max(0, 1 - doorOpenProgress * 2.2)
              : 1.0;

            if (doorAlpha > 0) {
              const pullLeft  = doorOpenProgress * halfArcRad * 2.5;
              const pullRight = doorOpenProgress * halfArcRad * 2.5;

              ctx.save();
              ctx.globalAlpha = doorAlpha;
              ctx.lineWidth = 6;
              ctx.lineCap = 'round';
              ctx.strokeStyle = (ARENA.colors && ARENA.colors.door) || '#cc2200';
              ctx.shadowBlur = 16;
              ctx.shadowColor = (ARENA.colors && ARENA.colors.doorGlow) || '#ff4400';
              // Metade esquerda desliza para esquerda
              ctx.beginPath();
              ctx.arc(cx, cy, wallR, angle - halfArcRad, angle - pullLeft, false);
              ctx.stroke();
              // Metade direita desliza para direita
              ctx.beginPath();
              ctx.arc(cx, cy, wallR, angle + pullRight, angle + halfArcRad, false);
              ctx.stroke();
              ctx.restore();

              // Parafusos nas extremidades
              [angle - halfArcRad, angle + halfArcRad].forEach(a => {
                const px = cx + Math.cos(a) * wallR;
                const py = cy + Math.sin(a) * wallR;
                ctx.save();
                ctx.globalAlpha = doorAlpha * 0.85;
                ctx.fillStyle = '#ffaa44';
                ctx.shadowBlur = 8;
                ctx.shadowColor = '#ff6600';
                ctx.beginPath();
                ctx.arc(px, py, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
              });
            }

            // Partículas de explosão ao abrir
            if (ARENA.exitsOpen && doorOpenProgress < 0.3 && Math.random() < 0.6) {
              const burstAngle = angle + (Math.random() - 0.5) * halfArcRad * 2;
              const burstR = wallR + Math.random() * 20;
              addParticle(cx + Math.cos(burstAngle) * burstR, cy + Math.sin(burstAngle) * burstR, '#ff4400', 6);
              addParticle(cx + Math.cos(burstAngle) * burstR, cy + Math.sin(burstAngle) * burstR, '#ffaa00', 4);
            }
          }

          // ── ABERTURA PÓS-PORTA: corte na parede + danger glow ────
          if (ARENA.exitsOpen && doorOpenProgress > 0.2) {
            const openAlpha = Math.min(1, (doorOpenProgress - 0.2) / 0.5);

            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.globalAlpha = openAlpha;
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, wallR + 5, angle - halfArcRad, angle + halfArcRad);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.globalAlpha = openAlpha * (0.6 + Math.sin(t * 0.008) * 0.3);
            ctx.strokeStyle = '#ff2200';
            ctx.lineWidth = 3.5;
            ctx.shadowBlur = 14;
            ctx.shadowColor = '#ff4400';
            ctx.beginPath();
            ctx.arc(cx, cy, wallR + 1, angle - halfArcRad, angle + halfArcRad);
            ctx.stroke();
            ctx.restore();
          }

          // ── LABEL DE COUNTDOWN / STATUS ──────────────────────────
          const labelDist = wallR + 68;
          const labelX = cx + Math.cos(angle) * labelDist;
          const labelY = cy + Math.sin(angle) * labelDist;
          ctx.save();
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          if (!ARENA.exitsOpen) {
            const timeLeft = (ARENA.exitsOpenTime - currentBattleTime).toFixed(1);
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(labelX - 28, labelY - 9, 56, 18);
            ctx.strokeStyle = '#cc2200';
            ctx.lineWidth = 1;
            ctx.strokeRect(labelX - 28, labelY - 9, 56, 18);
            ctx.fillStyle = '#ff6644';
            ctx.fillText(`\u{1F512} ${timeLeft}s`, labelX, labelY);
          } else if (doorOpenProgress < 1) {
            ctx.fillStyle = 'rgba(255,120,0,0.9)';
            ctx.fillText('\u{1F4A5} OPEN!', labelX, labelY);
          }
          ctx.restore();
        });
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
      const ringTime = Date.now() * 0.001;
      const pulseSpeed = 2 + (1 - dangerProximity) * 6;
      const ringAlpha = 0.4 + Math.sin(ringTime * pulseSpeed) * 0.35;
      const ringWidth = 4 + (1 - dangerProximity) * 6;
      
      ctx.save();
      ctx.shadowBlur = 15 + (1 - dangerProximity) * 20;
      ctx.shadowColor = '#ff0000';
      ctx.strokeStyle = `rgba(255, 0, 0, ${ringAlpha})`;
      ctx.lineWidth = ringWidth;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.wall - 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      
      // ── RING-OUT SPEED INDICATOR ──
      [[b1, bey1], [b2, bey2]].forEach(([b, bey], idx) => {
        if (!b.alive) return;
        const bDist = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
        if (bDist > zones.outerSlope) {
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
          
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(labelX - 45, labelY + 2, 90, 8);
          const barColor = dangerPct > 0.8 ? '#ff0000' : dangerPct > 0.5 ? '#ff6600' : '#ffd700';
          ctx.fillStyle = barColor;
          ctx.fillRect(labelX - 45, labelY + 2, 90 * dangerPct, 8);
          
          if (dangerPct > 0.85) {
            ctx.globalAlpha = 0.3 + Math.sin(ringTime * 12) * 0.25;
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
      
      // Warning text
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
        const pulseIntensity = portal.active ? (0.6 + Math.sin(Date.now() * 0.006) * 0.4) : 0.15;
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
        ctx.rotate(Date.now() * rotationSpeed);
        
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
        const innerScale = portal.active ? 0.6 + Math.sin(Date.now() * 0.004) * 0.1 : 0.5;
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
            const swirlAngle = (Math.PI * 2 / 4) * i + Date.now() * 0.003;
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
        const currentTime = Date.now() / 1000;
        
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
      const zones = ARENA.zones;
      const hs    = ARENA.heatSystem    || {};
      const er    = ARENA.eruptionEvent || {};
      const fs    = ARENA.fissureSystem || {};
      const rivers = ARENA.lavaRivers   || {};
      const time  = Date.now() * 0.001;
      if (!zones) return;

      const R_CORE = zones.magmaCore    ?? 50;
      const R_LAVA = zones.lavaFlowRing ?? 140;
      const R_OBS  = zones.obsidianBelt ?? 190;
      const R_WALL = zones.wall         ?? 221;

      const cx = ensureFinite(500, 500);
      const cy = ensureFinite(350, 350);

      const heatPct = Math.max(0, Math.min(1, (hs.level || 0) / (hs.maxLevel || 100)));
      const riverAngle = time * (rivers.rotationSpeed || 0.18); // ângulo atual dos rios

      // ── 1. SOMBRA E BASE EXTERIOR ─────────────────────────────────
      ctx.save();
      ctx.shadowBlur = 60;
      ctx.shadowColor = `rgba(200,50,0,${0.5 + heatPct * 0.4})`;
      ctx.fillStyle = '#080002';
      ctx.beginPath(); ctx.arc(cx, cy, R_WALL + 6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      // ── 2. CRATER EDGE (r190–221) — rocha vulcânica espessa ───────
      {
        ctx.save();
        const craterGrad = ctx.createRadialGradient(cx, cy, R_OBS - 5, cx, cy, R_WALL + 3);
        craterGrad.addColorStop(0,   '#3a1010');
        craterGrad.addColorStop(0.4, '#220808');
        craterGrad.addColorStop(0.85,'#140404');
        craterGrad.addColorStop(1,   '#080001');
        ctx.fillStyle = craterGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, R_WALL + 3, 0, Math.PI * 2);
        ctx.arc(cx, cy, R_OBS, 0, Math.PI * 2, true);
        ctx.fill();
        // Rachaduras incandescentes na rocha
        for (let i = 0; i < 22; i++) {
          const a = (Math.PI * 2 / 22) * i + 0.15;
          const inten = 0.2 + Math.sin(time * 0.7 + i * 1.3) * 0.15;
          const len   = 6 + Math.sin(i * 5.7) * 4;
          ctx.save();
          ctx.globalAlpha = inten;
          ctx.strokeStyle = i % 5 === 0 ? '#ff5500' : '#cc2200';
          ctx.lineWidth   = 0.8;
          ctx.shadowBlur  = 5; ctx.shadowColor = '#ff2200';
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * R_OBS, cy + Math.sin(a) * R_OBS);
          ctx.lineTo(cx + Math.cos(a) * (R_OBS + len), cy + Math.sin(a) * (R_OBS + len));
          ctx.stroke();
          ctx.restore();
        }
        // Anel interior brilhante
        ctx.save();
        ctx.globalAlpha = 0.45 + heatPct * 0.35;
        ctx.strokeStyle = '#cc2200'; ctx.lineWidth = 2;
        ctx.shadowBlur = 8; ctx.shadowColor = '#ff3300';
        ctx.beginPath(); ctx.arc(cx, cy, R_OBS + 1, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        ctx.restore();
      }

      // ── 3. OBSIDIAN BELT (r140–190) — pedra polida roxa ───────────
      {
        ctx.save();
        const obsGrad = ctx.createRadialGradient(cx, cy, R_LAVA, cx, cy, R_OBS);
        obsGrad.addColorStop(0,   '#220d20');
        obsGrad.addColorStop(0.45,'#160810');
        obsGrad.addColorStop(0.8, '#200a1e');
        obsGrad.addColorStop(1,   '#100508');
        ctx.fillStyle = obsGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, R_OBS, 0, Math.PI * 2);
        ctx.arc(cx, cy, R_LAVA, 0, Math.PI * 2, true);
        ctx.fill();
        // Fluxo orbital animado (sugere a corrente)
        for (let i = 0; i < 3; i++) {
          const flowA = time * 0.4 + (Math.PI * 2 / 3) * i;
          const flowR = R_LAVA + (R_OBS - R_LAVA) * 0.5;
          const arcLen = Math.PI * 0.55;
          ctx.save();
          ctx.globalAlpha = 0.18 + Math.sin(time * 0.8 + i * 2) * 0.08;
          ctx.strokeStyle = '#9933bb'; ctx.lineWidth = 8;
          ctx.shadowBlur = 10; ctx.shadowColor = '#aa22dd';
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(cx, cy, flowR, flowA, flowA + arcLen);
          ctx.stroke();
          ctx.restore();
        }
        // Cristais de obsidiana
        for (let i = 0; i < 24; i++) {
          const a  = (Math.PI * 2 / 24) * i + 0.3;
          const r  = R_LAVA + 12 + (i % 4) * 10;
          const sz = 2 + (i % 3);
          const bri = 0.25 + Math.sin(time * 0.9 + i * 1.1) * 0.12;
          ctx.save();
          ctx.globalAlpha = bri;
          ctx.fillStyle   = i % 5 === 0 ? '#cc55ee' : '#441144';
          ctx.shadowBlur  = 5; ctx.shadowColor = '#9922cc';
          ctx.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
          ctx.rotate(a);
          ctx.beginPath();
          ctx.moveTo(0, -sz * 1.6); ctx.lineTo(sz, sz); ctx.lineTo(-sz, sz);
          ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        // Label sutil
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle   = '#cc88ff';
        ctx.font        = '9px sans-serif';
        ctx.textAlign   = 'center';
        ctx.fillText('OBSIDIAN BELT', cx, cy - (R_LAVA + (R_OBS - R_LAVA) / 2) + 3);
        ctx.restore();
        ctx.restore();
      }

      // ── 4. LAVA RIVER RING (r50–140) ─────────────────────────────
      {
        ctx.save();
        // Base: rocha vulcânica escura
        const lavaBaseGrad = ctx.createRadialGradient(cx, cy, R_CORE, cx, cy, R_LAVA);
        lavaBaseGrad.addColorStop(0,   '#5a1200');
        lavaBaseGrad.addColorStop(0.4, '#3d0c00');
        lavaBaseGrad.addColorStop(1,   '#250600');
        ctx.fillStyle = lavaBaseGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, R_LAVA, 0, Math.PI * 2);
        ctx.arc(cx, cy, R_CORE, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.restore();

        // 3 RIOS DE LAVA ROTATIVOS — desenhados como sectores luminosos
        const armCount = rivers.count || 3;
        const armHalfDeg = (rivers.armWidth || 28) / 2;
        const armHalfRad = armHalfDeg * Math.PI / 180;

        for (let i = 0; i < armCount; i++) {
          const armCenter = riverAngle + (Math.PI * 2 / armCount) * i;
          const startA    = armCenter - armHalfRad;
          const endA      = armCenter + armHalfRad;

          ctx.save();
          // Glow externo do rio
          ctx.globalAlpha = 0.55 + Math.sin(time * 2.5 + i * 2.1) * 0.2;
          const lavaGlow = ctx.createRadialGradient(cx, cy, R_CORE, cx, cy, R_LAVA);
          lavaGlow.addColorStop(0,   '#ff9900');
          lavaGlow.addColorStop(0.35,'#ff4400');
          lavaGlow.addColorStop(0.7, '#cc1a00');
          lavaGlow.addColorStop(1,   'rgba(80,0,0,0)');
          ctx.fillStyle = lavaGlow;
          ctx.shadowBlur = 20; ctx.shadowColor = '#ff4400';
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, R_LAVA, startA, endA);
          ctx.closePath();
          ctx.fill();

          // Núcleo brilhante do rio (mais estreito e mais quente)
          const coreHalf = armHalfRad * 0.45;
          ctx.globalAlpha = 0.75 + Math.sin(time * 4 + i * 1.7) * 0.2;
          const coreGlow = ctx.createRadialGradient(cx, cy, R_CORE + 5, cx, cy, R_LAVA - 10);
          coreGlow.addColorStop(0,   '#ffee88');
          coreGlow.addColorStop(0.5, '#ff8800');
          coreGlow.addColorStop(1,   'rgba(200,40,0,0)');
          ctx.fillStyle = coreGlow;
          ctx.shadowBlur = 30; ctx.shadowColor = '#ffcc00';
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, R_LAVA, armCenter - coreHalf, armCenter + coreHalf);
          ctx.closePath();
          ctx.fill();

          ctx.restore();
        }

        // Bolhas de lava entre os rios
        for (let i = 0; i < 10; i++) {
          const bubA = time * 0.3 + i * 0.63;
          const bubR = R_CORE + 12 + (i % 5) * 18;
          const bSize = 3 + (i % 3) * 2;
          const balpha = 0.15 + Math.sin(time * 2.8 + i * 1.5) * 0.12;
          ctx.save();
          ctx.globalAlpha = balpha;
          ctx.fillStyle   = '#ff5500';
          ctx.shadowBlur  = 6; ctx.shadowColor = '#ff3300';
          ctx.beginPath();
          ctx.arc(cx + Math.cos(bubA) * bubR, cy + Math.sin(bubA) * bubR, bSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // ── 5. MAGMA CORE (r0–50) — centro fundido ────────────────────
      {
        ctx.save();
        const pulse = Math.sin(time * (3.5 + heatPct * 5)) * 0.35 + 0.65;
        const coreGrad = ctx.createRadialGradient(cx - 8, cy - 8, 0, cx, cy, R_CORE);
        coreGrad.addColorStop(0,    '#ffffff');
        coreGrad.addColorStop(0.12, `rgba(255,${Math.floor(220 + heatPct * 35)},0,1)`);
        coreGrad.addColorStop(0.4,  '#ff7700');
        coreGrad.addColorStop(0.75, '#cc2200');
        coreGrad.addColorStop(1,    '#7a1000');
        ctx.fillStyle = coreGrad;
        ctx.shadowBlur = 35 + heatPct * 25;
        ctx.shadowColor = '#ff4400';
        ctx.beginPath(); ctx.arc(cx, cy, R_CORE, 0, Math.PI * 2); ctx.fill();
        // Pulso extra com heat
        if (heatPct > 0.4) {
          ctx.globalAlpha = (heatPct - 0.4) * pulse * 0.7;
          ctx.fillStyle   = '#ffee00';
          ctx.shadowBlur  = 20; ctx.shadowColor = '#ffcc00';
          ctx.beginPath(); ctx.arc(cx, cy, R_CORE * 0.55, 0, Math.PI * 2); ctx.fill();
        }
        // Ponto central branco quente
        ctx.globalAlpha = 0.85 + Math.sin(time * 7) * 0.1;
        ctx.fillStyle   = '#ffffff';
        ctx.shadowBlur  = 18; ctx.shadowColor = '#ffeeaa';
        ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // ── 6. TIGELA: sombra de profundidade ─────────────────────────
      {
        ctx.save();
        const bowlShadow = ctx.createRadialGradient(cx - R_CORE * 0.25, cy - R_CORE * 0.25, 0, cx, cy, R_OBS);
        bowlShadow.addColorStop(0,    'rgba(255,160,60,0.06)');
        bowlShadow.addColorStop(0.3,  'rgba(0,0,0,0)');
        bowlShadow.addColorStop(0.65, 'rgba(0,0,0,0.10)');
        bowlShadow.addColorStop(1,    'rgba(0,0,0,0.42)');
        ctx.fillStyle = bowlShadow;
        ctx.beginPath(); ctx.arc(cx, cy, R_OBS, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // ── 7. LAVA BOMBS ativas ──────────────────────────────────────
      if (ARENA._lavaBombs && ARENA._lavaBombs.length > 0) {
        const currentTime = (Date.now() - battleStartTimeRef.current) / 1000;
        ARENA._lavaBombs.forEach(bm => {
          if (bm.hit) return;
          const age   = currentTime - bm.spawnTime;
          const life  = er.lavaBombs?.lifetime || 2.5;
          const alpha = Math.max(0, 1 - age / life);
          const pulse2 = Math.sin(currentTime * 10 + bm.x) * 0.3 + 0.7;
          ctx.save();
          ctx.globalAlpha = alpha * pulse2;
          ctx.fillStyle   = '#ff4400';
          ctx.shadowBlur  = 14; ctx.shadowColor = '#ff8800';
          ctx.beginPath(); ctx.arc(bm.x, bm.y, (er.lavaBombs?.radius || 25) * 0.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle   = '#ffcc00';
          ctx.shadowBlur  = 6;
          ctx.beginPath(); ctx.arc(bm.x, bm.y, 4, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        });
      }

      // ── 8. FISSURAS ROTATIVAS (Crater Edge) ───────────────────────
      if (fs.open) {
        const fissureAngle = fs.baseAngle || 0; // já atualizado pela física
        ctx.save();
        for (let i = 0; i < (fs.count || 2); i++) {
          const fa  = (fissureAngle + (Math.PI * 2 / (fs.count || 2)) * i) % (Math.PI * 2);
          const fw  = fs.width || 40;
          const x1  = cx + Math.cos(fa) * (R_OBS + 2);
          const y1  = cy + Math.sin(fa) * (R_OBS + 2);
          const x2  = cx + Math.cos(fa) * (R_WALL - 2);
          const y2  = cy + Math.sin(fa) * (R_WALL - 2);

          // Abismo
          ctx.strokeStyle = '#020000'; ctx.lineWidth = fw; ctx.lineCap = 'round';
          ctx.shadowBlur  = 0;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();

          // Lava profunda pulsando
          const gp = 0.6 + Math.sin(time * 5 + i * 2.3) * 0.35;
          ctx.globalAlpha = gp;
          ctx.strokeStyle = '#ff2200'; ctx.lineWidth = fw * 0.55;
          ctx.shadowBlur = 22; ctx.shadowColor = '#ff1100';
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();

          // Núcleo incandescente
          ctx.globalAlpha = gp * 0.85;
          ctx.strokeStyle = '#ffdd44'; ctx.lineWidth = fw * 0.15;
          ctx.shadowBlur = 12; ctx.shadowColor = '#ffcc00';
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();

          // Indicador de direção de rotação (seta sutil)
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          const arrowA = fa + Math.PI / 2; // perpendicular = direção de movimento
          ctx.globalAlpha = 0.3;
          ctx.fillStyle   = '#ffcc00'; ctx.shadowBlur = 0;
          ctx.save();
          ctx.translate(midX, midY);
          ctx.rotate(arrowA);
          ctx.beginPath();
          ctx.moveTo(0, -6); ctx.lineTo(4, 4); ctx.lineTo(-4, 4);
          ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      } else {
        // Antes de abrir: mostrar linhas de aviso pulsando
        const warnPulse = Math.sin(time * 4) * 0.5 + 0.5;
        ctx.save();
        for (let i = 0; i < (fs.count || 2); i++) {
          const fa = (Math.PI * 2 / (fs.count || 2)) * i;
          const x1 = cx + Math.cos(fa) * (R_OBS + 2);
          const y1 = cy + Math.sin(fa) * (R_OBS + 2);
          const x2 = cx + Math.cos(fa) * (R_WALL - 2);
          const y2 = cy + Math.sin(fa) * (R_WALL - 2);
          ctx.globalAlpha = warnPulse * 0.4;
          ctx.strokeStyle = '#ff4400'; ctx.lineWidth = 3;
          ctx.setLineDash([8, 6]);
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.restore();
      }

      // ── 9. HEAT METER (arco exterior aprimorado) ──────────────────
      {
        const heatColor = heatPct > 0.8 ? '#ff0000' : heatPct > 0.5 ? '#ff4400' : '#ff9900';
        ctx.save();
        ctx.lineCap = 'round';
        // Trilho
        ctx.globalAlpha = 0.2;
        ctx.strokeStyle = '#330300'; ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(cx, cy, R_WALL - 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2);
        ctx.stroke();
        // Arco de heat
        if (heatPct > 0) {
          ctx.globalAlpha = 0.92;
          ctx.strokeStyle = heatColor; ctx.lineWidth = 10;
          ctx.shadowBlur  = heatPct > 0.5 ? 16 : 5;
          ctx.shadowColor = heatColor;
          ctx.beginPath();
          ctx.arc(cx, cy, R_WALL - 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * heatPct);
          ctx.stroke();
          // Segmentos (25%, 50%, 75%)
          for (let seg = 1; seg < 4; seg++) {
            const sa = -Math.PI / 2 + Math.PI * 2 * (seg / 4);
            ctx.globalAlpha = 0.5; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(sa) * (R_WALL - 15), cy + Math.sin(sa) * (R_WALL - 15));
            ctx.lineTo(cx + Math.cos(sa) * (R_WALL - 5),  cy + Math.sin(sa) * (R_WALL - 5));
            ctx.stroke();
          }
        }
        // Texto heat
        ctx.globalAlpha = 1;
        ctx.fillStyle   = heatPct > 0.8 ? '#ff2200' : heatPct > 0.5 ? '#ff6600' : '#ffaa00';
        ctx.font        = 'bold 12px sans-serif';
        ctx.textAlign   = 'center';
        ctx.shadowBlur  = heatPct > 0.7 ? 12 : 0; ctx.shadowColor = '#ff3300';
        ctx.fillText(`🌡 ${Math.round(hs.level || 0)}%`, cx, cy - R_WALL - 13);
        ctx.restore();
      }

      // ── 10. ERUPTION EFFECT ───────────────────────────────────────
      if (er.active) {
        const eAge     = time - (er.startTime || 0);
        const eRatio   = Math.min(eAge / (er.duration || 0.6), 1);
        const intensity = 1 - eRatio * eRatio; // easing: cai rápido
        ctx.save();
        // Flash central explosivo
        ctx.globalAlpha = intensity * 0.85;
        const eGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R_OBS);
        eGrad.addColorStop(0,    '#ffffff');
        eGrad.addColorStop(0.08, '#ffee00');
        eGrad.addColorStop(0.3,  '#ff5500');
        eGrad.addColorStop(0.7,  'rgba(200,30,0,0.3)');
        eGrad.addColorStop(1,    'transparent');
        ctx.fillStyle = eGrad;
        ctx.beginPath(); ctx.arc(cx, cy, R_OBS, 0, Math.PI * 2); ctx.fill();
        // 16 raios explosivos — limitados ao Obsidian Belt
        for (let i = 0; i < 16; i++) {
          const ra = (Math.PI * 2 / 16) * i + eAge * 3;
          const rl = R_OBS * 0.85 * intensity;
          ctx.globalAlpha = intensity * 0.7;
          ctx.strokeStyle = i % 3 === 0 ? '#ffee00' : '#ff5500';
          ctx.lineWidth   = 1.5 + intensity * 5;
          ctx.shadowBlur  = 15; ctx.shadowColor = '#ff6600';
          ctx.lineCap     = 'round';
          ctx.beginPath(); ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(ra) * rl, cy + Math.sin(ra) * rl);
          ctx.stroke();
        }
        ctx.globalAlpha = intensity;
        ctx.fillStyle   = '#ffffff';
        ctx.font        = `bold ${18 + Math.floor(intensity * 6)}px sans-serif`;
        ctx.textAlign   = 'center';
        ctx.shadowBlur  = 25; ctx.shadowColor = '#ff0000';
        ctx.fillText('🌋 ERUPTION!', cx, cy - R_LAVA - 18);
        ctx.restore();
      } else if (heatPct >= 0.8) {
        const pulse = Math.sin(time * 8) * 0.5 + 0.5;
        ctx.save();
        ctx.globalAlpha = 0.4 + pulse * 0.55;
        ctx.fillStyle   = '#ff2200';
        ctx.font        = 'bold 13px sans-serif';
        ctx.textAlign   = 'center';
        ctx.shadowBlur  = 12; ctx.shadowColor = '#ff0000';
        ctx.fillText('⚠ ERUPTION INCOMING', cx, cy - R_LAVA - 14);
        ctx.restore();
      }

      // ── 11. NOME DA ARENA ─────────────────────────────────────────
      ctx.save();
      ctx.fillStyle = 'rgba(255,130,50,0.95)';
      ctx.font      = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 14; ctx.shadowColor = '#ff3300';
      ctx.fillText('🌋 VOLCANIC RAGE', cx, cy - R_WALL - 32);
      ctx.shadowBlur = 0;
      ctx.restore();
    }
    function drawPangeaPlatform() {
      // PANGEA PLATFORM: 6 tectonic plates + earthquakes + aftershocks + fissures
      const zones = ARENA.zones;
      const colors = ARENA.colors;
      const seismic = ARENA.seismic;
      const afs = seismic.aftershocks;
      const fis = seismic.fissures;
      const time = Date.now() * 0.001;
      if (!zones || !colors || !ARENA.plates) return;

      const cx = ensureFinite(500, 500);
      const cy = ensureFinite(350, 350);

      // Screen shake
      let shakeX = 0, shakeY = 0;
      if (seismic.active) {
        const si = seismic.intensity * 1.5;
        shakeX = (Math.random() - 0.5) * si;
        shakeY = (Math.random() - 0.5) * si;
      } else if (seismic.warningActive) {
        shakeX = (Math.random() - 0.5) * 2;
        shakeY = (Math.random() - 0.5) * 2;
      } else if (afs.currentAftershock > 0) {
        shakeX = (Math.random() - 0.5) * 4;
        shakeY = (Math.random() - 0.5) * 4;
      }

      ctx.save();
      ctx.translate(shakeX, shakeY);

      // Background
      ctx.fillStyle = '#1a2a0a';
      ctx.beginPath();
      ctx.arc(cx, cy, zones.wall, 0, Math.PI * 2);
      ctx.fill();

      const plateCount = ARENA.plates.length;
      const plateArc = (Math.PI * 2) / plateCount;

      ARENA.plates.forEach((plate, index) => {
        const startAngle = plate.currentAngle - plateArc / 2;
        const endAngle = plate.currentAngle + plateArc / 2;
        let plateColor = (colors.plates && colors.plates[index]) || '#4a6b2a';

        // Warning phase: plates pulse orange-red
        if (seismic.warningActive) {
          const warnPulse = 0.5 + Math.sin(time * 10) * 0.5;
          ctx.save();
          ctx.globalAlpha = warnPulse * 0.4;
          ctx.fillStyle = '#ff6600';
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, zones.plateZone, startAngle, endAngle);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        ctx.fillStyle = plateColor;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, zones.plateZone, startAngle, endAngle);
        ctx.closePath();
        ctx.fill();

        // Geological lines
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        for (let r = zones.centerStable + 20; r < zones.plateZone - 10; r += 22) {
          ctx.beginPath();
          ctx.arc(cx, cy, r, startAngle + 0.05, endAngle - 0.05);
          ctx.stroke();
        }

        // Fault line
        ctx.strokeStyle = colors.faultLine || '#8b4513';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(startAngle) * zones.centerStable, cy + Math.sin(startAngle) * zones.centerStable);
        ctx.lineTo(cx + Math.cos(startAngle) * zones.plateZone, cy + Math.sin(startAngle) * zones.plateZone);
        ctx.stroke();
        ctx.setLineDash([]);

        // Direction arrow
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
        ctx.moveTo(12, 0); ctx.lineTo(-6, -5); ctx.lineTo(-6, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });

      // ── FISSURES ──────────────────────────────────────────────────
      if (fis.activeFissures.length > 0) {
        fis.activeFissures.forEach(fissure => {
          const plate = ARENA.plates[fissure.plateIndex];
          if (!plate) return;
          const fissureAngle = (plate.currentAngle - (Math.PI / ARENA.plates.length) + Math.PI * 2) % (Math.PI * 2);
          const x1 = cx + Math.cos(fissureAngle) * zones.centerStable;
          const y1 = cy + Math.sin(fissureAngle) * zones.centerStable;
          const x2 = cx + Math.cos(fissureAngle) * zones.plateZone;
          const y2 = cy + Math.sin(fissureAngle) * zones.plateZone;
          // Dark gap
          ctx.save();
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = fis.fissureWidth;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          // Red glow
          ctx.globalAlpha = 0.6 + Math.sin(time * 12) * 0.4;
          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = fis.fissureWidth * 0.4;
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#ff0000';
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          ctx.restore();
        });
      }

      // Stable center
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

      // ── SEISMIC STATUS DISPLAY ────────────────────────────────────
      ctx.textAlign = 'center';
      if (seismic.warningActive) {
        const warnAlpha = 0.7 + Math.sin(time * 8) * 0.3;
        ctx.globalAlpha = warnAlpha;
        ctx.fillStyle = '#ffaa00';
        ctx.font = 'bold 22px sans-serif';
        ctx.shadowBlur = 20; ctx.shadowColor = '#ff6600';
        ctx.fillText('⚠️ TERREMOTO IMINENTE!', cx, cy - zones.wall + 22);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      } else if (seismic.active) {
        ctx.strokeStyle = colors.quake || '#ff6b6b';
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.4 + Math.sin(time * 25) * 0.4;
        ctx.beginPath(); ctx.arc(cx, cy, zones.plateZone * 0.7, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = colors.quake || '#ff6b6b';
        ctx.font = 'bold 22px sans-serif';
        ctx.shadowBlur = 15; ctx.shadowColor = '#ff0000';
        ctx.fillText('🌍 TERREMOTO!', cx, cy - zones.wall + 22);
        ctx.shadowBlur = 0;
        if (fis.activeFissures.length > 0) {
          ctx.fillStyle = '#ff4444';
          ctx.font = 'bold 14px sans-serif';
          ctx.fillText('⚡ FISSURA ABERTA!', cx, cy - zones.wall + 40);
        }
      } else if (afs.currentAftershock > 0 && afs.currentAftershock <= afs.count) {
        ctx.fillStyle = '#ffaa44';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(`💥 Réplica ${afs.currentAftershock}/${afs.count}`, cx, cy - zones.wall + 22);
      } else {
        const currentTime = Date.now() / 1000;
        const timeToNext = seismic.interval - (currentTime - seismic.lastQuakeTime);
        ctx.fillStyle = 'rgba(255,107,107,0.65)';
        ctx.font = '11px sans-serif';
        ctx.fillText(`💥 Terremoto em: ${Math.max(0, timeToNext).toFixed(1)}s`, cx, cy - zones.wall + 18);
      }

      // Outer ring
      ctx.strokeStyle = '#8b6b3a';
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(cx, cy, zones.wall, 0, Math.PI * 2); ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(ARENA.name, cx, cy - zones.wall - 30);
      ctx.fillStyle = 'rgba(100, 220, 100, 0.75)';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('🌍 6 PLACAS TECTÔNICAS | TERREMOTOS A CADA 8s', cx, cy - zones.wall - 12);

      ctx.restore();
    }

    function drawPinballInferno() {
      // ═══════════════════════════════════════════════════════════════════
      // PINBALL INFERNO V3 — Neon Grid floor + pink neon border
      // ═══════════════════════════════════════════════════════════════════
      const colors = ARENA.colors;
      const time   = Date.now() * 0.001;
      const arenaR = ARENA.arenaRadius;
      const cx = centerX, cy = centerY;
      if (!colors) return;

      // ── CLIP CIRCLE ───────────────────────────────────────────────────
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, arenaR, 0, Math.PI * 2);
      ctx.clip();

      // ── FLOOR: dark base ──────────────────────────────────────────────
      ctx.fillStyle = '#040010';
      ctx.fillRect(cx - arenaR, cy - arenaR, arenaR * 2, arenaR * 2);

      // ── FLOOR: neon cyan grid ─────────────────────────────────────────
      const gridStep = 22;
      ctx.strokeStyle = `rgba(0, 245, 255, ${0.07 + Math.sin(time * 1.2) * 0.02})`;
      ctx.lineWidth = 0.8;
      for (let gx = cx - arenaR; gx <= cx + arenaR; gx += gridStep) {
        ctx.beginPath(); ctx.moveTo(gx, cy - arenaR); ctx.lineTo(gx, cy + arenaR); ctx.stroke();
      }
      for (let gy = cy - arenaR; gy <= cy + arenaR; gy += gridStep) {
        ctx.beginPath(); ctx.moveTo(cx - arenaR, gy); ctx.lineTo(cx + arenaR, gy); ctx.stroke();
      }

      // ── FLOOR: pink diagonal grid ─────────────────────────────────────
      ctx.strokeStyle = `rgba(255, 45, 120, ${0.05 + Math.sin(time * 0.7) * 0.02})`;
      ctx.lineWidth = 0.6;
      for (let i = -arenaR * 2; i <= arenaR * 2; i += gridStep * 1.5) {
        ctx.beginPath(); ctx.moveTo(cx + i, cy - arenaR); ctx.lineTo(cx + i + arenaR * 2, cy + arenaR); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + i, cy - arenaR); ctx.lineTo(cx + i - arenaR * 2, cy + arenaR); ctx.stroke();
      }

      // ── FLOOR: radial glow ────────────────────────────────────────────
      const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, arenaR);
      radGrad.addColorStop(0,    `rgba(0, 245, 255, ${0.06 + Math.sin(time * 2) * 0.02})`);
      radGrad.addColorStop(0.35, 'rgba(0,0,0,0)');
      radGrad.addColorStop(0.75, 'rgba(255, 45, 120, 0.04)');
      radGrad.addColorStop(1,    'rgba(255, 45, 120, 0.14)');
      ctx.fillStyle = radGrad;
      ctx.fillRect(cx - arenaR, cy - arenaR, arenaR * 2, arenaR * 2);

      ctx.restore(); // end clip

      // ── PINK NEON BORDER ──────────────────────────────────────────────
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
      ctx.beginPath();
      ctx.arc(cx, cy, arenaR - 6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 45, 120, 0.18)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // ── SIDE BUMPERS ─────────────────────────────────────────────────
      ARENA.bumpers.forEach(bumper => {
        const bx       = cx + bumper.x;
        const by       = cy + bumper.y;
        const isActive = bumper.active || bumper.cooldown > 0;
        const pulse    = 0.85 + 0.15 * Math.sin(time * 2.5 + bumper.id);

        ctx.beginPath();
        ctx.arc(bx, by, bumper.radius + 10, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? 'rgba(255, 200, 30, 0.18)' : 'rgba(100, 60, 160, 0.08)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(bx, by, bumper.radius, 0, Math.PI * 2);
        const bg = ctx.createRadialGradient(bx - bumper.radius * 0.3, by - bumper.radius * 0.3, 1, bx, by, bumper.radius);
        if (isActive) { bg.addColorStop(0, '#fff8c0'); bg.addColorStop(1, '#ff9900'); }
        else          { bg.addColorStop(0, '#2a1a3a'); bg.addColorStop(1, '#100818'); }
        ctx.fillStyle  = bg;
        ctx.shadowColor = isActive ? '#ffaa00' : '#441166';
        ctx.shadowBlur  = isActive ? 20 : 6;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(bx, by, bumper.radius, 0, Math.PI * 2);
        ctx.strokeStyle = isActive ? `rgba(255, 180, 0, ${pulse})` : `rgba(140, 80, 200, ${0.5 * pulse})`;
        ctx.lineWidth   = 2.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(bx, by, bumper.radius * 0.52, 0, Math.PI * 2);
        ctx.strokeStyle = isActive ? 'rgba(255,255,255,0.5)' : 'rgba(200, 160, 255, 0.2)';
        ctx.lineWidth   = 1.5;
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

      if (scores.b1 > 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, cb.radius + 16, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * Math.min(scores.b1 / cb.pointsGoal, 1)));
        ctx.strokeStyle = '#ff2d78';
        ctx.lineWidth   = 4;
        ctx.shadowColor = '#ff2d78'; ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      if (scores.b2 > 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, cb.radius + 22, Math.PI / 2, Math.PI / 2 + (Math.PI * 2 * Math.min(scores.b2 / cb.pointsGoal, 1)));
        ctx.strokeStyle = '#00f5ff';
        ctx.lineWidth   = 4;
        ctx.shadowColor = '#00f5ff'; ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      for (let r = cb.radius + 22; r > cb.radius; r -= 5) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = cbActive
          ? `rgba(255,255,255, ${(r - cb.radius) * 0.025})`
          : `rgba(0,245,255, ${(r - cb.radius) * 0.012 * cbPulse})`;
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(cx, cy, cb.radius, 0, Math.PI * 2);
      const cbGrad = ctx.createRadialGradient(cx - 6, cy - 6, 2, cx, cy, cb.radius);
      if (cbActive) { cbGrad.addColorStop(0, '#ffffff'); cbGrad.addColorStop(0.5, '#88ffff'); cbGrad.addColorStop(1, 'rgba(0,245,255,0.9)'); }
      else          { cbGrad.addColorStop(0, `rgba(100,240,255,${0.7 + 0.3 * cbPulse})`); cbGrad.addColorStop(1, `rgba(0,100,200,${0.5 + 0.2 * cbPulse})`); }
      ctx.fillStyle  = cbGrad;
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur  = cbActive ? 35 : 18 * cbPulse;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, cb.radius, 0, Math.PI * 2);
      ctx.strokeStyle = cbActive ? '#ffffff' : `rgba(0,245,255,${0.7 + 0.3 * cbPulse})`;
      ctx.lineWidth   = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle      = cbActive ? '#000' : 'rgba(255,255,255,0.9)';
      ctx.font           = 'bold 9px monospace';
      ctx.textAlign      = 'center';
      ctx.textBaseline   = 'middle';
      ctx.fillText('1K', cx, cy);

      // ── FLIPPERS ─────────────────────────────────────────────────────
      ARENA.flippers.forEach(flipper => {
        const fx       = cx + flipper.x;
        const fy       = cy + flipper.y;
        const isActive = flipper.active || flipper.cooldown > 0;
        const len      = 90;

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
      ctx.shadowColor = '#ff2222'; ctx.shadowBlur = 10;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(rogX - rog.width / 2, rogY - rog.height / 2, rog.width, rog.height, 4);
      else ctx.rect(rogX - rog.width / 2, rogY - rog.height / 2, rog.width, rog.height);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // ── SCORE HUD ─────────────────────────────────────────────────────
      const hudY = cy - arenaR + 18;
      ctx.font = 'bold 11px monospace';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ff2d78'; ctx.textAlign = 'left';
      ctx.fillText(`◆ ${scores.b1 || 0}`, cx - arenaR + 10, hudY);
      ctx.fillStyle = 'rgba(255,215,0,0.55)'; ctx.textAlign = 'center';
      ctx.fillText(`/ ${cb.pointsGoal}`, cx, hudY);
      ctx.fillStyle = '#00f5ff'; ctx.textAlign = 'right';
      ctx.fillText(`${scores.b2 || 0} ◆`, cx + arenaR - 10, hudY);
    }

        function drawVortexColiseum() {
      const zones = ARENA.zones;
      const colors = ARENA.colors;
      const time = Date.now() * 0.001;
      
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
      const nowMs2 = Date.now();
      
      const vBarWidth = 240;
      const vBarX = centerX - vBarWidth / 2;
      const vBarY = centerY - zones.wall - 58;
      
      if (surgeActive) {
        const surgeGlow = 0.3 + Math.sin(nowMs2 * 0.008) * 0.25;
        ctx.globalAlpha = surgeGlow;
        ctx.fillStyle = '#ff2200';
        ctx.beginPath();
        ctx.arc(centerX, centerY, zones.innerOrbit, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        ctx.save();
        ctx.shadowBlur = 30 + Math.sin(nowMs2 * 0.005) * 10;
        ctx.shadowColor = '#ff0000';
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${18 + Math.sin(nowMs2 * 0.006) * 2}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('⚡  STORM SURGE!  ⚡', centerX, vBarY + 16);
        ctx.restore();
      } else if (timeToSurge < 2.5) {
        const buildIntensity = (2.5 - timeToSurge) / 2.5;
        ctx.globalAlpha = buildIntensity * 0.5;
        const buildColor = `rgba(255, ${Math.floor(255 * (1 - buildIntensity))}, 0, 1)`;
        ctx.fillStyle = buildColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, zones.vortexCore * (1 + buildIntensity * 0.8), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(vBarX - 5, vBarY - 5, vBarWidth + 10, 32);
        
        const surgeColor = buildIntensity > 0.7 ? '#ff0000' : buildIntensity > 0.4 ? '#ff6600' : '#c084fc';
        ctx.fillStyle = surgeColor;
        ctx.fillRect(vBarX, vBarY, vBarWidth * buildIntensity, 22);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(vBarX, vBarY, vBarWidth, 22);
        
        const pulseAlpha = 0.8 + Math.sin(nowMs2 * 0.007) * 0.2;
        ctx.fillStyle = `rgba(255,255,255,${pulseAlpha})`;
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`⚠ STORM SURGE EM ${timeToSurge.toFixed(1)}s ⚠`, centerX, vBarY + 15);
      } else {
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
      
      // MOMENTUM STACKS HUD — bigger
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
          
          let starText = '';
          for (let i = 0; i < Math.min(stacks1, 5); i++) starText += '★';
          if (stacks1 > 5) starText += `+${stacks1 - 5}`;
          ctx.fillStyle = stacks1 >= 3 ? '#ff6600' : '#fbbf24';
          ctx.font = `bold ${stacks1 >= 3 ? 20 : 16}px sans-serif`;
          ctx.fillText(starText, 25, centerY + 10);
          
          if (stacks1 >= 3) {
            ctx.fillStyle = `rgba(255,100,0,${0.5 + Math.sin(nowMs2 * 0.007) * 0.4})`;
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
            ctx.fillStyle = `rgba(255,100,0,${0.5 + Math.sin(nowMs2 * 0.007) * 0.4})`;
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
    
    // ═══════════════════════════════════════════════════════════════
    // SPEEDWAY CIRCUIT - Arena oval com boost pads e oil slicks
    // ═══════════════════════════════════════════════════════════════
    function drawSpeedwayCircuit() {
      const zones = ARENA.zones;
      const colors = ARENA.colors;
      const ovalRatio = ARENA.ovalRatio || 1.6;
      const time = Date.now() * 0.001;
      
      ctx.save();
      
      // Outer wall (oval)
      ctx.fillStyle = colors.wall;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, zones.wall * ovalRatio, zones.wall, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Track surface
      const trackGrad = ctx.createRadialGradient(centerX, centerY, zones.centerHole, centerX, centerY, zones.outerTrack);
      trackGrad.addColorStop(0, colors.centerHole);
      trackGrad.addColorStop(0.5, colors.track);
      trackGrad.addColorStop(1, colors.track);
      ctx.fillStyle = trackGrad;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, zones.outerTrack * ovalRatio, zones.outerTrack, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Center hole (inacessível)
      ctx.fillStyle = colors.centerHole;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, zones.centerHole * ovalRatio, zones.centerHole, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Track lanes (visual only)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, zones.innerTrack * ovalRatio, zones.innerTrack, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Oil slicks
      ARENA.oilSlicks.forEach(oil => {
        ctx.save();
        const pulse = 0.9 + Math.sin(time * 2) * 0.1;
        ctx.globalAlpha = 0.7;
        
        // Oil gradient
        const oilGrad = ctx.createRadialGradient(
          centerX + oil.x, centerY + oil.y, 0,
          centerX + oil.x, centerY + oil.y, oil.width / 2
        );
        oilGrad.addColorStop(0, colors.oil);
        oilGrad.addColorStop(1, 'rgba(0, 100, 170, 0.3)');
        
        ctx.fillStyle = oilGrad;
        ctx.fillRect(
          centerX + oil.x - oil.width / 2,
          centerY + oil.y - oil.height / 2,
          oil.width,
          oil.height
        );
        
        // Oil shimmer effect
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          centerX + oil.x - oil.width / 2,
          centerY + oil.y - oil.height / 2,
          oil.width,
          oil.height
        );
        
        ctx.restore();
      });
      
      // Boost pads
      ARENA.boostPads.forEach(pad => {
        const padActive = pad.cooldown > 0;
        const pulse = padActive ? 1.3 : (1.0 + Math.sin(time * 4) * 0.1);
        
        ctx.save();
        ctx.shadowBlur = padActive ? 25 : 10;
        ctx.shadowColor = padActive ? colors.boostActive : colors.boost;
        
        // Boost pad gradient
        const boostGrad = ctx.createRadialGradient(
          centerX + pad.x, centerY + pad.y, 0,
          centerX + pad.x, centerY + pad.y, pad.radius * pulse
        );
        boostGrad.addColorStop(0, '#ffffff');
        boostGrad.addColorStop(0.3, padActive ? colors.boostActive : colors.boost);
        boostGrad.addColorStop(1, padActive ? colors.boostActive : colors.boost);
        
        ctx.fillStyle = boostGrad;
        ctx.beginPath();
        ctx.arc(centerX + pad.x, centerY + pad.y, pad.radius * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        // Direction arrows
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡', centerX + pad.x, centerY + pad.y);
        
        ctx.restore();
        
        // Cooldown decay
        if (pad.cooldown > 0) {
          pad.cooldown -= 1/60;
        }
      });
      
      // Finish line
      const lineY = centerY;
      const lineX = centerX + zones.innerTrack * ovalRatio + 20;
      ctx.strokeStyle = colors.finishLine;
      ctx.lineWidth = 5;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(lineX, lineY - 60);
      ctx.lineTo(lineX, lineY + 60);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Lap counter
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      const lap1 = ARENA.lapSystem.player1Laps;
      const lap2 = ARENA.lapSystem.player2Laps;
      const target = ARENA.lapSystem.targetLaps;
      ctx.fillStyle = '#ff6666';
      ctx.fillText(`P1: ${lap1}/${target}`, centerX - 100, centerY - zones.wall - 15);
      ctx.fillStyle = '#6666ff';
      ctx.fillText(`P2: ${lap2}/${target}`, centerX + 100, centerY - zones.wall - 15);
      
      // Arena title
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(ARENA.name, centerX, centerY - zones.wall - 35);
      
      ctx.restore();
    }
    
    // ═══════════════════════════════════════════════════════════════
    // DOMINATION ZONES - Arena com zonas para conquistar
    // ═══════════════════════════════════════════════════════════════
    function drawDominationZones() {
      const zones = ARENA.zones;
      const colors = ARENA.colors;
      const ps = ARENA.pointsSystem;
      const cz = ARENA.centralZone;
      const time = Date.now() * 0.001;

      const cx = ensureFinite(500, 500);
      const cy = ensureFinite(350, 350);

      // ── FLOOR ─────────────────────────────────────────────────────
      const floorGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, zones.wall);
      floorGrad.addColorStop(0, '#2a2a3e');
      floorGrad.addColorStop(1, '#111120');
      ctx.fillStyle = floorGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, zones.wall, 0, Math.PI * 2);
      ctx.fill();

      // Subtle grid
      ctx.save();
      ctx.globalAlpha = 0.07;
      ctx.strokeStyle = '#8888ff';
      ctx.lineWidth = 1;
      for (let r = 40; r < zones.wall; r += 40) {
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      }
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI / 4) * i;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 20, cy + Math.sin(a) * 20);
        ctx.lineTo(cx + Math.cos(a) * zones.wall, cy + Math.sin(a) * zones.wall);
        ctx.stroke();
      }
      ctx.restore();

      // ── PERIPHERAL ZONES (8 pizza slices) ───────────────────────
      if (ARENA.peripheralZones) {
        ARENA.peripheralZones.forEach(zone => {
          // Zona em formato de fatia (pizza slice)
          const startAngle = zone.angle - zone.arcWidth / 2;
          const endAngle = zone.angle + zone.arcWidth / 2;
          const innerRadius = zones.center; // Começa do centro
          const outerRadius = zones.zoneRadius; // Vai até o raio das zonas
          
          // Cor da zona
          let zoneColor, glowColor;
          if (zone.owner === 'player1') {
            zoneColor = colors.player1; glowColor = '#ff6666';
          } else if (zone.owner === 'player2') {
            zoneColor = colors.player2; glowColor = '#6666ff';
          } else {
            zoneColor = colors.uncaptured; glowColor = '#aaaaaa';
          }

          // Glow para zonas capturadas
          if (zone.owner !== null) {
            ctx.save();
            ctx.globalAlpha = 0.35 + Math.sin(time * 2 + zone.id) * 0.1;
            ctx.shadowBlur = 20;
            ctx.shadowColor = glowColor;
            ctx.fillStyle = zoneColor;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, outerRadius, startAngle, endAngle);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }

          // Fatia principal
          ctx.save();
          ctx.globalAlpha = zone.owner !== null ? 0.5 : 0.3;
          ctx.fillStyle = zoneColor;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, outerRadius, startAngle, endAngle);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          
          // Bordas da fatia
          ctx.save();
          ctx.strokeStyle = zone.owner !== null ? glowColor : 'rgba(255,255,255,0.4)';
          ctx.lineWidth = zone.owner !== null ? 3 : 1.5;
          ctx.setLineDash(zone.owner === null ? [5, 4] : []);
          ctx.beginPath();
          // Linha do centro para a borda (início da fatia)
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(startAngle) * outerRadius, cy + Math.sin(startAngle) * outerRadius);
          // Arco externo
          ctx.arc(cx, cy, outerRadius, startAngle, endAngle);
          // Linha da borda de volta ao centro (fim da fatia)
          ctx.lineTo(cx, cy);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // Progresso de captura (arco na borda externa)
          const p1prog = zone.captureProgress.player1;
          const p2prog = zone.captureProgress.player2;
          const maxProg = Math.max(p1prog, p2prog);
          const progPlayer = p1prog >= p2prog ? 'player1' : 'player2';
          if (maxProg > 0 && zone.owner === null) {
            const progColor = progPlayer === 'player1' ? colors.player1 : colors.player2;
            const progArcEnd = startAngle + (maxProg / ps.captureTime) * zone.arcWidth;
            ctx.save();
            ctx.globalAlpha = 0.9;
            ctx.strokeStyle = progColor;
            ctx.lineWidth = 5;
            ctx.shadowBlur = 10; ctx.shadowColor = progColor;
            ctx.beginPath();
            ctx.arc(cx, cy, outerRadius + 6, startAngle, progArcEnd);
            ctx.stroke();
            ctx.restore();
            
            // Pulse quando quase capturando
            if (maxProg > 0.7) {
              ctx.save();
              ctx.globalAlpha = (0.4 + Math.sin(time * 12) * 0.4);
              ctx.fillStyle = progColor;
              const midAngle = zone.angle;
              const midRadius = (innerRadius + outerRadius) / 2;
              ctx.beginPath();
              ctx.arc(cx + Math.cos(midAngle) * midRadius, cy + Math.sin(midAngle) * midRadius, 15, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }
          }

          // Número da zona (no meio da fatia)
          ctx.save();
          ctx.fillStyle = zone.owner !== null ? '#ffffff' : 'rgba(255,255,255,0.7)';
          ctx.font = `bold ${zone.owner !== null ? 16 : 14}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const labelRadius = (innerRadius + outerRadius) * 0.7; // 70% do caminho
          const labelX = cx + Math.cos(zone.angle) * labelRadius;
          const labelY = cy + Math.sin(zone.angle) * labelRadius;
          ctx.fillText(`${zone.id}`, labelX, labelY);
          ctx.restore();
        });
      }

      // ── CENTRAL ZONE ─────────────────────────────────────────────
      if (cz) {
        const czColor = cz.owner === 'player1' ? colors.player1
                      : cz.owner === 'player2' ? colors.player2
                      : colors.centralZone;
        const czGlow = cz.owner === 'player1' ? '#ff4444'
                     : cz.owner === 'player2' ? '#4444ff'
                     : '#bb88ff';

        // Glow
        ctx.save();
        ctx.globalAlpha = 0.3 + Math.sin(time * 3) * 0.15;
        ctx.shadowBlur = 30; ctx.shadowColor = czGlow;
        ctx.fillStyle = czColor;
        ctx.beginPath(); ctx.arc(cx, cy, cz.radius, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // Fill
        ctx.save();
        ctx.globalAlpha = cz.owner !== null ? 0.8 : 0.5;
        ctx.fillStyle = czColor;
        ctx.strokeStyle = czGlow;
        ctx.lineWidth = cz.owner !== null ? 4 : 2;
        ctx.setLineDash(cz.owner === null ? [6, 4] : []);
        ctx.beginPath(); ctx.arc(cx, cy, cz.radius, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Capture progress arc
        const czP1 = cz.captureProgress.player1;
        const czP2 = cz.captureProgress.player2;
        const czMax = Math.max(czP1, czP2);
        const czProg = czP1 >= czP2 ? 'player1' : 'player2';
        if (czMax > 0 && cz.owner === null) {
          const czProgColor = czProg === 'player1' ? colors.player1 : colors.player2;
          ctx.save();
          ctx.strokeStyle = czProgColor;
          ctx.lineWidth = 6;
          ctx.shadowBlur = 12; ctx.shadowColor = czProgColor;
          ctx.beginPath();
          ctx.arc(cx, cy, cz.radius + 7, -Math.PI / 2, -Math.PI / 2 + (czMax / ps.captureTime) * Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // "+2" label
        ctx.save();
        ctx.fillStyle = cz.owner !== null ? '#ffffff' : 'rgba(255,255,255,0.8)';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('+2', cx, cy - 8);
        ctx.font = '10px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText('CTR', cx, cy + 7);
        ctx.restore();
      }

      // ── WALL ─────────────────────────────────────────────────────
      ctx.strokeStyle = colors.wall || '#2a2a3a';
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(cx, cy, zones.wall, 0, Math.PI * 2); ctx.stroke();

      // ── POINTS HUD ───────────────────────────────────────────────
      const p1pts = ps.player1.totalPoints;
      const p2pts = ps.player2.totalPoints;
      const target = ps.targetPoints;
      const hudY = cy - zones.wall - 15;

      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ARENA.name, cx, cy - zones.wall - 35);

      // P1 dots
      ctx.textAlign = 'right';
      ctx.fillStyle = colors.player1;
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('P1', cx - 55, hudY);
      for (let i = 0; i < target; i++) {
        ctx.beginPath();
        ctx.fillStyle = i < p1pts ? colors.player1 : 'rgba(255,100,100,0.25)';
        ctx.arc(cx - 40 + i * 16, hudY - 4, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.textAlign = 'left';
      ctx.fillStyle = colors.player1;
      ctx.fillText(`[${p1pts}/${target}]`, cx + 45, hudY);

      // P2 dots
      ctx.textAlign = 'right';
      ctx.fillStyle = colors.player2;
      ctx.fillText('P2', cx - 55, hudY + 18);
      for (let i = 0; i < target; i++) {
        ctx.beginPath();
        ctx.fillStyle = i < p2pts ? colors.player2 : 'rgba(100,100,255,0.25)';
        ctx.arc(cx - 40 + i * 16, hudY + 14, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.textAlign = 'left';
      ctx.fillStyle = colors.player2;
      ctx.fillText(`[${p2pts}/${target}]`, cx + 45, hudY + 18);

      ctx.textAlign = 'center';
    }
    
    // ═══════════════════════════════════════════════════════════════
    // TIDAL SURGE — Visual completo (sincronizado com BattlePhysicsEngine)
    // ═══════════════════════════════════════════════════════════════
    function drawTidalSurge() {
      const zones  = ARENA.zones;
      const colors = ARENA.colors;
      const tide   = ARENA.tideSystem;
      const type   = tide.tideType || 'standard';
      const t      = Date.now() * 0.001;

      // ── 1. UPDATE DO ESTADO (sincronizado, por tempo real) ───────
      // O BattlePhysicsEngine atualiza via _updateTidalState() por frame.
      // No visual, sincronizamos pelo mesmo objeto tideSystem.
      // Quando rodando no canvas (não-headless), atualizamos aqui:
      {
        const cyc = tide.cycleDuration || 12;
        const eio = r => r < 0.5 ? 2*r*r : -1+(4-2*r)*r;
        tide.timer += 1/60;
        const p = (tide.timer % cyc) / cyc;
        const intens = tide.intensity || 1.0;

        if (type === 'standard') {
          if (p < 0.33) { tide.phase='low'; tide.floodRadius=0; }
          else if (p < 0.66) { tide.phase='rising'; tide.floodRadius=tide.maxFloodRadius*eio((p-0.33)/0.33)*intens; }
          else { tide.phase='high'; tide.floodRadius=tide.maxFloodRadius*intens; }

        } else if (type === 'spiral') {
          if (p < 0.33) { tide.phase='low'; tide.floodRadius=0; }
          else if (p < 0.66) { tide.phase='rising'; tide.floodRadius=tide.maxFloodRadius*eio((p-0.33)/0.33)*intens; }
          else { tide.phase='high'; tide.floodRadius=tide.maxFloodRadius*intens; }
          tide.spiralAngle = (tide.spiralAngle||0) + (1/60)*1.6*(tide.spiralDirection||1);

        } else if (type === 'double') {
          const r = Math.sin(p*Math.PI*2)*0.5+0.5;
          tide.dualFlood = r*tide.maxFloodRadius*0.85*intens;
          tide.dualAngle = (tide.dualAngle||0) + (1/60)*0.4;
          tide.phase = r>0.6?'high':r>0.2?'rising':'low';
          tide.floodRadius = tide.dualFlood;

        } else if (type === 'inverse') {
          if (p<0.33){ tide.phase='low'; tide.inverseProgress=0; }
          else if (p<0.66){ tide.phase='rising'; tide.inverseProgress=eio((p-0.33)/0.33)*intens; }
          else { tide.phase='high'; tide.inverseProgress=1.0*intens; }
          tide.floodRadius=0;

        } else if (type === 'chaos') {
          tide.blobTimer=(tide.blobTimer||0)+(1/60);
          if (tide.blobTimer>1.5||!tide.blobs||tide.blobs.length===0){
            tide.blobTimer=0;
            if (!tide.blobs) tide.blobs=[];
            if (tide.blobs.length<4){
              const ang=Math.random()*Math.PI*2, dist=Math.random()*zones.normalZone*0.75;
              tide.blobs.push({x:dist*Math.cos(ang),y:dist*Math.sin(ang),r:0,maxR:(25+Math.random()*40)*intens,life:0,maxLife:2.5+Math.random()*2});
            }
          }
          if (tide.blobs) tide.blobs=tide.blobs.filter(b=>{
            b.life+=1/60; const half=b.maxLife*0.5;
            b.r=b.life<half?b.maxR*eio(b.life/half):b.maxR*(1-eio((b.life-half)/half));
            return b.life<b.maxLife;
          });
          tide.phase=(tide.blobs?.length||0)>2?'high':(tide.blobs?.length||0)>0?'rising':'low';
          tide.floodRadius=0;
        }

        // ── TSUNAMI STATE UPDATE (visual) ──────────────────────────────
        const ts = ARENA.tsunamiSystem;
        if (ts) {
          const DT = 1/60;
          if (!ts.active) {
            ts.timer = (ts.timer||0) + DT;
            if (ts.timer >= ts.interval) {
              const roll = Math.random();
              ts.level = roll < 0.10 ? 'apocalyptic' : roll < 0.40 ? 'heavy' : 'light';
              ts.active = true; ts.phase = 'warning'; ts.phaseTimer = 0; ts.timer = 0;
              ts.waveRings = ts.waveRings || [];
            }
          } else {
            const lc = ts.levels[ts.level];
            ts.phaseTimer = (ts.phaseTimer||0) + DT;
            if (ts.phase === 'warning') {
              if (ts.phaseTimer >= ts.warningDur) { ts.phase = 'expanding'; ts.phaseTimer = 0; }
            } else if (ts.phase === 'expanding') {
              const prg = Math.min(1, ts.phaseTimer / lc.expandDur);
              ts.wallOffset = lc.maxOffset * eio(prg);
              if (ts.phaseTimer >= lc.expandDur) { ts.wallOffset = lc.maxOffset; ts.phase = 'hold'; ts.phaseTimer = 0; }
            } else if (ts.phase === 'hold') {
              if (ts.phaseTimer >= lc.holdDur) {
                if (lc.returns) { ts.phase = 'returning'; ts.phaseTimer = 0; }
                else { ts.permanentOffset = (ts.permanentOffset||0) + ts.wallOffset; ts.wallOffset = 0; ts.active = false; ts.phase = 'idle'; ts.phaseTimer = 0; }
              }
            } else if (ts.phase === 'returning') {
              const prg = Math.min(1, ts.phaseTimer / lc.returnDur);
              ts.wallOffset = lc.maxOffset * (1 - eio(prg));
              if (ts.phaseTimer >= lc.returnDur) { ts.wallOffset = 0; ts.active = false; ts.phase = 'idle'; ts.phaseTimer = 0; }
            }
          }
          // Spawn wave rings when expanding
          if (ts.active && (ts.phase === 'expanding' || ts.phase === 'hold')) {
            if (!ts.waveRings) ts.waveRings = [];
            if (Math.random() < 0.35) {
              const baseR = zones.wall - (ts.permanentOffset||0);
              ts.waveRings.push({ r: baseR, alpha: 0.9, speed: 1.8 + Math.random() * 1.2 });
            }
          }
          // Update rings: move inward
          if (ts.waveRings) {
            ts.waveRings = ts.waveRings.filter(wr => {
              wr.r -= wr.speed;
              wr.alpha -= 0.012;
              return wr.alpha > 0 && wr.r > 20;
            });
          }
        }
      } // end state update block

      const tideIntensity = tide.phase==='high' ? 1 : tide.phase==='rising' ? (tide.floodRadius/(tide.maxFloodRadius||80))*0.7 : 0.15;
      const wallR  = zones.wall;
      const floodR = ARENA.arenaZones?.floodZone || 80;
      const sandR  = ARENA.arenaZones?.sand       || 160;
      const islandR= ARENA.arenaZones?.island      || 40;

      // ── 2. FUNDO ESCURO ─────────────────────────────────────────
      ctx.fillStyle = '#050f20';
      ctx.beginPath(); ctx.arc(centerX, centerY, wallR+30, 0, Math.PI*2); ctx.fill();

      // ── 3. PAREDE DE ÁGUA ANIMADA ────────────────────────────────
      // Base da parede
      const wallGrd = ctx.createRadialGradient(centerX,centerY,wallR-18,centerX,centerY,wallR+22);
      wallGrd.addColorStop(0, `rgba(10,40,110,${0.7+tideIntensity*0.28})`);
      wallGrd.addColorStop(0.5,`rgba(18,75,160,${0.85+tideIntensity*0.14})`);
      wallGrd.addColorStop(1, `rgba(5,18,55,0.96)`);
      ctx.fillStyle=wallGrd;
      ctx.beginPath(); ctx.arc(centerX,centerY,wallR+22,0,Math.PI*2);
      ctx.arc(centerX,centerY,wallR-18,0,Math.PI*2,true);
      ctx.fill('evenodd');

      // Ondas animadas na parede (2 layers)
      for (let layer=0; layer<2; layer++){
        const wCount=90, amp=(5+tideIntensity*9)*(layer===0?1:0.55);
        const freq=layer===0?6:10, spd=layer===0?1.9:-2.5;
        ctx.beginPath();
        for (let i=0;i<=wCount;i++){
          const ang=(i/wCount)*Math.PI*2;
          const r=wallR-4+Math.sin(ang*freq+t*spd)*amp;
          if(i===0) ctx.moveTo(centerX+Math.cos(ang)*r,centerY+Math.sin(ang)*r);
          else ctx.lineTo(centerX+Math.cos(ang)*r,centerY+Math.sin(ang)*r);
        }
        ctx.closePath();
        ctx.strokeStyle=layer===0
          ?`rgba(90,190,255,${0.45+tideIntensity*0.4})`
          :`rgba(190,235,255,${0.22+tideIntensity*0.2})`;
        ctx.lineWidth=layer===0?2.5:1.5; ctx.stroke();

        // Espuma / foam dots
        if(tideIntensity>0.25) for(let i=0;i<18;i++){
          const ang=(i/18)*Math.PI*2+t*(layer===0?0.28:-0.19);
          const r=wallR-2+Math.sin(ang*6+t*1.9)*(3+tideIntensity*7);
          const al=(0.4+Math.sin(ang*3+t*2.4)*0.28)*tideIntensity;
          ctx.fillStyle=`rgba(215,240,255,${al})`;
          ctx.beginPath(); ctx.arc(centerX+Math.cos(ang)*r,centerY+Math.sin(ang)*r,2.2-layer*0.7,0,Math.PI*2); ctx.fill();
        }
      }

      // ── 4. CHÃO DE AREIA ─────────────────────────────────────────
      const sandGrd = ctx.createRadialGradient(centerX,centerY,0,centerX,centerY,wallR-18);
      sandGrd.addColorStop(0,   '#e0c880'); // areia seca clara (centro/ilha)
      sandGrd.addColorStop(0.22,'#d4b870');
      sandGrd.addColorStop(0.5, '#c8a858');
      sandGrd.addColorStop(0.75,'#b89040');
      sandGrd.addColorStop(1,   '#8a6428');
      ctx.fillStyle=sandGrd;
      ctx.beginPath(); ctx.arc(centerX,centerY,wallR-18,0,Math.PI*2); ctx.fill();

      // Textura de grãos (pontilhado procedural)
      ctx.save(); ctx.globalAlpha=0.07;
      for(let i=0;i<240;i++){
        const ang=(i*2.618)%(Math.PI*2), r=(i*1.41)%(wallR-24)+4;
        const gx=centerX+Math.cos(ang)*r, gy=centerY+Math.sin(ang)*r;
        ctx.fillStyle=i%3===0?'#fff':'#7a4a18';
        ctx.fillRect(gx,gy,1.5,1.5);
      }
      ctx.restore();

      // Linha de areia molhada (avança com a maré)
      if(tideIntensity>0.05){
        const wetR = floodR*(tideIntensity);
        const wetGrd=ctx.createRadialGradient(centerX,centerY,wetR*0.6,centerX,centerY,wetR*1.1);
        wetGrd.addColorStop(0,'rgba(120,80,30,0)');
        wetGrd.addColorStop(0.5,`rgba(100,65,20,${tideIntensity*0.35})`);
        wetGrd.addColorStop(1,'rgba(80,50,15,0)');
        ctx.fillStyle=wetGrd;
        ctx.beginPath(); ctx.arc(centerX,centerY,wetR*1.15,0,Math.PI*2); ctx.fill();
      }

      // ── 5. ZONAS DE ÁGUA ─────────────────────────────────────────
      const drawFloodAt=(wx,wy,radius,phase)=>{
        if(radius<=0) return;
        const alpha=phase==='high'?0.75:0.50;

        // Base água
        const wg=ctx.createRadialGradient(wx,wy,0,wx,wy,radius);
        wg.addColorStop(0,`rgba(15,90,200,${alpha})`);
        wg.addColorStop(0.6,`rgba(25,115,225,${alpha*0.82})`);
        wg.addColorStop(1,`rgba(90,190,255,${alpha*0.28})`);
        ctx.fillStyle=wg;
        ctx.beginPath(); ctx.arc(wx,wy,radius,0,Math.PI*2); ctx.fill();

        // Ripples
        for(let i=0;i<3;i++){
          const rp=(t*1.5+i*1.2)%3, rr=radius*(rp/3);
          ctx.strokeStyle=`rgba(130,215,255,${(1-rp/3)*0.5})`;
          ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.arc(wx,wy,rr,0,Math.PI*2); ctx.stroke();
        }

        // Borda úmida
        ctx.save(); ctx.setLineDash([4,3]);
        ctx.strokeStyle=`rgba(170,225,255,${alpha*0.6})`;
        ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(wx,wy,radius,0,Math.PI*2); ctx.stroke();
        ctx.setLineDash([]); ctx.restore();
      };

      if(type==='standard'||type==='spiral'){
        if(tide.phase!=='low') drawFloodAt(centerX,centerY,tide.floodRadius,tide.phase);

        // Corrente espiral
        if(type==='spiral'&&tide.floodRadius>0){
          ctx.save(); ctx.globalAlpha=0.30;
          for(let arm=0;arm<3;arm++){
            ctx.beginPath();
            const startA=(arm/3)*Math.PI*2+(tide.spiralAngle||0);
            for(let i=0;i<40;i++){
              const prog=i/40, ang=startA+prog*Math.PI*1.5;
              const r=tide.floodRadius*0.1+prog*tide.floodRadius*0.9;
              const x=centerX+Math.cos(ang)*r, y=centerY+Math.sin(ang)*r;
              if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
            }
            ctx.strokeStyle='rgba(150,225,255,0.7)'; ctx.lineWidth=1.5; ctx.stroke();
          }
          ctx.restore();
        }

      } else if(type==='double'){
        if(tide.dualFlood>0) for(const side of [0,Math.PI]){
          const ax=centerX+Math.cos((tide.dualAngle||0)+side)*floodR*0.5;
          const ay=centerY+Math.sin((tide.dualAngle||0)+side)*floodR*0.5;
          drawFloodAt(ax,ay,tide.dualFlood,tide.phase);
        }

      } else if(type==='inverse'){
        const inv=tide.inverseProgress||0;
        if(inv>0){
          const innerEdge=sandR-inv*(sandR-floodR);
          ctx.save();
          const rg=ctx.createRadialGradient(centerX,centerY,innerEdge,centerX,centerY,wallR-20);
          rg.addColorStop(0,'rgba(15,90,200,0)');
          rg.addColorStop(0.3,`rgba(25,110,220,${0.55*inv})`);
          rg.addColorStop(1, `rgba(8,55,150,${0.72*inv})`);
          ctx.fillStyle=rg;
          ctx.beginPath(); ctx.arc(centerX,centerY,wallR-20,0,Math.PI*2);
          ctx.arc(centerX,centerY,innerEdge,0,Math.PI*2,true);
          ctx.fill('evenodd');
          for(let i=0;i<3;i++){
            const rp=(t*1.2+i*1.4)%3, rr=innerEdge+rp*((wallR-20-innerEdge)/3);
            ctx.strokeStyle=`rgba(110,200,255,${(1-rp/3)*0.5*inv})`;
            ctx.lineWidth=1.5;
            ctx.beginPath(); ctx.arc(centerX,centerY,rr,0,Math.PI*2); ctx.stroke();
          }
          ctx.restore();
        }

      } else if(type==='chaos'){
        for(const blob of (tide.blobs||[])){ if(blob.r>0) drawFloodAt(centerX+blob.x,centerY+blob.y,blob.r,'high'); }
      }

      // ── 6. ILHA CENTRAL ──────────────────────────────────────────
      const iGrd=ctx.createRadialGradient(centerX,centerY,0,centerX,centerY,islandR);
      iGrd.addColorStop(0,'#f0d898'); iGrd.addColorStop(0.45,'#e0c070');
      iGrd.addColorStop(0.78,'#c09040'); iGrd.addColorStop(1,'#8a6028');
      ctx.fillStyle=iGrd;
      ctx.beginPath(); ctx.arc(centerX,centerY,islandR,0,Math.PI*2); ctx.fill();

      // Detalhes da ilha: pedras/coral
      ctx.save(); ctx.globalAlpha=0.45;
      [[centerX-12,centerY+7,5.5,'#b87848'],[centerX+10,centerY-9,6,'#a06838'],
       [centerX-7,centerY-11,4.5,'#c08040'],[centerX+13,centerY+5,4,'#987030']].forEach(([x,y,r,c])=>{
        ctx.fillStyle=c; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
      });
      ctx.restore();

      // Borda da ilha
      ctx.strokeStyle='rgba(225,205,130,0.65)'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(centerX,centerY,islandR-2,0,Math.PI*2); ctx.stroke();

      // Anel decorativo externo (separação entre ilha e zona de inundação)
      ctx.save(); ctx.setLineDash([4,5]);
      ctx.strokeStyle='rgba(200,170,80,0.3)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.arc(centerX,centerY,floodR,0,Math.PI*2); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();

      // ── 7. TSUNAMI VISUAL EFFECTS ─────────────────────────────────
      const ts = ARENA.tsunamiSystem;
      if (ts) {
        const permanentOffset = ts.permanentOffset || 0;
        const wallOffset = ts.wallOffset || 0;
        const effectiveWallR = wallR - permanentOffset - wallOffset;

        // Level colors
        const tsunamiColors = {
          light:       { main: '#22ff88', mid: '#00cc55', glow: 'rgba(34,255,136,', shadow: '#00ff66' },
          heavy:       { main: '#cc44ff', mid: '#9922ee', glow: 'rgba(204,68,255,', shadow: '#aa22ff' },
          apocalyptic: { main: '#ff2244', mid: '#cc1133', glow: 'rgba(255,34,68,',  shadow: '#ff0033' },
        };
        const activeLevel = ts.level || 'light';
        const tc = tsunamiColors[activeLevel] || tsunamiColors.light;

        // ── Permanent shrink: redraw inner wall ring ─────────────────
        if (permanentOffset > 0) {
          const permWallR = wallR - permanentOffset;
          // Solid red inner wall boundary (apocalyptic remnant)
          const permGrd = ctx.createRadialGradient(centerX,centerY,permWallR-10,centerX,centerY,permWallR+6);
          permGrd.addColorStop(0, 'rgba(200,10,30,0)');
          permGrd.addColorStop(0.5,'rgba(200,10,30,0.5)');
          permGrd.addColorStop(1,'rgba(180,5,20,0.3)');
          ctx.fillStyle = permGrd;
          ctx.beginPath(); ctx.arc(centerX,centerY,permWallR+6,0,Math.PI*2);
          ctx.arc(centerX,centerY,permWallR-10,0,Math.PI*2,true);
          ctx.fill('evenodd');
          // Glowing border
          ctx.save();
          ctx.shadowColor = '#ff2244'; ctx.shadowBlur = 14;
          ctx.strokeStyle = 'rgba(255,34,68,0.7)'; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.arc(centerX,centerY,permWallR,0,Math.PI*2); ctx.stroke();
          ctx.restore();
          // Lava cracks pattern
          for(let i=0;i<16;i++){
            const ang=(i/16)*Math.PI*2+t*0.05;
            const r1=permWallR-6, r2=permWallR+6;
            ctx.save(); ctx.globalAlpha=0.35;
            ctx.strokeStyle='#ff4444'; ctx.lineWidth=1;
            ctx.beginPath();
            ctx.moveTo(centerX+Math.cos(ang)*r1,centerY+Math.sin(ang)*r1);
            ctx.lineTo(centerX+Math.cos(ang)*r2,centerY+Math.sin(ang)*r2);
            ctx.stroke(); ctx.restore();
          }
        }

        // ── Active tsunami effects ──────────────────────────────────
        if (ts.active && ts.phase !== 'idle') {
          const progress = wallOffset / (ts.levels[ts.level]?.maxOffset || 1);

          // WARNING phase: flicker the wall
          if (ts.phase === 'warning') {
            const flash = Math.sin(t * 18) * 0.5 + 0.5;
            ctx.save();
            ctx.globalAlpha = flash * 0.55;
            ctx.strokeStyle = tc.main; ctx.lineWidth = 6 + flash * 6;
            ctx.shadowColor = tc.shadow; ctx.shadowBlur = 20 + flash * 30;
            ctx.beginPath(); ctx.arc(centerX,centerY,wallR-12,0,Math.PI*2); ctx.stroke();
            // Warning label
            ctx.globalAlpha = flash * 0.9;
            const levelLabel = ts.level === 'apocalyptic' ? '💀 TSUNAMI APOCALÍPTICA' :
                               ts.level === 'heavy'       ? '⚡ TSUNAMI PESADA'       :
                                                            '🌊 TSUNAMI LEVE';
            ctx.fillStyle = tc.main;
            ctx.font = "bold 13px 'Orbitron', monospace";
            ctx.textAlign = 'center';
            ctx.shadowBlur = 15;
            ctx.fillText(levelLabel, centerX, centerY + wallR - 38);
            ctx.restore();
          }

          // EXPANDING / HOLD / RETURNING: draw the moving wall
          if (ts.phase !== 'warning') {
            const shrunkR = effectiveWallR;

            // Water flood fill between original and shrunk wall
            if (wallOffset > 0.5) {
              ctx.save();
              const floodGrd = ctx.createRadialGradient(centerX,centerY,shrunkR-4,centerX,centerY,wallR-10);
              const al = Math.min(0.82, 0.35 + progress * 0.47);
              floodGrd.addColorStop(0, `${tc.glow}${al.toFixed(2)})`);
              floodGrd.addColorStop(0.5,`${tc.glow}${(al*0.65).toFixed(2)})`);
              floodGrd.addColorStop(1, `${tc.glow}0.08)`);
              ctx.fillStyle = floodGrd;
              ctx.beginPath(); ctx.arc(centerX,centerY,wallR-10,0,Math.PI*2);
              ctx.arc(centerX,centerY,shrunkR-4,0,Math.PI*2,true);
              ctx.fill('evenodd');
              ctx.restore();
            }

            // Shrunk wall leading edge — glowing rim
            ctx.save();
            ctx.shadowColor = tc.shadow; ctx.shadowBlur = 18 + progress * 22;
            ctx.strokeStyle = tc.main; ctx.lineWidth = 3.5 + progress * 3;
            ctx.beginPath(); ctx.arc(centerX,centerY,shrunkR,0,Math.PI*2); ctx.stroke();
            // Inner glow ring
            ctx.strokeStyle = `${tc.glow}0.4)`; ctx.lineWidth = 7 + progress * 5;
            ctx.shadowBlur = 0;
            ctx.beginPath(); ctx.arc(centerX,centerY,shrunkR,0,Math.PI*2); ctx.stroke();
            ctx.restore();

            // Foam/spray particles on leading edge
            for(let i=0;i<22;i++){
              const ang = (i/22)*Math.PI*2 + t * 2.5;
              const wavR = shrunkR + Math.sin(ang*7+t*4)*4;
              const al = (0.5 + Math.sin(ang*3+t*3)*0.3) * progress;
              ctx.fillStyle = `rgba(255,255,255,${al.toFixed(2)})`;
              ctx.beginPath(); ctx.arc(centerX+Math.cos(ang)*wavR, centerY+Math.sin(ang)*wavR, 2.5,0,Math.PI*2); ctx.fill();
            }

            // HUD label on active tsunami
            ctx.save();
            ctx.globalAlpha = 0.9;
            const levelLabel2 = ts.level === 'apocalyptic' ? '💀 TSUNAMI APOCALÍPTICA' :
                                ts.level === 'heavy'       ? '⚡ TSUNAMI PESADA'       :
                                                             '🌊 TSUNAMI LEVE';
            ctx.fillStyle = tc.main;
            ctx.shadowColor = tc.shadow; ctx.shadowBlur = 12;
            ctx.font = "bold 13px 'Orbitron', monospace";
            ctx.textAlign = 'center';
            ctx.fillText(levelLabel2, centerX, centerY + wallR - 38);
            ctx.restore();
          }
        }

        // ── Wave rings moving inward from wall ───────────────────────
        if (ts.waveRings && ts.waveRings.length > 0) {
          const ringColor = ts.active ? tc : tsunamiColors[ts.level] || tsunamiColors.light;
          for (const wr of ts.waveRings) {
            ctx.save();
            ctx.globalAlpha = wr.alpha * 0.75;
            ctx.strokeStyle = ringColor.main || '#22ff88';
            ctx.lineWidth = 1.8;
            ctx.shadowColor = ringColor.shadow || '#00ff66'; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(centerX,centerY,wr.r,0,Math.PI*2); ctx.stroke();
            ctx.restore();
          }
        }
      }

      // ── 8. HUD de fase ───────────────────────────────────────────
      const phaseLabels={ low:'🌑 LOW TIDE', rising:'🌓 RISING', high:'🌕 HIGH TIDE' };
      const phaseColors={ low:'#48c878', rising:'#f0c040', high:'#e04848' };
      const typeLabels={ standard:'', spiral:' SPIRAL', double:' DOUBLE', inverse:' INVERSE', chaos:' CHAOS' };

      ctx.save();
      ctx.fillStyle='rgba(0,0,0,0.5)';
      ctx.fillRect(centerX-90, centerY-wallR-54, 180, 36);
      ctx.fillStyle=phaseColors[tide.phase]||'#fff';
      ctx.font="bold 11px 'Orbitron', monospace";
      ctx.textAlign='center';
      ctx.fillText((phaseLabels[tide.phase]||'TIDE')+(typeLabels[type]||''), centerX, centerY-wallR-32);
      // Barra de progresso do ciclo
      const cycPct=((tide.timer%(tide.cycleDuration||12))/(tide.cycleDuration||12));
      ctx.fillStyle='rgba(255,255,255,0.12)';
      ctx.fillRect(centerX-70,centerY-wallR-22,140,5);
      ctx.fillStyle=phaseColors[tide.phase]||'#fff';
      ctx.fillRect(centerX-70,centerY-wallR-22,140*cycPct,5);
      ctx.restore();
    }
    
    // ═══════════════════════════════════════════════════════════════
    // STORM TRACK - Arena com ondas de força direcionais
    // ═══════════════════════════════════════════════════════════════
    function drawStormTrack() {
      const zones = ARENA.zones;
      const colors = ARENA.colors;
      const storm = ARENA.stormSystem;
      const time = Date.now() * 0.001;
      
      // Outer wall
      ctx.fillStyle = colors.wall;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.wall, 0, Math.PI * 2);
      ctx.fill();
      
      // ═══ BOWL VISUAL - Gradiente para parecer tigela ═══
      // Outer rim (lighter - higher)
      const bowlGrad1 = ctx.createRadialGradient(centerX, centerY, zones.outer, centerX, centerY, zones.wall);
      bowlGrad1.addColorStop(0, '#2a2a2a');
      bowlGrad1.addColorStop(1, '#3a3a3a');
      ctx.fillStyle = bowlGrad1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.wall, 0, Math.PI * 2);
      ctx.fill();
      
      // Mid section (darker - sloping down)
      const bowlGrad2 = ctx.createRadialGradient(centerX, centerY, zones.inner, centerX, centerY, zones.outer);
      bowlGrad2.addColorStop(0, '#1a1a1a');
      bowlGrad2.addColorStop(1, '#2a2a2a');
      ctx.fillStyle = bowlGrad2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.outer, 0, Math.PI * 2);
      ctx.fill();
      
      // Floor (darkest - deepest part)
      const floorGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, zones.inner);
      floorGrad.addColorStop(0, '#0a0a0a');
      floorGrad.addColorStop(0.5, '#151515');
      floorGrad.addColorStop(1, '#1a1a1a');
      ctx.fillStyle = floorGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.inner, 0, Math.PI * 2);
      ctx.fill();
      
      // Grid lines (bowl contours)
      ctx.strokeStyle = 'rgba(100, 100, 100, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      
      // Radial grid (depth rings)
      for (let r = zones.center; r <= zones.outer; r += 40) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      // Directional grid
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
          centerX + Math.cos(angle) * zones.outer,
          centerY + Math.sin(angle) * zones.outer
        );
        ctx.stroke();
      }
      
      ctx.setLineDash([]);
      
      // Draw storm effects based on current phase and type
      if (storm && storm.currentStorm) {
        const stormData = storm.stormTypes[storm.currentStorm];
        
        // Warning phase
        if (storm.timing.currentPhase === 'warning') {
          drawStormWarning(storm.currentStorm, stormData);
        }
        
        // Active phase
        if (storm.timing.currentPhase === 'active') {
          drawActiveStorm(storm.currentStorm, stormData);
        }
      }
      
      // Center zone (deepest point)
      const centerGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, zones.center);
      centerGrad.addColorStop(0, '#000000');
      centerGrad.addColorStop(1, '#0a0a0a');
      ctx.fillStyle = centerGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.center, 0, Math.PI * 2);
      ctx.fill();
      
      // Wall ring (rim of the bowl)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zones.wall, 0, Math.PI * 2);
      ctx.stroke();
      
      // Arena title and status
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ARENA.name + ' 🌪️', centerX, centerY - zones.wall - 35);
      
      ctx.font = 'bold 14px sans-serif';
      let statusText = '🌤️ CALM';
      let statusColor = '#88ff88';
      
      if (storm && storm.timing) {
        if (storm.timing.currentPhase === 'warning') {
          statusText = `⚠️ ${storm.currentStorm} INCOMING!`;
          statusColor = '#ffff00';
        } else if (storm.timing.currentPhase === 'active') {
          statusText = `⚡ ${storm.currentStorm} ACTIVE!`;
          statusColor = '#ff4444';
        }
        
        // Show intensity level
        if (storm.intensity && storm.intensity.level > 1) {
          statusText += ` [LV${storm.intensity.level}]`;
        }
      }
      
      ctx.fillStyle = statusColor;
      ctx.fillText(statusText, centerX, centerY - zones.wall - 15);
    }
    
    function drawStormWarning(stormType, stormData) {
      const warningAlpha = 0.5 + Math.sin(Date.now() * 0.01) * 0.3;
      ctx.globalAlpha = warningAlpha;
      
      switch(stormType) {
        case 'RAIN_WAVE':
          ctx.fillStyle = ARENA.colors.rainWave;
          // Draw arrows showing wave direction
          for (let r = ARENA.zones.center; r < ARENA.zones.outer; r += 60) {
            const arrowX = centerX + Math.cos(stormData.waveDirection) * r;
            const arrowY = centerY + Math.sin(stormData.waveDirection) * r;
            ctx.save();
            ctx.translate(arrowX, arrowY);
            ctx.rotate(stormData.waveDirection);
            ctx.font = 'bold 24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('➤', 0, 0);
            ctx.restore();
          }
          break;
        case 'WIND_VORTEX':
          ctx.strokeStyle = ARENA.colors.windVortex;
          ctx.lineWidth = 3;
          stormData.vortices.forEach(v => {
            ctx.beginPath();
            ctx.arc(centerX + v.x, centerY + v.y, stormData.vortexRadius, 0, Math.PI * 2);
            ctx.stroke();
          });
          break;
        case 'LIGHTNING_STORM':
          ctx.fillStyle = ARENA.colors.lightning;
          ctx.font = 'bold 30px sans-serif';
          ctx.textAlign = 'center';
          for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * 2 / 3) * i;
            const radius = 120;
            ctx.fillText('⚡', centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
          }
          break;
        case 'THUNDER_DOME':
          ctx.strokeStyle = ARENA.colors.thunderDome;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(centerX, centerY, stormData.domeRadius, 0, Math.PI * 2);
          ctx.stroke();
          break;
        case 'HAIL_BARRAGE':
          ctx.fillStyle = ARENA.colors.hail;
          ctx.font = 'bold 20px sans-serif';
          for (let i = 0; i < 10; i++) {
            const x = centerX + (Math.random() - 0.5) * 300;
            const y = centerY + (Math.random() - 0.5) * 300;
            ctx.fillText('❄', x, y);
          }
          break;
        case 'TORNADO_FURY':
          ctx.strokeStyle = ARENA.colors.tornado;
          ctx.lineWidth = 8;
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, 60 * (i + 1), 0, Math.PI * 2);
            ctx.stroke();
          }
          break;
      }
      
      ctx.globalAlpha = 1.0;
    }
    
    function drawActiveStorm(stormType, stormData) {
      switch(stormType) {
        case 'RAIN_WAVE':
          // Draw wave effect
          ctx.save();
          ctx.fillStyle = `${ARENA.colors.rainWave}88`;
          const waveX = centerX + Math.cos(stormData.waveDirection) * 100;
          const waveY = centerY + Math.sin(stormData.waveDirection) * 100;
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(waveX + Math.cos(stormData.waveDirection) * i * 40, 
                   waveY + Math.sin(stormData.waveDirection) * i * 40, 
                   80 - i * 20, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          break;
        case 'WIND_VORTEX':
          // Draw spinning vortices
          stormData.vortices.forEach(v => {
            ctx.save();
            ctx.translate(centerX + v.x, centerY + v.y);
            ctx.rotate(Date.now() * 0.003);
            ctx.strokeStyle = `${ARENA.colors.windVortex}cc`;
            ctx.lineWidth = 3;
            for (let i = 0; i < 4; i++) {
              const angle = (Math.PI / 2) * i;
              ctx.beginPath();
              ctx.arc(0, 0, stormData.vortexRadius * 0.7, angle, angle + Math.PI / 3);
              ctx.stroke();
            }
            ctx.restore();
          });
          break;
        case 'LIGHTNING_STORM':
          // Draw lightning strikes
          stormData.strikes.forEach(strike => {
            ctx.strokeStyle = ARENA.colors.lightning;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ffff00';
            ctx.beginPath();
            ctx.moveTo(centerX + strike.x, centerY - 200);
            ctx.lineTo(centerX + strike.x + (Math.random() - 0.5) * 20, centerY + strike.y);
            ctx.stroke();
            ctx.shadowBlur = 0;
            
            // Strike radius
            ctx.fillStyle = `${ARENA.colors.lightning}44`;
            ctx.beginPath();
            ctx.arc(centerX + strike.x, centerY + strike.y, strike.radius, 0, Math.PI * 2);
            ctx.fill();
          });
          break;
        case 'THUNDER_DOME':
          // Draw electric dome
          ctx.strokeStyle = ARENA.colors.thunderDome;
          ctx.lineWidth = 4;
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#00ffff';
          ctx.beginPath();
          ctx.arc(centerX, centerY, stormData.domeRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
          
          // Electric arcs
          for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i + Date.now() * 0.001;
            const x1 = centerX + Math.cos(angle) * stormData.domeRadius;
            const y1 = centerY + Math.sin(angle) * stormData.domeRadius;
            const x2 = centerX + Math.cos(angle + Math.PI / 8) * stormData.domeRadius;
            const y2 = centerY + Math.sin(angle + Math.PI / 8) * stormData.domeRadius;
            
            ctx.strokeStyle = `${ARENA.colors.thunderDome}66`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
          break;
        case 'HAIL_BARRAGE':
          // Draw falling hailstones
          stormData.hailstones.forEach(stone => {
            ctx.fillStyle = ARENA.colors.hail;
            ctx.beginPath();
            ctx.arc(centerX + stone.x, centerY + stone.y, 8, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();
          });
          break;
        case 'TORNADO_FURY':
          // Draw massive tornado
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(Date.now() * 0.005);
          
          for (let i = 0; i < 6; i++) {
            const radius = (stormData.tornadoRadius / 6) * (i + 1);
            const alpha = 1 - (i / 6);
            ctx.strokeStyle = `${ARENA.colors.tornado}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
            ctx.lineWidth = 8 - i;
            
            ctx.beginPath();
            for (let a = 0; a < Math.PI * 2; a += 0.2) {
              const x = Math.cos(a + i * 0.5) * radius;
              const y = Math.sin(a + i * 0.5) * radius;
              if (a === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            }
            ctx.closePath();
            ctx.stroke();
          }
          
          ctx.restore();
          break;
      }
    }
    
    // ════════════════════════════════════════════════════════════════
    // ATMOSPHERIC BACKGROUND — arena environment
    // ════════════════════════════════════════════════════════════════
    function drawAtmosphere() {
      const t = Date.now();
      // Deep base — angled gradient
      const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      bgGrad.addColorStop(0,   '#0a0c14');
      bgGrad.addColorStop(0.5, '#0d1020');
      bgGrad.addColorStop(1,   '#07090f');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Stadium outer haze ring
      const cr = ARENA.zones?.wall || 220;
      ctx.save();
      const hazeGrad = ctx.createRadialGradient(centerX, centerY, cr + 5, centerX, centerY, cr + 150);
      hazeGrad.addColorStop(0, 'rgba(100,110,160,0.07)');
      hazeGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = hazeGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      // Ceiling spotlight dots around arena
      ctx.save();
      const lightSeeds = [0.3, 1.1, 1.9, 2.7, 3.5, 4.3, 5.2];
      lightSeeds.forEach((seed, i) => {
        const dist = cr + 85 + (i % 3) * 18;
        const lx = centerX + Math.cos(seed) * dist;
        const ly = centerY + Math.sin(seed) * dist;
        const flicker = 0.55 + Math.sin(t * 0.0007 + i * 1.7) * 0.1;
        const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, 20);
        lg.addColorStop(0, `rgba(255,255,240,${flicker * 0.20})`);
        lg.addColorStop(1, 'transparent');
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.arc(lx, ly, 20, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      // Very faint scanline overlay for CRT feel
      ctx.save();
      ctx.globalAlpha = 0.016;
      for (let y = 0; y < canvas.height; y += 4) {
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.fillRect(0, y, canvas.width, 1);
      }
      ctx.restore();
    }

    // ════════════════════════════════════════════════════════════════
    // SHOCKWAVE RING SYSTEM — radial impact rings on collision
    // ════════════════════════════════════════════════════════════════
    const shockwaves = [];
    function addShockwave(x, y, color1, color2, strength) {
      const s = strength || 1.0;
      shockwaves.push({ x, y, r: 4, maxR: 55 + s * 22, alpha: 0.82, color1: color1 || '#ffffff', color2: color2 || '#88aaff', thickness: 3 + s * 1.4 });
    }
    function drawShockwaves() {
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.r += 4.8 + (sw.r / sw.maxR) * 2.5;
        sw.alpha -= 0.042;
        if (sw.alpha <= 0 || sw.r >= sw.maxR) { shockwaves.splice(i, 1); continue; }
        const t = sw.r / sw.maxR;
        ctx.save();
        ctx.globalAlpha = sw.alpha * (1 - t * 0.55);
        ctx.shadowBlur = 16;
        ctx.shadowColor = sw.color1;
        ctx.strokeStyle = sw.color1;
        ctx.lineWidth = sw.thickness * (1 - t * 0.45);
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = sw.color2;
        ctx.globalAlpha *= 0.4;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.r * 0.68, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    function update() {
      // Atualiza estado da arena (gates, storms, etc)
      updateArenaState(arenaState, 1/60, ARENA);
      
      // ✨ Update enhanced visual systems
      if (particleSystemRef.current) {
        particleSystemRef.current.update(1/60);
        impactEffectsRef.current.update(1/60);
      }
      drawAtmosphere();
      
      drawArena();
      
      // ✨ Render enhanced particle effects
      if (particleSystemRef.current) {
        particleSystemRef.current.render(ctx);
        impactEffectsRef.current.render(ctx);
      }
      
      // Iluminação da arena (FASE 2 - Pseudo-3D)
      drawArenaLighting();

      // Shockwave rings — drawn before beyblades, on arena surface
      drawShockwaves();
      
      // Opposite spin indicator
      if (isOppositeSpin) {
        ctx.save();
        ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.005) * 0.2;
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
            addParticle(b.x, b.y, '#00ff88', 18);
            recordEvent('ETERNAL_SPIN_ACTIVATED', { bey: b === b1 ? 'b1' : 'b2' });
          }
        }
        
        const bSpinPercent = (b.spinSpeed / b.stats.maxSpin);
        const velocity = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        
        // CELESTIAL ROTATION (SPIN 50+) - Ganha spin ao se mover
        if (b.hasCelestialRotation && velocity > 4) {
          b.spinSpeed += 0.15;
          b.spinSpeed = Math.min(b.stats.maxSpin, b.spinSpeed);
          if (Math.random() < 0.02) {
            addParticle(b.x, b.y, '#ffd700', 4);
          }
        }
        
        // VOLCANIC_RAGE WELL (WEIGHT 27+) - Puxa oponente continuamente
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
          if (b.armorVoidPulseTimer >= 300) {
            b.armorVoidPulseTimer = 0;
            const opponent = b === b1 ? b2 : b1;
            opponent.armorBurnStacks = [];
            opponent.armorAdaptiveDefense = Math.max(0, opponent.armorAdaptiveDefense - 3);
            addParticle(b.x, b.y, '#000000', 10);
            addParticle(opponent.x, opponent.y, '#ffffff', 8);
            addShockwave(b.x, b.y, '#8800ff', '#ffffff', 1.2);
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

        // ── ARMOR contínuos ──
        // Poison Sting (Scorpion Tail) - DoT por stack
        if (b.armorPoisonStacks > 0) {
          const arm = b.bey?.armor;
          b.stamina -= (b.armorPoisonStacks / 60); // 1 dmg/s por stack @ 60fps
          if (Math.random() < 0.05) addParticle(b.x, b.y, '#7c3aed', 4);
        }

        // Ice Wall cooldown (Permafrost)
        if (!b.armorIceWallReady && b.bey?.armor?.effect === 'ice_wall') {
          if (Date.now() - (b.armorIceWallLastUsed || 0) >= (b.bey.armor.cooldown || 8) * 1000) {
            b.armorIceWallReady = true;
            addParticle(b.x, b.y, '#bae6fd', 6);
          }
        }

        // Spectrum Shift (Prism Shell) - mudar elemento a cada 5s
        if (b.bey?.armor?.effect === 'spectrum_shift') {
          const arm = b.bey.armor;
          const now = Date.now() * 0.001;
          if (!b.armorLastElementShift) b.armorLastElementShift = now;
          if (now - b.armorLastElementShift >= (arm.shiftInterval || 5.0)) {
            b.armorCurrentElement = ((b.armorCurrentElement || 0) + 1) % (arm.elements?.length || 4);
            b.armorLastElementShift = now;
            addParticle(b.x, b.y, '#a855f7', 12);
          }
        }

        // ── DISC contínuos ──
        // Cyclone (pull effect)
        if (b.bey?.disc?.special === 'pull_effect' && bOpponent?.alive) {
          const dis = b.bey.disc;
          const dx = b.x - bOpponent.x;
          const dy = b.y - bOpponent.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const pullRadius = dis.specialValue || 25;
          if (dist < pullRadius && dist > 0) {
            const strength = 0.3;
            bOpponent.vx += (dx / dist) * strength;
            bOpponent.vy += (dy / dist) * strength;
          }
        }

        // Monolith - peso muda via weight_shift (já sem b, usa bey weight)
        if (b.bey?.disc?.special === 'weight_shift') {
          const dis = b.bey.disc;
          const now = Date.now() * 0.001;
          if (!b.discLastWeightShift) b.discLastWeightShift = now;
          if (now - b.discLastWeightShift >= 5.0) {
            b.discLastWeightShift = now;
            const shift = dis.specialValue || 3;
            const delta = (Math.random() > 0.5 ? shift : -shift);
            const base = b.bey?.effectiveStats?.weight || 10;
            // Oscila em torno do base
            b._mysticWeightOffset = Math.max(-shift, Math.min(shift, ((b._mysticWeightOffset || 0) + delta)));
            addParticle(b.x, b.y, '#7c3aed', 5);
          }
        }

        // ── DRIVER contínuos ──
        // Spiral (regen_boost)
        if (b.bey?.driver?.special === 'regen_boost') {
          const regen = b.bey.driver.specialValue || 0.5;
          b.stamina = Math.min(250, b.stamina + regen / 60);
          if (Math.random() < 0.02) addParticle(b.x, b.y, '#34d399', 3);
        }

        // Sprint (burst_speed) - boost nos primeiros 3s
        if (b.bey?.driver?.special === 'burst_speed' && !b.driverBurstSpeedApplied) {
          const drv = b.bey.driver;
          const boost = drv.specialValue || 0.50;
          b.vx *= (1 + boost);
          b.vy *= (1 + boost);
          b.driverBurstSpeedApplied = true;
          addParticle(b.x, b.y, '#f97316', 15);
          recordEvent('BURST_SPEED', { bey: b === b1 ? 'b1' : 'b2' });
        }

        // Equilibrium (wobble_immunity) - mantém estabilidade mínima
        if (b.bey?.driver?.special === 'wobble_immunity') {
          b.stability = Math.max(b.stability, 20);
        }

        // ── LAYER contínuos ──
        // Tidal Wave - resetar consecutive hits se não colidiu recentemente
        if (b.bey?.layer?.special === 'scaling_damage') {
          // Reset ocorre no on-hit (count sobe), aqui apenas partícula de feedback
          if ((b.layerConsecutiveHits || 0) > 2 && Math.random() < 0.03) {
            addParticle(b.x, b.y, '#0ea5e9', 4);
          }
        }
        
        // Apply launch pattern behaviors
        if (b.launchPattern === 'flower' && bSpinPercent > 0.3) {
          // Banking/Flower Pattern - already handled in Tornado Ridge section but enhance it
          b.flowerPatternPhase += 0.18;
        } else if (b.launchPattern === 'wobble' && bSpinPercent > 0.2) {
          // Weak Launch - unstable wobbling makes it harder to hit
          const wobbleX = Math.sin(Date.now() * 0.015) * 3;
          const wobbleY = Math.cos(Date.now() * 0.015) * 3;
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
          const driftPhase = Date.now() * 0.003;
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
          // EXIT RUSH - Aims for exits
          if (ARENA.exits && velocity > 7) {
            // Find nearest exit
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
          b.x += Math.sin(Date.now() * 0.02) * wobbleAmount;
          b.y += Math.cos(Date.now() * 0.02) * wobbleAmount;
          
          // Wobbling causes gradual stability loss
          const wobbleStabilityLoss = (0.3 - bSpinPercent) * 0.15;
          b.stability -= wobbleStabilityLoss;
          
          // Visual feedback when wobbling hard
          if (bSpinPercent < 0.15 && Math.random() < 0.05) {
            addParticle(b.x, b.y, '#ff9900', 3);
          }
        }
        
        b.x += b.vx;
        b.y += b.vy;
        b.rotation += b.spinSpeed * 0.1 * b.spinDirection;
        
        // ── POST-MOVEMENT HARD WALL CLAMP (BB10_COMPETITIVE) ─────────
        // O handler checa a posição PRÉ-movimento — blades rápidos
        // podem ultrapassar a parede no mesmo frame. Este clamp garante
        // que nunca saiam da arena (exceto pelos pockets após 2s).
        if (arenaType === 'BB10_COMPETITIVE') {
          const _pDist = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
          const _pWall = ARENA.zones.wall - 34; // 221 - 34 = 187
          
          if (_pDist > _pWall - b.radius) {
            const _pAngle = Math.atan2(b.y - centerY, b.x - centerX);
            
            // Verificar se está em pocket aberto — permitir saída
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
              // Clamp posição na parede
              b.x = centerX + Math.cos(_pAngle) * (_pWall - b.radius);
              b.y = centerY + Math.sin(_pAngle) * (_pWall - b.radius);
              // Refletir componente radial da velocidade
              const _dot = b.vx * Math.cos(_pAngle) + b.vy * Math.sin(_pAngle);
              if (_dot > 0) { // só se indo para fora
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
        const spinDecay = hasInfiniteSpin ? 0.9995 : 0.998;
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
        const minSpinThreshold = 0.3;
        if (b.spinSpeed < minSpinThreshold && !b.isTipping && !b.fellOver && !winner && !burstTriggered) {
          // Start tipping animation
          b.isTipping = true;
          b.lastStopTime = Date.now();
          recordEvent('SPIN_TOO_LOW', {
            bey: b === b1 ? 'b1' : 'b2',
            finalSpin: b.spinSpeed
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
          b.burstTime = Date.now();
          
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
          b.staminaDepletionTime = Date.now();
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
      
      function handleColosseumCarnagePhysics(b, bSpinPercent, velocity) {
        // ═══════════════════════════════════════════════════════════════════
        // CARNAGE COLOSSEUM — Física Oval com Sistema de 8 Eventos
        // Parede oval real + eventos que alteram as regras do round.
        // ═══════════════════════════════════════════════════════════════════
        const zones = ARENA.zones;
        const ce    = ARENA.carnageEvent;
        const time  = arenaState.time;

        // ── Effective semi-axes (The Executioner comprime wallA) ────────
        const effA = ce.activeEvent === 'THE_EXECUTIONER'
          ? ce.executioner.currentA
          : zones.wallA;
        const effB = zones.wallB;

        // ═══════════════════════════════════════════════════════════════
        // FÍSICA DO EVENTO ATIVO
        // ═══════════════════════════════════════════════════════════════
        if (ce.revealed && ce.activeEvent) {

          // ── FROZEN_GROUND — fricção extremamente baixa ─────────────
          if (ce.activeEvent === 'FROZEN_GROUND') {
            b.vx *= 0.9988; // quase sem atrito
            b.vy *= 0.9988;
          } else {
            b.vx *= 0.991;  // fricção normal da arena
            b.vy *= 0.991;
          }

          // ── SANDSTORM — força tangencial girando ───────────────────
          if (ce.activeEvent === 'SANDSTORM') {
            const px = b.x - centerX, py = b.y - centerY;
            const dist = Math.sqrt(px * px + py * py);
            if (dist > 15) {
              const tx = -py / dist, ty = px / dist; // tangente
              const force = ce.sandstorm.force * ce.sandstorm.direction;
              b.vx += tx * force;
              b.vy += ty * force;
            }
          }

          // ── BLOOD_MOON — não altera fricção aqui, aplica no dano ──
          // (o modificador ×2 é aplicado na colisão entre beys, via flag)

          // ── PHANTOM_PAIR — colisão com peões fantasma ─────────────
          if (ce.activeEvent === 'PHANTOM_PAIR') {
            ce.phantomBlades.forEach(ph => {
              if (!ph.alive) return;
              const dx = (b.x - centerX) - ph.x;
              const dy = (b.y - centerY) - ph.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < ph.radius + b.radius) {
                // Knockback no peão fantasma e no bey
                const nx = dx / (dist || 1), ny = dy / (dist || 1);
                b.vx += nx * 6;
                b.vy += ny * 6;
                ph.hp -= 20 + bSpinPercent * 15;
                ph.vx -= nx * 4;
                ph.vy -= ny * 4;
                addParticle(b.x, b.y, '#c8c8ff', 18);
                if (ph.hp <= 0) {
                  ph.alive = false;
                  // Recuperação completa!
                  b.stamina   = Math.min(250, b.stamina + 250);
                  b.stability = Math.min(150, (b.stability || 100) + 150);
                  addParticle(b.x, b.y, '#ffffff', 40);
                  addFlashEffect('#c8c8ff', 0.35, 30);
                  recordEvent('PHANTOM_DEFEATED', { bey: b === b1 ? 'b1' : 'b2' });
                }
              }
            });
          }

          // ── THE_CHAMPION — colisão com o peão campeão ─────────────
          if (ce.activeEvent === 'THE_CHAMPION' && ce.championBlade && ce.championBlade.alive) {
            const ch = ce.championBlade;
            const dx = (b.x - centerX) - ch.x;
            const dy = (b.y - centerY) - ch.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < ch.radius + b.radius + 2) {
              const nx = dx / (dist || 1), ny = dy / (dist || 1);
              // Bey recebe knockback forte
              b.vx += nx * 12;
              b.vy += ny * 12;
              b.stamina   -= 12;
              b.stability -= 10;
              b.burstDamage += 3;
              // Champion recebe dano
              ch.hp   -= 15 + bSpinPercent * 10;
              ch.vx   -= nx * 3;
              ch.vy   -= ny * 3;
              addParticle(b.x, b.y, '#ffd700', 25);
              addScreenShake(1.5);
              if (ch.hp <= 0) {
                ch.alive = false;
                addParticle(b.x, b.y, '#ffd700', 60);
                addFlashEffect('#ffd700', 0.4, 40);
                recordEvent('CHAMPION_DEFEATED', { bey: b === b1 ? 'b1' : 'b2' });
              }
            }
          }

          // ── DIVINE_JUDGMENT — efeito dos raios ────────────────────
          if (ce.activeEvent === 'DIVINE_JUDGMENT') {
            ce.divine.strikes.forEach(s => {
              if (s.age > 0.3 || s.applied) return; // só aplica no início
              const dx = (b.x - centerX) - s.x;
              const dy = (b.y - centerY) - s.y;
              if (Math.sqrt(dx * dx + dy * dy) < s.radius + b.radius) {
                s.applied = true;
                switch (s.effect) {
                  case 'SPIN_BOOST':    b.stamina = Math.min(250, b.stamina + 40); break;
                  case 'SPIN_DRAIN':    b.stamina = Math.max(0, b.stamina - 35); break;
                  case 'STAMINA_BOOST': b.stamina = Math.min(250, b.stamina + 50); break;
                  case 'STAMINA_DRAIN': b.stamina = Math.max(0, b.stamina - 40); break;
                  case 'KNOCKBACK': {
                    const ang = Math.atan2(b.y - centerY, b.x - centerX);
                    b.vx += Math.cos(ang) * 10; b.vy += Math.sin(ang) * 10;
                    break;
                  }
                  case 'SHIELD':
                    b.shieldEffect = { timer: 180 }; break;
                  case 'CHAOS': {
                    b.vx = (Math.random() - 0.5) * 14;
                    b.vy = (Math.random() - 0.5) * 14;
                    b.stamina += (Math.random() - 0.5) * 50;
                    break;
                  }
                }
                addParticle(b.x, b.y, s.color, 30);
                recordEvent('DIVINE_STRIKE', { bey: b === b1 ? 'b1' : 'b2', effect: s.effect });
              }
            });
          }

        } else if (!ce.revealed) {
          // Antes do reveal — fricção normal
          b.vx *= 0.991;
          b.vy *= 0.991;
        }

        // ═══════════════════════════════════════════════════════════════
        // COLISÃO COM PAREDE OVAL
        // ═══════════════════════════════════════════════════════════════
        const px   = b.x - centerX;
        const py   = b.y - centerY;
        const r    = b.radius || 15;
        // Oval efetivo considerando o raio do bey
        const eA   = effA - r;
        const eB   = effB - r;
        const oval = (eA > 0 && eB > 0) ? (px / eA) ** 2 + (py / eB) ** 2 : 0;

        // 🛰️ SATELLITE: pular colisão oval durante órbita — updateOrbit garante posição válida
        if (!b.isOrbiting && oval >= 1 && (eA > 0 && eB > 0)) {
          // Normal da elipse no ponto mais próximo da superfície
          const nX = px / (eA * eA);
          const nY = py / (eB * eB);
          const nL = Math.sqrt(nX * nX + nY * nY) || 1;
          const nx = nX / nL, ny = nY / nL;

          // Reposicionar bey dentro da oval
          const t  = 1 / Math.sqrt(oval);
          b.x = centerX + px * t;
          b.y = centerY + py * t;

          // Refletir velocidade
          const dot = b.vx * nx + b.vy * ny;
          b.vx -= 2 * dot * nx;
          b.vy -= 2 * dot * ny;

          // Redução de velocidade na parede
          const wallRestitution = 0.72;
          b.vx *= wallRestitution;
          b.vy *= wallRestitution;

          // Danos de colisão com parede — INFERNO_WALLS drena stability
          if (ce.activeEvent === 'INFERNO_WALLS') {
            b.stamina   -= 3.5;
            b.stability  = Math.max(0, (b.stability || 100) - 8);
            b.burstDamage += 1.0;
            addParticle(b.x, b.y, '#ff4400', 14);
          } else {
            b.stamina   -= 1.8;
            b.burstDamage += 0.5;
          }
          addParticle(b.x, b.y, '#c4934a', 10);
        }

        // ═══════════════════════════════════════════════════════════════
        // FLOOR SINK — atração ao centro (mecânica permanente da arena)
        // ═══════════════════════════════════════════════════════════════
        if (ARENA.floorSink && ARENA.floorSink.depth > 0.01) {
          const fs  = ARENA.floorSink;
          const px  = b.x - centerX;
          const py  = b.y - centerY;
          const dist = Math.sqrt(px * px + py * py);
          if (dist > 5) {
            // Força centrípeta proporcional à profundidade E à distância do centro
            // (quanto mais longe do centro, mais forte o funil puxa)
            const distFactor = Math.min(1, dist / 120);
            const pull = fs.pullForce * fs.depth * distFactor;
            b.vx -= (px / dist) * pull;
            b.vy -= (py / dist) * pull;
          }
        }

        // ═══════════════════════════════════════════════════════════════
        // DRENAGEM DE STAMINA BASE
        // ═══════════════════════════════════════════════════════════════
        let staminaLoss = 0.14 - ((b.bey?.effectiveStats?.sta || 10) * 0.005);
        staminaLoss += velocity * 0.008;
        // BLOOD_MOON dobra todas as perdas de stamina
        if (ce.activeEvent === 'BLOOD_MOON') staminaLoss *= 2.0;

        const hasPerpetual = b.bey?.synergies?.some(s => s?.name?.includes('Perpetual')) || false;
        if (hasPerpetual) staminaLoss -= 0.01;
        if (b.eternalSpinActive && b.eternalSpinTimer < 300) staminaLoss = 0;
        b.stamina -= staminaLoss;

        // Atualiza efeitos temporários
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
        const currentFrame = Math.floor(Date.now() / 16.67);  // ~60fps
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
        
        // Wall collision
        if (!b.isOrbiting && distToCenter > zones.wall - b.radius) { // satellite guard
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
        // BB10_COMPETITIVE: parede física = wallR - 34 (o anel verde ocupa 34px)
        const physWall = (arenaType === 'BB10_COMPETITIVE') ? zones.wall - 34 : zones.wall;
        
        let currentZone = 'wall';
        if (distToCenter <= zones.centerBowl) currentZone = 'center';
        else if (distToCenter <= zones.innerSlope) currentZone = 'innerSlope';
        else if (distToCenter <= zones.tornadoRidge) currentZone = 'tornadoRidge';
        else if (distToCenter <= zones.outerSlope) currentZone = 'outerSlope';
        
        // Check pockets/exits
        let inPocket = false;
        let inExit = false;
        
        if (ARENA.pockets.length > 0) {
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
        
        // Grace Period Helper Function (BB10 + BB10_COMPETITIVE)
        function getEffectiveExitWidth(exit, battleTime) {
          const isGraceArena = (arenaType === 'BB10_COMPETITIVE' || arenaType === 'BB10_COMPETITIVE');
          if (isGraceArena && ARENA.gracePeriod && ARENA.gracePeriod.enabled) {
            if (battleTime < ARENA.gracePeriod.duration) {
              return exit.width * ARENA.gracePeriod.exitMultiplier;
            }
          }
          return exit.width;
        }
        
        if (ARENA.exits.length > 0 && ARENA.exitsOpen) {
          const angleToCenter = Math.atan2(b.y - centerY, b.x - centerX);
          const rotOffset = ARENA.exitRing ? ARENA.exitRing.currentAngle : 0;
          const currentBattleTime = (Date.now() - battleStartTimeRef.current) / 1000;
          
          ARENA.exits.forEach(exit => {
            // BB-10 Grace Period: exits menores nos primeiros 3s
            const effectiveWidth = getEffectiveExitWidth(exit, currentBattleTime);
            const halfA = (effectiveWidth / 25) * 0.3;  // Escala baseado no width (25 = normal)
            
            const exitAngle = exit.angle + rotOffset;
            // Normalize angle difference
            let angleDiff = angleToCenter - exitAngle;
            angleDiff = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
            if (Math.abs(angleDiff) < halfA && distToCenter > physWall - 10) {
              inExit = true;
            }
          });
        }
        
        // Tornado Ridge mechanics with Sweet Spot Boost
        if (currentZone === 'tornadoRidge' && b.bey?.type === 'Attack' && bSpinPercent > 0.4) {
          b.inTornadoRidge = true; // Flag for visual effects
          if (velocity > 5) {
            b.flowerPatternPhase += 0.2;
            const ridgeAngle = Math.atan2(b.y - centerY, b.x - centerX);
            const tangentX = -Math.sin(ridgeAngle);
            const tangentY = Math.cos(ridgeAngle);
            
            // BB-10 SWEET SPOT CHECK (desativado em arenas competitive)
            let inSweetSpot = false;
            if (false) { // BB10_COMPETITIVE: sweetspot boost removido
              ARENA.sweetSpots.forEach(spot => {
                let angleDiff = ridgeAngle - spot.angle;
                angleDiff = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
                if (Math.abs(angleDiff) < spot.width && Math.abs(distToCenter - spot.radius) < 15) {
                  inSweetSpot = true;
                }
              });
            }
            
            if (inSweetSpot) {
              // SWEET SPOT BOOST: +15% velocity
              const boost = ARENA.sweetSpots[0].boost || 1.15;
              b.vx *= boost;
              b.vy *= boost;
              // Visual feedback
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
          // v3.5-HÍBRIDO: FRICÇÃO REDUZIDA (0.98 → 0.997)
          // Beyblades deslizam 2x mais longe após knockback!
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
        const currentFrame = Math.floor(Date.now() / 16.67);  // ~60fps
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
        
        if (!b.isOrbiting && distToCenter > physWall - b.radius) { // satellite guard
          
          // Verificar grace period global (bloqueia ring-out completamente)
          const graceCurrentTime = (Date.now() - battleStartTimeRef.current) / 1000;
          const inGracePeriod = ARENA.gracePeriod?.enabled &&
                                ARENA.gracePeriod?.wallRingOutDisabled &&
                                graceCurrentTime < ARENA.gracePeriod.duration;

          // BB10_COMPETITIVE: parede sólida NUNCA dá ring-out — só pockets após 2s
          // VOLCANIC_RAGE: parede sólida NUNCA dá ring-out — só KO térmico pelas fissuras
          const isCompetitive = arenaType === 'BB10_COMPETITIVE';
          const isVolcanic    = arenaType === 'VOLCANIC_RAGE';
          if ((isCompetitive || isVolcanic) && !inExit) {
            // Parede sólida: rebate, sem ring-out
          } else {
          const wallRingOutVelocity = inExit
            ? (isCompetitive ? 1.5 : 6)   // Pocket: ring-out com qualquer velocidade
            : 8.5;
          
          if (!inGracePeriod && velocity > wallRingOutVelocity && !winner && !burstTriggered) {
            // RING-OUT!
            b.ringOutTime = Date.now();
            
            const opponent = b === b1 ? b2 : b1;
            const timeDiff = opponent.ringOutTime ? Math.abs(b.ringOutTime - opponent.ringOutTime) : Infinity;
            
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
            // Velocidade baixa/média: rebate com dano proporcional
            const angle = Math.atan2(b.y - centerY, b.x - centerX);
            b.x = centerX + Math.cos(angle) * (physWall - b.radius);
            b.y = centerY + Math.sin(angle) * (physWall - b.radius);
            
            const normalX = Math.cos(angle);
            const normalY = Math.sin(angle);
            const dotProduct = b.vx * normalX + b.vy * normalY;
            
            b.vx = b.vx - 2 * dotProduct * normalX;
            b.vy = b.vy - 2 * dotProduct * normalY;
            
            const energyLoss = Math.min(0.85, 0.55 + velocity * 0.04);
            b.vx *= (1 - energyLoss);
            b.vy *= (1 - energyLoss);
            
            const wallDamage = 1.5 + velocity * 0.3;
            b.stamina -= wallDamage;
            b.burstDamage += 0.4 + velocity * 0.08;
            
            const particleCount = Math.min(30, 8 + Math.floor(velocity * 1.5));
            addParticle(b.x, b.y, '#ffffff', particleCount);
            if (velocity > 5) addParticle(b.x, b.y, '#ff4444', Math.floor(velocity * 2));
          }
          } // fecha else (isCompetitive && !inExit)
        }
      }
      
      function handleOctagonalArenaPhysics(b, bSpinPercent, velocity) {
        const nexusZones = ARENA.zones;
        const distToCenter = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
        
        // ═══════════════════════════════════════════════════════════
        // PORTAL SUCTION SYSTEM - Every 5 seconds
        // ═══════════════════════════════════════════════════════════
        const currentTime = Date.now() / 1000;
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
        // ARENA SLOPE VOLCANIC_RAGE
        // v3.5-HÍBRIDO: Dead Zone + Gravidade Reduzida + Cooldown
        // ═══════════════════════════════════════════════════════════════
        
        // Inicializar cooldown
        if (!b.gravityDisabledUntil) b.gravityDisabledUntil = 0;
        
        const DEAD_ZONE_RADIUS = 40;  // Centro livre
        const angleToCenter = Math.atan2(centerY - b.y, centerX - b.x);
        
        // Verificar cooldown
        const currentFrame = Math.floor(Date.now() / 16.67);
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
      
      checkCollision();
      
      // ============================================
      // 🆕 UPDATE LAUNCH PATTERNS
      // ============================================
      const deltaTime = 1/60; // 60 FPS
      
      // Phantom Launch - Update invisibility and opacity
      if (b1.isInvisible) {
        const elapsed = (Date.now() - b1.invisibleStartTime) / 1000;
        if (elapsed < b1.phantomDuration) {
          // Fade out/in effect during invisibility
          b1.opacity = 0.3 + Math.sin(elapsed * 8) * 0.2;
        } else {
          b1.isInvisible = false;
          b1.invulnerable = false;
          b1.opacity = 1.0;
        }
      } else {
        b1.opacity = 1.0;
      }
      
      if (b2.isInvisible) {
        const elapsed = (Date.now() - b2.invisibleStartTime) / 1000;
        if (elapsed < b2.phantomDuration) {
          b2.opacity = 0.3 + Math.sin(elapsed * 8) * 0.2;
        } else {
          b2.isInvisible = false;
          b2.invulnerable = false;
          b2.opacity = 1.0;
        }
      } else {
        b2.opacity = 1.0;
      }
      
      // Satellite Launch
      if (b1.updateOrbit) {
        b1.updateOrbit(deltaTime);
      }
      if (b2.updateOrbit) {
        b2.updateOrbit(deltaTime);
      }
      
      // Pendulum Launch
      if (b1.updatePendulum) {
        b1.updatePendulum(deltaTime);
      }
      if (b2.updatePendulum) {
        b2.updatePendulum(deltaTime);
      }
      
      // Vortex Launch
      if (b1.updateVortex) {
        b1.updateVortex(b2, deltaTime);
      }
      if (b2.updateVortex) {
        b2.updateVortex(b1, deltaTime);
      }
      
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
        const timeSinceLastHit = Date.now() - (b.lastHitTime || 0);
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

      // ⚔️ Aura épica do Signature em coords mundo (antes do drawBey que faz rotate)
      const b1SpinPct = b1.spinSpeed / (b1.stats?.maxSpin || 100);
      const b2SpinPct = b2.spinSpeed / (b2.stats?.maxSpin || 100);
      if (b1.bey?.isSignature && b1.alive) drawSignatureWorldAura(ctx, b1, b1.bey?.colors || [b1.color], b1SpinPct);
      if (b2.bey?.isSignature && b2.alive) drawSignatureWorldAura(ctx, b2, b2.bey?.colors || [b2.color], b2SpinPct);

      drawBey(b1);
      drawBey(b2);

      // ── VOLCANIC RAGE: Submersão visual (anel de aviso sobre beys submersos) ──
      if (arenaType === 'VOLCANIC_RAGE') {
        [b1, b2].forEach(b => {
          if (!b.alive || !b.submergedVisual) return;
          const timeSubmerged = b.submersionStartTime
            ? ((Date.now() - battleStartTimeRef.current) / 1000) - b.submersionStartTime
            : 0;
          const danger   = Math.min(1, timeSubmerged / ((ARENA.fissureSystem?.submersionDuration) || 2));
          const pulse    = Math.sin(Date.now() * 0.012) * 0.4 + 0.6;
          const ringR    = (b.radius || 18) + 8 + pulse * 4;
          const heatColor = danger > 0.6 ? '#ff0000' : '#ff6600';
          ctx.save();
          ctx.globalAlpha = 0.5 + pulse * 0.4;
          ctx.strokeStyle = heatColor;
          ctx.lineWidth   = 3;
          ctx.shadowBlur  = 12;
          ctx.shadowColor = heatColor;
          ctx.beginPath();
          ctx.arc(b.x, b.y, ringR, 0, Math.PI * 2);
          ctx.stroke();
          // Barra de perigo: arco que preenche conforme o tempo
          ctx.globalAlpha = 0.85;
          ctx.lineWidth   = 4;
          ctx.strokeStyle = danger > 0.6 ? '#ff0000' : '#ffaa00';
          ctx.beginPath();
          ctx.arc(b.x, b.y, ringR + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * danger);
          ctx.stroke();
          // Label
          ctx.globalAlpha = 0.9;
          ctx.fillStyle   = '#ffffff';
          ctx.font        = 'bold 9px sans-serif';
          ctx.textAlign   = 'center';
          ctx.shadowBlur  = 6;
          ctx.shadowColor = '#ff0000';
          ctx.fillText('🔥 THERMAL KO', b.x, b.y - ringR - 8);
          ctx.restore();
        });
      }

      // ⚔️ Badge do Signature (nome do blade, acima das barras)
      if (b1.bey?.isSignature && b1.alive) drawSignatureBadge(ctx, b1);
      if (b2.bey?.isSignature && b2.alive) drawSignatureBadge(ctx, b2);
      
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
      
      setStats({
        stamina1: Math.max(0, (b1.stamina / 250) * 100),
        stamina2: Math.max(0, (b2.stamina / 250) * 100),
        spin1: Math.max(0, (b1.spinSpeed / b1.stats.maxSpin) * 100),
        spin2: Math.max(0, (b2.spinSpeed / b2.stats.maxSpin) * 100),
        stability1: Math.max(0, (b1.stability / 150) * 100),
        stability2: Math.max(0, (b2.stability / 150) * 100)
      });
      
      // Update Battle HUD State
      setBattleState({
        stamina1: Math.max(0, (b1.stamina / 250) * 100),
        stamina2: Math.max(0, (b2.stamina / 250) * 100),
        spin1: Math.max(0, (b1.spinSpeed / b1.stats.maxSpin) * 100),
        spin2: Math.max(0, (b2.spinSpeed / b2.stats.maxSpin) * 100),
        stability1: Math.max(0, (b1.stability / 150) * 100),
        stability2: Math.max(0, (b2.stability / 150) * 100),
        time: (Date.now() - battleStartTimeRef.current) / 1000,
        bey1Combos: 0, // TODO: Add combo tracking
        bey2Combos: 0
      });
      
      // Record stats history for replay
      const currentTime = (Date.now() - battleStartTimeRef.current) / 1000;
      statsHistoryRef.current.push({
        time: currentTime,
        stamina1: Math.max(0, (b1.stamina / 150) * 100),
        stamina2: Math.max(0, (b2.stamina / 150) * 100),
        spin1: Math.max(0, (b1.spinSpeed / b1.stats.maxSpin) * 100),
        spin2: Math.max(0, (b2.spinSpeed / b2.stats.maxSpin) * 100)
      });
      
      if (winner) {
        endingTimer++;
        
        // Longer delay for burst to show pieces settling
        const delayFrames = (winMethod === 'Burst Finish') ? 120 : 90; // 2s for burst, 1.5s others
        
        if (endingTimer >= delayFrames) {
          // CORREÇÃO: Verificar se é DRAW antes de acessar propriedades do objeto
          const isDraw = winner === 'DRAW';
          
          onEnd({
            winner: isDraw ? 'DRAW' : winner.bey,
            loser: isDraw ? 'DRAW' : (winner === b1 ? b2.bey : b1.bey),
            method: winMethod,
            winnerStats: isDraw ? null : winner.stats,
            loserStats: isDraw ? null : (winner === b1 ? b2.stats : b1.stats),
            replayData: {
              events: replayEventsRef.current,
              statsHistory: statsHistoryRef.current,
              duration: (Date.now() - battleStartTimeRef.current) / 1000,
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
            }
          });
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

    }
    
    // ✅ TURBO: runFrame roda update() TURBO_STEPS vezes por quadro de render
    let _rafId;
    function runFrame() {
      for (let _s = 0; _s < TURBO_STEPS; _s++) {
        if (winner) break;
        update();
      }
      if (winner) update(); // render final quando há vencedor
      _rafId = requestAnimationFrame(runFrame);
    }
    runFrame();
    return () => cancelAnimationFrame(_rafId);
  }, [bey1, bey2, onEnd, md3State, introPhase]);

  return (
    <div className="relative h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-black flex items-center justify-center overflow-hidden">
      
      {/* CANVAS — centralizado na tela */}
      <div style={{ position: 'relative', width: '1000px', height: '700px', flexShrink: 0 }} className="border-4 border-gray-800 shadow-2xl">
        <canvas 
          ref={canvasRef} 
          width="1000" 
          height="700"
          style={{ display: 'block', width: '100%', height: '100%' }}
        />
        
        {/* Event Feed fica dentro do canvas */}
        {introPhase === 'battle' && (
          <EventFeed events={events} />
        )}
      </div>

      {/* CINEMATIC LAUNCH OVERLAY — fixed, cobre a tela toda */}
      {introPhase === 'rip' && showQualityText && (
        <LaunchSequenceOverlay 
          quality1={md3State.launchQuality1}
          quality2={md3State.launchQuality2}
          bey1Name={bey1?.team?.name || bey1?.name}
          bey2Name={bey2?.team?.name || bey2?.name}
          launch1={LAUNCH_TECHNIQUES[md3State.launch1 || 'STANDARD']}
          launch2={LAUNCH_TECHNIQUES[md3State.launch2 || 'STANDARD']}
          bey1={bey1}
          bey2={bey2}
          md3State={md3State}
        />
      )}

      {/* BATTLE HUD — fora do canvas, relativo ao h-screen inteiro */}
      {introPhase === 'battle' && (
        <BattleHUD 
          bey1={bey1}
          bey2={bey2}
          battleState={battleState}
          md3State={md3State}
        />
      )}
    </div>
  );
};


// ====================================================================
// REPLAY SCREEN - REDESIGNED (FASE 4)
// ====================================================================
// Sistema de fases lineares (sem tabs):
// victory -> highlights -> stats -> done
// ====================================================================


export { BattleArena };
