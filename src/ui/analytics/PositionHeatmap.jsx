import React, { useMemo } from 'react';

// ═══════════════════════════════════════════════════════════════════
//  PositionHeatmap — mapa de calor de posicionamento por jogador
//  Renderiza a grade 12×16 capturada em _heatGrid durante a partida.
//  Exibe os dois meios-campos lado a lado sobre diagrama de quadra.
// ═══════════════════════════════════════════════════════════════════

const OE = {
  cream:       '#f2ede6',
  gray3:       '#2a2a35',
  gray4:       '#555',
  fontDisplay: "'Teko','Barlow Condensed',sans-serif",
  fontBody:    "'Barlow Condensed','Teko',sans-serif",
};

// Paleta de calor: preto → azul → ciano → verde → amarelo → vermelho
function heatColor(norm) {
  // norm: 0.0 (frio) → 1.0 (quente)
  if (norm <= 0) return 'rgba(0,0,0,0)';
  if (norm < 0.15) {
    const t = norm / 0.15;
    return `rgba(${Math.round(20*t)},${Math.round(40*t)},${Math.round(140*t)},${0.3 + t * 0.4})`;
  }
  if (norm < 0.35) {
    const t = (norm - 0.15) / 0.20;
    return `rgba(${Math.round(20+t*10)},${Math.round(40+t*140)},${Math.round(140+t*80)},${0.7 + t * 0.1})`;
  }
  if (norm < 0.55) {
    const t = (norm - 0.35) / 0.20;
    return `rgba(${Math.round(30+t*100)},${Math.round(180+t*60)},${Math.round(220-t*120)},0.82)`;
  }
  if (norm < 0.75) {
    const t = (norm - 0.55) / 0.20;
    return `rgba(${Math.round(130+t*125)},${Math.round(240-t*50)},${Math.round(100-t*90)},0.88)`;
  }
  // 0.75 → 1.0: amarelo → vermelho
  const t = (norm - 0.75) / 0.25;
  return `rgba(255,${Math.round(190-t*190)},${Math.round(10-t*10)},${0.9 + t * 0.1})`;
}

// Constantes de quadra (metros)
const COLS = 12, ROWS = 16;
const COURT_W  = 8.23;   // singles width
const HALF_L   = 11.885; // half-court length (net to baseline)
const SVC_LINE = 6.40;   // service line distance from net

