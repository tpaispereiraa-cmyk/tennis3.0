// styles.js — Dados COSMÉTICOS de estilo de jogo (UI only)
// -------------------------------------------------------------------
// PHASE 1 REFACTOR: Este arquivo agora contém APENAS dados de display.
// Nenhum campo aqui — lido pelo engine de jogo.
//
// O engine lê attrs (v3) + prefs do jogador — ver shotPhysics.js e
// o futuro shotDecision.js (Phase 3).
//
// motor antigo de shots arquivado
// -------------------------------------------------------------------

export const PLAY_STYLES = {
  AGG_BASELINER:       { id: 'AGG_BASELINER',       label: 'Aggressive Baseliner',  abbr: 'AGG.BASE',  icon: '⚡',  refs: 'Djokovic — Alcaraz',     barColor: '#FF6B35' },
  CTR_PUNCHER:         { id: 'CTR_PUNCHER',         label: 'Counter-Puncher',        abbr: 'CTR.PUNCH', icon: '🛡️',  refs: 'Nadal — Murray',          barColor: '#FF4444' },
  ALL_COURT:           { id: 'ALL_COURT',           label: 'All-Court Player',       abbr: 'ALL-CRT',   icon: '🎯',  refs: 'Federer — Graf',          barColor: '#FFD700' },
  SRV_VOL:             { id: 'SRV_VOL',             label: 'Serve & Volleyer',       abbr: 'SRV.VOL',   icon: '↗',   refs: 'McEnroe — Edberg',        barColor: '#00FF88' },
  BIG_SERVER:          { id: 'BIG_SERVER',          label: 'Big Server',             abbr: 'BIG SRV',   icon: '💥',  refs: 'Isner — Karlovic',        barColor: '#AA44FF' },
  RETRIEVER:           { id: 'RETRIEVER',           label: 'Retriever',              abbr: 'RETRIEV',   icon: '🏃',  refs: 'Wozniacki — Ferrer',      barColor: '#00AAFF' },
  TAKEALLRISK:         { id: 'TAKEALLRISK',         label: 'All-Risk Gunner',        abbr: 'T.A.RISK',  icon: '🔥',  refs: 'Kyrgios — peak Safin',    barColor: '#FF0055' },
  GRINDER:             { id: 'GRINDER',             label: 'Grinder',                abbr: 'GRINDER',   icon: '⏳',  refs: 'Hewitt — Robredo',        barColor: '#FF8800' },
  POWER_BASELINER:     { id: 'POWER_BASELINER',     label: 'Power Baseliner',        abbr: 'PWR.BASE',  icon: '🚀',  refs: 'Medvedev — peak Agassi',  barColor: '#FF3300' },
  TACTICAL_TECHNICIAN: { id: 'TACTICAL_TECHNICIAN', label: 'Tactical Technician',    abbr: 'TACT.TEC',  icon: '🧠',  refs: 'Henin — Stosur',          barColor: '#00CCFF' },
  NET_SPECIALIST:      { id: 'NET_SPECIALIST',      label: 'Net Specialist',         abbr: 'NET.SPEC',  icon: '◆',   refs: 'Navratilova — Rafter',    barColor: '#88FF44' },
  MOMENTUM_PLAYER:     { id: 'MOMENTUM_PLAYER',     label: 'Momentum Player',        abbr: 'MOM.PLAY',  icon: '🌊',  refs: 'Monfils — peak Tsonga',   barColor: '#FF00AA' },
};

PLAY_STYLES.PWR_BASE  = PLAY_STYLES.POWER_BASELINER;
PLAY_STYLES.TACT_TEC  = PLAY_STYLES.TACTICAL_TECHNICIAN;
PLAY_STYLES.NET_SPEC  = PLAY_STYLES.NET_SPECIALIST;
PLAY_STYLES.ADPT_TAC  = PLAY_STYLES.TACTICAL_TECHNICIAN;

export const STYLE_KEYS = Object.keys(PLAY_STYLES).filter(k =>
  !['PWR_BASE','TACT_TEC','NET_SPEC','ADPT_TAC'].includes(k)
);

