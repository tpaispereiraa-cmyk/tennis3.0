# Core Engine Targets

Meta oficial do core engine para orientar tuning e evitar drift entre patches.

## Identidade

- O jogo deve parecer ATP-like, mas com assinatura própria de leitura tática clara.
- O rally precisa mostrar progressão: sobreviver, construir, pressionar e definir.
- Superfície deve mudar o comportamento da partida sem virar caricatura.

## Benchmarks de partida

- `avgRallyLength`
  - Grass: `2.5` a `4.2`
  - Hard: `3.0` a `5.0`
  - Indoor: `2.7` a `4.4`
  - Clay: `4.0` a `6.5`
- `errorBlend` (forcedErrors / totalErrors): `0.38` a `0.52`
- `serve1InPct`: `0.57` a `0.68`
- `serve2InPct`: `0.83` a `0.96`
- `holdRate` médio:
  - Grass/Indoor: `0.74` a `0.88`
  - Hard: `0.70` a `0.84`
  - Clay: `0.62` a `0.78`

## Regras de tuning

- Sempre validar `headless`, `mid`, `slim` e `fast` contra a mesma dupla de jogadores.
- `mid` deve ser o modo mais próximo do `headless full`.
- `slim` pode divergir um pouco no pacing, mas não deve inventar outro meta.
- `fast` pode simplificar, mas não pode colapsar UE/FE, hold rate ou identidade de superfície.

## Alertas

- Winner subindo junto com UE em todas as superfícies costuma indicar solver/target agressivo demais.
- Rally médio subindo em todas as superfícies costuma indicar pace/movement lento demais.
- Hold rate explodindo em clay costuma indicar penalidade de retorno fraca ou saque forte demais.
- Forced errors muito baixos costumam indicar classificação injusta de UE.

