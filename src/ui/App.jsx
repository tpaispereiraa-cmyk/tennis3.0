import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PLAY_STYLES }                                      from '../domain/players/styles.js';
import { GameState, DT, COURT, CL, CW, TRAIL_LEN, SCORE_LABELS, CANVAS_PAD_Y, CANVAS_PAD_X } from '../core/constants.js';
import { mag3 }                                             from '../core/math.js';
import { gameTick, initGameState }                          from '../game.jsx';
import { toggleSound, isSoundOn, updateCrowd }             from '../systems/audio/sound.js';
import MatchOverScreen                                      from './game/MatchOverScreen.jsx';
import HomeScreen                                           from './game/HomeScreen.jsx';
import DefinitiveME                                          from './game/NEWME1.0.jsx';
import DebugLog                                            from './game/DebugLog.jsx';
import TracePanel                                          from './game/TracePanel.jsx';

const STYLE_TAG = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700;900&family=Barlow:wght@400;600;700&family=Space+Mono:wght@400;700&display=swap');
@keyframes gFlash{0%,100%{transform:scale(1)}45%{transform:scale(1.45);filter:brightness(2.2)}}
@keyframes sFlash{0%,100%{transform:scale(1)}45%{transform:scale(1.75);filter:brightness(2.8)}}
@keyframes pulseWin{0%,100%{opacity:1}50%{opacity:0.5}}
@keyframes shake{0%{transform:translate(0,0)}15%{transform:translate(-3px,1px)}30%{transform:translate(3px,-1px)}45%{transform:translate(-2px,2px)}60%{transform:translate(2px,-1px)}80%{transform:translate(-1px,1px)}100%{transform:translate(0,0)}}
@keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
@keyframes hitLabelFloat{
  0%  {opacity:0;transform:translateY(8px) scale(0.88)}
  10% {opacity:1;transform:translateY(0px)  scale(1.04)}
  18% {transform:translateY(-2px) scale(1)}
  72% {opacity:1;transform:translateY(-18px)}
  100%{opacity:0;transform:translateY(-32px)}
}
*{box-sizing:border-box}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.18);border-radius:2px}
::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.32)}
.glass-panel{
  background:linear-gradient(180deg,rgba(8,14,24,0.84),rgba(4,8,16,0.92));
  border:1px solid rgba(255,255,255,0.10);
  border-top:1px solid rgba(212,86,30,0.24);
  backdrop-filter:blur(16px);
  -webkit-backdrop-filter:blur(16px);
  border-radius:12px;
  box-shadow:0 16px 42px rgba(0,0,0,0.4);
  animation:fadeIn 0.3s ease;
}
`;

// DefinitiveME usa canvas responsivo full-screen

function Bar({ val, color, height = 3 }) {
  return (
    <div style={{ height, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${Math.round(val * 100)}%`,
        background: color, borderRadius: 2, transition: 'width 0.4s',
      }} />
    </div>
  );
}

function StatLine({ label, val, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 0.5 }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color, lineHeight: 1 }}>{Math.round(val * 100)}%</span>
      </div>
      <Bar val={val} color={color} />
    </div>
  );
}

