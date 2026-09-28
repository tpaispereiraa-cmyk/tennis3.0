import React, { useMemo, useState } from 'react';
import BounceMap from '../analytics/BounceMap.jsx';
import ShotDirectionMap from '../analytics/ShotDirectionMap.jsx';
import LandingMap from '../analytics/LandingMap.jsx';
import ContactMap from '../analytics/ContactMap.jsx';
import PatternMap from '../analytics/PatternMap.jsx';
import PositionHeatmap from '../analytics/PositionHeatmap.jsx';
import { readHeat } from '../../systems/analytics/MatchHeat.js';
import { narrateMatch } from '../../systems/press/MatchNarrator.js';
import { BROADCAST_THEME as BASE } from '../theme/uiTheme.js';

const UI = {
  bg: '#05070B',
  panel: '#0B0F17',
  card: '#111722',
  soft: '#171E2A',
  line: 'rgba(255,255,255,.08)',
  line2: 'rgba(255,255,255,.14)',
  text: '#F4EFE7',
  muted: 'rgba(244,239,231,.58)',
  faint: 'rgba(244,239,231,.28)',
  gold: '#E8C84A',
  cyan: '#71D3FF',
  green: '#61D394',
  red: '#F87171',
  violet: '#A78BFA',
  orange: '#F59E0B',
  disp: BASE.disp,
  cond: BASE.cond,
  mono: BASE.mono,
};

const SURFACES = {
  CLAY: { label: 'Saibro', color: '#D06A32' },
  GRASS: { label: 'Grama', color: '#57B66A' },
  HARD: { label: 'Dura', color: '#4A90E2' },
  INDOOR: { label: 'Indoor', color: '#A78BFA' },
  CARPET: { label: 'Carpete', color: '#DC5F8A' },
  STREET: { label: 'Asfalto', color: '#F59E0B' },
};

const safeNum = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
const sum = (arr) => arr.reduce((a, b) => a + safeNum(b), 0);
const pct = (a, b) => safeNum(b) > 0 ? Math.round((safeNum(a) / safeNum(b)) * 100) : 0;
const avg = (arr) => arr?.length ? sum(arr) / arr.length : 0;
const fmt = (v, unit = '') => `${safeNum(v).toFixed(safeNum(v) % 1 ? 1 : 0)}${unit}`;

function getStats(player) {
  return player?.stats ?? {};
}

function buildPlayerLine(player) {
  const s = getStats(player);
  const firstTotal = safeNum(s.serve1Total);
  const rallyLengths = Array.isArray(s.rallyLengths) ? s.rallyLengths : [];
  const netApps = safeNum(s.netApproaches);
  const servePts = safeNum(s.pointsWonServing) + safeNum(s.pointsLostServing);
  const returnPts = safeNum(s.pointsWonReturning) + safeNum(s.pointsLostReturning);
  return {
    name: player?.name ?? 'Jogador',
    color: player?.color ?? UI.gold,
    sets: safeNum(player?.sets),
    firstIn: pct(s.serve1In, firstTotal),
    firstAvg: Math.round(safeNum(s.serve1AvgKmh)),
    aces: safeNum(s.aces),
    dfs: safeNum(s.doubleFaults),
    winners: safeNum(s.winners),
    ue: safeNum(s.unforcedErrors),
    fe: safeNum(s.forcedErrors),
    netPct: pct(s.netPointsWon, netApps),
    netApps,
    holdPct: pct(s.gamesHeld, s.gamesServed),
    breakPct: pct(s.gamesConverted, s.gamesReturned),
    servePct: pct(s.pointsWonServing, servePts),
    returnPct: pct(s.pointsWonReturning, returnPts),
    avgRally: avg(rallyLengths),
    rallyLengths,
    attackIndex: safeNum(s.winners) + safeNum(s.aces) - safeNum(s.unforcedErrors) * 0.75,
    pressure: safeNum(s.breakPointsSaved) + safeNum(s.matchPointsSaved) * 2 + safeNum(s.tiebreaksWon) * 1.5,
  };
}

