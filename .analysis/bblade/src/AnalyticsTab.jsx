// Analytics Component para BroadcastHub
import React, { useState, useMemo } from 'react';
import { BarChart3, Download, TrendingUp, FileText, Zap } from 'lucide-react';
import { LAUNCH_TECHNIQUES } from './UniverseManager.js';

// ─── Cor de performance ───────────────────────────────────────
function perfColor(wr) {
  if (wr >= 0.58) return '#22c55e';
  if (wr >= 0.52) return '#ffd700';
  if (wr >= 0.48) return '#f97316';
  return '#ef4444';
}

// ─── Configs de Mentalidades ──────────────────────────────────
const MENTALITY_CONFIG = {
  ALL_ROUNDER:        { label: 'All Rounder',       icon: '⚖️',  color: '#60a5fa' },
  GLASS_CANNON:       { label: 'Glass Cannon',       icon: '💥',  color: '#ef4444' },
  IRON_FORTRESS:      { label: 'Iron Fortress',      icon: '🛡️',  color: '#94a3b8' },
  CHAOS_AGENT:        { label: 'Chaos Agent',        icon: '🌀',  color: '#a855f7' },
  ETERNAL_SPINNER:    { label: 'Eternal Spinner',    icon: '🔄',  color: '#14b8a6' },
  MOMENTUM_MASTER:    { label: 'Momentum Master',    icon: '⚡',  color: '#f97316' },
  MOMENTUM_THIEF:     { label: 'Momentum Thief',     icon: '🎭',  color: '#ec4899' },
  PERFECTIONIST:      { label: 'Perfectionist',      icon: '🎯',  color: '#ffd700' },
  SYNERGY_SEEKER:     { label: 'Synergy Seeker',     icon: '🔗',  color: '#22c55e' },
  ADAPTIVE_TACTICIAN: { label: 'Adaptive Tactician', icon: '🧠',  color: '#06b6d4' },
  CALCULATED_CHAOS:   { label: 'Calculated Chaos',   icon: '🎲',  color: '#8b5cf6' },
  HIGH_RISK_GAMBLER:  { label: 'High Risk Gambler',  icon: '🎰',  color: '#fb923c' },
};

// ─── Configs de Tipos ─────────────────────────────────────────
const TYPE_CONFIG = {
  Attack:  { label: 'Attack',  icon: '⚔️', color: '#ef4444' },
  Defense: { label: 'Defense', icon: '🛡️', color: '#60a5fa' },
  Stamina: { label: 'Stamina', icon: '🌀', color: '#22c55e' },
  Balance: { label: 'Balance', icon: '⚖️', color: '#ffd700' },
};

