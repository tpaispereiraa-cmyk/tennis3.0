# TENNIX ME — Mudanças Aplicadas (Patch v1.1)

## Arquivos modificados
- `src/ai.js`
- `src/styles.js`
- `src/constants.js`
- `src/players.js`

---

## Bug #1 — Jogadores não movem em Y (CORRIGIDO)
**Arquivo:** `src/ai.js` → `updatePlayer()`

O `target.y` era sempre `player.basePos.y`. Agora usa `landPoint` do `predictTrajectory()` para mover o jogador em direção ao ponto de quique estimado da bola. O jogador avança até 2.5m da posição base (maxForward) e pode recuar até 0.8m (maxBack). Se não há landPoint, usa o crossPoint como fallback. Após bater a bola, retorna automaticamente à posição base.

---

## Bug #2 — Drop shots e bolas curtas ignoradas (CORRIGIDO)
**Arquivo:** `src/ai.js` → `updatePlayer()`

`predY` era fixo em `halfL * 0.55` (~6.5m da rede). Bolas curtas nunca cruzavam essa linha. Agora: se a bola está no lado do jogador e a menos de 4.5m da rede, `predY` cai para `halfL * 0.25` (~3m da rede), capturando o `crossPoint` correto. Adicionado fallback usando `landPoint` diretamente quando `crossPoint` é null.

---

## Melhoria #3 — baselineOffset reduzido nos estilos (APLICADO)
**Arquivo:** `src/styles.js`

| Estilo | Antes | Depois |
|--------|-------|--------|
| AGG_BASELINER | 1.5m | 0.4m |
| ALL_COURT | 1.2m | 0.5m |
| BIG_SERVER | 1.0m | 0.3m |
| CTR_PUNCHER | 0.3m | sem alteração |
| SRV_VOL | 0.8m | sem alteração |
| RETRIEVER | 0.2m | sem alteração |

---

## Melhoria #4 — baselineOffset dinâmico por momentum (APLICADO)
**Arquivo:** `src/ai.js` → `updatePlayer()`

O offset base do estilo agora é ajustado dinamicamente pelo momentum do jogador:
- `momentum 0.5` → offset normal
- `momentum 0.1` → offset +0.48m (recua sob pressão)
- `momentum 0.9` → offset -0.30m (avança com confiança)

Fórmula: `dynamicOffset = style.baselineOffset + clamp((0.5 - mom) * 1.2, -0.3, 0.6)`

---

## Melhoria #5 — STAMINA rebalanceada (APLICADO)
**Arquivo:** `src/constants.js`

| Campo | Antes | Depois |
|-------|-------|--------|
| `decayPerShot` | 0.018 | 0.032 |
| `recoveryPerPoint` | 0.38 | 0.18 |

O sistema de fadiga agora impacta o jogo: em rallies longos (8+ bolas) o jogador começa a sentir o cansaço. A recuperação entre pontos é parcial, acumulando fadiga ao longo do set.

---

## Melhoria #6 — patienceRallyMin mínimo = 2 (APLICADO)
**Arquivo:** `src/players.js` → `computePlayerMods()`

`Math.round(1 + ...)` → `Math.round(2 + ...)`. Range agora é 2..7.
RAIVOSINHO (paciência 40): antes podia errar no rally 2, agora mínimo rally 4.

---

## Melhoria #7 — Scatter de profundidade sob pressão (APLICADO)
**Arquivo:** `src/ai.js` → `aiDecideShot()`

Adicionado scatter no `depth` proporcional à falta de qualidade de posicionamento:
`depthScatter = (1 - quality) * 0.18` — até ±18% de profundidade no quality=0.
Bola pode sair curta demais ou funda demais quando jogador está mal posicionado.

---

## Melhoria #8 — Caps de netApproachRate por estilo (APLICADO)
**Arquivo:** `src/players.js` → `applyModsToStyle()`

Caps máximos por estilo substituem o cap global de 0.95:

| Estilo | Cap |
|--------|-----|
| AGG_BASELINER | 0.38 |
| CTR_PUNCHER | 0.14 |
| ALL_COURT | 0.52 |
| SRV_VOL | 0.92 |
| BIG_SERVER | 0.30 |
| RETRIEVER | 0.06 |

---

## Patch v1.3 (Auditoria v3) — 4 fixes

### Fix v3-A — THRESHOLDS.errorRallyMin 1→2
**constants.js** · O fix de patience (v1.1) só protegia jogadores nomeados. Genéricos ainda podiam errar no rally 2. Corrigido no fallback.

### Fix v3-B — underPressure sticky
**game.js → tryHit()** · underPressure nunca voltava a false no meio de um rally. Agora reseta quando diff < 0.45 e ball.z ≥ 0.55 — jogador recuperado sai do modo defensivo.

### Fix v3-C — SRV_VOL dead code na guarda de serve
**game.js → tickServing()** · `lobsReceived < 2` era always true no momento do saque (lobsReceived reseta entre pontos). Removida guarda inerte.

### Fix v3-D — tickPreServe receiver ignora baselineOffset
**game.js → tickPreServe()** · Receiver interpolava para y fixo (halfL - 0.5) ignorando estilo. Agora usa `rv.side * (COURT.halfL - rv.styleData.baselineOffset)`.
