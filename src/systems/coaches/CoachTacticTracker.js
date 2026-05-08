/**
 * CoachTacticTracker.js
 * ─────────────────────────────────────────────────────────────────
 * Sistema de rastreamento de execução tática.
 *
 * Responsabilidades:
 *  1. Medir o "compliance rate" de cada instrução nos games em que esteve ativa
 *  2. Calcular se o plano funcionou (win rate nos games com instrução vs. antes)
 *  3. Gerar diagnóstico narrativo do técnico (por filosofia + resultado)
 *  4. Gerenciar coachTrust (0–1) no objeto player.coach
 *
 * Chamado em:
 *  - runChangeover() antes de gerar novas instruções → produz o relatório anterior
 *  - ADVANCE_YEAR (opcional) → para persistir o trust na virada de temporada
 *
 * Não modifica EVs nem gera instruções. Só lê e relata.
 */

import { INSTRUCTION_TYPES } from './CoachAdvisor.js';

// ─────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────

/** Janela de pontos analisados para o relatório (pontos mais recentes) */
const REPORT_WINDOW = 30;

/** Threshold de compliance para considerar "executado" */
const COMPLIANCE_THRESHOLD = 0.55;

/** Delta de win rate para considerar "funcionou" */
const WINRATE_POSITIVE_DELTA = 0.10;
const WINRATE_NEGATIVE_DELTA = -0.10;

// Linhas de diagnóstico por filosofia e resultado
const DIAGNOSES = {
  OFFENSIVE: {
    executed_worked:    ['Perfeito. Pressão constante, resultado claro.', 'Isso. Sem deixar respirar.', 'Exatamente o plano. Continue.'],
    executed_neutral:   ['Executou, mas ele se adaptou. Vamos mudar o ângulo.', 'Seguiu o plano. Resultado inconclusivo — ajustar.'],
    executed_failed:    ['Fez o que pedi, mas ele leu. Preciso rever.', 'Executou bem, mas o adversário é bom nisso. Mudar.'],
    ignored_worked:     ['Você foi por fora e funcionou. Aproveite.', 'Não seguiu, mas o instinto ajudou dessa vez.'],
    ignored_failed:     ['Não seguiu o plano. Resultado visível.', 'Sem disciplina tática não chegamos longe.'],
    partial:            ['Quase. Mais consistência no padrão.', 'Perto do que pedi. Precisa de mais comprometimento.'],
  },
  DEFENSIVE: {
    executed_worked:    ['Paciência funcionou. Ele cedeu.', 'Exatamente. Rally longo, ponto nosso.', 'Disciplina tática recompensada.'],
    executed_neutral:   ['Executou, mas o adversário também é paciente. Ajustar.', 'Seguiu o plano. Sem resultado claro ainda.'],
    executed_failed:    ['Fez o que pedi. O adversário acertou demais. Revisando.', 'Plano executado, mas ele foi mais preciso. Mudar foco.'],
    ignored_worked:     ['Sorte que funcionou. Da próxima, segue o plano.'],
    ignored_failed:     ['Precisava de mais paciência. Errou na hora errada.', 'O plano existe por um motivo.'],
    partial:            ['Mais consistência. Você quebrando o padrão no momento errado.'],
  },
  COMPLETE: {
    executed_worked:    ['Equilibrio tático funcionou.', 'Plano executado e resultado positivo. Continue.'],
    executed_neutral:   ['Boa execução. Jogo ainda aberto — manter foco.'],
    executed_failed:    ['Seguiu o plano, mas precisamos de ajuste. Vendo o próximo set.'],
    ignored_worked:     ['Funcionou sem o plano. Mas consistência é o que queremos.'],
    ignored_failed:     ['Sem o plano, sem resultado. Próximo set: volta ao básico.'],
    partial:            ['Parcialmente executado. Vamos focar no que funcionou.'],
  },
  SPECIALIST: {
    executed_worked:    ['Explorou a superfície como planejado. Perfeito.', 'Esse é nosso território. Continue dominando.'],
    executed_neutral:   ['Executou o padrão de superfície. Resultado ainda aberto.'],
    executed_failed:    ['A superfície não está favorecendo hoje. Adaptando o plano.'],
    ignored_worked:     ['Improviso funcionou, mas a superfície é nossa vantagem natural.'],
    ignored_failed:     ['Abandonou o padrão de superfície e pagou o preço.'],
    partial:            ['Mais comprometimento com o padrão de superfície.'],
  },
  MENTAL: {
    executed_worked:    ['Cabeça no lugar. Resultado aparece.', 'Nos momentos decisivos, você esteve lá. Isso é trabalho.'],
    executed_neutral:   ['Boa postura mental. O resultado vem com consistência.'],
    executed_failed:    ['Fez tudo certo mentalmente. O adversário também estava afiado hoje.'],
    ignored_worked:     ['Instinto ajudou. Mas cabeça fria é mais confiável.'],
    ignored_failed:     ['Nos momentos-chave, a cabeça pesou. É o que treinamos para isso.'],
    partial:            ['Quase. A mentalidade nos momentos decisivos ainda precisa de trabalho.'],
  },
};

