// ============================================
// BEYBLADE RENDERER
// Funções de renderização de Beyblades
// ============================================

/**
 * Desenha sombra do beyblade
 */
export function drawBeyShadow(ctx, b) {
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  const shadowOffset = 5;
  ctx.ellipse(b.x + shadowOffset, b.y + shadowOffset, 22, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Desenha layer de ataque
 */
export function drawAttackLayer(ctx, radius, colors) {
  const spikes = 6;
  const angleStep = (Math.PI * 2) / spikes;
  
  ctx.beginPath();
  for (let i = 0; i < spikes; i++) {
    const angle = angleStep * i;
    const nextAngle = angleStep * (i + 1);
    
    const x1 = Math.cos(angle) * radius;
    const y1 = Math.sin(angle) * radius;
    const x2 = Math.cos(angle + angleStep * 0.3) * (radius * 0.7);
    const y2 = Math.sin(angle + angleStep * 0.3) * (radius * 0.7);
    const x3 = Math.cos(nextAngle) * radius;
    const y3 = Math.sin(nextAngle) * radius;
    
    if (i === 0) ctx.moveTo(x1, y1);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
  }
  ctx.closePath();
  
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(1, colors[1] || colors[0]);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = colors[2] || '#000';
  ctx.lineWidth = 2;
  ctx.stroke();
}

/**
 * Desenha layer de defesa
 */
export function drawDefenseLayer(ctx, radius, colors) {
  const segments = 8;
  const angleStep = (Math.PI * 2) / segments;
  
  ctx.beginPath();
  for (let i = 0; i < segments; i++) {
    const angle = angleStep * i;
    const r = i % 2 === 0 ? radius : radius * 0.85;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(1, colors[1] || colors[0]);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = colors[2] || '#000';
  ctx.lineWidth = 3;
  ctx.stroke();
}

/**
 * Desenha layer de stamina
 */
export function drawStaminaLayer(ctx, radius, colors) {
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(0.7, colors[1] || colors[0]);
  gradient.addColorStop(1, colors[2] || colors[1] || colors[0]);
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // Inner circles
  ctx.strokeStyle = colors[2] || '#000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.4, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * Desenha layer de balance
 */
export function drawBalanceLayer(ctx, radius, colors) {
  const segments = 12;
  const angleStep = (Math.PI * 2) / segments;
  
  ctx.beginPath();
  for (let i = 0; i < segments; i++) {
    const angle = angleStep * i;
    const r = i % 3 === 0 ? radius : (i % 3 === 1 ? radius * 0.9 : radius * 0.95);
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(0.5, colors[1] || colors[0]);
  gradient.addColorStop(1, colors[2] || colors[1] || colors[0]);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = colors[2] || '#000';
  ctx.lineWidth = 2;
  ctx.stroke();
}

/**
 * Desenha o layer principal baseado no tipo
 */
export function drawLayer(ctx, b, colors, type) {
  const radius = 20;
  
  ctx.save();
  ctx.translate(0, 0);
  ctx.rotate(b.rotation || 0);
  
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
  
  ctx.restore();
}

/**
 * Desenha o disco do beyblade
 */
export function drawDisc(ctx, b, colors) {
  ctx.save();
  ctx.translate(0, 0);
  ctx.rotate((b.rotation || 0) * 0.5);
  
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.fillStyle = colors[1] || colors[0];
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.stroke();
  
  ctx.restore();
}

/**
 * Desenha o driver do beyblade
 */
export function drawDriver(ctx, b, colors) {
  ctx.save();
  
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fillStyle = colors[2] || colors[1] || colors[0];
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.stroke();
  
  ctx.restore();
}

/**
 * Função principal para desenhar um beyblade completo
 */
export function drawBey(ctx, b, colors, beyType, customIcon = null) {
  ctx.save();
  ctx.translate(b.x, b.y);
  
  // Shadow
  drawBeyShadow(ctx, { x: 0, y: 0 });
  
  // Main beyblade parts
  drawLayer(ctx, b, colors, beyType);
  drawDisc(ctx, b, colors);
  drawDriver(ctx, b, colors);
  
  // Custom icon if available
  if (customIcon && customIcon.complete) {
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.drawImage(customIcon, -12, -12, 24, 24);
    ctx.restore();
  }
  
  ctx.restore();
}

/**
 * Desenha trail (rastro) do beyblade
 */
export function drawTrail(ctx, trail, color, teamColors) {
  if (!trail || trail.length < 2) return;
  
  ctx.save();
  ctx.strokeStyle = color || teamColors[0];
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.5;
  
  ctx.beginPath();
  ctx.moveTo(trail[0].x, trail[0].y);
  
  for (let i = 1; i < trail.length; i++) {
    ctx.lineTo(trail[i].x, trail[i].y);
    ctx.globalAlpha = 0.5 * (i / trail.length);
  }
  
  ctx.stroke();
  ctx.restore();
}

/**
 * Atualiza o trail de um beyblade
 */
export function updateTrail(beyblade, trail, maxLength = 8) {
  trail.push({ x: beyblade.x, y: beyblade.y });
  
  if (trail.length > maxLength) {
    trail.shift();
  }
  
  return trail;
}
