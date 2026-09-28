/** Linha do tempo unificada para quem está no Radar. */
function dateOf(value, fallbackYear = 0) {
  const raw = value?.date ?? value?.signedDate ?? value?.acquiredAt ?? value?.startedAt ?? value?.resolvedAt;
  return { year: raw?.year ?? value?.season ?? value?.seasonSigned ?? value?.year ?? fallbackYear, month: raw?.month ?? value?.monthIndex ?? value?.signedMonth ?? 0 };
}
function push(rows, entry) { if (entry.date.year) rows.push(entry); }

const EVENT_TITLES = {
  COACH_START: 'Início de parceria com novo técnico',
  COACH_RUPTURE: 'Ruptura com o técnico',
  COACH_ERA: 'Parceria com o técnico vira uma era',
  COACH_BREAKTHROUGH: 'O técnico participa do salto de nível',
  COACH_SLAM: 'Título de Grand Slam com o técnico',
  COACH_TENSION: 'Atrito com o técnico',
  COACH_RENEWED: 'Confiança renovada no técnico',
  COACH_RENEWAL: 'Contrato do técnico renovado',
  COACH_CONTRACT_END: 'Fim do contrato com o técnico',
  COACH_TOURNAMENT_HIGH: 'Título fortalece a parceria',
  COACH_INJURY_TENSION: 'Lesão coloca a parceria com o técnico sob pressão',
  COACH_TOURNAMENT_TENSION: 'Resultados aumentam a pressão sobre a equipe',
  INJURY: 'Lesão confirmada',
  INJURY_WD: 'Desistência por lesão',
  INJURY_RETURN: 'Retorno após lesão',
};

const EVENT_EXPLANATIONS = {
  COACH_START: 'Começa um novo projeto técnico, com mudanças de método, treino e leitura tática.',
  COACH_RUPTURE: 'A parceria foi encerrada e o jogador ficou livre para iniciar outro projeto técnico.',
  COACH_CONTRACT_END: 'O vínculo chegou ao fim. Isso não significa necessariamente uma briga: contrato encerrado e ruptura são acontecimentos diferentes.',
  COACH_INJURY_TENSION: 'A lesão abalou a rotina e aumentou a cobrança sobre as decisões de recuperação da equipe.',
  COACH_TOURNAMENT_TENSION: 'O resultado ruim aumentou o atrito e passou a pesar sobre a continuidade do trabalho.',
  COACH_TOURNAMENT_HIGH: 'O bom resultado aumentou a confiança no método e fortaleceu a continuidade do projeto.',
  INJURY: 'Uma lesão passou a limitar a condição física e pode causar ausência ou restrições nos torneios seguintes.',
  INJURY_WD: 'A condição física obrigou o jogador a abandonar ou não disputar o torneio. WD significa withdrawal: desistência.',
  INJURY_RETURN: 'O jogador voltou a competir, ainda podendo atravessar um período de readaptação física.',
};

const CONTRACT_INFO = {
  BASE: { label: 'Contrato base', description: 'Pagamento anual fixo, sem bônus esportivos.' },
  PERFORMANCE: { label: 'Contrato por performance', description: 'Combina valor fixo com bônus por ranking e grandes resultados.' },
  IMAGE: { label: 'Contrato de imagem', description: 'Paga mais pela exposição pública e inclui compromissos com a marca.' },
  EQUIPMENT: { label: 'Contrato de equipamento', description: 'Fornece material e exige exclusividade de uso em quadra.' },
  AMBASSADOR: { label: 'Contrato de embaixador', description: 'Acordo premium e longo, com campanha global e exclusividade na categoria.' },
  PROSPECT_DEAL: { label: 'Contrato de promessa', description: 'A marca aposta cedo: o valor cresce quando o jogador alcança Top 50, Top 10 e Top 5.' },
};

const TERMINATION_LABELS = {
  EXPIRED: 'Contrato concluído normalmente',
  SCANDAL: 'Contrato rompido por dano de imagem',
  PERFORMANCE_DROP: 'Contrato encerrado por queda de desempenho',
  INJURY_LONG: 'Contrato encerrado após uma lesão longa',
};