// Diagnoses para ex-jogadores de elite (careerPeakRank <= 5)
const ELITE_DIAGNOSES = {
  executed_worked:  ['Eu passei por isso. Esse plano funciona.', 'Quando era jogador, esse padrão me deu muitos pontos.'],
  executed_failed:  ['Vivi esse cenário como jogador. Precisa de mais precisão.'],
  ignored_failed:   ['Na minha época aprendi: sem plano, sem título.'],
};

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function pick(arr, seed = Math.random()) {
  if (!arr?.length) return '';
  return arr[Math.floor(seed * arr.length) % arr.length];
}

/**
 * Calcula compliance de uma instrução TARGET_SIDE nos pontos recentes.
 * Mede % de golpes no lado instruído.
 */
function calcTargetSideCompliance(matchLog, side) {
  const recent = matchLog.slice(-REPORT_WINDOW);
  if (!recent.length) return null;

  const withDir = recent.filter(m => m.targetX !== undefined && m.targetX !== null);
  if (withDir.length < 3) return null;

  // side 'BH' = targetX < -0.3, 'FH' = targetX > 0.3
  const targetSign = side === 'BH' ? -1 : 1;
  const onTarget = withDir.filter(m => {
    const sign = m.targetX < -0.3 ? -1 : m.targetX > 0.3 ? 1 : 0;
    return sign === targetSign;
  });

  return {
    rate: onTarget.length / withDir.length,
    total: withDir.length,
    onTarget: onTarget.length,
  };
}

/**
 * Calcula compliance de EXTEND_RALLY: média de rallyLen nos pontos recentes
 * vs. média anterior (últimos REPORT_WINDOW*2 pontos antes).
 */
function calcExtendRallyCompliance(matchLog) {
  const recent = matchLog.slice(-REPORT_WINDOW);
  const prior  = matchLog.slice(-REPORT_WINDOW * 2, -REPORT_WINDOW);

  const avgRecent = recent.length
    ? recent.reduce((s, m) => s + (m.rallyLen ?? 0), 0) / recent.length
    : null;
  const avgPrior = prior.length
    ? prior.reduce((s, m) => s + (m.rallyLen ?? 0), 0) / prior.length
    : null;

  if (avgRecent === null) return null;

  return {
    avgRecent: Math.round(avgRecent * 10) / 10,
    avgPrior:  avgPrior !== null ? Math.round(avgPrior * 10) / 10 : null,
    delta:     avgPrior !== null ? avgRecent - avgPrior : null,
    rate:      avgPrior !== null ? (avgRecent > avgPrior ? 1 : 0) : 0.5,
  };
}

/**
 * Calcula compliance de INTENT_LOCK: % de pontos com o intent correto
 * em momentos decisivos (break points se inBreakPt=true, todos se false).
 */
