# TENNIX ME — Sumário da Conversa

## Sessão 1 — 2026-02-22 · Auditoria do Motor

### Contexto
O usuário está construindo um ME (Match Engine) para um projeto de tênis (futuro Tennis Manager ou jogo de histórias). Enviou o código atual do jogo para uma auditoria completa. O jogo é um simulador 2D de tênis escrito em JavaScript com React, usando física realista (drag, spin, Magnus effect).

### O que foi pedido
- Auditoria completa do que existe hoje (sem roadmap de futuro)
- Identificar o que está bom e o que precisa melhorar
- Para cada melhoria, entregar código de exemplo pronto
- Duas queixas explícitas do usuário:
  1. Jogadores precisam jogar mais na linha de base
  2. Bug onde jogadores não avançam para pegar bolas simples

### Arquivos analisados
- `src/ai.js` — IA, movimento de jogadores, decisão de shots
- `src/game.js` — loop principal, scoring, tryHit, resolução de pontos
- `src/constants.js` — COURT, PHYSICS, TIMING, STAMINA, THRESHOLDS
- `src/styles.js` — 6 estilos de jogo + configuração por shot
- `src/physics.js` — motor de física, bounce, trajetória
- `src/players.js` — 4 jogadores nomeados + computePlayerMods()

### BUGS CRÍTICOS ENCONTRADOS

**Bug #1 (Principal — confirma queixa do usuário):**
Em `updatePlayer()` em `ai.js`, o código calcula `target.x` corretamente mas **nunca muda `target.y`**. O jogador se move lateralmente mas fica parado no eixo da quadra (nunca avança/recua). `target.y` sempre fica em `player.basePos.y` (baseline). Resultado: drop shots, bolas curtas, qualquer bola que não "cruze" a linha predY (6.5m da rede) → jogador não se move para pegar.

**Bug #2 (relacionado):**
`predY` (linha de predição) é fixo em `player.side * COURT.halfL * 0.55` ≈ 6.5m da rede. Drop shots pousam a ~1.5–2.5m da rede — nunca cruzam essa linha → `crossPoint = null`. Fix: tornar `predY` adaptativo (usar 0.25 ao invés de 0.55 quando a bola já está curta no lado do jogador).

### MELHORIAS IDENTIFICADAS

1. **baselineOffset muito alto:** AGG_BASELINER: 1.5m dentro da linha, ALL_COURT: 1.2m → jogadores ficam na service line. Fix: reduzir para 0.3–0.5m
2. **baselineOffset dinâmico por momentum:** sob pressão deveria recuar, com momentum alto avançar
3. **Sistema de stamina inoperante:** decay 0.018 vs recovery 0.38 → stamina sempre ~100%
4. **patienceRallyMin mínimo de 1:** erros irreais no primeiro rally ball
5. **Scatter de qualidade só afeta X:** depth do shot deveria variar sob pressão
6. **netApproachRate sem cap por estilo:** atributo pode empurrar ALL_COURT a subir à rede 45%+

### O QUE ESTÁ SÓLIDO
- Motor de física (drag, Magnus, bounce com topspin/backspin)
- `predictTrajectory()` espelha a física real com mesmos coeficientes
- Sistema de qualidade de posicionamento (distQuality + timingQuality + moveQuality)
- Diferenciação de 6 estilos de jogo
- Sistema de momentum com memória tática
- Mapeamento de atributos → modificadores realista

---

## Sessão 2 — 2026-02-22 · Execução dos 8 ajustes

### O que foi pedido
Executar todos os 8 ajustes identificados na auditoria e entregar os arquivos modificados prontos em um tar.

### O que foi feito

**`src/ai.js` — 4 alterações:**
- Bug #1: `target.y` agora é dinâmico usando `landPoint` do `predictTrajectory()`. Jogador avança até 2.5m da posição base para interceptar. Retorna à base após bater.
- Bug #2: `predY` adaptativo — se bola está no lado do jogador e a <4.5m da rede, usa `halfL*0.25` em vez de `halfL*0.55`. Fallback usando `landPoint` quando `crossPoint` é null.
- Fix #4: `dynamicOffset` calculado por momentum antes de definir `baselineY`. Jogador recua sob pressão, avança com confiança.
- Fix #7: Scatter de profundidade adicionado em `aiDecideShot()` — `depthScatter = (1-quality)*0.18`.

**`src/styles.js` — 1 alteração:**
- Fix #3: `baselineOffset` reduzido: AGG_BASELINER 1.5→0.4, ALL_COURT 1.2→0.5, BIG_SERVER 1.0→0.3.

