function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function getActByWeek(weekIndex = 0, tournament = null) {
  const category = tournament?.category ?? '';
  const isSlam = category === 'GRAND_SLAM' || tournament?.isSlam;
  const isMasters = category === 'MASTERS_1000' || tournament?.isMasters;
  const isFinals = category === 'FINALS' || tournament?.isFinals;

  if (isFinals || weekIndex >= 38) {
    return {
      id: 'FINAL_RACE',
      label: 'Corrida final',
      tone: 'HIGH_STAKES',
      summary: 'A temporada entrou no trecho em que legado, vaga e hierarquia passam a ser medidos sem amortecedor.',
      stakes: 'Tudo agora parece checkpoint definitivo.',
    };
  }

  if (isSlam || isMasters) {
    if (weekIndex <= 8) {
      return {
        id: 'BIG_TEST',
        label: 'Primeira prova grande',
        tone: 'AMPLIFIED',
        summary: 'O circuito deixou a abertura e entrou no primeiro ponto em que a temporada precisa entregar argumento real.',
        stakes: 'Nao basta parecer bem; agora e preciso provar.',
      };
    }

    if (weekIndex <= 22) {
      return {
        id: 'CONSOLIDATION_TEST',
        label: 'Prova grande',
        tone: 'AMPLIFIED',
        summary: 'O ano entrou no trecho em que favoritos tentam se consolidar e perseguidores tentam mudar de patamar.',
        stakes: 'Resultado grande aqui reorganiza o resto da temporada.',
      };
    }

    return {
      id: 'LATE_BIG_TEST',
      label: 'Checkpoint de reta final',
      tone: 'PRESSURIZED',
      summary: 'A temporada ja carrega memoria suficiente para transformar torneios grandes em tribunais narrativos.',
      stakes: 'Cada rodada pesa tambem sobre o que vira conversa de fim de ano.',
    };
  }

  if (weekIndex <= 5) {
    return {
      id: 'OPENING',
      label: 'Abertura',
      tone: 'CURIOUS',
      summary: 'O circuito ainda testa primeiras leituras, formas novas e promessas que mal começaram a se mexer.',
      stakes: 'Tudo ainda parece pista, nao veredito.',
    };
  }

  if (weekIndex <= 14) {
    return {
      id: 'CONSOLIDATION',
      label: 'Consolidação',
      tone: 'BUILDING',
      summary: 'Os nomes do ano começam a ganhar nitidez e a temporada troca impressao inicial por tendencia.',
      stakes: 'Quem confirmar aqui entra em outro tipo de conversa.',
    };
  }

  if (weekIndex <= 28) {
    return {
      id: 'GRIND',
      label: 'Trecho de desgaste',
      tone: 'WEARING',
      summary: 'O calendario cobra profundidade emocional e fisica; consistencia vale quase tanto quanto brilho.',
      stakes: 'O ano separa quem sustenta narrativa de quem so viveu um pico.',
    };
  }

  return {
    id: 'FINAL_STRETCH',
    label: 'Reta final',
    tone: 'PRESSURIZED',
    summary: 'A temporada entrou no trecho em que cada torneio ja tem cara de ajuste final de contas.',
    stakes: 'Campanhas boas viram corrida, campanhas ruins viram urgencia.',
  };
}

export function buildSeasonAct({ tournament = null, calendarIndex = 0, year = null } = {}) {
  const weekIndex = tournament?.weekIndex ?? calendarIndex ?? 0;
  const act = getActByWeek(weekIndex, tournament);
  const intensity = clamp(
    (weekIndex / 40) * 70
    + (act.id === 'BIG_TEST' || act.id === 'CONSOLIDATION_TEST' || act.id === 'FINAL_RACE' ? 20 : 0),
    10,
    100,
  );

  return {
    ...act,
    year,
    weekIndex,
    intensity,
  };
}
