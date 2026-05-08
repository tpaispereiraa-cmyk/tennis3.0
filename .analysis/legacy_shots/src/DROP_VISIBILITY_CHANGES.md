# DROP_VISIBILITY — Changes

## Arquivo alterado
`shotDecision.js`

## Mudanças

### 1. QUALITY_GATE.DROP: `0.40 → 0.32`
O DROP agora entra no pool de candidatos com bolas de qualidade mediana (~32%), em vez de exigir bola quase perfeita (40%). A grande maioria das situações DIFFICULT (~8–25%) ainda está abaixo do gate — o golpe continua raro.

### 2. oppDepth threshold: `0.78 → 0.68`
A condição `oppVeryDeep` foi substituída por `oppDepth > 0.68` diretamente no bloco do DROP. O adversário precisa estar além de ~8.1m da rede (era 9.3m) — ainda é "fundo", mas não extremamente fundo como antes.

### 3. rally mínimo: `>= 2 → >= 1`
O DROP pode ser considerado a partir da segunda tacada (rally >= 1) em vez da terceira. Evita que em rallies curtos de 2–3 trocas ele seja invisível.

## O que NÃO mudou
- Score base, bônus por oppDepth > 0.85, bônus por rally longo — inalterados
- tierMod (DIFFICULT × 0.40, OPPORTUNITY × 1.30) — inalterado
- Penalidades por riskProfile (SAFETY_FIRST -0.15) — inalteradas
- Proibição em retorno de saque — inalterada
- Proibição se adversário na rede — inalterada

## Intenção
O DROP continua sendo um golpe raro (~5% de uso esperado). O objetivo é apenas fazê-lo aparecer como candidato em situações táticas válidas, em vez de ser filtrado antes mesmo de ser calculado na maioria das trocas.