// ── Pixel portrait (mantido para fichas/UI) ──────────────────────
const PORTRAIT_GRID = [
  [0,1,1,1,1,1,1,1,0,0],
  [0,1,0,0,0,0,0,1,0,0],
  [0,0,2,2,2,2,2,0,0,0],
  [0,0,2,3,2,2,3,2,0,0],
  [0,0,2,2,2,2,2,2,0,0],
  [0,0,2,2,4,2,2,2,0,0],
  [0,0,2,5,2,2,5,2,0,0],
  [0,0,2,0,5,5,5,2,0,0],
  [0,0,0,2,2,2,2,0,0,0],
  [0,6,6,6,6,6,6,6,6,0],
];
const PORTRAIT_STYLE = {
  BIG_SERVER:    { hair: '#1a0a00', skin: '#d4956a' },
  AGG_BASELINER: { hair: '#8b2500', skin: '#c07840' },
  CTR_PUNCHER:   { hair: '#0a0a20', skin: '#ecc8a0' },
  ALL_COURT:     { hair: '#3a2000', skin: '#d4a878' },
  SRV_VOL:       { hair: '#d8c060', skin: '#b87050' },
  RETRIEVER:     { hair: '#c03020', skin: '#e8c090' },
};
function PixelPortrait({ player, size = 40 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx2 = canvas.getContext('2d');
    const P   = 4;
    const cfg = PORTRAIT_STYLE[player?.styleId] || { hair: '#2a1a0a', skin: '#d4a070' };
    const jersey = player?.color || '#ffffff';
    const palette = [
      'transparent', cfg.hair, cfg.skin, '#111111',
      'rgba(0,0,0,0.20)', '#8b3a20', jersey,
    ];
    ctx2.clearRect(0, 0, 40, 40);
    ctx2.fillStyle = jersey + '18';
    ctx2.fillRect(0, 0, 40, 40);
    for (let row = 0; row < PORTRAIT_GRID.length; row++) {
      for (let col = 0; col < PORTRAIT_GRID[row].length; col++) {
        const v = PORTRAIT_GRID[row][col];
        if (!v) continue;
        ctx2.fillStyle = palette[v];
        ctx2.fillRect(col * P, row * P, P, P);
      }
    }
    ctx2.fillStyle = 'rgba(255,255,255,0.75)';
    ctx2.fillRect(3 * P + 1, 3 * P + 1, 1, 1);
    ctx2.fillRect(6 * P + 1, 3 * P + 1, 1, 1);
    ctx2.strokeStyle = jersey + '50';
    ctx2.lineWidth = 1;
    ctx2.strokeRect(0.5, 0.5, 39, 39);
  }, [player?.color, player?.styleId]);

  return (
    <canvas
      ref={canvasRef} width={40} height={40}
      style={{ imageRendering: 'pixelated', width: size, height: size, flexShrink: 0 }}
    />
  );
}

