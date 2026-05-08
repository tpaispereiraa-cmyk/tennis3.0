/**
 * PlayerPersonality.js
 * ─────────────────────────────────────────────────────────────────
 * Sistema de personalidade off-court dos jogadores.
 *
 * Alimenta diretamente:
 *   — ChronicleEngine  (narrativa de carreira)
 *   — NewsEngine       (tom das notícias, GOSSIP, PROFILE)
 *   — Jornalistas      (quotes, ângulos de matéria)
 *   — Rivalidades      (dimensão além da quadra)
 *
 * DIMENSÕES:
 *   pressPersona        — como o jogador se relaciona com a mídia
 *   competitiveArchetype — quem ele é como competidor
 *   reputation          — como o mundo o enxerga (evolui com carreira)
 *   backstory           — origem, motivação e contexto fora da quadra
 *   marketability       — score 0-100 + tier de fama
 *
 * EXPORTS PRINCIPAIS:
 *   generatePersonality(player)          → PersonalityProfile completo
 *   migratePlayerPersonality(player)     → para jogadores named existentes
 *   getMarketabilityTier(score)          → tier de fama
 *   describePersonality(player)          → string legível (debug)
 */

// ═══════════════════════════════════════════════════════════════════
// HELPERS INTERNOS
// ═══════════════════════════════════════════════════════════════════

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Rolagem ponderada: [{ id, weight }] → id */
function weighted(items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.id;
  }
  return items[items.length - 1].id;
}

/** Aplica bias: dado um mapa { id: extraWeight }, retorna novo array ponderado */
function withBias(base, biasMap) {
  return base.map(item => ({
    ...item,
    weight: item.weight + (biasMap[item.id] ?? 0),
  }));
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}


// ═══════════════════════════════════════════════════════════════════
// 1. PRESS PERSONA
// ─────────────────────────────────────────────────────────────────
// Como o jogador se relaciona com a mídia, jornalistas e fãs.
// Determina o TOM das entrevistas e o ÂNGULO narrativo dos jornalistas.
// ═══════════════════════════════════════════════════════════════════

export const PRESS_PERSONAS = {

  CHARISMATIC: {
    id:          'CHARISMATIC',
    label:       'Carismático',
    description: 'Magnético, quotável e adorado pela mídia. As câmeras o encontram naturalmente. '
                + 'Gera manchetes só por existir.',
    mediaRelation: 'LOVES_MEDIA',
    // hooks para jornalistas:
    storyAngles: ['celebração espontânea', 'frases que ficam', 'carisma contagiante', 'favorito da torcida'],
    interviewTone: 'warm_open',
    marketBonus: 12,
  },

  RESERVED: {
    id:          'RESERVED',
    label:       'Reservado',
    description: 'Poucos sorrisos, respostas curtas, vida privada blindada. '
                + 'Deixa o tênis falar. A mídia luta para conseguir algo além do resultado.',
    mediaRelation: 'TOLERATES_MEDIA',
    storyAngles: ['o enigma', 'a frieza calculada', 'o que acontece fora das câmeras?', 'privacidade como identidade'],
    interviewTone: 'brief_professional',
    marketBonus: -4,
  },

  CONFRONTATIONAL: {
    id:          'CONFRONTATIONAL',
    label:       'Confrontador',
    description: 'Nunca foge de polêmica. Fala o que pensa sobre adversários, arbitragem e o circuito. '
                + 'Cria inimigos e admiradores com a mesma declaração.',
    mediaRelation: 'WEAPONIZES_MEDIA',
    storyAngles: ['a declaração bomba', 'conflito com rival', 'crítica ao circuito', 'o que ele disse dessa vez'],
    interviewTone: 'direct_provocative',
    marketBonus: 6,
  },

  SHOWMAN: {
    id:          'SHOWMAN',
    label:       'Showman',
    description: 'Tênis é entretenimento. Celebra, provoca (com charme), joga para a galeria. '
                + 'Ama os grandes palcos e o grande palco ama ele de volta.',
    mediaRelation: 'PERFORMS_FOR_MEDIA',
    storyAngles: ['o espetáculo além do placar', 'celebração memorável', 'a torcida acende com ele', 'quando o show começa'],
    interviewTone: 'theatrical_warm',
    marketBonus: 15,
  },

  DIPLOMATIC: {
    id:          'DIPLOMATIC',
    label:       'Diplomático',
    description: 'Medido, cuidadoso, nunca diz algo que possa ser usado contra ele. '
                + 'Respeitado por todos, intimado por poucos. A imagem sempre gerenciada.',
    mediaRelation: 'MANAGES_MEDIA',
    storyAngles: ['o profissional model', 'a declaração certeira sem polêmica', 'construtor de legado controlado'],
    interviewTone: 'measured_safe',
    marketBonus: 3,
  },

  ENIGMATIC: {
    id:          'ENIGMATIC',
    label:       'Enigmático',
    description: 'Fala pouco, mas o que fala é profundo. Jornalistas passam meses tentando entendê-lo. '
                + 'A ausência de exposição cria mais fascínio que presença constante.',
    mediaRelation: 'ELUDES_MEDIA',
    storyAngles: ['quem é esse jogador realmente?', 'a frase que ninguém entendeu', 'o silêncio que diz tudo', 'o personagem sem máscara'],
    interviewTone: 'sparse_deep',
    marketBonus: 5,
  },

  INTELLECTUAL: {
    id:          'INTELLECTUAL',
    label:       'Intelectual',
    description: 'Surpreende jornalistas com referências, análises profundas e visão de mundo. '
                + 'Fala de tênis como filosofia. A imprensa séria o ama; o grande público demora a entender.',
    mediaRelation: 'ELEVATES_MEDIA',
    storyAngles: ['a mente por trás do campeão', 'a análise que ninguém esperava', 'tênis como metáfora de vida', 'o atleta-pensador'],
    interviewTone: 'analytical_profound',
    marketBonus: 2,
  },

};

const PRESS_PERSONA_BASE_POOL = [
  { id: 'CHARISMATIC',    weight: 12 },
  { id: 'RESERVED',       weight: 18 },
  { id: 'CONFRONTATIONAL',weight: 10 },
  { id: 'SHOWMAN',        weight: 8  },
  { id: 'DIPLOMATIC',     weight: 14 },
  { id: 'ENIGMATIC',      weight: 11 },
  { id: 'INTELLECTUAL',   weight: 9  },
];


// ═══════════════════════════════════════════════════════════════════
// 2. COMPETITIVE ARCHETYPE
// ─────────────────────────────────────────────────────────────────
// Quem o jogador É como competidor — a alma do atleta.
// Determina o NÚCLEO das crônicas de carreira e o ângulo emocional
// das rivalidades.
// ═══════════════════════════════════════════════════════════════════

export const COMPETITIVE_ARCHETYPES = {

  PERFECTIONIST: {
    id:          'PERFECTIONIST',
    label:       'Perfeccionista',
    description: 'Nunca satisfeito. Analisa cada ponto perdido como falha pessoal. '
                + 'A busca pela perfeição é motor e tortura ao mesmo tempo.',
    coreDriver:  'perfeição técnica',
    narrativeHook: 'a obsessão que constrói e desgasta',
    rivalDynamic: 'vê erros onde adversários veem vitórias',
    crisisResponse: 'isola-se, analisa, reemerge mais forte ou mais frágil',
    pressPersonaBias: { RESERVED: 4, INTELLECTUAL: 4, DIPLOMATIC: 2 },
  },

  WARRIOR: {
    id:          'WARRIOR',
    label:       'Guerreiro',
    description: 'Coração maior que talento — mas o talento existe. '
                + 'Ganha feio quando precisa. Nunca desiste. Cada ponto é pessoal.',
    coreDriver:  'garra e nunca desistir',
    narrativeHook: 'o que ele tira de dentro quando não tem mais nada',
    rivalDynamic: 'eleva o jogo do adversário ao se recusar a perder',
    crisisResponse: 'briga mais forte, mesmo sem plano',
    pressPersonaBias: { CONFRONTATIONAL: 4, CHARISMATIC: 3, SHOWMAN: 2 },
  },

  ARTIST: {
    id:          'ARTIST',
    label:       'Artista',
    description: 'O tênis é expressão. Prefere o drop-shot perfeito ao winner fácil. '
                + 'Joga para criar beleza, não apenas vencer — e às vezes isso é seu maior defeito.',
    coreDriver:  'expressão e beleza do jogo',
    narrativeHook: 'quando a arte encontra o resultado',
    rivalDynamic: 'jogo mais bonito quando há estética no adversário',
    crisisResponse: 'busca a solução elegante mesmo sob pressão máxima',
    pressPersonaBias: { SHOWMAN: 4, CHARISMATIC: 3, ENIGMATIC: 3, INTELLECTUAL: 2 },
  },

  REBEL: {
    id:          'REBEL',
    label:       'Rebelde',
    description: 'Não aceita as regras do establishment. Questiona tudo — o circuito, a mídia, '
                + 'os técnicos, o sistema. Joga nos próprios termos. Polariza como poucos.',
    coreDriver:  'provar que o sistema estava errado sobre ele',
    narrativeHook: 'o outsider que não virou insider mesmo chegando ao topo',
    rivalDynamic: 'celebra derrotas de favoritos como vitórias pessoais',
    crisisResponse: 'dobra a provocação, ignora a pressão convencional',
    pressPersonaBias: { CONFRONTATIONAL: 6, ENIGMATIC: 3, SHOWMAN: 2 },
  },

  TACTICIAN: {
    id:          'TACTICIAN',
    label:       'Estrategista',
    description: 'Câmpeon mental. Prepara cada adversário como uma batalha de xadrez. '
                + 'Perde quase nunca para o mesmo jogador duas vezes. Adaptação é superpoder.',
    coreDriver:  'resolver o puzzle do adversário',
    narrativeHook: 'a mente que vê o que os outros não veem',
    rivalDynamic: 'rivals ficam sem saber por que perderam de novo para ele',
    crisisResponse: 'muda o plano de jogo no meio da partida',
    pressPersonaBias: { DIPLOMATIC: 4, INTELLECTUAL: 5, RESERVED: 3 },
  },

  PREDATOR: {
    id:          'PREDATOR',
    label:       'Predador',
    description: 'Frio, calculado, dominante. Não tem empatia pela situação do adversário. '
                + 'Vencê-lo não basta — precisa que o adversário saiba que foi dominado.',
    coreDriver:  'dominância total e reconhecimento de superioridade',
    narrativeHook: 'o momento em que o adversário percebe que perdeu',
    rivalDynamic: 'ignora adversários de propósito para diminuí-los psicologicamente',
    crisisResponse: 'aperta mais — a frieza aumenta em momentos críticos',
    pressPersonaBias: { RESERVED: 4, ENIGMATIC: 4, CONFRONTATIONAL: 3 },
  },

  DREAMER: {
    id:          'DREAMER',
    label:       'Sonhador',
    description: 'Inspirado por lendas. Cita campeões do passado, conhece a história do esporte, '
                + 'sonha em grande mas com romantismo genuíno. A torcida sente essa autenticidade.',
    coreDriver:  'fazer parte da história do tênis',
    narrativeHook: 'a criança que sonhou com isso e o adulto que chegou lá',
    rivalDynamic: 'vê em adversários lendas em formação, o que eleva a narrativa',
    crisisResponse: 'busca força em histórias de comebacks do passado',
    pressPersonaBias: { CHARISMATIC: 5, DIPLOMATIC: 3, SHOWMAN: 3, INTELLECTUAL: 2 },
  },

};

