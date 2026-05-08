// ============================================
// ARENA PHYSICS
// Físicas específicas de cada arena
// ============================================

import { ARENA_CONFIGS } from './ArenaConfigs.js';

/**
 * Aplica física específica da arena Volcanic Rage
 *
 * Zonas:
 *   Magma Core    (r 0–50)  : fricção 0.94, acumula heat, knockback preservado
 *   Lava Flow Ring(r50–140) : lava flows dinâmicos, drag ×0.95, stamina drain
 *   Obsidian Belt (r140–190): fricção 0.92, micro-reflexões 15% velocity loss
 *   Crater Edge   (r190–221): fendas vulcânicas, submersão em vez de ring-out
 */
export function handleVolcanicRagePhysics(b, bSpinPercent, velocity, arenaState) {
  const arena = ARENA_CONFIGS.VOLCANIC_RAGE;
  const zones = arena.zones;
  const distanceFromCenter = Math.sqrt(b.x ** 2 + b.y ** 2);

  // ── 1. FRICÇÃO POR ZONA ────────────────────────────────────────
  let zoneFriction;
  if (distanceFromCenter < zones.magmaCore) {
    zoneFriction = arena.frictionGradient.magmaCore.friction;
  } else if (distanceFromCenter < zones.lavaFlowRing) {
    zoneFriction = arena.frictionGradient.lavaFlowRing.friction;
  } else if (distanceFromCenter < zones.obsidianBelt) {
    zoneFriction = arena.frictionGradient.obsidianBelt.friction;
  } else {
    zoneFriction = arena.frictionGradient.craterEdge.friction;
  }

  // ── 2. LAVA RIVER DRAG (bey sobre rio de lava rotativo) ───────
  if (b.onLavaRiver) {
    // Rio de lava: já aplica pushForce na física principal (BattleArena)
    // Aqui apenas drena stamina adicional
    b.stamina -= (arena.lavaRivers?.staminaDrain || 2) / 60;
  }

  // ── 3. OBSIDIAN BELT — corrente orbital ───────────────────────
  if (distanceFromCenter >= zones.lavaFlowRing && distanceFromCenter < zones.obsidianBelt) {
    const oc = arena.obsidianCurrent;
    if (oc) {
      const tangAngle = Math.atan2(b.y, b.x) + Math.PI / 2 * oc.direction;
      b.vx += Math.cos(tangAngle) * oc.tangentialForce;
      b.vy += Math.sin(tangAngle) * oc.tangentialForce;
    }
  }

  // ── 4. ERUPTION EVENT (disparado pelo heatSystem, aplicado aqui) ──
  if (arenaState.eruptionActive) {
    const eruptionElapsed = (arenaState.time - arenaState.eruptionStartTime);
    if (eruptionElapsed < arena.eruptionEvent.duration) {
      const pushAngle = Math.atan2(b.y, b.x);
      const force = arena.eruptionEvent.outwardForce;
      b.vx += Math.cos(pushAngle) * force;
      b.vy += Math.sin(pushAngle) * force;
    }
  }

  // ── 5. LAVA BOMBS pós-erupção ─────────────────────────────────
  if (arenaState.lavaBombs && arenaState.lavaBombs.length > 0) {
    const bombs = arena.eruptionEvent.lavaBombs;
    for (const bomb of arenaState.lavaBombs) {
      const dist = Math.sqrt((b.x - bomb.x) ** 2 + (b.y - bomb.y) ** 2);
      if (dist < bombs.radius && !bomb.hit) {
        bomb.hit = true;
        const pushAngle = Math.atan2(b.y - bomb.y, b.x - bomb.x);
        b.vx += Math.cos(pushAngle) * bombs.knockback;
        b.vy += Math.sin(pushAngle) * bombs.knockback;
        b.stamina   -= bombs.staminaDrain;
        b.stability -= bombs.stabilityDrain;
      }
    }
    // Remove bombs já usadas ou expiradas
    arenaState.lavaBombs = arenaState.lavaBombs.filter(bm => !bm.hit && (arenaState.time - bm.spawnTime) < 2.0);
  }

  // ── 6. FISSURE SYSTEM (Crater Edge) ──────────────────────────
  if (distanceFromCenter >= zones.obsidianBelt && arena.fissureSystem.open) {
    const fissures = arena.fissureSystem;
    const bAngle = Math.atan2(b.y, b.x);
    const normalizedBAngle = ((bAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    for (let i = 0; i < fissures.count; i++) {
      const fissureAngle = fissures.baseAngle + i * fissures.spreadAngle;
      const normalizedFA = ((fissureAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const halfWidth = (fissures.width / (distanceFromCenter * 2)) * (Math.PI);
      let angleDiff = Math.abs(normalizedBAngle - normalizedFA);
      if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

      if (angleDiff < halfWidth && distanceFromCenter > zones.obsidianBelt) {
        // Entra em submersão
        if (!b.submerged) {
          b.submerged = true;
          b.submersionStartTime = arenaState.time;
        }
      }
    }
  }

  // Efeito de submersão
  if (b.submerged) {
    const timeSubmerged = arenaState.time - (b.submersionStartTime || arenaState.time);
    b.vx *= arena.fissureSystem.dragMultiplier;
    b.vy *= arena.fissureSystem.dragMultiplier;
    b.stamina -= (arena.fissureSystem.spinDrainPerSec / 60);
    // KO térmico após 2s submersa
    if (timeSubmerged >= arena.fissureSystem.submersionDuration) {
      b.alive = false;
      b.submerged = false;
    }
  }

  return zoneFriction;
}

// Mantém o alias antigo apontando para a nova função
export { handleVolcanicRagePhysics as handleIronCruciblePhysics };

/**
 * Aplica física específica da arena Pangea Platform
 */
export function handlePangeaPlatformPhysics(b, bSpinPercent, velocity, arenaState) {
  const arena = ARENA_CONFIGS.PANGEA_PLATFORM;
  let friction = 0.70;
  
  // Platform collision
  if (arenaState.platforms) {
    for (const platform of arenaState.platforms) {
      if (Math.abs(b.x - platform.x) < platform.width / 2 &&
          Math.abs(b.y - platform.y) < platform.height / 2) {
        // On platform - reflect
        if (Math.abs(b.vx) > Math.abs(b.vy)) {
          b.vx *= -0.8;
        } else {
          b.vy *= -0.8;
        }
        friction = 0.90; // High friction on platforms
      }
    }
  }
  
  return friction;
}

/**
 * Aplica física específica da arena Pinball Inferno
 */
export function handlePinballInfernoPhysics(b, bSpinPercent, velocity, arenaState) {
  const arena = ARENA_CONFIGS.PINBALL_INFERNO;
  let friction = 0.50; // Base low friction
  
  // Bumper collisions
  if (arenaState.bumpers) {
    for (const bumper of arenaState.bumpers) {
      const dist = Math.sqrt((b.x - bumper.x) ** 2 + (b.y - bumper.y) ** 2);
      if (dist < bumper.radius + 25) {
        const angle = Math.atan2(b.y - bumper.y, b.x - bumper.x);
        const force = bumper.force || 8;
        b.vx = Math.cos(angle) * force;
        b.vy = Math.sin(angle) * force;
      }
    }
  }
  
  return friction;
}

/**
 * Aplica física específica da arena Vortex Coliseum
 */
export function handleVortexColiseumPhysics(b, bSpinPercent, velocity, arenaState) {
  const arena = ARENA_CONFIGS.VORTEX_COLISEUM;
  const distanceFromCenter = Math.sqrt(b.x ** 2 + b.y ** 2);
  
  let friction = 0.70;
  
  // Vortex effect in center
  if (distanceFromCenter < arena.zones.vortexCore) {
    const angle = Math.atan2(b.y, b.x);
    const tangentAngle = angle + Math.PI / 2;
    const vortexForce = (1 - distanceFromCenter / arena.zones.vortexCore) * 2.5;
    
    b.vx += Math.cos(tangentAngle) * vortexForce;
    b.vy += Math.sin(tangentAngle) * vortexForce;
    
    friction = 0.40; // Very low in vortex
  }
  
  return friction;
}

/**
 * Aplica física específica da arena Speedway Circuit
 */
export function handleSpeedwayCircuitPhysics(b, bSpinPercent, velocity, arenaState) {
  const arena = ARENA_CONFIGS.SPEEDWAY_CIRCUIT;
  let friction = 0.30; // Base very low friction
  
  // Boost pads
  if (arenaState.boostPads) {
    for (const pad of arenaState.boostPads) {
      if (Math.abs(b.x - pad.x) < 30 && Math.abs(b.y - pad.y) < 30) {
        const boostAngle = pad.angle || 0;
        const boostForce = pad.force || 5;
        b.vx += Math.cos(boostAngle) * boostForce;
        b.vy += Math.sin(boostAngle) * boostForce;
      }
    }
  }
  
  return friction;
}

/**
 * Aplica física específica da arena Domination Zones
 */
export function handleDominationZonesPhysics(b, bSpinPercent, velocity, arenaState) {
  const arena = ARENA_CONFIGS.DOMINATION_ZONES;
  let friction = 0.70;
  
  // Zone bonuses
  if (arenaState.zones) {
    for (const zone of arenaState.zones) {
      const distToZone = Math.sqrt((b.x - zone.x) ** 2 + (b.y - zone.y) ** 2);
      if (distToZone < zone.radius) {
        friction = zone.friction || 0.60;
        // Apply zone bonus if controlled
        if (zone.controller === b.id) {
          b.spinSpeed += 0.2; // Small spin bonus
        }
      }
    }
  }
  
  return friction;
}

/**
 * Aplica física específica da arena Tidal Surge
 */
export function handleTidalSurgePhysics(b, bSpinPercent, velocity, arenaState) {
  const arena = ARENA_CONFIGS.TIDAL_SURGE;
  let friction = 0.65;
  
  // Wave effects
  if (arenaState.currentWave) {
    const wave = arenaState.currentWave;
    const waveAngle = wave.angle || 0;
    const waveForce = wave.force || 3;
    
    b.vx += Math.cos(waveAngle) * waveForce * 0.1;
    b.vy += Math.sin(waveAngle) * waveForce * 0.1;
    
    friction = 0.40; // Lower friction during waves
  }
  
  return friction;
}

/**
 * Aplica física específica da arena Storm Track
 */
export function handleStormTrackPhysics(b, bSpinPercent, velocity, arenaState) {
  let friction = 0.70;
  
  // Wind effects
  if (arenaState.windActive) {
    const wind = arenaState.wind || { angle: 0, force: 0 };
    b.vx += Math.cos(wind.angle) * wind.force * 0.05;
    b.vy += Math.sin(wind.angle) * wind.force * 0.05;
  }
  
  // Rain effects (increased friction)
  if (arenaState.rainActive) {
    friction = 0.85;
  }
  
  return friction;
}

/**
 * Aplica física para arenas circulares padrão
 */
export function handleCircularArenaPhysics(b, bSpinPercent, velocity, arenaState) {
  return 0.70; // Standard friction
}

/**
 * Aplica física para arenas octogonais
 */
export function handleOctagonalArenaPhysics(b, bSpinPercent, velocity, arenaState) {
  return 0.70; // Standard friction
}

/**
 * Selector function - escolhe a física correta baseado no tipo de arena
 */
export function applyArenaPhysics(arenaType, b1, b2, bSpinPercent1, bSpinPercent2, velocity1, velocity2, arenaState) {
  let friction1 = 0.70;
  let friction2 = 0.70;
  
  switch(arenaType) {
    case 'VOLCANIC_RAGE':
      friction1 = handleVolcanicRagePhysics(b1, bSpinPercent1, velocity1, arenaState);
      friction2 = handleVolcanicRagePhysics(b2, bSpinPercent2, velocity2, arenaState);
      break;
    case 'PANGEA_PLATFORM':
      friction1 = handlePangeaPlatformPhysics(b1, bSpinPercent1, velocity1, arenaState);
      friction2 = handlePangeaPlatformPhysics(b2, bSpinPercent2, velocity2, arenaState);
      break;
    case 'PINBALL_INFERNO':
      friction1 = handlePinballInfernoPhysics(b1, bSpinPercent1, velocity1, arenaState);
      friction2 = handlePinballInfernoPhysics(b2, bSpinPercent2, velocity2, arenaState);
      break;
    case 'VORTEX_COLISEUM':
      friction1 = handleVortexColiseumPhysics(b1, bSpinPercent1, velocity1, arenaState);
      friction2 = handleVortexColiseumPhysics(b2, bSpinPercent2, velocity2, arenaState);
      break;
    case 'SPEEDWAY_CIRCUIT':
      friction1 = handleSpeedwayCircuitPhysics(b1, bSpinPercent1, velocity1, arenaState);
      friction2 = handleSpeedwayCircuitPhysics(b2, bSpinPercent2, velocity2, arenaState);
      break;
    case 'DOMINATION_ZONES':
      friction1 = handleDominationZonesPhysics(b1, bSpinPercent1, velocity1, arenaState);
      friction2 = handleDominationZonesPhysics(b2, bSpinPercent2, velocity2, arenaState);
      break;
    case 'TIDAL_SURGE':
      friction1 = handleTidalSurgePhysics(b1, bSpinPercent1, velocity1, arenaState);
      friction2 = handleTidalSurgePhysics(b2, bSpinPercent2, velocity2, arenaState);
      break;
    case 'STORM_TRACK':
      friction1 = handleStormTrackPhysics(b1, bSpinPercent1, velocity1, arenaState);
      friction2 = handleStormTrackPhysics(b2, bSpinPercent2, velocity2, arenaState);
      break;
    default:
      friction1 = handleCircularArenaPhysics(b1, bSpinPercent1, velocity1, arenaState);
      friction2 = handleCircularArenaPhysics(b2, bSpinPercent2, velocity2, arenaState);
  }
  
  return { friction1, friction2 };
}
