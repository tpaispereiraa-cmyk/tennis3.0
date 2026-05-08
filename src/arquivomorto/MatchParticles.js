/**
 * MatchParticles.js — Contextual particle system
 *
 * Manages a global pool of physical particles with:
 *  - Ball trail (length âˆ speed, curvature on topspin/slice)
 *  - Surface bounce effects (clay dust, grass flecks, hard sparks)
 *  - Ace explosion (golden sparks)
 *  - Winner burst (player color eruption)
 *  - Slide trails on clay/grass
 *
 * Coordinate system: particles stored in COURT METRES (same as ball.pos).
 * Renderers project them using their own projection function.
 *
 * Integration:
 *   game.js    onBounce → spawnBounce(gs)
 *   vfx.js     resolvePoint ACE/WINNER → spawnAce(gs) / spawnWinner(gs, color)
 *   isoRenderer → renderParticlesIso(ctx, gs, W, H)
 *   pixelRenderer → renderParticlesTop(ctx, gs)
 *   tvRenderer  → renderParticlesTV(ctx, gs, W, H)
 *
 * IMPORTANT: particle positions are in court metres.
 * Particle velocities are in m/s (court space).
 * updateParticles(gs, dt) must be called each gameTick.
 */

import { COURT } from '../core/constants.js';

// ── Particle structure ────────────────────────────────────────────────────────
// { x, y, z, vx, vy, vz, life, maxLife, type, color, size, gravity, drag, alpha }

const MAX_PARTICLES = 400;

// ── Surface config ────────────────────────────────────────────────────────────
const BOUNCE_CONFIGS = {
  CLAY: {
    count:       12,
    colors:      ['#c1440e', '#d45515', '#a83a0c', '#e87040', '#7a2a08'],
    minSize:     1.5,
    maxSize:     3.5,
    speedScale:  1.0,
    gravityZ:    -4.0,  // falls back down fast (dust)
    life:        0.45,
    drag:        0.88,
    spread:      0.18,  // m (court space)
    riseZ:       0.04,  // initial upward velocity
    puffCount:   6,     // secondary puff particles (slower, larger)
    puffColor:   '#c1440eaa',
  },
  GRASS: {
    count:       8,
    colors:      ['#1a6e38', '#2a8848', '#aaee44', '#88cc22', '#5a9030'],
    minSize:     1.0,
    maxSize:     2.5,
    speedScale:  0.8,
    gravityZ:    -6.0,
    life:        0.30,
    drag:        0.80,
    spread:      0.12,
    riseZ:       0.07,
    puffCount:   3,
    puffColor:   '#2a884888',
  },
  HARD: {
    count:       5,
    colors:      ['#8888cc', '#aaaaee', '#6666aa', '#ffffff', '#ccccff'],
    minSize:     0.8,
    maxSize:     1.8,
    speedScale:  1.2,
    gravityZ:    -8.0,   // sparks fall fast
    life:        0.18,
    drag:        0.72,
    spread:      0.08,
    riseZ:       0.12,
    puffCount:   0,
    puffColor:   null,
  },
  INDOOR: {
    count:       4,
    colors:      ['#aaaaff', '#8888dd', '#ffffff', '#ccccff'],
    minSize:     0.7,
    maxSize:     1.6,
    speedScale:  1.1,
    gravityZ:    -9.0,
    life:        0.14,
    drag:        0.68,
    spread:      0.07,
    riseZ:       0.10,
    puffCount:   0,
    puffColor:   null,
  },
};

// ── Particle pool management ───────────────────────────────────────────────────

export function initParticles(gs) {
  gs.particles = [];
}

function spawn(gs, p) {
  if (!gs.particles) gs.particles = [];
  if (gs.particles.length >= MAX_PARTICLES) {
    // Evict oldest particle
    gs.particles.shift();
  }
  gs.particles.push(p);
}

function rand(min, max) { return min + Math.random() * (max - min); }

// ── Bounce spawn ──────────────────────────────────────────────────────────────
/**
 * Spawn bounce-impact particles based on surface type.
 * Call from game.js onBounce handler.
 * @param {object} gs   game state (needs gs.ball, gs.courtMeta, gs.particles)
 */
