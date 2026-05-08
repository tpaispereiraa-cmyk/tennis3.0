/**
 * NewgenImagePool.js
 * ─────────────────────────────────────────────────────────────────
 * Gerencia o pool de fotos para jogadores gerados pelo NewgenSystem.
 *
 * REGRAS:
 *   - Cada newgen puxa uma foto do pool do seu continente.
 *   - Se todas as fotos do continente estiverem em uso, busca em outro.
 *   - A mesma URL pode ser reutilizada, mas nunca por dois jogadores ATIVOS
 *     ao mesmo tempo — a URL só fica disponível quando o jogador se aposenta.
 *
 * DESIGN (sem estado global):
 *   O estado de uso (`inUse`) vive no state do jogo (state.newgenImagePool),
 *   não neste módulo. Todas as funções recebem e devolvem o estado.
 *
 * API pública:
 *   assignNewgenPhoto(player, poolState)  → { photo, poolState }
 *   releaseNewgenPhoto(photoUrl, poolState) → poolState
 *   createEmptyPoolState()               → poolState inicial
 */


// ═══════════════════════════════════════════════════════════════════
// 1. POOLS DE IMAGEM POR CONTINENTE
// ═══════════════════════════════════════════════════════════════════

export const IMAGE_POOLS = {

  AM_SUL: [
    'https://files.catbox.moe/mckl3h.png',
    'https://files.catbox.moe/84kbho.png',
    'https://files.catbox.moe/y73z1f.png',
    'https://files.catbox.moe/by8mfu.png',
    'https://files.catbox.moe/13dw1c.png',
    'https://files.catbox.moe/2j1e7e.png',
    'https://files.catbox.moe/fibc7n.png',
    'https://files.catbox.moe/qh42nu.png',
    'https://files.catbox.moe/vh0hv4.png',
    'https://files.catbox.moe/artz6h.png',
    'https://files.catbox.moe/mpp3w3.png',
    'https://files.catbox.moe/fg0w6v.png',
    'https://files.catbox.moe/3jrix4.png',
    'https://files.catbox.moe/w7vq7s.png',
    'https://files.catbox.moe/060l73.png',
    'https://files.catbox.moe/pl0d2s.png',
    'https://files.catbox.moe/w4jbzh.png',
    'https://files.catbox.moe/0r5jm0.png',
    'https://files.catbox.moe/jcepo8.png',
    'https://files.catbox.moe/bdp613.png',
  ],

  AM_NORTE: [
    'https://files.catbox.moe/4ex7k0.png',
    'https://files.catbox.moe/y6k3fn.png',
    'https://files.catbox.moe/qy0ywk.png',
    'https://files.catbox.moe/8kmqfg.png',
    'https://files.catbox.moe/kp3fxk.png',
    'https://files.catbox.moe/a3m9w6.png',
    'https://files.catbox.moe/lyqcpr.png',
    'https://files.catbox.moe/6n5px1.png',
    'https://files.catbox.moe/qaa413.png',
    'https://files.catbox.moe/8vb2r7.png',
    'https://files.catbox.moe/6h1id5.png',
    'https://files.catbox.moe/dqjyys.png',
    'https://files.catbox.moe/spihtu.png',
    'https://files.catbox.moe/3sfj9r.png',
    'https://files.catbox.moe/w37dnx.png',
    'https://files.catbox.moe/skaxs4.png',
    'https://files.catbox.moe/76rp3x.png',
    'https://files.catbox.moe/697z8z.png',
    'https://files.catbox.moe/s6oem4.png',
    'https://files.catbox.moe/7ipe2z.png',
  ],

  OCEANIA: [
    'https://files.catbox.moe/m82pi0.png',
    'https://files.catbox.moe/m4muau.png',
    'https://files.catbox.moe/fmzsq3.png',
    'https://files.catbox.moe/bjojsh.png',
    'https://files.catbox.moe/23kuos.png',
    'https://files.catbox.moe/niha4g.png',
    'https://files.catbox.moe/b3q647.png',
    'https://files.catbox.moe/00ffdk.png',
    'https://files.catbox.moe/xmwn8m.png',
    'https://files.catbox.moe/9lxaet.png',
    'https://files.catbox.moe/1op3un.png',
    'https://files.catbox.moe/4t64iv.png',
    'https://files.catbox.moe/tpqngx.png',
    'https://files.catbox.moe/d06mr6.png',
    'https://files.catbox.moe/vrxgt4.png',
    'https://files.catbox.moe/coz4h6.png',
    'https://files.catbox.moe/0bawbw.png',
    'https://files.catbox.moe/0l4v9j.png',
    'https://files.catbox.moe/x90oje.png',
    'https://files.catbox.moe/63b0d9.png',
  ],

  AFRICA: [
    'https://files.catbox.moe/190n0p.png',
    'https://files.catbox.moe/5ye38l.png',
    'https://files.catbox.moe/1l4oxi.png',
    'https://files.catbox.moe/kwv24a.png',
    'https://files.catbox.moe/4dc9k8.png',
    'https://files.catbox.moe/iyzju7.png',
    'https://files.catbox.moe/w7ihbc.png',
    'https://files.catbox.moe/7g85up.png',
    'https://files.catbox.moe/gkzrp6.png',
    'https://files.catbox.moe/s7vx2v.png',
    'https://files.catbox.moe/m91uzb.png',
    'https://files.catbox.moe/cv73jq.png',
    'https://files.catbox.moe/a0neld.png',
    'https://files.catbox.moe/ng9rt6.png',
    'https://files.catbox.moe/psq8jh.png',
    'https://files.catbox.moe/764pv6.png',
    'https://files.catbox.moe/rew0wt.png',
    'https://files.catbox.moe/52mzwy.png',
    'https://files.catbox.moe/vcc1x5.png',
    'https://files.catbox.moe/4ahd2v.png',
  ],

  ASIA: [
    'https://files.catbox.moe/2x341f.png',
    'https://files.catbox.moe/u34z1i.png',
    'https://files.catbox.moe/xz51pr.png',
    'https://files.catbox.moe/0cgbnv.png',
    'https://files.catbox.moe/jkckji.png',
    'https://files.catbox.moe/f5q2lg.png',
    'https://files.catbox.moe/i23kia.png',
    'https://files.catbox.moe/xavfmy.png',
    'https://files.catbox.moe/oekghq.png',
    'https://files.catbox.moe/ex0t81.png',
    'https://files.catbox.moe/dr3anh.png',
    'https://files.catbox.moe/qh4m9v.png',
    'https://files.catbox.moe/owqsx1.png',
    'https://files.catbox.moe/rp3v3p.png',
    'https://files.catbox.moe/kqhe9v.png',
    'https://files.catbox.moe/smw0fi.png',
    'https://files.catbox.moe/xfajrl.png',
    'https://files.catbox.moe/rdgper.png',
    'https://files.catbox.moe/lgq6ts.png',
    'https://files.catbox.moe/q75c7l.png',
    'https://files.catbox.moe/stcwtu.png',
    'https://files.catbox.moe/u8vizg.png',
    'https://files.catbox.moe/8uon7n.png',
    'https://files.catbox.moe/sz8f8j.png',
    'https://files.catbox.moe/wd1zzy.png',
    'https://files.catbox.moe/i2w4j7.png',
    'https://files.catbox.moe/4sevth.png',
    'https://files.catbox.moe/y2t1h6.png',
    'https://files.catbox.moe/xxqtde.png',
    'https://files.catbox.moe/37h13v.png',
    'https://files.catbox.moe/4wozbm.png',
    'https://files.catbox.moe/w3n7yc.png',
    'https://files.catbox.moe/pij6cc.png',
    'https://files.catbox.moe/5si200.png',
    'https://files.catbox.moe/hsn7qf.png',
    'https://files.catbox.moe/d22cxv.png',
    'https://files.catbox.moe/qpy9jl.png',
    'https://files.catbox.moe/mw6vcx.png',
    'https://files.catbox.moe/duamca.png',
    'https://files.catbox.moe/3ok03x.png',
    'https://files.catbox.moe/x61te2.png',
    'https://files.catbox.moe/z5jmr1.png',
    'https://files.catbox.moe/ca2ege.png',
    'https://files.catbox.moe/ni1hp8.png',
    'https://files.catbox.moe/o8s10a.png',
  ],

  EUROPA: [
    'https://files.catbox.moe/p1g87n.png',
    'https://files.catbox.moe/2sh9rf.png',
    'https://files.catbox.moe/5wyydg.png',
    'https://files.catbox.moe/xal46q.png',
    'https://files.catbox.moe/n86sw0.png',
    'https://files.catbox.moe/vsmv50.png',
    'https://files.catbox.moe/qim63f.png',
    'https://files.catbox.moe/kulazw.png',
    'https://files.catbox.moe/oujrus.png',
    'https://files.catbox.moe/kufd4b.png',
    'https://files.catbox.moe/4717rw.png',
    'https://files.catbox.moe/m8fri8.png',
    'https://files.catbox.moe/srhyqk.png',
    'https://files.catbox.moe/md5t2u.png',
    'https://files.catbox.moe/8zlfte.png',
    'https://files.catbox.moe/l08jfv.png',
    'https://files.catbox.moe/pvefh9.png',
    'https://files.catbox.moe/usx4gn.png',
    'https://files.catbox.moe/gqv9by.png',
    'https://files.catbox.moe/oiydhd.png',
    'https://files.catbox.moe/hx87k5.png',
    'https://files.catbox.moe/sxp141.png',
    'https://files.catbox.moe/m6qwut.png',
    'https://files.catbox.moe/kt9ktk.png',
    'https://files.catbox.moe/euicai.png',
    'https://files.catbox.moe/vkr1d7.png',
    'https://files.catbox.moe/1r0mwg.png',
    'https://files.catbox.moe/p8bb18.png',
    'https://files.catbox.moe/dfrjv1.png',
    'https://files.catbox.moe/qgxugq.png',
    'https://files.catbox.moe/nxcpkd.png',
    'https://files.catbox.moe/iaqgkw.png',
    'https://files.catbox.moe/bx4kxy.png',
    'https://files.catbox.moe/nfn1fv.png',
    'https://files.catbox.moe/nwc5nx.png',
    'https://files.catbox.moe/fry68t.png',
    'https://files.catbox.moe/af4sv0.png',
    'https://files.catbox.moe/dnepmw.png',
    'https://files.catbox.moe/gghrsp.png',
    'https://files.catbox.moe/hgdupq.png',
    'https://files.catbox.moe/z4tp28.png',
    'https://files.catbox.moe/c273gu.png',
    'https://files.catbox.moe/io44ve.png',
    'https://files.catbox.moe/u6ek7k.png',
    'https://files.catbox.moe/e6q3bt.png',
    'https://files.catbox.moe/jl4t31.png',
    'https://files.catbox.moe/98ydb8.png',
    'https://files.catbox.moe/l6m9uj.png',
    'https://files.catbox.moe/y5mig6.png',
    'https://files.catbox.moe/ef6n0t.png',
  ],
};

