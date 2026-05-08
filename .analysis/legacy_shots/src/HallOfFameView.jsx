// ════════════════════════════════════════════════════════════════════
// 🏛️ HALL OF FAME VIEW
// ════════════════════════════════════════════════════════════════════
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { overallRating, getPlayerPhoto } from './players.js';
import { computeHOFData, buildPlayerTimeline, GRAND_SLAM_INFO, GRAND_SLAM_IDS } from './HallOfFame.js';

// ── Design tokens (alinhados com BroadcastUniverse) ─────────────────
const T = {
  bg:       '#06080A', bgDeep: '#040608', bgMid: '#0A0E0F',
  bgPanel:  '#0F1518', bgCard: '#141C20', bgHover: '#1B2830',
  gold:     '#E8C84A', goldDim: 'rgba(232,200,74,.55)', goldFaint: 'rgba(232,200,74,.12)',
  platinum: '#C8D8E0', platDim: 'rgba(200,216,224,.6)',
  white:    '#F2EDE4', dim: 'rgba(242,237,228,.58)', faint: 'rgba(242,237,228,.28)', ghost: 'rgba(242,237,228,.08)',
  border:   'rgba(242,237,228,.07)', borderMid: 'rgba(242,237,228,.14)',
  disp:     "'Bebas Neue', sans-serif",
  cond:     "'Barlow Condensed', sans-serif",
  body:     "'Barlow', sans-serif",
  mono:     "'Space Mono', monospace",
};

// ── CSS injection ────────────────────────────────────────────────────
function injectHOFStyles() {
  if (document.getElementById('hof-styles')) return;
  const css = `
    @keyframes hof-in      { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
    @keyframes hof-rise    { from{opacity:0;transform:translateX(-16px)} to{opacity:1;transform:translateX(0)} }
    @keyframes hof-glow    { 0%,100%{opacity:.5} 50%{opacity:1} }
    @keyframes hof-shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
    @keyframes hof-pulse   { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
    @keyframes hof-beam    { from{transform:scaleX(0);opacity:0} to{transform:scaleX(1);opacity:1} }
    @keyframes hof-timeline-draw { from{height:0;opacity:0} to{height:100%;opacity:1} }
    @keyframes hof-mega    { 0%{transform:scale(.92);opacity:0} 60%{transform:scale(1.04)} 100%{transform:scale(1);opacity:1} }

    .hof-card {
      background: #0F1518;
      border: 1px solid rgba(242,237,228,.07);
      border-radius: 4px;
      cursor: pointer;
      transition: all .2s;
      position: relative;
      overflow: hidden;
      animation: hof-in .4s ease both;
    }
    .hof-card:hover {
      border-color: rgba(232,200,74,.3);
      background: #141C20;
      transform: translateY(-2px);
    }
    .hof-card.goat {
      border-color: rgba(232,200,74,.5);
      background: linear-gradient(135deg, #141C20 60%, #1A2010 100%);
    }
    .hof-card.goat::before {
      content: '';
      position: absolute; top:0; left:0; right:0; height:2px;
      background: linear-gradient(90deg, transparent, #E8C84A, transparent);
      animation: hof-glow 2.5s ease-in-out infinite;
    }

    .hof-timeline-node {
      position: relative;
      padding: 0 0 32px 52px;
      animation: hof-rise .35s ease both;
    }
    .hof-timeline-node::before {
      content: '';
      position: absolute; left: 19px; top: 32px; bottom: 0; width: 1px;
      background: rgba(242,237,228,.08);
    }
    .hof-timeline-node:last-child::before { display: none; }

    .hof-node-dot {
      position: absolute; left: 8px; top: 6px;
      width: 24px; height: 24px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700;
      border: 1.5px solid; transition: all .2s;
    }
    .hof-node-dot.highlight {
      box-shadow: 0 0 14px currentColor;
    }
    .hof-node-dot.mega {
      width: 32px; height: 32px; left: 4px; top: 2px;
      font-size: 16px;
      box-shadow: 0 0 24px currentColor, 0 0 48px currentColor;
      animation: hof-pulse 1.8s ease-in-out infinite;
    }

    .hof-slam-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 3px 10px; border-radius: 2px;
      font-family: 'Space Mono', monospace; font-size: 8px;
      font-weight: 700; letter-spacing: .15em; text-transform: uppercase;
      border: 1px solid; white-space: nowrap;
    }

    .hof-gs-trophy {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      transition: all .2s;
    }
    .hof-gs-trophy:hover { transform: translateY(-3px); }

    .hof-mega-event {
      animation: hof-mega .5s cubic-bezier(.34,1.56,.64,1) both;
    }

    .hof-score-bar {
      height: 3px; border-radius: 1px;
      transform-origin: left;
      animation: hof-beam .6s ease both;
    }

    .hof-back-btn {
      background: transparent; border: 1px solid rgba(242,237,228,.14);
      color: rgba(242,237,228,.6); cursor: pointer;
      font-family: 'Space Mono', monospace; font-size: 9px;
      letter-spacing: .2em; padding: 8px 16px; border-radius: 2px;
      transition: all .15s;
    }
    .hof-back-btn:hover { border-color: rgba(242,237,228,.4); color: #F2EDE4; }

    .hof-goat-crown {
      position: absolute; top: -2px; right: 12px;
      font-size: 18px;
      animation: hof-glow 2s ease-in-out infinite;
      filter: drop-shadow(0 0 8px rgba(232,200,74,.8));
    }

    .hof-name-shimmer {
      background: linear-gradient(120deg, #E8C84A 0%, #fff8e1 40%, #E8C84A 60%, #C8A820 100%);
      background-size: 200% auto;
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: hof-shimmer 3s linear infinite;
    }

    .hof-empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 16px; padding: 80px 24px; text-align: center;
    }
  `;
  const el = document.createElement('style');
  el.id = 'hof-styles';
  el.textContent = css;
  document.head.appendChild(el);
}