export function spawnBounce(gs) {
  const ball    = gs.ball;
  const surface = gs.courtMeta?.surface ?? 'HARD';
  const cfg     = BOUNCE_CONFIGS[surface] ?? BOUNCE_CONFIGS.HARD;
  const speed   = Math.sqrt(ball.vel.x ** 2 + ball.vel.y ** 2 + ball.vel.z ** 2);
  const scale   = Math.min(2.0, speed / 12);   // more particles at higher speed

  const count  = Math.round(cfg.count * (0.6 + scale * 0.6));
  const pCount = cfg.puffCount;

  // Main impact particles — shoot outward from ball position
  for (let i = 0; i < count; i++) {
    const angle  = rand(0, Math.PI * 2);
    const lateral = rand(0.3, 1.0) * cfg.speedScale * scale;
    const color  = cfg.colors[Math.floor(Math.random() * cfg.colors.length)];

    spawn(gs, {
      x:    ball.pos.x + rand(-cfg.spread, cfg.spread),
      y:    ball.pos.y + rand(-cfg.spread, cfg.spread),
      z:    0.01,
      vx:   Math.cos(angle) * lateral,
      vy:   Math.sin(angle) * lateral * 0.7 + ball.vel.y * 0.08,
      vz:   cfg.riseZ + rand(0, 0.06) * scale,
      life:    cfg.life * rand(0.6, 1.2),
      maxLife: cfg.life * 1.2,
      type:    'bounce',
      color,
      size:    rand(cfg.minSize, cfg.maxSize) * (0.8 + scale * 0.3),
      gravity: cfg.gravityZ,
      drag:    cfg.drag,
      alpha:   rand(0.65, 1.0),
    });
  }

  // Puff particles (slower, larger, stay close — clay haze effect)
  for (let i = 0; i < pCount; i++) {
    const angle = rand(0, Math.PI * 2);
    spawn(gs, {
      x:    ball.pos.x + rand(-0.06, 0.06),
      y:    ball.pos.y + rand(-0.06, 0.06),
      z:    0.01,
      vx:   Math.cos(angle) * 0.08,
      vy:   Math.sin(angle) * 0.08,
      vz:   0.02,
      life:    cfg.life * 1.8 * rand(0.8, 1.2),
      maxLife: cfg.life * 2.0,
      type:    'puff',
      color:   cfg.puffColor,
      size:    rand(3, 6) * scale,
      gravity: -1.5,
      drag:    0.92,
      alpha:   0.38,
    });
  }
}

// ── Ace spawn ─────────────────────────────────────────────────────────────────
/**
 * Golden spark explosion for ace.
 * @param {object} gs   game state
 */
export function spawnAce(gs) {
  const ball = gs.ball;
  const count = 24;

  for (let i = 0; i < count; i++) {
    const angle   = (i / count) * Math.PI * 2 + rand(-0.15, 0.15);
    const speed2  = rand(0.4, 1.4);
    const colors  = ['#FFD700', '#FFA500', '#FFEC44', '#ffffff', '#FFD700'];
    const color   = colors[Math.floor(Math.random() * colors.length)];

    spawn(gs, {
      x:    ball.pos.x,
      y:    ball.pos.y,
      z:    rand(0.05, 0.3),
      vx:   Math.cos(angle) * speed2,
      vy:   Math.sin(angle) * speed2,
      vz:   rand(0.2, 0.7),
      life:    rand(0.55, 1.0),
      maxLife: 1.0,
      type:    'ace',
      color,
      size:    rand(1.5, 3.5),
      gravity: -5.0,
      drag:    0.84,
      alpha:   1.0,
    });
  }

  // Shockwave ring (very brief, large, fading)
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    spawn(gs, {
      x: ball.pos.x + Math.cos(angle) * 0.05,
      y: ball.pos.y + Math.sin(angle) * 0.05,
      z: 0.05,
      vx: Math.cos(angle) * 0.8,
      vy: Math.sin(angle) * 0.8,
      vz: 0.0,
      life: 0.25, maxLife: 0.25,
      type: 'shockwave',
      color: '#FFD70080',
      size: 2.5,
      gravity: 0,
      drag: 0.70,
      alpha: 0.8,
    });
  }
}

// ── Winner spawn ──────────────────────────────────────────────────────────────
/**
 * Explosion in player color for winner shot.
 * @param {object} gs       game state
 * @param {string} color    player hex color
 */
