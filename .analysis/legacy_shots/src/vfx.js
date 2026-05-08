import { CL, CW, SCALE } from './constants.js';
import { clamp }          from './math.js';

// ── Shot type → display config ────────────────────────────────────
export const SHOT_LABELS = {
  FLAT:        { label: 'FLAT',        emoji: '⚡', color: '#FFD700' },
  TOPSPIN:     { label: 'TOPSPIN',     emoji: '🌀', color: '#00FF88' },
  SLICE:       { label: 'SLICE',       emoji: '🔪', color: '#00D4FF' },
  VOLLEY:      { label: 'VOLEIO',      emoji: '🥊', color: '#FF6B35' },
  DROP:        { label: 'DROP SHOT',   emoji: '💧', color: '#A78BFA' },
  SMASH:       { label: 'SMASH',       emoji: '💥', color: '#FF4444' },
  LOB_DEF:     { label: 'LOB',         emoji: '☁️', color: '#7ab4ff' },
  LOB_ATK:     { label: 'LOB ATK',     emoji: '🚀', color: '#FF8844' },
  BANANA:      { label: 'BANANA',      emoji: '🍌', color: '#FFD700' },
  PASSING:     { label: 'PASSING',     emoji: '🎯', color: '#00FF88' },
  HALF_VOLLEY:  { label: 'HALF VOLLEY',  emoji: '⚽', color: '#FF9933' },
  SHORT_ANGLE:  { label: 'SHORT ANGLE',  emoji: '📐', color: '#FF2266' },
  SLICE_SHORT:  { label: 'SLICE SHORT',  emoji: '🗡️', color: '#FFCC44' },
  MISHIT:       { label: 'FRAME SHOT',   emoji: '💢', color: '#FF2244' },
  // Serve types
  'FLAT-T':     { label: 'SAQUE FLAT-T',   emoji: '⚡', color: '#FFD700' },
  'FLAT-WIDE':  { label: 'SAQUE WIDE',     emoji: '⚡', color: '#FFD700' },
  'FLAT-BODY':  { label: 'SAQUE BODY',     emoji: '⚡', color: '#FF6B35' },
  'SLICE-WIDE': { label: 'SAQUE SLICE',    emoji: '🔪', color: '#00D4FF' },
  'SLICE-T':    { label: 'SAQUE SLICE-T',  emoji: '🔪', color: '#00D4FF' },
  'KICK-BODY':  { label: 'SAQUE KICK',     emoji: '🦵', color: '#00FF88' },
  'KICK-T':     { label: 'SAQUE KICK-T',   emoji: '🦵', color: '#00FF88' },
};

export const VFX_TYPES = {
  ACE:          { color: '#FFD700', emoji: '⚡', fs: 18, dur: 2400 },
  WINNER:       { color: '#00FF88', emoji: '✓',  fs: 16, dur: 2000 },
  DOUBLE_FAULT: { color: '#FF4444', emoji: '✗',  fs: 15, dur: 2000 },
  NET:          { color: '#FF6B35', emoji: '🔵', fs: 13, dur: 1600 },
  OUT:          { color: '#FF8844', emoji: '📍', fs: 13, dur: 1600 },
  GAME:         { color: '#00D4FF', emoji: '🎮', fs: 22, dur: 3000 },
  SET:          { color: '#FFD700', emoji: '🏆', fs: 28, dur: 4200 },
  // Shot label: floating text near player with quality-based color
  SHOT:         { color: '#ffffff', emoji: '',   fs: 18, dur: 1400 },
};

/**
 * Push a VFX for a regular point-result event (ACE, WINNER, etc.)
 * Position follows the ball; GAME/SET are centered.
 */
// Tipos que migram para HTML overlay (React) em vez de canvas
const OUTCOME_HTML_TYPES = new Set(['ACE', 'WINNER', 'OUT', 'NET', 'DOUBLE_FAULT']);

export function pushVFX(gs, type, label) {
  const ball     = gs.ball;
  const isCenter = type === 'GAME' || type === 'SET';
  const x = isCenter ? 0 : clamp(ball.pos.y * 26, -CL / 2 + 30, CL / 2 - 30);
  const y = isCenter ? 0 : clamp(ball.pos.x * 26, -CW / 2 + 20, CW / 2 - 20);
  // rawCY / rawCX: court metres — used by DefinitiveME renderer
  const rawCY = isCenter ? 0 : ball.pos.y;
  const rawCX = isCenter ? 0 : ball.pos.x;
  gs.vfxQueue.push({ type, label, born: performance.now(), x, y, rawCY, rawCX });

  // Para ACE/WINNER/OUT/NET/DOUBLE_FAULT: enfileirar também para o overlay HTML
  if (OUTCOME_HTML_TYPES.has(type)) {
    if (!gs.pendingOutcomeLabels) gs.pendingOutcomeLabels = [];
    gs.pendingOutcomeLabels.push({ type, label, rawCY, rawCX, born: performance.now() });
  }
}

/**
 * Push a SHOT VFX positioned at the player who just hit.
 * Also sets gs.pendingHitLabel for the React overlay precision pill.
 */
