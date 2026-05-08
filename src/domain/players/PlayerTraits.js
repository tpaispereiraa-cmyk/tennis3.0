/**
 * PlayerTraits.js
 * ─────────────────────────────────────────────────────────────────
 * Atribuição manual de DNA Traits para os 127 jogadores nomeados.
 *
 * Cada jogador recebe:
 *   score  — DNA score numérico (define tier e nº de slots)
 *   slots  — [ { tier: 'NEG'|'COM'|'RAR'|'LEN', traitId } ]
 *
 * Sombras são construídas automaticamente ao chamar applyPlayerTraits().
 *
 * Regras de slots por DNA score (do TraitSystem):
 *   90–99 EXCEPCIONAL : 3 COM + 2 RAR + 1 LEN
 *   75–89 ALTO        : 3 COM + 2 RAR
 *   60–74 BOM         : 2 COM + 1 RAR
 *   40–59 NORMAL      : 2 COM
 *   0–39  FRACO       : 1 COM
 *   NEGs são adicionais e independentes do tier.
 */

import { TRAIT_CATALOG, sanitizeTraitSlots } from '../../systems/traits/TraitSystem.js';

// ═══════════════════════════════════════════════════════════════════
// DADOS BRUTOS DE DNA POR JOGADOR
// ═══════════════════════════════════════════════════════════════════

