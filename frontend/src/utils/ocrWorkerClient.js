let workerInstance = null;
const callbacks = new Map();
let counter = 0;

const supportsWorker = typeof window !== 'undefined' && typeof window.Worker !== 'undefined';

const ensureWorker = () => {
  if (!supportsWorker) return null;
  if (!workerInstance) {
    workerInstance = new Worker(new URL('../workers/ocrWorker.js', import.meta.url));
    workerInstance.onmessage = (event) => {
      const { id, text, error } = event.data || {};
      const cb = callbacks.get(id);
      if (!cb) return;
      callbacks.delete(id);
      if (error) cb.reject(new Error(error));
      else cb.resolve(text || '');
    };
    workerInstance.onerror = (err) => {
      // Bubble failure to all pending callbacks
      callbacks.forEach(({ reject }) => reject(err));
      callbacks.clear();
    };
  }
  return workerInstance;
};

export const recognizeWithWorker = async (file) => {
  if (!supportsWorker) throw new Error('Web Workers not supported');
  const worker = ensureWorker();
  if (!worker) throw new Error('Failed to initialize worker');
  const id = `ocr-${Date.now()}-${counter += 1}`;
  return new Promise((resolve, reject) => {
    callbacks.set(id, { resolve, reject });
    file.arrayBuffer()
      .then((buffer) => {
        worker.postMessage({ action: 'recognize', id, fileArrayBuffer: buffer }, [buffer]);
      })
      .catch((err) => {
        callbacks.delete(id);
        reject(err);
      });
  });
};

export const terminateWorker = () => {
  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
    callbacks.clear();
  }
};
