const LABELS = {
  FAREWELL_ANNOUNCEMENT: 'uma despedida que muda o desenho do circuito',
  HEALTH_INTERRUPTION: 'uma interrupção médica que pede tempo e cautela',
  PERSONAL_RUPTURE: 'uma pausa pessoal tratada com respeito',
  COACH_SHOCK: 'uma ruptura de equipe em momento delicado',
  INTEGRITY_DOPING: 'um procedimento antidoping ainda em apuração',
  INTEGRITY_BETTING: 'uma investigação de integridade ainda sem conclusão',
  HEROIC_ACT: 'um gesto que transcendeu a quadra',
  WHISTLEBLOWER: 'um relato capaz de abalar estruturas',
  BREAKTHROUGH_SHOCK: 'uma ascensão que redesenha a hierarquia',
  FEDERATION_CRISIS: 'uma crise de governança no coração do circuito',
  TOURNAMENT_COLLAPSE: 'um torneio em risco e muitas respostas pendentes',
  PLAYER_BOYCOTT: 'um movimento coletivo que desafia o calendário',
  RULE_REVOLUTION: 'uma mudança de regra com força para abrir uma era',
  SURFACE_CRISIS: 'um debate urgente sobre quadras e segurança',
};

const nameOf = actor => actor?.name ?? 'O circuito';

export function buildPublicNarrative(caseState, actor, phase, outcome = null) {
  const name = nameOf(actor);
  const subject = LABELS[caseState.type] ?? 'um acontecimento de grande impacto';
  if (phase === 'PUBLIC_BREAK') return {
    headline: `${name}: ${subject}`,
    deck: caseState.family === 'INTEGRITY'
      ? 'Há um processo em curso. A existência da investigação não equivale a culpa, e as conclusões ainda não foram publicadas.'
      : `O episódio começa a produzir efeitos esportivos e humanos. ${name} entra num período decisivo.`,
    body: `O circuito recebeu a notícia e agora acompanha os próximos passos. O impacto imediato é real, mas a história ainda não está encerrada.`,
  };
  if (phase === 'RESPONSE') return {
    headline: `${name} responde enquanto o caso avança`,
    deck: 'A posição pública passa a fazer parte da história, sem substituir evidências nem antecipar a decisão final.',
    body: `${name} definiu sua primeira resposta. A apuração continua e o peso dessa escolha será sentido dentro e fora da quadra.`,
  };
  if (phase === 'VERDICT') {
    const verdict = {
      CLEARED: 'é inocentado após a conclusão do processo',
      INCONCLUSIVE: 'tem o caso encerrado sem conclusão definitiva',
      PROCEDURAL_BREACH: 'recebe sanção por falha processual',
      NEGLIGENCE: 'é responsabilizado por negligência',
      GUILTY: 'é considerado culpado pela instância responsável',
    }[outcome] ?? 'recebe a decisão da instância responsável';
    return {
      headline: `${name} ${verdict}`,
      deck: outcome === 'CLEARED' ? 'A conclusão limpa a acusação formal, mas começa agora o trabalho de reparar o dano público.' : 'A decisão encerra uma fase e abre consequências esportivas, financeiras e humanas.',
      body: `A decisão foi publicada com base no conjunto de evidências reunido. O caso entra agora em fase de consequência${caseState.appealEligible ? ' e ainda pode ter recurso' : ''}.`,
    };
  }
  if (phase === 'RETURN') return {
    headline: `${name} volta ao circuito — e não volta igual`,
    deck: 'O retorno encerra a ausência, não apaga o que aconteceu.',
    body: 'Ranking, confiança, relações e reação das arquibancadas formam agora uma segunda disputa ao redor de cada partida.',
  };
  return { headline: `${name}: novos capítulos de uma história em curso`, deck: subject, body: 'O caso segue produzindo efeitos no circuito.' };
}

export function publicShockEvent(caseState, actor, phase, outcome = null, extra = {}) {
  const copy = buildPublicNarrative(caseState, actor, phase, outcome);
  return {
    type: `CIRCUIT_SHOCK_${phase}`,
    category: caseState.family === 'INTEGRITY' ? 'SCANDAL' : 'CIRCUIT_SHOCK',
    year: extra.year,
    playerId: actor?.id ?? null,
    playerName: actor?.name ?? null,
    caseId: caseState.id,
    shockType: caseState.type,
    family: caseState.family,
    scale: caseState.scale,
    phase,
    outcome,
    shockHeadline: copy.headline,
    shockDeck: copy.deck,
    shockBody: copy.body,
    publicConfidence: caseState.publicConfidence ?? 20,
    ...extra,
  };
}
