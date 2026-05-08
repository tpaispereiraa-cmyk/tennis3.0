/**
 * EnvironmentSystem.js — Physical environment simulation
 *
 * Models four environmental forces that affect gameplay:
 *
 *  WIND
 *   - Outdoor courts only (GRASS, CLAY, some HARD)
 *   - Wind direction + strength oscillate via pseudo-Perlin simulation
 *   - Gusts: sudden, brief intensity spikes (±1.5x wind)
 *   - Applies as lateral + longitudinal force on ball every dt
 *   - Serve at full strength affected more (ball airborne longer)
 *
 *  ALTITUDE
 *   - Derived from courtPhysics.altitudeFactor (1.0 = sea level, 1.10 = +10%)
 *   - Higher altitude → less air drag → ball travels faster
 *   - Applied as a multiplier on the aerodynamic drag coefficient
 *   - Indian Wells = 1.10 (visible difference in serve speed)
 *
 *  HUMIDITY
 *   - Clay courts: high humidity → heavier saibro → extra slowdown on bounce
 *   - Implemented as an additional groundFriction modifier (+0..+0.05)
 *   - Changes slowly over a match
 *
 *  TIME OF DAY / LIGHT
 *   - Visual only — does not affect physics
 *   - Determines ambient light color and shadow direction for renderers
 *   - Indoor = always bright artificial light
 *   - Outdoor: morning (cool blue), afternoon (warm golden), evening (orange)
 *   - Can trigger "low sun" condition (late afternoon) that affects visibility cue
 *
 * Integration:
 *   game.js     initGameState → initEnvironment(gs)
 *               gameTick      → updateEnvironment(gs, dt)
 *   physics.js  stepPhysics   → applyWindToBall(ball, gs.environment, dt)
 *   App.jsx / HUD             → getWindHUDInfo(gs.environment)
 *   Renderers                 → renderEnvironmentOverlay(ctx, env, W, H)
 */

// EnvironmentSystem.js has no external game imports — self-contained

// ── Time of day presets ───────────────────────────────────────────────────────
export const TIME_PRESETS = {
  morning:   { hour: 10, ambientColor: '#b8d8f0', skyTint: '#a0c8e8', shadowDir: -0.7, bright: 0.88 },
  afternoon: { hour: 14, ambientColor: '#ffd88a', skyTint: '#f0c060', shadowDir:  0.0, bright: 1.00 },
  evening:   { hour: 18, ambientColor: '#ff9040', skyTint: '#e06020', shadowDir:  0.6, bright: 0.78 },
  indoor:    { hour: 20, ambientColor: '#e8eeff', skyTint: '#c0ccff', shadowDir:  0.0, bright: 0.95 },
};

// ── Court environment presets ─────────────────────────────────────────────────
const COURT_ENV = {
  WIMBLEDON: {
    wind:        { maxStrength: 3.0, baseDir: 0.7, gustProb: 0.018, gustMult: 1.6 },
    humidity:    0.60,
    timePreset:  'afternoon',
    description: 'Sea breeze, moderate gusts',
  },
  ROLAND_GARROS: {
    wind:        { maxStrength: 2.2, baseDir: 1.2, gustProb: 0.010, gustMult: 1.4 },
    humidity:    0.72,  // heavy Parisian humidity
    timePreset:  'afternoon',
    description: 'Humid, calm winds. Heavy clay.',
  },
  US_OPEN: {
    wind:        { maxStrength: 2.8, baseDir: -0.5, gustProb: 0.015, gustMult: 1.5 },
    humidity:    0.55,
    timePreset:  'afternoon',
    description: 'New York wind, unpredictable',
  },
  O2_ARENA: {
    wind:        { maxStrength: 0.0, baseDir: 0.0, gustProb: 0.000, gustMult: 1.0 },
    humidity:    0.40,
    timePreset:  'indoor',
    description: 'Controlled indoor environment',
  },
  QUEENS_CLUB: {
    wind:        { maxStrength: 3.8, baseDir: 0.9, gustProb: 0.022, gustMult: 1.8 },
    humidity:    0.55,
    timePreset:  'morning',
    description: 'Strong London gusts, morning dew',
  },
  MONTE_CARLO: {
    wind:        { maxStrength: 1.5, baseDir: 0.3, gustProb: 0.008, gustMult: 1.3 },
    humidity:    0.68,
    timePreset:  'afternoon',
    description: 'Mediterranean calm, warm air',
  },
  INDIAN_WELLS: {
    wind:        { maxStrength: 1.8, baseDir: -0.2, gustProb: 0.012, gustMult: 1.4 },
    humidity:    0.22,  // desert dry
    timePreset:  'afternoon',
    description: 'Desert dry, altitude boost',
  },
  BERCY: {
    wind:        { maxStrength: 0.0, baseDir: 0.0, gustProb: 0.000, gustMult: 1.0 },
    humidity:    0.48,
    timePreset:  'indoor',
    description: 'Indoor Parisian atmosphere',
  },
};