function calcIntentLockCompliance(matchLog, payload) {
  const recent      = matchLog.slice(-REPORT_WINDOW);
  const forceIntent = payload?.forceIntent ?? 'FINISH';
  const onlyBp      = payload?.inBreakPt ?? true;

  const relevant = onlyBp
    ? recent.filter(m => m.isBreakPoint)
    : recent;

  if (relevant.length < 2) return null;

  const onTarget = relevant.filter(m => m.intent === forceIntent);

  return {
    rate: onTarget.length / relevant.length,
    total: relevant.length,
    onTarget: onTarget.length,
  };
}

/**
 * Calcula o win rate nos pontos recentes vs. pontos anteriores.
 * Retorna { recentWR, priorWR, delta }
 */
function calcWinRateDelta(matchLog) {
  const recent = matchLog.slice(-REPORT_WINDOW);
  const prior  = matchLog.slice(-REPORT_WINDOW * 2, -REPORT_WINDOW);

  const recentWR = recent.length
    ? recent.filter(m => m.won).length / recent.length
    : null;
  const priorWR = prior.length
    ? prior.filter(m => m.won).length / prior.length
    : null;

  return {
    recentWR: recentWR !== null ? Math.round(recentWR * 100) : null,
    priorWR:  priorWR  !== null ? Math.round(priorWR  * 100) : null,
    delta:    recentWR !== null && priorWR !== null
      ? recentWR - priorWR
      : null,
  };
}

// ─────────────────────────────────────────────────────────────────
// GERAÇÃO DO RELATÓRIO DE EXECUÇÃO
// ─────────────────────────────────────────────────────────────────

/**
 * Gera o relatório de execução para a instrução mais recente do técnico.
 *
 * @param {Array}  matchLog         — histórico de pontos
 * @param {Array}  prevInstructions — instruções do changeover anterior
 * @param {object} coach            — objeto coach (com philosophy, origin, careerPeakRank)
 * @returns {object|null} report
 */
