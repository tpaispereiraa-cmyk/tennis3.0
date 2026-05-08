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
  p0Arrow:     '#f5d63d',
  p1Arrow:     '#3daaff',
  fontDisplay: "'Teko','Barlow Condensed',sans-serif",
  fontBody:    "'Barlow Condensed','Teko',sans-serif",
};

const DIR_COLORS = { CC: '#3dff8f', DTL: '#ff6b35', BODY: '#bb88ff' };
const DEPTH_COLORS = { SHORT: '#ff4040', MID: '#f5d63d', DEEP: '#3dff8f' };

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
  ctx.strokeStyle = OE.lines;
  ctx.lineWidth = 1;
  ctx.strokeRect(ox, oy, W, H);
  ctx.strokeStyle = OE.net;
  ctx.lineWidth = 2;
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

function drawArrow(ctx, x1, y1, x2, y2, color, alpha = 0.7) {
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  // arrowhead
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const hs = 5;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - hs * Math.cos(angle - 0.45), y2 - hs * Math.sin(angle - 0.45));
  ctx.lineTo(x2 - hs * Math.cos(angle + 0.45), y2 - hs * Math.sin(angle + 0.45));
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

const ALL_TYPES = ['TOPSPIN','FLAT','SLICE','SMASH','VOLLEY','DROP','PASSING','LOB_ATK','LOB_DEF','BANANA','SLICE_SHORT','SHORT_ANGLE'];

