// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 ENHANCED RENDERER - SISTEMA VISUAL PREMIUM
// ═══════════════════════════════════════════════════════════════════════════════
// 
// ARQUIVO SEPARADO - Adicione na pasta src/
// Este arquivo contém todo o sistema de renderização premium
//
// ═══════════════════════════════════════════════════════════════════════════════

export class EnhancedParticleSystem {
  constructor() {
    this.particles = [];
    this.pool = [];
    this.maxParticles = 2000;
    this.initPool();
  }
  
  initPool() {
    for (let i = 0; i < this.maxParticles; i++) {
      this.pool.push({
        active: false,
        x: 0, y: 0,
        vx: 0, vy: 0,
        size: 5,
        color: '#fff',
        life: 1,
        maxLife: 1,
        rotation: 0,
        rotationSpeed: 0,
        shape: 'circle',
        glow: false,
        glowIntensity: 10,
        trail: false,
        trailPoints: [],
        gravity: 0,
        friction: 0.98,
      });
    }
  }
  
  emit(config) {
    if (this.particles.length >= this.maxParticles) return;
    
    const count = config.count || 1;
    for (let i = 0; i < count; i++) {
      let p = this.pool.find(p => !p.active);
      if (!p) continue;
      
      p.active = true;
      p.x = config.x + (Math.random() - 0.5) * (config.spread || 0);
      p.y = config.y + (Math.random() - 0.5) * (config.spread || 0);
      
      const angle = config.angle !== undefined 
        ? config.angle + (Math.random() - 0.5) * (config.angleSpread || 0)
        : Math.random() * Math.PI * 2;
      const speed = (config.speed || 2) * (1 + (Math.random() - 0.5) * 0.5);
      
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.color = config.color || '#fff';
      p.size = (config.size || 5) * (1 + (Math.random() - 0.5) * 0.3);
      p.shape = config.shape || 'circle';
      p.life = 1;
      p.maxLife = config.lifetime || 1;
      p.rotation = Math.random() * Math.PI * 2;
      p.rotationSpeed = (Math.random() - 0.5) * 0.1;
      p.glow = config.glow || false;
      p.glowIntensity = config.glowIntensity || 10;
      p.gravity = config.gravity || 0;
      p.friction = config.friction || 0.98;
      p.trail = config.trail || false;
      p.trailPoints = [];
      
      this.particles.push(p);
    }
  }
  
  update(deltaTime = 1/60) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      p.life -= deltaTime / p.maxLife;
      if (p.life <= 0) {
        p.active = false;
        this.particles.splice(i, 1);
        continue;
      }
      
      if (p.trail && Math.random() < 0.3) {
        p.trailPoints.push({ x: p.x, y: p.y, life: 1 });
        if (p.trailPoints.length > 8) p.trailPoints.shift();
      }
      
      p.trailPoints.forEach(t => t.life *= 0.9);
      p.trailPoints = p.trailPoints.filter(t => t.life > 0.1);
      
