/**
 * sprites.js — Pixel art sprite system  v4.0
 *
 * v4 — upgrade visual completo:
 *  - heightScale: jogadores entre 1.50m–2.30m (heightScale = height_m / 1.75)
 *  - 13 estilos de cabelo: short | long | curly | bun | careca | buzz | afro
 *                           ponytail | mohawk | fade | wavy | braids | shaved
 *  - eyeColor: iris colorida com pupila e brilho pixel
 *  - shirtType: 'sport' | 'polo' | 'sleeveless'
 *  - shirtPattern: 'clean' | 'stripe_h' | 'stripe_v' | 'stripe_side' | 'blocked'
 *  - wristband: 'none'|'left'|'right'|'both'  + wristbandColor
 *  - ankleBand: 'none'|'left'|'right'|'both'  + ankleBandColor
 *  - accessory expandido: 'none'|'cap'|'cap_back'|'visor'|'bandana'|'headband'
 *  - racketGrip: cor separada do cabo
 *  - stripeColor2: segunda cor de padrão (blocked / stripe duplo)
 *  - bodyType expandido: slim | medium | athletic | tall | stocky
 *  - Animação de corrida de 4 frames mantida
 */

const FRAME_DUR_MS = 71;
const RUN_FRAMES   = 4;

export function tickSpriteAnim() {}
export function getSpriteFrame() { return 0; }

function getRunFrame() {
  return Math.floor(performance.now() / FRAME_DUR_MS) % RUN_FRAMES;
}

// ── Colour helpers ──────────────────────────────────────────────────
function hexToRgb(hex) {
  const clean = (hex || '#888888').replace('#', '');
  const n = parseInt(clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean, 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}
function lighten(hex, amt = 40) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.min(255,r+amt)},${Math.min(255,g+amt)},${Math.min(255,b+amt)})`;
}
function darken(hex, amt = 40) { return lighten(hex, -amt); }
function alpha(hex, a) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

function px(ctx, x, y, w, h, color) {
  if (!color || color === 'none') return;
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

// ══════════════════════════════════════════════════════════════════
//  TOP-DOWN SPRITE
// ══════════════════════════════════════════════════════════════════
const TOP_R  = 6;
const TOP_RA = 5;

export function drawTopSprite(ctx, cx, cy, config, facing = 0, swinging = false, swingProgress = 0) {
  const {
    hairColor     = '#333333',
    racketColor   = '#111111',
    racketGrip,
    skin          = '#c8845a',
    accessory     = 'none',
    accessoryColor,
    shirtColor    = '#ffffff',
    shortsColor   = '#1a237e',
    racketStrings = '#ccff00',
    eyeColor      = '#1a1a1a',
    heightScale   = 1.0,
    speed         = 0,
  } = config;

  cx = Math.round(cx); cy = Math.round(cy);
  const hs = Math.max(0.85, Math.min(1.35, heightScale));

  // Shadow
  const shadowStretch = 1 + Math.min(speed * 0.04, 0.3);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(cx + 1, cy + 2, (TOP_R + 1) * shadowStretch * hs, TOP_R * 0.5 * hs, 0, 0, Math.PI * 2);
  ctx.fill();

  const contactScale = swinging && swingProgress > 0.3 && swingProgress < 0.6
    ? 1 + (0.3 - Math.abs(swingProgress - 0.45) / 0.45) * 0.08
    : 1.0;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(contactScale * hs, contactScale * hs);

  // Shirt body circle — top 2/3 = shirt, bottom 1/3 = shorts
  // We draw the full circle in shirt color, then overdraw the bottom arc with shorts color
  ctx.fillStyle = shirtColor;
  ctx.beginPath(); ctx.arc(0, 0, TOP_R, 0, Math.PI * 2); ctx.fill();

  // Bottom 1/3 = shorts — clip using a path for the lower portion
  // Chord at y = TOP_R * (1/3) divides the circle into upper 2/3 and lower 1/3
  const shortsStartY = TOP_R * (1 / 3);  // y-offset where shorts begin
  ctx.save();
  ctx.beginPath();
  ctx.rect(-TOP_R - 1, shortsStartY, (TOP_R + 1) * 2, TOP_R - shortsStartY + 1);
  ctx.clip();
  ctx.fillStyle = shortsColor;
  ctx.beginPath(); ctx.arc(0, 0, TOP_R, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Shirt outline
  ctx.strokeStyle = darken(shirtColor, 25);
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, TOP_R, 0, Math.PI * 2); ctx.stroke();

  // Shirt/shorts dividing line
  ctx.strokeStyle = darken(shortsColor, 15);
  ctx.lineWidth = 0.8;
  const chordHalfW = Math.sqrt(Math.max(0, TOP_R * TOP_R - shortsStartY * shortsStartY));
  ctx.beginPath();
  ctx.moveTo(-chordHalfW, shortsStartY);
  ctx.lineTo( chordHalfW, shortsStartY);
  ctx.stroke();

  // Head / hair
  ctx.fillStyle = hairColor;
  ctx.beginPath(); ctx.arc(0, 0, TOP_R * 0.6, 0, Math.PI * 2); ctx.fill();

  // Accessory overlay on head
  if (accessory === 'cap' || accessory === 'cap_back') {
    const ac = accessoryColor || shirtColor;
    ctx.fillStyle = ac;
    ctx.beginPath(); ctx.arc(0, 0, TOP_R * 0.68, 0, Math.PI * 2); ctx.fill();
    const brimDir = accessory === 'cap_back' ? Math.PI : 0;
    ctx.fillStyle = darken(ac, 20);
    ctx.beginPath();
    ctx.arc(Math.cos(brimDir) * 5, Math.sin(brimDir) * 5, 3.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (accessory === 'bandana') {
    ctx.fillStyle = accessoryColor || '#ffffff';
    ctx.beginPath(); ctx.arc(0, 0, TOP_R * 0.65, 0, Math.PI * 2); ctx.fill();
  } else if (accessory === 'headband') {
    ctx.strokeStyle = accessoryColor || '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, TOP_R * 0.6 + 0.5, -0.9, 0.9); ctx.stroke();
  }

  // Eye highlight
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath(); ctx.arc(-1, -1, TOP_R * 0.24, 0, Math.PI * 2); ctx.fill();

  // Racket arm
  const armLen = swinging ? TOP_RA + 3 : TOP_RA;
  const armX = Math.cos(facing) * (TOP_R + 1);
  const armY = Math.sin(facing) * (TOP_R + 1);
  const racX  = Math.cos(facing) * (TOP_R + armLen);
  const racY  = Math.sin(facing) * (TOP_R + armLen);

  ctx.strokeStyle = darken(skin, 10);
  ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(armX, armY); ctx.lineTo(racX, racY); ctx.stroke();

  // Grip stub
  if (racketGrip) {
    ctx.strokeStyle = racketGrip;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(armX, armY);
    ctx.lineTo(armX + (racX - armX) * 0.4, armY + (racY - armY) * 0.4);
    ctx.stroke();
  }

  // Racket oval
  ctx.save();
  ctx.translate(racX, racY);
  ctx.rotate(facing + Math.PI / 2);
  ctx.strokeStyle = racketColor;
  ctx.lineWidth = swinging ? 2.5 : 1.5;
  ctx.beginPath(); ctx.ellipse(0, 0, 3.5, 2.5, 0, 0, Math.PI * 2); ctx.stroke();

  if (swinging && swingProgress > 0.28 && swingProgress < 0.62) {
    const smearAlpha = 0.5 * (1 - Math.abs(swingProgress - 0.45) / 0.17);
    ctx.strokeStyle = `rgba(255,255,200,${smearAlpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0, 0, 5, 3.5, 0, 0, Math.PI * 2); ctx.stroke();
  }

  ctx.strokeStyle = racketStrings;
  ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(0, -2.5); ctx.lineTo(0, 2.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-3.5, 0); ctx.lineTo(3.5, 0); ctx.stroke();
  ctx.restore();

  ctx.restore();
}


