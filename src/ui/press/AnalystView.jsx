/**
 * AnalystView.jsx
 * ─────────────────────────────────────────────────────────────────
 * Mesa de Analistas — Tennis Universe
 *
 * Interface para os cinco analistas do circuito:
 *   VOLKOV    — Estatístico Frio
 *   OKAFOR    — Tático
 *   LENZ      — Historiador
 *   FERREIRA  — Provocador
 *   PARK      — Sistêmica
 *
 * Modos:
 *   PRE  — análises pré-torneio (5 reports)
 *   POST — análises pós-torneio (5 reports + mesa redonda)
 *
 * Integração:
 *   <AnalystView
 *     tournament={tournamentObj}
 *     bracket={bracketResult}       ← null se pré-torneio
 *     players={drawPlayers}         ← array de jogadores no draw
 *     state={universeState}
 *     phase="POST"                  ← "PRE" | "POST"
 *   />
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  ANALYSTS,
  ANALYSIS_TYPES,
  generatePreTournamentAnalysis,
  generatePostTournamentAnalysis,
  getAnalystRoster,
} from '../../systems/analysts/AnalystSystem.js';
import { BROADCAST_THEME as T } from '../theme/uiTheme.js';
import { CALENDAR } from '../../systems/tournaments/TournamentSystem.js';

// ══════════════════════════════════════════════════════════════════
// CSS INJECTION
// ══════════════════════════════════════════════════════════════════

let _cssInjected = false;
function injectCSS() {
  if (_cssInjected) return;
  _cssInjected = true;
  const css = `
/* ── ANALYST VIEW ─────────────────────────────── */
.av-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #050709;
  font-family: 'Barlow', sans-serif;
  color: #F2EDE4;
}

/* Header */
.av-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px 10px;
  border-bottom: 1px solid rgba(242,237,228,.07);
  flex-shrink: 0;
}
.av-header-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 22px;
  letter-spacing: 2px;
  color: #F2EDE4;
}
.av-header-sub {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 12px;
  letter-spacing: 1px;
  color: rgba(242,237,228,.4);
  text-transform: uppercase;
  margin-left: auto;
}
.av-phase-badge {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px;
  letter-spacing: 2px;
  padding: 3px 10px;
  border-radius: 2px;
  text-transform: uppercase;
}
.av-phase-badge.pre  { background: rgba(232,200,74,.12); color: #E8C84A; border: 1px solid rgba(232,200,74,.25); }
.av-phase-badge.post { background: rgba(74,144,217,.12); color: #7BB8F5; border: 1px solid rgba(74,144,217,.25); }

/* Analyst Tabs */
.av-tabs {
  display: flex;
  gap: 2px;
  padding: 10px 20px 0;
  border-bottom: 1px solid rgba(242,237,228,.07);
  flex-shrink: 0;
  overflow-x: auto;
}
.av-tab {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all .15s;
  white-space: nowrap;
  flex-shrink: 0;
}
.av-tab:hover { background: rgba(242,237,228,.04); }
.av-tab.active { border-bottom-color: var(--analyst-color); }
.av-tab-icon { font-size: 16px; }
.av-tab-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 13px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: rgba(242,237,228,.5);
  transition: color .15s;
}
.av-tab.active .av-tab-name { color: #F2EDE4; }
.av-tab-title {
  font-family: 'Barlow', sans-serif;
  font-size: 10px;
  color: rgba(242,237,228,.3);
}
.av-tab-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--analyst-color);
  opacity: 0;
  transition: opacity .15s;
  flex-shrink: 0;
}
.av-tab.active .av-tab-dot { opacity: 1; }

/* Special tab: Mesa Redonda */
.av-tab.roundtable {
  margin-left: auto;
  border: 1px solid rgba(242,237,228,.1);
  border-bottom: 2px solid transparent;
  border-radius: 3px 3px 0 0;
}
.av-tab.roundtable.active {
  border-color: rgba(242,237,228,.2);
  border-bottom-color: #F2EDE4;
}