export function generateExecutionReport(matchLog, prevInstructions, coach) {
  if (!prevInstructions?.length || !matchLog?.length) return null;

  // Pega a instrução de maior prioridade do changeover anterior
  const inst = prevInstructions[0];
  if (!inst?.type) return null;

  const winRateData = calcWinRateDelta(matchLog);
  let compliance = null;
  let complianceLabel = null;
  let complianceDetail = null;

  // ── Calcular compliance por tipo ──
  if (inst.type === INSTRUCTION_TYPES.TARGET_SIDE) {
    const side = inst.payload?.side ?? 'BH';
    const data = calcTargetSideCompliance(matchLog, side);
    if (data) {
      compliance = data.rate;
      const pct = Math.round(data.rate * 100);
      complianceLabel = `${pct}% dos golpes foram para o ${side === 'BH' ? 'backhand' : 'forehand'}`;
      complianceDetail = winRateData.priorWR !== null
        ? `(era ${Math.round((1 - data.rate) * 100)}% antes)`
        : null;
    }
  } else if (inst.type === INSTRUCTION_TYPES.EXTEND_RALLY) {
    const data = calcExtendRallyCompliance(matchLog);
    if (data) {
      compliance = data.delta !== null ? (data.delta > 0 ? 0.8 : 0.3) : 0.5;
      complianceLabel = `Média de rally: ${data.avgRecent} golpes`;
      complianceDetail = data.avgPrior !== null
        ? `(era ${data.avgPrior} — ${data.delta > 0 ? '+' : ''}${Math.round(data.delta * 10) / 10} golpes)`
        : null;
    }
  } else if (inst.type === INSTRUCTION_TYPES.INTENT_LOCK) {
    const data = calcIntentLockCompliance(matchLog, inst.payload);
    if (data) {
      compliance = data.rate;
      const pct = Math.round(data.rate * 100);
      complianceLabel = `${pct}% dos momentos decisivos com ${inst.payload?.forceIntent?.toLowerCase() ?? 'intent'} certo`;
      complianceDetail = `(${data.onTarget}/${data.total} pontos-chave)`;
    }
  } else if (inst.type === INSTRUCTION_TYPES.DEPTH_PUSH) {
    // proxy: win rate como indicador
    compliance = winRateData.delta !== null && winRateData.delta > 0 ? 0.7 : 0.4;
    complianceLabel = 'Padrão de profundidade aplicado';
  } else if (inst.type === INSTRUCTION_TYPES.AVOID_NET) {
    // proxy: vitória no ponto quando oponente foi à rede
    const netPoints = matchLog.slice(-REPORT_WINDOW).filter(m => m.oppNet);
    if (netPoints.length >= 2) {
      const wr = netPoints.filter(m => m.won).length / netPoints.length;
      compliance = wr;
      complianceLabel = `${Math.round(wr * 100)}% de win rate quando ele subiu à rede`;
      complianceDetail = `(${netPoints.filter(m => m.won).length}/${netPoints.length} pontos)`;
    } else {
      compliance = 0.5;
      complianceLabel = 'Poucas subidas à rede para avaliar';
    }
  } else {
    // Fallback genérico: win rate como proxy
    compliance = winRateData.delta !== null
      ? clamp(0.5 + winRateData.delta, 0, 1)
      : 0.5;
    complianceLabel = 'Execução em análise';
  }

  // ── Determinar resultado ──
  const executed = compliance !== null ? compliance >= COMPLIANCE_THRESHOLD : null;
  const worked = winRateData.delta !== null
    ? winRateData.delta >= WINRATE_POSITIVE_DELTA
    : null;
  const failed = winRateData.delta !== null
    ? winRateData.delta <= WINRATE_NEGATIVE_DELTA
    : null;

  // ── Determinar chave de diagnóstico ──
  let diagKey = 'partial';
  if (executed === true  && worked === true)  diagKey = 'executed_worked';
  if (executed === true  && worked === false && failed === true) diagKey = 'executed_failed';
  if (executed === true  && worked === null)  diagKey = 'executed_neutral';
  if (executed === true  && !failed && !worked) diagKey = 'executed_neutral';
  if (executed === false && worked === true)  diagKey = 'ignored_worked';
  if (executed === false && worked !== true)  diagKey = 'ignored_failed';
  if (executed === null)                      diagKey = 'partial';

  // ── Gerar linha de diagnóstico ──
  const philosophy = coach?.philosophy ?? 'COMPLETE';
  const isElite = coach?.origin === 'RETIRED_PLAYER' && (coach?.careerPeakRank ?? 999) <= 5;
  const diagPool = isElite && ELITE_DIAGNOSES[diagKey]
    ? ELITE_DIAGNOSES[diagKey]
    : (DIAGNOSES[philosophy]?.[diagKey] ?? DIAGNOSES.COMPLETE[diagKey] ?? ['—']);

  const seed = (matchLog.length * 0.137 + (compliance ?? 0.5)) % 1;
  const diagText = pick(diagPool, seed);

  return {
    instruction: inst,
    compliance: compliance !== null ? Math.round(compliance * 100) : null,
    complianceLabel,
    complianceDetail,
    winRate: winRateData,
    executed,
    worked,
    failed,
    diagKey,
    diagText,
    _timestamp: Date.now(),
  };
}

// ─────────────────────────────────────────────────────────────────
// COACH TRUST
// ─────────────────────────────────────────────────────────────────

/**
 * Calcula o delta de coachTrust baseado no relatório de execução.
 * coachTrust range: 0.0 – 1.0 (init: 0.5)
 *
 * Regras:
 *  - Instrução executada e funcionou: +0.08
 *  - Instrução executada e neutra:    +0.02
 *  - Instrução executada e falhou:    -0.03 (técnico revisa)
 *  - Instrução ignorada e funcionou:  +0.01 (jogador tem razão, mas é instável)
 *  - Instrução ignorada e falhou:     -0.08
 *  - Parcial:                         -0.01
 */
