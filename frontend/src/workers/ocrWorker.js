/* eslint-disable no-restricted-globals */
/* global Tesseract */
/*
 Basic OCR Web Worker.

 This worker expects messages shaped like:
 { action: 'recognize', id: <requestId>, fileArrayBuffer: <ArrayBuffer> }

 It uses Tesseract via CDN to avoid bundling complexities in some setups.
 If your build supports bundling workers and the `tesseract.js` package,
 consider bundling a worker that imports `tesseract.js` directly.
*/

self.importScripts('https://cdn.jsdelivr.net/npm/tesseract.js@2.1.5/dist/tesseract.min.js');

self.onmessage = async (e) => {
  const { action, id, fileArrayBuffer } = e.data || {};
  if (action !== 'recognize') {
    self.postMessage({ id, error: 'unsupported action' });
    return;
  }
  try {
    const blob = new Blob([fileArrayBuffer]);
    const imageUrl = URL.createObjectURL(blob);
    const worker = Tesseract.createWorker();
    await worker.load();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    const { data: { text } } = await worker.recognize(imageUrl);
    await worker.terminate();
    URL.revokeObjectURL(imageUrl);
    self.postMessage({ id, text });
  } catch (err) {
    self.postMessage({ id, error: err?.message || String(err) });
  }
};
