# NET_DEFLECTION_FIX — Resultados esperados

## Comportamento antes
- Bola com Q=89% registrava err=14.79m (ex: alvo 0.08,-8.49 → quique -1.68,6.19)
- Bolas na lip zone eram defletidas de volta ao lado do batedor com vel.y negativa
- O ponto continuava em jogo com a bola voando na direção errada
- Apareciam quiques a 13-15m do alvo em shots de alta qualidade

## Comportamento depois
- Bola que raspa a fita → erro de rede imediato (resolveNet chamado)
- Erros de quique absurdos eliminados — scatter máximo para Q=89% é ~0.3m
- Erros de rede passam a ser contabilizados corretamente no placar
- Taxa de erros de rede pode subir levemente (antes, parte das colisões de fita
  gerava quiques improváveis no campo do adversário contados como "dentro")

## Impacto nos outros sistemas
- `ball._lipNet = true` continua sendo setado → log/VFX de fita preservados
- Lip zone probabilística mantida (hitChance 0.20→0.80) → fitas aleatórias reais
- NET_MIN_Z=0.974m no solver mantido → shots com boa qualidade já evitam a lip zone
- Nenhuma mudança em groundstrokes, scatter, spin ou detecção de direção
