// ============================================
// SCOUTSYSTEM.JS - Sistema de Perspectivas e Conjecturas
// Substitui a exibição direta do potencial por análises narrativas
// O teto verdadeiro NUNCA é revelado — só observado indiretamente
// ============================================

// ==========================================
// TAG DE NÍVEL ATUAL
// Baseada APENAS nos atributos de hoje — não no potencial
// ==========================================
export function getCurrentLevelTag(attributes) {
  if (!attributes) return { label: 'NÍVEL DESCONHECIDO', color: '#94a3b8', stars: '?', tier: 0 };
  const vals = Object.values(attributes).filter(v => typeof v === 'number');
  if (!vals.length) return { label: 'NÍVEL DESCONHECIDO', color: '#94a3b8', stars: '?', tier: 0 };
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;

  if (avg >= 13.5) return { label: 'NÍVEL DE ELITE MUNDIAL',   color: '#ffd700', stars: '★★★★★', tier: 5, avg };
  if (avg >= 11.5) return { label: 'NÍVEL PRO ESTABELECIDO',   color: '#a78bfa', stars: '★★★★',  tier: 4, avg };
  if (avg >= 9.5)  return { label: 'NÍVEL COMPETITIVO',        color: '#60a5fa', stars: '★★★',   tier: 3, avg };
  if (avg >= 7.5)  return { label: 'NÍVEL EM DESENVOLVIMENTO', color: '#4ade80', stars: '★★',    tier: 2, avg };
  if (avg >= 5.5)  return { label: 'NÍVEL INICIANTE',          color: '#f59e0b', stars: '★',     tier: 1, avg };
  return                  { label: 'NÍVEL AMADOR',             color: '#94a3b8', stars: '·',     tier: 0, avg };
}