export default function ShotDirectionMap({ debugEvents = [], p0, p1 }) {
  const canvasRef = useRef(null);
  const [playerFilter, setPlayerFilter] = useState('both');
  const [dirFilter, setDirFilter] = useState('all');
  const [colorBy, setColorBy] = useState('dir');  // 'dir' | 'depth' | 'player'

  const shots = debugEvents.filter(e => e.type === 'SHOT_EVENT');

  const filtered = shots.filter(e => {
    if (playerFilter === '0' && e.playerId !== 0) return false;
    if (playerFilter === '1' && e.playerId !== 1) return false;
    if (dirFilter !== 'all' && e.dirLabel !== dirFilter) return false;
    return true;
  });

  // Stats
  const total = shots.length;
  const cc  = shots.filter(e => e.dirLabel === 'CC').length;
  const dtl = shots.filter(e => e.dirLabel === 'DTL').length;
  const body = shots.filter(e => e.dirLabel === 'BODY').length;
  const deep  = shots.filter(e => e.depthBucket === 'DEEP').length;
  const mid   = shots.filter(e => e.depthBucket === 'MID').length;
  const short = shots.filter(e => e.depthBucket === 'SHORT').length;

  const pct = (n) => total > 0 ? Math.round(n / total * 100) : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cw = canvas.width, ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = OE.bg;
    ctx.fillRect(0, 0, cw, ch);
    drawCourt(ctx, cw, ch);

    for (const e of filtered) {
      const { px: fx, py: fy } = courtToCanvas(e.fromX, e.fromY, cw, ch);
      const { px: tx, py: ty } = courtToCanvas(e.toX, e.toY, cw, ch);
      let color;
      if (colorBy === 'dir')    color = DIR_COLORS[e.dirLabel] ?? OE.cream;
      else if (colorBy === 'depth') color = DEPTH_COLORS[e.depthBucket] ?? OE.cream;
      else                      color = e.playerId === 0 ? OE.p0Arrow : OE.p1Arrow;
      drawArrow(ctx, fx, fy, tx, ty, color, 0.55);
    }
  }, [filtered, colorBy]);

  const Btn = ({ val, cur, set, children, color }) => (
    <button onClick={() => set(v => v === val ? (typeof cur === 'string' ? (val === 'all' || val === 'both' ? val : 'all') : 'all') : val)}
      style={{
        padding: '5px 11px', cursor: 'pointer', borderRadius: 2, fontSize: 10,
        fontFamily: OE.fontBody, letterSpacing: 2, textTransform: 'uppercase',
        background: cur === val ? 'rgba(255,255,255,0.08)' : 'transparent',
        border: `1px solid ${cur === val ? (color || 'rgba(255,255,255,0.4)') : 'rgba(255,255,255,0.10)'}`,
        color: cur === val ? OE.cream : OE.gray4,
      }}>{children}</button>
  );

  return (
    <div style={{ padding: '24px 48px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontFamily: OE.fontBody, fontSize: 9, letterSpacing: 4, color: OE.gray4, textTransform: 'uppercase', marginBottom: 4 }}>
            Análise · Direção dos Golpes
          </div>
          <div style={{ fontFamily: OE.fontDisplay, fontSize: 28, fontWeight: 700, color: OE.cream, lineHeight: 1 }}>
            {total} golpes · CC {pct(cc)}% · DTL {pct(dtl)}% · BODY {pct(body)}%
          </div>
          <div style={{ fontFamily: OE.fontBody, fontSize: 10, letterSpacing: 2, color: OE.gray4, marginTop: 4 }}>
            CURTO {pct(short)}% · MÉDIO {pct(mid)}% · FUNDO {pct(deep)}%
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Player filter */}
          <div style={{ display: 'flex', gap: 4 }}>
            <Btn val="both" cur={playerFilter} set={setPlayerFilter}>Ambos</Btn>
            <Btn val="0" cur={playerFilter} set={setPlayerFilter} color={OE.p0Arrow}>{p0?.name ?? 'P1'}</Btn>
            <Btn val="1" cur={playerFilter} set={setPlayerFilter} color={OE.p1Arrow}>{p1?.name ?? 'P2'}</Btn>
          </div>
          {/* Dir filter */}
          <div style={{ display: 'flex', gap: 4 }}>
            <Btn val="all" cur={dirFilter} set={setDirFilter}>Todos</Btn>
            <Btn val="CC" cur={dirFilter} set={setDirFilter} color={DIR_COLORS.CC}>CC</Btn>
            <Btn val="DTL" cur={dirFilter} set={setDirFilter} color={DIR_COLORS.DTL}>DTL</Btn>
            <Btn val="BODY" cur={dirFilter} set={setDirFilter} color={DIR_COLORS.BODY}>Body</Btn>
          </div>
          {/* Color by */}
          <div style={{ display: 'flex', gap: 4 }}>
            <span style={{ fontFamily: OE.fontBody, fontSize: 9, letterSpacing: 2, color: OE.gray4, textTransform: 'uppercase', alignSelf: 'center' }}>Cor:</span>
            <Btn val="dir" cur={colorBy} set={setColorBy}>Direção</Btn>
            <Btn val="depth" cur={colorBy} set={setColorBy}>Profundidade</Btn>
            <Btn val="player" cur={colorBy} set={setColorBy}>Jogador</Btn>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {colorBy === 'dir' && Object.entries(DIR_COLORS).map(([k, c]) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }}/>
            <span style={{ fontFamily: OE.fontBody, fontSize: 10, letterSpacing: 2, color: OE.gray4, textTransform: 'uppercase' }}>{k}</span>
          </span>
        ))}
        {colorBy === 'depth' && Object.entries(DEPTH_COLORS).map(([k, c]) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }}/>
            <span style={{ fontFamily: OE.fontBody, fontSize: 10, letterSpacing: 2, color: OE.gray4, textTransform: 'uppercase' }}>{k}</span>
          </span>
        ))}
        {colorBy === 'player' && [
          [p0?.name ?? 'P1', OE.p0Arrow],
          [p1?.name ?? 'P2', OE.p1Arrow],
        ].map(([name, c]) => (
          <span key={name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }}/>
            <span style={{ fontFamily: OE.fontBody, fontSize: 10, letterSpacing: 2, color: OE.gray4, textTransform: 'uppercase' }}>{name}</span>
          </span>
        ))}
      </div>

      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        <canvas ref={canvasRef} width={480} height={680}
          style={{ display: 'block', border: '1px solid rgba(255,255,255,0.07)', maxWidth: '100%' }} />
        <div style={{ position: 'absolute', left: 4, top: '25%', fontFamily: OE.fontBody, fontSize: 9, letterSpacing: 2, color: OE.gray4, textTransform: 'uppercase', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{p1?.name ?? 'P2'}</div>
        <div style={{ position: 'absolute', left: 4, top: '65%', fontFamily: OE.fontBody, fontSize: 9, letterSpacing: 2, color: OE.gray4, textTransform: 'uppercase', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{p0?.name ?? 'P1'}</div>
      </div>

      {filtered.length === 0 && (
        <div style={{ fontFamily: OE.fontBody, fontSize: 10, letterSpacing: 2, color: OE.gray4, textTransform: 'uppercase', textAlign: 'center' }}>
          Nenhum golpe com esse filtro
        </div>
      )}
    </div>
  );
}