// ── Oscillator helper (lightweight pseudo-noise) ──────────────────────────────
// Two sine waves at different frequencies produce slow natural oscillation
function osc(time, freq1, freq2, phase1 = 0, phase2 = 0.7) {
  return (
    Math.sin(time * freq1 + phase1) * 0.6 +
    Math.sin(time * freq2 + phase2) * 0.4
  );
}

// ── Init ──────────────────────────────────────────────────────────────────────
/**
 * Initialize environment state on the game state object.
 * Call from game.js initGameState.
 * @param {object} gs  game state (uses gs.courtKey, gs.courtMeta, gs.courtPhysics)
 */
export function initEnvironment(gs) {
  const courtKey = gs.courtKey ?? 'US_OPEN';
  const preset   = COURT_ENV[courtKey] ?? COURT_ENV.US_OPEN;
  const timeP    = TIME_PRESETS[preset.timePreset] ?? TIME_PRESETS.afternoon;
  const physics  = gs.courtPhysics ?? {};

  const isIndoor = gs.courtMeta?.surface === 'INDOOR';

  // Starting wind direction: randomize ±30° from base
  const baseDir = preset.wind.baseDir + (Math.random() - 0.5) * 0.6;

  gs.environment = {
    // ── Wind ──────────────────────────────────────────────────
    windDir:      baseDir,            // radians (0 = court length direction)
    windStrength: isIndoor ? 0 : preset.wind.maxStrength * Math.random() * 0.6,
    maxWindStrength: preset.wind.maxStrength,
    gustProb:     preset.wind.gustProb,
    gustMult:     preset.wind.gustMult,
    gustActive:   false,
    gustTimer:    0,
    gustDuration: 0,
    gustTarget:   0,
    windTimer:    Math.random() * 100,  // random start phase
    isIndoor,

    // ── Altitude ──────────────────────────────────────────────
    // Altitude real em metros derivada do altitudeFactor da quadra.
    // Fórmula barométrica padrão: ρ = ρ₀ × e^(-h/8500)
    // altitudeFactor 1.00 → nível do mar (0m)   → ρ = 1.200
    // altitudeFactor 1.05 → ~425m (Miami/AO)    → ρ ≈ 1.141
    // altitudeFactor 1.10 → ~840m (Indian Wells) → ρ ≈ 1.101
    altitudeFactor:    physics.altitudeFactor ?? 1.0,
    altitudeMetres:    Math.log(physics.altitudeFactor ?? 1.0) * 8500,
    airDensity:        1.2 * Math.exp(-Math.log(physics.altitudeFactor ?? 1.0)),
    // dragMult mantido para compatibilidade com código legado (não mais usado em physics)
    dragMult:          1.0 / (physics.altitudeFactor ?? 1.0),

    // ── Humidity ──────────────────────────────────────────────
    humidity:          preset.humidity,
    // Extra groundFriction from humidity (clay especially)
    humidityFrictionAdd: (gs.courtMeta?.surface === 'CLAY')
      ? preset.humidity * 0.06  // up to +0.043 on heavy clay
      : 0,

    // ── Time of day / Light ────────────────────────────────────
    timePreset:    preset.timePreset,
    ambientColor:  timeP.ambientColor,
    skyTint:       timeP.skyTint,
    shadowDir:     timeP.shadowDir,
    bright:        timeP.bright,
    hour:          timeP.hour,

    // ── Meta ────────────────────────────────────────────────────
    courtKey,
    description:   preset.description,

    // ── Live display info ──────────────────────────────────────
    windDisplayKmh: 0,   // computed each update
    windDisplayDir: '',   // 'N', 'NE', etc.

    // ── Running time ───────────────────────────────────────────
    time: 0,
  };

  _updateWindDisplay(gs.environment);
}

