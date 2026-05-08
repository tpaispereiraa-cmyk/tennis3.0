// ============================================
// BATTLE PHYSICS
// Física geral de batalha (movimento, fricção, gravidade)
// ============================================

/**
 * Aplica fricção ao movimento do beyblade
 */
export function applyFriction(b, friction = 0.70, deltaTime = 1) {
  const frictionFactor = Math.pow(friction, deltaTime);
  b.vx *= frictionFactor;
  b.vy *= frictionFactor;
}

/**
 * Atualiza posição do beyblade baseado na velocidade
 */
export function updatePosition(b, deltaTime = 1) {
  b.x += b.vx * deltaTime;
  b.y += b.vy * deltaTime;
}

/**
 * Atualiza rotação do beyblade
 */
export function updateRotation(b, deltaTime = 1) {
  if (!b.rotation) b.rotation = 0;
  
  const rotationSpeed = b.spinSpeed * b.spinDirection * 0.1;
  b.rotation += rotationSpeed * deltaTime;
  
  // Keep rotation in bounds
  b.rotation = b.rotation % (Math.PI * 2);
}

/**
 * Aplica força centrípeta (puxa para o centro)
 */
export function applyCentripetalForce(b, centerX, centerY, force = 0.5, deltaTime = 1) {
  const dx = centerX - b.x;
  const dy = centerY - b.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance > 0) {
    const nx = dx / distance;
    const ny = dy / distance;
    
    b.vx += nx * force * deltaTime;
    b.vy += ny * force * deltaTime;
  }
}

/**
 * Reduz spin ao longo do tempo
 */
export function decaySpin(b, decayRate = 0.1, deltaTime = 1) {
  b.spinSpeed = Math.max(0, b.spinSpeed - decayRate * deltaTime);
}

/**
 * Calcula velocidade atual do beyblade
 */
export function getVelocity(b) {
  return Math.sqrt(b.vx ** 2 + b.vy ** 2);
}

/**
 * Calcula estabilidade baseado em spin e velocidade
 */
export function calculateStability(b, spinPercent, velocity) {
  const spinFactor = spinPercent / 100;
  const velocityFactor = Math.min(1, velocity / 200);
  
  return (spinFactor * 0.7 + (1 - velocityFactor) * 0.3) * 100;
}

/**
 * Verifica se beyblade está parado
 */
export function isStopped(b, minVelocity = 0.5, minSpin = 1) {
  const velocity = getVelocity(b);
  return velocity < minVelocity && b.spinSpeed < minSpin;
}

/**
 * Inicializa posição e velocidade do beyblade
 */
export function initializeBeybladePhysics(bey, centerX, centerY, launchTechnique, launchQuality, side = 1) {
  const technique = launchTechnique || { spinBonus: 0, stabilityBonus: 0, speedBonus: 0 };
  const quality = launchQuality || { spinBonus: 0 };
  
  // Position (opposite sides)
  const offsetX = side * 120;
  bey.x = centerX + offsetX;
  bey.y = centerY;
  
  // Velocity
  const baseSpeed = 3 + (technique.speedBonus || 0) * 0.5;
  const angle = side > 0 ? Math.PI : 0;
  bey.vx = Math.cos(angle) * baseSpeed;
  bey.vy = Math.sin(angle) * baseSpeed;
  
  // Spin
  const stats = bey.effectiveStats || bey.stats;
  const baseSpin = stats.spin || 35;
  const spinMultiplier = 1 + (technique.spinBonus + quality.spinBonus) / 100;
  bey.spinSpeed = baseSpin * spinMultiplier;
  
  // Spin direction (left or right)
  bey.spinDirection = Math.random() < 0.3 ? -1 : 1;
  
  // Rotation
  bey.rotation = 0;
  
  // Stability
  bey.stability = 100;
  
  return bey;
}