function inferAnalystNotes(a, b, heatData, maxRally, bounceLog) {
  const notes = [];
  const leader = a.sets >= b.sets ? a : b;
  const serveGap = a.servePct - b.servePct;
  const attackGap = a.attackIndex - b.attackIndex;
  const bounceCount = bounceLog?.length ?? 0;

  notes.push({
    title: `${leader.name} controlou os pontos grandes`,
    text: `O placar veio menos de volume bruto e mais de conversao. O indicador de pressao fechou em ${fmt(leader.pressure)}, com margem importante nos games de servico e nos pontos de ruptura.`,
    tone: UI.gold,
  });

  notes.push({
    title: Math.abs(serveGap) >= 8 ? 'O saque inclinou a quadra' : 'O saque ficou competitivo',
    text: Math.abs(serveGap) >= 8
      ? `${serveGap > 0 ? a.name : b.name} abriu ${Math.abs(serveGap)} pontos percentuais em aproveitamento sacando. Isso muda a geometria do jogo: mais bolas curtas, menos defesa neutra.`
      : `Ninguem fugiu demais no aproveitamento sacando. A diferenca apareceu depois do retorno, na primeira bola de rally e na tolerancia ao erro.`,
    tone: UI.cyan,
  });

  notes.push({
    title: attackGap >= 0 ? `${a.name} teve mais dano liquido` : `${b.name} teve mais dano liquido`,
    text: `O indice agressivo cruza winners, aces e erros nao-forcados. A leitura aqui e de ${Math.abs(attackGap).toFixed(1)} pontos de distancia, suficiente para explicar a sensacao de dominio.`,
    tone: UI.green,
  });

  notes.push({
    title: bounceCount > 30 ? 'Mapa com amostra forte' : 'Mapa ainda com amostra curta',
    text: `${bounceCount} quiques foram registrados. A tela agora usa esse log para separar quique, alvo, direcao, contato, padroes e calor posicional sem depender de um unico painel antigo.`,
    tone: UI.violet,
  });

  if (heatData) {
    notes.push({
      title: `Heat emocional: ${heatData.tier.label}`,
      text: `O pico da partida bateu ${heatData.peak}. Quando esse numero sobe, a tela trata o jogo como evento narrativo, nao so planilha de estatistica.`,
      tone: heatData.tier.color ?? UI.orange,
    });
  }

  if (maxRally >= 12) {
    notes.push({
      title: 'Rallies longos mudaram o tom',
      text: `O maior rally teve ${maxRally} bolas. Esse tipo de ponto pesa no fisico, aumenta erro tardio e revela quem sustenta padrao quando o saque nao resolve.`,
      tone: UI.orange,
    });
  }

  return notes;
}

function ShellButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: 'none',
        borderBottom: `2px solid ${active ? UI.gold : 'transparent'}`,
        background: active ? 'rgba(232,200,74,.08)' : 'transparent',
        color: active ? UI.text : UI.faint,
        cursor: 'pointer',
        fontFamily: UI.mono,
        fontSize: 9,
        letterSpacing: 2.4,
        padding: '14px 8px 12px',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </button>
  );
}

function BigMetric({ label, value, sub, tone = UI.gold }) {
  return (
    <div style={{ background: UI.card, border: `1px solid ${UI.line}`, borderTop: `2px solid ${tone}`, padding: 16, minHeight: 96 }}>
      <div style={{ color: `${tone}CC`, fontFamily: UI.mono, fontSize: 8, letterSpacing: 2.5, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: UI.text, fontFamily: UI.disp, fontSize: 34, fontWeight: 900, lineHeight: .9, marginTop: 10 }}>{value}</div>
      {sub && <div style={{ color: UI.muted, fontFamily: UI.cond, fontSize: 13, lineHeight: 1.35, marginTop: 8 }}>{sub}</div>}
    </div>
  );
}

