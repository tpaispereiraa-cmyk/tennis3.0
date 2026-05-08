/**
 * pixelCourt.js — Pixel art court rendering with multi-surface support
 *
 * Accepts a `visual` config from courtConfigs.js to render the correct
 * surface: grass (green stripes), clay (red granulate), hard (blue tiles),
 * indoor (dark glow). Falls back to US_OPEN (hard) if no config passed.
 *
 * Coordinate space: centre at (cx, cy), court length = Y axis (horizontal),
 * court width = X axis (vertical). SCALE = 23 px/metre.
 */

import { COURT, SCALE, CL, CW, CANVAS_PAD_Y, CANVAS_PAD_X } from '../constants.js';

const HY = CANVAS_PAD_Y / 2;
const HX = CANVAS_PAD_X / 2;

// ── Default visual (Hard / US_OPEN fallback) ─────────────────────────────────
const DEFAULT_VISUAL = {
  surface:      'HARD',
  courtColor:   '#2a5fa8',
  courtDark:    '#1e4a88',
  runbackColor: '#102040',
  lineColor:    'rgba(255,255,255,0.90)',
  netColor:     '#d8d8d8',
  stripeAlpha:  0.018,
  hardPattern:  true,
};

// ── Surface texture renderers ────────────────────────────────────────────────

function drawGrassTexture(ctx, visual, hl, hw) {
  const TURF_PX = visual.turfPx ?? 6;
  for (let xi = -hl; xi < hl; xi += TURF_PX * 2) {
    ctx.fillStyle = `rgba(255,255,255,${visual.stripeAlpha ?? 0.028})`;
    ctx.fillRect(xi, -hw, TURF_PX, hw * 2);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.04)';
  for (let yi = -hw; yi < hw; yi += TURF_PX * 3) {
    ctx.fillRect(-hl, yi, hl * 2, 1);
  }
}

function drawClayTexture(ctx, visual, hl, hw) {
  const heavy = visual.clayHeavy;
  ctx.fillStyle = heavy ? 'rgba(0,0,0,0.14)' : 'rgba(0,0,0,0.09)';
  const step = heavy ? 7 : 9;
  for (let xi = -hl + 3; xi < hl - 3; xi += step) {
    for (let yi = -hw + 3; yi < hw - 3; yi += step) {
      if ((xi + yi) % 3 === 0) ctx.fillRect(xi, yi, 2, 2);
    }
  }
  ctx.fillStyle = heavy ? 'rgba(255,200,150,0.07)' : 'rgba(255,200,150,0.04)';
  const lineStep = heavy ? 14 : 20;
  for (let yi = -hw + 6; yi < hw - 6; yi += lineStep) {
    const len = 12 + (Math.abs(yi) % 18);
    ctx.fillRect(-len / 2, yi, len, 1);
  }
}

function drawHardTexture(ctx, visual, hl, hw) {
  const tileSize = 18;
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  for (let xi = -hl; xi < hl; xi += tileSize) {
    ctx.fillRect(xi, -hw, 1, hw * 2);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.04)';
  for (let yi = -hw; yi < hw; yi += tileSize) {
    ctx.fillRect(-hl, yi, hl * 2, 1);
  }
  const grad = ctx.createLinearGradient(-hl, -hw, -hl * 0.2, -hw * 0.2);
  grad.addColorStop(0, 'rgba(255,255,255,0.05)');
  grad.addColorStop(1, 'rgba(255,255,255,0.00)');
  ctx.fillStyle = grad;
  ctx.fillRect(-hl, -hw, hl * 2, hw * 2);
}

function drawIndoorTexture(ctx, visual, hl, hw) {
  const grd = ctx.createRadialGradient(0, 0, hw * 0.1, 0, 0, Math.max(hl, hw) * 0.55);
  grd.addColorStop(0, 'rgba(255,255,255,0.07)');
  grd.addColorStop(1, 'rgba(0,0,0,0.00)');
  ctx.fillStyle = grd;
  ctx.fillRect(-hl, -hw, hl * 2, hw * 2);
  if (visual.bercy) {
    ctx.fillStyle = 'rgba(200,150,255,0.04)';
    for (let yi = -hw; yi < hw; yi += 8) {
      ctx.fillRect(-hl, yi, hl * 2, 1);
    }
  }
}

