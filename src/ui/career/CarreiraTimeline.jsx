/**
 * CarreiraTimeline.jsx
 * ─────────────────────────────────────────────────────────────────
 * Linha do tempo de carreira do jogador.
 *
 * Agrega por temporada:
 *   - OVR (curva de evolução)
 *   - Ranking
 *   - Títulos (tipo + flag "ganhou lesionado")
 *   - Lesões (grade, tipo, playedThrough)
 *   - Rivalidades que graduaram naquele ano
 *   - Declínio iniciado
 *   - Maior crescimento de atributo
 *
 * Props:
 *   np             {object}  — player object
 *   sc             {string}  — accent color
 *   rivalrySystem  {object}  — RivalrySystem instance
 *   allPlayers     {Array}
 *   year           {number}  — current season
 */

import { useState, useMemo } from 'react';
import { buildPlayerIdentity } from '../../domain/players/PlayerIdentity.js';
import { buildPlayerMomentEvents } from '../../systems/history/PlayerTimelineEvents.js';
import { ovrTier } from '../../systems/scouting/ScoutProfile.js';
import { buildYouthOriginSummary } from '../../systems/youth/YouthOriginsSystem.js';
import { describeYouthAcademy } from '../../systems/youth/YouthAcademySystem.js';

// ─────────────────────────────────────────────────────────────────
// TOKENS (match UnifiedPlayerProfile)
// ─────────────────────────────────────────────────────────────────
const RG = {
  bg:        '#06080A',
  bgMid:     '#0A0E0F',
  bgPanel:   '#0F1518',
  bgLight:   '#141C20',
  bgDeep:    '#1B2830',
  gold:      '#E8C84A',
  white:     '#F2EDE4',
  textDim:   'rgba(242,237,228,.55)',
  textFaint: 'rgba(242,237,228,.28)',
  border:    'rgba(242,237,228,.07)',
  borderMid: 'rgba(242,237,228,.14)',
  display:   "'Bebas Neue', sans-serif",
  cond:      "'Barlow Condensed', sans-serif",
  body:      "'Barlow', sans-serif",
  mono:      "'Space Mono', monospace",
};

// ─────────────────────────────────────────────────────────────────
// META MAPS
// ─────────────────────────────────────────────────────────────────

const TITLE_META = {
  SLAM:        { label: 'Grand Slam',    icon: '⭐', color: '#FFD700' },
  GRAND_SLAM:  { label: 'Grand Slam',    icon: '⭐', color: '#FFD700' },
  MASTERS:     { label: 'Masters 1000',  icon: '🏆', color: '#E8C84A' },
  MASTERS_1000:{ label: 'Masters 1000',  icon: '🏆', color: '#E8C84A' },
  FINALS:      { label: 'Tour Finals',   icon: '👑', color: '#c084fc' },
  ATP500:      { label: 'ATP 500',       icon: '🎖️', color: '#4A90D9' },
  ATP_500:     { label: 'ATP 500',       icon: '🎖️', color: '#4A90D9' },
  ATP250:      { label: 'ATP 250',       icon: '🎗️', color: '#2ECC71' },
  ATP_250:     { label: 'ATP 250',       icon: '🎗️', color: '#2ECC71' },
};

const INJURY_TYPE_LABEL = {
  WRIST:      'Punho',
  KNEE:       'Joelho',
  BACK:       'Costas',
  SHOULDER:   'Ombro',
  ANKLE:      'Tornozelo',
  ELBOW:      'Cotovelo',
  HAMSTRING:  'Posterior da Coxa',
  FATIGUE:    'Fadiga',
  ILLNESS:    'Doença',
};

const RIVALRY_TYPE_ICON = {
  CLASSIC:      '⚔️',
  PRODIGY:      '✨',
  NEMESIS:      '💀',
  GRUDGE:       '🔥',
  FINALS_CURSE: '🏆',
};

const ATTR_LABEL = {
  serve:       'Saque',
  forehand:    'Forehand',
  backhand:    'Backhand',
  volley:      'Voleio',
  movement:    'Movimentação',
  physical:    'Físico',
  mental:      'Mental',
  consistency: 'Consistência',
  slice:       'Slice',
  dropshot:    'Drop Shot',
};

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

function lerp(a, b, t) { return a + (b - a) * t; }

function rankColor(rank) {
  if (!rank) return RG.textFaint;
  if (rank <= 1)  return '#FFD700';
  if (rank <= 5)  return '#22c55e';
  if (rank <= 20) return '#4A90D9';
  if (rank <= 50) return RG.textDim;
  return RG.textFaint;
}

