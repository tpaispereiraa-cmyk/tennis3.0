# PALMARES FIX — Resultados

## Correção
- Palmarès agora exibe contagem correta por categoria (GS, Masters 1000, ATP 500, ATP 250)
- Total de títulos também corrigido
- Fonte única: `uvWins` (lido de `tournamentResults`) quando em contexto de universo

## Sem efeitos colaterais
- Aba Resultados (contador de Títulos no header) não foi afetada — usava fonte diferente e correta
- Jogadores sem `tournamentResults` (fora de universo) continuam usando `careerTitles` normalmente

