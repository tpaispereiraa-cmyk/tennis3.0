# Análise da pipeline de Intent — quebra com o tênis real

Este documento mapeia o que a pipeline atual faz, o que o tênis real faz, e as
sete fraturas entre os dois. Os patches que acompanham este documento corrigem
as quatro fraturas mais danosas; as outras três ficam documentadas para uma
refatoração maior.

---

## 1. O que a pipeline faz hoje

```
ShotOpportunityEV.evaluateShotOpportunityEV(ctx, quality)
  ├─ calcula 6 EVs (safety, pressure, finish, defense, variation, style)
  ├─ deriva flags (cleanContact, lowButAttackable, highEasyBounce, …)
  └─ produz recommendedIntent ∈ {DEFEND, RESET, BUILD, PRESSURE, FINISH}
                       │
                       ▼
ShotDecision.chooseIntent(ctx, quality, ev)
  ├─ hierarquia rígida de if-returns
  └─ pode sobrescrever para APPROACH ou CONTROL
                       │
                       ▼
            intent final
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
scoreFamily(intent, ...)        chooseDirection(intent, ...)
       │                               │
       └──────────► chooseTarget(...) ◄┘
```

## 2. Como o tênis real organiza a decisão

Decisão real de cada bola, na ordem que um jogador profissional executa:

1. **Postura no contato** — "Como vou chegar nessa bola?" Confortável? Apertado?
   Esticado? Esse é o gate de tudo. Não importa que o oponente esteja exposto:
   se vou esticar, minha opção é meter; se vou bater de frente, tenho opções.

2. **Janela de oportunidade** — Dada minha postura, *e* a bola, *e* a posição
   do adversário, *quanto risco* posso correr nessa bola?
   - Postura fechada + janela baixa → meter, resetar, lob
   - Postura aberta + janela média → construir, redirecionar, abrir o ponto
   - Postura aberta + janela alta → pressionar, finalizar, subir à rede

3. **Padrão e leitura** — Mesmo com a mesma situação física, se já bati 3 cross
   pesados, o 4º não é cross pesado. Se já chipou 2 vezes, o 3º não é chip.
   Não se quebra padrão por aleatoriedade — se quebra para *surpreender*.

4. **Estilo** — Modula tudo acima. Um agressivo aceita janela média para
   pressionar; um paciente exige janela alta. Mas o estilo *desloca* limiares,
   não anula o gate físico.

5. **Score pressure** — (Não está no escopo da pipeline atual, mas é parte da
   decisão real.) Break point, set point, deuce — desloca o apetite por risco.

## 3. As sete fraturas

### Fratura 1 — `counterRedirect` está invertido

`ShotOpportunityEV.js:213-215`:

```js
if (style.counterRedirect && recommendedIntent === BUILD && pressure > 0.38) {
    recommendedIntent = ShotIntent.RESET;
}
```

`counterRedirect` é a flag do `buildStyle = 'COUNTER_REDIRECT'`. O comentário
no `ShotStyle.js` diz literalmente "RESET é arma, não recuo". Mas o código manda
para RESET quando pressionado — que é **exatamente** o recuo que o estilo
deveria evitar.

Um *counter-puncher* real (Murray, Medvedev, Schwartzman) sob pressão **não
reseta** — ele redireciona. Slice paralela, topspin profundo na linha, drive
contra o pé do oponente. O comportamento correto é elevar de BUILD para
PRESSURE/REDIRECT, não rebaixar para RESET.

**Severidade**: alta. Afeta toda decisão de jogador com estilo redirecionador
sob pressão moderada.

### Fratura 2 — Hierarquia binária em `chooseIntent`

`ShotDecision.js:31-42`:

```js
if (touchRescue) return RESET;
if (ev?.recommendedIntent === DEFEND) return DEFEND;
if (ev?.recommendedIntent === RESET)  return RESET;
if (approachIntent) return APPROACH;
if (ev?.recommendedIntent === FINISH) return FINISH;
if (ev?.recommendedIntent === PRESSURE) return PRESSURE;
...
```

DEFEND e RESET viram **decretos**. Nenhum sinal de oportunidade (Q alta, oponente
exposto, janela atacável) pode sobrescrever. Mas no tênis real, um jogador em
posição defensiva que percebe uma bola fácil **abandona** a defesa.