// ==========================================
// PERSPECTIVA DOS SCOUTS
// Gerada a partir de sinais OBSERVÁVEIS — não do potencial diretamente
// ==========================================
export function generateScoutPerspective(player) {
  if (!player || !player.attributes) {
    return { tag: 'PERFIL EM AVALIAÇÃO', desc: 'Dados insuficientes para análise.', icon: '🔍', color: '#94a3b8' };
  }

  const { attributes, age = 22, developmentStyle, potential, development } = player;
  const avg = (() => {
    const vals = Object.values(attributes).filter(v => typeof v === 'number');
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 7;
  })();

  // Calcular velocidade de crescimento observada (signal, não potencial)
  const yearsActive = development?.yearsActive || 0.1;
  const totalGrowth  = development?.totalGrowth  || 0;
  const growthVelocity = totalGrowth / Math.max(yearsActive, 0.5);

  // Sinais observáveis (sem acessar o teto)
  const isVeryYoung  = age <= 18;
  const isYoung      = age <= 22;
  const isMidAge     = age >= 23 && age <= 28;
  const isVeteran    = age >= 29 && age <= 33;
  const isDecline    = age >= 34;

  const fastGrowth   = growthVelocity > 4.5;
  const goodGrowth   = growthVelocity >= 2.5;
  const steadyGrowth = growthVelocity >= 1.2;
  const slowGrowth   = growthVelocity < 1.0;

  const highLevel    = avg >= 11.5;
  const midLevel     = avg >= 8.5 && avg < 11.5;
  const lowLevel     = avg < 7.0;

  const archetype = developmentStyle?.archetype || 'STEADY';
  const isLateBloomer = archetype === 'LATE_BLOOMER';
  const isDiamond     = archetype === 'DIAMOND';

  // ─── POOL DE PERSPECTIVAS ───
  const candidates = [];

  // Fenômeno jovem com números altíssimos e crescimento explosivo
  if (isVeryYoung && fastGrowth && highLevel)
    candidates.push({ tag: 'FENÔMENO EM ASCENSÃO', icon: '🌠', color: '#ffd700',
      desc: 'Números que não se veem em atletas desta idade. Os scouts não conseguem parar de olhar.' });

  // Jovem talentoso com crescimento rápido já em nível alto
  if (isYoung && goodGrowth && highLevel)
    candidates.push({ tag: 'TALENTO INEQUÍVOCO', icon: '⚡', color: '#f59e0b',
      desc: 'Nível atual já impressiona. A curva de evolução deixa a conversa ainda mais interessante.' });

  // Jovem com crescimento explosivo mas nível ainda moderado (talento oculto)
  if (isYoung && fastGrowth && !highLevel)
    candidates.push({ tag: 'DIAMANTE BRUTO', icon: '💎', color: '#8b7355',
      desc: 'O nível atual não conta a história toda. A velocidade de desenvolvimento chama muito mais atenção.' });

  // Jovem com bom crescimento e nível médio (promessa sólida)
  if (isYoung && goodGrowth && midLevel)
    candidates.push({ tag: 'PROMESSA SÓLIDA', icon: '🔥', color: '#f97316',
      desc: 'Evolução consistente em uma idade em que muitos ainda estão se encontrando no esporte.' });

  // Jovem com crescimento lento mas nível já alto (born ready)
  if (isYoung && slowGrowth && highLevel)
    candidates.push({ tag: 'CHEGOU PRONTO', icon: '🎯', color: '#a78bfa',
      desc: 'Estreou em um nível que a maioria demora anos para alcançar. O crescimento pode ter sido acelerado antes.' });

  // Jovem com crescimento lento e nível baixo (projeto incerto)
  if (isYoung && slowGrowth && lowLevel)
    candidates.push({ tag: 'PROJETO A LONGO PRAZO', icon: '📋', color: '#6b7280',
      desc: 'Nada extraordinário até agora. Pode ser apenas tempo — ou pode não ser. Difícil dizer.' });

  // Meia-idade com crescimento forte e alto nível (ainda subindo)
  if (isMidAge && goodGrowth && highLevel)
    candidates.push({ tag: 'CONSOLIDANDO O LEGADO', icon: '🏆', color: '#60a5fa',
      desc: 'Já estabelecido na elite, e ainda mostrando sinais de crescimento. Esse pico pode durar.' });

  // Meia-idade com crescimento regular (em construção)
  if (isMidAge && steadyGrowth && midLevel)
    candidates.push({ tag: 'EM CONSTRUÇÃO CONSISTENTE', icon: '📈', color: '#4ade80',
      desc: 'Evolução sólida e regular. Ainda não encontrou o limite — se é que vai encontrar tão cedo.' });

  // Meia-idade com crescimento lento e nível médio
  if (isMidAge && slowGrowth && midLevel)
    candidates.push({ tag: 'NÍVEL ESTABELECIDO', icon: '⚖️', color: '#94a3b8',
      desc: 'Parece estar se aproximando do teto. Pode surpreender, mas o padrão sugere estabilização.' });

  // Veterano ainda crescendo (late bloomer comprovado)
  if ((isVeteran || isLateBloomer) && steadyGrowth)
    candidates.push({ tag: 'LATE BLOOMER COMPROVADO', icon: '🐢', color: '#fbbf24',
      desc: 'Ninguém apostou alto nele no começo. Quem fez isso hoje está satisfeito.' });

  // Veterano no pico alto
  if (isVeteran && highLevel && slowGrowth)
    candidates.push({ tag: 'VETERANO NO AUGE', icon: '👑', color: '#ffd700',
      desc: 'Chegou onde poucos chegam. A questão agora é por quanto tempo mantém esse padrão.' });

  // Veterano em queda
  if (isDecline)
    candidates.push({ tag: 'FIM DE CICLO', icon: '🌙', color: '#6b7280',
      desc: 'Os anos cobram seu preço. O que ele já construiu, ninguém tira.' });

  // Diamond archetype com crescimento irregular (explosões e paradas)
  if (isDiamond && !fastGrowth && !slowGrowth)
    candidates.push({ tag: 'DESENVOLVIMENTO IRREGULAR', icon: '🔮', color: '#c084fc',
      desc: 'O crescimento não é linear. Fases de estagnação intercaladas com saltos inesperados. Difícil de analisar.' });

  // Fallback
  if (candidates.length === 0)
    candidates.push({ tag: 'PERFIL EM AVALIAÇÃO', icon: '🔍', color: '#94a3b8',
      desc: 'Histórico insuficiente para uma análise definitiva. O tempo dirá.' });

  // Selecionar o mais relevante (primeiro da lista, com leve aleatoriedade para variação)
  const pick = candidates[Math.min(Math.floor(Math.random() * Math.min(candidates.length, 2)), candidates.length - 1)];
  return pick;
}

