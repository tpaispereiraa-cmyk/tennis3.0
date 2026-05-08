/**
 * UniverseManager.patch.js — Integração das 5 Fases de Patrocínio
 * ─────────────────────────────────────────────────────────────────
 * Este arquivo documenta TODOS os patches necessários no
 * UniverseManager.jsx e arquivos relacionados para conectar as
 * Fases 1–5 ao universo vivo.
 *
 * Cada seção indica:
 *   ARQUIVO     → qual arquivo editar
 *   LOCALIZAÇÃO → onde no arquivo (buscar pela string de contexto)
 *   AÇÃO        → o que adicionar / substituir
 *
 * ─────────────────────────────────────────────────────────────────
 * DEPENDÊNCIAS (novos imports a adicionar no UniverseManager.jsx)
 * ─────────────────────────────────────────────────────────────────
 */

// ══════════════════════════════════════════════════════════════════
// PATCH 1 — IMPORTS no topo do UniverseManager.jsx
// ══════════════════════════════════════════════════════════════════
//
// LOCALIZAÇÃO: logo após os imports existentes de FinanceSystem e PhaseTwo
//
// ADICIONAR:
//
import {
  initSponsorPool,
} from '../SponsorPool.js';

import {
  runSponsorshipWindow,
  monitorContracts,
  handleRetirementSponsors,
  handleScandal,
  applySigningEffects,
  buildSponsorChronicleEvents,
  computeSponsorRecords,
} from '../SponsorContractSystem.js';

// ══════════════════════════════════════════════════════════════════
// PATCH 2 — buildUniverse: inicializar sponsorPool
// ══════════════════════════════════════════════════════════════════
//
// LOCALIZAÇÃO: dentro da função buildUniverse(), no objeto retornado
// BUSCAR: "chronicleEngine: new ChronicleEngine()"
//
// ADICIONAR ao lado:
//   sponsorPool: initSponsorPool(),
//   pendingOffers: [],          // ofertas do último ciclo (para UI)
//   highestPaidPlayerId: null,  // badge "mais bem pago"
//
// RESULTADO:
//   {
//     ...
//     chronicleEngine: new ChronicleEngine(),
//     sponsorPool: initSponsorPool(),
//     pendingOffers: [],
//     highestPaidPlayerId: null,
//     ...
//   }

// ══════════════════════════════════════════════════════════════════
// PATCH 3 — FINISH_TOURNAMENT: monitorar contratos após cada torneio
// ══════════════════════════════════════════════════════════════════
//
// LOCALIZAÇÃO: no case 'APPLY_TOURNAMENT_RESULT' (ou equivalente),
//   após o bloco de "Fase 2: atualiza IFR + Visibilidade"
// BUSCAR: "npWithForm = updatePlayerPhaseTwo(npWithForm,"
//
// ADICIONAR após o bloco de Fase 2:

/*
  // ── Fase 4 / Fase 5: monitorar contratos ativos ──────────────────
  if (state.sponsorPool) {
    const grandSlamWinnerId = tournament?.category === 'GRAND_SLAM'
      ? bracket?.champion?.id ?? null
      : null;

    const injuredThisTournament = Object.values(state.players ?? {})
      .filter(p => p.injury?.active && (p.injury?.monthsOut ?? 0) >= 6);

    const { state: stateAfterMonitor, news: monitorNews, bonuses } = monitorContracts(
      {
        ...state,
        players: [...(state.tourPlayers ?? []), ...(state.prospects ?? [])],
      },
      { tournament, grandSlamWinnerId, injuredPlayers: injuredThisTournament }
    );

    // Aplica pool atualizado de volta ao state
    state = {
      ...state,
      sponsorPool: stateAfterMonitor.sponsorPool,
    };

    // Aplica mudanças de jogadores (bônus creditados)
    for (const p of stateAfterMonitor.players ?? []) {
      const inTour = state.tourPlayers.findIndex(tp => tp.id === p.id);
      if (inTour >= 0) state.tourPlayers[inTour] = p;
      const inPros = state.prospects.findIndex(pp => pp.id === p.id);
      if (inPros >= 0) state.prospects[inPros] = p;
    }

    // Enfileira notícias de patrocínio no NewsEngine
    if (monitorNews.length > 0 && state.newsEngine) {
      state.newsEngine.push(monitorNews);
    }
  }
*/