function drawDesertAmbient(ctx, hl, hw) {
  const g1 = ctx.createLinearGradient(-hl - HY, 0, -hl, 0);
  g1.addColorStop(0, 'rgba(255,160,60,0.06)');
  g1.addColorStop(1, 'rgba(255,160,60,0.00)');
  ctx.fillStyle = g1;
  ctx.fillRect(-hl - HY, -hw - HX, HY, (hw + HX) * 2);
  const g2 = ctx.createLinearGradient(hl, 0, hl + HY, 0);
  g2.addColorStop(0, 'rgba(255,160,60,0.00)');
  g2.addColorStop(1, 'rgba(255,160,60,0.06)');
  ctx.fillStyle = g2;
  ctx.fillRect(hl, -hw - HX, HY, (hw + HX) * 2);
}

// ── Main entry point ──────────────────────────────────────────────────────────
export function drawPixelCourt(ctx, W, H, visual = DEFAULT_VISUAL) {
  const cx = W / 2, cy = H / 2;
  const v  = visual;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.imageSmoothingEnabled = false;

  const hl = CL / 2, hw = CW / 2;

  // ── Full canvas background ──────────────────────────────────────
  const bgColor = v.surface === 'GRASS'  ? '#060d08'
                : v.surface === 'CLAY'   ? '#2a0e06'
                : v.surface === 'INDOOR' ? '#05040e'
                :                          '#04080e';
  ctx.fillStyle = bgColor;
  ctx.fillRect(-W / 2, -H / 2, W, H);

  // ── Runback zone ────────────────────────────────────────────────
  ctx.fillStyle = v.runbackColor;
  ctx.fillRect(-hl - HY, -hw - HX, hl * 2 + HY * 2, hw * 2 + HX * 2);

  // Runback texture (surface-specific)
  if (v.surface === 'GRASS') {
    const tpx = v.turfPx ?? 6;
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let xi = -hl - HY; xi < hl + HY; xi += tpx * 2) {
      ctx.fillRect(xi, -hw - HX, tpx, hw * 2 + HX * 2);
    }
  } else if (v.surface === 'CLAY') {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let xi = -hl - HY; xi < hl + HY; xi += 10) {
      if (Math.abs(xi) % 20 < 5) ctx.fillRect(xi, -hw - HX, 5, hw * 2 + HX * 2);
    }
  } else if (v.surface === 'INDOOR') {
    const ag = ctx.createRadialGradient(0, 0, hl * 0.5, 0, 0, hl * 1.2);
    ag.addColorStop(0, 'rgba(255,255,255,0.00)');
    ag.addColorStop(1, `${v.courtColor}30`);
    ctx.fillStyle = ag;
    ctx.fillRect(-hl - HY, -hw - HX, hl * 2 + HY * 2, hw * 2 + HX * 2);
  }

  if (v.desertAmbient) drawDesertAmbient(ctx, hl, hw);

  // ── Court surface ───────────────────────────────────────────────
  ctx.fillStyle = v.courtColor;
  ctx.fillRect(-hl, -hw, hl * 2, hw * 2);

  // Surface-specific texture
  if (v.surface === 'GRASS' || v.turfPattern) {
    drawGrassTexture(ctx, v, hl, hw);
  } else if (v.clayPattern) {
    drawClayTexture(ctx, v, hl, hw);
  } else if (v.surface === 'INDOOR') {
    drawIndoorTexture(ctx, v, hl, hw);
  } else {
    drawHardTexture(ctx, v, hl, hw);
  }

  // Hard courts: darker service box zones (classic look)
  if (v.surface === 'HARD' || (v.surface === 'INDOOR' && !v.clayPattern)) {
    ctx.fillStyle = v.courtDark;
    ctx.fillRect(-hl, -hw, hl * 2, hw * 0.14);
    ctx.fillRect(-hl,  hw * 0.86, hl * 2, hw * 0.14);
  }

  // ── Pixel court lines ────────────────────────────────────────────
  function pixelLine(x1, y1, x2, y2, thickness = 2) {
    ctx.fillStyle = v.lineColor;
    if (Math.abs(x2 - x1) > Math.abs(y2 - y1)) {
      const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
      ctx.fillRect(minX, y1 - thickness / 2, maxX - minX, thickness);
    } else {
      const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
      ctx.fillRect(x1 - thickness / 2, minY, thickness, maxY - minY);
    }
  }

  const singH = COURT.singlesW / 2 * SCALE;
  const sly   = COURT.serviceLineY * SCALE;

  pixelLine(-hl, -hw,  hl, -hw);
  pixelLine(-hl,  hw,  hl,  hw);
  pixelLine(-hl, -hw, -hl,  hw);
  pixelLine( hl, -hw,  hl,  hw);
  pixelLine(-hl, -singH, hl, -singH, 1.5);
  pixelLine(-hl,  singH, hl,  singH, 1.5);
  pixelLine(-sly, -singH, -sly, singH, 1.5);
  pixelLine( sly, -singH,  sly, singH, 1.5);
  pixelLine(-sly, 0, sly, 0, 1.5);

  // ── Service box labels ──────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.font = '7px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('AD',  -sly / 2, -singH / 2 + 3);
  ctx.fillText('DUO', -sly / 2,  singH / 2 + 3);
  ctx.fillText('DUO',  sly / 2, -singH / 2 + 3);
  ctx.fillText('AD',   sly / 2,  singH / 2 + 3);

  // ── Surface badge (very subtle, bottom of court) ────────────────
  if (v.badge) {
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = `${v.badgeColor ?? '#ffffff'}20`;
    ctx.fillText(v.badge, 0, hw - 6);
  }

  // ── Net ──────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.fillRect(-2, -hw, 4, hw * 2);

  ctx.fillStyle = v.surface === 'INDOOR'
    ? 'rgba(180,190,255,0.14)'
    : 'rgba(200,220,210,0.18)';
  ctx.fillRect(-1, -hw, 2, hw * 2);

  for (let ny = -hw; ny < hw; ny += 4) {
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(-2, ny, 4, 1);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillRect(-2, -hw, 4, 2);

  ctx.fillStyle = v.netColor ?? '#b0b0b0';
  ctx.fillRect(-3, -hw - 5, 6, 7);
  ctx.fillRect(-3,  hw - 2, 6, 7);
  ctx.fillStyle = '#d0d0d0';
  ctx.fillRect(-3, -hw - 5, 2, 5);
  ctx.fillRect(-3,  hw - 2, 2, 5);

  // ── Corner L-marks ──────────────────────────────────────────────
  [[-hl, -hw], [hl, -hw], [-hl, hw], [hl, hw]].forEach(([cx2, cy2]) => {
    const sx = cx2 > 0 ? -1 : 0;
    const sy = cy2 > 0 ? -1 : 0;
    ctx.fillStyle = 'rgba(255,255,255,0.50)';
    ctx.fillRect(cx2 + sx * 3, cy2 + sy * 1, 3, 1);
    ctx.fillRect(cx2 + sx * 1, cy2 + sy * 3, 1, 3);
  });

  // ── Indoor spotlight overlay ────────────────────────────────────
  if (v.indoorGlow) {
    const sg = ctx.createRadialGradient(0, 0, hl * 0.15, 0, 0, hl * 0.9);
    sg.addColorStop(0, 'rgba(255,255,255,0.06)');
    sg.addColorStop(1, 'rgba(255,255,255,0.00)');
    ctx.fillStyle = sg;
    ctx.fillRect(-hl, -hw, hl * 2, hw * 2);
  }

  ctx.restore();
}

