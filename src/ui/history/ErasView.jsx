import React, { useMemo, useState } from 'react';
import { BROADCAST_THEME as T } from '../theme/uiTheme.js';

const STATUS_LABELS = {
  FORMING: 'Em formação',
  ACTIVE: 'Declarada',
  CONSOLIDATING: 'Consolidada',
  DECLINING: 'Em declínio',
  CLOSED: 'Encerrada',
};

const STATUS_COLORS = {
  FORMING: '#7DD8FF',
  ACTIVE: '#57D38C',
  CONSOLIDATING: '#E8C84A',
  DECLINING: '#FF9A6A',
  CLOSED: 'rgba(242,237,228,.48)',
};

const KIND_LABELS = {
  DYNASTY: 'Dinastia',
  DUOPOLY: 'Duopólio',
  GENERATION_SHIFT: 'Troca de geração',
  INTERREGNUM: 'Interregno',
  STYLE_REVOLUTION: 'Revolução de estilo',
  NATIONAL_WAVE: 'Onda nacional',
};

function pct(value) {
  const n = Number(value);
  return Number.isFinite(n) ? `${Math.round(n * 100)}%` : '—';
}

function EraCard({ era, selected, onSelect }) {
  const color = STATUS_COLORS[era.status] ?? STATUS_COLORS.CLOSED;
  return (
    <button
      onClick={() => onSelect(era.id)}
      style={{
        width:'100%', textAlign:'left', cursor:'pointer', padding:'16px 17px',
        border:`1px solid ${selected ? `${color}88` : 'rgba(255,255,255,.09)'}`,
        borderLeft:`3px solid ${color}`,
        background:selected ? `${color}0D` : 'rgba(255,255,255,.018)',
        color:T.white, transition:'border-color .2s, background .2s',
      }}
    >
      <div style={{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'baseline' }}>
        <span style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.18em', color, textTransform:'uppercase' }}>
          {KIND_LABELS[era.kind] ?? era.kind}
        </span>
        <span style={{ fontFamily:T.mono, fontSize:8, color:T.faint }}>
          {era.startYear ?? '—'}{era.endYear ? `—${era.endYear}` : '—'}
        </span>
      </div>
      <div style={{ fontFamily:T.disp, fontSize:24, lineHeight:1.05, marginTop:9 }}>{era.title ?? 'Era sem nome'}</div>
      <div style={{ fontFamily:T.body, fontSize:11, color:T.dim, lineHeight:1.45, marginTop:7 }}>{era.subtitle ?? 'O circuito ainda está entendendo este movimento.'}</div>
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginTop:13, fontFamily:T.mono, fontSize:7.5, letterSpacing:'.12em', color:T.faint, textTransform:'uppercase' }}>
        <span style={{ color }}>{STATUS_LABELS[era.status] ?? era.status}</span>
        <span>{era.persistenceYears ?? 0} confirmações</span>
        <span>{pct(era.confidence)} confiança</span>
      </div>
    </button>
  );
}

