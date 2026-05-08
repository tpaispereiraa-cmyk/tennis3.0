// ============================================
// BATTLEENGINE.JS v4.0 - MOTOR DE FÍSICA FRAME-A-FRAME ULTRA-REALISTA
// Sistema de simulação completa a 60 FPS com física avançada
// COORDENADAS EM PIXELS (centro: 500, 350)
// ============================================

// ARENA_CONFIG import removido — applyArenaModifiers eliminado

// ============================================
// 📐 CONSTANTES FÍSICAS UNIVERSAIS
// ============================================
const PHYSICS_CONSTANTS = {
  FPS: 60,
  FRAME_TIME: 1000 / 60,
  MIN_SPIN_SPEED: 0.5,
  COLLISION_ELASTICITY: 0.85,
  BURST_THRESHOLD: 100,
  PRECISION_DECIMALS: 6,
  BEYBLADE_RADIUS: 25 // pixels
};

// ============================================
// 🔬 CLASSE DE FÍSICA AVANÇADA
// ============================================
class AdvancedPhysics {
  /**
   * Calcula rugosidade da superfície de contato
   */
  static calculateContactSurface(bey) {
    const stats = bey.effectiveStats || bey.stats;
    const attackFactor = Math.min(40, stats.atk) / 40;
    const defenseFactor = Math.min(40, stats.def) / 40;
    const balanceFactor = Math.min(40, stats.bal) / 40;
    
    const surfaceRoughness = (
      attackFactor * 0.70 +
      (1 - defenseFactor) * 0.20 +
      (1 - balanceFactor) * 0.10
    );
    
    return Math.max(0.10, Math.min(0.95, surfaceRoughness));
  }

  /**
   * Determina direção de rotação
   */
  static getSpinDirection(bey) {
    const isLeftSpin = Math.random() < 0.3 || 
                       bey.type === 'Defense' || 
                       bey.type === 'Stamina';
    return isLeftSpin ? -1 : 1;
  }

  /**
   * Calcula massa efetiva
   */
  static calculateEffectiveMass(bey, spinSpeed, stability) {
    const stats = bey.effectiveStats || bey.stats;
    
    const structuralMass = stats.weight * 2.0;
    const defenseMass = stats.def * 0.8;
    const balanceMass = stats.bal * 0.5;
    const spinMass = spinSpeed * 0.15;
    const stabilityMass = stability * 0.6;
    
    return structuralMass + defenseMass + balanceMass + spinMass + stabilityMass;
  }
}

// ============================================
// 🎯 APLICAÇÃO DE MODIFICADORES
// ============================================

// REMOVIDO: applyArenaModifiers — feature de arena stat modifiers eliminada
// Arena preference agora é aplicada como FLAT ao BASE durante deck building (UniverseManager.js)

const applyFormMultiplier = (bey, multiplier) => {
  if (multiplier === 1.0) return bey;
  
  const modifiedBey = JSON.parse(JSON.stringify(bey));
  
  if (modifiedBey.effectiveStats) {
    Object.keys(modifiedBey.effectiveStats).forEach(stat => {
      if (typeof modifiedBey.effectiveStats[stat] === 'number') {
        modifiedBey.effectiveStats[stat] = Math.round(
          modifiedBey.effectiveStats[stat] * multiplier
        );
        modifiedBey.effectiveStats[stat] = Math.max(1, modifiedBey.effectiveStats[stat]);
      }
    });
  }
  
  return modifiedBey;
};

// ============================================
// 💥 SISTEMA DE COLISÃO ULTRA-DETALHADO
// ============================================

