// ============================================================
// NEWGEN IMAGE BANK
// Banco de imagens por região e gênero para newgens.
//
// Regras:
// - assignImage(country, gender) → retorna URL disponível
// - releaseImage(url) → devolve imagem ao pool quando jogador se aposenta
// - Imagem em uso não é reutilizada até ser liberada
// ============================================================

// Países da América do Sul (subset do 'americas' do jogo)
const SOUTH_AMERICA_COUNTRIES = [
  'Brasil', 'Argentina', 'Chile', 'Colômbia', 'Peru',
  'Venezuela', 'Equador', 'Uruguai', 'Paraguai'
];

// Converte ID imgur para URL direta
const img = id => `https://i.imgur.com/${id}.jpg`;

// ── BANCO DE IMAGENS ─────────────────────────────────────────
const IMAGE_BANK = {

  americas_south: {
    female: [
      img('rrWqdEU'), img('DVBU6Fl'), img('TBwcFHK'), img('aMuzqex'),
      img('Z0LBfqY'), img('tJpKz3p'), img('dTRxxBx'), img('V1jpVdx'),
      img('lbeB7IH'), img('dBLm83X'), img('M5ucdjm'), img('x6BPUIf'),
      img('ruo71wG'), img('iIGSjzm'), img('erCHZGG'), img('tOVZygI'),
      img('bnaGwdn'), img('VsofXGr'), img('XNzDd1u'), img('ZMgq2IU'),
      img('U9hlcJh'), img('DZ5zv0i'), img('i7d1VMK'), img('rjbBDi2'),
      img('ir7DAyP'), img('zHEBxof'), img('x5l6Ahy'),
    ],
    male: [
      img('jB0uqh5'), img('IcMQuEt'), img('IY0y0mF'), img('9jCHdBM'),
      img('MuvCjYO'), img('jTWf1g8'), img('9NPyWY6'), img('dFNOPhh'),
      img('IhaHoQr'), img('KYAIjeN'), img('FL0FyNx'), img('2aeDJBf'),
      img('l3A8zG3'), img('FPsQDns'), img('juObkEq'), img('IyLLzrj'),
      img('Wg82rVS'), img('ZR2oQUj'), img('kMJByhF'), img('a5xwD80'),
      img('6vLwRGr'), img('r3MmhEN'), img('V1U9Bg6'), img('rVbzRmm'),
    ],
  },

  americas_north: {
    female: [
      img('4Gzy6Qy'), img('IAu1yPc'), img('0QzKpZ4'), img('DtusTw7'),
      img('8QnH3ux'), img('FpHUL6e'), img('A9XM4uF'), img('zH7tT9c'),
      img('Op2RRfu'), img('FPGEivX'), img('2D1YLDA'), img('7US0935'),
      img('w4eaAsb'), img('CSwPT2Z'), img('djN2XZe'), img('F6yznDf'),
      img('QHpwEH4'), img('MH4Xlf0'), img('ng3P7Ra'), img('j8Rjlgk'),
      img('OtXa2IM'), img('dtwoQ3l'), img('9ZJrrmV'), img('qLoBbDp'),
      img('vnGWKOr'), img('wTvvviJ'),
    ],
    male: [
      // 'undefined' removido propositalmente
      img('eh7khoh'), img('HtuJKv5'), img('eluZ9Xl'), img('wBDLMBP'),
      img('eb0d4Lf'), img('NXTj1Dz'), img('RbKBgzO'), img('7Uyy51e'),
      img('SCsiIgY'), img('Et5ZRPB'), img('4KzNUwJ'), img('REUM51D'),
      img('Qnvh6WY'), img('rPnlaYl'), img('qcHyGrs'), img('Q4R4XrG'),
      img('9TWXnHI'), img('yw2DfXm'), img('JKlGkgp'), img('O5rTBBH'),
      img('9PVavzH'), img('YrJA8UM'), img('vR1fcIl'), img('pXBFtZ1'),
      img('fBN2Omn'),
    ],
  },

  europe: {
    female: [
      img('emwVRTN'), img('ot67WAn'), img('RfSITvb'), img('dxFy3Ap'),
      img('5i9Ay1h'), img('xNgDao9'), img('68SzgSL'), img('T0x5Qnq'),
      img('ngOt1Xy'), img('8ng3BQ6'), img('P3Xp2Uu'), img('stBZgmA'),
      img('c9Eftta'), img('xtn2bHA'), img('NNMlgtK'), img('Yoz2vvF'),
      img('ptZEmOM'), img('s7yRpZh'), img('HWbwNN0'), img('m6WkmRQ'),
      img('SFZUxfR'), img('yWW8SrF'), img('e5LRpkp'), img('06QGP6d'),
      img('oQNltBR'), img('REjpWvo'),
    ],
    male: [
      img('FynckLd'), img('ZBb3zJR'), img('ArqfNXu'), img('xjZiQq3'),
      img('RCTXBCH'), img('qUa8FCC'), img('F5enXbX'), img('HOYiZOp'),
      img('GxRoYnK'), img('bSjM9qb'), img('4pdMMMy'), img('7inXr5t'),
      img('eeJy04N'), img('7mA5M5D'), img('BnzgBkJ'), img('sIE18c2'),
      img('RrIdf9K'), img('uCcfR2z'), img('MsMW23c'), img('FsyCbnE'),
      img('4RgoTGM'), img('n9kOv98'), img('GJnZ1gj'), img('SpqQLs4'),
      img('E8nnfr4'), img('4kQNBQJ'),
    ],
  },

  asia: {
    female: [
      img('NmTfAVa'), img('DUD4AQH'), img('FrnEXCQ'), img('FIWl1wx'),
      img('FKIi75i'), img('MVIvGIF'), img('dW2G74m'), img('0KEkb7y'),
      img('qU62wzW'), img('ezJRDGY'), img('chLOlvn'), img('9AT9tGp'),
      img('1uFgttL'), img('BA1yvhS'), img('1CxnR18'), img('vOwA1A3'),
      img('JfB4ZZP'), img('ucYZxKd'), img('AKvKsIz'), img('y4UkMbe'),
      img('6k47tX8'), img('Ijaaltl'), img('VeNfmKN'), img('UTuiejj'),
      img('8VGCWys'), img('JWf3Ccv'),
    ],
    male: [
      img('lPvvwxU'), img('4ACqsgi'), img('bvTb8X4'), img('YHBmqAf'),
      img('ECih7dJ'), img('p8MsIs4'), img('Am8QyOe'), img('KZmkOY4'),
      img('Z79wCVB'), img('qxkdxQ5'), img('VeQdfH3'), img('ABF901p'),
      img('idjIimS'), img('Xqo4SWy'), img('BuGSNuR'), img('TU7dMVI'),
      img('YvNoYHO'), img('ThLuWN3'), img('q08a6Bv'), img('wGOxM9q'),
      img('q2dZpoU'), img('M0hB6Z7'), img('vt2Cw1u'), img('GY5IJWE'),
      img('SFuXHty'), img('6M87E4x'),
    ],
  },

  africa: {
    female: [
      img('BHebXHv'), img('urXZRbr'), img('TSJ6WmS'), img('EpGzMI5'),
      img('848bb2I'), img('NE6jFnu'), img('ZnwB2Ls'), img('4kemsms'),
      img('Rs9W9dS'), img('scYIpt1'), img('L96yjpw'), img('5oe4KHZ'),
      img('1oAjmag'), img('oBfMsse'), img('sdkmjle'), img('gEiM59A'),
      img('6SHggGH'), img('CATBESk'), img('2aDArZ9'), img('rIJ9PeT'),
      img('VD2IbjP'), img('7gi9hVa'), img('nokLFAc'), img('ZUgGC1X'),
      img('mxXcWYP'), img('lCWGGCT'),
    ],
    male: [
      img('9aOHUeq'), img('KLVpMnm'), img('Yx3OayK'), img('rxGH95S'),
      img('rolSXaY'), img('LHmxZ9f'), img('qJOgeiP'), img('RiDxIkd'),
      img('562uwET'), img('eIBoJNV'), img('8xHy2m7'), img('3mXZQ0h'),
      img('6J0bISl'), img('kQVSWRb'), img('10jgycw'), img('GvZAWOe'),
      img('3jFHdif'), img('iXtltOm'), img('bNtEDdZ'), img('T864ytQ'),
      img('jFNYt1u'), img('S3yjpX0'), img('sOuUuRN'), img('0WFwTUv'),
      img('sjCp1RG'), img('UMCsh82'),
    ],
  },

  oceania: {
    female: [
      img('bxR7AWu'), img('SSvCp2Y'), img('P8eQuzo'), img('oOy4jEX'),
      img('bjylKmf'), img('yG57usg'), img('AM885fC'), img('CeDZ4hM'),
      img('KpoJvWv'), img('A9ZMzs8'), img('ruTdPhf'), img('mwqQtRm'),
      img('8cd9DFP'), img('hQj82bq'), img('GVoQDQy'), img('rsZwReo'),
      img('fk4I94U'), img('wEjevbQ'), img('Djzqqcv'), img('OMrXqqk'),
      img('k5AtBol'), img('JrlNB3A'), img('fKXeI9M'), img('eVOWxcx'),
      img('Ytcefio'), img('HfPeyzp'),
    ],
    male: [
      img('Nv17FuF'), img('4ZjZqLz'), img('3Pnt6Zj'), img('J6rbZn6'),
      img('TxpS1bL'), img('Q3cW90C'), img('wTQGYyB'), img('OsEuHWz'),
      img('DxtZoeI'), img('GgTxlSA'), img('vpZauqj'), img('uTg9Ntn'),
      img('l4zq1r8'), img('ooQaA1M'), img('ieWEkXh'), img('686nK9I'),
      img('eRQt1e1'), img('fczgFIu'), img('z6F0RPs'), img('EoqUV71'),
      img('0J1P8UE'), img('SM55Bsr'), img('IrWdc3j'), img('3yOHo4G'),
      img('Q6T98gE'), img('RLXWS77'),
    ],
  },
};

