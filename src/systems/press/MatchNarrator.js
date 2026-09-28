/**
 * MatchNarrator.js
 * ─────────────────────────────────────────────────────────────────
 * FASE 7 — Logs Narrativos por Partida
 *
 * Não gera estatísticas. Gera interpretação.
 * Causa e efeito, não números soltos.
 * Jornalismo esportivo, não scoresheet.
 *
 * Entrada:  resultado completo de simulateMatchHeadless
 * Saída:    { headline, tactical_summary, turning_point,
 *             pattern_highlight, plan_vs_result, full_report, tags }
 */

import { heatScoreToTier } from '../analytics/MatchHeat.js';
import { getArchetypeVoice, getPlayProfile, generatePrefs } from '../../domain/players/playerPrefs.js';
import { isTiebreakSetScore } from '../../core/constants.js';

// ════════════════════════════════════════════════════════════════════
// UTILS
// ════════════════════════════════════════════════════════════════════

const pct  = (n, d)  => (!d ? 0 : Math.round((n / d) * 100));
const avg  = arr     => (!arr?.length ? 0 : arr.reduce((a,b)=>a+b,0)/arr.length);
const pick = arr     => arr[Math.floor(Math.random() * arr.length)];
const fmt  = detail  => Array.isArray(detail)
  ? detail.map(s => Array.isArray(s) ? `${s[0]}–${s[1]}` : s).join(', ')
  : '';


const SURFACE_LABEL = {
  CLAY:   'saibro',
  GRASS:  'grama',
  HARD:   'quadra dura',
  STREET: 'asfalto',
  CARPET: 'veludo',
  INDOOR: 'indoor',
};

const SHOT_VOICE = {
  FLAT:        'flat winners',
  TOPSPIN:     'topspin cruzado',
  HEAVY_TOP:   'topspin pesado',
  SLICE:       'slice',
  VOLLEY:      'volley',
  DROP:        'drop shot',
  BANANA:      'banana',
  SHORT_ANGLE: 'ângulo curto',
  SMASH:       'smash',
  LOB_ATK:     'lob de ataque',
  LOB_DEF:     'lob defensivo',
  SLICE_SHORT: 'slice curto',
  PASSING:     'passing',
};

// ════════════════════════════════════════════════════════════════════
// EXTRAÇÃO DE MÉTRICAS
// ════════════════════════════════════════════════════════════════════

function extractMetrics(winner, loser, result, surface) {
  const winnerIsA = result?.winner?.id === (result?.gs?.players?.[0]?.id ?? result?.winner?.id);
  const statW = winnerIsA ? (result?.stats?.a ?? {}) : (result?.stats?.b ?? {});
  const statL = winnerIsA ? (result?.stats?.b ?? {}) : (result?.stats?.a ?? {});

  const wCtx = winner.ctx ?? {};
  const lCtx = loser.ctx  ?? {};
  const wMC  = wCtx.matchCtx ?? {};
  const lMC  = lCtx.matchCtx ?? {};

  // ── Conjuntos ─────────────────────────────────────────────────────
  const setsDetail = result?.setsDetail ?? [];
  const totalSets  = setsDetail.length;

  const setNarratives = setsDetail.map(([a, b], i) => {
    const wGames = winnerIsA ? a : b;
    const lGames = winnerIsA ? b : a;
    const wWonSet = wGames > lGames;
    const isClose  = Math.abs(wGames - lGames) <= 1 || isTiebreakSetScore(wGames, lGames);
    const isTb     = isTiebreakSetScore(wGames, lGames);
    const isBagel  = lGames === 0;
    const isBread  = lGames === 1;
    return { set: i+1, wGames, lGames, wWonSet, isClose, isTb, isBagel, isBread };
  });

  const wTotalGames = setNarratives.reduce((s, n) => s + n.wGames, 0);
  const lTotalGames = setNarratives.reduce((s, n) => s + n.lGames, 0);

  // ── Saque ─────────────────────────────────────────────────────────
  const wSrv1Pct   = pct(statW.serve1In ?? 0, statW.serve1Total ?? 0);
  const lSrv1Pct   = pct(statL.serve1In ?? 0, statL.serve1Total ?? 0);
  const wSrv1Kmh   = Math.round(statW.serve1AvgKmh ?? 0);
  const lSrv1Kmh   = Math.round(statL.serve1AvgKmh ?? 0);
  const wHoldPct   = pct(statW.gamesHeld ?? 0, statW.gamesServed ?? 1);
  const lHoldPct   = pct(statL.gamesHeld ?? 0, statL.gamesServed ?? 1);
  const wBreakPct  = pct(statW.gamesConverted ?? 0, statW.gamesReturned ?? 1);
  const wAces      = statW.aces ?? 0;
  const lAces      = statL.aces ?? 0;
  const wDblFaults = statW.doubleFaults ?? 0;

  // ── Rally ─────────────────────────────────────────────────────────
  const wRallyLengths = statW.rallyLengths ?? [];
  const lRallyLengths = statL.rallyLengths ?? [];
  const matchAvgRally = avg([...wRallyLengths, ...lRallyLengths]);
  const longRallies   = [...wRallyLengths, ...lRallyLengths].filter(r => r >= 10).length;
  const maxRally      = Math.max(0, ...[...wRallyLengths, ...lRallyLengths]);

  // ── Rede ──────────────────────────────────────────────────────────
  const wNetAppr = statW.netApproaches ?? (wCtx.netFromTransition ?? 0);
  const wNetWon  = statW.netPointsWon  ?? 0;
  const wNetPct  = pct(wNetWon, wNetAppr);
  const lNetAppr = statL.netApproaches ?? (lCtx.netFromTransition ?? 0);

  // ── Shot profile ──────────────────────────────────────────────────
  const wByType = statW.byType ?? {};
  const lByType = statL.byType ?? {};
  const wTotalShots = Object.values(wByType).reduce((a,b)=>a+b,0) || 1;

  const shotRanked = Object.entries(wByType)
    .filter(([t]) => t !== 'LOB_DEF')
    .sort(([,a],[,b]) => b - a);
  const dominantShot  = shotRanked[0]?.[0] ?? null;
  const dominantShotN = shotRanked[0]?.[1] ?? 0;
  const dominantPct   = pct(dominantShotN, wTotalShots);

  const wDrops  = wByType.DROP  ?? 0;
  const wSlice  = wByType.SLICE ?? 0;
  const wFlat   = wByType.FLAT  ?? 0;
  const wBanana = (wByType.BANANA ?? 0) + (wByType.SHORT_ANGLE ?? 0);
  const wHeavy  = wByType.HEAVY_TOP ?? 0;
  const wVolley = wByType.VOLLEY ?? 0;

  // ── Erros / Winners / Qualidade ───────────────────────────────────
  const wWinners = statW.winners ?? 0;
  const wUE      = statW.unforcedErrors ?? 0;
  const wFE      = statW.forcedErrors ?? 0;
  const lWinners = statL.winners ?? 0;
  const lUE      = statL.unforcedErrors ?? 0;
  const lFE      = statL.forcedErrors ?? 0;
  const wQuality = statW.avgQuality ?? null;
  const lQuality = statL.avgQuality ?? null;

  // ── Tiebreaks / Clutch ────────────────────────────────────────────
  const wTbWon  = statW.tiebreaksWon ?? 0;
  const totalTbs = setNarratives.filter(s => s.isTb).length;
  const wMpSaved = statW.matchPointsSaved ?? 0;

  // ── Match Heat ────────────────────────────────────────────────────
  // Prioridade: result.heat (já calculado), fallback gs.heat, fallback null
  const heatRaw = result?.heat ?? (result?.gs?.heat
    ? { score: Math.round(result.gs.heat.score), peak: Math.round(result.gs.heat.peak) }
    : null);
  const matchHeatScore = heatRaw?.score ?? null;
  const matchHeatPeak  = heatRaw?.peak  ?? null;
  const matchHeatTier  = matchHeatPeak != null ? heatScoreToTier(matchHeatPeak) : null;

  // ── Retirement / MTO ──────────────────────────────────────────────
  const retirement      = result?.retirement ?? null;
  const hadRetirement   = !!retirement;
  const inMatchInjuries = result?.inMatchInjuryEvents ?? [];

  // ── Lado exposto ──────────────────────────────────────────────────
  const lBhHit = lMC.oppBhHits ?? 0;
  const lFhHit = lMC.oppFhHits ?? 0;
  const lTotalHit = lBhHit + lFhHit;
  const weakSide = lTotalHit >= 6
    ? lBhHit > lFhHit * 1.4 ? 'BH'
    : lFhHit > lBhHit * 1.4 ? 'FH'
    : null
    : null;
  const weakSidePct = weakSide === 'BH' ? pct(lBhHit, lTotalHit)
                    : weakSide === 'FH' ? pct(lFhHit, lTotalHit)
                    : null;

  // ── Momentum / Identidade ─────────────────────────────────────────
  const wMomentum    = wCtx._momentumEWMA ?? 0.5;
  const wPlan        = winner._matchPlan ?? null;
  const lPlan        = loser._matchPlan  ?? null;
  const wSigKey      = null;
  const wSigPattern  = null;
  const wPrefs       = winner.prefs ?? (winner.attrs ? generatePrefs(winner.attrs) : null);
  const lPrefs       = loser.prefs  ?? (loser.attrs  ? generatePrefs(loser.attrs)  : null);
  const wStyle       = wPrefs ? getArchetypeVoice(wPrefs) : null;
  const lStyle       = lPrefs ? getArchetypeVoice(lPrefs) : null;
  const wProfile     = wPrefs ? getPlayProfile(wPrefs) : {};
  const lProfile     = lPrefs ? getPlayProfile(lPrefs) : {};
  const wSurfId      = winner.surfaceIdentity ?? null;
  const lSurfId      = loser.surfaceIdentity  ?? null;
  const wIsOnHomeSurf = wSurfId?.surface?.toUpperCase() === surface?.toUpperCase();
  const lIsOnHomeSurf = lSurfId?.surface?.toUpperCase() === surface?.toUpperCase();

  // ── Turning point ─────────────────────────────────────────────────
  let turningPointSet = null;
  for (let i = 0; i < setNarratives.length - 1; i++) {
    if (!setNarratives[i].wWonSet && setNarratives[i+1].wWonSet) {
      turningPointSet = setNarratives[i+1].set; break;
    }
  }
  if (!turningPointSet && setNarratives.length > 1) {
    const closest = setNarratives.reduce((best,s) =>
      Math.abs(s.wGames - s.lGames) < Math.abs(best.wGames - best.lGames) ? s : best
    );
    turningPointSet = closest.set;
  }

  const dominance = Math.min(1,
    (wTotalGames - lTotalGames) / (wTotalGames + lTotalGames + 0.001) + 0.3
  );

  return {
    setsDetail, totalSets, setNarratives, turningPointSet,
    wTotalGames, lTotalGames,
    wSrv1Pct, lSrv1Pct, wSrv1Kmh, lSrv1Kmh,
    wHoldPct, lHoldPct, wBreakPct,
    wAces, lAces, wDblFaults,
    matchAvgRally, longRallies, maxRally,
    wNetAppr, wNetWon, wNetPct, lNetAppr,
    wByType, lByType, dominantShot, dominantPct, dominantShotN,
    wDrops, wSlice, wFlat, wBanana, wHeavy, wVolley, wTotalShots,
    wWinners, wUE, wFE, lWinners, lUE, lFE, wQuality, lQuality,
    wTbWon, totalTbs, wMpSaved,
    matchHeatScore, matchHeatPeak, matchHeatTier,
    retirement, hadRetirement, inMatchInjuries,
    weakSide, weakSidePct,
    wMomentum,
    wPlan, lPlan,
    wSigKey, wSigPattern,
    wStyle, lStyle, wProfile, lProfile,
    wSurfId, lSurfId, wIsOnHomeSurf, lIsOnHomeSurf,
    dominance, statW, statL,
  };
}