function CompareRow({ label, a, b, left, right, tone = UI.gold, lowerIsBetter = false }) {
  const av = safeNum(a);
  const bv = safeNum(b);
  const max = Math.max(av, bv, 1);
  const aWin = lowerIsBetter ? av <= bv : av >= bv;
  const bWin = lowerIsBetter ? bv <= av : bv >= av;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px 1fr', alignItems: 'center', gap: 10, borderBottom: `1px solid ${UI.line}`, padding: '10px 0' }}>
      <div style={{ textAlign: 'right' }}>
        <div style={{ color: aWin ? UI.text : UI.faint, fontFamily: UI.disp, fontSize: 25, fontWeight: 800, lineHeight: 1 }}>{left ?? av}</div>
        <div style={{ height: 3, background: 'rgba(255,255,255,.05)', marginTop: 7 }}>
          <div style={{ height: '100%', width: `${Math.max(4, av / max * 100)}%`, marginLeft: 'auto', background: aWin ? tone : 'rgba(255,255,255,.16)' }} />
        </div>
      </div>
      <div style={{ color: UI.faint, fontFamily: UI.mono, fontSize: 8, letterSpacing: 2, textAlign: 'center', textTransform: 'uppercase' }}>{label}</div>
      <div>
        <div style={{ color: bWin ? UI.text : UI.faint, fontFamily: UI.disp, fontSize: 25, fontWeight: 800, lineHeight: 1 }}>{right ?? bv}</div>
        <div style={{ height: 3, background: 'rgba(255,255,255,.05)', marginTop: 7 }}>
          <div style={{ height: '100%', width: `${Math.max(4, bv / max * 100)}%`, background: bWin ? tone : 'rgba(255,255,255,.16)' }} />
        </div>
      </div>
    </div>
  );
}