// ── Update ────────────────────────────────────────────────────────────────────
/**
 * Update environment state each game tick.
 * Call from game.js gameTick.
 * @param {object} gs
 * @param {number} dt  seconds
 */
export function updateEnvironment(gs, dt) {
  const env = gs.environment;
  if (!env) return;

  env.time += dt;

  if (env.isIndoor) return;  // no wind indoors, nothing to update physically

  // ── Wind direction slow drift ──────────────────────────────────
  env.windDir += osc(env.time, 0.03, 0.07) * dt * 0.12;

  // ── Wind strength slow oscillation ────────────────────────────
  const baseStrength = env.maxWindStrength *
    (0.35 + 0.65 * Math.abs(osc(env.time, 0.05, 0.13, 1.1, 2.3)));
  env.windStrength = baseStrength;

  // ── Gust system ───────────────────────────────────────────────
  if (env.gustActive) {
    env.gustTimer -= dt;
    if (env.gustTimer <= 0) {
      env.gustActive = false;
      env.gustTimer  = 0;
    }
  } else {
    // Chance of new gust each second
    if (Math.random() < env.gustProb * dt * 60) {
      env.gustActive   = true;
      env.gustDuration = 0.8 + Math.random() * 1.5;  // 0.8–2.3s gust
      env.gustTimer    = env.gustDuration;
      // Gust direction: mostly same direction, ±45°
      env.gustDir = env.windDir + (Math.random() - 0.5) * 0.8;
      env.gustStrength = env.windStrength * env.gustMult;

      // Log notable gusts
      if (gs.log && env.gustStrength > 2.5) {
        const kmh = Math.round(env.gustStrength * 3.6);
        gs.log.push(`💨 [RAJADA] ${kmh} km/h`);
      }
    }
  }

  // ── Humidity slow drift (barely changes during a match) ───────
  env.humidity += (Math.random() - 0.5) * 0.002 * dt;
  env.humidity  = Math.max(0.10, Math.min(0.95, env.humidity));
  env.humidityFrictionAdd = (gs.courtMeta?.surface === 'CLAY')
    ? env.humidity * 0.06
    : 0;

  _updateWindDisplay(env);
}

// ── Apply wind to ball ────────────────────────────────────────────────────────
/**
 * Apply wind force to the ball. Call from physics.js stepPhysics.
 * Also applies altitude drag reduction.
 *
 * @param {object} ball   ball state (pos, vel, spin)
 * @param {object} env    gs.environment
 * @param {number} dt     seconds
 */