// ════════════════════════════════════════════════════════════════════
// HEADLINE
// ════════════════════════════════════════════════════════════════════

function buildHeadline(W, L, m, surface, rivalry) {
  const wn = W.name, ln = L.name;
  const score = fmt(m.setsDetail);
  const surf  = SURFACE_LABEL[surface?.toUpperCase()] ?? surface ?? 'quadra';

  // ── Abandono por lesão em campo ─────────────────────────────────
  if (m.hadRetirement) {
    const r = m.retirement;
    const injLabel = r?.injuryType === 'CRAMP' ? 'cãibra'
      : r?.injuryType === 'HAMSTRING' ? 'posterior da coxa'
      : r?.injuryType === 'ANKLE'     ? 'tornozelo'
      : r?.injuryType === 'KNEE'      ? 'joelho'
      : r?.injuryType === 'BACK'      ? 'lombar'
      : r?.injuryType === 'ABDOMINAL' ? 'abdômen'
      : 'lesão';
    return pick([
      `${wn} vence por abandono após ${ln} sair de quadra com ${injLabel}`,
      `${ln} se retira com ${injLabel} — ${wn} avança sem completar o placar`,
      `Drama em ${surf}: ${ln} não consegue continuar por ${injLabel} e entrega a vitória a ${wn}`,
    ]);
  }

  const straight  = m.setNarratives.every(s => s.wWonSet);
  const comeback  = m.totalSets >= 3 && !m.setNarratives[0].wWonSet;
  const hasBagel  = m.setNarratives.some(s => s.isBagel);
  const allClose  = m.setNarratives.every(s => s.isClose);

  // ── Camada de rivalidade ────────────────────────────────────────
  if (rivalry?.graduated) {
    const { type, status, winnerH2hWins, loserH2hWins, winnerWasTrailer,
            priorGap, tiebreakSets, priorMatches, isLegendary, winnerBrokeStreak,
            loserHadStreak, streakLength } = rivalry;

    // Lendária — linguagem especial
    if (isLegendary && m.totalSets >= 3 && allClose) return pick([
      `${wn} e ${ln}: capítulo ${priorMatches + 1} de uma rivalidade lendária — ${score}`,
      `Guerra lendária. ${wn} sobrevive a ${ln} por ${score} — H2H ${winnerH2hWins}–${loserH2hWins}`,
      `${priorMatches + 1} encontros. Nenhum foi simples. Este também não. ${wn} por ${score}`,
    ]);

    if (isLegendary && straight) return pick([
      `${wn} passa por ${ln} em sets diretos no ${priorMatches + 1}º capítulo — ${score}`,
      `Na rivalidade lendária, hoje ${wn} não deu chances: ${score} sobre ${ln}`,
    ]);

    // Trailer vira o H2H
    if (winnerWasTrailer && priorGap >= 3) return pick([
      `${wn} apaga a desvantagem no H2H e vira — ${winnerH2hWins}–${loserH2hWins} agora`,
      `A história muda: ${wn} de ${rivalry.winnerPriorWins}–${rivalry.loserPriorWins} para ${winnerH2hWins}–${loserH2hWins} no H2H`,
      `${wn} recusa o script do H2H e enterra ${ln} — ${score}`,
    ]);

    if (winnerWasTrailer && priorGap >= 1) return pick([
      `${wn} empata o H2H: ${winnerH2hWins}–${loserH2hWins} numa série que ficou mais imprevisível`,
      `${ln} tinha a vantagem no H2H, ${wn} tinha o dia: ${score}`,
    ]);

    // Quebra de sequência
    if (winnerBrokeStreak && streakLength >= 3) return pick([
      `${wn} interrompe série de ${streakLength} vitórias de ${ln} no duelo — ${score}`,
      `A sequência de ${ln} no H2H acabou. ${wn} diz que não era inevitável: ${score}`,
    ]);

    // GRUDGE + drama
    if (type === 'GRUDGE' && !straight && m.totalSets >= 3) return pick([
      `Outro capítulo da guerra: ${wn} sobre ${ln} por ${score} — ${tiebreakSets} tiebreaks na história do duelo`,
      `${wn} e ${ln} não se resolvem de forma simples. ${score} hoje, H2H ${winnerH2hWins}–${loserH2hWins}`,
    ]);

    // FINALS_CURSE
    if (type === 'FINALS_CURSE' && rivalry.finalsMatches >= 3) return pick([
      `O destino os coloca juntos de novo — ${wn} sobre ${ln} por ${score}`,
      `${rivalry.finalsMatches}ª vez numa grande final: ${wn} confirma ${score} sobre ${ln}`,
    ]);
  }

  // ── Lógica original ───────────────────────────────────────────────
  if (straight && hasBagel && m.totalSets === 2) return pick([
    `${wn} aniquila ${ln} sem deixar margem — ${score}`,
    `Aula em dois sets: ${wn} não dá chances a ${ln}`,
    `${ln} não teve resposta. ${wn} passa com ${score} sem respirar`,
    `Execução perfeita: ${wn} sobre ${ln} por ${score}`,
  ]);

  if (comeback) return pick([
    `${wn} cai, levanta e enterra ${ln} — a virada que o circuito vai lembrar`,
    `De um set abaixo a campeão: ${wn} supera ${ln} por ${score}`,
    `${wn} encontra o jogo quando mais precisava e sobra — ${score}`,
    `A ressurreição de ${wn}: de costas para a parede a ${score} sobre ${ln}`,
  ]);

  if (allClose && m.totalSets >= 3) return pick([
    `${wn} sobrevive a uma guerra com ${ln} e avança — ${score}`,
    `Cada game foi uma negociação: ${wn} leva por ${score}`,
    `${wn} e ${ln} deixam tudo em quadra — ${score} no fim`,
    `Nada separava os dois até ${wn} encontrar a resposta`,
  ]);

  if (m.wAces >= 12 && m.wHoldPct === 100) return pick([
    `${m.wAces} aces e nenhum break sofrido: ${wn} intocável ao sacar`,
    `${wn} transforma o saque em muralha — ${m.wAces} aces, zero breaks concedidos`,
  ]);

  if (m.wNetAppr >= 14 && m.wNetPct >= 68) return pick([
    `${wn} fecha a rede e não deixa saída a ${ln} — ${score}`,
    `Rede como lei: ${wn} impõe ${m.wNetAppr} subidas com ${m.wNetPct}% de aproveitamento`,
  ]);

  if (m.weakSide && m.weakSidePct >= 62) {
    const side = m.weakSide === 'BH' ? 'backhand' : 'forehand';
    return pick([
      `${wn} acha o endereço certo e não sai mais — ${score}`,
      `Cirurgia tática: ${wn} opera o ${side} de ${ln} por ${score}`,
    ]);
  }

  if (m.wIsOnHomeSurf && !m.lIsOnHomeSurf) return pick([
    `${wn} em casa no ${surf} — ${ln} nunca se sentiu confortável`,
    `${wn} defende o território: ${score} no ${surf}`,
  ]);

  if (m.lUE >= 28) return pick([
    `${ln} se autodestrói — ${wn} só precisou manter a raquete em campo`,
    `${m.lUE} erros não-forçados de ${ln}: ${wn} não precisou se esforçar`,
  ]);

  if (m.wWinners >= 28 && m.wUE <= 12) return pick([
    `${wn} joga no limite e não erra — ${m.wWinners} winners com ${m.wUE} erros`,
    `Agressividade com controle: ${m.wWinners} winners, ${m.wUE} erros não-forçados`,
  ]);

  if (m.totalTbs >= 2 && m.wTbWon === m.totalTbs) return pick([
    `${wn} é implacável nos tiebreaks — ${m.wTbWon}/${m.totalTbs} convertidos`,
    `Os momentos de pressão máxima pertenceram a ${wn}: ${m.wTbWon} tiebreaks vencidos`,
  ]);

  return straight
    ? pick([
        `${wn} supera ${ln} em sets diretos — ${score}`,
        `Vitória segura de ${wn} sobre ${ln}: ${score}`,
        `${wn} impõe o jogo e vence ${ln} por ${score}`,
      ])
    : pick([
        `${wn} prevalece sobre ${ln} em ${m.totalSets} sets — ${score}`,
        `Após ${m.totalSets} sets, ${wn} sai na frente de ${ln}`,
      ]);
}


