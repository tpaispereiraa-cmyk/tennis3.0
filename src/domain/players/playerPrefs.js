// playerPrefs.js — Shot System v4 | Fase 2
// ═══════════════════════════════════════════════════════════════════
// Gera as preferências de comportamento do jogador a partir de seus
// atributos. As prefs definem o GOSTO do jogador — como ele prefere
// construir pontos, sua relação com a rede, quando decide atacar,
// e sua tolerância ao risco.
//
// As prefs são FIXAS por jogador (geradas uma vez, salvas na ficha).
// Elas mudam APENAS via adaptação mid-match (mentalidade alta) ou
// evolução de carreira (DevelopmentSystem).
//
// Consumido por:
//   shotDecision.js (Phase 3) — modifica os scores de golpe
//   UnifiedPlayerProfile2.jsx — exibe na ficha do jogador
// ═══════════════════════════════════════════════════════════════════

// ── Metadados de UI ─────────────────────────────────────────────────

export const BUILD_STYLE_META = {
  CROSS_DOMINANT:  { label: 'Cruzado Dominante',    abbr: 'CRZ.DOM',  icon: '↗',  desc: 'Quase sempre cruzado — constrói pressão pelo lado forte com consistência e agressividade.' },
  CROSS_BUILDER:   { label: 'Construtor Cruzado',   abbr: 'CRZ.BLD',  icon: '↗↘', desc: 'Prefere cruzado mas usa o paralelo quando a abertura aparece. Versátil dentro do padrão.' },
  VARIED:          { label: 'Variado',               abbr: 'VARIED',   icon: '⟷',  desc: 'Sem padrão fixo — lê o ponto e decide shot a shot. Difícil de antecipar.' },
  DTL_HUNTER:      { label: 'Caçador Paralelo',      abbr: 'DTL.HNT',  icon: '→',  desc: 'Puxa o paralelo cedo sempre que pode. Força o adversário a cobrir muito.' },
  CENTRE_CONTROL:  { label: 'Controle Central',      abbr: 'CTR.CTL',  icon: '⊕',  desc: 'Bolas centrais para eliminar ângulos. Controla o ritmo e espera o erro.' },
  CROSS_SHORT_ANGLE: { label: 'Cruzado com Curtas',  abbr: 'CRZ.ANG',  icon: 'CA',   desc: 'Abre a quadra com cruzadas mais curtas e anguladas para atacar o espaço seguinte.' },
  SLICE_CONTROL:   { label: 'Controle por Slice',    abbr: 'SLC.CTL',  icon: 'SC',   desc: 'Usa slice para quebrar o ritmo, manter a bola baixa e preparar a aceleração.' },
  DROP_VARIATION:  { label: 'Variação com Curta',    abbr: 'DROP.V',   icon: 'DV',   desc: 'Usa drop shot acima da média para bagunçar o tempo do rival e abrir a quadra.' },
  HEAVY_SPIN_PRESSURE: { label: 'Spin Pesado',       abbr: 'SPIN+',    icon: 'HS',   desc: 'Constrói empurrando o rival para trás com topspin alto, profundo e repetitivo.' },
  COUNTER_REDIRECT:{ label: 'Redirecionador',        abbr: 'REDIR',    icon: 'CR',   desc: 'Absorve o ritmo e muda a direção cedo para surpreender e pegar contra-pé.' },
};

export const NET_GAME_META = {
  AVOIDS:      { label: 'Evita a Rede',     abbr: 'EVITA',    icon: '⬇',  desc: 'Nunca vai à rede — baseliner puro. A rede é território inimigo.' },
  RELUCTANT:   { label: 'Relutante',        abbr: 'RELUT',    icon: '↔',  desc: 'Vai apenas se a bola curta for fácil demais para ignorar.' },
  OPPORTUNIST: { label: 'Oportunista',      abbr: 'OPRTUN',   icon: '⤴',  desc: 'Sobe quando a bola convida. Não busca, mas aproveita.' },
  PROACTIVE:   { label: 'Proativo',         abbr: 'PROAT',    icon: '↑',  desc: 'Constrói o ponto para chegar à rede. A rede é o objetivo quando o rally permite.' },
  HUNTER:      { label: 'Caçador da Rede',  abbr: 'NET.HNT',  icon: '🕸', desc: 'Todo ponto é construído para terminar na rede. A rede é o plano A.' },
};

export const RALLY_CADENCE_META = {
  PATIENT:      { label: 'Paciente',          abbr: 'PACNT',   icon: '⧖',  desc: 'Constrói 6–8+ bolas, espera a abertura clara antes de atacar.' },
  MEASURED:     { label: 'Calculado',         abbr: 'CALC',    icon: '◎',  desc: '4–6 bolas, acelera quando está confortável. Nada impulsivo.' },
  BALANCED:     { label: 'Equilibrado',       abbr: 'EQLIB',   icon: '⚖',  desc: '3–5 bolas, mistura construção e ataque conforme a situação pede.' },
  EARLY_ATTACK: { label: 'Ataque Precoce',    abbr: 'PREC',    icon: '⚡',  desc: '2–3 bolas e já tenta abrir. Não gosta de rallies longos.' },
  EXPLOSIVE:    { label: 'Explosivo',         abbr: 'EXPLV',   icon: '💥',  desc: 'Ataca em qualquer rally com abertura mínima. Sem aviso, sem construção.' },
};