const RAW_DNA = {

  // ── TIER 1 — LENDA (DNA 78–89) ──────────────────────────────────

  NAKAMURA: {
    score: 88,
    slots: [
      { tier: 'RAR', traitId: 'ALL_SURFACE' },          // sem fraqueza em nenhuma quadra
      { tier: 'RAR', traitId: 'DECISIVO' },              // clutch player absoluto
      { tier: 'COM', traitId: 'MAQUINA' },               // sem emoção, sem vacilo
      { tier: 'COM', traitId: 'PRECISAO_CIRURGICA' },    // srv1Prec 90
      { tier: 'COM', traitId: 'INQUEBRAVEL' },           // mentalidade 88
    ],
  },

  BJORNSTAD: {
    score: 84,
    slots: [
      { tier: 'RAR', traitId: 'QUINTO_SET' },            // ganhou Wimbledon em 5 sets
      { tier: 'RAR', traitId: 'ESPECIALISTA_BO5' },      // 2 Slams, BO5 é seu elemento
      { tier: 'COM', traitId: 'ALL_SURFACE' },           // sólido em tudo
      { tier: 'COM', traitId: 'GUERREIRO' },             // luta cada ponto
      { tier: 'COM', traitId: 'DECISIVO' },              // mentalidade 85
    ],
  },

  AJUBA: {
    score: 82,
    slots: [
      { tier: 'RAR', traitId: 'CANHAO_SAQUE' },         // serve 99
      { tier: 'RAR', traitId: 'DESTRUIDOR_MORAL' },     // Thunder, intimidação pura
      { tier: 'COM', traitId: 'MAGO_GRAMA' },           // big server na grama
      { tier: 'COM', traitId: 'SANGUE_QUENTE' },        // emocional, focado
      { tier: 'COM', traitId: 'PICO_ADRENALINA' },      // explosão no início
      { tier: 'NEG', traitId: 'DECISIVO' },             // mentalidade 69 — choca em pontos decisivos
    ],
  },

  OSEI: {
    score: 80,
    slots: [
      { tier: 'RAR', traitId: 'FH_ASSASSINO' },         // fh 97 — arma mais temida
      { tier: 'RAR', traitId: 'SUPERPRODIGIO' },        // 21 anos, 1 Slam e 4 Masters
      { tier: 'COM', traitId: 'BOLA_PESADA' },          // impacto de peso
      { tier: 'COM', traitId: 'SANGUE_QUENTE' },        // volatile development style
      { tier: 'COM', traitId: 'PICO_ADRENALINA' },      // explosividade 96
      { tier: 'NEG', traitId: 'DECISIVO' },             // mentalidade 62 — amadurecendo
    ],
  },

  DALMAU: {
    score: 79,
    slots: [
      { tier: 'RAR', traitId: 'FH_ASSASSINO' },         // talento bruto
      { tier: 'RAR', traitId: 'SUPERPRODIGIO' },        // LENDA jovem
      { tier: 'COM', traitId: 'SANGUE_QUENTE' },        // instável
      { tier: 'NEG', traitId: 'DECISIVO' },             // mentalidade 63
      { tier: 'NEG', traitId: 'MP_SAVER' },             // paralisa em momentos críticos
    ],
  },

  BRENNAN_USA: {
    score: 79,
    slots: [
      { tier: 'RAR', traitId: 'CANHAO_SAQUE' },         // serve 96
      { tier: 'RAR', traitId: 'HARDCOURT_NATIVO' },     // americano, nasceu no hard
      { tier: 'COM', traitId: 'DESTRUIDOR_MORAL' },     // aggressivo
      { tier: 'COM', traitId: 'INQUEBRAVEL' },          // mentalidade 84
      { tier: 'NEG', traitId: 'REI_SAIBRO' },          // detest clay
    ],
  },

  PORTER_USA: {
    score: 79,
    slots: [
      { tier: 'RAR', traitId: 'CANHAO_SAQUE' },         // serve 92
      { tier: 'RAR', traitId: 'HARDCOURT_NATIVO' },     // LENDA americana
      { tier: 'COM', traitId: 'GUERREIRO' },
      { tier: 'COM', traitId: 'AVALANCHE' },            // fecha sets sem parar
      { tier: 'NEG', traitId: 'REI_SAIBRO' },
    ],
  },

  BLACKWOOD_USA: {
    score: 78,
    slots: [
      { tier: 'RAR', traitId: 'CANHAO_SAQUE' },         // serve 88
      { tier: 'RAR', traitId: 'HARDCOURT_NATIVO' },
      { tier: 'COM', traitId: 'PICO_ADRENALINA' },
      { tier: 'NEG', traitId: 'REI_SAIBRO' },
      { tier: 'NEG', traitId: 'DECISIVO' },             // mentalidade 60
    ],
  },

  QIN_HAOTIAN: {
    score: 78,
    slots: [
      { tier: 'RAR', traitId: 'FH_ASSASSINO' },         // fh 78 e crescendo
      { tier: 'RAR', traitId: 'SUPERPRODIGIO' },        // LENDA jovem chinesa
      { tier: 'COM', traitId: 'SANGUE_QUENTE' },
      { tier: 'NEG', traitId: 'DECISIVO' },             // mentalidade 68
      { tier: 'NEG', traitId: 'MP_SAVER' },
    ],
  },

  // ── TIER 2 — ELITE PRINCIPAL (DNA 65–77) ────────────────────────

  VANTORINI: {
    score: 72,
    slots: [
      { tier: 'RAR', traitId: 'REI_SAIBRO' },           // Roland d'Occitane 2023
      { tier: 'COM', traitId: 'FH_ASSASSINO' },         // fh 94, topspin 97
      { tier: 'COM', traitId: 'GUERREIRO' },            // garra italiana
      { tier: 'NEG', traitId: 'MAGO_GRAMA' },          // hard court era fraqueza histórica
    ],
  },

  CHEN_WEI: {
    score: 70,
    slots: [
      { tier: 'RAR', traitId: 'RETRIEVER_ETERNO' },     // the Great Wall
      { tier: 'COM', traitId: 'IRON_LEGS' },            // resistencia 98
      { tier: 'COM', traitId: 'MAQUINA' },              // sem emoção, só devolve
      { tier: 'NEG', traitId: 'EXPLOSAO_INICIAL' },    // começa lento, aquece no rally
    ],
  },

  YAMAMOTO: {
    score: 72,
    slots: [
      { tier: 'RAR', traitId: 'INDOOR_SPEC' },          // 2 Masters consecutivos indoor
      { tier: 'COM', traitId: 'MAGO_GRAMA' },           // GRASS_WIZARD alcunha
      { tier: 'COM', traitId: 'PRECISAO_CIRURGICA' },   // srv1Prec 92
      { tier: 'NEG', traitId: 'REI_SAIBRO' },          // saibro é o antiestilo
    ],
  },

  MBEKI: {
    score: 68,
    slots: [
      { tier: 'RAR', traitId: 'CANHAO_SAQUE' },         // serve 96
      { tier: 'COM', traitId: 'HARDCOURT_NATIVO' },     // Cape Town hard court
      { tier: 'NEG', traitId: 'QUINTO_SET' },          // sem Grand Slam, 5º set colapsa
    ],
  },

  FERRETTI: {
    score: 68,
    slots: [
      { tier: 'RAR', traitId: 'FH_ASSASSINO' },         // fh 91
      { tier: 'COM', traitId: 'SUPERPRODIGIO' },        // 23 anos, Masters campeão
      { tier: 'NEG', traitId: 'TIEBREAK_KILLER' },     // perde regularidade sob pressão
    ],
  },

  OBRECHT: {
    score: 68,
    slots: [
      { tier: 'RAR', traitId: 'BASE_SOLIDA' },          // consistencia 90, paciencia 97
      { tier: 'COM', traitId: 'ATRITO_RALLY' },         // desgaste é sua arma
      { tier: 'NEG', traitId: 'EXPLOSAO_INICIAL' },    // demora para criar ritmo
    ],
  },

  BERGLUND: {
    score: 68,
    slots: [
      { tier: 'RAR', traitId: 'ALL_SURFACE' },          // 2 Masters em surfaces diferentes
      { tier: 'COM', traitId: 'BASE_SOLIDA' },          // consistencia 85
      { tier: 'COM', traitId: 'GUERREIRO' },
    ],
  },

  MONTES_CHI: {
    score: 68,
    slots: [
      { tier: 'RAR', traitId: 'FH_ASSASSINO' },         // fh 92
      { tier: 'COM', traitId: 'REI_SAIBRO' },           // sul-americano de argila
      { tier: 'COM', traitId: 'GUERREIRO' },
      { tier: 'NEG', traitId: 'MAGO_GRAMA' },
    ],
  },

  HERRERA_ARG: {
    score: 68,
    slots: [
      { tier: 'RAR', traitId: 'REI_SAIBRO' },           // argentino, saibro é casa
      { tier: 'COM', traitId: 'BASE_SOLIDA' },          // consistencia 90, mentalidade 88
      { tier: 'COM', traitId: 'GUERREIRO' },
    ],
  },

  PETROV: {
    score: 68,
    slots: [
      { tier: 'RAR', traitId: 'BASE_SOLIDA' },          // consistencia 86, paciencia 90
      { tier: 'COM', traitId: 'ATRITO_RALLY' },
      { tier: 'COM', traitId: 'BH_FERRO' },             // bh 82
    ],
  },

  KONDRASHOV: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'FH_ASSASSINO' },         // fh 88
      { tier: 'COM', traitId: 'HARDCOURT_NATIVO' },
      { tier: 'NEG', traitId: 'REI_SAIBRO' },
    ],
  },

  NZINGA: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'ALL_SURFACE' },          // belga versátil
      { tier: 'COM', traitId: 'GUERREIRO' },
    ],
  },

  MORALES_ESP: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'REI_SAIBRO' },           // espanhol — fh 93, clay blood
      { tier: 'COM', traitId: 'FH_ASSASSINO' },
      { tier: 'NEG', traitId: 'MAGO_GRAMA' },
    ],
  },

  ERIKSSON: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'BASE_SOLIDA' },          // consistencia 86, paciencia 93
      { tier: 'COM', traitId: 'ATRITO_RALLY' },
    ],
  },

  FONTAINE: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'CANHAO_SAQUE' },         // serve 89, SRV_VOL
      { tier: 'COM', traitId: 'INDOOR_SPEC' },
      { tier: 'NEG', traitId: 'REI_SAIBRO' },
    ],
  },

  DIALLO: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'FH_ASSASSINO' },         // fh 88
      { tier: 'COM', traitId: 'HARDCOURT_NATIVO' },
    ],
  },

  MENSAH: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'ALL_SURFACE' },          // ghanês, adaptado
      { tier: 'COM', traitId: 'HARDCOURT_NATIVO' },
    ],
  },

  KAMARA: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'FH_ASSASSINO' },         // fh 82
      { tier: 'COM', traitId: 'HARDCOURT_NATIVO' },
    ],
  },

  HASSAN: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'ALL_SURFACE' },          // egípcio, treinou em múltiplas
      { tier: 'COM', traitId: 'BASE_SOLIDA' },
    ],
  },

  ONYEKACHI: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'CANHAO_SAQUE' },         // serve 88, BIG_SERVER
      { tier: 'COM', traitId: 'HARDCOURT_NATIVO' },
      { tier: 'NEG', traitId: 'REI_SAIBRO' },
    ],
  },

  MORRISON: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'FH_ASSASSINO' },         // fh 88
      { tier: 'COM', traitId: 'HARDCOURT_NATIVO' },
    ],
  },

  DAVIDSON: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'CANHAO_SAQUE' },         // serve 92
      { tier: 'COM', traitId: 'HARDCOURT_NATIVO' },
      { tier: 'NEG', traitId: 'REI_SAIBRO' },
    ],
  },

  THOMSON_AUS: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'CANHAO_SAQUE' },         // serve 90
      { tier: 'COM', traitId: 'HARDCOURT_NATIVO' },
      { tier: 'NEG', traitId: 'REI_SAIBRO' },
    ],
  },

  O_BRIEN: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'INDOOR_SPEC' },          // SRV_VOL indoor
      { tier: 'COM', traitId: 'MAGO_GRAMA' },
      { tier: 'NEG', traitId: 'REI_SAIBRO' },
    ],
  },

  CROFT: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'FH_ASSASSINO' },         // fh 86
      { tier: 'COM', traitId: 'SANGUE_QUENTE' },
      { tier: 'NEG', traitId: 'TIEBREAK_KILLER' },
    ],
  },

  ALVAREZ_COL: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'FH_ASSASSINO' },         // fh 90
      { tier: 'COM', traitId: 'HARDCOURT_NATIVO' },
    ],
  },

  VASQUEZ_MEX: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'FH_ASSASSINO' },         // fh 90
      { tier: 'COM', traitId: 'BOLA_PESADA' },
    ],
  },

  RODRIGUEZ_COL: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'BASE_SOLIDA' },          // consistencia 86, mentalidade 82
      { tier: 'COM', traitId: 'ATRITO_RALLY' },
    ],
  },

  WILSON_USA: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'ALL_SURFACE' },          // all-court USA
      { tier: 'COM', traitId: 'INQUEBRAVEL' },          // mentalidade 78
    ],
  },

  HENDERSON_CAN: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'ALL_SURFACE' },          // canadense versátil
      { tier: 'COM', traitId: 'BASE_SOLIDA' },
    ],
  },

  GOMES_BRA: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'ALL_SURFACE' },
      { tier: 'COM', traitId: 'GUERREIRO' },
    ],
  },

  ZHANG_LEI: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'FH_ASSASSINO' },         // fh 92, topspin 86
      { tier: 'COM', traitId: 'HARDCOURT_NATIVO' },
    ],
  },

  PARK_JUNHO: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'ALL_SURFACE' },          // all-court coreano
      { tier: 'COM', traitId: 'INQUEBRAVEL' },          // mentalidade 80
    ],
  },

  KIMURA: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'INDOOR_SPEC' },          // SRV_VOL, indoor specialist
      { tier: 'COM', traitId: 'MAGO_GRAMA' },
      { tier: 'NEG', traitId: 'REI_SAIBRO' },
    ],
  },

  SHIN_HOJIN: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'FH_ASSASSINO' },         // fh 86
      { tier: 'COM', traitId: 'HARDCOURT_NATIVO' },
    ],
  },

  NAKAMURA_H: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'ALL_SURFACE' },          // all-court Nakamura
      { tier: 'COM', traitId: 'BASE_SOLIDA' },
    ],
  },

  INDO_RAHMAN: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'FH_ASSASSINO' },         // fh 84
      { tier: 'COM', traitId: 'REI_SAIBRO' },           // sul-asiático, clay blood
    ],
  },

  GU_MINGWEI: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'ALL_SURFACE' },          // versátil chinês
      { tier: 'COM', traitId: 'SUPERPRODIGIO' },        // jovem, crescendo
    ],
  },

  WU_TIANLONG: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'INDOOR_SPEC' },          // SRV_VOL, indoor
      { tier: 'COM', traitId: 'CANHAO_SAQUE' },         // serve 82
      { tier: 'NEG', traitId: 'REI_SAIBRO' },
    ],
  },

  KWON_MINSEOK: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'CANHAO_SAQUE' },         // serve 86
      { tier: 'NEG', traitId: 'REI_SAIBRO' },
    ],
  },

  OUEDRAOGO: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'VOLATILIDADE_CALC' },    // TAKEALLRISK
      { tier: 'COM', traitId: 'SANGUE_QUENTE' },
      { tier: 'NEG', traitId: 'DECISIVO' },
    ],
  },

  TSUKAMOTO: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'VOLATILIDADE_CALC' },    // TAKEALLRISK
      { tier: 'COM', traitId: 'SANGUE_QUENTE' },
      { tier: 'NEG', traitId: 'DECISIVO' },
    ],
  },

  MORENO_MEX: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'VOLATILIDADE_CALC' },    // TAKEALLRISK
      { tier: 'COM', traitId: 'SANGUE_QUENTE' },
      { tier: 'NEG', traitId: 'DECISIVO' },
    ],
  },

  VIDAL_CHI: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'RETRIEVER_ETERNO' },     // RETRIEVER, res 86
      { tier: 'COM', traitId: 'IRON_LEGS' },
    ],
  },

  ANASTASIADIS: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'RETRIEVER_ETERNO' },     // RETRIEVER, escola grega
      { tier: 'COM', traitId: 'ATRITO_RALLY' },
    ],
  },

  KOZLOWSKI: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'ALL_SURFACE' },          // versátil polonês
      { tier: 'COM', traitId: 'INQUEBRAVEL' },
    ],
  },

  GUTTMANN: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'ALL_SURFACE' },
      { tier: 'COM', traitId: 'BASE_SOLIDA' },
    ],
  },

  WAGNER: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'ALL_SURFACE' },          // suíço, versatilidade
      { tier: 'COM', traitId: 'BASE_SOLIDA' },          // consistencia 87
    ],
  },

  BAKKE: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'ALL_SURFACE' },          // norueguês versátil
      { tier: 'COM', traitId: 'GUERREIRO' },
    ],
  },

  HENRIKSEN: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'FH_ASSASSINO' },         // fh 86
      { tier: 'COM', traitId: 'SANGUE_QUENTE' },        // ataca desde o primeiro ball
      { tier: 'NEG', traitId: 'TIEBREAK_KILLER' },     // perde consistência na reta final
    ],
  },

  RICHTER: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'CANHAO_SAQUE' },         // serve 96, europeu
      { tier: 'COM', traitId: 'MAGO_GRAMA' },           // grama + indoor
      { tier: 'NEG', traitId: 'REI_SAIBRO' },
    ],
  },

  MENDES_BRA: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'FH_ASSASSINO' },         // fh 84
      { tier: 'COM', traitId: 'REI_SAIBRO' },           // brasileiro, saibro
    ],
  },

  CHEN_USA: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'ALL_SURFACE' },
      { tier: 'COM', traitId: 'BASE_SOLIDA' },
    ],
  },

  JAMES_USA: {
    score: 65,
    slots: [
      { tier: 'COM', traitId: 'FH_ASSASSINO' },         // fh 76
      { tier: 'NEG', traitId: 'DECISIVO' },             // mentalidade 56
      { tier: 'NEG', traitId: 'TIEBREAK_KILLER' },
    ],
  },

  SVENSSON: {
    score: 65,
    slots: [
      { tier: 'RAR', traitId: 'ALL_SURFACE' },
      { tier: 'COM', traitId: 'BASE_SOLIDA' },
    ],
  },

  SAWATARI: {
    score: 65,
    slots: [
      { tier: 'COM', traitId: 'FH_ASSASSINO' },         // fh 78
      { tier: 'NEG', traitId: 'DECISIVO' },             // mentalidade 62
    ],
  },

  HASHIMOTO: {
    score: 65,
    slots: [
      { tier: 'COM', traitId: 'FH_ASSASSINO' },         // fh 72
      { tier: 'NEG', traitId: 'TIEBREAK_KILLER' },
    ],
  },

  KIM_TAEHYUN: {
    score: 65,
    slots: [
      { tier: 'COM', traitId: 'ALL_SURFACE' },
      { tier: 'COM', traitId: 'GUERREIRO' },
    ],
  },

  ISHIDA: {
    score: 65,
    slots: [
      { tier: 'COM', traitId: 'ALL_SURFACE' },
      { tier: 'COM', traitId: 'BASE_SOLIDA' },
    ],
  },

  MARET: {
    score: 65,
    slots: [
      { tier: 'COM', traitId: 'RETRIEVER_ETERNO' },
      { tier: 'COM', traitId: 'BASE_SOLIDA' },
    ],
  },

  REID_NZ: {
    score: 65,
    slots: [
      { tier: 'COM', traitId: 'ALL_SURFACE' },
      { tier: 'COM', traitId: 'GUERREIRO' },
    ],
  },

  LINDSTRÖM: {
    score: 68,
    slots: [
      { tier: 'RAR', traitId: 'SUPERPRODIGIO' },        // 20 anos, já no circuito, explosão
      { tier: 'COM', traitId: 'ALL_SURFACE' },
      { tier: 'NEG', traitId: 'MP_SAVER' },            // jovem, ainda trava em momentos grandes
    ],
  },

  DUBOIS: {
    score: 68,
    slots: [
      { tier: 'RAR', traitId: 'FH_ASSASSINO' },         // fh 88
      { tier: 'COM', traitId: 'SUPERPRODIGIO' },        // 22 anos, ATP 500 aos 21
      { tier: 'NEG', traitId: 'DECISIVO' },
    ],
  },

  // ── TIER 3 — CAMPEAO / VETERANOS (DNA 40–59) ────────────────────

  KASPERK: {
    score: 54,
    slots: [
      { tier: 'COM', traitId: 'RETRIEVER_ETERNO' },     // 10 anos top 20 defendendo
      { tier: 'COM', traitId: 'ATRITO_RALLY' },         // paciencia 96
      { tier: 'NEG', traitId: 'INSTINTO_SLAM' },       // 3 finais de Slam, nunca ganhou
    ],
  },

  VOLKOV: {
    score: 56,
    slots: [
      { tier: 'COM', traitId: 'INDOOR_SPEC' },          // 2 Masters Indoor
      { tier: 'COM', traitId: 'MAGO_GRAMA' },           // SRV_VOL na grama
      { tier: 'NEG', traitId: 'REI_SAIBRO' },
    ],
  },

  CARDENAS: {
    score: 55,
    slots: [
      { tier: 'COM', traitId: 'REI_SAIBRO' },           // 4 Masters no saibro
      { tier: 'COM', traitId: 'LATE_BLOOMER' },         // late bloomer, pico aos 29
      { tier: 'NEG', traitId: 'MAGO_GRAMA' },
    ],
  },

  PETRAKIS: {
    score: 58,
    slots: [
      { tier: 'COM', traitId: 'RETRIEVER_ETERNO' },     // parede grega
      { tier: 'COM', traitId: 'VETERANO_ETERNO' },      // 31 anos, top 15 há 6 anos
      { tier: 'NEG', traitId: 'FH_ASSASSINO' },        // fh 58 — buraco no jogo
    ],
  },

  KOVACS: {
    score: 55,
    slots: [
      { tier: 'COM', traitId: 'MEMORIA_FOTOGRAFICA' },  // lê o adversário antes do jogo
      { tier: 'COM', traitId: 'VETERANO_ETERNO' },      // 33 anos, Finals 2021
      { tier: 'NEG', traitId: 'RECUPERACAO_FISICA' },  // corpo velho, recuperação lenta
    ],
  },

  REINHOLT: {
    score: 52,
    slots: [
      { tier: 'COM', traitId: 'MAQUINA' },              // alemão, zero emoção
      { tier: 'COM', traitId: 'VETERANO_ETERNO' },      // 32 anos, mentor
      { tier: 'NEG', traitId: 'CANHAO_SAQUE' },        // serve 70 — ponto fraco no saque
    ],
  },

  SOUZA: {
    score: 88,
    slots: [
      { tier: 'LEN', traitId: 'SUPERPRODIGIO' },       // fenômeno geracional — +32% antes dos 21
      { tier: 'RAR', traitId: 'DIAMANTE_BRUTO' },      // talento bruto ainda lapidando
      { tier: 'COM', traitId: 'SANGUE_QUENTE' },        // emocional, instintivo
      { tier: 'COM', traitId: 'FH_ASSASSINO' },         // forehand 96, arma principal
    ],
  },

  DELACROIX: {
    score: 70,
    slots: [
      { tier: 'RAR', traitId: 'VOLATILIDADE_CALC' },    // genial e imprevisível
      { tier: 'COM', traitId: 'SANGUE_QUENTE' },        // caótico, emocional
      { tier: 'COM', traitId: 'PICO_ADRENALINA' },      // explosão no início
      { tier: 'NEG', traitId: 'INERCIAL' },            // quando cai, cai fundo
    ],
  },

  MARCHETTI: {
    score: 55,
    slots: [
      { tier: 'COM', traitId: 'MEMORIA_FOTOGRAFICA' },  // xadrez → leitura de jogo
      { tier: 'COM', traitId: 'ALL_SURFACE' },
    ],
  },

  PAPADIMITRIOU: {
    score: 52,
    slots: [
      { tier: 'COM', traitId: 'RETRIEVER_ETERNO' },     // discípulo de Petrakis
      { tier: 'COM', traitId: 'ATRITO_RALLY' },         // paciencia 92
    ],
  },

  CASTILLO_MARCOS: {
    score: 52,
    slots: [
      { tier: 'COM', traitId: 'REI_SAIBRO' },           // 4 Masters de saibro, espanhol
      { tier: 'COM', traitId: 'ESPECIALISTA_KO' },      // bom nas eliminatórias
      { tier: 'NEG', traitId: 'INSTINTO_SLAM' },       // 4 semis de Roland, zero títulos
    ],
  },

  SAUVAGE: {
    score: 50,
    slots: [
      { tier: 'COM', traitId: 'VOLATILIDADE_CALC' },    // TAKEALLRISK
      { tier: 'NEG', traitId: 'DECISIVO' },             // mentalidade 57
    ],
  },

  MOREAU: {
    score: 52,
    slots: [
      { tier: 'COM', traitId: 'RETRIEVER_ETERNO' },     // paciencia 94
      { tier: 'COM', traitId: 'ATRITO_RALLY' },
    ],
  },

  HAAKONSEN: {
    score: 52,
    slots: [
      { tier: 'COM', traitId: 'CANHAO_SAQUE' },         // serve 94
      { tier: 'NEG', traitId: 'REI_SAIBRO' },
    ],
  },

  RODRIGUES_P: {
    score: 52,
    slots: [
      { tier: 'COM', traitId: 'ATRITO_RALLY' },
      { tier: 'COM', traitId: 'RETRIEVER_ETERNO' },     // paciencia 89
    ],
  },

  BIANCHI: {
    score: 50,
    slots: [
      { tier: 'COM', traitId: 'VOLATILIDADE_CALC' },    // TAKEALLRISK italiano
      { tier: 'NEG', traitId: 'TIEBREAK_KILLER' },
    ],
  },

  LECHNER: {
    score: 52,
    slots: [
      { tier: 'COM', traitId: 'INDOOR_SPEC' },          // SRV_VOL austríaco
      { tier: 'COM', traitId: 'MAGO_GRAMA' },
      { tier: 'NEG', traitId: 'REI_SAIBRO' },
    ],
  },

  VANDENBERGHE: {
    score: 52,
    slots: [
      { tier: 'COM', traitId: 'RETRIEVER_ETERNO' },     // paciencia 86
      { tier: 'COM', traitId: 'ATRITO_RALLY' },
    ],
  },

  TESCHNER: {
    score: 52,
    slots: [
      { tier: 'COM', traitId: 'BASE_SOLIDA' },          // paciencia 87, consistente
      { tier: 'COM', traitId: 'ATRITO_RALLY' },
    ],
  },

  BLANCHARD: {
    score: 50,
    slots: [
      { tier: 'COM', traitId: 'VOLATILIDADE_CALC' },    // TAKEALLRISK
      { tier: 'COM', traitId: 'SANGUE_QUENTE' },
      { tier: 'NEG', traitId: 'DECISIVO' },
    ],
  },

  CASTELLANO: {
    score: 52,
    slots: [
      { tier: 'COM', traitId: 'BASE_SOLIDA' },          // paciencia 88, espanhol
      { tier: 'COM', traitId: 'REI_SAIBRO' },
    ],
  },

  WEBER_HANS: {
    score: 50,
    slots: [
      { tier: 'COM', traitId: 'ALL_SURFACE' },          // suíço, versátil
      { tier: 'COM', traitId: 'BASE_SOLIDA' },
    ],
  },

  AL_RASHID: {
    score: 52,
    slots: [
      { tier: 'COM', traitId: 'CANHAO_SAQUE' },         // serve 90
      { tier: 'NEG', traitId: 'REI_SAIBRO' },
    ],
  },

  TRAORE: {
    score: 52,
    slots: [
      { tier: 'COM', traitId: 'RETRIEVER_ETERNO' },     // paciencia 90
      { tier: 'COM', traitId: 'ATRITO_RALLY' },
    ],
  },

  NKOSI: {
    score: 52,
    slots: [
      { tier: 'COM', traitId: 'BASE_SOLIDA' },          // paciencia 86, RSA
      { tier: 'COM', traitId: 'ATRITO_RALLY' },
    ],
  },

  ABDI: {
    score: 52,
    slots: [
      { tier: 'COM', traitId: 'RETRIEVER_ETERNO' },     // paciencia 88
      { tier: 'COM', traitId: 'IRON_LEGS' },            // resistencia 88
    ],
  },

  BEN_SAAD: {
    score: 52,
    slots: [
      { tier: 'COM', traitId: 'FH_ASSASSINO' },         // fh 84
      { tier: 'COM', traitId: 'REI_SAIBRO' },
      { tier: 'NEG', traitId: 'MAGO_GRAMA' },
    ],
  },

  IBRAHIM_MAR: {
    score: 52,
    slots: [
      { tier: 'COM', traitId: 'REI_SAIBRO' },           // marroquino, saibro
      { tier: 'COM', traitId: 'BASE_SOLIDA' },
    ],
  },

  FLETCHER: {
    score: 52,
    slots: [
      { tier: 'COM', traitId: 'BASE_SOLIDA' },          // CTR_PUNCHER australiano
      { tier: 'COM', traitId: 'ATRITO_RALLY' },
    ],
  },

  NGUYEN_AUS: {
    score: 65,
    slots: [
      { tier: 'COM', traitId: 'ALL_SURFACE' },
      { tier: 'COM', traitId: 'BASE_SOLIDA' },
    ],
  },

  HARRIS_NZ: {
    score: 52,
    slots: [
      { tier: 'COM', traitId: 'BASE_SOLIDA' },          // CTR_PUNCHER, paciencia 82
      { tier: 'COM', traitId: 'ATRITO_RALLY' },
    ],
  },

  SMITH_AUS: {
    score: 52,
    slots: [
      { tier: 'COM', traitId: 'RETRIEVER_ETERNO' },     // RETRIEVER, resistencia 94
      { tier: 'COM', traitId: 'IRON_LEGS' },
    ],
  },

  BAKER_AUS: {
    score: 52,
    slots: [
      { tier: 'COM', traitId: 'ALL_SURFACE' },          // ALL_COURT australiano
      { tier: 'COM', traitId: 'BASE_SOLIDA' },
    ],
  },

  PRICE_AUS: {
    score: 52,
    slots: [
      { tier: 'COM', traitId: 'BASE_SOLIDA' },          // CTR_PUNCHER
      { tier: 'COM', traitId: 'RETRIEVER_ETERNO' },
    ],
  },

  FERNANDEZ_ARG: {
    score: 50,
    slots: [
      { tier: 'COM', traitId: 'VOLATILIDADE_CALC' },    // TAKEALLRISK
      { tier: 'COM', traitId: 'SANGUE_QUENTE' },
      { tier: 'NEG', traitId: 'DECISIVO' },
    ],
  },

  SANTOS_BRA: {
    score: 52,
    slots: [
      { tier: 'COM', traitId: 'RETRIEVER_ETERNO' },     // RETRIEVER, resistencia 90
      { tier: 'COM', traitId: 'IRON_LEGS' },
    ],
  },

  REYES_MEX: {
    score: 52,
    slots: [
      { tier: 'COM', traitId: 'FH_ASSASSINO' },         // fh 84
      { tier: 'COM', traitId: 'REI_SAIBRO' },
    ],
  },

  WEBB_USA: {
    score: 52,
    slots: [
      { tier: 'COM', traitId: 'CANHAO_SAQUE' },         // serve 88
      { tier: 'NEG', traitId: 'REI_SAIBRO' },
    ],
  },

  OLIVEIRA_BRA: {
    score: 52,
    slots: [
      { tier: 'COM', traitId: 'INDOOR_SPEC' },          // SRV_VOL brasileiro
      { tier: 'NEG', traitId: 'REI_SAIBRO' },
    ],
  },

  FUENTES_CHI: {
    score: 52,
    slots: [
      { tier: 'COM', traitId: 'FH_ASSASSINO' },         // fh 82
      { tier: 'COM', traitId: 'REI_SAIBRO' },
      { tier: 'NEG', traitId: 'MAGO_GRAMA' },
    ],
  },

  ROJAS_COL: {
    score: 52,
    slots: [
      { tier: 'COM', traitId: 'BASE_SOLIDA' },          // CTR_PUNCHER, paciencia 84
      { tier: 'COM', traitId: 'RETRIEVER_ETERNO' },
    ],
  },

  TORRES_ARG: {
    score: 52,
    slots: [
      { tier: 'COM', traitId: 'BASE_SOLIDA' },          // CTR_PUNCHER, paciencia 86
      { tier: 'COM', traitId: 'ATRITO_RALLY' },
    ],
  },

  MIRANDA_BRA: {
    score: 52,
    slots: [
      { tier: 'COM', traitId: 'INDOOR_SPEC' },          // SRV_VOL
      { tier: 'NEG', traitId: 'REI_SAIBRO' },
    ],
  },

  SANTOS_PER: {
    score: 52,
    slots: [
      { tier: 'COM', traitId: 'RETRIEVER_ETERNO' },     // RETRIEVER, paciencia 82
      { tier: 'COM', traitId: 'ATRITO_RALLY' },
    ],
  },

  BARROS_LUCAS: {
    score: 52,
    slots: [
      { tier: 'COM', traitId: 'FH_ASSASSINO' },         // fh 87
      { tier: 'NEG', traitId: 'MP_SAVER' },
    ],
  },

  LI_WEN: {
    score: 52,
    slots: [
      { tier: 'COM', traitId: 'RETRIEVER_ETERNO' },     // paciencia 92, consistencia 90
      { tier: 'COM', traitId: 'ATRITO_RALLY' },
    ],
  },

  HONDA: {
    score: 52,
    slots: [
      { tier: 'COM', traitId: 'BASE_SOLIDA' },          // paciencia 88
      { tier: 'COM', traitId: 'ATRITO_RALLY' },
    ],
  },

  TANAKA: {
    score: 52,
    slots: [
      { tier: 'COM', traitId: 'CANHAO_SAQUE' },         // serve 90
      { tier: 'NEG', traitId: 'REI_SAIBRO' },
    ],
  },

  BAEK_JISOO: {
    score: 52,
    slots: [
      { tier: 'COM', traitId: 'RETRIEVER_ETERNO' },     // RETRIEVER, paciencia 90
      { tier: 'COM', traitId: 'IRON_LEGS' },
    ],
  },

  LEE_SANGHOON: {
    score: 50,
    slots: [
      { tier: 'COM', traitId: 'ALL_SURFACE' },
      { tier: 'COM', traitId: 'BASE_SOLIDA' },
    ],
  },

  WANG_CHEN: {
    score: 50,
    slots: [
      { tier: 'COM', traitId: 'BASE_SOLIDA' },          // consistencia 80, paciencia 76
      { tier: 'COM', traitId: 'MAQUINA' },              // mentalidade 80
    ],
  },

  MATSUDA: {
    score: 50,
    slots: [
      { tier: 'COM', traitId: 'BASE_SOLIDA' },          // paciencia 82
      { tier: 'COM', traitId: 'ATRITO_RALLY' },
    ],
  },

  SEO_DONGHUN: {
    score: 50,
    slots: [
      { tier: 'COM', traitId: 'RETRIEVER_ETERNO' },     // RETRIEVER, paciencia 84
      { tier: 'COM', traitId: 'IRON_LEGS' },
    ],
  },

  NGUYEN_MINH: {
    score: 50,
    slots: [
      { tier: 'COM', traitId: 'RETRIEVER_ETERNO' },     // RETRIEVER, paciencia 84
      { tier: 'COM', traitId: 'ATRITO_RALLY' },
    ],
  },

  SUZUKI: {
    score: 50,
    slots: [
      { tier: 'COM', traitId: 'BASE_SOLIDA' },          // CTR_PUNCHER, paciencia 84
      { tier: 'COM', traitId: 'ATRITO_RALLY' },
    ],
  },

  // ── TIER 4 — COMUM (DNA 30–39) ──────────────────────────────────

  SCHREIBER: {
    score: 38,
    slots: [
      { tier: 'COM', traitId: 'RETRIEVER_ETERNO' },     // RETRIEVER
      { tier: 'NEG', traitId: 'EXPLOSAO_INICIAL' },    // começa lento
      { tier: 'NEG', traitId: 'TIEBREAK_KILLER' },     // trava no decisivo
    ],
  },

};

