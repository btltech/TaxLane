# Phase 1: Core Bookkeeping

## Explanation Like I Am 5
Imagine you have a piggy bank for money coming in (like selling lemonade) and a box for money going out (like buying cups). This phase is like writing down what goes in and out, taking pictures of receipts, and counting totals. No taxes yet – just keeping track!

## Folder Structure (What's New in Phase 1)
- backend/src/routes/ (auth.js, income.js, expenses.js, receipts.js)
- backend/src/middleware/ (auth.js)
- backend/src/config/ (database.js)
- frontend/src/pages/ (Dashboard.js, AddIncome.js, AddExpense.js, UploadReceipt.js)
- database/schemas/ (schema.sql)

## Backend Code
- Uses Express for API routes.
- Supabase for DB and storage.
- Auth with JWT.

## Frontend Code
- React components for forms and dashboard.
- TailwindCSS for styling.

## SQL Schema
- Tables: users, income, expenses, receipts.

## How to Test It Step-by-Step
1. Set up Supabase project, get URL/key, update .env.
2. Run schema.sql in Supabase.
3. npm install in backend/frontend.
4. npm run dev in backend (port 5000).
5. npm start in frontend (port 3000).
6. Register/login via API or add to frontend later.
7. Add income/expense via forms.
8. Upload receipt.
9. Check dashboard totals.

## Example API Calls
- POST /api/auth/register {email, password}
- POST /api/income {amount, description, category, date} (with Bearer token)
- GET /api/income (with token)
- Same for expenses.
- POST /api/receipts (multipart form with file and category)

## Common Mistakes to Avoid
- Forget to set .env variables.
- Not using auth middleware on protected routes.
- File upload without proper headers.
- Not handling errors in frontend.

# Phase 2: Tax Engine

## Explanation Like I Am 5
Now that we have the money in and out, let's play with numbers! Profit is like how much extra money you have after paying for stuff. VAT is a tax on what you sell. Tax estimate is what you might owe the government. NI is like insurance for when you're sick. We add math to count these!

## Folder Structure (What's New in Phase 2)
- backend/src/routes/ (calculations.js) – New API for tax calcs.
- backend/src/services/ (taxService.js) – Math functions for taxes.
- Updated frontend/src/pages/Dashboard.js – Shows new numbers.

## Backend Code
- Added /api/calculations route to compute profit, VAT, tax, NI.
- taxService.js has simple UK tax formulas.

## Frontend Code
- Dashboard now fetches and displays calculations.

## SQL Schema
- No new tables; uses existing income/expenses.

## How to Test It Step-by-Step
1. Add some income/expenses in Phase 1.
2. Restart backend/frontend.
3. Check dashboard – should show profit, VAT, etc.
4. Add more data, refresh to see updates.

## Example API Calls
- GET /api/calculations (with token) → {totalIncome, totalExpenses, profit, vat, taxEstimate, niEstimate}

## Common Mistakes to Avoid
- Formulas are simplified; real UK tax is complex – update later.
- Ensure data is loaded before calculations.

# Phase 3: HMRC Integration

## Explanation Like I Am 5
Now we talk to the big computer at HMRC! First, we sign up our app with them (like getting a library card). Then, users click "Connect" and HMRC asks "Is this okay?" If yes, we get a secret key to send tax info. We can send quarterly reports or yearly summaries. If it fails, we try again and save everything.

## Folder Structure (What's New in Phase 3)
- backend/src/routes/ (hmrc.js, hmrcData.js) – OAuth and submission APIs.
- frontend/src/pages/ (HMRCConnect.js, Submissions.js) – Connect button and submission list.
- Updated database/schemas/schema.sql – New tables for tokens, submissions, errors.
- Updated .env.example – HMRC client ID/secret.

## Backend Code
- hmrc.js: OAuth flow, token refresh, submit to HMRC sandbox.
- hmrcData.js: Stub for pulling HMRC data.
- Uses axios for HMRC API calls.

## Frontend Code
- HMRCConnect: Button to start OAuth.
- Submissions: List submissions, button to submit quarterly.

## SQL Schema
- hmrc_tokens: Store access/refresh tokens.
- mtd_submissions: Track submissions with status.
- error_logs: Log failures.

## How to Test It Step-by-Step
1. Register HMRC app at developer.service.hmrc.gov.uk, get client ID/secret, update .env.
2. Run new schema in Supabase.
3. npm install axios in backend.
4. Restart backend/frontend.
5. Click "Connect HMRC" – redirects to HMRC login (use test account).
6. After connect, go to Submissions, click "Submit Quarterly".
7. Check Supabase for submissions/errors.

## Example API Calls
- GET /api/hmrc/auth (redirects to HMRC)
- POST /api/hmrc/submit {type, period, payload} (with token)
- GET /api/hmrc/submissions (with token)

## Common Mistakes to Avoid
- Use sandbox URLs for testing.
- Handle token expiry – refresh automatically.
- Log errors but don't expose sensitive data.
- HMRC APIs are rate-limited – add delays if needed.