export const RISK_PROFILE_META = {
  SAFETY_FIRST: { label: 'Segurança Máxima',  abbr: 'SAFE+',   icon: '🛡',  desc: 'Evita qualquer golpe arriscado. Prefere errar por excesso de cautela.' },
  SAFE:         { label: 'Conservador',       abbr: 'CONSRV',  icon: '◻',  desc: 'Tende ao golpe seguro. Assume risco só quando a abertura é clara.' },
  CALCULATED:   { label: 'Calculado',         abbr: 'CALC',    icon: '⚖',  desc: 'Usa o situacional puro — risco proporcional à abertura disponível.' },
  GAMBLER:      { label: 'Apostador',         abbr: 'GAMBL',   icon: '🎲',  desc: 'Prefere o golpe arriscado quando tem abertura mínima. Vai buscar o winner.' },
  ALLOUT:       { label: 'Tudo ou Nada',      abbr: 'ALL+',    icon: '🔥',  desc: 'Máxima agressividade no golpe, sempre. Aceita o erro como custo do ataque.' },
};

// ── Geração automática de prefs a partir dos attrs ──────────────────

export const SERVE_PROFILE_META = {
  CANNON:       { label: 'Canhao de Saque',     abbr: 'CANNON', icon: 'P', desc: 'Busca dano direto no primeiro saque e vive de pontos curtos.' },
  PRECISION:    { label: 'Cirurgiao do T',      abbr: 'PREC.T', icon: 'T', desc: 'Usa colocacao e repete spots desconfortaveis com muita precisao.' },
  BODY_JAMMER:  { label: 'Jammer de Corpo',     abbr: 'BODY',   icon: 'B', desc: 'Prefere travar a devolucao atacando o corpo do rival.' },
  WIDE_OPENER:  { label: 'Abridor de Quadra',   abbr: 'WIDE',   icon: 'W', desc: 'Abre a quadra com frequencia para dominar a primeira bola.' },
  KICK_BUILDER: { label: 'Construtor de Kick',  abbr: 'KICK',   icon: 'K', desc: 'Confia em shape, quique e margem especialmente no segundo saque.' },
  BALANCED:     { label: 'Sacador Equilibrado', abbr: 'BAL',    icon: 'M', desc: 'Mistura padroes sem depender de um unico atalho.' },
};

export const SERVE_BIAS_META = {
  POWER: { label: 'Peso',   abbr: 'PWR',   icon: 'P', desc: 'Busca velocidade e dano direto.' },
  T:     { label: 'T',      abbr: 'T',     icon: 'T', desc: 'Prefere o corredor central.' },
  BODY:  { label: 'Corpo',  abbr: 'BODY',  icon: 'B', desc: 'Travando a mecanica do devolvedor.' },
  WIDE:  { label: 'Wide',   abbr: 'WIDE',  icon: 'W', desc: 'Abre o ponto ja no saque.' },
  SHAPE: { label: 'Shape',  abbr: 'SHP',   icon: 'S', desc: 'Valoriza spin e curva.' },
  MIXED: { label: 'Misto',  abbr: 'MIX',   icon: 'M', desc: 'Sem vies forte.' },
  KICK:  { label: 'Kick',   abbr: 'KICK',  icon: 'K', desc: 'Segundo saque mais alto e seguro.' },
  SLICE: { label: 'Slice',  abbr: 'SLICE', icon: 'S', desc: 'Segundo saque com fuga lateral.' },
  SAFE:  { label: 'Seguro', abbr: 'SAFE',  icon: 'D', desc: 'Prioriza colocar a bola em jogo.' },
};

export const PRESSURE_SERVE_META = {
  BOLD:       { label: 'Corajoso',       abbr: 'BOLD',  icon: 'B', desc: 'Nao recua nos pontos grandes.' },
  SPOT:       { label: 'Spot Server',    abbr: 'SPOT',  icon: 'T', desc: 'Confia mais em spot do que em pancada.' },
  BODY_LOCK:  { label: 'Body Lock',      abbr: 'LOCK',  icon: 'L', desc: 'Nos pontos tensos, trava o rival no corpo.' },
  KICK_TRUST: { label: 'Confia no Kick', abbr: 'KICK+', icon: 'K', desc: 'Margem e altura como porto seguro.' },
  SAFE_RESET: { label: 'Reset Seguro',   abbr: 'RESET', icon: 'R', desc: 'Reduz risco e aceita comecar o ponto.' },
};

