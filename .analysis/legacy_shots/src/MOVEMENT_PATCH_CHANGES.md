# MOVEMENT_PATCH_CHANGES.md — Fases 1 e 2

## O problema

Três arquivos de movimento coexistiam (`movement.js`, `movement2.js`, `movement3.js`) com
lógicas distintas e sobrepostas. Nenhuma flag clara indicava qual estava ativo além de um
import estático em `game.js`. Cada versão tinha features que as outras não tinham.

---

## Fase 1 — Esqueleto unificado (base: v3)

**Arquivo base:** `movement3.js` (o mais completo e correto)

### O que v3 tinha que v1 não tinha

| Feature | v1 | v3 |
|---|---|---|
| `getStyleBaselineY` por `prefs.rallyCadence` | styleId direto | prefs ✓ |
| `getStyleDepthOffset` 3 dimensões | styleId direto | rallyCadence + riskProfile + netGame ✓ |
| `predY` em `computeMoveTarget` | baseline fixa | projeção de 0.18s ✓ |
| `_predCrossX` setado em MOVE | bug — nunca setado | setado corretamente ✓ |
| Antecipação de padrão por `rallyCadence` | binário (RETRIEVER/CTR) | contínuo ✓ |

### Correção do predY (fix principal de v3)

**Bug em v1:** `predictTrajectory` recebia `predY = baselineY` (posição fixa atrás da
linha de fundo). Bola que quicava e subia encontrava o `optimalHitPoint` muito atrás do
jogador — ele recuava demais, chegava tarde, preparação ruim.

**Fix em v3:** `predY = ballY + ballVY × 0.18` — projeta onde a bola estará em ~0.18s
(tempo médio para subir do quique até a HIP/SWEET zone). O `optimalHitPoint` cai em
posição mais realista e o jogador se posiciona corretamente.

---

## Fase 2 — Eixos X/Y separados no WAIT/RECOVER (de v2)

**Função adicionada:** `applyWaitMovement(player, target, dt)`

### O problema do arco circular

`applyMovementPhysics` trata X e Y como um vetor único. Ao mover o jogador de posição
lateral para o bisector durante o WAIT, o player traçava um arco circular em vez de:
- Recuar em Y diretamente para a baseline (urgente, deliberado)
- Mover em X lateralmente de forma independente (shuffle suave)

Em tênis real esses dois movimentos são **fisicamente independentes** — o jogador recua
com os pés enquanto ajusta a posição lateral com passos laterais (shuffle), sem criar diagonal.

### Implementação

```
WAIT / RECOVER → applyWaitMovement (eixos separados)
  Y: physMax × urgencyJog × backwardSpeedMult  (recuo deliberado)
  X: physMax × 0.35                             (shuffle independente)

MOVE → applyMovementPhysics (vetor urgente, unchanged)
  Precisa do vetor diagonal para chegar ao intercept com urgência calculada.
```

### Guarda de NaN/Infinity (de v2)

Adicionado em `applyWaitMovement` e `applyMovementPhysics`:

```js
if (!isFinite(player.vel.x)) player.vel.x = 0;
if (!isFinite(player.vel.y)) player.vel.y = 0;
if (!isFinite(player.pos.x)) player.pos.x = 0;
if (!isFinite(player.pos.y)) player.pos.y = player.side * (COURT.halfL + 1.0);
```

Previne freeze silencioso quando física produz NaN (ex: divisão por zero em bola parada).

---

## Arquivos

| Arquivo | Status |
|---|---|
| `movement.js` | **Novo** — v4 unificado (fases 1+2) |
| `movement2.js` | Removido — funcionalidades migradas |
| `movement3.js` | Removido — usado como base |
| `_movement_v1.js.bak` | Backup de v1 original |
| `_movement_v2.js.bak` | Backup de v2 |
| `_movement_v3.js.bak` | Backup de v3 |

## game.js

**Nenhuma alteração necessária.** O import `from './movement.js'` e as funções exportadas
(`updatePlayerMovement`, `getStyleBaselineY`) mantêm a mesma assinatura.