// ── Service box highlight ────────────────────────────────────────────────────
export function drawServiceHighlight(ctx, W, H, server, serveLeft, visual = DEFAULT_VISUAL) {
  const cx = W / 2, cy = H / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.imageSmoothingEnabled = false;

  const sly   = COURT.serviceLineY * SCALE;
  const singH = COURT.singlesW / 2 * SCALE;
  const srvSide = server.side;

  const boxY1 = srvSide > 0 ? 0    : -sly;
  const boxY2 = srvSide > 0 ? -sly : 0;
  const boxX1 = serveLeft ? 0     : -singH;
  const boxX2 = serveLeft ? singH : 0;

  const hc = visual.surface === 'CLAY'   ? 'rgba(255,220,80,0.06)'
           : visual.surface === 'INDOOR' ? 'rgba(200,180,255,0.07)'
           :                               'rgba(255,215,0,0.06)';

  const pw = 6;
  for (let bx = Math.min(boxY1, boxY2); bx < Math.max(boxY1, boxY2); bx += pw * 2) {
    for (let by = Math.min(boxX1, boxX2); by < Math.max(boxX1, boxX2); by += pw * 2) {
      ctx.fillStyle = hc;
      ctx.fillRect(bx, by, pw, pw);
      ctx.fillRect(bx + pw, by + pw, pw, pw);
    }
  }

  const bX = Math.min(boxY1, boxY2);
  const bY = Math.min(boxX1, boxX2);
  const bW = Math.abs(boxY2 - boxY1);
  const bH = Math.abs(boxX2 - boxX1);
  ctx.strokeStyle = visual.surface === 'INDOOR'
    ? 'rgba(200,180,255,0.40)'
    : 'rgba(255,215,0,0.35)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(bX, bY, bW, bH);
  ctx.setLineDash([]);

  ctx.restore();
}
