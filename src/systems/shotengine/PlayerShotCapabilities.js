import { clamp } from '../../core/math.js';
import { StrokeWing } from './ShotTypes.js';
import { getTalentRuntimeEffects } from '../talents/TalentIdentitySystem.js';

function attr(attrs, key, fallback = 60) {
  const value = attrs?.[key];
  return Number.isFinite(value) ? value : fallback;
}

function norm(value, fallback = 60) {
  return clamp((Number.isFinite(value) ? value : fallback) / 100, 0, 1);
}

function average(...values) {
  const usable = values.filter(Number.isFinite);
  if (!usable.length) return 60;
  return usable.reduce((sum, value) => sum + value, 0) / usable.length;
}

function aggressionFromModernProfile({ attrs, prefs, tacticalVision, wingPower, explosiveness }) {
  const legacy = attrs?.agressividade;
  if (Number.isFinite(legacy)) return legacy;

  // "agressividade" não existe mais como atributo v4. Nunca devemos voltar ao
  // fallback 60, pois isso deixa visão tática e perfil de risco sem efeito.
  // A propensão de iniciativa é derivada da ficha moderna e das preferências,
  // preservando o antigo campo apenas para saves legados.
  const risk = prefs?.riskProfile ?? 'CALCULATED';
  const cadence = prefs?.rallyCadence ?? 'BALANCED';
  const riskSignal = risk === 'ALLOUT' ? 84
    : risk === 'GAMBLER' ? 76
      : risk === 'CALCULATED' ? 64
        : risk === 'SAFETY_FIRST' ? 46
          : risk === 'SAFE' ? 42
            : 58;
  const cadenceSignal = cadence === 'EXPLOSIVE' || cadence === 'EARLY_ATTACK' ? 82
    : cadence === 'PATIENT' ? 46
      : cadence === 'MEASURED' ? 55
        : 64;

  return clamp(
    tacticalVision * 0.42 + wingPower * 0.24 + explosiveness * 0.14 + riskSignal * 0.13 + cadenceSignal * 0.07,
    38,
    92,
  );
}

export function resolveStrokeWing(player, ball = null) {
  const px = player?.pos?.x ?? 0;
  const bx = ball?.pos?.x ?? px;
  const sideDelta = bx - px;
  if (Math.abs(sideDelta) < 0.18) return StrokeWing.BODY;
  const hand = String(player?.handedness ?? player?.dominantHand ?? player?.maoDominante ?? 'right').toLowerCase();
  const leftHanded = hand === 'left' || hand === 'l' || hand === 'canhoto' || hand === 'esquerda';
  return sideDelta * (leftHanded ? -1 : 1) >= 0 ? StrokeWing.FOREHAND : StrokeWing.BACKHAND;
}