      p.vy += p.gravity * deltaTime * 60;
      p.vx *= p.friction;
      p.vy *= p.friction;
      p.x += p.vx * deltaTime * 60;
      p.y += p.vy * deltaTime * 60;
      p.rotation += p.rotationSpeed;
    }
  }
  
  render(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; // Efeito aditivo
    
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.life;
      
      // Trail
      if (p.trail && p.trailPoints.length > 0) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * 0.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        const first = p.trailPoints[0];
        ctx.moveTo(first.x, first.y);
        p.trailPoints.forEach(pt => {
          ctx.globalAlpha = p.life * pt.life;
          ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        ctx.globalAlpha = p.life;
      }
      
      // Glow
      if (p.glow) {
        ctx.shadowBlur = p.glowIntensity * p.life;
        ctx.shadowColor = p.color;
      }
      
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;
      
      // Desenhar forma
      switch(p.shape) {
        case 'star':
          this.drawStar(ctx, 0, 0, 5, p.size * 1.5, p.size * 0.7);
          break;
        case 'ring':
          ctx.lineWidth = Math.max(1, p.size * 0.3);
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.stroke();
          break;
        case 'spark':
          ctx.lineWidth = 2;
          for (let i = 0; i < 4; i++) {
            const angle = (Math.PI / 2) * i;
            const length = p.size * (0.8 + Math.random() * 0.4);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
            ctx.stroke();
          }
          break;
        case 'diamond':
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size * 0.6, 0);
          ctx.lineTo(0, p.size);
          ctx.lineTo(-p.size * 0.6, 0);
          ctx.closePath();
          ctx.fill();
          break;
        default: // circle
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
      }
      
      ctx.restore();
    }
    
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
  }
  
  drawStar(ctx, cx, cy, spikes, outerR, innerR) {
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
      let x = cx + Math.cos(rot) * outerR;
      let y = cy + Math.sin(rot) * outerR;
      ctx.lineTo(x, y);
      rot += step;
      x = cx + Math.cos(rot) * innerR;
      y = cy + Math.sin(rot) * innerR;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerR);
    ctx.closePath();
    ctx.fill();
  }
  
  clear() {
    this.particles.forEach(p => p.active = false);
    this.particles = [];
  }
}

export class EnhancedImpactEffects {
  constructor(particleSystem) {
    this.particleSystem = particleSystem;
    this.shockwaves = [];
  }
  
  createShockwave(x, y, intensity = 1) {
    this.shockwaves.push({
      x, y,
      radius: 5,
      maxRadius: 80 * intensity,
      life: 1,
      speed: 6 * intensity,
      thickness: 6 * intensity,
    });
  }
  
  createExplosion(x, y, color, intensity = 1) {
    const count = Math.floor(30 * intensity);
    
    // Anel principal de partículas
    this.particleSystem.emit({
      x, y,
      count: count,
      speed: 8 * intensity,
      size: 4,
      color: color,
      lifetime: 0.8,
      spread: 10,
      glow: true,
      glowIntensity: 15,
      trail: true,
      gravity: 0.1,
    });
    
    // Sparks amarelos
    this.particleSystem.emit({
      x, y,
      count: Math.floor(15 * intensity),
      speed: 12 * intensity,
      size: 2,
      color: '#ffff00',
      lifetime: 0.5,
      glow: true,
      shape: 'spark',
      gravity: 0.3,
    });
    
    // Core glow branco
    this.particleSystem.emit({
      x, y,
      count: 5,
      speed: 2,
      size: 15,
      color: '#ffffff',
      lifetime: 0.3,
      spread: 5,
      glow: true,
      glowIntensity: 25,
    });
    
    // Ring particles
    this.particleSystem.emit({
      x, y,
      count: 8,
      speed: 5 * intensity,
      size: 6,
      color: color,
      lifetime: 1.2,
      glow: true,
      shape: 'ring',
    });
  }
  
  update(deltaTime = 1/60) {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.radius += s.speed;
      s.life = 1 - (s.radius / s.maxRadius);
      if (s.life <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }
  }
  
  render(ctx) {
    for (const s of this.shockwaves) {
      ctx.save();
      ctx.globalAlpha = s.life * 0.8;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = s.thickness;
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Inner ring
      ctx.globalAlpha = s.life * 0.4;
      ctx.lineWidth = s.thickness * 0.5;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius - s.thickness, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.restore();
    }
  }
}

// Helper functions
export function lightenColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

