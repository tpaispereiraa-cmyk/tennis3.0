import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src');
const TARGETS = [
  'src/game.jsx',
  'src/systems/press/NewsEngine.js',
  'src/core/Headless.jsx',
  'src/domain/players/styles.js',
  'src/ui/universe/BroadcastUniverse.jsx',
];

const manual = new Map(Object.entries({
  'sa�ram':'saíram', 'mensur�vel':'mensurável', 'liter�rio':'literário',
  'renderiza��o':'renderização', 'aconte�a':'aconteça', 'provis�ria':'provisória',
  'Opini�es':'Opiniões', 'cobran�as':'cobranças', 'estar�':'estará',
  'inspira��o':'inspiração', 'explica��es':'explicações', 'l�em':'leem',
  'jornal�stica':'jornalística', 'secund�rios':'secundários',
  'monossil�bicas':'monossilábicas', 'Reconstru��es':'Reconstruções',
  'ineg�vel':'inegável', 'calend�rios':'calendários', 'intermedi�rios':'intermediários',
  'v�spera':'véspera', 'obst�culo':'obstáculo', 'intranspon�vel':'intransponível',
  'solit�rio':'solitário', 'coment�rios':'comentários', 'emo��es':'emoções',
  'intr�nseco':'intrínseco', 'estat�sticos':'estatísticos', 'avi�es':'aviões',
  'convic��o':'convicção', 'port�o':'portão', 'ind�stria':'indústria',
  'audi�ncias':'audiências', 'espont�neo':'espontâneo', 'jornal�stico':'jornalístico',
  'haver�':'haverá', 'movimenta��es':'movimentações', 'para�sos':'paraísos',
  'resid�ncias':'residências', 'diplom�ticas':'diplomáticas', 'reflex�o':'reflexão',
  'correla��o':'correlação', 'escurid�o':'escuridão', 'anota��es':'anotações',
  'manh�':'manhã', 'opini�es':'opiniões', 'err�ticos':'erráticos',
  'controv�rsia':'controvérsia', 'recome�ar':'recomeçar', 'aconte�am':'aconteçam',
  's�timo':'sétimo', 'd�cimo':'décimo', 'obrigat�ria':'obrigatória',
  'gen�ricas':'genéricas', '�rbita':'órbita', 'per�odos':'períodos',
  'escrut�nio':'escrutínio', 's�ncrono':'síncrono', 'exce��es':'exceções',
  'expl�cita':'explícita', 'avan�amos':'avançamos', 'diverg�ncia':'divergência',
  'reprodu��o':'reprodução', 'prel�dio':'prelúdio', 'FORMATA��O':'FORMATAÇÃO',
  'visualiza��o':'visualização', 'S�NCRONO':'SÍNCRONO', 'COSM�TICOS':'COSMÉTICOS',
  'cosm�tico':'cosmético', 'RODANDO�':'RODANDO…', 'SIMULANDO�':'SIMULANDO…',
  'campe�o':'campeão', 'Campe�o':'Campeão', 'CAMPE�O':'CAMPEÃO',
  'n�o':'não', 'N�o':'Não', 's�':'só', 'S�':'Só', 'est�':'está', 'Est�':'Está',
  '�s':'às', 'Pr�':'Pré', 'pr�':'pré', 'Balan�o':'Balanço', 'balan�o':'balanço',
  'BALAN�O':'BALANÇO', 'j�':'já', 'J�':'Já', 'ser�':'será', 'at�':'até',
  'm�s':'mês', 'd�vida':'dúvida', 'P�s':'Pós', 'p�s':'pós',
  'medi��o':'medição', 'procur�':'procurá', 'preocupa��o':'preocupação',
  'avi�o':'avião', 'li��es':'lições', '�tica':'ética', 't�picos':'tópicos',
  'pe�a':'peça', 'ter�a':'terça', 'verifica��o':'verificação', 'respond�':'respondê',
  'interrup��o':'interrupção', 'desconfian�a':'desconfiança', 'turn�':'turnê',
  'vigil�ncia':'vigilância',
}));

function filesUnder(dir) {
  const out = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (item.name === 'arquivomorto') continue;
    const full = path.join(dir, item.name);
    if (item.isDirectory()) out.push(...filesUnder(full));
    else if (/\.(?:js|jsx|ts|tsx|json)$/.test(item.name)) out.push(full);
  }
  return out;
}

const fold = (word) => word.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');
const CP1252_BYTES = new Map(Object.entries({
  '€':0x80, '‚':0x82, 'ƒ':0x83, '„':0x84, '…':0x85, '†':0x86, '‡':0x87,
  'ˆ':0x88, '‰':0x89, 'Š':0x8a, '‹':0x8b, 'Œ':0x8c, 'Ž':0x8e,
  '‘':0x91, '’':0x92, '“':0x93, '”':0x94, '•':0x95, '–':0x96, '—':0x97,
  '˜':0x98, '™':0x99, 'š':0x9a, '›':0x9b, 'œ':0x9c, 'ž':0x9e, 'Ÿ':0x9f,
}));

