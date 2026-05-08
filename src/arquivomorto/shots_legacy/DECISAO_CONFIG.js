// DECISAO_CONFIG.js
// ============================================================================
// Pesos e controles da camada probabilística da escolha de shot.
// ============================================================================

export const DECISAO = {
  temperatura_base: 0.28,
  temperatura_reg_irregularidade: 0.12,
  // Helper: regularidade agora influencia MENOS a temperatura — ela controla
  // consistência de execução (dispersão física), não previsibilidade de escolha.
  // Federer era regular mas imprevisível. Valor original 0.24 tornava grinds robóticos.
  temperatura_mental_reducao: 0.18,
  // Helper: reduzido de 0.25 — mentalidade alta = foco, não determinismo total.
  // Jogador confiante ainda surpreende; só erra menos sob pressão.
  temperatura_momentum_escala: 0.34,
  // Helper: subir deixa momentum extremo aumentar mais a aleatoriedade.
  temperatura_pressao_escala: 0.12,
  // Helper: subir faz stress de rally bagunçar mais a decisão.
  temperatura_adaptacao_reducao: 0.10,
  temperatura_visao_variacao: 0.15,
  // Helper: visaoTatica alta → jogador lê o jogo e ESCOLHE surpreender.
  // Contribui com variação positiva na temperatura (±0.045 no range normal).
  temperatura_min: 0.18,
  // Subido de 0.08 — nenhum jogador real é determinístico ao ponto de 0.08.
  // Com 0.18, mesmo o grinder mais regular ainda tem ~15% de chance de
  // surpreender em situação neutra. Jogos grind vs grind deixam de ser entorpecentes.
  temperatura_max: 0.90,

  net_approach_slice_bonus: 0.12,
  net_approach_drive_bonus: 0.08,
  net_approach_accel_bonus: 0.05,
  net_approach_topspin_bonus: 0.04,
  net_approach_drop_penalidade: 0.10,

  net_firstvolley_volley_bonus: 0.20,
  net_firstvolley_halfvolley_bonus: 0.10,
  net_firstvolley_smash_bonus: 0.05,
  net_firstvolley_banana_penalidade: 0.12,
  net_firstvolley_drop_penalidade: 0.08,

  net_closefinish_volley_bonus: 0.12,
  net_closefinish_smash_bonus: 0.18,
  net_closefinish_accel_bonus: 0.08,
  net_closefinish_halfvolley_penalidade: 0.04,
};