function HalfCourtHeatmap({ player, label, color, width = 260 }) {
  const grid = player?._heatGrid;

  // Normalizar grid
  const normalized = useMemo(() => {
    if (!grid || grid.length !== COLS * ROWS) return new Float32Array(COLS * ROWS);
    let maxVal = 0;
    for (let i = 0; i < grid.length; i++) if (grid[i] > maxVal) maxVal = grid[i];
    if (maxVal === 0) return new Float32Array(COLS * ROWS);
    const n = new Float32Array(COLS * ROWS);
    // Usa raiz quadrada para suavizar a diferença entre zonas muito quentes e frias
    const sqrtMax = Math.sqrt(maxVal);
    for (let i = 0; i < grid.length; i++) n[i] = Math.sqrt(grid[i]) / sqrtMax;
    return n;
  }, [grid]);

  // Dimensões do SVG
  // A quadra é orientada com a rede embaixo e a baseline em cima (perspectiva do jogador)
  const P = { t: 28, b: 24, l: 28, r: 12 };
  const courtH = width - P.l - P.r;    // altura da meia-quadra no SVG (será usada para comprimento)
  const courtW = width * 0.62;          // largura proporcional
  const svgW   = courtW + P.l + P.r;
  const svgH   = courtH + P.t + P.b;

  // Mapear metros → pixels
  const mx = x => P.l + ((x + COURT_W / 2) / COURT_W) * courtW;  // x court → px (centro em metade)
  const my = y => P.t + (1 - y / HALF_L) * courtH;                 // y court (0=net, HALF_L=baseline) → px (net embaixo)

  // Posição de cada célula da grade
  const cellW = courtW / COLS;
  const cellH = courtH / ROWS;

  const totalTicks = grid ? Array.from(grid).reduce((a, b) => a + b, 0) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {/* Nome do jogador */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 4, height: 24, background: color, flexShrink: 0 }} />
        <div>
          <div style={{ fontFamily: OE.fontDisplay, fontSize: 20, fontWeight: 700, color: OE.cream, letterSpacing: 1 }}>
            {player?.name ?? '—'}
          </div>
          <div style={{ fontFamily: OE.fontBody, fontSize: 9, color: OE.gray4, letterSpacing: 2 }}>
            {player?.styleData?.label} · {label}
          </div>
        </div>
      </div>

      {/* SVG da quadra */}
      <svg width={svgW} height={svgH} style={{ overflow: 'visible', maxWidth: '100%' }}>

        {/* ── Fundo da quadra ── */}
        <rect
          x={P.l} y={P.t} width={courtW} height={courtH}
          fill="rgba(12,18,30,0.8)" stroke="rgba(255,255,255,0.08)" strokeWidth={1}
        />

        {/* ── Células do heatmap ── */}
        {Array.from({ length: ROWS }, (_, ri) =>
          Array.from({ length: COLS }, (_, ci) => {
            // ri=0 → linha mais perto da baseline; ri=15 → linha mais perto da rede
            // A grade usa abs(y), então ri=0 = mais profundo (distante da rede)
            const norm = normalized[ri * COLS + ci];
            if (norm < 0.01) return null;
            const cellX = P.l + ci * cellW;
            // Inverter ri: ri=0 (baseline) deve aparecer no TOPO do SVG (baseline em cima)
            const cellY = P.t + (ROWS - 1 - ri) * cellH;
            return (
              <rect
                key={`${ri}-${ci}`}
                x={cellX + 0.5} y={cellY + 0.5}
                width={cellW - 1} height={cellH - 1}
                fill={heatColor(norm)}
                rx={1}
              />
            );
          })
        )}

        {/* ── Linhas da quadra ── */}
        {/* Baseline (topo) */}
        <line x1={P.l} y1={P.t} x2={P.l + courtW} y2={P.t} stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} />
        {/* Rede (fundo) */}
        <line x1={P.l} y1={P.t + courtH} x2={P.l + courtW} y2={P.t + courtH} stroke="rgba(255,255,255,0.6)" strokeWidth={2} />
        {/* Sidelines */}
        <line x1={P.l} y1={P.t} x2={P.l} y2={P.t + courtH} stroke="rgba(255,255,255,0.35)" strokeWidth={1} />
        <line x1={P.l + courtW} y1={P.t} x2={P.l + courtW} y2={P.t + courtH} stroke="rgba(255,255,255,0.35)" strokeWidth={1} />
        {/* Linha de saque */}
        {(() => {
          const svcY = P.t + (1 - SVC_LINE / HALF_L) * courtH;
          return <line x1={P.l} y1={svcY} x2={P.l + courtW} y2={svcY} stroke="rgba(255,255,255,0.22)" strokeWidth={1} strokeDasharray="3,3" />;
        })()}
        {/* Centro lateral */}
        <line
          x1={P.l + courtW / 2} y1={P.t}
          x2={P.l + courtW / 2} y2={P.t + courtH}
          stroke="rgba(255,255,255,0.12)" strokeWidth={1} strokeDasharray="2,4"
        />

        {/* ── Labels ── */}
        <text x={P.l + courtW / 2} y={P.t + courtH + 14} fill={OE.gray4} fontSize={8} textAnchor="middle" fontFamily={OE.fontBody}>REDE</text>
        <text x={P.l + courtW / 2} y={P.t - 8} fill={OE.gray4} fontSize={8} textAnchor="middle" fontFamily={OE.fontBody}>BASELINE</text>
        <text x={P.l - 6} y={P.t + courtH * (1 - SVC_LINE / HALF_L)} fill="rgba(255,255,255,0.2)" fontSize={7} textAnchor="end" fontFamily={OE.fontBody} dominantBaseline="middle">SVC</text>

        {/* ── Indicador de total ── */}
        <text x={P.l + courtW} y={P.t - 8} fill="rgba(255,255,255,0.18)" fontSize={7} textAnchor="end" fontFamily={OE.fontBody}>
          {totalTicks > 0 ? `${(totalTicks / 8).toFixed(0)} s` : ''}
        </text>
      </svg>

      {/* ── Legenda de zonas ── */}
      <ZoneSummary player={player} normalized={normalized} courtW={courtW} />
    </div>
  );
}

