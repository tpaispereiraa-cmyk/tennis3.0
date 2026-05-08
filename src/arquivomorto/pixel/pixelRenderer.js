/**
 * pixelRenderer.js — Top-down pixel-art renderer (v1.1)
 *
 * KEY CHANGES:
 *   - Players drawn as TOP-DOWN circles (hair colour + mini racket arm)
 *     using drawTopSprite() — no full body visible from above
 *   - Ball trail + ball pixel are correctly sized
 *   - Name badge positioned above the circle
 */

import { SCALE, CL, CW, TIMING, COURT, CANVAS_PAD_Y, CANVAS_PAD_X, GameState } from '../../core/constants.js';
import { mag3 } from '../../core/math.js';
import { renderVFX } from '../../systems/vfx/vfx.js';
import { drawPixelCourt, drawServiceHighlight } from './pixelCourt.js';
import { drawTopSprite } from './sprites.js';
import { getAppearance, getPose } from '../../ui/pixel/appearances.js';
import { drawTopCourtMarks } from '../../ui/pixel/CourtRenderer.js';
import { drawStyledTopPlayer } from './PlayerRenderer.js';
import { renderParticlesTop } from '../MatchParticles.js';
import { renderEnvironmentOverlay } from '../../systems/environment/EnvironmentSystem.js';

const HY = CANVAS_PAD_Y / 2;
const HX = CANVAS_PAD_X / 2;

// ── Name badge (top-down — small, above circle) ──────────────────
function drawTopBadge(ctx, px, py, player, appearance) {
  const name = player.name || '?';
  const display = name.length > 8 ? name.slice(0, 7) + '…' : name;
  const color = appearance?.accentColor || player.color || '#ffffff';
  const badgeW = Math.max(34, display.length * 4.5 + 10);
  const badgeH = 11;
  const bx = px - badgeW / 2;

  // Player 0 (side > 0, top half of court) → name BELOW circle
  // Player 1 (side < 0, bottom half of court) → name ABOVE circle
  // Use side to decide: side=1 means top player, put badge below; side=-1 means bottom player, put badge above
  const CIRCLE_R = 8; // approximate drawn radius
  const MARGIN = 3;
  const isTopPlayer = (player.side ?? 1) > 0;
  const by = isTopPlayer
    ? py + CIRCLE_R + MARGIN           // below circle
    : py - CIRCLE_R - MARGIN - badgeH; // above circle

  ctx.fillStyle = 'rgba(0,0,0,0.82)';
  ctx.fillRect(Math.round(bx), Math.round(by), badgeW, badgeH);
  ctx.fillStyle = color;
  // Accent line on top for above-badge, bottom for below-badge
  const accentY = isTopPlayer ? Math.round(by) + badgeH - 1 : Math.round(by);
  ctx.fillRect(Math.round(bx), accentY, badgeW, 1);
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(display, px, Math.round(by) + badgeH - 2);
}

// ── Quality bar (tiny, below circle) ─────────────────────────────
function drawQualityBar(ctx, px, py, quality, color) {
  const bw = 20, bh = 2;
  const bx = px - bw / 2;
  const by = py + 10;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = quality > 0.6 ? '#00ff88' : quality > 0.35 ? '#FFD700' : '#ff4444';
  ctx.fillRect(bx, by, bw * quality, bh);
}

// ── Momentum ring (small pixel ring around circle) ────────────────
function drawMomRing(ctx, px, py, r, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(px, py, r, 0, Math.PI * 2);
  ctx.stroke();
}

// ── Compute player facing angle from velocity or ball direction ───
function facingAngle(p, ball) {
  // When swinging, face the ball
  if (p.swinging && ball.inFlight) {
    const dx = ball.pos.y - p.pos.y; // canvas X axis = court Y
    const dy = ball.pos.x - p.pos.x;
    return Math.atan2(dy * SCALE, dx * SCALE);
  }
  // Use velocity
  const vx = p.vel?.y || 0;
  const vy = p.vel?.x || 0;
  if (Math.abs(vx) + Math.abs(vy) < 0.3) {
    // Facing toward net (court centre Y=0)
    return p.side > 0 ? -Math.PI / 2 : Math.PI / 2;
  }
  return Math.atan2(vy, vx);
}

