# NET_HOLLOW_FIX — Rede oca no meio

## Problema
Bolas com altura 0.2–0.6m cruzavam a rede sem colisão ser detectada.
A rede parecia ter apenas a "fita" no topo e ser oca no meio.

## Causa raiz
`stepPhysics` usa sub-steps adaptativos (2/4/6 por frame dependendo da velocidade).
Cada sub-step chama `stepBallPhysics`, que sobrescreve `ball._prevY = ball.pos.y` **antes** de avançar a posição.

`checkNetCollision` é chamada em `game.jsx` **após todos os sub-steps**.
Se a bola cruzou a rede no sub-step 1 de 6, os sub-steps 2–6 atualizam `_prevY` para o lado já cruzado.
Ao chegar em `checkNetCollision`: ambos `_prevY` e `currY` têm o mesmo sinal → `Math.sign(prevY) === Math.sign(currY)` → **retorna false → colisão ignorada**.

Bolas rápidas (sub=6) tinham 5/6 de chance de passar. Bolas médias (sub=4), 3/4.
A lip zone funcionava parcialmente pois tem lógica separada no solver, criando a ilusão de "fita sólida, rede oca".

## Fix
**`src/core/physics.js`**

### `stepPhysics`
Salva `ball._preStepY` e `ball._preStepZ` **antes** do loop de sub-steps:
```js
ball._preStepY = ball.pos.y;
ball._preStepZ = ball.pos.z;
for (let s = 0; s < sub; s++) { ... }
```

### `checkNetCollision`
Usa `_preStepY/_preStepZ` em vez de `_prevY/_prevZ`:
```js
const prevY = ball._preStepY ?? ball._prevY ?? ball.pos.y;
const prevZ  = ball._preStepZ ?? ball._prevZ ?? ball.pos.z;
```

O fallback `?? ball._prevY` garante compatibilidade se `stepPhysics` não for chamada (ex: saques, replay).

## Arquivos modificados
- `src/core/physics.js` — 2 mudanças, ~10 linhas
