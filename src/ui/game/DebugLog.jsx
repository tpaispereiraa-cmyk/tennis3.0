import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ── Helpers ───────────────────────────────────────────────────────────────────
const f2  = v => (v == null ? '---' : Number(v).toFixed(2));
const f1  = v => (v == null ? '--'  : Number(v).toFixed(1));
const pct = v => (v == null ? '--'  : Math.round(v * 100) + '%');
const kmh = v => (v == null ? '--'  : Math.round(v * 3.6) + ' km/h');
const spd = p => p?.vel ? Math.sqrt(p.vel.x ** 2 + p.vel.y ** 2) : 0;
function urgencyLabel(margin) {
  if (margin == null) return 'N/A';
  if (margin > 0.4)   return 'JOG';
  if (margin > 0.0)   return 'RUN';
  return 'SPRINT';
}

// ── Classifica linha do techLog ───────────────────────────────────────────────
function classifyLine(line) {
  if (!line || !line.trim()) return { type: 'empty' };
  if (line.startsWith('═'))                 return { type: 'divider' };
  if (line.startsWith('PONTO #'))           return { type: 'header',  color: '#c9a84c' };
  if (line.startsWith('Servidor:'))         return { type: 'meta',    color: '#7ab4ff' };
  if (line.includes('[FIM]'))               return { type: 'end',     color: '#00e676' };
  if (line.match(/^\[SQ\]/))               return { type: 'serve',   color: '#38bdf8' };
  if (line.match(/^\[H\s*\d+\]/))          return { type: 'hit',     color: '#a78bfa' };
  if (line.match(/^\[ER\s*\d+\]/))         return { type: 'error',   color: '#f87171' };
  if (line.match(/^\[QB\s*\d+\]/))         return { type: 'bounce',  color: '#4ade80' };
  if (line.startsWith('     '))            return { type: 'detail',  color: '#4a5568' };
  return { type: 'misc', color: '#718096' };
}

// ── Parse techLog into point objects ─────────────────────────────────────────
function parseTechLog(techLog) {
  const points = [];
  let current = null;
  for (const raw of (techLog || [])) {
    const line = typeof raw === 'string' ? raw : String(raw);
    if (line.startsWith('PONTO #')) {
      if (current) points.push(current);
      current = { header: line, lines: [], winner: null, rally: 0 };
    } else if (current) {
      if (line.includes('[FIM]')) {
        const m = line.match(/▶\s+(.+?)\s+vence.*rally=(\d+)/);
        if (m) { current.winner = m[1]; current.rally = parseInt(m[2], 10); }
        current.lines.push(line);
        points.push(current); current = null;
      } else { current.lines.push(line); }
    }
  }
  if (current) points.push(current);
  return points;
}

// ── Live snapshot ─────────────────────────────────────────────────────────────
function buildSnapshot(gs) {
  if (!gs) return [];
  const b = gs.ball, p0 = gs.players?.[0], p1 = gs.players?.[1];
  const lines = [];
  lines.push({ t:'section', text:'BOLA' });
  lines.push({ t:'kv', k:'pos',    v:`x:${f2(b?.pos?.x)}  y:${f2(b?.pos?.y)}  z:${f2(b?.pos?.z)}` });
  lines.push({ t:'kv', k:'vel',    v:`x:${f2(b?.vel?.x)}  y:${f2(b?.vel?.y)}  z:${f2(b?.vel?.z)}` });
  lines.push({ t:'kv', k:'speed',  v: kmh(b?.vel ? Math.sqrt(b.vel.x**2+b.vel.y**2+b.vel.z**2) : 0) });
  lines.push({ t:'kv', k:'spin',   v:`x:${f2(b?.spin?.x)}  z:${f2(b?.spin?.z)}` });
  lines.push({ t:'kv', k:'estado', v:`inFlight:${b?.inFlight}  bounces:${b?.bounceCount ?? 0}  lastHit:${b?.lastHitBy ?? '-'}` });
  for (const [i, p] of [[0, p0], [1, p1]]) {
    if (!p) continue;
    const s = spd(p), urg = urgencyLabel(p._arrivalMargin);
    const urgColor = urg === 'SPRINT' ? '#f87171' : urg === 'RUN' ? '#fbbf24' : '#6ee7b7';
    lines.push({ t:'section', text:`${p.name || 'J'+i}  ·  ${p.styleData?.abbr || '?'}` });
    lines.push({ t:'kv', k:'pos',      v:`x:${f2(p.pos?.x)}  y:${f2(p.pos?.y)}  (lado:${p.side > 0 ? '+1' : '-1'})` });
    lines.push({ t:'kv', k:'vel',      v:`x:${f2(p.vel?.x)}  y:${f2(p.vel?.y)}  →  ${f1(s)} m/s` });
    lines.push({ t:'kv', k:'stamina',  v: pct(p.stamina),            vColor: p.stamina < 0.35 ? '#f87171' : p.stamina < 0.65 ? '#fbbf24' : '#4ade80' });
    lines.push({ t:'kv', k:'momentum', v: pct(p.ctx?.momentum),      vColor: (p.ctx?.momentum ?? 0.5) > 0.65 ? '#fbbf24' : '#a0aec0' });
    lines.push({ t:'kv', k:'pressure', v: pct(p.ctx?.rallyPressure), vColor: (p.ctx?.rallyPressure ?? 0) > 0.6 ? '#f87171' : '#a0aec0' });
    lines.push({ t:'kv', k:'arrival',  v:`${f2(p._arrivalMargin)}s`,  vColor: urgColor });
    lines.push({ t:'kv', k:'urgency',  v: urg,                        vColor: urgColor });
    lines.push({ t:'kv', k:'atNet',    v: String(p.atNet || false) });
    lines.push({ t:'kv', k:'swing',    v: String(p.swinging || false) });
    lines.push({ t:'kv', k:'reach',    v:`${f2(p.reach)}m` });
    lines.push({ t:'kv', k:'rev180',   v:`${p.ctx?._reversalFrames ?? 0}f` });
    lines.push({ t:'kv', k:'postHit',  v:`${f2(p.ctx?._postHitPause)}s` });
  }
  return lines;
}

