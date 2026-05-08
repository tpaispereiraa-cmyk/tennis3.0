/**
 * sound.js — Audio engine v3
 *
 * ARQUITETURA:
 *   • Sons sintéticos via Web Audio API (hit, bounce, mishit, ace, winner, net, out, game, set, double fault)
 *   • Torcida sintética em loop com intensidade que sobe conforme rally
 *   • Narrador via Web Speech API (SpeechSynthesis) — fala o placar, game, set, partida
 *   • Upload de arquivos customizados por tipo de som (IndexedDB)
 *   • Controles por categoria: hit/bounce, crowd, events, narrator
 *   • Configurações persistidas em localStorage
 *
 * API PÚBLICA:
 *   toggleSound()                       -> Promise<boolean>
 *   isSoundOn()                         -> boolean
 *   playSound(type, meta)               -> void
 *   updateCrowd(rallyLen)               -> void
 *   announceScore(gs, winnerIdx, event) -> void
 *   getSoundSettings()                  -> object
 *   updateSoundSettings(patch)          -> void
 *   uploadCustomSound(type, file)       -> Promise<void>
 *   removeCustomSound(type)             -> Promise<void>
 *   getCustomSoundTypes()               -> string[]
 *   previewSound(type)                  -> void
 *   UPLOADABLE_SOUND_TYPES              -> object
 */

// ─────────────────────────────────────────────────────────────────────────────
// ESTADO GLOBAL
// ─────────────────────────────────────────────────────────────────────────────

let ctx          = null;
let soundOn      = false;
let crowdGain    = null;
let crowdNode    = null;
let crowdLevel   = 0;
let lastHitMs    = 0;
let lastBounceMs = 0;

const customBuffers = {};

const DEFAULT_SETTINGS = {
  masterVolume:    0.85,
  hitVolume:       0.80,
  crowdVolume:     0.60,
  eventsVolume:    0.90,
  narratorVolume:  0.80,
  narratorEnabled: true,
  hitsEnabled:     true,
  crowdEnabled:    true,
  eventsEnabled:   true,
  narratorLang:    'pt-BR',
  narratorRate:    1.05,
  narratorPitch:   0.95,
};

let settings = { ...DEFAULT_SETTINGS };

// ─────────────────────────────────────────────────────────────────────────────
// PERSISTÊNCIA
// ─────────────────────────────────────────────────────────────────────────────

function loadSettings() {
  try {
    const raw = localStorage.getItem('hv_sound_settings');
    if (raw) settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (_) {}
}
function saveSettings() {
  try { localStorage.setItem('hv_sound_settings', JSON.stringify(settings)); } catch (_) {}
}
loadSettings();

export function getSoundSettings() { return { ...settings }; }
export function updateSoundSettings(patch) {
  settings = { ...settings, ...patch };
  saveSettings();
  if (crowdGain && soundOn && ctx) {
    const t = crowdLevel * settings.crowdVolume * settings.masterVolume * 0.22;
    crowdGain.gain.linearRampToValueAtTime(Math.max(0.001, t), ctx.currentTime + 0.3);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INDEXEDDB
// ─────────────────────────────────────────────────────────────────────────────

const DB_NAME  = 'hv_sounds';
const DB_STORE = 'sounds';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore(DB_STORE, { keyPath: 'type' });
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}
async function dbPut(type, buf) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put({ type, data: buf });
    tx.oncomplete = resolve; tx.onerror = e => reject(e.target.error);
  });
}
async function dbGet(type) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(DB_STORE, 'readonly');
    const req = tx.objectStore(DB_STORE).get(type);
    req.onsuccess = e => resolve(e.target.result?.data ?? null);
    req.onerror   = e => reject(e.target.error);
  });
}
async function dbDelete(type) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).delete(type);
    tx.oncomplete = resolve; tx.onerror = e => reject(e.target.error);
  });
}
async function dbListKeys() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(DB_STORE, 'readonly');
    const req = tx.objectStore(DB_STORE).getAllKeys();
    req.onsuccess = e => resolve(e.target.result ?? []);
    req.onerror   = e => reject(e.target.error);
  });
}

async function loadCustomBuffers() {
  if (!ctx) return;
  try {
    const keys = await dbListKeys();
    for (const type of keys) {
      const buf = await dbGet(type);
      if (buf) {
        try { customBuffers[type] = await ctx.decodeAudioData(buf.slice(0)); } catch (_) {}
      }
    }
  } catch (_) {}
}

