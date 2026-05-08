import React, { useState, useMemo } from 'react';

const OE = {
  bg:          '#0e1117',
  cream:       '#f2ede6',
  gray2:       '#1e1e26',
  gray3:       '#333',
  gray4:       '#555',
  p0Color:     '#f5d63d',
  p1Color:     '#3daaff',
  fontDisplay: "'Teko','Barlow Condensed',sans-serif",
  fontBody:    "'Barlow Condensed','Teko',sans-serif",
};

const DIR_COLORS  = { CC: '#3dff8f', DTL: '#ff6b35', BODY: '#bb88ff' };
const DEPTH_COLORS = { SHORT: '#ff4040', MID: '#f5d63d', DEEP: '#3dff8f' };
const WIDTH_COLORS = { WIDE: '#ff9f40', MID: '#f5d63d', CENTRE: '#3d9fff' };

// Build rally sequences from debugEvents
function buildRallySequences(events) {
  const byRally = {};
  for (const e of events) {
    if (e.type !== 'SHOT_EVENT') continue;
    const r = e.rallyBallIndex ?? 0;
    if (!byRally[r]) byRally[r] = [];
    byRally[r].push(e);
  }
  // Return sorted by rallyBallIndex
  return Object.values(byRally).sort((a, b) => (a[0]?.rallyBallIndex ?? 0) - (b[0]?.rallyBallIndex ?? 0));
}