// ==========================================
// CONJECTURA
// Frase procedural que nunca revela o teto
// ==========================================
export function generateConjecture(player, perspective) {
  const tag = perspective?.tag || '';

  const pools = {
    'FENÔMENO EM ASCENSÃO': [
      'Se a trajetória continuar, pode chegar a lugares onde muito poucos chegaram.',
      'A questão não é se vai ser grande — é o quão grande.',
      'Técnicos do circuito evitam fazer previsões. Boas e ruins.',
      'Quando um blader cresce assim tão jovem, você para de tentar estabelecer limites.',
    ],
    'TALENTO INEQUÍVOCO': [
      'Os números não mentem. A pergunta é onde eles param.',
      'Já está no nível em que a maioria aspira estar. E ainda está crescendo.',
      'Cada temporada acrescenta mais um argumento difícil de ignorar.',
    ],
    'DIAMANTE BRUTO': [
      'A curva é o que interessa, não o número de hoje.',
      'Muito depende de quem vai lapidá-lo. E se alguém vai.',
      'Os scouts estão divididos. Quem estiver certo vai ter muito a comemorar.',
      'O tipo de blader que ou você enxerga ou não enxerga. Por enquanto.',
    ],
    'PROMESSA SÓLIDA': [
      'Crescimento consistente nessa fase é raro. Merece atenção.',
      'Ainda não é o produto acabado. Mas a direção está claramente definida.',
      'Carreiras de alto nível têm sido construídas sobre bases menos impressionantes.',
    ],
    'CHEGOU PRONTO': [
      'Estreou onde outros chegam após anos de trabalho. O que isso significa para o futuro é a grande pergunta.',
      'Se cresceu assim antes, pode continuar. Se já era o teto, já é impressionante assim.',
      'O ponto de partida é extraordinário. A conversa sobre o destino ainda está aberta.',
    ],
    'PROJETO A LONGO PRAZO': [
      'Pode ser que o momento ainda não chegou. Pode ser que não chegue.',
      'Não gera entusiasmo agora. Pode gerar daqui a três temporadas. Ou não.',
      'A paciência com atletas assim costuma ser testada antes de ser recompensada — quando é.',
    ],
    'CONSOLIDANDO O LEGADO': [
      'Raros chegam aqui. Mais raros ainda continuam crescendo depois.',
      'O que mais impressiona não é o nível — é que ainda está subindo.',
      'Cada novo capítulo amplia uma história que já era boa.',
    ],
    'EM CONSTRUÇÃO CONSISTENTE': [
      'Ainda não chegou ao seu nível máximo. E está no caminho certo.',
      'Evolução sem pressa, mas sem pausa. Isso costuma chegar a lugares interessantes.',
      'O teto ainda está indefinido. E isso, por si só, já é uma notícia positiva.',
    ],
    'NÍVEL ESTABELECIDO': [
      'Pode ter mais. Pode não ter. O padrão recente sugere proximidade de um limite.',
      'Uma boa carreira pode terminar aqui com a cabeça erguida. Ou pode ter uma reviravolta.',
      'Quando o crescimento desacelera, a conversa muda. Não necessariamente para pior.',
    ],
    'LATE BLOOMER COMPROVADO': [
      'Ninguém apostou muito nele cedo. Quem apostou cedo está satisfeito.',
      'O desenvolvimento tardio raramente vai tão longe quanto o precoce. Raramente.',
      'Cada nova temporada de crescimento é uma surpresa que vai deixando de surpreender.',
    ],
    'VETERANO NO AUGE': [
      'Chegou onde queria. A questão agora é quanto tempo fica.',
      'O histórico construído já justifica qualquer coisa que vier pela frente.',
      'Veteranos nesse nível tendem a cair de forma mais dramática do que sobem. Mas ainda não caíram.',
    ],
    'FIM DE CICLO': [
      'O que foi construído não desaparece com a queda de rendimento.',
      'Toda grande carreira tem um final. Esta teve tudo antes disso.',
      'Ainda contribui. Mas o protagonismo pertence a outros agora.',
    ],
    'DESENVOLVIMENTO IRREGULAR': [
      'Difícil de analisar. Difícil de apostar. Impossível de ignorar quando está em fase.',
      'O padrão de desenvolvimento cria tantas dúvidas quanto respostas.',
      'Pode ser que a próxima fase de crescimento ainda não chegou. Ou que a última já passou.',
    ],
    'PERFIL EM AVALIAÇÃO': [
      'O tempo dirá. Sempre diz.',
      'Histórico ainda muito curto para qualquer conclusão definitiva.',
      'Dados insuficientes. Não é necessariamente mau sinal.',
    ],
  };

  const pool = pools[tag] || pools['PERFIL EM AVALIAÇÃO'];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ==========================================
// CALCULAR ZONAS DA BARRA DE PROGRESSO
// Sem revelar o teto — mostra "consolidado", "em construção", "desconhecido"
// ==========================================
export function calculateProgressZones(potential, attributes) {
  if (!potential || !attributes) return null;

  const currentTotal  = Object.values(attributes).filter(v => typeof v === 'number').reduce((a, b) => a + b, 0);
  const pointsEarned  = potential.pointsEarned  || 0;
  const totalPoints   = potential.totalPoints   || 100;

  // Calcular limiares internamente, sem exibir os números
  const thresholds = potential.thresholds || {
    floor:    Math.floor(totalPoints * 0.60),
    likely:   Math.floor(totalPoints * 0.70),
    possible: Math.floor(totalPoints * 0.80),
    ceiling:  totalPoints,
  };

  // Calcular percentuais para a barra (0..1)
  // Zona 1: 0 → floor    = "consolidado"
  // Zona 2: floor → likely = "esperado"
  // Zona 3: likely → possível = "possível"
  // Zona 4: possível → teto = "território desconhecido"

  // Fração da barra que cada zona ocupa
  const z1Width = thresholds.floor    / thresholds.ceiling;   // ~60%
  const z2Width = (thresholds.likely   - thresholds.floor)    / thresholds.ceiling; // ~10%
  const z3Width = (thresholds.possible - thresholds.likely)   / thresholds.ceiling; // ~10%
  const z4Width = (thresholds.ceiling  - thresholds.possible) / thresholds.ceiling; // ~20%

  // Progresso do jogador (onde está na barra)
  const progress = Math.min(1, pointsEarned / thresholds.ceiling);

  return { z1Width, z2Width, z3Width, z4Width, progress, pointsEarned, totalPoints };
}

// ==========================================
// CALCULAR THRESHOLDS PARA UM NOVO JOGADOR
// ==========================================
export function calculateThresholds(totalPoints) {
  return {
    floor:    Math.floor(totalPoints * 0.60),
    likely:   Math.floor(totalPoints * 0.70),
    possible: Math.floor(totalPoints * 0.80),
    ceiling:  totalPoints,
  };
}

// ==========================================
// GERAR NOTÍCIA DE DEBUT
// ==========================================
export function generateDebutNewsContent(player) {
  const perspective = generateScoutPerspective(player);
  const conjecture  = generateConjecture(player, perspective);

  const titlesByTag = {
    'FENÔMENO EM ASCENSÃO':   `🌠 ${player.name} FAZ DEBUT IMPRESSIONANTE — CIRCUITO EM ALERTA`,
    'TALENTO INEQUÍVOCO':     `⚡ ${player.name} ESTREIA COM AUTORIDADE`,
    'DIAMANTE BRUTO':         `💎 ${player.name} ESTREIA — SCOUTS INTRIGADOS`,
    'PROMESSA SÓLIDA':        `${player.name} entra no circuito com pé direito`,
    'CHEGOU PRONTO':          `${player.name} estreia em nível surpreendente para a idade`,
    'PROJETO A LONGO PRAZO':  `${player.name} entra para o circuito — um nome a acompanhar`,
    'EM CONSTRUÇÃO CONSISTENTE': `${player.name} entra pelo circuito com trajetória interessante`,
    'LATE BLOOMER COMPROVADO': `Veterano ${player.name} surpreende com crescimento tardio`,
    'PERFIL EM AVALIAÇÃO':    `${player.name} estreia no circuito profissional`,
  };

  return {
    title: titlesByTag[perspective.tag] || `${player.name} estreia no circuito`,
    description: `${perspective.desc} ${conjecture}`,
    scoutTag: perspective.tag,
    scoutIcon: perspective.icon,
    scoutColor: perspective.color,
  };
}

// ==========================================
// GERAR CONTEÚDO DE SALTO DE DESENVOLVIMENTO
// ==========================================
export function generateDevelopmentLeapContent(player, previousLevelTier, newLevelTier) {
  const headlines = [
    `${player.name} ELEVA SEU NÍVEL — CIRCUITO NOTA A EVOLUÇÃO`,
    `CRESCIMENTO REAL: ${player.name} já não é o mesmo de um ano atrás`,
    `${player.name} consolida salto de nível após temporada impressionante`,
    `O que diziam que levaria anos, ${player.name} fez em tempo recorde`,
  ];

  const descriptions = [
    `O que era potencial está virando realidade. ${player.name} agora opera em um patamar diferente.`,
    `Difícil argumentar contra os números. ${player.name} subiu um degrau que muitos nunca sobem.`,
    `A evolução não foi de uma hora para outra — mas o momento em que vira currículo, você percebe.`,
  ];

  return {
    title: headlines[Math.floor(Math.random() * headlines.length)],
    description: descriptions[Math.floor(Math.random() * descriptions.length)],
  };
}
