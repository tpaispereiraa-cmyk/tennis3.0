// ============================================
// ARENA RENDERER
// Renderização visual das arenas
// ============================================

import { ARENA_CONFIGS } from '../arena/ArenaConfigs.js';

/**
 * Desenha iluminação da arena
 */
export function drawArenaLighting(ctx, centerX, centerY, arenaType) {
  const arena = ARENA_CONFIGS[arenaType] || ARENA_CONFIGS.BB10_COMPETITIVE;
  
  ctx.save();
  
  // Radial gradient for lighting effect
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 250);
  gradient.addColorStop(0, 'rgba(255,255,255,0.1)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.05)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.3)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  
  ctx.restore();
}

/**
 * Desenha arena circular (BB-10)
 */
export function drawCircularArena(ctx, centerX, centerY, config) {
  const zones = config.zones;
  const colors = config.colors;
  
  ctx.save();
  ctx.translate(centerX, centerY);
  
  // Wall
  ctx.fillStyle = colors.wall || '#505a68';
  ctx.beginPath();
  ctx.arc(0, 0, zones.wall, 0, Math.PI * 2);
  ctx.fill();
  
  // Outer slope
  ctx.fillStyle = colors.outer || '#6a7888';
  ctx.beginPath();
  ctx.arc(0, 0, zones.outerSlope, 0, Math.PI * 2);
  ctx.fill();
  
  // Tornado ridge
  if (zones.tornadoRidge) {
    ctx.fillStyle = colors.ridge || '#8898aa';
    ctx.beginPath();
    ctx.arc(0, 0, zones.tornadoRidge, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Inner slope
  ctx.fillStyle = colors.inner || '#b0bcc8';
  ctx.beginPath();
  ctx.arc(0, 0, zones.innerSlope, 0, Math.PI * 2);
  ctx.fill();
  
  // Center bowl
  ctx.fillStyle = colors.center || '#d0d8e0';
  ctx.beginPath();
  ctx.arc(0, 0, zones.centerBowl, 0, Math.PI * 2);
  ctx.fill();
  
  // Exits (pockets)
  if (config.exits && config.exitsOpen) {
    ctx.fillStyle = '#000000';
    config.exits.forEach(exit => {
      ctx.save();
      ctx.rotate(exit.angle);
      ctx.fillRect(zones.wall - 10, -exit.width / 2, 15, exit.width);
      ctx.restore();
    });
  }
  
  ctx.restore();
}

/**
 * Desenha arena tipo bowl (Volcanic Rage, etc)
 */
export function drawBowlArena(ctx, centerX, centerY, config) {
  const zones = config.zones;
  const colors = config.colors;
  
  ctx.save();
  ctx.translate(centerX, centerY);
  
  // Wall
  ctx.fillStyle = colors.wall || '#8b7888';
  ctx.beginPath();
  ctx.arc(0, 0, zones.wall, 0, Math.PI * 2);
  ctx.fill();
  
  // Outer zone
  if (zones.outerZone) {
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, zones.outerZone);
    gradient.addColorStop(0, colors.center || '#9b2020');
    gradient.addColorStop(0.5, colors.mid || '#4a3844');
    gradient.addColorStop(1, colors.outer || '#252040');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, zones.outerZone, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Center
  ctx.fillStyle = colors.center || '#9b2020';
  ctx.beginPath();
  ctx.arc(0, 0, zones.centerBowl, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}

/**
 * Desenha arena octogonal
 */
export function drawOctagonalArena(ctx, centerX, centerY, config) {
  const size = config.zones?.wall || 220;
  const colors = config.colors || {};
  
  ctx.save();
  ctx.translate(centerX, centerY);
  
  // Draw octagon
  const sides = 8;
  const angleStep = (Math.PI * 2) / sides;
  
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = angleStep * i;
    const x = Math.cos(angle) * size;
    const y = Math.sin(angle) * size;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
  gradient.addColorStop(0, colors.center || '#d0d8e0');
  gradient.addColorStop(0.5, colors.mid || '#8898aa');
  gradient.addColorStop(1, colors.outer || '#505a68');
  ctx.fillStyle = gradient;
  ctx.fill();
  
  ctx.strokeStyle = colors.wall || '#000';
  ctx.lineWidth = 4;
  ctx.stroke();
  
  ctx.restore();
}

/**
 * Função principal para desenhar arena
 */
export function drawArena(ctx, centerX, centerY, arenaType) {
  const config = ARENA_CONFIGS[arenaType] || ARENA_CONFIGS.BB10_COMPETITIVE;
  
  // Clear arena area
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  
  // Draw based on type
  if (config.type === 'circular') {
    drawCircularArena(ctx, centerX, centerY, config);
  } else if (config.type === 'bowl') {
    drawBowlArena(ctx, centerX, centerY, config);
  } else if (config.type === 'octagonal') {
    drawOctagonalArena(ctx, centerX, centerY, config);
  } else {
    // Default circular
    drawCircularArena(ctx, centerX, centerY, config);
  }
  
  // Draw lighting
  drawArenaLighting(ctx, centerX, centerY, arenaType);
}