/* Content */
.av-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.av-content::-webkit-scrollbar { width: 4px; }
.av-content::-webkit-scrollbar-thumb { background: rgba(242,237,228,.12); border-radius: 2px; }

/* Report Card */
.av-report {
  background: #0C1217;
  border: 1px solid rgba(242,237,228,.07);
  border-radius: 4px;
  overflow: hidden;
  transition: border-color .2s;
}
.av-report:hover { border-color: rgba(242,237,228,.12); }

.av-report-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 18px 14px;
  border-bottom: 1px solid rgba(242,237,228,.06);
}
.av-report-analyst-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  width: 52px;
}
.av-report-analyst-icon {
  width: 40px; height: 40px;
  border-radius: 50%;
  background: rgba(242,237,228,.06);
  display: flex; align-items: center; justify-content: center;
  font-size: 18px;
  border: 1px solid var(--analyst-color-alpha);
}
.av-report-analyst-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 9px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--analyst-color);
  text-align: center;
  line-height: 1.2;
}
.av-report-meta { flex: 1; }
.av-report-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: rgba(242,237,228,.4);
  margin-bottom: 6px;
}
.av-report-headline {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 20px;
  letter-spacing: 1.5px;
  line-height: 1.15;
  color: #F2EDE4;
  margin-bottom: 4px;
}
.av-report-lede {
  font-size: 12px;
  color: rgba(242,237,228,.5);
  font-style: italic;
  line-height: 1.4;
}

/* Report Body */
.av-report-body {
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.av-body-para {
  font-size: 13px;
  line-height: 1.65;
  color: rgba(242,237,228,.82);
}
.av-body-para:first-child { font-weight: 500; color: #F2EDE4; }

/* Data strip */
.av-report-data {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 18px 14px;
  border-top: 1px solid rgba(242,237,228,.05);
}
.av-data-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.av-data-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 9px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: rgba(242,237,228,.3);
}
.av-data-value {
  font-family: 'Space Mono', monospace;
  font-size: 13px;
  color: var(--analyst-color);
}

/* Tags */
.av-report-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding: 0 18px 14px;
}
.av-tag {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 10px;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 2px;
  background: rgba(242,237,228,.05);
  color: rgba(242,237,228,.35);
  border: 1px solid rgba(242,237,228,.08);
}

/* Mesa Redonda */
.av-roundtable {
  background: #0A0E13;
  border: 1px solid rgba(242,237,228,.08);
  border-radius: 4px;
  overflow: hidden;
}
.av-rt-header {
  padding: 18px 20px 14px;
  border-bottom: 1px solid rgba(242,237,228,.07);
  background: rgba(242,237,228,.02);
}
.av-rt-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 10px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: rgba(242,237,228,.35);
  margin-bottom: 6px;
}
.av-rt-question {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 24px;
  letter-spacing: 1.5px;
  color: #F2EDE4;
  line-height: 1.15;
}
.av-rt-responses {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: rgba(242,237,228,.04);
}
.av-rt-response {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 14px 20px;
  background: #0A0E13;
  transition: background .15s;
}
.av-rt-response:hover { background: #0C1218; }
.av-rt-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  width: 44px;
}
.av-rt-badge-icon {
  width: 34px; height: 34px;
  border-radius: 50%;
  background: rgba(242,237,228,.06);
  display: flex; align-items: center; justify-content: center;
  font-size: 15px;
  border: 1px solid var(--analyst-color-alpha);
}
.av-rt-badge-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 8px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--analyst-color);
  text-align: center;
}
.av-rt-text {
  font-size: 13px;
  line-height: 1.6;
  color: rgba(242,237,228,.78);
  flex: 1;
  padding-top: 6px;
}