function Scoreline({ p0, p1 }) {
  const a = p0?.setsHistory ?? [];
  const b = p1?.setsHistory ?? [];
  const size = Math.max(a.length, b.length, 1);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${size}, minmax(70px, 1fr))`, gap: 8 }}>
      {Array.from({ length: size }, (_, i) => {
        const ga = safeNum(a[i]);
        const gb = safeNum(b[i]);
        return (
          <div key={i} style={{ background: UI.panel, border: `1px solid ${UI.line}`, padding: '12px 10px', textAlign: 'center' }}>
            <div style={{ color: UI.faint, fontFamily: UI.mono, fontSize: 8, letterSpacing: 2, textTransform: 'uppercase' }}>Set {i + 1}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, alignItems: 'baseline', marginTop: 8 }}>
              <span style={{ color: ga >= gb ? UI.text : UI.faint, fontFamily: UI.disp, fontSize: 36, fontWeight: 900, lineHeight: .9 }}>{ga}</span>
              <span style={{ color: UI.faint, fontFamily: UI.disp, fontSize: 20 }}>x</span>
              <span style={{ color: gb >= ga ? UI.text : UI.faint, fontFamily: UI.disp, fontSize: 36, fontWeight: 900, lineHeight: .9 }}>{gb}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AnalystDesk({ notes }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
      {notes.map((note) => (
        <div key={note.title} style={{ background: UI.card, border: `1px solid ${UI.line}`, borderLeft: `3px solid ${note.tone}`, padding: 16 }}>
          <div style={{ color: note.tone, fontFamily: UI.mono, fontSize: 8, letterSpacing: 2.4, textTransform: 'uppercase', marginBottom: 8 }}>Analista</div>
          <div style={{ color: UI.text, fontFamily: UI.disp, fontSize: 22, fontWeight: 800, lineHeight: 1.05 }}>{note.title}</div>
          <div style={{ color: UI.muted, fontFamily: UI.cond, fontSize: 14, lineHeight: 1.5, marginTop: 8 }}>{note.text}</div>
        </div>
      ))}
    </div>
  );
}

function NarrativeBlock({ narration, dossier, capsules }) {
  const moments = dossier?.topMoments?.length ? dossier.topMoments : (capsules ?? []).slice(-4).reverse();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(280px, .65fr)', gap: 12 }}>
      <div style={{ background: UI.card, border: `1px solid ${UI.line}`, padding: 20 }}>
        <div style={{ color: UI.gold, fontFamily: UI.mono, fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>Relatorio central</div>
        <div style={{ color: UI.text, fontFamily: UI.disp, fontSize: 32, fontWeight: 900, lineHeight: .98 }}>{dossier?.headline ?? narration?.headline ?? 'Partida decodificada'}</div>
        <p style={{ color: UI.muted, fontFamily: UI.cond, fontSize: 16, lineHeight: 1.6, margin: '14px 0 0' }}>
          {dossier?.thesis ?? narration?.tactical_summary ?? 'A nova tela cruza estatistica, mapas e narrativa para mostrar por que o jogo terminou desse jeito.'}
        </p>
        {narration?.turning_point && (
          <div style={{ marginTop: 16, borderTop: `1px solid ${UI.line}`, paddingTop: 14 }}>
            <div style={{ color: UI.orange, fontFamily: UI.mono, fontSize: 8, letterSpacing: 2.5, textTransform: 'uppercase' }}>Ponto de virada</div>
            <div style={{ color: UI.muted, fontFamily: UI.cond, fontSize: 14, lineHeight: 1.5, marginTop: 6 }}>{narration.turning_point}</div>
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {moments.length ? moments.slice(0, 4).map((m, i) => (
          <div key={m.id ?? i} style={{ background: UI.panel, border: `1px solid ${UI.line}`, borderLeft: `3px solid ${m.color ?? UI.cyan}`, padding: 12 }}>
            <div style={{ color: UI.faint, fontFamily: UI.mono, fontSize: 7, letterSpacing: 2, textTransform: 'uppercase' }}>Momento {i + 1}</div>
            <div style={{ color: UI.text, fontFamily: UI.disp, fontSize: 18, fontWeight: 800, lineHeight: 1.05, marginTop: 5 }}>{m.title ?? m.type ?? 'Momento chave'}</div>
            <div style={{ color: UI.muted, fontFamily: UI.cond, fontSize: 12, lineHeight: 1.35, marginTop: 5 }}>{m.oneLine ?? m.paragraphs?.[0] ?? 'Registro decisivo da partida.'}</div>
          </div>
        )) : <BigMetric label="Momentos" value="Em branco" sub="Sem capsulas narrativas registradas neste jogo." tone={UI.faint} />}
      </div>
    </div>
  );
}

function RallyBands({ a, b, maxRally }) {
  const bands = [
    { label: '0-3', test: (n) => n <= 3, tone: UI.cyan },
    { label: '4-8', test: (n) => n >= 4 && n <= 8, tone: UI.green },
    { label: '9+', test: (n) => n >= 9, tone: UI.orange },
  ];
  const all = [...a.rallyLengths, ...b.rallyLengths];
  return (
    <div style={{ background: UI.card, border: `1px solid ${UI.line}`, padding: 16 }}>
      <div style={{ color: UI.faint, fontFamily: UI.mono, fontSize: 8, letterSpacing: 2.4, textTransform: 'uppercase', marginBottom: 12 }}>Distribuicao de rallies</div>
      <div style={{ display: 'grid', gap: 10 }}>
        {bands.map((band) => {
          const count = all.filter(band.test).length;
          const width = pct(count, Math.max(1, all.length));
          return (
            <div key={band.label} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 48px', gap: 10, alignItems: 'center' }}>
              <div style={{ color: UI.text, fontFamily: UI.disp, fontSize: 22, fontWeight: 800 }}>{band.label}</div>
              <div style={{ height: 12, background: 'rgba(255,255,255,.055)' }}>
                <div style={{ width: `${width}%`, height: '100%', background: band.tone }} />
              </div>
              <div style={{ color: band.tone, fontFamily: UI.mono, fontSize: 10, textAlign: 'right' }}>{width}%</div>
            </div>
          );
        })}
      </div>
      <div style={{ color: UI.muted, fontFamily: UI.cond, fontSize: 14, lineHeight: 1.45, marginTop: 14 }}>
        Maior rally: {maxRally} bolas. Media combinada: {avg(all).toFixed(1)}.
      </div>
    </div>
  );
}

function ServeRadar({ player, line }) {
  const items = [
    ['1o in', line.firstIn, UI.cyan],
    ['Saque', line.servePct, UI.gold],
    ['Hold', line.holdPct, UI.green],
    ['Rede', line.netPct, UI.violet],
  ];
  return (
    <div style={{ background: UI.card, border: `1px solid ${UI.line}`, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ color: player?.color ?? UI.text, fontFamily: UI.disp, fontSize: 24, fontWeight: 900, lineHeight: 1 }}>{line.name}</div>
          <div style={{ color: UI.faint, fontFamily: UI.mono, fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 }}>{line.firstAvg} km/h media 1o saque</div>
        </div>
        <div style={{ color: UI.gold, fontFamily: UI.disp, fontSize: 38, fontWeight: 900, lineHeight: .9 }}>{line.aces}</div>
      </div>
      <div style={{ display: 'grid', gap: 9 }}>
        {items.map(([label, value, tone]) => (
          <div key={label} style={{ display: 'grid', gridTemplateColumns: '64px 1fr 40px', alignItems: 'center', gap: 8 }}>
            <div style={{ color: UI.faint, fontFamily: UI.mono, fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase' }}>{label}</div>
            <div style={{ height: 8, background: 'rgba(255,255,255,.06)' }}>
              <div style={{ width: `${Math.min(100, value)}%`, height: '100%', background: tone }} />
            </div>
            <div style={{ color: tone, fontFamily: UI.mono, fontSize: 10, textAlign: 'right' }}>{value}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const mapTabs = [
  ['bounce', 'Quique'],
  ['landing', 'Alvos'],
  ['direction', 'Direcao'],
  ['contact', 'Contato'],
  ['patterns', 'Padroes'],
  ['heatmap', 'Calor'],
];

function MapsRoom({ p0, p1, bounceLog = [], debugEvents = [] }) {
  const [active, setActive] = useState('bounce');
  return (
    <div style={{ background: UI.card, border: `1px solid ${UI.line}`, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${mapTabs.length}, 1fr)`, background: UI.panel, borderBottom: `1px solid ${UI.line}` }}>
        {mapTabs.map(([id, label]) => <ShellButton key={id} active={active === id} onClick={() => setActive(id)}>{label}</ShellButton>)}
      </div>
      <div style={{ minHeight: 430 }}>
        {active === 'bounce' && <BounceMap bounceLog={bounceLog} p0={p0} p1={p1} />}
        {active === 'landing' && <LandingMap bounceLog={bounceLog} p0={p0} p1={p1} />}
        {active === 'direction' && <ShotDirectionMap debugEvents={debugEvents} p0={p0} p1={p1} />}
        {active === 'contact' && <ContactMap debugEvents={debugEvents} p0={p0} p1={p1} />}
        {active === 'patterns' && <PatternMap debugEvents={debugEvents} p0={p0} p1={p1} />}
        {active === 'heatmap' && <PositionHeatmap p0={p0} p1={p1} />}
      </div>
    </div>
  );
}