function EraDetail({ era, playersById, onOpenProfile }) {
  if (!era) return null;
  const color = STATUS_COLORS[era.status] ?? STATUS_COLORS.CLOSED;
  const chapters = [...(era.chapters ?? [])].sort((a, b) => b.year - a.year);
  const turns = (era.turningPointIds ?? []).length;
  return (
    <section style={{ border:'1px solid rgba(255,255,255,.10)', background:'rgba(255,255,255,.02)', padding:'24px 25px 30px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', gap:18, flexWrap:'wrap', alignItems:'flex-start' }}>
        <div>
          <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.25em', color, textTransform:'uppercase' }}>{KIND_LABELS[era.kind] ?? era.kind} · {STATUS_LABELS[era.status] ?? era.status}</div>
          <h2 style={{ fontFamily:T.disp, fontSize:'clamp(34px,5vw,62px)', lineHeight:.96, fontWeight:500, margin:'12px 0 10px', color:T.white }}>{era.title ?? 'Era sem nome'}</h2>
          <div style={{ maxWidth:670, fontFamily:T.body, fontSize:15, lineHeight:1.55, color:T.dim }}>{era.subtitle}</div>
        </div>
        <div style={{ minWidth:160, padding:'12px 14px', border:`1px solid ${color}45`, background:`${color}08` }}>
          <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.18em', color:T.faint, textTransform:'uppercase' }}>janela histórica</div>
          <div style={{ fontFamily:T.disp, fontSize:30, color, marginTop:5 }}>{era.startYear ?? '—'}{era.endYear ? `—${era.endYear}` : '—'}</div>
          <div style={{ fontFamily:T.mono, fontSize:7.5, color:T.faint, marginTop:5 }}>{era.declaredYear ? `declarada em ${era.declaredYear}` : 'ainda em observação'}</div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:10, marginTop:24 }}>
        {[
          ['confiança', pct(era.confidence)],
          ['confirmações', era.persistenceYears ?? 0],
          ['capítulos', chapters.length],
          ['viradas', turns],
        ].map(([label, value]) => (
          <div key={label} style={{ borderTop:`1px solid ${color}55`, paddingTop:9 }}>
            <div style={{ fontFamily:T.disp, fontSize:25, color:T.white }}>{value}</div>
            <div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.15em', color:T.faint, textTransform:'uppercase', marginTop:4 }}>{label}</div>
          </div>
        ))}
      </div>

      {era.protagonistIds?.length > 0 && (
        <div style={{ marginTop:22, paddingTop:17, borderTop:'1px solid rgba(255,255,255,.08)' }}>
          <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.22em', color:T.faint, textTransform:'uppercase', marginBottom:10 }}>elenco da era · abrir dossiê</div>
          <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
            {[...(era.protagonistIds ?? []), ...(era.rivalIds ?? [])]
              .filter((id, index, all) => id && all.indexOf(id) === index)
              .slice(0, 12)
              .map(id => {
                const player = playersById?.[id];
                const label = player?.name ?? era.protagonistNames?.[era.protagonistIds?.indexOf(id)] ?? id;
                return onOpenProfile && player ? (
                  <button key={id} onClick={() => onOpenProfile(player)} style={{ border:'1px solid rgba(232,200,74,.32)', background:'rgba(232,200,74,.06)', color:T.gold, cursor:'pointer', padding:'7px 9px', fontFamily:T.cond, fontSize:14 }}>{label} <span style={{ fontFamily:T.mono, fontSize:7, color:T.faint }}>→ perfil</span></button>
                ) : <span key={id} style={{ border:'1px solid rgba(255,255,255,.10)', padding:'7px 9px', fontFamily:T.cond, fontSize:14, color:T.dim }}>{label}</span>;
              })}
          </div>
        </div>
      )}

      <div style={{ marginTop:29, borderTop:'1px solid rgba(255,255,255,.09)' }}>
        <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.24em', color:T.faint, textTransform:'uppercase', margin:'20px 0 13px' }}>capítulos do livro</div>
        {chapters.length ? chapters.map(chapter => (
          <article key={chapter.id} style={{ position:'relative', padding:'16px 0 18px 19px', borderTop:'1px solid rgba(255,255,255,.07)' }}>
            <span style={{ position:'absolute', left:0, top:22, width:7, height:7, borderRadius:'50%', background:color, boxShadow:`0 0 0 4px ${color}18` }} />
            <div style={{ display:'flex', gap:12, alignItems:'baseline', flexWrap:'wrap' }}>
              <span style={{ fontFamily:T.disp, fontSize:25, color:T.white }}>{chapter.year}</span>
              <span style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.15em', color, textTransform:'uppercase' }}>{chapter.type}</span>
              <span style={{ fontFamily:T.cond, fontSize:17, color:T.dim }}>{chapter.title}</span>
            </div>
            <p style={{ fontFamily:T.body, fontSize:13, lineHeight:1.65, color:'rgba(242,237,228,.72)', margin:'9px 0 0', maxWidth:780 }}>{chapter.text}</p>
          </article>
        )) : <div style={{ fontFamily:T.body, fontSize:13, color:T.faint, padding:'16px 0' }}>A era ainda está reunindo seu primeiro capítulo.</div>}
      </div>
    </section>
  );
}

