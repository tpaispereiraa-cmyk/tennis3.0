function chooseChapter({ seasonAct, races, pressuredFavorites = [], championTargets = [], respectedFloaters = [], topSeeds = [], tournament = null }) {
  const category = tournament?.category ?? '';
  const featuredRace = races?.featured?.[0] ?? null;

  if (championTargets.length > 0 && (category === 'GRAND_SLAM' || category === 'MASTERS_1000' || seasonAct?.id === 'FINAL_RACE')) {
    return {
      id: 'CONFIRMATION_STAGE',
      label: 'Palco ideal para confirmação',
      summary: 'O torneio aparece como o lugar onde a temporada cobra confirmação real de quem já chamou atenção.',
      stakes: 'Boa campanha aqui transforma impulso em autoridade.',
      hook: `${championTargets[0]?.name ?? 'O favorito da semana'} chega com cara de nome que precisa confirmar o novo tamanho.`,
    };
  }

  if (pressuredFavorites.length > 0) {
    return {
      id: 'PRESSURE_TEST',
      label: 'Evento onde a pressão aperta',
      summary: 'O campo e o momento do ano transformam este torneio num teste político para nomes que já chegam cobrados.',
      stakes: 'Uma queda precoce contamina a narrativa; uma campanha forte devolve fôlego.',
      hook: `${pressuredFavorites[0]?.name ?? 'Um dos favoritos'} entra sabendo que a semana pode aliviar ou ampliar a cobrança.`,
    };
  }

  if (featuredRace?.id === 'COMEBACK') {
    return {
      id: 'REDEMPTION_WINDOW',
      label: 'Chance de redenção',
      summary: 'O torneio funciona como janela de resposta para quem ainda tenta reorganizar a própria temporada.',
      stakes: 'Aqui, alguns nomes jogam por mais do que ranking: jogam por reabilitação narrativa.',
      hook: `O circuito lê esta semana como oportunidade concreta de redenção para nomes ainda em reconstrução.`,
    };
  }

  if (featuredRace?.id === 'ASSERTION') {
    return {
      id: 'CONSISTENCY_TEST',
      label: 'Teste de consistência',
      summary: 'O capítulo da vez mede quem realmente sustenta o que vinha mostrando nas semanas anteriores.',
      stakes: 'Não basta explodir uma vez; este é o tipo de torneio que exige repetição.',
      hook: `A semana tem cheiro de teste de consistência para quem vem empilhando bons sinais.`,
    };
  }

  if (featuredRace?.id === 'BEST_YOUNG' || respectedFloaters.length > 0) {
    return {
      id: 'NATURAL_TERRITORY',
      label: 'Território natural do jogador certo',
      summary: 'A combinação de superfície, fase do ano e field faz este torneio parecer cenário ideal para certos perfis emergentes.',
      stakes: 'É o tipo de capítulo em que encaixe de contexto vale quase tanto quanto hierarquia.',
      hook: `${(respectedFloaters[0] ?? topSeeds[0])?.name ?? 'Alguns nomes'} entram num terreno que parece especialmente favorável ao que vivem agora.`,
    };
  }

  return {
    id: 'OPEN_CHAPTER',
    label: 'Capítulo em aberto',
    summary: 'O torneio mantém a temporada em movimento sem empurrar uma leitura única antes de a primeira rodada acontecer.',
    stakes: 'Boa semana pode reinventar rapidamente o mapa do ano.',
    hook: 'O circuito chega sem veredito fechado e justamente por isso a semana ganha valor dramático.',
  };
}

export function buildTournamentChapter({
  tournament = null,
  seasonAct = null,
  narrativeRaces = null,
  pressuredFavorites = [],
  championTargets = [],
  respectedFloaters = [],
  topSeeds = [],
} = {}) {
  const chapter = chooseChapter({
    seasonAct,
    races: narrativeRaces,
    pressuredFavorites,
    championTargets,
    respectedFloaters,
    topSeeds,
    tournament,
  });

  return {
    ...chapter,
    tournamentId: tournament?.id ?? null,
    tournamentName: tournament?.name ?? null,
    actLabel: seasonAct?.label ?? null,
    featuredRaceLabel: narrativeRaces?.featured?.[0]?.label ?? null,
  };
}