function ovrColor(ovr) {
  if (ovr >= 90) return '#FFD700';
  if (ovr >= 82) return '#22c55e';
  if (ovr >= 74) return '#4A90D9';
  if (ovr >= 66) return RG.textDim;
  return '#ef4444';
}

// ─────────────────────────────────────────────────────────────────
// BADGE COMPONENTS
// ─────────────────────────────────────────────────────────────────

function Badge({ icon, label, color, small }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: small ? 3 : 4,
      padding: small ? '2px 5px' : '3px 7px',
      border: `1px solid ${color}44`,
      background: `${color}0F`,
      fontSize: small ? 7 : 8,
      color,
      fontFamily: RG.mono,
      letterSpacing: .5,
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      <span style={{ fontSize: small ? 9 : 11 }}>{icon}</span>
      {label}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// CARD DE DETALHE DO ANO (expandido ao clicar)
// ─────────────────────────────────────────────────────────────────

function YearDetail({ entry, allPlayers, rivalrySystem, sponsorEvents }) {
  const title  = entry.titleWon ? (TITLE_META[entry.titleWon] ?? { label: entry.titleWon, icon: '🏆', color: '#FFD700' }) : null;

  // Eventos de patrocínio deste ano específico
  const yearSponsorEvents = (sponsorEvents ?? []).filter(e => e.year === entry.year);

  // Maior atributo que cresceu essa temporada
  const topGain = entry.attrChanges
    ? Object.entries(entry.attrChanges)
        .filter(([, d]) => d > 0)
        .sort(([, a], [, b]) => b - a)[0]
    : null;
  const topLoss = entry.attrChanges
    ? Object.entries(entry.attrChanges)
        .filter(([, d]) => d < 0)
        .sort(([, a], [, b]) => a - b)[0]
    : null;

  return (
    <div style={{
      padding: '16px 20px',
      background: RG.bgLight,
      border: `1px solid ${RG.borderMid}`,
      borderTop: 'none',
      display: 'grid', gridTemplateColumns: '1fr 1fr',
      gap: '14px 24px',
    }}>

      {/* OVR delta */}
      <div>
        <div style={{ fontFamily: RG.mono, fontSize: 7, color: RG.textFaint, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
          Evolução de Nível
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: RG.display, fontSize: 28, color: ovrTier(entry.ovr).color }}>{ovrTier(entry.ovr).grade}</span>
          {entry.ovrDelta !== 0 && (
            <span style={{
              fontFamily: RG.mono, fontSize: 10,
              color: entry.ovrDelta > 0 ? '#22c55e' : '#ef4444',
            }}>
              {entry.ovrDelta > 0 ? '+' : ''}{entry.ovrDelta}
            </span>
          )}
        </div>
        {entry.inDecline && (
          <div style={{ fontFamily: RG.mono, fontSize: 7, color: '#ef4444', marginTop: 3, letterSpacing: 1 }}>
            ↘ Declínio iniciado
          </div>
        )}
      </div>

      {/* Ranking */}
      {entry.rank && (
        <div>
          <div style={{ fontFamily: RG.mono, fontSize: 7, color: RG.textFaint, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
            Ranking
          </div>
          <div style={{ fontFamily: RG.display, fontSize: 28, color: rankColor(entry.rank) }}>
            #{entry.rank}
          </div>
        </div>
      )}

      {/* Título */}
      {title && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={{ fontFamily: RG.mono, fontSize: 7, color: RG.textFaint, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
            Título
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '8px 14px',
            background: `${title.color}0D`,
            border: `1px solid ${title.color}44`,
          }}>
            <span style={{ fontSize: 18 }}>{title.icon}</span>
            <div>
              <div style={{ fontFamily: RG.display, fontSize: 16, color: title.color }}>{title.label}</div>
              {entry.titleWhileInjured && (
                <div style={{ fontFamily: RG.mono, fontSize: 7, color: '#ef4444', marginTop: 2, letterSpacing: 1 }}>
                  ⚡ Conquistado com lesão ativa — resistência histórica
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Estatísticas */}
      {(entry.wins > 0 || entry.finals > 0) && (
        <div>
          <div style={{ fontFamily: RG.mono, fontSize: 7, color: RG.textFaint, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
            Temporada
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {entry.wins > 0 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: RG.display, fontSize: 22, color: '#22c55e' }}>{entry.wins}</div>
                <div style={{ fontFamily: RG.mono, fontSize: 6, color: RG.textFaint, letterSpacing: 1, textTransform: 'uppercase' }}>Vitórias</div>
              </div>
            )}
            {entry.finals > 0 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: RG.display, fontSize: 22, color: RG.gold }}>{entry.finals}</div>
                <div style={{ fontFamily: RG.mono, fontSize: 6, color: RG.textFaint, letterSpacing: 1, textTransform: 'uppercase' }}>Finais</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Atributo que mais cresceu / caiu */}
      {(topGain || topLoss) && (
        <div>
          <div style={{ fontFamily: RG.mono, fontSize: 7, color: RG.textFaint, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
            Desenvolvimento
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {topGain && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: RG.mono, fontSize: 8 }}>
                <span style={{ color: RG.textDim }}>↑ {ATTR_LABEL[topGain[0]] ?? topGain[0]}</span>
                <span style={{ color: '#22c55e' }}>+{topGain[1]}</span>
              </div>
            )}
            {topLoss && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: RG.mono, fontSize: 8 }}>
                <span style={{ color: RG.textDim }}>↓ {ATTR_LABEL[topLoss[0]] ?? topLoss[0]}</span>
                <span style={{ color: '#ef4444' }}>{topLoss[1]}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lesões */}
      {entry.traitArcNotes?.length > 0 && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={{ fontFamily: RG.mono, fontSize: 7, color: RG.textFaint, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
            Arco de Traits
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {entry.traitArcNotes.map((note, i) => (
              <div
                key={i}
                style={{
                  padding: '5px 10px',
                  background: 'rgba(96,200,255,.07)',
                  border: '1px solid rgba(96,200,255,.22)',
                  fontFamily: RG.mono,
                  fontSize: 7,
                  color: '#60C8FF',
                }}
              >
                {note}
              </div>
            ))}
          </div>
        </div>
      )}

      {entry.injuries?.length > 0 && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={{ fontFamily: RG.mono, fontSize: 7, color: RG.textFaint, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
            Lesões
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {entry.injuries.map((inj, i) => {
              const gradeColor = inj.grade >= 3 ? '#ef4444' : inj.grade >= 2 ? '#f97316' : '#E8C84A';
              return (
                <div key={i} style={{
                  padding: '5px 10px',
                  background: `${gradeColor}08`,
                  border: `1px solid ${gradeColor}33`,
                  fontFamily: RG.mono, fontSize: 7, color: gradeColor,
                }}>
                  <span style={{ marginRight: 5 }}>🩹</span>
                  {INJURY_TYPE_LABEL[inj.type] ?? inj.type ?? 'Lesão'} · Grau {inj.grade}
                  {inj.playedThrough && (
                    <span style={{ color: '#ef4444', marginLeft: 6 }}>JOGOU LESIONADO</span>
                  )}
                  {inj.originTournament && inj.originTournament !== '?' && (
                    <span style={{ color: RG.textFaint, marginLeft: 6 }}>{inj.originTournament}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rivalidades que graduaram */}
      {entry._rivalriesGraduated?.length > 0 && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={{ fontFamily: RG.mono, fontSize: 7, color: RG.textFaint, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
            Rivalidades graduadas
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {entry._rivalriesGraduated.map((r, i) => {
              const oppName = allPlayers?.find(p => p.id === r.oppId)?.name ?? r.oppId;
              const typeIcon = RIVALRY_TYPE_ICON[r.type] ?? '⚔️';
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 10px',
                  background: 'rgba(255,215,0,.05)',
                  border: '1px solid rgba(255,215,0,.2)',
                  fontFamily: RG.mono, fontSize: 7, color: RG.textDim,
                }}>
                  <span>{typeIcon}</span>
                  {oppName}
                  {r.type && <span style={{ color: RG.textFaint, marginLeft: 4 }}>· {r.type}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Patrocínio — marcos do ano */}
      {yearSponsorEvents.length > 0 && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={{ fontFamily: RG.mono, fontSize: 7, color: RG.textFaint, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
            Patrocínio
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {yearSponsorEvents.map((ev, i) => {
              const isElite   = ev.subtype === 'FIRST_ELITE' || ev.subtype === 'ELITE_SIGNING';
              const isLoss    = ev.subtype === 'ELITE_LOSS';
              const evColor   = isElite ? '#FFD700' : isLoss ? '#ef4444' : '#60C8FF';
              const evIcon    = ev.icon ?? (isElite ? '👑' : isLoss ? '💔' : '🤝');
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '5px 10px',
                  background: `${evColor}07`,
                  border: `1px solid ${evColor}28`,
                  fontFamily: RG.mono, fontSize: 7, color: evColor,
                }}>
                  <span>{evIcon}</span>
                  <span style={{ color: RG.textDim }}>{ev.text ?? ev.description ?? 'Marco de patrocínio'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// FAIXA DE UMA TEMPORADA
// ─────────────────────────────────────────────────────────────────

function YearRow({ entry, sc, isFirst, isLast, isSelected, onClick, ovrMin, ovrMax, allPlayers, rivalrySystem, sponsorEvents }) {
  const title = entry.titleWon ? (TITLE_META[entry.titleWon] ?? { color: '#FFD700', icon: '🏆', label: '' }) : null;
  const hasInjury = entry.injuries?.length > 0;
  const hasRivalry = entry._rivalriesGraduated?.length > 0;
  const isDeclineYear = entry.inDecline && !entry._wasAlreadyDecline;
  const isBreakthrough = entry.ovrDelta >= 4;
  const isTopRank = entry.rank && entry.rank <= 5;

  // Barra de OVR relativa ao range da carreira
  const ovrRange = ovrMax - ovrMin || 1;
  const ovrFill = ((entry.ovr - ovrMin) / ovrRange) * 100;

  return (
    <>
      <div
        onClick={onClick}
        style={{
          display: 'grid',
          gridTemplateColumns: '64px 56px 56px 1fr auto',
          alignItems: 'center',
          gap: 12,
          padding: '10px 16px',
          cursor: 'pointer',
          borderBottom: isSelected ? 'none' : `1px solid ${RG.border}`,
          borderLeft: isSelected ? `3px solid ${sc}` : `3px solid transparent`,
          background: isSelected
            ? `${sc}08`
            : isFirst
            ? `linear-gradient(90deg, ${sc}05, transparent)`
            : 'transparent',
          transition: 'background .15s',
          position: 'relative',
        }}
        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = RG.bgLight; }}
        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isFirst ? `linear-gradient(90deg, ${sc}05, transparent)` : 'transparent'; }}
      >
        {/* Ano + idade */}
        <div>
          <div style={{ fontFamily: RG.display, fontSize: 20, color: isSelected ? sc : RG.white, letterSpacing: 1, lineHeight: 1 }}>
            {entry.year}
          </div>
          <div style={{ fontFamily: RG.mono, fontSize: 7, color: RG.textFaint, marginTop: 2 }}>
            {entry.age} anos
          </div>
        </div>

        {/* OVR com mini-barra */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 3 }}>
            <span style={{ fontFamily: RG.display, fontSize: 18, color: ovrTier(entry.ovr).color, lineHeight: 1 }}>{ovrTier(entry.ovr).grade}</span>
            {entry.ovrDelta !== 0 && (
              <span style={{ fontFamily: RG.mono, fontSize: 7, color: entry.ovrDelta > 0 ? '#22c55e' : '#ef4444' }}>
                {entry.ovrDelta > 0 ? '+' : ''}{entry.ovrDelta}
              </span>
            )}
          </div>
          <div style={{ height: 2, background: RG.border, position: 'relative', width: 40 }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, height: '100%',
              width: `${entry.ovr>=90?92:entry.ovr>=78?76:entry.ovr>=65?60:entry.ovr>=52?44:28}%`,
              background: `linear-gradient(90deg, ${ovrTier(entry.ovr).color}88, ${ovrTier(entry.ovr).color})`,
            }} />
          </div>
        </div>

        {/* Ranking */}
        <div style={{ fontFamily: RG.display, fontSize: 18, color: rankColor(entry.rank), lineHeight: 1 }}>
          {entry.rank ? `#${entry.rank}` : '—'}
        </div>

        {/* Badges de eventos */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', minWidth: 0 }}>
          {title && (
            <Badge icon={title.icon} label={title.label} color={title.color} />
          )}
          {entry.titleWhileInjured && (
            <Badge icon="⚡" label="Lesionado" color="#ef4444" small />
          )}
          {isDeclineYear && (
            <Badge icon="↘" label="Declínio" color="#ef4444" small />
          )}
          {isBreakthrough && (
            <Badge icon="↑" label="Salto" color="#22c55e" small />
          )}
          {hasInjury && !entry.titleWhileInjured && (
            <Badge icon="🩹" label={`${entry.injuries.length} lesão${entry.injuries.length > 1 ? 'ões' : ''}`} color="#f97316" small />
          )}
          {hasRivalry && (
            <Badge icon="⚔️" label="Rivalidade" color={RG.gold} small />
          )}
        </div>

        {/* Expand arrow */}
        <div style={{
          fontFamily: RG.mono, fontSize: 9, color: RG.textFaint,
          transform: isSelected ? 'rotate(90deg)' : 'none',
          transition: 'transform .2s',
          flexShrink: 0,
        }}>›</div>
      </div>

      {/* Detalhe expandido */}
      {isSelected && (
        <YearDetail
          entry={entry}
          allPlayers={allPlayers}
          rivalrySystem={rivalrySystem}
          sponsorEvents={sponsorEvents}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// CURVA MINI OVR (sparkline SVG)
// ─────────────────────────────────────────────────────────────────

function OvrSparkline({ history, sc, width = 300, height = 48 }) {
  if (history.length < 2) return null;

  const ovrs = history.map(h => h.ovr);
  const mins = Math.min(...ovrs);
  const maxs = Math.max(...ovrs);
  const range = maxs - mins || 1;
  const pad = 6;

  const pts = history.map((h, i) => {
    const x = pad + (i / (history.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (h.ovr - mins) / range) * (height - pad * 2);
    return [x, y, h];
  });

  const pathD = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const fillD = `${pathD} L${pts[pts.length - 1][0].toFixed(1)},${height} L${pts[0][0].toFixed(1)},${height} Z`;

  return (
    <svg width={width} height={height} style={{ overflow: 'visible', flexShrink: 0 }}>
      <defs>
        <linearGradient id="ovrFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={sc} stopOpacity="0.25" />
          <stop offset="100%" stopColor={sc} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Fill area */}
      <path d={fillD} fill="url(#ovrFill)" />
      {/* Line */}
      <path d={pathD} fill="none" stroke={sc} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.7" />
      {/* Dots for key events */}
      {pts.map(([x, y, h], i) => {
        if (!h.titleWon && !h.inDecline && !h.titleWhileInjured) return null;
        const dotColor = h.titleWon ? '#FFD700' : h.titleWhileInjured ? '#ef4444' : '#ef4444';
        return (
          <circle key={i} cx={x} cy={y} r={3} fill={dotColor} stroke={RG.bg} strokeWidth={1.5} />
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────

export default function CarreiraTimeline({ np, sc, rivalrySystem, allPlayers, year, sponsorEvents }) {
  const [selectedYear, setSelectedYear] = useState(null);
  const [momentFilter, setMomentFilter] = useState('ALL');
  const identityProfile = useMemo(
    () => (np ? buildPlayerIdentity(np, { surfaceKey: np?.surfaceIdentity?.surface ?? null, year }) : null),
    [np, year]
  );
  const publicNarrative = np?.currentState?.publicNarrative ?? np?.publicNarrativeMemory?.publicNarrative?.line ?? null;
  const latestInterview = np?.latestInterview ?? null;
  const youthJourney = useMemo(() => {
    const youth = np?.youthProfile;
    if (!youth) return null;
    const junior = youth.junior ?? {};
    return {
      origin: buildYouthOriginSummary(youth),
      academy: describeYouthAcademy(youth.academy),
      junior: junior.status === 'ACTIVE'
        ? `${junior.titles ?? 0} títulos · nível ${String(junior.peakTier ?? 'regional').replace(/_/g, ' ').toLowerCase()}`
        : junior.status === 'GRADUATED'
          ? `graduou-se do juvenil em ${junior.graduationYear ?? '—'}`
          : null,
      transition: youth.transition?.status === 'PRO_DEBUT'
        ? `estreia profissional: ${String(youth.transition.route ?? 'graduação juvenil').replace(/_/g, ' ').toLowerCase()}`
        : null,
    };
  }, [np]);
  const momentEvents = useMemo(
    () => buildPlayerMomentEvents(np, { sponsorEvents }),
    [np, sponsorEvents]
  );
  const visibleMoments = useMemo(() => momentEvents.filter(event =>
    momentFilter === 'ALL' || event.category === momentFilter
  ), [momentEvents, momentFilter]);
  const momentGroups = useMemo(() => {
    const groups = new Map();
    visibleMoments.forEach(event => {
      if (!groups.has(event.year)) groups.set(event.year, []);
      groups.get(event.year).push(event);
    });
    return [...groups.entries()];
  }, [visibleMoments]);

  // ── Construir timeline enriquecida ──────────────────────────────
  const timeline = useMemo(() => {
    const history = [...(np._seasonHistory ?? [])].sort((a, b) => b.year - a.year);
    if (!history.length) return [];

    // Mapa de rivalidades por temporada de graduação
    const rivalGradByYear = {};
    if (rivalrySystem?.rivalries) {
      for (const [, r] of rivalrySystem.rivalries) {
        if (!r.graduatedSeason) continue;
        const isInvolved = r.p1Id === np.id || r.p2Id === np.id;
        if (!isInvolved) continue;
        const yr = r.graduatedSeason;
        if (!rivalGradByYear[yr]) rivalGradByYear[yr] = [];
        rivalGradByYear[yr].push({
          oppId: r.p1Id === np.id ? r.p2Id : r.p1Id,
          type: r.type,
          intensity: r.intensity,
        });
      }
    }

    // Detectar primeiro ano de declínio (flag para não repetir)
    let declineStarted = false;

    return history.map((entry, idx) => {
      const isDeclineYear = entry.inDecline && !declineStarted;
      if (entry.inDecline) declineStarted = true;

      return {
        ...entry,
        _rivalriesGraduated: rivalGradByYear[entry.year] ?? [],
        _wasAlreadyDecline: entry.inDecline && !isDeclineYear,
        isDeclineYear,
      };
    });
  }, [np, rivalrySystem, year]);

  // ── OVR range para normalização das barras ──────────────────────
  const ovrMin = timeline.length ? Math.min(...timeline.map(h => h.ovr)) : 60;
  const ovrMax = timeline.length ? Math.max(...timeline.map(h => h.ovr)) : 90;

  // ── Estatísticas de carreira calculadas da timeline ─────────────
  const totalTitles = timeline.filter(h => h.titleWon).length;
  const peakRank    = timeline.reduce((best, h) => h.rank ? Math.min(best, h.rank) : best, 999);
  const peakOvr     = ovrMax;
  const totalInjuries = timeline.reduce((s, h) => s + (h.injuries?.length ?? 0), 0);
  const seasonsPlayed = timeline.length;

  // Sem dados
  if (!timeline.length && !momentEvents.length && !youthJourney) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '80px 0', gap: 12,
      }}>
        <div style={{ fontSize: 48, opacity: .2 }}>📅</div>
        <div style={{ fontFamily: RG.display, fontSize: 18, letterSpacing: 6, color: RG.textFaint, textTransform: 'uppercase' }}>
          Linha do Tempo Vazia
        </div>
        <div style={{ fontFamily: RG.mono, fontSize: 9, letterSpacing: 2, color: `${RG.textFaint}88`, textTransform: 'uppercase', textAlign: 'center', maxWidth: 280 }}>
          Os dados aparecem ao avançar as temporadas do universo
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>

      {/* ── HEADER: Curva de Evolução + stats de carreira ── */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: `1px solid ${RG.border}`,
        background: RG.bgMid,
      }}>
        {identityProfile && (
          <div style={{
            marginBottom: 16,
            padding: '14px 16px',
            background: 'linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.015))',
            border: `1px solid ${sc}22`,
            borderLeft: `3px solid ${sc}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: RG.mono, fontSize: 7, letterSpacing: 2.5, color: `${sc}CC`, textTransform: 'uppercase', marginBottom: 5 }}>
                  Temporada em foco
                </div>
                <div style={{ fontFamily: RG.display, fontSize: 24, color: RG.white, lineHeight: 1 }}>
                  {identityProfile.seasonArc?.label ?? 'Temporada em aberto'}
                </div>
                <div style={{ fontFamily: RG.body, fontSize: 12.5, color: RG.textDim, lineHeight: 1.55, marginTop: 6 }}>
                  {identityProfile.seasonArc?.summary ?? identityProfile.signature.subline}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {[identityProfile.signature.reputationTag, identityProfile.signature.formTag, identityProfile.signature.contradictionTag].filter(Boolean).map((tag) => (
                  <span key={tag} style={{ fontFamily: RG.mono, fontSize: 7, color: RG.white, border: `1px solid ${sc}26`, padding: '4px 7px', letterSpacing: 1.1, textTransform: 'uppercase' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            {publicNarrative && (
              <div style={{ marginTop: 10, fontFamily: RG.body, fontSize: 12.5, fontStyle: 'italic', color: RG.textDim, lineHeight: 1.55 }}>
                "{publicNarrative}"
              </div>
            )}
            {latestInterview?.quote && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${RG.border}` }}>
                <div style={{ fontFamily: RG.mono, fontSize: 6, letterSpacing: 2, color: RG.textFaint, textTransform: 'uppercase', marginBottom: 4 }}>
                  Última voz pública
                </div>
                <div style={{ fontFamily: RG.body, fontSize: 12.5, color: RG.white, lineHeight: 1.55 }}>
                  {latestInterview.quote}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stats banner */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Temporadas', value: seasonsPlayed, color: RG.textDim },
            { label: 'Títulos',    value: totalTitles, color: totalTitles > 0 ? '#FFD700' : RG.textFaint },
            { label: 'Melhor Fase', value: ovrTier(peakOvr).grade, color: ovrTier(peakOvr).color },
            { label: 'Pico Rank',  value: peakRank < 999 ? `#${peakRank}` : '—', color: rankColor(peakRank < 999 ? peakRank : null) },
            { label: 'Lesões',     value: totalInjuries, color: totalInjuries > 3 ? '#ef4444' : totalInjuries > 0 ? '#f97316' : RG.textFaint },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: 'rgba(255,255,255,.02)', border: `1px solid ${RG.border}`,
              padding: '10px 8px', textAlign: 'center',
              clipPath: 'polygon(5px 0,100% 0,calc(100% - 5px) 100%,0 100%)',
            }}>
              <div style={{ fontFamily: RG.display, fontSize: 22, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontFamily: RG.mono, fontSize: 6, letterSpacing: 2, color: RG.textFaint, textTransform: 'uppercase', marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Sparkline */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
          <div>
            <div style={{ fontFamily: RG.mono, fontSize: 6, letterSpacing: 2, color: RG.textFaint, textTransform: 'uppercase', marginBottom: 4 }}>
              Curva de Evolução
            </div>
            <OvrSparkline history={[...timeline].reverse()} sc={sc} />
          </div>
          <div style={{ fontFamily: RG.mono, fontSize: 7, color: RG.textFaint, paddingBottom: 6 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ color: '#FFD700' }}>● Título</span>
              <span style={{ color: '#ef4444' }}>● Lesionado</span>
              <span style={{ color: '#ef4444' }}>↘ Declínio</span>
            </div>
          </div>
        </div>
      </div>

      {youthJourney && (
        <div style={{ padding: '16px', borderBottom: `1px solid ${RG.border}`, background: 'linear-gradient(135deg, rgba(198,156,255,.09), transparent 68%)' }}>
          <div style={{ fontFamily: RG.display, fontSize: 20, letterSpacing: 1.5, color: RG.white, textTransform: 'uppercase' }}>Antes do Tour</div>
          <div style={{ fontFamily: RG.body, fontSize: 11, color: RG.textDim, lineHeight: 1.55, marginTop: 4 }}>A formação que explica o jogador antes da primeira temporada profissional.</div>
          <div style={{ display: 'grid', gap: 7, marginTop: 12 }}>
            {[
              ['ORIGEM', youthJourney.origin, '#C69CFF'],
              ['ACADEMIA', youthJourney.academy, '#76C7FF'],
              ['JUVENIL', youthJourney.junior, '#78D6A6'],
              ['TRANSIÇÃO', youthJourney.transition, '#F0C86A'],
            ].filter(([, text]) => text).map(([label, text, color]) => (
              <div key={label} style={{ borderLeft: `2px solid ${color}`, padding: '5px 9px', background: `${color}0A` }}>
                <div style={{ fontFamily: RG.mono, fontSize: 6.5, letterSpacing: 1.5, color, textTransform: 'uppercase' }}>{label}</div>
                <div style={{ fontFamily: RG.body, fontSize: 10.5, lineHeight: 1.45, color: RG.textDim, marginTop: 2 }}>{text}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── LINHA DA VIDA: fatos que explicam quem este jogador se tornou ── */}
      {momentEvents.length > 0 && (
        <div style={{ padding: '18px 16px 8px', borderBottom: `1px solid ${RG.border}`, background: 'linear-gradient(180deg, rgba(255,255,255,.018), transparent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
            <div>
              <div style={{ fontFamily: RG.display, fontSize: 21, letterSpacing: 1.4, color: RG.white, textTransform: 'uppercase' }}>Linha da vida</div>
              <div style={{ fontFamily: RG.body, fontSize: 11, color: RG.textDim, marginTop: 2 }}>O que aconteceu dentro e fora da quadra.</div>
            </div>
            <span style={{ fontFamily: RG.mono, fontSize: 7, color: sc, letterSpacing: 1.5 }}>{momentEvents.length} MOMENTOS</span>
          </div>

          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
            {[
              ['ALL', 'Tudo'], ['FORMACAO', 'Formação'], ['QUADRA', 'Quadra'], ['PERSONAL', 'Vida'], ['SAUDE', 'Saúde'],
              ['NEGOCIOS', 'Mídia'], ['EQUIPE', 'Equipe'],
            ].map(([id, label]) => (
              <button key={id} onClick={() => setMomentFilter(id)} style={{
                border: `1px solid ${momentFilter === id ? sc : RG.borderMid}`,
                color: momentFilter === id ? RG.white : RG.textDim,
                background: momentFilter === id ? `${sc}22` : 'rgba(255,255,255,.015)',
                padding: '4px 7px', cursor: 'pointer', fontFamily: RG.mono, fontSize: 6.5,
                letterSpacing: 1, textTransform: 'uppercase',
              }}>{label}</button>
            ))}
          </div>

          <div style={{ position: 'relative', paddingLeft: 17 }}>
            <div style={{ position: 'absolute', left: 3, top: 4, bottom: 16, width: 1, background: `linear-gradient(${sc}77, ${RG.border})` }} />
            {momentGroups.map(([momentYear, events]) => (
              <div key={momentYear} style={{ position: 'relative', paddingBottom: 14 }}>
                <div style={{ position: 'absolute', left: -17, top: 3, width: 8, height: 8, borderRadius: '50%', background: RG.bgPanel, border: `2px solid ${events[0]?.color ?? sc}`, boxShadow: `0 0 12px ${events[0]?.color ?? sc}55` }} />
                <div style={{ fontFamily: RG.mono, fontSize: 7, color: events[0]?.color ?? sc, letterSpacing: 1.8, marginBottom: 6 }}>{momentYear}</div>
                {events.map((event, index) => (
                  <div key={`${event.type}-${index}`} style={{ padding: '8px 10px', marginBottom: 5, borderLeft: `2px solid ${event.color}`, background: `${event.color}0B`, borderTop: `1px solid ${event.color}18`, borderRight: `1px solid ${event.color}18`, borderBottom: `1px solid ${event.color}18` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: RG.mono, fontSize: 6.5, color: event.color, letterSpacing: 1.2, textTransform: 'uppercase' }}><span>{event.icon}</span>{event.category}</div>
                    <div style={{ fontFamily: RG.cond, fontWeight: 800, fontSize: 14, lineHeight: 1.1, color: RG.white, marginTop: 4, textTransform: 'uppercase' }}>{event.title}</div>
                    {event.subtitle && <div style={{ fontFamily: RG.body, fontSize: 10.5, lineHeight: 1.45, color: RG.textDim, marginTop: 4 }}>{event.subtitle}</div>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CABEÇALHO DA LISTA ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '64px 56px 56px 1fr auto',
        gap: 12,
        padding: '7px 16px',
        borderBottom: `1px solid ${RG.borderMid}`,
        background: RG.bgPanel,
      }}>
        {['Ano', 'Nível', 'Rank', 'Eventos', ''].map(h => (
          <div key={h} style={{ fontFamily: RG.mono, fontSize: 7, color: RG.textFaint, textTransform: 'uppercase', letterSpacing: 1 }}>
            {h}
          </div>
        ))}
      </div>

      {/* ── LISTA DE TEMPORADAS ── */}
      <div>
        {timeline.map((entry, idx) => (
          <YearRow
            key={entry.year}
            entry={entry}
            sc={sc}
            isFirst={idx === 0}
            isLast={idx === timeline.length - 1}
            isSelected={selectedYear === entry.year}
            onClick={() => setSelectedYear(selectedYear === entry.year ? null : entry.year)}
            ovrMin={ovrMin}
            ovrMax={ovrMax}
            allPlayers={allPlayers}
            rivalrySystem={rivalrySystem}
            sponsorEvents={sponsorEvents}
          />
        ))}
      </div>

      {/* Legenda */}
      <div style={{
        padding: '10px 16px',
        borderTop: `1px solid ${RG.border}`,
        display: 'flex', gap: 14, flexWrap: 'wrap',
      }}>
        {[
          { icon: '⭐', label: 'Grand Slam', color: '#FFD700' },
          { icon: '⚡', label: 'Título lesionado', color: '#ef4444' },
          { icon: '↘', label: 'Início do declínio', color: '#ef4444' },
          { icon: '↑', label: 'Avanço de nível', color: '#22c55e' },
          { icon: '⚔️', label: 'Rivalidade graduada', color: RG.gold },
          { icon: '🤝', label: 'Marco patrocínio', color: '#60C8FF' },
        ].map(({ icon, label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: RG.mono, fontSize: 7, color: RG.textFaint }}>
            <span style={{ color }}>{icon}</span> {label}
          </div>
        ))}
      </div>
    </div>
  );
}



