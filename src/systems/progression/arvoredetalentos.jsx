import React, { useMemo, useState } from 'react';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const SURFACE_ORDER = ['HARD', 'CLAY', 'GRASS', 'INDOOR'];
const BODY_ORDER = ['PHYSIQUE', 'TENACITY'];
const MIND_ORDER = ['PRESSURE', 'TACTICAL'];
const TECHNIQUE_ORDER = ['SERVICE', 'NET', 'FOREHAND', 'BACKHAND'];
const SHOTS_ORDER = ['TOPSPIN', 'SLICE', 'DRIVE', 'ACCEL', 'DROPSHOT'];

const SURFACE_THEMES = {
  HARD:   { color: '#4E9BFF', glow: '78,155,255', bg: 'linear-gradient(135deg, rgba(78,155,255,.18), rgba(7,16,30,.92))', accent: '#BFE0FF', label: 'Hard', kicker: 'ritmo e execucao limpa' },
  CLAY:   { color: '#D96A35', glow: '217,106,53', bg: 'linear-gradient(135deg, rgba(217,106,53,.18), rgba(28,12,8,.92))', accent: '#FFD8C8', label: 'Clay', kicker: 'peso, paciencia e quique' },
  GRASS:  { color: '#4FBF72', glow: '79,191,114', bg: 'linear-gradient(135deg, rgba(79,191,114,.18), rgba(8,23,12,.92))', accent: '#DDFBE4', label: 'Grass', kicker: 'bola baixa e tempo curto' },
  INDOOR: { color: '#9D7CFF', glow: '157,124,255', bg: 'linear-gradient(135deg, rgba(157,124,255,.18), rgba(14,10,30,.92))', accent: '#E6DEFF', label: 'Indoor', kicker: 'arena controlada e precisao' },
};

const BODY_THEMES = {
  PHYSIQUE: { color: '#FFB457', glow: '255,180,87', bg: 'linear-gradient(135deg, rgba(255,180,87,.18), rgba(34,18,7,.92))', accent: '#FFE4BA', label: 'Fisico', kicker: 'durabilidade, recuperacao e longevidade' },
  TENACITY: { color: '#FF6F91', glow: '255,111,145', bg: 'linear-gradient(135deg, rgba(255,111,145,.18), rgba(34,8,18,.92))', accent: '#FFD6E0', label: 'Tenacidade', kicker: 'velocidade, defesa e sobrevivencia atletica' },
};

const MIND_THEMES = {
  PRESSURE: { color: '#7FD5FF', glow: '127,213,255', bg: 'linear-gradient(135deg, rgba(127,213,255,.18), rgba(8,18,26,.92))', accent: '#DDF6FF', label: 'Pressao', kicker: 'clutch, sangue frio e pontos grandes' },
  TACTICAL: { color: '#B7FF7A', glow: '183,255,122', bg: 'linear-gradient(135deg, rgba(183,255,122,.18), rgba(14,24,8,.92))', accent: '#ECFFD7', label: 'Tatica', kicker: 'leitura, plano e adaptacao de jogo' },
};

const TECHNIQUE_THEMES = {
  SERVICE: { color: '#6DE1B5', glow: '109,225,181', bg: 'linear-gradient(135deg, rgba(109,225,181,.18), rgba(8,22,18,.92))', accent: '#DFFFF4', label: 'Saque', kicker: 'forca, precisao e quique de servico' },
  NET: { color: '#FFD166', glow: '255,209,102', bg: 'linear-gradient(135deg, rgba(255,209,102,.18), rgba(28,20,8,.92))', accent: '#FFF0C4', label: 'Rede', kicker: 'presenca, volley e smash' },
  FOREHAND: { color: '#FF8A5B', glow: '255,138,91', bg: 'linear-gradient(135deg, rgba(255,138,91,.18), rgba(30,12,8,.92))', accent: '#FFE1D5', label: 'Forehand', kicker: 'arma, peso e imposicao de direita' },
  BACKHAND: { color: '#8CA6FF', glow: '140,166,255', bg: 'linear-gradient(135deg, rgba(140,166,255,.18), rgba(12,14,28,.92))', accent: '#E2E8FF', label: 'Backhand', kicker: 'coluna, firmeza e linha de esquerda' },
};

const SHOTS_THEMES = {
  TOPSPIN: { color: '#FF9257', glow: '255,146,87', bg: 'linear-gradient(135deg, rgba(255,146,87,.18), rgba(32,14,8,.92))', accent: '#FFE2D2', label: 'Topspin', kicker: 'giro, altura e sufoco' },
  SLICE: { color: '#8EE0FF', glow: '142,224,255', bg: 'linear-gradient(135deg, rgba(142,224,255,.18), rgba(8,22,32,.92))', accent: '#DDF7FF', label: 'Slice', kicker: 'veneno, quique morto e corte' },
  DRIVE: { color: '#FFC766', glow: '255,199,102', bg: 'linear-gradient(135deg, rgba(255,199,102,.18), rgba(30,22,8,.92))', accent: '#FFF0C8', label: 'Drive', kicker: 'reta limpa e penetracao' },
  ACCEL: { color: '#FF6B6B', glow: '255,107,107', bg: 'linear-gradient(135deg, rgba(255,107,107,.18), rgba(30,10,10,.92))', accent: '#FFDADA', label: 'Accel', kicker: 'ruptura, explosao e finalizacao' },
  DROPSHOT: { color: '#B4FF9A', glow: '180,255,154', bg: 'linear-gradient(135deg, rgba(180,255,154,.18), rgba(14,28,8,.92))', accent: '#EBFFD9', label: 'Dropshot', kicker: 'toque, disfarce e curta cruel' },
};

const FAMILY_THEMES = {
  surface: { color: '#4E9BFF', bg: 'linear-gradient(135deg, rgba(78,155,255,.16), rgba(12,18,30,.92))' },
  body: { color: '#FFB457', bg: 'linear-gradient(135deg, rgba(255,180,87,.16), rgba(30,18,10,.92))' },
  mind: { color: '#7FD5FF', bg: 'linear-gradient(135deg, rgba(127,213,255,.16), rgba(10,18,24,.92))' },
  technique: { color: '#6DE1B5', bg: 'linear-gradient(135deg, rgba(109,225,181,.16), rgba(10,22,18,.92))' },
  shots: { color: '#FF9257', bg: 'linear-gradient(135deg, rgba(255,146,87,.16), rgba(26,14,10,.92))' },
};

const FUTURE_FAMILIES = [
  { id: 'surface', label: 'Superficies', status: 'ativo', desc: 'Primeira familia viva da arvore, ja integrada ao motor de jogo.' },
  { id: 'body', label: 'Corpo', status: 'ativo', desc: 'Fisico e Tenacidade vivos, afetando desgaste, lesao, defesa e sustentacao.' },
  { id: 'mind', label: 'Mente', status: 'ativo', desc: 'Pressao e Tatica vivos, afetando clutch, leitura e adaptacao.' },
  { id: 'technique', label: 'Tecnica', status: 'ativo', desc: 'Saque, Rede, Forehand e Backhand vivos como fundamentos de execucao.' },
  { id: 'shots', label: 'Shots', status: 'ativo', desc: 'Topspin, Slice, Drive, Accel e Dropshot vivos como linguagem e repertorio de bola.' },
];

const TOTAL_TALENT_POINTS = 70;
const TALENT_BUILD_VERSION = 1;
export const TALENT_TREES_PAUSED = true;

const BASE_EFFECTS = {
  level: 0,
  attrFlat: {},
  allAttrFlat: 0,
  attrMult: 1,
  attrMultMap: {},
  qualityMult: 1,
  qualityFlat: 0,
  buildPressureMult: 1,
  buildPressureFlat: 0,
  incomingPacePenaltyMult: 1,
  incomingPaceReliefFlat: 0,
  aggressivePlacementPenaltyMult: 1,
  aggressivePlacementReliefFlat: 0,
  longRallyQualityMult: 1,
  longRallyQualityFlat: 0,
  defensivePenaltyMult: 1,
  defensivePenaltyReliefFlat: 0,
  defensiveQualityMult: 1,
  defensiveQualityFlat: 0,
  topspinHeavyMult: 1,
  topspinHeavyFlat: 0,
  extendedRallyClampBonus: 0,
  firstStrikeQualityMult: 1,
  firstStrikeQualityFlat: 0,
  lowBallPenaltyMult: 1,
  lowBallReliefFlat: 0,
  shortRallyQualityMult: 1,
  shortRallyQualityFlat: 0,
  instantPressureMult: 1,
  instantPressureFlat: 0,
  pressurePointQualityMult: 1,
  pressurePointQualityFlat: 0,
  carryPressurePenaltyMult: 1,
  carryPressureReliefFlat: 0,
  crowdPressureMult: 1,
  crowdPressureReliefFlat: 0,
  tacticalReadMult: 1,
  tacticalReadFlat: 0,
  passingQualityMult: 1,
  passingQualityFlat: 0,
  serveQualityMult: 1,
  serveQualityFlat: 0,
  secondServeQualityMult: 1,
  secondServeQualityFlat: 0,
  volleyQualityMult: 1,
  volleyQualityFlat: 0,
  smashQualityMult: 1,
  smashQualityFlat: 0,
  forehandQualityMult: 1,
  forehandQualityFlat: 0,
  backhandQualityMult: 1,
  backhandQualityFlat: 0,
  injuryChanceMult: 1,
  injuryChanceFlat: 0,
  injuryRecoveryMult: 1,
  injuryRecoveryFlat: 0,
  comebackWindowMult: 1,
  comebackWindowFlat: 0,
  physicalDecayMult: 1,
  physicalDecayFlat: 0,
  physicalRecoveryMult: 1,
  physicalRecoveryFlat: 0,
  agePhysicalDeclineMult: 1,
  agePhysicalDeclineFlat: 0,
  staminaDrainMult: 1,
  staminaDrainFlat: 0,
  lowStaminaPenaltyMult: 1,
  lowStaminaPenaltyReliefFlat: 0,
  lateContactPenaltyMult: 1,
  lateContactReliefFlat: 0,
  shotPoolFlat: {},
  shotQualityFlatMap: {},
  shotSpinFlatMap: {},
  shotPowerFlatMap: {},
  shotBounceFlatMap: {},
  shotCritChanceFlatMap: {},
  shotCritQualityFlatMap: {},
};

function getPausedTalentEffects(meta = {}) {
  return {
    ...BASE_EFFECTS,
    attrFlat: {},
    attrMultMap: {},
    shotPoolFlat: {},
    shotQualityFlatMap: {},
    shotSpinFlatMap: {},
    shotPowerFlatMap: {},
    shotBounceFlatMap: {},
    shotCritChanceFlatMap: {},
    shotCritQualityFlatMap: {},
    ...meta,
  };
}

