# Signature Shots — Correção de Bugs
**Arquivos modificados:** `shotDecision.js`, `SignatureShots.js`, `game.js`, `physics.js`

---

## Bug 1 — ReturnHint nunca aplicado (`shotDecision.js`)
**Causa:** `computeSituationalScores` retornava o objeto de scores com `return {...}` antes do bloco que aplicava `returnHint`. O código de filtragem (`if (returnHint === 'defend')...`) era código morto — nunca executava. Além disso, referenciava a variável `scores` que não existia naquele escopo.  
**Efeito:** Saque de 240 km/h e saque de 80 km/h produziam exatamente o mesmo pool de shots no retorno. Retornador atacava com a mesma frequência independente da dificuldade do saque.  
**Fix:** Substituído `return {...}` por `const scores = {...}` e movido o `return scores` para o final da função, após o bloco `returnHint`.

---

## Bug 2 — `spinFnMult` nunca aplicado (`SignatureShots.js`)
**Causa:** `applySignaturePhysics` verificava `shot.spinFn` (a função original do `shotPhysics`), que não existe no objeto `shot`. O objeto `shot` armazena o valor computado `spinX`, não a função. A condição sempre falhava silenciosamente.  
**Efeito:** O override de spin de todos os signatures (`spinFnMult`) era completamente ignorado. HYPERLOOP (2.20x), CURVEBALL (2.80x), KICKER (2.40x), etc. saíam com spin normal.  
**Fix:** `shot.spinFn` → `shot.spinX`.

---

## Bug 3 — Cooldown de signature nunca aplicado (`SignatureShots.js` + `game.js`)
**Causa:** As funções `canUseSignatureThisGame` e `markSignatureUsed` existiam mas nunca eram chamadas em `applySignatureLayer`. E mesmo que fossem chamadas, `_signatureUsedThisGame` nunca era resetado na virada de game.  
**Efeito:** Qualquer jogador podia disparar múltiplas signatures por game, quebrando a regra "máx 1 por game" do design doc.  
**Fix (SignatureShots.js):** Adicionado check `if (!canUseSignatureThisGame(player)) return noop` no início da tentativa, e `markSignatureUsed(player)` imediatamente antes do return do trigger.  
**Fix (game.js):** Adicionado reset de `_signatureUsedThisGame` em `_gameWon` para todos os jogadores.

---

## Bug 4 — `_sigRiskMult` nunca aplicado (`game.js`)
**Causa:** `shot._sigRiskMult` era setado em `applySignaturePhysics` mas o cálculo de `_riskBase` em `game.js` usava apenas `RISK_BASE[shot.type]`, sem ler o multiplicador do signature.  
**Efeito:** Golpes de alta dificuldade (BANANA_TWEENER com riskMult 1.40, LASER_LINE com 1.25, NEEDLE com 1.28) tinham exatamente o mesmo risco que o tipo base.  
**Fix:** `RISK_BASE[shot.type] ?? 0.04` → `(RISK_BASE[shot.type] ?? 0.04) * (shot._sigRiskMult ?? 1.0)`.

---

## Bug 5 — `_sigBounce` e `_sigBounceSpin` nunca aplicados (`game.js` + `physics.js`)
**Causa:** `applySignaturePhysics` setava `shot._sigBounce` e `shot._sigBounceSpin`, mas esses valores nunca eram transferidos do shot para a bola, e `handleGroundBounce` (physics.js) não os lia.  
**Efeito:** Todos os efeitos de quique de signatures eram silenciosamente ignorados. HYPERLOOP (bounce 1.80x), RAZOR (bounce 0.22x — rasante), DEAD_DROP (bounce 0.10x), MUD_BALL (bounceSpin 3.00x), etc. Nenhum efeito especial ocorria no quique.  
**Fix (game.js):** Após `launchBall`, transferidos `_sigBounce` e `_sigBounceSpin` do shot para `ball`.  
**Fix (physics.js):** Em `handleGroundBounce`, aplicados no **1º quique** — `restitution *= ball._sigBounce` e `ball.spin.x *= ball._sigBounceSpin` — antes do cálculo de `effSpin`. Consumidos após aplicação (one-shot).

---

## Nota — `arcBoost` e `_sigCurve`
`_sigArcBoost` permanece como metadado no shot mas **não foi ativado nesta correção**. O `launchBall` moderno (solver binary-search) já considera a profundidade do alvo para calcular o arco naturalmente — shots com `depthRange` alto (CEILING_LOB, MOONBALL_KILLER) já geram arcos mais altos. Ativar `arcBoost` via `netClearance` não teria efeito porque o solver usa `NET_MIN_Z` fixo.  
`_sigCurve` também permanece como metadado — afeta renderização/UI (se implementada), não a física atual.