Exemplo do log fornecido (point #7 shot 14): Pablo Q:76%, ON_RISE, oponente
deep+wide → `recommendedIntent = RESET` (por `counterRedirect`) → intent final
RESET → SLICE CC DEEP. Em vez de capitalizar.

**Severidade**: muito alta. É a fratura que mais "rouba pontos" do jogador.

### Fratura 3 — APPROACH só conhece chip-and-charge

`ShotDecision.scoreFamily()` no branch APPROACH (linhas 201-207):

```js
if (intent === APPROACH) {
    if (family === SLICE) score += 0.30 + caps.slice * 0.18;       // ~+0.40
    if (family === FLAT_DRIVE && flatWindow) score += 0.26 + ...;   // ~+0.38
    if (family === TOPSPIN) score += 0.16 + safetyEV * 0.10;       // ~+0.21
}
```

Slice tem baseline **incondicional** de +0.30. Flat exige `flatWindow` (z ≥
0.54). Resultado: slice approach é o default, mesmo quando a bola é atacável.

No tênis real existem dois tipos de approach radicalmente diferentes:

| Tipo            | Quando                              | Família           |
|-----------------|-------------------------------------|-------------------|
| Chip approach   | Bola baixa, oponente fundo          | Slice baixo skid  |
| Drive approach  | Bola atacável, oponente fundo       | FH pesado, deep   |
| Power approach  | Bola alta, q alto, oponente deep    | Flat penetrante   |

O modelo atual colapsa os três em um, e o "um" é o chip. Para um REDLINE_FINISHER
ou FIRST_STRIKE, isso é o oposto do que o estilo pede.

**Severidade**: alta. Reportado pelo usuário como "slices seguros em bolas
atacáveis".

### Fratura 4 — BUILD e CONTROL caem no mesmo branch

`scoreFamily()` linha 197-200:

```js
if (intent === BUILD || intent === CONTROL) {
    if (family === TOPSPIN) score += playable ? 0.28 : 0.22;
    if (family === FLAT_DRIVE && (buildAttack || ...)) score += ...;
    if (family === SLICE) score -= 0.40;
    ...
}
```

Mas no tênis real BUILD e CONTROL são **opostos**:

- **BUILD** = "abrir o ponto". Procura ângulos, varia direção, força o oponente
  a se mover. Usa cross-court agudo, body shots quebradores de ritmo.
- **CONTROL** = "neutralizar". Joga centro-profundo pesado, tira o ângulo do
  oponente, espera. Quase nunca tenta abrir.

Tratá-los igual significa que o estilo CENTRE_CONTROL (que joga CONTROL) acaba
recebendo a mesma scoring de família que um construtor agressivo. E vice-versa:
um construtor agressivo em BUILD não recebe o boost de variação que deveria.

**Severidade**: média. Achata diferenças entre arquétipos de jogador.

### Fratura 5 — EV consulta `ballZ` instantâneo

`ShotOpportunityEV.js:57`:

```js
const lowPickup = bodyState === 'LOW_PICKUP' || ballZ < tune.lowBallZ;
```

O `ballZ` é a altura **atual** da bola, não a altura prevista no contato.
Mesma classe de bug que vimos no TennisMovement: o sistema avalia oportunidade
usando o presente em vez do futuro previsto.

Consequência: uma bola que está agora em z=0.45 mas vai estar em z=0.95 no
swing time é classificada como `lowPickup`, o que dispara
`lowAttackablePenalty`, `lowDefenseBonus`, e impede `cleanContact`. Tudo
errado.

**Severidade**: média (depende da frequência com que o EV roda antes do swing).

### Fratura 6 — FINISH é "kill" ou "margin", binário

```js
const finishMode = intent === FINISH
    ? ((lowButAttackable || q < 0.52 || safetyEV < 0.52 || ...) ? 'margin' : 'kill')
    : null;
```

O tênis real tem pelo menos cinco modos de finalização tática:

| Modo                | Característica                        |
|---------------------|---------------------------------------|
| Open-court winner   | Quadra descoberta, sem pressa         |
| Through-the-line    | Paralela rasante na linha            |
| Angle put-away      | Cruzado curto fechando ângulo agudo  |
| Behind the runner   | Atrás do oponente que cobriu cedo    |
| Power put-away      | Cano direto com força máxima          |

O modelo atual colapsa em margin/kill. Não há diferenciação de direção/spin/pace
no finishMode.

**Severidade**: baixa-média. Funciona mas é raso; afeta variedade de jogo.

### Fratura 7 — Sem REDIRECT como intent de primeira classe

O tênis real reserva uma decisão crucial: "vou redirecionar o que veio?"
Pegar um cruzado e mandar paralela é uma escolha tática distinta de PRESSURE
(que mantém a mesma direção) e de RESET (que joga seguro). É o que define
contra-atacantes.

Atualmente isso é simulado via `chooseDirection` que pode escolher DTL após
cross streak, mas a *intent* é PRESSURE — o que dispara escolhas de família
e profundidade pensadas para pressão, não para surpresa.

**Severidade**: baixa. Estrutural, exigiria reforma maior.

## 4. Patches aplicados — rodada 1

Resolvemos as quatro fraturas com maior impacto:

| #  | Fratura                                | Patch                                          |
|----|----------------------------------------|------------------------------------------------|
| 1  | counterRedirect invertido              | Inverte para empurrar a PRESSURE quando há janela; RESET só quando há pressão real e contato ruim |
| 2  | Hierarquia binária em chooseIntent     | Adiciona `tryUpgradeIntent()`: oportunidade clara (Q alto + atacável + exposed) sobrescreve DEFEND/RESET |
| 3  | APPROACH só chip                       | Adiciona `approachMode: 'chip' \| 'drive' \| 'power'` no decision; scoreFamily lê o mode |
| 4  | BUILD = CONTROL                        | Separa o branch; BUILD ganha boost para variação/ângulos, CONTROL para centro/profundidade |

## 5. Postmortem da rodada 1 — o que o log do usuário revelou

Análise de 86 shots de rally em 12 pontos pós-patch:

**Funcionou:**
- **Fratura 3 (APPROACH chip-only)** — claramente resolvida. Para Q≥75, 8 de 9 approaches são topspin ou flat drive (89% power/drive). Para Q<75, 6 de 7 são slice (chip clássico). `classifyApproachMode` está discriminando como esperado.
- **Fratura 4 (BUILD/CONTROL)** — sem dados suficientes para confirmar (poucos CONTROL no log), mas a separação está estruturalmente correta.
- **Fratura 2 (upgrade tático)** — funcionou *parcialmente*: bolas Q≥70 + ON_RISE viraram APPROACH em 78% dos casos. Mas o destino é predominantemente APPROACH, não PRESSURE/FINISH.

**Não funcionou:**
- **RESET continua dominante: 44% de todos os shots.** PRESSURE+FINISH somam só 4%. Em tênis real, RESET é arma circunstancial, não 44% da decisão.
- **Sequências longas de RESET**: 3 cadeias de 5, 3 e 7 RESETs seguidos no log. Loop não foi detectado nem quebrado.
- **Casos clássicos ainda errados**: Q:100% + ON_RISE + wide+lowBall → RESET com TOPSPIN. Q:78% + ON_RISE → idem. A flag `lowBall` está vencendo o gate.

**Causa raiz nova exposta pelo log:**

Duas variáveis representam "bola baixa" no EV:
- `flags.lowPickup` — restritivo, dispara em `ballZ < 0.48` ou bodyState=LOW_PICKUP
- `flags.lowButAttackable` — qualificado, só vale se rival exposto + Q ≥ 0.48 + prepared

O `opportunityGate` da rodada 1 checava `!flags.lowPickup` mas ignorava `flags.lowButAttackable`. Resultado: a flag que existia exatamente para dizer "essa bola baixa é atacável" não tinha efeito na decisão de upgrade.

Combinado com o bug do TennisMovement que ainda joga o contato em z=0.44 mesmo em ON_RISE (vide rodada anterior), quase toda bola de rally é classificada como `lowPickup`, e o upgrade nunca dispara.

## 6. Patches rodada 2 — fechando o ciclo

| #  | Fratura                                      | Patch                                          |
|----|----------------------------------------------|------------------------------------------------|
| 5a | opportunityGate ignora lowButAttackable      | Aceita lowPickup *se* foi qualificado como lowButAttackable; passa a flag pro FINISH-path também |
| 5b | Loop de RESET não é detectado                | Adiciona `resetStreak` no ShotMemory; `breakingLoop` força saída após 2+ planos defensivos seguidos com Q≥0.60 + janela |
| 5c | breakingLoop sem janela ideal vira BUILD     | Fallback em BUILD em vez de PRESSURE quando o loop quebra mas a janela não é limpa |

**Comportamento esperado:**
- Sequências de 5+ RESETs devem desaparecer (worst case 2 antes de quebrar).
- Q≥70 + ON_RISE + lowButAttackable devem ir para PRESSURE/APPROACH/FINISH.
- RESET share deve cair de 44% para ~25-32% (ainda alto, mas dentro do crível para um GRINDER vs FIRST_STRIKE em saibro mental).
- PRESSURE+FINISH share deve subir de 4% para ~10-15%.

## 7. Validação

Os smoke tests do `SmokeTests.js` ganham uma suíte 8 que verifica:

- COUNTER_REDIRECT sob pressão moderada → PRESSURE, não RESET
- Q:80% + ON_RISE + rivalExposed → APPROACH ou PRESSURE, não DEFEND
- APPROACH com Q:80% + power-fit → drive, não chip
- CONTROL distinto de BUILD em distribuição de família e direção