export const TALENT_TREES = {
  surface: {
    id: 'surface',
    label: 'Superficies',
    trees: {
      HARD: {
        id: 'HARD',
        label: 'Hard',
        kicker: 'ritmo e execucao limpa',
        levels: [
          { level: 1, name: 'Base de Ritmo', mechanic: '+5 em Regularidade jogando em hard.', effects: { attrFlat: { regularidade: 5 } } },
          { level: 2, name: 'Cabeca de Piso Rapido', mechanic: '+5 em Mentalidade jogando em hard.', effects: { attrFlat: { mentalidade: 5 } } },
          { level: 3, name: 'Execucao Limpa', mechanic: '+3 na qualidade final de todas as batidas em hard.', effects: { qualityFlat: 3 } },
          { level: 4, name: 'Leitura de Linha', mechanic: '+8 em Leitura jogando em hard.', effects: { attrFlat: { leitura: 8 } } },
          { level: 5, name: 'Talento: Especialista de Hard', mechanic: '+8 em todos os atributos jogando em hard.', effects: { allAttrFlat: 8 } },
          { level: 6, name: 'Troca Reta', mechanic: '+4 na execucao de pressao e construcao quando o rally entra em cadencia limpa no hard.', effects: { buildPressureFlat: 4 } },
          { level: 7, name: 'Absorcao de Pace', mechanic: '-8 na penalidade ao responder bolas rapidas em hard.', effects: { incomingPaceReliefFlat: 8 } },
          { level: 8, name: 'Controle de Linha', mechanic: '-8 na degradacao em bolas agressivas jogadas no limite no hard.', effects: { aggressivePlacementReliefFlat: 8 } },
          { level: 9, name: 'Dominio de Ritmo', mechanic: '+4 de qualidade em rallys medios e limpos no hard.', effects: { longRallyQualityFlat: 4 } },
          { level: 10, name: 'Talento Lendario: Imperador do Hard', mechanic: '+15% em todos os atributos jogando em hard.', effects: { attrMult: 1.15 } },
        ],
      },
      CLAY: {
        id: 'CLAY',
        label: 'Clay',
        kicker: 'paciencia, spin e sufoco',
        levels: [
          { level: 1, name: 'Fundacao de Saibro', mechanic: '+5 em Regularidade jogando em clay.', effects: { attrFlat: { regularidade: 5 } } },
          { level: 2, name: 'Pulmao de Troca', mechanic: '+5 em Resistencia jogando em clay.', effects: { attrFlat: { resistencia: 5 } } },
          { level: 3, name: 'Altura de Seguranca', mechanic: '+3 de qualidade em topspin, defesa e bolas de controle no clay.', effects: { topspinHeavyFlat: 3, defensiveQualityFlat: 3 } },
          { level: 4, name: 'Leitura de Quique', mechanic: '+8 em Leitura jogando em clay.', effects: { attrFlat: { leitura: 8 } } },
          { level: 5, name: 'Talento: Especialista de Clay', mechanic: '+8 em todos os atributos jogando em clay.', effects: { allAttrFlat: 8 } },
          { level: 6, name: 'Paciencia Tatica', mechanic: '+5 de qualidade em rallys longos no clay.', effects: { longRallyQualityFlat: 5 } },
          { level: 7, name: 'Defesa Elastica', mechanic: '-8 na penalidade em situacoes defensivas no clay.', effects: { defensivePenaltyReliefFlat: 8 } },
          { level: 8, name: 'Peso de Topspin', mechanic: '+6 de qualidade em trocas de spin alto e bola profunda no clay.', effects: { topspinHeavyFlat: 6 } },
          { level: 9, name: 'Sufoco de Fundo', mechanic: '+5 de qualidade quando o ponto passa de 6 trocas no clay.', effects: { extendedRallyClampBonus: 0.05, longRallyQualityFlat: 5 } },
          { level: 10, name: 'Talento Lendario: Rei do Barro', mechanic: '+15% em todos os atributos jogando em clay.', effects: { attrMult: 1.15 } },
        ],
      },
      GRASS: {
        id: 'GRASS',
        label: 'Grass',
        kicker: 'bola baixa, ataque e transicao',
        levels: [
          { level: 1, name: 'Primeiro Passo Verde', mechanic: '+5 em Leitura jogando em grass.', effects: { attrFlat: { leitura: 5 } } },
          { level: 2, name: 'Confianca de Ataque', mechanic: '+5 em Mentalidade jogando em grass.', effects: { attrFlat: { mentalidade: 5 } } },
          { level: 3, name: 'Contato Curto', mechanic: '+3 de qualidade em saque, devolucao agressiva, slice e primeira aceleracao na grama.', effects: { firstStrikeQualityFlat: 3 } },
          { level: 4, name: 'Reflexo de Piso Vivo', mechanic: '+8 em Explosividade jogando em grass.', effects: { attrFlat: { explosividade: 8 } } },
          { level: 5, name: 'Talento: Especialista de Grass', mechanic: '+8 em todos os atributos jogando em grass.', effects: { allAttrFlat: 8 } },
          { level: 6, name: 'Primeira Bola Mortal', mechanic: '+5 na qualidade da primeira troca apos saque ou devolucao na grama.', effects: { firstStrikeQualityFlat: 5 } },
          { level: 7, name: 'Leitura de Bola Baixa', mechanic: '-10 na penalidade em contatos baixos na grass.', effects: { lowBallReliefFlat: 10 } },
          { level: 8, name: 'Transicao Curta', mechanic: '+6 de qualidade quando o ponto encurta cedo na grass.', effects: { shortRallyQualityFlat: 6 } },
          { level: 9, name: 'Pressao Instantanea', mechanic: '+5 de qualidade em pontos de ate 4 trocas na grass.', effects: { instantPressureFlat: 5 } },
          { level: 10, name: 'Talento Lendario: Soberano da Grass', mechanic: '+15% em todos os atributos jogando em grass.', effects: { attrMult: 1.15 } },
        ],
      },
      INDOOR: {
        id: 'INDOOR',
        label: 'Indoor',
        kicker: 'controle, arena e precisao',
        levels: [
          { level: 1, name: 'Conforto de Arena', mechanic: '+5 em Mentalidade jogando em indoor.', effects: { attrFlat: { mentalidade: 5 } } },
          { level: 2, name: 'Precisao de Salao', mechanic: '+5 em Regularidade jogando em indoor.', effects: { attrFlat: { regularidade: 5 } } },
          { level: 3, name: 'Execucao Cirurgica', mechanic: '+3 de qualidade em saque, devolucao agressiva e aceleracoes em indoor.', effects: { qualityFlat: 3 } },
          { level: 4, name: 'Leitura de Ambiente Controlado', mechanic: '+8 em Leitura jogando em indoor.', effects: { attrFlat: { leitura: 8 } } },
          { level: 5, name: 'Talento: Especialista de Indoor', mechanic: '+8 em todos os atributos jogando em indoor.', effects: { allAttrFlat: 8 } },
          { level: 6, name: 'Primeiro Golpe Limpo', mechanic: '+5 de qualidade na sequencia saque + primeira bola ou devolucao + primeira pressao em indoor.', effects: { firstStrikeQualityFlat: 5 } },
          { level: 7, name: 'Tempo Tomado', mechanic: '+4 de qualidade quando encurta o ponto em indoor.', effects: { shortRallyQualityFlat: 4 } },
          { level: 8, name: 'Controle de Linha Indoor', mechanic: '-8 na degradacao em bolas agressivas no limite jogadas em indoor.', effects: { aggressivePlacementReliefFlat: 8 } },
          { level: 9, name: 'Dominio de Arena', mechanic: '+6 de qualidade em pontos de pressao e tie-breaks no indoor.', effects: { pressurePointQualityFlat: 6 } },
          { level: 10, name: 'Talento Lendario: Rei do Indoor', mechanic: '+15% em todos os atributos jogando em indoor.', effects: { attrMult: 1.15 } },
        ],
      },
    },
  },
  body: {
    id: 'body',
    label: 'Corpo',
    trees: {
      PHYSIQUE: {
        id: 'PHYSIQUE',
        label: 'Fisico',
        kicker: 'durabilidade, recuperacao e longevidade',
        levels: [
          { level: 1, name: 'Blindagem Inicial', mechanic: '-3 na chance geral de lesao.', effects: { injuryChanceFlat: 3 } },
          { level: 2, name: 'Base Aerobica', mechanic: '+3 em Resistencia.', effects: { attrFlat: { resistencia: 3 } } },
          { level: 3, name: 'Pulmao Extra', mechanic: '+5 em Resistencia base.', effects: { attrFlat: { resistencia: 5 } } },
          { level: 4, name: 'Recuperacao Acelerada', mechanic: '+5 na recuperacao de lesoes e retorno fisico.', effects: { injuryRecoveryFlat: 5, physicalRecoveryFlat: 5 } },
          { level: 5, name: 'Trait: Corpo Preparado', mechanic: 'Menos risco de lesao, melhor recuperacao entre torneios e folego estrutural maior.', effects: { injuryChanceFlat: 8, physicalRecoveryFlat: 5, staminaDrainFlat: 3 } },
          { level: 6, name: 'Carga Sustentavel', mechanic: '-8 no desgaste de condicao fisica ao longo da temporada.', effects: { physicalDecayFlat: 8 } },
          { level: 7, name: 'Cicatriz Curta', mechanic: '-8 no tempo de retorno e debuff depois de voltar de lesao.', effects: { comebackWindowFlat: 8 } },
          { level: 8, name: 'Motor de Temporada', mechanic: '-6 no consumo de stamina em jogos fisicos e longos.', effects: { staminaDrainFlat: 6 } },
          { level: 9, name: 'Estrutura de Elite', mechanic: '+6 em Resistencia e +6 na recuperacao fisica de alto nivel.', effects: { attrFlat: { resistencia: 6 }, physicalRecoveryFlat: 6 } },
          { level: 10, name: 'Trait Lendaria: Corpo dos Deuses', mechanic: 'O declinio fisico pela idade cai pela metade e o corpo segura melhor as temporadas pesadas.', effects: { agePhysicalDeclineMult: 0.5, physicalDecayMult: 0.88, injuryChanceMult: 0.95 } },
        ],
      },
      TENACITY: {
        id: 'TENACITY',
        label: 'Tenacidade',
        kicker: 'velocidade, defesa e sobrevivencia atletica',
        levels: [
          { level: 1, name: 'Primeiro Arranque', mechanic: '+3 em Velocidade.', effects: { attrFlat: { velocidade: 3 } } },
          { level: 2, name: 'Base de Cobertura', mechanic: '+3 em Defesa.', effects: { attrFlat: { defesa: 3 } } },
          { level: 3, name: 'Atleta Incomodo', mechanic: '+5 em Velocidade e Defesa.', effects: { attrFlat: { velocidade: 5, defesa: 5 } } },
          { level: 4, name: 'Folego de Perseguicao', mechanic: '+4 de sustentacao em trocas acima de 5 bolas e -3 no gasto de stamina.', effects: { longRallyQualityFlat: 4, staminaDrainFlat: 3 } },
          { level: 5, name: 'Trait: Guerreiro de Quadra', mechanic: 'Melhor defesa em bolas dificeis e menos perda quando chega atrasado.', effects: { defensiveQualityFlat: 6, lateContactReliefFlat: 6 } },
          { level: 6, name: 'Passo de Recuperacao', mechanic: '-8 na penalidade em contatos atrasados e deslocamentos extremos.', effects: { lateContactReliefFlat: 8 } },
          { level: 7, name: 'Elasticidade Defensiva', mechanic: '+8 de qualidade em bolas defensivas e scrambling.', effects: { defensiveQualityFlat: 8 } },
          { level: 8, name: 'Resistencia de Guerra', mechanic: '-8 no colapso de rendimento quando a stamina cai.', effects: { lowStaminaPenaltyReliefFlat: 8 } },
          { level: 9, name: 'Muralha em Movimento', mechanic: '+8 em Velocidade, Defesa e Resistencia.', effects: { attrFlat: { velocidade: 8, defesa: 8, resistencia: 8 } } },
          { level: 10, name: 'Trait Lendaria: Tenacidade Monstruosa', mechanic: 'Atletismo de elite, menos atraso e muito mais sustentacao defensiva.', effects: { defensiveQualityMult: 1.12, lateContactPenaltyMult: 0.85, lowStaminaPenaltyMult: 0.8, staminaDrainMult: 0.9 } },
        ],
      },
    },
  },
  mind: {
    id: 'mind',
    label: 'Mente',
    trees: {
      PRESSURE: {
        id: 'PRESSURE',
        label: 'Pressao',
        kicker: 'clutch, sangue frio e pontos grandes',
        levels: [
          { level: 1, name: 'Pulso Firme', mechanic: '+3 em Mentalidade.', effects: { attrFlat: { mentalidade: 3 } } },
          { level: 2, name: 'Ponto Seguinte', mechanic: '-6 na erosao mental apos sofrer pressao ou ponto ruim.', effects: { carryPressureReliefFlat: 6 } },
          { level: 3, name: 'Cabeca Fria', mechanic: '+5 em Mentalidade base.', effects: { attrFlat: { mentalidade: 5 } } },
          { level: 4, name: 'Tie-break Vivo', mechanic: '+4 de qualidade em break points, tiebreaks e momentos quentes.', effects: { pressurePointQualityFlat: 4 } },
          { level: 5, name: 'Trait: Sangue Frio', mechanic: 'Melhor resposta em pontos grandes, menos tilt e mais firmeza emocional.', effects: { pressurePointQualityFlat: 7, carryPressureReliefFlat: 6, crowdPressureReliefFlat: 5 } },
          { level: 6, name: 'Anti-Colapso', mechanic: '-8 na perda de qualidade em sequencias ruins.', effects: { carryPressureReliefFlat: 8 } },
          { level: 7, name: 'Fechador', mechanic: '+5 de execucao para fechar games, sets e jogos apertados.', effects: { pressurePointQualityFlat: 5 } },
          { level: 8, name: 'Nervos de Aco', mechanic: '-8 no impacto da pressao externa e do crowd em pontos grandes.', effects: { crowdPressureReliefFlat: 8 } },
          { level: 9, name: 'Momento Grande', mechanic: '+3 de qualidade geral e +5 em pontos grandes.', effects: { qualityFlat: 3, pressurePointQualityFlat: 5 } },
          { level: 10, name: 'Trait Lendaria: Gelo nas Veias', mechanic: 'Jogador de palco grande, quase imune a tilt e muito mais forte em clutch.', effects: { pressurePointQualityMult: 1.12, carryPressurePenaltyMult: 0.75, crowdPressureMult: 0.7 } },
        ],
      },
      TACTICAL: {
        id: 'TACTICAL',
        label: 'Tatica',
        kicker: 'leitura, plano e adaptacao de jogo',
        levels: [
          { level: 1, name: 'Olho de Leitura', mechanic: '+3 em Leitura.', effects: { attrFlat: { leitura: 3 } } },
          { level: 2, name: 'Plano Claro', mechanic: '+3 em Controle.', effects: { attrFlat: { controle: 3 } } },
          { level: 3, name: 'Leitura Expandida', mechanic: '+5 em Leitura base.', effects: { attrFlat: { leitura: 5 } } },
          { level: 4, name: 'Construcao Inteligente', mechanic: '+4 na conversao de neutro para construcao e pressao.', effects: { buildPressureFlat: 4 } },
          { level: 5, name: 'Trait: Mente de Xadrez', mechanic: 'Melhor escolha de padrao, menos erro de alvo e leitura mais nitida do ponto.', effects: { buildPressureFlat: 5, aggressivePlacementReliefFlat: 6, tacticalReadFlat: 4 } },
          { level: 6, name: 'Adaptacao em Jogo', mechanic: '+5 de qualidade em rallys medios e longos quando a partida vai revelando padroes.', effects: { longRallyQualityFlat: 5 } },
          { level: 7, name: 'Explorador de Espaco', mechanic: '-8 na degradacao ao abrir quadra e insistir no alvo certo.', effects: { aggressivePlacementReliefFlat: 8 } },
          { level: 8, name: 'Quebra de Padrao', mechanic: '-6 na penalidade ao sair de rallies engessados e responder bolas chatas.', effects: { incomingPaceReliefFlat: 6, buildPressureFlat: 3 } },
          { level: 9, name: 'Cirurgiao de Matchup', mechanic: '+8 em leitura tatico-defensiva e passing shots.', effects: { tacticalReadFlat: 8, passingQualityFlat: 8 } },
          { level: 10, name: 'Trait Lendaria: Oraculo Tatico', mechanic: 'Le o jogo antes do rival e transforma leitura em execucao de elite.', effects: { tacticalReadMult: 1.14, buildPressureMult: 1.08, aggressivePlacementPenaltyMult: 0.82, qualityMult: 1.04, passingQualityMult: 1.12 } },
        ],
      },
    },
  },
  technique: {
    id: 'technique',
    label: 'Tecnica',
    trees: {
      SERVICE: {
        id: 'SERVICE',
        label: 'Saque',
        kicker: 'forca, precisao e quique de servico',
        levels: [
          { level: 1, name: 'Alavanca Limpa', mechanic: '+3 em Saque.', effects: { attrFlat: { saque: 3 } } },
          { level: 2, name: 'Base de Precisao', mechanic: '+3 em Controle aplicado ao saque.', effects: { attrFlat: { controle: 3 } } },
          { level: 3, name: 'Mecanica Repetivel', mechanic: '+5 em Saque base.', effects: { attrFlat: { saque: 5 } } },
          { level: 4, name: 'Quique Qualificado', mechanic: '+4 de qualidade no servico e na primeira leitura do saque.', effects: { serveQualityFlat: 4 } },
          { level: 5, name: 'Trait: Sacador Tecnico', mechanic: 'Primeira mais limpa, segunda mais firme e menos oscilacao no gesto de saque.', effects: { serveQualityFlat: 5, secondServeQualityFlat: 5 } },
          { level: 6, name: 'Janela de Alvo', mechanic: '-8 na degradacao ao mirar saque mais no limite.', effects: { aggressivePlacementReliefFlat: 8 } },
          { level: 7, name: 'Primeira Pesada', mechanic: '+5 na qualidade da primeira bola de servico.', effects: { serveQualityFlat: 5 } },
          { level: 8, name: 'Segunda Confiavel', mechanic: '+8 na qualidade da segunda bola.', effects: { secondServeQualityFlat: 8 } },
          { level: 9, name: 'Arsenal de Servico', mechanic: '+3 em Saque, +3 em Leitura do alvo e +4 na qualidade do servico.', effects: { attrFlat: { saque: 3, leitura: 3 }, serveQualityFlat: 4 } },
          { level: 10, name: 'Trait Lendaria: Servico Supremo', mechanic: 'Fundamento de saque em elite tecnica com primeira e segunda muito acima da media.', effects: { attrMultMap: { saque: 1.08 }, serveQualityMult: 1.12, secondServeQualityMult: 1.12 } },
        ],
      },
      NET: {
        id: 'NET',
        label: 'Rede',
        kicker: 'presenca, volley e smash',
        levels: [
          { level: 1, name: 'Maos Presentes', mechanic: '+3 em Jogo de Rede.', effects: { attrFlat: { jogoDeRede: 3, volley: 3 } } },
          { level: 2, name: 'Pe de Voleio', mechanic: '+3 em Leitura para ocupar melhor a frente.', effects: { attrFlat: { leitura: 3 } } },
          { level: 3, name: 'Toque de Frente', mechanic: '+5 em Jogo de Rede e Volley base.', effects: { attrFlat: { jogoDeRede: 5, volley: 5 } } },
          { level: 4, name: 'Primeiro Voleio', mechanic: '+4 de qualidade no primeiro contato de rede.', effects: { volleyQualityFlat: 4 } },
          { level: 5, name: 'Trait: Presenca de Rede', mechanic: 'Melhor posicionamento, volley mais limpo e smash mais confiavel.', effects: { volleyQualityFlat: 6, smashQualityFlat: 5 } },
          { level: 6, name: 'Instinto de Interceptacao', mechanic: '+4 em bolas curtas e aproximacoes, com +3 na qualidade do volley.', effects: { shortRallyQualityFlat: 4, volleyQualityFlat: 3 } },
          { level: 7, name: 'Reflexo Curto', mechanic: '+6 de qualidade em voleios de reacao.', effects: { volleyQualityFlat: 6 } },
          { level: 8, name: 'Smash Resolvido', mechanic: '+8 de qualidade em overhead e smash.', effects: { smashQualityFlat: 8 } },
          { level: 9, name: 'Dominio da Frente', mechanic: '+4 em Jogo de Rede, +4 em Smash e +4 na qualidade do volley.', effects: { attrFlat: { jogoDeRede: 4, smash: 4 }, volleyQualityFlat: 4 } },
          { level: 10, name: 'Trait Lendaria: Senhor da Rede', mechanic: 'Rede vira territorio natural com volley e smash de elite.', effects: { attrMultMap: { jogoDeRede: 1.08, smash: 1.08 }, volleyQualityMult: 1.12, smashQualityMult: 1.12 } },
        ],
      },
      FOREHAND: {
        id: 'FOREHAND',
        label: 'Forehand',
        kicker: 'arma, peso e imposicao de direita',
        levels: [
          { level: 1, name: 'Contato Limpo', mechanic: '+3 em FH Controle.', effects: { attrFlat: { fhControle: 3 } } },
          { level: 2, name: 'Base de Peso', mechanic: '+3 em FH Potencia.', effects: { attrFlat: { fhPotencia: 3 } } },
          { level: 3, name: 'Golpe Repetivel', mechanic: '+5 em FH Potencia e FH Controle base.', effects: { attrFlat: { fhPotencia: 5, fhControle: 5 } } },
          { level: 4, name: 'Linha de Forehand', mechanic: '+4 de qualidade no forehand.', effects: { forehandQualityFlat: 4 } },
          { level: 5, name: 'Trait: Forehand Tecnico', mechanic: 'Forehand mais pesado, limpo e confiavel na execucao agressiva.', effects: { forehandQualityFlat: 6, aggressivePlacementReliefFlat: 5 } },
          { level: 6, name: 'Peso Assinatura', mechanic: '+3 em FH Potencia e +3 na qualidade no forehand de pressao.', effects: { attrFlat: { fhPotencia: 3 }, forehandQualityFlat: 3 } },
          { level: 7, name: 'Direita de Comando', mechanic: '-8 na degradacao ao atacar com o forehand e +3 de qualidade.', effects: { aggressivePlacementReliefFlat: 8, forehandQualityFlat: 3 } },
          { level: 8, name: 'Aceleracao Limpa', mechanic: '+6 de qualidade em forehands de iniciativa.', effects: { forehandQualityFlat: 6 } },
          { level: 9, name: 'Arma de Elite', mechanic: '+4 em FH Potencia e FH Controle, com +4 na qualidade do forehand.', effects: { attrFlat: { fhPotencia: 4, fhControle: 4 }, forehandQualityFlat: 4 } },
          { level: 10, name: 'Trait Lendaria: Martelo de Forehand', mechanic: 'Forehand dominante em nivel tecnico raro.', effects: { attrMultMap: { fhPotencia: 1.08, fhControle: 1.08 }, forehandQualityMult: 1.12 } },
        ],
      },
      BACKHAND: {
        id: 'BACKHAND',
        label: 'Backhand',
        kicker: 'coluna, firmeza e linha de esquerda',
        levels: [
          { level: 1, name: 'Base de Firmeza', mechanic: '+3 em BH Controle.', effects: { attrFlat: { bhControle: 3 } } },
          { level: 2, name: 'Peso de Resposta', mechanic: '+3 em BH Potencia.', effects: { attrFlat: { bhPotencia: 3 } } },
          { level: 3, name: 'Backhand Repetivel', mechanic: '+5 em BH Potencia e BH Controle base.', effects: { attrFlat: { bhPotencia: 5, bhControle: 5 } } },
          { level: 4, name: 'Linha de Backhand', mechanic: '+4 de qualidade no backhand.', effects: { backhandQualityFlat: 4 } },
          { level: 5, name: 'Trait: Backhand Tecnico', mechanic: 'Backhand mais estavel, mais limpo e menos vulneravel sob pressao.', effects: { backhandQualityFlat: 6, carryPressureReliefFlat: 4 } },
          { level: 6, name: 'Esquerda de Sustentacao', mechanic: '+3 em BH Controle e +3 de firmeza em trocas medias.', effects: { attrFlat: { bhControle: 3 }, longRallyQualityFlat: 3 } },
          { level: 7, name: 'Linha Segura', mechanic: '-8 na degradacao ao mudar direcao com o backhand e +3 de qualidade.', effects: { aggressivePlacementReliefFlat: 8, backhandQualityFlat: 3 } },
          { level: 8, name: 'Backhand de Resposta', mechanic: '+6 de qualidade no backhand em rallys e sob pressao.', effects: { backhandQualityFlat: 6 } },
          { level: 9, name: 'Coluna de Elite', mechanic: '+4 em BH Potencia e BH Controle, com +4 na qualidade do backhand.', effects: { attrFlat: { bhPotencia: 4, bhControle: 4 }, backhandQualityFlat: 4 } },
          { level: 10, name: 'Trait Lendaria: Muralha de Backhand', mechanic: 'Backhand tecnicamente superior, estavel e venenoso na linha.', effects: { attrMultMap: { bhPotencia: 1.08, bhControle: 1.08 }, backhandQualityMult: 1.12 } },
        ],
      },
    },
  },
  shots: {
    id: 'shots',
    label: 'Shots',
    trees: {
      TOPSPIN: {
        id: 'TOPSPIN',
        label: 'Topspin',
        kicker: 'giro, altura e sufoco',
        levels: [
          { level: 1, name: 'Base de Giro', mechanic: '+6 na presenca de TOPSPIN na pool.', effects: { shotPoolFlat: { TOPSPIN: 6 } } },
          { level: 2, name: 'Margem Alta', mechanic: '+2 de qualidade no TOPSPIN.', effects: { shotQualityFlatMap: { TOPSPIN: 2 } } },
          { level: 3, name: 'Quique Vivo', mechanic: '+5 de spin e +4 de quique no TOPSPIN.', effects: { shotSpinFlatMap: { TOPSPIN: 5 }, shotBounceFlatMap: { TOPSPIN: 4 } } },
          { level: 4, name: 'Critico de Topspin', mechanic: '5% de chance de TOPSPIN sair com qualidade 80+ independente da situacao.', effects: { shotCritChanceFlatMap: { TOPSPIN: 5 }, shotCritQualityFlatMap: { TOPSPIN: 10 } } },
          { level: 5, name: 'Trait: Peso de Topspin', mechanic: 'TOPSPIN ganha mais presenca na pool, mais qualidade e mais quique em rallys de desgaste.', effects: { shotPoolFlat: { TOPSPIN: 8 }, shotQualityFlatMap: { TOPSPIN: 3 }, shotBounceFlatMap: { TOPSPIN: 5 } } },
          { level: 6, name: 'Pressao de Ombro', mechanic: '+2 de quality e +4 de spin quando o TOPSPIN vira bola de pressao.', effects: { shotQualityFlatMap: { TOPSPIN: 2 }, shotSpinFlatMap: { TOPSPIN: 4 } } },
          { level: 7, name: 'Rolagem Pesada', mechanic: '+6 de spin e +4 de power no TOPSPIN.', effects: { shotSpinFlatMap: { TOPSPIN: 6 }, shotPowerFlatMap: { TOPSPIN: 4 } } },
          { level: 8, name: 'Sufoco de Fundo', mechanic: '+8 na presenca de TOPSPIN como shot de pressao.', effects: { shotPoolFlat: { TOPSPIN: 8 }, shotQualityFlatMap: { TOPSPIN: 1 } } },
          { level: 9, name: 'Critico de Topspin II', mechanic: '10% de chance de TOPSPIN sair com qualidade 80+ independente da situacao.', effects: { shotCritChanceFlatMap: { TOPSPIN: 10 }, shotCritQualityFlatMap: { TOPSPIN: 14 } } },
          { level: 10, name: 'Trait Lendaria: Tempestade de Topspin', mechanic: 'TOPSPIN vira arma de elite com muito giro, muito quique e muita presenca de repertorio.', effects: { shotPoolFlat: { TOPSPIN: 12 }, shotQualityFlatMap: { TOPSPIN: 5 }, shotSpinFlatMap: { TOPSPIN: 12 }, shotBounceFlatMap: { TOPSPIN: 10 }, qualityMult: 1.02 } },
        ],
      },
      SLICE: {
        id: 'SLICE',
        label: 'Slice',
        kicker: 'veneno, quique morto e corte',
        levels: [
          { level: 1, name: 'Base Cortada', mechanic: '+6 na presenca de SLICE na pool.', effects: { shotPoolFlat: { SLICE: 6 } } },
          { level: 2, name: 'Faca de Controle', mechanic: '+4 de qualidade no SLICE.', effects: { shotQualityFlatMap: { SLICE: 4 } } },
          { level: 3, name: 'Quique Morto', mechanic: '+5 de spin e -4 de quique no SLICE.', effects: { shotSpinFlatMap: { SLICE: 5 }, shotBounceFlatMap: { SLICE: -4 } } },
          { level: 4, name: 'Critico de Slice', mechanic: '5% de chance de SLICE sair com qualidade 80+ independente da situacao.', effects: { shotCritChanceFlatMap: { SLICE: 5 }, shotCritQualityFlatMap: { SLICE: 10 } } },
          { level: 5, name: 'Trait: Slice Venenoso', mechanic: 'SLICE entra mais na pool, quica mais morto e ganha mais quality em trocas de controle.', effects: { shotPoolFlat: { SLICE: 8 }, shotQualityFlatMap: { SLICE: 6 }, shotBounceFlatMap: { SLICE: -5 } } },
          { level: 6, name: 'Quebra de Ritmo', mechanic: '+6 na presenca do SLICE em contextos taticos e +3 de quality.', effects: { shotPoolFlat: { SLICE: 6 }, shotQualityFlatMap: { SLICE: 3 } } },
          { level: 7, name: 'Corte Rasteiro', mechanic: '+6 de spin e -5 de quique no SLICE.', effects: { shotSpinFlatMap: { SLICE: 6 }, shotBounceFlatMap: { SLICE: -5 } } },
          { level: 8, name: 'Slice que Incomoda', mechanic: '+8 de pool e +4 de power funcional no SLICE.', effects: { shotPoolFlat: { SLICE: 8 }, shotPowerFlatMap: { SLICE: 4 } } },
          { level: 9, name: 'Critico de Slice II', mechanic: '10% de chance de SLICE sair com qualidade 80+ independente da situacao.', effects: { shotCritChanceFlatMap: { SLICE: 10 }, shotCritQualityFlatMap: { SLICE: 14 } } },
          { level: 10, name: 'Trait Lendaria: Veneno de Slice', mechanic: 'SLICE magistral, baixo, sujo e altamente perturbador.', effects: { shotPoolFlat: { SLICE: 12 }, shotQualityFlatMap: { SLICE: 10 }, shotSpinFlatMap: { SLICE: 10 }, shotBounceFlatMap: { SLICE: -8 }, qualityMult: 1.04 } },
        ],
      },
      DRIVE: {
        id: 'DRIVE',
        label: 'Drive',
        kicker: 'reta limpa e penetracao',
        levels: [
          { level: 1, name: 'Linha Reta', mechanic: '+6 na presenca de DRIVE na pool.', effects: { shotPoolFlat: { DRIVE: 6 } } },
          { level: 2, name: 'Drive Limpo', mechanic: '+4 de qualidade no DRIVE.', effects: { shotQualityFlatMap: { DRIVE: 4 } } },
          { level: 3, name: 'Bola Penetrante', mechanic: '+5 de power e +3 de precisao funcional no DRIVE.', effects: { shotPowerFlatMap: { DRIVE: 5 }, shotSpinFlatMap: { DRIVE: 3 } } },
          { level: 4, name: 'Critico de Drive', mechanic: '5% de chance de DRIVE sair com qualidade 80+ independente da situacao.', effects: { shotCritChanceFlatMap: { DRIVE: 5 }, shotCritQualityFlatMap: { DRIVE: 10 } } },
          { level: 5, name: 'Trait: Drive Seco', mechanic: 'DRIVE ganha mais presence na pool, mais quality e mais penetracao em trocas limpas.', effects: { shotPoolFlat: { DRIVE: 8 }, shotQualityFlatMap: { DRIVE: 6 }, shotPowerFlatMap: { DRIVE: 5 } } },
          { level: 6, name: 'Pressao Reta', mechanic: '+6 na presenca do DRIVE como shot de pressao e +3 de quality.', effects: { shotPoolFlat: { DRIVE: 6 }, shotQualityFlatMap: { DRIVE: 3 } } },
          { level: 7, name: 'Atravessa Quadra', mechanic: '+6 de power e +4 de quique util no DRIVE.', effects: { shotPowerFlatMap: { DRIVE: 6 }, shotBounceFlatMap: { DRIVE: 4 } } },
          { level: 8, name: 'Drive de Controle', mechanic: '+8 na presenca do DRIVE em rally limpo e +4 de quality.', effects: { shotPoolFlat: { DRIVE: 8 }, shotQualityFlatMap: { DRIVE: 4 } } },
          { level: 9, name: 'Critico de Drive II', mechanic: '10% de chance de DRIVE sair com qualidade 80+ independente da situacao.', effects: { shotCritChanceFlatMap: { DRIVE: 10 }, shotCritQualityFlatMap: { DRIVE: 14 } } },
          { level: 10, name: 'Trait Lendaria: Tiro de Drive', mechanic: 'DRIVE vira linguagem dominante, limpo, profundo, preciso e penetrante.', effects: { shotPoolFlat: { DRIVE: 12 }, shotQualityFlatMap: { DRIVE: 10 }, shotPowerFlatMap: { DRIVE: 10 }, shotBounceFlatMap: { DRIVE: 8 }, qualityMult: 1.04 } },
        ],
      },
      ACCEL: {
        id: 'ACCEL',
        label: 'Accel',
        kicker: 'ruptura, explosao e finalizacao',
        levels: [
          { level: 1, name: 'Cheiro de Ataque', mechanic: '+6 na presenca de ACCEL na pool.', effects: { shotPoolFlat: { ACCEL: 6, SHORT_ACCEL: 4 } } },
          { level: 2, name: 'Explosao Inicial', mechanic: '+2 de qualidade no ACCEL.', effects: { shotQualityFlatMap: { ACCEL: 2, SHORT_ACCEL: 1 } } },
          { level: 3, name: 'Golpe de Ruptura', mechanic: '+6 de power e +3 de spin funcional no ACCEL.', effects: { shotPowerFlatMap: { ACCEL: 6, SHORT_ACCEL: 4 }, shotSpinFlatMap: { ACCEL: 3, SHORT_ACCEL: 2 } } },
          { level: 4, name: 'Critico de Accel', mechanic: '5% de chance de ACCEL sair com qualidade 80+ independente da situacao.', effects: { shotCritChanceFlatMap: { ACCEL: 5, SHORT_ACCEL: 4 }, shotCritQualityFlatMap: { ACCEL: 10, SHORT_ACCEL: 8 } } },
          { level: 5, name: 'Trait: Acelerador Nato', mechanic: 'ACCEL aparece mais em oportunidades reais, ganha mais quality e menos degradacao agressiva.', effects: { shotPoolFlat: { ACCEL: 8, SHORT_ACCEL: 6 }, shotQualityFlatMap: { ACCEL: 3, SHORT_ACCEL: 2 }, aggressivePlacementReliefFlat: 5 } },
          { level: 6, name: 'Ataque no Tempo', mechanic: '+6 na presenca de ACCEL em quadra aberta e +2 de quality.', effects: { shotPoolFlat: { ACCEL: 6, SHORT_ACCEL: 5 }, shotQualityFlatMap: { ACCEL: 2 } } },
          { level: 7, name: 'Violencia Limpa', mechanic: '+7 de power e +1 de quality no ACCEL.', effects: { shotPowerFlatMap: { ACCEL: 7, SHORT_ACCEL: 5 }, shotQualityFlatMap: { ACCEL: 1 } } },
          { level: 8, name: 'Quebra de Rally', mechanic: '+8 na presenca de ACCEL para romper rallys neutros.', effects: { shotPoolFlat: { ACCEL: 8, SHORT_ACCEL: 6 } } },
          { level: 9, name: 'Critico de Accel II', mechanic: '10% de chance de ACCEL sair com qualidade 80+ independente da situacao.', effects: { shotCritChanceFlatMap: { ACCEL: 10, SHORT_ACCEL: 8 }, shotCritQualityFlatMap: { ACCEL: 14, SHORT_ACCEL: 12 } } },
          { level: 10, name: 'Trait Lendaria: Explosao Letal', mechanic: 'ACCEL de elite, com leitura otima de oportunidade, muita forca e fechamento brutal do ponto.', effects: { shotPoolFlat: { ACCEL: 12, SHORT_ACCEL: 9 }, shotQualityFlatMap: { ACCEL: 5, SHORT_ACCEL: 4 }, shotPowerFlatMap: { ACCEL: 12, SHORT_ACCEL: 10 }, qualityMult: 1.02 } },
        ],
      },
      DROPSHOT: {
        id: 'DROPSHOT',
        label: 'Dropshot',
        kicker: 'toque, disfarce e curta cruel',
        levels: [
          { level: 1, name: 'Ideia Curta', mechanic: '+5 na presenca de DROPSHOT na pool quando o rival esta fundo.', effects: { shotPoolFlat: { DROP: 5 } } },
          { level: 2, name: 'Toque Inicial', mechanic: '+4 de qualidade no DROPSHOT.', effects: { shotQualityFlatMap: { DROP: 4 } } },
          { level: 3, name: 'Queda Suave', mechanic: '+4 de spin/touch e -4 de quique no DROPSHOT.', effects: { shotSpinFlatMap: { DROP: 4 }, shotBounceFlatMap: { DROP: -4 } } },
          { level: 4, name: 'Critico de Drop', mechanic: '5% de chance de DROPSHOT sair com qualidade 80+ independente da situacao.', effects: { shotCritChanceFlatMap: { DROP: 5 }, shotCritQualityFlatMap: { DROP: 10 } } },
          { level: 5, name: 'Trait: Mao de Veludo', mechanic: 'DROPSHOT ganha mais quality, mais presenca na pool certa e mais quique morto.', effects: { shotPoolFlat: { DROP: 8 }, shotQualityFlatMap: { DROP: 6 }, shotBounceFlatMap: { DROP: -5 } } },
          { level: 6, name: 'Disfarce Curto', mechanic: '+4 de quality e +4 de chance de aparecer em contextos plausiveis.', effects: { shotQualityFlatMap: { DROP: 4 }, shotPoolFlat: { DROP: 4 } } },
          { level: 7, name: 'Presente Constante', mechanic: 'DROPSHOT deixa de ser raro e vira um golpe muitas vezes ponderado.', effects: { shotPoolFlat: { DROP: 10 }, shotQualityFlatMap: { DROP: 3 } } },
          { level: 8, name: 'Mata Ritmo', mechanic: '+6 de quality e -4 de quique quando a curta entra para quebrar cadencia.', effects: { shotQualityFlatMap: { DROP: 6 }, shotBounceFlatMap: { DROP: -4 } } },
          { level: 9, name: 'Critico de Drop II', mechanic: '10% de chance de DROPSHOT sair com qualidade 80+ independente da situacao.', effects: { shotCritChanceFlatMap: { DROP: 10 }, shotCritQualityFlatMap: { DROP: 14 } } },
          { level: 10, name: 'Trait Lendaria: Curta Impossivel', mechanic: 'DROPSHOT magistral com muita precisao, quique morto e presenca letal no repertorio.', effects: { shotPoolFlat: { DROP: 12 }, shotQualityFlatMap: { DROP: 10 }, shotBounceFlatMap: { DROP: -8 }, shotSpinFlatMap: { DROP: 8 }, qualityMult: 1.04 } },
        ],
      },
    },
  },
};