// ════════════════════════════════════════════════════════════════════
// TACTICAL SUMMARY
// ════════════════════════════════════════════════════════════════════

function buildTacticalSummary(W, L, m, surface, rivalry) {
  const wn = W.name, ln = L.name;
  const surf = SURFACE_LABEL[surface?.toUpperCase()] ?? 'quadra';
  const parts = [];

  // ── Abandono por lesão: narrativa adaptada ────────────────────────
  if (m.hadRetirement) {
    const r = m.retirement;
    const injLabel = r?.injuryType === 'CRAMP'     ? 'cãibra'
      : r?.injuryType === 'HAMSTRING' ? 'posterior da coxa'
      : r?.injuryType === 'ANKLE'     ? 'tornozelo'
      : r?.injuryType === 'KNEE'      ? 'joelho'
      : r?.injuryType === 'BACK'      ? 'lombar'
      : r?.injuryType === 'ABDOMINAL' ? 'abdômen'
      : 'lesão';
    parts.push(pick([
      `A partida não chegou ao fim natural. ${ln} tentou continuar, mas a ${injLabel} tornou impossível — o abandono encerrou o que o placar não pôde. ${wn} avança, mas a vitória chegou de uma forma que nenhum competidor escolheria.`,
      `${ln} saiu da quadra com ${injLabel}. O tênis ficou em segundo plano — o que restou foi a imagem de um jogador que tentou continuar enquanto o corpo não permitia. ${wn} avança sem que o resultado reflita o que aconteceu entre os dois.`,
      `A vitória de ${wn} veio por abandono. ${ln} lutou enquanto pôde, mas a ${injLabel} encerrou a partida antes do placar normal. Em ${surf}, o resultado importa, mas o que aconteceu em campo é uma história diferente.`,
    ]));
    if (m.totalSets >= 1 && m.setsDetail?.length >= 1) {
      parts.push(pick([
        `O jogo que existiu antes da lesão mostrou dois competidores em nível. O abandono interrompeu uma disputa que ainda não estava resolvida.`,
        `Antes do abandono, os sets disputados foram suficientes para mostrar que havia uma partida real acontecendo — mas não tempo para ela se resolver pelo mérito.`,
      ]));
    }
    return parts.join(' ');
  }

  // 0. Contexto de rivalidade — abre o resumo quando relevante
  if (rivalry?.graduated && rivalry.priorMatches >= 3) {
    const { type, priorMatches, winnerH2hWins, loserH2hWins,
            winnerWasTrailer, isIntense, wasEven, tiebreakSets } = rivalry;

    if (type === 'GRUDGE' && tiebreakSets >= 4) {
      parts.push(pick([
        `${wn} e ${ln} já jogaram ${priorMatches} vezes — com ${tiebreakSets} sets decididos no tiebreak. A tensão acumulada nessa série aparece em cada ponto disputado. `,
        `O histórico desse duelo é uma coleção de tiebreaks. Hoje não foi diferente no padrão — só no nome que levou o resultado. `,
      ]));
    } else if (winnerWasTrailer && rivalry.priorGap >= 2) {
      parts.push(pick([
        `${ln} liderava o H2H ${rivalry.loserPriorWins}–${rivalry.winnerPriorWins} antes desta partida. ${wn} entrou sabendo que precisava mudar uma narrativa estabelecida — e mudou. `,
        `Série desfavorável ao entrar, ${wn} jogou hoje como quem precisa reescrever história — e o resultado confirmou que histórias podem ser reescritas. `,
      ]));
    } else if (isIntense && wasEven) {
      parts.push(pick([
        `H2H empatado ${rivalry.winnerPriorWins}–${rivalry.loserPriorWins} ao entrar em quadra. ${wn} saiu com ${winnerH2hWins}–${loserH2hWins} — e a vantagem mínima que separa as duas narrativas. `,
        `Série equilibrada: ${rivalry.winnerPriorWins}–${rivalry.loserPriorWins} antes de hoje. Essas partidas são decididas em detalhes, e ${wn} foi mais preciso nos detalhes. `,
      ]));
    }
  }

  // 1. Abertura: estilo + superfície
  if (m.wStyle) {
    const base = m.wIsOnHomeSurf
      ? `${wn} chegou em seu elemento — ${surf} é a superfície onde ${m.wStyle.how}. `
      : `Como ${m.wStyle.who}, ${wn} ${m.wStyle.how}. `;
    parts.push(base);
  }

  // 2. Conflito de estilos
  if (m.lStyle && m.wStyle) {
    if (m.lProfile?.isGrinder && m.wProfile?.isPowerAttacker) {
      parts.push(pick([
        `${ln} queria rally longo — ${wn} não deu paciência para isso, terminando os pontos antes do ritmo se estabelecer.`,
        `A batalha de estilos foi clara: ${ln} precisava de tempo, ${wn} precisava de velocidade. A quadra foi mais rápida do que ${ln} queria.`,
      ]));
    } else if (m.wProfile?.isNetAttacker && m.lProfile?.isGrinder) {
      parts.push(pick([
        `A receita de ${wn}: tirar ${ln} do fundo onde se sente seguro e fechar a rede antes da troca se estabelecer.`,
        `${ln} vive nos rallies longos. ${wn} não deixou nenhum rally ficar longo o suficiente.`,
      ]));
    }
  }

  // 3. Saque
  if (m.wSrv1Pct >= 70) {
    parts.push(pick([
      `Primeiro saque em ${m.wSrv1Pct}%${m.wSrv1Kmh > 180 ? ` com média de ${m.wSrv1Kmh} km/h` : ''} — o suficiente para ditar o ritmo desde o saque.`,
      `Com ${m.wSrv1Pct}% no primeiro${m.wAces >= 8 ? ` e ${m.wAces} aces` : ''}, ${wn} controlou completamente os games de saque.`,
    ]));
  } else if (m.wSrv1Pct <= 48 && m.wHoldPct >= 85) {
    parts.push(pick([
      `O primeiro saque traiu ${wn} (${m.wSrv1Pct}%), mas o segundo sustentou o peso — a partida foi resolvida no rally, não no saque.`,
      `Apenas ${m.wSrv1Pct}% no primeiro saque e ainda assim ${m.wHoldPct}% de holds. ${wn} venceu apesar do saque, não por causa dele.`,
    ]));
  }
  if (m.lHoldPct <= 55) {
    parts.push(pick([
      `${ln} sacou mal — ${m.lHoldPct}% de holds é ceder o jogo ao adversário.`,
      `O saque de ${ln} foi uma ferida aberta durante toda a partida: ${m.lHoldPct}% de eficiência em hold é muito pouco para se manter competitivo.`,
    ]));
  }

  // 4. Lado fraco explorado
  if (m.weakSide && m.weakSidePct >= 55) {
    const side = m.weakSide === 'BH' ? 'backhand' : 'forehand';
    parts.push(pick([
      `O ${side} de ${ln} recebeu ${m.weakSidePct}% das bolas direcionadas. Uma vez que ${wn} encontrou o padrão, não saiu mais.`,
      `Mapa tático da partida: o ${side} de ${ln} foi atacado em ${m.weakSidePct}% dos pontos construtivos. Quando um buraco existe, um bom jogador não para de cavar.`,
      `${wn} descobriu o ${side} de ${ln} cedo e nunca parou de explorar. ${m.weakSidePct}% dos golpes direcionados para o mesmo endereço — até o placar fechar.`,
    ]));
  }

  // 5. Rally / Shot profile
  if (m.matchAvgRally >= 8) {
    parts.push(pick([
      `Rallies pesados — ${m.matchAvgRally.toFixed(1)} bolas em média${m.longRallies >= 5 ? `, com ${m.longRallies} trocas acima de 10 golpes` : ''}. ${wn} tinha mais pulmão quando os pontos pesavam.`,
      `A partida foi física: ${m.matchAvgRally.toFixed(1)} bolas por rally. Quem errasse primeiro pagava caro — e ${ln} errou mais.`,
    ]));
  } else if (m.matchAvgRally < 3.5) {
    parts.push(pick([
      `Tênis explosivo: ${m.matchAvgRally.toFixed(1)} bolas por rally em média. A maioria dos pontos terminou nos três primeiros golpes.`,
      `Rallies curtíssimos (${m.matchAvgRally.toFixed(1)} em média). Não havia tempo para construção — quem acertou o primeiro golpe decisivo levou o ponto.`,
    ]));
  }

  if (m.dominantShot && m.dominantPct >= 35 && m.dominantShot !== 'TOPSPIN') {
    const shotName = SHOT_VOICE[m.dominantShot] ?? m.dominantShot.toLowerCase();
    parts.push(pick([
      `O golpe dominante de ${wn} foi o ${shotName} — ${m.dominantPct}% do total de bolas jogadas.`,
      `${m.dominantShotN} ${shotName}s de ${wn}: quando um golpe representa ${m.dominantPct}% do jogo, o adversário sabe o que vem mas ainda não consegue responder.`,
    ]));
  }

  if (m.wDrops >= 6 && m.matchAvgRally >= 5) {
    parts.push(pick([
      `${m.wDrops} drop shots de ${wn} quebraram o ritmo de ${ln} repetidas vezes. Nada desorganiza um adversário de fundo como uma bola que fica no serviço.`,
      `O drop shot foi usado como interruptor de ritmo: ${m.wDrops} tentativas contra um adversário que preferia rally. Disrupção calculada.`,
    ]));
  }

  // 6. Rede
  if (m.wNetAppr >= 10) {
    if (m.wNetPct >= 68) {
      parts.push(pick([
        `${m.wNetAppr} aproximações à rede com ${m.wNetPct}% de aproveitamento — ${wn} transformou a zona frontal em território proibido para ${ln}.`,
        `A ofensiva de rede foi devastadora: ${m.wNetAppr} subidas, ${m.wNetPct}% convertidas. ${ln} nunca encontrou o ângulo de passe.`,
      ]));
    } else {
      parts.push(pick([
        `${wn} tentou a rede com frequência — ${m.wNetAppr} aproximações — mas o aproveitamento (${m.wNetPct}%) ficou abaixo do esperado. A pressão gerada compensou.`,
      ]));
    }
  }

  // 7. Erros / Winners
  if (m.wWinners >= 22 && m.wUE <= 10) {
    parts.push(pick([
      `${m.wWinners} winners com apenas ${m.wUE} erros não-forçados — uma combinação que é quase impossível de superar.`,
      `Relação de ${wn}: ${m.wWinners} winners para ${m.wUE} erros. Essa proporção é a diferença entre jogar para vencer e jogar para não perder.`,
    ]));
  } else if (m.lUE >= 22) {
    parts.push(pick([
      `${ln} produziu ${m.lUE} erros não-forçados — um número que perde partida sozinho em qualquer nível.`,
      `A derrota de ${ln} foi construída de dentro: ${m.lUE} erros não-forçados. A pressão de ${wn} foi suficiente para colapsar o padrão.`,
    ]));
  }

  // 8. Qualidade de rally comparada
  if (m.wQuality && m.lQuality && Math.abs(m.wQuality - m.lQuality) >= 0.08) {
    const diff = Math.round((m.wQuality - m.lQuality) * 100);
    parts.push(
      `Qualidade média de rally: ${Math.round(m.wQuality*100)}% de ${wn} vs ${Math.round(m.lQuality*100)}% de ${ln}. Aqueles ${diff} pontos percentuais fizeram toda a diferença ao longo dos rallies.`
    );
  }

  if (parts.length === 0) {
    parts.push(`${wn} foi mais consistente nas trocas que definiram o jogo. Nenhum padrão isolado dominou — foi a soma de escolhas certas.`);
  }

  return parts.slice(0, 4).join(' ');
}