export function pushShotVFX(gs, player, shotType, quality, mishit = false, isSignature = false, signatureLabel = null, signatureEmoji = null) {
  // Canvas coords (offset from center)
  const x = clamp(player.pos.y * SCALE, -CL / 2 + 40, CL / 2 - 40);
  const y = clamp(player.pos.x * SCALE, -CW / 2 + 20, CW / 2 - 20);
  const cfg = SHOT_LABELS[shotType] || { label: shotType, emoji: '🎾', color: '#ffffff' };
  // React overlay data — queued so rapid shots don't overwrite each other
  // (Canvas SHOT VFX removido — HTML pill é suficiente e mais limpa)
  if (!gs.pendingHitLabels) gs.pendingHitLabels = [];
  // Mishit override: usa label e cor especial, mas preserva shotType para lógica
  const mishitCfg = mishit ? (SHOT_LABELS['MISHIT'] || { label: 'FRAME SHOT', emoji: '💢', color: '#FF2244' }) : null;
  gs.pendingHitLabels.push({
    playerId:    player.id,
    playerSide:  player.side,
    shotType,
    quality,
    color:       mishitCfg ? mishitCfg.color  : cfg.color,
    label:       mishitCfg ? mishitCfg.label  : (isSignature && signatureLabel ? signatureLabel : cfg.label),
    emoji:       mishitCfg ? mishitCfg.emoji  : (isSignature && signatureEmoji ? signatureEmoji : cfg.emoji),
    mishit:      !!mishit,
    isSignature: !!isSignature,
    isBackhand:  player._isBackhand ?? null,   // null = desconhecido (saque, etc.)
  });
}

/**
 * Draw all active VFX; prunes expired events.
 * Must be called inside ctx.save() / translate(cx,cy) block.
 */
export function renderVFX(ctx, vfxQueue) {
  const now = performance.now();
  for (let i = vfxQueue.length - 1; i >= 0; i--) {
    const ev  = vfxQueue[i];
    const cfg = VFX_TYPES[ev.type];
    if (!cfg) { vfxQueue.splice(i, 1); continue; }
    const age = now - ev.born;
    if (age > cfg.dur) { vfxQueue.splice(i, 1); continue; }

    if (ev.type === 'SHOT') {
      renderShotVFX(ctx, ev, age, cfg.dur);
    } else {
      renderStandardVFX(ctx, ev, age, cfg);
    }
  }
}

// ── SHOT VFX: pill colorida por qualidade, flutua acima do jogador ──────────
function renderShotVFX(ctx, ev, age, dur) {
  const t     = age / dur;
  const alpha = clamp(t < 0.08 ? t / 0.08 : t < 0.45 ? 1 : 1 - (t - 0.45) / 0.55, 0, 1);
  if (alpha < 0.02) return;
  const yOff  = -t * 28;

  // Quality-based color
  const q = ev.quality ?? 1.0;
  const color = q >= 0.75 ? '#00e676'
              : q >= 0.55 ? '#FFD700'
              : q >= 0.35 ? '#FF8844'
              :             '#FF4444';

  const label = ev.label || '';
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(ev.x, ev.y + yOff);

  // Pill background
  ctx.font = `900 16px 'Courier New',monospace`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const tw = ctx.measureText(label).width;
  const pw = tw + 16, ph = 20, pr = 4;
  ctx.fillStyle = 'rgba(5,5,5,0.82)';
  ctx.beginPath(); ctx.roundRect(-pw/2, -ph/2, pw, ph, pr); ctx.fill();
  // Left accent bar
  ctx.fillStyle = color;
  ctx.fillRect(-pw/2, -ph/2, 3, ph);
  // Text
  ctx.shadowColor = color; ctx.shadowBlur = 14;
  ctx.fillStyle = color;
  ctx.fillText(label, 2, 0);
  ctx.restore();
}

// Tipos migrados para HTML overlay — não renderizar no canvas
const _CANVAS_SKIP = new Set(['ACE', 'WINNER', 'OUT', 'NET', 'DOUBLE_FAULT']);

// ── Standard VFX (ACE, WINNER, GAME, SET, etc.) ──────────────────
function renderStandardVFX(ctx, ev, age, cfg) {
  if (_CANVAS_SKIP.has(ev.type)) return; // handled by React HTML overlay
  const t       = age / cfg.dur;
  const alpha   = clamp(t < 0.12 ? t / 0.12 : t < 0.68 ? 1 : 1 - (t - 0.68) / 0.32, 0, 1);
  const sc      = 1 + t * (ev.type === 'SET' ? 0.18 : 0.22);
  const yOff    = -t * (ev.type === 'GAME' || ev.type === 'SET' ? 18 : 42);
  const isLarge = ev.type === 'GAME' || ev.type === 'SET';

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(ev.x, ev.y + yOff);
  ctx.scale(sc, sc);

  if (isLarge) {
    ctx.shadowColor = cfg.color; ctx.shadowBlur = 50;
    ctx.fillStyle   = cfg.color + '18';
    ctx.fillRect(-95, -cfg.fs * 0.75, 190, cfg.fs * 1.5);
    ctx.shadowBlur  = 0;
  }
  ctx.shadowColor  = cfg.color;
  ctx.shadowBlur   = isLarge ? 28 : 16;
  ctx.fillStyle    = cfg.color;
  ctx.font         = `900 ${cfg.fs}px 'Courier New',monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${cfg.emoji} ${ev.label}`, 0, 0);
  ctx.restore();
}

// ── Helpers ───────────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
