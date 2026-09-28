import React from 'react';
import { CALENDAR } from '../../systems/tournaments/TournamentSystem.js';

const T = {
  panel: 'rgba(10,14,20,.82)',
  panelSoft: 'rgba(255,255,255,.03)',
  line: 'rgba(255,255,255,.08)',
  lineStrong: 'rgba(212,86,30,.34)',
  white: '#F3EFE8',
  dim: 'rgba(243,239,232,.66)',
  faint: 'rgba(243,239,232,.34)',
  clay: '#D4561E',
  gold: '#E8C84A',
  grass: '#57D38C',
  hard: '#68B6FF',
  display: "'Bebas Neue', sans-serif",
  cond: "'Barlow Condensed', sans-serif",
  body: "'Barlow', sans-serif",
  mono: "'Space Mono', monospace",
};

const CATEGORY_META = {
  GRAND_SLAM: { label: 'Grand Slam', accent: '#E8C84A', short: 'GS' },
  SLAM_CLASH: { label: 'Apex Major', accent: '#FF8A3D', short: 'APEX' },
  MASTERS_1000: { label: 'Masters 1000', accent: '#D956FF', short: 'M1000' },
  ATP_500: { label: 'ATP 500', accent: '#51C2E8', short: '500' },
  ATP_250: { label: 'ATP 250', accent: '#57D38C', short: '250' },
  ATP_100: { label: 'Challenger 100', accent: '#FF8C5A', short: 'CH100' },
  ATP_75: { label: 'Challenger 75', accent: '#C5A58A', short: 'CH75' },
  ATP_50: { label: 'Challenger 50', accent: '#B7B3B0', short: 'CH50' },
  ATP_25: { label: 'Challenger 25', accent: '#E2D7CB', short: 'CH25' },
  ATP_PROSPECTS: { label: 'Juniors', accent: '#FF8C5A', short: 'JR' },
  JUNIOR_50: { label: 'Junior 50', accent: '#B7B3B0', short: 'J50' },
  JUNIOR_100: { label: 'Junior 100', accent: '#FFB067', short: 'J100' },
  JUNIOR_SLAM: { label: 'Junior Slam', accent: '#FFD166', short: 'J-SLAM' },
  FINALS: { label: 'Finals', accent: '#FF6464', short: 'FIN' },
  PROSPECTS_FINALS: { label: 'Junior Finals', accent: '#FFB067', short: 'J-FIN' },
};

const SURFACE_META = {
  CLAY: { label: 'Saibro', accent: '#D4561E' },
  HARD: { label: 'Dura', accent: '#68B6FF' },
  GRASS: { label: 'Grama', accent: '#57D38C' },
  STREET: { label: 'Asfalto', accent: '#EF9F27' },
  CARPET: { label: 'Veludo', accent: '#C4426A' },
  INDOOR: { label: 'Indoor', accent: '#9B8CFF' },
};