export default function MatchOverScreen({
  p0,
  p1,
  maxRally = 0,
  totalPoints = 0,
  bounceLog = [],
  debugEvents = [],
  heat = null,
  courtMeta = null,
  matchNarrativeDossier = null,
  matchStoryCapsules = [],
  onNew,
  onSame,
}) {
  const [tab, setTab] = useState('overview');
  if (!p0 || !p1) return null;

  const a = useMemo(() => buildPlayerLine(p0), [p0]);
  const b = useMemo(() => buildPlayerLine(p1), [p1]);
  const winner = safeNum(p0.sets) >= safeNum(p1.sets) ? p0 : p1;
  const loser = winner === p0 ? p1 : p0;
  const surfaceKey = String(courtMeta?.surface ?? courtMeta?.courtKey ?? 'HARD').toUpperCase();
  const surface = SURFACES[surfaceKey] ?? SURFACES.HARD;
  const heatData = heat ? readHeat({ heat }) : null;
  const setsDetail = (p0.setsHistory ?? []).map((games, i) => [games, p1.setsHistory?.[i] ?? 0]);
  const notes = useMemo(() => inferAnalystNotes(a, b, heatData, maxRally, bounceLog), [a, b, heatData, maxRally, bounceLog]);
  const narration = useMemo(() => {
    try {
      const winnerIsP0 = winner === p0;
      return narrateMatch(winner, loser, { winner, stats: { a: p0.stats, b: p1.stats }, setsDetail, gs: { players: [p0, p1] }, log: [] }, surfaceKey);
    } catch (err) {
      console.warn('[MatchOverScreen] narrator failed:', err);
      return null;
    }
  }, [p0, p1, winner, loser, surfaceKey]);

  const tabs = [
    ['overview', 'Resumo'],
    ['analysts', 'Analistas'],
    ['numbers', 'Numeros'],
    ['serve', 'Saque'],
    ['rally', 'Rallies'],
    ['maps', 'Mapas'],
  ];

  return (
    <div style={{ minHeight: '100vh', background: UI.bg, color: UI.text, display: 'flex', flexDirection: 'column', fontFamily: UI.cond }}>
      <div style={{ position: 'relative', overflow: 'hidden', borderBottom: `1px solid ${surface.color}55`, background: `linear-gradient(135deg, ${surface.color}18, rgba(5,7,11,.98) 42%, rgba(17,23,34,.96))` }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)', backgroundSize: '42px 42px', maskImage: 'linear-gradient(90deg, black, transparent 85%)' }} />
        <div style={{ position: 'relative', padding: '28px 32px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start' }}>
            <div>
              <div style={{ color: surface.color, fontFamily: UI.mono, fontSize: 9, letterSpacing: 3.5, textTransform: 'uppercase', marginBottom: 12 }}>
                Pos-jogo completo · {surface.label}{courtMeta?.name ? ` · ${courtMeta.name}` : ''}
              </div>
              <div style={{ color: UI.text, fontFamily: UI.disp, fontSize: 'clamp(42px, 7vw, 86px)', fontWeight: 950, letterSpacing: 0, lineHeight: .82 }}>
                {winner.name}
              </div>
              <div style={{ color: UI.muted, fontFamily: UI.disp, fontSize: 'clamp(20px, 3vw, 36px)', fontWeight: 800, lineHeight: 1, marginTop: 8 }}>
                venceu {loser.name}
              </div>
            </div>
            <div style={{ minWidth: 230, textAlign: 'right' }}>
              <div style={{ color: UI.text, fontFamily: UI.disp, fontSize: 88, fontWeight: 950, lineHeight: .78 }}>{p0.sets} x {p1.sets}</div>
              <div style={{ color: UI.faint, fontFamily: UI.mono, fontSize: 9, letterSpacing: 2.5, textTransform: 'uppercase', marginTop: 10 }}>{totalPoints} pontos · {maxRally} maior rally</div>
            </div>
          </div>
          <div style={{ marginTop: 22 }}>
            <Scoreline p0={p0} p1={p1} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, marginTop: 16 }}>
            <BigMetric label="Heat do jogo" value={heatData?.tier?.label ?? 'Estavel'} sub={heatData ? `Pico ${heatData.peak}` : 'Sem pico emocional registrado'} tone={heatData?.tier?.color ?? UI.gold} />
            <BigMetric label="Saque mais forte" value={`${Math.max(a.firstAvg, b.firstAvg)} km/h`} sub="Media de primeiro saque mais alta" tone={UI.cyan} />
            <BigMetric label="Dano liquido" value={fmt(Math.max(a.attackIndex, b.attackIndex))} sub="Winners e aces contra erros" tone={UI.green} />
            <BigMetric label="Mapas vivos" value={bounceLog.length} sub={`${debugEvents.length} eventos de debug`} tone={UI.violet} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${tabs.length}, 1fr)`, background: UI.panel, borderBottom: `1px solid ${UI.line}`, position: 'sticky', top: 0, zIndex: 5 }}>
        {tabs.map(([id, label]) => <ShellButton key={id} active={tab === id} onClick={() => setTab(id)}>{label}</ShellButton>)}
      </div>

      <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
        {tab === 'overview' && (
          <div style={{ display: 'grid', gap: 14 }}>
            <NarrativeBlock narration={narration} dossier={matchNarrativeDossier} capsules={matchStoryCapsules} />
            <AnalystDesk notes={notes.slice(0, 4)} />
          </div>
        )}

        {tab === 'analysts' && <AnalystDesk notes={notes} />}

        {tab === 'numbers' && (
          <div style={{ background: UI.card, border: `1px solid ${UI.line}`, padding: '18px 22px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px 1fr', gap: 10, marginBottom: 10 }}>
              <div style={{ color: p0.color ?? UI.text, fontFamily: UI.disp, fontSize: 25, fontWeight: 900, textAlign: 'right' }}>{p0.name}</div>
              <div />
              <div style={{ color: p1.color ?? UI.text, fontFamily: UI.disp, fontSize: 25, fontWeight: 900 }}>{p1.name}</div>
            </div>
            <CompareRow label="Aces" a={a.aces} b={b.aces} tone={UI.gold} />
            <CompareRow label="Duplas faltas" a={a.dfs} b={b.dfs} tone={UI.red} lowerIsBetter />
            <CompareRow label="1o saque" a={a.firstIn} b={b.firstIn} left={`${a.firstIn}%`} right={`${b.firstIn}%`} tone={UI.cyan} />
            <CompareRow label="Media 1o saque" a={a.firstAvg} b={b.firstAvg} left={`${a.firstAvg} km/h`} right={`${b.firstAvg} km/h`} tone={UI.cyan} />
            <CompareRow label="Winners" a={a.winners} b={b.winners} tone={UI.green} />
            <CompareRow label="Erros nao-forcados" a={a.ue} b={b.ue} tone={UI.red} lowerIsBetter />
            <CompareRow label="Erros forcados" a={a.fe} b={b.fe} tone={UI.orange} lowerIsBetter />
            <CompareRow label="Hold rate" a={a.holdPct} b={b.holdPct} left={`${a.holdPct}%`} right={`${b.holdPct}%`} tone={UI.gold} />
            <CompareRow label="Break rate" a={a.breakPct} b={b.breakPct} left={`${a.breakPct}%`} right={`${b.breakPct}%`} tone={UI.violet} />
            <CompareRow label="Pontos sacando" a={a.servePct} b={b.servePct} left={`${a.servePct}%`} right={`${b.servePct}%`} tone={UI.gold} />
            <CompareRow label="Pontos recebendo" a={a.returnPct} b={b.returnPct} left={`${a.returnPct}%`} right={`${b.returnPct}%`} tone={UI.green} />
            <CompareRow label="Rede" a={a.netPct} b={b.netPct} left={`${a.netPct}%`} right={`${b.netPct}%`} tone={UI.violet} />
            <CompareRow label="Rally medio" a={a.avgRally} b={b.avgRally} left={a.avgRally.toFixed(1)} right={b.avgRally.toFixed(1)} tone={UI.orange} />
          </div>
        )}

        {tab === 'serve' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <ServeRadar player={p0} line={a} />
            <ServeRadar player={p1} line={b} />
            <div style={{ gridColumn: '1 / -1', background: UI.card, border: `1px solid ${UI.line}`, padding: 18 }}>
              <CompareRow label="Win sacando" a={a.servePct} b={b.servePct} left={`${a.servePct}%`} right={`${b.servePct}%`} tone={UI.gold} />
              <CompareRow label="Win recebendo" a={a.returnPct} b={b.returnPct} left={`${a.returnPct}%`} right={`${b.returnPct}%`} tone={UI.green} />
              <CompareRow label="Hold" a={a.holdPct} b={b.holdPct} left={`${a.holdPct}%`} right={`${b.holdPct}%`} tone={UI.cyan} />
              <CompareRow label="Break" a={a.breakPct} b={b.breakPct} left={`${a.breakPct}%`} right={`${b.breakPct}%`} tone={UI.violet} />
            </div>
          </div>
        )}

        {tab === 'rally' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <RallyBands a={a} b={b} maxRally={maxRally} />
            <div style={{ background: UI.card, border: `1px solid ${UI.line}`, padding: 16 }}>
              <div style={{ color: UI.faint, fontFamily: UI.mono, fontSize: 8, letterSpacing: 2.4, textTransform: 'uppercase', marginBottom: 12 }}>Leitura de troca</div>
              <CompareRow label="Winners" a={a.winners} b={b.winners} tone={UI.green} />
              <CompareRow label="Erros nao-forcados" a={a.ue} b={b.ue} tone={UI.red} lowerIsBetter />
              <CompareRow label="Indice agressivo" a={a.attackIndex} b={b.attackIndex} left={a.attackIndex.toFixed(1)} right={b.attackIndex.toFixed(1)} tone={UI.gold} />
              <CompareRow label="Pressao" a={a.pressure} b={b.pressure} left={a.pressure.toFixed(1)} right={b.pressure.toFixed(1)} tone={UI.orange} />
            </div>
          </div>
        )}

        {tab === 'maps' && (
          <div style={{ display: 'grid', gap: 12 }}>
            <AnalystDesk notes={notes.slice(3, 5)} />
            <MapsRoom p0={p0} p1={p1} bounceLog={bounceLog} debugEvents={debugEvents} />
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr .85fr', height: 72, borderTop: `1px solid ${UI.line}`, background: UI.panel }}>
        <button onClick={onSame} style={{ border: 'none', cursor: 'pointer', background: UI.text, color: UI.bg, fontFamily: UI.disp, fontSize: 22, fontWeight: 900, letterSpacing: 3, textTransform: 'uppercase' }}>Revanche</button>
        <button onClick={onNew} style={{ border: 'none', borderLeft: `1px solid ${UI.line}`, cursor: 'pointer', background: UI.soft, color: UI.muted, fontFamily: UI.disp, fontSize: 22, fontWeight: 900, letterSpacing: 3, textTransform: 'uppercase' }}>Nova partida</button>
      </div>
    </div>
  );
}
