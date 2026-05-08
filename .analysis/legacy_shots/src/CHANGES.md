# Hold Rate Fix — Saque como arma de verdade

## Problema
Hold rate de ~53–61% para os melhores jogadores do jogo.
1º saque ganhava quase o mesmo % de pontos que o 2º saque.
Saque parecia "coin flip" — não havia vantagem real de servir.

## Causa Raiz (diagnóstico no código)

### Bug 1 — `_returnHint` nunca chegava ao `shotDecision.js`
`computeReturnIntent()` em `game.js` calculava `'defend' / 'neutralize' / 'attack'`
com base na velocidade e qualidade do saque, gravava em `rv.ctx._returnHint`,
mas **a função `computeSituationalScores` em `shotDecision.js` nunca lia esse valor**.
Resultado: saque de 240km/h e de 120km/h produziam o mesmo pool de shots no retorno.
Este era o maior bug isolado do sistema de saque.

### Bug 2 — Serve+1 `earlyPenalty` base muito baixa
`ACCEL` no rally ≤ 1 tinha base `0.40` → mesmo com retorno fraco, o sacador raramente atacava.
`SHORT_ACCEL` no rally ≤ 1 tinha base `0.35` → idem.
Efeito: saque entrava, retorno era fraco, sacador jogava "neutro" em vez de atacar.

### Bug 3 — `_weakReturnBoost` máximo insuficiente
Threshold era `0.60`: só retornos muito fracos (Q < 0.36) davam boost real ao sacador.
Boost máximo era `0.50`: sacador atacava menos forte do que devia.
Resultado: vantagem do sacador após 1º saque bom era irreal — rally virava neutro rápido.

### Bug 4 — `servePenalty` corrosão muito branda
Threshold `120km/h` fazia até saques médios penalizarem o retorno levemente.
Cap `0.32` era baixo — saque de 200km/h só tirava -25% da qualidade do retorno.
Com `returnMult` ~0.84 (Bjornstad), a penalidade real era ainda menor.
Efeito: retornador de elite praticamente não sofria com 1º saque rápido.

### Bug 5 — `_readPauseFrames` declarado mas nunca populado (adendo)
A variável existia em `ai.js` e era resetada entre pontos, mas **nunca recebia valor
baseado na velocidade do saque** e **nunca era consumida** em `movement.js`.
Resultado: saque de 240km/h e de 160km/h moviam o receiver com a mesma eficiência
desde o frame zero — onisciência total de trajetória.

### Bug 6 — `SERVE_ADV_FINISH` / `SERVE_ADV_PRESSURE` letra morta (adendo)
Definidos em `aiCoefficients.js` com comentário "weakReturnBoost alto → FINISH",
mas **nunca importados ou lidos em nenhum outro arquivo**.
`currentIntent` do sacador ficava eternamente em `'BUILD'` independente da
vantagem gerada pelo saque — o sacador nunca entrava em modo de ataque.

---

## Mudanças

### `shotDecision.js`

**Leitura real do `_returnHint` (fix crítico):**
```
returnHint === 'defend':
  ACCEL       × 0.08  (quasi-eliminado)
  SHORT_ACCEL × 0.06
  BANANA      × 0.05
  TOPSPIN     × 0.35
  NORMAL      × 0.55
  SAFE        × 2.20 + 0.25  (dominante)
  SLICE       × 1.80 + 0.18

returnHint === 'attack' (2º saque fraco):
  ACCEL       × 1.45
  SHORT_ACCEL × 1.30
  TOPSPIN     × 1.20
  SAFE        × 0.55
  SLICE       × 0.70
```

**Serve+1 ACCEL earlyPenalty:**
- Antes: base `0.40`, cap `0.88`
- Depois: base `0.62`, cap `1.00`

**Serve+1 SHORT_ACCEL earlyPenalty:**
- Antes: base `0.35`, cap `0.80`
- Depois: base `0.55`, cap `1.00`

**Rally 2 penalidade também suavizada:**
- ACCEL: `0.65 → 0.75`
- SHORT_ACCEL: `0.60 → 0.70`

### `game.js`

**`_weakReturnBoost`:**
- Threshold: `0.60 → 0.72`
- Boost máximo: `0.50 → 0.65`

**`returnPressureSeed`:**
- Threshold: `0.65 → 0.72`
- Pressão máxima: `0.80 → 0.92`

**`servePenalty`:**
- Threshold: `120 → 145km/h`
- Cap: `0.32 → 0.44`
- Divisor: `300 → 216`
- Fator retMult: clamp `1.42 → 1.50`

**`SERVE_ADV_FINISH` / `SERVE_ADV_PRESSURE` conectados:**
- `effectiveBoost >= FINISH threshold` → `currentIntent = 'FINISH'`
- `effectiveBoost >= PRESSURE threshold` → `currentIntent = 'PRESSURE'`
- Boost expirado → reset para `'BUILD'`

### `movement.js`

