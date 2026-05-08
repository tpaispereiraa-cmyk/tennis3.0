// ============================================
// CALENDARCONFIG.JS - Novo Sistema de Calendário Universe Mode
// ============================================

export const TOURNAMENT_TIERS = {
  KINGS_COURT:   'KINGS_COURT',
  PREMIER:       'PREMIER',
  SIGNATURE_CLASH: 'SIGNATURE_CLASH', // New Year's Signature Clash (Janeiro) — 64 jogadores, MD1, Signature Blade obrigatório
  MASTERS:       'MASTERS',
  CHALLENGER:    'CHALLENGER',
  OPEN:          'OPEN',           // NOVO — Crossover Open (Agosto) pros + rising stars
  REDEMPTION:    'REDEMPTION',
  RISING_STAR:   'RISING_STAR',
  RISING_FINALS: 'RISING_FINALS'
};

// Estruturas de pontuação
export const POINTS_STRUCTURES = {
  PREMIER_2000: {
    champion: 2000,
    finalist: 1200,
    semifinalist: 720,
    quarterfinalist: 360,
    r16: 180,
    r32: 90,
    r64: 10
  },
  
  MASTERS_1000: {
    champion: 1000,
    finalist: 600,
    semifinalist: 360,
    quarterfinalist: 180,
    r16: 90,
    r32: 0
  },
  
  CHALLENGER_500: {
    champion: 500,
    finalist: 300,
    semifinalist: 180,
    quarterfinalist: 90,
    r16: 45,
    r32: 10
  },
  
  REDEMPTION_250: {
    champion: 250,
    finalist: 150,
    semifinalist: 90,
    quarterfinalist: 45,
    r16: 20,
    r32: 0
  },
  
  RISING_STAR_200: {
    champion: 200,
    finalist: 120,
    semifinalist: 70,
    quarterfinalist: 35,
    r16: 10
  },
  
  RISING_FINALS_LEAGUE: {
    first: 400,
    second: 250,
    third: 150,
    fourth: 100
  },
  
  KINGS_COURT_LEAGUE: {
    first: 2500,
    second: 1800,
    third: 1500,
    fourth: 1200,
    fifth: 1000,
    sixth: 800,
    seventh: 500,
    eighth: 300
  },

  // ── NOVOS TIERS ────────────────────────────────────────────────
  // New Year's Signature Clash — abre a temporada com 64 jogadores e MD1
  SIGNATURE_CLASH_1500: {
    champion:        1500,
    finalist:         750,
    semifinalist:     400,
    quarterfinalist:  200,
    r16:               80,
    r32:               30,
  },

  // Crossover Open — entre Masters e Challenger em prestígio (pro)
  OPEN_750: {
    champion:        750,
    finalist:        450,
    semifinalist:    270,
    quarterfinalist: 135,
    r16:              60,
    r32:              20,
  },

  // Pontuação especial no circuito amador para Rising Stars no Open
  OPEN_AMATEUR_BONUS: {
    champion:        600,   // qualificação automática Rising Finals
    finalist:        400,   // qualificação prioritária
    semifinalist:    250,
    quarterfinalist: 100,
  },
};

// Todas as arenas disponíveis (para rotação "ALL")
export const ALL_ARENAS = [
  'Prismatic Nexus',
  'Vortex Colosseum',
  'Storm Track',
  'Killer Side',
  'Tidal Clash',
  'Carnage Colosseum',
  'BB-10',
  'Domination Zone',
  'Pinball Inferno',
  'Pangea Platform',
  'Volcanic Rage',
  'Prismatic Portal'
];