// ════════════════════════════════════════════════════════════════════
// TURNING POINT
// ════════════════════════════════════════════════════════════════════

function buildTurningPoint(W, L, m, rivalry) {
  const wn = W.name, ln = L.name;
  const setN = m.turningPointSet;
  const sn   = setN ? m.setNarratives[setN-1] : null;
  const ord  = ['primeiro','segundo','terceiro','quarto','quinto'];

  // ── Abandono por lesão: o turning point é o abandono ─────────────
  if (m.hadRetirement) {
    const r = m.retirement;
    const injLabel = r?.injuryType === 'CRAMP'     ? 'cãibra'
      : r?.injuryType === 'HAMSTRING' ? 'posterior da coxa'
      : r?.injuryType === 'ANKLE'     ? 'tornozelo'
      : r?.injuryType === 'KNEE'      ? 'joelho'
      : r?.injuryType === 'BACK'      ? 'lombar'
      : r?.injuryType === 'ABDOMINAL' ? 'abdômen'
      : 'lesão';
    return pick([
      `O ponto de virada não foi tático — foi médico. ${ln} sinalizou ao árbitro que não podia continuar. A ${injLabel} encerrou a discussão antes que o placar pudesse.`,
      `A partida mudou quando ${ln} parou. Não foi um break, não foi uma série de winners — foi o corpo dizendo o que o competidor não queria aceitar. A ${injLabel} foi o turning point.`,
      `Não há turning point de tênis nesta partida. O que a definiu foi a ${injLabel} de ${ln} — um momento que vai além do placar e das estatísticas.`,
    ]);
  }

  if (!setN || m.setNarratives.every(s => s.wWonSet)) {
    if (m.wSrv1Pct >= 70 && m.wHoldPct === 100) return pick([
      `Não houve um momento de virada — ${wn} nunca deixou a partida ameaçar. O saque manteve os games de serviço blindados do começo ao fim.`,
      `A partida pertenceu a ${wn} desde o primeiro ponto. Domínio consistente não tem turning point — só confirmação.`,
    ]);
    if (m.wBreakPct >= 60) return pick([
      `Não houve virada porque nunca houve dúvida. ${wn} foi mais eficiente nos momentos de break — a única troca que define o placar.`,
      `O controle de ${wn} foi tamanho que a narrativa não teve ponto de ruptura. Só progressão.`,
    ]);
    return pick([
      `A partida nunca esteve em dúvida. ${wn} não deu abertura para ${ln} criar o caos necessário para uma virada.`,
      `Não há turning point quando um jogador domina do primeiro ao último game. ${wn} fez disso uma realidade.`,
    ]);
  }

  if (setN >= 2) {
    const prevSn = m.setNarratives[setN - 2];
    if (prevSn && !prevSn.wWonSet) {
      if (sn.isBagel || sn.isBread) return pick([
        `A resposta de ${wn} ao set perdido foi devastadora: o ${ord[setN-1]} set terminou ${sn.wGames}–${sn.lGames}. Do colapso ao controle total em quarenta minutos.`,
        `${ln} ganhou o primeiro set e parecia encaminhado. Então ${wn} apareceu — ${sn.wGames}–${sn.lGames} no ${ord[setN-1]} set, sem discussão.`,
      ]);
      if (sn.isClose) return pick([
        `O ${ord[setN-1]} set (${sn.wGames}–${sn.lGames}) foi a virada — apertado, decidido nos detalhes, mas suficiente para mudar o rumo. ${ln} nunca reconquistou o equilíbrio.`,
        `Após perder o primeiro set, ${wn} ajustou algo que ninguém no banco consegue ver de fora. O ${ord[setN-1]} set mostrou que a partida ainda estava aberta — e então ${wn} fechou.`,
      ]);
      return pick([
        `O ponto de virada foi a abertura do ${ord[setN-1]} set. ${wn} de um set abaixo mudou o padrão de jogo e ${ln} não soube responder.`,
        `Depois de ceder o primeiro set, ${wn} encontrou o jogo — o ${ord[setN-1]} set (${sn.wGames}–${sn.lGames}) foi onde a partida se redefiniu completamente.`,
      ]);
    }
  }

  if (sn && sn.set === m.totalSets) {
    if (sn.isTb) return pick([
      `O tiebreak do ${ord[setN-1]} set foi o momento que definia tudo. ${wn} foi mais frio quando cada ponto valia uma fortuna.`,
      `Chegou ao tiebreak. E nos tiebreaks, ${wn} é outra categoria — ${sn.wGames}–${sn.lGames} no set decisivo.`,
    ]);
    if (sn.isClose) return pick([
      `O ${ord[setN-1]} set (${sn.wGames}–${sn.lGames}) foi o ponto sem retorno — milímetros separavam os dois, e ${wn} foi mais preciso nesses milímetros.`,
      `Tudo foi decidido no ${ord[setN-1]} set. O placar ${sn.wGames}–${sn.lGames} não conta a tensão — ${wn} saiu mais inteiro daquela hora.`,
    ]);
  }

  if (m.totalTbs >= 1 && m.wTbWon === m.totalTbs) return pick([
    `Os tiebreaks foram a arena onde ${wn} dominou — ${m.wTbWon} de ${m.totalTbs} convertidos. Nos momentos de pressão máxima, a diferença ficou evidente.`,
    `Toda vez que o set chegou aos 6-6, a partida foi de ${wn}. ${m.wTbWon} tiebreaks vencidos: clutch como arma.`,
  ]);

  if (m.wMpSaved >= 1) {
    // Rivalry angle on the save
    if (rivalry?.graduated && rivalry.isIntense) return pick([
      `${wn} olhou para o abismo — match point contra — e respondeu com qualidade. Nessa rivalidade com ${ln}, os momentos mais tensos costumam ser decididos assim.`,
      `Match point contra e ${wn} salvou. Numa série de ${rivalry.priorMatches + 1} encontros tão disputados quanto esta, não é surpresa que o momento decisivo tenha sido assim.`,
    ]);
    return pick([
      `O turning point foi quando ${ln} teve match point e não converteu. ${wn} salvou, reorganizou e nunca mais deixou ${ln} respirar.`,
      `${wn} olhou para o abismo — match point contra — e respondeu com qualidade. Desse momento em diante, a partida foi outra.`,
    ]);
  }

  if (sn) return pick([
    `O ${ord[setN-1] ?? `${setN}º`} set (${sn.wGames}–${sn.lGames}) foi onde ${wn} consolidou a vantagem e retirou qualquer possibilidade de reação de ${ln}.`,
    `A partida virou no ${ord[setN-1] ?? `${setN}º`} set — ${wn} encontrou o jogo certo na hora certa, ${ln} não acompanhou o ajuste.`,
  ]);

  return `${wn} controlou quando o jogo pediu mais.`;
}


// ════════════════════════════════════════════════════════════════════
// PATTERN HIGHLIGHT
// ════════════════════════════════════════════════════════════════════