// ═══════════════════════════════════════════════════════════════════
// BUILDER — adiciona sombras automaticamente baseado nos slots NEG
// ═══════════════════════════════════════════════════════════════════

function buildSombras(slots) {
  const sombras = [];
  for (const slot of slots) {
    if (slot.tier !== 'NEG') continue;
    const def = TRAIT_CATALOG[slot.traitId];
    if (!def?.sombra) continue;
    sombras.push({
      traitId:   slot.traitId,
      progress:  0,
      target:    def.sombra.target,
      metric:    def.sombra.metric,
      challenge: def.sombra.challenge,
      resolved:  false,
    });
  }
  return sombras;
}

// ═══════════════════════════════════════════════════════════════════
// getDnaTier — string do tier baseado no score
// ═══════════════════════════════════════════════════════════════════

function getDnaTier(score) {
  if (score >= 100) return 'GERACIONAL';
  if (score >= 90)  return 'EXCEPCIONAL';
  if (score >= 75)  return 'ALTO';
  if (score >= 60)  return 'BOM';
  if (score >= 40)  return 'NORMAL';
  return 'FRACO';
}

// ═══════════════════════════════════════════════════════════════════
// applyPlayerTraits — injeta dna em todos os NAMED_PLAYERS
// ═══════════════════════════════════════════════════════════════════