const SITUATION_STORIES = {
  RELATIONSHIP_TURBULENCE: 'Uma fase pessoal instável desviou energia da preparação e aumentou o desgaste emocional.',
  FAMILY_GRIEF: 'O luto afetou a rotina, a recuperação e a capacidade de competir sob pressão.',
  NEW_FAMILY_CHAPTER: 'Uma mudança familiar trouxe apoio emocional, mas também exigiu tempo e adaptação.',
  MENTAL_RESET: 'O jogador reduziu a carga para reconstruir a saúde mental e recuperar equilíbrio.',
  BURNOUT_CYCLE: 'O acúmulo de cansaço e cobrança prejudicou foco, recuperação e resistência física.',
  COMMERCIAL_OVERLOAD: 'Campanhas e compromissos elevaram a exposição comercial, mas tiraram tempo de treino e descanso.',
  BUSINESS_EXPANSION: 'Novos negócios fortaleceram receita e imagem, cobrando parte da energia dedicada ao circuito.',
  PUBLIC_STORM: 'Uma crise pública aumentou muito a pressão e prejudicou a força comercial do jogador.',
  WELLNESS_REBUILD: 'Sono, preparação física e recuperação receberam prioridade para reconstruir o corpo.',
  PURPOSE_PROJECT: 'Um projeto pessoal fortaleceu apoio e imagem sem afastar completamente o foco competitivo.',
  CAREER_CROSSROADS: 'Dúvidas sobre o futuro aumentaram a pressão e reduziram a estabilidade competitiva.',
};

const EFFECT_META = {
  matchFocus: { label: 'FOCO', positive: 'mais foco nas partidas', negative: 'menos foco nas partidas', positiveGood: true },
  recovery: { label: 'RECUPERAÇÃO', positive: 'melhor recuperação física', negative: 'recuperação física mais difícil', positiveGood: true },
  pressure: { label: 'PRESSÃO', positive: 'mais pressão', negative: 'menos pressão', positiveGood: false },
  injuryRisk: { label: 'RISCO DE LESÃO', positive: 'maior risco de lesão', negative: 'menor risco de lesão', positiveGood: false },
  commercial: { label: 'IMAGEM COMERCIAL', positive: 'mais força comercial', negative: 'imagem comercial enfraquecida', positiveGood: true },
  support: { label: 'APOIO', positive: 'mais apoio emocional', negative: 'menos apoio emocional', positiveGood: true },
  finance: { label: 'FINANÇAS', positive: 'ganho financeiro', negative: 'custo financeiro', positiveGood: true },
};

function codeKey(value) { return String(value ?? '').trim().toUpperCase(); }

function humanizeCode(value, fallback = 'Novo marco') {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  return raw
    .replace(/[_-]+/g, ' ')
    .toLocaleLowerCase('pt-BR')
    .replace(/(^|\s)\p{L}/gu, letter => letter.toLocaleUpperCase('pt-BR'));
}

function coachNameFor(event, state) {
  return event.coachName
    ?? state.coachMarket?.coachesById?.[event.coachId]?.name
    ?? null;
}

function eventPresentation(event, player, state) {
  const type = codeKey(event.type);
  const coachName = coachNameFor(event, state);
  let title = event.label ?? EVENT_TITLES[type] ?? humanizeCode(event.type, 'Marco do circuito');
  if (coachName && type === 'COACH_START') title = `Novo técnico: ${coachName}`;
  else if (coachName && type === 'COACH_CONTRACT_END') title = `Fim do contrato com ${coachName}`;
  else if (coachName && type === 'COACH_RUPTURE') title = `Ruptura com ${coachName}`;
  const text = event.description
    ?? event.text
    ?? event.note
    ?? EVENT_EXPLANATIONS[type]
    ?? `${player.name} viveu um novo capítulo no circuito.`;
  return { title, text };
}

function effectDetails(effects = {}, intensity = 65) {
  const factor = Number.isFinite(Number(intensity)) ? Number(intensity) / 65 : 1;
  return Object.entries(effects)
    .filter(([key, value]) => EFFECT_META[key] && Number.isFinite(Number(value)) && Number(value) !== 0)
    .map(([key, rawValue]) => {
      const scaled = Number(rawValue) * factor;
      const value = Math.round(scaled * 10) / 10;
      const meta = EFFECT_META[key];
      const isPositive = value > 0;
      const favorable = isPositive === meta.positiveGood;
      return {
        label: `${meta.label} ${isPositive ? '+' : '−'}${Math.abs(value)}`,
        text: isPositive ? meta.positive : meta.negative,
        tone: favorable ? 'good' : 'bad',
      };
    });
}

