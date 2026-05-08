# Shot Intent Overlay — Bug Mode (v2 — direto no canvas)

## O que foi feito

Quando o botão **Bug 🐛** é ativado, o overlay aparece **diretamente na quadra** (canvas do jogo), nas coordenadas reais de jogo. Funciona junto com o slider de timeline do Bug Mode.

## Arquivos modificados

| Arquivo | O que mudou |
|---------|-------------|
| `src/game.js` | SHOT_EVENT ganhou `playerSide`, `ctrlAttr`, `sigma`, `intentX/Y` |
| `src/components/App.jsx` | Frame history ganhou `lastShotEvent` e `lastBouncePos` por frame |
| `src/NEWME1.0.jsx` | Dois refs + dois `useEffect` de sync + bloco de desenho no `frame()` |

## Detalhes por arquivo

### `game.js`
Dentro do bloco `if (gs.debugEvents.length < 2000)`, antes do `.push()`:
- Calcula `_ctrlAttr_dbg` (wing-aware), `_precisaoDiv_dbg` e `_sigmaEst`
- SHOT_EVENT agora inclui: `playerSide`, `ctrlAttr`, `sigma`, `intentX`, `intentY`

### `App.jsx`
Frame history push ganhou:
- `lastShotEvent` — cópia do último SHOT_EVENT no tick
- `lastBouncePos` — cópia de `gs.lastBouncePos` no tick

### `NEWME1.0.jsx`
- `bugOverlayRef` e `shotIntentRef` — refs acessíveis no rAF loop sem closure stale
- `useEffect` que sincroniza `bugOverlay` → `bugOverlayRef`
- `useEffect` que lê o frame atual (live ou rewind) → `shotIntentRef`
- Bloco de desenho no final do `frame()`, usando `toCanvas(gameY, gameX)`:

## O que aparece na quadra

| Elemento | Visual |
|----------|--------|
| 🎯 Mira intencional | Cruz dourada + ponto + label `Q___%` |
| ⭕ Elipse de dispersão σ | Elipse tracejada, cor = quality (verde/amarelo/laranja/vermelho) |
| ⭕ Quique real | Círculo branco + × vermelho + label "QUIQUE" |
| 🟢 Zona aberta | Retângulo verde translúcido no lado oposto ao oponente |
| — Linha de intenção | Linha tracejada dourada do batedor ao alvo |
| Legenda | Canto superior da quadra, em coordenadas canvas |

## Orientação

P0 (side=+1) fica na metade positiva do eixo Y do jogo. A zona aberta é calculada no lado oposto ao oponente (eixo X), na quadra adversária (eixo Y oposto ao batedor).
