/**
 * CourtRenderer.js — Surface-aware ISO court rendering
 *
 * Extends the bare-bones isoRenderer court polygon with:
 *  1. Surface-specific textures per courtConfig (clay/grass/hard/indoor)
 *  2. Persistent ball bounce marks (clay = red oval, grass = turf tear, hard = none)
 *  3. Turf stripes, acrylic sheen, indoor glow — all in ISO projection
 *  4. Compatible toIso helper that matches isoRenderer.js math
 *
 * Usage from isoRenderer.js:
 *   drawIsoCourtEnhanced(ctx, gs, W, H)  — replaces the manual court polygon
 *   addCourtMark(gs, ball, shotType)     — call on each ground bounce
 *   initCourtMarks(gs)                   — call in initGameState
 *   pruneOldMarks(gs)                    — call each gameTick (optional)
 */

import { COURT, SCALE } from '../../core/constants.js';

// ── Mark config per surface ───────────────────────────────────────────────────
const MARK_LIFE_MS = 10_000;   // marks persist 10 seconds

const SURFACE_MARK = {
  GRASS: {
    w: 6, h: 3,
    color: (age, maxAge) => {
      const a = Math.max(0, 0.55 - (age / maxAge) * 0.55);
      return `rgba(80,160,60,${a})`;
    },
    strokeColor: (age, maxAge) => {
      const a = Math.max(0, 0.35 - (age / maxAge) * 0.35);
      return `rgba(40,100,30,${a})`;
    },
  },
  CLAY: {
    w: 10, h: 5,
    color: (age, maxAge) => {
      const a = Math.max(0, 0.72 - (age / maxAge) * 0.72);
      return `rgba(180,60,15,${a})`;
    },
    strokeColor: (age, maxAge) => {
      const a = Math.max(0, 0.45 - (age / maxAge) * 0.45);
      return `rgba(100,30,8,${a})`;
    },
  },
  HARD: {
    // Hard courts get very faint skid marks
    w: 7, h: 2,
    color: (age, maxAge) => {
      const a = Math.max(0, 0.18 - (age / maxAge) * 0.18);
      return `rgba(255,255,255,${a})`;
    },
    strokeColor: () => 'transparent',
  },
  INDOOR: {
    w: 6, h: 2,
    color: (age, maxAge) => {
      const a = Math.max(0, 0.12 - (age / maxAge) * 0.12);
      return `rgba(200,200,255,${a})`;
    },
    strokeColor: () => 'transparent',
  },
};

// ── Court mark init ───────────────────────────────────────────────────────────
export function initCourtMarks(gs) {
  gs.courtMarks = [];
}

/**
 * Record a new bounce mark.
 * Call this inside game.js's onBounce handler.
 * @param {object} gs     game state
 * @param {object} ball   current ball
 * @param {string} shotType e.g. 'TOPSPIN', 'FLAT', etc.
 */
export function addCourtMark(gs, ball, shotType) {
  if (!gs.courtMarks) gs.courtMarks = [];
  const surface = gs.courtMeta?.surface ?? 'HARD';
  if (!SURFACE_MARK[surface]) return;

  // Angle from ball velocity direction
  const angle = Math.atan2(ball.vel.x, ball.vel.y);
  const speed  = Math.sqrt(ball.vel.x ** 2 + ball.vel.y ** 2 + ball.vel.z ** 2);

  gs.courtMarks.push({
    courtY: ball.pos.y, // court Y-axis (length)
    courtX: ball.pos.x, // court X-axis (width)
    born:   performance.now(),
    surface,
    angle,
    shotType: shotType || 'FLAT',
    speed,
  });

  // Cap mark count to avoid memory creep
  if (gs.courtMarks.length > 80) gs.courtMarks.shift();
}

/** Remove expired marks. Call from gameTick, optional. */
export function pruneOldMarks(gs) {
  if (!gs.courtMarks) return;
  const now = performance.now();
  gs.courtMarks = gs.courtMarks.filter(m => now - m.born < MARK_LIFE_MS);
}

// ── ISO projection helper (mirrors isoRenderer.js math) ──────────────────────
function toIso(courtY, courtX, W, H) {
  const hl = COURT.halfL * SCALE;
  const hw = COURT.halfW * SCALE;
  const maxExtent = hl + hw;
  const isoX = (W / 2 * 0.90) / maxExtent;
  const isoY = (H / 2 * 0.76) / maxExtent;
  return {
    sx: W / 2 + (courtY - courtX) * isoX,
    sy: H / 2 + 18 + (courtY + courtX) * isoY,
  };
}