function normalizeSurface(surface) {
  return SURFACE_ORDER.includes(String(surface).toUpperCase()) ? String(surface).toUpperCase() : 'HARD';
}

function getAttr(player, key, fallback = 60) {
  return Number(player?.attrs?.[key] ?? fallback);
}

function getAvg(player, keys, fallback = 60) {
  const values = keys.map(key => getAttr(player, key, fallback));
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function getSurfaceAttrFit(player, surface) {
  if (surface === 'HARD') return getAvg(player, ['regularidade', 'mentalidade', 'controle', 'potencia', 'leitura']);
  if (surface === 'CLAY') return getAvg(player, ['topspin', 'resistencia', 'controle', 'defesa', 'leitura']);
  if (surface === 'GRASS') return getAvg(player, ['saque', 'jogoDeRede', 'slice', 'leitura', 'agressividade']);
  return getAvg(player, ['saque', 'controle', 'mentalidade', 'agressividade', 'regularidade']);
}

function getSurfaceCareerSignal(player, surface) {
  const ss = player?.surfaceStats?.[surface] ?? {};
  const wins = Number(ss.wins ?? 0);
  const losses = Number(ss.losses ?? 0);
  const total = wins + losses;
  const titles = Number(ss.titlesWon ?? 0);
  const winRate = total > 0 ? wins / total : 0.5;
  const volume = clamp(total / 40, 0, 1);
  const titleScore = clamp(titles / 4, 0, 1);
  const performance = clamp((winRate - 0.35) / 0.45, 0, 1);
  return ((performance * 0.6) + (volume * 0.2) + (titleScore * 0.2)) * 100;
}

function getSurfaceRecentSignal(player, surface) {
  const rf = Number(player?.recentForm?.surfaceForm?.[surface] ?? 0.5);
  return clamp((rf - 0.25) / 0.6, 0, 1) * 100;
}

function getIdentityBonus(player, surface) {
  return player?.surfaceIdentity?.surface?.toUpperCase() === surface ? 18 : 0;
}

function scoreSurfaceMastery(player, surface) {
  const attrFit = getSurfaceAttrFit(player, surface);
  const career = getSurfaceCareerSignal(player, surface);
  const recent = getSurfaceRecentSignal(player, surface);
  const identity = getIdentityBonus(player, surface);
  return (attrFit * 0.42) + (career * 0.38) + (recent * 0.1) + identity;
}

function getPhysiqueScore(player) {
  const res = getAttr(player, 'resistencia', 70);
  const recovery = Number(player?.attrs?.recuperacao ?? player?.attrs?.mentalidade ?? 65);
  const cond = Number(player?.physicalCondition ?? 82);
  const injuryCount = Math.min(8, Number(player?.injuryHistory?.length ?? 0));
  const age = Number(player?.age ?? 25);
  const ageResilience = age <= 28 ? 74 : age <= 32 ? 69 : age <= 35 ? 63 : 57;
  return (res * 0.38) + (recovery * 0.24) + (cond * 0.2) + (ageResilience * 0.18) - injuryCount * 1.6;
}

function getTenacityScore(player) {
  const speed = getAttr(player, 'velocidade', 68);
  const defense = getAttr(player, 'defesa', 66);
  const explosiveness = getAttr(player, 'explosividade', 66);
  const stamina = getAttr(player, 'resistencia', 68);
  return (speed * 0.34) + (defense * 0.28) + (explosiveness * 0.22) + (stamina * 0.16);
}

function getPressureScore(player) {
  const mental = getAttr(player, 'mentalidade', 68);
  const regularidade = getAttr(player, 'regularidade', 68);
  const reading = getAttr(player, 'leitura', 66);
  return (mental * 0.54) + (regularidade * 0.24) + (reading * 0.22);
}

function getTacticalScore(player) {
  const reading = getAttr(player, 'leitura', 68);
  const control = getAttr(player, 'controle', 66);
  const topspin = getAttr(player, 'topspin', 64);
  const regularidade = getAttr(player, 'regularidade', 66);
  return (reading * 0.42) + (control * 0.28) + (topspin * 0.12) + (regularidade * 0.18);
}

function getServiceScore(player) {
  const serve = getAttr(player, 'saque', 68);
  const control = getAttr(player, 'controle', 66);
  const reading = getAttr(player, 'leitura', 64);
  return (serve * 0.58) + (control * 0.24) + (reading * 0.18);
}

function getNetScore(player) {
  const net = Number(player?.attrs?.jogoDeRede ?? player?.attrs?.volley ?? 64);
  const smash = Number(player?.attrs?.smash ?? player?.attrs?.jogoDeRede ?? 64);
  const speed = getAttr(player, 'velocidade', 64);
  const reading = getAttr(player, 'leitura', 64);
  return (net * 0.44) + (smash * 0.24) + (speed * 0.14) + (reading * 0.18);
}

function getForehandScore(player) {
  const fhPow = Number(player?.attrs?.fhPotencia ?? player?.attrs?.potencia ?? 68);
  const fhCtrl = Number(player?.attrs?.fhControle ?? player?.attrs?.controle ?? 66);
  const topspin = getAttr(player, 'topspin', 64);
  return (fhPow * 0.42) + (fhCtrl * 0.42) + (topspin * 0.16);
}

function getBackhandScore(player) {
  const bhPow = Number(player?.attrs?.bhPotencia ?? player?.attrs?.potencia ?? 66);
  const bhCtrl = Number(player?.attrs?.bhControle ?? player?.attrs?.controle ?? 68);
  const slice = getAttr(player, 'slice', 62);
  return (bhPow * 0.34) + (bhCtrl * 0.48) + (slice * 0.18);
}

function getTopspinShotScore(player) {
  return getAvg(player, ['topspin', 'controle', 'regularidade', 'leitura'], 64);
}

function getSliceShotScore(player) {
  return getAvg(player, ['slice', 'controle', 'leitura', 'jogoDeRede'], 62);
}

function getDriveShotScore(player) {
  return getAvg(player, ['potencia', 'controle', 'agressividade', 'leitura'], 64);
}

function getAccelShotScore(player) {
  return getAvg(player, ['potencia', 'agressividade', 'velocidade', 'leitura'], 64);
}

function getDropshotScore(player) {
  return getAvg(player, ['slice', 'controle', 'leitura', 'jogoDeRede'], 63);
}

function stableHash(input) {
  const str = String(input ?? 'seed');
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seeded01(seed) {
  let x = stableHash(seed) || 1;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return ((x >>> 0) % 1000000) / 1000000;
}

function createEmptyTalentLevels() {
  return {
    surface: Object.fromEntries(SURFACE_ORDER.map(key => [key, 0])),
    body: Object.fromEntries(BODY_ORDER.map(key => [key, 0])),
    mind: Object.fromEntries(MIND_ORDER.map(key => [key, 0])),
    technique: Object.fromEntries(TECHNIQUE_ORDER.map(key => [key, 0])),
    shots: Object.fromEntries(SHOTS_ORDER.map(key => [key, 0])),
  };
}

function getTalentScoreMaps(player) {
  return {
    surface: Object.fromEntries(SURFACE_ORDER.map(key => [key, scoreSurfaceMastery(player, key)])),
    body: {
      PHYSIQUE: getPhysiqueScore(player),
      TENACITY: getTenacityScore(player),
    },
    mind: {
      PRESSURE: getPressureScore(player),
      TACTICAL: getTacticalScore(player),
    },
    technique: {
      SERVICE: getServiceScore(player),
      NET: getNetScore(player),
      FOREHAND: getForehandScore(player),
      BACKHAND: getBackhandScore(player),
    },
    shots: {
      TOPSPIN: getTopspinShotScore(player),
      SLICE: getSliceShotScore(player),
      DRIVE: getDriveShotScore(player),
      ACCEL: getAccelShotScore(player),
      DROPSHOT: getDropshotScore(player),
    },
  };
}

function countAllocatedPoints(levels) {
  return Object.values(levels).reduce(
    (sum, family) => sum + Object.values(family ?? {}).reduce((acc, val) => acc + Number(val ?? 0), 0),
    0
  );
}

function allocateTalentPoints(player, scoreMaps, intelligence) {
  const levels = createEmptyTalentLevels();
  const idSeed = player?.id ?? player?.fullName ?? player?.name ?? 'PLAYER';
  const intel = clamp((Number(intelligence ?? 50)) / 100, 0, 1);
  const entries = [
    ...SURFACE_ORDER.map(key => ({ family: 'surface', key, score: scoreMaps.surface[key] })),
    ...BODY_ORDER.map(key => ({ family: 'body', key, score: scoreMaps.body[key] })),
    ...MIND_ORDER.map(key => ({ family: 'mind', key, score: scoreMaps.mind[key] })),
    ...TECHNIQUE_ORDER.map(key => ({ family: 'technique', key, score: scoreMaps.technique[key] })),
    ...SHOTS_ORDER.map(key => ({ family: 'shots', key, score: scoreMaps.shots[key] })),
  ];

  for (let step = 0; step < TOTAL_TALENT_POINTS; step += 1) {
    let best = null;
    let bestWeight = -Infinity;

    for (const entry of entries) {
      const currentLevel = levels[entry.family][entry.key] ?? 0;
      if (currentLevel >= 10) continue;

      const familySpent = Object.values(levels[entry.family] ?? {}).reduce((sum, val) => sum + val, 0);
      const scoreSignal = clamp((entry.score ?? 0) / 100, 0.18, 1.0);
      const randomSignal = 0.18 + seeded01(`${idSeed}|talent|${entry.family}|${entry.key}`) * 0.82;
      const blendedSignal = scoreSignal * (0.22 + intel * 0.78) + randomSignal * (0.78 - intel * 0.78);
      const focusSignal = Math.pow(blendedSignal, 1 + intel * 1.6);
      const levelPenalty = 1 + currentLevel * (0.36 - intel * 0.18);
      const familySynergy = 1 + Math.min(0.24, familySpent * (0.010 + intel * 0.006));
      const wobble = (seeded01(`${idSeed}|talent-step|${step}|${entry.family}|${entry.key}`) - 0.5) * (1 - intel) * 0.28;
      const weight = (focusSignal * familySynergy) / levelPenalty + wobble;

      if (weight > bestWeight) {
        bestWeight = weight;
        best = entry;
      }
    }

    if (!best) break;
    levels[best.family][best.key] += 1;
  }

  const maxAllocated = Math.max(...entries.map(entry => levels[entry.family][entry.key] ?? 0));
  if (maxAllocated < 10) {
    const champion = [...entries].sort((a, b) => {
      if ((b.score ?? 0) !== (a.score ?? 0)) return (b.score ?? 0) - (a.score ?? 0);
      return seeded01(`${idSeed}|champion|${b.family}|${b.key}`) - seeded01(`${idSeed}|champion|${a.family}|${a.key}`);
    })[0];

    while ((levels[champion.family][champion.key] ?? 0) < 10) {
      const donor = [...entries]
        .filter(entry => !(entry.family === champion.family && entry.key === champion.key))
        .filter(entry => (levels[entry.family][entry.key] ?? 0) > 0)
        .sort((a, b) => {
          const aLevel = levels[a.family][a.key] ?? 0;
          const bLevel = levels[b.family][b.key] ?? 0;
          if (aLevel !== bLevel) return aLevel - bLevel;
          if ((a.score ?? 0) !== (b.score ?? 0)) return (a.score ?? 0) - (b.score ?? 0);
          return seeded01(`${idSeed}|donor|${a.family}|${a.key}`) - seeded01(`${idSeed}|donor|${b.family}|${b.key}`);
        })[0];
      if (!donor) break;
      levels[donor.family][donor.key] -= 1;
      levels[champion.family][champion.key] += 1;
    }
  }

  return levels;
}

export function ensureTalentProfile(player) {
  if (!player || typeof player !== 'object') {
    return {
      talentIntelligence: 50,
      talentPointsTotal: TOTAL_TALENT_POINTS,
      talentTreeLevels: createEmptyTalentLevels(),
    };
  }

  if (!Number.isFinite(player.talentIntelligence)) {
    player.talentIntelligence = Math.round(Math.random() * 100);
  } else {
    player.talentIntelligence = clamp(Math.round(player.talentIntelligence), 0, 100);
  }

  player.talentPointsTotal = TOTAL_TALENT_POINTS;

  const hasValidLevels =
    player.talentBuildVersion === TALENT_BUILD_VERSION &&
    player.talentTreeLevels &&
    typeof player.talentTreeLevels === 'object' &&
    countAllocatedPoints(player.talentTreeLevels) === player.talentPointsTotal;

  if (!hasValidLevels) {
    const scoreMaps = getTalentScoreMaps(player);
    player.talentTreeLevels = allocateTalentPoints(player, scoreMaps, player.talentIntelligence);
    player.talentBuildVersion = TALENT_BUILD_VERSION;
  }

  return player;
}

function enrichTreeState(def, level, score, isPrimary) {
  return {
    ...def,
    level,
    score: Math.round(score),
    unlockedLevels: def.levels.filter(entry => entry.level <= level),
    nextLevel: def.levels.find(entry => entry.level === level + 1) ?? null,
    isPrimary,
  };
}

function deriveSurfaceTrees(player) {
  const profiled = ensureTalentProfile(player);
  const scores = getTalentScoreMaps(profiled).surface;
  const levels = profiled.talentTreeLevels?.surface ?? createEmptyTalentLevels().surface;

  const ranked = [...SURFACE_ORDER].sort((a, b) => scores[b] - scores[a]);
  const best = ranked[0];
  const second = ranked[1];

  const trees = {};
  for (const surface of SURFACE_ORDER) {
    trees[surface] = enrichTreeState(TALENT_TREES.surface.trees[surface], levels[surface], scores[surface], surface === best);
  }

  return { primary: best, secondary: second, trees };
}

function deriveBodyTrees(player) {
  const profiled = ensureTalentProfile(player);
  const scores = getTalentScoreMaps(profiled).body;
  const levels = profiled.talentTreeLevels?.body ?? createEmptyTalentLevels().body;
  const ranked = [...BODY_ORDER].sort((a, b) => scores[b] - scores[a]);
  const best = ranked[0];
  const second = ranked[1];

  const trees = {};
  for (const key of BODY_ORDER) {
    trees[key] = enrichTreeState(TALENT_TREES.body.trees[key], levels[key], scores[key], key === best);
  }

  return { primary: best, secondary: second, trees };
}

function deriveMindTrees(player) {
  const profiled = ensureTalentProfile(player);
  const scores = getTalentScoreMaps(profiled).mind;
  const levels = profiled.talentTreeLevels?.mind ?? createEmptyTalentLevels().mind;
  const ranked = [...MIND_ORDER].sort((a, b) => scores[b] - scores[a]);
  const best = ranked[0];
  const second = ranked[1];

  const trees = {};
  for (const key of MIND_ORDER) {
    trees[key] = enrichTreeState(TALENT_TREES.mind.trees[key], levels[key], scores[key], key === best);
  }

  return { primary: best, secondary: second, trees };
}

function deriveTechniqueTrees(player) {
  const profiled = ensureTalentProfile(player);
  const scores = getTalentScoreMaps(profiled).technique;
  const levels = profiled.talentTreeLevels?.technique ?? createEmptyTalentLevels().technique;
  const ranked = [...TECHNIQUE_ORDER].sort((a, b) => scores[b] - scores[a]);
  const best = ranked[0];
  const second = ranked[1];

  const trees = {};
  for (const key of TECHNIQUE_ORDER) {
    trees[key] = enrichTreeState(TALENT_TREES.technique.trees[key], levels[key], scores[key], key === best);
  }

  return { primary: best, secondary: second, trees };
}

function deriveShotsTrees(player) {
  const profiled = ensureTalentProfile(player);
  const scores = getTalentScoreMaps(profiled).shots;
  const levels = profiled.talentTreeLevels?.shots ?? createEmptyTalentLevels().shots;
  const ranked = [...SHOTS_ORDER].sort((a, b) => scores[b] - scores[a]);
  const best = ranked[0];
  const second = ranked[1];

  const trees = {};
  for (const key of SHOTS_ORDER) {
    trees[key] = enrichTreeState(TALENT_TREES.shots.trees[key], levels[key], scores[key], key === best);
  }
  return { primary: best, secondary: second, trees };
}

export function derivePlayerTalentTrees(player) {
  return {
    families: FUTURE_FAMILIES,
    surface: deriveSurfaceTrees(player),
    body: deriveBodyTrees(player),
    mind: deriveMindTrees(player),
    technique: deriveTechniqueTrees(player),
    shots: deriveShotsTrees(player),
  };
}

function mergeEffects(target, extra) {
  if (!extra) return target;
  const out = {
    ...target,
    attrFlat: { ...(target.attrFlat ?? {}) },
    attrMultMap: { ...(target.attrMultMap ?? {}) },
    shotPoolFlat: { ...(target.shotPoolFlat ?? {}) },
    shotQualityFlatMap: { ...(target.shotQualityFlatMap ?? {}) },
    shotSpinFlatMap: { ...(target.shotSpinFlatMap ?? {}) },
    shotPowerFlatMap: { ...(target.shotPowerFlatMap ?? {}) },
    shotBounceFlatMap: { ...(target.shotBounceFlatMap ?? {}) },
    shotCritChanceFlatMap: { ...(target.shotCritChanceFlatMap ?? {}) },
    shotCritQualityFlatMap: { ...(target.shotCritQualityFlatMap ?? {}) },
  };
  for (const [key, value] of Object.entries(extra)) {
    if (key === 'attrFlat') {
      for (const [attr, bonus] of Object.entries(value ?? {})) {
        out.attrFlat[attr] = (out.attrFlat[attr] ?? 0) + bonus;
      }
      continue;
    }
    if (key === 'attrMultMap') {
      for (const [attr, mult] of Object.entries(value ?? {})) {
        out.attrMultMap[attr] = (out.attrMultMap[attr] ?? 1) * mult;
      }
      continue;
    }
    if (
      key === 'shotPoolFlat' ||
      key === 'shotQualityFlatMap' ||
      key === 'shotSpinFlatMap' ||
      key === 'shotPowerFlatMap' ||
      key === 'shotBounceFlatMap' ||
      key === 'shotCritChanceFlatMap' ||
      key === 'shotCritQualityFlatMap'
    ) {
      for (const [shotKey, bonus] of Object.entries(value ?? {})) {
        out[key][shotKey] = (out[key][shotKey] ?? 0) + bonus;
      }
      continue;
    }
    if (typeof value === 'number') {
      const current = out[key];
      if (key.endsWith('Mult') || key.endsWith('PenaltyMult')) out[key] = (current ?? 1) * value;
      else out[key] = (current ?? 0) + value;
    }
  }
  return out;
}

export function getSurfaceTalentEffects(player, surface) {
  if (TALENT_TREES_PAUSED) {
    const surf = normalizeSurface(surface);
    return getPausedTalentEffects({ tree: derivePlayerTalentTrees(player).surface.trees[surf] });
  }
  const surf = normalizeSurface(surface);
  const state = derivePlayerTalentTrees(player).surface.trees[surf];
  let effects = { ...BASE_EFFECTS, level: state.level, attrFlat: {}, attrMultMap: {} };
  for (const entry of state.unlockedLevels) effects = mergeEffects(effects, entry.effects);
  return { ...effects, tree: state };
}

export function getBodyTalentEffects(player) {
  if (TALENT_TREES_PAUSED) {
    return getPausedTalentEffects({ body: derivePlayerTalentTrees(player).body });
  }
  const state = derivePlayerTalentTrees(player).body;
  let effects = { ...BASE_EFFECTS, level: Math.max(state.trees.PHYSIQUE.level, state.trees.TENACITY.level), attrFlat: {}, attrMultMap: {} };
  for (const key of BODY_ORDER) {
    for (const entry of state.trees[key].unlockedLevels) effects = mergeEffects(effects, entry.effects);
  }
  return { ...effects, body: state };
}

export function getMindTalentEffects(player) {
  if (TALENT_TREES_PAUSED) {
    return getPausedTalentEffects({ mind: derivePlayerTalentTrees(player).mind });
  }
  const state = derivePlayerTalentTrees(player).mind;
  let effects = { ...BASE_EFFECTS, level: Math.max(state.trees.PRESSURE.level, state.trees.TACTICAL.level), attrFlat: {}, attrMultMap: {} };
  for (const key of MIND_ORDER) {
    for (const entry of state.trees[key].unlockedLevels) effects = mergeEffects(effects, entry.effects);
  }
  return { ...effects, mind: state };
}

export function getTechniqueTalentEffects(player) {
  if (TALENT_TREES_PAUSED) {
    return getPausedTalentEffects({ technique: derivePlayerTalentTrees(player).technique });
  }
  const state = derivePlayerTalentTrees(player).technique;
  let effects = { ...BASE_EFFECTS, level: Math.max(...TECHNIQUE_ORDER.map(key => state.trees[key].level)), attrFlat: {}, attrMultMap: {} };
  for (const key of TECHNIQUE_ORDER) {
    for (const entry of state.trees[key].unlockedLevels) effects = mergeEffects(effects, entry.effects);
  }
  return { ...effects, technique: state };
}

export function getShotsTalentEffects(player) {
  if (TALENT_TREES_PAUSED) {
    return getPausedTalentEffects({ shots: derivePlayerTalentTrees(player).shots });
  }
  const state = derivePlayerTalentTrees(player).shots;
  let effects = { ...BASE_EFFECTS, level: Math.max(...SHOTS_ORDER.map(key => state.trees[key].level)), attrFlat: {}, attrMultMap: {}, shotPoolFlat: {}, shotQualityFlatMap: {}, shotSpinFlatMap: {}, shotPowerFlatMap: {}, shotBounceFlatMap: {}, shotCritChanceFlatMap: {}, shotCritQualityFlatMap: {} };
  for (const key of SHOTS_ORDER) {
    for (const entry of state.trees[key].unlockedLevels) effects = mergeEffects(effects, entry.effects);
  }
  return { ...effects, shots: state };
}

export function getCombinedTalentEffects(player, surface) {
  if (TALENT_TREES_PAUSED) {
    const state = derivePlayerTalentTrees(player);
    return getPausedTalentEffects({
      surfaceTree: state.surface.trees[normalizeSurface(surface)],
      bodyTrees: state.body,
      mindTrees: state.mind,
      techniqueTrees: state.technique,
      shotsTrees: state.shots,
    });
  }
  const surfaceFx = getSurfaceTalentEffects(player, surface);
  const bodyFx = getBodyTalentEffects(player);
  const mindFx = getMindTalentEffects(player);
  const techniqueFx = getTechniqueTalentEffects(player);
  const shotsFx = getShotsTalentEffects(player);
  const merged = mergeEffects(mergeEffects(mergeEffects(mergeEffects(mergeEffects({ ...BASE_EFFECTS, attrFlat: {}, attrMultMap: {}, shotPoolFlat: {}, shotQualityFlatMap: {}, shotSpinFlatMap: {}, shotPowerFlatMap: {}, shotBounceFlatMap: {}, shotCritChanceFlatMap: {}, shotCritQualityFlatMap: {} }, surfaceFx), bodyFx), mindFx), techniqueFx), shotsFx);
  return {
    ...merged,
    surfaceTree: surfaceFx.tree,
    bodyTrees: bodyFx.body,
    mindTrees: mindFx.mind,
    techniqueTrees: techniqueFx.technique,
    shotsTrees: shotsFx.shots,
  };
}

export function applySurfaceTalentToAttrs(attrs, player, surface) {
  if (TALENT_TREES_PAUSED) {
    return { attrs: { ...(attrs ?? {}) }, effects: getCombinedTalentEffects(player, surface) };
  }
  const fx = getCombinedTalentEffects(player, surface);
  const nextAttrs = { ...(attrs ?? {}) };
  for (const [key, value] of Object.entries(nextAttrs)) {
    if (typeof value !== 'number') continue;
    const flat = (fx.attrFlat?.[key] ?? 0) + (fx.allAttrFlat ?? 0);
    const perAttrMult = fx.attrMultMap?.[key] ?? 1;
    nextAttrs[key] = Math.round((value + flat) * perAttrMult * fx.attrMult);
  }
  for (const [key, flat] of Object.entries(fx.attrFlat ?? {})) {
    if (nextAttrs[key] == null) {
      const perAttrMult = fx.attrMultMap?.[key] ?? 1;
      nextAttrs[key] = Math.round((60 + flat + (fx.allAttrFlat ?? 0)) * perAttrMult * fx.attrMult);
    }
  }
  return { attrs: nextAttrs, effects: fx };
}

function LevelChip({ active, level, color }) {
  return (
    <div style={{
      width: 28,
      height: 28,
      borderRadius: 9,
      display: 'grid',
      placeItems: 'center',
      border: `1px solid ${active ? color : 'rgba(237,232,223,.08)'}`,
      background: active ? `linear-gradient(180deg, ${color}22, ${color}0a)` : 'rgba(255,255,255,.02)',
      color: active ? color : 'rgba(237,232,223,.32)',
      fontFamily: 'Space Mono, monospace',
      fontSize: 10,
      fontWeight: 700,
    }}>{level}</div>
  );
}

function FamilyCard({ family, active, onClick }) {
  const isActive = family.status === 'ativo';
  const theme = FAMILY_THEMES[family.id] ?? { color: '#EDE8DF', bg: 'rgba(255,255,255,.02)' };
  return (
    <button
      type="button"
      onClick={() => isActive && onClick?.(family.id)}
      style={{
        textAlign: 'left',
        padding: '12px 12px 10px',
        border: `1px solid ${active ? theme.color : (isActive ? `${theme.color}44` : 'rgba(237,232,223,.08)')}`,
        background: active ? theme.bg : (isActive ? `${theme.color}11` : 'rgba(255,255,255,.02)'),
        cursor: isActive ? 'pointer' : 'default',
      }}
    >
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, letterSpacing: '.24em', textTransform: 'uppercase', color: isActive ? theme.color : 'rgba(237,232,223,.32)' }}>{family.status}</div>
      <div style={{ marginTop: 6, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 16, textTransform: 'uppercase', color: '#EDE8DF' }}>{family.label}</div>
      <div style={{ marginTop: 5, fontFamily: 'Barlow, sans-serif', fontSize: 11, lineHeight: 1.55, color: 'rgba(237,232,223,.5)' }}>{family.desc}</div>
    </button>
  );
}

