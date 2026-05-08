// ============================================================
// 📖 CHRONICLE VIEW v2.0 — BBlade Universe
// Almanaque épico com histórias de profundidade real
// ============================================================
import React, { useState, useMemo, useCallback } from 'react';
import { Search, BookOpen, Clock, TrendingUp, Award, Users, Swords, Star } from 'lucide-react';

// ── Paleta de tons ────────────────────────────────────────────
const TONE_CONFIG = {
  EPIC:         { label: '✦ Épico',         color: '#c8942a', bg: 'rgba(200,148,42,0.06)', border: 'rgba(200,148,42,0.28)', badge: 'rgba(200,148,42,0.12)', glow: 'rgba(200,148,42,0.15)' },
  DYNASTIC:     { label: '♛ Dinástico',      color: '#e2a83a', bg: 'rgba(226,168,58,0.07)', border: 'rgba(226,168,58,0.30)', badge: 'rgba(226,168,58,0.14)', glow: 'rgba(226,168,58,0.20)' },
  TRAGIC:       { label: '— Trágico',        color: '#8a9aaa', bg: 'rgba(50,60,70,0.40)',  border: 'rgba(100,120,140,0.22)', badge: 'rgba(80,90,100,0.18)', glow: 'rgba(100,120,140,0.10)' },
  UNCERTAIN:    { label: '◈ Incerto',        color: '#5b82b0', bg: 'rgba(30,58,95,0.12)',  border: 'rgba(30,58,95,0.28)',   badge: 'rgba(30,58,95,0.15)',  glow: 'rgba(91,130,176,0.10)' },
  TRANSITIONAL: { label: '◇ Transição',      color: '#8a7a6a', bg: 'rgba(74,64,53,0.15)',  border: 'rgba(140,120,90,0.22)', badge: 'rgba(74,64,53,0.12)',  glow: 'transparent' },
  PRODIGY:      { label: '✧ Prodígio',       color: '#7bc67e', bg: 'rgba(40,90,50,0.10)',  border: 'rgba(123,198,126,0.28)', badge: 'rgba(40,90,50,0.15)',  glow: 'rgba(123,198,126,0.10)' },
};

// ── Section visual config ─────────────────────────────────────
const SECTION_CONFIG = {
  opening:  { size: 15.5, style: 'italic', opacity: 0.70, weight: 400, indent: false },
  main:     { size: 14.5, style: 'normal', opacity: 0.88, weight: 400, indent: true  },
  sub1:     { size: 13.5, style: 'normal', opacity: 0.75, weight: 400, indent: true  },
  sub2:     { size: 13,   style: 'normal', opacity: 0.68, weight: 400, indent: true  },
  stats:    { size: 11.5, style: 'italic', opacity: 0.45, weight: 400, indent: false },
  closing:  { size: 13.5, style: 'italic', opacity: 0.55, weight: 400, indent: false },
};

