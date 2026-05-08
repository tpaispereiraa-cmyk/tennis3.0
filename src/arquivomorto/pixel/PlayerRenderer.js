/**
 * PlayerRenderer.js — Style-aware player sprite wrapper
 *
 * Wraps sprites.js drawSprite() and drawTopSprite() with per-style
 * visual behaviors. The goal: each play style should LOOK different
 * even before watching the stats.
 *
 * Per-style visual identity:
 *  BIG_SERVER    → Tall stance, exaggerated serve windup, forward lean on serve
 *  SRV_VOL       → Net rush aura after serve, compact crisp volley pose
 *  AGG_BASELINER → Aggressive forward weight, wide FH arm extension
 *  CTR_PUNCHER   → Deep crouch, exaggerated knee bend, defensive topspin stance
 *  RETRIEVER     → Extended slide, wider shadow, desperate reach lean
 *  ALL_COURT     → Neutral — standard sprite but with subtle confidence glow
 *
 * Integration:
 *   isoRenderer.js  → replace drawSprite() call with drawStyledPlayer()
 *   tvRenderer.js   → same
 *   pixelRenderer.js → replace drawTopSprite() with drawStyledTopPlayer()
 */

import { drawSprite, drawTopSprite } from './sprites.js';
import { TIMING, GameState } from '../../core/constants.js';

// ── Style config lookup ────────────────────────────────────────────────────────
// Each entry defines overrides applied on top of the base sprite config.
// Numeric modifiers are additive/multiplicative as noted.
const STYLE_OVERRIDES = {

  BIG_SERVER: {
    // During serve: body rises extra (explosive extension)
    serveBodyLift: 2.5,        // px added to body during srv pose
    serveArmExtend: 1.3,       // arm length multiplier (racket reaches higher)
    // Net approach: no special behavior
    netRushAura: false,
    // Shadow: wide base (heavy footprint)
    shadowWidthMult: 1.25,
    // Swing: slightly slower follow-through, power emphasis
    contactScaleBoost: 0.06,   // body scale during contact
    // Visual: slight forward lean during contact
    fhLeanExtra: 0.04,
    // Aura color when at peak momentum
    momentumAura: '#FFD70055',
    momentumThreshold: 0.82,
  },

  SRV_VOL: {
    serveBodyLift: 1.0,
    serveArmExtend: 1.0,
    // NET RUSH: when advancing to net (atNet=true OR moving toward net),
    // draw a forward-lean overlay + green trailing aura
    netRushAura: true,
    netRushColor: '#00FF8840',
    netRushLean: 0.12,          // extra forward lean rad
    // Volley: crisp — compact body, racket forward
    volleyCompact: true,
    shadowWidthMult: 1.0,
    contactScaleBoost: 0.03,
    fhLeanExtra: 0.02,
    momentumAura: '#00FF8844',
    momentumThreshold: 0.75,
  },

  AGG_BASELINER: {
    serveBodyLift: 1.5,
    serveArmExtend: 1.1,
    netRushAura: false,
    // FH: exaggerated arm drive (contact window is wider, body leans hard)
    fhLeanExtra: 0.07,
    contactScaleBoost: 0.08,
    shadowWidthMult: 1.1,
    momentumAura: '#FF4B3588',
    momentumThreshold: 0.78,
  },

  CTR_PUNCHER: {
    serveBodyLift: 0.5,
    serveArmExtend: 1.0,
    netRushAura: false,
    // Deep crouch stance: body drops during preparation phase
    crouchDepth: 3.0,           // extra px body drops during prep
    crouchKneeBend: 0.25,       // extra knee bend added to legs
    // Topspin emphasis: long follow-through arc
    spinFollowMult: 1.3,
    shadowWidthMult: 0.95,
    contactScaleBoost: 0.04,
    fhLeanExtra: 0.05,
    momentumAura: '#00D4FF44',
    momentumThreshold: 0.80,
  },

  RETRIEVER: {
    serveBodyLift: 0.5,
    serveArmExtend: 0.9,
    netRushAura: false,
    // Slide: very long, body almost horizontal, wide arm balance
    slideExtend: 2.0,           // px extended slide width
    slideDuration: 1.5,         // visual slide "drags" longer
    // Desperation: when arriving late (low quality), extreme lean
    desperateLean: 0.10,
    shadowWidthMult: 1.3,       // big foot presence
    contactScaleBoost: 0.02,
    fhLeanExtra: 0.03,
    momentumAura: '#88CCFF44',
    momentumThreshold: 0.85,    // retriever momentum is hard to earn
  },

  ALL_COURT: {
    serveBodyLift: 1.2,
    serveArmExtend: 1.05,
    netRushAura: false,
    // All-court: no extremes, but subtle "in control" glow
    controlGlow: true,
    controlGlowColor: '#7ab4ff28',
    shadowWidthMult: 1.0,
    contactScaleBoost: 0.04,
    fhLeanExtra: 0.03,
    momentumAura: '#7ab4ff55',
    momentumThreshold: 0.77,
  },

  // GRINDER não existe como estilo — era alias de CTR_PUNCHER. Removido.
};

