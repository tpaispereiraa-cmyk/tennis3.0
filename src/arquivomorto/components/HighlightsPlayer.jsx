import React, { useEffect, useMemo, useRef } from 'react';
import { CL, CW, CANVAS_PAD_X, CANVAS_PAD_Y } from '../../core/constants.js';
import { renderPixelFrame } from '../pixel/pixelRenderer.js';

const SCORE_LABELS = ['0', '15', '30', '40', 'Ad'];

function resizeCanvasToViewport(canvas) {
  if (!canvas) return;
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const rect = canvas.getBoundingClientRect();
  const nextW = Math.max(1, Math.round(rect.width * dpr));
  const nextH = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== nextW || canvas.height !== nextH) {
    canvas.width = nextW;
    canvas.height = nextH;
  }
}

function buildRenderableGs(gsRefValue, snap) {
  const base = gsRefValue ?? {};
  return {
    ...base,
    players: snap?.players ?? base.players ?? [],
    ball: snap?.ball ?? base.ball ?? { pos: { x: 0, y: 0, z: 0 }, vel: { x: 0, y: 0, z: 0 }, inFlight: false },
    gameState: snap?.gameState ?? base.gameState,
    rally: snap?.rally ?? base.rally ?? 0,
    server: snap?.server ?? base.server ?? 0,
    receiver: base.receiver ?? 1,
    serveLeft: base.serveLeft ?? true,
    courtVisual: base.courtVisual,
    courtMeta: snap?.courtMeta ?? base.courtMeta,
    inTiebreak: snap?.inTiebreak ?? base.inTiebreak ?? false,
    tbScore: snap?.tbScore ?? base.tbScore ?? [0, 0],
    pointHistory: snap?.pointHistory ?? base.pointHistory ?? [],
    heat: snap?.heat ?? base.heat ?? null,
    bounceLog: snap?.bounceLog ?? base.bounceLog ?? [],
    vfxQueue: [],
    pendingHitLabels: [],
    pendingOutcomeLabels: [],
    pendingFlash: null,
    pendingScreenFx: null,
    debugEvents: [],
    trace: null,
    environment: base.environment ?? null,
    _bounce: typeof base._bounce === 'function' ? base._bounce : (() => {}),
  };
}

