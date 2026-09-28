import React, { useState, useEffect, useRef, useMemo } from 'react';
import { traceDump, TRACE_ENABLED } from '../../core/trace.js';

// ── Colors ────────────────────────────────────────────────────
const C = {
  bg:      'rgba(3,5,12,0.97)',
  border:  'rgba(255,255,255,0.07)',
  cream:   '#f2ede6',
  gold:    '#c9a84c',
  blue:    '#38bdf8',
  purple:  '#a78bfa',
  green:   '#4ade80',
  red:     '#f87171',
  orange:  '#fb923c',
  gray4:   '#374151',
  gray5:   '#4b5563',
  gray6:   '#6b7280',
  gray7:   '#9ca3af',
  mono:    'ui-monospace, "Cascadia Code", "Fira Code", monospace',
  body:    "'Barlow Condensed','Teko',sans-serif",
  display: "'Teko','Barlow Condensed',sans-serif",
};

const INTENT_COLOR = {
  BUILD: C.blue, PRESSURE: C.orange, FINISH: C.green,
  RESET: C.gray7, APPROACH: C.purple,
};
const BALL_COLOR   = { EASY: C.green, NEUTRAL: C.blue, TOUGH: C.red };
const DIR_COLOR    = { CC: C.green, DTL: C.orange, BODY: C.purple };
const DEPTH_COLOR  = { DEEP: C.green, MID: C.blue, SHORT: C.red };
const END_COLOR    = {
  WINNER: C.green, OUT: C.red, NET: C.orange, FORCED_ERROR: C.orange,
  UNFORCED_ERROR: C.red, DOUBLE_FAULT: C.red, CAMPO_PROPRIO: C.red, UNKNOWN: C.gray6,
};

function Tag({ text, color, small }) {
  return (
    <span style={{
      display: 'inline-block', padding: small ? '0 4px' : '1px 6px',
      borderRadius: 2, fontSize: small ? 7 : 8,
      background: `${color}1a`, border: `1px solid ${color}44`,
      color, fontFamily: C.mono, lineHeight: 1.5, whiteSpace: 'nowrap',
    }}>{text}</span>
  );
}

function KV({ k, v, vColor, mono }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 1.5, alignItems: 'baseline' }}>
      <span style={{ fontSize: 7.5, color: C.gray5, minWidth: 72, flexShrink: 0, fontFamily: C.mono }}>{k}</span>
      <span style={{ fontSize: 7.5, color: vColor || C.gray7, fontFamily: mono ? C.mono : C.body }}>{v}</span>
    </div>
  );
}

