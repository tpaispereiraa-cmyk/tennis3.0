/**
 * PressCenter.jsx — REDAÇÃO DO CIRCUITO
 * ─────────────────────────────────────────────────────────────────
 * Central de imprensa unificada do Tennis Universe.
 *
 * Substitui: JornalView, InterviewView e NoticiasView (parcial).
 *
 * 5 mesas editoriais em uma única view:
 *   MANCHETES  — destaque + feed geral
 *   ENTREVISTAS — sala de imprensa interativa
 *   BASTIDORES  — rumores, gossip, vida pessoal
 *   ANÁLISE    — matérias táticas, colunas, balanços
 *   ARQUIVO    — histórico por temporada
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { NEWS_TYPES } from '../../systems/press/NewsEngine.js';
import {
  generateInterview,
  deriveInterviewOpportunities,
  INTERVIEW_CONTEXTS,
  JOURNALISTS as INTERVIEW_JOURNALISTS,
  TOPIC_META,
} from '../../systems/press/InterviewEngine.js';
import { BROADCAST_THEME as T } from '../theme/uiTheme.js';

// ═══════════════════════════════════════════════════════════════════
// DESIGN TOKENS (alinhado com BroadcastUniverse)
// ═══════════════════════════════════════════════════════════════════

// Desks / sections
const DESKS = [
  { id: 'manchetes',   label: 'MANCHETES',   icon: '◉', desc: 'Destaque e feed geral' },
  { id: 'entrevistas', label: 'ENTREVISTAS', icon: '🎙', desc: 'Sala de imprensa'      },
  { id: 'bastidores',  label: 'BASTIDORES',  icon: '👁', desc: 'Rumores e bastidores'  },
  { id: 'analise',     label: 'ANÁLISE',     icon: '◆', desc: 'Táticas e colunas'     },
  { id: 'arquivo',     label: 'ARQUIVO',     icon: '◫', desc: 'Histórico por ano'     },
];

// Cores de jornalistas (NewsEngine + InterviewEngine mapeados)
const JOURNALIST_COLORS = {
  CARVALHO: '#D4A017', PETROV: '#4A90D9', FONTAINE: '#E040FB',
  NAKANO:   '#2ECC71', REED:   '#D4561E', SANTOS:   '#F48FB1',
  SILVA:    '#78909C', KOWALSKI:'#9C27B0',
  marina:   '#E8C84A', david:  '#4A90D9', sofia:    '#AB47BC',
  aleksei:  '#EF5350', camila: '#2ECC71',
};

// Tipos que vão para cada mesa
const DESK_TYPES = {
  manchetes:   null, // todos
  bastidores:  new Set(['RUMOR','LIFE_RUMOR','LIFE_EVENT','RETIREMENT']),
  analise:     new Set(['ANALYSIS','COLUMN','TOURNAMENT_WRAP','RECORD','RIVAL_ANALYSIS']),
};

// ═══════════════════════════════════════════════════════════════════
// CSS INJECTION
// ═══════════════════════════════════════════════════════════════════
let _injected = false;
function injectCSS() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.textContent = `
    @keyframes pc-in     { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
    @keyframes pc-slide  { from{opacity:0;transform:translateX(-12px)} to{opacity:1;transform:none} }
    @keyframes pc-fade   { from{opacity:0} to{opacity:1} }
    @keyframes pc-pulse  { 0%,100%{opacity:.3;transform:scale(1)} 50%{opacity:1;transform:scale(1.2)} }
    @keyframes pc-ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }

    .pc-desk-btn {
      display:flex; align-items:center; gap:9px;
      padding:10px 16px; border:none; background:transparent;
      cursor:pointer; width:100%; text-align:left;
      border-left:2px solid transparent;
      transition:all .15s;
    }
    .pc-desk-btn:hover { background:rgba(255,255,255,.04); border-left-color:rgba(255,255,255,.15); }
    .pc-desk-btn.active { background:rgba(232,200,74,.08); border-left-color:#E8C84A; }

    .pc-article-card {
      border:1px solid rgba(255,255,255,.06);
      background:rgba(255,255,255,.018);
      cursor:pointer;
      transition:all .18s ease;
      position:relative; overflow:hidden;
    }
    .pc-article-card:hover {
      background:rgba(255,255,255,.042);
      border-color:rgba(255,255,255,.14);
      transform:translateY(-1px);
    }

    .pc-journalist-chip {
      display:inline-flex; align-items:center; gap:5px;
      padding:5px 10px; border:1px solid rgba(255,255,255,.08);
      background:transparent; cursor:pointer;
      font-family:'Space Mono',monospace; font-size:8px;
      font-weight:700; letter-spacing:.14em; text-transform:uppercase;
      transition:all .15s; white-space:nowrap;
    }
    .pc-journalist-chip:hover { border-color:rgba(255,255,255,.2); background:rgba(255,255,255,.04); }
    .pc-journalist-chip.active { border-width:2px; }

    .pc-qa-card {
      padding:18px 22px;
      border-left:2px solid rgba(255,255,255,.08);
      background:rgba(255,255,255,.014);
      margin-bottom:2px;
      transition:all .15s;
    }
    .pc-qa-card:hover { background:rgba(255,255,255,.03); }

    .pc-opp-card {
      padding:14px 18px;
      border:1px solid rgba(255,255,255,.07);
      background:rgba(255,255,255,.02);
      cursor:pointer;
      transition:all .15s;
      animation:pc-in .3s ease both;
    }
    .pc-opp-card:hover { background:rgba(255,255,255,.05); border-color:rgba(255,255,255,.14); }

    .pc-scroll::-webkit-scrollbar { width:2px; }
    .pc-scroll::-webkit-scrollbar-thumb { background:rgba(212,86,30,.4); border-radius:2px; }
    .pc-scroll::-webkit-scrollbar-track { background:transparent; }

    .pc-tag {
      font-family:'Space Mono',monospace; font-size:7.5px; letter-spacing:.18em;
      padding:3px 8px; border:1px solid rgba(255,255,255,.1);
      color:rgba(242,237,228,.4); text-transform:uppercase;
    }

    .pc-hero-shimmer::before {
      content:''; position:absolute; inset:0; pointer-events:none;
      background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.014) 50%,transparent 70%);
      animation:pc-fade 4s ease-in-out infinite alternate;
    }
  `;
  document.head.appendChild(el);
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function jColor(journalist) {
  if (!journalist) return T.gold;
  const id = journalist.id ?? journalist;
  return JOURNALIST_COLORS[id] ?? journalist.color ?? T.gold;
}

function NewsTypeBadge({ type, small }) {
  const cfg = NEWS_TYPES[type] ?? { icon: '·', label: type, color: T.faint };
  const sz = small ? 7 : 8;
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:3,
      fontFamily:T.mono, fontSize:sz, letterSpacing:'.16em', textTransform:'uppercase',
      padding: small ? '2px 5px' : '3px 8px',
      background:`${cfg.color}14`, border:`1px solid ${cfg.color}33`, color:cfg.color,
      whiteSpace:'nowrap', flexShrink:0,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function JournalistByline({ journalist, accent, compact }) {
  if (!journalist) return null;
  const color = accent ?? jColor(journalist);
  return (
    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
      <span style={{ fontSize: compact ? 12 : 14 }}>{journalist.icon}</span>
      <div>
        <span style={{
          fontFamily:T.cond, fontSize: compact ? 11 : 12, fontWeight:700,
          letterSpacing:'.07em', textTransform:'uppercase', color,
        }}>{journalist.name}</span>
        {!compact && journalist.outlet && (
          <span style={{ fontFamily:T.mono, fontSize:8, color:T.faint, marginLeft:6, letterSpacing:'.1em' }}>
            · {journalist.outlet}
          </span>
        )}
      </div>
    </div>
  );
}

function EditorialAngleTag({ article, compact = false }) {
  const angle = article?.editorialAngle;
  if (!angle?.label) return null;
  const color = jColor(article?.journalist);
  return (
    <span style={{
      display:'inline-flex', alignItems:'center',
      fontFamily:T.mono, fontSize:compact ? 6.5 : 7.5, letterSpacing:'.18em',
      textTransform:'uppercase', padding:compact ? '2px 6px' : '3px 8px',
      border:`1px solid ${color}33`, color:`${color}CC`, background:`${color}10`,
      whiteSpace:'nowrap',
    }}>
      {angle.label}
    </span>
  );
}

function EditorialFormatLine({ article, color, compact = false }) {
  const label = article?.editorialFormat?.label;
  const kicker = article?.editorialKicker;
  if (!label && !kicker) return null;
  return (
    <div style={{
      fontFamily:T.mono, fontSize:compact ? 6.5 : 7.5,
      letterSpacing:compact ? '.14em' : '.24em',
      color:`${color ?? T.gold}99`, textTransform:'uppercase',
      marginBottom:compact ? 6 : 10,
      whiteSpace:compact ? 'nowrap' : 'normal',
      overflow:'hidden', textOverflow:'ellipsis',
    }}>
      {kicker ?? label}
    </div>
  );
}

function EditorialMemoryBlock({ article, color }) {
  const memory = article?.editorialMemory;
  if (!memory?.echoes?.length) return null;
  return (
    <div style={{
      margin:'0 0 32px', padding:'14px 16px',
      border:`1px solid ${color}22`, borderLeft:`3px solid ${color}77`,
      background:`${color}08`,
    }}>
      <div style={{ fontFamily:T.mono, fontSize:7.5, color:`${color}CC`, letterSpacing:'.28em', textTransform:'uppercase', marginBottom:10 }}>
        ecos no arquivo
      </div>
      <div style={{ fontFamily:T.body, fontSize:12.5, color:'rgba(242,237,228,.58)', lineHeight:1.55, marginBottom:10 }}>
        {memory.summary}
      </div>
      <div style={{ display:'grid', gap:7 }}>
        {memory.echoes.slice(0, 3).map((echo, idx) => (
          <div key={echo.id ?? idx} style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:9, alignItems:'start' }}>
            <span style={{ fontFamily:T.mono, fontSize:7, color:`${color}99`, letterSpacing:'.16em' }}>
              {echo.year ?? '--'}
            </span>
            <span style={{ fontFamily:T.cond, fontSize:13, color:'rgba(242,237,228,.78)', lineHeight:1.3 }}>
              {echo.headline}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayerAvatar({ player, size = 28 }) {
  const [ok, setOk] = useState(!!player?.photo);
  const initials = player?.name?.slice(0,2)?.toUpperCase() ?? '?';
  const bc = player?.color ? `${player.color}88` : T.borderMid;
  const base = {
    width:size, height:size, borderRadius:'50%', flexShrink:0,
    overflow:'hidden', border:`1.5px solid ${bc}`,
    background:player?.color||'#1a2a1a',
    display:'flex', alignItems:'center', justifyContent:'center',
  };
  if (player?.photo && ok) {
    return (
      <div style={base}>
        <img src={player.photo} alt={player.name} onError={()=>setOk(false)}
          style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top center' }}/>
      </div>
    );
  }
  return (
    <div style={{ ...base, fontSize:size*.34, fontWeight:700, color:'#fff', fontFamily:T.disp }}>
      {initials}
    </div>
  );
}

// Extrai um pullquote do corpo do artigo (primeira frase relevante)
function extractPullQuote(body) {
  if (!body) return null;
  const sentences = body.split(/[.!?]/).map(s => s.trim()).filter(s => s.length > 40 && s.length < 160);
  return sentences[1] ?? sentences[0] ?? null;
}

// ═══════════════════════════════════════════════════════════════════
// ARTICLE READER (modo leitura imersivo)
// ═══════════════════════════════════════════════════════════════════
function ArticleReader({ article, onBack }) {
  const color = jColor(article.journalist);
  const sc = article.tournament?.surface;
  const surfColors = { CLAY:'#D4561E', GRASS:'#2ECC71', HARD:'#4A90D9', INDOOR:'#AB47BC' };
  const pullQuote = extractPullQuote(article.body);

  return (
    <div style={{ animation:'pc-in .3s ease both', paddingBottom:60 }}>
      {/* Topbar */}
      <div style={{
        display:'flex', alignItems:'center', gap:14, padding:'18px 48px',
        borderBottom:`1px solid ${color}22`, background:`${color}05`,
        position:'sticky', top:0, zIndex:10,
      }}>
        <button onClick={onBack} style={{
          fontFamily:T.mono, fontSize:8, letterSpacing:'.22em', padding:'7px 14px',
          background:'transparent', border:'1px solid rgba(255,255,255,.1)',
          color:T.faint, cursor:'pointer', textTransform:'uppercase', transition:'all .15s',
        }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=`${color}66`;e.currentTarget.style.color=color;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.1)';e.currentTarget.style.color=T.faint;}}
        >← VOLTAR</button>
        <div style={{ flex:1 }}/>
        <NewsTypeBadge type={article.type} />
        <EditorialAngleTag article={article} />
        {article.tournament && (
          <span style={{ fontFamily:T.mono, fontSize:8, color:T.faint, letterSpacing:'.2em' }}>
            {article.tournament.name?.toUpperCase()}
          </span>
        )}
      </div>

      {/* Hero area */}
      <div style={{
        padding:'52px 48px 36px',
        borderBottom:`1px solid rgba(255,255,255,.05)`,
        position:'relative', overflow:'hidden',
        background:`linear-gradient(180deg, ${color}08 0%, transparent 100%)`,
      }}>
        {sc && (
          <div style={{
            position:'absolute', top:0, right:0, width:'35%', height:'100%',
            background:`radial-gradient(ellipse at 90% 40%, ${surfColors[sc]}12, transparent 70%)`,
            pointerEvents:'none',
          }}/>
        )}
        <div style={{ maxWidth:820, margin:'0 auto' }}>
          {/* Meta row */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:22, flexWrap:'wrap' }}>
            {article.journalist && <JournalistByline journalist={article.journalist} accent={color} />}
            <div style={{ flex:1 }}/>
            {article.year && (
              <span style={{ fontFamily:T.mono, fontSize:8, color:T.faint, letterSpacing:'.28em' }}>
                TEMPORADA {article.year}
              </span>
            )}
          </div>

          {/* Headline */}
          <EditorialFormatLine article={article} color={color} />
          <h1 style={{
            fontFamily:T.disp, fontSize:'clamp(32px,4.5vw,60px)', letterSpacing:'.03em',
            color:T.white, textTransform:'uppercase', lineHeight:1.02, margin:'0 0 18px',
            borderLeft:`4px solid ${color}`, paddingLeft:22,
          }}>
            {article.headline}
          </h1>

          {/* Deck */}
          {article.deck && (
            <p style={{
              fontFamily:T.cond, fontSize:18, fontWeight:400, color:T.dim,
              lineHeight:1.6, margin:'0 0 0 26px',
            }}>
              {article.deck}
            </p>
          )}
          {article.editorialAngle?.thesis && (
            <div style={{
              fontFamily:T.body, fontSize:13.5, color:`${color}BB`, lineHeight:1.55,
              margin:'16px 0 0 26px', padding:'10px 13px',
              borderLeft:`2px solid ${color}66`, background:`${color}0B`,
            }}>
              {article.editorialAngle.thesis}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding:'36px 48px', maxWidth:820, margin:'0 auto' }}>
        <div style={{ height:1, background:`linear-gradient(90deg,${color}55,transparent)`, marginBottom:32 }}/>
        <EditorialMemoryBlock article={article} color={color} />

        {/* Pull quote */}
        {pullQuote && (
          <blockquote style={{
            margin:'0 0 32px', padding:'16px 24px',
            borderLeft:`3px solid ${color}88`,
            background:`${color}08`,
          }}>
            <p style={{
              fontFamily:T.cond, fontSize:20, fontWeight:400, fontStyle:'italic',
              color:`${color}cc`, lineHeight:1.55, margin:0,
            }}>
              "{pullQuote}"
            </p>
          </blockquote>
        )}

        {/* Body text */}
        {article.body && (
          <div style={{
            fontFamily:T.body, fontSize:16, color:'rgba(242,237,228,.72)',
            lineHeight:1.92, whiteSpace:'pre-line',
          }}>
            {article.body}
          </div>
        )}

        {/* Tags */}
        {article.tags?.length > 0 && (
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:44, paddingTop:24, borderTop:'1px solid rgba(255,255,255,.06)' }}>
            {article.tags.map(tag => <span key={tag} className="pc-tag">#{tag}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ARTICLE CARD VARIANTS
// ═══════════════════════════════════════════════════════════════════

function ArticleHero({ article, onClick }) {
  if (!article) return null;
  const color = jColor(article.journalist);
  const sc = article.tournament?.surface;
  const surfColors = { CLAY:'#D4561E', GRASS:'#2ECC71', HARD:'#4A90D9', INDOOR:'#AB47BC' };

  return (
    <div className="pc-article-card pc-hero-shimmer" onClick={onClick} style={{
      padding:'32px 36px', height:'100%',
      borderLeft:`3px solid ${color}`,
    }}>
      {sc && <div style={{ position:'absolute',top:0,right:0,width:'38%',height:'100%',background:`radial-gradient(ellipse at 100% 30%,${surfColors[sc]}12,transparent 70%)`,pointerEvents:'none' }}/>}
      <div style={{ position:'relative' }}>
        <EditorialFormatLine article={article} color={color} />
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, flexWrap:'wrap' }}>
          <NewsTypeBadge type={article.type} />
          <EditorialAngleTag article={article} />
          {article.tournament && (
            <span style={{ fontFamily:T.mono, fontSize:7.5, color:T.faint, letterSpacing:'.2em' }}>
              {article.tournament.name?.toUpperCase()}
            </span>
          )}
          {article.journalist && (
            <span style={{ marginLeft:'auto', fontFamily:T.mono, fontSize:7.5, color:`${color}99`, letterSpacing:'.12em' }}>
              {article.journalist.icon} {article.journalist.name}
            </span>
          )}
        </div>
        <div style={{
          fontFamily:T.disp, fontSize:'clamp(24px,2.6vw,40px)', letterSpacing:'.03em',
          color:T.white, textTransform:'uppercase', lineHeight:1.08, marginBottom:12,
        }}>
          {article.headline}
        </div>
        {article.deck && (
          <p style={{ fontFamily:T.cond, fontSize:14, color:T.dim, lineHeight:1.6, margin:'0 0 16px' }}>
            {article.deck}
          </p>
        )}
        {article.body && (
          <p style={{
            fontFamily:T.body, fontSize:12, color:'rgba(242,237,228,.36)', lineHeight:1.7,
            margin:0, display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden',
          }}>
            {article.body}
          </p>
        )}
        <div style={{ marginTop:16, fontFamily:T.mono, fontSize:7.5, color:`${color}77`, letterSpacing:'.3em' }}>
          LER MAIS ›
        </div>
      </div>
    </div>
  );
}

