import React from 'react';
import { PLAY_STYLES } from '../../domain/players/styles.js';
import { SCORE_LABELS } from '../../core/constants.js';
import ThinBar from './ThinBar.jsx';
import MomentumBar from './MomentumBar.jsx';

export default function StyleCard({ player, isServer, flash }) {
  if (!player) return null;
  const style = PLAY_STYLES[player.styleId]; if (!style) return null;
  const sc    = s => SCORE_LABELS[Math.min(s ?? 0, 4)];
  const mom   = player.ctx?.momentum ?? 0.5;
  const stam  = player.stamina ?? 1.0;
  const stamColor = stam > 0.6 ? '#00FF88' : stam > 0.32 ? '#FFD700' : '#FF4444';
  const isFlashing = flash?.playerIdx === player.id;
  const flashAnim  = isFlashing
    ? (flash.type === 'SET' ? 'sFlash 0.75s ease' : 'gFlash 0.5s ease')
    : 'none';

  return (
    <div style={{
      flex: 1, padding: '8px 10px', background: 'rgba(0,0,0,0.3)', borderRadius: 6,
      border: `1px solid ${isFlashing ? player.color + '88' : player.color + '22'}`,
      transition: 'border-color 0.3s',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap: 6, marginBottom: 4 }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background: player.color, boxShadow:`0 0 8px ${player.color}` }}/>
        <span style={{ fontSize:10, fontWeight:700, color: player.color, letterSpacing:1 }}>{player.name}</span>
        {isServer && <span style={{ fontSize:7, color:'#FFD700', letterSpacing:1, marginLeft:'auto' }}>● SAQUE</span>}
      </div>
      <div style={{ display:'flex', gap:4, alignItems:'center', marginBottom:5 }}>
        <span style={{ fontSize:13 }}>{style.icon}</span>
        <div>
          <div style={{ fontSize:8, fontWeight:700, color:'#c8d4e0', letterSpacing:1 }}>{style.label}</div>
          <div style={{ fontSize:7, color:'#3a5060' }}>{style.refs}</div>
        </div>
      </div>
      <div style={{ display:'flex', gap:10, marginBottom:6, animation: flashAnim }}>
        {[['SETS',player.sets,'#fff',26],['GAMES',player.games,'#7ab4ff',20],['PTO',sc(player.score),player.color,24]].map(([l,v,c,fs]) => (
          <div key={l} style={{ textAlign:'center' }}>
            <div style={{ fontSize:7, color:'#3a5060', letterSpacing:1 }}>{l}</div>
            <div style={{ fontSize:fs, fontWeight:900, color:c, lineHeight:1 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ marginBottom:4 }}><MomentumBar val={mom} color={player.color} /></div>
      <div style={{ marginBottom:4 }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:8, color:'#3a5060', marginBottom:1 }}>
          <span>Stamina</span>
          <span style={{ color: stamColor }}>{Math.round(stam * 100)}%</span>
        </div>
        <div style={{ height:3, background:'#0a1020', borderRadius:2, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${stam*100}%`, background: stamColor,
                        borderRadius:2, transition:'width 0.3s, background 0.3s',
                        boxShadow: stam < 0.35 ? `0 0 6px ${stamColor}` : 'none' }} />
        </div>
      </div>
      <div style={{ marginBottom:2 }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:8, color:'#3a5060', marginBottom:1 }}>
          <span>Agressividade</span>
          <span style={{ color:'#7ab4ff' }}>{Math.round(((style.aggression[0]+style.aggression[1])/2)*100)}%</span>
        </div>
        <ThinBar val={(style.aggression[0]+style.aggression[1])/2} color={player.color} />
      </div>
      <div style={{ marginBottom:4 }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:8, color:'#3a5060', marginBottom:1 }}>
          <span>Defesa</span>
          <span style={{ color:'#7ab4ff' }}>{Math.round(((style.defense[0]+style.defense[1])/2)*100)}%</span>
        </div>
        <ThinBar val={(style.defense[0]+style.defense[1])/2} color="#00D4FF" />
      </div>
      <div style={{ display:'flex', gap:6, fontSize:8, color:'#3a5060', flexWrap:'wrap' }}>
        <span>{player.shotCount} 🎾</span>
        <span style={{ color:'#00ff88' }}>{player.winnerCount} ✓</span>
        <span style={{ color:'#ff4444' }}>{player.errorCount} ✗</span>
        {player.ctx?.seriesWon >= 2 && <span style={{ color:'#FFD700' }}>ðŸ”¥{player.ctx.seriesWon}</span>}
        {player.ctx?.underPressure  && <span style={{ color:'#FF6B35' }}>⚡</span>}
        {player.ctx?.lobsReceived > 0 && <span style={{ color:'#AA44FF' }}>ðŸ³Ã—{player.ctx.lobsReceived}</span>}
        {stam <= 0.32 && <span style={{ color:'#FF4444' }}>ðŸ˜¤</span>}
      </div>
    </div>
  );
}

