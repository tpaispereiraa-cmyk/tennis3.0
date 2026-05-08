import React, { useRef, useEffect, useState } from 'react';

const HALF_L = 11.885;
const HALF_W = 4.115;
const PAD = 28;

const OE = {
  bg:          '#0e1117',
  court:       '#2a3470',
  lines:       'rgba(255,255,255,0.55)',
  net:         'rgba(255,255,255,0.85)',
  cream:       '#f2ede6',
  gray4:       '#555',
  targetColor: '#f5d63d',
  bounceColor: '#3dff8f',
  lineColor:   'rgba(255,255,255,0.3)',
  fontDisplay: "'Teko','Barlow Condensed',sans-serif",
  fontBody:    "'Barlow Condensed','Teko',sans-serif",
};

function courtToCanvas(courtX, courtY, cw, ch) {
  const W = cw - PAD * 2, H = ch - PAD * 2;
  const ox = PAD, oy = PAD;
  const px = ox + (courtX + HALF_W) / (HALF_W * 2) * W;
  const py = oy + H / 2 - (courtY / HALF_L) * (H / 2);
  return { px, py };
}

function drawCourt(ctx, cw, ch) {
  const W = cw - PAD * 2, H = ch - PAD * 2;
  const ox = PAD, oy = PAD;
  const SERVICE_Y = 6.4;
  ctx.fillStyle = OE.court;
  ctx.fillRect(ox, oy, W, H);
  ctx.strokeStyle = OE.lines; ctx.lineWidth = 1;
  ctx.strokeRect(ox, oy, W, H);
  ctx.strokeStyle = OE.net; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(ox, oy + H / 2); ctx.lineTo(ox + W, oy + H / 2); ctx.stroke();
  ctx.lineWidth = 1; ctx.strokeStyle = OE.lines;
  const cx = ox + W / 2;
  const svcFrac = SERVICE_Y / HALF_L;
  const svcTopY = oy + H / 2 - (H / 2) * svcFrac;
  const svcBotY = oy + H / 2 + (H / 2) * svcFrac;
  ctx.beginPath(); ctx.moveTo(ox, svcTopY); ctx.lineTo(ox + W, svcTopY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ox, svcBotY); ctx.lineTo(ox + W, svcBotY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, oy + H / 2); ctx.lineTo(cx, svcTopY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, oy + H / 2); ctx.lineTo(cx, svcBotY); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.font = '9px Barlow Condensed, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('P1', cx, oy + H - 6);
  ctx.fillText('P2', cx, oy + 14);
}

function dist2(ax, ay, bx, by) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