const calculateCollision = (b1, b2, frameTime) => {
  // ★ GEOMETRIA DA COLISÃO
  const dx = b2.x - b1.x;
  const dy = b2.y - b1.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  const collisionRadius = PHYSICS_CONSTANTS.BEYBLADE_RADIUS * 2;
  
  if (distance > collisionRadius || distance === 0) {
    return null;
  }
  
  const normal = { 
    x: dx / distance, 
    y: dy / distance 
  };
  const tangent = { x: -normal.y, y: normal.x };
  
  // ★ VELOCIDADES E MASSAS
  const vel1 = Math.sqrt(b1.vx ** 2 + b1.vy ** 2);
  const vel2 = Math.sqrt(b2.vx ** 2 + b2.vy ** 2);
  
  const mass1 = AdvancedPhysics.calculateEffectiveMass(b1.bey, b1.spinSpeed, b1.stability);
  const mass2 = AdvancedPhysics.calculateEffectiveMass(b2.bey, b2.spinSpeed, b2.stability);
  
  // ★ VELOCIDADE RELATIVA
  const relVelX = b1.vx - b2.vx;
  const relVelY = b1.vy - b2.vy;
  const relVelNormal = relVelX * normal.x + relVelY * normal.y;
  
  if (relVelNormal < 0) {
    return null; // já se afastando — não processar colisão
  }
  
  // ★ SUPERFÍCIE DE CONTATO
  const surface1 = AdvancedPhysics.calculateContactSurface(b1.bey);
  const surface2 = AdvancedPhysics.calculateContactSurface(b2.bey);
  const combinedRoughness = (surface1 + surface2) / 2;
  
  // ★ RESTITUIÇÃO
  const baseRestitution = PHYSICS_CONSTANTS.COLLISION_ELASTICITY;
  const roughnessPenalty = combinedRoughness * 0.15;
  const restitution = baseRestitution * (1 - roughnessPenalty);
  
  // ★ IMPULSO
  const reducedMass = (mass1 * mass2) / (mass1 + mass2);
  const impulseScalar = -(1 + restitution) * relVelNormal * reducedMass;
  
  // ★ ATTACK MULTIPLIERS
  const stats1 = b1.bey.effectiveStats || b1.bey.stats;
  const stats2 = b2.bey.effectiveStats || b2.bey.stats;
  const attackMult1 = 1.0 + (stats1.atk / 40);
  const attackMult2 = 1.0 + (stats2.atk / 40);
  
  // ★ KNOCKBACK
  const normalImpulse1 = (impulseScalar / mass1) * attackMult2 * 0.8;
  const normalImpulse2 = -(impulseScalar / mass2) * attackMult1 * 0.8;
  
  // ★ COMPONENTE TANGENCIAL
  const randomAngle = (Math.random() - 0.5) * 2;
  const maxDeviation = combinedRoughness * Math.PI * 0.4;
  const deviationAngle = randomAngle * maxDeviation;
  
  const rotatedTangentX = tangent.x * Math.cos(deviationAngle) - 
                          tangent.y * Math.sin(deviationAngle);
  const rotatedTangentY = tangent.x * Math.sin(deviationAngle) + 
                          tangent.y * Math.cos(deviationAngle);
  
  const tangentialFactor = combinedRoughness * (vel1 + vel2) * 0.15;
  
  // ★ SPIN TRANSFER
  const sameSpin = (b1.spinDirection === b2.spinDirection);
  let spinTransfer = 0;
  let knockbackMult = 1.0;
  let spinLoss1 = 0;
  let spinLoss2 = 0;
  
  if (sameSpin) {
    spinTransfer = 0.70;
    knockbackMult = 1.4;  // era 4.5 — combinado com velocityBoost resultava em 27x (BUG)
    // Cada um perde 40% do SEU próprio spin — preserva a diferença relativa entre eles
    spinLoss1 = b1.spinSpeed * 0.40;
    spinLoss2 = b2.spinSpeed * 0.40;
  } else {
    spinTransfer = 0.35;
    knockbackMult = 1.1;  // era 3.2
    spinLoss1 = b1.spinSpeed * 0.08;
    spinLoss2 = b2.spinSpeed * 0.08;
  }
  
  // ★ VELOCITY BOOST — calibrado para velocidades realistas (40–200 px/s)
  // Era: divisor 400 com exp 1.3 → gerava boost de 5–6x com 720 px/s (BUG CRÍTICO)
  const relativeVelocity = vel1 + vel2;
  const velocityBoost = Math.min(
    1.3,  // cap máximo
    1.0 + Math.pow(Math.max(0, relativeVelocity) / 300, 0.8)
  );
  
  // ★ APLICAR IMPULSOS
  // Era: knockbackMult 4.5 / 3.2 → combinado com velocityBoost dava 27x (BUG CRÍTICO)
  const finalKnockback1 = normalImpulse1 * knockbackMult * velocityBoost;
  const finalKnockback2 = normalImpulse2 * knockbackMult * velocityBoost;
  
  const newVx1 = b1.vx + normal.x * finalKnockback1;
  const newVy1 = b1.vy + normal.y * finalKnockback1;
  const newVx2 = b2.vx + normal.x * finalKnockback2;
  const newVy2 = b2.vy + normal.y * finalKnockback2;
  
  const tangent1 = {
    x: newVx1 + rotatedTangentX * tangentialFactor * surface1,
    y: newVy1 + rotatedTangentY * tangentialFactor * surface1
  };
  const tangent2 = {
    x: newVx2 - rotatedTangentX * tangentialFactor * surface2,
    y: newVy2 - rotatedTangentY * tangentialFactor * surface2
  };
  
  const spinBoost1 = b1.spinSpeed * spinTransfer * 0.15;
  const spinBoost2 = b2.spinSpeed * spinTransfer * 0.15;
  const boostAngle1 = Math.atan2(tangent1.y, tangent1.x) + (Math.random() - 0.5) * 0.8;
  const boostAngle2 = Math.atan2(tangent2.y, tangent2.x) + (Math.random() - 0.5) * 0.8;
  
  const finalVel1 = {
    x: tangent1.x + Math.cos(boostAngle1) * spinBoost1,
    y: tangent1.y + Math.sin(boostAngle1) * spinBoost1
  };
  const finalVel2 = {
    x: tangent2.x + Math.cos(boostAngle2) * spinBoost2,
    y: tangent2.y + Math.sin(boostAngle2) * spinBoost2
  };
  
  // ★ CÁLCULO DE DANO
  const impact1 = (stats1.atk * 0.80) * Math.pow(Math.max(0, vel1 / 100), 1.4) * (1 + surface1 * 0.6);
  const impact2 = (stats2.atk * 0.80) * Math.pow(Math.max(0, vel2 / 100), 1.4) * (1 + surface2 * 0.6);
  
  const defenseReduction1 = Math.max(0.25, 1.0 - (stats1.def / 75));
  const defenseReduction2 = Math.max(0.25, 1.0 - (stats2.def / 75));
  
  const damageMultiplier = sameSpin ? 1.5 : 1.0;
  const damage1 = (impact2 / mass1) * defenseReduction1 * damageMultiplier;
  const damage2 = (impact1 / mass2) * defenseReduction2 * damageMultiplier;
  
  return {
    collision: true,
    position: { x: (b1.x + b2.x) / 2, y: (b1.y + b2.y) / 2 },
    normal: normal,
    tangent: tangent,
    velocities: {
      b1: finalVel1,
      b2: finalVel2
    },
    damage: {
      b1: damage1,
      b2: damage2
    },
    spinLoss: {
      b1: spinLoss1,
      b2: spinLoss2
    },
    impact: {
      b1: impact1,
      b2: impact2
    },
    properties: {
      sameSpin,
      roughness: combinedRoughness,
      restitution,
      knockbackMultiplier: knockbackMult,
      velocityBoost
    }
  };
};

