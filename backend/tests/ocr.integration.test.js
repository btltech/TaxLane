process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.OCR_TEST_MODE = 'mock'; // make worker return deterministic text for tests
const request = require('supertest');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

const app = require('../server');

function createSamplePdfBuffer(text = 'Hello Test OCR') {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const buffers = [];
    doc.on('data', (d) => buffers.push(d));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.text(text);
    doc.end();
  });
}

describe('OCR integration', () => {
  let authToken;

  beforeAll(async () => {
    const email = `ocr${Date.now()}@example.com`;
    const res = await request(app).post('/api/auth/register').send({ email, password: 'password123' });
    authToken = res.body.accessToken;
    expect(authToken).toBeDefined();
  });

  test('upload PDF and get OCR job result', async () => {
    const pdfBuffer = await createSamplePdfBuffer('This is a sample receipt for testing');
    // write to temp file for multipart upload
    const tmpPath = path.join(__dirname, 'tmp-sample.pdf');
    fs.writeFileSync(tmpPath, pdfBuffer);

    const postRes = await request(app)
      .post('/api/ocr')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', tmpPath);
    expect(postRes.status).toBe(200);
    const { jobId } = postRes.body;
    expect(jobId).toBeDefined();

    // Poll for result
    let final;
    for (let i = 0; i < 20; i++) {
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app)
        .get(`/api/ocr/${jobId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      if (res.body.status === 'done') {
        final = res.body;
        break;
      }
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 200));
    }
    expect(final).toBeDefined();
    expect(final.result).toBe('TEST_OCR_TEXT'); // worker returns mock text in test mode

    // cleanup
    fs.unlinkSync(tmpPath);
  }, 20000);
});