// ══════════════════════════════════════════════════════════════════
//  SIDE-VIEW SPRITE  (iso + tv cameras)
// ══════════════════════════════════════════════════════════════════

const BODY_W = { slim: 5, medium: 6, athletic: 7, tall: 5, stocky: 8 };
const BODY_H = { slim: 7, medium: 7, athletic: 8, tall: 9, stocky: 7 };

const RUN_CYCLE = [
  { lFwd: true,  rFwd: false, lBend: 0.2, rBend: 0.8, lArmDy:  1, rArmDy: -1, bodyDy:  0 },
  { lFwd: false, rFwd: false, lBend: 0.5, rBend: 0.3, lArmDy:  0, rArmDy:  0, bodyDy: -1 },
  { lFwd: false, rFwd: true,  lBend: 0.8, rBend: 0.2, lArmDy: -1, rArmDy:  1, bodyDy:  0 },
  { lFwd: false, rFwd: false, lBend: 0.3, rBend: 0.5, lArmDy:  0, rArmDy:  0, bodyDy: -1 },
];

const POSES = {
  idle:  { dy: 0, armR:{dx:4,dy:6,w:2,h:4},  armL:{dx:-5,dy:6,w:2,h:4},  racketDx:6,  racketDy:5,  racketAngle:0,     racketSide:1,  eyeDx:0 },
  run:   { dy: 0, armR:{dx:4,dy:5,w:2,h:4},  armL:{dx:-5,dy:7,w:2,h:4},  racketDx:6,  racketDy:4,  racketAngle:0.25,  racketSide:1,  eyeDx:1 },
  fh:    { dy: 1, armR:{dx:6,dy:4,w:2,h:5},  armL:{dx:-4,dy:6,w:2,h:3},  racketDx:9,  racketDy:0,  racketAngle:-0.6,  racketSide:1,  eyeDx:1 },
  bh:    { dy: 1, armR:{dx:3,dy:6,w:2,h:3},  armL:{dx:-7,dy:4,w:2,h:5},  racketDx:-10,racketDy:0,  racketAngle:0.6,   racketSide:-1, eyeDx:-1 },
  srv:   { dy:-2, armR:{dx:5,dy:2,w:2,h:6},  armL:{dx:-4,dy:3,w:2,h:3},  racketDx:6,  racketDy:-5, racketAngle:-0.8,  racketSide:1,  eyeDx:0, tossBall:true },
  vol:   { dy: 0, armR:{dx:7,dy:4,w:2,h:4},  armL:{dx:-4,dy:5,w:2,h:3},  racketDx:9,  racketDy:2,  racketAngle:-0.15, racketSide:1,  eyeDx:1 },
  slide: { dy: 3, armR:{dx:4,dy:5,w:2,h:4},  armL:{dx:-6,dy:4,w:2,h:4},  racketDx:-9, racketDy:3,  racketAngle:0.5,   racketSide:-1, eyeDx:-1 },
  cel:   { dy:-3, armR:{dx:6,dy:2,w:2,h:5},  armL:{dx:-6,dy:2,w:2,h:5},  racketDx:8,  racketDy:-4, racketAngle:-1.1,  racketSide:1,  eyeDx:0 },
};