// Extract N-grams of dirLabel from a single rally sequence
function extractPatterns(rallies, n = 3) {
  const counts = {};
  for (const rally of rallies) {
    if (rally.length < n) continue;
    for (let i = 0; i <= rally.length - n; i++) {
      const pat = rally.slice(i, i + n).map(e => e.dirLabel).join('→');
      counts[pat] = (counts[pat] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
}

function extractDepthPatterns(rallies, n = 3) {
  const counts = {};
  for (const rally of rallies) {
    if (rally.length < n) continue;
    for (let i = 0; i <= rally.length - n; i++) {
      const pat = rally.slice(i, i + n).map(e => e.depthBucket).join('→');
      counts[pat] = (counts[pat] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);
}

function PatternTag({ label, color }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 7px',
      borderRadius: 2,
      background: `${color}22`,
      border: `1px solid ${color}55`,
      fontFamily: OE.fontBody,
      fontSize: 11,
      letterSpacing: 1,
      color: color,
      whiteSpace: 'nowrap',
    }}>{label}</span>
  );
}

export default function PatternMap({ debugEvents = [], p0, p1 }) {
  const [nGram, setNGram] = useState(3);
  const [patternType, setPatternType] = useState('dir');  // 'dir' | 'depth'
  const [selectedRally, setSelectedRally] = useState(null);

  const shots = debugEvents.filter(e => e.type === 'SHOT_EVENT');

  // Group shots into rally sequences (consecutive rally indices)
  const rallies = useMemo(() => {
    if (!shots.length) return [];
    // Each point has shots with sequential rallyBallIndex
    // We detect new rally when rallyBallIndex resets or decrements
    const result = [];
    let current = [];
    let lastIdx = -1;
    for (const s of shots) {
      const idx = s.rallyBallIndex ?? 0;
      if (idx < lastIdx && current.length > 0) {
        result.push([...current]);
        current = [];
      }
      current.push(s);
      lastIdx = idx;
    }
    if (current.length > 0) result.push(current);
    return result;
  }, [shots]);

  const dirPatterns   = useMemo(() => extractPatterns(rallies, nGram), [rallies, nGram]);
  const depthPatterns = useMemo(() => extractDepthPatterns(rallies, nGram), [rallies, nGram]);

  const patterns = patternType === 'dir' ? dirPatterns : depthPatterns;
  const colorMap = patternType === 'dir' ? DIR_COLORS : DEPTH_COLORS;

  const displayRally = selectedRally !== null ? rallies[selectedRally] : null;

  const Btn = ({ active, onClick, children }) => (
    <button onClick={onClick} style={{
      padding: '5px 11px', cursor: 'pointer', borderRadius: 2, fontSize: 10,
      fontFamily: OE.fontBody, letterSpacing: 2, textTransform: 'uppercase',
      background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
      border: `1px solid ${active ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.10)'}`,
      color: active ? OE.cream : OE.gray4,
    }}>{children}</button>
  );

  // Stats per player
  const pStats = (pid) => {
    const ps = shots.filter(e => e.playerId === pid);
    if (!ps.length) return null;
    const total = ps.length;
    const cc  = ps.filter(e => e.dirLabel === 'CC').length;
    const dtl = ps.filter(e => e.dirLabel === 'DTL').length;
    const body= ps.filter(e => e.dirLabel === 'BODY').length;
    const short= ps.filter(e => e.depthBucket === 'SHORT').length;
    const mid  = ps.filter(e => e.depthBucket === 'MID').length;
    const deep = ps.filter(e => e.depthBucket === 'DEEP').length;
    const wide = ps.filter(e => e.widthBucket === 'WIDE').length;
    const wMid = ps.filter(e => e.widthBucket === 'MID').length;
    const ctr  = ps.filter(e => e.widthBucket === 'CENTRE').length;
    const pct = n => Math.round(n / total * 100);
    return { total, cc: pct(cc), dtl: pct(dtl), body: pct(body), short: pct(short), mid: pct(mid), deep: pct(deep), wide: pct(wide), wMid: pct(wMid), ctr: pct(ctr) };
  };

  const s0 = pStats(0), s1 = pStats(1);

  return (
    <div style={{ padding: '24px 48px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <div style={{ fontFamily: OE.fontBody, fontSize: 9, letterSpacing: 4, color: OE.gray4, textTransform: 'uppercase', marginBottom: 4 }}>
          Análise · Padrões de Jogo
        </div>
        <div style={{ fontFamily: OE.fontDisplay, fontSize: 28, fontWeight: 700, color: OE.cream, lineHeight: 1 }}>
          {rallies.length} rallies · {shots.length} golpes
        </div>
      </div>

      {/* Per-player summary */}
      {(s0 || s1) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[[0, s0, p0], [1, s1, p1]].map(([pid, s, p]) => s && (
            <div key={pid} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', padding: '14px 16px' }}>
              <div style={{ fontFamily: OE.fontDisplay, fontSize: 18, fontWeight: 600, color: pid === 0 ? OE.p0Color : OE.p1Color, marginBottom: 10 }}>
                {p?.name ?? `P${pid + 1}`} — {s.total} golpes
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ fontFamily: OE.fontBody, fontSize: 10, letterSpacing: 2, color: OE.gray4, textTransform: 'uppercase' }}>Direção</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <PatternTag label={`CC ${s.cc}%`}   color={DIR_COLORS.CC} />
                  <PatternTag label={`DTL ${s.dtl}%`} color={DIR_COLORS.DTL} />
                  <PatternTag label={`BODY ${s.body}%`} color={DIR_COLORS.BODY} />
                </div>
                <div style={{ fontFamily: OE.fontBody, fontSize: 10, letterSpacing: 2, color: OE.gray4, textTransform: 'uppercase', marginTop: 4 }}>Profundidade</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <PatternTag label={`CURTO ${s.short}%`} color={DEPTH_COLORS.SHORT} />
                  <PatternTag label={`MED ${s.mid}%`}     color={DEPTH_COLORS.MID} />
                  <PatternTag label={`FUNDO ${s.deep}%`}  color={DEPTH_COLORS.DEEP} />
                </div>
                <div style={{ fontFamily: OE.fontBody, fontSize: 10, letterSpacing: 2, color: OE.gray4, textTransform: 'uppercase', marginTop: 4 }}>Largura</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <PatternTag label={`WIDE ${s.wide}%`}   color={WIDTH_COLORS.WIDE} />
                  <PatternTag label={`MID ${s.wMid}%`}    color={WIDTH_COLORS.MID} />
                  <PatternTag label={`CTR ${s.ctr}%`}     color={WIDTH_COLORS.CENTRE} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pattern ranking */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontFamily: OE.fontBody, fontSize: 9, letterSpacing: 4, color: OE.gray4, textTransform: 'uppercase' }}>
            Padrões mais comuns (sequências de {nGram})
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[2,3,4].map(n => (
              <Btn key={n} active={nGram === n} onClick={() => setNGram(n)}>{n}-gram</Btn>
            ))}
            <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }}/>
            <Btn active={patternType === 'dir'}   onClick={() => setPatternType('dir')}>Direção</Btn>
            <Btn active={patternType === 'depth'} onClick={() => setPatternType('depth')}>Profundidade</Btn>
          </div>
        </div>

        {patterns.length === 0 ? (
          <div style={{ fontFamily: OE.fontBody, fontSize: 10, letterSpacing: 2, color: OE.gray4, textTransform: 'uppercase' }}>
            Rallies muito curtos para gerar padrões de {nGram}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {patterns.map(([pat, count], i) => {
              const parts = pat.split('→');
              const maxCount = patterns[0]?.[1] ?? 1;
              return (
                <div key={pat} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontFamily: OE.fontDisplay, fontSize: 14, color: OE.gray4, width: 20, textAlign: 'right' }}>
                    {i + 1}
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
                    {parts.map((p, j) => (
                      <React.Fragment key={j}>
                        <PatternTag label={p} color={colorMap[p] ?? OE.gray4} />
                        {j < parts.length - 1 && (
                          <span style={{ color: OE.gray4, fontSize: 10 }}>→</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 80 }}>
                    <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.round(count / maxCount * 100)}%`, background: colorMap[parts[0]] ?? OE.cream, transition: 'width 0.4s' }}/>
                    </div>
                    <div style={{ fontFamily: OE.fontDisplay, fontSize: 16, fontWeight: 600, color: OE.cream, lineHeight: 1, minWidth: 24 }}>
                      {count}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rally timeline */}
      <div>
        <div style={{ fontFamily: OE.fontBody, fontSize: 9, letterSpacing: 4, color: OE.gray4, textTransform: 'uppercase', marginBottom: 10 }}>
          Timeline do Rally — selecione um rally
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
          {rallies.map((r, i) => (
            <button key={i} onClick={() => setSelectedRally(selectedRally === i ? null : i)}
              style={{
                padding: '4px 8px', cursor: 'pointer', borderRadius: 2,
                fontFamily: OE.fontBody, fontSize: 10, letterSpacing: 1,
                background: selectedRally === i ? 'rgba(255,255,255,0.12)' : 'transparent',
                border: `1px solid ${selectedRally === i ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.10)'}`,
                color: selectedRally === i ? OE.cream : OE.gray4,
              }}>
              R{i + 1} ({r.length})
            </button>
          ))}
        </div>

        {displayRally && (
          <div style={{
            background: OE.gray2,
            border: '1px solid rgba(255,255,255,0.07)',
            padding: '14px 16px',
            overflowX: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 'max-content' }}>
              {displayRally.map((shot, i) => (
                <React.Fragment key={i}>
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    padding: '6px 8px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 2,
                    minWidth: 60,
                  }}>
                    <div style={{ fontFamily: OE.fontBody, fontSize: 9, letterSpacing: 1, color: shot.playerId === 0 ? OE.p0Color : OE.p1Color, textTransform: 'uppercase' }}>
                      {shot.playerId === 0 ? (p0?.name ?? 'P1') : (p1?.name ?? 'P2')}
                    </div>
                    <PatternTag label={shot.dirLabel} color={DIR_COLORS[shot.dirLabel] ?? OE.gray4} />
                    <div style={{ fontFamily: OE.fontBody, fontSize: 9, letterSpacing: 1, color: DEPTH_COLORS[shot.depthBucket], textTransform: 'uppercase' }}>
                      {shot.depthBucket}
                    </div>
                    <div style={{ fontFamily: OE.fontBody, fontSize: 8, letterSpacing: 1, color: OE.gray4, textTransform: 'uppercase' }}>
                      {shot.shotType}
                    </div>
                    <div style={{ fontFamily: OE.fontBody, fontSize: 8, color: OE.gray4 }}>
                      Q:{Math.round((shot.quality ?? 0) * 100)}%
                    </div>
                  </div>
                  {i < displayRally.length - 1 && (
                    <span style={{ color: OE.gray4, fontSize: 12 }}>→</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