function buildPatternHighlight(W, L, m) {
  const wn = W.name, ln = L.name;

  // ── Abandono por lesão: sem análise de padrão possível ───────────
  if (m.hadRetirement) {
    return pick([
      `Partidas encerradas por abandono resistem à análise de padrão. O que ${wn} fez em quadra ficou sem resposta final — ${ln} saiu antes do resultado natural. O circuito arquiva, mas não julga.`,
      `Não é possível extrair um padrão dominante quando a partida não chegou ao fim pelo mérito. ${wn} avança, mas a análise fica incompleta — como todo abandono.`,
      `O padrão desta partida ficou inacabado. ${ln} não saiu derrotado pelo jogo — saiu por limitação física. São categorias diferentes, e o circuito as trata de forma diferente.`,
    ]);
  }

  if (m.wSigKey === 'NET_CLOSER' && m.wNetAppr >= 8) return pick([
    `"Net Closer" em ação — ${m.wNetAppr} aproximações, ${m.wNetPct}% convertidas. ${ln} nunca encontrou o ângulo de passe enquanto ${wn} fechava a quadra.`,
    `O padrão de ${wn} é claro: cada rally é uma estrada para a rede. ${m.wNetAppr} vezes lá chegou. ${m.wNetPct}% das vezes ganhou o ponto.`,
  ]);

  if (m.wSigKey === 'SHORT_ANGLE_ASSASSIN' && m.wBanana >= 5) return pick([
    `"Short-Angle Assassin" — ${m.wBanana} bananas e ângulos curtos que ${ln} simplesmente não conseguiu antecipar. Quando ${wn} entra na zona de ataque, não há onde se esconder.`,
    `O padrão de ${wn}: esperar a bola fácil dentro da quadra e abrir o ângulo impossível. ${m.wBanana} vezes funcionou. Cada vez foi uma sentença diferente para ${ln}.`,
  ]);

  if (m.wSigKey === 'BH_WALL' && m.matchAvgRally >= 7) return pick([
    `"Backhand Wall" de ${wn}: rally médio de ${m.matchAvgRally.toFixed(1)} bolas, backhand profundo cruzado como âncora de cada troca. ${ln} cansou de esperar pelo erro — ele nunca veio.`,
    `O padrão é antigo mas letal: backhand profundo, cruzado, repetido até o adversário ceder. ${wn} faz isso com ${m.matchAvgRally.toFixed(1)} bolas de média. ${ln} sentiu cada uma.`,
  ]);

  if ((m.wSigKey === 'SERVE_FH_KILL' || m.wSigKey === 'SERVE_COMMANDER') && m.wSrv1Kmh >= 185) return pick([
    `Saque aberto, forehand no bolso — o DNA de ${wn} em dois golpes. ${m.wSrv1Kmh} km/h no primeiro saque, então o forehand fecha. ${ln} não chegou a construir nada.`,
    `"${m.wSigPattern?.label}": ${m.wSrv1Kmh} km/h de saque médio mais forehand assassino. O ponto muitas vezes terminou antes do rally se estabelecer.`,
  ]);

  if (m.wSigKey === 'SLICE_DISRUPTOR' && m.wSlice >= 8) return pick([
    `"Slice Disruptor" — ${m.wSlice} slices usados como interruptores de ritmo. Toda vez que ${ln} tentou acelerar, ${wn} tirou a velocidade da equação.`,
    `${m.wSlice} slices de ${wn}: não por falta de opção, mas por escolha. O padrão "Slice Disruptor" transforma o slice em arma de desorganização — e funcionou.`,
  ]);

  if (m.wSigKey === 'LATE_MATCH_HUNTER' && m.wMomentum >= 0.65) return pick([
    `"Late-Match Hunter" — ${wn} ficou mais perigoso conforme o momentum cresceu. Quando o marcador pressionava, a qualidade subia. ${ln} não tinha resposta para um adversário que melhora sob pressão.`,
    `O padrão de ${wn} é contra-intuitivo: cresce quando o jogo aperta. Momentum final em ${Math.round(m.wMomentum*100)}% — os pontos decisivos foram todos dele.`,
  ]);

  if (m.wSigKey === 'DEEP_COURT_GRINDER' && m.matchAvgRally >= 8) return pick([
    `"Deep Court Grinder" — profundidade implacável durante ${m.matchAvgRally.toFixed(1)} bolas por rally. ${ln} nunca encontrou o ângulo para abrir o jogo.`,
    `${wn} usou o fundo de quadra como fortaleza. ${m.matchAvgRally.toFixed(1)} bolas de rally médio: uma maratona de desgaste que ${ln} não conseguiu aguentar.`,
  ]);

  // Sem signature mas com dados fortes
  if (m.wNetAppr >= 12 && m.wNetPct >= 65) return pick([
    `Rede como território exclusivo — ${m.wNetAppr} aproximações, ${m.wNetPct}% convertidas. ${ln} não encontrou os passing shots nas horas que importavam.`,
    `A rede foi o palco de ${wn}: ${m.wNetAppr} subidas com ${m.wNetPct}% de aproveitamento. Cada volley vencido foi mais um argumento de que a partida lhe pertencia.`,
  ]);

  if (m.wBanana >= 8) return pick([
    `${m.wBanana} bananas e ângulos curtos — geometria que ${ln} não domina e ${wn} usa como assalto. Cada um criou um ponto direto ou o preparou.`,
    `${wn} abriu a quadra com ângulos impossíveis: ${m.wBanana} vezes. Não é sorte, é padrão — e ${ln} não achou a defesa.`,
  ]);

  if (m.wWinners >= 24 && m.wUE <= 13) return pick([
    `${m.wWinners} winners com apenas ${m.wUE} erros não-forçados — a combinação que separa um bom dia de uma aula magistral. ${ln} não tinha como reagir.`,
    `O padrão de hoje: ${wn} acertou ${m.wWinners} winners e errou ${m.wUE} vezes sem forçar. Esse ratio é quase impossível de perder.`,
  ]);

  if (m.wFlat >= 10 && m.dominantShot === 'FLAT') return pick([
    `${m.wFlat} flat winners de ${wn}: bola pesada, linha baixa, velocidade que ${ln} não conseguia absorver. Agressividade como política, não como capricho.`,
  ]);

  if (m.wHeavy >= 10) return pick([
    `${m.wHeavy} topspins pesados de ${wn}: bolas que chegam altas, rápidas e difíceis de contra-atacar. ${ln} foi empurrado para trás repetidas vezes.`,
    `O heavy topspin foi a arma de fundação — ${m.wHeavy} bolas assim durante toda a partida, cada uma um argumento a favor de ${wn}.`,
  ]);

  if (m.wQuality) return pick([
    `Qualidade média de ${Math.round(m.wQuality*100)}% em rally: ${wn} raramente esteve em posição desfavorável. O padrão dominante foi a consistência — difícil de narrar, impossível de combater.`,
    `O padrão mais marcante de ${wn} hoje foi a ausência de fraquezas expostas. Qualidade sustentada, ponto após ponto.`,
  ]);

  return pick([
    `A consistência foi o padrão que definiu ${wn}: cada ponto jogado com propósito, cada golpe com destino.`,
    `Não houve um único padrão dominante — ${wn} usou o arsenal completo e ${ln} nunca soube o que vinha.`,
  ]);
}


// ════════════════════════════════════════════════════════════════════
// PLAN VS RESULT
// ════════════════════════════════════════════════════════════════════

function buildPlanVsResult(W, L, m) {
  const wn = W.name, ln = L.name;
  if (!m.wPlan && !m.lPlan) return null;

  const parts = [];

  if (m.wPlan?.directives?.length > 0) {
    const dir1 = m.wPlan.directives[0];
    const conf = m.wPlan.confidence ?? 0.5;
    const PLAN_DESC = {
      ATTACK_BH:        `atacar o backhand de ${ln}`,
      ATTACK_FH:        `pressionar o forehand de ${ln}`,
      SERVE_BODY:       'servir no corpo nos pontos decisivos',
      NET_PRESSURE:     'dominar com pressão de rede',
      FORCE_LONG:       `forçar rallies longos contra ${ln}`,
      EARLY_AGGRESSION: 'pressionar desde os primeiros golpes',
      EXPLOIT_SURFACE:  'explorar a vantagem de superfície',
      LIMIT_NET:        'neutralizar a rede do adversário',
    };
    const planDesc = PLAN_DESC[dir1?.type];
    if (planDesc) {
      const bhEx  = dir1.type === 'ATTACK_BH'   && m.weakSide === 'BH' && m.weakSidePct >= 55;
      const fhEx  = dir1.type === 'ATTACK_FH'   && m.weakSide === 'FH' && m.weakSidePct >= 55;
      const netEx = dir1.type === 'NET_PRESSURE' && m.wNetAppr >= 8;
      const lgEx  = dir1.type === 'FORCE_LONG'  && m.matchAvgRally >= 6.5;
      const executed = bhEx || fhEx || netEx || lgEx;

      if (executed) {
        parts.push(pick([
          `O plano de jogo de ${wn} era ${planDesc} — e foi executado com disciplina que raramente se vê. Não houve improvisação desnecessária.`,
          `${wn} entrou em quadra sabendo exatamente o que queria fazer: ${planDesc}. O jogo confirmou a análise, ponto após ponto.`,
        ]));
      } else if (conf < 0.40) {
        parts.push(pick([
          `${wn} tinha pouca informação sobre ${ln} antes do jogo. O plano foi ajustado durante os primeiros games — a adaptação funcionou.`,
          `Com scouting limitado sobre ${ln}, ${wn} foi descobrindo o padrão em tempo real. A leitura de jogo compensou a falta de preparo prévio.`,
        ]));
      } else {
        parts.push(pick([
          `O plano era ${planDesc}, mas o jogo pediu adaptação. ${wn} não seguiu o roteiro com rigidez — ajustou, e o resultado veio mesmo assim.`,
          `${wn} tinha um mapa — ${planDesc}. A partida mudou o percurso, mas o destino foi o mesmo.`,
        ]));
      }
    }
  }

  if (m.lPlan?.directives?.length > 0) {
    const ld = m.lPlan.directives[0];
    const FAIL_DESC = {
      ATTACK_BH:        `atacar o backhand de ${wn}`,
      ATTACK_FH:        `pressionar o forehand de ${wn}`,
      NET_PRESSURE:     'dominar com a rede',
      FORCE_LONG:       'forçar rallies longos',
      EARLY_AGGRESSION: 'pressionar desde o início',
      LIMIT_NET:        'neutralizar a rede adversária',
      EXPLOIT_SURFACE:  'explorar a superfície',
    };
    const lIntent = FAIL_DESC[ld?.type];
    if (lIntent) {
      parts.push(pick([
        `${ln} queria ${lIntent} — ${wn} fechou esses caminhos um por um.`,
        `O plano de ${ln} era ${lIntent}. Ficou no papel. ${wn} foi mais rápido na leitura do que ${ln} na execução.`,
        `${ln} sabia o que precisava fazer: ${lIntent}. Saber e conseguir são perguntas diferentes — e ${wn} foi a resposta para ambas.`,
      ]));
    }
  }

  return parts.length > 0 ? parts.join(' ') : null;
}