// ============================================
// 🏟️ ARENA PREFERENCE MODIFIER (per player mentality)
// Applies +6/+4/+2 or -6/-4/-2 to ALL blade effectiveStats
// based on how a player's mentality relates to the current arena.
// ============================================
const ARENA_PREF_MAP_ENGINE = {
  ALL_ROUNDER:        { fav:['BB10_COMPETITIVE','PANGEA_PLATFORM','DOMINATION_ZONES'],   hate:['PINBALL_INFERNO','VOLCANIC_RAGE','COLOSSEUM_CARNAGE'] },
  GLASS_CANNON:       { fav:['COLOSSEUM_CARNAGE','PINBALL_INFERNO','STORM_TRACK'],       hate:['KILLER_SIDES','VORTEX_COLISEUM','DOMINATION_ZONES'] },
  IRON_FORTRESS:      { fav:['NEXUS','DOMINATION_ZONES','PANGEA_PLATFORM'],              hate:['PINBALL_INFERNO','STORM_TRACK','COLOSSEUM_CARNAGE'] },
  ETERNAL_SPINNER:    { fav:['VORTEX_COLISEUM','KILLER_SIDES','TIDAL_SURGE'],            hate:['COLOSSEUM_CARNAGE','PINBALL_INFERNO','VOLCANIC_RAGE'] },
  CALCULATED_CHAOS:   { fav:['NEXUS','COLOSSEUM_CARNAGE','DOMINATION_ZONES'],            hate:['BB10_COMPETITIVE','KILLER_SIDES','PANGEA_PLATFORM'] },
  HIGH_RISK_GAMBLER:  { fav:['PINBALL_INFERNO','COLOSSEUM_CARNAGE','STORM_TRACK'],       hate:['BB10_COMPETITIVE','PANGEA_PLATFORM','DOMINATION_ZONES'] },
  MOMENTUM_MASTER:    { fav:['STORM_TRACK','TIDAL_SURGE','VORTEX_COLISEUM'],             hate:['PINBALL_INFERNO','VOLCANIC_RAGE','NEXUS'] },
  SYNERGY_SEEKER:     { fav:['DOMINATION_ZONES','NEXUS','PANGEA_PLATFORM'],              hate:['PINBALL_INFERNO','VOLCANIC_RAGE','COLOSSEUM_CARNAGE'] },
  ADAPTIVE_TACTICIAN: { fav:['NEXUS','DOMINATION_ZONES','BB10_COMPETITIVE'],             hate:['VOLCANIC_RAGE','KILLER_SIDES','VORTEX_COLISEUM'] },
  PERFECTIONIST:      { fav:['BB10_COMPETITIVE','PANGEA_PLATFORM','KILLER_SIDES'],       hate:['PINBALL_INFERNO','COLOSSEUM_CARNAGE','TIDAL_SURGE'] },
  CHAOS_AGENT:        { fav:['PINBALL_INFERNO','VOLCANIC_RAGE','COLOSSEUM_CARNAGE'],     hate:['BB10_COMPETITIVE','PANGEA_PLATFORM','NEXUS'] },
  MOMENTUM_THIEF:     { fav:['KILLER_SIDES','DOMINATION_ZONES','STORM_TRACK'],           hate:['TIDAL_SURGE','VORTEX_COLISEUM','PANGEA_PLATFORM'] },
};
const ARENA_FAV_MODS  = [6, 4, 2];
const ARENA_HATE_MODS = [-6, -4, -2];