function joinPt(parts = []) {
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} e ${parts.at(-1)}`;
}

function situationPresentation(situation, active) {
  const duration = Number(situation.initialMonths ?? 0);
  const remaining = Math.max(0, Number(situation.monthsRemaining ?? 0));
  const impacts = effectDetails(situation.effects, situation.intensity);
  const story = SITUATION_STORIES[situation.type] ?? 'Este arco temporário alterou a rotina pessoal e profissional do jogador.';
  const impactLine = impacts.length ? `Na prática: ${joinPt(impacts.map(impact => impact.text))}.` : '';
  if (active) {
    const durationLine = duration
      ? `Está em andamento; restam ${remaining} de ${duration} meses.`
      : `Está em andamento; restam ${remaining} meses.`;
    return { title: `${situation.label} em andamento`, text: `${story} ${durationLine} ${impactLine} Os valores abaixo são modificadores mensais do arco, não pontos brutos de atributo.`.trim(), impacts };
  }
  const durationLine = duration ? `O ciclo durou ${duration} meses.` : 'O ciclo foi concluído.';
  return {
    title: `Ciclo concluído — ${situation.label}`,
    text: `${story} ${durationLine} ${impactLine} Os modificadores mensais terminaram junto com o ciclo; o dinheiro, a condição e os resultados acumulados naquele período não são apagados.`.trim(),
    impacts,
  };
}

function contractPresentation(contract) {
  const info = CONTRACT_INFO[codeKey(contract.contractType)] ?? { label: humanizeCode(contract.contractType, 'Contrato'), description: 'Acordo comercial ativo.' };
  return `${info.label} · $${Number(contract.annualFee ?? 0).toLocaleString('en-US')}/ano · ${info.description}`;
}

export function buildFollowedPlayerTimeline(player, state = {}) {
  if (!player) return [];
  const rows = [];
  for (const event of player.publicHype?.events ?? []) push(rows, { id:event.id, kind:'HYPE', icon:event.icon ?? '◈', color:'#FFB86B', title:event.label, text:event.description, date:dateOf(event,state.year) });
  for (const event of player.lifeEventLog ?? []) {
    const presentation = eventPresentation(event, player, state);
    push(rows, { id:`life:${event.type}:${event.dateKey ?? event.season}`, kind:'VIDA', icon:event.icon ?? '◌', color:'#F472B6', ...presentation, date:dateOf(event,state.year) });
  }
  for (const property of player.lifeData?.home?.properties ?? []) {
    if (!property.acquiredAt) continue;
    push(rows, { id:`home:${property.id}`, kind:'PATRIMÔNIO', icon:'⌂', color:'#60A5FA', title:property.main ? 'Nova base de vida' : 'Compra de propriedade', text:`${property.label}${property.city ? ` · ${property.city}` : ''}`, date:dateOf(property,state.year) });
  }
  for (const situation of player.lifeSimulation?.situationHistory ?? []) {
    const presentation = situationPresentation(situation, false);
    push(rows, { id:`resolved:${situation.id}`, kind:'CICLO', icon:'◎', color:'#A78BFA', title:presentation.title, text:presentation.text, impactTags:presentation.impacts, date:dateOf({ resolvedAt:situation.resolvedAt },state.year) });
  }
  for (const situation of player.lifeSimulation?.activeSituations ?? []) {
    const presentation = situationPresentation(situation, true);
    push(rows, { id:`active:${situation.id}`, kind:'CICLO ATIVO', icon:'◉', color:'#E8C84A', title:presentation.title, text:presentation.text, impactTags:presentation.impacts, date:dateOf({ startedAt:situation.startedAt },state.year) });
  }
  const active = Object.values(state.sponsorPool?.states ?? {}).flatMap(s => s.contracts ?? []).filter(contract => contract.playerId === player.id);
  for (const contract of active) push(rows, { id:`signed:${contract.id}`, kind:'MERCADO', icon:'✦', color:'#E8C84A', title:`Assina com ${contract.sponsorName}`, text:contractPresentation(contract), date:dateOf(contract,state.year) });
  for (const contract of state.sponsorPool?.contractArchive ?? []) if (contract.playerId === player.id) push(rows, { id:`ended:${contract.id}:${contract.terminatedYear}`, kind:'MERCADO', icon:'×', color:'#F87171', title:`Fim de contrato com ${contract.sponsorName}`, text:TERMINATION_LABELS[codeKey(contract.terminationReason)] ?? humanizeCode(contract.terminationReason, 'Contrato encerrado'), date:dateOf({ year:contract.terminatedYear },state.year) });
  for (const event of state.events ?? []) if (event.playerId === player.id || event.playerIds?.includes?.(player.id)) {
    const presentation = eventPresentation(event, player, state);
    push(rows, { id:`world:${event.id ?? `${event.type}:${event.dateKey ?? event.year}`}`, kind:'CIRCUITO', icon:'•', color:'#7DD8FF', ...presentation, date:dateOf(event,state.year) });
  }
  const deduped = new Map();
  for (const row of rows) if (!deduped.has(row.id)) deduped.set(row.id,row);
  return [...deduped.values()].sort((a,b) => (b.date.year-a.date.year) || (b.date.month-a.date.month)).slice(0,80);
}