// ════════════════════════════════════════════════════════════════════
// FULL REPORT
// ════════════════════════════════════════════════════════════════════

function buildFullReport(W, L, m, surface, tactical, turning, pattern, planVsResult, rivalryCtx) {
  const wn   = W.name, ln = L.name;
  const score = fmt(m.setsDetail);
  const surf  = SURFACE_LABEL[surface?.toUpperCase()] ?? surface ?? 'quadra';

  const sections = [];

  const isComeback  = m.totalSets >= 3 && !m.setNarratives[0].wWonSet;
  const isDominating = m.setNarratives.every(s => s.wWonSet) && m.setNarratives.some(s => s.isBagel || s.isBread);
  const isEpic      = m.setNarratives.every(s => s.isClose) && m.totalSets >= 3;

  if (isDominating) {
    sections.push(pick([
      `${wn} não deixou que a partida se tornasse uma narrativa de ${ln}. Entrou, dominou e saiu — ${score} em ${surf}.`,
      `Não há história alternativa quando o placar termina ${score}. ${wn} foi melhor em todos os momentos que importam.`,
    ]));
  } else if (isComeback) {
    sections.push(pick([
      `Havia um script diferente para esta partida — ${ln} liderava e parecia encaminhado. Então ${wn} reescreveu tudo: ${score} em ${surf}.`,
      `${wn} e ${ln} jogaram duas partidas dentro de uma. Na segunda, ${wn} ganhou.`,
    ]));
  } else if (isEpic) {
    sections.push(pick([
      `Toda vez que ${ln} parecia ganhar a discussão, ${wn} mudava o argumento. A partida terminou ${score} em ${surf} — mas o placar esconde a complexidade do que aconteceu.`,
      `Esta foi a partida que o circuito vai mencionar quando alguém perguntar o que separa os dois. ${wn} encontrou a resposta certa quando não havia margem para errar.`,
    ]));
  } else {
    sections.push(`${wn} derrotou ${ln} por ${score} em ${surf}.`);
  }

  sections.push(tactical);
  if (turning)       sections.push(turning);
  if (pattern)       sections.push(pattern);
  if (planVsResult)  sections.push(planVsResult);
  if (rivalryCtx)    sections.push(rivalryCtx);

  if (m.wIsOnHomeSurf) {
    sections.push(pick([
      `No ${surf}, ${wn} é outra categoria. A superfície que mais lhe serve mostrou hoje por que.`,
      `${wn} em ${surf} é uma equação desfavorável para qualquer adversário. Hoje, ${ln} foi mais uma prova disso.`,
    ]));
  } else if (isDominating) {
    sections.push(pick([
      `Não houve interpretação possível para o placar. ${wn} foi superior em tudo.`,
      `Partidas assim não precisam de contexto adicional. O resultado fala por si — ${score}.`,
    ]));
  } else if (isEpic) {
    sections.push(pick([
      `Em matches assim, separar os dois jogadores é uma questão de detalhes. ${wn} foi mais preciso nesses detalhes.`,
      `O escore não conta toda a história. ${ln} esteve próximo — mas próximo não é suficiente quando o adversário também está no limite.`,
    ]));
  } else {
    sections.push(pick([
      `${wn} mostrou por que é difícil de bater quando o plano está claro e a execução segue.`,
      `A vitória foi do ${wn} porque, quando importou, ele foi mais consistente.`,
    ]));
  }

  // ── Heat closing line ──────────────────────────────────────────
  if (m.matchHeatTier) {
    const tierLabel = m.matchHeatTier.label;
    if (m.matchHeatPeak >= 94) {
      sections.push(pick([
        `Nível de partida: ÉPICO. O heat desta partida chegou a ${m.matchHeatPeak} — uma raridade no circuito.`,
        `Quando o calor do jogo chega a ${m.matchHeatPeak}/100, o que aconteceu em quadra não cabe num placar.`,
      ]));
    } else if (m.matchHeatPeak >= 85) {
      sections.push(pick([
        `Uma partida CLÁSSICA pelo padrão do circuito — heat de pico em ${m.matchHeatPeak}/100.`,
        `O heat desta partida (${m.matchHeatPeak}) classifica este encontro como CLÁSSICO. Raro.`,
      ]));
    } else if (m.matchHeatPeak >= 75) {
      sections.push(pick([
        `EM CHAMAS durante boa parte do jogo — heat de pico ${m.matchHeatPeak}/100.`,
      ]));
    }
  }

  // ── Lesão em campo (MTO / abandono) ───────────────────────────
  if (m.hadRetirement) {
    const r = m.retirement;
    const injLabel = r?.injuryType === 'CRAMP' ? 'cãibra'
      : r?.injuryType === 'HAMSTRING' ? 'posterior da coxa'
      : r?.injuryType === 'ANKLE'     ? 'tornozelo'
      : r?.injuryType === 'KNEE'      ? 'joelho'
      : r?.injuryType === 'BACK'      ? 'lombar'
      : r?.injuryType === 'ABDOMINAL' ? 'abdômen'
      : 'lesão';
    sections.push(pick([
      `O ponto final desta partida não foi um winner — foi o sinal médico de ${ln} deixando a quadra com ${injLabel}.`,
      `${ln} não saiu derrotado pelo placar. Saiu com ${injLabel}. O resultado importa menos que o que aconteceu em campo.`,
      `Abandono. ${ln} tentou continuar, mas a ${injLabel} tornou impossível. ${wn} avança, mas a memória é do adversário que lutou enquanto pôde.`,
    ]));
  } else if (m.inMatchInjuries?.length >= 1) {
    const r = m.inMatchInjuries[0];
    const injLabel = r?.injuryType === 'CRAMP' ? 'cãibra'
      : r?.injuryType === 'HAMSTRING' ? 'posterior da coxa'
      : r?.injuryType === 'ANKLE'     ? 'tornozelo'
      : r?.injuryType === 'KNEE'      ? 'joelho'
      : r?.injuryType === 'BACK'      ? 'lombar'
      : 'lesão';
    const injuredName = r?.playerName ?? ln;
    sections.push(pick([
      `A parada médica de ${injuredName} mudou o ritmo da partida — houve um momento em que o desfecho era incerto.`,
      `${injuredName} recebeu atendimento em quadra com ${injLabel}. Voltou. Não foi fácil, mas voltou.`,
    ]));
  }

  return sections.join(' ');
}


// ════════════════════════════════════════════════════════════════════
// TAGS
// ════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════
// RIVALRY CONTEXT
// Parágrafo dedicado à narrativa da rivalidade.
// Só é chamado quando existe um rivalry object válido.
// ════════════════════════════════════════════════════════════════════

