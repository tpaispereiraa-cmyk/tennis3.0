import { SHOCK_SCALE, SHOCK_MODES } from './ShockTypes.js';

const truths = (...items) => items.map(([id, weight, culpability, severity, publicLabel]) => ({ id, weight, culpability, severity, publicLabel }));

export const SHOCK_CATALOG = Object.freeze([
  { id: 'FAREWELL_ANNOUNCEMENT', family: 'CAREER', scope: 'PLAYER', scale: SHOCK_SCALE.SIGNIFICANT, riskChannel: 'careerPressure', minAge: 30, cooldownYears: 2, weights: [6, 10], duration: [3, 8], immediatePublic: true, truths: truths(['PLANNED_EXIT', 75, 0, 35, 'despedida planejada'], ['BODY_LIMIT', 25, 0, 50, 'limite físico']) },
  { id: 'HEALTH_INTERRUPTION', family: 'HEALTH', scope: 'PLAYER', scale: SHOCK_SCALE.SIGNIFICANT, riskChannel: 'health', cooldownYears: 2, weights: [8, 12], duration: [4, 10], immediatePublic: true, truths: truths(['SURGERY_SETBACK', 48, 0, 55, 'tratamento prolongado'], ['CHRONIC_CONDITION', 42, 0, 62, 'condição persistente'], ['SERIOUS_ILLNESS', 10, 0, 82, 'quadro médico grave']) },
  { id: 'PERSONAL_RUPTURE', family: 'LIFE', scope: 'PLAYER', scale: SHOCK_SCALE.SIGNIFICANT, riskChannel: 'publicLife', cooldownYears: 2, weights: [8, 12], duration: [3, 8], immediatePublic: false, truths: truths(['BEREAVEMENT', 30, 0, 60, 'luto familiar'], ['BURNOUT', 45, 0, 48, 'esgotamento'], ['PRIVATE_ACCIDENT', 25, 0, 52, 'emergência pessoal']) },
  { id: 'COACH_SHOCK', family: 'CAREER', scope: 'PLAYER', scale: SHOCK_SCALE.FLASH, riskChannel: 'isolation', cooldownYears: 1, weights: [9, 13], duration: [2, 5], immediatePublic: true, truths: truths(['TRUST_BREAK', 48, 10, 38, 'ruptura de confiança'], ['METHOD_CONFLICT', 42, 0, 30, 'choque de métodos'], ['STAFF_MISCONDUCT', 10, 0, 65, 'conduta da equipe']) },
  { id: 'INTEGRITY_DOPING', family: 'INTEGRITY', scope: 'PLAYER', scale: SHOCK_SCALE.SEISMIC, riskChannel: 'integrity', cooldownYears: 4, weights: [1.05, 2.1], duration: [7, 15], immediatePublic: false, truths: truths(['INTENTIONAL_USE', 8, 95, 90, 'violação intencional'], ['CONTAMINATED_SUPPLEMENT', 34, 18, 48, 'suplemento contaminado'], ['MEDICAL_NAGLIGENCE', 18, 34, 58, 'falha médica'], ['WHEREABOUTS_FAILURE', 25, 42, 52, 'falha de localização'], ['FALSE_POSITIVE', 15, 0, 42, 'resultado contestado']) },
  { id: 'INTEGRITY_BETTING', family: 'INTEGRITY', scope: 'PLAYER', scale: SHOCK_SCALE.SEISMIC, riskChannel: 'integrity', cooldownYears: 4, weights: [.8, 1.8], duration: [7, 15], immediatePublic: false, truths: truths(['MATCH_FIXING', 5, 100, 95, 'manipulação de partida'], ['OWN_BETTING', 13, 82, 76, 'apostas próprias'], ['INSIDER_INFO', 22, 62, 66, 'informação privilegiada'], ['ENTOURAGE_LINK', 35, 22, 52, 'vínculo do entorno'], ['COERCED_CONTACT', 10, 12, 54, 'abordagem coercitiva'], ['FALSE_ALLEGATION', 15, 0, 40, 'acusação infundada']) },
  { id: 'HEROIC_ACT', family: 'POSITIVE', scope: 'PLAYER', scale: SHOCK_SCALE.SIGNIFICANT, riskChannel: 'publicLife', cooldownYears: 2, riskBias: 18, weights: [7, 10], duration: [2, 5], immediatePublic: true, truths: truths(['PUBLIC_COURAGE', 55, 0, 42, 'ato de coragem'], ['COMMUNITY_LEADERSHIP', 45, 0, 35, 'liderança comunitária']) },
  { id: 'WHISTLEBLOWER', family: 'POSITIVE', scope: 'PLAYER', scale: SHOCK_SCALE.SEISMIC, riskChannel: 'integrity', cooldownYears: 4, riskBias: 12, weights: [.7, 1.4], duration: [6, 12], immediatePublic: false, truths: truths(['SYSTEM_EXPOSURE', 65, 0, 70, 'denúncia institucional'], ['TEAM_EXPOSURE', 35, 0, 58, 'denúncia interna']) },
  { id: 'BREAKTHROUGH_SHOCK', family: 'COMPETITIVE', scope: 'PLAYER', scale: SHOCK_SCALE.FLASH, riskChannel: 'competitive', maxAge: 25, cooldownYears: 1, weights: [10, 13], duration: [1, 3], immediatePublic: true, truths: truths(['GIANT_KILLING_RUN', 70, 0, 34, 'campanha de ruptura'], ['STYLE_REVOLUTION', 30, 0, 38, 'nova assinatura tática']) },
  { id: 'FEDERATION_CRISIS', family: 'INSTITUTION', scope: 'WORLD', scale: SHOCK_SCALE.SEISMIC, cooldownYears: 4, weights: [.7, 1.6], duration: [6, 12], immediatePublic: true, truths: truths(['GOVERNANCE_FAILURE', 70, 55, 75, 'crise de governança'], ['AUDIT_DISPUTE', 30, 25, 62, 'auditoria contestada']) },
  { id: 'TOURNAMENT_COLLAPSE', family: 'INSTITUTION', scope: 'WORLD', scale: SHOCK_SCALE.SIGNIFICANT, cooldownYears: 3, weights: [1.1, 2.2], duration: [4, 9], immediatePublic: true, truths: truths(['FINANCIAL_FAILURE', 62, 28, 62, 'colapso financeiro'], ['SAFETY_FAILURE', 38, 42, 70, 'falha de segurança']) },
  { id: 'PLAYER_BOYCOTT', family: 'INSTITUTION', scope: 'WORLD', scale: SHOCK_SCALE.SEISMIC, cooldownYears: 4, weights: [.6, 1.4], duration: [5, 10], immediatePublic: false, truths: truths(['LABOR_DISPUTE', 60, 10, 68, 'disputa trabalhista'], ['SAFETY_PROTEST', 40, 0, 64, 'protesto por segurança']) },
  { id: 'RULE_REVOLUTION', family: 'INSTITUTION', scope: 'WORLD', scale: SHOCK_SCALE.ERA_DEFINING, cooldownYears: 7, weights: [.18, .5], duration: [10, 18], immediatePublic: true, truths: truths(['FORMAT_REFORM', 55, 0, 80, 'reforma de formato'], ['TECH_REFORM', 45, 0, 76, 'reforma tecnológica']) },
  { id: 'SURFACE_CRISIS', family: 'INSTITUTION', scope: 'WORLD', scale: SHOCK_SCALE.SIGNIFICANT, cooldownYears: 3, weights: [.8, 1.8], duration: [4, 8], immediatePublic: true, truths: truths(['INJURY_CLUSTER', 55, 12, 66, 'onda de lesões'], ['QUALITY_DISPUTE', 45, 18, 55, 'disputa técnica']) },
]);

export function getShockDefinition(id) { return SHOCK_CATALOG.find(def => def.id === id) ?? null; }
export function definitionWeight(def, mode = SHOCK_MODES.REALISTIC) { return def.weights?.[mode === SHOCK_MODES.DRAMATIC ? 1 : 0] ?? 0; }
export function listEligibleDefinitions(director, mode, context = {}) {
  return SHOCK_CATALOG.filter(def => {
    if ((director.familyCooldowns?.[def.family] ?? -Infinity) > Number(context.year ?? director.year)) return false;
    if (def.scale === SHOCK_SCALE.ERA_DEFINING && director.lastSeismicYear != null && Number(context.year) - director.lastSeismicYear < 4) return false;
    return definitionWeight(def, mode) > 0;
  });
}
