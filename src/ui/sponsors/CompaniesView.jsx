import React, { useMemo, useState } from 'react';
import { SPONSOR_CATALOG } from '../../systems/sponsors/SponsorProfiles.js';
import { ensureSponsorPoolFoundation } from '../../systems/sponsors/SponsorCompanySystem.js';

const TIER = { ELITE:'#E8C84A', PREMIUM:'#76C7FF', MID:'#7DE0A2', ENTRY:'#A5AAB4' };
const RISK = (value=0) => value >= .68 ? { label:'ALTO', color:'#FF8A65' } : value >= .42 ? { label:'MODERADO', color:'#E8C84A' } : { label:'CONSERVADOR', color:'#78D8FF' };
const money = value => {
  const n = Number(value ?? 0);
  return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M` : `$${Math.round(n / 1000)}k`;
};

function Metric({ label, value, tone='#F2EDE4' }) {
  return <div style={{ minWidth:80 }}>
    <div style={{ fontFamily:'Space Mono,monospace', fontSize:6.5, letterSpacing:'.16em', color:'rgba(242,237,228,.35)', textTransform:'uppercase' }}>{label}</div>
    <div style={{ marginTop:3, fontFamily:'Barlow Condensed,sans-serif', fontWeight:700, fontSize:17, color:tone, letterSpacing:'.03em' }}>{value}</div>
  </div>;
}

function CompanyCard({ sponsor, state, playersById, expanded, onToggle, onOpenPlayer }) {
  const company = state?.company ?? {};
  const contracts = state?.contracts ?? [];
  const tierColor = TIER[sponsor.tier] ?? '#A5AAB4';
  const risk = RISK(sponsor.riskTolerance);
  const committed = company.budgetCommitted ?? state?.budgetUsed ?? 0;
  const budget = company.annualMarketingBudget ?? sponsor.budget ?? 0;
  const available = Math.max(0, company.budgetAvailable ?? budget - committed);
  const usage = budget ? Math.min(100, Math.round(committed / budget * 100)) : 0;
  const director = company.executives?.marketingDirector ?? company.executives?.ceo;
  const athletes = contracts.map(contract => ({ contract, player:playersById.get(contract.playerId) })).sort((a,b) => (b.contract.annualFee ?? 0) - (a.contract.annualFee ?? 0));

  return <article style={{ border:`1px solid ${expanded ? `${tierColor}88` : 'rgba(255,255,255,.10)'}`, background:expanded ? 'linear-gradient(145deg,rgba(19,27,35,.97),rgba(8,12,16,.98))' : 'rgba(255,255,255,.025)', boxShadow:expanded ? `0 12px 42px ${tierColor}12` : 'none', transition:'border .2s, box-shadow .2s' }}>
    <button onClick={onToggle} aria-expanded={expanded} style={{ width:'100%', border:0, background:'transparent', color:'#F2EDE4', cursor:'pointer', padding:'16px 17px', textAlign:'left', display:'grid', gridTemplateColumns:'auto minmax(0,1fr) auto', alignItems:'center', gap:13 }}>
      <span style={{ width:38, height:38, display:'grid', placeItems:'center', background:`${tierColor}16`, border:`1px solid ${tierColor}55`, fontSize:19 }}>{sponsor.logo ?? '◆'}</span>
      <span style={{ minWidth:0 }}>
        <span style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap' }}>
          <span style={{ fontFamily:'Barlow Condensed,sans-serif', fontWeight:800, fontSize:22, letterSpacing:'.04em', lineHeight:1 }}>{sponsor.name}</span>
          <span style={{ fontFamily:'Space Mono,monospace', fontSize:6.5, letterSpacing:'.16em', color:tierColor, border:`1px solid ${tierColor}55`, padding:'3px 5px' }}>{sponsor.tier}</span>
        </span>
        <span style={{ display:'block', marginTop:5, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', fontFamily:'Barlow,sans-serif', fontSize:12, color:'rgba(242,237,228,.48)' }}>{sponsor.category} · {company.strategy?.label ?? 'Estratégia em definição'}</span>
      </span>
      <span style={{ fontFamily:'Space Mono,monospace', color:tierColor, fontSize:12 }}>{expanded ? '−' : '+'}</span>
    </button>

    <div style={{ padding:'0 17px 15px', display:'flex', flexWrap:'wrap', gap:'12px 24px' }}>
      <Metric label="Budget anual" value={money(budget)} tone={tierColor} />
      <Metric label="Em carteira" value={`${athletes.length}/${sponsor.maxContracts}`} />
      <Metric label="Folha anual" value={money(committed)} />
      <Metric label="Risco" value={risk.label} tone={risk.color} />
      <div style={{ flex:'1 1 130px', minWidth:130, alignSelf:'end' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, fontFamily:'Space Mono,monospace', fontSize:6.5, letterSpacing:'.13em', color:'rgba(242,237,228,.38)' }}><span>ORÇAMENTO COMPROMETIDO</span><span>{usage}%</span></div>
        <div style={{ height:5, background:'rgba(255,255,255,.08)', overflow:'hidden' }}><div style={{ width:`${usage}%`, height:'100%', background:tierColor }} /></div>
      </div>
    </div>

    {expanded && <div style={{ borderTop:'1px solid rgba(255,255,255,.09)', padding:17, animation:'bu-in .2s ease' }}>
      <div style={{ display:'grid', gridTemplateColumns:'minmax(190px,.8fr) minmax(250px,1.2fr)', gap:18 }}>
        <section>
          <div style={{ fontFamily:'Space Mono,monospace', fontSize:7, color:tierColor, letterSpacing:'.2em', marginBottom:10 }}>DIRETORIA & TESE</div>
          <div style={{ padding:'11px 12px', background:'rgba(255,255,255,.035)', borderLeft:`2px solid ${tierColor}` }}>
            <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontWeight:700, fontSize:17 }}>{director?.name ?? 'Direção interina'}</div>
            <div style={{ marginTop:2, fontFamily:'Space Mono,monospace', fontSize:7, color:'rgba(242,237,228,.45)', letterSpacing:'.12em' }}>{director?.role ?? 'MARKETING'} · confiança {director?.confidence ?? '—'}/100</div>
          </div>
          <p style={{ margin:'11px 0 0', fontFamily:'Barlow,sans-serif', color:'rgba(242,237,228,.64)', fontSize:13, lineHeight:1.45 }}>{company.strategy?.thesis ?? sponsor.description}</p>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:11 }}>
            <span style={{ fontFamily:'Space Mono,monospace', fontSize:6.5, letterSpacing:'.14em', padding:'5px 7px', color:risk.color, border:`1px solid ${risk.color}55` }}>RISCO {risk.label}</span>
            <span style={{ fontFamily:'Space Mono,monospace', fontSize:6.5, letterSpacing:'.14em', padding:'5px 7px', color:'rgba(242,237,228,.6)', border:'1px solid rgba(255,255,255,.14)' }}>ALVO: {company.strategy?.target ?? 'mercado aberto'}</span>
          </div>
        </section>
        <section>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10 }}><div style={{ fontFamily:'Space Mono,monospace', fontSize:7, color:tierColor, letterSpacing:'.2em' }}>ELENCO PATROCINADO</div><div style={{ fontFamily:'Space Mono,monospace', fontSize:7, color:'rgba(242,237,228,.4)' }}>{money(available)} livre</div></div>
          {athletes.length === 0 ? <div style={{ padding:'16px 12px', border:'1px dashed rgba(255,255,255,.13)', color:'rgba(242,237,228,.4)', fontFamily:'Barlow,sans-serif', fontSize:13 }}>Sem atletas sob contrato. A empresa está procurando espaço no mercado.</div> : <div style={{ display:'flex', flexDirection:'column', gap:6 }}>{athletes.map(({ contract, player }) => <button key={contract.id} onClick={(event) => { event.stopPropagation(); if (player) onOpenPlayer?.(player); }} style={{ border:'1px solid rgba(255,255,255,.09)', background:'rgba(255,255,255,.025)', color:'#F2EDE4', padding:'9px 10px', cursor:player ? 'pointer' : 'default', display:'grid', gridTemplateColumns:'minmax(0,1fr) auto', textAlign:'left', gap:10 }}><span><span style={{ display:'block', fontFamily:'Barlow Condensed,sans-serif', fontSize:16, fontWeight:700 }}>{player?.name ?? contract.playerName ?? 'Atleta indisponível'}</span><span style={{ fontFamily:'Space Mono,monospace', fontSize:6.5, color:'rgba(242,237,228,.45)', letterSpacing:'.12em' }}>{contract.type ?? 'CONTRATO'} · até {contract.endYear ?? '—'}</span></span><span style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:17, fontWeight:700, color:tierColor }}>{money(contract.annualFee)}/ano</span></button>)}</div>}
        </section>
      </div>
    </div>}
  </article>;
}

export default function CompaniesView({ state, onOpenPlayer }) {
  const [expandedId, setExpandedId] = useState(null);
  const [tier, setTier] = useState('ALL');
  const players = useMemo(() => [...(state?.tourPlayers ?? []), ...(state?.prospects ?? [])], [state?.tourPlayers, state?.prospects]);
  const playersById = useMemo(() => new Map(players.map(player => [player.id, player])), [players]);
  const pool = useMemo(() => ensureSponsorPoolFoundation(state?.sponsorPool, state?.year ?? 2025), [state?.sponsorPool, state?.year]);
  const companies = useMemo(() => SPONSOR_CATALOG.map(sponsor => ({ sponsor, state:pool?.states?.[sponsor.id] ?? {} })).filter(entry => tier === 'ALL' || entry.sponsor.tier === tier).sort((a,b) => (b.state?.company?.annualMarketingBudget ?? b.sponsor.budget ?? 0) - (a.state?.company?.annualMarketingBudget ?? a.sponsor.budget ?? 0)), [pool, tier]);
  const summary = useMemo(() => companies.reduce((acc, { sponsor, state:companyState }) => { const company=companyState?.company ?? {}; acc.budget += company.annualMarketingBudget ?? sponsor.budget ?? 0; acc.committed += company.budgetCommitted ?? companyState?.budgetUsed ?? 0; acc.athletes += companyState?.contracts?.length ?? 0; return acc; }, { budget:0, committed:0, athletes:0 }), [companies]);

  return <div style={{ maxWidth:1280, margin:'0 auto', padding:'32px 24px 70px', color:'#F2EDE4' }}>
    <div style={{ display:'flex', justifyContent:'space-between', gap:18, alignItems:'end', flexWrap:'wrap', borderBottom:'1px solid rgba(255,255,255,.10)', paddingBottom:20 }}>
      <div><div style={{ fontFamily:'Space Mono,monospace', fontSize:8, letterSpacing:'.28em', color:'#E8C84A' }}>MERCADO · INTELIGÊNCIA COMERCIAL</div><h1 style={{ fontFamily:'Barlow Condensed,sans-serif', margin:'7px 0 0', fontSize:'clamp(34px,5vw,58px)', letterSpacing:'.035em', lineHeight:.9 }}>EMPRESAS</h1><p style={{ margin:'10px 0 0', color:'rgba(242,237,228,.52)', fontSize:14 }}>Orçamento, diretoria, risco e atletas que movem o dinheiro fora da quadra.</p></div>
      <div style={{ display:'flex', gap:22, flexWrap:'wrap' }}><Metric label="Capital de marketing" value={money(summary.budget)} tone="#E8C84A" /><Metric label="Folha comprometida" value={money(summary.committed)} /><Metric label="Atletas em carteira" value={summary.athletes} tone="#7DE0A2" /></div>
    </div>
    <div style={{ display:'flex', gap:7, margin:'18px 0', flexWrap:'wrap' }}>{['ALL','ELITE','PREMIUM','MID','ENTRY'].map(id => <button key={id} onClick={() => setTier(id)} style={{ cursor:'pointer', padding:'7px 10px', border:`1px solid ${tier===id ? (TIER[id] ?? '#E8C84A') : 'rgba(255,255,255,.13)'}`, background:tier===id ? `${TIER[id] ?? '#E8C84A'}16` : 'transparent', color:tier===id ? (TIER[id] ?? '#E8C84A') : 'rgba(242,237,228,.48)', fontFamily:'Space Mono,monospace', fontSize:7, letterSpacing:'.14em' }}>{id === 'ALL' ? 'TODAS' : id}</button>)}</div>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(310px,1fr))', gap:12 }}>{companies.map(({ sponsor, state:companyState }) => <CompanyCard key={sponsor.id} sponsor={sponsor} state={companyState} playersById={playersById} expanded={expandedId===sponsor.id} onToggle={() => setExpandedId(current => current===sponsor.id ? null : sponsor.id)} onOpenPlayer={onOpenPlayer} />)}</div>
  </div>;
}