function decodeMojibakeCluster(cluster) {
  const bytes = [...cluster].map((char) => CP1252_BYTES.get(char) ?? char.codePointAt(0));
  return Buffer.from(bytes).toString('utf8');
}
const goodWords = new Map();
for (const file of filesUnder(ROOT)) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/[\p{L}\p{M}]+/gu)) {
    const word = match[0];
    if (word.includes('\uFFFD')) continue;
    const key = fold(word);
    if (!goodWords.has(key)) goodWords.set(key, new Set());
    goodWords.get(key).add(word);
  }
}

function matchCase(source, replacement) {
  if (source === source.toLocaleUpperCase('pt-BR')) return replacement.toLocaleUpperCase('pt-BR');
  if (/^\p{Lu}/u.test(source)) return replacement[0].toLocaleUpperCase('pt-BR') + replacement.slice(1);
  return replacement.toLocaleLowerCase('pt-BR');
}

function infer(word) {
  if (manual.has(word)) return manual.get(word);
  const pattern = '^' + fold(word).replaceAll('\uFFFD', '.') + '$';
  const matcher = new RegExp(pattern, 'u');
  const candidates = new Set();
  for (const [key, spellings] of goodWords) {
    if (!matcher.test(key)) continue;
    for (const spelling of spellings) {
      const lowered = spelling.toLocaleLowerCase('pt-BR');
      const sourceChars = [...word.toLocaleLowerCase('pt-BR')];
      const candidateChars = [...lowered];
      const accentsFit = sourceChars.every((char, index) => {
        if (char !== '\uFFFD') return true;
        const candidate = candidateChars[index] ?? '';
        return candidate.normalize('NFD') !== candidate || candidate === 'ç';
      });
      if (accentsFit) candidates.add(lowered);
    }
  }
  if (candidates.size !== 1) return { candidates: [...candidates] };
  return matchCase(word, [...candidates][0]);
}

const write = process.argv.includes('--write');
let total = 0;
for (const relative of TARGETS) {
  let source = fs.readFileSync(relative, 'utf8');
  source = source.replace(/ð(?:[\u0080-\u00bf]|[€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]){3}|â(?:[\u0080-\u00bf]|[€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]){2}|[ÃÂÎ](?:[\u0080-\u00bf]|[€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ])/gu, decodeMojibakeCluster);
  const unresolved = new Map();
  source = source.replace(/[\p{L}\p{M}\uFFFD]+/gu, (word) => {
    if (!word.includes('\uFFFD') || word.length === 1) return word;
    const replacement = infer(word);
    if (typeof replacement === 'string') {
      total += 1;
      return replacement;
    }
    unresolved.set(word, replacement.candidates);
    return word;
  });
  source = source.split(/(\r?\n)/).map((line) => {
    if (!line.includes('\uFFFD')) return line;
    if (/^\s*(?:\/\/|\/\*|\*)/.test(line)) {
      return line.replace(/\uFFFD{2,}/g, '---').replaceAll('\uFFFD', '—');
    }
    let fixed = line
      .replace(/(\d)\uFFFD/g, '$1º')
      .replace(/(ameaça real|aprendeu|voltou|chegou) \uFFFD (chave|tarde|casa|final)/g, '$1 à $2')
      .replace(/vai \uFFFD cirurgia/g, 'vai à cirurgia')
      .replace(/slots \uFFFD frente/g, 'slots à frente')
      .replace(/\uFFFD (medida|altura|espera|disposição)\b/g, 'à $1')
      .replace(/([.!?]\s+|['"`])\uFFFD (?=[\p{L}${])/gu, '$1É ')
      .replace(/\b(não|Não|isso|Isso|que|Que|resultado|Resultado|tendência|Tendência|história|História|problema|Problema|notícia|Notícia|questão|Questão|fato|Fato|rumor|Rumor|entretenimento|cifra|reflexão|silêncio|discurso|risco|histórico|situação|contexto|padrão|objetivo|favorito|especialidade|verdade|diferença|sensação|leitura|resposta|ideia|causa|parte|ponto|motivo|tipo|nome|dado|melhor|pior|tênis|jogador|atleta|campeão|calendário|ausência|Defender|cedo|tarde|acidente|novidade|processo|responsabilidade|destino|correlação|impacto|carreira|ranking|pressão|participação|trajetória|informação|posição|valor|nível|semana|vida|jogo|aqui|ele|ela) \uFFFD(?=[\s.,;:!?])/gu, '$1 é')
      .replace(/([}\p{L}]) \uFFFD (classificad[oa]|confirmad[oa]|entendid[oa]|possível|real|clara|diferente|expressiva|previsível|lento|menor|paciente|necessária|pai|trivial|cruel|belo|acidente|novidade|uma questão|um fator|um verbo|o tipo|o ano|essa|sobre|de torneio)\b/gu, '$1 é $2')
      .replace(/, \uFFFD (uma questão|o que|por si só)/gu, ', é $1')
      .replace(/}\uFFFD/g, '}º');
    return fixed;
  }).join('');
  const standaloneCount = (source.match(/\uFFFD/g) ?? []).length;
  if (write) fs.writeFileSync(relative, source, 'utf8');
  console.log(`${relative}: ${unresolved.size} palavras não resolvidas; ${standaloneCount} caracteres isolados`);
  for (const [word, candidates] of unresolved) console.log(`  ${word} -> ${candidates.join(' | ') || '(sem candidata)'}`);
}
console.log(`${write ? 'Corrigidas' : 'Corrigíveis'}: ${total} ocorrências.`);