// Resumo textual das zonas mais frequentadas
function ZoneSummary({ player, normalized }) {
  const zones = useMemo(() => {
    if (!normalized) return [];
    // Dividir em 3 zonas de profundidade × 3 zonas laterais
    const zoneMap = [
      { name: 'Fundo L', rows: [0,5], cols: [0,3], val: 0 },
      { name: 'Fundo C', rows: [0,5], cols: [4,7], val: 0 },
      { name: 'Fundo D', rows: [0,5], cols: [8,11], val: 0 },
      { name: 'Médio L', rows: [6,10], cols: [0,3], val: 0 },
      { name: 'Médio C', rows: [6,10], cols: [4,7], val: 0 },
      { name: 'Médio D', rows: [6,10], cols: [8,11], val: 0 },
      { name: 'Rede L',  rows: [11,15], cols: [0,3], val: 0 },
      { name: 'Rede C',  rows: [11,15], cols: [4,7], val: 0 },
      { name: 'Rede D',  rows: [11,15], cols: [8,11], val: 0 },
    ];
    for (const z of zoneMap) {
      for (let ri = z.rows[0]; ri <= z.rows[1]; ri++) {
        for (let ci = z.cols[0]; ci <= z.cols[1]; ci++) {
          z.val += normalized[ri * COLS + ci] ?? 0;
        }
      }
    }
    const maxZ = Math.max(...zoneMap.map(z => z.val), 0.01);
    return zoneMap.map(z => ({ ...z, pct: z.val / maxZ })).sort((a, b) => b.val - a.val).slice(0, 3);
  }, [normalized]);

  if (!zones.length) return null;

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 200 }}>
      {zones.map((z, i) => (
        <div key={z.name} style={{
          background: `rgba(255,255,255,${0.03 + z.pct * 0.06})`,
          border: `1px solid rgba(255,255,255,${0.04 + z.pct * 0.08})`,
          padding: '3px 8px',
          display: 'flex', gap: 4, alignItems: 'center',
        }}>
          <span style={{ fontFamily: OE.fontBody, fontSize: 8, color: heatColor(z.pct), letterSpacing: 1 }}>●</span>
          <span style={{ fontFamily: OE.fontBody, fontSize: 8, color: OE.gray4, letterSpacing: 1 }}>{z.name}</span>
        </div>
      ))}
    </div>
  );
}

// ── Escala de cores ───────────────────────────────────────────────
function HeatLegend({ width = 180 }) {
  const steps = 20;
  const sw = width / steps;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={width} height={14} style={{ overflow: 'visible' }}>
        {Array.from({ length: steps }, (_, i) => (
          <rect
            key={i}
            x={i * sw} y={0} width={sw} height={10}
            fill={heatColor((i + 1) / steps)}
          />
        ))}
        <text x={0}     y={22} fill={OE.gray4} fontSize={8} fontFamily={OE.fontBody}>Raro</text>
        <text x={width} y={22} fill={OE.gray4} fontSize={8} fontFamily={OE.fontBody} textAnchor="end">Frequente</text>
      </svg>
    </div>
  );
}