// ── TRACKING DE USO ──────────────────────────────────────────
// Mapeia url → playerId para saber quem está usando cada imagem
const _inUse = new Map(); // url → playerId

// Determina a sub-região de um país
function getSubRegion(country) {
  // Remove emoji flags (formato "🇧🇷 Brasil" → "Brasil")
  const name = country.replace(/[\u{1F1E0}-\u{1F1FF}]{2}\s*/gu, '').trim();

  if (SOUTH_AMERICA_COUNTRIES.some(c => name.includes(c))) {
    return 'americas_south';
  }
  // Resto do americas (EUA, Canadá, México, etc.)
  // Verifica se é do bloco americas_north ou se caiu no americas genérico
  return 'americas_north';
}

// Resolve a chave do banco a partir do país
function getBankKey(country) {
  const name = country.replace(/[\u{1F1E0}-\u{1F1FF}]{2}\s*/gu, '').trim();

  if (SOUTH_AMERICA_COUNTRIES.some(c => name.includes(c)))  return 'americas_south';
  if (['EUA','Canadá','México'].some(c => name.includes(c))) return 'americas_north';
  if (['Inglaterra','França','Alemanha','Itália','Espanha','Rússia','Polônia',
       'Holanda','Bélgica','Portugal','Suécia','Noruega','Dinamarca',
       'República Tcheca','Áustria','Grécia'].some(c => name.includes(c))) return 'europe';
  if (['Japão','Coreia','China','Índia','Tailândia','Vietnã','Filipinas',
       'Indonésia','Malásia','Singapura','Taiwan','Hong Kong'].some(c => name.includes(c))) return 'asia';
  if (['Egito','África do Sul','Nigéria','Quênia','Marrocos','Gana',
       'Etiópia','Tanzânia','Uganda','Senegal','Costa do Marfim','Camarões'].some(c => name.includes(c))) return 'africa';
  if (['Austrália','Nova Zelândia','Fiji','Papua'].some(c => name.includes(c))) return 'oceania';

  // Fallback: americas genérico misto
  return 'americas_south';
}

