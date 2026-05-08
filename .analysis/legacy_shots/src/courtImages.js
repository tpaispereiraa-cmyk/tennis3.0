/**
 * courtImages.js — Registry de imagens customizadas por torneio
 *
 * Cada entrada é o caminho de UMA imagem única (1058×525px equivalente)
 * que já contém runback + quadra compostos.
 * O renderer desenha as linhas brancas e rede por cima automaticamente.
 *
 * Convenção de nome: /courts/{TOURNAMENT_ID}.jpg
 *
 * Para adicionar um torneio:
 *   1. Adicione a linha abaixo com o tournamentId correto
 *   2. Coloque o arquivo em /public/courts/{TOURNAMENT_ID}.jpg
 *   3. Pronto.
 */

export const COURT_IMAGES = {

  // ── ATP 250 ────────────────────────────────────────────────────────────
  JAN_250_AURELIA:      '/courts/JAN_250_AURELIA.jpg',

  // ── Grand Slams ────────────────────────────────────────────────────────
  // JAN_GS_MERIDIAN:   '/courts/JAN_GS_MERIDIAN.jpg',
  // MAI_GS_ROLAND:     '/courts/MAI_GS_ROLAND.jpg',
  // JUN_GS_ALBION:     '/courts/JUN_GS_ALBION.jpg',
  // AGO_GS_EMPIRE:     '/courts/AGO_GS_EMPIRE.jpg',

  // ── Masters 1000 ───────────────────────────────────────────────────────
  // JAN_M1000_GOLD_COAST: '/courts/JAN_M1000_GOLD_COAST.jpg',
  // MAR_M1000_DESERT:     '/courts/MAR_M1000_DESERT.jpg',
  // MAR_M1000_BAY:        '/courts/MAR_M1000_BAY.jpg',
  // MAI_M1000_MONTE:      '/courts/MAI_M1000_MONTE.jpg',
  // MAI_M1000_ETERNAL:    '/courts/MAI_M1000_ETERNAL.jpg',
  // AGO_M1000_LAKESHORE:  '/courts/AGO_M1000_LAKESHORE.jpg',
  // AGO_M1000_ATLANTIC:   '/courts/AGO_M1000_ATLANTIC.jpg',
  // OUT_M1000_DRAGON:     '/courts/OUT_M1000_DRAGON.jpg',
  // NOV_M1000_CAPITAL:    '/courts/NOV_M1000_CAPITAL.jpg',
};

/**
 * Retorna a URL da imagem de um torneio, ou null se não houver.
 * @param {string|null} tournamentId
 * @returns {string|null}
 */
export function getCourtImages(tournamentId) {
  if (!tournamentId) return null;
  return COURT_IMAGES[tournamentId] ?? null;
}