/**
 * Gera as prefs de um jogador a partir de seus atributos.
 * Resultado é determinístico — mesmos attrs = mesmos prefs.
 *
 * @param {object} attrs - Atributos do jogador
 * @returns {{ buildStyle, netGame, rallyCadence, riskProfile, adaptability, serveProfile, serve1Bias, serve2Bias, pressureServe }}
 */
export function generatePrefs(attrs) {
  const {
    agressividade: ag = 60,
    controle:      ct = 60,
    leitura:       lr = 60,
    mentalidade:   mn = 60,
    topspin:       ts = 60,
    jogoDeRede:    jr = 60,
    slice:         sl = 60,
    saqueForca:    sf = attrs?.saque ?? 60,
    saquePrecisao: sp = attrs?.saque ?? 60,
    visaoTatica:   vt = attrs?.agressividade ?? 60,
  } = attrs;

  // ── buildStyle ───────────────────────────────────────────────────
  // Ordem importa: perfis mais específicos têm prioridade sobre genéricos.
  // Specialty styles checam atributos-chave ANTES dos genéricos ofensivos.
  let buildStyle;
  if      (ag >= 82 && ts >= 80)              buildStyle = 'CROSS_DOMINANT';
  else if (ag >= 72 && lr >= 82)              buildStyle = 'DTL_HUNTER';
  // ── Specialty styles (agora gerados automaticamente) ─────────────
  // SLICE_CONTROL: jogador com slice alto e controle sólido — usa bola
  //   rasteira para quebrar o ritmo e preparar o ataque.
  else if (sl >= 80 && ct >= 68 && ag <= 72)  buildStyle = 'SLICE_CONTROL';
  // HEAVY_SPIN_PRESSURE: topspin excepcional — empurra o rival para
  //   fora da quadra com bolas altas e pesadas repetidamente.
  else if (ts >= 84 && ag >= 60)              buildStyle = 'HEAVY_SPIN_PRESSURE';
  // DROP_VARIATION: controle alto + leitura — usa curta para desequilibrar
  //   e criar espaço, não como recurso defensivo.
  else if (ct >= 80 && lr >= 76 && ag <= 68)  buildStyle = 'DROP_VARIATION';
  // CROSS_SHORT_ANGLE: combina controle e alguma agressividade para
  //   abrir a quadra com cruzadas curtas e anguladas.
  else if (ct >= 76 && ag >= 65 && lr >= 68)  buildStyle = 'CROSS_SHORT_ANGLE';
  // COUNTER_REDIRECT: leitura alta + controle — absorve o ritmo e
  //   muda a direção cedo para pegar o adversário em contra-pé.
  else if (lr >= 80 && ct >= 70 && ag <= 74)  buildStyle = 'COUNTER_REDIRECT';
  // ── Genéricos ────────────────────────────────────────────────────
  else if (ag >= 68)                          buildStyle = 'CROSS_BUILDER';
  else if (ct >= 85 && ag <= 55)              buildStyle = 'CENTRE_CONTROL';
  else if (lr >= 82)                          buildStyle = 'VARIED';
  else                                        buildStyle = 'CROSS_BUILDER';

  // ── netGame ──────────────────────────────────────────────────────
  let netGame;
  if      (jr >= 82 && ag >= 72)         netGame = 'HUNTER';
  else if (jr >= 74 || ag >= 80)         netGame = 'PROACTIVE';
  else if (jr >= 62 || ag >= 68)         netGame = 'OPPORTUNIST';
  else if (jr <= 55 && ag <= 55)         netGame = 'AVOIDS';
  else                                   netGame = 'RELUCTANT';

  // ── rallyCadence ─────────────────────────────────────────────────
  let rallyCadence;
  if      (ag >= 88)                     rallyCadence = 'EXPLOSIVE';
  else if (ag >= 76)                     rallyCadence = 'EARLY_ATTACK';
  else if (ag >= 62)                     rallyCadence = 'BALANCED';
  else if (ct >= 82 && ag <= 55)         rallyCadence = 'PATIENT';
  else                                   rallyCadence = 'MEASURED';

  // ── riskProfile ──────────────────────────────────────────────────
  let riskProfile;
  if      (ag >= 88 && ct <= 72)         riskProfile = 'ALLOUT';
  else if (ag >= 80)                     riskProfile = 'GAMBLER';
  else if (ag >= 65)                     riskProfile = 'CALCULATED';
  else if (ct >= 85 && ag <= 55)         riskProfile = 'SAFETY_FIRST';
  else if (ct >= 75 && ag <= 65)         riskProfile = 'SAFE';
  else                                   riskProfile = 'CALCULATED';

  // ── adaptability — numérico 0–100 ────────────────────────────────
  const adaptability = Math.round(mn * 0.55 + lr * 0.45);

  let serveProfile;
  if      (sf >= 86 && sp >= 74)               serveProfile = 'CANNON';
  else if (sp >= 85 && vt >= 78)               serveProfile = 'PRECISION';
  else if (ts >= 82 && sp >= 72)               serveProfile = 'KICK_BUILDER';
  else if (sl >= 80 && ag >= 68)               serveProfile = 'WIDE_OPENER';
  else if (sf >= 74 && (vt >= 74 || jr >= 70)) serveProfile = 'BODY_JAMMER';
  else                                         serveProfile = 'BALANCED';

  let serve1Bias = 'MIXED';
  let serve2Bias = 'SAFE';
  switch (serveProfile) {
    case 'CANNON':
      serve1Bias = 'POWER';
      serve2Bias = sp >= 76 ? 'T' : 'BODY';
      break;
    case 'PRECISION':
      serve1Bias = 'T';
      serve2Bias = 'T';
      break;
    case 'BODY_JAMMER':
      serve1Bias = 'BODY';
      serve2Bias = 'BODY';
      break;
    case 'WIDE_OPENER':
      serve1Bias = 'WIDE';
      serve2Bias = sl >= 74 ? 'SLICE' : 'SAFE';
      break;
    case 'KICK_BUILDER':
      serve1Bias = ts >= 76 ? 'SHAPE' : 'T';
      serve2Bias = 'KICK';
      break;
    default:
      serve1Bias = sf >= 78 ? 'POWER' : (sp >= 76 ? 'T' : 'MIXED');
      serve2Bias = ts >= 72 ? 'KICK' : 'SAFE';
      break;
  }

  let pressureServe;
  if      (mn >= 84 && sp >= 80) pressureServe = 'SPOT';
  else if (sf >= 87 && ag >= 76) pressureServe = 'BOLD';
  else if (ts >= 80 && sp >= 70) pressureServe = 'KICK_TRUST';
  else if (vt >= 76 && sf >= 72) pressureServe = 'BODY_LOCK';
  else                           pressureServe = 'SAFE_RESET';

  return {
    buildStyle,
    netGame,
    rallyCadence,
    riskProfile,
    adaptability,
    serveProfile,
    serve1Bias,
    serve2Bias,
    pressureServe,
  };
}

