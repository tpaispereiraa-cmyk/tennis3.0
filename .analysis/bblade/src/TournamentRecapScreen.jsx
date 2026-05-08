// ============================================================
// TOURNAMENT RECAP SCREEN — EDIÇÃO GLORIOSA
// Substitui TournamentCeremony + TournamentRecapScreen antigo
// Design system: BroadcastHub / ModernBracket / WarRoom
// ============================================================

import React, { useState, useEffect } from 'react';
import { TEAMS } from './data.js';
import { CALENDAR_STRUCTURE as CALENDAR_CONFIG } from './CalendarConfig.js';
import PlayerImage from './PlayerImage.jsx';

// ── helpers ──────────────────────────────────────────────────
const normalizeId  = id => String(id ?? '').replace(/_pos\d+$/, '');
const idsEqual     = (a, b) => normalizeId(a) === normalizeId(b);
const getTeam      = id  => TEAMS[parseInt(normalizeId(id))] || TEAMS[normalizeId(id)] || null;
const getName      = id  => getTeam(id)?.name  || `Player ${id}`;
const getCountry   = id  => getTeam(id)?.country || '';
const getFullBody  = id  => getTeam(id)?.fullBodyUrl || null;
const getIcon      = id  => getTeam(id)?.iconUrl || null;

const PHASE_LABELS = { F:'Final', SF:'Semifinais', QF:'Quartas de Final', R16:'Oitavas de Final', R32:'Rodada de 32', R64:'Rodada de 64' };
const PHASE_ORDER  = ['F','SF','QF','R16','R32','R64'];

const FINISH_INFO  = {
  SPIN_FINISH:    { name:'Spin Finish',    icon:'⚡', bar:'#ffd700', glow:'rgba(255,215,0,0.5)',   label:'#ffd700'  },
  BURST_FINISH:   { name:'Burst Finish',   icon:'💥', bar:'#f87171', glow:'rgba(248,113,113,0.5)', label:'#f87171'  },
  RING_OUT_FINISH:{ name:'Ring-Out Finish',icon:'🌀', bar:'#60a5fa', glow:'rgba(96,165,250,0.5)',  label:'#60a5fa'  },
  KO_FINISH:      { name:'KO Finish',      icon:'👊', bar:'#fb923c', glow:'rgba(251,146,60,0.5)',  label:'#fb923c'  },
  PITT_OUT_FINISH:{ name:'Pitt-Out Finish',icon:'🕳️', bar:'#a78bfa', glow:'rgba(167,139,250,0.5)', label:'#a78bfa' },
  DRAW:           { name:'Draw',           icon:'🤝', bar:'#94a3b8', glow:'rgba(148,163,184,0.4)', label:'#94a3b8'  },
};

const BEY_INFO = {
  Attack:  { icon:'⚔️', color:'#f87171' },
  Defense: { icon:'🛡️', color:'#60a5fa' },
  Stamina: { icon:'♾️', color:'#4ade80' },
  Balance: { icon:'⚖️', color:'#c084fc' },
};

// ── CSS animations & design tokens ──────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Black+Ops+One&family=Rajdhani:wght@400;600;700&family=Orbitron:wght@400;700;900&display=swap');

  @keyframes rc-scan    { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
  @keyframes rc-pulse   { 0%,100%{opacity:.45;transform:scale(1)} 50%{opacity:1;transform:scale(1.04)} }
  @keyframes rc-float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
  @keyframes rc-shine   { 0%{transform:translateX(-200%)} 100%{transform:translateX(200%)} }
  @keyframes rc-appear  { 0%{opacity:0;transform:translateY(16px)} 100%{opacity:1;transform:translateY(0)} }
  @keyframes rc-confetti{ 0%{opacity:1;transform:translateY(0) rotate(0deg)} 100%{opacity:0;transform:translateY(80px) rotate(720deg)} }
  @keyframes rc-glow    { 0%,100%{box-shadow:0 0 30px rgba(255,215,0,.3)} 50%{box-shadow:0 0 80px rgba(255,215,0,.7)} }
  @keyframes rc-silver  { 0%,100%{box-shadow:0 0 20px rgba(200,200,220,.2)} 50%{box-shadow:0 0 50px rgba(200,200,220,.5)} }

  .rc-root { font-family:'Rajdhani',sans-serif; }
  .rc-root * { box-sizing:border-box; }

  .rc-tab { font-family:'Orbitron',monospace; font-size:11px; font-weight:700; letter-spacing:.15em;
    padding:10px 18px; border:1px solid rgba(255,255,255,.1); background:transparent;
    color:rgba(255,255,255,.4); cursor:pointer; transition:all .18s ease; white-space:nowrap; }
  .rc-tab:hover { color:rgba(255,255,255,.7); border-color:rgba(255,215,0,.3); }
  .rc-tab.active { color:#ffd700; border-color:rgba(255,215,0,.6); background:rgba(255,215,0,.06);
    box-shadow:0 0 20px rgba(255,215,0,.15); }

  .rc-card { background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08); transition:border-color .2s; }
  .rc-card:hover { border-color:rgba(255,215,0,.2); }

  .rc-champion-card { animation:rc-glow 3s ease-in-out infinite; }
  .rc-runner-card   { animation:rc-silver 3s ease-in-out infinite; }
  .rc-trophy-float  { animation:rc-float 3.5s ease-in-out infinite; display:inline-block; }
  .rc-appear        { animation:rc-appear .5s ease forwards; }

  .rc-bar-fill { transition:width 1.2s cubic-bezier(.4,0,.2,1); position:relative; overflow:hidden; }
  .rc-bar-fill::after { content:''; position:absolute; inset:0;
    background:linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent);
    animation:rc-shine 2.5s ease infinite; }

  .rc-match-row { background:rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.06);
    transition:all .15s; }
  .rc-match-row:hover { background:rgba(255,255,255,.05); border-color:rgba(255,215,0,.18); }

  .rc-stat-num { font-family:'Orbitron',monospace; }
  .rc-title    { font-family:'Black Ops One',cursive; }
  .rc-label    { font-family:'Orbitron',monospace; font-size:10px; letter-spacing:.2em; font-weight:700; }
  .rc-scrollbar::-webkit-scrollbar { width:4px; }
  .rc-scrollbar::-webkit-scrollbar-track { background:rgba(255,255,255,.02); }
  .rc-scrollbar::-webkit-scrollbar-thumb { background:rgba(255,215,0,.25); border-radius:2px; }

  .rc-confetti-piece { position:absolute; width:8px; height:8px; animation:rc-confetti 2s ease-out forwards; }
