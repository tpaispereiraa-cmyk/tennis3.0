# EASY_BALL_FIX — Resultados esperados

## Antes
- Jogador chega numa bola fácil (flat, 50 km/h, curta) e fica parado ao lado sem bater
- `risingTooLow=true` bloqueia hit enquanto bola está abaixo de 0.68m (~toda a subida)
- Após 0.52s finalmente tenta mas bola já está descendo ou muito longe
- Às vezes jogador recua (RUNBACK) numa bola curta sem motivo

## Depois
- Bola rising acima de 0.54m (BALANCED) → `risingTooLow=false` → hit disponível
- Após 0.30s do quique → emergência libera hit mesmo se ainda subindo
- Bolas até ~25 km/h qualificam para `shortSoftCatchable` → sem runback desnecessário
- runbackScore acumula só com problemas reais (timing ruim, rush, muito fora de posição)

## Sem quebras esperadas
- `risingTooLow` ainda protege contra bater muito baixo (< minZ por cadência)
- `secondBounceThreat` ainda detecta bola prestes a morrer (agora a 0.30s)
- Runback ainda aciona para situações genuínas (tooCloseToBounce + rushedTiming, etc.)
