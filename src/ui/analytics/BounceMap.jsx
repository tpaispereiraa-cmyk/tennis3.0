import React, { useRef, useEffect, useState } from 'react';

// Court dimensions (same as COURT constants)
const HALF_L = 11.885;   // half court length (m) — net to baseline
const HALF_W = 4.115;    // half singles width (m)
const SERVICE_Y = 6.4;   // service line from net (m)

// Visual config
const PAD = 28;       // canvas padding (px)
const DOT_R = 4;      // dot radius
const DOT_R_OUT = 4;

const OE = {
  bg:      '#0e1117',
  court:   '#2a3470',
  lines:   'rgba(255,255,255,0.55)',
  net:     'rgba(255,255,255,0.85)',
  rally:   '#f5d63d',
  winner:  '#3dff8f',
  out:     '#ff4040',
  gray4:   '#555',
  cream:   '#f2ede6',
  fontDisplay: "'Teko','Barlow Condensed',sans-serif",
  fontBody:    "'Barlow Condensed','Teko',sans-serif",
};

function drawCourt(ctx, cw, ch) {
  // court area (excluding padding)
  const W = cw - PAD * 2;
  const H = ch - PAD * 2;
  const ox = PAD, oy = PAD;

  // Full court bg
  ctx.fillStyle = OE.court;
  ctx.fillRect(ox, oy, W, H);

  ctx.strokeStyle = OE.lines;
  ctx.lineWidth = 1;

  // Court rect (singles — full width is W, full length is H)
  ctx.strokeRect(ox, oy, W, H);

  // Net (center horizontal line)
  ctx.strokeStyle = OE.net;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ox, oy + H / 2);
  ctx.lineTo(ox + W, oy + H / 2);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.strokeStyle = OE.lines;

  // Center service line (vertical, center of width)
  const cx = ox + W / 2;
  // Service lines — 6.4m from net on both halves
  const svcFrac = SERVICE_Y / HALF_L;   // fraction of half-court
  const svcTopY    = oy + H / 2 - (H / 2) * svcFrac;
  const svcBotY    = oy + H / 2 + (H / 2) * svcFrac;

  // top service line
  ctx.beginPath(); ctx.moveTo(ox, svcTopY); ctx.lineTo(ox + W, svcTopY); ctx.stroke();
  // bot service line
  ctx.beginPath(); ctx.moveTo(ox, svcBotY); ctx.lineTo(ox + W, svcBotY); ctx.stroke();
  // center service line top half
  ctx.beginPath(); ctx.moveTo(cx, oy + H / 2); ctx.lineTo(cx, svcTopY); ctx.stroke();
  // center service line bot half
  ctx.beginPath(); ctx.moveTo(cx, oy + H / 2); ctx.lineTo(cx, svcBotY); ctx.stroke();

  // Baseline labels
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.font = '9px Barlow Condensed, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('P1', cx, oy + H - 6);
  ctx.fillText('P2', cx, oy + 14);
}

function courtToCanvas(courtX, courtY, cw, ch) {
  // courtY: +HALF_L = P1 baseline, -HALF_L = P2 baseline, 0 = net
  // canvas: oy=PAD (P2 baseline), oy+H/2 = net, oy+H = P1 baseline
  const W = cw - PAD * 2;
  const H = ch - PAD * 2;
  const ox = PAD, oy = PAD;

  // X: -HALF_W → left, +HALF_W → right
  const px = ox + (courtX + HALF_W) / (HALF_W * 2) * W;
  // Y: courtY positive = P1 side (bottom), negative = P2 (top)
  const py = oy + H / 2 - (courtY / HALF_L) * (H / 2);

  return { px, py };
}

function drawDots(ctx, bounces, filter, color, radius, alpha = 0.82) {
  const cw = ctx.canvas.width, ch = ctx.canvas.height;
  ctx.globalAlpha = alpha;
  for (const b of bounces) {
    if (b.type !== filter) continue;
    const { px, py } = courtToCanvas(b.x, b.y, cw, ch);
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    // thin black outline
    ctx.globalAlpha = alpha * 0.5;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.globalAlpha = alpha;
  }
  ctx.globalAlpha = 1;
}