export function calcTrustDelta(report) {
  if (!report) return 0;

  const map = {
    executed_worked:  +0.08,
    executed_neutral: +0.02,
    executed_failed:  -0.03,
    ignored_worked:   +0.01,
    ignored_failed:   -0.08,
    partial:          -0.01,
  };

  return map[report.diagKey] ?? 0;
}

/**
 * Aplica o delta de trust no objeto player.coach.
 * Retorna nova cópia do player.coach com trust atualizado.
 *
 * @param {object} playerCoach — player.coach (com coachId, trust, etc.)
 * @param {number} delta
 * @returns {object} novo player.coach
 */
export function applyTrustDelta(playerCoach, delta) {
  if (!playerCoach) return playerCoach;
  const current = playerCoach.trust ?? 0.5;
  return {
    ...playerCoach,
    trust: clamp(current + delta, 0.0, 1.0),
  };
}

// ─────────────────────────────────────────────────────────────────
// HISTÓRICO TÁTICO (para CoachProfileView)
// ─────────────────────────────────────────────────────────────────

/**
 * Adiciona uma entrada ao histórico tático do coach (coach._tacticHistory).
 * Mantém os últimos 20 registros.
 *
 * @param {object} coach
 * @param {object} report         — resultado de generateExecutionReport()
 * @param {object} newInstructions — instruções geradas neste changeover
 * @param {object} matchContext   — { set, game, surface }
 * @returns {object} coach atualizado
 */
export function appendTacticHistory(coach, report, newInstructions, matchContext = {}) {
  if (!coach) return coach;

  const entry = {
    matchContext,
    report,
    newInstructions,
    _timestamp: Date.now(),
  };

  const history = [...(coach._tacticHistory ?? []), entry].slice(-20);

  return { ...coach, _tacticHistory: history };
}

/**
 * Retorna um resumo de performance tática do coach ao longo do histórico.
 * Usado na aba "Tático" do CoachProfileView.
 */
export function getTacticSummary(coach) {
  const history = coach?._tacticHistory ?? [];
  if (!history.length) return null;

  const withReport = history.filter(h => h.report);
  const total      = withReport.length;
  if (!total) return null;

  const executed   = withReport.filter(h => h.report.executed === true).length;
  const worked     = withReport.filter(h => h.report.worked   === true).length;

  const byType = {};
  for (const h of withReport) {
    const type = h.report.instruction?.type ?? 'UNKNOWN';
    if (!byType[type]) byType[type] = { total: 0, executed: 0, worked: 0 };
    byType[type].total++;
    if (h.report.executed) byType[type].executed++;
    if (h.report.worked)   byType[type].worked++;
  }

  return {
    total,
    executedRate: Math.round((executed / total) * 100),
    workedRate:   Math.round((worked   / total) * 100),
    byType,
    recentReports: withReport.slice(-5).reverse().map(h => h.report),
  };
}

// ─────────────────────────────────────────────────────────────────
// FASE 2: HEADLESS/FAST SIM — entrada sintética de histórico tático
// ─────────────────────────────────────────────────────────────────

/**
 * Gera uma entrada sintética de histórico tático a partir dos stats
 * de uma partida simulada pelo FastSimulation ou Headless.
 *
 * No modo visual, o CoachTacticTracker recebe log ponto-a-ponto real.
 * No modo headless, criamos uma entrada simplificada baseada nos stats
 * agregados (aces, erros, winners, 1ºSrv%) — menos precisa mas real o
 * suficiente para o TecnicosView mostrar historico de todo o universo.
 *
 * @param {object} player      — jogador com player.coach e player.attrs
 * @param {object} matchResult — { won, stats: {aces, doubleFaults, unforcedErrors, serve1In, serve1Total, winners}, surface, roundLabel }
 * @returns {object|null}      — entrada compatível com coach._tacticHistory
 */