// ─────────────────────────────────────────────────────────────────
export function renderPixelFrame(ctx, gs, trail, W, H) {
  ctx.imageSmoothingEnabled = false;
  const cx = W / 2, cy = H / 2;

  // 1. Court
  drawPixelCourt(ctx, W, H, gs.courtVisual);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.imageSmoothingEnabled = false;

  // 1b. Bounce marks (clay scuffs, grass tears, hard skids)
  drawTopCourtMarks(ctx, gs);

  const ball = gs.ball;
  const ballX = ball.pos.y * SCALE;
  const ballY = ball.pos.x * SCALE;

  // 2. Service highlight
  if (gs.gameState === GameState.PRE_SERVE || gs.gameState === GameState.SERVING) {
    const server = gs.players[gs.server];
    if (server) {
      ctx.restore();
      drawServiceHighlight(ctx, W, H, server, gs.serveLeft, gs.courtVisual);
      ctx.save();
      ctx.translate(cx, cy);
    }
  }

  // 3. Ball trail — inclui offset de altura (Z) para não parecer colado na quadra
  if (trail.length > 1) {
    for (let i = 0; i < trail.length; i++) {
      const t = (i + 1) / trail.length;
      const tp = trail[i];
      const tx = tp.y * SCALE;
      const ty = tp.x * SCALE;
      const tz = Math.max(0, tp.z || 0) * SCALE * 0.55; // mesma fórmula do renderer original
      const alpha = t * 0.5;
      const size = Math.max(1, Math.round(t * 3));
      ctx.fillStyle = `rgba(180,255,0,${alpha})`;
      ctx.fillRect(Math.round(tx) - 1, Math.round(ty - tz) - 1, size, size);
    }
  }

  // 4. Sombra da bola no chão (sempre visível, não depende de inFlight)
  {
    const bz = Math.max(0, ball.pos.z);
    const shadowAlpha = Math.max(0, 0.5 - bz * 0.07);
    const shadowR     = Math.max(2, 5 - bz * 0.6);
    ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(ballX, ballY, shadowR, shadowR * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5. Bola — SEMPRE desenhada (igual ao renderer original), sem cap de altura
  {
    const bz = Math.max(0, ball.pos.z);
    // Mesma fórmula do renderer original: -bz * SCALE * 0.55
    const bOff   = bz * SCALE * 0.55;
    const bDrawY = ballY - bOff;
    const bSize  = Math.max(3, 5 - bz * 0.2);
    const bHalf  = bSize / 2;

    // Linha de altura pontilhada (igual ao original)
    if (bz > 0.15) {
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = 'rgba(204,255,0,0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(ballX), Math.round(ballY));
      ctx.lineTo(Math.round(ballX), Math.round(bDrawY));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Glow leve
    const speed = mag3(ball.vel);
    if (speed > 4) {
      ctx.fillStyle = `rgba(180,255,0,${Math.min(0.18, speed * 0.006)})`;
      ctx.fillRect(Math.round(ballX - bHalf - 3), Math.round(bDrawY - bHalf - 3), bSize + 6, bSize + 6);
    }

    // Pixel da bola
    ctx.fillStyle = '#ccff00';
    ctx.fillRect(Math.round(ballX - bHalf), Math.round(bDrawY - bHalf), bSize, bSize);
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(Math.round(ballX - bHalf), Math.round(bDrawY - bHalf), 2, 2);

    // Motion blur pixels em bolas rápidas
    if (speed > 22) {
      const blurAlpha = Math.min(0.32, (speed - 22) / 55);
      const blurDx = -(ball.vel.y / speed) * bSize * 1.2;
      const blurDy = -(ball.vel.x / speed) * bSize * 1.2;
      ctx.fillStyle = `rgba(180,255,0,${blurAlpha})`;
      ctx.fillRect(Math.round(ballX + blurDx - bHalf), Math.round(bDrawY + blurDy - bHalf), bSize, bSize);
    }
  }

  // 6. Players — TOP-DOWN CIRCLE VIEW
  // Sort by court X so "closer" players draw over "further" ones
  const sorted = [...gs.players].filter(p => p?.pos).sort((a, b) => a.pos.x - b.pos.x);

  for (const p of sorted) {
    const ppx = p.pos.y * SCALE;
    const ppy = p.pos.x * SCALE;
    const appearance = getAppearance(p.namedPlayerKey, p.id);
    const quality = p._lastQuality ?? 1.0;
    const mom = p.ctx?.momentum ?? 0.5;
    const swinging = !!p.swinging;
    const color = appearance?.accentColor || p.color || '#ffffff';

    // ── Prep rings: "barra de preparação" ────────────────────────
    // Ring 1 (verde, r=19): enche em ~0.55s → Q floor 65%
    // Ring 2 (ouro,  r=23): enche em ~1.10s → Q floor 85%
    const prepFrac1 = p._prepFrac1 ?? 0;
    const prepFrac2 = p._prepFrac2 ?? 0;
    if (ball.inFlight && prepFrac1 > 0.02) {
      const r1 = 19;
      const startAngle = -Math.PI / 2;
      const endAngle1  = startAngle + prepFrac1 * Math.PI * 2;
      // Track dim
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ppx, ppy, r1, 0, Math.PI * 2);
      ctx.stroke();
      // Fill arc
      ctx.strokeStyle = prepFrac1 >= 1.0
        ? `rgba(0,255,136,${0.7 + prepFrac2 * 0.25})`
        : `rgba(0,220,100,${0.4 + prepFrac1 * 0.4})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(ppx, ppy, r1, startAngle, endAngle1, false);
      ctx.stroke();

      // Ring 2 — só aparece com ring 1 completo
      if (prepFrac1 >= 1.0 && prepFrac2 > 0.01) {
        const r2 = 23;
        const endAngle2 = startAngle + prepFrac2 * Math.PI * 2;
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ppx, ppy, r2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = prepFrac2 >= 1.0
          ? 'rgba(255,215,0,0.92)'
          : `rgba(255,215,0,${0.45 + prepFrac2 * 0.45})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(ppx, ppy, r2, startAngle, endAngle2, false);
        ctx.stroke();
      }

      // Flash pulse quando ring 1 fica cheio
      if (prepFrac1 >= 1.0 && prepFrac2 < 0.06) {
        const pulseA = (1 - prepFrac2 / 0.06) * 0.5;
        ctx.strokeStyle = `rgba(0,255,136,${pulseA})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(ppx, ppy, r1 + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Quality ring (always shown per player)
    if (quality > 0.65) {
      drawMomRing(ctx, ppx, ppy, 14, `rgba(0,255,136,${(quality - 0.65) * 0.8})`);
    } else if (quality < 0.35) {
      drawMomRing(ctx, ppx, ppy, 14, `rgba(255,80,80,${(0.35 - quality) * 1.0})`);
    }

    // Momentum ring
    if (mom > 0.70) {
      drawMomRing(ctx, ppx, ppy, 16, `rgba(255,215,0,${(mom - 0.70) / 0.30 * 0.5})`);
    } else if (mom < 0.28) {
      drawMomRing(ctx, ppx, ppy, 16, `rgba(100,100,140,${(0.28 - mom) / 0.28 * 0.4})`);
    }

    // Net approach dashed ring
    if (p.atNet) {
      ctx.strokeStyle = `${color}55`;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(ppx, ppy, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Swing arc flash
    const angle = facingAngle(p, ball);
    const sp = swinging ? (p.swingTimer / TIMING.swingDuration) : 0;
    if (swinging) {
      ctx.strokeStyle = `${color}${Math.floor((1 - sp) * 100).toString(16).padStart(2, '0')}`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ppx, ppy, 8 + sp * 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Style-aware top-down sprite
    drawStyledTopPlayer(ctx, ppx, ppy, appearance, angle, swinging, sp, p, ball, gs);

    // Quality bar (only during rally)
    if (ball.inFlight) {
      drawQualityBar(ctx, ppx, ppy, quality, color);
    }

    // Name badge
    drawTopBadge(ctx, ppx, ppy, p, appearance);
  }

  // 7. VFX
  renderVFX(ctx, gs.vfxQueue);

  // 8. Particles (bounce dust, ace sparks, winner burst)
  renderParticlesTop(ctx, gs, SCALE);

  ctx.restore();

  // 9. Environment overlay (outside translate — full canvas)
  renderEnvironmentOverlay(ctx, gs.environment, W, H);
}

