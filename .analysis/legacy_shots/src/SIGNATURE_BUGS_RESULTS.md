# Signature Shots — Resultado das Correções

## Antes vs Depois

| Signature / Efeito | Antes | Depois |
|---|---|---|
| ReturnHint no retorno de saque | Pool idêntico para saque de 240 km/h e 80 km/h | Saque forte força chip/slice; 2º saque fraco libera ACCEL/TOPSPIN |
| `spinFnMult` (HYPERLOOP 2.2×, CURVEBALL 2.8×, KICKER 2.4×...) | Spin base, sem efeito | Spin correto amplificado pelo multiplicador |
| `bounceSpin` (MUD_BALL 3.0×, HYPERLOOP 2.0×, KICKER 2.8×...) | Quique padrão | Quique com spin multiplicado — bola dispara em altura/direção correta |
| `bounce` (RAZOR 0.22×, DEAD_DROP 0.10×, HYPERLOOP 1.80×...) | Restituição de quadra padrão | Restituição correta — RAZOR rasante, DEAD_DROP para, HYPERLOOP dispara |
| `riskMult` (BANANA_TWEENER 1.4×, LASER_LINE 1.25×...) | Risco do tipo base | Risco amplificado conforme dificuldade do signature |
| Cooldown por game | Ilimitado — múltiplas activações por game | Máx 1 signature por game; reseta a cada game |

## Impacto por Signature

**HYPERLOOP** — spin 2.2×, bounce 1.8×, bounceSpin 2.0×: agora gera o quique altíssimo descrito  
**MUD_BALL** — bounceSpin 3.0×: exploração no quique funcional  
**RAZOR** — bounce 0.22×, bounceSpin 0.30×: bola rasante real  
**DEAD_DROP** — bounce 0.10×, bounceSpin 0.05×: morre no chão como descrito  
**KICKER** — spinFnMult 2.4×, bounce 2.2×, bounceSpin 2.8×: quique no ombro funcional  
**CURVEBALL** — spinFnMult 2.8×: spin lateral máximo agora ativado  
**KNUCKLEBALL** — spinFnMult 0.05×: spin quase zerado (flutter) funcional  
**GHOST_SLICE** — spinFnMult 0.60×: bola mais lenta, spin reduzido, timing quebrado  
**LASER_LINE** — spinFnMult 0.30×, riskMult 1.25×: flat sem spin + risco real  
**BANANA_TWEENER** — spinFnMult 3.2×, riskMult 1.40×: máximo spin + risco máximo  

## Arquivos Modificados

- `shotDecision.js` — 1 fix (returnHint dead code)
- `SignatureShots.js` — 3 fixes (spinFnMult, cooldown check, cooldown mark)
- `game.js` — 3 fixes (cooldown reset, riskMult, bounce transfer)
- `physics.js` — 2 fixes (restitution mutable, sig bounce/bounceSpin consumption)
