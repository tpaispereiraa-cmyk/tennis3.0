/**
 * InterviewView.jsx — v2.0
 * ─────────────────────────────────────────────────────────────────
 * Sala de Imprensa do BroadcastUniverse.
 *
 * Feed automático de entrevistas derivado dos resultados do universo.
 * Jornalistas com personalidade. Contexto real por jogador.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  generateInterview,
  generateSingleQA,
  generateHeadline,
  deriveInterviewOpportunities,
  INTERVIEW_CONTEXTS,
  JOURNALISTS,
  TOPIC_META,
  TOPIC_IDS,
} from '../InterviewEngine.js';

// ── Design tokens ─────────────────────────────────────────────────
const T = {
  bg:'#06080A', bgPanel:'#0F1518', bgCard:'#141C20', bgHover:'#1B2830',
  clay:'#D4561E', clayLight:'#F06428', gold:'#E8C84A', goldFaint:'rgba(232,200,74,.1)',
  white:'#F2EDE4', dim:'rgba(242,237,228,.58)', faint:'rgba(242,237,228,.28)',
  ghost:'rgba(242,237,228,.06)', border:'rgba(242,237,228,.07)', borderMid:'rgba(242,237,228,.14)',
  disp:"'Bebas Neue', sans-serif", cond:"'Barlow Condensed', sans-serif",
  body:"'Barlow', sans-serif", mono:"'Space Mono', monospace",
};

const TONE_META = {
  warm_open:           { label:'Carismático',  color:'#E8C84A', icon:'😄' },
  brief_professional:  { label:'Reservado',    color:'#90A4AE', icon:'🧊' },
  direct_provocative:  { label:'Confrontador', color:'#EF5350', icon:'🔥' },
  theatrical_warm:     { label:'Showman',      color:'#AB47BC', icon:'🎭' },
  measured_safe:       { label:'Diplomático',  color:'#4A90D9', icon:'🤝' },
  sparse_deep:         { label:'Enigmático',   color:'#78909C', icon:'🌑' },
  analytical_profound: { label:'Intelectual',  color:'#26C6DA', icon:'🔬' },
};

const SURFACE_COLORS = { CLAY:'#D4561E', GRASS:'#2ECC71', HARD:'#4A90D9', INDOOR:'#AB47BC' };
const CAT_BADGE = {
  GRAND_SLAM:{ label:'GRAND SLAM', color:'#E8C84A' },
  MASTERS_1000:{ label:'MASTERS 1000', color:'#4A90D9' },
  ATP_500:{ label:'ATP 500', color:'#2ECC71' },
  ATP_250:{ label:'ATP 250', color:'#78909C' },
  FINALS:{ label:'ATP FINALS', color:'#E8C84A' },
};

// ── CSS ───────────────────────────────────────────────────────────
let _cssInjected = false;
function injectCSS() {
  if (_cssInjected || typeof document === 'undefined') return;
  _cssInjected = true;
  const el = document.createElement('style');
  el.textContent = `
    @keyframes iv-in { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
    @keyframes iv-fade { from { opacity:0 } to { opacity:1 } }
    .iv-opp-card { transition: background .15s, border-color .15s; }
    .iv-opp-card:hover { background: rgba(255,255,255,.04) !important; border-color: rgba(255,255,255,.16) !important; }
    .iv-tab-btn { transition: all .15s; }
    .iv-qa-card { transition: background .12s; }
    .iv-qa-card:hover { background: rgba(255,255,255,.025) !important; }
  `;
  document.head.appendChild(el);
}

// ── Player face ───────────────────────────────────────────────────
function PlayerFace({ player, size = 32 }) {
  const photo = player?.photo ?? null;
  const [ok, setOk] = useState(!!photo);
  const bc = player?.color ? `${player.color}88` : T.borderMid;
  const initials = player?.name?.slice(0, 2)?.toUpperCase() ?? '?';
  const style = { width:size, height:size, borderRadius:'50%', flexShrink:0, overflow:'hidden', border:`1.5px solid ${bc}`, background:player?.color||'#1a2a1a', display:'flex', alignItems:'center', justifyContent:'center' };
  if (photo && ok) return <div style={style}><img src={photo} alt={player?.name} onError={()=>setOk(false)} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top center' }}/></div>;
  return <div style={{ ...style, fontSize:size*.35, fontWeight:700, color:'#fff', fontFamily:T.disp }}>{initials}</div>;
}

// ── Card de oportunidade de entrevista ────────────────────────────
function OpportunityCard({ opp, onRead, index, isRead }) {
  const { player, journalist, contextId, tournament, category, year, surface } = opp;
  const ctx = INTERVIEW_CONTEXTS[contextId] ?? {};
  const cat = CAT_BADGE[category] ?? null;
  const surfColor = SURFACE_COLORS[surface] ?? T.faint;
  const jColor = journalist?.color ?? T.clay;
  const accentColor = player?.color ?? T.clay;

  return (
    <div
      className="iv-opp-card"
      onClick={() => onRead(opp)}
      style={{
        display:'grid', gridTemplateColumns:'56px 1fr auto',
        gap:0, cursor:'pointer',
        background: isRead ? 'rgba(255,255,255,.01)' : 'rgba(255,255,255,.025)',
        border:`1px solid ${isRead ? T.border : 'rgba(255,255,255,.08)'}`,
        borderLeft:`3px solid ${isRead ? 'rgba(255,255,255,.06)' : accentColor}`,
        animation:`iv-in .35s ease ${index * .05}s both`,
        opacity: isRead ? 0.55 : 1,
      }}
    >
      {/* Número */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', borderRight:`1px solid ${T.border}`, padding:'0 14px' }}>
        <span style={{ fontFamily:T.mono, fontSize:9, color:isRead ? T.faint : accentColor, fontWeight:700 }}>{String(index+1).padStart(2,'0')}</span>
      </div>

      {/* Conteúdo principal */}
      <div style={{ padding:'14px 16px', minWidth:0 }}>
        {/* Linha de meta */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7, flexWrap:'wrap' }}>
          <span style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.22em', padding:'2px 7px', background:`${surfColor}18`, border:`1px solid ${surfColor}44`, color:surfColor, textTransform:'uppercase' }}>
            {ctx.icon} {ctx.label}
          </span>
          {cat && (
            <span style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.18em', color:cat.color, opacity:.8 }}>
              {cat.label}
            </span>
          )}
          {year && <span style={{ fontFamily:T.mono, fontSize:7, color:T.faint, letterSpacing:'.14em' }}>T.{year}</span>}
          {isRead && <span style={{ fontFamily:T.mono, fontSize:7, color:T.faint, letterSpacing:'.14em' }}>✓ lida</span>}
        </div>

        {/* Headline */}
        <div style={{ fontFamily:T.cond, fontSize:16, fontWeight:700, color:T.white, letterSpacing:'.05em', textTransform:'uppercase', lineHeight:1.15, marginBottom:8, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
          {opp.headline ?? tournament}
        </div>

        {/* Jogador + jornalista */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <PlayerFace player={player} size={22} />
          <span style={{ fontFamily:T.mono, fontSize:8, color:T.dim, letterSpacing:'.1em' }}>{player?.name}</span>
          <span style={{ fontFamily:T.mono, fontSize:7, color:T.faint }}>·</span>
          <span style={{ fontFamily:T.mono, fontSize:7, color:jColor, letterSpacing:'.12em' }}>{journalist?.icon} {journalist?.name}</span>
          <span style={{ fontFamily:T.mono, fontSize:7, color:T.faint, letterSpacing:'.1em' }}>{journalist?.outlet}</span>
        </div>
      </div>

      {/* Arrow */}
      <div style={{ display:'flex', alignItems:'center', padding:'0 18px', color:isRead ? T.faint : T.dim, fontFamily:T.mono, fontSize:11 }}>→</div>
    </div>
  );
}

// ── Card Q&A ──────────────────────────────────────────────────────
function QACard({ qa, index, tone, player, journalist }) {
  const [expanded, setExpanded] = useState(true);
  const tm = TONE_META[tone] ?? TONE_META.measured_safe;
  const topicMeta = TOPIC_META[qa.topic] ?? { label:qa.topic, icon:'💬' };
  const accentColor = player?.color ?? T.clay;
  const jColor = journalist?.color ?? T.clay;

  return (
    <div className="iv-qa-card" style={{ border:`1px solid ${T.border}`, borderLeft:`3px solid ${accentColor}44`, background:T.bgCard, marginBottom:6, animation:`iv-in .3s ease ${index*.05}s both` }}>
      <div onClick={() => setExpanded(e => !e)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', cursor:'pointer', borderBottom: expanded ? `1px solid ${T.border}` : 'none' }}>
        <span style={{ fontFamily:T.mono, fontSize:8, color:`${accentColor}88`, minWidth:20, fontWeight:700 }}>{String(index+1).padStart(2,'0')}</span>
        <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontFamily:T.mono, fontSize:6.5, letterSpacing:'.16em', padding:'2px 7px', background:`${accentColor}12`, border:`1px solid ${accentColor}33`, color:accentColor, textTransform:'uppercase', flexShrink:0 }}>
          {topicMeta.icon} {topicMeta.label}
        </span>
        <span style={{ fontFamily:T.cond, fontSize:12, fontWeight:600, color:T.dim, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', letterSpacing:'.04em', fontStyle:'italic' }}>
          {qa.question}
        </span>
        <span style={{ fontFamily:T.mono, fontSize:8, color:T.faint, transform:expanded?'rotate(180deg)':'none', transition:'transform .2s', flexShrink:0 }}>▼</span>
      </div>

      {expanded && (
        <div style={{ padding:'16px 18px 18px 42px' }}>
          {/* Pergunta do jornalista */}
          <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:14, paddingBottom:12, borderBottom:`1px solid ${T.border}` }}>
            <div style={{ flexShrink:0, width:26, height:26, borderRadius:'50%', background:`${jColor}20`, border:`1px solid ${jColor}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>{journalist?.icon ?? '🎙️'}</div>
            <div>
              <div style={{ fontFamily:T.mono, fontSize:7, color:jColor, letterSpacing:'.2em', marginBottom:3 }}>{journalist?.name?.toUpperCase() ?? 'JORNALISTA'} — {journalist?.outlet}</div>
              <div style={{ fontFamily:T.cond, fontSize:13, color:T.dim, fontStyle:'italic', letterSpacing:'.04em', lineHeight:1.45 }}>"{qa.question}"</div>
            </div>
          </div>

          {/* Resposta do jogador */}
          <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
            <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              <PlayerFace player={player} size={32} />
              <span style={{ fontFamily:T.mono, fontSize:6, color:`${tm.color}88`, textTransform:'uppercase' }}>{tm.icon}</span>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:T.mono, fontSize:7.5, letterSpacing:'.16em', color:accentColor, textTransform:'uppercase', marginBottom:6 }}>{player?.name} —</div>
              <div style={{ fontFamily:T.body, fontSize:13.5, lineHeight:1.8, color:T.white, letterSpacing:'.01em' }}>{qa.answer}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Painel de entrevista completa ─────────────────────────────────
function InterviewPanel({ interview, onBack }) {
  const { context, tone, player, pairs, journalist, headline, params } = interview;
  const tm = TONE_META[tone] ?? TONE_META.measured_safe;
  const accentColor = player?.color ?? T.clay;
  const jColor = journalist?.color ?? T.clay;
  const surfColor = SURFACE_COLORS[params?.surface] ?? T.faint;

  return (
    <div style={{ animation:'iv-in .3s ease both' }}>
      {/* Voltar */}
      <button onClick={onBack} style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.24em', padding:'6px 14px', background:'transparent', border:`1px solid ${T.border}`, color:T.faint, cursor:'pointer', marginBottom:24, textTransform:'uppercase', transition:'all .15s' }}
        onMouseEnter={e => { e.currentTarget.style.color=T.white; e.currentTarget.style.borderColor=T.borderMid; }}
        onMouseLeave={e => { e.currentTarget.style.color=T.faint; e.currentTarget.style.borderColor=T.border; }}>
        ← SALA DE IMPRENSA
      </button>

      {/* Header — estilo jornal */}
      <div style={{ borderBottom:`1px solid ${T.border}`, marginBottom:28, paddingBottom:24 }}>
        {/* Byline do jornalista */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:`${jColor}20`, border:`1px solid ${jColor}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
            {journalist?.icon ?? '🎙️'}
          </div>
          <div>
            <div style={{ fontFamily:T.mono, fontSize:9, color:jColor, letterSpacing:'.22em', textTransform:'uppercase' }}>{journalist?.name}</div>
            <div style={{ fontFamily:T.mono, fontSize:7, color:T.faint, letterSpacing:'.18em' }}>{journalist?.outlet}</div>
          </div>
          <div style={{ marginLeft:'auto', display:'flex', gap:6, alignItems:'center' }}>
            {params?.surface && (
              <span style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.18em', padding:'2px 8px', background:`${surfColor}14`, border:`1px solid ${surfColor}33`, color:surfColor, textTransform:'uppercase' }}>{params.surface}</span>
            )}
            <span style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.18em', padding:'2px 8px', background:`${accentColor}10`, border:`1px solid ${accentColor}33`, color:accentColor, textTransform:'uppercase' }}>{context.icon} {context.label}</span>
            <span style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.18em', padding:'2px 8px', background:`${tm.color}10`, border:`1px solid ${tm.color}30`, color:`${tm.color}cc`, textTransform:'uppercase' }}>{tm.icon} {tm.label}</span>
          </div>
        </div>

        {/* Headline */}
        <div style={{ fontFamily:T.disp, fontSize:'clamp(28px,3.5vw,52px)', letterSpacing:'.04em', color:T.white, textTransform:'uppercase', lineHeight:1, marginBottom:12 }}>
          {headline}
        </div>

        {/* Sub */}
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <PlayerFace player={player} size={40} />
          <div>
            <div style={{ fontFamily:T.cond, fontSize:15, fontWeight:700, color:T.dim, letterSpacing:'.07em', textTransform:'uppercase' }}>{player?.name}</div>
            <div style={{ fontFamily:T.mono, fontSize:7.5, color:T.faint, letterSpacing:'.16em', marginTop:2 }}>
              {player?.nationality}{player?.age ? ` · ${player.age}a` : ''}{params?.tournament ? ` · ${params.tournament}` : ''}{pairs.length ? ` · ${pairs.length} perguntas` : ''}
            </div>
          </div>
        </div>

        {/* Descrição do contexto */}
        {context.description && (
          <div style={{ marginTop:12, fontFamily:T.body, fontSize:11.5, color:T.faint, lineHeight:1.55, borderLeft:`2px solid ${T.border}`, paddingLeft:12 }}>
            {context.description}
          </div>
        )}
      </div>

      {/* Q&A */}
      {pairs.length === 0
        ? <div style={{ padding:'40px 0', textAlign:'center', fontFamily:T.mono, fontSize:9, color:T.faint, letterSpacing:'.3em' }}>NENHUMA PERGUNTA GERADA</div>
        : pairs.map((qa, i) => <QACard key={i} qa={qa} index={i} tone={tone} player={player} journalist={journalist} />)
      }
    </div>
  );
}

// ── Modal de geração personalizada ────────────────────────────────
function CustomGeneratePanel({ state, onInterview }) {
  const { tourPlayers = [], prospects = [], tournamentResults = {} } = state ?? {};
  const allPlayers = useMemo(() => [...tourPlayers, ...prospects], [tourPlayers, prospects]);
  const [selId, setSelId]           = useState(null);
  const [contextId, setContextId]   = useState('POST_WIN');
  const [journalistId, setJournId]  = useState('marina');
  const [qCount, setQCount]         = useState(6);
  const [search, setSearch]         = useState('');
  const [generating, setGenerating] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return allPlayers;
    const q = search.toLowerCase();
    return allPlayers.filter(p => p.name?.toLowerCase().includes(q) || p.nationality?.toLowerCase().includes(q));
  }, [allPlayers, search]);

  const selPlayer = allPlayers.find(p => p.id === selId) ?? null;

  const lastResult = useMemo(() => {
    const results = Object.values(tournamentResults);
    return results.length ? results[results.length - 1] : null;
  }, [tournamentResults]);

  const handleGenerate = useCallback(() => {
    if (!selPlayer) return;
    setGenerating(true);
    const params = {};
    if (lastResult?.tournament?.name) params.tournament = lastResult.tournament.name;
    if (lastResult?.tournament?.surface) params.surface = lastResult.tournament.surface;
    if (lastResult?.tournament?.season) params.season = lastResult.tournament.season;
    setTimeout(() => {
      const journalist = JOURNALISTS[journalistId] ?? JOURNALISTS.marina;
      const iv = generateInterview(selPlayer, contextId, state, params, qCount, journalist);
      if (!iv.headline) iv.headline = `Entrevista exclusiva: ${selPlayer.name}`;
      setGenerating(false);
      onInterview(iv);
    }, 180);
  }, [selPlayer, contextId, journalistId, qCount, state, lastResult, onInterview]);

  return (
    <div style={{ display:'grid', gridTemplateColumns:'240px 1fr', gap:0, border:`1px solid ${T.border}` }}>
      {/* Lista de jogadores */}
      <div style={{ borderRight:`1px solid ${T.border}` }}>
        <div style={{ padding:'8px 10px', borderBottom:`1px solid ${T.border}` }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar jogador..."
            style={{ width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,.04)', border:`1px solid ${T.border}`, color:T.white, fontFamily:T.mono, fontSize:8, letterSpacing:'.1em', padding:'6px 8px', outline:'none' }}
            onFocus={e => { e.target.style.borderColor=T.clay; }} onBlur={e => { e.target.style.borderColor=T.border; }}/>
        </div>
        <div style={{ maxHeight:380, overflowY:'auto' }}>
          {filtered.map(p => {
            const sel = p.id === selId;
            const ac = p.color ?? T.clay;
            return (
              <div key={p.id} onClick={() => setSelId(p.id)} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', cursor:'pointer', background:sel?`${ac}12`:'rgba(255,255,255,.015)', borderBottom:`1px solid ${T.border}`, borderLeft:`2px solid ${sel?ac:'transparent'}`, transition:'all .12s' }}>
                <PlayerFace player={p} size={24}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:T.cond, fontSize:12, fontWeight:700, color:sel?ac:T.white, letterSpacing:'.05em', textTransform:'uppercase', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
                  <div style={{ fontFamily:T.mono, fontSize:6.5, color:T.faint, letterSpacing:'.12em' }}>{p.nationality}{p.age?` · ${p.age}a`:''}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Config */}
      <div style={{ padding:'18px 20px' }}>
        {!selPlayer ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:320, gap:10 }}>
            <div style={{ fontSize:36, opacity:.2 }}>🎙️</div>
            <div style={{ fontFamily:T.mono, fontSize:8, color:'rgba(242,237,228,.14)', letterSpacing:'.3em' }}>SELECIONE UM JOGADOR</div>
          </div>
        ) : (
          <>
            {/* Jornalista */}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.34em', color:T.faint, textTransform:'uppercase', marginBottom:8 }}>Jornalista</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {Object.values(JOURNALISTS).map(j => {
                  const active = j.id === journalistId;
                  return (
                    <button key={j.id} onClick={() => setJournId(j.id)} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', cursor:'pointer', fontFamily:T.mono, fontSize:7.5, letterSpacing:'.14em', background:active?`${j.color}18`:'rgba(255,255,255,.03)', border:`1px solid ${active?j.color:T.border}`, color:active?j.color:T.faint, transition:'all .12s' }}>
                      {j.icon} {j.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Contexto */}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.34em', color:T.faint, textTransform:'uppercase', marginBottom:8 }}>Contexto</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {Object.values(INTERVIEW_CONTEXTS).map(ctx => {
                  const active = ctx.id === contextId;
                  return (
                    <button key={ctx.id} onClick={() => setContextId(ctx.id)} style={{ padding:'4px 10px', cursor:'pointer', fontFamily:T.mono, fontSize:7, letterSpacing:'.16em', background:active?'rgba(212,86,30,.2)':'rgba(255,255,255,.03)', border:`1px solid ${active?'rgba(212,86,30,.6)':T.border}`, color:active?T.clayLight:T.faint, transition:'all .12s', textTransform:'uppercase' }}>
                      {ctx.icon} {ctx.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Perguntas */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.34em', color:T.faint, textTransform:'uppercase', marginBottom:8 }}>Número de perguntas</div>
              <div style={{ display:'flex', gap:5 }}>
                {[4,5,6,7,8].map(n => (
                  <button key={n} onClick={() => setQCount(n)} style={{ padding:'4px 12px', cursor:'pointer', fontFamily:T.mono, fontSize:10, fontWeight:700, background:qCount===n?'rgba(212,86,30,.2)':'rgba(255,255,255,.03)', border:`1px solid ${qCount===n?'rgba(212,86,30,.6)':T.border}`, color:qCount===n?T.clayLight:T.faint, transition:'all .12s' }}>{n}</button>
                ))}
              </div>
            </div>

            <button onClick={handleGenerate} disabled={generating} style={{ width:'100%', padding:'12px 20px', fontFamily:T.mono, fontSize:9, fontWeight:700, letterSpacing:'.24em', textTransform:'uppercase', background:generating?'rgba(255,255,255,.04)':'rgba(212,86,30,.18)', border:`1px solid ${generating?T.border:'rgba(212,86,30,.55)'}`, color:generating?T.faint:T.clayLight, cursor:generating?'not-allowed':'pointer', transition:'all .15s' }}>
              {generating ? '⏳ GERANDO...' : `🎙️ GERAR — ${qCount} PERGUNTAS`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN EXPORT — Sala de Imprensa
// ═══════════════════════════════════════════════════════════════════
export default function InterviewView({ state }) {
  injectCSS();

  const [tab, setTab]               = useState('feed');   // 'feed' | 'custom'
  const [openInterview, setOpen]    = useState(null);
  const [readIds, setReadIds]       = useState(new Set());
  const [generating, setGenerating] = useState(null);     // opp.id being generated
  const [filter, setFilter]         = useState('all');    // 'all' | 'unread'

  // Derivar oportunidades
  const opportunities = useMemo(() => {
    const opps = deriveInterviewOpportunities(state ?? {});
    // Adicionar headline
    return opps.map(opp => {
      const ctx = state ? { tournament: opp.tournament, slamTitles: 0, titles: 0, recentForm: 'normal', rivalName: null } : {};
      // headline já vem do opportunity se set externally, caso contrário gera via engine
      if (!opp.headline) {
        
        opp.headline = generateHeadline(opp.contextId, opp.player, ctx) ?? opp.tournament;
      }
      return opp;
    });
  }, [state?.tournamentResults, state?.tourPlayers, state?.prospects]);

  // Gera e abre uma entrevista de uma oportunidade
  const handleReadOpp = useCallback((opp) => {
    setGenerating(opp.id);
    setTimeout(() => {
      const iv = generateInterview(opp.player, opp.contextId, state ?? {}, opp.params ?? {}, 6, opp.journalist);
      if (!iv.headline) iv.headline = opp.headline ?? opp.tournament;
      setReadIds(prev => new Set([...prev, opp.id]));
      setGenerating(null);
      setOpen(iv);
    }, 200);
  }, [state]);

  const filteredOpps = useMemo(() => {
    if (filter === 'unread') return opportunities.filter(o => !readIds.has(o.id));
    return opportunities;
  }, [opportunities, readIds, filter]);

  if (openInterview) {
    return (
      <div style={{ animation:'iv-in .3s ease both', padding:'0 0 40px' }}>
        <InterviewPanel interview={openInterview} onBack={() => setOpen(null)} />
      </div>
    );
  }

  return (
    <div style={{ animation:'iv-in .4s ease both' }}>

      {/* HEADER */}
      <div style={{ marginBottom:28, padding:'32px 40px 0' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <div style={{ width:22, height:2, background:T.clay }}/>
          <span style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.44em', color:T.clay, textTransform:'uppercase' }}>MODO UNIVERSO</span>
        </div>
        <div style={{ fontFamily:T.disp, fontSize:'clamp(40px,5vw,68px)', letterSpacing:'.04em', color:T.white, textTransform:'uppercase', lineHeight:.9, marginBottom:8 }}>
          Sala de<br/><span style={{ opacity:.4 }}>Imprensa</span>
        </div>
        <div style={{ fontFamily:T.mono, fontSize:8, color:T.faint, letterSpacing:'.24em' }}>
          {opportunities.length} entrevistas · {Object.keys(JOURNALISTS).length} jornalistas · {readIds.size} lidas
        </div>
      </div>

      {/* TABS */}
      <div style={{ display:'flex', gap:0, borderBottom:`1px solid ${T.border}`, padding:'0 40px', marginBottom:0 }}>
        {[
          { id:'feed', label:'📰 FEED', count: opportunities.filter(o => !readIds.has(o.id)).length },
          { id:'custom', label:'🎙️ CRIAR' },
        ].map(t => (
          <button key={t.id} className="iv-tab-btn" onClick={() => setTab(t.id)} style={{
            fontFamily:T.mono, fontSize:9, letterSpacing:'.22em', padding:'12px 22px',
            background:'transparent', border:'none', borderBottom: tab===t.id ? `2px solid ${T.clay}` : '2px solid transparent',
            color: tab===t.id ? T.clay : T.faint, cursor:'pointer', textTransform:'uppercase',
          }}>
            {t.label}
            {t.count > 0 && <span style={{ marginLeft:6, background:`${T.clay}22`, border:`1px solid ${T.clay}44`, color:T.clay, fontFamily:T.mono, fontSize:7, padding:'1px 5px', borderRadius:2 }}>{t.count}</span>}
          </button>
        ))}

        {tab === 'feed' && (
          <div style={{ marginLeft:'auto', display:'flex', gap:5, alignItems:'center', padding:'0 0 0 16px' }}>
            {[{ id:'all', label:'TODAS' },{ id:'unread', label:'NÃO LIDAS' }].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{ fontFamily:T.mono, fontSize:7.5, letterSpacing:'.16em', padding:'4px 10px', cursor:'pointer', background:filter===f.id?'rgba(255,255,255,.08)':'transparent', border:`1px solid ${filter===f.id?T.borderMid:T.border}`, color:filter===f.id?T.dim:T.faint, transition:'all .12s' }}>{f.label}</button>
            ))}
          </div>
        )}
      </div>

      {/* TAB: FEED */}
      {tab === 'feed' && (
        <div style={{ padding:'20px 40px 40px' }}>
          {filteredOpps.length === 0 ? (
            <div style={{ padding:'80px 0', textAlign:'center' }}>
              <div style={{ fontSize:40, opacity:.2, marginBottom:16 }}>📰</div>
              <div style={{ fontFamily:T.disp, fontSize:28, color:'rgba(242,237,228,.1)', letterSpacing:'.1em', textTransform:'uppercase' }}>
                {opportunities.length === 0 ? 'Simule torneios para gerar entrevistas' : 'Todas as entrevistas foram lidas'}
              </div>
              {opportunities.length > 0 && filter === 'unread' && (
                <button onClick={() => setFilter('all')} style={{ marginTop:16, fontFamily:T.mono, fontSize:8, letterSpacing:'.2em', padding:'8px 18px', background:'transparent', border:`1px solid ${T.border}`, color:T.faint, cursor:'pointer', textTransform:'uppercase' }}>
                  VER TODAS
                </button>
              )}
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {filteredOpps.map((opp, i) => (
                <div key={opp.id} style={{ position:'relative' }}>
                  {generating === opp.id && (
                    <div style={{ position:'absolute', inset:0, background:'rgba(6,8,10,.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10, fontFamily:T.mono, fontSize:8, color:T.clay, letterSpacing:'.24em' }}>
                      ⏳ GERANDO...
                    </div>
                  )}
                  <OpportunityCard opp={opp} onRead={handleReadOpp} index={i} isRead={readIds.has(opp.id)} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: CRIAR */}
      {tab === 'custom' && (
        <div style={{ padding:'24px 40px 40px' }}>
          <div style={{ fontFamily:T.mono, fontSize:8, color:T.faint, letterSpacing:'.24em', marginBottom:16, textTransform:'uppercase' }}>
            Gerar entrevista personalizada
          </div>
          <CustomGeneratePanel state={state} onInterview={iv => { setOpen(iv); setTab('feed'); }} />
        </div>
      )}
    </div>
  );
}
