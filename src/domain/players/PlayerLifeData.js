/**
 * PlayerLifeData.js — v2.0
 * ─────────────────────────────────────────────────────────────────
 * Dados pessoais dos jogadores — vida fora da quadra.
 *
 * Gerados uma única vez na criação do jogador e raramente alterados
 * (mudanças estruturais vêm via LifeEventSystem, não aqui diretamente).
 *
 * SEÇÕES:
 *   personal    — estado civil, parceiro(a) com profundidade, filhos, pets
 *   origin      — família de origem, criação, classe social, como chegou ao tênis
 *   education   — escolaridade e formação
 *   home        — residência principal, propriedades extras, base de treino
 *   training    — rotina off-season, filosofia de recuperação, superstições
 *   interests   — hobbies com nível/contexto, idiomas com fluência
 *   values      — causa social, fé/espiritualidade
 *   wealth      — tier, veículos detalhados, propriedades
 *   social      — círculo de amigos, vida noturna
 *   media       — presença digital, estilo nas redes
 *   style       — moda, marcas, estética pessoal
 *   diet/sleep  — alimentação e rotina de saúde
 *   publicImage — perfil público consolidado
 */

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN(arr, n) { return [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(n, arr.length)); }
function weighted(items) {
  const total = items.reduce((s, i) => s + (i.weight ?? i.w ?? 0), 0);
  let r = Math.random() * total;
  for (const item of items) { r -= (item.weight ?? item.w ?? 0); if (r <= 0) return item.id ?? item; }
  return items[items.length - 1].id ?? items[items.length - 1];
}
function chance(p) { return Math.random() < p; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

// ═══════════════════════════════════════════════════════════════════
// MAPEAMENTO NACIONALIDADE → REGIÃO
// ═══════════════════════════════════════════════════════════════════

const NATIONALITY_REGION = {
  ITA:'europe', ESP:'europe', FRA:'europe', GER:'europe', CHE:'europe', AUT:'europe',
  BEL:'europe', POR:'europe', GRE:'europe', NED:'europe', SWE:'europe', NOR:'europe',
  DEN:'europe', FIN:'europe', GBR:'europe', IRL:'europe', SCO:'europe',
  RUS:'easteurope', SRB:'easteurope', CRO:'easteurope', POL:'easteurope',
  CZE:'easteurope', HUN:'easteurope', UKR:'easteurope', SVK:'easteurope', ROU:'easteurope',
  BUL:'easteurope', SLO:'easteurope', BIH:'easteurope',
  BRA:'americas', ARG:'americas', USA:'americas', CAN:'americas', CHI:'americas',
  COL:'americas', MEX:'americas', URU:'americas', ECU:'americas', PER:'americas',
  JPN:'asia', KOR:'asia', CHN:'asia', IND:'asia', TPE:'asia', THA:'asia',
  UAE:'mideast', EGY:'mideast', MAR:'mideast', TUN:'mideast',
  AUS:'oceania', NZL:'oceania',
  RSA:'africa', NGR:'africa', KEN:'africa',
};

// ═══════════════════════════════════════════════════════════════════
// 1. ESTADO CIVIL E FAMÍLIA
// ═══════════════════════════════════════════════════════════════════

const RELATIONSHIP_STATUS = {
  SINGLE:      { id: 'SINGLE',      label: 'Solteiro',      hasPartner: false },
  DATING:      { id: 'DATING',      label: 'Namorando',     hasPartner: true  },
  ENGAGED:     { id: 'ENGAGED',     label: 'Noivo',         hasPartner: true  },
  MARRIED:     { id: 'MARRIED',     label: 'Casado',        hasPartner: true  },
  SEPARATED:   { id: 'SEPARATED',   label: 'Separado',      hasPartner: false },
  DIVORCED:    { id: 'DIVORCED',    label: 'Divorciado',    hasPartner: false },
};

function rollRelationshipStatus(age) {
  if (age < 22) return weighted([{ id:'SINGLE',w:55},{id:'DATING',w:40},{id:'ENGAGED',w:5}]);
  if (age < 27) return weighted([{ id:'SINGLE',w:35},{id:'DATING',w:35},{id:'ENGAGED',w:15},{id:'MARRIED',w:15}]);
  if (age < 32) return weighted([{ id:'SINGLE',w:20},{id:'DATING',w:20},{id:'ENGAGED',w:10},{id:'MARRIED',w:40},{id:'SEPARATED',w:5},{id:'DIVORCED',w:5}]);
  return weighted([{id:'SINGLE',w:15},{id:'DATING',w:10},{id:'MARRIED',w:55},{id:'SEPARATED',w:8},{id:'DIVORCED',w:12}]);
}

// ── Parceiro(a) — profundidade real ──────────────────────────────

const PARTNER_PROFILES = [
  { id: 'TENNIS_PLAYER',  label: 'Tenista',                    public: true,  world: 'esporte'       },
  { id: 'ATHLETE_OTHER',  label: 'Atleta de outro esporte',    public: true,  world: 'esporte'       },
  { id: 'MODEL',          label: 'Modelo',                     public: true,  world: 'moda'          },
  { id: 'ACTOR',          label: 'Ator/Atriz',                 public: true,  world: 'entretenimento'},
  { id: 'MUSICIAN',       label: 'Músico(a)',                  public: true,  world: 'entretenimento'},
  { id: 'INFLUENCER',     label: 'Influenciador(a) digital',   public: true,  world: 'digital'       },
  { id: 'JOURNALIST',     label: 'Jornalista',                 public: true,  world: 'mídia'         },
  { id: 'ENTREPRENEUR',   label: 'Empresário(a)',              public: false, world: 'negócios'      },
  { id: 'PROFESSIONAL',   label: 'Profissional liberal',       public: false, world: 'civil'         },
  { id: 'ACADEMIC',       label: 'Acadêmico(a)',               public: false, world: 'academia'      },
  { id: 'PRIVATE',        label: 'Vida privada',               public: false, world: 'privado'       },
];

const HOW_MET_LABELS = [
  'num evento do circuito', 'por amigos em comum', 'num evento beneficente',
  'na cidade natal', 'por uma rede social', 'num evento de patrocinador',
  'durante período de treinamento', 'durante férias', 'apresentados pelo empresário',
  'numa festa pós-torneio', 'num jantar de gala', 'num voo de conexão',
];

const RELATIONSHIP_DYNAMICS = [
  { id:'PRIVATE_HARBOR', label:'porto privado', tone:'discreto', pressure:12, desc:'O relacionamento funciona como abrigo contra o circo público.' },
  { id:'POWER_COUPLE', label:'casal de potência midiática', tone:'glamour', pressure:58, desc:'Dois mundos públicos se somam, com holofotes constantes.' },
  { id:'LONG_DISTANCE', label:'amor em fuso horário', tone:'melancólico', pressure:42, desc:'A carreira impõe ausências, conexões perdidas e reencontros intensos.' },
  { id:'TOUR_PARTNERSHIP', label:'parceria de circuito', tone:'cumplicidade', pressure:26, desc:'A pessoa entende hotéis, derrotas, fisioterapia e aeroportos.' },
  { id:'STABILITY_PROJECT', label:'projeto de estabilidade', tone:'maduro', pressure:22, desc:'A relação tenta construir rotina, casa e família no meio da temporada.' },
  { id:'FIRE_AND_STORM', label:'paixão turbulenta', tone:'volátil', pressure:66, desc:'Muito afeto, mas também ciúme, imprensa e ruído nos piores momentos.' },
  { id:'INTELLECTUAL_BOND', label:'vínculo intelectual', tone:'profundo', pressure:18, desc:'Conversas longas, livros, política, arte e pouco interesse por tapete vermelho.' },
  { id:'FAMILY_CENTERED', label:'família como eixo', tone:'doméstico', pressure:20, desc:'Filhos, pais, rituais de casa e uma tentativa real de vida comum.' },
];

const FAMILY_PLANS = [
  { id:'NO_RUSH', label:'sem pressa para filhos', childrenBias:-0.18, desc:'Prefere deixar a carreira respirar antes de ampliar a família.' },
  { id:'ONE_DAY', label:'quer filhos um dia', childrenBias:0.05, desc:'Fala em família no futuro, mas sem transformar isso em calendário.' },
  { id:'FAMILY_DREAM', label:'sonha com família grande', childrenBias:0.22, desc:'A ideia de casa cheia aparece cedo nas entrevistas e escolhas.' },
  { id:'CAREER_FIRST', label:'carreira primeiro', childrenBias:-0.24, desc:'O circuito manda, ao menos por enquanto.' },
  { id:'ALREADY_ENOUGH', label:'família já está completa', childrenBias:-0.08, desc:'Não procura grandes mudanças domésticas.' },
];

const CHILD_PERSONALITIES = [
  { id:'QUIET_OBSERVER', label:'observador quieto' },
  { id:'COURT_RUNNER', label:'vive correndo pela quadra' },
  { id:'ARTISTIC', label:'artístico e sensível' },
  { id:'LITTLE_REBEL', label:'pequeno rebelde' },
  { id:'BOOKISH', label:'curioso e estudioso' },
  { id:'SOCIAL_SPARK', label:'carismático e sociável' },
];

const PARTNER_NAMES = {
  europe:     ['Sofia', 'Elena', 'Luisa', 'Anna', 'Clara', 'Nina', 'Lea', 'Laura', 'Vera', 'Ines',
               'Marc', 'Jonas', 'Luca', 'Erik', 'Nils', 'Pedro', 'André', 'Tomás', 'Carlos', 'Felix'],
  americas:   ['Camila', 'Isabella', 'Valentina', 'Gabriela', 'Natalia', 'Jessica', 'Ashley', 'Emily', 'Bianca',
               'Miguel', 'Rodrigo', 'Diego', 'Mateo', 'Tyler', 'Jordan', 'Brandon', 'Lucas', 'Felipe'],
  easteurope: ['Anastasia', 'Oksana', 'Katerina', 'Marta', 'Jana', 'Petra', 'Veronika', 'Alina',
               'Dmitri', 'Ivan', 'Pavel', 'Nikita', 'Viktor', 'Tomáš', 'Marek', 'Andrei'],
  mideast:    ['Layla', 'Nour', 'Sara', 'Yasmine', 'Farah', 'Rania',
               'Omar', 'Khalid', 'Rami', 'Yasser', 'Tariq', 'Sami'],
  asia:       ['Yuki', 'Hana', 'Miu', 'Rin', 'Soo-Yeon', 'Min-Ji', 'Ling', 'Wei', 'Mei',
               'Kenji', 'Haruto', 'Ryota', 'Minho', 'Jaehyun', 'Jun', 'Kenta'],
  oceania:    ['Emma', 'Olivia', 'Mia', 'Ava', 'Ruby', 'Grace',
               'Jack', 'Noah', 'Liam', 'Ethan', 'Finn', 'Oscar'],
  africa:     ['Amara', 'Fatima', 'Zara', 'Nadia', 'Nia', 'Adaeze',
               'Kofi', 'Kwame', 'Emeka', 'Seun', 'Ade', 'Chidi'],
};

function rollPartnerDetails(player, relStatusId) {
  if (!RELATIONSHIP_STATUS[relStatusId]?.hasPartner) return null;
  const profile    = pick(PARTNER_PROFILES);
  const howMet     = pick(HOW_MET_LABELS);
  const yearsAgo   = relStatusId === 'MARRIED' ? randInt(1, 8)
                   : relStatusId === 'ENGAGED'  ? randInt(1, 4) : randInt(0, 3);
  const region     = chance(0.65) ? (NATIONALITY_REGION[player.nationality] ?? 'europe') : pick(Object.keys(PARTNER_NAMES));
  const namePool   = PARTNER_NAMES[region] ?? PARTNER_NAMES.europe;
  const dynamic     = pick(RELATIONSHIP_DYNAMICS);
  return {
    type: profile.id, label: profile.label, public: profile.public, world: profile.world,
    name: pick(namePool), howMet, yearsTogether: yearsAgo,
    age: Math.max(18, (player.age ?? 25) + randInt(-5, 5)),
    dynamic,
    privacy: profile.public ? pick(['público moderado', 'muito observado', 'eventos selecionados']) : pick(['quase invisível', 'protegido da imprensa', 'discreto por escolha']),
    strain: dynamic.pressure >= 55 ? pick(['agenda', 'ciúme da imprensa', 'exposição pública', 'distância']) : pick(['agenda', 'saudade', 'rotina quebrada']),
  };
}

function rollFamilyPlans(relStatusId, age, children) {
  if (children?.count >= 2) return FAMILY_PLANS.find(p => p.id === 'ALREADY_ENOUGH');
  if (relStatusId === 'SINGLE' && age < 27) return weighted(FAMILY_PLANS.map(p => ({ id:p.id, weight: p.id === 'CAREER_FIRST' ? 28 : p.id === 'NO_RUSH' ? 26 : 10 })));
  const pool = FAMILY_PLANS.map(p => ({
    id: p.id,
    weight:
      p.id === 'ONE_DAY' ? 24 :
      p.id === 'FAMILY_DREAM' && ['MARRIED','ENGAGED'].includes(relStatusId) ? 22 :
      p.id === 'CAREER_FIRST' && age < 25 ? 20 :
      p.id === 'ALREADY_ENOUGH' && children?.has ? 20 :
      10,
  }));
  return FAMILY_PLANS.find(p => p.id === weighted(pool)) ?? FAMILY_PLANS[1];
}

function buildRelationshipHistory(relStatusId, partner, age) {
  const history = [];
  if (partner) {
    history.push({
      type: 'CURRENT_RELATIONSHIP',
      partnerName: partner.name,
      partnerType: partner.label,
      startedAge: Math.max(16, age - (partner.yearsTogether ?? 0)),
      years: partner.yearsTogether ?? 0,
      howMet: partner.howMet,
      dynamicId: partner.dynamic?.id,
      public: !!partner.public,
      statusAtCreation: relStatusId,
    });
  }
  if (['DIVORCED', 'SEPARATED'].includes(relStatusId)) {
    history.push({
      type: relStatusId === 'DIVORCED' ? 'PAST_DIVORCE' : 'PAST_SEPARATION',
      partnerName: pick(PARTNER_NAMES[NATIONALITY_REGION.europe] ?? PARTNER_NAMES.europe),
      startedAge: Math.max(18, age - randInt(4, 10)),
      endedAge: Math.max(20, age - randInt(0, 3)),
      reason: pick(['distância do circuito', 'rotina incompatível', 'exposição pública', 'prioridades diferentes']),
      statusAtCreation: relStatusId,
    });
  }
  return history;
}

// ── Filhos — com nomes e idades ───────────────────────────────────

const CHILD_NAMES_M = ['Lucas', 'Mateo', 'Noah', 'Leo', 'Hugo', 'Nico', 'Max', 'Theo', 'Luca', 'Oliver', 'Kai', 'Rafael', 'Dante', 'Axel', 'Leon', 'Elias'];
const CHILD_NAMES_F = ['Sofia', 'Mia', 'Emma', 'Luna', 'Valentina', 'Aria', 'Ella', 'Lena', 'Maya', 'Noa', 'Isla', 'Zoe', 'Ava', 'Lila', 'Clara', 'Ayla'];

function rollChildren(relStatusId, playerAge) {
  const p = relStatusId === 'MARRIED' ? (playerAge > 28 ? 0.55 : 0.30)
          : relStatusId === 'DIVORCED'  ? 0.40
          : relStatusId === 'SEPARATED' ? 0.30 : 0.06;
  if (!chance(p)) return { has: false, count: 0, list: [] };
  const count = randInt(1, playerAge > 30 ? 3 : 2);
  const list  = [];
  for (let i = 0; i < count; i++) {
    const gender = chance(0.5) ? 'M' : 'F';
    const maxAge = Math.max(0, Math.min(playerAge - 22, 12));
    const age = randInt(0, maxAge);
    list.push({
      name: pick(gender === 'M' ? CHILD_NAMES_M : CHILD_NAMES_F),
      gender,
      age,
      bornWhenPlayerAge: Math.max(18, playerAge - age),
      personality: pick(CHILD_PERSONALITIES),
      visibility: chance(0.35) ? 'aparece ocasionalmente no box' : 'protegido da imprensa',
    });
  }
  return { has: true, count, list };
}

// ── Pets ──────────────────────────────────────────────────────────

const DOG_NAMES   = ['Thor', 'Ace', 'Bolt', 'Max', 'Bruno', 'Duke', 'Rio', 'Koda', 'Zeus', 'Buddy', 'Diesel', 'Storm'];
const CAT_NAMES   = ['Luna', 'Mimi', 'Sasha', 'Felix', 'Shadow', 'Cleo', 'Mochi', 'Jasper', 'Nova', 'Kira'];

function rollPets(player) {
  const archId = player.personality?.competitiveArchetype?.id;
  const chance_  = { WARRIOR:0.55, DIPLOMAT:0.50, DREAMER:0.45, REBEL:0.40 }[archId] ?? 0.35;
  if (!chance(chance_)) return { has: false };
  const type = weighted([{ id:'DOG', weight:55 }, { id:'CAT', weight:25 }, { id:'DOG_PAIR', weight:20 }]);
  const name = type === 'CAT' ? pick(CAT_NAMES) : pick(DOG_NAMES);
  const name2 = type === 'DOG_PAIR' ? pick(DOG_NAMES.filter(n => n !== name)) : null;
  return { has: true, type, label: type === 'DOG_PAIR' ? 'dois cachorros' : type === 'CAT' ? 'gato' : 'cachorro', name, name2 };
}

// ═══════════════════════════════════════════════════════════════════
// 2. FAMÍLIA DE ORIGEM
// ═══════════════════════════════════════════════════════════════════

const UPBRINGING_CLASSES = [
  { id: 'POOR',         label: 'Humilde',           desc: 'Família de baixa renda. O tênis foi uma saída.' },
  { id: 'WORKING',      label: 'Trabalhadora',       desc: 'Classe trabalhadora. Grandes sacrifícios para o circuito.' },
  { id: 'MIDDLE',       label: 'Classe média',       desc: 'Estrutura estável. Pais apoiaram sem pressão excessiva.' },
  { id: 'UPPER_MIDDLE', label: 'Classe média alta',  desc: 'Acesso a treinamento de qualidade desde cedo.' },
  { id: 'WEALTHY',      label: 'Abastada',           desc: 'Família rica. Academias particulares, viagens internacionais.' },
];

const FATHER_JOBS = [
  'médico', 'advogado', 'professor', 'engenheiro', 'funcionário público',
  'comerciante', 'fazendeiro', 'mecânico', 'taxista', 'operário de fábrica',
  'ex-tenista amador', 'treinador de tênis', 'empresário', 'militar', 'policial',
  'carpinteiro', 'eletricista', 'chef de cozinha', 'bancário', 'corretor de imóveis',
  'jornalista', 'pastor/sacerdote', 'motorista de caminhão', 'pescador',
];

const MOTHER_JOBS = [
  'professora', 'enfermeira', 'médica', 'advogada', 'secretária',
  'dona de casa', 'comerciante', 'contadora', 'psicóloga', 'assistente social',
  'funcionária pública', 'cabeleireira', 'farmacêutica', 'arquiteta', 'nutricionista',
  'vendedora', 'recepcionista', 'fisioterapeuta', 'economista', 'artesã',
];

const HOW_STARTED_TENNIS = [
  { id: 'PARENT_COACH',    label: 'iniciado pelo pai/mãe',             detail: 'O próprio pai ensinava os primeiros golpes no clube da cidade.' },
  { id: 'SCHOOL_PROGRAM',  label: 'descoberto num programa escolar',   detail: 'Um professor de educação física viu potencial e o encaminhou para uma academia.' },
  { id: 'NEIGHBORHOOD',    label: 'quadra pública do bairro',          detail: 'Quadra pública a duas ruas de casa. Aprendeu olhando e imitando.' },
  { id: 'FAMILY_SPORT',    label: 'tradição da família',               detail: 'Avós e pais já jogavam. A raquete apareceu antes de saber andar de bicicleta.' },
  { id: 'ACADEMY_EARLY',   label: 'recrutado por academia aos 7–10 anos', detail: 'Um scout num torneio regional. Bolsa integral antes dos 10 anos.' },
  { id: 'LATE_STARTER',    label: 'começou tarde mas evoluiu rápido',  detail: 'Outros esportes primeiro. O tênis chegou depois dos 12 anos.' },
  { id: 'SOCIAL_PROGRAM',  label: 'programa social de inclusão',       detail: 'ONG que usa o esporte como ferramenta. Sem aquilo, o tênis não acontecia.' },
  { id: 'PRODIGY_CAMP',    label: 'identificado em camp nacional',     detail: 'Federação o detectou num torneio infantil. Treino intensivo desde cedo.' },
  { id: 'SELF_TAUGHT',     label: 'autodidata — aprendeu sozinho',     detail: 'Vídeos, imitação, tentativa e erro. Técnica própria que desconcerta adversários.' },
];

const PARENT_INFLUENCE = [
  { id: 'STRONG',    label: 'pais muito presentes no circuito'          },
  { id: 'MODERATE',  label: 'pais acompanham à distância'               },
  { id: 'DISTANT',   label: 'relação mais distante com a família natal' },
  { id: 'ESTRANGED', label: 'relação difícil — quase não falam'         },
];

const SIBLING_CONFIGS = [
  { id: 'ONLY_CHILD',   label: 'filho único',      count: 0 },
  { id: 'ONE_SIBLING',  label: '1 irmão/irmã',     count: 1 },
  { id: 'TWO_SIBLINGS', label: '2 irmãos/irmãs',   count: 2 },
  { id: 'LARGE_FAMILY', label: 'família numerosa',  count: 4 },
];

function rollOrigin(player, age) {
  const cls = weighted([
    { id:'POOR',w:15 }, { id:'WORKING',w:22 }, { id:'MIDDLE',w:30 }, { id:'UPPER_MIDDLE',w:22 }, { id:'WEALTHY',w:11 },
  ]);
  const sibId = weighted([{ id:'ONLY_CHILD',w:18 }, { id:'ONE_SIBLING',w:38 }, { id:'TWO_SIBLINGS',w:30 }, { id:'LARGE_FAMILY',w:14 }]);
  const parInflId = weighted([{ id:'STRONG',w:25 }, { id:'MODERATE',w:40 }, { id:'DISTANT',w:25 }, { id:'ESTRANGED',w:10 }]);
  return {
    upbringing:      UPBRINGING_CLASSES.find(c => c.id === cls),
    father:          { job: pick(FATHER_JOBS) },
    mother:          { job: pick(MOTHER_JOBS) },
    siblings:        SIBLING_CONFIGS.find(s => s.id === sibId),
    howStarted:      pick(HOW_STARTED_TENNIS),
    parentInfluence: PARENT_INFLUENCE.find(p => p.id === parInflId),
    bornInNativeCntry: chance(0.70),
  };
}

// ═══════════════════════════════════════════════════════════════════
// 3. EDUCAÇÃO
// ═══════════════════════════════════════════════════════════════════

const EDUCATION_LEVELS = [
  { id: 'DROPPED_FOR_TENNIS', label: 'Abandonou os estudos pelo tênis',     shortLabel: 'Ensino incompleto' },
  { id: 'HIGH_SCHOOL',        label: 'Ensino médio completo',               shortLabel: 'Ensino médio'      },
  { id: 'SOME_COLLEGE',       label: 'Iniciou faculdade mas não concluiu',  shortLabel: 'Faculdade incompleta' },
  { id: 'COLLEGE_DEGREE',     label: 'Graduado',                            shortLabel: 'Graduado'          },
  { id: 'ONLINE_COURSES',     label: 'Educação continuada online',          shortLabel: 'Cursos online'     },
];

const COLLEGE_FIELDS = [
  'Administração', 'Educação Física', 'Direito', 'Psicologia', 'Marketing',
  'Comunicação', 'Economia', 'Engenharia', 'Nutrição', 'Arquitetura', 'Ciências Sociais',
];

function rollEducation(age, upbringingId) {
  const weights = age < 24
    ? [{ id:'DROPPED_FOR_TENNIS',w:50 }, { id:'HIGH_SCHOOL',w:35 }, { id:'SOME_COLLEGE',w:10 }, { id:'ONLINE_COURSES',w:5 }]
    : ['WEALTHY','UPPER_MIDDLE'].includes(upbringingId)
    ? [{ id:'DROPPED_FOR_TENNIS',w:15 }, { id:'HIGH_SCHOOL',w:25 }, { id:'SOME_COLLEGE',w:30 }, { id:'COLLEGE_DEGREE',w:20 }, { id:'ONLINE_COURSES',w:10 }]
    : [{ id:'DROPPED_FOR_TENNIS',w:35 }, { id:'HIGH_SCHOOL',w:35 }, { id:'SOME_COLLEGE',w:15 }, { id:'ONLINE_COURSES',w:10 }, { id:'COLLEGE_DEGREE',w:5 }];
  const eduId = weighted(weights);
  const level = EDUCATION_LEVELS.find(e => e.id === eduId);
  const field = ['COLLEGE_DEGREE','SOME_COLLEGE'].includes(eduId) ? pick(COLLEGE_FIELDS) : null;
  return { level, field };
}

// ═══════════════════════════════════════════════════════════════════
// 4. RESIDÊNCIA
// ═══════════════════════════════════════════════════════════════════

const HOME_CITIES = {
  MON:  { city:'Monte Carlo',   country:'MON', taxHaven:true  },
  CHE:  { city:'Genebra',       country:'CHE', taxHaven:true  },
  CHE2: { city:'Basel',         country:'CHE', taxHaven:true  },
  BAH:  { city:'Nassau',        country:'BAH', taxHaven:true  },
  DUB:  { city:'Dubai',         country:'UAE', taxHaven:true  },
  ESP:  { city:'Barcelona',     country:'ESP', taxHaven:false },
  ESP2: { city:'Ibiza',         country:'ESP', taxHaven:false },
  ESP3: { city:'Madrid',        country:'ESP', taxHaven:false },
  FRA:  { city:'Nice',          country:'FRA', taxHaven:false },
  FRA2: { city:'Paris',         country:'FRA', taxHaven:false },
  GER:  { city:'Munique',       country:'GER', taxHaven:false },
  ITA:  { city:'Milão',         country:'ITA', taxHaven:false },
  USA:  { city:'Miami',         country:'USA', taxHaven:false },
  USA2: { city:'Los Angeles',   country:'USA', taxHaven:false },
  USA3: { city:'New York',      country:'USA', taxHaven:false },
  AUS:  { city:'Melbourne',     country:'AUS', taxHaven:false },
  ARG:  { city:'Buenos Aires',  country:'ARG', taxHaven:false },
};

Object.assign(HOME_CITIES, {
  POR:  { city:'Lisboa',        country:'POR', taxHaven:false },
  POR2: { city:'Cascais',       country:'POR', taxHaven:false },
  POR3: { city:'Porto',         country:'POR', taxHaven:false },
  ESP4: { city:'Mallorca',      country:'ESP', taxHaven:false },
  ESP5: { city:'Marbella',      country:'ESP', taxHaven:false },
  ESP6: { city:'Valencia',      country:'ESP', taxHaven:false },
  FRA3: { city:'Cannes',        country:'FRA', taxHaven:false },
  FRA4: { city:'Biarritz',      country:'FRA', taxHaven:false },
  ITA2: { city:'Roma',          country:'ITA', taxHaven:false },
  ITA3: { city:'Como',          country:'ITA', taxHaven:false },
  ITA4: { city:'Florença',      country:'ITA', taxHaven:false },
  ITA5: { city:'Sardenha',      country:'ITA', taxHaven:false },
  GBR:  { city:'Londres',       country:'GBR', taxHaven:false },
  GBR2: { city:'Wimbledon',     country:'GBR', taxHaven:false },
  NED:  { city:'Amsterdã',      country:'NED', taxHaven:false },
  BEL:  { city:'Bruxelas',      country:'BEL', taxHaven:false },
  AUT:  { city:'Viena',         country:'AUT', taxHaven:false },
  AUT2: { city:'Kitzbühel',     country:'AUT', taxHaven:false },
  GRE:  { city:'Atenas',        country:'GRE', taxHaven:false },
  GRE2: { city:'Mykonos',       country:'GRE', taxHaven:false },
  GRE3: { city:'Santorini',     country:'GRE', taxHaven:false },
  CRO:  { city:'Split',         country:'CRO', taxHaven:false },
  CRO2: { city:'Dubrovnik',     country:'CRO', taxHaven:false },
  SRB:  { city:'Belgrado',      country:'SRB', taxHaven:false },
  CZE:  { city:'Praga',         country:'CZE', taxHaven:false },
  POL:  { city:'Varsóvia',      country:'POL', taxHaven:false },
  SWE:  { city:'Estocolmo',     country:'SWE', taxHaven:false },
  NOR:  { city:'Oslo',          country:'NOR', taxHaven:false },
  DEN:  { city:'Copenhague',    country:'DEN', taxHaven:false },
  USA4: { city:'Palm Beach',    country:'USA', taxHaven:false },
  USA5: { city:'Austin',        country:'USA', taxHaven:false },
  USA6: { city:'San Diego',     country:'USA', taxHaven:false },
  USA7: { city:'Aspen',         country:'USA', taxHaven:false },
  USA8: { city:'Las Vegas',     country:'USA', taxHaven:false },
  CAN:  { city:'Toronto',       country:'CAN', taxHaven:false },
  CAN2: { city:'Vancouver',     country:'CAN', taxHaven:false },
  CAN3: { city:'Montreal',      country:'CAN', taxHaven:false },
  MEX:  { city:'Cidade do México', country:'MEX', taxHaven:false },
  MEX2: { city:'Tulum',         country:'MEX', taxHaven:false },
  BRA:  { city:'Rio de Janeiro',country:'BRA', taxHaven:false },
  BRA2: { city:'São Paulo',     country:'BRA', taxHaven:false },
  BRA3: { city:'Florianópolis', country:'BRA', taxHaven:false },
  URU:  { city:'Punta del Este',country:'URU', taxHaven:false },
  CHI:  { city:'Santiago',      country:'CHI', taxHaven:false },
  COL:  { city:'Medellín',      country:'COL', taxHaven:false },
  JPN:  { city:'Tóquio',        country:'JPN', taxHaven:false },
  JPN2: { city:'Kyoto',         country:'JPN', taxHaven:false },
  KOR:  { city:'Seul',          country:'KOR', taxHaven:false },
  CHN:  { city:'Xangai',        country:'CHN', taxHaven:false },
  SIN:  { city:'Singapura',     country:'SIN', taxHaven:true  },
  THA:  { city:'Bangkok',       country:'THA', taxHaven:false },
  THA2: { city:'Phuket',        country:'THA', taxHaven:false },
  INA:  { city:'Bali',          country:'INA', taxHaven:false },
  AUS2: { city:'Sydney',        country:'AUS', taxHaven:false },
  AUS3: { city:'Gold Coast',    country:'AUS', taxHaven:false },
  NZL:  { city:'Auckland',      country:'NZL', taxHaven:false },
  MAR:  { city:'Marrakesh',     country:'MAR', taxHaven:false },
  RSA:  { city:'Cidade do Cabo',country:'RSA', taxHaven:false },
});

const PROPERTY_TYPES = [
  { id:'APARTMENT',  label:'apartamento', tiers:['DEVELOPING','COMFORTABLE','WEALTHY']       },
  { id:'PENTHOUSE',  label:'penthouse',   tiers:['WEALTHY','VERY_WEALTHY','BILLIONAIRE_TIER'] },
  { id:'HOUSE',      label:'casa',        tiers:['COMFORTABLE','WEALTHY']                    },
  { id:'VILLA',      label:'villa',       tiers:['WEALTHY','VERY_WEALTHY','BILLIONAIRE_TIER'] },
  { id:'MANSION',    label:'mansão',      tiers:['VERY_WEALTHY','BILLIONAIRE_TIER']           },
];

function rollPropertyType(tierId) {
  const opts = PROPERTY_TYPES.filter(p => p.tiers.includes(tierId));
  return pick(opts.length ? opts : [PROPERTY_TYPES[0]]);
}

const SECOND_HOMES = [
  'casa de campo no interior', 'villa no litoral', 'apartamento em Paris',
  'chalé nos Alpes', 'casa de praia na Costa Azul', 'mansão no campo inglês',
  'casa nas Maldivas', 'apartamento em Londres', 'rancho no Texas',
  'casa no Caribe', 'villa na Toscana', 'apartamento em Mônaco',
  'casa no Algarve', 'villa em Santorini', 'loft em Berlim', 'villa em Bali',
  'casa em Mykonos', 'apartamento em Miami', 'fazenda no interior',
];

SECOND_HOMES.push(
  'villa em Mallorca', 'cobertura em Singapura', 'apartamento em Tóquio',
  'casa de praia em Tulum', 'fazenda de oliveiras na Toscana', 'casa em Punta del Este',
  'loft em Nova York', 'penthouse em Londres', 'villa em Lake Como',
  'chalé em Aspen', 'casa de surfe em Gold Coast', 'apartamento em Seul',
  'casa de férias em Kyoto', 'villa em Phuket', 'casa colonial em Cartagena',
  'apartamento em Vancouver', 'casa no litoral da Croácia', 'villa em Marrakesh',
  'casa de vidro na Cidade do Cabo', 'rancho na Patagônia', 'casa em Florianópolis',
  'apartamento em Copenhague', 'villa em Ibiza', 'refúgio nos Dolomitas',
  'casa de campo na Normandia', 'propriedade vinícola em Bordeaux',
  'casa nas ilhas gregas', 'apartamento em Dubai Marina', 'villa em Palm Beach',
  'casa de montanha em Queenstown', 'apartamento em Montreal'
);

const TRAINING_BASES = [
  { id:'HOME_CITY',      label:'na própria cidade de residência'         },
  { id:'PRIVATE_ACADEMY',label:'em academia privada na Europa'           },
  { id:'NATIONAL_CENTER',label:'no centro nacional do seu país'          },
  { id:'FLORIDA_CAMPS',  label:'nos complexos da Flórida'                },
  { id:'SPAIN_CLAY',     label:'em academia de saibro na Espanha'        },
  { id:'AUSTRALIA',      label:'na base australiana pré-Open'            },
  { id:'DUBAI_COMPLEX',  label:'no complexo de Dubai'                    },
  { id:'TRAVELING',      label:'sem base fixa — treina em movimento'     },
];

TRAINING_BASES.push(
  { id:'MALLORCA_ACADEMY', label:'em academia de alto rendimento em Mallorca' },
  { id:'MONTE_CARLO_CLUB', label:'em clube privado de Monte Carlo' },
  { id:'LONDON_GRASS', label:'em base de grama nos arredores de Londres' },
  { id:'TOKYO_TECH', label:'em centro tecnológico de performance em Tóquio' },
  { id:'RIO_CLAY', label:'em quadras de saibro no Rio de Janeiro' },
  { id:'BUENOS_AIRES_GRIT', label:'em academia tradicional de Buenos Aires' },
  { id:'CAPE_TOWN_BLOCK', label:'em bloco físico na Cidade do Cabo' },
  { id:'SWISS_ALTITUDE', label:'em altitude nos Alpes suíços' },
  { id:'MELBOURNE_BLOCK', label:'em bloco pré-temporada em Melbourne' },
  { id:'SEOUL_RECOVERY', label:'em centro de recuperação em Seul' },
);

const WORLD_PLACES = [
  { id:'EIFFEL', label:'Torre Eiffel', city:'Paris', country:'FRA', kind:'tourist' },
  { id:'LOUVRE', label:'Museu do Louvre', city:'Paris', country:'FRA', kind:'culture' },
  { id:'MONACO_HARBOR', label:'Porto de Mônaco', city:'Monte Carlo', country:'MON', kind:'luxury' },
  { id:'SAGRADA', label:'Sagrada Família', city:'Barcelona', country:'ESP', kind:'culture' },
  { id:'WIMBLEDON_VILLAGE', label:'Wimbledon Village', city:'Londres', country:'GBR', kind:'tennis' },
  { id:'CENTRAL_PARK', label:'Central Park', city:'New York', country:'USA', kind:'urban' },
  { id:'SOHO_NYC', label:'SoHo', city:'New York', country:'USA', kind:'fashion' },
  { id:'SOUTH_BEACH', label:'South Beach', city:'Miami', country:'USA', kind:'beach' },
  { id:'MALIBU', label:'Malibu', city:'Los Angeles', country:'USA', kind:'beach' },
  { id:'ASPEN_SNOW', label:'Aspen Mountain', city:'Aspen', country:'USA', kind:'mountain' },
  { id:'COPACABANA', label:'Copacabana', city:'Rio de Janeiro', country:'BRA', kind:'beach' },
  { id:'IPANEMA', label:'Ipanema', city:'Rio de Janeiro', country:'BRA', kind:'beach' },
  { id:'SHIBUYA', label:'Shibuya Crossing', city:'Tóquio', country:'JPN', kind:'urban' },
  { id:'KYOTO_TEMPLES', label:'templos de Kyoto', city:'Kyoto', country:'JPN', kind:'spiritual' },
  { id:'MARINA_BAY', label:'Marina Bay', city:'Singapura', country:'SIN', kind:'luxury' },
  { id:'BALI_UBUD', label:'Ubud', city:'Bali', country:'INA', kind:'spiritual' },
  { id:'SANTORINI_CALDERA', label:'caldeira de Santorini', city:'Santorini', country:'GRE', kind:'view' },
  { id:'MYKONOS_PORT', label:'porto de Mykonos', city:'Mykonos', country:'GRE', kind:'nightlife' },
  { id:'DUBAI_MARINA', label:'Dubai Marina', city:'Dubai', country:'UAE', kind:'luxury' },
  { id:'CAPE_WATERFRONT', label:'V&A Waterfront', city:'Cidade do Cabo', country:'RSA', kind:'view' },
  { id:'MARRAKESH_MEDINA', label:'medina de Marrakesh', city:'Marrakesh', country:'MAR', kind:'culture' },
  { id:'BUENOS_PALERMO', label:'Palermo', city:'Buenos Aires', country:'ARG', kind:'lifestyle' },
  { id:'PUNTA_PORT', label:'porto de Punta del Este', city:'Punta del Este', country:'URU', kind:'beach' },
  { id:'LAKE_COMO', label:'Lago de Como', city:'Como', country:'ITA', kind:'quiet_luxury' },
  { id:'TUSCANY_HILLS', label:'colinas da Toscana', city:'Florença', country:'ITA', kind:'rural' },
  { id:'AMSTERDAM_CANALS', label:'canais de Amsterdã', city:'Amsterdã', country:'NED', kind:'urban' },
  { id:'PRAGUE_OLD_TOWN', label:'Cidade Velha de Praga', city:'Praga', country:'CZE', kind:'culture' },
  { id:'QUEENSTOWN_LAKE', label:'Lago Wakatipu', city:'Queenstown', country:'NZL', kind:'nature' },
  { id:'SYDNEY_HARBOR', label:'Sydney Harbour', city:'Sydney', country:'AUS', kind:'view' },
  { id:'TULUM_RUINS', label:'ruínas de Tulum', city:'Tulum', country:'MEX', kind:'beach' },
];

function rollFavoritePlaces(player, homeCity) {
  const region = NATIONALITY_REGION[player.nationality] ?? 'europe';
  const homePlace = homeCity?.city
    ? { id:'HOME_BASE', label: homeCity.city, city: homeCity.city, country: homeCity.country ?? player.nationality, kind:'home' }
    : { id:'BIRTH_COUNTRY', label:'cidade natal', city:null, country:player.nationality, kind:'roots' };
  const pool = WORLD_PLACES.map(place => {
    const sameCountry = place.country === player.nationality;
    const regionBonus = NATIONALITY_REGION[place.country] === region;
    return { ...place, weight: 10 + (sameCountry ? 20 : 0) + (regionBonus ? 8 : 0) };
  });
  const picked = [];
  while (picked.length < 4 && pool.length) {
    const id = weighted(pool);
    const idx = pool.findIndex(p => p.id === id);
    if (idx >= 0) picked.push(pool.splice(idx, 1)[0]);
  }
  return {
    birthPlace: homePlace,
    favoriteCity: picked[0] ?? homePlace,
    favoriteEscape: picked[1] ?? null,
    favoriteLandmark: picked.find(p => ['culture','tourist','spiritual','view'].includes(p.kind)) ?? picked[2] ?? null,
    placesLoved: [homePlace, ...picked].slice(0, 5),
  };
}

function rollHomeCity(player) {
  const mkt = player.personality?.marketability?.score ?? 30;
  const taxChance = mkt > 70 ? 0.55 : mkt > 50 ? 0.35 : 0.18;
  if (chance(taxChance)) {
    const key = weighted([
      { id:'MON',w:24 }, { id:'CHE',w:14 }, { id:'BAH',w:8 }, { id:'DUB',w:15 }, { id:'CHE2',w:7 }, { id:'ESP2',w:10 },
      { id:'SIN',w:10 }, { id:'POR2',w:8 }, { id:'USA4',w:8 }, { id:'ESP4',w:8 },
    ]);
    return HOME_CITIES[key];
  }
  if (chance(0.42)) return { city: null, country: player.nationality, taxHaven: false };
  const key = pick([
    'ESP','ESP3','ESP4','ESP5','ESP6','FRA','FRA2','FRA3','FRA4','GER','ITA','ITA2','ITA3','ITA4','GBR','GBR2',
    'POR','POR2','USA','USA2','USA3','USA5','USA6','CAN','CAN2','BRA','BRA2','BRA3','AUS','AUS2','ARG','JPN','JPN2',
    'KOR','CHN','THA','INA','MAR','RSA','URU','CHI','COL','NED','AUT','GRE','CRO','SRB','CZE'
  ]);
  return HOME_CITIES[key] ?? HOME_CITIES.ESP;
}

function rollProperties(tierId, homeCity) {
  const mainType = rollPropertyType(tierId);
  const props = [{ type: mainType.id, label: mainType.label, location: homeCity.city ?? 'cidade natal', main: true }];
  if (['WEALTHY','VERY_WEALTHY','BILLIONAIRE_TIER'].includes(tierId)) {
    props.push({ type:'SECONDARY', label: pick(SECOND_HOMES), main: false });
  }
  if (tierId === 'BILLIONAIRE_TIER' && chance(0.6)) {
    const used = props.map(p => p.label);
    props.push({ type:'TERTIARY', label: pick(SECOND_HOMES.filter(h => !used.includes(h))), main: false });
  }
  return props;
}

// ═══════════════════════════════════════════════════════════════════
// 5. TREINO OFF-SEASON E SUPERSTIÇÕES
// ═══════════════════════════════════════════════════════════════════

const OFF_SEASON_HABITS = [
  { id:'HEAVY_TRAINING',  label:'treinamento físico intenso',             desc:'Quase não tira férias. Dezembro na academia.' },
  { id:'RECOVERY_FIRST',  label:'prioriza recuperação total',              desc:'Acredita que o corpo precisa zerar antes do próximo ciclo.' },
  { id:'MIXED',           label:'alternância treino + férias',             desc:'Duas semanas de descanso, depois retoma gradualmente.' },
  { id:'FAMILY_TIME',     label:'tempo com família antes de tudo',         desc:'O recesso é sagrado para quem ama.' },
  { id:'TRAVEL_EXPLORE',  label:'viagens longas de exploração',            desc:'Usa o intervalo para conhecer o mundo.' },
  { id:'BUSINESS_FOCUS',  label:'foco em negócios e projetos pessoais',    desc:'O off-season é quando os outros trabalhos avançam.' },
];

const RECOVERY_ROUTINES = [
  { id:'ICE_BATHS',       label:'banhos de gelo e crioterapia'      },
  { id:'YOGA_MEDITATION', label:'ioga e meditação diária'           },
  { id:'MASSAGE_PHYSIO',  label:'massagem terapêutica intensiva'    },
  { id:'ALTITUDE',        label:'treino em altitude'                },
  { id:'TECH_DEVICES',    label:'dispositivos de recuperação tech'  },
  { id:'SLEEP_PROTOCOL',  label:'protocolo rigoroso de sono'        },
  { id:'SAUNA',           label:'sauna e terapia de calor'          },
  { id:'FLOATATION',      label:'tanques de flutuação sensorial'    },
  { id:'MINIMAL',         label:'descanso simples, sem protocolos'  },
];

const SUPERSTITIONS = [
  { id:'SAME_SOCKS',      label:'usa a mesma meia enquanto estiver ganhando'               },
  { id:'BOUNCES',         label:'bate a bola um número fixo de vezes antes de servir'      },
  { id:'ENTRY_FOOT',      label:'entra sempre na quadra com o mesmo pé'                    },
  { id:'PRE_MATCH_MEAL',  label:'come exatamente o mesmo pré-jogo'                         },
  { id:'MUSIC_RITUAL',    label:'ouve a mesma playlist antes de cada partida'              },
  { id:'SHOWER_SEQUENCE', label:'rotina de vestiário imutável desde os 15 anos'            },
  { id:'RELIGIOUS_ITEM',  label:'carrega um item religioso na bolsa de raquetes'           },
  { id:'LOGO_DIRECTION',  label:'alinha o logo da raquete antes de cada recebimento'       },
  { id:'NO_LINES',        label:'nunca pisa nas linhas ao entrar em quadra'                },
  { id:'WRISTBAND',       label:'mesmo wristband desde a primeira final vencida'           },
  { id:'SEAT_POSITION',   label:'sempre senta no mesmo lado da cadeira na troca de lado'   },
  { id:'WATER_SEQUENCE',  label:'ordem específica de garrafinhas durante o jogo'           },
  { id:'NONE',            label:'sem superstições conhecidas'                              },
];

function rollTrainingProfile(player) {
  const archId = player.personality?.competitiveArchetype?.id;
  const bias = { PERFECTIONIST:'HEAVY_TRAINING', WARRIOR:'HEAVY_TRAINING', PREDATOR:'HEAVY_TRAINING',
                 ARTIST:'RECOVERY_FIRST', DREAMER:'TRAVEL_EXPLORE', DIPLOMAT:'FAMILY_TIME',
                 REBEL:'TRAVEL_EXPLORE', TACTICIAN:'MIXED' }[archId];
  const offPool = OFF_SEASON_HABITS.map(h => ({ ...h, weight: h.id === bias ? 40 : 10 }));
  const offId   = weighted(offPool);
  const hasSup  = chance(0.75);
  const supList = hasSup ? pickN(SUPERSTITIONS.filter(s => s.id !== 'NONE'), randInt(1, 2))
                         : [SUPERSTITIONS.find(s => s.id === 'NONE')];
  return {
    offSeason:     OFF_SEASON_HABITS.find(h => h.id === offId),
    recovery:      pick(RECOVERY_ROUTINES),
    trainingBase:  pick(TRAINING_BASES),
    superstitions: supList,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 6. HOBBIES — com nível e contexto
// ═══════════════════════════════════════════════════════════════════

const HOBBIES_POOL = [
  { id:'FOOTBALL',       label:'futebol',            category:'SPORT',       levels:['torcedor fanático','joga recreativamente','joga com ex-profissionais'] },
  { id:'GOLF',           label:'golfe',              category:'SPORT',       levels:['handicap alto','joga competitivamente','joga com CEOs e políticos'] },
  { id:'SURFING',        label:'surf',               category:'SPORT',       levels:['iniciante','surfa bem','ondas grandes'] },
  { id:'CYCLING',        label:'ciclismo',           category:'SPORT',       levels:['passeios','treinos longos','corridas amadoras'] },
  { id:'PADEL',          label:'padel',              category:'SPORT',       levels:['casual','competitivo','torneios locais'] },
  { id:'BASKETBALL',     label:'basquete',           category:'SPORT',       levels:['pick-up games','segue a NBA de perto','amigo de jogadores da NBA'] },
  { id:'SKIING',         label:'esqui',              category:'SPORT',       levels:['iniciante','pistas avançadas','fora de pista'] },
  { id:'RUNNING',        label:'corrida',            category:'SPORT',       levels:['corridas casuais','meias maratonas','maratonas'] },
  { id:'SWIMMING',       label:'natação',            category:'SPORT',       levels:['lazer','treino regular','competitivo'] },
  { id:'CLIMBING',       label:'escalada',           category:'SPORT',       levels:['indoor','outdoor','multi-pitch'] },
  { id:'MARTIAL_ARTS',   label:'artes marciais',     category:'SPORT',       levels:['iniciante','faixa intermediária','praticante há anos'] },
  { id:'TENNIS_FANATIC', label:'fã de outros tenistas', category:'SPORT',   levels:['acompanha o circuito inteiro','analisa jogos em vídeo','tem ídolos claros'] },
  { id:'MUSIC',          label:'música',             category:'CREATIVE',    levels:['ouvinte ávido','toca instrumentos','produz faixas'] },
  { id:'GUITAR',         label:'violão',             category:'CREATIVE',    levels:['básico','intermediário','toca bem em público'] },
  { id:'PIANO',          label:'piano',              category:'CREATIVE',    levels:['estudou na infância','toca hobbysticamente','nível avançado'] },
  { id:'DRUMS',          label:'bateria',            category:'CREATIVE',    levels:['casual','sólido','já tocou com banda'] },
  { id:'PAINTING',       label:'pintura',            category:'CREATIVE',    levels:['aquarela casual','óleo e tela','expõe informalmente'] },
  { id:'PHOTOGRAPHY',    label:'fotografia',         category:'CREATIVE',    levels:['smartphone','câmera DSLR','editorial independente'] },
  { id:'COOKING',        label:'gastronomia',        category:'CREATIVE',    levels:['receitas simples','cozinheiro habilidoso','considera abrir restaurante'] },
  { id:'WRITING',        label:'escrita',            category:'CREATIVE',    levels:['diário pessoal','blog ou newsletter','trabalha em livro'] },
  { id:'TATTOOING',      label:'tatuagens',          category:'CREATIVE',    levels:['dois ou três','estilo definido','coleção extensa com significado'] },
  { id:'DJ',             label:'DJ / produção musical', category:'CREATIVE', levels:['coleciona vinis','sets para amigos','open format em festas'] },
  { id:'CHESS',          label:'xadrez',             category:'INTELLECTUAL',levels:['casual','estuda aberturas','torneios amadores'] },
  { id:'READING',        label:'leitura',            category:'INTELLECTUAL',levels:['1–2 livros por ano','leitor ávido','lista de leitura extensa'] },
  { id:'LANGUAGES',      label:'idiomas',            category:'INTELLECTUAL',levels:['frases básicas','estuda formalmente','poliglota'] },
  { id:'PHILOSOPHY',     label:'filosofia',          category:'INTELLECTUAL',levels:['interesse casual','lê os clássicos','usa como guia de vida'] },
  { id:'HISTORY',        label:'história',           category:'INTELLECTUAL',levels:['documentários','livros de história','especializado em período específico'] },
  { id:'ASTRONOMY',      label:'astronomia',         category:'INTELLECTUAL',levels:['apps de estrelas','telescópio próprio','aulas online'] },
  { id:'PODCASTS',       label:'podcasts',           category:'INTELLECTUAL',levels:['ouve no trajeto','catálogo extenso','considera fazer o próprio'] },
  { id:'ECONOMICS',      label:'economia e investimentos', category:'INTELLECTUAL', levels:['lê notícias','portfólio pessoal','consulta gestores'] },
  { id:'FASHION',        label:'moda',               category:'LIFESTYLE',   levels:['segue tendências','tem estilo próprio','colabora com marcas'] },
  { id:'TRAVEL',         label:'viagens',            category:'LIFESTYLE',   levels:['destinos populares','lugares remotos','viajante de experiências'] },
  { id:'CARS',           label:'carros',             category:'LIFESTYLE',   levels:['entusiasta','colecionador iniciante','coleção expressiva'] },
  { id:'GAMING',         label:'games',              category:'LIFESTYLE',   levels:['casual','plataformas específicas','gamer dedicado'] },
  { id:'WINE',           label:'enoturismo',         category:'LIFESTYLE',   levels:['aprecia vinho','tem adega','investe em safras'] },
  { id:'WATCHES',        label:'relógios',           category:'LIFESTYLE',   levels:['dois ou três modelos','colecionador','peças de investimento'] },
  { id:'ART_COLLECTING', label:'arte',               category:'LIFESTYLE',   levels:['compra obras jovens','galeria em casa','coleção de valor'] },
  { id:'SNEAKERS',       label:'tênis/sneakers',     category:'LIFESTYLE',   levels:['modelo favorito','coleção de edições limitadas','reseller avesso'] },
  { id:'CHARITY',        label:'trabalho voluntário',category:'SOCIAL',      levels:['doações','visitas regulares','fundação própria'] },
  { id:'MENTOR',         label:'mentoria de jovens', category:'SOCIAL',      levels:['informal','programa estruturado','academia própria'] },
  { id:'COMMUNITY',      label:'projetos na cidade natal', category:'SOCIAL',levels:['apoia localmente','visitas regulares','projeto fixo anual'] },
];

function rollHobbies(player) {
  const archId    = player.personality?.competitiveArchetype?.id;
  const personaId = player.personality?.pressPersona?.id;
  const archBias  = { PERFECTIONIST:['CHESS','READING','GOLF','PIANO'], ARTIST:['MUSIC','PAINTING','PHOTOGRAPHY','WRITING'],
                      WARRIOR:['FOOTBALL','BASKETBALL','RUNNING','MARTIAL_ARTS'], REBEL:['SURFING','SKIING','GAMING','TATTOOING'],
                      DREAMER:['TRAVEL','READING','PHILOSOPHY','ASTRONOMY'], TACTICIAN:['CHESS','HISTORY','GOLF','PODCASTS'],
                      PREDATOR:['CARS','WATCHES','GOLF','FOOTBALL'], DIPLOMAT:['CHARITY','TRAVEL','COOKING','COMMUNITY'] }[archId] ?? [];
  const persBias  = { INTELLECTUAL:['READING','PHILOSOPHY','CHESS','HISTORY','PODCASTS','ECONOMICS'],
                      SHOWMAN:['FASHION','MUSIC','CARS','ART_COLLECTING','DJ'], CHARISMATIC:['FOOTBALL','COOKING','FASHION','TRAVEL'],
                      CONFRONTATIONAL:['FOOTBALL','CARS','GAMING','TATTOOING','MARTIAL_ARTS'],
                      RESERVED:['READING','PHOTOGRAPHY','COOKING','PIANO'], ENIGMATIC:['WRITING','PHILOSOPHY','ART_COLLECTING','ASTRONOMY'] }[personaId] ?? [];
  const biasSet   = new Set([...archBias, ...persBias]);
  const scored    = HOBBIES_POOL.map(h => ({ ...h, weight: biasSet.has(h.id) ? 30 : 8 }));
  const n = randInt(2, 4);
  const chosen = [];
  const avail = [...scored];
  for (let i = 0; i < n && avail.length; i++) {
    const total = avail.reduce((s, h) => s + h.weight, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (let j = 0; j < avail.length; j++) { r -= avail[j].weight; if (r <= 0) { idx = j; break; } }
    const h = avail[idx];
    chosen.push({ ...h, level: h.levels ? pick(h.levels) : null });
    avail.splice(idx, 1);
  }
  return chosen;
}

// ═══════════════════════════════════════════════════════════════════
// 7. IDIOMAS — com fluência
// ═══════════════════════════════════════════════════════════════════

const LANGUAGE_MAP = {
  ITA:['italiano','inglês'],        ESP:['espanhol','inglês'],         FRA:['francês','inglês'],
  GER:['alemão','inglês'],          CHE:['alemão','inglês','francês'], AUT:['alemão','inglês'],
  BEL:['francês','holandês','inglês'], RUS:['russo','inglês'],         SRB:['sérvio','inglês'],
  CRO:['croata','inglês'],          POL:['polonês','inglês'],          CZE:['tcheco','inglês'],
  GRE:['grego','inglês'],           POR:['português','inglês'],        HUN:['húngaro','inglês'],
  UKR:['ucraniano','inglês'],       SWE:['sueco','inglês'],            NOR:['norueguês','inglês'],
  DEN:['dinamarquês','inglês'],     FIN:['finlandês','inglês'],        BRA:['português','inglês'],
  ARG:['espanhol','inglês'],        USA:['inglês'],                    CAN:['inglês','francês'],
  CHI:['espanhol','inglês'],        COL:['espanhol','inglês'],         MEX:['espanhol','inglês'],
  URU:['espanhol','inglês'],        JPN:['japonês','inglês'],          KOR:['coreano','inglês'],
  CHN:['mandarim','inglês'],        IND:['inglês','hindi'],            RSA:['inglês','africâner'],
  EGY:['árabe','inglês'],           MAR:['árabe','francês','inglês'],  AUS:['inglês'],
  NZL:['inglês'],                   TPE:['mandarim','inglês'],         NED:['holandês','inglês'],
  SVK:['eslovaco','inglês'],        ROU:['romeno','inglês'],           GBR:['inglês'],
  SLO:['esloveno','inglês'],        BUL:['búlgaro','inglês'],
};

const FLUENCY = [
  { id:'NATIVE',        label:'nativo'         },
  { id:'FLUENT',        label:'fluente'        },
  { id:'CONVERSATIONAL',label:'conversacional' },
  { id:'BASIC',         label:'básico'         },
];

function rollLanguages(nationality, hobbies) {
  const base   = LANGUAGE_MAP[nationality] ?? ['inglês'];
  const result = base.map((lang, i) => ({ lang, fluency: FLUENCY[i === 0 ? 0 : 1] }));
  if (hobbies.some(h => h.id === 'LANGUAGES')) {
    const pool  = ['italiano','espanhol','francês','alemão','português','árabe','mandarim','japonês','russo'];
    const extra = pick(pool.filter(l => !result.map(r => r.lang).includes(l)));
    if (extra) result.push({ lang: extra, fluency: pick([FLUENCY[1], FLUENCY[2]]) });
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════
// 8. FÉ E ESPIRITUALIDADE
// ═══════════════════════════════════════════════════════════════════

const FAITH_PROFILES = [
  { id:'NONE',            label:'Sem religião declarada',           public:false, intensity:0 },
  { id:'CULTURAL',        label:'Religioso por tradição familiar',   public:false, intensity:1, desc:'Celebra datas religiosas mas não pratica ativamente.' },
  { id:'PRIVATE',         label:'Fé privada e intensa',              public:false, intensity:2, desc:'Fé forte mas guardada. Não se comenta em entrevista.' },
  { id:'PRACTICING',      label:'Praticante regular',                public:true,  intensity:2, desc:'Frequenta serviços. A fé aparece nas entrevistas sem exagero.' },
  { id:'VERY_DEVOUT',     label:'Muito devoto',                      public:true,  intensity:3, desc:'A fé está no centro de tudo — rituais em quadra, falas e causas.' },
  { id:'SPIRITUAL_NRELIG',label:'Espiritual, não religioso',         public:false, intensity:1, desc:'Meditação, filosofia oriental, práticas de consciência.' },
];

const FAITH_POOLS = {
  europe:     [{id:'NONE',w:30},{id:'CULTURAL',w:30},{id:'PRIVATE',w:15},{id:'PRACTICING',w:15},{id:'VERY_DEVOUT',w:5},{id:'SPIRITUAL_NRELIG',w:5}],
  americas:   [{id:'NONE',w:15},{id:'CULTURAL',w:20},{id:'PRIVATE',w:15},{id:'PRACTICING',w:30},{id:'VERY_DEVOUT',w:15},{id:'SPIRITUAL_NRELIG',w:5}],
  easteurope: [{id:'NONE',w:25},{id:'CULTURAL',w:30},{id:'PRIVATE',w:20},{id:'PRACTICING',w:20},{id:'VERY_DEVOUT',w:5},{id:'SPIRITUAL_NRELIG',w:0}],
  mideast:    [{id:'NONE',w:5},{id:'CULTURAL',w:15},{id:'PRIVATE',w:15},{id:'PRACTICING',w:35},{id:'VERY_DEVOUT',w:25},{id:'SPIRITUAL_NRELIG',w:5}],
  asia:       [{id:'NONE',w:20},{id:'CULTURAL',w:25},{id:'PRIVATE',w:25},{id:'PRACTICING',w:15},{id:'VERY_DEVOUT',w:5},{id:'SPIRITUAL_NRELIG',w:10}],
  oceania:    [{id:'NONE',w:35},{id:'CULTURAL',w:25},{id:'PRIVATE',w:15},{id:'PRACTICING',w:15},{id:'VERY_DEVOUT',w:5},{id:'SPIRITUAL_NRELIG',w:5}],
  africa:     [{id:'NONE',w:10},{id:'CULTURAL',w:15},{id:'PRIVATE',w:10},{id:'PRACTICING',w:30},{id:'VERY_DEVOUT',w:30},{id:'SPIRITUAL_NRELIG',w:5}],
};

function rollFaith(nationality) {
  const region = NATIONALITY_REGION[nationality] ?? 'europe';
  const pool   = (FAITH_POOLS[region] ?? FAITH_POOLS.europe).map(e => ({ id:e.id, weight:e.w }));
  return FAITH_PROFILES.find(f => f.id === weighted(pool)) ?? FAITH_PROFILES[0];
}

// ═══════════════════════════════════════════════════════════════════
// 9. CAUSA SOCIAL
// ═══════════════════════════════════════════════════════════════════

const SOCIAL_CAUSES = [
  { id:'EDUCATION',     label:'Educação infantil',              icon:'📚', depth:'Constrói escolas ou patrocina bolsas na cidade natal.'        },
  { id:'ENVIRONMENT',   label:'Meio ambiente',                  icon:'🌱', depth:'Compensa emissões. Apoia ONGs ambientais internacionais.'     },
  { id:'YOUTH_TENNIS',  label:'Tênis para jovens carentes',     icon:'🎾', depth:'Distribui raquetes e custeia academias em regiões pobres.'    },
  { id:'MENTAL_HEALTH', label:'Saúde mental no esporte',        icon:'🧠', depth:'Fala abertamente sobre a pressão no circuito profissional.'   },
  { id:'HUNGER',        label:'Combate à fome',                 icon:'🍞', depth:'Doa percentual dos prêmios para banco de alimentos.'          },
  { id:'REFUGEE',       label:'Apoio a refugiados',             icon:'🤝', depth:'Parceiro de ACNUR. Já visitou campos na Turquia e Grécia.'    },
  { id:'GENDER_EQUITY', label:'Equidade de gênero no esporte',  icon:'⚖️', depth:'Defende prize money igual e visibilidade para o tênis feminino.' },
  { id:'ANIMALS',       label:'Proteção animal',                icon:'🐾', depth:'Apoiador de santuários. Nunca usa produtos de couro animal.'  },
  { id:'DISABILITY',    label:'Inclusão de deficientes',        icon:'♿', depth:'Participa de exibições para tênis adaptado anualmente.'       },
  { id:'LGBTQ',         label:'Direitos LGBTQ+',                icon:'🏳️‍🌈', depth:'Parceiro de campanhas de visibilidade e inclusão.'         },
  { id:'CLEAN_WATER',   label:'Acesso à água potável',          icon:'💧', depth:'Financia poços em regiões sem saneamento básico.'            },
  { id:'INDIGENOUS',    label:'Populações originárias',         icon:'🌎', depth:'Defende direitos de populações indígenas do seu país.'       },
  { id:'NONE',          label:'Nenhuma causa pública',          icon:'',   depth:''                                                             },
];

function pickSocialCause(player) {
  const mkt = player.personality?.marketability?.score ?? 30;
  const noneChance = mkt > 60 ? 0.12 : mkt > 40 ? 0.28 : 0.50;
  if (chance(noneChance)) return SOCIAL_CAUSES.find(c => c.id === 'NONE');
  return pick(SOCIAL_CAUSES.filter(c => c.id !== 'NONE'));
}

const PUBLIC_STANCES = [
  { id:'APOLITICAL', label:'evita política', heat:8, desc:'Prefere não entrar em debates partidários ou ideológicos.' },
  { id:'CIVIC_MODERATE', label:'cívico moderado', heat:24, desc:'Defende educação, esporte e participação pública sem comprar brigas grandes.' },
  { id:'PROGRESSIVE_VOICE', label:'voz progressista', heat:58, desc:'Fala de inclusão, direitos civis, clima e desigualdade com frequência.' },
  { id:'TRADITIONALIST', label:'tradicionalista discreto', heat:42, desc:'Valoriza família, disciplina, mérito e instituições nacionais.' },
  { id:'NATIONAL_SYMBOL', label:'símbolo nacional', heat:36, desc:'Evita partido, mas fala muito de país, identidade e responsabilidade pública.' },
  { id:'ANTI_ESTABLISHMENT', label:'anti-establishment', heat:74, desc:'Desconfia de federações, governos e grandes instituições esportivas.' },
  { id:'GLOBAL_HUMANITARIAN', label:'humanitário global', heat:46, desc:'Conecta fama internacional com causas de alcance mundial.' },
];

const ACTIVISM_STYLES = [
  { id:'CHECKBOOK', label:'financia em silêncio', desc:'Prefere doar e construir sem virar rosto de campanha.' },
  { id:'FIELD_VISITS', label:'vai ao campo', desc:'Visita projetos, aparece em escolas, abrigos e clínicas.' },
  { id:'MICROPHONE', label:'usa o microfone', desc:'Fala em coletiva, redes e premiações quando acha necessário.' },
  { id:'INSTITUTIONAL', label:'cria instituição', desc:'Organiza fundação, conselho e projetos de longo prazo.' },
  { id:'LOCAL_FIRST', label:'começa pela cidade natal', desc:'A causa nasce perto de casa antes de ganhar o mundo.' },
  { id:'CAMPAIGN_FACE', label:'rosto de campanha', desc:'Aceita ser embaixador e símbolo público da pauta.' },
];

const PROJECT_BLUEPRINTS = {
  EDUCATION: ['bolsas de estudo para crianças atletas', 'biblioteca comunitária ligada a clubes', 'programa de tutoria escolar durante torneios'],
  ENVIRONMENT: ['fundo de reflorestamento ligado ao calendário', 'projeto de quadras sustentáveis', 'campanha de viagens neutras em carbono'],
  YOUTH_TENNIS: ['academia popular de tênis', 'circuito juvenil gratuito', 'programa de raquetes e treinadores em bairros periféricos'],
  MENTAL_HEALTH: ['linha de apoio para jovens atletas', 'seminário anual de pressão no esporte', 'rede de psicólogos para academias'],
  HUNGER: ['banco de alimentos em semanas de torneio', 'cozinhas comunitárias financiadas por aces', 'campanha de refeições por vitória'],
  REFUGEE: ['clínicas esportivas em campos de refugiados', 'bolsas para jovens deslocados', 'parceria humanitária internacional'],
  GENDER_EQUITY: ['programa de treinadoras mulheres', 'campanha por premiação igual', 'mentoria para meninas no esporte'],
  ANIMALS: ['santuário apoiado pela fundação', 'campanha contra abandono animal', 'adoção responsável em eventos'],
  DISABILITY: ['clínicas de tênis adaptado', 'bolsas para atletas paralímpicos', 'acessibilidade em clubes locais'],
  LGBTQ: ['campanha de inclusão no vestiário', 'fundo de segurança para jovens LGBTQ+', 'embaixada contra homofobia no esporte'],
  CLEAN_WATER: ['poços em comunidades rurais', 'saneamento em escolas públicas', 'fundo de água potável por título'],
  INDIGENOUS: ['apoio jurídico a comunidades originárias', 'preservação cultural via esporte', 'programa de quadras em terras indígenas'],
  NONE: ['ações pontuais sem bandeira fixa'],
};

function rollPublicValues(player, socialCause, origin) {
  const persona = player.personality?.pressPersona?.id;
  const arch = player.personality?.competitiveArchetype?.id;
  const mkt = player.personality?.marketability?.score ?? 30;
  const stanceBias = {
    RESERVED:'APOLITICAL',
    ENIGMATIC:'APOLITICAL',
    INTELLECTUAL:'PROGRESSIVE_VOICE',
    DIPLOMATIC:'CIVIC_MODERATE',
    CONFRONTATIONAL:'ANTI_ESTABLISHMENT',
    SHOWMAN:'GLOBAL_HUMANITARIAN',
    CHARISMATIC:'NATIONAL_SYMBOL',
    WARRIOR:'NATIONAL_SYMBOL',
    REBEL:'ANTI_ESTABLISHMENT',
  };
  const stanceId = stanceBias[persona] ?? stanceBias[arch] ?? pick(PUBLIC_STANCES).id;
  const stance = PUBLIC_STANCES.find(s => s.id === stanceId) ?? PUBLIC_STANCES[0];
  const activism = socialCause?.id === 'NONE'
    ? ACTIVISM_STYLES[0]
    : pick(ACTIVISM_STYLES);
  const projectPool = PROJECT_BLUEPRINTS[socialCause?.id ?? 'NONE'] ?? PROJECT_BLUEPRINTS.NONE;
  const controversyRisk = clamp(Math.round(stance.heat + (persona === 'CONFRONTATIONAL' ? 18 : 0) + (mkt > 70 ? 6 : 0)), 1, 100);
  return {
    stance,
    activism,
    flagshipProject: {
      causeId: socialCause?.id ?? 'NONE',
      label: pick(projectPool),
      maturity: mkt > 70 ? 'institucionalizado' : mkt > 45 ? 'em expansão' : 'embrionário',
      hometownLink: chance(origin?.bornInNativeCntry ? 0.65 : 0.35),
    },
    controversyRisk,
    nationalIdentity: origin?.bornInNativeCntry ? 'forte ligação com o país natal' : 'identidade internacionalizada',
    quoteSeed: stance.id === 'APOLITICAL'
      ? 'eu tento ajudar sem transformar tudo em palanque'
      : stance.id === 'ANTI_ESTABLISHMENT'
      ? 'se ninguem incomodar as instituicoes, nada muda'
      : stance.id === 'NATIONAL_SYMBOL'
      ? 'representar um pais pesa, mas tambem dá chão'
      : 'ter voz pública não pode ser só marketing',
  };
}

// ═══════════════════════════════════════════════════════════════════
// 10. RIQUEZA — veículos e propriedades
// ═══════════════════════════════════════════════════════════════════

export function computeWealthTier(player) {
  const career  = player.finance?.careerEarnings ?? 0;
  const sponsor = (player.personality?.marketability?.score ?? 0) * 200_000;
  const total   = career + sponsor;
  if (total > 30_000_000) return { id:'BILLIONAIRE_TIER', label:'Ultra-riqueza',  range:'30M+' };
  if (total > 15_000_000) return { id:'VERY_WEALTHY',     label:'Muito rico',     range:'15–30M' };
  if (total >  5_000_000) return { id:'WEALTHY',          label:'Rico',           range:'5–15M' };
  if (total >  1_000_000) return { id:'COMFORTABLE',      label:'Confortável',    range:'1–5M' };
  return                          { id:'DEVELOPING',       label:'Em construção',  range:'<1M' };
}

const VEHICLE_CATALOG = {
  BILLIONAIRE_TIER: [
    { type:'car',  brand:'Ferrari',     label:'Ferrari SF90 Stradale'          },
    { type:'car',  brand:'Lamborghini', label:'Lamborghini Urus S'             },
    { type:'car',  brand:'Bugatti',     label:'Bugatti Chiron Sport'           },
    { type:'car',  brand:'Rolls-Royce', label:'Rolls-Royce Cullinan'           },
    { type:'car',  brand:'Porsche',     label:'Porsche 911 GT3 RS'             },
    { type:'car',  brand:'McLaren',     label:'McLaren 720S'                   },
    { type:'car',  brand:'Mercedes',    label:'Mercedes-AMG G63'               },
    { type:'car',  brand:'Aston Martin',label:'Aston Martin DBS Superleggera'  },
    { type:'boat', brand:'Ferretti',    label:'iate Ferretti 50m'              },
    { type:'bike', brand:'Ducati',      label:'Ducati Panigale V4 S'           },
    { type:'jet',  brand:'Gulfstream',  label:'jato particular G650'           },
  ],
  VERY_WEALTHY: [
    { type:'car',  brand:'Porsche',     label:'Porsche Cayenne Turbo GT'       },
    { type:'car',  brand:'Land Rover',  label:'Range Rover SVAutobiography'    },
    { type:'car',  brand:'Ferrari',     label:'Ferrari Roma'                   },
    { type:'car',  brand:'Bentley',     label:'Bentley Bentayga Speed'         },
    { type:'car',  brand:'Mercedes',    label:'Mercedes-AMG SL 63'             },
    { type:'car',  brand:'BMW',         label:'BMW M8 Competition'             },
    { type:'car',  brand:'Lamborghini', label:'Lamborghini Huracán EVO'        },
    { type:'boat', brand:'Sunseeker',   label:'lancha Sunseeker 55'            },
    { type:'bike', brand:'Porsche',     label:'Porsche eBike Cross'            },
  ],
  WEALTHY: [
    { type:'car',  brand:'Porsche',     label:'Porsche 911 Carrera S'          },
    { type:'car',  brand:'BMW',         label:'BMW M5 Competition'             },
    { type:'car',  brand:'Audi',        label:'Audi RS7 Sportback'             },
    { type:'car',  brand:'Mercedes',    label:'Mercedes AMG C63 S'             },
    { type:'car',  brand:'Land Rover',  label:'Range Rover Sport V8'           },
    { type:'car',  brand:'Tesla',       label:'Tesla Model S Plaid'            },
    { type:'car',  brand:'Porsche',     label:'Porsche Macan GTS'              },
    { type:'bike', brand:'Harley',      label:'Harley-Davidson Fat Bob'        },
  ],
  COMFORTABLE: [
    { type:'car', brand:'BMW',        label:'BMW 5 Series'             },
    { type:'car', brand:'Audi',       label:'Audi A6 Avant'            },
    { type:'car', brand:'Mercedes',   label:'Mercedes C220 AMG Line'   },
    { type:'car', brand:'Volkswagen', label:'Volkswagen Golf R'         },
    { type:'car', brand:'Toyota',     label:'Toyota Land Cruiser'       },
  ],
  DEVELOPING: [
    { type:'car', brand:'Volkswagen', label:'Volkswagen Polo'  },
    { type:'car', brand:'Honda',      label:'Honda Civic'      },
    { type:'car', brand:'Toyota',     label:'Toyota Corolla'   },
  ],
};

VEHICLE_CATALOG.BILLIONAIRE_TIER.push(
  { type:'car', brand:'Ferrari', label:'Ferrari Daytona SP3' },
  { type:'car', brand:'Ferrari', label:'Ferrari 812 Competizione' },
  { type:'car', brand:'Lamborghini', label:'Lamborghini Revuelto' },
  { type:'car', brand:'Lamborghini', label:'Lamborghini Aventador SVJ Roadster' },
  { type:'car', brand:'Bugatti', label:'Bugatti Mistral' },
  { type:'car', brand:'Bugatti', label:'Bugatti Divo' },
  { type:'car', brand:'Koenigsegg', label:'Koenigsegg Jesko Absolut' },
  { type:'car', brand:'Pagani', label:'Pagani Huayra Roadster BC' },
  { type:'car', brand:'Rimac', label:'Rimac Nevera' },
  { type:'car', brand:'Rolls-Royce', label:'Rolls-Royce Phantom EWB' },
  { type:'car', brand:'Rolls-Royce', label:'Rolls-Royce Spectre' },
  { type:'car', brand:'Bentley', label:'Bentley Flying Spur Mulliner' },
  { type:'car', brand:'Aston Martin', label:'Aston Martin Valkyrie' },
  { type:'car', brand:'McLaren', label:'McLaren Speedtail' },
  { type:'car', brand:'Mercedes', label:'Mercedes-Maybach S 680' },
  { type:'car', brand:'Porsche', label:'Porsche 918 Spyder' },
  { type:'car', brand:'Land Rover', label:'Range Rover SV Carmel Edition' },
  { type:'bike', brand:'Ducati', label:'Ducati Superleggera V4' },
  { type:'bike', brand:'MV Agusta', label:'MV Agusta Superveloce 1000' },
  { type:'boat', brand:'Riva', label:'Riva 88 Folgore' },
  { type:'boat', brand:'Azimut', label:'Azimut Grande 36M' },
  { type:'jet', brand:'Bombardier', label:'Bombardier Global 7500' },
  { type:'jet', brand:'Dassault', label:'Dassault Falcon 8X' },
  { type:'heli', brand:'Airbus', label:'helicóptero Airbus ACH160' },
);

VEHICLE_CATALOG.VERY_WEALTHY.push(
  { type:'car', brand:'Ferrari', label:'Ferrari Purosangue' },
  { type:'car', brand:'Ferrari', label:'Ferrari F8 Tributo' },
  { type:'car', brand:'McLaren', label:'McLaren Artura' },
  { type:'car', brand:'Aston Martin', label:'Aston Martin DB12' },
  { type:'car', brand:'Maserati', label:'Maserati MC20' },
  { type:'car', brand:'Porsche', label:'Porsche 911 Turbo S' },
  { type:'car', brand:'Porsche', label:'Porsche Taycan Turbo S' },
  { type:'car', brand:'Bentley', label:'Bentley Continental GT Speed' },
  { type:'car', brand:'Rolls-Royce', label:'Rolls-Royce Ghost' },
  { type:'car', brand:'Mercedes', label:'Mercedes-Maybach GLS 600' },
  { type:'car', brand:'BMW', label:'BMW XM Label Red' },
  { type:'car', brand:'Audi', label:'Audi RS e-tron GT' },
  { type:'car', brand:'Lotus', label:'Lotus Emira' },
  { type:'car', brand:'Lucid', label:'Lucid Air Sapphire' },
  { type:'bike', brand:'BMW Motorrad', label:'BMW M 1000 RR' },
  { type:'bike', brand:'Ducati', label:'Ducati Diavel V4' },
  { type:'boat', brand:'Riva', label:'Riva Aquariva Super' },
  { type:'boat', brand:'Princess', label:'Princess V55' },
);

VEHICLE_CATALOG.WEALTHY.push(
  { type:'car', brand:'Porsche', label:'Porsche 718 Cayman GT4 RS' },
  { type:'car', brand:'Porsche', label:'Porsche Panamera Turbo E-Hybrid' },
  { type:'car', brand:'Mercedes', label:'Mercedes-AMG GT 63' },
  { type:'car', brand:'Mercedes', label:'Mercedes EQS 580' },
  { type:'car', brand:'BMW', label:'BMW M3 Competition Touring' },
  { type:'car', brand:'BMW', label:'BMW i7 xDrive60' },
  { type:'car', brand:'Audi', label:'Audi RS6 Avant Performance' },
  { type:'car', brand:'Audi', label:'Audi SQ8 e-tron' },
  { type:'car', brand:'Lexus', label:'Lexus LC 500' },
  { type:'car', brand:'Maserati', label:'Maserati Grecale Trofeo' },
  { type:'car', brand:'Alfa Romeo', label:'Alfa Romeo Giulia Quadrifoglio' },
  { type:'car', brand:'Genesis', label:'Genesis G90' },
  { type:'car', brand:'Tesla', label:'Tesla Model X Plaid' },
  { type:'car', brand:'Rivian', label:'Rivian R1S' },
  { type:'car', brand:'Cadillac', label:'Cadillac Escalade-V' },
  { type:'bike', brand:'Triumph', label:'Triumph Rocket 3 Storm' },
  { type:'bike', brand:'Harley', label:'Harley-Davidson CVO Road Glide' },
);

VEHICLE_CATALOG.COMFORTABLE.push(
  { type:'car', brand:'Volvo', label:'Volvo XC90 Recharge' },
  { type:'car', brand:'Lexus', label:'Lexus RX 500h' },
  { type:'car', brand:'Genesis', label:'Genesis GV80' },
  { type:'car', brand:'Audi', label:'Audi Q5 Sportback' },
  { type:'car', brand:'BMW', label:'BMW X3 M40i' },
  { type:'car', brand:'Mercedes', label:'Mercedes GLC 300' },
  { type:'car', brand:'Tesla', label:'Tesla Model Y Performance' },
  { type:'car', brand:'Polestar', label:'Polestar 2 Performance' },
  { type:'car', brand:'Mini', label:'Mini John Cooper Works' },
  { type:'car', brand:'Cupra', label:'Cupra Formentor VZ5' },
  { type:'car', brand:'Subaru', label:'Subaru Outback Touring XT' },
  { type:'bike', brand:'Yamaha', label:'Yamaha Ténéré 700' },
  { type:'bike', brand:'BMW Motorrad', label:'BMW R 1250 GS' },
);

VEHICLE_CATALOG.DEVELOPING.push(
  { type:'car', brand:'Mazda', label:'Mazda 3 Hatchback' },
  { type:'car', brand:'Hyundai', label:'Hyundai i30 N Line' },
  { type:'car', brand:'Kia', label:'Kia Sportage' },
  { type:'car', brand:'Seat', label:'Seat Leon FR' },
  { type:'car', brand:'Peugeot', label:'Peugeot 308 GT' },
  { type:'car', brand:'Renault', label:'Renault Clio Esprit Alpine' },
  { type:'car', brand:'Skoda', label:'Skoda Octavia RS' },
  { type:'car', brand:'Ford', label:'Ford Focus ST' },
  { type:'car', brand:'Nissan', label:'Nissan Qashqai' },
  { type:'scooter', brand:'Vespa', label:'Vespa GTS 300' },
);

function rollVehicles(tierId) {
  const catalog = VEHICLE_CATALOG[tierId] ?? VEHICLE_CATALOG.DEVELOPING;
  const n = { BILLIONAIRE_TIER:randInt(3,5), VERY_WEALTHY:randInt(2,4), WEALTHY:randInt(2,3), COMFORTABLE:2, DEVELOPING:1 }[tierId] ?? 1;
  return pickN(catalog, n);
}

const MONEY_PHILOSOPHIES = [
  { id:'QUIET_SECURITY', label:'segurança silenciosa', risk:12, desc:'Investe para nunca depender de fama, sem exibir demais.' },
  { id:'LEGACY_BUILDER', label:'construtor de legado', risk:28, desc:'Compra ativos que contem história: academias, imóveis, projetos locais.' },
  { id:'LUXURY_COLLECTOR', label:'colecionador de luxo', risk:55, desc:'Gosta de carros, relógios, arte e objetos com aura de raridade.' },
  { id:'EXPERIENCE_FIRST', label:'experiências acima de posse', risk:34, desc:'Prefere viagens, gastronomia, lugares e vivências a acumular garagem.' },
  { id:'AGGRESSIVE_INVESTOR', label:'investidor agressivo', risk:72, desc:'Topa risco, startups, cripto, equity e apostas empresariais.' },
  { id:'FAMILY_OFFICE', label:'mentalidade family office', risk:22, desc:'Tudo passa por equipe financeira, proteção patrimonial e longo prazo.' },
  { id:'ANTI_FLASH', label:'anti-ostentação', risk:8, desc:'Tem dinheiro, mas sente desconforto quando o luxo vira personagem principal.' },
];

const LUXURY_SIGNATURES = [
  { id:'WATCHES', label:'relógios raros', objects:['Rolex Daytona vintage','Patek Philippe Nautilus','Audemars Piguet Royal Oak','Richard Mille tourbillon'] },
  { id:'CARS', label:'garagem emocional', objects:['Porsche de track day','Ferrari de fim de semana','SUV blindado discreto','clássico restaurado'] },
  { id:'ART', label:'arte contemporânea', objects:['telas abstratas','fotografia esportiva autoral','esculturas minimalistas','arte latino-americana'] },
  { id:'WINE', label:'adega e vinhos', objects:['Bordeaux antigos','Barolo de guarda','Champagne raro','vinhos naturais de pequenos produtores'] },
  { id:'DESIGN', label:'design e arquitetura', objects:['móveis italianos','luminárias de galeria','casas assinadas por arquiteto','peças escandinavas'] },
  { id:'TECH', label:'tecnologia premium', objects:['simulador esportivo em casa','estúdio de recovery','sala de dados do treino','wearables experimentais'] },
  { id:'TRAVEL', label:'viagens de assinatura', objects:['ilhas privadas','trens de luxo','retiros remotos','hotéis históricos'] },
];

const INVESTMENT_PORTFOLIOS = [
  { id:'REAL_ESTATE', label:'imóveis internacionais', risk:24 },
  { id:'SPORTS_TECH', label:'sportstech e dados de performance', risk:52 },
  { id:'HOSPITALITY', label:'hotéis, restaurantes e beach clubs', risk:44 },
  { id:'FASHION_BEAUTY', label:'moda, beleza e licenciamento', risk:48 },
  { id:'GREEN_ASSETS', label:'energia limpa e sustentabilidade', risk:38 },
  { id:'LOCAL_BUSINESS', label:'negócios no país natal', risk:32 },
  { id:'CRYPTO_STARTUPS', label:'cripto e startups especulativas', risk:82 },
  { id:'CONSERVATIVE_FUNDS', label:'fundos conservadores e renda fixa', risk:14 },
];

function rollLifestyleFinance(player, tierId, vehicles, properties) {
  const pId = player.personality?.pressPersona?.id;
  const mkt = player.personality?.marketability?.score ?? 30;
  const philosophyBias = {
    RESERVED:'ANTI_FLASH',
    ENIGMATIC:'QUIET_SECURITY',
    INTELLECTUAL:'LEGACY_BUILDER',
    CHARISMATIC:'EXPERIENCE_FIRST',
    SHOWMAN:'LUXURY_COLLECTOR',
    CONFRONTATIONAL:'AGGRESSIVE_INVESTOR',
    DIPLOMATIC:'FAMILY_OFFICE',
  };
  const selectedPhilosophy = MONEY_PHILOSOPHIES.find(p => p.id === philosophyBias[pId])
    ?? pick(MONEY_PHILOSOPHIES);
  const signatureCount = ['BILLIONAIRE_TIER','VERY_WEALTHY'].includes(tierId) ? 2 : tierId === 'WEALTHY' ? 1 : chance(0.35) ? 1 : 0;
  const signatures = pickN(LUXURY_SIGNATURES, signatureCount).map(sig => ({
    ...sig,
    favoriteObject: pick(sig.objects),
  }));
  const portfolioCount = ['BILLIONAIRE_TIER','VERY_WEALTHY'].includes(tierId) ? 3 : tierId === 'WEALTHY' ? 2 : 1;
  const portfolio = pickN(INVESTMENT_PORTFOLIOS, portfolioCount);
  const visibleLuxury = clamp(
    Math.round((mkt / 2) + (selectedPhilosophy.risk / 2) + (vehicles?.length ?? 0) * 5 + (properties?.length ?? 0) * 4),
    1,
    100
  );
  return {
    philosophy: selectedPhilosophy,
    signatures,
    portfolio,
    visibleLuxury,
    riskAppetite: clamp(Math.round((selectedPhilosophy.risk + portfolio.reduce((s, p) => s + p.risk, 0) / Math.max(1, portfolio.length)) / 2), 1, 100),
    spendingMood: visibleLuxury > 70 ? 'ostensivo' : visibleLuxury > 45 ? 'seletivo' : 'discreto',
    moneyQuoteSeed: selectedPhilosophy.id === 'ANTI_FLASH'
      ? 'dinheiro bom e o que compra silencio'
      : selectedPhilosophy.id === 'LEGACY_BUILDER'
      ? 'eu penso em deixar estruturas, nao so trofeus'
      : selectedPhilosophy.id === 'LUXURY_COLLECTOR'
      ? 'algumas coisas contam uma historia mecanica e estetica'
      : 'dinheiro precisa comprar liberdade, nao ansiedade',
  };
}

// ═══════════════════════════════════════════════════════════════════
// 11. CÍRCULO SOCIAL
// ═══════════════════════════════════════════════════════════════════

const SOCIAL_CIRCLES = [
  { id:'TOUR_FRIENDS',      label:'amigos do circuito',            desc:'Amizades construídas em anos de vestiário compartilhado.' },
  { id:'CHILDHOOD_FRIENDS', label:'amigos de infância',            desc:'Mantém contato com quem conheceu antes da fama.' },
  { id:'CELEBRITY_CIRCLE',  label:'celebridades e artistas',       desc:'Frequenta os mesmos eventos que atores e músicos.' },
  { id:'BUSINESS_NETWORK',  label:'rede de empresários',           desc:'O entorno é de CEOs, investidores e empreendedores.' },
  { id:'FAMILY_CENTERED',   label:'família como círculo principal', desc:'Poucos amigos fora da família. Vida social privada.' },
  { id:'MIXED_WIDE',        label:'círculo amplo e variado',       desc:'Conhece todo tipo de gente. Agenda social sempre cheia.' },
];

const NIGHTLIFE_PROFILES = [
  { id:'PARTY_ANIMAL', label:'agitado fora das temporadas',   desc:'Festas e eventos são parte do off-season.' },
  { id:'SELECTIVE',    label:'seletivo — só as certas',       desc:'Aparece nas festas certas. Não em todas.' },
  { id:'HOMEBODY',     label:'jantar com amigos próximos',    desc:'Prefere ambientes pequenos e conhecidos.' },
  { id:'ABSTINENT',    label:'não bebe, não frequenta',       desc:'Regime rígido. Vida social quase inexistente fora dos treinos.' },
];

function rollSocialCircle(player) {
  const pId = player.personality?.pressPersona?.id;
  const aId = player.personality?.competitiveArchetype?.id;
  const cId = { CHARISMATIC:'MIXED_WIDE', SHOWMAN:'CELEBRITY_CIRCLE', CONFRONTATIONAL:'TOUR_FRIENDS',
                RESERVED:'FAMILY_CENTERED', ENIGMATIC:'FAMILY_CENTERED', INTELLECTUAL:'BUSINESS_NETWORK',
                DIPLOMATIC:'MIXED_WIDE' }[pId] ?? pick(SOCIAL_CIRCLES).id;
  const nId = { SHOWMAN:'PARTY_ANIMAL', CHARISMATIC:'SELECTIVE', PERFECTIONIST:'ABSTINENT',
                WARRIOR:'HOMEBODY', REBEL:'PARTY_ANIMAL' }[aId ?? pId] ?? pick(NIGHTLIFE_PROFILES).id;
  return {
    circle:    SOCIAL_CIRCLES.find(s => s.id === cId) ?? pick(SOCIAL_CIRCLES),
    nightlife: NIGHTLIFE_PROFILES.find(n => n.id === nId) ?? pick(NIGHTLIFE_PROFILES),
  };
}

// ═══════════════════════════════════════════════════════════════════
// 12. PRESENÇA NAS REDES SOCIAIS
// ═══════════════════════════════════════════════════════════════════

const SOCIAL_MEDIA_STYLES = [
  { id:'BRAND_FOCUSED',  label:'conteúdo de marca — profissional', desc:'Posts cuidadosos. Cada publicação tem estratégia.'         },
  { id:'BEHIND_SCENES',  label:'bastidores autênticos',            desc:'Academia, voos, treinos. Parece real.'                     },
  { id:'FAMILY_CONTENT', label:'foco na família',                  desc:'Filhos, parceiro(a), momentos domésticos.'                 },
  { id:'CAUSE_DRIVEN',   label:'ativismo e causas',                desc:'Plataforma usada para posicionamento social.'              },
  { id:'TENNIS_ONLY',    label:'só tênis — resultados e treinos',  desc:'Zero vida pessoal. Puramente profissional.'               },
  { id:'SPORADIC',       label:'pouco presente e irregular',       desc:'Sumiu por meses. Volta com 3 posts seguidos.'              },
  { id:'SILENT',         label:'sem presença digital significativa', desc:'Pouca ou nenhuma atividade online.'                      },
];

const FOLLOWING_TIERS = [
  { id:'MICRO', label:'público nicho',      range:'10k–100k'  },
  { id:'MID',   label:'audiência média',    range:'100k–1M'   },
  { id:'LARGE', label:'grande audiência',   range:'1M–5M'     },
  { id:'MEGA',  label:'celebridade digital',range:'5M–20M'    },
  { id:'ICONIC',label:'ícone das redes',    range:'20M+'      },
];

function rollMediaPresence(player) {
  const mkt = player.personality?.marketability?.score ?? 30;
  const pId = player.personality?.pressPersona?.id;
  const ftId = mkt > 85 ? weighted([{id:'MEGA',w:40},{id:'ICONIC',w:30},{id:'LARGE',w:30}])
    : mkt > 65 ? weighted([{id:'LARGE',w:45},{id:'MEGA',w:30},{id:'MID',w:25}])
    : mkt > 45 ? weighted([{id:'MID',w:50},{id:'LARGE',w:25},{id:'MICRO',w:25}])
    : weighted([{id:'MICRO',w:55},{id:'MID',w:35},{id:'LARGE',w:10}]);
  const sId = { CHARISMATIC:'BEHIND_SCENES', SHOWMAN:'BRAND_FOCUSED', RESERVED:'SILENT',
                ENIGMATIC:'SPORADIC', DIPLOMATIC:'BRAND_FOCUSED', CONFRONTATIONAL:'CAUSE_DRIVEN',
                INTELLECTUAL:'CAUSE_DRIVEN' }[pId] ?? pick(SOCIAL_MEDIA_STYLES).id;
  return {
    style:     SOCIAL_MEDIA_STYLES.find(s => s.id === sId) ?? pick(SOCIAL_MEDIA_STYLES),
    following: FOLLOWING_TIERS.find(t => t.id === ftId) ?? FOLLOWING_TIERS[0],
  };
}

// ═══════════════════════════════════════════════════════════════════
// 13. ESTILO E MODA
// ═══════════════════════════════════════════════════════════════════

const STYLE_PROFILES = [
  { id:'LUXURY_CLASSIC',  label:'luxo clássico',         desc:'Ternos sob medida, Oxford. Elegância atemporal.',        brands:['Armani','Tom Ford','Rolex','Berluti']              },
  { id:'STREETWEAR',      label:'streetwear e urbano',   desc:'Supreme, sneakers raros, oversized. Sempre atualizado.', brands:['Supreme','Off-White','Jordan','Stone Island']      },
  { id:'SPORTY_MINIMAL',  label:'esportivo minimalista', desc:'Funcional fora e dentro de quadra. Sem exagero.',        brands:['Nike','Lululemon','Veja','Reiss']                  },
  { id:'FASHION_FORWARD', label:'vanguarda da moda',     desc:'Aparece em fashion weeks. Riscos calculados no visual.', brands:['Balenciaga','Rick Owens','Dior','Valentino']       },
  { id:'CASUAL_CLEAN',    label:'casual limpo',          desc:'Calça boa, camiseta branca, tênis certo. Simples.',      brands:['A.P.C.','Acne Studios','New Balance','Carhartt']   },
  { id:'CULTURAL_PRIDE',  label:'identidade cultural',   desc:'Veste artistas e marcas do país de origem.',            brands:[]                                                   },
  { id:'NO_STYLE',        label:'indiferente à moda',    desc:'Conforto acima de tudo. Moda não é assunto.',           brands:[]                                                   },
];

const WATCH_BRANDS = ['Rolex','Patek Philippe','Audemars Piguet','Richard Mille','Omega','TAG Heuer','IWC','Hublot','Cartier','Breitling'];

function rollStyle(player) {
  const pId  = player.personality?.pressPersona?.id;
  const aId  = player.personality?.competitiveArchetype?.id;
  const mkt  = player.personality?.marketability?.score ?? 30;
  const sId  = { CHARISMATIC:'LUXURY_CLASSIC', SHOWMAN:'FASHION_FORWARD', RESERVED:'CASUAL_CLEAN',
                 ENIGMATIC:'FASHION_FORWARD',  DIPLOMATIC:'LUXURY_CLASSIC', CONFRONTATIONAL:'STREETWEAR',
                 INTELLECTUAL:'CASUAL_CLEAN',  REBEL:'STREETWEAR', PREDATOR:'LUXURY_CLASSIC' }[pId ?? aId]
               ?? pick(STYLE_PROFILES).id;
  return {
    profile:    STYLE_PROFILES.find(s => s.id === sId) ?? pick(STYLE_PROFILES),
    watchBrand: chance(mkt > 60 ? 0.70 : 0.35) ? pick(WATCH_BRANDS) : null,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 14. DIETA E SONO
// ═══════════════════════════════════════════════════════════════════

const DIET_PROFILES = [
  { id:'STANDARD_ATHLETE', label:'dieta atlética padrão',        desc:'Alta proteína, carboidratos controlados. Sem restrições rígidas.' },
  { id:'MEDITERRANEAN',    label:'dieta mediterrânea',           desc:'Azeite, peixe, legumes. Influência da origem europeia.' },
  { id:'VEGAN',            label:'vegano',                       desc:'Zero produtos de origem animal. Compromisso público.' },
  { id:'VEGETARIAN',       label:'vegetariano',                  desc:'Sem carne. Laticínios e ovos permitidos.' },
  { id:'GLUTEN_FREE',      label:'sem glúten',                   desc:'Intolerância ou escolha. Afeta o cardápio na tournée.' },
  { id:'PALEO',            label:'paleolítica',                  desc:'Sem processados, sem laticínios. Influência de nutricionista.' },
  { id:'FLEXIBLE',         label:'flexível — come de tudo',      desc:'Come bem, sem obsessão. Gelato após título em Roma é permitido.' },
  { id:'STRICT_PROTOCOL',  label:'protocolo nutricional rígido', desc:'Nutricionista define tudo. Cada grama é pesada em torneio.' },
];

const SLEEP_HABITS = [
  { id:'STRICT_EARLY',  label:'22h às 6h — regime de atleta',    desc:'8h de sono. Sem exceção em período de torneio.' },
  { id:'NATURAL',       label:'7–8h, horário natural',           desc:'Dorme bem, sem protocolo elaborado.' },
  { id:'NIGHT_OWL',     label:'dorme tarde, compensa na viagem', desc:'Funciona à noite. Tenta compensar nos dias livres.' },
  { id:'TRACKED',       label:'sono rastreado — wearable',       desc:'Dados de sono influenciam decisões de treino.' },
  { id:'POWER_NAPPER',  label:'cochilo pós-treino',              desc:'20 minutos após cada treino. Inegociável.' },
];

function rollDiet(player) {
  const aId   = player.personality?.competitiveArchetype?.id;
  const dId   = { PERFECTIONIST:'STRICT_PROTOCOL', WARRIOR:'STANDARD_ATHLETE', PREDATOR:'PALEO',
                  DREAMER:'VEGETARIAN', DIPLOMAT:'MEDITERRANEAN', REBEL:'FLEXIBLE' }[aId]
                ?? pick(DIET_PROFILES).id;
  return {
    diet:  DIET_PROFILES.find(d => d.id === dId) ?? pick(DIET_PROFILES),
    sleep: pick(SLEEP_HABITS),
  };
}

// ═══════════════════════════════════════════════════════════════════
// 15. IMAGEM PÚBLICA
// ═══════════════════════════════════════════════════════════════════

const PUBLIC_IMAGE_PROFILES = {
  GLOBETROTTER:  { id:'GLOBETROTTER',  label:'Viajante global',           desc:'Sempre sendo visto em destinos diferentes.' },
  HOMEBODY:      { id:'HOMEBODY',      label:'Caseiro',                   desc:'Prefere privacidade. Raramente aparece em eventos.' },
  SOCIALITE:     { id:'SOCIALITE',     label:'Socialite',                 desc:'Presente em eventos, galas e festas da alta sociedade.' },
  ACTIVIST:      { id:'ACTIVIST',      label:'Ativista',                  desc:'Usa a plataforma para causas sociais ativamente.' },
  ENTREPRENEUR:  { id:'ENTREPRENEUR',  label:'Empresário',                desc:'Constrói negócios paralelos à carreira.' },
  FAMILY_FIRST:  { id:'FAMILY_FIRST',  label:'Família em primeiro',       desc:'A família está sempre presente. Tudo gira ao redor deles.' },
  MEDIA_DARLING: { id:'MEDIA_DARLING', label:'Queridinho da mídia',       desc:'Cobre revistas, podcasts, documentários.' },
  LOW_PROFILE:   { id:'LOW_PROFILE',   label:'Baixo perfil',              desc:'Existe apenas no tênis. O resto é silêncio.' },
  TRENDSETTER:   { id:'TRENDSETTER',   label:'Referência de estilo',      desc:'O que usa vira tendência. Colaborações de moda.' },
  PHILOSOPHER:   { id:'PHILOSOPHER',   label:'O pensador do circuito',    desc:'Entrevistas citam filosofia, arte, política.' },
};

function rollPublicImage(player, cause) {
  const pId = player.personality?.pressPersona?.id;
  const aId = player.personality?.competitiveArchetype?.id;
  const mkt = player.personality?.marketability?.score ?? 30;
  const bias = {};
  if (pId === 'CHARISMATIC' || pId === 'SHOWMAN') { bias.SOCIALITE = 15; bias.MEDIA_DARLING = 10; }
  if (pId === 'RESERVED' || pId === 'ENIGMATIC')  { bias.LOW_PROFILE = 15; bias.HOMEBODY = 10; }
  if (pId === 'INTELLECTUAL')                      { bias.PHILOSOPHER = 15; }
  if (pId === 'SHOWMAN' && mkt > 70)               { bias.TRENDSETTER = 12; }
  if (aId === 'WARRIOR')                           { bias.FAMILY_FIRST = 8; }
  if (aId === 'DIPLOMAT')                          { bias.ACTIVIST = 10; }
  if (aId === 'PREDATOR')                          { bias.ENTREPRENEUR = 8; }
  if (mkt > 75)                                    { bias.MEDIA_DARLING = (bias.MEDIA_DARLING ?? 0) + 8; }
  if (cause?.id && cause.id !== 'NONE')            { bias.ACTIVIST = (bias.ACTIVIST ?? 0) + 10; }
  const pool = Object.keys(PUBLIC_IMAGE_PROFILES).map(id => ({ id, weight: 10 + (bias[id] ?? 0) }));
  return PUBLIC_IMAGE_PROFILES[weighted(pool)];
}

// ═══════════════════════════════════════════════════════════════════
// GERADOR PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

export function generateLifeData(player) {
  const age = player.age ?? (2025 - (player.birthYear ?? 2000));

  const relId      = rollRelationshipStatus(age);
  const relDef     = RELATIONSHIP_STATUS[relId];
  const partner    = rollPartnerDetails(player, relId);
  const children   = rollChildren(relId, age);
  const familyPlan = rollFamilyPlans(relId, age, children);
  const relationshipHistory = buildRelationshipHistory(relId, partner, age);
  const pets       = rollPets(player);
  const origin     = rollOrigin(player, age);
  const education  = rollEducation(age, origin.upbringing.id);
  const homeCity   = rollHomeCity(player);
  const places     = rollFavoritePlaces(player, homeCity);
  const wealthTier = computeWealthTier(player);
  const properties = rollProperties(wealthTier.id, homeCity);
  const training   = rollTrainingProfile(player);
  const hobbies    = rollHobbies(player);
  const languages  = rollLanguages(player.nationality, hobbies);
  const socialCause= pickSocialCause(player);
  const faith      = rollFaith(player.nationality);
  const publicValues = rollPublicValues(player, socialCause, origin);
  const vehicles   = rollVehicles(wealthTier.id);
  const lifestyleFinance = rollLifestyleFinance(player, wealthTier.id, vehicles, properties);
  const social     = rollSocialCircle(player);
  const media      = rollMediaPresence(player);
  const style      = rollStyle(player);
  const dietSleep  = rollDiet(player);
  const publicImage= rollPublicImage(player, socialCause);

  return {
    personal:    { relationshipStatus: relDef, partner, children, familyPlan, relationshipHistory, pets },
    origin,
    education,
    home:        { city: homeCity.city, country: homeCity.country ?? player.nationality, taxHaven: homeCity.taxHaven, properties, trainingBase: training.trainingBase },
    places,
    training:    { offSeason: training.offSeason, recovery: training.recovery, superstitions: training.superstitions },
    interests:   { hobbies, languages },
    values:      { socialCause, faith, publicValues },
    wealth:      { tier: wealthTier, vehicles, lifestyle: lifestyleFinance },
    social:      { circle: social.circle, nightlife: social.nightlife },
    media,
    style,
    diet:        dietSleep.diet,
    sleep:       dietSleep.sleep,
    publicImage,
  };
}

// ═══════════════════════════════════════════════════════════════════
// MIGRAÇÃO
// ═══════════════════════════════════════════════════════════════════

export function migratePlayerLifeData(player) {
  if (player.lifeData) {
    const homeCity = {
      city: player.lifeData.home?.city ?? null,
      country: player.lifeData.home?.country ?? player.nationality,
      taxHaven: !!player.lifeData.home?.taxHaven,
    };
    const personal = player.lifeData.personal ?? {};
    const children = personal.children ?? { has:false, count:0, list:[] };
    const relId = personal.relationshipStatus?.id ?? 'SINGLE';
    const nextLifeData = {
      ...player.lifeData,
      places: player.lifeData.places ?? rollFavoritePlaces(player, homeCity),
      values: {
        ...(player.lifeData.values ?? {}),
        publicValues: player.lifeData.values?.publicValues ?? rollPublicValues(
          player,
          player.lifeData.values?.socialCause ?? SOCIAL_CAUSES.find(c => c.id === 'NONE'),
          player.lifeData.origin
        ),
      },
      wealth: {
        ...(player.lifeData.wealth ?? {}),
        lifestyle: player.lifeData.wealth?.lifestyle ?? rollLifestyleFinance(
          player,
          player.lifeData.wealth?.tier?.id ?? computeWealthTier(player).id,
          player.lifeData.wealth?.vehicles ?? [],
          player.lifeData.home?.properties ?? []
        ),
      },
      personal: {
        ...personal,
        children: {
          has: !!children.has,
          count: children.count ?? children.list?.length ?? 0,
          list: (children.list ?? []).map(c => ({
            ...c,
            bornWhenPlayerAge: c.bornWhenPlayerAge ?? Math.max(18, (player.age ?? 25) - (c.age ?? 0)),
            personality: c.personality ?? pick(CHILD_PERSONALITIES),
            visibility: c.visibility ?? 'protegido da imprensa',
          })),
        },
        familyPlan: personal.familyPlan ?? rollFamilyPlans(relId, player.age ?? 25, children),
        relationshipHistory: personal.relationshipHistory ?? buildRelationshipHistory(relId, personal.partner, player.age ?? 25),
      },
    };
    return { ...player, lifeData: nextLifeData };
  }
  return { ...player, lifeData: generateLifeData(player) };
}

// ═══════════════════════════════════════════════════════════════════
// DISPLAY HELPERS
// ═══════════════════════════════════════════════════════════════════

export function describePersonalLife(player) {
  const ld = player.lifeData;
  if (!ld) return 'Dados não disponíveis';
  const parts = [ld.personal.relationshipStatus.label];
  if (ld.personal.partner?.public) parts[0] += ` com ${ld.personal.partner.label.toLowerCase()}`;
  if (ld.personal.children?.has)   parts.push(`${ld.personal.children.count} filho${ld.personal.children.count > 1 ? 's' : ''}`);
  if (ld.personal.familyPlan?.label) parts.push(ld.personal.familyPlan.label);
  if (ld.personal.pets?.has)       parts.push(ld.personal.pets.label);
  return parts.join(', ');
}

export function describeHome(player) {
  const ld = player.lifeData;
  if (!ld) return '';
  const main = ld.home.properties?.find(p => p.main);
  const loc  = ld.home.city ? `${ld.home.city} (${ld.home.country})` : ld.home.country;
  const tax  = ld.home.taxHaven ? ' [paraíso fiscal]' : '';
  return main ? `${main.label} em ${loc}${tax}` : `Mora em ${loc}${tax}`;
}

export function describeHobbies(player) {
  const ld = player.lifeData;
  if (!ld?.interests?.hobbies?.length) return '';
  return ld.interests.hobbies.map(h => h.level ? `${h.label} (${h.level})` : h.label).join(', ');
}

export function describeOrigin(player) {
  const ld = player.lifeData;
  if (!ld?.origin) return '';
  return [ld.origin.upbringing.label, ld.origin.howStarted?.label].filter(Boolean).join(' — ');
}

export function describeVehicles(player) {
  const ld = player.lifeData;
  if (!ld?.wealth?.vehicles?.length) return '';
  return ld.wealth.vehicles.map(v => v.label).join(', ');
}

export function describeWealthLifestyle(player) {
  const lifestyle = player.lifeData?.wealth?.lifestyle;
  if (!lifestyle) return '';
  const sig = lifestyle.signatures?.length
    ? ` | assinatura: ${lifestyle.signatures.map(s => `${s.label} (${s.favoriteObject})`).join(', ')}`
    : '';
  const portfolio = lifestyle.portfolio?.length
    ? ` | portfolio: ${lifestyle.portfolio.map(p => p.label).join(', ')}`
    : '';
  return `${lifestyle.philosophy?.label ?? 'sem filosofia'} | luxo ${lifestyle.spendingMood ?? 'discreto'} | risco ${lifestyle.riskAppetite ?? '?'}${sig}${portfolio}`;
}

export function describePublicValues(player) {
  const values = player.lifeData?.values;
  const pv = values?.publicValues;
  if (!pv) return '';
  return `${pv.stance?.label ?? 'sem postura'} | ${pv.activism?.label ?? 'sem estilo'} | projeto: ${pv.flagshipProject?.label ?? values?.socialCause?.label ?? 'nenhum'} | risco ${pv.controversyRisk ?? '?'}`;
}

export function describeFavoritePlaces(player) {
  const places = player.lifeData?.places;
  if (!places?.placesLoved?.length) return '';
  return places.placesLoved.map(p => p.city ? `${p.label} (${p.city})` : p.label).join(', ');
}

export function describeLifeData(player) {
  if (!player.lifeData) return `${player.name}: sem lifeData`;
  const ld = player.lifeData;
  const lines = [`=== LIFE DATA v2: ${player.name} ===`];
  lines.push(`  Relação    : ${describePersonalLife(player)}`);
  if (ld.personal.partner) lines.push(`  Parceiro   : ${ld.personal.partner.name} (${ld.personal.partner.label}, ${ld.personal.partner.age ?? '?'}a) — se conheceram ${ld.personal.partner.howMet}, ${ld.personal.partner.yearsTogether}a juntos`);
  if (ld.personal.partner?.dynamic) lines.push(`  Dinâmica   : ${ld.personal.partner.dynamic.label} — ${ld.personal.partner.dynamic.desc}`);
  if (ld.personal.familyPlan) lines.push(`  Plano fam. : ${ld.personal.familyPlan.label} — ${ld.personal.familyPlan.desc}`);
  if (ld.personal.children?.has) lines.push(`  Filhos     : ${ld.personal.children.list?.map(c => `${c.name} (${c.age}a, ${c.personality?.label ?? 'perfil reservado'})`).join(', ')}`);
  if (ld.personal.relationshipHistory?.length) lines.push(`  Histórico  : ${ld.personal.relationshipHistory.length} capítulo${ld.personal.relationshipHistory.length > 1 ? 's' : ''} afetivo${ld.personal.relationshipHistory.length > 1 ? 's' : ''}`);
  if (ld.personal.pets?.has) lines.push(`  Pet        : ${ld.personal.pets.label} — ${ld.personal.pets.name}`);
  lines.push(`  Residência : ${describeHome(player)}`);
  if (ld.places?.favoriteCity) lines.push(`  Cidade fav. : ${ld.places.favoriteCity.label}${ld.places.favoriteCity.city ? ' — ' + ld.places.favoriteCity.city : ''}`);
  if (ld.places?.favoriteLandmark) lines.push(`  Lugar marc. : ${ld.places.favoriteLandmark.label} (${ld.places.favoriteLandmark.city})`);
  if (ld.home.properties?.length > 1) lines.push(`  2ª Prop.   : ${ld.home.properties.find(p => !p.main)?.label}`);
  lines.push(`  Origem     : ${describeOrigin(player)}`);
  lines.push(`  Classe     : ${ld.origin.upbringing.label} | Pai: ${ld.origin.father.job} | Mãe: ${ld.origin.mother.job}`);
  lines.push(`  Irmãos     : ${ld.origin.siblings.label}`);
  lines.push(`  Educação   : ${ld.education.level.label}${ld.education.field ? ' em ' + ld.education.field : ''}`);
  lines.push(`  Hobbies    : ${describeHobbies(player)}`);
  lines.push(`  Idiomas    : ${ld.interests.languages.map(l => `${l.lang} (${l.fluency.label})`).join(', ')}`);
  lines.push(`  Fé         : ${ld.values.faith?.label}`);
  lines.push(`  Causa      : ${ld.values.socialCause?.label}`);
  if (ld.values.publicValues) lines.push(`  Valores    : ${describePublicValues(player)}`);
  lines.push(`  Riqueza    : ${ld.wealth.tier.label} (${ld.wealth.tier.range})`);
  if (ld.wealth.lifestyle) lines.push(`  Dinheiro   : ${describeWealthLifestyle(player)}`);
  lines.push(`  Veículos   : ${describeVehicles(player)}`);
  lines.push(`  Estilo     : ${ld.style?.profile?.label}${ld.style?.watchBrand ? ' + ' + ld.style.watchBrand : ''}`);
  lines.push(`  Dieta      : ${ld.diet?.label}`);
  lines.push(`  Sono       : ${ld.sleep?.label}`);
  lines.push(`  Redes      : ${ld.media?.following?.range} — ${ld.media?.style?.label}`);
  lines.push(`  Social     : ${ld.social?.circle?.label} | ${ld.social?.nightlife?.label}`);
  lines.push(`  Superstição: ${ld.training?.superstitions?.map(s => s.label).join(' + ')}`);
  lines.push(`  Imagem     : ${ld.publicImage?.label}`);
  if (player.lifeMemory?.favorites?.places?.[0]) lines.push(`  Mem. lugar : ${player.lifeMemory.favorites.places[0].label}`);
  if (player.lifeMemory?.family?.anchors?.[0]) lines.push(`  Mem. afeto : ${player.lifeMemory.family.anchors[0].label}`);
  if (player.lifeMemory?.favorites?.projects?.[0]) lines.push(`  Mem. causa : ${player.lifeMemory.favorites.projects[0].label}`);
  return lines.join('\n');
}