// ── Helpers ──────────────────────────────────────────────────────────
function PlayerFace({ player, size = 80, borderColor }) {
  const photo = getPlayerPhoto(player?.namedPlayerKey || player);
  const [imgOk, setImgOk] = useState(!!photo);
  const bc = borderColor || (player?.color ? `${player.color}66` : 'rgba(255,255,255,.15)');
  const initials = player?.name?.slice(0, 2)?.toUpperCase() ?? '?';
  const sty = { width: size, height: size, borderRadius: '50%', overflow: 'hidden',
    border: `2px solid ${bc}`, background: player?.color || '#1a2a1a', flexShrink: 0 };
  if (photo && imgOk) return (
    <div style={sty}>
      <img src={photo} alt={player?.name} onError={() => setImgOk(false)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
    </div>
  );
  return (
    <div style={{ ...sty, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: T.disp, fontSize: size * 0.38, color: '#fff' }}>{initials}</div>
  );
}

// ── GS Trophies row ─────────────────────────────────────────────────
function GSTrophyRow({ gsWon, size = 'md' }) {
  const s = size === 'sm' ? 28 : 38;
  return (
    <div style={{ display: 'flex', gap: size === 'sm' ? 4 : 8 }}>
      {GRAND_SLAM_IDS.map(gsId => {
        const info = GRAND_SLAM_INFO[gsId];
        const won  = gsWon.includes?.(gsId) || gsWon.has?.(gsId);
        return (
          <div key={gsId} className="hof-gs-trophy" title={`${info.name} (${info.label})`}>
            <div style={{
              width: s, height: s, borderRadius: 3,
              background: won ? info.color : 'rgba(255,255,255,.04)',
              border: `1.5px solid ${won ? info.color : 'rgba(255,255,255,.08)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: s * 0.45, opacity: won ? 1 : 0.25,
              boxShadow: won ? `0 0 12px ${info.glow}` : 'none',
            }}>
              {info.icon}
            </div>
            {size !== 'sm' && (
              <div style={{ fontFamily: T.mono, fontSize: 6, color: won ? info.light : T.faint,
                letterSpacing: '.1em', textAlign: 'center', textTransform: 'uppercase' }}>
                {info.label}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── GOAT Score breakdown mini ────────────────────────────────────────
function GOATScoreBar({ score, rank }) {
  const max = 800;
  const pct = Math.min(score.total / max, 1);
  const color = rank === 0 ? T.gold : rank === 1 ? T.platinum : T.dim;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 3, background: T.ghost, borderRadius: 1, overflow: 'hidden' }}>
        <div className="hof-score-bar"
          style={{ height: '100%', width: `${pct * 100}%`, background: color, borderRadius: 1 }} />
      </div>
      <div style={{ fontFamily: T.mono, fontSize: 9, color, minWidth: 36, textAlign: 'right' }}>
        {Math.round(score.total)}
      </div>
    </div>
  );
}

// ── Card individual do Hall ──────────────────────────────────────────
function HOFCard({ stats, rank, onClick, delay = 0 }) {
  const isGOAT = rank === 0;
  const p      = stats.player;

  const medals = ['🥇', '🥈', '🥉'];
  const rankLabel = rank < 3 ? medals[rank] : `#${rank + 1}`;

  return (
    <div className={`hof-card${isGOAT ? ' goat' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
      onClick={onClick}>
      {isGOAT && <div className="hof-goat-crown">👑</div>}

      {/* Header: foto + nome */}
      <div style={{ display: 'flex', gap: 12, padding: '16px 16px 12px' }}>
        <div style={{ position: 'relative' }}>
          <PlayerFace player={p} size={64}
            borderColor={isGOAT ? T.gold : stats.careerSlam ? '#52AA6A' : undefined} />
          {stats.careerSlam && (
            <div style={{
              position: 'absolute', bottom: -2, right: -2,
              width: 18, height: 18, borderRadius: '50%',
              background: '#FFD700', border: '1.5px solid #06080A',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9,
            }}>🏆</div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontFamily: T.mono, fontSize: 8, color: isGOAT ? T.gold : T.dim }}>{rankLabel}</span>
            {stats.isRetired && (
              <span style={{ fontFamily: T.mono, fontSize: 7, color: T.faint, letterSpacing: '.1em' }}>RET.</span>
            )}
          </div>
          <div style={{
            fontFamily: T.disp, fontSize: 18, letterSpacing: '.04em', lineHeight: 1,
            color: isGOAT ? undefined : T.white, marginBottom: 3,
            ...(isGOAT ? {} : {}),
          }}>
            <span className={isGOAT ? 'hof-name-shimmer' : ''}
              style={isGOAT ? {} : { color: T.white }}>
              {stats.name}
            </span>
          </div>
          <div style={{ fontFamily: T.mono, fontSize: 8, color: T.faint, letterSpacing: '.12em' }}>
            {stats.nationality}
            {stats.styleId ? ` · ${stats.styleId}` : ''}
          </div>
        </div>
      </div>

      {/* GS trophies */}
      <div style={{ padding: '0 16px 12px', borderBottom: `1px solid ${T.border}` }}>
        <GSTrophyRow gsWon={stats.gsWon} size="md" />
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: T.border }}>
        {[
          { label: 'Grand Slams', value: stats.gs, highlight: true },
          { label: 'Masters',     value: stats.masters },
          { label: 'Títulos',     value: stats.totalTitles },
        ].map(({ label, value, highlight }) => (
          <div key={label} style={{
            background: T.bgCard, padding: '10px 12px', textAlign: 'center',
          }}>
            <div style={{
              fontFamily: T.disp, fontSize: highlight ? 22 : 18,
              color: highlight ? (isGOAT ? T.gold : T.white) : T.dim,
              letterSpacing: '.04em',
            }}>{value}</div>
            <div style={{ fontFamily: T.mono, fontSize: 7, color: T.faint, letterSpacing: '.12em',
              textTransform: 'uppercase', marginTop: 1 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* GOAT score bar */}
      <div style={{ padding: '10px 16px 12px' }}>
        <div style={{ fontFamily: T.mono, fontSize: 7, color: T.faint, letterSpacing: '.16em',
          textTransform: 'uppercase', marginBottom: 5 }}>GOAT SCORE</div>
        <GOATScoreBar score={stats.goatScore} rank={rank} />
        <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
          {stats.careerSlam && (
            <span style={{ fontFamily: T.mono, fontSize: 7, color: '#52AA6A',
              background: 'rgba(82,170,106,.12)', border: '1px solid rgba(82,170,106,.25)',
              padding: '2px 6px', borderRadius: 2, letterSpacing: '.1em' }}>
              CAREER SLAM
            </span>
          )}
          {stats.top10Months >= 48 && (
            <span style={{ fontFamily: T.mono, fontSize: 7, color: T.goldDim,
              background: T.goldFaint, border: `1px solid rgba(232,200,74,.2)`,
              padding: '2px 6px', borderRadius: 2, letterSpacing: '.1em' }}>
              {stats.top10Months}M TOP10
            </span>
          )}
          {(stats.yearsAsNo1?.length ?? 0) > 0 && (
            <span style={{ fontFamily: T.mono, fontSize: 7, color: 'rgba(255,220,120,.7)',
              background: 'rgba(255,220,120,.08)', border: '1px solid rgba(255,220,120,.15)',
              padding: '2px 6px', borderRadius: 2, letterSpacing: '.1em' }}>
              Nº1 {stats.yearsAsNo1.length}× ANO
            </span>
          )}
          {/* FASE 3: superfície dominante — exibe se jogador tem identidade de superfície definida */}
          {stats.player?.surfaceIdentity && (() => {
            const sid = stats.player.surfaceIdentity;
            const SURF_COLOR_HOF = { CLAY:'#C4572A', GRASS:'#2ECC71', HARD:'#4A90D9', INDOOR:'#C84FEB' };
            const SURF_ICON_HOF  = { CLAY:'🏺', GRASS:'🌿', HARD:'🏙️', INDOOR:'🏟️' };
            const color = SURF_COLOR_HOF[sid.surface] ?? T.goldDim;
            return (
              <span style={{ fontFamily: T.mono, fontSize: 7, color,
                background: `${color}15`, border: `1px solid ${color}35`,
                padding: '2px 6px', borderRadius: 2, letterSpacing: '.1em' }}>
                {SURF_ICON_HOF[sid.surface]} {sid.label?.toUpperCase() ?? sid.surface}
              </span>
            );
          })()}
        </div>
      </div>

      {/* Anos de carreira */}
      <div style={{ padding: '0 16px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: T.mono, fontSize: 8, color: T.faint }}>
          {stats.firstYear && stats.lastYear
            ? `${stats.firstYear} — ${stats.isRetired ? stats.lastYear : 'Ativo'}`
            : '—'}
        </div>
        <div style={{ fontFamily: T.mono, fontSize: 7, color: T.faint, letterSpacing: '.1em' }}>
          VER HISTÓRIA →
        </div>
      </div>
    </div>
  );
}

// ── Timeline node ────────────────────────────────────────────────────
function TimelineNode({ event, idx }) {
  const isMega = !!event.isMega;
  const isHighlight = !!event.isHighlight;

  const dotStyle = {
    background: isMega
      ? `radial-gradient(circle, ${event.color}, rgba(0,0,0,.5))`
      : isHighlight
        ? `${event.color}22`
        : 'rgba(255,255,255,.04)',
    borderColor: event.color,
    color: event.color,
    ...(isMega ? {} : {}),
  };

  const typeLabels = {
    GRAND_SLAM:    'GRAND SLAM', CAREER_SLAM: 'CAREER SLAM', DEBUT: 'ESTREIA',
    RETIREMENT:    'APOSENTADORIA', RIVALRY: 'RIVALIDADE', YEAR_END_NO1: 'Nº1 MUNDIAL',
    GS_FINAL_LOSS: 'VICE GRAND SLAM', MASTERS_1000: 'MASTERS 1000', FINALS: 'ATP FINALS',
    TITLES_MINOR:  'TÍTULOS',
  };

  return (
    <div className="hof-timeline-node" style={{ animationDelay: `${idx * 60}ms` }}>
      <div className={`hof-node-dot ${isHighlight ? 'highlight' : ''} ${isMega ? 'mega' : ''}`}
        style={dotStyle}>
        <span style={{ fontSize: isMega ? 14 : 10 }}>{event.icon}</span>
      </div>

      <div style={{
        background: isMega
          ? `linear-gradient(135deg, rgba(232,200,74,.08), rgba(0,0,0,0))`
          : isHighlight ? `${event.color}08` : 'transparent',
        border: isMega
          ? `1px solid rgba(232,200,74,.2)`
          : isHighlight ? `1px solid ${event.color}18` : 'none',
        borderRadius: 4, padding: isMega ? 16 : 12,
        marginLeft: isMega ? -4 : 0,
        ...(isMega ? { animation: 'hof-mega .5s cubic-bezier(.34,1.56,.64,1) both' } : {}),
      }}>
        {/* Ano */}
        <div style={{ fontFamily: T.mono, fontSize: 8, color: event.color,
          letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 4 }}>
          {event.year}
          {typeLabels[event.type] && (
            <span style={{ marginLeft: 8, color: T.faint }}>· {typeLabels[event.type]}</span>
          )}
        </div>

        {/* Título */}
        <div style={{
          fontFamily: isMega ? T.disp : T.cond,
          fontSize: isMega ? 22 : event.type === 'GRAND_SLAM' ? 17 : 14,
          fontWeight: isMega ? 400 : 700,
          color: isMega ? T.gold : isHighlight ? T.white : T.dim,
          letterSpacing: isMega ? '.08em' : '.02em',
          lineHeight: 1.2, marginBottom: 4,
        }}>
          {event.title}
        </div>

        {/* GS badge se for Slam */}
        {event.type === 'GRAND_SLAM' && (() => {
          const info = GRAND_SLAM_INFO[event.tournamentId];
          if (!info) return null;
          return (
            <div style={{ marginBottom: 6 }}>
              <span className="hof-slam-badge" style={{
                color: info.light, borderColor: `${info.color}40`,
                background: `${info.color}14`,
              }}>
                {info.icon} {info.label.toUpperCase()}
              </span>
            </div>
          );
        })()}

        {/* Subtitle */}
        {event.subtitle && (
          <div style={{ fontFamily: T.body, fontSize: 12, color: T.dim, lineHeight: 1.45, marginBottom: 4 }}>
            {event.subtitle}
          </div>
        )}

        {/* Detail */}
        {event.detail && (
          <div style={{ fontFamily: T.body, fontSize: 11, color: T.faint, fontStyle: 'italic', lineHeight: 1.45 }}>
            {event.detail}
          </div>
        )}

        {/* Rivalry status badge */}
        {event.type === 'RIVALRY' && event.rivalryStatus && (
          <div style={{ marginTop: 6 }}>
            <span className="hof-slam-badge" style={{
              color: event.color, borderColor: `${event.color}40`,
              background: `${event.color}14`,
            }}>
              ⚔️ {event.rivalryStatus}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Vista da timeline de um jogador ─────────────────────────────────
function PlayerTimelineView({ stats, state, onBack }) {
  const { events, epitaph } = useMemo(() => buildPlayerTimeline(stats.id, state), [stats.id, state]);

  useEffect(() => {
    const el = document.querySelector('.hof-timeline-scroll');
    if (el) el.scrollTop = 0;
  }, [stats.id]);

  const p = stats.player;

  const surfLabel  = { HARD: 'Hard', CLAY: 'Saibro', GRASS: 'Grama', INDOOR: 'Indoor' };
  const dominantSurf = Object.entries(stats.surfTitles ?? {}).sort((a,b)=>b[1]-a[1])[0]?.[0];

  const dominantColor = {
    HARD: '#1565C0', CLAY: '#C4572A', GRASS: '#2E7D32', INDOOR: '#6A1B9A',
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', animation: 'hof-in .3s ease' }}>
      {/* Header da timeline */}
      <div style={{
        background: `linear-gradient(135deg, ${T.bgMid} 0%, ${T.bgDeep} 100%)`,
        borderBottom: `1px solid ${T.borderMid}`, padding: '20px 24px 0', flexShrink: 0,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background glow baseado na cor do jogador */}
        <div style={{
          position: 'absolute', top: -60, right: -60, width: 240, height: 240,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${p.color ?? '#1C6B38'}22, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 20 }}>
          <button className="hof-back-btn" onClick={onBack}>← HALL</button>

          <PlayerFace player={p} size={88}
            borderColor={stats.careerSlam ? T.gold : (p.color ?? undefined)} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: T.mono, fontSize: 8, color: T.faint,
              letterSpacing: '.22em', textTransform: 'uppercase', marginBottom: 6 }}>
              {stats.nationality}
              {stats.styleId ? ` · ${stats.styleId}` : ''}
              {stats.isRetired ? ' · APOSENTADO' : ' · ATIVO'}
            </div>
            <div style={{ fontFamily: T.disp, fontSize: 36, letterSpacing: '.06em',
              lineHeight: 1, color: T.white, marginBottom: 8 }}>
              {stats.name}
            </div>

            {/* Epitáfio */}
            {epitaph && (
              <div style={{ fontFamily: T.body, fontSize: 12, color: T.dim, fontStyle: 'italic',
                maxWidth: 500, lineHeight: 1.55, marginBottom: 12 }}>
                "{epitaph}"
              </div>
            )}

            {/* GS trophies */}
            <GSTrophyRow gsWon={stats.gsWon} size="md" />
          </div>

          {/* GOAT badge / rank */}
        </div>

        {/* Stat pills */}
        <div style={{ display: 'flex', gap: 0, borderTop: `1px solid ${T.border}` }}>
          {[
            { label: 'GRAND SLAMS', value: stats.gs, color: T.gold },
            { label: 'MASTERS',     value: stats.masters, color: '#9C27B0' },
            { label: 'TÍTULOS',     value: stats.totalTitles, color: T.dim },
            { label: 'TOP-10 MESES', value: stats.top10Months, color: T.dim },
            { label: 'WIN RATE',    value: `${Math.round((stats.winRate ?? 0) * 100)}%`, color: T.dim },
            ...(dominantSurf ? [{ label: 'SUPERFÍCIE', value: surfLabel[dominantSurf] ?? dominantSurf,
              color: dominantColor[dominantSurf] ?? T.dim }] : []),
          ].map(({ label, value, color }, i) => (
            <div key={label} style={{
              flex: 1, padding: '12px 8px', textAlign: 'center',
              borderRight: i < 5 ? `1px solid ${T.border}` : 'none',
            }}>
              <div style={{ fontFamily: T.disp, fontSize: 20, color, letterSpacing: '.04em' }}>{value}</div>
              <div style={{ fontFamily: T.mono, fontSize: 6.5, color: T.faint,
                letterSpacing: '.15em', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline scroll */}
      <div className="hof-timeline-scroll"
        style={{ flex: 1, overflowY: 'auto', padding: '28px 24px 48px',
          scrollbarWidth: 'thin', scrollbarColor: `${T.ghost} transparent` }}>

        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', fontFamily: T.mono,
            fontSize: 10, color: T.faint, letterSpacing: '.2em' }}>
            HISTÓRICO INCOMPLETO
          </div>
        ) : (
          <div style={{ maxWidth: 680 }}>
            {events.map((ev, i) => (
              <TimelineNode key={`${ev.type}-${ev.year}-${i}`} event={ev} idx={i} />
            ))}

            {/* Footer */}
            <div style={{ paddingLeft: 52, paddingTop: 8, fontFamily: T.mono, fontSize: 8,
              color: T.faint, letterSpacing: '.16em' }}>
              ─── FIM DA CARREIRA ─── {stats.gs} GS · {stats.totalTitles} TÍTULOS
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Gallery view (lista dos induzidos) ───────────────────────────────
function GalleryView({ inductees, sponsorRecords, onSelect }) {
  const [filter, setFilter] = useState('ALL'); // ALL / ACTIVE / RETIRED / CAREER_SLAM

  const filtered = useMemo(() => {
    if (filter === 'ACTIVE')       return inductees.filter(s => !s.isRetired);
    if (filter === 'RETIRED')      return inductees.filter(s => s.isRetired);
    if (filter === 'CAREER_SLAM')  return inductees.filter(s => s.careerSlam);
    return inductees;
  }, [inductees, filter]);

  const filters = [
    { id: 'ALL',         label: 'Todos' },
    { id: 'ACTIVE',      label: 'Ativos' },
    { id: 'RETIRED',     label: 'Aposentados' },
    { id: 'CAREER_SLAM', label: '🏆 Career Slam' },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header do hall */}
      <div style={{ padding: '24px 24px 0', flexShrink: 0 }}>
        <div style={{ marginBottom: 6, display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <div style={{ fontFamily: T.disp, fontSize: 32, letterSpacing: '.1em', color: T.gold }}>
            HALL OF FAME
          </div>
          <div style={{ fontFamily: T.mono, fontSize: 8, color: T.faint, letterSpacing: '.2em' }}>
            {inductees.length} INDUZIDO{inductees.length !== 1 ? 'S' : ''}
          </div>
        </div>
        <div style={{ fontFamily: T.mono, fontSize: 8, color: T.faint, letterSpacing: '.14em',
          marginBottom: 16, lineHeight: 1.8 }}>
          CRITÉRIOS: ≥3 GRAND SLAMS · ≥20 MESES TOP-10 · APOSENTADO OU 35+ ANOS
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${T.border}`, paddingBottom: 0 }}>
          {filters.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontFamily: T.mono, fontSize: 8, letterSpacing: '.16em',
                textTransform: 'uppercase', padding: '8px 14px',
                color: filter === f.id ? T.gold : T.faint,
                borderBottom: filter === f.id ? `2px solid ${T.gold}` : '2px solid transparent',
                transition: 'all .15s',
              }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recordes de Patrocínio */}
      {sponsorRecords && (sponsorRecords.biggestContract || sponsorRecords.mostLoyal || sponsorRecords.topEarner) && (
        <div style={{ padding: '12px 24px 0', flexShrink: 0, borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontFamily: T.mono, fontSize: 7, color: T.gold, letterSpacing: '.2em',
            marginBottom: 8, textTransform: 'uppercase' }}>🤝 Recordes de Patrocínio</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', paddingBottom: 12 }}>
            {sponsorRecords.biggestContract && (
              <div style={{ background: T.card, border: `1px solid ${T.border}`, padding: '6px 10px', flex: 1, minWidth: 140 }}>
                <div style={{ fontFamily: T.mono, fontSize: 6, color: T.faint, letterSpacing: '.16em', marginBottom: 2 }}>MAIOR CONTRATO</div>
                <div style={{ fontFamily: T.disp, fontSize: 13, color: T.gold }}>
                  {sponsorRecords.biggestContract.playerName}
                </div>
                <div style={{ fontFamily: T.mono, fontSize: 8, color: T.text }}>
                  {sponsorRecords.biggestContract.sponsorName} · ${(sponsorRecords.biggestContract.annualFee / 1e6).toFixed(1)}M/ano
                </div>
              </div>
            )}
            {sponsorRecords.topEarner && (
              <div style={{ background: T.card, border: `1px solid ${T.border}`, padding: '6px 10px', flex: 1, minWidth: 140 }}>
                <div style={{ fontFamily: T.mono, fontSize: 6, color: T.faint, letterSpacing: '.16em', marginBottom: 2 }}>MAIOR PEAK FEE</div>
                <div style={{ fontFamily: T.disp, fontSize: 13, color: T.gold }}>
                  {sponsorRecords.topEarner.name}
                </div>
                <div style={{ fontFamily: T.mono, fontSize: 8, color: T.text }}>
                  ${(sponsorRecords.topEarner.peakFee / 1e6).toFixed(1)}M anuais
                </div>
              </div>
            )}
            {sponsorRecords.mostLoyal && (
              <div style={{ background: T.card, border: `1px solid ${T.border}`, padding: '6px 10px', flex: 1, minWidth: 140 }}>
                <div style={{ fontFamily: T.mono, fontSize: 6, color: T.faint, letterSpacing: '.16em', marginBottom: 2 }}>MAIS RENOVAÇÕES</div>
                <div style={{ fontFamily: T.disp, fontSize: 13, color: T.gold }}>
                  {sponsorRecords.mostLoyal.name}
                </div>
                <div style={{ fontFamily: T.mono, fontSize: 8, color: T.text }}>
                  {sponsorRecords.mostLoyal.renewals} renovação{sponsorRecords.mostLoyal.renewals !== 1 ? 'ões' : ''}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FASE 3: Recordes de Superfície — Rei/Mago de cada surface */}
      {inductees.length > 0 && (() => {
        const SURF_CFG = [
          { key: 'CLAY',   label: 'Rei do Saibro',     icon: '🏺', color: '#C4572A' },
          { key: 'GRASS',  label: 'Mago da Grama',      icon: '🌿', color: '#2ECC71' },
          { key: 'HARD',   label: 'Máq. do Hard',       icon: '🏙️', color: '#4A90D9' },
          { key: 'INDOOR', label: 'Sen. das Arenas',    icon: '🏟️', color: '#C84FEB' },
        ];
        const surfKings = SURF_CFG.map(cfg => {
          // Melhor jogador por surfTitles[key] entre todos os inductees
          let best = null;
          for (const s of inductees) {
            const titles = s.surfTitles?.[cfg.key] ?? 0;
            if (titles > 0 && (!best || titles > (best.titles ?? 0))) {
              best = { name: s.name, titles, winRate: s.surfWins?.[cfg.key] && (s.surfWins[cfg.key] + (s.surfLosses?.[cfg.key] ?? 0)) > 0
                ? Math.round(s.surfWins[cfg.key] / (s.surfWins[cfg.key] + (s.losses ?? 0)) * 100) : null };
            }
          }
          return { ...cfg, best };
        }).filter(c => c.best);

        if (surfKings.length === 0) return null;
        return (
          <div style={{ padding: '10px 24px 0', flexShrink: 0, borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontFamily: T.mono, fontSize: 7, color: T.gold, letterSpacing: '.2em', marginBottom: 8, textTransform: 'uppercase' }}>🏟️ Especialistas de Superfície</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingBottom: 10 }}>
              {surfKings.map(cfg => (
                <div key={cfg.key} style={{ background: `${cfg.color}10`, border: `1px solid ${cfg.color}33`, padding: '6px 10px', flex: 1, minWidth: 120 }}>
                  <div style={{ fontFamily: T.mono, fontSize: 6, color: cfg.color, letterSpacing: '.16em', marginBottom: 2 }}>{cfg.icon} {cfg.label.toUpperCase()}</div>
                  <div style={{ fontFamily: T.disp, fontSize: 13, color: T.white }}>{cfg.best.name}</div>
                  <div style={{ fontFamily: T.mono, fontSize: 8, color: T.dim }}>{cfg.best.titles} títulos</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Grid de cards */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 48px',
        scrollbarWidth: 'thin', scrollbarColor: `${T.ghost} transparent` }}>
        {filtered.length === 0 ? (
          <div className="hof-empty">
            <div style={{ fontSize: 48 }}>🏛️</div>
            <div style={{ fontFamily: T.disp, fontSize: 24, color: T.faint, letterSpacing: '.1em' }}>
              {inductees.length === 0 ? 'HALL VAZIO' : 'NENHUM RESULTADO'}
            </div>
            <div style={{ fontFamily: T.body, fontSize: 13, color: T.faint, maxWidth: 340, lineHeight: 1.6 }}>
              {inductees.length === 0
                ? 'O Hall of Fame será preenchido conforme lendas se aposentam. São necessários pelo menos 3 Grand Slams e 20 meses no top 10.'
                : 'Nenhum jogador corresponde a este filtro no momento.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {filtered.map((s, i) => (
              <HOFCard key={s.id} stats={s} rank={inductees.indexOf(s)}
                delay={i * 40} onClick={() => onSelect(s)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────
export default function HallOfFameView({ state }) {
  useEffect(() => { injectHOFStyles(); }, []);

  const [selected, setSelected] = useState(null);

  const { inductees, sponsorRecords } = useMemo(() => computeHOFData(state), [state]);

  const handleSelect = useCallback((stats) => setSelected(stats), []);
  const handleBack   = useCallback(() => setSelected(null), []);

  return (
    <div style={{
      width: '100%', height: 'calc(100vh - 120px)',
      background: T.bg, color: T.white, overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Decoração de fundo */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0,
      }}>
        <div style={{
          position: 'absolute', top: '10%', left: '60%', width: 600, height: 600,
          borderRadius: '50%', opacity: .025,
          background: 'radial-gradient(circle, #E8C84A, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '5%', left: '10%', width: 400, height: 400,
          borderRadius: '50%', opacity: .015,
          background: 'radial-gradient(circle, #E8C84A, transparent 70%)',
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, height: '100%' }}>
        {selected ? (
          <PlayerTimelineView stats={selected} state={state} onBack={handleBack} />
        ) : (
          <GalleryView inductees={inductees} sponsorRecords={sponsorRecords} onSelect={handleSelect} />
        )}
      </div>
    </div>
  );
}
