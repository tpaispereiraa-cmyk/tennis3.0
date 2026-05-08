# Fix: Save permanente — Estratégia Histórica Inteligente

## O que era o "lite save"?
O save completo falhou porque o `matchHistory` em memória continha anos de partidas com objetos bey gigantes.
O fallback removia o `matchHistory` e salvava — mas o nome `_LITE_` gerava confusão.
**IMPORTANTE:** O arquivo `_LITE_` continha tudo que importa (HoF, recordes, newgens, ranking, crônicas).
Agora o save completo funciona sem precisar de fallback.

---

## Estratégia de Save por Categoria

### MANTÉM PARA SEMPRE (nunca removido)
- `hallOfFame` — histórico eterno ✓
- `grandFinalsHistory` — todas as grandes finais ✓
- `seasonWinners` — campeões por temporada ✓
- `historicalRankings` — ranking all-time ✓
- `divisionChangeLog` — promoções/rebaixamentos ✓
- `chronicleEngine` — crônicas escritas + epitáfios ✓
- `titles.detailedList` — cada título de cada jogador ✓
- `tournamentHistory`: position=1 (títulos) — nunca apagado ✓
- `eventHistory`: specialAchievement — nunca apagado ✓
- `matchHistory`: finais, Grand Slams, upsets ≥15 posições ✓
- `playerHistories.upsetsCaused` — novo contador permanente ✓

### MANTÉM RECENTEMENTE (janela temporal)
- `tournamentHistory`: posição ≤4 dos últimos 3 anos
- `eventHistory`: últimos 2 anos
- `matchHistory`: últimas 100 partidas (forma/H2H)
- `rankingHistory`: últimos 24 snapshots (2 anos)
- `formaHistory`: últimas 30 entradas por jogador

### DESCARTA (passou, sem importância histórica)
- Participações antigas sem pódio (posição >4 com >3 anos)
- Eventos comuns sem achievement especial com >2 anos
- Partidas classificatórias antigas sem upset/final
- Snapshots de ranking com >2 anos

---

## Arquivos Modificados

### `src/UniverseManager.js`
1. `logMatch()`: novo contador `upsetsCaused` e `biggestUpsetMargin` em `playerHistories`
2. `exportToJSON()`:
   - `matchHistory` → filtro inteligente (finais + grand slams + upsets + últimas 100)
   - `playerHistories` → filtro histórico por posição/tempo
   - `rankingHistory` → cap 24 snapshots em export
   - `formManager` → formaHistory capped (via FormSystem)

### `src/FormSystem.js`
- `formaHistory` capped a 30 entradas em runtime (push + shift automático)

### `src/RecordsView.jsx`
- `getUpsetsCaused()`: prioriza `playerHistories.upsetsCaused` (campo permanente)
  → fallback scan matchHistory para saves antigos sem o campo

### `src/BroadcastHub.jsx`
- Fallback de save renomeado: arquivo salva com nome normal (`bblade_save_...`)
- Mensagem de console mais clara (sem `_LITE_` no nome do arquivo)

---

## Compatibilidade
- Saves antigos carregam normalmente (expand functions já existem)
- `upsetsCaused` acumula a partir da próxima partida (saves antigos: fallback via matchHistory)

---

# Fix: Modo Universe — após assistir batalha MD1 voltava para HOME

**Arquivo alterado:** `App.jsx`

**Problema:**
No `handleContinue`, havia um atalho para torneios `MD1` que sempre enviava
para `setScreen('HOME')`, sem verificar se o jogo estava em modo Universe:

```js
// ANTES (bugado)
if (md3State.format === 'MD1') {
  setScreen('HOME'); // sempre HOME, independente do modo
  return;
}
```

O torneio **New Year's Signature Clash** usa `matchFormat: 'MD1'`, então ao
assistir qualquer partida dele, ao terminar o combate o fluxo passava por este
trecho e mandava o jogador de volta à tela inicial.

Ao **simular**, o fluxo não passa por `handleContinue`, daí funcionava corretamente.

**Correção:**
```js
// DEPOIS (corrigido)
if (md3State.format === 'MD1') {
  if (mode === 'universe') {
    handleUniverseMatchEnd(); // registra resultado e volta para o bracket
  } else {
    setScreen('HOME');
  }
  return;
}
```

A variável `mode` já estava calculada logo acima como `'universe'` quando
`universeCurrentMatch` está definido, consistente com o padrão já usado pelo
trecho de MD3/MD5 mais abaixo no mesmo método.

---

# Pinball Inferno V3 — Arena completamente reescrita

**Arquivos alterados:** `HeadlessBattle.js`, `battle/arena/ArenaConfigs.js`

## O que foi removido
Toda a lógica V2: zonas (combatZone/transitionZone/dangerZone/ringOutZone), gravity tilt com multiplicadores por zona, bumpers em cruz (N/S/L/O), ring-out por zona, stamina drain por zona.

## Nova estrutura (V3)

### Arena Config
- `type: 'pinball_v3'`, `arenaRadius: 165`
- 4 bumpers nas diagonais (top-left/top-right/bottom-left/bottom-right), posicionados como no desenho
- `centerBumper`: bumper especial no centro, bounce elástico + 1000 pts por hit, streak multiplier
- 2 flippers no fundo (esquerda/direita), auto-trigger por proximidade
- `ringOutGap` entre os flippers (x=0, y=155, 52×22px)
- `gravity: { strength: 0.09 }` puxando para baixo continuamente
- Score state (`score`, `consecutiveCenterHits`, `centerBumperCooldownB1/B2`) resetado a cada batalha

### Física (handlePinballInfernoPhysics)
- Gravidade constante (vy += 0.09)
- Parede: bounce com fator 0.85 (leve absorção), partículas rosa neon
- Bumpers laterais: push = bounceForce + vel*0.5, reseta streak de center hits
- Center bumper: bounce elástico (100% de velocidade preservada), +1000 pts, streak ≥3 → +2000 pts; se score ≥8000 → opponent.stamina=0 (vitória por pontos)
- Flippers: lançam diagonal para cima (left → upper-right, right → upper-left), power = 14 + vel*0.3
- Ring Out Gap: se blade entra → stamina=0, spinPercent=0, evento PINBALL_RINGOUT
- Colisões perto da parede (raio > 125): +25% de força

### Renderer (drawPinballInferno)
- Chão: fundo #040010 + grid cyan fino + grid rosa diagonal + glow radial do centro
- Borda rosa neon com múltiplas camadas de glow pulsante
- Bumpers com gradiente dark-to-orange no hit, anéis duplos, cooldown visual
- Center bumper com glow pulsante cyan, progresso de pontos em arco (rosa = B1, cyan = B2)
- Flippers azuis com highlight, animados quando ativos
- Ring Out Gap vermelho pulsante
- HUD de pontuação no topo da arena (◆ B1 / goal / B2 ◆)

### Sugestão A implementada
3 hits consecutivos no bumper central sem bater nos bumpers laterais → próximo hit vale 2000 pts.
Qualquer hit em bumper lateral zera o streak.
