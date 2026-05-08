/**
 * SponsorTab.jsx — Fase 5: Aba de Patrocínio no UnifiedPlayerProfile
 *
 * Exibe o perfil completo de patrocínio do jogador:
 *   — Contratos ativos por categoria (cards com logo, tier, fee, tempo restante)
 *   — Earnings de patrocínio vs prize money (quem depende de quê)
 *   — Histórico de contratos encerrados
 *   — Badge "Jogador mais bem pago" se aplicável
 *   — Sinal combinado para patrocinadores (IFR + Marketability + Visibilidade)
 *   — Marcas que demonstraram interesse recente (ofertas do último ciclo)
 *
 * USO em UnifiedPlayerProfile.jsx:
 *   1. import SponsorTab from './SponsorTab.jsx';
 *   2. No array TABS: { id:'patrocinio', name:'PATROCÍNIO', emoji:'ðŸ¤' }
 *   3. No array FILLED: adicionar 'patrocinio'
 *   4. No bloco de tab content:
 *        {activeTab==='patrocinio' && (
 *          <SponsorTab np={np} sc={sc} sponsorPool={sponsorPool}
 *                      year={year} highestPaidPlayerId={highestPaidPlayerId}
 *                      pendingOffers={pendingOffers} />
 *        )}
 */

import React, { useState } from 'react';
import { getSponsorshipProfile } from '../systems/sponsors/SponsorContractSystem.js';
import { SPONSOR_TIERS, getSponsorById } from '../systems/sponsors/SponsorProfiles.js';
import { getPhaseTwoTier } from '../systems/shots/PhaseTwo.js';

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS (espelha RG do UnifiedPlayerProfile)
// ─────────────────────────────────────────────────────────────────────────────
const RG = {
  bg:         '#06080A',
  bgPanel:    '#0F1518',
  gold:       '#E8C84A',
  white:      '#F2EDE4',
  chalkDim:   'rgba(242,237,228,.55)',
  textFaint:  'rgba(242,237,228,.28)',
  border:     'rgba(242,237,228,.07)',
  display:    "'Bebas Neue', sans-serif",
  cond:       "'Barlow Condensed', sans-serif",
  body:       "'Barlow', sans-serif",
  mono:       "'Space Mono', monospace",
};

const TIER_META = {
  ELITE:   { color: '#FFD700', glow: 'rgba(255,215,0,.35)',   icon: 'ðŸ‘‘', label: 'Elite'   },
  PREMIUM: { color: '#60FF90', glow: 'rgba(96,255,144,.25)',  icon: 'â­', label: 'Premium' },
  MID:     { color: '#60C8FF', glow: 'rgba(96,200,255,.20)',  icon: 'ðŸ”µ', label: 'Mid'     },
  ENTRY:   { color: '#8899AA', glow: 'rgba(136,153,170,.15)', icon: 'âšª', label: 'Entry'   },
};

const CATEGORY_LABEL = {
  RACKET:'Raquetes', APPAREL:'Vestuário', LUXURY:'Luxo',
  FINANCE:'Financeiro', TECH:'Tecnologia', ENERGY:'Energia',
  AIRLINE:'Aérea', AUTOMOTIVE:'Automotivo', RETAIL:'Varejo', MEDIA:'Mídia',
};

const CONTRACT_TYPE_LABEL = {
  BASE:'Base', PERFORMANCE:'Performance', IMAGE:'Imagem',
  EQUIPMENT:'Equipamento', AMBASSADOR:'Embaixador', PROSPECT_DEAL:'Prospect Deal',
};