const COMPETITIVE_ARCHETYPE_BASE_POOL = [
  { id: 'PERFECTIONIST', weight: 14 },
  { id: 'WARRIOR',       weight: 16 },
  { id: 'ARTIST',        weight: 10 },
  { id: 'REBEL',         weight: 9  },
  { id: 'TACTICIAN',     weight: 13 },
  { id: 'PREDATOR',      weight: 12 },
  { id: 'DREAMER',       weight: 11 },
];


// ═══════════════════════════════════════════════════════════════════
// 3. REPUTATION (pública)
// ─────────────────────────────────────────────────────────────────
// Como o mundo — fãs, mídia, circuito — enxerga o jogador.
// Pode EVOLUIR ao longo da carreira (upgrades por conquistas).
// ═══════════════════════════════════════════════════════════════════

export const REPUTATIONS = {

  ICON: {
    id:          'ICON',
    label:       'Ícone',
    description: 'Transcende o esporte. Amado por fãs que nem acompanham tênis. '
                + 'Nome reconhecido globalmente. Presença que preenche estádios.',
    fanBase:     'MASSIVE',
    mediaPresence: 'OMNIPRESENT',
    narrativeRole: 'o grande personagem da era',
    marketMultiplier: 1.40,
    unlockCondition: 'grandSlamTitles >= 2 && yearsAsTop10 >= 4',
  },

  VILLAIN: {
    id:          'VILLAIN',
    label:       'Vilão',
    description: 'Adversado pelos neutros, adorado pelos que entendem. '
                + 'Gera vaias e aplausos ao mesmo tempo. O circuito não seria o mesmo sem ele.',
    fanBase:     'DIVIDED',
    mediaPresence: 'CONTROVERSIAL',
    narrativeRole: 'o antagonista que todo grande herói precisa',
    marketMultiplier: 1.15,
    unlockCondition: 'pressPersona in [CONFRONTATIONAL] && highRanking',
  },

  UNDERDOG: {
    id:          'UNDERDOG',
    label:       'Herói Improvável',
    description: 'A torcida sempre ao lado, mesmo sem os títulos. '
                + 'Cada vitória é celebrada como milagre. Sua jornada emociona quem não o conhecia.',
    fanBase:     'LOYAL_PASSIONATE',
    mediaPresence: 'BELOVED',
    narrativeRole: 'o jogador pelo qual todos torcem para vencer',
    marketMultiplier: 1.10,
    unlockCondition: 'potential in [COMUM, CAMPEAO] && hasUpset',
  },

  PRODIGY: {
    id:          'PRODIGY',
    label:       'Prodígio',
    description: 'O futuro chegou cedo. Manchetes desde os 16-18 anos. '
                + 'Expectativas monstruosas que podem ser combustível ou fardo.',
    fanBase:     'EXCITED_WATCHING',
    mediaPresence: 'TRACKED_CLOSELY',
    narrativeRole: 'o próximo grande',
    marketMultiplier: 1.20,
    unlockCondition: 'age <= 21 && potential in [ELITE, LENDA, GERACIONAL]',
  },

  MYSTERIOUS: {
    id:          'MYSTERIOUS',
    label:       'Misterioso',
    description: 'Pouco se sabe. O que se sabe fascina. A mídia quer mais — e ele não entrega. '
                + 'O mistério cria uma narrativa própria.',
    fanBase:     'CURIOUS',
    mediaPresence: 'ELUSIVE',
    narrativeRole: 'o personagem que ninguém leu completamente',
    marketMultiplier: 0.90,
    unlockCondition: 'pressPersona in [ENIGMATIC, RESERVED]',
  },

  CONTROVERSIAL: {
    id:          'CONTROVERSIAL',
    label:       'Polêmico',
    description: 'Amor e ódio em igual medida. Uma declaração, uma ação, uma partida '
                + 'é suficiente para reacender o debate. Incapaz de ser ignorado.',
    fanBase:     'POLARIZED',
    mediaPresence: 'CLICK_BAIT',
    narrativeRole: 'o catalisador de debate',
    marketMultiplier: 1.05,
    unlockCondition: 'pressPersona in [CONFRONTATIONAL, REBEL]',
  },

  RISING_STAR: {
    id:          'RISING_STAR',
    label:       'Estrela em Ascensão',
    description: 'Talento óbvio, trajetória ascendente, narrativa construída pela mídia '
                + 'como o próximo grande. O peso dessa narrativa vai testá-lo.',
    fanBase:     'GROWING',
    mediaPresence: 'SPOTLIGHTED',
    narrativeRole: 'o hype que vai se provar',
    marketMultiplier: 1.10,
    unlockCondition: 'age <= 24 && topRanking',
  },

  VETERAN: {
    id:          'VETERAN',
    label:       'Veterano Respeitado',
    description: 'Passou por tudo. Sobreviveu ao circuito quando muitos acharam que havia terminado. '
                + 'Vitórias tardias são celebradas com emoção rara.',
    fanBase:     'RESPECTFUL_NOSTALGIC',
    mediaPresence: 'CELEBRATED',
    narrativeRole: 'o personagem que não sai sem deixar sua marca',
    marketMultiplier: 0.95,
    unlockCondition: 'age >= 32 && stillCompetitive',
  },

};

const REPUTATION_BASE_POOL = [
  { id: 'ICON',        weight: 2  },
  { id: 'VILLAIN',     weight: 8  },
  { id: 'UNDERDOG',    weight: 14 },
  { id: 'PRODIGY',     weight: 11 },
  { id: 'MYSTERIOUS',  weight: 12 },
  { id: 'CONTROVERSIAL',weight: 9 },
  { id: 'RISING_STAR', weight: 16 },
  { id: 'VETERAN',     weight: 4  },
];


// ═══════════════════════════════════════════════════════════════════
// 4. BACKSTORY
// ─────────────────────────────────────────────────────────────────
// Origem, motivação e contexto. Alimentará crônicas de carreira,
// perfis de jogador e jornalistas GOSSIP/NARRATIVE.
// ═══════════════════════════════════════════════════════════════════

const BACKSTORY_ORIGINS = [
  {
    id:    'TENNIS_FAMILY',
    label: 'Família de tenistas',
    desc:  (n) => `${n.firstName} cresceu em uma família com tradição no tênis. Raquete nas mãos antes dos 5 anos.`,
    archetypeBias: { PERFECTIONIST: 3, TACTICIAN: 2 },
  },
  {
    id:    'SELF_MADE',
    label: 'Construção própria',
    desc:  (n) => `Sem academia, sem apoio institucional. ${n.firstName} chegou ao profissionalismo por conta própria.`,
    archetypeBias: { WARRIOR: 4, REBEL: 3 },
  },
  {
    id:    'ACADEMY_PRODUCT',
    label: 'Produto de academia',
    desc:  (n) => `${n.firstName} foi identificado por olheiros aos ${randInt(9, 13)} anos e moldado em uma academia de elite.`,
    archetypeBias: { PERFECTIONIST: 3, TACTICIAN: 3 },
  },
  {
    id:    'LATE_DISCOVERY',
    label: 'Descoberta tardia',
    desc:  (n) => `${n.firstName} só descobriu o tênis aos ${randInt(12, 16)} anos — tarde para os padrões do circuito. O que falta em base técnica, sobra em amor pelo jogo.`,
    archetypeBias: { DREAMER: 5, WARRIOR: 3 },
  },
  {
    id:    'PRODIGY_PATH',
    label: 'Trajetória de prodígio',
    desc:  (n) => `${n.firstName} era manchete antes dos 16. Campeonatos juvenis, comparações com lendas.`,
    archetypeBias: { PERFECTIONIST: 4, PREDATOR: 3 },
  },
  {
    id:    'SPORT_SWITCHER',
    label: 'Esportista de origem',
    desc:  (n) => `${n.firstName} veio de outro esporte — atletismo, natação — e migrou para o tênis trazendo um físico diferente.`,
    archetypeBias: { WARRIOR: 3, ARTIST: 2 },
  },
  {
    id:    'HUMBLE_BEGINNINGS',
    label: 'Origem humilde',
    desc:  (n) => `${n.firstName} cresceu sem recursos. Cada raquete, cada torneio foi uma conquista antes de chegar ao profissional.`,
    archetypeBias: { WARRIOR: 5, DREAMER: 4, REBEL: 2 },
  },
  {
    id:    'NATIONAL_PROGRAM',
    label: 'Programa nacional',
    desc:  (n) => `${n.firstName} foi selecionado pelo programa nacional de sua federação e desenvolvido com apoio total do Estado.`,
    archetypeBias: { TACTICIAN: 3, DIPLOMATIC: 3, PERFECTIONIST: 2 },
  },
];

const BACKSTORY_MOTIVATIONS = [
  {
    id:    'TITLES_AND_LEGACY',
    label: 'Títulos e legado',
    desc:  (n) => `${n.firstName} compete para construir um legado permanente no tênis.`,
    archetypeBias: { PERFECTIONIST: 3, PREDATOR: 3, DREAMER: 2 },
  },
  {
    id:    'FAMILY_HONOR',
    label: 'Honra familiar',
    desc:  (n) => `Cada vitória é dedicada à família. ${n.firstName} carrega esse peso com orgulho.`,
    archetypeBias: { WARRIOR: 4, DREAMER: 3 },
  },
  {
    id:    'ESCAPE_AND_PROOF',
    label: 'Fuga e comprovação',
    desc:  (n) => `O tênis foi a saída. Provar que foi a escolha certa é o combustível diário de ${n.firstName}.`,
    archetypeBias: { REBEL: 4, WARRIOR: 3, DREAMER: 2 },
  },
  {
    id:    'PURE_LOVE_OF_GAME',
    label: 'Amor puro pelo jogo',
    desc:  (n) => `${n.firstName} simplesmente ama o tênis. Os títulos são consequência, nunca o objetivo principal.`,
    archetypeBias: { ARTIST: 5, DREAMER: 4 },
  },
  {
    id:    'RIVAL_DRIVEN',
    label: 'Movido por rivalidade',
    desc:  (n) => `Há um adversário — ou um fantasma de adversário — que define o norte competitivo de ${n.firstName}.`,
    archetypeBias: { PREDATOR: 4, WARRIOR: 3, REBEL: 2 },
  },
  {
    id:    'NO1_OBSESSION',
    label: 'Obsessão pelo número 1',
    desc:  (n) => `O ranking é a única métrica. ${n.firstName} quer o topo — e o número 1 é tudo.`,
    archetypeBias: { PERFECTIONIST: 5, PREDATOR: 3 },
  },
  {
    id:    'REINVENTION',
    label: 'Reinvenção contínua',
    desc:  (n) => `Cada fase da carreira é um novo ${n.firstName}. Adaptar é sobreviver.`,
    archetypeBias: { TACTICIAN: 5, ARTIST: 3 },
  },
  {
    id:    'HISTORY_SEEKER',
    label: 'Caçador de história',
    desc:  (n) => `${n.firstName} não quer só vencer — quer estar nos livros. Comparações com o passado o motivam.`,
    archetypeBias: { DREAMER: 5, PERFECTIONIST: 2, PREDATOR: 2 },
  },
];