// Todas as URLs em um array único — usado como último recurso de overflow
const ALL_URLS = Object.values(IMAGE_POOLS).flat();


// ═══════════════════════════════════════════════════════════════════
// 2. MAPEAMENTO NACIONALIDADE → CONTINENTE
// ═══════════════════════════════════════════════════════════════════

const NATIONALITY_CONTINENT = {
  // Europa
  ITA: 'EUROPA', ESP: 'EUROPA', FRA: 'EUROPA', GER: 'EUROPA',
  SRB: 'EUROPA', SWE: 'EUROPA', NOR: 'EUROPA', RUS: 'EUROPA',
  GBR: 'EUROPA', NED: 'EUROPA', BEL: 'EUROPA', SUI: 'EUROPA',
  AUT: 'EUROPA', CRO: 'EUROPA', GRE: 'EUROPA', POL: 'EUROPA',
  CZE: 'EUROPA', SVK: 'EUROPA', HUN: 'EUROPA', ROU: 'EUROPA',
  BUL: 'EUROPA', DEN: 'EUROPA', FIN: 'EUROPA', POR: 'EUROPA',

  // América do Sul
  BRA: 'AM_SUL', ARG: 'AM_SUL', COL: 'AM_SUL', CHI: 'AM_SUL',
  URU: 'AM_SUL', PER: 'AM_SUL', VEN: 'AM_SUL', ECU: 'AM_SUL',
  PAR: 'AM_SUL', BOL: 'AM_SUL',

  // América Central / Norte
  USA: 'AM_NORTE', CAN: 'AM_NORTE', MEX: 'AM_NORTE',

  // Oceania
  AUS: 'OCEANIA', NZL: 'OCEANIA',

  // Ásia
  JPN: 'ASIA', KOR: 'ASIA', CHN: 'ASIA', IND: 'ASIA',
  KAZ: 'ASIA', UZB: 'ASIA', TPE: 'ASIA', THA: 'ASIA',
  INA: 'ASIA', PHI: 'ASIA', HKG: 'ASIA', MAS: 'ASIA',

  // África
  RSA: 'AFRICA', EGY: 'AFRICA', MAR: 'AFRICA', TUN: 'AFRICA',
  ALG: 'AFRICA', ZIM: 'AFRICA', NGR: 'AFRICA', KEN: 'AFRICA',
};