function ArticleCard({ article, onClick, compact }) {
  if (!article) return null;
  const color = jColor(article.journalist);
  return (
    <div className="pc-article-card" onClick={onClick} style={{
      padding: compact ? '12px 14px' : '16px 20px',
      borderTop:`2px solid ${color}44`,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
        <NewsTypeBadge type={article.type} small />
        <EditorialAngleTag article={article} compact />
        {article.tournament && (
          <span style={{ fontFamily:T.mono, fontSize:6.5, color:T.faint, letterSpacing:'.18em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
            {article.tournament.name?.toUpperCase()}
          </span>
        )}
      </div>
      <div style={{
        fontFamily:T.disp, fontSize: compact ? 13 : 16, letterSpacing:'.04em',
        color:T.white, textTransform:'uppercase', lineHeight:1.15,
        marginBottom:6,
      }}>
        {article.headline}
      </div>
      {!compact && <EditorialFormatLine article={article} color={color} compact />}
      {!compact && article.deck && (
        <p style={{ fontFamily:T.cond, fontSize:11.5, color:T.faint, lineHeight:1.5, margin:'0 0 8px',
          display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
          {article.deck}
        </p>
      )}
      {article.journalist && (
        <div style={{ fontFamily:T.mono, fontSize:7, color:`${color}88`, letterSpacing:'.12em' }}>
          {article.journalist.icon} {article.journalist.name}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DESK: MANCHETES
// ═══════════════════════════════════════════════════════════════════
function ManchetesDesk({ articles, onArticle }) {
  const hero       = articles[0] ?? null;
  const secondary  = articles.slice(1, 4);
  const grid       = articles.slice(4);

  if (articles.length === 0) return <EmptyDesk label="Nenhuma matéria ainda" hint="Simule torneios para gerar artigos" />;

  return (
    <div style={{ animation:'pc-in .3s ease both' }}>
      {/* Hero + secondary */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', minHeight:400, borderBottom:'1px solid rgba(255,255,255,.06)' }}>
        <div style={{ borderRight:'1px solid rgba(255,255,255,.06)', padding:4 }}>
          <ArticleHero article={hero} onClick={()=>onArticle(hero)} />
        </div>
        <div style={{ display:'flex', flexDirection:'column' }}>
          {secondary.length > 0 ? secondary.map((art,i) => (
            <div key={art.id??i} style={{
              flex:1, padding:4,
              borderBottom: i<secondary.length-1 ? '1px solid rgba(255,255,255,.06)' : 'none',
            }}>
              <ArticleCard article={art} onClick={()=>onArticle(art)} />
            </div>
          )) : (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
              <div style={{ fontFamily:T.mono, fontSize:8, color:T.faint, letterSpacing:'.22em' }}>
                MAIS MATÉRIAS APÓS TORNEIOS
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      {grid.length > 0 && (
        <div style={{ padding:'28px 28px 40px' }}>
          <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.4em', color:T.faint, textTransform:'uppercase', marginBottom:18, display:'flex', alignItems:'center', gap:10 }}>
            MAIS MATÉRIAS
            <div style={{ flex:1, height:1, background:'linear-gradient(90deg,rgba(255,255,255,.07),transparent)' }}/>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:8 }}>
            {grid.map((art,i) => (
              <ArticleCard key={art.id??i} article={art} onClick={()=>onArticle(art)} compact />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DESK: BASTIDORES
// ═══════════════════════════════════════════════════════════════════
function BastidoresDesk({ articles, onArticle }) {
  const filtered = articles.filter(a => DESK_TYPES.bastidores.has(a.type));

  if (filtered.length === 0) return (
    <EmptyDesk label="Nenhum rumor por enquanto" hint="Bastidores emergem com o tempo e com torneios" />
  );

  return (
    <div style={{ animation:'pc-in .3s ease both' }}>
      {/* Header editorial do Bastidores */}
      <div style={{
        padding:'20px 28px 18px',
        borderBottom:'1px solid rgba(224,64,251,.12)',
        background:'rgba(224,64,251,.04)',
        display:'flex', alignItems:'center', gap:14,
      }}>
        <div style={{ width:3, height:36, background:'#E040FB', opacity:.7 }}/>
        <div>
          <div style={{ fontFamily:T.mono, fontSize:7.5, letterSpacing:'.38em', color:'#E040FB', textTransform:'uppercase', marginBottom:4 }}>
            MESA DE BASTIDORES — FONTES RESERVADAS
          </div>
          <div style={{ fontFamily:T.cond, fontSize:13, color:T.faint }}>
            Rumores, vida pessoal e o que acontece fora da quadra
          </div>
        </div>
      </div>

      <div style={{ padding:'24px 28px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {filtered.map((art, i) => {
          const color = jColor(art.journalist);
          const isRumor = art.type === 'RUMOR' || art.type === 'LIFE_RUMOR';
          return (
            <div
              key={art.id??i}
              className="pc-article-card"
              onClick={()=>onArticle(art)}
              style={{
                padding:'18px 20px',
                borderLeft:`3px solid ${isRumor ? '#E040FB' : color}`,
                gridColumn: i === 0 ? 'span 2' : undefined,
              }}
            >
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <NewsTypeBadge type={art.type} small />
                {isRumor && (
                  <span style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.22em', color:'#E040FB', background:'rgba(224,64,251,.1)', border:'1px solid rgba(224,64,251,.25)', padding:'2px 6px' }}>
                    NÃO CONFIRMADO
                  </span>
                )}
                <div style={{ flex:1 }}/>
                {art.journalist && (
                  <span style={{ fontFamily:T.mono, fontSize:7.5, color:`${color}88` }}>
                    {art.journalist.icon} {art.journalist.name}
                  </span>
                )}
              </div>
              <div style={{
                fontFamily:T.disp, fontSize: i===0 ? 22 : 16, letterSpacing:'.04em',
                color:T.white, textTransform:'uppercase', lineHeight:1.1, marginBottom:8,
              }}>
                {art.headline}
              </div>
              {art.deck && (
                <p style={{ fontFamily:T.body, fontSize:12, color:T.faint, lineHeight:1.65, margin:0 }}>
                  {art.deck}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DESK: ANÁLISE
// ═══════════════════════════════════════════════════════════════════
function AnaliseDesk({ articles, onArticle }) {
  const filtered = articles.filter(a => DESK_TYPES.analise.has(a.type));

  if (filtered.length === 0) return (
    <EmptyDesk label="Nenhuma análise ainda" hint="Análises surgem após torneios Masters e Grand Slams" />
  );

  const featured = filtered[0];
  const rest     = filtered.slice(1);

  return (
    <div style={{ animation:'pc-in .3s ease both' }}>
      <div style={{
        padding:'18px 28px', borderBottom:'1px solid rgba(74,144,217,.12)',
        background:'rgba(74,144,217,.03)',
        display:'flex', alignItems:'center', gap:10,
      }}>
        <div style={{ width:3, height:36, background:'#4A90D9', opacity:.7 }}/>
        <div>
          <div style={{ fontFamily:T.mono, fontSize:7.5, letterSpacing:'.38em', color:'#4A90D9', textTransform:'uppercase', marginBottom:4 }}>
            MESA DE ANÁLISE — DADOS E PERSPECTIVA
          </div>
          <div style={{ fontFamily:T.cond, fontSize:13, color:T.faint }}>Táticas, colunas de opinião e balanços de torneio</div>
        </div>
      </div>

      {/* Featured analysis */}
      {featured && (
        <div style={{ padding:'24px 28px', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
          <div className="pc-article-card" onClick={()=>onArticle(featured)} style={{
            padding:'28px 32px',
            borderLeft:`3px solid ${jColor(featured.journalist)}`,
          }}>
            <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:14 }}>
                  <NewsTypeBadge type={featured.type} />
                  {featured.journalist && <JournalistByline journalist={featured.journalist} compact />}
                </div>
                <div style={{ fontFamily:T.disp, fontSize:'clamp(22px,2.5vw,36px)', letterSpacing:'.03em', color:T.white, textTransform:'uppercase', lineHeight:1.08, marginBottom:10 }}>
                  {featured.headline}
                </div>
                {featured.deck && (
                  <p style={{ fontFamily:T.cond, fontSize:15, color:T.dim, lineHeight:1.6, margin:'0 0 12px' }}>{featured.deck}</p>
                )}
                {featured.body && (
                  <p style={{ fontFamily:T.body, fontSize:13, color:'rgba(242,237,228,.38)', lineHeight:1.75, margin:0,
                    display:'-webkit-box', WebkitLineClamp:4, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                    {featured.body}
                  </p>
                )}
              </div>
              {featured.player && (
                <div style={{ flexShrink:0 }}>
                  <PlayerAvatar player={featured.player} size={54} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rest in list */}
      {rest.length > 0 && (
        <div style={{ padding:'20px 28px', display:'flex', flexDirection:'column', gap:6 }}>
          {rest.map((art,i) => {
            const color = jColor(art.journalist);
            return (
              <div key={art.id??i} className="pc-article-card" onClick={()=>onArticle(art)} style={{
                padding:'14px 18px', display:'flex', gap:14, alignItems:'center',
                borderLeft:`2px solid ${color}44`,
              }}>
                <NewsTypeBadge type={art.type} small />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:T.disp, fontSize:14, color:T.white, textTransform:'uppercase', letterSpacing:'.04em', lineHeight:1.2 }}>{art.headline}</div>
                  {art.deck && <p style={{ fontFamily:T.cond, fontSize:11, color:T.faint, margin:'3px 0 0', lineHeight:1.45, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{art.deck}</p>}
                </div>
                {art.journalist && <span style={{ fontFamily:T.mono, fontSize:8, color:`${color}88`, whiteSpace:'nowrap' }}>{art.journalist.icon}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DESK: ENTREVISTAS
// ═══════════════════════════════════════════════════════════════════
function EntrevistasDesk({ state }) {
  const [selectedOpp, setSelectedOpp]   = useState(null);
  const [interview,   setInterview]     = useState(null);
  const [loading,     setLoading]       = useState(false);
  const [customPlayer, setCustomPlayer] = useState(null);
  const [customCtx,    setCustomCtx]    = useState('POST_WIN');
  const [showCustom,   setShowCustom]   = useState(false);

  // Deriva oportunidades do universo
  const opportunities = useMemo(() => {
    try { return deriveInterviewOpportunities(state).slice(0, 12); }
    catch { return []; }
  }, [state]);

  const allPlayers = useMemo(() =>
    [...(state?.tourPlayers??[]), ...(state?.prospects??[])].sort((a,b)=>(a.rankPosition??999)-(b.rankPosition??999)),
  [state]);

  const doInterview = useCallback((opp) => {
    if (!opp) return;
    if (opp.publishedInterview) {
      setSelectedOpp(opp);
      setInterview(opp.publishedInterview);
      setLoading(false);
      return;
    }
    setLoading(true);
    setSelectedOpp(opp);
    setInterview(null);
    setTimeout(() => {
      try {
        const result = generateInterview(opp.player, opp.contextId, state, opp.params, 6, opp.journalist);
        setInterview(result);
      } catch(e) { console.error(e); }
      setLoading(false);
    }, 120);
  }, [state]);

  const doCustom = useCallback(() => {
    const player = customPlayer ?? allPlayers[0];
    if (!player) return;
    setLoading(true);
    setInterview(null);
    const fakeOpp = {
      player, contextId: customCtx,
      journalist: Object.values(INTERVIEW_JOURNALISTS)[Math.floor(Math.random()*5)],
      params: {},
    };
    setSelectedOpp(fakeOpp);
    setTimeout(() => {
      try {
        const result = generateInterview(player, customCtx, state, {}, 6, fakeOpp.journalist);
        setInterview(result);
      } catch(e) { console.error(e); }
      setLoading(false);
    }, 120);
  }, [customPlayer, customCtx, allPlayers, state]);

  const ctxKeys = Object.keys(INTERVIEW_CONTEXTS);

  return (
    <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', minHeight:'60vh', animation:'pc-in .3s ease both' }}>
      {/* Left: oportunidades + custom */}
      <div style={{ borderRight:'1px solid rgba(255,255,255,.06)', display:'flex', flexDirection:'column' }}>
        {/* Header */}
        <div style={{ padding:'18px 20px', borderBottom:'1px solid rgba(255,255,255,.06)', background:'rgba(232,200,74,.04)' }}>
          <div style={{ fontFamily:T.mono, fontSize:7.5, letterSpacing:'.36em', color:T.gold, textTransform:'uppercase', marginBottom:4 }}>SALA DE IMPRENSA</div>
          <div style={{ fontFamily:T.cond, fontSize:12, color:T.faint }}>Oportunidades do universo</div>
        </div>

        {/* Lista de oportunidades */}
        <div className="pc-scroll" style={{ flex:1, overflowY:'auto', padding:'12px' }}>
          {opportunities.length > 0 ? opportunities.map((opp, i) => {
            const ctx   = INTERVIEW_CONTEXTS[opp.contextId];
            const color = jColor(opp.journalist);
            const active= selectedOpp?.id === opp.id;
            return (
              <div key={opp.id??i} className="pc-opp-card" onClick={()=>doInterview(opp)} style={{
                marginBottom:4,
                borderLeft:`2px solid ${active ? color : 'transparent'}`,
                background: active ? `${color}10` : undefined,
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <span style={{ fontSize:13 }}>{ctx?.icon ?? '🎙'}</span>
                  <span style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.2em', color, textTransform:'uppercase' }}>
                    {ctx?.label ?? opp.contextId}
                  </span>
                  {opp.journalist && (
                    <span style={{ marginLeft:'auto', fontFamily:T.mono, fontSize:7, color:`${color}77` }}>
                      {opp.journalist.icon}
                    </span>
                  )}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <PlayerAvatar player={opp.player} size={24} />
                  <span style={{ fontFamily:T.cond, fontSize:13, fontWeight:700, color:T.white, letterSpacing:'.04em', textTransform:'uppercase', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {opp.player?.name}
                  </span>
                </div>
                {opp.params?.tournament && (
                  <div style={{ fontFamily:T.mono, fontSize:7, color:T.faint, letterSpacing:'.16em', marginTop:5 }}>
                    {opp.params.grandSlamChampion ? 'CAMPEÃO DE GRAND SLAM · ' : ''}{opp.params.tournament?.toUpperCase()}
                  </div>
                )}
                {opp.monthIndex && (
                  <div style={{ fontFamily:T.mono, fontSize:7, color:T.faint, letterSpacing:'.16em', marginTop:5 }}>
                    ENTREVISTA MENSAL · MÊS {opp.monthIndex}
                  </div>
                )}
              </div>
            );
          }) : (
            <div style={{ fontFamily:T.mono, fontSize:9, color:T.faint, letterSpacing:'.2em', textAlign:'center', marginTop:24 }}>
              Simule torneios para gerar oportunidades
            </div>
          )}
        </div>

        {/* Custom interview */}
        <div style={{ borderTop:'1px solid rgba(255,255,255,.08)', padding:'14px' }}>
          <button onClick={()=>setShowCustom(v=>!v)} style={{
            width:'100%', fontFamily:T.mono, fontSize:8, letterSpacing:'.2em', padding:'8px 12px',
            background:showCustom?'rgba(232,200,74,.08)':'rgba(255,255,255,.04)',
            border:`1px solid ${showCustom?'rgba(232,200,74,.35)':'rgba(255,255,255,.1)'}`,
            color:showCustom?T.gold:T.faint, cursor:'pointer', textTransform:'uppercase', transition:'all .15s',
          }}>
            + ENTREVISTA MANUAL
          </button>
          {showCustom && (
            <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:8 }}>
              <select
                value={customPlayer?.id ?? ''}
                onChange={e=>{const p=allPlayers.find(x=>x.id===e.target.value);setCustomPlayer(p??null);}}
                style={{ fontFamily:T.cond, fontSize:12, padding:'6px 8px', background:T.bgCard, border:'1px solid rgba(255,255,255,.1)', color:T.dim, width:'100%' }}
              >
                <option value="">Selecionar jogador...</option>
                {allPlayers.slice(0,30).map(p=>(
                  <option key={p.id} value={p.id}>#{p.rankPosition} {p.name}</option>
                ))}
              </select>
              <select
                value={customCtx}
                onChange={e=>setCustomCtx(e.target.value)}
                style={{ fontFamily:T.cond, fontSize:12, padding:'6px 8px', background:T.bgCard, border:'1px solid rgba(255,255,255,.1)', color:T.dim, width:'100%' }}
              >
                {ctxKeys.map(k=>(
                  <option key={k} value={k}>{INTERVIEW_CONTEXTS[k]?.icon} {INTERVIEW_CONTEXTS[k]?.label ?? k}</option>
                ))}
              </select>
              <button onClick={doCustom} style={{
                fontFamily:T.mono, fontSize:8, letterSpacing:'.2em', padding:'8px 0',
                background:'rgba(212,86,30,.12)', border:'1px solid rgba(212,86,30,.4)',
                color:T.clayLight, cursor:'pointer', textTransform:'uppercase',
              }}>
                GERAR ENTREVISTA
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right: interview viewer */}
      <div style={{ overflow:'auto' }} className="pc-scroll">
        {loading && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
            <div style={{ fontFamily:T.mono, fontSize:9, letterSpacing:'.3em', color:T.faint, animation:'pc-pulse 1.5s ease-in-out infinite' }}>
              GERANDO ENTREVISTA...
            </div>
          </div>
        )}

        {!loading && !interview && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:300, gap:12 }}>
            <div style={{ fontFamily:T.disp, fontSize:32, color:'rgba(242,237,228,.06)', letterSpacing:'.08em', textTransform:'uppercase' }}>SALA DE IMPRENSA</div>
            <div style={{ fontFamily:T.mono, fontSize:9, color:T.faint, letterSpacing:'.26em' }}>SELECIONE UMA OPORTUNIDADE</div>
          </div>
        )}

        {!loading && interview && <InterviewReader interview={interview} onNew={()=>setInterview(null)} />}
      </div>
    </div>
  );
}

// Interview reader
function InterviewReader({ interview, onNew }) {
  const { context, journalist, player, pairs, headline, tone } = interview;
  const jColor_ = jColor(journalist);
  const ctx = context ?? INTERVIEW_CONTEXTS[interview.contextId] ?? {};

  const TONE_META = {
    warm_open:           { label:'Carismático',  color:'#E8C84A', icon:'😄' },
    brief_professional:  { label:'Reservado',    color:'#90A4AE', icon:'🧊' },
    direct_provocative:  { label:'Confrontador', color:'#EF5350', icon:'🔥' },
    theatrical_warm:     { label:'Showman',      color:'#AB47BC', icon:'🎭' },
    measured_safe:       { label:'Diplomático',  color:'#4A90D9', icon:'🤝' },
    sparse_deep:         { label:'Enigmático',   color:'#78909C', icon:'🌑' },
    analytical_profound: { label:'Intelectual',  color:'#26C6DA', icon:'🔬' },
  };
  const toneMeta = TONE_META[tone] ?? { label: tone, color: T.faint, icon:'💬' };

  return (
    <div style={{ animation:'pc-in .3s ease both' }}>
      {/* Interview header */}
      <div style={{
        padding:'28px 32px 22px',
        borderBottom:`1px solid ${jColor_}22`,
        background:`linear-gradient(135deg,${jColor_}08,transparent 60%)`,
        position:'relative', overflow:'hidden',
      }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
          <div style={{ flex:1 }}>
            {/* Context badge */}
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, flexWrap:'wrap' }}>
              <span style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.2em', padding:'3px 8px', background:`${jColor_}18`, border:`1px solid ${jColor_}33`, color:jColor_, textTransform:'uppercase' }}>
                {ctx.icon} {ctx.label ?? interview.contextId}
              </span>
              <span style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.14em', padding:'3px 8px', background:`${toneMeta.color}12`, border:`1px solid ${toneMeta.color}28`, color:toneMeta.color }}>
                {toneMeta.icon} {toneMeta.label}
              </span>
            </div>
            {/* Headline */}
            <h2 style={{ fontFamily:T.disp, fontSize:'clamp(22px,2.8vw,38px)', letterSpacing:'.03em', color:T.white, textTransform:'uppercase', lineHeight:1.06, margin:'0 0 10px' }}>
              {headline}
            </h2>
            {/* Journalist */}
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <JournalistByline journalist={journalist} accent={jColor_} />
              {player && (
                <>
                  <span style={{ color:T.faint, fontFamily:T.mono, fontSize:9 }}>×</span>
                  <PlayerAvatar player={player} size={22} />
                  <span style={{ fontFamily:T.cond, fontSize:13, fontWeight:700, color:T.dim, textTransform:'uppercase', letterSpacing:'.04em' }}>
                    {player.name}
                  </span>
                </>
              )}
            </div>
          </div>
          <div style={{ flexShrink:0 }}>
            <PlayerAvatar player={player} size={56} />
          </div>
        </div>
      </div>

      {/* Q&A */}
      <div style={{ padding:'24px 32px' }}>
        {pairs.map((pair, i) => {
          const topicMeta = TOPIC_META[pair.topic] ?? { label: pair.topic, icon:'💬' };
          return (
            <div key={i} className="pc-qa-card" style={{ marginBottom:16, borderLeftColor:`${jColor_}44` }}>
              {/* Topic */}
              <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.24em', color:`${jColor_}88`, textTransform:'uppercase', marginBottom:10 }}>
                {topicMeta.icon} {topicMeta.label}
              </div>
              {/* Question */}
              <div style={{ display:'flex', gap:10, marginBottom:12 }}>
                <span style={{ fontSize:11, flexShrink:0, marginTop:1 }}>{journalist?.icon ?? '🎙'}</span>
                <p style={{ fontFamily:T.cond, fontSize:14, fontWeight:600, color:jColor_, lineHeight:1.55, margin:0, fontStyle:'italic' }}>
                  {pair.question}
                </p>
              </div>
              {/* Answer */}
              <div style={{ display:'flex', gap:10 }}>
                <div style={{ width:2, background:`${toneMeta.color}44`, flexShrink:0, borderRadius:1 }}/>
                <p style={{ fontFamily:T.body, fontSize:13.5, color:'rgba(242,237,228,.78)', lineHeight:1.82, margin:0 }}>
                  {pair.answer}
                </p>
              </div>
            </div>
          );
        })}

        {/* Footer */}
        <div style={{ marginTop:24, display:'flex', gap:10 }}>
          <button onClick={onNew} style={{
            fontFamily:T.mono, fontSize:8, letterSpacing:'.2em', padding:'8px 18px',
            background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.1)',
            color:T.faint, cursor:'pointer', textTransform:'uppercase', transition:'all .15s',
          }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(232,200,74,.4)';e.currentTarget.style.color=T.gold;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.1)';e.currentTarget.style.color=T.faint;}}
          >
            NOVA ENTREVISTA
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DESK: ARQUIVO
// ═══════════════════════════════════════════════════════════════════
function ArquivoDesk({ allArticles, currentYear, onArticle }) {
  const years = useMemo(() => {
    const s = new Set(allArticles.map(a=>a.year).filter(Boolean));
    return [...s].sort((a,b)=>b-a);
  }, [allArticles]);

  const [selYear, setSelYear] = useState(null);  // null = todos
  // Auto-select latest year if none selected
  const effectiveYear = selYear ?? years[0] ?? currentYear;
  const [search,  setSearch]  = useState('');

  const filtered = useMemo(() => {
    return allArticles.filter(a => {
      if (effectiveYear && a.year !== effectiveYear) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          a.headline?.toLowerCase().includes(q) ||
          a.player?.name?.toLowerCase().includes(q) ||
          a.journalist?.name?.toLowerCase().includes(q) ||
          a.tags?.some(t=>t.toLowerCase().includes(q))
        );
      }
      return true;
    }).sort((a, b) => (b.archiveWeight ?? 0) - (a.archiveWeight ?? 0));
  }, [allArticles, selYear, search]);

  const seasonThreads = useMemo(() => {
    const map = new Map();
    for (const art of allArticles) {
      if (effectiveYear && art.year !== effectiveYear) continue;
      const key = art.editorialMemory?.threadId ?? art.editorialAngle?.id ?? art.type;
      if (!key) continue;
      const current = map.get(key) ?? {
        key,
        label: art.editorialAngle?.label ?? art.type,
        count: 0,
        weight: 0,
        article: art,
      };
      current.count += 1;
      current.weight += art.archiveWeight ?? 0;
      if ((art.archiveWeight ?? 0) > (current.article?.archiveWeight ?? 0)) current.article = art;
      map.set(key, current);
    }
    return [...map.values()].sort((a, b) => b.weight - a.weight).slice(0, 5);
  }, [allArticles, effectiveYear]);

  if (allArticles.length === 0) return <EmptyDesk label="Arquivo vazio" hint="Simule temporadas para construir o arquivo" />;

  return (
    <div style={{ animation:'pc-in .3s ease both' }}>
      {/* Controls */}
      <div style={{ padding:'18px 28px', borderBottom:'1px solid rgba(255,255,255,.07)', display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
        {/* Year filter */}
        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
          {years.map(y => (
            <button key={y} onClick={()=>setSelYear(y)} style={{
              fontFamily:T.mono, fontSize:8, letterSpacing:'.2em', padding:'5px 12px',
              background: selYear===y ? 'rgba(232,200,74,.12)' : 'rgba(255,255,255,.04)',
              border:`1px solid ${effectiveYear===y ? 'rgba(232,200,74,.5)' : 'rgba(255,255,255,.08)'}`,
              color: effectiveYear===y ? T.gold : T.faint, cursor:'pointer', textTransform:'uppercase', transition:'all .15s',
            }}>T.{y}</button>
          ))}
          {selYear !== null && (
            <button onClick={()=>setSelYear(null)} style={{
              fontFamily:T.mono, fontSize:8, letterSpacing:'.2em', padding:'5px 10px',
              background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.06)',
              color:'rgba(242,237,228,.22)', cursor:'pointer', transition:'all .15s',
            }}>TODOS</button>
          )}
        </div>
        {/* Search */}
        <input
          placeholder="Buscar por título, jogador, jornalista..."
          value={search}
          onChange={e=>setSearch(e.target.value)}
          style={{
            fontFamily:T.cond, fontSize:13, padding:'7px 14px', flex:1, minWidth:200,
            background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.09)',
            color:T.white, outline:'none',
          }}
        />
        <span style={{ fontFamily:T.mono, fontSize:8, color:T.faint, letterSpacing:'.2em', whiteSpace:'nowrap' }}>
          {filtered.length} MATÉRIAS
        </span>
      </div>

      {seasonThreads.length > 0 && (
        <div style={{ padding:'18px 28px', borderBottom:'1px solid rgba(255,255,255,.06)', background:'rgba(255,255,255,.012)' }}>
          <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.34em', color:T.faint, textTransform:'uppercase', marginBottom:12 }}>
            FIOS EDITORIAIS DA TEMPORADA
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))', gap:8 }}>
            {seasonThreads.map(thread => {
              const color = jColor(thread.article?.journalist);
              return (
                <button key={thread.key} onClick={() => onArticle(thread.article)} style={{
                  textAlign:'left', cursor:'pointer', padding:'11px 12px',
                  border:`1px solid ${color}24`, borderLeft:`2px solid ${color}88`,
                  background:`${color}08`, color:T.white,
                }}>
                  <div style={{ fontFamily:T.mono, fontSize:6.5, color:`${color}CC`, letterSpacing:'.18em', textTransform:'uppercase', marginBottom:5 }}>
                    {thread.label} / {thread.count} materia{thread.count > 1 ? 's' : ''}
                  </div>
                  <div style={{ fontFamily:T.cond, fontSize:14, color:'rgba(242,237,228,.78)', lineHeight:1.25 }}>
                    {thread.article?.headline}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Archive list */}
      <div style={{ padding:'16px 28px', display:'flex', flexDirection:'column', gap:4 }}>
        {filtered.length === 0 && (
          <div style={{ fontFamily:T.mono, fontSize:9, color:T.faint, letterSpacing:'.24em', textAlign:'center', padding:'40px 0' }}>
            NENHUMA MATÉRIA ENCONTRADA
          </div>
        )}
        {filtered.map((art,i) => {
          const color = jColor(art.journalist);
          return (
            <div key={art.id??i} className="pc-article-card" onClick={()=>onArticle(art)} style={{
              padding:'12px 16px', display:'flex', gap:14, alignItems:'center',
              borderLeft:`2px solid ${color}33`,
            }}>
              <span style={{ fontFamily:T.mono, fontSize:8, color:`${color}88`, letterSpacing:'.14em', whiteSpace:'nowrap' }}>
                T.{art.year}
              </span>
              <NewsTypeBadge type={art.type} small />
              <EditorialAngleTag article={art} compact />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:T.disp, fontSize:14, color:T.white, textTransform:'uppercase', letterSpacing:'.04em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {art.headline}
                </div>
              </div>
              {art.journalist && (
                <span style={{ fontFamily:T.mono, fontSize:7.5, color:`${color}77`, whiteSpace:'nowrap' }}>
                  {art.journalist.icon} {art.journalist.name}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════════════
function EmptyDesk({ label, hint }) {
  return (
    <div className="ui-empty-state" style={{ minHeight: 320 }}>
      <div className="ui-empty-kicker">Central de imprensa</div>
      <div className="ui-empty-title">{label}</div>
      <div className="ui-empty-copy">{hint}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// JOURNALIST STRIP
// ═══════════════════════════════════════════════════════════════════
function JournalistStrip({ articles, activeId, onSelect }) {
  // Agrupa todos os jornalistas que aparecem no feed
  const journalists = useMemo(() => {
    const map = {};
    articles.forEach(a => {
      if (!a.journalist) return;
      const j = a.journalist;
      const id = j.id ?? j.name;
      if (!map[id]) map[id] = { ...j, count: 0 };
      map[id].count++;
    });
    return Object.values(map).sort((a,b)=>b.count-a.count);
  }, [articles]);

  if (journalists.length === 0) return null;

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:6, padding:'10px 24px',
      borderBottom:'1px solid rgba(255,255,255,.05)',
      background:'rgba(0,0,0,.15)',
      overflowX:'auto',
    }} className="pc-scroll">
      {/* ALL chip */}
      <button
        className={`pc-journalist-chip ${!activeId ? 'active' : ''}`}
        onClick={()=>onSelect(null)}
        style={{
          color: !activeId ? T.gold : T.faint,
          borderColor: !activeId ? 'rgba(232,200,74,.4)' : undefined,
          background: !activeId ? 'rgba(232,200,74,.08)' : undefined,
        }}
      >
        <span style={{ fontFamily:T.mono }}>TODOS</span>
      </button>

      <div style={{ width:1, height:20, background:'rgba(255,255,255,.08)', flexShrink:0 }}/>

      {journalists.map(j => {
        const id    = j.id ?? j.name;
        const color = jColor(j);
        const isActive = activeId === id;
        return (
          <button
            key={id}
            className={`pc-journalist-chip ${isActive ? 'active' : ''}`}
            onClick={()=>onSelect(isActive ? null : id)}
            style={{
              color: isActive ? color : T.faint,
              borderColor: isActive ? `${color}66` : undefined,
              background: isActive ? `${color}10` : undefined,
            }}
          >
            <span style={{ fontSize:11 }}>{j.icon}</span>
            <span>{j.name}</span>
            <span style={{ fontFamily:T.mono, fontSize:7, opacity:.5, marginLeft:1 }}>({j.count})</span>
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN: PRESSENTER
// ═══════════════════════════════════════════════════════════════════
export default function PressCenter({ state }) {
  useEffect(() => { injectCSS(); }, []);

  const [activeDesk,       setActiveDesk]       = useState('manchetes');
  const [activeJournalist, setActiveJournalist] = useState(null);
  const [selectedArticle,  setSelectedArticle]  = useState(null);

  const allArticles = useMemo(() => state?.newsEngine?.feed ?? [], [state]);

  const articles = useMemo(() => {
    let list = allArticles;
    if (activeJournalist) {
      list = list.filter(a => {
        const id = a.journalist?.id ?? a.journalist?.name;
        return id === activeJournalist;
      });
    }
    return list;
  }, [allArticles, activeJournalist]);

  const handleArticle = useCallback((art) => setSelectedArticle(art), []);
  const handleBack    = useCallback(()    => setSelectedArticle(null),  []);

  const year = state?.year ?? '—';

  // Ticker text
  const tickerItems = useMemo(() => {
    return allArticles.slice(0,8).map(a => a.headline?.toUpperCase()).filter(Boolean).join('   ·   ');
  }, [allArticles]);

  return (
    <div style={{ background:T.bg, minHeight:'100vh', color:T.white }}>

      {/* HEADER */}
      <div style={{
        display:'flex', alignItems:'center', gap:16, padding:'16px 28px',
        borderBottom:'1px solid rgba(255,255,255,.07)',
        background:'linear-gradient(180deg,rgba(255,255,255,.025),transparent)',
        position:'sticky', top:0, zIndex:20,
        backdropFilter:'blur(8px)',
      }}>
        {/* Brand */}
        <div style={{ display:'flex', alignItems:'baseline', gap:10 }}>
          <span style={{ fontFamily:T.disp, fontSize:28, letterSpacing:'.1em', color:T.white, textTransform:'uppercase', lineHeight:1 }}>
            REDAÇÃO
          </span>
          <span style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.36em', color:T.clay, textTransform:'uppercase' }}>
            DO CIRCUITO
          </span>
        </div>

        {/* Live dot + season */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginLeft:4 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:T.clayLight, animation:'pc-pulse 2s ease-in-out infinite' }}/>
          <span style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.28em', color:T.faint, textTransform:'uppercase' }}>
            T.{year}
          </span>
        </div>

        <div style={{ flex:1 }}/>

        {/* Count */}
        <span style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.22em', color:T.faint }}>
          {allArticles.length} MATÉRIAS
        </span>
      </div>

      {/* TICKER */}
      {tickerItems && (
        <div style={{
          height:30, background:'rgba(212,86,30,.06)', borderBottom:'1px solid rgba(212,86,30,.18)',
          display:'flex', alignItems:'center', overflow:'hidden',
        }}>
          <div style={{
            flexShrink:0, padding:'0 14px', fontFamily:T.mono, fontSize:7.5, fontWeight:700,
            letterSpacing:'.3em', color:T.clay, textTransform:'uppercase',
            borderRight:'1px solid rgba(212,86,30,.2)', background:'rgba(212,86,30,.1)',
            height:'100%', display:'flex', alignItems:'center', whiteSpace:'nowrap',
          }}>
            ÚLTIMAS
          </div>
          <div style={{ flex:1, overflow:'hidden', position:'relative' }}>
            <div style={{ display:'flex', whiteSpace:'nowrap', animation:'pc-ticker 38s linear infinite' }}>
              {[tickerItems, tickerItems].map((t,ti)=>(
                <span key={ti} style={{ fontFamily:T.mono, fontSize:8, color:T.faint, letterSpacing:'.14em', padding:'0 48px' }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* BODY: sidebar + main */}
      <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', minHeight:'calc(100vh - 100px)' }}>

        {/* SIDEBAR — desks nav */}
        <div style={{
          borderRight:'1px solid rgba(255,255,255,.06)',
          background:'rgba(0,0,0,.1)',
          display:'flex', flexDirection:'column',
          position:'sticky', top:60, height:'calc(100vh - 60px)', overflowY:'auto',
        }} className="pc-scroll">
          {/* Section header */}
          <div style={{ padding:'18px 16px 10px' }}>
            <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.44em', color:T.faint, textTransform:'uppercase', marginBottom:8 }}>
              MESAS EDITORIAIS
            </div>
          </div>

          {DESKS.map(desk => {
            const active = activeDesk === desk.id;
            return (
              <button
                key={desk.id}
                className={`pc-desk-btn ${active ? 'active' : ''}`}
                onClick={()=>{setActiveDesk(desk.id);setSelectedArticle(null);}}
              >
                <span style={{ fontSize:12, opacity:.8 }}>{desk.icon}</span>
                <div>
                  <div style={{
                    fontFamily:T.cond, fontSize:13, fontWeight:700, letterSpacing:'.08em',
                    textTransform:'uppercase', color: active ? T.gold : T.dim,
                  }}>
                    {desk.label}
                  </div>
                  <div style={{ fontFamily:T.mono, fontSize:7.5, color:T.faint, letterSpacing:'.1em', marginTop:1 }}>
                    {desk.desc}
                  </div>
                </div>
              </button>
            );
          })}

          {/* Stats */}
          <div style={{ marginTop:'auto', padding:'16px', borderTop:'1px solid rgba(255,255,255,.05)' }}>
            <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.32em', color:T.faint, textTransform:'uppercase', marginBottom:10 }}>
              FEED STATS
            </div>
            {[
              ['Manchetes',   allArticles.filter(a=>!DESK_TYPES.bastidores?.has(a.type)&&!DESK_TYPES.analise?.has(a.type)).length],
              ['Bastidores',  allArticles.filter(a=>DESK_TYPES.bastidores?.has(a.type)).length],
              ['Análise',     allArticles.filter(a=>DESK_TYPES.analise?.has(a.type)).length],
            ].map(([label,count])=>(
              <div key={label} style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ fontFamily:T.cond, fontSize:11, color:T.faint, letterSpacing:'.04em' }}>{label}</span>
                <span style={{ fontFamily:T.mono, fontSize:10, color:T.dim }}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div style={{ minHeight:'calc(100vh - 100px)' }}>

          {/* Article reader mode */}
          {selectedArticle ? (
            <ArticleReader article={selectedArticle} onBack={handleBack} />
          ) : (
            <>
              {/* Journalist strip (all desks except entrevistas/arquivo) */}
              {activeDesk !== 'entrevistas' && activeDesk !== 'arquivo' && (
                <JournalistStrip
                  articles={allArticles}
                  activeId={activeJournalist}
                  onSelect={setActiveJournalist}
                />
              )}

              {/* Desk content */}
              {activeDesk === 'manchetes'   && <ManchetesDesk  articles={articles}                        onArticle={handleArticle} />}
              {activeDesk === 'entrevistas' && <EntrevistasDesk state={state} />}
              {activeDesk === 'bastidores'  && <BastidoresDesk  articles={articles}                        onArticle={handleArticle} />}
              {activeDesk === 'analise'     && <AnaliseDesk     articles={articles}                        onArticle={handleArticle} />}
              {activeDesk === 'arquivo'     && <ArquivoDesk     allArticles={allArticles} currentYear={year} onArticle={handleArticle} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


