# Slim Headless — Resultados

## Ganho de velocidade esperado
- DT: 1/120 → 1/15 = 8× menos ticks por ponto
- Ganho real estimado: **3–4× mais rápido** (overhead fixo por ponto atenua o ganho teórico de 8×)
- Simular um torneio de 64 jogadores (~63 partidas) que levava ~8s deve passar para ~2–3s

## Fidelidade mantida
- Física do engine: ✅
- Traits (TIEBREAK_KILLER, VIRADISTA, etc.): ✅
- Momentum, stamina, crowd pressure: ✅
- Signature shots e prefs táticos: ✅
- MTO e coach changeover: ✅
- Score, breaks, tiebreaks, sets: ✅
- Stats (aces, winners, erros, rallyLen): ✅

## O que se perde
- Frames gravados → highlights indisponíveis no modo slim (esperado e intencional)
- Leve variação em pontos muito curtos (física sub-frame), sem impacto no resultado

## Pontos de ativação do slim

| Local | Ação |
|---|---|
| BroadcastUniverse → topo | Simular Mês / até GS / Ano / 10 Anos |
| BroadcastUniverse → Próximo Torneio | Botão SIMULAR |
| TournamentBracket → ● HEADLESS | Simular Fase / até QF / até SF / até Final / tudo |
| TournamentBracket → click em partida individual | sim direta (simQ / simM) |

## Pontos que permanecem no headless full
| Local | Ação |
|---|---|
| TournamentBracket → ver partida | Simular Highlights / Só Highlights |