/** Retorna o continente de uma nacionalidade, ou 'EUROPA' como fallback. */
function getContinentForNationality(nationality) {
  return NATIONALITY_CONTINENT[nationality] ?? 'EUROPA';
}


// ═══════════════════════════════════════════════════════════════════
// 3. ESTADO DO POOL (vive no state do jogo)
// ═══════════════════════════════════════════════════════════════════

/**
 * Cria o estado inicial do pool de imagens.
 * Deve ser armazenado em `state.newgenImagePool`.
 *
 * @returns {{ inUse: string[] }}
 *   inUse: array de URLs atualmente em uso por jogadores ativos.
 *   (Array em vez de Set para serialização JSON segura no save/load.)
 */
export function createEmptyPoolState() {
  return { inUse: [] };
}


// ═══════════════════════════════════════════════════════════════════
// 4. ATRIBUIÇÃO DE FOTO
// ═══════════════════════════════════════════════════════════════════

/**
 * Atribui uma foto de pool ao newgen, seguindo as regras:
 *   1. Tenta o continente nativo do jogador primeiro.
 *   2. Se todas do continente estiverem em uso, tenta os outros.
 *   3. Se todos os pools esgotarem, recicla a URL menos usada
 *      (garante que o jogo nunca trava, mesmo com muitos newgens ativos).
 *
 * @param {object} player       — objeto do jogador (precisa de .nationality)
 * @param {object} poolState    — estado atual do pool (state.newgenImagePool)
 * @returns {{ photo: string, poolState: object }} — foto escolhida + estado atualizado
 */
