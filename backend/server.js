require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { db } = require('./src/config/database');

const app = express();

// CORS configuration for production
const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,
  /\.railway\.app$/
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Check against allowed origins
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      return allowed === origin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all in development, restrict in production if needed
    }
  },
  credentials: true
}));

app.use(express.json());

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize database based on environment
const initDatabase = () => {
  if (process.env.DATABASE_URL) {
    // PostgreSQL - use the PostgreSQL schema
    const schemaPath = path.join(__dirname, '../database/schemas/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      // Split by semicolons and execute each statement
      const statements = schema.split(';').filter(s => s.trim());
      let completed = 0;
      statements.forEach(statement => {
        if (statement.trim()) {
          db.exec(statement + ';', (err) => {
            completed++;
            if (err && !err.message.includes('already exists')) {
              console.error('Schema error:', err.message);
            }
            if (completed === statements.length) {
              console.log('Database initialized (PostgreSQL)');
            }
          });
        }
      });
    }
  } else {
    // SQLite for local development
    const schemaPath = path.join(__dirname, '../database/schemas/schema_sqlite.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.serialize(() => {
      db.exec(schema, (err) => {
        if (err) {
          console.error('Error initializing database:', err);
        } else {
          console.log('Database initialized (SQLite)');
        }
      });
    });
  }
};

initDatabase();

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/income', require('./src/routes/income'));
app.use('/api/expenses', require('./src/routes/expenses'));
app.use('/api/receipts', require('./src/routes/receipts'));
app.use('/api/ocr', require('./src/routes/ocr'));
app.use('/api/calculations', require('./src/routes/calculations'));
app.use('/api/hmrc', require('./src/routes/hmrc'));
app.use('/api/hmrc-data', require('./src/routes/hmrcData'));
app.use('/api/audit', require('./src/routes/audit'));
app.use('/api/clients', require('./src/routes/clients'));
app.use('/api/reports', require('./src/routes/reports'));
app.use('/api/reminders', require('./src/routes/reminders'));
app.use('/api/csv', require('./src/routes/csv'));

const PORT = process.env.PORT || 5001;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
