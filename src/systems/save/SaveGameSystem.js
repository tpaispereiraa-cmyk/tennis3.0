/**
 * SaveGameSystem
 *
 * Formato V3: um envelope versionado, verificavel e opcionalmente comprimido.
 * O arquivo .tennis-save e um stream gzip; o jogador nunca precisa extrai-lo.
 * Saves JSON V1/V2 continuam aceitos e sao migrados para o payload atual.
 */

export const SAVE_FORMAT = 'TENNIS_E2_SAVE';
export const SAVE_SCHEMA_VERSION = 3;
export const SAVE_MIME = 'application/vnd.tennis-e2.save+gzip';
const MAX_STORED_BYTES = 128 * 1024 * 1024;
const MAX_DECOMPRESSED_BYTES = 320 * 1024 * 1024;

const TRANSIENT_KEYS = new Set([
  '_aiTrace', '_finalShot', 'ctx',
  'preparedTournamentPackage', 'preparedTournamentPackageCache',
]);

export function saveJsonReplacer(key, value) {
  return TRANSIENT_KEYS.has(key) ? undefined : value;
}

export function compactRankingStoreForSave(store) {
  if (!store || typeof store !== 'object') return store;
  // ranked/prospectRanked sao caches: o load sempre os recalcula a partir
  // dos resultados. seedOrder e resultados sao estado autoritativo.
  const { ranked: _ranked, prospectRanked: _prospectRanked, ...authoritative } = store;
  return authoritative;
}

function bytesToHex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256(text) {
  if (!globalThis.crypto?.subtle) return null;
  const input = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', input);
  return bytesToHex(new Uint8Array(digest));
}

export function validateSavePayload(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) errors.push('payload ausente');
  if (!Number.isFinite(Number(payload?.year))) errors.push('ano invalido');
  if (!Array.isArray(payload?.tourPlayers)) errors.push('elenco profissional ausente');
  if (!Array.isArray(payload?.prospects)) errors.push('elenco juvenil ausente');
  if (!payload?.rankingStore || typeof payload.rankingStore !== 'object') errors.push('ranking ausente');
  if (!payload?.historicalTournamentResults || typeof payload.historicalTournamentResults !== 'object') errors.push('arquivo de torneios ausente');
  if ((payload?.tourPlayers?.length ?? 0) > 5000) errors.push('elenco profissional acima do limite seguro');
  if ((payload?.prospects?.length ?? 0) > 5000) errors.push('elenco juvenil acima do limite seguro');
  return { valid: errors.length === 0, errors };
}

export function migrateSavePayload(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('O arquivo nao contem um save valido.');
  const payload = raw.format === SAVE_FORMAT && raw.payload ? raw.payload : raw;
  const version = Number(payload._version ?? raw.schemaVersion ?? 1);
  if (version > SAVE_SCHEMA_VERSION) {
    throw new Error(`Este save usa a versao ${version}, mais nova que a versao ${SAVE_SCHEMA_VERSION} suportada pelo jogo.`);
  }

  // As migracoes sao deliberadamente nao destrutivas. Sistemas especificos
  // (vida, coaching, historia) completam seus defaults durante a hidratacao.
  return {
    ...payload,
    _version: SAVE_SCHEMA_VERSION,
    events: Array.isArray(payload.events) ? payload.events : [],
    retiredPlayers: Array.isArray(payload.retiredPlayers) ? payload.retiredPlayers : [],
    youthExitArchive: Array.isArray(payload.youthExitArchive) ? payload.youthExitArchive : [],
    tournamentResults: payload.tournamentResults ?? {},
    historicalTournamentResults: payload.historicalTournamentResults ?? {},
  };
}

export async function encodeSaveDocument(payload, metadata = {}) {
  const payloadJson = JSON.stringify(payload, saveJsonReplacer);
  const checksum = await sha256(payloadJson);
  const header = {
    format: SAVE_FORMAT,
    schemaVersion: SAVE_SCHEMA_VERSION,
    gameVersion: metadata.gameVersion ?? null,
    saveId: metadata.saveId ?? globalThis.crypto?.randomUUID?.() ?? `save-${Date.now()}`,
    savedAt: metadata.savedAt ?? new Date().toISOString(),
    year: payload.year ?? null,
    season: payload.season ?? null,
    playerCount: (payload.tourPlayers?.length ?? 0) + (payload.prospects?.length ?? 0),
    checksum: checksum ? { algorithm: 'SHA-256', value: checksum } : null,
  };
  // Evita uma terceira copia profunda do payload apenas para montar o envelope.
  const documentJson = `{"format":${JSON.stringify(SAVE_FORMAT)},"schemaVersion":${SAVE_SCHEMA_VERSION},"meta":${JSON.stringify(header)},"payload":${payloadJson}}`;
  return { documentJson, header };
}

async function gzipText(text) {
  if (typeof CompressionStream === 'undefined') return null;
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function decodeBytes(bytes) {
  if (bytes.byteLength > MAX_STORED_BYTES) throw new Error('O arquivo excede o limite seguro de 128 MB.');
  const isGzip = bytes[0] === 0x1f && bytes[1] === 0x8b;
  if (!isGzip) return new TextDecoder().decode(bytes);
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Este navegador nao oferece suporte para descompactar o save.');
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  const textParts = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_DECOMPRESSED_BYTES) {
      await reader.cancel();
      throw new Error('O conteudo descompactado excede o limite seguro de 320 MB.');
    }
    textParts.push(decoder.decode(value, { stream: true }));
  }
  textParts.push(decoder.decode());
  return textParts.join('');
}

export async function createSaveArtifact(payload, metadata = {}) {
  const { documentJson, header } = await encodeSaveDocument(payload, metadata);
  const compressed = await gzipText(documentJson);
  if (compressed) {
    return {
      blob: new Blob([compressed], { type: SAVE_MIME }),
      extension: '.tennis-save',
      compressed: true,
      header,
      rawBytes: new TextEncoder().encode(documentJson).byteLength,
      storedBytes: compressed.byteLength,
    };
  }
  return {
    blob: new Blob([documentJson], { type: 'application/json' }),
    extension: '.json',
    compressed: false,
    header,
    rawBytes: new TextEncoder().encode(documentJson).byteLength,
    storedBytes: new TextEncoder().encode(documentJson).byteLength,
  };
}

export async function decodeSaveBytes(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const text = await decodeBytes(bytes);
  let document;
  try {
    document = JSON.parse(text);
  } catch {
    throw new Error('O arquivo nao e um JSON ou .tennis-save valido.');
  }

  const isEnvelope = document?.format === SAVE_FORMAT && document?.payload;
  if (isEnvelope && document.meta?.checksum?.value) {
    const actual = await sha256(JSON.stringify(document.payload, saveJsonReplacer));
    if (actual && actual !== document.meta.checksum.value) {
      throw new Error('A verificacao de integridade falhou: o save esta corrompido ou incompleto.');
    }
  }

  const payload = migrateSavePayload(document);
  const validation = validateSavePayload(payload);
  if (!validation.valid) throw new Error(`Save incompleto: ${validation.errors.join(', ')}.`);
  return { payload, meta: isEnvelope ? document.meta ?? {} : { legacy: true }, legacy: !isEnvelope };
}

export async function decodeSaveFile(file) {
  return decodeSaveBytes(await file.arrayBuffer());
}