// ── Helpers de leitura ───────────────────────────────────────────────

export function getBuildStyleMeta(val)   { return BUILD_STYLE_META[val]   ?? { label: val, abbr: val, icon: '?', desc: '' }; }
export function getNetGameMeta(val)      { return NET_GAME_META[val]      ?? { label: val, abbr: val, icon: '?', desc: '' }; }
export function getRallyCadenceMeta(val) { return RALLY_CADENCE_META[val] ?? { label: val, abbr: val, icon: '?', desc: '' }; }
export function getRiskProfileMeta(val)  { return RISK_PROFILE_META[val]  ?? { label: val, abbr: val, icon: '?', desc: '' }; }
export function getServeProfileMeta(val) { return SERVE_PROFILE_META[val]  ?? { label: val, abbr: val, icon: '?', desc: '' }; }
export function getServeBiasMeta(val)    { return SERVE_BIAS_META[val]     ?? { label: val, abbr: val, icon: '?', desc: '' }; }
export function getPressureServeMeta(val){ return PRESSURE_SERVE_META[val] ?? { label: val, abbr: val, icon: '?', desc: '' }; }

export function mergeGeneratedPrefs(attrs, prefs = {}) {
  const generated = generatePrefs(attrs ?? {});
  return { ...generated, ...(prefs ?? {}) };
}

// ════════════════════════════════════════════════════════════════════
// SISTEMA DE ARQUÉTIPOS
// ─────────────────────────────────────────────────────────────────
// Cada combinação de prefs resulta em um arquétipo nomeado.
// Substitui completamente o antigo styleId para fins de UI e narrativa.
// ════════════════════════════════════════════════════════════════════