export default function ErasView({ state, onOpenProfile }) {
  const book = state?.historyBook ?? null;
  const eras = useMemo(() => [...(book?.eras ?? [])].sort((a, b) => (b.startYear ?? 0) - (a.startYear ?? 0)), [book]);
  const [selectedId, setSelectedId] = useState(null);
  const active = eras.find(era => era.id === book?.activeEraId) ?? eras.find(era => era.status !== 'CLOSED') ?? eras[0] ?? null;
  const selected = eras.find(era => era.id === selectedId) ?? active;
  const playersById = useMemo(() => Object.fromEntries([
    ...(state?.tourPlayers ?? []),
    ...(state?.prospects ?? []),
    ...(state?.retiredPlayers ?? []),
  ].filter(player => player?.id).map(player => [player.id, player])), [state]);
  const recentSignals = book?.activeSignals ?? [];
  const closedCount = eras.filter(era => era.status === 'CLOSED').length;
  const chapters = eras.reduce((sum, era) => sum + (era.chapters?.length ?? 0), 0);

  return (
    <div style={{ minHeight:'calc(100vh - 100px)', padding:'38px clamp(16px,4vw,52px) 90px', color:T.white, background:'radial-gradient(circle at 75% 0%, rgba(232,200,74,.07), transparent 36%), linear-gradient(180deg, rgba(8,13,17,.98), rgba(4,7,9,.98))' }}>
      <div style={{ maxWidth:1240, margin:'0 auto' }}>
        <header style={{ borderBottom:'1px solid rgba(255,255,255,.12)', paddingBottom:26, marginBottom:26 }}>
          <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.36em', textTransform:'uppercase', color:T.gold, marginBottom:12 }}>arquivo vivo · história macro do circuito</div>
          <h1 style={{ fontFamily:T.disp, fontSize:'clamp(44px,7vw,88px)', lineHeight:.9, fontWeight:500, margin:0, letterSpacing:'-.02em' }}>Livro das Eras</h1>
          <p style={{ fontFamily:T.body, fontSize:16, color:T.dim, lineHeight:1.55, maxWidth:740, margin:'17px 0 0' }}>Temporadas deixam de ser entradas isoladas. Aqui, tendências persistentes ganham nome, capítulos e um fim — quando a história realmente muda de direção.</p>
          <div style={{ display:'flex', gap:26, flexWrap:'wrap', marginTop:23 }}>
            {[[eras.length,'eras reconhecidas'],[closedCount,'encerradas'],[chapters,'capítulos'],[recentSignals.length,'sinais ativos']].map(([value,label]) => <div key={label}><div style={{ fontFamily:T.disp, fontSize:29, color:T.white }}>{value}</div><div style={{ fontFamily:T.mono, fontSize:7, letterSpacing:'.18em', color:T.faint, textTransform:'uppercase', marginTop:4 }}>{label}</div></div>)}
          </div>
        </header>

        {!eras.length ? (
          <section style={{ border:'1px solid rgba(232,200,74,.27)', background:'rgba(232,200,74,.045)', padding:'42px 28px', textAlign:'center' }}>
            <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.28em', color:T.gold, textTransform:'uppercase' }}>o livro ainda está em branco</div>
            <div style={{ fontFamily:T.disp, fontSize:32, marginTop:13 }}>A história precisa de tempo para se revelar.</div>
            <p style={{ maxWidth:600, margin:'12px auto 0', color:T.dim, fontFamily:T.body, fontSize:14, lineHeight:1.6 }}>Feche algumas temporadas para que o circuito reúna evidências suficientes. Uma grande temporada pode ser lembrada; uma era precisa ser confirmada pelo tempo.</p>
          </section>
        ) : <>
          {active && <section style={{ marginBottom:26, border:'1px solid rgba(87,211,140,.30)', background:'linear-gradient(110deg,rgba(87,211,140,.09),rgba(255,255,255,.018))', padding:'19px 21px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:18, flexWrap:'wrap' }}>
            <div><div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.25em', color:'#57D38C', textTransform:'uppercase' }}>era em foco · {STATUS_LABELS[active.status] ?? active.status}</div><div style={{ fontFamily:T.disp, fontSize:31, marginTop:6 }}>{active.title ?? 'Uma era se formando'}</div></div>
            <button onClick={() => setSelectedId(active.id)} style={{ border:'1px solid rgba(87,211,140,.45)', background:'transparent', color:'#57D38C', cursor:'pointer', padding:'10px 14px', fontFamily:T.mono, fontSize:8, letterSpacing:'.16em', textTransform:'uppercase' }}>abrir capítulo →</button>
          </section>}
          <div style={{ display:'grid', gridTemplateColumns:'minmax(260px,.78fr) minmax(0,1.55fr)', gap:22, alignItems:'start' }}>
            <aside style={{ display:'grid', gap:10 }}>
              <div style={{ fontFamily:T.mono, fontSize:8, letterSpacing:'.23em', color:T.faint, textTransform:'uppercase', marginBottom:3 }}>linha do tempo</div>
              {eras.map(era => <EraCard key={era.id} era={era} selected={selected?.id === era.id} onSelect={setSelectedId} />)}
            </aside>
            <EraDetail era={selected} playersById={playersById} onOpenProfile={onOpenProfile} />
          </div>
        </>}
      </div>
    </div>
  );
}