export function buildPlayerShotCapabilities(player, context = {}) {
  const attrs = player?.attrs ?? {};
  const prefs = player?.prefs ?? {};
  const wing = context.wing ?? resolveStrokeWing(player, context.ball);

  const fhPower = attr(attrs, 'fhPotencia', attr(attrs, 'potencia', 60));
  const bhPower = attr(attrs, 'bhPotencia', attr(attrs, 'potencia', 58));
  const fhControl = attr(attrs, 'fhControle', attr(attrs, 'controle', 60));
  const bhControl = attr(attrs, 'bhControle', attr(attrs, 'controle', 58));
  const wingPowerRaw = wing === StrokeWing.BACKHAND ? bhPower : wing === StrokeWing.BODY ? average(fhPower, bhPower) - 6 : fhPower;
  const wingControlRaw = wing === StrokeWing.BACKHAND ? bhControl : wing === StrokeWing.BODY ? average(fhControl, bhControl) - 8 : fhControl;
  const servePower = attr(attrs, 'saqueForca', attr(attrs, 'saque', 60));
  const servePrecision = attr(attrs, 'saquePrecisao', attr(attrs, 'saque', 60));
  const volley = attr(attrs, 'volley', attr(attrs, 'jogoDeRede', 55));
  const smash = attr(attrs, 'smash', attr(attrs, 'jogoDeRede', 55));
  const leitura = attr(attrs, 'leitura', 60);
  const visaoTatica = attr(attrs, 'visaoTatica', attr(attrs, 'agressividade', 60));
  const adaptacao = attr(attrs, 'adaptacao', 70);
  const regularidade = attr(attrs, 'regularidade', 70);
  const mentalidade = attr(attrs, 'mentalidade', 60);
  const stamina = clamp(player?.stamina ?? 1, 0, 1);
  const momentum = clamp(player?.ctx?.momentum ?? 0.5, 0, 1);
  const mood = clamp(player?.ctx?._moodFactor ?? 0.5, 0, 1);
  // Momentum é a onda curta; mood é a confiança acumulada. Os dois entram
  // pequenos para mudar a execução sem virar um buff mágico de vencedor.
  const matchConfidence = clamp(0.5 + (momentum - 0.5) * 0.62 + (mood - 0.5) * 0.38, 0, 1);
  const talent = getTalentRuntimeEffects(player, context);
  const wingPowerForProfile = wing === StrokeWing.BACKHAND ? bhPower : wing === StrokeWing.BODY ? average(fhPower, bhPower) : fhPower;
  const aggression = aggressionFromModernProfile({
    attrs,
    prefs,
    tacticalVision: visaoTatica,
    wingPower: wingPowerForProfile,
    explosiveness: attr(attrs, 'explosividade', 60),
  });
  const courtAdaptability = clamp((context?.gs?.courtMods?.adaptabilityMod ?? 0) * (adaptacao / 100), -0.12, 0.18);

  const caps = {
    wing,
    wingPower: norm(wingPowerRaw),
    wingControl: norm(wingControlRaw),
    forehandPower: norm(fhPower),
    forehandControl: norm(fhControl),
    backhandPower: norm(bhPower),
    backhandControl: norm(bhControl),
    topspin: norm(attr(attrs, 'topspin', 60)),
    slice: norm(attr(attrs, 'slice', 55)),
    // "controle" era atributo pré-v4 e caía em 60 para todo jogador moderno.
    // Toque agora reconhece os dois lados da raquete como deveria.
    touch: norm(average(attr(attrs, 'slice', 55), fhControl, bhControl, leitura)),
    volley: norm(volley),
    smash: norm(smash),
    servePower: norm(servePower),
    servePrecision: norm(servePrecision),
    return: norm(attr(attrs, 'devolucao', 60)),
    reading: norm(leitura),
    tacticalVision: norm(visaoTatica),
    aggression: norm(aggression),
    control: norm(attr(attrs, 'controle', average(fhControl, bhControl))),
    consistency: norm(regularidade, 70),
    mentality: norm(mentalidade),
    movement: norm(attr(attrs, 'velocidade', 60)),
    explosiveness: norm(attr(attrs, 'explosividade', 60)),
    stamina,
    matchConfidence,
    defense: norm(attr(attrs, 'defesa', 60)),
    adaptability: norm(adaptacao),
    courtAdaptability,
  };

  // A rota nunca muda o teto do atleta: ela altera como seu talento aparece
  // nas situações de quadra. Os ganhos são pequenos e somam à identidade.
  const add = (key, value) => { caps[key] = clamp((caps[key] ?? 0.6) + value, 0, 1); };
  add('wingPower', talent.powerAdd); add('forehandPower', talent.powerAdd); add('backhandPower', talent.powerAdd);
  add('wingControl', talent.precisionAdd); add('forehandControl', talent.precisionAdd); add('backhandControl', talent.precisionAdd);
  add('topspin', talent.topspinAdd); add('slice', talent.sliceAdd); add('volley', talent.volleyAdd); add('smash', talent.smashAdd);
  add('servePower', talent.servePowerAdd); add('servePrecision', talent.servePrecisionAdd); add('return', talent.returnAdd);
  add('reading', talent.readingAdd); add('tacticalVision', talent.tacticalAdd); add('mentality', talent.mentalityAdd); add('movement', talent.movementAdd); add('explosiveness', talent.accelAdd); add('defense', talent.defenseAdd);
  caps.talent = talent;

  const confidenceDelta = (matchConfidence - 0.5) * 2;
  caps.riskTolerance = clamp(caps.aggression * 0.48 + caps.mentality * 0.24 + caps.consistency * 0.16 + caps.tacticalVision * 0.12 + confidenceDelta * 0.055, 0, 1);
  caps.errorResistance = clamp(caps.wingControl * 0.34 + caps.consistency * 0.30 + caps.mentality * 0.20 + stamina * 0.16 + confidenceDelta * 0.035, 0, 1);
  caps.spinSecurity = clamp(caps.topspin * 0.70 + caps.wingControl * 0.20 + caps.reading * 0.10, 0, 1);
  caps.netSkill = clamp(caps.volley * 0.68 + caps.smash * 0.22 + caps.reading * 0.10, 0, 1);

  return Object.freeze(caps);
}

export function getCapabilityForShot(caps, shotDef) {
  if (!shotDef) return 0;
  const primary = caps?.[shotDef.primaryAttr] ?? 0.6;
  const control = caps?.[shotDef.controlAttr] ?? caps?.control ?? 0.6;
  const power = caps?.[shotDef.powerAttr] ?? caps?.wingPower ?? 0.6;
  return clamp(primary * 0.46 + control * 0.34 + power * 0.20, 0, 1);
}
