import { COACH_METHODS } from './CoachIdentitySystem.js';

export function coachEventToNews(event, player, coach) {
  if (!event || !player || !coach) return null;
  const method = COACH_METHODS[coach.method] ?? COACH_METHODS.FORMADOR;
  const headlineByType = {
    COACH_START: `${player.name} abre novo ciclo com ${coach.name}`,
    COACH_RUPTURE: `${player.name} e ${coach.name} encerram parceria`,
    COACH_ERA: `${player.name} e ${coach.name}: parceria ganha status de era`,
    COACH_BREAKTHROUGH: `${coach.name} aparece nos bastidores do salto de ${player.name}`,
    COACH_SLAM: `${coach.name} vira nome forte no titulo de ${player.name}`,
    COACH_TENSION: `${player.name} e ${coach.name} atravessam fase de atrito`,
    COACH_RENEWED: `${player.name} mantem projeto com ${coach.name}`,
    COACH_RENEWAL: `${player.name} estende projeto com ${coach.name}`,
    COACH_CONTRACT_END: `${player.name} chega ao fim de contrato com ${coach.name}`,
    COACH_TOURNAMENT_HIGH: `${coach.name} ganha crédito no título de ${player.name}`,
    COACH_INJURY_TENSION: `Lesão coloca parceria de ${player.name} sob teste`,
    COACH_TOURNAMENT_TENSION: `Pressão cresce entre ${player.name} e ${coach.name}`,
  };
  const pressureLine = event.friction >= 72
    ? `A tensao interna aparece alta (${event.friction}/100), entao o resultado em quadra pesa mais que o discurso publico.`
    : event.confidence >= 74
      ? `A confianca no metodo esta forte (${event.confidence}/100), o bastante para transformar ajuste tecnico em identidade de temporada.`
      : `A parceria ainda esta sendo medida por encaixe, rotina e resposta aos jogos grandes.`;
  const startLine = event.type === 'COACH_START'
    ? `O encaixe inicial nasce com alinhamento ${event.alignment ?? 'em leitura'} e expectativa ${event.expectation ?? 'moderada'}, sem promessa de milagre imediato.`
    : pressureLine;
  return {
    id: `coach-${event.type}-${player.id}-${coach.id}-${event.year}`,
    type: 'COACHING',
    subtype: event.type,
    year: event.year,
    player,
    coach: { id: coach.id, name: coach.name, method: coach.method, reputation: coach.reputation },
    headline: headlineByType[event.type] ?? event.text,
    deck: event.text,
    body: [
      `${player.name} passa a carregar uma leitura nova de banco: ${method.desc}`,
      startLine,
      event.type === 'COACH_RUPTURE'
        ? `A ruptura nao apaga o ciclo, mas muda a memoria da temporada e abre espaco para outro metodo.`
        : event.type === 'COACH_ERA'
          ? `Quando uma parceria vira era, o tecnico deixa de ser nota de rodape e passa a ser parte da biografia competitiva.`
        : `No circuito, a relacao passa a ser observada como parte real do projeto competitivo.`,
    ],
    tags: ['tecnico', coach.method?.toLowerCase?.(), event.type?.toLowerCase?.()].filter(Boolean),
    priority: event.type === 'COACH_ERA' || event.type === 'COACH_SLAM' || event.type === 'COACH_TOURNAMENT_HIGH' ? 8 : event.type === 'COACH_RUPTURE' || event.type === 'COACH_INJURY_TENSION' ? 7 : 4,
    createdAt: Date.now(),
  };
}

export function buildCoachBioLine(player, coachMarket) {
  const coaching = player?.coaching;
  if (!coaching?.activeCoachId) return null;
  const coach = coachMarket?.coachesById?.[coaching.activeCoachId];
  if (!coach) return null;
  const method = COACH_METHODS[coach.method] ?? COACH_METHODS.FORMADOR;
  const since = coaching.startYear ? `desde ${coaching.startYear}` : 'nesta fase';
  return `${coach.name} conduz o banco ${since}, com um metodo ${method.label.toLowerCase()} que hoje aparece em ${coaching.tacticalFocus ?? 'leitura tática'} e em ${coaching.developmentFocus?.join(', ') ?? 'rotina de treino'}.`;
}

export function computeCoachRecords(coachMarket, players = []) {
  const coaches = Object.values(coachMarket?.coachesById ?? {});
  const partnerships = Object.values(coachMarket?.partnershipsById ?? {});
  const playerMap = Object.fromEntries(players.map(p => [p.id, p]));
  const enriched = coaches.map(coach => {
    const own = partnerships.filter(p => p.coachId === coach.id);
    const titles = own.reduce((s, p) => s + (p.titlesTogether ?? 0), coach.careerRecord?.titles ?? 0);
    const slams = own.reduce((s, p) => s + (p.slamsTogether ?? 0), coach.careerRecord?.slams ?? 0);
    const best = own.reduce((m, p) => Math.min(m, p.bestRank ?? 999), coach.careerRecord?.bestRankHelped ?? 999);
    const activePlayer = own.find(p => p.status === 'ACTIVE')?.playerId;
    return {
      ...coach,
      recordScore: Math.round((coach.reputation ?? 40) + titles * 2 + slams * 8 + Math.max(0, 60 - best) * 0.3),
      titles,
      slams,
      bestRankHelped: best === 999 ? null : best,
      activePlayerName: activePlayer ? playerMap[activePlayer]?.name ?? null : null,
      partnerships: own.length,
    };
  });
  return {
    ranking: enriched.sort((a, b) => b.recordScore - a.recordScore),
    legendaryPartnerships: partnerships
      .filter(p => (p.slamsTogether ?? 0) >= 2 || (p.titlesTogether ?? 0) >= 8 || p.publicStatus === 'ERA')
      .sort((a, b) => (b.slamsTogether ?? 0) - (a.slamsTogether ?? 0) || (b.titlesTogether ?? 0) - (a.titlesTogether ?? 0)),
    recentEvents: (coachMarket?.yearlyEvents ?? []).slice(-20).reverse(),
  };
}