function fmtUSD(v) {
  if (!v && v !== 0) return '—';
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(abs/1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${Math.round(abs/1_000)}K`;
  return `$${abs}`;
}

function SectionLabel({ children, color }) {
  return (
    <div style={{ fontFamily:RG.mono, fontSize:7, letterSpacing:'.42em',
      color:color??RG.textFaint, textTransform:'uppercase', marginBottom:12 }}>
      {children}
    </div>
  );
}

function EmptyState({ message, icon='ðŸ“­' }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'36px 24px', gap:10 }}>
      <div style={{ fontSize:32, opacity:.4 }}>{icon}</div>
      <div style={{ fontFamily:RG.mono, fontSize:9, letterSpacing:'.2em',
        color:RG.textFaint, textAlign:'center', textTransform:'uppercase' }}>
        {message}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTRACT CARD
// ─────────────────────────────────────────────────────────────────────────────
function ContractCard({ contract, sc, year }) {
  const tier = TIER_META[contract.tier] ?? TIER_META.ENTRY;
  const seasonsLeft = contract.duration - ((year??contract.seasonSigned) - contract.seasonSigned);
  const pct = Math.max(0, Math.min(100, (seasonsLeft/contract.duration)*100));

  return (
    <div style={{ background:RG.bgPanel, border:`1px solid ${tier.color}28`,
      borderLeft:`3px solid ${tier.color}`, borderRadius:2, padding:'14px 16px',
      position:'relative', overflow:'hidden' }}>

      <div style={{ position:'absolute', top:0, left:0, right:0, height:1,
        background:`linear-gradient(90deg,${tier.color}44,transparent)` }} />

      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ fontSize:22, width:40, height:40, display:'flex', alignItems:'center',
            justifyContent:'center', background:`${tier.color}0F`,
            border:`1px solid ${tier.color}28`, borderRadius:2 }}>
            {contract.logo ?? 'ðŸ·ï¸'}
          </div>
          <div>
            <div style={{ fontFamily:RG.cond, fontWeight:700, fontSize:15,
              color:RG.white, letterSpacing:'.02em', lineHeight:1.2 }}>
              {contract.sponsorName}
            </div>
            <div style={{ fontFamily:RG.mono, fontSize:7, letterSpacing:'.3em',
              color:tier.color, textTransform:'uppercase', marginTop:2 }}>
              {tier.icon} {tier.label} · {CATEGORY_LABEL[contract.category]??contract.category}
            </div>
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontFamily:RG.display, fontSize:22, color:tier.color,
            lineHeight:1, textShadow:`0 0 16px ${tier.glow}` }}>
            {fmtUSD(contract.annualFee)}
          </div>
          <div style={{ fontFamily:RG.mono, fontSize:7, color:RG.textFaint,
            letterSpacing:'.2em', textTransform:'uppercase', marginTop:2 }}>/ ano</div>
        </div>
      </div>

      <div style={{ display:'flex', gap:16, marginBottom:10 }}>
        {[
          { label:'Tipo',     value: CONTRACT_TYPE_LABEL[contract.contractType]??contract.contractType },
          { label:'Assinado', value: contract.seasonSigned },
          { label:'Duração',  value: `${contract.duration} temp.` },
          { label:'Restam',   value: `${seasonsLeft} temp.`,
            color: seasonsLeft<=1?'#FFB060':RG.chalkDim },
        ].map(d => (
          <div key={d.label}>
            <div style={{ fontFamily:RG.mono, fontSize:7, color:RG.textFaint,
              letterSpacing:'.3em', textTransform:'uppercase' }}>{d.label}</div>
            <div style={{ fontFamily:RG.cond, fontSize:12, marginTop:2,
              color:d.color??RG.chalkDim }}>{d.value}</div>
          </div>
        ))}
      </div>

      <div style={{ height:3, background:'rgba(255,255,255,.05)', position:'relative' }}>
        <div style={{ position:'absolute', left:0, top:0, height:'100%',
          width:`${pct}%`,
          background: seasonsLeft<=1
            ? 'linear-gradient(90deg,#FFB060,#FF7020)'
            : `linear-gradient(90deg,${tier.color}88,${tier.color})`,
          transition:'width .4s' }} />
      </div>

      {contract.tagline && (
        <div style={{ fontFamily:RG.body, fontStyle:'italic', fontSize:10,
          color:RG.textFaint, marginTop:8, lineHeight:1.5 }}>
          "{contract.tagline}"
        </div>
      )}

      {contract.contractType==='PERFORMANCE' && contract.bonuses && (
        <div style={{ marginTop:8, padding:'8px 10px',
          background:'rgba(255,215,0,.04)', border:'1px solid rgba(255,215,0,.12)',
          borderRadius:2 }}>
          <div style={{ fontFamily:RG.mono, fontSize:6, letterSpacing:'.3em',
            color:'rgba(255,215,0,.5)', textTransform:'uppercase', marginBottom:5 }}>
            Bônus de Performance
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {Object.entries(contract.bonuses).map(([k,v]) => (
              <div key={k} style={{ fontFamily:RG.mono, fontSize:8, color:'rgba(255,215,0,.7)',
                background:'rgba(255,215,0,.06)', border:'1px solid rgba(255,215,0,.15)',
                padding:'2px 6px' }}>
                {k.replace(/_/g,' ')}: +{fmtUSD(v)}
              </div>
            ))}
          </div>
        </div>
      )}

      {contract.contractType==='PROSPECT_DEAL' && (
        <div style={{ marginTop:8, padding:'8px 10px',
          background:'rgba(96,255,144,.04)', border:'1px solid rgba(96,255,144,.12)', borderRadius:2 }}>
          <div style={{ fontFamily:RG.mono, fontSize:6, letterSpacing:'.3em',
            color:'rgba(96,255,144,.5)', textTransform:'uppercase', marginBottom:5 }}>
            Escada de Gatilhos
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {[
              { label:'Top 50', mult:'Ã—2', unlocked:contract._top50Unlocked },
              { label:'Top 10', mult:'Ã—3', unlocked:contract._top10Unlocked },
              { label:'Top 5',  mult:'Ã—4', unlocked:contract._top5Unlocked  },
            ].map(t => (
              <div key={t.label} style={{ fontFamily:RG.mono, fontSize:8,
                color: t.unlocked?'#60FF90':'rgba(96,255,144,.4)',
                padding:'2px 6px',
                background: t.unlocked?'rgba(96,255,144,.10)':'rgba(96,255,144,.03)',
                border:`1px solid ${t.unlocked?'rgba(96,255,144,.35)':'rgba(96,255,144,.10)'}` }}>
                {t.unlocked?'✓ ':''}{t.label} {t.mult}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL GAUGE
// ─────────────────────────────────────────────────────────────────────────────
function SignalGauge({ np, sc }) {
  const phaseTwo = np.phaseTwo ?? {};
  const signal   = phaseTwo.sponsorSignal ?? 0;
  const ifr      = phaseTwo.ifr ?? 0;
  const vis      = phaseTwo.visibility ?? 0;
  const mkt      = np.personality?.marketability?.score ?? 0;
  const tier     = getPhaseTwoTier(signal);

  return (
    <div style={{ background:RG.bgPanel, border:`1px solid ${tier.color}28`,
      borderLeft:`3px solid ${tier.color}`, padding:'16px 18px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
        <div>
          <SectionLabel color={`${tier.color}88`}>Sinal para Patrocinadores</SectionLabel>
          <div style={{ fontFamily:RG.cond, fontWeight:700, fontSize:17,
            color:tier.color, textTransform:'uppercase', letterSpacing:'.04em' }}>
            {tier.label}
          </div>
        </div>
        <div style={{ fontFamily:RG.display, fontSize:48, color:tier.color,
          lineHeight:1, textShadow:`0 0 24px ${tier.glow??'transparent'}` }}>
          {signal}
        </div>
      </div>

      <div style={{ height:5, background:'rgba(255,255,255,.06)', marginBottom:16, position:'relative' }}>
        <div style={{ position:'absolute', left:0, top:0, height:'100%',
          width:`${signal}%`, background:tier.color,
          boxShadow:`0 0 8px ${tier.glow??'transparent'}`, transition:'width .5s' }} />
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {[
          { label:'Marketability', value:mkt, weight:'40%', color:sc },
          { label:'Forma Recente', value:ifr, weight:'35%', color:tier.color },
          { label:'Visibilidade',  value:vis, weight:'25%', color:'#AB47BC' },
        ].map(b => (
          <div key={b.label}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
              <span style={{ fontFamily:RG.mono, fontSize:7, color:RG.textFaint,
                letterSpacing:'.2em', textTransform:'uppercase' }}>{b.label}</span>
              <span style={{ fontFamily:RG.mono, fontSize:8, color:b.color }}>
                {b.value} <span style={{ color:RG.textFaint, fontSize:7 }}>({b.weight})</span>
              </span>
            </div>
            <div style={{ height:3, background:'rgba(255,255,255,.05)' }}>
              <div style={{ height:'100%', width:`${b.value}%`,
                background:`linear-gradient(90deg,${b.color}66,${b.color})`,
                transition:'width .5s' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Tier de acesso */}
      <div style={{ marginTop:14, display:'flex', flexDirection:'column', gap:4 }}>
        <SectionLabel>Elegibilidade por Tier</SectionLabel>
        {Object.entries(TIER_META).reverse().map(([tierId, tm]) => {
          const tierData     = SPONSOR_TIERS[tierId];
          const isAccessible = mkt >= tierData.minMarket;
          return (
            <div key={tierId} style={{ display:'flex', alignItems:'center', gap:10,
              padding:'6px 10px',
              background: isAccessible?`${tm.color}08`:'transparent',
              border:`1px solid ${isAccessible?tm.color+'28':RG.border}`,
              opacity: isAccessible?1:.45 }}>
              <span style={{ fontSize:12 }}>{tm.icon}</span>
              <span style={{ fontFamily:RG.cond, fontWeight:700, fontSize:12,
                color:tm.color, flex:1 }}>{tm.label}</span>
              <span style={{ fontFamily:RG.mono, fontSize:7,
                color: isAccessible?tm.color:RG.textFaint }}>
                {isAccessible?'✓ Elegível':`Mín. ${tierData.minMarket}`}
              </span>
              <span style={{ fontFamily:RG.mono, fontSize:7, color:RG.textFaint }}>
                {fmtUSD(tierData.contractRange[0])}–{fmtUSD(tierData.contractRange[1])}/ano
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EARNINGS BREAKDOWN
// ─────────────────────────────────────────────────────────────────────────────
function EarningsBreakdown({ np, sc, profile }) {
  const sponsorAnnual   = profile.totalActiveAnnual ?? 0;
  const prizeThisSeason = np.finance?.currentSeasonEarnings ?? 0;
  const total           = sponsorAnnual + prizeThisSeason;
  const sponsorPct      = total>0 ? Math.round((sponsorAnnual/total)*100) : 0;
  const prizePct        = total>0 ? 100-sponsorPct : 0;

  return (
    <div style={{ background:RG.bgPanel, border:`1px solid ${RG.border}`,
      borderLeft:`3px solid ${sc}`, padding:'16px 18px' }}>
      <SectionLabel>Composição de Renda</SectionLabel>

      <div style={{ display:'flex', gap:20, marginBottom:14 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:RG.mono, fontSize:7, color:sc,
            letterSpacing:'.3em', textTransform:'uppercase', marginBottom:4 }}>Patrocínio / ano</div>
          <div style={{ fontFamily:RG.display, fontSize:26, color:sc, lineHeight:1 }}>
            {fmtUSD(sponsorAnnual)}
          </div>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:RG.mono, fontSize:7, color:'#60C8FF',
            letterSpacing:'.3em', textTransform:'uppercase', marginBottom:4 }}>Prize Money</div>
          <div style={{ fontFamily:RG.display, fontSize:26, color:'#60C8FF', lineHeight:1 }}>
            {fmtUSD(prizeThisSeason)}
          </div>
        </div>
      </div>

      {total>0 && (
        <>
          <div style={{ height:8, display:'flex', overflow:'hidden', marginBottom:8 }}>
            <div style={{ width:`${sponsorPct}%`, background:sc, transition:'width .5s' }} />
            <div style={{ flex:1, background:'#60C8FF' }} />
          </div>
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <div style={{ fontFamily:RG.mono, fontSize:8, color:sc }}>{sponsorPct}% marca</div>
            <div style={{ fontFamily:RG.mono, fontSize:8, color:'#60C8FF' }}>{prizePct}% quadra</div>
          </div>
          <div style={{ marginTop:10, padding:'8px 10px',
            background:'rgba(255,255,255,.02)', border:`1px solid ${RG.border}`,
            fontFamily:RG.body, fontSize:11, color:RG.textFaint, lineHeight:1.6 }}>
            {sponsorPct>60
              ? `${np.name.split(' ')[0]} depende mais das marcas do que dos resultados.`
              : prizePct>60
              ? `${np.name.split(' ')[0]} vive dos resultados. As marcas têm que perseguir o atleta.`
              : `Equilíbrio entre performance e marca — o perfil mais cobiçado pelo mercado.`
            }
          </div>
        </>
      )}

      {(profile.careerSponsorshipTotal??0)>0 && (
        <div style={{ marginTop:12, display:'flex', gap:20 }}>
          <div>
            <div style={{ fontFamily:RG.mono, fontSize:7, color:RG.textFaint,
              letterSpacing:'.3em', textTransform:'uppercase', marginBottom:3 }}>
              Total Carreira (Patrocínio)
            </div>
            <div style={{ fontFamily:RG.cond, fontWeight:700, fontSize:14, color:sc }}>
              {fmtUSD(profile.careerSponsorshipTotal)}
            </div>
          </div>
          {(np.finance?.careerEarnings??0)>0 && (
            <div>
              <div style={{ fontFamily:RG.mono, fontSize:7, color:RG.textFaint,
                letterSpacing:'.3em', textTransform:'uppercase', marginBottom:3 }}>
                Total Carreira (Prize Money)
              </div>
              <div style={{ fontFamily:RG.cond, fontWeight:700, fontSize:14, color:'#60C8FF' }}>
                {fmtUSD(np.finance?.careerEarnings??0)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
export default function SponsorTab({ np, sc, sponsorPool, year, highestPaidPlayerId, pendingOffers=[] }) {
  const [subTab, setSubTab] = useState('contratos');

  if (!sponsorPool) {
    return (
      <div className="upp-scroll" style={{ flex:1, padding:'32px 28px', background:RG.bg }}>
        <EmptyState message="Sistema de patrocínio não inicializado" icon="ðŸ·ï¸" />
      </div>
    );
  }

  const profile       = getSponsorshipProfile(sponsorPool, np);
  const isHighestPaid = np.id === highestPaidPlayerId;
  const playerOffers  = pendingOffers.filter(o => o.playerId === np.id);

  const subBtnStyle = (id) => ({
    fontFamily:RG.mono, fontSize:8, letterSpacing:2,
    padding:'8px 16px', cursor:'pointer', border:'none', background:'none',
    color: subTab===id ? sc : RG.textFaint,
    borderBottom: subTab===id ? `2px solid ${sc}` : '2px solid transparent',
    textTransform:'uppercase', transition:'color .15s',
  });

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden', minHeight:0 }}>

      {/* Sub-tabs */}
      <div style={{ display:'flex', borderBottom:`1px solid ${RG.border}`,
        background:RG.bgPanel, flexShrink:0, padding:'0 16px' }}>
        <button style={subBtnStyle('contratos')} onClick={()=>setSubTab('contratos')}>ðŸ¤ Contratos</button>
        <button style={subBtnStyle('sinal')}     onClick={()=>setSubTab('sinal')}>ðŸ“¡ Sinal</button>
        <button style={subBtnStyle('historico')} onClick={()=>setSubTab('historico')}>ðŸ“‹ Histórico</button>
        {playerOffers.length>0 && (
          <button style={subBtnStyle('ofertas')} onClick={()=>setSubTab('ofertas')}>
            ðŸ“¨ Ofertas ({playerOffers.length})
          </button>
        )}
      </div>

      <div className="upp-scroll" style={{ flex:1, overflowY:'auto', padding:'20px 22px', background:RG.bg }}>

        {/* CONTRATOS */}
        {subTab==='contratos' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {isHighestPaid && (
              <div style={{ background:'rgba(255,215,0,.08)',
                border:'1px solid rgba(255,215,0,.3)', padding:'10px 16px',
                display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:20 }}>ðŸ’°</span>
                <div>
                  <div style={{ fontFamily:RG.mono, fontSize:7, letterSpacing:'.35em',
                    color:'rgba(255,215,0,.6)', textTransform:'uppercase' }}>Destaque do circuito</div>
                  <div style={{ fontFamily:RG.cond, fontWeight:700, fontSize:14, color:RG.gold }}>
                    Jogador mais bem pago da temporada
                  </div>
                </div>
              </div>
            )}

            {profile.activeContracts.length===0 && (
              <EmptyState
                message={profile.totalContracts===0 ? 'As marcas ainda não descobriram esse nome' : 'Sem contratos ativos'}
                icon="ðŸ“­"
              />
            )}

            {profile.activeContracts.map(c => (
              <ContractCard key={c.id} contract={c} sc={sc} year={year} />
            ))}

            {profile.activeContracts.length>0 && (
              <EarningsBreakdown np={np} sc={sc} profile={profile} />
            )}

            {profile.biggestContract && (
              <div style={{ background:RG.bgPanel, border:`1px solid ${RG.border}`,
                borderLeft:'3px solid rgba(255,215,0,.4)', padding:'12px 16px',
                display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontFamily:RG.mono, fontSize:7, letterSpacing:'.3em',
                    color:'rgba(255,215,0,.5)', textTransform:'uppercase', marginBottom:4 }}>
                    Maior Contrato da Carreira
                  </div>
                  <div style={{ fontFamily:RG.cond, fontSize:14, color:RG.chalkDim }}>
                    {profile.biggestContract.sponsorName} · {profile.biggestContract.year}
                  </div>
                </div>
                <div style={{ fontFamily:RG.display, fontSize:22, color:RG.gold }}>
                  {fmtUSD(profile.biggestContract.annualFee)}
                </div>
              </div>
            )}

            {profile.mostLoyalSponsor?.renewals >= 2 && (
              <div style={{ background:RG.bgPanel, border:`1px solid ${RG.border}`,
                borderLeft:`3px solid ${sc}44`, padding:'12px 16px',
                display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ fontSize:20 }}>{profile.mostLoyalSponsor.logo??'ðŸ·ï¸'}</div>
                <div>
                  <div style={{ fontFamily:RG.mono, fontSize:7, letterSpacing:'.3em',
                    color:RG.textFaint, textTransform:'uppercase', marginBottom:4 }}>
                    Parceria mais duradoura
                  </div>
                  <div style={{ fontFamily:RG.cond, fontSize:14, color:RG.chalkDim }}>
                    {profile.mostLoyalSponsor.name} · {profile.mostLoyalSponsor.renewals} renovações
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SINAL */}
        {subTab==='sinal' && <SignalGauge np={np} sc={sc} />}

        {/* HISTÓRICO */}
        {subTab==='historico' && (
          <div>
            <SectionLabel>Contratos Encerrados</SectionLabel>
            {profile.totalContracts===0
              ? <EmptyState message="Nenhum contrato na carreira" icon="ðŸ“‹" />
              : sponsorPool.contractArchive
                  .filter(c=>c.playerId===np.id)
                  .sort((a,b)=>(b.terminatedYear??0)-(a.terminatedYear??0))
                  .map((c,i) => {
                    const tier = TIER_META[c.sponsorTier]??TIER_META.ENTRY;
                    const reason = {
                      EXPIRED:'✓ Encerrado', SCANDAL:'âš  Rescisão — escândalo',
                      PERFORMANCE_DROP:'ðŸ“‰ Performance', INJURY_LONG:'ðŸ©¹ Lesão',
                      RIVAL_ASCENDED:'âš” Rival', BUDGET_CUT:'âœ‚ Budget',
                      RETIREMENT:'ðŸŒ… Aposentadoria', MUTUAL:'ðŸ¤ Mútua',
                    }[c.terminationReason]??'Encerrado';
                    return (
                      <div key={c.id??i} style={{ display:'flex', alignItems:'center', gap:12,
                        padding:'10px 14px', background:'rgba(255,255,255,.015)',
                        border:`1px solid ${RG.border}`, marginBottom:4 }}>
                        <div style={{ fontSize:16, opacity:.7 }}>{c.logo??'ðŸ·ï¸'}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ fontFamily:RG.cond, fontWeight:600, fontSize:13, color:RG.white }}>
                              {c.sponsorName}
                            </span>
                            <span style={{ fontFamily:RG.mono, fontSize:6, letterSpacing:'.3em',
                              color:tier.color, textTransform:'uppercase' }}>{tier.label}</span>
                          </div>
                          <div style={{ fontFamily:RG.mono, fontSize:7, color:RG.textFaint, marginTop:3 }}>
                            {c.seasonSigned} → {c.terminatedYear??c.seasonSigned+c.duration-1} · {reason}
                          </div>
                        </div>
                        <div style={{ fontFamily:RG.cond, fontWeight:700, fontSize:14, color:tier.color }}>
                          {fmtUSD(c.annualFee)}<span style={{ fontSize:9, color:RG.textFaint }}>/ano</span>
                        </div>
                      </div>
                    );
                  })
            }
          </div>
        )}

        {/* OFERTAS */}
        {subTab==='ofertas' && (
          <div>
            <SectionLabel>Ofertas Recentes</SectionLabel>
            {playerOffers.length===0
              ? <EmptyState message="Nenhuma oferta pendente" icon="ðŸ“¨" />
              : playerOffers.sort((a,b)=>b.annualFee-a.annualFee).map((o,i) => {
                  const tier = TIER_META[o.sponsorTier]??TIER_META.ENTRY;
                  return (
                    <div key={o.id??i} style={{ background:RG.bgPanel,
                      border:`1px dashed ${tier.color}44`, padding:'12px 14px',
                      display:'flex', alignItems:'center', gap:12, marginBottom:6 }}>
                      <div style={{ fontSize:20 }}>{o.logo??'ðŸ·ï¸'}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontFamily:RG.cond, fontWeight:600, fontSize:13, color:RG.white }}>
                            {o.sponsorName}
                          </span>
                          <span style={{ fontFamily:RG.mono, fontSize:6, letterSpacing:'.3em',
                            color:tier.color, textTransform:'uppercase' }}>{tier.label}</span>
                        </div>
                        {o.reasons?.[0] && (
                          <div style={{ fontFamily:RG.body, fontSize:10, color:RG.textFaint,
                            marginTop:3, fontStyle:'italic' }}>{o.reasons[0]}</div>
                        )}
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontFamily:RG.display, fontSize:18, color:tier.color }}>
                          {fmtUSD(o.annualFee)}
                        </div>
                        <div style={{ fontFamily:RG.mono, fontSize:7, color:RG.textFaint }}>
                          {o.duration} temp.
                        </div>
                      </div>
                    </div>
                  );
                })
            }
          </div>
        )}
      </div>
    </div>
  );
}

