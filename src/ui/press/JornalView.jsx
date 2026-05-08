/**
 * JornalView.jsx
 * ─────────────────────────────────────────────────────────────────
 * Aba "JORNAL" do BroadcastUniverse.
 *
 * Feed de artigos gerados pelo NewsEngine com filtros por tipo,
 * jornalista e temporada. Visual inspirado em jornais modernos
 * mas dentro do design system do BroadcastUniverse (tema escuro,
 * fontes Bebas Neue / Barlow Condensed / Space Mono).
 *
 * USO:
 *   import JornalView from './JornalView.jsx';
 *   // No BroadcastUniverse, na lista de tabs:
 *   { id: 'jornal', label: 'JORNAL', active: true }
 *   // No render de conteúdo:
 *   {currentTab === 'jornal' && state && <JornalView state={state} />}
 */

import React, { useState, useMemo } from 'react';
import { NEWS_TYPES, JOURNALISTS } from '../../systems/press/NewsEngine.js';
import { BROADCAST_THEME as T } from '../theme/uiTheme.js';

// ── Design tokens (espelha os do BroadcastUniverse) ──────────────

// ── Pill de categoria do artigo ───────────────────────────────────
function TypePill({ type }) {
  const cfg = NEWS_TYPES[type];
  if (!cfg) return null;
  return (
    <span style={{
      display:        'inline-flex',
      alignItems:     'center',
      gap:            4,
      fontFamily:     T.mono,
      fontSize:       9,
      letterSpacing:  '.18em',
      textTransform:  'uppercase',
      padding:        '3px 8px',
      background:     `${cfg.color}18`,
      border:         `1px solid ${cfg.color}44`,
      color:          cfg.color,
      borderRadius:   2,
      whiteSpace:     'nowrap',
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ── Byline do jornalista ─────────────────────────────────────────
function Byline({ journalist, compact = false }) {
  if (!journalist) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: compact ? 12 : 14 }}>{journalist.icon}</span>
      <div>
        <span style={{
          fontFamily:    T.cond,
          fontSize:      compact ? 11 : 12,
          fontWeight:    700,
          letterSpacing: '.08em',
          color:         journalist.color ?? T.dim,
          textTransform: 'uppercase',
        }}>
          {journalist.name}
        </span>
        {!compact && (
          <span style={{
            fontFamily:   T.mono,
            fontSize:     9,
            color:        T.faint,
            marginLeft:   6,
            letterSpacing:'.1em',
          }}>
            · {journalist.outlet}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Conteúdo rico para artigo TOURNAMENT_WRAP ────────────────────
function TournamentWrapContent({ wrapData }) {
  if (!wrapData) return null;
  const { heat, injured } = wrapData;

  // Cor da barra de heat
  function heatColor(n) {
    if (n == null) return '#4A7A9B';
    if (n >= 85) return '#FFD700';
    if (n >= 75) return '#FF5533';
    if (n >= 62) return '#FF9944';
    if (n >= 48) return '#FFD700';
    if (n >= 35) return '#7ab4ff';
    return '#4A7A9B';
  }

  const avg = heat?.avg;
  const clr = heatColor(avg);
  const pct = avg != null ? Math.round(avg) : 0;

  // Cor por grau de lesão
  function injGradeColor(g) {
    if (g >= 3) return '#F44336';
    if (g >= 2) return '#FF9800';
    return '#FFC107';
  }

  return (
    <div style={{ marginTop: 28 }}>

      {/* ── Bloco de Heat ── */}
      <div style={{
        paddingTop: 20, borderTop: `1px solid ${T.border}`,
        marginBottom: 28,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
        }}>
          <div style={{ width: 3, height: 16, background: clr }} />
          <span style={{
            fontFamily: T.mono, fontSize: 8, letterSpacing: 4,
            color: clr, textTransform: 'uppercase',
          }}>
            QUALIDADE DO TORNEIO — HEAT
          </span>
        </div>

        {avg != null ? (
          <>
            {/* Termômetro */}
            <div style={{ marginBottom: 12 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                marginBottom: 6,
              }}>
                <span style={{ fontFamily: T.mono, fontSize: 10, color: T.faint }}>
                  MÉDIA — {heat.tier}
                </span>
                <span style={{ fontFamily: T.disp, fontSize: 22, color: clr, letterSpacing: '.04em' }}>
                  {avg}<span style={{ fontSize: 13, color: T.faint }}>/100</span>
                </span>
              </div>
              {/* Barra */}
              <div style={{
                height: 6, background: T.ghost, borderRadius: 3, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${clr}88, ${clr})`,
                  borderRadius: 3,
                  transition: 'width .6s ease',
                }} />
              </div>
            </div>

            {/* Peak e total de jogos */}
            <div style={{ display: 'flex', gap: 24 }}>
              <div>
                <div style={{ fontFamily: T.mono, fontSize: 8, color: T.faint, letterSpacing: '.15em', marginBottom: 3 }}>PICO</div>
                <div style={{ fontFamily: T.disp, fontSize: 18, color: T.white }}>
                  {heat.peak}<span style={{ fontSize: 11, color: T.faint }}>/100</span>
                </div>
              </div>
              <div>
                <div style={{ fontFamily: T.mono, fontSize: 8, color: T.faint, letterSpacing: '.15em', marginBottom: 3 }}>PARTIDAS</div>
                <div style={{ fontFamily: T.disp, fontSize: 18, color: T.white }}>{heat.games}</div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ fontFamily: T.body, fontSize: 13, color: T.faint }}>
            Dados de heat não disponíveis para este torneio.
          </div>
        )}
      </div>

      {/* ── Bloco de Lesionados ── */}
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
        }}>
          <div style={{ width: 3, height: 16, background: '#F44336' }} />
          <span style={{
            fontFamily: T.mono, fontSize: 8, letterSpacing: 4,
            color: '#F44336', textTransform: 'uppercase',
          }}>
            BOLETIM DE LESÕES — {injured.length === 0 ? 'NENHUM CASO' : `${injured.length} JOGADOR(ES)`}
          </span>
        </div>

        {injured.length === 0 ? (
          <div style={{
            fontFamily: T.body, fontSize: 13, color: T.faint,
            padding: '12px 16px',
            background: 'rgba(46,204,113,0.05)',
            border: '1px solid rgba(46,204,113,0.15)',
            borderLeft: '2px solid rgba(46,204,113,0.4)',
          }}>
            ✓ Nenhum jogador encerrou o torneio com lesão registrada.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {injured.map((entry, i) => {
              const gc = injGradeColor(entry.gradeNum);
              return (
                <div key={i} style={{
                  padding: '12px 16px',
                  background: `${gc}08`,
                  border: `1px solid ${gc}22`,
                  borderLeft: `2px solid ${gc}88`,
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {entry.withdrew && (
                        <span style={{
                          fontFamily: T.mono, fontSize: 7, letterSpacing: '.15em',
                          color: '#F44336', background: 'rgba(244,67,54,.1)',
                          border: '1px solid rgba(244,67,54,.25)', padding: '1px 5px',
                        }}>RETIRADA</span>
                      )}
                      <span style={{
                        fontFamily: T.cond, fontSize: 14, fontWeight: 700,
                        color: T.white, letterSpacing: '.04em',
                      }}>
                        {entry.rank ? `#${entry.rank} ` : ''}{entry.name}
                      </span>
                    </div>
                    <span style={{
                      fontFamily: T.mono, fontSize: 9,
                      color: gc, letterSpacing: '.1em',
                    }}>
                      {entry.grade.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: T.body, fontSize: 12, color: T.dim }}>
                      {entry.injLabel}
                    </span>
                    <span style={{
                      fontFamily: T.mono, fontSize: 9, color: T.faint, letterSpacing: '.1em',
                    }}>
                      {entry.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

// ── Card de artigo ───────────────────────────────────────────────
function ArticleCard({ article, onOpen }) {
  const cfg      = NEWS_TYPES[article.type] ?? {};
  const isRumor  = article.isRumor;
  const isLong   = article.length === 'LONG';

  return (
    <div
      onClick={() => onOpen(article)}
      style={{
        background:    T.bgCard,
        border:        `1px solid ${cfg.color ? cfg.color + '20' : T.border}`,
        borderLeft:    `3px solid ${cfg.color ?? T.border}`,
        padding:       '18px 20px',
        cursor:        'pointer',
        transition:    'background .15s, border-color .15s',
        position:      'relative',
        overflow:      'hidden',
      }}
      onMouseEnter={e => e.currentTarget.style.background = T.bgHover}
      onMouseLeave={e => e.currentTarget.style.background = T.bgCard}
    >
      {/* Rumor overlay */}
      {isRumor && (
        <div style={{
          position:   'absolute',
          top:        8,
          right:      8,
          fontFamily: T.mono,
          fontSize:   8,
          letterSpacing: '.2em',
          color:      'rgba(171,71,188,.7)',
          background: 'rgba(171,71,188,.08)',
          border:     '1px solid rgba(171,71,188,.2)',
          padding:    '2px 6px',
        }}>
          NÃO CONFIRMADO
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <TypePill type={article.type} />
        {article.tournament && (
          <span style={{ fontFamily: T.mono, fontSize: 9, color: T.faint, letterSpacing: '.12em' }}>
            {article.tournament.name?.toUpperCase()}
          </span>
        )}
        <span style={{ fontFamily: T.mono, fontSize: 9, color: T.faint, marginLeft: 'auto' }}>
          {article.year}
        </span>
      </div>

      {/* Headline */}
      <div style={{
        fontFamily:    T.disp,
        fontSize:      isLong ? 22 : 18,
        letterSpacing: '.04em',
        color:         T.white,
        lineHeight:    1.1,
        marginBottom:  8,
        textTransform: 'uppercase',
      }}>
        {article.headline}
      </div>

      {/* Deck */}
      {article.deck && (
        <div style={{
          fontFamily:    T.body,
          fontSize:      13,
          color:         T.dim,
          lineHeight:    1.5,
          marginBottom:  12,
        }}>
          {article.deck}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Byline journalist={article.journalist} compact />
        <span style={{
          fontFamily:    T.mono,
          fontSize:      9,
          color:         T.faint,
          letterSpacing: '.12em',
        }}>
          {article.length === 'LONG' ? 'LEITURA LONGA' : article.length === 'MEDIUM' ? 'LEITURA MÉDIA' : 'NOTA RÁPIDA'}
          {' · '}{isLong ? 'CLIQUE PARA LER' : ''}
        </span>
      </div>

      {/* TOURNAMENT_WRAP: mini-preview de heat + lesionados */}
      {article.type === 'TOURNAMENT_WRAP' && article.wrapData && (() => {
        const { heat, injured } = article.wrapData;
        const clr = heat?.avg >= 85 ? '#FFD700' : heat?.avg >= 75 ? '#FF5533'
          : heat?.avg >= 62 ? '#FF9944' : heat?.avg >= 48 ? '#FFD700'
          : heat?.avg >= 35 ? '#7ab4ff' : '#4A7A9B';
        return (
          <div style={{
            marginTop: 14, paddingTop: 12,
            borderTop: `1px solid ${T.border}`,
            display: 'flex', gap: 20, alignItems: 'center',
          }}>
            {heat?.avg != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: T.mono, fontSize: 8, color: T.faint, letterSpacing: '.12em' }}>HEAT</span>
                <span style={{ fontFamily: T.disp, fontSize: 18, color: clr, letterSpacing: '.04em' }}>
                  {heat.avg}<span style={{ fontSize: 10, color: T.faint }}>/100</span>
                </span>
                <span style={{ fontFamily: T.mono, fontSize: 8, color: clr, letterSpacing: '.1em' }}>
                  {heat.tier}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: T.mono, fontSize: 8, color: T.faint, letterSpacing: '.12em' }}>LESIONADOS</span>
              <span style={{
                fontFamily: T.disp, fontSize: 18,
                color: injured.length > 0 ? '#F44336' : '#2ECC71',
                letterSpacing: '.04em',
              }}>
                {injured.length}
              </span>
              {injured.length > 0 && (
                <span style={{ fontFamily: T.mono, fontSize: 8, color: '#F44336aa', letterSpacing: '.1em' }}>
                  {injured.filter(x => x.gradeNum >= 3).length > 0
                    ? `${injured.filter(x => x.gradeNum >= 3).length} GRAVE(S)`
                    : 'VER DETALHES'}
                </span>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Modal de artigo completo ─────────────────────────────────────
function ArticleModal({ article, onClose }) {
  if (!article) return null;
  const cfg = NEWS_TYPES[article.type] ?? {};

  return (
    <div
      onClick={onClose}
      style={{
        position:   'fixed',
        inset:       0,
        background:  'rgba(0,0,0,.8)',
        backdropFilter: 'blur(8px)',
        zIndex:      100,
        display:     'flex',
        alignItems:  'center',
        justifyContent: 'center',
        padding:     24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:   T.bgPanel,
          border:       `1px solid ${cfg.color ?? T.borderMid}44`,
          borderTop:    `3px solid ${cfg.color ?? T.gold}`,
          maxWidth:     720,
          width:        '100%',
          maxHeight:    '80vh',
          overflowY:    'auto',
          padding:      '40px 48px',
          position:     'relative',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position:    'absolute',
            top:         16,
            right:       16,
            background:  'transparent',
            border:      'none',
            color:       T.faint,
            fontSize:    18,
            cursor:      'pointer',
            fontFamily:  T.mono,
          }}
        >
          ✕
        </button>

        {/* Header meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <TypePill type={article.type} />
          {article.tournament && (
            <span style={{ fontFamily: T.mono, fontSize: 9, color: T.faint, letterSpacing: '.18em' }}>
              {article.tournament.name?.toUpperCase()} · {article.year}
            </span>
          )}
          {article.isRumor && (
            <span style={{
              fontFamily: T.mono, fontSize: 9, letterSpacing: '.18em',
              color: 'rgba(171,71,188,.7)', marginLeft: 'auto',
            }}>
              ⚠ NÃO CONFIRMADO
            </span>
          )}
        </div>

        {/* Headline */}
        <div style={{
          fontFamily:    T.disp,
          fontSize:      'clamp(26px,4vw,40px)',
          letterSpacing: '.04em',
          color:         T.white,
          lineHeight:    1.05,
          marginBottom:  16,
          textTransform: 'uppercase',
        }}>
          {article.headline}
        </div>

        {/* Deck */}
        {article.deck && (
          <div style={{
            fontFamily:     T.body,
            fontSize:       16,
            fontWeight:     500,
            color:          T.dim,
            lineHeight:     1.6,
            marginBottom:   20,
            paddingBottom:  20,
            borderBottom:   `1px solid ${T.border}`,
          }}>
            {article.deck}
          </div>
        )}

        {/* Byline */}
        <div style={{ marginBottom: 24 }}>
          <Byline journalist={article.journalist} />
        </div>

        {/* Body */}
        <div style={{
          fontFamily:  T.body,
          fontSize:    15,
          color:       T.dim,
          lineHeight:  1.85,
        }}>
          {article.body?.split('. ').map((sentence, i) => (
            sentence.trim() ? (
              <p key={i} style={{ marginBottom: 14 }}>
                {sentence.trim()}{sentence.endsWith('.') ? '' : '.'}
              </p>
            ) : null
          ))}
        </div>

        {/* Tags */}
        {article.tags?.length > 0 && (
          <div style={{ marginTop: 28, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {article.tags.map(tag => (
              <span key={tag} style={{
                fontFamily:    T.mono,
                fontSize:      9,
                letterSpacing: '.15em',
                color:         T.faint,
                background:    T.ghost,
                padding:       '3px 8px',
              }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Balanço do Torneio — heat + lesionados */}
        {article.type === 'TOURNAMENT_WRAP' && article.wrapData && (
          <TournamentWrapContent wrapData={article.wrapData} />
        )}

        {/* Narração MatchNarrator — apenas Final e Semifinal */}
        {article.narration && (
          <div style={{ marginTop: 32 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              marginBottom: 18, paddingBottom: 14,
              borderTop: `1px solid ${T.border}`, paddingTop: 20,
            }}>
              <div style={{ width: 3, height: 16, background: T.clay }} />
              <span style={{ fontFamily: T.mono, fontSize: 8, letterSpacing: 4, color: T.clay, textTransform: 'uppercase' }}>
                ANÁLISE TÉCNICA — {article.narratorRound === 'F' ? 'FINAL' : 'SEMIFINAL'}
              </span>
              {article.narration.tags?.includes('RETIREMENT') && (
                <span style={{
                  marginLeft: 'auto',
                  fontFamily: T.mono, fontSize: 7, letterSpacing: '.15em',
                  color: '#FF8080', border: '1px solid rgba(255,100,100,0.35)',
                  padding: '2px 8px', textTransform: 'uppercase',
                }}>
                  🏳 abandono por lesão
                </span>
              )}
            </div>
            {/* Tactical summary */}
            <p style={{ fontFamily: T.body, fontSize: 14, color: T.dim, lineHeight: 1.75, marginBottom: 16 }}>
              {article.narration.tactical_summary}
            </p>
            {/* Turning point */}
            {article.narration.turning_point && (
              <div style={{
                padding: '12px 16px', marginBottom: 12,
                background: 'rgba(212,168,32,0.05)',
                border: '1px solid rgba(212,168,32,0.18)',
                borderLeft: '2px solid rgba(212,168,32,0.6)',
              }}>
                <div style={{ fontFamily: T.mono, fontSize: 8, letterSpacing: 3, color: 'rgba(212,168,32,0.7)', textTransform: 'uppercase', marginBottom: 6 }}>PONTO DE VIRADA</div>
                <p style={{ fontFamily: T.body, fontSize: 13, color: T.dim, lineHeight: 1.6, margin: 0 }}>{article.narration.turning_point}</p>
              </div>
            )}
            {/* Pattern highlight */}
            {article.narration.pattern_highlight && (
              <div style={{
                padding: '12px 16px', marginBottom: 12,
                background: 'rgba(74,144,196,0.05)',
                border: '1px solid rgba(74,144,196,0.18)',
                borderLeft: '2px solid rgba(74,144,196,0.5)',
              }}>
                <div style={{ fontFamily: T.mono, fontSize: 8, letterSpacing: 3, color: 'rgba(74,144,196,0.7)', textTransform: 'uppercase', marginBottom: 6 }}>PADRÃO DOMINANTE</div>
                <p style={{ fontFamily: T.body, fontSize: 13, color: T.dim, lineHeight: 1.6, margin: 0 }}>{article.narration.pattern_highlight}</p>
              </div>
            )}
            {/* Tags da narração */}
            {article.narration.tags?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {article.narration.tags.map((tag, i) => (
                  <span key={i} style={{
                    fontFamily: T.mono, fontSize: 8, letterSpacing: 2,
                    padding: '2px 8px', color: T.faint,
                    border: `1px solid ${T.border}`,
                  }}>{tag}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Filtros ──────────────────────────────────────────────────────
function FilterBar({ activeType, setActiveType, activeJournalist, setActiveJournalist, years, activeYear, setActiveYear, totalArticles }) {
  const types = [
    { id: null,          label: 'Tudo',        color: T.gold  },
    ...Object.values(NEWS_TYPES).map(t => ({ id: t.id, label: t.label, color: t.color, icon: t.icon })),
  ];

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Tipos */}
      <div style={{
        display:    'flex',
        gap:        8,
        flexWrap:   'wrap',
        marginBottom: 12,
      }}>
        {types.map(t => (
          <button
            key={String(t.id)}
            onClick={() => setActiveType(t.id)}
            style={{
              fontFamily:    T.mono,
              fontSize:      9,
              letterSpacing: '.18em',
              textTransform: 'uppercase',
              padding:       '5px 12px',
              background:    activeType === t.id ? `${t.color}22` : 'transparent',
              border:        `1px solid ${activeType === t.id ? t.color : T.border}`,
              color:         activeType === t.id ? t.color : T.faint,
              cursor:        'pointer',
              transition:    'all .15s',
            }}
          >
            {t.icon ? `${t.icon} ` : ''}{t.label}
          </button>
        ))}
      </div>

      {/* Jornalistas + Ano */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: T.mono, fontSize: 9, color: T.faint, letterSpacing: '.2em' }}>
          POR:
        </span>
        {[null, ...Object.values(JOURNALISTS)].map(j => (
          <button
            key={j?.id ?? 'all'}
            onClick={() => setActiveJournalist(j?.id ?? null)}
            style={{
              fontFamily:    T.cond,
              fontSize:      11,
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              padding:       '4px 10px',
              background:    activeJournalist === (j?.id ?? null) ? `${j?.color ?? T.gold}18` : 'transparent',
              border:        `1px solid ${activeJournalist === (j?.id ?? null) ? (j?.color ?? T.gold) : T.border}`,
              color:         activeJournalist === (j?.id ?? null) ? (j?.color ?? T.gold) : T.faint,
              cursor:        'pointer',
              transition:    'all .15s',
              display:       'flex',
              alignItems:    'center',
              gap:           5,
            }}
          >
            {j ? `${j.icon} ${j.name.split(' ')[1]}` : 'Todos'}
          </button>
        ))}

        {years.length > 1 && (
          <>
            <div style={{ width: 1, height: 20, background: T.border, margin: '0 4px' }} />
            {years.map(y => (
              <button
                key={y}
                onClick={() => setActiveYear(y === activeYear ? null : y)}
                style={{
                  fontFamily:    T.mono,
                  fontSize:      9,
                  letterSpacing: '.18em',
                  padding:       '4px 8px',
                  background:    activeYear === y ? `${T.gold}18` : 'transparent',
                  border:        `1px solid ${activeYear === y ? T.gold : T.border}`,
                  color:         activeYear === y ? T.gold : T.faint,
                  cursor:        'pointer',
                  transition:    'all .15s',
                }}
              >
                {y}
              </button>
            ))}
          </>
        )}

        <span style={{ fontFamily: T.mono, fontSize: 9, color: T.faint, marginLeft: 'auto', letterSpacing: '.15em' }}>
          {totalArticles} ARTIGO{totalArticles !== 1 ? 'S' : ''}
        </span>
      </div>
    </div>
  );
}

// ── Destaque (primeiro artigo em layout maior) ───────────────────
function FeaturedArticle({ article, onOpen }) {
  if (!article) return null;
  const cfg = NEWS_TYPES[article.type] ?? {};

  return (
    <div
      onClick={() => onOpen(article)}
      style={{
        background:   `linear-gradient(135deg, ${T.bgPanel} 0%, ${cfg.color ? cfg.color + '0A' : T.bgCard} 100%)`,
        border:       `1px solid ${cfg.color ? cfg.color + '30' : T.borderMid}`,
        borderTop:    `2px solid ${cfg.color ?? T.gold}`,
        padding:      '32px 36px',
        cursor:       'pointer',
        marginBottom: 16,
        transition:   'background .2s',
        position:     'relative',
      }}
      onMouseEnter={e => e.currentTarget.style.background = `linear-gradient(135deg, ${T.bgHover} 0%, ${cfg.color ? cfg.color + '12' : T.bgHover} 100%)`}
      onMouseLeave={e => e.currentTarget.style.background = `linear-gradient(135deg, ${T.bgPanel} 0%, ${cfg.color ? cfg.color + '0A' : T.bgCard} 100%)`}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <TypePill type={article.type} />
        <span style={{ fontFamily: T.mono, fontSize: 9, color: T.faint, letterSpacing: '.18em' }}>
          DESTAQUE DA EDIÇÃO
        </span>
        {article.tournament && (
          <span style={{ fontFamily: T.mono, fontSize: 9, color: T.faint, letterSpacing: '.12em', marginLeft: 'auto' }}>
            {article.tournament.name?.toUpperCase()}
          </span>
        )}
      </div>

      <div style={{
        fontFamily:    T.disp,
        fontSize:      'clamp(28px,4vw,48px)',
        letterSpacing: '.04em',
        color:         T.white,
        lineHeight:    1.0,
        marginBottom:  14,
        textTransform: 'uppercase',
      }}>
        {article.headline}
      </div>

      {article.deck && (
        <div style={{
          fontFamily:   T.body,
          fontSize:     15,
          fontWeight:   500,
          color:        T.dim,
          lineHeight:   1.6,
          maxWidth:     680,
          marginBottom: 20,
        }}>
          {article.deck}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Byline journalist={article.journalist} />
        <span style={{
          fontFamily:    T.mono,
          fontSize:      9,
          color:         cfg.color ?? T.faint,
          letterSpacing: '.2em',
          textTransform: 'uppercase',
        }}>
          LER ARTIGO COMPLETO →
        </span>
      </div>
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────
function EmptyFeed() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 0', color: T.faint }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📰</div>
      <div style={{ fontFamily: T.disp, fontSize: 28, letterSpacing: '.1em', color: 'rgba(242,237,228,.12)', textTransform: 'uppercase' }}>
        Nenhuma Matéria Ainda
      </div>
      <div style={{ fontFamily: T.mono, fontSize: 9, color: 'rgba(242,237,228,.12)', letterSpacing: '.3em', marginTop: 8 }}>
        SIMULE TORNEIOS PARA ALIMENTAR O FEED
      </div>
    </div>
  );
}

// ── VIEW PRINCIPAL ───────────────────────────────────────────────
export default function JornalView({ state }) {
  const [activeType,       setActiveType]       = useState(null);
  const [activeJournalist, setActiveJournalist] = useState(null);
  const [activeYear,       setActiveYear]       = useState(null);
  const [openArticle,      setOpenArticle]      = useState(null);

  // Feed do NewsEngine (serializado no state)
  const feed = useMemo(() => {
    return state?.newsEngine?.feed ?? [];
  }, [state?.newsEngine]);

  // Anos disponíveis
  const years = useMemo(() => {
    const ys = [...new Set(feed.map(a => a.year).filter(Boolean))].sort((a, b) => b - a);
    return ys;
  }, [feed]);

  // Artigos filtrados
  const filtered = useMemo(() => {
    return feed.filter(a => {
      if (activeType       && a.type            !== activeType)       return false;
      if (activeJournalist && a.journalist?.id  !== activeJournalist) return false;
      if (activeYear       && a.year            !== activeYear)       return false;
      return true;
    });
  }, [feed, activeType, activeJournalist, activeYear]);

  const featured   = filtered[0] ?? null;
  const restOfFeed = filtered.slice(1);

  if (feed.length === 0) return <EmptyFeed />;

  return (
    <div style={{ animation: 'bu-in .4s ease both' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 20, height: 2, background: T.gold }} />
          <span style={{ fontFamily: T.mono, fontSize: 8, letterSpacing: '.44em', color: T.gold, textTransform: 'uppercase' }}>
            THE CIRCUIT · EDIÇÃO {state?.year ?? ''}
          </span>
        </div>
        <div style={{
          fontFamily:    T.disp,
          fontSize:      'clamp(44px,5.5vw,72px)',
          letterSpacing: '.04em',
          color:         T.white,
          textTransform: 'uppercase',
          lineHeight:    .9,
        }}>
          Jornal do<br />
          <span style={{ color: T.clay }}>Circuito</span>
        </div>
      </div>

      {/* Filtros */}
      <FilterBar
        activeType={activeType}
        setActiveType={setActiveType}
        activeJournalist={activeJournalist}
        setActiveJournalist={setActiveJournalist}
        years={years}
        activeYear={activeYear}
        setActiveYear={setActiveYear}
        totalArticles={filtered.length}
      />

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: T.faint }}>
          <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '.3em' }}>
            NENHUM ARTIGO ENCONTRADO COM ESSES FILTROS
          </div>
        </div>
      ) : (
        <>
          {/* Destaque */}
          {featured && <FeaturedArticle article={featured} onOpen={setOpenArticle} />}

          {/* Grade de artigos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {restOfFeed.map((article, idx) => (
              <ArticleCard
                key={article.id}
                article={article}
                onOpen={setOpenArticle}
                style={{ animationDelay: `${idx * .04}s` }}
              />
            ))}
          </div>
        </>
      )}

      {/* Modal */}
      {openArticle && (
        <ArticleModal article={openArticle} onClose={() => setOpenArticle(null)} />
      )}
    </div>
  );
}


