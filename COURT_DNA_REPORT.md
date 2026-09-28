# Court DNA — relatório do megapatch

## Escopo e arquivos

O repositório local já continha 233 arquivos de código fonte modificados ou novos antes deste trabalho, inclusive os módulos modernos de movimento e de decisão. Como `origin/main` ainda não continha vários desses módulos, a branch `codex/court-dna` leva o estado atual do código fonte junto com o patch. Caches, build, saves, compactados e um executável solto ficaram fora do commit.

Arquivos centrais do patch, por responsabilidade:

- Identidade e jogadores: `src/domain/players/PlayerCourtIdentity.js`, `src/domain/players/players.js`, `src/systems/newgen/NewgenSystem.js`.
- Decisão e construção: `src/systems/shotengine/ShotTacticalBrain.js`, `src/systems/shotengine/PointPatternDirector.js`, `src/systems/shotengine/ShotBlueprints.js`, `src/systems/shotengine/ShotMemory.js`, `src/systems/shotengine/ShotDiagnostics.js`.
- Movimento: `src/systems/movement/TennisMovement.js`, `src/systems/movement/ContactPointPlanner.js`, `src/systems/movement/FootworkPlanner.js`, `src/systems/movement/RecoveryPositioning.js`.
- Saque, devolução e simulação rápida: `src/systems/shotengine/ServeEngine.js`, `src/systems/shotengine/ReturnEngine.js`, `src/core/FastSimulation.js`.
- Adaptação observacional: `src/systems/shotengine/OpponentObservation.js`.
- Verificação: `scripts/verify-court-identity.mjs`, `scripts/verify-point-pattern-director.mjs`, `scripts/verify-opponent-adaptation.mjs`, `scripts/verify-player-behavior-fingerprint.mjs`.

## Arquitetura

Antes, `PlayerCourtIdentity` continha sobretudo favorite play, instinct e blind spot. `RallyConstruction`, `RallyDirector` e `TacticalPlanner` mantinham conceitos e estado, mas o `ShotTacticalBrain` moderno não consumia a construção nem o plano de partida no score. A memória aplicava custos de repetição praticamente iguais para todos.

Agora, percepção, física, footwork e qualidade de contato continuam a determinar as opções alcançáveis. `ShotBlueprints` e `requirementFactor` definem os golpes viáveis. `PointPatternDirector` interpreta a memória de golpes executados e a posição observável do rival; ele fornece apenas biases. `PlayerCourtIdentity`, match plan, superfície, memória e leitura do adversário também fornecem biases separados. `ShotTacticalBrain` soma essas parcelas ao valor previsto, escolhe o golpe e expõe cada componente em `candidateScores`. `ShotTargeting`, `SignatureMoves` e `ShotExecution` continuam responsáveis por alvo, versão especial e física. A execução alimenta `ShotMemory` e `OpponentObservation`. Os módulos antigos continuam como auxiliares de estado e perfis onde ainda são usados; a autoridade final de groundstrokes é somente o `ShotTacticalBrain`.

## Observação em partidas Mid

Amostra: duas partidas por jogador contra Hassan, US Open, três sets. São frequências observadas, não metas fixas. Variação aleatória entre execuções é esperada.

| Jogador | Drop | Slice | Topspin | Flat | Ângulo curto | Runaround | Profundidade média atrás da linha | Rally médio |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Nakamura | 0,9% | 19,0% | 26,4% | 0,3% | 11,2% | 1,1% | 0,42 m | 3,37 |
| Vantorini | 0% | 2,4% | 28,2% | 11,1% | 4,9% | 11,8% | 0,36 m | 2,69 |
| Kasperk | 0% | 14,4% | 32,2% | 1,6% | 5,3% | 0,8% | 0,67 m | 3,57 |
| Bjornstad | 0,5% | 15,8% | 27,9% | 0,9% | 14,9% | 1,4% | 0,42 m | 3,03 |

Nakamura, na amostra inicial anterior à revisão da janela física do drop, executou 0 drops em 343 golpes. Na amostra final, executou 0,9% em 348 golpes, ativou `DEPTH_TO_DROP` três vezes, usou mais slice e ângulo curto que Vantorini e continuou preferindo bolas profundas quando a curta não era adequada. Essas amostras não foram pareadas por seed e não medem causalidade isolada.

Vantorini se distingue pelo forehand de runaround e pelo drive; Kasperk, pela posição mais funda e pelos rallies mais longos; Nakamura, por slice, ângulo curto e drops ocasionais. Bjornstad mostrou ângulos e slice, mas aproximação de rede ainda foi rara nessa pequena amostra. O tempo médio de contato não estava disponível no `ShotContext` usado pela telemetria Mid; o campo sai `null` em vez de fabricar uma medida.

## Validação e limites

Passaram: build Vite; `verify-shot-brain-v2`, `verify-shot-execution`, `verify-movement-brain-v3`, `verify-contact-point-planner`, `verify-movement-coherence`, `verify-signature-moves`, `verify-serve-exchange-v2`, além dos novos testes de identidade, padrão e observação do rival. A regressão `verify-simulation-balance` ampliada passou: Fast hard 0,951, Fast street 0,980, simetria Fast 0,510 (800 partidas), Mid hard 0,917 (12 partidas) e Full headless 1,000 (2 partidas) para Vantorini contra Hassan. A amostra Full é pequena demais para concluir uma taxa estável; a simetria Fast e o balanceamento geral não indicam distorção grave.

A telemetria Mid mede decisões e posições reais, mas ainda não fornece tempo de contato e mostrou poucas aproximações e devoluções agressivas. Uma análise futura com mais partidas e adversários diferentes pode refinar esses dois recortes sem alterar as regras físicas para forçar comportamento.