export function applyWindToBall(ball, env, dt) {
  if (!env || !ball.inFlight) return;

  // ── NOTA: Altitude é agora tratada em physics.js via airDensity efetiva ──
  // env.airDensity é calculada em initEnvironment com fórmula barométrica real.
  // Não há mais nudge de velocidade aqui — o efeito é físico e consistente.

  if (env.isIndoor) return;

  // ── Vento: aplicado como aceleração (força por unidade de massa) ──────────
  // Modelo correto: o vento cria uma velocidade de fluído diferente da bola,
  // gerando força proporcional ao diferencial de velocidade.
  // wind_accel = Cd_wind * (Vwind - Vball) * |Vwind - Vball| * kFactor
  // Para manter custo computacional baixo, usamos versão simplificada:
  // F_vento ≈ Cw × ρ_ar × A × (vel_vento - vel_bola) em vez de adicionar δvel direto.
  const activeDir      = env.gustActive ? env.gustDir     : env.windDir;
  const activeStrength = env.gustActive ? env.gustStrength : env.windStrength;

  if (activeStrength < 0.05) return;

  // Velocidade do vento em coordenadas da quadra (m/s)
  const windVx = Math.cos(activeDir) * activeStrength;  // lateral (X)
  const windVy = Math.sin(activeDir) * activeStrength * 0.5; // longitudinal menor

  // Diferencial de velocidade: vento vs bola
  const diffX = windVx - ball.vel.x;
  const diffY = windVy - ball.vel.y;

  // Coeficiente de força de vento (calibrado para não sobrepor ao arrasto principal)
  const airDensity    = env.airDensity ?? 1.2;
  const { PHYSICS: _P, BALL_AREA: _A } = { PHYSICS: { ballMass: 0.057 }, BALL_AREA: Math.PI * 0.033 ** 2 };
  const windForceCoef = 0.5 * 0.55 * airDensity * (Math.PI * 0.033 ** 2) / 0.057 * 0.08;

  // Height factor: vento afeta mais a bola em altura (menos abrigo do solo)
  const heightFactor = Math.min(1.0, 0.15 + ball.pos.z * 0.85);

  ball.vel.x += diffX * windForceCoef * dt * heightFactor;
  ball.vel.y += diffY * windForceCoef * dt * heightFactor;
}

// ── Humidity friction modifier ────────────────────────────────────────────────
/**
 * Get the extra friction amount from humidity. Add to groundFriction in physics.
 * @param {object} env
 * @returns {number}  additional friction (0..0.06)
 */
export function getHumidityFriction(env) {
  return env?.humidityFrictionAdd ?? 0;
}

// ── HUD info ──────────────────────────────────────────────────────────────────
/**
 * Returns display-ready wind information for the HUD overlay.
 * @param {object} env gs.environment
 * @returns {{ kmh: number, dir: string, isGust: boolean, description: string }}
 */
export function getWindHUDInfo(env) {
  if (!env) return { kmh: 0, dir: 'CAL', isGust: false, description: 'Calm' };
  if (env.isIndoor) return { kmh: 0, dir: 'INT', isGust: false, description: 'Indoor' };

  return {
    kmh:         env.windDisplayKmh,
    dir:         env.windDisplayDir,
    isGust:      env.gustActive,
    description: env.description,
    humidity:    Math.round(env.humidity * 100),
  };
}

// ── Visual overlay ────────────────────────────────────────────────────────────
/**
 * Draw environmental visual effects on the canvas.
 * Call from each renderer AFTER drawing everything else.
 *
 * Effects:
 *  - Outdoor afternoon: warm vignette (subtle)
 *  - Indian Wells: hot desert shimmer (bottom edge heat haze)
 *  - Indoor: cooler blue ambient tint (very subtle)
 *  - Gust active: brief edge blur lines (wind lines)
 *  - Humid/clay: faint warm red haze at very low alpha
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} env    gs.environment
 * @param {number} W      canvas width
 * @param {number} H      canvas height
 */
