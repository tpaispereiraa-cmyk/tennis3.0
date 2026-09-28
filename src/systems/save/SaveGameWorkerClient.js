import { createSaveArtifact, decodeSaveBytes } from './SaveGameSystem.js';

function runCodecWorker(message, transfer = []) {
  if (typeof Worker === 'undefined') return null;
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./SaveGameWorker.js', import.meta.url), { type: 'module' });
    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error('O processamento do save excedeu o tempo limite.'));
    }, 120000);
    worker.onmessage = event => {
      clearTimeout(timeout);
      worker.terminate();
      if (event.data?.error) reject(new Error(event.data.error));
      else resolve(event.data);
    };
    worker.onerror = event => {
      clearTimeout(timeout);
      worker.terminate();
      reject(event.error ?? new Error(event.message ?? 'Falha no worker de save.'));
    };
    worker.postMessage(message, transfer);
  });
}

export async function createSaveArtifactOffThread(payload, metadata = {}) {
  const pending = runCodecWorker({ action: 'ENCODE', payload, metadata });
  if (!pending) return createSaveArtifact(payload, metadata);
  try {
    const result = await pending;
    return {
      ...result.artifact,
      blob: new Blob([result.bytes], { type: result.artifact.mime }),
    };
  } catch (error) {
    console.warn('[SaveWorker] Usando codec na thread principal:', error);
    return createSaveArtifact(payload, metadata);
  }
}

export async function decodeSaveFileOffThread(file) {
  const buffer = await file.arrayBuffer();
  const pending = runCodecWorker({ action: 'DECODE', buffer }, [buffer]);
  if (!pending) return decodeSaveBytes(buffer);
  try {
    return (await pending).result;
  } catch (error) {
    console.warn('[SaveWorker] Repetindo leitura na thread principal:', error);
    return decodeSaveBytes(await file.arrayBuffer());
  }
}