function SummaryGrid({ entries, themeMap }) {
  return (
    <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
      {entries.map(({ key, label, level, isPrimary }) => {
        const itemTheme = themeMap[key];
        return (
          <div key={key} style={{ padding: 12, border: `1px solid ${isPrimary ? `${itemTheme.color}66` : 'rgba(237,232,223,.08)'}`, background: isPrimary ? `${itemTheme.color}14` : 'rgba(255,255,255,.02)' }}>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, color: 'rgba(237,232,223,.34)', letterSpacing: '.18em', textTransform: 'uppercase' }}>{label}</div>
            <div style={{ marginTop: 4, fontFamily: 'Bebas Neue, sans-serif', fontSize: 24, lineHeight: .92, color: itemTheme.color }}>Lv {level}</div>
            <div style={{ marginTop: 2, fontFamily: 'Barlow, sans-serif', fontSize: 11, color: 'rgba(237,232,223,.55)' }}>Leitura auto-gerada do universo atual</div>
          </div>
        );
      })}
    </div>
  );
}

export function TalentTreesPanel({ player, sc = '#D4561E' }) {
  const [activeFamily, setActiveFamily] = useState('surface');
  const [activeSurface, setActiveSurface] = useState('HARD');
  const [activeBody, setActiveBody] = useState('PHYSIQUE');
  const [activeMind, setActiveMind] = useState('PRESSURE');
  const [activeTechnique, setActiveTechnique] = useState('SERVICE');
  const [activeShots, setActiveShots] = useState('TOPSPIN');
  const state = useMemo(() => derivePlayerTalentTrees(player), [player]);
  const familyState = activeFamily === 'body'
    ? state.body
    : activeFamily === 'mind'
      ? state.mind
      : activeFamily === 'technique'
        ? state.technique
        : activeFamily === 'shots'
          ? state.shots
        : state.surface;
  const order = activeFamily === 'body'
    ? BODY_ORDER
    : activeFamily === 'mind'
      ? MIND_ORDER
      : activeFamily === 'technique'
        ? TECHNIQUE_ORDER
        : activeFamily === 'shots'
          ? SHOTS_ORDER
        : SURFACE_ORDER;
  const themeMap = activeFamily === 'body'
    ? BODY_THEMES
    : activeFamily === 'mind'
      ? MIND_THEMES
      : activeFamily === 'technique'
        ? TECHNIQUE_THEMES
        : activeFamily === 'shots'
          ? SHOTS_THEMES
        : SURFACE_THEMES;
  const activeKey = activeFamily === 'body'
    ? activeBody
    : activeFamily === 'mind'
      ? activeMind
      : activeFamily === 'technique'
        ? activeTechnique
        : activeFamily === 'shots'
          ? activeShots
        : activeSurface;
  const setActiveKey = activeFamily === 'body'
    ? setActiveBody
    : activeFamily === 'mind'
      ? setActiveMind
      : activeFamily === 'technique'
        ? setActiveTechnique
        : activeFamily === 'shots'
          ? setActiveShots
        : setActiveSurface;
  const tree = familyState.trees[activeKey];
  const theme = themeMap[activeKey];
  const familyTheme = FAMILY_THEMES[activeFamily];
  const summaryEntries = order.map(key => ({
    key,
    label: themeMap[key].label,
    level: familyState.trees[key].level,
    isPrimary: familyState.trees[key].isPrimary,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '20px 22px 28px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.35fr) minmax(280px,.9fr)', gap: 16 }}>
        <div style={{ padding: 18, border: '1px solid rgba(237,232,223,.08)', background: 'linear-gradient(180deg, rgba(255,255,255,.025), rgba(255,255,255,.01))' }}>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, letterSpacing: '.34em', textTransform: 'uppercase', color: sc }}>Arvore Alpha 1.0</div>
          <div style={{ marginTop: 10, fontFamily: 'Bebas Neue, sans-serif', fontSize: 38, letterSpacing: '.04em', color: '#EDE8DF', lineHeight: .95 }}>Talentos</div>
          <p style={{ margin: '10px 0 0', fontFamily: 'Barlow, sans-serif', fontSize: 13, lineHeight: 1.75, color: 'rgba(237,232,223,.62)' }}>
            A base agora ja esta pensada como sistema de familias. Superficies, Corpo, Mente, Tecnica e Shots ja vivem no jogo, com a ficha pronta para receber as proximas familias sem refazer a estrutura.
          </p>
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 10 }}>
            {state.families.map(family => (
              <FamilyCard key={family.id} family={family} active={activeFamily === family.id} onClick={setActiveFamily} />
            ))}
          </div>
        </div>

        <div style={{ padding: 18, border: '1px solid rgba(237,232,223,.08)', background: `${familyTheme.color}09` }}>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, letterSpacing: '.32em', textTransform: 'uppercase', color: 'rgba(237,232,223,.42)' }}>Assinatura atual</div>
          <div style={{ marginTop: 8, fontFamily: 'Bebas Neue, sans-serif', fontSize: 30, lineHeight: .94, color: themeMap[familyState.primary].color }}>{themeMap[familyState.primary].label}</div>
          <div style={{ marginTop: 6, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 14, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(237,232,223,.7)' }}>{themeMap[familyState.primary].kicker}</div>
          <SummaryGrid entries={summaryEntries} themeMap={themeMap} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${order.length}, minmax(0,1fr))`, gap: 14 }}>
        {order.map(key => {
          const item = familyState.trees[key];
          const themeLocal = themeMap[key];
          const isActive = activeKey === key;
          return (
            <button key={key} onClick={() => setActiveKey(key)} style={{
              textAlign: 'left',
              border: `1px solid ${isActive ? themeLocal.color : 'rgba(237,232,223,.08)'}`,
              background: themeLocal.bg,
              padding: 16,
              cursor: 'pointer',
              boxShadow: isActive ? `0 0 0 1px rgba(${themeLocal.glow},.2), 0 18px 40px rgba(0,0,0,.32)` : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, letterSpacing: '.28em', textTransform: 'uppercase', color: themeLocal.accent }}>{themeLocal.label}</div>
                  <div style={{ marginTop: 8, fontFamily: 'Bebas Neue, sans-serif', fontSize: 34, lineHeight: .88, color: themeLocal.color }}>Lv {item.level}</div>
                </div>
                {item.isPrimary && <div style={{ padding: '5px 8px', border: `1px solid ${themeLocal.color}88`, color: themeLocal.color, fontFamily: 'Space Mono, monospace', fontSize: 8, letterSpacing: '.18em', textTransform: 'uppercase' }}>primaria</div>}
              </div>
              <div style={{ marginTop: 8, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 14, letterSpacing: '.08em', textTransform: 'uppercase', color: '#EDE8DF' }}>{item.kicker}</div>
              <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Array.from({ length: 10 }, (_, idx) => (
                  <LevelChip key={idx} active={idx < item.level} level={idx + 1} color={themeLocal.color} />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.15fr) minmax(320px,.85fr)', gap: 16 }}>
        <div style={{ border: `1px solid ${theme.color}55`, background: theme.bg, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, letterSpacing: '.28em', textTransform: 'uppercase', color: theme.accent }}>arvore ativa</div>
              <div style={{ marginTop: 8, fontFamily: 'Bebas Neue, sans-serif', fontSize: 42, lineHeight: .88, color: theme.color }}>{tree.label}</div>
              <div style={{ marginTop: 6, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 15, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(237,232,223,.78)' }}>{tree.kicker}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, letterSpacing: '.22em', textTransform: 'uppercase', color: 'rgba(237,232,223,.4)' }}>forca de leitura</div>
              <div style={{ marginTop: 6, fontFamily: 'Bebas Neue, sans-serif', fontSize: 38, lineHeight: .88, color: '#EDE8DF' }}>{tree.score}</div>
            </div>
          </div>

          <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
            {tree.levels.map(level => {
              const unlocked = level.level <= tree.level;
              const isMilestone = level.level === 5 || level.level === 10;
              return (
                <div key={level.level} style={{
                  display: 'grid',
                  gridTemplateColumns: '54px minmax(0,1fr)',
                  gap: 12,
                  padding: '12px 12px 12px 10px',
                  border: `1px solid ${unlocked ? `${theme.color}55` : 'rgba(237,232,223,.08)'}`,
                  background: unlocked ? `rgba(${theme.glow},.08)` : 'rgba(255,255,255,.02)',
                }}>
                  <div style={{ display: 'grid', placeItems: 'center', borderRight: `1px solid ${unlocked ? `${theme.color}33` : 'rgba(237,232,223,.06)'}` }}>
                    <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 28, color: unlocked ? theme.color : 'rgba(237,232,223,.22)' }}>{level.level}</div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 16, textTransform: 'uppercase', letterSpacing: '.06em', color: unlocked ? '#EDE8DF' : 'rgba(237,232,223,.4)' }}>{level.name}</div>
                      {isMilestone && <div style={{ padding: '3px 7px', border: `1px solid ${theme.color}77`, color: theme.color, fontFamily: 'Space Mono, monospace', fontSize: 8, letterSpacing: '.12em', textTransform: 'uppercase' }}>marco</div>}
                    </div>
                    <div style={{ marginTop: 6, fontFamily: 'Barlow, sans-serif', fontSize: 12, lineHeight: 1.7, color: unlocked ? 'rgba(237,232,223,.72)' : 'rgba(237,232,223,.34)' }}>{level.mechanic}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ padding: 18, border: '1px solid rgba(237,232,223,.08)', background: 'linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.01))' }}>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, letterSpacing: '.28em', textTransform: 'uppercase', color: 'rgba(237,232,223,.42)' }}>leitura do sistema</div>
            <div style={{ marginTop: 10, fontFamily: 'Barlow, sans-serif', fontSize: 13, lineHeight: 1.8, color: 'rgba(237,232,223,.64)' }}>
              Nesta fase, os niveis nao vem de escolha manual ainda. O sistema le atributos, condicao fisica, historico recente, identidade esportiva e sinais de carreira para posicionar cada jogador automaticamente dentro das familias vivas.
            </div>
          </div>
          <div style={{ padding: 18, border: '1px solid rgba(237,232,223,.08)', background: 'rgba(255,255,255,.02)' }}>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, letterSpacing: '.28em', textTransform: 'uppercase', color: 'rgba(237,232,223,.42)' }}>proximo passo da familia</div>
            {tree.nextLevel ? (
              <>
                <div style={{ marginTop: 10, fontFamily: 'Bebas Neue, sans-serif', fontSize: 30, color: theme.color, lineHeight: .92 }}>Nivel {tree.nextLevel.level}</div>
                <div style={{ marginTop: 4, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 14, letterSpacing: '.08em', textTransform: 'uppercase', color: '#EDE8DF' }}>{tree.nextLevel.name}</div>
                <div style={{ marginTop: 8, fontFamily: 'Barlow, sans-serif', fontSize: 12, lineHeight: 1.72, color: 'rgba(237,232,223,.62)' }}>{tree.nextLevel.mechanic}</div>
              </>
            ) : (
              <div style={{ marginTop: 10, fontFamily: 'Barlow, sans-serif', fontSize: 12, lineHeight: 1.72, color: 'rgba(237,232,223,.62)' }}>
                Essa superficie ja esta no teto lendario da versao alpha. Quando o sistema de pontos e escolhas entrar, esse card passa a mostrar progresso real de evolucao.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TalentTreesPanel;
