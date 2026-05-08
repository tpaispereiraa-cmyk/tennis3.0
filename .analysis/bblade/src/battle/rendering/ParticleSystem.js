// ============================================
// PARTICLE SYSTEM
// Sistema de partículas e efeitos visuais
// ============================================

/**
 * Adiciona partículas ao sistema
 */
export function addParticle(particles, x, y, colorOrType, count = 20, typeOverride = null) {
  const validTypes = ['spark', 'debris', 'smoke', 'energy', 'impact'];
  
  let particleType = 'spark';
  let particleColor = colorOrType;
  
  if (validTypes.includes(colorOrType)) {
    particleType = colorOrType;
    particleColor = null;
  }
  
  if (typeOverride && validTypes.includes(typeOverride)) {
    particleType = typeOverride;
  }
  
  const typeColors = {
    spark: ['#ffaa00', '#ff6600', '#ffff00'],
    debris: ['#888888', '#666666', '#999999'],
    smoke: ['rgba(100,100,100,0.6)', 'rgba(120,120,120,0.5)'],
    energy: ['#00ffff', '#0088ff', '#00aaff'],
    impact: ['#ff3333', '#ff6666', '#ffaa00']
  };
  
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 1;
    const size = Math.random() * 3 + 2;
    
    const color = particleColor || typeColors[particleType][Math.floor(Math.random() * typeColors[particleType].length)];
    
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.0,
      decay: Math.random() * 0.02 + 0.01,
      size,
      color,
      type: particleType
    });
  }
}

export function addSparkParticles(particles, x, y, count = 15) {
  addParticle(particles, x, y, 'spark', count);
}

export function addDebrisParticles(particles, x, y, color, count = 12) {
  addParticle(particles, x, y, color, count, 'debris');
}

export function addSmokeParticles(particles, x, y, count = 8) {
  addParticle(particles, x, y, 'smoke', count);
}

export function addEnergyParticles(particles, x, y, color, count = 10) {
  addParticle(particles, x, y, color, count, 'energy');
}

export function addImpactParticles(particles, x, y, count = 20) {
  addParticle(particles, x, y, 'impact', count);
}

export function drawStar(ctx, x, y, spikes, outerRadius, innerRadius) {
  let rot = Math.PI / 2 * 3;
  let step = Math.PI / spikes;
  
  ctx.beginPath();
  ctx.moveTo(x, y - outerRadius);
  
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(x + Math.cos(rot) * outerRadius, y + Math.sin(rot) * outerRadius);
    rot += step;
    ctx.lineTo(x + Math.cos(rot) * innerRadius, y + Math.sin(rot) * innerRadius);
    rot += step;
  }
  
  ctx.lineTo(x, y - outerRadius);
  ctx.closePath();
}

export function drawCross(ctx, x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x - size, y);
  ctx.lineTo(x + size, y);
  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y + size);
}

export function drawDiamond(ctx, x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size, y);
  ctx.closePath();
}

export function drawPlus(ctx, x, y, size) {
  ctx.fillRect(x - size, y - size/3, size*2, size*2/3);
  ctx.fillRect(x - size/3, y - size, size*2/3, size*2);
}

export function drawWave(ctx, x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x - size, y);
  ctx.quadraticCurveTo(x - size/2, y - size/2, x, y);
  ctx.quadraticCurveTo(x + size/2, y + size/2, x + size, y);
}

export function createBurstEffect(particles, b, beyColor) {
  const x = b.x;
  const y = b.y;
  
  // Explosão principal
  for (let i = 0; i < 40; i++) {
    const angle = (Math.PI * 2 * i) / 40;
    const speed = Math.random() * 6 + 4;
    const size = Math.random() * 4 + 3;
    
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.0,
      decay: 0.015,
      size,
      color: beyColor,
      type: 'burst'
    });
  }
  
  // Faíscas secundárias
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 8 + 2;
    
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.0,
      decay: 0.02,
      size: 2,
      color: '#ffff00',
      type: 'spark'
    });
  }
}

export function updateParticles(particles, deltaTime = 1) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    
    // Update position
    p.x += p.vx * deltaTime;
    p.y += p.vy * deltaTime;
    
    // Apply gravity for certain types
    if (p.type === 'debris' || p.type === 'burst') {
      p.vy += 0.2 * deltaTime;
    }
    
    // Decay
    p.life -= p.decay * deltaTime;
    
    // Remove dead particles
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

export function renderParticles(ctx, particles) {
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.life;
    
    if (p.type === 'spark') {
      ctx.fillStyle = p.color;
      drawStar(ctx, p.x, p.y, 5, p.size, p.size / 2);
      ctx.fill();
    } else if (p.type === 'burst') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'debris') {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    } else if (p.type === 'smoke') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'energy') {
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  });
}