export async function uploadCustomSound(type, file) {
  const arrayBuffer = await file.arrayBuffer();
  await dbPut(type, arrayBuffer);
  if (ctx) {
    try { customBuffers[type] = await ctx.decodeAudioData(arrayBuffer.slice(0)); }
    catch (_) { throw new Error('Formato de audio invalido ou nao suportado.'); }
  }
  if (type === 'CROWD_LOOP' && soundOn) buildCustomCrowd();
}

export async function removeCustomSound(type) {
  await dbDelete(type);
  delete customBuffers[type];
}

export function getCustomSoundTypes() { return Object.keys(customBuffers); }

export const UPLOADABLE_SOUND_TYPES = {
  HIT:          { label: 'Batida na Raquete',         emoji: '🎾', desc: 'Som da bola ao ser golpeada' },
  MISHIT:       { label: 'Batida Fora do Sweet Spot', emoji: '😬', desc: 'Frame shot / pé-frio' },
  BOUNCE:       { label: 'Quique no Chão',             emoji: '⬇️', desc: 'Bola batendo na quadra' },
  NET:          { label: 'Bola na Rede',               emoji: '🕸️', desc: 'Thud ao bater na rede' },
  OUT:          { label: 'Bola Fora',                  emoji: '📢', desc: 'Bola saindo da quadra' },
  ACE:          { label: 'Ace',                        emoji: '⚡', desc: 'Saque que nao foi tocado' },
  WINNER:       { label: 'Winner',                     emoji: '💥', desc: 'Ponto direto impecavel' },
  DOUBLE_FAULT: { label: 'Dupla Falta',                emoji: '😔', desc: 'Dois saques errados seguidos' },
  GAME:         { label: 'Game',                       emoji: '🎮', desc: 'Fim de um game' },
  SET:          { label: 'Set',                        emoji: '🏆', desc: 'Fim de um set' },
  CROWD_LOOP:   { label: 'Torcida (loop)',             emoji: '👥', desc: 'Barulho ambiente da torcida' },
};

// ─────────────────────────────────────────────────────────────────────────────
// AUDIO CONTEXT + CROWD
// ─────────────────────────────────────────────────────────────────────────────

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    buildCrowd();
    loadCustomBuffers();
  }
  return ctx;
}

function buildCrowd() {
  const ac  = ctx;
  const len = ac.sampleRate * 3;
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d   = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.55;

  const bp1 = ac.createBiquadFilter(); bp1.type = 'bandpass'; bp1.frequency.value = 380; bp1.Q.value = 0.55;
  const bp2 = ac.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.value = 210; bp2.Q.value = 0.40;
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -22; comp.ratio.value = 5;

  crowdGain = ac.createGain(); crowdGain.gain.value = 0;
  crowdNode = ac.createBufferSource(); crowdNode.buffer = buf; crowdNode.loop = true;
  crowdNode.connect(bp1); bp1.connect(bp2); bp2.connect(crowdGain);
  crowdGain.connect(comp); comp.connect(ac.destination);
  crowdNode.start();
}

let _crowdCustomNode = null;
let _crowdCustomGain = null;

