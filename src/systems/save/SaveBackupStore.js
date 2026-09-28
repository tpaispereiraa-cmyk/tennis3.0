/** Rotacao pequena de snapshots locais. IndexedDB aguenta blobs grandes sem
 * ocupar o limite estreito do localStorage. Falhas de quota nunca impedem o jogo.
 */
const DB_NAME = 'tennis_e2_saves';
const STORE_NAME = 'autosaves';
const DB_VERSION = 1;
const DEFAULT_SLOTS = 3;

function openDatabase() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = event => resolve(event.target.result);
    request.onerror = event => reject(event.target.error);
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = event => reject(event.target.error);
    transaction.onabort = event => reject(event.target.error ?? new Error('Transacao de autosave cancelada.'));
  });
}

export async function storeRotatingAutosave(artifact, metadata = {}, maxSlots = DEFAULT_SLOTS) {
  try {
    const db = await openDatabase();
    if (!db) return false;
    const readTx = db.transaction(STORE_NAME, 'readonly');
    const allRequest = readTx.objectStore(STORE_NAME).getAll();
    const existing = await new Promise((resolve, reject) => {
      allRequest.onsuccess = () => resolve(allRequest.result ?? []);
      allRequest.onerror = event => reject(event.target.error);
    });
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const done = transactionDone(tx);
    const store = tx.objectStore(STORE_NAME);
    const savedAt = metadata.savedAt ?? new Date().toISOString();
    store.put({
      id: metadata.saveId ?? `autosave-${Date.now()}`,
      savedAt,
      year: metadata.year ?? null,
      season: metadata.season ?? null,
      reason: metadata.reason ?? 'MANUAL',
      blob: artifact.blob,
    });
    const overflow = [...existing].sort((a, b) => String(a.savedAt).localeCompare(String(b.savedAt)))
      .slice(0, Math.max(0, existing.length - maxSlots + 1));
    for (const old of overflow) store.delete(old.id);
    await done;
    db.close();
    return true;
  } catch (error) {
    console.warn('[Autosave] Snapshot local indisponivel:', error);
    return false;
  }
}

export async function loadLatestAutosave() {
  const db = await openDatabase();
  if (!db) return null;
  const tx = db.transaction(STORE_NAME, 'readonly');
  const done = transactionDone(tx);
  const request = tx.objectStore(STORE_NAME).getAll();
  const rows = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = event => reject(event.target.error);
  });
  await done;
  db.close();
  return rows.sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)))[0] ?? null;
}
