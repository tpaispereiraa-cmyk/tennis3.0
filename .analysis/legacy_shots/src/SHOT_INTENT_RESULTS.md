# Shot Intent Overlay — Resultados (v2)

## Status: ✅ Implementado

## Integridade dos arquivos

| Arquivo | Linhas | `{}` balance |
|---------|--------|-------------|
| game.js | 3575 | 603/603 ✅ |
| App.jsx | 549 | 302/302 ✅ |
| NEWME1.0.jsx | 7398 | 2948/2948 ✅ |

## Diferença para v1

v1 usava um componente React separado com `<canvas>` flutuante no canto da tela.
v2 desenha direto no canvas do jogo usando `toCanvas(gameY, gameX)` — os elementos ficam posicionados exatamente nas coordenadas reais da quadra.

## Comportamento esperado

1. Partida rodando → nenhuma mudança visual
2. Clique em **Bug 🐛** → Bug Mode ativa
3. Aparece na quadra:
   - Cruz dourada = mira real da IA (pré-scatter gaussiano)
   - Elipse tracejada = zona de imprecisão σ (grande = quality baixa)
   - Círculo branco + × = onde a bola caiu de fato
   - Retângulo verde = lado aberto da quadra adversária
   - Linha tracejada = vetor batedor → alvo
4. Arrastar o slider de timeline redesenha tudo no frame correto
5. Fechar Bug Mode remove o overlay

## Nota sobre `intentX/Y` vs `toX/toY`

`intentX/Y` é capturado antes do scatter gaussiano — é a mira exata da IA.
`toX/toY` (campo antigo) é modificado in-place pelo scatter, então já era o ponto real de queda. O novo campo `intentX/Y` é uma snapshot antes dessa modificação.