/**
 * Aplica os traits manuais a todos os jogadores nomeados.
 * Deve ser chamado uma vez após a importação de NAMED_PLAYERS.
 *
 * @param {object} namedPlayers — objeto NAMED_PLAYERS do players.js
 */
export function applyPlayerTraits(namedPlayers) {
  for (const [key, rawDna] of Object.entries(RAW_DNA)) {
    const player = namedPlayers[key];
    if (!player) continue;
    if (player.dna) continue; // já inicializado, não sobrescreve

    player.dna = {
      score:      rawDna.score,
      tier:       getDnaTier(rawDna.score),
      slots:      rawDna.slots.map(slot => ({
        ...slot,
        origin: slot.tier === 'NEG' ? 'scar' : 'dna',
      })),
      milestones: [],
      sombras:    buildSombras(rawDna.slots),
      metrics:    {},
      history:    [{ type: 'MANUAL_SEED', total: rawDna.slots.length }],
      tags:       [],
    };
    sanitizeTraitSlots(player);
  }

  // Jogadores sem entry no RAW_DNA recebem DNA genérico por potential
  for (const player of Object.values(namedPlayers)) {
    if (player.dna) continue;
    const fallbackScore = {
      GERACIONAL:      92,
      LENDA:           80,
      ELITE:           67,
      CAMPEAO:         52,
      COMUM:           38,
      ABAIXO_DA_MEDIA: 22,
    }[player.potential ?? 'COMUM'] ?? 40;

    player.dna = {
      score:      fallbackScore,
      tier:       getDnaTier(fallbackScore),
      slots:      [],
      milestones: [],
      sombras:    [],
      metrics:    {},
      history:    [],
      tags:       [],
    };
  }
}

/**
 * Retorna o dna de um jogador específico pelo key (para debug/preview).
 */
export function getRawDNA(key) {
  return RAW_DNA[key] ?? null;
}

/**
 * Lista todos os players que têm traits manuais atribuídos.
 */
export const PLAYERS_WITH_MANUAL_TRAITS = Object.keys(RAW_DNA);

