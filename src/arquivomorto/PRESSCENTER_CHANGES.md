# PRESSENTER — CHANGES

## O que foi feito

Criado `PressCenter.jsx` — central de imprensa unificada que substitui as 3 abas separadas.

## Arquivos modificados

### `src/components/PressCenter.jsx` — NOVO
Componente completo de ~550 linhas. Substitui JornalView, InterviewView e a aba NOTÍCIAS do BroadcastUniverse em uma única view com 5 mesas editoriais.

### `src/components/BroadcastUniverse.jsx` — EDITADO
- Import adicionado: `import PressCenter from './PressCenter.jsx'`
- 3 tabs removidas: `noticias`, `jornal`, `entrevistas`
- 1 tab adicionada: `imprensa` (label: IMPRENSA, icon: â—ˆ)
- Render case atualizado: `{currentTab === 'imprensa' && state && <PressCenter state={state} />}`

## Estrutura do PressCenter

```
PressCenter
â”œ── Header (REDAÇÃO DO CIRCUITO + temporada + dot pulsante)
â”œ── Ticker (scroll automático com últimas manchetes)
â”œ── Body
│   â”œ── Sidebar (200px, sticky)
│   │   â”œ── Nav: 5 mesas editoriais
│   │   â””── Feed stats (manchetes/bastidores/análise count)
│   â””── Main content
│       â”œ── JournalistStrip (filtro por jornalista, aparece em 3 mesas)
│       â”œ── ArticleReader (modo leitura imersivo, aparece ao clicar artigo)
│       â””── Desk content (muda conforme mesa ativa)
│           â”œ── ManchetesDesk — hero + secondary + grid
│           â”œ── EntrevistasDesk — oportunidades + gerador + Q&A reader
│           â”œ── BastidoresDesk — rumores/gossip com estilo distinto
│           â”œ── AnaliseDesk — matérias táticas/colunas com layout especial
│           â””── ArquivoDesk — filtro por ano + busca full-text
```

## Componentes internos

- `ArticleReader` — modo leitura com pull quote, tipografia editorial, tags
- `ArticleHero` — card grande para destaque
- `ArticleCard` — card compacto para grids/listas
- `JournalistStrip` — chips de jornalista com contagem de artigos
- `InterviewReader` — Q&A formatado com tom do jogador e personalidade do jornalista
- `NewsTypeBadge`, `JournalistByline`, `PlayerAvatar` — helpers reutilizáveis

## Compatibilidade

- Não quebra JornalView.jsx ou InterviewView.jsx (ficam no código mas sem tab)
- Consome `state.newsEngine.feed` e `state.tourPlayers/prospects` igual aos componentes antigos
- Usa InterviewEngine.deriveInterviewOpportunities e generateInterview sem alteração

