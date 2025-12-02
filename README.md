# TaxLane - Making Tax Digital Web App

A simple web app for UK small traders to manage income, expenses, receipts, and tax submissions.

## Setup

1. Clone the repo.
2. Install dependencies: `npm install` in both frontend and backend folders.
3. Set up Supabase: Create a project, get URL and key, update .env.
4. Run DB schema in Supabase SQL editor.
5. Start backend: `npm run dev` in backend.
6. Start frontend: `npm start` in frontend.

## Phases

- Phase 1: Core bookkeeping (add income/expenses, upload receipts, show totals).

## OCR & Receipts

- The frontend supports image receipt uploads and multi-page PDF receipts. PDFs are rendered page-by-page in the browser and text is extracted via OCR (Tesseract).
- For better performance, the app can offload OCR work to a Web Worker (a worker stub is included at `frontend/src/workers/ocrWorker.js`) or to a server-side OCR job if you prefer to process heavier loads on the backend.
- The Upload Receipt page now uses a dedicated Web Worker, progress indicator, and keyword-based categoriser for smoother UX. PDFs are rasterised client-side before text extraction.
- Server-side OCR uploads now require authentication, validate MIME type/size, and persist queued jobs to disk so they survive restarts. Temporary files are cleaned automatically after processing. You can tune limits with the `OCR_MAX_FILE_SIZE_MB` env var on the backend.
- Expense forms use the same keyword rules as the OCR categoriser to auto-suggest a category while you type. Suggestions stop once the user selects a category manually.

## HMRC sandbox / mock mode

- If you have HMRC sandbox credentials set in `HMRC_CLIENT_ID`, `HMRC_CLIENT_SECRET`, and (optionally) `HMRC_REDIRECT_URI`, the “Connect HMRC” action will redirect to the official OAuth journey.
- If credentials are missing (for example when you cannot get a token in dev), the HMRC page exposes a “Mock Connection” button. This stores placeholder tokens so submissions can continue for demos/tests. The `/api/hmrc/mock-connect` route powers this workflow.
- Submissions will now refuse to run until an HMRC token (real or mock) exists for the user, which keeps the UX consistent with production expectations.
- The backend tracks HMRC obligations per quarter and links them to submissions; the dashboard calls `/api/calculations` to show totals plus trends, top clients, and an expense split. The reminders API `/api/reminders` highlights due/overdue obligations and basic financial health warnings.

## Security & rate limiting

- Auth endpoints enforce password strength (≥8 chars with letters and numbers) and have basic in-memory rate limiting to slow brute-force attempts. OCR and receipt uploads also have per-user throttles.
- Sensitive routes default to returning `429` on abuse; adjust thresholds via the middleware in `backend/src/middleware/rateLimit.js`.

## CSV import/export

- Use `/api/csv/income/export` or `/api/csv/expenses/export` (or the Import/Export page in the UI) to download comma-separated files with headers: `date,amount,description,category[,client_id]`.
- Upload CSVs with the same headers to `/api/csv/income/import` or `/api/csv/expenses/import`. Each row creates a new record; invalid rows are skipped and reported in the JSON response.

## Testing

See docs/phases.md for step-by-step tests.
