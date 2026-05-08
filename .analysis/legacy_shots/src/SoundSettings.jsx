/**
 * SoundSettings.jsx — Painel de configurações de som
 *
 * Abre como overlay flutuante na topbar do DefinitiveME.
 * Seções:
 *   • Master toggle + volume geral
 *   • Categorias: Batidas/Quiques | Torcida | Eventos | Narrador
 *   • Upload de sons customizados por tipo
 *   • Preview de cada som
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  getSoundSettings, updateSoundSettings,
  uploadCustomSound, removeCustomSound, getCustomSoundTypes,
  previewSound, toggleSound, isSoundOn,
  UPLOADABLE_SOUND_TYPES,
} from '../sound.js';

// ── Design tokens (espelha definitiveME) ─────────────────────────────────────
const T = {
  bg:          '#050A07',
  bgPanel:     '#0C1610',
  bgCard:      '#111D15',
  bgHover:     '#172318',
  clay:        '#C4572A',
  clayLight:   '#D97048',
  lime:        '#60FF90',
  white:       '#F2EDE8',
  dim:         'rgba(242,237,232,.58)',
  faint:       'rgba(242,237,232,.28)',
  ghost:       'rgba(242,237,232,.06)',
  border:      'rgba(255,255,255,.07)',
  borderMid:   'rgba(255,255,255,.14)',
  green:       '#00FF88',
  gold:        '#FFD700',
  display:     "'Barlow Condensed', sans-serif",
  mono:        "'Space Mono', monospace",
  body:        "'Barlow', sans-serif",
};

// ── Componentes base ──────────────────────────────────────────────────────────

function Label({ children, style }) {
  return (
    <div style={{
      fontFamily: T.mono, fontSize: 8, letterSpacing: '.22em',
      textTransform: 'uppercase', color: T.faint, ...style,
    }}>
      {children}
    </div>
  );
}

function Toggle({ on, onChange, disabled }) {
  return (
    <button
      disabled={disabled}
      onClick={() => onChange(!on)}
      style={{
        width: 36, height: 20, borderRadius: 10, border: 'none', cursor: disabled ? 'default' : 'pointer',
        background: on ? `${T.lime}33` : T.ghost,
        border: `1px solid ${on ? T.lime + '66' : T.border}`,
        position: 'relative', transition: 'all .2s', flexShrink: 0, outline: 'none',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: on ? 18 : 3,
        width: 12, height: 12, borderRadius: '50%',
        background: on ? T.lime : T.faint,
        transition: 'left .18s, background .18s',
        boxShadow: on ? `0 0 6px ${T.lime}` : 'none',
      }} />
    </button>
  );
}

function VolumeSlider({ value, onChange, disabled, color = T.lime }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: disabled ? 0.35 : 1 }}>
      <input
        type="range" min={0} max={1} step={0.02}
        value={value}
        disabled={disabled}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{
          flex: 1, height: 3, cursor: disabled ? 'default' : 'pointer',
          accentColor: color, background: 'transparent',
        }}
      />
      <span style={{ fontFamily: T.mono, fontSize: 9, color: T.faint, width: 28, textAlign: 'right' }}>
        {Math.round(value * 100)}
      </span>
    </div>
  );
}

function PreviewBtn({ type, disabled }) {
  const [active, setActive] = useState(false);
  const handle = () => {
    if (disabled) return;
    setActive(true);
    previewSound(type);
    setTimeout(() => setActive(false), 400);
  };
  return (
    <button
      onClick={handle}
      disabled={disabled}
      title="Preview"
      style={{
        background: active ? `${T.lime}22` : 'none',
        border: `1px solid ${active ? T.lime + '55' : T.border}`,
        borderRadius: 4, padding: '2px 7px', cursor: disabled ? 'default' : 'pointer',
        fontFamily: T.mono, fontSize: 9, color: active ? T.lime : T.faint,
        transition: 'all .15s', outline: 'none',
        opacity: disabled ? 0.3 : 1,
      }}
    >▶</button>
  );
}

// ── Upload row para um tipo de som ────────────────────────────────────────────

function UploadRow({ type, info, customTypes, onUploaded, onRemoved, masterOn }) {
  const [uploading, setUploading]  = useState(false);
  const [error, setError]          = useState(null);
  const [success, setSuccess]      = useState(false);
  const fileRef                    = useRef();
  const hasCustom                  = customTypes.includes(type);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError(null);
    try {
      await uploadCustomSound(type, file);
      setSuccess(true); setTimeout(() => setSuccess(false), 1800);
      onUploaded(type);
    } catch (err) {
      setError(err.message ?? 'Erro no upload');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    await removeCustomSound(type);
    onRemoved(type);
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '7px 10px', borderRadius: 6,
      background: hasCustom ? `${T.lime}09` : T.ghost,
      border: `1px solid ${hasCustom ? T.lime + '22' : T.border}`,
      marginBottom: 5,
    }}>
      {/* Emoji + label */}
      <span style={{ fontSize: 14, flexShrink: 0 }}>{info.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: T.body, fontSize: 11, color: T.white, fontWeight: 600 }}>{info.label}</div>
        <div style={{ fontFamily: T.mono, fontSize: 8, color: T.faint, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {hasCustom ? '✅ Som customizado ativo' : info.desc}
        </div>
        {error && <div style={{ fontFamily: T.mono, fontSize: 8, color: '#FF6B6B', marginTop: 2 }}>{error}</div>}
      </div>

      {/* Preview */}
      <PreviewBtn type={type} disabled={!masterOn} />

      {/* Upload / Remove */}
      {hasCustom ? (
        <button
          onClick={handleRemove}
          title="Remover som customizado"
          style={{
            background: 'rgba(255,68,68,.10)', border: '1px solid rgba(255,68,68,.35)',
            borderRadius: 4, padding: '3px 8px', cursor: 'pointer',
            fontFamily: T.mono, fontSize: 8, color: '#FF6B6B',
            transition: 'all .15s', outline: 'none', flexShrink: 0,
          }}
        >✕ Remover</button>
      ) : (
        <label style={{
          background: uploading ? T.ghost : `${T.clay}22`,
          border: `1px solid ${uploading ? T.border : T.clay + '55'}`,
          borderRadius: 4, padding: '3px 9px', cursor: uploading ? 'default' : 'pointer',
          fontFamily: T.mono, fontSize: 8,
          color: uploading ? T.faint : T.clay,
          transition: 'all .15s', flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          {success ? '✅' : uploading ? '⏳' : '📁 Upload'}
          <input ref={fileRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleFile} />
        </label>
      )}
    </div>
  );
}

// ── Seção com header colapsável ───────────────────────────────────────────────

function Section({ title, emoji, on, onToggle, children, accent = T.clay }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{
      border: `1px solid ${on ? accent + '30' : T.border}`,
      borderRadius: 8, marginBottom: 10, overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px',
        background: on ? `${accent}10` : T.ghost,
        cursor: 'pointer', userSelect: 'none',
      }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ fontSize: 14 }}>{emoji}</span>
        <span style={{
          fontFamily: T.display, fontSize: 13, fontWeight: 700, letterSpacing: 2,
          textTransform: 'uppercase', color: on ? T.white : T.faint, flex: 1,
        }}>{title}</span>
        <Toggle on={on} onChange={onToggle} />
        <span style={{ fontFamily: T.mono, fontSize: 9, color: T.faint, marginLeft: 4 }}>
          {open ? '▲' : '▼'}
        </span>
      </div>
      {open && (
        <div style={{ padding: '10px 12px', background: T.bgPanel }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function SoundSettings({ onClose }) {
  const [cfg, setCfg]             = useState(getSoundSettings());
  const [masterOn, setMasterOn]   = useState(isSoundOn());
  const [customTypes, setCustomTypes] = useState(getCustomSoundTypes());
  const [uploadTab, setUploadTab] = useState('HITS'); // HITS | EVENTS | CROWD

  // Sincronizar com updateSoundSettings e salvar
  const patch = useCallback((p) => {
    updateSoundSettings(p);
    setCfg(getSoundSettings());
  }, []);

  const handleMasterToggle = async () => {
    const on = await toggleSound();
    setMasterOn(on);
  };

  const onUploaded = (type) => setCustomTypes(getCustomSoundTypes());
  const onRemoved  = (type) => setCustomTypes(getCustomSoundTypes());

  const UPLOAD_TABS = {
    HITS:   ['HIT', 'MISHIT', 'BOUNCE'],
    EVENTS: ['NET', 'OUT', 'ACE', 'WINNER', 'DOUBLE_FAULT', 'GAME', 'SET'],
    CROWD:  ['CROWD_LOOP'],
  };

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        position: 'fixed', top: 52, right: 16, zIndex: 9000,
        width: 400, maxHeight: 'calc(100vh - 70px)',
        background: T.bg, border: `1px solid ${T.borderMid}`,
        borderRadius: 10, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 40px rgba(0,0,0,.7)',
        animation: 'ssIn .18s ease',
      }}
    >
      <style>{`
        @keyframes ssIn { from { opacity:0; transform:translateY(-8px) scale(.97) } to { opacity:1; transform:none } }
        input[type=range] { -webkit-appearance:none; appearance:none; height:3px; border-radius:2px;
          background: rgba(255,255,255,.10); }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance:none; width:13px; height:13px; border-radius:50%;
          background: var(--thumb-color,#60FF90); cursor:pointer;
          box-shadow: 0 0 5px var(--thumb-color,#60FF90);
        }
        .ss-tab { transition: all .15s; }
        .ss-tab:hover { background: rgba(255,255,255,.06) !important; }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
        borderBottom: `1px solid ${T.border}`,
        background: `${T.clay}18`,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 18 }}>🔊</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: T.display, fontSize: 15, fontWeight: 700, letterSpacing: 3, color: T.white, textTransform: 'uppercase' }}>
            Configurações de Som
          </div>
          <div style={{ fontFamily: T.mono, fontSize: 8, color: T.faint, marginTop: 2, letterSpacing: 2 }}>
            História Viva · Audio Engine v3
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: `1px solid ${T.border}`, borderRadius: 4,
          color: T.faint, cursor: 'pointer', padding: '3px 9px',
          fontFamily: T.mono, fontSize: 10, outline: 'none',
        }}>✕</button>
      </div>

      {/* ── SCROLL AREA ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>

        {/* ── MASTER ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
          background: masterOn ? `${T.green}10` : T.ghost,
          border: `1px solid ${masterOn ? T.green + '44' : T.border}`,
          borderRadius: 8, marginBottom: 12,
        }}>
          <span style={{ fontSize: 20 }}>{masterOn ? '🔊' : '🔇'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: T.display, fontSize: 14, fontWeight: 700, letterSpacing: 2, color: masterOn ? T.green : T.faint }}>
              {masterOn ? 'SOM ATIVO' : 'SOM DESLIGADO'}
            </div>
            {masterOn && (
              <div style={{ marginTop: 6 }}>
                <Label>Volume geral</Label>
                <VolumeSlider value={cfg.masterVolume} onChange={v => patch({ masterVolume: v })} color={T.green} />
              </div>
            )}
          </div>
          <Toggle on={masterOn} onChange={handleMasterToggle} />
        </div>

        {/* ── BATIDAS E QUIQUES ── */}
        <Section
          title="Batidas & Quiques" emoji="🎾"
          on={cfg.hitsEnabled} onToggle={v => patch({ hitsEnabled: v })}
          accent={T.lime}
        >
          <Label style={{ marginBottom: 6 }}>Volume</Label>
          <VolumeSlider
            value={cfg.hitVolume}
            onChange={v => patch({ hitVolume: v })}
            disabled={!cfg.hitsEnabled}
            color={T.lime}
          />
          <div style={{ marginTop: 4, fontFamily: T.mono, fontSize: 8, color: T.faint }}>
            Inclui: hit limpo, mishit e quique no chão
          </div>
        </Section>

        {/* ── TORCIDA ── */}
        <Section
          title="Torcida" emoji="👥"
          on={cfg.crowdEnabled} onToggle={v => patch({ crowdEnabled: v })}
          accent={T.gold}
        >
          <Label style={{ marginBottom: 6 }}>Volume</Label>
          <VolumeSlider
            value={cfg.crowdVolume}
            onChange={v => patch({ crowdVolume: v })}
            disabled={!cfg.crowdEnabled}
            color={T.gold}
          />
          <div style={{ marginTop: 4, fontFamily: T.mono, fontSize: 8, color: T.faint }}>
            Sobe progressivamente com rallys longos. Explode em aces e winners.
          </div>
        </Section>

        {/* ── EVENTOS ── */}
        <Section
          title="Eventos" emoji="🏆"
          on={cfg.eventsEnabled} onToggle={v => patch({ eventsEnabled: v })}
          accent={T.clay}
        >
          <Label style={{ marginBottom: 6 }}>Volume</Label>
          <VolumeSlider
            value={cfg.eventsVolume}
            onChange={v => patch({ eventsVolume: v })}
            disabled={!cfg.eventsEnabled}
            color={T.clay}
          />
          <div style={{ marginTop: 4, fontFamily: T.mono, fontSize: 8, color: T.faint }}>
            Ace, winner, rede, fora, dupla falta, game, set.
          </div>
        </Section>

        {/* ── NARRADOR ── */}
        <Section
          title="Narrador" emoji="🎙️"
          on={cfg.narratorEnabled} onToggle={v => patch({ narratorEnabled: v })}
          accent="#9B59B6"
        >
          <Label style={{ marginBottom: 6 }}>Volume</Label>
          <VolumeSlider
            value={cfg.narratorVolume}
            onChange={v => patch({ narratorVolume: v })}
            disabled={!cfg.narratorEnabled}
            color="#9B59B6"
          />
          <div style={{ height: 8 }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <Label style={{ marginBottom: 4 }}>Velocidade da fala</Label>
              <VolumeSlider
                value={cfg.narratorRate}
                onChange={v => patch({ narratorRate: v })}
                disabled={!cfg.narratorEnabled}
                color="#9B59B6"
              />
            </div>
            <div>
              <Label style={{ marginBottom: 4 }}>Tom da voz</Label>
              <VolumeSlider
                value={cfg.narratorPitch}
                onChange={v => patch({ narratorPitch: v })}
                disabled={!cfg.narratorEnabled}
                color="#9B59B6"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {['pt-BR', 'pt-PT', 'en-US', 'es-ES'].map(lang => (
              <button
                key={lang}
                onClick={() => patch({ narratorLang: lang })}
                disabled={!cfg.narratorEnabled}
                style={{
                  fontFamily: T.mono, fontSize: 8, letterSpacing: 2, padding: '3px 9px',
                  border: `1px solid ${cfg.narratorLang === lang ? '#9B59B666' : T.border}`,
                  background: cfg.narratorLang === lang ? '#9B59B622' : 'none',
                  color: cfg.narratorLang === lang ? '#C39BD3' : T.faint,
                  borderRadius: 4, cursor: cfg.narratorEnabled ? 'pointer' : 'default', outline: 'none',
                  opacity: cfg.narratorEnabled ? 1 : 0.4,
                }}
              >{lang}</button>
            ))}
          </div>

          <div style={{ fontFamily: T.mono, fontSize: 8, color: T.faint }}>
            Usa a voz nativa do browser (Web Speech API). Anuncia placar, game, set e partida.
          </div>
        </Section>

        {/* ── SONS CUSTOMIZADOS ── */}
        <div style={{
          border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden', marginBottom: 10,
        }}>
          <div style={{
            padding: '9px 12px', background: `${T.clayLight}12`,
            borderBottom: `1px solid ${T.border}`,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 14 }}>📁</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: T.display, fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: T.white }}>
                Sons Customizados
              </div>
              <div style={{ fontFamily: T.mono, fontSize: 8, color: T.faint, marginTop: 1 }}>
                Substitui qualquer som sintético por arquivo seu · MP3, WAV, OGG
              </div>
            </div>
            {customTypes.length > 0 && (
              <div style={{
                fontFamily: T.mono, fontSize: 8, letterSpacing: 2,
                color: T.lime, background: `${T.lime}18`,
                border: `1px solid ${T.lime}33`, borderRadius: 4, padding: '2px 7px',
              }}>
                {customTypes.length} ativo{customTypes.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}` }}>
            {[
              { key: 'HITS',   label: 'Batidas',  emoji: '🎾' },
              { key: 'EVENTS', label: 'Eventos',  emoji: '🏆' },
              { key: 'CROWD',  label: 'Torcida',  emoji: '👥' },
            ].map(tab => (
              <button
                key={tab.key}
                className="ss-tab"
                onClick={() => setUploadTab(tab.key)}
                style={{
                  flex: 1, padding: '7px 4px', cursor: 'pointer', outline: 'none',
                  background: uploadTab === tab.key ? `${T.clay}22` : 'none',
                  border: 'none',
                  borderBottom: `2px solid ${uploadTab === tab.key ? T.clay : 'transparent'}`,
                  fontFamily: T.mono, fontSize: 8, letterSpacing: 2,
                  color: uploadTab === tab.key ? T.clay : T.faint,
                  textTransform: 'uppercase',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}
              >
                <span style={{ fontSize: 12 }}>{tab.emoji}</span>
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ padding: '10px 12px', background: T.bgPanel }}>
            {UPLOAD_TABS[uploadTab].map(type => (
              <UploadRow
                key={type}
                type={type}
                info={UPLOADABLE_SOUND_TYPES[type]}
                customTypes={customTypes}
                onUploaded={onUploaded}
                onRemoved={onRemoved}
                masterOn={masterOn}
              />
            ))}
            <div style={{ fontFamily: T.mono, fontSize: 7, color: T.faint, marginTop: 8, lineHeight: 1.6 }}>
              Arquivos salvos no IndexedDB do browser · Persistem entre sessões · Qualquer formato de áudio suportado pelo browser
            </div>
          </div>
        </div>

      </div>

      {/* ── FOOTER ── */}
      <div style={{
        padding: '8px 14px', borderTop: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 8,
        background: T.bgPanel, flexShrink: 0,
      }}>
        <div style={{ fontFamily: T.mono, fontSize: 7, color: T.faint, flex: 1 }}>
          Web Audio API · Web Speech API · IndexedDB
        </div>
        <button
          onClick={onClose}
          style={{
            fontFamily: T.mono, fontSize: 9, letterSpacing: 2,
            padding: '4px 14px', cursor: 'pointer', outline: 'none',
            background: `${T.clay}22`, border: `1px solid ${T.clay}44`,
            color: T.clay, borderRadius: 4, textTransform: 'uppercase',
          }}
        >Fechar</button>
      </div>
    </div>
  );
}