export default function BounceMap({ bounceLog = [], p0, p1 }) {
  const canvasRef = useRef(null);
  const [filter, setFilter] = useState('all');   // 'all' | 'rally' | 'winner' | 'out'
  const [hoveredDot, setHoveredDot] = useState(null);

  // Stats
  const counts = { rally: 0, winner: 0, out: 0 };
  for (const b of bounceLog) counts[b.type] = (counts[b.type] || 0) + 1;
  const total = bounceLog.length;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cw = canvas.width, ch = canvas.height;

    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = OE.bg;
    ctx.fillRect(0, 0, cw, ch);

    drawCourt(ctx, cw, ch);

    const show = (t) => filter === 'all' || filter === t;

    // Draw in order: rally (back), winner, out (front)
    if (show('rally'))  drawDots(ctx, bounceLog, 'rally',  OE.rally,  DOT_R,     0.72);
    if (show('winner')) drawDots(ctx, bounceLog, 'winner', OE.winner, DOT_R + 1, 0.90);
    if (show('out'))    drawDots(ctx, bounceLog, 'out',    OE.out,    DOT_R_OUT, 0.88);

  }, [bounceLog, filter]);

  const BTN = ({ id, color, label, count }) => (
    <button onClick={() => setFilter(f => f === id ? 'all' : id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 14px',
        background: filter === id ? 'rgba(255,255,255,0.08)' : 'transparent',
        border: `1px solid ${filter === id ? color : 'rgba(255,255,255,0.10)'}`,
        cursor: 'pointer', borderRadius: 2,
        transition: 'all 0.15s',
      }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: filter === id ? `0 0 6px ${color}` : 'none' }}/>
      <span style={{ fontFamily: OE.fontBody, fontSize: 11, letterSpacing: 2, color: filter === id ? OE.cream : OE.gray4, textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontFamily: OE.fontDisplay, fontSize: 16, fontWeight: 600, color: filter === id ? color : OE.gray4, lineHeight: 1 }}>
        {count}
      </span>
    </button>
  );

  return (
    <div style={{
      padding: '24px 48px 32px',
      display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: OE.fontBody, fontSize: 9, letterSpacing: 4, color: OE.gray4, textTransform: 'uppercase', marginBottom: 4 }}>
            Análise · Mapa de Quiques
          </div>
          <div style={{ fontFamily: OE.fontDisplay, fontSize: 28, fontWeight: 700, color: OE.cream, lineHeight: 1 }}>
            {total} quiques registrados
          </div>
        </div>
        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 6 }}>
          <BTN id="rally"  color={OE.rally}  label="Rally"   count={counts.rally  || 0} />
          <BTN id="winner" color={OE.winner} label="Winner"  count={counts.winner || 0} />
          <BTN id="out"    color={OE.out}    label="Fora"    count={counts.out    || 0} />
        </div>
      </div>

      {/* Court canvas */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        <canvas
          ref={canvasRef}
          width={480}
          height={680}
          style={{
            display: 'block',
            border: '1px solid rgba(255,255,255,0.07)',
            maxWidth: '100%',
          }}
        />
        {/* Side labels */}
        <div style={{ position: 'absolute', left: 4, top: '25%', fontFamily: OE.fontBody, fontSize: 9, letterSpacing: 2, color: OE.gray4, textTransform: 'uppercase', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          {p1?.name || 'P2'}
        </div>
        <div style={{ position: 'absolute', left: 4, top: '65%', fontFamily: OE.fontBody, fontSize: 9, letterSpacing: 2, color: OE.gray4, textTransform: 'uppercase', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          {p0?.name || 'P1'}
        </div>
      </div>

      {/* Density note */}
      {total < 10 && (
        <div style={{ fontFamily: OE.fontBody, fontSize: 10, letterSpacing: 2, color: OE.gray4, textTransform: 'uppercase', textAlign: 'center' }}>
          Partida muito curta — poucos quiques registrados
        </div>
      )}
    </div>
  );
}

