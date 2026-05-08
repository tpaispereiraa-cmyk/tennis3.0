# EASY_BALL_FIX — Jogadores se embananando em bolas fáceis

## Arquivo modificado
`src/systems/movement/TennisMovement.js` — 4 correções

---

## Bug 1 — `minZFloor` alto demais em `buildInterceptProfile`
**Antes:** `minZFloor = 0.60`, `minContactZ = clamp(prefZ - 0.20, 0.60, 0.94)`
- BALANCED (prefZ=0.88): minZ = **0.68m**
- `risingTooLow = true` enquanto bola < 0.68m → bloqueia hit durante toda subida

**Depois:** `minZFloor = 0.46`, `minContactZ = clamp(prefZ - 0.34, 0.46, 0.94)`
- BALANCED: minZ = **0.54m** | EXPLOSIVE: **0.46m** | PATIENT: **0.68m**
- Bola subindo a 0.55m já permite hit em jogadores BALANCED

---

## Bug 2 — `secondBounceThreat` timer longo demais em `refreshContactFlags`
**Antes:** `timeSinceBounce > 0.52s` — jogador esperava 520ms com bola fácil ao lado
**Depois:** `timeSinceBounce > 0.30s` — libera 220ms antes, suficiente para evitar 2º quique

---

## Bug 3 — `softAfterBounce` threshold irreal em `computeContactPlan`
**Antes:** `ballSpeed2D < 3.0 m/s` (~11 km/h) — quase nenhuma bola qualificava
**Depois:** `ballSpeed2D < 7.0 m/s` (~25 km/h) — bolas moderadas protegidas de runback

---

## Bug 4 — Pesos de `runbackRawScore` disparavam em bolas normais
**Antes:** `freshRisingBounce=0.24 + tooLowContact=0.26 = 0.50` → qualquer quique normal já flertava com runback
**Depois:** `freshRisingBounce=0.08 + tooLowContact=0.10 = 0.18` → só combinação de múltiplos problemas reais aciona
