import React, { useEffect } from 'react';
import { Trophy, Heart, Wind, Medal, Activity, Zap, Shield, TrendingUp, Gauge, Star } from 'lucide-react';
import { calculateStatBreakdown } from './utils/stats.js';

// ====================================================================
// BATTLE HUD — WAR ROOM
// Layout: painéis laterais full-height + top bar + bottom bar
// ====================================================================

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Black+Ops+One&family=Rajdhani:wght@400;600;700&family=Orbitron:wght@400;700;900&display=swap');

  @keyframes wr-scan {
    0%   { transform: translateY(-100%); }
    100% { transform: translateY(100vh); }
  }
  @keyframes wr-pulse {
    0%, 100% { opacity: .7; transform: scale(1); }
    50%       { opacity: 1;  transform: scale(1.05); }
  }
  @keyframes wr-glow {
    0%, 100% { box-shadow: 0 0 12px var(--pc, #3b82f6); }
    50%       { box-shadow: 0 0 24px var(--pc, #3b82f6); }
  }
  @keyframes wr-blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: .3; }
  }

  .wr-panel {
    position: absolute; top: 0; bottom: 0; width: 340px;
    background: linear-gradient(180deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.82) 100%);
    backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
    display: flex; flex-direction: column; gap: 0;
    overflow: hidden;
  }
  .wr-panel.left  { left: 0;  border-right: 2px solid rgba(255,255,255,0.06); }
  .wr-panel.right { right: 0; border-left:  2px solid rgba(255,255,255,0.06); }

  .wr-topbar {
    position: absolute; top: 0;
    left: 340px; right: 340px; height: 56px;
    background: rgba(0,0,0,0.88); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
    border-bottom: 2px solid rgba(255,215,0,0.12);
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 24px; gap: 16px;
  }
  .wr-bottombar {
    position: absolute; bottom: 0;
    left: 340px; right: 340px; height: 64px;
    background: rgba(0,0,0,0.82); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    border-top: 2px solid rgba(255,255,255,0.05);
    display: flex; align-items: center; justify-content: center; gap: 16px;
    padding: 0 28px;
  }

  .wr-section {
    border-bottom: 1px solid rgba(255,255,255,0.05);
    padding: 14px 16px;
  }
  .wr-label {
    font-family: 'Orbitron', monospace; font-size: 10px; font-weight: 700;
    letter-spacing: .25em; color: rgba(255,255,255,0.28); text-transform: uppercase;
    margin-bottom: 10px; display: flex; align-items: center; gap: 7px;
  }

  .wr-bar-track {
    height: 8px; background: rgba(0,0,0,0.6); border-radius: 3px;
    overflow: hidden; border: 1px solid rgba(255,255,255,0.07);
  }
  .wr-bar-fill {
    height: 100%; border-radius: 3px; transition: width 0.4s ease-out;
  }

  .wr-stat-box {
    padding: 8px 10px; border-radius: 4px; border: 1px solid;
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
  }

  .wr-badge {
    font-family: 'Orbitron', monospace; font-size: 10px; font-weight: 700;
    letter-spacing: .1em; padding: 4px 10px; border: 1px solid;
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    display: inline-block;
  }

  .wr-deck-token {
    width: 44px; height: 44px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    position: relative; flex-shrink: 0;
    font-family: 'Orbitron', monospace; font-size: 10px; font-weight: 700;
    transition: all .2s ease;
  }
  .wr-deck-token.active {
    width: 48px; height: 48px;
    animation: wr-glow 2s ease-in-out infinite;
  }
  .wr-deck-token.defeated {
    filter: grayscale(1) brightness(0.35);
  }

  .wr-scan-line {
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, transparent, rgba(255,215,0,0.1), transparent);
    animation: wr-scan 10s linear infinite;
    pointer-events: none; z-index: 999;
  }

  .wr-combo {
    position: absolute; left: 50%; transform: translateX(-50%);
    font-family: 'Black Ops One', cursive; font-size: 22px;
    letter-spacing: .08em;
    animation: wr-pulse .7s ease-in-out infinite;
    white-space: nowrap;
  }

  .wr-topbar-score {
    display: flex; align-items: center; gap: 18px;
    padding: 8px 24px;
    background: rgba(0,0,0,0.5);
    border: 1px solid rgba(255,215,0,0.2);
    clip-path: polygon(14px 0%, calc(100% - 14px) 0%, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0% calc(100% - 14px), 0% 14px);
  }