const BACKSTORY_BACKGROUNDS = [
  {
    id:    'SOLO_PARENT',
    label: 'Criado por um dos pais',
    desc:  (n) => `Criado pela mãe/pai sozinho, ${n.firstName} tem uma ligação inquebrável com a família.`,
  },
  {
    id:    'SPORTS_DYNASTY',
    label: 'Família de atletas',
    desc:  (n) => `A família de ${n.firstName} tem atletas de alto nível em outras modalidades.`,
  },
  {
    id:    'IMMIGRANT_STORY',
    label: 'Trajetória de imigrante',
    desc:  (n) => `A família de ${n.firstName} se estabeleceu em outro país buscando melhores condições.`,
  },
  {
    id:    'SMALL_TOWN',
    label: 'Interior e anonimato',
    desc:  (n) => `${n.firstName} veio de uma cidade pequena onde o tênis era quase inexistente.`,
  },
  {
    id:    'PRIVILEGED_ORIGIN',
    label: 'Berço privilegiado',
    desc:  (n) => `${n.firstName} teve acesso às melhores estruturas desde cedo. A crítica e a pressão vieram juntas.`,
  },
  {
    id:    'SIBLING_RIVALRY',
    label: 'Irmão ou irmã tenista',
    desc:  (n) => `Cresceu competindo com um irmão tenista. A rivalidade interna moldou o competidor.`,
  },
  {
    id:    'MENTOR_FIGURE',
    label: 'Figura de mentor',
    desc:  (n) => `Um técnico ou familiar foi a figura central que transformou o talento em profissional.`,
  },
  {
    id:    'ADVERSITY_SURVIVOR',
    label: 'Sobrevivente de adversidade',
    desc:  (n) => `Lesão grave, problema familiar ou crise pessoal marcou o caminho antes do sucesso.`,
  },
];

// Evento-chave de carreira (semente para crônicas futuras)
const KEY_CAREER_EVENTS = [
  { id: 'FIRST_SLAM_FINAL',   label: 'Chegou à final de um Grand Slam antes dos 22' },
  { id: 'COMEBACK_INJURY',    label: 'Voltou de lesão grave que parecia encerrar a carreira' },
  { id: 'UPSET_OF_THE_YEAR',  label: 'Causou o upset do ano contra um número 1' },
  { id: 'LONG_DROUGHT',       label: 'Passou mais de 2 anos sem título antes de voltar a vencer' },
  { id: 'RIVALRY_DEFINING',   label: 'Partida fundacional de uma rivalidade histórica' },
  { id: 'PRODIGY_DEBUT',      label: 'Estreia histórica como adolescente no circuito principal' },
  { id: 'MENTAL_BREAKDOWN',   label: 'Crise pública visível que moldou sua relação com pressão' },
  { id: 'RECORD_BREAKER',     label: 'Quebrou um recorde histórico que carrega até hoje' },
  { id: 'LATE_TITLE',         label: 'Primeiro título grande depois dos 28 anos' },
  { id: 'WILD_CARD_WINNER',   label: 'Ganhou um torneio entrando como wildcard ou qualifier' },
];


// ═══════════════════════════════════════════════════════════════════
// 5. MARKETABILITY
// ─────────────────────────────────────────────────────────────────
// Score 0-100 baseado em múltiplos fatores.
// Alimenta contratos de patrocínio, presença no newsEngine e
// peso narrativo no ChronicleEngine.
// ═══════════════════════════════════════════════════════════════════

const MARKETABILITY_TIERS = [
  { min: 0,  max: 19,  id: 'NICHE',    label: 'Nicho',       desc: 'Seguidor culto entre entusiastas' },
  { min: 20, max: 39,  id: 'LOCAL',    label: 'Local',       desc: 'Conhecido no país de origem' },
  { min: 40, max: 59,  id: 'NACIONAL', label: 'Nacional',    desc: 'Estrela nacional reconhecida' },
  { min: 60, max: 79,  id: 'GLOBAL',   label: 'Global',      desc: 'Reconhecimento mundial' },
  { min: 80, max: 100, id: 'ICONE',    label: 'Ícone',       desc: 'Transcende o tênis' },
];

export function getMarketabilityTier(score) {
  return MARKETABILITY_TIERS.find(t => score >= t.min && score <= t.max)
      ?? MARKETABILITY_TIERS[0];
}

// Bônus de marketability por nacionalidade (mercado do país)
const NATIONALITY_MARKET_BONUS = {
  USA: 10, BRA: 8, ESP: 7, ITA: 7, FRA: 7, GER: 7, GBR: 8,
  AUS: 6, ARG: 5, JPN: 6, KOR: 5, CHN: 8, RUS: 5, CAN: 5,
  SRB: 4, CHE: 4, AUT: 3, NOR: 3, SWE: 3,
};

// Bônus de marketabilidade por arquétipo de jogo
// (deriva do PLAY_ARCHETYPES.press.marketBonus — centralizado em playerPrefs.js)
// Fallback inline para não criar dependência circular
const ARCHETYPE_MARKET_BONUS = {
  PISTOLEIRO: 7, RELÂMPAGO: 6, PREDADOR: 6,
  ARTILHEIRO: 5, FINALIZADOR: 5, CANHÃO: 5,
  ESCALADOR: 4, ESTRATEGISTA: 3, OPORTUNISTA: 3,
  FUNDADOR: 1, ARQUITETO: 2, CONTADOR: 1,
  GLADIADOR: 3, METÓDICO: 1, MURALHA: 0, CACADOR_REDE: 4,
};

function getStyleMarketBonus(player) {
  // Usa o novo sistema de arquétipos via prefs
  if (player.prefs) {
    try {
      // Import dinâmico inline evitado — lógica inline simplificada
      const { rallyCadence, riskProfile, netGame, buildStyle } = player.prefs;
      if (netGame === 'HUNTER' && ['EXPLOSIVE','EARLY_ATTACK'].includes(rallyCadence)) return 6;
      if (netGame === 'HUNTER') return 4;
      if (rallyCadence === 'EXPLOSIVE' && riskProfile === 'ALLOUT') return 5;
      if (rallyCadence === 'EXPLOSIVE') return 7;
      if (netGame === 'PROACTIVE' && riskProfile === 'GAMBLER') return 5;
      if (rallyCadence === 'EARLY_ATTACK') return 5;
      if (rallyCadence === 'PATIENT' && riskProfile === 'SAFETY_FIRST') return 0;
      return 2;
    } catch { /* fallback */ }
  }
  // Fallback legado (caso styleId ainda exista)
  const LEGACY = {
    AGG_BASELINER: 5, TAKEALLRISK: 8, SRV_VOL: 4,
    BIG_SERVER: 3, TACT_TEC: 2, ALL_COURT: 4, GRINDER: 1,
    CTR_PUNCHER: 1, RETRIEVER: 0, PWR_BASE: 4, NET_SPEC: 5, ADPT_TAC: 3,
  };
  return LEGACY[player.styleId] ?? 2;
}

// Bônus por potencial
const POTENTIAL_MARKET_BONUS = {
  GERACIONAL: 25, LENDA: 18, ELITE: 10, CAMPEAO: 6, COMUM: 2, ABAIXO_DA_MEDIA: 0,
};

function calcMarketability(player, pressPersonaId, reputationId, archetypeId) {
  const persona    = PRESS_PERSONAS[pressPersonaId];
  const reputation = REPUTATIONS[reputationId];

  // Base por potencial
  let score = POTENTIAL_MARKET_BONUS[player.potential] ?? 5;

  // Bônus de persona (marketBonus)
  score += persona?.marketBonus ?? 0;

  // Multiplicador de reputação
  const mult = reputation?.marketMultiplier ?? 1.0;

  // Bônus de nacionalidade
  score += NATIONALITY_MARKET_BONUS[player.nationality] ?? 2;

  // Bônus de estilo (novo sistema de arquétipos)
  score += getStyleMarketBonus(player);

  // Variância individual ±8
  score += randInt(-8, 8);

  // Aplica multiplicador de reputação
  score = Math.round(score * mult);

  return clamp(score, 1, 100);
}


// ═══════════════════════════════════════════════════════════════════
// 6. MATRIZ DE COERÊNCIA
// ─────────────────────────────────────────────────────────────────
// Biases que conectam estilo de jogo → arquétipo e
// nacionalidade → personalidade. Cria personagens coerentes
// mas permite surpresas quando o dado rolar diferente.
// ═══════════════════════════════════════════════════════════════════

// Prefs → arquétipo competitivo mais provável
// Usa rallyCadence + riskProfile + netGame como eixos principais
function getArchetypeBias(player) {
  const p = player.prefs;
  if (!p) {
    // Fallback legado
    const LEGACY = {
      AGG_BASELINER: { WARRIOR: 4, PREDATOR: 3, ARTIST: 2 },
      CTR_PUNCHER:   { TACTICIAN: 5, WARRIOR: 3, PERFECTIONIST: 2 },
      ALL_COURT:     { TACTICIAN: 3, ARTIST: 3, DREAMER: 2 },
      SRV_VOL:       { PREDATOR: 4, TACTICIAN: 3 },
      BIG_SERVER:    { PREDATOR: 3, WARRIOR: 3, REBEL: 2 },
      RETRIEVER:     { WARRIOR: 5, TACTICIAN: 3, PERFECTIONIST: 2 },
      TAKEALLRISK:   { ARTIST: 5, REBEL: 4, WARRIOR: 2 },
      GRINDER:       { WARRIOR: 5, PERFECTIONIST: 3 },
      PWR_BASE:      { PREDATOR: 4, WARRIOR: 3 },
      TACT_TEC:      { TACTICIAN: 6, PERFECTIONIST: 3, INTELLECTUAL: 2 },
      NET_SPEC:      { ARTIST: 4, TACTICIAN: 3, PREDATOR: 2 },
      ADPT_TAC:      { TACTICIAN: 5, ARTIST: 3, DREAMER: 2 },
    };
    return LEGACY[player.styleId] ?? {};
  }
  const { rallyCadence, riskProfile, netGame, buildStyle } = p;
  const bias = {};
  // Paciência → WARRIOR / PERFECTIONIST / TACTICIAN
  if (rallyCadence === 'PATIENT')      { bias.WARRIOR = (bias.WARRIOR||0)+4; bias.PERFECTIONIST = (bias.PERFECTIONIST||0)+2; }
  if (rallyCadence === 'MEASURED')     { bias.PERFECTIONIST = (bias.PERFECTIONIST||0)+3; bias.TACTICIAN = (bias.TACTICIAN||0)+3; }
  if (rallyCadence === 'EXPLOSIVE')    { bias.PREDATOR = (bias.PREDATOR||0)+4; bias.REBEL = (bias.REBEL||0)+3; }
  if (rallyCadence === 'EARLY_ATTACK') { bias.PREDATOR = (bias.PREDATOR||0)+3; bias.WARRIOR = (bias.WARRIOR||0)+2; }
  // Risco → REBEL / ARTIST / TACTICIAN
  if (riskProfile === 'ALLOUT')        { bias.ARTIST = (bias.ARTIST||0)+4; bias.REBEL = (bias.REBEL||0)+4; }
  if (riskProfile === 'GAMBLER')       { bias.ARTIST = (bias.ARTIST||0)+2; bias.PREDATOR = (bias.PREDATOR||0)+2; }
  if (riskProfile === 'SAFETY_FIRST')  { bias.PERFECTIONIST = (bias.PERFECTIONIST||0)+4; bias.TACTICIAN = (bias.TACTICIAN||0)+3; }
  if (riskProfile === 'SAFE')          { bias.TACTICIAN = (bias.TACTICIAN||0)+2; bias.WARRIOR = (bias.WARRIOR||0)+2; }
  // Rede → PREDATOR / ARTIST
  if (netGame === 'HUNTER')            { bias.PREDATOR = (bias.PREDATOR||0)+4; bias.ARTIST = (bias.ARTIST||0)+2; }
  if (netGame === 'PROACTIVE')         { bias.TACTICIAN = (bias.TACTICIAN||0)+3; bias.PREDATOR = (bias.PREDATOR||0)+2; }
  // Variado → DREAMER / TACTICIAN
  if (buildStyle === 'VARIED')         { bias.DREAMER = (bias.DREAMER||0)+3; bias.TACTICIAN = (bias.TACTICIAN||0)+2; }
  return bias;
}