// ── PointBlock ────────────────────────────────────────────────────────────────
function PointBlock({ point, idx, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);
  const fullText = [point.header, ...point.lines].join('\n');
  const isComplete = !!point.winner;
  const ptNum = (point.header.match(/PONTO #\s*(\d+)/) || [])[1] || (idx + 1);
  const hits    = point.lines.filter(l => l.match(/^\[H\s*\d+\]/)).length;
  const errors  = point.lines.filter(l => l.match(/^\[ER\s*\d+\]/)).length;

  return (
    <div style={{
      marginBottom: 3,
      border: `1px solid ${isComplete ? 'rgba(255,255,255,0.05)' : 'rgba(251,191,36,0.28)'}`,
      borderRadius: 5, overflow: 'hidden',
      background: isComplete ? 'rgba(5,8,16,0.5)' : 'rgba(251,191,36,0.03)',
    }}>
      {/* Row header */}
      <div onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 8px', cursor: 'pointer',
        background: 'rgba(255,255,255,0.015)', userSelect: 'none',
      }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: isComplete ? '#c9a84c' : '#fbbf24', minWidth: 26, fontFamily: 'monospace' }}>
          #{ptNum}
        </span>
        {!isComplete && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fbbf24', flexShrink: 0, boxShadow: '0 0 5px #fbbf24', display:'inline-block' }} />}
        <span style={{ flex: 1, fontSize: 9, color: isComplete ? '#d1d5db' : '#fbbf24', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isComplete ? point.winner : 'EM ANDAMENTO…'}
        </span>
        <span style={{ fontSize: 7, color: '#374151', flexShrink: 0 }}>
          {point.rally > 0 ? `R:${point.rally} ` : ''}
          {hits > 0 ? `H:${hits} ` : ''}
          {errors > 0 ? `E:${errors}` : ''}
        </span>
        {isComplete && (
          <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(fullText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }); }} style={{
            background: copied ? 'rgba(0,230,118,0.12)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${copied ? 'rgba(0,230,118,0.35)' : 'rgba(255,255,255,0.07)'}`,
            borderRadius: 3, color: copied ? '#00e676' : '#4b5563',
            fontSize: 7.5, padding: '1px 5px', cursor: 'pointer', flexShrink: 0,
          }}>
            {copied ? '✓' : '⎘'}
          </button>
        )}
        <span style={{ fontSize: 8, color: '#374151', flexShrink: 0 }}>{open ? '▾' : '▸'}</span>
      </div>

      {/* Body */}
      {open && (
        <div style={{ padding: '4px 8px 8px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          {point.lines.map((line, i) => {
            const { type, color } = classifyLine(line);
            if (type === 'empty' || type === 'divider') return null;
            const tagMatch = line.match(/^(\[[^\]]+\])/);
            const tag = tagMatch ? tagMatch[1] : null;
            const rest = tag ? line.slice(tag.length) : line;
            const isDetail = type === 'detail';
            const tagBg = type === 'serve'  ? 'rgba(56,189,248,0.12)'
                        : type === 'hit'    ? 'rgba(167,139,250,0.12)'
                        : type === 'error'  ? 'rgba(248,113,113,0.14)'
                        : type === 'bounce' ? 'rgba(74,222,128,0.10)'
                        : type === 'end'    ? 'rgba(0,230,118,0.12)'
                        : 'rgba(255,255,255,0.04)';
            return (
              <div key={i} style={{ display: 'flex', gap: 5, alignItems: 'flex-start', marginBottom: isDetail ? 0 : 1.5, paddingLeft: isDetail ? 20 : 0, opacity: isDetail ? 0.55 : 1 }}>
                {tag && !isDetail && (
                  <span style={{ fontSize: 7, fontFamily: 'monospace', fontWeight: 700, flexShrink: 0, padding: '0 4px', borderRadius: 2, background: tagBg, color: color || '#9ca3af', marginTop: 1, border: `1px solid ${(color || '#9ca3af')}22` }}>
                    {tag}
                  </span>
                )}
                <span style={{ fontSize: 7.5, fontFamily: 'monospace', color: type === 'end' ? '#00e676' : type === 'meta' ? '#7ab4ff' : isDetail ? '#374151' : '#9ca3af', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.65, flex: 1 }}>
                  {isDetail ? line : rest}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function DebugLog({ gsRef }) {
  const [visible,    setVisible]    = useState(false);
  const [tab,        setTab]        = useState('log');
  const [points,     setPoints]     = useState([]);
  const [liveSnap,   setLiveSnap]   = useState([]);
  const [copyAll,    setCopyAll]    = useState(false);
  const [filter,     setFilter]     = useState('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const timerRef  = useRef(null);
  const scrollRef = useRef(null);
  const prevLen   = useRef(0);

  useEffect(() => {
    if (!visible) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      const gs = gsRef.current;
      if (!gs) return;
      const parsed = parseTechLog(gs.techLog);
      if (gs._ptBuf && gs._ptBuf.length > 0) {
        setPoints([...parsed, { header: 'EM ANDAMENTO', lines: [...gs._ptBuf], winner: null, rally: gs.rally || 0 }]);
      } else { setPoints(parsed); }
      if (tab === 'live') setLiveSnap(buildSnapshot(gs));
    }, 200);
    return () => clearInterval(timerRef.current);
  }, [visible, tab, gsRef]);

  useEffect(() => {
    if (autoScroll && scrollRef.current && points.length !== prevLen.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      prevLen.current = points.length;
    }
  }, [points, autoScroll]);

  const handleCopyAll = () => {
    const gs = gsRef.current;
    if (!gs) return;
    navigator.clipboard.writeText((gs.techLog || []).join('\n')).then(() => {
      setCopyAll(true); setTimeout(() => setCopyAll(false), 1800);
    });
  };

  const visiblePoints = useMemo(() => {
    if (filter === 'all')    return points;
    if (filter === 'hits')   return points.filter(p => p.lines.some(l => l.match(/^\[H\s*\d+\]/)));
    if (filter === 'errors') return points.filter(p => p.lines.some(l => l.match(/^\[ER\s*\d+\]/)));
    if (filter === 'serves') return points.filter(p => p.lines.some(l => l.match(/^\[SQ\]/)));
    return points;
  }, [points, filter]);

  const totalPts = points.filter(p => p.winner).length;

  return (
    <>
      {/* Toggle */}
      <button onClick={() => setVisible(v => !v)} style={{
        position: 'fixed', bottom: 52, left: 14, zIndex: 300,
        background: visible ? 'rgba(201,168,76,0.14)' : 'rgba(5,10,20,0.82)',
        border: `1px solid ${visible ? 'rgba(201,168,76,0.48)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 6, color: visible ? '#c9a84c' : 'rgba(255,255,255,0.32)',
        fontSize: 9, fontFamily: 'monospace', letterSpacing: 1.5,
        padding: '4px 9px', cursor: 'pointer', backdropFilter: 'blur(10px)',
      }}>
        📋 LOG{totalPts > 0 ? ` (${totalPts})` : ''}
      </button>

      {visible && (
        <div style={{
          position: 'fixed', bottom: 88, left: 14, zIndex: 400,
          width: 440, maxHeight: '74vh',
          background: 'rgba(3,5,12,0.97)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 10, backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 48px rgba(0,0,0,0.75)',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'monospace', overflow: 'hidden',
        }}>

          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 10px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(201,168,76,0.03)', flexShrink:0 }}>
            <span style={{ fontSize:9, fontWeight:700, letterSpacing:2, color:'#c9a84c', flex:1 }}>📋 LOG DA PARTIDA</span>
            <span style={{ fontSize:7.5, color:'#374151' }}>{totalPts} pontos</span>
            <button onClick={handleCopyAll} style={{
              background: copyAll ? 'rgba(0,230,118,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${copyAll ? 'rgba(0,230,118,0.35)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius:4, color: copyAll ? '#00e676' : '#6b7280',
              fontSize:7.5, padding:'2px 7px', cursor:'pointer', letterSpacing:1,
            }}>
              {copyAll ? '✓ COPIADO' : '⎘ COPIAR TUDO'}
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', borderBottom:'1px solid rgba(255,255,255,0.05)', flexShrink:0 }}>
            {[['log','📊 PONTOS'],['live','⚡ AO VIVO']].map(([id, lbl]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                flex:1, padding:'5px 0', fontSize:8, letterSpacing:1.5, fontFamily:'monospace',
                background: tab===id ? 'rgba(201,168,76,0.07)' : 'transparent',
                border:'none', borderBottom: tab===id ? '2px solid #c9a84c' : '2px solid transparent',
                color: tab===id ? '#c9a84c' : '#374151', cursor:'pointer',
              }}>{lbl}</button>
            ))}
          </div>

          {/* Filter bar */}
          {tab === 'log' && (
            <div style={{ display:'flex', gap:4, padding:'5px 8px', borderBottom:'1px solid rgba(255,255,255,0.04)', flexShrink:0, alignItems:'center' }}>
              <span style={{ fontSize:7, color:'#374151', letterSpacing:1, marginRight:2 }}>FILTRO</span>
              {[['all','TODOS','#6b7280'],['serves','SAQUES','#38bdf8'],['hits','GOLPES','#a78bfa'],['errors','ERROS','#f87171']].map(([id,lbl,clr]) => (
                <button key={id} onClick={() => setFilter(id)} style={{
                  padding:'2px 6px', fontSize:7, letterSpacing:1, fontFamily:'monospace',
                  background: filter===id ? `${clr}20` : 'transparent',
                  border: `1px solid ${filter===id ? `${clr}55` : 'rgba(255,255,255,0.05)'}`,
                  borderRadius:3, color: filter===id ? clr : '#374151', cursor:'pointer',
                }}>{lbl}</button>
              ))}
              <span style={{ flex:1 }} />
              <label style={{ display:'flex', alignItems:'center', gap:4, cursor:'pointer', fontSize:7, color:'#374151', letterSpacing:1 }}>
                <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)}
                  style={{ width:10, height:10, accentColor:'#c9a84c' }} />
                AUTO-SCROLL
              </label>
            </div>
          )}

          {/* Content */}
          <div ref={scrollRef} style={{
            flex:1, overflowY:'auto', padding: tab==='log' ? '5px 5px' : 0,
            scrollbarWidth:'thin', scrollbarColor:'rgba(201,168,76,0.12) transparent',
          }}>
            {tab === 'log' ? (
              visiblePoints.length === 0
                ? <div style={{ padding:20, fontSize:9, color:'#374151', textAlign:'center', letterSpacing:1 }}>aguardando início…</div>
                : visiblePoints.map((pt, i) => (
                    <PointBlock key={i} idx={i} point={pt} defaultOpen={i === visiblePoints.length - 1} />
                  ))
            ) : (
              <div style={{ padding:'6px 8px' }}>
                {liveSnap.map((item, i) => item.t === 'section' ? (
                  <div key={i} style={{ fontSize:7.5, fontWeight:700, letterSpacing:2, color:'#38bdf8', textTransform:'uppercase', borderBottom:'1px solid rgba(56,189,248,0.12)', marginBottom:3, marginTop:i>0?8:0, paddingBottom:2 }}>{item.text}</div>
                ) : (
                  <div key={i} style={{ display:'flex', gap:6, marginBottom:1.5 }}>
                    <span style={{ fontSize:7.5, color:'#374151', minWidth:60, flexShrink:0 }}>{item.k}</span>
                    <span style={{ fontSize:7.5, color: item.vColor || '#9ca3af' }}>{item.v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Legend */}
          {tab === 'log' && (
            <div style={{ flexShrink:0, borderTop:'1px solid rgba(255,255,255,0.04)', padding:'4px 10px', display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
              {[['[SQ]','#38bdf8','Saque'],['[H]','#a78bfa','Golpe'],['[ER]','#f87171','Erro'],['[QB]','#4ade80','Quique']].map(([tag,color,lbl]) => (
                <div key={tag} style={{ display:'flex', alignItems:'center', gap:3 }}>
                  <span style={{ fontSize:6.5, color, fontFamily:'monospace' }}>{tag}</span>
                  <span style={{ fontSize:6.5, color:'#374151' }}>{lbl}</span>
                </div>
              ))}
              <span style={{ flex:1 }} />
              <span style={{ fontSize:6.5, color:'#1f2937' }}>clique p/ expandir · ⎘ = copiar ponto</span>
            </div>
          )}
        </div>
      )}
    </>
  );
}