// ── Racket ──────────────────────────────────────────────────────────
function drawRacket(ctx, dx, dy, angle, racketColor, racketGrip, stringsColor, swingProgress, pose) {
  const grip = racketGrip || darken(racketColor, 12);
  ctx.save();
  ctx.translate(dx, dy);
  ctx.rotate(angle);

  // Grip / handle
  ctx.fillStyle = grip;
  ctx.fillRect(-1, 2, 2, 6);
  ctx.fillStyle = lighten(grip, 18);
  ctx.fillRect(-1, 4, 1, 1);
  ctx.fillRect(-1, 7, 1, 1);

  // Frame
  ctx.strokeStyle = racketColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, -3, 3, 4.5, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Frame shine
  ctx.strokeStyle = lighten(racketColor, 35);
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.ellipse(-0.8, -3.5, 1.4, 2, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Motion smear during contact
  const isSwingPose = pose === 'fh' || pose === 'bh' || pose === 'vol';
  if (isSwingPose && swingProgress > 0.28 && swingProgress < 0.65) {
    const smearAmt = 1 - Math.abs(swingProgress - 0.46) / 0.18;
    const smearDir = (pose === 'bh') ? 1 : -1;
    ctx.globalAlpha = 0.25 * smearAmt;
    ctx.strokeStyle = lighten(racketColor, 50);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(smearDir * 2.5, -3.5, 3.5, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Strings
  ctx.strokeStyle = stringsColor + 'cc';
  ctx.lineWidth = 0.7;
  for (let sx = -2; sx <= 2; sx += 2) {
    ctx.beginPath(); ctx.moveTo(sx, -0.5); ctx.lineTo(sx, -5.5); ctx.stroke();
  }
  for (let sy = -1.5; sy >= -5; sy -= 1.5) {
    ctx.beginPath(); ctx.moveTo(-2.5, sy); ctx.lineTo(2.5, sy); ctx.stroke();
  }

  ctx.restore();
}

// ── Leg ────────────────────────────────────────────────────────────
function drawLeg(ctx, baseX, feetY, fwd, bend, skinColor, shortsColor, sockColor, shoeColor, shoeAccent, drawAnkleBand, ankleBandColor) {
  const thighX   = baseX + (fwd ? 1 : -1);
  const thighLen = 4;
  const kneeX    = baseX + (fwd ? 1 - bend * 2 : -1 + bend * 2);
  const kneeY    = feetY - 13 + thighLen;
  const footLift = bend * 4;
  const shinX    = kneeX + (fwd ? -0.5 : 0.5);
  const shinY    = kneeY;
  const footY    = feetY - footLift;

  px(ctx, thighX - 1, feetY - 13, 2, thighLen, skinColor);
  px(ctx, kneeX - 1,  kneeY,      3, 1,        darken(skinColor, 15));
  px(ctx, shinX - 1,  shinY,      2, 3,        skinColor);

  // Sock
  px(ctx, shinX - 1, footY - 6 + footLift * 0.3, 2, 2, sockColor);

  // Ankle band (above shoe, visible stripe over sock)
  if (drawAnkleBand) {
    px(ctx, shinX - 2, footY - 7 + footLift * 0.3, 4, 2, ankleBandColor || '#ff4444');
    px(ctx, shinX - 2, footY - 7 + footLift * 0.3, 4, 1, lighten(ankleBandColor || '#ff4444', 25));
  }

  // Shoe
  px(ctx, shinX - 1, footY - 4 + footLift * 0.3, 3, 2, shoeColor);
  px(ctx, shinX - 1, footY - 3 + footLift * 0.3, 3, 1, shoeAccent);
  px(ctx, shinX + 1, footY - 4 + footLift * 0.3, 1, 1, lighten(shoeColor, 30));
}

// ── Torso with shirt type + pattern ────────────────────────────────
function drawTorso(ctx, tx, ty, bw, bh, shirtColor, shirtType, shirtPattern, stripeColor, stripeColor2) {

  if (shirtType === 'sleeveless') {
    // Regata — no shoulder coverage, V-neck
    px(ctx, tx + 1, ty,     bw - 2, bh, shirtColor);
    px(ctx, tx,     ty + 1, bw,     bh - 2, shirtColor);
    // V-neck indent
    px(ctx, tx + Math.floor(bw/2) - 1, ty, 2, 3, darken(shirtColor, 18));
  } else if (shirtType === 'polo') {
    px(ctx, tx, ty, bw, bh, shirtColor);
    // Collar strip + button
    px(ctx, tx + Math.floor(bw/2) - 1, ty,     2, 2, darken(shirtColor, 38));
    px(ctx, tx + Math.floor(bw/2) - 1, ty + 2, 1, 1, darken(shirtColor, 22));
    px(ctx, tx + Math.floor(bw/2),     ty,     1, 1, lighten(shirtColor, 55));
  } else {
    // Sport default
    px(ctx, tx, ty, bw, bh, shirtColor);
    // Small collar shadow
    px(ctx, tx + Math.floor(bw/2) - 1, ty, 2, 2, darken(shirtColor, 10));
    px(ctx, tx + Math.floor(bw/2),     ty, 1, 1, darken(shirtColor, 25));
  }

  // Shading edges
  px(ctx, tx,         ty + 1, 1, bh - 2, darken(shirtColor, 30));
  px(ctx, tx + bw - 1, ty + 1, 1, bh - 2, darken(shirtColor, 18));
  px(ctx, tx + 1,     ty,     bw - 2, 1,  lighten(shirtColor, 40));
  px(ctx, tx,         ty + bh - 1, bw, 1, darken(shirtColor, 20));

  // Pattern overlay
  const sc  = stripeColor  || lighten(shirtColor, 65);
  const sc2 = stripeColor2 || sc;

  if (shirtPattern === 'stripe_h') {
    // One horizontal stripe at mid-chest
    const sy = ty + Math.floor(bh / 2);
    px(ctx, tx + 1, sy,     bw - 2, 1, sc);
    px(ctx, tx + 1, sy + 1, bw - 2, 1, sc2);
  } else if (shirtPattern === 'stripe_v') {
    // Two vertical stripes, 1/3 and 2/3
    px(ctx, tx + Math.floor(bw / 3),         ty + 1, 1, bh - 2, sc);
    px(ctx, tx + Math.floor(bw * 2 / 3) - 1, ty + 1, 1, bh - 2, sc2);
  } else if (shirtPattern === 'stripe_side') {
    // Side panel strips (each side border)
    px(ctx, tx,           ty + 1, 1, bh - 2, sc);
    px(ctx, tx + 1,       ty + 2, 1, bh - 4, darken(sc, 15));
    px(ctx, tx + bw - 1,  ty + 1, 1, bh - 2, sc2);
    px(ctx, tx + bw - 2,  ty + 2, 1, bh - 4, darken(sc2, 15));
  } else if (shirtPattern === 'blocked') {
    // Upper half vs lower half two-tone
    const mid = Math.ceil(bh / 2);
    px(ctx, tx + 1, ty + mid, bw - 2, bh - mid, sc);
    // Re-apply edge shading on lower block
    px(ctx, tx,         ty + mid, 1, bh - mid, darken(sc, 22));
    px(ctx, tx + bw - 1, ty + mid, 1, bh - mid, darken(sc, 12));
  }
  // 'clean': no pattern — pure shirt colour
}

// ── Hair styles ─────────────────────────────────────────────────────
function drawHair(ctx, headX, headY, headW, hair, hairColor) {
  switch (hair) {
    case 'long':
      px(ctx, headX,         headY,     headW,     2, hairColor);
      px(ctx, headX - 1,     headY,     headW + 2, 1, darken(hairColor, 12));
      px(ctx, headX - 1,     headY + 1, 1, 5, hairColor);
      px(ctx, headX + headW, headY + 1, 1, 5, hairColor);
      px(ctx, headX - 1,     headY + 5, headW + 2, 1, darken(hairColor, 20));
      break;
    case 'curly':
      px(ctx, headX - 1, headY - 1, headW + 2, 3, hairColor);
      px(ctx, headX - 1, headY + 1, 1, 3, hairColor);
      px(ctx, headX + headW, headY + 1, 1, 3, hairColor);
      px(ctx, headX,     headY - 1, 1, 1, lighten(hairColor, 28));
      px(ctx, headX + 3, headY - 1, 1, 1, lighten(hairColor, 28));
      px(ctx, headX + 1, headY - 2, 2, 1, hairColor);
      break;
    case 'bun':
      // Top bun + slight side wisps
      px(ctx, headX + 1, headY - 3, 3, 3, hairColor);
      px(ctx, headX + 2, headY - 4, 1, 1, lighten(hairColor, 22));
      px(ctx, headX,     headY,     headW, 1, hairColor);
      px(ctx, headX - 1, headY + 1, 1, 2, hairColor);
      break;
    case 'careca':
    case 'shaved':
      // Bald / shaved — just a subtle shine
      px(ctx, headX + 1, headY, 2, 1, 'rgba(255,255,255,0.20)');
      if (hair === 'shaved') {
        px(ctx, headX,     headY + 1, 1, 1, alpha(hairColor, 0.28));
        px(ctx, headX + 4, headY + 1, 1, 1, alpha(hairColor, 0.28));
      }
      break;
    case 'buzz':
      // Very close crop — thin uniform cap
      px(ctx, headX,         headY,     headW,     1, hairColor);
      px(ctx, headX - 1,     headY + 1, 1, 1, hairColor);
      px(ctx, headX + headW, headY + 1, 1, 1, hairColor);
      break;
    case 'afro':
      // Big natural puff extending sides and top
      px(ctx, headX - 2, headY - 2, headW + 4, 4, hairColor);
      px(ctx, headX - 2, headY + 1, 1, 2, hairColor);
      px(ctx, headX + headW + 1, headY + 1, 1, 2, hairColor);
      px(ctx, headX + 1, headY - 3, 3, 1, hairColor);
      px(ctx, headX,     headY - 2, 1, 1, lighten(hairColor, 22));
      px(ctx, headX + 3, headY - 3, 1, 1, lighten(hairColor, 22));
      break;
    case 'ponytail':
      // Short on top, long tail at back
      px(ctx, headX,     headY,     headW, 2, hairColor);
      px(ctx, headX - 1, headY + 1, 1, 5, hairColor);
      px(ctx, headX - 2, headY + 2, 1, 5, darken(hairColor, 12));
      // Tie
      px(ctx, headX - 1, headY + 4, 2, 1, darken(hairColor, 30));
      break;
    case 'mohawk':
      // Shaved sides, centre ridge
      px(ctx, headX + 2, headY - 3, 1, 5, hairColor);
      px(ctx, headX + 1, headY - 2, 1, 4, darken(hairColor, 18));
      px(ctx, headX + 3, headY - 2, 1, 4, darken(hairColor, 18));
      break;
    case 'fade':
      // Fuller on top, faded pixel rows on sides
      px(ctx, headX,         headY,     headW,     2, hairColor);
      px(ctx, headX - 1,     headY + 1, 1, 2, alpha(hairColor, 0.50));
      px(ctx, headX + headW, headY + 1, 1, 2, alpha(hairColor, 0.50));
      px(ctx, headX + 1,     headY,     1, 1, lighten(hairColor, 22));
      break;
    case 'wavy':
      // Longer wavy top
      px(ctx, headX,         headY - 1, headW,     3, hairColor);
      px(ctx, headX - 1,     headY + 1, 1, 2, hairColor);
      px(ctx, headX + headW, headY + 1, 1, 2, hairColor);
      px(ctx, headX,         headY - 1, 1, 1, lighten(hairColor, 20));
      px(ctx, headX + 2,     headY - 2, 2, 1, lighten(hairColor, 14));
      px(ctx, headX + 4,     headY - 1, 1, 1, lighten(hairColor, 20));
      break;
    case 'braids':
      // Long braids with segmented shine pixels
      px(ctx, headX,         headY,     headW, 2, hairColor);
      px(ctx, headX - 1,     headY + 1, 1, 5, hairColor);
      px(ctx, headX + headW, headY + 1, 1, 5, hairColor);
      // Braid segments
      for (let i = 1; i <= 4; i += 2) {
        px(ctx, headX - 1, headY + i, 1, 1, lighten(hairColor, 22));
        px(ctx, headX + headW, headY + i, 1, 1, lighten(hairColor, 22));
      }
      break;
    default: // 'short'
      px(ctx, headX,         headY,     headW, 2, hairColor);
      px(ctx, headX - 1,     headY + 1, 1, 1, hairColor);
      px(ctx, headX + headW, headY + 1, 1, 1, hairColor);
      px(ctx, headX + 1,     headY,     1, 1, lighten(hairColor, 22));
      break;
  }
}

// ── Head accessories ────────────────────────────────────────────────
function drawHeadAccessory(ctx, headX, headY, headW, accessory, accessoryColor, shirtColor) {
  if (!accessory || accessory === 'none') return;
  const ac = accessoryColor || shirtColor || '#ffffff';

  if (accessory === 'cap') {
    // Brim forward
    px(ctx, headX - 1, headY - 1, headW + 2, 3, ac);
    px(ctx, headX + 2, headY - 2, 2, 1, lighten(ac, 22));
    px(ctx, headX - 1, headY + 1, headW + 2, 1, darken(ac, 22));
    // Front brim tip
    px(ctx, headX + headW, headY + 1, 2, 1, darken(ac, 35));
    px(ctx, headX + headW + 1, headY + 2, 1, 1, darken(ac, 40));
  } else if (accessory === 'cap_back') {
    // Brim backward
    px(ctx, headX - 1, headY - 1, headW + 2, 3, ac);
    px(ctx, headX + 1, headY - 2, 2, 1, lighten(ac, 22));
    px(ctx, headX - 1, headY + 1, headW + 2, 1, darken(ac, 22));
    // Back brim
    px(ctx, headX - 3, headY + 1, 2, 1, darken(ac, 35));
    px(ctx, headX - 4, headY + 2, 1, 1, darken(ac, 40));
    // Snap closure button
    px(ctx, headX - 1, headY, 1, 1, darken(ac, 45));
  } else if (accessory === 'visor') {
    // Open top visor — just the band + front brim
    px(ctx, headX,     headY,     headW,     2, ac);
    px(ctx, headX - 1, headY + 1, headW + 2, 1, darken(ac, 28));
    px(ctx, headX + headW, headY + 1, 2, 1, darken(ac, 40));
  } else if (accessory === 'bandana') {
    // Cloth tied around forehead
    px(ctx, headX,     headY,     headW,     2, ac);
    px(ctx, headX - 1, headY,     headW + 2, 1, darken(ac, 14));
    // Knot tail at back
    px(ctx, headX - 1, headY + 2, 2, 3, darken(ac, 22));
    px(ctx, headX - 1, headY + 1, 1, 2, lighten(ac, 12));
  } else if (accessory === 'headband') {
    // Thin elastic across forehead
    px(ctx, headX - 1, headY + 1, headW + 2, 1, ac);
    px(ctx, headX,     headY + 1, headW,     1, lighten(ac, 32));
  }
}

// ── Wristband ───────────────────────────────────────────────────────
function drawWristband(ctx, ax, ay, aw, ah, color) {
  if (!color) return;
  px(ctx, ax - 1, ay + ah - 2, aw + 2, 2, color);
  px(ctx, ax - 1, ay + ah - 2, aw + 2, 1, lighten(color, 28));
}


// ══════════════════════════════════════════════════════════════════
//  drawSprite — main entry point
// ══════════════════════════════════════════════════════════════════
export function drawSprite(ctx, cx, cy, config, scale = 1.0) {
  const {
    skin           = '#c8845a',
    hair           = 'short',
    hairColor      = '#333333',
    eyeColor       = '#1a1a1a',
    bodyType       = 'medium',
    shirtColor     = '#ffffff',
    shirtType      = 'sport',
    shirtPattern   = 'clean',
    shortsColor    = '#1a237e',
    shoeColor      = '#ffd700',
    shoeAccent     = '#ffffff',
    sockColor,
    racketColor    = '#111111',
    racketGrip,
    racketStrings  = '#ccff00',
    accessory      = 'none',
    accessoryColor,
    stripeColor,
    stripeColor2,
    wristband      = 'none',
    wristbandColor = '#ffffff',
    ankleBand      = 'none',
    ankleBandColor = '#ff4444',
    heightScale    = 1.0,
    pose           = 'idle',
    swingProgress  = 0,
    speed          = 0,
    flipX          = false,
    forceLean,
  } = config;

  const socks = sockColor || '#eeeeee';

  // heightScale clamped: 1.50m→0.857, 2.30m→1.314
  const hs = Math.max(0.85, Math.min(1.35, heightScale));

  const maxLean = 0.12;
  const lean    = forceLean !== undefined
    ? forceLean
    : Math.sign(speed || 0) * Math.min(Math.abs(speed) * 0.014, maxLean);

  let swingBodyDy = 0, swingBodyLean = 0;
  const isFH = pose === 'fh', isBH = pose === 'bh';

  if ((isFH || isBH) && swingProgress > 0) {
    if (swingProgress < 0.32) {
      const t = swingProgress / 0.32;
      swingBodyDy   = t * 2.5;
      swingBodyLean = (isFH ? 0.06 : -0.06) * t;
    } else if (swingProgress < 0.60) {
      const t = (swingProgress - 0.32) / 0.28;
      swingBodyDy   = 2.5 - t * 4.0;
      swingBodyLean = (isFH ? 0.06 : -0.06) * (1 - t);
    } else {
      const t = (swingProgress - 0.60) / 0.40;
      swingBodyDy   = -1.5 + t * 1.5;
      swingBodyLean = 0;
    }
  }

  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));
  if (scale !== 1.0) ctx.scale(scale, scale);
  if (hs !== 1.0)    ctx.scale(hs, hs);
  if (flipX)         ctx.scale(-1, 1);
  ctx.rotate(lean + swingBodyLean);
  ctx.imageSmoothingEnabled = false;

  const pd   = POSES[pose] || POSES.idle;
  const bw   = BODY_W[bodyType] || 6;
  const bh   = BODY_H[bodyType] || 7;
  const half = Math.floor(bw / 2);
  const dy   = pd.dy + swingBodyDy;

  const frm = getRunFrame();
  const rc  = RUN_CYCLE[frm];

  // ── Shadow ───────────────────────────────────────────────────
  const shadowW = 7 + speed * 0.18;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 1, Math.min(shadowW, 11), 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Motion ghost ─────────────────────────────────────────────
  if (speed > 4.5 && (pose === 'run' || pose === 'slide')) {
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    ctx.fillRect(-half - 3, -28 + dy, bw + 6, 28);
    if (speed > 6.5) {
      ctx.fillStyle = 'rgba(255,255,255,0.02)';
      ctx.fillRect(-half - 5, -28 + dy, bw + 10, 28);
    }
  }

  // ── Ankle band flags ─────────────────────────────────────────
  const ankleL = ankleBand === 'left'  || ankleBand === 'both';
  const ankleR = ankleBand === 'right' || ankleBand === 'both';

  // ── Legs ─────────────────────────────────────────────────────
  if (pose === 'run') {
    drawLeg(ctx, -half+1, dy, rc.lFwd, rc.lBend, skin, shortsColor, socks, shoeColor, shoeAccent, ankleL, ankleBandColor);
    drawLeg(ctx,  half-1, dy, rc.rFwd, rc.rBend, skin, shortsColor, socks, shoeColor, shoeAccent, ankleR, ankleBandColor);
  } else if (pose === 'fh') {
    const pb = swingProgress < 0.32 ? swingProgress / 0.32 * 0.4 : 0.2;
    drawLeg(ctx, -half+1, dy, true,  pb, skin, shortsColor, socks, shoeColor, shoeAccent, ankleL, ankleBandColor);
    drawLeg(ctx,  half-1, dy, false, 0,  skin, shortsColor, socks, shoeColor, shoeAccent, ankleR, ankleBandColor);
  } else if (pose === 'bh') {
    const pb = swingProgress < 0.32 ? swingProgress / 0.32 * 0.4 : 0.2;
    drawLeg(ctx, -half+1, dy, false, 0,  skin, shortsColor, socks, shoeColor, shoeAccent, ankleL, ankleBandColor);
    drawLeg(ctx,  half-1, dy, true,  pb, skin, shortsColor, socks, shoeColor, shoeAccent, ankleR, ankleBandColor);
  } else if (pose === 'slide') {
    drawLeg(ctx, -half-1, dy+2, true,  0.1, skin, shortsColor, socks, shoeColor, shoeAccent, ankleL, ankleBandColor);
    drawLeg(ctx,  half+1, dy+2, false, 0.1, skin, shortsColor, socks, shoeColor, shoeAccent, ankleR, ankleBandColor);
  } else if (pose === 'cel') {
    drawLeg(ctx, -half+1, dy-2, true,  0.5, skin, shortsColor, socks, shoeColor, shoeAccent, ankleL, ankleBandColor);
    drawLeg(ctx,  half-1, dy-2, true,  0.5, skin, shortsColor, socks, shoeColor, shoeAccent, ankleR, ankleBandColor);
  } else {
    drawLeg(ctx, -half+1, dy, false, 0, skin, shortsColor, socks, shoeColor, shoeAccent, ankleL, ankleBandColor);
    drawLeg(ctx,  half-1, dy, false, 0, skin, shortsColor, socks, shoeColor, shoeAccent, ankleR, ankleBandColor);
  }

  // ── Shorts ────────────────────────────────────────────────────
  const shortsY = dy - 14;
  px(ctx, -half-1, shortsY,     bw+2, 5, shortsColor);
  px(ctx, -half-1, shortsY,     bw+2, 1, lighten(shortsColor, 22));
  px(ctx, 0,       shortsY + 1, 1,    3, darken(shortsColor, 15));

  // ── Torso ─────────────────────────────────────────────────────
  const torsoY = shortsY - bh;
  drawTorso(ctx, -half, torsoY, bw, bh, shirtColor, shirtType, shirtPattern, stripeColor, stripeColor2);

  // ── Arms ─────────────────────────────────────────────────────
  let aR = { ...pd.armR }, aL = { ...pd.armL };
  const armBaseY = torsoY + 1;

  if (pose === 'run') {
    aR = { ...aR, dy: aR.dy + rc.rArmDy };
    aL = { ...aL, dy: aL.dy + rc.lArmDy };
  } else if ((isFH || isBH) && swingProgress > 0) {
    const contact = swingProgress > 0.32 && swingProgress < 0.62
      ? (1 - Math.abs(swingProgress - 0.47) / 0.15) * 3
      : 0;
    if (isFH) aR = { ...aR, dx: aR.dx + contact, dy: aR.dy - contact * 0.5 };
    else       aL = { ...aL, dx: aL.dx - contact, dy: aL.dy - contact * 0.5 };
  }

  px(ctx, aL.dx-1, armBaseY+aL.dy, aL.w, aL.h, skin);
  px(ctx, aL.dx-1, armBaseY+aL.dy, 1,    aL.h, darken(skin, 15));
  px(ctx, aR.dx-1, armBaseY+aR.dy, aR.w, aR.h, skin);
  px(ctx, aR.dx,   armBaseY+aR.dy, 1,    aR.h, lighten(skin, 15));

  // Wristbands
  const wristL = wristband === 'left'  || wristband === 'both';
  const wristR = wristband === 'right' || wristband === 'both';
  if (wristL) drawWristband(ctx, aL.dx-1, armBaseY+aL.dy, aL.w, aL.h, wristbandColor);
  if (wristR) drawWristband(ctx, aR.dx-1, armBaseY+aR.dy, aR.w, aR.h, wristbandColor);

  // ── Racket ────────────────────────────────────────────────────
  let racketAngle = pd.racketAngle;
  if ((isFH || isBH) && swingProgress > 0) {
    const swingDir = (isBH ? 1 : -1) * (pd.racketSide || 1);
    if (swingProgress < 0.32) {
      racketAngle += swingDir * swingProgress / 0.32 * 0.4;
    } else if (swingProgress < 0.62) {
      const t = (swingProgress - 0.32) / 0.30;
      racketAngle += swingDir * (0.4 - t * 1.4);
    } else {
      racketAngle += swingDir * (0.4 - 1.4);
    }
  }

  drawRacket(ctx, pd.racketDx, armBaseY + pd.racketDy, racketAngle,
             racketColor, racketGrip, racketStrings, swingProgress, pose);

  // Serve toss ball
  if (pd.tossBall) {
    const tossX = -half - 4;
    const tossY = torsoY - 4 - swingProgress * 3;
    ctx.fillStyle = '#ccff00';
    ctx.fillRect(tossX, tossY, 2, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(tossX, tossY, 1, 1);
  }

  // ── Head ──────────────────────────────────────────────────────
  const headW = 5, headH = 5;
  const headX = -Math.floor(headW / 2);
  const headY = torsoY - headH - 1;

  px(ctx, headX,     headY,     headW,     headH, skin);
  px(ctx, headX+1,   headY,     headW-2,   1,     lighten(skin, 32));
  px(ctx, headX,     headY+3,   headW,     2,     darken(skin, 20));
  px(ctx, headX,     headY+1,   1,         3,     darken(skin, 25));

  // ── Hair (drawn first, accessory overlays on top) ─────────────
  if (accessory !== 'bandana') {
    drawHair(ctx, headX, headY, headW, hair, hairColor);
    drawHeadAccessory(ctx, headX, headY, headW, accessory, accessoryColor, shirtColor);
  } else {
    // Bandana replaces hair top entirely
    const ac = accessoryColor || '#ffffff';
    px(ctx, headX,     headY,     headW, 2, ac);
    px(ctx, headX-1,   headY,     headW+2, 1, darken(ac, 12));
    // Remaining hair visible at sides/back
    px(ctx, headX-1,   headY+1,   1, 2, hairColor);
    px(ctx, headX+headW, headY+1, 1, 2, hairColor);
    px(ctx, headX,     headY+2,   headW, 1, hairColor);
    // Knot at back
    px(ctx, headX-1,   headY+2,   2, 3, darken(ac, 22));
  }

  // ── Eyes (coloured iris + pupil + highlight) ──────────────────
  const eDx = pd.eyeDx || 0;
  const el   = { x: headX + 1 + eDx, y: headY + 2 };
  const er   = { x: headX + 3 + eDx, y: headY + 2 };

  // Iris
  ctx.fillStyle = eyeColor;
  ctx.fillRect(el.x, el.y, 1, 1);
  ctx.fillRect(er.x, er.y, 1, 1);
  // Pupil (dark)
  ctx.fillStyle = darken(eyeColor, 50);
  ctx.fillRect(el.x, el.y, 1, 1);
  ctx.fillRect(er.x, er.y, 1, 1);
  // Specular highlight (top-left corner pixel)
  ctx.fillStyle = 'rgba(255,255,255,0.70)';
  ctx.fillRect(el.x, el.y, 1, 1);
  // Re-draw pupil after highlight so it shows
  ctx.fillStyle = darken(eyeColor, 40);
  ctx.fillRect(el.x, el.y, 1, 1);
  ctx.fillRect(er.x, er.y, 1, 1);

  // ── Celebrate sparkles ────────────────────────────────────────
  if (pose === 'cel') {
    const t = Date.now() % 600 / 600;
    [[-8,-20],[8,-22],[-6,-14],[9,-15]].forEach(([sx, sy], i) => {
      const phase = (t + i * 0.25) % 1;
      if (phase < 0.5) {
        ctx.fillStyle = ['#FFD700','#00FF88','#FF6B35','#00D4FF'][i];
        ctx.fillRect(Math.round(sx), Math.round(sy - phase * 6), 2, 2);
      }
    });
  }

  ctx.restore();
}

// Compat
export function purgeSpriteCache() {}