export function darkenColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
  const B = Math.max(0, (num & 0x0000FF) - amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

// Render premium beyblade
export function renderPremiumBeyblade(ctx, b, beyData, time) {
  const { x, y, radius, rotation } = b;
  const { colors, type } = beyData;
  const velocity = Math.sqrt(b.vx ** 2 + b.vy ** 2);
  
  ctx.save();
  ctx.translate(x, y);
  
  // Sombra suave
  ctx.globalAlpha = 0.4;
  ctx.shadowBlur = 15 + velocity * 2;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowOffsetY = 5 + velocity * 0.5;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  
  ctx.rotate(rotation);
  
  // Driver (base metálica)
  const driverRadius = radius * 0.3;
  const driverGrad = ctx.createRadialGradient(-2, -2, 0, 0, 0, driverRadius);
  driverGrad.addColorStop(0, '#d0d0d0');
  driverGrad.addColorStop(0.3, '#a0a0a0');
  driverGrad.addColorStop(0.7, '#707070');
  driverGrad.addColorStop(1, '#505050');
  ctx.fillStyle = driverGrad;
  ctx.beginPath();
  ctx.arc(0, 0, driverRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c0c0c0';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Disc (meio colorido)
  const discRadius = radius * 0.65;
  const discGrad = ctx.createRadialGradient(-discRadius * 0.1, -discRadius * 0.1, 0, 0, 0, discRadius);
  discGrad.addColorStop(0, lightenColor(colors[0], 40));
  discGrad.addColorStop(0.4, colors[0]);
  discGrad.addColorStop(0.8, darkenColor(colors[0], 30));
  discGrad.addColorStop(1, colors[1] || darkenColor(colors[0], 50));
  ctx.fillStyle = discGrad;
  ctx.beginPath();
  ctx.arc(0, 0, discRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = colors[1] || '#ffffff';
  ctx.lineWidth = 3;
  ctx.shadowBlur = 12;
  ctx.shadowColor = colors[1] || '#ffffff';
  ctx.stroke();
  ctx.shadowBlur = 0;
  
  // Layer (topo ornamental)
  const layerGrad = ctx.createRadialGradient(-radius * 0.1, -radius * 0.1, 0, 0, 0, radius);
  layerGrad.addColorStop(0, lightenColor(colors[0], 30));
  layerGrad.addColorStop(0.5, colors[0]);
  layerGrad.addColorStop(1, darkenColor(colors[0], 40));
  ctx.fillStyle = layerGrad;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // Borda com glow
  ctx.strokeStyle = colors[1] || '#ffffff';
  ctx.lineWidth = 3;
  ctx.shadowBlur = 15;
  ctx.shadowColor = colors[1] || '#ffffff';
  ctx.stroke();
  ctx.shadowBlur = 0;
  
  // Detalhes por tipo
  if (type === 'Attack') {
    // Lâminas agressivas
    const blades = 5;
    for (let i = 0; i < blades; i++) {
      const angle = (Math.PI * 2 / blades) * i;
      ctx.save();
      ctx.rotate(angle);
      ctx.fillStyle = colors[0];
      ctx.beginPath();
      ctx.moveTo(radius * 0.5, 0);
      ctx.lineTo(radius * 1.05, -radius * 0.12);
      ctx.lineTo(radius * 1.1, 0);
      ctx.lineTo(radius * 1.05, radius * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = lightenColor(colors[0], 50);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  }
  
  // Reflexo especular
  const pulse = Math.sin(time * 0.003) * 0.3 + 0.7;
  ctx.save();
  ctx.globalAlpha = 0.4 * pulse;
  const specGrad = ctx.createRadialGradient(
    radius * 0.3, -radius * 0.3, 0,
    0, 0, radius * 0.8
  );
  specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  specGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
  specGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = specGrad;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  
  // Centro
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowBlur = 4;
  ctx.shadowColor = '#000';
  const icon = type === 'Attack' ? '⚔️' : type === 'Defense' ? '🛡️' : type === 'Stamina' ? '🌀' : '⚖️';
  ctx.fillText(icon, 0, 0);
  ctx.shadowBlur = 0;
  
  // Speed effects
  if (velocity > 5) {
    const lineCount = Math.min(6, Math.floor(velocity / 2));
    ctx.save();
    ctx.globalAlpha = Math.min(velocity / 10, 1) * 0.4;
    ctx.strokeStyle = colors[0];
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = colors[0];
    for (let i = 0; i < lineCount; i++) {
      const angle = (Math.PI * 2 / lineCount) * i;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * radius * 1.2, Math.sin(angle) * radius * 1.2);
      ctx.lineTo(Math.cos(angle) * radius * 1.5, Math.sin(angle) * radius * 1.5);
      ctx.stroke();
    }
    ctx.restore();
  }
  
  ctx.restore();
}

// Render premium arena
export function renderPremiumArena(ctx, centerX, centerY, zones, time) {
  const pulse = Math.sin(time * 0.003) * 0.5 + 0.5;
  
  // Ambient background
  const ambientGrad = ctx.createRadialGradient(centerX, centerY - 100, 0, centerX, centerY, zones.wall * 1.5);
  ambientGrad.addColorStop(0, 'rgba(100, 120, 160, 0.15)');
  ambientGrad.addColorStop(0.6, 'rgba(40, 50, 70, 0.1)');
  ambientGrad.addColorStop(1, 'rgba(20, 25, 35, 0.05)');
  ctx.fillStyle = ambientGrad;
  ctx.fillRect(0, 0, 1000, 700);
  
  // Outer plate com sombra
  const outerGrad = ctx.createRadialGradient(centerX - 50, centerY - 40, 50, centerX, centerY, zones.wall + 15);
  outerGrad.addColorStop(0, '#2a3040');
  outerGrad.addColorStop(0.3, '#3a4556');
  outerGrad.addColorStop(0.7, '#2a3545');
  outerGrad.addColorStop(1, '#1a2030');
  ctx.fillStyle = outerGrad;
  ctx.shadowBlur = 25;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.beginPath();
  ctx.arc(centerX, centerY, zones.wall, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  
  // Outer slope
  const outerSlopeGrad = ctx.createRadialGradient(centerX - 30, centerY - 25, 30, centerX, centerY, zones.outerSlope);
  outerSlopeGrad.addColorStop(0, '#4a5870');
  outerSlopeGrad.addColorStop(0.5, '#3a4860');
  outerSlopeGrad.addColorStop(1, '#4a5568');
  ctx.fillStyle = outerSlopeGrad;
  ctx.beginPath();
  ctx.arc(centerX, centerY, zones.outerSlope, 0, Math.PI * 2);
  ctx.fill();
  
  // Tornado Ridge PREMIUM
  const ridgeGrad = ctx.createRadialGradient(centerX, centerY, zones.tornadoRidge - 20, centerX, centerY, zones.tornadoRidge + 10);
  ridgeGrad.addColorStop(0, '#505878');
  ridgeGrad.addColorStop(0.3, '#6a7a9a');
  ridgeGrad.addColorStop(0.6, '#7a8aaa');
  ridgeGrad.addColorStop(1, '#4a5568');
  ctx.fillStyle = ridgeGrad;
  ctx.beginPath();
  ctx.arc(centerX, centerY, zones.tornadoRidge, 0, Math.PI * 2);
  ctx.fill();
  
  // Pulsing warning ring
  ctx.save();
  ctx.globalAlpha = pulse * 0.7;
  ctx.strokeStyle = '#ffaa00';
  ctx.lineWidth = 8;
  ctx.shadowBlur = 18;
  ctx.shadowColor = '#ff7700';
  ctx.beginPath();
  ctx.arc(centerX, centerY, zones.tornadoRidge, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  
  // Inner slope
  const innerSlopeGrad = ctx.createRadialGradient(centerX - 20, centerY - 18, 15, centerX, centerY, zones.innerSlope);
  innerSlopeGrad.addColorStop(0, '#5a6b85');
  innerSlopeGrad.addColorStop(0.6, '#4a5870');
  innerSlopeGrad.addColorStop(1, '#5a6b7f');
  ctx.fillStyle = innerSlopeGrad;
  ctx.beginPath();
  ctx.arc(centerX, centerY, zones.innerSlope, 0, Math.PI * 2);
  ctx.fill();
  
  // Center bowl com profundidade
  const shadowGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, zones.centerBowl * 1.2);
  shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
  shadowGrad.addColorStop(1, 'transparent');
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.arc(centerX, centerY, zones.centerBowl * 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  
  const bowlGrad = ctx.createRadialGradient(
    centerX - zones.centerBowl * 0.2,
    centerY - zones.centerBowl * 0.25,
    0,
    centerX, centerY, zones.centerBowl
  );
  bowlGrad.addColorStop(0, '#9aabb8');
  bowlGrad.addColorStop(0.3, '#7a8b98');
  bowlGrad.addColorStop(0.7, '#6a7b8f');
  bowlGrad.addColorStop(1, '#5a6b7f');
  ctx.fillStyle = bowlGrad;
  ctx.beginPath();
  ctx.arc(centerX, centerY, zones.centerBowl, 0, Math.PI * 2);
  ctx.fill();
  
  // Hexagonal grid PREMIUM
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, zones.wall - 3, 0, Math.PI * 2);
  ctx.clip();
  
  const hexSize = 18;
  const hexHeight = hexSize * Math.sqrt(3);
  const cols = Math.ceil((zones.wall * 2) / (hexSize * 1.5)) + 2;
  const rows = Math.ceil((zones.wall * 2) / hexHeight) + 2;
  const startX = centerX - zones.wall - hexSize;
  const startY = centerY - zones.wall - hexHeight;
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const hx = startX + col * hexSize * 1.5;
      const hy = startY + row * hexHeight + (col % 2 === 0 ? 0 : hexHeight / 2);
      const dist = Math.sqrt((hx - centerX) ** 2 + (hy - centerY) ** 2);
      if (dist > zones.wall + hexSize) continue;
      
      const brightness = 1 - dist / (zones.wall * 1.1);
      const hexAlpha = 0.04 + brightness * 0.03;
      const hexPulse = Math.sin(time * 0.003 + dist * 0.01) * 0.02;
      
      ctx.globalAlpha = hexAlpha + hexPulse;
      ctx.strokeStyle = `rgba(180, 200, 255, ${0.8 + pulse * 0.2})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let v = 0; v < 6; v++) {
        const angle = (Math.PI / 3) * v - Math.PI / 6;
        const vx = hx + hexSize * 0.92 * Math.cos(angle);
        const vy = hy + hexSize * 0.92 * Math.sin(angle);
        if (v === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  
  ctx.restore();
  ctx.globalAlpha = 1;
}

// ════════════════════════════════════════════════════════════════════
// BB-10 COMPETITIVE ARENA RENDERER
// Estética neutra/clássica: sem gimmicks visuais, exits proporcionais
// ════════════════════════════════════════════════════════════════════
export function renderCompetitiveArena(ctx, centerX, centerY, zones, time) {
  const subtlePulse = Math.sin(time * 0.002) * 0.3 + 0.7; // muito sutil

  // Background ambiente — neutro, sem drama
  const ambientGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, zones.wall * 1.4);
  ambientGrad.addColorStop(0, 'rgba(80, 90, 110, 0.12)');
  ambientGrad.addColorStop(1, 'rgba(20, 22, 28, 0.05)');
  ctx.fillStyle = ambientGrad;
  ctx.fillRect(0, 0, 1000, 700);

  // Outer plate — cinza frio, sem glow exagerado
  const outerGrad = ctx.createRadialGradient(centerX - 40, centerY - 30, 40, centerX, centerY, zones.wall + 12);
  outerGrad.addColorStop(0, '#3a4050');
  outerGrad.addColorStop(0.5, '#505a68');
  outerGrad.addColorStop(1, '#282e38');
  ctx.fillStyle = outerGrad;
  ctx.shadowBlur = 18;
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.beginPath();
  ctx.arc(centerX, centerY, zones.wall, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Outer slope
  const outerSlopeGrad = ctx.createRadialGradient(centerX, centerY, zones.tornadoRidge, centerX, centerY, zones.outerSlope);
  outerSlopeGrad.addColorStop(0, '#5a6878');
  outerSlopeGrad.addColorStop(1, '#6a7888');
  ctx.fillStyle = outerSlopeGrad;
  ctx.beginPath();
  ctx.arc(centerX, centerY, zones.outerSlope, 0, Math.PI * 2);
  ctx.fill();

  // Tornado Ridge — só anel estético, cinza frio, sem pulso laranja
  const ridgeGrad = ctx.createRadialGradient(centerX, centerY, zones.tornadoRidge - 15, centerX, centerY, zones.tornadoRidge + 8);
  ridgeGrad.addColorStop(0, '#6a788a');
  ridgeGrad.addColorStop(0.5, '#8898aa');
  ridgeGrad.addColorStop(1, '#6a7888');
  ctx.fillStyle = ridgeGrad;
  ctx.beginPath();
  ctx.arc(centerX, centerY, zones.tornadoRidge, 0, Math.PI * 2);
  ctx.fill();

  // Anel ridge discreto — sem cor de aviso, apenas borda técnica
  ctx.save();
  ctx.globalAlpha = 0.25 * subtlePulse;
  ctx.strokeStyle = '#aabbc8';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.arc(centerX, centerY, zones.tornadoRidge, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Inner slope
  const innerGrad = ctx.createRadialGradient(centerX, centerY, zones.centerBowl, centerX, centerY, zones.innerSlope);
  innerGrad.addColorStop(0, '#8090a0');
  innerGrad.addColorStop(1, '#687888');
  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.arc(centerX, centerY, zones.innerSlope, 0, Math.PI * 2);
  ctx.fill();

  // Center bowl — claro, neutro
  const shadowGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, zones.centerBowl * 1.2);
  shadowGrad.addColorStop(0, 'rgba(0,0,0,0.3)');
  shadowGrad.addColorStop(1, 'transparent');
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.arc(centerX, centerY, zones.centerBowl * 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const bowlGrad = ctx.createRadialGradient(
    centerX - zones.centerBowl * 0.18, centerY - zones.centerBowl * 0.22, 0,
    centerX, centerY, zones.centerBowl
  );
  bowlGrad.addColorStop(0, '#c8d4de');
  bowlGrad.addColorStop(0.4, '#b0bcc8');
  bowlGrad.addColorStop(1, '#8898aa');
  ctx.fillStyle = bowlGrad;
  ctx.beginPath();
  ctx.arc(centerX, centerY, zones.centerBowl, 0, Math.PI * 2);
  ctx.fill();

  // Grid hexagonal — muito sutil, sem pulso forte
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, zones.wall - 3, 0, Math.PI * 2);
  ctx.clip();

  const hexSize = 20;
  const hexHeight = hexSize * Math.sqrt(3);
  const cols = Math.ceil((zones.wall * 2) / (hexSize * 1.5)) + 2;
  const rows = Math.ceil((zones.wall * 2) / hexHeight) + 2;
  const startX = centerX - zones.wall - hexSize;
  const startY = centerY - zones.wall - hexHeight;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const hx = startX + col * hexSize * 1.5;
      const hy = startY + row * hexHeight + (col % 2 === 0 ? 0 : hexHeight / 2);
      const dist = Math.sqrt((hx - centerX) ** 2 + (hy - centerY) ** 2);
      if (dist > zones.wall + hexSize) continue;
      ctx.globalAlpha = 0.025 + (1 - dist / (zones.wall * 1.1)) * 0.02;
      ctx.strokeStyle = 'rgba(160, 185, 210, 0.7)';
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      for (let v = 0; v < 6; v++) {
        const angle = (Math.PI / 3) * v - Math.PI / 6;
        const vx = hx + hexSize * 0.9 * Math.cos(angle);
        const vy = hy + hexSize * 0.9 * Math.sin(angle);
        if (v === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}
