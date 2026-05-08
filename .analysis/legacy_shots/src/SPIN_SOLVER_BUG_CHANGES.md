# Fix: Spin do Solver Desconectado do Spin Real — Bug de Overshoot em Winners

## Problema

Em shots de alta qualidade (Q > 70%), especialmente TOPSPIN e ACCEL, a bola sistematicamente
ultrapassava o alvo em 3–6 metros, resultando em erros "fora" mesmo com Q99% e σ=0.19m.

A imagem do Bug Mode mostrava a mira (cruz dourada) bem dentro da quadra, mas o QUIQUE real
aparecia fora da linha de fundo — o pior dos mundos: excelente decisão, execução perfeita,
resultado absurdo.

## Causa Raiz

Em `physics.js → launchBall()`, o solver usa busca binária em `vz` para encontrar o ângulo
vertical que faz a bola pousar exatamente em `targetY`. Para simular a trajetória, o solver
precisa da força Magnus (spin).

**Bug:** o solver aproximava o spin com `sm = power × 0.6`, que para um TOPSPIN de 155km/h
gerava `spin.x ≈ 31 rad/s`. Mas o spin REAL do shot (calculado em `buildShotWithPrefs`) era
`spin.x ≈ 1.3 rad/s` — uma discrepância de **24×**.

O solver achava `vz = +1.38 m/s` (bola sobe) porque "sabe" que o Magnus forte vai trazer
a bola de volta ao solo rapidamente no Y alvo. Mas a bola real voava com Magnus irrisório,
subia, continuava e pousava 5.75m além do alvo.

Após `launchBall()` retornar, `game.js` sobrescrevia o spin:
```javascript
ball.spin.x = shot.spinX;  // 1.3 — mas vz já foi calculado para 31.39!
```

## Por que afetava mais winners?

- `shot.spinMag = 1.5 × (1 - intensity × 0.35)` → com intensity≈1.0: spinMag = 0.975 → spin real pequeno
- `sm = power × 0.6` → sempre cresce com power → gap enorme em shots rápidos
- Quanto melhor a bola (Q alta, power alto), maior a discrepância, mais overshoot

## Fix

`launchBall()` agora aceita `actualSpinX` e `actualSpinZ` como parâmetros opcionais.
Quando fornecidos (groundstrokes normais), o solver usa o spin real do shot em vez da
aproximação `sm = power × 0.6`. Saques e volleys sem spin real continuam usando o fallback.

Em `game.js`, o spin real é passado na chamada de `launchBall()` e não precisa mais ser
sobrescrito após a chamada.

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/physics.js` | `launchBall()` aceita `actualSpinX, actualSpinZ`; usa spin real no solver |
| `src/game.js` | Passa `shot.spinX, shot.spinZ` para `launchBall()`; remove overwrite pós-chamada |
