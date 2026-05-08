// ============================================
// EraTransitionOverlay.jsx — Tela de Fim de Era
// ============================================
// Exibida quando os gatilhos automáticos detectam o fim de um período.
// O jogador pode nomear a próxima era ou aceitar a sugestão.
// ============================================

import React, { useState, useEffect } from 'react';

const ERA_TYPE_CONFIG = {
  Attack:   { color: '#e8892a', glow: 'rgba(232,137,42,0.4)',  label: 'Attack Dominant',   gradient: 'linear-gradient(135deg, #1a0800 0%, #0d0503 100%)' },
  Defense:  { color: '#7ec8e3', glow: 'rgba(126,200,227,0.35)', label: 'Defense Dominant', gradient: 'linear-gradient(135deg, #00111a 0%, #030810 100%)' },
  Stamina:  { color: '#50c878', glow: 'rgba(80,200,120,0.35)',  label: 'Stamina Dominant', gradient: 'linear-gradient(135deg, #001a08 0%, #030d05 100%)' },
  Balance:  { color: '#c9a84c', glow: 'rgba(201,168,76,0.35)',  label: 'Balanced Meta',    gradient: 'linear-gradient(135deg, #1a1400 0%, #0d0b00 100%)' },
  Contested:{ color: '#e74c3c', glow: 'rgba(231,76,60,0.35)',   label: 'Era Contestada',   gradient: 'linear-gradient(135deg, #1a0000 0%, #0d0303 100%)' },
};

const TRIGGER_LABELS = {
  DYNASTY:          '👑 Dynastia Estabelecida',
  META_COLLAPSE:    '🌀 Colapso de Meta',
  END_GENERATION:   '🌅 Fim de Geração',
  RIVALRY_ENDED:    '⚔️ Rivalidade Histórica Encerrada',
  RISING_STAR_SLAM: '🏆 Ascensão da Nova Geração',
  MANUAL:           '📌 Declaração Manual',
  GENESIS:          '🌟 Era Inicial',
};

