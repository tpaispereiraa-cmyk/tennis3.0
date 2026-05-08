# PALMARES FIX — Mudanças

## Problema
Palmarès na aba Carreira exibia contagem errada de títulos por categoria (ex: Grand Slams = 3 quando eram 2).

## Causa
Double counting em `UnifiedPlayerProfile2.jsx`. A fórmula somava:
- `ct[key]` → `careerTitles` do jogador (atualizado pelo DevelopmentSystem lendo tournamentResults)
- `uvWins.filter(...)` → releitura direta de tournamentResults

Ambas as fontes apontavam para os mesmos dados.

## Arquivos Modificados
- `src/components/UnifiedPlayerProfile2.jsx`
  - Fórmula do Palmarès: usa apenas `uvWins` quando `tournamentResults` disponível
  - `total` de títulos: mesma correção
  - Removido label "X histórico" (era enganoso)