const CHRONICLE_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Inconsolata:wght@400;500&display=swap');

  @keyframes chron-glow {
    0%,100% { text-shadow: 0 0 30px rgba(200,148,42,0.3), 0 2px 4px rgba(0,0,0,0.8); }
    50%      { text-shadow: 0 0 60px rgba(200,148,42,0.6), 0 0 15px rgba(200,148,42,0.3), 0 2px 4px rgba(0,0,0,0.8); }
  }
  @keyframes chron-entry {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes chron-pulse {
    0%,100% { opacity: 0.5; }
    50%      { opacity: 1; }
  }

  .chron-title {
    font-family: 'Cinzel Decorative', serif;
    animation: chron-glow 4s ease-in-out infinite alternate;
  }
  .chron-serif     { font-family: 'Libre Baskerville', Georgia, serif; }
  .chron-display   { font-family: 'Playfair Display', serif; }
  .chron-mono      { font-family: 'Inconsolata', monospace; }

  .chron-entry {
    animation: chron-entry 0.5s ease-out both;
  }
  .chron-entry:nth-child(2) { animation-delay: .07s; }
  .chron-entry:nth-child(3) { animation-delay: .14s; }
  .chron-entry:nth-child(4) { animation-delay: .21s; }
  .chron-entry:nth-child(5) { animation-delay: .28s; }
  .chron-entry:nth-child(6) { animation-delay: .35s; }

  .chron-card {
    transition: background .2s ease, border-color .2s ease, box-shadow .2s ease;
    cursor: pointer;
  }
  .chron-card:hover {
    border-color: rgba(200,148,42,0.40) !important;
    box-shadow: 0 0 24px rgba(200,148,42,0.06);
  }

  .chron-search {
    background: rgba(245,234,213,0.04) !important;
    border: 1px solid rgba(200,148,42,0.18) !important;
    color: rgba(245,234,213,0.85) !important;
    outline: none !important;
    transition: border-color .2s;
  }
  .chron-search:focus { border-color: rgba(200,148,42,0.45) !important; }
  .chron-search::placeholder { color: rgba(200,148,42,0.3) !important; }

  .chron-tab {
    font-family: 'Inconsolata', monospace;
    font-size: 10px;
    letter-spacing: .2em;
    text-transform: uppercase;
    padding: 8px 14px;
    border: 1px solid transparent;
    cursor: pointer;
    transition: all .15s;
    background: transparent;
    border-radius: 2px;
  }
  .chron-tab:hover { color: rgba(200,148,42,0.8) !important; }
  .chron-tab.active {
    color: #c8942a !important;
    border-color: rgba(200,148,42,0.3) !important;
    background: rgba(200,148,42,0.06) !important;
  }

  .chron-tag {
    font-family: 'Inconsolata', monospace;
    font-size: 9px;
    letter-spacing: .12em;
    text-transform: uppercase;
    padding: 2px 7px;
    border-radius: 2px;
    border: 1px solid rgba(200,148,42,0.2);
    color: rgba(200,148,42,0.55);
    background: rgba(200,148,42,0.05);
    white-space: nowrap;
    transition: background .15s, color .15s;
  }

  .chron-empty {
    font-family: 'Playfair Display', serif;
    font-style: italic;
    color: rgba(200,148,42,0.25);
    text-align: center;
    padding: 60px 0;
  }

  .chron-divider {
    display: flex; align-items: center; gap: 12px;
    color: rgba(200,148,42,0.18);
    font-size: 9px;
    font-family: 'Inconsolata', monospace;
    letter-spacing: .3em;
  }
  .chron-divider::before, .chron-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(200,148,42,0.12));
  }
  .chron-divider::after { background: linear-gradient(270deg, transparent, rgba(200,148,42,0.12)); }

  .section-separator {
    width: 32px;
    height: 1px;
    background: rgba(200,148,42,0.18);
    margin: 10px 0;
  }

  .rivalry-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: 2px;
    font-family: 'Inconsolata', monospace;
    font-size: 9px;
    letter-spacing: .12em;
    text-transform: uppercase;
    transition: background .15s;
    cursor: default;
  }

  .expand-btn {
    font-family: 'Inconsolata', monospace;
    font-size: 9px;
    letter-spacing: .2em;
    text-transform: uppercase;
    background: transparent;
    border: 1px solid rgba(200,148,42,0.18);
    color: rgba(200,148,42,0.4);
    padding: 3px 10px;
    cursor: pointer;
    transition: all .15s;
    border-radius: 2px;
  }
  .expand-btn:hover {
    border-color: rgba(200,148,42,0.4);
    color: rgba(200,148,42,0.7);
    background: rgba(200,148,42,0.04);
  }