function buildCustomCrowd() {
  if (!ctx || !customBuffers['CROWD_LOOP']) return;
  try { if (_crowdCustomNode) _crowdCustomNode.stop(); } catch (_) {}
  _crowdCustomGain = ctx.createGain(); _crowdCustomGain.gain.value = 0;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 4;
  _crowdCustomNode = ctx.createBufferSource();
  _crowdCustomNode.buffer = customBuffers['CROWD_LOOP']; _crowdCustomNode.loop = true;
  _crowdCustomNode.connect(_crowdCustomGain); _crowdCustomGain.connect(comp); comp.connect(ctx.destination);
  _crowdCustomNode.start();
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIMITIVOS
// ─────────────────────────────────────────────────────────────────────────────

function masterGainVal(category) {
  const m = settings.masterVolume;
  if (category === 'hit')   return settings.hitsEnabled   ? m * settings.hitVolume    : 0;
  if (category === 'crowd') return settings.crowdEnabled  ? m * settings.crowdVolume  : 0;
  if (category === 'event') return settings.eventsEnabled ? m * settings.eventsVolume : 0;
  return m;
}

function tone(freq, dur, gain = 0.25, type = 'sine', startTime = 0, category = 'event') {
  const vol = masterGainVal(category); if (vol === 0) return;
  const ac  = getCtx(); const t = ac.currentTime + startTime;
  const osc = ac.createOscillator(); const env = ac.createGain();
  osc.type = type; osc.frequency.value = freq;
  env.gain.setValueAtTime(0.001, t);
  env.gain.exponentialRampToValueAtTime(gain * vol, t + 0.005);
  env.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(env); env.connect(ac.destination);
  osc.start(t); osc.stop(t + dur + 0.01);
}

function noise(dur, gain = 0.12, filterFreq = 600, startTime = 0, category = 'event') {
  const vol = masterGainVal(category); if (vol === 0) return;
  const ac  = getCtx(); const t = ac.currentTime + startTime;
  const len = Math.ceil(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d   = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource(); src.buffer = buf;
  const flt = ac.createBiquadFilter(); flt.type = 'bandpass'; flt.frequency.value = filterFreq; flt.Q.value = 1.2;
  const env = ac.createGain();
  env.gain.setValueAtTime(0.001, t);
  env.gain.exponentialRampToValueAtTime(gain * vol, t + 0.003);
  env.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(flt); flt.connect(env); env.connect(ac.destination);
  src.start(t); src.stop(t + dur + 0.01);
}

function playBuffer(buf, gain = 1.0) {
  if (!buf || !ctx) return;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const env = ctx.createGain(); env.gain.value = gain * settings.masterVolume;
  src.connect(env); env.connect(ctx.destination); src.start();
}

// ─────────────────────────────────────────────────────────────────────────────
// TORCIDA
// ─────────────────────────────────────────────────────────────────────────────

function setCrowdLevel(level) {
  crowdLevel = Math.max(0, Math.min(1, level));
  if (!soundOn || !settings.crowdEnabled) return;
  if (customBuffers['CROWD_LOOP'] && _crowdCustomGain && ctx) {
    const t = crowdLevel * settings.crowdVolume * settings.masterVolume * 0.9;
    _crowdCustomGain.gain.linearRampToValueAtTime(Math.max(0.001, t), ctx.currentTime + 0.8);
    if (crowdGain) crowdGain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    return;
  }
  if (crowdGain && ctx) {
    const t = crowdLevel * settings.crowdVolume * settings.masterVolume * 0.22;
    crowdGain.gain.linearRampToValueAtTime(Math.max(0.001, t), ctx.currentTime + 0.8);
  }
}

function crowdReact(intensity = 0.5) {
  if (!soundOn || !settings.crowdEnabled) return;
  const ac = getCtx();
  if (customBuffers['CROWD_LOOP'] && _crowdCustomGain) {
    const base = crowdLevel * settings.crowdVolume * settings.masterVolume * 0.9;
    const peak = Math.min(1.0, base + intensity * 0.5);
    _crowdCustomGain.gain.cancelScheduledValues(ac.currentTime);
    _crowdCustomGain.gain.setValueAtTime(base, ac.currentTime);
    _crowdCustomGain.gain.linearRampToValueAtTime(peak, ac.currentTime + 0.08);
    _crowdCustomGain.gain.exponentialRampToValueAtTime(Math.max(0.001, base), ac.currentTime + 2.0);
    return;
  }
  if (!crowdGain) return;
  const g    = crowdGain.gain;
  const base = crowdLevel * settings.crowdVolume * settings.masterVolume * 0.22;
  const peak = Math.min(0.38, base + intensity * 0.28 * settings.masterVolume);
  g.cancelScheduledValues(ac.currentTime);
  g.setValueAtTime(base, ac.currentTime);
  g.linearRampToValueAtTime(peak, ac.currentTime + 0.08);
  g.exponentialRampToValueAtTime(Math.max(0.001, base), ac.currentTime + 1.8);
}

// ─────────────────────────────────────────────────────────────────────────────
// NARRADOR
// ─────────────────────────────────────────────────────────────────────────────

const SCORE_PT = ['zero', 'quinze', 'trinta', 'quarenta', 'vantagem'];
let _narratorQueue = [];
let _narratorBusy  = false;
let _lastNarrateMs = 0;

function flushNarrator() {
  if (_narratorBusy || _narratorQueue.length === 0) return;
  if (!('speechSynthesis' in window)) return;
  const text = _narratorQueue.shift();
  _narratorBusy = true;
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang   = settings.narratorLang;
  utt.rate   = settings.narratorRate;
  utt.pitch  = settings.narratorPitch;
  utt.volume = settings.narratorVolume * settings.masterVolume;
  const voices = window.speechSynthesis.getVoices();
  const match  = voices.find(v => v.lang.startsWith(settings.narratorLang.split('-')[0]));
  if (match) utt.voice = match;
  utt.onend  = () => { _narratorBusy = false; setTimeout(flushNarrator, 120); };
  utt.onerror = () => { _narratorBusy = false; setTimeout(flushNarrator, 120); };
  window.speechSynthesis.speak(utt);
}

function narrate(text) {
  if (!soundOn || !settings.narratorEnabled) return;
  if (!('speechSynthesis' in window)) return;
  const now = performance.now();
  if (now - _lastNarrateMs < 350) return;
  _lastNarrateMs = now;
  if (_narratorQueue.length >= 2) _narratorQueue = _narratorQueue.slice(-1);
  _narratorQueue.push(text);
  flushNarrator();
}

export function announceScore(gs, winnerIdx, event) {
  if (!soundOn || !settings.narratorEnabled) return;
  const p0 = gs.players[0], p1 = gs.players[1];
  const w  = gs.players[winnerIdx];

  switch (event) {
    case 'ACE':          narrate(`Ace de ${w.name}!`); break;
    case 'DOUBLE_FAULT': narrate(`Dupla falta`); break;
    case 'MATCH':        narrate(`Partida! Vence ${w.name}!`); break;
    case 'GAME':         narrate(`Game ${w.name}. ${p0.games} a ${p1.games}`); break;
    case 'SET':          narrate(`Set ${w.name}! ${p0.sets} a ${p1.sets} nos sets`); break;
    case 'POINT': {
      if (gs.inTiebreak) {
        narrate(`${gs.tbScore[0]} a ${gs.tbScore[1]}`);
      } else if (p0.score === 3 && p1.score === 3) {
        narrate('Deuce');
      } else if (p0.score === 4) {
        narrate(`Vantagem ${p0.name}`);
      } else if (p1.score === 4) {
        narrate(`Vantagem ${p1.name}`);
      } else {
        const sS = SCORE_PT[gs.players[gs.server].score]   ?? '';
        const rS = SCORE_PT[gs.players[gs.receiver].score] ?? '';
        if (gs.players[gs.server].score === gs.players[gs.receiver].score) {
          narrate(`${sS} igual`);
        } else {
          narrate(`${sS} a ${rS}`);
        }
      }
      break;
    }
    default: break;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// API PÚBLICA
// ─────────────────────────────────────────────────────────────────────────────

export async function toggleSound() {
  if (!soundOn) {
    const ac = getCtx();
    if (ac.state === 'suspended') await ac.resume();
    soundOn = true;
    if (customBuffers['CROWD_LOOP']) buildCustomCrowd();
    if (crowdGain && settings.crowdEnabled) {
      crowdGain.gain.setValueAtTime(0.001, ac.currentTime);
      crowdGain.gain.linearRampToValueAtTime(
        0.05 * settings.crowdVolume * settings.masterVolume, ac.currentTime + 1.2
      );
    }
  } else {
    soundOn = false;
    if (crowdGain  && ctx) crowdGain.gain.setValueAtTime(0.001, ctx.currentTime);
    if (_crowdCustomGain && ctx) _crowdCustomGain.gain.setValueAtTime(0.001, ctx.currentTime);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    _narratorQueue = []; _narratorBusy = false;
  }
  return soundOn;
}

export function isSoundOn() { return soundOn; }

export function playSound(type, meta = {}) {
  if (!soundOn) return;
  try { _play(type, meta); } catch (_) {}
}

export function updateCrowd(rallyLen) {
  if (!soundOn || !settings.crowdEnabled) return;
  setCrowdLevel(Math.min(1, Math.max(0, (rallyLen - 4) / 16)));
}

export function previewSound(type) {
  if (type === 'CROWD_LOOP') { const was = soundOn; soundOn = true; crowdReact(0.75); if (!was) setTimeout(() => { soundOn = false; }, 1500); return; }
  const was = soundOn; soundOn = true;
  try { _play(type, { speed: 145 }); } finally { if (!was) setTimeout(() => { soundOn = false; }, 600); }
}

// ─────────────────────────────────────────────────────────────────────────────
// MOTOR DE SONS
// ─────────────────────────────────────────────────────────────────────────────

function _crowdReactionForType(type) {
  const map = { ACE:0.92, WINNER:0.60, NET:0.22, OUT:0.22, DOUBLE_FAULT:0.32, GAME:0.72, SET:1.00 };
  if (map[type] !== undefined) crowdReact(map[type]);
  if (type === 'SET')  setTimeout(() => { if (soundOn) crowdReact(0.82); }, 600);
  if (type === 'GAME' || type === 'SET') setTimeout(() => { if (soundOn) setCrowdLevel(0); }, type === 'SET' ? 4200 : 2200);
}

function _play(type, meta = {}) {
  const now = performance.now();

  // Som customizado tem prioridade
  if (customBuffers[type]) {
    const cat = (type === 'HIT' || type === 'BOUNCE' || type === 'MISHIT') ? 'hit' : 'event';
    const vol = masterGainVal(cat);
    if (vol > 0) playBuffer(customBuffers[type], vol);
    _crowdReactionForType(type);
    return;
  }

  switch (type) {
    case 'HIT': {
      if (now - lastHitMs < 75) return; lastHitMs = now;
      const freq = 280 + ((meta.speed ?? 120) / 220) * 500;
      tone(freq, 0.055, 0.18, 'triangle', 0, 'hit');
      noise(0.032, 0.06, freq * 2.2, 0, 'hit');
      break;
    }
    case 'MISHIT': {
      if (now - lastHitMs < 75) return; lastHitMs = now;
      const mf = 115 + ((meta.speed ?? 80) / 220) * 180;
      tone(mf, 0.04, 0.22, 'sawtooth', 0, 'hit');
      tone(mf * 1.38, 0.025, 0.12, 'square', 0, 'hit');
      noise(0.065, 0.09, mf * 1.8, 0, 'hit');
      break;
    }
    case 'BOUNCE': {
      if (now - lastBounceMs < 55) return; lastBounceMs = now;
      tone(108, 0.072, 0.14, 'sine', 0, 'hit');
      noise(0.06, 0.08, 178, 0, 'hit');
      break;
    }
    case 'NET': {
      tone(88, 0.09, 0.16, 'sine'); noise(0.08, 0.10, 148);
      crowdReact(0.22); break;
    }
    case 'OUT': {
      tone(525, 0.06, 0.14, 'square'); tone(492, 0.06, 0.08, 'square');
      crowdReact(0.22); break;
    }
    case 'WINNER': {
      tone(440, 0.12, 0.22, 'sine'); tone(660, 0.20, 0.26, 'sine', 0.10);
      crowdReact(0.60); break;
    }
    case 'ACE': {
      tone(330, 0.10, 0.22, 'sine'); tone(440, 0.10, 0.24, 'sine', 0.09);
      tone(550, 0.10, 0.26, 'sine', 0.18); tone(660, 0.22, 0.30, 'sine', 0.27);
      tone(880, 0.18, 0.18, 'triangle', 0.30);
      crowdReact(0.92); break;
    }
    case 'DOUBLE_FAULT': {
      tone(278, 0.14, 0.18, 'sawtooth'); tone(198, 0.18, 0.16, 'sawtooth', 0.14);
      crowdReact(0.32); break;
    }
    case 'GAME': {
      tone(392, 0.10, 0.20, 'sine'); tone(494, 0.10, 0.22, 'sine', 0.09);
      tone(587, 0.25, 0.28, 'sine', 0.18); tone(740, 0.20, 0.14, 'triangle', 0.20);
      crowdReact(0.72); setTimeout(() => { if (soundOn) setCrowdLevel(0); }, 2200); break;
    }
    case 'SET': {
      tone(262, 0.10, 0.22, 'sine'); tone(330, 0.10, 0.24, 'sine', 0.08);
      tone(392, 0.10, 0.26, 'sine', 0.16); tone(494, 0.10, 0.28, 'sine', 0.24);
      tone(587, 0.35, 0.34, 'sine', 0.32); tone(784, 0.30, 0.18, 'triangle', 0.34);
      tone(523, 0.30, 0.16, 'triangle', 0.34);
      crowdReact(1.0); setTimeout(() => { if (soundOn) crowdReact(0.82); }, 600);
      setTimeout(() => { if (soundOn) setCrowdLevel(0); }, 4200); break;
    }
    default: break;
  }
}