export default function HighlightsPlayer({
  gsRef,
  snap,
  trailRef,
  playerA,
  playerB,
  clip,
  clipIdx = 0,
  clipCount = 0,
  mode = 'highlights',
}) {
  const canvasRef = useRef(null);

  const renderGs = useMemo(
    () => buildRenderableGs(gsRef?.current, snap),
    [gsRef, snap]
  );

  const scoreline = useMemo(() => {
    const p0 = snap?.players?.[0];
    const p1 = snap?.players?.[1];
    if (!p0 || !p1) return '—';
    if (snap?.inTiebreak) return `TB ${snap.tbScore?.[0] ?? 0}-${snap.tbScore?.[1] ?? 0}`;
    const pt0 = SCORE_LABELS[p0.score] ?? p0.score ?? '0';
    const pt1 = SCORE_LABELS[p1.score] ?? p1.score ?? '0';
    return `${p0.games ?? 0}-${p1.games ?? 0} (${pt0}-${pt1})`;
  }, [snap]);

  const setsline = useMemo(() => {
    const p0 = snap?.players?.[0];
    const p1 = snap?.players?.[1];
    if (!p0 || !p1) return '0-0';
    return `${p0.sets ?? 0}-${p1.sets ?? 0}`;
  }, [snap]);

  const modeLabel = mode === 'compact' ? 'Compacto' : mode === 'extended' ? 'Extendido' : 'Highlights';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !renderGs?.players?.length || !renderGs?.ball?.pos) return;

    resizeCanvasToViewport(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const worldW = CW + Math.max(56, CANVAS_PAD_X * 0.38);
    const worldH = CL + Math.max(84, CANVAS_PAD_Y * 0.42);
    const fitScale = Math.min(W / worldW, H / worldH) * 1.08;
    const offsetX = (W - worldW * fitScale) / 2;
    const offsetY = (H - worldH * fitScale) / 2 + H * 0.01;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fitScale, fitScale);
    renderPixelFrame(ctx, renderGs, trailRef?.current ?? [], worldW, worldH);
    ctx.restore();
  }, [renderGs, trailRef, snap]);

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      background: 'radial-gradient(circle at 50% 38%, rgba(24,44,86,.22), transparent 34%), linear-gradient(180deg, #060A12 0%, #05070B 45%, #04060A 100%)',
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.015) 1px, transparent 1px)',
        backgroundSize: '52px 52px',
        maskImage: 'radial-gradient(circle at center, black 38%, transparent 92%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        inset: 0,
        boxShadow: 'inset 0 0 160px rgba(0,0,0,.78)',
        pointerEvents: 'none',
      }} />

      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          imageRendering: 'pixelated',
        }}
      />

      <div style={{
        position: 'absolute',
        top: 18,
        left: 18,
        right: 18,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        pointerEvents: 'none',
        zIndex: 2,
      }}>
        <div style={{
          padding: '8px 12px',
          background: 'linear-gradient(180deg, rgba(15,22,34,.92), rgba(8,12,19,.82))',
          border: `1px solid ${clip?.color ?? 'rgba(255,255,255,.12)'}`,
          fontFamily: "'Space Mono', monospace",
          fontSize: 8,
          letterSpacing: '.18em',
          color: 'rgba(255,255,255,.42)',
          textTransform: 'uppercase',
          minWidth: 150,
          boxShadow: `0 0 28px ${clip?.color ?? 'rgba(255,255,255,.08)'}22`,
        }}>
          <div style={{ color: 'rgba(255,255,255,.34)', marginBottom: 4 }}>Highlights Replay</div>
          <div style={{ color: clip?.color ?? '#E8C84A', fontWeight: 700 }}>{clip?.label ?? 'Replay'}</div>
        </div>
        <div style={{
          padding: '8px 12px',
          background: 'linear-gradient(180deg, rgba(15,22,34,.92), rgba(8,12,19,.82))',
          border: '1px solid rgba(255,255,255,.08)',
          fontFamily: "'Space Mono', monospace",
          fontSize: 8,
          letterSpacing: '.14em',
          color: 'rgba(255,255,255,.55)',
          textTransform: 'uppercase',
          textAlign: 'right',
          minWidth: 200,
        }}>
          <div>{(playerA?.name ?? '?').toUpperCase()} vs {(playerB?.name ?? '?').toUpperCase()}</div>
          <div style={{ color: 'rgba(255,255,255,.28)', marginTop: 3 }}>{clipIdx + 1} / {clipCount || '—'} • {modeLabel}</div>
        </div>
      </div>

      <div style={{
        position: 'absolute',
        top: 18,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        pointerEvents: 'none',
      }}>
        <div style={{
          padding: '7px 14px',
          background: 'linear-gradient(180deg, rgba(14,18,28,.94), rgba(8,10,16,.88))',
          border: '1px solid rgba(255,255,255,.09)',
          boxShadow: '0 10px 26px rgba(0,0,0,.3)',
          textAlign: 'center',
          minWidth: 240,
        }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: 24,
            lineHeight: 1,
            letterSpacing: '.08em',
            color: '#F2EDE4',
            textTransform: 'uppercase',
          }}>
            {setsline}
          </div>
          <div style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 8,
            marginTop: 4,
            letterSpacing: '.18em',
            color: 'rgba(255,255,255,.38)',
            textTransform: 'uppercase',
          }}>
            Sets • {scoreline}
          </div>
        </div>
      </div>

      <div style={{
        position: 'absolute',
        left: 18,
        right: 18,
        bottom: 18,
        zIndex: 2,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'end',
        gap: 16,
        pointerEvents: 'none',
      }}>
        <div style={{
          maxWidth: '68%',
          padding: '10px 14px',
          background: 'linear-gradient(180deg, rgba(10,14,22,.9), rgba(5,8,12,.82))',
          borderLeft: `3px solid ${clip?.color ?? '#E8C84A'}`,
          borderTop: '1px solid rgba(255,255,255,.06)',
          borderRight: '1px solid rgba(255,255,255,.06)',
          borderBottom: '1px solid rgba(255,255,255,.06)',
          boxShadow: '0 12px 28px rgba(0,0,0,.28)',
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 7,
            letterSpacing: '.22em',
            color: 'rgba(255,255,255,.28)',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}>
            Momento
          </div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 18,
            lineHeight: 1.15,
            letterSpacing: '.03em',
            color: 'rgba(255,255,255,.82)',
          }}>
            {clip?.contextLine ?? 'Replay do highlight'}
          </div>
        </div>

        <div style={{
          padding: '10px 12px',
          background: 'linear-gradient(180deg, rgba(10,14,22,.88), rgba(5,8,12,.76))',
          border: '1px solid rgba(255,255,255,.07)',
          minWidth: 160,
          textAlign: 'right',
          boxShadow: '0 10px 24px rgba(0,0,0,.24)',
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 7,
            letterSpacing: '.22em',
            color: 'rgba(255,255,255,.26)',
            textTransform: 'uppercase',
            marginBottom: 5,
          }}>
            Status
          </div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 18,
            lineHeight: 1,
            fontWeight: 800,
            color: clip?.color ?? '#E8C84A',
            textTransform: 'uppercase',
            letterSpacing: '.05em',
          }}>
            {clip?.label ?? 'Replay'}
          </div>
          {(clip?.rallyLength ?? 0) > 0 && (
            <div style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 8,
              marginTop: 6,
              letterSpacing: '.14em',
              color: 'rgba(255,255,255,.38)',
            }}>
              Rally {clip.rallyLength} bolas
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

