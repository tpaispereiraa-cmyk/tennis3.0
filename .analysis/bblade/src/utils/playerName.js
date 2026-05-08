// ============================================================
// UTILS/PLAYER_NAME.JS — Funções de exibição de nome de jogador
// ============================================================
// Regra universal: sempre mostrar nome + alcunha juntos.
// Formato canônico: Savio "Blast Boom" Luiz
//
// player.name para newgens já vem no formato correto:
//   "Savio \"Blast Boom\" Luiz"
// player.name para originais é apenas:
//   "Savio Luiz"  (sem alcunha — exibe só o nome)
// player.nickname = parte entre aspas extraída do name
// ============================================================

/**
 * Nome completo com alcunha — formato canônico.
 * Savio "Blast Boom" Luiz
 * Se não tiver nickname, retorna só o name.
 */
export function playerFullName(player) {
  if (!player) return '';
  return player.name || '';
}

/**
 * Nome curto para contextos com espaço limitado.
 * Se tiver nickname: Primeiro "Nick"
 * Sem nickname: Primeiro Último (2 palavras)
 */
export function playerShortName(player) {
  if (!player || !player.name) return '';
  const name = player.name;
  const nick = player.nickname || extractNickname(name);
  if (nick) {
    // Pega primeiro nome real (antes das aspas)
    const firstName = name.split('"')[0].trim().split(' ')[0];
    return `${firstName} "${nick}"`;
  }
  // Sem nickname: primeiras 2 palavras
  return name.split(' ').slice(0, 2).join(' ');
}

/**
 * Apenas primeiro nome + nickname se tiver, para espaços MUITO limitados.
 * "Blast Boom" se tiver nick, senão só primeiro nome.
 */
export function playerMiniName(player) {
  if (!player || !player.name) return '';
  const nick = player.nickname || extractNickname(player.name);
  if (nick) return `"${nick}"`;
  return player.name.split(' ')[0];
}

/**
 * Extrai nickname entre aspas de um nome no formato Primeiro "Nick" Último.
 * Retorna string vazia se não houver.
 */
export function extractNickname(name) {
  if (!name) return '';
  const match = name.match(/"([^"]+)"/);
  return match ? match[1] : '';
}

/**
 * Verifica se o player tem nickname.
 */
export function hasNickname(player) {
  if (!player) return false;
  return !!(player.nickname || extractNickname(player.name || ''));
}
