# Slim Headless — Mudanças

## O que foi feito

Criada versão slim do engine headless: mesma física, traits, momentum, stamina, crowd pressure, MTO, coach changeover e signature shots — porém com DT maior (1/15 vs 1/120), resultando em ~4Ã— menos ticks e velocidade 3–4Ã— maior. Sem gravação de frames, portanto incompatível com highlights/replay.

### Headless.jsx
- Adicionada constante `DT_SLIM = 1 / 15`
- Criada e exportada `simulateMatchSlim(...)` — clone de `simulateMatchHeadless` usando `DT_SLIM`, sem gravação de frames

### TournamentBracket.jsx
- Importada `simulateMatchSlim`
- Criada `runSingleMatchSlim` (paralela a `runSingleMatch`)
- Botão `● HEADLESS` (Qualifying e Main Draw) agora passa `runSingleMatchSlim` para `simQToTarget`/`simMToTarget`
- Todas as funções de sim de bracket (`simQ`, `simQRound`, `simQAll`, `simM`, `simMRound`, `simMAll`) trocadas para `runSingleMatchSlim`
- `runSingleMatch` (headless full) mantido — usado exclusivamente pelo caminho de highlights via `onWatchMatch`

### UniverseManager.jsx
- Importada `simulateMatchSlim`; import de `simulateMatchHeadless` removido (não mais usado)
- As duas chamadas dentro de `runTournament()` trocadas para `simulateMatchSlim`:
  - Rodada 1 (qualificatória, R64)
  - Rodadas seguintes (R32 → Final)
- Isso cobre automaticamente todos os modos: Simular Mês, Simular até GS/Finals, Simular Ano, Simular 10 Anos, e o botão Simular do Próximo Torneio no BroadcastUniverse

### BroadcastUniverse.jsx
- Sem alteração — já roteia via `onSimulate → handleSimulate → runTournament`

## O que NÃO muda
- Highlights ("Simular e Ver" / "Só Highlights") continuam usando `simulateAndCollectHighlights` com headless full
- Botão `⚡ RÁPIDA` continua usando `FastSimulation` inalterado