// ─────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────
export default function EraTransitionOverlay({ transitionData, onConfirm, onManual }) {
  const [phase, setPhase] = useState('reveal');   // 'reveal' | 'name'
  const [nameInput, setNameInput] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [visible, setVisible] = useState(false);

  const { closingEra, trigger, suggestedNewEraNames, defaultNewEraName } = transitionData;
  const typeConfig = ERA_TYPE_CONFIG[closingEra.dominantType] || ERA_TYPE_CONFIG.Contested;

  useEffect(() => {
    // Animação de entrada
    const t = setTimeout(() => setVisible(true), 50);
    setSelectedName(defaultNewEraName || suggestedNewEraNames[0] || '');
    setNameInput('');
    return () => clearTimeout(t);
  }, []);

  const handleConfirm = () => {
    const finalName = nameInput.trim() || selectedName || defaultNewEraName;
    onConfirm(finalName);
  };

  const stats = closingEra.stats || {};
  const rivalry = closingEra.canonicalRivalry;

  // ─────────────────────────────────
  // FASE 1 — REVELAÇÃO DA ERA
  // ─────────────────────────────────
  const RevealPhase = () => (
    <div style={{ textAlign: 'center', padding: '0 24px' }}>
      {/* Trigger badge */}
      <div style={{
        display: 'inline-block',
        padding: '6px 18px',
        border: `1px solid ${typeConfig.color}`,
        borderRadius: 2,
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.4em',
        color: typeConfig.color,
        textTransform: 'uppercase',
        marginBottom: 28,
        animation: 'era-fade-up 0.6s 0.2s ease both',
        opacity: visible ? 1 : 0,
      }}>
        {TRIGGER_LABELS[trigger.type] || '⚑ Fim de Era Detectado'}
      </div>

      {/* Era encerrada */}
      <div style={{
        fontFamily: 'Playfair Display, Georgia, serif',
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: '0.5em',
        color: 'rgba(232,226,212,0.5)',
        textTransform: 'uppercase',
        marginBottom: 12,
        animation: 'era-fade-up 0.6s 0.35s ease both',
        opacity: visible ? 1 : 0,
      }}>
        Era {closingEra.number} · {closingEra.startYear}–{closingEra.endYear}
      </div>

      <h1 style={{
        fontFamily: 'Playfair Display, Georgia, serif',
        fontSize: 'clamp(36px, 7vw, 72px)',
        fontWeight: 900,
        fontStyle: 'italic',
        lineHeight: 1.0,
        margin: '0 0 24px 0',
        animation: 'era-fade-up 0.7s 0.45s ease both',
        opacity: visible ? 1 : 0,
        textShadow: `0 0 40px ${typeConfig.glow}`,
      }}>
        {closingEra.name}
        <br/>
        <span style={{ color: typeConfig.color }}>chegou ao fim.</span>
      </h1>

      {/* Tagline */}
      <div style={{
        fontFamily: 'Georgia, serif',
        fontSize: 'clamp(15px, 2vw, 19px)',
        fontStyle: 'italic',
        color: 'rgba(232,226,212,0.6)',
        maxWidth: 520,
        margin: '0 auto 40px',
        lineHeight: 1.6,
        animation: 'era-fade-up 0.6s 0.6s ease both',
        opacity: visible ? 1 : 0,
      }}>
        "{closingEra.tagline}"
      </div>

      {/* Stats da era */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 'clamp(20px, 4vw, 56px)',
        borderTop: `1px solid rgba(201,168,76,0.2)`,
        borderBottom: `1px solid rgba(201,168,76,0.2)`,
        padding: '28px 0',
        marginBottom: 32,
        animation: 'era-fade-up 0.6s 0.75s ease both',
        opacity: visible ? 1 : 0,
        flexWrap: 'wrap',
      }}>
        {[
          { val: closingEra.seasons,             label: 'Temporadas'       },
          { val: stats.totalTournaments || '—',  label: 'Torneios'         },
          { val: stats.grandSlams || '—',        label: 'Grand Slams'      },
          { val: stats.retirements || '—',       label: 'Aposentadorias'   },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: 'clamp(28px, 4vw, 44px)',
              fontWeight: 900,
              color: typeConfig.color,
              lineHeight: 1,
              marginBottom: 4,
            }}>{s.val}</div>
            <div style={{
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: 10,
              color: 'rgba(232,226,212,0.45)',
              textTransform: 'uppercase',
              letterSpacing: '0.25em',
            }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Champion + Rivalidade */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: rivalry ? '1fr 1px 1fr' : '1fr',
        gap: 0,
        marginBottom: 36,
        animation: 'era-fade-up 0.6s 0.9s ease both',
        opacity: visible ? 1 : 0,
      }}>
        {closingEra.championName && (
          <div style={{ padding: '0 24px' }}>
            <div style={{ fontSize: 10, color: 'rgba(201,168,76,0.6)', letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: 6 }}>
              Definido por
            </div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 700, color: '#f0cc6e' }}>
              {closingEra.championName}
            </div>
          </div>
        )}
        {rivalry && closingEra.championName && (
          <div style={{ background: 'rgba(201,168,76,0.15)', width: 1 }} />
        )}
        {rivalry && (
          <div style={{ padding: '0 24px' }}>
            <div style={{ fontSize: 10, color: 'rgba(201,168,76,0.6)', letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: 6 }}>
              Rivalidade Canônica
            </div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700 }}>
              {rivalry.p1Name} <span style={{ color: 'rgba(232,226,212,0.4)', fontStyle: 'italic', fontSize: 13 }}>vs</span> {rivalry.p2Name}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(232,226,212,0.5)', marginTop: 4 }}>
              {rivalry.p1Wins}–{rivalry.p2Wins} · {rivalry.total} confrontos
            </div>
          </div>
        )}
      </div>

      {/* Trigger detail */}
      {trigger.detail && (
        <div style={{
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: 13,
          color: 'rgba(232,226,212,0.4)',
          letterSpacing: '0.1em',
          marginBottom: 36,
          animation: 'era-fade-up 0.6s 1.0s ease both',
          opacity: visible ? 1 : 0,
        }}>
          {trigger.detail}
        </div>
      )}

      {/* Botão continuar */}
      <button
        onClick={() => setPhase('name')}
        style={{
          background: `linear-gradient(135deg, ${typeConfig.color}, rgba(201,168,76,0.8))`,
          border: 'none',
          borderRadius: 2,
          padding: '14px 40px',
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: '#0a0005',
          cursor: 'pointer',
          animation: 'era-fade-up 0.6s 1.1s ease both',
          opacity: visible ? 1 : 0,
        }}
      >
        Nomear a Próxima Era →
      </button>
    </div>
  );

  // ─────────────────────────────────
  // FASE 2 — NOMEAÇÃO DA NOVA ERA
  // ─────────────────────────────────
  const NamePhase = () => (
    <div style={{ textAlign: 'center', padding: '0 24px', maxWidth: 620, margin: '0 auto' }}>
      <div style={{
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.5em',
        color: '#c9a84c',
        textTransform: 'uppercase',
        marginBottom: 16,
      }}>
        O Próximo Capítulo
      </div>

      <h2 style={{
        fontFamily: 'Playfair Display, serif',
        fontSize: 'clamp(28px, 5vw, 48px)',
        fontWeight: 900,
        fontStyle: 'italic',
        lineHeight: 1.1,
        margin: '0 0 12px 0',
      }}>
        Como será lembrada<br/>
        <span style={{ color: '#f0cc6e' }}>a próxima era?</span>
      </h2>

      <p style={{
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: 15,
        color: 'rgba(232,226,212,0.5)',
        marginBottom: 32,
        lineHeight: 1.6,
      }}>
        Escolha um nome sugerido ou escreva o seu. Este nome ficará na história.
      </p>

      {/* Sugestões */}
      <div style={{ marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {suggestedNewEraNames.map((name, i) => (
          <button
            key={i}
            onClick={() => { setSelectedName(name); setNameInput(''); }}
            style={{
              background: selectedName === name && !nameInput ? 'rgba(201,168,76,0.12)' : 'rgba(201,168,76,0.04)',
              border: `1px solid ${selectedName === name && !nameInput ? '#c9a84c' : 'rgba(201,168,76,0.2)'}`,
              borderRadius: 2,
              padding: '12px 20px',
              fontFamily: 'Playfair Display, serif',
              fontSize: 18,
              fontStyle: 'italic',
              fontWeight: 700,
              color: selectedName === name && !nameInput ? '#f0cc6e' : 'rgba(232,226,212,0.7)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
              letterSpacing: '0.01em',
            }}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Campo personalizado */}
      <div style={{ marginBottom: 32, textAlign: 'left' }}>
        <div style={{ fontSize: 10, color: 'rgba(201,168,76,0.5)', letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: 8 }}>
          Ou escreva o seu nome
        </div>
        <input
          type="text"
          value={nameInput}
          onChange={e => { setNameInput(e.target.value); if (e.target.value) setSelectedName(''); }}
          placeholder="Ex: A Era do Renascimento..."
          style={{
            width: '100%',
            background: 'rgba(201,168,76,0.05)',
            border: `1px solid ${nameInput ? '#c9a84c' : 'rgba(201,168,76,0.2)'}`,
            borderRadius: 2,
            padding: '12px 16px',
            fontFamily: 'Georgia, serif',
            fontSize: 17,
            fontStyle: 'italic',
            color: '#e8e2d4',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          onFocus={e => { e.target.style.borderColor = '#c9a84c'; }}
          onBlur={e => { if (!nameInput) e.target.style.borderColor = 'rgba(201,168,76,0.2)'; }}
        />
      </div>

      {/* Preview do nome escolhido */}
      {(nameInput || selectedName) && (
        <div style={{
          marginBottom: 32,
          padding: '16px 24px',
          background: 'rgba(201,168,76,0.06)',
          border: '1px solid rgba(201,168,76,0.2)',
          borderRadius: 2,
        }}>
          <div style={{ fontSize: 10, color: 'rgba(201,168,76,0.5)', letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: 8 }}>
            Prévia
          </div>
          <div style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 24,
            fontWeight: 700,
            fontStyle: 'italic',
            color: '#f0cc6e',
          }}>
            {nameInput || selectedName}
          </div>
        </div>
      )}

      {/* Botões */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => setPhase('reveal')}
          style={{
            background: 'transparent',
            border: '1px solid rgba(201,168,76,0.3)',
            borderRadius: 2,
            padding: '12px 24px',
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.2em',
            color: 'rgba(232,226,212,0.6)',
            cursor: 'pointer',
          }}
        >
          ← Voltar
        </button>
        <button
          onClick={handleConfirm}
          disabled={!nameInput && !selectedName}
          style={{
            background: (nameInput || selectedName) ? 'linear-gradient(135deg, #c9a84c, #f0cc6e)' : 'rgba(201,168,76,0.2)',
            border: 'none',
            borderRadius: 2,
            padding: '12px 36px',
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: '#0a0005',
            cursor: (nameInput || selectedName) ? 'pointer' : 'not-allowed',
            opacity: (nameInput || selectedName) ? 1 : 0.5,
          }}
        >
          Confirmar Nova Era
        </button>
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9998,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: `radial-gradient(ellipse 80% 80% at 50% 50%, ${typeConfig.glow} 0%, rgba(0,0,0,0.97) 60%)`,
      padding: 20,
      overflowY: 'auto',
    }}>
      {/* Noise overlay */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
        opacity: 0.35,
        pointerEvents: 'none',
        zIndex: 1,
      }} />

      {/* Grid lines */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: `linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)',
        pointerEvents: 'none',
        zIndex: 1,
      }} />

      {/* Watermark text */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%) rotate(-15deg)',
        fontFamily: 'Playfair Display, serif',
        fontSize: 'clamp(80px, 18vw, 200px)',
        fontWeight: 900,
        fontStyle: 'italic',
        color: `rgba(201,168,76,0.025)`,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        zIndex: 1,
        letterSpacing: '-0.02em',
      }}>
        {phase === 'reveal' ? 'HISTÓRIA' : 'NOMEANDO'}
      </div>

      {/* Main content card */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        maxWidth: 700,
        width: '100%',
        background: `linear-gradient(135deg, rgba(13,11,24,0.96) 0%, rgba(7,6,13,0.98) 100%)`,
        border: `1px solid rgba(201,168,76,0.2)`,
        borderRadius: 4,
        padding: 'clamp(28px, 5vw, 56px) clamp(20px, 4vw, 48px)',
        boxShadow: `0 0 80px ${typeConfig.glow}, 0 0 0 1px rgba(201,168,76,0.05)`,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.5s ease, opacity 0.5s ease',
      }}>
        {/* Top accent line */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${typeConfig.color}, transparent)`,
          borderRadius: '4px 4px 0 0',
        }} />

        {phase === 'reveal' ? <RevealPhase /> : <NamePhase />}
      </div>

      {/* Animations */}
      <style>{`
        @keyframes era-fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes era-pulse {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