// ── CandidatesTable ───────────────────────────────────────────
function CandidatesTable({ top5 }) {
  if (!top5?.length) return null;
  return (
    <div style={{ marginTop: 4, marginBottom: 4 }}>
      <div style={{ fontSize: 7, color: C.gray5, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 3, fontFamily: C.body }}>
        Candidatos avaliados
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 7.5 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.gray4}` }}>
            {['★','Tipo','Dir','Prof','Larg','km/h','EV','S','P','F','R','Tags'].map(h => (
              <th key={h} style={{ color: C.gray5, fontFamily: C.mono, fontWeight: 'normal', textAlign: 'left', padding: '1px 4px 2px', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {top5.map((c, i) => (
            <tr key={i} style={{
              background: c.isChosen ? 'rgba(74,222,128,0.06)' : 'transparent',
              borderLeft: c.isChosen ? `2px solid ${C.green}` : '2px solid transparent',
            }}>
              <td style={{ padding: '1.5px 4px', color: c.isChosen ? C.green : C.gray5, fontFamily: C.mono }}>{c.isChosen ? '★' : `${i+1}`}</td>
              <td style={{ padding: '1.5px 4px', color: C.cream, fontFamily: C.mono, whiteSpace: 'nowrap' }}>{c.shotType}</td>
              <td style={{ padding: '1.5px 4px' }}><Tag text={c.dir} color={DIR_COLOR[c.dir] ?? C.gray6} small /></td>
              <td style={{ padding: '1.5px 4px' }}><Tag text={c.depth} color={DEPTH_COLOR[c.depth] ?? C.gray6} small /></td>
              <td style={{ padding: '1.5px 4px', color: C.gray7, fontFamily: C.mono }}>{c.width}</td>
              <td style={{ padding: '1.5px 4px', color: C.gray7, fontFamily: C.mono }}>{c.power}</td>
              <td style={{ padding: '1.5px 4px', color: c.isChosen ? C.green : C.gray7, fontFamily: C.mono, fontWeight: c.isChosen ? 700 : 'normal' }}>{c.ev.toFixed(3)}</td>
              <td style={{ padding: '1.5px 4px', color: C.blue,   fontFamily: C.mono }}>{c.safety.toFixed(2)}</td>
              <td style={{ padding: '1.5px 4px', color: C.orange, fontFamily: C.mono }}>{c.pressure.toFixed(2)}</td>
              <td style={{ padding: '1.5px 4px', color: C.green,  fontFamily: C.mono }}>{c.finish.toFixed(2)}</td>
              <td style={{ padding: '1.5px 4px', color: C.purple, fontFamily: C.mono }}>{c.rhythm.toFixed(2)}</td>
              <td style={{ padding: '1.5px 4px', color: C.gray5, fontFamily: C.mono, fontSize: 6.5 }}>{c.tags?.join(',') || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── ShotBlock ──────────────────────────────────────────────────
function ShotBlock({ shot, idx }) {
  const [open, setOpen] = useState(false);
  const isServe = shot.rallyIndex === 0;
  const ballColor = BALL_COLOR[shot.ballLabel?.split('+')[0]] ?? C.gray6;
  const hasBounce = !!shot.bounce;
  return (
    <div style={{
      marginBottom: 3, borderRadius: 3, overflow: 'hidden',
      border: `1px solid rgba(255,255,255,0.04)`,
      background: 'rgba(255,255,255,0.015)',
    }}>
      {/* Row header */}
      <div onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 5, padding: '4px 7px',
        cursor: 'pointer', userSelect: 'none', background: 'rgba(255,255,255,0.01)',
      }}>
        <span style={{ fontSize: 7.5, fontFamily: C.mono, color: isServe ? C.blue : C.purple, minWidth: 14 }}>
          {isServe ? '🎾' : `${shot.rallyIndex + 1}`}
        </span>
        <span style={{ fontSize: 8, color: C.cream, fontFamily: C.mono, minWidth: 70 }}>{shot.shotType}</span>
        <Tag text={shot.ballLabel?.split('+')[0]} color={ballColor} small />
        {shot.target && <Tag text={shot.target.dir} color={DIR_COLOR[shot.target.dir] ?? C.gray6} small />}
        {shot.target && <Tag text={shot.target.depth} color={DEPTH_COLOR[shot.target.depth] ?? C.gray6} small />}
        <Tag text={shot.intent} color={INTENT_COLOR[shot.intent] ?? C.gray6} small />
        {shot.courtIdentity?.favoritePlayHit && <Tag text="JOGADA" color={C.orange} small />}
        {shot.courtIdentity?.instinctTriggered && <Tag text="INSTINTO" color={C.blue} small />}
        {shot.courtIdentity?.blindSpotTriggered && <Tag text="PONTO CEGO" color={C.red} small />}
        {shot.coaching?.tacticalFocusHit && <Tag text="BANCO" color={C.green} small />}
        {shot.inControl && <Tag text="CONTROLE" color={C.green} small />}
        {shot.atNet && <Tag text="REDE" color={C.blue} small />}
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 7, color: C.gray5, fontFamily: C.mono }}>
          {shot.hitter.split(' ')[0]}  Q:{(shot.quality * 100).toFixed(0)}%  {shot.power}km/h
          {hasBounce && shot.landErr != null ? `  Δ${shot.landErr}m` : ''}
        </span>
        <span style={{ fontSize: 7, color: C.gray5 }}>{open ? '▾' : '▸'}</span>
      </div>

      {open && (
        <div style={{ padding: '6px 10px 8px', borderTop: `1px solid rgba(255,255,255,0.04)` }}>
          {/* Scenario */}
          <div style={{ fontSize: 7, color: C.gray5, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4, fontFamily: C.body }}>Cenário</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', marginBottom: 8 }}>
            <div>
              <KV k="hitter"    v={shot.hitter} />
              <KV k="receiver"  v={shot.receiver} />
              <KV k="bola"      v={`z:${shot.ballPos?.z}  Q:${(shot.quality*100).toFixed(0)}%`} mono />
              <KV k="situação"  v={shot.ballLabel} vColor={ballColor} />
              {shot.ballReasons?.length > 0 && <KV k="motivo"  v={shot.ballReasons.join(', ')} />}
              <KV k="momentum" v={`${(shot.momentum*100).toFixed(0)}%`} vColor={shot.momentum > 0.65 ? C.orange : C.gray7} mono />
              <KV k="stamina"  v={`${shot.stamina}%`} vColor={shot.stamina < 40 ? C.red : shot.stamina < 65 ? C.orange : C.green} mono />
            </div>
            <div>
              <KV k="minha pos"  v={`x:${shot.hitterPos?.x}  y:${shot.hitterPos?.y}`} mono />
              <KV k="opp pos"    v={`x:${shot.oppPos?.x}  y:${shot.oppPos?.y}`} mono />
              <KV k="opp lat"    v={shot.oppLateral} />
              <KV k="opp depth"  v={shot.oppDepth} />
              <KV k="open side"  v={shot.openSide} vColor={shot.openSide !== 'NONE' ? C.orange : C.gray5} />
              <KV k="opp out"    v={`${(shot.oppOut * 100).toFixed(0)}%`} vColor={shot.oppOut > 0.4 ? C.orange : C.gray7} mono />
              {shot.oppVeryDeep && <KV k="opp very deep" v="SIM" vColor={C.orange} />}
            </div>
          </div>

          {shot.movement && (
            <>
              <div style={{ fontSize: 7, color: C.gray5, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4, fontFamily: C.body }}>Movimento e leitura</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', marginBottom: 8 }}>
                <div>
                  <KV k="court mode" v={shot.movement.courtMode ?? 'BASE'} />
                  <KV k="arrival" v={shot.movement.arrivalMargin != null ? `${shot.movement.arrivalMargin}s` : '—'} mono vColor={shot.movement.arrivalMargin != null && shot.movement.arrivalMargin < 0 ? C.red : C.gray7} />
                  <KV k="pred cross X" v={shot.movement.predCrossX != null ? `${shot.movement.predCrossX}` : '—'} mono />
                </div>
                <div>
                  <KV k="target hit" v={shot.movement.hitTarget ? `x:${shot.movement.hitTarget.x} y:${shot.movement.hitTarget.y} t:${shot.movement.hitTarget.t}s` : '—'} mono />
                  <KV k="opp ETA" v={shot.movement.opponentETA != null ? `${shot.movement.opponentETA}s` : '—'} mono />
                  <KV k="cooldown" v={`${shot.movement.transitionCooldown ?? 0}`} mono />
                </div>
              </div>
            </>
          )}

          {/* Intent */}
          <div style={{ fontSize: 7, color: C.gray5, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4, fontFamily: C.body }}>Intenção</div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
              <Tag text={shot.intent} color={INTENT_COLOR[shot.intent] ?? C.gray6} />
              {shot.inControl && <Tag text="EM CONTROLE" color={C.green} />}
              <span style={{ fontSize: 7.5, color: C.gray7, fontFamily: C.body }}>
                "{shot.intentReason}"
              </span>
            </div>
          </div>

          {shot.courtIdentity && (shot.courtIdentity.favoritePlayHit || shot.courtIdentity.instinctTriggered || shot.courtIdentity.blindSpotTriggered) && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 7, color: C.gray5, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4, fontFamily: C.body }}>Marca em Quadra</div>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                {shot.courtIdentity.favoritePlayHit && <Tag text={`jogada:${shot.courtIdentity.favoritePlayHit}`} color={C.orange} />}
                {shot.courtIdentity.instinctTriggered && <Tag text={`instinto:${shot.courtIdentity.instinctTriggered}`} color={C.blue} />}
                {shot.courtIdentity.blindSpotTriggered && <Tag text={`ponto cego:${shot.courtIdentity.blindSpotTriggered}`} color={C.red} />}
              </div>
            </div>
          )}

          {shot.coaching && (shot.coaching.tacticalFocusHit || shot.coaching.frictionPenalty || shot.coaching.planInfluence) && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 7, color: C.gray5, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4, fontFamily: C.body }}>Banco Vivo</div>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                {shot.coaching.tacticalFocusHit && <Tag text={`foco:${shot.coaching.tacticalFocusHit}`} color={C.green} />}
                {shot.coaching.planInfluence && <Tag text={`plano:${shot.coaching.planInfluence}`} color={C.blue} />}
                {shot.coaching.frictionPenalty > 0 && <Tag text={`atrito:-${shot.coaching.frictionPenalty}`} color={C.red} />}
              </div>
            </div>
          )}

          {/* Candidates */}
          <CandidatesTable top5={shot.top5} />

          {/* Decision */}
          <div style={{ fontSize: 7, color: C.gray5, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4, fontFamily: C.body }}>Decisão final</div>
          <div style={{
            padding: '6px 8px', background: 'rgba(74,222,128,0.04)',
            border: '1px solid rgba(74,222,128,0.15)', borderRadius: 2, marginBottom: 8,
          }}>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 3 }}>
              <span style={{ fontSize: 8, color: C.cream, fontFamily: C.mono, fontWeight: 700 }}>{shot.shotType}</span>
              {shot.target && <>
                <Tag text={shot.target.dir} color={DIR_COLOR[shot.target.dir] ?? C.gray6} />
                <Tag text={shot.target.depth} color={DEPTH_COLOR[shot.target.depth] ?? C.gray6} />
                <Tag text={shot.target.width} color={C.gray6} />
              </>}
              <span style={{ fontSize: 8, color: C.gray7, fontFamily: C.mono }}>
                alvo x:{shot.target?.x}  y:{shot.target?.y}  {shot.power}km/h
              </span>
            </div>
            {shot.whyChosen && (
              <div style={{ fontSize: 7.5, color: C.green, fontFamily: C.body }}>
                💡 "{shot.whyChosen}"
              </div>
            )}
          </div>

          {/* Outcome */}
          <div style={{ fontSize: 7, color: C.gray5, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4, fontFamily: C.body }}>Resultado</div>
          {shot.bounce ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <KV k="quique" v={`x:${shot.bounce.x}  y:${shot.bounce.y}`} mono />
              {shot.landErr != null && <KV k="erro" v={`${shot.landErr}m`} vColor={shot.landErr > 1.5 ? C.red : shot.landErr > 0.8 ? C.orange : C.green} mono />}
              {shot.outcome && <Tag text={shot.outcome} color={END_COLOR[shot.outcome] ?? C.gray6} />}
            </div>
          ) : (
            <span style={{ fontSize: 7.5, color: C.gray5, fontFamily: C.body }}>sem quique registrado (erro na rede / fora)</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── PointBlock ─────────────────────────────────────────────────
function PointBlock({ pt, idx, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);
  const endColor = END_COLOR[pt.endReason] ?? C.gray6;
  const sm = pt.summary;

  const copyPoint = () => {
    // Build a simple text version of this point
    const lines = [`PONTO #${pt.pointId} | Set ${pt.set} | Game ${pt.game} | ${pt.score} | Servidor: ${pt.server}`];
    for (const s of pt.shots ?? []) {
      lines.push(`  Bola ${s.rallyIndex+1}: ${s.hitter} — ${s.shotType} ${s.intent} → ${s.target?.dir}/${s.target?.depth} alvo(${s.target?.x},${s.target?.y}) Q:${(s.quality*100).toFixed(0)}%`);
      if (s.whyChosen) lines.push(`    Motivo: "${s.whyChosen}"`);
      if (s.bounce) lines.push(`    Quique: (${s.bounce.x},${s.bounce.y}) erro:${s.landErr}m`);
    }
    lines.push(`FIM: ${pt.endReason} — ${pt.winner} | Rally:${pt.rally}`);
    if (sm) lines.push(`Resumo: CC:${sm.ccPct}% DTL:${sm.dtlPct}% DEEP:${sm.deepPct}% MID:${sm.midPct}% SHORT:${sm.shortPct}%`);
    navigator.clipboard.writeText(lines.join('\n')).then(() => { setCopied(true); setTimeout(()=>setCopied(false),1800); });
  };

  return (
    <div style={{
      marginBottom: 4, borderRadius: 4, overflow: 'hidden',
      border: `1px solid ${pt.endReason ? 'rgba(255,255,255,0.06)' : 'rgba(251,191,36,0.3)'}`,
      background: pt.endReason ? 'rgba(5,8,16,0.4)' : 'rgba(251,191,36,0.03)',
    }}>
      {/* Header */}
      <div onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px',
        cursor: 'pointer', userSelect: 'none', background: 'rgba(255,255,255,0.015)',
      }}>
        {!pt.endReason && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fbbf24', flexShrink: 0, boxShadow: '0 0 5px #fbbf24', display:'inline-block' }}/>}
        <span style={{ fontSize: 8, fontFamily: C.mono, color: C.gold, minWidth: 26 }}>#{pt.pointId}</span>
        <span style={{ fontSize: 7.5, color: C.gray7, fontFamily: C.mono, flexShrink: 0 }}>
          S{pt.set} G{pt.game} {pt.score}
        </span>
        <span style={{ fontSize: 7.5, color: C.gray6, fontFamily: C.body, flexShrink: 0 }}>
          Srv:{pt.server?.split(' ')[0]}
        </span>

        {pt.endReason && (
          <Tag text={pt.endReason} color={endColor} small />
        )}
        <span style={{ flex: 1 }} />

        {/* Summary chips */}
        {sm && open && <>
          <Tag text={`CC:${sm.ccPct}%`}  color={DIR_COLOR.CC}  small />
          <Tag text={`DTL:${sm.dtlPct}%`} color={DIR_COLOR.DTL} small />
          <Tag text={`D:${sm.deepPct}%`} color={DEPTH_COLOR.DEEP} small />
        </>}
        <span style={{ fontSize: 7, color: C.gray5, fontFamily: C.mono, flexShrink: 0 }}>
          R:{pt.rally} B:{pt.shots?.length ?? 0}
        </span>
        {pt.endReason && (
          <button onClick={e => { e.stopPropagation(); copyPoint(); }} style={{
            background: copied ? 'rgba(0,230,118,0.12)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${copied ? 'rgba(0,230,118,0.35)' : C.border}`,
            borderRadius: 3, color: copied ? '#00e676' : C.gray5,
            fontSize: 7, padding: '1px 5px', cursor: 'pointer', flexShrink: 0,
          }}>{copied ? '✓' : '⎘'}</button>
        )}
        <span style={{ fontSize: 8, color: C.gray5 }}>{open ? '▾' : '▸'}</span>
      </div>

      {open && (
        <div style={{ padding: '5px 8px 8px', borderTop: `1px solid rgba(255,255,255,0.04)` }}>

          {/* Heat + Rating snapshot */}
          {(pt.heatAtEnd != null || pt.ratingsAtEnd?.length > 0) && (() => {
            const hDelta = pt.heatDelta != null
              ? (pt.heatDelta >= 0 ? `+${pt.heatDelta.toFixed(1)}` : pt.heatDelta.toFixed(1))
              : null;
            const HEAT_COLOR = n =>
              n >= 94 ? '#FFD700' : n >= 85 ? '#FF8C00' : n >= 75 ? '#FF5533' :
              n >= 62 ? '#FF9944' : n >= 48 ? '#e8c84a' : n >= 35 ? '#7ab4ff' : '#4A7A9B';
            const RATING_COLOR = s =>
              s >= 9.0 ? '#FFD700' : s >= 7.5 ? '#60FF90' : s >= 6.0 ? '#80C8FF' :
              s >= 4.5 ? '#FFB060' : '#FF6060';
            const rEnd   = pt.ratingsAtEnd   ?? [];
            const rStart = pt.ratingsAtStart ?? [];
            return (
              <div style={{
                display: 'flex', gap: 6, alignItems: 'stretch', marginBottom: 5,
                padding: '5px 7px', borderRadius: 3,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}>
                {/* Match Heat */}
                {pt.heatAtEnd != null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingRight: 8, borderRight: '1px solid rgba(255,255,255,0.07)' }}>
                    <span style={{ fontSize: 6.5, color: 'rgba(255,255,255,0.25)', fontFamily: C.mono, letterSpacing: 1, textTransform: 'uppercase' }}>HEAT</span>
                    <span style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.35)', fontFamily: C.mono }}>{pt.heatAtStart ?? '?'}</span>
                    <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)' }}>→</span>
                    <span style={{ fontSize: 10, fontWeight: 700, fontFamily: C.mono, color: HEAT_COLOR(pt.heatAtEnd) }}>
                      {pt.heatAtEnd}
                    </span>
                    {hDelta && (
                      <span style={{ fontSize: 7.5, fontFamily: C.mono, color: pt.heatDelta >= 0 ? '#60FF90' : '#FF6060' }}>
                        ({hDelta})
                      </span>
                    )}
                    <span style={{ fontSize: 6.5, color: HEAT_COLOR(pt.heatAtEnd), fontFamily: C.mono, letterSpacing: 0.5 }}>
                      {pt.heatTier}
                    </span>
                    {pt.heatPeak != null && (
                      <span style={{ fontSize: 6, color: 'rgba(255,255,255,0.2)', fontFamily: C.mono }}>pk:{pt.heatPeak}</span>
                    )}
                  </div>
                )}

                {/* Ratings */}
                {rEnd.map((r, i) => {
                  const rS = rStart[i];
                  const delta = rS != null ? +(r.score - rS.score).toFixed(1) : null;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 6.5, color: 'rgba(255,255,255,0.25)', fontFamily: C.mono, letterSpacing: 1, textTransform: 'uppercase' }}>
                        P{i}
                      </span>
                      {rS && (
                        <span style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.30)', fontFamily: C.mono }}>{rS.score}</span>
                      )}
                      {rS && <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)' }}>→</span>}
                      <span style={{ fontSize: 10, fontWeight: 700, fontFamily: C.mono, color: RATING_COLOR(r.score) }}>
                        {r.score}
                      </span>
                      {delta !== null && delta !== 0 && (
                        <span style={{ fontSize: 7, fontFamily: C.mono, color: delta > 0 ? '#60FF90' : '#FF6060' }}>
                          ({delta > 0 ? '+' : ''}{delta})
                        </span>
                      )}
                      <span style={{ fontSize: 6, color: RATING_COLOR(r.score), fontFamily: C.mono, letterSpacing: 0.3 }}>
                        {r.tier}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Shots */}
          {(pt.shots ?? []).map((s, i) => <ShotBlock key={i} shot={s} idx={i} />)}

          {/* End */}
          {pt.endReason && (
            <div style={{
              display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap',
              padding: '6px 8px', marginTop: 4,
              background: `${endColor}0d`, border: `1px solid ${endColor}33`,
              borderRadius: 2,
            }}>
              <Tag text={pt.endReason} color={endColor} />
              <span style={{ fontSize: 7.5, color: C.gray7, fontFamily: C.body }}>
                {pt.endDetail}
              </span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 7.5, color: C.cream, fontFamily: C.mono }}>
                {pt.winner} venceu
              </span>
            </div>
          )}

          {/* Summary */}
          {sm && (
            <div style={{ marginTop: 6, padding: '6px 8px', background: 'rgba(255,255,255,0.015)', borderRadius: 2 }}>
              <div style={{ fontSize: 7, color: C.gray5, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 5, fontFamily: C.body }}>Resumo do ponto</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Tag text={`CC ${sm.ccPct}%`}     color={DIR_COLOR.CC} />
                <Tag text={`DTL ${sm.dtlPct}%`}   color={DIR_COLOR.DTL} />
                <Tag text={`BODY ${sm.bodyPct}%`}  color={DIR_COLOR.BODY} />
                <div style={{ width: 1, background: C.gray4 }}/>
                <Tag text={`FUNDO ${sm.deepPct}%`}  color={DEPTH_COLOR.DEEP} />
                <Tag text={`MÉD ${sm.midPct}%`}     color={DEPTH_COLOR.MID} />
                <Tag text={`CURTO ${sm.shortPct}%`} color={DEPTH_COLOR.SHORT} />
              </div>
              {sm.dominantPattern && (
                <div style={{ marginTop: 4, fontSize: 7.5, color: C.gray7, fontFamily: C.body }}>
                  Padrão dominante: <span style={{ color: C.orange }}>{sm.dominantPattern}</span>
                  {sm.patternBroken && <span style={{ color: C.green }}> ⚡ quebrado</span>}
                </div>
              )}
              {sm.hadApproach && (
                <div style={{ marginTop: 2, fontSize: 7.5, color: C.purple, fontFamily: C.body }}>↑ Tentativa de subida à rede</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ── Main panel ─────────────────────────────────────────────────
export default function TracePanel({ gsRef }) {
  const [visible,    setVisible]    = useState(false);
  const [points,     setPoints]     = useState([]);
  const [liveText,   setLiveText]   = useState(null);
  const [tab,        setTab]        = useState('trace');
  const [copyAll,    setCopyAll]    = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const timerRef  = useRef(null);
  const scrollRef = useRef(null);

  // Keyboard shortcut T to toggle
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 't' || e.key === 'T') {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        setVisible(v => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!visible) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      const gs = gsRef.current;
      if (!gs?.trace) return;
      const pts = gs.trace.points ?? [];
      // Add current in-progress point if it has shots
      const curr = gs.trace._current;
      if (curr?.shots?.length > 0) {
        setPoints([...pts, curr]);
      } else {
        setPoints(pts);
      }
    }, 200);
    return () => clearInterval(timerRef.current);
  }, [visible, gsRef]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && scrollRef.current && visible) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [points, autoScroll, visible]);

  const handleCopyAll = () => {
    const gs = gsRef.current;
    if (!gs) return;
    const text = traceDump(gs);
    navigator.clipboard.writeText(text).then(() => { setCopyAll(true); setTimeout(()=>setCopyAll(false),1800); });
  };

  const handleDumpConsole = () => {
    const gs = gsRef.current;
    if (!gs) return;
    console.log(traceDump(gs));
    alert('Trace copiado para o console (F12)');
  };

  const completedCount = points.filter(p => p.endReason).length;

  return (
    <>
      {/* Toggle button */}
      <button onClick={() => setVisible(v => !v)} style={{
        position: 'fixed', bottom: 90, left: 14, zIndex: 300,
        background: visible ? 'rgba(201,168,76,0.14)' : 'rgba(5,10,20,0.82)',
        border: `1px solid ${visible ? 'rgba(201,168,76,0.48)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 6, color: visible ? C.gold : 'rgba(255,255,255,0.32)',
        fontSize: 9, fontFamily: C.mono, letterSpacing: 1.5,
        padding: '4px 9px', cursor: 'pointer', backdropFilter: 'blur(10px)',
        userSelect: 'none',
      }} title="Tecla T para abrir/fechar">
        🧠 TRACE{completedCount > 0 ? ` (${completedCount})` : ''}
      </button>

      {visible && (
        <div style={{
          position: 'fixed', bottom: 128, left: 14, zIndex: 400,
          width: 580, maxHeight: '72vh',
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: 10, backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 48px rgba(0,0,0,0.75)',
          display: 'flex', flexDirection: 'column',
          fontFamily: C.mono, overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px',
            borderBottom: `1px solid rgba(255,255,255,0.06)`,
            background: 'rgba(201,168,76,0.03)', flexShrink: 0,
          }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: C.gold, flex: 1 }}>
              🧠 LOG MATADOR — decisões da IA
            </span>
            <span style={{ fontSize: 7, color: C.gray5 }}>{completedCount} pontos  ·  tecla T</span>
            <button onClick={handleCopyAll} style={{
              background: copyAll ? 'rgba(0,230,118,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${copyAll ? 'rgba(0,230,118,0.35)' : C.border}`,
              borderRadius: 4, color: copyAll ? '#00e676' : C.gray6,
              fontSize: 7.5, padding: '2px 7px', cursor: 'pointer', letterSpacing: 1,
            }}>{copyAll ? '✓ COPIADO' : '⎘ COPIAR'}</button>
            <button onClick={handleDumpConsole} style={{
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
              borderRadius: 4, color: C.gray6,
              fontSize: 7.5, padding: '2px 7px', cursor: 'pointer', letterSpacing: 1,
            }}>📋 CONSOLE</button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: `1px solid rgba(255,255,255,0.05)`, flexShrink: 0 }}>
            {[['trace','🧠 PONTOS'],['guide','📖 LEGENDA']].map(([id,lbl]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                flex: 1, padding: '5px 0', fontSize: 8, letterSpacing: 1.5,
                background: tab===id ? 'rgba(201,168,76,0.07)' : 'transparent',
                border: 'none', borderBottom: tab===id ? `2px solid ${C.gold}` : '2px solid transparent',
                color: tab===id ? C.gold : C.gray5, cursor: 'pointer',
              }}>{lbl}</button>
            ))}
            <label style={{ display:'flex', alignItems:'center', gap:4, cursor:'pointer', padding: '0 10px', fontSize: 7, color: C.gray5, letterSpacing: 1 }}>
              <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)}
                style={{ width: 10, height: 10, accentColor: C.gold }} />
              AUTO
            </label>
          </div>

          {/* Content */}
          <div ref={scrollRef} style={{
            flex: 1, overflowY: 'auto', padding: '5px 5px',
            scrollbarWidth: 'thin', scrollbarColor: `rgba(201,168,76,0.12) transparent`,
          }}>
            {tab === 'trace' ? (
              points.length === 0 ? (
                <div style={{ padding: 20, fontSize: 9, color: C.gray5, textAlign: 'center', letterSpacing: 1 }}>
                  aguardando primeiro ponto…
                </div>
              ) : (
                points.map((pt, i) => (
                  <PointBlock
                    key={pt.pointId ?? i}
                    pt={pt}
                    idx={i}
                    defaultOpen={i === points.length - 1}
                  />
                ))
              )
            ) : (
              <div style={{ padding: '8px 10px', fontSize: 8, lineHeight: 1.8, color: C.gray7 }}>
                <div style={{ fontSize: 9, color: C.gold, marginBottom: 8, letterSpacing: 2 }}>ESTRUTURA DO TRACE</div>
                <div><span style={{ color: C.cream }}>Bola (situação)</span> — EASY / NEUTRAL / TOUGH (+PRESSURE)</div>
                <div><span style={{ color: C.cream }}>Intenção</span> — <span style={{ color: C.blue }}>BUILD</span> construção / <span style={{ color: C.orange }}>PRESSURE</span> pressionar / <span style={{ color: C.green }}>FINISH</span> winner / <span style={{ color: C.gray7 }}>RESET</span> defender / <span style={{ color: C.purple }}>APPROACH</span> subir</div>
                <div><span style={{ color: C.cream }}>Candidatos (★ = escolhido)</span></div>
                <div style={{ paddingLeft: 10 }}>S = segurança · P = pressão · F = finalização · R = ritmo</div>
                <div><span style={{ color: C.cream }}>Direção</span> — <span style={{ color: C.green }}>CC</span> cross-court / <span style={{ color: C.orange }}>DTL</span> down-line / <span style={{ color: C.purple }}>BODY</span> no corpo</div>
                <div><span style={{ color: C.cream }}>Profundidade</span> — <span style={{ color: C.green }}>DEEP</span> fundo / <span style={{ color: C.blue }}>MID</span> meio / <span style={{ color: C.red }}>SHORT</span> curto</div>
                <div><span style={{ color: C.cream }}>Erro (Δ)</span> — distância entre alvo da IA e quique real (metros)</div>
                <div style={{ marginTop: 8, color: C.gray5, fontSize: 7 }}>Tecla T · ⎘ copia texto · CONSOLE imprime no F12</div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