function getOverrides(styleId) {
  return STYLE_OVERRIDES[styleId] || STYLE_OVERRIDES.ALL_COURT;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Draw a translucent aura circle under/around a player (ISO/TV)
function drawAura(ctx, x, y, color, radius = 14) {
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y + 2, radius, radius * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Draw net rush forward lean indicator — a small arrow-like swoosh
function drawNetRushAura(ctx, x, y, side, color) {
  ctx.save();
  ctx.globalAlpha = 0.55;
  const dir   = side > 0 ? -1 : 1;   // side 1 = bottom half, rushes toward y=0
  const sweep = dir * 10;

  // Swoosh: 3 translucent arcs behind the player
  for (let i = 1; i <= 3; i++) {
    const a = 0.22 / i;
    ctx.strokeStyle = color.replace('40', Math.floor(a * 255).toString(16).padStart(2, '0'));
    ctx.lineWidth = i;
    ctx.beginPath();
    ctx.moveTo(x - 5, y + sweep * (i / 3));
    ctx.quadraticCurveTo(x, y + sweep * (i / 3) * 0.5, x + 5, y + sweep * (i / 3));
    ctx.stroke();
  }
  ctx.restore();
}

// ── ISO / TV styled player draw ───────────────────────────────────────────────
/**
 * Replacement for the direct drawSprite() call in isoRenderer / tvRenderer.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number}  x           ISO-projected screen X
 * @param {number}  y           ISO-projected screen Y
 * @param {object}  appearance  from getAppearance()
 * @param {string}  pose        'idle'|'run'|'fh'|'bh'|'srv'|'vol'|'slide'|'cel'
 * @param {number}  swingProgress 0..1
 * @param {number}  speed       movement speed (m/s)
 * @param {number}  scale       draw scale (depth-based in TV cam)
 * @param {object}  player      full player object from gs
 * @param {object}  gs          game state (for courtMeta, etc.)
 */
export function drawStyledPlayer(ctx, x, y, appearance, pose, swingProgress, speed, scale, player, gs) {
  const styleId  = player?.styleId ?? 'ALL_COURT';
  const ov       = getOverrides(styleId);
  const mom      = player?.ctx?.momentum ?? 0.5;
  const quality  = player?._lastQuality ?? 1.0;
  const surface  = gs?.courtMeta?.surface ?? 'HARD';
  const side     = player?.side ?? 1;
  const atNet    = player?.atNet ?? false;

  // ── Net rush aura (SRV_VOL approaching net) ──────────────────
  if (ov.netRushAura && atNet) {
    drawNetRushAura(ctx, x, y, side, ov.netRushColor);
  }

  // ── Control glow (ALL_COURT subtle) ──────────────────────────
  if (ov.controlGlow && mom > 0.6) {
    drawAura(ctx, x, y, ov.controlGlowColor, 16);
  }

  // ── Momentum aura ─────────────────────────────────────────────
  if (mom >= ov.momentumThreshold) {
    const intensity = (mom - ov.momentumThreshold) / (1 - ov.momentumThreshold);
    const aura = ov.momentumAura.replace(/[\da-f]{2}\)$/, (hex) =>
      Math.floor(intensity * parseInt(hex, 16)).toString(16).padStart(2, '0') + ')'
    );
    drawAura(ctx, x, y, aura, 18 + intensity * 4);
  }

  // ── Shadow width (style-specific footprint) ───────────────────
  // We'll pre-draw a wider shadow before drawSprite renders its own
  if (ov.shadowWidthMult !== 1.0 && ov.shadowWidthMult > 1.0) {
    const sw = (7 + speed * 0.18) * ov.shadowWidthMult;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(x + 1, y + 3, Math.min(sw, 18), 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Build modified sprite config ──────────────────────────────
  let modifiedConfig = { ...appearance, pose, swingProgress, speed };

  // Desperate lean for retriever (low quality = desperate reach)
  if (styleId === 'RETRIEVER' && quality < 0.35 && (pose === 'fh' || pose === 'bh')) {
    modifiedConfig.forceLean = ov.desperateLean;
  }

  // SRV_VOL net approach: tint shirt slightly green
  if (styleId === 'SRV_VOL' && atNet) {
    const baseR = parseInt(appearance.shirtColor?.slice(1, 3) ?? 'ff', 16);
    const baseG = parseInt(appearance.shirtColor?.slice(3, 5) ?? 'ff', 16);
    const baseB = parseInt(appearance.shirtColor?.slice(5, 7) ?? 'ff', 16);
    const tintR = Math.max(0, baseR - 15);
    const tintG = Math.min(255, baseG + 30);
    modifiedConfig.shirtColor = `rgb(${tintR},${tintG},${baseB})`;
  }

  // Clay surface slide enhancement (RETRIEVER + CTR_PUNCHER get extra slide)
  let effectivePose = pose;
  if (surface === 'CLAY' && pose === 'slide' &&
      (styleId === 'RETRIEVER' || styleId === 'CTR_PUNCHER')) {
    // Slide pose stays but we'll draw extra clay spray (handled by MatchParticles)
    effectivePose = 'slide';
  }

  modifiedConfig.pose = effectivePose;

  // ── Draw base sprite ──────────────────────────────────────────
  drawSprite(ctx, x, y, modifiedConfig, scale);

  // ── Post-draw: net rush forward arrow (SRV_VOL only) ─────────
  if (ov.netRushAura && atNet && scale > 0.8) {
    ctx.save();
    const arrowDir = side > 0 ? -1 : 1;
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#00FF88';
    ctx.beginPath();
    ctx.moveTo(x, y + arrowDir * 28 * scale);
    ctx.lineTo(x - 4 * scale, y + arrowDir * 20 * scale);
    ctx.lineTo(x + 4 * scale, y + arrowDir * 20 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ── CTR_PUNCHER extra crouch indicator ──────────────
  if ((styleId === 'CTR_PUNCHER') &&
      (pose === 'fh' || pose === 'bh') && swingProgress < 0.32) {
    const crouchDepth = (ov.crouchDepth ?? 2) * scale;
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = appearance.accentColor || '#00D4FF';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    // Small bounce-ready line under feet
    ctx.beginPath();
    ctx.moveTo(x - 6 * scale, y + 3);
    ctx.lineTo(x + 6 * scale, y + 3);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}

// ── TOP-DOWN styled player draw ───────────────────────────────────────────────
/**
 * Replacement for drawTopSprite() in pixelRenderer.js.
 * Adds per-style ring effects, aura, and net-rush indicator.
 *
 * @param {CanvasRenderingContext2D} ctx  (translated to court centre)
 * @param {number}  px   court-space X→screen (player.pos.y * SCALE)
 * @param {number}  py   court-space Y→screen (player.pos.x * SCALE)
 * @param {object}  appearance
 * @param {number}  angle   facing angle
 * @param {boolean} swinging
 * @param {number}  swingProgress
 * @param {object}  player  full player object
 * @param {object}  ball    ball state
 * @param {object}  gs      game state
 */
export function drawStyledTopPlayer(ctx, px, py, appearance, angle, swinging, swingProgress, player, ball, gs) {
  const styleId = player?.styleId ?? 'ALL_COURT';
  const ov      = getOverrides(styleId);
  const mom     = player?.ctx?.momentum ?? 0.5;
  const atNet   = player?.atNet ?? false;
  const side    = player?.side ?? 1;
  const speed   = Math.sqrt((player?.vel?.x || 0) ** 2 + (player?.vel?.y || 0) ** 2);

  // ── NET RUSH aura (top-down: swoosh behind player toward net) ──
  if (ov.netRushAura && atNet) {
    const rushDir = side > 0 ? -1 : 1;   // toward net (y=0)
    ctx.save();
    for (let i = 1; i <= 3; i++) {
      ctx.fillStyle = `rgba(0,255,136,${0.12 / i})`;
      ctx.beginPath();
      ctx.ellipse(px, py + rushDir * 12 * i, 8 - i, 4 - i * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Momentum aura ─────────────────────────────────────────────
  if (mom >= ov.momentumThreshold) {
    const intensity = (mom - ov.momentumThreshold) / (1 - ov.momentumThreshold);
    const color = ov.momentumAura;
    ctx.save();
    ctx.globalAlpha = intensity * 0.6;
    ctx.strokeStyle = color.slice(0, 7);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ── Shadow width style modifier ───────────────────────────────
  if (ov.shadowWidthMult > 1.1) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.ellipse(px + 1, py + 2, 10 * ov.shadowWidthMult, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── SRV_VOL: tint appearance if at net ─────────────────────────
  let modAppearance = { ...appearance, speed };
  if (styleId === 'SRV_VOL' && atNet) {
    const baseR = parseInt(appearance.shirtColor?.slice(1,3) ?? 'ff', 16);
    const baseG = parseInt(appearance.shirtColor?.slice(3,5) ?? 'ff', 16);
    const baseB = parseInt(appearance.shirtColor?.slice(5,7) ?? 'ff', 16);
    modAppearance.shirtColor = `rgb(${Math.max(0,baseR-15)},${Math.min(255,baseG+30)},${baseB})`;
  }

  // ── Draw base top sprite ──────────────────────────────────────
  drawTopSprite(ctx, px, py, modAppearance, angle, swinging, swingProgress);

  // ── Style indicator micro-badges ──────────────────────────────
  // Very small colored pixel above the head badge indicating style
  const accentColor = appearance.accentColor || '#ffffff';
  if (styleId === 'SRV_VOL' && !atNet) {
    // Small forward arrow indicating net intent
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#00FF88';
    const arrowDir = side > 0 ? -1 : 1;
    ctx.fillRect(Math.round(px) - 1, Math.round(py) + arrowDir * 8, 2, 3);
    ctx.restore();
  }

  if (styleId === 'CTR_PUNCHER') {
    // Low crouched arc (small bent line at feet)
    ctx.save();
    ctx.globalAlpha = 0.30;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px, py + 4, 6, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.restore();
  }

  if (styleId === 'RETRIEVER') {
    // Wide outstretched arc (reaching)
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px, py, 12, -0.4, Math.PI + 0.4);
    ctx.stroke();
    ctx.restore();
  }
}

// ── Pose selection helper ─────────────────────────────────────────────────────
// Used by both isoRenderer and tvRenderer to resolve the correct pose.
/**
 * @param {object} player  full player
 * @param {object} ball    ball state
 * @param {object} gs      game state (for GameState)
 * @returns {string}  pose key
 */
export function resolvePlayerPose(player, ball, gs) {
  const isCelebrating = (gs.gameState === GameState.POINT_END || gs.gameState === GameState.GAME_OVER)
                        && gs.pointWinnerIdx === player.id;

  if (isCelebrating) return 'cel';

  const lateralSpd   = Math.abs(player.vel?.x || 0);
  const distToBall   = Math.sqrt((player.pos.x - ball.pos.x) ** 2 + (player.pos.y - ball.pos.y) ** 2);
  const isSliding    = !player.swinging && lateralSpd > 3.8 && distToBall < 3.0 && !player.atNet;

  if (player.swinging) {
    const ballRelY = ball.pos.y - player.pos.y;
    return (ballRelY * player.side) > 0 ? 'fh' : 'bh';
  }
  if (player.atNet)  return 'vol';
  if (isSliding)     return 'slide';

  const spd = Math.sqrt((player.vel?.x || 0) ** 2 + (player.vel?.y || 0) ** 2);
  return spd > 1.5 ? 'run' : 'idle';
}

// ── Serve & Volley — net advance progress ─────────────────────────────────────
/**
 * Returns a 0..1 value showing how far into a net rush the player is.
 * Used to gradually intensify the net rush aura.
 */
export function getNetRushProgress(player) {
  if (!player?.atNet) return 0;
  // Compute based on court position relative to net (y=0)
  const distToNet = Math.abs(player.pos.y);
  const netZone   = 3.0; // metres inside net zone
  return Math.max(0, Math.min(1, 1 - distToNet / netZone));
}

