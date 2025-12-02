import { createWorker } from 'tesseract.js';

export async function processOCR(imageFile) {
  // Runs Tesseract OCR on the provided File/Blob and returns extracted text.
  const maybeWorker = createWorker('eng');
  const worker = typeof maybeWorker?.then === 'function' ? await maybeWorker : maybeWorker;
  try {
    if (typeof worker.load === 'function') {
      // Legacy API (<6.x) requires explicit load steps.
      await worker.load();
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
    }
    const result = await worker.recognize(imageFile);
    const text = result?.data?.text ?? result?.text ?? '';
    return text;
  } finally {
    try {
      await worker.terminate();
    } catch (e) {
      // best-effort
    }
  }
}
