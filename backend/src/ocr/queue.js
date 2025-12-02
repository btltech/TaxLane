const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');

// Simple persistent job queue backed by JSON file.
const jobs = new Map();
let jobCounter = 1;
const persistencePath = path.join(__dirname, '../../uploads/ocr-jobs.json');

const persistJobs = () => {
  try {
    const serialized = JSON.stringify(Array.from(jobs.values()));
    fs.writeFileSync(persistencePath, serialized);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to persist OCR jobs', err);
  }
};

const loadPersistedJobs = () => {
  if (!fs.existsSync(persistencePath)) return;
  try {
    const data = JSON.parse(fs.readFileSync(persistencePath, 'utf8'));
    data.forEach((jobData) => {
      const id = String(jobData.id);
      jobs.set(id, jobData);
      jobCounter = Math.max(jobCounter, Number(id) + 1);
      if (jobData.status === 'queued' || jobData.status === 'processing') {
        jobData.status = 'queued';
        process.nextTick(() => processJob(jobData));
      }
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to load persisted OCR jobs', err);
  }
};

function cleanupFile(filePath) {
  if (!filePath) return;
  fs.unlink(filePath, () => {});
}

function createJob(filePath, originalName, userId = null) {
  const id = String(jobCounter++);
  const job = {
    id,
    filePath,
    originalName,
    userId,
    status: 'queued', // queued | processing | done | failed
    result: null,
    error: null,
    createdAt: Date.now(),
  };
  jobs.set(id, job);
  // If running in test/mock mode, fulfill immediately with deterministic result.
  if (process.env.OCR_TEST_MODE === 'mock') {
    job.status = 'done';
    job.result = 'TEST_OCR_TEXT';
    jobs.set(id, job);
    cleanupFile(filePath);
    persistJobs();
    return job;
  }

  // Start processing asynchronously
  process.nextTick(() => processJob(job));
  persistJobs();
  return job;
}

async function processJob(job) {
  job.status = 'processing';
  try {
    // Use a worker thread to avoid blocking the main event loop.
    const workerPath = path.join(__dirname, 'worker-wrapper.js');
    const w = new Worker(workerPath, { workerData: { filePath: job.filePath } });
    const finalize = () => cleanupFile(job.filePath);
    w.on('message', (msg) => {
      job.status = 'done';
      if (typeof msg === 'string') job.result = msg;
      else job.result = (msg && msg.text) ? msg.text : '';
      jobs.set(job.id, job);
      persistJobs();
      finalize();
    });
    w.on('error', (err) => {
      job.status = 'failed';
      job.error = err?.message || String(err);
      jobs.set(job.id, job);
      persistJobs();
      finalize();
    });
    w.on('exit', (code) => {
      if (code !== 0 && job.status !== 'done') {
        job.status = 'failed';
        job.error = `Worker exited with code ${code}`;
        jobs.set(job.id, job);
        persistJobs();
      }
      finalize();
    });
  } catch (err) {
    job.status = 'failed';
    job.error = err?.message || String(err);
    jobs.set(job.id, job);
    persistJobs();
    cleanupFile(job.filePath);
  }
}

function getJob(id) {
  return jobs.get(id);
}

loadPersistedJobs();

module.exports = { createJob, getJob };
