# DROP_VISIBILITY — Results

## Diagnóstico original
Nos 16 pontos do log de teste, o DROP apareceu como candidato 1 vez e foi executado 0 vezes. A causa: QUALITY_GATE.DROP = 0.40 filtrava ~95% das bolas antes de qualquer cálculo ser feito.

## Comportamento esperado após a mudança

| Situação | Antes | Depois |
|---|---|---|
| Bola DIFFICULT (Q 8–25%) | DROP invisível | DROP invisível (ainda abaixo do gate 0.32) |
| Bola NEUTRAL (Q 32–62%) | DROP raramente calculado | DROP aparece como candidato de baixo EV |
| Bola OPPORTUNITY (Q 62%+) | DROP como candidato forte | DROP como candidato forte (inalterado) |
| Adversário a ~8m (oppDepth ~0.67) | DROP bloqueado | DROP disponível |
| Adversário a ~9.3m (oppDepth ~0.78) | DROP disponível | DROP disponível |
| Rally de 1 tacada | DROP bloqueado | DROP disponível |

## Frequência esperada
O DROP ainda compete com TOPSPIN (score dominante) e ACCEL em situações OPPORTUNITY. O score base (~0.30–0.45 em boas condições) multiplicado por tierMod NEUTRAL (×0.90) resulta em EV inferior ao TOPSPIN na maioria dos casos — o golpe aparece no pool mas raramente é selecionado. Frequência estimada: 4–7% em jogadores com controle alto.
