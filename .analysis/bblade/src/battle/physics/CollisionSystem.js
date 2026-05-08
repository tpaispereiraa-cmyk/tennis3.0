// ============================================
// COLLISION SYSTEM
// Sistema de detecção e resolução de colisões
// ============================================

import { 
  applyArenaModifiers, 
  applyFormMultiplier, 
  calculateCollision 
} from '../../BattleEngine.js';

/**
 * Verifica se dois beyblades estão colidindo
 */
export function checkCollision(b1, b2) {
  const dx = b2.x - b1.x;
  const dy = b2.y - b1.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const minDistance = 50; // 2 * radius (25px each)
  
  return distance < minDistance;
}

/**
 * Calcula resultado da colisão entre dois beyblades
 */
export function resolveCollision(b1, b2, frameTime = 1000/60) {
  return calculateCollision(b1, b2, frameTime);
}

/**
 * Aplica resultado da colisão aos beyblades
 */
export function applyCollisionResult(b1, b2, collisionResult) {
  if (!collisionResult || !collisionResult.collision) return;
  
  // Apply velocities
  b1.vx = collisionResult.velocities.b1.x;
  b1.vy = collisionResult.velocities.b1.y;
  b2.vx = collisionResult.velocities.b2.x;
  b2.vy = collisionResult.velocities.b2.y;
  
  // Apply spin loss
  b1.spinSpeed = Math.max(0, b1.spinSpeed - collisionResult.spinLoss.b1);
  b2.spinSpeed = Math.max(0, b2.spinSpeed - collisionResult.spinLoss.b2);
  
  return {
    damage1: collisionResult.damage.b1,
    damage2: collisionResult.damage.b2,
    impact1: collisionResult.impact.b1,
    impact2: collisionResult.impact.b2,
    position: collisionResult.position
  };
}

/**
 * Verifica colisão com parede da arena
 */
export function checkWallCollision(b, centerX, centerY, arenaRadius) {
  const distanceFromCenter = Math.sqrt(
    (b.x - centerX) ** 2 + (b.y - centerY) ** 2
  );
  
  return distanceFromCenter > arenaRadius;
}

/**
 * Resolve colisão com parede
 */
export function resolveWallCollision(b, centerX, centerY, arenaRadius, restitution = 0.7) {
  const dx = b.x - centerX;
  const dy = b.y - centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance > arenaRadius) {
    // Normalize
    const nx = dx / distance;
    const ny = dy / distance;
    
    // Push back inside
    b.x = centerX + nx * arenaRadius;
    b.y = centerY + ny * arenaRadius;
    
    // Reflect velocity
    const dotProduct = b.vx * nx + b.vy * ny;
    b.vx = (b.vx - 2 * dotProduct * nx) * restitution;
    b.vy = (b.vy - 2 * dotProduct * ny) * restitution;
    
    return true;
  }
  
  return false;
}
