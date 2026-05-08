/**
 * TécnicosView.jsx
 * ─────────────────────────────────────────────────────────────────
 * Aba "TÉCNICOS" do Broadcast Hub.
 *
 * Seções:
 *   - Filtros (filosofia, disponibilidade, busca)
 *   - Lista de técnicos com card compacto
 *   - Detalhe expandido ao clicar (CoachProfileView integrado)
 *
 * Props:
 *   state       {object}  — universeState
 */

import { useState, useMemo } from 'react';
import CoachProfileView from './CoachProfileView.jsx';
import {
  PHILOSOPHY_ATTRS,
  SURFACE_SPECIALTY_ATTRS,
} from '../../systems/coaches/CoachingSystem.js';
import {
  coachOverallRating,
  coachGrade,
} from '../../systems/coaches/CoachProfiles.js';
import { getTacticSummary } from '../../systems/coaches/CoachTacticTracker.js';
import { INSTRUCTION_ICONS } from '../../systems/coaches/CoachAdvisor.js';
import { getArchetypeDef } from '../../systems/coaches/CoachArchetypes.js';

// ─────────────────────────────────────────────────────────────────
// TOKENS
// ─────────────────────────────────────────────────────────────────

const T = {
  bg:       '#06080A',
  bgCard:   '#0D1318',
  bgHover:  '#141C22',
  border:   'rgba(242,237,228,.07)',
  borderMd: 'rgba(242,237,228,.14)',
  white:    '#F2EDE4',
  dim:      'rgba(242,237,228,.55)',
  faint:    'rgba(242,237,228,.28)',
  gold:     '#E8C84A',
  mono:     "'Space Mono', monospace",
  display:  "'Bebas Neue', sans-serif",
  body:     "'Barlow', sans-serif",
  cond:     "'Barlow Condensed', sans-serif",
};

const PHIL = {
  OFFENSIVE:  { label: 'Ofensivo',     icon: '⚡', color: '#F06428' },
  DEFENSIVE:  { label: 'Defensivo',    icon: '🛡️', color: '#2860A8' },
  COMPLETE:   { label: 'Completo',     icon: '⚖️', color: '#22c55e' },
  SPECIALIST: { label: 'Especialista', icon: '🏺', color: '#E8C84A' },
  MENTAL:     { label: 'Mental',       icon: '🧠', color: '#AA44FF' },
};

const SURF = {
  CLAY:   { label: 'Saibro', color: '#D4561E' },
  GRASS:  { label: 'Grama',  color: '#1C6B38' },
  HARD:   { label: 'Dura',   color: '#2860A8' },
  INDOOR: { label: 'Indoor', color: '#8B2FAA' },
};

const AVAIL = {
  FREE:       { label: 'Disponível', color: '#22c55e' },
  CONTRACTED: { label: 'Contratado', color: '#E8C84A' },
  INACTIVE:   { label: 'Inativo',    color: 'rgba(242,237,228,.28)' },
};

// ─────────────────────────────────────────────────────────────────
// CARD COMPACTO DE TÉCNICO
// ─────────────────────────────────────────────────────────────────