/* Roster Cards (topo da view por analista) */
.av-analyst-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background: #0C1217;
  border: 1px solid var(--analyst-color-alpha);
  border-left: 3px solid var(--analyst-color);
  border-radius: 4px;
  flex-shrink: 0;
}
.av-analyst-card-icon {
  font-size: 28px;
  width: 44px; height: 44px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(242,237,228,.04);
  border-radius: 50%;
}
.av-analyst-card-info { flex: 1; }
.av-analyst-card-name {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 18px;
  letter-spacing: 2px;
  color: var(--analyst-color);
}
.av-analyst-card-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: rgba(242,237,228,.4);
}
.av-analyst-card-obsession {
  font-size: 12px;
  color: rgba(242,237,228,.55);
  font-style: italic;
  margin-top: 3px;
}
.av-analyst-card-outlet {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: rgba(242,237,228,.25);
  text-align: right;
}

/* Empty */
.av-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 10px;
  color: rgba(242,237,228,.25);
}
.av-empty-icon { font-size: 40px; opacity: .3; }
.av-empty-text {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 14px;
  letter-spacing: 2px;
  text-transform: uppercase;
}
  `;
  const el = document.createElement('style');
  el.textContent = css;
  document.head.appendChild(el);
}

// ══════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════

const ANALYST_ORDER = ['VOLKOV', 'OKAFOR', 'LENZ', 'FERREIRA', 'PARK'];
const ANALYST_RELEVANT_CATEGORIES = new Set([
  'ATP_250',
  'ATP_500',
  'MASTERS_1000',
  'SLAM_CLASH',
  'GRAND_SLAM',
  'OLYMPICS',
  'FINALS',
]);

function analystCSSVars(analyst) {
  if (!analyst) return {};
  return {
    '--analyst-color':       analyst.color,
    '--analyst-color-alpha': analyst.color + '28',
  };
}

function isRelevantAnalystTournament(tournament) {
  return !!tournament && ANALYST_RELEVANT_CATEGORIES.has(tournament.category);
}

function buildAnalystBroadcastContext(state = {}) {
  const tourPlayers = Array.isArray(state?.tourPlayers) ? state.tourPlayers : [];
  const prospects = Array.isArray(state?.prospects) ? state.prospects : [];
  const playerPool = [...tourPlayers, ...prospects];
  const tournamentResults = state?.tournamentResults ?? {};
  const calendarIndex = Number.isFinite(state?.calendarIndex) ? state.calendarIndex : 0;

  const eligibleCalendar = CALENDAR.filter(isRelevantAnalystTournament);
  const completedEligible = eligibleCalendar
    .map((tournament, order) => ({
      tournament,
      order,
      result: tournamentResults?.[tournament.id] ?? null,
    }))
    .filter((entry) => entry.result && (entry.result._slim || entry.result.bracket || entry.result.champion))
    .sort((a, b) => b.order - a.order);

  const nextEligible = CALENDAR
    .slice(Math.max(0, calendarIndex))
    .find(isRelevantAnalystTournament) ?? null;

  const latestCompleted = completedEligible[0] ?? null;
  const explicitPlayers = Array.isArray(state?.preparedTournamentPackage?.drawPlayers)
    ? state.preparedTournamentPackage.drawPlayers
    : [];

  const derivedPlayers = explicitPlayers.length
    ? explicitPlayers
    : playerPool;

  return {
    pre: nextEligible
      ? {
          tournament: nextEligible,
          players: derivedPlayers,
          phase: 'PRE',
          contextLabel: 'Próximo evento',
        }
      : null,
    post: latestCompleted
      ? {
          tournament: latestCompleted.tournament,
          bracket: latestCompleted.result?.bracket ?? latestCompleted.result ?? null,
          phase: 'POST',
          contextLabel: 'Último evento',
        }
      : null,
  };
}

// ══════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════

function DataStrip({ data, analyst }) {
  const entries = Object.entries(data ?? {}).filter(([, v]) => v != null && v !== '');
  if (!entries.length) return null;

  const labels = {
    avgRally:     'Rally Médio',
    maxRally:     'Rally Máx.',
    serve1Pct:    '1° Saque %',
    errorBlend:   'Erros Forçados %',
    totalAces:    'Aces',
    totalWinners: 'Winners',
    champion:     'Campeão',
    finalist:     'Finalista',
    surface:      'Superfície',
    upsetCount:   'Upsets',
    champAge:     'Idade',
    hotPlayers:   'Em Forma',
    candidates:   'Azarões',
    specialists:  'Especialistas',
  };

  const shown = entries
    .filter(([k]) => labels[k])
    .slice(0, 6);

  if (!shown.length) return null;

  return (
    <div className="av-report-data" style={analystCSSVars(analyst)}>
      {shown.map(([k, v]) => (
        <div className="av-data-item" key={k}>
          <span className="av-data-label">{labels[k] ?? k}</span>
          <span className="av-data-value">
            {Array.isArray(v) ? v.slice(0,2).join(' · ') : String(v)}
          </span>
        </div>
      ))}
    </div>
  );
}

function ReportCard({ report }) {
  const analyst = report.analyst ?? ANALYSTS[report.type?.id] ?? null;
  const typeInfo = report.type ?? {};

  return (
    <div className="av-report" style={analystCSSVars(analyst)}>
      {/* Header */}
      <div className="av-report-header">
        {analyst && (
          <div className="av-report-analyst-badge">
            <div className="av-report-analyst-icon">{analyst.icon}</div>
            <span className="av-report-analyst-name">{analyst.name.split(' ')[1] ?? analyst.name}</span>
          </div>
        )}
        <div className="av-report-meta">
          <div className="av-report-type-badge">
            <span>{typeInfo.icon ?? '◆'}</span>
            <span>{typeInfo.label ?? 'ANÁLISE'}</span>
          </div>
          <div className="av-report-headline">{report.headline}</div>
          {report.lede && (
            <div className="av-report-lede">{report.lede}</div>
          )}
        </div>
      </div>

      {/* Body */}
      {report.body?.length > 0 && (
        <div className="av-report-body">
          {report.body.map((para, i) => (
            <p key={i} className="av-body-para">{para}</p>
          ))}
        </div>
      )}

      {/* Data */}
      <DataStrip data={report.data} analyst={analyst} />

      {/* Tags */}
      {report.tags?.length > 0 && (
        <div className="av-report-tags">
          {report.tags.map(tag => (
            <span key={tag} className="av-tag">{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function RoundtableCard({ report }) {
  return (
    <div className="av-roundtable">
      <div className="av-rt-header">
        <div className="av-rt-label">🎙️ Mesa Redonda — {report.type?.label ?? 'Debate'}</div>
        <div className="av-rt-question">{report.question}</div>
        {report.lede && (
          <div style={{ fontSize: 12, color: 'rgba(242,237,228,.4)', fontStyle: 'italic', marginTop: 6 }}>
            {report.lede}
          </div>
        )}
      </div>
      <div className="av-rt-responses">
        {(report.responses ?? []).map(resp => {
          const analyst = resp.analyst;
          return (
            <div
              className="av-rt-response"
              key={analyst.id}
              style={analystCSSVars(analyst)}
            >
              <div className="av-rt-badge">
                <div className="av-rt-badge-icon">{analyst.icon}</div>
                <span className="av-rt-badge-name">{analyst.name.split(' ')[1] ?? analyst.name}</span>
              </div>
              <div className="av-rt-text">{resp.position}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnalystCard({ analyst }) {
  return (
    <div className="av-analyst-card" style={analystCSSVars(analyst)}>
      <div className="av-analyst-card-icon">{analyst.icon}</div>
      <div className="av-analyst-card-info">
        <div className="av-analyst-card-name">{analyst.name}</div>
        <div className="av-analyst-card-title">{analyst.title}</div>
        <div className="av-analyst-card-obsession">"{analyst.obsession}"</div>
      </div>
      <div className="av-analyst-card-outlet">{analyst.outlet}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════

export default function AnalystView({
  tournament,
  bracket    = null,
  players    = [],
  state      = {},
  phase      = null,   // "PRE" | "POST" | null (auto-detect)
}) {
  useEffect(() => { injectCSS(); }, []);

  const [activeTab, setActiveTab] = useState('VOLKOV');
  const derivedContext = useMemo(() => buildAnalystBroadcastContext(state), [state]);
  const hasExplicitTournament = !!tournament;
  const [activeContext, setActiveContext] = useState(() => {
    if (hasExplicitTournament) return phase ?? (bracket ? 'POST' : 'PRE');
    if (derivedContext.pre) return 'PRE';
    if (derivedContext.post) return 'POST';
    return 'PRE';
  });

  useEffect(() => {
    if (hasExplicitTournament) {
      setActiveContext(phase ?? (bracket ? 'POST' : 'PRE'));
      return;
    }
    if (activeContext === 'PRE' && !derivedContext.pre && derivedContext.post) {
      setActiveContext('POST');
    } else if (activeContext === 'POST' && !derivedContext.post && derivedContext.pre) {
      setActiveContext('PRE');
    }
  }, [hasExplicitTournament, phase, bracket, activeContext, derivedContext]);

  const sourceContext = hasExplicitTournament
    ? {
        tournament,
        bracket,
        players,
        phase: phase ?? (bracket ? 'POST' : 'PRE'),
        contextLabel: phase ?? (bracket ? 'POST' : 'PRE'),
      }
    : activeContext === 'POST'
      ? derivedContext.post
      : derivedContext.pre;

  const activeTournament = sourceContext?.tournament ?? null;
  const activeBracket = sourceContext?.bracket ?? null;
  const activePlayers = sourceContext?.players ?? [];

  // Auto-detect phase
  const effectivePhase = sourceContext?.phase ?? (phase ?? (bracket ? 'POST' : 'PRE'));

  // Generate reports
  const reports = useMemo(() => {
    if (!activeTournament) return [];
    try {
      if (effectivePhase === 'POST' && activeBracket) {
        return generatePostTournamentAnalysis(activeTournament, activeBracket, state);
      } else {
        return generatePreTournamentAnalysis(activeTournament, activePlayers, state);
      }
    } catch(e) {
      console.warn('AnalystView: error generating reports', e);
      return [];
    }
  }, [activeTournament, activeBracket, activePlayers, state, effectivePhase]);

  // Group reports by analyst
  const reportsByAnalyst = useMemo(() => {
    const map = {};
    for (const id of ANALYST_ORDER) map[id] = [];
    for (const r of reports) {
      if (r.type?.id === 'POST_DEBATE') {
        if (!map['ROUNDTABLE']) map['ROUNDTABLE'] = [];
        map['ROUNDTABLE'].push(r);
      } else if (r.analyst?.id) {
        map[r.analyst.id]?.push(r);
      }
    }
    return map;
  }, [reports]);

  const hasRoundtable = (reportsByAnalyst['ROUNDTABLE']?.length ?? 0) > 0;

  // Current analyst
  const currentAnalyst = activeTab === 'ROUNDTABLE' ? null : ANALYSTS[activeTab];
  const currentReports = reportsByAnalyst[activeTab] ?? [];

  if (!activeTournament) {
    return (
      <div className="av-root">
        <div className="av-empty">
          <div className="av-empty-icon">📐</div>
          <div className="av-empty-text">Sem ATP 250+ para analisar agora</div>
        </div>
      </div>
    );
  }

  return (
    <div className="av-root">
      {/* Header */}
      <div className="av-header">
        <div className="av-header-title">ANALISTAS</div>
        <span style={{ fontSize: 13, color: 'rgba(242,237,228,.5)', fontFamily: "'Barlow Condensed', sans-serif" }}>
          {activeTournament.name}
        </span>
        <div className="av-header-sub" style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {!hasExplicitTournament && (
            <div style={{ display:'flex', gap:6, marginRight:8 }}>
              {derivedContext.pre && (
                <button
                  type="button"
                  onClick={() => setActiveContext('PRE')}
                  style={{
                    border:`1px solid ${activeContext === 'PRE' ? 'rgba(232,200,74,.35)' : 'rgba(242,237,228,.12)'}`,
                    background: activeContext === 'PRE' ? 'rgba(232,200,74,.12)' : 'rgba(255,255,255,.03)',
                    color: activeContext === 'PRE' ? '#E8C84A' : 'rgba(242,237,228,.62)',
                    padding:'5px 9px',
                    borderRadius:3,
                    cursor:'pointer',
                    fontFamily:"'Barlow Condensed', sans-serif",
                    fontSize:10,
                    letterSpacing:'1.6px',
                    textTransform:'uppercase',
                  }}
                >
                  Próximo ATP 250+
                </button>
              )}
              {derivedContext.post && (
                <button
                  type="button"
                  onClick={() => setActiveContext('POST')}
                  style={{
                    border:`1px solid ${activeContext === 'POST' ? 'rgba(123,184,245,.35)' : 'rgba(242,237,228,.12)'}`,
                    background: activeContext === 'POST' ? 'rgba(74,144,217,.12)' : 'rgba(255,255,255,.03)',
                    color: activeContext === 'POST' ? '#7BB8F5' : 'rgba(242,237,228,.62)',
                    padding:'5px 9px',
                    borderRadius:3,
                    cursor:'pointer',
                    fontFamily:"'Barlow Condensed', sans-serif",
                    fontSize:10,
                    letterSpacing:'1.6px',
                    textTransform:'uppercase',
                  }}
                >
                  Último ATP 250+
                </button>
              )}
            </div>
          )}
          <span className={`av-phase-badge ${effectivePhase.toLowerCase()}`}>
            {effectivePhase === 'PRE' ? 'Pré-Torneio' : 'Pós-Torneio'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="av-tabs">
        {ANALYST_ORDER.map(id => {
          const analyst = ANALYSTS[id];
          const count   = reportsByAnalyst[id]?.length ?? 0;
          return (
            <div
              key={id}
              className={`av-tab ${activeTab === id ? 'active' : ''}`}
              style={{ '--analyst-color': analyst.color }}
              onClick={() => setActiveTab(id)}
            >
              <div className="av-tab-dot" />
              <span className="av-tab-icon">{analyst.icon}</span>
              <div>
                <div className="av-tab-name">{analyst.name.split(' ')[1] ?? analyst.name}</div>
                <div className="av-tab-title">{analyst.title}</div>
              </div>
            </div>
          );
        })}

        {/* Mesa Redonda tab */}
        {hasRoundtable && (
          <div
            className={`av-tab roundtable ${activeTab === 'ROUNDTABLE' ? 'active' : ''}`}
            style={{ '--analyst-color': '#F2EDE4' }}
            onClick={() => setActiveTab('ROUNDTABLE')}
          >
            <span className="av-tab-icon">🎙️</span>
            <div>
              <div className="av-tab-name">Mesa Redonda</div>
              <div className="av-tab-title">Debate</div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="av-content">
        {/* Analyst card */}
        {currentAnalyst && (
          <AnalystCard analyst={currentAnalyst} />
        )}

        {/* Reports */}
        {activeTab !== 'ROUNDTABLE' && currentReports.length === 0 && (
          <div className="av-empty">
            <div className="av-empty-icon">{currentAnalyst?.icon ?? '◆'}</div>
            <div className="av-empty-text">Sem análise para este recorte</div>
          </div>
        )}

        {activeTab !== 'ROUNDTABLE' && currentReports.map((report, i) => (
          <ReportCard key={i} report={report} />
        ))}

        {/* Mesa Redonda */}
        {activeTab === 'ROUNDTABLE' && (reportsByAnalyst['ROUNDTABLE'] ?? []).map((report, i) => (
          <RoundtableCard key={i} report={report} />
        ))}
      </div>
    </div>
  );
}


