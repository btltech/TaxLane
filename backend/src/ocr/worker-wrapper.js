const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const path = require('path');

// Worker wrapper: either perform real OCR (if tesseract available) or return a mock during tests.
async function run() {
  try {
    const { filePath } = workerData;
    // If OCR_TEST_MODE is set to 'mock', return a deterministic response for tests.
    if (process.env.OCR_TEST_MODE === 'mock') {
      // post a plain string to ensure message is received consistently
      parentPort.postMessage('TEST_OCR_TEXT');
      return;
    }

    // Try to use tesseract.js if installed; otherwise fail gracefully.
    let tesseract;
    try {
      tesseract = require('tesseract.js');
    } catch (e) {
      parentPort.postMessage({ text: '' });
      return;
    }

    // tesseract.js recognizes images; for PDFs we could convert pages to images.
    // For simplicity, pass the file path to recognize; tesseract.js will attempt to handle.
    const { createWorker } = tesseract;
    const worker = createWorker();
    await worker.load();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    const { data: { text } } = await worker.recognize(filePath);
    await worker.terminate();
    parentPort.postMessage({ text });
  } catch (err) {
    parentPort.postMessage({ text: '', error: err?.message || String(err) });
  }
}

run();
