import fs from 'node:fs';
import path from 'node:path';
import { repairLegacyText } from '../src/core/textEncoding.js';

const repairedHeadline = repairLegacyText('KOVAČ VENCE ETERNAL CITY MASTERS: O QUE OS N�MEROS REVELAM SOBRE ESTE T�TULO');
const repairedDeck = repairLegacyText('Uma an�lise do desempenho. Recorte estat�stico: ranking de entrada #1� campanha 5V-0D.');
if (repairedHeadline !== 'KOVAČ VENCE ETERNAL CITY MASTERS: O QUE OS NÚMEROS REVELAM SOBRE ESTE TÍTULO') {
  throw new Error(`Headline legada não foi recuperada: ${repairedHeadline}`);
}
if (!repairedDeck.includes('Uma análise') || !repairedDeck.includes('Recorte estatístico') || !repairedDeck.includes('#1 · campanha')) {
  throw new Error(`Deck legado não foi recuperado: ${repairedDeck}`);
}

const activeFiles = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'arquivomorto') continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(?:js|jsx|ts|tsx|json)$/u.test(entry.name)) activeFiles.push(full);
  }
}
walk(path.resolve('src'));

const corrupted = activeFiles.filter(file => !file.endsWith(`${path.sep}core${path.sep}textEncoding.js`) && fs.readFileSync(file, 'utf8').includes('�'));
if (corrupted.length) throw new Error(`U+FFFD ainda presente em:\n${corrupted.join('\n')}`);

const controlChars = activeFiles.filter(file => /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(fs.readFileSync(file, 'utf8')));
if (controlChars.length) throw new Error(`Caracteres de controle ainda presentes em:\n${controlChars.join('\n')}`);

const mojibakePattern = /ð(?:[\u0080-\u00bf]|[€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]){3}|â(?:[\u0080-\u00bf]|[€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]){2}|[ÃÂÎ](?:[\u0080-\u00bf]|[€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ])/gu;
const mojibakeFiles = activeFiles.filter(file => {
  if (file.endsWith(`${path.sep}core${path.sep}textEncoding.js`)) return false;
  mojibakePattern.lastIndex = 0;
  return mojibakePattern.test(fs.readFileSync(file, 'utf8'));
});
if (mojibakeFiles.length) throw new Error(`Mojibake ainda presente em:\n${mojibakeFiles.join('\n')}`);

console.log('Text encoding: fontes limpas e compatibilidade de save validada.');