// ══════════════════════════════════════════════════════════════════
// PATCH 4 — ADVANCE_YEAR: janela anual de patrocínio
// ══════════════════════════════════════════════════════════════════
//
// LOCALIZAÇÃO: logo após o bloco de Fase 2 anual
// BUSCAR: "for (let i = 0; i < updatedProspectsRaw.length; i++)"
//   (o loop que chama updatePlayerPhaseTwo para prospects)
//
// ADICIONAR LOGO DEPOIS:

/*
  // ── Fase 3/4/5: janela anual de patrocínio ───────────────────────
  let sponsorWindowResult = null;
  if (state.sponsorPool) {
    const allPlayersForSponsor = [...updatedTour, ...updatedProspectsRaw];
    const stateForSponsor = {
      ...state,
      players: allPlayersForSponsor,
      sponsorPool: state.sponsorPool,
      year: state.year,
    };

    sponsorWindowResult = runSponsorshipWindow(stateForSponsor);

    // Aplicar jogadores atualizados (bônus, marketability, activeContracts)
    const sponsorPlayerMap = Object.fromEntries(
      (sponsorWindowResult.state.players ?? []).map(p => [p.id, p])
    );
    for (let i = 0; i < updatedTour.length; i++) {
      if (sponsorPlayerMap[updatedTour[i].id]) updatedTour[i] = sponsorPlayerMap[updatedTour[i].id];
    }
    for (let i = 0; i < updatedProspectsRaw.length; i++) {
      if (sponsorPlayerMap[updatedProspectsRaw[i].id]) {
        updatedProspectsRaw[i] = sponsorPlayerMap[updatedProspectsRaw[i].id];
      }
    }

    // Enfileira notícias no NewsEngine
    if (sponsorWindowResult.news.length > 0 && state.newsEngine) {
      state.newsEngine.push(sponsorWindowResult.news);
    }

    // Chronicle: marcos de patrocínio
    if (sponsorWindowResult.chronicleEvents?.length > 0 && state.chronicleEngine) {
      // ChronicleEngine não tem addPlayerEvent nativamente —
      // armazenamos como campo auxiliar para ser lido pela UI
      state.chronicleEngine._sponsorEvents = [
        ...(state.chronicleEngine._sponsorEvents ?? []),
        ...sponsorWindowResult.chronicleEvents,
      ];
    }
  }
*/

// ══════════════════════════════════════════════════════════════════
// PATCH 5 — ADVANCE_YEAR: incluir sponsorPool e dados de patrocínio no return
// ══════════════════════════════════════════════════════════════════
//
// LOCALIZAÇÃO: no objeto `return { ...state, year: nextYear, ... }`
// BUSCAR: "coachPool: updatedCoachPool,"  (última linha antes do fechamento)
//
// ADICIONAR ao return:
//
//   sponsorPool: sponsorWindowResult?.state?.sponsorPool ?? state.sponsorPool,
//   pendingOffers: sponsorWindowResult?.acceptedOffers ?? [],
//   highestPaidPlayerId: (() => {
//     if (!state.sponsorPool) return null;
//     const allP = [...newTourPlayers, ...updatedProspects];
//     const totals = {};
//     for (const sp of Object.values(state.sponsorPool.states)) {
//       for (const c of sp.contracts) {
//         totals[c.playerId] = (totals[c.playerId] ?? 0) + c.annualFee;
//       }
//     }
//     const topId = Object.entries(totals).sort((a,b)=>b[1]-a[1])[0]?.[0];
//     return topId ?? null;
//   })(),