export const CALENDAR_2025 = {
  year: 2025,
  months: [
    // ========== JANEIRO ==========
    {
      id: 1,
      name: 'Janeiro',
      tournaments: [
        {
          name: "New Year's Signature Clash",
          tier: 'SIGNATURE_CLASH',
          participants: 64,
          format: 'KNOCKOUT',
          matchFormat: 'MD1',
          eligibility: 'ALL_PROFESSIONALS',
          arenas: ['BB-10 Competitive'],
          mandatory: true,
          pointsStructure: 'SIGNATURE_CLASH_1500',
          signatureOnly: true, // todas as partidas usam apenas a Signature Blade
        },
        {
          name: 'Prismatic Masters',
          tier: 'MASTERS',
          participants: 32,
          format: 'KNOCKOUT',
          matchFormat: 'MD3',
          eligibility: 'CHOICE_SPLIT',
          arenas: ['Prismatic Nexus'],
          mandatory: false,
          pointsStructure: 'MASTERS_1000'
        },
        {
          name: 'Vortex Masters',
          tier: 'MASTERS',
          participants: 32,
          format: 'KNOCKOUT',
          matchFormat: 'MD3',
          eligibility: 'CHOICE_SPLIT',
          arenas: ['Vortex Colosseum'],
          mandatory: false,
          pointsStructure: 'MASTERS_1000'
        },
        {
          name: 'Rising Star Field - New Year Cup',
          tier: 'RISING_STAR',
          participants: 16,
          format: 'KNOCKOUT',
          matchFormat: 'MD3',
          eligibility: 'ALL_AMATEURS',
          arenas: 'ALL',
          mandatory: true,
          pointsStructure: 'RISING_STAR_200'
        }
      ]
    },
    
    // ========== FEVEREIRO ==========
    {
      id: 2,
      name: 'Fevereiro',
      tournaments: [
        {
          name: 'Storm Masters',
          tier: 'MASTERS',
          participants: 32,
          format: 'KNOCKOUT',
          matchFormat: 'MD3',
          eligibility: 'CHOICE_SPLIT',
          arenas: ['Storm Track'],
          mandatory: false,
          pointsStructure: 'MASTERS_1000'
        },
        {
          name: 'Killer Sides Masters',
          tier: 'MASTERS',
          participants: 32,
          format: 'KNOCKOUT',
          matchFormat: 'MD3',
          eligibility: 'CHOICE_SPLIT',
          arenas: ['Killer Side'],
          mandatory: false,
          pointsStructure: 'MASTERS_1000'
        },
        {
          name: 'Triple Ground Redemption - Winter Series',
          tier: 'REDEMPTION',
          participants: 32,
          format: 'KNOCKOUT',
          matchFormat: 'MD3',
          eligibility: 'BOTTOM_32',
          arenas: ['Prismatic Nexus', 'Vortex Colosseum', 'Storm Track'],
          mandatory: true,
          pointsStructure: 'REDEMPTION_250'
        }
      ]
    },
    
    // ========== MARÇO ==========
    {
      id: 3,
      name: 'Março',
      tournaments: [
        {
          name: 'Premier Championship - Spring Grand Slam',
          tier: 'PREMIER',
          participants: 64,
          format: 'KNOCKOUT',
          matchFormat: 'MD5',
          eligibility: 'ALL_PROFESSIONALS',
          arenas: 'ALL',
          mandatory: true,
          pointsStructure: 'PREMIER_2000'
        },
        {
          name: 'Triple Ground Challenger - Spring Circuit',
          tier: 'CHALLENGER',
          participants: 32,
          format: 'KNOCKOUT',
          matchFormat: 'MD3',
          eligibility: 'TOP_32',
          arenas: ['Prismatic Nexus', 'Vortex Colosseum', 'Storm Track'],
          mandatory: false,
          pointsStructure: 'CHALLENGER_500'
        },
        {
          name: 'Rising Star Field - Spring Showdown',
          tier: 'RISING_STAR',
          participants: 16,
          format: 'KNOCKOUT',
          matchFormat: 'MD3',
          eligibility: 'ALL_AMATEURS',
          arenas: 'ALL',
          mandatory: true,
          pointsStructure: 'RISING_STAR_200'
        }
      ]
    },
    
    // ========== ABRIL ==========
    {
      id: 4,
      name: 'Abril',
      tournaments: [
        {
          name: 'Tidal Masters',
          tier: 'MASTERS',
          participants: 32,
          format: 'KNOCKOUT',
          matchFormat: 'MD3',
          eligibility: 'CHOICE_SPLIT',
          arenas: ['Tidal Clash'],
          mandatory: false,
          pointsStructure: 'MASTERS_1000'
        },
        {
          name: 'Carnage Masters',
          tier: 'MASTERS',
          participants: 32,
          format: 'KNOCKOUT',
          matchFormat: 'MD3',
          eligibility: 'CHOICE_SPLIT',
          arenas: ['Carnage Colosseum'],
          mandatory: false,
          pointsStructure: 'MASTERS_1000'
        },
        {
          name: 'Triple Ground Redemption - Spring Comeback',
          tier: 'REDEMPTION',
          participants: 32,
          format: 'KNOCKOUT',
          matchFormat: 'MD3',
          eligibility: 'BOTTOM_32',
          arenas: ['Tidal Clash', 'Carnage Colosseum', 'Killer Side'],
          mandatory: true,
          pointsStructure: 'REDEMPTION_250'
        }
      ]
    },
    
    // ========== MAIO ==========
    {
      id: 5,
      name: 'Maio',
      tournaments: [
        {
          name: 'Triple Ground Challenger - Mid-Season Push',
          tier: 'CHALLENGER',
          participants: 32,
          format: 'KNOCKOUT',
          matchFormat: 'MD3',
          eligibility: 'TOP_32',
          arenas: ['Tidal Clash', 'Carnage Colosseum', 'Killer Side'],
          mandatory: false,
          pointsStructure: 'CHALLENGER_500'
        },
        {
          name: 'Rising Star Field - Rookie Rumble',
          tier: 'RISING_STAR',
          participants: 16,
          format: 'KNOCKOUT',
          matchFormat: 'MD3',
          eligibility: 'ALL_AMATEURS',
          arenas: 'ALL',
          mandatory: true,
          pointsStructure: 'RISING_STAR_200'
        }
      ]
    },
    
    // ========== JUNHO ==========
    {
      id: 6,
      name: 'Junho',
      tournaments: [
        {
          name: 'Premier Championship - Summer Slam',
          tier: 'PREMIER',
          participants: 64,
          format: 'KNOCKOUT',
          matchFormat: 'MD5',
          eligibility: 'ALL_PROFESSIONALS',
          arenas: 'ALL',
          mandatory: true,
          pointsStructure: 'PREMIER_2000'
        },
        {
          name: 'Triple Ground Challenger - Summer Circuit',
          tier: 'CHALLENGER',
          participants: 32,
          format: 'KNOCKOUT',
          matchFormat: 'MD3',
          eligibility: 'TOP_32',
          arenas: ['BB-10', 'Domination Zone', 'Pinball Inferno'],
          mandatory: false,
          pointsStructure: 'CHALLENGER_500'
        },
        {
          name: 'Rising Star Field - Summer Heat',
          tier: 'RISING_STAR',
          participants: 16,
          format: 'KNOCKOUT',
          matchFormat: 'MD3',
          eligibility: 'ALL_AMATEURS',
          arenas: 'ALL',
          mandatory: true,
          pointsStructure: 'RISING_STAR_200'
        }
      ]
    },
    
    // ========== JULHO ==========
    {
      id: 7,
      name: 'Julho',
      tournaments: [
        {
          name: 'Pinball Masters',
          tier: 'MASTERS',
          participants: 32,
          format: 'KNOCKOUT',
          matchFormat: 'MD3',
          eligibility: 'CHOICE_SPLIT',
          arenas: ['Pinball Inferno'],
          mandatory: false,
          pointsStructure: 'MASTERS_1000'
        },
        {
          name: 'Domination Masters',
          tier: 'MASTERS',
          participants: 32,
          format: 'KNOCKOUT',
          matchFormat: 'MD3',
          eligibility: 'CHOICE_SPLIT',
          arenas: ['Domination Zone'],
          mandatory: false,
          pointsStructure: 'MASTERS_1000'
        },
        {
          name: 'Triple Ground Redemption - Mid-Year Recovery',
          tier: 'REDEMPTION',
          participants: 32,
          format: 'KNOCKOUT',
          matchFormat: 'MD3',
          eligibility: 'BOTTOM_32',
          arenas: ['Pangea Platform', 'BB-10', 'Volcanic Rage'],
          mandatory: true,
          pointsStructure: 'REDEMPTION_250'
        }
      ]
    },
    
    // ========== AGOSTO ==========
    {
      id: 8,
      name: 'Agosto',
      tournaments: [
        {
          name: 'The Crossover Open',
          tier: 'OPEN',
          participants: 32,
          format: 'KNOCKOUT',
          matchFormat: 'MD3',
          eligibility: 'OPEN_32',
          arenas: 'ALL',
          mandatory: true,
          pointsStructure: 'OPEN_750',
          // 16 profissionais + 16 Rising Stars — sem BYE
          includesRisingStars: true,
          risingStarPointsStructure: 'OPEN_AMATEUR_BONUS',
        },
        {
          name: 'Triple Ground Challenger - Late Summer Clash',
          tier: 'CHALLENGER',
          participants: 32,
          format: 'KNOCKOUT',
          matchFormat: 'MD3',
          eligibility: 'TOP_32',
          arenas: ['Pangea Platform', 'BB-10', 'Volcanic Rage'],
          mandatory: false,
          pointsStructure: 'CHALLENGER_500'
        },
        {
          name: 'Rising Star Field - Youth Championship',
          tier: 'RISING_STAR',
          participants: 16,
          format: 'KNOCKOUT',
          matchFormat: 'MD3',
          eligibility: 'ALL_AMATEURS',
          arenas: 'ALL',
          mandatory: true,
          pointsStructure: 'RISING_STAR_200'
        }
      ]
    },
    
    // ========== SETEMBRO ==========
    {
      id: 9,
      name: 'Setembro',
      tournaments: [
        {
          name: 'Premier Championship - Autumn Showdown',
          tier: 'PREMIER',
          participants: 64,
          format: 'KNOCKOUT',
          matchFormat: 'MD5',
          eligibility: 'ALL_PROFESSIONALS',
          arenas: 'ALL',
          mandatory: true,
          pointsStructure: 'PREMIER_2000'
        },
        {
          name: 'Triple Ground Challenger - Fall Circuit',
          tier: 'CHALLENGER',
          participants: 32,
          format: 'KNOCKOUT',
          matchFormat: 'MD3',
          eligibility: 'TOP_32',
          arenas: ['Pangea Platform', 'BB-10', 'Volcanic Rage'],
          mandatory: false,
          pointsStructure: 'CHALLENGER_500'
        }
      ]
    },
    
    // ========== OUTUBRO ==========
    {
      id: 10,
      name: 'Outubro',
      tournaments: [
        {
          name: 'Pangea Masters',
          tier: 'MASTERS',
          participants: 32,
          format: 'KNOCKOUT',
          matchFormat: 'MD3',
          eligibility: 'CHOICE_SPLIT',
          arenas: ['Pangea Platform'],
          mandatory: false,
          pointsStructure: 'MASTERS_1000'
        },
        {
          name: 'BB-10 Masters',
          tier: 'MASTERS',
          participants: 32,
          format: 'KNOCKOUT',
          matchFormat: 'MD3',
          eligibility: 'CHOICE_SPLIT',
          arenas: ['BB-10'],
          mandatory: false,
          pointsStructure: 'MASTERS_1000'
        },
        {
          name: 'Triple Ground Redemption - Final Push',
          tier: 'REDEMPTION',
          participants: 32,
          format: 'KNOCKOUT',
          matchFormat: 'MD3',
          eligibility: 'BOTTOM_32',
          arenas: ['Killer Side', 'Volcanic Rage', 'Prismatic Portal'],
          mandatory: true,
          pointsStructure: 'REDEMPTION_250'
        }
      ]
    },
    
    // ========== NOVEMBRO ==========
    {
      id: 11,
      name: 'Novembro',
      tournaments: [
        {
          name: 'Premier Championship: Classic',
          tier: 'PREMIER',
          participants: 64,
          format: 'KNOCKOUT',
          matchFormat: 'MD5',
          eligibility: 'ALL_PROFESSIONALS',
          arenas: ['BB-10'], // Única arena!
          mandatory: true,
          pointsStructure: 'PREMIER_2000'
        },
        {
          name: 'Triple Ground Challenger - Season Finale Qualifier',
          tier: 'CHALLENGER',
          participants: 32,
          format: 'KNOCKOUT',
          matchFormat: 'MD3',
          eligibility: 'TOP_32',
          arenas: ['Killer Side', 'Volcanic Rage', 'Prismatic Portal'],
          mandatory: false,
          pointsStructure: 'CHALLENGER_500'
        },
        {
          name: 'Rising Star Field - Championship Qualifier',
          tier: 'RISING_STAR',
          participants: 16,
          format: 'KNOCKOUT',
          matchFormat: 'MD3',
          eligibility: 'ALL_AMATEURS',
          arenas: ['BB-10'], // Única arena!
          mandatory: true,
          pointsStructure: 'RISING_STAR_200'
        }
      ]
    },
    
    // ========== DEZEMBRO ==========
    {
      id: 12,
      name: 'Dezembro',
      tournaments: [
        {
          name: 'Kings Court Finals',
          tier: 'KINGS_COURT',
          participants: 8,
          format: 'KNOCKOUT',
          matchFormat: 'MD3',
          eligibility: 'TOP_8',
          arenas: 'ALL',
          mandatory: true,
          pointsStructure: 'KINGS_COURT_LEAGUE'
        },
        {
          name: 'Rising Star Finals',
          tier: 'RISING_FINALS',
          participants: 8,
          format: 'KNOCKOUT',
          matchFormat: 'MD3',
          eligibility: 'TOP_8_AMATEUR',
          arenas: 'ALL',
          mandatory: true,
          pointsStructure: 'RISING_FINALS_LEAGUE'
        }
      ]
    }
  ]
};

// Helper para pegar configuração do mês
export function getMonthConfig(monthId) {
  return CALENDAR_2025.months.find(m => m.id === monthId);
}

// Helper para pegar torneio específico
export function getTournament(monthId, tournamentIndex) {
  const month = getMonthConfig(monthId);
  return month?.tournaments[tournamentIndex];
}

// Helper para contar total de torneios no ano
export function getTotalTournaments() {
  return CALENDAR_2025.months.reduce((total, month) => total + month.tournaments.length, 0);
}

// Exportar como CALENDAR_STRUCTURE para compatibilidade
export const CALENDAR_STRUCTURE = CALENDAR_2025;