// ── API PÚBLICA ───────────────────────────────────────────────

/**
 * Atribui uma imagem disponível para um newgen.
 * @param {string} country  - país do newgen (ex: "🇧🇷 Brasil")
 * @param {string} gender   - 'male' | 'female'
 * @param {string} playerId - ID único do jogador
 * @returns {string|null}   - URL da imagem ou null se esgotado
 */
export function assignImage(country, gender, playerId) {
  const key = getBankKey(country);
  const genderKey = gender === 'female' ? 'female' : 'male';
  const pool = IMAGE_BANK[key]?.[genderKey] || [];

  // Filtra apenas as disponíveis (não em uso)
  const available = pool.filter(url => !_inUse.has(url));

  if (available.length === 0) {
    // Pool esgotado — fallback para pool oposto de gênero
    const fallbackPool = IMAGE_BANK[key]?.[genderKey === 'male' ? 'female' : 'male'] || [];
    const fallbackAvailable = fallbackPool.filter(url => !_inUse.has(url));
    if (fallbackAvailable.length === 0) return null;
    const url = fallbackAvailable[Math.floor(Math.random() * fallbackAvailable.length)];
    _inUse.set(url, playerId);
    return url;
  }

  const url = available[Math.floor(Math.random() * available.length)];
  _inUse.set(url, playerId);
  return url;
}

/**
 * Libera a imagem de um jogador aposentado.
 * @param {string} url - URL da imagem a liberar
 */
export function releaseImage(url) {
  if (url) _inUse.delete(url);
}

/**
 * Libera todas as imagens de um jogador (útil se tiver photoUrl e iconUrl iguais).
 * @param {object} player - objeto do jogador com photoUrl/iconUrl
 */
export function releasePlayerImages(player) {
  if (player?.photoUrl)    releaseImage(player.photoUrl);
  if (player?.iconUrl && player.iconUrl !== player.photoUrl) releaseImage(player.iconUrl);
}

/**
 * Retorna estatísticas do banco (debug).
 */
export function getBankStats() {
  const stats = {};
  for (const [region, genders] of Object.entries(IMAGE_BANK)) {
    stats[region] = {};
    for (const [gender, pool] of Object.entries(genders)) {
      const inUse = pool.filter(url => _inUse.has(url)).length;
      stats[region][gender] = { total: pool.length, inUse, available: pool.length - inUse };
    }
  }
  return stats;
}