export function spawnWinner(gs, color) {
  const ball   = gs.ball;
  const count  = 20;

  for (let i = 0; i < count; i++) {
    const angle  = rand(0, Math.PI * 2);
    const speed2 = rand(0.3, 1.2);

    spawn(gs, {
      x:    ball.pos.x + rand(-0.1, 0.1),
      y:    ball.pos.y + rand(-0.1, 0.1),
      z:    rand(0.02, 0.2),
      vx:   Math.cos(angle) * speed2,
      vy:   Math.sin(angle) * speed2 * 0.8,
      vz:   rand(0.15, 0.55),
      life:    rand(0.45, 0.85),
      maxLife: 0.85,
      type:    'winner',
      color,
      size:    rand(2.0, 4.5),
      gravity: -4.0,
      drag:    0.86,
      alpha:   0.9,
    });
  }

  // Star burst lines (short lived streaks)
  for (let i = 0; i < 6; i++) {
    const angle  = rand(0, Math.PI * 2);
    spawn(gs, {
      x:  ball.pos.x,
      y:  ball.pos.y,
      z:  0.1,
      vx: Math.cos(angle) * 1.8,
      vy: Math.sin(angle) * 1.8,
      vz: 0.1,
      life: 0.18, maxLife: 0.18,
      type: 'streak',
      color,
      size: 1.5,
      gravity: -2,
      drag: 0.75,
      alpha: 0.7,
    });
  }
}

// ── Slide trail spawn ─────────────────────────────────────────────────────────
/**
 * Clay/grass slide trail from a player.
 * Call when player enters 'slide' pose on clay/grass.
 */
export function spawnSlideTrail(gs, player) {
  const surface = gs.courtMeta?.surface ?? 'HARD';
  if (surface !== 'CLAY' && surface !== 'GRASS') return;

  const color = surface === 'CLAY' ? '#c1440e88' : '#1a6e3888';
  const count = 3;

  for (let i = 0; i < count; i++) {
    spawn(gs, {
      x:    player.pos.x + rand(-0.08, 0.08),
      y:    player.pos.y + rand(-0.08, 0.08),
      z:    0.005,
      vx:   rand(-0.02, 0.02),
      vy:   rand(-0.02, 0.02),
      vz:   0,
      life:    0.6, maxLife: 0.6,
      type:    'slide',
      color,
      size:    rand(2, 4),
      gravity: 0,
      drag:    0.95,
      alpha:   0.5,
    });
  }
}

// ── Update all particles ───────────────────────────────────────────────────────
/**
 * Advance all particles by dt seconds. Removes dead particles.
 * Call from game.js each gameTick.
 * @param {object} gs
 * @param {number} dt  seconds
 */
export function updateParticles(gs, dt) {
  if (!gs.particles || gs.particles.length === 0) return;

  const court = COURT;
  const maxX  = court.halfW + 0.5;
  const maxY  = court.halfL + 0.5;

  gs.particles = gs.particles.filter(p => {
    p.life -= dt;
    if (p.life <= 0) return false;

    // Integrate position
    p.x  += p.vx * dt;
    p.y  += p.vy * dt;
    p.z  += p.vz * dt;
    p.vz += p.gravity * dt;

    // Drag
    p.vx *= Math.pow(p.drag, dt * 60);
    p.vy *= Math.pow(p.drag, dt * 60);

    // Floor clamp
    if (p.z < 0) {
      p.z   = 0;
      p.vz  = -p.vz * 0.25;   // small bounce
      p.vx *= 0.85;
      p.vy *= 0.85;
    }

    // Broad-phase cull (out of visible area)
    if (Math.abs(p.x) > maxX || Math.abs(p.y) > maxY) return false;

    return true;
  });
}

// ── ISO projection helper (mirrors isoRenderer / CourtRenderer math) ──────────
function toIso(courtY, courtX, W, H) {
  const hl = COURT.halfL;
  const hw = COURT.halfW;
  // We work in metres — scale inline
  const SCALE = 23;
  const courtYsc = courtY * SCALE;
  const courtXsc = courtX * SCALE;
  const maxExtent = (hl + hw) * SCALE;
  const isoX = (W / 2 * 0.90) / maxExtent;
  const isoY = (H / 2 * 0.76) / maxExtent;
  return {
    sx: W / 2 + (courtYsc - courtXsc) * isoX,
    sy: H / 2 + 18 + (courtYsc + courtXsc) * isoY,
  };
}

// ── Render: ISO view ──────────────────────────────────────────────────────────
/**
 * Render all particles in ISO projection.
 * Call from isoRenderer.js AFTER drawing players (so particles appear on top).
 */
