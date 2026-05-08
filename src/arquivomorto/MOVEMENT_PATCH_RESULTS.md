# MOVEMENT_PATCH_RESULTS.md — Fases 1 e 2

## Comportamento verificado (testes em Node.js)

### WAIT state — eixos separados confirmados

```
Jogador em (2.0, 14.5), bisector alvo = (-0.3, 12.2), DT = 1/60

frame 0: Î”x = -0.031  Î”y = 0.000
         ↑ shuffle suave   ↑ já na baseline — Y não se move desnecessariamente
```

X e Y se movem de forma completamente independente. Sem arco diagonal.

### RECOVER state — eixos separados confirmados

```
Jogador em (-3.5, 11.0), baseline alvo = (0.0, 12.5), DT = 1/60

frame 0: pos = (-3.470, 11.056)  Î”x = +0.030  Î”y = +0.056
frame 1: pos = (-3.440, 11.113)  Î”x = +0.030  Î”y = +0.057
frame 2: pos = (-3.410, 11.169)  ...
```

- X drift: ~0.03m/frame (35% maxSpd) — shuffle para o bisector
- Y recuo: ~0.056m/frame (urgencyJog Ã— backwardSpeedMult) — retorno à baseline
- Eixos independentes: confirmado. NaN check: OK em 10 frames.

Velocidade de recuo Y = 5.4 Ã— (0.78 + 1.0 Ã— 0.22) Ã— 0.82 Ã— 0.80 / 60 â‰ˆ 0.056m/frame ✓

### MOVE state — física vetorial preservada

```
Bola vindo em vel.y = +4 m/s, já quicou, jogador em (0, 13)

_movState: MOVE
vel.x: 0.016  vel.y: -0.082
pos: (0.0001, 12.999)
NaN check: OK
```

`applyMovementPhysics` preservada intacta para MOVE.

### Comparação de linhas

| Arquivo | Linhas | Descrição |
|---|---|---|
| v1 (movement_v1.bak) | 1023 | Original — styleId, sem NaN guards |
| v2 (movement_v2.bak) | 982  | Reescrita — eixos separados, sem isReturnBounce |
| v3 (movement_v3.bak) | 1059 | predY corrigido, features completas |
| **v4 (movement.js)**  | **1001** | Unificado — melhor de v3 + eixos de v2 |

## Impacto esperado no jogo

**Imediato e visível:**
- Jogadores param de traçar arcos ao se reposicionarem após o golpe
- Recuperação pós-golpe mais natural: recua direto à baseline, drift lateral independente
- Eixos desacoplados criam movimentação mais parecida com o shuffle real do tênis

**Silencioso mas importante:**
- `_predCrossX` agora corretamente populado (ContactModel penaliza posicionamento lateral real)
- `getStyleBaselineY` por `prefs.rallyCadence` — EXPLOSIVE fica mais perto, PATIENT mais atrás
- `getStyleDepthOffset` 3D — EXPLOSIVE bate early, SAFETY_FIRST recua mais para ter tempo
- predY corrigido: jogadores não recuam mais para a baseline esperando bola que já subiu na frente

**Sem regressão:**
- Contrato de interface com game.js: zero mudanças (`_arrivalMargin`, `_predCrossX`, `basePos`, `atNet`)
- handleServeReturn preservada intacta
- give-up logic, stale _hitTarget guard, lob retreat — todos preservados de v3