function PlayerOverlayCard({ player, isServer, flash, side, gs }) {
  if (!player) return null;
  const style     = PLAY_STYLES[player.styleId]; if (!style) return null;
  const inTB      = gs?.inTiebreak;
  const sc        = s => inTB
    ? (gs.tbScore?.[player.id] ?? 0)   // mostra pontos do TB (0,1,2...)
    : SCORE_LABELS[Math.min(s ?? 0, 4)];
  const ptoLabel  = inTB ? 'TB' : 'PTO';
  const mom       = player.ctx?.momentum ?? 0.5;
  const stam      = player.stamina ?? 1.0;
  const stamColor = stam > 0.6 ? '#00FF88' : stam > 0.32 ? '#FFD700' : '#FF4444';
  const isFlash   = flash?.playerIdx === player.id;
  const flashAnim = isFlash ? (flash.type === 'SET' ? 'sFlash 0.75s ease' : 'gFlash 0.5s ease') : 'none';

  const posStyle = side === 'left'
    ? { position: 'absolute', top: 18, left: 18, width: 224, zIndex: 10 }
    : { position: 'absolute', top: 18, right: 18, width: 224, zIndex: 10 };

  return (
    <div
      className="glass-panel"
      style={{
        ...posStyle,
        padding: '13px 15px',
        display: 'flex', flexDirection: 'column', gap: 9,
        border: isFlash ? `1px solid ${player.color}60` : '1px solid rgba(255,255,255,0.07)',
        boxShadow: isFlash ? `0 0 24px ${player.color}20` : '0 4px 32px rgba(0,0,0,0.5)',
        transition: 'border-color 0.3s, box-shadow 0.3s',
        fontFamily: "'Barlow Condensed', 'Courier New', monospace",
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <PixelPortrait player={player} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: player.color, letterSpacing: 0.5,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{player.name}</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.26)', marginTop: 1 }}>
            {style.icon} {style.label}
          </div>
          {isServer && (
            <span style={{
              fontSize: 8, color: '#FFD700', letterSpacing: 0.8,
              border: '1px solid rgba(255,215,0,0.25)', borderRadius: 3, padding: '1px 5px',
              display: 'inline-block', marginTop: 2,
            }}>● SAQUE</span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', animation: flashAnim }}>
        {[['SETS', player.sets, '#c8d4e0', 22],
          ['GAMES', player.games, '#7ab4ff', 18],
          [ptoLabel, sc(player.score), player.color, 26]].map(([l, v, c, fs]) => (
          <div key={l} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 6, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>{l}</div>
            <div style={{
              fontSize: fs, fontWeight: 900, color: c, lineHeight: 1.1,
              fontFamily: "'Bebas Neue', 'Courier New', monospace",
            }}>{v}</div>
          </div>
        ))}
      </div>

      <StatLine label="MOMENTUM" val={mom} color={player.color} />
      <StatLine label="STAMINA"  val={stam} color={stamColor} />
      {[['AGRESSIVIDADE', (style.aggression[0]+style.aggression[1])/2, player.color],
        ['DEFESA',        (style.defense[0]+style.defense[1])/2,     '#00D4FF']
      ].map(([lbl, val, clr]) => (
        <StatLine key={lbl} label={lbl} val={val} color={clr} />
      ))}

      <div style={{
        display: 'flex', gap: 8, fontSize: 9,
        borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 7, flexWrap: 'wrap',
      }}>
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>🎾 <span style={{ color: '#7ab4ff' }}>{player.shotCount}</span></span>
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>✓ <span style={{ color: '#00FF88' }}>{player.winnerCount}</span></span>
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>✗ <span style={{ color: '#FF4444' }}>{player.errorCount}</span></span>
        {player.ctx?.seriesWon >= 2 && <span style={{ color: '#FFD700' }}>🔥{player.ctx.seriesWon}</span>}
        {player.ctx?.underPressure  && <span style={{ color: '#FF6B35' }}>⚡</span>}
        {stam <= 0.32 && <span style={{ color: '#FF4444', animation: 'pulseWin 1s infinite' }}>😤</span>}
      </div>
    </div>
  );
}

function BallPill({ snap }) {
  const bz       = snap?.ballZ ?? 0;
  const aboveNet = bz > COURT.netHeight;
  return (
    <div className="glass-panel" style={{
      padding: '10px 22px',
      display: 'flex', gap: 20, alignItems: 'center',
      fontFamily: "'Barlow Condensed', 'Courier New', monospace",
    }}>
      {[
        ['RALLY',     snap?.rally ?? 0,               '#FFD700'],
        ['MAX RALLY', snap?.maxRally ?? 0,             'rgba(255,255,255,0.35)'],
        ['ALTURA',    bz.toFixed(2) + 'm',             aboveNet ? '#00FF88' : '#FF4444'],
        ['VEL.',      (snap?.ballSpeed ?? 0) + ' km/h','rgba(255,255,255,0.7)'],
      ].map(([lbl, val, clr]) => (
        <div key={lbl} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <span style={{ fontSize: 7, letterSpacing: 2, color: 'rgba(255,255,255,0.2)' }}>{lbl}</span>
          <span style={{
            fontSize: 24, fontWeight: 700, color: clr, lineHeight: 1,
            fontFamily: "'Bebas Neue', 'Courier New', monospace",
          }}>{val}</span>
        </div>
      ))}
    </div>
  );
}

function ControlsPill({ simSpeed, setSimSpeed, speedRef, soundOn, setSoundOn }) {
  return (
    <div className="glass-panel" style={{
      padding: '10px 14px',
      display: 'flex', flexDirection: 'column', gap: 6,
      fontFamily: "'Barlow Condensed', 'Courier New', monospace",
    }}>
      <div style={{ fontSize: 7, letterSpacing: 2, color: 'rgba(255,255,255,0.2)' }}>VELOCIDADE</div>
      <div style={{ display: 'flex', gap: 3 }}>
        {[0.5, 1, 2, 4, 8, 16, 32].map(v => (
          <button key={v} onClick={() => { setSimSpeed(v); speedRef.current = v; }} style={{
            padding: '3px 8px', fontSize: 10, fontWeight: 700,
            background: simSpeed === v ? 'rgba(122,180,255,0.15)' : 'transparent',
            color:       simSpeed === v ? '#7ab4ff' : 'rgba(255,255,255,0.2)',
            border:     `1px solid ${simSpeed === v ? 'rgba(122,180,255,0.35)' : 'rgba(255,255,255,0.06)'}`,
            borderRadius: 4, cursor: 'pointer', transition: 'all 0.12s',
            fontFamily: "'Barlow Condensed', 'Courier New', monospace",
          }}>{v}x</button>
        ))}
      </div>
      <button onClick={async () => { const on = await toggleSound(); setSoundOn(on); }} style={{
        padding: '4px 0', fontSize: 9, fontWeight: 700, letterSpacing: 1,
        background: soundOn ? 'rgba(0,255,136,0.08)' : 'transparent',
        color:       soundOn ? '#00FF88' : 'rgba(255,255,255,0.2)',
        border:     `1px solid ${soundOn ? 'rgba(0,255,136,0.2)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 4, cursor: 'pointer',
        fontFamily: "'Barlow Condensed', 'Courier New', monospace",
      }}>{soundOn ? '🔊 SOM ON' : '🔇 SOM OFF'}</button>
    </div>
  );
}

function HitLabelPill({ hl }) {
  const qColor  = hl.quality > 0.58 ? '#00FF88' : hl.quality > 0.33 ? '#FFD700' : '#FF4444';
  const qPct    = Math.round(hl.quality * 100);
  const isBot   = hl.playerSide === 1;
  const qLabel  = hl.quality > 0.75 ? 'PERFEITO' : hl.quality > 0.48 ? 'BOM' : hl.quality > 0.33 ? 'RAZOÁVEL' : 'DIFÍCIL';
  const cornerStyle = isBot ? { left: 14, top: 240 } : { right: 14, top: 240 };

  return (
    <div style={{
      position: 'absolute', ...cornerStyle, zIndex: 20,
      pointerEvents: 'none',
      animation: 'hitLabelFloat 1.55s ease forwards',
      width: 168,
    }}>
      <div style={{
        background: 'rgba(4,8,18,0.88)',
        border: `1px solid ${hl.color}45`,
        borderLeft: `3px solid ${hl.color}`,
        borderRadius: 10, padding: '10px 14px 12px',
        backdropFilter: 'blur(14px)',
        boxShadow: `0 4px 24px rgba(0,0,0,0.6), 0 0 16px ${hl.color}12`,
        fontFamily: "'Barlow Condensed', 'Courier New', monospace",
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7 }}>
          <span style={{ fontSize: 11 }}>{hl.emoji}</span>
          <span style={{
            fontSize: 12, fontWeight: 700, color: hl.color, letterSpacing: 0.5,
            textShadow: `0 0 8px ${hl.color}80`,
          }}>{hl.label}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 8, letterSpacing: 1.5, color: 'rgba(255,255,255,0.3)' }}>PRECISÃO</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: qColor }}>{qPct}%</span>
          </div>
          <div style={{
            height: 6, background: 'rgba(255,255,255,0.06)',
            borderRadius: 3, overflow: 'hidden', position: 'relative',
          }}>
            {[25, 50, 75].map(tick => (
              <div key={tick} style={{
                position: 'absolute', left: `${tick}%`, top: 0, bottom: 0,
                width: 1, background: 'rgba(255,255,255,0.08)',
              }} />
            ))}
            <div style={{
              height: '100%', width: `${qPct}%`,
              background: `linear-gradient(90deg, ${qColor}99, ${qColor})`,
              borderRadius: 3, boxShadow: `0 0 6px ${qColor}80`,
              transition: 'width 0.1s',
            }} />
          </div>
          <div style={{ fontSize: 8, color: qColor, letterSpacing: 1, textAlign: 'right' }}>{qLabel}</div>
        </div>
      </div>
    </div>
  );
}

const HISTORY_LEN = 600; // ~5s at 120hz

export default function App() {
  const gsRef             = useRef(null);
  const trailRef          = useRef([]);
  const animRef           = useRef(null);
  const lastTRef          = useRef(null);
  const speedRef          = useRef(1);
  const flashTimerRef     = useRef(null);
  const screenFxRef       = useRef(null);
  const frameHistoryRef   = useRef([]); // ring buffer for Modo Caça Bug
  const bugSpeedSaveRef   = useRef(1);  // saves simSpeed before bug mode

  const [screen,    setScreen]    = useState('home');
  const [snap,      setSnap]      = useState(null);
  const [simSpeed,  setSimSpeed]  = useState(1);
  const [flash,     setFlash]     = useState(null);
  const [soundOn,   setSoundOn]   = useState(() => isSoundOn());
  const [screenFx,  setScreenFx]  = useState(null);
  const [hitLabels, setHitLabels] = useState([]);
  const [courtKey,  setCourtKey]  = useState('US_OPEN');
  const [bugMode,   setBugMode]   = useState(false);

  useEffect(() => {
    const el = document.createElement('style');
    el.setAttribute('data-te', '1');
    el.textContent = STYLE_TAG;
    document.head.appendChild(el);
    return () => document.querySelectorAll('[data-te]').forEach(n => n.remove());
  }, []);

  const restart = useCallback((keyA, keyB, cKey) => {
    gsRef.current = initGameState(null, null, keyA || null, keyB || null, cKey || courtKey);
    trailRef.current = []; lastTRef.current = null;
    frameHistoryRef.current = [];
    setSnap(null); setFlash(null);
  }, [courtKey]);

  const handleStartGame = useCallback((keyA, keyB, cKey = 'US_OPEN') => {
    setCourtKey(cKey);
    setScreen('game');
    setTimeout(() => restart(keyA, keyB, cKey), 50);
  }, [restart]);

  const handleSame = useCallback(() => {
    const p0 = snap?.players?.[0], p1 = snap?.players?.[1];
    if (p0 && p1) restart(p0.namedPlayerKey || null, p1.namedPlayerKey || null, courtKey);
  }, [snap, restart, courtKey]);

  useEffect(() => { speedRef.current = simSpeed; }, [simSpeed]);

  useEffect(() => {
    if (hitLabels.length === 0) return;
    const timer = setTimeout(() => {
      const now = Date.now();
      setHitLabels(prev => prev.filter(l => now - l.born < 1700));
    }, 1700);
    return () => clearTimeout(timer);
  }, [hitLabels]);

  useEffect(() => {
    if (screen !== 'game') return;
    let acc = 0, frame = 0;

    const loop = ts => {
      if (!lastTRef.current) lastTRef.current = ts;
      const wdt = Math.min((ts - lastTRef.current) / 1000, 0.05);
      lastTRef.current = ts;
      const gs = gsRef.current;
      if (!gs) { animRef.current = requestAnimationFrame(loop); return; }

      acc += wdt * speedRef.current;
      while (acc >= DT) {
        gameTick(gs, DT); acc -= DT;
        if (gs.ball.inFlight) {
          trailRef.current.push({ ...gs.ball.pos });
          if (trailRef.current.length > TRAIL_LEN) trailRef.current.shift();
        } else if (trailRef.current.length > 0) trailRef.current.shift();

        // ── Modo Caça Bug: ring buffer ────────────────────────────────────
        const hist = frameHistoryRef.current;
        hist.push({
          ts: Date.now(),
          frameIdx: (hist.length > 0 ? hist[hist.length - 1].frameIdx + 1 : 0),
          ball: {
            pos: { ...gs.ball.pos },
            vel: { ...gs.ball.vel },
            inFlight: gs.ball.inFlight,
            bounceCount: gs.ball.bounceCount,
            lastHitBy: gs.ball.lastHitBy,
            spin: { ...(gs.ball.spin || { x: 0, y: 0, z: 0 }) },
            lastShotType: gs.ball._lastShotType ?? gs.ball.lastShotType ?? null,
            lastShotMeta: gs.ball._lastShotMeta ? { ...gs.ball._lastShotMeta } : null,
            serveTargetY: gs.ball._serveTargetY ?? null,
            serveExitKmh: gs.ball._serveExitKmh ?? null,
          },
          players: gs.players.map(p => ({
            id: p.id, name: p.name, color: p.color,
            pos: { ...p.pos }, vel: { ...(p.vel || { x: 0, y: 0 }) },
            styleId: p.styleId, namedPlayerKey: p.namedPlayerKey,
            ctx: p.ctx ? {
              intent: p.ctx.intent ?? null,
              courtMode: p.ctx.courtMode ?? null,
              momentum: p.ctx.momentum ?? null,
              _momentumEWMA: p.ctx._momentumEWMA ?? null,
              underPressure: p.ctx.underPressure ?? null,
              rallyPressure: p.ctx.rallyPressure ?? null,
              lastShotType: p.ctx.lastShotType ?? null,
              netPhase: p.ctx.netPhase ?? null,
              _footingState: p.ctx._footingState ?? null,
              _postHitPause: p.ctx._postHitPause ?? null,
            } : null,
            stamina: p.stamina ?? null,
            shotCount: p.shotCount ?? 0,
            winnerCount: p.winnerCount ?? 0,
            errorCount: p.errorCount ?? 0,
            _arrivalMargin: p._arrivalMargin ?? null,
            _posLocked: p._posLocked ?? null,
            _stableTarget: p._stableTarget ? { ...p._stableTarget } : null,
            _postHitRecoveryTimer: p._postHitRecoveryTimer ?? null,
            _serveShortDetected: p._serveShortDetected ?? null,
            _readPauseFrames: p._readPauseFrames ?? null,
          })),
          trail: trailRef.current.map(t => ({ ...t })),
          rally: gs.rally,
          gameState: gs.gameState,
          ballSpeed: Math.round(Math.sqrt((gs.ball.vel.x||0)**2 + (gs.ball.vel.y||0)**2 + (gs.ball.vel.z||0)**2) * 3.6),
          // ── Shot Intent Overlay data ──────────────────────────────────────
          lastShotEvent: (() => {
            const evs = gs.debugEvents;
            if (!evs || evs.length === 0) return null;
            const ev = evs[evs.length - 1];
            return ev.type === 'SHOT_EVENT' ? { ...ev } : null;
          })(),
          lastBouncePos: gs.lastBouncePos ? { ...gs.lastBouncePos } : null,
          recentShotEvents: (gs.debugEvents ?? []).slice(-80).map(ev => ({ ...ev })),
          recentBounceLog: (gs.bounceLog ?? []).slice(-80).map(b => ({ ...b, launchMeta: b.launchMeta ? { ...b.launchMeta } : null })),
          liveAudit: gs.liveAuditSnap ? {
            ...gs.liveAuditSnap,
            counters: { ...(gs.liveAuditSnap.counters ?? {}) },
            health: { ...(gs.liveAuditSnap.health ?? {}) },
            players: (gs.liveAuditSnap.players ?? []).map(p => ({ ...p, shotCounts: { ...(p.shotCounts ?? {}) } })),
            recent: (gs.liveAuditSnap.recent ?? []).map(e => ({ ...e })),
            pinned: (gs.liveAuditSnap.pinned ?? []).map(e => ({ ...e })),
          } : null,
          courtMeta: gs.courtMeta ? { ...gs.courtMeta } : null,
          courtPhysics: gs.courtPhysics ? { ...gs.courtPhysics } : null,
          matchFeelTelemetry: (gs.matchFeelTelemetry ?? []).slice(-40).map(e => ({ ...e })),
          lastMatchFeelPoint: gs.lastMatchFeelPoint ? { ...gs.lastMatchFeelPoint } : null,
          lastMatchDirectorCue: gs.lastMatchDirectorCue ? { ...gs.lastMatchDirectorCue } : null,
          matchArcState: gs.matchArcState ? { ...gs.matchArcState } : null,
          matchStoryCapsules: (gs.matchStoryCapsules ?? []).slice(-40).map(e => ({ ...e })),
          lastMatchStoryCapsule: gs.lastMatchStoryCapsule ? { ...gs.lastMatchStoryCapsule } : null,
          matchNarrativeDossier: gs.matchNarrativeDossier ? { ...gs.matchNarrativeDossier } : null,
          score: gs.players?.map(p => ({ sets: p.sets, games: p.games, score: p.score })) ?? [],
          server: gs.server,
          totalPoints: gs.totalPoints,
          isFirstBounce: gs.isFirstBounce,
          serveBounced: gs.serveBounced,
          receiverTouched: gs.receiverTouched,
        });
        if (hist.length > HISTORY_LEN) hist.shift();
        // ─────────────────────────────────────────────────────────────────

        if (gs.gameState === GameState.GAME_OVER) {
          // Restaurar attrs penalizados por lesão em campo
          // A penalidade era temporária — o jogador sai da partida com seus attrs reais
          for (const p of gs.players) {
            if (p._attrsBeforeInjury) {
              p.attrs = { ...p._attrsBeforeInjury };
              p._attrsBeforeInjury = null;
            }
          }
          break;
        }
      }

      // Rendering delegado ao DefinitiveME (canvas próprio, loop rAF independente)

      if (++frame % 6 === 0) {
        if (gs.pendingFlash) {
          const pf = { ...gs.pendingFlash }; gs.pendingFlash = null;
          if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
          setFlash(pf);
          flashTimerRef.current = setTimeout(() => setFlash(null), 900);
        }
        updateCrowd(gs.rally);

        if (gs.pendingScreenFx) {
          const fx = gs.pendingScreenFx; gs.pendingScreenFx = null;
          if (screenFxRef.current) clearTimeout(screenFxRef.current);
          setScreenFx(fx);
          screenFxRef.current = setTimeout(() => setScreenFx(null), fx.dur || 600);
        }

        setSnap({
          players: gs.players.map(p => ({
            ...p, styleData: { ...p.styleData }, ctx: { ...p.ctx },
            stamina: p.stamina, namedPlayerKey: p.namedPlayerKey,
            setsHistory: p.setsHistory,
            _heatGrid: p._heatGrid ? new Uint16Array(p._heatGrid) : null,
          })),
          gameState: gs.gameState, rally: gs.rally, maxRally: gs.maxRally,
          totalPoints: gs.totalPoints, server: gs.server,
          ballZ: gs.ball.pos.z, ballSpeed: Math.round(mag3(gs.ball.vel) * 3.6),
          courtMeta: gs.courtMeta,
          bounceLog: gs.bounceLog ? [...gs.bounceLog] : [],
          debugEvents: gs.debugEvents ? [...gs.debugEvents] : [],
          matchFeelTelemetry: (gs.matchFeelTelemetry ?? []).slice(-40).map(e => ({ ...e })),
          lastMatchFeelPoint: gs.lastMatchFeelPoint ? { ...gs.lastMatchFeelPoint } : null,
          lastMatchDirectorCue: gs.lastMatchDirectorCue ? { ...gs.lastMatchDirectorCue } : null,
          matchArcState: gs.matchArcState ? { ...gs.matchArcState } : null,
          matchStoryCapsules: (gs.matchStoryCapsules ?? []).slice(-40).map(e => ({ ...e })),
          lastMatchStoryCapsule: gs.lastMatchStoryCapsule ? { ...gs.lastMatchStoryCapsule } : null,
          matchNarrativeDossier: gs.matchNarrativeDossier ? { ...gs.matchNarrativeDossier } : null,
          trace: gs.trace ?? null,
          inTiebreak: gs.inTiebreak ?? false,
          tbScore: gs.tbScore ? [...gs.tbScore] : [0, 0],
          heat: gs.heat ? { ...gs.heat } : null,
          liveAudit: gs.liveAuditSnap ? {
            ...gs.liveAuditSnap,
            counters: { ...(gs.liveAuditSnap.counters ?? {}) },
            health: { ...(gs.liveAuditSnap.health ?? {}) },
            players: (gs.liveAuditSnap.players ?? []).map(p => ({ ...p, shotCounts: { ...(p.shotCounts ?? {}) } })),
            recent: (gs.liveAuditSnap.recent ?? []).map(e => ({ ...e })),
            pinned: (gs.liveAuditSnap.pinned ?? []).map(e => ({ ...e })),
          } : null,
        });
      }
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [screen]);

  if (screen === 'home') {
    return (
      <div style={{ width: '100vw', height: '100vh', overflow: 'auto' }}>
        <HomeScreen onStartGame={handleStartGame} />
      </div>
    );
  }

  const isOver = snap?.gameState === GameState.GAME_OVER;
  const p0 = snap?.players?.[0];
  const p1 = snap?.players?.[1];

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#050505' }}>
      {isOver ? (
        <div style={{ width: '100%', height: '100%', background: '#05080e', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <MatchOverScreen p0={p0} p1={p1}
            maxRally={snap?.maxRally ?? 0} totalPoints={snap?.totalPoints ?? 0}
            bounceLog={snap?.bounceLog ?? []}
            debugEvents={snap?.debugEvents ?? []}
            heat={snap?.heat ?? null}
            matchNarrativeDossier={snap?.matchNarrativeDossier ?? null}
            matchStoryCapsules={snap?.matchStoryCapsules ?? []}
            courtMeta={snap?.courtMeta ?? null}
            onNew={() => setScreen('home')} onSame={handleSame} />
        </div>
      ) : (
        <DefinitiveME
          gsRef={gsRef}
          trailRef={trailRef}
          snap={snap}
          onMenu={() => setScreen('home')}
          simSpeed={simSpeed}
          setSimSpeed={setSimSpeed}
          speedRef={speedRef}
          frameHistoryRef={frameHistoryRef}
          bugMode={bugMode}
          setBugMode={setBugMode}
          bugSpeedSaveRef={bugSpeedSaveRef}
        />
      )}
      <DebugLog gsRef={gsRef} />
      <TracePanel gsRef={gsRef} />
    </div>
  );
}


