# Fix: Spin Solver — Resultados Esperados

## Status: ✅ Implementado

## O Que Muda

### Antes do Fix
- TOPSPIN Q99% à 155km/h: solver usava spin.x=31.4, achava vz=+1.38
- Bola real com spin.x=1.3: Magnus insuficiente, bola voa 5.75m além do alvo
- Winners profundos sistematicamente "fora" — bug visível no Bug Mode

### Após o Fix
- Solver usa spin.x=1.3 (o mesmo que a física real)
- vz calculado é compatível com o Magnus real da trajetória
- Ball lands within ~0.20m of target (LAND_TOL do solver)

## Comportamento Esperado no Bug Mode

O QUIQUE real deve aparecer muito próximo da mira (elipse σ).
A discrepância deve ficar dentro de σ (0.15–0.25m para Q99%).

## Escopo do Impacto

**Antes do fix:**
- TOPSPIN Q > 70%: overshoot de 2–6m em Y
- ACCEL Q > 70%: idem
- BANANA, SHORT_ACCEL: idem (qualquer shot com spin real << power×0.6)

**Não afetado:**
- Saques (não passam shot.spinX — usam fallback correto)
- Volleys (idem)
- Shots de Q baixa (<40%): patch defensivo (-15% vy) compensava parcialmente

## Verificação

Usar o Bug Mode com TOPSPIN/ACCEL de alta qualidade — o QUIQUE deve
aparecer dentro ou muito próximo da elipse σ.
