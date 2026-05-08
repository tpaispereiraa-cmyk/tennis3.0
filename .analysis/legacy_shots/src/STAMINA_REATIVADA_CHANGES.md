# Stamina Reativada

**Arquivo:** `src/game.js` — linha ~2197

## O que foi feito

Reativado o bloco de decay de stamina que estava comentado para teste.

- Removida a linha `player.stamina = 1.0; // [TESTE] stamina fixada em 100%`
- Descomentado o bloco completo de decay que inclui:
  - `shotMult` por tipo de tacada (`SHOT_DECAY_MULT`)
  - `traitStaminaDiv` por trait do jogador
  - `decayRate` considerando `staminaDecayMult` de mods e `courtMods`
  - Log de cansaço ao cruzar `STAMINA.logThreshold`
