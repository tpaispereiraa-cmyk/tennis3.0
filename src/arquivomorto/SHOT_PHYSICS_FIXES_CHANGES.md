# Fix: Pipeline de Shots e Física — 4 Correções

## Fix 1 ðŸ”´ CRÍTICO — `launchBall` recebia `spinX`/`spinZ` mas os descartava

**Arquivo:** `physics.js`

**Problema:** `game.js` chamava `launchBall(...)` passando `shot.spinX` e `shot.spinZ` como
9º e 10º argumentos, mas a assinatura da função só declarava 8 parâmetros. Os valores eram
silenciosamente descartados pelo JS. O solver interno recalculava spin com `sm = power Ã— 0.6`
(aprox. 20–31 rad/s em shots rápidos), enquanto o spin real calculado em `buildShotWithPrefs`
via `shotPhysics.spinFn` era ~1–3 rad/s — discrepância de até 24Ã—. O solver escolhia `vz`
errado (muito alto) porque "sabia" que o Magnus forte traria a bola rapidamente, mas a bola
real voava com Magnus mínimo e pousava 3–6m além do alvo.

Consequências concretas:
- **BANANA** sem curva lateral no quique — `spinZ = sm Ã— 0.42` era ignorado
- **DROP** com backspin insuficiente — não morria corretamente no solo
- **TOPSPIN vs ACCEL** indistinguíveis no solver — ambos usavam `sm Ã— 1.2` genérico

**Fix:** `launchBall` agora aceita `actualSpinX = null` e `actualSpinZ = null` como parâmetros
opcionais. Quando fornecidos (todos os groundstrokes), são aplicados ao `ball.spin` **antes**
do solver rodar. Saques e volleys (que não passam esses valores) continuam usando o fallback
genérico baseado em `spinType`.

```js
// Antes:
export function launchBall(ball, fromPos, targetX, targetY, spinType, power,
                            netClearance = 0.35, hitHeight = 0.9)
// Depois:
export function launchBall(ball, fromPos, targetX, targetY, spinType, power,
                            netClearance = 0.35, hitHeight = 0.9,
                            actualSpinX = null, actualSpinZ = null)
```

---

## Fix 2 ðŸŸ¡ MÉDIO — `riskBase` em `shotPhysics.js` era código morto

**Arquivo:** `shotPhysics.js`

**Problema:** Todos os 11 entradas de `SHOT_PHYSICS` tinham um campo `riskBase` (ex:
ACCEL `0.10`, TOPSPIN `0.05`, DROP `0.14`). Nenhum consumidor em runtime lia esse campo —
`shotDecision.js` exporta seu próprio `RISK_BASE` com valores diferentes (ACCEL `0.26`,
TOPSPIN `0.18`) que é o único realmente usado. Os valores em `shotPhysics.js` eram enganosos
para quem lia o código.

**Fix:** Todos os campos `riskBase` removidos de `SHOT_PHYSICS`. Comentário no header
atualizado explicando que `RISK_BASE` em `shotDecision.js` é o canônico.

---

## Fix 3 ðŸŸ¡ MÉDIO — `predictTrajectory` usava sidespin fixo no quique

**Arquivo:** `physics.js`

**Problema:** Na simulação de previsão de trajetória usada pela IA para posicionamento,
o coeficiente de deflexão lateral por sidespin no quique era fixo em `0.028`. Mas
`handleGroundBounce` (física real) usa um coeficiente que escala com a velocidade horizontal
pré-impacto: `0.028 + min(0.025, hSpd Ã— 0.0006)`. Resultado: a IA subestimava a deflexão
lateral de BANANA e slice serve rápidos no quique, posicionando o adversário levemente errado.

**Fix:** `predictTrajectory` agora usa o mesmo coeficiente dinâmico:
```js
const hSpdPreSim = Math.sqrt(sim.vel.x ** 2 + sim.vel.y ** 2);
const sideCoeffSim = 0.028 + Math.min(0.025, hSpdPreSim * 0.0006);
sim.vel.x += sim.spin.z * sideCoeffSim;
```

---

## Fix 4 ðŸŸ¢ BAIXO — LOB defensivo e agressivo tinham arco idêntico

**Arquivo:** `shotDecision.js` → `computeShotIntensity`

**Problema:** O LOB tinha apenas `-= 0.10` de penalidade de intensidade, independente do
contexto. Como `shotIntensity` controla onde no range `clr [2.20, 5.50]` a bola cai
(`clr[1] - intensity Ã— clrRange Ã— 0.75`), todos os lobs produziam arcos semelhantes,
sem distinção entre o lob defensivo de emergência (deveria ter arco máximo) e o lob
agressivo por cima de um net rusher (arco moderado e mais pace).

**Fix:** Intensidade do LOB agora depende do `_lastBallTier`:
- `DIFFICULT` → `-= 0.28` → intensidade muito baixa → `netClear` próximo de `clr[1]` = 5.5m
- Outros → `-= 0.10` → intensidade moderada → arco ~3–4m com mais pace

