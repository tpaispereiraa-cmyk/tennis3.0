# Sumário da Sessão — Rally Intent Fix

## Contexto
Projeto: jogo de tênis com motor de simulação completo (física, IA, movimento, sons).
Arquivos fornecidos: `game.js`, `ShotMaster.js`, `MovementMaster.js`, `constants.js`.

## Problema Reportado
"O jogo parece um amistoso — troca de bola body no meio da quadra e defensiva. Por que o instinto de pontuar, bolas paralelas e afins não estão entrando?"

## Investigação
Análise completa de 12.500+ linhas de código. Pipeline seguido:

1. `tryHit` → `evaluateContact` → `finalQuality`
2. `finalQuality` → `executeRallyShot` (ShotMaster.js)
3. `executeRallyShot` → `resolveHybridGroundMotive` → motive → `buildHybridGroundTarget` → `targetX/Y`

O `motive` dependia de `currentIntent`, que dependia de `resolveHybridGroundMotive`, que dependia de `currentIntent` — loop morto pois `currentIntent` nunca era atualizado pelo rally normal.

## Causa Raiz Principal
`useShotMaster = true` faz TODA a lógica de shot ir pelo `executeRallyShot` de ShotMaster.js. Mas esse path não tinha mecanismo para escalar `currentIntent` além do serve advantage window. O antigo `aiDecideShot` de ai.js (que provavelmente tinha lógica mais rica) está como código morto.

## 4 Fixes Aplicados
1. **Intent Escalation Engine** em `game.js` — escala BUILD→PRESSURE→FINISH baseado em qualidade + pressão adversária + rally length + posição.
2. **HYBRID_GROUND_MODEL widths expandidos** em `ShotMaster.js` — alvos laterais chegam perto das linhas.
3. **PRESS_OPEN/FINISH_OPEN boosts ampliados** em `ShotMaster.js` — saída real da zona central.
4. **Double-suppression removida** de TOPSPIN_NEUTRAL+BUILD — intensity não colapsava em rallies de fundo.

## Arquivos Entregues
- `game.js` — modificado (Intent Escalation Engine)
- `ShotMaster.js` — modificado (widths + boosts + double-suppression)
- `CHANGES.md` — descrição técnica das mudanças
- `SESSAO.md` — este arquivo