// ══════════════════════════════════════════════════════════════════
// PATCH 6 — Aposentadoria: encerrar contratos
// ══════════════════════════════════════════════════════════════════
//
// LOCALIZAÇÃO: dentro do bloco que processa `newlyRetired`
// BUSCAR: "for (const retired of newlyRetired) {"  (bloco de COACHING Fase 4)
//
// ADICIONAR antes desse bloco:

/*
  // ── Patrocínio: encerra contratos de aposentados ─────────────────
  if (state.sponsorPool) {
    for (const retired of newlyRetired) {
      const { state: sAfterRet, news: retNews } = handleRetirementSponsors(
        { ...state, players: [...updatedTour, ...updatedProspectsRaw] },
        retired
      );
      if (sAfterRet.sponsorPool) {
        // state.sponsorPool será sobrescrito pelo sponsorWindowResult no return
        // mas precisamos atualizar os jogadores agora
        state = { ...state, sponsorPool: sAfterRet.sponsorPool };
      }
      if (retNews.length > 0 && state.newsEngine) {
        state.newsEngine.push(retNews);
      }
    }
  }
*/

// ══════════════════════════════════════════════════════════════════
// PATCH 7 — UnifiedPlayerProfile.jsx: adicionar aba de patrocínio
// ══════════════════════════════════════════════════════════════════
//
// ARQUIVO: src/components/UnifiedPlayerProfile.jsx

// 7A — IMPORT no topo:
//   import SponsorTab from './SponsorTab.jsx';

// 7B — No array TABS (linha ~483), ADICIONAR:
//   { id:'patrocinio', name:'PATROCÍNIO', emoji:'🤝' },
//
//   Sugestão: inserir após 'evolucao':
//   { id:'evolucao',   name:'EVOLUÇÃO',    emoji:'📈'  },
//   { id:'patrocinio', name:'PATROCÍNIO',  emoji:'🤝'  },   // ← NOVO

// 7C — No array FILLED (linha ~4956), ADICIONAR 'patrocinio':
//   const FILLED = ['perfil','atributos','forma','titulos','mental-fisico',
//                   'saque','rivalidades','historico','evolucao','superficies',
//                   'dados','tecnico','patrocinio'];  // ← patrocinio adicionado

// 7D — No UnifiedPlayerProfile, o componente recebe sponsorPool e pendingOffers
//   via props. Adicionar à assinatura:
//   function UnifiedPlayerProfile({ ..., sponsorPool, pendingOffers, highestPaidPlayerId }) {

// 7E — No bloco de tab content (linha ~5073), ADICIONAR:
//   {activeTab==='patrocinio' && (
//     <SponsorTab
//       np={np}
//       sc={sc}
//       sponsorPool={sponsorPool}
//       year={year}
//       highestPaidPlayerId={highestPaidPlayerId}
//       pendingOffers={pendingOffers ?? []}
//     />
//   )}

// 7F — Onde UnifiedPlayerProfile é instanciado (HomeScreen ou similar),
//   passar os novos props:
//   <UnifiedPlayerProfile
//     ...props existentes...
//     sponsorPool={state.sponsorPool}
//     pendingOffers={state.pendingOffers}
//     highestPaidPlayerId={state.highestPaidPlayerId}
//   />

// ══════════════════════════════════════════════════════════════════
// PATCH 8 — HallOfFame: integrar recordes de patrocínio
// ══════════════════════════════════════════════════════════════════
//
// ARQUIVO: src/HallOfFame.js ou src/HallOfFameView.jsx
//
// 8A — Em computeHOFData, adicionar ao retorno:
//   sponsorRecords: state.sponsorPool
//     ? computeSponsorRecords(state.sponsorPool, allPlayers)
//     : null,
//
// 8B — Na view do Hall of Fame, adicionar seção "Recordes de Patrocínio":
//   — Maior contrato único da história
//   — Jogador com mais renovações consecutivas
//   — Marca que mais apostou em prospects que viraram campeões
//   — Jogador mais bem pago no auge da carreira

