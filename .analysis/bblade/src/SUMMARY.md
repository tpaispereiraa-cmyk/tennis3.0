# SUMMARY — BBlade Universe Mode

## Sessão 1: Fix MD1 Universe — voltava para HOME após batalha

**Problema:** No modo Universe, ao assistir qualquer batalha do torneio New Year's Signature Clash (MD1), o jogo voltava para a tela HOME ao invés do bracket.

**Causa:** Em `App.jsx`, `handleContinue` tinha um atalho `if (md3State.format === 'MD1') { setScreen('HOME') }` que ignorava o modo Universe.

**Fix:** Adicionado check de `mode`:
```js
if (md3State.format === 'MD1') {
  if (mode === 'universe') handleUniverseMatchEnd();
  else setScreen('HOME');
  return;
}
```
**Arquivo:** `App.jsx` (~linha 820)

---

## Sessão 2: Pinball Inferno V3 — Arena completamente reescrita

**Pedido:** Reescrever a Pinball Inferno do zero com o novo design definido no concept HTML, incluindo Sugestão A (streak multiplier) e chão Neon Grid.

### Arquivos alterados
- `HeadlessBattle.js` — config da arena, física, renderer, init reset
- `battle/arena/ArenaConfigs.js` — config espelho

### Nova mecânica
| Elemento | Comportamento |
|----------|--------------|
| Borda rosa neon | Bounce com 0.85x de velocidade, partículas rosas |
| 4 bumpers diagonais | Empurram com força = bounceForce + vel×0.5, resetam streak |
| Center bumper (azul) | Bounce elástico (100% vel), +1000 pts, streak ≥3 → +2000 pts |
| 2 flippers no fundo | Auto-trigger, lançam diagonal para cima, power=14+vel×0.3 |
| Ring Out Gap | Abertura entre flippers — stamina=0, eliminação imediata |
| Gravidade | vy += 0.09 constante puxando para baixo |
| Colisões perto da parede | +25% de força |

### Condições de vitória
- Pontos: primeiro a atingir 8000 pts vence
- Ring Out: blade cai pelo gap
- Spin Finish: stamina zerada pelos bumpers/gravidade
- Burst Finish: burstDamage acumulado nos bumpers

### Sugestão A
3 hits consecutivos no center bumper sem tocar bumpers laterais → próximo hit vale 2000 pts. Qualquer hit lateral zera o streak.

### Eventos registrados
`PINBALL_BUMPER_HIT`, `CENTER_BUMPER_HIT`, `FLIPPER_LAUNCH`, `PINBALL_RINGOUT`, `POINTS_WIN`

---

## Sessão 3: Fix Load de Save JSON — ranking, aposentados, newgens

**Problema reportado:** Ao carregar um save JSON, recordes e história carregavam corretamente, mas:
- Ranking BBP mostrava dados incorretos/antigos
- Jogadores aposentados reapareciam na tela de ranking
- Newgens não apareciam no ranking

**Causa — 3 bugs independentes:**

### Bug 1: Cache de ranking stale após import
`getBBPRanking()` tem cache interno (`_bbpRankingCache`). Após `importFromJSON`, o cache não era limpo. Se o usuário tivesse jogado algo antes do load, o ranking retornava dados do estado pré-load.

**Fix em `UniverseManager.js`** — final de `importFromJSON`:
```js
this._bbpRankingCache = null;
this._bbpRankingDirty = true;
this._tourneyWinsCache = new Map();
this._h2hLastResult = new Map();
```

### Bug 2: Tela de ranking sem filtro de status
`UniverseRankingsScreen` em `Screens.jsx` construía `allPlayersRanking` com `TEAMS.map()` sem filtrar status. Aposentados entravam na lista com 0 pontos.

**Fix em `Screens.jsx`** — `.filter()` após o map:
- BBP e Temporada: apenas `status === 'PROFESSIONAL'`
- Carreira/Histórico: todos (aposentados têm histórico legítimo)

### Bug 3: App.jsx não re-renderizava após load
`setRefreshKey` após load existia só dentro de `BroadcastHub`. O componente pai `App.jsx` não era notificado.

**Fix em `App.jsx` + `BroadcastHub.jsx`:**
- `App.jsx`: novo state `appRefreshKey`, prop `onLoadComplete={() => setAppRefreshKey(k => k + 1)}`
- `BroadcastHub.jsx`: recebe `onLoadComplete` e chama após import bem-sucedido

**Arquivos modificados:** `UniverseManager.js`, `Screens.jsx`, `App.jsx`, `BroadcastHub.jsx`
