# Fix: Ficha do Jogador não abria pelo Ranking (BroadcastUniverse)

## Arquivo alterado
- `src/components/BroadcastUniverse.jsx`

## Problema
Na função `RankingsView`, ao clicar em um jogador do ranking, a ficha era renderizada com props erradas:

```jsx
// ANTES (bugado)
<UnifiedPlayerProfile player={selPlayer} state={state} />
```

O componente `UnifiedPlayerProfile2` espera a prop `playerData`, não `player`. Como `playerData` chegava como `undefined`, o componente retornava `null` silenciosamente via `if (!np) return null`.

Além disso, props essenciais estavam ausentes: `onBack`, `onNavigate`, `allPlayers`, `rankingStore`, `tournamentResults`, `dispatch`, `year`, etc.

## Causa raiz
1. Nome de prop errado: `player` em vez de `playerData`
2. Props ausentes impediam funcionamento correto da ficha
3. A variável `list` era declarada **depois** do `return` condicional, impossibilitando seu uso para navegação entre fichas

## Solução
1. Moveu `const list` para antes do `return` condicional
2. Substituiu o bloco de renderização por chamada correta com todas as props:
   - `playerData={selPlayer}` — prop correta do componente
   - `onBack={() => setSelPlayer(null)}` — botão ← Voltar funcional
   - `allKeys={rankingKeys}` — IDs dos jogadores do ranking para navegação Ant/Próx
   - `onNavigate={handleNavigate}` — troca o jogador selecionado pelo ID
   - `allPlayers`, `rankingStore`, `tournamentResults` — dados do universo
   - `coachPool`, `dispatch`, `year` — para aba técnico funcionar
   - `rivalrySystem`, `newsEngine`, `sponsorPool`, `chronicleEngine` — sistemas complementares
3. Removeu o wrapper `<div>` com botão duplicado (o `onBack` já cuida do voltar)

