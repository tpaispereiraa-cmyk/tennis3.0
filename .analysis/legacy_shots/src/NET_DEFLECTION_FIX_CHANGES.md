# NET_DEFLECTION_FIX — Mudanças

## Arquivo modificado
`src/physics.js` — função `checkNetCollision`

## O bug
Quando a bola entrava na lip zone da rede (COURT.netHeight ± 4cm = [0.874m, 0.954m])
e o roll aleatório determinava colisão com a fita, o código executava:

```javascript
ball.vel.y *= -0.30;   // BUG: inverte a velocidade Y da bola
ball.vel.z  = Math.abs(ball.vel.z) * 0.5 + 1.2;
ball.vel.x += (Math.random() - 0.5) * 1.8;
return false;          // bola "continuava em jogo"
```

Isso invertia a direção Y da bola com 30% da velocidade, mandando-a de volta ao
lado do batedor. Como `return false` não chamava `resolveNet`, a bola continuava
em jogo voando na direção errada, resultando em quiques a 13-15m de distância do
alvo — fisicamente impossíveis.

Log de exemplo que prova o bug:
```
alvo(0.08, -8.49)
Quique(-1.68, 6.19)
err: 14.79m   Q: 89%
```
Com Q=89%, o scatter gaussiano gera desvio máximo de ~0.3m. O erro de 14.79m
só pode vir de uma inversão de velocidade — exatamente o `vel.y *= -0.30`.

## A causa raiz (cadeia completa)
1. Solver em `launchBall` prevê que a bola passa em z=0.974m (acima da lip zone)
2. A física real usa spin diferente do solver (~17x menor), trajetória real chega z≈0.92m
3. z=0.92m está dentro da lip zone → hitChance ≈ 62%
4. Roll sorteado < hitChance → `vel.y *= -0.30` inverte a bola
5. Bola voa de volta para o lado do batedor, quica a 14m do alvo
6. `return false` → `resolveNet` nunca chamado → ponto continua com bola voando errada

## O fix
Substituído o bloco de deflexão por:
```javascript
ball._lipNet = true;  // flag para log/VFX
return true;          // erro de rede → game.js chama resolveNet
```

Fisicamente correto: bola que raspa a fita em tênis cai na rede (erro) ou dribla
para frente com pouca velocidade — nunca voa de volta ao batedor.

## Estado das outras correções no tar atual
Todas já estavam aplicadas corretamente:
- `detectDirection` — usa `Math.sign` (não `relX * targetX`) ✅
- `NET_MIN_Z` em `launchBall` — 0.974m (acima da lip zone) ✅
- Scatter em `game.js` — usa `computeSigmaX`, sem fallback legado ✅
- A linha `ball.vel.y *= -0.30` era o único bug restante ✅
