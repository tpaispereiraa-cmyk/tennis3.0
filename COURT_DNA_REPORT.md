# Court DNA — relatório do megapatch

## Escopo e arquivos

O repositório local já continha 233 arquivos de código fonte modificados ou novos antes deste trabalho, inclusive os módulos modernos de movimento e de decisão. Como `origin/main` ainda não continha vários desses módulos, a branch `codex/court-dna` leva o estado atual do código fonte junto com o patch. Caches, build, saves, compactados e um executável solto ficaram fora do commit.

Arquivos centrais do patch, por responsabilidade:

- Identidade e jogadores: `src/domain/players/PlayerCourtIdentity.js`, `src/domain/players/players.js`, `src/systems/newgen/NewgenSystem.js` (Nakamura, Vantorini, Kasperk, Bjornstad e Yamamoto receberam ajustes explícitos).
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
| Nakamura | 1,2% | 20,9% | 22,6% | 1,5% | 10,0% | 1,5% | 0,32 m | 3,36 |
| Vantorini | 0% | 2,9% | 30,8% | 10,1% | 7,2% | 9,9% | 0,35 m | 2,82 |
| Kasperk | 0% | 15,1% | 32,1% | 0,7% | 4,9% | 1,0% | 0,69 m | 3,33 |
| Bjornstad | 0,3% | 19,6% | 27,9% | 3,3% | 10,3% | 1,3% | 0,61 m | 3,60 |
| Yamamoto | 0% | 3,5% | 44,8% | 0% | 3,5% | 6,7% | 0,36 m | 3,19 |

Nakamura, na amostra inicial anterior à revisão da janela física do drop, executou 0 drops em 343 golpes. Na amostra final, executou 1,2% em 340 golpes, ativou `DEPTH_TO_DROP` cinco vezes, usou mais slice e ângulo curto que Vantorini e continuou preferindo bolas profundas quando a curta não era adequada. Essas amostras não foram pareadas por seed e não medem causalidade isolada.

Vantorini se distingue pelo forehand de runaround e pelo drive; Kasperk, pela posição mais funda; Nakamura, por slice, ângulo curto e drops ocasionais; Yamamoto, por aproximação à rede (2,2% dos golpes contra 0% de Kasperk). Bjornstad mostrou ângulos e slice, mas aproximação de rede ainda foi rara nessa pequena amostra. O tempo médio de contato não estava disponível no `ShotContext` usado pela telemetria Mid; o campo sai `null` em vez de fabricar uma medida.

## Validação e limites

Passaram: build Vite; `verify-shot-brain-v2`, `verify-shot-execution`, `verify-movement-brain-v3`, `verify-contact-point-planner`, `verify-movement-coherence`, `verify-signature-moves`, `verify-serve-exchange-v2`, além dos novos testes de identidade, padrão e observação do rival. Após a última mudança, `verify-simulation-balance` passou com Fast hard 0,951, Fast street 0,980, simetria Fast 0,510 (800 partidas) e Mid hard 1,000 (8 partidas). Antes da nova aproximação de topspin, a execução ampliada deu Mid hard 0,917 (12 partidas) e Full headless 1,000 (2 partidas) para Vantorini contra Hassan. As amostras Mid e Full são pequenas demais para concluir taxas estáveis; a simetria Fast e o balanceamento geral não indicam distorção grave.

A telemetria Mid mede decisões e posições reais, mas ainda não fornece tempo de contato e mostrou poucas aproximações e devoluções agressivas. Uma análise futura com mais partidas e adversários diferentes pode refinar esses dois recortes sem alterar as regras físicas para forçar comportamento.