function CoachRow({ coach, allPlayers, isSelected, onClick }) {
  const phil    = PHIL[coach.philosophy] ?? { label: coach.philosophy, icon: '🎾', color: T.white };
  const avail   = AVAIL[coach.availability] ?? AVAIL.FREE;
  const ovr     = coachOverallRating(coach.coachAttrs);
  const grade   = coachGrade(ovr);
  const surf    = coach.specialtySurface ? SURF[coach.specialtySurface] : null;
  const pupil   = coach.currentPupilId
    ? allPlayers?.find(p => p.id === coach.currentPupilId)
    : null;
  const isExPro = coach.origin === 'RETIRED_PLAYER';
  const trust   = pupil ? (pupil.coach?.trust ?? null) : null;
  const trustPct = trust !== null ? Math.round(trust * 100) : null;
  const trustColor = trustPct >= 70 ? '#22c55e' : trustPct >= 40 ? T.gold : '#ef4444';
  const archDef = getArchetypeDef(coach.archetypeId);

  const tacticSummary = coach._tacticHistory?.length
    ? getTacticSummary(coach)
    : null;

  return (
    <div
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: '44px 1fr 100px 80px 70px 80px',
        alignItems: 'center',
        gap: 12,
        padding: '11px 16px',
        background: isSelected ? `${phil.color}0C` : 'transparent',
        borderBottom: `1px solid ${T.border}`,
        borderLeft: isSelected ? `2px solid ${phil.color}` : '2px solid transparent',
        cursor: 'pointer',
        transition: 'background .15s',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = T.bgHover; }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
    >
      {/* OVR / Grade */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: T.display, fontSize: 22, color: phil.color, lineHeight: 1 }}>{grade}</div>
        <div style={{ fontFamily: T.mono, fontSize: 7, color: T.faint }}>{ovr}</div>
      </div>

      {/* Nome + meta */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <div style={{
            fontFamily: T.cond, fontSize: 14, fontWeight: 700,
            color: T.white, letterSpacing: .5,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {coach.fullName ?? coach.name}
          </div>
          {isExPro && (
            <span style={{ fontFamily: T.mono, fontSize: 6, color: T.gold, border: `1px solid ${T.gold}55`, padding: '1px 4px', flexShrink: 0 }}>
              EX-PRO
            </span>
          )}
        </div>
        <div style={{ fontFamily: T.mono, fontSize: 7, color: T.faint, letterSpacing: 1 }}>
          {coach.nationality}
          {isExPro && coach.careerPeakRank && ` · Pico #${coach.careerPeakRank}`}
          {isExPro && coach.careerSlams > 0 && ` · ${coach.careerSlams} Slams`}
        </div>
        {archDef && (
          <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:3 }}>
            <span style={{ fontSize:9 }}>{archDef.icon}</span>
            <span style={{ fontFamily:T.mono, fontSize:6, color:phil.color, letterSpacing:.5 }}>
              {archDef.name}
            </span>
          </div>
        )}
        {pupil && (
          <div style={{ fontFamily: T.mono, fontSize: 7, color: '#22c55e', marginTop: 2 }}>
            ▸ {pupil.name}
            {trustPct !== null && (
              <span style={{ color: trustColor, marginLeft: 6 }}>Confiança {trustPct}%</span>
            )}
          </div>
        )}
      </div>

      {/* Filosofia */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 12 }}>{phil.icon}</span>
        <div>
          <div style={{ fontFamily: T.mono, fontSize: 7, color: phil.color, letterSpacing: 1 }}>{phil.label}</div>
          {surf && (
            <div style={{ fontFamily: T.mono, fontSize: 7, color: surf.color, marginTop: 1 }}>{surf.label}</div>
          )}
        </div>
      </div>

      {/* Reputação */}
      <div>
        <div style={{ fontFamily: T.mono, fontSize: 7, color: T.faint, marginBottom: 3, letterSpacing: 1 }}>REP</div>
        <div style={{ height: 3, background: 'rgba(242,237,228,.08)', position: 'relative' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, height: '100%',
            width: `${coach.reputation}%`, background: phil.color,
          }} />
        </div>
        <div style={{ fontFamily: T.mono, fontSize: 8, color: phil.color, marginTop: 2 }}>{coach.reputation}</div>
      </div>

      {/* Tático resumo */}
      <div style={{ textAlign: 'center' }}>
        {tacticSummary ? (
          <>
            <div style={{ fontFamily: T.display, fontSize: 18, color: tacticSummary.workedRate >= 50 ? '#22c55e' : T.gold }}>
              {tacticSummary.workedRate}%
            </div>
            <div style={{ fontFamily: T.mono, fontSize: 6, color: T.faint, letterSpacing: 1 }}>EFICÁCIA</div>
          </>
        ) : (
          <div style={{ fontFamily: T.mono, fontSize: 7, color: T.faint }}>—</div>
        )}
      </div>

      {/* Status */}
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: T.mono, fontSize: 7, color: avail.color, letterSpacing: 1 }}>
          ● {avail.label}
        </div>
        {coach.formerPupils?.length > 0 && (
          <div style={{ fontFamily: T.mono, fontSize: 7, color: T.faint, marginTop: 2 }}>
            {coach.formerPupils.length} pupilos
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// PAINEL TÁTICO (integrado na ficha quando coach tem histórico)
// ─────────────────────────────────────────────────────────────────

function TaticoPainel({ coach }) {
  const summary = getTacticSummary(coach);
  const reports = summary?.recentReports ?? [];

  if (!summary) {
    return (
      <div className="ui-empty-state" style={{ minHeight: 220 }}>
        <div className="ui-empty-kicker">Painel tático</div>
        <div className="ui-empty-title" style={{ fontSize: 28 }}>Sem relatórios ainda</div>
        <div className="ui-empty-copy">Os relatórios táticos aparecem após changeovers em partidas acompanhadas.</div>
      </div>
    );
  }

  const DIAG_META = {
    executed_worked:  { icon: '✓', color: '#22c55e', label: 'Executado e funcionou' },
    executed_neutral: { icon: '→', color: T.gold,    label: 'Execução / neutro'    },
    executed_failed:  { icon: '↺', color: '#F06428', label: 'Execução / sem efeito'},
    ignored_worked:   { icon: '?', color: T.gold,    label: 'Não seguido / ok'      },
    ignored_failed:   { icon: '✗', color: '#ef4444', label: 'Não seguido / falhou'  },
    partial:          { icon: '~', color: '#94a3b8', label: 'Parcial'               },
  };

  return (
    <div style={{ padding: '20px 24px' }}>

      {/* Stats topo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
        {[
          { label: 'Instruções', value: summary.total, color: T.dim },
          { label: 'Taxa de Execução', value: `${summary.executedRate}%`, color: summary.executedRate >= 60 ? '#22c55e' : T.gold },
          { label: 'Eficácia', value: `${summary.workedRate}%`, color: summary.workedRate >= 50 ? '#22c55e' : '#F06428' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: 'rgba(255,255,255,.03)', border: `1px solid ${T.border}`,
            padding: '12px 8px', textAlign: 'center',
          }}>
            <div style={{ fontFamily: T.display, fontSize: 26, color }}>{value}</div>
            <div style={{ fontFamily: T.mono, fontSize: 7, color: T.faint, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Por tipo de instrução */}
      {Object.keys(summary.byType).length > 0 && (
        <>
          <div style={{ fontFamily: T.mono, fontSize: 8, letterSpacing: 4, color: T.faint, textTransform: 'uppercase', marginBottom: 10 }}>
            Por instrução
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
            {Object.entries(summary.byType).map(([type, stats]) => {
              const pct = Math.round((stats.worked / stats.total) * 100);
              const exPct = Math.round((stats.executed / stats.total) * 100);
              const icon = INSTRUCTION_ICONS[type] ?? '🎯';
              return (
                <div key={type} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', background: 'rgba(242,237,228,.02)',
                  border: `1px solid ${T.border}`,
                }}>
                  <span style={{ fontSize: 14 }}>{icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: T.mono, fontSize: 8, color: T.dim, marginBottom: 3 }}>{type}</div>
                    <div style={{ height: 2, background: 'rgba(242,237,228,.08)', position: 'relative' }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${exPct}%`, background: 'rgba(242,237,228,.2)' }} />
                      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: pct >= 50 ? '#22c55e' : T.gold }} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: T.display, fontSize: 16, color: pct >= 50 ? '#22c55e' : T.gold }}>{pct}%</div>
                    <div style={{ fontFamily: T.mono, fontSize: 6, color: T.faint }}>{stats.total} usos</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Últimos relatórios */}
      {reports.length > 0 && (
        <>
          <div style={{ fontFamily: T.mono, fontSize: 8, letterSpacing: 4, color: T.faint, textTransform: 'uppercase', marginBottom: 10 }}>
            Últimas instruções
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {reports.map((r, i) => {
              const dm = DIAG_META[r.diagKey] ?? DIAG_META.partial;
              return (
                <div key={i} style={{
                  padding: '10px 12px',
                  background: 'rgba(0,0,0,.2)',
                  border: `1px solid ${dm.color}22`,
                  borderLeft: `3px solid ${dm.color}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: dm.color }}>{dm.icon}</span>
                    <span style={{ fontFamily: T.mono, fontSize: 7, color: dm.color, letterSpacing: 1 }}>{dm.label}</span>
                    {r.instruction?.type && (
                      <span style={{ fontFamily: T.mono, fontSize: 7, color: T.faint, marginLeft: 'auto' }}>
                        {INSTRUCTION_ICONS[r.instruction.type]} {r.instruction.type}
                      </span>
                    )}
                  </div>
                  {r.complianceLabel && (
                    <div style={{ fontFamily: T.mono, fontSize: 8, color: T.dim, marginBottom: 3 }}>
                      {r.complianceLabel}
                      {r.complianceDetail && <span style={{ color: T.faint }}> {r.complianceDetail}</span>}
                    </div>
                  )}
                  {r.diagText && (
                    <div style={{ fontFamily: T.mono, fontSize: 8, color: dm.color, fontStyle: 'italic', marginTop: 4 }}>
                      "{r.diagText}"
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// FICHA COMPLETA INTEGRADA (CoachProfileView + aba Tático)
// ─────────────────────────────────────────────────────────────────

function CoachDetail({ coach, allPlayers, year, onBack }) {
  if (!coach) return null;
  return (
    <CoachProfileView
      coach={coach}
      year={year}
      allPlayers={allPlayers}
      onBack={onBack}
    />
  );
}

// ─────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────

const FILTER_PHIL = ['TODOS', 'OFFENSIVE', 'DEFENSIVE', 'COMPLETE', 'SPECIALIST', 'MENTAL'];
const FILTER_AVAIL = ['TODOS', 'FREE', 'CONTRACTED'];

export default function TécnicosView({ state }) {
  const [filterPhil,  setFilterPhil]  = useState('TODOS');
  const [filterAvail, setFilterAvail] = useState('TODOS');
  const [search,      setSearch]      = useState('');
  const [selected,    setSelected]    = useState(null);
  const [sortBy,      setSortBy]      = useState('rep'); // 'rep' | 'ovr' | 'name' | 'tactic'

  const coachPool  = state?.coachPool  ?? [];
  const allPlayers = [...(state?.players ?? []), ...(state?.prospects ?? [])];
  const year       = state?.year ?? 1;

  const filtered = useMemo(() => {
    let list = coachPool;

    if (filterPhil !== 'TODOS') list = list.filter(c => c.philosophy === filterPhil);
    if (filterAvail !== 'TODOS') list = list.filter(c => c.availability === filterAvail);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        (c.fullName ?? c.name ?? '').toLowerCase().includes(q) ||
        (c.nationality ?? '').toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      if (sortBy === 'rep') return (b.reputation ?? 0) - (a.reputation ?? 0);
      if (sortBy === 'ovr') return coachOverallRating(b.coachAttrs) - coachOverallRating(a.coachAttrs);
      if (sortBy === 'name') return (a.name ?? '').localeCompare(b.name ?? '');
      if (sortBy === 'tactic') {
        const ta = getTacticSummary(a)?.workedRate ?? -1;
        const tb = getTacticSummary(b)?.workedRate ?? -1;
        return tb - ta;
      }
      return 0;
    });
  }, [coachPool, filterPhil, filterAvail, search, sortBy]);

  const selectedCoach = selected
    ? coachPool.find(c => c.id === selected)
    : null;

  // Stats gerais
  const contracted = coachPool.filter(c => c.availability === 'CONTRACTED').length;
  const free       = coachPool.filter(c => c.availability === 'FREE').length;
  const exPros     = coachPool.filter(c => c.origin === 'RETIRED_PLAYER').length;

  return (
    <div style={{ minHeight: 600 }}>

      {/* ── Coluna esquerda: lista ── */}
      <div>

        {/* Stats banner */}
        <div style={{
          display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap',
        }}>
          {[
            { label: 'Total de técnicos', value: coachPool.length, color: T.dim },
            { label: 'Disponíveis', value: free, color: '#22c55e' },
            { label: 'Contratados', value: contracted, color: T.gold },
            { label: 'Ex-jogadores', value: exPros, color: '#AA44FF' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              flex: '1 1 100px', padding: '10px 14px',
              background: 'rgba(255,255,255,.02)', border: `1px solid ${T.border}`,
              textAlign: 'center',
            }}>
              <div style={{ fontFamily: T.display, fontSize: 24, color }}>{value}</div>
              <div style={{ fontFamily: T.mono, fontSize: 7, color: T.faint, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>

          {/* Busca */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar técnico..."
            style={{
              fontFamily: T.mono, fontSize: 9, color: T.white,
              background: 'rgba(255,255,255,.04)', border: `1px solid ${T.border}`,
              padding: '6px 10px', outline: 'none', letterSpacing: 1,
              flex: '1 1 140px',
            }}
          />

          {/* Filosofia */}
          {FILTER_PHIL.map(p => {
            const active = filterPhil === p;
            const meta   = PHIL[p];
            return (
              <button key={p} onClick={() => setFilterPhil(p)} style={{
                fontFamily: T.mono, fontSize: 7, letterSpacing: 1,
                padding: '5px 8px', cursor: 'pointer',
                border: `1px solid ${active ? (meta?.color ?? T.white) + '88' : T.border}`,
                background: active ? `${meta?.color ?? T.white}12` : 'transparent',
                color: active ? (meta?.color ?? T.white) : T.faint,
                textTransform: 'uppercase',
              }}>
                {meta?.icon ?? ''} {p === 'TODOS' ? 'TODOS' : meta?.label ?? p}
              </button>
            );
          })}

          {/* Disponibilidade */}
          <select
            value={filterAvail}
            onChange={e => setFilterAvail(e.target.value)}
            style={{
              fontFamily: T.mono, fontSize: 8, color: T.white,
              background: '#0D1318', border: `1px solid ${T.border}`,
              padding: '5px 8px', outline: 'none', letterSpacing: 1,
            }}
          >
            <option value="TODOS">TODOS STATUS</option>
            <option value="FREE">DISPONÍVEIS</option>
            <option value="CONTRACTED">CONTRATADOS</option>
          </select>

          {/* Ordenação */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{
              fontFamily: T.mono, fontSize: 8, color: T.white,
              background: '#0D1318', border: `1px solid ${T.border}`,
              padding: '5px 8px', outline: 'none', letterSpacing: 1,
            }}
          >
            <option value="rep">REPUTAÇÃO</option>
            <option value="ovr">OVR</option>
            <option value="tactic">EFICÁCIA TÁTICA</option>
            <option value="name">NOME</option>
          </select>
        </div>

        {/* Cabeçalho da lista */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '44px 1fr 100px 80px 70px 80px',
          gap: 12, padding: '6px 16px',
          borderBottom: `1px solid ${T.border}`,
          marginBottom: 2,
        }}>
          {['', 'Técnico', 'Filosofia', 'Reputação', 'Eficácia', 'Status'].map(h => (
            <div key={h} style={{ fontFamily: T.mono, fontSize: 7, color: T.faint, textTransform: 'uppercase', letterSpacing: 1 }}>
              {h}
            </div>
          ))}
        </div>

        {/* Lista */}
        <div style={{ maxHeight: 600, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div className="ui-empty-state" style={{ minHeight: 220 }}>
              <div className="ui-empty-kicker">Equipe técnica</div>
              <div className="ui-empty-title" style={{ fontSize: 28 }}>Nenhum técnico encontrado</div>
              <div className="ui-empty-copy">Ajuste os filtros ou avance o universo para ampliar a base de treinadores disponíveis.</div>
            </div>
          ) : (
            filtered.map(coach => (
              <CoachRow
                key={coach.id}
                coach={coach}
                allPlayers={allPlayers}
                isSelected={selected === coach.id}
                onClick={() => setSelected(selected === coach.id ? null : coach.id)}
              />
            ))
          )}
        </div>
        <div style={{ fontFamily: T.mono, fontSize: 7, color: T.faint, padding: '8px 16px', borderTop: `1px solid ${T.border}` }}>
          {filtered.length} técnico{filtered.length !== 1 ? 's' : ''} · clique para ver ficha completa
        </div>
      </div>

      {selectedCoach && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 8000,
          overflowY: 'auto', background: '#0F2218',
        }}>
          <CoachDetail
            coach={selectedCoach}
            allPlayers={allPlayers}
            year={year}
            onBack={() => setSelected(null)}
          />
        </div>
      )}
    </div>
  );
}




