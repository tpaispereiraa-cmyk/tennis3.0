// ============================================================
// WAR ROOM OVERLAY — BROADCAST LIVE EDITION (v3)
// Layout: Top bar → Progress bar → [Ranking | PlateGrid | Stats+Feed]
// ============================================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TEAMS } from './data.js';
import { CALENDAR_STRUCTURE } from './CalendarConfig.js';

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const WR_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Black+Ops+One&family=Rajdhani:wght@400;600;700&family=Orbitron:wght@400;700;900&display=swap');

  @keyframes wr-scan        { 0%{top:-4px} 100%{top:100vh} }
  @keyframes wr-pulse-dot   { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.5);opacity:.6} }
  @keyframes wr-live-blink  { 0%,44%{opacity:1} 50%,94%{opacity:0} 100%{opacity:1} }
  @keyframes wr-vs-pulse    { 0%,100%{opacity:.8;transform:scale(1)} 50%{opacity:1;transform:scale(1.1)} }
  @keyframes wr-feed-in     { from{opacity:0;transform:translateX(14px)} to{opacity:1;transform:translateX(0)} }
  @keyframes wr-upset-flash { 0%{opacity:.55} 100%{opacity:0} }
  @keyframes wr-perf-flash  { 0%{opacity:.4}  100%{opacity:0} }
  @keyframes wr-ticker      { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
  @keyframes wr-shine       { 0%{left:-100%} 100%{left:200%} }
  @keyframes wr-glow-border { 0%,100%{box-shadow:0 0 8px rgba(255,215,0,.12)} 50%{box-shadow:0 0 22px rgba(255,215,0,.38)} }
  @keyframes wr-rank-in     { from{opacity:0;transform:translateX(-14px)} to{opacity:1;transform:translateX(0)} }
  @keyframes wr-plate-in    { from{opacity:0;transform:scale(.85)} to{opacity:1;transform:scale(1)} }
  @keyframes wr-champ-reveal{ from{opacity:0;transform:scale(.5) rotate(-15deg)} to{opacity:1;transform:scale(1) rotate(0)} }
  @keyframes wr-active-glow {
    0%,100%{box-shadow:0 0 10px rgba(255,215,0,.2),inset 0 0 20px rgba(255,215,0,.05)}
    50%    {box-shadow:0 0 30px rgba(255,215,0,.5),inset 0 0 40px rgba(255,215,0,.12)}
  }
  @keyframes wr-float {
    0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)}
  }

  .wr-scroll::-webkit-scrollbar       {width:3px}
  .wr-scroll::-webkit-scrollbar-track {background:transparent}
  .wr-scroll::-webkit-scrollbar-thumb {background:rgba(255,215,0,.2);border-radius:2px}

  .wr-btn {
    font-family:'Orbitron',monospace; font-size:9px; font-weight:700;
    letter-spacing:.15em; border:1px solid; cursor:pointer;
    clip-path:polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%);
    transition:all .15s ease; padding:9px 18px;
    display:inline-flex; align-items:center; gap:6px; white-space:nowrap;
  }
  .wr-btn-cyan{border-color:rgba(0,212,255,.45);background:rgba(0,212,255,.08);color:#00d4ff}
  .wr-btn-cyan:hover{border-color:rgba(0,212,255,.85);background:rgba(0,212,255,.18);box-shadow:0 0 18px rgba(0,212,255,.25)}
  .wr-btn-red {border-color:rgba(239,68,68,.45);background:rgba(239,68,68,.08);color:#f87171}
  .wr-btn-red:hover{border-color:rgba(239,68,68,.85);background:rgba(239,68,68,.18)}

  .wr-label {
    font-family:'Orbitron',monospace; font-size:8px; font-weight:700;
    letter-spacing:.3em; color:rgba(255,215,0,.4); text-transform:uppercase;
  }

  /* Rank plates */
  .wr-rank-plate {
    display:flex; align-items:center; gap:10px; padding:9px 10px;
    clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%);
    border:1px solid rgba(255,255,255,.06); background:rgba(255,255,255,.02);
    animation:wr-rank-in .35s ease both; transition:background .15s ease;
  }
  .wr-rank-plate:hover{background:rgba(255,255,255,.05)}
  .wr-rank-plate.gold  {border-color:rgba(255,215,0,.4); background:rgba(255,215,0,.06)}
  .wr-rank-plate.silver{border-color:rgba(192,192,192,.3);background:rgba(192,192,192,.04)}
  .wr-rank-plate.bronze{border-color:rgba(205,127,50,.3); background:rgba(205,127,50,.04)}

  /* Tournament plates */
  .wr-plate {
    position:relative; overflow:hidden;
    border:1px solid rgba(255,255,255,.07);
    background:rgba(255,255,255,.02);
    display:flex; flex-direction:column; align-items:center; justify-content:flex-start;
    gap:0; cursor:default;
    animation:wr-plate-in .3s ease both;
    transition:border-color .2s ease, background .2s ease;
    min-height:130px;
  }
  .wr-plate.completed {
    background:rgba(255,255,255,.04);
    border-color:rgba(255,255,255,.12);
  }
  .wr-plate.active {
    background:rgba(255,215,0,.07);
    border-color:rgba(255,215,0,.5);
    animation:wr-plate-in .3s ease both, wr-active-glow 2.5s ease-in-out infinite;
  }
  .wr-plate:hover { border-color:rgba(255,215,0,.25); background:rgba(255,255,255,.05) }

  .wr-stat-card {
    clip-path:polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%);
    border:1px solid rgba(255,255,255,.06); background:rgba(255,255,255,.025);
    padding:6px 9px; display:flex; align-items:center; gap:7px;
    transition:border-color .2s ease;
  }
  .wr-stat-card:hover{border-color:rgba(255,215,0,.2)}
  .wr-feed-row{animation:wr-feed-in .28s ease both}
