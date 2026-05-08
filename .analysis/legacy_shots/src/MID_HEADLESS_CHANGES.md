# Mid Headless — Mudanças

## Motivação
O modo slim (DT=1/30) produzia campeões e rankings divergentes do headless full (DT=1/120).
Root cause: `tryHit()` e `updatePlayerMovement` são chamados 1× por tick — com DT=1/30 a bola
percorre ~1,4m entre checks (a 150km/h), suficiente para o defensor "perder" a janela de contato.
Resultado: jogadores de bola rápida eram favorecidos artificialmente no slim.

O mid (DT=1/60) reduz o gap para ~0,7m — metade do slim — com ~2× ganho de velocidade
sobre o full, mantendo fidelidade muito próxima do headless canônico.

## Arquivos alterados

### Headless.jsx
- Adicionada constante `DT_MID = 1 / 60`
- Comentário de `DT_SLIM` atualizado para deixar claro a diferença de fidelidade
- Criada e exportada `simulateMatchMid(...)` — clone exato de `simulateMatchSlim`
  usando `DT_MID` no lugar de `DT_SLIM`

### components/UniverseManager.jsx
- Import trocado: `simulateMatchSlim` → `simulateMatchMid`
- As duas chamadas dentro de `runTournament()` trocadas para `simulateMatchMid`
  (R64 qualificatória e R32→Final)

### components/TournamentBracket.jsx
- Import expandido: adicionado `simulateMatchMid`
- `runSingleMatchSlim` (usado pelo botão `● HEADLESS`) agora chama `simulateMatchMid`
- `runSingleMatch` (highlights) e `runSingleMatchFast` (⚡ RÁPIDA) inalterados

## O que NÃO muda
- Highlights continuam usando `simulateAndCollectHighlights` com DT_HEADLESS (1/120)
- Botão ⚡ RÁPIDA continua usando FastSimulation inalterado
- `simulateMatchSlim` permanece exportado (disponível para uso futuro se necessário)
