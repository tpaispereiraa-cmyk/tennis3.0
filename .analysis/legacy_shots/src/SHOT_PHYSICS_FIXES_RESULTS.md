# Resultados — Fix Pipeline de Shots e Física

## Fix 1 — `launchBall` spin real propagado

- BANANA agora tem sidespin real (`spin.z ≈ sm × 0.42`) no solver → arco curvo lateral correto
- DROP tem backspin real (`spin.x ≈ sm × 2.5`) → morre no solo como esperado
- Solver `vz` calculado com Magnus correto → overshoot de 3–6m eliminado em todos os groundstrokes
- Saques e volleys inalterados (não passam `actualSpinX/Z`)

## Fix 2 — Código morto removido

- 11 campos `riskBase` removidos de `SHOT_PHYSICS`
- Nenhuma mudança de comportamento em runtime
- `shotDecision.js → RISK_BASE` permanece como única fonte de verdade para risco por shot

## Fix 3 — Previsão de trajetória mais precisa

- BANANA rápida (~100 km/h): sidespin no quique passa de `0.028` para `≈0.046` de coeficiente
  → deflexão lateral ~64% maior na previsão → adversário se posiciona corretamente
- Impacto mínimo em shots lentos (<60 km/h) onde coeficiente permanece próximo de 0.028

## Fix 4 — LOB defensivo vs agressivo diferenciados

| Contexto        | Intensidade anterior | Intensidade nova | Clearance resultante |
|-----------------|----------------------|------------------|----------------------|
| DIFFICULT (def) | ~0.35                | ~0.17            | ~4.8m (arco alto)    |
| NEUTRAL/OPP     | ~0.35                | ~0.35            | ~3.8m (arco médio)   |

LOB defensivo agora consistentemente voa alto (difícil de smash em tempo),
LOB agressivo mantém pace e arco mais plano (winner por cima do net rusher).