/**
 * Returns flat modifier (+6/+4/+2/-6/-4/-2/0) for a player's mentality in a given arena key.
 */
export const getArenaModifier = (mentality, arenaKey) => {
  const prefs = ARENA_PREF_MAP_ENGINE[mentality] || ARENA_PREF_MAP_ENGINE.ALL_ROUNDER;
  const fi = prefs.fav.indexOf(arenaKey);
  if (fi  >= 0) return ARENA_FAV_MODS[fi];
  const hi = prefs.hate.indexOf(arenaKey);
  if (hi >= 0) return ARENA_HATE_MODS[hi];
  return 0;
};

/**
 * Applies arena preference modifier to all effectiveStats of a bey.
 * @param {object} bey          - bey object with effectiveStats
 * @param {string} arenaKey     - internal arena key (e.g. 'BB10_COMPETITIVE')
 * @param {string} mentality    - player mentality string
 */
export const applyArenaPreferenceModifier = (bey, arenaKey, mentality) => {
  if (!bey || !arenaKey || !mentality) return bey;
  const mod = getArenaModifier(mentality, arenaKey);
  if (mod === 0) return bey;
  const modified = JSON.parse(JSON.stringify(bey));
  if (!modified.effectiveStats) return modified;
  Object.keys(modified.effectiveStats).forEach(stat => {
    if (typeof modified.effectiveStats[stat] === 'number') {
      modified.effectiveStats[stat] = Math.max(1, modified.effectiveStats[stat] + mod);
    }
  });
  // Store the modifier info for HUD display
  modified._arenaPreferenceMod = mod;
  return modified;
};

export { 
  applyFormMultiplier,
  calculateCollision,
  AdvancedPhysics,
  PHYSICS_CONSTANTS
};