// ══════════════════════════════════════════════════════════════════
// PATCH 9 — NewsEngine: adicionar tipos SPONSOR ao NEWS_TYPES
// ══════════════════════════════════════════════════════════════════
//
// ARQUIVO: src/NewsEngine.js
// LOCALIZAÇÃO: no objeto NEWS_TYPES (linha ~169)
//
// ADICIONAR:
//
//   SPONSOR:       { id:'SPONSOR',       label:'Patrocínio',      icon:'🤝', color:'#60C8FF', priority:5 },
//   SPONSOR_ELITE: { id:'SPONSOR_ELITE', label:'Patrocínio Elite',icon:'👑', color:'#FFD700', priority:9 },
//
// E no método push() da classe NewsEngine, garantir que artigos com
// type SPONSOR_ELITE recebam prioridade de exibição equivalente a CHAMPION.

// ══════════════════════════════════════════════════════════════════
// PATCH 10 — ChronicleEngine: integrar eventos de patrocínio na linha do tempo
// ══════════════════════════════════════════════════════════════════
//
// ARQUIVO: src/ChronicleEngine.js
// LOCALIZAÇÃO: na classe ChronicleEngine
//
// ADICIONAR método:

/*
  getSponsorTimeline(playerId) {
    return (this._sponsorEvents ?? []).filter(e => e.playerId === playerId);
  }
*/
//
// E em src/components/CarreiraTimeline.jsx, na seção de eventos da timeline,
// adicionar suporte a type === 'SPONSOR_MILESTONE':
//
//   case 'SPONSOR_MILESTONE':
//     return {
//       icon:    e.icon ?? '🤝',
//       color:   e.subtype === 'FIRST_ELITE' ? '#FFD700' : '#60C8FF',
//       title:   e.subtype === 'FIRST_ELITE'  ? '1º Contrato Elite' :
//                e.subtype === 'ELITE_SIGNING' ? 'Contrato Elite'    :
//                e.subtype === 'ELITE_LOSS'    ? 'Fim de contrato Elite' :
//                'Marco de patrocínio',
//       detail:  e.text,
//     };

// ══════════════════════════════════════════════════════════════════
// CHECKLIST FINAL — todas as 5 fases
// ══════════════════════════════════════════════════════════════════

