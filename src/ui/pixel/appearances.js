/**
 * appearances.js  v4.0 — Configuração visual dos jogadores oficiais
 * 25+ padrões de camisa. Todos conectados ao drawJerseyPattern em NEWME1.0.jsx.
 */

// ─── Paleta de referência ─────────────────────────────────────────
export const SKIN = {
  PALE_FAIR:   '#fad9c4',
  FAIR:        '#f2c49b',
  LIGHT:       '#e8b88a',
  MEDIUM:      '#c8845a',
  WARM_BROWN:  '#a0674a',
  MEDIUM_DARK: '#8d5524',
  DARK:        '#6b3a2a',
  DEEP:        '#3d1f14',
  OLIVE:       '#c5a07a',
  EAST_ASIAN:  '#e8c9a0',
  SOUTH_ASIAN: '#c8956a',
};

export const HAIR_COLOR = {
  BLACK:        '#111111',
  DARK_BROWN:   '#2b1800',
  BROWN:        '#5c3317',
  AUBURN:       '#8b3a00',
  RED:          '#9b2335',
  BLONDE:       '#c8a000',
  LIGHT_BLONDE: '#f0d060',
  GREY:         '#888888',
  WHITE:        '#dddddd',
  PLATINUM:     '#f5f0e8',
  BLUE_BLACK:   '#1a1a3a',
};

export const EYE_COLOR = {
  DARK_BROWN:  '#2b1400',
  BROWN:       '#5c3317',
  HAZEL:       '#7a5c2a',
  GREEN:       '#2d6a2d',
  TEAL:        '#1a5f5f',
  BLUE:        '#1a4a8a',
  LIGHT_BLUE:  '#4488cc',
  GREY:        '#6a7a8a',
  AMBER:       '#b87020',
};

export const RACKET = {
  BLACK: '#111111', DARK_GREY: '#333333', GREY: '#666666',
  SILVER: '#aaaaaa', WHITE: '#eeeeee', CARBON: '#1a1a1a', GRAPHITE: '#2a2e35',
  RED: '#cc0000', DEEP_RED: '#880022', CRIMSON: '#aa0033', ROSE: '#cc3366',
  BLUE: '#003399', NAVY: '#001144', COBALT: '#0055cc', SKY: '#0099dd', CYAN: '#007799',
  GREEN: '#005522', LIME: '#44aa00', FOREST: '#1a4a1a', TEAL: '#005555', MINT: '#00aa88',
  GOLD: '#c8a000', YELLOW: '#ddcc00', AMBER: '#cc7700', ORANGE: '#cc5500', BURNT_ORANGE: '#aa3300',
  PURPLE: '#550088', VIOLET: '#7700cc', MAGENTA: '#bb0077', HOT_PINK: '#dd0066',
  CHROME: '#8899aa', BRONZE: '#8b5e3c', COPPER: '#b87333',
};

// ─── Lista completa de padrões disponíveis ────────────────────────
// Para referência ao criar novos jogadores ou na randomAppearance().
export const SHIRT_PATTERNS = [
  'clean',           // sólido sem overlay
  'stripe_h',        // faixa horizontal no peito
  'stripe_h2',       // duas faixas horizontais
  'stripe_v',        // duas listras verticais flanqueando o centro
  'stripe_v_single', // uma listra vertical central
  'stripe_side',     // painéis laterais coloridos
  'stripe_side_single', // um painel lateral
  'shoulder_panel',  // ombros coloridos
  'raglan',          // mangas raglan diagonais
  'blocked',         // bloco de cor superior
  'blocked_v',       // bloco de cor lateral
  'diagonal',        // faixa diagonal única
  'diagonal2',       // duas faixas diagonais
  'cross_stripe',    // H + V cruzadas
  'pinstripe',       // listras finas verticais
  'pinstripe_h',     // listras finas horizontais
  'swoosh',          // arco curvo
  'swoosh2',         // arco curvo duplo
  'arc',             // arco no peito
  'collar_v',        // detalhe de gola V
  'polo_placket',    // tira de polo com botões
  'chest_panel',     // painel retangular no peito
  'shoulder_drop',   // gotas nos ombros
  'hoop',            // anéis concêntricos
  'checkerboard',    // xadrez em faixa
  'zigzag',          // chevron / zigzag
  'dots',            // bolinhas
  'gradient_wash',   // lavagem de gradiente vertical
  'gradient_side',   // lavagem de gradiente horizontal
  'stripe_3',        // três listras verticais
  'wave',            // faixa ondulada
  'flame',           // labaredas no peito
  'tiger',           // listras tipo animal
  'mesh_panel',      // malha nos lados
  'number_block',    // painel de número no peito
];