export default function LandingMap({ bounceLog = [], p0, p1 }) {
  const canvasRef = useRef(null);
  const [playerFilter, setPlayerFilter] = useState('both');
  const [showTargets, setShowTargets] = useState(true);
  const [showBounces, setShowBounces] = useState(true);
  const [showLinks, setShowLinks] = useState(true);

  // Only include bounces that have target data
  const paired = bounceLog.filter(b =>
    b.targetX !== null && b.targetX !== undefined &&
    b.targetY !== null && b.targetY !== undefined
  );

  const filtered = paired.filter(b => {
    if (playerFilter === '0' && b.player !== 0) return false;
    if (playerFilter === '1' && b.player !== 1) return false;
    return true;
  });

  // Stats: average landing error
  const errors = filtered.map(b => dist2(b.targetX, b.targetY, b.x, b.y));
  const avgError = errors.length > 0
    ? (errors.reduce((a, b) => a + b, 0) / errors.length).toFixed(2)
    : '—';
  const maxError = errors.length > 0
    ? Math.max(...errors).toFixed(2)
    : '—';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cw = canvas.width, ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = OE.bg; ctx.fillRect(0, 0, cw, ch);
    drawCourt(ctx, cw, ch);

    for (const b of filtered) {
      const { px: bx, py: by } = courtToCanvas(b.x, b.y, cw, ch);
      const { px: tx, py: ty } = courtToCanvas(b.targetX, b.targetY, cw, ch);

      // Link line target → bounce
      if (showLinks) {
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = OE.lineColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(bx, by); ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }

      // Target dot (diamond)
      if (showTargets) {
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = OE.targetColor;
        ctx.beginPath();
        ctx.moveTo(tx, ty - 5);
        ctx.lineTo(tx + 4, ty);
        ctx.lineTo(tx, ty + 5);
        ctx.lineTo(tx - 4, ty);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Bounce dot (circle)
      if (showBounces) {
        ctx.globalAlpha = 0.82;
        ctx.fillStyle = OE.bounceColor;
        ctx.beginPath();
        ctx.arc(bx, by, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }, [filtered, showTargets, showBounces, showLinks]);

  const Btn = ({ active, onClick, color, children }) => (
    <button onClick={onClick} style={{
      padding: '5px 11px', cursor: 'pointer', borderRadius: 2, fontSize: 10,
      fontFamily: OE.fontBody, letterSpacing: 2, textTransform: 'uppercase',
      background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
      border: `1px solid ${active ? (color || 'rgba(255,255,255,0.4)') : 'rgba(255,255,255,0.10)'}`,
      color: active ? OE.cream : OE.gray4,
    }}>{children}</button>
  );

  return (
    <div style={{ padding: '24px 48px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontFamily: OE.fontBody, fontSize: 9, letterSpacing: 4, color: OE.gray4, textTransform: 'uppercase', marginBottom: 4 }}>
            Análise · Alvo vs Quique Real
          </div>
          <div style={{ fontFamily: OE.fontDisplay, fontSize: 28, fontWeight: 700, color: OE.cream, lineHeight: 1 }}>
            {filtered.length} pares registrados
          </div>
          <div style={{ fontFamily: OE.fontBody, fontSize: 10, letterSpacing: 2, color: OE.gray4, marginTop: 4 }}>
            Erro médio: {avgError}m · Erro máximo: {maxError}m
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[['both','Ambos',null],['0',p0?.name??'P1',null],['1',p1?.name??'P2',null]].map(([v,l,c])=>(
              <Btn key={v} active={playerFilter===v} onClick={()=>setPlayerFilter(v)} color={c}>{l}</Btn>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <Btn active={showTargets} onClick={()=>setShowTargets(v=>!v)} color={OE.targetColor}>◆ Alvo</Btn>
            <Btn active={showBounces} onClick={()=>setShowBounces(v=>!v)} color={OE.bounceColor}>● Quique</Btn>
            <Btn active={showLinks} onClick={()=>setShowLinks(v=>!v)}>--- Linha</Btn>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[
          ['◆ Alvo (intenção)', OE.targetColor],
          ['● Quique real', OE.bounceColor],
          ['--- Erro', OE.lineColor],
        ].map(([l, c]) => (
          <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 12, color: c }}>{l.split(' ')[0]}</span>
            <span style={{ fontFamily: OE.fontBody, fontSize: 10, letterSpacing: 2, color: OE.gray4 }}>{l.slice(2)}</span>
          </span>
        ))}
      </div>

      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        <canvas ref={canvasRef} width={480} height={680}
          style={{ display: 'block', border: '1px solid rgba(255,255,255,0.07)', maxWidth: '100%' }} />
        <div style={{ position: 'absolute', left: 4, top: '25%', fontFamily: OE.fontBody, fontSize: 9, letterSpacing: 2, color: OE.gray4, textTransform: 'uppercase', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{p1?.name ?? 'P2'}</div>
        <div style={{ position: 'absolute', left: 4, top: '65%', fontFamily: OE.fontBody, fontSize: 9, letterSpacing: 2, color: OE.gray4, textTransform: 'uppercase', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{p0?.name ?? 'P1'}</div>
      </div>
    </div>
  );
}