export const PLAY_ARCHETYPES = {
  // ── Defensivos / Pacientes ───────────────────────────────────────
  MURALHA: {
    id: 'MURALHA', name: 'A Muralha', abbr: 'MURALHA', icon: '🏰',
    color: '#4FC3F7',
    desc: 'Devolve tudo. Erra quase nada. Vence pelo cansaço do adversário.',
    voice: {
      who: 'a muralha',
      how: 'transforma cada rally em uma guerra de desgaste',
      weapon: 'consistência absurda e paciência de ferro',
    },
    press: { marketBonus: 0, archBias: { WARRIOR: 5, TACTICIAN: 3 }, personaBias: { RESERVED: 4, DIPLOMATIC: 3 } },
  },
  FUNDADOR: {
    id: 'FUNDADOR', name: 'O Fundador', abbr: 'FUNDADOR', icon: '⊕',
    color: '#69F0AE',
    desc: 'Constrói o ponto do centro da quadra com paciência e elimina ângulos.',
    voice: {
      who: 'o fundador',
      how: 'controla o ritmo pelo centro e espera o erro adversário',
      weapon: 'bolas centrais profundas e controle total do ritmo',
    },
    press: { marketBonus: 1, archBias: { TACTICIAN: 5, WARRIOR: 3, PERFECTIONIST: 2 }, personaBias: { DIPLOMATIC: 3, RESERVED: 3 } },
  },
  GLADIADOR: {
    id: 'GLADIADOR', name: 'O Gladiador', abbr: 'GLADIADOR', icon: '⚔️',
    color: '#FF9100',
    desc: 'Luta ponto por ponto. Não desiste, não abranda, não para.',
    voice: {
      who: 'o gladiador',
      how: 'transforma cada ponto em batalha física e mental',
      weapon: 'resistência e mentalidade inabalável',
    },
    press: { marketBonus: 3, archBias: { WARRIOR: 6, PERFECTIONIST: 3 }, personaBias: { RESERVED: 3, WARRIOR: 2 } },
  },
  // ── Metódicos / Equilibrados ─────────────────────────────────────
  ARQUITETO: {
    id: 'ARQUITETO', name: 'O Arquiteto', abbr: 'ARQUITETO', icon: '📐',
    color: '#00CCFF',
    desc: 'Projeta o ponto antes de jogá-lo. Varia, lê, decide com clareza.',
    voice: {
      who: 'o arquiteto',
      how: 'varia o jogo sem padrão fixo e lê o adversário com frieza',
      weapon: 'leitura de jogo e variação calculada',
    },
    press: { marketBonus: 2, archBias: { TACTICIAN: 6, PERFECTIONIST: 3, INTELLECTUAL: 2 }, personaBias: { INTELLECTUAL: 4, DIPLOMATIC: 3 } },
  },
  METÓDICO: {
    id: 'METÓDICO', name: 'O Metódico', abbr: 'METÓDICO', icon: '◎',
    color: '#B0BEC5',
    desc: 'Jogo seguro e consistente. Cada golpe no lugar certo, sem excessos.',
    voice: {
      who: 'o metódico',
      how: 'executa o padrão com precisão cirúrgica sem assumir riscos desnecessários',
      weapon: 'consistência e execução limpa',
    },
    press: { marketBonus: 1, archBias: { PERFECTIONIST: 5, TACTICIAN: 4 }, personaBias: { RESERVED: 4, DIPLOMATIC: 2 } },
  },
  OPORTUNISTA: {
    id: 'OPORTUNISTA', name: 'O Oportunista', abbr: 'OPORTUNISTA', icon: '⤴',
    color: '#FFD740',
    desc: 'Equilibra construção e ataque. Espera a abertura e não a desperdiça.',
    voice: {
      who: 'o oportunista',
      how: 'constrói com paciência e finaliza sem hesitação quando a abertura surge',
      weapon: 'timing perfeito e aproveitamento de abertura',
    },
    press: { marketBonus: 3, archBias: { TACTICIAN: 4, ARTIST: 3, DREAMER: 2 }, personaBias: { CHARISMATIC: 3, DIPLOMATIC: 2 } },
  },
  CONTADOR: {
    id: 'CONTADOR', name: 'O Contador', abbr: 'CONTADOR', icon: '🔄',
    color: '#64B5F6',
    desc: 'Usa o ritmo do adversário contra ele. Quanto mais agressão, mais perigoso fica.',
    voice: {
      who: 'o contador',
      how: 'usa o ritmo do adversário como combustível próprio',
      weapon: 'timing de contra-ataque e backhand sólido',
    },
    press: { marketBonus: 1, archBias: { TACTICIAN: 5, WARRIOR: 3 }, personaBias: { RESERVED: 3, DIPLOMATIC: 3 } },
  },
  ESTRATEGISTA: {
    id: 'ESTRATEGISTA', name: 'O Estrategista', abbr: 'ESTRATEGISTA', icon: '♟',
    color: '#CE93D8',
    desc: 'Muda o plano no meio do ponto. Joga xadrez quando o adversário joga damas.',
    voice: {
      who: 'o estrategista',
      how: 'lê o jogo e escolhe o golpe certo com precisão milimétrica',
      weapon: 'adaptação tática e leitura de jogo incomum',
    },
    press: { marketBonus: 3, archBias: { TACTICIAN: 5, ARTIST: 3, DREAMER: 2 }, personaBias: { INTELLECTUAL: 4, CHARISMATIC: 2 } },
  },
  // ── Agressivos / Ataque Precoce ──────────────────────────────────
  ARTILHEIRO: {
    id: 'ARTILHEIRO', name: 'O Artilheiro', abbr: 'ARTILHEIRO', icon: '🎯',
    color: '#FF6B35',
    desc: 'Ataca cedo, ataca sempre. Não gosta de rallies, prefere winners.',
    voice: {
      who: 'o artilheiro',
      how: 'busca o golpe vencedor o mais cedo possível, sem construção excessiva',
      weapon: 'ataque precoce e winners em posição desfavorável',
    },
    press: { marketBonus: 5, archBias: { PREDATOR: 4, WARRIOR: 3 }, personaBias: { CONFRONTATIONAL: 3, CHARISMATIC: 2 } },
  },
  // ── Explosivos ───────────────────────────────────────────────────
  PISTOLEIRO: {
    id: 'PISTOLEIRO', name: 'O Pistoleiro', abbr: 'PISTOLEIRO', icon: '🎲',
    color: '#FF4444',
    desc: 'Vai na linha em todo ponto. O risco é o estilo, não a exceção.',
    voice: {
      who: 'o pistoleiro',
      how: 'vai na linha em todo ponto como se fosse o último',
      weapon: 'golpes impossíveis e coragem de jogar sem rede de segurança',
    },
    press: { marketBonus: 7, archBias: { ARTIST: 5, REBEL: 4, WARRIOR: 2 }, personaBias: { SHOWMAN: 5, CHARISMATIC: 3, CONFRONTATIONAL: 2 } },
  },
  CANHÃO: {
    id: 'CANHÃO', name: 'O Canhão', abbr: 'CANHÃO', icon: '💣',
    color: '#FF3300',
    desc: 'Esmaga tudo com potência máxima. Não há posição defensiva — só destruição.',
    voice: {
      who: 'o canhão',
      how: 'bombeia cada golpe com potência acima do tolerável',
      weapon: 'forehand e backhand de potência devastadora',
    },
    press: { marketBonus: 5, archBias: { PREDATOR: 5, WARRIOR: 3 }, personaBias: { CONFRONTATIONAL: 4, CHARISMATIC: 2 } },
  },
  RELMPAGO: {
    id: 'RELMPAGO', name: 'O Relâmpago', abbr: 'RELMPAGO', icon: '⚡',
    color: '#FFD700',
    desc: 'Paralelo quando ninguém espera. Muda o ângulo antes do adversário piscar.',
    voice: {
      who: 'o relâmpago',
      how: 'explode para o paralelo sem aviso e sem hesitação',
      weapon: 'paralelo explosivo e mudança de direção instantânea',
    },
    press: { marketBonus: 6, archBias: { PREDATOR: 4, ARTIST: 3, REBEL: 2 }, personaBias: { CHARISMATIC: 4, SHOWMAN: 3 } },
  },
  // ── Rede ─────────────────────────────────────────────────────────
  ESCALADOR: {
    id: 'ESCALADOR', name: 'O Escalador', abbr: 'ESCALADOR', icon: '↑',
    color: '#80CBC4',
    desc: 'Constrói o ponto para chegar à rede. A rede é o destino, não o acidente.',
    voice: {
      who: 'o escalador',
      how: 'constrói cada ponto com o objetivo de fechar na rede',
      weapon: 'aproximações bem calculadas e volley confiável',
    },
    press: { marketBonus: 4, archBias: { TACTICIAN: 4, ARTIST: 3 }, personaBias: { DIPLOMATIC: 3, CHARISMATIC: 2 } },
  },
  FINALIZADOR: {
    id: 'FINALIZADOR', name: 'O Finalizador', abbr: 'FINALIZADOR', icon: '🥊',
    color: '#00FF88',
    desc: 'Agride do fundo e fecha na rede. Não há ponto longo demais para terminar em dois passos.',
    voice: {
      who: 'o finalizador',
      how: 'sobe à rede no momento certo e fecha sem hesitar',
      weapon: 'timing de subida à rede e volley de encerramento',
    },
    press: { marketBonus: 5, archBias: { PREDATOR: 4, ARTIST: 3, TACTICIAN: 2 }, personaBias: { CHARISMATIC: 3, SHOWMAN: 2 } },
  },
  PREDADOR: {
    id: 'PREDADOR', name: 'O Predador', abbr: 'PREDADOR', icon: '🕸',
    color: '#AA44FF',
    desc: 'Serve, fecha, encerra. A rede é o habitat natural, não território visitado.',
    voice: {
      who: 'o predador',
      how: 'serve e fecha a rede antes do adversário respirar',
      weapon: 'saque e reflexos de volley em sequência letal',
    },
    press: { marketBonus: 6, archBias: { PREDATOR: 5, ARTIST: 3 }, personaBias: { SHOWMAN: 4, CHARISMATIC: 3 } },
  },
  CACADOR_REDE: {
    id: 'CACADOR_REDE', name: 'O Caçador da Rede', abbr: 'CAÇ.REDE', icon: '🎯',
    color: '#88FF44',
    desc: 'Paciência de fundinho até a bola curta aparecer. Aí não há escapatória.',
    voice: {
      who: 'o caçador da rede',
      how: 'espera a bola curta com paciência de predador e sobe à rede em instinto',
      weapon: 'volley de precisão e timing de subida à rede',
    },
    press: { marketBonus: 4, archBias: { ARTIST: 4, TACTICIAN: 3, PREDATOR: 2 }, personaBias: { CHARISMATIC: 3, SHOWMAN: 2 } },
  },
};