`;

// ── Confetti decorative component ────────────────────────────
const Confetti = () => {
  const pieces = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top:  `${Math.random() * 60}%`,
    color: ['#ffd700','#ff6400','#00d4ff','#c084fc','#4ade80','#f87171'][i % 6],
    delay: `${Math.random() * 2}s`,
    size:  `${6 + Math.random() * 8}px`,
  }));
  return (
    <>
      {pieces.map(p => (
        <div key={p.id} className="rc-confetti-piece"
          style={{ left:p.left, top:p.top, background:p.color, width:p.size, height:p.size,
            borderRadius: p.id % 3 === 0 ? '50%' : '2px',
            animationDelay:p.delay, animationDuration:`${1.5 + Math.random()}s` }} />
      ))}
    </>
  );
};

// ── Score badge ───────────────────────────────────────────────
const ScoreBadge = ({ log, champId }) => {
  if (!log?.score) return null;
  const champIsA = idsEqual(log.playerAId, champId);
  const cs = champIsA ? log.score.playerA : log.score.playerB;
  const os = champIsA ? log.score.playerB : log.score.playerA;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <span style={{ fontFamily:'Orbitron,monospace', fontSize:24, fontWeight:900, color:'#ffd700' }}>{cs}</span>
      <span style={{ color:'rgba(255,255,255,.3)', fontSize:14 }}>—</span>
      <span style={{ fontFamily:'Orbitron,monospace', fontSize:24, fontWeight:900, color:'rgba(255,255,255,.5)' }}>{os}</span>
    </div>
  );
};

// ── Per-phase match row ───────────────────────────────────────
const MatchRow = ({ log }) => {
  const aName   = getName(log.playerAId);
  const bName   = getName(log.playerBId);
  const aWon    = idsEqual(log.winnerId, log.playerAId);
  const sa      = log.score?.playerA;
  const sb      = log.score?.playerB;
  const rounds  = log.allFinishes?.length || log.rounds?.length || 1;
  const finish  = FINISH_INFO[log.finishType] || FINISH_INFO.SPIN_FINISH;

  return (
    <div className="rc-match-row" style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', borderRadius:8, marginBottom:6 }}>
      {/* Player A */}
      <div style={{ display:'flex', alignItems:'center', gap:8, flex:1, justifyContent:'flex-end' }}>
        <span style={{ fontWeight:700, color: aWon ? '#fff' : 'rgba(255,255,255,.4)', fontSize:14 }}>{aName}</span>
        {getIcon(log.playerAId) && <img src={getIcon(log.playerAId)} alt="" style={{ width:28, height:28, borderRadius:4, opacity: aWon ? 1 : .4 }} />}
      </div>
      {/* Score */}
      <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:90, justifyContent:'center' }}>
        {sa !== undefined ? (
          <>
            <span style={{ fontFamily:'Orbitron,monospace', fontSize:18, fontWeight:900, color: aWon ? '#ffd700' : 'rgba(255,255,255,.4)' }}>{sa}</span>
            <span style={{ color:'rgba(255,255,255,.2)', fontSize:12 }}>:</span>
            <span style={{ fontFamily:'Orbitron,monospace', fontSize:18, fontWeight:900, color: !aWon ? '#ffd700' : 'rgba(255,255,255,.4)' }}>{sb}</span>
          </>
        ) : (
          <span style={{ color:'rgba(255,255,255,.3)', fontSize:12 }}>WIN</span>
        )}
      </div>
      {/* Player B */}
      <div style={{ display:'flex', alignItems:'center', gap:8, flex:1 }}>
        {getIcon(log.playerBId) && <img src={getIcon(log.playerBId)} alt="" style={{ width:28, height:28, borderRadius:4, opacity: !aWon ? 1 : .4 }} />}
        <span style={{ fontWeight:700, color: !aWon ? '#fff' : 'rgba(255,255,255,.4)', fontSize:14 }}>{bName}</span>
      </div>
      {/* Rounds + Finish */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', minWidth:60 }}>
        <span style={{ fontSize:13 }}>{finish.icon}</span>
        <span style={{ fontFamily:'Orbitron,monospace', fontSize:9, color:'rgba(255,255,255,.3)', letterSpacing:'.1em' }}>{rounds}R</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
const TournamentRecapScreen = ({ universeManager, universeChampion, onContinue, onViewBracket }) => {
  const [activeTab, setActiveTab] = useState('podium');
  const [barsReady, setBarsReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setBarsReady(true), 300); return () => clearTimeout(t); }, [activeTab]);

  // ── data ────────────────────────────────────────────────────
  const tournamentKey = universeChampion?.tournamentKey;
  const recap   = universeManager.computeTournamentRecap(tournamentKey);
  const archive = tournamentKey ? universeManager.tournamentArchive.get(tournamentKey) : null;

  // ── early exit ──────────────────────────────────────────────
  if (!recap.dataAvailable || !archive) {
    return (
      <div style={{ minHeight:'100vh', background:'#0a000f', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:16, padding:40, textAlign:'center', maxWidth:400 }}>
          <div style={{ fontSize:48, marginBottom:16 }}>⚠️</div>
          <h2 style={{ color:'#fff', fontFamily:'Orbitron,monospace', fontSize:20, marginBottom:12 }}>Dados Indisponíveis</h2>
          <p style={{ color:'rgba(255,255,255,.5)', marginBottom:24 }}>Não há dados para este torneio.</p>
          <button onClick={onContinue} style={{ background:'#ffd700', color:'#000', border:'none', borderRadius:8, padding:'12px 32px', fontFamily:'Orbitron,monospace', fontWeight:700, fontSize:13, cursor:'pointer' }}>CONTINUAR</button>
        </div>
      </div>
    );
  }

  // ── extract archive ─────────────────────────────────────────
  const { champion, runnerUp, bracket, tournament, tournamentName, tournamentType } = archive;
  const finalLog = universeManager.matchLog.filter(l => l.tournamentId === tournamentKey && l.round === 'F')[0] || null;
  const logs     = universeManager.matchLog.filter(l => l.tournamentId === tournamentKey);

  // SF losers (3rd/4th)
  const sfLosers = (bracket?.SF || []).map(m => {
    if (!m?.winner || !m?.player1 || !m?.player2) return null;
    return idsEqual(m.winner.id, m.player1.id) ? m.player2 : m.player1;
  }).filter(Boolean);

  // Matches by phase
  const matchesByPhase = {};
  logs.forEach(l => { (matchesByPhase[l.round] = matchesByPhase[l.round] || []).push(l); });

  // Season / month label
  const monthName = CALENDAR_CONFIG.months.find(m => m.id === universeManager.currentMonth)?.name || '';

  // Win leaderboard
  const winsMap = {};
  logs.forEach(l => { const w = normalizeId(l.winnerId); winsMap[w] = (winsMap[w]||0)+1; });
  const winLeaderboard = Object.entries(winsMap)
    .map(([id,wins]) => ({ id, wins }))
    .sort((a,b) => b.wins - a.wins)
    .slice(0,5);

  // Extra stats
  const totalBursts   = logs.reduce((s,l) => s+(l.burstCount||0), 0);
  const totalKOs      = logs.reduce((s,l) => s+(l.koCount||0), 0);
  const totalRingOuts = logs.reduce((s,l) => s+(l.ringOutCount||0), 0);
  const avgRounds     = recap.totalMatches ? (recap.totalRounds/recap.totalMatches).toFixed(1) : '0';
  const maxRoundsMatch = logs.reduce((best,l) => {
    const r = l.allFinishes?.length || l.rounds?.length || 0;
    return r > (best?.r||0) ? {...l,r} : best;
  }, null);

  // Finish bars max
  const finishEntries = Object.entries(recap.roundFinishStats||{}).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a);
  const finishMax = finishEntries[0]?.[1] || 1;

  // Bey type total
  const beyTotal = Object.values(recap.beyTypeUsage||{}).reduce((s,v)=>s+v,0)||1;

  // Phase breakdown (matches per phase)
  const phaseBreakdown = PHASE_ORDER.filter(p => matchesByPhase[p]).map(p => ({
    phase:p, label:PHASE_LABELS[p], count:matchesByPhase[p].length
  }));

  // ── tab bar ─────────────────────────────────────────────────
  const TABS = [
    { id:'podium',      label:'🏆 PÓDIO'       },
    { id:'stats',       label:'📊 ESTATÍSTICAS' },
    { id:'highlights',  label:'⭐ DESTAQUES'    },
    { id:'matches',     label:'🗒️ CONFRONTOS'  },
  ];

  // ── RENDER ─────────────────────────────────────────────────
  return (
    <div className="rc-root rc-scrollbar" style={{ width:'100vw', minHeight:'100vh', overflowY:'auto',
      background:'radial-gradient(ellipse 120% 90% at 50% 110%, #1a0030 0%, #0a000f 45%, #000008 100%)',
      color:'#fff', position:'relative' }}>
      <style>{STYLES}</style>

      {/* grid overlay */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none',
        backgroundImage:'linear-gradient(rgba(0,212,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,.025) 1px,transparent 1px)',
        backgroundSize:'60px 60px',
        maskImage:'radial-gradient(ellipse 80% 60% at 50% 100%, black, transparent)',
        WebkitMaskImage:'radial-gradient(ellipse 80% 60% at 50% 100%, black, transparent)' }} />

      {/* scan line */}
      <div style={{ position:'fixed', top:0, left:0, right:0, height:2,
        background:'linear-gradient(90deg,transparent,rgba(0,212,255,.6),transparent)',
        animation:'rc-scan 9s linear infinite', pointerEvents:'none', zIndex:50 }} />

      {/* gold bottom line */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, height:2,
        background:'linear-gradient(90deg,transparent,rgba(255,180,0,.7) 30%,#ffd700 50%,rgba(255,180,0,.7) 70%,transparent)',
        boxShadow:'0 0 40px rgba(255,215,0,.4)', pointerEvents:'none', zIndex:30 }} />

      {/* ── STICKY HEADER ──────────────────────────────────── */}
      <div style={{ position:'sticky', top:0, zIndex:40, background:'rgba(0,0,0,.8)',
        backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(255,215,0,.12)', padding:'0 28px' }}>
        {/* top row */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          height:58, gap:16 }}>
          {/* title */}
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:4, height:40, background:'linear-gradient(180deg,#ffd700,#ff6400)', borderRadius:2 }} />
            <div>
              <div className="rc-label" style={{ color:'rgba(255,215,0,.55)', marginBottom:2 }}>
                TEMPORADA {universeManager.currentYear} &nbsp;·&nbsp; {monthName.toUpperCase()} &nbsp;·&nbsp; TOURNAMENT RECAP
              </div>
              <h1 style={{ fontFamily:'Orbitron,monospace', fontWeight:900, fontSize:20, color:'#fff',
                letterSpacing:'-.02em', lineHeight:1.1, margin:0, textTransform:'uppercase' }}>
                {tournamentName}
              </h1>
            </div>
          </div>
          {/* actions */}
          <div style={{ display:'flex', gap:10 }}>
            {onViewBracket && (
              <button onClick={onViewBracket}
                style={{ fontFamily:'Orbitron,monospace', fontSize:10, fontWeight:700, letterSpacing:'.12em',
                  padding:'9px 18px', border:'1px solid rgba(255,255,255,.18)', background:'rgba(255,255,255,.05)',
                  color:'rgba(255,255,255,.6)', cursor:'pointer', borderRadius:6, transition:'all .15s' }}
                onMouseOver={e=>{e.currentTarget.style.borderColor='rgba(255,215,0,.5)';e.currentTarget.style.color='#ffd700';}}
                onMouseOut={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.18)';e.currentTarget.style.color='rgba(255,255,255,.6)';}}>
                📊 VER BRACKET
              </button>
            )}
            <button onClick={onContinue}
              style={{ fontFamily:'Orbitron,monospace', fontSize:11, fontWeight:700, letterSpacing:'.14em',
                padding:'9px 24px', border:'1px solid rgba(255,215,0,.6)',
                background:'linear-gradient(135deg,rgba(255,215,0,.14),rgba(255,80,0,.08))',
                color:'#ffd700', cursor:'pointer', borderRadius:6, boxShadow:'0 0 20px rgba(255,215,0,.18)',
                transition:'all .18s' }}
              onMouseOver={e=>{e.currentTarget.style.boxShadow='0 0 36px rgba(255,215,0,.4)';}}
              onMouseOut={e=>{e.currentTarget.style.boxShadow='0 0 20px rgba(255,215,0,.18)';}}>
              CONTINUAR →
            </button>
          </div>
        </div>
        {/* tabs */}
        <div style={{ display:'flex', gap:0, paddingBottom:0, overflowX:'auto' }}>
          {TABS.map(t => (
            <button key={t.id} className={`rc-tab${activeTab===t.id?' active':''}`}
              onClick={() => { setActiveTab(t.id); setBarsReady(false); }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT AREA ───────────────────────────────────── */}
      <div style={{ maxWidth:1280, margin:'0 auto', padding:'36px 28px 80px' }} className="rc-appear">

        {/* ════════════════ TAB: PÓDIO ════════════════ */}
        {activeTab === 'podium' && (
          <div>
            {/* Big hero gradient */}
            <div style={{ position:'relative', overflow:'hidden', borderRadius:20, marginBottom:24,
              background:'linear-gradient(135deg,rgba(30,10,60,.9),rgba(10,0,20,.95))',
              border:'1px solid rgba(255,215,0,.15)', padding:'48px 40px 40px' }}>
              {/* Confetti */}
              <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
                <Confetti />
              </div>
              {/* Section title */}
              <div style={{ textAlign:'center', marginBottom:36, position:'relative' }}>
                <div className="rc-label" style={{ color:'rgba(255,215,0,.55)', marginBottom:8 }}>RESULTADO FINAL</div>
                <h2 className="rc-title" style={{ fontSize:'clamp(28px,5vw,52px)', color:'#ffd700',
                  textShadow:'0 0 40px rgba(255,215,0,.5)', margin:0, letterSpacing:'.04em' }}>
                  CAMPEÃO DO TORNEIO
                </h2>
                <div style={{ width:200, height:2, background:'linear-gradient(90deg,transparent,#ffd700,transparent)',
                  margin:'16px auto 0' }} />
              </div>

              {/* Podium row */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, marginBottom:24 }}>

                {/* ── CHAMPION ── */}
                <div className="rc-champion-card" style={{ position:'relative', borderRadius:16,
                  background:'linear-gradient(135deg,rgba(40,25,0,.95),rgba(20,10,0,.9))',
                  border:'2px solid rgba(255,215,0,.7)', overflow:'hidden', minHeight:420 }}>
                  {/* Gold glow bg */}
                  <div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at 70% 100%,rgba(255,215,0,.12),transparent 65%)', pointerEvents:'none' }} />
                  {/* Full body image */}
                  {getFullBody(champion?.id) ? (
                    <div style={{ position:'absolute', right:0, bottom:0, width:'55%', height:'100%', overflow:'hidden' }}>
                      <img src={getFullBody(champion.id)} alt="" style={{ width:'100%', height:'100%', objectFit:'contain', objectPosition:'bottom' }} />
                      {/* fade mask */}
                      <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,rgba(40,25,0,.95) 0%,transparent 40%)' }} />
                    </div>
                  ) : null}
                  {/* Content */}
                  <div style={{ position:'relative', padding:'28px 24px', zIndex:2 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                      <span className="rc-trophy-float" style={{ fontSize:36 }}>🏆</span>
                      <span className="rc-label" style={{ color:'#ffd700', fontSize:11, background:'rgba(255,215,0,.12)',
                        border:'1px solid rgba(255,215,0,.4)', padding:'4px 12px', borderRadius:20 }}>
                        CAMPEÃO
                      </span>
                    </div>
                    <h3 className="rc-title" style={{ fontSize:'clamp(20px,3vw,34px)', color:'#fff',
                      textShadow:'0 2px 12px rgba(0,0,0,.8)', margin:'0 0 8px', lineHeight:1.1, maxWidth:'55%' }}>
                      {getName(champion?.id)}
                    </h3>
                    <div style={{ color:'rgba(255,255,255,.55)', fontSize:14, marginBottom:20 }}>
                      {getCountry(champion?.id)}
                    </div>

                    {/* Final score */}
                    {finalLog?.score && (
                      <div style={{ marginBottom:20 }}>
                        <div className="rc-label" style={{ color:'rgba(255,255,255,.3)', fontSize:9, marginBottom:8 }}>
                          PLACAR DA FINAL
                        </div>
                        <ScoreBadge log={finalLog} champId={champion?.id} />
                      </div>
                    )}

                    {/* Venceu contra */}
                    <div style={{ background:'rgba(0,0,0,.4)', border:'1px solid rgba(255,255,255,.1)',
                      borderRadius:10, padding:'10px 14px', maxWidth:'55%' }}>
                      <div className="rc-label" style={{ color:'rgba(255,255,255,.35)', fontSize:9, marginBottom:4 }}>
                        DERROTOU NA FINAL
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        {getIcon(runnerUp?.id) && <img src={getIcon(runnerUp.id)} alt="" style={{ width:22, height:22, borderRadius:4, opacity:.7 }} />}
                        <span style={{ color:'rgba(255,255,255,.65)', fontWeight:700, fontSize:14 }}>{getName(runnerUp?.id)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── RUNNER-UP ── */}
                <div className="rc-runner-card" style={{ position:'relative', borderRadius:16,
                  background:'linear-gradient(135deg,rgba(15,20,30,.95),rgba(8,10,18,.9))',
                  border:'2px solid rgba(180,190,210,.4)', overflow:'hidden', minHeight:380 }}>
                  <div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at 30% 100%,rgba(180,190,220,.06),transparent 60%)', pointerEvents:'none' }} />
                  {getFullBody(runnerUp?.id) ? (
                    <div style={{ position:'absolute', left:0, bottom:0, width:'50%', height:'100%', overflow:'hidden' }}>
                      <img src={getFullBody(runnerUp.id)} alt="" style={{ width:'100%', height:'100%', objectFit:'contain', objectPosition:'bottom', opacity:.7 }} />
                      <div style={{ position:'absolute', inset:0, background:'linear-gradient(270deg,rgba(15,20,30,.95) 0%,transparent 40%)' }} />
                    </div>
                  ) : null}
                  <div style={{ position:'relative', padding:'28px 24px', zIndex:2, display:'flex', flexDirection:'column', alignItems:'flex-end', height:'100%' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                      <span className="rc-label" style={{ color:'rgba(200,210,230,.8)', fontSize:11, background:'rgba(180,190,210,.1)',
                        border:'1px solid rgba(180,190,210,.3)', padding:'4px 12px', borderRadius:20 }}>
                        VICE-CAMPEÃO
                      </span>
                      <span style={{ fontSize:30 }}>🥈</span>
                    </div>
                    <h3 className="rc-title" style={{ fontSize:'clamp(16px,2.5vw,26px)', color:'rgba(220,230,250,.9)',
                      textShadow:'0 2px 12px rgba(0,0,0,.8)', margin:'0 0 8px', lineHeight:1.1, textAlign:'right' }}>
                      {getName(runnerUp?.id)}
                    </h3>
                    <div style={{ color:'rgba(255,255,255,.4)', fontSize:14, marginBottom:16, textAlign:'right' }}>
                      {getCountry(runnerUp?.id)}
                    </div>
                    <div style={{ background:'rgba(0,0,0,.4)', border:'1px solid rgba(255,255,255,.08)',
                      borderRadius:10, padding:'10px 14px', textAlign:'right' }}>
                      <div className="rc-label" style={{ color:'rgba(255,255,255,.3)', fontSize:9, marginBottom:4 }}>
                        PERDEU PARA
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'flex-end' }}>
                        <span style={{ color:'rgba(255,255,255,.5)', fontWeight:700, fontSize:14 }}>{getName(champion?.id)}</span>
                        {getIcon(champion?.id) && <img src={getIcon(champion.id)} alt="" style={{ width:22, height:22, borderRadius:4 }} />}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Semi-finalists (3rd/4th) ── */}
              {sfLosers.length > 0 && (
                <div>
                  <div style={{ textAlign:'center', marginBottom:16 }}>
                    <div className="rc-label" style={{ color:'rgba(180,140,80,.6)', fontSize:10 }}>🥉 SEMIFINALISTAS</div>
                  </div>
                  <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
                    {sfLosers.map((p, i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:10,
                        background:'rgba(255,255,255,.03)', border:'1px solid rgba(180,140,80,.25)',
                        borderRadius:12, padding:'12px 20px' }}>
                        {getIcon(p?.id) ? (
                          <img src={getIcon(p.id)} alt="" style={{ width:36, height:36, borderRadius:8, border:'1px solid rgba(180,140,80,.4)' }} />
                        ) : (
                          <div style={{ width:36, height:36, borderRadius:8, background:'rgba(180,140,80,.15)', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(180,140,80,.6)' }}>?</div>
                        )}
                        <div>
                          <div style={{ fontWeight:700, color:'rgba(255,255,255,.8)', fontSize:14 }}>{getName(p?.id)}</div>
                          <div style={{ color:'rgba(180,140,80,.6)', fontSize:12 }}>{getCountry(p?.id)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick summary stats */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
              {[
                { label:'PARTIDAS',     value:recap.totalMatches, sub:`Formato ${tournamentType}`,          color:'#00d4ff' },
                { label:'ROUNDS',       value:recap.totalRounds,  sub:`${avgRounds} por partida`,           color:'#ffd700' },
                { label:'FINISHES',     value:recap.mostCommonFinish ? (FINISH_INFO[recap.mostCommonFinish]?.name||recap.mostCommonFinish) : 'N/A',
                                        sub:'Tipo mais comum', isText:true, color:'#c084fc' },
                { label:'ARENA',        value:recap.arena,        sub:'Arena oficial', isText:true,          color:'#ff6400' },
              ].map(s => (
                <div key={s.label} className="rc-card" style={{ borderRadius:12, padding:'20px 18px', textAlign:'center' }}>
                  <div className="rc-label" style={{ color:s.color, fontSize:9, marginBottom:10, opacity:.8 }}>{s.label}</div>
                  {s.isText
                    ? <div style={{ fontWeight:800, fontSize:16, color:'#fff', lineHeight:1.2 }}>{s.value}</div>
                    : <div className="rc-stat-num" style={{ fontWeight:900, fontSize:32, color:'#fff' }}>{s.value}</div>
                  }
                  <div style={{ color:'rgba(255,255,255,.35)', fontSize:12, marginTop:6 }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════ TAB: ESTATÍSTICAS ════════════════ */}
        {activeTab === 'stats' && (
          <div style={{ display:'flex', flexDirection:'column', gap:24 }}>

            {/* Summary row */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
              {[
                { label:'PARTIDAS',         value:recap.totalMatches,                   color:'#00d4ff' },
                { label:'ROUNDS JOGADOS',   value:recap.totalRounds,                    color:'#ffd700' },
                { label:'MÉDIA DE ROUNDS',  value:avgRounds,                            color:'#c084fc', suffix:'/partida' },
                { label:'TOTAL DE BURSTS',  value:totalBursts,                          color:'#f87171' },
              ].map(s => (
                <div key={s.label} className="rc-card" style={{ borderRadius:12, padding:'20px 18px', textAlign:'center' }}>
                  <div className="rc-label" style={{ color:s.color, fontSize:9, marginBottom:10, opacity:.8 }}>{s.label}</div>
                  <div className="rc-stat-num" style={{ fontWeight:900, fontSize:28, color:'#fff' }}>{s.value}{s.suffix||''}</div>
                </div>
              ))}
            </div>

            {/* Finish type distribution */}
            <div className="rc-card" style={{ borderRadius:16, padding:'28px 24px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
                <span style={{ fontSize:26 }}>⚡</span>
                <div>
                  <h3 style={{ fontFamily:'Orbitron,monospace', fontWeight:900, fontSize:16, margin:0, color:'#fff' }}>
                    TIPOS DE VITÓRIA
                  </h3>
                  <p style={{ color:'rgba(255,255,255,.4)', fontSize:13, margin:'4px 0 0' }}>
                    Distribuição de finishes nos {recap.totalRounds} rounds jogados
                  </p>
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                {finishEntries.map(([type, count]) => {
                  const info = FINISH_INFO[type] || { name:type, icon:'🎯', bar:'#94a3b8', glow:'rgba(148,163,184,.4)', label:'#94a3b8' };
                  const pct = recap.totalRounds ? (count/recap.totalRounds*100) : 0;
                  return (
                    <div key={type}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <span style={{ fontSize:20 }}>{info.icon}</span>
                          <div>
                            <div style={{ fontWeight:700, color:'#fff', fontSize:15 }}>{info.name}</div>
                            <div style={{ color:'rgba(255,255,255,.4)', fontSize:12 }}>{count} rounds · {pct.toFixed(1)}%</div>
                          </div>
                        </div>
                        <div className="rc-stat-num" style={{ fontSize:24, fontWeight:900, color:info.label }}>{count}</div>
                      </div>
                      <div style={{ height:8, background:'rgba(255,255,255,.06)', borderRadius:4, overflow:'hidden' }}>
                        <div className="rc-bar-fill" style={{ height:'100%', borderRadius:4,
                          background:`linear-gradient(90deg, ${info.bar}, ${info.bar}88)`,
                          boxShadow:`0 0 10px ${info.glow}`,
                          width: barsReady ? `${pct}%` : '0%' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Totals footer */}
              <div style={{ display:'flex', gap:0, paddingTop:20, marginTop:20, borderTop:'1px solid rgba(255,255,255,.06)' }}>
                {[
                  { v:recap.totalMatches, l:'PARTIDAS' },
                  { v:recap.totalRounds,  l:'ROUNDS'   },
                  { v:avgRounds,          l:'MÉDIA/PARTIDA' },
                  { v:totalBursts,        l:'BURSTS'   },
                  { v:totalKOs,           l:'KOs'      },
                  { v:totalRingOuts,      l:'RING-OUTS'},
                ].map(s => (
                  <div key={s.l} style={{ flex:1, textAlign:'center', padding:'0 8px' }}>
                    <div className="rc-stat-num" style={{ fontSize:20, fontWeight:900, color:'#fff' }}>{s.v}</div>
                    <div className="rc-label" style={{ color:'rgba(255,255,255,.35)', fontSize:8, marginTop:4 }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bey type usage */}
            {recap.beyTypeUsage && Object.values(recap.beyTypeUsage).some(v=>v>0) && (
              <div className="rc-card" style={{ borderRadius:16, padding:'28px 24px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
                  <span style={{ fontSize:24 }}>🎯</span>
                  <h3 style={{ fontFamily:'Orbitron,monospace', fontWeight:900, fontSize:16, margin:0, color:'#fff' }}>
                    TIPOS DE PEÃO USADOS
                  </h3>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
                  {Object.entries(BEY_INFO).map(([type,info]) => {
                    const count = recap.beyTypeUsage[type]||0;
                    const pct = (count/beyTotal*100).toFixed(1);
                    return (
                      <div key={type} style={{ background:`rgba(0,0,0,.3)`, border:`1px solid ${info.color}30`,
                        borderRadius:12, padding:'16px 12px', textAlign:'center' }}>
                        <span style={{ fontSize:28 }}>{info.icon}</span>
                        <div style={{ fontFamily:'Orbitron,monospace', fontWeight:900, fontSize:24, color:'#fff', margin:'8px 0 4px' }}>{count}</div>
                        <div style={{ fontWeight:700, color:info.color, fontSize:13 }}>{type}</div>
                        <div style={{ color:'rgba(255,255,255,.35)', fontSize:11, marginTop:4 }}>{pct}%</div>
                        <div style={{ height:3, background:'rgba(255,255,255,.06)', borderRadius:2, marginTop:10, overflow:'hidden' }}>
                          <div className="rc-bar-fill" style={{ height:'100%', background:info.color, width: barsReady ? `${pct}%` : '0%' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Phase breakdown */}
            <div className="rc-card" style={{ borderRadius:16, padding:'28px 24px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
                <span style={{ fontSize:24 }}>🗺️</span>
                <h3 style={{ fontFamily:'Orbitron,monospace', fontWeight:900, fontSize:16, margin:0, color:'#fff' }}>
                  PARTIDAS POR FASE
                </h3>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {phaseBreakdown.map(p => {
                  const maxCount = phaseBreakdown[phaseBreakdown.length-1]?.count || 1;
                  const pctW = (p.count / (phaseBreakdown[0]?.count||1) * 100);
                  return (
                    <div key={p.phase} style={{ display:'flex', alignItems:'center', gap:14 }}>
                      <div style={{ width:130, fontFamily:'Orbitron,monospace', fontSize:11, color:'rgba(255,255,255,.5)', textAlign:'right' }}>{p.label}</div>
                      <div style={{ flex:1, height:6, background:'rgba(255,255,255,.06)', borderRadius:3, overflow:'hidden' }}>
                        <div className="rc-bar-fill" style={{ height:'100%', background:'linear-gradient(90deg,#00d4ff,#7b2fff)',
                          width: barsReady ? `${pctW}%` : '0%' }} />
                      </div>
                      <div className="rc-stat-num" style={{ width:30, textAlign:'right', color:'#fff', fontWeight:700 }}>{p.count}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════ TAB: DESTAQUES ════════════════ */}
        {activeTab === 'highlights' && (
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

            {/* Win leaderboard */}
            <div className="rc-card" style={{ borderRadius:16, padding:'28px 24px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
                <span style={{ fontSize:24 }}>🔥</span>
                <h3 style={{ fontFamily:'Orbitron,monospace', fontWeight:900, fontSize:16, margin:0, color:'#fff' }}>
                  MAIS VITÓRIAS NO TORNEIO
                </h3>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {winLeaderboard.map((entry, idx) => {
                  const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];
                  const colors = ['#ffd700','rgba(200,210,230,.8)','rgba(180,140,80,.8)','rgba(255,255,255,.4)','rgba(255,255,255,.3)'];
                  return (
                    <div key={entry.id} className="rc-match-row" style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderRadius:10 }}>
                      <span style={{ fontSize:20, width:28, textAlign:'center' }}>{medals[idx]||`${idx+1}`}</span>
                      {getIcon(entry.id) && <img src={getIcon(entry.id)} alt="" style={{ width:36, height:36, borderRadius:8, border:`1px solid ${colors[idx]}40` }} />}
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, color:'#fff', fontSize:15 }}>{getName(entry.id)}</div>
                        <div style={{ color:'rgba(255,255,255,.4)', fontSize:12 }}>{getCountry(entry.id)}</div>
                      </div>
                      <div className="rc-stat-num" style={{ fontSize:26, fontWeight:900, color:colors[idx]||'#fff' }}>
                        {entry.wins}<span style={{ fontSize:13, color:'rgba(255,255,255,.35)', marginLeft:4 }}>W</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cards grid */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>

              {/* Biggest upset */}
              {recap.notableMoments?.biggestUpset && (() => {
                const u = recap.notableMoments.biggestUpset;
                return (
                  <div className="rc-card" style={{ borderRadius:14, padding:'20px', borderLeft:'3px solid #f87171' }}>
                    <div className="rc-label" style={{ color:'#f87171', fontSize:9, marginBottom:12 }}>🎯 MAIOR UPSET</div>
                    <div style={{ fontFamily:'Orbitron,monospace', fontSize:22, fontWeight:900, color:'#fff', marginBottom:8 }}>
                      #{u.player1Rank > u.player2Rank ? u.player1Rank : u.player2Rank}
                      <span style={{ color:'rgba(255,255,255,.35)', fontSize:14, margin:'0 6px' }}>derrotou</span>
                      #{u.player1Rank < u.player2Rank ? u.player1Rank : u.player2Rank}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                      {getIcon(u.winnerId) && <img src={getIcon(u.winnerId)} alt="" style={{ width:32, height:32, borderRadius:6, border:'1px solid #4ade80' }} />}
                      <div>
                        <div style={{ fontWeight:700, color:'#fff', fontSize:13 }}>{getName(u.winnerId)}</div>
                        <div style={{ color:'rgba(255,255,255,.4)', fontSize:11 }}>vs {getName(u.loserId)}</div>
                      </div>
                    </div>
                    <div className="rc-stat-num" style={{ fontSize:28, fontWeight:900, color:'#f87171' }}>
                      +{u.upsetMargin} <span style={{ fontSize:12, fontFamily:'Rajdhani,sans-serif', color:'rgba(255,255,255,.4)' }}>posições</span>
                    </div>
                  </div>
                );
              })()}

              {/* Most common finish */}
              {recap.mostCommonFinish && (() => {
                const info = FINISH_INFO[recap.mostCommonFinish] || FINISH_INFO.SPIN_FINISH;
                const count = recap.roundFinishStats?.[recap.mostCommonFinish] || 0;
                return (
                  <div className="rc-card" style={{ borderRadius:14, padding:'20px', borderLeft:`3px solid ${info.bar}` }}>
                    <div className="rc-label" style={{ color:info.label, fontSize:9, marginBottom:12 }}>🎯 FINISH MAIS COMUM</div>
                    <div style={{ fontSize:48, marginBottom:12 }}>{info.icon}</div>
                    <div style={{ fontWeight:800, color:'#fff', fontSize:18, marginBottom:4 }}>{info.name}</div>
                    <div className="rc-stat-num" style={{ fontSize:30, fontWeight:900, color:info.label }}>
                      {count}<span style={{ fontSize:13, color:'rgba(255,255,255,.4)', marginLeft:6 }}>vezes</span>
                    </div>
                    <div style={{ color:'rgba(255,255,255,.35)', fontSize:12, marginTop:4 }}>
                      {recap.totalRounds ? (count/recap.totalRounds*100).toFixed(1) : 0}% dos rounds
                    </div>
                  </div>
                );
              })()}

              {/* Closest match */}
              {maxRoundsMatch && maxRoundsMatch.r > 1 && (
                <div className="rc-card" style={{ borderRadius:14, padding:'20px', borderLeft:'3px solid #c084fc' }}>
                  <div className="rc-label" style={{ color:'#c084fc', fontSize:9, marginBottom:12 }}>⚔️ BATALHA MAIS INTENSA</div>
                  <div className="rc-stat-num" style={{ fontSize:36, fontWeight:900, color:'#c084fc', marginBottom:12 }}>
                    {maxRoundsMatch.r} <span style={{ fontSize:14, color:'rgba(255,255,255,.4)' }}>rounds</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                    {getIcon(maxRoundsMatch.playerAId) && <img src={getIcon(maxRoundsMatch.playerAId)} alt="" style={{ width:28, height:28, borderRadius:5 }} />}
                    <span style={{ color:'rgba(255,255,255,.6)', fontSize:13, fontWeight:700 }}>{getName(maxRoundsMatch.playerAId)}</span>
                    <span style={{ color:'rgba(255,255,255,.3)' }}>vs</span>
                    {getIcon(maxRoundsMatch.playerBId) && <img src={getIcon(maxRoundsMatch.playerBId)} alt="" style={{ width:28, height:28, borderRadius:5 }} />}
                    <span style={{ color:'rgba(255,255,255,.6)', fontSize:13, fontWeight:700 }}>{getName(maxRoundsMatch.playerBId)}</span>
                  </div>
                  <div style={{ color:'rgba(255,255,255,.4)', fontSize:12 }}>{PHASE_LABELS[maxRoundsMatch.round]||maxRoundsMatch.round}</div>
                </div>
              )}
            </div>

            {/* Second row highlights */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
              {/* Longest match by duration */}
              {recap.notableMoments?.longestMatch?.duration && (
                <div className="rc-card" style={{ borderRadius:14, padding:'20px', borderLeft:'3px solid #60a5fa' }}>
                  <div className="rc-label" style={{ color:'#60a5fa', fontSize:9, marginBottom:12 }}>⏱️ PARTIDA MAIS LONGA</div>
                  <div className="rc-stat-num" style={{ fontSize:32, fontWeight:900, color:'#60a5fa', marginBottom:10 }}>
                    {recap.notableMoments.longestMatch.duration}s
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    {getIcon(recap.notableMoments.longestMatch.playerAId) && <img src={getIcon(recap.notableMoments.longestMatch.playerAId)} alt="" style={{ width:28, height:28, borderRadius:5 }} />}
                    <span style={{ color:'rgba(255,255,255,.5)', fontSize:12 }}>vs</span>
                    {getIcon(recap.notableMoments.longestMatch.playerBId) && <img src={getIcon(recap.notableMoments.longestMatch.playerBId)} alt="" style={{ width:28, height:28, borderRadius:5 }} />}
                  </div>
                  <div style={{ color:'rgba(255,255,255,.4)', fontSize:12, marginTop:6 }}>
                    {getName(recap.notableMoments.longestMatch.playerAId)} vs {getName(recap.notableMoments.longestMatch.playerBId)}
                  </div>
                </div>
              )}

              {/* Top player stats */}
              {recap.notableMoments?.topPlayer !== null && (
                <div className="rc-card" style={{ borderRadius:14, padding:'20px', borderLeft:'3px solid #ffd700' }}>
                  <div className="rc-label" style={{ color:'#ffd700', fontSize:9, marginBottom:12 }}>⭐ MVP DO TORNEIO</div>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                    {getIcon(recap.notableMoments.topPlayer) && (
                      <img src={getIcon(recap.notableMoments.topPlayer)} alt="" style={{ width:44, height:44, borderRadius:10, border:'2px solid rgba(255,215,0,.5)' }} />
                    )}
                    <div>
                      <div style={{ fontWeight:800, color:'#fff', fontSize:15 }}>{getName(recap.notableMoments.topPlayer)}</div>
                      <div style={{ color:'rgba(255,215,0,.6)', fontSize:12 }}>{getCountry(recap.notableMoments.topPlayer)}</div>
                    </div>
                  </div>
                  <div className="rc-stat-num" style={{ fontSize:30, fontWeight:900, color:'#ffd700' }}>
                    {recap.notableMoments.topPlayerWins}<span style={{ fontSize:13, color:'rgba(255,255,255,.4)', marginLeft:6 }}>vitórias</span>
                  </div>
                </div>
              )}

              {/* Champion's journey */}
              {champion && (() => {
                const champWins = winsMap[normalizeId(champion.id)] || 0;
                return (
                  <div className="rc-card" style={{ borderRadius:14, padding:'20px', borderLeft:'3px solid #ff6400' }}>
                    <div className="rc-label" style={{ color:'#ff6400', fontSize:9, marginBottom:12 }}>🏆 JORNADA DO CAMPEÃO</div>
                    {getIcon(champion.id) && <img src={getIcon(champion.id)} alt="" style={{ width:40, height:40, borderRadius:8, border:'2px solid rgba(255,100,0,.5)', marginBottom:10 }} />}
                    <div style={{ fontWeight:800, color:'#fff', fontSize:15, marginBottom:6 }}>{getName(champion.id)}</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <span style={{ color:'rgba(255,255,255,.4)', fontSize:12 }}>Vitórias no torneio</span>
                        <span className="rc-stat-num" style={{ color:'#ff6400', fontWeight:900 }}>{champWins}</span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <span style={{ color:'rgba(255,255,255,.4)', fontSize:12 }}>Fases disputadas</span>
                        <span className="rc-stat-num" style={{ color:'#ff6400', fontWeight:900 }}>{phaseBreakdown.length}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ════════════════ TAB: CONFRONTOS ════════════════ */}
        {activeTab === 'matches' && (
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            {PHASE_ORDER.filter(p => matchesByPhase[p]).map(phase => (
              <div key={phase} className="rc-card" style={{ borderRadius:16, padding:'24px 20px' }}>
                {/* Phase header */}
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, paddingBottom:12,
                  borderBottom:'1px solid rgba(255,255,255,.06)' }}>
                  <div style={{ width:3, height:24,
                    background: phase==='F' ? 'linear-gradient(180deg,#ffd700,#ff6400)'
                      : phase==='SF' ? 'linear-gradient(180deg,#c084fc,#7b2fff)'
                      : phase==='QF' ? 'linear-gradient(180deg,#60a5fa,#00d4ff)'
                      : 'linear-gradient(180deg,rgba(255,255,255,.3),rgba(255,255,255,.1))', borderRadius:2 }} />
                  <h3 style={{ fontFamily:'Orbitron,monospace', fontWeight:900,
                    fontSize: phase==='F' ? 18 : phase==='SF' ? 16 : 14,
                    color: phase==='F' ? '#ffd700' : phase==='SF' ? '#c084fc' : '#60a5fa',
                    margin:0 }}>
                    {PHASE_LABELS[phase]||phase}
                  </h3>
                  <div style={{ marginLeft:'auto', fontFamily:'Orbitron,monospace', fontSize:10,
                    color:'rgba(255,255,255,.3)', background:'rgba(255,255,255,.04)',
                    border:'1px solid rgba(255,255,255,.06)', borderRadius:20, padding:'2px 10px' }}>
                    {matchesByPhase[phase].length} {matchesByPhase[phase].length === 1 ? 'partida' : 'partidas'}
                  </div>
                </div>
                {/* Match rows */}
                <div>
                  {matchesByPhase[phase].map((log, i) => <MatchRow key={i} log={log} />)}
                </div>
              </div>
            ))}
            {PHASE_ORDER.every(p => !matchesByPhase[p]) && (
              <div style={{ textAlign:'center', padding:60, color:'rgba(255,255,255,.3)' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
                <div style={{ fontFamily:'Orbitron,monospace', fontSize:14 }}>Nenhum confronto registrado</div>
              </div>
            )}
          </div>
        )}

      </div>{/* /content */}
    </div>
  );
};

export default TournamentRecapScreen;