export function renderEnvironmentOverlay(ctx, env, W, H) {
  if (!env) return;

  // ── Time of day vignette ──────────────────────────────────────
  const tint = _hexToRgba(env.ambientColor, 0.04 * (1 - env.bright));
  if (tint) {
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Edge vignette (always, dark corners) ──────────────────────
  const vig = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.3, W/2, H/2, Math.max(W,H)*0.8);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  if (env.isIndoor) {
    // ── Indoor: soft spotlight glow from top ─────────────────────
    const spotlight = ctx.createLinearGradient(0, 0, 0, H * 0.5);
    spotlight.addColorStop(0, 'rgba(220,230,255,0.06)');
    spotlight.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = spotlight;
    ctx.fillRect(0, 0, W, H * 0.5);
    return;
  }

  // ── Desert shimmer (Indian Wells) ─────────────────────────────
  if (env.courtKey === 'INDIAN_WELLS') {
    // Subtle heat-haze shimmer at the far baseline (top in ISO view)
    const shimmer = ctx.createLinearGradient(0, 0, 0, H * 0.4);
    shimmer.addColorStop(0, 'rgba(255,160,60,0.05)');
    shimmer.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shimmer;
    ctx.fillRect(0, 0, W, H * 0.4);
  }

  // ── High humidity clay haze ────────────────────────────────────
  if (env.humidity > 0.70 && env.courtKey !== 'INDOOR') {
    const hazeAlpha = (env.humidity - 0.70) * 0.10;
    ctx.fillStyle = `rgba(180,100,60,${hazeAlpha})`;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Wind gust visual effect ────────────────────────────────────
  if (env.gustActive) {
    const gustProgress = 1 - env.gustTimer / env.gustDuration;
    const peakAlpha    = Math.sin(gustProgress * Math.PI) * 0.08;

    if (peakAlpha > 0.01) {
      // Draw 3–5 diagonal wind streaks across the canvas
      ctx.save();
      ctx.strokeStyle = `rgba(255,255,255,${peakAlpha})`;
      ctx.lineWidth = 1;
      const lineCount = 5;
      const angle     = env.gustDir + Math.PI / 4;  // diagonal to wind direction

      for (let i = 0; i < lineCount; i++) {
        const x = (i / lineCount) * W * 1.5 - W * 0.25;
        const y = (i / lineCount) * H * 0.6;
        const len = 80 + Math.random() * 60;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // ── Morning dew (Queen's Club / early sessions) ────────────────
  if (env.timePreset === 'morning' && env.humidity > 0.5) {
    const dewAlpha = (env.humidity - 0.5) * 0.06;
    const dew = ctx.createLinearGradient(0, H * 0.4, 0, H * 0.75);
    dew.addColorStop(0, 'rgba(180,220,255,0)');
    dew.addColorStop(1, `rgba(180,220,255,${dewAlpha})`);
    ctx.fillStyle = dew;
    ctx.fillRect(0, H * 0.4, W, H * 0.35);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _updateWindDisplay(env) {
  const activeStrength = env.gustActive ? env.gustStrength : env.windStrength;
  const activeDir      = env.gustActive ? env.gustDir      : env.windDir;

  env.windDisplayKmh = Math.round(activeStrength * 3.6);

  // Convert angle to compass direction
  const deg = ((activeDir * 180 / Math.PI) % 360 + 360) % 360;
  const dirs = ['N','NE','E','SE','S','SO','O','NO'];
  env.windDisplayDir = dirs[Math.round(deg / 45) % 8];
}

function _hexToRgba(hex, alpha) {
  if (!hex || !hex.startsWith('#')) return null;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Wind indicator UI data ────────────────────────────────────────────────────
/**
 * Returns compact wind data for a React HUD component.
 * Wind strength shown as 0–5 bars. Direction arrow in degrees.
 */
export function getWindBarData(env) {
  if (!env || env.isIndoor) return { bars: 0, dirDeg: 0, isGust: false, kmh: 0 };

  const strength = env.gustActive ? env.gustStrength : env.windStrength;
  const bars     = Math.min(5, Math.floor(strength / env.maxWindStrength * 5));
  const dirDeg   = ((env.gustActive ? env.gustDir : env.windDir) * 180 / Math.PI + 360) % 360;

  return {
    bars,
    dirDeg,
    isGust:   env.gustActive,
    kmh:      Math.round(strength * 3.6),
    dir:      env.windDisplayDir,
    humidity: Math.round(env.humidity * 100),
    timePreset: env.timePreset,
    ambientColor: env.ambientColor,
  };
}

