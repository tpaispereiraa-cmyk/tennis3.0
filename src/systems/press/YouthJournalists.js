// Vozes que existem para acompanhar a base, não para repetir o noticiário do Tour.
// Elas usam lentes complementares: resultado/projeção e formação/contexto.
export const YOUTH_CIRCUIT_JOURNALISTS = {
  FERREIRA: {
    id: 'FERREIRA',
    name: 'Maya Ferreira',
    outlet: 'Base 16',
    specialty: 'Circuito juvenil, rankings e projeções',
    style: 'ANALYTICAL',
    icon: '🔭',
    color: '#37B7FF',
    bias: 'JUNIOR_CIRCUIT',
    verbosity: 'MEDIUM',
    voice: { opening: ['Youth results reveal the next wave.'], transition: ['The junior context matters here.'], closing: ['The next answer will come quickly.'] },
  },
  OKORO: {
    id: 'OKORO',
    name: 'Nia Okoro',
    outlet: 'Entre Linhas',
    specialty: 'Formação, academias e trajetórias',
    style: 'NARRATIVE',
    icon: '🎾',
    color: '#F06D4F',
    bias: 'FORMATION',
    verbosity: 'MEDIUM',
    voice: { opening: ['Development stories begin before the adult rankings.'], transition: ['The formation context adds another layer.'], closing: ['This trajectory deserves attention.'] },
  },
};
