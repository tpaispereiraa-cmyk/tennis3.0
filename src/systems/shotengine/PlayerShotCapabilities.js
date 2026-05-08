import { clamp } from '../../core/math.js';
import { StrokeWing } from './ShotTypes.js';

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

export function resolveStrokeWing(player, ball = null) {
  const px = player?.pos?.x ?? 0;
  const bx = ball?.pos?.x ?? px;
  const sideDelta = bx - px;
  if (Math.abs(sideDelta) < 0.18) return StrokeWing.BODY;
  return sideDelta >= 0 ? StrokeWing.FOREHAND : StrokeWing.BACKHAND;
}

export function buildPlayerShotCapabilities(player, context = {}) {
  const attrs = player?.attrs ?? {};
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
  const regularidade = attr(attrs, 'regularidade', 70);
  const mentalidade = attr(attrs, 'mentalidade', 60);
  const stamina = clamp(player?.stamina ?? 1, 0, 1);

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
    touch: norm(average(attr(attrs, 'slice', 55), attr(attrs, 'controle', 60), leitura)),
    volley: norm(volley),
    smash: norm(smash),
    servePower: norm(servePower),
    servePrecision: norm(servePrecision),
    return: norm(attr(attrs, 'devolucao', 60)),
    reading: norm(leitura),
    tacticalVision: norm(attr(attrs, 'visaoTatica', attr(attrs, 'agressividade', 60))),
    aggression: norm(attr(attrs, 'agressividade', 60)),
    control: norm(attr(attrs, 'controle', average(fhControl, bhControl))),
    consistency: norm(regularidade, 70),
    mentality: norm(mentalidade),
    movement: norm(attr(attrs, 'velocidade', 60)),
    explosiveness: norm(attr(attrs, 'explosividade', 60)),
    stamina,
    defense: norm(attr(attrs, 'defesa', 60)),
  };

  caps.riskTolerance = clamp(caps.aggression * 0.48 + caps.mentality * 0.24 + caps.consistency * 0.16 + caps.tacticalVision * 0.12, 0, 1);
  caps.errorResistance = clamp(caps.wingControl * 0.34 + caps.consistency * 0.30 + caps.mentality * 0.20 + stamina * 0.16, 0, 1);
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
