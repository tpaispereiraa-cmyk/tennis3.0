import { createSaveArtifact, decodeSaveBytes } from './SaveGameSystem.js';

self.onmessage = async event => {
  try {
    if (event.data?.action === 'ENCODE') {
      const artifact = await createSaveArtifact(event.data.payload, event.data.metadata);
      const bytes = await artifact.blob.arrayBuffer();
      self.postMessage({
        artifact: {
          extension: artifact.extension,
          compressed: artifact.compressed,
          header: artifact.header,
          rawBytes: artifact.rawBytes,
          storedBytes: artifact.storedBytes,
          mime: artifact.blob.type,
        },
        bytes,
      }, [bytes]);
      return;
    }
    if (event.data?.action === 'DECODE') {
      const result = await decodeSaveBytes(event.data.buffer);
      self.postMessage({ result });
      return;
    }
    throw new Error('Operacao de save desconhecida.');
  } catch (error) {
    self.postMessage({ error: error?.message ?? String(error) });
  }
};

