# SUMMARY — Tennis Game Sessions

## Sessão 1 — NET_HOLLOW_FIX

### Problema reportado
Bolas com altura 0.2–0.6m cruzavam a rede sem colisão detectada ("rede oca no meio, fita no topo").

### Causa
Sub-stepping adaptativo (2/4/6 passos por frame). `stepBallPhysics` sobrescreve `_prevY` a cada sub-step. `checkNetCollision` roda em `game.jsx` APÓS todos os sub-steps → se bola cruzou em sub-step inicial, `_prevY` e `currY` já estão no mesmo lado → colisão ignorada. Bola rápida (sub=6): 5/6 cruzamentos perdidos.

### Fix — `src/core/physics.js`
- `stepPhysics`: salva `ball._preStepY/_preStepZ` antes do loop
- `checkNetCollision`: usa `_preStepY/_preStepZ` com fallback para `_prevY/_prevZ`

---

## Sessão 2 — EASY_BALL_FIX

### Problema reportado
Jogadores se "embananando" (confundindo) em bolas fáceis — chegam ao lado da bola e não batem, ou recuam sem motivo.

### Arquivo correto
`src/systems/movement/TennisMovement.js` (não MovementMaster.js que está desativado).

### Bug 1 — `minZFloor` alto demais em `buildInterceptProfile`
`minZFloor = 0.60` → `minContactZ ≈ 0.68m` para BALANCED. Bolas flat sobem apenas 0.50–0.65m → `risingTooLow=true` durante toda a subida → jogador bloqueado de bater.
**Fix:** `minZFloor = 0.46`, delta `prefZ - 0.34` (era `-0.20`). BALANCED: 0.54m, EXPLOSIVE: 0.46m.

### Bug 2 — `secondBounceThreat` timer de 0.52s em `refreshContactFlags`
Com `risingTooLow=true`, único escape era o timer de 520ms. Bola fácil ficava 0.5s bloqueada com o jogador parado ao lado.
**Fix:** `0.52 → 0.30s`.

### Bug 3 — `softAfterBounce` threshold de 3.0 m/s em `computeContactPlan`
Apenas bolas abaixo de ~11 km/h eram "suaves". Qualquer bola moderada não entrava no `shortSoftCatchable` → acionava RUNBACK em bola fácil.
**Fix:** `3.0 → 7.0 m/s`.

### Bug 4 — Pesos de `runbackRawScore` para condições normais
`freshRisingBounce(0.24) + tooLowContact(0.26) = 0.50` → qualquer quique normal quase acionava runback (threshold=0.52).
**Fix:** `freshRisingBounce=0.08`, `tooLowContact=0.10`. Total normal: 0.18 (longe do threshold).