// -- Signature Shots — apenas label/icon (UI) --------------------
export const SIGNATURE_SHOTS = {
  INSIDE_OUT_FH:    { id: 'INSIDE_OUT_FH',    label: 'Inside-Out Forehand',    icon: '??' },
  INSIDE_IN_FH:     { id: 'INSIDE_IN_FH',     label: 'Forehand Inside-In',     icon: '??' },
  BANANA_FH:        { id: 'BANANA_FH',        label: 'Banana de Forehand',     icon: '??' },
  HEAVY_TOPSPIN_CC: { id: 'HEAVY_TOPSPIN_CC', label: 'Cruzado Pesado',         icon: '??' },
  HEAVY_TOP_CC:     { id: 'HEAVY_TOP_CC',     label: 'Topspin Pesado Cruzado', icon: '??' },
  HEAVY_TOP_DTL:    { id: 'HEAVY_TOP_DTL',    label: 'Topspin Pesado Paralelo',icon: '?' },
  HEAVY_TOP_BODY:   { id: 'HEAVY_TOP_BODY',   label: 'Topspin no Corpo',       icon: '??' },
  SHORT_ANGLE_FH:   { id: 'SHORT_ANGLE_FH',   label: 'ngulo Curto FH',        icon: '??' },
  RUNNING_FH:       { id: 'RUNNING_FH',       label: 'Forehand em Corrida',    icon: '??' },
  DTL_BH:           { id: 'DTL_BH',           label: 'Backhand DTL',           icon: '??' },
  BANANA_BH:        { id: 'BANANA_BH',        label: 'Banana de Backhand',     icon: '??' },
  SLICE_BH:         { id: 'SLICE_BH',         label: 'Slice de Backhand',      icon: '??' },
  BH_CHIP_RETURN:   { id: 'BH_CHIP_RETURN',   label: 'Chip de Backhand',       icon: '??' },
  TOPSPIN_CROSS:    { id: 'TOPSPIN_CROSS',    label: 'Topspin Cruzado',        icon: '??' },
  DROP_SHOT:        { id: 'DROP_SHOT',        label: 'Drop Shot',              icon: '??' },
  MOONBALL:         { id: 'MOONBALL',         label: 'Moonball',               icon: '??' },
  TOPSPIN_PASS:     { id: 'TOPSPIN_PASS',     label: 'Passing Topspin',        icon: '??' },
  SLICE_APPROACH:   { id: 'SLICE_APPROACH',   label: 'Slice de Aproximação',   icon: '??' },
  BIG_SERVE:        { id: 'BIG_SERVE',        label: 'Saque Dominador',        icon: '?' },
  FLAT_SERVE_T:     { id: 'FLAT_SERVE_T',     label: 'Saque no T',             icon: '??' },
  WIDE_SLICE_SERVE: { id: 'WIDE_SLICE_SERVE', label: 'Saque Slice Aberto',     icon: '??' },
  VOLLEY_FINISH:    { id: 'VOLLEY_FINISH',    label: 'Voleio Finalizador',     icon: '??' },
  DROP_VOLLEY:      { id: 'DROP_VOLLEY',      label: 'Drop Volley',            icon: '??' },
  SWINGING_VOLLEY:  { id: 'SWINGING_VOLLEY',  label: 'Swing Volley',           icon: '??' },
  FLAT_WINNER:      { id: 'FLAT_WINNER',      label: 'Winner Flat',            icon: '??' },
  LOB_ATTACK:       { id: 'LOB_ATTACK',       label: 'Lob Ofensivo',           icon: '??' },
  SERVE_COMMANDER:  { id: 'SERVE_COMMANDER',  label: 'Serve Commander',        icon: '???' },
  FOREHAND_FREAK:   { id: 'FOREHAND_FREAK',   label: 'Forehand Freak',         icon: '??' },
};
export const SIGNATURE_SHOT_KEYS = Object.keys(SIGNATURE_SHOTS);

// -- Rally Patterns — apenas cosmético ---------------------------
export const RALLY_PATTERNS = {
  CROSS_HEAVY:         { id: 'CROSS_HEAVY',         label: 'Cruzado Dominante',     icon: '?' },
  DTL_HUNTER:          { id: 'DTL_HUNTER',          label: 'Caçador DTL',           icon: '?' },
  DEEP_GRINDER:        { id: 'DEEP_GRINDER',        label: 'Fundão Implacável',     icon: '?' },
  SHORT_ANGLE_BUILDER: { id: 'SHORT_ANGLE_BUILDER', label: 'Construtor de ngulos', icon: '??' },
  CENTRE_CONTROL:      { id: 'CENTRE_CONTROL',      label: 'Controle Central',      icon: '?' },
  AGGRESSIVE_EARLY:    { id: 'AGGRESSIVE_EARLY',    label: 'Ataque Precoce',        icon: '?' },
  SERVE_PLUS_ONE:      { id: 'SERVE_PLUS_ONE',      label: 'Serve + 1',             icon: '??' },
  NET_APPROACH:        { id: 'NET_APPROACH',        label: 'Aproximação da Rede',   icon: '??' },
  DEFENSIVE_BASE:      { id: 'DEFENSIVE_BASE',      label: 'Base Defensiva',        icon: '??' },
  RHYTHM_DISRUPTION:   { id: 'RHYTHM_DISRUPTION',   label: 'Quebra de Ritmo',       icon: '??' },
  SLICE_DISRUPTOR:     { id: 'SLICE_DISRUPTOR',     label: 'Disruptor de Slice',    icon: '??' },
  SERVE_COMMANDER:     { id: 'SERVE_COMMANDER',     label: 'Serve Commander',       icon: '???' },
};
export const RALLY_PATTERN_KEYS = Object.keys(RALLY_PATTERNS);

export const RALLY_PATTERNS_STATS = {
  AGG_BASELINER:        { avgLength: 5.2,  winnerRate: 0.38, ueRate: 0.22 },
  CTR_PUNCHER:          { avgLength: 9.8,  winnerRate: 0.18, ueRate: 0.14 },
  ALL_COURT:            { avgLength: 6.4,  winnerRate: 0.30, ueRate: 0.18 },
  SRV_VOL:              { avgLength: 2.8,  winnerRate: 0.45, ueRate: 0.28 },
  BIG_SERVER:           { avgLength: 3.5,  winnerRate: 0.42, ueRate: 0.26 },
  RETRIEVER:            { avgLength: 11.2, winnerRate: 0.08, ueRate: 0.08 },
  TAKEALLRISK:          { avgLength: 4.1,  winnerRate: 0.48, ueRate: 0.42 },
  GRINDER:              { avgLength: 10.5, winnerRate: 0.12, ueRate: 0.09 },
  POWER_BASELINER:      { avgLength: 4.8,  winnerRate: 0.40, ueRate: 0.30 },
  TACTICAL_TECHNICIAN:  { avgLength: 7.2,  winnerRate: 0.28, ueRate: 0.12 },
  NET_SPECIALIST:       { avgLength: 4.2,  winnerRate: 0.38, ueRate: 0.22 },
  MOMENTUM_PLAYER:      { avgLength: 6.8,  winnerRate: 0.26, ueRate: 0.16 },
};