`;

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const cleanName = (n) => (n || '').replace(/"[^"]*"\s*/g,'').trim().toUpperCase();
const getNick    = (n) => { const m = (n||'').match(/"([^"]+)"/); return m ? m[1] : null; };
const getBase    = (n) => (n||'').replace(/"[^"]*"\s*/g,'').replace(/\s+/g,' ').trim();

const TIER_CFG = {
  PREMIER_CHAMPIONSHIP: { color:'#ffd700', label:'PREMIER',    short:'P',  icon:'👑' },
  MASTERS:              { color:'#c084fc', label:'MASTERS',    short:'M',  icon:'💎' },
  CHALLENGER:           { color:'#60a5fa', label:'CHAL',       short:'C',  icon:'⚡' },
  REDEMPTION:           { color:'#34d399', label:'REDEMP',     short:'R',  icon:'🔄' },
  RISING_STAR:          { color:'#fb923c', label:'RISING',     short:'RS', icon:'🌟' },
  RISING_FINALS:        { color:'#f472b6', label:'FINALS',     short:'F',  icon:'🏅' },
  KINGS_COURT:          { color:'#ef4444', label:'KINGS',      short:'KC', icon:'🔥' },
  SPECIAL:              { color:'#a78bfa', label:'SPECIAL',    short:'S',  icon:'✨' },
  REGIONAL_CIRCUIT:     { color:'#94a3b8', label:'REGIONAL',   short:'Rg', icon:'🌐' },
  ELITE_MASTERS:        { color:'#c084fc', label:'ELITE',      short:'E',  icon:'💎' },
  PREMIER:              { color:'#ffd700', label:'PREMIER',    short:'P',  icon:'👑' },
  SIGNATURE_CLASH:      { color:'#fde68a', label:'SIGNATURE CLASH', short:'SIG', icon:'✍️' },
  INVITATIONAL:         { color:'#fde68a', label:'INVITATIONAL', short:'INV', icon:'🌅' }, // legado
  OPEN:                 { color:'#86efac', label:'OPEN',       short:'OPN', icon:'🌐' },
};
const getTier = (t) => TIER_CFG[t] || { color:'#94a3b8', label: t||'?', short:'?', icon:'🎯' };

const MEDAL_EMOJIS = ['🥇','🥈','🥉'];
const MEDAL_COLORS = ['#ffd700','#c0c0c0','#cd7f32'];
const MEDAL_GLOWS  = ['rgba(255,215,0,.6)','rgba(192,192,192,.5)','rgba(205,127,50,.5)'];
const MEDAL_CLS    = ['gold','silver','bronze'];

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
const WarRoomOverlay = ({
  phase, totalMatches, completedMatches,
  currentMatch, recentResults = [], stats = {},
  universeManager, onSkip, onClose
}) => {
  const [upsetFlash,   setUpsetFlash]   = useState(false);
  const [perfectFlash, setPerfectFlash] = useState(false);
  const feedRef = useRef(null);
  const progress = totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0;

  useEffect(() => {
    const last = recentResults[recentResults.length - 1];
    if (!last) return;
    if (last.isUpset)   { setUpsetFlash(true);   setTimeout(() => setUpsetFlash(false),   800); }
    if (last.isPerfect) { setPerfectFlash(true);  setTimeout(() => setPerfectFlash(false), 800); }
  }, [recentResults]);

  // Scroll feed to bottom
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [recentResults.length]);

  const tickerParts = recentResults.length > 0
    ? recentResults.slice(-40).map(r =>
        `  ★  ${r.winner.toUpperCase()}  vence  ${r.loser.toUpperCase()}  ·  ${r.score}${r.isUpset ? '  🔥 UPSET' : ''}${r.isPerfect ? '  👑 PERFECT' : ''}`
      )
    : ['  ★  SIMULAÇÃO EM ANDAMENTO  ·  AGUARDANDO RESULTADOS'];
  const tickerStr      = tickerParts.join('        ');
  const tickerDuration = `${Math.max(12, tickerStr.length * 0.065)}s`;

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', flexDirection:'column', fontFamily:'Rajdhani,sans-serif', color:'white', overflow:'hidden' }}>
      <style>{WR_STYLES}</style>

      {/* ── BG ── */}
      <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 130% 100% at 50% 115%, #1a0030 0%, #0a000f 42%, #000008 100%)' }} />
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', backgroundImage:'linear-gradient(rgba(0,212,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,.02) 1px,transparent 1px)', backgroundSize:'60px 60px', maskImage:'radial-gradient(ellipse 90% 70% at 50% 40%, black, transparent)', WebkitMaskImage:'radial-gradient(ellipse 90% 70% at 50% 40%, black, transparent)' }} />
      <div style={{ position:'absolute', top:'3%', left:'4%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(180,0,255,.07),transparent 70%)', filter:'blur(80px)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'5%', right:'4%', width:420, height:420, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,212,255,.07),transparent 70%)', filter:'blur(80px)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none', overflow:'hidden' }}>
        <div style={{ fontFamily:'Black Ops One,cursive', fontSize:'min(13vw,130px)', color:'rgba(255,255,255,.012)', letterSpacing:'.12em', whiteSpace:'nowrap', transform:'rotate(-8deg)', userSelect:'none' }}>BEYBLADE UNIVERSE</div>
      </div>

      {/* Scanline */}
      <div style={{ position:'absolute', left:0, right:0, height:3, background:'linear-gradient(90deg,transparent,rgba(0,212,255,.35) 40%,rgba(255,215,0,.15) 60%,transparent)', animation:'wr-scan 6s linear infinite', pointerEvents:'none', zIndex:10, filter:'blur(1px)' }} />

      {/* Flash overlays */}
      {upsetFlash   && <div style={{ position:'absolute', inset:0, zIndex:20, pointerEvents:'none', background:'radial-gradient(ellipse at center,rgba(239,68,68,.3),transparent 65%)', animation:'wr-upset-flash .8s ease-out forwards' }} />}
      {perfectFlash && <div style={{ position:'absolute', inset:0, zIndex:20, pointerEvents:'none', background:'radial-gradient(ellipse at center,rgba(255,215,0,.22),transparent 65%)', animation:'wr-perf-flash .8s ease-out forwards' }} />}

      {/* ── TOP BAR ── */}
      <div style={{ position:'relative', zIndex:5, flexShrink:0, background:'rgba(0,0,0,.82)', backdropFilter:'blur(18px)', borderBottom:'1px solid rgba(255,215,0,.12)', height:56, display:'flex', alignItems:'center', padding:'0 20px', gap:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, flexShrink:0 }}>
          <div style={{ width:10, height:10, borderRadius:'50%', background:'#ff2244', boxShadow:'0 0 8px #ff2244,0 0 18px rgba(255,34,68,.5)', animation:'wr-pulse-dot 1s ease-in-out infinite' }} />
          <span style={{ fontFamily:'Orbitron,monospace', fontSize:11, fontWeight:900, letterSpacing:'.3em', color:'#ff2244', animation:'wr-live-blink 1.6s step-end infinite' }}>LIVE</span>
        </div>
        <div style={{ width:1, height:28, background:'rgba(255,255,255,.1)' }} />
        <div>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:8, letterSpacing:'.35em', color:'rgba(255,215,0,.5)', lineHeight:1.2 }}>⚡ BROADCAST — SIMULAÇÃO AO VIVO</div>
          <div style={{ fontFamily:'Rajdhani,sans-serif', fontWeight:700, fontSize:14, color:'rgba(255,255,255,.9)', lineHeight:1.15 }}>{phase || 'INICIALIZANDO...'}</div>
        </div>
        <div style={{ flex:1 }} />
        <div style={{ textAlign:'center' }}>
          <div style={{ fontFamily:'Black Ops One,cursive', fontSize:22, lineHeight:1, color:'#ffd700', filter:'drop-shadow(0 0 8px rgba(255,215,0,.5))' }}>
            {completedMatches}<span style={{ fontFamily:'Orbitron,monospace', fontSize:11, opacity:.4, marginLeft:2 }}>/{totalMatches}</span>
          </div>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:7, letterSpacing:'.22em', color:'rgba(255,255,255,.28)', marginTop:1 }}>PARTIDAS</div>
        </div>
        <div style={{ width:1, height:28, background:'rgba(255,255,255,.1)' }} />
        <div style={{ display:'flex', gap:8 }}>
          <button className="wr-btn wr-btn-cyan" onClick={onSkip}><span style={{ fontSize:13 }}>⏭</span> PULAR</button>
          <button className="wr-btn wr-btn-red"  onClick={onClose}>✕ CANCELAR</button>
        </div>
      </div>

      {/* ── PROGRESS BAR ── */}
      <div style={{ flexShrink:0, height:5, background:'rgba(255,255,255,.04)', position:'relative', zIndex:5 }}>
        <div style={{ height:'100%', width:`${progress}%`, background:'linear-gradient(90deg,#7b2fff 0%,#00d4ff 35%,#ffd700 70%,#ff8c00 100%)', transition:'width .3s ease', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:0, left:'-100%', width:'100%', height:'100%', background:'linear-gradient(90deg,transparent,rgba(255,255,255,.45),transparent)', animation:'wr-shine 2s ease-in-out infinite' }} />
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{ flex:1, display:'flex', minHeight:0, position:'relative', zIndex:5 }}>
        <RankingPanel universeManager={universeManager} />
        <TournamentPlates universeManager={universeManager} currentMatch={currentMatch} totalMatches={totalMatches} completedMatches={completedMatches} />
        <StatsPanel stats={stats} progress={progress} completedMatches={completedMatches} totalMatches={totalMatches} recentResults={recentResults} feedRef={feedRef} />
      </div>

      {/* ── TICKER ── */}
      <div style={{ flexShrink:0, height:36, background:'rgba(0,0,0,.72)', backdropFilter:'blur(10px)', borderTop:'1px solid rgba(255,215,0,.15)', display:'flex', alignItems:'center', overflow:'hidden', position:'relative', zIndex:5 }}>
        <div style={{ flexShrink:0, height:'100%', padding:'0 14px', borderRight:'1px solid rgba(255,215,0,.2)', display:'flex', alignItems:'center', gap:6, background:'rgba(255,215,0,.07)' }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'#ff2244', boxShadow:'0 0 6px #ff2244', animation:'wr-pulse-dot 1.1s ease-in-out infinite' }} />
          <span style={{ fontFamily:'Orbitron,monospace', fontSize:9, fontWeight:900, letterSpacing:'.22em', color:'#ffd700', whiteSpace:'nowrap' }}>ON AIR</span>
        </div>
        <div style={{ flex:1, overflow:'hidden' }}>
          <div style={{ display:'inline-flex', whiteSpace:'nowrap', animation:`wr-ticker ${tickerDuration} linear infinite` }}>
            <span style={{ fontFamily:'Rajdhani,sans-serif', fontWeight:600, fontSize:13, color:'rgba(255,255,255,.72)', letterSpacing:'.04em' }}>
              {tickerStr}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{tickerStr}
            </span>
          </div>
        </div>
      </div>

      {/* Gold line bottom */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:2, background:'linear-gradient(90deg,transparent,rgba(255,180,0,.7) 30%,#ffd700 50%,rgba(255,180,0,.7) 70%,transparent)', boxShadow:'0 0 24px rgba(255,215,0,.4)', pointerEvents:'none', zIndex:6 }} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// LEFT: RANKING TOP 8
// ─────────────────────────────────────────────────────────────
const RankingPanel = ({ universeManager }) => {
  const top8 = useMemo(() => {
    if (!universeManager) return [];
    return universeManager.getBBPRanking().slice(0, 8).map(r => {
      // Try both TEAMS array and universeManager.players
      const player = universeManager.players?.[r.playerId] || TEAMS?.[r.playerId];
      return player ? { rank: r.rank, name: player.name, points: r.points, id: r.playerId, iconUrl: player.iconUrl, colors: player.colors } : null;
    }).filter(Boolean);
  }, [universeManager]);

  return (
    <div style={{ width:248, flexShrink:0, borderRight:'1px solid rgba(255,255,255,.06)', display:'flex', flexDirection:'column', background:'rgba(0,0,0,.3)' }}>
      <div style={{ padding:'9px 12px 8px', borderBottom:'1px solid rgba(255,255,255,.06)', display:'flex', alignItems:'center', gap:8, background:'rgba(0,0,0,.25)', flexShrink:0 }}>
        <span style={{ fontSize:13 }}>🏆</span>
        <span className="wr-label">BBP RANKING — TOP 8</span>
      </div>
      <div className="wr-scroll" style={{ flex:1, overflowY:'auto', padding:'8px', display:'flex', flexDirection:'column', gap:5 }}>
        {top8.length === 0
          ? <div style={{ padding:'28px 12px', textAlign:'center', fontFamily:'Orbitron,monospace', fontSize:9, color:'rgba(255,255,255,.2)', animation:'wr-float 2.5s ease-in-out infinite' }}>
              <div style={{ fontSize:22, marginBottom:8, opacity:.4 }}>📊</div>Ranking em formação
            </div>
          : top8.map((p, idx) => <RankPlate key={p.id} player={p} idx={idx} delay={idx * 0.055} />)
        }
      </div>
    </div>
  );
};

const RankPlate = ({ player, idx, delay }) => {
  const isMedal   = idx < 3;
  const cls       = isMedal ? MEDAL_CLS[idx] : '';
  const mainColor = isMedal ? MEDAL_COLORS[idx] : 'rgba(255,255,255,.4)';
  const glow      = isMedal ? MEDAL_GLOWS[idx] : 'none';
  const nick      = getNick(player.name);
  const base      = getBase(player.name);
  const [imgErr, setImgErr] = useState(false);

  const initials = (() => {
    const parts = base.split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : base.substring(0,2).toUpperCase();
  })();

  const accentColor = player.colors?.[0] || mainColor;

  return (
    <div className={`wr-rank-plate ${cls}`} style={{ animationDelay:`${delay}s` }}>
      {/* Medal / rank */}
      <div style={{ width:24, textAlign:'center', flexShrink:0 }}>
        {isMedal
          ? <span style={{ fontSize:18, lineHeight:1 }}>{MEDAL_EMOJIS[idx]}</span>
          : <span style={{ fontFamily:'Black Ops One,cursive', fontSize:14, color:mainColor, lineHeight:1 }}>#{player.rank}</span>
        }
      </div>

      {/* Player icon */}
      <div style={{
        width:38, height:38, flexShrink:0, borderRadius:5, overflow:'hidden',
        border:`2px solid ${isMedal ? glow.replace('rgba','rgba').replace('.6)','.4)') : 'rgba(255,255,255,.1)'}`,
        boxShadow: isMedal ? `0 0 10px ${glow}` : 'none',
        background:'rgba(0,0,0,.5)',
        display:'flex', alignItems:'center', justifyContent:'center', position:'relative'
      }}>
        {player.iconUrl && !imgErr ? (
          <img
            src={player.iconUrl}
            alt={player.name}
            onError={() => setImgErr(true)}
            style={{ width:'100%', height:'100%', objectFit:'cover' }}
          />
        ) : (
          <div style={{
            width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center',
            background: isMedal
              ? `radial-gradient(circle at 30% 30%, ${mainColor}55, rgba(0,0,0,.8))`
              : `radial-gradient(circle at 30% 30%, ${accentColor}44, rgba(0,0,0,.7))`
          }}>
            <span style={{ fontFamily:'Black Ops One,cursive', fontSize:13, color: isMedal ? mainColor : 'rgba(255,255,255,.6)', filter: isMedal ? `drop-shadow(0 0 4px ${glow})` : 'none' }}>
              {initials}
            </span>
          </div>
        )}
      </div>

      {/* Name + pts */}
      <div style={{ flex:1, minWidth:0 }}>
        {nick && (
          <div style={{
            fontFamily:'Black Ops One,cursive', fontSize:12, lineHeight:1.2,
            background: isMedal ? `linear-gradient(90deg,${mainColor},white 70%)` : 'rgba(255,255,255,.88)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'
          }}>
            "{nick}"
          </div>
        )}
        <div style={{
          fontFamily:'Rajdhani,sans-serif', fontWeight:700,
          fontSize: nick ? 10 : 13,
          color: nick ? 'rgba(255,255,255,.45)' : 'rgba(255,255,255,.88)',
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', lineHeight:1.25
        }}>
          {base}
        </div>
        <div style={{ fontFamily:'Orbitron,monospace', fontSize:9, color: isMedal ? mainColor : 'rgba(255,255,255,.35)', marginTop:1, lineHeight:1 }}>
          {player.points.toLocaleString()} pts
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// CENTER: TOURNAMENT PLATES GRID
// ─────────────────────────────────────────────────────────────
const TournamentPlates = ({ universeManager, currentMatch, totalMatches, completedMatches }) => {
  const activeRef = useRef(null);

  const { tournaments, activeKey } = useMemo(() => {
    if (!universeManager) return { tournaments: [], activeKey: null };
    const year    = universeManager.currentYear;
    const nextKey = universeManager.nextTournamentKey;
    const history = universeManager.tournamentHistory;
    const months  = CALENDAR_STRUCTURE?.months || [];
    const list    = [];

    months.forEach(month => {
      (month.tournaments || []).forEach((t, tIdx) => {
        const key       = `${year}-${month.id}-${tIdx}`;
        const hist      = history.get(key);
        const done      = !!(hist?.completed);
        const active    = key === nextKey;

        // Find champion player for icon
        let champPlayer = null;
        if (done && hist?.champion) {
          champPlayer = universeManager.players?.[hist.champion] || TEAMS?.[hist.champion];
        }

        list.push({
          key, name: t.name, tier: t.tier || t.type,
          monthName: month.shortName || `M${month.id}`,
          monthId: month.id,
          isCompleted: done, isActive: active,
          championName: done ? (hist?.championName || null) : null,
          champPlayer,
        });
      });
    });
    return { tournaments: list, activeKey: nextKey };
  }, [universeManager]);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior:'smooth', block:'center' });
    }
  }, [activeKey]);

  const p1Name = currentMatch?.player1 ? cleanName(currentMatch.player1) : null;
  const p2Name = currentMatch?.player2 ? cleanName(currentMatch.player2) : null;

  const done  = tournaments.filter(t => t.isCompleted).length;
  const total = tournaments.length;

  return (
    <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', background:'rgba(0,0,0,.1)' }}>

      {/* Header */}
      <div style={{ padding:'9px 14px 8px', borderBottom:'1px solid rgba(255,255,255,.06)', display:'flex', alignItems:'center', gap:8, background:'rgba(0,0,0,.25)', flexShrink:0 }}>
        <span style={{ fontSize:13 }}>📅</span>
        <span className="wr-label">CALENDÁRIO {universeManager?.currentYear || ''} — TEMPORADA COMPLETA</span>
        <div style={{ marginLeft:'auto', fontFamily:'Orbitron,monospace', fontSize:8, color:'rgba(255,255,255,.3)' }}>{done}/{total} concluídos</div>
      </div>

      {/* VS Strip */}
      {p1Name && (
        <div style={{ flexShrink:0, padding:'6px 14px', background:'rgba(255,215,0,.04)', borderBottom:'1px solid rgba(255,215,0,.1)', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:7, letterSpacing:'.2em', color:'rgba(255,215,0,.6)', flexShrink:0, animation:'wr-live-blink 1.6s step-end infinite' }}>● AO VIVO</div>
          <div style={{ flex:1, fontFamily:'Black Ops One,cursive', fontSize:13, textAlign:'right', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', background:'linear-gradient(135deg,#fff,#ffd700)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>{p1Name}</div>
          <div style={{ fontFamily:'Black Ops One,cursive', fontSize:17, color:'#ffd700', animation:'wr-vs-pulse .9s ease-in-out infinite', flexShrink:0, lineHeight:1, filter:'drop-shadow(0 0 8px rgba(255,215,0,.8))' }}>VS</div>
          <div style={{ flex:1, fontFamily:'Black Ops One,cursive', fontSize:13, textAlign:'left', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', background:'linear-gradient(135deg,#00d4ff,#fff)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>{p2Name}</div>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:9, color:'rgba(255,255,255,.3)', flexShrink:0 }}>{completedMatches}/{totalMatches}</div>
        </div>
      )}

      {/* Plate grid — fills all remaining space */}
      <div
        className="wr-scroll"
        style={{ flex:1, overflowY:'auto', padding:'10px' }}
      >
        {tournaments.length === 0 ? (
          <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Orbitron,monospace', fontSize:9, color:'rgba(255,255,255,.2)' }}>
            Calendário não disponível
          </div>
        ) : (
          <div style={{
            display:'grid',
            gridTemplateColumns:`repeat(auto-fill, minmax(130px, 1fr))`,
            gap:8,
          }}>
            {tournaments.map((t, idx) => (
              <TournamentPlate
                key={t.key}
                tournament={t}
                idx={idx}
                ref={t.isActive ? activeRef : null}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const TournamentPlate = React.forwardRef(({ tournament: t, idx }, ref) => {
  const cfg    = getTier(t.tier);
  const [imgErr, setImgErr] = useState(false);

  const status = t.isCompleted ? 'completed' : t.isActive ? 'active' : '';

  // Champion initials fallback
  const champBase = t.championName ? getBase(t.championName) : '';
  const champParts = champBase.split(/\s+/);
  const champInitials = champParts.length >= 2
    ? (champParts[0][0] + champParts[champParts.length-1][0]).toUpperCase()
    : champBase.substring(0,2).toUpperCase();

  const delayS = (idx * 0.015) % 1;

  return (
    <div
      ref={ref}
      className={`wr-plate ${status}`}
      style={{ animationDelay:`${delayS}s` }}
      title={`${t.name}${t.championName ? ` — 🏆 ${t.championName}` : ''}`}
    >
      {/* Tier color accent top bar */}
      <div style={{
        position:'absolute', top:0, left:0, right:0, height:2,
        background: t.isActive || t.isCompleted ? cfg.color : 'rgba(255,255,255,.08)'
      }} />

      {/* Month badge */}
      <div style={{
        position:'absolute', top:5, left:5,
        fontFamily:'Orbitron,monospace', fontSize:6, fontWeight:700, letterSpacing:'.08em',
        color: t.isActive ? '#ffd700' : 'rgba(255,255,255,.25)',
        lineHeight:1
      }}>
        {t.monthName}
      </div>

      {/* Active badge */}
      {t.isActive && (
        <div style={{
          position:'absolute', top:4, right:4,
          fontFamily:'Orbitron,monospace', fontSize:5, fontWeight:700, letterSpacing:'.05em',
          color:'#00ff88', background:'rgba(0,255,136,.12)', border:'1px solid rgba(0,255,136,.4)',
          padding:'1px 4px', borderRadius:2,
          animation:'wr-live-blink 1.6s step-end infinite'
        }}>LIVE</div>
      )}

      {/* Content */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, padding:'20px 6px 10px', width:'100%' }}>

        {/* Champion icon OR tier icon */}
        {t.isCompleted && t.champPlayer && t.champPlayer.iconUrl && !imgErr ? (
          <div style={{ width:44, height:44, borderRadius:4, overflow:'hidden', border:`2px solid ${cfg.color}66`, boxShadow:`0 0 8px ${cfg.color}44`, animation:'wr-champ-reveal .4s cubic-bezier(.22,1,.36,1) both' }}>
            <img
              src={t.champPlayer.iconUrl}
              alt={t.championName}
              onError={() => setImgErr(true)}
              style={{ width:'100%', height:'100%', objectFit:'cover' }}
            />
          </div>
        ) : t.isCompleted && t.championName ? (
          // Text initials fallback for champion
          <div style={{
            width:44, height:44, borderRadius:4,
            background:`radial-gradient(circle at 30% 30%, ${cfg.color}55, rgba(0,0,0,.7))`,
            border:`2px solid ${cfg.color}66`, boxShadow:`0 0 8px ${cfg.color}44`,
            display:'flex', alignItems:'center', justifyContent:'center',
            animation:'wr-champ-reveal .4s cubic-bezier(.22,1,.36,1) both'
          }}>
            <span style={{ fontFamily:'Black Ops One,cursive', fontSize:13, color:cfg.color }}>{champInitials}</span>
          </div>
        ) : t.isActive ? (
          // Active: spinning tier icon
          <div style={{
            width:38, height:38, borderRadius:4,
            background:`rgba(255,215,0,.08)`,
            border:`1px solid rgba(255,215,0,.3)`,
            display:'flex', alignItems:'center', justifyContent:'center',
            animation:'wr-float 1.5s ease-in-out infinite'
          }}>
            <span style={{ fontSize:22 }}>{cfg.icon}</span>
          </div>
        ) : (
          // Future: dark placeholder
          <div style={{
            width:38, height:38, borderRadius:4,
            background:'rgba(255,255,255,.03)',
            border:'1px solid rgba(255,255,255,.06)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <span style={{ fontSize:18, opacity:.3 }}>{cfg.icon}</span>
          </div>
        )}

        {/* Tier badge */}
        <div style={{
          fontFamily:'Orbitron,monospace', fontSize:7, fontWeight:700, letterSpacing:'.06em',
          color: t.isActive ? '#ffd700' : t.isCompleted ? cfg.color : 'rgba(255,255,255,.25)',
          textAlign:'center', lineHeight:1.2,
          background: t.isActive ? 'rgba(255,215,0,.08)' : t.isCompleted ? `${cfg.color}11` : 'transparent',
          padding:'2px 5px', borderRadius:2,
        }}>
          {cfg.short}
        </div>

        {/* Tournament name */}
        <div style={{
          fontFamily:'Rajdhani,sans-serif', fontWeight:700,
          fontSize:10,
          color: t.isCompleted
            ? `${cfg.color}cc`
            : t.isActive
            ? 'rgba(255,215,0,.85)'
            : 'rgba(255,255,255,.28)',
          textAlign:'center', lineHeight:1.25,
          width:'100%', padding:'0 4px',
          overflow:'hidden',
          display:'-webkit-box',
          WebkitLineClamp:2,
          WebkitBoxOrient:'vertical',
        }}>
          {t.name}
        </div>

        {/* Champion name or in-progress indicator */}
        <div style={{
          fontFamily:'Rajdhani,sans-serif', fontWeight:700,
          fontSize:10,
          color: t.isCompleted
            ? 'rgba(255,255,255,.85)'
            : t.isActive
            ? 'rgba(255,215,0,.9)'
            : 'rgba(255,255,255,.15)',
          textAlign:'center', lineHeight:1.2,
          maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
          padding:'0 4px'
        }}>
          {t.isCompleted && t.championName
            ? getNick(t.championName) || getBase(t.championName).split(' ').pop()
            : t.isActive
            ? '...'
            : ''
          }
        </div>
      </div>

      {/* Trophy icon for completed */}
      {t.isCompleted && (
        <div style={{ position:'absolute', bottom:3, right:4, fontSize:8, opacity:.5 }}>🏆</div>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────
// RIGHT: STATS + LIVE FEED
// ─────────────────────────────────────────────────────────────
const StatsPanel = ({ stats, progress, completedMatches, totalMatches, recentResults, feedRef }) => (
  <div style={{ width:232, flexShrink:0, borderLeft:'1px solid rgba(255,255,255,.06)', display:'flex', flexDirection:'column', background:'rgba(0,0,0,.3)' }}>
    <div style={{ padding:'9px 12px 8px', borderBottom:'1px solid rgba(255,255,255,.06)', background:'rgba(0,0,0,.25)', flexShrink:0 }}>
      <span className="wr-label">ESTATÍSTICAS</span>
    </div>

    <div style={{ padding:'8px 9px 0', display:'flex', flexDirection:'column', gap:4, flexShrink:0 }}>
      <StatCard icon="🔥" label="UPSETS"      value={stats.upsets      || 0} color="#ef4444" />
      <StatCard icon="👑" label="PERFECTS"    value={stats.perfects    || 0} color="#ffd700" />
      <StatCard icon="💥" label="BURST WINS"  value={stats.burstWins   || 0} color="#c084fc" />
      <StatCard icon="⚡" label="SPIN WINS"   value={stats.spinWins    || 0} color="#00d4ff" />
      <StatCard icon="🎯" label="RING OUT"     value={stats.ringOutWins || 0} color="#34d399" />
    </div>

    <div style={{ padding:'7px 9px', flexShrink:0 }}>
      <div style={{ textAlign:'center', padding:'7px 0', animation:'wr-glow-border 3s ease-in-out infinite', border:'1px solid rgba(255,215,0,.08)', clipPath:'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)', background:'rgba(255,215,0,.03)' }}>
        <div style={{ fontFamily:'Black Ops One,cursive', fontSize:32, lineHeight:1, color:'#ffd700', filter:'drop-shadow(0 0 12px rgba(255,215,0,.5))' }}>
          {Math.round(progress)}<span style={{ fontSize:14, opacity:.5 }}>%</span>
        </div>
        <div style={{ fontFamily:'Orbitron,monospace', fontSize:7, letterSpacing:'.22em', color:'rgba(255,255,255,.28)', marginTop:3 }}>CONCLUÍDO</div>
        <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:11, color:'rgba(255,255,255,.28)', marginTop:1 }}>{completedMatches} de {totalMatches} partidas</div>
      </div>
      {(stats.upsets || 0) > 0 && (
        <div style={{ marginTop:5, background:'rgba(239,68,68,.07)', border:'1px solid rgba(239,68,68,.25)', clipPath:'polygon(5px 0%,100% 0%,calc(100% - 5px) 100%,0% 100%)', padding:'5px 8px', textAlign:'center' }}>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:7, color:'rgba(239,68,68,.8)', letterSpacing:'.1em' }}>
            {stats.upsets === 1 ? '1 VIRADA ÉPICA!' : `${stats.upsets} VIRADAS ÉPICAS!`}
          </div>
        </div>
      )}
    </div>

    <div style={{ height:1, background:'rgba(255,255,255,.06)', margin:'0 9px', flexShrink:0 }} />

    <div style={{ padding:'6px 11px 4px', display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
      <div style={{ width:5, height:5, borderRadius:'50%', background:'#00ff88', boxShadow:'0 0 5px #00ff88', animation:'wr-pulse-dot 1.8s ease-in-out infinite' }} />
      <span className="wr-label">LIVE FEED</span>
      <span style={{ marginLeft:'auto', fontFamily:'Orbitron,monospace', fontSize:7, color:'rgba(255,255,255,.2)' }}>{recentResults.length}</span>
    </div>

    <div ref={feedRef} className="wr-scroll" style={{ flex:1, overflowY:'auto', padding:'0 0 6px' }}>
      {recentResults.length === 0
        ? <div style={{ padding:'10px 12px', textAlign:'center', fontFamily:'Rajdhani,sans-serif', fontSize:11, color:'rgba(255,255,255,.2)', animation:'wr-float 2.5s ease-in-out infinite' }}>📡 Aguardando...</div>
        : [...recentResults].reverse().map((r, idx) => <FeedRow key={r.uid || `${r.matchNumber}-${idx}`} result={r} />)
      }
    </div>
  </div>
);

const StatCard = ({ icon, label, value, color }) => (
  <div className="wr-stat-card">
    <span style={{ fontSize:13 }}>{icon}</span>
    <div style={{ flex:1 }}>
      <div style={{ fontFamily:'Orbitron,monospace', fontSize:6, letterSpacing:'.12em', color:'rgba(255,255,255,.22)', marginBottom:1 }}>{label}</div>
      <div style={{ fontFamily:'Black Ops One,cursive', fontSize:16, color, lineHeight:1, filter:`drop-shadow(0 0 4px ${color}55)` }}>{value}</div>
    </div>
  </div>
);

const FeedRow = ({ result }) => (
  <div className="wr-feed-row" style={{ padding:'5px 10px', borderBottom:'1px solid rgba(255,255,255,.03)', display:'flex', alignItems:'center', gap:5 }}>
    <div style={{ fontFamily:'Orbitron,monospace', fontSize:6, color:'rgba(255,255,255,.18)', flexShrink:0, minWidth:18 }}>#{result.matchNumber}</div>
    <div style={{ flex:1, minWidth:0 }}>
      <div style={{ fontFamily:'Rajdhani,sans-serif', fontWeight:700, fontSize:10, color:'#00ff88', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', lineHeight:1.3 }}>{result.winner}</div>
      <div style={{ fontFamily:'Rajdhani,sans-serif', fontSize:9, color:'rgba(255,255,255,.22)', textDecoration:'line-through', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', lineHeight:1.2 }}>{result.loser}</div>
    </div>
    <div style={{ flexShrink:0, textAlign:'right' }}>
      <div style={{ fontFamily:'Orbitron,monospace', fontSize:9, fontWeight:700, color:'rgba(255,255,255,.65)', lineHeight:1.2 }}>{result.score}</div>
      {result.isUpset   && <div style={{ fontSize:9 }}>🔥</div>}
      {result.isPerfect && <div style={{ fontSize:9 }}>👑</div>}
    </div>
  </div>
);

export default WarRoomOverlay;