function buildRivalryContext(W, L, m, rivalry) {
  if (!rivalry) return null;

  const wn = W.name, ln = L.name;

  // ── Proto-rivalidade (não-graduada, histórico pequeno) ───────────
  if (!rivalry.graduated) {
    const n = rivalry.priorMatches;
    if (n === 1) return pick([
      `Era o segundo encontro entre ${wn} e ${ln} no circuito. Histórias começam assim — sem peso, sem H2H estabelecido, só dois jogadores se lendo pela segunda vez.`,
      `Segundo capítulo de um duelo que ainda não tem nome. ${wn} e ${ln} se conhecem melhor agora.`,
    ]);
    return pick([
      `${wn} e ${ln} somam agora ${n + 1} encontros. O circuito começa a prestar atenção nesse par.`,
      `${n + 1} partidas entre ${wn} e ${ln}. Ainda poucos dados para um veredicto definitivo — mas o suficiente para o padrão começar a aparecer.`,
    ]);
  }

  // ── Graduada ─────────────────────────────────────────────────────
  const {
    type, status, isLegendary, isIntense, isBrewing,
    totalMatches, priorMatches, finalsMatches, tiebreakSets,
    longevity, winnerH2hWins, loserH2hWins,
    winnerPriorWins, loserPriorWins, priorGap,
    winnerWasLeader, winnerWasTrailer, wasEven,
    winnerLeadsNow, tiedNow,
    winnerBrokeStreak, loserHadStreak, streakLength,
    lastKeyMoment, lastKeyWasLoser, lastKeyWasWinner,
  } = rivalry;

  const h2hNow   = `${winnerH2hWins}–${loserH2hWins}`;
  const h2hPrior = `${winnerPriorWins}–${loserPriorWins}`;
  const seasons  = longevity === 1 ? '1 temporada' : `${longevity} temporadas`;

  // ── Por tipo ─────────────────────────────────────────────────────
  switch (type) {

    case 'GRUDGE': {
      const tbRate = priorMatches > 0 ? (tiebreakSets / priorMatches).toFixed(1) : '?';
      if (isLegendary) return pick([
        `${priorMatches + 1} capítulos de uma guerra. ${tiebreakSets} sets foram para tiebreak nessa rivalidade ao longo de ${seasons} — uma média de ${tbRate} por partida. ${wn} e ${ln} não se resolvem de forma simples, e hoje não foi exceção. H2H: ${h2hNow}.`,
        `"Rancor" é a palavra que o circuito usa para este duelo. Não por hostilidade, mas pelo que os dados dizem: ${tiebreakSets} tiebreaks em ${priorMatches} partidas. Cada ponto parece pessoal. Hoje, ${wn} saiu com a vantagem — ${h2hNow}.`,
      ]);
      if (winnerWasTrailer) return pick([
        `${ln} liderava ${h2hPrior} nessa guerra de atrito. ${tiebreakSets} tiebreaks em ${priorMatches} encontros — a série não tem como ser simples. Hoje ${wn} virou: ${h2hNow}.`,
        `O H2H era de ${ln}: ${h2hPrior}. Em ${priorMatches} partidas, ${tiebreakSets} sets foram para tiebreak. ${wn} chegou, lutou e saiu com ${h2hNow}. Mais um capítulo de uma série que não sabe terminar rápido.`,
      ]);
      return pick([
        `${tiebreakSets} sets para tiebreak em ${priorMatches} partidas nessa rivalidade. ${wn} e ${ln} têm uma química que recusa o julgamento rápido — cada vez, o placar espera o último ponto possível. H2H ${h2hNow}.`,
        `O padrão dessa série é atrito. ${tiebreakSets} tiebreaks ao longo de ${seasons}, ${wn} lidera ${h2hNow}. Qualquer encontro futuro tem o mesmo perfil prometido: duro até o fim.`,
      ]);
    }

    case 'ERA_CLASH': {
      const generational = winnerWasTrailer
        ? `${wn} respondeu com o presente`
        : winnerWasLeader
          ? `${wn} manteve o passado relevante`
          : `nenhuma geração cedeu facilmente`;
      return pick([
        `O choque de eras entre ${wn} e ${ln} acumula ${totalMatches} capítulos em ${seasons}. Gerações diferentes, ritmos diferentes, leituras de jogo diferentes — ${generational}. H2H atual: ${h2hNow}.`,
        `Passado contra futuro, mais um capítulo. ${priorMatches + 1} encontros ao longo de ${seasons}. ${wn} e ${ln} representam coisas distintas para o circuito — e o placar de hoje adicionou mais um argumento a um debate que não termina aqui. ${h2hNow}.`,
        `Há algo diferente quando gerações se enfrentam. ${wn} e ${ln} trazem isso a cada encontro — ${totalMatches} no total, ${seasons}. ${generational} hoje. H2H: ${h2hNow}.`,
      ]);
    }

    case 'FINALS_CURSE': {
      const fStr = finalsMatches >= 4 ? `${finalsMatches}ª vez` : finalsMatches === 3 ? 'terceira final' : finalsMatches === 2 ? 'segunda final' : 'final';
      return pick([
        `${finalsMatches} vezes que ${wn} e ${ln} se encontraram nos grandes palcos — finais de Slams, Masters, os momentos de maior peso do calendário. O destino os coloca juntos quando as apostas são máximas, e a ${fStr} foi mais uma prova disso. H2H total: ${h2hNow}.`,
        `"Maldição das Finais" — o circuito chama assim e não sem razão. ${finalsMatches} encontros em finais dos torneios mais importantes, ${priorMatches + 1} no total. ${wn} saiu com ${h2hNow}. O próximo capítulo já parece inevitável.`,
        `Quando o sorteio os coloca no mesmo lado da chave, o circuito já começa a calcular as chances de mais uma final entre eles. Aconteceu ${finalsMatches} vezes. Hoje foi mais uma — ${h2hNow} no total.`,
      ]);
    }

    case 'THRONE_RIVALS': {
      return pick([
        `Dois que já ocuparam o número 1. ${priorMatches + 1} encontros em ${seasons} que transcendem torneios — são disputas de legado, de quem vai ser lembrado como o melhor de uma era. ${wn} e ${ln} cada um com uma narrativa para defender. H2H: ${h2hNow}.`,
        `"Rivais do Trono" — não é metáfora. ${wn} e ${ln} disputaram a liderança do ranking em diferentes momentos. Em quadra, ${priorMatches + 1} confrontos ao longo de ${seasons}, H2H ${h2hNow}. Fora dela, o debate sobre legado não tem árbitro.`,
        `Quando dois ex-número 1 se encontram, o placar do torneio é secundário. ${wn} e ${ln} adicionaram mais um dado ao H2H — ${h2hNow} em ${priorMatches + 1} partidas — mas o argumento real é mais amplo e mais longo do que qualquer resultado isolado.`,
      ]);
    }

    case 'GIANT_KILLER': {
      // Identificar quem é o "azarão" da série
      const giantKillerIsWinner = winnerH2hWins > loserH2hWins && winnerWasTrailer;
      if (giantKillerIsWinner || winnerWasTrailer) return pick([
        `O improvável com cara de rotina. ${wn} chegou com ${h2hPrior} no H2H — desvantagem — e saiu com ${h2hNow}. Em ${priorMatches + 1} encontros, o ranking disse uma coisa e o resultado disse outra. Repetidamente.`,
        `"Caçador de Gigantes" — o circuito dá esse título a quem vence quem não deveria conseguir, de forma consistente. ${wn} e ${ln}: ${priorMatches + 1} partidas, ${h2hNow}. Esse H2H desafia qualquer lógica de posicionamento.`,
        `${wn} e ${ln}: ${priorMatches + 1} encontros em que a lógica do ranking ficou em segundo plano. Hoje foi mais uma prova de que essa série tem regras próprias. H2H: ${h2hNow}.`,
      ]);
      return pick([
        `A lógica desta rivalidade: o menos esperado vence quem não deveria. ${priorMatches + 1} partidas, ${h2hNow}. Qualquer análise de favorito perde validade quando esses dois entram em quadra.`,
        `"Caçador de Gigantes" descreve a dinâmica desta série em ${priorMatches + 1} encontros. ${wn} com ${h2hNow} no H2H — números que não combinam com o que o ranking sugeria.`,
      ]);
    }

    case 'DOMINATION': {
      if (winnerWasLeader) return pick([
        `${ln} chegou em ${priorMatches} tentativas sem encontrar a fórmula. Hoje foi a ${priorMatches + 1}ª — e o resultado foi o mesmo. ${wn} mantém ${h2hNow} num H2H que ainda não deu a ${ln} argumento para mudar a narrativa.`,
        `Dominância não é acidente — é padrão. ${wn} leva ${h2hNow} em ${priorMatches + 1} encontros ao longo de ${seasons}. ${ln} ainda está procurando a resposta para um problema que se repete com consistência perturbadora.`,
        `${h2hPrior} ao entrar, ${h2hNow} ao sair. A diferença que ${wn} mantém sobre ${ln} nessa série não encolheu hoje — confirmou. Em ${priorMatches + 1} partidas, a dominância se sustentou.`,
      ]);
      // Raro: trailer vira uma dominance
      return pick([
        `${wn} vinha de ${h2hPrior} nessa série — uma desvantagem que parecia estrutural. Hoje a saída foi ${h2hNow}. Dominâncias têm limite — e este pode ter sido o ponto de inflexão.`,
        `O H2H de dominância era de ${ln}: ${h2hPrior}. ${wn} não aceitou mais esse título hoje — ${h2hNow} agora, e uma narrativa que pode estar mudando de página.`,
      ]);
    }

    case 'CLASSIC':
    default: {
      if (isLegendary) return pick([
        `${priorMatches + 1}º encontro de uma rivalidade que o circuito já arquivou como lendária. ${wn} e ${ln}: ${seasons}, ${h2hNow} no H2H. Cada partida parece confirmar que essa série tem mais capítulos do que qualquer um previu quando começou.`,
        `Quando esses dois entram em quadra juntos, o circuito para de calcular e começa a assistir. ${priorMatches + 1} capítulos em ${seasons}. ${wn} saiu com ${h2hNow} — mais um argumento numa conversa que não tem prazo de encerramento.`,
        `${wn} e ${ln} constroem juntos algo que nenhum deles conseguiria sozinho: uma rivalidade que o circuito vai citar por anos. ${h2hNow} em ${priorMatches + 1} partidas. O próximo encontro já é esperado como evento.`,
      ]);

      if (winnerBrokeStreak && streakLength >= 3) return pick([
        `${ln} tinha vencido ${streakLength} dos últimos confrontos marcantes nessa série. ${wn} interrompeu o fio hoje — ${h2hNow} no H2H. Séries de vitória em rivalidades são frágeis assim: uma partida muda o argumento.`,
        `A sequência de ${ln} nos encontros marcantes acabou com ${streakLength} vitórias. ${wn} deu a resposta quando o peso do histórico recente pesava contra — ${h2hNow} agora.`,
      ]);

      if (winnerWasTrailer && priorGap >= 2) return pick([
        `${ln} tinha a vantagem no H2H — ${h2hPrior}. ${wn} saiu com ${h2hNow}. Rivalidades clássicas não têm favorito permanente, e hoje foi mais uma prova disso.`,
        `${h2hPrior} a favor de ${ln} ao entrar. ${h2hNow} ao sair — a favor de ${wn}. A série se reequilibrou, e qualquer próximo encontro volta a ser uma questão aberta.`,
        `${wn} reescreveu o H2H hoje. De ${h2hPrior} para ${h2hNow} — a vantagem mudou de lado. Em ${priorMatches + 1} partidas ao longo de ${seasons}, nenhuma conclusão é permanente.`,
      ]);

      if (wasEven && !tiedNow) return pick([
        `H2H empatado ${h2hPrior} ao entrar. ${wn} saiu com ${h2hNow} — a primeira vantagem real nessa série. Mínima, mas suficiente para mudar o argumento do próximo encontro.`,
        `A série era empatada. Agora é ${h2hNow}. ${wn} tem um argumento novo — ${ln} vai querer responder.`,
      ]);

      if (tiedNow && !wasEven) return pick([
        `${wn} empatou o H2H — agora ${h2hNow} em ${priorMatches + 1} partidas. ${ln} tinha a vantagem; ela acabou. A série recomeça sem favorito definido.`,
      ]);

      if (winnerWasLeader) return pick([
        `${wn} confirma a liderança no H2H — ${h2hPrior} virou ${h2hNow} em ${priorMatches + 1} encontros ao longo de ${seasons}. A vantagem cresce, mas rivalidades clássicas não têm dono permanente.`,
        `Mais um ponto para ${wn} no H2H: ${h2hNow}. Em ${priorMatches + 1} partidas, ${ln} ainda não encontrou a combinação que inverte essa equação.`,
      ]);

      return pick([
        `${priorMatches + 1} encontros entre ${wn} e ${ln} ao longo de ${seasons}. H2H ${h2hNow}. Uma série com história suficiente para ser levada a sério e imprevisível o suficiente para não ter veredicto.`,
        `${wn} e ${ln}: ${h2hNow} em ${priorMatches + 1} partidas. O circuito acompanha com atenção crescente. Em ${seasons}, a série construiu peso suficiente para que cada encontro carregue o anterior.`,
      ]);
    }
  }
}