// Prefs → persona de imprensa mais provável
function getPersonaBias(player) {
  const p = player.prefs;
  if (!p) {
    const LEGACY = {
      AGG_BASELINER: { CHARISMATIC: 3, CONFRONTATIONAL: 2, SHOWMAN: 2 },
      TAKEALLRISK:   { SHOWMAN: 5, CHARISMATIC: 3, CONFRONTATIONAL: 2 },
      TACT_TEC:      { INTELLECTUAL: 4, DIPLOMATIC: 3, RESERVED: 2 },
      RETRIEVER:     { RESERVED: 3, DIPLOMATIC: 3 },
      GRINDER:       { RESERVED: 3 },
      BIG_SERVER:    { CONFRONTATIONAL: 2, RESERVED: 2 },
      ALL_COURT:     { DIPLOMATIC: 3, CHARISMATIC: 2 },
      NET_SPEC:      { SHOWMAN: 3, CHARISMATIC: 2 },
      PWR_BASE:      { CONFRONTATIONAL: 3, CHARISMATIC: 2 },
    };
    return LEGACY[player.styleId] ?? {};
  }
  const { rallyCadence, riskProfile, netGame } = p;
  const bias = {};
  if (rallyCadence === 'EXPLOSIVE' && riskProfile === 'ALLOUT') { bias.SHOWMAN = (bias.SHOWMAN||0)+5; bias.CONFRONTATIONAL = (bias.CONFRONTATIONAL||0)+3; }
  if (rallyCadence === 'EXPLOSIVE')    { bias.CHARISMATIC = (bias.CHARISMATIC||0)+3; bias.CONFRONTATIONAL = (bias.CONFRONTATIONAL||0)+2; }
  if (rallyCadence === 'PATIENT')      { bias.RESERVED = (bias.RESERVED||0)+3; bias.DIPLOMATIC = (bias.DIPLOMATIC||0)+2; }
  if (riskProfile === 'SAFETY_FIRST')  { bias.RESERVED = (bias.RESERVED||0)+4; }
  if (netGame === 'HUNTER')            { bias.SHOWMAN = (bias.SHOWMAN||0)+3; bias.CHARISMATIC = (bias.CHARISMATIC||0)+2; }
  if (netGame === 'PROACTIVE')         { bias.DIPLOMATIC = (bias.DIPLOMATIC||0)+2; bias.CHARISMATIC = (bias.CHARISMATIC||0)+2; }
  return bias;
}

// Potencial → reputação mais provável
const POTENTIAL_REPUTATION_BIAS = {
  GERACIONAL:      { ICON: 8, PRODIGY: 6, RISING_STAR: 4 },
  LENDA:           { ICON: 5, RISING_STAR: 4, PRODIGY: 3 },
  ELITE:           { RISING_STAR: 5, CONTROVERSIAL: 3, PRODIGY: 3 },
  CAMPEAO:         { RISING_STAR: 3, UNDERDOG: 3, MYSTERIOUS: 2 },
  COMUM:           { UNDERDOG: 5, MYSTERIOUS: 3, RISING_STAR: 2 },
  ABAIXO_DA_MEDIA: { UNDERDOG: 4, MYSTERIOUS: 4 },
};

// Arquétipo → reputação mais provável
const ARCHETYPE_REPUTATION_BIAS = {
  REBEL:        { VILLAIN: 6, CONTROVERSIAL: 5, UNDERDOG: 2 },
  PREDATOR:     { VILLAIN: 4, ICON: 3, CONTROVERSIAL: 2 },
  DREAMER:      { UNDERDOG: 4, RISING_STAR: 3, PRODIGY: 3 },
  WARRIOR:      { UNDERDOG: 5, ICON: 3, RISING_STAR: 2 },
  ARTIST:       { MYSTERIOUS: 3, ICON: 3, CONTROVERSIAL: 2 },
  PERFECTIONIST:{ RISING_STAR: 3, ICON: 3, CONTROVERSIAL: 2 },
  TACTICIAN:    { MYSTERIOUS: 4, VETERAN: 3, RISING_STAR: 2 },
};


// ═══════════════════════════════════════════════════════════════════
// 7. GERAÇÃO — função principal
// ═══════════════════════════════════════════════════════════════════

/**
 * Gera o perfil completo de personalidade off-court de um jogador.
 *
 * @param {object} player — deve ter: potential, styleId, nationality, age,
 *                          firstName (ou name), birthYear
 * @returns {PersonalityProfile}
 */
export function generatePersonality(player) {
  const styleBias    = getArchetypeBias(player);
  const stylePersBias= getPersonaBias(player);
  const potRepBias   = POTENTIAL_REPUTATION_BIAS[player.potential] ?? {};
  const age          = player.age ?? (2025 - (player.birthYear ?? 2005));
  const nameObj      = { firstName: player.firstName ?? player.name ?? 'N', lastName: player.name ?? '' };

  // ── 1. Competitive Archetype ─────────────────────────────────
  const archetypePool = withBias(COMPETITIVE_ARCHETYPE_BASE_POOL, styleBias);
  const archetypeId   = weighted(archetypePool);
  const archetype     = COMPETITIVE_ARCHETYPES[archetypeId];

  // ── 2. Press Persona (influenciado pelo arquétipo) ───────────
  const personaPool = withBias(PRESS_PERSONA_BASE_POOL, {
    ...stylePersBias,
    ...(archetype.pressPersonaBias ?? {}),
  });
  const personaId = weighted(personaPool);

  // ── 3. Reputation (influenciada por potencial + arquétipo) ───
  const repPool = withBias(REPUTATION_BASE_POOL, {
    ...potRepBias,
    ...(ARCHETYPE_REPUTATION_BIAS[archetypeId] ?? {}),
    // Jovens raramente são VETERAN
    ...(age < 25 ? { VETERAN: -10 } : {}),
    // Velhos raramente são PRODIGY
    ...(age > 26 ? { PRODIGY: -8, RISING_STAR: -4 } : {}),
  });
  const reputationId = weighted(repPool);

  // ── 4. Marketability ─────────────────────────────────────────
  const marketScore = calcMarketability(player, personaId, reputationId, archetypeId);
  const marketTier  = getMarketabilityTier(marketScore);

  // ── 5. Backstory ─────────────────────────────────────────────
  // Origem — influenciada pelo arquétipo
  const originPool = BACKSTORY_ORIGINS.map(o => ({
    id: o.id,
    weight: 10 + (o.archetypeBias?.[archetypeId] ?? 0),
    desc: o.desc,
    label: o.label,
  }));
  const originItem = originPool[weighted(originPool.map((o, i) => ({ id: i, weight: o.weight })))];
  const origin = {
    id:    originItem.id,
    label: originItem.label,
    desc:  originItem.desc(nameObj),
  };

  // Motivação — influenciada pelo arquétipo
  const motPool = BACKSTORY_MOTIVATIONS.map(m => ({
    id: m.id,
    weight: 10 + (m.archetypeBias?.[archetypeId] ?? 0),
    desc: m.desc,
    label: m.label,
  }));
  const motItem = motPool[weighted(motPool.map((m, i) => ({ id: i, weight: m.weight })))];
  const motivation = {
    id:    motItem.id,
    label: motItem.label,
    desc:  motItem.desc(nameObj),
  };

  // Background
  const background = pick(BACKSTORY_BACKGROUNDS);
  const backgroundObj = {
    id:    background.id,
    label: background.label,
    desc:  background.desc(nameObj),
  };

  // Evento-chave (semente narrativa para crônicas)
  const keyEvent = pick(KEY_CAREER_EVENTS);

  // ── 6. Montar perfil ─────────────────────────────────────────
  return {
    pressPersona: {
      id:            personaId,
      label:         PRESS_PERSONAS[personaId].label,
      description:   PRESS_PERSONAS[personaId].description,
      mediaRelation: PRESS_PERSONAS[personaId].mediaRelation,
      storyAngles:   PRESS_PERSONAS[personaId].storyAngles,
      interviewTone: PRESS_PERSONAS[personaId].interviewTone,
    },
    competitiveArchetype: {
      id:             archetypeId,
      label:          archetype.label,
      description:    archetype.description,
      coreDriver:     archetype.coreDriver,
      narrativeHook:  archetype.narrativeHook,
      rivalDynamic:   archetype.rivalDynamic,
      crisisResponse: archetype.crisisResponse,
    },
    reputation: {
      id:             reputationId,
      label:          REPUTATIONS[reputationId].label,
      description:    REPUTATIONS[reputationId].description,
      fanBase:        REPUTATIONS[reputationId].fanBase,
      mediaPresence:  REPUTATIONS[reputationId].mediaPresence,
      narrativeRole:  REPUTATIONS[reputationId].narrativeRole,
    },
    backstory: {
      origin,
      motivation,
      background: backgroundObj,
      keyEvent: {
        id:    keyEvent.id,
        label: keyEvent.label,
      },
    },
    marketability: {
      score: marketScore,
      tier:  marketTier,
    },
  };
}


// ═══════════════════════════════════════════════════════════════════
// 8. MIGRAÇÃO — jogadores named existentes
// ═══════════════════════════════════════════════════════════════════

/**
 * Atribui personalidade a um jogador existente que não a possui.
 * Seguro de chamar repetidamente (só gera se ainda não existir).
 *
 * @param {object} player
 * @returns {object} player com player.personality preenchido
 */
export function migratePlayerPersonality(player) {
  if (player.personality) return player;
  player.personality = generatePersonality(player);
  return player;
}