export function assignNewgenPhoto(player, poolState) {
  const state = poolState ?? createEmptyPoolState();
  const inUseSet = new Set(state.inUse);

  const nativeContinent = getContinentForNationality(player.nationality);

  // Ordem de tentativa: continente nativo primeiro, depois os demais
  const continentOrder = [
    nativeContinent,
    ...Object.keys(IMAGE_POOLS).filter(c => c !== nativeContinent),
  ];

  for (const continent of continentOrder) {
    const pool = IMAGE_POOLS[continent];
    const available = pool.filter(url => !inUseSet.has(url));
    if (available.length > 0) {
      const photo = available[Math.floor(Math.random() * available.length)];
      return {
        photo,
        poolState: { inUse: [...state.inUse, photo] },
      };
    }
  }

  // Fallback: todos os pools esgotados — recicla a URL que está há mais tempo
  // em uso (a mais antiga do array inUse), liberando-a implicitamente.
  // Situação extremamente improvável em uso normal, mas garante robustez.
  const fallbackPhoto = state.inUse[0] ?? ALL_URLS[0];
  const updatedInUse = [...state.inUse.slice(1), fallbackPhoto];
  return {
    photo: fallbackPhoto,
    poolState: { inUse: updatedInUse },
  };
}


// ═══════════════════════════════════════════════════════════════════
// 5. LIBERAÇÃO DE FOTO (aposentadoria)
// ═══════════════════════════════════════════════════════════════════

/**
 * Libera a foto de um jogador aposentado, tornando-a disponível para reutilização.
 *
 * Deve ser chamado em `processSeasonRetirements` ou similar,
 * para cada jogador que se aposenta.
 *
 * @param {string} photoUrl  — URL da foto a liberar (player.photo)
 * @param {object} poolState — estado atual do pool
 * @returns {object}         — poolState atualizado
 */
export function releaseNewgenPhoto(photoUrl, poolState) {
  if (!photoUrl || !poolState) return poolState ?? createEmptyPoolState();
  return {
    inUse: (poolState.inUse ?? []).filter(url => url !== photoUrl),
  };
}

/**
 * Libera as fotos de múltiplos jogadores aposentados de uma vez.
 * Conveniente para processar um lote de aposentadorias por temporada.
 *
 * @param {object[]} retiredPlayers — array de jogadores com .photo
 * @param {object}   poolState
 * @returns {object} poolState atualizado
 */
export function releaseRetiredPhotos(retiredPlayers, poolState) {
  let state = poolState ?? createEmptyPoolState();
  for (const p of retiredPlayers) {
    if (p.photo && p.isNewgen) {
      state = releaseNewgenPhoto(p.photo, state);
    }
  }
  return state;
}


// ═══════════════════════════════════════════════════════════════════
// 6. UTILITÁRIOS DE INSPEÇÃO
// ═══════════════════════════════════════════════════════════════════

/**
 * Retorna estatísticas do pool atual — útil para debug e painel de dev.
 *
 * @param {object} poolState
 * @returns {{ total: number, inUse: number, available: number, byContinent: object }}
 */
export function getPoolStats(poolState) {
  const inUseSet = new Set((poolState ?? createEmptyPoolState()).inUse);
  const byContinent = {};

  for (const [continent, urls] of Object.entries(IMAGE_POOLS)) {
    const used = urls.filter(u => inUseSet.has(u)).length;
    byContinent[continent] = {
      total: urls.length,
      inUse: used,
      available: urls.length - used,
    };
  }

  return {
    total:     ALL_URLS.length,
    inUse:     inUseSet.size,
    available: ALL_URLS.length - inUseSet.size,
    byContinent,
  };
}