function buildTags(W, L, m, rivalry) {
  const tags = [];
  const straight = m.setNarratives.every(s => s.wWonSet);
  const comeback = m.totalSets >= 3 && !m.setNarratives[0].wWonSet;
  const epic     = m.setNarratives.every(s => s.isClose) && m.totalSets >= 3;

  if (comeback)                              tags.push('COMEBACK');
  if (straight)                             tags.push('STRAIGHT_SETS');
  if (epic)                                 tags.push('EPIC');
  if (m.setNarratives.some(s=>s.isBagel))  tags.push('BAGEL');
  if (m.setNarratives.some(s=>s.isTb))     tags.push('TIEBREAK');
  if (m.wTbWon >= 2)                        tags.push('TIEBREAK_KING');
  if (m.wNetAppr >= 12 && m.wNetPct >= 65) tags.push('NET_DOMINANCE');
  if (m.weakSide && m.weakSidePct >= 60)   tags.push(`WEAK_SIDE_${m.weakSide}`);
  if (m.wWinners >= 25 && m.wUE <= 12)     tags.push('SURGICAL');
  if (m.wWinners >= 28)                    tags.push('WINNER_MACHINE');
  if (m.lUE >= 25)                         tags.push('OPPONENT_COLLAPSE');
  if (m.wSrv1Pct >= 72)                    tags.push('SERVE_DOMINANCE');
  if (m.wAces >= 12)                       tags.push('ACE_MACHINE');
  if (m.matchAvgRally >= 8)               tags.push('MARATHON');
  if (m.matchAvgRally < 3.5)              tags.push('BLITZ');
  if (m.wMpSaved >= 1)                     tags.push('CLUTCH_SAVE');
  if (m.wIsOnHomeSurf)                     tags.push('HOME_SURFACE');
  if (m.lIsOnHomeSurf)                     tags.push('AWAY_WIN');
  if (m.longRallies >= 8)                  tags.push('WAR_OF_ATTRITION');
  if (m.wSigKey)                           tags.push(`PATTERN_${m.wSigKey}`);
  if (m.wDrops >= 6)                       tags.push('DROP_SHOT_ARTIST');
  if (m.wSlice >= 10)                      tags.push('SLICE_MASTER');
  if (m.totalSets >= 3 && m.setNarratives[m.totalSets-1].isClose) tags.push('DECIDING_SET');

  // ── Tags de heat ─────────────────────────────────────────────────
  if (m.matchHeatPeak != null) {
    if      (m.matchHeatPeak >= 94) tags.push('HEAT_EPIC');
    else if (m.matchHeatPeak >= 85) tags.push('HEAT_CLASSIC');
    else if (m.matchHeatPeak >= 75) tags.push('HEAT_HOT');
  }

  // ── Tags de lesão em campo ────────────────────────────────────────
  if (m.hadRetirement)                     tags.push('RETIREMENT');
  if (m.inMatchInjuries?.length >= 1)      tags.push('IN_MATCH_INJURY');
  if (m.inMatchInjuries?.length >= 1 && !m.hadRetirement) tags.push('MTO_COMEBACK');

  // ── Tags de rivalidade ──────────────────────────────────────────
  if (rivalry?.graduated) {
    const { type, status, isLegendary, winnerWasTrailer, winnerBrokeStreak,
            streakLength, priorGap } = rivalry;
    if (type)                                      tags.push(`RIVALRY_${type}`);
    if (isLegendary)                               tags.push('RIVALRY_LEGENDARY');
    if (status === 'INTENSE')                      tags.push('RIVALRY_INTENSE');
    if (winnerWasTrailer && priorGap >= 2)         tags.push('H2H_COMEBACK');
    if (winnerBrokeStreak && streakLength >= 3)    tags.push('STREAK_BROKEN');
    if (type === 'ERA_CLASH')                      tags.push('GENERATIONAL');
    if (type === 'FINALS_CURSE')                   tags.push('FATED_FINAL');
    if (type === 'THRONE_RIVALS')                  tags.push('LEGACY_MATCH');
  }

  return tags;
}


// ════════════════════════════════════════════════════════════════════
// API PÚBLICA
// ════════════════════════════════════════════════════════════════════

/**
 * Narra uma partida encerrada com profundidade tática e jornalismo esportivo.
 *
 * @param {object} winner  — jogador completo: ctx, stats, _matchPlan, signaturePattern, styleId, alcunha, surfaceIdentity
 * @param {object} loser   — jogador completo
 * @param {object} result  — { setsDetail, stats:{a,b}, log, gs, winner } de simulateMatchHeadless
 * @param {string} surface — 'CLAY' | 'GRASS' | 'HARD' | 'INDOOR'
 *
 * @returns {{
 *   headline:          string,
 *   tactical_summary:  string,
 *   turning_point:     string,
 *   pattern_highlight: string,
 *   plan_vs_result:    string | null,
 *   full_report:       string,
 *   tags:              string[],
 *   _meta:             object,
 * }}
 */
export function narrateMatch(winner, loser, result, surface = 'HARD', rivalry = null) {
  try {
    const m = extractMetrics(winner, loser, result, surface);

    const headline          = buildHeadline(winner, loser, m, surface, rivalry);
    const tactical_summary  = buildTacticalSummary(winner, loser, m, surface, rivalry);
    const turning_point     = buildTurningPoint(winner, loser, m, rivalry);
    const pattern_highlight = buildPatternHighlight(winner, loser, m);
    const plan_vs_result    = buildPlanVsResult(winner, loser, m);
    const rivalry_context   = buildRivalryContext(winner, loser, m, rivalry);
    const full_report       = buildFullReport(
      winner, loser, m, surface,
      tactical_summary, turning_point, pattern_highlight, plan_vs_result, rivalry_context
    );
    const tags = buildTags(winner, loser, m, rivalry);

    return {
      headline,
      tactical_summary,
      turning_point,
      pattern_highlight,
      plan_vs_result,
      rivalry_context,
      full_report,
      tags,
      _meta: {
        wSrv1Pct:          m.wSrv1Pct,
        lSrv1Pct:          m.lSrv1Pct,
        wSrv1Kmh:          m.wSrv1Kmh,
        wHoldPct:          m.wHoldPct,
        wBreakPct:         m.wBreakPct,
        wAces:             m.wAces,
        matchAvgRally:     +m.matchAvgRally.toFixed(1),
        longRallies:       m.longRallies,
        maxRally:          m.maxRally,
        wNetAppr:          m.wNetAppr,
        wNetPct:           m.wNetPct,
        weakSide:          m.weakSide,
        weakSidePct:       m.weakSidePct,
        wWinners:          m.wWinners,
        wUE:               m.wUE,
        lUE:               m.lUE,
        wQuality:          m.wQuality ? +m.wQuality.toFixed(3) : null,
        lQuality:          m.lQuality ? +m.lQuality.toFixed(3) : null,
        wTbWon:            m.wTbWon,
        totalTbs:          m.totalTbs,
        wMpSaved:          m.wMpSaved,
        matchHeat:         m.matchHeatPeak != null
          ? { score: m.matchHeatScore, peak: m.matchHeatPeak, tier: m.matchHeatTier?.label ?? null }
          : null,
        retirement:        m.retirement ?? null,
        hadRetirement:     m.hadRetirement,
        inMatchInjuries:   m.inMatchInjuries ?? [],
        turningPointSet:   m.turningPointSet,
        dominance:         +m.dominance.toFixed(2),
        rivalry:           rivalry ? {
          type:     rivalry.type,
          status:   rivalry.status,
          h2h:      rivalry.graduated ? `${rivalry.winnerH2hWins}–${rivalry.loserH2hWins}` : null,
          intensity: rivalry.intensity,
        } : null,
      },
    };
  } catch (err) {
    console.warn('[MatchNarrator] Erro na narração:', err);
    return {
      headline:          `${winner?.name ?? 'Vencedor'} vence ${loser?.name ?? 'perdedor'}`,
      tactical_summary:  `${winner?.name ?? 'Vencedor'} foi superior na partida.`,
      turning_point:     null,
      pattern_highlight: null,
      plan_vs_result:    null,
      rivalry_context:   null,
      full_report:       `${winner?.name ?? 'Vencedor'} derrotou ${loser?.name ?? 'Perdedor'}.`,
      tags:              [],
      _meta:             {},
    };
  }
}

/**
 * Wrapper de conveniência que busca o contexto de rivalidade automaticamente
 * a partir de um RivalrySystem.
 *
 * Deve ser chamado APÓS rivalrySystem.updateFromMatch() para que os contadores
 * já reflitam a partida atual.
 *
 * @param {object} winner
 * @param {object} loser
 * @param {object} result
 * @param {string} surface
 * @param {RivalrySystem|null} rivalrySystem
 * @returns {object} — mesmo formato que narrateMatch
 */
export function narrateMatchWithRivalry(winner, loser, result, surface = 'HARD', rivalrySystem = null) {
  let rivalry = null;
  if (rivalrySystem && winner?.id != null && loser?.id != null) {
    try {
      rivalry = rivalrySystem.getRivalryContext(winner.id, loser.id);
    } catch (e) {
      console.warn('[MatchNarrator] getRivalryContext falhou:', e);
    }
  }
  return narrateMatch(winner, loser, result, surface, rivalry);
}

/**
 * Versão leve — apenas headline e tags.
 * Para simulações em massa onde o relatório completo não é necessário.
 */
export function narrateMatchLight(winner, loser, result, surface = 'HARD') {
  try {
    const m = extractMetrics(winner, loser, result, surface);
    return {
      headline: buildHeadline(winner, loser, m, surface),
      tags:     buildTags(winner, loser, m),
    };
  } catch {
    return { headline: `${winner?.name ?? 'Vencedor'} vence`, tags: [] };
  }
}