// ═══════════════════════════════════════════════════════════════════
// 9. EVOLUÇÃO DE REPUTAÇÃO
// ─────────────────────────────────────────────────────────────────
// Chamado pelo DevelopmentSystem ou SeasonManager quando
// conquistas relevantes ocorrem.
// ═══════════════════════════════════════════════════════════════════

/**
 * Sugere uma evolução de reputação baseada em conquistas de carreira.
 * Retorna o novo reputationId se houver upgrade, ou null caso contrário.
 *
 * @param {object} player   — player com player.personality
 * @param {object} careerStats — { gs, masters, yearsAsTop10, titles, age }
 * @returns {string|null}   — novo reputationId ou null
 */
export function evaluateReputationEvolution(player, careerStats) {
  if (!player.personality) return null;

  const current   = player.personality.reputation.id;
  const cs        = careerStats ?? {};
  const age       = cs.age ?? player.age ?? 30;
  const gs        = cs.gs ?? 0;
  const top10yrs  = cs.yearsAsTop10 ?? 0;
  const persona   = player.personality.pressPersona.id;

  // PRODIGY / RISING_STAR → ICON (com conquistas suficientes)
  if (['PRODIGY', 'RISING_STAR', 'UNDERDOG'].includes(current)) {
    if (gs >= 2 && top10yrs >= 3) return 'ICON';
    if (gs >= 1 && top10yrs >= 2) return 'ICON';
  }

  // MYSTERIOUS / RESERVED → VETERAN (com idade)
  if (['MYSTERIOUS', 'RESERVED'].includes(current) && age >= 32) {
    return 'VETERAN';
  }

  // CONTROVERSIAL / VILLAIN → manter (são dinâmicos por si só)

  // Qualquer um → VETERAN com idade + resultados
  if (age >= 34 && top10yrs >= 5 && current !== 'ICON') {
    return 'VETERAN';
  }

  return null;
}


// ═══════════════════════════════════════════════════════════════════
// 10. UTILITÁRIOS
// ═══════════════════════════════════════════════════════════════════

/**
 * Retorna string legível com o perfil de personalidade (debug/teste).
 * @param {object} player — com player.personality
 */
export function describePersonality(player) {
  const p = player.personality;
  if (!p) return `${player.name ?? player.id}: sem personalidade gerada`;

  const lines = [
    `── ${player.fullName ?? player.name} (${player.nationality}, ${player.age ?? '?'}a) ──`,
    `  Arquétipo : ${p.competitiveArchetype.label} — "${p.competitiveArchetype.coreDriver}"`,
    `  Imprensa  : ${p.pressPersona.label} (${p.pressPersona.mediaRelation})`,
    `  Reputação : ${p.reputation.label} — ${p.reputation.narrativeRole}`,
    `  Marketab. : ${p.marketability.score}/100 (${p.marketability.tier.label})`,
    `  Origem    : ${p.backstory.origin.label}`,
    `  Motivação : ${p.backstory.motivation.label}`,
    `  Background: ${p.backstory.background.label}`,
    `  KeyEvent  : ${p.backstory.keyEvent.label}`,
  ];

  return lines.join('\n');
}

/**
 * Retorna apenas os campos mais usados por jornalistas e crônicas.
 * Versão compacta para passar ao NewsEngine e ChronicleEngine.
 *
 * @param {object} player
 * @returns {{ archetypeId, personaId, reputationId, marketScore, marketTierLabel,
 *             storyAngles, narrativeHook, interviewTone }}
 */
export function getPersonalityHooks(player) {
  const p = player.personality;
  if (!p) return null;

  return {
    archetypeId:     p.competitiveArchetype.id,
    archetypeLabel:  p.competitiveArchetype.label,
    coreDriver:      p.competitiveArchetype.coreDriver,
    narrativeHook:   p.competitiveArchetype.narrativeHook,
    rivalDynamic:    p.competitiveArchetype.rivalDynamic,
    crisisResponse:  p.competitiveArchetype.crisisResponse,

    personaId:       p.pressPersona.id,
    personaLabel:    p.pressPersona.label,
    interviewTone:   p.pressPersona.interviewTone,
    storyAngles:     p.pressPersona.storyAngles,
    mediaRelation:   p.pressPersona.mediaRelation,

    reputationId:    p.reputation.id,
    reputationLabel: p.reputation.label,
    narrativeRole:   p.reputation.narrativeRole,
    fanBase:         p.reputation.fanBase,

    marketScore:     p.marketability.score,
    marketTier:      p.marketability.tier.id,
    marketTierLabel: p.marketability.tier.label,

    origin:          p.backstory.origin,
    motivation:      p.backstory.motivation,
    keyEvent:        p.backstory.keyEvent,
  };
}

/**
 * Lookup rápido por id para usar em templates de texto.
 */
export const PERSONA_BY_ID    = PRESS_PERSONAS;
export const ARCHETYPE_BY_ID  = COMPETITIVE_ARCHETYPES;
export const REPUTATION_BY_ID = REPUTATIONS;


// ═══════════════════════════════════════════════════════════════════
// ██████╗ ██╗      ██████╗  ██████╗ ██████╗      ██╗
// ██╔══██╗██║     ██╔═══██╗██╔════╝██╔═══██╗    ███║
// ██████╔╝██║     ██║   ██║██║     ██║   ██║     ██║
// ██╔══██╗██║     ██║   ██║██║     ██║   ██║     ██║
// ██████╔╝███████╗╚██████╔╝╚██████╗╚██████╔╝     ██║
// ╚═════╝ ╚══════╝ ╚═════╝  ╚═════╝ ╚═════╝      ╚═╝
// MOTOR DE EVOLUÇÃO DINÂMICA DE PERSONALIDADE
// Chamado uma vez por temporada em ADVANCE_YEAR (step 7.5)
// ═══════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────────────────────────

/** Lê o id de um campo que pode ser string ou objeto { id, ... } */
function _gid(val) {
  if (!val) return null;
  return (typeof val === 'object') ? val.id : val;
}

/** Deep clone simples via JSON (objetos de estado do jogo, sem funções) */
function _clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ─────────────────────────────────────────────────────────────────
// TABELAS DE LABELS (para publicNarrative e careerMoments)
// ─────────────────────────────────────────────────────────────────

const MOOD_LABELS = {
  HUNGRY:        'Faminto',         CONFIDENT:     'Confiante',
  GALVANIZED:    'Galvanizado',     DOMINANT:      'Dominante',
  AT_PEAK:       'No Auge',         LEGACY_AWARE:  'Consciente do Legado',
  COMEBACK:      'Retorno',         VINDICATED:    'Reivindicado',
  SEARCHING:     'Em Busca',        REFLECTIVE:    'Reflexivo',
  REBUILDING:    'Reconstruindo',   TESTING:       'Testando',
  INTROSPECTIVE: 'Introspectivo',   OVERWHELMED:   'Sobrecarregado',
  FRUSTRATED:    'Frustrado',       BITTER:        'Amargo',
  OBSESSED:      'Obcecado',        RESISTANT:     'Resistente',
  DESTABILIZED:  'Desestabilizado', ISOLATED:      'Isolado',
  BURNED_OUT:    'Esgotado',        CRISIS:        'Em Crise',
  VULNERABLE:    'Vulnerável',      FAREWELL_TOUR: 'Tour de Despedida',
  HUNGRY_AGAIN:  'Faminto de Novo',
};

const REP_LABELS = {
  ICON: 'Ícone', VILLAIN: 'Vilão', UNDERDOG: 'Herói Improvável',
  PRODIGY: 'Prodígio', MYSTERIOUS: 'Misterioso', CONTROVERSIAL: 'Polêmico',
  RISING_STAR: 'Estrela em Ascensão', VETERAN: 'Veterano Respeitado',
};

// Reputações imunes a downgrade (exceto para VETERAN tardio)
const ICON_PROTECTED = new Set(['ICON']);

// ─────────────────────────────────────────────────────────────────
// 1. _ensureEvolutionFields — adiciona campos novos sem quebrar
//    jogadores que já têm personality gerada pelo sistema antigo
// ─────────────────────────────────────────────────────────────────
function _ensureEvolutionFields(p, year) {
  if (!p.personality) return p; // migratePlayerPersonality já deve ter rodado antes

  const pers = p.personality;

  if (!pers.currentState) {
    pers.currentState = {
      mood:            'HUNGRY',
      pressureLevel:   20,
      moodSince:       year,
      publicNarrative: '',
    };
  }

  if (!pers._driftAccumulator) {
    pers._driftAccumulator = {
      pressPersona:         {},
      competitiveArchetype: {},
      lastShift:            { pressPersona: 0, archetype: 0 },
    };
  }

  if (!Array.isArray(pers.careerMoments)) pers.careerMoments = [];

  if (pers.marketingBonus == null) pers.marketingBonus = 0;

  // Garante marketability como objeto com history
  if (!pers.marketability || typeof pers.marketability !== 'object') {
    pers.marketability = { score: 30, tier: getMarketabilityTier(30), history: [] };
  } else {
    if (pers.marketability.score == null) pers.marketability.score = 30;
    if (!Array.isArray(pers.marketability.history)) pers.marketability.history = [];
    if (!pers.marketability.tier) pers.marketability.tier = getMarketabilityTier(pers.marketability.score);
  }

  // Garante que pressPersona e competitiveArchetype são strings (ids)
  // O sistema antigo guarda objetos; o novo trabalha com ids diretamente
  // Ambos os formatos continuam funcionando via _gid()

  return p;
}

