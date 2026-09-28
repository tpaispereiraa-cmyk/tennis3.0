const ACCENTED_WORDS = `
ação ações acúmulo adaptação adversário alguém além ameaça análise análises analítico
ângulo após área audiência audiências avião aviões balanço cabeça calendário calendários
câmera campeão campeões capítulo capítulos caçador celebração clássico coleção combinação
começa começar começou competição condições confirmação confiança consequência consequências
construção construída contínua confortável convicção correlação crítica crônico decisão
declínio definição diferença difícil difíceis direção discussão distância dúvida dúvidas
edição emoções encontro época épico épica épicos estatística estatísticas estatístico estatísticos
está estão estará estética evolução expansão explicações família físico físicos frequência
função geração histórico histórica históricos história histórias ícone impossível impossíveis
imprevisível indústria informação início inspiração investigação lesão lesões licença lógica
máximo média médicas médico memória mês mídia mínima mudança mudanças nação nível não notícia
notícias número números obrigação olímpico olímpica opinião opiniões órbita país países patrimônio
período períodos posição possível pressão preparação presença próximo próxima próximos próprias
próprio público pública questão reação recuperação referência referências região relação
reputação saúde saída sensação sequência séries silêncio simulação síncrono só sólido superfície
tática táticas tático técnica técnico técnicos tênis tensão território trajetória transição
troféu troféus último última últimos únicas único versão vitória vitórias vínculo visão você
aproximação redação revelação renderização suspensão posição pontuação potência proteção
comparação comparações progressão produção validação celebração preservação projeção verificação
interrupção preocupação desconfiança vigilância medição lições tópicos terça ética turno turnê
matéria matérias título títulos estatístico estatística recorte campanha ranking campeã campeão
`.trim().split(/\s+/u);

const wordCandidates = new Map();
for (const word of ACCENTED_WORDS) {
  const signature = word.replace(/[^\x00-\x7f]/gu, '�').toLocaleLowerCase('pt-BR');
  if (!wordCandidates.has(signature)) wordCandidates.set(signature, new Set());
  wordCandidates.get(signature).add(word.toLocaleLowerCase('pt-BR'));
}

const legacyWordMap = new Map();
for (const [signature, candidates] of wordCandidates) {
  if (candidates.size === 1) legacyWordMap.set(signature, [...candidates][0]);
}

const CP1252_BYTES = new Map(Object.entries({
  '€':0x80, '‚':0x82, 'ƒ':0x83, '„':0x84, '…':0x85, '†':0x86, '‡':0x87,
  'ˆ':0x88, '‰':0x89, 'Š':0x8a, '‹':0x8b, 'Œ':0x8c, 'Ž':0x8e,
  '‘':0x91, '’':0x92, '“':0x93, '”':0x94, '•':0x95, '–':0x96, '—':0x97,
  '˜':0x98, '™':0x99, 'š':0x9a, '›':0x9b, 'œ':0x9c, 'ž':0x9e, 'Ÿ':0x9f,
}));

function decodeMojibakeCluster(cluster) {
  const bytes = [...cluster].map(char => CP1252_BYTES.get(char) ?? char.codePointAt(0));
  try { return new TextDecoder().decode(Uint8Array.from(bytes)); }
  catch { return cluster; }
}

function restoreCase(source, replacement) {
  if (source === source.toLocaleUpperCase('pt-BR')) return replacement.toLocaleUpperCase('pt-BR');
  if (/^\p{Lu}/u.test(source)) return replacement[0].toLocaleUpperCase('pt-BR') + replacement.slice(1);
  return replacement;
}

/** Repara textos de saves criados enquanto alguns templates estavam com UTF-8 quebrado. */
export function repairLegacyText(value) {
  if (typeof value !== 'string' || (!value.includes('�') && !/[ÃÂâðÎ]|ï¿½/u.test(value))) return value;

  let text = value.replaceAll('ï¿½', '�');
  for (let pass = 0; pass < 2; pass += 1) {
    text = text.replace(/ð(?:[\u0080-\u00bf]|[€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]){3}|â(?:[\u0080-\u00bf]|[€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]){2}|[ÃÂÎ](?:[\u0080-\u00bf]|[€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ])/gu, decodeMojibakeCluster);
  }

  text = text
    .replace(/\bpor tr�s\b/giu, match => restoreCase(match, 'por trás'))
    .replace(/\b(olhou|deixa|ficou|para) para tr�s\b/giu, match => match.replace(/tr�s/iu, 'trás'))
    .replace(/\btr�s(?=\s+(?:vozes|leituras|categorias|fases|sets|duelos|pontos))/giu, match => restoreCase(match, 'três'))
    .replace(/\b(sumiu da|distanciou da) m�dia\b/giu, match => match.replace(/m�dia/iu, 'mídia'))
    .replace(/\bm�dia(?=\s+(?:alimentada|esportiva|nacional))/giu, match => restoreCase(match, 'mídia'))
    .replace(/\bm�dia\b/giu, match => restoreCase(match, 'média'))
    .replace(/\bnão l�\b/giu, match => match.replace(/l�/iu, 'lê'))
    .replace(/\bl�\b/giu, match => restoreCase(match, 'lá'));

  text = text.replace(/[\p{L}\p{M}�]+/gu, (word) => {
    if (!word.includes('�')) return word;
    if (word === '�') return word;
    const replacement = legacyWordMap.get(word.toLocaleLowerCase('pt-BR'));
    return replacement ? restoreCase(word, replacement) : word.replaceAll('�', '');
  });

  text = text
    .replace(/(#\d+)\s*�\s*(?=(?:campanha|ranking|vitória|título)\b)/giu, '$1 · ')
    .replace(/(\d)�/g, '$1º')
    .replace(/\b(não|isso|que|resultado|tendência|história|problema|notícia|questão|fato|rumor|silêncio|risco|padrão|tênis|jogador|atleta|campeão|ausência|processo|responsabilidade|destino|carreira|pressão|participação|informação|valor|nível|vida|aqui|ele|ela) �(?=[\s.,;:!?])/giu, '$1 é')
    .replace(/(^|[.!?]\s+)� (?=[\p{Ll}${])/gu, '$1É ')
    .replaceAll('�', '—');

  return text;
}

const ARTICLE_TEXT_FIELDS = ['headline', 'deck', 'body', 'statLine', 'title', 'subtitle', 'summary', 'excerpt', 'caption', 'quote'];

export function repairLegacyArticle(article) {
  if (!article || typeof article !== 'object') return article;
  const repaired = { ...article };
  for (const key of ARTICLE_TEXT_FIELDS) {
    const current = repaired[key];
    if (typeof current === 'string') repaired[key] = repairLegacyText(current);
    else if (Array.isArray(current)) repaired[key] = current.map(item => typeof item === 'string' ? repairLegacyText(item) : item);
  }
  return repaired;
}