export const INTEGRATION_CHECKLIST = [
  // ── Fase 1: FinanceSystem ────────────────────────────────────────
  { phase:1, file:'UniverseManager.jsx',  status:'✅', note:'initPlayerFinance e processYearEndFinances já integrados (linha 1758)' },
  { phase:1, file:'UniverseManager.jsx',  status:'✅', note:'awardPrizeMoney chamado no FINISH_TOURNAMENT (linha 1398)' },
  { phase:1, file:'FinanceSystem.js',     status:'✅', note:'Arquivo completo e funcional' },

  // ── Fase 2: PhaseTwo ─────────────────────────────────────────────
  { phase:2, file:'UniverseManager.jsx',  status:'✅', note:'updatePlayerPhaseTwo chamado após torneio (linha 1548) e anualmente (linha 1764)' },
  { phase:2, file:'PhaseTwo.js',          status:'✅', note:'IFR, Visibilidade e SponsorSignal calculados' },

  // ── Fase 3: SponsorProfiles + SponsorPool ────────────────────────
  { phase:3, file:'SponsorProfiles.js',   status:'✅', note:'34 marcas, 4 tiers, 8 personalidades' },
  { phase:3, file:'SponsorPool.js',       status:'✅', note:'Motor de estado dinâmico completo' },
  { phase:3, file:'UniverseManager.jsx',  status:'⚠️', note:'PATCH 1+2: adicionar import e initSponsorPool() em buildUniverse' },

  // ── Fase 4: SponsorContractSystem ───────────────────────────────
  { phase:4, file:'SponsorContractSystem.js', status:'✅', note:'Efeitos, monitoramento, renovações, janela anual, escândalo' },
  { phase:4, file:'UniverseManager.jsx',  status:'⚠️', note:'PATCH 3: monitorContracts no FINISH_TOURNAMENT' },
  { phase:4, file:'UniverseManager.jsx',  status:'⚠️', note:'PATCH 4: runSponsorshipWindow no ADVANCE_YEAR' },
  { phase:4, file:'UniverseManager.jsx',  status:'⚠️', note:'PATCH 5: sponsorPool no return do ADVANCE_YEAR' },
  { phase:4, file:'UniverseManager.jsx',  status:'⚠️', note:'PATCH 6: handleRetirementSponsors nos aposentados' },

  // ── Fase 5: Narrativa ────────────────────────────────────────────
  { phase:5, file:'SponsorTab.jsx',       status:'✅', note:'Aba completa: contratos, sinal, histórico, ofertas' },
  { phase:5, file:'UnifiedPlayerProfile.jsx', status:'⚠️', note:'PATCH 7: import + aba patrocinio + props' },
  { phase:5, file:'NewsEngine.js',        status:'⚠️', note:'PATCH 9: tipos SPONSOR e SPONSOR_ELITE' },
  { phase:5, file:'ChronicleEngine.js',   status:'⚠️', note:'PATCH 10: getSponsorTimeline + CarreiraTimeline' },
  { phase:5, file:'HallOfFame.js',        status:'⚠️', note:'PATCH 8: computeSponsorRecords no computeHOFData' },
];

// ══════════════════════════════════════════════════════════════════
// CÓDIGO PRONTO PARA COPIAR — trechos self-contained
// ══════════════════════════════════════════════════════════════════

/**
 * PATCH 3 completo — monitorContracts após torneio
 * Colar no FINISH_TOURNAMENT, após o bloco "Fase 2: atualiza IFR"
 */
export const PATCH_MONITOR_CONTRACTS = `
// ── Fase 5: monitorar contratos ativos após torneio ──────────────
if (state.sponsorPool) {
  const gsWinnerId = tournament?.category === 'GRAND_SLAM'
    ? bracket?.champion?.id ?? null : null;

  const injured6plus = [...(state.tourPlayers??[]),...(state.prospects??[])]
    .filter(p => p.injury?.active && (p.injury?.monthsOut??0) >= 6);

  const monResult = monitorContracts(
    { ...state, players: [...(state.tourPlayers??[]),...(state.prospects??[])] },
    { tournament, grandSlamWinnerId: gsWinnerId, injuredPlayers: injured6plus }
  );

  const monMap = Object.fromEntries((monResult.state.players??[]).map(p=>[p.id,p]));
  state = {
    ...state,
    sponsorPool: monResult.state.sponsorPool,
    tourPlayers: (state.tourPlayers??[]).map(p=>monMap[p.id]??p),
    prospects:   (state.prospects??[]).map(p=>monMap[p.id]??p),
  };
  if (monResult.news.length>0 && state.newsEngine) state.newsEngine.push(monResult.news);
}`;

/**
 * PATCH 4 completo — runSponsorshipWindow no ADVANCE_YEAR
 * Colar após os loops de updatePlayerPhaseTwo
 */