// ─────────────────────────────────────────────────────────────────
// 2. _computeCareerCtx — extrai tudo que precisamos do player
//    sem depender de campos externos
// ─────────────────────────────────────────────────────────────────
function _computeCareerCtx(p, ctx) {
  const hist    = Array.isArray(p._seasonHistory) ? p._seasonHistory : [];
  const year    = ctx.year ?? 2025;

  // Carreira
  const grandSlams  = p._careerGrandSlams ?? 0;
  const totalTitles = p._careerTitles ?? 0;

  // Masters (contando títulos de categorias específicas no histórico)
  const masters = hist.filter(h => h.titleWon === 'MASTERS' || h.titleWon === 'MASTERS_1000').length;

  // Declínio
  const inDecline       = !!(hist.length && hist[hist.length - 1]?.inDecline);
  const declineSeason   = hist.findIndex(h => h.inDecline);
  const declineYears    = inDecline
    ? hist.slice(declineSeason).filter(h => h.inDecline).length
    : 0;

  // Drought (anos consecutivos sem título, voltando do fim do histórico)
  let droughtYears = 0;
  for (let i = hist.length - 1; i >= 0; i--) {
    if (!hist[i].titleWon) droughtYears++;
    else break;
  }
  // Se ganhou título este ano, drought é 0
  if (ctx.titleWon) droughtYears = 0;

  // Top-5 consecutivo
  const rankHist = Array.isArray(p._rankHistory) ? p._rankHistory : [];
  let top5Consecutive = 0;
  for (let i = rankHist.length - 1; i >= 0; i--) {
    if ((rankHist[i].rank ?? 999) <= 5) top5Consecutive++;
    else break;
  }

  // Top-10 consecutivo
  let top10Consecutive = 0;
  for (let i = rankHist.length - 1; i >= 0; i--) {
    if ((rankHist[i].rank ?? 999) <= 10) top10Consecutive++;
    else break;
  }

  // Lesões
  const injuries = Array.isArray(p.injuryHistory) ? p.injuryHistory : [];
  const severeInjuries = injuries.filter(i => (i.grade ?? 0) >= 3);
  const severeThisSeason = severeInjuries.filter(i => i.season === year - 1 || i.season === year);
  const isFirstSevere = severeThisSeason.length > 0 && severeInjuries.length === 1;

  // Retorno de lesão (estava lesionado no último ano, agora tem resultado positivo)
  const lastSeason      = hist[hist.length - 1];
  const prevSeason      = hist[hist.length - 2];
  const hadSevereRecent = prevSeason?.hadGradeInjury ?? prevSeason?.injuries?.some(i => (i.grade ?? 0) >= 3);
  const goodReturn      = hadSevereRecent && (lastSeason?.wins ?? 0) > 0;

  // Coach
  const bondScore      = p.coach?.bondScore ?? null;
  const bondHistHigh   = bondScore != null && bondScore >= 75;
  const coachChangedThisSeason = ctx.seasonMetrics?.coachChanged ?? false;

  // Rivalidades — acha as do jogador
  const rivalries = [];
  if (ctx.rivalrySystem?.rivalries) {
    for (const r of Object.values(ctx.rivalrySystem.rivalries)) {
      if (r.p1Id === p.id || r.p2Id === p.id) {
        const isP1     = r.p1Id === p.id;
        const myWins   = isP1 ? (r.p1Wins ?? 0) : (r.p2Wins ?? 0);
        const theirWins= isP1 ? (r.p2Wins ?? 0) : (r.p1Wins ?? 0);
        const total    = r.totalMatches ?? (myWins + theirWins);
        const winRate  = total > 0 ? myWins / total : 0.5;
        rivalries.push({ ...r, myWins, theirWins, total, winRate });
      }
    }
  }

  const grudgeRival    = rivalries.find(r =>
    (r.type === 'GRUDGE' || r.type === 'FINALS_CURSE') && r.winRate < 0.35 && r.total >= 6);
  const legendaryRival = rivalries.find(r =>
    r.status === 'LEGENDARY' && r.total >= 10);
  const dominatingRival= rivalries.find(r =>
    r.winRate > 0.65 && r.total >= 8);

  // Temporada atual
  const sm           = ctx.seasonMetrics ?? {};
  const titleWon     = ctx.titleWon ?? null;
  const slamThisSeason = (titleWon === 'SLAM' || titleWon === 'GRAND_SLAM');
  const titlesThisSeason = sm.titles ?? (titleWon ? 1 : 0);
  const titleWhileInjured = !!(lastSeason?.titleWhileInjured);
  const enteredTop20 = ctx.currentRank <= 20 && (ctx.prevRank ?? 999) > 20;
  const lostTop20    = ctx.currentRank > 20  && (ctx.prevRank ?? 999) <= 20;

  return {
    grandSlams, totalTitles, masters, inDecline, declineYears,
    droughtYears, top5Consecutive, top10Consecutive,
    severeInjuries, severeThisSeason, isFirstSevere, goodReturn,
    bondScore, bondHistHigh, coachChangedThisSeason,
    rivalries, grudgeRival, legendaryRival, dominatingRival,
    titleWon, slamThisSeason, titlesThisSeason, titleWhileInjured,
    enteredTop20, lostTop20, year,
    currentRank: ctx.currentRank ?? 999,
    prevRank:    ctx.prevRank    ?? 999,
  };
}

// ─────────────────────────────────────────────────────────────────
// 3. evaluateMoodChange — determina o mood da temporada
//    Os gatilhos são aplicados em ordem: o último aplicável vence.
//    pressureLevel é acumulado (delta).
// ─────────────────────────────────────────────────────────────────
function evaluateMoodChange(p, cc) {
  const pers      = p.personality;
  const personaId = _gid(pers.pressPersona);
  const archId    = _gid(pers.competitiveArchetype);
  const prev      = pers.currentState;
  const curMood   = prev?.mood ?? 'HUNGRY';
  let   mood      = curMood;
  let   moodSince = prev?.moodSince ?? cc.year;
  let   pressure  = prev?.pressureLevel ?? 20;
  let   pDelta    = 0;

  // ── Gatilhos de lesão (alta prioridade negativa) ──────────────
  if (cc.severeThisSeason.length > 0 && cc.isFirstSevere) {
    mood    = 'VULNERABLE';
    pDelta += 25;
  }

  if (cc.goodReturn) {
    mood    = 'COMEBACK';
    pDelta -= 15;
  }

  if (cc.severeInjuries.length >= 2) {
    pDelta += 10; // base permanente por historial de lesões graves
  }

  // ── Gatilhos de fracasso ──────────────────────────────────────
  if (cc.lostTop20) {
    mood    = cc.currentRank > 50 ? 'REBUILDING' : 'SEARCHING';
    pDelta += 30;
  }

  if ((cc.prevRank ?? 999) < 999 && cc.currentRank > cc.prevRank + 15) {
    mood    = 'SEARCHING';
    pDelta += 20;
  }

  if (cc.droughtYears === 1) {
    mood    = 'SEARCHING';
    pDelta += 15;
  } else if (cc.droughtYears === 2) {
    mood    = 'FRUSTRATED';
    pDelta += 25;
  } else if (cc.droughtYears >= 3) {
    mood    = (archId === 'PERFECTIONIST') ? 'CRISIS'
            : (archId === 'REBEL' || archId === 'WARRIOR') ? 'BITTER'
            : 'FRUSTRATED';
    pDelta += 40;
  }

  // ── Gatilhos de relacionamento com técnico ────────────────────
  if (cc.bondScore != null && cc.bondScore < 20) {
    mood = (personaId === 'RESERVED' || personaId === 'INTELLECTUAL') ? 'ISOLATED'
         : (personaId === 'CONFRONTATIONAL') ? 'BITTER'
         : mood; // diplomático fica no mood atual mas com pressão
    pDelta += 20;
  }

  if (cc.coachChangedThisSeason) {
    mood    = mood === 'CRISIS' ? 'REBUILDING' : 'TESTING';
    pDelta += 10;
  }

  if (cc.bondHistHigh) {
    pDelta -= 10;
  }

  // ── Gatilhos de rivalidade ────────────────────────────────────
  if (cc.grudgeRival) {
    mood    = 'OBSESSED';
    pDelta += 20;
  }

  if (cc.legendaryRival) {
    pDelta -= 5; // propósito
  }

  if (cc.dominatingRival && !cc.grudgeRival) {
    mood = (mood === 'OBSESSED') ? mood : 'CONFIDENT';
    pDelta -= 10;
  }

  // ── Gatilhos de fase de carreira ─────────────────────────────
  if (p.age < 21 && cc.enteredTop20) {
    mood = (personaId === 'RESERVED' || personaId === 'INTELLECTUAL') ? 'OVERWHELMED'
         : (personaId === 'SHOWMAN'  || personaId === 'CHARISMATIC')  ? 'GALVANIZED'
         : 'OVERWHELMED';
    pDelta += 20;
  }

  if (cc.top5Consecutive >= 2 && cc.droughtYears === 0) {
    mood    = 'AT_PEAK';
    pDelta -= 20;
  }

  if (cc.inDecline && cc.declineYears === 1) {
    mood = archId === 'WARRIOR'       ? 'RESISTANT'
         : archId === 'PREDATOR'      ? 'CRISIS'
         : archId === 'ARTIST'        ? 'INTROSPECTIVE'
         : archId === 'PERFECTIONIST' ? 'REBUILDING'
         : archId === 'DREAMER'       ? 'SEARCHING'
         : archId === 'TACTICIAN'     ? 'REBUILDING'
         : archId === 'REBEL'         ? 'RESISTANT'
         : 'SEARCHING';
    pDelta += 20;
  }

  if (p.age >= 34 && cc.inDecline && cc.declineYears >= 2) {
    mood = (archId === 'WARRIOR' || archId === 'PREDATOR' || archId === 'REBEL')
         ? 'RESISTANT'
         : 'FAREWELL_TOUR';
    pDelta -= 10;
  }

  // ── Gatilhos de conquista (maior prioridade — sobrescrevem tudo) ──
  if (cc.titleWon) {
    if (cc.titleWhileInjured) {
      mood    = (archId === 'WARRIOR' || archId === 'PREDATOR') ? 'VINDICATED' : 'GALVANIZED';
      pDelta -= 12;
    }

    if (cc.slamThisSeason && cc.grandSlams >= 3) {
      mood    = (p.age < 30) ? 'DOMINANT' : 'LEGACY_AWARE';
      pDelta -= 25;
    } else if (cc.slamThisSeason && cc.grandSlams === 1) {
      // Primeiro Slam — maior evento da carreira
      mood    = (cc.droughtYears > 0 || p.age > 24) ? 'GALVANIZED' : 'AT_PEAK';
      pDelta -= 20;
    } else if (cc.titlesThisSeason >= 3 && cc.slamThisSeason) {
      mood    = 'DOMINANT';
      pDelta -= 30;
    } else if (cc.droughtYears === 0 && cc.top10Consecutive >= 2) {
      mood    = 'CONFIDENT';
      pDelta -= 10;
    } else if (mood === 'SEARCHING' || mood === 'FRUSTRATED' || mood === 'BITTER') {
      mood    = 'HUNGRY_AGAIN';
      pDelta -= 15;
    } else {
      mood    = 'GALVANIZED';
      pDelta -= 10;
    }
  }

  // ── Clamp pressureLevel ──────────────────────────────────────
  const newPressure = clamp(pressure + pDelta, 0, 100);

  // Atualiza moodSince
  if (mood !== curMood) moodSince = cc.year;

  return { mood, pressureLevel: newPressure, moodSince };
}