function isoLine(ctx, y1, x1, y2, x2, W, H, color, lineWidth = 1.5) {
  const p1 = toIso(y1, x1, W, H);
  const p2 = toIso(y2, x2, W, H);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(p1.sx, p1.sy);
  ctx.lineTo(p2.sx, p2.sy);
  ctx.stroke();
}

// ── Surface textures ──────────────────────────────────────────────────────────

function drawGrassIso(ctx, corners, hl, hw, W, H, visual) {
  // Mow stripes: alternating light/dark columns in court-Y axis
  const stripeCount = 16;
  const stripeStep  = (hl * 2) / stripeCount;
  const darkColor   = visual?.courtDark ?? '#155c30';
  const lightColor  = visual?.courtColor ?? '#1a6e38';

  for (let i = 0; i < stripeCount; i++) {
    const y0 = -hl + i * stripeStep;
    const y1 = y0 + stripeStep;
    const col = i % 2 === 0 ? darkColor : lightColor;

    // 4 corners of this stripe strip
    const p00 = toIso(y0, -hw, W, H);
    const p01 = toIso(y0,  hw, W, H);
    const p10 = toIso(y1, -hw, W, H);
    const p11 = toIso(y1,  hw, W, H);

    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(p00.sx, p00.sy);
    ctx.lineTo(p01.sx, p01.sy);
    ctx.lineTo(p11.sx, p11.sy);
    ctx.lineTo(p10.sx, p10.sy);
    ctx.closePath();
    ctx.fill();
  }
}

function drawClayIso(ctx, corners, hl, hw, W, H, visual) {
  // Solid clay base
  ctx.beginPath();
  corners.forEach((c, i) => i === 0 ? ctx.moveTo(c.sx, c.sy) : ctx.lineTo(c.sx, c.sy));
  ctx.closePath();
  ctx.fillStyle = visual?.courtColor ?? '#c1440e';
  ctx.fill();

  // Darker "heavy" granulate overlay near the baseline zones
  const baselineDepth = hl * 0.18;
  const zones = [
    [-hl, -hl + baselineDepth],
    [ hl - baselineDepth, hl],
  ];
  for (const [yStart, yEnd] of zones) {
    const p0 = toIso(yStart, -hw, W, H);
    const p1 = toIso(yStart,  hw, W, H);
    const p2 = toIso(yEnd,    hw, W, H);
    const p3 = toIso(yEnd,   -hw, W, H);
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.beginPath();
    ctx.moveTo(p0.sx, p0.sy);
    ctx.lineTo(p1.sx, p1.sy);
    ctx.lineTo(p2.sx, p2.sy);
    ctx.lineTo(p3.sx, p3.sy);
    ctx.closePath();
    ctx.fill();
  }
}