export function generateFastSimTacticEntry(player, matchResult) {
  const coach = player?.coach;
  if (!coach?.coachId) return null;

  const { won, stats = {}, surface = 'HARD', roundLabel = 'R?' } = matchResult;

  const serve1Pct = stats.serve1Total > 0
    ? (stats.serve1In / stats.serve1Total)
    : 0.60;

  const winnerTotal = (stats.winners ?? 0) + (stats.aces ?? 0);
  const errorTotal  = (stats.unforcedErrors ?? 0) + (stats.doubleFaults ?? 0);
  const totalPoints = Math.max(winnerTotal + errorTotal + 15, 20); // estimativa

  // Estima compliance baseada no resultado e na filosofia do técnico
  // Coach ofensivo quer winners/aces; defensivo quer menos erros; mental quer pontos decisivos
  const philosophy = coach.philosophy ?? 'COMPLETE';
  let estimatedCompliance, diagKey;

  if (philosophy === 'OFFENSIVE') {
    const aggressionRate = winnerTotal / totalPoints;
    estimatedCompliance  = clamp(aggressionRate * 2.5, 0.2, 0.95);
    diagKey = won
      ? (estimatedCompliance >= 0.55 ? 'executed_worked' : 'ignored_worked')
      : (estimatedCompliance >= 0.55 ? 'executed_failed' : 'ignored_failed');
  } else if (philosophy === 'DEFENSIVE') {
    const errorRate     = errorTotal / totalPoints;
    estimatedCompliance = clamp(1 - errorRate * 3, 0.2, 0.95);
    diagKey = won
      ? (estimatedCompliance >= 0.55 ? 'executed_worked' : 'ignored_worked')
      : (estimatedCompliance >= 0.55 ? 'executed_failed' : 'ignored_failed');
  } else if (philosophy === 'MENTAL') {
    // Proxy: ganhou a partida = executou nos momentos decisivos
    estimatedCompliance = won ? 0.72 : 0.38;
    diagKey = won ? 'executed_worked' : 'executed_failed';
  } else if (philosophy === 'SPECIALIST') {
    // Especialista de superfície — bônus se ganhou na superfície da especialidade
    const coachSurface = coach.surfaceSpecialty ?? surface;
    const surfaceMatch = coachSurface === surface;
    estimatedCompliance = won ? (surfaceMatch ? 0.80 : 0.55) : (surfaceMatch ? 0.45 : 0.30);
    diagKey = won ? 'executed_worked' : 'ignored_failed';
  } else {
    // COMPLETE — win rate como proxy direto
    estimatedCompliance = won ? 0.68 : 0.35;
    diagKey = won ? 'executed_worked' : 'executed_failed';
  }

  // Linha de diagnóstico sintética
  const FAST_DIAG_LINES = {
    executed_worked:  `Resultado consistente com o plano. ${serve1Pct >= 0.62 ? 'Saque funcionou.' : ''}`,
    executed_failed:  `Plano executado mas o adversário foi mais forte hoje.`,
    ignored_worked:   `Resultado positivo sem seguir o plano — instinto ajudou dessa vez.`,
    ignored_failed:   `Sem disciplina tática, sem resultado consistente.`,
    partial:          `Execução parcial. Resultado reflete a inconsistência.`,
  };

  const syntheticReport = {
    instruction:       { type: 'DEPTH_PUSH', payload: {} }, // instrução genérica para fast sim
    compliance:        Math.round(estimatedCompliance * 100),
    complianceLabel:   `${Math.round(estimatedCompliance * 100)}% de execução estimada (simulação)`,
    complianceDetail:  `1ºSrv: ${Math.round(serve1Pct * 100)}% | W: ${winnerTotal} | UE: ${stats.unforcedErrors ?? 0}`,
    winRate:           { recentWR: won ? 65 : 35, priorWR: 50, delta: won ? 0.15 : -0.15 },
    executed:          estimatedCompliance >= 0.55,
    worked:            won,
    failed:            !won,
    diagKey,
    diagText:          FAST_DIAG_LINES[diagKey] ?? '—',
    _isFastSimEntry:   true,  // marcador para filtrar em análises de compliance real
    _timestamp:        Date.now(),
  };

  const matchContext = { set: null, game: null, surface, round: roundLabel, won };

  return { report: syntheticReport, newInstructions: [], matchContext };
}