/**
 * Deriva o arquétipo de um jogador a partir de suas preferências.
 * Lógica de prioridade: características mais dominantes definem o arquétipo.
 *
 * @param {{ buildStyle, netGame, rallyCadence, riskProfile }} prefs
 * @returns {object} — entrada de PLAY_ARCHETYPES
 */
export function getArchetype(prefs) {
  const { buildStyle, netGame, rallyCadence, riskProfile } = prefs ?? {};

  // ── Caçadores de rede ─────────────────────────────────────────
  if (netGame === 'HUNTER') {
    if (['EXPLOSIVE','EARLY_ATTACK'].includes(rallyCadence)) return PLAY_ARCHETYPES.PREDADOR;
    return PLAY_ARCHETYPES.CACADOR_REDE;
  }

  // ── Explosivos ────────────────────────────────────────────────
  if (rallyCadence === 'EXPLOSIVE') {
    if (riskProfile === 'ALLOUT') {
      return buildStyle === 'DTL_HUNTER' ? PLAY_ARCHETYPES.RELMPAGO : PLAY_ARCHETYPES.CANHÃO;
    }
    return PLAY_ARCHETYPES.PISTOLEIRO;
  }

  // ── Proativos de rede ─────────────────────────────────────────
  if (netGame === 'PROACTIVE') {
    if (['GAMBLER','ALLOUT'].includes(riskProfile) && rallyCadence === 'EARLY_ATTACK')
      return PLAY_ARCHETYPES.FINALIZADOR;
    return PLAY_ARCHETYPES.ESCALADOR;
  }

  // ── Ataque precoce ────────────────────────────────────────────
  if (rallyCadence === 'EARLY_ATTACK') {
    return PLAY_ARCHETYPES.ARTILHEIRO;
  }

  // ── Pacientes ─────────────────────────────────────────────────
  if (rallyCadence === 'PATIENT') {
    if (riskProfile === 'SAFETY_FIRST') return PLAY_ARCHETYPES.MURALHA;
    if (buildStyle === 'CENTRE_CONTROL') return PLAY_ARCHETYPES.FUNDADOR;
    return PLAY_ARCHETYPES.GLADIADOR;
  }

  // ── Medido / Variado ─────────────────────────────────────────
  if (buildStyle === 'VARIED') return PLAY_ARCHETYPES.ESTRATEGISTA;

  if (rallyCadence === 'MEASURED') {
    if (netGame === 'OPPORTUNIST') return PLAY_ARCHETYPES.OPORTUNISTA;
    if (['SAFE','SAFETY_FIRST'].includes(riskProfile)) return PLAY_ARCHETYPES.METÓDICO;
    return PLAY_ARCHETYPES.ARQUITETO;
  }

  // ── Equilibrado (BALANCED) ────────────────────────────────────
  if (['CROSS_DOMINANT','CENTRE_CONTROL'].includes(buildStyle) &&
      ['SAFE','CALCULATED'].includes(riskProfile))
    return PLAY_ARCHETYPES.CONTADOR;

  return PLAY_ARCHETYPES.OPORTUNISTA;
}

