const express = require('express');
const axios = require('axios');
const { db } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const {
  getObligations,
  linkSubmissionToObligation,
  parsePeriodKey,
} = require('../services/obligations');

const router = express.Router();

// HMRC OAuth URLs (Sandbox)
const HMRC_API_BASE = process.env.HMRC_API_BASE_URL || 'https://test-api.service.hmrc.gov.uk';
const HMRC_AUTH_URL = process.env.HMRC_AUTH_URL || 'https://test-api.service.hmrc.gov.uk/oauth/authorize';
const HMRC_TOKEN_URL = process.env.HMRC_TOKEN_URL || 'https://test-api.service.hmrc.gov.uk/oauth/token';
const HMRC_CLIENT_ID = process.env.HMRC_CLIENT_ID;
const HMRC_CLIENT_SECRET = process.env.HMRC_CLIENT_SECRET;
const REDIRECT_URI = process.env.HMRC_REDIRECT_URI || 'http://localhost:5001/api/hmrc/callback';

const hmrcConfigured = () => Boolean(HMRC_CLIENT_ID && HMRC_CLIENT_SECRET && HMRC_CLIENT_ID !== 'YOUR_CLIENT_ID_HERE');

// Let the frontend know whether OAuth can run
router.get('/status', authMiddleware, (req, res) => {
  res.json({ configured: hmrcConfigured() });
});

// Initiate OAuth - Request authorization from user
router.get('/auth', authMiddleware, (req, res) => {
  if (!hmrcConfigured()) {
    return res.status(503).json({ error: 'HMRC OAuth is not configured. Use mock connect instead.' });
  }
  // Scopes needed for MTD Self Assessment and VAT
  const scopes = [
    'read:vat',
    'write:vat',
    'read:self-assessment',
    'write:self-assessment'
  ].join(' ');
  
  const authUrl = `${HMRC_AUTH_URL}?client_id=${HMRC_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scopes)}&response_type=code&state=${req.user.id}`;
  res.redirect(authUrl);
});

// OAuth callback - Exchange code for tokens
router.get('/callback', async (req, res) => {
  const { code, state: userId, error, error_description } = req.query;
  
  if (error) {
    console.error('HMRC OAuth error:', error, error_description);
    return res.status(400).send(`HMRC authorization failed: ${error_description || error}`);
  }
  
  const parsedUserId = parseInt(userId, 10);
  if (!parsedUserId) {
    return res.status(400).send('Invalid user state provided.');
  }
  
  if (!code) {
    return res.status(400).send('No authorization code received.');
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await axios.post(HMRC_TOKEN_URL, 
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
        client_id: HMRC_CLIENT_ID,
        client_secret: HMRC_CLIENT_SECRET
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    const expiresAt = new Date(Date.now() + (expires_in * 1000));

    db.run(
      'INSERT OR REPLACE INTO hmrc_tokens (user_id, access_token, refresh_token, expires_at) VALUES (?, ?, ?, ?)',
      [parsedUserId, access_token, refresh_token, expiresAt.toISOString()],
      (err) => {
        if (err) {
          console.error('DB error saving token:', err);
          return res.status(500).send('Failed to save HMRC credentials.');
        }
        res.send(`
          <html>
            <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f8fafc;">
              <div style="text-align: center; padding: 2rem; background: white; border-radius: 1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="font-size: 3rem; margin-bottom: 1rem;">✅</div>
                <h1 style="color: #0f172a; margin-bottom: 0.5rem;">HMRC Connected!</h1>
                <p style="color: #64748b;">You can close this window and return to TaxLane.</p>
              </div>
            </body>
          </html>
        `);
      }
    );
  } catch (tokenError) {
    console.error('Token exchange error:', tokenError.response?.data || tokenError.message);
    res.status(500).send(`Failed to exchange authorization code: ${tokenError.response?.data?.error_description || tokenError.message}`);
  }
});

// Refresh access token
const refreshAccessToken = async (userId) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM hmrc_tokens WHERE user_id = ?', [userId], async (err, row) => {
      if (err || !row) return reject(new Error('No HMRC token found'));
      
      if (!row.refresh_token || row.refresh_token.startsWith('mock_')) {
        return reject(new Error('Cannot refresh mock token'));
      }

      try {
        const response = await axios.post(HMRC_TOKEN_URL,
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: row.refresh_token,
            client_id: HMRC_CLIENT_ID,
            client_secret: HMRC_CLIENT_SECRET
          }).toString(),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          }
        );

        const { access_token, refresh_token, expires_in } = response.data;
        const expiresAt = new Date(Date.now() + (expires_in * 1000));

        db.run(
          'UPDATE hmrc_tokens SET access_token = ?, refresh_token = ?, expires_at = ? WHERE user_id = ?',
          [access_token, refresh_token || row.refresh_token, expiresAt.toISOString(), userId],
          (updateErr) => {
            if (updateErr) return reject(updateErr);
            resolve(access_token);
          }
        );
      } catch (refreshErr) {
        reject(refreshErr);
      }
    });
  });
};