export function renderParticlesIso(ctx, gs, W, H) {
  if (!gs.particles || gs.particles.length === 0) return;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  for (const p of gs.particles) {
    const t    = p.life / p.maxLife;      // 1=new, 0=dead
    const alpha = p.alpha * t;
    if (alpha < 0.02) continue;

    const pos = toIso(p.y, p.x, W, H);
    // Height offset (Z): use same ratio as ball renderer: z * SCALE * 0.55
    const zOff = p.z * 23 * 0.55;
    const sx   = pos.sx;
    const sy   = pos.sy - zOff;

    ctx.globalAlpha = alpha;

    if (p.type === 'puff') {
      // Large fading disk
      const r = p.size * (2.0 - t);  // grows as it disperses
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(sx, sy, r * 1.4, r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'shockwave') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size * (1 - t);
      ctx.beginPath();
      ctx.arc(sx, sy, p.size * 4 * (1 - t * 0.5), 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.type === 'streak') {
      // Directional line
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      // Streak back along velocity
      const len = p.size * 4;
      const vMag = Math.sqrt(p.vx ** 2 + p.vy ** 2) || 1;
      const dx = (-p.vx / vMag) * len;
      const dy = (-p.vy / vMag) * len;
      const endPos = toIso(p.y + dy / (23 * 0.90), p.x + dx / (23 * 0.90), W, H);
      ctx.lineTo(endPos.sx, endPos.sy - zOff);
      ctx.stroke();
    } else {
      // Default: small square pixel
      const s = Math.max(1, p.size * t * 0.7 + p.size * 0.3);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(sx - s / 2), Math.round(sy - s / 2), Math.ceil(s), Math.ceil(s));

      // Bloom for ace/winner particles
      if ((p.type === 'ace' || p.type === 'winner') && s > 2) {
        ctx.globalAlpha = alpha * 0.3;
        ctx.fillRect(Math.round(sx - s), Math.round(sy - s), s * 2, s * 2);
      }
    }
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── Render: Top-down view ──────────────────────────────────────────────────────
/**
 * Render particles in top-down (pixelRenderer) view.
 * Must be called inside ctx.translate(cx, cy) block.
 * @param {CanvasRenderingContext2D} ctx  (translated to court centre)
 * @param {object} gs
 * @param {number} SCALE  pixels-per-metre (from constants)
 */
export function renderParticlesTop(ctx, gs, SCALE) {
  if (!gs.particles || gs.particles.length === 0) return;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  for (const p of gs.particles) {
    const t     = p.life / p.maxLife;
    const alpha = p.alpha * t;
    if (alpha < 0.02) continue;

    // Top-down: court Y→screen X, court X→screen Y, Z→Y offset
    const sx   = p.y * SCALE;
    const sy   = p.x * SCALE - p.z * SCALE * 0.55;

    ctx.globalAlpha = alpha;

    if (p.type === 'puff') {
      const r = p.size * (1.5 - t * 0.5);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(sx, sy, r * 1.2, r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'streak') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(1, p.size * t);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - p.vy * SCALE * 0.04, sy - p.vx * SCALE * 0.04);
      ctx.stroke();
    } else {
      const s = Math.max(1, Math.round(p.size * (0.5 + t * 0.5)));
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(sx - s / 2), Math.round(sy - s / 2), s, s);

      if (p.type === 'ace' || p.type === 'winner') {
        ctx.globalAlpha = alpha * 0.25;
        ctx.fillRect(Math.round(sx - s - 1), Math.round(sy - s - 1), s * 2 + 2, s * 2 + 2);
      }
    }
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── Render: TV view ───────────────────────────────────────────────────────────
/**
 * Render particles in TV (perspective) view.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} gs
 * @param {number} W, H   canvas dimensions
 * @param {function} tvProject  the tvProject(courtY, courtX, W, H) function
 */
export function renderParticlesTV(ctx, gs, W, H, tvProject, SCALE) {
  if (!gs.particles || gs.particles.length === 0) return;

  ctx.save();

  for (const p of gs.particles) {
    const t     = p.life / p.maxLife;
    const alpha = p.alpha * t;
    if (alpha < 0.02) continue;

    const proj  = tvProject(p.y * SCALE, p.x * SCALE, W, H);
    const zOff  = p.z * proj.depth * 60;  // height in TV space
    const sx    = proj.sx;
    const sy    = proj.sy - zOff;
    const scale = proj.depth * 0.8 + 0.2;  // far = small

    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;

    const s = Math.max(1, p.size * scale * (0.6 + t * 0.4));
    ctx.fillRect(Math.round(sx - s / 2), Math.round(sy - s / 2), Math.ceil(s), Math.ceil(s));
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

