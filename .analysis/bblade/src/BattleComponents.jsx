// ============================================
// BATTLECOMPONENTS.JSX - Componentes de Batalha (REFATORADO)
// ============================================
//
// COMPONENTES UNIFICADOS - USADOS POR TODOS OS MODOS
// ============================================
// 
// IMPORTANTE: Estes componentes são compartilhados entre:
// - Modo Exibição
// - Modo Universo
// - Qualquer outro modo futuro
//
// Não há componentes separados por modo. São os MESMOS componentes.
// Qualquer mudança aqui afeta TODOS os modos igualmente.
//
// Componentes principais:
// - PreBattleScreen    → Tela pré-jogo (análise + lançamento)
// - BattleArena        → Arena de combate (física do jogo)
// - ReplayScreen       → Tela de replay
// - PostMatchScreen    → Resultados pós-jogo
//
// ============================================
//
// ⚡ REFATORAÇÃO v2.0
// O arquivo original de 11.841 linhas foi dividido em 5 módulos:
// - battle/PreBattleComponents.jsx    (~60 linhas)
// - battle/PlayerComponents.jsx       (~830 linhas)
// - battle/BattleArena.jsx            (~9.600 linhas)
// - battle/PostBattleComponents.jsx   (~200 linhas)
// - battle/ExhibitionComponents.jsx   (~1.100 linhas)
//
// Este arquivo agora serve apenas como índice que re-exporta tudo,
// mantendo 100% compatibilidade com código existente.
// ============================================

// Importar todos os componentes dos módulos refatorados
import { PreBattleScreen } from './battle/PreBattleComponents.jsx';
import { PlayerCard } from './battle/PlayerComponents.jsx';
import { BattleArena } from './battle/BattleArena.jsx';
import { ReplayScreen, PostMatchScreen } from './battle/PostBattleComponents.jsx';
import { ExhibitionSetup } from './battle/ExhibitionComponents.jsx';

// Re-exportar tudo mantendo a API original
export {
  PreBattleScreen,
  BattleArena,
  ReplayScreen,
  PostMatchScreen,
  ExhibitionSetup,
  PlayerCard
};