// Get valid access token (refresh if expired)
const getValidToken = (userId) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM hmrc_tokens WHERE user_id = ?', [userId], async (err, row) => {
      if (err || !row) return reject(new Error('No HMRC token found'));
      
      // Check if token is expired (with 5 min buffer)
      const expiresAt = new Date(row.expires_at);
      const now = new Date();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (expiresAt.getTime() - now.getTime() < fiveMinutes) {
        // Token expired or about to expire, try to refresh
        try {
          const newToken = await refreshAccessToken(userId);
          resolve(newToken);
        } catch (refreshErr) {
          // If refresh fails, return existing token (might still work for mock)
          resolve(row.access_token);
        }
      } else {
        resolve(row.access_token);
      }
    });
  });
};

// Explicit mock connect for local/testing environments
router.post('/mock-connect', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const access_token = `mock_access_token_${Date.now()}`;
  const refresh_token = `mock_refresh_token_${Date.now()}`;
  const expiresAt = new Date(Date.now() + 3600 * 1000);
  db.run('INSERT OR REPLACE INTO hmrc_tokens (user_id, access_token, refresh_token, expires_at) VALUES (?, ?, ?, ?)', [userId, access_token, refresh_token, expiresAt.toISOString()], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'HMRC connected in mock mode.' });
  });
});

// Fraud Prevention Headers (required by HMRC)
const getFraudPreventionHeaders = (req) => ({
  'Gov-Client-Connection-Method': 'WEB_APP_VIA_SERVER',
  'Gov-Client-Device-ID': req.user?.id ? `taxlane-user-${req.user.id}` : 'taxlane-unknown',
  'Gov-Client-Timezone': 'UTC+00:00',
  'Gov-Client-User-Agent': req.headers['user-agent'] || 'TaxLane/1.0',
  'Gov-Client-User-IDs': `taxlane=${req.user?.id || 'anonymous'}`,
  'Gov-Vendor-Version': 'TaxLane=1.0.0',
  'Gov-Vendor-Product-Name': 'TaxLane'
});