// ─────────────────────────────────────────────────────────────────
// 4. evaluateReputationEvolution — saltos por conquistas objetivas
// ─────────────────────────────────────────────────────────────────
function _evalReputation(p, cc) {
  const pers     = p.personality;
  const curRepId = _gid(pers.reputation);
  const personaId= _gid(pers.pressPersona);
  const archId   = _gid(pers.competitiveArchetype);
  const pressure = pers.currentState?.pressureLevel ?? 20;
  const top3yrs  = (p._rankHistory ?? []).filter(h => (h.rank ?? 999) <= 3).length;

  // ICON é protegido — não desce por resultados ruins
  if (ICON_PROTECTED.has(curRepId)) {
    // Downgrade narrativo tardio: ICON → VETERAN (mas mantém label ICON no narrativo)
    if (p.age >= 35 && cc.currentRank > 20 && !cc.slamThisSeason) {
      return 'ICON'; // Mantém ICON, cronista trata narrativamente
    }
    return curRepId;
  }

  // PRODIGY — só jogadores jovens com potencial alto
  if (p.age < 22 && (cc.enteredTop20 || cc.titleWon) &&
      ['LENDA', 'GERACIONAL', 'ELITE'].includes(p.potential)) {
    return 'PRODIGY';
  }

  // RISING_STAR — jovem dominante sem Slam ainda
  if (p.age < 26 && cc.top10Consecutive >= 2 && cc.grandSlams === 0) {
    return 'RISING_STAR';
  }

  // ICON — por conquistas irrefutáveis
  if (cc.grandSlams >= 1 ||
      (cc.masters >= 5 && top3yrs >= 3) ||
      top3yrs >= 6) {
    return 'ICON';
  }

  // UNDERDOG — potencial baixo que surpreende
  if (!['LENDA', 'GERACIONAL'].includes(p.potential) &&
      (cc.grandSlams >= 1 || cc.goodReturn)) {
    return 'UNDERDOG';
  }

  // VILLAIN — confrontacional por muito tempo + pressão alta
  if ((archId === 'REBEL' || archId === 'PREDATOR') &&
      personaId === 'CONFRONTATIONAL' && pressure >= 65 &&
      (pers._driftAccumulator?.lastShift?.pressPersona ?? 0) > 0) {
    return 'VILLAIN';
  }

  // CONTROVERSIAL — confrontacional sem chegar a VILLAIN
  if (personaId === 'CONFRONTATIONAL' && curRepId !== 'VILLAIN') {
    if (cc.droughtYears >= 2 || pressure >= 50) return 'CONTROVERSIAL';
  }

  // MYSTERIOUS — reservado por muito tempo
  if ((personaId === 'RESERVED' || personaId === 'ENIGMATIC') &&
      p.age >= 25) {
    return 'MYSTERIOUS';
  }

  // VETERAN — veterano respeitado
  if (p.age >= 31 && cc.currentRank <= 30) {
    return 'VETERAN';
  }

  return curRepId; // sem mudança
}