export const PATCH_SPONSORSHIP_WINDOW = `
// ── Fase 5: janela anual de patrocínio ───────────────────────────
let _sponsorResult = null;
if (state.sponsorPool) {
  _sponsorResult = runSponsorshipWindow({
    ...state,
    players: [...updatedTour, ...updatedProspectsRaw],
    year: state.year,
  });

  const _spMap = Object.fromEntries((_sponsorResult.state.players??[]).map(p=>[p.id,p]));
  for (let i=0;i<updatedTour.length;i++) {
    if (_spMap[updatedTour[i].id]) updatedTour[i]=_spMap[updatedTour[i].id];
  }
  for (let i=0;i<updatedProspectsRaw.length;i++) {
    if (_spMap[updatedProspectsRaw[i].id]) updatedProspectsRaw[i]=_spMap[updatedProspectsRaw[i].id];
  }
  if (_sponsorResult.news.length>0 && state.newsEngine) state.newsEngine.push(_sponsorResult.news);
  if (_sponsorResult.chronicleEvents?.length>0 && state.chronicleEngine) {
    state.chronicleEngine._sponsorEvents = [
      ...(state.chronicleEngine._sponsorEvents??[]),
      ..._sponsorResult.chronicleEvents,
    ];
  }
}`;

/**
 * PATCH 5 — linhas para adicionar ao return do ADVANCE_YEAR
 */
export const PATCH_ADVANCE_YEAR_RETURN = `
sponsorPool: _sponsorResult?.state?.sponsorPool ?? state.sponsorPool,
pendingOffers: _sponsorResult?.acceptedOffers ?? [],
highestPaidPlayerId: (() => {
  const pool = _sponsorResult?.state?.sponsorPool ?? state.sponsorPool;
  if (!pool) return null;
  const totals = {};
  for (const sp of Object.values(pool.states)) {
    for (const c of sp.contracts) {
      totals[c.playerId] = (totals[c.playerId]??0) + c.annualFee;
    }
  }
  return Object.entries(totals).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? null;
})(),`;

/**
 * PATCH 6 — aposentadoria: encerrar contratos
 * Colar ANTES do loop "for (const retired of newlyRetired) {" que cria coaches
 */
export const PATCH_RETIREMENT_SPONSORS = `
// ── Fase 5: encerrar contratos de aposentados ────────────────────
if (state.sponsorPool) {
  for (const retired of newlyRetired) {
    const { state: sAfter, news: rNews } = handleRetirementSponsors(
      { ...state, players: [...updatedTour, ...updatedProspectsRaw] }, retired
    );
    if (sAfter.sponsorPool) state = { ...state, sponsorPool: sAfter.sponsorPool };
    if (rNews.length>0 && state.newsEngine) state.newsEngine.push(rNews);
  }
}`;

/**
 * PATCH 9 — linhas para adicionar ao NEWS_TYPES no NewsEngine.js
 */
export const PATCH_NEWS_TYPES = `
SPONSOR:       { id:'SPONSOR',       label:'Patrocínio',       icon:'🤝', color:'#60C8FF', priority:5 },
SPONSOR_ELITE: { id:'SPONSOR_ELITE', label:'Patrocínio Elite', icon:'👑', color:'#FFD700', priority:9 },`;

/**
 * PATCH 10 — CarreiraTimeline: suporte a eventos SPONSOR_MILESTONE
 * Adicionar ao switch/case que mapeia tipo de evento para visual
 */
export const PATCH_TIMELINE_SPONSOR = `
case 'SPONSOR_MILESTONE': {
  const subColors = {
    FIRST_ELITE:   '#FFD700',
    ELITE_SIGNING: '#FFD700',
    ELITE_LOSS:    '#FF6060',
    SIGNING:       '#60C8FF',
    default:       '#60C8FF',
  };
  return {
    icon:   event.icon ?? '🤝',
    color:  subColors[event.subtype] ?? subColors.default,
    title:  event.subtype==='FIRST_ELITE'   ? '1º Contrato Elite'      :
            event.subtype==='ELITE_SIGNING' ? 'Contrato Elite'          :
            event.subtype==='ELITE_LOSS'    ? 'Perde contrato Elite'    :
            'Marco de patrocínio',
    detail: event.text,
  };
}`;