// ── Componente principal exportado ────────────────────────────────
export default function PositionHeatmap({ p0, p1 }) {
  if (!p0 || !p1) return (
    <div style={{ padding: 32, color: OE.gray4, fontFamily: OE.fontBody }}>
      Sem dados de posicionamento disponíveis.
    </div>
  );

  const hasData0 = p0._heatGrid && Array.from(p0._heatGrid).some(v => v > 0);
  const hasData1 = p1._heatGrid && Array.from(p1._heatGrid).some(v => v > 0);

  if (!hasData0 && !hasData1) return (
    <div style={{ padding: 32, color: OE.gray4, fontFamily: OE.fontBody }}>
      Dados de heatmap não encontrados. Jogue uma partida completa para ver o mapa.
    </div>
  );

  return (
    <div style={{
      padding: '20px 24px 28px',
      display: 'flex', flexDirection: 'column', gap: 20,
      color: OE.cream,
    }}>
      {/* Header */}
      <div>
        <div style={{ fontFamily: OE.fontBody, fontSize: 10, letterSpacing: 3, color: OE.gray4, textTransform: 'uppercase', marginBottom: 4 }}>
          MAPA DE POSICIONAMENTO — onde cada jogador passou o tempo na partida
        </div>
        <div style={{ fontFamily: OE.fontBody, fontSize: 9, color: 'rgba(255,255,255,0.15)', letterSpacing: 1 }}>
          Amostrado a cada 8 frames · vista do jogador com baseline no topo
        </div>
      </div>

      {/* Duas quadras lado a lado */}
      <div style={{
        display: 'flex',
        gap: 32,
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}>
        <HalfCourtHeatmap player={p0} label="Meia-quadra" color={p0.color ?? '#7ab4ff'} width={240} />
        <HalfCourtHeatmap player={p1} label="Meia-quadra" color={p1.color ?? '#f87171'} width={240} />
      </div>

      {/* Escala */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <HeatLegend width={200} />
      </div>

      {/* Insight comparativo */}
      <HeatInsight p0={p0} p1={p1} />
    </div>
  );
}

// ── Insight: calcula diferenças táticas visíveis no posicionamento
function HeatInsight({ p0, p1 }) {
  const insights = useMemo(() => {
    const result = [];
    for (const p of [p0, p1]) {
      const grid = p._heatGrid;
      if (!grid || grid.length !== COLS * ROWS) continue;
      let total = 0, netZone = 0, deepZone = 0, leftSide = 0, rightSide = 0;
      for (let ri = 0; ri < ROWS; ri++) {
        for (let ci = 0; ci < COLS; ci++) {
          const v = grid[ri * COLS + ci];
          total += v;
          if (ri >= 11) netZone += v;           // perto da rede (linhas 11-15, abs Y baixo)
          if (ri <= 4)  deepZone += v;           // fundo (linhas 0-4, abs Y alto)
          if (ci < 5)   leftSide += v;
          if (ci >= 7)  rightSide += v;
        }
      }
      if (total === 0) continue;
      const netPct  = Math.round(netZone  / total * 100);
      const deepPct = Math.round(deepZone / total * 100);
      const lrBias  = leftSide - rightSide;
      const biasDir = Math.abs(lrBias) > total * 0.08
        ? (lrBias > 0 ? 'backhand' : 'forehand')
        : null;
      result.push({ name: p.name, netPct, deepPct, biasDir, styleId: p.styleData?.id });
    }
    return result;
  }, [p0, p1]);

  if (!insights.length) return null;

  return (
    <div style={{
      display: 'flex', gap: 12, flexWrap: 'wrap',
      padding: '14px 18px',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.05)',
    }}>
      {insights.map(ins => (
        <div key={ins.name} style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontFamily: OE.fontDisplay, fontSize: 14, color: OE.cream, letterSpacing: 1, marginBottom: 6 }}>
            {ins.name}
          </div>
          <div style={{ fontFamily: OE.fontBody, fontSize: 9, color: OE.gray4, lineHeight: 1.8, letterSpacing: 1 }}>
            {ins.deepPct > 40 && <div>◆ Joga fundo — {ins.deepPct}% do tempo no fundo da quadra</div>}
            {ins.deepPct < 20 && <div>◆ Posição avançada — pouco tempo no fundo</div>}
            {ins.netPct > 18  && <div>◆ Presença na rede — {ins.netPct}% do tempo perto da rede</div>}
            {ins.netPct < 5   && <div>◆ Quase nunca sobe à rede ({ins.netPct}%)</div>}
            {ins.biasDir && <div>◆ Tendência lateral para o {ins.biasDir}</div>}
            {!ins.biasDir && <div>◆ Posicionamento lateral equilibrado</div>}
          </div>
        </div>
      ))}
    </div>
  );
}