// Fetch real obligations from HMRC API
router.get('/obligations', authMiddleware, async (req, res) => {
  try {
    const accessToken = await getValidToken(req.user.id).catch(() => null);
    
    // If we have a mock token, use local obligations
    if (!accessToken || accessToken.startsWith('mock_')) {
      const rows = await getObligations(req.user.id);
      return res.json(rows);
    }

    // Try to fetch from HMRC API
    try {
      const response = await axios.get(
        `${HMRC_API_BASE}/obligations/vat/obligations`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.hmrc.1.0+json',
            ...getFraudPreventionHeaders(req)
          },
          params: {
            from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            to: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
          }
        }
      );
      
      // Transform HMRC response to our format
      const obligations = response.data.obligations?.map(o => ({
        periodKey: o.periodKey,
        startDate: o.start,
        endDate: o.end,
        dueDate: o.due,
        status: o.status === 'F' ? 'fulfilled' : o.status === 'O' ? 'open' : 'overdue'
      })) || [];
      
      res.json(obligations);
    } catch (hmrcError) {
      console.error('HMRC API error:', hmrcError.response?.data || hmrcError.message);
      // Fallback to local obligations
      const rows = await getObligations(req.user.id);
      res.json(rows);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit VAT Return to HMRC
router.post('/submit', authMiddleware, async (req, res) => {
  const { type, period, payload } = req.body;
  const userId = req.user.id;
  
  try {
    const accessToken = await getValidToken(userId).catch(() => null);
    
    if (!accessToken) {
      return res.status(400).json({ error: 'Connect HMRC (or use mock connect) before submitting.' });
    }
    
    const periodInfo = parsePeriodKey(period);
    if (!periodInfo) {
      return res.status(400).json({ error: 'Invalid period format. Use YYYY-QX.' });
    }

    let hmrcResponse = { mock: 'response' };
    let status = 'success';

    // If we have a real token, submit to HMRC
    if (!accessToken.startsWith('mock_')) {
      try {
        // VAT Return submission
        const vatReturn = {
          periodKey: periodInfo.periodKey,
          vatDueSales: payload.vatDueSales || 0,
          vatDueAcquisitions: payload.vatDueAcquisitions || 0,
          totalVatDue: payload.totalVatDue || 0,
          vatReclaimedCurrPeriod: payload.vatReclaimedCurrPeriod || 0,
          netVatDue: payload.netVatDue || Math.abs((payload.totalVatDue || 0) - (payload.vatReclaimedCurrPeriod || 0)),
          totalValueSalesExVAT: payload.totalValueSalesExVAT || payload.income || 0,
          totalValuePurchasesExVAT: payload.totalValuePurchasesExVAT || payload.expenses || 0,
          totalValueGoodsSuppliedExVAT: payload.totalValueGoodsSuppliedExVAT || 0,
          totalAcquisitionsExVAT: payload.totalAcquisitionsExVAT || 0,
          finalised: true
        };

        const response = await axios.post(
          `${HMRC_API_BASE}/organisations/vat/returns`,
          vatReturn,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Accept': 'application/vnd.hmrc.1.0+json',
              ...getFraudPreventionHeaders(req)
            }
          }
        );
        
        hmrcResponse = response.data;
        status = 'success';
      } catch (hmrcError) {
        console.error('HMRC submission error:', hmrcError.response?.data || hmrcError.message);
        hmrcResponse = hmrcError.response?.data || { error: hmrcError.message };
        status = 'failed';
        
        // Log the error
        db.run(
          'INSERT INTO error_logs (user_id, error_type, message, details) VALUES (?, ?, ?, ?)',
          [userId, 'hmrc_submission', hmrcError.message, JSON.stringify(hmrcResponse)]
        );
      }
    }

    // Save submission record
    db.run(
      'INSERT INTO mtd_submissions (user_id, type, period, payload, hmrc_response, status) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, type, periodInfo.periodKey, JSON.stringify(payload), JSON.stringify(hmrcResponse), status],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        const submissionId = this.lastID;
        
        if (status === 'success') {
          linkSubmissionToObligation(userId, periodInfo.periodKey, submissionId)
            .then(() => res.json({ message: 'Submitted successfully', hmrcResponse }))
            .catch((linkErr) => res.status(500).json({ error: linkErr.message }));
        } else {
          res.status(400).json({ 
            error: 'HMRC submission failed', 
            details: hmrcResponse,
            submissionId 
          });
        }
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get submissions
router.get('/submissions', authMiddleware, (req, res) => {
  db.all('SELECT * FROM mtd_submissions WHERE user_id = ?', [req.user.id], (err, rows) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json(rows);
  });
});

module.exports = router;