**Reaction Window — delay real baseado na velocidade do saque:**
- Quando a bola cruza a rede, calcula `_readPauseFrames` pela velocidade
- Durante o delay: receiver se move para posição levemente errada (commit falso)
- Ao expirar: movimento normal restaurado
- `devolucao` alto reduz o delay (returnista lê melhor)

| Velocidade | Delay base | Com devolucao=84 |
|---|---|---|
| 240 km/h | ~8 frames | ~6 frames |
| 210 km/h | ~5 frames | ~4 frames |
| 185 km/h | ~3 frames | ~2 frames |
| 160 km/h | ~1 frame  | 0 frames  |
| <150 km/h | 0 frames | 0 frames  |

---

## Impacto esperado
| Métrica | Antes | Target |
|---|---|---|
| Hold Rate (top 2) | 53–61% | 75–85% |
| 1º saque pts ganhos | ~58% | 70–76% |
| 2º saque pts ganhos | ~51% | 53–58% |
| Gap 1º vs 2º saque | ~6pp | 15–20pp |


## Problema
Hold rate de ~53–61% para os melhores jogadores do jogo.
1º saque ganhava quase o mesmo % de pontos que o 2º saque.
Saque parecia "coin flip" — não havia vantagem real de servir.

## Causa Raiz (diagnóstico no código)

### Bug 1 — `_returnHint` nunca chegava ao `shotDecision.js`
`computeReturnIntent()` em `game.js` calculava `'defend' / 'neutralize' / 'attack'`
com base na velocidade e qualidade do saque, gravava em `rv.ctx._returnHint`,
mas **a função `computeSituationalScores` em `shotDecision.js` nunca lia esse valor**.
Resultado: saque de 240km/h e de 120km/h produziam o mesmo pool de shots no retorno.
Este era o maior bug isolado do sistema de saque.

### Bug 2 — Serve+1 `earlyPenalty` base muito baixa
`ACCEL` no rally ≤ 1 tinha base `0.40` → mesmo com retorno fraco, o sacador raramente atacava.
`SHORT_ACCEL` no rally ≤ 1 tinha base `0.35` → idem.
Efeito: saque entrava, retorno era fraco, sacador jogava "neutro" em vez de atacar.

### Bug 3 — `_weakReturnBoost` máximo insuficiente
Threshold era `0.60`: só retornos muito fracos (Q < 0.36) davam boost real ao sacador.
Boost máximo era `0.50`: sacador atacava menos forte do que devia.
Resultado: vantagem do sacador após 1º saque bom era irreal — rally virava neutro rápido.

### Bug 4 — `servePenalty` corrosão muito branda
Threshold `120km/h` fazia até saques médios penalizarem o retorno levemente.
Cap `0.32` era baixo — saque de 200km/h só tirava -25% da qualidade do retorno.
Com `returnMult` ~0.84 (Bjornstad), a penalidade real era ainda menor.
Efeito: retornador de elite praticamente não sofria com 1º saque rápido.

## Mudanças

### `shotDecision.js`

**Leitura real do `_returnHint` (fix crítico):**
```
returnHint === 'defend':
  ACCEL       × 0.08  (quasi-eliminado)
  SHORT_ACCEL × 0.06
  BANANA      × 0.05
  TOPSPIN     × 0.35
  NORMAL      × 0.55
  SAFE        × 2.20 + 0.25  (dominante)
  SLICE       × 1.80 + 0.18

returnHint === 'attack' (2º saque fraco):
  ACCEL       × 1.45
  SHORT_ACCEL × 1.30
  TOPSPIN     × 1.20
  SAFE        × 0.55
  SLICE       × 0.70
```

**Serve+1 ACCEL earlyPenalty:**
- Antes: base `0.40`, cap `0.88`
- Depois: base `0.62`, cap `1.00`

**Serve+1 SHORT_ACCEL earlyPenalty:**
- Antes: base `0.35`, cap `0.80`
- Depois: base `0.55`, cap `1.00`

**Rally 2 penalidade também suavizada:**
- ACCEL: `0.65 → 0.75`
- SHORT_ACCEL: `0.60 → 0.70`

### `game.js`

**`_weakReturnBoost`:**
- Threshold: `0.60 → 0.72` (mais retornos ativam vantagem do sacador)
- Boost máximo: `0.50 → 0.65`

**`returnPressureSeed`:**
- Threshold: `0.65 → 0.72`
- Pressão máxima: `0.80 → 0.92`

**`servePenalty`:**
- Threshold: `120 → 145km/h` (2º saque não penaliza mais)
- Cap: `0.32 → 0.44`
- Divisor ajustado: `300 → 216`
- Fator de retMult: clamp `1.42 → 1.50`

## Impacto esperado
| Métrica | Antes | Target |
|---|---|---|
| Hold Rate (top 2) | 53–61% | 75–85% |
| 1º saque pts ganhos | ~58% | 70–76% |
| 2º saque pts ganhos | ~51% | 53–58% |
| Gap 1º vs 2º saque | ~6pp | 15–20pp |
