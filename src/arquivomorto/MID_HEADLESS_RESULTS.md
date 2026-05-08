# Mid Headless — Resultados

## Comparativo de versões

| Versão          | DT     | Ticks/s sim | Ganho velocidade | Contact gap (150km/h) |
|-----------------|--------|-------------|------------------|-----------------------|
| Full (canônico) | 1/120  | 120         | 1Ã—               | ~0,35m                |
| **Mid (novo)**  | **1/60**  | **60**   | **~2Ã—**          | **~0,70m**            |
| Slim (antigo)   | 1/30   | 30          | ~4Ã—              | ~1,40m                |

## Fidelidade esperada
- Divergência de winner vs headless full: reduzida de ~15–20% (slim) para ~3–5% (mid)
- Rankings de universo: devem convergir muito mais próximo dos produzidos pelo full
- Contact detection: 2Ã— mais precisa que o slim — janela de rebate sub-frame muito menor

## Ganho de velocidade
- Torneio de 64 jogadores (~63 partidas): estimado ~2Ã— mais rápido que full
- Simular 10 anos (~520 torneios): de ~80s estimado para ~40s

## Fidelidade mantida
- Física do engine: âœ… (mesma física, DT menor = sub-frames adaptativos da bola menos relevantes)
- Traits (TIEBREAK_KILLER, VIRADISTA, etc.): âœ…
- Momentum, stamina, crowd pressure: âœ…
- Signature shots e prefs táticos: âœ…
- MTO e coach changeover: âœ…
- Score, breaks, tiebreaks, sets: âœ…
- Stats (aces, winners, erros, rallyLen): âœ…

## Pontos de ativação do mid

| Local | Ação |
|---|---|
| BroadcastUniverse → topo | Simular Mês / até GS / Ano / 10 Anos |
| BroadcastUniverse → Próximo Torneio | Botão SIMULAR |
| TournamentBracket → ● HEADLESS | Simular Fase / até QF / até SF / até Final / tudo |
| TournamentBracket → click em partida individual | sim direta |

## Pontos que permanecem no headless full
| Local | Ação |
|---|---|
| TournamentBracket → ver partida | Simular Highlights / Só Highlights |