/**
 * Retorna a "voz" narrativa do arquétipo de um jogador,
 * equivalente ao antigo STYLE_VOICE do MatchNarrator.
 *
 * @param {{ buildStyle, netGame, rallyCadence, riskProfile }} prefs
 * @returns {{ who, how, weapon }}
 */
export function getArchetypeVoice(prefs) {
  return getArchetype(prefs)?.voice ?? null;
}

const ARCHETYPE_TRAINING_PROFILES = {
  MURALHA: {
    focus: ['resistencia', 'regularidade', 'devolucao', 'leitura', 'bhControle', 'defesa'],
    secondary: ['mentalidade', 'fhControle', 'slice'],
    oppose: ['volley', 'smash', 'fhPotencia'],
  },
  FUNDADOR: {
    focus: ['fhControle', 'bhControle', 'leitura', 'regularidade', 'visaoTatica'],
    secondary: ['devolucao', 'mentalidade', 'slice'],
    oppose: ['volley', 'smash'],
  },
  GLADIADOR: {
    focus: ['resistencia', 'mentalidade', 'regularidade', 'leitura', 'bhControle'],
    secondary: ['defesa', 'fhControle', 'devolucao'],
    oppose: ['smash'],
  },
  ARQUITETO: {
    focus: ['fhControle', 'bhControle', 'leitura', 'visaoTatica', 'adaptacao'],
    secondary: ['slice', 'devolucao', 'saquePrecisao'],
    oppose: [],
  },
  'METÓDICO': {
    focus: ['fhControle', 'bhControle', 'regularidade', 'leitura', 'devolucao'],
    secondary: ['mentalidade', 'saquePrecisao'],
    oppose: ['bhPotencia'],
  },
  OPORTUNISTA: {
    focus: ['fhControle', 'bhControle', 'leitura', 'visaoTatica', 'volley'],
    secondary: ['saquePrecisao', 'explosividade', 'devolucao'],
    oppose: [],
  },
  CONTADOR: {
    focus: ['bhControle', 'leitura', 'devolucao', 'visaoTatica', 'fhControle'],
    secondary: ['slice', 'regularidade', 'mentalidade'],
    oppose: ['smash'],
  },
  ESTRATEGISTA: {
    focus: ['leitura', 'visaoTatica', 'adaptacao', 'fhControle', 'bhControle'],
    secondary: ['slice', 'devolucao', 'saquePrecisao'],
    oppose: [],
  },
  ARTILHEIRO: {
    focus: ['fhPotencia', 'bhPotencia', 'explosividade', 'saqueForca', 'visaoTatica'],
    secondary: ['fhControle', 'saquePrecisao', 'mentalidade'],
    oppose: ['resistencia'],
  },
  PISTOLEIRO: {
    focus: ['fhPotencia', 'bhPotencia', 'explosividade', 'visaoTatica', 'saqueForca'],
    secondary: ['fhControle', 'bhControle'],
    oppose: ['regularidade', 'resistencia'],
  },
  'CANHÃO': {
    focus: ['fhPotencia', 'bhPotencia', 'saqueForca', 'explosividade', 'fhControle'],
    secondary: ['saquePrecisao', 'visaoTatica'],
    oppose: ['regularidade', 'slice'],
  },
  RELMPAGO: {
    focus: ['fhPotencia', 'bhPotencia', 'fhControle', 'bhControle', 'visaoTatica'],
    secondary: ['explosividade', 'saqueForca'],
    oppose: ['regularidade'],
  },
  ESCALADOR: {
    focus: ['volley', 'smash', 'explosividade', 'saquePrecisao', 'visaoTatica'],
    secondary: ['fhControle', 'leitura', 'saqueForca'],
    oppose: ['defesa'],
  },
  FINALIZADOR: {
    focus: ['volley', 'smash', 'fhPotencia', 'explosividade', 'saqueForca'],
    secondary: ['fhControle', 'visaoTatica', 'saquePrecisao'],
    oppose: ['resistencia'],
  },
  PREDADOR: {
    focus: ['volley', 'smash', 'saqueForca', 'saquePrecisao', 'explosividade', 'leitura'],
    secondary: ['fhControle', 'visaoTatica'],
    oppose: ['resistencia', 'defesa'],
  },
  CACADOR_REDE: {
    focus: ['volley', 'smash', 'explosividade', 'leitura', 'fhControle'],
    secondary: ['saquePrecisao', 'visaoTatica'],
    oppose: ['defesa'],
  },
};

