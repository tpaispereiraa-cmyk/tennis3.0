# NET_HOLLOW_FIX — Resultados esperados

## Comportamento antes do fix
- Bola rápida (sub=6): 5 em 6 cruzamentos de rede sem colisão detectada
- Bola média (sub=4): 3 em 4 cruzamentos sem detecção
- Resultado visual: bolas a 0.2–0.6m passando pela rede como se ela fosse oca

## Comportamento após o fix
- Qualquer bola que cruze y=0 durante o frame é detectada, independente de qual sub-step
- zAtNet interpolado corretamente entre posição pré-frame e posição final
- Lip zone (≈0.82–0.95m) continua funcionando como antes
- Bolas abaixo da lip zone (< 0.82m) corretamente batem na rede
- Bolas acima de netTop+lipZone (> 0.95m) corretamente passam

## Sem quebras esperadas
- Fallback `?? ball._prevY` mantém compatibilidade fora do fluxo de `stepPhysics`
- Nenhuma mudança na lógica de lip zone, deflexão ou resolução de ponto
- `_preStepY/_preStepZ` são campos novos sem conflito com código existente