// ══════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════
export function AnalyticsTab({ analytics }) {
  const [selectedView, setSelectedView] = useState('mentalidades');

  if (!analytics) {
    return (
      <div style={{ textAlign:'center', padding:60, color:'rgba(255,255,255,0.3)' }}>
        <BarChart3 size={64} style={{ margin:'0 auto 20px', opacity:0.3 }}/>
        <div style={{ fontSize:18, fontFamily:'Orbitron,monospace' }}>ANALYTICS AINDA NÃO DISPONÍVEL</div>
        <div style={{ fontSize:12, marginTop:8 }}>Jogue algumas partidas para começar a coletar dados</div>
      </div>
    );
  }

  const views = [
    { id:'mentalidades', label:'MENTALIDADES' },
    { id:'arenas',       label:'ARENAS'       },
    { id:'peao',         label:'PEÃO BUILDING'},
    { id:'launch',       label:'LAUNCH'       },
    { id:'balance',      label:'BALANCEAMENTO'},
    { id:'export',       label:'EXPORTAR'     },
  ];

  const handleExport = (type) => {
    switch(type) {
      case 'matches': analytics.downloadCSV(analytics.exportMatchesCSV(), 'beyblade_matches_analytics.csv'); break;
      case 'rounds':  analytics.downloadCSV(analytics.exportRoundsCSV(),  'beyblade_rounds_analytics.csv'); break;
      case 'arenas':  analytics.downloadCSV(analytics.exportArenasCSV(),  'beyblade_arenas_analytics.csv'); break;
      case 'json': {
        const blob = new Blob([JSON.stringify(analytics.exportJSON(), null, 2)], { type:'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'beyblade_analytics_full.json';
        a.click();
        break;
      }
    }
  };

  return (
    <div style={{ animation:'hub-entry .4s ease both' }}>
      {/* Header stats */}
      <div style={{ marginBottom:20 }}>
        <div className="hub-section-label">📊 ANALYTICS DASHBOARD</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          <StatCard label="Total de Jogos"    value={analytics.matchStats.total}              icon="🎮"/>
          <StatCard label="Total de Rounds"   value={analytics.roundStats.total}              icon="⚔️"/>
          <StatCard label="Upsets"            value={analytics.matchStats.byUpset?.total||0}  icon="🎯"
            subtitle={`${analytics.matchStats.byUpset?.by20plus||0} super upsets`}/>
          <StatCard label="Avisos de Balanço" value={analytics.balanceWarnings?.length||0}    icon="⚠️"
            alert={analytics.balanceWarnings?.length > 0}/>
        </div>
      </div>

      {/* Sub-nav */}
      <div style={{ display:'flex', gap:6, marginBottom:20, borderBottom:'1px solid rgba(255,255,255,0.1)', paddingBottom:12, flexWrap:'wrap' }}>
        {views.map(v => (
          <button key={v.id} onClick={() => setSelectedView(v.id)} style={{
            padding:'8px 14px',
            background: selectedView===v.id ? 'rgba(255,215,0,0.15)' : 'transparent',
            border: selectedView===v.id ? '1px solid rgba(255,215,0,0.3)' : '1px solid transparent',
            color: selectedView===v.id ? '#ffd700' : 'rgba(255,255,255,0.5)',
            cursor:'pointer', fontFamily:'Orbitron,monospace', fontSize:10, letterSpacing:'.1em', transition:'all .2s'
          }}>{v.label}</button>
        ))}
      </div>

      {selectedView==='mentalidades' && <MentalidadesView analytics={analytics}/>}
      {selectedView==='arenas'       && <ArenasView       analytics={analytics}/>}
      {selectedView==='peao'         && <PeaoBuildingView analytics={analytics}/>}
      {selectedView==='launch'       && <LaunchView       analytics={analytics}/>}
      {selectedView==='balance'      && <BalanceView      analytics={analytics}/>}
      {selectedView==='export'       && <ExportView       onExport={handleExport}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// StatCard
// ══════════════════════════════════════════════════════════════
function StatCard({ label, value, icon, subtitle, alert }) {
  return (
    <div style={{
      background: alert ? 'rgba(255,69,0,0.1)' : 'rgba(255,255,255,0.03)',
      border:`1px solid ${alert?'rgba(255,69,0,0.3)':'rgba(255,255,255,0.08)'}`,
      padding:16, borderRadius:4
    }}>
      <div style={{ fontSize:24, marginBottom:4 }}>{icon}</div>
      <div style={{ fontSize:28, fontFamily:'Orbitron,monospace', color:alert?'#ff4500':'#ffd700', fontWeight:700 }}>
        {(value||0).toLocaleString()}
      </div>
      <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', letterSpacing:'.1em', textTransform:'uppercase', marginTop:4 }}>{label}</div>
      {subtitle && <div style={{ fontSize:9, color:'rgba(255,255,255,0.3)', marginTop:4 }}>{subtitle}</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ExpandableRow — card principal + sub-linhas H2H
// ══════════════════════════════════════════════════════════════
function ExpandableRow({ icon, color, name, desc, winRate, wins, losses, uses, usageLabel, subRows }) {
  const [open, setOpen] = useState(false);
  const winPct = (winRate * 100).toFixed(1);
  const pc = perfColor(winRate);

  return (
    <div style={{ borderRadius:10, overflow:'hidden', border:'1px solid rgba(255,255,255,0.07)' }}>
      {/* MAIN ROW */}
      <div
        onClick={() => subRows?.length && setOpen(o => !o)}
        style={{
          padding:'14px 20px', position:'relative', overflow:'hidden',
          borderLeft:`3px solid ${color}`, background:'rgba(255,255,255,0.02)',
          cursor: subRows?.length ? 'pointer' : 'default',
          display:'grid', gridTemplateColumns:'auto 1fr auto auto', gap:14, alignItems:'center'
        }}
      >
        <div style={{ position:'absolute',inset:0,background:`linear-gradient(90deg,${pc}06,transparent 60%)`,pointerEvents:'none'}}/>

        {/* Icon + Name */}
        <div style={{ display:'flex',alignItems:'center',gap:10,position:'relative' }}>
          <div style={{ fontSize:24,width:42,height:42,display:'flex',alignItems:'center',justifyContent:'center',
            background:`${color}15`,borderRadius:8,border:`1px solid ${color}40` }}>{icon}</div>
          <div>
            <div style={{ fontFamily:'Orbitron,monospace',fontSize:13,fontWeight:700,letterSpacing:'.07em',color:'rgba(255,255,255,0.9)',marginBottom:2 }}>{name}</div>
            {desc && <div style={{ fontSize:10,color:'rgba(255,255,255,0.35)' }}>{desc}</div>}
          </div>
        </div>

        {/* Bar */}
        <div style={{ display:'flex',flexDirection:'column',gap:4,position:'relative' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'baseline' }}>
            <div style={{ fontSize:9,color:'rgba(255,255,255,0.4)',fontFamily:'Rajdhani',fontWeight:600,letterSpacing:'.08em' }}>WIN RATE GERAL</div>
            <div style={{ fontSize:17,fontWeight:700,fontFamily:'Orbitron,monospace',color:pc }}>{winPct}%</div>
          </div>
          <div style={{ height:5,background:'rgba(255,255,255,0.05)',borderRadius:3,overflow:'hidden' }}>
            <div style={{ height:'100%',width:`${winPct}%`,background:`linear-gradient(90deg,${pc},${pc}cc)`,boxShadow:`0 0 8px ${pc}40`,transition:'width .5s' }}/>
          </div>
        </div>

        {/* W/L */}
        <div style={{ display:'flex',gap:14,alignItems:'center',position:'relative' }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:9,color:'rgba(255,255,255,0.35)',marginBottom:2,fontFamily:'Rajdhani',letterSpacing:'.05em' }}>{usageLabel||'TOTAL'}</div>
            <div style={{ fontSize:14,fontWeight:700,fontFamily:'Orbitron,monospace',color:'rgba(255,255,255,0.9)' }}>{uses||0}</div>
          </div>
          <div style={{ width:1,height:32,background:'rgba(255,255,255,0.08)' }}/>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:9,color:'rgba(255,255,255,0.35)',marginBottom:2,fontFamily:'Rajdhani' }}>W / L</div>
            <div style={{ fontSize:12,fontFamily:'Orbitron,monospace' }}>
              <span style={{ color:'#22c55e',fontWeight:700 }}>{wins}</span>
              <span style={{ color:'rgba(255,255,255,0.3)',margin:'0 3px' }}>/</span>
              <span style={{ color:'#ef4444',fontWeight:700 }}>{losses}</span>
            </div>
          </div>
        </div>

        {/* Toggle */}
        {subRows?.length > 0 && (
          <div style={{ fontSize:10,color:'rgba(255,255,255,0.4)',display:'flex',alignItems:'center',gap:4,fontFamily:'Rajdhani',position:'relative' }}>
            <span>{subRows.length} matchups</span>
            <span style={{ transform:open?'rotate(180deg)':'rotate(0)',transition:'transform .2s',display:'inline-block' }}>▼</span>
          </div>
        )}
      </div>

      {/* SUB-ROWS */}
      {open && subRows?.length > 0 && (
        <div style={{ background:'rgba(0,0,0,0.35)',borderTop:'1px solid rgba(255,255,255,0.06)' }}>
          {subRows.map((sr, idx) => {
            const srPct = (sr.winRate * 100).toFixed(1);
            const srC   = perfColor(sr.winRate);
            return (
              <div key={sr.key} style={{
                display:'grid',gridTemplateColumns:'auto 1fr auto',gap:12,alignItems:'center',
                padding:'10px 20px 10px 44px',
                borderBottom: idx < subRows.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                background: idx%2===0 ? 'rgba(255,255,255,0.015)' : 'transparent'
              }}>
                <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                  <div style={{ width:2,height:22,background:`${color}60`,borderRadius:1 }}/>
                  <span style={{ fontSize:15 }}>{sr.icon}</span>
                  <span style={{ fontFamily:'Rajdhani',fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.65)',letterSpacing:'.04em' }}>
                    vs {sr.label}
                  </span>
                </div>
                <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                  <div style={{ flex:1,height:4,background:'rgba(255,255,255,0.05)',borderRadius:2,overflow:'hidden' }}>
                    <div style={{ height:'100%',width:`${srPct}%`,background:`linear-gradient(90deg,${srC},${srC}bb)`,transition:'width .4s' }}/>
                  </div>
                  <div style={{ fontSize:13,fontWeight:700,fontFamily:'Orbitron,monospace',color:srC,minWidth:42,textAlign:'right' }}>{srPct}%</div>
                </div>
                <div style={{ fontSize:11,fontFamily:'Orbitron,monospace',color:'rgba(255,255,255,0.45)',whiteSpace:'nowrap' }}>
                  <span style={{ color:'#22c55e' }}>{sr.wins}W</span>
                  <span style={{ color:'rgba(255,255,255,0.2)',margin:'0 3px' }}>/</span>
                  <span style={{ color:'#ef4444' }}>{sr.losses}L</span>
                  <span style={{ color:'rgba(255,255,255,0.25)',fontSize:10,marginLeft:4 }}>({sr.uses})</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MENTALIDADES VIEW
// ══════════════════════════════════════════════════════════════
function MentalidadesView({ analytics }) {
  const mentData = useMemo(() => {
    const byMentality = analytics.matchStats?.byMentality;
    if (!byMentality) return [];

    const totals = new Map();
    const mentKeys = Object.keys(MENTALITY_CONFIG);

    byMentality.forEach((data, key) => {
      // Descobre mentA e mentB pelo padrão "MentA_vs_MentB"
      let mentA = null, mentB = null;
      for (const mk of mentKeys) {
        if (key.startsWith(mk + '_vs_')) {
          mentA = mk;
          mentB = key.slice(mk.length + 4);
          break;
        }
      }
      // fallback: tenta split por _vs_
      if (!mentA) {
        const idx = key.indexOf('_vs_');
        if (idx < 0) return;
        mentA = key.slice(0, idx);
        mentB = key.slice(idx + 4);
      }
      if (!mentA || !mentB) return;

      if (!totals.has(mentA)) totals.set(mentA, { wins:0, losses:0, vsMap: new Map() });
      if (!totals.has(mentB)) totals.set(mentB, { wins:0, losses:0, vsMap: new Map() });

      const wA = data.wins   || 0;
      const wB = data.losses || 0;

      totals.get(mentA).wins   += wA;
      totals.get(mentA).losses += wB;
      totals.get(mentB).wins   += wB;
      totals.get(mentB).losses += wA;

      totals.get(mentA).vsMap.set(mentB, { wins:wA, losses:wB, uses:wA+wB });
      totals.get(mentB).vsMap.set(mentA, { wins:wB, losses:wA, uses:wA+wB });
    });

    return Array.from(totals.entries())
      .map(([ment, d]) => {
        const total   = d.wins + d.losses;
        const winRate = total > 0 ? d.wins / total : 0;
        const cfg = MENTALITY_CONFIG[ment] || { label:ment, icon:'❓', color:'#94a3b8' };

        const subRows = Array.from(d.vsMap.entries())
          .map(([opp, vs]) => {
            const oppCfg = MENTALITY_CONFIG[opp] || { label:opp, icon:'❓', color:'#94a3b8' };
            return { key:opp, icon:oppCfg.icon, label:oppCfg.label, wins:vs.wins, losses:vs.losses, uses:vs.uses,
              winRate: vs.uses > 0 ? vs.wins/vs.uses : 0 };
          })
          .filter(s => s.uses > 0)
          .sort((a,b) => b.winRate - a.winRate);

        return { ment, cfg, wins:d.wins, losses:d.losses, total, winRate, subRows };
      })
      .filter(d => d.total > 0)
      .sort((a,b) => b.winRate - a.winRate);
  }, [analytics]);

  if (!mentData.length) return <EmptyState icon={<BarChart3 size={48}/>} msg="SEM DADOS DE MENTALIDADES"/>;

  return (
    <div>
      <SectionHeader title="MENTALIDADES" subtitle={`${mentData.length} mentalidades registradas`}/>
      <div style={{ display:'grid', gap:8 }}>
        {mentData.map(d => (
          <ExpandableRow key={d.ment}
            icon={d.cfg.icon} color={d.cfg.color} name={d.cfg.label}
            winRate={d.winRate} wins={d.wins} losses={d.losses}
            uses={d.total} usageLabel="JOGOS" subRows={d.subRows}/>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PEÃO BUILDING VIEW
// ══════════════════════════════════════════════════════════════
function PeaoBuildingView({ analytics }) {
  const typeData = useMemo(() => {
    const byType = analytics.roundStats?.byType;
    if (!byType) return [];

    const totals  = new Map();
    const typeKeys = Object.keys(TYPE_CONFIG);

    byType.forEach((data, key) => {
      let typeA = null, typeB = null;
      for (const tk of typeKeys) {
        if (key.startsWith(tk + '_vs_')) {
          typeA = tk;
          typeB = key.slice(tk.length + 4);
          break;
        }
      }
      if (!typeA || !typeB) return;

      if (!totals.has(typeA)) totals.set(typeA, { wins:0, losses:0, vsMap: new Map() });
      if (!totals.has(typeB)) totals.set(typeB, { wins:0, losses:0, vsMap: new Map() });

      const wA = data.wins   || 0;
      const wB = data.losses || 0;

      totals.get(typeA).wins   += wA;
      totals.get(typeA).losses += wB;
      totals.get(typeB).wins   += wB;
      totals.get(typeB).losses += wA;

      totals.get(typeA).vsMap.set(typeB, { wins:wA, losses:wB, uses:wA+wB });
      totals.get(typeB).vsMap.set(typeA, { wins:wB, losses:wA, uses:wA+wB });
    });

    return Array.from(totals.entries())
      .map(([type, d]) => {
        const total   = d.wins + d.losses;
        const winRate = total > 0 ? d.wins / total : 0;
        const cfg = TYPE_CONFIG[type] || { label:type, icon:'❓', color:'#94a3b8' };

        const subRows = Array.from(d.vsMap.entries())
          .map(([opp, vs]) => {
            const oppCfg = TYPE_CONFIG[opp] || { label:opp, icon:'❓', color:'#94a3b8' };
            return { key:opp, icon:oppCfg.icon, label:oppCfg.label, wins:vs.wins, losses:vs.losses, uses:vs.uses,
              winRate: vs.uses > 0 ? vs.wins/vs.uses : 0 };
          })
          .filter(s => s.uses > 0)
          .sort((a,b) => b.winRate - a.winRate);

        return { type, cfg, wins:d.wins, losses:d.losses, total, winRate, subRows };
      })
      .filter(d => d.total > 0)
      .sort((a,b) => b.winRate - a.winRate);
  }, [analytics]);

  if (!typeData.length) return <EmptyState icon={<BarChart3 size={48}/>} msg="SEM DADOS DE TIPOS"/>;

  return (
    <div>
      <SectionHeader title="PEÃO BUILDING" subtitle="Win rate por tipo de peão e confrontos diretos"/>
      <div style={{ display:'grid', gap:8 }}>
        {typeData.map(d => (
          <ExpandableRow key={d.type}
            icon={d.cfg.icon} color={d.cfg.color} name={d.cfg.label}
            winRate={d.winRate} wins={d.wins} losses={d.losses}
            uses={d.total} usageLabel="ROUNDS" subRows={d.subRows}/>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// LAUNCH VIEW
// ══════════════════════════════════════════════════════════════
function LaunchView({ analytics }) {
  const [expanded, setExpanded] = useState({});

  if (!analytics?.roundStats?.byLaunchTechnique) {
    return <EmptyState icon={<Zap size={48}/>} msg="SEM DADOS DE LAUNCH TECHNIQUES" sub="Simule alguns torneios para coletar estatísticas"/>;
  }

  const ltMap  = analytics.roundStats.byLaunchTechnique;
  const ltData = Array.from(ltMap.entries())
    .map(([technique, data]) => ({
      technique, ...data,
      config: LAUNCH_TECHNIQUES[technique] || { name:technique, icon:'⚪', color:'#94a3b8', desc:'Unknown technique' }
    }))
    .sort((a,b) => b.winRate - a.winRate);

  const totalUses = ltData.reduce((s, lt) => s + lt.uses, 0);
  const toggle    = (t) => setExpanded(prev => ({ ...prev, [t]: !prev[t] }));

  return (
    <div>
      <SectionHeader title="LAUNCH TECHNIQUES"
        subtitle={`Análise de taxa de vitória por técnica de lançamento • ${totalUses.toLocaleString()} lançamentos registrados`}/>

      <div style={{ display:'grid', gap:8 }}>
        {ltData.map(lt => {
          const winPct = (lt.winRate * 100).toFixed(1);
          const usePct = totalUses > 0 ? (lt.uses / totalUses * 100).toFixed(1) : '0.0';
          const pc     = perfColor(lt.winRate);
          const isOpen = !!expanded[lt.technique];

          const vsData = lt.vsLaunch
            ? Array.from(lt.vsLaunch.entries())
                .map(([opp, vs]) => ({ opp, ...vs, config: LAUNCH_TECHNIQUES[opp] || { name:opp, icon:'⚪', color:'#94a3b8' } }))
                .filter(v => v.uses >= 1)
                .sort((a,b) => b.winRate - a.winRate)
            : [];

          return (
            <div key={lt.technique} style={{ borderRadius:10, overflow:'hidden', border:'1px solid rgba(255,255,255,0.07)' }}>
              <div
                onClick={() => vsData.length && toggle(lt.technique)}
                style={{
                  padding:'14px 20px', position:'relative', overflow:'hidden',
                  borderLeft:`3px solid ${lt.config.color}`, background:'rgba(255,255,255,0.02)',
                  cursor: vsData.length ? 'pointer':'default',
                  display:'grid', gridTemplateColumns:'auto 1fr auto auto', gap:14, alignItems:'center'
                }}
              >
                <div style={{ position:'absolute',inset:0,background:`linear-gradient(90deg,${pc}06,transparent 60%)`,pointerEvents:'none'}}/>
                <div style={{ display:'flex',alignItems:'center',gap:10,position:'relative' }}>
                  <div style={{ fontSize:24,width:42,height:42,display:'flex',alignItems:'center',justifyContent:'center',
                    background:`${lt.config.color}15`,borderRadius:8,border:`1px solid ${lt.config.color}40` }}>{lt.config.icon}</div>
                  <div>
                    <div style={{ fontFamily:'Orbitron,monospace',fontSize:13,fontWeight:700,letterSpacing:'.07em',color:'rgba(255,255,255,0.9)',marginBottom:2 }}>{lt.config.name}</div>
                    <div style={{ fontSize:10,color:'rgba(255,255,255,0.35)' }}>{lt.config.desc}</div>
                  </div>
                </div>
                <div style={{ display:'flex',flexDirection:'column',gap:4,position:'relative' }}>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'baseline' }}>
                    <div style={{ fontSize:9,color:'rgba(255,255,255,0.4)',fontFamily:'Rajdhani',fontWeight:600,letterSpacing:'.08em' }}>WIN RATE GERAL</div>
                    <div style={{ fontSize:17,fontWeight:700,fontFamily:'Orbitron,monospace',color:pc }}>{winPct}%</div>
                  </div>
                  <div style={{ height:5,background:'rgba(255,255,255,0.05)',borderRadius:3,overflow:'hidden' }}>
                    <div style={{ height:'100%',width:`${winPct}%`,background:`linear-gradient(90deg,${pc},${pc}cc)`,boxShadow:`0 0 8px ${pc}40`,transition:'width .5s' }}/>
                  </div>
                </div>
                <div style={{ display:'flex',gap:14,alignItems:'center',position:'relative' }}>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:9,color:'rgba(255,255,255,0.35)',marginBottom:2,fontFamily:'Rajdhani',letterSpacing:'.05em' }}>USOS</div>
                    <div style={{ fontSize:14,fontWeight:700,fontFamily:'Orbitron,monospace',color:'rgba(255,255,255,0.9)' }}>{lt.uses}</div>
                    <div style={{ fontSize:9,color:'rgba(255,255,255,0.25)' }}>{usePct}%</div>
                  </div>
                  <div style={{ width:1,height:32,background:'rgba(255,255,255,0.08)' }}/>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:9,color:'rgba(255,255,255,0.35)',marginBottom:2,fontFamily:'Rajdhani' }}>W / L</div>
                    <div style={{ fontSize:12,fontFamily:'Orbitron,monospace' }}>
                      <span style={{ color:'#22c55e',fontWeight:700 }}>{lt.wins}</span>
                      <span style={{ color:'rgba(255,255,255,0.3)',margin:'0 3px' }}>/</span>
                      <span style={{ color:'#ef4444',fontWeight:700 }}>{lt.losses}</span>
                    </div>
                  </div>
                </div>
                {vsData.length > 0 && (
                  <div style={{ fontSize:10,color:'rgba(255,255,255,0.4)',display:'flex',alignItems:'center',gap:4,fontFamily:'Rajdhani',position:'relative' }}>
                    <span>{vsData.length} matchups</span>
                    <span style={{ transform:isOpen?'rotate(180deg)':'rotate(0)',transition:'transform .2s',display:'inline-block' }}>▼</span>
                  </div>
                )}
              </div>

              {isOpen && vsData.length > 0 && (
                <div style={{ background:'rgba(0,0,0,0.35)',borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                  {vsData.map((vs, idx) => {
                    const vsPct = (vs.winRate * 100).toFixed(1);
                    const vsC   = perfColor(vs.winRate);
                    return (
                      <div key={vs.opp} style={{
                        display:'grid',gridTemplateColumns:'auto 1fr auto',gap:12,alignItems:'center',
                        padding:'10px 20px 10px 44px',
                        borderBottom:idx<vsData.length-1?'1px solid rgba(255,255,255,0.04)':'none',
                        background:idx%2===0?'rgba(255,255,255,0.015)':'transparent'
                      }}>
                        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                          <div style={{ width:2,height:22,background:`${lt.config.color}60`,borderRadius:1 }}/>
                          <span style={{ fontSize:15 }}>{vs.config.icon}</span>
                          <span style={{ fontFamily:'Rajdhani',fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.65)',letterSpacing:'.04em' }}>
                            vs {vs.config.name}
                          </span>
                        </div>
                        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                          <div style={{ flex:1,height:4,background:'rgba(255,255,255,0.05)',borderRadius:2,overflow:'hidden' }}>
                            <div style={{ height:'100%',width:`${vsPct}%`,background:`linear-gradient(90deg,${vsC},${vsC}bb)`,transition:'width .4s' }}/>
                          </div>
                          <div style={{ fontSize:13,fontWeight:700,fontFamily:'Orbitron,monospace',color:vsC,minWidth:42,textAlign:'right' }}>{vsPct}%</div>
                        </div>
                        <div style={{ fontSize:11,fontFamily:'Orbitron,monospace',color:'rgba(255,255,255,0.45)',whiteSpace:'nowrap' }}>
                          <span style={{ color:'#22c55e' }}>{vs.wins}W</span>
                          <span style={{ color:'rgba(255,255,255,0.2)',margin:'0 3px' }}>/</span>
                          <span style={{ color:'#ef4444' }}>{vs.losses}L</span>
                          <span style={{ color:'rgba(255,255,255,0.25)',fontSize:10,marginLeft:4 }}>({vs.uses})</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Resumo */}
      <div className="hub-card" style={{ marginTop:20, padding:18 }}>
        <div style={{ fontFamily:'Orbitron,monospace',fontSize:12,fontWeight:700,marginBottom:12,letterSpacing:'.1em',color:'rgba(255,255,255,0.7)' }}>📊 RESUMO</div>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12 }}>
          {[
            { label:'Fortes (≥58%)', color:'#22c55e', count:ltData.filter(l=>l.winRate>=0.58).length },
            { label:'Boas (52-57%)', color:'#ffd700', count:ltData.filter(l=>l.winRate>=0.52&&l.winRate<0.58).length },
            { label:'Fracas (<48%)', color:'#ef4444', count:ltData.filter(l=>l.winRate<0.48).length },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize:11,color:'rgba(255,255,255,0.4)',marginBottom:4 }}>{s.label}</div>
              <div style={{ fontSize:22,fontWeight:700,fontFamily:'Orbitron,monospace',color:s.color }}>{s.count}</div>
            </div>
          ))}
          <div>
            <div style={{ fontSize:11,color:'rgba(255,255,255,0.4)',marginBottom:4 }}>Mais Usada</div>
            <div style={{ fontSize:12,fontWeight:700,fontFamily:'Orbitron,monospace',color:'rgba(255,255,255,0.9)' }}>
              {[...ltData].sort((a,b)=>b.uses-a.uses)[0]?.config.icon} {[...ltData].sort((a,b)=>b.uses-a.uses)[0]?.config.name||'N/A'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ARENAS VIEW
// ══════════════════════════════════════════════════════════════
function ArenasView({ analytics }) {
  const arenaData = useMemo(() => {
    const arenas = [];
    analytics.roundStats.byArena?.forEach((data, arena) => {
      const typeWins = Array.from(data.typeWins?.entries?.() || []).sort((a,b) => b[1]-a[1]);
      const dominantType = typeWins[0] || ['N/A', 0];
      arenas.push({
        name: arena,
        totalRounds: data.totalRounds || 0,
        dominantType: dominantType[0],
        dominantWinRate: data.totalRounds ? dominantType[1]/data.totalRounds : 0,
        burstRate:  data.totalRounds ? (data.finishMethods?.burst||0)/data.totalRounds : 0,
        spinRate:   data.totalRounds ? (data.finishMethods?.spin||0)/data.totalRounds  : 0,
      });
    });
    return arenas.sort((a,b) => b.totalRounds - a.totalRounds);
  }, [analytics]);

  return (
    <div>
      <SectionHeader title="🏟️ ESTATÍSTICAS POR ARENA"/>
      <div style={{ display:'grid', gap:12 }}>
        {arenaData.map(arena => {
          const burstAlert = arena.burstRate > 0.25;
          return (
            <div key={arena.name} style={{
              background:'rgba(255,255,255,0.03)',
              border:`1px solid ${burstAlert?'rgba(255,69,0,0.3)':'rgba(255,255,255,0.08)'}`,
              padding:16
            }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:14,fontWeight:600,marginBottom:4 }}>{arena.name}</div>
                  <div style={{ fontSize:10,color:'rgba(255,255,255,0.4)' }}>{arena.totalRounds} rounds</div>
                </div>
                {burstAlert && <div style={{ padding:'4px 8px',background:'rgba(255,69,0,0.2)',border:'1px solid rgba(255,69,0,0.4)',fontSize:9 }}>⚠️ ALTA TAXA DE BURST</div>}
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12 }}>
                <div>
                  <div style={{ fontSize:9,color:'rgba(255,255,255,0.4)',marginBottom:2 }}>TIPO DOMINANTE</div>
                  <div style={{ fontSize:18,color:'#ffd700',fontFamily:'Orbitron,monospace' }}>{arena.dominantType}</div>
                  <div style={{ fontSize:10,color:'rgba(255,255,255,0.5)' }}>{(arena.dominantWinRate*100).toFixed(1)}%</div>
                </div>
                <div>
                  <div style={{ fontSize:9,color:'rgba(255,255,255,0.4)',marginBottom:2 }}>BURST RATE</div>
                  <div style={{ fontSize:18,color:burstAlert?'#ff4500':'#00ff88',fontFamily:'Orbitron,monospace' }}>{(arena.burstRate*100).toFixed(1)}%</div>
                </div>
                <div>
                  <div style={{ fontSize:9,color:'rgba(255,255,255,0.4)',marginBottom:2 }}>SPIN FINISH</div>
                  <div style={{ fontSize:18,color:'#4a9eff',fontFamily:'Orbitron,monospace' }}>{(arena.spinRate*100).toFixed(1)}%</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// BALANCE VIEW
// ══════════════════════════════════════════════════════════════
function BalanceView({ analytics }) {
  const warnings = analytics.balanceWarnings || [];
  const sevColors = { HIGH:'#ff4500', MEDIUM:'#ffa500', LOW:'#ffd700' };
  const sevIcons  = { HIGH:'🔴', MEDIUM:'🟡', LOW:'🟢' };

  return (
    <div>
      <SectionHeader title="⚖️ AVISOS DE BALANCEAMENTO"/>
      {warnings.length === 0 ? (
        <EmptyState icon={<span style={{fontSize:48}}>✓</span>} msg="Nenhum problema detectado" sub="O jogo está equilibrado!"/>
      ) : (
        <div style={{ display:'grid', gap:12 }}>
          {warnings.map((w, idx) => (
            <div key={idx} style={{ background:'rgba(255,255,255,0.03)',border:`2px solid ${sevColors[w.severity]}40`,padding:16 }}>
              <div style={{ display:'flex',gap:12,alignItems:'start' }}>
                <div style={{ fontSize:24 }}>{sevIcons[w.severity]}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex',gap:8,alignItems:'center',marginBottom:8 }}>
                    <span style={{ padding:'2px 8px',background:`${sevColors[w.severity]}20`,border:`1px solid ${sevColors[w.severity]}60`,fontSize:9,fontFamily:'Orbitron,monospace',color:sevColors[w.severity] }}>{w.severity}</span>
                    <span style={{ fontSize:9,color:'rgba(255,255,255,0.4)',textTransform:'uppercase' }}>{w.category?.replace(/_/g,' ')}</span>
                  </div>
                  <div style={{ fontSize:13,marginBottom:4 }}>{w.message}</div>
                  {w.matchup && <div style={{ fontSize:10,color:'rgba(255,255,255,0.4)' }}>Matchup: {w.matchup}</div>}
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:20,color:sevColors[w.severity],fontFamily:'Orbitron,monospace',fontWeight:700 }}>{(w.winRate*100).toFixed(1)}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// EXPORT VIEW
// ══════════════════════════════════════════════════════════════
function ExportView({ onExport }) {
  const cards = [
    { title:'Matches Analytics', desc:'Dados de jogos por mentalidade',   icon:<FileText size={32}/>,  key:'matches', file:'beyblade_matches_analytics.csv' },
    { title:'Rounds Analytics',  desc:'Dados de rounds por tipo de peão', icon:<BarChart3 size={32}/>, key:'rounds',  file:'beyblade_rounds_analytics.csv' },
    { title:'Arenas Analytics',  desc:'Performance detalhada por arena',  icon:<TrendingUp size={32}/>,key:'arenas',  file:'beyblade_arenas_analytics.csv' },
    { title:'Full JSON Export',  desc:'Todos os dados em JSON completo',  icon:<Download size={32}/>,  key:'json',    file:'beyblade_analytics_full.json' },
  ];
  return (
    <div>
      <SectionHeader title="📥 EXPORTAR DADOS"/>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:16 }}>
        {cards.map(c => (
          <div key={c.key} style={{ background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',padding:20,cursor:'pointer',transition:'all .2s' }}
            onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(255,215,0,0.3)'}
            onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'}
            onClick={()=>onExport(c.key)}>
            <div style={{ marginBottom:12,color:'#ffd700' }}>{c.icon}</div>
            <div style={{ fontSize:14,fontWeight:600,marginBottom:6 }}>{c.title}</div>
            <div style={{ fontSize:10,color:'rgba(255,255,255,0.4)',marginBottom:12 }}>{c.desc}</div>
            <div style={{ display:'inline-flex',alignItems:'center',gap:6,padding:'6px 12px',background:'rgba(255,215,0,0.1)',border:'1px solid rgba(255,215,0,0.3)',fontSize:10,color:'#ffd700' }}>
              <Download size={12}/> {c.file}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════
function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontFamily:'Orbitron,monospace',fontSize:14,fontWeight:700,color:'#ffd700',letterSpacing:'.1em',marginBottom:4 }}>{title}</div>
      {subtitle && <div style={{ fontSize:11,color:'rgba(255,255,255,0.4)' }}>{subtitle}</div>}
    </div>
  );
}

function EmptyState({ icon, msg, sub }) {
  return (
    <div style={{ textAlign:'center',padding:60,color:'rgba(255,255,255,0.3)' }}>
      <div style={{ opacity:.3,marginBottom:16,display:'flex',justifyContent:'center' }}>{icon}</div>
      <div style={{ fontFamily:'Orbitron,monospace',fontSize:13,letterSpacing:'.2em' }}>{msg}</div>
      {sub && <div style={{ fontSize:11,marginTop:8 }}>{sub}</div>}
    </div>
  );
}
