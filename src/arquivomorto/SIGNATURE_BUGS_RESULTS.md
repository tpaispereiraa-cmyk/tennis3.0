# Signature Shots — Resultado das Correções

## Antes vs Depois

| Signature / Efeito | Antes | Depois |
|---|---|---|
| ReturnHint no retorno de saque | Pool idêntico para saque de 240 km/h e 80 km/h | Saque forte força chip/slice; 2º saque fraco libera ACCEL/TOPSPIN |
| `spinFnMult` (HYPERLOOP 2.2Ã—, CURVEBALL 2.8Ã—, KICKER 2.4Ã—...) | Spin base, sem efeito | Spin correto amplificado pelo multiplicador |
| `bounceSpin` (MUD_BALL 3.0Ã—, HYPERLOOP 2.0Ã—, KICKER 2.8Ã—...) | Quique padrão | Quique com spin multiplicado — bola dispara em altura/direção correta |
| `bounce` (RAZOR 0.22Ã—, DEAD_DROP 0.10Ã—, HYPERLOOP 1.80Ã—...) | Restituição de quadra padrão | Restituição correta — RAZOR rasante, DEAD_DROP para, HYPERLOOP dispara |
| `riskMult` (BANANA_TWEENER 1.4Ã—, LASER_LINE 1.25Ã—...) | Risco do tipo base | Risco amplificado conforme dificuldade do signature |
| Cooldown por game | Ilimitado — múltiplas activações por game | Máx 1 signature por game; reseta a cada game |

## Impacto por Signature

**HYPERLOOP** — spin 2.2Ã—, bounce 1.8Ã—, bounceSpin 2.0Ã—: agora gera o quique altíssimo descrito  
**MUD_BALL** — bounceSpin 3.0Ã—: exploração no quique funcional  
**RAZOR** — bounce 0.22Ã—, bounceSpin 0.30Ã—: bola rasante real  
**DEAD_DROP** — bounce 0.10Ã—, bounceSpin 0.05Ã—: morre no chão como descrito  
**KICKER** — spinFnMult 2.4Ã—, bounce 2.2Ã—, bounceSpin 2.8Ã—: quique no ombro funcional  
**CURVEBALL** — spinFnMult 2.8Ã—: spin lateral máximo agora ativado  
**KNUCKLEBALL** — spinFnMult 0.05Ã—: spin quase zerado (flutter) funcional  
**GHOST_SLICE** — spinFnMult 0.60Ã—: bola mais lenta, spin reduzido, timing quebrado  
**LASER_LINE** — spinFnMult 0.30Ã—, riskMult 1.25Ã—: flat sem spin + risco real  
**BANANA_TWEENER** — spinFnMult 3.2Ã—, riskMult 1.40Ã—: máximo spin + risco máximo  

## Arquivos Modificados

- `shotDecision.js` — 1 fix (returnHint dead code)
- `SignatureShots.js` — 3 fixes (spinFnMult, cooldown check, cooldown mark)
- `game.js` — 3 fixes (cooldown reset, riskMult, bounce transfer)
- `physics.js` — 2 fixes (restitution mutable, sig bounce/bounceSpin consumption)