function buildWelcomeSnapshot() {
  const countByCategory = CALENDAR.reduce((acc, tournament) => {
    acc[tournament.category] = (acc[tournament.category] || 0) + 1;
    return acc;
  }, {});

  const countBySurface = CALENDAR.reduce((acc, tournament) => {
    const key = tournament.surface ?? 'HARD';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const featuredStretch = [...CALENDAR]
    .sort((a, b) => {
      const weight = { GRAND_SLAM: 0, FINALS: 1, MASTERS_1000: 2, ATP_500: 3, ATP_250: 4, JUNIOR_SLAM: 5, JUNIOR_100: 6, JUNIOR_50: 7, ATP_PROSPECTS: 8, PROSPECTS_FINALS: 9 };
      return (weight[a.category] ?? 99) - (weight[b.category] ?? 99);
    })
    .slice(0, 5);

  return {
    totalTournaments: CALENDAR.length,
    openingRun: CALENDAR.slice(0, 6),
    featuredStretch,
    categoryCards: Object.entries(countByCategory)
      .sort((a, b) => (b[1] - a[1]))
      .map(([category, count]) => ({
        category,
        count,
        meta: CATEGORY_META[category] ?? { label: category, accent: '#999', short: category },
      })),
    surfaceCards: Object.entries(countBySurface)
      .sort((a, b) => b[1] - a[1])
      .map(([surface, count]) => ({
        surface,
        count,
        meta: SURFACE_META[surface] ?? { label: surface, accent: '#999' },
      })),
  };
}

export default function WelcomeToUniverse({ onInit, onBack }) {
  const snapshot = React.useMemo(() => buildWelcomeSnapshot(), []);
  const seasonActs = [
    {
      kicker: 'Abertura',
      title: 'O circuito ainda finge que está calmo',
      text: 'As primeiras semanas definem temperatura, confiança, hype e primeiras rachaduras. É quando promessas tentam parecer reais e favoritos ainda tentam parecer intactos.',
      accent: T.hard,
    },
    {
      kicker: 'Consolidação',
      title: 'Os nomes grandes começam a ser cobrados',
      text: 'Masters, corridas e leituras públicas passam a pesar mais. O universo começa a separar boa fase passageira de campanha que realmente muda o mapa do ano.',
      accent: T.clay,
    },
    {
      kicker: 'Pico',
      title: 'Cada torneio vira tribunal',
      text: 'Nos grandes palcos o jogo deixa de medir só nível. Mede peso, legado, nervo, trauma, validação e a capacidade de sustentar a narrativa quando o circuito inteiro olha.',
      accent: T.gold,
    },
    {
      kicker: 'Reta final',
      title: 'Nada chega limpo ao fim da temporada',
      text: 'A corrida por ranking, Finals, reputação e afirmação faz o calendário fechar com carga dramática. O fim do ano vira menos contagem de pontos e mais disputa por sentido.',
      accent: T.grass,
    },
  ];

  const promises = [
    {
      title: 'Memória',
      text: 'O universo lembra do que foi conquista, trauma, zebra, afirmação e queda. Você não joga semanas soltas; joga dentro de um mundo que absorve o que aconteceu.',
      accent: T.gold,
    },
    {
      title: 'Leitura',
      text: 'Traits, estilo, personalidade, reputação, forma e arco da temporada deixam de ser ruído. O jogo vai te ensinar a entender quem cada jogador realmente é.',
      accent: T.hard,
    },
    {
      title: 'Drama esportivo',
      text: 'O calendário não existe só para distribuir pontos. Cada trecho do ano muda o tom da temporada, empurra rivalidades e transforma certos torneios em capítulos inevitáveis.',
      accent: T.clay,
    },
  ];
  const emotionalBeats = [
    {
      kicker: 'Favoritos',
      title: 'O topo nunca entra limpo',
      text: 'Quem começa grande já começa sendo cobrado. No universo, status não é proteção: é pressão acumulada esperando um tropeço visível.',
      accent: T.gold,
    },
    {
      kicker: 'Ascensão',
      title: 'Todo circuito precisa de um nome novo',
      text: 'Jovens, semi-anônimos e azarões ganham leitura própria. O prazer aqui não é só ver quem vence, mas perceber quando um nome comum deixa de parecer comum.',
      accent: T.hard,
    },
    {
      kicker: 'Rivalidade',
      title: 'Confrontos deixam cicatriz',
      text: 'Quando um duelo começa a se repetir, o jogo deixa de contar só placar. Passa a contar memória, medo, vingança e a expectativa do reencontro.',
      accent: '#C46BFF',
    },
    {
      kicker: 'Queda',
      title: 'Ninguém controla totalmente a erosão',
      text: 'Má fase, lesão, desgaste, perda de aura e pressão pública viram parte do ecossistema. O circuito também é feito de gente tentando não escorregar.',
      accent: T.clay,
    },
  ];

  const watchPillars = [
    'quem entra em alta e quem chega rachado',
    'quais torneios mudam o tom do ano',
    'que rivalidade está aquecendo em silêncio',
    'quem virou consenso e quem ainda é hype contestado',
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: `
        radial-gradient(circle at top left, rgba(212,86,30,.20), transparent 28%),
        radial-gradient(circle at 84% 16%, rgba(104,182,255,.16), transparent 24%),
        radial-gradient(circle at 50% 100%, rgba(232,200,74,.10), transparent 36%),
        linear-gradient(180deg, #030507 0%, #05080D 100%)
      `,
      color: T.white,
      overflow: 'auto',
    }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-8%', left: '-4%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,86,30,.18), transparent 66%)', filter: 'blur(40px)', animation: 'uvWelcomeOrbA 14s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', top: '10%', right: '-6%', width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(104,182,255,.14), transparent 68%)', filter: 'blur(48px)', animation: 'uvWelcomeOrbB 16s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '-12%', left: '26%', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,200,74,.08), transparent 68%)', filter: 'blur(52px)', animation: 'uvWelcomeOrbC 18s ease-in-out infinite' }} />
      </div>

      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '18px 24px',
        backdropFilter: 'blur(18px)',
        background: 'rgba(3,5,7,.74)',
        borderBottom: `1px solid ${T.line}`,
      }}>
        <button
          onClick={onBack}
          style={{
            border: `1px solid ${T.line}`,
            background: 'transparent',
            color: T.dim,
            fontFamily: T.mono,
            fontSize: 8,
            letterSpacing: '.22em',
            textTransform: 'uppercase',
            padding: '9px 14px',
            cursor: 'pointer',
          }}
        >
          Voltar
        </button>
        <div style={{ width: 1, height: 18, background: T.line }} />
        <div style={{ fontFamily: T.mono, fontSize: 8, letterSpacing: '.42em', color: T.faint, textTransform: 'uppercase' }}>
          Welcome To Universe
        </div>
      </div>

      <div style={{ width: 'min(1380px, 100%)', margin: '0 auto', padding: '32px 28px 42px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr .8fr', gap: 14, alignItems: 'stretch', marginBottom: 14 }}>
          <section style={{ position: 'relative', overflow: 'hidden', border: `1px solid ${T.lineStrong}`, background: `linear-gradient(135deg, rgba(10,14,20,.92), rgba(5,8,12,.98))`, padding: '34px 32px 32px', minHeight: 420 }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.03), transparent)', transform: 'translateX(-100%)', animation: 'uvWelcomeScan 7s linear infinite' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontFamily: T.mono, fontSize: 8, letterSpacing: '.48em', color: 'rgba(212,86,30,.82)', textTransform: 'uppercase', marginBottom: 10 }}>
                Modo Universo
              </div>
              <div style={{ fontFamily: T.display, fontSize: 'clamp(64px, 9vw, 118px)', lineHeight: .84, letterSpacing: '.02em', textTransform: 'uppercase' }}>
                Welcome<br />to <span style={{ color: T.clay }}>Universe</span>
              </div>
              <div style={{ maxWidth: 780, marginTop: 18, fontFamily: T.cond, fontSize: 22, color: T.dim, lineHeight: 1.45 }}>
                Aqui o circuito deixa de ser só uma sequência de partidas e vira um mundo inteiro. Temporadas longas, memória, favoritos, desgaste, ascensão, queda e narrativa esportiva respirando semana a semana.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 26 }}>
                {[
                  { value: '128', label: 'Tour principal' },
                  { value: '32', label: 'Juniors ativos' },
                  { value: String(snapshot.totalTournaments), label: 'Torneios por ano' },
                  { value: '1', label: 'Circuito contínuo' },
                ].map((item) => (
                  <div key={item.label} style={{ background: 'rgba(255,255,255,.03)', border: `1px solid ${T.line}`, padding: '14px 12px' }}>
                    <div style={{ fontFamily: T.display, fontSize: 34, color: T.white, lineHeight: 1 }}>{item.value}</div>
                    <div style={{ fontFamily: T.mono, fontSize: 7, letterSpacing: '.2em', color: T.faint, textTransform: 'uppercase', marginTop: 4 }}>{item.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 26 }}>
                <button
                  onClick={onInit}
                  style={{
                    border: `1px solid rgba(212,86,30,.48)`,
                    background: 'linear-gradient(135deg, rgba(212,86,30,.22), rgba(212,86,30,.08))',
                    color: T.white,
                    fontFamily: T.mono,
                    fontSize: 9,
                    letterSpacing: '.24em',
                    textTransform: 'uppercase',
                    padding: '15px 24px',
                    cursor: 'pointer',
                  }}
                >
                  Iniciar universo
                </button>
                <div style={{ alignSelf: 'center', fontFamily: T.body, fontSize: 13, color: T.faint }}>
                  O circuito está pronto para começar a contar uma temporada inteira, não só partidas isoladas.
                </div>
              </div>
            </div>
          </section>

          <section style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: 14 }}>
            <div style={{ border: `1px solid ${T.line}`, background: T.panel, padding: '22px 22px 20px' }}>
              <div style={{ fontFamily: T.mono, fontSize: 8, letterSpacing: '.34em', color: T.gold, textTransform: 'uppercase', marginBottom: 10 }}>
                Como o ano respira
              </div>
              <div style={{ fontFamily: T.display, fontSize: 34, lineHeight: .95, textTransform: 'uppercase' }}>
                O calendário<br />já conta uma história
              </div>
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {snapshot.featuredStretch.map((tournament, index) => {
                  const meta = CATEGORY_META[tournament.category] ?? { label: tournament.category, accent: '#999', short: tournament.category };
                  return (
                    <div key={`${tournament.id}-${index}`} style={{ display: 'grid', gridTemplateColumns: '58px 1fr auto', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: index === snapshot.featuredStretch.length - 1 ? 'none' : `1px solid ${T.line}` }}>
                      <div style={{ fontFamily: T.mono, fontSize: 8, color: meta.accent, letterSpacing: '.16em', textTransform: 'uppercase' }}>{meta.short}</div>
                      <div>
                        <div style={{ fontFamily: T.cond, fontSize: 16, color: T.white, textTransform: 'uppercase', lineHeight: 1.12 }}>{tournament.name}</div>
                        <div style={{ fontFamily: T.mono, fontSize: 7, color: T.faint, letterSpacing: '.14em', marginTop: 4 }}>
                          {tournament.month} · {SURFACE_META[tournament.surface]?.label ?? tournament.surface}
                        </div>
                      </div>
                      <div style={{ fontFamily: T.mono, fontSize: 7, color: T.faint, letterSpacing: '.14em' }}>{meta.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ border: `1px solid ${T.line}`, background: T.panel, padding: '22px 22px 20px' }}>
              <div style={{ fontFamily: T.mono, fontSize: 8, letterSpacing: '.34em', color: T.hard, textTransform: 'uppercase', marginBottom: 10 }}>
                Abertura da temporada
              </div>
              <div style={{ fontFamily: T.display, fontSize: 34, lineHeight: .95, textTransform: 'uppercase' }}>
                Primeiro trecho<br />do circuito
              </div>
              <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {snapshot.openingRun.map((tournament, index) => (
                  <div key={`${tournament.id}-${index}`} style={{ padding: '10px 10px 12px', border: `1px solid ${T.line}`, background: T.panelSoft }}>
                    <div style={{ fontFamily: T.mono, fontSize: 7, color: T.faint, letterSpacing: '.16em', textTransform: 'uppercase' }}>
                      {tournament.month}
                    </div>
                    <div style={{ fontFamily: T.cond, fontSize: 15, color: T.white, textTransform: 'uppercase', lineHeight: 1.18, marginTop: 6 }}>
                      {tournament.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <section style={{ border: `1px solid ${T.line}`, background: T.panel, padding: '24px 24px 22px', marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.05fr .95fr', gap: 18, alignItems: 'start' }}>
            <div>
              <div style={{ fontFamily: T.mono, fontSize: 8, letterSpacing: '.34em', color: T.gold, textTransform: 'uppercase', marginBottom: 10 }}>
                O que este modo promete
              </div>
              <div style={{ fontFamily: T.display, fontSize: 40, lineHeight: .92, textTransform: 'uppercase' }}>
                Um mundo que<br />reage ao que você vê
              </div>
              <div style={{ marginTop: 14, fontFamily: T.body, fontSize: 14.5, color: T.dim, lineHeight: 1.75, maxWidth: 760 }}>
                O Modo Universo funciona melhor quando ele é lido como uma temporada viva. Você entra para acompanhar favoritos sob pressão, prodígios tentando explodir, veteranos brigando contra erosão, rivalidades que acumulam cicatriz e uma imprensa que começa a organizar tudo isso em capítulos.
              </div>
            </div>
            <div style={{ padding: '14px 16px', border: `1px solid ${T.line}`, background: 'rgba(255,255,255,.02)' }}>
              <div style={{ fontFamily: T.mono, fontSize: 7, letterSpacing: '.24em', color: T.faint, textTransform: 'uppercase', marginBottom: 8 }}>
                Manifesto editorial
              </div>
              <div style={{ fontFamily: T.cond, fontSize: 20, color: T.white, lineHeight: 1.35, textTransform: 'uppercase' }}>
                Aqui cada clique deveria te fazer entender melhor o circuito, sentir mais peso no calendário e se importar mais com o destino de quem está entrando em quadra.
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 18 }}>
            {promises.map((item) => (
              <div key={item.title} style={{ padding: '14px 14px 16px', border: `1px solid ${item.accent}22`, background: `${item.accent}0E`, minHeight: 152, boxShadow: `inset 0 0 0 1px ${item.accent}08` }}>
                <div style={{ fontFamily: T.display, fontSize: 24, color: item.accent, lineHeight: 1, textTransform: 'uppercase' }}>
                  {item.title}
                </div>
                <div style={{ fontFamily: T.body, fontSize: 13, color: T.dim, lineHeight: 1.65, marginTop: 8 }}>
                  {item.text}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ border: `1px solid ${T.line}`, background: T.panel, padding: '24px 24px 22px', marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.08fr .92fr', gap: 16, alignItems: 'stretch' }}>
            <div style={{ border: `1px solid ${T.line}`, background: 'rgba(255,255,255,.02)', padding: '18px 18px 16px' }}>
              <div style={{ fontFamily: T.mono, fontSize: 8, letterSpacing: '.34em', color: T.hard, textTransform: 'uppercase', marginBottom: 10 }}>
                O que observar
              </div>
              <div style={{ fontFamily: T.display, fontSize: 34, lineHeight: .94, textTransform: 'uppercase' }}>
                O prazer de acompanhar<br />não é só ver resultados
              </div>
              <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                {watchPillars.map((text, index) => (
                  <div key={text} style={{ display: 'grid', gridTemplateColumns: '34px 1fr', gap: 10, alignItems: 'start', padding: '10px 0', borderBottom: index === watchPillars.length - 1 ? 'none' : `1px solid ${T.line}` }}>
                    <div style={{ fontFamily: T.display, fontSize: 24, color: T.hard, lineHeight: 1 }}>{String(index + 1).padStart(2, '0')}</div>
                    <div style={{ fontFamily: T.body, fontSize: 13.5, color: T.dim, lineHeight: 1.6, textTransform: 'lowercase' }}>
                      {text}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ border: `1px solid ${T.line}`, background: 'linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.015))', padding: '18px 18px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: T.mono, fontSize: 8, letterSpacing: '.34em', color: T.gold, textTransform: 'uppercase', marginBottom: 10 }}>
                  Clima do modo
                </div>
                <div style={{ fontFamily: T.cond, fontSize: 25, color: T.white, textTransform: 'uppercase', lineHeight: 1.2 }}>
                  Você entra para ler um circuito inteiro em movimento, não só para apertar “simular” até o próximo troféu.
                </div>
              </div>
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.line}` }}>
                <div style={{ fontFamily: T.mono, fontSize: 7, letterSpacing: '.22em', color: T.faint, textTransform: 'uppercase', marginBottom: 6 }}>
                  Tom da experiência
                </div>
                <div style={{ fontFamily: T.body, fontSize: 13.5, color: T.dim, lineHeight: 1.65 }}>
                  Menos planilha fria. Mais sensação de temporada, atmosfera de redação esportiva, e leitura de quem está subindo, queimando, sobrevivendo ou tomando o circuito para si.
                </div>
              </div>
            </div>
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <section style={{ border: `1px solid ${T.line}`, background: T.panel, padding: '22px 22px 20px' }}>
            <div style={{ fontFamily: T.mono, fontSize: 8, letterSpacing: '.34em', color: T.grass, textTransform: 'uppercase', marginBottom: 14 }}>
              Estrutura do circuito
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {snapshot.categoryCards.map(({ category, count, meta }) => (
                <div key={category} style={{ padding: '14px 14px 16px', border: `1px solid ${meta.accent}22`, background: `${meta.accent}10` }}>
                  <div style={{ fontFamily: T.display, fontSize: 30, color: meta.accent, lineHeight: 1 }}>{count}</div>
                  <div style={{ fontFamily: T.cond, fontSize: 16, color: T.white, textTransform: 'uppercase', lineHeight: 1.1, marginTop: 6 }}>{meta.label}</div>
                  <div style={{ fontFamily: T.body, fontSize: 12.5, color: T.faint, lineHeight: 1.45, marginTop: 7 }}>
                    {category === 'GRAND_SLAM' ? 'Os picos máximos do calendário.' : category === 'MASTERS_1000' ? 'Onde a hierarquia do topo começa a se tensionar.' : category === 'ATP_500' ? 'Semana boa para afirmação e embalo.' : category === 'ATP_250' ? 'Território fértil para volume, confiança e surpresas.' : 'Camada que alimenta o futuro do circuito.'}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section style={{ border: `1px solid ${T.line}`, background: T.panel, padding: '22px 22px 20px' }}>
            <div style={{ fontFamily: T.mono, fontSize: 8, letterSpacing: '.34em', color: T.clay, textTransform: 'uppercase', marginBottom: 14 }}>
              Geografia esportiva
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {snapshot.surfaceCards.map(({ surface, count, meta }) => (
                <div key={surface} style={{ padding: '12px 14px', border: `1px solid ${meta.accent}22`, background: 'rgba(255,255,255,.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ fontFamily: T.cond, fontSize: 18, color: T.white, textTransform: 'uppercase', lineHeight: 1.05 }}>{meta.label}</div>
                      <div style={{ fontFamily: T.body, fontSize: 12.5, color: T.faint, lineHeight: 1.5, marginTop: 5 }}>
                        {meta.label === 'Saibro' ? 'Semana de paciência, desgaste e peso tático.' : meta.label === 'Dura' ? 'A espinha dorsal do ano e a superfície da regularidade.' : meta.label === 'Grama' ? 'Janela curta, nervosa e altamente seletiva.' : 'Recorte mais técnico e comprimido do circuito.'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: T.display, fontSize: 34, color: meta.accent, lineHeight: 1 }}>{count}</div>
                      <div style={{ fontFamily: T.mono, fontSize: 7, color: T.faint, letterSpacing: '.18em', textTransform: 'uppercase' }}>eventos</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section style={{ border: `1px solid ${T.line}`, background: T.panel, padding: '24px 24px 20px', marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: T.mono, fontSize: 8, letterSpacing: '.34em', color: T.clay, textTransform: 'uppercase', marginBottom: 8 }}>
                Grandes capítulos do ano
              </div>
              <div style={{ fontFamily: T.display, fontSize: 40, lineHeight: .92, textTransform: 'uppercase' }}>
                A temporada não anda reta
              </div>
            </div>
            <div style={{ fontFamily: T.body, fontSize: 13.5, color: T.faint, lineHeight: 1.6, maxWidth: 520 }}>
              Cada trecho do calendário muda o que está em jogo. A ideia aqui é que o universo já nasça te dizendo que o ano tem ritmo, pressão e mudança de clima.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {seasonActs.map((act) => (
              <div key={act.kicker} style={{ minHeight: 196, padding: '14px 14px 16px', border: `1px solid ${act.accent}24`, background: `linear-gradient(180deg, ${act.accent}12, rgba(255,255,255,.02))`, boxShadow: `inset 0 0 0 1px ${act.accent}06` }}>
                <div style={{ fontFamily: T.mono, fontSize: 7, letterSpacing: '.22em', color: act.accent, textTransform: 'uppercase', marginBottom: 8 }}>
                  {act.kicker}
                </div>
                <div style={{ fontFamily: T.cond, fontSize: 20, color: T.white, lineHeight: 1.18, textTransform: 'uppercase' }}>
                  {act.title}
                </div>
                <div style={{ fontFamily: T.body, fontSize: 12.75, color: T.dim, lineHeight: 1.65, marginTop: 10 }}>
                  {act.text}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ border: `1px solid ${T.line}`, background: T.panel, padding: '24px 24px 22px', marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: T.mono, fontSize: 8, letterSpacing: '.34em', color: '#C46BFF', textTransform: 'uppercase', marginBottom: 8 }}>
                Tensões que fazem o universo respirar
              </div>
              <div style={{ fontFamily: T.display, fontSize: 40, lineHeight: .92, textTransform: 'uppercase' }}>
                O circuito vive de<br />forças em atrito
              </div>
            </div>
            <div style={{ fontFamily: T.body, fontSize: 13.5, color: T.faint, lineHeight: 1.65, maxWidth: 520 }}>
              Esta camada existe para deixar a entrada do modo menos institucional e mais emocional. O universo fica melhor quando já nasce te lembrando o que realmente move uma temporada.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {emotionalBeats.map((beat) => (
              <div key={beat.title} style={{ minHeight: 192, padding: '14px 14px 16px', border: `1px solid ${beat.accent}26`, background: `linear-gradient(180deg, ${beat.accent}14, rgba(255,255,255,.02))` }}>
                <div style={{ fontFamily: T.mono, fontSize: 7, letterSpacing: '.22em', color: beat.accent, textTransform: 'uppercase', marginBottom: 8 }}>
                  {beat.kicker}
                </div>
                <div style={{ fontFamily: T.cond, fontSize: 21, color: T.white, textTransform: 'uppercase', lineHeight: 1.15 }}>
                  {beat.title}
                </div>
                <div style={{ fontFamily: T.body, fontSize: 12.8, color: T.dim, lineHeight: 1.65, marginTop: 10 }}>
                  {beat.text}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 14, padding: '20px 24px', border: `1px solid ${T.lineStrong}`, background: 'linear-gradient(135deg, rgba(212,86,30,.12), rgba(232,200,74,.06) 55%, rgba(255,255,255,.02))' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: T.mono, fontSize: 8, letterSpacing: '.34em', color: 'rgba(232,200,74,.88)', textTransform: 'uppercase', marginBottom: 8 }}>
                Pronto para abrir a temporada
              </div>
              <div style={{ fontFamily: T.display, fontSize: 40, lineHeight: .9, textTransform: 'uppercase' }}>
                O circuito ainda não começou.<br />Mas já promete conflito.
              </div>
            </div>
            <button
              onClick={onInit}
              style={{
                border: `1px solid rgba(232,200,74,.38)`,
                background: 'linear-gradient(135deg, rgba(232,200,74,.18), rgba(212,86,30,.12))',
                color: T.white,
                fontFamily: T.mono,
                fontSize: 9,
                letterSpacing: '.24em',
                textTransform: 'uppercase',
                padding: '16px 24px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Começar temporada
            </button>
          </div>
        </section>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&family=Barlow+Condensed:wght@300;400;600;700;900&family=Barlow:wght@300;400;500;600&display=swap');
        @keyframes uvWelcomeScan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(220%); }
        }
        @keyframes uvWelcomeOrbA {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, -28px) scale(1.08); }
        }
        @keyframes uvWelcomeOrbB {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-36px, 24px) scale(.94); }
        }
        @keyframes uvWelcomeOrbC {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(24px, -22px) scale(1.05); }
        }
      `}</style>
    </div>
  );
}