`;

// ── Rich text renderer ─────────────────────────────────────────
function RichText({ text, style, className }) {
  const parts = (text || '').split(/(\*\*[^*]+\*\*)/g);
  return (
    <span style={style} className={className}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} style={{ fontWeight: 700, color: 'inherit' }}>{part.slice(2, -2)}</strong>;
        }
        return part;
      })}
    </span>
  );
}

// ── Single chronicle entry ─────────────────────────────────────
function ChronicleEntry({ entry, index, expanded, onToggle }) {
  const cfg = TONE_CONFIG[entry.tone] || TONE_CONFIG.TRANSITIONAL;
  const sections = entry.sections || [{ type: 'main', text: entry.text || '' }];
  const isExpanded = expanded;

  // Only show main+opening when collapsed; all sections when expanded
  const visibleSections = isExpanded ? sections : sections.slice(0, 2);

  return (
    <div className="chron-entry" style={{ animationDelay: `${index * 0.07}s` }}>
      <div
        className="chron-card"
        style={{
          borderBottom: `1px solid ${cfg.border}`,
          padding: '28px 0',
          position: 'relative',
        }}
        onClick={onToggle}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: 28, alignItems: 'start' }}>
          {/* Year column */}
          <div style={{ textAlign: 'right', paddingTop: 4, userSelect: 'none' }}>
            <div className="chron-mono" style={{ fontSize: 15, fontWeight: 700, color: cfg.color, letterSpacing: '.05em', lineHeight: 1 }}>
              {entry.year}
            </div>
            {/* Mini tone dot */}
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: cfg.color,
              opacity: 0.5,
              margin: '8px auto 0',
            }} />
            <div className="chron-mono" style={{
              fontSize: 7, color: cfg.color, opacity: 0.4,
              letterSpacing: '.2em', marginTop: 6,
              textTransform: 'uppercase', writingMode: 'vertical-rl',
              transform: 'rotate(180deg)', lineHeight: 1, height: 60,
              overflow: 'hidden',
            }}>
              {cfg.label.replace(/^[^ ]+ /, '')}
            </div>
          </div>

          {/* Content column */}
          <div>
            {/* Tone badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{
                fontFamily: 'Inconsolata, monospace',
                fontSize: 8,
                letterSpacing: '.3em',
                textTransform: 'uppercase',
                padding: '2px 8px',
                border: `1px solid ${cfg.border}`,
                background: cfg.badge,
                color: cfg.color,
              }}>
                {cfg.label}
              </div>
              {/* Hint tags preview (show first 2 even when collapsed) */}
              {entry.tags?.slice(0, 2).map((tag, i) => (
                <span key={i} className="chron-tag">{tag}</span>
              ))}
            </div>

            {/* Narrative sections */}
            <div>
              {visibleSections.map((sec, i) => {
                const scfg = SECTION_CONFIG[sec.type] || SECTION_CONFIG.main;
                const showSeparator = i > 0 && sec.type !== 'stats' && sec.type !== 'closing';
                return (
                  <React.Fragment key={i}>
                    {showSeparator && <div className="section-separator" />}
                    <p className={sec.type === 'opening' ? 'chron-display' : 'chron-serif'} style={{
                      fontSize: scfg.size,
                      fontStyle: scfg.style,
                      lineHeight: 1.85,
                      color: `rgba(245,234,213,${scfg.opacity})`,
                      textAlign: 'justify',
                      margin: 0,
                      textIndent: scfg.indent ? '1.5em' : 0,
                    }}>
                      <RichText text={sec.text} />
                    </p>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Expand / collapse */}
            {sections.length > 2 && (
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <button className="expand-btn" onClick={e => { e.stopPropagation(); onToggle(); }}>
                  {isExpanded ? '— Recolher' : '+ Ler completo'}
                </button>
                {!isExpanded && (
                  <span className="chron-mono" style={{ fontSize: 9, color: 'rgba(200,148,42,0.25)', letterSpacing: '.1em' }}>
                    {sections.length - 2} seção{sections.length - 2 !== 1 ? 'ões' : ''} restante{sections.length - 2 !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}

            {/* All tags (when expanded) */}
            {isExpanded && entry.tags && entry.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 14 }}>
                {entry.tags.map((tag, i) => (
                  <span key={i} className="chron-tag">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Rankings tab ──────────────────────────────────────────────
function NarrativeRankings({ chronicles }) {
  const topUpsets = useMemo(() => {
    return chronicles
      .filter(c => c.raw?.biggestUpset?.margin)
      .sort((a, b) => (b.raw.biggestUpset?.margin || 0) - (a.raw.biggestUpset?.margin || 0))
      .slice(0, 6);
  }, [chronicles]);

  const topDominators = useMemo(() => {
    return chronicles
      .filter(c => c.raw?.mostTitlesPlayer?.count >= 2)
      .sort((a, b) => (b.raw.mostTitlesPlayer?.count || 0) - (a.raw.mostTitlesPlayer?.count || 0))
      .slice(0, 6);
  }, [chronicles]);

  const epicYears = useMemo(() => {
    return chronicles.filter(c => c.tone === 'EPIC' || c.tone === 'DYNASTIC');
  }, [chronicles]);

  const prodigies = useMemo(() => {
    return chronicles
      .filter(c => c.raw?.debutSensation)
      .map(c => ({ year: c.year, ...c.raw.debutSensation }));
  }, [chronicles]);

  const RankPanel = ({ title, children }) => (
    <div style={{
      background: 'rgba(200,148,42,0.02)',
      border: '1px solid rgba(200,148,42,0.12)',
      padding: '20px 22px',
    }}>
      <div className="chron-mono" style={{
        fontSize: 9, letterSpacing: '.3em', color: 'rgba(200,148,42,0.4)',
        textTransform: 'uppercase', marginBottom: 16,
      }}>
        {title}
      </div>
      {children}
    </div>
  );

  const RankRow = ({ rank, year, main, sub, accent }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '7px 0', borderBottom: '1px solid rgba(200,148,42,0.06)',
    }}>
      <span className="chron-mono" style={{ fontSize: 10, color: 'rgba(200,148,42,0.3)', width: 18, flexShrink: 0 }}>
        #{rank}
      </span>
      {year && (
        <span className="chron-mono" style={{ fontSize: 11, color: 'rgba(200,148,42,0.45)', width: 38, flexShrink: 0 }}>
          {year}
        </span>
      )}
      <span className="chron-serif" style={{ fontSize: 12.5, color: 'rgba(245,234,213,0.75)', flex: 1 }}>
        {main}
      </span>
      {sub && (
        <span className="chron-mono" style={{
          fontSize: 10, color: accent || '#c8942a',
          background: 'rgba(200,148,42,0.08)', padding: '1px 6px', borderRadius: 2, flexShrink: 0,
        }}>
          {sub}
        </span>
      )}
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <RankPanel title="⚡ Maiores Upsets da História">
        {topUpsets.length === 0
          ? <div className="chron-empty" style={{ padding: '16px 0', fontSize: 12 }}>Sem dados</div>
          : topUpsets.map((c, i) => (
            <RankRow key={c.year}
              rank={i + 1} year={c.year}
              main={<><strong>{c.raw.biggestUpset?.winnerName}</strong> (#{c.raw.biggestUpset?.winnerRank}) derrotou #{c.raw.biggestUpset?.victimRank}</>}
              sub={`Δ${c.raw.biggestUpset?.margin}`}
            />
          ))
        }
      </RankPanel>

      <RankPanel title="🏆 Temporadas de Dominância">
        {topDominators.length === 0
          ? <div className="chron-empty" style={{ padding: '16px 0', fontSize: 12 }}>Sem dados</div>
          : topDominators.map((c, i) => (
            <RankRow key={c.year}
              rank={i + 1} year={c.year}
              main={<><strong>{c.raw.mostTitlesPlayer.name}</strong></>}
              sub={`${c.raw.mostTitlesPlayer.count}× títulos`}
            />
          ))
        }
      </RankPanel>

      <RankPanel title="✦ Anos Épicos e Dinásticos">
        {epicYears.length === 0
          ? <div className="chron-empty" style={{ padding: '12px 0', fontSize: 12 }}>Aguardando o primeiro ano épico</div>
          : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 4 }}>
              {epicYears.map(c => (
                <div key={c.year} style={{
                  border: `1px solid ${(TONE_CONFIG[c.tone] || TONE_CONFIG.EPIC).border}`,
                  background: (TONE_CONFIG[c.tone] || TONE_CONFIG.EPIC).badge,
                  padding: '5px 12px',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span className="chron-mono" style={{ fontSize: 12, color: (TONE_CONFIG[c.tone] || TONE_CONFIG.EPIC).color, fontWeight: 700 }}>{c.year}</span>
                  <span className="chron-serif" style={{ fontSize: 11, color: 'rgba(245,234,213,0.5)' }}>
                    {c.raw?.kingsCourtChampName || c.raw?.seasonPointsLeaderName || ''}
                  </span>
                  <span className="chron-mono" style={{ fontSize: 8, color: (TONE_CONFIG[c.tone] || TONE_CONFIG.EPIC).color, opacity: 0.6 }}>
                    {(TONE_CONFIG[c.tone] || TONE_CONFIG.EPIC).label}
                  </span>
                </div>
              ))}
            </div>
          )
        }
      </RankPanel>

      <RankPanel title="🌱 Prodígios do Circuito">
        {prodigies.length === 0
          ? <div className="chron-empty" style={{ padding: '12px 0', fontSize: 12 }}>Nenhum ainda</div>
          : prodigies.map((p, i) => (
            <RankRow key={`${p.year}-${p.name}`}
              rank={i + 1} year={p.year}
              main={<strong>{p.name}</strong>}
              sub={p.achievement === 'TITLE' ? 'Título' : 'Final'}
              accent={p.achievement === 'TITLE' ? '#7bc67e' : '#c8942a'}
            />
          ))
        }
      </RankPanel>
    </div>
  );
}

// ── Rivalries tab ─────────────────────────────────────────────
const RIVALRY_TYPE_LABELS = {
  CLASSIC:      { label: 'Clássica',            icon: '⚔️',  color: '#ffd700' },
  DOMINATION:   { label: 'Dominância',          icon: '👑',  color: '#ef4444' },
  GIANT_KILLER: { label: 'Caçador de Gigantes', icon: '🎯',  color: '#22c55e' },
  GRUDGE:       { label: 'Rancor',              icon: '🔥',  color: '#f97316' },
  FINALS_CURSE: { label: 'Maldição das Finais', icon: '🏆',  color: '#c084fc' },
  THRONE_RIVALS:{ label: 'Rivais do Trono',     icon: '💎',  color: '#06b6d4' },
  ERA_CLASH:    { label: 'Choque de Eras',       icon: '🌀',  color: '#a855f7' },
};

const RIVALRY_STATUS_LABELS = {
  BREWING:   { label: 'Emergindo',  color: '#94a3b8' },
  ACTIVE:    { label: 'Ativa',      color: '#22c55e' },
  INTENSE:   { label: 'Intensa',    color: '#f97316' },
  LEGENDARY: { label: 'Lendária',   color: '#ffd700' },
  FROZEN:    { label: 'Encerrada',  color: '#60a5fa' },
};

function RivalriesView({ universeManager }) {
  const rivalries = useMemo(() => {
    if (!universeManager?.rivalrySystem?.rivalries) return [];
    const arr = [];
    for (const [, r] of universeManager.rivalrySystem.rivalries.entries()) {
      if (r.totalMatches >= 2) arr.push(r);
    }
    return arr.sort((a, b) => {
      // Sort by: legendary first, then by intensity
      const aScore = (a.status === 'LEGENDARY' ? 1000 : 0) + (a.intensity || 0) * 100 + a.totalMatches;
      const bScore = (b.status === 'LEGENDARY' ? 1000 : 0) + (b.intensity || 0) * 100 + b.totalMatches;
      return bScore - aScore;
    });
  }, [universeManager]);

  const getName = useCallback((id) => {
    if (!universeManager) return `#${id}`;
    return universeManager.players?.[id]?.name || `Jogador ${id}`;
  }, [universeManager]);

  if (rivalries.length === 0) {
    return (
      <div className="chron-empty">
        <Swords size={32} style={{ opacity: .25, marginBottom: 12, color: '#c8942a' }} />
        <div>O circuito ainda não forjou suas grandes rivalidades.</div>
        <div className="chron-mono" style={{ fontSize: 10, marginTop: 8, letterSpacing: '.15em' }}>
          Rivalidades surgem após encontros repetidos em torneios de prestígio.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {rivalries.map((r, i) => {
        const p1Name = getName(r.p1Id);
        const p2Name = getName(r.p2Id);
        const typeCfg = RIVALRY_TYPE_LABELS[r.type] || RIVALRY_TYPE_LABELS.CLASSIC;
        const statusCfg = RIVALRY_STATUS_LABELS[r.status] || RIVALRY_STATUS_LABELS.ACTIVE;
        const total = r.p1Wins + r.p2Wins;
        const dominated = total > 0 && (r.p1Wins / total > 0.65 || r.p2Wins / total > 0.65);
        const p1Pct = total > 0 ? Math.round((r.p1Wins / total) * 100) : 50;

        return (
          <div key={i} style={{
            border: `1px solid rgba(200,148,42,0.14)`,
            background: 'rgba(200,148,42,0.02)',
            padding: '18px 22px',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div className="chron-display" style={{ fontSize: 15, color: 'rgba(245,234,213,0.88)', fontWeight: 700 }}>
                  <strong>{p1Name}</strong>
                  <span style={{ color: 'rgba(200,148,42,0.35)', margin: '0 10px', fontWeight: 400 }}>×</span>
                  <strong>{p2Name}</strong>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                <span className="rivalry-chip" style={{
                  background: `${typeCfg.color}18`,
                  border: `1px solid ${typeCfg.color}40`,
                  color: typeCfg.color,
                }}>
                  {typeCfg.icon} {typeCfg.label}
                </span>
                <span className="rivalry-chip" style={{
                  background: `${statusCfg.color}14`,
                  border: `1px solid ${statusCfg.color}35`,
                  color: statusCfg.color,
                }}>
                  {statusCfg.label}
                </span>
              </div>
            </div>

            {/* H2H bar */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span className="chron-mono" style={{ fontSize: 10, color: 'rgba(200,148,42,0.6)' }}>
                  {r.p1Wins} vitórias
                </span>
                <span className="chron-mono" style={{ fontSize: 9, color: 'rgba(200,148,42,0.35)', letterSpacing: '.1em' }}>
                  {total} confronto{total !== 1 ? 's' : ''}
                </span>
                <span className="chron-mono" style={{ fontSize: 10, color: 'rgba(200,148,42,0.6)' }}>
                  {r.p2Wins} vitórias
                </span>
              </div>
              <div style={{ height: 3, background: 'rgba(200,148,42,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  width: `${p1Pct}%`, height: '100%',
                  background: dominated
                    ? `linear-gradient(90deg, rgba(200,148,42,0.7), rgba(200,148,42,0.3))`
                    : 'rgba(200,148,42,0.5)',
                  borderRadius: 2,
                }} />
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {r.finalsMatches > 0 && (
                <span className="chron-mono" style={{ fontSize: 9, color: 'rgba(200,148,42,0.45)', letterSpacing: '.1em' }}>
                  🏆 {r.finalsMatches} final{r.finalsMatches !== 1 ? 'is' : ''}
                </span>
              )}
              {r.tieBreaks > 0 && (
                <span className="chron-mono" style={{ fontSize: 9, color: 'rgba(200,148,42,0.45)', letterSpacing: '.1em' }}>
                  ⚖️ {r.tieBreaks} tie-break{r.tieBreaks !== 1 ? 's' : ''}
                </span>
              )}
              {r.seasons && r.seasons.length > 0 && (
                <span className="chron-mono" style={{ fontSize: 9, color: 'rgba(200,148,42,0.35)', letterSpacing: '.1em' }}>
                  {r.seasons.length > 1 ? `${r.seasons[0]} — ${r.seasons[r.seasons.length - 1]}` : `${r.seasons[0]}`}
                </span>
              )}
              {r.totalPrestige > 0 && (
                <span className="chron-mono" style={{ fontSize: 9, color: 'rgba(200,148,42,0.35)', letterSpacing: '.1em' }}>
                  ✦ prestígio {r.totalPrestige}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Epitaphs tab ──────────────────────────────────────────────
function EpitaphsView({ epitaphs, eraEpitaphs }) {
  const playerList = Object.entries(epitaphs || {});
  const eraList    = Object.entries(eraEpitaphs || {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
      {eraList.length > 0 && (
        <div>
          <div className="chron-mono" style={{ fontSize: 9, letterSpacing: '.35em', textTransform: 'uppercase', color: 'rgba(200,148,42,0.4)', marginBottom: 18 }}>
            🏛️ Crônicas de Eras
          </div>
          {eraList.map(([id, text]) => (
            <div key={id} style={{
              background: 'rgba(200,148,42,0.04)',
              border: '1px solid rgba(200,148,42,0.2)',
              borderLeft: '3px solid #c8942a',
              padding: '20px 24px',
              marginBottom: 12,
            }}>
              <p className="chron-display" style={{ fontStyle: 'italic', fontSize: 14.5, color: 'rgba(245,234,213,0.78)', lineHeight: 1.85, margin: 0 }}>
                <RichText text={text} />
              </p>
            </div>
          ))}
        </div>
      )}

      {playerList.length > 0 && (
        <div>
          <div className="chron-mono" style={{ fontSize: 9, letterSpacing: '.35em', textTransform: 'uppercase', color: 'rgba(200,148,42,0.4)', marginBottom: 18 }}>
            🕊️ Epitáfios de Carreira
          </div>
          {playerList.map(([id, text]) => (
            <div key={id} style={{
              background: 'rgba(50,60,70,0.25)',
              border: '1px solid rgba(100,120,140,0.18)',
              borderLeft: '3px solid rgba(100,120,140,0.4)',
              padding: '18px 22px',
              marginBottom: 10,
            }}>
              <p className="chron-serif" style={{ fontSize: 13.5, color: 'rgba(245,234,213,0.62)', lineHeight: 1.9, margin: 0 }}>
                <RichText text={text} />
              </p>
            </div>
          ))}
        </div>
      )}

      {playerList.length === 0 && eraList.length === 0 && (
        <div className="chron-empty">
          <BookOpen size={32} style={{ opacity: .25, marginBottom: 12 }} />
          <div>Os epitáfios aparecem quando jogadores se aposentam e eras encerram.</div>
        </div>
      )}
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function ChronicleView({ universeManager }) {
  const [activeTab, setActiveTab] = useState('chronicles');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedYears, setExpandedYears] = useState(new Set());
  const [toneFilter, setToneFilter] = useState(null);

  const engine = universeManager?.chronicleEngine;
  const allChronicles = engine?.chronicles || [];

  const displayed = useMemo(() => {
    let list = allChronicles;
    if (toneFilter) list = list.filter(c => c.tone === toneFilter);
    if (!searchQuery.trim()) return list;
    return (engine?.search(searchQuery) || []).filter(c => !toneFilter || c.tone === toneFilter);
  }, [allChronicles, searchQuery, engine, toneFilter]);

  const flashbacks = useMemo(() => {
    if (!engine || !universeManager) return [];
    return engine.getFlashback(universeManager.currentYear, [5, 10]) || [];
  }, [engine, universeManager?.currentYear]);

  const toneCount = useMemo(() => {
    const counts = {};
    allChronicles.forEach(c => { counts[c.tone] = (counts[c.tone] || 0) + 1; });
    return counts;
  }, [allChronicles]);

  const toggleExpanded = useCallback((year) => {
    setExpandedYears(prev => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }, []);

  const TABS = [
    { id: 'chronicles', label: '📜 Crônicas',   icon: BookOpen   },
    { id: 'rankings',   label: '🏆 Rankings',   icon: TrendingUp },
    { id: 'rivalries',  label: '⚔️ Rivalidades', icon: Swords     },
    { id: 'epitaphs',   label: '🕊️ Epitáfios',  icon: Award      },
  ];

  return (
    <div style={{ maxWidth: 940, margin: '0 auto', padding: '32px 24px 80px' }}>
      <style>{CHRONICLE_STYLES}</style>

      {/* ── HEADER ── */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div className="chron-mono" style={{ fontSize: 9, letterSpacing: '.55em', textTransform: 'uppercase', color: 'rgba(200,148,42,0.4)', marginBottom: 20 }}>
          📖  bblade universe  ·  memória permanente
        </div>
        <h1 className="chron-title" style={{ fontSize: 'clamp(28px, 5vw, 52px)', color: '#c8942a', lineHeight: 1.1, letterSpacing: '.05em', marginBottom: 12 }}>
          Livro de Crônicas
        </h1>
        <p className="chron-display" style={{ fontStyle: 'italic', color: 'rgba(200,184,75,0.45)', fontSize: 16 }}>
          A memória que o universo sempre mereceu
        </p>

        {/* Ornamental line */}
        <div style={{ position: 'relative', width: 240, margin: '22px auto', height: 1 }}>
          <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,#c8942a,transparent)' }} />
          <span style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            color: '#c8942a', fontSize: 12, padding: '0 10px',
            background: 'var(--bg, #0d0f12)',
          }}>✦</span>
        </div>

        {/* Stats overview */}
        {allChronicles.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 28, flexWrap: 'wrap', marginTop: 16 }}>
            {[
              { label: 'Anos', val: allChronicles.length, color: '#c8942a' },
              { label: 'Épicos', val: (toneCount.EPIC || 0) + (toneCount.DYNASTIC || 0), color: '#c8942a' },
              { label: 'Trágicos', val: toneCount.TRAGIC || 0, color: '#8a9aaa' },
              { label: 'Prodígios', val: toneCount.PRODIGY || 0, color: '#7bc67e' },
              { label: 'Incertos', val: toneCount.UNCERTAIN || 0, color: '#5b82b0' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div className="chron-title" style={{ fontSize: 20, color, lineHeight: 1 }}>{val}</div>
                <div className="chron-mono" style={{ fontSize: 8, letterSpacing: '.2em', color: 'rgba(200,148,42,0.3)', textTransform: 'uppercase', marginTop: 5 }}>{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── FLASHBACKS ── */}
      {flashbacks.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          {flashbacks.map(fb => (
            <div key={fb.year} style={{
              background: 'rgba(30,58,95,0.10)',
              border: '1px solid rgba(30,58,95,0.22)',
              borderLeft: '3px solid rgba(91,130,176,0.45)',
              padding: '12px 18px',
              marginBottom: 8,
              display: 'flex', alignItems: 'flex-start', gap: 12,
            }}>
              <Clock size={13} style={{ color: '#5b82b0', marginTop: 2, flexShrink: 0 }} />
              <div>
                <div className="chron-mono" style={{ fontSize: 9, letterSpacing: '.22em', color: '#5b82b0', textTransform: 'uppercase', marginBottom: 5 }}>
                  Há {fb.yearsAgo} ano{fb.yearsAgo !== 1 ? 's' : ''}
                </div>
                <p className="chron-display" style={{ fontStyle: 'italic', fontSize: 12.5, color: 'rgba(91,130,176,0.75)', lineHeight: 1.7, margin: 0 }}>
                  <RichText text={fb.flashText || ''} />
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TABS ── */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 26, borderBottom: '1px solid rgba(200,148,42,0.1)', paddingBottom: 1 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`chron-tab ${activeTab === t.id ? 'active' : ''}`}
            style={{ color: activeTab === t.id ? '#c8942a' : 'rgba(200,148,42,0.32)' }}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CHRONICLES TAB ── */}
      {activeTab === 'chronicles' && (
        <div>
          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <Search size={12} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(200,148,42,0.4)', pointerEvents: 'none' }} />
            <input
              className="chron-search"
              style={{ width: '100%', padding: '9px 14px 9px 36px', borderRadius: 2, fontSize: 13, boxSizing: 'border-box' }}
              placeholder="Buscar por nome, evento, ano ou tom..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Tone filters */}
          {allChronicles.length > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 24 }}>
              <div
                style={{
                  padding: '3px 10px',
                  border: `1px solid ${!toneFilter ? 'rgba(200,148,42,0.4)' : 'rgba(200,148,42,0.12)'}`,
                  background: !toneFilter ? 'rgba(200,148,42,0.08)' : 'transparent',
                  cursor: 'pointer',
                }}
                onClick={() => setToneFilter(null)}
              >
                <span className="chron-mono" style={{ fontSize: 8, letterSpacing: '.15em', color: !toneFilter ? '#c8942a' : 'rgba(200,148,42,0.35)', textTransform: 'uppercase' }}>
                  Todos ({allChronicles.length})
                </span>
              </div>
              {Object.entries(TONE_CONFIG).map(([tone, cfg]) => {
                const count = toneCount[tone] || 0;
                if (count === 0) return null;
                return (
                  <div key={tone}
                    style={{
                      padding: '3px 10px',
                      border: `1px solid ${toneFilter === tone ? cfg.border : 'rgba(200,148,42,0.10)'}`,
                      background: toneFilter === tone ? cfg.bg : 'transparent',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                    }}
                    onClick={() => setToneFilter(toneFilter === tone ? null : tone)}
                  >
                    <span className="chron-mono" style={{ fontSize: 8, letterSpacing: '.12em', color: toneFilter === tone ? cfg.color : 'rgba(200,148,42,0.3)', textTransform: 'uppercase' }}>
                      {cfg.label}
                    </span>
                    <span className="chron-mono" style={{ fontSize: 8, color: 'rgba(200,148,42,0.25)' }}>({count})</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* List */}
          {allChronicles.length === 0 ? (
            <div className="chron-empty">
              <BookOpen size={40} style={{ opacity: .18, marginBottom: 16, color: '#c8942a' }} />
              <div className="chron-display" style={{ fontSize: 18, marginBottom: 10 }}>O Livro ainda está em branco.</div>
              <div className="chron-mono" style={{ fontSize: 10, letterSpacing: '.15em' }}>
                A primeira crônica será escrita ao fim da temporada atual.
              </div>
            </div>
          ) : displayed.length === 0 ? (
            <div className="chron-empty">
              <div className="chron-display" style={{ fontSize: 15 }}>
                Nenhuma crônica encontrada{searchQuery ? ` para "${searchQuery}"` : ''}.
              </div>
            </div>
          ) : (
            displayed.map((entry, i) => (
              <ChronicleEntry
                key={entry.year}
                entry={entry}
                index={i}
                expanded={expandedYears.has(entry.year)}
                onToggle={() => toggleExpanded(entry.year)}
              />
            ))
          )}
        </div>
      )}

      {/* ── RANKINGS TAB ── */}
      {activeTab === 'rankings' && <NarrativeRankings chronicles={allChronicles} />}

      {/* ── RIVALRIES TAB ── */}
      {activeTab === 'rivalries' && <RivalriesView universeManager={universeManager} />}

      {/* ── EPITAPHS TAB ── */}
      {activeTab === 'epitaphs' && (
        <EpitaphsView epitaphs={engine?.epitaphs || {}} eraEpitaphs={engine?.eraEpitaphs || {}} />
      )}

      {/* ── FOOTER ── */}
      <div style={{ marginTop: 64, textAlign: 'center' }}>
        <div style={{ width: 120, height: 1, background: 'linear-gradient(90deg,transparent,rgba(200,148,42,0.18),transparent)', margin: '0 auto 14px' }} />
        <div className="chron-mono" style={{ fontSize: 8, letterSpacing: '.35em', textTransform: 'uppercase', color: 'rgba(200,148,42,0.18)' }}>
          — Anais do Circuito BBlade —
        </div>
      </div>
    </div>
  );
}