**`src/constants.js` — 1 alteração:**
- Fix #5: `decayPerShot` 0.018→0.032, `recoveryPerPoint` 0.38→0.18.

**`src/players.js` — 2 alterações:**
- Fix #6: `patienceRallyMin` mínimo de 1→2.
- Fix #8: Caps de `netApproachRate` por estilo em `applyModsToStyle()`.

### Arquivos entregues
- `src/ai.js` — modificado
- `src/styles.js` — modificado
- `src/constants.js` — modificado
- `src/players.js` — modificado
- `CHANGES.md` — detalhamento de cada mudança com valores antes/depois
- `SUMARIO.md` — este arquivo

---

## Sessão 3 — 2026-02-22 · Re-Auditoria + Correção de Regressões

### O que foi pedido
Re-auditar o jogo pós-patch v1.1 para confirmar se Física/Movimento/Comportamento chegaram ao B+. Também auditar os atributos dos jogadores pela primeira vez.

### Bugs encontrados no próprio patch v1.1

**Bug Crítico: maxForward/maxBack invertidos (3 ocorrências em ai.js)**
- Para side > 0 (basePos.y ≈ +11.4): clamp `[basePos.y - maxBack, basePos.y + maxForward]` = `[10.6, 13.9]` → jogador só avançava 0.8m em vez de 2.5m.
- Para side < 0: mesmo problema espelhado. yFrac fallback igual.
- Correção: lógica de clamp separada por side com maxForward/maxBack nas posições corretas.

### Atributos mortos (3 de 27)
- **srv1Prec** → serveScatter calculado mas nunca lido em tickServing
- **varSaque** → sem mod, sem efeito. Distribuição T/Wide/Body fixa para todos
- **coberturaLob** → sem mod. Threshold de recuo de rede fixo em 1.8 para todos

### Fixes executados na sessão 3 (5 ajustes)

**ai.js:** clamp landPoint corrigido (3 ocorrências); yFrac clamp corrigido; lobZ dinâmico por lobCovMult
**players.js:** serveVarMult e lobCovMult adicionados a computePlayerMods e ao return
**game.js:** tickServing usa varMult para T/Wide/Body e sScatter para precisão de tX

### Projeção pós-patch v1.2
Física A− · Movimento A− · Comportamento B+ · Atributos B+

---

## Sessão 4 — 2026-02-22 · Auditoria v3 + Patch v1.3

### O que foi pedido
Executar itens da auditoria v2 (já estavam aplicados) e produzir auditoria v3 completa com análise de progresso.

### Estado na entrada
Todos os 5 fixes do audit v2 já estavam aplicados nos arquivos (foram executados no final da sessão 3). Nada faltou — audit v2 estava completo.

### Novos bugs encontrados (4)

**v3-A: THRESHOLDS.errorRallyMin = 1** (constants.js)
O fix de patience do v1.1 usou `computePlayerMods()` corretamente, mas o fallback para jogadores genéricos em `tryHit()` ainda lia `THRESHOLDS.errorRallyMin = 1`. Jogadores genéricos podiam errar no rally 2. Corrigido para 2.

**v3-B: underPressure sticky** (game.js)
`underPressure` era setado true quando bola baixa ou jogador esticado, mas só resetava em `resetCtx()` (entre pontos). Uma defesa difícil no rally 3 mantinha o jogador em modo defensivo até o ponto acabar. Para CTR_PUNCHER e RETRIEVER isso inflava SLICE/LOB_DEF incorretamente. Corrigido: reset quando diff < 0.45 e ball.z ≥ 0.55.

**v3-C: SRV_VOL rushNetAfterServe dead code** (game.js)
`sv.ctx.lobsReceived < 2` na linha de serve era always true porque lobsReceived reseta entre pontos. Guarda removida — a supressão de rede real acontece corretamente durante o rally via `netSuppressed`.

**v3-D: tickPreServe receiver Y fixo** (game.js)
Receiver interpolava para `side × (halfL − 0.5)` fixo. Agora usa `rv.styleData.baselineOffset` corretamente.

### Notas de refinamento (não bugs)
- fhPotencia vs bhPotencia fundidos em powerMult — perda de assimetria de asa
- Recuperação de posição sem delay após hit
- srv1Prec só afeta X do saque, não profundidade

### Notas finais de grade
Física A− · Movimento A− · Comportamento B+ · Atributos B+ · 27/27 atributos ativos