// ─────────────────────────────────────────────────────────────────
// 5. recalcMarketability — recalcula do zero todo ano
// ─────────────────────────────────────────────────────────────────
function recalcMarketability(p, cc, mood, repId) {
  const pers = p.personality;

  // 1. Base por potencial
  const BASE = { GERACIONAL: 25, LENDA: 18, ELITE: 10, CAMPEAO: 6, COMUM: 3 };
  let score = BASE[p.potential] ?? 3;

  // 2. Conquistas acumuladas
  score += Math.min(25, cc.grandSlams * 8);
  score += Math.min(12, cc.masters * 2);
  score += Math.min(5,  cc.totalTitles * 0.3);

  // 3. Ranking atual
  const r = cc.currentRank;
  score += r === 1 ? 18 : r <= 4 ? 14 : r <= 10 ? 10 : r <= 20 ? 6 : r <= 50 ? 2 : 0;

  // 4. Press persona
  const personaBonus = {
    SHOWMAN: 12, CHARISMATIC: 10, CONFRONTATIONAL: 6,
    DIPLOMATIC: 3, INTELLECTUAL: 2, ENIGMATIC: 3, RESERVED: -3,
  };
  score += personaBonus[_gid(pers.pressPersona)] ?? 0;

  // 5. Multiplicador de reputação
  const repMult = {
    ICON: 1.40, PRODIGY: 1.20, RISING_STAR: 1.15, VILLAIN: 1.12,
    UNDERDOG: 1.10, CONTROVERSIAL: 1.05, VETERAN: 0.95, MYSTERIOUS: 0.90,
  };
  score *= repMult[repId] ?? 1.0;

  // 6. Bônus de mood
  const moodBonus = {
    AT_PEAK: 5, GALVANIZED: 5, DOMINANT: 3, CONFIDENT: 3,
    COMEBACK: 8, VINDICATED: 8, FAREWELL_TOUR: 6, VULNERABLE: 4,
    FRUSTRATED: -3, OBSESSED: -3, BURNED_OUT: -8, CRISIS: -6, ISOLATED: -6,
  };
  score += moodBonus[mood] ?? 0;

  // 7. Bônus de nacionalidade
  const natBonus = {
    USA: 10, BRA: 10, GBR: 10, FRA: 10, CHN: 10, ESP: 10,
    AUS: 7, ARG: 7, ITA: 7, GER: 7,
  };
  score += natBonus[p.nationality] ?? 2;

  // 8. Hook de marketing externo
  score += pers.marketingBonus ?? 0;

  const finalScore = clamp(Math.round(score), 1, 100);
  const prevScore  = pers.marketability?.score ?? 0;
  const delta      = finalScore - prevScore;

  // Razão principal do valor deste ano
  let topReason = 'ranking';
  if (cc.grandSlams >= 1)   topReason = 'títulos de Grand Slam';
  else if (cc.titleWon)     topReason = 'título conquistado';
  else if (r <= 5)          topReason = 'ranking de elite';
  else if (delta < -5)      topReason = 'queda de performance';

  return {
    score:   finalScore,
    tier:    getMarketabilityTier(finalScore),
    history: [
      ...(pers.marketability?.history ?? []),
      { year: cc.year, score: finalScore, delta, topReason },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────
// 6. accumulateDrift — soma pontos no acumulador por todos os
//    gatilhos do ano. Não aplica mudança — só acumula.
// ─────────────────────────────────────────────────────────────────
function accumulateDrift(pers, cc, mood, p) {
  const acc     = _clone(pers._driftAccumulator);
  const pa      = acc.pressPersona;
  const aa      = acc.competitiveArchetype;
  const archId  = _gid(pers.competitiveArchetype);

  function addP(id, pts) { pa[id] = (pa[id] ?? 0) + pts; }
  function addA(id, pts) { aa[id] = (aa[id] ?? 0) + pts; }

  // Conquistas (seção 5.1)
  if (cc.slamThisSeason) {
    if (cc.grandSlams === 1) {
      addP('CHARISMATIC', 6); addP('SHOWMAN', 4);
      if (archId === 'PERFECTIONIST') addP('RESERVED', 4);
    }
    if (cc.grandSlams >= 3) {
      addP('DIPLOMATIC', 5); addP('RESERVED', 3);
      if (archId === 'PREDATOR') addP('CONFRONTATIONAL', 5);
    }
    if (cc.grandSlams >= 7) {
      if (archId === 'PREDATOR') addP('CONFRONTATIONAL', 8);
      if (archId === 'ARTIST')   addP('INTELLECTUAL',    8);
      if (archId === 'DREAMER')  addP('CHARISMATIC',     6);
    }
  }

  if (cc.titlesThisSeason >= 3 && cc.slamThisSeason) {
    addP('SHOWMAN', 5); addP('CONFRONTATIONAL', 4);
  }

  if (cc.titleWhileInjured) {
    addP('CHARISMATIC', 8);
    if (archId === 'PERFECTIONIST') addP('SEARCHING', 5);
  }

  // Fracassos (seção 5.2)
  if (cc.droughtYears === 1) addP('RESERVED', 4);
  if (cc.droughtYears === 2) {
    const dir = (archId === 'REBEL' || archId === 'WARRIOR') ? 'CONFRONTATIONAL' : 'RESERVED';
    addP(dir, 6);
  }
  if (cc.droughtYears >= 3) {
    addP('CONFRONTATIONAL', 6); addP('RESERVED', 4);
  }
  if (cc.lostTop20) {
    addP('RESERVED', 8); addP('CONFRONTATIONAL', 6);
  }

  // Lesões
  if (cc.isFirstSevere) addP('RESERVED', 6);
  if (cc.goodReturn)    addP('CHARISMATIC', 5);
  if (cc.severeInjuries.length >= 2) addP('RESERVED', 4);

  // Técnico
  if (cc.bondScore != null && cc.bondScore < 20) {
    addP('CONFRONTATIONAL', 6);
    if (archId === 'PERFECTIONIST') addP('RESERVED', 5);
  }
  if (cc.bondHistHigh) {
    addP('DIPLOMATIC', 3);
    if (archId === 'DREAMER') addP('CHARISMATIC', 4);
  }

  // Rivalidade
  if (cc.grudgeRival)     addP('CONFRONTATIONAL', 8);
  if (cc.legendaryRival)  {
    if (archId === 'PREDATOR') addP('CONFRONTATIONAL', 5);
    if (archId === 'WARRIOR')  addP('CHARISMATIC',     4);
  }
  if (cc.dominatingRival) {
    if (archId === 'PREDATOR') addP('CONFRONTATIONAL', 4);
    if (archId === 'DIPLOMATIC') addP('DIPLOMATIC', 3);
  }

  // Fase de carreira
  if (p.age < 21 && cc.enteredTop20) {
    const dir = (_gid(pers.pressPersona) === 'SHOWMAN') ? 'SHOWMAN' : 'RESERVED';
    addP(dir, 5);
  }
  if (cc.inDecline && cc.declineYears === 1) {
    addP('DIPLOMATIC', 4); addP('INTELLECTUAL', 4);
  }
  if (p.age >= 34 && cc.inDecline && cc.declineYears >= 2) {
    addP('CHARISMATIC', 6); addP('DIPLOMATIC', 4);
  }

  // Garante que nenhum acumulador vai negativo
  for (const k of Object.keys(pa)) if (pa[k] < 0) pa[k] = 0;
  for (const k of Object.keys(aa)) if (aa[k] < 0) aa[k] = 0;

  return acc;
}

// ─────────────────────────────────────────────────────────────────
// 7. checkDriftThresholds — verifica se uma persona mudou
//    Retorna { dim, from, to, cause } ou null
// ─────────────────────────────────────────────────────────────────
function checkDriftThresholds(pers, acc, cc) {
  const PERSONA_THRESHOLD  = 30;
  const ARCHETYPE_THRESHOLD= 50;
  const year = cc.year;

  // ── Verifica pressPersona ─────────────────────────────────────
  const curPersonaId = _gid(pers.pressPersona);
  const paAcc        = acc.pressPersona;
  const lastPShift   = acc.lastShift?.pressPersona ?? 0;

  if (year - lastPShift >= 2) { // cooldown de 2 temporadas
    const topPersona = Object.entries(paAcc)
      .filter(([id]) => id !== curPersonaId)
      .sort((a, b) => b[1] - a[1])[0];

    if (topPersona && topPersona[1] >= PERSONA_THRESHOLD) {
      const to   = topPersona[0];
      const from = curPersonaId;

      // Proteções de coerência
      const blocked =
        (from === 'SHOWMAN' && to === 'RESERVED' && (year - lastPShift) < 5) ||
        (from === 'CHARISMATIC' && to === 'RESERVED' && !cc.isFirstSevere && cc.droughtYears < 2) ||
        (from === 'CONFRONTATIONAL' && to === 'DIPLOMATIC' && (year - lastPShift) < 4);

      if (!blocked && PRESS_PERSONAS[to]) {
        return {
          dim:   'pressPersona',
          from,
          to,
          cause: _buildShiftCause(from, to, cc),
        };
      }
    }
  }

  return null;
}

function _buildShiftCause(from, to, cc) {
  if (cc.grandSlams >= 1 && to === 'CHARISMATIC') return 'O Grand Slam abriu algo que estava fechado';
  if (cc.droughtYears >= 3 && to === 'CONFRONTATIONAL') return `Três temporadas sem título. A paciência acabou`;
  if (cc.goodReturn && to === 'CHARISMATIC') return 'O retorno mudou mais do que o ranking';
  if (cc.inDecline && (to === 'DIPLOMATIC' || to === 'INTELLECTUAL')) return 'O declínio trouxe perspectiva';
  if (cc.bondScore != null && cc.bondScore < 20) return 'O que aconteceu nos bastidores ficou marcado';
  return `A deriva de temporadas acumuladas mudou a persona de ${from} para ${to}`;
}

// ─────────────────────────────────────────────────────────────────
// 8. registerCareerMoments — documenta o que mudou este ano
// ─────────────────────────────────────────────────────────────────
function registerCareerMoments(pers, cc, changes, p) {
  const moments  = [...(pers.careerMoments ?? [])];
  const year     = cc.year;
  const typesThisYear = new Set(moments.filter(m => m.year === year).map(m => m.type));

  function add(type, title, desc, extra = {}) {
    if (typesThisYear.has(type)) return;
    typesThisYear.add(type);
    moments.push({
      year, type, title, desc,
      moodBefore:   changes.moodBefore,
      moodAfter:    changes.moodAfter,
      repBefore:    changes.repBefore,
      repAfter:     changes.repAfter,
      marketBefore: changes.marketBefore,
      marketAfter:  changes.marketAfter,
      ...extra,
    });
  }

  const name = p.firstName ?? p.name ?? 'Ele';

  // Conquistas
  if (cc.slamThisSeason && cc.grandSlams === 1) {
    add('FIRST_SLAM', 'O Primeiro Grand Slam',
      `${name} cruzou a linha. O circuito nunca mais vai olhar para ele da mesma forma.`);
  }

  if (cc.titleWhileInjured) {
    add('TITLE_WHILE_INJURED', 'Título Apesar de Tudo',
      `Ganhou lesionado. O circuito não esquece.`);
  }

  // Droughts
  if (cc.droughtYears >= 3 && !cc.titleWon) {
    add('DROUGHT_START', 'O Silêncio dos Títulos',
      `Três temporadas sem título. A pergunta que ninguém quer fazer ainda: vai conseguir?`);
  }

  if (cc.titleWon && changes.droughtBroken) {
    add('DROUGHT_END', 'O Fim do Jejum',
      `${name} voltou. O circuito esperava — e agora sabe que ainda não acabou.`);
  }

  // Lesões
  if (cc.isFirstSevere) {
    add('INJURY_TRANSFORMS', 'A Lesão que Testou Tudo',
      `Fora das quadras. O circuito espera. A torcida torce.`);
  }

  if (cc.goodReturn && !cc.isFirstSevere) {
    add('COMEBACK', 'O Retorno',
      `${name} voltou de algo que parecia encerrado. O circuito prestou atenção.`);
  }

  // Fase de carreira
  if (cc.inDecline && cc.declineYears === 1) {
    add('DECLINE_START', 'O Jogo Começa a Ser Diferente',
      `O momento em que o circuito percebe que algo mudou — ele talvez ainda não.`);
  }

  if (changes.moodAfter === 'FAREWELL_TOUR' && changes.moodBefore !== 'FAREWELL_TOUR') {
    add('FAREWELL', 'A Tour de Despedida',
      `Cada partida agora carrega um peso diferente — para ele e para quem assiste.`);
  }

  // Identidade
  if (changes.shiftResult) {
    const sr = changes.shiftResult;
    add('PERSONA_SHIFT', 'A Persona Mudou',
      sr.cause,
      { dimChanged: sr.dim, from: sr.from, to: sr.to, cause: sr.cause });
  }

  if (changes.repBefore !== changes.repAfter) {
    const newLabel = REP_LABELS[changes.repAfter] ?? changes.repAfter;
    add('REPUTATION_CHANGE', `Passa a Ser Visto Como: ${newLabel}`,
      `A reputação evoluiu de ${changes.repBefore} para ${changes.repAfter}.`);
  }

  if (changes.moodAfter === 'CRISIS' && changes.moodBefore !== 'CRISIS') {
    add('MOOD_CRISIS', 'Crise',
      `${name} atravessa o momento mais difícil da carreira.`);
  }

  // Coach ruptura
  if (cc.bondScore != null && cc.bondScore < 15) {
    add('COACH_RUPTURE', 'A Ruptura',
      `O que aconteceu entre ${name} e o técnico ficará nos bastidores.`);
  }

  // Rivalidade lendária
  if (cc.legendaryRival) {
    add('RIVALRY_IMPACT', 'A Rivalidade que o Circuito Precisava',
      `Um duelo que vai para os livros.`);
  }

  // Pico de marketability
  const hist = pers.marketability?.history ?? [];
  const prev = hist.slice(0, -1); // sem o atual (ainda não salvo)
  const peak = prev.length ? Math.max(...prev.map(h => h.score)) : 0;
  if (changes.marketAfter > peak && changes.marketAfter >= 70) {
    add('MARKET_PEAK', 'Auge de Visibilidade',
      `Marketability em ${changes.marketAfter} — maior valor já registrado.`);
  }

  return moments;
}

// ─────────────────────────────────────────────────────────────────
// 9. updatePublicNarrative — 1-2 frases para a mídia
// ─────────────────────────────────────────────────────────────────
function updatePublicNarrative(mood, repId, cc, name) {
  const n = name ?? 'Ele';

  const byMoodRep = {
    'DOMINANT+ICON':        `Ninguém tem resposta. ${n} sabe disso.`,
    'LEGACY_AWARE+ICON':    `Cada frase carrega peso histórico. ${n} fala com quem já chegou lá.`,
    'AT_PEAK+ICON':         `Isso é o melhor que já vimos de ${n}. E pode melhorar.`,
    'GALVANIZED+PRODIGY':   `O próximo grande? O circuito ainda não tem certeza — mas suspeita.`,
    'OVERWHELMED+PRODIGY':  `${n} chegou cedo demais ou na hora certa? O circuito observa.`,
    'COMEBACK+any':         `${n} voltou. E o circuito lembrou por que sente falta.`,
    'FAREWELL_TOUR+any':    `Cada partida agora carrega um peso diferente.`,
    'CRISIS+VILLAIN':       `Fora e dentro de quadra, tudo parece fora de controle.`,
    'BITTER+VILLAIN':       `${n} não esconde o que sente. O circuito ouve — e se divide.`,
    'SEARCHING+any':        `O que está acontecendo com ${n}?`,
    'FRUSTRATED+any':       `${n} tem as respostas? O circuito está começando a duvidar.`,
    'OBSESSED+any':         `Há um adversário que mora na cabeça de ${n}.`,
    'VULNERABLE+any':       `Antes do atleta, existe o ser humano. O circuito viu isso hoje.`,
    'ISOLATED+any':         `${n} sumiu da mídia. As fontes falam em pausa longa.`,
    'BURNED_OUT+any':       `O esgotamento não é mais segredo.`,
    'RESISTANT+VETERAN':    `${n} ainda está aqui. O circuito não sabe o que fazer com isso.`,
    'REBUILDING+any':       `${n} está construindo algo. Ninguém sabe ainda o quê.`,
    'VINDICATED+any':       `${n} ganhou depois que duvidaram. Não esconde a satisfação.`,
    'HUNGRY_AGAIN+any':     `${n} voltou a ter fome. O circuito lembra o que isso significa.`,
    'CONFIDENT+any':        `${n} está assertivo, generoso, celebra adversários. Tudo certo.`,
    'DOMINANT+any':         `Ninguém sabe como parar ${n} agora.`,
  };

  // Tenta chave exata primeiro, depois mood+any
  const key1 = `${mood}+${repId}`;
  const key2 = `${mood}+any`;
  return byMoodRep[key1] ?? byMoodRep[key2] ?? `${n} segue sua temporada.`;
}

// ═══════════════════════════════════════════════════════════════════
// EXPORT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

/**
 * processPersonalityEvolution(player, ctx)
 *
 * Roda uma vez por temporada (ADVANCE_YEAR step 7.5).
 * Retorna uma cópia do jogador com personality totalmente atualizada.
 *
 * @param {object} player
 * @param {object} ctx  { currentRank, prevRank, titleWon, seasonMetrics, year, rivalrySystem }
 * @returns {object} player atualizado (sem mutação do original)
 */
export function processPersonalityEvolution(player, ctx) {
  // 0. Clone — nunca mutar o original
  let p = _clone(player);

  // 1. Garante personality base (sistema antigo)
  if (!p.personality) p = migratePlayerPersonality(p);

  // 2. Garante campos novos do motor
  p = _ensureEvolutionFields(p, ctx.year);

  const pers = p.personality;

  // 3. Computa contexto de carreira a partir do estado do jogador
  const cc = _computeCareerCtx(p, ctx);

  // 4. Mood + pressureLevel
  const moodResult = evaluateMoodChange(p, cc);
  const moodBefore = pers.currentState.mood;
  pers.currentState.mood          = moodResult.mood;
  pers.currentState.pressureLevel = moodResult.pressureLevel;
  pers.currentState.moodSince     = moodResult.moodSince;

  // 5. Reputação
  const repBefore = _gid(pers.reputation);
  const newRepId  = _evalReputation(p, cc);
  if (newRepId !== repBefore && REPUTATIONS[newRepId]) {
    pers.reputation = {
      ...REPUTATIONS[newRepId],
      id: newRepId,
    };
  }
  const repAfter = _gid(pers.reputation);

  // 6. Marketability
  const marketBefore  = pers.marketability.score;
  const newMkt        = recalcMarketability(p, cc, moodResult.mood, repAfter);
  pers.marketability  = newMkt;
  const marketAfter   = newMkt.score;

  // 7. Drift acumulado
  const newAcc = accumulateDrift(pers, cc, moodResult.mood, p);

  // 8. Verifica shift de persona
  const shiftResult = checkDriftThresholds(pers, newAcc, cc);
  if (shiftResult && PRESS_PERSONAS[shiftResult.to]) {
    const prev = _gid(pers.pressPersona);
    pers.pressPersona = {
      ...PRESS_PERSONAS[shiftResult.to],
      id: shiftResult.to,
    };
    newAcc.pressPersona  = {}; // zera acumulador após shift
    newAcc.lastShift     = { ...newAcc.lastShift, pressPersona: ctx.year };
  }
  pers._driftAccumulator = newAcc;

  // 9. Registra careerMoments
  const droughtBroken = cc.titleWon && cc.droughtYears === 0 &&
    (pers.careerMoments ?? []).some(m => m.type === 'DROUGHT_START');
  const changes = {
    moodBefore, moodAfter: moodResult.mood,
    repBefore,  repAfter,
    marketBefore, marketAfter,
    shiftResult, droughtBroken,
  };
  pers.careerMoments = registerCareerMoments(pers, cc, changes, p);

  // 10. publicNarrative
  const playerName = p.firstName ?? p.name ?? 'Ele';
  pers.currentState.publicNarrative = updatePublicNarrative(
    moodResult.mood, repAfter, cc, playerName
  );

  p.personality = pers;
  return p;
}
