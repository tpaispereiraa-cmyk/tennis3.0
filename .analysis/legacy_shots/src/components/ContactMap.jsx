import React, { useRef, useEffect, useState } from 'react';

const HALF_L = 11.885;
const HALF_W = 4.115;
const PAD = 28;

const OE = {
  bg:          '#0e1117',
  court:       '#1a2340',
  lines:       'rgba(255,255,255,0.55)',
  net:         'rgba(255,255,255,0.85)',
  cream:       '#f2ede6',
  gray4:       '#555',
  p0Color:     '#f5d63d',
  p1Color:     '#3daaff',
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

function drawHalfCourt(ctx, cw, ch, side) {
  // side: 'top' = P2 (y<0), 'bottom' = P0 (y>0)
  const W = cw - PAD * 2, H = ch - PAD * 2;
  const ox = PAD, oy = PAD;
  const SERVICE_Y = 6.4;
  ctx.fillStyle = OE.court;
  if (side === 'bottom') ctx.fillRect(ox, oy + H / 2, W, H / 2);
  else ctx.fillRect(ox, oy, W, H / 2);
  ctx.strokeStyle = OE.lines; ctx.lineWidth = 1;
  if (side === 'bottom') ctx.strokeRect(ox, oy + H / 2, W, H / 2);
  else ctx.strokeRect(ox, oy, W, H / 2);
  ctx.strokeStyle = OE.net; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(ox, oy + H / 2); ctx.lineTo(ox + W, oy + H / 2); ctx.stroke();
  ctx.lineWidth = 1; ctx.strokeStyle = OE.lines;
  const cx = ox + W / 2;
  const svcFrac = SERVICE_Y / HALF_L;
  if (side === 'bottom') {
    const svcBotY = oy + H / 2 + (H / 2) * svcFrac;
    ctx.beginPath(); ctx.moveTo(ox, svcBotY); ctx.lineTo(ox + W, svcBotY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, oy + H / 2); ctx.lineTo(cx, svcBotY); ctx.stroke();
  } else {
    const svcTopY = oy + H / 2 - (H / 2) * svcFrac;
    ctx.beginPath(); ctx.moveTo(ox, svcTopY); ctx.lineTo(ox + W, svcTopY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, oy + H / 2); ctx.lineTo(cx, svcTopY); ctx.stroke();
  }
}

function drawCourt(ctx, cw, ch) {
  const W = cw - PAD * 2, H = ch - PAD * 2;
  const ox = PAD, oy = PAD;
  const SERVICE_Y = 6.4;
  ctx.fillStyle = OE.court; ctx.fillRect(ox, oy, W, H);
  ctx.strokeStyle = OE.lines; ctx.lineWidth = 1; ctx.strokeRect(ox, oy, W, H);
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
  ctx.font = '9px Barlow Condensed, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('P1', cx, oy + H - 6); ctx.fillText('P2', cx, oy + 14);
}

// Simple density heatmap using canvas radial gradients
function drawHeatmap(ctx, points, color, cw, ch) {
  if (points.length === 0) return;
  const offscreen = document.createElement('canvas');
  offscreen.width = cw; offscreen.height = ch;
  const octx = offscreen.getContext('2d');
  const r = 18;
  for (const { px, py } of points) {
    const grad = octx.createRadialGradient(px, py, 0, px, py, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.12)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    octx.fillStyle = grad;
    octx.beginPath(); octx.arc(px, py, r, 0, Math.PI * 2); octx.fill();
  }
  // tint with player color
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 0.9;
  // draw the density layer
  ctx.drawImage(offscreen, 0, 0);
  ctx.restore();
}

const SHOT_TYPES = ['TOPSPIN','FLAT','SLICE','SMASH','VOLLEY','DROP','PASSING','LOB_ATK','LOB_DEF','BANANA','SLICE_SHORT','SHORT_ANGLE'];

export default function ContactMap({ debugEvents = [], p0, p1 }) {
  const canvasRef = useRef(null);
  const [playerFilter, setPlayerFilter] = useState('both');
  const [mode, setMode] = useState('scatter');  // 'scatter' | 'heatmap'

  const shots = debugEvents.filter(e => e.type === 'SHOT_EVENT' && e.fromX !== undefined);

  const filtered = shots.filter(e => {
    if (playerFilter === '0' && e.playerId !== 0) return false;
    if (playerFilter === '1' && e.playerId !== 1) return false;
    return true;
  });

  // Width analysis — how wide players contact
  const p0shots = shots.filter(e => e.playerId === 0);
  const p1shots = shots.filter(e => e.playerId === 1);

  function avgWidth(arr) {
    if (!arr.length) return '—';
    return (arr.reduce((s, e) => s + Math.abs(e.fromX), 0) / arr.length).toFixed(2);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cw = canvas.width, ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = OE.bg; ctx.fillRect(0, 0, cw, ch);
    drawCourt(ctx, cw, ch);

    const p0pts = filtered.filter(e => e.playerId === 0).map(e => courtToCanvas(e.fromX, e.fromY, cw, ch));
    const p1pts = filtered.filter(e => e.playerId === 1).map(e => courtToCanvas(e.fromX, e.fromY, cw, ch));

    if (mode === 'scatter') {
      for (const { px, py } of p0pts) {
        ctx.globalAlpha = 0.65;
        ctx.fillStyle = OE.p0Color;
        ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI * 2); ctx.fill();
      }
      for (const { px, py } of p1pts) {
        ctx.globalAlpha = 0.65;
        ctx.fillStyle = OE.p1Color;
        ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else {
      // Heatmap overlay
      const tintCanvas = (pts, hexColor) => {
        if (pts.length === 0) return;
        const off = document.createElement('canvas');
        off.width = cw; off.height = ch;
        const octx = off.getContext('2d');
        const r = 22;
        for (const { px, py } of pts) {
          const g = octx.createRadialGradient(px, py, 0, px, py, r);
          const a = Math.min(0.25, 0.05 + 0.5 / pts.length);
          g.addColorStop(0, hexColor + 'AA');
          g.addColorStop(1, hexColor + '00');
          octx.fillStyle = g;
          octx.beginPath(); octx.arc(px, py, r, 0, Math.PI * 2); octx.fill();
        }
        ctx.globalAlpha = 0.85;
        ctx.drawImage(off, 0, 0);
        ctx.globalAlpha = 1;
      };
      tintCanvas(p0pts, OE.p0Color);
      tintCanvas(p1pts, OE.p1Color);
    }
  }, [filtered, mode]);

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
            Análise · Ponto de Contato
          </div>
          <div style={{ fontFamily: OE.fontDisplay, fontSize: 28, fontWeight: 700, color: OE.cream, lineHeight: 1 }}>
            {filtered.length} golpes
          </div>
          <div style={{ fontFamily: OE.fontBody, fontSize: 10, letterSpacing: 2, color: OE.gray4, marginTop: 4 }}>
            Largura média de contato — {p0?.name ?? 'P1'}: {avgWidth(p0shots)}m · {p1?.name ?? 'P2'}: {avgWidth(p1shots)}m
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[['both','Ambos'],[' 0',p0?.name??'P1'],['1',p1?.name??'P2']].map(([v,l])=>(
              <Btn key={v} active={playerFilter===v.trim()} onClick={()=>setPlayerFilter(v.trim())}>{l}</Btn>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <Btn active={mode==='scatter'} onClick={()=>setMode('scatter')}>Scatter</Btn>
            <Btn active={mode==='heatmap'} onClick={()=>setMode('heatmap')}>Heatmap</Btn>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        {[[p0?.name??'P1', OE.p0Color],[p1?.name??'P2', OE.p1Color]].map(([n,c]) => (
          <span key={n} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }}/>
            <span style={{ fontFamily: OE.fontBody, fontSize: 10, letterSpacing: 2, color: OE.gray4, textTransform: 'uppercase' }}>{n}</span>
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