export function getArchetypeTrainingProfile(prefs) {
  const archetype = getArchetype(prefs);
  return ARCHETYPE_TRAINING_PROFILES[archetype?.id] ?? {
    focus: ['fhControle', 'bhControle', 'leitura', 'mentalidade'],
    secondary: ['devolucao', 'saquePrecisao'],
    oppose: [],
  };
}

export function getDevelopmentIdentity(prefs) {
  const archetype = getArchetype(prefs);
  const trainingProfile = getArchetypeTrainingProfile(prefs);
  return {
    archetype,
    trainingProfile,
    playProfile: getPlayProfile(prefs),
  };
}

/**
 * Classifica o "tipo de jogo" de um jogador para detecção de conflitos
 * no MatchNarrator — substitui comparações brutas de styleId.
 *
 * @param {{ buildStyle, netGame, rallyCadence, riskProfile }} prefs
 * @returns {{ isGrinder, isNetAttacker, isPowerAttacker, isExplosive, isPatient }}
 */
export function getPlayProfile(prefs) {
  const { netGame, rallyCadence, riskProfile, buildStyle } = prefs ?? {};
  return {
    isGrinder:       ['PATIENT','MEASURED'].includes(rallyCadence) && ['SAFE','SAFETY_FIRST'].includes(riskProfile),
    isNetAttacker:   ['HUNTER','PROACTIVE'].includes(netGame),
    isPowerAttacker: ['EXPLOSIVE','EARLY_ATTACK'].includes(rallyCadence) && ['GAMBLER','ALLOUT'].includes(riskProfile),
    isExplosive:     rallyCadence === 'EXPLOSIVE',
    isPatient:       rallyCadence === 'PATIENT',
  };
}

/**
 * Nível textual de adaptabilidade
 */
export function adaptabilityLabel(v) {
  if (v >= 85) return { label: 'Excepcional', color: '#00E5FF' };
  if (v >= 72) return { label: 'Alta',         color: '#69F0AE' };
  if (v >= 58) return { label: 'Média',        color: '#FFD740' };
  if (v >= 42) return { label: 'Limitada',     color: '#FF9100' };
  return             { label: 'Rígido',        color: '#FF5252' };
}