// ─────────────────────────────────────────────────────────────────
// 16 JOGADORES — APARÊNCIA ENRIQUECIDA
// ─────────────────────────────────────────────────────────────────

export const PLAYER_APPEARANCES = {

  // ── ITA — Marco Vantorini ─────────────────────────────────────
  // Mediterrâneo intenso. Laranja + preto. Diagonal agressiva.
  VANTORINI: {
    skin:          SKIN.OLIVE,
    hair:          'wavy',
    hairColor:     HAIR_COLOR.DARK_BROWN,
    eyeColor:      EYE_COLOR.BROWN,
    bodyType:      'athletic',
    heightScale:   1.057,
    shirtColor:    '#1a0a00',
    shirtType:     'sport',
    shirtPattern:  'diagonal',
    stripeColor:   '#FF6B35',
    stripeColor2:  '#cc4400',
    shortsColor:   '#0033aa',
    shoeColor:     '#FF6B35',
    shoeAccent:    '#ffffff',
    sockColor:     '#ffffff',
    racketColor:   RACKET.ORANGE,
    racketGrip:    '#552200',
    racketStrings: '#ffaa44',
    accessory:     'bandana',
    accessoryColor:'#FF6B35',
    accentColor:   '#FF6B35',
    wristband:     'both',
    wristbandColor:'#FF6B35',
    ankleBand:     'none',
  },

  // ── DEN — Lars Kasperk ───────────────────────────────────────
  // Nórdico limpo. Vermelho/branco dinamarquês. Swoosh duplo.
  KASPERK: {
    skin:          SKIN.PALE_FAIR,
    hair:          'short',
    hairColor:     HAIR_COLOR.BLONDE,
    eyeColor:      EYE_COLOR.BLUE,
    bodyType:      'tall',
    heightScale:   1.103,
    shirtColor:    '#cc0000',
    shirtType:     'sport',
    shirtPattern:  'swoosh2',
    stripeColor:   '#ffffff',
    stripeColor2:  '#ffdddd',
    shortsColor:   '#ffffff',
    shoeColor:     '#ffffff',
    shoeAccent:    '#cc0000',
    sockColor:     '#cc0000',
    racketColor:   RACKET.SILVER,
    racketGrip:    '#aaaaaa',
    racketStrings: '#ffffff',
    accessory:     'headband',
    accessoryColor:'#cc0000',
    accentColor:   '#C8D4FF',
    wristband:     'both',
    wristbandColor:'#cc0000',
    ankleBand:     'none',
  },

  // ── CHN — Wei Chen ────────────────────────────────────────────
  // China. Vermelho com listras douradas. Shoulder panel.
  CHEN_WEI: {
    skin:          SKIN.EAST_ASIAN,
    hair:          'short',
    hairColor:     HAIR_COLOR.BLACK,
    eyeColor:      EYE_COLOR.DARK_BROWN,
    bodyType:      'slim',
    heightScale:   1.017,
    shirtColor:    '#cc0000',
    shirtType:     'sport',
    shirtPattern:  'shoulder_panel',
    stripeColor:   '#ffdd00',
    stripeColor2:  '#aa0000',
    shortsColor:   '#8b0000',
    shoeColor:     '#ffffff',
    shoeAccent:    '#cc0000',
    sockColor:     '#ffffff',
    racketColor:   RACKET.DEEP_RED,
    racketGrip:    '#880000',
    racketStrings: '#ffdd00',
    accessory:     'visor',
    accessoryColor:'#cc0000',
    accentColor:   '#FFD700',
    wristband:     'both',
    wristbandColor:'#ffffff',
    ankleBand:     'none',
  },

  // ── RUS — Alexei Volkov ───────────────────────────────────────
  // Azul profundo russo. Três listras verticais. Sóbrio e imponente.
  VOLKOV: {
    skin:          SKIN.FAIR,
    hair:          'fade',
    hairColor:     HAIR_COLOR.DARK_BROWN,
    eyeColor:      EYE_COLOR.GREY,
    bodyType:      'athletic',
    heightScale:   1.086,
    shirtColor:    '#001a66',
    shirtType:     'sport',
    shirtPattern:  'stripe_3',
    stripeColor:   '#4488FF',
    stripeColor2:  '#cc0000',
    shortsColor:   '#001a66',
    shoeColor:     '#ffffff',
    shoeAccent:    '#4488FF',
    sockColor:     '#dddddd',
    racketColor:   RACKET.NAVY,
    racketGrip:    '#001144',
    racketStrings: '#4488FF',
    accessory:     'none',
    accentColor:   '#4488FF',
    wristband:     'right',
    wristbandColor:'#cc0000',
    ankleBand:     'none',
  },

  // ── NGR — Temi Ajuba ─────────────────────────────────────────
  // Nigeriano. Verde com bloco branco superior. Imponente.
  AJUBA: {
    skin:          SKIN.DARK,
    hair:          'shaved',
    hairColor:     HAIR_COLOR.BLACK,
    eyeColor:      EYE_COLOR.DARK_BROWN,
    bodyType:      'athletic',
    heightScale:   1.149,
    shirtColor:    '#007000',
    shirtType:     'sport',
    shirtPattern:  'blocked',
    stripeColor:   '#ffffff',
    stripeColor2:  '#004400',
    shortsColor:   '#ffffff',
    shoeColor:     '#008000',
    shoeAccent:    '#ffffff',
    sockColor:     '#ffffff',
    racketColor:   RACKET.GREEN,
    racketGrip:    '#003300',
    racketStrings: '#00FF88',
    accessory:     'none',
    accentColor:   '#00FF88',
    wristband:     'none',
    ankleBand:     'none',
  },

  // ── FRA — Baptiste Delacroix ─────────────────────────────────
  // Tricolor. Regatas + raglan diagonal. Artístico.
  DELACROIX: {
    skin:          SKIN.LIGHT,
    hair:          'wavy',
    hairColor:     HAIR_COLOR.BROWN,
    eyeColor:      EYE_COLOR.HAZEL,
    bodyType:      'medium',
    heightScale:   1.029,
    shirtColor:    '#002395',
    shirtType:     'sleeveless',
    shirtPattern:  'raglan',
    stripeColor:   '#ffffff',
    stripeColor2:  '#ED2939',
    shortsColor:   '#ffffff',
    shoeColor:     '#002395',
    shoeAccent:    '#ED2939',
    sockColor:     '#ffffff',
    racketColor:   RACKET.BLUE,
    racketGrip:    '#001155',
    racketStrings: '#ff0044',
    accessory:     'cap_back',
    accessoryColor:'#ED2939',
    accentColor:   '#FF0055',
    wristband:     'both',
    wristbandColor:'#ED2939',
    ankleBand:     'left',
    ankleBandColor:'#002395',
  },

  // ── BRA — Rafael Souza ────────────────────────────────────────
  // Brasil. Verde/amarelo. Gradient wash + swoosh.
  SOUZA: {
    skin:          SKIN.WARM_BROWN,
    hair:          'curly',
    hairColor:     HAIR_COLOR.DARK_BROWN,
    eyeColor:      EYE_COLOR.BROWN,
    bodyType:      'athletic',
    heightScale:   1.051,
    shirtColor:    '#007830',
    shirtType:     'sport',
    shirtPattern:  'swoosh',
    stripeColor:   '#FFDF00',
    stripeColor2:  '#009c3b',
    shortsColor:   '#002776',
    shoeColor:     '#FFDF00',
    shoeAccent:    '#009c3b',
    sockColor:     '#ffffff',
    racketColor:   RACKET.GREEN,
    racketGrip:    '#004400',
    racketStrings: '#FFDF00',
    accessory:     'bandana',
    accessoryColor:'#FFDF00',
    accentColor:   '#FFD700',
    wristband:     'both',
    wristbandColor:'#FFDF00',
    ankleBand:     'none',
  },

  // ── ARG — Rodrigo Cardenas ────────────────────────────────────
  // Celeste e branco argentino. Listras v clássicas.
  CARDENAS: {
    skin:          SKIN.MEDIUM,
    hair:          'short',
    hairColor:     HAIR_COLOR.BLACK,
    eyeColor:      EYE_COLOR.DARK_BROWN,
    bodyType:      'athletic',
    heightScale:   1.040,
    shirtColor:    '#74ACDF',
    shirtType:     'sport',
    shirtPattern:  'stripe_v',
    stripeColor:   '#ffffff',
    stripeColor2:  '#4488bb',
    shortsColor:   '#ffffff',
    shoeColor:     '#74ACDF',
    shoeAccent:    '#ffffff',
    sockColor:     '#74ACDF',
    racketColor:   RACKET.BLUE,
    racketGrip:    '#003388',
    racketStrings: '#ffffff',
    accessory:     'none',
    accentColor:   '#74ACDF',
    wristband:     'left',
    wristbandColor:'#74ACDF',
    ankleBand:     'none',
  },

  // ── JPN — Kenji Nakamura ──────────────────────────────────────
  // Japão. Branco/vermelho. Polo com placket e anel no peito.
  NAKAMURA: {
    skin:          SKIN.EAST_ASIAN,
    hair:          'short',
    hairColor:     HAIR_COLOR.BLACK,
    eyeColor:      EYE_COLOR.DARK_BROWN,
    bodyType:      'medium',
    heightScale:   1.000,
    shirtColor:    '#f8f8f8',
    shirtType:     'polo',
    shirtPattern:  'polo_placket',
    stripeColor:   '#cc0000',
    stripeColor2:  '#880000',
    shortsColor:   '#cc0000',
    shoeColor:     '#cc0000',
    shoeAccent:    '#ffffff',
    sockColor:     '#ffffff',
    racketColor:   RACKET.DEEP_RED,
    racketGrip:    '#660000',
    racketStrings: '#ffffff',
    accessory:     'visor',
    accessoryColor:'#cc0000',
    accentColor:   '#FF8C42',
    wristband:     'right',
    wristbandColor:'#cc0000',
    ankleBand:     'none',
  },

  // ── GRE — Stavros Petrakis ────────────────────────────────────
  // Grego. Azul/branco. Hoop rings + ombros.
  PETRAKIS: {
    skin:          SKIN.OLIVE,
    hair:          'wavy',
    hairColor:     HAIR_COLOR.BLACK,
    eyeColor:      EYE_COLOR.DARK_BROWN,
    bodyType:      'medium',
    heightScale:   1.046,
    shirtColor:    '#0d5eaf',
    shirtType:     'sport',
    shirtPattern:  'hoop',
    stripeColor:   '#ffffff',
    stripeColor2:  '#66aaff',
    shortsColor:   '#ffffff',
    shoeColor:     '#0d5eaf',
    shoeAccent:    '#ffffff',
    sockColor:     '#0d5eaf',
    racketColor:   RACKET.BLUE,
    racketGrip:    '#003388',
    racketStrings: '#00AAFF',
    accessory:     'headband',
    accessoryColor:'#0d5eaf',
    accentColor:   '#00AAFF',
    wristband:     'both',
    wristbandColor:'#0d5eaf',
    ankleBand:     'none',
  },

  // ── NOR — Erik Bjornstad ──────────────────────────────────────
  // Norueguês. Vermelho/azul. Cross stripe nórdica.
  BJORNSTAD: {
    skin:          SKIN.FAIR,
    hair:          'short',
    hairColor:     HAIR_COLOR.LIGHT_BLONDE,
    eyeColor:      EYE_COLOR.LIGHT_BLUE,
    bodyType:      'athletic',
    heightScale:   1.091,
    shirtColor:    '#EF2B2D',
    shirtType:     'sport',
    shirtPattern:  'cross_stripe',
    stripeColor:   '#ffffff',
    stripeColor2:  '#003680',
    shortsColor:   '#003680',
    shoeColor:     '#ffffff',
    shoeAccent:    '#EF2B2D',
    sockColor:     '#ffffff',
    racketColor:   RACKET.DEEP_RED,
    racketGrip:    '#880000',
    racketStrings: '#ffffff',
    accessory:     'none',
    accentColor:   '#EF2B2D',
    wristband:     'none',
    ankleBand:     'none',
  },

  // ── JPN — Ryu Yamamoto ────────────────────────────────────────
  // Minimalista. Branco/preto. Number block sutil.
  YAMAMOTO: {
    skin:          SKIN.EAST_ASIAN,
    hair:          'buzz',
    hairColor:     HAIR_COLOR.BLACK,
    eyeColor:      EYE_COLOR.DARK_BROWN,
    bodyType:      'slim',
    heightScale:   1.011,
    shirtColor:    '#f0f0f0',
    shirtType:     'polo',
    shirtPattern:  'number_block',
    stripeColor:   '#222222',
    stripeColor2:  '#444444',
    shortsColor:   '#111111',
    shoeColor:     '#f5f5f5',
    shoeAccent:    '#111111',
    sockColor:     '#f5f5f5',
    racketColor:   RACKET.WHITE,
    racketGrip:    '#888888',
    racketStrings: '#cccccc',
    accessory:     'headband',
    accessoryColor:'#111111',
    accentColor:   '#FFFFFF',
    wristband:     'left',
    wristbandColor:'#111111',
    ankleBand:     'none',
  },

  // ── RSA — Sipho Mbeki ─────────────────────────────────────────
  // Sul-africano. Verde/amarelo. Side panels com flame inferior.
  MBEKI: {
    skin:          SKIN.DEEP,
    hair:          'shaved',
    hairColor:     HAIR_COLOR.BLACK,
    eyeColor:      EYE_COLOR.DARK_BROWN,
    bodyType:      'athletic',
    heightScale:   1.114,
    shirtColor:    '#006030',
    shirtType:     'sport',
    shirtPattern:  'stripe_side',
    stripeColor:   '#ffb81c',
    stripeColor2:  '#cc8800',
    shortsColor:   '#002395',
    shoeColor:     '#ffb81c',
    shoeAccent:    '#007a4d',
    sockColor:     '#ffffff',
    racketColor:   RACKET.GREEN,
    racketGrip:    '#002200',
    racketStrings: '#ffb81c',
    accessory:     'none',
    accentColor:   '#ffb81c',
    wristband:     'right',
    wristbandColor:'#ffb81c',
    ankleBand:     'none',
  },

  // ── HUN — Balint Kovacs ───────────────────────────────────────
  // Húngaro. Vermelho/verde. Diagonal dupla.
  KOVACS: {
    skin:          SKIN.FAIR,
    hair:          'short',
    hairColor:     HAIR_COLOR.BROWN,
    eyeColor:      EYE_COLOR.HAZEL,
    bodyType:      'medium',
    heightScale:   1.063,
    shirtColor:    '#ce2939',
    shirtType:     'polo',
    shirtPattern:  'diagonal2',
    stripeColor:   '#ffffff',
    stripeColor2:  '#477050',
    shortsColor:   '#ffffff',
    shoeColor:     '#ce2939',
    shoeAccent:    '#ffffff',
    sockColor:     '#ffffff',
    racketColor:   RACKET.DEEP_RED,
    racketGrip:    '#660022',
    racketStrings: '#ffffff',
    accessory:     'visor',
    accessoryColor:'#ce2939',
    accentColor:   '#CE3232',
    wristband:     'both',
    wristbandColor:'#ce2939',
    ankleBand:     'none',
  },

  // ── GHA — Kwame Osei ─────────────────────────────────────────
  // Ganense explosivo. Verde/ouro. Zigzag vibrante.
  OSEI: {
    skin:          SKIN.DARK,
    hair:          'afro',
    hairColor:     HAIR_COLOR.BLACK,
    eyeColor:      EYE_COLOR.DARK_BROWN,
    bodyType:      'athletic',
    heightScale:   1.097,
    shirtColor:    '#005030',
    shirtType:     'sport',
    shirtPattern:  'zigzag',
    stripeColor:   '#fcd116',
    stripeColor2:  '#ce1126',
    shortsColor:   '#fcd116',
    shoeColor:     '#ce1126',
    shoeAccent:    '#fcd116',
    sockColor:     '#ffffff',
    racketColor:   RACKET.GOLD,
    racketGrip:    '#554400',
    racketStrings: '#fcd116',
    accessory:     'none',
    accentColor:   '#FFCB05',
    wristband:     'none',
    ankleBand:     'none',
  },

  // ── GER — Igor Reinholt ───────────────────────────────────────
  // Alemão sóbrio. Preto/vermelho/ouro. Pinstripe clássico.
  REINHOLT: {
    skin:          SKIN.FAIR,
    hair:          'short',
    hairColor:     HAIR_COLOR.DARK_BROWN,
    eyeColor:      EYE_COLOR.GREY,
    bodyType:      'medium',
    heightScale:   1.069,
    shirtColor:    '#111111',
    shirtType:     'sport',
    shirtPattern:  'pinstripe',
    stripeColor:   '#cc0000',
    stripeColor2:  '#E8C84A',
    shortsColor:   '#cc0000',
    shoeColor:     '#111111',
    shoeAccent:    '#cc0000',
    sockColor:     '#dddddd',
    racketColor:   RACKET.CARBON,
    racketGrip:    '#111111',
    racketStrings: '#cc0000',
    accessory:     'none',
    accentColor:   '#E8C84A',
    wristband:     'right',
    wristbandColor:'#cc0000',
    ankleBand:     'none',
  },

  // ── Generic fallbacks ─────────────────────────────────────────
  DEFAULT_A: {
    skin:          SKIN.MEDIUM,
    hair:          'short',
    hairColor:     HAIR_COLOR.DARK_BROWN,
    eyeColor:      EYE_COLOR.BROWN,
    bodyType:      'medium',
    heightScale:   1.00,
    shirtColor:    '#00aa55',
    shirtType:     'sport',
    shirtPattern:  'stripe_side',
    stripeColor:   '#00ff88',
    stripeColor2:  '#007744',
    shortsColor:   '#003366',
    shoeColor:     '#ffffff',
    shoeAccent:    '#00aa55',
    sockColor:     '#eeeeee',
    racketColor:   RACKET.DARK_GREY,
    racketStrings: '#00ff88',
    accessory:     'none',
    accentColor:   '#00FF88',
    wristband:     'none',
    ankleBand:     'none',
  },

  DEFAULT_B: {
    skin:          SKIN.PALE_FAIR,
    hair:          'bun',
    hairColor:     HAIR_COLOR.BLACK,
    eyeColor:      EYE_COLOR.BLUE,
    bodyType:      'slim',
    heightScale:   0.97,
    shirtColor:    '#cc5500',
    shirtType:     'sport',
    shirtPattern:  'swoosh',
    stripeColor:   '#ffffff',
    stripeColor2:  '#ff8833',
    shortsColor:   '#1a1a1a',
    shoeColor:     '#ff6b35',
    shoeAccent:    '#ffffff',
    sockColor:     '#eeeeee',
    racketColor:   RACKET.DARK_GREY,
    racketStrings: '#ff6b35',
    accessory:     'none',
    accentColor:   '#FF6B35',
    wristband:     'none',
    ankleBand:     'none',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────

export function getAppearance(namedPlayerKey, playerId = 0) {
  if (namedPlayerKey && PLAYER_APPEARANCES[namedPlayerKey]) {
    return PLAYER_APPEARANCES[namedPlayerKey];
  }
  return playerId === 0 ? PLAYER_APPEARANCES.DEFAULT_A : PLAYER_APPEARANCES.DEFAULT_B;
}

export function getPose(player) {
  if (player.swinging) return player._lastPose || 'fh';
  if (player.atNet)    return 'vol';
  const spd = Math.sqrt((player.vel?.x || 0) ** 2 + (player.vel?.y || 0) ** 2);
  return spd > 1.5 ? 'run' : 'idle';
}

export function heightToScale(heightM) {
  return heightM / 1.75;
}

export function randomAppearance(seed = Math.random()) {
  const rng = (() => {
    let s = seed * 9999;
    return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
  })();
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];

  const skins      = Object.values(SKIN);
  const hairs      = Object.values(HAIR_COLOR);
  const eyes       = Object.values(EYE_COLOR);
  const rackets    = Object.values(RACKET);
  const hairTypes  = ['short','long','curly','bun','careca','buzz','afro','ponytail',
                      'mohawk','fade','wavy','braids','shaved'];
  const bodyTypes  = ['slim','medium','athletic','tall','stocky'];
  const accessories= ['none','none','none','cap','cap_back','visor','bandana','headband'];
  const shirtTypes = ['sport','sport','polo','sleeveless'];
  const wristModes = ['none','none','left','right','both'];

  // Weighted patterns: clean less likely for newgens to get more variety
  const patterns   = [
    'clean',
    'stripe_h', 'stripe_h', 'stripe_h2',
    'stripe_v', 'stripe_v', 'stripe_v_single',
    'stripe_side', 'stripe_side', 'stripe_side_single',
    'shoulder_panel', 'shoulder_panel',
    'raglan',
    'blocked', 'blocked_v',
    'diagonal', 'diagonal2',
    'cross_stripe',
    'pinstripe', 'pinstripe_h',
    'swoosh', 'swoosh', 'swoosh2',
    'arc',
    'collar_v',
    'polo_placket',
    'chest_panel',
    'shoulder_drop',
    'hoop',
    'checkerboard',
    'zigzag',
    'dots',
    'gradient_wash', 'gradient_side',
    'stripe_3',
    'wave',
    'flame',
    'tiger',
    'mesh_panel',
    'number_block',
  ];

  const shirtColor  = `#${Math.floor(rng()*0xffffff).toString(16).padStart(6,'0')}`;
  const shortsColor = `#${Math.floor(rng()*0xffffff).toString(16).padStart(6,'0')}`;
  const shoeColor   = `#${Math.floor(rng()*0xffffff).toString(16).padStart(6,'0')}`;
  const accent      = `#${Math.floor(rng()*0xffffff).toString(16).padStart(6,'0')}`;
  const stripe2     = `#${Math.floor(rng()*0xffffff).toString(16).padStart(6,'0')}`;

  return {
    skin:           pick(skins),
    hair:           pick(hairTypes),
    hairColor:      pick(hairs),
    eyeColor:       pick(eyes),
    bodyType:       pick(bodyTypes),
    heightScale:    0.857 + rng() * (1.314 - 0.857),
    shirtColor,
    shirtType:      pick(shirtTypes),
    shirtPattern:   pick(patterns),
    stripeColor:    accent,
    stripeColor2:   stripe2,
    shortsColor,
    shoeColor,
    shoeAccent:     '#ffffff',
    sockColor:      '#eeeeee',
    racketColor:    pick(rackets),
    racketStrings:  `#${Math.floor(rng()*0xffffff).toString(16).padStart(6,'0')}`,
    accessory:      pick(accessories),
    accessoryColor: accent,
    accentColor:    accent,
    wristband:      pick(wristModes),
    wristbandColor: accent,
    ankleBand:      pick(wristModes),
    ankleBandColor: `#${Math.floor(rng()*0xffffff).toString(16).padStart(6,'0')}`,
  };
}

// ─── generateKits ─────────────────────────────────────────────────
// Gera N kits de roupa aleatórios para um jogador.
// Usa o ID do jogador como semente base para ser determinístico
// (mesmo jogo, mesmos kits — não muda ao recarregar).
// Jogadores named começam com o kit canonical como kit[0].
// ─────────────────────────────────────────────────────────────────
export function generateKits(playerId = '', namedPlayerKey = null, count = 5) {
  const kits = [];

  // Kit 0: aparência canônica do jogador (named) ou primeiro aleatório
  if (namedPlayerKey && PLAYER_APPEARANCES[namedPlayerKey]) {
    kits.push({ ...PLAYER_APPEARANCES[namedPlayerKey] });
  } else {
    // Semente derivada do ID para ser determinística
    const seed0 = hashSeed(playerId + '_kit0');
    kits.push(randomAppearance(seed0));
  }

  // Kits 1..N-1: aleatórios com sementes derivadas
  for (let i = 1; i < count; i++) {
    const seed = hashSeed(`${playerId}_kit${i}`);
    kits.push(randomAppearance(seed));
  }

  return kits;
}

// Converte uma string em float 0..1 (djb2 simplificado)
function hashSeed(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) + str.charCodeAt(i);
    h = h & 0x7fffffff; // manter positivo
  }
  return (h % 1000000) / 1000000;
}