`;

// ── helpers ──────────────────────────────────────────────────────────

const tierColors = { LEGEND:'#FFD700', ELITE:'#9333EA', TOP:'#3B82F6', PRO:'#10B981' };

function statColor(key) {
  return { atk:'#ef4444', def:'#3b82f6', sta:'#10b981', bal:'#a855f7', weight:'#f59e0b', spin:'#06b6d4' }[key] || '#fff';
}
function statLabel(key) {
  return { atk:'ATAQUE', def:'DEFESA', sta:'STAMINA', bal:'BALANCE', weight:'PESO', spin:'SPIN' }[key] || key.toUpperCase();
}
function statIcon(key) {
  return { atk:'⚔', def:'🛡', sta:'❤', bal:'⚖', weight:'⚓', spin:'↺' }[key] || '·';
}
const STAT_KEYS = ['atk','def','sta','bal','weight','spin'];

// max references for bar width
const STAT_MAX = { atk:45, def:45, sta:45, bal:45, weight:45, spin:80 };

// ====================================================================

export const BattleHUD = ({ bey1, bey2, battleState, md3State }) => {
  useEffect(() => {
    const id = 'wr-hud-styles';
    if (!document.getElementById(id)) {
      const tag = document.createElement('style');
      tag.id = id; tag.textContent = STYLES;
      document.head.appendChild(tag);
    }
  }, []);

  if (!bey1 || !bey2 || !battleState || !md3State) return null;

  const team1 = bey1.team || {};
  const team2 = bey2.team || {};
  const t1Name  = team1.name  || bey1.name  || 'Player 1';
  const t2Name  = team2.name  || bey2.name  || 'Player 2';
  const t1Color = team1.colors?.[0] || bey1.color || '#3B82F6';
  const t2Color = team2.colors?.[0] || bey2.color || '#EF4444';

  const winsNeeded = md3State.format === 'MD5' ? 3 : md3State.format === 'MD7' ? 4 : 2;

  // deck info from md3State
  const deck1   = md3State.team1?.deck || [];
  const deck2   = md3State.team2?.deck || [];
  const used1   = md3State.team1UsedBlades || [];
  const used2   = md3State.team2UsedBlades || [];
  const active1 = bey1;
  const active2 = bey2;

  // round dots — who won each round: 'team1' | 'team2' | null
  const totalRounds = (md3State.team1Wins || 0) + (md3State.team2Wins || 0);
  const roundDots = Array.from({ length: winsNeeded * 2 - 1 }, (_, i) => {
    if (i < totalRounds) {
      // We know wins counts but not per-round — derive from scores
      // Simplified: fill team1 wins first, then team2
      if (i < (md3State.team1Wins || 0)) return 'team1';
      return 'team2';
    }
    return null;
  });

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 100 }}>
      <div className="wr-scan-line" />

      {/* TOP BAR */}
      <div className="wr-topbar">
        {/* tournament info left */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span className="wr-badge" style={{ color: md3State.format==='MD5' ? '#ffd700' : '#c084fc', borderColor: md3State.format==='MD5' ? 'rgba(255,215,0,0.5)' : 'rgba(192,132,252,0.5)' }}>
            {md3State.format==='MD5' ? 'GS' : 'EM'}
          </span>
          <span style={{ fontFamily:'Orbitron,monospace', fontSize:11, letterSpacing:'.18em', color:'rgba(255,255,255,0.35)' }}>
            ROUND {md3State.currentRound}
          </span>
        </div>

        {/* SCORE + TIMER */}
        <div className="wr-topbar-score">
          <span style={{ fontFamily:'Orbitron,monospace', fontSize:28, fontWeight:900, color: (md3State.team1Wins||0) >= winsNeeded ? '#4ade80' : 'rgba(255,255,255,0.45)', textShadow: (md3State.team1Wins||0) >= winsNeeded ? '0 0 14px #4ade80' : 'none', transition:'all .3s' }}>
            {md3State.team1Wins || 0}
          </span>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:'Orbitron,monospace', fontSize:20, fontWeight:900, color:'#ffd700', lineHeight:1, textShadow:'0 0 10px rgba(255,215,0,0.5)' }}>
              {Math.floor(battleState.time)}<span style={{ fontSize:13, opacity:.7 }}>.{Math.floor((battleState.time - Math.floor(battleState.time)) * 100).toString().padStart(2,'0')}</span>
            </div>
            <div style={{ fontFamily:'Orbitron,monospace', fontSize:8, letterSpacing:'.2em', color:'rgba(255,215,0,0.4)', marginTop:2 }}>TIMER</div>
          </div>
          <span style={{ fontFamily:'Orbitron,monospace', fontSize:28, fontWeight:900, color: (md3State.team2Wins||0) >= winsNeeded ? '#4ade80' : 'rgba(255,255,255,0.45)', textShadow: (md3State.team2Wins||0) >= winsNeeded ? '0 0 14px #4ade80' : 'none', transition:'all .3s' }}>
            {md3State.team2Wins || 0}
          </span>
        </div>

        {/* right: format */}
        <span style={{ fontFamily:'Orbitron,monospace', fontSize:11, letterSpacing:'.15em', color:'rgba(255,255,255,0.25)' }}>
          {md3State.format} • BO{winsNeeded * 2 - 1}
        </span>
      </div>

      {/* BOTTOM BAR — round history */}
      <div className="wr-bottombar">
        <span style={{ fontFamily:'Orbitron,monospace', fontSize:10, letterSpacing:'.2em', color:'rgba(255,255,255,0.25)', flexShrink:0 }}>ROUNDS</span>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          {roundDots.map((winner, i) => (
            <div key={i} style={{
              width: 30, height: 30, borderRadius:'50%',
              background: winner === 'team1' ? `${t1Color}35` : winner === 'team2' ? `${t2Color}35` : 'rgba(255,255,255,0.03)',
              border: winner === 'team1' ? `2px solid ${t1Color}` : winner === 'team2' ? `2px solid ${t2Color}` : '1px dashed rgba(255,255,255,0.18)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow: winner ? `0 0 8px ${winner==='team1' ? t1Color : t2Color}55` : 'none',
              transition:'all .3s'
            }}>
              {winner && <span style={{ fontSize:13, color: winner==='team1' ? t1Color : t2Color, fontWeight:900 }}>✓</span>}
            </div>
          ))}
        </div>
        <div style={{ width:1, height:24, background:'rgba(255,255,255,0.08)', flexShrink:0 }} />
        <span style={{ fontFamily:'Orbitron,monospace', fontSize:10, letterSpacing:'.15em', color:'rgba(255,255,255,0.2)', flexShrink:0 }}>
          {md3State.format==='MD5' ? 'PREMIER CHAMPIONSHIP' : 'ELITE MASTERS'} • 2026
        </span>
      </div>

      {/* COMBO — centro, acima do timer */}
      {(battleState.bey1Combos > 0 || battleState.bey2Combos > 0) && (
        <div style={{ position:'absolute', top:66, left:'50%', transform:'translateX(-50%)', display:'flex', gap:14, pointerEvents:'none' }}>
          {battleState.bey1Combos > 0 && (
            <div style={{ background:`${t1Color}22`, border:`2px solid ${t1Color}`, padding:'6px 18px', clipPath:'polygon(8px 0%,calc(100% - 8px) 0%,100% 8px,100% calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,0% calc(100% - 8px),0% 8px)', boxShadow:`0 0 20px ${t1Color}55`, animation:'wr-pulse .8s ease-in-out infinite' }}>
              <span style={{ fontFamily:'Black Ops One,cursive', fontSize:18, color:t1Color, textShadow:`0 0 10px ${t1Color}` }}>⚡ {battleState.bey1Combos}x COMBO</span>
            </div>
          )}
          {battleState.bey2Combos > 0 && (
            <div style={{ background:`${t2Color}22`, border:`2px solid ${t2Color}`, padding:'6px 18px', clipPath:'polygon(8px 0%,calc(100% - 8px) 0%,100% 8px,100% calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,0% calc(100% - 8px),0% 8px)', boxShadow:`0 0 20px ${t2Color}55`, animation:'wr-pulse .8s ease-in-out infinite' }}>
              <span style={{ fontFamily:'Black Ops One,cursive', fontSize:18, color:t2Color, textShadow:`0 0 10px ${t2Color}` }}>⚡ {battleState.bey2Combos}x COMBO</span>
            </div>
          )}
        </div>
      )}

      {/* LEFT PANEL */}
      <div className="wr-panel left" style={{ '--pc': t1Color, borderRight:`1px solid ${t1Color}22` }}>
        <PlayerPanel
          player={team1} playerName={t1Name} playerColor={t1Color}
          bey={bey1}
          stamina={battleState.stamina1} spin={battleState.spin1} stability={battleState.stability1}
          deck={deck1} usedBlades={used1} activeBey={active1}
          side="left"
        />
      </div>

      {/* RIGHT PANEL */}
      <div className="wr-panel right" style={{ '--pc': t2Color, borderLeft:`1px solid ${t2Color}22` }}>
        <PlayerPanel
          player={team2} playerName={t2Name} playerColor={t2Color}
          bey={bey2}
          stamina={battleState.stamina2} spin={battleState.spin2} stability={battleState.stability2}
          deck={deck2} usedBlades={used2} activeBey={active2}
          side="right"
        />
      </div>
    </div>
  );
};

// ====================================================================
// PLAYER PANEL
// ====================================================================
function PlayerPanel({ player, playerName, playerColor, bey, stamina, spin, stability, deck, usedBlades, activeBey, side }) {
  const fullBodyUrl = player.fullBodyUrl || player.photoUrl;
  const country     = player.country || '🌍';
  const tier        = player.tier || 'PRO';
  const ranking     = player.ranking || player.currentRanking || player.bbpRanking || 99;
  const tierColor   = tierColors[tier] || '#10B981';
  const isRight     = side === 'right';

  // Build display name
  const displayName = playerName.split('"')[1] || playerName.split(' ').slice(0, 2).join(' ');

  // Deck tokens — match by name to determine status
  const usedNames = (usedBlades || []).map(b => b?.name);
  const activeName = activeBey?.name;

  return (
    <>
      {/* ── SEÇÃO 1: IDENTIDADE ─────────────────────────────────────── */}
      <div className="wr-section" style={{ borderLeft: isRight ? 'none' : `3px solid ${playerColor}`, borderRight: isRight ? `3px solid ${playerColor}` : 'none' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, flexDirection: isRight ? 'row-reverse' : 'row' }}>
          {/* foto */}
          <div style={{ width:72, height:72, borderRadius:10, border:`2px solid ${playerColor}`, overflow:'hidden', flexShrink:0, boxShadow:`0 0 16px ${playerColor}55`, background:'rgba(0,0,0,0.8)' }}>
            {fullBodyUrl
              ? <img src={fullBodyUrl} alt={playerName} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top center' }} />
              : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Black Ops One,cursive', fontSize:28, color:playerColor }}>{playerName.charAt(0)}</div>
            }
          </div>
          {/* info */}
          <div style={{ flex:1, minWidth:0, textAlign: isRight ? 'right' : 'left' }}>
            <div style={{ fontFamily:'Black Ops One,cursive', fontSize:17, lineHeight:1.1, color:'#fff', textShadow:`0 0 10px ${playerColor}44` }}>
              {displayName}
            </div>
            <div style={{ fontFamily:'Orbitron,monospace', fontSize:11, letterSpacing:'.1em', color:'rgba(255,255,255,0.45)', marginTop:3 }}>
              {country.split(' ')[0]} {country.split(' ').slice(1).join(' ')}
            </div>
            <div style={{ display:'flex', gap:5, marginTop:7, justifyContent: isRight ? 'flex-end' : 'flex-start', flexWrap:'wrap' }}>
              <span className="wr-badge" style={{ color:tierColor, borderColor:`${tierColor}55` }}>{tier}</span>
              <span className="wr-badge" style={{ color:playerColor, borderColor:`${playerColor}50` }}>{bey.type || 'BALANCE'}</span>
              <span className="wr-badge" style={{ color:'#ffd700', borderColor:'rgba(255,215,0,0.4)' }}>
                <Medal style={{ display:'inline', width:11, height:11, marginRight:3, verticalAlign:'middle' }} />#{ranking}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SEÇÃO 2: BATTLE STATUS ──────────────────────────────────── */}
      <div className="wr-section">
        <div className="wr-label"><Activity style={{ width:12, height:12 }} />BATTLE STATUS</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[
            { k:'HP', val:stamina,    color: stamina  > 50 ? '#10b981' : stamina  > 20 ? '#f59e0b' : '#ef4444', icon:'❤' },
            { k:'SP', val:spin,       color: spin     > 50 ? '#3b82f6' : spin     > 20 ? '#f59e0b' : '#ef4444', icon:'↺' },
            { k:'ST', val:stability,  color: stability> 50 ? '#a855f7' : stability> 20 ? '#f59e0b' : '#ef4444', icon:'⚡' },
          ].map(({ k, val, color, icon }) => (
            <div key={k} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:5, width:36 }}>
                <span style={{ fontSize:12, color }}>{icon}</span>
                <span style={{ fontFamily:'Orbitron,monospace', fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.6)' }}>{k}</span>
              </div>
              <div style={{ flex:1 }}>
                <div className="wr-bar-track">
                  <div className="wr-bar-fill" style={{ width:`${Math.max(0, Math.min(100, val))}%`, background:color, boxShadow:`0 0 8px ${color}` }} />
                </div>
              </div>
              <span style={{ fontFamily:'Orbitron,monospace', fontSize:12, fontWeight:700, color, width:30, textAlign:'right' }}>
                {Math.round(val)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── SEÇÃO 3: BEY STATS COMPLETOS ────────────────────────────── */}
      <div className="wr-section">
        <div className="wr-label"><Zap style={{ width:12, height:12 }} />BEYBLADE STATS — {(bey.signatureName || bey.name || '').substring(0,14).toUpperCase()}</div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {STAT_KEYS.map(key => {
            let breakdown = { base:0, parts:0, blader:0, total:0 };
            try { breakdown = calculateStatBreakdown(bey, key); } catch(e) {}
            // fallback to effectiveStats
            if (!breakdown.total) {
              breakdown.total = bey.effectiveStats?.[key] || bey.stats?.[key] || 0;
            }
            const color = statColor(key);
            const pct   = Math.min(100, (breakdown.total / STAT_MAX[key]) * 100);
            return (
              <div key={key}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ fontSize:12, color, width:13 }}>{statIcon(key)}</span>
                    <span style={{ fontFamily:'Orbitron,monospace', fontSize:9, letterSpacing:'.12em', color:'rgba(255,255,255,0.5)' }}>{statLabel(key)}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    {/* breakdown mini: base + parts + blader */}
                    {breakdown.parts > 0 && (
                      <span style={{ fontFamily:'Orbitron,monospace', fontSize:8, color:'rgba(255,255,255,0.3)' }}>
                        {breakdown.base}<span style={{ color:'#a855f7' }}>+{breakdown.parts}</span>
                        {breakdown.blader > 0 && <span style={{ color:'#ffd700' }}>+{breakdown.blader}</span>}
                      </span>
                    )}
                    <span style={{ fontFamily:'Orbitron,monospace', fontSize:13, fontWeight:900, color }}>{breakdown.total}</span>
                  </div>
                </div>
                <div className="wr-bar-track">
                  <div className="wr-bar-fill" style={{ width:`${pct}%`, background:`linear-gradient(90deg, ${color}88, ${color})`, boxShadow:`0 0 5px ${color}88` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SEÇÃO 4: DECK ───────────────────────────────────────────── */}
      <div className="wr-section" style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
        <div className="wr-label"><Star style={{ width:12, height:12 }} />DECK — {usedBlades?.length || 0}/{deck.length || 5} USADOS</div>
        <div style={{ display:'flex', justifyContent:'space-around', alignItems:'center', padding:'6px 0' }}>
          {(deck.length > 0 ? deck : Array(5).fill(null)).map((deckBey, idx) => {
            const bname    = deckBey?.name;
            const isActive = bname && bname === activeName;
            const isUsed   = bname && usedNames.includes(bname);
            // A used bey that is active is the current round's bey — not defeated yet
            const isDefeated = isUsed && !isActive;
            // won = used in previous round and team won that round — we don't have per-round data easily, so let's simplify:
            // "used and not active" = defeated (for visual clarity)
            const bcolor   = deckBey?.colors?.[0] || deckBey?.color || playerColor;
            const shortName = (deckBey?.signatureName || deckBey?.name || `B${idx+1}`).substring(0,3).toUpperCase();

            return (
              <div key={idx} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                <div
                  className={`wr-deck-token${isActive ? ' active' : isDefeated ? ' defeated' : ''}`}
                  style={{
                    background: isDefeated ? 'rgba(255,255,255,0.06)' : isActive ? `${bcolor}40` : `${bcolor}18`,
                    border: isDefeated ? '1px solid rgba(255,255,255,0.12)' : isActive ? `2px solid ${bcolor}` : `1px dashed ${bcolor}66`,
                    color: bcolor,
                    '--pc': bcolor,
                  }}
                >
                  <span style={{ fontSize:10, fontWeight:900, opacity: isDefeated ? 0.4 : 1 }}>{shortName}</span>
                  {/* overlay markers */}
                  {isDefeated && (
                    <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, color:'#ef4444', fontWeight:900, textShadow:'0 0 8px #ef4444' }}>✕</div>
                  )}
                  {!isActive && !isDefeated && bname && (
                    // available
                    null
                  )}
                  {isActive && (
                    <div style={{ position:'absolute', bottom:-10, left:'50%', transform:'translateX(-50%)', width:5, height:5, borderRadius:'50%', background:bcolor, boxShadow:`0 0 8px ${bcolor}` }} />
                  )}
                </div>
                <span style={{ fontFamily:'Orbitron,monospace', fontSize:8, color: isActive ? bcolor : isDefeated ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.4)', textShadow: isActive ? `0 0 8px ${bcolor}` : 'none', textAlign:'center', maxWidth:44, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {shortName}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SEÇÃO 5: PARTS ──────────────────────────────────────────── */}
      <div className="wr-section" style={{ borderBottom:'none' }}>
        <div className="wr-label"><Shield style={{ width:12, height:12 }} />PARTS</div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {[
            { label:'LAYER',  name: bey.layer?.name,  color:'#ef4444' },
            { label:'DISC',   name: bey.disc?.name,   color:'#a855f7' },
            { label:'DRIVER', name: bey.driver?.name, color:'#3b82f6' },
          ].map(({ label, name, color }) => name ? (
            <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontFamily:'Orbitron,monospace', fontSize:9, letterSpacing:'.12em', color:'rgba(255,255,255,0.3)' }}>{label}</span>
              <span style={{ fontFamily:'Rajdhani,sans-serif', fontSize:14, fontWeight:700, color, textAlign:'right', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</span>
            </div>
          ) : null)}
        </div>
      </div>
    </>
  );
}

export default BattleHUD;
