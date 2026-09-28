import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {
  SAVE_SCHEMA_VERSION,
  compactRankingStoreForSave,
  createSaveArtifact,
  decodeSaveBytes,
} from '../src/systems/save/SaveGameSystem.js';

const fixturePath = process.argv[2] ?? 'hv_universe_T2_2026.json';
const raw = await fs.readFile(fixturePath);
const legacy = JSON.parse(raw.toString('utf8'));
const payload = {
  ...legacy,
  _version: SAVE_SCHEMA_VERSION,
  rankingStore: compactRankingStoreForSave(legacy.rankingStore),
  coachMarket: legacy.coachMarket ?? null,
};

const artifact = await createSaveArtifact(payload, { gameVersion: 'test' });
const encoded = new Uint8Array(await artifact.blob.arrayBuffer());
const decoded = await decodeSaveBytes(encoded);

assert.equal(decoded.payload.year, legacy.year);
assert.equal(decoded.payload.tourPlayers.length, legacy.tourPlayers.length);
assert.equal(Object.keys(decoded.payload.historicalTournamentResults).length, Object.keys(legacy.historicalTournamentResults).length);
assert.equal(decoded.payload._version, SAVE_SCHEMA_VERSION);
assert.equal('ranked' in (decoded.payload.rankingStore ?? {}), false);
assert.equal(decoded.legacy, false);

// Um byte alterado precisa falhar por descompressao ou checksum.
const damaged = encoded.slice();
damaged[Math.floor(damaged.length / 2)] ^= 0x01;
await assert.rejects(() => decodeSaveBytes(damaged));

console.log(JSON.stringify({
  ok: true,
  schema: decoded.payload._version,
  originalMB: +(raw.byteLength / 1024 / 1024).toFixed(2),
  compressedMB: +(artifact.storedBytes / 1024 / 1024).toFixed(2),
  ratio: +(artifact.storedBytes / raw.byteLength).toFixed(3),
  players: decoded.payload.tourPlayers.length,
  tournaments: Object.keys(decoded.payload.historicalTournamentResults).length,
}));