function drawHardIso(ctx, corners, hl, hw, W, H, visual) {
  // Two-tone: service boxes slightly lighter, baseline zones slightly darker
  ctx.beginPath();
  corners.forEach((c, i) => i === 0 ? ctx.moveTo(c.sx, c.sy) : ctx.lineTo(c.sx, c.sy));
  ctx.closePath();
  ctx.fillStyle = visual?.courtColor ?? '#2a5fa8';
  ctx.fill();

  // Acrylic sheen: top-left quadrant highlight
  const sly = COURT.serviceLineY * SCALE;
  const topLeft = [toIso(-hl,-hw,W,H), toIso(0,-hw,W,H), toIso(0,0,W,H), toIso(-hl,0,W,H)];
  const grad = ctx.createLinearGradient(topLeft[0].sx, topLeft[0].sy, topLeft[2].sx, topLeft[2].sy);
  grad.addColorStop(0, 'rgba(255,255,255,0.07)');
  grad.addColorStop(1, 'rgba(255,255,255,0.00)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  topLeft.forEach((p, i) => i === 0 ? ctx.moveTo(p.sx, p.sy) : ctx.lineTo(p.sx, p.sy));
  ctx.closePath();
  ctx.fill();
}

function drawIndoorIso(ctx, corners, hl, hw, W, H, visual, isBercy) {
  ctx.beginPath();
  corners.forEach((c, i) => i === 0 ? ctx.moveTo(c.sx, c.sy) : ctx.lineTo(c.sx, c.sy));
  ctx.closePath();
  ctx.fillStyle = visual?.courtColor ?? '#1a1a5a';
  ctx.fill();

  // Overhead light glow from center
  const center = toIso(0, 0, W, H);
  const grd = ctx.createRadialGradient(center.sx, center.sy, 10, center.sx, center.sy, 160);
  grd.addColorStop(0, 'rgba(255,255,255,0.10)');
  grd.addColorStop(1, 'rgba(255,255,255,0.00)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  corners.forEach((c, i) => i === 0 ? ctx.moveTo(c.sx, c.sy) : ctx.lineTo(c.sx, c.sy));
  ctx.closePath();
  ctx.fill();

  // Bercy: horizontal grain (clay embedded)
  if (isBercy) {
    const grainStep = (H / 2 + 18 + (hl + hw) * 0.76 / ((hl + hw) * 2 / (H / 2 * 0.76))) / 16;
    // Just draw semi-transparent horizontal bands across the court area
    ctx.fillStyle = 'rgba(180,120,255,0.03)';
    for (let yi = 0; yi < 12; yi++) {
      const yCoord = -hl + (yi / 12) * hl * 2;
      const p0 = toIso(yCoord, -hw, W, H);
      const p1 = toIso(yCoord + hl / 12, -hw, W, H);
      ctx.fillRect(0, p0.sy, W, Math.abs(p1.sy - p0.sy));
    }
  }
}

// ── Court marks (bounce imprints) ─────────────────────────────────────────────

function drawCourtMarks(ctx, gs, W, H) {
  if (!gs.courtMarks || gs.courtMarks.length === 0) return;
  const now = performance.now();

  for (const mark of gs.courtMarks) {
    const age    = now - mark.born;
    const cfg    = SURFACE_MARK[mark.surface];
    if (!cfg) continue;

    const pos    = toIso(mark.courtY * SCALE, mark.courtX * SCALE, W, H);
    const color  = cfg.color(age, MARK_LIFE_MS);
    const stroke = cfg.strokeColor(age, MARK_LIFE_MS);

    ctx.save();
    ctx.translate(pos.sx, pos.sy);
    ctx.rotate(mark.angle * 0.4);  // slight skew from ball direction

    // Elliptical mark (wider in ball-travel direction)
    const speedBoost = Math.min(2.0, (mark.speed ?? 10) / 12);
    const mw = cfg.w * (0.8 + speedBoost * 0.4);
    const mh = cfg.h;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, mw, mh, 0, 0, Math.PI * 2);
    ctx.fill();

    if (stroke !== 'transparent') {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Clay gets inner detail: lighter center
    if (mark.surface === 'CLAY') {
      const innerA = Math.max(0, 0.3 - (age / MARK_LIFE_MS) * 0.3);
      ctx.fillStyle = `rgba(220,120,60,${innerA})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, mw * 0.45, mh * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// ── Main court lines ──────────────────────────────────────────────────────────

function drawIsoLines(ctx, W, H, lineColor) {
  const hl    = COURT.halfL * SCALE;
  const hw    = COURT.halfW * SCALE;
  const singH = COURT.singlesW / 2 * SCALE;
  const sly   = COURT.serviceLineY * SCALE;
  const lc    = lineColor || 'rgba(240,248,240,0.85)';
  const lc2   = lineColor ? lineColor.replace('0.85', '0.65') : 'rgba(240,248,240,0.65)';

  isoLine(ctx, -hl, -hw,  hl, -hw, W, H, lc);
  isoLine(ctx, -hl,  hw,  hl,  hw, W, H, lc);
  isoLine(ctx, -hl, -hw, -hl,  hw, W, H, lc);
  isoLine(ctx,  hl, -hw,  hl,  hw, W, H, lc);
  isoLine(ctx, -hl, -singH, hl, -singH, W, H, lc2, 1);
  isoLine(ctx, -hl,  singH, hl,  singH, W, H, lc2, 1);
  isoLine(ctx, -sly, -singH, -sly, singH, W, H, lc2, 1);
  isoLine(ctx,  sly, -singH,  sly, singH, W, H, lc2, 1);
  isoLine(ctx, -sly, 0, sly, 0, W, H, lc2.replace('0.65','0.50'), 1);
}

// ── Net ───────────────────────────────────────────────────────────────────────

function drawIsoNet(ctx, W, H, visual) {
  const hw    = COURT.halfW * SCALE;
  const netH  = 22;
  const nL    = toIso(0, -hw, W, H);
  const nR    = toIso(0,  hw, W, H);
  const netColor = visual?.netColor ?? '#e8e0c0';

  // Net shadow
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(nL.sx + 1, nL.sy + 2);
  ctx.lineTo(nR.sx + 1, nR.sy + 2);
  ctx.stroke();

  // Net vertical mesh lines
  const netSegs = 16;
  for (let i = 0; i <= netSegs; i++) {
    const t  = i / netSegs;
    const mx = nL.sx + (nR.sx - nL.sx) * t;
    const my = nL.sy + (nR.sy - nL.sy) * t;
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mx, my - netH);
    ctx.lineTo(mx, my);
    ctx.stroke();
  }

  // Net horizontal bands
  for (let band = 0; band <= 3; band++) {
    const bandY = band / 3;
    const alpha = 0.10 + (1 - bandY) * 0.08;
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(nL.sx, nL.sy - netH * bandY);
    ctx.lineTo(nR.sx, nR.sy - netH * bandY);
    ctx.stroke();
  }

  // Top band — bright
  ctx.strokeStyle = 'rgba(255,255,255,0.88)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(nL.sx, nL.sy - netH);
  ctx.lineTo(nR.sx, nR.sy - netH);
  ctx.stroke();

  // Posts
  ctx.fillStyle = netColor;
  ctx.fillRect(nL.sx - 3, nL.sy - netH - 4, 5, netH + 6);
  ctx.fillRect(nR.sx - 2, nR.sy - netH - 4, 5, netH + 6);
  // Post highlight
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillRect(nL.sx - 3, nL.sy - netH - 4, 2, netH + 4);
  ctx.fillRect(nR.sx - 2, nR.sy - netH - 4, 2, netH + 4);
}

// ── MAIN ENTRY POINT ─────────────────────────────────────────────────────────
/**
 * Full ISO court renderer — replaces the manual court polygon in isoRenderer.js.
 * Call this INSTEAD of the inline court drawing code.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} gs   game state (needs gs.courtVisual, gs.courtMeta, gs.courtMarks)
 * @param {number} W    canvas width
 * @param {number} H    canvas height
 */
export function drawIsoCourtEnhanced(ctx, gs, W, H) {
  const hl     = COURT.halfL * SCALE;
  const hw     = COURT.halfW * SCALE;
  const visual = gs.courtVisual;
  const meta   = gs.courtMeta;
  const surface = meta?.surface ?? 'HARD';

  // Court polygon corners (ISO projected)
  const corners = [
    toIso(-hl, -hw, W, H), toIso( hl, -hw, W, H),
    toIso( hl,  hw, W, H), toIso(-hl,  hw, W, H),
  ];

  // ── Runback zone ──────────────────────────────────────────────
  const runbackColor = visual?.runbackColor ?? '#0e2e18';
  ctx.fillStyle = runbackColor;
  ctx.fillRect(0, 0, W, H);

  // ── Surface draw ──────────────────────────────────────────────
  if (surface === 'GRASS') {
    drawGrassIso(ctx, corners, hl, hw, W, H, visual);
  } else if (surface === 'CLAY') {
    drawClayIso(ctx, corners, hl, hw, W, H, visual);
  } else if (surface === 'INDOOR') {
    drawIndoorIso(ctx, corners, hl, hw, W, H, visual, visual?.bercy);
  } else {
    drawHardIso(ctx, corners, hl, hw, W, H, visual);
  }

  // ── Bounce marks (before lines, so lines overlay marks) ──────
  drawCourtMarks(ctx, gs, W, H);

  // ── Court lines ───────────────────────────────────────────────
  const lineColor = visual?.lineColor ?? 'rgba(240,248,240,0.85)';
  drawIsoLines(ctx, W, H, lineColor);

  // ── Net ───────────────────────────────────────────────────────
  drawIsoNet(ctx, W, H, visual);
}

// ── TOP-DOWN mark overlay ─────────────────────────────────────────────────────
// For use in pixelRenderer.js — draws marks in 2D top-down space.
// Must be called inside the ctx.translate(cx,cy) block.
/**
 * @param {CanvasRenderingContext2D} ctx  (already translated to court centre)
 * @param {object} gs
 */
export function drawTopCourtMarks(ctx, gs) {
  if (!gs.courtMarks || gs.courtMarks.length === 0) return;
  const now = performance.now();

  for (const mark of gs.courtMarks) {
    const age  = now - mark.born;
    const cfg  = SURFACE_MARK[mark.surface];
    if (!cfg) continue;

    const px2 = mark.courtY * SCALE;   // court Y → canvas X (top-down)
    const py2 = mark.courtX * SCALE;   // court X → canvas Y

    const color  = cfg.color(age, MARK_LIFE_MS);
    const stroke = cfg.strokeColor(age, MARK_LIFE_MS);
    const speedBoost = Math.min(2.0, (mark.speed ?? 10) / 12);
    const mw = (cfg.w * (0.8 + speedBoost * 0.4)) * (SCALE / 23);
    const mh = cfg.h * (SCALE / 23);

    ctx.save();
    ctx.translate(Math.round(px2), Math.round(py2));
    ctx.rotate(mark.angle * 0.4);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, mw, mh, 0, 0, Math.PI * 2);
    ctx.fill();

    if (stroke !== 'transparent') {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    ctx.restore();
  }
}

